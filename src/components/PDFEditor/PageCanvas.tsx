import { useEffect, useRef, useState } from "react"
import { createPortal } from "react-dom"
import type { ContentEdit, EditorTool, RGB, TextEdit } from "../../store/usePDFEditorStore"

interface Props {
  fileSrc: string
  pageNumber: number
  isBlankPage: boolean
  logicalPageIndex: number
  pageDims: { width: number; height: number }
  zoom: number
  activeTool: EditorTool
  edits: ContentEdit[]
  penColor: RGB
  penWidth: number
  textFontSize: number
  textColor: RGB
  textFontFamily: string
  highlightColor: RGB
  highlightOpacity: number
  pendingSignatureDataUrl: string | null
  selectedEditId: string | null
  onAddEdit: (edit: ContentEdit) => void
  onUpdateEdit: (id: string, patch: Partial<ContentEdit>) => void
  onDeleteEdit: (id: string) => void
  onSelectEdit: (id: string | null) => void
  onSnapshotHistory: () => void
  onClearPendingSignature: () => void
}

function pointsToSmoothPath(pts: [number, number][]): string {
  if (pts.length === 0) return ""
  if (pts.length === 1) return `M ${pts[0][0]} ${pts[0][1]}`
  let d = `M ${pts[0][0]} ${pts[0][1]}`
  for (let i = 1; i < pts.length - 1; i++) {
    const mx = (pts[i][0] + pts[i + 1][0]) / 2
    const my = (pts[i][1] + pts[i + 1][1]) / 2
    d += ` Q ${pts[i][0]} ${pts[i][1]} ${mx} ${my}`
  }
  d += ` L ${pts[pts.length - 1][0]} ${pts[pts.length - 1][1]}`
  return d
}

function canvasToPdf(cx: number, cy: number, cssW: number, cssH: number, pdfW: number, pdfH: number): [number, number] {
  return [cx * (pdfW / cssW), pdfH - cy * (pdfH / cssH)]
}

function rgbToCss(c: RGB): string {
  return `rgb(${Math.round(c[0] * 255)},${Math.round(c[1] * 255)},${Math.round(c[2] * 255)})`
}

