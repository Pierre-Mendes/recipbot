import { beforeEach, describe, expect, it } from 'vitest'

import { useConfirmDialog } from '@/composables/useConfirmDialog'

describe('useConfirmDialog', () => {
  beforeEach(() => {
    // Singleton state: settle any pending promise and close before each test.
    useConfirmDialog().handleCancel()
  })

  it('opens with the given options and resolves true on confirm', async () => {
    const dialog = useConfirmDialog()
    const answer = dialog.confirm({
      title: 'Apagar',
      message: 'Tem certeza?',
      variant: 'destructive',
    })

    expect(dialog.isOpen.value).toBe(true)
    expect(dialog.options.value).toMatchObject({
      title: 'Apagar',
      message: 'Tem certeza?',
      variant: 'destructive',
    })

    dialog.handleConfirm()
    await expect(answer).resolves.toBe(true)
    expect(dialog.isOpen.value).toBe(false)
  })

  it('resolves false on cancel', async () => {
    const dialog = useConfirmDialog()
    const answer = dialog.confirm({ title: 'T', message: 'M' })
    dialog.handleCancel()
    await expect(answer).resolves.toBe(false)
    expect(dialog.isOpen.value).toBe(false)
  })

  it('settles a still-pending confirmation as cancelled when a new one opens', async () => {
    const dialog = useConfirmDialog()
    const first = dialog.confirm({ title: 'A', message: 'a' })
    const second = dialog.confirm({ title: 'B', message: 'b' })

    await expect(first).resolves.toBe(false)
    expect(dialog.options.value.title).toBe('B')

    dialog.handleConfirm()
    await expect(second).resolves.toBe(true)
  })
})
