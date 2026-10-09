import { render, screen } from '@testing-library/vue'
import { describe, expect, it } from 'vitest'

import BitMascot from '@/components/brand/BitMascot.vue'
import BrandMark from '@/components/brand/BrandMark.vue'

describe('BitMascot', () => {
  it('is hidden from assistive tech by default', () => {
    const { container } = render(BitMascot, { props: { pose: 'thinking' } })

    const svg = container.querySelector('svg')
    expect(svg).toHaveAttribute('aria-hidden', 'true')
    expect(svg).toHaveAttribute('data-pose', 'thinking')
  })

  it('exposes a pose-specific label when not decorative', () => {
    render(BitMascot, { props: { pose: 'oops', decorative: false } })

    expect(screen.getByRole('img', { name: 'Bit, o robô chef, preocupado' })).toBeInTheDocument()
  })

  it('draws the wooden spoon only in the cooking pose', () => {
    const cooking = render(BitMascot, { props: { pose: 'cooking' } })
    expect(cooking.container.querySelectorAll('ellipse')).toHaveLength(2)
    cooking.unmount()

    const hello = render(BitMascot, { props: { pose: 'hello' } })
    expect(hello.container.querySelectorAll('ellipse')).toHaveLength(1)
  })

  it('stirs the spoon only when animated', () => {
    const still = render(BitMascot, { props: { pose: 'cooking' } })
    expect(still.container.querySelector('.bit-stir')).toBeNull()
    still.unmount()

    const stirring = render(BitMascot, { props: { pose: 'cooking', animated: true } })
    expect(stirring.container.querySelector('.bit-stir')).not.toBeNull()
  })
})

describe('BrandMark', () => {
  it('is labelled when a label is given', () => {
    render(BrandMark, { props: { label: 'RecipBot' } })

    expect(screen.getByRole('img', { name: 'RecipBot' })).toBeInTheDocument()
  })

  it('drops the ears below 24px', () => {
    const small = render(BrandMark, { props: { size: 16 } })
    const large = render(BrandMark, { props: { size: 48 } })

    expect(large.container.querySelectorAll('rect').length).toBe(
      small.container.querySelectorAll('rect').length + 2,
    )
  })
})
