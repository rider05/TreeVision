"""Dataset stats: per-species counts + image sizes. Read-only."""
import argparse
from pathlib import Path
from collections import Counter
from PIL import Image

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--root", default="dataset/raw")
    a = ap.parse_args()
    root = Path(a.root)
    if not root.exists():
        print(f"missing {root}; create dataset/raw/<species>/ and drop images first")
        return
    exts = {".jpg", ".jpeg", ".png", ".webp"}
    counts = Counter()
    bad = 0
    for sp_dir in sorted(p for p in root.iterdir() if p.is_dir()):
        files = [f for f in sp_dir.iterdir() if f.suffix.lower() in exts]
        counts[sp_dir.name] = len(files)
        for f in files[:3]:
            try:
                with Image.open(f) as im:
                    im.verify()
            except Exception:
                bad += 1
    total = sum(counts.values())
    print(f"species={len(counts)} total={total} corrupt_sample~{bad}")
    for sp, n in counts.most_common():
        flag = " LOW (<50)" if n < 50 else ""
        print(f"  {sp:20s} {n:5d}{flag}")

if __name__ == "__main__":
    main()
