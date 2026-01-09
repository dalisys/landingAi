import React from 'react';
import { AppStatus, GenerationMode } from '../types';
import { CheckCircle, Circle, Loader2 } from 'lucide-react';

interface Props {
  status: AppStatus;              // actual pipeline status
  viewStatus?: AppStatus;         // currently viewed step (may be earlier)
  onStepSelect?: (status: AppStatus) => void;
  mode?: GenerationMode;
}

const baseSteps = [
  { id: AppStatus.IDLE, label: 'Upload & Brief' },
  { id: AppStatus.EXTRACTING_DATA, label: 'Extract Data' },
  { id: AppStatus.ANALYZING, label: 'Redesign Plan' },
  { id: AppStatus.PLAN_REVIEW, label: 'Review Plan' },
  { id: AppStatus.GENERATING_IMAGES, label: 'Generate Visuals' },
  { id: AppStatus.GENERATING_CODE, label: 'Generate Code' },
  { id: AppStatus.RENDERING_PREVIEW, label: 'Render Preview' },
  { id: AppStatus.REVIEWING_CODE, label: 'AI Review' },
  { id: AppStatus.APPLYING_FIXES, label: 'Apply Fixes' },
  { id: AppStatus.COMPLETED, label: 'Done' },
];

export const StepIndicator: React.FC<Props> = ({ status, viewStatus, onStepSelect, mode }) => {
  const steps = baseSteps.filter(step => {
    if (mode === GenerationMode.CODE_ONLY) {
      return step.id !== AppStatus.GENERATING_IMAGES;
    }
    return true;
  });

  const currentIndex = steps.findIndex(s => s.id === status);
  const viewedIndex = steps.findIndex(s => s.id === (viewStatus ?? status));

  // Handle combined states or simplification for progress bar
  let activeIndex = currentIndex;
  if (status === AppStatus.ERROR) activeIndex = 0;

  return (
    <div className="w-full max-w-5xl mx-auto mb-8 px-4 relative z-10">
      <div className="flex items-center justify-between relative">
        {/* Connector Line */}
        <div className="absolute left-0 top-1/2 -translate-y-1/2 w-full h-0.5 bg-gradient-to-r from-cyan-500/20 via-magenta-500/20 to-yellow-500/20 -z-10" />

        {steps.map((step, idx) => {
          const isCompleted = idx < activeIndex;
          const isCurrent = idx === activeIndex;
          const isViewed = idx === viewedIndex;
          const isClickable = !!onStepSelect && idx <= activeIndex;

          return (
            <div key={step.id} className="flex flex-col items-center bg-black px-2">
              <button
                type="button"
                disabled={!isClickable}
                onClick={() => isClickable && onStepSelect?.(step.id)}
                className={`
                w-8 h-8 md:w-10 md:h-10 hexagon-clip flex items-center justify-center border-2 transition-all duration-300 relative
                ${isCompleted ? 'bg-green-500/20 border-green-500 text-green-400' : ''}
                ${isCurrent ? 'bg-cyan-500/20 border-cyan-500 text-cyan-300' : ''}
                ${!isCompleted && !isCurrent ? 'bg-black/80 border-cyan-500/30 text-cyan-500/50' : ''}
                ${isViewed && !isCurrent ? 'ring-2 ring-cyan-400/60' : ''}
                ${isClickable ? 'cursor-pointer hover:scale-110 focus:outline-none' : 'cursor-default'}
              `}
                style={{
                  boxShadow: isCurrent
                    ? '0 0 20px rgba(0, 255, 255, 0.5)'
                    : isCompleted
                    ? '0 0 10px rgba(0, 255, 0, 0.3)'
                    : 'none'
                }}
              >
                {isCompleted ? (
                  <CheckCircle size={16} className="md:w-5 md:h-5" />
                ) : isCurrent ? (
                  <div className="w-4 h-4 md:w-5 md:h-5 cyber-spinner" style={{ borderWidth: '2px' }}></div>
                ) : (
                  <Circle size={16} className="md:w-5 md:h-5" />
                )}
              </button>
              <span
                className={`text-[10px] md:text-xs mt-2 font-medium text-center ${
                  isViewed ? 'neon-text-cyan' : isCurrent ? 'text-cyan-300' : 'text-cyan-500/40'
                }`}
                style={{ fontFamily: 'var(--font-mono)' }}
              >
                {step.label.toUpperCase().replace(/ /g, '_')}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
};
