"""Build TreeVision dataset metadata (no model training).
Reads: datasets/raw/valparai_anamalai/*, datasets/raw/anam_trees/occurrence.txt,
       datasets/raw/barkvisionai/metadata.csv
Writes: datasets/metadata/*.json, regional_species_master.csv, target_species.csv,
        image_inventory.csv, species_overlap.csv, data_quality_report.md,
        docs/dataset_licenses.md, datasets/README.md
Run: python datasets/build_metadata.py
"""
import csv, json
from pathlib import Path
from collections import Counter, defaultdict
from datetime import date

ROOT = Path(__file__).resolve().parent.parent
RAW = ROOT / "datasets" / "raw"
META = ROOT / "datasets" / "metadata"
TODAY = "2026-09-24"

# ---------- load sources ----------
val_sp = list(csv.DictReader(open(RAW / "valparai_anamalai" / "07_specieslist.csv", encoding="utf-8-sig")))
val_20x20 = list(csv.DictReader(open(RAW / "valparai_anamalai" / "02_data20x20.csv", encoding="utf-8-sig")))
val_counts = Counter(r.get("species", "") for r in val_20x20)
val_fam = {}  # accepted GBIF name -> family
for r in val_sp:
    acc = (r.get("species_gbif") or r.get("species") or "").strip()
    if acc and acc not in val_fam:
        val_fam[acc] = (r.get("family") or "").strip()

occ = list(csv.DictReader(open(RAW / "anam_trees" / "occurrence.txt", encoding="utf-8"), delimiter="\t"))
occ_counts = Counter(r.get("scientificName", "") for r in occ)

bark = list(csv.DictReader(open(RAW / "barkvisionai" / "metadata.csv", encoding="utf-8", errors="replace")))
bark_counts = Counter(r["species_name"] for r in bark)

