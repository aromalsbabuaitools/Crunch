import { useEffect, useRef } from "react"
import { pdfjs } from "./pdfjs"
import type { PDFDocumentProxy, RenderTask } from "pdfjs-dist"

// Module-level cache so re-renders don't re-fetch the same PDF
const docCache = new Map<string, Promise<PDFDocumentProxy>>()

function getDoc(src: string): Promise<PDFDocumentProxy> {
  if (!docCache.has(src)) {
    docCache.set(src, pdfjs.getDocument(src).promise)
  }
  return docCache.get(src)!
}

interface Props {
  src: string
  pageNumber: number
  width: number
  height: number
}

export default function PDFPageRenderer({ src, pageNumber, width, height }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    let cancelled = false
    let renderTask: RenderTask | null = null

    async function render() {
      try {
        const doc = await getDoc(src)
        if (cancelled) return
        const page = await doc.getPage(pageNumber)
        if (cancelled) return
        const canvas = canvasRef.current
        if (!canvas) return
        const baseViewport = page.getViewport({ scale: 1 })
        const scale = width / baseViewport.width
        const viewport = page.getViewport({ scale })
        canvas.width = Math.round(viewport.width)
        canvas.height = Math.round(viewport.height)
        renderTask = page.render({ canvas, viewport })
        await renderTask.promise
      } catch (e: any) {
        if (!cancelled && e?.name !== "RenderingCancelledException") {
          console.error("PDF render error", e)
        }
      }
    }

    render()
    return () => {
      cancelled = true
      renderTask?.cancel()
    }
  }, [src, pageNumber, width])

  return (
    <canvas
      ref={canvasRef}
      style={{ display: "block", width, height, background: "white" }}
    />
  )
}
