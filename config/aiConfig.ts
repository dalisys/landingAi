// Model Identifiers
export const AI_MODELS = {
  GEMINI_2_5_FLASH: "gemini-2.5-flash",
  GEMINI_2_5_FLASH_IMAGE: "gemini-2.5-flash-image",
  GEMINI_3_PRO_PREVIEW: "gemini-3-pro-preview",
  GEMINI_3_PRO_IMAGE_PREVIEW: "gemini-3-pro-image-preview",
} as const;

export type AiModel = (typeof AI_MODELS)[keyof typeof AI_MODELS] | string;

// Pricing Configuration (USD per 1M tokens or per image)
export const MODEL_PRICING_CONFIG: Record<
  string,
  { input: number; output?: number; outputPerImage?: number }
> = {
  [AI_MODELS.GEMINI_2_5_FLASH]: { input: 0.3, output: 2.5 },
  [AI_MODELS.GEMINI_2_5_FLASH_IMAGE]: { input: 0.3, outputPerImage: 0.039 },
  [AI_MODELS.GEMINI_3_PRO_PREVIEW]: { input: 2.0, output: 12.0 },
  [AI_MODELS.GEMINI_3_PRO_IMAGE_PREVIEW]: { input: 2.0, outputPerImage: 0.134 },
};

// Step-by-Step Model Configuration
export const STEPS_CONFIG = {
  extractWebsiteData: {
    model: AI_MODELS.GEMINI_3_PRO_PREVIEW,
  },
  analyzeScreenshots: {
    model: AI_MODELS.GEMINI_3_PRO_PREVIEW,
  },
  generateSectionImage: {
    model: AI_MODELS.GEMINI_2_5_FLASH_IMAGE,
  },
  editSectionImage: {
    model: AI_MODELS.GEMINI_2_5_FLASH_IMAGE,
  },
  generateSectionCode: {
    model: AI_MODELS.GEMINI_3_PRO_PREVIEW,
  },
  reviewGeneratedCode: {
    model: AI_MODELS.GEMINI_3_PRO_PREVIEW,
  },
  applyCodeFixes: {
    model: AI_MODELS.GEMINI_3_PRO_PREVIEW,
  },
  generateContentImages: {
    model: AI_MODELS.GEMINI_3_PRO_IMAGE_PREVIEW,
  },
};
