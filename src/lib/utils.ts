import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 B"
  const k = 1024
  const sizes = ["B", "KB", "MB", "GB"]
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`
}

export function formatSavings(original: number, compressed: number): string {
  const saved = original - compressed
  const pct = ((saved / original) * 100).toFixed(1)
  return `${pct}% smaller (${formatBytes(saved)} saved)`
}

export function getFileType(name: string): "image" | "pdf" {
  const ext = name.split(".").pop()?.toLowerCase() ?? ""
  return ext === "pdf" ? "pdf" : "image"
}

export function deriveOutputPath(inputPath: string, suffix = "_compressed"): string {
  const lastDot = inputPath.lastIndexOf(".")
  const lastSep = Math.max(inputPath.lastIndexOf("/"), inputPath.lastIndexOf("\\"))
  if (lastDot > lastSep) {
    return inputPath.slice(0, lastDot) + suffix + inputPath.slice(lastDot)
  }
  return inputPath + suffix
}
