import { PDFDocument, rgb, StandardFonts, LineCapStyle, degrees } from "pdf-lib"
import { parseSVG, makeAbsolute } from "svg-path-parser"
import { convertFileSrc } from "@tauri-apps/api/core"
import type { ContentEdit, LogicalPage } from "../../store/usePDFEditorStore"

type SvgCmd = Record<string, unknown>

function rgbToColor(c: [number, number, number]) {
  return rgb(c[0], c[1], c[2])
}

function convertSvgPathToPdf(
  svgPath: string,
  canvasW: number,
  canvasH: number,
  pdfW: number,
  pdfH: number
): string {
  const scaleX = pdfW / canvasW
  const scaleY = pdfH / canvasH
  const commands = makeAbsolute(parseSVG(svgPath)) as unknown as SvgCmd[]

  return commands
    .map((cmd) => {
      const scaled: SvgCmd = { ...cmd }
      for (const key of ["x", "x1", "x2"]) {
        if (typeof cmd[key] === "number") scaled[key] = (cmd[key] as number) * scaleX
      }
      for (const key of ["y", "y1", "y2"]) {
        if (typeof cmd[key] === "number") scaled[key] = (cmd[key] as number) * scaleY
      }
      return scaled
    })
    .map((c) => {
      switch (c.code as string) {
        case "M": return `M ${c.x} ${c.y}`
        case "L": return `L ${c.x} ${c.y}`
        case "Q": return `Q ${c.x1} ${c.y1} ${c.x} ${c.y}`
        case "C": return `C ${c.x1} ${c.y1} ${c.x2} ${c.y2} ${c.x} ${c.y}`
        case "Z": return "Z"
        default:  return ""
      }
    })
    .join(" ")
}

export async function buildEditedPDF(
  originalBytes: ArrayBuffer,
  logicalPages: LogicalPage[],
  edits: ContentEdit[]
): Promise<Uint8Array> {
  const srcDoc = await PDFDocument.load(originalBytes)
  const outDoc = await PDFDocument.create()

  // Pre-load any external PDFs referenced by inserted pages
  const externalDocs = new Map<string, PDFDocument>()
  for (const entry of logicalPages) {
    if (entry.type === "external" && !externalDocs.has(entry.filePath)) {
      const res = await fetch(convertFileSrc(entry.filePath))
      const bytes = await res.arrayBuffer()
      externalDocs.set(entry.filePath, await PDFDocument.load(bytes, { ignoreEncryption: true }))
    }
  }

  // Reconstruct page order
  for (const entry of logicalPages) {
    if (entry.type === "original") {
      const [copied] = await outDoc.copyPages(srcDoc, [entry.originalIndex])
      outDoc.addPage(copied)
    } else if (entry.type === "external") {
      const extDoc = externalDocs.get(entry.filePath)!
      const [copied] = await outDoc.copyPages(extDoc, [entry.originalIndex])
      outDoc.addPage(copied)
    } else {
      outDoc.addPage([entry.width, entry.height])
    }
  }

  const pages = outDoc.getPages()

  const fonts: Record<string, Awaited<ReturnType<typeof outDoc.embedFont>>> = {
    Helvetica:    await outDoc.embedFont(StandardFonts.Helvetica),
    "Times-Roman": await outDoc.embedFont(StandardFonts.TimesRoman),
    Courier:      await outDoc.embedFont(StandardFonts.Courier),
  }

  for (const edit of edits) {
    const page = pages[edit.pageIndex]
    if (!page) continue
    const { width: pdfW, height: pdfH } = page.getSize()

    switch (edit.kind) {
      case "text": {
        page.drawText(edit.content, {
          x: edit.x,
          y: edit.y,
          size: edit.fontSize,
          font: fonts[edit.fontFamily],
          color: rgbToColor(edit.color),
        })
        break
      }
      case "highlight": {
        page.drawRectangle({
          x: edit.x,
          y: edit.y,
          width: edit.width,
          height: edit.height,
          color: rgbToColor(edit.color),
          opacity: edit.opacity,
          borderWidth: 0,
        })
        break
      }
      case "signature": {
        const base64 = edit.imageDataUrl.split(",")[1]
        const imgBytes = Uint8Array.from(atob(base64), (c) => c.charCodeAt(0))
        const isPng = edit.imageDataUrl.startsWith("data:image/png")
        const embeddedImg = isPng
          ? await outDoc.embedPng(imgBytes)
          : await outDoc.embedJpg(imgBytes)
        const rot = edit.rotation ?? 0
        if (rot === 0) {
          page.drawImage(embeddedImg, {
            x: edit.x,
            y: edit.y,
            width: edit.width,
            height: edit.height,
          })
        } else {
          // pdf-lib rotates around (x, y); adjust to rotate around image center instead
          const θ = (rot * Math.PI) / 180
          const cx = edit.x + edit.width / 2
          const cy = edit.y + edit.height / 2
          const adjX = cx - (edit.width / 2 * Math.cos(θ) - edit.height / 2 * Math.sin(θ))
          const adjY = cy - (edit.width / 2 * Math.sin(θ) + edit.height / 2 * Math.cos(θ))
          page.drawImage(embeddedImg, {
            x: adjX,
            y: adjY,
            width: edit.width,
            height: edit.height,
            rotate: degrees(rot),
          })
        }
        break
      }
      case "draw": {
        const pdfPath = convertSvgPathToPdf(
          edit.svgPath,
          edit.canvasWidth,
          edit.canvasHeight,
          pdfW,
          pdfH
        )
        page.drawSvgPath(pdfPath, {
          x: edit.offsetX,
          y: pdfH + edit.offsetY,
          color: undefined,
          borderColor: rgbToColor(edit.strokeColor),
          borderWidth: edit.strokeWidth * (pdfW / edit.canvasWidth),
          borderLineCap: LineCapStyle.Round,
        })
        break
      }
    }
  }

  return outDoc.save()
}
