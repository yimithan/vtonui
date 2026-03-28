<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# Gemini Virtual Try-On

A multi-function image generation web app powered by [Google Gemini](https://ai.google.dev/) models, with:
- **AI Clothing** (the original virtual try-on flow),
- **Pose Generator** (100-pose variation generation for each model image),
- **Facial Enhancement** (placeholder page for now).

View your app in AI Studio: https://ai.studio/apps/drive/1BecNLvqmpvdfN8zuPDTS-p0pgz2Lv9gC

## Features

- **Function Selection Landing Page** — The first screen lets you choose AI Clothing, Pose Generator, or Facial Enhancement.
- **Persistent API Key Bar** — API key input is pinned in the top-left area and remains visible across all pages.
- **Model & Garment Upload** — Drag-and-drop upload zones for multiple model reference images and multiple garment image groups.
- **Batch Processing** — Queue multiple models and garments; each model will be dressed with every garment in a nested batch loop (Model1 × [Garment1, Garment2, ...], Model2 × [Garment1, Garment2, ...], etc.).
- **Results Gallery** — View real-time status for each model-garment combination (pending → analyzing → generating → success/error) and download finished results.
- **Custom Prompt Text** — Optionally provide a custom prompt text to override the default analysis behavior.
- **Model Selection** — Choose independently which Gemini model to use for prompt generation and for image generation.
- **Generation Settings** — Configure output resolution (1K / 2K / 4K) and aspect ratio (1:1, 3:4, 4:3, 9:16, 16:9).

## How It Works

1. **Analyze** — For each model-garment combination, the model image and garment images are sent to the selected **Prompt Generation Model** (default: `gemini-3-pro-preview`) along with prompt instructions. The model returns a detailed text prompt describing how the model should look wearing the garment.
2. **Generate** — The text prompt, model image, and garment images are sent to the selected **Image Generation Model** (default: `gemini-3-pro-image-preview`) with image generation config (resolution & aspect ratio). The model returns a generated image of the virtual try-on result.
3. **Batch Loop** — The process repeats for all model-garment combinations: Model1 with all garments, then Model2 with all garments, etc.

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | [React](https://react.dev/) 19 with TypeScript |
| Build Tool | [Vite](https://vite.dev/) 6 |
| Styling | [Tailwind CSS](https://tailwindcss.com/) (CDN) |
| Icons | [Lucide React](https://lucide.dev/) |
| AI Backend | [Google GenAI SDK](https://www.npmjs.com/package/@google/genai) (`@google/genai`) |

## Project Structure

```
├── index.html                 # Entry HTML with Tailwind CDN and import map
├── start.bat                  # Windows launcher (double-click to start)
├── start.sh                   # macOS/Linux launcher (./start.sh to start)
├── vite.config.ts             # Vite config (port 3000, API key injection)
├── tsconfig.json              # TypeScript configuration
├── metadata.json              # AI Studio app metadata
├── .env.local                 # Local environment variables (GEMINI_API_KEY)
└── src/
    ├── index.tsx              # React DOM entry point
    ├── index.css              # Global styles
    ├── App.tsx                # Main application with function selection and per-function workflows
    ├── types.ts               # TypeScript interfaces and enums
    ├── constants.ts           # Default prompt config
    ├── components/
    │   ├── Sidebar.tsx        # AI Clothing sidebar settings
    │   ├── PoseSidebar.tsx    # Pose Generator sidebar settings
    │   ├── UploadZone.tsx     # Reusable file upload component with previews
    │   ├── GarmentList.tsx    # Garment queue manager (add/remove garment groups)
    │   └── ResultsGallery.tsx # Results display with status badges and download links
    └── services/
        └── geminiService.ts   # Google Gemini API integration (analyze + generate)
```

## Run Locally

**Prerequisites:** Node.js

### Option 1: Quick Start (Launcher Scripts)

1. Set the `GEMINI_API_KEY` in [.env.local](.env.local) to your [Gemini API key](https://aistudio.google.com/apikey):
   ```
   GEMINI_API_KEY=your_key_here
   ```
2. Launch the app:
   - **Windows:** Double-click `start.bat`
   - **macOS / Linux:** Run `./start.sh`

   The launcher automatically installs dependencies (if needed) and starts the development server.

3. Open [http://localhost:3000](http://localhost:3000) in your browser.

### Option 2: Manual Setup

1. Install dependencies:
   ```bash
   npm install
   ```
2. Set the `GEMINI_API_KEY` in [.env.local](.env.local) to your [Gemini API key](https://aistudio.google.com/apikey):
   ```
   GEMINI_API_KEY=your_key_here
   ```
3. Start the dev server:
   ```bash
   npm run dev
   ```
4. Open [http://localhost:3000](http://localhost:3000) in your browser.

## Configuration

### Generation Settings (Sidebar)

| Setting | Options | Default |
|---------|---------|---------|
| Prompt Generation Model | gemini-3-pro-preview, gemini-3.1-pro-preview, gemini-3.1-flash-lite-preview | gemini-3-pro-preview |
| Image Generation Model | gemini-3-pro-image-preview, gemini-3.1-flash-image-preview | gemini-3-pro-image-preview |
| Resolution | 1K (Standard), 2K (High), 4K (Ultra) | 1K |
| Aspect Ratio | 1:1, 3:4, 4:3, 9:16, 16:9 | 3:4 |

### Custom Prompt Text

Enter custom prompt text via the sidebar to replace the default analysis prompt. The default prompt instructs the AI to act as a high-end fashion photography prompt engineer, analyzing the model's physical characteristics and the garment's details to produce a photorealistic generation prompt with zero-bleed constraints.