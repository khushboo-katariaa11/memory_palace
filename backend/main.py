import os
import uuid
from datetime import datetime
from pathlib import Path
from typing import List, Optional

from fastapi import FastAPI, UploadFile, File, Form
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from dotenv import load_dotenv
from pydantic import BaseModel

load_dotenv()

app = FastAPI()

# CORS (frontend localhost:3000)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Serve saved files (for quick checks)
MEDIA_ROOT = Path(__file__).parent / "data" / "memories"
MEDIA_ROOT.mkdir(parents=True, exist_ok=True)
app.mount("/files", StaticFiles(directory=str(MEDIA_ROOT)), name="files")

@app.get("/health")
def health():
    return {"ok": True, "service": "fastapi-backend"}

class UploadResponse(BaseModel):
    ok: bool
    memory_id: str
    folder: str
    message: str

def _safe_name(name: str) -> str:
    # remove dangerous chars
    return "".join(c for c in name if c.isalnum() or c in ("-", "_", ".", " ")).strip()

@app.post("/upload", response_model=UploadResponse)
async def upload_memory(
    photos: Optional[List[UploadFile]] = File(default=None, description="Multiple photos"),
    video: Optional[UploadFile] = File(default=None, description="Single video"),
    audio: Optional[UploadFile] = File(default=None, description="Single audio"),
    story: Optional[str] = Form(default=None, description="Optional text story"),
):
    """
    Accepts:
      - photos[]   (multi)
      - video      (single)
      - audio      (single)
      - story      (text)
    Saves into: backend/data/memories/memory_YYYYMMDD_HHMMSS_<uuid>/
    Also writes metadata.json with chosen LLM provider (ollama/gemini).
    """
    mem_id = f"memory_{datetime.now().strftime('%Y%m%d_%H%M%S')}_{uuid.uuid4().hex[:8]}"
    folder = MEDIA_ROOT / mem_id
    folder.mkdir(parents=True, exist_ok=True)

    # Save files
    saved_files = []

    async def save_file(up: UploadFile, subname: str):
        if up is None:
            return
        safe = _safe_name(up.filename or subname)
        out = folder / safe
        with open(out, "wb") as f:
            f.write(await up.read())
        saved_files.append(str(out.name))

    # Photos
    if photos:
        for i, p in enumerate(photos):
            await save_file(p, f"photo_{i}.bin")

    # Video
    if video:
        await save_file(video, f"video.bin")

    # Audio
    if audio:
        await save_file(audio, f"audio.bin")

    # Save story (if any)
    if story and story.strip():
        (folder / "story.txt").write_text(story.strip(), encoding="utf-8")

    # Metadata (provider groundwork)
    meta = {
        "memory_id": mem_id,
        "created_at": datetime.now().isoformat(),
        "files": saved_files,
        "has_video": bool(video),
        "has_audio": bool(audio),
        "has_photos": bool(photos and len(photos) > 0),
        "llm_provider": os.getenv("LLM_PROVIDER", "ollama"),
        "ollama_base_url": os.getenv("OLLAMA_BASE_URL", ""),
        "gemini_key_present": bool(os.getenv("GEMINI_API_KEY")),
        "status": "uploaded"  # later: processing -> complete
    }
    (folder / "metadata.json").write_text(__import__("json").dumps(meta, indent=2), encoding="utf-8")

    return UploadResponse(
        ok=True,
        memory_id=mem_id,
        folder=f"/files/{mem_id}",
        message="Memory uploaded successfully. Processing will begin soon."
    )
