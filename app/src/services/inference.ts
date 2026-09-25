// TreeVision Inference Service
// Real on-device inference using ONNX Runtime (Expo/React Native)
// Loads model from app/assets/ and runs actual neural network inference

import { Platform, PlatformConstants } from 'react-native';
import * as FileSystem from 'expo-file-system';
import * as Asset from 'expo-asset';
import { decode } from 'base64-arraybuffer';
import * as ort from 'onnxruntime-react-native';
import treesData from '../data/trees.json';
import classMappingData from '../../assets/class_mapping.json'; // Generated at build time
import { TreeSpecies, Prediction, PredictionAlternative, LibraryFilter } from '../types';

// Configuration
export const CONFIDENCE_THRESHOLD = 0.6;
const MODEL_INPUT_SIZE = 224;
const MODEL_MEAN = [0.485, 0.456, 0.406];
const MODEL_STD = [0.229, 0.224, 0.225];

const ALL_TREES: TreeSpecies[] = treesData as TreeSpecies[];

// Class mapping: index -> speciesId (matches training checkpoint)
const IDX_TO_CLASS: Record<number, string> = classMappingData;

// Model file paths (bundled in app)
const MODEL_FILES = {
  mobilenetv3: 'mobilenetv3_41.onnx',
  swin: 'swin_41.onnx',
} as const;

type ModelType = 'mobilenetv3' | 'swin';

// Singleton model session
let ortSession: ort.InferenceSession | null = null;
let currentModelType: ModelType = 'mobilenetv3';
let modelLoaded = false;
let loadError: string | null = null;

/**
 * Initialize ONNX Runtime and load model
 * Call once at app startup
 */
export async function initializeInference(modelType: ModelType = 'mobilenetv3'): Promise<void> {
  if (modelLoaded && currentModelType === modelType) {
    return; // Already loaded
  }

  try {
    // Initialize ONNX Runtime
    await ort.initialize();
    
    // Get model file path (bundled asset)
    const modelAsset = Asset.fromModule(require(`../assets/${MODEL_FILES[modelType]}`));
    await modelAsset.downloadAsync();
    const modelPath = modelAsset.localUri || modelAsset.uri;
    
    if (!modelPath) {
      throw new Error(`Model file not found: ${MODEL_FILES[modelType]}`);
    }

    // Create inference session
    // For React Native, we use the 'cpu' provider (or 'nnap' for iOS, 'android' for Android)
    const executionProviders = Platform.OS === 'ios' 
      ? ['nnap', 'cpu'] 
      : Platform.OS === 'android'
      ? ['android', 'cpu']
      : ['cpu'];

    ortSession = await ort.InferenceSession.create(modelPath, {
      executionProviders,
      graphOptimizationLevel: 'all',
      enableMemPattern: true,
      enableCpuMemArena: true,
    });

    currentModelType = modelType;
    modelLoaded = true;
    loadError = null;
    
    console.log(`[TreeVision] Model loaded: ${modelType} (${ortSession.inputNames.join(', ')} -> ${ortSession.outputNames.join(', ')})`);
  } catch (error) {
    loadError = error instanceof Error ? error.message : 'Unknown error';
    console.error('[TreeVision] Failed to load model:', loadError);
    throw error;
  }
}

/**
 * Check if model is ready
 */
export function isModelReady(): boolean {
  return modelLoaded && ortSession !== null;
}

/**
 * Get current load error if any
 */
export function getLoadError(): string | null {
  return loadError;
}

/**
 * Preprocess image for model input
 * Resize to 224x224, normalize with ImageNet stats, convert to tensor
 */
