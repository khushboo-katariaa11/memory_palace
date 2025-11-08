from pathlib import Path
from typing import List, Dict, Any
import cv2
import mediapipe as mp
from PIL import Image

mp_face = mp.solutions.face_detection

def detect_faces_on_image(img_path: str, out_dir: str, min_conf: float = 0.5) -> List[Dict[str, Any]]:
    """
    Detect multiple faces on a single image, save cropped faces to out_dir,
    and return metadata (bbox, score, crop filename).
    """
    out = []
    Path(out_dir).mkdir(parents=True, exist_ok=True)

    # Read image (OpenCV BGR) and convert to RGB for MediaPipe
    image_bgr = cv2.imread(img_path)
    if image_bgr is None:
        return out
    h, w = image_bgr.shape[:2]
    image_rgb = cv2.cvtColor(image_bgr, cv2.COLOR_BGR2RGB)

    # tip: resize large images to max 1600px width for better detection speed
    max_w = 1600
    if w > max_w:
        scale = max_w / w
        image_rgb = cv2.resize(image_rgb, (int(w*scale), int(h*scale)))
        h, w = image_rgb.shape[:2]

    detections = []
    # model_selection=1 tends to work better for medium-to-far faces.
    with mp_face.FaceDetection(model_selection=1, min_detection_confidence=min_conf) as fd:
        result = fd.process(image_rgb)
        detections = result.detections or []

    # If too few faces, relax confidence
    if len(detections) <= 1 and min_conf > 0.35:
        with mp_face.FaceDetection(model_selection=1, min_detection_confidence=0.35) as fd:
            result = fd.process(image_rgb)
            detections = result.detections or []

    # Save crops
    pil_img = Image.fromarray(cv2.cvtColor(image_rgb, cv2.COLOR_RGB2BGR))
    idx = 0
    for det in detections:
        idx += 1
        rel = det.location_data.relative_bounding_box
        # relative coords -> absolute pixels
        x = max(0, int(rel.xmin * w))
        y = max(0, int(rel.ymin * h))
        ww = max(10, int(rel.width * w))
        hh = max(10, int(rel.height * h))

        # pad a bit to include full face
        pad = int(0.08 * max(ww, hh))
        x0 = max(0, x - pad)
        y0 = max(0, y - pad)
        x1 = min(w, x + ww + pad)
        y1 = min(h, y + hh + pad)

        crop = pil_img.crop((x0, y0, x1, y1))
        face_file = f"face_{Path(img_path).stem}_{idx:02d}.jpg"
        out_path = Path(out_dir) / face_file
        crop.save(out_path)

        out.append({
            "source_image": str(Path(img_path).name),
            "crop_file": face_file,
            "bbox": {"x": x0, "y": y0, "w": int(x1 - x0), "h": int(y1 - y0)},
            "score": float(det.score[0] if det.score else 0.0),
            "label": None  # to be filled by family (frontend)
        })

    return out