# ---------- 1. per-dataset JSON ----------
datasets = {
    "valparai_anamalai": {
        "name": "valparai_anamalai",
        "source": "Nature Conservation Foundation (Kasinathan et al.)",
        "official_url": "https://zenodo.org/records/21986107",
        "license": "CC-BY-4.0",
        "version": "v1 (published 2026-08-17)",
        "download_date": TODAY,
        "description": "Woody vegetation monitoring (20x20m tree records, 5x5m seedlings/saplings, cover scores) from restoration/degraded/benchmark forest plots, Valparai Plateau, Anamalai Hills (2016-2025). Occurrence/biodiversity data only; contains no training images.",
        "record_count": len(val_20x20),
        "image_count": 0,
        "species_count": len(val_sp),
        "citation": "Kasinathan S. et al. (2026). Tree and plant occurrence from long-term vegetation plot monitoring in restoration and forest areas, Valparai Plateau, Anamalai Hills, Tamil Nadu, India (2016-2025). Zenodo. DOI 10.5281/zenodo.21986107. Supplement to DOI 10.1111/rec.13558 and DOI 10.1002/ecs2.2860.",
        "redistribution_allowed": True,
        "notes": "10 CSV/TXT files downloaded in full (~2.4 MB). GBIF-reconciled names in 07_specieslist.csv (species_gbif); verbatim names preserved per file. DOI 10.15468/svz7gp is listed as variant form (GBIF mirror).",
    },
    "anam_trees": {
        "name": "anam_trees",
        "source": "Nature Conservation Foundation (Raman et al.), via GBIF Asia IPT",
        "official_url": "https://cloud.gbif.org/asia/resource?r=anam-trees-occurrence",
        "license": "CC-BY-4.0",
        "version": "1.0 (published 2026-03-06)",
        "download_date": TODAY,
        "description": "Occurrences of 11 threatened tree species + PCQ-plot associates + trail inventories, Valparai Plateau and Anamalai Tiger Reserve (Oct 2020-Mar 2022). Darwin Core Archive; occurrence data only, no training images.",
        "record_count": len(occ),
        "image_count": 0,
        "species_count": len(occ_counts),
        "citation": "Raman T R S, Madhavan A, Kasinathan S, Bhat K, Page N, Moorthi G, Sundarraj T, Rajesh R, Mudappa D (2026). Tree and other plant species occurrences in the Valparai Plateau and Anamalai Tiger Reserve, Western Ghats, India. Version 1.0. Nature Conservation Foundation. Occurrence dataset. GBIF UUID eb88b65e-8ce5-4ea4-84cc-234df5e4763e.",
        "redistribution_allowed": True,
        "notes": "DwC-A zip (346 KB) + EML downloaded; occurrence.txt extracted (15.3 MB, 8397 records). Focal-tree coords carry 10 m uncertainty; trail-checklist coords use median focal tree with half-trail-length uncertainty. Full ecological dataset also on Zenodo (DOI 10.5281/zenodo.10888937).",
    },
    "barkvisionai": {
        "name": "barkvisionai",
        "source": "Indian School of Business / Himachal Pradesh Forest Department (Chhatre et al.); code: Forest-Economy-Alliance/BarkVisionAI",
        "official_url": "https://zenodo.org/records/14650999",
        "license": "CC-BY-4.0",
        "version": "1.0.0 (published 2025-01-15)",
        "download_date": TODAY,
        "description": "Tree bark image dataset, 13 mostly Himalayan/north-Indian species. Full image archive (~26 GB, 13 zips) NOT downloaded. Only the 6.8 MB training metadata sample (metadata.csv, 39000 rows, 3000/species) was downloaded for overlap/inventory analysis.",
        "record_count": len(bark),
        "image_count": 0,
        "species_count": 13,
        "citation": "Chhatre A. et al. BarkVisionAI: Dataset for Tree Species Classification. Zenodo. DOI 10.5281/zenodo.14650999.",
        "redistribution_allowed": True,
        "notes": "Count discrepancy across sources: Zenodo description says 167361 images; project GitHub README says 156001; downloaded metadata.csv holds 39000 rows. Image zips intentionally not downloaded (26 GB, low regional overlap). Direct species overlap with TreeVision targets is limited to Eucalyptus globulus and Phyllanthus emblica; Mangifera sylvatica is a wild relative of cultivated mango (NOT the same species). Bark-only images (processed 512x512).",
    },
    "plantclef": {
        "name": "plantclef",
        "source": "Kaggle competition page (PlantCLEF-2026)",
        "official_url": "https://www.kaggle.com/competitions/plantclef-2026/data",
        "license": "UNKNOWN",
        "version": "UNKNOWN (page requires Kaggle login; not inspected)",
        "download_date": "NOT_DOWNLOADED",
        "description": "Plant image competition dataset. Not downloaded: requires Kaggle account/competition rules acceptance and is typically >100 GB. Species overlap not yet checked.",
        "record_count": 0,
        "image_count": 0,
        "species_count": 0,
        "citation": "UNKNOWN",
        "redistribution_allowed": False,
        "notes": "Do not use for training until license verified and only a species-filtered subset is obtained. Check competition rules + per-file licenses first.",
    },
}
META.mkdir(parents=True, exist_ok=True)
for k, v in datasets.items():
    (META / f"{k}.json").write_text(json.dumps(v, indent=2, ensure_ascii=False), encoding="utf-8")

# ---------- 2. regional species master (normalize on accepted/GBIF name) ----------
master = {}  # accepted name -> row dict
def add(name, family, source, records):
    name = (name or "").strip()
    if not name:
        return
    m = master.setdefault(name, {"common_name": "", "scientific_name": name, "family": family,
                                 "sources": set(), "region": "Valparai Plateau / Anamalai Hills, Western Ghats, TN, India",
                                 "occurrence_records": 0})
    m["sources"].add(source)
    m["occurrence_records"] += records
    if family and not m["family"]:
        m["family"] = family

for r in val_sp:
    acc = (r.get("species_gbif") or r.get("species") or "").strip()
    add(acc, (r.get("family") or "").strip(), "valparai_anamalai", val_counts.get(r.get("species", ""), 0))
