"""
Export TreeVision models to mobile formats (TorchScript, ONNX, TFLite).
Usage:
  python ml/deployment/export_mobile.py --model swin --output app/assets/
  python ml/deployment/export_mobile.py --model mobilenetv3 --output app/assets/
"""
import argparse
import torch
from pathlib import Path
from transformers import AutoModelForImageClassification, AutoImageProcessor
from torchvision import models


def export_mobilenetv3(checkpoint_path: str, output_dir: Path, class_mapping: dict):
    """Export MobileNetV3 to TorchScript (.pt) and ONNX."""
    print(f"Loading MobileNetV3 from {checkpoint_path}...")
    ckpt = torch.load(checkpoint_path, map_location="cpu", weights_only=False)
    
    # Handle both checkpoint formats
    if "model_state_dict" in ckpt:
        state_dict = ckpt["model_state_dict"]
        num_classes = ckpt.get("num_classes", 41)
        model_name = ckpt.get("model_name", "mobilenet_v3_large")
        class_names = ckpt.get("class_names", [])
    elif "model" in ckpt:
        state_dict = ckpt["model"]
        num_classes = len(ckpt.get("classes", []))
        model_name = "mobilenet_v3_large"
        class_names = ckpt.get("classes", [])
    else:
        raise ValueError("Unknown checkpoint format")
    
    # Build model with correct classifier structure
    if model_name == "mobilenet_v3_large":
        model = models.mobilenet_v3_large(weights=None)
        # The checkpoint has classifier.3 with 1280->num_classes
        # Standard structure: Linear(960->1280), Hardswish, Dropout, Linear(1280->1000)
        # Replace the final Linear layer
        model.classifier[3] = torch.nn.Linear(1280, num_classes)
    elif model_name == "mobilenet_v3_small":
        model = models.mobilenet_v3_small(weights=None)
        model.classifier[3] = torch.nn.Linear(1280, num_classes)
    else:
        raise ValueError(f"Unknown model: {model_name}")
    
    model.load_state_dict(state_dict)
    model.eval()
    
    # TorchScript (for PyTorch Mobile)
    print("Exporting TorchScript...")
    example = torch.randn(1, 3, 224, 224)
    traced = torch.jit.trace(model, example)
    torch.jit.save(traced, output_dir / "mobilenetv3_41.pt")
    print(f"  Saved: {output_dir}/mobilenetv3_41.pt")
    
    # ONNX (for ONNX Runtime)
    print("Exporting ONNX...")
    torch.onnx.export(
        model, example, output_dir / "mobilenetv3_41.onnx",
        input_names=["input"], output_names=["logits"],
        dynamic_axes={"input": {0: "batch"}, "logits": {0: "batch"}},
        opset_version=17,
        dynamo=False,
        verbose=False
    )
    print(f"  Saved: {output_dir}/mobilenetv3_41.onnx")
    
    # Save class mapping
    import json
    if "class_to_idx" in ckpt:
        idx_to_class = {i: cls for cls, i in ckpt["class_to_idx"].items()}
    elif "class_names" in ckpt:
        idx_to_class = {i: cls for i, cls in enumerate(ckpt["class_names"])}
    elif "classes" in ckpt:
        idx_to_class = {i: cls for i, cls in enumerate(ckpt["classes"])}
    else:
        idx_to_class = {}
    with open(output_dir / "class_mapping.json", "w") as f:
        json.dump(idx_to_class, f, indent=2)
    print(f"  Saved: {output_dir}/class_mapping.json")
    
    # Model info
    params = sum(p.numel() for p in model.parameters())
    print(f"\nModel: MobileNetV3 ({model_name})")
    print(f"Parameters: {params:,} ({params/1e6:.1f}M)")
    print(f"Classes: {num_classes}")


