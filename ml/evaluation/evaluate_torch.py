"""Evaluate best_torch.pth on the frozen test set (41 trained species only).
Usage: python ml/evaluation/evaluate_torch.py --data dataset/test --model artifacts/best_torch.pth [--img 224 --batch 128]
Prints top-1/top-3, per-class P/R/F1, confusion matrix.
"""
import argparse
from pathlib import Path
import torch
import torch.nn as nn
from torch.utils.data import DataLoader
from torchvision import datasets, models, transforms

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--data", default="dataset/test")
    ap.add_argument("--model", default="artifacts/best_torch.pth")
    ap.add_argument("--img", type=int, default=224)
    ap.add_argument("--batch", type=int, default=128)
    ap.add_argument("--tta", action="store_true", help="average original + horizontal-flip views")
    a = ap.parse_args()
    device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
    ckpt = torch.load(a.model, map_location=device, weights_only=False)
    # new format (model_state_dict/class_names) with back-compat for old (model/classes)
    state = ckpt.get("model_state_dict", ckpt.get("model"))
    classes = ckpt.get("class_names", ckpt.get("classes"))
    img = ckpt.get("img_size", a.img)
    a.img = img
    tf = transforms.Compose([transforms.Resize(int(a.img * 1.14)), transforms.CenterCrop(a.img),
                             transforms.ToTensor(),
                             transforms.Normalize([0.485, 0.456, 0.406], [0.229, 0.224, 0.225])])
    full = datasets.ImageFolder(a.data, transform=tf)
    keep = [i for i, (p, _) in enumerate(full.samples) if Path(p).parent.name in classes]
    sub = torch.utils.data.Subset(full, keep)
    # remap targets to checkpoint class indices
    name_to_idx = {c: i for i, c in enumerate(classes)}
    remapped = [(p, name_to_idx[Path(p).parent.name]) for p, _ in [full.samples[i] for i in keep]]
    sub.dataset.samples = full.samples  # untouched; we override via wrapper below
    from torch.utils.data import Dataset
    class Remap(Dataset):
        def __init__(self, base, idx, targets):
            self.base, self.idx, self.targets = base, idx, targets
        def __len__(self): return len(self.idx)
        def __getitem__(self, i):
            x, _ = self.base[self.idx[i]]
            return x, self.targets[i][1]
    loader = DataLoader(Remap(full, keep, remapped), batch_size=a.batch)
    model = models.mobilenet_v3_large()
    model.classifier[3] = nn.Linear(model.classifier[3].in_features, len(classes))
    model.load_state_dict(state)
    model = model.to(device).eval()
    import numpy as np
    yt, yp, yp3 = [], [], []
    views = [lambda t: t]
    if a.tta:
        import torchvision.transforms.functional as F
        views.append(lambda t: F.hflip(t))
        print("TTA: 2 views (orig + hflip)")
    with torch.no_grad():
        for x, y in loader:
            probs = None
            for v in views:
                xv = torch.stack([v(t) for t in x]).to(device)
                p = torch.softmax(model(xv), dim=1)
                probs = p if probs is None else probs + p
            probs /= len(views)
            yt += y.tolist()
            yp += probs.argmax(1).cpu().tolist()
            yp3 += probs.topk(3, dim=1).indices.cpu().tolist()
    yt = np.array(yt); yp = np.array(yp)
    from sklearn.metrics import classification_report, confusion_matrix
    print(f"n={len(yt)} top1={(yp == yt).mean():.4f} top3={np.mean([t in p for t, p in zip(yt, yp3)]):.4f}")
    print(classification_report(yt, yp, target_names=classes, zero_division=0))
    print("confusion matrix (rows=true):")
    print(confusion_matrix(yt, yp))

if __name__ == "__main__":
    main()
