# TreeVision Datasets (acquisition complete, no training)

## 1. Overview
Regional reference (occurrence) + one external bark-image source. No model training performed.
Builder: `datasets/build_metadata.py`. Metadata: `datasets/metadata/`. Licenses: `docs/dataset_licenses.md`.

## 2. Sources
| dataset | official URL | version | downloaded |
|---|---|---|---|
| valparai_anamalai | https://zenodo.org/records/21986107 | v1 (2026-08-17) | 10 files, ~2.4 MB — full |
| anam_trees | https://cloud.gbif.org/asia/resource?r=anam-trees-occurrence | v1.0 (2026-03-06) | DwC-A 346 KB + EML — full |
| barkvisionai | https://zenodo.org/records/14650999 | v1.0.0 (2025-01-15) | metadata.csv only (39k rows); 26 GB zips SKIPPED |
| plantclef | https://www.kaggle.com/competitions/plantclef-2026/data | UNKNOWN | NOT downloaded (login wall, huge) |

## 3. Licenses
valparai_anamalai CC-BY-4.0; anam_trees CC-BY-4.0; barkvisionai CC-BY-4.0; plantclef UNKNOWN.
Attribute every reuse; see `docs/dataset_licenses.md`. Redistribution allowed only for the three CC-BY-4.0 sets.

## 4. Records / 5. Images / 6. Species (updated 2026-09-24: field collection complete)
- Reference records: 12510 (valparai 20×20 tree rows) + 8397 (anam occurrences) + 39000 (bark metadata rows).
- Field images: 10845 CC-licensed iNaturalist photos across 50 species (see `metadata/field_collection_report.md`).
- After sha256 dedup (61 removed) + UNKNOWN-license exclusion (61 files / 36 obs, incl. 25 double-filed conflicts): **10748** in frozen splits — train 7609 / validation 1540 / test 1599 (`SPLIT_MANIFEST.csv`, zero treeID leakage).
- Candidate species: 536 (`regional_species_master.csv`); target species: 50 (`target_species.csv`, 9 thin <50 excluded from first baseline).
- License mix of field photos: CC-BY-NC 7872 / CC-BY 2761 / CC0 176 → project must stay non-commercial unless NC images are removed.

## 7. Regional relevance
Occurrence sets are Valparai/Anamalai rainforest (215 species in both) — strong Western Ghats signal,
weak Coimbatore urban-tree signal. BarkVisionAI is 11/13 Himalayan — reference only.

## 8. Image types
Bark only (512×512 processed, originals ~768×1024). Leaf / whole-tree / flower / fruit: none acquired.

## 9. Target species
36 in `datasets/metadata/target_species.csv` (2026-09-24 refresh: 50 species — 15 MVP + 15 expansion + 6 Anamalai Annex + 14 urban TN additions).

## 10. Limitations
- Zero verified training images for 34/36 targets; 2 bark candidates need domain verification.
- `Mangifera sylvatica` ≠ `Mangifera indica`; Coimbatore eucalypts often not `E. globulus`.
- Bark counts disagree across sources (167361 vs 156001 vs 39000 sample).
- PlantCLEF overlap unchecked.

## 11. Data-quality issues
See `datasets/metadata/data_quality_report.md`. Pixel QC pending; all inventory rows `usable_for_training=FALSE`.

## 12. Attribution
Cite the three DOI/GBIF records listed in §2 on any reuse; keep `datasets/metadata/*.json`.

## 13. Training-data policy
- A. Regional reference: occurrence CSVs (never image labels).
- B. Training images: field photos + (optionally) 2 bark zips after QC.
- C. Validation/test: frozen splits + independent field-test set, never trained on.
- D. Field data: `dataset/raw/<species>/` per repo naming contract.

## 14. Field-data requirements
Per species: leaf + bark + whole-tree (+ flower/fruit), multiple treeIDs, phones, lighting;
filename `<sp>_<type>_<treeID>_<nn>.jpg`; log source/license in `dataset/ATTRIBUTION.csv`.
