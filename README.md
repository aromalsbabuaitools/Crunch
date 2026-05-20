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

## Download

All releases are on the [GitHub Releases page](https://github.com/aromalsbabuailearning1-web/Crunch/releases).

| Platform | File |
|----------|------|
| macOS (Apple Silicon + Intel) | `Crunch_x.x.x_universal.dmg` |
| Windows 64-bit (installer) | `Crunch_x.x.x_x64-setup.exe` |
| Windows 64-bit (MSI) | `Crunch_x.x.x_x64_en-US.msi` |

---

## Install

### macOS

1. Download `Crunch_x.x.x_universal.dmg` from the [Releases page](https://github.com/aromalsbabuailearning1-web/Crunch/releases)
2. Open the `.dmg` and drag **Crunch** into your **Applications** folder
3. On first launch, right-click the app → **Open** (Gatekeeper will ask you to confirm once since the app isn't notarized)
4. After that, open it normally from Launchpad or Spotlight

> Supports both Apple Silicon (M1/M2/M3/M4) and Intel Macs — one universal binary.

### Windows

1. Download `Crunch_x.x.x_x64-setup.exe` from the [Releases page](https://github.com/aromalsbabuailearning1-web/Crunch/releases)
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

**Requirements:** Rust 1.85+, Node.js 18+, Ghostscript

### macOS

```bash
git clone https://github.com/aromalsbabuailearning1-web/Crunch.git
cd Crunch
npm install

# Install Ghostscript and set up the sidecar binaries
brew install ghostscript
mkdir -p src-tauri/binaries

# For a universal build (Apple Silicon + Intel):
ARM_GS=$(which gs)
arch -x86_64 /usr/local/bin/brew install ghostscript   # requires Rosetta
lipo -create "$ARM_GS" /usr/local/bin/gs \
  -output src-tauri/binaries/gs-universal-apple-darwin
cp "$ARM_GS" src-tauri/binaries/gs-aarch64-apple-darwin
cp /usr/local/bin/gs src-tauri/binaries/gs-x86_64-apple-darwin

# Or for Apple Silicon only:
cp "$(which gs)" src-tauri/binaries/gs-aarch64-apple-darwin

npm run tauri dev       # development
npm run tauri build     # production build
```

Output lands in `src-tauri/target/release/bundle/`.

### Windows

1. Install [Rust](https://rustup.rs/) 1.85+, [Node.js](https://nodejs.org/) 18+, and [Ghostscript](https://www.ghostscript.com/releases/gsdnld.html) for Windows
2. Clone the repo and install dependencies:
   ```bash
   git clone https://github.com/aromalsbabuailearning1-web/Crunch.git
   cd Crunch
   npm install
   ```
3. Copy the Ghostscript CLI executable into the sidecar folder:
   ```
   # Default install location:
   C:\Program Files\gs\gs10.xx.x\bin\gswin64c.exe

   # Copy to:
   src-tauri\binaries\gs-x86_64-pc-windows-msvc.exe
   ```
4. Build:
   ```bash
   npm run tauri build
   ```

   Output: `src-tauri\target\release\bundle\nsis\Crunch_x.x.x_x64-setup.exe`

---

## CI / Automated builds

Releases are built automatically via GitHub Actions (`.github/workflows/build.yml`) on every version tag push:

```bash
git tag v1.0.0
git push origin v1.0.0
```

This triggers two parallel jobs:
- **macOS** (`macos-latest`) — universal binary (ARM64 + x86_64) via `lipo`, produces a `.dmg`
- **Windows** (`windows-latest`) — x64 build via MSVC, produces `.exe` and `.msi`

All artifacts are uploaded automatically to the GitHub Release for that tag.
