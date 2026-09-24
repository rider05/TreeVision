# Architecture (Phase 0)

```text
Android (RN/Expo dev-client OR native fallback)
 Camera/Gallery → quality check → resize/normalize (224x224)
 → LiteRT MobileNetV3 (quantized) → top-3 + confidence
 → threshold gate → species result OR request more evidence
 → local tree DB (JSON/SQLite, offline) → Grad-CAM (Phase 7, notebook first)
 → observation (species, rounded lat/lon, date, photo, confidence, status)
 → OSM map (online tiles first; offline tiles post-MVP)
 → Firebase (auth/firestore/storage, optional sync only; inference stays offline)
```

## Key decisions (open)
1. **RN vs native:** spike required — Expo Go cannot load custom TFLite. Default: Expo dev-client + JSI module; fallback: Kotlin + LiteRT if spike fails in 2 days.
2. **Input:** 224x224 RGB, MobileNetV3Large pretrained ImageNet, fine-tune head first.
3. **Tree DB:** ship offline JSON (`app/models/trees.json`) for 15 MVP species; Firestore mirrors it for sync.
4. **Obs privacy:** store full coords private, display rounded (~3 decimals / jittered) on public map.
5. **Model delivery:** bundle `model.tflite` in app for MVP; versioned download later.

See `plan.md` §4/§18 for full stack.
