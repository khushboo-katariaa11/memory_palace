import os
import pyttsx3

# Prefer soft female voices if available (customize list per your machine)
PREFERRED_VOICE_KEYWORDS = [
    "Heera",    # Hindi (if installed)
    "Zira",     # EN-US female
    "Hazel",    # EN-GB female
    "Sona",     # Indic voices if present
]

def pick_soft_voice(engine: pyttsx3.Engine):
    voices = engine.getProperty("voices")
    # Try preferred list
    for kw in PREFERRED_VOICE_KEYWORDS:
        for v in voices:
            name = (v.name or "").lower()
            if kw.lower() in name:
                engine.setProperty("voice", v.id)
                return v.name
    # fallback: first female-ish voice by name
    for v in voices:
        if any(x in (v.name or "").lower() for x in ["female","zira","hazel"]):
            engine.setProperty("voice", v.id)
            return v.name
    # ultimate fallback: default first
    engine.setProperty("voice", voices[0].id if voices else None)
    return voices[0].name if voices else "default"

def soften_text(text: str) -> str:
    """
    Add subtle pauses to make SAPI sound calmer.
    """
    # tiny trick: add commas and spaced periods for pauses
    t = text.replace(". ", ".  ").replace("! ", "!  ").replace("? ", "?  ")
    # ensure sentences not too long
    return t

def synthesize_story(text: str, out_wav_path: str, rate=165, volume=0.9):
    """
    Save narration to a WAV (blocking). Works on Windows SAPI5.
    """
    os.makedirs(os.path.dirname(out_wav_path), exist_ok=True)

    engine = pyttsx3.init(driverName="sapi5")
    picked = pick_soft_voice(engine)

    # Soft settings
    engine.setProperty("rate", rate)     # 150-170 usually pleasant
    engine.setProperty("volume", volume) # 0.0 - 1.0

    # Optional: a touch calmer text
    text = soften_text(text)

    # Save to file (WAV is safest)
    engine.save_to_file(text, out_wav_path)
    engine.runAndWait()

    return {"voice": picked, "rate": rate, "volume": volume, "path": out_wav_path}
