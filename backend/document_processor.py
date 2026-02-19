import re
from typing import List, Dict, Optional

from pypdf import PdfReader as _PdfReader
from langchain_text_splitters import RecursiveCharacterTextSplitter


PAGE_MARKER_RE = re.compile(r"\[Page\s+(\d+)\]")


LEGAL_KEYWORDS = [
    "agreement", "contract", "clause", "indemnif", "liability",
    "termination", "obligation", "whereas", "hereinafter", "party",
    "breach", "jurisdiction", "governing law", "warranty", "consultant",
    "commission", "execute", "enforceable", "binding", "subcontract"
]

def is_legal_document(text: str) -> bool:
    """Returns True if the document contains enough legal keywords to be a contract."""
    text_lower = text.lower()
    matches = sum(1 for kw in LEGAL_KEYWORDS if kw in text_lower)
    return matches >= 4


def clean_text(text: str) -> str:
    """Clean and normalize text (does NOT remove our [Page N] markers)."""
    text = text or ""
    text = text.replace("\n", " ")
    text = text.replace("\\n", " ").replace("\\\\n", " ")
    text = re.sub(r"\s+", " ", text)
    return text.strip()


def extract_text_from_pdf(pdf_file) -> str:
    """Read a PDF file and return text with page markers embedded."""
    pdf_reader = _PdfReader(pdf_file)

    parts: List[str] = []
    for page_num, page in enumerate(pdf_reader.pages, start=1):
        page_text = page.extract_text() or ""
        page_text = page_text.strip()
        if not page_text:
            continue

        cleaned = clean_text(page_text)
        parts.append(f"[Page {page_num}] {cleaned}\n\n")

    full_text = "".join(parts).strip()
    print(f"Extracted {len(full_text)} characters from {len(pdf_reader.pages)} pages")
    return full_text


def chunk_text_with_langchain(text: str) -> List[str]:
    """Break long text into smaller chunks using LangChain."""
    text = text or ""
    splitter = RecursiveCharacterTextSplitter(
        chunk_size=1000,
        chunk_overlap=500,
        length_function=len,
        separators=["\n\n", "\n", ". ", " ", ""],
        is_separator_regex=False,
    )

    chunks = splitter.split_text(text)

    cleaned_chunks: List[str] = []
    for c in chunks:
        c = (c or "").strip()
        if not c:
            continue
        cleaned_chunks.append(c)

    print(f"Created {len(cleaned_chunks)} chunks using LangChain")
    return cleaned_chunks


def extract_page_from_chunk(chunk: str, last_known_page: Optional[int]) -> Optional[int]:
    """Find last [Page N] inside the chunk, else reuse the previous page."""
    if not chunk:
        return last_known_page

    matches = list(PAGE_MARKER_RE.finditer(chunk))
    if matches:
        try:
            return int(matches[-1].group(1))
        except Exception:
            return last_known_page

    return last_known_page


def remove_page_markers(text: str) -> str:
    """Remove [Page N] markers from stored text."""
    return re.sub(r"\[Page\s+\d+\]\s*", "", text).strip()


def embed_page_in_text(text: str, page: Optional[int]) -> str:
    """Prepend a lightweight page tag so page survives even if metadata is dropped."""
    if page is None:
        return text
    return f"[p:{page}] {text}"


def process_pdf(pdf_file, filename: str) -> List[Dict]:
    """Process a PDF: extract -> chunk -> assign page -> upload-ready docs."""
    try:
        text = extract_text_from_pdf(pdf_file)
        if not text.strip():
            raise ValueError("PDF contains no extractable text")

        if not is_legal_document(text):
            raise ValueError("NOT_A_LEGAL_CONTRACT")

        chunks = chunk_text_with_langchain(text)
        documents: List[Dict] = []

        clean_name = (filename or "").replace(".pdf", "").replace(".PDF", "").strip()
        safe_id_name = re.sub(r"[^\w\-]", "_", clean_name)

        print(f"Original filename: {filename}")
        print(f"Display name: {clean_name}")
        print(f"Safe ID prefix: {safe_id_name}")

        doc_index = 0
        current_page: Optional[int] = None

        for chunk in chunks:
            current_page = extract_page_from_chunk(chunk, current_page)

            clean_chunk = remove_page_markers(chunk)
            if not clean_chunk:
                continue

            stored_text = embed_page_in_text(clean_chunk, current_page)
            page_tag = f"_p{current_page}" if current_page is not None else "_p0"

            documents.append({
                "id": f"{safe_id_name}{page_tag}_chunk_{doc_index}",
                "text": stored_text,
                "metadata": {
                    "source": clean_name,
                    "file_name": filename,
                    "chunk_index": doc_index,
                    "total_chunks": None,
                    "page": current_page,
                    "word_count": len(clean_chunk.split()),
                },
            })

            doc_index += 1

        total = len(documents)
        for d in documents:
            d["metadata"]["total_chunks"] = total

        print(f"Created {len(documents)} optimized chunks")
        if documents:
            pages_found = sum(1 for d in documents if d["metadata"]["page"] is not None)
            print(f"Sample ID: {documents[0]['id']}")
            print(f"Sample page: {documents[0]['metadata']['page']}")
            print(f"Chunks with page numbers: {pages_found}/{total}")

        return documents

    except Exception as e:
        print(f"PDF processing error: {e}")
        import traceback
        traceback.print_exc()
        raise