async function preprocessImage(imageUri: string): Promise<ort.Tensor> {
  // Load image as base64
  const base64 = await FileSystem.readAsStringAsync(imageUri, {
    encoding: FileSystem.EncodingType.Base64,
  });
  
  // Decode base64 to ArrayBuffer
  const arrayBuffer = decode(base64);
  const bytes = new Uint8Array(arrayBuffer);
  
  // Create image bitmap for processing
  // Use expo-image or create a canvas-like processing
  // For React Native, we'll use a simpler approach: resize via ImageManipulator
  const { manipulateAsync } = await import('expo-image-manipulator');
  
  const manipulated = await manipulateAsync(imageUri, [
    { resize: { width: MODEL_INPUT_SIZE, height: MODEL_INPUT_SIZE } },
  ], {
    format: 'rgba',
    base64: true,
  });
  
  // Convert base64 to Float32Array with normalization
  const imgBase64 = manipulated.base64!;
  const imgBuffer = decode(imgBase64);
  const imgData = new Uint8Array(imgBuffer);
  
  // RGBA -> RGB Float32 [1, 3, 224, 224]
  const input = new Float32Array(1 * 3 * MODEL_INPUT_SIZE * MODEL_INPUT_SIZE);
  
  for (let i = 0; i < MODEL_INPUT_SIZE * MODEL_INPUT_SIZE; i++) {
    const rgbaIdx = i * 4;
    const r = imgData[rgbaIdx] / 255.0;
    const g = imgData[rgbaIdx + 1] / 255.0;
    const b = imgData[rgbaIdx + 2] / 255.0;
    
    // Normalize: (pixel - mean) / std
    input[i] = (r - MODEL_MEAN[0]) / MODEL_STD[0];
    input[i + MODEL_INPUT_SIZE * MODEL_INPUT_SIZE] = (g - MODEL_MEAN[1]) / MODEL_STD[1];
    input[i + 2 * MODEL_INPUT_SIZE * MODEL_INPUT_SIZE] = (b - MODEL_MEAN[2]) / MODEL_STD[2];
  }
  
  // Create ONNX tensor: [1, 3, 224, 224]
  return new ort.Tensor('float32', input, [1, 3, MODEL_INPUT_SIZE, MODEL_INPUT_SIZE]);
}

/**
 * Run inference on image
 */
export async function predictTree(
  imageUri: string,
  options?: {
    modelType?: ModelType;
    forcedSpeciesId?: string;
    lowConfidence?: boolean;
  }
): Promise<Prediction> {
  const startTime = Date.now();
  
  // Ensure model is loaded
  const modelType = options?.modelType || 'mobilenetv3';
  if (!modelLoaded || currentModelType !== modelType) {
    await initializeInference(modelType);
  }
  
  if (!ortSession) {
    throw new Error('Model not loaded. Call initializeInference() first.');
  }

  // Handle forced species (for testing)
  if (options?.forcedSpeciesId) {
    const primaryTree = getTree(options.forcedSpeciesId) || ALL_TREES[0];
    return buildPrediction(primaryTree, 0.95, [], Date.now() - startTime, modelType);
  }

  // Preprocess image
  const inputTensor = await preprocessImage(imageUri);
  
  // Run inference
  const feeds: Record<string, ort.Tensor> = {};
  feeds[ortSession.inputNames[0]] = inputTensor;
  
  const results = await ortSession.run(feeds);
  const logits = results[ortSession.outputNames[0]];
  
  // Apply softmax to get probabilities
  const probs = softmax(logits.data as Float32Array);
  
  // Get top-3 predictions
  const topK = 3;
  const indices = getTopKIndices(probs, topK);
  
  // Map to species
  const primaryIdx = indices[0];
  const primarySpeciesId = IDX_TO_CLASS[primaryIdx];
  
  if (!primarySpeciesId) {
    throw new Error(`Unknown class index: ${primaryIdx}`);
  }
  
  const primaryTree = getTree(primarySpeciesId);
  if (!primaryTree) {
    throw new Error(`Species not found in database: ${primarySpeciesId}`);
  }
  
  const confidence = probs[primaryIdx];
  const needsMoreEvidence = confidence < CONFIDENCE_THRESHOLD;
  
  // Build alternatives
  const alternatives: PredictionAlternative[] = [];
  for (let i = 1; i < indices.length; i++) {
    const altIdx = indices[i];
    const altSpeciesId = IDX_TO_CLASS[altIdx];
    if (altSpeciesId) {
      const altTree = getTree(altSpeciesId);
      if (altTree) {
        alternatives.push({
          speciesId: altTree.id,
          commonName: altTree.commonName,
          scientificName: altTree.scientificName,
          confidence: probs[altIdx],
        });
      }
    }
  }
  
  const latencyMs = Date.now() - startTime;
  
  return buildPrediction(primaryTree, confidence, alternatives, latencyMs, modelType, needsMoreEvidence);
}

/**
 * Softmax function
 */
