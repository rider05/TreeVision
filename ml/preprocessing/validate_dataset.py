"""TreeVision dataset validation script.
Checks class distribution, TreeID leakage, image quality, and split integrity.
Generates: artifacts/dataset_report.csv, artifacts/dataset_report.txt, artifacts/treeid_split_check.txt
Usage: python ml/preprocessing/validate_dataset.py --data dataset --min-val 10 --strict
"""
import argparse, csv, json, shutil
from pathlib import Path
from collections import defaultdict, Counter
from PIL import Image

def tree_id_from_filename(name: str) -> str | None:
    """Extract TreeID from filename: <species>_<type>_<treeID>_<nn>.ext"""
    parts = name.split("_")
    if len(parts) >= 4:
        return parts[2]
    return None

def check_image_quality(path: Path) -> list[str]:
    """Return list of quality issues for an image."""
    issues = []
    try:
        stat = path.stat()
        if stat.st_size < 1024:
            issues.append("too_small")
        with Image.open(path) as img:
            img.load()
            if img.mode not in ("RGB", "RGBA", "L"):
                issues.append(f"mode_{img.mode}")
            if img.width < 32 or img.height < 32:
                issues.append("too_small_dims")
    except Exception as e:
        issues.append(f"corrupt: {type(e).__name__}")
    return issues

