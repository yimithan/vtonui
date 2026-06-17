import { FaceLandmarker, FilesetResolver, type NormalizedLandmark } from '@mediapipe/tasks-vision';
import { addLog } from './debugLogger';

/**
 * High-fidelity face enhancement via crop → enhance → align → composite.
 *
 * Why: regenerating the whole image can drift the body/outfit/background. Here we
 * detect the face locally, enhance ONLY a padded crop around it with the image
 * model, re-align the enhanced face to the original face (eye-based similarity
 * transform), then composite it back onto the untouched original behind a
 * feathered mask — so everything outside the face stays pixel-identical and the
 * face proportions/position match exactly.
 *
 * MediaPipe FaceLandmarker runs 100% locally in the browser (WASM). It is NOT a
 * server/fal call and costs nothing. The WASM runtime + model are fetched as
 * static assets (CDN by default). The user's face images never leave the browser
 * for detection — only the existing image-generation call does.
 */

// Swap these to self-hosted paths (e.g. '/mediapipe/wasm' and
// '/mediapipe/face_landmarker.task') to remove the runtime CDN dependency.
const WASM_BASE = 'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.0/wasm';
const MODEL_URL =
  'https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task';

// Eye-corner landmark indices in the MediaPipe face mesh (used for alignment).
const LEFT_EYE = [33, 133];
const RIGHT_EYE = [263, 362];

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
interface FaceDetection { box: FaceBox; landmarks: NormalizedLandmark[] }
interface Pt { x: number; y: number }

// FaceLandmarker is not reentrant; serialize detect() across concurrent workers.
let detectGate: Promise<unknown> = Promise.resolve();

function detectFace(img: HTMLImageElement | HTMLCanvasElement): Promise<FaceDetection | null> {
  const run = detectGate.then(() => detectFaceInner(img));
  detectGate = run.catch(() => undefined);
  return run;
}

async function detectFaceInner(img: HTMLImageElement | HTMLCanvasElement): Promise<FaceDetection | null> {
  const landmarker = await getLandmarker();
  const res = landmarker.detect(img);
  const landmarks: NormalizedLandmark[] | undefined = res.faceLandmarks?.[0];
  if (!landmarks || landmarks.length === 0) return null;

  let minX = 1, minY = 1, maxX = 0, maxY = 0;
  for (const p of landmarks) {
    if (p.x < minX) minX = p.x;
    if (p.y < minY) minY = p.y;
    if (p.x > maxX) maxX = p.x;
    if (p.y > maxY) maxY = p.y;
  }
  const W = (img as HTMLImageElement).naturalWidth ?? (img as HTMLCanvasElement).width;
  const H = (img as HTMLImageElement).naturalHeight ?? (img as HTMLCanvasElement).height;
  return {
    box: { x: minX * W, y: minY * H, w: (maxX - minX) * W, h: (maxY - minY) * H },
    landmarks,
  };
}

/** Average of two landmarks, scaled to pixel space and offset into a crop. */
function lmMidPx(lms: NormalizedLandmark[], idx: number[], sx: number, sy: number, ox = 0, oy = 0): Pt {
  const a = lms[idx[0]], b = lms[idx[1]];
  return { x: ((a.x + b.x) / 2) * sx - ox, y: ((a.y + b.y) / 2) * sy - oy };
}

/** Square padded crop rect around the face, clamped to the image. */
function paddedSquareRect(box: FaceBox, imgW: number, imgH: number, pad = 0.7) {
  const cx = box.x + box.w / 2;
  const cy = box.y + box.h / 2;
  const half = (Math.max(box.w, box.h) / 2) * (1 + pad);
  let x = Math.round(cx - half);
  let y = Math.round(cy - half);
  let size = Math.round(half * 2);
  if (x < 0) x = 0;
  if (y < 0) y = 0;
  if (x + size > imgW) size = imgW - x;
  if (y + size > imgH) size = imgH - y;
  size = Math.max(16, size);
  return { x, y, w: size, h: size, faceCx: cx - x, faceCy: cy - y, faceW: box.w, faceH: box.h };
}

/**
 * Feathered elliptical ALPHA mask hugging the face interior. The canvas is left
 * TRANSPARENT (alpha 0) outside the ellipse; only the blurred white ellipse is
 * opaque. `destination-in` keys off this alpha, keeping only the feathered oval.
 * (rx is kept snug to the cheeks so the oval does not reach the ears/earrings.)
 */
