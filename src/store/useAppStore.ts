import { create } from "zustand"
import { getFileType } from "../lib/utils"

export type FileStatus = "idle" | "compressing" | "done" | "error"

export interface AppFile {
  id: string
  path: string
  name: string
  type: "image" | "pdf"
  originalSize: number
  estimatedSize: number | null
  compressedSize: number | null
  thumbnail: string | null
  status: FileStatus
  outputPath: string | null
  error?: string
  progress: number
}

export type CompressionPreset = "light" | "balanced" | "aggressive"

export interface HistoryEntry {
  id: string
  name: string
  originalSize: number
  compressedSize: number
  timestamp: number
}

interface AppStore {
  files: AppFile[]
  quality: number
  preset: CompressionPreset
  outputDir: string | null
  previewFileId: string | null
  editingFileId: string | null
  isCompressing: boolean
  history: HistoryEntry[]

  addFiles: (infos: { path: string; name: string; size: number }[]) => void
  removeFile: (id: string) => void
  clearFiles: () => void
  setQuality: (q: number) => void
  setPreset: (p: CompressionPreset) => void
  setOutputDir: (dir: string | null) => void
  setPreviewFileId: (id: string | null) => void
  setEditingFileId: (id: string | null) => void
  setThumbnail: (id: string, thumb: string) => void
  setFileStatus: (id: string, status: FileStatus, extra?: Partial<AppFile>) => void
  setFileProgress: (id: string, progress: number) => void
  addToHistory: (entry: HistoryEntry) => void
}

const PRESET_QUALITY: Record<CompressionPreset, number> = {
  light: 80,
  balanced: 60,
  aggressive: 35,
}

const loadHistory = (): HistoryEntry[] => {
  try {
    return JSON.parse(localStorage.getItem("compress-history") ?? "[]")
  } catch {
    return []
  }
}

export const useAppStore = create<AppStore>((set) => ({
  files: [],
  quality: 60,
  preset: "balanced",
  outputDir: null,
  previewFileId: null,
  editingFileId: null,
  isCompressing: false,
  history: loadHistory(),

  addFiles: (infos) =>
    set((state) => {
      const existing = new Set(state.files.map((f) => f.path))
      const newFiles: AppFile[] = infos
        .filter((i) => !existing.has(i.path))
        .map((i) => ({
          id: crypto.randomUUID(),
          path: i.path,
          name: i.name,
          type: getFileType(i.name),
          originalSize: i.size,
          estimatedSize: null,
          compressedSize: null,
          thumbnail: null,
          status: "idle",
          outputPath: null,
          progress: 0,
        }))
      return { files: [...state.files, ...newFiles] }
    }),

  removeFile: (id) =>
    set((state) => ({ files: state.files.filter((f) => f.id !== id) })),

  clearFiles: () => set({ files: [] }),

  setQuality: (q) => set({ quality: q }),

  setPreset: (p) => set({ preset: p, quality: PRESET_QUALITY[p] }),

  setOutputDir: (dir) => set({ outputDir: dir }),

  setPreviewFileId: (id) => set({ previewFileId: id }),

  setEditingFileId: (id) => set({ editingFileId: id }),

  setThumbnail: (id, thumb) =>
    set((state) => ({
      files: state.files.map((f) => (f.id === id ? { ...f, thumbnail: thumb } : f)),
    })),

  setFileStatus: (id, status, extra = {}) =>
    set((state) => ({
      files: state.files.map((f) =>
        f.id === id ? { ...f, status, ...extra } : f
      ),
      isCompressing: status === "compressing"
        ? true
        : state.files.some((f) => f.id !== id && f.status === "compressing"),
    })),

  setFileProgress: (id, progress) =>
    set((state) => ({
      files: state.files.map((f) => (f.id === id ? { ...f, progress } : f)),
    })),

  addToHistory: (entry) =>
    set((state) => {
      const history = [entry, ...state.history].slice(0, 10)
      localStorage.setItem("compress-history", JSON.stringify(history))
      return { history }
    }),
}))
