import React, { useState, useRef, useEffect } from 'react';
import { Settings, AlertCircle, FileText, Cpu } from 'lucide-react';
import { GenerationSettings } from '../types';

interface FacialSidebarProps {
  settings: GenerationSettings;
  setSettings: (settings: GenerationSettings) => void;
  isProcessing: boolean;
  prompt: string;
  onPromptChange: (prompt: string) => void;
}

const FacialSidebar: React.FC<FacialSidebarProps> = ({
  settings,
  setSettings,
  isProcessing,
  prompt,
  onPromptChange,
}) => {
  const [sidebarWidth, setSidebarWidth] = useState(320);
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
      const newWidth = Math.max(280, Math.min(640, startWidth.current + delta));
      setSidebarWidth(newWidth);
    };

    const handleMouseUp = () => {
      isDragging.current = false;
    };

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
        <h1 className="text-xl font-bold text-white">Facial Enhancement</h1>
      </div>

      <div className="space-y-6">
        <div className="space-y-2">
          <label htmlFor="facial-prompt" className="text-sm font-medium text-slate-300 flex items-center gap-2">
            <FileText className="w-4 h-4" />
            Enhancement Prompt
          </label>
          <textarea
            id="facial-prompt"
            value={prompt}
            onChange={(e) => onPromptChange(e.target.value)}
            rows={10}
            className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-2 text-xs text-slate-200 focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all placeholder-slate-500 resize-y"
            disabled={isProcessing}
          />
          <p className="text-xs text-slate-500">
            This prompt is applied to each target model image using the same reference face.
          </p>
        </div>

        <div className="h-px bg-slate-700 my-4" />

        <div className="space-y-4">
          <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-2">
            <Cpu className="w-4 h-4" />
            Model Selection
          </h2>

          <div className="space-y-2">
            <label className="text-sm text-slate-300">Image Generation Model</label>
            <select
              value={settings.imageModel}
              onChange={(e) => setSettings({ ...settings, imageModel: e.target.value as 'fal-ai/nano-banana-2' })}
              className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-200 outline-none focus:ring-2 focus:ring-indigo-500"
              disabled={isProcessing}
            >
              <option value="fal-ai/nano-banana-2">fal-ai/nano-banana-2</option>
            </select>
          </div>

          <div className="flex items-start gap-2 text-xs text-amber-500/80 bg-amber-500/10 p-2 rounded">
            <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
            <span>Facial enhancement is locked to Nano Banana 2 for best multimodal consistency.</span>
          </div>
        </div>

        <div className="h-px bg-slate-700 my-4" />

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
          </div>
        </div>
      </div>
    </div>
  );
};

export default FacialSidebar;
