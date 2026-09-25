# Baseline Results — MobileNetV3Large, PyTorch/CUDA (2026-09-24)

- Data: 41 species (9 thin excluded), train 7477 / val 1532 / test 1586, treeID-grouped splits, seed 42.
- Model: torchvision MobileNetV3Large, ImageNet weights, frozen features, new 41-class head, Adam, 10 epochs, early stopping (patience 5, best = epoch 7, val_loss 1.8489).
- Device: RTX 3060 Laptop GPU. Artifacts: `artifacts/best_torch.pth`, `labels_torch.txt`, `torch_history.csv`.

| split | top-1 | top-3 |
|---|---|---|
| train (ep10) | 0.635 | 0.817 |
| validation (best, 10-epoch run) | 0.508 | 0.691 |
| test, 10-epoch ckpt (ep7, val_loss 1.8489) | 0.494 | 0.686 |
| test, 7-epoch ckpt (ep7, val_loss 1.8568) | 0.402 | 0.576 |

Note: equal validation, 9-point test gap between two unseeded runs = high seed
sensitivity in head-only fine-tuning. Do not trust a single run; all future runs
use `--seed 42` (added 2026-09-24) and selection stays on validation only.

Strong (F1): coconut .79, palmyra .75, gulmohar .67, raintree .66, jackfruit .65.
Dead (F1 0): mesua, silkcotton, vengai, rosewood (n=2). Weak: vaagai .10, jacaranda .14.
Train/val gap (63→51%) = mild overfit; head-only fine-tune is the ceiling.

Next: unfreeze deeper blocks + longer schedule, or EfficientNet comparison (plan §5), then quantization/export.

## Fine-tune run (25 epochs, warm-up 3, AdamW, cosine, AMP, seed 42)

Best ep 12: val_loss 1.3195, val_acc 0.6580, val_top3 0.8029. Early stop ep 17.
Frozen test: **top-1 0.6532, top-3 0.7982** (n=1586) — matches validation, no val/test gap.
Head-only 49.4% → fine-tuned 65.3%: two-phase transfer learning confirmed.
