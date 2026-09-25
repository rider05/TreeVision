"""TreeVision MobileNetV3 transfer-learning trainer (PyTorch, CUDA-first).

Two phases: (1) frozen-backbone warm-up training the classifier head,
(2) full fine-tune with a smaller LR. Standard torchvision ops only so the
model stays convertible to ONNX / TFLite / Core ML later.

Usage (RTX 3060):
  python ml/training/train_torch.py --data dataset_base --epochs 25 --img 224 --batch 64 --model mobilenet_v3_large
Outputs: artifacts/best_torch.pth, artifacts/torch_history.csv,
         artifacts/confusion_matrix.png (val), artifacts/classification_report.txt (val)
Windows-safe (multiprocessing guarded, pin_memory only on CUDA).
"""
import argparse
import csv
import random
from pathlib import Path

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


def get_classifier_head(model: nn.Module) -> nn.Linear:
    if hasattr(model, "classifier"):  # mobilenet / efficientnet: Sequential, last Linear
        for m in reversed(list(model.classifier.modules())):
            if isinstance(m, nn.Linear):
                return m
    if hasattr(model, "head"):  # convnext: Sequential fc
        for m in reversed(list(model.head.modules())):
            if isinstance(m, nn.Linear):
                return m
    raise ValueError("unknown head layout")


def set_head_classes(model: nn.Module, num_classes: int) -> None:
    head = get_classifier_head(model)
    head.out_features  # touch
    # replace in place by rebuilding the parent Sequential's last Linear
    parent = model.classifier if hasattr(model, "classifier") else model.head
    for i in reversed(range(len(parent))):
        if isinstance(parent[i], nn.Linear):
            parent[i] = nn.Linear(parent[i].in_features, num_classes)
            return


def backbone_params(model: nn.Module):
    head = get_classifier_head(model)
    return [p for n, p in model.named_parameters() if p is not head.weight and p is not head.bias]


def head_params(model: nn.Module):
    head = get_classifier_head(model)
    return [head.weight, head.bias]

IMAGENET_MEAN = [0.485, 0.456, 0.406]
IMAGENET_STD = [0.229, 0.224, 0.225]


def build_model(name: str, num_classes: int) -> nn.Module:
    fn, weights = MODEL_BUILDERS[name]
    model = fn(weights=weights)
    set_head_classes(model, num_classes)
    return model


def set_backbone_frozen(model: nn.Module, frozen: bool) -> None:
    head = get_classifier_head(model)
    head_params = {head.weight, head.bias}
    for p in model.parameters():
        p.requires_grad = (p in head_params) if frozen else True


def topk_acc(out: torch.Tensor, y: torch.Tensor, k: int) -> float:
    _, pred = out.topk(min(k, out.size(1)), dim=1)
    return (pred == y.view(-1, 1)).any(dim=1).float().mean().item()


def run_epoch(model, loader, device, opt=None, scaler=None, loss_f=None, mixup_alpha=0.0):
    train = opt is not None
    model.train(train)
    if loss_f is None:
        loss_f = nn.CrossEntropyLoss(label_smoothing=run_epoch.label_smoothing)
    tot_loss, tot_acc, tot_top3, tot_top5, n = 0.0, 0.0, 0.0, 0.0, 0
    for x, y in loader:
        x, y = x.to(device, non_blocking=True), y.to(device, non_blocking=True)
        mixed = train and mixup_alpha > 0 and x.size(0) > 1
        if mixed:  # MixUp: soft targets, plain CE
            lam = np.random.beta(mixup_alpha, mixup_alpha)
            idx = torch.randperm(x.size(0), device=device)
            x_mix, y_a, y_b = lam * x + (1 - lam) * x[idx], y, y[idx]
        if train:
            opt.zero_grad(set_to_none=True)
        with torch.set_grad_enabled(train):
            if train and scaler is not None:
                with torch.autocast(device_type="cuda", dtype=torch.float16):
                    out = model(x_mix if mixed else x)
                    loss = (lam * loss_f(out, y_a) + (1 - lam) * loss_f(out, y_b)
                            if mixed else loss_f(out, y))
                scaler.scale(loss).backward()
                scaler.step(opt)
                scaler.update()
            else:
                out = model(x)
                loss = loss_f(out, y)
                if train:
                    loss.backward()
                    opt.step()
        bs = y.size(0)
        tot_loss += loss.item() * bs
        tot_acc += (out.argmax(1) == y).float().sum().item()
        tot_top3 += topk_acc(out, y, 3) * bs
        tot_top5 += topk_acc(out, y, 5) * bs
        n += bs
    return tot_loss / n, tot_acc / n, tot_top3 / n, tot_top5 / n


run_epoch.label_smoothing = 0.0


