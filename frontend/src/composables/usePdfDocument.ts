import { onBeforeUnmount, ref, shallowRef } from 'vue'
import type { PDFDocumentLoadingTask, PDFDocumentProxy } from 'pdfjs-dist'

/**
 * Open a local PDF with pdf.js so its pages can be drawn on canvases - this
 * works on every browser, unlike the native viewer (mobile browsers don't
 * embed PDFs). pdf.js is loaded on demand so it only weighs on the import
 * screen, never on the main bundle. The legacy build carries the polyfills
 * the modern one skips (it calls Map#getOrInsertComputed, which most
 * browsers in the wild don't have yet).
 */
export function usePdfDocument(file: File | null) {
  const document = shallowRef<PDFDocumentProxy | null>(null)
  const failed = ref(false)
  let loadingTask: PDFDocumentLoadingTask | null = null
  let disposed = false

  async function load(source: File) {
    try {
      const [pdfjs, worker] = await Promise.all([
        import('pdfjs-dist/legacy/build/pdf.mjs'),
        import('pdfjs-dist/legacy/build/pdf.worker.min.mjs?url'),
      ])
      pdfjs.GlobalWorkerOptions.workerSrc = worker.default
      const data = new Uint8Array(await source.arrayBuffer())
      if (disposed) return
      loadingTask = pdfjs.getDocument({ data })
      document.value = await loadingTask.promise
    } catch {
      // Old browser or unreadable file: the picker falls back to page text.
      if (!disposed) failed.value = true
    }
  }

  if (file) void load(file)

  onBeforeUnmount(() => {
    disposed = true
    void loadingTask?.destroy()
  })

  return { document, failed }
}
