import { fal } from "@fal-ai/client";
import {
  addLog,
  logProcess,
  logPromptProof,
  logImageTransmissionProof,
  LogLevel,
} from './debugLogger';

// Emit a line under the active process when one is supplied, otherwise a plain log.
const plog = (
  processId: string | undefined,
  level: LogLevel,
  message: string,
  details?: string,
) => (processId ? logProcess(processId, level, message, details) : addLog(level, message, { details }));

/**
 * fal.ai pipeline.
 *
 * This file mirrors the public API of geminiService.ts exactly
 * (analyzeImages / generateTryOnImage / generateFacialEnhancement) so the two
 * pipelines are interchangeable.
 *
 * Unlike the Gemini pipeline (which runs a separate text model to turn the
 * prompt-maker template into a descriptive prompt, then a second image model to
 * render it), the fal Nano Banana models are themselves multimodal Gemini image
 * models — per the fal docs they take a `prompt` + `image_urls` and perform the
 * generation/editing in a single call. So the fal pipeline is SINGLE-SHOT:
 * `analyzeImages` does no network call (it forwards the prompt-maker
 * instructions verbatim) and `generateTryOnImage` sends those instructions plus
 * every image straight to the Nano Banana edit endpoint. This also removes the
 * old OpenRouter text hop, whose model id ("google/gemini-3-pro") fal rejected
 * with a 400 ("not a valid model ID").
 *
 * Endpoints below come straight from the fal model API docs:
 *   - Nano Banana Pro (Gemini 3 Pro Image):     fal-ai/nano-banana-pro
 *   - Nano Banana 2   (Gemini 3.1 Flash Image): fal-ai/nano-banana-2
 * We target the `/edit` variant of each because the VTO flow always supplies
 * input images (image_urls) for editing rather than pure text-to-image.
 */

// App imageModel id -> fal image edit endpoint (Nano Banana Pro / Nano Banana 2).
const FAL_IMAGE_MODEL_MAP: Record<string, string> = {
  // Nano Banana Pro / Gemini 3 Pro Image
  'gemini-3-pro-image-preview': 'fal-ai/nano-banana-pro/edit',
  // Nano Banana 2 / Gemini 3.1 Flash Image
  'gemini-3.1-flash-image-preview': 'fal-ai/nano-banana-2/edit',
};

const FAL_IMAGE_FALLBACK = 'fal-ai/nano-banana-pro/edit';

// Full data URI (with the data:...;base64, prefix) — required for fal image_urls.
const fileToDataUri = (file: File): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = (error) => reject(error);
    reader.readAsDataURL(file);
  });

const configureFal = (apiKey: string) => {
  if (!apiKey) throw new Error('API Key is required');
  fal.config({ credentials: apiKey });
};

// Normalise fal SDK errors and make sure auth failures contain the substrings
// ("API Key" / "403") the App's batch loop watches for to abort cleanly.
const normalizeFalError = (e: any): Error => {
  const status = e?.status ?? e?.response?.status;
  const raw = e?.body?.detail ?? e?.body ?? e?.message ?? 'Unknown fal error';
  const msg = typeof raw === 'string' ? raw : JSON.stringify(raw);
  if (status === 401 || status === 403) {
    return new Error(`API Key authorization failed (${status}): ${msg}`);
  }
  return new Error(`fal request failed${status ? ` (${status})` : ''}: ${msg}`);
};

// fal images come back as either a data URI (sync_mode) or an https URL.
// Normalise to a data URL so display + ZIP download behave identically to the
// Gemini pipeline. Falls back to the raw URL if conversion is blocked.
const extractFalImage = async (result: any): Promise<string> => {
  const url: string | undefined = result?.data?.images?.[0]?.url;
  if (!url) throw new Error('No image generated in the fal response');
  if (url.startsWith('data:')) return url;
  try {
    const resp = await fetch(url);
    const blob = await resp.blob();
    return await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  } catch {
    return url; // still renders in <img>; single download may navigate cross-origin
  }
};

export const analyzeImages = async (
  _apiKey: string,
  _modelImage: File,
  garmentImages: File[],
  promptInstructions: string,
  promptModel: string = 'gemini-3-pro-preview',
  processId?: string
): Promise<string> => {
  // The fal Nano Banana models are multimodal and do analysis + rendering in a
  // single image call, so there is NO separate text/vision request here (which
  // is what previously failed with "google/gemini-3-pro is not a valid model
  // ID"). We forward the prompt-maker instructions verbatim to be sent, together
  // with the images, directly to the Nano Banana edit endpoint in
  // generateTryOnImage.
  plog(processId, 'info', `[fal:analyze] START — single-shot pipeline: no separate text model (Nano Banana handles vision + render in one call)`);
  plog(
    processId,
    'proof',
    `[fal:analyze] NO TEXT MODEL — requested promptModel="${promptModel}" is not used by fal; the prompt-maker instructions are passed straight to the image model.`,
  );

  // PROOF: the exact instructions that will be sent to the image model.
  await logPromptProof(processId ?? 'noproc', 'fal:analyze', '(none — single-shot)', promptInstructions, {
    stage: 'prompt-maker-instructions',
    garments: garmentImages.length,
  });
  plog(processId, 'info', `[fal:analyze] DONE — instructions forwarded to image model`);

  return promptInstructions.trim();
};

