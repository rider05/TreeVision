"""TreeVision iNaturalist data collector with per-species target counts.
Downloads CC-licensed images for specific species until target reached.
Usage:
  python datasets/collect_inaturalist.py --species eucalyptus --target-count 150 --india-bbox
  python datasets/collect_inaturalist.py --config configs/classes_50.txt --target-count 300 --india-bbox
"""
import argparse, csv, time, json, urllib.request, urllib.parse, socket
from pathlib import Path
from collections import defaultdict

socket.setdefaulttimeout(60)

ROOT = Path(__file__).resolve().parent.parent
RAW = ROOT / "dataset" / "raw"
ATTR = ROOT / "dataset" / "ATTRIBUTION.csv"
META = ROOT / "datasets" / "metadata" / "inat_collection.csv"

# All 50 target species
ALL_TARGETS = {
    "amla": "Phyllanthus emblica", "arjun": "Terminalia arjuna", "ashoka": "Saraca asoca",
    "babul": "Vachellia nilotica", "bamboo": "Bambusa bambos", "banana": "Musa paradisiaca",
    "banyan": "Ficus benghalensis", "casuarina": "Casuarina equisetifolia", "clusterfig": "Ficus racemosa",
    "coconut": "Cocos nucifera", "copperpod": "Peltophorum pterocarpum", "cullenia": "Cullenia exarillata",
    "curryleaf": "Murraya koenigii", "custardapple": "Annona squamosa", "dipterocarpus": "Dipterocarpus bourdillonii",
    "drumstick": "Moringa oleifera", "eucalyptus": "Eucalyptus globulus", "goldenshower": "Cassia fistula",
    "guava": "Psidium guajava", "gulmohar": "Delonix regia", "indianalmond": "Terminalia catappa",
    "jacaranda": "Jacaranda mimosifolia", "jackfruit": "Artocarpus heterophyllus", "jamun": "Syzygium cumini",
    "kadamba": "Neolamarckia cadamba", "lemon": "Citrus limon", "mahogany": "Swietenia macrophylla",
    "mango": "Mangifera indica", "mesua": "Mesua ferrea", "millingtonia": "Millingtonia hortensis",
    "myristica": "Myristica beddomei", "neem": "Azadirachta indica", "palmyra": "Borassus flabellifer",
    "papaya": "Carica papaya", "peepal": "Ficus religiosa", "poovarasu": "Thespesia populnea",
    "pungam": "Pongamia pinnata", "raintree": "Samanea saman", "rosewood": "Dalbergia latifolia",
    "sandalwood": "Santalum album", "silkcotton": "Ceiba pentandra", "siris": "Albizia odoratissima",
    "subabul": "Leucaena leucocephala", "syzygiumdensi": "Syzygium densiflorum", "tabebuia": "Tabebuia rosea",
    "tamarind": "Tamarindus indica", "teak": "Tectona grandis", "vaagai": "Albizia lebbeck",
    "vateria": "Vateria indica", "vengai": "Pterocarpus marsupium",
}

TN_BBOX = dict(swlat=8.0, swlng=76.2, nelat=13.6, nelng=80.4)
INDIA_BBOX = dict(swlat=6.5, swlng=68.0, nelat=35.5, nelng=97.5)
UA = {"User-Agent": "TreeVision/1.0 (college research)"}
OK_LICENSES = {"cc0", "cc-by", "cc-by-nc"}

def api(url, retries=4):
    for i in range(retries):
        try:
            req = urllib.request.Request(url, headers=UA)
            return json.load(urllib.request.urlopen(req, timeout=60))
        except Exception as e:
            if i == retries-1: raise
            time.sleep(2*(i+1))
    return {}

def fetch_obs(taxon, page, bbox, per_page=100):
    q = dict(taxon_name=taxon, quality_grade="research", photo_licensed="true",
             per_page=per_page, page=page, order="desc", order_by="observed_on", **bbox)
    return api("https://api.inaturalist.org/v1/observations?" + urllib.parse.urlencode(q))

def dl(url, dest):
    req = urllib.request.Request(url, headers=UA)
    with urllib.request.urlopen(req, timeout=60) as r, open(dest, "wb") as f:
        while True:
            b = r.read(1<<16)
            if not b: break
            f.write(b)

def load_existing_counts():
    """Count existing images per species in dataset/raw"""
    counts = defaultdict(int)
    if RAW.exists():
        for sp_dir in RAW.iterdir():
            if sp_dir.is_dir():
                counts[sp_dir.name] = len(list(sp_dir.glob("*.jpg"))) + len(list(sp_dir.glob("*.jpeg")))
    return counts

