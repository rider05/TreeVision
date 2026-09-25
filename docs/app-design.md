# TreeVision — Expo App Design Plan

> Source of truth for UI/UX of `app/` (Expo + expo-router). Implements `plan.md` §17 and `docs/architecture.md` offline-first flow.

## 1. Product Positioning

**Offline-first, Coimbatore/Tamil Nadu tree ID + biodiversity map.** Camera → on-device LiteRT → confidence gate → info → explainability → observation → map.

Differentiator: local specialization + confidence-aware multi-evidence + explainability. Not a generic PlantNet clone.

## 2. Information Architecture

```
(Tabs)
├── Home ( / )
├── Identify ( /identify )
├── Library ( /library → /species/[id] )
├── Map ( /map ) — placeholder until Phase 8
└── Observations ( /observations ) — placeholder
    └── Result ( /result ) — pushed from Identify, not a tab
```

Router: `app/_layout.tsx` = Stack + Tabs. Header hidden, custom top bar per screen.

## 3. Design Principles

1.  **Field-first:** Large tap targets (≥48dp), high contrast, works in bright sunlight.
2.  **Offline-first:** Every screen renders from `src/data/trees.json` + SQLite; no network spinners on Library/Species.
3.  **Confidence-transparent:** Never show bare "This is Neem" — always show confidence + top-3 alternatives + threshold gate.
4.  **One-hand use:** Primary CTA bottom-fixed, camera controls thumb-reachable.

## 4. Visual System

### 4.1 Color

| Token | Value | Usage |
|-------|-------|-------|
| `primary` | `#1B5E20` (green 900) | CTA, active tab, links |
| `primaryLight` | `#E8F5E9` | Card bg, chip bg |
| `accent` | `#FF8F00` (amber 800) | Low-confidence warning, Grad-CAM |
| `surface` | `#FFFFFF` | Cards |
| `background` | `#F6F7F4` | Screen bg |
| `text` | `#1A1C19` | Primary text |
| `muted` | `#5F6368` | Secondary text |
| `border` | `#E0E3DC` | Dividers, inputs |
| `error` | `#BA1A1A` | Quality-check reject |
| `success` | `#2E7D32` | High confidence badge |

Dark mode: invert surface/background, keep primary/accent.

### 4.2 Typography

- Font: System (San Francisco / Roboto) + `Inter` if bundled. No custom font for MVP to keep APK small.
- Scale: `h1 28/bold` (app title), `h2 22/bold` (screen title), `h3 16/semi` (card title), `body 14/regular`, `caption 12/muted`, `mono 12` (latency/engine).
- Scientific names: `italic` always.

### 4.3 Spacing & Radius

- Base unit `4`. Screen padding `16` (not 24), card gap `12`, section gap `24`.
- Radius: card `16`, button `12`, chip `999`, image `12`.
- Elevation: card `shadow 0/2/8 #000 8%` on iOS, `elevation 2` Android.

### 4.4 Iconography

- Library: `@expo/vector-icons` (Ionicons). No extra dependency.
- Icons: `leaf`, `camera`, `images`, `search`, `map`, `bookmark`, `alert-circle`, `chevron-forward`, `information-circle`.

## 5. Components (to build in `app/src/components/`)

| Component | Props | Notes |
|-----------|-------|-------|
| `AppHeader` | `title, subtitle?, right?` | Consistent top bar |
| `PrimaryButton` / `SecondaryButton` | `title, onPress, loading, icon` | `PrimaryButton` = filled `primary`, `SecondaryButton` = outline |
| `ConfidenceBadge` | `value: 0-1` | Color: `≥0.8 success`, `0.6-0.8 muted`, `<0.6 amber`. Text `91.2%` |
| `SpeciesCard` | `tree` | Image placeholder + common/sci + family chip + `fieldImages` count |
| `ResultCard` | `prediction` | Hero image + top prediction + badge + alternatives list |
| `ThresholdBanner` | `needsMoreEvidence` | Amber callout: "Low confidence — try bark / whole tree" |
| `SearchInput` | `value, onChange` | Border `1`, radius `12`, icon left |
| `EmptyState` | `icon, title, action` | For no results / no observations |
| `ImageQualityHint` | `reason` | "Too blurry / too dark" — Phase 7 |

## 6. Screen Specs

### 6.1 Home `app/index.tsx`

- Hero: TreeVision wordmark + tagline "Coimbatore / Tamil Nadu • offline-first".
- Two large cards (not text links): `Identify a tree` (camera icon, primary) + `Tree library (50 species)` (leaf icon, secondary).
- Secondary row: `Map` + `My observations` (disabled with "Coming soon" badge until Phase 8).
- Footer: "Offline model: mock — will be LiteRT" mono caption.

### 6.2 Identify `app/identify.tsx`

- States: `idle → picking → preview → inferring → push /result`.
- Top: instructions "Tip: fill frame with one leaf, avoid shadows".
- Two CTAs: `Take photo` (primary, camera) + `Choose from gallery` (secondary, images). Gallery uses `expo-image-picker` `quality:0.8`.
- Preview: `Image 100% x 300, radius 12`, with `Retake` ghost button.
- Bottom-fixed CTA: `Identify` (disabled until `uri`, shows `ActivityIndicator` when `busy`).
- Quality gate (future): reject blurry/dark before `predictTree()` — show `ImageQualityHint`.

