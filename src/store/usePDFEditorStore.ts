import { create } from "zustand"

export type EditorTool = "select" | "text" | "pen" | "highlight" | "signature" | "page"
export type PDFFont = "Helvetica" | "Times-Roman" | "Courier"
export type RGB = [number, number, number]

export interface TextEdit {
  kind: "text"
  id: string
  pageIndex: number
  x: number
  y: number
  content: string
  fontSize: number
  color: RGB
  fontFamily: PDFFont
}

export interface DrawEdit {
  kind: "draw"
  id: string
  pageIndex: number
  svgPath: string
  strokeColor: RGB
  strokeWidth: number
  canvasWidth: number
  canvasHeight: number
  pdfWidth: number
  pdfHeight: number
  offsetX: number   // translation in PDF points (positive = right)
  offsetY: number   // translation in PDF points (positive = up)
}

export interface HighlightEdit {
  kind: "highlight"
  id: string
  pageIndex: number
  x: number
  y: number
  width: number
  height: number
  color: RGB
  opacity: number
}

export interface SignatureEdit {
  kind: "signature"
  id: string
  pageIndex: number
  x: number
  y: number
  width: number
  height: number
  rotation: number   // degrees, clockwise
  imageDataUrl: string
}

export type ContentEdit = TextEdit | DrawEdit | HighlightEdit | SignatureEdit

export type LogicalPage =
  | { type: "original"; originalIndex: number }
  | { type: "blank"; blankId: string; width: number; height: number }
  | { type: "external"; filePath: string; originalIndex: number; width: number; height: number }

interface PDFEditorStore {
  fileId: string | null
  filePath: string | null
  fileName: string | null

  totalPages: number
  pageDimensions: Array<{ width: number; height: number }>
  logicalPages: LogicalPage[]

  currentPageIndex: number
  zoom: number
  activeTool: EditorTool

  penColor: RGB
  penWidth: number
  textFontSize: number
  textColor: RGB
  textFontFamily: PDFFont
  highlightColor: RGB
  highlightOpacity: number

  edits: ContentEdit[]
  editHistory: ContentEdit[][]
  selectedEditId: string | null

  isSaving: boolean
  saveError: string | null

  // Pending signature image waiting to be placed on canvas
  pendingSignatureDataUrl: string | null

  open: (fileId: string, filePath: string, fileName: string) => void
  close: () => void
  setTotalPages: (n: number) => void
  setPageDimensions: (dims: Array<{ width: number; height: number }>) => void
  setCurrentPage: (index: number) => void
  setZoom: (z: number) => void
  setActiveTool: (t: EditorTool) => void
  setPenColor: (c: RGB) => void
  setPenWidth: (w: number) => void
  setTextFontSize: (s: number) => void
  setTextColor: (c: RGB) => void
  setTextFontFamily: (f: PDFFont) => void
  setHighlightColor: (c: RGB) => void
  setHighlightOpacity: (o: number) => void
  setPendingSignatureDataUrl: (url: string | null) => void

  addEdit: (edit: ContentEdit) => void
  updateEdit: (id: string, patch: Partial<ContentEdit>) => void
  deleteEdit: (id: string) => void
  setSelectedEditId: (id: string | null) => void
  snapshotHistory: () => void
  undo: () => void

  reorderPages: (newLogicalOrder: number[]) => void
  deletePage: (logicalIndex: number) => void
  insertBlankPage: (afterLogicalIndex: number) => void
  insertPagesFromPDF: (filePath: string, pages: Array<{ originalIndex: number; width: number; height: number }>, afterLogicalIndex: number) => void

  setSaving: (v: boolean) => void
  setSaveError: (e: string | null) => void
}

