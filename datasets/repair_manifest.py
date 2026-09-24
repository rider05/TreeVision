"""Backfill missing attribution rows for files on disk (lost to killed worker / renames).
Groups by iNat observation ID (1 API call per obs), appends to inat_collection.csv + ATTRIBUTION.csv.
Filenames: <slug>_obs_<oid>_<k>.jpg  OR  <oldslug>_whole_INAT-<oid>_<nn>.jpg
Usage: python datasets/repair_manifest.py [--dry-run]
Unresolvable observations are logged with license UNKNOWN (excluded from training until verified).
"""
import argparse, csv, time, urllib.request, json
from pathlib import Path
from collections import defaultdict

ROOT = Path(__file__).resolve().parent.parent
RAW = ROOT / "dataset" / "raw"
MANIFEST = ROOT / "datasets" / "metadata" / "inat_collection.csv"
ATTR = ROOT / "dataset" / "ATTRIBUTION.csv"
UA = {"User-Agent": "TreeVision/1.0 (attribution repair)"}

def oid_of(fname):
    parts = fname.split("_")
    if len(parts) >= 4 and parts[-3] == "obs":
        return parts[-2]
    for p in parts:
        if p.startswith("INAT-"):
            return p[5:]
    return ""

def fetch_obs(oid):
    req = urllib.request.Request(f"https://api.inaturalist.org/v1/observations/{oid}", headers=UA)
    return json.load(urllib.request.urlopen(req, timeout=60))["results"][0]

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--dry-run", action="store_true")
    a = ap.parse_args()
    have = set()
    for r in csv.DictReader(open(MANIFEST, encoding="utf-8")):
        have.add(r["file"])
    missing = defaultdict(list)  # oid -> [(folder_slug, fname)]
    for d in sorted(RAW.iterdir()):
        if not d.is_dir():
            continue
        for p in list(d.glob("*.jpg")) + list(d.glob("*.jpeg")):
            if p.name not in have:
                oid = oid_of(p.name)
                if oid:
                    missing[oid].append((d.name, p.name))
                else:
                    print("unparseable:", p.name)
    print(f"missing files={sum(len(v) for v in missing.values())} distinct_obs={len(missing)}")
    if a.dry_run:
        return
    fixed, unknown = 0, 0
    with open(MANIFEST, "a", newline="", encoding="utf-8") as mf, \
         open(ATTR, "a", newline="", encoding="utf-8") as af:
        mw, aw = csv.writer(mf), csv.writer(af)
        for i, (oid, files) in enumerate(sorted(missing.items())):
            try:
                o = fetch_obs(oid)
                photos = {str(p.get("id")): p for p in o.get("photos", [])}
                for slug, fname in files:
                    old_fmt = "_INAT-" in fname or "INAT-" in fname.split("_")[-2]
                    k = fname.split("_")[-1].split(".")[0]
                    photo = None
                    if not old_fmt:
                        # new format: trailing index == photo index within the observation
                        try:
                            photo = o["photos"][int(k)] if k.isdigit() and int(k) < len(o["photos"]) else None
                        except Exception:
                            photo = None
                    if photo is None:
                        lic, attr, pid = "UNKNOWN", "", ""
                    else:
                        lic = (photo.get("license_code") or "UNKNOWN").lower()
                        attr = (photo.get("attribution") or "")[:200]
                        pid = str(photo.get("id", ""))
                    mw.writerow([fname, slug, o.get("taxon", {}).get("name", ""), oid, pid, lic, attr,
                                 f"https://www.inaturalist.org/observations/{oid}",
                                 o.get("observed_on") or "", (o.get("place_guess") or "")[:120]])
                    aw.writerow([fname, f"INAT-{oid}", "inaturalist", oid, lic, attr,
                                 f"https://www.inaturalist.org/observations/{oid}"])
                    fixed += 1
                time.sleep(1.1)
            except Exception as e:
                print(f"obs {oid} unresolvable ({e}); marking {len(files)} UNKNOWN")
                for slug, fname in files:
                    mw.writerow([fname, slug, "", oid, "", "UNKNOWN", "", f"https://www.inaturalist.org/observations/{oid}", "", ""])
                    aw.writerow([fname, f"INAT-{oid}", "inaturalist", oid, "UNKNOWN", "", f"https://www.inaturalist.org/observations/{oid}"])
                    unknown += 1
            if (i + 1) % 20 == 0:
                print(f"  {i+1}/{len(missing)} obs...")
    print(f"DONE fixed={fixed} unknown={unknown}")

if __name__ == "__main__":
    main()
