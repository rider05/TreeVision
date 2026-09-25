"""
TreeVision Swin Model - Mobile Benchmark
Measures model size, inference time, and memory usage.
"""

import argparse
import time
import torch
from pathlib import Path
from transformers import AutoImageProcessor, AutoModelForImageClassification
from PIL import Image


def get_model_size_mb(model):
    """Calculate model size in MB."""
    param_size = 0
    buffer_size = 0
    for param in model.parameters():
        param_size += param.nelement() * param.element_size()
    for buffer in model.buffers():
        buffer_size += buffer.nelement() * buffer.element_size()
    return (param_size + buffer_size) / (1024 ** 2)


def benchmark_inference(model, processor, device, num_runs=50, warmup=10):
    """Benchmark inference time."""
    # Create dummy input
    dummy_img = Image.new('RGB', (224, 224), color='green')
    inputs = processor(images=dummy_img, return_tensors="pt")
    inputs = {k: v.to(device) for k, v in inputs.items()}
    
    # Warmup
    model.eval()
    with torch.no_grad():
        for _ in range(warmup):
            _ = model(**inputs)
    
    if device.type == 'cuda':
        torch.cuda.synchronize()
    
    # Timed runs
    times = []
    with torch.no_grad():
        for _ in range(num_runs):
            start = time.perf_counter()
            _ = model(**inputs)
            if device.type == 'cuda':
                torch.cuda.synchronize()
            end = time.perf_counter()
            times.append((end - start) * 1000)  # ms
    
    return {
        'mean_ms': sum(times) / len(times),
        'min_ms': min(times),
        'max_ms': max(times),
        'std_ms': (sum((t - sum(times)/len(times))**2 for t in times) / len(times))**0.5,
        'fps': 1000 / (sum(times) / len(times))
    }


