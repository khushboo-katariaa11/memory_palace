import os
import subprocess
import json
from face_utils import detect_faces_on_image
import uuid
from datetime import datetime
from pathlib import Path
from typing import List, Optional
from fastapi import HTTPException, Body
from face_utils import detect_faces_on_image
from narrate import synthesize_story
from embeddings import index_memory, search_memories

from fastapi import FastAPI, UploadFile, File, Form, HTTPException, Body
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from dotenv import load_dotenv
from pydantic import BaseModel
from providers import (
    PROVIDER, gemini_caption_images, gemini_transcribe_audio,
    blip_caption_images_local, whisper_transcribe_local
)
from media_utils import extract_keyframes
from PIL import Image
import io, json

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

# Mount the media directory for serving files
app.mount("/files", StaticFiles(directory=str(MEDIA_ROOT)), name="files")
MEDIA_ROOT.mkdir(parents=True, exist_ok=True)
app.mount("/files", StaticFiles(directory=str(MEDIA_ROOT)), name="files")

@app.get("/")
def root():
    return {"message": "Welcome to Memory Palace API. Visit /docs for API documentation."}

@app.get("/health")
def health():
    return {"ok": True, "service": "fastapi-backend"}

class UploadResponse(BaseModel):
    ok: bool
    memory_id: str
    folder: str
    message: str

class FaceTag(BaseModel):
    crop_file: str
    label: str  # e.g., "Mom", "Ravi", "Unknown"

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
    # Photos
    if photos:
        images_dir = folder / "images"
        images_dir.mkdir(parents=True, exist_ok=True)

        for i, p in enumerate(photos):
            safe = _safe_name(p.filename)
            out = images_dir / safe
            with open(out, "wb") as f:
                f.write(await p.read())
            saved_files.append(f"images/{safe}")


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

@app.post("/process/{memory_id}")
def process_memory(memory_id: str):
    folder = MEDIA_ROOT / memory_id
    if not folder.exists():
        raise HTTPException(status_code=404, detail="memory not found")

    # Collect files
    image_paths = [str(p) for p in folder.glob("*.jpg")] + [str(p) for p in folder.glob("*.png")] + [str(p) for p in folder.glob("*.jpeg")]
    video_paths = [str(p) for p in folder.glob("*.mp4")] + [str(p) for p in folder.glob("*.mov")] + [str(p) for p in folder.glob("*.mkv")]
    audio_paths = [str(p) for p in folder.glob("*.mp3")] + [str(p) for p in folder.glob("*.m4a")] + [str(p) for p in folder.glob("*.wav")]

    captions: list[str] = []
    transcript: str = ""

    # 1) Video → keyframes → treat as images
    keyframes_dir = folder / "frames"
    all_images_for_caption = image_paths.copy()
    for vp in video_paths:
        kf = extract_keyframes(vp, str(keyframes_dir), max_frames=5)
        all_images_for_caption.extend(kf)

    # 2) Caption the images (Gemini or Local)
    if all_images_for_caption:
        if PROVIDER.lower() == "gemini":
            image_bytes = []
            for p in all_images_for_caption:
                with open(p, "rb") as f:
                    image_bytes.append(f.read())
            captions = gemini_caption_images(image_bytes)
        else:
            captions = blip_caption_images_local(all_images_for_caption)

    # 3) Transcribe audio (Gemini or Local)
    #    If there's video, you can skip or add optional audio extraction later
    if audio_paths:
        # take first audio for MVP
        ap = audio_paths[0]
        if PROVIDER.lower() == "gemini":
            mime = "audio/mpeg"
            if ap.lower().endswith(".wav"): mime = "audio/wav"
            if ap.lower().endswith(".m4a"): mime = "audio/mp4"  # Gemini accepts mp4/m4a
            with open(ap, "rb") as f:
                transcript = gemini_transcribe_audio(f.read(), mime=mime)
        else:
            transcript = whisper_transcribe_local(ap)

    # 4) Save outputs
    (folder / "captions.json").write_text(json.dumps(captions, indent=2), encoding="utf-8")
    if transcript:
        (folder / "transcript.txt").write_text(transcript, encoding="utf-8")

    # 5) Update metadata (status)
    meta_path = folder / "metadata.json"
    if meta_path.exists():
        meta = json.loads(meta_path.read_text(encoding="utf-8"))
    else:
        meta = {"memory_id": memory_id}
    meta["status"] = "processed"
    meta["captions_count"] = len(captions)
    meta["has_transcript"] = bool(transcript)
    meta_path.write_text(json.dumps(meta, indent=2), encoding="utf-8")

    # Attempt to index the memory for vector search (non-fatal)
    try:
        index_memory(memory_id, MEDIA_ROOT)
    except Exception as e:
        # log and continue; processing should not fail because of indexing
        print("Embedding/index error:", e)

    return {
        "ok": True,
        "memory_id": memory_id,
        "captions": captions[:5],  # small preview
        "transcript": transcript[:400] if transcript else ""
    }
