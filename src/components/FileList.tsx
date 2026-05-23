import { AnimatePresence } from "framer-motion"
import { Plus, Trash2 } from "lucide-react"
import { open } from "@tauri-apps/plugin-dialog"
import { invoke } from "@tauri-apps/api/core"
import { useAppStore } from "../store/useAppStore"
import FileListItem from "./FileListItem"
import HistoryPanel from "./HistoryPanel"

const ACCEPTED_EXTENSIONS = ["jpg", "jpeg", "png", "webp", "heic", "tiff", "tif", "pdf"]

export default function FileList() {
  const files = useAppStore((s) => s.files)
  const removeFile = useAppStore((s) => s.removeFile)
  const clearFiles = useAppStore((s) => s.clearFiles)
  const addFiles = useAppStore((s) => s.addFiles)
  const setThumbnail = useAppStore((s) => s.setThumbnail)
  const setPreviewFileId = useAppStore((s) => s.setPreviewFileId)
  const setEditingFileId = useAppStore((s) => s.setEditingFileId)

  const handleAddMore = async () => {
    const selected = await open({
      multiple: true,
      filters: [{ name: "Supported Files", extensions: ACCEPTED_EXTENSIONS }],
    })
    if (!selected) return
    const paths = Array.isArray(selected) ? selected : [selected]
    const infos = await Promise.all(
      paths.map(async (path) => {
        try {
          const info = await invoke<{ size: number; name: string }>("get_file_info", { path })
          return { path, name: info.name, size: info.size }
        } catch {
          return null
        }
      })
    )
    const valid = infos.filter(Boolean) as { path: string; name: string; size: number }[]
    addFiles(valid)

    for (const f of valid) {
      const storeFile = useAppStore.getState().files.find((sf) => sf.path === f.path)
      if (!storeFile) continue
      invoke<string>("get_thumbnail", { path: f.path })
        .then((thumb) => setThumbnail(storeFile.id, thumb))
        .catch(() => {})
    }
  }

  if (files.length === 0) return null

  return (
    <div className="flex flex-col h-full min-h-0">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-dark-border flex-shrink-0">
        <span className="text-dark-muted text-sm">
          <span className="text-dark-text font-medium">{files.length}</span> file{files.length !== 1 ? "s" : ""} added
        </span>
        <div className="flex items-center gap-2">
          <HistoryPanel />
          <button
            onClick={handleAddMore}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs text-dark-muted hover:text-neon-cyan hover:bg-neon-cyan/10 border border-dark-border hover:border-neon-cyan/30 transition-all"
          >
            <Plus size={12} />
            Add more
          </button>
          <button
            onClick={clearFiles}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs text-dark-muted hover:text-red-400 hover:bg-red-500/10 border border-dark-border hover:border-red-500/30 transition-all"
          >
            <Trash2 size={12} />
            Clear all
          </button>
        </div>
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        <AnimatePresence initial={false}>
          {files.map((file) => (
            <FileListItem
              key={file.id}
              file={file}
              onRemove={removeFile}
              onPreview={setPreviewFileId}
              onEdit={setEditingFileId}
            />
          ))}
        </AnimatePresence>
      </div>
    </div>
  )
}
