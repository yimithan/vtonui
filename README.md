<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# Gemini Virtual Try-On

A high-fidelity virtual try-on web application powered by [Google Gemini](https://ai.google.dev/) image generation models. Upload a reference model photo and one or more garment images, and the app generates realistic images of the model wearing each garment.

View your app in AI Studio: https://ai.studio/apps/drive/1BecNLvqmpvdfN8zuPDTS-p0pgz2Lv9gC

## Features

- **Model & Garment Upload** — Drag-and-drop upload zones for a single model (reference) image and multiple garment image groups.
- **Batch Processing** — Queue multiple garments and process them all in one run. Each garment goes through a two-step AI pipeline (analyze → generate).
- **Results Gallery** — View real-time status for each garment (pending → analyzing → generating → success/error) and download finished results.
- **Custom Prompt Logic** — Optionally upload a `prompt_maker.json` file to override the default analysis behavior.
- **Generation Settings** — Configure output resolution (1K / 2K / 4K) and aspect ratio (1:1, 3:4, 4:3, 9:16, 16:9).
- **Cooldown Timer** — Built-in quota protection with a configurable cooldown between batch runs.

## How It Works

1. **Analyze** — The model image and garment images are sent to `gemini-3-pro-image-preview` along with prompt instructions. The model returns a detailed text prompt describing how the model should look wearing the garment.
2. **Generate** — The text prompt, model image, and garment images are sent back to `gemini-3-pro-image-preview` with image generation config (resolution & aspect ratio). The model returns a generated image of the virtual try-on result.

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
├── vite.config.ts             # Vite config (port 3000, API key injection)
├── tsconfig.json              # TypeScript configuration
├── metadata.json              # AI Studio app metadata
├── .env.local                 # Local environment variables (GEMINI_API_KEY)
└── src/
    ├── index.tsx              # React DOM entry point
    ├── index.css              # Global styles
    ├── App.tsx                # Main application component and batch orchestration
    ├── types.ts               # TypeScript interfaces and enums
    ├── constants.ts           # Default prompt config and cooldown timers
    ├── components/
    │   ├── Sidebar.tsx        # API key input, prompt JSON upload, generation settings
    │   ├── UploadZone.tsx     # Reusable file upload component with previews
    │   ├── GarmentList.tsx    # Garment queue manager (add/remove garment groups)
    │   └── ResultsGallery.tsx # Results display with status badges and download links
    └── services/
        └── geminiService.ts   # Google Gemini API integration (analyze + generate)
```

## Run Locally

**Prerequisites:** Node.js

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
| Resolution | 1K (Standard), 2K (High), 4K (Ultra) | 1K |
| Aspect Ratio | 1:1, 3:4, 4:3, 9:16, 16:9 | 3:4 |

### Custom Prompt Logic

Upload a JSON file via the sidebar to replace the default analysis prompt. The default prompt instructs the AI to act as a fashion stylist, analyzing the model's physical characteristics and the garment's details to produce a photorealistic generation prompt.

### Cooldown

After a batch completes, a cooldown timer activates to protect API quota:

- **Success:** 120 seconds
- **Error:** 10 seconds
