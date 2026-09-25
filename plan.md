
## 1. Project Overview

Build an Android application that identifies common tree species using AI-based image classification and provides useful botanical information.

The project is designed specifically around **Coimbatore/Tamil Nadu biodiversity** rather than being only a generic plant-identification app.

### Core idea

**Camera/Image → AI Tree Identification → Confidence → Tree Information → Explainable Result → Local Biodiversity Map**

The application should work primarily **on-device/offline** for identification, with optional cloud services for information, synchronization, analytics, and verified observations.

---

## 2. Main Objectives

1. Identify selected tree species from photographs.
2. Build a locally relevant dataset for Coimbatore/Tamil Nadu.
3. Train and compare lightweight image-classification models.
4. Deploy the final model on Android.
5. Provide botanical and ecological information after identification.
6. Show model confidence and an explainability visualization.
7. Allow users to record verified tree observations.
8. Build a local biodiversity/tree distribution map.
9. Handle uncertain predictions intelligently instead of always returning a species.
10. Produce measurable research results suitable for a college project, demo, interview, or hackathon.

---

# 3. What We Build vs What We Reuse

## We build

These are the main project contributions:

- Coimbatore/Tamil Nadu-focused tree image dataset
- Dataset cleaning and labeling pipeline
- Model training and comparison
- Tree-specific classification model
- Confidence/uncertainty handling
- Multi-evidence identification workflow
- Explainable AI visualization
- Tree information database
- Local biodiversity/tree mapping
- Observation/verification workflow
- Android application
- Evaluation dashboard/report

## We reuse

Use established technologies instead of reinventing them:

- MobileNetV3 / EfficientNet-Lite architecture
- TensorFlow/Keras or PyTorch for experimentation
- TensorFlow Lite/LiteRT-compatible deployment for Android
- OpenCV/Pillow for image preprocessing
- React Native/Expo for the mobile UI
- Firebase/Firestore for optional cloud data
- Firebase Storage for optional image storage
- OpenStreetMap-compatible mapping libraries/services
- Git/GitHub for version control

**Important:** Clearly document every external dataset, pretrained model, API, and library and follow its license/terms.

---

# 4. Recommended Technical Architecture

```text
                 ┌──────────────────────┐
                 │      Android App     │
                 │ React Native / Expo  │
                 └──────────┬───────────┘
                            │
                     Camera / Gallery
                            │
                            ▼
                 ┌──────────────────────┐
                 │ Image Preprocessing  │
                 │ Resize / Normalize   │
                 └──────────┬───────────┘
                            │
                            ▼
                 ┌──────────────────────┐
                 │ On-device AI Model   │
                 │ MobileNetV3 /        │
                 │ EfficientNet-Lite    │
                 └──────────┬───────────┘
                            │
                  Top predictions + score
                            │
               ┌────────────┴────────────┐
               ▼                         ▼
       High confidence              Low confidence
               │                         │
               ▼                         ▼
        Species result          Ask for more evidence
                                  Leaf / bark / whole tree
               │                         │
               └────────────┬────────────┘
                            ▼
                 ┌──────────────────────┐
                 │ Tree Knowledge Base  │
                 └──────────┬───────────┘
                            ▼
             Botanical + Ecological Info
                            │
             ┌──────────────┴─────────────┐
             ▼                            ▼
       Explainable AI               Tree Observation
       Heatmap/regions                  + Location
             │                            │
             └──────────────┬─────────────┘
                            ▼
                 Local Biodiversity Map
```

---

# 5. AI Model Strategy

## Phase 1 — Baseline

Start with:

**MobileNetV3**

Why:

- Lightweight
- Fast inference
- Suitable for mobile deployment
- Transfer learning friendly
- Good starting point for a college project

## Phase 2 — Comparison

Train/evaluate at least:

1. MobileNetV3
2. EfficientNet-Lite
3. Optional: a stronger server-side/reference model

Compare:

- Accuracy
- Precision
- Recall
- F1-score
- Top-1 accuracy
- Top-3 accuracy
- Model size
- Inference time
- Memory usage
- Mobile performance

Do not select a model only because it has the highest accuracy. The final choice should consider the complete accuracy-vs-speed-vs-size tradeoff.

---

# 6. Dataset Strategy

## Target

Start with approximately **30–50 common tree species**.

Do not begin with hundreds of species.

For each species try to collect:

- Leaf images
- Whole-tree images
- Bark/trunk images
- Flower/fruit images where useful
- Different lighting conditions
- Different camera angles
- Different growth stages
- Outdoor/background variation

