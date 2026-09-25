"""Find unreadable images (PIL open+load) and move them to quarantine/.
Usage: python ml/preprocessing/quarantine_corrupt.py --root dataset/raw [--quarantine quarantine]
Prints every moved file. Re-run clean.py / split.py afterwards.
"""
import argparse, shutil
from pathlib import Path
from PIL import Image

EXTS = {".jpg", ".jpeg", ".png", ".webp"}

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--root", default="dataset/raw")
    ap.add_argument("--quarantine", default="quarantine")
    a = ap.parse_args()
    root, q = Path(a.root), Path(a.quarantine)
    bad, ok = [], 0
    for p in sorted(root.rglob("*")):
        if p.suffix.lower() not in EXTS or not p.is_file():
            continue
        try:
            with Image.open(p) as im:
                im.load()
            ok += 1
        except Exception as e:
            bad.append((p, str(e)[:100]))
    for p, e in bad:
        dst = q / p.relative_to(root)
        dst.parent.mkdir(parents=True, exist_ok=True)
        shutil.move(str(p), str(dst))
        print(f"QUARANTINED {p} ({e})")
    print(f"ok={ok} quarantined={len(bad)}")

if __name__ == "__main__":
    main()