### 6.3 Result `app/result.tsx`

- Hero image `height 240`, rounded.
- Block 1: `commonName h2` + `scientificName italic muted` + `ConfidenceBadge` + `engine • latencyMs` mono.
- Block 2: `ThresholdBanner` if `needsMoreEvidence` (amber, icon).
- Block 3: `Alternatives` list — 2 rows, each `name — 5.2%` with thin progress bar.
- Block 4: `Info` chips: `family`, `region`, `fieldImages`.
- Actions (bottom): `View details → /species/[id]` (primary), `Save observation` (secondary, stores to SQLite — Phase 8), `Back to library`.
- Explainability slot (Phase 7): Grad-CAM overlay toggle under hero image.

### 6.4 Library `app/library.tsx`

- Sticky `SearchInput` (filters `commonName` + `scientificName` case-insensitive).
- Count: `"50 species • 12 thin (<50 images)"` sublabel.
- `FlatList` of `SpeciesCard`, `keyExtractor: id`, `ItemSeparator: 8`.
- Filter chips (future): `All | Common | Western Ghats | Thin`.
- Empty: "No match for '...' — try scientific name".

### 6.5 Species Detail `app/species/[id].tsx`

- Header image (placeholder until species images bundled).
- Title block + Family/Region chips.
- Stats: `Occurrence records` + `Field images` (from `trees.json:8/9`).
- Sections (from `plan.md` §16, show when available): Leaf/Bark/Flower/Fruit, Habitat, Uses, Conservation (with source citation).
- CTA: `Identify this species` → pre-fills Identify hint.

### 6.6 Map & Observations (Phase 8 — spec only)

- Map: OSM tiles, clustered pins, tap → observation sheet (species, date, rounded coords ~3 decimals, confidence). Private coords never shown publicly.
- Observations: list of user's saved results, filter by verification status.

## 7. Navigation & Routing

- `expo-router` typed routes (`experiments.typedRoutes: true` in `app.json:9`).
- Tabs via `app/(tabs)/_layout.tsx` (to create). Current `app/_layout.tsx:1` Stack stays as root.
- Deep link scheme `treevision://` (`app.json:7`).
- Back behavior: hardware back from Result → Identify (keeps preview), Library → Home.

## 8. State & Data

- Local DB: `trees.json` (50) is source of truth; `getAllTrees()` / `getTree()` in `src/services/inference.ts:28`.
- Inference: `predictTree(uri): Prediction` returns `{speciesId, commonName, scientificName, confidence, alternatives, latencyMs, engine, needsMoreEvidence}` (`inference.ts:14`). Threshold `CONFIDENCE_THRESHOLD=0.6:25` — tune on validation.
- Future: SQLite for observations + model file `assets/model.tflite` bundled (see `architecture.md:5/19`).

## 9. Responsive & Accessibility

- Portrait only (`app.json:6`). SafeArea via `react-native-safe-area-context:5.6.0`.
- Min touch 48x48, label all image buttons, `accessibilityLabel` on badges.
- Dynamic type: allow 85–130% scaling, cards wrap.
- Contrast: text on `primary` passes WCAG AA (white on `#1B5E20`).

## 10. Performance Budget

- Cold start <2s on mid-range Android, Identify→Result push <100ms + inference.
- Bundle: keep JS <1MB, images lazy-load, `FlatList` windowSize 5.
- Inference target: `litert` <300ms on 224x224 (measured, not guessed) — `result.tsx:15` shows `latencyMs`.

## 11. Implementation Phases

| Phase | Deliverable | Files |
|-------|-------------|-------|
| **A — Theme** | `src/theme.ts` (colors, spacing, radius, typography) + `components/*` | `src/theme.ts`, `src/components/` |
| **B — Tabs & Header** | Move screens to `(tabs)`, add `AppHeader`, bottom tabs | `app/(tabs)/_layout.tsx` |
| **C — Polish existing** | Replace inline styles with themed cards/buttons in Home/Identify/Result/Library/Species | `app/(tabs)/*`, `app/result.tsx` |
| **D — Library polish** | `SpeciesCard`, filter chips, counts, empty states | `app/(tabs)/library.tsx` |
| **E — Map/Observations stub** | Placeholder screens with "Coming soon" | `app/(tabs)/map.tsx`, `app/(tabs)/observations.tsx` |

## 12. Out of Scope (not in this doc)

- Model training / `.tflite` export (`ml/`, `artifacts/`).
- Dataset collection (`dataset/raw/*`, `docs/dataset-tracker.html`).
- Firebase sync, auth, verification workflow (Phase 8).

## 13. Acceptance Checklist

- [ ] `theme.ts` exists, all screens import tokens (no hardcoded `#` outside theme)
- [ ] Tabs render on Android, deep link `treevision://library` works
- [ ] Identify flow records video of offline mock prediction end-to-end
- [ ] Result always shows confidence + alternatives + threshold banner
- [ ] Library search filters correctly, FlatList has no key warnings
- [ ] `npx tsc --noEmit` passes, `npx expo start` no warnings
- [ ] Screenshots attached in PR for Home/Identify/Result/Library/Species (light + dark)

## 14. References

- `app/README.md` — run instructions, dev-client note
- `plan.md` §4/§17/§18 — architecture, screens, stack
- `docs/architecture.md` — model delivery + input 224x224 + offline JSON
- `app/src/services/inference.ts` — contract to implement against
