import { FaceLandmarker, FilesetResolver, type NormalizedLandmark } from '@mediapipe/tasks-vision';
import { addLog } from './debugLogger';

/**
 * High-fidelity face enhancement via crop → enhance → composite.
 *
 * Why: regenerating the whole image can drift the body/outfit/background. Here we
 * detect the face locally, enhance ONLY a padded crop around it with the image
 * model, then composite the enhanced face back onto the untouched original behind
 * a feathered mask — so everything outside the face stays pixel-identical.
 *
 * MediaPipe FaceLandmarker runs 100% locally in the browser (WASM). It is NOT a
 * server/fal call and costs nothing. The WASM runtime + model are fetched as
 * static assets (CDN by default; repoint the two constants below at a self-hosted
 * /mediapipe path to run fully offline). The user's face images never leave the
 * browser for detection — only the existing image-generation call does.
 */

// Swap these to self-hosted paths (e.g. '/mediapipe/wasm' and
// '/mediapipe/face_landmarker.task') to remove the runtime CDN dependency.
const WASM_BASE = 'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.0/wasm';
const MODEL_URL =
  'https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task';

let landmarkerPromise: Promise<FaceLandmarker> | null = null;

function getLandmarker(): Promise<FaceLandmarker> {
  if (!landmarkerPromise) {
    landmarkerPromise = (async () => {
      const fileset = await FilesetResolver.forVisionTasks(WASM_BASE);
      return FaceLandmarker.createFromOptions(fileset, {
        baseOptions: { modelAssetPath: MODEL_URL },
        runningMode: 'IMAGE',
        numFaces: 1,
      });
    })().catch((e) => {
      // Reset so a later attempt can retry (e.g. transient network failure).
      landmarkerPromise = null;
      throw e;
    });
  }
  return landmarkerPromise;
}

const loadImage = (src: string): Promise<HTMLImageElement> =>
  new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('Failed to decode image for compositing'));
    img.src = src;
  });

const fileToDataUrl = (file: File): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });

interface FaceBox { x: number; y: number; w: number; h: number }

// The FaceLandmarker instance is not reentrant; serialize detect() calls so the
// (up to 3) concurrent batch workers don't call it simultaneously.
let detectGate: Promise<unknown> = Promise.resolve();

/** Detect the first face and return its pixel-space bounding box, or null. */
function detectFaceBox(img: HTMLImageElement): Promise<FaceBox | null> {
  const run = detectGate.then(() => detectFaceBoxInner(img));
  detectGate = run.catch(() => undefined);
  return run;
}

async function detectFaceBoxInner(img: HTMLImageElement): Promise<FaceBox | null> {
  const landmarker = await getLandmarker();
  const res = landmarker.detect(img);
  const face: NormalizedLandmark[] | undefined = res.faceLandmarks?.[0];
  if (!face || face.length === 0) return null;

  let minX = 1, minY = 1, maxX = 0, maxY = 0;
  for (const p of face) {
    if (p.x < minX) minX = p.x;
    if (p.y < minY) minY = p.y;
    if (p.x > maxX) maxX = p.x;
    if (p.y > maxY) maxY = p.y;
  }
  const W = img.naturalWidth, H = img.naturalHeight;
  return {
    x: minX * W,
    y: minY * H,
    w: (maxX - minX) * W,
    h: (maxY - minY) * H,
  };
}

/** Square padded crop rect around the face, clamped to the image. */
function paddedSquareRect(box: FaceBox, imgW: number, imgH: number, pad = 0.7) {
  const cx = box.x + box.w / 2;
  const cy = box.y + box.h / 2;
  const half = (Math.max(box.w, box.h) / 2) * (1 + pad);
  let x = Math.round(cx - half);
  let y = Math.round(cy - half);
  let size = Math.round(half * 2);
  // Clamp into bounds (keep square; shrink if necessary).
  if (x < 0) x = 0;
  if (y < 0) y = 0;
  if (x + size > imgW) size = imgW - x;
  if (y + size > imgH) size = imgH - y;
  size = Math.max(16, size);
  return { x, y, w: size, h: size, faceCx: cx - x, faceCy: cy - y, faceW: box.w, faceH: box.h };
}

/**
 * Feathered elliptical ALPHA mask hugging the face inside the crop.
 *
 * Critical: the canvas is left TRANSPARENT (alpha 0) outside the ellipse — only
 * the blurred white ellipse is opaque (alpha feathers 255→0 at its edge). The
 * composite uses `destination-in`, which keys off this alpha, so only the
 * feathered face oval is kept. (Filling the background black would make alpha
 * 255 everywhere and paste the whole crop rectangle — a visible hard square.)
 */
