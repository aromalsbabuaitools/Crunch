import * as pdfjs from "pdfjs-dist"

// @ts-ignore — Vite ?url import for the worker
import workerUrl from "pdfjs-dist/build/pdf.worker.min.mjs?url"

pdfjs.GlobalWorkerOptions.workerSrc = workerUrl

export { pdfjs }
