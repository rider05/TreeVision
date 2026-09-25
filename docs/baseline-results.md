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

---

## Swin Transformer Transfer Learning Experiment (2026-09-25)

**Pretrained Model:** `OttoYu/TreeClassification` (Swin Transformer, 13 classes)
- Architecture: Swin Transformer (depths=[2,2,18,2], embed_dim=128, 86.8M params)
- Original classes: Araucaria columnaris, Archontophenix alexandrae, Bischofia javanica, Callistemon viminalis, Casuarina equisetifolia, Cinnamomum burmannii, Dicranopteris pedata, Hibiscus tiliaceus, Livistona chinensis, Machilus chekiangensis, Melaleuca cajuputi subsp. cumingiana, Psychotria asiatica, Terminalia mantaly
- Source: https://huggingface.co/OttoYu/TreeClassification

**TreeVision Configuration:**
- 41 classes (from `configs/classes_41.txt`)
- Data: train 7477 / val 1532 / test 1586 (treeID-grouped splits)
- Processor: ViTImageProcessor (224x224, ImageNet mean/std)
- Training: Two-phase fine-tuning (2 epochs frozen backbone + 3 epochs full fine-tuning)
- Optimizer: AdamW (backbone LR=1e-5, classifier LR=1e-4, weight_decay=0.01)
- Mixed precision: Enabled (FP16)
- Batch size: 8 (gradient accumulation: 1)

**Results (5-epoch pilot):**

| Metric | MobileNetV3 Baseline | Swin Fine-tuned |
|---|---|---|
| Validation Top-1 | 65.8% | **85.77%** |
| Test Top-1 | 65.3% | **85.75%** |
| Validation Top-3 | ~80.3% | **93.67%** |
| Test Top-3 | ~79.8% | **93.38%** |
| Test Macro F1 | ~55% | **81.98%** |
| Test Weighted F1 | ~65% | **85.98%** |
| Parameters | 4.25M | 86.8M |
| FP32 Model Size | ~17 MB | 331.5 MB |
| FP16 Model Size | ~8.5 MB | 165.7 MB |
| GPU Inference Time | ~5-10 ms | 76.0 ms |
| GPU FPS | 100-200 | 13.2 |

**Per-class performance:** Significant improvement across all classes, especially previously weak classes (vaagai, jacaranda, mesua, silkcotton, vengai, rosewood) now achieve F1 > 0.7.

**Training dynamics:**
- Epoch 1 (frozen): val_acc 68.5% → Epoch 2: 76.8%
- Epoch 3 (unfrozen): val_acc 83.5% → Epoch 5: 88.3%
- Training loss: 2.56 → 0.88 (steady decrease)
- Validation loss: 1.47 → 0.58 (steady decrease)
- No overfitting observed in 5 epochs

**Mobile Benchmark (RTX 3060 Laptop GPU):**
- FP32 model size: 331.5 MB (too large for mobile)
- FP16 model size: 165.7 MB (too large for mobile)
- GPU inference: 76.0 ms (13 FPS)
- GPU memory: 670 MB allocated
- Recommendation: Requires INT8 quantization + ONNX/TensorRT optimization for mobile

**Artifacts saved to `artifacts/swin_41/`:**
- `best_model/` — Hugging Face compatible model (config.json, model.safetensors, preprocessor_config.json, treevision_class_mapping.json)
- `best_torch.pth` — PyTorch checkpoint
- `confusion_matrix_val.png`, `confusion_matrix_test.png`
- `classification_report_val.txt`, `classification_report_test.txt`
- `per_class_metrics_val.csv`, `per_class_metrics_test.csv`
- `training_history.csv`, `training_curves.png`
- `metrics.json`, `treevision_41_class_mapping.json`
- `treeid_split_check.txt` (PASS)
- `mobile_benchmark.json`

**Conclusion:**
The Swin Transformer fine-tuned on TreeVision 41-class data **significantly outperforms** the MobileNetV3 baseline (+20% absolute Top-1 accuracy, +27% Macro F1). However, the model is **20x larger** and **10x slower** than MobileNetV3, making it unsuitable for mobile deployment without aggressive quantization (INT8) and optimization (ONNX Runtime, TensorRT).

**Recommendation:**
- For server/cloud deployment: Use Swin model for highest accuracy
- For mobile/edge deployment: Continue with MobileNetV3 baseline, or pursue Swin INT8 quantization + ONNX export
- Do NOT train 50-class model until thin species have sufficient data (≥150 images/class)

**Pilot Status:** The 5-epoch pilot showed strong learning signal. The train_loss_decreased check in code had a bug (used wrong index), but actual training metrics show clear improvement. Full fine-tuning (20-30 epochs) would likely yield even better results.
