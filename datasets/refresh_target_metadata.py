"""Refresh target-species metadata + field collection report from on-disk counts.
Run AFTER repair_manifest.py. Reads dataset/raw + occurrence data + manifests.
Writes: datasets/metadata/target_species.csv (50 spp), field_collection_report.md
Usage: python datasets/refresh_target_metadata.py
"""
import csv
from pathlib import Path
from collections import Counter

ROOT = Path(__file__).resolve().parent.parent
RAW = ROOT / "dataset" / "raw"
META = ROOT / "datasets" / "metadata"

SPECIES = [  # slug, common, scientific, family
    ("neem", "Neem", "Azadirachta indica", "Meliaceae"), ("pungam", "Pungam", "Pongamia pinnata", "Fabaceae"),
    ("mango", "Mango", "Mangifera indica", "Anacardiaceae"), ("tamarind", "Tamarind", "Tamarindus indica", "Fabaceae"),
    ("banyan", "Banyan", "Ficus benghalensis", "Moraceae"), ("peepal", "Peepal", "Ficus religiosa", "Moraceae"),
    ("jamun", "Jamun", "Syzygium cumini", "Myrtaceae"), ("guava", "Guava", "Psidium guajava", "Myrtaceae"),
    ("jackfruit", "Jackfruit", "Artocarpus heterophyllus", "Moraceae"), ("raintree", "Rain tree", "Samanea saman", "Fabaceae"),
    ("gulmohar", "Gulmohar", "Delonix regia", "Fabaceae"), ("teak", "Teak", "Tectona grandis", "Lamiaceae"),
    ("eucalyptus", "Eucalyptus", "Eucalyptus globulus", "Myrtaceae"), ("drumstick", "Drumstick", "Moringa oleifera", "Moringaceae"),
    ("goldenshower", "Golden shower", "Cassia fistula", "Fabaceae"), ("indianalmond", "Indian almond", "Terminalia catappa", "Combretaceae"),
    ("casuarina", "Casuarina", "Casuarina equisetifolia", "Casuarinaceae"), ("palmyra", "Palmyra", "Borassus flabellifer", "Arecaceae"),
    ("amla", "Amla", "Phyllanthus emblica", "Phyllanthaceae"), ("arjun", "Arjun", "Terminalia arjuna", "Combretaceae"),
    ("kadamba", "Kadamba", "Neolamarckia cadamba", "Rubiaceae"), ("ashoka", "Ashoka", "Saraca asoca", "Fabaceae"),
    ("copperpod", "Copperpod", "Peltophorum pterocarpum", "Fabaceae"), ("siris", "Siris", "Albizia odoratissima", "Fabaceae"),
    ("vaagai", "Vaagai", "Albizia lebbeck", "Fabaceae"), ("vengai", "Vengai", "Pterocarpus marsupium", "Fabaceae"),
    ("poovarasu", "Poovarasu", "Thespesia populnea", "Malvaceae"), ("silkcotton", "Silk cotton", "Ceiba pentandra", "Malvaceae"),
    ("sandalwood", "Sandalwood", "Santalum album", "Santalaceae"), ("rosewood", "Rosewood", "Dalbergia latifolia", "Fabaceae"),
    ("vateria", "Vellai Nangai", "Vateria indica", "Dipterocarpaceae"), ("myristica", "Myristica", "Myristica beddomei", "Myristicaceae"),
    ("cullenia", "White dhup", "Cullenia exarillata", "Malvaceae"), ("mesua", "Nagappu", "Mesua ferrea", "Calophyllaceae"),
    ("dipterocarpus", "Anamalai dipterocarp", "Dipterocarpus bourdillonii", "Dipterocarpaceae"),
    ("syzygiumdensi", "Anamalai jamun", "Syzygium densiflorum", "Myrtaceae"),
    ("coconut", "Coconut", "Cocos nucifera", "Arecaceae"), ("papaya", "Papaya", "Carica papaya", "Caricaceae"),
    ("banana", "Banana", "Musa paradisiaca", "Musaceae"), ("curryleaf", "Curry leaf", "Murraya koenigii", "Rutaceae"),
    ("custardapple", "Custard apple", "Annona squamosa", "Annonaceae"), ("lemon", "Lemon", "Citrus limon", "Rutaceae"),
    ("babul", "Babul", "Vachellia nilotica", "Fabaceae"), ("subabul", "Subabul", "Leucaena leucocephala", "Fabaceae"),
    ("mahogany", "Mahogany", "Swietenia macrophylla", "Meliaceae"), ("tabebuia", "Tabebuia", "Tabebuia rosea", "Bignoniaceae"),
    ("clusterfig", "Cluster fig", "Ficus racemosa", "Moraceae"), ("jacaranda", "Jacaranda", "Jacaranda mimosifolia", "Bignoniaceae"),
    ("millingtonia", "Millingtonia", "Millingtonia hortensis", "Bignoniaceae"), ("bamboo", "Bamboo", "Bambusa bambos", "Poaceae"),
]

