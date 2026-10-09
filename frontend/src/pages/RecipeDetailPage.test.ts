import { fireEvent, render, screen } from '@testing-library/vue'
import { createPinia } from 'pinia'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createRouter, createWebHistory } from 'vue-router'

import type { Recipe } from '@/types'

const recipe: Recipe = {
  id: 'r-42',
  user_id: 1,
  title: 'Bolo de fubá',
  ingredients: ['3 ovos', '2 xícaras de açúcar', '1 pitada de sal'],
  instructions: ['Bata tudo.', 'Asse por 50 minutos.'],
  tags: [],
  source_url: null,
  created_at: '',
  updated_at: '',
}

vi.mock('@/api/recipes', () => ({
  getRecipe: vi.fn(() => Promise.resolve(recipe)),
  exportRecipe: vi.fn(),
  exportRecipePdf: vi.fn(),
}))

import RecipeDetailPage from '@/pages/RecipeDetailPage.vue'

async function renderPage() {
  const router = createRouter({
    history: createWebHistory(),
    routes: [
      { path: '/', name: 'recipes', component: { template: '<div />' } },
      { path: '/recipes/:id', name: 'recipe-detail', component: RecipeDetailPage },
      { path: '/recipes/:id/edit', name: 'recipe-edit', component: { template: '<div />' } },
    ],
  })
  router.push('/recipes/r-42')
  await router.isReady()
  render(RecipeDetailPage, { global: { plugins: [router, createPinia()] } })
  await screen.findByRole('heading', { name: 'Ingredientes' })
}

describe('RecipeDetailPage ingredient checklist', () => {
  beforeEach(() => localStorage.clear())

  it('renders one checkbox per ingredient and tracks progress', async () => {
    await renderPage()

    const boxes = screen.getAllByRole('checkbox')
    expect(boxes).toHaveLength(3)
    expect(screen.getByText('0 de 3 separados')).toBeInTheDocument()

    await fireEvent.click(screen.getByRole('checkbox', { name: /ovos/ }))

    expect(screen.getByRole('checkbox', { name: /ovos/ })).toBeChecked()
    expect(screen.getByText('1 de 3 separados')).toBeInTheDocument()
  })

  it('clears every check with "Desmarcar tudo"', async () => {
    await renderPage()
    expect(screen.queryByRole('button', { name: 'Desmarcar tudo' })).not.toBeInTheDocument()

    await fireEvent.click(screen.getByRole('checkbox', { name: /sal/ }))
    await fireEvent.click(screen.getByRole('button', { name: 'Desmarcar tudo' }))

    expect(screen.getByRole('checkbox', { name: /sal/ })).not.toBeChecked()
    expect(screen.getByText('0 de 3 separados')).toBeInTheDocument()
  })

  it('numbers the preparation steps', async () => {
    await renderPage()

    const steps = screen.getAllByRole('listitem').filter((li) => li.closest('ol'))
    expect(steps).toHaveLength(2)
    expect(steps[1]).toHaveTextContent('2Asse por 50 minutos.')
  })
})
