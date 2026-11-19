// Handing a file to the browser to save, and the name it gets. Kept apart from the export code,
// which is fetched only when the Export dialog opens.

import type { FigDoc } from '../model/types'

export function download(data: Blob | string, filename: string, type = 'application/octet-stream'): void {
  const blob = typeof data === 'string' ? new Blob([data], { type }) : data
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 10_000)
}

export function fileBase(doc: FigDoc): string {
  return doc.name.trim().replace(/[^\w\- ]+/g, '').replace(/\s+/g, '-').toLowerCase() || 'figure'
}
