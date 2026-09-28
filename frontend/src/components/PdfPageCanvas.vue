<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref, watch } from 'vue'
import type { PDFDocumentProxy, RenderTask } from 'pdfjs-dist'

/**
 * Draws one page of an open pdf.js document on a canvas, sized to the
 * container width (CSS) and rendered at `renderWidth` device pixels. With
 * `lazy`, rendering waits until the canvas scrolls into view, so a 150-page
 * e-book doesn't rasterize every thumbnail up front.
 */
const props = withDefaults(
  defineProps<{
    document: PDFDocumentProxy
    pageNumber: number
    renderWidth?: number
    lazy?: boolean
  }>(),
  { renderWidth: 800, lazy: false },
)

const canvas = ref<HTMLCanvasElement | null>(null)
const rendering = ref(true)
let renderTask: RenderTask | null = null
let observer: IntersectionObserver | null = null
let visible = !props.lazy

async function render() {
  const element = canvas.value
  if (!element || !visible) return

  // A canvas can't host two renders at once: cancel and settle the previous.
  if (renderTask) {
    renderTask.cancel()
    await renderTask.promise.catch(() => undefined)
  }

  rendering.value = true
  try {
    const page = await props.document.getPage(props.pageNumber)
    const scale =
      (props.renderWidth * (window.devicePixelRatio || 1)) / page.getViewport({ scale: 1 }).width
    const viewport = page.getViewport({ scale })
    element.width = Math.floor(viewport.width)
    element.height = Math.floor(viewport.height)
    renderTask = page.render({ canvas: element, viewport })
    await renderTask.promise
    rendering.value = false
  } catch {
    // Cancelled by a newer render, or the document was destroyed.
  }
}

onMounted(() => {
  if (props.lazy && typeof IntersectionObserver === 'function' && canvas.value) {
    observer = new IntersectionObserver((entries) => {
      if (entries.some((entry) => entry.isIntersecting)) {
        visible = true
        observer?.disconnect()
        void render()
      }
    })
    observer.observe(canvas.value)
    return
  }
  visible = true
  void render()
})

watch(() => [props.document, props.pageNumber], render)

onBeforeUnmount(() => {
  observer?.disconnect()
  renderTask?.cancel()
})
</script>

<template>
  <!-- Starts at an A4 ratio so the placeholder has the page's shape. -->
  <canvas
    ref="canvas"
    width="210"
    height="297"
    class="block h-auto w-full bg-white"
    :class="rendering ? 'animate-pulse bg-muted' : ''"
    :aria-label="`Página ${pageNumber}`"
    role="img"
  />
</template>
