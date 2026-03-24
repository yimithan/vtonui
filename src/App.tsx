import React, { useState, useEffect, useRef } from 'react';
import Sidebar from './components/Sidebar';
import UploadZone from './components/UploadZone';
import GarmentList from './components/GarmentList';
import ResultsGallery from './components/ResultsGallery';
import DebugConsole from './components/DebugConsole';
import PromptModeSelector from './components/PromptModeSelector';
import { FileWithPreview, GenerationSettings, AppStatus, GarmentGroup, TryOnResult, PromptModel, ImageModel, PromptMode } from './types';
import { analyzeImages, generateTryOnImage } from './services/geminiService';
import { addLog } from './services/debugLogger';
import { COOLDOWN_SUCCESS_SECONDS, COOLDOWN_ERROR_SECONDS, DEFAULT_PROMPT_MAKER, MAX_CONCURRENT_TRYON, PROMPT_BAG_ON_MODEL, PROMPT_BAG_NO_MODEL, PROMPT_FLAT_LAY } from './constants';
import { Loader2, AlertTriangle, Wand2, Clock, StopCircle } from 'lucide-react';

export default function App() {
  const [apiKey, setApiKey] = useState('');
  const [settings, setSettings] = useState<GenerationSettings>({
    resolution: '1K',
    aspectRatio: '3:4',
    promptModel: 'gemini-3-pro-preview',
    imageModel: 'gemini-3-pro-image-preview',
  });
  
  // Input State
  const [modelImages, setModelImages] = useState<FileWithPreview[]>([]);
  const [garmentGroups, setGarmentGroups] = useState<GarmentGroup[]>([
    { id: '1', files: [] } // Start with one empty group
  ]);
  
  // Prompt Modes State
  const [promptsByMode, setPromptsByMode] = useState<Record<PromptMode, string>>({
    'default': DEFAULT_PROMPT_MAKER,
    'flat-lay': PROMPT_FLAT_LAY,
    'bag-on-model': PROMPT_BAG_ON_MODEL,
    'bag-no-model': PROMPT_BAG_NO_MODEL,
    'custom': '',
  });
  const [selectedStudioModes, setSelectedStudioModes] = useState<PromptMode[]>(['default']);

  // Execution State
  const [status, setStatus] = useState<AppStatus>(AppStatus.IDLE);
  const [batchProgress, setBatchProgress] = useState({ current: 0, total: 0 });
  const [results, setResults] = useState<TryOnResult[]>([]);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [cooldown, setCooldown] = useState(0);
  const [shouldAbort, setShouldAbort] = useState(false);
  const shouldAbortRef = useRef(false);

  // Cooldown Timer
  useEffect(() => {
    let interval: number;
    if (cooldown > 0) {
      interval = window.setInterval(() => {
        setCooldown((prev) => prev - 1);
      }, 1000);
    } else if (cooldown === 0 && status === AppStatus.COOLDOWN) {
      setStatus(AppStatus.IDLE);
    }
    return () => clearInterval(interval);
  }, [cooldown, status]);

  const handleGenerate = async () => {
    // Validation
    if (!apiKey) {
      setErrorMessage("Please enter your Google Gemini API Key in the sidebar.");
      return;
    }
    if (modelImages.length === 0) {
      setErrorMessage("Please upload at least one model image.");
      return;
    }
    const validGroups = garmentGroups.filter(g => g.files.length > 0);
    if (validGroups.length === 0) {
      setErrorMessage("Please upload at least one garment.");
      return;
    }
    if (selectedStudioModes.length === 0) {
      setErrorMessage("Please select at least one prompt mode.");
      return;
    }

    // Reset / Init
    setErrorMessage(null);
    setShouldAbort(false);
    shouldAbortRef.current = false;
    setStatus(AppStatus.BATCH_PROCESSING);

    // Calculate total combinations: modes × models × garments
    const totalCombinations = selectedStudioModes.length * modelImages.length * validGroups.length;
    setBatchProgress({ current: 0, total: totalCombinations });
    addLog('info', `[Batch] Starting batch — ${selectedStudioModes.length} mode(s) × ${modelImages.length} model(s) × ${validGroups.length} garment group(s) = ${totalCombinations} combination(s) (max ${MAX_CONCURRENT_TRYON} concurrent)`);

    // Initialize results with 'pending' state for each mode-model-garment combination
    const initialResults: TryOnResult[] = [];
    for (const mode of selectedStudioModes) {
      for (let modelIdx = 0; modelIdx < modelImages.length; modelIdx++) {
        for (const group of validGroups) {
          initialResults.push({
            modelId: `model-${modelIdx}`,
            modelPreview: modelImages[modelIdx].preview,
            modelFileName: modelImages[modelIdx].file.name,
            garmentId: group.id,
            garmentPreview: group.files[0].preview,
            promptMode: mode,
            status: 'pending'
          });
        }
      }
    }
    setResults(initialResults);

    // Build flat list of all combinations
    const combinations: { modelIdx: number; group: GarmentGroup; promptMode: PromptMode }[] = [];
    for (const mode of selectedStudioModes) {
      for (let modelIdx = 0; modelIdx < modelImages.length; modelIdx++) {
        for (const group of validGroups) {
          combinations.push({ modelIdx, group, promptMode: mode });
        }
      }
    }

    let hasGlobalError = false;
    let completedCount = 0;

    // Process a single mode-model-garment combination (analyze → generate, consecutive)
    const processCombination = async ({ modelIdx, group, promptMode }: { modelIdx: number; group: GarmentGroup; promptMode: PromptMode }) => {
      const modelImage = modelImages[modelIdx];
      const modelId = `model-${modelIdx}`;

      if (shouldAbortRef.current) {
        setResults(prev => prev.map(r =>
          (r.modelId === modelId && r.garmentId === group.id && r.promptMode === promptMode)
            ? { ...r, status: 'error', error: 'Aborted by user' }
            : r
        ));
        return;
      }

      addLog('info', `[Batch] Processing — mode: "${promptMode}", model: "${modelImage.file.name}", garment group: ${group.id}`);

      // Update item status to 'analyzing'
      setResults(prev => prev.map(r =>
        (r.modelId === modelId && r.garmentId === group.id && r.promptMode === promptMode)
          ? { ...r, status: 'analyzing' }
          : r
      ));

      try {
        const promptInstructions = promptsByMode[promptMode] || DEFAULT_PROMPT_MAKER;

        // Step 1: Analyze
        const analysisPrompt = await analyzeImages(
          apiKey,
          modelImage.file,
          group.files.map(f => f.file),
          promptInstructions,
          settings.promptModel
        );
        addLog('info', `[Batch] Analysis complete for mode "${promptMode}", model "${modelImage.file.name}" (${analysisPrompt.length} chars)`);

        if (shouldAbortRef.current) {
          setResults(prev => prev.map(r =>
            (r.modelId === modelId && r.garmentId === group.id && r.promptMode === promptMode)
              ? { ...r, status: 'error', error: 'Aborted by user' }
              : r
          ));
          return;
        }

        // Update item status to 'generating'
        setResults(prev => prev.map(r =>
          (r.modelId === modelId && r.garmentId === group.id && r.promptMode === promptMode)
            ? { ...r, status: 'generating' }
            : r
        ));

        // Step 2: Generate
        const resultImage = await generateTryOnImage(
          apiKey,
          analysisPrompt,
          modelImage.file,
          group.files.map(f => f.file),
          settings,
          settings.imageModel
        );
        addLog('info', `[Batch] Image generated for mode "${promptMode}", model "${modelImage.file.name}", garment group ${group.id}`);

        // Update item status to 'success'
        setResults(prev => prev.map(r =>
          (r.modelId === modelId && r.garmentId === group.id && r.promptMode === promptMode)
            ? { ...r, status: 'success', generatedImage: resultImage }
            : r
        ));

      } catch (error: any) {
        console.error(`Error processing mode ${promptMode}, model ${modelImage.file.name} with garment ${group.id}:`, error);
        addLog('error', `[Batch] Failed — mode "${promptMode}", model "${modelImage.file.name}", garment group ${group.id}: ${error.message || 'Unknown error'}`);

        // Update item status to 'error'
        setResults(prev => prev.map(r =>
          (r.modelId === modelId && r.garmentId === group.id && r.promptMode === promptMode)
            ? { ...r, status: 'error', error: error.message || "Unknown error" }
            : r
        ));

        // API Key or auth error — stop all workers
        if (error.message.includes("API Key") || error.message.includes("403")) {
          hasGlobalError = true;
          shouldAbortRef.current = true;
          setErrorMessage("API Authorization failed. stopping batch.");
          addLog('error', '[Batch] API authorization failed — stopping batch');
        }
      } finally {
        completedCount++;
        setBatchProgress({ current: completedCount, total: totalCombinations });
      }
    };

    // Concurrent worker pool: up to MAX_CONCURRENT_TRYON workers run simultaneously.
    // Each worker picks the next available combination until the queue is exhausted.
    // Within each combination, analyze → generate remain consecutive.
    let queueIndex = 0;
    const worker = async () => {
      while (!shouldAbortRef.current) {
        // JS is single-threaded: incrementing queueIndex here is safe across concurrent async tasks
        const idx = queueIndex++;
        if (idx >= combinations.length) break;
        await processCombination(combinations[idx]);
      }
    };

    const workerCount = Math.min(MAX_CONCURRENT_TRYON, combinations.length);
    await Promise.all(Array.from({ length: workerCount }, worker));

    // Mark any items still pending/in-progress as aborted
    if (shouldAbortRef.current) {
      setResults(prev => prev.map(r =>
        r.status === 'pending' || r.status === 'analyzing' || r.status === 'generating'
          ? { ...r, status: 'error', error: 'Aborted by user' }
          : r
      ));
      if (!hasGlobalError) {
        setErrorMessage("Batch processing aborted by user.");
        addLog('warn', '[Batch] Aborted by user');
      }
    }

    // Finished Batch
    setStatus(AppStatus.COOLDOWN);
    if (hasGlobalError || shouldAbortRef.current) {
      setCooldown(COOLDOWN_ERROR_SECONDS);
      addLog('warn', `[Batch] Finished with errors — cooldown ${COOLDOWN_ERROR_SECONDS}s`);
    } else {
      setCooldown(COOLDOWN_SUCCESS_SECONDS);
      addLog('info', `[Batch] All ${totalCombinations} item(s) processed successfully — cooldown ${COOLDOWN_SUCCESS_SECONDS}s`);
    }
  };

  const handleAbort = () => {
    setShouldAbort(true);
    shouldAbortRef.current = true;
  };

  const isProcessing = status === AppStatus.BATCH_PROCESSING;
  const isCooldown = cooldown > 0;

  return (
    <div className="flex h-screen bg-slate-900 text-slate-100 font-sans overflow-hidden">
      <Sidebar 
        apiKey={apiKey} 
        setApiKey={setApiKey} 
        settings={settings} 
        setSettings={setSettings}
        isProcessing={isProcessing}
        onPromptsByModeChange={setPromptsByMode}
      />

      <main className="flex-1 p-8 overflow-y-auto">
        <div className="max-w-5xl mx-auto space-y-8 pb-12">
          
          {/* Header */}
          <div>
            <h2 className="text-3xl font-bold text-white mb-2">Studio Interface</h2>
            <p className="text-slate-400">Upload your assets to start the virtual try-on batch process.</p>
          </div>

          {/* Error Banner */}
          {errorMessage && (
            <div className="bg-red-500/10 border border-red-500/50 rounded-lg p-4 flex items-center gap-3 text-red-400 animate-in slide-in-from-top-2">
              <AlertTriangle className="w-5 h-5 shrink-0" />
              <p>{errorMessage}</p>
            </div>
          )}

          {/* Main Layout */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            
            {/* Left Column: Inputs (4 cols) */}
            <div className="lg:col-span-4 space-y-6">
              
              {/* Model Upload */}
              <div className="bg-slate-800/50 rounded-2xl p-6 border border-slate-700/50 backdrop-blur-sm">
                <UploadZone
                  label="Model Images (Reference)"
                  multiple={true}
                  files={modelImages}
                  onFilesChange={setModelImages} 
                  disabled={isProcessing || isCooldown}
                />
              </div>

              {/* Garment Queue */}
              <div className="bg-slate-800/50 rounded-2xl p-6 border border-slate-700/50 backdrop-blur-sm">
                 <GarmentList 
                   groups={garmentGroups}
                   onGroupsChange={setGarmentGroups}
                   disabled={isProcessing || isCooldown}
                 />
              </div>

              {/* Prompt Mode Selection */}
              <div className="bg-slate-800/50 rounded-2xl p-6 border border-slate-700/50 backdrop-blur-sm">
                <PromptModeSelector
                  selectedModes={selectedStudioModes}
                  onSelectionChange={setSelectedStudioModes}
                  disabled={isProcessing || isCooldown}
                />
              </div>

              {/* Action Button */}
              <div className="pt-2 sticky bottom-4 z-10">
                {isCooldown ? (
                  <div className="bg-slate-800/90 backdrop-blur rounded-xl p-4 border border-slate-700 flex items-center justify-between shadow-xl">
                    <div className="flex items-center gap-3">
                      <Clock className="w-5 h-5 text-indigo-400 animate-pulse" />
                      <div>
                        <p className="font-medium text-slate-200">Cooling Down</p>
                        <p className="text-xs text-slate-400">Quota protection...</p>
                      </div>
                    </div>
                    <div className="text-2xl font-mono font-bold text-indigo-400">
                      {Math.floor(cooldown / 60)}:{(cooldown % 60).toString().padStart(2, '0')}
                    </div>
                  </div>
                ) : isProcessing ? (
                  <div className="space-y-3">
                    <button
                      onClick={handleGenerate}
                      disabled={true}
                      className="w-full py-4 rounded-xl font-bold text-lg flex items-center justify-center gap-3 transition-all shadow-xl bg-indigo-500/50 cursor-not-allowed text-indigo-200"
                    >
                      <Loader2 className="w-6 h-6 animate-spin" />
                      Processing {batchProgress.current}/{batchProgress.total}
                    </button>
                    <button
                      onClick={handleAbort}
                      disabled={shouldAbort}
                      className={`w-full py-3 rounded-xl font-bold text-base flex items-center justify-center gap-3 transition-all shadow-xl ${
                        shouldAbort 
                          ? 'bg-slate-700 cursor-not-allowed text-slate-500'
                          : 'bg-red-600 hover:bg-red-500 hover:scale-[1.02] active:scale-[0.98]'
                      }`}
                    >
                      <StopCircle className="w-5 h-5" />
                      {shouldAbort ? 'Aborting...' : 'Abort All Processes'}
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={handleGenerate}
                    disabled={!apiKey}
                    className={`w-full py-4 rounded-xl font-bold text-lg flex items-center justify-center gap-3 transition-all shadow-xl ${
                      !apiKey 
                        ? 'bg-slate-700 cursor-not-allowed text-slate-500'
                        : 'bg-indigo-600 hover:bg-indigo-500 hover:scale-[1.02] active:scale-[0.98]'
                    }`}
                  >
                    <Wand2 className="w-6 h-6" />
                    Start Batch
                  </button>
                )}
              </div>
            </div>

            {/* Right Column: Results Gallery (8 cols) */}
            <div className="lg:col-span-8 space-y-6">
                <div className="flex items-center justify-between">
                    <h3 className="text-xl font-bold text-white">Results Gallery</h3>
                    {results.length > 0 && <span className="text-sm text-slate-400">{results.filter(r => r.status === 'success').length} Completed</span>}
                </div>
                
                <ResultsGallery results={results} />
            </div>

          </div>
        </div>
      </main>
      <DebugConsole />
    </div>
  );
}