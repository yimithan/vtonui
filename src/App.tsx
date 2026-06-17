import React, { useState, useEffect, useRef, useMemo } from 'react';
import Sidebar from './components/Sidebar';
import CombinationsPreview from './components/CombinationsPreview';
import PoseSidebar from './components/PoseSidebar';
import FacialSidebar from './components/FacialSidebar';
import FacialV2Sidebar from './components/FacialV2Sidebar';
import UploadZone from './components/UploadZone';
import GarmentList from './components/GarmentList';
import ResultsGallery from './components/ResultsGallery';
import DebugConsole from './components/DebugConsole';
import PromptModeSelector from './components/PromptModeSelector';
import { FileWithPreview, GenerationSettings, AppStatus, GarmentGroup, TryOnResult, PromptMode, AIProvider, PlannedCombo } from './types';
import { getService } from './services/aiService';
import { enhanceFaceComposite } from './services/faceComposite';
import { addLog, newProcessId, logProcess } from './services/debugLogger';
import {
  DEFAULT_PROMPT_MAKER,
  MAX_CONCURRENT_TRYON,
  PROMPT_BAG_ON_MODEL,
  PROMPT_BAG_NO_MODEL,
  PROMPT_FLAT_LAY,
  DEFAULT_POSE_PROMPT_TEMPLATE,
  DEFAULT_FACIAL_ENHANCEMENT_PROMPT,
  DEFAULT_FACIAL_V2_PROMPT,
  FACIAL_V2_PROMPT_MAKER,
  POSE_VARIATIONS_SET_1,
  POSE_VARIATIONS_SET_2
} from './constants';
import { Loader2, AlertTriangle, Wand2, StopCircle, Key, ArrowLeft, Sparkles, Shirt, UserRoundCog, ScanFace } from 'lucide-react';

type AppFunction = 'ai-clothing' | 'pose-generator' | 'facial-enhancement' | 'facial-enhancement-v2';

// Pristine default templates per mode — used to prove in the debug console
// whether the prompt actually sent was the stock template or an edited one.
const defaultPromptByMode: Record<PromptMode, string> = {
  'default': DEFAULT_PROMPT_MAKER,
  'flat-lay': PROMPT_FLAT_LAY,
  'bag-on-model': PROMPT_BAG_ON_MODEL,
  'bag-no-model': PROMPT_BAG_NO_MODEL,
  'custom': '',
};

// Flat-lay produces a single combination per garment (the model image is an
// ignored reference), so it does not multiply by the model image count like the
// other modes — avoiding the wasteful model×garment cartesian product.
const comboKeyOf = (mode: PromptMode, modelIdx: number, groupId: string, flatLay: boolean) =>
  `${mode}__${flatLay ? 'flat' : modelIdx}__${groupId}`;

function buildCombinations(
  modes: PromptMode[],
  modelImages: FileWithPreview[],
  validGroups: GarmentGroup[],
): PlannedCombo[] {
  const combos: PlannedCombo[] = [];
  for (const mode of modes) {
    const flatLay = mode === 'flat-lay';
    if (flatLay) {
      for (const group of validGroups) {
        combos.push({ key: comboKeyOf(mode, 0, group.id, true), promptMode: mode, modelIdx: 0, group, flatLay: true });
      }
    } else {
      for (let modelIdx = 0; modelIdx < modelImages.length; modelIdx++) {
        for (const group of validGroups) {
          combos.push({ key: comboKeyOf(mode, modelIdx, group.id, false), promptMode: mode, modelIdx, group, flatLay: false });
        }
      }
    }
  }
  return combos;
}

