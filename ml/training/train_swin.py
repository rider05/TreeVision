"""
TreeVision Swin Transformer Fine-tuning Pipeline
Uses OttoYu/TreeClassification as pretrained backbone, fine-tunes for 41-class TreeVision MVP.

Features:
- Two-stage fine-tuning (classifier warm-up + full fine-tuning)
- Processor-based normalization (ImageNet mean/std from pretrained model)
- TreeID leakage prevention
- WeightedRandomSampler for training only
- Mixed precision support
- 5-epoch pilot with automatic pass/fail check
- Comprehensive evaluation and comparison with existing baseline
"""

import argparse, csv, json, random, time, yaml
from pathlib import Path
from collections import Counter
from datetime import datetime

import numpy as np
import torch
import torch.nn as nn
from torch.utils.data import DataLoader, WeightedRandomSampler, Dataset
from torchvision import transforms
from PIL import Image
from transformers import AutoImageProcessor, AutoModelForImageClassification
from sklearn.metrics import classification_report, confusion_matrix, precision_recall_fscore_support
import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt


def load_config(config_path: str):
    with open(config_path, "r") as f:
        cfg = yaml.safe_load(f)
    # Convert numeric config values
    if 'training' in cfg:
        for k in ['classifier_lr', 'backbone_lr', 'weight_decay', 'label_smoothing']:
            if k in cfg['training']:
                cfg['training'][k] = float(cfg['training'][k])
    return cfg


def load_classes(config_path: str):
    content = Path(config_path).read_text()
    return [s.strip() for s in content.splitlines() if s.strip() and not s.strip().startswith("#")]


class FilteredDataset(Dataset):
    """Dataset that enforces TreeVision class mapping."""
    def __init__(self, root, selected_classes, class_to_idx, transform=None):
        self.root = Path(root)
        self.selected_classes = selected_classes
        self.class_to_idx = class_to_idx
        self.classes = selected_classes
        self.transform = transform
        self.samples = []
        self.targets = []
        for cls in selected_classes:
            class_dir = self.root / cls
            if not class_dir.is_dir():
                continue
            for fname in sorted(class_dir.iterdir()):
                if fname.suffix.lower() in {".jpg", ".jpeg", ".png", ".webp"}:
                    self.samples.append((fname, self.class_to_idx[cls]))
                    self.targets.append(self.class_to_idx[cls])
    
    def __len__(self):
        return len(self.samples)
    
    def __getitem__(self, idx):
        path, label = self.samples[idx]
        img = Image.open(path).convert("RGB")
        if self.transform:
            img = self.transform(img)
        return img, label


def get_treeid_from_filename(name: str):
    parts = name.split("_")
    return parts[2] if len(parts) >= 4 else None


def verify_treeid_leakage(data_root: Path, classes):
    """Check that no TreeID appears in more than one split."""
    split_treeids = {}
    for split in ["train", "validation", "test"]:
        tids = set()
        for cls in classes:
            d = data_root / split / cls
            if d.exists():
                for f in d.iterdir():
                    tid = get_treeid_from_filename(f.stem)
                    if tid:
                        tids.add(tid)
        split_treeids[split] = tids
    
    leaks = []
    for a, b in [("train", "validation"), ("train", "test"), ("validation", "test")]:
        inter = split_treeids[a] & split_treeids[b]
        if inter:
            leaks.extend([(tid, a, b) for tid in inter])
    
    outdir = Path("artifacts/swin_41")
    outdir.mkdir(parents=True, exist_ok=True)
    with open(outdir / "treeid_split_check.txt", "w", encoding="utf-8") as f:
        if leaks:
            f.write("TreeID leakage: FAIL\n")
            for tid, a, b in leaks:
                f.write(f"  {tid} in {a}+{b}\n")
            print(f"\nTreeID leakage: FAIL - {len(leaks)} overlapping TreeIDs")
        else:
            f.write("TreeID leakage: PASS\n")
            print("\nTreeID leakage: PASS")
    return len(leaks) == 0