from fastapi import HTTPException, Body
import json

@app.post("/faces/{memory_id}/detect")
def faces_detect(memory_id: str):
    folder = MEDIA_ROOT / memory_id
    if not folder.exists():
        raise HTTPException(status_code=404, detail="memory not found")

    faces_dir = folder / "faces"
    faces_dir.mkdir(parents=True, exist_ok=True)
    faces_json = folder / "faces.json"

    # gather candidate images (original uploads may be in top-level or in images/)
    image_paths = [*folder.glob("*.jpg"), *folder.glob("*.jpeg"), *folder.glob("*.png")]
    images_dir = folder / "images"
    if images_dir.exists():
        image_paths.extend([*images_dir.glob("*.jpg"), *images_dir.glob("*.jpeg"), *images_dir.glob("*.png")])

    frame_paths = []
    if (folder / "frames").exists():
        frame_paths = [*(folder / "frames").glob("*.jpg")]

    all_imgs = [str(p) for p in image_paths] + [str(p) for p in frame_paths]

    all_faces = []
    for imgp in all_imgs:
        all_faces.extend(detect_faces_on_image(imgp, str(faces_dir), min_conf=0.5))

    # merge with existing labels if any
    existing = []
    if faces_json.exists():
        try:
            existing = json.loads(faces_json.read_text(encoding="utf-8"))
        except Exception:
            existing = []

    # keep old labels when the same crop_file re-generated
    label_map = {f["crop_file"]: f.get("label") for f in existing if "crop_file" in f}
    for face in all_faces:
        if face["crop_file"] in label_map and label_map[face["crop_file"]]:
            face["label"] = label_map[face["crop_file"]]

    faces_json.write_text(json.dumps(all_faces, indent=2), encoding="utf-8")

    # return public URLs for faces
    face_urls = [f"/files/{memory_id}/faces/{f['crop_file']}" for f in all_faces]
    return {"ok": True, "memory_id": memory_id, "count": len(all_faces), "faces": [
        {**f, "url": f"/files/{memory_id}/faces/{f['crop_file']}"} for f in all_faces
    ]}

class FaceTag(BaseModel):
    crop_file: str
    label: str  # "Mom", "Ravi", "Unknown", etc.

@app.post("/faces/{memory_id}/tag")
def faces_tag(memory_id: str, tags: List[FaceTag] = Body(...)):
    folder = MEDIA_ROOT / memory_id
    faces_json = folder / "faces.json"
    if not faces_json.exists():
        raise HTTPException(status_code=404, detail="faces.json not found; run detect first")

    data = json.loads(faces_json.read_text(encoding="utf-8"))
    label_map = {t.crop_file: t.label for t in tags}

    for f in data:
        cf = f.get("crop_file")
        if cf in label_map:
            f["label"] = label_map[cf]

    faces_json.write_text(json.dumps(data, indent=2), encoding="utf-8")
    return {"ok": True, "memory_id": memory_id, "updated": len(tags)}

@app.post("/generate_story/{memory_id}")
def generate_story(memory_id: str):
    folder = MEDIA_ROOT / memory_id
    if not folder.exists():
        raise HTTPException(status_code=404, detail="memory not found")

    # Load captions
    captions_file = folder / "captions.json"
    captions = json.loads(captions_file.read_text()) if captions_file.exists() else []

    # Load transcript
    transcript_file = folder / "transcript.txt"
    transcript = transcript_file.read_text().strip() if transcript_file.exists() else ""

    # Load faces (names)
    faces_file = folder / "faces.json"
    if faces_file.exists():
        faces_data = json.loads(faces_file.read_text())
        # faces_data is list of {crop_file, label...}
        faces = [f["label"] for f in faces_data if f.get("label")]
    else:
        faces = []

    # Prepare prompt
    prompt = f"""
You are a warm companion helping someone with memory loss gently remember.
Write a short, emotional memory story.

People involved: {", ".join(faces) if faces else "unknown"}
Captions: {", ".join(captions[:3])}
Transcript clues: {transcript[:200]}

Write in simple, positive, comforting tone (4-7 lines).
Do NOT lecture. Just retell the moment like a soft memory.
"""

    provider = "gemini"

    # =============== OLLAMA MODE (OFFLINE) ==================
    if provider == "gemini":
        import google.generativeai as genai
        genai.configure(api_key=os.getenv("GEMINI_API_KEY"))
        model = genai.GenerativeModel("gemini-2.5-flash")
        story = model.generate_content(prompt).text.strip()


    # =============== GEMINI MODE (ONLINE) ==================
    else:
        result = subprocess.run(
            ["ollama", "run", "gpt-oss-20b", prompt],
            capture_output=True, text=True
        )
        story = result.stdout.strip()
        
    # Save story
    (folder / "story.txt").write_text(story, encoding="utf-8")

    return {"ok": True, "memory_id": memory_id, "story": story}
