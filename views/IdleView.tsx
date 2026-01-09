import { InputArea } from '../components/InputArea';
import { GenerationMode } from '../types';

type IdleViewProps = {
  onStart: (
    description: string,
    screenshots: string[],
    url?: string,
    targetDesignUrl?: string,
    mode?: GenerationMode
  ) => void;
};

export const IdleView = ({ onStart }: IdleViewProps) => {
  return (
    <div className="animate-fade-in-up">
      <div className="text-center mb-12">
        <div
          className="inline-block mb-4 px-4 py-2 border border-cyan-500/30 bg-black/50 backdrop-blur-sm"
          style={{ fontFamily: 'var(--font-mono)', fontSize: '12px' }}
        >
          <span className="neon-text-cyan">&gt;_</span>{' '}
          <span className="text-cyan-300/60">INITIALIZE</span>{' '}
          <span className="neon-text-magenta">REDESIGN.PROTOCOL</span>
        </div>
        <h1
          className="text-4xl md:text-7xl font-extrabold mb-6 tracking-tight"
          style={{ fontFamily: 'var(--font-display)' }}
        >
          <span className="neon-text-cyan terminal-cursor">REIMAGINE</span>
          <br />
          <span className="text-white">YOUR </span>
          <span className="neon-text-magenta">WEBSITE</span>
        </h1>
        <p
          className="text-base md:text-lg text-cyan-100/70 max-w-2xl mx-auto leading-relaxed"
          style={{ fontFamily: 'var(--font-body)' }}
        >
          Upload screenshots of your current landing page. AI agents will analyze UX patterns, synthesize a fresh
          aesthetic, generate visual assets, and compile production-ready code.
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
      <InputArea onStart={onStart} isLoading={false} />
    </div>
  );
};
