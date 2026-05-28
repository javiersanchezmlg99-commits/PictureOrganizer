/**
 * Two-stage wildlife identification pipeline:
 *   1. MegaDetector v5 — detect animal/person/vehicle bounding boxes
 *   2. iNaturalist ConvNeXt — classify animal crops into 10K species
 *
 * Both models run locally via ONNX Runtime (CPU).
 */

import * as ort from 'onnxruntime-node';
import { nativeImage, type NativeImage } from 'electron';
import path from 'node:path';
import fs from 'node:fs';
import { app } from 'electron';

// ── Types ──────────────────────────────────────────────────────────────

export interface Detection {
  classId: number;
  label: string;
  confidence: number;
  bbox: [number, number, number, number];
}

export interface SpeciesPrediction {
  name: string;
  confidence: number;
}

export interface IdentifyResult {
  /** MegaDetector detections */
  detections: Detection[];
  /** Top species prediction for best animal detection */
  species: SpeciesPrediction | null;
  /** Top-5 species predictions */
  topSpecies: SpeciesPrediction[];
  /** Total inference time (detection + classification) */
  inferenceTimeMs: number;
  imageWidth: number;
  imageHeight: number;
}

// ── Constants ──────────────────────────────────────────────────────────

const MD_CLASS_LABELS: Record<number, string> = {
  0: 'animal',
  1: 'person',
  2: 'vehicle',
};

const MD_INPUT_SIZE = 640;
const MD_CONF_THRESHOLD = 0.2;
const MD_IOU_THRESHOLD = 0.45;

// iNat21 ConvNeXt preprocessing (CLIP-style normalization)
const INAT_INPUT_SIZE = 224;
const INAT_MEAN = [0.48145466, 0.4578275, 0.40821073];
const INAT_STD = [0.26862954, 0.26130258, 0.27577711];

// ── Singleton sessions ─────────────────────────────────────────────────

let mdSession: ort.InferenceSession | null = null;
let inatSession: ort.InferenceSession | null = null;
let inatLabels: string[] = [];

function getModelsDir(): string {
  if (app.isPackaged) {
    return path.join(process.resourcesPath, 'models');
  }
  return path.join(app.getAppPath(), 'models');
}

export async function loadModels(): Promise<void> {
  const modelsDir = getModelsDir();
  const opts: ort.InferenceSession.SessionOptions = {
    executionProviders: ['cpu'],
    graphOptimizationLevel: 'all',
  };

  // Load MegaDetector
  if (!mdSession) {
    const mdPath = path.join(modelsDir, 'md_v5a.0.0.onnx');
    console.log('[inference] Loading MegaDetector from:', mdPath);
    const t0 = performance.now();
    mdSession = await ort.InferenceSession.create(mdPath, opts);
    console.log(`[inference] MegaDetector loaded in ${(performance.now() - t0).toFixed(0)}ms`);
  }

  // Load iNaturalist classifier
  if (!inatSession) {
    const inatPath = path.join(modelsDir, 'inat21_convnext.onnx');
    const labelsPath = path.join(modelsDir, 'inat21_labels.json');

    if (!fs.existsSync(inatPath) || !fs.existsSync(labelsPath)) {
      console.warn('[inference] iNat21 model or labels not found — species classification disabled');
    } else {
      console.log('[inference] Loading iNat21 ConvNeXt from:', inatPath);
      const t0 = performance.now();
      inatSession = await ort.InferenceSession.create(inatPath, opts);
      inatLabels = JSON.parse(fs.readFileSync(labelsPath, 'utf-8'));
      console.log(`[inference] iNat21 loaded in ${(performance.now() - t0).toFixed(0)}ms (${inatLabels.length} species)`);
    }
  }
}

// Keep backward compat
export const loadModel = loadModels;

export async function releaseModels(): Promise<void> {
  if (mdSession) { await mdSession.release(); mdSession = null; }
  if (inatSession) { await inatSession.release(); inatSession = null; }
}

export const releaseModel = releaseModels;

// ── MegaDetector preprocessing ─────────────────────────────────────────

interface MDPreprocessed {
  tensor: ort.Tensor;
  originalWidth: number;
  originalHeight: number;
  ratio: number;
  padX: number;
  padY: number;
}

