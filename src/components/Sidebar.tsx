import React from 'react';
import { Settings, Key, AlertCircle, FileText } from 'lucide-react';
import { GenerationSettings } from '../types';

interface SidebarProps {
  apiKey: string;
  setApiKey: (key: string) => void;
  settings: GenerationSettings;
  setSettings: (settings: GenerationSettings) => void;
  isProcessing: boolean;
  onPromptConfigChange: (content: string | null) => void;
}

const Sidebar: React.FC<SidebarProps> = ({ 
  apiKey, 
  setApiKey, 
  settings, 
  setSettings, 
  isProcessing,
  onPromptConfigChange
}) => {

  const handlePromptChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value.trim();
    onPromptConfigChange(value || null);
  };

  return (
    <div className="w-80 bg-slate-800 border-r border-slate-700 p-6 flex flex-col h-full overflow-y-auto">
      <div className="flex items-center gap-3 mb-8">
        <div className="p-2 bg-indigo-500 rounded-lg">
          <Settings className="w-6 h-6 text-white" />
        </div>
        <h1 className="text-xl font-bold text-white">Virtual Try-On</h1>
      </div>

      <div className="space-y-6">
        {/* API Key Section */}
        <div className="space-y-2">
          <label className="text-sm font-medium text-slate-300 flex items-center gap-2">
            <Key className="w-4 h-4" />
            Google Gemini API Key
          </label>
          <input
            type="password"
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            placeholder="Enter your API Key"
            className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-2 text-sm text-slate-200 focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all placeholder-slate-500"
            disabled={isProcessing}
          />
          <p className="text-xs text-slate-500">
            Your key is processed locally and never stored.
          </p>
        </div>

        <div className="h-px bg-slate-700 my-4" />

        {/* Prompt Configuration Section */}
        <div className="space-y-2">
          <label className="text-sm font-medium text-slate-300 flex items-center gap-2">
            <FileText className="w-4 h-4" />
            Custom Prompt (Optional)
          </label>
          <textarea
            onChange={handlePromptChange}
            placeholder="Enter custom prompt instructions (optional)"
            rows={6}
            className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-2 text-sm text-slate-200 focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all placeholder-slate-500 resize-none"
            disabled={isProcessing}
          />
          <p className="text-xs text-slate-500">
            Optional. Enter a custom prompt to override the default analysis behavior.
          </p>
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