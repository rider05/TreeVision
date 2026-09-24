"""Stratified 70/15/15 split with treeID grouping.
Groups by 3rd underscore token of filename (<species>_<type>_<treeID>_...);
files without treeID fall back to per-file random (warns).
Writes dataset/SPLIT_MANIFEST.csv (file, species, split, treeID).
Usage: python ml/preprocessing/split.py --src dataset/cleaned --dst dataset --seed 42
"""
import argparse, csv, random, shutil
from pathlib import Path
from collections import defaultdict

EXTS = {".jpg", ".jpeg", ".png", ".webp"}
RATIOS = (0.70, 0.15, 0.15)

def tree_id(name: str) -> str:
    parts = name.split("_")
    return parts[2] if len(parts) >= 4 else "__NOID__"

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--src", default="dataset/cleaned")
    ap.add_argument("--dst", default="dataset")
    ap.add_argument("--seed", type=int, default=42)
    a = ap.parse_args()
    rng = random.Random(a.seed)
    src, dst = Path(a.src), Path(a.dst)
    rows = []
    for sp_dir in sorted(p for p in src.iterdir() if p.is_dir()):
        files = sorted(f for f in sp_dir.iterdir() if f.suffix.lower() in EXTS)
        groups: dict[str, list] = defaultdict(list)
        for f in files:
            groups[tree_id(f.stem)].append(f)
        ids = list(groups)
        rng.shuffle(ids)
        n = len(ids)
        split_of = {}
        if n == 1:
            print(f"WARN {sp_dir.name}: single treeID — all images go to train; collect more trees")
            split_of[ids[0]] = "train"
        elif n == 2:
            print(f"WARN {sp_dir.name}: only 2 treeIDs — no validation split; collect more trees")
            split_of[ids[0]] = "train"
            split_of[ids[1]] = "test"
        else:
            n_te = max(1, int(n * RATIOS[2]))
            n_va = max(1, int(n * RATIOS[1]))
            n_tr = n - n_va - n_te
            if n_tr < 1:
                n_tr, n_va = 1, n - 1 - n_te
            for i, tid in enumerate(ids):
                split_of[tid] = "train" if i < n_tr else ("validation" if i < n_tr + n_va else "test")
        if "__NOID__" in groups:
            print(f"WARN {sp_dir.name}: {len(groups['__NOID__'])} files lack treeID — rename to <sp>_<type>_<treeID>_<nn>.jpg")
        for tid, flist in groups.items():
            for f in flist:
                sp = split_of[tid]
                out = dst / sp / sp_dir.name
                out.mkdir(parents=True, exist_ok=True)
                shutil.copy2(f, out / f.name)
                rows.append((f"{sp}/{sp_dir.name}/{f.name}", sp_dir.name, sp, tid))
    with open(dst / "SPLIT_MANIFEST.csv", "w", newline="") as fh:
        csv.writer(fh).writerows([("file", "species", "split", "treeID"), *rows])
    print(f"wrote {len(rows)} files -> train/validation/test + SPLIT_MANIFEST.csv")

if __name__ == "__main__":
    main()