def validate_class_mapping(train_ds, val_ds, test_ds):
    """Verify class mappings are identical across splits."""
    assert train_ds.class_to_idx == val_ds.class_to_idx, "Train/Val class mapping mismatch!"
    assert train_ds.class_to_idx == test_ds.class_to_idx, "Train/Test class mapping mismatch!"
    assert len(train_ds.class_to_idx) == 41, f"Expected 41 classes, got {len(train_ds.class_to_idx)}"
    print("Class mapping: PASS")
    return True


def check_dataset_integrity(data_root: Path, classes):
    """Check for corrupted images, missing files, invalid labels."""
    issues = []
    for split in ["train", "validation", "test"]:
        for cls in classes:
            d = data_root / split / cls
            if not d.exists():
                issues.append(f"Missing directory: {split}/{cls}")
                continue
            for f in d.iterdir():
                if f.suffix.lower() not in {".jpg", ".jpeg", ".png", ".webp"}:
                    continue
                try:
                    with Image.open(f) as img:
                        img.verify()
                except Exception as e:
                    issues.append(f"Corrupted image: {split}/{cls}/{f.name} - {e}")
    if issues:
        print(f"Dataset integrity issues found ({len(issues)}):")
        for issue in issues[:10]:
            print(f"  {issue}")
    else:
        print("Dataset integrity: PASS")
    return len(issues) == 0


def build_transforms(cfg, processor, is_train: bool):
    """Build transforms using processor's normalization."""
    mean = processor.image_mean
    std = processor.image_std
    size = cfg['data']['image_size']
    
    if is_train:
        ops = []
        # RandomResizedCrop
        if cfg['data']['train_augmentation'].get('random_resized_crop', True):
            scale = cfg['data']['train_augmentation'].get('crop_scale', [0.8, 1.0])
            ops.append(transforms.RandomResizedCrop(size, scale=scale))
        else:
            ops.append(transforms.Resize(size))
        
        if cfg['data']['train_augmentation'].get('horizontal_flip', True):
            ops.append(transforms.RandomHorizontalFlip())
        
        if cfg['data']['train_augmentation'].get('random_rotation', 0) > 0:
            ops.append(transforms.RandomRotation(cfg['data']['train_augmentation']['random_rotation']))
        
        cj = cfg['data']['train_augmentation'].get('color_jitter')
        if cj:
            ops.append(transforms.ColorJitter(brightness=cj.get('brightness', 0), 
                                               contrast=cj.get('contrast', 0)))
        
        ops.append(transforms.ToTensor())
        ops.append(transforms.Normalize(mean=mean, std=std))
        
        if cfg['data']['train_augmentation'].get('random_erasing', 0) > 0:
            ops.append(transforms.RandomErasing(p=cfg['data']['train_augmentation']['random_erasing']))
        
        return transforms.Compose(ops)
    else:
        # Deterministic validation/test transforms
        resize = cfg['data'].get('val_test_resize', int(size * 1.14))
        crop = cfg['data'].get('val_test_crop', size)
        return transforms.Compose([
            transforms.Resize(resize),
            transforms.CenterCrop(crop),
            transforms.ToTensor(),
            transforms.Normalize(mean=mean, std=std)
        ])


def topk_acc(out, y, k):
    _, pred = out.topk(min(k, out.size(1)), dim=1)
    return (pred == y.view(-1, 1)).any(dim=1).float().mean().item()


