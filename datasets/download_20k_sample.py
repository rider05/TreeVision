"""Download ~20k CC-licensed training images for TreeVision.

Strategy: iNaturalist research-grade CC images stratified across 50 target species.
Fills dataset/raw/<slug>/ as <slug>_obs_<id>_<n>.jpg  (id = treeID for split.py)
Attribution -> dataset/ATTRIBUTION.csv + datasets/metadata/inat_collection.csv

Usage:
  pip install tqdm requests   # tqdm optional, requests recommended
  python datasets/download_20k_sample.py --total 20000
  python datasets/download_20k_sample.py --total 20000 --per-species 560 --india-bbox
  python datasets/download_20k_sample.py --total 5000 --species neem mango jackfruit --per-species 600
  # resume safe - re-run same command, skips existing files

Bbox default = Tamil Nadu buffer (swlat 8.0,swlng 76.2,nelat 13.6,nelng 80.4) per datasets/collect_inaturalist.py:16
Use --india-bbox to expand to pan-India if TN pool insufficient for 20k.
"""
import argparse, csv, time, json, urllib.request, urllib.parse, socket, concurrent.futures, threading
from pathlib import Path
from collections import defaultdict

socket.setdefaulttimeout(60)

ROOT = Path(__file__).resolve().parent.parent
RAW = ROOT / "dataset" / "raw"
ATTR = ROOT / "dataset" / "ATTRIBUTION.csv"
META = ROOT / "datasets" / "metadata" / "inat_collection.csv"

# 50 species: 36 original + 14 urban/common TN additions for 50-class model (plan.md:192)
TARGETS = {
    # 1-36 original
    "neem": "Azadirachta indica", "pungam": "Pongamia pinnata", "mango": "Mangifera indica",
    "tamarind": "Tamarindus indica", "banyan": "Ficus benghalensis", "peepal": "Ficus religiosa",
    "jamun": "Syzygium cumini", "guava": "Psidium guajava", "jackfruit": "Artocarpus heterophyllus",
    "raintree": "Samanea saman", "gulmohar": "Delonix regia", "teak": "Tectona grandis",
    "eucalyptus": "Eucalyptus globulus", "drumstick": "Moringa oleifera", "goldenshower": "Cassia fistula",
    "indianalmond": "Terminalia catappa", "casuarina": "Casuarina equisetifolia",
    "palmyra": "Borassus flabellifer", "amla": "Phyllanthus emblica", "arjun": "Terminalia arjuna",
    "kadamba": "Neolamarckia cadamba", "ashoka": "Saraca asoca", "copperpod": "Peltophorum pterocarpum",
    "siris": "Albizia odoratissima", "vaagai": "Albizia lebbeck", "vengai": "Pterocarpus marsupium",
    "poovarasu": "Thespesia populnea", "silkcotton": "Ceiba pentandra", "sandalwood": "Santalum album",
    "rosewood": "Dalbergia latifolia", "vateria": "Vateria indica", "myristica": "Myristica beddomei",
    "cullenia": "Cullenia exarillata", "mesua": "Mesua ferrea",
    "dipterocarpus": "Dipterocarpus bourdillonii", "syzygiumdensi": "Syzygium densiflorum",
    # 37-50 urban/common TN additions (high iNat availability, visually distinct)
    "coconut": "Cocos nucifera", "papaya": "Carica papaya", "banana": "Musa paradisiaca",
    "curryleaf": "Murraya koenigii", "custardapple": "Annona squamosa", "lemon": "Citrus limon",
    "babul": "Vachellia nilotica", "subabul": "Leucaena leucocephala",
    "mahogany": "Swietenia macrophylla", "tabebuia": "Tabebuia rosea",
    "clusterfig": "Ficus racemosa", "jacaranda": "Jacaranda mimosifolia",
    "millingtonia": "Millingtonia hortensis", "bamboo": "Bambusa bambos",
}

TN_BBOX = dict(swlat=8.0, swlng=76.2, nelat=13.6, nelng=80.4)
INDIA_BBOX = dict(swlat=6.5, swlng=68.0, nelat=35.5, nelng=97.5)
UA = {"User-Agent": "TreeVision/1.0 (college research; 20k sample)"}
OK_LICENSES = {"cc0", "cc-by", "cc-by-nc"}  # college-safe; add cc-by-sa if you need commercial

def api(url, retries=4):
    for i in range(retries):
        try:
            req = urllib.request.Request(url, headers=UA)
            return json.load(urllib.request.urlopen(req, timeout=60))
        except Exception as e:
            if i == retries-1: raise
            time.sleep(2*(i+1))

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

