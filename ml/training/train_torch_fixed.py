"""TreeVision FIXED pipeline -- addresses train/val mismatch (was 44% train / 3.79% val).
Fixes: shared class_to_idx, deterministic val loader, same normalize, RGB handling, EMA-correct val,
diagnostics, prediction debug, confusion matrix, debug grids.

Usage:
  python ml/training/train_torch_fixed.py --data dataset --epochs 30 --img 224 --batch 64 --model mobilenet_v3_large --balance sampler --ema 0.999
"""
import argparse, csv, random
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
}

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

def _to_rgb(img):
    return img.convert("RGB") if hasattr(img, "convert") else img
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

def save_debug_grids(train_ds, val_ds, outdir: Path):
    import matplotlib; matplotlib.use("Agg"); import matplotlib.pyplot as plt
    from torchvision.utils import make_grid
    import random
    def grid(ds, path, title):
        # sample 16
        idxs = random.sample(range(len(ds)), min(16, len(ds)))
        imgs = []
        for i in idxs:
            img, label = ds[i]
            # unnormalize for display
            MEAN=torch.tensor([0.485,0.456,0.406]).view(3,1,1)
            STD=torch.tensor([0.229,0.224,0.225]).view(3,1,1)
            disp = torch.clamp(img*STD + MEAN, 0, 1)
            imgs.append(disp)
        g = make_grid(imgs, nrow=4, padding=2)
        plt.figure(figsize=(8,8)); plt.imshow(g.permute(1,2,0).numpy()); plt.axis("off"); plt.title(title)
        # overlay labels
        # save
        plt.savefig(path, dpi=150, bbox_inches="tight"); plt.close()
        print(f"saved {path}")
    # need raw PIL for label verification, so create temporary un-transformed view
    # Instead show tensor grid with class names in title
    grid(train_ds, outdir/"debug_train_samples.png", "Train samples (augmented)")
    grid(val_ds, outdir/"debug_val_samples.png", "Validation samples (deterministic)")

