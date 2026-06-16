# Two-Pipeline Update — Gemini API & fal API

The app now runs the **same** virtual try-on UI, prompts, and settings over **two interchangeable pipelines**, chosen from a `Pipeline` toggle in the top bar:

- **Gemini API** — calls Gemini directly via `@google/genai` (unchanged behavior).
- **fal API** — routes the identical flow through fal.ai.

Every existing prompt (`DEFAULT_PROMPT_MAKER`, the three bag/flat-lay prompts, the pose template, both 100-pose variation sets, the facial-enhancement prompt), every setting (resolution 1K/2K/4K, all aspect ratios), all three functions (AI Clothing, Pose Generator, Facial Enhancement), batch processing, abort, and ZIP download are preserved untouched. `constants.ts` is not modified.

## Files

| File | Change |
|------|--------|
| `src/services/falService.ts` | **New.** fal pipeline; same signatures as `geminiService.ts`. |
| `src/services/aiService.ts` | **New.** `getService(provider)` dispatcher. |
| `src/App.tsx` | Pipeline toggle + per-provider API keys; routes calls through `getService`. |
| `src/types.ts` | Adds `AIProvider = 'gemini' \| 'fal'`. |
| `package.json` | Adds `@fal-ai/client`. |
| `index.html` | Adds `@fal-ai/client` to the import map. |

`geminiService.ts` and all components are unchanged — copy the files above over your project and run `npm install`.

## How the fal pipeline maps

| Step | Gemini pipeline | fal pipeline |
|------|-----------------|--------------|
| Analyze (images → prompt) | `gemini-3-pro-preview` (vision) | OpenRouter on fal, OpenAI-compatible endpoint, `google/gemini-3-pro` |
| Generate / edit (prompt + images → image) | `gemini-3-pro-image-preview` | `fal-ai/gemini-3-pro-image-preview/edit` (Nano Banana Pro) |
| Flash image option | `gemini-3.1-flash-image-preview` | `fal-ai/nano-banana-2/edit` |

Images are sent as base64 data URIs; results use `sync_mode: true` so they return inline and download identically to the Gemini path. The BLOCK_NONE safety posture is mirrored with `safety_tolerance: '6'`.

## One thing to verify

The OpenRouter text-model slugs (`google/gemini-3-pro`, etc.) are mapped in `FAL_TEXT_MODEL_MAP` at the top of `falService.ts`. If OpenRouter lists the Gemini 3 family under different slugs, edit that map — it's the only place the names live.

Note: fal warns against exposing `FAL_KEY` in client-side code. As with the existing Gemini key, it's entered locally for this dev tool. For production, put a server-side proxy in front of both providers.