def dl_parallel(tasks, workers=8):
    """tasks: list of (url, dest, writer_rows) -> downloads in parallel, returns success count"""
    lock = threading.Lock()
    ok = 0
    def one(t):
        nonlocal ok
        url, dest = t[0], t[1]
        try:
            dl(url, dest)
            with lock: ok += 1
            return True
        except Exception as e:
            print(f"  dl fail {dest.name}: {e}")
            try: dest.unlink(missing_ok=True)
            except: pass
            return False
    with concurrent.futures.ThreadPoolExecutor(max_workers=workers) as ex:
        list(ex.map(one, tasks))
    return ok

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--total", type=int, default=20000, help="target total images")
    ap.add_argument("--per-species", type=int, default=None, help="cap per species (default total//len(species))")
    ap.add_argument("--species", nargs="*", default=None, help="subset slugs, default all 50")
    ap.add_argument("--india-bbox", action="store_true", help="use pan-India bbox if TN insufficient")
    ap.add_argument("--include-sa", action="store_true", help="also allow cc-by-sa / cc-by-nc-sa")
    ap.add_argument("--workers", type=int, default=8, help="parallel image downloads (1=sequential, 8=fast, API still 1 req/s)")
    ap.add_argument("--shards", type=int, default=1, help="parallel shards (run multiple species in parallel, use with &)")
    args = ap.parse_args()

    bbox = INDIA_BBOX if args.india_bbox else TN_BBOX
    licenses = set(OK_LICENSES)
    if args.include_sa: licenses.update({"cc-by-sa","cc-by-nc-sa"})

    slugs = args.species if args.species else list(TARGETS)
    for s in slugs:
        if s not in TARGETS: raise SystemExit(f"unknown slug {s} not in TARGETS")

    per_species = args.per_species or max(1, args.total // len(slugs))
    print(f"target total={args.total} across {len(slugs)} species -> per_species={per_species} bbox={'INDIA' if args.india_bbox else 'TN'} licenses={licenses} workers={args.workers}")

    META.parent.mkdir(parents=True, exist_ok=True)
    if not META.exists():
        META.write_text("file,slug,scientific_name,inat_obs_id,inat_photo_id,license,photographer,obs_url,observed_on,place\n", encoding="utf-8")
    have = set()
    if META.stat().st_size > 200:
        with open(META, encoding="utf-8") as f:
            for r in csv.DictReader(f): have.add(r["file"])

    # ensure ATTRIBUTION header
    if not ATTR.exists() or ATTR.stat().st_size == 0:
        ATTR.write_text("file,treeID,source,source_id,license,photographer,url\n", encoding="utf-8")

    total_new = 0
    with open(META, "a", newline="", encoding="utf-8") as mf, open(ATTR, "a", newline="", encoding="utf-8") as af:
        mw, aw = csv.writer(mf), csv.writer(af)
        for slug in slugs:
            if total_new >= args.total: break
            taxon = TARGETS[slug]
            outdir = RAW / slug
            outdir.mkdir(parents=True, exist_ok=True)
            existing = len(list(outdir.glob("*.jpg"))) + len(list(outdir.glob("*.jpeg")))
            need = min(per_species, args.total - total_new)
            if existing >= per_species:
                print(f"{slug}: already {existing} >= {per_species}, skip"); continue
            need = need - 0  # keep per-species cap, don't overfill one species
            # adjust need by existing
            need = max(0, min(need, per_species - 0))
            # we want existing + got == per_species, so got = per_species - existing but bounded by remaining total
            got_target = min(per_species - existing, args.total - total_new)
            if got_target <= 0: continue
            got = 0
            page = 1
            # collect tasks then download in parallel batches per page
            pending_tasks = []  # list of (url, dest, mw_row, aw_row)
            try:
                while got + len(pending_tasks) < got_target and page <= 40:
                    d = fetch_obs(taxon, page, bbox)
                    res = d.get("results", [])
                    if not res: break
                    batch = []
                    for o in res:
                        if got + len(pending_tasks) >= got_target: break
                        oid = str(o["id"])
                        for k, p in enumerate(o.get("photos", [])):
                            if got + len(pending_tasks) >= got_target: break
                            lic = (p.get("license_code") or "").lower()
                            if lic not in licenses: continue
                            fname = f"{slug}_obs_{oid}_{k:02d}.jpg"
                            if fname in have or (outdir / fname).exists(): continue
                            url = (p.get("url") or "").replace("square", "medium")
                            if not url: continue
                            dest = outdir / fname
                            mw_row = [fname, slug, taxon, oid, str(p.get("id","")), lic,
                                      (p.get("attribution") or "")[:200],
                                      f"https://www.inaturalist.org/observations/{oid}",
                                      o.get("observed_on") or "", (o.get("place_guess") or "")[:120]]
                            aw_row = [fname, f"INAT-{oid}", "inaturalist", oid, lic,
                                      (p.get("attribution") or "")[:200],
                                      f"https://www.inaturalist.org/observations/{oid}"]
                            batch.append((url, dest, mw_row, aw_row))
                            have.add(fname)  # reserve to avoid dup within run
                    # parallel dl this page's batch
                    if batch:
                        urls = [(u,d) for u,d,_,_ in batch]
                        dl_parallel(urls, workers=args.workers)
                        # only count actually downloaded files (exists + non-zero)
                        for _, dest, mw_row, aw_row in batch:
                            if dest.exists() and dest.stat().st_size > 5000:
                                mw.writerow(mw_row); aw.writerow(aw_row)
                                got += 1; total_new += 1
                            else:
                                have.discard(mw_row[0])
                                try: dest.unlink(missing_ok=True)
                                except: pass
                    page += 1
                    time.sleep(1.1)  # iNat API rate limit ~1 req/s (images themselves run in parallel)
            except Exception as e:
                print(f"{slug}: API stop {e}, kept {got}")
            # flush in case any pending left (already flushed per page)
            print(f"{slug}: +{got} (now {existing+got}/{per_species}) total_new={total_new}/{args.total} workers={args.workers}")

    # summary
    final = sum(len(list((RAW/s).glob("*.jpg"))) for s in slugs if (RAW/s).exists())
    print(f"DONE total_new_this_run={total_new} total_on_disk={final} target={args.total}")
    if final < args.total:
        print(f"SHORTFALL {args.total-final}: TN bbox exhausted. Re-run with --india-bbox --include-sa or lower --total")
    print(f"Next: python ml/preprocessing/clean.py --src dataset/raw --dst dataset/cleaned")
    print(f"      python ml/preprocessing/split.py --src dataset/cleaned --dst dataset --seed 42")
    print(f"      python ml/preprocessing/stats.py --root dataset/raw  # verify counts")

if __name__ == "__main__":
    main()
