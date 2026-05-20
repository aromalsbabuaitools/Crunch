import { useCallback, useEffect, useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Upload, ImageIcon, FileText } from "lucide-react"
import { getCurrentWindow } from "@tauri-apps/api/window"
import { open } from "@tauri-apps/plugin-dialog"
import { invoke } from "@tauri-apps/api/core"
import { useAppStore } from "../store/useAppStore"

const ACCEPTED_EXTENSIONS = ["jpg", "jpeg", "png", "webp", "heic", "tiff", "tif", "pdf"]

function isAccepted(path: string): boolean {
  const ext = path.split(".").pop()?.toLowerCase() ?? ""
  return ACCEPTED_EXTENSIONS.includes(ext)
}

export default function DropZone() {
  const [isDragOver, setIsDragOver] = useState(false)
  const addFiles = useAppStore((s) => s.addFiles)
  const setThumbnail = useAppStore((s) => s.setThumbnail)
  const files = useAppStore((s) => s.files)

  const loadFileMeta = useCallback(
    async (paths: string[]) => {
      const infos = await Promise.all(
        paths.filter(isAccepted).map(async (path) => {
          try {
            const info = await invoke<{ size: number; name: string; type: string }>(
              "get_file_info",
              { path }
            )
            return { path, name: info.name, size: info.size }
          } catch {
            return null
          }
        })
      )
      const valid = infos.filter(Boolean) as { path: string; name: string; size: number }[]
      addFiles(valid)

      // Load thumbnails async
      for (const f of valid) {
        const storeFile = useAppStore
          .getState()
          .files.find((sf) => sf.path === f.path)
        if (!storeFile) continue
        invoke<string>("get_thumbnail", { path: f.path })
          .then((thumb) => setThumbnail(storeFile.id, thumb))
          .catch(() => {})
      }
    },
    [addFiles, setThumbnail]
  )

  useEffect(() => {
    const win = getCurrentWindow()
    const unlisten = win.onDragDropEvent(async (event) => {
      if (event.payload.type === "enter" || event.payload.type === "over") {
        setIsDragOver(true)
      } else if (event.payload.type === "drop") {
        setIsDragOver(false)
        const paths = event.payload.paths
        await loadFileMeta(paths)
      } else {
        setIsDragOver(false)
      }
    })
    return () => {
      unlisten.then((f) => f())
    }
  }, [loadFileMeta])

  const handleClick = async () => {
    const selected = await open({
      multiple: true,
      filters: [
        {
          name: "Supported Files",
          extensions: ACCEPTED_EXTENSIONS,
        },
      ],
    })
    if (!selected) return
    const paths = Array.isArray(selected) ? selected : [selected]
    await loadFileMeta(paths)
  }

  if (files.length > 0) return null

  return (
    <motion.div
      className="flex-1 flex items-center justify-center p-8"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
    >
      <motion.div
        onClick={handleClick}
        animate={isDragOver ? { scale: 1.02 } : { scale: 1 }}
        className={`
          relative w-full max-w-2xl aspect-[16/9] rounded-2xl border-2 border-dashed cursor-pointer
          flex flex-col items-center justify-center gap-6 transition-all duration-300
          ${isDragOver
            ? "border-neon-cyan bg-neon-cyan/5 glow-cyan"
            : "border-dark-border bg-dark-card/40 hover:border-neon-purple/60 hover:bg-dark-card/70"
          }
        `}
      >
        {/* Animated background gradient */}
        <AnimatePresence>
          {isDragOver && (
            <motion.div
              className="absolute inset-0 rounded-2xl bg-gradient-to-br from-neon-cyan/10 via-neon-purple/5 to-neon-pink/10"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            />
          )}
        </AnimatePresence>

        {/* Icon cluster */}
        <div className="relative flex items-center gap-3">
          <motion.div
            animate={{ y: isDragOver ? -8 : 0 }}
            transition={{ type: "spring", stiffness: 300 }}
            className="w-12 h-12 rounded-xl bg-dark-surface border border-dark-border flex items-center justify-center text-neon-pink"
          >
            <ImageIcon size={22} />
          </motion.div>
          <motion.div
            animate={{ y: isDragOver ? -12 : 0 }}
            transition={{ type: "spring", stiffness: 300, delay: 0.05 }}
            className="w-16 h-16 rounded-2xl bg-gradient-to-br from-neon-purple/20 to-neon-cyan/20 border border-neon-purple/30 flex items-center justify-center"
          >
            <motion.div
              animate={isDragOver ? { rotate: 15 } : { rotate: 0 }}
              className="text-neon-cyan"
            >
              <Upload size={28} />
            </motion.div>
          </motion.div>
          <motion.div
            animate={{ y: isDragOver ? -8 : 0 }}
            transition={{ type: "spring", stiffness: 300, delay: 0.1 }}
            className="w-12 h-12 rounded-xl bg-dark-surface border border-dark-border flex items-center justify-center text-neon-purple"
          >
            <FileText size={22} />
          </motion.div>
        </div>

        {/* Text */}
        <div className="text-center relative z-10">
          <p className="text-dark-text font-medium text-lg mb-1">
            {isDragOver ? "Release to add files" : "Drop PDFs & Images here"}
          </p>
          <p className="text-dark-muted text-sm">
            or <span className="text-neon-cyan underline">click to browse</span>
            {" · "}JPG, PNG, WEBP, HEIC, TIFF, PDF
          </p>
        </div>

        {/* Corner accents */}
        <div className="absolute top-3 left-3 w-4 h-4 border-t-2 border-l-2 border-neon-purple/40 rounded-tl-md" />
        <div className="absolute top-3 right-3 w-4 h-4 border-t-2 border-r-2 border-neon-cyan/40 rounded-tr-md" />
        <div className="absolute bottom-3 left-3 w-4 h-4 border-b-2 border-l-2 border-neon-cyan/40 rounded-bl-md" />
        <div className="absolute bottom-3 right-3 w-4 h-4 border-b-2 border-r-2 border-neon-purple/40 rounded-br-md" />
      </motion.div>
    </motion.div>
  )
}
