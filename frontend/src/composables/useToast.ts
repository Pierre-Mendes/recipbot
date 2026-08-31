import { ref } from 'vue'

export interface Toast {
  id: number
  message: string
  variant: 'success' | 'error' | 'info'
  duration?: number
}

const toasts = ref<Toast[]>([])
let nextId = 0

export function useToast() {
  function addToast(message: string, variant: Toast['variant'] = 'info', duration = 4000) {
    const id = nextId++
    toasts.value.push({ id, message, variant, duration })
    if (duration > 0) {
      setTimeout(() => removeToast(id), duration)
    }
  }

  function removeToast(id: number) {
    toasts.value = toasts.value.filter((t) => t.id !== id)
  }

  function success(message: string) {
    addToast(message, 'success')
  }

  function error(message: string) {
    addToast(message, 'error', 6000)
  }

  function info(message: string) {
    addToast(message, 'info')
  }

  return {
    toasts,
    addToast,
    removeToast,
    success,
    error,
    info,
  }
}
