# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

**Crunch** — a Tauri 2.0 desktop app for compressing images and PDFs. Rust backend handles all file I/O and compression; React/TypeScript frontend drives the UI.

## Commands

### Development
```bash
npm run tauri dev        # start dev mode (launches Vite + Tauri together)
npm run build            # TypeScript check + Vite build (frontend only)
npm run tauri build      # full production build (frontend + Rust bundle)
```

### Ghostscript sidecar (required before building)
Ghostscript must be placed in `src-tauri/binaries/` with Tauri's target-triple naming convention. On macOS:
```bash
brew install ghostscript
cp "$(which gs)" src-tauri/binaries/gs-aarch64-apple-darwin   # Apple Silicon
# or build universal binary via lipo — see README for full steps
```
On Windows: copy `gswin64c.exe` to `src-tauri/binaries/gs-x86_64-pc-windows-msvc.exe`.

### CI / Releases
Tag a commit to trigger the GitHub Actions build:
```bash
git tag v1.x.x && git push origin v1.x.x
```
Two parallel jobs run: macOS universal DMG and Windows x64 installer/MSI, both uploaded to the GitHub Release automatically.

## Architecture

### Frontend (`src/`)
- **`src/store/useAppStore.ts`** — single Zustand store. All state lives here: file list (`AppFile[]`), compression quality (0–95), active preset (`light` | `balanced` | `aggressive`), output directory, preview file ID, and compression history (persisted in `localStorage`, capped at 10 entries). The `setPreset` action simultaneously updates both `preset` and `quality`.
- **`src/App.tsx`** — layout root. Shows `DropZone` when no files are loaded, switches to `FileList` + `ControlPanel` once files are added. `PreviewModal` is always mounted and controlled by `previewFileId` in the store.
- **`src/components/`** — one file per UI region: `TopBar`, `DropZone`, `FileList`, `FileListItem`, `ControlPanel`, `PreviewModal`, `HistoryPanel`.
- **`src/lib/utils.ts`** — shared helpers: `getFileType`, `formatBytes`, `deriveOutputPath` (adds `_compressed` before the extension).

### Rust backend (`src-tauri/src/`)
The Rust layer exposes Tauri commands to the frontend:
- `get_file_info` — returns `{ name, size, type }` for a given path.
- `get_thumbnail` — returns a base64-encoded JPEG thumbnail string.
- `compress_image` — compresses JPG/PNG/WEBP/TIFF using `mozjpeg` (JPEG) or `oxipng` (PNG); returns `{ output_path, original_size, compressed_size }`.
- `compress_pdf` — shells out to the bundled Ghostscript binary via `tauri-plugin-shell`; emits `compress://progress` events during processing.

Progress events (`compress://progress { id, percent }`) flow from Rust → Tauri event bus → `ControlPanel.tsx`, which calls `setFileProgress` on the store.

### Styling
Tailwind with a custom dark/neon design system defined in `tailwind.config.js`. Custom color tokens (`neon-pink`, `neon-cyan`, `neon-purple`, `neon-green`, `dark-bg`, `dark-surface`, `dark-card`, `dark-border`, `dark-text`, `dark-muted`) and utility animations (`pulse-glow`, `shimmer`, `float`) are all defined there. Framer Motion handles all interactive animations.

### File flow
1. User drops files or clicks browse → `DropZone` calls `get_file_info` for each path, then `addFiles` on the store, then async calls `get_thumbnail` and stores results via `setThumbnail`.
2. User hits Compress → `ControlPanel.handleCompress` iterates idle files, calls `compress_image` or `compress_pdf`, updates status/progress via store actions.
3. User clicks preview eye icon → `setPreviewFileId` is called → `PreviewModal` renders the before/after comparison using `assetProtocol` to load files from disk.

### Tauri asset protocol scope
`tauri.conf.json` grants access to `$HOME/**`, `/private/**`, `/var/**` so the frontend can display local files via the `asset://` protocol for preview. Window is 1100×720, min 900×600, custom titlebar (`decorations: false`).
