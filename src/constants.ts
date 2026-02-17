export const DEFAULT_PROMPT_MAKER = JSON.stringify({
  role: "You are an expert fashion stylist and prompt engineer for AI image generation.",
  task: "Analyze the provided model image and garment images. Create a detailed, high-fidelity prompt for an image generation model.",
  instructions: [
    "Identify the model's physical characteristics (ethnicity, hair, pose, lighting, background) from the model image.",
    "Identify the garment's details (fabric, texture, cut, color, pattern) from the garment images.",
    "Combine these into a single descriptive prompt for generating an image of the specific model wearing the specific garment.",
    "Ensure the prompt emphasizes photorealism, high texture quality, and correct lighting matching the original model photo.",
    "Output ONLY the prompt text, no markdown, no explanations."
  ]
});

export const COOLDOWN_SUCCESS_SECONDS = 120;
export const COOLDOWN_ERROR_SECONDS = 10;