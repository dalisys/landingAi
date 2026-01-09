// API Pricing based on api-pricing.md

import { MODEL_PRICING_CONFIG, AI_MODELS } from "../config/aiConfig";

// Back-compat: components import `ModelType` from this module.
export { AI_MODELS as ModelType };

export interface UsageMetrics {
  model: string;
  inputTokens?: number;
  outputTokens?: number;
  inputImages?: number;
  outputImages?: number;
}

export const calculateCost = (metrics: UsageMetrics): number => {
  const pricing = MODEL_PRICING_CONFIG[metrics.model] || {
    input: 0,
    output: 0,
  };
  let cost = 0;

  // Calculate input cost (tokens)
  if (metrics.inputTokens && pricing.input) {
    cost += (metrics.inputTokens / 1_000_000) * pricing.input;
  }

  // Calculate output cost (tokens)
  if (metrics.outputTokens && pricing.output) {
    cost += (metrics.outputTokens / 1_000_000) * pricing.output;
  }

  // Calculate output cost (images)
  if (metrics.outputImages && pricing.outputPerImage) {
    cost += metrics.outputImages * pricing.outputPerImage;
  }

  return cost;
};

// Estimation functions for when actual token counts are not available
export const estimateTokens = (text: string): number => {
  // Rough estimation: ~4 characters per token
  return Math.ceil(text.length / 4);
};

export const estimateImageTokens = (): number => {
  // Average tokens for an image input
  return 258; // Gemini typically uses ~258 tokens per image
};

export const formatCost = (cost: number): string => {
  if (cost === 0) {
    return "$0.000";
  }
  if (cost < 0.001) {
    return "<$0.001";
  }
  return `$${cost.toFixed(3)}`;
};
