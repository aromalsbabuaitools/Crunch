import { useEffect } from "react"
import TopBar from "./components/TopBar"
import DropZone from "./components/DropZone"
import FileList from "./components/FileList"
import ControlPanel from "./components/ControlPanel"
import PreviewModal from "./components/PreviewModal"
import { useAppStore } from "./store/useAppStore"

export default function App() {
  const files = useAppStore((s) => s.files)
  const setPreviewFileId = useAppStore((s) => s.setPreviewFileId)

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") setPreviewFileId(null)
    }
    window.addEventListener("keydown", handler)
    return () => window.removeEventListener("keydown", handler)
  }, [setPreviewFileId])

  return (
    <div className="flex flex-col h-screen bg-dark-bg text-dark-text overflow-hidden">
      <TopBar />

      <div className="flex flex-1 min-h-0">
        <div className="flex-1 flex flex-col min-w-0">
          {files.length === 0 ? <DropZone /> : <FileList />}
        </div>
        {files.length > 0 && <ControlPanel />}
      </div>

      <PreviewModal />
    </div>
  )
}