export const usePDFEditorStore = create<PDFEditorStore>((set) => ({
  fileId: null,
  filePath: null,
  fileName: null,
  totalPages: 0,
  pageDimensions: [],
  logicalPages: [],
  currentPageIndex: 0,
  zoom: 1,
  activeTool: "select",
  penColor: [0.1, 0.1, 0.9],
  penWidth: 3,
  textFontSize: 14,
  textColor: [0, 0, 0],
  textFontFamily: "Helvetica",
  highlightColor: [1, 0.95, 0],
  highlightOpacity: 0.4,
  edits: [],
  editHistory: [],
  selectedEditId: null,
  isSaving: false,
  saveError: null,
  pendingSignatureDataUrl: null,

  open: (fileId, filePath, fileName) =>
    set({
      fileId,
      filePath,
      fileName,
      edits: [],
      editHistory: [],
      selectedEditId: null,
      currentPageIndex: 0,
      zoom: 1,
      activeTool: "select",
      isSaving: false,
      saveError: null,
      pendingSignatureDataUrl: null,
      logicalPages: [],
      pageDimensions: [],
      totalPages: 0,
    }),

  close: () =>
    set({
      fileId: null,
      filePath: null,
      fileName: null,
      edits: [],
      editHistory: [],
      logicalPages: [],
      pageDimensions: [],
      totalPages: 0,
    }),

  setTotalPages: (n) =>
    set(() => {
      const pages: LogicalPage[] = Array.from({ length: n }, (_, i) => ({
        type: "original",
        originalIndex: i,
      }))
      return { totalPages: n, logicalPages: pages }
    }),

  setPageDimensions: (dims) => set({ pageDimensions: dims }),
  setCurrentPage: (index) => set({ currentPageIndex: index }),
  setZoom: (z) => set({ zoom: z }),
  setActiveTool: (t) => set({ activeTool: t }),
  setPenColor: (c) => set({ penColor: c }),
  setPenWidth: (w) => set({ penWidth: w }),
  setTextFontSize: (s) => set({ textFontSize: s }),
  setTextColor: (c) => set({ textColor: c }),
  setTextFontFamily: (f) => set({ textFontFamily: f }),
  setHighlightColor: (c) => set({ highlightColor: c }),
  setHighlightOpacity: (o) => set({ highlightOpacity: o }),
  setPendingSignatureDataUrl: (url) => set({ pendingSignatureDataUrl: url }),

  addEdit: (edit) =>
    set((state) => ({
      editHistory: [...state.editHistory, state.edits],
      edits: [...state.edits, edit],
    })),

  // updateEdit does NOT push history — callers must call snapshotHistory() before
  // a user-initiated change so drag frames don't spam the history stack.
  updateEdit: (id, patch) =>
    set((state) => ({
      edits: state.edits.map((e) => (e.id === id ? ({ ...e, ...patch } as ContentEdit) : e)),
    })),

  snapshotHistory: () =>
    set((state) => ({ editHistory: [...state.editHistory, state.edits] })),

  deleteEdit: (id) =>
    set((state) => ({
      editHistory: [...state.editHistory, state.edits],
      edits: state.edits.filter((e) => e.id !== id),
      selectedEditId: state.selectedEditId === id ? null : state.selectedEditId,
    })),

  setSelectedEditId: (id) => set({ selectedEditId: id }),

  undo: () =>
    set((state) => {
      if (state.editHistory.length === 0) return {}
      const prev = state.editHistory[state.editHistory.length - 1]
      return {
        edits: prev,
        editHistory: state.editHistory.slice(0, -1),
        selectedEditId: null,
      }
    }),

  reorderPages: (newOrder) =>
    set((state) => {
      const reordered = newOrder.map((i) => state.logicalPages[i])
      const indexMap = new Map(newOrder.map((oldIdx: number, newIdx: number) => [oldIdx, newIdx]))
      return {
        logicalPages: reordered,
        edits: state.edits.map((e) => ({
          ...e,
          pageIndex: indexMap.get(e.pageIndex) ?? e.pageIndex,
        })),
      }
    }),

  deletePage: (logicalIndex) =>
    set((state) => {
      const newPages = state.logicalPages.filter((_, i) => i !== logicalIndex)
      return {
        logicalPages: newPages,
        edits: state.edits
          .filter((e) => e.pageIndex !== logicalIndex)
          .map((e) => ({
            ...e,
            pageIndex: e.pageIndex > logicalIndex ? e.pageIndex - 1 : e.pageIndex,
          })),
        currentPageIndex: Math.min(state.currentPageIndex, Math.max(0, newPages.length - 1)),
      }
    }),

  insertBlankPage: (afterLogicalIndex) =>
    set((state) => {
      const refEntry = state.logicalPages[afterLogicalIndex] ?? state.logicalPages[0]
      const refOrigIdx = refEntry?.type === "original" ? refEntry.originalIndex : 0
      const dims = state.pageDimensions[refOrigIdx] ?? { width: 595, height: 842 }
      const blank: LogicalPage = {
        type: "blank",
        blankId: crypto.randomUUID(),
        width: dims.width,
        height: dims.height,
      }
      const insertAt = afterLogicalIndex + 1
      const newPages = [
        ...state.logicalPages.slice(0, insertAt),
        blank,
        ...state.logicalPages.slice(insertAt),
      ]
      return {
        logicalPages: newPages,
        edits: state.edits.map((e) => ({
          ...e,
          pageIndex: e.pageIndex >= insertAt ? e.pageIndex + 1 : e.pageIndex,
        })),
      }
    }),

  insertPagesFromPDF: (filePath, pages, afterLogicalIndex) =>
    set((state) => {
      const insertAt = afterLogicalIndex + 1
      const newEntries: LogicalPage[] = pages.map((p) => ({
        type: "external",
        filePath,
        originalIndex: p.originalIndex,
        width: p.width,
        height: p.height,
      }))
      const newPages = [
        ...state.logicalPages.slice(0, insertAt),
        ...newEntries,
        ...state.logicalPages.slice(insertAt),
      ]
      return {
        logicalPages: newPages,
        edits: state.edits.map((e) => ({
          ...e,
          pageIndex: e.pageIndex >= insertAt ? e.pageIndex + pages.length : e.pageIndex,
        })),
      }
    }),

  setSaving: (v) => set({ isSaving: v }),
  setSaveError: (e) => set({ saveError: e }),
}))
