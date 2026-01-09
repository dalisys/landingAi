import { GoogleGenAI } from '@google/genai';

// ==========================================
// FRONTEND DESIGN GUIDELINES
// ==========================================
// These guidelines ensure AI-generated designs avoid generic "AI slop" aesthetics
// and create distinctive, production-grade interfaces with bold creative choices.
export const FRONTEND_DESIGN_GUIDELINES = `

## FRONTEND AESTHETICS GUIDELINES - AVOIDING GENERIC AI DESIGN

**CRITICAL PRINCIPLE:** Create distinctive, memorable designs that avoid generic AI aesthetics.

### NEVER USE (Generic AI Slop):
- **Fonts:** Inter, Roboto, Arial, System-UI, or any default system fonts
- **Colors:** Purple gradients on white backgrounds, predictable blue/teal schemes
- **Layouts:** Cookie-cutter card grids, predictable hero sections
- **Style:** Generic, forgettable designs that lack personality

### ALWAYS USE (Distinctive Design):

**1. TYPOGRAPHY - Choose Bold, Memorable Fonts:**
   - Select DISTINCTIVE, characterful fonts with personality
   - Pair a bold display font with a refined body font
   - Examples of good choices: Playfair Display, Space Grotesk, Sora, DM Sans, Manrope, Work Sans, Lexend
   - Consider: Geometric sans, elegant serifs, unique monospace fonts
   - VARY your choices - don't converge on the same fonts repeatedly
   - Typography should reflect the brand's personality and purpose

**2. COLOR & THEME - Commit to a Cohesive Aesthetic:**
   - Choose a BOLD, distinctive color direction
   - Dominant colors with sharp, intentional accents
   - Use CSS variables for consistency
   - Examples: Warm earthy tones, bold neon cyber, soft pastels, monochrome with one accent
   - Color psychology: Match palette to brand emotion and purpose
   - AVOID: Timid, evenly-distributed palettes with no dominant color

**3. MOTION & MICRO-INTERACTIONS - High-Impact Moments:**
   - Focus animations on KEY MOMENTS, not scattered everywhere
   - Staggered page load reveals (use animation-delay for sequence)
   - Meaningful hover states that surprise and delight
   - Scroll-triggered animations at strategic points
   - Smooth transitions (transition-all, ease-in-out)
   - Example: One well-orchestrated entrance > many tiny scattered effects

**4. SPATIAL COMPOSITION - Break the Grid:**
   - Embrace UNEXPECTED layouts
   - Use asymmetry intentionally
   - Overlap elements for depth
   - Diagonal flow and grid-breaking components
   - Generous negative space OR controlled density (but intentional)
   - Avoid: Predictable 3-column card grids unless specifically appropriate

**5. BACKGROUNDS & VISUAL DETAILS - Create Atmosphere:**
   - NEVER default to solid colors
   - Use: Gradient meshes, noise textures, geometric patterns
   - Layered transparencies for depth
   - Dramatic shadows and lighting effects
   - Decorative borders and custom shapes
   - Grain overlays for texture
   - Match effects to the overall aesthetic direction

**6. DESIGN PERSONA & PHYSICAL METAPHOR:**
   - Every design should have a clear CONCEPTUAL DIRECTION
   - Ask: "If this were a physical object, what would it be?"
   - Examples:
     * "Frosted glass sheets floating in void" (Glassmorphism)
     * "Machined aluminum control panel" (Industrial/Tech)
     * "Hand-pressed letterpress on cotton paper" (Organic/Artisanal)
     * "Neon-lit terminal in a dark room" (Cyberpunk)
     * "Soft clay sculpted surfaces" (Soft UI)
   - Let the metaphor drive ALL visual decisions

**7. INTENTIONALITY OVER INTENSITY:**
   - Bold maximalism AND refined minimalism both work
   - The key is CLEAR INTENT and precise execution
   - Every element should have a PURPOSE
   - Remove anything that doesn't serve the design vision

### 🎯 EXECUTION CHECKLIST:
- [ ] Typography: Distinctive fonts chosen (NOT Inter/Roboto/Arial)
- [ ] Color: Bold palette with clear dominant tones
- [ ] Motion: Staggered animations at key moments
- [ ] Layout: Unexpected composition, not generic grid
- [ ] Details: Textures, gradients, depth (not flat solid colors)
- [ ] Metaphor: Clear physical or conceptual direction
- [ ] Coherence: Every element fits the overall vision

### 🚫 IP SAFEGUARD:
- NEVER reference specific artist names, movie titles, or trademarked brands
- Instead describe the STYLE using materials, physics, and adjectives
- Example: Instead of "Wes Anderson style" → "Symmetrical, pastel palette, flat lighting, center-composition"

**Remember:** The goal is to create interfaces that users will REMEMBER and find DELIGHTFUL.
Make unexpected creative choices that feel genuinely designed for the specific context.
`;

// Helper to initialize the client
export const getAiClient = () => {
  // Use Vite env or process env safely
  const apiKey =
    import.meta.env?.VITE_GEMINI_API_KEY ||
    (typeof process !== 'undefined' ? process.env?.API_KEY : undefined);
  if (!apiKey) throw new Error('API Key not found');
  return new GoogleGenAI({ apiKey });
};
