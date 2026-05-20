import { motion, AnimatePresence } from "framer-motion"
import { History, X } from "lucide-react"
import { useState } from "react"
import { useAppStore } from "../store/useAppStore"
import { formatBytes } from "../lib/utils"

export default function HistoryPanel() {
  const [open, setOpen] = useState(false)
  const history = useAppStore((s) => s.history)

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs text-dark-muted hover:text-neon-purple hover:bg-neon-purple/10 border border-dark-border hover:border-neon-purple/30 transition-all"
      >
        <History size={12} />
        History
        {history.length > 0 && (
          <span className="bg-neon-purple/20 text-neon-purple rounded-full px-1.5 py-0.5 text-xs leading-none">
            {history.length}
          </span>
        )}
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-40 bg-dark-bg/80 backdrop-blur-sm flex items-center justify-center p-6"
            onClick={(e) => { if (e.target === e.currentTarget) setOpen(false) }}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 10 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 10 }}
              className="bg-dark-surface border border-dark-border rounded-2xl w-full max-w-md overflow-hidden"
            >
              <div className="flex items-center justify-between px-5 py-4 border-b border-dark-border">
                <span className="text-dark-text font-medium text-sm">Recent Compressions</span>
                <button
                  onClick={() => setOpen(false)}
                  className="w-7 h-7 rounded-lg flex items-center justify-center text-dark-muted hover:text-dark-text hover:bg-dark-card transition-colors"
                >
                  <X size={14} />
                </button>
              </div>

              <div className="max-h-80 overflow-y-auto p-3 space-y-2">
                {history.length === 0 ? (
                  <p className="text-dark-muted text-xs text-center py-8">No compressions yet</p>
                ) : (
                  history.map((entry) => {
                    const savings = Math.round(
                      ((entry.originalSize - entry.compressedSize) / entry.originalSize) * 100
                    )
                    return (
                      <div
                        key={entry.id}
                        className="flex items-center gap-3 px-3 py-2.5 rounded-lg bg-dark-card border border-dark-border"
                      >
                        <div className="flex-1 min-w-0">
                          <p className="text-dark-text text-xs font-medium truncate">{entry.name}</p>
                          <p className="text-dark-muted text-xs mt-0.5">
                            {formatBytes(entry.originalSize)} → {formatBytes(entry.compressedSize)}
                          </p>
                        </div>
                        <span className="text-neon-green text-xs font-medium flex-shrink-0">
                          −{savings}%
                        </span>
                      </div>
                    )
                  })
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}
