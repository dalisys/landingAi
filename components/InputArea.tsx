import React, { useState, useRef } from 'react';
import { Upload, Link as LinkIcon, Image as ImageIcon, Loader2, Code, Layout } from 'lucide-react';
import { captureScreenshot } from '../services/screenshotService';
import { GenerationMode } from '../types';

interface Props {
  onStart: (description: string, screenshots: string[], url?: string, targetDesignUrl?: string, mode?: GenerationMode) => void;
  isLoading: boolean;
}

export const InputArea: React.FC<Props> = ({ onStart, isLoading }) => {
  const [description, setDescription] = useState('complete redesign');
  const [url, setUrl] = useState('https://scenay.com');
  const [targetDesignUrl, setTargetDesignUrl] = useState('https://shopify.com');
  const [screenshots, setScreenshots] = useState<string[]>([]);
  const [isAutoScanning, setIsAutoScanning] = useState(false);
  const [mode, setMode] = useState<GenerationMode>(GenerationMode.FULL);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const files = Array.from(e.target.files);
      files.forEach(file => {
        const reader = new FileReader();
        reader.onloadend = () => {
          setScreenshots(prev => [...prev, reader.result as string]);
        };
        reader.readAsDataURL(file as File);
      });
    }
  };

  const handleSubmit = async () => {
    if (!description) return;

    // Auto-capture the provided URL in the background before starting
    if (url) {
      setIsAutoScanning(true);
      try {
        const captured = await captureScreenshot(url);
        setScreenshots(prev => [...prev, ...captured]);
        onStart(description, [...screenshots, ...captured], url, targetDesignUrl, mode);
        return;
      } catch (error) {
        console.error("Auto scan failed", error);
        alert("Automatic screenshot capture failed. Please check the URL or try again.");
      } finally {
        setIsAutoScanning(false);
      }
    }

    onStart(description, screenshots, url, targetDesignUrl, mode);
  };

  return (
    <div className="max-w-3xl mx-auto bg-black/70 p-8 border-2 border-cyan-500/50 shadow-2xl backdrop-blur-sm holo-card relative z-10 animate-fade-in-up stagger-2">
      <div className="mb-6 flex items-center gap-3">
        <div className="w-1 h-8 bg-gradient-to-b from-cyan-500 to-magenta-500"></div>
        <h2 className="text-2xl font-bold neon-text-cyan" style={{ fontFamily: 'var(--font-display)' }}>
          INIT_REDESIGN
        </h2>
      </div>

      {/* Current URL Input */}
      <div className="mb-6">
        <label className="block text-xs font-medium text-cyan-300/60 mb-2 uppercase tracking-wider" style={{ fontFamily: 'var(--font-mono)' }}>
          &gt; CURRENT_WEBSITE_URL
        </label>
        <p className="text-xs text-cyan-100/50 mb-2" style={{ fontFamily: 'var(--font-body)' }}>
          Add your current site URL and/or upload screenshots below.
        </p>
        <div className="relative flex gap-2">
          <div className="relative flex-1">
            <LinkIcon className="absolute left-3 top-1/2 -translate-y-1/2 text-cyan-500/50" size={18} />
            <input
              type="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://your-current-site.com"
              className="w-full bg-black/80 border border-cyan-500/30 py-3 pl-10 pr-4 text-cyan-100 placeholder:text-cyan-500/30 outline-none transition-all hover:border-cyan-500/50"
              style={{ fontFamily: 'var(--font-mono)', fontSize: '14px' }}
            />
          </div>
        </div>
      </div>

      {/* Target Design URL Input */}
      <div className="mb-6">
        <label className="block text-xs font-medium text-magenta-300/60 mb-2 uppercase tracking-wider" style={{ fontFamily: 'var(--font-mono)' }}>
          <span className="neon-text-magenta">★</span> TARGET_DESIGN_STYLE_URL
        </label>
        <p className="text-xs text-cyan-100/50 mb-2" style={{ fontFamily: 'var(--font-body)' }}>
          Provide a target website URL for style guidance — or skip this and just use your screenshots.
        </p>
        <div className="relative flex gap-2">
          <div className="relative flex-1">
            <LinkIcon className="absolute left-3 top-1/2 -translate-y-1/2 text-magenta-500/50" size={18} />
            <input
              type="url"
              value={targetDesignUrl}
              onChange={(e) => setTargetDesignUrl(e.target.value)}
              placeholder="https://inspiration-site.com (e.g., Stripe, Linear, Apple)"
              className="w-full bg-black/80 border border-magenta-500/30 py-3 pl-10 pr-4 text-cyan-100 placeholder:text-magenta-500/30 outline-none transition-all hover:border-magenta-500/50"
              style={{ fontFamily: 'var(--font-mono)', fontSize: '14px' }}
            />
          </div>
        </div>
        {targetDesignUrl && (
          <p className="text-xs text-magenta-400 mt-2 flex items-center gap-1" style={{ fontFamily: 'var(--font-mono)' }}>
            <span className="w-1.5 h-1.5 bg-magenta-400 rounded-full pulse-glow"></span>
            AI_WILL_ANALYZE_AND_REPLICATE_STYLE
          </p>
        )}
      </div>

      {/* Screenshot Upload */}
      <div className="mb-6">
        <label className="block text-xs font-medium text-cyan-300/60 mb-2 uppercase tracking-wider" style={{ fontFamily: 'var(--font-mono)' }}>
          &gt; UPLOAD_SCREENSHOTS
        </label>
        <div
          onClick={() => fileInputRef.current?.click()}
          className="border-2 border-dashed border-cyan-500/30 p-8 text-center cursor-pointer hover:border-cyan-500 hover:bg-cyan-500/5 transition-all group relative overflow-hidden"
        >
          <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/5 to-magenta-500/5 opacity-0 group-hover:opacity-100 transition-opacity"></div>
          <input
            type="file"
            ref={fileInputRef}
            multiple
            accept="image/*"
            className="hidden"
            onChange={handleFileChange}
          />
          <div className="flex flex-col items-center gap-3 relative z-10">
            <div className="p-3 bg-black border border-cyan-500/50 text-cyan-400 group-hover:border-cyan-500 group-hover:text-cyan-300 transition-all hexagon-clip">
              <Upload size={24} />
            </div>
            <p className="text-cyan-100" style={{ fontFamily: 'var(--font-body)' }}>
              Drag & drop screenshots here, or <span className="neon-text-cyan">browse</span>
            </p>
            <p className="text-xs text-cyan-300/50" style={{ fontFamily: 'var(--font-mono)' }}>FORMATS: PNG, JPG, WEBP</p>
          </div>
        </div>

        {/* Preview Thumbnails */}
        {screenshots.length > 0 && (
          <div className="flex gap-2 mt-4 overflow-x-auto pb-2">
            {screenshots.map((src, idx) => (
              <div key={idx} className="relative w-20 h-20 flex-shrink-0 overflow-hidden border-2 border-cyan-500/50 group hover:border-cyan-500 transition-all">
                <img src={src} alt={`Screenshot ${idx}`} className="w-full h-full object-cover" />
                <button
                  onClick={(e) => { e.stopPropagation(); setScreenshots(s => s.filter((_, i) => i !== idx)); }}
                  className="absolute top-0 right-0 bg-red-500 hover:bg-red-600 w-5 h-5 flex items-center justify-center text-white text-xs font-bold transition-all opacity-0 group-hover:opacity-100"
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Mode Selection */}
      <div className="mb-6">
        <label className="block text-xs font-medium text-cyan-300/60 mb-3 uppercase tracking-wider" style={{ fontFamily: 'var(--font-mono)' }}>
          &gt; SELECT_WORKFLOW_MODE
        </label>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <button
            onClick={() => setMode(GenerationMode.FULL)}
            className={`flex items-start gap-3 p-4 border-2 transition-all text-left group ${
              mode === GenerationMode.FULL
                ? 'bg-cyan-500/10 border-cyan-500 shadow-lg'
                : 'bg-black/60 border-cyan-500/30 hover:border-cyan-500/50'
            }`}
            style={{ boxShadow: mode === GenerationMode.FULL ? 'var(--glow-cyan)' : 'none' }}
          >
            <div className={`p-2 border ${mode === GenerationMode.FULL ? 'border-cyan-500 bg-cyan-500 text-black' : 'border-cyan-500/50 bg-black text-cyan-400'}`}>
              <Layout size={20} />
            </div>
            <div>
              <h3 className={`font-semibold mb-1 ${mode === GenerationMode.FULL ? 'neon-text-cyan' : 'text-cyan-100'}`} style={{ fontFamily: 'var(--font-display)', fontSize: '14px' }}>VISUAL + CODE</h3>
              <p className="text-xs text-cyan-100/60" style={{ fontFamily: 'var(--font-body)' }}>High-fidelity images first, then code. Max creativity.</p>
            </div>
          </button>

          <button
            onClick={() => setMode(GenerationMode.CODE_ONLY)}
            className={`flex items-start gap-3 p-4 border-2 transition-all text-left group ${
              mode === GenerationMode.CODE_ONLY
                ? 'bg-magenta-500/10 border-magenta-500 shadow-lg'
                : 'bg-black/60 border-magenta-500/30 hover:border-magenta-500/50'
            }`}
            style={{ boxShadow: mode === GenerationMode.CODE_ONLY ? 'var(--glow-magenta)' : 'none' }}
          >
            <div className={`p-2 border ${mode === GenerationMode.CODE_ONLY ? 'border-magenta-500 bg-magenta-500 text-black' : 'border-magenta-500/50 bg-black text-magenta-400'}`}>
              <Code size={20} />
            </div>
            <div>
              <h3 className={`font-semibold mb-1 ${mode === GenerationMode.CODE_ONLY ? 'neon-text-magenta' : 'text-magenta-100'}`} style={{ fontFamily: 'var(--font-display)', fontSize: '14px' }}>CODE ONLY</h3>
              <p className="text-xs text-cyan-100/60" style={{ fontFamily: 'var(--font-body)' }}>Direct code generation. Faster, lower cost.</p>
            </div>
          </button>
        </div>
      </div>

      {/* Description */}
      <div className="mb-8">
        <label className="block text-xs font-medium text-yellow-300/60 mb-2 uppercase tracking-wider" style={{ fontFamily: 'var(--font-mono)' }}>
          &gt; DESIGN_OBJECTIVES <span className="neon-text-yellow">*</span>
        </label>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="E.g., Make it look more modern, change the color scheme to dark mode with neon accents, and focus more on the product features..."
          className="w-full bg-black/80 border border-yellow-500/30 p-4 text-cyan-100 placeholder:text-yellow-500/30 outline-none h-32 resize-none hover:border-yellow-500/50 transition-all"
          style={{ fontFamily: 'var(--font-body)', fontSize: '14px' }}
        />
      </div>

      <button
        onClick={handleSubmit}
        disabled={isLoading || isAutoScanning || !description}
        className={`w-full py-4 font-bold text-base flex items-center justify-center gap-3 transition-all uppercase tracking-wider ${
          isLoading || isAutoScanning || !description
            ? 'bg-gray-800 text-gray-600 cursor-not-allowed border border-gray-700'
            : 'neon-button'
        }`}
        style={{ fontFamily: 'var(--font-display)' }}
      >
        {isLoading ? (
          <>
            <div className="w-5 h-5 cyber-spinner" style={{ borderWidth: '2px' }}></div>
            <span>ANALYZING</span>
          </>
        ) : isAutoScanning ? (
          <>
            <Loader2 className="animate-spin" size={20} />
            <span>SCANNING</span>
          </>
        ) : (
          <span>INITIATE REDESIGN</span>
        )}
      </button>
    </div>
  );
};
