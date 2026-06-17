import {
  GoogleGenAI,
  HarmCategory,
  HarmBlockThreshold
} from "@google/genai";
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

type ContentPart = {
  text?: string;
  inlineData?: {
    mimeType: string;
    data: string;
  };
};

// Helper: Convert file to Base64
export const fileToBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => {
      const result = reader.result as string;
      const base64 = result.split(',')[1];
      resolve(base64);
    };
    reader.onerror = (error) => reject(error);
  });
};

// Disable all safety filters like in Python
const SAFETY_SETTINGS = [
  { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_NONE },
  { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_NONE },
  { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_NONE },
  { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_NONE },
];

export const analyzeImages = async (
  apiKey: string,
  modelImage: File,
  garmentImages: File[],
  promptInstructions: string,
  promptModel: string = 'gemini-3-pro-preview',
  processId?: string
): Promise<string> => {
  if (!apiKey) throw new Error("API Key is required");

  plog(processId, 'info', `[gemini:analyze] START — sub-process "analyzeImages" (prompt-maker)`);

  // PROOF 1: exactly which prompt instructions + text model are about to run.
  await logPromptProof(processId ?? 'noproc', 'gemini:analyze', promptModel, promptInstructions, {
    stage: 'prompt-maker-instructions',
    garments: garmentImages.length,
  });

  const ai = new GoogleGenAI({ apiKey });

  const parts: ContentPart[] = [];

  parts.push({ text: promptInstructions });

  const modelBase64 = await fileToBase64(modelImage);
  parts.push({
    inlineData: {
      mimeType: modelImage.type,
      data: modelBase64
    }
  });

  for (const file of garmentImages) {
    const base64 = await fileToBase64(file);
    parts.push({
      inlineData: {
        mimeType: file.type,
        data: base64
      }
    });
  }

  // PROOF 2: fingerprint of every image actually appended to the request body,
  // plus an assertion that the inlineData part count matches 1 model + N garments.
  if (processId) {
    await logImageTransmissionProof(processId, 'gemini:analyze', modelImage, garmentImages);
  }
  const inlineParts = parts.filter(p => p.inlineData).length;
  const expectedInline = 1 + garmentImages.length;
  plog(
    processId,
    inlineParts === expectedInline ? 'proof' : 'error',
    `[gemini:analyze] REQUEST PAYLOAD PROOF — inlineData parts=${inlineParts} (expected ${expectedInline}) ${inlineParts === expectedInline ? '✓' : '✗'}, model=${promptModel}`,
  );

  const response = await ai.models.generateContent({
    model: promptModel,
    contents: { parts: parts },
    config: {
      safetySettings: SAFETY_SETTINGS,
    }
  });

  plog(processId, 'info', `[gemini:analyze] response received — candidates: ${response.candidates?.length ?? 0}, hasText: ${!!response.text}`);

  // Debug: check why no text was returned
  if (!response.text) {
    const candidate = response.candidates?.[0];
    const finishReason = candidate?.finishReason;
    const blockReason = response.promptFeedback?.blockReason;
    
    console.error('Response details:', {
      finishReason,
      blockReason,
      candidateCount: response.candidates?.length,
      fullResponse: JSON.stringify(response, null, 2)
    });
    
    if (blockReason) {
      throw new Error(`Analysis blocked by safety filter: ${blockReason}`);
    }
    if (finishReason === 'SAFETY') {
      throw new Error('Response blocked due to safety settings');
    }
    throw new Error(`No analysis generated (finishReason: ${finishReason})`);
  }

  // PROOF 3: the exact generated prompt that will be fed to the image model.
  await logPromptProof(processId ?? 'noproc', 'gemini:analyze→prompt', promptModel, response.text, {
    stage: 'generated-prompt-output',
  });
  plog(processId, 'info', `[gemini:analyze] DONE — sub-process "analyzeImages" complete`);

  return response.text;
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
  if (!apiKey) throw new Error("API Key is required");

  plog(processId, 'info', `[gemini:generate] START — sub-process "generateTryOnImage" (image render)`);

  // PROOF 1: exactly which prompt + image model + settings are about to run.
  await logPromptProof(processId ?? 'noproc', 'gemini:generate', imageModel, prompt, {
    resolution: settings.resolution,
    aspectRatio: settings.aspectRatio,
  });

  const ai = new GoogleGenAI({ apiKey });

  const parts: ContentPart[] = [];

  parts.push({ text: prompt });

  const modelBase64 = await fileToBase64(modelImage);
  parts.push({
    inlineData: {
      mimeType: modelImage.type,
      data: modelBase64
    }
  });

  for (const file of garmentImages) {
    const garmentBase64 = await fileToBase64(file);
    parts.push({
      inlineData: {
        mimeType: file.type,
        data: garmentBase64
      }
    });
  }

  // PROOF 2: fingerprint every image attached to the generation request and
  // assert the payload contains 1 model + N garments.
  if (processId) {
    await logImageTransmissionProof(processId, 'gemini:generate', modelImage, garmentImages);
  }
  const inlineParts = parts.filter(p => p.inlineData).length;
  const expectedInline = 1 + garmentImages.length;
  plog(
    processId,
    inlineParts === expectedInline ? 'proof' : 'error',
    `[gemini:generate] REQUEST PAYLOAD PROOF — inlineData parts=${inlineParts} (expected ${expectedInline}) ${inlineParts === expectedInline ? '✓' : '✗'}, model=${imageModel}, ${settings.resolution}/${settings.aspectRatio}`,
  );

  const response = await ai.models.generateContent({
    model: imageModel,
    contents: { parts: parts },
    config: {
      imageConfig: {
        imageSize: settings.resolution,
        aspectRatio: settings.aspectRatio
      },
      safetySettings: SAFETY_SETTINGS,
    }
  });

  plog(processId, 'info', `[gemini:generate] response received — parts: ${response.candidates?.[0]?.content?.parts?.length ?? 0}`);

  for (const part of response.candidates?.[0]?.content?.parts || []) {
    if (part.inlineData) {
      plog(processId, 'info', `[gemini:generate] DONE — sub-process "generateTryOnImage" complete (image returned)`);
      return `data:image/png;base64,${part.inlineData.data}`;
    }
  }

  throw new Error("No image generated in the response");
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
  if (!apiKey) throw new Error("API Key is required");

  plog(processId, 'info', `[gemini:facial] START — sub-process "generateFacialEnhancement" (${faceImages.length} reference(s))`);

  await logPromptProof(processId ?? 'noproc', 'gemini:facial', imageModel, prompt, {
    resolution: settings.resolution,
    aspectRatio: settings.aspectRatio,
  });

  const ai = new GoogleGenAI({ apiKey });
  const parts: ContentPart[] = [];

  parts.push({ text: prompt });

  const modelBase64 = await fileToBase64(modelImage);
  parts.push({
    inlineData: {
      mimeType: modelImage.type,
      data: modelBase64
    }
  });

  for (const faceImage of faceImages) {
    const faceBase64 = await fileToBase64(faceImage);
    parts.push({
      inlineData: {
        mimeType: faceImage.type,
        data: faceBase64
      }
    });
  }

  // Proof: target model + reference face(s) are all attached (the references
  // play the "garment"/reference role here).
  if (processId) {
    await logImageTransmissionProof(processId, 'gemini:facial (face=ref)', modelImage, faceImages);
  }

  const response = await ai.models.generateContent({
    model: imageModel,
    contents: { parts },
    config: {
      imageConfig: {
        imageSize: settings.resolution,
        aspectRatio: settings.aspectRatio
      },
      safetySettings: SAFETY_SETTINGS,
    }
  });

  plog(processId, 'info', `[gemini:facial] response received — parts: ${response.candidates?.[0]?.content?.parts?.length ?? 0}`);

  for (const part of response.candidates?.[0]?.content?.parts || []) {
    if (part.inlineData) {
      plog(processId, 'info', `[gemini:facial] DONE — sub-process "generateFacialEnhancement" complete`);
      return `data:image/png;base64,${part.inlineData.data}`;
    }
  }

  throw new Error("No image generated in the response");
};
