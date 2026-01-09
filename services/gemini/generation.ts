import { DesignSystem, Section, ExtractedWebsiteData } from '../../types';
import { STEPS_CONFIG } from '../../config/aiConfig';
import { FRONTEND_DESIGN_GUIDELINES, getAiClient } from './shared';
import { normalizeHtmlResponse } from './normalize';

export const generateSectionImage = async (
  section: Section,
  designSystem: DesignSystem
): Promise<string> => {
  const ai = getAiClient();

  const isHeroSection = section.name.toLowerCase().includes('hero');

  const fullPrompt = `
    Generate a HIGH-FIDELITY IMAGE of a website section UI.
    CRITICAL: RETURN ONLY AN IMAGE. DO NOT RETURN REACT CODE, HTML, OR CSS.
    The output must prove visually that the design is high-quality.

    Design a high-fidelity website section UI mockup.

    Section Name: ${section.name}
    Description: ${section.description}
    Specific Visual Details: ${section.visualPrompt}

    Design System Constraints:
    - Colors: ${designSystem.colorPalette.map((c) => `${c.role}: ${c.hex}`).join(', ')}
    - Typography Style: ${designSystem.typography}
    - Vibe: ${designSystem.styleDescription}

    Style Guidelines:
    - Style should be contemporary and high-quality.
    - Use realistic, standard web design elements (buttons, cards, forms) that users recognize instantly.

    ${
      isHeroSection
        ? 'IMPORTANT: This is the Hero section. Include a full navigation bar/header at the top with logo and menu items as part of this design.'
        : ''
    }

    ${FRONTEND_DESIGN_GUIDELINES}

    **VISUAL EXECUTION FOR THIS SECTION:**
    1. **Materiality**: Use the "Vibe" and Physical Metaphor from the design system to drive every visual choice.
    2. **Typography**: Apply the typography style from the design system. Use distinctive, high-quality web fonts.
    3. **Layout**: Be bold with negative space and hierarchy. Create unexpected, memorable compositions.
    4. **Depth & Atmosphere**: Add lighting, shadows, textures (noise, grain, gradients) to create rich visual depth.
    5. **Color Application**: Use the exact color palette provided, but apply creatively with gradients, overlays, and accents.

    Interpret creatively. Make unexpected choices that feel genuinely designed for this specific context.
  `;

  const response = await ai.models.generateContent({
    // model: "gemini-3-pro-image-preview", // High quality for initial generation
    model: STEPS_CONFIG.generateSectionImage.model, // High quality for initial generation
    contents: { parts: [{ text: fullPrompt }] },
    config: {
      responseModalities: ['IMAGE'],
      imageConfig: {
        aspectRatio: '16:9',
        // imageSize: "2K", // High res for web design
      },
    },
  });

  // Extract image
  for (const part of response.candidates?.[0]?.content?.parts || []) {
    if (part.inlineData) {
      return `data:image/png;base64,${part.inlineData.data}`;
    }
  }

  throw new Error('No image generated');
};

export const editSectionImage = async (
  originalImageBase64: string,
  editInstruction: string
): Promise<string> => {
  const ai = getAiClient();

  const mimeType =
    originalImageBase64.match(/data:([^;]+);base64,/)?.[1] || 'image/png';
  const cleanBase64 = originalImageBase64.includes('base64,')
    ? originalImageBase64.split('base64,')[1]
    : originalImageBase64;

  const fullPrompt = `${editInstruction}
  
  CRITICAL: RETURN ONLY AN EDITED IMAGE. DO NOT RETURN TEXT OR CODE.
  Important: Apply the requested changes to the provided image while maintaining the overall design quality and style.`;

  // Helper to attempt generation once
  const attemptEdit = async () => {
    return ai.models.generateContent({
      model: STEPS_CONFIG.editSectionImage.model,
      contents: {
        parts: [
          {
            inlineData: {
              mimeType: mimeType,
              data: cleanBase64,
            },
          },
          { text: fullPrompt },
        ],
      },
      config: {
        responseModalities: ['IMAGE'],
        imageConfig: {
          aspectRatio: '16:9',
        },
      },
    });
  };

  // Try up to 2 attempts (Gemini sometimes returns text-only on first try)
  for (let i = 0; i < 2; i++) {
    const response = await attemptEdit();
    for (const part of response.candidates?.[0]?.content?.parts || []) {
      if (part.inlineData) {
        console.log('Image edited successfully on attempt', i + 1);
        return `data:image/png;base64,${part.inlineData.data}`;
      }
      if (part.text) {
        console.warn('Model returned text instead of image:', part.text);
      }
    }
    console.warn('No image in response on attempt', i + 1);
  }

  throw new Error(
    'No edited image returned after retry. Try a shorter/simpler prompt or re-run.'
  );
};

