"""Evaluate frozen test set: accuracy, top-3, per-class P/R/F1, confusion matrix.
Usage: python ml/evaluation/evaluate.py --data dataset/test --model artifacts/baseline.keras
"""
import argparse
from pathlib import Path

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--data", required=True)
    ap.add_argument("--model", required=True)
    ap.add_argument("--img", type=int, default=224)
    ap.add_argument("--batch", type=int, default=32)
    a = ap.parse_args()
    import tensorflow as tf
    import numpy as np
    from sklearn.metrics import classification_report, confusion_matrix
    ds = tf.keras.utils.image_dataset_from_directory(
        a.data, image_size=(a.img, a.img), batch_size=a.batch, shuffle=False)
    names = ds.class_names
    model = tf.keras.models.load_model(a.model)
    y_true, y_prob = [], []
    for x, y in ds:
        y_true += list(y.numpy())
        y_prob += list(model.predict(x, verbose=0))
    y_true = np.array(y_true)
    y_pred = np.array(y_prob).argmax(1)
    top3 = np.argsort(y_prob, axis=1)[:, -3:]
    print(f"top1={(y_pred == y_true).mean():.3f} top3={np.mean([y in t for y, t in zip(y_true, top3)]):.3f}")
    print(classification_report(y_true, y_pred, target_names=names, zero_division=0))
    print("confusion_matrix rows=true cols=pred:")
    print(confusion_matrix(y_true, y_pred))

if __name__ == "__main__":
    main()