### Recommended initial dataset target

Aim for roughly:

**300–500+ usable images/species**

This is a target, not a requirement. Start smaller for the prototype and expand after the first evaluation.

---

# 7. Suggested Initial Species Categories

Create a final species list after validating local availability and dataset availability.

Examples:

- Neem
- Mango
- Tamarind
- Banyan
- Peepal
- Jamun
- Guava
- Jackfruit
- Indian almond
- Rain tree
- Gulmohar
- Pungam
- Teak
- Eucalyptus
- Casuarina
- Palmyra
- Drumstick
- Amla
- Golden shower
- Arjun
- Kadamba
- Ashoka
- Copperpod
- Siris
- Vaagai
- Vengai
- Poovarasu
- Silk cotton
- Sandalwood
- Rosewood

Expand toward 50 species after the first prototype.

---

# 8. Data Collection & Dataset Rules

Create this structure:

```text
dataset/
├── raw/
│   ├── neem/
│   ├── mango/
│   └── ...
│
├── cleaned/
│   ├── neem/
│   ├── mango/
│   └── ...
│
├── train/
├── validation/
└── test/
```

Recommended split:

- Train: 70%
- Validation: 15%
- Test: 15%

Avoid leakage.

For example, photographs of the **same physical tree** should not be randomly distributed across train and test sets. Otherwise the model may appear more accurate than it really is.

---

# 9. Data Augmentation

Use realistic augmentation such as:

- Rotation
- Horizontal flip where biologically appropriate
- Small crop/zoom
- Brightness changes
- Contrast changes
- Slight blur
- Small perspective changes

Avoid transformations that make the tree biologically unrealistic.

---

# 10. Preprocessing Pipeline

Example:

```text
Camera image
     ↓
Crop / quality check
     ↓
Resize
     ↓
Normalize
     ↓
AI model
     ↓
Class probabilities
```

Add an image-quality check later to reject:

- Extremely blurry images
- Very dark images
- Images without useful tree/leaf content

---

# 11. Unique Feature #1 — Confidence-Aware Identification

Do not always display:

> "This is Neem."

Instead show:

```text
Prediction: Neem
Confidence: 91%

Alternative:
1. Neem       91%
2. Jamun       5%
3. Pungam      2%
```

Define confidence thresholds through validation experiments.

Example workflow:

```text
Confidence >= threshold
        ↓
Show identification

Confidence < threshold
        ↓
Ask user for another image
```

This makes the system more realistic.

---

# 12. Unique Feature #2 — Multi-Evidence Identification

If the first image is uncertain, the app can request additional evidence.

Example:

```text
Step 1 → Photograph leaf
             ↓
        Prediction uncertain
             ↓
Step 2 → Photograph bark
             ↓
        Combine evidence
             ↓
Step 3 → Optional whole-tree image
             ↓
       Final prediction
```

Possible future implementation:

```text
Leaf model
    +
Bark model
    +
Whole-tree model
    ↓
Evidence Fusion
    ↓
Final Species
```

For the first version, implement single-image classification. Add multi-evidence fusion after the baseline works.

---

# 13. Unique Feature #3 — Explainable AI

Add an explainability module.

Possible technique:

**Grad-CAM / related visual explanation method**

Example result:

```text
AI Prediction: Mango

Highlighted region:
[leaf area used strongly by model]

Confidence: 94%
```

This helps demonstrate that the project is not simply a black-box classifier.

---

# 14. Unique Feature #4 — Coimbatore Tree Map

Allow users to record observations:

```text
Species
Location
Date
Photo
Confidence
Verification status
```

Display observations on a map.

Example:

```text
        COIMBATORE
   ● Neem
        ● Mango
 ● Rain Tree

        ● Banyan
```

This creates a local biodiversity dataset over time.

Important:

- Obtain appropriate user permission before collecting location.
- Do not expose precise private residential locations by default.
- Provide an option to use approximate/public locations.

---

# 15. Unique Feature #5 — Tree Health Module

Keep this as an optional future module.

The user photographs a tree and the system may detect visible signs such as:

- Leaf discoloration
- Severe leaf damage
- Visible fungal-like symptoms
- Broken/damaged branches

Do **not** present the result as a professional diagnosis.

Use wording such as:

> "Possible visible stress indicators detected."

This module should be separate from species identification because it is a different ML problem.

---

# 16. Tree Information System

After identification show:

### Basic information

- Common name
- Scientific name
- Family
- Local/common names

### Botanical information

- Leaf characteristics
- Bark characteristics
- Flower
- Fruit
- Height/range

