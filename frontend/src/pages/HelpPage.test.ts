import { describe, it, expect, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import HelpPage from './HelpPage.vue'
import { helpContent } from '@/content/help'

describe('HelpPage', () => {
  let wrapper: ReturnType<typeof mount>

  beforeEach(() => {
    wrapper = mount(HelpPage)
  })

  it('renders the help page with title', () => {
    expect(wrapper.find('h1').text()).toBe('Ajuda')
  })

  it('renders all FAQ items', () => {
    const items = wrapper.findAll('.border-b')
    expect(items).toHaveLength(helpContent.length)
  })

  it('expands and collapses FAQ items', async () => {
    const firstItemButton = wrapper.findAll('button')[1] // Skip the back button
    const panelStyle = () => wrapper.find('.p-4.pt-0').attributes('style') ?? ''

    // Starts collapsed (v-show renders `display: none`).
    expect(panelStyle()).toContain('display: none')

    await firstItemButton.trigger('click')
    expect(panelStyle()).not.toContain('display: none')
    expect(firstItemButton.attributes('aria-expanded')).toBe('true')

    await firstItemButton.trigger('click')
    expect(panelStyle()).toContain('display: none')
    expect(firstItemButton.attributes('aria-expanded')).toBe('false')
  })

  it('filters FAQ items based on search query', async () => {
    const searchInput = wrapper.find('#search')
    await searchInput.setValue('receita manual')

    const visibleItems = wrapper.findAll('.border-b:not([style*="display: none"])')
    const filteredItems = helpContent.filter(item =>
      item.question.toLowerCase().includes('receita manual') ||
      item.answer.toLowerCase().includes('receita manual')
    )

    expect(visibleItems).toHaveLength(filteredItems.length)
  })

  it('has accessible accordion with proper ARIA attributes', () => {
    const firstItemButton = wrapper.findAll('button')[1]
    expect(firstItemButton.attributes('aria-expanded')).toBe('false')
    expect(firstItemButton.attributes('aria-controls')).toBe('faq-0')
  })
})
