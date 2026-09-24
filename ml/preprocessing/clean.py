"""Clean raw -> cleaned: sha256 dedup + optional blur/brightness reject.
Usage: python ml/preprocessing/clean.py --src dataset/raw --dst dataset/cleaned [--blur-thresh 80]
Filename contract: <species>_<type>_<treeID>_<nn>.jpg (blur check only, grouping happens in split.py).
"""
import argparse, hashlib, shutil
from pathlib import Path

EXTS = {".jpg", ".jpeg", ".png", ".webp"}

def sha256(p: Path) -> str:
    h = hashlib.sha256()
    with open(p, "rb") as f:
        for b in iter(lambda: f.read(1 << 20), b""):
            h.update(b)
    return h.hexdigest()

def blur_score(path: Path) -> float | None:
    try:
        import cv2
    except ImportError:
        return None
    img = cv2.imread(str(path), cv2.IMREAD_GRAYSCALE)
    if img is None:
        return -1.0
    return float(cv2.Laplacian(img, cv2.CV_64F).var())

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--src", default="dataset/raw")
    ap.add_argument("--dst", default="dataset/cleaned")
    ap.add_argument("--blur-thresh", type=float, default=0.0,
                    help="reject images with laplacian variance below this; 0=disabled, try 60-100")
    a = ap.parse_args()
    src, dst = Path(a.src), Path(a.dst)
    seen: dict[str, Path] = {}
    kept = dup = blurry = 0
    for sp_dir in sorted(p for p in src.iterdir() if p.is_dir()):
        out_dir = dst / sp_dir.name
        out_dir.mkdir(parents=True, exist_ok=True)
        for f in sorted(sp_dir.iterdir()):
            if f.suffix.lower() not in EXTS:
                continue
            h = sha256(f)
            if h in seen:
                dup += 1
                continue
            seen[h] = f
            if a.blur_thresh > 0:
                s = blur_score(f)
                if s is not None and s < a.blur_thresh:
                    blurry += 1
                    continue
            shutil.copy2(f, out_dir / f.name)
            kept += 1
    print(f"kept={kept} duplicates_removed={dup} blurry_removed={blurry}")

if __name__ == "__main__":
    main()
