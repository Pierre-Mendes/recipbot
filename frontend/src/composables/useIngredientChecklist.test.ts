import { beforeEach, describe, expect, it } from 'vitest'
import { nextTick, ref } from 'vue'

import { useIngredientChecklist } from '@/composables/useIngredientChecklist'

describe('useIngredientChecklist', () => {
  beforeEach(() => localStorage.clear())

  it('toggles items and reports progress', () => {
    const list = useIngredientChecklist('r1', ref(3))

    list.toggle(0)
    list.toggle(2)
    expect(list.isChecked(0)).toBe(true)
    expect(list.isChecked(1)).toBe(false)
    expect(list.progressLabel.value).toBe('2 de 3 separados')

    list.toggle(0)
    expect(list.isChecked(0)).toBe(false)
    expect(list.checkedCount.value).toBe(1)
  })

  it('persists checks per recipe and restores them', async () => {
    const first = useIngredientChecklist('r1', ref(4))
    first.toggle(1)
    await nextTick()

    expect(useIngredientChecklist('r1', ref(4)).isChecked(1)).toBe(true)
    expect(useIngredientChecklist('r2', ref(4)).isChecked(1)).toBe(false)
  })

  it('ignores stored indexes beyond the current ingredient count', () => {
    localStorage.setItem('recipbot:checklist:r1', JSON.stringify([0, 5]))

    const list = useIngredientChecklist('r1', ref(2))
    expect(list.checkedCount.value).toBe(1)
    expect(list.isChecked(5)).toBe(false)
  })

  it('survives corrupted storage and clears it on reset', async () => {
    localStorage.setItem('recipbot:checklist:r1', '{not json')
    const list = useIngredientChecklist('r1', ref(2))
    expect(list.checkedCount.value).toBe(0)

    list.toggle(1)
    await nextTick()
    list.reset()
    await nextTick()
    expect(localStorage.getItem('recipbot:checklist:r1')).toBeNull()
  })
})