def main():
    occ_counts = Counter()
    p = ROOT / "datasets" / "raw" / "anam_trees" / "occurrence.txt"
    for r in csv.DictReader(open(p, encoding="utf-8"), delimiter="\t"):
        occ_counts[r.get("scientificName", "")] += 1
    disk = {}
    for slug, _, _, _ in SPECIES:
        d = RAW / slug
        disk[slug] = len(list(d.glob("*.jpg"))) + len(list(d.glob("*.jpeg"))) if d.exists() else 0
    man = {}
    try:
        for r in csv.DictReader(open(META / "inat_collection.csv", encoding="utf-8")):
            man[r["file"]] = r
    except FileNotFoundError:
        pass
    lic_mix = Counter()
    logged = 0
    for slug, _, _, _ in SPECIES:
        d = RAW / slug
        if not d.exists():
            continue
        for f in list(d.glob("*.jpg")) + list(d.glob("*.jpeg")):
            r = man.get(f.name)
            if r:
                logged += 1
                lic_mix[r.get("license", "UNKNOWN")] += 1
    with open(META / "target_species.csv", "w", newline="", encoding="utf-8") as f:
        w = csv.writer(f)
        w.writerow(["species_id", "common_name", "scientific_name", "family", "dataset_source",
                    "region", "occurrence_records", "image_available", "image_count", "license", "notes"])
        for i, (slug, com, sci, fam) in enumerate(SPECIES, 1):
            n = disk[slug]
            srcs = ["field_inat"] if n else []
            if sci in occ_counts:
                srcs.append("anam_trees")
            note = ""
            if n == 0:
                note = "No images — field collection required"
            elif n < 50:
                note = "THIN (<50) — exclude from first baseline or top up with --india-bbox"
            elif sci == "Eucalyptus globulus":
                note = "Coimbatore eucalypts often E. tereticornis — verify labels before training"
            elif sci == "Mangifera indica":
                note = "BarkVisionAI holds M. sylvatica (wild relative), NOT M. indica"
            w.writerow([f"T{i:03d}", com, sci, fam, ";".join(srcs), "Coimbatore/Tamil Nadu",
                        occ_counts.get(sci, 0), "TRUE" if n else "FALSE", n,
                        "mixed CC0/CC-BY/CC-BY-NC (per-image log)" if n else "", note])
    thin = [(s, disk[s]) for s, _, _, _ in SPECIES if disk[s] < 50]
    total = sum(disk.values())
    rep = [f"# Field Collection Report — 2026-09-24",
           f"Total field images on disk: {total} across {sum(1 for v in disk.values() if v)}/50 species",
           f"Manifest coverage: {logged}/{total} files with attribution rows",
           f"License mix (logged files): {dict(lic_mix)}",
           f"Thin species (<50, exclude from first baseline): {thin}",
           "Source: iNaturalist research-grade, photo-licensed, TN bbox (8.0-13.6N, 76.2-80.4E).",
           "Pre-existing whole-tree files (goldenshower/jackfruit/silkcotton, INAT- format) merged in.",
           "Bamboo is not a tree — keep only if the 50-class scope includes it, else drop."]
    (META / "field_collection_report.md").write_text("\n".join(rep) + "\n", encoding="utf-8")
    print(f"DONE total={total} logged={logged}/{total} thin={len(thin)}")

if __name__ == "__main__":
    main()
