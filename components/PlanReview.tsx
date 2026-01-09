import React from 'react';
import { ProjectState, Section, GenerationMode } from '../types';
import { ArrowRight, Palette, Type, Layout, Plus, Trash2, ArrowUp, ArrowDown, Code } from 'lucide-react';

interface Props {
  projectState: ProjectState;
  onApprove: () => void;
  onUpdateDesignSystem: (updates: Partial<ProjectState['designSystem']>) => void;
  onUpdateSection: (id: string, updates: Partial<Section>) => void;
  onAddSection: () => void;
  onDeleteSection: (id: string) => void;
  onMoveSection: (id: string, dir: 'up' | 'down') => void;
  mode?: GenerationMode;
}

export const PlanReview: React.FC<Props> = ({
  projectState,
  onApprove,
  onUpdateDesignSystem,
  onUpdateSection,
  onAddSection,
  onDeleteSection,
  onMoveSection,
  mode = GenerationMode.FULL
}) => {
  if (!projectState.designSystem) return null;

  const { designSystem, sections } = projectState;
  const colorPalette = designSystem.colorPalette || [];
  const typography = designSystem.typography || 'Not specified';
  const styleDescription = designSystem.styleDescription || 'No description available';

  const handleColorHexChange = (idx: number, hex: string) => {
    const updated = [...colorPalette];
    updated[idx] = { ...updated[idx], hex };
    onUpdateDesignSystem({ colorPalette: updated });
  };

  const handleColorRoleChange = (idx: number, role: string) => {
    const updated = [...colorPalette];
    updated[idx] = { ...updated[idx], role };
    onUpdateDesignSystem({ colorPalette: updated });
  };

  const handleAddColor = () => {
    onUpdateDesignSystem({ 
      colorPalette: [...colorPalette, { hex: '#4f46e5', role: 'New Color' }] 
    });
  };

  const handleRemoveColor = (idx: number) => {
    const updated = colorPalette.filter((_, i) => i !== idx);
    onUpdateDesignSystem({ colorPalette: updated });
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6 animate-fade-in">
      <div className="bg-black/70 p-6 border-2 border-magenta-500/50 holo-card">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-1 h-12 bg-gradient-to-b from-magenta-500 to-cyan-500"></div>
          <h2 className="text-2xl font-bold neon-text-magenta flex items-center gap-3" style={{ fontFamily: 'var(--font-display)' }}>
            <Palette className="text-magenta-400" size={28} />
            DESIGN_STRATEGY
          </h2>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          <div className="space-y-4">
            <h3 className="text-xs uppercase tracking-wider text-cyan-300/60 font-semibold" style={{ fontFamily: 'var(--font-mono)' }}>&gt; COLOR_PALETTE</h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {colorPalette.length > 0 ? (
                colorPalette.map((colorItem, idx) => (
                  <div key={idx} className="flex flex-col gap-2 bg-black/80 border border-cyan-500/30 p-3 group hover:border-cyan-500 transition-colors">
                    <div className="flex items-center gap-2">
                      <input
                        type="color"
                        value={/^#([0-9A-Fa-f]{3}){1,2}$/.test(colorItem.hex) ? colorItem.hex : '#ffffff'}
                        onChange={(e) => handleColorHexChange(idx, e.target.value)}
                        className="w-8 h-8 cursor-pointer border-2 border-cyan-500/50 flex-shrink-0 bg-black"
                      />
                      <input
                        value={colorItem.hex}
                        onChange={(e) => handleColorHexChange(idx, e.target.value)}
                        className="bg-black border border-cyan-500/30 px-2 py-1 text-xs text-cyan-100 w-full uppercase outline-none hover:border-cyan-500/50"
                        style={{ fontFamily: 'var(--font-mono)' }}
                      />
                    </div>
                    <input
                      value={colorItem.role}
                      placeholder="Role (e.g. Primary)"
                      onChange={(e) => handleColorRoleChange(idx, e.target.value)}
                      className="bg-black border border-cyan-500/30 px-2 py-1 text-xs text-cyan-100 w-full placeholder:text-cyan-500/30 outline-none hover:border-cyan-500/50"
                      style={{ fontFamily: 'var(--font-body)' }}
                    />
                    <div className="flex justify-end mt-1">
                       <button
                         onClick={() => handleRemoveColor(idx)}
                         className="text-cyan-500/50 hover:text-red-400 transition-colors"
                         title="Remove color"
                       >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                ))
              ) : (
                <div className="col-span-full p-4 text-center text-slate-500 bg-slate-900/50 rounded-lg border border-dashed border-slate-800">
                  No colors defined yet.
                </div>
              )}
              <button
                onClick={handleAddColor}
                className="flex flex-col items-center justify-center gap-2 p-3 border-2 border-dashed border-yellow-500/50 bg-black/60 text-yellow-400 hover:bg-yellow-500/10 hover:border-yellow-500 transition-all h-full min-h-[120px]"
              >
                <div className="p-2 bg-yellow-500/20 border border-yellow-500/50">
                  <Plus size={16} />
                </div>
                <span className="text-xs font-medium uppercase" style={{ fontFamily: 'var(--font-mono)' }}>Add_Color</span>
              </button>
            </div>
          </div>
          
          <div className="space-y-4">
             <h3 className="text-sm uppercase tracking-wider text-slate-400 font-semibold flex items-center gap-2">
               <Type size={16} /> Typography & Vibe
             </h3>
             <div className="bg-slate-900/50 p-4 rounded-lg space-y-3">
                <input
                  value={typography}
                  onChange={(e) => onUpdateDesignSystem({ typography: e.target.value })}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm"
                />
                <textarea
                  value={styleDescription}
                  onChange={(e) => onUpdateDesignSystem({ styleDescription: e.target.value })}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg p-3 text-white text-sm h-20"
                />
             </div>
          </div>
        </div>
      </div>

      <div className="bg-slate-800/50 p-6 rounded-xl border border-slate-700">
        <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-2">
          <Layout className="text-blue-400" />
          Proposed Sections
        </h2>
        <div className="space-y-4">
          {sections && sections.length > 0 ? (
            sections.map((section, idx) => (
              <div key={section.id} className="bg-slate-900 border border-slate-700 p-4 rounded-lg">
                <div className="flex items-start gap-3">
                  <div className="flex-shrink-0 w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center font-bold text-slate-500 border border-slate-700">
                    {idx + 1}
                  </div>
                  <div className="flex-1 space-y-2">
                    <input
                      value={section.name}
                      onChange={(e) => onUpdateSection(section.id, { name: e.target.value })}
                      className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white font-bold"
                    />
                    <textarea
                      value={section.description}
                      onChange={(e) => onUpdateSection(section.id, { description: e.target.value })}
                      className="w-full bg-slate-800 border border-slate-700 rounded-lg p-3 text-white text-sm"
                    />
                    <textarea
                      value={section.visualPrompt}
                      onChange={(e) => onUpdateSection(section.id, { visualPrompt: e.target.value })}
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-xs text-slate-200 font-mono"
                    />
                  </div>
                  <div className="flex flex-col gap-2">
                    <button onClick={() => onMoveSection(section.id, 'up')} disabled={idx === 0} className="p-2 bg-slate-800 border border-slate-700 rounded hover:bg-slate-700 disabled:opacity-40">
                      <ArrowUp size={14} />
                    </button>
                    <button onClick={() => onMoveSection(section.id, 'down')} disabled={idx === sections.length -1} className="p-2 bg-slate-800 border border-slate-700 rounded hover:bg-slate-700 disabled:opacity-40">
                      <ArrowDown size={14} />
                    </button>
                    <button onClick={() => onDeleteSection(section.id)} className="p-2 bg-slate-800 border border-slate-700 rounded hover:bg-red-600 text-red-300">
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              </div>
            ))
          ) : (
            <p className="text-slate-500">No sections defined</p>
          )}
          <button
            onClick={onAddSection}
            className="mt-2 inline-flex items-center gap-2 px-4 py-2 border border-emerald-600 text-emerald-300 hover:text-emerald-200 hover:border-emerald-400 rounded-lg"
          >
            <Plus size={16} /> Add Section
          </button>
        </div>
      </div>

      <div className="flex justify-end pt-4">
        <button
          onClick={onApprove}
          className="neon-button px-8 py-3 text-base flex items-center gap-3"
          style={{
            fontFamily: 'var(--font-display)',
            borderColor: 'var(--neon-yellow)',
            color: 'var(--neon-yellow)'
          }}
        >
          <span className="uppercase tracking-wider">
            {mode === GenerationMode.CODE_ONLY ? 'Start Coding' : 'Generate Visuals'}
          </span>
          {mode === GenerationMode.CODE_ONLY ? <Code size={20} /> : <ArrowRight size={20} />}
        </button>
      </div>
    </div>
  );
};
