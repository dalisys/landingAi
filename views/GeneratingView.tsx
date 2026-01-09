import { Terminal } from 'lucide-react';
import { Gallery } from '../components/Gallery';
import { AppStatus, GenerationMode, ProjectState } from '../types';
import { getStatusMessage } from '../utils/statusMessages';

type GeneratingViewProps = {
  status: AppStatus;
  project: ProjectState;
  displaySensitiveData: boolean;
  onGenerateCode: () => void;
  onUpdateSectionImage: (id: string, newImage: string) => void;
  onAddCost: (cost: number) => void;
};

export const GeneratingView = ({
  status,
  project,
  displaySensitiveData,
  onGenerateCode,
  onUpdateSectionImage,
  onAddCost,
}: GeneratingViewProps) => {
  return (
    <div className="animate-fade-in">
      <div className="text-center mb-8">
        <div
          className="inline-block mb-4 px-4 py-2 border border-cyan-500/30 bg-black/50 backdrop-blur-sm"
          style={{ fontFamily: 'var(--font-mono)', fontSize: '12px' }}
        >
          <span className="neon-text-cyan">&gt;_</span> <span className="text-cyan-300/60">PROCESS:</span>{' '}
          <span className="neon-text-magenta">
            {project.generationMode === GenerationMode.CODE_ONLY ? 'CODE_GENERATION' : 'VISUAL_SYNTHESIS'}
          </span>
        </div>
        <h2
          className="text-2xl md:text-4xl font-bold neon-text-cyan mb-2"
          style={{ fontFamily: 'var(--font-display)' }}
        >
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
                  <p className="text-xs text-cyan-300/60" style={{ fontFamily: 'var(--font-mono)' }}>
                    &gt; CODE_PIPELINE
                  </p>
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
                  <div
                    className={`text-xs px-2 py-1 border ${
                      done ? 'border-green-500/40 text-green-400' : 'border-cyan-500/40 text-cyan-300/70'
                    }`}
                    style={{ fontFamily: 'var(--font-mono)' }}
                  >
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
          onGenerateCode={onGenerateCode}
          isGeneratingCode={status === AppStatus.GENERATING_CODE}
          onUpdateSectionImage={onUpdateSectionImage}
          onAddCost={onAddCost}
          mode={project.generationMode}
        />
      )}
    </div>
  );
};
