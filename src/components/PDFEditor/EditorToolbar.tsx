import {
  MousePointer2,
  Type,
  Pen,
  Highlighter,
  Image as ImageIcon,
  Layers,
  Minus,
  Plus,
  Save,
  X,
  Trash2,
  Undo2,
} from "lucide-react"
import type { EditorTool, PDFFont, RGB } from "../../store/usePDFEditorStore"

interface Props {
  activeTool: EditorTool
  zoom: number
  penColor: RGB
  penWidth: number
  textFontSize: number
  textColor: RGB
  textFontFamily: PDFFont
  highlightColor: RGB
  highlightOpacity: number
  selectedEditId: string | null
  selectedTextFontSize: number | null
  selectedTextColor: RGB | null
  selectedTextFontFamily: string | null
  isSaving: boolean
  saveError: string | null
  onSetTool: (t: EditorTool) => void
  onSetZoom: (z: number) => void
  onSetPenColor: (c: RGB) => void
  onSetPenWidth: (w: number) => void
  onSetTextFontSize: (s: number) => void
  onSetTextColor: (c: RGB) => void
  onSetTextFontFamily: (f: PDFFont) => void
  onSetHighlightColor: (c: RGB) => void
  onSetHighlightOpacity: (o: number) => void
  canUndo: boolean
  onUndo: () => void
  onPickSignature: () => void
  onDeleteSelected: () => void
  onSave: () => void
  onClose: () => void
}

function rgbToHex(c: RGB): string {
  return (
    "#" +
    c
      .map((v) =>
        Math.round(v * 255)
          .toString(16)
          .padStart(2, "0")
      )
      .join("")
  )
}

function hexToRgb(hex: string): RGB {
  const r = parseInt(hex.slice(1, 3), 16) / 255
  const g = parseInt(hex.slice(3, 5), 16) / 255
  const b = parseInt(hex.slice(5, 7), 16) / 255
  return [r, g, b]
}

const TOOLS: { id: EditorTool; icon: React.ReactNode; label: string }[] = [
  { id: "select",    icon: <MousePointer2 size={16} />, label: "Select / Move" },
  { id: "text",      icon: <Type size={16} />,          label: "Insert Text" },
  { id: "pen",       icon: <Pen size={16} />,           label: "Freehand Draw" },
  { id: "highlight", icon: <Highlighter size={16} />,   label: "Highlight" },
  { id: "signature", icon: <ImageIcon size={16} />,     label: "Signature Image" },
  { id: "page",      icon: <Layers size={16} />,        label: "Page Management" },
]

