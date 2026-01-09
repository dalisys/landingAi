import { Key } from 'lucide-react';

export const ApiKeyGate = () => {
  return (
    <div
      className="min-h-screen bg-black text-white flex flex-col items-center justify-center p-6 relative overflow-hidden"
      style={{ fontFamily: 'var(--font-body)' }}
    >
      <div className="fixed inset-0 grid-background opacity-60 pointer-events-none"></div>
      <div className="scan-lines fixed inset-0 pointer-events-none"></div>
      <div className="noise-overlay fixed inset-0 pointer-events-none"></div>

      <div className="max-w-md w-full bg-black/80 border-2 border-cyan-500/50 p-8 shadow-2xl text-center animate-fade-in-up relative z-10 cyber-border">
        <div className="w-20 h-20 bg-black border-2 border-magenta-500 cyber-border flex items-center justify-center mx-auto mb-6 pulse-glow">
          <Key className="neon-text-magenta" size={32} />
        </div>
        <h1
          className="text-3xl font-bold neon-text-cyan mb-2"
          style={{ fontFamily: 'var(--font-display)' }}
        >
          ACCESS_REQUIRED
        </h1>
        <p
          className="text-xs text-cyan-300/60 mb-6"
          style={{ fontFamily: 'var(--font-mono)' }}
        >
          &gt; SYSTEM_CHECK: API_KEY_NOT_FOUND
        </p>
        <p className="text-cyan-100/70 mb-8 text-sm">
          To generate high-quality UI designs, this app requires a paid API Key.
        </p>

        <div className="bg-black/60 border border-cyan-500/30 p-4 mb-8 text-left">
          <h3
            className="text-sm font-semibold neon-text-yellow mb-2 flex items-center gap-2"
            style={{ fontFamily: 'var(--font-mono)' }}
          >
            <Key size={16} /> API_KEY_REQUIRED
          </h3>
          <p
            className="text-xs text-cyan-100/60 leading-relaxed mb-3"
            style={{ fontFamily: 'var(--font-body)' }}
          >
            Please select a Google Cloud Project with billing enabled to use the advanced image generation models.
          </p>
          <a
            href="https://ai.google.dev/gemini-api/docs/billing"
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs neon-text-cyan hover:text-cyan-300 underline inline-block"
            style={{ fontFamily: 'var(--font-mono)' }}
          >
            &gt; LEARN_MORE
          </a>
        </div>

        <div className="text-xs text-cyan-200/70">
          Set <span className="neon-text-cyan">VITE_GEMINI_API_KEY</span> in your local env and restart the dev server.
        </div>
      </div>
    </div>
  );
};
