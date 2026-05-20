import { motion } from "framer-motion"
import { X, Eye, FileText, Loader2, CheckCircle2, AlertCircle } from "lucide-react"
import { AppFile } from "../store/useAppStore"
import { formatBytes } from "../lib/utils"

interface Props {
  file: AppFile
  onRemove: (id: string) => void
  onPreview: (id: string) => void
}

const statusIcon = {
  idle: null,
  compressing: <Loader2 size={14} className="text-neon-cyan animate-spin" />,
  done: <CheckCircle2 size={14} className="text-neon-green" />,
  error: <AlertCircle size={14} className="text-red-400" />,
}

export default function FileListItem({ file, onRemove, onPreview }: Props) {
  const savings =
    file.compressedSize && file.originalSize
      ? Math.round(((file.originalSize - file.compressedSize) / file.originalSize) * 100)
      : null

  return (
    <motion.div
      layout
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 20 }}
      className="flex items-center gap-3 px-3 py-2.5 rounded-xl bg-dark-card border border-dark-border hover:border-dark-border/80 group transition-colors"
    >
      {/* Thumbnail */}
      <div className="w-10 h-10 rounded-lg overflow-hidden bg-dark-surface flex-shrink-0 flex items-center justify-center border border-dark-border">
        {file.thumbnail ? (
          <img src={file.thumbnail} alt={file.name} className="w-full h-full object-cover" />
        ) : file.type === "pdf" ? (
          <FileText size={18} className="text-neon-purple" />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-neon-pink/20 to-neon-purple/20" />
        )}
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <p className="text-dark-text text-sm font-medium truncate">{file.name}</p>
          {statusIcon[file.status]}
        </div>

        <div className="flex items-center gap-2 mt-0.5">
          <span className="text-dark-muted text-xs">{formatBytes(file.originalSize)}</span>
          {file.compressedSize && (
            <>
              <span className="text-dark-border text-xs">→</span>
              <span className="text-neon-green text-xs font-medium">
                {formatBytes(file.compressedSize)}
              </span>
              {savings !== null && (
                <span className="text-neon-cyan text-xs">−{savings}%</span>
              )}
            </>
          )}
          {file.error && (
            <span className="text-red-400 text-xs truncate">{file.error}</span>
          )}
        </div>

        {/* Progress bar */}
        {file.status === "compressing" && (
          <div className="mt-1.5 h-1 bg-dark-surface rounded-full overflow-hidden">
            <motion.div
              className="h-full bg-gradient-to-r from-neon-cyan to-neon-purple rounded-full"
              initial={{ width: "0%" }}
              animate={{ width: `${file.progress}%` }}
              transition={{ ease: "easeOut" }}
            />
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        {file.status === "done" && (
          <button
            onClick={() => onPreview(file.id)}
            className="w-7 h-7 rounded-lg flex items-center justify-center text-dark-muted hover:text-neon-cyan hover:bg-neon-cyan/10 transition-colors"
          >
            <Eye size={14} />
          </button>
        )}
        <button
          onClick={() => onRemove(file.id)}
          className="w-7 h-7 rounded-lg flex items-center justify-center text-dark-muted hover:text-red-400 hover:bg-red-500/10 transition-colors"
        >
          <X size={14} />
        </button>
      </div>
    </motion.div>
  )
}
