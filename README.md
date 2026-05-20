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

The built DMG is located at:

```
src-tauri/target/release/bundle/dmg/Crunch_0.1.0_aarch64.dmg
```

1. Open `Crunch_0.1.0_aarch64.dmg`
2. Drag **Crunch** into your **Applications** folder
3. On first launch, right-click the app → **Open** (macOS Gatekeeper will ask you to confirm once since the app isn't notarized)
4. After that, open it normally from Launchpad or Spotlight

> Supports Apple Silicon (M1/M2/M3). An Intel build can be produced by running on an Intel Mac or via the GitHub Actions workflow.

### Windows

Windows cannot be built from macOS. Use one of these two approaches:

#### Option 1 — GitHub Actions (recommended)

Push a version tag to trigger an automated Windows build:

```bash
git tag v0.1.0
git push origin v0.1.0
```

The workflow (`.github/workflows/build.yml`) runs on a `windows-latest` runner, installs Ghostscript via Chocolatey, builds the app, and uploads a `.exe` installer as a GitHub Release asset. The build takes ~10–15 minutes.

Download the resulting `Crunch_0.1.0_x64-setup.exe` from the **Releases** page on GitHub, run it, and Crunch will appear in the Start Menu.

> Windows SmartScreen may show a warning on first run — click **More info → Run anyway**. This happens because the app isn't code-signed yet.

#### Option 2 — Build on a Windows machine

1. Install [Rust](https://rustup.rs/) 1.85+, [Node.js](https://nodejs.org/) 18+, and [Ghostscript](https://www.ghostscript.com/releases/gsdnld.html) for Windows
2. Clone the repo and install dependencies:
   ```bash
   git clone https://github.com/aromalsbabuailearning1-web/Crunch.git
   cd Crunch
   npm install
   ```
3. Copy the Ghostscript executable into the sidecar folder:
   ```
   # Default Ghostscript install path on Windows:
   C:\Program Files\gs\gs10.07.0\bin\gswin64c.exe
   
   # Copy it to:
   src-tauri\binaries\gs-x86_64-pc-windows-msvc.exe
   ```
4. Build:
   ```bash
   npm run tauri build
   ```
5. The installer is output to:
   ```
   src-tauri\target\release\bundle\nsis\Crunch_0.1.0_x64-setup.exe
   ```

---

## How to use

1. **Add files** — drag images or PDFs onto the drop zone, or click it to browse
2. **Pick a level** — choose Light, Balanced, or Aggressive, or fine-tune with the quality slider
3. **Compress** — hit the **Compress** button; progress shows per file
4. **Preview** — click the eye icon on any finished file to compare original vs compressed side by side
5. **Find your files** — compressed files are saved next to the originals by default (with `_compressed` added to the name), or in a folder you choose

---

## Building from source (macOS)

**Requirements:** Rust 1.85+, Node.js 18+, Ghostscript

```bash
git clone https://github.com/aromalsbabuailearning1-web/Crunch.git
cd Crunch
npm install

# Install Ghostscript and copy the binary into the sidecar folder:
brew install ghostscript
mkdir -p src-tauri/binaries
cp "$(which gs)" src-tauri/binaries/gs-aarch64-apple-darwin   # Apple Silicon
# or
cp "$(which gs)" src-tauri/binaries/gs-x86_64-apple-darwin    # Intel

npm run tauri dev       # development
npm run tauri build     # production build
```

Output lands in `src-tauri/target/release/bundle/`.
