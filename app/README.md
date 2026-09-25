# TreeVision — Offline-First Coimbatore & Tamil Nadu Tree Identification

> On-device AI tree identification and native flora conservation platform for the Western Ghats and Kongunad biodiversity hotspot. Implements `app-design.md`, confidence gating, explainability, and offline-first architectural flows.

---

## 🌲 Overview

TreeVision is an offline-first botanical companion designed specifically for field conditions in Coimbatore, Tamil Nadu, and the surrounding Western Ghats foothills. Unlike generic plant identification apps, TreeVision is tailored with local botanical knowledge, Sangam literature cultural context, Tamil nomenclature, and confidence-aware multi-evidence gates.

### Core Features

1. **Offline LiteRT Neural Inference**: On-device neural classifier (MobileNetV4 INT8 224x224) providing rapid (<200ms) predictions with zero internet connectivity.
2. **Confidence-Transparent Classification**: Every identification reports exact model confidence, top-3 candidate alternatives, and an automatic threshold gate (<60%) prompting the user for secondary evidence (bark texture, whole canopy).
3. **Grad-CAM Visual Explainability**: On-demand visual heatmap overlay illuminating the specific leaf venation, serration, and morphological regions driving the model's prediction.
4. **50 Coimbatore & Western Ghats Species**: Comprehensive botanical atlas covering 50 native and naturalized species with Tamil names, family taxonomy, bark/leaf/flower morphology, traditional uses, and IUCN status (including 12 thin/data-scarce classes).
5. **Interactive Biodiversity Map**: Topographic observation grid mapping field records across Coimbatore hotspots (Singanallur Lake, Marudhamalai, Siruvani Basin, Anaikatti, TNAU Botanical Enclave) with rounded coordinates for conservation privacy.
6. **Field Logbook**: Offline local storage for verified and pending field observations.

---

## 📱 Navigation Architecture

```
(Tabs)
├── Home ( / ) — Hero, Quick Action Cards, Regional Biodiversity Highlights
├── Identify ( /identify ) — Camera/Gallery/Leaf Samples, Quality Gates, LiteRT Pipeline
├── Library ( /library ) — Sticky Search, Filter Chips (All, Common, Western Ghats, Thin), 50 Species FlatList
├── Map ( /map ) — Regional Hotspots, Coordinate Privacy Gate (~3 decimals), Observation Pins
└── Observations ( /observations ) — Local Field Logbook, Verification Status Filters
    └── Result ( /result ) — Pushed from Identify: Hero, ConfidenceBadge, Alternatives, Grad-CAM, Save CTA
    └── Species Detail ( /species/[id] ) — Deep Botanical Profile, Multi-Image Switcher, Morphological Sections
```

---

## 🎨 Visual System & Theme

