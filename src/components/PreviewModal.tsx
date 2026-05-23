import { motion, AnimatePresence } from "framer-motion"
import { X, ChevronLeft, ChevronRight, ZoomIn, ZoomOut, RotateCcw } from "lucide-react"
import { TransformWrapper, TransformComponent, useControls } from "react-zoom-pan-pinch"
import { convertFileSrc } from "@tauri-apps/api/core"
import { useAppStore } from "../store/useAppStore"
import { formatBytes } from "../lib/utils"
import { useState } from "react"

function ZoomControls() {
  const { zoomIn, zoomOut, resetTransform } = useControls()
  return (
    <div className="flex items-center gap-1 bg-dark-surface/80 backdrop-blur-sm rounded-lg p-0.5 border border-dark-border">
      <button
        onClick={() => zoomIn()}
        className="w-6 h-6 rounded flex items-center justify-center text-dark-muted hover:text-neon-cyan transition-colors"
      >
        <ZoomIn size={12} />
      </button>
      <button
        onClick={() => zoomOut()}
        className="w-6 h-6 rounded flex items-center justify-center text-dark-muted hover:text-neon-cyan transition-colors"
      >
        <ZoomOut size={12} />
      </button>
      <button
        onClick={() => resetTransform()}
        className="w-6 h-6 rounded flex items-center justify-center text-dark-muted hover:text-neon-cyan transition-colors"
      >
        <RotateCcw size={12} />
      </button>
    </div>
  )
}

interface PaneHeaderProps {
  label: string
  size: number
  accent?: "muted" | "green"
}

function PaneHeader({ label, size, accent = "muted" }: PaneHeaderProps) {
  return (
    <div className="px-4 py-2 border-b border-dark-border flex items-center justify-between bg-dark-card/60 flex-shrink-0">
      <span className={`text-xs font-semibold uppercase tracking-wider ${accent === "green" ? "text-neon-green" : "text-dark-muted"}`}>
        {label}
      </span>
      <span className={`text-xs font-mono ${accent === "green" ? "text-neon-green" : "text-dark-muted"}`}>
        {formatBytes(size)}
      </span>
    </div>
  )
}

interface ImagePaneProps {
  src: string
  label: string
  size: number
  accent?: "muted" | "green"
}

