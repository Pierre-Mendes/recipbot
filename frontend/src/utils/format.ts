/** Formatting helpers shared across recipe views. */

const RELATIVE_UNITS: [Intl.RelativeTimeFormatUnit, number][] = [
  ['year', 60 * 60 * 24 * 365],
  ['month', 60 * 60 * 24 * 30],
  ['week', 60 * 60 * 24 * 7],
  ['day', 60 * 60 * 24],
  ['hour', 60 * 60],
  ['minute', 60],
  ['second', 1],
]

/**
 * Human-friendly relative time in pt-BR (e.g. "há 3 dias", "agora").
 * Returns `null` for missing or unparseable dates so callers can hide the field.
 */
export function relativeTime(iso?: string | null): string | null {
  if (!iso) return null

  const timestamp = new Date(iso).getTime()
  if (Number.isNaN(timestamp)) return null

  const deltaSeconds = Math.round((timestamp - Date.now()) / 1000)
  const absSeconds = Math.abs(deltaSeconds)
  const formatter = new Intl.RelativeTimeFormat('pt-BR', { numeric: 'auto' })

  for (const [unit, secondsInUnit] of RELATIVE_UNITS) {
    if (absSeconds >= secondsInUnit || unit === 'second') {
      return formatter.format(Math.round(deltaSeconds / secondsInUnit), unit)
    }
  }

  return null
}

/** Deterministic non-negative hash of a string (djb2-ish). */
function hashString(text: string): number {
  let hash = 0
  for (let i = 0; i < text.length; i++) {
    hash = (hash << 5) - hash + text.charCodeAt(i)
    hash |= 0 // force 32-bit int
  }
  return Math.abs(hash)
}

/** Ingredient tones of the design system (see docs/DESIGN-SYSTEM.md). */
export const RECIPE_TONES = ['basil', 'paprika', 'saffron', 'flour'] as const

export type RecipeTone = (typeof RECIPE_TONES)[number]

/**
 * A stable, title-derived tone so each recipe tile gets its own recognizable
 * color without needing an uploaded image. Same title always yields the same
 * tone; each tone maps to a `bg-tone-*` / `text-tone-*-foreground` token pair
 * that passes WCAG AA in both light and dark themes.
 */
export function recipeTone(text: string): RecipeTone {
  return RECIPE_TONES[hashString(text) % RECIPE_TONES.length]
}

/** First visible letter of a title, upper-cased, for the recipe tile monogram. */
export function titleInitial(text: string): string {
  const match = text.trim().match(/\p{L}|\p{N}/u)
  return match ? match[0].toLocaleUpperCase('pt-BR') : '?'
}