### Ecological information

- Habitat
- Native/introduction status where verified
- Ecological importance
- Pollinator/wildlife relevance

### Human uses

- Timber
- Food
- Traditional uses
- Shade/urban planting

### Conservation

- Conservation information from authoritative sources
- Threat category where applicable

Always cite the source used for factual conservation information.

---

# 17. Recommended App Screens

```text
Splash
  ↓
Onboarding
  ↓
Home
 ├── Identify Tree
 ├── Upload Image
 ├── Tree Library
 ├── Biodiversity Map
 ├── My Observations
 └── About / Sources
```

### Identification flow

```text
Identify Tree
      ↓
Camera / Gallery
      ↓
Image Quality Check
      ↓
Prediction
      ↓
Result
 ├── Species
 ├── Confidence
 ├── Alternatives
 ├── Explainability
 └── Tree Information
```

---

# 18. Technology Stack

## AI/ML

- Python
- TensorFlow
- Keras
- OpenCV
- Pillow
- NumPy
- Pandas
- scikit-learn
- Matplotlib

## Model

- MobileNetV3
- EfficientNet-Lite
- Transfer Learning
- Grad-CAM / explainability method

## Mobile

Recommended:

- React Native
- Expo during development where compatible
- Android APK/AAB build workflow

For direct native ML integration, verify the current TensorFlow Lite/LiteRT React Native integration options before implementation.

## Backend / Cloud

Optional:

- Firebase Authentication
- Firestore
- Firebase Storage
- Firebase Analytics

The core prediction should remain capable of working offline if on-device inference is the project goal.

## Maps

- OpenStreetMap-based mapping
- React Native compatible map library

## Development

- Git
- GitHub
- VS Code
- Android Studio
- Python virtual environment

---

# 19. Database Design

Example Firestore structure:

```text
species/
  neem/
    commonName
    scientificName
    family
    description
    uses
    ecology
    conservation
    imageUrls

observations/
  observationId/
    species
    latitude
    longitude
    date
    confidence
    imageUrl
    verificationStatus
    userId
```

For privacy, consider storing generalized/rounded coordinates for public map display.

---

# 20. ML Training Pipeline

```text
Collect data
     ↓
Verify species labels
     ↓
Clean duplicates
     ↓
Remove poor images
     ↓
Train/validation/test split
     ↓
Augmentation
     ↓
Transfer learning
     ↓
Train classifier
     ↓
Validate
     ↓
Tune
     ↓
Test on unseen images
     ↓
Compare models
     ↓
Export model
     ↓
Quantization
     ↓
Mobile deployment
```

---

# 21. Model Optimization

After achieving a good baseline, investigate:

- Float16 quantization
- Integer quantization
- Input resolution optimization
- Model pruning if necessary

Measure:

```text
Original model size
↓
Optimized model size

Original accuracy
↓
Optimized accuracy

Original inference time
↓
Optimized inference time
```

Do not optimize blindly; report the accuracy/size tradeoff.

---

# 22. Evaluation

Your report should include:

### Classification metrics

- Accuracy
- Precision
- Recall
- F1-score
- Top-3 accuracy
- Confusion matrix

### Deployment metrics

- Model size
- Average inference time
- RAM usage if measurable
- APK/AAB size
- Offline functionality

### Robustness testing

Test using:

- Bright sunlight
- Shade
- Low light
- Different backgrounds
- Different phones
- Different distances
- Partial leaf visibility
- Similar-looking species

---

# 23. Research Questions

Your project can investigate:

1. How accurately can lightweight CNN models identify common Coimbatore/Tamil Nadu tree species?
2. How does MobileNetV3 compare with EfficientNet-Lite for mobile tree identification?
3. How much does dataset diversity affect real-world accuracy?
4. Does confidence-aware questioning reduce incorrect predictions?
5. Does multi-evidence identification improve difficult species classification?
6. What accuracy/latency trade-off results from quantization?
7. Can explainability improve user understanding of AI predictions?

---

# 24. Existing-System Research

Before implementation, study existing systems such as:

- PlantNet
- iNaturalist
- Google Lens / visual search
- Seek by iNaturalist
- Other regional plant-identification applications

For each system document:

```text
System
↓
Main identification method
↓
Supported plants
↓
Offline capability
↓
Location/mapping
↓
Explainability
↓
User observations
↓
Limitations
```

Do not claim a feature is absent without verifying the current version/documentation.

Your goal is not to copy an existing application. Your project should focus on:

