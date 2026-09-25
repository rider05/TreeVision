"""
TreeVision Swin Transformer Inference Script
Uses fine-tuned Swin model with TreeVision 41-class mapping.
"""

import argparse
from pathlib import Path

import torch
from PIL import Image
from transformers import AutoImageProcessor, AutoModelForImageClassification


def load_swin_checkpoint(checkpoint_path: str, device: torch.device):
    """Load fine-tuned Swin model from TreeVision checkpoint."""
    ckpt = torch.load(checkpoint_path, map_location=device, weights_only=False)
    
    # Get model config
    model_name = ckpt.get("model_name", "OttoYu/TreeClassification")
    class_names = ckpt.get("class_names", ckpt.get("classes"))
    img_size = ckpt.get("img_size", 224)
    class_to_idx = ckpt.get("class_to_idx", {})
    idx_to_class = ckpt.get("idx_to_class", {})
    
    # Load model with correct number of classes
    model = AutoModelForImageClassification.from_pretrained(
        model_name,
        num_labels=len(class_names),
        id2label={str(i): cls for i, cls in enumerate(class_names)},
        label2id={cls: str(i) for i, cls in enumerate(class_names)},
        ignore_mismatched_sizes=True
    )
    
    model.load_state_dict(ckpt["model_state_dict"])
    model = model.eval().to(device)
    
    # Load processor
    processor = AutoImageProcessor.from_pretrained(model_name)
    
    return model, processor, class_names, idx_to_class, img_size


def predict_image(image_path: str, model, processor, class_names, device: torch.device):
    """Run inference on a single image."""
    # Load and preprocess image
    image = Image.open(image_path).convert("RGB")
    
    # Use processor for consistent preprocessing
    inputs = processor(images=image, return_tensors="pt")
    inputs = {k: v.to(device) for k, v in inputs.items()}
    
    with torch.no_grad():
        outputs = model(**inputs)
        logits = outputs.logits
        probs = torch.softmax(logits, dim=1)[0]
    
    # Get top predictions
    top5_probs, top5_indices = probs.topk(5)
    
    return [
        (class_names[idx.item()], prob.item())
        for prob, idx in zip(top5_probs, top5_indices)
    ]


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--image", required=True, help="Path to input image")
    ap.add_argument("--model", default="artifacts/swin_41/best_torch.pth", help="Path to checkpoint")
    ap.add_argument("--top-k", type=int, default=5, help="Number of top predictions to show")
    a = ap.parse_args()
    
    device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
    print(f"Device: {device}")
    
    # Load model
    print(f"Loading model from {a.model}...")
    model, processor, class_names, idx_to_class, img_size = load_swin_checkpoint(a.model, device)
    print(f"Model loaded: {len(class_names)} classes")
    print(f"Image size: {img_size}")
    
    # Run prediction
    print(f"\nRunning inference on {a.image}...")
    predictions = predict_image(a.image, model, processor, class_names, device)
    
    # Print results
    print("\n" + "="*50)
    print("TreeVision Swin Prediction")
    print("="*50)
    print(f"\nTop prediction:")
    print(f"  {predictions[0][0]}")
    print(f"\nConfidence: {predictions[0][1]*100:.2f}%")
    
    print(f"\nTop {a.top_k}:")
    for i, (species, conf) in enumerate(predictions[:a.top_k], 1):
        print(f"  {i}. {species:20s} — {conf*100:.2f}%")


if __name__ == "__main__":
    main()