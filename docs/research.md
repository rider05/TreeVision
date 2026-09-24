# Phase 0 — Existing-System Research

Fill one row per system before implementation (plan §24). Verify against current docs/app version — do not claim absent without checking.

| System | ID method | Species coverage | Offline | Map | Explainability | Observations | Limitations for our goal |
|--------|-----------|------------------|---------|-----|----------------|--------------|--------------------------|
| PlantNet | CNN + multi-organ | ~45k spp global, strong EU/tropical | partial (flora download) | yes | none user-facing | yes, community validation | not TN-tuned, no confidence workflow, no on-device custom model |
| iNaturalist / Seek | CV model + community ID | broad taxa, research-grade | Seek partial | yes (obscured) | none | yes, research-grade pipeline | generic taxa, needs network for full ID, no TN tree specialization |
| Google Lens | general visual search | broad, web-index dependent | no | no | no | no | online-only, no botanical DB, no biodiversity map |
| Regional apps | varies | narrow | varies | rarely | rarely | rarely | verify per app |

## Differentiation (plan §25)
> Offline-first, Coimbatore/TN-focused tree ID with lightweight on-device DL, confidence-aware multi-evidence flow, Grad-CAM explainability, community biodiversity map.

TODO (owner): install current versions of PlantNet + Seek, test 10 local tree photos each, paste top-1/top-3 + offline behavior into this table.