function buildFeatherMask(cropSize: number, faceCx: number, faceCy: number, faceW: number, faceH: number): HTMLCanvasElement {
  const mask = document.createElement('canvas');
  mask.width = cropSize;
  mask.height = cropSize;
  const ctx = mask.getContext('2d')!;
  const rx = (faceW / 2) * 1.06;
  const ry = (faceH / 2) * 1.28;
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

/** 2-point similarity (scale+rotate+translate) mapping s1→d1 and s2→d2. */
function similarityFromPairs(s1: Pt, s2: Pt, d1: Pt, d2: Pt) {
  const sdx = s2.x - s1.x, sdy = s2.y - s1.y;
  const ddx = d2.x - d1.x, ddy = d2.y - d1.y;
  const sLen = Math.hypot(sdx, sdy);
  if (sLen < 1e-3) return null;
  const k = Math.hypot(ddx, ddy) / sLen;
  const ang = Math.atan2(ddy, ddx) - Math.atan2(sdy, sdx);
  const a = Math.cos(ang) * k, b = Math.sin(ang) * k, c = -Math.sin(ang) * k, d = Math.cos(ang) * k;
  const e = d1.x - (a * s1.x + c * s1.y);
  const f = d1.y - (b * s1.x + d * s1.y);
  return { a, b, c, d, e, f, scale: k };
}

/**
 * Run the high-fidelity composite path.
 *
 * @param originalSrc  data/URL of the original target image
 * @param enhanceCrop  enhances a face-crop File → enhanced data URL (caller wires
 *                     this to generateFacialEnhancement; it MUST request a 1:1
 *                     aspect ratio so the square crop is not stretched)
 * @returns composited data URL, or null if no face was detected (caller falls back).
 */
export async function enhanceFaceComposite(
  originalSrc: string,
  enhanceCrop: (cropFile: File) => Promise<string>,
  logLabel = 'composite',
): Promise<string | null> {
  const original = await loadImage(originalSrc);
  const W = original.naturalWidth, H = original.naturalHeight;

  let det: FaceDetection | null;
  try {
    det = await detectFace(original);
  } catch (e: any) {
    addLog('warn', `[faceComposite:${logLabel}] face detection unavailable (${e?.message ?? e}); falling back to whole-image.`);
    return null;
  }
  if (!det) {
    addLog('warn', `[faceComposite:${logLabel}] no face detected; falling back to whole-image enhancement.`);
    return null;
  }

  const rect = paddedSquareRect(det.box, W, H);
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

  // 2) Enhance the crop (caller requests 1:1 so proportions are preserved).
  const enhancedUrl = await enhanceCrop(cropFile);
  const enhanced = await loadImage(enhancedUrl);

  // 3) Draw the enhanced crop, ALIGNED to the original face via eye landmarks so
  //    its features land exactly where the original face was (no proportional
  //    mismatch / ghosting). Falls back to a plain scale if alignment fails.
  const enhCanvas = document.createElement('canvas');
  enhCanvas.width = rect.w;
  enhCanvas.height = rect.h;
  const enhCtx = enhCanvas.getContext('2d')!;

  // Original face eye centers in crop-local pixels.
  const origLeft = lmMidPx(det.landmarks, LEFT_EYE, W, H, rect.x, rect.y);
  const origRight = lmMidPx(det.landmarks, RIGHT_EYE, W, H, rect.x, rect.y);

  let aligned = false;
  try {
    const enhDet = await detectFace(enhanced);
    if (enhDet) {
      const enhLeft = lmMidPx(enhDet.landmarks, LEFT_EYE, rect.w, rect.h);
      const enhRight = lmMidPx(enhDet.landmarks, RIGHT_EYE, rect.w, rect.h);
      const t = similarityFromPairs(enhLeft, enhRight, origLeft, origRight);
      // Only trust a sane transform (avoid wild warps from a bad detection).
      if (t && t.scale > 0.5 && t.scale < 2.0) {
        enhCtx.setTransform(t.a, t.b, t.c, t.d, t.e, t.f);
        enhCtx.drawImage(enhanced, 0, 0, enhanced.naturalWidth, enhanced.naturalHeight, 0, 0, rect.w, rect.h);
        enhCtx.setTransform(1, 0, 0, 1, 0, 0);
        aligned = true;
      }
    }
  } catch {
    /* alignment is best-effort */
  }
  if (!aligned) {
    addLog('info', `[faceComposite:${logLabel}] eye-alignment unavailable; using direct paste.`);
    enhCtx.drawImage(enhanced, 0, 0, enhanced.naturalWidth, enhanced.naturalHeight, 0, 0, rect.w, rect.h);
  }

  const mask = buildFeatherMask(rect.w, rect.faceCx, rect.faceCy, rect.faceW, rect.faceH);

  // Tone-match toward the original, sampled ONLY over the kept face region.
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

  addLog('info', `[faceComposite:${logLabel}] composited ${aligned ? 'eye-aligned' : 'direct'} face onto untouched original (${W}×${H}).`);
  return out.toDataURL('image/png');
}

/**
 * Shift the enhanced crop's mean RGB toward the original crop's mean, sampling
 * means ONLY over the kept face region (mask alpha > 128) so the surrounding
 * padding/background does not skew the correction.
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
