"""TreeVision single-image inference from a trained checkpoint.
Usage: python ml/inference/predict.py --image test.jpg [--model artifacts/best_torch.pth]
Works with new checkpoints (model_state_dict/class_names) and legacy ones (model/classes).
"""
import argparse
from pathlib import Path

import torch
import torch.nn as nn
from PIL import Image
from torchvision import models, transforms


def load_checkpoint(path: str, device: torch.device):
    ckpt = torch.load(path, map_location=device, weights_only=False)
    state = ckpt.get("model_state_dict", ckpt.get("model"))
    classes = ckpt.get("class_names", ckpt.get("classes"))
    img_size = ckpt.get("img_size", 224)
    model_name = ckpt.get("model_name", "mobilenet_v3_large")
    builder = {"mobilenet_v3_large": models.mobilenet_v3_large,
               "mobilenet_v3_small": models.mobilenet_v3_small}[model_name]
    model = builder()
    model.classifier[3] = nn.Linear(model.classifier[3].in_features, len(classes))
    model.load_state_dict(state)
    return model.eval().to(device), classes, img_size


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--image", required=True)
    ap.add_argument("--model", default="artifacts/best_torch.pth")
    a = ap.parse_args()
    device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
    model, classes, img_size = load_checkpoint(a.model, device)
    tf = transforms.Compose([
        transforms.Resize(int(img_size * 1.14)), transforms.CenterCrop(img_size),
        transforms.ToTensor(),
        transforms.Normalize([0.485, 0.456, 0.406], [0.229, 0.224, 0.225])])
    x = tf(Image.open(a.image).convert("RGB")).unsqueeze(0).to(device)
    with torch.no_grad():
        probs = torch.softmax(model(x), dim=1)[0]
    top3_p, top3_i = probs.topk(3)
    print("\nTreeVision Prediction\n")
    print("Top 1:")
    print(f"Species: {classes[top3_i[0]]}")
    print(f"Confidence: {top3_p[0] * 100:.2f}%\n")
    print("Top 3:")
    for k, (i, p) in enumerate(zip(top3_i.tolist(), top3_p.tolist()), 1):
        print(f"{k}. {classes[i]} — {p * 100:.2f}%")


if __name__ == "__main__":
    main()
