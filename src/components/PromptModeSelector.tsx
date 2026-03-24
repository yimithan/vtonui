import React from 'react';
import { Layers } from 'lucide-react';
import { PromptMode } from '../types';

export const PROMPT_MODE_LABELS: Record<PromptMode, string> = {
  'default': 'Default',
  'flat-lay': 'Flat-lay',
  'bag-on-model': 'Bag on Model',
  'bag-no-model': 'Bag No Model',
  'custom': 'Custom',
};

const ALL_MODES: PromptMode[] = ['default', 'flat-lay', 'bag-on-model', 'bag-no-model', 'custom'];

interface PromptModeSelectorProps {
  selectedModes: PromptMode[];
  onSelectionChange: (modes: PromptMode[]) => void;
  disabled?: boolean;
}

const PromptModeSelector: React.FC<PromptModeSelectorProps> = ({
  selectedModes,
  onSelectionChange,
  disabled,
}) => {
  const toggle = (mode: PromptMode) => {
    if (disabled) return;
    if (selectedModes.includes(mode)) {
      onSelectionChange(selectedModes.filter(m => m !== mode));
    } else {
      onSelectionChange([...selectedModes, mode]);
    }
  };

  return (
    <div className="space-y-3">
      <label className="text-sm font-medium text-slate-300 flex items-center gap-2">
        <Layers className="w-4 h-4" />
        Prompt Modes
        <span className="text-xs text-slate-500 font-normal">(select one or more)</span>
      </label>
      <div className="flex flex-wrap gap-4">
        {ALL_MODES.map((mode) => {
          const isSelected = selectedModes.includes(mode);
          return (
            <button
              key={mode}
              type="button"
              onClick={() => toggle(mode)}
              disabled={disabled}
              aria-pressed={isSelected}
              className="flex flex-col items-center gap-1.5 group disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none"
            >
              <div
                className={`w-9 h-9 rounded-full border-2 transition-all duration-150 ${
                  isSelected
                    ? 'bg-indigo-500 border-indigo-500 shadow-[0_0_0_3px_rgba(99,102,241,0.25)]'
                    : 'bg-transparent border-slate-500 group-hover:border-indigo-400 group-focus-visible:border-indigo-400'
                }`}
              />
              <span
                className={`text-[10px] text-center leading-tight max-w-[64px] transition-colors ${
                  isSelected ? 'text-indigo-300 font-medium' : 'text-slate-400 group-hover:text-slate-300'
                }`}
              >
                {PROMPT_MODE_LABELS[mode]}
              </span>
            </button>
          );
        })}
      </div>
      {selectedModes.length === 0 && (
        <p className="text-xs text-red-400/80">Select at least one mode to run a batch.</p>
      )}
    </div>
  );
};

export default PromptModeSelector;
