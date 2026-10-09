import { render, screen } from '@testing-library/vue'
import { describe, expect, it } from 'vitest'

import Button from '@/components/ui/Button.vue'

describe('Button', () => {
  it('applies the requested variant and size instead of the defaults', () => {
    render(Button, {
      props: { variant: 'ghost', size: 'icon' },
      slots: { default: 'Tema' },
    })

    const button = screen.getByRole('button', { name: 'Tema' })
    expect(button.className).toContain('hover:bg-accent')
    expect(button.className).toContain('w-11')
    expect(button.className).not.toContain('bg-primary')
    expect(button).not.toHaveAttribute('variant')
  })

  it('renders the primary variant by default', () => {
    render(Button, { slots: { default: 'Salvar' } })

    expect(screen.getByRole('button', { name: 'Salvar' }).className).toContain('bg-primary')
  })
})
