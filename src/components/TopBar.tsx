import { useEffect, useState } from "react"
import { motion } from "framer-motion"
import { Maximize2, Minimize2, X, Minus } from "lucide-react"
import { getCurrentWindow } from "@tauri-apps/api/window"

export default function TopBar() {
  const [isMaximized, setIsMaximized] = useState(false)

  useEffect(() => {
    const win = getCurrentWindow()

    win.isMaximized().then(setIsMaximized)

    let unlisten: (() => void) | undefined
    win.onResized(() => {
      win.isMaximized().then(setIsMaximized)
    }).then((fn) => { unlisten = fn })

    return () => { unlisten?.() }
  }, [])

  const minimize = () => getCurrentWindow().minimize()
  const toggleMaximize = () => getCurrentWindow().toggleMaximize()
  const close = () => getCurrentWindow().close()

  return (
    <div className="relative flex items-center justify-between px-4 h-12 bg-dark-surface border-b border-dark-border select-none flex-shrink-0">
      {/* Drag region sits behind all interactive elements */}
      <div data-tauri-drag-region className="absolute inset-0" />

      {/* Logo */}
      <div className="relative z-10 flex items-center gap-2.5">
        {/* Icon: two rectangles that squish together — the "crunch" motion */}
        <div className="relative w-7 h-7 flex items-center justify-center">
          <motion.div
            className="absolute w-7 h-3 rounded-md bg-gradient-to-r from-neon-pink to-neon-purple"
            animate={{ y: [0, 5, 0], scaleX: [1, 0.82, 1] }}
            transition={{ duration: 1.8, repeat: Infinity, ease: [0.4, 0, 0.2, 1], repeatDelay: 1.4 }}
          />
          <motion.div
            className="absolute w-7 h-3 rounded-md bg-gradient-to-r from-neon-purple to-neon-cyan"
            animate={{ y: [0, -5, 0], scaleX: [1, 0.82, 1] }}
            transition={{ duration: 1.8, repeat: Infinity, ease: [0.4, 0, 0.2, 1], repeatDelay: 1.4 }}
          />
        </div>

        {/* Wordmark */}
        <span className="font-bold text-dark-text text-sm tracking-wide">
          <span className="text-gradient">Crunch</span>
        </span>
      </div>

      {/* Window controls */}
      <div className="relative z-10 flex items-center gap-1">
        <button
          onClick={minimize}
          className="w-7 h-7 rounded-md flex items-center justify-center text-dark-muted hover:text-dark-text hover:bg-dark-card transition-colors"
        >
          <Minus size={14} />
        </button>
        <button
          onClick={toggleMaximize}
          title={isMaximized ? "Restore" : "Maximize"}
          className="w-7 h-7 rounded-md flex items-center justify-center text-dark-muted hover:text-dark-text hover:bg-dark-card transition-colors"
        >
          {isMaximized ? <Minimize2 size={14} /> : <Maximize2 size={14} />}
        </button>
        <button
          onClick={close}
          className="w-7 h-7 rounded-md flex items-center justify-center text-dark-muted hover:text-red-400 hover:bg-red-500/10 transition-colors"
        >
          <X size={14} />
        </button>
      </div>
    </div>
  )
}
