import { fireEvent, render, screen } from '@testing-library/vue'
import { beforeAll, describe, expect, it } from 'vitest'

import CoverPicker from '@/components/CoverPicker.vue'

beforeAll(() => {
  // jsdom has no object URLs; the picker only needs them for the preview.
  URL.createObjectURL ??= () => 'blob:preview'
  URL.revokeObjectURL ??= () => {}
})

function pickFile(file: File) {
  const input = screen.getByTestId('cover-file-input') as HTMLInputElement
  Object.defineProperty(input, 'files', { value: [file], configurable: true })
  return fireEvent.change(input)
}

describe('CoverPicker', () => {
  it('collects a chosen photo for upload', async () => {
    const { emitted } = render(CoverPicker, { props: { title: 'Bolo' } })
    const photo = new File(['x'], 'bolo.jpg', { type: 'image/jpeg' })

    await pickFile(photo)
    await new Promise((resolve) => setTimeout(resolve))

    expect(emitted()['update:image']?.at(-1)).toEqual([{ file: photo, remove: false }])
    expect(screen.getByRole('button', { name: /Trocar foto/ })).toBeInTheDocument()
  })

  it('rejects formats the API does not accept', async () => {
    const { emitted } = render(CoverPicker, { props: { title: 'Bolo' } })

    await pickFile(new File(['<svg/>'], 'logo.svg', { type: 'image/svg+xml' }))

    expect(screen.getByRole('alert')).toHaveTextContent('Use uma foto JPG, PNG ou WebP.')
    expect(emitted()['update:image']).toBeUndefined()
  })

  it('choosing an illustration selects it and drops the stored photo', async () => {
    const { emitted } = render(CoverPicker, {
      props: { title: 'Bolo', currentImageUrl: 'http://minio/bolo.jpg' },
    })

    await fireEvent.click(screen.getByRole('radio', { name: 'Salada' }))

    expect(emitted()['update:cover']?.at(-1)).toEqual(['salad'])
    expect(emitted()['update:image']?.at(-1)).toEqual([{ file: null, remove: true }])
  })
})
