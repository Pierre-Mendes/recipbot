import { fireEvent, render, screen } from '@testing-library/vue'
import { describe, expect, it } from 'vitest'

import PdfImportReview from '@/components/PdfImportReview.vue'
import type { PdfImportAnalysis } from '@/types'

const analysis: PdfImportAnalysis = {
  id: 'imp-1',
  page_count: 5,
  pages: [
    { number: 1, excerpt: 'Bolos juninos', has_text: true },
    { number: 2, excerpt: 'Bolo de milho', has_text: true },
    { number: 3, excerpt: 'Ingredientes Bolo de milho 1 lata de milho', has_text: true },
    { number: 4, excerpt: 'Ingredientes Bolo de coco 3 ovos', has_text: true },
    { number: 5, excerpt: '', has_text: false },
  ],
  recipes: [
    { title: 'Bolo de milho', pages: [2, 3] },
    { title: 'Bolo de coco', pages: [4] },
  ],
}

describe('PdfImportReview', () => {
  it('asks whether the detected recipes are right and confirms them as-is', async () => {
    const { emitted } = render(PdfImportReview, { props: { analysis } })

    expect(screen.getByText('Encontramos 2 receitas neste PDF. Está certo?')).toBeInTheDocument()
    expect(screen.getByText('Páginas 2–3')).toBeInTheDocument()
    expect(screen.getByText('Sem texto (imagem)')).toBeInTheDocument()

    await fireEvent.click(screen.getByRole('button', { name: 'Sim, importar 2 receitas' }))

    expect(emitted().confirm[0]).toEqual([
      [
        { title: 'Bolo de milho', pages: [2, 3] },
        { title: 'Bolo de coco', pages: [4] },
      ],
    ])
  })

  it('lets the user rename a recipe and move pages between recipes', async () => {
    const { emitted } = render(PdfImportReview, { props: { analysis } })

    await fireEvent.update(screen.getByLabelText('Título da receita 2'), 'Bolo de coco gelado')
    // Page 5 is a continuation of the coco recipe; page 2 isn't a recipe.
    const cocoKey = (screen.getByLabelText('Receita da página 4') as HTMLSelectElement).value
    await fireEvent.update(screen.getByLabelText('Receita da página 5'), cocoKey)
    await fireEvent.update(screen.getByLabelText('Receita da página 2'), '')

    await fireEvent.click(screen.getByRole('button', { name: 'Sim, importar 2 receitas' }))

    expect(emitted().confirm[0]).toEqual([
      [
        { title: 'Bolo de milho', pages: [3] },
        { title: 'Bolo de coco gelado', pages: [4, 5] },
      ],
    ])
  })

  it('drops removed recipes and recipes left without pages', async () => {
    const { emitted } = render(PdfImportReview, { props: { analysis } })

    await fireEvent.click(screen.getByRole('button', { name: 'Remover Bolo de milho' }))
    await fireEvent.click(screen.getByRole('button', { name: 'Adicionar receita' }))

    await fireEvent.click(screen.getByRole('button', { name: 'Sim, importar 1 receita' }))

    expect(emitted().confirm[0]).toEqual([[{ title: 'Bolo de coco', pages: [4] }]])
  })

  it('cannot confirm when no page is assigned to a recipe', async () => {
    render(PdfImportReview, { props: { analysis: { ...analysis, recipes: [] } } })

    expect(
      screen.getByText(
        'Não identificamos receitas automaticamente. Indique abaixo em quais páginas elas estão.',
      ),
    ).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Sim, importar 0 receitas' })).toBeDisabled()
  })
})