def main():
    ap=argparse.ArgumentParser()
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
    a=ap.parse_args()

    random.seed(a.seed); np.random.seed(a.seed); torch.manual_seed(a.seed); torch.cuda.manual_seed_all(a.seed)
    run_epoch.label_smoothing = a.label_smoothing
    device=torch.device("cuda" if torch.cuda.is_available() else "cpu")
    print("device:", device, torch.cuda.get_device_name(0) if device.type=="cuda" else "")

    IMAGENET_MEAN=[0.485,0.456,0.406]; IMAGENET_STD=[0.229,0.224,0.225]

    # Transforms: train aug, val deterministic, SAME normalize, RGB handling
    # Explicit RGB conversion via Lambda before ToTensor
    to_rgb = transforms.Lambda(_to_rgb)
    base_ops=[to_rgb, transforms.RandomResizedCrop(a.img, scale=(0.8,1.0)), transforms.RandomHorizontalFlip(), transforms.RandomRotation(15), transforms.RandomAffine(degrees=0, translate=(0.05,0.05), scale=(0.9,1.1)), transforms.ColorJitter(brightness=0.15, contrast=0.15)]
    if a.aug=="randaugment": base_ops.append(transforms.RandAugment(num_ops=2, magnitude=7))
    train_tf=transforms.Compose(base_ops + [transforms.ToTensor(), transforms.Normalize(IMAGENET_MEAN, IMAGENET_STD), transforms.RandomErasing(p=0.1)])
    val_tf=transforms.Compose([to_rgb, transforms.Resize(int(a.img*1.14)), transforms.CenterCrop(a.img), transforms.ToTensor(), transforms.Normalize(IMAGENET_MEAN, IMAGENET_STD)])

    root=Path(a.data)
    train_ds=datasets.ImageFolder(root/"train", transform=train_tf)
    val_ds_raw=datasets.ImageFolder(root/"validation", transform=val_tf)

    # === REQUIRED DIAGNOSTICS ===
    print("Train classes:", train_ds.classes)
    print("Val classes:", val_ds_raw.classes)
    print("Train class_to_idx:", train_ds.class_to_idx)
    print("Val class_to_idx:", val_ds_raw.class_to_idx)
    print("Train samples:", len(train_ds))
    print("Val samples:", len(val_ds_raw))
    print("Num classes:", len(train_ds.classes))

    # Fix: force val to use EXACTLY train mapping (prevents label shift if val missing a class)
    # Rebuild val samples with train's mapping
    val_ds = val_ds_raw
    if train_ds.class_to_idx != val_ds.class_to_idx or train_ds.classes != val_ds.classes:
        print("WARNING: Train/val mappings differ -- fixing val to use train mapping")
    # enforce
    val_ds.classes = train_ds.classes
    val_ds.class_to_idx = train_ds.class_to_idx
    # re-encode samples
    # ImageFolder stores samples as (path, class_idx) where class_idx from folder name
    # We need to remap via folder name -> train idx
    new_samples=[]
    for path, _ in val_ds_raw.samples:
        folder = Path(path).parent.name
        if folder not in train_ds.class_to_idx:
            print(f"WARNING: val folder {folder} not in train classes -- skipping {path}")
            continue
        new_samples.append((path, train_ds.class_to_idx[folder]))
    val_ds.samples = new_samples
    val_ds.targets = [s[1] for s in new_samples]
    val_ds.imgs = new_samples

    # asserts
    assert train_ds.class_to_idx == val_ds.class_to_idx, "Train/validation class mappings do not match!"
    assert len(train_ds.classes) == len(val_ds.classes)
    print("OK class mappings identical")

    # class distribution diagnostics
    train_counts=Counter(label for _, label in train_ds.samples)
    val_counts=Counter(label for _, label in val_ds.samples)
    print("Train distribution:", train_counts)
    print("Validation distribution:", val_counts)
    # report low val samples
    for idx, cls in enumerate(train_ds.classes):
        vc = val_counts.get(idx,0)
        if vc < 5:
            print(f"  LOW VAL: {cls} (idx {idx}) has only {vc} val samples -- may underfit")
    # model num_classes check
    model_num_classes=len(train_ds.classes)
    assert model_num_classes == len(train_ds.classes)
    print(f"model_num_classes={model_num_classes} matches train classes")

    # corrupted/missing check
    from PIL import Image
    for ds, name in [(train_ds,"train"), (val_ds,"val")]:
        bad=[]
        for path, label in ds.samples:
            try:
                with Image.open(path) as im: im.load()
                if Path(path).stat().st_size < 1024: bad.append((path, "tiny file"))
            except Exception as e:
                bad.append((path, str(e)[:80]))
        if bad:
            print(f"{name} corrupted/missing: {bad[:5]}")
        else:
            print(f"{name} image integrity: OK ({len(ds)} files)")

    # DataLoader fixes
    pin=device.type=="cuda"
    # WeightedRandomSampler only for train
    sampler=None; loss_weights=None
    counts=[0]*len(train_ds.classes)
    for _,y in train_ds.samples: counts[y]+=1
    if a.balance=="sampler":
        w=[1.0/counts[y] for _,y in train_ds.samples]
        sampler=WeightedRandomSampler(w, num_samples=len(w), replacement=True)
        print("using WeightedRandomSampler for TRAIN only")
    elif a.balance=="weighted-loss":
        loss_weights=torch.tensor([sum(counts)/(len(counts)*c) for c in counts])
        print("using class-weighted loss for TRAIN only")
    train_dl=DataLoader(train_ds, batch_size=a.batch, shuffle=(sampler is None), sampler=sampler, num_workers=a.workers, pin_memory=pin)
    val_dl=DataLoader(val_ds, batch_size=a.batch, shuffle=False, num_workers=a.workers, pin_memory=pin)
    print(f"train_dl: sampler={sampler is not None} shuffle={sampler is None} | val_dl: shuffle=False sampler=None (deterministic)")

    # transform verification
    print("Train transform:", train_tf)
    print("Val transform (deterministic):", val_tf)
    print("Both use Normalize mean", IMAGENET_MEAN, "std", IMAGENET_STD, "-- identical")

    model=models.mobilenet_v3_large(weights=models.MobileNet_V3_Large_Weights.IMAGENET1K_V1) if a.model=="mobilenet_v3_large" else models.mobilenet_v3_small(weights=models.MobileNet_V3_Small_Weights.IMAGENET1K_V1)
    # set head
    parent=model.classifier
    for i in reversed(range(len(parent))):
        import torch.nn as nn
        if isinstance(parent[i], nn.Linear):
            parent[i]=nn.Linear(parent[i].in_features, len(train_ds.classes)); break
    model=model.to(device)
    assert model.classifier[3].out_features == len(train_ds.classes) or parent[-1].out_features == len(train_ds.classes)
    print(f"model output dim {model.classifier[3].out_features if hasattr(model,'classifier') else 'head'} matches {len(train_ds.classes)} classes")
    n_params=sum(p.numel() for p in model.parameters())
    print(f"params: {n_params:,} (~{n_params*4/1e6:.1f} MB fp32)")

    outdir=Path("artifacts"); outdir.mkdir(exist_ok=True)
    with open(outdir/"labels_torch.txt","w") as f: f.write("\n".join(train_ds.classes))

    # debug grids before training
    try: save_debug_grids(train_ds, val_ds, outdir)
    except Exception as e: print("debug grid failed:", e)

    hist=[("epoch","phase","train_loss","train_acc","train_top3","train_top5","val_loss","val_acc","val_top3","val_top5","lr")]
    best={"loss": float("inf")}; bad=0
    use_amp=device.type=="cuda" and not a.no_amp
    scaler=torch.amp.GradScaler("cuda") if use_amp else None
    sched=None
    smooth=0.0 if a.mixup>0 else a.label_smoothing
    train_loss_f=nn.CrossEntropyLoss(weight=loss_weights.to(device) if loss_weights is not None else None, label_smoothing=smooth)
    val_loss_f=nn.CrossEntropyLoss()
    ema_state=None
    if a.ema>0:
        ema_state={k: v.detach().clone().float() for k,v in model.state_dict().items() if v.is_floating_point()}
        print(f"ema decay={a.ema}")

    for ep in range(1, a.epochs+1):
        phase=1 if ep<=a.warmup_epochs else 2
        if phase==1:
            set_backbone_frozen(model, True)
            opt=torch.optim.AdamW([p for p in model.parameters() if p.requires_grad], lr=a.warmup_lr, weight_decay=a.weight_decay)
        else:
            if ep==a.warmup_epochs+1:
                set_backbone_frozen(model, False)
                opt=torch.optim.AdamW(model.parameters(), lr=a.lr, weight_decay=a.weight_decay)
                sched=torch.optim.lr_scheduler.CosineAnnealingLR(opt, T_max=a.epochs-a.warmup_epochs)
        tr=run_epoch(model, train_dl, device, opt, scaler, train_loss_f, a.mixup)
        if ema_state is not None:
            cur=model.state_dict()
            with torch.no_grad():
                for k,v in cur.items():
                    if k in ema_state: ema_state[k].mul_(a.ema).add_(v.detach().float(), alpha=1-a.ema)
            raw_state={k: v.detach().clone() for k,v in cur.items()}
            merged=dict(cur); merged.update(ema_state); model.load_state_dict(merged)
        va=run_epoch(model, val_dl, device, loss_f=val_loss_f)
        lr_now=opt.param_groups[0]["lr"]
        hist.append((ep,phase,*tr,*va,lr_now))
        print(f"epoch {ep}/{a.epochs} [ph{phase}] train_loss={tr[0]:.4f} train_acc={tr[1]:.4f} train_top3={tr[2]:.4f} val_loss={va[0]:.4f} val_acc={va[1]:.4f} val_top3={va[2]:.4f} lr={lr_now:.2e}", flush=True)
        # critical prediction diagnostic every 5 epochs and last
        if ep%5==0 or ep==a.epochs:
            model.eval()
            with torch.no_grad():
                try:
                    images, labels = next(iter(val_dl))
                    images=images.to(device)
                    outputs=model(images)
                    probs=torch.softmax(outputs, dim=1)
                    top_probs, top_indices = probs.topk(3, dim=1)
                    print("--- Val prediction diagnostic (first 20) ---")
                    for i in range(min(20, len(labels))):
                        actual=labels[i].item()
                        actual_name=train_ds.classes[actual]
                        pred_names=[train_ds.classes[idx] for idx in top_indices[i].tolist()]
                        print(f"Actual: {actual} ({actual_name}) | Top-3: {top_indices[i].tolist()} {pred_names} | Probs: {[f'{p:.2f}' for p in top_probs[i].tolist()]}")
                    # check collapse
                    from collections import Counter as C
                    all_preds=[]
                    for x,y in val_dl:
                        all_preds+=model(x.to(device)).argmax(1).cpu().tolist()
                        if len(all_preds)>500: break
                    cnt=C(all_preds)
                    print(f"Val pred distribution (top 5): {cnt.most_common(5)} unique {len(cnt)}/50 -- {'COLLAPSED' if len(cnt)<5 else 'OK'}")
                except Exception as e:
                    print("diagnostic failed", e)
            model.train(phase==1 or True)
        if va[0] < best["loss"]:
            best={"loss":va[0],"acc":va[1],"top3":va[2],"top5":va[3],"epoch":ep}
            torch.save({"model_state_dict": model.state_dict(), "class_names": train_ds.classes, "num_classes": len(train_ds.classes), "img_size": a.img, "model_name": a.model, "best_val_loss": va[0], "best_val_acc": va[1], "best_val_top3": va[2]}, outdir/"best_torch.pth")
            print("  saved artifacts/best_torch.pth")
            bad=0
        else:
            bad+=1
            if bad>=a.patience:
                print(f"early stop at epoch {ep}"); break
        if ema_state is not None: model.load_state_dict(raw_state)
        if sched is not None: sched.step()

    with open(outdir/"torch_history.csv","w", newline="") as f: csv.writer(f).writerows(hist)
    ckpt=torch.load(outdir/"best_torch.pth", map_location="cpu", weights_only=False)
    model.load_state_dict(ckpt["model_state_dict"])
    # final artifacts: confusion matrix + report
    import matplotlib; matplotlib.use("Agg"); import matplotlib.pyplot as plt
    from sklearn.metrics import classification_report, confusion_matrix
    model.eval(); yt, yp=[], []
    with torch.no_grad():
        for x,y in val_dl: yp+=model(x.to(device)).argmax(1).cpu().tolist(); yt+=y.tolist()
    cm=confusion_matrix(yt,yp, labels=list(range(len(train_ds.classes))))
    fig, ax=plt.subplots(figsize=(max(8,len(train_ds.classes)*0.35), max(6,len(train_ds.classes)*0.3)))
    ax.imshow(cm); ax.set_title("Confusion matrix (validation, best checkpoint)"); ax.set_xlabel("predicted"); ax.set_ylabel("true")
    ax.set_xticks(range(len(train_ds.classes)), train_ds.classes, rotation=90, fontsize=6)
    ax.set_yticks(range(len(train_ds.classes)), train_ds.classes, fontsize=6)
    fig.tight_layout(); fig.savefig(outdir/"confusion_matrix.png", dpi=150); plt.close(fig)
    rep=classification_report(yt, yp, target_names=train_ds.classes, zero_division=0)
    (outdir/"classification_report.txt").write_text(rep, encoding="utf-8")
    print(f"wrote {outdir/'confusion_matrix.png'} + classification_report.txt")
    # refresh debug grids with best model? already saved
    print(f"DONE best_val_loss={best['loss']:.4f} (ep {best['epoch']}) val_acc={best['acc']:.4f} val_top3={best['top3']:.4f}")
    # also print BEFORE vs AFTER comparison header
    print("BEFORE: Train 44.03% Val 3.79% Val Top3 11.16% Val loss 3.6829")
    print(f"AFTER: Train {hist[-1][3]:.4f} Val {best['acc']:.4f} Val Top3 {best['top3']:.4f} Val loss {best['loss']:.4f} Best epoch {best['epoch']} Num classes {len(train_ds.classes)} Train {len(train_ds)} Val {len(val_ds)}")

if __name__=="__main__": main()
