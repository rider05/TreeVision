# Phase 0 — Legal Dataset Sources

Rule: document every external image/model/API + license. Never scrape without license. Prefer self-collected Coimbatore field photos.

## Priority order

### 1. Self-collected (best, no license risk)
- Phone photos around Coimbatore: campus, parks, roadsides, farms (with permission).
- Record: species (verified by botanist/app cross-check), GPS (optional), treeID, image type (leaf/bark/whole/flower/fruit), date.
- Target MVP: 150–200 usable/species to start, expand to 300–500 per plan.

### 2. iNaturalist Open Data (CC-licensed, research-grade)
- URL: `https://www.inaturalist.org` / open-data export + GBIF mirror.
- Filter: `research_grade`, taxon = species above, place = Tamil Nadu / India.
- Licenses allowed: CC0, CC-BY, CC-BY-NC (document per image; NC ok for college project, not for commercial reuse).
- How: export via iNaturalist API (`GET /v1/observations?taxon_name=...&quality_grade=research&place_id=...`), keep `observation_id` as treeID proxy + attribution CSV.

### 3. GBIF Occurrence + Checklist Bank
- URL: `https://www.gbif.org`
- Use for occurrence lists + linked CC images, not bulk image hosting. Cite DOI per download.

### 4. PlantCLEF / ImageCLEF (research benchmarks)
- Good for pretraining/augmentation reference, weak on TN street trees. Check yearly license before use.

### 5. Kaggle / GitHub leaf datasets (verify individually)
- Many lack species verification or license. Use only if license file exists (MIT/CC) and spot-check 5% labels manually. Never mix into test set.

## Forbidden without written permission
- Google Images bulk scrape, PlantNet/iNaturalist app scrape, random blog/FB photos.

## Attribution log
Maintain `dataset/ATTRIBUTION.csv`:
```csv
file,treeID,source,source_id,license,photographer,url
neem_leaf_T03_014.jpg,T03,self,survey-2026-09,own,YourName,-
jamun_leaf_INAT_88123.jpg,INAT-88123,inaturalist,88123,CC-BY,PhotographerName,https://...
```

## Next step (Phase 1)
1. Field collection → `dataset/raw/<species>/`
2. Scripted iNaturalist pull → same folder, filenames prefixed `INAT_`
3. Run `ml/preprocessing/clean.py` → `dataset/cleaned/`, then `split.py`
