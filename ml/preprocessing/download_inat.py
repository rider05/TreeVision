"""Download CC-licensed iNaturalist images for a region into dataset/raw/<species>/.
Attribution appended to dataset/ATTRIBUTION.csv. Respects licenses, no scraping.

Usage:
  python ml/preprocessing/download_inat.py --lat 10.327 --lng 76.957 --radius 25 --taxon mango --max 20
  python ml/preprocessing/download_inat.py --lat 10.327 --lng 76.957 --radius 25 --taxon-list mango,jamun --max 20
  python ml/preprocessing/download_inat.py --species-counts --lat 10.327 --lng 76.957 --radius 25
"""
import argparse, csv, re
from pathlib import Path
from urllib.request import urlopen, Request
from urllib.parse import urlencode
import json

API = "https://api.inaturalist.org/v1/observations"
LICENSES = "cc0,cc-by,cc-by-sa,cc-by-nc,cc-by-nc-sa"
UA = {"User-Agent": "TreeVision-college-project/1.0 (contact: local)"}

def get(url, params):
    req = Request(url + "?" + urlencode(params), headers=UA)
    with urlopen(req, timeout=30) as r:
        return json.load(r)

def slug(name: str) -> str:
    return re.sub(r"[^a-z0-9]+", "-", name.lower()).strip("-")

def download(url: str, dest: Path):
    req = Request(url, headers=UA)
    with urlopen(req, timeout=30) as r, open(dest, "wb") as f:
        f.write(r.read())

def species_counts(lat, lng, radius):
    d = get(API + "/species_counts", {
        "lat": lat, "lng": lng, "radius": radius,
        "iconic_taxa": "Plantae", "quality_grade": "research", "per_page": 50})
    for r in d.get("results", []):
        t = r["taxon"]
        print(f"{r['count']:5d}  {t.get('name','?'):35s} {t.get('preferred_common_name','')}")

def fetch_taxon(taxon, lat, lng, radius, max_n, raw_root, attrib_path, imgtype="whole"):
    got = 0
    page = 1
    seen_obs = set()
    while got < max_n:
        d = get(API, {"taxon_name": taxon, "lat": lat, "lng": lng, "radius": radius,
                      "quality_grade": "research", "license": LICENSES,
                      "photos": "true", "per_page": 50, "page": page, "order_by": "observed_on"})
        res = d.get("results", [])
        if not res:
            break
        for ob in res:
            if got >= max_n or ob["id"] in seen_obs:
                continue
            seen_obs.add(ob["id"])
            photos = ob.get("photos") or []
            if not photos:
                continue
            sp = slug(ob.get("taxon", {}).get("name", taxon).replace(" ", "_"))
            tree = f"INAT-{ob['id']}"
            for ph in photos[:1]:
                url = ph.get("url", "").replace("square.", "large.")
                lic = (ph.get("license_code") or ob.get("license_code") or "?").lower()
                out = raw_root / sp
                out.mkdir(parents=True, exist_ok=True)
                fname = f"{sp}_{imgtype}_{tree}_{got:03d}.jpg"
                try:
                    download(url, out / fname)
                except Exception as e:
                    print(f"  skip {url}: {e}")
                    continue
                with open(attrib_path, "a", newline="") as fh:
                    csv.writer(fh).writerow(
                        [fname, tree, "inaturalist", ob["id"], lic,
                         ph.get("attribution", ""), f"https://www.inaturalist.org/observations/{ob['id']}"])
                got += 1
                break
        page += 1
        if page > 10:
            break
    print(f"{taxon}: downloaded {got}/{max_n}")

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--lat", type=float, default=10.327)
    ap.add_argument("--lng", type=float, default=76.957)
    ap.add_argument("--radius", type=float, default=25)
    ap.add_argument("--taxon", default=None)
    ap.add_argument("--taxon-list", default=None)
    ap.add_argument("--max", type=int, default=20)
    ap.add_argument("--raw-root", default="dataset/raw")
    ap.add_argument("--species-counts", action="store_true")
    a = ap.parse_args()
    if a.species_counts:
        species_counts(a.lat, a.lng, a.radius)
        return
    taxa = []
    if a.taxon_list:
        taxa = [t.strip() for t in a.taxon_list.split(",") if t.strip()]
    elif a.taxon:
        taxa = [a.taxon]
    else:
        print("pass --taxon NAME or --taxon-list a,b or --species-counts")
        return
    for t in taxa:
        fetch_taxon(t, a.lat, a.lng, a.radius, a.max, Path(a.raw_root), Path("dataset/ATTRIBUTION.csv"))

if __name__ == "__main__":
    main()
