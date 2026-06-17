import React from 'react';
import { Layers, ImageOff, Plus } from 'lucide-react';
import { FileWithPreview, PlannedCombo } from '../types';
import { PROMPT_MODE_LABELS } from './PromptModeSelector';

interface CombinationsPreviewProps {
  combos: PlannedCombo[];
  modelImages: FileWithPreview[];
  extraPromptByCombo: Record<string, string>;
  onExtraPromptChange: (key: string, value: string) => void;
  disabled?: boolean;
}

/**
 * Shows every combination that WILL be generated, before any request is sent.
 * Each card carries an extra free-text box whose contents are appended to that
 * single combination's prompt at run time. Flat-lay combinations appear once per
 * garment (the model image is only an ignored reference).
 */
const CombinationsPreview: React.FC<CombinationsPreviewProps> = ({
  combos,
  modelImages,
  extraPromptByCombo,
  onExtraPromptChange,
  disabled,
}) => {
  if (combos.length === 0) {
    return (
      <div className="h-full flex flex-col items-center justify-center text-slate-500 p-8 min-h-[300px] border border-dashed border-slate-700 rounded-2xl">
        <Layers className="w-8 h-8 mb-3 opacity-50" />
        <p className="text-sm text-center">
          Upload model and garment images and select a prompt mode to preview the combinations here.
        </p>
        <p className="text-xs text-center mt-1 text-slate-600">No requests are sent until you start the batch.</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-4">
      {combos.map((combo, idx) => {
        const model = modelImages[combo.modelIdx];
        const garmentPreview = combo.group.files[0]?.preview;
        return (
          <div
            key={combo.key}
            className="bg-slate-800/50 rounded-2xl p-4 border border-slate-700/50 flex flex-col sm:flex-row gap-4"
          >
            {/* Inputs */}
            <div className="flex gap-3 shrink-0">
              {!combo.flatLay && model && (
                <div className="w-20">
                  <div className="aspect-[3/4] bg-slate-900 rounded-lg overflow-hidden border border-slate-700">
                    <img src={model.preview} alt="Model" className="w-full h-full object-cover" />
                  </div>
                  <p className="text-[10px] text-slate-500 text-center mt-1 truncate">Model</p>
                </div>
              )}
              <div className="w-20">
                <div className="aspect-[3/4] bg-slate-900 rounded-lg overflow-hidden border border-slate-700 flex items-center justify-center">
                  {garmentPreview ? (
                    <img src={garmentPreview} alt="Garment" className="w-full h-full object-cover" />
                  ) : (
                    <ImageOff className="w-6 h-6 text-slate-600" />
                  )}
                </div>
                <p className="text-[10px] text-slate-500 text-center mt-1 truncate">
                  Garment{combo.group.files.length > 1 ? ` ×${combo.group.files.length}` : ''}
                </p>
              </div>
            </div>

            {/* Meta + extra prompt */}
            <div className="flex-1 min-w-0 flex flex-col gap-2">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">#{idx + 1}</span>
                <span className="text-xs bg-slate-700 text-slate-300 px-2 py-0.5 rounded-full">
                  {PROMPT_MODE_LABELS[combo.promptMode]}
                </span>
                {combo.flatLay && (
                  <span className="text-xs bg-amber-500/10 text-amber-300 px-2 py-0.5 rounded-full">
                    one per garment · model ignored
                  </span>
                )}
              </div>

              {combo.group.files.some(f => f.description?.trim()) && (
                <div className="text-[11px] text-slate-400 bg-slate-900/50 border border-slate-700/60 rounded-lg px-2.5 py-1.5">
                  <span className="font-semibold text-slate-300">Garment image labels:</span>
                  <ul className="mt-0.5 space-y-0.5">
                    {combo.group.files.map((f, i) => (
                      <li key={i} className="truncate">
                        <span className="text-slate-500">#{i + 1}</span>{' '}
                        {f.description?.trim() || <span className="text-slate-600">— (no label)</span>}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              <label className="text-[11px] text-slate-400 flex items-center gap-1">
                <Plus className="w-3 h-3" />
                Extra prompt text for this combination (appended to the mode prompt)
              </label>
              <textarea
                value={extraPromptByCombo[combo.key] || ''}
                onChange={(e) => onExtraPromptChange(combo.key, e.target.value)}
                disabled={disabled}
                rows={2}
                placeholder="Optional. e.g. 'tuck in the shirt', 'roll up the sleeves', 'warmer lighting'…"
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-slate-200 focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all placeholder-slate-600 resize-y disabled:opacity-50"
              />
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default CombinationsPreview;
