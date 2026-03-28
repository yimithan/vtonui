export interface FileWithPreview {
  file: File;
  preview: string;
}

export enum AppStatus {
  IDLE = 'IDLE',
  BATCH_PROCESSING = 'BATCH_PROCESSING',
}

export type ItemStatus = 'pending' | 'analyzing' | 'generating' | 'success' | 'error';

export type PromptMode = 'default' | 'flat-lay' | 'bag-on-model' | 'bag-no-model' | 'custom';

export type PromptModel = 'gemini-3-pro-preview' | 'gemini-3.1-pro-preview' | 'gemini-3.1-flash-lite-preview';
export type ImageModel = 'gemini-3-pro-image-preview' | 'gemini-3.1-flash-image-preview';

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

export interface TryOnResult {
  modelId: string; // ID of the model image used
  modelPreview: string; // Preview of the model image
  modelFileName: string; // Original filename of the uploaded model image
  garmentId: string;
  garmentPreview?: string; // Thumbnail of the garment (optional for non-garment workflows)
  promptMode: PromptMode; // Prompt mode used for this result
  variantLabel?: string; // Optional result variant label (e.g. pose name)
  generatedImage?: string;
  status: ItemStatus;
  error?: string;
}
