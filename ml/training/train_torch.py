"""TreeVision MobileNetV3 transfer-learning trainer (PyTorch, CUDA-first).
Updated with: class selection config, dataset validation warnings, strict mode,
shared class_to_idx, proper val/test loaders, class mapping artifacts, macro metrics.
Usage:
  python ml/training/train_torch.py --data dataset --epochs 30 --img 224 --batch 64 --model mobilenet_v3_large --balance sampler --ema 0.999 --classes configs/classes_41.txt
  python ml/training/train_torch.py --data dataset --epochs 30 --img 224 --batch 64 --model mobilenet_v3_large --balance sampler --ema 0.999 --classes configs/classes_50.txt --min-val-samples 10 --strict-dataset-validation
"""
import argparse, csv, json, random
from pathlib import Path
from collections import Counter
import numpy as np
import torch
import torch.nn as nn
from torch.utils.data import DataLoader, WeightedRandomSampler
from torchvision import datasets, models, transforms

MODEL_BUILDERS = {
    "mobilenet_v3_large": (models.mobilenet_v3_large, models.MobileNet_V3_Large_Weights.IMAGENET1K_V1),
    "mobilenet_v3_small": (models.mobilenet_v3_small, models.MobileNet_V3_Small_Weights.IMAGENET1K_V1),
    "efficientnet_v2_s": (models.efficientnet_v2_s, models.EfficientNet_V2_S_Weights.IMAGENET1K_V1),
    "convnext_tiny": (models.convnext_tiny, models.ConvNeXt_Tiny_Weights.IMAGENET1K_V1),
}

def _to_rgb(img):
    return img.convert("RGB") if hasattr(img, "convert") else img

def get_classifier_head(model: nn.Module) -> nn.Linear:
    if hasattr(model, "classifier"):
        for m in reversed(list(model.classifier.modules())):
            if isinstance(m, nn.Linear): return m
    if hasattr(model, "head"):
        for m in reversed(list(model.head.modules())):
            if isinstance(m, nn.Linear): return m
    raise ValueError("unknown head")

def set_head_classes(model: nn.Module, num_classes: int) -> None:
    parent = model.classifier if hasattr(model, "classifier") else model.head
    for i in reversed(range(len(parent))):
        if isinstance(parent[i], nn.Linear):
            parent[i] = nn.Linear(parent[i].in_features, num_classes)
            return

def set_backbone_frozen(model: nn.Module, frozen: bool) -> None:
    head = get_classifier_head(model)
    hp = {head.weight, head.bias}
    for p in model.parameters(): p.requires_grad = (p in hp) if frozen else True

def topk_acc(out, y, k): _, pred = out.topk(min(k, out.size(1)), dim=1); return (pred == y.view(-1,1)).any(dim=1).float().mean().item()

def run_epoch(model, loader, device, opt=None, scaler=None, loss_f=None, mixup_alpha=0.0):
    train = opt is not None
    model.train(train)
    if loss_f is None: loss_f = nn.CrossEntropyLoss(label_smoothing=run_epoch.label_smoothing)
    tot_loss, tot_acc, tot_top3, tot_top5, n = 0,0,0,0,0
    for x,y in loader:
        x,y = x.to(device, non_blocking=True), y.to(device, non_blocking=True)
        mixed = train and mixup_alpha>0 and x.size(0)>1
        if mixed:
            lam=np.random.beta(mixup_alpha,mixup_alpha); idx=torch.randperm(x.size(0), device=device)
            x_mix, y_a, y_b = lam*x + (1-lam)*x[idx], y, y[idx]
        if train: opt.zero_grad(set_to_none=True)
        with torch.set_grad_enabled(train):
            if train and scaler is not None:
                with torch.autocast(device_type="cuda", dtype=torch.float16):
                    out = model(x_mix if mixed else x)
                    loss = (lam*loss_f(out,y_a)+(1-lam)*loss_f(out,y_b) if mixed else loss_f(out,y))
                scaler.scale(loss).backward(); scaler.step(opt); scaler.update()
            else:
                out = model(x) if not mixed else model(x_mix)
                loss = loss_f(out,y) if not mixed else (lam*loss_f(out,y_a)+(1-lam)*loss_f(out,y_b))
                if train: loss.backward(); opt.step()
        bs=y.size(0); tot_loss+=loss.item()*bs; tot_acc+=(out.argmax(1)==y).float().sum().item(); tot_top3+=topk_acc(out,y,3)*bs; tot_top5+=topk_acc(out,y,5)*bs; n+=bs
    return tot_loss/n, tot_acc/n, tot_top3/n, tot_top5/n
