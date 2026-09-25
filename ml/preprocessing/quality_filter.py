"""TreeVision image quality filtering and deduplication.
Moves problematic images to quarantine/, generates quality reports.
Usage: python ml/preprocessing/quality_filter.py --src dataset/raw --dst dataset/cleaned --quarantine dataset/quarantine
"""
import argparse, csv, hashlib, shutil
from pathlib import Path
from collections import defaultdict
from PIL import Image

EXTS = {".jpg", ".jpeg", ".png", ".webp"}

def sha256(path: Path) -> str:
    h = hashlib.sha256()
    with open(path, "rb") as f:
        for chunk in iter(lambda: f.read(1 << 20), b""):
            h.update(chunk)
    return h.hexdigest()

def check_quality(path: Path) -> list[str]:
    issues = []
    try:
        stat = path.stat()
        if stat.st_size < 1024:
            issues.append("too_small_file")
        with Image.open(path) as img:
            img.load()
            if img.mode not in ("RGB", "RGBA"):
                issues.append(f"non_rgb_mode_{img.mode}")
            if img.width < 64 or img.height < 64:
                issues.append("too_small_dims")
            # Check for extremely large images that might cause OOM
            if img.width > 8000 or img.height > 8000:
                issues.append("too_large_dims")
    except Exception as e:
        issues.append(f"corrupt: {type(e).__name__}: {str(e)[:100]}")
    return issues

def has_treeid(filename: str) -> bool:
    parts = filename.split("_")
    return len(parts) >= 4 and parts[2] != ""

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--src", default="dataset/raw", help="Source directory with species subdirs")
    ap.add_argument("--dst", default="dataset/cleaned", help="Destination for clean images")
    ap.add_argument("--quarantine", default="dataset/quarantine", help="Quarantine directory for bad images")
    ap.add_argument("--blur-thresh", type=float, default=0.0, help="Laplacian variance threshold (0=disabled, try 80)")
    args = ap.parse_args()

    src, dst, qdir = Path(args.src), Path(args.dst), Path(args.quarantine)
    qdir.mkdir(parents=True, exist_ok=True)
    dst.mkdir(parents=True, exist_ok=True)

    seen_hashes: dict[str, Path] = {}
    kept = dup = blurry = corrupt = non_rgb = missing_treeid = invalid_ext = 0
    removed_records = []
    dup_records = []

    for sp_dir in sorted(p for p in src.iterdir() if p.is_dir()):
        out_dir = dst / sp_dir.name
        q_sp_dir = qdir / sp_dir.name
        out_dir.mkdir(parents=True, exist_ok=True)
        q_sp_dir.mkdir(parents=True, exist_ok=True)

        for img_path in sorted(sp_dir.iterdir()):
            if img_path.suffix.lower() not in EXTS:
                invalid_ext += 1
                removed_records.append((sp_dir.name, img_path.name, "invalid_extension", ""))
                try:
                    shutil.move(str(img_path), str(q_sp_dir / img_path.name))
                except:
                    pass
                continue

            # Check for TreeID in filename
            tid = ""
            parts = img_path.stem.split("_")
            if len(parts) >= 4:
                tid = parts[2]
            if not tid:
                missing_treeid += 1
                removed_records.append((sp_dir.name, img_path.name, "missing_treeid", ""))
                shutil.move(str(img_path), str(q_sp_dir / img_path.name))
                continue

            # SHA256 dedup
            h = sha256(img_path)
            if h in seen_hashes:
                dup += 1
                dup_records.append((sp_dir.name, img_path.name, seen_hashes[h].name, h[:16]))
                shutil.move(str(img_path), str(q_sp_dir / img_path.name))
                continue
            seen_hashes[h] = img_path

            # Quality checks
            issues = check_quality(img_path)
            if issues:
                corrupt += 1 if "corrupt" in " ".join(issues) else 0
                non_rgb += 1 if any("non_rgb" in i for i in issues) else 0
                removed_records.append((sp_dir.name, img_path.name, "; ".join(issues), tid))
                shutil.move(str(img_path), str(q_sp_dir / img_path.name))
                continue

            # Blur check (optional)
            if args.blur_thresh > 0:
                try:
                    import cv2
                    gray = cv2.imread(str(img_path), cv2.IMREAD_GRAYSCALE)
                    if gray is not None:
                        var = cv2.Laplacian(gray, cv2.CV_64F).var()
                        if var < args.blur_thresh:
                            blurry += 1
                            removed_records.append((sp_dir.name, img_path.name, f"blurry_var_{var:.1f}", tid))
                            shutil.move(str(img_path), str(q_sp_dir / img_path.name))
                            continue
                except ImportError:
                    pass

            # Keep clean image
            shutil.copy2(img_path, out_dir / img_path.name)
            kept += 1

    # Write reports
    outdir = Path("artifacts")
    outdir.mkdir(exist_ok=True)

    with open(outdir / "removed_images.csv", "w", newline="", encoding="utf-8") as f:
        w = csv.writer(f)
        w.writerow(["species", "filename", "reason", "treeid"])
        w.writerows(removed_records)

    with open(outdir / "duplicate_images.csv", "w", newline="", encoding="utf-8") as f:
        w = csv.writer(f)
        w.writerow(["species", "filename", "original_filename", "hash_prefix"])
        w.writerows(dup_records)

    with open(outdir / "dataset_quality_report.csv", "w", newline="", encoding="utf-8") as f:
        w = csv.writer(f)
        w.writerow(["metric", "count"])
        w.writerow(["kept", kept])
        w.writerow(["duplicates_removed", dup])
        w.writerow(["blurry_removed", blurry])
        w.writerow(["corrupt_removed", corrupt])
        w.writerow(["non_rgb_removed", non_rgb])
        w.writerow(["missing_treeid_removed", missing_treeid])
        w.writerow(["invalid_extension_removed", invalid_ext])
        w.writerow(["total_processed", kept + dup + blurry + corrupt + non_rgb + missing_treeid + invalid_ext])

    print(f"Quality Filter Complete")
    print(f"  Kept: {kept}")
    print(f"  Duplicates: {dup}")
    print(f"  Blurry: {blurry}")
    print(f"  Corrupt: {corrupt}")
    print(f"  Non-RGB: {non_rgb}")
    print(f"  Missing TreeID: {missing_treeid}")
    print(f"  Invalid extension: {invalid_ext}")
    print(f"  Quarantine: {qdir}")
    print(f"  Reports: {outdir}/removed_images.csv, duplicate_images.csv, dataset_quality_report.csv")

if __name__ == "__main__":
    main()