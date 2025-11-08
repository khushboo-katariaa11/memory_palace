import chromadb
from chromadb.config import Settings
from pathlib import Path
import os

CHROMA_PATH = str((Path(__file__).parent / "data" / "chroma").resolve())
COLLECTION_NAME = os.getenv("EMB_COLLECTION", "memories")

client = chromadb.PersistentClient(path=CHROMA_PATH, settings=Settings(allow_reset=True))
collection = client.get_collection(COLLECTION_NAME)

print("\n=== Stored Memory Entries ===\n")

res = collection.get(include=["documents", "metadatas", "embeddings"])
for i in range(len(res["ids"])):
    print(f"ID: {res['ids'][i]}")
    print(f"PEOPLE: {res['metadatas'][i].get('people', '')}")
    print(f"HAS STORY: {res['metadatas'][i].get('has_story', False)}")
    print(f"TEXT SNIPPET: {res['documents'][i][:200]}...")
    print("-" * 60)
