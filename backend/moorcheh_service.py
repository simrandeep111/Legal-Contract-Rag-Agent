import os
import re
import time
from dotenv import load_dotenv
from moorcheh_sdk import MoorchehClient
from sklearn.metrics.pairwise import cosine_similarity
from sentence_transformers import SentenceTransformer

load_dotenv()

moorcheh_client = MoorchehClient(api_key=os.getenv("MOORCHEH_API_KEY"))

_embedder = SentenceTransformer("all-MiniLM-L6-v2")


def apply_mmr(matches: list, query: str, top_k: int = 5, lambda_mult: float = 0.5) -> list:
    """Re-rank search matches using Maximum Marginal Relevance.
    Balances relevance to the query vs diversity among selected chunks.
    """
    if not matches:
        return []

    texts = [(m.get("text") or "").strip() for m in matches]

    query_emb = _embedder.encode([query])
    doc_embs = _embedder.encode(texts)

    selected_indices = []
    remaining_indices = list(range(len(matches)))

    for _ in range(min(top_k, len(matches))):
        best_idx = None
        best_score = float("-inf")

        for i in remaining_indices:
            relevance = cosine_similarity(query_emb, [doc_embs[i]])[0][0]

            if selected_indices:
                redundancy = max(
                    cosine_similarity([doc_embs[i]], [doc_embs[j]])[0][0]
                    for j in selected_indices
                )
            else:
                redundancy = 0.0

            score = lambda_mult * relevance - (1 - lambda_mult) * redundancy

            if score > best_score:
                best_score = score
                best_idx = i

        if best_idx is not None:
            selected_indices.append(best_idx)
            remaining_indices.remove(best_idx)

    return [matches[i] for i in selected_indices]


def create_namespace(namespace: str):
    """Create namespace if it doesn't exist."""
    try:
        moorcheh_client.create_namespace(
            namespace_name=namespace,
            type="text"
        )
        print(f"Namespace '{namespace}' created.")
    except Exception as e:
        if "already exists" in str(e).lower():
            return
        else:
            raise


def upload_documents(documents: list, namespace: str):
    """Upload documents to Moorcheh using TEXT search."""
    create_namespace(namespace)

    try:
        if documents:
            print(f"First chunk ID: {documents[0].get('id')}")
            print(f"Text length: {len(documents[0].get('text', ''))} chars")

        print(f"Uploading {len(documents)} documents to namespace '{namespace}'...")
        moorcheh_client.upload_documents(
            namespace_name=namespace,
            documents=documents
        )

        print("Waiting 2 seconds for indexing...")
        time.sleep(2)

        print(f"Upload complete: {len(documents)} chunks!")
        return {"success": True, "count": len(documents)}

    except Exception as e:
        print(f"Upload error: {e}")
        import traceback
        traceback.print_exc()
        return {"success": False, "error": str(e)}


def search_contracts(query: str, namespace: str, top_k: int = 10):
    """Search for relevant contract sections using TEXT semantic search."""
    try:
        print(f"Searching: '{query}' in namespace '{namespace}'")
        results = moorcheh_client.search(
            namespaces=[namespace],
            query=query,
            top_k=top_k,
        )

        matches = results.get("results", [])
        print(f"Number of matches before MMR: {len(matches)}")

        mmr_matches = apply_mmr(matches, query, top_k=5, lambda_mult=0.5)
        print(f"Number of matches after MMR: {len(mmr_matches)}")

        return {
            "matches": mmr_matches,
            "execution_time": results.get("execution_time"),
            "timings": results.get("timings"),
        }

    except Exception as e:
        print(f"Search error: {e}")
        import traceback
        traceback.print_exc()
        return {"error": str(e), "matches": []}


_PAGE_IN_TEXT_RE = re.compile(r"^\[p:(\d+)\]\s*")
_PAGE_IN_ID_RE = re.compile(r"_p(\d+)_chunk_")


def _extract_page_fallback(match: dict, metadata: dict):
    """Try every available signal to recover a page number.
    1. metadata['page']
    2. [p:N] prefix embedded in text
    3. _pN_chunk_ segment in ID
    Returns int or None.
    """
    page = metadata.get("page")
    if page is not None:
        try:
            return int(page)
        except Exception:
            pass

    raw_text = match.get("text", "") or match.get("content", "") or ""
    m = _PAGE_IN_TEXT_RE.match(raw_text)
    if m:
        try:
            return int(m.group(1))
        except Exception:
            pass

    doc_id = match.get("id", "") or ""
    m = _PAGE_IN_ID_RE.search(doc_id)
    if m:
        try:
            return int(m.group(1))
        except Exception:
            pass

    return None


def filter_cited_sources(answer: str, sources: list) -> list:
    """Return only sources that the AI actually cited in its answer.

    Handles all formats:
      - (Source 1)
      - (Sources 2 and 4)
      - (Sources 1, 2, and 3)
    """
    cited_nums = set()
    for m in re.finditer(r"\bSources?\s+([\d]+(?:[\s,]+(?:and\s+)?[\d]+)*)", answer, re.IGNORECASE):
        nums = re.findall(r"\d+", m.group(1))
        cited_nums.update(int(n) for n in nums)

    if not cited_nums:
        return sources  # fallback: show all if AI cited nothing explicitly

    return [s for s in sources if s.get("source_num") in cited_nums]