for name, n in occ_counts.items():
    add(name, val_fam.get(name, ""), "anam_trees", n)
for name in bark_counts:
    m = master.setdefault(name, {"common_name": "", "scientific_name": name, "family": "",
                                 "sources": set(), "region": "India (Himalayan/north-Indian forests per BarkVisionAI)",
                                 "occurrence_records": 0})
    m["sources"].add("barkvisionai")

bark_img = {k: v for k, v in bark_counts.items()}
with open(META / "regional_species_master.csv", "w", newline="", encoding="utf-8") as f:
    w = csv.writer(f)
    w.writerow(["species_id", "common_name", "scientific_name", "family", "dataset_source",
                "region", "occurrence_records", "image_available", "image_count", "license", "notes"])
    for i, name in enumerate(sorted(master), 1):
        m = master[name]
        srcs = ";".join(sorted(m["sources"]))
        img = bark_img.get(name, 0)
        lic = "CC-BY-4.0" if "barkvisionai" in m["sources"] or "valparai_anamalai" in m["sources"] or "anam_trees" in m["sources"] else ""
        note = ""
        if name in ("Phoebe arnottii", "Litsea oleoides", "Rauvolfia verticillata"):
            note = "GBIF-reconciled accepted name; verbatim spelling differs in source"
        w.writerow([f"SP{i:04d}", m["common_name"], name, m["family"], srcs, m["region"],
                    m["occurrence_records"], "TRUE" if img else "FALSE", img, lic, note])

# ---------- 3. target species (30-50; regional relevance first) ----------
targets = [
    ("Neem", "Azadirachta indica", "Meliaceae"), ("Pungam", "Pongamia pinnata", "Fabaceae"),
    ("Mango", "Mangifera indica", "Anacardiaceae"), ("Tamarind", "Tamarindus indica", "Fabaceae"),
    ("Banyan", "Ficus benghalensis", "Moraceae"), ("Peepal", "Ficus religiosa", "Moraceae"),
    ("Jamun", "Syzygium cumini", "Myrtaceae"), ("Guava", "Psidium guajava", "Myrtaceae"),
    ("Jackfruit", "Artocarpus heterophyllus", "Moraceae"), ("Rain tree", "Samanea saman", "Fabaceae"),
    ("Gulmohar", "Delonix regia", "Fabaceae"), ("Teak", "Tectona grandis", "Lamiaceae"),
    ("Eucalyptus", "Eucalyptus globulus", "Myrtaceae"), ("Drumstick", "Moringa oleifera", "Moringaceae"),
    ("Golden shower", "Cassia fistula", "Fabaceae"), ("Indian almond", "Terminalia catappa", "Combretaceae"),
    ("Casuarina", "Casuarina equisetifolia", "Casuarinaceae"), ("Palmyra", "Borassus flabellifer", "Arecaceae"),
    ("Amla", "Phyllanthus emblica", "Phyllanthaceae"), ("Arjun", "Terminalia arjuna", "Combretaceae"),
    ("Kadamba", "Neolamarckia cadamba", "Rubiaceae"), ("Ashoka", "Saraca asoca", "Fabaceae"),
    ("Copperpod", "Peltophorum pterocarpum", "Fabaceae"), ("Siris", "Albizia odoratissima", "Fabaceae"),
    ("Vaagai", "Albizia lebbeck", "Fabaceae"), ("Vengai", "Pterocarpus marsupium", "Fabaceae"),
    ("Poovarasu", "Thespesia populnea", "Malvaceae"), ("Silk cotton", "Ceiba pentandra", "Malvaceae"),
    ("Sandalwood", "Santalum album", "Santalaceae"), ("Rosewood", "Dalbergia latifolia", "Fabaceae"),
    ("Vellai Nangai", "Vateria indica", "Dipterocarpaceae"), ("Myristica", "Myristica beddomei", "Myristicaceae"),
    ("White dhup", "Cullenia exarillata", "Malvaceae"), ("Nagappu", "Mesua ferrea", "Calophyllaceae"),
    ("Anamalai dipterocarp", "Dipterocarpus bourdillonii", "Dipterocarpaceae"),
    ("Anamalai jamun", "Syzygium densiflorum", "Myrtaceae"),
]
with open(META / "target_species.csv", "w", newline="", encoding="utf-8") as f:
    w = csv.writer(f)
    w.writerow(["species_id", "common_name", "scientific_name", "family", "dataset_source",
                "region", "occurrence_records", "image_available", "image_count", "license", "notes"])
    for i, (com, sci, fam) in enumerate(targets, 1):
        occ_n = occ_counts.get(sci, 0) + (val_counts.get(sci, 0))
        img = bark_img.get(sci, 0)
        srcs = []
        if sci in val_fam or sci in val_counts:
            srcs.append("valparai_anamalai")
        if sci in occ_counts:
            srcs.append("anam_trees")
        if sci in bark_img:
            srcs.append("barkvisionai")
        note = ""
        if sci == "Eucalyptus globulus":
            note = "Bark images available (3000 in sample); Coimbatore eucalypts often E. tereticornis — verify before training"
        elif sci == "Phyllanthus emblica":
            note = "Bark images available (3000 in sample); synonym Emblica officinalis"
        elif sci == "Mangifera indica":
            note = "BarkVisionAI holds Mangifera sylvatica (wild relative), NOT M. indica — not interchangeable"
        elif not srcs:
            note = "No images in downloaded datasets — field collection required"
        elif img == 0:
            note = "Occurrence reference only — field collection required"
        w.writerow([f"T{i:03d}", com, sci, fam, ";".join(srcs), "Coimbatore/Tamil Nadu; Western Ghats Annex" if i > 30 else "Coimbatore/Tamil Nadu",
                    occ_n, "TRUE" if img else "FALSE", img, "CC-BY-4.0" if img else "", note])