from fastapi import HTTPException

@app.post("/narrate/{memory_id}")
def narrate(memory_id: str):
    folder = MEDIA_ROOT / memory_id
    if not folder.exists():
        raise HTTPException(status_code=404, detail="memory not found")

    story_file = folder / "story.txt"
    if not story_file.exists():
        raise HTTPException(status_code=400, detail="story.txt not found; generate story first")

    # output folder for audio
    tts_dir = folder / "tts"
    audio_file = tts_dir / "story.wav"

    text = story_file.read_text(encoding="utf-8").strip()
    if not text:
        raise HTTPException(status_code=400, detail="story is empty")

    info = synthesize_story(text, str(audio_file), rate=160, volume=0.95)

    # ensure StaticFiles mount covers MEDIA_ROOT (we already mounted /files to MEDIA_ROOT earlier)
    rel = audio_file.relative_to(MEDIA_ROOT).as_posix()  # memory_xxx/tts/story.wav
    return {
        "ok": True,
        "audio_url": f"/files/{rel}",
        "voice": info["voice"],
        "rate": info["rate"],
        "volume": info["volume"],
    }
@app.get("/memories")
def list_memories():
    result = []
    for folder in MEDIA_ROOT.iterdir():
        if folder.is_dir():
            images = sorted((folder / "images").glob("*"))
            thumb = None
            if images:
                rel = images[0].relative_to(MEDIA_ROOT).as_posix()
                thumb = f"/files/{rel}"

            result.append({
                "id": folder.name,
                "thumbnail": thumb
            })
    return {"memories": result}
@app.get("/memory/{memory_id}")
def get_memory(memory_id: str):
    folder = MEDIA_ROOT / memory_id
    if not folder.exists():
        raise HTTPException(404, "Memory not found")

    # Load story
    story_file = folder / "story.txt"
    story = story_file.read_text() if story_file.exists() else ""

    # Load audio (if exists)
    audio_file = folder / "tts" / "story.wav"
    audio_url = None
    if audio_file.exists():
        rel = audio_file.relative_to(MEDIA_ROOT).as_posix()
        audio_url = f"/files/{rel}"

    # Load images
    images_dir = folder / "images"
    images = []
    if images_dir.exists():
        for img in images_dir.iterdir():
            rel = img.relative_to(MEDIA_ROOT).as_posix()
            images.append(f"/files/{rel}")

    return {
        "story": story,
        "audio_url": audio_url,
        "images": images
    }
@app.post("/embed/{memory_id}")
def force_embed(memory_id: str):
    index_memory(memory_id, MEDIA_ROOT)
    return {"ok": True, "memory_id": memory_id}

class SearchReq(BaseModel):
    q: str
    person: str | None = None
    k: int = 6

@app.post("/search")
def vector_search(req: SearchReq):
    # Guard: empty query -> return empty results instead of calling embedding API
    if not req.q or not str(req.q).strip():
        return {"ok": True, "results": []}

    # Debug/log query to help diagnose why search returns no results
    try:
        print(f"[SEARCH] q='{req.q}' person='{req.person}' k={req.k}")
        hits = search_memories(req.q, k=req.k, person=req.person)
    except Exception as e:
        # Return structured error so frontend shows the cause instead of a 500
        print("Search error:", e)
        return {"ok": False, "error": str(e), "results": []}
    # Map to thumbnails
    out = []
    for h in hits:
        fold = MEDIA_ROOT / h["memory_id"]
        img_dir = fold / "images"
        thumb = None
        if img_dir.exists():
            imgs = sorted([p for p in img_dir.iterdir() if p.suffix.lower() in [".jpg",".jpeg",".png"]])
            if imgs:
                rel = imgs[0].relative_to(MEDIA_ROOT).as_posix()
                thumb = f"/files/{rel}"
        out.append({**h, "thumbnail": thumb})
    return {"ok": True, "results": out}
