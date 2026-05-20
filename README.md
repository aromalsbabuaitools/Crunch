# Crunch

A fast, lightweight desktop app for compressing images and PDFs — without sacrificing quality.

Drag in your files, pick a compression level, and you're done.

---

## Features

- **Drag & drop** — drop files or folders straight onto the window
- **Images** — JPG, PNG, WEBP, TIFF, and HEIC (macOS)
- **PDFs** — multi-page PDF compression powered by Ghostscript
- **Three presets** — Light, Balanced, Aggressive — or dial in a custom quality level with the slider
- **Side-by-side preview** — compare original vs compressed before keeping the output
- **Batch processing** — add as many files as you need and compress them all at once
- **Non-destructive** — originals are never overwritten; compressed files are saved alongside with a `_compressed` suffix
- **Custom output folder** — optionally send all output to a single folder
- **Compression history** — last 10 operations shown in the history panel

---

## Install

### macOS

1. Download `Crunch.dmg` from the releases page
2. Open the `.dmg` and drag **Crunch** into your **Applications** folder
3. On first launch, right-click the app → **Open** (macOS Gatekeeper will ask you to confirm once since the app isn't notarized)
4. After that, open it normally from Launchpad or Spotlight

> Supports Apple Silicon (M1/M2/M3) and Intel Macs.

### Windows

1. Download `Crunch_setup.exe` from the releases page
2. Run the installer and follow the prompts
3. Crunch will appear in the Start Menu

> Windows SmartScreen may show a warning on first run — click **More info → Run anyway**. This happens because the app isn't code-signed yet.

---

## How to use

1. **Add files** — drag images or PDFs onto the drop zone, or click it to browse
2. **Pick a level** — choose Light, Balanced, or Aggressive, or fine-tune with the quality slider
3. **Compress** — hit the **Compress** button; progress shows per file
4. **Preview** — click the eye icon on any finished file to compare original vs compressed side by side
5. **Find your files** — compressed files are saved next to the originals by default (with `_compressed` added to the name), or in a folder you choose

---

## Building from source

**Requirements:** Rust 1.85+, Node.js 18+, Ghostscript binary for your platform

```bash
git clone <repo-url>
cd crunch
npm install

# Place the Ghostscript binary in src-tauri/binaries/ named for your platform:
#   macOS ARM:    gs-aarch64-apple-darwin
#   macOS Intel:  gs-x86_64-apple-darwin
#   Windows:      gs-x86_64-pc-windows-msvc.exe

npm run tauri dev       # development
npm run tauri build     # production build
```

Output lands in `src-tauri/target/release/bundle/`.