def save_val_artifacts(model, val_loader, device, classes, outdir: Path) -> None:
    """Confusion-matrix PNG + classification report for the best checkpoint (val split)."""
    import matplotlib
    matplotlib.use("Agg")
    import matplotlib.pyplot as plt
    from sklearn.metrics import classification_report, confusion_matrix

    model.eval()
    yt, yp = [], []
    with torch.no_grad():
        for x, y in val_loader:
            yp += model(x.to(device)).argmax(1).cpu().tolist()
            yt += y.tolist()
    cm = confusion_matrix(yt, yp, labels=list(range(len(classes))))
    fig, ax = plt.subplots(figsize=(max(8, len(classes) * 0.35), max(6, len(classes) * 0.3)))
    ax.imshow(cm)
    ax.set_title("Confusion matrix (validation, best checkpoint)")
    ax.set_xlabel("predicted")
    ax.set_ylabel("true")
    ax.set_xticks(range(len(classes)), classes, rotation=90, fontsize=6)
    ax.set_yticks(range(len(classes)), classes, fontsize=6)
    fig.tight_layout()
    fig.savefig(outdir / "confusion_matrix.png", dpi=150)
    plt.close(fig)
    rep = classification_report(yt, yp, target_names=classes, zero_division=0)
    (outdir / "classification_report.txt").write_text(rep, encoding="utf-8")
    print(f"wrote {outdir / 'confusion_matrix.png'} + classification_report.txt")


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--data", default="dataset_base")
    ap.add_argument("--epochs", type=int, default=25)
    ap.add_argument("--img", type=int, default=224)
    ap.add_argument("--batch", type=int, default=64)
    ap.add_argument("--lr", type=float, default=1e-4, help="phase-2 (fine-tune) LR")
    ap.add_argument("--warmup-lr", type=float, default=1e-3, help="phase-1 (head) LR")
    ap.add_argument("--weight-decay", type=float, default=1e-4)
    ap.add_argument("--label-smoothing", type=float, default=0.1)
    ap.add_argument("--patience", type=int, default=5)
    ap.add_argument("--warmup-epochs", type=int, default=3)
    ap.add_argument("--model", default="mobilenet_v3_large", choices=list(MODEL_BUILDERS))
    ap.add_argument("--seed", type=int, default=42)
    ap.add_argument("--workers", type=int, default=2)
    ap.add_argument("--balance", default="none", choices=["none", "sampler", "weighted-loss"],
                    help="none | WeightedRandomSampler | class-weighted CrossEntropy")
    ap.add_argument("--aug", default="base", choices=["base", "randaugment"],
                    help="base mild pipeline | stronger RandAugment pipeline (same species-safe ops)")
    ap.add_argument("--mixup", type=float, default=0.0, help="MixUp alpha (0 = off, try 0.2)")
    ap.add_argument("--ema", type=float, default=0.0, help="EMA decay for weights (0 = off, try 0.999)")
    ap.add_argument("--no-amp", action="store_true", help="disable mixed precision")
    a = ap.parse_args()

    random.seed(a.seed)
    np.random.seed(a.seed)
    torch.manual_seed(a.seed)
    torch.cuda.manual_seed_all(a.seed)
    run_epoch.label_smoothing = a.label_smoothing

    device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
    print("device:", device, torch.cuda.get_device_name(0) if device.type == "cuda" else "", flush=True)
    use_amp = device.type == "cuda" and not a.no_amp
    print("amp:", use_amp, "| model:", a.model, flush=True)

    base_ops = [
        transforms.RandomResizedCrop(a.img, scale=(0.8, 1.0)),
        transforms.RandomHorizontalFlip(),
        transforms.RandomRotation(15),
        transforms.RandomAffine(degrees=0, translate=(0.05, 0.05), scale=(0.9, 1.1)),
        transforms.ColorJitter(brightness=0.15, contrast=0.15),
    ]
    if a.aug == "randaugment":
        base_ops.append(transforms.RandAugment(num_ops=2, magnitude=7))  # mild: no identity-breaking ops
        print("augment: base + RandAugment(2,7)", flush=True)
    train_tf = transforms.Compose(base_ops + [
        transforms.ToTensor(),
        transforms.Normalize(IMAGENET_MEAN, IMAGENET_STD),
        transforms.RandomErasing(p=0.1),
    ])
    val_tf = transforms.Compose([
        transforms.Resize(int(a.img * 1.14)),
        transforms.CenterCrop(a.img),
        transforms.ToTensor(),
        transforms.Normalize(IMAGENET_MEAN, IMAGENET_STD),
    ])

    root = Path(a.data)
    train_ds = datasets.ImageFolder(root / "train", transform=train_tf)
    val_ds = datasets.ImageFolder(root / "validation", transform=val_tf)
    classes = train_ds.classes
    print(f"classes: {len(classes)} train: {len(train_ds)} val: {len(val_ds)}", flush=True)

    counts = [0] * len(classes)
    for _, y in train_ds.samples:
        counts[y] += 1
    print("Class distribution:")
    for c, n in zip(classes, counts):
        print(f"  {c}: {n}")
    print(f"min={min(counts)} max={max(counts)} avg={sum(counts) / len(counts):.1f}", flush=True)

    sampler, loss_weights = None, None
    if a.balance == "sampler":
        w = [1.0 / counts[y] for _, y in train_ds.samples]
        sampler = WeightedRandomSampler(w, num_samples=len(w), replacement=True)
        print("using WeightedRandomSampler", flush=True)
    elif a.balance == "weighted-loss":
        loss_weights = torch.tensor([sum(counts) / (len(counts) * c) for c in counts])
        print("using class-weighted loss", flush=True)

    pin = device.type == "cuda"
    train_dl = DataLoader(train_ds, batch_size=a.batch, shuffle=(sampler is None),
                          sampler=sampler, num_workers=a.workers, pin_memory=pin)
    val_dl = DataLoader(val_ds, batch_size=a.batch, num_workers=a.workers, pin_memory=pin)

    model = build_model(a.model, len(classes)).to(device)
    n_params = sum(p.numel() for p in model.parameters())
    print(f"params: {n_params:,} (~{n_params * 4 / 1e6:.1f} MB fp32)", flush=True)

    outdir = Path("artifacts")
    outdir.mkdir(exist_ok=True)
    with open(outdir / "labels_torch.txt", "w") as f:
        f.write("\n".join(classes))

    hist = [("epoch", "phase", "train_loss", "train_acc", "train_top3", "train_top5",
             "val_loss", "val_acc", "val_top3", "val_top5", "lr")]
    best = {"loss": float("inf")}
    bad = 0
    scaler = torch.amp.GradScaler("cuda") if use_amp else None
    sched = None
    smooth = 0.0 if a.mixup > 0 else a.label_smoothing  # MixUp already softens targets
    train_loss_f = nn.CrossEntropyLoss(
        weight=loss_weights.to(device) if loss_weights is not None else None,
        label_smoothing=smooth)
    val_loss_f = nn.CrossEntropyLoss()
    ema_state = None
    if a.ema > 0:
        ema_state = {k: v.detach().clone().float() for k, v in model.state_dict().items()
                     if v.is_floating_point()}
        print(f"ema decay={a.ema} (validated + saved)", flush=True)

    for ep in range(1, a.epochs + 1):
        phase = 1 if ep <= a.warmup_epochs else 2
        if phase == 1:
            set_backbone_frozen(model, True)
            opt = torch.optim.AdamW(head_params(model),
                                    lr=a.warmup_lr, weight_decay=a.weight_decay)
        else:
            if ep == a.warmup_epochs + 1:
                set_backbone_frozen(model, False)
                opt = torch.optim.AdamW(model.parameters(), lr=a.lr, weight_decay=a.weight_decay)
                sched = torch.optim.lr_scheduler.CosineAnnealingLR(opt, T_max=a.epochs - a.warmup_epochs)
        tr = run_epoch(model, train_dl, device, opt, scaler, train_loss_f, a.mixup)
        if ema_state is not None:
            cur = model.state_dict()
            with torch.no_grad():
                for k, v in cur.items():
                    if k in ema_state:
                        ema_state[k].mul_(a.ema).add_(v.detach().float(), alpha=1 - a.ema)
            raw_state = {k: v.detach().clone() for k, v in cur.items()}
            merged = dict(cur)
            merged.update(ema_state)
            model.load_state_dict(merged)  # validate + save the EMA weights
        va = run_epoch(model, val_dl, device, loss_f=val_loss_f)
        lr_now = opt.param_groups[0]["lr"]
        hist.append((ep, phase, *tr, *va, lr_now))
        print(f"epoch {ep}/{a.epochs} [ph{phase}] train_loss={tr[0]:.4f} train_acc={tr[1]:.4f} "
              f"train_top3={tr[2]:.4f} val_loss={va[0]:.4f} val_acc={va[1]:.4f} "
              f"val_top3={va[2]:.4f} lr={lr_now:.2e}", flush=True)
        if va[0] < best["loss"]:
            best = {"loss": va[0], "acc": va[1], "top3": va[2], "top5": va[3], "epoch": ep}
            torch.save({"model_state_dict": model.state_dict(), "class_names": classes,
                        "num_classes": len(classes), "img_size": a.img, "model_name": a.model,
                        "best_val_loss": va[0], "best_val_acc": va[1], "best_val_top3": va[2]}, 
                       outdir / "best_torch.pth")
            print("  saved artifacts/best_torch.pth", flush=True)
            bad = 0
        else:
            bad += 1
            if bad >= a.patience:
                print(f"early stop at epoch {ep}", flush=True)
                break
        if ema_state is not None:
            model.load_state_dict(raw_state)  # resume training from raw weights
        if sched is not None:
            sched.step()

    with open(outdir / "torch_history.csv", "w", newline="") as f:
        csv.writer(f).writerows(hist)
    ckpt = torch.load(outdir / "best_torch.pth", map_location="cpu", weights_only=False)
    model.load_state_dict(ckpt["model_state_dict"])
    save_val_artifacts(model, val_dl, device, classes, outdir)
    print(f"DONE best_val_loss={best['loss']:.4f} (ep {best['epoch']}) "
          f"val_acc={best['acc']:.4f} val_top3={best['top3']:.4f}")


if __name__ == "__main__":
    main()
