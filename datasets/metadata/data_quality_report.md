# Data Quality Report — TreeVision datasets (2026-09-24)

Methods: header/row-count inspection + `image_id` uniqueness on the BarkVisionAI metadata sample.
Image zips (26 GB) were NOT downloaded, so pixel-level QC (blur, corruption, resolution) is pending.
Nothing was silently deleted; all raw files preserved under `datasets/raw/`.

## 1. valparai_anamalai (occurrence, CC-BY-4.0)
- 10 files, ~2.4 MB. `02_data20x20.csv`: 12510 tree records, 242 distinct `species` values.
- `07_specieslist.csv`: 393 rows mapping verbatim → GBIF-reconciled names (`species_gbif`).
- Known reconciliations to preserve: `Apollonias arnottii` → `Phoebe arnottii`,
  `Litsea nigrescens` → `Litsea oleoides`, `Rauwolfia densiflora` → `Rauvolfia verticillata`.
- No images. Risk if misused for training: text-only; must not be treated as image labels.
- Status: CLEAN reference data; use accepted (`species_gbif`) names downstream.

## 2. anam_trees (occurrence DwC-A, CC-BY-4.0)
- `occurrence.txt`: 8397 records, 480 distinct `scientificName`; extracted 15.3 MB from 346 KB zip.
- Top records: Vateria indica (524), Myristica beddomei (355), Drypetes wightii (349).
- Coordinate uncertainty documented by publisher: 10 m (focal/PCQ), half-trail-length (checklists).
- Some taxa identified only to genus/family — flagged at source, keep as-is, exclude from species master counts.
- No images. Status: CLEAN reference data.

## 3. barkvisionai (bark images, CC-BY-4.0)
- Downloaded ONLY `metadata.csv` (6.8 MB, 39000 rows: 3000/species × 13, `image_id` unique, 0 duplicates).
- Full archive (13 zips, ~26 GB, claimed 167361 images on Zenodo vs 156001 on project GitHub) NOT downloaded.
- Metadata fields present: device (phone_make/model, megapixels, aperture, flash), timestamps,
  `original_image_size` (sample: 768×1024, 0.786 MP — low by modern phone standards),
  `processed_image_size` 512×512.
- Pixel QC NOT yet performed (no zips): blur, corruption, near-duplicates, multi-species frames,
  wrong labels all UNVERIFIED. `image_inventory.csv` marks all 39000 rows `usable_for_training=FALSE`.
- Domain risk: 11/13 species are Himalayan/north-Indian with no Coimbatore relevance; bark texture
  may still transfer for a bark-evidence module, but requires field-side validation.
- Label trap: `Mangifera sylvatica` (wild mango) is NOT `Mangifera indica` (cultivated mango).

## 4. plantclef (NOT downloaded)
- Kaggle page requires login; size typically >100 GB. No QC possible. License UNKNOWN.

## Action list (before any training)
1. Field-collect Coimbatore photos for all 36 target species (only 2 have any images today).
2. If bark module proceeds: download at most `Eucalyptus globulus` + `Phyllanthus emblica` zips,
   run sha256 dedup + Laplacian blur filter + 5% manual label spot-check.
3. Keep an independent field-test set that never enters training (see training-data policy in `datasets/README.md`).
