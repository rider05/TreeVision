# TreeVision — Local AI Biodiversity Intelligence Platform

Offline-first, Coimbatore/Tamil Nadu-focused tree identification: on-device MobileNetV3/EfficientNet-Lite + confidence-aware workflow + explainability + community biodiversity map.

See `plan.md` for full build plan, `docs/` for Phase 0 R&D outputs.

## Repo layout

```text
app/        # React Native / Expo UI (Phase 5)
ml/         # training, preprocessing, evaluation, export (Phase 2-4)
dataset/    # raw/cleaned/train/val/test + README (Phase 1)
backend/    # Firestore rules + functions (Phase 8, optional)
docs/       # research, species list, sources, architecture, evaluation
tests/      # field + unit tests (Phase 9)
```

## Current status: Phase 0-1

- [x] Species shortlist (15 MVP) → `docs/species-list.md`
- [x] Legal dataset sources → `docs/dataset-sources.md`
- [x] Existing-system research template → `docs/research.md`
- [x] Evaluation methodology → `docs/model-evaluation.md`
- [x] Dataset pipeline scripts → `ml/preprocessing/`
- [ ] Actual image collection (manual/field + scripted download)
- [ ] First train/val/test split + baseline train

## Quickstart (dataset pipeline)

```powershell
pip install -r ml/requirements.txt
# 1. drop images into dataset/raw/<species>/
python ml/preprocessing/stats.py --root dataset/raw
python ml/preprocessing/clean.py --src dataset/raw --dst dataset/cleaned
python ml/preprocessing/split.py --src dataset/cleaned --dst dataset --seed 42
python ml/training/train_baseline.py --data dataset --epochs 10
python ml/evaluation/evaluate.py --data dataset/test --model artifacts/baseline.keras
```