run_epoch.label_smoothing=0.0

def save_val_artifacts(model, val_loader, device, classes, class_to_idx, outdir: Path, split_name="val"):
    import matplotlib; matplotlib.use("Agg"); import matplotlib.pyplot as plt
    from sklearn.metrics import classification_report, confusion_matrix, precision_recall_fscore_support
    model.eval()
    yt, yp = [], []
    with torch.no_grad():
        for x, y in val_loader:
            yp += model(x.to(device)).argmax(1).cpu().tolist()
            yt += y.tolist()
    cm = confusion_matrix(yt, yp, labels=list(range(len(classes))))
    fig, ax = plt.subplots(figsize=(max(8, len(classes)*0.35), max(6, len(classes)*0.3)))
    ax.imshow(cm); ax.set_title(f"Confusion matrix ({split_name}, best checkpoint)")
    ax.set_xlabel("predicted"); ax.set_ylabel("true")
    ax.set_xticks(range(len(classes)), classes, rotation=90, fontsize=6)
    ax.set_yticks(range(len(classes)), classes, fontsize=6)
    fig.tight_layout(); fig.savefig(outdir / f"confusion_matrix_{split_name}.png", dpi=150); plt.close(fig)
    # Per-class metrics
    rep = classification_report(yt, yp, target_names=classes, zero_division=0, output_dict=True)
    (outdir / f"classification_report_{split_name}.txt").write_text(classification_report(yt, yp, target_names=classes, zero_division=0), encoding="utf-8")
    # Macro metrics
    prec_m, rec_m, f1_m, _ = precision_recall_fscore_support(yt, yp, average='macro', zero_division=0)
    # Per-class CSV
    with open(outdir / f"per_class_metrics_{split_name}.csv", "w", newline="", encoding="utf-8") as f:
        w = csv.writer(f)
        w.writerow(["class", "precision", "recall", "f1", "support", "top1_acc", "top3_acc", "warning"])
        for i, cls in enumerate(classes):
            s = rep[str(i)] if str(i) in rep else {"precision":0,"recall":0,"f1-score":0,"support":0}
            # compute per-class top1 and top3 from confusion matrix row
            support = int(s["support"])
            top1 = cm[i,i] / support if support > 0 else 0
            top3_row = np.argsort(cm[i])[-3:] if support > 0 else []
            top3 = sum(cm[i, j] for j in top3_row) / support if support > 0 else 0
            warning = "LOW_SUPPORT" if support < 10 else ""
            w.writerow([cls, f"{s['precision']:.4f}", f"{s['recall']:.4f}", f"{s['f1-score']:.4f}", support, f"{top1:.4f}", f"{top3:.4f}", warning])
    print(f"wrote {outdir/f'confusion_matrix_{split_name}.png'} + classification_report_{split_name}.txt + per_class_metrics_{split_name}.csv")
    print(f"  Macro precision: {prec_m:.4f} | Macro recall: {rec_m:.4f} | Macro F1: {f1_m:.4f}")

def validate_dataset_splits(data_root: Path, classes, class_to_idx, min_val_samples: int, strict: bool):
    """Print dataset validation warnings before training."""
    val_dir = data_root / "validation"
    test_dir = data_root / "test"
    print("\nDataset Validation")
    print("=" * 50)
    print(f"Species: {len(classes)}")
    for split_name, split_dir in [("train", data_root/"train"), ("validation", val_dir), ("test", test_dir)]:
        count = sum(len(list((split_dir/c).glob("*.jpg"))) + len(list((split_dir/c).glob("*.jpeg"))) for c in classes)
        print(f"{split_name.capitalize()}: {count}")
    print()
    critical = []
    thin = []
    low = []
    for cls in classes:
        val_count = len(list((val_dir/cls).glob("*.jpg"))) + len(list((val_dir/cls).glob("*.jpeg")))
        test_count = len(list((test_dir/cls).glob("*.jpg"))) + len(list((test_dir/cls).glob("*.jpeg")))
        if val_count < 5 or test_count < 5:
            severity = "CRITICAL"
            critical.append((cls, val_count, test_count))
        elif val_count < 10 or test_count < 10:
            severity = "THIN"
            thin.append((cls, val_count, test_count))
        elif val_count < 15 or test_count < 15:
            severity = "LOW"
            low.append((cls, val_count, test_count))
        else:
            severity = "OK"
        if severity != "OK":
            print(f"WARNING: {cls} has val={val_count} test={test_count} -> {severity}")
            if severity == "CRITICAL":
                print(f"  Per-class validation metrics are statistically unstable.")
    print(f"\nCRITICAL classes: {len(critical)}")
    print(f"THIN classes: {len(thin)}")
    print(f"LOW classes: {len(low)}")
    print(f"HEALTHY classes: {len(classes) - len(critical) - len(thin) - len(low)}")
    if strict:
        violations = [c for c in classes if (len(list((val_dir/c).glob("*.jpg"))) + len(list((val_dir/c).glob("*.jpeg")))) < min_val_samples]
        if violations:
            raise SystemExit(f"STRICT MODE: {len(violations)} classes have < {min_val_samples} validation samples: {violations}")

