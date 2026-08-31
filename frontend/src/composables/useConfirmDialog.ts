import { ref } from 'vue'

export interface ConfirmDialogOptions {
  title: string
  message: string
  confirmLabel?: string
  cancelLabel?: string
  variant?: 'destructive' | 'default'
}

const isOpen = ref(false)
const options = ref<ConfirmDialogOptions>({
  title: '',
  message: '',
})

let resolvePromise: ((value: boolean) => void) | null = null

export function useConfirmDialog() {
  function confirm(opts: ConfirmDialogOptions): Promise<boolean> {
    // If a previous confirmation is still pending, settle it as cancelled so
    // its caller isn't left awaiting a Promise that never resolves once this
    // call overwrites resolvePromise.
    resolvePromise?.(false)
    options.value = opts
    isOpen.value = true
    return new Promise<boolean>((resolve) => {
      resolvePromise = resolve
    })
  }

  function handleConfirm() {
    isOpen.value = false
    resolvePromise?.(true)
    resolvePromise = null
  }

  function handleCancel() {
    isOpen.value = false
    resolvePromise?.(false)
    resolvePromise = null
  }

  return {
    isOpen,
    options,
    confirm,
    handleConfirm,
    handleCancel,
  }
}