def get_gpu_memory(device):
    """Get GPU memory usage."""
    if device.type == 'cuda':
        return {
            'allocated_mb': torch.cuda.memory_allocated() / (1024**2),
            'reserved_mb': torch.cuda.memory_reserved() / (1024**2),
            'max_allocated_mb': torch.cuda.max_memory_allocated() / (1024**2),
        }
    return {}


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--model", default="artifacts/swin_41/best_torch.pth")
    ap.add_argument("--runs", type=int, default=50)
    ap.add_argument("--warmup", type=int, default=10)
    a = ap.parse_args()
    
    device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
    print(f"Device: {device}")
    if device.type == 'cuda':
        print(f"GPU: {torch.cuda.get_device_name(0)}")
        print(f"VRAM: {torch.cuda.get_device_properties(0).total_memory / 1e9:.1f} GB")
    
    # Load model
    print(f"\nLoading model from {a.model}...")
    ckpt = torch.load(a.model, map_location=device, weights_only=False)
    
    model_name = ckpt.get("model_name", "OttoYu/TreeClassification")
    class_names = ckpt.get("class_names", ckpt.get("classes"))
    img_size = ckpt.get("img_size", 224)
    
    model = AutoModelForImageClassification.from_pretrained(
        model_name,
        num_labels=len(class_names),
        id2label={str(i): cls for i, cls in enumerate(class_names)},
        label2id={cls: str(i) for i, cls in enumerate(class_names)},
        ignore_mismatched_sizes=True
    )
    model.load_state_dict(ckpt["model_state_dict"])
    model = model.eval().to(device)
    
    processor = AutoImageProcessor.from_pretrained(model_name)
    
    # Model info
    num_params = sum(p.numel() for p in model.parameters())
    model_size_fp32 = get_model_size_mb(model)
    
    print(f"\nModel Info:")
    print(f"  Architecture: Swin Transformer (depths=[2,2,18,2], embed_dim=128)")
    print(f"  Parameters: {num_params:,} ({num_params/1e6:.1f}M)")
    print(f"  Model size (FP32): {model_size_fp32:.1f} MB")
    print(f"  Classes: {len(class_names)}")
    print(f"  Input size: {img_size}x{img_size}")
    
    # FP16 size estimate
    print(f"  Model size (FP16 estimate): {model_size_fp32/2:.1f} MB")
    
    # GPU memory before inference
    if device.type == 'cuda':
        torch.cuda.empty_cache()
        torch.cuda.reset_peak_memory_stats()
    
    # Benchmark
    print(f"\nRunning inference benchmark ({a.warmup} warmup + {a.runs} timed runs)...")
    results = benchmark_inference(model, processor, device, a.runs, a.warmup)
    
    print(f"\nInference Results:")
    print(f"  Mean: {results['mean_ms']:.2f} ms")
    print(f"  Min:  {results['min_ms']:.2f} ms")
    print(f"  Max:  {results['max_ms']:.2f} ms")
    print(f"  Std:  {results['std_ms']:.2f} ms")
    print(f"  FPS:  {results['fps']:.1f}")
    
    # GPU memory
    gpu_mem = get_gpu_memory(device)
    if gpu_mem:
        print(f"\nGPU Memory:")
        print(f"  Allocated: {gpu_mem['allocated_mb']:.1f} MB")
        print(f"  Reserved:  {gpu_mem['reserved_mb']:.1f} MB")
        print(f"  Peak:      {gpu_mem['max_allocated_mb']:.1f} MB")
    
    # Comparison with baseline
    print(f"\n{'='*60}")
    print("COMPARISON WITH BASELINE (MobileNetV3)")
    print(f"{'='*60}")
    print(f"{'Metric':30s} {'MobileNetV3':>15s} {'Swin':>15s}")
    print(f"{'-'*60}")
    print(f"{'Parameters':30s} {'4.25M':>15s} {f'{num_params/1e6:.1f}M':>15s}")
    print(f"{'FP32 Size':30s} {'~17 MB':>15s} {f'{model_size_fp32:.1f} MB':>15s}")
    print(f"{'FP16 Size':30s} {'~8.5 MB':>15s} {f'{model_size_fp32/2:.1f} MB':>15s}")
    print(f"{'Inference Time (GPU)':30s} {'~5-10 ms':>15s} {f'{results["mean_ms"]:.1f} ms':>15s}")
    print(f"{'FPS (GPU)':30s} {'100-200':>15s} {f'{results["fps"]:.0f}':>15s}")
    
    # Mobile deployment assessment
    print(f"\n{'='*60}")
    print("MOBILE DEPLOYMENT ASSESSMENT")
    print(f"{'='*60}")
    print(f"Model size (FP32): {model_size_fp32:.1f} MB - {'TOO LARGE' if model_size_fp32 > 100 else 'ACCEPTABLE'} for mobile")
    print(f"Model size (FP16): {model_size_fp32/2:.1f} MB - {'TOO LARGE' if model_size_fp32/2 > 50 else 'ACCEPTABLE'} for mobile")
    print(f"Inference time: {results['mean_ms']:.1f} ms - {'SLOW' if results['mean_ms'] > 100 else 'FAST' if results['mean_ms'] < 50 else 'MODERATE'} for mobile")
    print(f"\nRecommendation:")
    if model_size_fp32 > 100:
        print(f"  - Model requires quantization (INT8/FP16) for mobile deployment")
        print(f"  - Consider ONNX export + TensorRT/ONNX Runtime optimization")
        print(f"  - For edge devices, MobileNetV3 baseline is more suitable")
    else:
        print(f"  - Model size acceptable for modern mobile devices with FP16")
    
    # Save results
    outdir = Path("artifacts/swin_41")
    outdir.mkdir(parents=True, exist_ok=True)
    benchmark_results = {
        "model": "Swin Transformer (OttoYu/TreeClassification fine-tuned)",
        "parameters": num_params,
        "model_size_fp32_mb": model_size_fp32,
        "model_size_fp16_mb_est": model_size_fp32 / 2,
        "inference_mean_ms": results['mean_ms'],
        "inference_min_ms": results['min_ms'],
        "inference_max_ms": results['max_ms'],
        "inference_std_ms": results['std_ms'],
        "fps": results['fps'],
        "gpu_memory_mb": gpu_mem,
        "classes": len(class_names),
        "input_size": img_size
    }
    import json
    with open(outdir / "mobile_benchmark.json", "w") as f:
        json.dump(benchmark_results, f, indent=2)
    print(f"\nSaved benchmark results to {outdir}/mobile_benchmark.json")


if __name__ == "__main__":
    main()