export default function PageCanvas({
  fileSrc,
  pageNumber,
  isBlankPage,
  logicalPageIndex,
  pageDims,
  zoom,
  activeTool,
  edits,
  penColor,
  penWidth,
  textFontSize,
  textColor,
  textFontFamily,
  highlightColor,
  highlightOpacity,
  pendingSignatureDataUrl,
  selectedEditId,
  onAddEdit,
  onUpdateEdit,
  onDeleteEdit,
  onSelectEdit,
  onSnapshotHistory,
  onClearPendingSignature,
}: Props) {
  const containerRef = useRef<HTMLDivElement>(null)
  const drawingRef = useRef<{ points: [number, number][] } | null>(null)
  const [livePathD, setLivePathD] = useState<string | null>(null)
  const highlightAnchorRef = useRef<{ x: number; y: number } | null>(null)
  const [liveHighlight, setLiveHighlight] = useState<{ x: number; y: number; w: number; h: number } | null>(null)
  const svgDragRef = useRef<{
    editId: string
    isDraw: boolean   // true → update offsetX/offsetY; false → update x/y
    startX: number; startY: number
    origX: number; origY: number
  } | null>(null)
  const textDragRef = useRef<{ editId: string; startX: number; startY: number; origX: number; origY: number } | null>(null)
  const resizeRef = useRef<{
    editId: string
    corner: "tl" | "tr" | "bl" | "br"
    startX: number; startY: number
    origX: number; origY: number; origW: number; origH: number
    rotation: number  // degrees, for un-rotating the drag delta
  } | null>(null)
  const rotateRef = useRef<{
    editId: string
    screenCx: number; screenCy: number
    startAngle: number; origRotation: number
  } | null>(null)

  // Text editing state
  const [editingTextId, setEditingTextId] = useState<string | null>(null)
  const [textPortalPos, setTextPortalPos] = useState<{ clientX: number; clientY: number; cx: number; cy: number } | null>(null)
  const [textPortalInitial, setTextPortalInitial] = useState("")
  const [textPortalFontSize, setTextPortalFontSize] = useState<number | null>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    if (editingTextId && textareaRef.current) {
      const t = setTimeout(() => {
        if (textareaRef.current) {
          textareaRef.current.focus()
          // Place cursor at end
          const len = textareaRef.current.value.length
          textareaRef.current.setSelectionRange(len, len)
        }
      }, 50)
      return () => clearTimeout(t)
    }
  }, [editingTextId])

  const cssW = pageDims.width * zoom
  const cssH = pageDims.height * zoom
  const pdfW = pageDims.width
  const pdfH = pageDims.height

  function svgPoint(e: React.PointerEvent<SVGSVGElement>): [number, number] {
    const rect = e.currentTarget.getBoundingClientRect()
    return [e.clientX - rect.left, e.clientY - rect.top]
  }

  // ── SVG interaction handlers ──────────────────────────────────────────────

  function onSvgPointerDown(e: React.PointerEvent<SVGSVGElement>) {
    const [cx, cy] = svgPoint(e)

    if (activeTool === "pen") {
      e.currentTarget.setPointerCapture(e.pointerId)
      drawingRef.current = { points: [[cx, cy]] }
      setLivePathD(`M ${cx} ${cy}`)
      return
    }
    if (activeTool === "highlight") {
      e.currentTarget.setPointerCapture(e.pointerId)
      highlightAnchorRef.current = { x: cx, y: cy }
      return
    }
    if (activeTool === "text") {
      openNewTextAt(cx, cy, e.clientX, e.clientY)
      return
    }
    if (activeTool === "signature" && pendingSignatureDataUrl) {
      const [px, py] = canvasToPdf(cx, cy, cssW, cssH, pdfW, pdfH)
      onAddEdit({
        kind: "signature",
        id: crypto.randomUUID(),
        pageIndex: logicalPageIndex,
        x: px,
        y: py - 80,
        width: 160,
        height: 80,
        rotation: 0,
        imageDataUrl: pendingSignatureDataUrl,
      })
      onClearPendingSignature()
      return
    }
    if (activeTool === "select") {
      onSelectEdit(null)
    }
  }

  function onSvgPointerMove(e: React.PointerEvent<SVGSVGElement>) {
    // Rotation takes highest priority
    if (rotateRef.current) {
      const { screenCx, screenCy, startAngle, origRotation } = rotateRef.current
      const currentAngle = Math.atan2(e.clientY - screenCy, e.clientX - screenCx) * (180 / Math.PI)
      onUpdateEdit(rotateRef.current.editId, { rotation: origRotation + (currentAngle - startAngle) } as Partial<ContentEdit>)
      return
    }

    // Resize — un-rotate the drag delta into image-local space first
    if (resizeRef.current) {
      const r = resizeRef.current
      const rot = (r.rotation * Math.PI) / 180
      const rawDx = e.clientX - r.startX
      const rawDy = e.clientY - r.startY
      // Rotate delta by -θ (inverse of image rotation) to get local-space delta
      const dxLocal = rawDx * Math.cos(rot) + rawDy * Math.sin(rot)
      const dyLocal = -rawDx * Math.sin(rot) + rawDy * Math.cos(rot)
      const dxPdf = dxLocal * (pdfW / cssW)
      const dyPdf = dyLocal * (pdfH / cssH)
      const MIN = 20
      let nx = r.origX, ny = r.origY, nw = r.origW, nh = r.origH
      if (r.corner === "br") {
        nw = Math.max(MIN, r.origW + dxPdf)
        nh = Math.max(MIN, r.origH + dyPdf)
        ny = r.origY + r.origH - nh
      } else if (r.corner === "bl") {
        nw = Math.max(MIN, r.origW - dxPdf)
        nh = Math.max(MIN, r.origH + dyPdf)
        nx = r.origX + r.origW - nw
        ny = r.origY + r.origH - nh
      } else if (r.corner === "tr") {
        nw = Math.max(MIN, r.origW + dxPdf)
        nh = Math.max(MIN, r.origH - dyPdf)
      } else if (r.corner === "tl") {
        nw = Math.max(MIN, r.origW - dxPdf)
        nh = Math.max(MIN, r.origH - dyPdf)
        nx = r.origX + r.origW - nw
      }
      onUpdateEdit(r.editId, { x: nx, y: ny, width: nw, height: nh } as Partial<ContentEdit>)
      return
    }

    if (activeTool === "pen" && drawingRef.current) {
      const [cx, cy] = svgPoint(e)
      drawingRef.current.points.push([cx, cy])
      setLivePathD(pointsToSmoothPath(drawingRef.current.points))
      return
    }
    if (activeTool === "highlight" && highlightAnchorRef.current) {
      const [cx, cy] = svgPoint(e)
      const ax = highlightAnchorRef.current.x
      const ay = highlightAnchorRef.current.y
      setLiveHighlight({ x: Math.min(ax, cx), y: Math.min(ay, cy), w: Math.abs(cx - ax), h: Math.abs(cy - ay) })
      return
    }
    if (svgDragRef.current) {
      const dx = (e.clientX - svgDragRef.current.startX) * (pdfW / cssW)
      const dy = (e.clientY - svgDragRef.current.startY) * (pdfH / cssH)
      if (svgDragRef.current.isDraw) {
        onUpdateEdit(svgDragRef.current.editId, {
          offsetX: svgDragRef.current.origX + dx,
          offsetY: svgDragRef.current.origY - dy,
        } as Partial<ContentEdit>)
      } else {
        onUpdateEdit(svgDragRef.current.editId, {
          x: svgDragRef.current.origX + dx,
          y: svgDragRef.current.origY - dy,
        } as Partial<ContentEdit>)
      }
    }
  }

  function onSvgPointerUp() {
    if (activeTool === "pen" && drawingRef.current) {
      const finalPath = pointsToSmoothPath(drawingRef.current.points)
      drawingRef.current = null
      setLivePathD(null)
      if (finalPath) {
        onAddEdit({
          kind: "draw",
          id: crypto.randomUUID(),
          pageIndex: logicalPageIndex,
          svgPath: finalPath,
          strokeColor: penColor,
          strokeWidth: penWidth,
          canvasWidth: cssW,
          canvasHeight: cssH,
          pdfWidth: pdfW,
          pdfHeight: pdfH,
          offsetX: 0,
          offsetY: 0,
        })
      }
      return
    }
    if (activeTool === "highlight" && highlightAnchorRef.current && liveHighlight) {
      if (liveHighlight.w > 5 && liveHighlight.h > 5) {
        const [px, py] = canvasToPdf(liveHighlight.x, liveHighlight.y + liveHighlight.h, cssW, cssH, pdfW, pdfH)
        onAddEdit({
          kind: "highlight",
          id: crypto.randomUUID(),
          pageIndex: logicalPageIndex,
          x: px,
          y: py,
          width: liveHighlight.w * (pdfW / cssW),
          height: liveHighlight.h * (pdfH / cssH),
          color: highlightColor,
          opacity: highlightOpacity,
        })
      }
      highlightAnchorRef.current = null
      setLiveHighlight(null)
    }
    svgDragRef.current = null
    resizeRef.current = null
    rotateRef.current = null
  }

  function onSvgEditPointerDown(e: React.PointerEvent, editId: string) {
    e.stopPropagation()
    if (activeTool !== "select") return
    onSelectEdit(editId)
    const edit = edits.find((ed) => ed.id === editId)
    if (!edit) return
    onSnapshotHistory()
    svgDragRef.current = {
      editId,
      isDraw: edit.kind === "draw",
      startX: e.clientX,
      startY: e.clientY,
      origX: edit.kind === "draw" ? edit.offsetX : edit.x,
      origY: edit.kind === "draw" ? edit.offsetY : edit.y,
    }
    e.currentTarget.setPointerCapture(e.pointerId)
  }

  function onResizeHandleDown(
    e: React.PointerEvent<SVGCircleElement>,
    edit: import("../../store/usePDFEditorStore").SignatureEdit,
    corner: "tl" | "tr" | "bl" | "br"
  ) {
    e.stopPropagation()
    onSnapshotHistory()
    resizeRef.current = {
      editId: edit.id,
      corner,
      startX: e.clientX,
      startY: e.clientY,
      origX: edit.x,
      origY: edit.y,
      origW: edit.width,
      origH: edit.height,
      rotation: edit.rotation,
    }
    e.currentTarget.setPointerCapture(e.pointerId)
  }

  function onRotateHandleDown(
    e: React.PointerEvent<SVGCircleElement>,
    edit: import("../../store/usePDFEditorStore").SignatureEdit
  ) {
    e.stopPropagation()
    onSnapshotHistory()
    if (!containerRef.current) return
    const rect = containerRef.current.getBoundingClientRect()
    const svgX = edit.x / (pdfW / cssW)
    const svgY = cssH - (edit.y + edit.height) / (pdfH / cssH)
    const svgW = edit.width / (pdfW / cssW)
    const svgH = edit.height / (pdfH / cssH)
    const screenCx = rect.left + svgX + svgW / 2
    const screenCy = rect.top + svgY + svgH / 2
    rotateRef.current = {
      editId: edit.id,
      screenCx,
      screenCy,
      startAngle: Math.atan2(e.clientY - screenCy, e.clientX - screenCx) * (180 / Math.PI),
      origRotation: edit.rotation,
    }
    e.currentTarget.setPointerCapture(e.pointerId)
  }

  // ── Text HTML layer handlers ──────────────────────────────────────────────

  function openNewTextAt(cx: number, cy: number, clientX: number, clientY: number) {
    setEditingTextId("__new__")
    setTextPortalPos({ cx, cy, clientX, clientY: clientY - textFontSize * zoom })
    setTextPortalInitial("")
    setTextPortalFontSize(null)
  }

  function openEditText(edit: TextEdit) {
    if (!containerRef.current) return
    const rect = containerRef.current.getBoundingClientRect()
    const ex = edit.x / (pdfW / cssW)
    const ey = cssH - edit.y / (pdfH / cssH)
    setEditingTextId(edit.id)
    setTextPortalPos({
      cx: ex,
      cy: ey,
      clientX: rect.left + ex,
      clientY: rect.top + ey - edit.fontSize * zoom,
    })
    setTextPortalInitial(edit.content)
    setTextPortalFontSize(edit.fontSize)
  }

  function commitText(content: string) {
    if (!textPortalPos) { setEditingTextId(null); return }

    if (editingTextId === "__new__") {
      if (content.trim()) {
        const [px, py] = canvasToPdf(textPortalPos.cx, textPortalPos.cy, cssW, cssH, pdfW, pdfH)
        onAddEdit({
          kind: "text",
          id: crypto.randomUUID(),
          pageIndex: logicalPageIndex,
          x: px,
          y: py,
          content: content.trim(),
          fontSize: textFontSize,
          color: textColor,
          fontFamily: textFontFamily as "Helvetica" | "Times-Roman" | "Courier",
        })
      }
    } else if (editingTextId) {
      if (content.trim()) {
        onUpdateEdit(editingTextId, { content: content.trim() })
      } else {
        onDeleteEdit(editingTextId)
      }
    }

    setEditingTextId(null)
    setTextPortalPos(null)
    setTextPortalInitial("")
    setTextPortalFontSize(null)
  }

  function onTextDivPointerDown(e: React.PointerEvent<HTMLDivElement>, edit: TextEdit) {
    e.stopPropagation()
    e.preventDefault()
    onSelectEdit(edit.id)
    onSnapshotHistory()
    textDragRef.current = {
      editId: edit.id,
      startX: e.clientX,
      startY: e.clientY,
      origX: edit.x,
      origY: edit.y,
    }
    e.currentTarget.setPointerCapture(e.pointerId)
  }

  function onTextDivPointerMove(e: React.PointerEvent<HTMLDivElement>) {
    if (!textDragRef.current) return
    const dx = (e.clientX - textDragRef.current.startX) * (pdfW / cssW)
    const dy = (e.clientY - textDragRef.current.startY) * (pdfH / cssH)
    onUpdateEdit(textDragRef.current.editId, {
      x: textDragRef.current.origX + dx,
      y: textDragRef.current.origY - dy,
    } as Partial<ContentEdit>)
  }

  function onTextDivPointerUp() {
    textDragRef.current = null
  }

  // ── Render ────────────────────────────────────────────────────────────────

  const textEdits = edits.filter((e): e is TextEdit => e.kind === "text")
  const nonTextEdits = edits.filter((e) => e.kind !== "text")

  const cursorMap: Record<EditorTool, string> = {
    select: "default",
    text: "text",
    pen: "crosshair",
    highlight: "crosshair",
    signature: pendingSignatureDataUrl ? "crosshair" : "default",
    page: "default",
  }

  return (
    <div
      ref={containerRef}
      className="relative inline-block shadow-2xl"
      style={{ width: cssW, height: cssH }}
    >
      {isBlankPage ? (
        <div style={{ width: cssW, height: cssH, background: "white" }} />
      ) : (
        <iframe
          src={`${fileSrc}#page=${pageNumber}&toolbar=0&navpanes=0&scrollbar=0`}
          style={{ display: "block", width: cssW, height: cssH, border: "none", pointerEvents: "none" }}
          title={`Page ${pageNumber}`}
        />
      )}

      {/* SVG overlay — pen, highlight, signature, draw edits */}
      <svg
        style={{
          position: "absolute", top: 0, left: 0, width: cssW, height: cssH,
          cursor: cursorMap[activeTool], overflow: "visible", zIndex: 2,
        }}
        onPointerDown={onSvgPointerDown}
        onPointerMove={onSvgPointerMove}
        onPointerUp={onSvgPointerUp}
      >
        <rect x={0} y={0} width={cssW} height={cssH} fill="transparent" />

        {nonTextEdits.map((edit) => {
          const isSelected = edit.id === selectedEditId

          if (edit.kind === "highlight") {
            const svgX = edit.x / (pdfW / cssW)
            const svgY = cssH - (edit.y + edit.height) / (pdfH / cssH)
            const svgW = edit.width / (pdfW / cssW)
            const svgH = edit.height / (pdfH / cssH)
            return (
              <rect key={edit.id}
                x={svgX} y={svgY} width={svgW} height={svgH}
                fill={rgbToCss(edit.color)} fillOpacity={edit.opacity}
                stroke={isSelected ? "#00f5ff" : "none"} strokeWidth={isSelected ? 1 : 0}
                cursor={activeTool === "select" ? "move" : "default"}
                onPointerDown={(e) => onSvgEditPointerDown(e as React.PointerEvent, edit.id)}
              />
            )
          }

          if (edit.kind === "signature") {
            const svgX = edit.x / (pdfW / cssW)
            const svgY = cssH - (edit.y + edit.height) / (pdfH / cssH)
            const svgW = edit.width / (pdfW / cssW)
            const svgH = edit.height / (pdfH / cssH)
            const cx = svgX + svgW / 2
            const cy = svgY + svgH / 2
            const HR = 6
            const resizeCursors = { tl: "nw-resize", tr: "ne-resize", bl: "sw-resize", br: "se-resize" }
            return (
              <g key={edit.id} transform={`rotate(${edit.rotation}, ${cx}, ${cy})`}>
                <image
                  href={edit.imageDataUrl}
                  x={svgX} y={svgY} width={svgW} height={svgH}
                  preserveAspectRatio="none"
                  stroke={isSelected ? "#00f5ff" : "none"} strokeWidth={isSelected ? 1.5 : 0}
                  cursor={activeTool === "select" ? "move" : "default"}
                  onPointerDown={(e) => onSvgEditPointerDown(e as React.PointerEvent, edit.id)}
                />
                {isSelected && activeTool === "select" && (
                  <>
                    {/* Rotation handle */}
                    <line
                      x1={cx} y1={svgY} x2={cx} y2={svgY - 32}
                      stroke="#a855f7" strokeWidth={1.5} strokeDasharray="4,3" pointerEvents="none"
                    />
                    <circle
                      cx={cx} cy={svgY - 32} r={HR}
                      fill="#a855f7" stroke="#fff" strokeWidth={1.5}
                      cursor="grab"
                      style={{ filter: "drop-shadow(0 0 4px rgba(168,85,247,0.9))" }}
                      onPointerDown={(e) => onRotateHandleDown(e, edit)}
                    />
                    {/* Corner resize handles */}
                    {(["tl", "tr", "bl", "br"] as const).map((corner) => {
                      const hx = corner.includes("r") ? svgX + svgW : svgX
                      const hy = corner.includes("b") ? svgY + svgH : svgY
                      return (
                        <circle key={corner}
                          cx={hx} cy={hy} r={HR}
                          fill="#00f5ff" stroke="#fff" strokeWidth={1.5}
                          cursor={resizeCursors[corner]}
                          style={{ filter: "drop-shadow(0 0 3px rgba(0,245,255,0.8))" }}
                          onPointerDown={(e) => onResizeHandleDown(e, edit, corner)}
                        />
                      )
                    })}
                  </>
                )}
              </g>
            )
          }

          if (edit.kind === "draw") {
            const scaleX = cssW / edit.canvasWidth
            const scaleY = cssH / edit.canvasHeight
            const txCss = edit.offsetX * (cssW / pdfW)
            const tyCss = -edit.offsetY * (cssH / pdfH)
            return (
              <g key={edit.id} transform={`translate(${txCss},${tyCss}) scale(${scaleX},${scaleY})`}>
                {/* Selection halo */}
                {isSelected && (
                  <path d={edit.svgPath} fill="none" stroke="#00f5ff"
                    strokeWidth={(edit.strokeWidth + 6) / scaleX}
                    strokeLinecap="round" strokeLinejoin="round" opacity={0.4} pointerEvents="none" />
                )}
                {/* Visible stroke */}
                <path d={edit.svgPath} fill="none"
                  stroke={rgbToCss(edit.strokeColor)} strokeWidth={edit.strokeWidth / scaleX}
                  strokeLinecap="round" strokeLinejoin="round"
                  pointerEvents="none"
                />
                {/* Fat invisible hit area — wide enough to grab easily */}
                <path d={edit.svgPath} fill="none" stroke="transparent"
                  strokeWidth={Math.max(20, edit.strokeWidth + 12) / scaleX}
                  strokeLinecap="round" strokeLinejoin="round"
                  cursor={activeTool === "select" ? "move" : "default"}
                  pointerEvents={activeTool === "select" ? "stroke" : "none"}
                  onPointerDown={(e) => onSvgEditPointerDown(e as React.PointerEvent, edit.id)}
                />
              </g>
            )
          }

          return null
        })}

        {livePathD && (
          <path d={livePathD} fill="none" stroke={rgbToCss(penColor)}
            strokeWidth={penWidth} strokeLinecap="round" strokeLinejoin="round" pointerEvents="none" />
        )}

        {liveHighlight && (
          <rect x={liveHighlight.x} y={liveHighlight.y} width={liveHighlight.w} height={liveHighlight.h}
            fill={rgbToCss(highlightColor)} fillOpacity={highlightOpacity} pointerEvents="none" />
        )}
      </svg>

      {/* HTML layer for text edits — reliable drag and double-click to re-edit */}
      {textEdits.map((edit) => {
        const isSelected = edit.id === selectedEditId
        const isBeingEdited = editingTextId === edit.id
        const ex = edit.x / (pdfW / cssW)
        const ey = cssH - edit.y / (pdfH / cssH)
        const cssFontSize = edit.fontSize * zoom
        return (
          <div
            key={edit.id}
            style={{
              position: "absolute",
              left: ex,
              top: ey - cssFontSize,
              fontSize: cssFontSize,
              color: isBeingEdited ? "transparent" : rgbToCss(edit.color),
              fontFamily: edit.fontFamily,
              whiteSpace: "pre",
              userSelect: "none",
              cursor: activeTool === "select" ? "move" : activeTool === "text" ? "text" : "default",
              border: isSelected ? "1px solid #00f5ff" : "1px solid transparent",
              padding: "0 2px",
              zIndex: 20,
              pointerEvents: "auto",
              touchAction: "none",
            }}
            onPointerDown={(e) => onTextDivPointerDown(e, edit)}
            onPointerMove={onTextDivPointerMove}
            onPointerUp={onTextDivPointerUp}
            onDoubleClick={() => openEditText(edit)}
          >
            {edit.content}
          </div>
        )
      })}

      {/* Text input portal — renders into document.body to avoid stacking issues */}
      {editingTextId && textPortalPos && createPortal(
        <textarea
          ref={textareaRef}
          rows={1}
          defaultValue={textPortalInitial}
          placeholder={editingTextId === "__new__" ? "Type here, Enter to place…" : undefined}
          style={{
            position: "fixed",
            left: textPortalPos.clientX,
            top: textPortalPos.clientY,
            zIndex: 99999,
            fontSize: (textPortalFontSize ?? textFontSize) * zoom,
            color: rgbToCss(textColor),
            fontFamily: textFontFamily,
            background: "rgba(255,255,255,0.08)",
            border: "1.5px solid rgba(0,245,255,0.6)",
            outline: "none",
            padding: "3px 6px",
            resize: "none",
            minWidth: 180,
            maxWidth: 360,
            borderRadius: 3,
            boxShadow: "0 0 8px rgba(0,245,255,0.25)",
            backdropFilter: "blur(2px)",
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault()
              commitText((e.target as HTMLTextAreaElement).value)
            }
            if (e.key === "Escape") {
              setEditingTextId(null)
              setTextPortalPos(null)
              setTextPortalInitial("")
              setTextPortalFontSize(null)
            }
          }}
          onBlur={(e) => commitText(e.target.value)}
        />,
        document.body
      )}
    </div>
  )
}
