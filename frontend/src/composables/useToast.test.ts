import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { useToast } from '@/composables/useToast'

describe('useToast', () => {
  beforeEach(() => {
    // The toast list is a module-level singleton; start each test from empty.
    useToast().toasts.value = []
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('adds a toast with the default "info" variant', () => {
    const toast = useToast()
    toast.addToast('ola')
    expect(toast.toasts.value).toHaveLength(1)
    expect(toast.toasts.value[0]).toMatchObject({ message: 'ola', variant: 'info' })
  })

  it('success/error/info set the right variant, and error lasts longer', () => {
    const toast = useToast()
    toast.success('ok')
    toast.error('falhou')
    toast.info('fyi')

    expect(toast.toasts.value.map((t) => t.variant)).toEqual(['success', 'error', 'info'])
    const error = toast.toasts.value.find((t) => t.variant === 'error')
    expect(error?.duration).toBe(6000)
  })

  it('removes a toast by id', () => {
    const toast = useToast()
    toast.addToast('a')
    toast.addToast('b')
    toast.removeToast(toast.toasts.value[0].id)
    expect(toast.toasts.value.map((t) => t.message)).toEqual(['b'])
  })

  it('auto-removes a toast once its duration elapses', () => {
    vi.useFakeTimers()
    const toast = useToast()
    toast.addToast('temporario', 'info', 1000)
    expect(toast.toasts.value).toHaveLength(1)
    vi.advanceTimersByTime(1000)
    expect(toast.toasts.value).toHaveLength(0)
  })

  it('keeps a toast with duration 0 (no auto-remove)', () => {
    vi.useFakeTimers()
    const toast = useToast()
    toast.addToast('fixo', 'info', 0)
    vi.advanceTimersByTime(10000)
    expect(toast.toasts.value).toHaveLength(1)
  })
})
