import React, { useState } from 'react';
import { Settings, AlertCircle, FileText, Cpu } from 'lucide-react';
import { GenerationSettings, PromptModel, ImageModel, PromptMode } from '../types';
import { DEFAULT_PROMPT_MAKER, PROMPT_BAG_ON_MODEL, PROMPT_BAG_NO_MODEL, PROMPT_FLAT_LAY } from '../constants';

interface SidebarProps {
  settings: GenerationSettings;
  setSettings: (settings: GenerationSettings) => void;
  isProcessing: boolean;
  onPromptsByModeChange: (prompts: Record<PromptMode, string>) => void;
}

const Sidebar: React.FC<SidebarProps> = ({ 
  settings, 
  setSettings, 
  isProcessing,
  onPromptsByModeChange
}) => {
  const [promptMode, setPromptMode] = useState<PromptMode>('default');

  const [promptsByMode, setPromptsByMode] = useState<Record<PromptMode, string>>({
    'default': DEFAULT_PROMPT_MAKER,
    'flat-lay': PROMPT_FLAT_LAY,
    'bag-on-model': PROMPT_BAG_ON_MODEL,
    'bag-no-model': PROMPT_BAG_NO_MODEL,
    'custom': '',
  });

  const promptText = promptsByMode[promptMode];

  const modeDefaults: Record<PromptMode, string> = {
    'default': DEFAULT_PROMPT_MAKER,
    'flat-lay': PROMPT_FLAT_LAY,
    'bag-on-model': PROMPT_BAG_ON_MODEL,
    'bag-no-model': PROMPT_BAG_NO_MODEL,
    'custom': '',
  };

  const handlePromptModeChange = (mode: PromptMode) => {
    setPromptMode(mode);
  };

  const handlePromptTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value;
    const updated = { ...promptsByMode, [promptMode]: value };
    setPromptsByMode(updated);
    onPromptsByModeChange(updated);
  };

  return (
    <div className="w-80 bg-slate-800 border-r border-slate-700 p-6 flex flex-col h-full overflow-y-auto">
      <div className="flex items-center gap-3 mb-8">
        <div className="p-2 bg-indigo-500 rounded-lg">
          <Settings className="w-6 h-6 text-white" />
        </div>
        <h1 className="text-xl font-bold text-white">AI Clothing</h1>
      </div>

      <div className="space-y-6">

        {/* Prompt Configuration Section */}
        <div className="space-y-2">
          <label htmlFor="prompt-mode" className="text-sm font-medium text-slate-300 flex items-center gap-2">
            <FileText className="w-4 h-4" />
            Prompt Mode
          </label>
          <select
            id="prompt-mode"
            value={promptMode}
            onChange={(e) => handlePromptModeChange(e.target.value as PromptMode)}
            className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-200 outline-none focus:ring-2 focus:ring-indigo-500"
            disabled={isProcessing}
          >
            <option value="default">Default model dressing</option>
            <option value="flat-lay">Flat-lay Garment image</option>
            <option value="bag-on-model">Bag wore on model</option>
            <option value="bag-no-model">Bag with no model</option>
            <option value="custom">Custom prompt</option>
          </select>

          <div className="relative mt-2">
            <textarea
              id="prompt-text"
              aria-describedby="prompt-text-help"
              value={promptText}
              onChange={handlePromptTextChange}
              placeholder={promptMode === 'custom' ? 'Enter custom prompt instructions' : ''}
              rows={8}
              className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-2 text-xs text-slate-200 focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all placeholder-slate-500 resize-y"
              disabled={isProcessing}
            />
            {promptMode !== 'custom' && promptText !== modeDefaults[promptMode] && (
              <button
                type="button"
                onClick={() => {
                  const updated = { ...promptsByMode, [promptMode]: modeDefaults[promptMode] };
                  setPromptsByMode(updated);
                  onPromptsByModeChange(updated);
                }}
                disabled={isProcessing}
                className="absolute top-2 right-2 text-xs text-slate-400 hover:text-indigo-300 bg-slate-800/80 px-2 py-0.5 rounded transition-colors"
              >
                Reset
              </button>
            )}
          </div>
          <p id="prompt-text-help" className="text-xs text-slate-500">
            Edit the prompt to customize the analysis behavior.
          </p>
        </div>

        <div className="h-px bg-slate-700 my-4" />

        {/* Model Selection Section */}
        <div className="space-y-4">
          <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-2">
            <Cpu className="w-4 h-4" />
            Model Selection
          </h2>

          <div className="space-y-2">
            <label className="text-sm text-slate-300">Prompt Generation Model</label>
            <select
              value={settings.promptModel}
              onChange={(e) => setSettings({ ...settings, promptModel: e.target.value as PromptModel })}
              className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-200 outline-none focus:ring-2 focus:ring-indigo-500"
              disabled={isProcessing}
            >
              <option value="gemini-3-pro-preview">gemini-3-pro-preview</option>
              <option value="gemini-3.1-pro-preview">gemini-3.1-pro-preview</option>
              <option value="gemini-3.1-flash-lite-preview">gemini-3.1-flash-lite-preview</option>
              <option value="anthropic/claude-sonnet-4.6">anthropic/claude-sonnet-4.6 (fal pipeline)</option>
            </select>
          </div>

          <div className="space-y-2">
            <label className="text-sm text-slate-300">Image Generation Model</label>
            <select
              value={settings.imageModel}
              onChange={(e) => setSettings({ ...settings, imageModel: e.target.value as ImageModel })}
              className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-200 outline-none focus:ring-2 focus:ring-indigo-500"
              disabled={isProcessing}
            >
              <option value="gemini-3-pro-image-preview">gemini-3-pro-image-preview</option>
              <option value="gemini-3.1-flash-image-preview">gemini-3.1-flash-image-preview</option>
            </select>
          </div>
        </div>

        <div className="h-px bg-slate-700 my-4" />

        {/* Settings Section */}
        <div className="space-y-4">
          <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-wider">
            Generation Settings
          </h2>

          <div className="space-y-2">
            <label className="text-sm text-slate-300">Resolution</label>
            <select
              value={settings.resolution}
              onChange={(e) => setSettings({ ...settings, resolution: e.target.value as any })}
              className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-200 outline-none focus:ring-2 focus:ring-indigo-500"
              disabled={isProcessing}
            >
              <option value="1K">1K (Standard)</option>
              <option value="2K">2K (High)</option>
              <option value="4K">4K (Ultra)</option>
            </select>
          </div>

          <div className="space-y-2">
            <label className="text-sm text-slate-300">Aspect Ratio</label>
            <select
              value={settings.aspectRatio}
              onChange={(e) => setSettings({ ...settings, aspectRatio: e.target.value as any })}
              className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-200 outline-none focus:ring-2 focus:ring-indigo-500"
              disabled={isProcessing}
            >
              <option value="1:1">1:1 (Square)</option>
              <option value="3:4">3:4 (Portrait - Best for Body)</option>
              <option value="4:3">4:3 (Landscape)</option>
              <option value="9:16">9:16 (Story)</option>
              <option value="16:9">16:9 (Cinema)</option>
              <option value="2:3">2:3 (Portrait - Best for Headshots)</option>
            </select>
            <div className="flex items-start gap-2 text-xs text-amber-500/80 bg-amber-500/10 p-2 rounded">
              <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
              <span>Recommended: 3:4 for full body try-on shots.</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Sidebar;
