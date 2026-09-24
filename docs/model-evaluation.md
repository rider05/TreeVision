# Evaluation Methodology (Phase 0)

## Splits
- 70/15/15 train/val/test, stratified by species. Leakage rule: same `treeID` in exactly one split. Test = unseen trees + unseen phones/lighting where possible.
- Freeze test set before tuning. Report train/val/test separately — never report val as final.

## Classification metrics
Accuracy, per-class precision/recall/F1, top-1 + top-3 accuracy, confusion matrix (expect Neem↔Pungam, Banyan↔Peepal confusion). Use `ml/evaluation/evaluate.py`.

## Deployment metrics
Model size (MB .tflite fp16/int8), avg inference ms on target phone, RAM, APK size, offline pass/fail.

## Robustness (field test sheet)
Bright sun / shade / low-light / cluttered bg / 2+ phones / near-far distance / partial leaf / 2 difficult pairs. Min 20 field photos/species outside train distribution.

## Threshold tuning
Sweep confidence threshold on validation; plot selective accuracy vs coverage; pick threshold maximizing correct-retained minus false-accepted. Multi-evidence gain measured as delta on low-confidence subset only.

## No-go criterion
Do not claim "high accuracy" without frozen-test numbers. If top-1 < 70% on 15 spp, expand data/augmentation before adding species.
