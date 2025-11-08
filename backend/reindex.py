# reindex.py
from pathlib import Path
from main import index_memory, MEDIA_ROOT

def run():
    for mem in MEDIA_ROOT.iterdir():
        if mem.is_dir():
            mid = mem.name
            try:
                print(f"[Indexing] {mid}")
                index_memory(mid, MEDIA_ROOT)
            except Exception as e:
                print(f"[SKIP] {mid}: {e}")

if __name__ == "__main__":
    run()
    print("\n✅ Reindex complete. Restart backend and try search.")
