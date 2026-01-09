import React, { useState, useEffect } from 'react';
import { AppStatus, ProjectState, Section, GenerationMode } from './types';
import { StepIndicator } from './components/StepIndicator';
import { InputArea } from './components/InputArea';
import { PlanReview } from './components/PlanReview';
import { Gallery } from './components/Gallery';
import { FinalResult } from './components/FinalResult';
import { extractWebsiteData, analyzeScreenshots, generateSectionImage, generateSectionCode, generateContentImages, renderAndCaptureScreenshot, reviewGeneratedCode, applyCodeFixes } from './services/geminiService';
import { calculateCost, estimateTokens, estimateImageTokens, ModelType, formatCost } from './services/pricingService';
import { captureScreenshot } from './services/screenshotService';
import { saveImage, generateFilename } from './services/imageStorageService';
import { Sparkles, Terminal, Key, ArrowRight, DollarSign } from 'lucide-react';

export default function App() {
  const [status, setStatus] = useState<AppStatus>(AppStatus.IDLE);
  const [viewStatus, setViewStatus] = useState<AppStatus>(AppStatus.IDLE);
  const [hasApiKey, setHasApiKey] = useState(false);
  const [totalCost, setTotalCost] = useState(0);
  const [project, setProject] = useState<ProjectState>({
    userDescription: '',
    screenshots: [],
    sections: []
  });

  // Read environment variable for sensitive data display
  const displaySensitiveData = import.meta.env?.VITE_DISPLAY_DATA === 'true';

  const updateStatus = (next: AppStatus) => {
    setStatus(next);
    setViewStatus(next);
  };

  const addCost = (cost: number) => {
    setTotalCost(prev => prev + cost);
  };

  useEffect(() => {
    const apiKey =
      import.meta.env?.VITE_GEMINI_API_KEY ||
      (typeof process !== 'undefined' ? process.env?.API_KEY : undefined);
    setHasApiKey(!!apiKey);
  }, []);

  const handleStart = async (description: string, screenshots: string[], url?: string, targetDesignUrl?: string, mode: GenerationMode = GenerationMode.FULL) => {
    // Generate Project ID
    const timestamp = Date.now();
    let domain = 'manual';
    if (url) {
      try {
        domain = new URL(url).hostname.replace(/[^a-z0-9]/gi, '_');
      } catch (e) { /* ignore invalid url */ }
    }
    const projectId = `project-${domain}-${timestamp}`;

    setProject(prev => ({
      ...prev,
      projectId,
      userDescription: description,
      screenshots,
      targetDesignUrl,
      generationMode: mode
    }));
    updateStatus(AppStatus.EXTRACTING_DATA);

    try {
      // Capture target design screenshots if URL provided
      let targetDesignScreenshots: string[] = [];
      if (targetDesignUrl) {
        try {
          console.log("Capturing target design screenshots from:", targetDesignUrl);
          targetDesignScreenshots = await captureScreenshot(targetDesignUrl);
          setProject(prev => ({ ...prev, targetDesignScreenshots }));
        } catch (err) {
          console.warn("Failed to capture target design screenshots:", err);
          // Continue without target design if capture fails
        }
      }

      // Step 1: Extract all website data using Gemini 2.5 Flash
      const extractedData = await extractWebsiteData(screenshots, url);

      // Validate extracted data
      if (!extractedData || !extractedData.features || !extractedData.designAnalysis || !extractedData.structureAnalysis) {
        throw new Error("Invalid data extracted from screenshots");
      }

      // Estimate cost for extraction
      const extractionCost = calculateCost({
        model: ModelType.GEMINI_2_5_FLASH,
        inputTokens: screenshots.length * estimateImageTokens() + estimateTokens(url || ""),
        outputTokens: 2000, // Estimated JSON output
      });
      addCost(extractionCost);

      setProject(prev => ({
        ...prev,
        extractedData
      }));

      // Step 2: Analyze and create redesign plan with the extracted data and target design
      updateStatus(AppStatus.ANALYZING);
      const analysis = await analyzeScreenshots(
        screenshots,
        description,
        extractedData,
        url,
        targetDesignScreenshots.length > 0 ? targetDesignScreenshots : undefined
      );

      // Validate analysis results
      if (!analysis || !analysis.designSystem || !analysis.sections) {
        throw new Error("Invalid analysis results");
      }

      // Estimate cost for analysis (uses Gemini 3 Pro)
      const analysisCost = calculateCost({
        model: ModelType.GEMINI_3_PRO_PREVIEW,
        inputTokens: (screenshots.length + targetDesignScreenshots.length) * estimateImageTokens() + estimateTokens(description) + 3000,
        outputTokens: 2000,
      });
      addCost(analysisCost);

      setProject(prev => ({
        ...prev,
        designSystem: analysis.designSystem,
        sections: analysis.sections || []
      }));
      updateStatus(AppStatus.PLAN_REVIEW);
    } catch (e) {
      console.error("Error in handleStart:", e);
      const errorMessage = e instanceof Error ? e.message : "Unknown error occurred";
      alert(`Analysis failed: ${errorMessage}\n\nPlease try again. Ensure you have a valid API Key.`);
      updateStatus(AppStatus.IDLE);
      setProject({
        userDescription: '',
        screenshots: [],
        sections: []
      });
    }
  };

  const handleApprovePlan = async () => {
    // If Code Only mode, skip image generation and go straight to code generation phase
    if (project.generationMode === GenerationMode.CODE_ONLY) {
       await handleGenerateCode();
       return;
    }

    updateStatus(AppStatus.GENERATING_IMAGES);

    // Generate images sequentially to avoid hitting rate limits too hard if using free tier
    // but parallel is better for UX. We'll do simple Promise.all for now.
    const newSections = [...project.sections];

    // We update state progressively
    const updateSectionWithImage = (idx: number, url: string) => {
        setProject(prev => {
            const updated = [...prev.sections];
            updated[idx].generatedImageUrl = url;
            return { ...prev, sections: updated };
        });
    };

    try {
      if (!project.designSystem) throw new Error("No design system");

      const promises = newSections.map(async (section, idx) => {
        try {
          const url = await generateSectionImage(section, project.designSystem!);
          updateSectionWithImage(idx, url);

          // Add cost for image generation (Gemini 3 Pro Image)
          const imageCost = calculateCost({
            model: ModelType.GEMINI_3_PRO_IMAGE_PREVIEW,
            inputTokens: estimateTokens(section.name + section.description + section.visualPrompt),
            outputImages: 1,
          });
          addCost(imageCost);
        } catch (err) {
          console.error(`Failed to generate image for section ${section.name}`, err);
          // Use a placeholder or retry logic here could be added
        }
      });

      await Promise.all(promises);

    } catch (e) {
        console.error(e);
    }
  };

  const handleGenerateCode = async () => {
    updateStatus(AppStatus.GENERATING_CODE);

    const updateSectionWithCode = (idx: number, code: string) => {
        setProject(prev => {
            const updated = [...prev.sections];
            updated[idx].generatedCode = code;
            return { ...prev, sections: updated };
        });
    };

    try {
       if (!project.designSystem) throw new Error("No design system");

       const contentImagesMap: Record<string, string[]> = {};

       // Only generate content images if NOT in CODE_ONLY mode
       if (project.generationMode !== GenerationMode.CODE_ONLY) {
         // First, generate content images for each section
         const imageGenPromises = project.sections.map(async (section) => {
           try {
             console.log(`Generating content images for section: ${section.name}`);
             const base64Images = await generateContentImages(section, project.designSystem!, 2); // Generate 2 images per section

             // Save each image to a file and get URLs
             const imageUrls: string[] = [];
             for (let i = 0; i < base64Images.length; i++) {
               const filename = generateFilename(`section-${section.id}-content-${i}`);
               const url = await saveImage(base64Images[i], filename, project.projectId);
               imageUrls.push(url);
               console.log(`Saved content image: ${url}`);
             }

             contentImagesMap[section.id] = imageUrls;

             // Add cost for image generation
             const imageCost = calculateCost({
               model: ModelType.GEMINI_2_5_FLASH_IMAGE,
               inputTokens: estimateTokens(section.name + section.description),
               outputImages: base64Images.length,
             });
             addCost(imageCost);
           } catch(err) {
              console.error(`Failed to generate content images for ${section.name}:`, err);
              contentImagesMap[section.id] = [];
           }
         });

         await Promise.all(imageGenPromises);
       }

       // Store content images URLs in project state
       setProject(prev => ({ ...prev, contentImages: contentImagesMap }));

       // Now generate code with the content images
       console.log(`Starting code generation for ${project.sections.length} sections...`);
       const codeGenPromises = project.sections.map(async (section, idx) => {
         try {
           console.log(`[Section ${idx}] Starting code generation for: ${section.name}`);
           const sectionContentImages = contentImagesMap[section.id] || [];
           
           const code = await generateSectionCode(
             section,
             project.designSystem!,
             section.generatedImageUrl,
             sectionContentImages,
             project.targetDesignScreenshots, // Pass target design screenshots if available
             project.screenshots, // Pass original screenshots
             project.extractedData,
             project.userDescription
           );
           
           console.log(`[Section ${idx}] Code generated successfully. Length: ${code.length}`);
           updateSectionWithCode(idx, code);

           // Add cost for code generation (Gemini 3 Pro)
           const codeCost = calculateCost({
             model: ModelType.GEMINI_3_PRO_PREVIEW,
             inputTokens: estimateTokens(section.name + section.description + sectionContentImages.join(' ')) +
                         (section.generatedImageUrl ? estimateImageTokens() : 0),
             outputTokens: 1500, // Estimated HTML/CSS output
           });
           addCost(codeCost);
         } catch(err) {
            console.error(`[Section ${idx}] Failed to generate code:`, err);
         }
       });

       console.log("Waiting for all code generation promises to resolve...");
       await Promise.all(codeGenPromises);
       console.log("All code generation promises resolved.");

       // After code generation, start review process
       console.log("Starting code review process...");
       await handleReviewCode();
    } catch (e) {
        console.error("Critical error in handleGenerateCode:", e);
        alert("Code generation encountered an issue.");
        updateStatus(AppStatus.COMPLETED); // Allow partial results
    }
  };

  const handleReviewCode = async () => {
    try {
      if (!project.designSystem || !project.extractedData) {
        throw new Error("Missing required data for review");
      }

      updateStatus(AppStatus.RENDERING_PREVIEW);

      // Capture screenshots of all generated sections
      const screenshots: string[] = [];
      for (const section of project.sections) {
        if (section.generatedCode) {
          try {
            const screenshot = await renderAndCaptureScreenshot(section.generatedCode);
            screenshots.push(screenshot);
          } catch (err) {
            console.error(`Failed to capture screenshot for ${section.name}:`, err);
          }
        }
      }

      setProject(prev => ({ ...prev, previewScreenshots: screenshots }));

      // Send to AI reviewer
      updateStatus(AppStatus.REVIEWING_CODE);
      const review = await reviewGeneratedCode(
        screenshots,
        project.sections,
        project.designSystem,
        project.extractedData,
        project.userDescription
      );

      // Add cost for review
      const reviewCost = calculateCost({
        model: ModelType.GEMINI_3_PRO_PREVIEW,
        inputTokens: screenshots.length * estimateImageTokens() + 2000,
        outputTokens: 1000,
      });
      addCost(reviewCost);

      setProject(prev => ({ ...prev, codeReview: review }));

      // If fixes are needed, apply them
      if (!review.passedReview && review.suggestedFixes && review.suggestedFixes.length > 0) {
        await handleApplyFixes(review.suggestedFixes);
      } else {
        updateStatus(AppStatus.COMPLETED);
      }
    } catch (e) {
      console.error("Review process failed:", e);
      // Continue to completion even if review fails
      updateStatus(AppStatus.COMPLETED);
    }
  };

  const handleApplyFixes = async (fixes: any[]) => {
    try {
      if (!project.designSystem) throw new Error("No design system");

      updateStatus(AppStatus.APPLYING_FIXES);

      for (const fix of fixes) {
        const sectionIndex = project.sections.findIndex(s => s.id === fix.sectionId);
        if (sectionIndex >= 0) {
          const section = project.sections[sectionIndex];
          if (section.generatedCode) {
            try {
              const fixedCode = await applyCodeFixes(
                section,
                fix.issue,
                fix.suggestion,
                section.generatedCode,
                project.designSystem
              );

              setProject(prev => {
                const updated = [...prev.sections];
                updated[sectionIndex].generatedCode = fixedCode;
                return { ...prev, sections: updated };
              });

              // Add cost for fix
              const fixCost = calculateCost({
                model: ModelType.GEMINI_3_PRO_PREVIEW,
                inputTokens: estimateTokens(section.generatedCode),
                outputTokens: 1500,
              });
              addCost(fixCost);
            } catch (err) {
              console.error(`Failed to apply fix for ${section.name}:`, err);
            }
          }
        }
      }

      updateStatus(AppStatus.COMPLETED);
    } catch (e) {
      console.error("Failed to apply fixes:", e);
      updateStatus(AppStatus.COMPLETED);
    }
  };

  const handleUpdateSectionImage = (id: string, newImage: string) => {
    setProject(prev => ({
      ...prev,
      sections: prev.sections.map(s => s.id === id ? { ...s, generatedImageUrl: newImage } : s)
    }));
  };

  // Editable plan helpers
  const handleUpdateDesignSystem = (updates: Partial<ProjectState['designSystem']>) => {
    setProject(prev => ({
      ...prev,
      designSystem: prev.designSystem ? { ...prev.designSystem, ...updates } : prev.designSystem
    }));
  };

  const handleUpdateSection = (id: string, updates: Partial<Section>) => {
    setProject(prev => ({
      ...prev,
      sections: prev.sections.map(s => s.id === id ? { ...s, ...updates } : s)
    }));
  };

  const handleAddSection = () => {
    setProject(prev => ({
      ...prev,
      sections: [
        ...prev.sections,
        {
          id: `section-${Date.now()}-${Math.random().toString(16).slice(2,6)}`,
          name: 'New Section',
          description: 'Describe the goal of this section',
          visualPrompt: 'Add visual guidance here',
        }
      ]
    }));
  };

  const handleDeleteSection = (id: string) => {
    setProject(prev => ({
      ...prev,
      sections: prev.sections.filter(s => s.id !== id)
    }));
  };

  const handleMoveSection = (id: string, direction: 'up' | 'down') => {
    setProject(prev => {
      const idx = prev.sections.findIndex(s => s.id === id);
      if (idx === -1) return prev;
      const target = direction === 'up' ? idx - 1 : idx + 1;
      if (target < 0 || target >= prev.sections.length) return prev;
      const newSections = [...prev.sections];
      [newSections[idx], newSections[target]] = [newSections[target], newSections[idx]];
      return { ...prev, sections: newSections };
    });
  };

  // Helper to get status messages based on displaySensitiveData
  const getStatusMessage = (currentStatus: AppStatus, displayData: boolean) => {
    switch (currentStatus) {
      case AppStatus.EXTRACTING_DATA:
        return {
          title: 'Extracting Website Data...',
          subtitle: displayData ? 'Analyzing all content, features, and structure' : 'Analyzing website content and structure'
        };
      case AppStatus.ANALYZING:
        return {
          title: 'Creating Redesign Plan...',
          subtitle: displayData ? 'Using extracted data to design a better user experience' : 'Designing a better user experience'
        };
      case AppStatus.GENERATING_IMAGES:
        return {
          title: 'Generating Visual Assets',
          subtitle: displayData ? 'Creating high-fidelity mockups for each section...' : 'Creating high-fidelity mockups for each section...'
        };
      case AppStatus.GENERATING_CODE:
        return {
          title: 'Generating Code',
          subtitle: displayData ? 'Compiling production-ready HTML for each section...' : 'Compiling production-ready HTML for each section...'
        };
      case AppStatus.RENDERING_PREVIEW:
        return {
          title: 'Rendering UI Preview...',
          subtitle: displayData ? 'Capturing screenshots of generated sections' : 'Capturing preview images'
        };
      case AppStatus.REVIEWING_CODE:
        return {
          title: 'Reviewing Design...',
          subtitle: displayData ? 'AI is analyzing design quality and requirements match' : 'Ensuring quality and adherence to requirements'
        };
      case AppStatus.APPLYING_FIXES:
        return {
          title: 'Applying Adjustments...',
          subtitle: displayData ? 'Implementing suggested improvements' : 'Refining the design based on feedback'
        };
      default:
        return { title: '', subtitle: '' };
    }
  };

  if (!hasApiKey) {
    return (
      <div className="min-h-screen bg-black text-white flex flex-col items-center justify-center p-6 relative overflow-hidden" style={{ fontFamily: 'var(--font-body)' }}>
        {/* Background Effects */}
        <div className="fixed inset-0 grid-background opacity-60 pointer-events-none"></div>
        <div className="scan-lines fixed inset-0 pointer-events-none"></div>
        <div className="noise-overlay fixed inset-0 pointer-events-none"></div>

        <div className="max-w-md w-full bg-black/80 border-2 border-cyan-500/50 p-8 shadow-2xl text-center animate-fade-in-up relative z-10 cyber-border">
          <div className="w-20 h-20 bg-black border-2 border-magenta-500 cyber-border flex items-center justify-center mx-auto mb-6 pulse-glow">
            <Key className="neon-text-magenta" size={32} />
          </div>
          <h1 className="text-3xl font-bold neon-text-cyan mb-2" style={{ fontFamily: 'var(--font-display)' }}>ACCESS_REQUIRED</h1>
          <p className="text-xs text-cyan-300/60 mb-6" style={{ fontFamily: 'var(--font-mono)' }}>
            &gt; SYSTEM_CHECK: API_KEY_NOT_FOUND
          </p>
          <p className="text-cyan-100/70 mb-8 text-sm">
            To generate high-quality UI designs, this app requires a paid API Key.
          </p>

          <div className="bg-black/60 border border-cyan-500/30 p-4 mb-8 text-left">
             <h3 className="text-sm font-semibold neon-text-yellow mb-2 flex items-center gap-2" style={{ fontFamily: 'var(--font-mono)' }}>
               <Key size={16} /> API_KEY_REQUIRED
             </h3>
             <p className="text-xs text-cyan-100/60 leading-relaxed mb-3" style={{ fontFamily: 'var(--font-body)' }}>
               Please select a Google Cloud Project with billing enabled to use the advanced image generation models.
             </p>
             <a href="https://ai.google.dev/gemini-api/docs/billing" target="_blank" rel="noopener noreferrer" className="text-xs neon-text-cyan hover:text-cyan-300 underline inline-block" style={{ fontFamily: 'var(--font-mono)' }}>
               &gt; LEARN_MORE
             </a>
          </div>

          <div className="text-xs text-cyan-200/70">
            Set <span className="neon-text-cyan">VITE_GEMINI_API_KEY</span> in your local env and restart the dev server.
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white flex flex-col relative overflow-hidden" style={{ fontFamily: 'var(--font-body)' }}>
      {/* Animated Grid Background */}
      <div className="fixed inset-0 grid-background opacity-60 pointer-events-none"></div>

      {/* Scan Lines Effect */}
      <div className="scan-lines fixed inset-0 pointer-events-none"></div>

      {/* Noise Overlay */}
      <div className="noise-overlay fixed inset-0 pointer-events-none"></div>

      <header className="relative py-4 md:py-6 border-b border-cyan-500/20 bg-black/80 backdrop-blur-xl sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div className="flex items-center gap-3 animate-fade-in-up">
              <div className="relative p-2 md:p-2.5 bg-black border-2 border-cyan-500 cyber-border pulse-glow">
                <Sparkles className="neon-text-cyan" size={20} />
              </div>
              <div>
                <h1 className="text-lg md:text-2xl font-bold neon-text-cyan" style={{ fontFamily: 'var(--font-display)' }}>
                  LANDING<span className="neon-text-magenta">AI</span>
                </h1>
                <div className="text-[10px] md:text-xs text-cyan-300/60" style={{ fontFamily: 'var(--font-mono)' }}>
                  &gt; DESIGN_TERMINAL v3.0
                </div>
              </div>
            </div>
            {displaySensitiveData && (
              <div className="flex items-center gap-3 md:gap-4 animate-fade-in-up stagger-2">
                {/* Cost Tracker */}
                <div className="flex items-center gap-2 px-3 md:px-4 py-2 bg-black/80 border border-cyan-500/30 rounded-sm hover:border-magenta-500/50 transition-all">
                  <DollarSign size={16} className="neon-text-yellow" />
                  <div className="flex flex-col">
                    <span className="text-[10px] text-cyan-300/60" style={{ fontFamily: 'var(--font-mono)' }}>API_COST</span>
                    <span className="text-xs md:text-sm font-bold neon-text-yellow" style={{ fontFamily: 'var(--font-mono)' }}>{formatCost(totalCost)}</span>
                  </div>
                </div>
                <div className="hidden md:flex text-xs text-cyan-300/60 items-center gap-2" style={{ fontFamily: 'var(--font-mono)' }}>
                  <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse shadow-lg" style={{ boxShadow: '0 0 10px rgba(0, 255, 0, 0.8)' }}></div>
                  SYSTEM_ONLINE
                </div>
              </div>
            )}
          </div>
        </div>
      </header>

      <main className="flex-1 p-4 sm:p-6 lg:p-8">
        {status !== AppStatus.IDLE && (
          <StepIndicator
            status={status}
            viewStatus={viewStatus}
            onStepSelect={(step) => setViewStatus(step)}
            mode={project.generationMode}
          />
        )}

        <div className="mt-8 relative z-10">
          {viewStatus === AppStatus.IDLE && (
            <div className="animate-fade-in-up">
              <div className="text-center mb-12">
                 <div className="inline-block mb-4 px-4 py-2 border border-cyan-500/30 bg-black/50 backdrop-blur-sm" style={{ fontFamily: 'var(--font-mono)', fontSize: '12px' }}>
                   <span className="neon-text-cyan">&gt;_</span> <span className="text-cyan-300/60">INITIALIZE</span> <span className="neon-text-magenta">REDESIGN.PROTOCOL</span>
                 </div>
                 <h1 className="text-4xl md:text-7xl font-extrabold mb-6 tracking-tight" style={{ fontFamily: 'var(--font-display)' }}>
                   <span className="neon-text-cyan terminal-cursor">REIMAGINE</span>
                   <br/>
                   <span className="text-white">YOUR </span>
                   <span className="neon-text-magenta">WEBSITE</span>
                 </h1>
                 <p className="text-base md:text-lg text-cyan-100/70 max-w-2xl mx-auto leading-relaxed" style={{ fontFamily: 'var(--font-body)' }}>
                   Upload screenshots of your current landing page. AI agents will analyze UX patterns,
                   synthesize a fresh aesthetic, generate visual assets, and compile production-ready code.
                 </p>
                 <div className="mt-6 flex items-center justify-center gap-4 text-sm" style={{ fontFamily: 'var(--font-mono)' }}>
                   <div className="flex items-center gap-2">
                     <div className="w-2 h-2 bg-cyan-400 hexagon-clip pulse-glow"></div>
                     <span className="text-cyan-300/60">VISUAL_SYNTHESIS</span>
                   </div>
                   <div className="flex items-center gap-2">
                     <div className="w-2 h-2 bg-magenta-400 hexagon-clip pulse-glow"></div>
                     <span className="text-cyan-300/60">CODE_GENERATION</span>
                   </div>
                   <div className="flex items-center gap-2">
                     <div className="w-2 h-2 bg-yellow-400 hexagon-clip pulse-glow"></div>
                     <span className="text-cyan-300/60">UX_ANALYSIS</span>
                   </div>
                 </div>
              </div>
              <InputArea onStart={handleStart} isLoading={false} />
            </div>
          )}

          {viewStatus === AppStatus.EXTRACTING_DATA && (
            <div className="flex flex-col items-center justify-center h-64 animate-fade-in">
               <div className="w-20 h-20 cyber-spinner mb-8" style={{ borderWidth: '4px' }}></div>
               <p className="text-xl font-medium neon-text-cyan mb-2" style={{ fontFamily: 'var(--font-display)' }}>{getStatusMessage(viewStatus, displaySensitiveData).title}</p>
               <p className="text-sm text-cyan-300/60" style={{ fontFamily: 'var(--font-mono)' }}>{getStatusMessage(viewStatus, displaySensitiveData).subtitle}</p>
               <div className="mt-6 flex gap-2">
                 <div className="w-2 h-2 bg-cyan-400 rounded-full animate-pulse"></div>
                 <div className="w-2 h-2 bg-cyan-400 rounded-full animate-pulse" style={{ animationDelay: '0.2s' }}></div>
                 <div className="w-2 h-2 bg-cyan-400 rounded-full animate-pulse" style={{ animationDelay: '0.4s' }}></div>
               </div>
            </div>
          )}

          {viewStatus === AppStatus.ANALYZING && (
            <div className="flex flex-col items-center justify-center h-64 animate-fade-in">
               <div className="w-20 h-20 cyber-spinner mb-8" style={{ borderWidth: '4px', borderTopColor: 'var(--neon-magenta)', borderRightColor: 'var(--neon-cyan)' }}></div>
               <p className="text-xl font-medium neon-text-magenta mb-2" style={{ fontFamily: 'var(--font-display)' }}>{getStatusMessage(viewStatus, displaySensitiveData).title}</p>
               <p className="text-sm text-cyan-300/60" style={{ fontFamily: 'var(--font-mono)' }}>{getStatusMessage(viewStatus, displaySensitiveData).subtitle}</p>
               <div className="mt-6 flex gap-2">
                 <div className="w-2 h-2 bg-magenta-400 rounded-full animate-pulse"></div>
                 <div className="w-2 h-2 bg-magenta-400 rounded-full animate-pulse" style={{ animationDelay: '0.2s' }}></div>
                 <div className="w-2 h-2 bg-magenta-400 rounded-full animate-pulse" style={{ animationDelay: '0.4s' }}></div>
               </div>
            </div>
          )}

          {viewStatus === AppStatus.PLAN_REVIEW && (
             <PlanReview
               projectState={project}
               onApprove={handleApprovePlan}
               onUpdateDesignSystem={handleUpdateDesignSystem}
               onUpdateSection={handleUpdateSection}
               onAddSection={handleAddSection}
               onDeleteSection={handleDeleteSection}
               onMoveSection={handleMoveSection}
               mode={project.generationMode}
             />
          )}

          {(viewStatus === AppStatus.GENERATING_IMAGES || (viewStatus === AppStatus.GENERATING_CODE && project.sections.some(s => !s.generatedCode))) && (
             <div className="animate-fade-in">
               <div className="text-center mb-8">
                  <div className="inline-block mb-4 px-4 py-2 border border-cyan-500/30 bg-black/50 backdrop-blur-sm" style={{ fontFamily: 'var(--font-mono)', fontSize: '12px' }}>
                    <span className="neon-text-cyan">&gt;_</span> <span className="text-cyan-300/60">PROCESS:</span>{' '}
                    <span className="neon-text-magenta">
                      {project.generationMode === GenerationMode.CODE_ONLY ? 'CODE_GENERATION' : 'VISUAL_SYNTHESIS'}
                    </span>
                  </div>
                  <h2 className="text-2xl md:text-4xl font-bold neon-text-cyan mb-2" style={{ fontFamily: 'var(--font-display)' }}>
                    {getStatusMessage(
                      project.generationMode === GenerationMode.CODE_ONLY
                        ? AppStatus.GENERATING_CODE
                        : AppStatus.GENERATING_IMAGES,
                      displaySensitiveData
                    ).title}
                  </h2>
                  <p className="text-cyan-100/70" style={{ fontFamily: 'var(--font-body)' }}>
                    {getStatusMessage(
                      project.generationMode === GenerationMode.CODE_ONLY
                        ? AppStatus.GENERATING_CODE
                        : AppStatus.GENERATING_IMAGES,
                      displaySensitiveData
                    ).subtitle}
                  </p>
               </div>
               {project.generationMode === GenerationMode.CODE_ONLY ? (
                 <div className="max-w-4xl mx-auto bg-black/70 border-2 border-magenta-500/50 shadow-2xl">
                   <div className="p-4 border-b border-magenta-500/30 bg-black/80">
                     <div className="flex items-center justify-between flex-wrap gap-4">
                       <div className="flex items-center gap-3">
                         <div className="w-8 h-8 border-2 border-magenta-500/60 flex items-center justify-center">
                           <Terminal size={16} className="neon-text-magenta" />
                         </div>
                         <div>
                           <p className="text-xs text-cyan-300/60" style={{ fontFamily: 'var(--font-mono)' }}>&gt; CODE_PIPELINE</p>
                           <p className="text-sm text-cyan-100/80" style={{ fontFamily: 'var(--font-body)' }}>
                             {project.sections.filter(s => s.generatedCode).length} / {project.sections.length} sections compiled
                           </p>
                         </div>
                       </div>
                       <div className="text-xs text-cyan-300/60" style={{ fontFamily: 'var(--font-mono)' }}>
                         MODE: CODE_ONLY
                       </div>
                     </div>
                   </div>
                   <div className="divide-y divide-cyan-500/10">
                     {project.sections.map((section, idx) => {
                       const done = !!section.generatedCode;
                       return (
                         <div key={section.id} className="p-4 flex items-center justify-between gap-4">
                           <div className="min-w-0">
                             <p className="text-sm text-cyan-100/90 truncate" style={{ fontFamily: 'var(--font-display)' }}>
                               {idx + 1}. {section.name}
                             </p>
                             <p className="text-xs text-cyan-300/50 truncate" style={{ fontFamily: 'var(--font-body)' }}>
                               {section.description}
                             </p>
                           </div>
                           <div className={`text-xs px-2 py-1 border ${
                             done ? 'border-green-500/40 text-green-400' : 'border-cyan-500/40 text-cyan-300/70'
                           }`} style={{ fontFamily: 'var(--font-mono)' }}>
                             {done ? 'COMPILED' : 'CODING...'}
                           </div>
                         </div>
                       );
                     })}
                   </div>
                 </div>
               ) : (
                 <Gallery
                   sections={project.sections}
                   onGenerateCode={handleGenerateCode}
                   isGeneratingCode={status === AppStatus.GENERATING_CODE}
                   onUpdateSectionImage={handleUpdateSectionImage}
                   onAddCost={addCost}
                   mode={project.generationMode}
                 />
               )}
             </div>
          )}

          {viewStatus === AppStatus.RENDERING_PREVIEW && (
            <div className="flex flex-col items-center justify-center h-64 animate-fade-in">
               <div className="w-20 h-20 cyber-spinner mb-8" style={{ borderWidth: '4px', borderTopColor: 'var(--cyber-purple)', borderRightColor: 'var(--neon-yellow)' }}></div>
               <p className="text-xl font-medium text-purple-400 mb-2" style={{ fontFamily: 'var(--font-display)', textShadow: '0 0 10px rgba(128, 0, 255, 0.5)' }}>{getStatusMessage(viewStatus, displaySensitiveData).title}</p>
               <p className="text-sm text-cyan-300/60" style={{ fontFamily: 'var(--font-mono)' }}>{getStatusMessage(viewStatus, displaySensitiveData).subtitle}</p>
               <div className="mt-6 flex gap-2">
                 <div className="w-2 h-2 bg-purple-400 rounded-full animate-pulse"></div>
                 <div className="w-2 h-2 bg-purple-400 rounded-full animate-pulse" style={{ animationDelay: '0.2s' }}></div>
                 <div className="w-2 h-2 bg-purple-400 rounded-full animate-pulse" style={{ animationDelay: '0.4s' }}></div>
               </div>
            </div>
          )}

          {viewStatus === AppStatus.REVIEWING_CODE && (
            <div className="flex flex-col items-center justify-center h-64 animate-fade-in">
               <div className="w-20 h-20 cyber-spinner mb-8" style={{ borderWidth: '4px', borderTopColor: 'var(--neon-yellow)', borderRightColor: 'var(--neon-cyan)' }}></div>
               <p className="text-xl font-medium neon-text-yellow mb-2" style={{ fontFamily: 'var(--font-display)' }}>{getStatusMessage(viewStatus, displaySensitiveData).title}</p>
               <p className="text-sm text-cyan-300/60" style={{ fontFamily: 'var(--font-mono)' }}>{getStatusMessage(viewStatus, displaySensitiveData).subtitle}</p>
               <div className="mt-6 flex gap-2">
                 <div className="w-2 h-2 bg-yellow-400 rounded-full animate-pulse"></div>
                 <div className="w-2 h-2 bg-yellow-400 rounded-full animate-pulse" style={{ animationDelay: '0.2s' }}></div>
                 <div className="w-2 h-2 bg-yellow-400 rounded-full animate-pulse" style={{ animationDelay: '0.4s' }}></div>
               </div>
            </div>
          )}

          {viewStatus === AppStatus.APPLYING_FIXES && (
            <div className="flex flex-col items-center justify-center h-64 animate-fade-in">
               <div className="w-20 h-20 cyber-spinner mb-8" style={{ borderWidth: '4px', borderTopColor: 'var(--neon-green)', borderRightColor: 'var(--neon-magenta)' }}></div>
               <p className="text-xl font-medium text-green-400 mb-2" style={{ fontFamily: 'var(--font-display)', textShadow: '0 0 10px rgba(0, 255, 0, 0.5)' }}>{getStatusMessage(viewStatus, displaySensitiveData).title}</p>
               <p className="text-sm text-cyan-300/60" style={{ fontFamily: 'var(--font-mono)' }}>{getStatusMessage(viewStatus, displaySensitiveData).subtitle}</p>
               <div className="mt-6 flex gap-2">
                 <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                 <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse" style={{ animationDelay: '0.2s' }}></div>
                 <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse" style={{ animationDelay: '0.4s' }}></div>
               </div>
            </div>
          )}

          {viewStatus === AppStatus.COMPLETED && (
            <div className="animate-fade-in">
               <div className="text-center mb-8">
                  <div className="inline-block mb-4 px-4 py-2 border border-green-500/50 bg-black/70 backdrop-blur-sm" style={{ fontFamily: 'var(--font-mono)', fontSize: '12px' }}>
                    <span className="text-green-400">&gt;_</span> <span className="text-cyan-300/60">STATUS:</span> <span className="neon-text-yellow">COMPILATION_COMPLETE</span>
                  </div>
                  <h2 className="text-3xl md:text-5xl font-bold neon-text-cyan mb-2" style={{ fontFamily: 'var(--font-display)' }}>REDESIGN COMPLETE</h2>
                  <p className="text-green-400 flex items-center justify-center gap-2" style={{ fontFamily: 'var(--font-mono)', textShadow: '0 0 10px rgba(0, 255, 0, 0.5)' }}>
                    <Terminal size={16} /> CODE_REVIEWED_AND_FINALIZED
                  </p>
                  {project.codeReview && (
                    <div className="mt-6 max-w-2xl mx-auto">
                      <div className={`p-4 border ${project.codeReview.passedReview ? 'bg-black/60 border-green-500/50' : 'bg-black/60 border-yellow-500/50'}`}>
                        <p className="text-sm font-semibold mb-2" style={{ fontFamily: 'var(--font-mono)', color: project.codeReview.passedReview ? 'var(--neon-green)' : 'var(--neon-yellow)' }}>
                          {project.codeReview.passedReview ? '✓ REVIEW_PASSED' : '⚠ FIXES_APPLIED'}
                        </p>
                        <p className="text-xs text-cyan-100/70" style={{ fontFamily: 'var(--font-body)' }}>{project.codeReview.feedback}</p>
                      </div>
                    </div>
                  )}
               </div>
               <FinalResult projectState={project} />

               <div className="flex justify-center mt-12">
                 <button
                   onClick={() => {
                     updateStatus(AppStatus.IDLE);
                     setProject({userDescription:'', screenshots:[], sections:[]});
                     setTotalCost(0);
                   }}
                   className="group px-6 py-3 border-2 border-cyan-500/50 bg-black/70 hover:bg-cyan-500/10 text-cyan-300 hover:text-cyan-100 transition-all"
                   style={{ fontFamily: 'var(--font-mono)' }}
                 >
                   <span className="flex items-center gap-2">
                     <span>&gt;_</span>
                     <span>INIT_NEW_PROJECT</span>
                     <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform" />
                   </span>
                 </button>
               </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
