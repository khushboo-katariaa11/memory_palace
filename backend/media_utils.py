import cv2, os
from typing import List

def extract_keyframes(video_path: str, out_dir: str, max_frames: int = 5) -> List[str]:
    os.makedirs(out_dir, exist_ok=True)
    cap = cv2.VideoCapture(video_path)
    total = int(cap.get(cv2.CAP_PROP_FRAME_COUNT)) or 0
    if total == 0:
        return []

    # sample evenly across the video
    step = max(1, total // max_frames)
    frames = []
    idx = 0
    saved = 0
    while cap.isOpened() and saved < max_frames:
        cap.set(cv2.CAP_PROP_POS_FRAMES, idx)
        ok, frame = cap.read()
        if not ok:
            break
        out_path = os.path.join(out_dir, f"frame_{saved+1:02d}.jpg")
        cv2.imwrite(out_path, frame)
        frames.append(out_path)
        saved += 1
        idx += step
    cap.release()
    return frames
