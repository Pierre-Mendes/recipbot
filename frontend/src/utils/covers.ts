import type { RecipeCover } from '@/types'

/**
 * Built-in cover illustrations a user can pick instead of uploading a photo.
 * The artwork lives in `public/covers/<key>.svg`; the API stores only the key
 * (App\Enums\RecipeCover), so this list must stay in sync with that enum.
 */
export const RECIPE_COVERS: { value: RecipeCover; label: string }[] = [
  { value: 'cake', label: 'Bolo' },
  { value: 'pasta', label: 'Massa' },
  { value: 'salad', label: 'Salada' },
  { value: 'soup', label: 'Sopa' },
  { value: 'bread', label: 'Pão' },
  { value: 'meat', label: 'Carne' },
  { value: 'fish', label: 'Peixe' },
  { value: 'drink', label: 'Bebida' },
]

export function coverUrl(cover: RecipeCover): string {
  return `/covers/${cover}.svg`
}

/** Photo formats the API accepts (UploadRecipeImageRequest). */
export const ACCEPTED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp']

/** Upload limit enforced by the API (recipbot.images.max_file_kb). */
export const MAX_IMAGE_BYTES = 5 * 1024 * 1024

/** Longest side, in pixels, photos are downscaled to before upload. */
const MAX_IMAGE_SIDE = 1600

/**
 * Downscale a phone photo before upload: a 12 MP camera shot easily passes
 * the 5 MB limit and wastes mobile data, while a card or hero never shows
 * more than ~1600px. Small files go through untouched, and when the browser
 * can't decode or re-encode the image the original is returned (the API
 * still validates it).
 */
export async function prepareImageForUpload(file: File): Promise<File> {
  if (file.size <= 1024 * 1024 || typeof createImageBitmap !== 'function') {
    return file
  }

  try {
    const bitmap = await createImageBitmap(file)
    const scale = Math.min(1, MAX_IMAGE_SIDE / Math.max(bitmap.width, bitmap.height))
    const canvas = document.createElement('canvas')
    canvas.width = Math.round(bitmap.width * scale)
    canvas.height = Math.round(bitmap.height * scale)
    const context = canvas.getContext('2d')
    if (!context) return file
    context.drawImage(bitmap, 0, 0, canvas.width, canvas.height)
    bitmap.close()

    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, 'image/jpeg', 0.85),
    )
    if (!blob || blob.size >= file.size) return file

    const name = file.name.replace(/\.[^.]+$/, '') || 'foto'
    return new File([blob], `${name}.jpg`, { type: 'image/jpeg' })
  } catch {
    return file
  }
}
