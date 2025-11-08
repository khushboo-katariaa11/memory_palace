import os
import json
from pathlib import Path
from typing import List, Dict

import chromadb
from chromadb.config import Settings

PROVIDER = os.getenv("LLM_PROVIDER", "gemini").lower()
CHROMA_PATH = str((Path(__file__).parent / "data" / "chroma").resolve())
COLLECTION_NAME = os.getenv("EMB_COLLECTION", "memories")


# ----- EMBEDDINGS -----
def _embed_texts_gemini(texts: List[str]) -> List[List[float]]:
    import google.generativeai as genai
    genai.configure(api_key=os.getenv("GEMINI_API_KEY"))
    model = "text-embedding-004"
    return [genai.embed_content(model=model, content=t)["embedding"] for t in texts]


def _embed_texts_local(texts: List[str]) -> List[List[float]]:
    from sentence_transformers import SentenceTransformer
    model = SentenceTransformer("all-MiniLM-L6-v2")
    return model.encode(texts, normalize_embeddings=True).tolist()


def embed_texts(texts: List[str]) -> List[List[float]]:
    if PROVIDER == "gemini" and os.getenv("GEMINI_API_KEY"):
        return _embed_texts_gemini(texts)
    return _embed_texts_local(texts)


# ----- CHROMA DB -----
client = chromadb.PersistentClient(path=CHROMA_PATH, settings=Settings(allow_reset=True))

collection = client.get_or_create_collection(
    COLLECTION_NAME,
    metadata={"hnsw:space": "cosine"}
)


def build_memory_doc(mem_folder: Path) -> Dict:
    captions = []
    f = mem_folder / "captions.json"
    if f.exists():
        try:
            captions = json.loads(f.read_text())
        except:
            pass

    transcript = ""
    f = mem_folder / "transcript.txt"
    if f.exists():
        transcript = f.read_text()

    people = []
    f = mem_folder / "faces.json"
    if f.exists():
        try:
            faces = json.loads(f.read_text())
            people = [x["label"] for x in faces if x.get("label")]
        except:
            pass

    story = ""
    f = mem_folder / "story.txt"
    if f.exists():
        story = f.read_text()

    desc = []

    if people:
        desc.append(f"People in this memory: {', '.join(people)}.")
    if captions:
        desc.append("Images show: " + ". ".join(captions[:6]) + ".")
    if transcript:
        desc.append("Conversation/Audio: " + transcript[:300] + ".")
    if story:
        desc.append("Story summary: " + story[:500] + ".")

    if not desc:
        desc.append("This memory contains emotional value even with limited details.")

    return {
        "text": "\n".join(desc),
        "people": people,
        "has_story": bool(story)
    }


def index_memory(memory_id: str, media_root: Path):
    mem_folder = media_root / memory_id
    if not mem_folder.exists():
        raise FileNotFoundError("Memory not found")

    doc = build_memory_doc(mem_folder)
    emb = embed_texts([doc["text"]])[0]

    collection.upsert(
        ids=[memory_id],
        embeddings=[emb],
        documents=[doc["text"]],
        metadatas=[{
            "people": ", ".join(doc["people"]) if doc["people"] else "",
            "has_story": doc["has_story"]
        }]
    )
    return True

def search_memories(query: str, k: int = 5, person: str | None = None):
    emb = embed_texts([query])[0]

    if person and person.strip():
        res = collection.query(
            query_embeddings=[emb],
            n_results=k,
            where={"people": {"$in": [person]}}
        )
    else:
        res = collection.query(query_embeddings=[emb], n_results=k)

    items = []
    for i, mid in enumerate(res["ids"][0]):
        score = 1 - res["distances"][0][i]
        items.append({"memory_id": mid, "score": float(score)})

    return items
