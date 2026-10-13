import { render, screen } from '@testing-library/vue'
import { describe, expect, it } from 'vitest'
import { createRouter, createWebHistory } from 'vue-router'

import BottomNav from '@/components/BottomNav.vue'

const stub = { template: '<div />' }

async function renderAt(path: string) {
  const router = createRouter({
    history: createWebHistory(),
    routes: [
      { path: '/', name: 'recipes', component: stub },
      { path: '/recipes/new', name: 'recipe-new', component: stub },
      { path: '/help', name: 'help', component: stub },
      { path: '/profile', name: 'profile', component: stub },
    ],
  })
  await router.push(path)
  render(BottomNav, { global: { plugins: [router] } })
}

describe('BottomNav', () => {
  it('links to the main sections, with "Nova receita" as the center action', async () => {
    await renderAt('/')

    expect(screen.getByRole('link', { name: /Receitas/ })).toHaveAttribute('href', '/')
    expect(screen.getByRole('link', { name: /Buscar/ })).toHaveAttribute('href', '/?search=')
    expect(screen.getByRole('link', { name: 'Nova receita' })).toHaveAttribute(
      'href',
      '/recipes/new',
    )
    expect(screen.getByRole('link', { name: /Ajuda/ })).toHaveAttribute('href', '/help')
    expect(screen.getByRole('link', { name: /Perfil/ })).toHaveAttribute('href', '/profile')
  })

  it('marks the search tab, not the recipes tab, as current on ?search', async () => {
    await renderAt('/?search=')

    expect(screen.getByRole('link', { name: /Buscar/ })).toHaveAttribute('aria-current', 'page')
    expect(screen.getByRole('link', { name: /Receitas/ })).not.toHaveAttribute('aria-current')
  })
})
