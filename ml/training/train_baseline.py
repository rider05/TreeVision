"""MobileNetV3Large transfer-learning baseline (Phase 2 skeleton, runnable once dataset/ exists).
Usage: python ml/training/train_baseline.py --data dataset --epochs 10 --img 224 --batch 32
"""
import argparse
from pathlib import Path

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--data", required=True)
    ap.add_argument("--epochs", type=int, default=10)
    ap.add_argument("--img", type=int, default=224)
    ap.add_argument("--batch", type=int, default=32)
    a = ap.parse_args()
    import tensorflow as tf
    train_ds = tf.keras.utils.image_dataset_from_directory(
        str(Path(a.data) / "train"), image_size=(a.img, a.img), batch_size=a.batch)
    val_ds = tf.keras.utils.image_dataset_from_directory(
        str(Path(a.data) / "validation"), image_size=(a.img, a.img), batch_size=a.batch)
    names = train_ds.class_names
    print("classes:", names)
    norm = tf.keras.layers.Rescaling(1.0 / 127.5, offset=-1)
    aug = tf.keras.Sequential([
        tf.keras.layers.RandomFlip("horizontal"),
        tf.keras.layers.RandomRotation(0.08),
        tf.keras.layers.RandomZoom(0.1),
        tf.keras.layers.RandomBrightness(0.15),
        tf.keras.layers.RandomContrast(0.15),
    ])
    base = tf.keras.applications.MobileNetV3Large(
        input_shape=(a.img, a.img, 3), include_top=False, weights="imagenet", pooling="avg")
    base.trainable = False
    inputs = tf.keras.Input(shape=(a.img, a.img, 3))
    x = aug(inputs)
    x = norm(x)
    x = base(x, training=False)
    x = tf.keras.layers.Dropout(0.2)(x)
    outputs = tf.keras.layers.Dense(len(names), activation="softmax")(x)
    model = tf.keras.Model(inputs, outputs)
    model.compile(optimizer="adam", loss="sparse_categorical_crossentropy",
                  metrics=["accuracy", tf.keras.metrics.TopKCategoricalAccuracy(3, name="top3")])
    train_ds = train_ds.prefetch(tf.data.AUTOTUNE)
    val_ds = val_ds.prefetch(tf.data.AUTOTUNE)
    Path("artifacts").mkdir(exist_ok=True)
    cb = [tf.keras.callbacks.ModelCheckpoint("artifacts/baseline.keras", save_best_only=True, monitor="val_accuracy"),
          tf.keras.callbacks.EarlyStopping(patience=5, restore_best_weights=True, monitor="val_loss")]
    model.fit(train_ds, validation_data=val_ds, epochs=a.epochs, callbacks=cb)
    model.save("artifacts/baseline_final.keras")
    with open("artifacts/labels.txt", "w") as f:
        f.write("\n".join(names))
    print("saved artifacts/baseline.keras + labels.txt")

if __name__ == "__main__":
    main()
