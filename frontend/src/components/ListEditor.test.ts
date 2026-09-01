import { fireEvent, render, screen } from '@testing-library/vue'
import { describe, expect, it } from 'vitest'

import ListEditor from '@/components/ListEditor.vue'

function mount(modelValue: string[] = [], extra: Record<string, unknown> = {}) {
  return render(ListEditor, {
    props: { modelValue, label: 'Ingredientes', itemLabel: 'ingrediente', ...extra },
  })
}

describe('ListEditor', () => {
  it('renders one empty row when the model is empty', () => {
    mount([])
    expect(screen.getByLabelText('ingrediente 1')).toHaveValue('')
  })

  it('renders a row per model item', () => {
    mount(['farinha', 'acucar'])
    expect(screen.getByLabelText('ingrediente 1')).toHaveValue('farinha')
    expect(screen.getByLabelText('ingrediente 2')).toHaveValue('acucar')
  })

  it('emits the trimmed, non-empty items on edit', async () => {
    const { emitted } = mount(['farinha'])
    await fireEvent.update(screen.getByLabelText('ingrediente 1'), '  ovos  ')
    const events = emitted()['update:modelValue'] as unknown[][]
    expect(events.at(-1)).toEqual([['ovos']])
  })

  it('adds and removes rows', async () => {
    const { emitted } = mount(['farinha'])
    await fireEvent.click(screen.getByRole('button', { name: 'Adicionar ingrediente' }))
    await fireEvent.update(screen.getByLabelText('ingrediente 2'), 'acucar')

    await fireEvent.click(screen.getByLabelText('Remover ingrediente 1'))
    const events = emitted()['update:modelValue'] as unknown[][]
    expect(events.at(-1)).toEqual([['acucar']])
  })

  it('reorders rows with the arrow controls', async () => {
    const { emitted } = mount(['a', 'b'])
    await fireEvent.click(screen.getByLabelText('Mover ingrediente 2 para cima'))
    const events = emitted()['update:modelValue'] as unknown[][]
    expect(events.at(-1)).toEqual([['b', 'a']])
  })

  it('numbers steps when ordered', () => {
    mount(['Ferva', 'Frite'], { itemLabel: 'passo', ordered: true, label: 'Modo de Preparo' })
    // Ordered rows expose a 1-based position marker.
    expect(screen.getByText('1')).toBeInTheDocument()
    expect(screen.getByText('2')).toBeInTheDocument()
  })

  it('bulk paste replaces the list, one item per line', async () => {
    const { emitted } = mount(['old'])
    await fireEvent.click(screen.getByRole('button', { name: 'Colar em massa' }))
    const textarea = screen.getByPlaceholderText('Um ingrediente por linha...')
    await fireEvent.update(textarea, 'farinha\n  acucar  \n\novos')
    await fireEvent.click(screen.getByRole('button', { name: 'Aplicar lista' }))

    const events = emitted()['update:modelValue'] as unknown[][]
    expect(events.at(-1)).toEqual([['farinha', 'acucar', 'ovos']])
  })
})