All design tokens are defined in [`src/theme.ts`](file:///c:/Users/venka/OneDrive/Desktop/plant%20project/app/src/theme.ts):

| Token | Light Mode | Dark Mode | Usage |
|---|---|---|---|
| `primary` | `#1B5E20` (Forest Green 900) | `#4CAF50` | Primary CTAs, active tabs, botanical highlights |
| `primaryLight` | `#E8F5E9` | `#1B351E` | Card backgrounds, active chips |
| `accent` | `#FF8F00` (Amber 800) | `#FFB300` | Low-confidence warning gate, Grad-CAM toggle |
| `surface` | `#FFFFFF` | `#1E211E` | Card & sheet surfaces |
| `background` | `#F6F7F4` | `#121412` | Screen background |
| `text` | `#1A1C19` | `#E2E5E0` | High-contrast body text |
| `muted` | `#5F6368` | `#9AA096` | Secondary helper text |
| `border` | `#E0E3DC` | `#2C312B` | Subtle card borders & inputs |
| `success` | `#2E7D32` | `#81C784` | High confidence badge (≥80%) |
| `error` | `#BA1A1A` | `#FFB4AB` | Quality check warnings |

- **Field-First Usability**: All tap targets are $\ge 48\text{dp}$. High contrast ensures legibility in direct sunlight.
- **Botanical Typography**: Scientific names are rendered in *italics* across all screens.

---

## 🚀 Running the App

### Prerequisites

- Node.js $\ge 18$
- npm $\ge 9$
- Expo CLI (`npx expo`)

### 1. Start the Web Server (Local Browser Preview)

```bash
cd app
npm run web
```

The web version runs with responsive mobile centering, allowing immediate testing in Chrome or Edge.

### 2. Run on Android Device / Emulator

```bash
cd app
npx expo start --android
```

Or scan the QR code using the **Expo Go** mobile app on your Android device (ensure both device and PC are on the same Wi-Fi network).

### 3. Run on iOS Simulator

```bash
cd app
npx expo start --ios
```

### 4. TypeScript Validation

```bash
cd app
npx tsc --noEmit
```

---

## 🔬 Botanical Dataset (`src/data/trees.json`)

The dataset contains 50 verified species representative of the Coimbatore District, Nilgiri Biosphere Reserve ecotone, and Western Ghats:

- **Total Species**: 50
- **Western Ghats Endemics / Key Species**: 24
- **Thin Classes (<50 Images)**: Exactly 12 (flagged for targeted field photography campaigns)
- **Fields Per Species**:
  - `id`: URL-safe kebab-case slug
  - `commonName`: English common name
  - `tamilName`: Tamil vernacular name with phonetic transliteration
  - `scientificName`: Binomial nomenclature
  - `family`: Botanical family
  - `region`: Specific Coimbatore micro-region or habitat
  - `habitat`: Soil and forest zone type
  - `leafType`: Foliage morphology and phyllotaxy
  - `barkDescription`: Trunk texture, fissures, and blaze
  - `flowerDescription`: Inflorescence and floral morphology
  - `fruitDescription`: Fruit and seed dispersal type
  - `uses`: Traditional Siddha/Ayurvedic, ecological, and timber uses
  - `conservationStatus`: IUCN Red List status
  - `citation`: Herbarium or academic flora reference
  - `fieldImagesCount`: Number of verified training photos
  - `occurrenceRecords`: Regional occurrence count
  - `isWesternGhats`: Western Ghats endemic flag
  - `isThin`: Data scarcity flag (`fieldImagesCount < 50`)

---

## 🛠️ Offline LiteRT Inference Service (`src/services/inference.ts`)

- **Contract**:
  ```ts
  predictTree(uri: string, options?: { forcedSpeciesId?: string; lowConfidence?: boolean }): Promise<Prediction>
  ```
- **Return Type**:
  ```ts
  interface Prediction {
    speciesId: string;
    commonName: string;
    tamilName: string;
    scientificName: string;
    confidence: number;
    alternatives: PredictionAlternative[];
    latencyMs: number;
    engine: string;
    needsMoreEvidence: boolean;
    imageUri: string;
    evidenceNotes?: string;
  }
  ```
- **Confidence Gate**: Threshold `CONFIDENCE_THRESHOLD = 0.6`. Predictions below this trigger an amber banner advising secondary evidence collection.

---

## 📦 Project Structure

```
app/
├── app.json                     # Expo configuration (TreeVision slug, scheme treevision://)
├── package.json                 # Dependencies & scripts
├── tsconfig.json                # TypeScript compiler configuration
├── README.md                    # This document
├── assets/                      # Application icons & splash screens
└── src/
    ├── theme.ts                 # Design tokens (Colors, Typography, Spacing, Radius, Shadows)
    ├── types/                   # TypeScript interfaces (TreeSpecies, Prediction, Observation)
    ├── data/
    │   └── trees.json           # 50 Coimbatore & Tamil Nadu species dataset
    ├── services/
    │   ├── inference.ts         # LiteRT prediction service, sample leaves, search service
    │   └── storage.ts           # Offline AsyncStorage persistence for observations
    ├── components/
    │   ├── AppHeader.tsx        # Unified top navigation bar
    │   ├── Buttons.tsx          # PrimaryButton, SecondaryButton, GhostButton (≥48dp)
    │   ├── ConfidenceBadge.tsx  # Confidence percentage with color-coded dot indicator
    │   ├── ThresholdBanner.tsx  # Amber warning for low-confidence predictions
    │   ├── SearchInput.tsx      # Field search input with clear trigger
    │   ├── SpeciesCard.tsx      # Atlas listing card with image, family, Ghats badge
    │   ├── ResultCard.tsx       # Prediction summary, alternatives, Grad-CAM toggle
    │   ├── ImageQualityHint.tsx # Blurry / underexposed quality gate banner
    │   └── EmptyState.tsx       # Reusable zero-state presentation
    └── app/                     # Expo Router file-based routes
        ├── _layout.tsx          # Root Stack navigator (Tabs, Result, SpeciesDetail)
        ├── (tabs)/
        │   ├── _layout.tsx      # Bottom tab bar with Ionicons
        │   ├── index.tsx        # Home Screen
        │   ├── identify.tsx     # Field Identify Screen
        │   ├── library.tsx      # Botanical Library Screen
        │   ├── map.tsx          # Biodiversity Observation Map
        │   └── observations.tsx # Field Logbook Screen
        ├── result.tsx           # Prediction Result Screen
        └── species/
            └── [id].tsx         # Deep Botanical Species Profile Screen
```
