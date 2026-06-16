import * as geminiService from './geminiService';
import * as falService from './falService';
import { AIProvider } from '../types';

/**
 * Returns the pipeline implementation for the selected provider.
 *
 * Both modules expose the exact same surface:
 *   - analyzeImages(apiKey, modelImage, garmentImages, promptInstructions, promptModel)
 *   - generateTryOnImage(apiKey, prompt, modelImage, garmentImages, settings, imageModel)
 *   - generateFacialEnhancement(apiKey, modelImage, faceImage, prompt, settings, imageModel)
 *
 * so callers can do: getService(provider).generateTryOnImage(...).
 */
export function getService(provider: AIProvider) {
  return provider === 'fal' ? falService : geminiService;
}