def classify_species(total, val, test):
    if total < 20 or val < 5 or test < 5:
        return "CRITICAL"
    if total < 50 or val < 10 or test < 10:
        return "THIN"
    if total < 150:
        return "LOW"
    return "HEALTHY"

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--data", default="dataset", help="Root dataset folder with train/validation/test subdirs")
    ap.add_argument("--min-val", type=int, default=10, help="Minimum validation samples per class (strict mode)")
    ap.add_argument("--strict", action="store_true", help="Fail if any class has < min-val samples")
    ap.add_argument("--config", help="Optional class list file (configs/classes_41.txt or classes_50.txt)")
    args = ap.parse_args()

    root = Path(args.data)
    splits = ["train", "validation", "test"]
    split_dirs = {s: root / s for s in splits}

    # Load class selection if provided
    selected_classes = None
    if args.config:
        selected_classes = set(Path(args.config).read_text().strip().split())
        print(f"Using class selection from {args.config}: {len(selected_classes)} classes")

    # Collect data
    class_stats = defaultdict(lambda: defaultdict(int))
    class_treeids = defaultdict(lambda: defaultdict(set))
    all_treeids = defaultdict(set)
    image_records = []  # for CSV

    for split_name, split_dir in split_dirs.items():
        if not split_dir.exists():
            print(f"ERROR: {split_dir} does not exist")
            return 1
        for class_dir in sorted(p for p in split_dir.iterdir() if p.is_dir()):
            cls = class_dir.name
            if selected_classes and cls not in selected_classes:
                continue
            for img_path in class_dir.iterdir():
                if img_path.suffix.lower() not in {".jpg", ".jpeg", ".png", ".webp"}:
                    continue
                class_stats[cls][split_name] += 1
                tid = tree_id_from_filename(img_path.stem)
                if tid:
                    class_treeids[cls][split_name].add(tid)
                    all_treeids[split_name].add(tid)
                image_records.append((cls, split_name, img_path.name, tid or ""))

    # Print summary
    print("\nTreeVision Dataset Validation")
    print("=" * 60)
    print(f"Classes: {len(class_stats)}")
    print(f"Config: {args.config or 'all classes in dataset'}")

    total_train = sum(v["train"] for v in class_stats.values())
    total_val = sum(v["validation"] for v in class_stats.values())
    total_test = sum(v["test"] for v in class_stats.values())
    print(f"Train: {total_train}")
    print(f"Val: {total_val}")
    print(f"Test: {total_test}")
    print(f"Total: {total_train + total_val + total_test}")

    # Per-class details
    critical = []
    thin = []
    low = []
    healthy = []

    rows = []
    for cls in sorted(class_stats):
        t = class_stats[cls]["train"]
        v = class_stats[cls]["validation"]
        te = class_stats[cls]["test"]
        total = t + v + te
        treeids = sum(len(class_treeids[cls][s]) for s in splits)
        status = classify_species(total, v, te)
        rows.append({
            "species": cls,
            "total": total,
            "train": t,
            "val": v,
            "test": te,
            "train_pct": round(t / total * 100, 1) if total else 0,
            "val_pct": round(v / total * 100, 1) if total else 0,
            "test_pct": round(te / total * 100, 1) if total else 0,
            "unique_treeids": treeids,
            "status": status,
        })
        if status == "CRITICAL":
            critical.append(cls)
        elif status == "THIN":
            thin.append(cls)
        elif status == "LOW":
            low.append(cls)
        else:
            healthy.append(cls)

    print(f"\nCRITICAL classes: {len(critical)}")
    for c in critical:
        r = next(r for r in rows if r["species"] == c)
        print(f"  {c}: total={r['total']}, val={r['val']}, test={r['test']}, treeIDs={r['unique_treeids']}")
    print(f"THIN classes: {len(thin)}")
    for c in thin:
        r = next(r for r in rows if r["species"] == c)
        print(f"  {c}: total={r['total']}, val={r['val']}, test={r['test']}, treeIDs={r['unique_treeids']}")
    print(f"LOW classes: {len(low)}")
    for c in low:
        r = next(r for r in rows if r["species"] == c)
        print(f"  {c}: total={r['total']}, val={r['val']}, test={r['test']}, treeIDs={r['unique_treeids']}")
    print(f"HEALTHY classes: {len(healthy)}")

    # TreeID leakage check
    print("\nTreeID Leakage Check")
    print("-" * 40)
    train_val = all_treeids["train"] & all_treeids["validation"]
    train_test = all_treeids["train"] & all_treeids["test"]
    val_test = all_treeids["validation"] & all_treeids["test"]
    leakage = bool(train_val or train_test or val_test)
    print(f"Train & Val: {len(train_val)} TreeIDs")
    print(f"Train & Test: {len(train_test)} TreeIDs")
    print(f"Val & Test: {len(val_test)} TreeIDs")
    if leakage:
        print("TreeID leakage: FAIL")
        for tid in sorted(train_val | train_test | val_test):
            splits = []
            if tid in train_val: splits.append("train+val")
            if tid in train_test: splits.append("train+test")
            if tid in val_test: splits.append("val+test")
            print(f"  LEAKED TreeID: {tid} in {', '.join(splits)}")
    else:
        print("TreeID leakage: PASS")

    # Image quality check (sample validation images)
    print("\nImage Quality Check (validation set)")
    print("-" * 40)
    quality_issues = []
    for cls, split_name, fname, tid in image_records:
        if split_name != "validation":
            continue
        path = split_dirs["validation"] / cls / fname
        issues = check_image_quality(path)
        if issues:
            quality_issues.append((cls, fname, tid, ", ".join(issues)))
    if quality_issues:
        print(f"Found {len(quality_issues)} validation images with issues (showing first 10):")
        for cls, fname, tid, iss in quality_issues[:10]:
            print(f"  {cls}/{fname} (TreeID: {tid}): {iss}")
    else:
        print("All validation images passed basic quality checks")

    # Write dataset_report.csv
    outdir = Path("artifacts")
    outdir.mkdir(exist_ok=True)
    with open(outdir / "dataset_report.csv", "w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=rows[0].keys() if rows else [])
        writer.writeheader()
        writer.writerows(rows)

    # Write dataset_report.txt
    with open(outdir / "dataset_report.txt", "w", encoding="utf-8") as f:
        f.write("TreeVision Dataset Report\n")
        f.write("=" * 60 + "\n")
        f.write(f"Classes: {len(class_stats)}\n")
        f.write(f"Train: {total_train}\n")
        f.write(f"Validation: {total_val}\n")
        f.write(f"Test: {total_test}\n")
        f.write(f"Total: {total_train + total_val + total_test}\n\n")
        f.write("Per-class statistics:\n")
        for r in rows:
            f.write(f"  {r['species']:20s} total={r['total']:4d} train={r['train']:4d} val={r['val']:3d} test={r['test']:3d} treeIDs={r['unique_treeids']:3d} status={r['status']}\n")
        f.write(f"\nSummary:\n")
        f.write(f"  CRITICAL: {len(critical)} classes\n")
        f.write(f"  THIN:     {len(thin)} classes\n")
        f.write(f"  LOW:      {len(low)} classes\n")
        f.write(f"  HEALTHY:  {len(healthy)} classes\n")
        f.write(f"\nTreeID leakage: {'FAIL' if leakage else 'PASS'}\n")
        if leakage:
            f.write(f"  Leaked TreeIDs: {sorted(train_val | train_test | val_test)}\n")
        f.write(f"\nValidation image quality issues: {len(quality_issues)}\n")

    # Write treeid_split_check.txt
    with open(outdir / "treeid_split_check.txt", "w", encoding="utf-8") as f:
        f.write(f"TreeID leakage: {'FAIL' if leakage else 'PASS'}\n")
        f.write(f"Train ∩ Val: {len(train_val)}\n")
        f.write(f"Train ∩ Test: {len(train_test)}\n")
        f.write(f"Val ∩ Test: {len(val_test)}\n")

    # Strict mode
    if args.strict:
        violations = [r["species"] for r in rows if r["val"] < args.min_val]
        if violations:
            print(f"\nSTRICT MODE: {len(violations)} classes have < {args.min_val} validation samples:")
            for v in violations:
                print(f"  {v}")
            return 1

    return 0

if __name__ == "__main__":
    import sys
    sys.exit(main())