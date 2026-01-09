import { Type } from '@google/genai';
import { ExtractedWebsiteData } from '../../types';
import { STEPS_CONFIG } from '../../config/aiConfig';
import { getAiClient } from './shared';

export const extractWebsiteData = async (
  screenshots: string[],
  urlContext?: string
): Promise<ExtractedWebsiteData> => {
  const ai = getAiClient();

  const prompt = `
    You are an expert UX Researcher and Content Analyst.
    Analyze the provided screenshots of a landing page in detail and extract ALL relevant information.

    ${urlContext ? `Context URL: ${urlContext}` : ''}

    Your task is to thoroughly extract and document:
    1. Business Information: Name, tagline, description, value proposition
    2. Features & Offerings: List all features, products, or services mentioned
    3. Pricing: Extract any pricing plans, tiers, or cost information
    4. Design Analysis: Current color scheme, typography, layout patterns, visual style
    5. Structure Analysis: Identify all sections present and navigation items
    6. Social Proof: Testimonials, reviews, customer logos, statistics
    7. Calls to Action: All CTAs found on the page

    Be exhaustive and detailed. Extract all text content, visual elements, and structural patterns.
    This data will be used to inform a complete redesign.

    Return the result in strict JSON format.
  `;

  const parts: any[] = [{ text: prompt }];

  // Add all screenshots to parts
  screenshots.forEach((base64Data) => {
    const mimeType =
      base64Data.match(/data:([^;]+);base64,/)?.[1] || 'image/png';
    const cleanBase64 = base64Data.includes('base64,')
      ? base64Data.split('base64,')[1]
      : base64Data;
    parts.push({
      inlineData: {
        mimeType: mimeType,
        data: cleanBase64,
      },
    });
  });

  const response = await ai.models.generateContent({
    model: STEPS_CONFIG.extractWebsiteData.model, // Use configured model
    contents: { parts },
    config: {
      responseMimeType: 'application/json',
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          businessName: { type: Type.STRING },
          tagline: { type: Type.STRING },
          description: { type: Type.STRING },
          features: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                name: { type: Type.STRING },
                description: { type: Type.STRING },
              },
            },
          },
          pricing: {
            type: Type.OBJECT,
            properties: {
              plans: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    name: { type: Type.STRING },
                    price: { type: Type.STRING },
                    features: {
                      type: Type.ARRAY,
                      items: { type: Type.STRING },
                    },
                  },
                },
              },
            },
          },
          designAnalysis: {
            type: Type.OBJECT,
            properties: {
              colorScheme: {
                type: Type.ARRAY,
                items: { type: Type.STRING },
              },
              typographyStyle: { type: Type.STRING },
              layoutPattern: { type: Type.STRING },
              visualStyle: { type: Type.STRING },
            },
            required: [
              'colorScheme',
              'typographyStyle',
              'layoutPattern',
              'visualStyle',
            ],
          },
          structureAnalysis: {
            type: Type.OBJECT,
            properties: {
              sections: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    type: { type: Type.STRING },
                    description: { type: Type.STRING },
                  },
                },
              },
              navigationItems: {
                type: Type.ARRAY,
                items: { type: Type.STRING },
              },
            },
            required: ['sections', 'navigationItems'],
          },
          testimonials: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                author: { type: Type.STRING },
                content: { type: Type.STRING },
                role: { type: Type.STRING },
              },
            },
          },
          callsToAction: {
            type: Type.ARRAY,
            items: { type: Type.STRING },
          },
          socialProof: {
            type: Type.ARRAY,
            items: { type: Type.STRING },
          },
        },
        required: [
          'features',
          'designAnalysis',
          'structureAnalysis',
          'callsToAction',
        ],
      },
    },
  });

  if (!response.text) throw new Error('No data extracted');

  try {
    const parsed = JSON.parse(response.text);
    console.log('Extracted website data:', parsed);

    // Validate and default features
    if (!parsed.features || !Array.isArray(parsed.features)) {
      console.warn('Missing or invalid features array, using empty array');
      parsed.features = [];
    }

    // Validate pricing structure specifically
    if (
      parsed.pricing &&
      parsed.pricing.plans &&
      Array.isArray(parsed.pricing.plans)
    ) {
      parsed.pricing.plans.forEach((plan: any) => {
        if (!plan.features || !Array.isArray(plan.features)) {
          console.warn(
            'Missing features array in pricing plan, defaulting to empty'
          );
          plan.features = [];
        }
      });
    }

    // Validate and default designAnalysis
    if (!parsed.designAnalysis || typeof parsed.designAnalysis !== 'object') {
      console.warn('Missing designAnalysis, using defaults');
      parsed.designAnalysis = {
        colorScheme: [],
        typographyStyle: 'Sans-serif, clean',
        layoutPattern: 'Standard section-based',
        visualStyle: 'Professional and clean',
      };
    } else {
      // Ensure specific properties exist
      if (!Array.isArray(parsed.designAnalysis.colorScheme)) {
        parsed.designAnalysis.colorScheme = [];
      }
      if (!parsed.designAnalysis.typographyStyle)
        parsed.designAnalysis.typographyStyle = 'Sans-serif, clean';
      if (!parsed.designAnalysis.layoutPattern)
        parsed.designAnalysis.layoutPattern = 'Standard section-based';
      if (!parsed.designAnalysis.visualStyle)
        parsed.designAnalysis.visualStyle = 'Professional and clean';
    }

    // Validate and default structureAnalysis
    if (!parsed.structureAnalysis || typeof parsed.structureAnalysis !== 'object') {
      console.warn('Missing structureAnalysis, using defaults');
      parsed.structureAnalysis = {
        sections: [],
        navigationItems: [],
      };
    } else {
      if (!Array.isArray(parsed.structureAnalysis.sections)) {
        parsed.structureAnalysis.sections = [];
      }
      if (!Array.isArray(parsed.structureAnalysis.navigationItems)) {
        parsed.structureAnalysis.navigationItems = [];
      }
    }

    // Validate and default other arrays
    if (!parsed.callsToAction || !Array.isArray(parsed.callsToAction)) {
      parsed.callsToAction = [];
    }

    return parsed;
  } catch (parseError) {
    console.error('Failed to parse extraction response:', response.text);
    throw new Error(
      `Failed to parse extraction: ${
        parseError instanceof Error ? parseError.message : 'Unknown error'
      }`
    );
  }
};