function buildFeatherMask(
  cropSize: number,
  faceCx: number,
  faceCy: number,
  faceW: number,
  faceH: number,
): HTMLCanvasElement {
  const mask = document.createElement('canvas');
  mask.width = cropSize;
  mask.height = cropSize;
  const ctx = mask.getContext('2d')!;
  // Background stays transparent — do NOT fill it.
  const rx = (faceW / 2) * 1.18;
  const ry = (faceH / 2) * 1.32;
  const feather = Math.max(10, cropSize * 0.07);
  ctx.save();
  ctx.filter = `blur(${feather}px)`;
  ctx.fillStyle = 'white';
  ctx.beginPath();
  ctx.ellipse(faceCx, faceCy, rx, ry, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
  return mask;
}

/**
 * Run the high-fidelity composite path.
 *
 * @param originalSrc  data/URL of the original target image (kept untouched outside the face)
 * @param enhanceCrop  callback that enhances a face-crop File and returns the enhanced data URL
 *                     (the caller wires this to the existing generateFacialEnhancement on the crop)
 * @returns composited data URL, or null if no face was detected (caller should fall back).
 */
export async function enhanceFaceComposite(
  originalSrc: string,
  enhanceCrop: (cropFile: File) => Promise<string>,
  logLabel = 'composite',
): Promise<string | null> {
  const original = await loadImage(originalSrc);
  const W = original.naturalWidth, H = original.naturalHeight;

  let box: FaceBox | null;
  try {
    box = await detectFaceBox(original);
  } catch (e: any) {
    addLog('warn', `[faceComposite:${logLabel}] face detection unavailable (${e?.message ?? e}); falling back to whole-image.`);
    return null;
  }
  if (!box) {
    addLog('warn', `[faceComposite:${logLabel}] no face detected; falling back to whole-image enhancement.`);
    return null;
  }

  const rect = paddedSquareRect(box, W, H);
  addLog('info', `[faceComposite:${logLabel}] face crop ${rect.w}×${rect.h} at (${rect.x},${rect.y}) of ${W}×${H}.`);

  // 1) Extract the padded face crop as a File.
  const cropCanvas = document.createElement('canvas');
  cropCanvas.width = rect.w;
  cropCanvas.height = rect.h;
  const cropCtx = cropCanvas.getContext('2d')!;
  cropCtx.drawImage(original, rect.x, rect.y, rect.w, rect.h, 0, 0, rect.w, rect.h);
  const cropBlob: Blob = await new Promise((resolve, reject) =>
    cropCanvas.toBlob(b => (b ? resolve(b) : reject(new Error('crop toBlob failed'))), 'image/png'),
  );
  const cropFile = new File([cropBlob], 'face-crop.png', { type: 'image/png' });

  // 2) Enhance the crop with the image model (caller-provided).
  const enhancedUrl = await enhanceCrop(cropFile);
  const enhanced = await loadImage(enhancedUrl);

  // 3) Composite the enhanced face back behind a feathered mask.
  const enhCanvas = document.createElement('canvas');
  enhCanvas.width = rect.w;
  enhCanvas.height = rect.h;
  const enhCtx = enhCanvas.getContext('2d')!;
  // Scale the enhanced crop to the exact crop rect (edit models preserve framing).
  enhCtx.drawImage(enhanced, 0, 0, enhanced.naturalWidth, enhanced.naturalHeight, 0, 0, rect.w, rect.h);

  const mask = buildFeatherMask(rect.w, rect.faceCx, rect.faceCy, rect.faceW, rect.faceH);

  // Light tone-match toward the original, sampled ONLY over the kept face region
  // (the mask), so divergent crop backgrounds don't skew the correction.
  try {
    matchMeanColor(enhCtx, cropCtx, mask, rect.w, rect.h);
  } catch {
    /* tone-match is best-effort */
  }

  enhCtx.globalCompositeOperation = 'destination-in';
  enhCtx.drawImage(mask, 0, 0);
  enhCtx.globalCompositeOperation = 'source-over';

  const out = document.createElement('canvas');
  out.width = W;
  out.height = H;
  const outCtx = out.getContext('2d')!;
  outCtx.drawImage(original, 0, 0);
  outCtx.drawImage(enhCanvas, rect.x, rect.y);

  addLog('info', `[faceComposite:${logLabel}] composited enhanced face onto untouched original (${W}×${H}).`);
  return out.toDataURL('image/png');
}

/**
 * Shift the enhanced crop's mean RGB toward the original crop's mean, sampling
 * means ONLY over the kept face region (mask alpha > 128). This keeps the face
 * tone matched to the original without being skewed by the surrounding padding
 * (whose background the model may have re-rendered differently).
 */
function matchMeanColor(
  enhCtx: CanvasRenderingContext2D,
  origCtx: CanvasRenderingContext2D,
  mask: HTMLCanvasElement,
  w: number,
  h: number,
) {
  const enh = enhCtx.getImageData(0, 0, w, h);
  const orig = origCtx.getImageData(0, 0, w, h);
  const maskData = mask.getContext('2d')!.getImageData(0, 0, w, h).data;
  const meanOf = (d: Uint8ClampedArray) => {
    let r = 0, g = 0, b = 0, n = 0;
    for (let i = 0; i < d.length; i += 4) {
      if (maskData[i + 3] > 128) { r += d[i]; g += d[i + 1]; b += d[i + 2]; n++; }
    }
    return n > 0 ? [r / n, g / n, b / n] : [0, 0, 0];
  };
  const [er, eg, eb] = meanOf(enh.data);
  const [or, og, ob] = meanOf(orig.data);
  // Cap the correction so we never tint the face heavily.
  const clamp = (v: number) => Math.max(-28, Math.min(28, v));
  const dr = clamp(or - er), dg = clamp(og - eg), db = clamp(ob - eb);
  const d = enh.data;
  for (let i = 0; i < d.length; i += 4) {
    d[i] = Math.max(0, Math.min(255, d[i] + dr));
    d[i + 1] = Math.max(0, Math.min(255, d[i + 1] + dg));
    d[i + 2] = Math.max(0, Math.min(255, d[i + 2] + db));
  }
  enhCtx.putImageData(enh, 0, 0);
}

export { fileToDataUrl };