export default function App() {
  // Pipeline selection (two interchangeable interfaces over the same UI/prompts).
  const [provider, setProvider] = useState<AIProvider>('gemini');
  // Keep a key per provider so switching pipelines doesn't force a re-paste.
  const [geminiKey, setGeminiKey] = useState('');
  const [falKey, setFalKey] = useState('');
  const apiKey = provider === 'fal' ? falKey : geminiKey;
  const setActiveKey = provider === 'fal' ? setFalKey : setGeminiKey;

  const [activeFunction, setActiveFunction] = useState<AppFunction | null>(null);
  const [settings, setSettings] = useState<GenerationSettings>({
    resolution: '1K',
    aspectRatio: '3:4',
    promptModel: 'gemini-3-pro-preview',
    imageModel: 'gemini-3-pro-image-preview',
  });

  // AI Clothing State
  const [modelImages, setModelImages] = useState<FileWithPreview[]>([]);
  const [garmentGroups, setGarmentGroups] = useState<GarmentGroup[]>([
    { id: '1', files: [] }
  ]);
  const [promptsByMode, setPromptsByMode] = useState<Record<PromptMode, string>>({
    'default': DEFAULT_PROMPT_MAKER,
    'flat-lay': PROMPT_FLAT_LAY,
    'bag-on-model': PROMPT_BAG_ON_MODEL,
    'bag-no-model': PROMPT_BAG_NO_MODEL,
    'custom': '',
  });
  const [selectedStudioModes, setSelectedStudioModes] = useState<PromptMode[]>(['default']);
  const [status, setStatus] = useState<AppStatus>(AppStatus.IDLE);
  const [batchProgress, setBatchProgress] = useState({ current: 0, total: 0 });
  const [results, setResults] = useState<TryOnResult[]>([]);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [shouldAbort, setShouldAbort] = useState(false);
  const shouldAbortRef = useRef(false);

  // Pose Generator State
  const [poseModelImages, setPoseModelImages] = useState<FileWithPreview[]>([]);
  const [poseResults, setPoseResults] = useState<TryOnResult[]>([]);
  const [posePromptTemplate, setPosePromptTemplate] = useState(DEFAULT_POSE_PROMPT_TEMPLATE);
  const [poseVariations, setPoseVariations] = useState<string[]>(POSE_VARIATIONS_SET_1);
  const [poseVariationSet, setPoseVariationSet] = useState<1 | 2>(1);
  const [poseStatus, setPoseStatus] = useState<AppStatus>(AppStatus.IDLE);
  const [poseBatchProgress, setPoseBatchProgress] = useState({ current: 0, total: 0 });
  const [poseErrorMessage, setPoseErrorMessage] = useState<string | null>(null);
  const [shouldAbortPose, setShouldAbortPose] = useState(false);
  const shouldAbortPoseRef = useRef(false);

  // Facial Enhancement State
  const [facialModelImages, setFacialModelImages] = useState<FileWithPreview[]>([]);
  const [facialFaceImage, setFacialFaceImage] = useState<FileWithPreview[]>([]);
  const [facialPrompt, setFacialPrompt] = useState(DEFAULT_FACIAL_ENHANCEMENT_PROMPT);
  const [facialResults, setFacialResults] = useState<TryOnResult[]>([]);
  const [facialStatus, setFacialStatus] = useState<AppStatus>(AppStatus.IDLE);
  const [facialBatchProgress, setFacialBatchProgress] = useState({ current: 0, total: 0 });
  const [facialErrorMessage, setFacialErrorMessage] = useState<string | null>(null);
  const [shouldAbortFacial, setShouldAbortFacial] = useState(false);
  const shouldAbortFacialRef = useRef(false);

  // Facial Enhancement v2 (Beta) State — independent of v1.
  const [facialV2ModelImages, setFacialV2ModelImages] = useState<FileWithPreview[]>([]);
  const [facialV2RefImages, setFacialV2RefImages] = useState<FileWithPreview[]>([]);
  const [facialV2Prompt, setFacialV2Prompt] = useState(DEFAULT_FACIAL_V2_PROMPT);
  const [facialV2UseAiPrompt, setFacialV2UseAiPrompt] = useState(false);
  const [facialV2UseComposite, setFacialV2UseComposite] = useState(false);
  const [facialV2Results, setFacialV2Results] = useState<TryOnResult[]>([]);
  const [facialV2Status, setFacialV2Status] = useState<AppStatus>(AppStatus.IDLE);
  const [facialV2BatchProgress, setFacialV2BatchProgress] = useState({ current: 0, total: 0 });
  const [facialV2ErrorMessage, setFacialV2ErrorMessage] = useState<string | null>(null);
  const [shouldAbortFacialV2, setShouldAbortFacialV2] = useState(false);
  const shouldAbortFacialV2Ref = useRef(false);

  // Reactive plan of what will be generated — drives the combinations preview
  // shown before any request is sent. Extra per-combination prompt text is keyed
  // by the same stable combo key and appended to that combination's prompt.
  const validGroups = useMemo(() => garmentGroups.filter(g => g.files.length > 0), [garmentGroups]);
  const plannedCombos = useMemo(
    () => buildCombinations(selectedStudioModes, modelImages, validGroups),
    [selectedStudioModes, modelImages, validGroups]
  );
  const [extraPromptByCombo, setExtraPromptByCombo] = useState<Record<string, string>>({});

  const handleGenerate = async () => {
    if (!apiKey) {
      setErrorMessage(`Please enter your ${provider === 'fal' ? 'fal' : 'Google Gemini'} API Key in the top bar.`);
      return;
    }
    if (modelImages.length === 0) {
      setErrorMessage("Please upload at least one model image.");
      return;
    }
    if (validGroups.length === 0) {
      setErrorMessage("Please upload at least one garment.");
      return;
    }
    if (selectedStudioModes.length === 0) {
      setErrorMessage("Please select at least one prompt mode.");
      return;
    }

    setErrorMessage(null);
    setShouldAbort(false);
    shouldAbortRef.current = false;
    setStatus(AppStatus.BATCH_PROCESSING);

    const svc = getService(provider);

    const combos = plannedCombos;
    const totalCombinations = combos.length;
    setBatchProgress({ current: 0, total: totalCombinations });
    const flatLayCount = combos.filter(c => c.flatLay).length;
    addLog('info', `[Batch] Starting AI Clothing batch via ${provider.toUpperCase()} — ${totalCombinations} combination(s)${flatLayCount ? ` (incl. ${flatLayCount} flat-lay: one per garment, model count ignored)` : ''}`);

    const initialResults: TryOnResult[] = combos.map(c => ({
      modelId: `model-${c.modelIdx}`,
      modelPreview: modelImages[c.modelIdx].preview,
      modelFileName: modelImages[c.modelIdx].file.name,
      garmentId: c.group.id,
      garmentPreview: c.group.files[0].preview,
      promptMode: c.promptMode,
      hideModel: c.flatLay,
      status: 'pending',
    }));
    setResults(initialResults);

    let hasGlobalError = false;
    let completedCount = 0;

    const processCombination = async ({ modelIdx, group, promptMode, key, flatLay }: PlannedCombo) => {
      const modelImage = modelImages[modelIdx];
      const modelId = `model-${modelIdx}`;
      const processId = newProcessId();
      const baseInstructions = promptsByMode[promptMode] || DEFAULT_PROMPT_MAKER;
      // Per-garment-image view labels (front/side/rear/detail) → a numbered guide
      // appended to the prompt-maker instructions so the model knows what each
      // positional garment image is and uses every view.
      const anyDesc = group.files.some(f => f.description?.trim());
      const guide = anyDesc
        ? `\n\n## GARMENT IMAGE GUIDE\nThe garment images follow the model image in this order. Use ALL of them; treat multiple views/angles of the same garment as one garment and synthesize them:\n` +
          group.files.map((f, i) => `  - Garment image ${i + 1}: ${f.description?.trim() || '(no description provided)'}`).join('\n')
        : '';
      const extra = (extraPromptByCombo[key] || '').trim();
      let promptInstructions = baseInstructions + guide;
      if (extra) {
        promptInstructions += `\n\n## ADDITIONAL PER-COMBINATION INSTRUCTIONS (append; do not override the rules above)\n${extra}`;
      }
      const isCustomized = baseInstructions !== (defaultPromptByMode[promptMode] ?? '');
      logProcess(
        processId,
        'proof',
        `PROCESS START — mode="${promptMode}"${isCustomized ? ' (EDITED from default)' : ' (default template)'}${anyDesc ? ' +garment-labels' : ''}${extra ? ' +extra-text' : ''}${flatLay ? ' [flat-lay: model ignored]' : ''} · model="${modelImage.file.name}" · garmentGroup=${group.id} · garments=${group.files.length} [${group.files.map(f => f.file.name).join(', ')}]`,
        `Pipeline: ${provider.toUpperCase()}\nPrompt mode: ${promptMode}\nModel image: ${modelImage.file.name}${flatLay ? ' (ignored reference for flat-lay)' : ''}\nGarment group: ${group.id}\nGarment files (${group.files.length}):\n${group.files.map((f, i) => `  ${i + 1}. ${f.file.name}${f.description?.trim() ? ` — ${f.description.trim()}` : ''}`).join('\n')}\nExtra per-combination text: ${extra || '(none)'}\nText model: ${settings.promptModel}\nImage model: ${settings.imageModel}\nResolution/Aspect: ${settings.resolution}/${settings.aspectRatio}`,
      );

      if (shouldAbortRef.current) {
        setResults(prev => prev.map(r =>
          (r.modelId === modelId && r.garmentId === group.id && r.promptMode === promptMode)
            ? { ...r, status: 'error', error: 'Aborted by user' }
            : r
        ));
        return;
      }

      setResults(prev => prev.map(r =>
        (r.modelId === modelId && r.garmentId === group.id && r.promptMode === promptMode)
          ? { ...r, status: 'analyzing' }
          : r
      ));

      try {
        const analysisPrompt = await svc.analyzeImages(
          apiKey,
          modelImage.file,
          group.files.map(f => f.file),
          promptInstructions,
          settings.promptModel,
          processId
        );

        if (shouldAbortRef.current) {
          setResults(prev => prev.map(r =>
            (r.modelId === modelId && r.garmentId === group.id && r.promptMode === promptMode)
              ? { ...r, status: 'error', error: 'Aborted by user' }
              : r
          ));
          return;
        }

        setResults(prev => prev.map(r =>
          (r.modelId === modelId && r.garmentId === group.id && r.promptMode === promptMode)
            ? { ...r, status: 'generating', generatedPrompt: analysisPrompt }
            : r
        ));

        const resultImage = await svc.generateTryOnImage(
          apiKey,
          analysisPrompt,
          modelImage.file,
          group.files.map(f => f.file),
          settings,
          settings.imageModel,
          processId
        );

        logProcess(processId, 'info', `PROCESS DONE — mode="${promptMode}", model="${modelImage.file.name}", garmentGroup=${group.id} ✓`);
        setResults(prev => prev.map(r =>
          (r.modelId === modelId && r.garmentId === group.id && r.promptMode === promptMode)
            ? { ...r, status: 'success', generatedImage: resultImage }
            : r
        ));
      } catch (error: any) {
        logProcess(processId, 'error', `PROCESS FAILED — mode "${promptMode}", model "${modelImage.file.name}", garment group ${group.id}: ${error.message || 'Unknown error'}`);
        setResults(prev => prev.map(r =>
          (r.modelId === modelId && r.garmentId === group.id && r.promptMode === promptMode)
            ? { ...r, status: 'error', error: error.message || "Unknown error" }
            : r
        ));

        if (error.message.includes("API Key") || error.message.includes("403")) {
          hasGlobalError = true;
          shouldAbortRef.current = true;
          setErrorMessage("API Authorization failed. Stopping batch.");
        }
      } finally {
        completedCount++;
        setBatchProgress({ current: completedCount, total: totalCombinations });
      }
    };

    let queueIndex = 0;
    const worker = async () => {
      while (!shouldAbortRef.current) {
        const idx = queueIndex++;
        if (idx >= combos.length) break;
        await processCombination(combos[idx]);
      }
    };

    const workerCount = Math.min(MAX_CONCURRENT_TRYON, combos.length);
    await Promise.all(Array.from({ length: workerCount }, worker));

    if (shouldAbortRef.current) {
      setResults(prev => prev.map(r =>
        r.status === 'pending' || r.status === 'analyzing' || r.status === 'generating'
          ? { ...r, status: 'error', error: 'Aborted by user' }
          : r
      ));
      if (!hasGlobalError) {
        setErrorMessage("Batch processing aborted by user.");
      }
    }

    setStatus(AppStatus.IDLE);
  };

  const handleGeneratePose = async () => {
    if (!apiKey) {
      setPoseErrorMessage(`Please enter your ${provider === 'fal' ? 'fal' : 'Google Gemini'} API Key in the top bar.`);
      return;
    }
    if (poseModelImages.length === 0) {
      setPoseErrorMessage("Please upload at least one model image.");
      return;
    }

    setPoseErrorMessage(null);
    setShouldAbortPose(false);
    shouldAbortPoseRef.current = false;
    setPoseStatus(AppStatus.BATCH_PROCESSING);

    const svc = getService(provider);

    const combinations: { modelIdx: number; poseIdx: number; pose: string }[] = [];
    for (let modelIdx = 0; modelIdx < poseModelImages.length; modelIdx++) {
      for (let poseIdx = 0; poseIdx < poseVariations.length; poseIdx++) {
        combinations.push({ modelIdx, poseIdx, pose: poseVariations[poseIdx] });
      }
    }

    const totalCombinations = combinations.length;
    setPoseBatchProgress({ current: 0, total: totalCombinations });

    const initialResults: TryOnResult[] = combinations.map(({ modelIdx, poseIdx, pose }) => ({
      modelId: `pose-model-${modelIdx}`,
      modelPreview: poseModelImages[modelIdx].preview,
      modelFileName: poseModelImages[modelIdx].file.name,
      garmentId: `pose-${poseIdx}`,
      promptMode: 'default',
      variantLabel: `Pose ${poseIdx + 1}: ${pose}`,
      status: 'pending',
    }));
    setPoseResults(initialResults);

    let hasGlobalError = false;
    let completedCount = 0;

    const processCombination = async ({ modelIdx, poseIdx, pose }: { modelIdx: number; poseIdx: number; pose: string }) => {
      const modelImage = poseModelImages[modelIdx];
      const modelId = `pose-model-${modelIdx}`;
      const garmentId = `pose-${poseIdx}`;
      const processId = newProcessId();
      const prompt = posePromptTemplate.replace('[INSERT TARGET POSE HERE]', pose);
      const templateEdited = posePromptTemplate !== DEFAULT_POSE_PROMPT_TEMPLATE;
      logProcess(
        processId,
        'proof',
        `POSE PROCESS START — model="${modelImage.file.name}" · pose ${poseIdx + 1}/${poseVariations.length} (set ${poseVariationSet})${templateEdited ? ' · template EDITED' : ' · default template'} · garments=0 (pose mode uses none)`,
        `Pose: ${pose}\nImage model: ${settings.imageModel}\nResolution/Aspect: ${settings.resolution}/${settings.aspectRatio}`,
      );

      if (shouldAbortPoseRef.current) {
        setPoseResults(prev => prev.map(r =>
          (r.modelId === modelId && r.garmentId === garmentId)
            ? { ...r, status: 'error', error: 'Aborted by user' }
            : r
        ));
        return;
      }

      setPoseResults(prev => prev.map(r =>
        (r.modelId === modelId && r.garmentId === garmentId)
          ? { ...r, status: 'generating' }
          : r
      ));

      try {
        const resultImage = await svc.generateTryOnImage(
          apiKey,
          prompt,
          modelImage.file,
          [],
          settings,
          settings.imageModel,
          processId
        );

        logProcess(processId, 'info', `POSE PROCESS DONE — model="${modelImage.file.name}", pose ${poseIdx + 1} ✓`);
        setPoseResults(prev => prev.map(r =>
          (r.modelId === modelId && r.garmentId === garmentId)
            ? { ...r, status: 'success', generatedImage: resultImage }
            : r
        ));
      } catch (error: any) {
        logProcess(processId, 'error', `POSE PROCESS FAILED — model "${modelImage.file.name}", pose ${poseIdx + 1}: ${error.message || 'Unknown error'}`);
        setPoseResults(prev => prev.map(r =>
          (r.modelId === modelId && r.garmentId === garmentId)
            ? { ...r, status: 'error', error: error.message || "Unknown error" }
            : r
        ));

        if (error.message.includes("API Key") || error.message.includes("403")) {
          hasGlobalError = true;
          shouldAbortPoseRef.current = true;
          setPoseErrorMessage("API Authorization failed. Stopping batch.");
        }
      } finally {
        completedCount++;
        setPoseBatchProgress({ current: completedCount, total: totalCombinations });
      }
    };

    let queueIndex = 0;
    const worker = async () => {
      while (!shouldAbortPoseRef.current) {
        const idx = queueIndex++;
        if (idx >= combinations.length) break;
        await processCombination(combinations[idx]);
      }
    };

    const workerCount = Math.min(MAX_CONCURRENT_TRYON, combinations.length);
    await Promise.all(Array.from({ length: workerCount }, worker));

    if (shouldAbortPoseRef.current) {
      setPoseResults(prev => prev.map(r =>
        r.status === 'pending' || r.status === 'analyzing' || r.status === 'generating'
          ? { ...r, status: 'error', error: 'Aborted by user' }
          : r
      ));
      if (!hasGlobalError) {
        setPoseErrorMessage("Batch processing aborted by user.");
      }
    }

    setPoseStatus(AppStatus.IDLE);
  };

  const handleFacialEnhancementSubmit = async () => {
    if (!apiKey) {
      setFacialErrorMessage(`Please enter your ${provider === 'fal' ? 'fal' : 'Google Gemini'} API Key in the top bar.`);
      return;
    }
    if (facialModelImages.length === 0) {
      setFacialErrorMessage("Please upload at least one target model image.");
      return;
    }
    if (facialFaceImage.length !== 1) {
      setFacialErrorMessage("Please upload exactly one reference face image.");
      return;
    }

    setFacialErrorMessage(null);
    setShouldAbortFacial(false);
    shouldAbortFacialRef.current = false;
    setFacialStatus(AppStatus.BATCH_PROCESSING);

    const svc = getService(provider);

    const totalCombinations = facialModelImages.length;
    setFacialBatchProgress({ current: 0, total: totalCombinations });

    const initialResults: TryOnResult[] = facialModelImages.map((item, idx) => ({
      modelId: `facial-model-${idx}`,
      modelPreview: item.preview,
      modelFileName: item.file.name,
      garmentId: 'reference-face',
      garmentPreview: facialFaceImage[0].preview,
      promptMode: 'default',
      status: 'pending',
    }));
    setFacialResults(initialResults);

    let hasGlobalError = false;
    let completedCount = 0;

    const processModel = async (modelIdx: number) => {
      const modelImage = facialModelImages[modelIdx];
      const modelId = `facial-model-${modelIdx}`;
      const processId = newProcessId();
      const promptEdited = facialPrompt !== DEFAULT_FACIAL_ENHANCEMENT_PROMPT;
      logProcess(
        processId,
        'proof',
        `FACIAL PROCESS START — target="${modelImage.file.name}" · faceRef="${facialFaceImage[0].file.name}"${promptEdited ? ' · prompt EDITED' : ' · default prompt'}`,
        `Image model: gemini-3-pro-image-preview (forced for facial)\nResolution/Aspect: ${settings.resolution}/${settings.aspectRatio}`,
      );

      if (shouldAbortFacialRef.current) {
        setFacialResults(prev => prev.map(r =>
          r.modelId === modelId ? { ...r, status: 'error', error: 'Aborted by user' } : r
        ));
        return;
      }

      setFacialResults(prev => prev.map(r =>
        r.modelId === modelId ? { ...r, status: 'generating' } : r
      ));

      try {
        const resultImage = await svc.generateFacialEnhancement(
          apiKey,
          modelImage.file,
          [facialFaceImage[0].file],
          facialPrompt,
          settings,
          'gemini-3-pro-image-preview',
          processId
        );

        logProcess(processId, 'info', `FACIAL PROCESS DONE — target="${modelImage.file.name}" ✓`);
        setFacialResults(prev => prev.map(r =>
          r.modelId === modelId ? { ...r, status: 'success', generatedImage: resultImage } : r
        ));
      } catch (error: any) {
        logProcess(processId, 'error', `FACIAL PROCESS FAILED — model "${modelImage.file.name}": ${error.message || 'Unknown error'}`);
        setFacialResults(prev => prev.map(r =>
          r.modelId === modelId ? { ...r, status: 'error', error: error.message || "Unknown error" } : r
        ));

        if (error.message.includes("API Key") || error.message.includes("403")) {
          hasGlobalError = true;
          shouldAbortFacialRef.current = true;
          setFacialErrorMessage("API Authorization failed. Stopping batch.");
        }
      } finally {
        completedCount++;
        setFacialBatchProgress({ current: completedCount, total: totalCombinations });
      }
    };

    let queueIndex = 0;
    const worker = async () => {
      while (!shouldAbortFacialRef.current) {
        const idx = queueIndex++;
        if (idx >= facialModelImages.length) break;
        await processModel(idx);
      }
    };

    const workerCount = Math.min(MAX_CONCURRENT_TRYON, facialModelImages.length);
    await Promise.all(Array.from({ length: workerCount }, worker));

    if (shouldAbortFacialRef.current) {
      setFacialResults(prev => prev.map(r =>
        r.status === 'pending' || r.status === 'analyzing' || r.status === 'generating'
          ? { ...r, status: 'error', error: 'Aborted by user' }
          : r
      ));
      if (!hasGlobalError) {
        setFacialErrorMessage("Batch processing aborted by user.");
      }
    }

    setFacialStatus(AppStatus.IDLE);
  };

  const handleFacialV2Submit = async () => {
    if (!apiKey) {
      setFacialV2ErrorMessage(`Please enter your ${provider === 'fal' ? 'fal' : 'Google Gemini'} API Key in the top bar.`);
      return;
    }
    if (facialV2ModelImages.length === 0) {
      setFacialV2ErrorMessage("Please upload at least one target model image.");
      return;
    }
    if (facialV2RefImages.length < 1) {
      setFacialV2ErrorMessage("Please upload at least one reference face image.");
      return;
    }

    setFacialV2ErrorMessage(null);
    setShouldAbortFacialV2(false);
    shouldAbortFacialV2Ref.current = false;
    setFacialV2Status(AppStatus.BATCH_PROCESSING);

    const svc = getService(provider);
    const refFiles = facialV2RefImages.map(f => f.file);
    const totalCombinations = facialV2ModelImages.length;
    setFacialV2BatchProgress({ current: 0, total: totalCombinations });
    addLog('info', `[Batch] Starting Facial Enhancement v2 via ${provider.toUpperCase()} — ${totalCombinations} target(s), ${refFiles.length} reference(s), ${facialV2UseAiPrompt ? 'AI-tailored prompt' : 'static prompt'}, ${facialV2UseComposite ? 'crop & composite' : 'whole-image'}`);

    const initialResults: TryOnResult[] = facialV2ModelImages.map((item, idx) => ({
      modelId: `facial-v2-model-${idx}`,
      modelPreview: item.preview,
      modelFileName: item.file.name,
      garmentId: 'reference-face',
      garmentPreview: facialV2RefImages[0].preview,
      promptMode: 'default',
      status: 'pending',
    }));
    setFacialV2Results(initialResults);

    let hasGlobalError = false;
    let completedCount = 0;

    const processModel = async (modelIdx: number) => {
      const modelImage = facialV2ModelImages[modelIdx];
      const modelId = `facial-v2-model-${modelIdx}`;
      const processId = newProcessId();
      const promptEdited = facialV2Prompt !== DEFAULT_FACIAL_V2_PROMPT;
      logProcess(
        processId,
        'proof',
        `FACIAL v2 START — target="${modelImage.file.name}" · refs=${refFiles.length} · ${facialV2UseAiPrompt ? 'AI-tailored prompt' : (promptEdited ? 'static prompt EDITED' : 'static default prompt')}${facialV2UseComposite ? ' · crop&composite' : ' · whole-image'}`,
        `Image model: gemini-3-pro-image-preview\nReferences (${refFiles.length}): ${facialV2RefImages.map(f => f.file.name).join(', ')}\nResolution/Aspect: ${settings.resolution}/${settings.aspectRatio}`,
      );

      if (shouldAbortFacialV2Ref.current) {
        setFacialV2Results(prev => prev.map(r => r.modelId === modelId ? { ...r, status: 'error', error: 'Aborted by user' } : r));
        return;
      }

      try {
        // Stage 1 (optional): AI-tailored per-image prompt.
        let effectivePrompt = facialV2Prompt;
        if (facialV2UseAiPrompt) {
          setFacialV2Results(prev => prev.map(r => r.modelId === modelId ? { ...r, status: 'analyzing' } : r));
          try {
            effectivePrompt = await svc.analyzeImages(apiKey, modelImage.file, refFiles, FACIAL_V2_PROMPT_MAKER, settings.promptModel, processId);
          } catch (e: any) {
            logProcess(processId, 'warn', `FACIAL v2 — AI-tailored prompt failed (${e?.message ?? e}); using static prompt.`);
            effectivePrompt = facialV2Prompt;
          }
        }

        if (shouldAbortFacialV2Ref.current) {
          setFacialV2Results(prev => prev.map(r => r.modelId === modelId ? { ...r, status: 'error', error: 'Aborted by user' } : r));
          return;
        }

        setFacialV2Results(prev => prev.map(r => r.modelId === modelId ? { ...r, status: 'generating', generatedPrompt: effectivePrompt } : r));

        // Stage 2: enhance — crop & composite, or whole-image.
        const wholeImage = () => svc.generateFacialEnhancement(apiKey, modelImage.file, refFiles, effectivePrompt, settings, 'gemini-3-pro-image-preview', processId);

        let resultImage: string;
        let variantLabel: string | undefined;
        if (facialV2UseComposite) {
          const composited = await enhanceFaceComposite(
            modelImage.preview,
            (cropFile) => svc.generateFacialEnhancement(apiKey, cropFile, refFiles, effectivePrompt, settings, 'gemini-3-pro-image-preview', processId),
            modelImage.file.name,
          );
          if (composited) {
            resultImage = composited;
            variantLabel = 'crop & composite';
          } else {
            resultImage = await wholeImage();
            variantLabel = 'whole-image (no face detected)';
          }
        } else {
          resultImage = await wholeImage();
        }

        logProcess(processId, 'info', `FACIAL v2 DONE — target="${modelImage.file.name}" ✓`);
        setFacialV2Results(prev => prev.map(r => r.modelId === modelId ? { ...r, status: 'success', generatedImage: resultImage, variantLabel } : r));
      } catch (error: any) {
        logProcess(processId, 'error', `FACIAL v2 FAILED — model "${modelImage.file.name}": ${error.message || 'Unknown error'}`);
        setFacialV2Results(prev => prev.map(r => r.modelId === modelId ? { ...r, status: 'error', error: error.message || "Unknown error" } : r));
        if (error.message?.includes("API Key") || error.message?.includes("403")) {
          hasGlobalError = true;
          shouldAbortFacialV2Ref.current = true;
          setFacialV2ErrorMessage("API Authorization failed. Stopping batch.");
        }
      } finally {
        completedCount++;
        setFacialV2BatchProgress({ current: completedCount, total: totalCombinations });
      }
    };

    let queueIndex = 0;
    const worker = async () => {
      while (!shouldAbortFacialV2Ref.current) {
        const idx = queueIndex++;
        if (idx >= facialV2ModelImages.length) break;
        await processModel(idx);
      }
    };

    const workerCount = Math.min(MAX_CONCURRENT_TRYON, facialV2ModelImages.length);
    await Promise.all(Array.from({ length: workerCount }, worker));

    if (shouldAbortFacialV2Ref.current) {
      setFacialV2Results(prev => prev.map(r =>
        (r.status === 'pending' || r.status === 'analyzing' || r.status === 'generating')
          ? { ...r, status: 'error', error: 'Aborted by user' }
          : r
      ));
      if (!hasGlobalError) setFacialV2ErrorMessage("Batch processing aborted by user.");
    }

    setFacialV2Status(AppStatus.IDLE);
  };

  const isProcessing = status === AppStatus.BATCH_PROCESSING;
  const isPoseProcessing = poseStatus === AppStatus.BATCH_PROCESSING;
  const isFacialProcessing = facialStatus === AppStatus.BATCH_PROCESSING;
  const isFacialV2Processing = facialV2Status === AppStatus.BATCH_PROCESSING;
  const anyProcessing = isProcessing || isPoseProcessing || isFacialProcessing || isFacialV2Processing;

  return (
    <div className="flex flex-col h-screen bg-slate-900 text-slate-100 font-sans overflow-hidden">
      <header className="border-b border-slate-700 bg-slate-800/90 backdrop-blur-sm px-6 py-3">
        <div className="max-w-[1600px] mx-auto flex flex-col lg:flex-row lg:items-center gap-3 lg:gap-6">
          {/* Pipeline / interface selector */}
          <div className="flex items-center gap-2 shrink-0">
            <span className="text-sm font-medium text-slate-300">Pipeline</span>
            <div className="inline-flex rounded-lg border border-slate-700 bg-slate-900 p-0.5">
              <button
                onClick={() => setProvider('gemini')}
                disabled={anyProcessing}
                className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
                  provider === 'gemini' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Gemini API
              </button>
              <button
                onClick={() => setProvider('fal')}
                disabled={anyProcessing}
                className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
                  provider === 'fal' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                fal API
              </button>
            </div>
          </div>

          <div className="hidden lg:block w-px h-6 bg-slate-700" />

          <div className="flex items-center gap-2 shrink-0">
            <Key className="w-4 h-4 text-slate-300" />
            <span className="text-sm font-medium text-slate-300">
              {provider === 'fal' ? 'fal API Key (FAL_KEY)' : 'Google Gemini API Key'}
            </span>
          </div>
          <input
            type="password"
            value={apiKey}
            onChange={(e) => setActiveKey(e.target.value)}
            placeholder={provider === 'fal' ? 'Enter your fal API Key' : 'Enter your API Key'}
            className="w-full lg:max-w-md bg-slate-900 border border-slate-700 rounded-lg px-4 py-2 text-sm text-slate-200 focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all placeholder-slate-500"
            disabled={anyProcessing}
          />
          <p className="text-xs text-slate-500">
            {provider === 'fal'
              ? 'Routes through fal: Gemini 3 Pro Image (Nano Banana Pro) + Gemini 3 Pro text. Key processed locally, never stored.'
              : 'Calls the Gemini API directly. Your key is processed locally and never stored.'}
          </p>
        </div>
      </header>

      <div className="flex-1 overflow-hidden">
        {activeFunction === null ? (
          <main className="h-full overflow-y-auto p-8">
            <div className="max-w-5xl mx-auto space-y-8">
              <div>
                <h1 className="text-3xl font-bold text-white mb-2">Function Selection</h1>
                <p className="text-slate-400">
                  Select a function to continue. Active pipeline:{' '}
                  <span className="text-indigo-300 font-semibold">{provider === 'fal' ? 'fal API' : 'Gemini API'}</span>.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <button
                  onClick={() => setActiveFunction('ai-clothing')}
                  className="text-left bg-slate-800/50 rounded-2xl p-6 border border-slate-700/50 hover:border-indigo-500/60 transition-colors"
                >
                  <Shirt className="w-8 h-8 text-indigo-400 mb-4" />
                  <h2 className="text-xl font-bold text-white">AI Clothing</h2>
                  <p className="text-sm text-slate-400 mt-2">Original virtual try-on workflow.</p>
                </button>

                <button
                  onClick={() => setActiveFunction('pose-generator')}
                  className="text-left bg-slate-800/50 rounded-2xl p-6 border border-slate-700/50 hover:border-indigo-500/60 transition-colors"
                >
                  <Sparkles className="w-8 h-8 text-indigo-400 mb-4" />
                  <h2 className="text-xl font-bold text-white">Pose Generator</h2>
                  <p className="text-sm text-slate-400 mt-2">Generate 100 pose variations per model image.</p>
                </button>

                <button
                  onClick={() => {
                    setSettings(prev => ({ ...prev, imageModel: 'gemini-3-pro-image-preview' }));
                    setActiveFunction('facial-enhancement');
                  }}
                  className="text-left bg-slate-800/50 rounded-2xl p-6 border border-slate-700/50 hover:border-indigo-500/60 transition-colors"
                >
                  <UserRoundCog className="w-8 h-8 text-indigo-400 mb-4" />
                  <h2 className="text-xl font-bold text-white">Facial Enhancement</h2>
                  <p className="text-sm text-slate-400 mt-2">Enhance facial identity using a reference face image.</p>
                </button>

                <button
                  onClick={() => {
                    setSettings(prev => ({ ...prev, imageModel: 'gemini-3-pro-image-preview', resolution: '4K' }));
                    setActiveFunction('facial-enhancement-v2');
                  }}
                  className="text-left bg-slate-800/50 rounded-2xl p-6 border border-slate-700/50 hover:border-indigo-500/60 transition-colors relative"
                >
                  <span className="absolute top-4 right-4 text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300">Beta</span>
                  <ScanFace className="w-8 h-8 text-indigo-400 mb-4" />
                  <h2 className="text-xl font-bold text-white">Facial Enhancement v2</h2>
                  <p className="text-sm text-slate-400 mt-2">Realistic faces: multi-reference, 4K, AI-tailored prompts, optional crop &amp; composite.</p>
                </button>
              </div>
            </div>
          </main>
        ) : activeFunction === 'ai-clothing' ? (
          <div className="flex h-full overflow-hidden">
            <Sidebar
              settings={settings}
              setSettings={setSettings}
              isProcessing={isProcessing}
              onPromptsByModeChange={setPromptsByMode}
            />

            <main className="flex-1 p-8 overflow-y-auto">
              <div className="max-w-5xl mx-auto space-y-8 pb-12">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-3xl font-bold text-white mb-2">AI Clothing</h2>
                    <p className="text-slate-400">Upload your assets to start the virtual try-on batch process.</p>
                  </div>
                  <button
                    onClick={() => setActiveFunction(null)}
                    className="px-4 py-2 rounded-lg border border-slate-700 text-slate-300 hover:bg-slate-800 flex items-center gap-2"
                  >
                    <ArrowLeft className="w-4 h-4" />
                    Back
                  </button>
                </div>

                {errorMessage && (
                  <div className="bg-red-500/10 border border-red-500/50 rounded-lg p-4 flex items-center gap-3 text-red-400 animate-in slide-in-from-top-2">
                    <AlertTriangle className="w-5 h-5 shrink-0" />
                    <p>{errorMessage}</p>
                  </div>
                )}

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                  <div className="lg:col-span-4 space-y-6">
                    <div className="bg-slate-800/50 rounded-2xl p-6 border border-slate-700/50 backdrop-blur-sm">
                      <UploadZone
                        label="Model Images (Reference)"
                        multiple={true}
                        files={modelImages}
                        onFilesChange={setModelImages}
                        disabled={isProcessing}
                      />
                    </div>

                    <div className="bg-slate-800/50 rounded-2xl p-6 border border-slate-700/50 backdrop-blur-sm">
                      <GarmentList
                        groups={garmentGroups}
                        onGroupsChange={setGarmentGroups}
                        disabled={isProcessing}
                      />
                    </div>

                    <div className="bg-slate-800/50 rounded-2xl p-6 border border-slate-700/50 backdrop-blur-sm">
                      <PromptModeSelector
                        selectedModes={selectedStudioModes}
                        onSelectionChange={setSelectedStudioModes}
                        disabled={isProcessing}
                      />
                    </div>

                    <div className="pt-2 sticky bottom-4 z-10">
                      {isProcessing ? (
                        <div className="space-y-3">
                          <button
                            disabled={true}
                            className="w-full py-4 rounded-xl font-bold text-lg flex items-center justify-center gap-3 transition-all shadow-xl bg-indigo-500/50 cursor-not-allowed text-indigo-200"
                          >
                            <Loader2 className="w-6 h-6 animate-spin" />
                            Processing {batchProgress.current}/{batchProgress.total}
                          </button>
                          <button
                            onClick={() => { setShouldAbort(true); shouldAbortRef.current = true; }}
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

                  <div className="lg:col-span-8 space-y-6">
                    {results.length === 0 ? (
                      <>
                        <div className="flex items-center justify-between">
                          <h3 className="text-xl font-bold text-white">Planned Combinations</h3>
                          <span className="text-sm text-slate-400">
                            {plannedCombos.length} will be generated · no requests sent yet
                          </span>
                        </div>
                        <CombinationsPreview
                          combos={plannedCombos}
                          modelImages={modelImages}
                          extraPromptByCombo={extraPromptByCombo}
                          onExtraPromptChange={(key, value) =>
                            setExtraPromptByCombo(prev => ({ ...prev, [key]: value }))
                          }
                          disabled={isProcessing}
                        />
                      </>
                    ) : (
                      <>
                        <div className="flex items-center justify-between">
                          <h3 className="text-xl font-bold text-white">Results Gallery</h3>
                          <div className="flex items-center gap-3">
                            <span className="text-sm text-slate-400">{results.filter(r => r.status === 'success').length} Completed</span>
                            {!isProcessing && (
                              <button
                                onClick={() => { setResults([]); setErrorMessage(null); }}
                                className="text-sm px-3 py-1.5 rounded-lg border border-slate-700 text-slate-300 hover:bg-slate-800 flex items-center gap-1.5"
                              >
                                <ArrowLeft className="w-3.5 h-3.5" />
                                Edit combinations
                              </button>
                            )}
                          </div>
                        </div>
                        <ResultsGallery results={results} />
                      </>
                    )}
                  </div>
                </div>
              </div>
            </main>
          </div>
        ) : activeFunction === 'pose-generator' ? (
          <div className="flex h-full overflow-hidden">
            <PoseSidebar
              settings={settings}
              setSettings={setSettings}
              isProcessing={isPoseProcessing}
              promptTemplate={posePromptTemplate}
              onPromptTemplateChange={setPosePromptTemplate}
              poseVariations={poseVariations}
              onPoseVariationsChange={setPoseVariations}
              poseVariationSet={poseVariationSet}
              onPoseVariationSetChange={(set) => {
                setPoseVariationSet(set);
                setPoseVariations(set === 1 ? POSE_VARIATIONS_SET_1 : POSE_VARIATIONS_SET_2);
              }}
            />

            <main className="flex-1 p-8 overflow-y-auto">
              <div className="max-w-5xl mx-auto space-y-8 pb-12">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-3xl font-bold text-white mb-2">Pose Generator</h2>
                    <p className="text-slate-400">Generate {poseVariations.length} pose variations for each uploaded model image.</p>
                  </div>
                  <button
                    onClick={() => setActiveFunction(null)}
                    className="px-4 py-2 rounded-lg border border-slate-700 text-slate-300 hover:bg-slate-800 flex items-center gap-2"
                  >
                    <ArrowLeft className="w-4 h-4" />
                    Back
                  </button>
                </div>

                {poseErrorMessage && (
                  <div className="bg-red-500/10 border border-red-500/50 rounded-lg p-4 flex items-center gap-3 text-red-400 animate-in slide-in-from-top-2">
                    <AlertTriangle className="w-5 h-5 shrink-0" />
                    <p>{poseErrorMessage}</p>
                  </div>
                )}

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                  <div className="lg:col-span-4 space-y-6">
                    <div className="bg-slate-800/50 rounded-2xl p-6 border border-slate-700/50 backdrop-blur-sm">
                      <UploadZone
                        label="Model Images (Reference)"
                        multiple={true}
                        files={poseModelImages}
                        onFilesChange={setPoseModelImages}
                        disabled={isPoseProcessing}
                      />
                    </div>

                    <div className="bg-slate-800/50 rounded-2xl p-6 border border-slate-700/50 backdrop-blur-sm text-sm text-slate-300">
                      <p className="font-semibold text-slate-200">Pose Loop</p>
                      <p className="text-slate-400 mt-2">Configured to iterate through {poseVariations.length} predefined poses for each model image.</p>
                    </div>

                    <div className="pt-2 sticky bottom-4 z-10">
                      {isPoseProcessing ? (
                        <div className="space-y-3">
                          <button
                            disabled={true}
                            className="w-full py-4 rounded-xl font-bold text-lg flex items-center justify-center gap-3 transition-all shadow-xl bg-indigo-500/50 cursor-not-allowed text-indigo-200"
                          >
                            <Loader2 className="w-6 h-6 animate-spin" />
                            Processing {poseBatchProgress.current}/{poseBatchProgress.total}
                          </button>
                          <button
                            onClick={() => { setShouldAbortPose(true); shouldAbortPoseRef.current = true; }}
                            disabled={shouldAbortPose}
                            className={`w-full py-3 rounded-xl font-bold text-base flex items-center justify-center gap-3 transition-all shadow-xl ${
                              shouldAbortPose
                                ? 'bg-slate-700 cursor-not-allowed text-slate-500'
                                : 'bg-red-600 hover:bg-red-500 hover:scale-[1.02] active:scale-[0.98]'
                            }`}
                          >
                            <StopCircle className="w-5 h-5" />
                            {shouldAbortPose ? 'Aborting...' : 'Abort All Processes'}
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={handleGeneratePose}
                          disabled={!apiKey}
                          className={`w-full py-4 rounded-xl font-bold text-lg flex items-center justify-center gap-3 transition-all shadow-xl ${
                            !apiKey
                              ? 'bg-slate-700 cursor-not-allowed text-slate-500'
                              : 'bg-indigo-600 hover:bg-indigo-500 hover:scale-[1.02] active:scale-[0.98]'
                          }`}
                        >
                          <Wand2 className="w-6 h-6" />
                          Start Pose Batch
                        </button>
                      )}
                    </div>
                  </div>

                  <div className="lg:col-span-8 space-y-6">
                    <div className="flex items-center justify-between">
                      <h3 className="text-xl font-bold text-white">Results Gallery</h3>
                      {poseResults.length > 0 && <span className="text-sm text-slate-400">{poseResults.filter(r => r.status === 'success').length} Completed</span>}
                    </div>
                    <ResultsGallery results={poseResults} />
                  </div>
                </div>
              </div>
            </main>
          </div>
        ) : activeFunction === 'facial-enhancement' ? (
          <div className="flex h-full overflow-hidden">
            <FacialSidebar
              settings={settings}
              setSettings={setSettings}
              isProcessing={isFacialProcessing}
              prompt={facialPrompt}
              onPromptChange={setFacialPrompt}
            />

            <main className="flex-1 p-8 overflow-y-auto">
              <div className="max-w-5xl mx-auto space-y-8 pb-12">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-3xl font-bold text-white mb-2">Facial Enhancement</h2>
                    <p className="text-slate-400">Apply one reference face image across multiple target model images.</p>
                  </div>
                  <button
                    onClick={() => setActiveFunction(null)}
                    className="px-4 py-2 rounded-lg border border-slate-700 text-slate-300 hover:bg-slate-800 flex items-center gap-2"
                  >
                    <ArrowLeft className="w-4 h-4" />
                    Back
                  </button>
                </div>

                {facialErrorMessage && (
                  <div className="bg-red-500/10 border border-red-500/50 rounded-lg p-4 flex items-center gap-3 text-red-400 animate-in slide-in-from-top-2">
                    <AlertTriangle className="w-5 h-5 shrink-0" />
                    <p>{facialErrorMessage}</p>
                  </div>
                )}

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                  <div className="lg:col-span-4 space-y-6">
                    <div className="bg-slate-800/50 rounded-2xl p-6 border border-slate-700/50 backdrop-blur-sm">
                      <UploadZone
                        label="Target Model Images"
                        multiple={true}
                        files={facialModelImages}
                        onFilesChange={setFacialModelImages}
                        disabled={isFacialProcessing}
                      />
                    </div>

                    <div className="bg-slate-800/50 rounded-2xl p-6 border border-slate-700/50 backdrop-blur-sm">
                      <UploadZone
                        label="Reference Face Image"
                        files={facialFaceImage}
                        onFilesChange={setFacialFaceImage}
                        disabled={isFacialProcessing}
                      />
                    </div>

                    <div className="pt-2 sticky bottom-4 z-10">
                      {isFacialProcessing ? (
                        <div className="space-y-3">
                          <button
                            disabled={true}
                            className="w-full py-4 rounded-xl font-bold text-lg flex items-center justify-center gap-3 transition-all shadow-xl bg-indigo-500/50 cursor-not-allowed text-indigo-200"
                          >
                            <Loader2 className="w-6 h-6 animate-spin" />
                            Processing {facialBatchProgress.current}/{facialBatchProgress.total}
                          </button>
                          <button
                            onClick={() => { setShouldAbortFacial(true); shouldAbortFacialRef.current = true; }}
                            disabled={shouldAbortFacial}
                            className={`w-full py-3 rounded-xl font-bold text-base flex items-center justify-center gap-3 transition-all shadow-xl ${
                              shouldAbortFacial
                                ? 'bg-slate-700 cursor-not-allowed text-slate-500'
                                : 'bg-red-600 hover:bg-red-500 hover:scale-[1.02] active:scale-[0.98]'
                            }`}
                          >
                            <StopCircle className="w-5 h-5" />
                            {shouldAbortFacial ? 'Aborting...' : 'Abort All Processes'}
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={handleFacialEnhancementSubmit}
                          disabled={!apiKey}
                          className={`w-full py-4 rounded-xl font-bold text-lg flex items-center justify-center gap-3 transition-all shadow-xl ${
                            !apiKey
                              ? 'bg-slate-700 cursor-not-allowed text-slate-500'
                              : 'bg-indigo-600 hover:bg-indigo-500 hover:scale-[1.02] active:scale-[0.98]'
                          }`}
                        >
                          <Wand2 className="w-6 h-6" />
                          Start Enhancement
                        </button>
                      )}
                    </div>
                  </div>

                  <div className="lg:col-span-8 space-y-6">
                    <div className="flex items-center justify-between">
                      <h3 className="text-xl font-bold text-white">Results Gallery</h3>
                      {facialResults.length > 0 && <span className="text-sm text-slate-400">{facialResults.filter(r => r.status === 'success').length} Completed</span>}
                    </div>
                    <ResultsGallery results={facialResults} />
                  </div>
                </div>
              </div>
            </main>
          </div>
        ) : (
          <div className="flex h-full overflow-hidden">
            <FacialV2Sidebar
              settings={settings}
              setSettings={setSettings}
              isProcessing={isFacialV2Processing}
              prompt={facialV2Prompt}
              onPromptChange={setFacialV2Prompt}
              useAiPrompt={facialV2UseAiPrompt}
              onUseAiPromptChange={setFacialV2UseAiPrompt}
              useComposite={facialV2UseComposite}
              onUseCompositeChange={setFacialV2UseComposite}
            />

            <main className="flex-1 p-8 overflow-y-auto">
              <div className="max-w-5xl mx-auto space-y-8 pb-12">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-3xl font-bold text-white mb-2 flex items-center gap-3">
                      Facial Enhancement v2
                      <span className="text-xs font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-amber-500/20 text-amber-300">Beta</span>
                    </h2>
                    <p className="text-slate-400">Realistic faces from Midjourney models — multiple reference angles, 4K, optional AI-tailored prompt and crop &amp; composite.</p>
                  </div>
                  <button
                    onClick={() => setActiveFunction(null)}
                    className="px-4 py-2 rounded-lg border border-slate-700 text-slate-300 hover:bg-slate-800 flex items-center gap-2"
                  >
                    <ArrowLeft className="w-4 h-4" />
                    Back
                  </button>
                </div>

                {facialV2ErrorMessage && (
                  <div className="bg-red-500/10 border border-red-500/50 rounded-lg p-4 flex items-center gap-3 text-red-400 animate-in slide-in-from-top-2">
                    <AlertTriangle className="w-5 h-5 shrink-0" />
                    <p>{facialV2ErrorMessage}</p>
                  </div>
                )}

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                  <div className="lg:col-span-4 space-y-6">
                    <div className="bg-slate-800/50 rounded-2xl p-6 border border-slate-700/50 backdrop-blur-sm">
                      <UploadZone
                        label="Target Model Images"
                        multiple={true}
                        files={facialV2ModelImages}
                        onFilesChange={setFacialV2ModelImages}
                        disabled={isFacialV2Processing}
                      />
                    </div>

                    <div className="bg-slate-800/50 rounded-2xl p-6 border border-slate-700/50 backdrop-blur-sm">
                      <UploadZone
                        label="Reference Face Images (one or more angles)"
                        multiple={true}
                        files={facialV2RefImages}
                        onFilesChange={setFacialV2RefImages}
                        disabled={isFacialV2Processing}
                      />
                    </div>

                    <div className="pt-2 sticky bottom-4 z-10">
                      {isFacialV2Processing ? (
                        <div className="space-y-3">
                          <button
                            disabled={true}
                            className="w-full py-4 rounded-xl font-bold text-lg flex items-center justify-center gap-3 transition-all shadow-xl bg-indigo-500/50 cursor-not-allowed text-indigo-200"
                          >
                            <Loader2 className="w-6 h-6 animate-spin" />
                            Processing {facialV2BatchProgress.current}/{facialV2BatchProgress.total}
                          </button>
                          <button
                            onClick={() => { setShouldAbortFacialV2(true); shouldAbortFacialV2Ref.current = true; }}
                            disabled={shouldAbortFacialV2}
                            className={`w-full py-3 rounded-xl font-bold text-base flex items-center justify-center gap-3 transition-all shadow-xl ${
                              shouldAbortFacialV2
                                ? 'bg-slate-700 cursor-not-allowed text-slate-500'
                                : 'bg-red-600 hover:bg-red-500 hover:scale-[1.02] active:scale-[0.98]'
                            }`}
                          >
                            <StopCircle className="w-5 h-5" />
                            {shouldAbortFacialV2 ? 'Aborting...' : 'Abort All Processes'}
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={handleFacialV2Submit}
                          disabled={!apiKey}
                          className={`w-full py-4 rounded-xl font-bold text-lg flex items-center justify-center gap-3 transition-all shadow-xl ${
                            !apiKey
                              ? 'bg-slate-700 cursor-not-allowed text-slate-500'
                              : 'bg-indigo-600 hover:bg-indigo-500 hover:scale-[1.02] active:scale-[0.98]'
                          }`}
                        >
                          <Wand2 className="w-6 h-6" />
                          Start Enhancement v2
                        </button>
                      )}
                    </div>
                  </div>

                  <div className="lg:col-span-8 space-y-6">
                    <div className="flex items-center justify-between">
                      <h3 className="text-xl font-bold text-white">Results Gallery</h3>
                      {facialV2Results.length > 0 && <span className="text-sm text-slate-400">{facialV2Results.filter(r => r.status === 'success').length} Completed</span>}
                    </div>
                    <ResultsGallery results={facialV2Results} />
                  </div>
                </div>
              </div>
            </main>
          </div>
        )}
      </div>
      <DebugConsole />
    </div>
  );
}
