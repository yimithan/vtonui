import { 
  GoogleGenAI, 
  HarmCategory, 
  HarmBlockThreshold 
} from "@google/genai";
import { addLog } from './debugLogger';

// Helper: Dosyayı Base64'e çevir
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

// Python'daki gibi tüm filtreleri kapatıyoruz
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
  promptModel: string = 'gemini-3-pro-preview'
): Promise<string> => {
  if (!apiKey) throw new Error("API Key is required");

  addLog('info', `[analyzeImages] Starting analysis — model: "${modelImage.name}", garments: ${garmentImages.map(f => f.name).join(', ')}, promptModel: ${promptModel}`);

  const ai = new GoogleGenAI({ apiKey });
  
  const parts: any[] = [];

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

  const response = await ai.models.generateContent({
    model: promptModel, 
    contents: { parts: parts },
    config: {
      safetySettings: SAFETY_SETTINGS,
    }
  });

  addLog('info', `[analyzeImages] API response received. Candidates: ${response.candidates?.length ?? 0}, hasText: ${!!response.text}`);

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
  
  return response.text;
};

export const generateTryOnImage = async (
  apiKey: string,
  prompt: string,
  modelImage: File,
  garmentImages: File[],
  settings: { resolution: string; aspectRatio: string },
  imageModel: string = 'gemini-3-pro-image-preview'
): Promise<string> => {
  if (!apiKey) throw new Error("API Key is required");

  addLog('info', `[generateTryOnImage] Starting generation — model: "${modelImage.name}", resolution: ${settings.resolution}, aspect: ${settings.aspectRatio}, imageModel: ${imageModel}`);

  const ai = new GoogleGenAI({ apiKey });
  
  const parts: any[] = [];

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

  addLog('info', `[generateTryOnImage] API response received. Parts: ${response.candidates?.[0]?.content?.parts?.length ?? 0}`);

  for (const part of response.candidates?.[0]?.content?.parts || []) {
    if (part.inlineData) {
      return `data:image/png;base64,${part.inlineData.data}`;
    }
  }

  throw new Error("No image generated in the response");
};

export const generateFacialEnhancement = async (
  apiKey: string,
  modelImage: File,
  faceImage: File,
  prompt: string,
  settings: { resolution: string; aspectRatio: string },
  imageModel: string = 'gemini-3-pro-image-preview'
): Promise<string> => {
  if (!apiKey) throw new Error("API Key is required");

  addLog('info', `[generateFacialEnhancement] Starting generation — model: "${modelImage.name}", faceRef: "${faceImage.name}", resolution: ${settings.resolution}, aspect: ${settings.aspectRatio}, imageModel: ${imageModel}`);

  const ai = new GoogleGenAI({ apiKey });
  const parts: any[] = [];

  parts.push({ text: prompt });

  const modelBase64 = await fileToBase64(modelImage);
  parts.push({
    inlineData: {
      mimeType: modelImage.type,
      data: modelBase64
    }
  });

  const faceBase64 = await fileToBase64(faceImage);
  parts.push({
    inlineData: {
      mimeType: faceImage.type,
      data: faceBase64
    }
  });

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

  addLog('info', `[generateFacialEnhancement] API response received. Parts: ${response.candidates?.[0]?.content?.parts?.length ?? 0}`);

  for (const part of response.candidates?.[0]?.content?.parts || []) {
    if (part.inlineData) {
      return `data:image/png;base64,${part.inlineData.data}`;
    }
  }

  throw new Error("No image generated in the response");
};
