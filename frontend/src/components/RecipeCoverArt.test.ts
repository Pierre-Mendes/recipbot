import { fireEvent, render, screen } from '@testing-library/vue'
import { describe, expect, it } from 'vitest'

import RecipeCoverArt from '@/components/RecipeCoverArt.vue'

describe('RecipeCoverArt', () => {
  it('falls back to the cover illustration when the photo fails to load', async () => {
    const { container } = render(RecipeCoverArt, {
      props: { title: 'Sopa', imageUrl: 'http://minio/gone.jpg', cover: 'soup' },
    })

    const img = container.querySelector('img') as HTMLImageElement
    expect(img).toHaveAttribute('src', 'http://minio/gone.jpg')

    await fireEvent.error(img)

    expect(container.querySelector('img')).toHaveAttribute('src', '/covers/soup.svg')
  })

  it('falls back to the monogram when a failed photo has no cover', async () => {
    const { container } = render(RecipeCoverArt, {
      props: { title: 'pão de queijo', imageUrl: 'http://minio/gone.jpg' },
    })

    await fireEvent.error(container.querySelector('img') as HTMLImageElement)

    expect(container.querySelector('img')).toBeNull()
    expect(screen.getByText('P')).toBeInTheDocument()
  })
})