export const generateSectionCode = async (
  section: Section,
  designSystem: DesignSystem,
  imageBase64?: string,
  contentImages?: string[],
  targetDesignScreenshots?: string[],
  originalScreenshots?: string[],
  extractedData?: ExtractedWebsiteData,
  userDescription?: string
): Promise<string> => {
  const ai = getAiClient();

  const isHeroSection = section.name.toLowerCase().includes('hero');
  console.log(`[GeminiService] generateSectionCode called for section: ${section.name}`);

  const promptText = `
    You are an expert Frontend Developer specializing in modern, high-conversion landing pages.
    ${imageBase64
      ? 'Convert this website section design into production-ready HTML and Tailwind CSS code.'
      : 'Create a production-ready HTML and Tailwind CSS implementation of this section based on the description and design system.'}

    Section: ${section.name}
    Description: ${section.description}
    Style Guide: ${designSystem.styleDescription}
    Colors: ${designSystem.colorPalette.map((c) => `${c.role}: ${c.hex}`).join(', ')}
    Typography: ${designSystem.typography}
    ${userDescription ? `User Intent: ${userDescription}` : ''}

    ${
      extractedData
        ? `
    EXTRACTED WEBSITE CONTENT (USE THIS TEXT, DO NOT INVENT NEW CONTENT):
    Business: ${extractedData.businessName || 'N/A'}
    Tagline: ${extractedData.tagline || 'N/A'}
    Description: ${extractedData.description || 'N/A'}

    Features:
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

    ${
      extractedData.testimonials && extractedData.testimonials.length > 0
        ? `Testimonials:
    ${extractedData.testimonials
      .map((t) => `- \"${t.content}\" - ${t.author}${t.role ? ` (${t.role})` : ''}`)
      .join('\n    ')}`
        : ''
    }

    Calls to Action: ${extractedData.callsToAction.join(', ')}
    Navigation Items: ${extractedData.structureAnalysis.navigationItems.join(', ')}
    ${
      extractedData.socialProof && extractedData.socialProof.length > 0
        ? `Social Proof: ${extractedData.socialProof.join(', ')}`
        : ''
    }
    `
        : ''
    }

    ${
      contentImages && contentImages.length > 0
        ? `IMPORTANT: Real content images have been generated and saved. Use these image URLs:
    ${contentImages.map((img, i) => `Image ${i + 1}: "${img}"`).join('\n    ')}
    `
        : ''
    }

    ${
      !imageBase64 && targetDesignScreenshots && targetDesignScreenshots.length > 0
        ? `
    REFERENCE DESIGN (TARGET STYLE):
    You have been provided with screenshots of a TARGET DESIGN. Use these as a strong visual reference for the layout, spacing, and overall aesthetic.
    `
        : ''
    }

    ${
      originalScreenshots && originalScreenshots.length > 0
        ? `
    ORIGINAL WEBSITE CONTEXT:
    You have been provided with screenshots of the ORIGINAL website. 
    Use these to understand the original content context, but DO NOT copy the old design. 
    You are REDESIGNING it to match the new Style Guide.
    `
        : ''
    }

    ${FRONTEND_DESIGN_GUIDELINES}

    **CODE IMPLEMENTATION RULES:**
    1. Use purely Tailwind CSS classes.
    2. DO NOT use external CSS files.
    3. Use 'lucide-react' icons where appropriate (represented as <i data-lucide="icon-name"></i> placeholders or SVG code).
    4. **RESPONSIVE**: Fully responsive, mobile-first. Use 'md:', 'lg:', 'xl:' prefixes.
    5. **INTERACTIVITY & MOTION**:
       - Add meaningful hover effects (hover:scale-105, hover:shadow-xl, hover:brightness-110)
       - Use transition-all for smooth animations
       - Add staggered animations with group-hover utilities where appropriate
       - Focus on high-impact moments, not scattered micro-interactions
    6. **ACCESSIBILITY**: Semantic HTML (<header>, <nav>, <button>, <section>, <article>).
    7. **BACKGROUNDS**: Use creative CSS backgrounds (gradients, patterns, layered effects) that match the design system.

    **TRANSLATING DESIGN METAPHORS TO TAILWIND:**
    Use the "Style Guide" to inform your Tailwind class choices:
    - **Glass**: \`backdrop-blur-md bg-white/10 border border-white/20 shadow-xl\`
    - **Paper**: \`bg-warm-gray-50 text-gray-900 shadow-sm\`
    - **Neon/Cyber**: \`bg-black text-cyan-400 shadow-[0_0_20px_rgba(0,255,255,0.5)] border border-cyan-500\`
    - **Brutalist**: \`border-2 border-black rounded-none shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]\`
    - **Minimal**: \`bg-white text-black border-none shadow-none\`
    - **Soft UI**: \`bg-gray-100 shadow-[inset_2px_2px_5px_rgba(0,0,0,0.1)] rounded-2xl\`

    **LAYOUT & COMPOSITION:**
    - Be bold with whitespace and negative space
    - Avoid generic "card grids" unless the design specifically calls for it
    - Use CSS Grid and Flexbox for interesting, asymmetrical layouts
    - Create visual hierarchy with size, color, and spacing
    - Overlap elements intentionally for depth (relative/absolute positioning)

    8. Return ONLY the HTML code for this section (e.g. <section>...</section>). Do not wrap in <html> or <body> tags yet.
    9. ${
      contentImages && contentImages.length > 0
        ? 'CRITICAL: Use the provided image URLs (starting with /generated-images/) for ALL images in this section. DO NOT use https://picsum.photos or any other external URLs. These are local file paths that will work.'
        : 'Use solid color blocks with gradients for images instead of broken external URLs. Example: <div class="w-full h-64 bg-gradient-to-r from-blue-400 to-purple-500"></div>'
    }
    9a. CONTENT RULES: The extracted website content above is the source of truth. You MAY rephrase, condense, or expand copy for clarity, and you MAY reorganize it across new sections. You MUST NOT invent new products, features, pricing, testimonials, or CTAs that are not present or strongly implied by the extracted content. If needed, infer benefits from existing features, but do not add new features. If content is missing, omit it or use a neutral placeholder like "[Add details]".
    ${
      isHeroSection
        ? '10. IMPORTANT: This is the Hero section. Include a full navigation bar/header at the top with logo and navigation menu items as part of this section.'
        : ''
    }
    ${
      isHeroSection ? '11' : '10'
    }. CRITICAL: ALL links must be non-functional. Use href="#" and add onclick="return false" to prevent navigation. This is a static mockup.
  `;

  const parts: any[] = [{ text: promptText }];

  // Only add the section mockup image if provided
  if (imageBase64) {
    const mimeType =
      imageBase64.match(/data:([^;]+);base64,/)?.[1] || 'image/png';
    const cleanBase64 = imageBase64.includes('base64,')
      ? imageBase64.split('base64,')[1]
      : imageBase64;
    parts.push({
      inlineData: {
        mimeType: mimeType,
        data: cleanBase64,
      },
    });
  }

  // Add target design screenshots if no specific section image is provided (as a fallback style reference)
  // or if we just want to reinforce the style in code-only mode
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

  // Add original screenshots if provided
  if (originalScreenshots && originalScreenshots.length > 0) {
    originalScreenshots.forEach((base64Data) => {
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

  // Content images are now file URLs, not base64, so we don't add them as inline data
  // They are already included in the text prompt above

  console.log(
    `[GeminiService] Sending request to Gemini (${STEPS_CONFIG.generateSectionCode.model})...`
  );
  try {
    const response = await ai.models.generateContent({
      model: STEPS_CONFIG.generateSectionCode.model, // Strong coding model
      contents: { parts },
    });
    console.log(`[GeminiService] Response received for ${section.name}`);

    let code = response.text || '';
    code = normalizeHtmlResponse(code);

    if (!code) {
      console.warn(`[GeminiService] Empty code returned for ${section.name}`);
    }

    return code;
  } catch (error) {
    console.error(
      `[GeminiService] Error generating code for ${section.name}:`,
      error
    );
    throw error;
  }
};

export const renderAndCaptureScreenshot = async (
  htmlCode: string
): Promise<string> => {
  return new Promise((resolve, reject) => {
    try {
      // Create an iframe to render the HTML
      const iframe = document.createElement('iframe');
      iframe.style.width = '1920px';
      iframe.style.height = '1080px';
      iframe.style.position = 'fixed';
      iframe.style.left = '-9999px';
      iframe.style.top = '0';
      document.body.appendChild(iframe);

      // Write HTML to iframe
      iframe.contentDocument?.open();
      iframe.contentDocument?.write(`
        <!DOCTYPE html>
        <html>
          <head>
            <script src="https://cdn.tailwindcss.com"></script>
            <style>
              body { margin: 0; padding: 0; }
            </style>
          </head>
          <body>
            ${htmlCode}
          </body>
        </html>
      `);
      iframe.contentDocument?.close();

      // Wait for content to load
      setTimeout(async () => {
        try {
          const iframeDoc = iframe.contentDocument;
          if (!iframeDoc) throw new Error('Could not access iframe content');

          // Use html2canvas to capture screenshot
          const html2canvas = (await import('html2canvas')).default;
          const canvas = await html2canvas(iframeDoc.body, {
            width: 1920,
            height: 1080,
            scale: 1,
          });

          const screenshot = canvas.toDataURL('image/png');
          document.body.removeChild(iframe);
          resolve(screenshot);
        } catch (error) {
          document.body.removeChild(iframe);
          reject(error);
        }
      }, 2000); // Wait 2 seconds for Tailwind and rendering
    } catch (error) {
      reject(error);
    }
  });
};

export const generateContentImages = async (
  section: Section,
  designSystem: DesignSystem,
  count: number = 3
): Promise<string[]> => {
  const ai = getAiClient();
  const images: string[] = [];

  for (let i = 0; i < count; i++) {
    try {
      const prompt = `
        Create a professional, high-quality content image for a website section.
        CRITICAL: RETURN ONLY AN IMAGE.

        Section Context: ${section.name} - ${section.description}
        Image Purpose: Content illustration #${i + 1} for this section

        Style Guidelines:
        - Colors: ${designSystem.colorPalette.map((c) => `${c.role}: ${c.hex}`).join(', ')}
        - Vibe: ${designSystem.styleDescription}
        - Style: Modern, professional, suitable for web content

        Create an image that would fit well in this section's context.
        The image should be abstract, professional, and match the design system colors.
        ${
          i === 0
            ? 'Primary hero/feature image'
            : i === 1
            ? 'Secondary supporting image'
            : 'Tertiary decorative image'
        }
      `;

      const response = await ai.models.generateContent({
        model: STEPS_CONFIG.generateContentImages.model,
        contents: { parts: [{ text: prompt }] },
        config: {
          responseModalities: ['IMAGE'],
        },
      });

      // Extract image
      for (const part of response.candidates?.[0]?.content?.parts || []) {
        if (part.inlineData) {
          images.push(`data:image/png;base64,${part.inlineData.data}`);
          break;
        }
      }
    } catch (err) {
      console.error(`Failed to generate content image ${i + 1}:`, err);
    }
  }

  return images;
};
