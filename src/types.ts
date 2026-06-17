export interface FileWithPreview {
  file: File;
  preview: string;
  description?: string; // Optional per-image label (e.g. "front view", "rear") — used for garment images
}

export enum AppStatus {
  IDLE = 'IDLE',
  BATCH_PROCESSING = 'BATCH_PROCESSING',
}

export type ItemStatus = 'pending' | 'analyzing' | 'generating' | 'success' | 'error';

export type PromptMode = 'default' | 'flat-lay' | 'bag-on-model' | 'bag-no-model' | 'custom';

export type PromptModel = 'gemini-3-pro-preview' | 'gemini-3.1-pro-preview' | 'gemini-3.1-flash-lite-preview';
export type ImageModel = 'gemini-3-pro-image-preview' | 'gemini-3.1-flash-image-preview';

// Which pipeline / interface backs the generation calls.
export type AIProvider = 'gemini' | 'fal';

export interface GenerationSettings {
  resolution: '1K' | '2K' | '4K';
  aspectRatio: '1:1' | '3:4' | '4:3' | '9:16' | '16:9';
  promptModel: PromptModel;
  imageModel: ImageModel;
}

export interface GarmentGroup {
  id: string;
  files: FileWithPreview[];
}

// One planned generation in the AI Clothing batch. Flat-lay produces a single
// combination per garment (model image is an ignored reference), so it does not
// multiply by the model image count like the other modes.
export interface PlannedCombo {
  key: string;
  promptMode: PromptMode;
  modelIdx: number;
  group: GarmentGroup;
  flatLay: boolean;
}

export interface TryOnResult {
  modelId: string; // ID of the model image used
  modelPreview: string; // Preview of the model image
  modelFileName: string; // Original filename of the uploaded model image
  garmentId: string;
  garmentPreview?: string; // Thumbnail of the garment (optional for non-garment workflows)
  promptMode: PromptMode; // Prompt mode used for this result
  variantLabel?: string; // Optional result variant label (e.g. pose name)
  generatedPrompt?: string; // Descriptive prompt produced by the prompt-generation model
  hideModel?: boolean; // Hide the model thumbnail (e.g. flat-lay, where the model is only an ignored reference)
  generatedImage?: string;
  status: ItemStatus;
  error?: string;
}
