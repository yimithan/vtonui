import * as fal from '@fal-ai/client';
import { addLog } from './debugLogger';

const resolveResolution = (resolution: string): string => {
  if (resolution === '2K') return '2048x2048';
  if (resolution === '4K') return '4096x4096';
  return '1024x1024';
};

const configureClient = (apiKey: string) => {
  fal.config({ credentials: apiKey });
};

const fileToDataUrl = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = (error) => reject(error);
  });
};

const imageUrlToDataUrl = async (url: string): Promise<string> => {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to fetch generated image: ${response.status}`);
  }

  const blob = await response.blob();
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(blob);
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = (error) => reject(error);
  });
};

const extractText = (result: any): string | null => {
  const data = result?.data;
  const textCandidates = [
    data?.text,
    data?.output,
    data?.result,
    data?.response,
    data?.prompt,
    data?.caption,
    data?.description,
    data?.choices?.[0]?.message?.content,
    data?.content,
  ].filter((value) => typeof value === 'string' && value.trim().length > 0);

  if (textCandidates.length > 0) {
    return textCandidates[0] as string;
  }

  return null;
};

const extractImageUrl = (result: any): string | null => {
  const data = result?.data;
  const imageCandidates = [
    data?.images?.[0]?.url,
    data?.image?.url,
    data?.output?.images?.[0]?.url,
    data?.output_image?.url,
    data?.url,
  ].filter((value) => typeof value === 'string' && value.length > 0);

  if (imageCandidates.length > 0) {
    return imageCandidates[0] as string;
  }

  return null;
};

const createReferenceInput = async (files: File[]): Promise<string[]> => {
  const images: string[] = [];
  for (const file of files) {
    images.push(await fileToDataUrl(file));
  }
  return images;
};

export const analyzeImages = async (
  apiKey: string,
  modelImage: File,
  garmentImages: File[],
  promptInstructions: string,
  promptModel: string = 'fal-ai/gpt-4.1-mini'
): Promise<string> => {
  if (!apiKey) throw new Error('API Key is required');

  addLog('info', `[analyzeImages] Starting analysis — model: "${modelImage.name}", garments: ${garmentImages.map(f => f.name).join(', ')}, promptModel: ${promptModel}`);
  configureClient(apiKey);

  const imageDataUrls = await createReferenceInput([modelImage, ...garmentImages]);
  const instruction = `${promptInstructions}\n\nReturn only the final generation prompt text.`;

  const result = await fal.subscribe(promptModel, {
    input: {
      prompt: instruction,
      image_urls: imageDataUrls,
      images: imageDataUrls,
      max_tokens: 1200,
      temperature: 0.2,
    },
    logs: true,
  });

  const text = extractText(result);
  addLog('info', `[analyzeImages] API response received. hasText: ${!!text}`);

  if (!text) {
    throw new Error('No analysis generated in the response');
  }

  return text;
};

export const generateTryOnImage = async (
  apiKey: string,
  prompt: string,
  modelImage: File,
  garmentImages: File[],
  settings: { resolution: string; aspectRatio: string },
  imageModel: string = 'fal-ai/nano-banana-2'
): Promise<string> => {
  if (!apiKey) throw new Error('API Key is required');

  addLog('info', `[generateTryOnImage] Starting generation — model: "${modelImage.name}", resolution: ${settings.resolution}, aspect: ${settings.aspectRatio}, imageModel: ${imageModel}`);
  configureClient(apiKey);

  const referenceImages = await createReferenceInput([modelImage, ...garmentImages]);

  const result = await fal.subscribe(imageModel, {
    input: {
      prompt,
      image_urls: referenceImages,
      images: referenceImages,
      reference_images: referenceImages,
      aspect_ratio: settings.aspectRatio,
      image_size: resolveResolution(settings.resolution),
      num_images: 1,
      output_format: 'png',
    },
    logs: true,
  });

  const imageUrl = extractImageUrl(result);
  addLog('info', `[generateTryOnImage] API response received. hasImage: ${!!imageUrl}`);

  if (!imageUrl) {
    throw new Error('No image generated in the response');
  }

  return imageUrlToDataUrl(imageUrl);
};

export const generateFacialEnhancement = async (
  apiKey: string,
  modelImage: File,
  faceImage: File,
  prompt: string,
  settings: { resolution: string; aspectRatio: string },
  imageModel: string = 'fal-ai/nano-banana-2'
): Promise<string> => {
  if (!apiKey) throw new Error('API Key is required');

  addLog('info', `[generateFacialEnhancement] Starting generation — model: "${modelImage.name}", faceRef: "${faceImage.name}", resolution: ${settings.resolution}, aspect: ${settings.aspectRatio}, imageModel: ${imageModel}`);
  configureClient(apiKey);

  const referenceImages = await createReferenceInput([modelImage, faceImage]);

  const result = await fal.subscribe(imageModel, {
    input: {
      prompt,
      image_urls: referenceImages,
      images: referenceImages,
      reference_images: referenceImages,
      aspect_ratio: settings.aspectRatio,
      image_size: resolveResolution(settings.resolution),
      num_images: 1,
      output_format: 'png',
    },
    logs: true,
  });

  const imageUrl = extractImageUrl(result);
  addLog('info', `[generateFacialEnhancement] API response received. hasImage: ${!!imageUrl}`);

  if (!imageUrl) {
    throw new Error('No image generated in the response');
  }

  return imageUrlToDataUrl(imageUrl);
};