# ---------- 4. image inventory (per-image, bark sample only) ----------
seen_ids = set()
dups = 0
with open(META / "image_inventory.csv", "w", newline="", encoding="utf-8") as f:
    w = csv.writer(f)
    w.writerow(["image_id", "species_id", "scientific_name", "source_dataset", "image_type",
                "license", "resolution", "duplicate_status", "quality_status", "usable_for_training", "notes"])
    for r in bark:
        dup = "DUPLICATE" if r["image_id"] in seen_ids else "unique"
        if r["image_id"] in seen_ids:
            dups += 1
        seen_ids.add(r["image_id"])
        w.writerow([r["image_id"], "", r["species_name"], "barkvisionai", "bark", "CC-BY-4.0",
                    r.get("original_image_resolution", ""), dup, "unverified",
                    "FALSE", "Bark-only; pending blur/quality QC and regional domain check; zips not downloaded"])

# ---------- 5. overlap ----------
all_names = sorted(set(list(val_fam) + list(occ_counts) + list(bark_counts)))
in_val = set(val_fam) | set(val_counts)
with open(META / "species_overlap.csv", "w", newline="", encoding="utf-8") as f:
    w = csv.writer(f)
    w.writerow(["scientific_name", "valparai_anamalai", "anam_trees", "barkvisionai", "plantclef",
                "total_images", "license_status", "training_ready"])
    for n in all_names:
        bv = n in bark_counts
        lic = "CC-BY-4.0" if True else "UNKNOWN"
        ready = "TRUE" if n in ("Eucalyptus globulus", "Phyllanthus emblica") else "FALSE"
        w.writerow([n, "TRUE" if n in in_val else "FALSE", "TRUE" if n in occ_counts else "FALSE",
                    "TRUE" if bv else "FALSE", "FALSE", bark_img.get(n, 0), lic, ready])

print("master species:", len(master))
print("targets:", len(targets))
print("bark metadata rows:", len(bark), "dup image_id:", dups)
print("overlap names:", len(all_names))
print("DONE", TODAY)
