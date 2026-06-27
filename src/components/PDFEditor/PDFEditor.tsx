import { useEffect, useRef, useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { invoke } from "@tauri-apps/api/core"
import { convertFileSrc } from "@tauri-apps/api/core"
import { open as openDialog } from "@tauri-apps/plugin-dialog"
import { PDFDocument } from "pdf-lib"
import { useAppStore } from "../../store/useAppStore"
import { usePDFEditorStore } from "../../store/usePDFEditorStore"
import { buildEditedPDF } from "./pdfEditorSave"
import { deriveOutputPath } from "../../lib/utils"
import PageCanvas from "./PageCanvas"
import PageThumbnailList from "./PageThumbnailList"
import EditorToolbar from "./EditorToolbar"

export default function PDFEditor() {
  const editingFileId = useAppStore((s) => s.editingFileId)
  const setEditingFileId = useAppStore((s) => s.setEditingFileId)
  const files = useAppStore((s) => s.files)
  const addFiles = useAppStore((s) => s.addFiles)

  const store = usePDFEditorStore()
  const [loadError, setLoadError] = useState<string | null>(null)
  const [pdfBytes, setPdfBytes] = useState<ArrayBuffer | null>(null)
  const canvasContainerRef = useRef<HTMLDivElement>(null)

  const file = files.find((f) => f.id === editingFileId)

  useEffect(() => {
    if (!file) return
    const currentFile = file
    store.open(currentFile.id, currentFile.path, currentFile.name)
    setLoadError(null)
    setPdfBytes(null)

    async function load() {
      try {
        const assetUrl = convertFileSrc(currentFile.path)
        const resp = await fetch(assetUrl)
        if (!resp.ok) throw new Error(`HTTP ${resp.status}`)
        const bytes = await resp.arrayBuffer()

        // Use pdf-lib (no worker needed) to get page count + dimensions
        const pdfDoc = await PDFDocument.load(bytes, { ignoreEncryption: true })
        const pages = pdfDoc.getPages()
        const dims = pages.map((p) => ({ width: p.getWidth(), height: p.getHeight() }))

        store.setTotalPages(pages.length)
        store.setPageDimensions(dims)
        setPdfBytes(bytes)
      } catch (e) {
        setLoadError(String(e))
      }
    }
    load()
  }, [editingFileId, file?.path])

  function handleClose() {
    setEditingFileId(null)
    store.close()
    setPdfBytes(null)
  }

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === "z" && !e.shiftKey) {
        e.preventDefault()
        store.undo()
      }
    }
    window.addEventListener("keydown", onKeyDown)
    return () => window.removeEventListener("keydown", onKeyDown)
  }, [store.undo])

  async function handleInsertFromPDF() {
    try {
      const selected = await openDialog({
        title: "Select PDF to Insert",
        filters: [{ name: "PDF", extensions: ["pdf"] }],
        multiple: false,
      })
      if (!selected || typeof selected !== "string") return
      const assetUrl = convertFileSrc(selected)
      const resp = await fetch(assetUrl)
      const bytes = await resp.arrayBuffer()
      const pdfDoc = await PDFDocument.load(bytes, { ignoreEncryption: true })
      const pages = pdfDoc.getPages().map((p, i) => ({
        originalIndex: i,
        width: p.getWidth(),
        height: p.getHeight(),
      }))
      store.insertPagesFromPDF(selected, pages, store.currentPageIndex)
    } catch (e) {
      console.error("Insert PDF failed", e)
    }
  }

  async function handlePickSignature() {
    try {
      const selected = await openDialog({
        title: "Select Signature Image",
        filters: [{ name: "Images", extensions: ["png", "jpg", "jpeg"] }],
        multiple: false,
      })
      if (!selected || typeof selected !== "string") return
      const assetUrl = convertFileSrc(selected)
      const resp = await fetch(assetUrl)
      const blob = await resp.blob()
      const reader = new FileReader()
      reader.onloadend = () => {
        store.setPendingSignatureDataUrl(reader.result as string)
        store.setActiveTool("signature")
      }
      reader.readAsDataURL(blob)
    } catch (e) {
      console.error("Signature pick failed", e)
    }
  }

  async function handleSave() {
    if (!store.filePath || !pdfBytes) return
    store.setSaving(true)
    store.setSaveError(null)
    try {
      const editedBytes = await buildEditedPDF(pdfBytes, store.logicalPages, store.edits)
      const outputPath = deriveOutputPath(store.filePath, "_edited")
      await invoke<number>("write_bytes", {
        path: outputPath,
        data: Array.from(editedBytes),
      })
      const fileName = outputPath.split(/[/\\]/).pop() ?? "edited.pdf"
      addFiles([{ path: outputPath, name: fileName, size: editedBytes.length }])
      handleClose()
    } catch (e) {
      store.setSaveError(String(e))
    } finally {
      store.setSaving(false)
    }
  }

  // Derive selected text edit so toolbar can show & update its properties
  const selectedTextEdit = store.edits.find(
    (e) => e.id === store.selectedEditId && e.kind === "text"
  ) as import("../../store/usePDFEditorStore").TextEdit | undefined

  const currentPage = store.logicalPages[store.currentPageIndex]
  const currentDims = currentPage?.type === "original"
    ? store.pageDimensions[currentPage.originalIndex]
    : (currentPage?.type === "blank" || currentPage?.type === "external")
    ? { width: currentPage.width, height: currentPage.height }
    : null

  const fileSrc = file ? convertFileSrc(file.path) : ""

  function handleCanvasWheel(e: React.WheelEvent<HTMLDivElement>) {
    const el = canvasContainerRef.current
    if (!el) return
    const atBottom = el.scrollTop + el.clientHeight >= el.scrollHeight - 2
    const atTop = el.scrollTop <= 2
    if (e.deltaY > 0 && atBottom && store.currentPageIndex < store.logicalPages.length - 1) {
      store.setCurrentPage(store.currentPageIndex + 1)
      el.scrollTop = 0
    } else if (e.deltaY < 0 && atTop && store.currentPageIndex > 0) {
      store.setCurrentPage(store.currentPageIndex - 1)
      el.scrollTop = el.scrollHeight
    }
  }

  return (
    <AnimatePresence>
      {editingFileId && (
        <motion.div
          key="pdf-editor"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
          className="fixed inset-0 z-50 bg-dark-bg flex flex-col"
          style={{ top: 40 }}
        >
          {/* Header */}
          <div className="flex items-center gap-3 px-4 py-2 bg-dark-surface border-b border-dark-border flex-shrink-0">
            <div className="w-2 h-2 rounded-full bg-neon-purple animate-pulse" />
            <span className="text-dark-text text-sm font-medium truncate">
              Editing: {store.fileName}
            </span>
            {store.pendingSignatureDataUrl && (
              <span className="text-neon-cyan text-xs ml-2">
                Click on the page to place signature
              </span>
            )}
          </div>

          {/* Body */}
          <div className="flex flex-1 min-h-0">
            {/* Page thumbnail sidebar */}
            <PageThumbnailList
              fileSrc={fileSrc}
              logicalPages={store.logicalPages}
              pageDimensions={store.pageDimensions}
              currentPageIndex={store.currentPageIndex}
              onSelectPage={store.setCurrentPage}
              onReorderPages={store.reorderPages}
              onDeletePage={store.deletePage}
              onInsertBlankPage={store.insertBlankPage}
            />

            {/* Canvas area */}
            <div ref={canvasContainerRef} className="flex-1 overflow-auto bg-dark-bg flex items-start justify-center p-6" onWheel={handleCanvasWheel}>
              {loadError ? (
                <div className="text-red-400 text-sm mt-20">{loadError}</div>
              ) : !pdfBytes ? (
                <div className="text-dark-muted text-sm mt-20 flex items-center gap-2">
                  <div className="w-4 h-4 border-2 border-neon-cyan/40 border-t-neon-cyan rounded-full animate-spin" />
                  Loading PDF…
                </div>
              ) : currentPage && currentDims ? (
                <PageCanvas
                  fileSrc={currentPage.type === "external" ? convertFileSrc(currentPage.filePath) : fileSrc}
                  pageNumber={currentPage.type === "original" || currentPage.type === "external" ? currentPage.originalIndex + 1 : 1}
                  isBlankPage={currentPage.type === "blank"}
                  logicalPageIndex={store.currentPageIndex}
                  pageDims={currentDims}
                  zoom={store.zoom}
                  activeTool={store.activeTool}
                  edits={store.edits.filter((e) => e.pageIndex === store.currentPageIndex)}
                  penColor={store.penColor}
                  penWidth={store.penWidth}
                  textFontSize={store.textFontSize}
                  textColor={store.textColor}
                  textFontFamily={store.textFontFamily}
                  highlightColor={store.highlightColor}
                  highlightOpacity={store.highlightOpacity}
                  pendingSignatureDataUrl={store.pendingSignatureDataUrl}
                  selectedEditId={store.selectedEditId}
                  onAddEdit={store.addEdit}
                  onUpdateEdit={store.updateEdit}
                  onDeleteEdit={store.deleteEdit}
                  onSelectEdit={store.setSelectedEditId}
                  onSnapshotHistory={store.snapshotHistory}
                  onClearPendingSignature={() => {
                store.setPendingSignatureDataUrl(null)
                store.setActiveTool("select")
              }}
                />
              ) : (
                <div className="text-dark-muted text-sm mt-20">No pages</div>
              )}
            </div>

            {/* Right toolbar */}
            <EditorToolbar
              activeTool={store.activeTool}
              zoom={store.zoom}
              penColor={store.penColor}
              penWidth={store.penWidth}
              textFontSize={store.textFontSize}
              textColor={store.textColor}
              textFontFamily={store.textFontFamily}
              highlightColor={store.highlightColor}
              highlightOpacity={store.highlightOpacity}
              selectedEditId={store.selectedEditId}
              selectedTextFontSize={selectedTextEdit?.fontSize ?? null}
              selectedTextColor={selectedTextEdit?.color ?? null}
              selectedTextFontFamily={selectedTextEdit?.fontFamily ?? null}
              isSaving={store.isSaving}
              saveError={store.saveError}
              onSetTool={store.setActiveTool}
              onSetZoom={store.setZoom}
              onSetPenColor={store.setPenColor}
              onSetPenWidth={store.setPenWidth}
              onSetTextFontSize={(s) => {
                if (selectedTextEdit) { store.snapshotHistory(); store.updateEdit(selectedTextEdit.id, { fontSize: s }) }
                store.setTextFontSize(s)
              }}
              onSetTextColor={(c) => {
                if (selectedTextEdit) { store.snapshotHistory(); store.updateEdit(selectedTextEdit.id, { color: c }) }
                store.setTextColor(c)
              }}
              onSetTextFontFamily={(f) => {
                if (selectedTextEdit) { store.snapshotHistory(); store.updateEdit(selectedTextEdit.id, { fontFamily: f }) }
                store.setTextFontFamily(f)
              }}
              onSetHighlightColor={store.setHighlightColor}
              onSetHighlightOpacity={store.setHighlightOpacity}
              canUndo={store.editHistory.length > 0}
              onUndo={store.undo}
              onPickSignature={handlePickSignature}
              onDeleteSelected={() => store.selectedEditId && store.deleteEdit(store.selectedEditId)}
              onSave={handleSave}
              onClose={handleClose}
              onInsertBlankPage={() => store.insertBlankPage(store.currentPageIndex)}
              onInsertFromPDF={handleInsertFromPDF}
            />
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
