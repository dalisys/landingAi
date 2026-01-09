import { ArrowRight, Terminal } from 'lucide-react';
import { FinalResult } from '../components/FinalResult';
import { ProjectState } from '../types';

type CompletedViewProps = {
  project: ProjectState;
  onReset: () => void;
};

export const CompletedView = ({ project, onReset }: CompletedViewProps) => {
  return (
    <div className="animate-fade-in">
      <div className="text-center mb-8">
        <div
          className="inline-block mb-4 px-4 py-2 border border-green-500/50 bg-black/70 backdrop-blur-sm"
          style={{ fontFamily: 'var(--font-mono)', fontSize: '12px' }}
        >
          <span className="text-green-400">&gt;_</span> <span className="text-cyan-300/60">STATUS:</span>{' '}
          <span className="neon-text-yellow">COMPILATION_COMPLETE</span>
        </div>
        <h2
          className="text-3xl md:text-5xl font-bold neon-text-cyan mb-2"
          style={{ fontFamily: 'var(--font-display)' }}
        >
          REDESIGN COMPLETE
        </h2>
        <p
          className="text-green-400 flex items-center justify-center gap-2"
          style={{ fontFamily: 'var(--font-mono)', textShadow: '0 0 10px rgba(0, 255, 0, 0.5)' }}
        >
          <Terminal size={16} /> CODE_REVIEWED_AND_FINALIZED
        </p>
        {project.codeReview && (
          <div className="mt-6 max-w-2xl mx-auto">
            <div
              className={`p-4 border ${
                project.codeReview.passedReview
                  ? 'bg-black/60 border-green-500/50'
                  : 'bg-black/60 border-yellow-500/50'
              }`}
            >
              <p
                className="text-sm font-semibold mb-2"
                style={{
                  fontFamily: 'var(--font-mono)',
                  color: project.codeReview.passedReview ? 'var(--neon-green)' : 'var(--neon-yellow)',
                }}
              >
                {project.codeReview.passedReview ? '✓ REVIEW_PASSED' : '⚠ FIXES_APPLIED'}
              </p>
              <p className="text-xs text-cyan-100/70" style={{ fontFamily: 'var(--font-body)' }}>
                {project.codeReview.feedback}
              </p>
            </div>
          </div>
        )}
      </div>
      <FinalResult projectState={project} />

      <div className="flex justify-center mt-12">
        <button
          onClick={onReset}
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
  );
};
