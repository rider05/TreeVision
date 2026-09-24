# Dataset (Phase 1)

## Layout

```text
dataset/
 raw/<species>/*.jpg        # untouched drops (field + INAT_), never train directly
 cleaned/<species>/*.jpg    # deduped + quality-filtered
 train/<species>/  validation/<species>/  test/<species>/
 ATTRIBUTION.csv            # source/license per file
 SPLIT_MANIFEST.csv         # file → split + treeID (reproducibility)
```

Naming: `<species>_<type>_<treeID>_<nn>.jpg`, type ∈ {leaf,bark,whole,flower,fruit}.

## Pipeline

```powershell
python ml/preprocessing/stats.py --root dataset/raw
python ml/preprocessing/clean.py --src dataset/raw --dst dataset/cleaned
python ml/preprocessing/split.py --src dataset/cleaned --dst dataset --seed 42
```

`clean.py`: exact-duplicate removal (sha256) + optional perceptual blur filter (laplacian variance, needs opencv).
`split.py`: stratified 70/15/15 by species; groups by `treeID` token (3rd `_`-segment) so one tree stays in one split; writes `SPLIT_MANIFEST.csv`.

Start MVP: 150–200/species → baseline → expand hard classes to 300–500.
