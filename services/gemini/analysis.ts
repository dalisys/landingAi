import { Type } from '@google/genai';
import { DesignSystem, Section, ExtractedWebsiteData } from '../../types';
import { STEPS_CONFIG } from '../../config/aiConfig';
import { FRONTEND_DESIGN_GUIDELINES, getAiClient } from './shared';

export const analyzeScreenshots = async (
  screenshots: string[],
  userDescription: string,
  extractedData: ExtractedWebsiteData,
  urlContext?: string,
  targetDesignScreenshots?: string[]
): Promise<{ designSystem: DesignSystem; sections: Section[] }> => {
  const ai = getAiClient();

  // Build a detailed context from extracted data
  const dataContext = `
    EXTRACTED WEBSITE DATA:

    Business: ${extractedData.businessName || 'N/A'}
    Tagline: ${extractedData.tagline || 'N/A'}
    Description: ${extractedData.description || 'N/A'}

    Features (${extractedData.features.length}):
    ${extractedData.features
      .map((f, i) => `${i + 1}. ${f.name}: ${f.description}`)
      .join('\n    ')}

    ${
      extractedData.pricing
        ? `Pricing Plans:
    ${extractedData.pricing.plans
      .map((p) => `- ${p.name} (${p.price}): ${p.features.join(', ')}`)
      .join('\n    ')}`
        : ''
    }

    Current Design:
    - Colors: ${extractedData.designAnalysis.colorScheme.join(', ')}
    - Typography: ${extractedData.designAnalysis.typographyStyle}
    - Layout: ${extractedData.designAnalysis.layoutPattern}
    - Style: ${extractedData.designAnalysis.visualStyle}

    Current Structure (${extractedData.structureAnalysis.sections.length} sections):
    ${extractedData.structureAnalysis.sections
      .map((s) => `- ${s.type}: ${s.description}`)
      .join('\n    ')}

    Navigation: ${extractedData.structureAnalysis.navigationItems.join(', ')}

    ${
      extractedData.testimonials && extractedData.testimonials.length > 0
        ? `Testimonials:
    ${extractedData.testimonials
      .map(
        (t) => `- "${t.content}" - ${t.author}${t.role ? ` (${t.role})` : ''}`
      )
      .join('\n    ')}`
        : ''
    }

    Calls to Action: ${extractedData.callsToAction.join(', ')}
    ${
      extractedData.socialProof && extractedData.socialProof.length > 0
        ? `\nSocial Proof: ${extractedData.socialProof.join(', ')}`
        : ''
    }
  `;

  const prompt = `
    You are an expert UX/UI Lead Designer.
    You have been provided with detailed extracted data from the current landing page and the user's redesign request.

    User's Request: "${userDescription}"
    ${urlContext ? `Context URL: ${urlContext}` : ''}

    ${dataContext}

    ${
      targetDesignScreenshots && targetDesignScreenshots.length > 0
        ? `
    TARGET DESIGN REFERENCE:
    You have also been provided with screenshots of a TARGET DESIGN website that the user wants to emulate.
    Analyze the target design's style, layout patterns, color schemes, typography, spacing, and overall aesthetic.
    Apply similar design principles and visual language to the redesign while keeping the original content.
    `
        : ''
    }

    ${FRONTEND_DESIGN_GUIDELINES}

    **DESIGN DIRECTION: PHYSICAL METAPHOR & PERSONA**
    Building on the guidelines above, you must invent a unique "Design Persona" and "Physical Metaphor" for this project.

    1. **Design Persona**: A character who would design this. (e.g. "Neon Brutalist Architect", "Swiss Minimalist Horologist", "Bioluminescent Dataviz Specialist").
    2. **Physical Metaphor**: Describe the UI *as if it were a physical object*. (e.g. "Frosted glass sheets floating in a void", "Tactile raw paper with heavy ink bleeding", "Machined aluminum control panel with backlit indicators").

    **Design Thinking**
    Purpose: What problem does this interface solve? Who uses it?
    Differentiation: What makes this UNFORGETTABLE?
    CRITICAL: Choose a clear conceptual direction and execute it with precision. The key is intentionality.

    Your task is to create a comprehensive REDESIGN PLAN.
    
    CORE PRINCIPLES:
    - Clarity & Usability: The design must be clean, intuitive, and easy to navigate.
    - Professional & Approachable: AVOID overly futuristic, sci-fi, or abstract designs unless explicitly requested.
    - Industry Standards: Follow best practices for landing page conversion.
    - RE-ARCHITECT THE FLOW: Re-think the user journey.

    STEPS:
    1. Define a modern, accessible Design System using the **Physical Metaphor** concept.
    2. Leverage ALL the extracted content to create a better user journey.
    3. RETHINK the structure completely. Propose a new, compelling narrative flow.
    4. For each section, provide a detailed **visualPrompt** that describes the section using the defined Physical Metaphor.
    5. CRITICAL: The FIRST section must be a "Hero" section that INCLUDES the navigation/header.
    6. CRITICAL: You MUST include a "Footer" section as the very last section.
    7. Ensure you incorporate the extracted features, pricing, testimonials, and CTAs.
    8. For the Color Palette, provide the HEX code and a semantic ROLE (e.g. "Primary Action", "Background Surface", "Accent", "Text Primary").

    Return the result in strict JSON format.
  `;

  const parts: any[] = [{ text: prompt }];

  // Add current site screenshots
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

  // Add target design screenshots if provided
  if (targetDesignScreenshots && targetDesignScreenshots.length > 0) {
    targetDesignScreenshots.forEach((base64Data) => {
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
  }

  const response = await ai.models.generateContent({
    model: STEPS_CONFIG.analyzeScreenshots.model,
    contents: { parts },
    config: {
      responseMimeType: 'application/json',
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          designSystem: {
            type: Type.OBJECT,
            properties: {
              colorPalette: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    hex: { type: Type.STRING },
                    role: { type: Type.STRING },
                  },
                  required: ['hex', 'role'],
                },
              },
              typography: { type: Type.STRING },
              styleDescription: { type: Type.STRING },
            },
            required: ['colorPalette', 'typography', 'styleDescription'],
          },
          sections: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                id: { type: Type.STRING },
                name: { type: Type.STRING },
                description: { type: Type.STRING },
                visualPrompt: { type: Type.STRING },
              },
              required: ['id', 'name', 'description', 'visualPrompt'],
            },
          },
        },
        required: ['designSystem', 'sections'],
      },
    },
  });

  if (!response.text) throw new Error('No analysis generated');

  try {
    const parsed = JSON.parse(response.text);
    console.log('Analysis response:', parsed);

    // Validate the response structure
    if (!parsed.designSystem) {
      throw new Error('Response missing designSystem');
    }
    if (!parsed.sections || !Array.isArray(parsed.sections)) {
      throw new Error('Response missing sections array');
    }

    return parsed;
  } catch (parseError) {
    console.error('Failed to parse analysis response:', response.text);
    throw new Error(
      `Failed to parse analysis: ${
        parseError instanceof Error ? parseError.message : 'Unknown error'
      }`
    );
  }
};