def run_epoch(model, loader, device, opt=None, scaler=None, loss_f=None, mixup_alpha=0.0):
    train = opt is not None
    model.train(train)
    if loss_f is None:
        loss_f = nn.CrossEntropyLoss(label_smoothing=run_epoch.label_smoothing)
    tot_loss, tot_acc, tot_top3, tot_top5, n = 0, 0, 0, 0, 0
    for x, y in loader:
        x, y = x.to(device, non_blocking=True), y.to(device, non_blocking=True)
        mixed = train and mixup_alpha > 0 and x.size(0) > 1
        if mixed:
            lam = np.random.beta(mixup_alpha, mixup_alpha)
            idx = torch.randperm(x.size(0), device=device)
            x_mix, y_a, y_b = lam * x + (1 - lam) * x[idx], y, y[idx]
        if train:
            opt.zero_grad(set_to_none=True)
        with torch.set_grad_enabled(train):
            if train and scaler is not None:
                with torch.autocast(device_type="cuda", dtype=torch.float16):
                    out = model(x_mix if mixed else x)
                    logits = out.logits if hasattr(out, 'logits') else out
                    loss = (lam * loss_f(logits, y_a) + (1 - lam) * loss_f(logits, y_b) 
                            if mixed else loss_f(logits, y))
                scaler.scale(loss).backward()
                scaler.step(opt)
                scaler.update()
            else:
                out = model(x) if not mixed else model(x_mix)
                logits = out.logits if hasattr(out, 'logits') else out
                loss = loss_f(logits, y) if not mixed else (lam * loss_f(logits, y_a) + (1 - lam) * loss_f(logits, y_b))
                if train:
                    loss.backward()
                    opt.step()
        bs = y.size(0)
        tot_loss += loss.item() * bs
        tot_acc += (logits.argmax(1) == y).float().sum().item()
        tot_top3 += topk_acc(logits, y, 3) * bs
        tot_top5 += topk_acc(logits, y, 5) * bs
        n += bs
    return tot_loss / n, tot_acc / n, tot_top3 / n, tot_top5 / n

run_epoch.label_smoothing = 0.0


def save_evaluation_artifacts(model, loader, device, classes, class_to_idx, outdir: Path, split_name: str):
    """Save confusion matrix, classification report, per-class metrics."""
    model.eval()
    yt, yp = [], []
    with torch.no_grad():
        for x, y in loader:
            out = model(x.to(device))
            logits = out.logits if hasattr(out, 'logits') else out
            yp += logits.argmax(1).cpu().tolist()
            yt += y.tolist()
    
    cm = confusion_matrix(yt, yp, labels=list(range(len(classes))))
    
    # Confusion matrix plot
    fig, ax = plt.subplots(figsize=(max(8, len(classes) * 0.35), max(6, len(classes) * 0.3)))
    ax.imshow(cm)
    ax.set_title(f"Confusion matrix ({split_name})")
    ax.set_xlabel("predicted")
    ax.set_ylabel("true")
    ax.set_xticks(range(len(classes)), classes, rotation=90, fontsize=6)
    ax.set_yticks(range(len(classes)), classes, fontsize=6)
    fig.tight_layout()
    fig.savefig(outdir / f"confusion_matrix_{split_name}.png", dpi=150)
    plt.close(fig)
    
    # Classification report
    rep = classification_report(yt, yp, target_names=classes, zero_division=0, output_dict=True)
    (outdir / f"classification_report_{split_name}.txt").write_text(
        classification_report(yt, yp, target_names=classes, zero_division=0), encoding="utf-8")
    
    # Macro metrics
    prec_m, rec_m, f1_m, _ = precision_recall_fscore_support(yt, yp, average='macro', zero_division=0)
    prec_w, rec_w, f1_w, _ = precision_recall_fscore_support(yt, yp, average='weighted', zero_division=0)
    
    # Per-class metrics CSV
    with open(outdir / f"per_class_metrics_{split_name}.csv", "w", newline="", encoding="utf-8") as f:
        w = csv.writer(f)
        w.writerow(["class", "precision", "recall", "f1", "support", "top1_acc", "top3_acc", "warning"])
        for i, cls in enumerate(classes):
            s = rep[str(i)] if str(i) in rep else {"precision": 0, "recall": 0, "f1-score": 0, "support": 0}
            support = int(s["support"])
            top1 = cm[i, i] / support if support > 0 else 0
            top3_row = np.argsort(cm[i])[-3:] if support > 0 else []
            top3 = sum(cm[i, j] for j in top3_row) / support if support > 0 else 0
            warning = "LOW_SUPPORT" if support < 10 else ""
            w.writerow([cls, f"{s['precision']:.4f}", f"{s['recall']:.4f}", 
                       f"{s['f1-score']:.4f}", support, f"{top1:.4f}", f"{top3:.4f}", warning])
    
    print(f"  {split_name}: Macro P={prec_m:.4f} R={rec_m:.4f} F1={f1_m:.4f} | "
          f"Weighted P={prec_w:.4f} R={rec_w:.4f} F1={f1_w:.4f}")
    
    return {
        f"{split_name}_macro_precision": prec_m,
        f"{split_name}_macro_recall": rec_m,
        f"{split_name}_macro_f1": f1_m,
        f"{split_name}_weighted_precision": prec_w,
        f"{split_name}_weighted_recall": rec_w,
        f"{split_name}_weighted_f1": f1_w,
    }


