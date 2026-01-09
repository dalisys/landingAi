export enum AppStatus {
  IDLE = "IDLE",
  EXTRACTING_DATA = "EXTRACTING_DATA",
  ANALYZING = "ANALYZING",
  PLAN_REVIEW = "PLAN_REVIEW",
  GENERATING_IMAGES = "GENERATING_IMAGES",
  GENERATING_CODE = "GENERATING_CODE",
  RENDERING_PREVIEW = "RENDERING_PREVIEW",
  REVIEWING_CODE = "REVIEWING_CODE",
  APPLYING_FIXES = "APPLYING_FIXES",
  COMPLETED = "COMPLETED",
  ERROR = "ERROR",
}

export enum GenerationMode {
  FULL = "FULL",     // Generate images -> Generate code
  CODE_ONLY = "CODE_ONLY" // Skip images -> Generate code directly
}

export interface ColorItem {
  hex: string;
  role: string;
}

export interface DesignSystem {
  colorPalette: ColorItem[];
  typography: string;
  styleDescription: string;
}

export interface Section {
  id: string;
  name: string;
  description: string;
  visualPrompt: string;
  generatedImageUrl?: string;
  generatedCode?: string;
  isEditing?: boolean;
}

export interface CodeReview {
  passedReview: boolean;
  feedback: string;
  suggestedFixes?: Array<{
    sectionId: string;
    issue: string;
    suggestion: string;
  }>;
}

export interface ProjectState {
  projectId?: string;
  generationMode?: GenerationMode;
  userDescription: string;
  screenshots: string[]; // base64 strings of current landing page
  targetDesignUrl?: string;
  targetDesignScreenshots?: string[]; // base64 strings of target design
  extractedData?: ExtractedWebsiteData;
  designSystem?: DesignSystem;
  sections: Section[];
  contentImages?: Record<string, string>; // sectionId -> generated image base64
  previewScreenshots?: string[]; // Screenshots of rendered code
  codeReview?: CodeReview;
  error?: string;
}

export interface GenerationConfig {
  apiKey: string;
}

export interface ExtractedWebsiteData {
  // Content information
  businessName?: string;
  tagline?: string;
  description?: string;

  // Features and offerings
  features: Array<{
    name: string;
    description: string;
  }>;

  // Pricing information
  pricing?: {
    plans: Array<{
      name: string;
      price: string;
      features: string[];
    }>;
  };

  // Design analysis
  designAnalysis: {
    colorScheme: string[];
    typographyStyle: string;
    layoutPattern: string;
    visualStyle: string;
  };

  // Structure analysis
  structureAnalysis: {
    sections: Array<{
      type: string; // e.g., "hero", "features", "pricing", "testimonials", "footer"
      description: string;
    }>;
    navigationItems: string[];
  };

  // Additional content
  testimonials?: Array<{
    author: string;
    content: string;
    role?: string;
  }>;

  callsToAction: string[];
  socialProof?: string[];
}

export interface Artifact {
  id: string;
  styleName: string;
  html: string;
  status: "streaming" | "complete" | "error";
}

export interface Session {
  id: string;
  prompt: string;
  timestamp: number;
  artifacts: Artifact[];
}

export interface ComponentVariation {
  name: string;
  html: string;
}
