import React, { useState, useRef, useEffect } from 'react';
import { Settings, AlertCircle, FileText, Cpu, Sparkles, Scissors } from 'lucide-react';
import { GenerationSettings } from '../types';

interface FacialV2SidebarProps {
  settings: GenerationSettings;
  setSettings: (settings: GenerationSettings) => void;
  isProcessing: boolean;
  prompt: string;
  onPromptChange: (prompt: string) => void;
  useAiPrompt: boolean;
  onUseAiPromptChange: (value: boolean) => void;
  useComposite: boolean;
  onUseCompositeChange: (value: boolean) => void;
}

const FacialV2Sidebar: React.FC<FacialV2SidebarProps> = ({
  settings,
  setSettings,
  isProcessing,
  prompt,
  onPromptChange,
  useAiPrompt,
  onUseAiPromptChange,
  useComposite,
  onUseCompositeChange,
}) => {
  const [sidebarWidth, setSidebarWidth] = useState(340);
  const isDragging = useRef(false);
  const startX = useRef(0);
  const startWidth = useRef(0);

  const handleResizeMouseDown = (e: React.MouseEvent) => {
    isDragging.current = true;
    startX.current = e.clientX;
    startWidth.current = sidebarWidth;
    e.preventDefault();
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isDragging.current) return;
      const delta = e.clientX - startX.current;
      setSidebarWidth(Math.max(300, Math.min(640, startWidth.current + delta)));
    };
    const handleMouseUp = () => { isDragging.current = false; };
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, []);

  return (
    <div
      className="relative bg-slate-800 border-r border-slate-700 p-6 flex flex-col h-full overflow-y-auto shrink-0"
      style={{ width: sidebarWidth }}
    >
      <div
        className="absolute top-0 right-0 w-1.5 h-full cursor-col-resize hover:bg-indigo-500/50 active:bg-indigo-500 transition-colors z-10"
        onMouseDown={handleResizeMouseDown}
      />

      <div className="flex items-center gap-3 mb-8">
        <div className="p-2 bg-indigo-500 rounded-lg">
          <Settings className="w-6 h-6 text-white" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-white">Facial Enhancement v2</h1>
          <span className="text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300">Beta</span>
        </div>
      </div>

      <div className="space-y-6">
        {/* Quality options */}
        <div className="space-y-3">
          <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-2">
            <Sparkles className="w-4 h-4" />
            Quality Options
          </h2>

          <label className="flex items-start gap-2 text-sm text-slate-300 cursor-pointer">
            <input
              type="checkbox"
              checked={useAiPrompt}
              onChange={(e) => onUseAiPromptChange(e.target.checked)}
              disabled={isProcessing}
              className="mt-0.5 accent-indigo-500"
            />
            <span>
              <span className="font-medium flex items-center gap-1.5"><Sparkles className="w-3.5 h-3.5 text-indigo-400" /> AI-tailored prompt</span>
              <span className="block text-xs text-slate-500">Analyze each target + reference first to write a per-image prompt (one extra text call per image).</span>
            </span>
          </label>

          <label className="flex items-start gap-2 text-sm text-slate-300 cursor-pointer">
            <input
              type="checkbox"
              checked={useComposite}
              onChange={(e) => onUseCompositeChange(e.target.checked)}
              disabled={isProcessing}
              className="mt-0.5 accent-indigo-500"
            />
            <span>
              <span className="font-medium flex items-center gap-1.5"><Scissors className="w-3.5 h-3.5 text-indigo-400" /> High-fidelity face (crop &amp; composite)</span>
              <span className="block text-xs text-slate-500">Detect the face locally, enhance only the face crop, and composite it back so body/background stay pixel-identical. Falls back to whole-image if no face is found. Experimental.</span>
            </span>
          </label>
        </div>

        <div className="h-px bg-slate-700 my-4" />

        {/* Prompt */}
        <div className="space-y-2">
          <label htmlFor="facial-v2-prompt" className="text-sm font-medium text-slate-300 flex items-center gap-2">
            <FileText className="w-4 h-4" />
            Enhancement Prompt
          </label>
          <textarea
            id="facial-v2-prompt"
            value={prompt}
            onChange={(e) => onPromptChange(e.target.value)}
            rows={10}
            disabled={isProcessing || useAiPrompt}
            className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-2 text-xs text-slate-200 focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all placeholder-slate-500 resize-y disabled:opacity-50"
          />
          <p className="text-xs text-slate-500">
            {useAiPrompt
              ? 'Disabled while "AI-tailored prompt" is on — a per-image prompt is generated instead.'
              : 'Applied to each target image with the reference face(s). Image 1 = target, Images 2..N = realism references.'}
          </p>
        </div>

        <div className="h-px bg-slate-700 my-4" />

        {/* Model */}
        <div className="space-y-4">
          <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-2">
            <Cpu className="w-4 h-4" />
            Model Selection
          </h2>
          <div className="space-y-2">
            <label className="text-sm text-slate-300">Image Generation Model</label>
            <select
              value={settings.imageModel}
              onChange={(e) => setSettings({ ...settings, imageModel: e.target.value as 'gemini-3-pro-image-preview' })}
              className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-200 outline-none focus:ring-2 focus:ring-indigo-500"
              disabled={isProcessing}
            >
              <option value="gemini-3-pro-image-preview">gemini-3-pro-image-preview</option>
            </select>
          </div>
          <div className="flex items-start gap-2 text-xs text-amber-500/80 bg-amber-500/10 p-2 rounded">
            <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
            <span>Locked to Gemini Image Pro for best multimodal consistency.</span>
          </div>
        </div>

        <div className="h-px bg-slate-700 my-4" />

        {/* Settings */}
        <div className="space-y-4">
          <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-wider">Generation Settings</h2>
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
              <option value="4K">4K (Ultra — recommended for faces)</option>
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
            <p className="text-xs text-slate-500">In crop &amp; composite mode, aspect ratio applies to the face crop; the final image keeps the original's dimensions.</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default FacialV2Sidebar;
