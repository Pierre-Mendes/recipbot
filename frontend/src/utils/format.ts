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

/**
 * A stable, title-derived CSS gradient so each recipe card gets its own
 * recognizable color without needing an uploaded image. Same title always
 * yields the same gradient; tuned to stay legible under a white icon overlay
 * in both light and dark themes.
 */
export function titleGradient(text: string): string {
  const hue = hashString(text) % 360
  const secondHue = (hue + 35) % 360
  return `linear-gradient(135deg, hsl(${hue} 62% 52%), hsl(${secondHue} 68% 40%))`
}