**local specialization + mobile AI + uncertainty handling + explainability + biodiversity mapping.**

---

# 25. Differentiation / Innovation Statement

Use a statement similar to:

> "An offline-first, Coimbatore/Tamil Nadu-focused AI tree identification system that combines lightweight on-device deep learning, confidence-aware multi-evidence identification, explainable AI, and a community-driven local biodiversity map."

This is substantially stronger than:

> "An app that identifies trees using AI."

---

# 26. Development Roadmap

## Phase 0 — R&D

- Study existing applications
- Finalize species list
- Identify legally usable datasets
- Define evaluation methodology

## Phase 1 — Dataset

- Collect images
- Label images
- Clean dataset
- Create train/validation/test sets

## Phase 2 — Baseline AI

- Implement MobileNetV3
- Train classifier
- Evaluate
- Generate confusion matrix

## Phase 3 — Model Comparison

- Train EfficientNet-Lite
- Compare metrics
- Select deployment model using measured results

## Phase 4 — Optimization

- Quantization
- Mobile inference testing
- Performance benchmarking

## Phase 5 — Mobile App

- React Native UI
- Camera/gallery
- Image preprocessing
- On-device model inference
- Result screen

## Phase 6 — Knowledge System

- Tree information database
- Sources/references
- Search/tree library

## Phase 7 — Advanced AI

- Confidence threshold
- Alternative predictions
- Grad-CAM/explainability
- Multi-evidence workflow

## Phase 8 — Biodiversity Map

- Observation creation
- Map
- Verification
- Privacy controls

## Phase 9 — Testing

- Functional testing
- ML evaluation
- Real-world field testing
- Device testing

## Phase 10 — Final Deliverables

- Android APK/AAB
- Trained model
- Dataset documentation
- Source code
- Research report
- Presentation
- Demo video
- GitHub repository
- Model evaluation report

---

# 27. Suggested Repository Structure

```text
smart-tree-ai/
│
├── app/
│   ├── screens/
│   ├── components/
│   ├── services/
│   ├── models/
│   └── assets/
│
├── ml/
│   ├── notebooks/
│   ├── training/
│   ├── preprocessing/
│   ├── evaluation/
│   └── export/
│
├── dataset/
│   └── README.md
│
├── backend/
│   ├── firestore/
│   └── functions/
│
├── docs/
│   ├── research.md
│   ├── architecture.md
│   └── model-evaluation.md
│
├── tests/
│
├── README.md
└── LICENSE
```

---

# 28. MVP Definition

The first working version should contain only:

- 10–20 tree species
- Image capture/upload
- MobileNetV3 classifier
- On-device inference
- Prediction + confidence
- Tree information page
- Basic offline support

Once this works, expand toward:

- 30–50 species
- Explainability
- Multi-evidence identification
- Biodiversity map
- Cloud synchronization
- Verification system

---

# 29. Hackathon/Demo Pitch

### Problem

Generic plant identification tools are not specifically optimized around local tree biodiversity, offline field usage, uncertainty handling, and community-level biodiversity observations.

### Solution

An AI-powered mobile system designed around local tree species that can identify a tree from an image, explain the prediction, request additional evidence when uncertain, provide verified information, and build a local biodiversity map.

### Key technologies

**Computer Vision + Deep Learning + Mobile AI + Explainable AI + GIS + Cloud**

### Impact

- Environmental education
- Student learning
- Local biodiversity documentation
- Tree awareness
- Potential citizen-science applications
- Offline field identification

---

# 30. Important Success Criteria

Do not claim "high accuracy" until it is measured on an independent test set.

Set project targets experimentally.

For example, track:

```text
Target species: 30–50
Test images: independent from training data
Top-1 accuracy: measured
Top-3 accuracy: measured
Inference time: measured on target phone
Model size: measured
Offline operation: demonstrated
```

The final report should clearly distinguish:

- Training accuracy
- Validation accuracy
- Test accuracy
- Real-world field accuracy

---

# 31. First 7-Day Action Plan

### Day 1
- Finalize project scope
- Finalize first 10–20 species
- Research existing applications
- Create GitHub repository

### Day 2
- Find legal/free datasets
- Collect initial images
- Create dataset structure

### Day 3
- Clean and label data
- Create train/validation/test splits

### Day 4
- Implement MobileNetV3 transfer learning
- Train first model

### Day 5
- Evaluate model
- Generate confusion matrix
- Identify difficult species

### Day 6
- Start React Native app
- Implement camera/gallery workflow

### Day 7
- Integrate exported model
- Demonstrate first end-to-end prediction