function preprocessMegaDetector(img: NativeImage): MDPreprocessed {
  const { width: origW, height: origH } = img.getSize();
  const ratio = Math.min(MD_INPUT_SIZE / origW, MD_INPUT_SIZE / origH);
  const newW = Math.round(origW * ratio);
  const newH = Math.round(origH * ratio);
  const padX = (MD_INPUT_SIZE - newW) / 2;
  const padY = (MD_INPUT_SIZE - newH) / 2;

  const resized = img.resize({ width: newW, height: newH, quality: 'better' });
  const bitmap = resized.toBitmap();

  const float32 = new Float32Array(1 * 3 * MD_INPUT_SIZE * MD_INPUT_SIZE);
  const grayVal = 114 / 255;
  float32.fill(grayVal);

  const padXi = Math.floor(padX);
  const padYi = Math.floor(padY);
  const stride = MD_INPUT_SIZE * MD_INPUT_SIZE;

  for (let y = 0; y < newH; y++) {
    for (let x = 0; x < newW; x++) {
      const si = (y * newW + x) * 4;
      const di = (padYi + y) * MD_INPUT_SIZE + (padXi + x);
      float32[0 * stride + di] = bitmap[si + 2] / 255;
      float32[1 * stride + di] = bitmap[si + 1] / 255;
      float32[2 * stride + di] = bitmap[si + 0] / 255;
    }
  }

  return {
    tensor: new ort.Tensor('float32', float32, [1, 3, MD_INPUT_SIZE, MD_INPUT_SIZE]),
    originalWidth: origW,
    originalHeight: origH,
    ratio,
    padX,
    padY,
  };
}

// ── iNat preprocessing ─────────────────────────────────────────────────

/**
 * Crop + resize to 384×384 with CLIP normalization for iNat ConvNeXt.
 */
function preprocessInatCrop(img: NativeImage, bbox: [number, number, number, number]): ort.Tensor {
  const { width: imgW, height: imgH } = img.getSize();

  // Clamp bbox to image bounds
  let [x1, y1, x2, y2] = bbox;
  x1 = Math.max(0, Math.floor(x1));
  y1 = Math.max(0, Math.floor(y1));
  x2 = Math.min(imgW, Math.ceil(x2));
  y2 = Math.min(imgH, Math.ceil(y2));

  const cropW = x2 - x1;
  const cropH = y2 - y1;
  if (cropW < 10 || cropH < 10) {
    throw new Error('Crop too small for classification');
  }

  // Crop using nativeImage: create crop by extracting region
  const cropped = img.crop({ x: x1, y: y1, width: cropW, height: cropH });
  const resized = cropped.resize({ width: INAT_INPUT_SIZE, height: INAT_INPUT_SIZE, quality: 'better' });
  const bitmap = resized.toBitmap(); // BGRA

  const float32 = new Float32Array(1 * 3 * INAT_INPUT_SIZE * INAT_INPUT_SIZE);
  const stride = INAT_INPUT_SIZE * INAT_INPUT_SIZE;

  for (let y = 0; y < INAT_INPUT_SIZE; y++) {
    for (let x = 0; x < INAT_INPUT_SIZE; x++) {
      const si = (y * INAT_INPUT_SIZE + x) * 4;
      const di = y * INAT_INPUT_SIZE + x;

      // BGRA → RGB, normalize with CLIP mean/std
      float32[0 * stride + di] = (bitmap[si + 2] / 255 - INAT_MEAN[0]) / INAT_STD[0];
      float32[1 * stride + di] = (bitmap[si + 1] / 255 - INAT_MEAN[1]) / INAT_STD[1];
      float32[2 * stride + di] = (bitmap[si + 0] / 255 - INAT_MEAN[2]) / INAT_STD[2];
    }
  }

  return new ort.Tensor('float32', float32, [1, 3, INAT_INPUT_SIZE, INAT_INPUT_SIZE]);
}

// ── NMS ────────────────────────────────────────────────────────────────

function iou(a: number[], b: number[]): number {
  const x1 = Math.max(a[0], b[0]);
  const y1 = Math.max(a[1], b[1]);
  const x2 = Math.min(a[2], b[2]);
  const y2 = Math.min(a[3], b[3]);
  const inter = Math.max(0, x2 - x1) * Math.max(0, y2 - y1);
  const areaA = (a[2] - a[0]) * (a[3] - a[1]);
  const areaB = (b[2] - b[0]) * (b[3] - b[1]);
  return inter / (areaA + areaB - inter + 1e-6);
}

function nms(detections: Detection[]): Detection[] {
  const sorted = [...detections].sort((a, b) => b.confidence - a.confidence);
  const keep: Detection[] = [];
  for (const det of sorted) {
    let dominated = false;
    for (const kept of keep) {
      if (det.classId === kept.classId && iou(det.bbox, kept.bbox) > MD_IOU_THRESHOLD) {
        dominated = true;
        break;
      }
    }
    if (!dominated) keep.push(det);
  }
  return keep;
}

// ── MegaDetector postprocess ───────────────────────────────────────────