def export_swin(checkpoint_path: str, output_dir: Path):
    """Export Swin to TorchScript and ONNX."""
    print(f"Loading Swin from {checkpoint_path}...")
    ckpt = torch.load(checkpoint_path, map_location="cpu", weights_only=False)
    
    model_name = ckpt.get("model_name", "OttoYu/TreeClassification")
    num_classes = ckpt.get("num_classes", 41)
    class_names = ckpt.get("class_names", [])
    
    # Load model architecture
    model = AutoModelForImageClassification.from_pretrained(
        model_name,
        num_labels=num_classes,
        id2label={str(i): cls for i, cls in enumerate(class_names)},
        label2id={cls: str(i) for i, cls in enumerate(class_names)},
        ignore_mismatched_sizes=True
    )
    model.load_state_dict(ckpt["model_state_dict"])
    model.eval()
    
    # TorchScript (Swin has issues with torch.jit.trace, use scripting if needed)
    print("Exporting TorchScript...")
    example = torch.randn(1, 3, 224, 224)
    try:
        # Swin often needs torch.jit.script instead of trace
        scripted = torch.jit.script(model)
        torch.jit.save(scripted, output_dir / "swin_41.pt")
        print(f"  Saved: {output_dir}/swin_41.pt")
    except Exception as e:
        print(f"  TorchScript failed: {e}")
        print("  Trying trace...")
        try:
            traced = torch.jit.trace(model, example, strict=False)
            torch.jit.save(traced, output_dir / "swin_41.pt")
            print(f"  Saved: {output_dir}/swin_41.pt")
        except Exception as e2:
            print(f"  Trace also failed: {e2}")
    
    # ONNX (recommended for Swin)
    print("Exporting ONNX...")
    try:
        torch.onnx.export(
            model, example, output_dir / "swin_41.onnx",
            input_names=["input"], output_names=["logits"],
            dynamic_axes={"input": {0: "batch"}, "logits": {0: "batch"}},
            opset_version=17,
            dynamo=False,
            do_constant_folding=True,
            verbose=False
        )
        print(f"  Saved: {output_dir}/swin_41.onnx")
    except Exception as e:
        print(f"  ONNX export failed: {e}")
    
    # Save class mapping
    import json
    if "class_to_idx" in ckpt:
        idx_to_class = {i: cls for cls, i in ckpt["class_to_idx"].items()}
    elif "class_names" in ckpt:
        idx_to_class = {i: cls for i, cls in enumerate(ckpt["class_names"])}
    elif "classes" in ckpt:
        idx_to_class = {i: cls for i, cls in enumerate(ckpt["classes"])}
    else:
        idx_to_class = {}
    with open(output_dir / "class_mapping.json", "w") as f:
        json.dump(idx_to_class, f, indent=2)
    print(f"  Saved: {output_dir}/class_mapping.json")
    
    # Save processor config
    processor = AutoImageProcessor.from_pretrained(ckpt.get("model_name", "OttoYu/TreeClassification"))
    processor.save_pretrained(output_dir / "processor")
    print(f"  Saved: {output_dir}/processor/")
    
    # Model info
    params = sum(p.numel() for p in model.parameters())
    print(f"\nModel: Swin Transformer")
    print(f"Parameters: {params:,} ({params/1e6:.1f}M)")
    print(f"Classes: {num_classes}")


def export_tflite(checkpoint_path: str, output_dir: Path, model_type: str):
    """Export to TensorFlow Lite (requires tf-nightly or tensorflow)."""
    try:
        import tensorflow as tf
    except ImportError:
        print("TensorFlow not installed. Skipping TFLite export.")
        print("Install with: pip install tensorflow")
        return
    
    print(f"Exporting {model_type} to TFLite...")
    # This requires converting PyTorch -> ONNX -> TF -> TFLite
    # For now, we'll note the path
    print("  TFLite export requires: PyTorch -> ONNX -> TF -> TFLite pipeline")
    print("  Consider using: python -m tf2onnx.convert --input model.onnx --output model.tf")
    print("  Then: tf.lite.TFLiteConverter.from_saved_model('model.tf').convert()")


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--model", choices=["swin", "mobilenetv3", "both"], default="both")
    ap.add_argument("--checkpoint", help="Path to checkpoint (auto-detected if not provided)")
    ap.add_argument("--output", default="app/assets", help="Output directory")
    ap.add_argument("--tflite", action="store_true", help="Also export TFLite")
    a = ap.parse_args()
    
    output_dir = Path(a.output)
    output_dir.mkdir(parents=True, exist_ok=True)
    
    if a.model in ["swin", "both"]:
        swin_ckpt = a.checkpoint or "artifacts/swin_41/best_torch.pth"
        if Path(swin_ckpt).exists():
            export_swin(swin_ckpt, output_dir)
        else:
            print(f"Swin checkpoint not found: {swin_ckpt}")
    
    if a.model in ["mobilenetv3", "both"]:
        mb_ckpt = a.checkpoint or "artifacts/best_finetune65.pth"
        if Path(mb_ckpt).exists():
            export_mobilenetv3(mb_ckpt, output_dir, {})
        else:
            print(f"MobileNetV3 checkpoint not found: {mb_ckpt}")
    
    if a.tflite:
        export_tflite(a.checkpoint or "artifacts/best_torch.pth", output_dir, a.model)
    
    print(f"\nExport complete! Files in {output_dir}/")
    print("Next: Update app/src/services/inference.ts to load the model")


if __name__ == "__main__":
    main()