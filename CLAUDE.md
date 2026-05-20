# CLOUDE.md

**Project Name:** AnimeCompress  
**Tagline:** Sleek, lightweight PDF & Image compressor with anime-inspired UI. Drag, drop, compress, preview — done.

## Project Overview

Create a **production-grade, super intuitive, lightweight desktop application** for compressing PDFs and images with **minimal quality loss**. The app must feel premium, fast, and delightful to use.

Target platforms: **Windows** (10/11) and **macOS** (Intel + Apple Silicon).

**Core Philosophy:** Keep it simple. No bloat. One-window app that does one thing exceptionally well.

## Key Requirements

### 1. User Experience & GUI
- **Anime-style sleek design** — modern, clean, vibrant accents (soft neon/pastel gradients, subtle particle effects or smooth animations on hover/press).
- Dark mode by default with elegant anime aesthetic (think modern anime title screen meets professional tool).
- Fully responsive/resizable window with smooth drag-to-resize.
- **Drag & Drop** support for files and folders.
- Minimalist interface: big drop zone, clear controls, instant feedback.
- Smooth animations for compression progress, file addition, and preview transitions.

### 2. Core Features
- Support for:
  - **Images**: JPG, PNG, WEBP, HEIC, TIFF
  - **PDFs**: Multi-page PDF compression
- Intelligent default compression (balanced quality/size)
- **Custom compression control** — intuitive slider or drag handle to adjust target size/quality level
- **Preview Mode**:
  - Side-by-side original vs compressed view
  - Zoom, pan, and page navigation (for PDFs)
  - Quick quality check before saving
- Batch processing support (multiple files/folders)
- Output folder selection (default: same folder with `_compressed` suffix)
- Preserve original files (never overwrite unless explicitly chosen)

### 3. Technical Requirements
- **Lightweight** — fast startup, low memory/CPU usage
- Production-grade reliability and error handling
- Cross-platform (Windows + macOS native feel)
- Minimal dependencies
- Good performance even on large PDFs/images
- Compression algorithms focused on **visual quality preservation** (not just smallest possible file)

### 4. Nice-to-Haves (Keep Simple)
- Recent files list
- Compression history (last 10 operations)
- Keyboard shortcuts
- Progress bar with estimated time
- Success animation with file size reduction stats
- "Copy compressed file" quick action

## UI Layout (Single Window)

1. **Top Bar** — App title + settings (theme toggle, about)
2. **Main Drop Zone** — Large animated area saying "Drop PDFs & Images here"
3. **File List** — Added files with thumbnails, original size, and estimated compressed size
4. **Control Panel** (right or bottom):
   - Compression level slider (with presets: Light / Balanced / Aggressive)
   - "Custom Target Size" option
   - Preview button
   - Compress All button (prominent)
5. **Preview Modal** — Opens on demand with before/after comparison

## Technology Stack Recommendation

- **Framework**: Tauri 2.0 (Rust backend + web frontend) — lightweight, secure, native feel
- **Frontend**: React + TypeScript + TailwindCSS + shadcn/ui + Framer Motion (for anime-style animations)
- **Image/PDF Processing**:
  - Images: Sharp (via Rust) or ImageMagick
  - PDFs: pdf-lib + Ghostscript or mupdf (Rust bindings)
- Alternative (if simpler): Electron with careful optimization (but Tauri preferred for lightness)

## Acceptance Criteria

- App launches under 1 second on modern machines
- Beautiful, cohesive anime-inspired design that doesn't feel gimmicky
- Compression quality visibly good even at high compression ratios
- Preview accurately reflects final output
- Works reliably with 100+ image batches and 50+ page PDFs
- Intuitive enough that a non-technical user understands it in <10 seconds

## Out of Scope

- Cloud upload/sync
- Video compression
- Advanced editing tools
- User accounts
- Overly complex settings panels

---

**Goal:** Build the most enjoyable PDF/Image compressor on the market — beautiful, fast, and actually useful.

Start with the UI shell + drag & drop, then core compression engine, then preview system. Keep everything clean and production-ready.