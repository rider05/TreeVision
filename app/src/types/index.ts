// TreeVision Types Definition
// Matching app-design.md §5, §6, and §8

export interface TreeSpecies {
  id: string;
  commonName: string;
  tamilName: string;
  scientificName: string;
  family: string;
  region: string;
  habitat: string;
  leafType: string;
  barkDescription: string;
  flowerDescription: string;
  fruitDescription: string;
  uses: string[];
  conservationStatus: string;
  citation: string;
  fieldImagesCount: number;
  occurrenceRecords: number;
  isWesternGhats: boolean;
  isThin: boolean;
  sampleImages: {
    leaf: string;
    bark?: string;
    tree?: string;
  };
}

export interface PredictionAlternative {
  speciesId: string;
  commonName: string;
  scientificName: string;
  confidence: number;
}

export interface Prediction {
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
  gradCamOverlayUri?: string;
  evidenceNotes?: string;
  /** True when the OOD gate rejected the photo as not-a-tree. */
  isNonTree?: boolean;
  /** Human-readable reason, set only when isNonTree is true. */
  rejectionReason?: string;
}

export interface Observation {
  id: string;
  speciesId: string;
  commonName: string;
  scientificName: string;
  tamilName?: string;
  imageUri: string;
  timestamp: string;
  confidence: number;
  latitude: number;
  longitude: number;
  locationName: string;
  status: 'Verified' | 'Pending Field Review';
}

export type LibraryFilter = 'All' | 'Common' | 'Western Ghats' | 'Thin';