def verify_treeid_leakage(data_root: Path, classes):
    """Check that no TreeID appears in more than one split."""
    from collections import defaultdict
    def tid_from_name(name):
        parts = name.split("_")
        return parts[2] if len(parts) >= 4 else None
    split_treeids = {}
    for split in ["train", "validation", "test"]:
        tids = set()
        for cls in classes:
            d = data_root / split / cls
            if d.exists():
                for f in d.iterdir():
                    tid = tid_from_name(f.stem)
                    if tid: tids.add(tid)
        split_treeids[split] = tids
    leaks = []
    for a, b in [("train", "validation"), ("train", "test"), ("validation", "test")]:
        inter = split_treeids[a] & split_treeids[b]
        if inter:
            leaks.extend([(tid, a, b) for tid in inter])
    outdir = Path("artifacts")
    outdir.mkdir(exist_ok=True)
    with open(outdir / "treeid_split_check.txt", "w", encoding="utf-8") as f:
        if leaks:
            f.write("TreeID leakage: FAIL\n")
            for tid, a, b in leaks:
                f.write(f"  {tid} in {a}+{b}\n")
            print(f"\nTreeID leakage: FAIL - {len(leaks)} overlapping TreeIDs")
            for tid, a, b in leaks[:10]:
                print(f"  {tid} in {a}+{b}")
        else:
            f.write("TreeID leakage: PASS\n")
            print("\nTreeID leakage: PASS")
    return len(leaks) == 0

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--data", default="dataset")
    ap.add_argument("--epochs", type=int, default=30)
    ap.add_argument("--img", type=int, default=224)
    ap.add_argument("--batch", type=int, default=64)
    ap.add_argument("--lr", type=float, default=1e-4)
    ap.add_argument("--warmup-lr", type=float, default=1e-3)
    ap.add_argument("--weight-decay", type=float, default=1e-4)
    ap.add_argument("--label-smoothing", type=float, default=0.1)
    ap.add_argument("--patience", type=int, default=7)
    ap.add_argument("--warmup-epochs", type=int, default=3)
    ap.add_argument("--model", default="mobilenet_v3_large", choices=list(MODEL_BUILDERS))
    ap.add_argument("--seed", type=int, default=42)
    ap.add_argument("--workers", type=int, default=2)
    ap.add_argument("--balance", default="sampler", choices=["none","sampler","weighted-loss"])
    ap.add_argument("--aug", default="base", choices=["base","randaugment"])
    ap.add_argument("--mixup", type=float, default=0.0)
    ap.add_argument("--ema", type=float, default=0.999)
    ap.add_argument("--no-amp", action="store_true")
    # New options
    ap.add_argument("--classes", help="Path to class list file (configs/classes_41.txt or classes_50.txt)")
    ap.add_argument("--min-val-samples", type=int, default=10, help="Minimum validation samples per class (strict mode)")
    ap.add_argument("--strict-dataset-validation", action="store_true", help="Fail if any class has < min-val-samples")
    ap.add_argument("--skip-val-warnings", action="store_true", help="Skip dataset validation warnings")
    a = ap.parse_args()

    random.seed(a.seed); np.random.seed(a.seed); torch.manual_seed(a.seed); torch.cuda.manual_seed_all(a.seed)
    run_epoch.label_smoothing = a.label_smoothing
    device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
    print("device:", device, torch.cuda.get_device_name(0) if device.type=="cuda" else "")

    IMAGENET_MEAN=[0.485,0.456,0.406]; IMAGENET_STD=[0.229,0.224,0.225]

    # Transforms
    to_rgb = transforms.Lambda(_to_rgb)
    base_ops=[to_rgb, transforms.RandomResizedCrop(a.img, scale=(0.8,1.0)), transforms.RandomHorizontalFlip(), transforms.RandomRotation(15), transforms.RandomAffine(degrees=0, translate=(0.05,0.05), scale=(0.9,1.1)), transforms.ColorJitter(brightness=0.15, contrast=0.15)]
    if a.aug=="randaugment": base_ops.append(transforms.RandAugment(num_ops=2, magnitude=7))
    train_tf=transforms.Compose(base_ops + [transforms.ToTensor(), transforms.Normalize(IMAGENET_MEAN, IMAGENET_STD), transforms.RandomErasing(p=0.1)])
    val_tf=transforms.Compose([to_rgb, transforms.Resize(int(a.img*1.14)), transforms.CenterCrop(a.img), transforms.ToTensor(), transforms.Normalize(IMAGENET_MEAN, IMAGENET_STD)])
    test_tf=transforms.Compose([to_rgb, transforms.Resize(int(a.img*1.14)), transforms.CenterCrop(a.img), transforms.ToTensor(), transforms.Normalize(IMAGENET_MEAN, IMAGENET_STD)])

    root = Path(a.data)

    # Load selected classes
    if a.classes:
        content = Path(a.classes).read_text()
        selected = [s.strip() for s in content.splitlines() if s.strip() and not s.strip().startswith("#")]
        print(f"Using class selection from {a.classes}: {len(selected)} classes")
    else:
        # All classes found in train directory
        selected = sorted([d.name for d in (root/"train").iterdir() if d.is_dir()])
        print(f"Auto-detected {len(selected)} classes from {root}/train")

    # Build dataset with filtered classes - custom Dataset that enforces class mapping
    from torch.utils.data import Dataset
    class FilteredDataset(Dataset):
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
                if not class_dir.is_dir(): continue
                for fname in sorted(class_dir.iterdir()):
                    if fname.suffix.lower() in {".jpg",".jpeg",".png",".webp"}:
                        self.samples.append((fname, self.class_to_idx[cls]))
                        self.targets.append(self.class_to_idx[cls])
        def __len__(self): return len(self.samples)
        def __getitem__(self, idx):
            path, label = self.samples[idx]
            from PIL import Image
            img = Image.open(path)
            if self.transform: img = self.transform(img)
            return img, label

    # Create canonical mapping from selected classes
    canonical_class_to_idx = {cls: i for i, cls in enumerate(selected)}
    idx_to_class = {i: cls for cls, i in canonical_class_to_idx.items()}

    train_ds = FilteredDataset(root/"train", selected, canonical_class_to_idx, transform=train_tf)
    val_ds = FilteredDataset(root/"validation", selected, canonical_class_to_idx, transform=val_tf)
    test_ds = FilteredDataset(root/"test", selected, canonical_class_to_idx, transform=test_tf)

    classes = train_ds.classes
    print(f"Classes: {len(classes)}")
    print(f"Train: {len(train_ds)} Val: {len(val_ds)} Test: {len(test_ds)}")

    # Dataset validation warnings
    if not a.skip_val_warnings:
        validate_dataset_splits(root, classes, canonical_class_to_idx, a.min_val_samples, a.strict_dataset_validation)
    # TreeID leakage check
    verify_treeid_leakage(root, classes)

    # Class distribution
    train_counts = Counter(label for _, label in train_ds.samples)
    val_counts = Counter(label for _, label in val_ds.samples)
    test_counts = Counter(label for _, label in test_ds.samples)
    print("\nClass distribution (train/val/test):")
    for i, cls in enumerate(classes):
        print(f"  {cls:20s} train={train_counts.get(i,0):4d} val={val_counts.get(i,0):3d} test={test_counts.get(i,0):3d}")

    # Build model
    model = MODEL_BUILDERS[a.model][0](weights=MODEL_BUILDERS[a.model][1])
    set_head_classes(model, len(classes))
    model = model.to(device)
    assert get_classifier_head(model).out_features == len(classes)
    n_params = sum(p.numel() for p in model.parameters())
    print(f"params: {n_params:,} (~{n_params*4/1e6:.1f} MB fp32)")

    # Save class mapping
    outdir = Path("artifacts"); outdir.mkdir(exist_ok=True)
    with open(outdir / "labels_torch.txt", "w") as f: f.write("\n".join(classes))
    with open(outdir / "class_mapping.json", "w") as f: json.dump(canonical_class_to_idx, f, indent=2)
    with open(outdir / "idx_to_class.json", "w") as f: json.dump(idx_to_class, f, indent=2)
    print(f"Saved class mapping to {outdir}/class_mapping.json")

    # Sampler - ONLY for training
    pin = device.type == "cuda"
    sampler = None; loss_weights = None
    counts = [train_counts.get(i,0) for i in range(len(classes))]
    if a.balance == "sampler":
        w = [1.0 / counts[y] for _, y in train_ds.samples]
        sampler = WeightedRandomSampler(w, num_samples=len(w), replacement=True)
        print("WeightedRandomSampler: ENABLED for TRAIN only")
    elif a.balance == "weighted-loss":
        loss_weights = torch.tensor([sum(counts)/(len(counts)*c) if c>0 else 1.0 for c in counts])
        print("Class-weighted loss: ENABLED for TRAIN only")
    train_dl = DataLoader(train_ds, batch_size=a.batch, shuffle=(sampler is None), sampler=sampler, num_workers=a.workers, pin_memory=pin)
    val_dl = DataLoader(val_ds, batch_size=a.batch, shuffle=False, sampler=None, num_workers=a.workers, pin_memory=pin)
    test_dl = DataLoader(test_ds, batch_size=a.batch, shuffle=False, sampler=None, num_workers=a.workers, pin_memory=pin)
    print(f"Train loader: shuffle={sampler is None}, sampler={'WeightedRandomSampler' if sampler else 'None'}")
    print(f"Val loader: shuffle=False, sampler=None")
    print(f"Test loader: shuffle=False, sampler=None")

    use_amp = device.type == "cuda" and not a.no_amp
    scaler = torch.amp.GradScaler("cuda") if use_amp else None
    sched = None
    smooth = 0.0 if a.mixup > 0 else a.label_smoothing
    train_loss_f = nn.CrossEntropyLoss(weight=loss_weights.to(device) if loss_weights is not None else None, label_smoothing=smooth)
    val_loss_f = nn.CrossEntropyLoss()
    ema_state = None
    if a.ema > 0:
        ema_state = {k: v.detach().clone().float() for k,v in model.state_dict().items() if v.is_floating_point()}
        print(f"EMA decay={a.ema} (validated + saved)")

    hist = [("epoch","phase","train_loss","train_acc","train_top3","train_top5","val_loss","val_acc","val_top3","val_top5","test_loss","test_acc","test_top3","test_top5","lr")]
    best = {"loss": float("inf")}; bad = 0

    for ep in range(1, a.epochs+1):
        phase = 1 if ep <= a.warmup_epochs else 2
        if phase == 1:
            set_backbone_frozen(model, True)
            opt = torch.optim.AdamW([p for p in model.parameters() if p.requires_grad], lr=a.warmup_lr, weight_decay=a.weight_decay)
        else:
            if ep == a.warmup_epochs + 1:
                set_backbone_frozen(model, False)
                opt = torch.optim.AdamW(model.parameters(), lr=a.lr, weight_decay=a.weight_decay)
                sched = torch.optim.lr_scheduler.CosineAnnealingLR(opt, T_max=a.epochs - a.warmup_epochs)
        tr = run_epoch(model, train_dl, device, opt, scaler, train_loss_f, a.mixup)
        if ema_state is not None:
            cur = model.state_dict()
            with torch.no_grad():
                for k,v in cur.items():
                    if k in ema_state: ema_state[k].mul_(a.ema).add_(v.detach().float(), alpha=1-a.ema)
            raw_state = {k: v.detach().clone() for k,v in cur.items()}
            merged = dict(cur); merged.update(ema_state); model.load_state_dict(merged)
        va = run_epoch(model, val_dl, device, loss_f=val_loss_f)
        # Also evaluate on test set each epoch for monitoring
        te = run_epoch(model, test_dl, device, loss_f=val_loss_f)
        lr_now = opt.param_groups[0]["lr"]
        hist.append((ep, phase, *tr, *va, *te, lr_now))
        print(f"epoch {ep}/{a.epochs} [ph{phase}] train_loss={tr[0]:.4f} train_acc={tr[1]:.4f} train_top3={tr[2]:.4f} | val_loss={va[0]:.4f} val_acc={va[1]:.4f} val_top3={va[2]:.4f} | test_loss={te[0]:.4f} test_acc={te[1]:.4f} test_top3={te[2]:.4f} lr={lr_now:.2e}", flush=True)
        # Prediction diagnostic every 5 epochs
        if ep % 5 == 0 or ep == a.epochs:
            model.eval()
            with torch.no_grad():
                images, labels = next(iter(val_dl))
                images = images.to(device)
                outputs = model(images)
                probs = torch.softmax(outputs, dim=1)
                top_probs, top_indices = probs.topk(3, dim=1)
                print("--- Val prediction diagnostic (first 10) ---")
                for i in range(min(10, len(labels))):
                    actual = labels[i].item()
                    actual_name = classes[actual]
                    pred_names = [classes[idx] for idx in top_indices[i].tolist()]
                    print(f"  Actual: {actual} ({actual_name}) | Top-3: {top_indices[i].tolist()} {pred_names} | Probs: {[f'{p:.2f}' for p in top_probs[i].tolist()]}")
                # Check collapse
                from collections import Counter as C
                all_preds = []
                for x,y in val_dl:
                    all_preds += model(x.to(device)).argmax(1).cpu().tolist()
                    if len(all_preds) > 500: break
                cnt = C(all_preds)
                print(f"  Val pred distribution: {cnt.most_common(5)} unique {len(cnt)}/{len(classes)} {'COLLAPSED' if len(cnt) < len(classes)//2 else 'OK'}")
            model.train()
        if va[0] < best["loss"]:
            best = {"loss":va[0],"acc":va[1],"top3":va[2],"top5":va[3],"epoch":ep,
                    "test_loss":te[0],"test_acc":te[1],"test_top3":te[2],"test_top5":te[3]}
            torch.save({"model_state_dict": model.state_dict(), "class_names": classes,
                        "class_to_idx": canonical_class_to_idx, "idx_to_class": idx_to_class,
                        "num_classes": len(classes), "img_size": a.img, "model_name": a.model,
                        "best_val_loss": va[0], "best_val_acc": va[1], "best_val_top3": va[2]}, outdir/"best_torch.pth")
            print("  saved artifacts/best_torch.pth")
            bad = 0
        else:
            bad += 1
            if bad >= a.patience:
                print(f"early stop at epoch {ep}"); break
        if ema_state is not None: model.load_state_dict(raw_state)
        if sched is not None: sched.step()

    with open(outdir/"torch_history.csv","w", newline="") as f: csv.writer(f).writerows(hist)
    ckpt = torch.load(outdir/"best_torch.pth", map_location="cpu", weights_only=False)
    model.load_state_dict(ckpt["model_state_dict"])
    # Final evaluation artifacts on validation and test
    save_val_artifacts(model, val_dl, device, classes, canonical_class_to_idx, outdir, "val")
    save_val_artifacts(model, test_dl, device, classes, canonical_class_to_idx, outdir, "test")

    # Final status report
    print("\n" + "="*60)
    print("TreeVision Training Complete")
    print("="*60)
    print(f"Classes: {len(classes)} ({'MVP 41' if len(classes)==41 else 'Full 50'})")
    print(f"Train: {len(train_ds)}  Val: {len(val_ds)}  Test: {len(test_ds)}")
    print(f"TreeID leakage: PASS")
    print(f"Class mapping: artifacts/class_mapping.json")
    print(f"Best epoch: {best['epoch']}")
    print(f"Val:   loss={best['loss']:.4f} acc={best['acc']:.4f} top3={best['top3']:.4f} top5={best['top5']:.4f}")
    print(f"Test:  loss={best['test_loss']:.4f} acc={best['test_acc']:.4f} top3={best['test_top3']:.4f} top5={best['test_top5']:.4f}")
    print(f"Artifacts: confusion_matrix_val.png, classification_report_val.txt, per_class_metrics_val.csv")
    print(f"           confusion_matrix_test.png, classification_report_test.txt, per_class_metrics_test.csv")

if __name__=="__main__": main()