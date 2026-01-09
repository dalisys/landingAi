import React, { useState } from 'react';
import { Section, GenerationMode } from '../types';
import { Wand2, Download, Code, Loader2, Edit2, X, Terminal } from 'lucide-react'; // Added Terminal
import { editSectionImage } from '../services/geminiService';
import { calculateCost, estimateTokens, estimateImageTokens, ModelType } from '../services/pricingService';

interface Props {
  sections: Section[];
  onGenerateCode: () => void;
  isGeneratingCode: boolean;
  onUpdateSectionImage: (sectionId: string, newImage: string) => void;
  onAddCost: (cost: number) => void;
  mode?: GenerationMode;
}

export const Gallery: React.FC<Props> = ({ sections, onGenerateCode, isGeneratingCode, onUpdateSectionImage, onAddCost, mode = GenerationMode.FULL }) => {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editPrompt, setEditPrompt] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [showImageModal, setShowImageModal] = useState(false); // State for modal visibility
  const [modalImageUrl, setModalImageUrl] = useState('');     // State for image to display in modal

  const handleEditSubmit = async (section: Section) => {
    if (!section.generatedImageUrl || !editPrompt) return;

    setIsEditing(true);
    try {
      const newImage = await editSectionImage(section.generatedImageUrl, editPrompt);
      onUpdateSectionImage(section.id, newImage);

      // Track cost for image editing (uses Gemini 2.5 Flash Image)
      const editCost = calculateCost({
        model: ModelType.GEMINI_2_5_FLASH_IMAGE,
        inputTokens: estimateImageTokens() + estimateTokens(editPrompt),
        outputImages: 1,
      });
      onAddCost(editCost);

      setEditingId(null);
      setEditPrompt('');
    } catch (e) {
      console.error("Failed to edit image", e);
      alert("Failed to edit image. Please try again.");
    } finally {
      setIsEditing(false);
    }
  };

  const openImageModal = (imageUrl: string) => {
    setModalImageUrl(imageUrl);
    setShowImageModal(true);
  };

  const closeImageModal = () => {
    setShowImageModal(false);
    setModalImageUrl('');
  };

  return (
    <div className="max-w-6xl mx-auto space-y-8 pb-20">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {sections.map((section, idx) => (
          <div key={section.id} className="bg-black/70 border-2 border-cyan-500/50 overflow-hidden shadow-2xl group holo-card animate-fade-in-up" style={{ animationDelay: `${idx * 0.1}s`, opacity: 0 }}>
            <div className="p-4 border-b border-cyan-500/30 flex justify-between items-center bg-black/80 backdrop-blur-sm z-10 relative">
              <h3 className="font-bold neon-text-cyan text-sm uppercase tracking-wider" style={{ fontFamily: 'var(--font-display)' }}>{section.name}</h3>
              <div className="flex gap-2">
                 <button
                  onClick={() => setEditingId(section.id)}
                  className="px-3 py-1.5 bg-black border border-cyan-500/50 hover:border-cyan-500 text-cyan-300 hover:text-cyan-100 transition-all text-xs flex items-center gap-1"
                  style={{ fontFamily: 'var(--font-mono)' }}
                  title="Edit with Text Prompt"
                >
                  <Edit2 size={12} /> EDIT
                </button>
              </div>
            </div>

            <div className="relative aspect-video bg-black flex items-center justify-center overflow-hidden border-b border-cyan-500/30">
              {section.generatedImageUrl ? (
                <>
                  <img
                    src={section.generatedImageUrl}
                    alt={section.name}
                    className="w-full h-full object-cover transition-all duration-700 group-hover:scale-105 group-hover:brightness-110 cursor-pointer"
                    onClick={() => openImageModal(section.generatedImageUrl!)}
                  />
                  {/* Edit Overlay */}
                  {editingId === section.id && (
                    <div className="absolute inset-0 bg-black/95 flex flex-col items-center justify-center p-6 z-20 animate-fade-in border-2 border-magenta-500/50">
                      <h4 className="text-white font-bold mb-4 flex items-center gap-2 neon-text-magenta" style={{ fontFamily: 'var(--font-display)' }}>
                        <Wand2 size={20} /> EDIT_WITH_AI
                      </h4>
                      <textarea
                        value={editPrompt}
                        onChange={(e) => setEditPrompt(e.target.value)}
                        placeholder="e.g. 'Add a retro filter', 'Make the background darker', 'Add a robot'"
                        className="w-full h-24 bg-black border border-magenta-500/50 p-3 text-cyan-100 mb-4 outline-none text-sm placeholder:text-magenta-500/30"
                        style={{ fontFamily: 'var(--font-body)' }}
                      />
                      <div className="flex gap-3 w-full">
                        <button
                          onClick={() => { setEditingId(null); setEditPrompt(''); }}
                          className="flex-1 py-2 bg-black border border-cyan-500/50 hover:border-cyan-500 text-cyan-300 hover:text-cyan-100 text-sm transition-all"
                          style={{ fontFamily: 'var(--font-mono)' }}
                        >
                          CANCEL
                        </button>
                        <button
                          onClick={() => handleEditSubmit(section)}
                          disabled={isEditing || !editPrompt}
                          className="flex-1 py-2 bg-magenta-600 hover:bg-magenta-500 border-2 border-magenta-500 text-white font-bold text-sm flex justify-center items-center gap-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                          style={{ fontFamily: 'var(--font-mono)', boxShadow: isEditing ? 'none' : 'var(--glow-magenta)' }}
                        >
                          {isEditing ? <><div className="w-4 h-4 cyber-spinner" style={{ borderWidth: '2px' }}></div> PROCESSING</> : 'APPLY_EDIT'}
                        </button>
                      </div>
                    </div>
                  )}
                </>
              ) : (
                <div className="flex flex-col items-center text-cyan-400">
                   {mode === GenerationMode.CODE_ONLY ? (
                     <>
                        <Terminal className="neon-text-yellow mb-2" size={32} />
                        <span className="text-cyan-300/60" style={{ fontFamily: 'var(--font-mono)', fontSize: '12px' }}>VISUAL_GEN_SKIPPED</span>
                        <span className="text-xs text-cyan-500/40" style={{ fontFamily: 'var(--font-mono)' }}>(CODE_ONLY_MODE)</span>
                     </>
                   ) : (
                     <>
                        <div className="w-12 h-12 cyber-spinner mb-2" style={{ borderWidth: '3px' }}></div>
                        <span className="text-cyan-300/60" style={{ fontFamily: 'var(--font-mono)', fontSize: '12px' }}>GENERATING...</span>
                     </>
                   )}
                </div>
              )}
            </div>

            <div className="p-3 bg-black/60 border-t border-cyan-500/30">
               <p className="text-xs text-cyan-100/60 truncate" style={{ fontFamily: 'var(--font-body)' }}>{section.description}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="flex justify-center pt-8">
        <button
          onClick={onGenerateCode}
          disabled={isGeneratingCode || (mode === GenerationMode.FULL && sections.some(s => !s.generatedImageUrl))}
          className={`
            px-8 py-4 font-bold text-lg flex items-center gap-3 transition-all shadow-xl uppercase tracking-wider
            ${isGeneratingCode || (mode === GenerationMode.FULL && sections.some(s => !s.generatedImageUrl))
              ? 'bg-gray-800 text-gray-600 cursor-not-allowed border-2 border-gray-700'
              : 'neon-button'
            }
          `}
          style={{
            fontFamily: 'var(--font-display)',
            borderColor: isGeneratingCode || (mode === GenerationMode.FULL && sections.some(s => !s.generatedImageUrl)) ? undefined : 'var(--neon-magenta)',
            color: isGeneratingCode || (mode === GenerationMode.FULL && sections.some(s => !s.generatedImageUrl)) ? undefined : 'var(--neon-magenta)'
          }}
        >
          {isGeneratingCode ? (
             <><div className="w-6 h-6 cyber-spinner" style={{ borderWidth: '3px' }}></div> <span>Coding...</span></>
          ) : (
             <><Code size={24} /> <span>Generate Code</span></>
          )}
        </button>
      </div>

      {/* Image Preview Modal */}
      {showImageModal && (
        <div
          className="fixed inset-0 bg-black/95 flex items-center justify-center z-50 p-4 animate-fade-in backdrop-blur-sm"
          onClick={closeImageModal}
        >
          <div className="scan-lines fixed inset-0 pointer-events-none"></div>
          <div className="relative max-w-6xl max-h-full overflow-auto border-2 border-cyan-500/50 bg-black/80" onClick={e => e.stopPropagation()}>
            <div className="absolute top-0 left-0 right-0 p-3 bg-black/90 border-b border-cyan-500/30 flex items-center justify-between z-10">
              <span className="text-cyan-300 text-xs" style={{ fontFamily: 'var(--font-mono)' }}>
                &gt; IMAGE_PREVIEW
              </span>
              <button
                onClick={closeImageModal}
                className="bg-black border border-red-500/50 text-red-400 hover:bg-red-500/20 hover:border-red-500 p-2 transition-all"
                style={{ boxShadow: '0 0 10px rgba(255, 0, 0, 0.3)' }}
              >
                <X size={20} />
              </button>
            </div>
            <div className="p-12 pt-16">
              <img
                src={modalImageUrl}
                alt="Generated Section Preview"
                className="max-w-full max-h-full object-contain shadow-2xl border border-cyan-500/20"
                style={{ boxShadow: '0 0 50px rgba(0, 255, 255, 0.2)' }}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
