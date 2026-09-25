// Inference service interface — the contract the on-device model must implement.
// MOCK implementation today. Replace predictTree() internals with the LiteRT
// dev-client native module once artifacts/best model is exported to .tflite.
// See docs/architecture.md. Threshold MUST be tuned on validation (selective
// accuracy/coverage), 0.6 here is a placeholder.
import trees from "../data/trees.json";

export interface Alternative {
  speciesId: string;
  commonName: string;
  confidence: number;
}

export interface Prediction {
  speciesId: string;
  commonName: string;
  scientificName: string;
  confidence: number;
  alternatives: Alternative[];
  latencyMs: number;
  engine: "mock" | "litert";
  needsMoreEvidence: boolean;
}

export const CONFIDENCE_THRESHOLD = 0.6;

export type TreeInfo = (typeof trees)[number];

export function getTree(speciesId: string): TreeInfo | undefined {
  return trees.find((t) => t.id === speciesId);
}

export function getAllTrees(): TreeInfo[] {
  return trees;
}

// Deterministic mock so screenshots are reproducible. DO NOT SHIP as real.
export async function predictTree(imageUri: string): Promise<Prediction> {
  const t0 = Date.now();
  await new Promise((r) => setTimeout(r, 600));
  let h = 0;
  for (const c of imageUri) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  const top = trees[h % trees.length];
  const conf = 0.35 + ((h >> 8) % 60) / 100;
  const alts: Alternative[] = [1, 2].map((k) => {
    const t = trees[(h % trees.length + k * 7) % trees.length];
    return { speciesId: t.id, commonName: t.commonName, confidence: Math.max(0.01, (conf - k * 0.18) / 2) };
  });
  return {
    speciesId: top.id,
    commonName: top.commonName,
    scientificName: top.scientificName,
    confidence: conf,
    alternatives: alts,
    latencyMs: Date.now() - t0,
    engine: "mock",
    needsMoreEvidence: conf < CONFIDENCE_THRESHOLD,
  };
}