export default function EditorToolbar({
  activeTool,
  zoom,
  penColor,
  penWidth,
  textFontSize,
  textColor,
  textFontFamily,
  highlightColor,
  highlightOpacity,
  selectedEditId,
  selectedTextFontSize,
  selectedTextColor,
  selectedTextFontFamily,
  isSaving,
  saveError,
  onSetTool,
  onSetZoom,
  onSetPenColor,
  onSetPenWidth,
  onSetTextFontSize,
  onSetTextColor,
  onSetTextFontFamily,
  onSetHighlightColor,
  onSetHighlightOpacity,
  canUndo,
  onUndo,
  onPickSignature,
  onDeleteSelected,
  onSave,
  onClose,
}: Props) {
  const hasSelectedText = selectedTextFontSize !== null
  // Effective values: if text is selected use its values, else use global defaults
  const effectiveFontSize = selectedTextFontSize ?? textFontSize
  const effectiveColor = selectedTextColor ?? textColor
  const effectiveFontFamily = (selectedTextFontFamily ?? textFontFamily) as PDFFont
  return (
    <div className="flex flex-col gap-3 w-[200px] flex-shrink-0 bg-dark-surface border-l border-dark-border p-3 overflow-y-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <span className="text-dark-text text-sm font-semibold">Editor</span>
        <button
          onClick={onClose}
          className="w-6 h-6 flex items-center justify-center rounded text-dark-muted hover:text-red-400 hover:bg-red-500/10 transition-colors"
        >
          <X size={14} />
        </button>
      </div>

      {/* Tools */}
      <div className="flex flex-col gap-1">
        <span className="text-dark-muted text-xs uppercase tracking-wider mb-1">Tools</span>
        {TOOLS.map((tool) => (
          <button
            key={tool.id}
            onClick={() => {
              if (tool.id === "signature") {
                onPickSignature()
              } else {
                onSetTool(tool.id)
              }
            }}
            className={`flex items-center gap-2 px-2 py-1.5 rounded-lg text-sm transition-colors text-left ${
              activeTool === tool.id
                ? "bg-neon-cyan/20 text-neon-cyan border border-neon-cyan/30"
                : "text-dark-muted hover:text-dark-text hover:bg-dark-card"
            }`}
          >
            {tool.icon}
            {tool.label}
          </button>
        ))}
      </div>

      {/* Tool options */}
      {(activeTool === "text" || hasSelectedText) && (
        <div className="flex flex-col gap-2 border-t border-dark-border pt-2">
          <span className="text-dark-muted text-xs uppercase tracking-wider">
            {hasSelectedText ? "Selected Text" : "Text Options"}
          </span>

          {/* Font size with +/- buttons for quick adjustment */}
          <label className="flex flex-col gap-1 text-xs text-dark-muted">
            Font Size
            <div className="flex items-center gap-1">
              <button
                onClick={() => onSetTextFontSize(Math.max(6, effectiveFontSize - 2))}
                className="w-7 h-7 flex items-center justify-center rounded bg-dark-card border border-dark-border text-dark-muted hover:text-dark-text text-sm"
              >−</button>
              <input
                type="number"
                min={6} max={144}
                value={effectiveFontSize}
                onChange={(e) => onSetTextFontSize(Number(e.target.value))}
                className="flex-1 bg-dark-card border border-dark-border rounded px-2 py-1 text-dark-text text-xs text-center"
              />
              <button
                onClick={() => onSetTextFontSize(Math.min(144, effectiveFontSize + 2))}
                className="w-7 h-7 flex items-center justify-center rounded bg-dark-card border border-dark-border text-dark-muted hover:text-dark-text text-sm"
              >+</button>
            </div>
          </label>

          <label className="flex flex-col gap-1 text-xs text-dark-muted">
            Font
            <select
              value={effectiveFontFamily}
              onChange={(e) => onSetTextFontFamily(e.target.value as PDFFont)}
              className="bg-dark-card border border-dark-border rounded px-2 py-1 text-dark-text text-xs"
            >
              <option value="Helvetica">Helvetica</option>
              <option value="Times-Roman">Times Roman</option>
              <option value="Courier">Courier</option>
            </select>
          </label>

          <label className="flex items-center justify-between text-xs text-dark-muted">
            Color
            <input
              type="color"
              value={rgbToHex(effectiveColor)}
              onChange={(e) => onSetTextColor(hexToRgb(e.target.value))}
              className="w-8 h-6 rounded cursor-pointer bg-transparent border border-dark-border"
            />
          </label>
        </div>
      )}

      {activeTool === "pen" && (
        <div className="flex flex-col gap-2 border-t border-dark-border pt-2">
          <span className="text-dark-muted text-xs uppercase tracking-wider">Pen Options</span>
          <label className="flex flex-col gap-1 text-xs text-dark-muted">
            Width
            <input
              type="range" min={1} max={20}
              value={penWidth}
              onChange={(e) => onSetPenWidth(Number(e.target.value))}
              className="accent-neon-cyan"
            />
          </label>
          <label className="flex items-center justify-between text-xs text-dark-muted">
            Color
            <input
              type="color"
              value={rgbToHex(penColor)}
              onChange={(e) => onSetPenColor(hexToRgb(e.target.value))}
              className="w-8 h-6 rounded cursor-pointer bg-transparent border border-dark-border"
            />
          </label>
        </div>
      )}

      {activeTool === "highlight" && (
        <div className="flex flex-col gap-2 border-t border-dark-border pt-2">
          <span className="text-dark-muted text-xs uppercase tracking-wider">Highlight</span>
          <label className="flex items-center justify-between text-xs text-dark-muted">
            Color
            <input
              type="color"
              value={rgbToHex(highlightColor)}
              onChange={(e) => onSetHighlightColor(hexToRgb(e.target.value))}
              className="w-8 h-6 rounded cursor-pointer bg-transparent border border-dark-border"
            />
          </label>
          <label className="flex flex-col gap-1 text-xs text-dark-muted">
            Opacity
            <input
              type="range" min={10} max={90}
              value={Math.round(highlightOpacity * 100)}
              onChange={(e) => onSetHighlightOpacity(Number(e.target.value) / 100)}
              className="accent-neon-cyan"
            />
          </label>
        </div>
      )}

      {/* Zoom */}
      <div className="flex flex-col gap-1 border-t border-dark-border pt-2">
        <span className="text-dark-muted text-xs uppercase tracking-wider">Zoom</span>
        <div className="flex items-center gap-2">
          <button
            onClick={() => onSetZoom(Math.max(0.25, zoom - 0.25))}
            className="w-7 h-7 flex items-center justify-center rounded bg-dark-card border border-dark-border text-dark-muted hover:text-dark-text"
          >
            <Minus size={12} />
          </button>
          <span className="text-dark-text text-xs flex-1 text-center">{Math.round(zoom * 100)}%</span>
          <button
            onClick={() => onSetZoom(Math.min(3, zoom + 0.25))}
            className="w-7 h-7 flex items-center justify-center rounded bg-dark-card border border-dark-border text-dark-muted hover:text-dark-text"
          >
            <Plus size={12} />
          </button>
        </div>
      </div>

      {/* Undo */}
      <button
        onClick={onUndo}
        disabled={!canUndo}
        className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-dark-border text-dark-muted text-sm hover:text-dark-text hover:bg-dark-card transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
      >
        <Undo2 size={14} />
        Undo
      </button>

      {/* Delete selected */}
      {selectedEditId && (
        <button
          onClick={onDeleteSelected}
          className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-sm hover:bg-red-500/20 transition-colors"
        >
          <Trash2 size={14} />
          Delete Selected
        </button>
      )}

      <div className="flex-1" />

      {/* Save error */}
      {saveError && (
        <p className="text-red-400 text-xs break-words">{saveError}</p>
      )}

      {/* Save button */}
      <button
        onClick={onSave}
        disabled={isSaving}
        className="flex items-center justify-center gap-2 px-3 py-2 rounded-lg bg-neon-cyan/20 border border-neon-cyan/40 text-neon-cyan text-sm font-medium hover:bg-neon-cyan/30 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      >
        <Save size={14} />
        {isSaving ? "Saving…" : "Save as _edited.pdf"}
      </button>
    </div>
  )
}
