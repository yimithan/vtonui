import React, { useState, useRef, useEffect } from 'react';
import { Settings, AlertCircle, FileText, Cpu, ChevronDown, ChevronUp, Plus, Trash2, Edit2, Check, X, List } from 'lucide-react';
import { GenerationSettings, ImageModel, PromptModel } from '../types';
import { DEFAULT_POSE_PROMPT_TEMPLATE } from '../constants';

interface PoseSidebarProps {
  settings: GenerationSettings;
  setSettings: (settings: GenerationSettings) => void;
  isProcessing: boolean;
  promptTemplate: string;
  onPromptTemplateChange: (prompt: string) => void;
  poseVariations: string[];
  onPoseVariationsChange: (poses: string[]) => void;
}

const PoseSidebar: React.FC<PoseSidebarProps> = ({
  settings,
  setSettings,
  isProcessing,
  promptTemplate,
  onPromptTemplateChange,
  poseVariations,
  onPoseVariationsChange,
}) => {
  const [promptMode] = useState('pose-preservation');
  const [poseListExpanded, setPoseListExpanded] = useState(false);
  const [editingIdx, setEditingIdx] = useState<number | null>(null);
  const [editingText, setEditingText] = useState('');

  // Resizable sidebar
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

  const handleEditPose = (idx: number) => {
    setEditingIdx(idx);
    setEditingText(poseVariations[idx]);
  };

  const handleSavePose = (idx: number) => {
    if (!editingText.trim()) return;
    const updated = [...poseVariations];
    updated[idx] = editingText.trim();
    onPoseVariationsChange(updated);
    setEditingIdx(null);
  };

  const handleCancelEdit = () => {
    // If cancelling on a brand-new empty pose, remove it
    if (editingIdx !== null && poseVariations[editingIdx] === '') {
      handleDeletePose(editingIdx);
    }
    setEditingIdx(null);
  };

  const handleDeletePose = (idx: number) => {
    const updated = poseVariations.filter((_, i) => i !== idx);
    onPoseVariationsChange(updated);
    if (editingIdx === idx) {
      setEditingIdx(null);
    } else if (editingIdx !== null && editingIdx > idx) {
      setEditingIdx(editingIdx - 1);
    }
  };

  const handleAddPose = () => {
    const updated = [...poseVariations, ''];
    onPoseVariationsChange(updated);
    setEditingIdx(updated.length - 1);
    setEditingText('');
    setPoseListExpanded(true);
  };

  return (
    <div
      className="relative bg-slate-800 border-r border-slate-700 p-6 flex flex-col h-full overflow-y-auto shrink-0"
      style={{ width: sidebarWidth }}
    >
      {/* Resize handle */}
      <div
        className="absolute top-0 right-0 w-1.5 h-full cursor-col-resize hover:bg-indigo-500/50 active:bg-indigo-500 transition-colors z-10"
        onMouseDown={handleResizeMouseDown}
      />

      <div className="flex items-center gap-3 mb-8">
        <div className="p-2 bg-indigo-500 rounded-lg">
          <Settings className="w-6 h-6 text-white" />
        </div>
        <h1 className="text-xl font-bold text-white">Pose Generator</h1>
      </div>

      <div className="space-y-6">
        <div className="space-y-2">
          <label htmlFor="pose-prompt-mode" className="text-sm font-medium text-slate-300 flex items-center gap-2">
            <FileText className="w-4 h-4" />
            Prompt Mode
          </label>
          <select
            id="pose-prompt-mode"
            value={promptMode}
            className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-200 outline-none focus:ring-2 focus:ring-indigo-500"
            disabled
          >
            <option value="pose-preservation">Pose Preservation</option>
          </select>

          <textarea
            id="pose-prompt-text"
            value={promptTemplate}
            onChange={(e) => onPromptTemplateChange(e.target.value)}
            rows={10}
            className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-2 text-xs text-slate-200 focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all placeholder-slate-500 resize-y mt-2"
            disabled={isProcessing}
          />
          <p className="text-xs text-slate-500">
            The selected pose text is injected into [INSERT TARGET POSE HERE].
          </p>
        </div>

        <div className="h-px bg-slate-700 my-4" />

        {/* Pose Variations Section */}
        <div className="space-y-2">
          <button
            type="button"
            onClick={() => setPoseListExpanded(!poseListExpanded)}
            className="w-full flex items-center justify-between text-sm font-medium text-slate-300 hover:text-white transition-colors"
          >
            <span className="flex items-center gap-2">
              <List className="w-4 h-4" />
              Pose Variations ({poseVariations.length})
            </span>
            {poseListExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>

          {poseListExpanded && (
            <div className="space-y-1">
              <div className="max-h-64 overflow-y-auto space-y-1 pr-1">
                {poseVariations.map((pose, idx) => (
                  <div key={idx} className="flex items-start gap-1.5 text-xs bg-slate-900/50 rounded p-2">
                    <span className="text-slate-500 shrink-0 w-6 text-right mt-0.5">{idx + 1}.</span>
                    {editingIdx === idx ? (
                      <div className="flex-1 space-y-1">
                        <textarea
                          value={editingText}
                          onChange={(e) => setEditingText(e.target.value)}
                          rows={2}
                          className="w-full bg-slate-900 border border-slate-600 rounded px-2 py-1 text-xs text-slate-200 resize-y outline-none focus:ring-1 focus:ring-indigo-500"
                          autoFocus
                        />
                        <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={() => handleSavePose(idx)}
                            className="text-green-400 hover:text-green-300 transition-colors"
                            title="Save"
                          >
                            <Check className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={handleCancelEdit}
                            className="text-slate-400 hover:text-slate-300 transition-colors"
                            title="Cancel"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    ) : (
                      <>
                        <span className="flex-1 text-slate-300 line-clamp-2 leading-relaxed">{pose}</span>
                        <button
                          type="button"
                          onClick={() => handleEditPose(idx)}
                          disabled={isProcessing}
                          className="text-slate-500 hover:text-indigo-400 shrink-0 transition-colors mt-0.5 disabled:opacity-40"
                          title="Edit"
                        >
                          <Edit2 className="w-3 h-3" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeletePose(idx)}
                          disabled={isProcessing}
                          className="text-slate-500 hover:text-red-400 shrink-0 transition-colors mt-0.5 disabled:opacity-40"
                          title="Delete"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </>
                    )}
                  </div>
                ))}
              </div>
              <button
                type="button"
                onClick={handleAddPose}
                disabled={isProcessing}
                className="w-full flex items-center justify-center gap-1.5 text-xs text-indigo-400 hover:text-indigo-300 py-1.5 border border-dashed border-slate-600 hover:border-indigo-500 rounded transition-colors disabled:opacity-40"
              >
                <Plus className="w-3 h-3" />
                Add Pose
              </button>
            </div>
          )}
        </div>

        <div className="h-px bg-slate-700 my-4" />

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
              <span>Recommended: 3:4 for full body pose consistency.</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PoseSidebar;

