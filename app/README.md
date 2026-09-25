# TreeVision app (Expo, Phase 5 scaffold)

Screens: Home → Identify (camera/gallery) → Result (confidence + alternatives + low-confidence nudge) → Library (50 spp, offline JSON) → Species detail.

## Run

```powershell
cd app
npm install
npx expo start
```

Camera needs a dev build or device (`npx expo run:android`); Expo Go cannot load the future native model module.

## Model slot (not yet integrated)

`src/services/inference.ts` is a MOCK behind the real interface (`predictTree()` → species + confidence + alternatives + `needsMoreEvidence`). Swap its internals for the LiteRT dev-client module once `artifacts/` exports a `.tflite`. Tune `CONFIDENCE_THRESHOLD` on validation, not by gut.