---

# 33. Swin Transformer Transfer Learning Experiment (2026-09-25)

## Objective
Evaluate whether fine-tuning a pretrained Swin Transformer (OttoYu/TreeClassification) improves TreeVision's 41-class accuracy compared to the MobileNetV3 baseline.

## Pretrained Model
- **Model:** `OttoYu/TreeClassification` (Swin Transformer)
- **Architecture:** Swin Transformer (depths=[2,2,18,2], embed_dim=128, 86.8M params)
- **Original task:** 13-class tree classification (tropical/subtropical species)
- **Source:** https://huggingface.co/OttoYu/TreeClassification
- **License:** Verify before production use

## Experimental Setup
- **Data:** TreeVision 41-class MVP (configs/classes_41.txt)
- **Split:** train 7477 / val 1532 / test 1586 (treeID-grouped)
- **Fine-tuning strategy:** Two-phase (2 epochs frozen backbone + 3 epochs full)
- **Optimizer:** AdamW (backbone LR=1e-5, classifier LR=1e-4, WD=0.01)
- **Mixed precision:** FP16
- **Batch size:** 8 (VRAM-limited)
- **5-epoch pilot** before full training decision

## Results Summary

| Metric | MobileNetV3 Baseline | Swin Fine-tuned | Delta |
|---|---|---|---|
| Validation Top-1 | 65.8% | **85.77%** | +19.97% |
| Test Top-1 | 65.3% | **85.75%** | +20.45% |
| Validation Top-3 | ~80.3% | **93.67%** | +13.37% |
| Test Top-3 | ~79.8% | **93.38%** | +13.58% |
| Test Macro F1 | ~55% | **81.98%** | +27% |
| Parameters | 4.25M | 86.8M | 20.4x |
| FP32 Size | ~17 MB | 331.5 MB | 19.5x |
| GPU Inference | ~5-10 ms | 76 ms | 10-15x slower |

## Key Findings

1. **Significant accuracy improvement:** Swin achieves +20% absolute Top-1 accuracy over MobileNetV3 baseline
2. **Macro F1 jump:** +27% (55% → 82%), meaning previously weak classes now perform well
3. **No overfitting in 5 epochs:** Both train and validation losses decrease steadily
4. **All dataset checks pass:** TreeID leakage PASS, Class mapping PASS, Integrity PASS

## Mobile Deployment Assessment

| Factor | MobileNetV3 | Swin | Verdict |
|---|---|---|---|
| Model size (FP32) | 17 MB | 331 MB | Swin too large |
| Model size (FP16) | 8.5 MB | 166 MB | Swin too large |
| Inference time (GPU) | 5-10 ms | 76 ms | Swin 10x slower |
| FPS (GPU) | 100-200 | 13 | Swin too slow for real-time |

**Verdict:** Swin is **unsuitable for mobile deployment** without:
- INT8 quantization (target: <50 MB)
- ONNX export + TensorRT/ONNX Runtime optimization
- Possible architecture distillation

## Decision
- **Server/cloud deployment:** Use Swin for maximum accuracy
- **Mobile/edge deployment:** Continue with MobileNetV3 baseline
- **50-class experiment:** Deferred until thin species have ≥150 images/class
- **Future work:** Swin distillation to MobileNetV3, INT8 quantization pipeline

## Artifacts
All artifacts saved to `artifacts/swin_41/`:
- `best_model/` — Hugging Face compatible export
- `best_torch.pth` — PyTorch checkpoint
- `confusion_matrix_val.png`, `confusion_matrix_test.png`
- `classification_report_val.txt`, `classification_report_test.txt`
- `per_class_metrics_val.csv`, `per_class_metrics_test.csv`
- `training_history.csv`, `training_curves.png`
- `metrics.json`, `treevision_41_class_mapping.json`
- `treeid_split_check.txt` (PASS)
- `mobile_benchmark.json`

---

# 32. Final Project Goal

The final system should demonstrate this complete workflow:

```text
User finds a tree
       ↓
Opens mobile application
       ↓
Takes leaf/tree photograph
       ↓
AI performs on-device inference
       ↓
Prediction + confidence
       ↓
If uncertain → request additional evidence
       ↓
Explainable AI result
       ↓
Botanical/ecological information
       ↓
User optionally records observation
       ↓
Local biodiversity map updated
```

## Final positioning

This should be presented as a **local AI biodiversity intelligence platform**, not merely a tree-classification app.

The most important implementation strategy is:

**Build the simple classifier first → measure it → improve it → add advanced features one by one.**
