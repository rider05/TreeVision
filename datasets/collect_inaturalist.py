"""Collect CC-licensed, research-grade field photos via iNaturalist open API.
Files into dataset/raw/<slug>/ as <slug>_obs_<obsID>_<n>.jpg (obsID acts as treeID for split grouping).
Attribution appended to dataset/ATTRIBUTION.csv + datasets/metadata/inat_collection.csv.
Usage: python datasets/collect_inaturalist.py [--max-per-species 60] [--species neem mango]
Default bbox: Tamil Nadu + peninsular buffer. Licenses accepted: cc0, cc-by, cc-by-nc.
"""
import argparse, csv, time, urllib.request, urllib.parse, json, socket
from pathlib import Path
socket.setdefaulttimeout(60)

ROOT = Path(__file__).resolve().parent.parent
RAW = ROOT / "dataset" / "raw"
ATTR = ROOT / "dataset" / "ATTRIBUTION.csv"
MANIFEST = ROOT / "datasets" / "metadata" / "inat_collection.csv"
UA = {"User-Agent": "TreeVision/1.0 (college research project; contact via repo)"}
BBOX = dict(swlat=8.0, swlng=76.2, nelat=13.6, nelng=80.4)
OK_LICENSES = {"cc0", "cc-by", "cc-by-nc"}

TARGETS = {  # slug: (scientific name for iNat taxon_name query,)
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
}

def api(url, retries=4):
    for i in range(retries):
        try:
            req = urllib.request.Request(url, headers=UA)
            return json.load(urllib.request.urlopen(req, timeout=60))
        except Exception as e:
            if i == retries - 1:
                raise
            time.sleep(2 * (i + 1) + 1)
    return {}

def fetch_obs(taxon, page, per_page=100):
    q = dict(taxon_name=taxon, quality_grade="research", photo_licensed="true",
             per_page=per_page, page=page, order="desc", order_by="observed_on", **BBOX)
    return api("https://api.inaturalist.org/v1/observations?" + urllib.parse.urlencode(q))

def dl(url, dest, timeout=60):
    req = urllib.request.Request(url, headers=UA)
    with urllib.request.urlopen(req, timeout=timeout) as r, open(dest, "wb") as f:
        while True:
            b = r.read(1 << 16)
            if not b:
                break
            f.write(b)

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--max-per-species", type=int, default=60)
    ap.add_argument("--species", nargs="*", default=list(TARGETS))
    a = ap.parse_args()
    MANIFEST.parent.mkdir(parents=True, exist_ok=True)
    if not MANIFEST.exists():
        MANIFEST.write_text("file,slug,scientific_name,inat_obs_id,inat_photo_id,license,photographer,obs_url,observed_on,place\n", encoding="utf-8")
    have_manifest = set()
    if MANIFEST.stat().st_size > 200:
        with open(MANIFEST, encoding="utf-8") as f:
            for r in csv.DictReader(f):
                have_manifest.add(r["file"])
    n_new = 0
    with open(MANIFEST, "a", newline="", encoding="utf-8") as mf, \
         open(ATTR, "a", newline="", encoding="utf-8") as af:
        mw, aw = csv.writer(mf), csv.writer(af)
        for slug in a.species:
            if slug not in TARGETS:
                print(f"skip unknown {slug}"); continue
            taxon = TARGETS[slug]
            outdir = RAW / slug
            outdir.mkdir(parents=True, exist_ok=True)
            existing = len(list(outdir.glob("*.jpg"))) + len(list(outdir.glob("*.jpeg")))
            need = a.max_per_species - existing
            if need <= 0:
                print(f"{slug}: already {existing}, skipping"); continue
            got, page = 0, 1
            try:
                while got < need:
                    d = fetch_obs(taxon, page)
                    res = d.get("results", [])
                    if not res:
                        break
                    for o in res:
                        if got >= need:
                            break
                        oid = str(o["id"])
                        for k, p in enumerate(o.get("photos", [])):
                            if got >= need:
                                break
                            lic = (p.get("license_code") or "").lower()
                            if lic not in OK_LICENSES:
                                continue
                            pid = str(p.get("id", k))
                            fname = f"{slug}_obs_{oid}_{k:02d}.jpg"
                            if fname in have_manifest or (outdir / fname).exists():
                                continue
                            url = (p.get("url") or "").replace("square", "medium")
                            if not url:
                                continue
                            try:
                                dl(url, outdir / fname)
                            except Exception as e:
                                print(f"  dl fail {fname}: {e}"); continue
                            mw.writerow([fname, slug, taxon, oid, pid, lic,
                                         (p.get("attribution") or "")[:200],
                                         f"https://www.inaturalist.org/observations/{oid}",
                                         o.get("observed_on") or "", (o.get("place_guess") or "")[:120]])
                            aw.writerow([fname, f"INAT-{oid}", "inaturalist", oid, lic,
                                         (p.get("attribution") or "")[:200],
                                         f"https://www.inaturalist.org/observations/{oid}"])
                            got += 1; n_new += 1
                    page += 1
                    time.sleep(1.1)
                    if page > 40:
                        break
            except Exception as e:
                print(f"{slug}: API stop ({e}), kept what was downloaded")
            print(f"{slug}: +{got} (total ~{existing + got})")
    print(f"DONE new_files={n_new}")

if __name__ == "__main__":
    main()
