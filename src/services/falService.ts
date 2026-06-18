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
 * pipelines are interchangeable. It is a TWO-STAGE pipeline, identical in shape
 * to the Gemini one:
 *   - Analysis (vision -> text prompt):  OpenRouter on fal, OpenAI-compatible
 *     chat-completions endpoint. The model id MUST be a valid OpenRouter slug
 *     (e.g. "google/gemini-2.5-flash" / "google/gemini-2.5-pro"). The Gemini-3
 *     slugs ("google/gemini-3-pro") are NOT valid OpenRouter ids and fal
 *     rejects them with a 400 ("not a valid model ID"), which is what broke the
 *     text stage — so the app's promptModel ids are mapped to valid OpenRouter
 *     Gemini slugs below.
 *   - Image generation/editing:          fal-ai Nano Banana edit endpoints,
 *     which take a `prompt` + `image_urls`.
 *
 * Image endpoints come straight from the fal model API docs:
 *   - Nano Banana Pro (Gemini 3 Pro Image):     fal-ai/nano-banana-pro
 *   - Nano Banana 2   (Gemini 3.1 Flash Image): fal-ai/nano-banana-2
 * We target the `/edit` variant of each because the VTO flow always supplies
 * input images (image_urls) for editing rather than pure text-to-image.
 */

// App promptModel id -> OpenRouter (fal) text model slug.
// These must be valid OpenRouter model ids. Per the fal OpenRouter docs the
// Gemini family is exposed under the 2.5 slugs; the gemini-3 slugs the app's UI
// labels use do not exist on OpenRouter yet, so they are mapped here.
const FAL_TEXT_MODEL_MAP: Record<string, string> = {
  'gemini-3-pro-preview': 'google/gemini-2.5-pro',
  'gemini-3.1-pro-preview': 'google/gemini-2.5-pro',
  'gemini-3.1-flash-lite-preview': 'google/gemini-2.5-flash-lite',
  // Anthropic Claude via OpenRouter (the app id is already a valid OpenRouter slug).
  'anthropic/claude-sonnet-4.6': 'anthropic/claude-sonnet-4.6',
};

// Documented-valid default (used verbatim in the fal OpenRouter API docs).
const FAL_TEXT_FALLBACK = 'google/gemini-2.5-flash';

// App imageModel id -> fal image edit endpoint (Nano Banana Pro / Nano Banana 2).
const FAL_IMAGE_MODEL_MAP: Record<string, string> = {
  // Nano Banana Pro / Gemini 3 Pro Image
  'gemini-3-pro-image-preview': 'fal-ai/nano-banana-pro/edit',
  // Nano Banana 2 / Gemini 3.1 Flash Image
  'gemini-3.1-flash-image-preview': 'fal-ai/nano-banana-2/edit',
};

const FAL_IMAGE_FALLBACK = 'fal-ai/nano-banana-pro/edit';

// OpenAI-compatible router on fal (handles multimodal vision -> text).
const FAL_OPENAI_BASE = 'https://fal.run/openrouter/router/openai/v1';

type ContentPart =
  | { type: 'text'; text: string }
  | { type: 'image_url'; image_url: { url: string } };

// Cap the longest edge of inline input images. fal receives images as base64
// data URIs in the request body; full-resolution (e.g. 4K) inputs produce a
// multi-megabyte JSON body that the browser/edge can drop with "Failed to
// fetch". Downscaling oversized inputs keeps the payload small. The OUTPUT
// resolution is controlled separately by the `resolution` input, so this does
// not change the generated image size.
const MAX_INPUT_EDGE = 2048;

const loadHtmlImage = (src: string): Promise<HTMLImageElement> =>
  new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('image decode failed'));
    img.src = src;
  });

const readAsDataUri = (file: File): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });

// Full data URI (with the data:...;base64, prefix), downscaled if oversized.
const fileToDataUri = async (file: File): Promise<string> => {
  const raw = await readAsDataUri(file);
  try {
    const img = await loadHtmlImage(raw);
    const longest = Math.max(img.naturalWidth, img.naturalHeight);
    if (longest <= MAX_INPUT_EDGE) return raw;
    const scale = MAX_INPUT_EDGE / longest;
    const w = Math.round(img.naturalWidth * scale);
    const h = Math.round(img.naturalHeight * scale);
    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d');
    if (!ctx) return raw;
    ctx.drawImage(img, 0, 0, w, h);
    return canvas.toDataURL('image/jpeg', 0.92);
  } catch {
    return raw; // any failure → send the original
  }
};

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
  if (/failed to fetch/i.test(msg)) {
    return new Error(`fal request failed: ${msg} — likely the request payload is too large or a network/CORS issue. Try smaller input images or a lower resolution.`);
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
  apiKey: string,
  modelImage: File,
  garmentImages: File[],
  promptInstructions: string,
  promptModel: string = 'gemini-3-pro-preview',
  processId?: string
): Promise<string> => {
  if (!apiKey) throw new Error('API Key is required');

  const model = FAL_TEXT_MODEL_MAP[promptModel] ?? FAL_TEXT_FALLBACK;
  plog(processId, 'info', `[fal:analyze] START — sub-process "analyzeImages" (prompt-maker)`);
  plog(
    processId,
    'proof',
    `[fal:analyze] MODEL MAP PROOF — app promptModel="${promptModel}" -> OpenRouter textModel="${model}"${FAL_TEXT_MODEL_MAP[promptModel] ? '' : ' (FALLBACK — requested id not mapped)'}`,
  );

  // PROOF: exactly which prompt instructions are being sent.
  await logPromptProof(processId ?? 'noproc', 'fal:analyze', model, promptInstructions, {
    stage: 'prompt-maker-instructions',
    garments: garmentImages.length,
  });

  const modelUri = await fileToDataUri(modelImage);
  const garmentUris = await Promise.all(garmentImages.map(fileToDataUri));

  const content: ContentPart[] = [
    { type: 'text', text: promptInstructions },
    { type: 'image_url', image_url: { url: modelUri } },
    ...garmentUris.map((url) => ({ type: 'image_url' as const, image_url: { url } })),
  ];

  // PROOF: fingerprint every transmitted image + assert image_url part count.
  if (processId) {
    await logImageTransmissionProof(processId, 'fal:analyze', modelImage, garmentImages);
  }
  const imageParts = content.filter(p => p.type === 'image_url').length;
  const expectedImages = 1 + garmentImages.length;
  plog(
    processId,
    imageParts === expectedImages ? 'proof' : 'error',
    `[fal:analyze] REQUEST PAYLOAD PROOF — image_url parts=${imageParts} (expected ${expectedImages}) ${imageParts === expectedImages ? '✓' : '✗'}`,
  );

  let res: Response;
  try {
    res = await fetch(`${FAL_OPENAI_BASE}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Key ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages: [{ role: 'user', content }],
      }),
    });
  } catch (e: any) {
    // Network/CORS — fal recommends a server-side proxy for browser usage.
    throw new Error(`fal text request failed (network/CORS): ${e?.message ?? e}`);
  }

  if (!res.ok) {
    const detail = await res.text().catch(() => '');
    if (res.status === 401 || res.status === 403) {
      throw new Error(`API Key authorization failed (${res.status}): ${detail.slice(0, 200)}`);
    }
    throw new Error(`fal text request failed (${res.status}): ${detail.slice(0, 200)}`);
  }

  const data = await res.json();
  const text: unknown = data?.choices?.[0]?.message?.content;

  plog(processId, 'info', `[fal:analyze] response received — hasText: ${!!text}`);

  if (!text || typeof text !== 'string' || !text.trim()) {
    throw new Error('No analysis generated by the fal text model');
  }

  // PROOF: the exact generated prompt that will be fed to the image model.
  await logPromptProof(processId ?? 'noproc', 'fal:analyze→prompt', model, text.trim(), {
    stage: 'generated-prompt-output',
  });
  plog(processId, 'info', `[fal:analyze] DONE — sub-process "analyzeImages" complete`);

  return text.trim();
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
  faceImages: File[],
  prompt: string,
  settings: { resolution: string; aspectRatio: string },
  imageModel: string = 'gemini-3-pro-image-preview',
  processId?: string
): Promise<string> => {
  if (!apiKey) throw new Error('API Key is required');
  configureFal(apiKey);

  const endpoint = FAL_IMAGE_MODEL_MAP[imageModel] ?? FAL_IMAGE_FALLBACK;
  plog(processId, 'info', `[fal:facial] START — sub-process "generateFacialEnhancement" (${faceImages.length} reference(s))`);
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
  const faceUris = await Promise.all(faceImages.map(fileToDataUri));

  if (processId) {
    await logImageTransmissionProof(processId, 'fal:facial (face=ref)', modelImage, faceImages);
  }

  let result: any;
  try {
    result = await fal.subscribe(endpoint, {
      input: {
        prompt,
        image_urls: [modelUri, ...faceUris],
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
