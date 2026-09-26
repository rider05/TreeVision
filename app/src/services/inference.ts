// TreeVision Inference Service
// Real on-device inference using ONNX Runtime (Expo/React Native)
// Loads model from app/assets/ and runs actual neural network inference

import { Platform, NativeModules } from 'react-native';
import Constants, { ExecutionEnvironment } from 'expo-constants';
import * as FileSystem from 'expo-file-system/legacy';
import { Asset } from 'expo-asset';
import { manipulateAsync, SaveFormat } from 'expo-image-manipulator';
import { decode } from 'base64-arraybuffer';
import * as jpeg from 'jpeg-js';
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

// Model binaries bundled via Metro (see metro.config.js `assetExts`).
// Metro requires static `require(...)` calls — dynamic template paths like
// require(`../assets/${name}`) fail at bundle time with "Invalid call".
// eslint-disable-next-line @typescript-eslint/no-require-imports
const MOBILENET_MODEL_MODULE = require('../../assets/mobilenetv3_41.onnx');

// NOTE: swin_41.pt is a TorchScript checkpoint, not ONNX, so it cannot be
// loaded by onnxruntime-react-native. Only mobilenetv3 is bundled for now.
const MODEL_MODULES = {
  mobilenetv3: { model: MOBILENET_MODEL_MODULE },
} as const;

// onnxruntime-react-native ships native code that only exists in a dev build
// (not in Expo Go, not on web). A top-level import evaluates the native
// binding at load time and crashes every importing screen with
// "Cannot read property 'install' of null", so the module is loaded lazily
// inside initializeInference instead.
let Ort: typeof import('onnxruntime-react-native') | null = null;

export const isExpoGo =
  Constants.executionEnvironment === ExecutionEnvironment.StoreClient ||
  Constants.appOwnership === 'expo';

/**
 * Detect whether ONNX Runtime native module is available.
 * In Expo Go or Web, native modules like onnxruntime-react-native are not present.
 * In a development build (npx expo run:android or EAS build), it is present.
 */
export function isOrtNativeAvailable(): boolean {
  if (Platform.OS === 'web' || isExpoGo) return false;
  try {
    return Boolean(
      NativeModules &&
      NativeModules.Onnxruntime &&
      typeof NativeModules.Onnxruntime.install === 'function'
    );
  } catch {
    return false;
  }
}

function loadOrtModule(): typeof import('onnxruntime-react-native') {
  if (Platform.OS === 'web') {
    throw new Error('On-device inference is not supported on web. Use an Android/iOS dev build.');
  }
  if (!isOrtNativeAvailable()) {
    throw new Error(
      'ONNX Runtime native module is missing. Use a dev client instead of Expo Go: ' +
        'npx expo run:android (local) or eas build --profile development (cloud).'
    );
  }
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const mod = require('onnxruntime-react-native');
    // Metro's guardedLoadModule swallows native-init failures and returns
    // undefined instead of throwing, so validate the module shape here —
    // otherwise this fails later as "InferenceSession of undefined".
    if (!mod?.InferenceSession || !mod?.Tensor) {
      throw new Error('native binding unavailable');
    }
    return mod;
  } catch (err) {
    throw new Error(
      'ONNX Runtime native module is missing or failed to initialize: ' +
        (err instanceof Error ? err.message : String(err))
    );
  }
}

type ModelType = 'mobilenetv3' | 'swin';

// Singleton model session
let ortSession: any = null;
let currentModelType: ModelType = 'mobilenetv3';
let modelLoaded = false;
let loadError: string | null = null;

/**
 * Stage the bundled .onnx into app storage, reporting download progress.
 * Dev builds serve the asset over http(s) from Metro → byte-level progress.
 * Release builds embed it → expo-asset resolves locally, progress is
 * indeterminate (single jump when done).
 */
async function stageModelAssetWithProgress(
  asset: Asset,
  targetUri: string,
  onProgress?: (bytesWritten: number, totalBytes: number | null) => void
): Promise<void> {
  const sourceUri = asset.uri;
  if (sourceUri && (sourceUri.startsWith('http://') || sourceUri.startsWith('https://'))) {
    const dl = FileSystem.createDownloadResumable(sourceUri, targetUri, {}, (p) => {
      const total = p.totalBytesExpectedToWrite;
      onProgress?.(p.totalBytesWritten, total && total > 0 ? total : null);
    });
    await dl.downloadAsync();
    onProgress?.(1, 1);
    return;
  }
  await asset.downloadAsync();
  const localUri = asset.localUri ?? asset.uri;
  if (!localUri) {
    throw new Error('Model asset could not be resolved to a local file.');
  }
  await FileSystem.copyAsync({ from: localUri, to: targetUri });
  onProgress?.(1, 1);
}

/**
 * Initialize ONNX Runtime and load model
 * Call once at app startup
 */
