import { motion } from "framer-motion"
import { Zap, FolderOpen } from "lucide-react"
import { open } from "@tauri-apps/plugin-dialog"
import { invoke } from "@tauri-apps/api/core"
import { listen } from "@tauri-apps/api/event"
import { useAppStore, CompressionPreset } from "../store/useAppStore"
import { deriveOutputPath } from "../lib/utils"
import { formatBytes } from "../lib/utils"
import { useEffect } from "react"

const PRESETS: { label: string; key: CompressionPreset; color: string }[] = [
  { label: "Light", key: "light", color: "text-neon-green" },
  { label: "Balanced", key: "balanced", color: "text-neon-cyan" },
  { label: "Aggressive", key: "aggressive", color: "text-neon-pink" },
]

export default function ControlPanel() {
  const files = useAppStore((s) => s.files)
  const quality = useAppStore((s) => s.quality)
  const preset = useAppStore((s) => s.preset)
  const outputDir = useAppStore((s) => s.outputDir)
  const setQuality = useAppStore((s) => s.setQuality)
  const setPreset = useAppStore((s) => s.setPreset)
  const setOutputDir = useAppStore((s) => s.setOutputDir)
  const setFileStatus = useAppStore((s) => s.setFileStatus)
  const setFileProgress = useAppStore((s) => s.setFileProgress)
  const addToHistory = useAppStore((s) => s.addToHistory)

  const idleFiles = files.filter((f) => f.status === "idle" || f.status === "error")
  const doneFiles = files.filter((f) => f.status === "done")
  const canCompress = idleFiles.length > 0

  // Listen for progress events from Rust
  useEffect(() => {
    const unlisten = listen<{ id: string; percent: number }>("compress://progress", (e) => {
      setFileProgress(e.payload.id, e.payload.percent)
    })
    return () => {
      unlisten.then((f) => f())
    }
  }, [setFileProgress])

  const handleSelectOutputDir = async () => {
    const dir = await open({ directory: true, multiple: false })
    if (dir && typeof dir === "string") setOutputDir(dir)
  }

  const handleCompress = async () => {
    const toCompress = files.filter((f) => f.status === "idle" || f.status === "error")
    for (const file of toCompress) {
      setFileStatus(file.id, "compressing", { progress: 0 })

      const outPath = outputDir
        ? `${outputDir}/${file.name.replace(/(\.[^.]+)$/, "_compressed$1")}`
        : deriveOutputPath(file.path)

      try {
        let result: { output_path: string; original_size: number; compressed_size: number }

        if (file.type === "pdf") {
          result = await invoke("compress_pdf", {
            path: file.path,
            quality,
            outputPath: outPath,
          })
        } else {
          result = await invoke("compress_image", {
            path: file.path,
            quality,
            outputPath: outPath,
          })
        }

        setFileStatus(file.id, "done", {
          compressedSize: result.compressed_size,
          outputPath: result.output_path,
          progress: 100,
        })

        addToHistory({
          id: crypto.randomUUID(),
          name: file.name,
          originalSize: file.originalSize,
          compressedSize: result.compressed_size,
          timestamp: Date.now(),
        })
      } catch (e) {
        setFileStatus(file.id, "error", { error: String(e) })
      }
    }
  }

  const totalSaved = doneFiles.reduce((acc, f) => {
    return acc + (f.originalSize - (f.compressedSize ?? f.originalSize))
  }, 0)

  return (
    <div className="w-72 flex-shrink-0 flex flex-col border-l border-dark-border bg-dark-surface p-4 gap-5">
      {/* Quality presets */}
      <div>
        <label className="text-dark-muted text-xs font-medium uppercase tracking-widest mb-3 block">
          Compression Level
        </label>
        <div className="grid grid-cols-3 gap-2 mb-4">
          {PRESETS.map((p) => (
            <button
              key={p.key}
              onClick={() => setPreset(p.key)}
              className={`
                py-2 rounded-lg text-xs font-medium border transition-all
                ${preset === p.key
                  ? `bg-dark-card border-neon-purple/50 ${p.color} glow-purple`
                  : "bg-dark-card border-dark-border text-dark-muted hover:border-dark-border/80"
                }
              `}
            >
              {p.label}
            </button>
          ))}
        </div>

        {/* Quality slider */}
        <div className="space-y-2">
          <div className="flex justify-between text-xs">
            <span className="text-dark-muted">Quality</span>
            <span className="text-neon-cyan font-mono font-medium">{quality}%</span>
          </div>
          <div className="relative">
            <input
              type="range"
              min={10}
              max={95}
              value={quality}
              onChange={(e) => {
                const q = Number(e.target.value)
                setQuality(q)
                // Auto-detect preset
                if (q >= 75) setPreset("light")
                else if (q >= 50) setPreset("balanced")
                else setPreset("aggressive")
              }}
              className="w-full h-1.5 rounded-full appearance-none cursor-pointer
                [&::-webkit-slider-thumb]:appearance-none
                [&::-webkit-slider-thumb]:w-4
                [&::-webkit-slider-thumb]:h-4
                [&::-webkit-slider-thumb]:rounded-full
                [&::-webkit-slider-thumb]:bg-neon-cyan
                [&::-webkit-slider-thumb]:shadow-[0_0_8px_rgba(0,212,255,0.8)]
                [&::-webkit-slider-thumb]:cursor-pointer"
              style={{
                background: `linear-gradient(to right, #00D4FF ${quality}%, #2A2A4A ${quality}%)`,
              }}
            />
          </div>
        </div>
      </div>

      {/* Output folder */}
      <div>
        <label className="text-dark-muted text-xs font-medium uppercase tracking-widest mb-2 block">
          Output Folder
        </label>
        <button
          onClick={handleSelectOutputDir}
          className="w-full flex items-center gap-2 px-3 py-2.5 rounded-lg bg-dark-card border border-dark-border hover:border-neon-purple/40 transition-colors text-left"
        >
          <FolderOpen size={14} className="text-neon-purple flex-shrink-0" />
          <span className="text-xs text-dark-muted truncate flex-1">
            {outputDir ?? "Same folder (auto)"}
          </span>
        </button>
      </div>

      {/* Stats */}
      {doneFiles.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-dark-card rounded-xl border border-neon-green/20 p-3 space-y-1.5"
        >
          <p className="text-xs text-dark-muted">Results</p>
          <div className="flex justify-between text-xs">
            <span className="text-dark-muted">Compressed</span>
            <span className="text-neon-green font-medium">{doneFiles.length} files</span>
          </div>
          <div className="flex justify-between text-xs">
            <span className="text-dark-muted">Total saved</span>
            <span className="text-neon-cyan font-medium">{formatBytes(totalSaved)}</span>
          </div>
        </motion.div>
      )}

      {/* Spacer */}
      <div className="flex-1" />

      {/* Compress button */}
      <motion.button
        onClick={handleCompress}
        disabled={!canCompress}
        whileHover={canCompress ? { scale: 1.02 } : {}}
        whileTap={canCompress ? { scale: 0.98 } : {}}
        className={`
          relative w-full py-3.5 rounded-xl font-semibold text-sm flex items-center justify-center gap-2
          overflow-hidden transition-all
          ${canCompress
            ? "bg-gradient-to-r from-neon-pink via-neon-purple to-neon-cyan text-white shadow-lg shadow-neon-purple/30 hover:shadow-neon-purple/50"
            : "bg-dark-card text-dark-muted border border-dark-border cursor-not-allowed"
          }
        `}
      >
        {canCompress && (
          <motion.div
            className="absolute inset-0 shimmer-bg"
            animate={{ backgroundPosition: ["200% 0", "-200% 0"] }}
            transition={{ duration: 2.5, repeat: Infinity, ease: "linear" }}
          />
        )}
        <Zap size={16} className="relative z-10" />
        <span className="relative z-10">
          {canCompress
            ? `Compress ${idleFiles.length} file${idleFiles.length !== 1 ? "s" : ""}`
            : "No files to compress"}
        </span>
      </motion.button>
    </div>
  )
}