def build_sources_from_matches(search_results: dict, max_sources: int = 5) -> list:
    """Build sources payload (document/page/excerpt) from search matches."""
    matches = (search_results or {}).get("matches", []) or []
    sources = []
    source_num = 0

    def clean_snippet(s: str) -> str:
        s = _PAGE_IN_TEXT_RE.sub("", s or "")
        return " ".join(s.replace("\n", " ").split()).strip()

    for match in matches[:max_sources]:
        metadata = match.get("metadata", {}) or {}

        raw_text = match.get("text", "") or match.get("content", "") or ""
        text = clean_snippet(raw_text)
        if not text:
            continue

        source_num += 1

        doc_id = match.get("id", "") or ""
        file_name = (metadata.get("file_name") or metadata.get("source") or "").strip()

        if not file_name and doc_id:
            file_name = _PAGE_IN_ID_RE.split(doc_id)[0]
            if not file_name:
                file_name = doc_id.split("_chunk_")[0]
            file_name = (file_name or "Unknown Document").strip()

        document_name = (
            file_name.replace(".pdf", "")
            .replace(".PDF", "")
            .replace("_", " ")
            .strip()
        )

        page = _extract_page_fallback(match, metadata)
        page_info = f"Page {page}" if page is not None else "Location Unknown"
        source_label = f"{document_name} - {page_info}"

        sources.append({
            "source_num": source_num,
            "document": document_name,
            "page": page,
            "source": source_label,
            "excerpt": (text[:350] + "...") if len(text) > 350 else text,
        })

    return sources


def generate_answer_with_moorcheh(
    query: str,
    search_results: dict,
    namespace: str,
    top_k: int = 5,
    ai_model: str = "anthropic.claude-sonnet-4-20250514-v1:0",
) -> dict:
    """Generate answer with strict citations (Source 1, Source 2, ...)"""
    matches = (search_results or {}).get("matches", []) or []
    if not matches:
        return {"answer": "No relevant information found in the uploaded contracts."}

    def clean_text(s: str) -> str:
        s = _PAGE_IN_TEXT_RE.sub("", s or "")
        return " ".join(s.replace("\n", " ").split()).strip()

    context_parts = []

    for match in matches:
        if len(context_parts) >= top_k:
            break

        metadata = match.get("metadata", {}) or {}
        text = clean_text(match.get("text", "") or match.get("content", ""))
        if not text:
            continue

        doc_id = match.get("id", "") or ""
        file_name = (
            metadata.get("file_name")
            or metadata.get("source")
            or (_PAGE_IN_ID_RE.split(doc_id)[0] if doc_id else "")
            or "Unknown Document"
        )

        doc_name = (
            file_name.replace(".pdf", "")
            .replace(".PDF", "")
            .replace("_", " ")
            .strip()
        )

        page = _extract_page_fallback(match, metadata)
        page_info = f"Page {page}" if page is not None else "Location Unknown"

        source_num = len(context_parts) + 1
        context_parts.append(f"Source {source_num}: {doc_name} - {page_info}\n{text}")

    if not context_parts:
        return {"answer": "Found matches but no readable text."}

    sources_text = "\n\n---\n\n".join(context_parts)

    full_prompt = f"""You are a strict Legal Contract Analyst with zero tolerance for off-topic requests.

YOUR RULES — FOLLOW THEM WITHOUT EXCEPTION:

1. ONLY answer questions that are directly about legal contracts, agreements, clauses, terms, obligations, liabilities, payments, termination, indemnification, or any legally binding content.

2. If the uploaded sources are NOT legal contracts (e.g. financial reports, news articles, invoices, resumes, research papers, emails, or any non-legal document), respond ONLY with:
   "I can only analyze legal contracts. The uploaded document does not appear to be a legal contract."

3. If the user's question is not related to the legal content in the sources (e.g. asking about revenue, stock prices, general business info, personal advice), respond ONLY with:
   "This question is outside the scope of legal contract analysis. Please ask about contract terms, clauses, obligations, or legal provisions."

4. NEVER use outside knowledge. Use ONLY the sources below.

5. NEVER guess, assume, or infer information not explicitly stated in the sources.

6. Always cite your answer using (Source 1), (Source 2), etc. No citation = no answer.

7. If the answer is genuinely not found in the sources, respond ONLY with:
   "The provided sources do not contain information relevant to this legal question."

---

Sources:
{sources_text}

---

Question: {query}

Answer:"""

    n_sources = len(context_parts)

    try:
        return moorcheh_client.get_completion(prompt=full_prompt, ai_model=ai_model)
    except AttributeError:
        try:
            return moorcheh_client.get_generative_answer(
                namespace=namespace,
                query=full_prompt,
                top_k=n_sources,
                ai_model=ai_model,
            )
        except TypeError:
            return moorcheh_client.get_generative_answer(
                namespace=namespace,
                query=full_prompt,
                top_k=n_sources,
            )