export const generateTryOnImage = async (
  apiKey: string,
  prompt: string,
  modelImage: File,
  garmentImages: File[],
  settings: { resolution: string; aspectRatio: string },
  imageModel: string = 'gemini-3-pro-image-preview',
  processId?: string
): Promise<string> => {
  if (!apiKey) throw new Error('API Key is required');
  configureFal(apiKey);

  const endpoint = FAL_IMAGE_MODEL_MAP[imageModel] ?? FAL_IMAGE_FALLBACK;
  plog(processId, 'info', `[fal:generate] START — sub-process "generateTryOnImage" (image render)`);
  plog(
    processId,
    'proof',
    `[fal:generate] MODEL MAP PROOF — app imageModel="${imageModel}" -> fal endpoint="${endpoint}"${FAL_IMAGE_MODEL_MAP[imageModel] ? '' : ' (FALLBACK — requested id not mapped)'}`,
  );

  await logPromptProof(processId ?? 'noproc', 'fal:generate', endpoint, prompt, {
    resolution: settings.resolution,
    aspectRatio: settings.aspectRatio,
  });

  const modelUri = await fileToDataUri(modelImage);
  const garmentUris = await Promise.all(garmentImages.map(fileToDataUri));
  const image_urls = [modelUri, ...garmentUris];

  // PROOF: fingerprint every transmitted image + assert image_urls length.
  if (processId) {
    await logImageTransmissionProof(processId, 'fal:generate', modelImage, garmentImages);
  }
  const expectedImages = 1 + garmentImages.length;
  plog(
    processId,
    image_urls.length === expectedImages ? 'proof' : 'error',
    `[fal:generate] REQUEST PAYLOAD PROOF — image_urls=${image_urls.length} (expected ${expectedImages}) ${image_urls.length === expectedImages ? '✓' : '✗'}, endpoint=${endpoint}`,
  );

  let result: any;
  try {
    result = await fal.subscribe(endpoint, {
      input: {
        prompt,
        image_urls,
        num_images: 1,
        aspect_ratio: settings.aspectRatio,
        resolution: settings.resolution,
        output_format: 'png',
        // Mirror the Gemini pipeline's BLOCK_NONE safety posture (6 = least strict).
        safety_tolerance: '6',
        // Return the image inline as a data URI (no extra fetch / CORS hop).
        sync_mode: true,
      },
      logs: true,
      onQueueUpdate: (update: any) => {
        if (update?.status === 'IN_PROGRESS') {
          update.logs?.map((log: any) => log.message).forEach((m: string) => m && addLog('info', `[fal] ${m}`));
        }
      },
    });
  } catch (e: any) {
    throw normalizeFalError(e);
  }

  plog(processId, 'info', `[fal:generate] response received — images: ${result?.data?.images?.length ?? 0}`);
  plog(processId, 'info', `[fal:generate] DONE — sub-process "generateTryOnImage" complete`);
  return extractFalImage(result);
};

export const generateFacialEnhancement = async (
  apiKey: string,
  modelImage: File,
  faceImage: File,
  prompt: string,
  settings: { resolution: string; aspectRatio: string },
  imageModel: string = 'gemini-3-pro-image-preview',
  processId?: string
): Promise<string> => {
  if (!apiKey) throw new Error('API Key is required');
  configureFal(apiKey);

  const endpoint = FAL_IMAGE_MODEL_MAP[imageModel] ?? FAL_IMAGE_FALLBACK;
  plog(processId, 'info', `[fal:facial] START — sub-process "generateFacialEnhancement"`);
  plog(
    processId,
    'proof',
    `[fal:facial] MODEL MAP PROOF — app imageModel="${imageModel}" -> fal endpoint="${endpoint}"${FAL_IMAGE_MODEL_MAP[imageModel] ? '' : ' (FALLBACK)'}`,
  );

  await logPromptProof(processId ?? 'noproc', 'fal:facial', endpoint, prompt, {
    resolution: settings.resolution,
    aspectRatio: settings.aspectRatio,
  });

  const modelUri = await fileToDataUri(modelImage);
  const faceUri = await fileToDataUri(faceImage);

  if (processId) {
    await logImageTransmissionProof(processId, 'fal:facial (face=ref)', modelImage, [faceImage]);
  }

  let result: any;
  try {
    result = await fal.subscribe(endpoint, {
      input: {
        prompt,
        image_urls: [modelUri, faceUri],
        num_images: 1,
        aspect_ratio: settings.aspectRatio,
        resolution: settings.resolution,
        output_format: 'png',
        safety_tolerance: '6',
        sync_mode: true,
      },
      logs: true,
      onQueueUpdate: (update: any) => {
        if (update?.status === 'IN_PROGRESS') {
          update.logs?.map((log: any) => log.message).forEach((m: string) => m && addLog('info', `[fal] ${m}`));
        }
      },
    });
  } catch (e: any) {
    throw normalizeFalError(e);
  }

  plog(processId, 'info', `[fal:facial] response received — images: ${result?.data?.images?.length ?? 0}`);
  plog(processId, 'info', `[fal:facial] DONE — sub-process "generateFacialEnhancement" complete`);
  return extractFalImage(result);
};