function postprocessMD(
  output: ort.Tensor,
  ratio: number,
  padX: number,
  padY: number,
): Detection[] {
  const data = output.data as Float32Array;
  const [, numDets, numVals] = output.dims;
  const numClasses = numVals - 5;
  const raw: Detection[] = [];

  for (let i = 0; i < numDets; i++) {
    const off = i * numVals;
    const objConf = data[off + 4];
    if (objConf < MD_CONF_THRESHOLD) continue;

    let bestCls = 0, bestConf = 0;
    for (let c = 0; c < numClasses; c++) {
      if (data[off + 5 + c] > bestConf) {
        bestConf = data[off + 5 + c];
        bestCls = c;
      }
    }

    const finalConf = objConf * bestConf;
    if (finalConf < MD_CONF_THRESHOLD) continue;

    const cx = data[off], cy = data[off + 1], w = data[off + 2], h = data[off + 3];
    let x1 = (cx - w / 2 - padX) / ratio;
    let y1 = (cy - h / 2 - padY) / ratio;
    let x2 = (cx + w / 2 - padX) / ratio;
    let y2 = (cy + h / 2 - padY) / ratio;

    raw.push({
      classId: bestCls,
      label: MD_CLASS_LABELS[bestCls] ?? `class_${bestCls}`,
      confidence: finalConf,
      bbox: [x1, y1, x2, y2],
    });
  }

  return nms(raw);
}

// ── iNat postprocess (softmax + top-K) ─────────────────────────────────

function softmax(logits: Float32Array): Float32Array {
  const max = logits.reduce((a, b) => Math.max(a, b), -Infinity);
  const exps = new Float32Array(logits.length);
  let sum = 0;
  for (let i = 0; i < logits.length; i++) {
    exps[i] = Math.exp(logits[i] - max);
    sum += exps[i];
  }
  for (let i = 0; i < exps.length; i++) exps[i] /= sum;
  return exps;
}

function topK(probs: Float32Array, k: number): SpeciesPrediction[] {
  const indexed = Array.from(probs).map((p, i) => ({ idx: i, p }));
  indexed.sort((a, b) => b.p - a.p);
  return indexed.slice(0, k).map(({ idx, p }) => ({
    name: inatLabels[idx] ?? `species_${idx}`,
    confidence: p,
  }));
}

// ── Public API ─────────────────────────────────────────────────────────

/**
 * Run full two-stage pipeline on an image file:
 *   1. MegaDetector detects bounding boxes
 *   2. Best animal crop → iNat ConvNeXt for species classification
 */
export async function identifyImage(filePath: string): Promise<IdentifyResult> {
  if (!mdSession) {
    throw new Error('Models not loaded. Call loadModels() first.');
  }

  const img = nativeImage.createFromPath(filePath);
  if (img.isEmpty()) {
    throw new Error(`Failed to load image: ${filePath}`);
  }

  const totalStart = performance.now();

  // Stage 1: MegaDetector
  const md = preprocessMegaDetector(img);
  const mdResults = await mdSession.run({ images: md.tensor });
  const detections = postprocessMD(mdResults['output0'], md.ratio, md.padX, md.padY);

  let species: SpeciesPrediction | null = null;
  let topSpecies: SpeciesPrediction[] = [];

  // Stage 2: iNat classification on best animal detection
  const animals = detections.filter(d => d.classId === 0);
  const bestAnimal = animals.length > 0
    ? animals.reduce((a, b) => (a.confidence > b.confidence ? a : b))
    : null;

  if (bestAnimal && inatSession) {
    try {
      const cropTensor = preprocessInatCrop(img, bestAnimal.bbox);
      const inatResults = await inatSession.run({ input: cropTensor });
      const logits = inatResults['logits'].data as Float32Array;
      const probs = softmax(logits);
      topSpecies = topK(probs, 5);
      species = topSpecies[0] ?? null;
    } catch (err) {
      console.warn('[inference] iNat classification failed:', (err as Error).message);
    }
  }

  const inferenceTimeMs = Math.round(performance.now() - totalStart);

  console.log(
    `[inference] ${path.basename(filePath)}: ` +
    `${detections.length} detections, ` +
    `species=${species?.name ?? 'none'} (${(species?.confidence ?? 0 * 100).toFixed(1)}%) ` +
    `in ${inferenceTimeMs}ms`,
  );

  return {
    detections,
    species,
    topSpecies,
    inferenceTimeMs,
    imageWidth: md.originalWidth,
    imageHeight: md.originalHeight,
  };
}

// Keep backward compat for single-stage detection
export async function detectImage(filePath: string): Promise<{
  detections: Detection[];
  inferenceTimeMs: number;
  imageWidth: number;
  imageHeight: number;
}> {
  const result = await identifyImage(filePath);
  return {
    detections: result.detections,
    inferenceTimeMs: result.inferenceTimeMs,
    imageWidth: result.imageWidth,
    imageHeight: result.imageHeight,
  };
}
