import { Type } from '@google/genai';
import { CodeReview, DesignSystem, ExtractedWebsiteData, Section } from '../../types';
import { STEPS_CONFIG } from '../../config/aiConfig';
import { normalizeHtmlResponse } from './normalize';
import { getAiClient } from './shared';

export const reviewGeneratedCode = async (
  screenshots: string[],
  sections: Section[],
  designSystem: DesignSystem,
  extractedData: ExtractedWebsiteData,
  userRequirements: string
): Promise<CodeReview> => {
  const ai = getAiClient();

  const prompt = `
    You are a Senior Frontend Developer and UI/UX Expert with 15+ years of experience.
    Review the generated website UI based on the screenshots provided.

    ORIGINAL REQUIREMENTS:
    User Request: "${userRequirements}"

    DESIGN SYSTEM USED:
    - Colors: ${designSystem.colorPalette.map((c) => `${c.role}: ${c.hex}`).join(', ')}
    - Typography: ${designSystem.typography}
    - Style: ${designSystem.styleDescription}

    ORIGINAL WEBSITE DATA:
    - Business: ${extractedData.businessName || 'N/A'}
    - Features: ${extractedData.features.map((f) => f.name).join(', ')}
    ${
      extractedData.pricing
        ? `- Pricing Plans: ${extractedData.pricing.plans
            .map((p) => p.name)
            .join(', ')}`
        : ''
    }

    SECTIONS IMPLEMENTED:
    ${sections
      .map((s, i) => `${i + 1}. ${s.name}: ${s.description}`)
      .join('\n    ')}

    YOUR TASK:
    1. Analyze the screenshots of the generated UI
    2. Check if the design matches the requirements and original brief
    3. Evaluate: design quality, responsiveness hints, accessibility, branding consistency
    4. Identify any issues or improvements needed
    5. Decide if the code is good to ship or needs fixes

    Return your review in strict JSON format.
  `;

  const parts: any[] = [{ text: prompt }];

  // Add screenshots to parts
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
    // model: "gemini-3-pro-preview",
    model: STEPS_CONFIG.reviewGeneratedCode.model,
    contents: { parts },
    config: {
      responseMimeType: 'application/json',
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          passedReview: { type: Type.BOOLEAN },
          feedback: { type: Type.STRING },
          suggestedFixes: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                sectionId: { type: Type.STRING },
                issue: { type: Type.STRING },
                suggestion: { type: Type.STRING },
              },
              required: ['sectionId', 'issue', 'suggestion'],
            },
          },
        },
        required: ['passedReview', 'feedback'],
      },
    },
  });

  if (!response.text) throw new Error('No review generated');

  try {
    const parsed = JSON.parse(response.text);
    console.log('Code review result:', parsed);
    return parsed;
  } catch (parseError) {
    console.error('Failed to parse review response:', response.text);
    throw new Error(
      `Failed to parse review: ${
        parseError instanceof Error ? parseError.message : 'Unknown error'
      }`
    );
  }
};

export const applyCodeFixes = async (
  section: Section,
  issue: string,
  suggestion: string,
  currentCode: string,
  designSystem: DesignSystem
): Promise<string> => {
  const ai = getAiClient();

  const prompt = `
    You are a Senior Frontend Developer. Fix the following issue in the HTML code.

    Section: ${section.name}
    Description: ${section.description}

    ISSUE IDENTIFIED:
    ${issue}

    SUGGESTED FIX:
    ${suggestion}

    CURRENT CODE:
    ${currentCode}

    DESIGN SYSTEM:
    - Colors: ${designSystem.colorPalette.map((c) => `${c.role}: ${c.hex}`).join(', ')}
    - Typography: ${designSystem.typography}
    - Style: ${designSystem.styleDescription}

    Your task:
    1. Apply the suggested fix to the code
    2. Maintain all existing functionality
    3. Keep the design system consistent
    4. Ensure the code remains responsive and uses Tailwind CSS
    5. Return ONLY the updated HTML code for this section

    Return the fixed code without markdown code blocks.
  `;

  const response = await ai.models.generateContent({
    // model: "gemini-3-pro-preview",
    model: STEPS_CONFIG.applyCodeFixes.model,
    contents: { parts: [{ text: prompt }] },
  });

  let code = response.text || '';
  code = normalizeHtmlResponse(code);

  return code;
};
