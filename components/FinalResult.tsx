import React, { useState } from 'react';
import { ProjectState } from '../types';
import { Code, Eye, Download, Check } from 'lucide-react';
import JSZip from 'jszip';

interface Props {
  projectState: ProjectState;
}

export const FinalResult: React.FC<Props> = ({ projectState }) => {
  const [activeTab, setActiveTab] = useState<'preview' | 'code'>('preview');

  // Combine code
  const fullHtml = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Redesigned Landing Page</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <script src="https://unpkg.com/lucide@latest"></script>
    <style>
      body { font-family: sans-serif; }
    </style>
</head>
<body class="bg-white">
    ${projectState.sections.map(s => `<!-- Section: ${s.name} -->\n${s.generatedCode}`).join('\n\n')}
    
    <script>
      lucide.createIcons();
    </script>
</body>
</html>
  `;

  const handleDownload = async () => {
    const zip = new JSZip();
    
    // Add HTML
    zip.file("index.html", fullHtml);
    
    // Add Images folder
    const imgFolder = zip.folder("images");
    projectState.sections.forEach((section, idx) => {
      if (section.generatedImageUrl) {
        // Simple regex to get base64 data
        const data = section.generatedImageUrl.split(',')[1];
        imgFolder?.file(`section-${idx + 1}.png`, data, { base64: true });
      }
    });

    const content = await zip.generateAsync({ type: "blob" });
    const url = window.URL.createObjectURL(content);
    const a = document.createElement("a");
    a.href = url;
    a.download = "redesigned-landing-page.zip";
    a.click();
    window.URL.revokeObjectURL(url);
  };

  return (
    <div className="max-w-7xl mx-auto h-[80vh] flex flex-col bg-black/80 border-2 border-cyan-500/50 overflow-hidden shadow-2xl">
      <div className="flex justify-between items-center p-4 border-b border-cyan-500/30 bg-black/90">
        <div className="flex gap-2">
          <button
            onClick={() => setActiveTab('preview')}
            className={`px-4 py-2 flex items-center gap-2 font-medium transition-all border ${
              activeTab === 'preview'
                ? 'bg-cyan-500/20 border-cyan-500 text-cyan-100'
                : 'bg-black/50 border-cyan-500/30 text-cyan-400 hover:border-cyan-500/50'
            }`}
            style={{ fontFamily: 'var(--font-mono)', fontSize: '12px', boxShadow: activeTab === 'preview' ? 'var(--glow-cyan)' : 'none' }}
          >
            <Eye size={16} /> LIVE_PREVIEW
          </button>
          <button
            onClick={() => setActiveTab('code')}
            className={`px-4 py-2 flex items-center gap-2 font-medium transition-all border ${
              activeTab === 'code'
                ? 'bg-magenta-500/20 border-magenta-500 text-magenta-100'
                : 'bg-black/50 border-magenta-500/30 text-magenta-400 hover:border-magenta-500/50'
            }`}
            style={{ fontFamily: 'var(--font-mono)', fontSize: '12px', boxShadow: activeTab === 'code' ? 'var(--glow-magenta)' : 'none' }}
          >
            <Code size={16} /> SOURCE_CODE
          </button>
        </div>

        <button
          onClick={handleDownload}
          className="bg-yellow-600 hover:bg-yellow-500 text-black px-4 py-2 font-bold flex items-center gap-2 transition-all border-2 border-yellow-500 uppercase tracking-wider"
          style={{ fontFamily: 'var(--font-display)', fontSize: '12px', boxShadow: 'var(--glow-yellow)' }}
        >
          <Download size={16} /> Download
        </button>
      </div>

      <div className="flex-1 overflow-hidden bg-black relative">
        {activeTab === 'preview' ? (
          <div className="w-full h-full relative">
            <div className="absolute top-2 left-2 px-3 py-1 bg-black/80 border border-cyan-500/50 text-cyan-300 text-xs z-10" style={{ fontFamily: 'var(--font-mono)' }}>
              &gt; RENDERING_OUTPUT
            </div>
            <iframe
              srcDoc={fullHtml}
              className="w-full h-full bg-white"
              title="Preview"
              sandbox="allow-scripts"
            />
          </div>
        ) : (
          <div className="w-full h-full overflow-auto p-6 bg-black">
            <div className="mb-3 px-3 py-2 bg-black/80 border border-magenta-500/50 text-magenta-300 text-xs inline-block" style={{ fontFamily: 'var(--font-mono)' }}>
              &gt; SOURCE_CODE_VIEW
            </div>
            <pre className="text-sm text-green-400 bg-black/60 border border-green-500/20 p-4 overflow-x-auto" style={{ fontFamily: 'var(--font-mono)' }}>
              {fullHtml}
            </pre>
          </div>
        )}
      </div>
    </div>
  );
};