export async function initializeInference(
  modelType: ModelType = 'mobilenetv3',
  onDownload?: (bytesWritten: number, totalBytes: number | null) => void
): Promise<void> {
  if (modelLoaded && currentModelType === modelType) {
    return; // Already loaded
  }
  if (modelType !== 'mobilenetv3') {
    throw new Error(
      `Model '${modelType}' is not bundled: only mobilenetv3_41.onnx can be ` +
        `loaded by ONNX Runtime. swin_41.pt is a TorchScript file, not ONNX.`
    );
  }

  if (!isOrtNativeAvailable()) {
    console.warn(
      '[TreeVision] ONNX Runtime native module unavailable (running in Expo Go / Web). ' +
        'Dev build required for real on-device neural network inference: npx expo run:android'
    );
    loadError = 'Running in Expo Go (dev build required for ONNX inference)';
    return;
  }

  try {
    Ort = loadOrtModule();
    const modelsDir = `${FileSystem.documentDirectory}models/`;
    const dirInfo = await FileSystem.getInfoAsync(modelsDir);
    if (!dirInfo.exists) {
      await FileSystem.makeDirectoryAsync(modelsDir, { intermediates: true });
    }
    const stagedModelUri = `${modelsDir}mobilenetv3_41.onnx`;
    const stagedModelInfo = await FileSystem.getInfoAsync(stagedModelUri);
    if (!stagedModelInfo.exists) {
      await stageModelAssetWithProgress(
        Asset.fromModule(MODEL_MODULES.mobilenetv3.model),
        stagedModelUri,
        onDownload
      );
    }

    // Default (CPU) execution provider — matches official onnxruntime-react-native usage:
    const session = await Ort.InferenceSession.create(stagedModelUri);

    ortSession = session;
    currentModelType = modelType;
    modelLoaded = true;
    loadError = null;

    console.log(`[TreeVision] Model loaded: ${modelType}`);
    const inputMeta = session.inputMetadata[0] as any;
    const outputMeta = session.outputMetadata[0] as any;
    console.log(`[TreeVision] Input: ${inputMeta.name} ${inputMeta.type} ${inputMeta.shape}`);
    console.log(`[TreeVision] Output: ${outputMeta.name} ${outputMeta.type} ${outputMeta.shape}`);
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
 * Resize to 224x224, decode image to RGB pixels, normalize with ImageNet stats, convert to tensor
 */
async function preprocessImage(imageUri: string): Promise<any> {
  // Sample leaves are remote URLs — cache them locally first so every photo,
  // local or remote, goes through the same real preprocessing + inference.
  let localUri = imageUri;
  if (imageUri.startsWith('http://') || imageUri.startsWith('https://')) {
    const cacheDir = `${FileSystem.documentDirectory}incoming/`;
    const dirInfo = await FileSystem.getInfoAsync(cacheDir);
    if (!dirInfo.exists) {
      await FileSystem.makeDirectoryAsync(cacheDir, { intermediates: true });
    }
    const target = `${cacheDir}sample-${Date.now()}.jpg`;
    const dl = await FileSystem.downloadAsync(imageUri, target);
    localUri = dl.uri;
  }

  // Use expo-image-manipulator to resize and convert to JPEG (handles PNG, JPEG, etc.)
  const manipulated = await manipulateAsync(
    localUri,
    [{ resize: { width: MODEL_INPUT_SIZE, height: MODEL_INPUT_SIZE } }],
    {
      format: SaveFormat.JPEG,
      base64: true,
      compress: 0.9,
    }
  );

  const imgBase64 = manipulated.base64;
  if (!imgBase64) {
    throw new Error('Image manipulation failed: base64 data missing.');
  }

  const imgBuffer = decode(imgBase64);
  const rawImage = jpeg.decode(imgBuffer, { useTArray: true });
  const { data, width, height } = rawImage;

  const area = width * height;
  const input = new Float32Array(3 * area);

  // Layout: CHW (Channel, Height, Width) with ImageNet mean/std normalization
  for (let i = 0; i < area; i++) {
    const rgbaIdx = i * 4;
    const r = data[rgbaIdx] / 255.0;
    const g = data[rgbaIdx + 1] / 255.0;
    const b = data[rgbaIdx + 2] / 255.0;

    input[i] = (r - MODEL_MEAN[0]) / MODEL_STD[0];
    input[i + area] = (g - MODEL_MEAN[1]) / MODEL_STD[1];
    input[i + 2 * area] = (b - MODEL_MEAN[2]) / MODEL_STD[2];
  }

  if (!Ort) {
    throw new Error('Model not loaded. Call initializeInference() first.');
  }
  return new Ort.Tensor('float32', input, [1, 3, height, width]);
}

/**
 * Run real on-device inference on an image.
 *
 * Realtime predictions only: there are no mock, forced-species, or simulated
 * fallbacks anywhere in this path. If the ONNX Runtime native module is
 * unavailable (Expo Go / web), this throws a clear error instead of
 * fabricating a result — run a dev build for actual inference.
 */
export async function predictTree(
  imageUri: string,
  options?: {
    modelType?: ModelType;
    /** Phase transitions: 'model' while staging/loading, 'inference' while running. */
    onPhase?: (phase: 'model' | 'inference') => void;
    /** Model-download progress; totalBytes is null when size is unknown. */
    onModelDownload?: (bytesWritten: number, totalBytes: number | null) => void;
  }
): Promise<Prediction> {
  const startTime = Date.now();
  const modelType = options?.modelType || 'mobilenetv3';

  // No native module, no prediction — never fabricate one.
  if (!isOrtNativeAvailable()) {
    throw new Error(
      'Real-time inference needs a dev build with the ONNX Runtime native module. ' +
        'Run `npx expo run:android` (local) or `eas build --profile development` (cloud).'
    );
  }

  // 3. Real ONNX Runtime inference on Android/iOS dev build
  if (!modelLoaded || currentModelType !== modelType) {
    options?.onPhase?.('model');
    await initializeInference(modelType, options?.onModelDownload);
  }
  options?.onPhase?.('inference');

  if (!ortSession) {
    throw new Error('Model not loaded. Call initializeInference() first.');
  }

  // Preprocess image
  const inputTensor = await preprocessImage(imageUri);

  // Run inference
  const feeds: Record<string, any> = {};
  const inputMeta = ortSession.inputMetadata[0] as any;
  feeds[inputMeta.name] = inputTensor;

  const results = await ortSession.run(feeds);
  const outputMeta = ortSession.outputMetadata[0] as any;
  const logits = results[outputMeta.name];

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

  // Non-tree gate (real model output only).
  const rawConfidence = probs[primaryIdx];
  const rawMargin = probs[indices[0]] - probs[indices[1]];
  const energy = computeEnergy(logits.data as Float32Array);
  const nonTreeReason = detectNonTreeReason(rawConfidence, rawMargin, energy);
  if (nonTreeReason) {
    const rejected = buildPrediction(primaryTree, rawConfidence, alternatives, latencyMs, modelType, true);
    rejected.imageUri = imageUri;
    rejected.isNonTree = true;
    rejected.rejectionReason = nonTreeReason;
    rejected.evidenceNotes =
      `Closest match was ${primaryTree.commonName} at ${(rawConfidence * 100).toFixed(1)}% — ` +
      'below the acceptance bar for a reliable identification.';
    return rejected;
  }

  const pred = buildPrediction(primaryTree, confidence, alternatives, latencyMs, modelType, needsMoreEvidence);
  pred.imageUri = imageUri;
  return pred;
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

// ---------------------------------------------------------------------------
// Non-tree / out-of-distribution gate
//
// The 41-class softmax always sums to 1, so a photo of a person, vehicle, or
// building still "predicts" some species. Reject the photo when ALL of these
// hold on the RAW (pre-override) probabilities:
//   1. top-1 confidence below NON_TREE_MIN_CONFIDENCE,
//   2. top-1/top-2 margin below NON_TREE_MIN_MARGIN (model can't pick a winner),
//   3. energy above NON_TREE_MAX_ENERGY (flat logit distribution = unfamiliar
//      input), where energy = -logsumexp(logits).
//
// Conjunctive on purpose: a hard-but-real tree photo should fall through to
// "needs more evidence", never to a false rejection.
//
// These defaults are UNCALIBRATED starting points. Calibrate with ~50 real
// non-tree photos plus the validation set: log (confidence, margin, energy)
// for both groups and pick thresholds that reject OOD while keeping
// validation recall near 100%.
// ---------------------------------------------------------------------------
const NON_TREE_MIN_CONFIDENCE = 0.30;
const NON_TREE_MIN_MARGIN = 0.08;
const NON_TREE_MAX_ENERGY = -4.0;

function computeEnergy(logitArray: Float32Array): number {
  let max = -Infinity;
  for (let i = 0; i < logitArray.length; i++) {
    if (logitArray[i] > max) max = logitArray[i];
  }
  let sum = 0;
  for (let i = 0; i < logitArray.length; i++) {
    sum += Math.exp(logitArray[i] - max);
  }
  return -(max + Math.log(sum));
}

function detectNonTreeReason(confidence: number, margin: number, energy: number): string | null {
  if (confidence >= NON_TREE_MIN_CONFIDENCE) return null;
  if (margin >= NON_TREE_MIN_MARGIN) return null;
  if (energy <= NON_TREE_MAX_ENERGY) return null;
  return (
    `No confident match (best ${(confidence * 100).toFixed(1)}%, margin ${(margin * 100).toFixed(1)}%). ` +
    'This photo may not show a tree, or the tree is too far, blurry, or occluded.'
  );
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

// Type for filter (avoid duplicate declaration)
export type { LibraryFilter } from '../types';