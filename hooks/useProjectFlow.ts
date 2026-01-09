import { useState } from 'react';
import { AppStatus, ProjectState, Section, GenerationMode } from '../types';
import {
  extractWebsiteData,
  analyzeScreenshots,
  generateSectionImage,
  generateSectionCode,
  generateContentImages,
  renderAndCaptureScreenshot,
  reviewGeneratedCode,
  applyCodeFixes,
} from '../services/geminiService';
import {
  calculateCost,
  estimateTokens,
  estimateImageTokens,
  ModelType,
} from '../services/pricingService';
import { captureScreenshot } from '../services/screenshotService';
import { saveImage, generateFilename } from '../services/imageStorageService';
import { withTimeout } from '../utils/withTimeout';

const emptyProject: ProjectState = {
  userDescription: '',
  screenshots: [],
  sections: [],
};

export const useProjectFlow = () => {
  const [status, setStatus] = useState<AppStatus>(AppStatus.IDLE);
  const [viewStatus, setViewStatus] = useState<AppStatus>(AppStatus.IDLE);
  const [totalCost, setTotalCost] = useState(0);
  const [project, setProject] = useState<ProjectState>(emptyProject);

  const updateStatus = (next: AppStatus) => {
    setStatus(next);
    setViewStatus(next);
  };

  const addCost = (cost: number) => {
    setTotalCost(prev => prev + cost);
  };

  const resetProject = () => {
    updateStatus(AppStatus.IDLE);
    setProject(emptyProject);
    setTotalCost(0);
  };

  const handleStart = async (
    description: string,
    screenshots: string[],
    url?: string,
    targetDesignUrl?: string,
    mode: GenerationMode = GenerationMode.FULL
  ) => {
    const timestamp = Date.now();
    let domain = 'manual';
    if (url) {
      try {
        domain = new URL(url).hostname.replace(/[^a-z0-9]/gi, '_');
      } catch (e) {
        /* ignore invalid url */
      }
    }
    const projectId = `project-${domain}-${timestamp}`;

    setProject(prev => ({
      ...prev,
      projectId,
      userDescription: description,
      screenshots,
      targetDesignUrl,
      generationMode: mode,
    }));
    updateStatus(AppStatus.EXTRACTING_DATA);

    try {
      let targetDesignScreenshots: string[] = [];
      if (targetDesignUrl) {
        try {
          console.log('Capturing target design screenshots from:', targetDesignUrl);
          targetDesignScreenshots = await captureScreenshot(targetDesignUrl);
          setProject(prev => ({ ...prev, targetDesignScreenshots }));
        } catch (err) {
          console.warn('Failed to capture target design screenshots:', err);
        }
      }

      console.log('Starting extraction with', screenshots.length, 'screenshots');
      const extractedData = await withTimeout(
        extractWebsiteData(screenshots, url),
        180000,
        'extractWebsiteData'
      );
      console.log('Extraction complete');

      if (
        !extractedData ||
        !extractedData.features ||
        !extractedData.designAnalysis ||
        !extractedData.structureAnalysis
      ) {
        throw new Error('Invalid data extracted from screenshots');
      }

      const extractionCost = calculateCost({
        model: ModelType.GEMINI_2_5_FLASH,
        inputTokens: screenshots.length * estimateImageTokens() + estimateTokens(url || ''),
        outputTokens: 2000,
      });
      addCost(extractionCost);

      setProject(prev => ({
        ...prev,
        extractedData,
      }));

      updateStatus(AppStatus.ANALYZING);
      console.log('Starting analysis');
      const analysis = await analyzeScreenshots(
        screenshots,
        description,
        extractedData,
        url,
        targetDesignScreenshots.length > 0 ? targetDesignScreenshots : undefined
      );
      console.log('Analysis complete');

      if (!analysis || !analysis.designSystem || !analysis.sections) {
        throw new Error('Invalid analysis results');
      }

      const analysisCost = calculateCost({
        model: ModelType.GEMINI_3_PRO_PREVIEW,
        inputTokens:
          (screenshots.length + targetDesignScreenshots.length) *
            estimateImageTokens() +
          estimateTokens(description) +
          3000,
        outputTokens: 2000,
      });
      addCost(analysisCost);

      setProject(prev => ({
        ...prev,
        designSystem: analysis.designSystem,
        sections: analysis.sections || [],
      }));
      updateStatus(AppStatus.PLAN_REVIEW);
    } catch (e) {
      console.error('Error in handleStart:', e);
      const errorMessage = e instanceof Error ? e.message : 'Unknown error occurred';
      alert(
        `Analysis failed: ${errorMessage}\n\nPlease try again. Ensure you have a valid API Key.`
      );
      updateStatus(AppStatus.IDLE);
      setProject(emptyProject);
    }
  };

  const handleApprovePlan = async () => {
    if (project.generationMode === GenerationMode.CODE_ONLY) {
      await handleGenerateCode();
      return;
    }

    updateStatus(AppStatus.GENERATING_IMAGES);

    const newSections = [...project.sections];

    const updateSectionWithImage = (idx: number, url: string) => {
      setProject(prev => {
        const updated = [...prev.sections];
        updated[idx].generatedImageUrl = url;
        return { ...prev, sections: updated };
      });
    };

    try {
      if (!project.designSystem) throw new Error('No design system');

      const promises = newSections.map(async (section, idx) => {
        try {
          const url = await generateSectionImage(section, project.designSystem!);
          updateSectionWithImage(idx, url);

          const imageCost = calculateCost({
            model: ModelType.GEMINI_3_PRO_IMAGE_PREVIEW,
            inputTokens: estimateTokens(
              section.name + section.description + section.visualPrompt
            ),
            outputImages: 1,
          });
          addCost(imageCost);
        } catch (err) {
          console.error(`Failed to generate image for section ${section.name}`, err);
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
      if (!project.designSystem) throw new Error('No design system');

      const contentImagesMap: Record<string, string[]> = {};

      if (project.generationMode !== GenerationMode.CODE_ONLY) {
        const imageGenPromises = project.sections.map(async section => {
          try {
            console.log(`Generating content images for section: ${section.name}`);
            const base64Images = await generateContentImages(
              section,
              project.designSystem!,
              2
            );

            const imageUrls: string[] = [];
            for (let i = 0; i < base64Images.length; i++) {
              const filename = generateFilename(`section-${section.id}-content-${i}`);
              const url = await saveImage(base64Images[i], filename, project.projectId);
              imageUrls.push(url);
              console.log(`Saved content image: ${url}`);
            }

            contentImagesMap[section.id] = imageUrls;

            const imageCost = calculateCost({
              model: ModelType.GEMINI_2_5_FLASH_IMAGE,
              inputTokens: estimateTokens(section.name + section.description),
              outputImages: base64Images.length,
            });
            addCost(imageCost);
          } catch (err) {
            console.error(`Failed to generate content images for ${section.name}:`, err);
            contentImagesMap[section.id] = [];
          }
        });

        await Promise.all(imageGenPromises);
      }

      setProject(prev => ({ ...prev, contentImages: contentImagesMap }));

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
            project.targetDesignScreenshots,
            project.screenshots,
            project.extractedData,
            project.userDescription
          );

          console.log(
            `[Section ${idx}] Code generated successfully. Length: ${code.length}`
          );
          updateSectionWithCode(idx, code);

          const codeCost = calculateCost({
            model: ModelType.GEMINI_3_PRO_PREVIEW,
            inputTokens:
              estimateTokens(section.name + section.description + sectionContentImages.join(' ')) +
              (section.generatedImageUrl ? estimateImageTokens() : 0),
            outputTokens: 1500,
          });
          addCost(codeCost);
        } catch (err) {
          console.error(`[Section ${idx}] Failed to generate code:`, err);
        }
      });

      console.log('Waiting for all code generation promises to resolve...');
      await Promise.all(codeGenPromises);
      console.log('All code generation promises resolved.');

      console.log('Starting code review process...');
      await handleReviewCode();
    } catch (e) {
      console.error('Critical error in handleGenerateCode:', e);
      alert('Code generation encountered an issue.');
      updateStatus(AppStatus.COMPLETED);
    }
  };

  const handleReviewCode = async () => {
    try {
      if (!project.designSystem || !project.extractedData) {
        throw new Error('Missing required data for review');
      }

      updateStatus(AppStatus.RENDERING_PREVIEW);

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

      updateStatus(AppStatus.REVIEWING_CODE);
      const review = await reviewGeneratedCode(
        screenshots,
        project.sections,
        project.designSystem,
        project.extractedData,
        project.userDescription
      );

      const reviewCost = calculateCost({
        model: ModelType.GEMINI_3_PRO_PREVIEW,
        inputTokens: screenshots.length * estimateImageTokens() + 2000,
        outputTokens: 1000,
      });
      addCost(reviewCost);

      setProject(prev => ({ ...prev, codeReview: review }));

      if (!review.passedReview && review.suggestedFixes && review.suggestedFixes.length > 0) {
        await handleApplyFixes(review.suggestedFixes);
      } else {
        updateStatus(AppStatus.COMPLETED);
      }
    } catch (e) {
      console.error('Review process failed:', e);
      updateStatus(AppStatus.COMPLETED);
    }
  };

  const handleApplyFixes = async (fixes: any[]) => {
    try {
      if (!project.designSystem) throw new Error('No design system');

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
      console.error('Failed to apply fixes:', e);
      updateStatus(AppStatus.COMPLETED);
    }
  };

  const handleUpdateSectionImage = (id: string, newImage: string) => {
    setProject(prev => ({
      ...prev,
      sections: prev.sections.map(s =>
        s.id === id ? { ...s, generatedImageUrl: newImage } : s
      ),
    }));
  };

  const handleUpdateDesignSystem = (updates: Partial<ProjectState['designSystem']>) => {
    setProject(prev => ({
      ...prev,
      designSystem: prev.designSystem ? { ...prev.designSystem, ...updates } : prev.designSystem,
    }));
  };

  const handleUpdateSection = (id: string, updates: Partial<Section>) => {
    setProject(prev => ({
      ...prev,
      sections: prev.sections.map(s => (s.id === id ? { ...s, ...updates } : s)),
    }));
  };

  const handleAddSection = () => {
    setProject(prev => ({
      ...prev,
      sections: [
        ...prev.sections,
        {
          id: `section-${Date.now()}-${Math.random().toString(16).slice(2, 6)}`,
          name: 'New Section',
          description: 'Describe the goal of this section',
          visualPrompt: 'Add visual guidance here',
        },
      ],
    }));
  };

  const handleDeleteSection = (id: string) => {
    setProject(prev => ({
      ...prev,
      sections: prev.sections.filter(s => s.id !== id),
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

  return {
    status,
    viewStatus,
    totalCost,
    project,
    setViewStatus,
    updateStatus,
    addCost,
    handleStart,
    handleApprovePlan,
    handleGenerateCode,
    handleUpdateSectionImage,
    handleUpdateDesignSystem,
    handleUpdateSection,
    handleAddSection,
    handleDeleteSection,
    handleMoveSection,
    resetProject,
  };
};
