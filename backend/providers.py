import os, io, base64, json
from typing import List, Optional
import google.generativeai as genai
PROVIDER = os.getenv("LLM_PROVIDER", "gemini")

# ---------- Gemini ----------
def gemini_setup():
    import google.generativeai as genai
    genai.configure(api_key=os.getenv("GEMINI_API_KEY"))
    # 1.5 Flash is fast/cost effective; Pro is better quality but slower
    return genai.GenerativeModel("gemini-2.5-flash")

def gemini_caption_images(image_bytes_list: List[bytes]) -> List[str]:
    model = gemini_setup()
    captions = []
    for b in image_bytes_list:
        # send as inline image
        part = {"mime_type": "image/jpeg", "data": b}
        prompt = "Write a short, warm caption for this image in one sentence."
        resp = model.generate_content([prompt, part])
        captions.append(resp.text.strip())
    return captions

def gemini_transcribe_audio(audio_bytes: bytes, mime="audio/mpeg") -> str:
    model = gemini_setup()
    part = {"mime_type": mime, "data": audio_bytes}
    prompt = "Transcribe the speech in this audio. Return only the transcript."
    resp = model.generate_content([prompt, part])
    return resp.text.strip()

# ---------- Local (fallback) ----------
def blip_caption_images_local(image_paths: List[str]) -> List[str]:
    # Optional: only if transformers+torch installed
    try:
        from transformers import BlipProcessor, BlipForConditionalGeneration
        from PIL import Image
        import torch
    except Exception:
        return ["(local caption unavailable)"] * len(image_paths)

    processor = BlipProcessor.from_pretrained("Salesforce/blip-image-captioning-base")
    model = BlipForConditionalGeneration.from_pretrained("Salesforce/blip-image-captioning-base")

    caps = []
    for p in image_paths:
        image = Image.open(p).convert("RGB")
        inputs = processor(image, return_tensors="pt")
        out = model.generate(**inputs, max_new_tokens=30)
        text = processor.decode(out[0], skip_special_tokens=True)
        caps.append(text)
    return caps

def whisper_transcribe_local(audio_path: str) -> str:
    try:
        from faster_whisper import WhisperModel
    except Exception:
        return "(local transcript unavailable)"
    model = WhisperModel("base")  # or "small" if you have time/bandwidth
    segments, _ = model.transcribe(audio_path)
    return " ".join([s.text.strip() for s in segments if s.text])