function softmax(logits: Float32Array): Float32Array {
  const maxLogit = Math.max(...logits);
  const exp = new Float32Array(logits.length);
  let sum = 0;
  
  for (let i = 0; i < logits.length; i++) {
    exp[i] = Math.exp(logits[i] - maxLogit);
    sum += exp[i];
  }
  
  for (let i = 0; i < exp.length; i++) {
    exp[i] /= sum;
  }
  
  return exp;
}

/**
 * Get top-k indices from probabilities
 */
function getTopKIndices(probs: Float32Array, k: number): number[] {
  const indexed = Array.from(probs).map((prob, idx) => ({ prob, idx }));
  indexed.sort((a, b) => b.prob - a.prob);
  return indexed.slice(0, k).map(item => item.idx);
}

/**
 * Build prediction result object
 */
function buildPrediction(
  primaryTree: TreeSpecies,
  confidence: number,
  alternatives: PredictionAlternative[],
  latencyMs: number,
  modelType: ModelType,
  needsMoreEvidence?: boolean
): Prediction {
  const conf = Number(confidence.toFixed(3));
  const needsEvidence = needsMoreEvidence ?? (conf < CONFIDENCE_THRESHOLD);
  
  return {
    speciesId: primaryTree.id,
    commonName: primaryTree.commonName,
    tamilName: primaryTree.tamilName,
    scientificName: primaryTree.scientificName,
    confidence: conf,
    alternatives,
    latencyMs,
    engine: `ONNX Runtime (${modelType === 'swin' ? 'Swin Transformer' : 'MobileNetV3'} • ${MODEL_INPUT_SIZE}x${MODEL_INPUT_SIZE})`,
    needsMoreEvidence: needsEvidence,
    imageUri: '', // Will be set by caller
    evidenceNotes: needsEvidence
      ? 'Low confidence margin. Capture bark texture or tree canopy to increase confidence.'
      : 'High confidence leaf venation and serration match.',
  };
}

// Re-export tree data functions
export function getAllTrees(): TreeSpecies[] {
  return ALL_TREES;
}

export function getTree(id: string): TreeSpecies | undefined {
  return ALL_TREES.find((t) => t.id === id);
}

export function searchTrees(query: string, filter: LibraryFilter = 'All'): TreeSpecies[] {
  const normalizedQuery = query.trim().toLowerCase();

  return ALL_TREES.filter((tree) => {
    if (filter === 'Common' && tree.isThin) return false;
    if (filter === 'Western Ghats' && !tree.isWesternGhats) return false;
    if (filter === 'Thin' && !tree.isThin) return false;

    if (!normalizedQuery) return true;

    return (
      tree.commonName.toLowerCase().includes(normalizedQuery) ||
      tree.scientificName.toLowerCase().includes(normalizedQuery) ||
      tree.tamilName.toLowerCase().includes(normalizedQuery) ||
      tree.family.toLowerCase().includes(normalizedQuery) ||
      tree.region.toLowerCase().includes(normalizedQuery)
    );
  });
}

// Sample test images (unchanged)
export const SAMPLE_TEST_LEAVES = [
  {
    name: 'Neem (Veppam)',
    speciesId: 'azadirachta-indica',
    image: 'https://images.unsplash.com/photo-1629853974488-8889ff0a9f5f?auto=format&fit=crop&w=800&q=80',
    description: 'Serrated lanceolate leaflets',
  },
  {
    name: 'Peepal (Arasu)',
    speciesId: 'ficus-religiosa',
    image: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=800&q=80',
    description: 'Classic heart-shape with long drip tip',
  },
  {
    name: 'Banyan (Aalamaram)',
    speciesId: 'ficus-benghalensis',
    image: 'https://images.unsplash.com/photo-1518531933037-91b2f5f229cc?auto=format&fit=crop&w=800&q=80',
    description: 'Leathery oval with prominent ribs',
  },
  {
    name: 'Teak (Thekku)',
    speciesId: 'tectona-grandis',
    image: 'https://images.unsplash.com/photo-1509198397868-475647b2a1e5?auto=format&fit=crop&w=800&q=80',
    description: 'Large rough foliage',
  },
  {
    name: 'Tamarind (Puli)',
    speciesId: 'tamarindus-indica',
    image: 'https://images.unsplash.com/photo-1534447677768-be436bb09401?auto=format&fit=crop&w=800&q=80',
    description: 'Feathery pinnate compound leaflets',
  },
];

// Type for filter
export type LibraryFilter = 'All' | 'Common' | 'Western Ghats' | 'Thin';