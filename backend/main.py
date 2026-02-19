from fastapi import FastAPI, UploadFile, File, HTTPException, Header
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional
import document_processor
import moorcheh_service
import io
import uvicorn

app = FastAPI(title="Contract Intelligence API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

OFF_TOPIC_PHRASES = [
    "i can only analyze legal contracts",
    "this question is outside the scope",
    "the provided sources do not contain information relevant to this legal question",
]

def is_off_topic_answer(answer: str) -> bool:
    """Returns True if the AI refused to answer due to off-topic content."""
    answer_lower = answer.lower()
    return any(phrase in answer_lower for phrase in OFF_TOPIC_PHRASES)


class QueryRequest(BaseModel):
    query: str
    top_k: Optional[int] = 10
    namespace: str


class QueryResponse(BaseModel):
    answer: str
    sources: List[dict]


@app.get("/")
def read_root():
    return {"message": "Contract Intelligence API is running!", "status": "healthy"}


@app.post("/upload-contract")
async def upload_contract(
    files: List[UploadFile] = File(...),
    x_namespace: str = Header(..., alias="X-Namespace")
):
    """Upload multiple PDF contracts to a specific namespace."""
    try:
        results = []
        total_chunks = 0

        print(f"Uploading to namespace: '{x_namespace}'")

        for file in files:
            if not file.filename or not file.filename.lower().endswith(".pdf"):
                results.append({
                    "filename": file.filename,
                    "status": "error",
                    "message": "Only PDF files are supported"
                })
                continue

            try:
                print(f"Processing: {file.filename}")

                pdf_bytes = await file.read()
                pdf_stream = io.BytesIO(pdf_bytes)
                pdf_stream.seek(0)

                documents = document_processor.process_pdf(pdf_stream, file.filename)

                print(f"Uploading to Moorcheh namespace '{x_namespace}'...")
                result = moorcheh_service.upload_documents(
                    documents=documents,
                    namespace=x_namespace
                )

                if result.get("success"):
                    total_chunks += result.get("count", 0)
                    results.append({
                        "filename": file.filename,
                        "status": "success",
                        "chunks_created": result.get("count", 0)
                    })
                else:
                    results.append({
                        "filename": file.filename,
                        "status": "error",
                        "message": result.get("error", "Unknown error")
                    })

            except ValueError as e:
                if "NOT_A_LEGAL_CONTRACT" in str(e):
                    results.append({
                        "filename": file.filename,
                        "status": "error",
                        "message": "This document does not appear to be a legal contract. Only legal contracts are supported."
                    })
                else:
                    results.append({
                        "filename": file.filename,
                        "status": "error",
                        "message": str(e)
                    })
            except Exception as e:
                print(f"Error processing {file.filename}: {e}")
                results.append({
                    "filename": file.filename,
                    "status": "error",
                    "message": str(e)
                })
            finally:
                await file.close()

        return {
            "message": f"Processed {len(files)} file(s) in workspace '{x_namespace}'",
            "total_chunks": total_chunks,
            "results": results
        }

    except Exception as e:
        print(f"Upload error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/query", response_model=QueryResponse)
async def query_contracts(request: QueryRequest):
    """Search contracts and get AI answer from a specific namespace."""
    try:
        print(f"Searching for: '{request.query}' in namespace: '{request.namespace}'")

        search_results = moorcheh_service.search_contracts(
            query=request.query,
            namespace=request.namespace,
            top_k=request.top_k
        )

        if "error" in search_results:
            raise HTTPException(status_code=500, detail=search_results["error"])

        matches = search_results.get("matches", [])
        if not matches:
            return QueryResponse(
                answer="No relevant contract sections found. Please upload contracts first to this workspace.",
                sources=[]
            )

        ai_result = moorcheh_service.generate_answer_with_moorcheh(
            query=request.query,
            search_results=search_results,
            namespace=request.namespace,
            top_k=min(request.top_k, 5),
            ai_model="anthropic.claude-sonnet-4-20250514-v1:0"
        )

        answer = ai_result.get("answer", "Error generating answer")

        if is_off_topic_answer(answer):
            sources = []
        else:
            all_sources = moorcheh_service.build_sources_from_matches(search_results)
            sources = moorcheh_service.filter_cited_sources(answer, all_sources)

        return QueryResponse(answer=answer, sources=sources)

    except Exception as e:
        print(f"Query error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/health")
def health_check():
    return {"status": "healthy", "mode": "namespace_based_isolation"}


if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)