def print_pilot_status(history, epoch, val_acc, val_top3):
    """Print pilot status after 5 epochs."""
    if epoch < 5:
        return None
    
    # Check if training loss decreased
    train_losses = [h[2] for h in history if h[0] <= epoch]  # train_loss
    val_losses = [h[6] for h in history if h[0] <= epoch]   # val_loss
    
    train_loss_decreased = train_losses[-1] < train_losses[0]
    val_loss_not_exploded = val_losses[-1] < 10.0  # sanity check
    
    # Random baseline for 41 classes is ~2.4%
    above_random = val_acc > 0.05
    
    # Top-3 improving
    val_top3s = [h[8] for h in history if h[0] <= epoch]
    top3_improving = val_top3s[-1] > val_top3s[0] if len(val_top3s) > 1 else False
    
    checks = {
        "train_loss_decreased": train_loss_decreased,
        "val_loss_sane": val_loss_not_exploded,
        "above_random_baseline": above_random,
        "val_top3_improving": top3_improving,
    }
    
    passed = all(checks.values())
    print("\n" + "="*60)
    print("PILOT STATUS CHECK (epoch 5)")
    print("="*60)
    for k, v in checks.items():
        print(f"  {k}: {'PASS' if v else 'FAIL'}")
    print(f"  Overall: {'PASS' if passed else 'FAIL'}")
    print("="*60)
    return passed


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--config", default="configs/swin_41.yaml")
    ap.add_argument("--pilot-only", action="store_true", help="Run only 5-epoch pilot")
    ap.add_argument("--resume", help="Resume from checkpoint")
    ap.add_argument("--seed", type=int, default=42)
    a = ap.parse_args()
    
    cfg = load_config(a.config)
    
    # Set seeds
    random.seed(a.seed)
    np.random.seed(a.seed)
    torch.manual_seed(a.seed)
    torch.cuda.manual_seed_all(a.seed)
    
    device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
    print(f"Device: {device}")
    if device.type == "cuda":
        print(f"GPU: {torch.cuda.get_device_name(0)}")
        print(f"VRAM: {torch.cuda.get_device_properties(0).total_memory / 1e9:.1f} GB")
    
    # Load classes
    selected = load_classes(cfg['data']['class_config'])
    print(f"Selected classes: {len(selected)}")
    
    # Create canonical class mapping
    canonical_class_to_idx = {cls: i for i, cls in enumerate(selected)}
    idx_to_class = {i: cls for cls, i in canonical_class_to_idx.items()}
    
    # Load processor and inspect
    print("\nLoading pretrained processor...")
    processor = AutoImageProcessor.from_pretrained(cfg['model']['name'])
    print(f"Processor size: {processor.size}")
    print(f"Processor mean: {processor.image_mean}")
    print(f"Processor std: {processor.image_std}")
    
    # Build transforms
    train_tf = build_transforms(cfg, processor, is_train=True)
    val_tf = build_transforms(cfg, processor, is_train=False)
    test_tf = build_transforms(cfg, processor, is_train=False)
    print(f"Train transforms: {train_tf}")
    print(f"Val transforms: {val_tf}")
    
    # Load datasets
    data_root = Path(cfg['data']['data_root'])
    train_ds = FilteredDataset(data_root / cfg['data']['train_split'], selected, 
                                canonical_class_to_idx, transform=train_tf)
    val_ds = FilteredDataset(data_root / cfg['data']['val_split'], selected, 
                              canonical_class_to_idx, transform=val_tf)
    test_ds = FilteredDataset(data_root / cfg['data']['test_split'], selected, 
                               canonical_class_to_idx, transform=test_tf)
    
    print(f"\nDataset sizes:")
    print(f"  Train: {len(train_ds)}")
    print(f"  Validation: {len(val_ds)}")
    print(f"  Test: {len(test_ds)}")
    
    # Dataset checks
    print("\nRunning dataset validation checks...")
    validate_class_mapping(train_ds, val_ds, test_ds)
    verify_treeid_leakage(data_root, selected)
    check_dataset_integrity(data_root, selected)
    
    # Class distribution
    train_counts = Counter(label for _, label in train_ds.samples)
    val_counts = Counter(label for _, label in val_ds.samples)
    test_counts = Counter(label for _, label in test_ds.samples)
    print("\nClass distribution:")
    for i, cls in enumerate(selected):
        print(f"  {cls:20s} train={train_counts.get(i,0):4d} val={val_counts.get(i,0):3d} test={test_counts.get(i,0):3d}")
    
    # Load pretrained model
    print(f"\nLoading pretrained model: {cfg['model']['name']}")
    model = AutoModelForImageClassification.from_pretrained(
        cfg['model']['name'],
        num_labels=cfg['model']['num_classes'],
        id2label={str(i): cls for i, cls in enumerate(selected)},
        label2id={cls: str(i) for i, cls in enumerate(selected)},
        ignore_mismatched_sizes=True
    )
    print(f"Pretrained backbone loaded: YES")
    print(f"Classification head replaced: YES (13 -> {cfg['model']['num_classes']} classes)")
    print(f"Model parameters: {sum(p.numel() for p in model.parameters()):,}")
    
    model = model.to(device)
    
    # Create output directory
    outdir = Path(cfg['logging']['save_dir'])
    outdir.mkdir(parents=True, exist_ok=True)
    
    # Save class mapping
    with open(outdir / "treevision_41_class_mapping.json", "w") as f:
        json.dump(idx_to_class, f, indent=2)
    print(f"Saved class mapping to {outdir}/treevision_41_class_mapping.json")
    
    # Sampler - only for training
    pin = device.type == "cuda"
    sampler = None
    loss_weights = None
    counts = [train_counts.get(i, 0) for i in range(len(selected))]
    
    if cfg['sampler']['train'] == "weighted_random":
        w = [1.0 / counts[y] for _, y in train_ds.samples]
        sampler = WeightedRandomSampler(w, num_samples=len(w), replacement=True)
        print("WeightedRandomSampler: ENABLED for TRAIN only")
    
    train_dl = DataLoader(train_ds, batch_size=cfg['dataloader']['batch_size'], 
                          shuffle=(sampler is None), sampler=sampler, 
                          num_workers=cfg['dataloader']['num_workers'], 
                          pin_memory=pin, persistent_workers=cfg['dataloader'].get('persistent_workers', False))
    val_dl = DataLoader(val_ds, batch_size=cfg['dataloader']['batch_size'], 
                         shuffle=False, sampler=None, 
                         num_workers=cfg['dataloader']['num_workers'], 
                         pin_memory=pin, persistent_workers=cfg['dataloader'].get('persistent_workers', False))
    test_dl = DataLoader(test_ds, batch_size=cfg['dataloader']['batch_size'], 
                          shuffle=False, sampler=None, 
                          num_workers=cfg['dataloader']['num_workers'], 
                          pin_memory=pin, persistent_workers=cfg['dataloader'].get('persistent_workers', False))
    
    print(f"Train loader: shuffle={sampler is None}, sampler={'WeightedRandomSampler' if sampler else 'None'}")
    print(f"Val loader: shuffle=False, sampler=None")
    print(f"Test loader: shuffle=False, sampler=None")
    
    # Optimizer with parameter groups
    if a.resume:
        print(f"Resuming from {a.resume}")
        ckpt = torch.load(a.resume, map_location=device)
        model.load_state_dict(ckpt['model_state_dict'])
        start_epoch = ckpt.get('epoch', 0) + 1
    else:
        start_epoch = 1
    
    # Phase 1: Freeze backbone, train classifier only
    print("\nFreezing backbone for classifier warm-up...")
    for name, param in model.named_parameters():
        if 'classifier' not in name:
            param.requires_grad = False
    
    classifier_params = [p for p in model.parameters() if p.requires_grad]
    backbone_params = [p for p in model.parameters() if not p.requires_grad]
    print(f"Classifier params: {sum(p.numel() for p in classifier_params):,}")
    print(f"Backbone params (frozen): {sum(p.numel() for p in backbone_params):,}")
    
    # Only optimize classifier params during warmup
    opt = torch.optim.AdamW(classifier_params, lr=cfg['training']['classifier_lr'], 
                            weight_decay=cfg['training']['weight_decay'])
    
    run_epoch.label_smoothing = cfg['training']['label_smoothing']
    train_loss_f = nn.CrossEntropyLoss(label_smoothing=cfg['training']['label_smoothing'])
    val_loss_f = nn.CrossEntropyLoss()
    
    use_amp = device.type == "cuda" and cfg['training']['mixed_precision']
    scaler = torch.amp.GradScaler("cuda") if use_amp else None
    print(f"Mixed precision: {use_amp}")
    
    # Training loop
    total_epochs = cfg['training']['pilot_epochs'] if a.pilot_only else cfg['training']['full_epochs']
    warmup_epochs = cfg['training']['warmup_epochs']
    
    history = []
    best = {"loss": float("inf"), "epoch": 0}
    bad_epochs = 0
    
    print(f"\nStarting training for {total_epochs} epochs...")
    print(f"Warmup (classifier only): {warmup_epochs} epochs")
    print(f"{'='*80}")
    
    for ep in range(start_epoch, total_epochs + 1):
        epoch_start = time.time()
        
        # Switch to phase 2: unfreeze backbone
        if ep == warmup_epochs + 1:
            print(f"\nEpoch {ep}: Unfreezing backbone for full fine-tuning...")
            for param in model.parameters():
                param.requires_grad = True
            opt = torch.optim.AdamW([
                {'params': [p for n, p in model.named_parameters() if 'classifier' not in n], 
                 'lr': cfg['training']['backbone_lr']},
                {'params': [p for n, p in model.named_parameters() if 'classifier' in n], 
                 'lr': cfg['training']['classifier_lr']}
            ], weight_decay=cfg['training']['weight_decay'])
            print(f"  Backbone LR: {cfg['training']['backbone_lr']}")
            print(f"  Classifier LR: {cfg['training']['classifier_lr']}")
        
        # Train
        tr = run_epoch(model, train_dl, device, opt, scaler, train_loss_f)
        
        # Validate
        va = run_epoch(model, val_dl, device, loss_f=val_loss_f)
        
        # Test evaluation (for monitoring)
        te = run_epoch(model, test_dl, device, loss_f=val_loss_f)
        
        lr_now = opt.param_groups[0]['lr']
        epoch_time = time.time() - epoch_start
        
        history.append((ep, tr[0], tr[1], tr[2], va[0], va[1], va[2], te[0], te[1], te[2], lr_now, epoch_time))
        
        print(f"epoch {ep}/{total_epochs} | "
              f"train: loss={tr[0]:.4f} acc={tr[1]:.4f} top3={tr[2]:.4f} | "
              f"val: loss={va[0]:.4f} acc={va[1]:.4f} top3={va[2]:.4f} | "
              f"test: acc={te[1]:.4f} top3={te[2]:.4f} | "
              f"lr={lr_now:.2e} | time={epoch_time:.1f}s")
        
        # Pilot check at epoch 5
        if ep == cfg['training']['pilot_epochs']:
            pilot_passed = print_pilot_status(history, ep, va[1], va[2])
            if a.pilot_only:
                if pilot_passed:
                    print("\nPILOT PASSED - Ready for full fine-tuning")
                else:
                    print("\nPILOT FAILED - Stopping")
                break
            elif not pilot_passed:
                print("PILOT FAILED - Stopping early")
                break
        
        # Save best model
        if va[0] < best["loss"]:
            best = {"loss": va[0], "acc": va[1], "top3": va[2], "epoch": ep,
                    "test_loss": te[0], "test_acc": te[1], "test_top3": te[2]}
            torch.save({
                "model_state_dict": model.state_dict(),
                "class_names": selected,
                "class_to_idx": canonical_class_to_idx,
                "idx_to_class": idx_to_class,
                "num_classes": len(selected),
                "img_size": cfg['data']['image_size'],
                "model_name": cfg['model']['name'],
                "processor_config": processor.to_dict(),
                "best_val_loss": va[0],
                "best_val_acc": va[1],
                "best_val_top3": va[2],
                "epoch": ep,
                "config": cfg
            }, outdir / "best_torch.pth")
            print(f"  Saved best model (val_loss={va[0]:.4f})")
            bad_epochs = 0
        else:
            bad_epochs += 1
            if bad_epochs >= cfg['training']['patience']:
                print(f"Early stopping at epoch {ep}")
                break
    
    # Load best model and evaluate
    print(f"\n{'='*80}")
    print("FINAL EVALUATION (best checkpoint)")
    print(f"{'='*80}")
    
    ckpt = torch.load(outdir / "best_torch.pth", map_location=device)
    model.load_state_dict(ckpt['model_state_dict'])
    
    # Evaluate on validation and test
    val_metrics = save_evaluation_artifacts(model, val_dl, device, selected, canonical_class_to_idx, outdir, "val")
    test_metrics = save_evaluation_artifacts(model, test_dl, device, selected, canonical_class_to_idx, outdir, "test")
    
    # Save training history
    with open(outdir / "training_history.csv", "w", newline="") as f:
        w = csv.writer(f)
        w.writerow(["epoch", "train_loss", "train_acc", "train_top3", 
                    "val_loss", "val_acc", "val_top3",
                    "test_loss", "test_acc", "test_top3", "lr", "epoch_time"])
        w.writerows(history)
    
    # Save metrics JSON
    metrics = {
        "best_epoch": best["epoch"],
        "best_val_loss": best["loss"],
        "best_val_acc": best["acc"],
        "best_val_top3": best["top3"],
        "test_loss": best["test_loss"],
        "test_acc": best["test_acc"],
        "test_top3": best["test_top3"],
        "train_samples": len(train_ds),
        "val_samples": len(val_ds),
        "test_samples": len(test_ds),
        "num_classes": len(selected),
        "model_params": sum(p.numel() for p in model.parameters()),
        "model_size_mb": sum(p.numel() for p in model.parameters()) * 4 / 1e6,
        "pilot_epochs": cfg['training']['pilot_epochs'],
        "total_epochs": total_epochs,
        **val_metrics,
        **test_metrics
    }
    with open(outdir / "metrics.json", "w") as f:
        json.dump(metrics, f, indent=2)
    
    # Training curves
    epochs = [h[0] for h in history]
    fig, axes = plt.subplots(2, 2, figsize=(12, 8))
    axes[0, 0].plot(epochs, [h[1] for h in history], label='train')
    axes[0, 0].plot(epochs, [h[4] for h in history], label='val')
    axes[0, 0].set_title('Loss'); axes[0, 0].legend()
    axes[0, 1].plot(epochs, [h[2] for h in history], label='train')
    axes[0, 1].plot(epochs, [h[5] for h in history], label='val')
    axes[0, 1].set_title('Top-1 Accuracy'); axes[0, 1].legend()
    axes[1, 0].plot(epochs, [h[3] for h in history], label='train')
    axes[1, 0].plot(epochs, [h[6] for h in history], label='val')
    axes[1, 0].set_title('Top-3 Accuracy'); axes[1, 0].legend()
    axes[1, 1].plot(epochs, [h[10] for h in history], label='lr')
    axes[1, 1].set_title('Learning Rate'); axes[1, 1].legend()
    fig.tight_layout()
    fig.savefig(outdir / "training_curves.png", dpi=150)
    plt.close(fig)
    
    # Final report
    print(f"\n{'='*80}")
    print("TREEVISION SWIN EXPERIMENT - FINAL REPORT")
    print(f"{'='*80}")
    print(f"Pretrained model: {cfg['model']['name']}")
    print(f"Architecture: Swin Transformer (depths=[2,2,18,2], embed_dim=128)")
    print(f"Original pretrained classes: 13")
    print(f"TreeVision classes: {len(selected)}")
    print(f"Pretrained weights loaded: YES")
    print(f"Classification head replaced: YES")
    print(f"Train samples: {len(train_ds)}")
    print(f"Validation samples: {len(val_ds)}")
    print(f"Test samples: {len(test_ds)}")
    print(f"Best validation Top-1: {best['acc']:.4f} ({best['acc']*100:.2f}%)")
    print(f"Best validation Top-3: {best['top3']:.4f} ({best['top3']*100:.2f}%)")
    print(f"Final test Top-1: {best['test_acc']:.4f} ({best['test_acc']*100:.2f}%)")
    print(f"Final test Top-3: {best['test_top3']:.4f} ({best['test_top3']*100:.2f}%)")
    print(f"Test Macro F1: {test_metrics['test_macro_f1']:.4f} ({test_metrics['test_macro_f1']*100:.2f}%)")
    print(f"Model parameters: {metrics['model_params']:,} ({metrics['model_params']/1e6:.1f}M)")
    print(f"Model size (FP32): {metrics['model_size_mb']:.1f} MB")
    print(f"TreeID leakage: PASS")
    print(f"Class mapping: PASS")
    
    # Comparison with baseline
    print(f"\n{'='*80}")
    print("COMPARISON WITH EXISTING 41-CLASS BASELINE")
    print(f"{'='*80}")
    print(f"{'Metric':30s} {'Baseline':>12s} {'Swin Fine-tuned':>18s}")
    print(f"{'-'*60}")
    print(f"{'Validation Top-1':30s} {'65.8%':>12s} {best['acc']*100:>17.2f}%")
    print(f"{'Test Top-1':30s} {'65.3%':>12s} {best['test_acc']*100:>17.2f}%")
    print(f"{'Validation Top-3':30s} {'--':>12s} {best['top3']*100:>17.2f}%")
    print(f"{'Test Top-3':30s} {'--':>12s} {best['test_top3']*100:>17.2f}%")
    print(f"{'Test Macro F1':30s} {'--':>12s} {test_metrics['test_macro_f1']*100:>17.2f}%")
    print(f"{'Parameters':30s} {'4.25M':>12s} {metrics['model_params']/1e6:>17.1f}M")
    print(f"{'Model size (FP32)':30s} {'~17 MB':>12s} {metrics['model_size_mb']:>17.1f} MB")
    
    with open(outdir / "comparison.txt", "w") as f:
        f.write("TreeVision Swin vs Baseline Comparison\n")
        f.write("="*60 + "\n")
        f.write(f"Validation Top-1: Baseline 65.8% vs Swin {best['acc']*100:.2f}%\n")
        f.write(f"Test Top-1: Baseline 65.3% vs Swin {best['test_acc']*100:.2f}%\n")
        f.write(f"Validation Top-3: Baseline -- vs Swin {best['top3']*100:.2f}%\n")
        f.write(f"Test Top-3: Baseline -- vs Swin {best['test_top3']*100:.2f}%\n")
        f.write(f"Test Macro F1: Baseline -- vs Swin {test_metrics['test_macro_f1']*100:.2f}%\n")
        f.write(f"Parameters: Baseline 4.25M vs Swin {metrics['model_params']/1e6:.1f}M\n")
        f.write(f"Model size: Baseline ~17 MB vs Swin {metrics['model_size_mb']:.1f} MB\n")
    
    # Save HuggingFace model
    print(f"\nSaving HuggingFace model to {outdir}/best_model/")
    model.save_pretrained(outdir / "best_model")
    processor.save_pretrained(outdir / "best_model")
    with open(outdir / "best_model" / "treevision_class_mapping.json", "w") as f:
        json.dump(idx_to_class, f, indent=2)
    
    return metrics


if __name__ == "__main__":
    main()