function ImagePane({ src, label, size, accent = "muted" }: ImagePaneProps) {
  const [loaded, setLoaded] = useState(false)
  const [error, setError] = useState(false)

  return (
    <div className="flex flex-col min-h-0 min-w-0">
      <PaneHeader label={label} size={size} accent={accent} />

      <div className="flex-1 overflow-hidden relative bg-[#0a0a14]">
        <TransformWrapper
          minScale={0.1}
          maxScale={8}
          initialScale={1}
          centerOnInit
          limitToBounds={false}
        >
          {() => (
            <>
              <div className="absolute top-2 right-2 z-10">
                <ZoomControls />
              </div>
              <TransformComponent
                wrapperStyle={{ width: "100%", height: "100%" }}
                contentStyle={{
                  width: "100%",
                  height: "100%",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                {error ? (
                  <div className="flex flex-col items-center gap-2 text-dark-muted">
                    <span className="text-2xl">⚠</span>
                    <span className="text-xs">Could not load image</span>
                    <span className="text-xs opacity-50 max-w-48 text-center break-all">{src}</span>
                  </div>
                ) : (
                  <img
                    src={src}
                    alt={label}
                    onLoad={() => setLoaded(true)}
                    onError={() => setError(true)}
                    className={`max-w-full max-h-full object-contain transition-opacity duration-300 ${loaded ? "opacity-100" : "opacity-0"}`}
                    style={{ imageRendering: "auto" }}
                  />
                )}
                {!loaded && !error && (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="w-6 h-6 border-2 border-neon-cyan/30 border-t-neon-cyan rounded-full animate-spin" />
                  </div>
                )}
              </TransformComponent>
            </>
          )}
        </TransformWrapper>
      </div>
    </div>
  )
}

interface PdfPaneProps {
  src: string
  label: string
  size: number
  page: number
  accent?: "muted" | "green"
}

function PdfPane({ src, label, size, page, accent = "muted" }: PdfPaneProps) {
  return (
    <div className="flex flex-col min-h-0 min-w-0">
      <PaneHeader label={label} size={size} accent={accent} />

      <div className="flex-1 overflow-hidden relative bg-[#0a0a14]">
        {src ? (
          <iframe
            key={`${src}-${page}`}
            src={`${src}#page=${page + 1}`}
            className="w-full h-full border-0"
            title={label}
          />
        ) : (
          <div className="flex items-center justify-center h-full">
            <span className="text-dark-muted text-xs">Not yet compressed</span>
          </div>
        )}
      </div>
    </div>
  )
}

export default function PreviewModal() {
  const previewFileId = useAppStore((s) => s.previewFileId)
  const setPreviewFileId = useAppStore((s) => s.setPreviewFileId)
  const files = useAppStore((s) => s.files)
  const [page, setPage] = useState(0)

  const file = files.find((f) => f.id === previewFileId)

  const originalSrc = file ? convertFileSrc(file.path) : ""
  const compressedSrc = file?.outputPath ? convertFileSrc(file.outputPath) : ""

  const savings =
    file?.compressedSize && file?.originalSize
      ? Math.round(((file.originalSize - file.compressedSize) / file.originalSize) * 100)
      : null

  return (
    <AnimatePresence>
      {file && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 bg-dark-bg/95 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={(e) => {
            if (e.target === e.currentTarget) setPreviewFileId(null)
          }}
        >
          <motion.div
            initial={{ scale: 0.93, opacity: 0, y: 12 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.93, opacity: 0, y: 12 }}
            transition={{ type: "spring", stiffness: 320, damping: 28 }}
            className="bg-dark-surface rounded-2xl border border-dark-border w-full max-w-6xl flex flex-col overflow-hidden"
            style={{ height: "88vh" }}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-3 border-b border-dark-border flex-shrink-0 bg-dark-card/40">
              <div className="flex items-center gap-4">
                <div>
                  <p className="text-dark-text font-medium text-sm">{file.name}</p>
                  {savings !== null && (
                    <p className="text-dark-muted text-xs mt-0.5">
                      {formatBytes(file.originalSize)} → {formatBytes(file.compressedSize!)}
                      <span className="text-neon-green ml-2 font-semibold">−{savings}% smaller</span>
                    </p>
                  )}
                </div>
              </div>
              <button
                onClick={() => setPreviewFileId(null)}
                className="w-8 h-8 rounded-lg flex items-center justify-center text-dark-muted hover:text-red-400 hover:bg-red-500/10 transition-colors"
              >
                <X size={16} />
              </button>
            </div>

            {/* Side-by-side panes */}
            <div className="flex-1 grid grid-cols-2 min-h-0 divide-x divide-dark-border">
              {file.type === "pdf" ? (
                <>
                  <PdfPane src={originalSrc} label="Original" size={file.originalSize} page={page} accent="muted" />
                  <PdfPane src={compressedSrc} label="Compressed" size={file.compressedSize ?? 0} page={page} accent="green" />
                </>
              ) : (
                <>
                  <ImagePane src={originalSrc} label="Original" size={file.originalSize} accent="muted" />
                  <ImagePane src={compressedSrc} label="Compressed" size={file.compressedSize ?? 0} accent="green" />
                </>
              )}
            </div>

            {/* PDF page nav */}
            {file.type === "pdf" && (
              <div className="flex items-center justify-center gap-4 px-5 py-2.5 border-t border-dark-border flex-shrink-0 bg-dark-card/30">
                <button
                  onClick={() => setPage((p) => Math.max(0, p - 1))}
                  disabled={page === 0}
                  className="w-7 h-7 rounded-lg flex items-center justify-center text-dark-muted hover:text-neon-cyan disabled:opacity-30 transition-colors"
                >
                  <ChevronLeft size={16} />
                </button>
                <span className="text-xs text-dark-muted tabular-nums">Page {page + 1}</span>
                <button
                  onClick={() => setPage((p) => p + 1)}
                  className="w-7 h-7 rounded-lg flex items-center justify-center text-dark-muted hover:text-neon-cyan transition-colors"
                >
                  <ChevronRight size={16} />
                </button>
              </div>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