def load_manifest():
    """Load existing manifest to avoid re-downloading"""
    have = set()
    if META.exists() and META.stat().st_size > 200:
        with open(META, encoding="utf-8") as f:
            for r in csv.DictReader(f):
                have.add(r["file"])
    return have

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--species", nargs="*", help="Species slugs to download (default: all 50)")
    ap.add_argument("--config", help="Class list file (configs/classes_41.txt or classes_50.txt)")
    ap.add_argument("--target-count", type=int, default=300, help="Target images per species")
    ap.add_argument("--india-bbox", action="store_true", help="Use pan-India bbox instead of TN")
    ap.add_argument("--include-sa", action="store_true", help="Also allow cc-by-sa / cc-by-nc-sa")
    ap.add_argument("--max-per-page", type=int, default=100, help="API page size")
    ap.add_argument("--sleep", type=float, default=1.1, help="Sleep between API calls (seconds)")
    args = ap.parse_args()

    bbox = INDIA_BBOX if args.india_bbox else TN_BBOX
    licenses = set(OK_LICENSES)
    if args.include_sa: licenses.update({"cc-by-sa","cc-by-nc-sa"})

    # Determine species to process
    if args.config:
        slugs = [s.strip() for s in Path(args.config).read_text().split() if s.strip()]
    elif args.species:
        slugs = args.species
    else:
        slugs = list(ALL_TARGETS.keys())

    for s in slugs:
        if s not in ALL_TARGETS:
            raise SystemExit(f"Unknown species: {s}")

    existing = load_existing_counts()
    have_manifest = load_manifest()

    META.parent.mkdir(parents=True, exist_ok=True)
    if not META.exists():
        META.write_text("file,slug,scientific_name,inat_obs_id,inat_photo_id,license,photographer,obs_url,observed_on,place\n", encoding="utf-8")
    if not ATTR.exists() or ATTR.stat().st_size == 0:
        ATTR.write_text("file,treeID,source,source_id,license,photographer,url\n", encoding="utf-8")

    total_new = 0
    with open(META, "a", newline="", encoding="utf-8") as mf, open(ATTR, "a", newline="", encoding="utf-8") as af:
        mw, aw = csv.writer(mf), csv.writer(af)
        for slug in slugs:
            taxon = ALL_TARGETS[slug]
            outdir = RAW / slug
            outdir.mkdir(parents=True, exist_ok=True)
            have = existing.get(slug, 0)
            need = max(0, args.target_count - have)
            if need <= 0:
                print(f"{slug}: already {have} >= {args.target_count}, skipping")
                continue
            print(f"{slug}: have {have}, need {need} more (target {args.target_count})")
            got = 0
            page = 1
            try:
                while got < need:
                    d = fetch_obs(taxon, page, bbox, args.max_per_page)
                    res = d.get("results", [])
                    if not res:
                        print(f"  no more results for {slug} at page {page}")
                        break
                    for o in res:
                        if got >= need: break
                        oid = str(o["id"])
                        for k, p in enumerate(o.get("photos", [])):
                            if got >= need: break
                            lic = (p.get("license_code") or "").lower()
                            if lic not in licenses: continue
                            fname = f"{slug}_obs_{oid}_{k:02d}.jpg"
                            if fname in have_manifest or (outdir / fname).exists(): continue
                            url = (p.get("url") or "").replace("square", "medium")
                            if not url: continue
                            try:
                                dl(url, outdir / fname)
                            except Exception as e:
                                print(f"  dl fail {fname}: {e}"); continue
                            mw.writerow([fname, slug, taxon, oid, str(p.get("id","")), lic,
                                         (p.get("attribution") or "")[:200],
                                         f"https://www.inaturalist.org/observations/{oid}",
                                         o.get("observed_on") or "", (o.get("place_guess") or "")[:120]])
                            aw.writerow([fname, f"INAT-{oid}", "inaturalist", oid, lic,
                                         (p.get("attribution") or "")[:200],
                                         f"https://www.inaturalist.org/observations/{oid}"])
                            have_manifest.add(fname)
                            got += 1; total_new += 1
                    page += 1
                    time.sleep(args.sleep)
                    if page > 50:
                        print(f"  reached page limit (50) for {slug}")
                        break
            except Exception as e:
                print(f"  {slug}: API error {e}, kept {got} new images")
            print(f"  {slug}: +{got} (now {have+got}/{args.target_count})")

    print(f"\nTotal new images downloaded: {total_new}")
    print(f"Next: python ml/preprocessing/quality_filter.py --src dataset/raw --dst dataset/cleaned")
    print(f"      python ml/preprocessing/split.py --src dataset/cleaned --dst dataset --seed 42")

if __name__ == "__main__":
    main()