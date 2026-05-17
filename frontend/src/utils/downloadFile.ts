import { isStandalonePwa } from './pwaInstall'

export { isStandalonePwa }

function isMobileLike(): boolean {
  if (typeof navigator === 'undefined') return false
  return /iPhone|iPad|iPod|Android/i.test(navigator.userAgent)
}

/**
 * Download a blob in desktop browsers, mobile Safari, and installed PWA.
 * Uses anchor download first, then Share API or new-tab fallback when needed.
 */
export async function downloadBlob(blob: Blob, filename: string): Promise<void> {
  const safeName = filename.replace(/[/\\?%*:|"<>]/g, '-').trim() || 'download'
  const url = URL.createObjectURL(blob)

  const revokeLater = () => {
    window.setTimeout(() => URL.revokeObjectURL(url), 120_000)
  }

  try {
    const anchor = document.createElement('a')
    anchor.href = url
    anchor.download = safeName
    anchor.rel = 'noopener'
    anchor.style.display = 'none'
    document.body.appendChild(anchor)
    anchor.click()
    document.body.removeChild(anchor)

    const needsFallback = isStandalonePwa() || isMobileLike()
    if (needsFallback) {
      await new Promise((resolve) => window.setTimeout(resolve, 350))
      const file = new File([blob], safeName, { type: blob.type || 'application/octet-stream' })
      if (typeof navigator.share === 'function' && navigator.canShare?.({ files: [file] })) {
        try {
          await navigator.share({ files: [file], title: safeName })
          return
        } catch (err) {
          if (err instanceof DOMException && err.name === 'AbortError') return
        }
      }
      const opened = window.open(url, '_blank', 'noopener,noreferrer')
      if (!opened) {
        throw new Error('Could not open the file. Allow pop-ups or use Share when prompted.')
      }
    }
  } finally {
    revokeLater()
  }
}

/** Save a jsPDF document via blob download (PWA-safe). */
export async function savePdf(doc: { output(type: 'blob'): Blob }, filename: string): Promise<void> {
  const name = filename.endsWith('.pdf') ? filename : `${filename}.pdf`
  const blob = doc.output('blob')
  await downloadBlob(blob, name)
}

/** CSV / Excel-friendly download (UTF-8 BOM). */
export async function downloadCsv(content: string, filename: string): Promise<void> {
  const name = filename.endsWith('.csv') ? filename : `${filename}.csv`
  const blob = new Blob([`\uFEFF${content}`], { type: 'text/csv;charset=utf-8;' })
  await downloadBlob(blob, name)
}
