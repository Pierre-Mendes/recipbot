import { parseIngredient } from '@/utils/parseIngredient'

/**
 * Unit conversion for ingredient quantities. Recipes are stored as written;
 * the reader can choose to see amounts in grams, millilitres, or cups. Volume
 * and mass each convert freely within themselves; crossing between them needs
 * the ingredient's density, so we keep a small curated table of common ones and
 * simply decline (return null) when we can't be confident. Built on the Phase 3
 * parseIngredient foundation.
 */
export type UnitSystem = 'original' | 'g' | 'ml' | 'cup'

/** Millilitres per volume unit (a cup here is the 240 ml US/BR convention). */
const VOLUME_ML: Record<string, number> = {
  ml: 1,
  l: 1000,
  litro: 1000,
  litros: 1000,
  xícara: 240,
  xicara: 240,
  xícaras: 240,
  xicaras: 240,
  copo: 240,
  copos: 240,
  'colher de sopa': 15,
  'colheres de sopa': 15,
  'colher de chá': 5,
  'colheres de chá': 5,
}

/** Grams per mass unit. */
const MASS_G: Record<string, number> = {
  g: 1,
  grama: 1,
  gramas: 1,
  kg: 1000,
  quilo: 1000,
  quilos: 1000,
}

/** Grams per millilitre for common ingredients, matched by name substring. */
const DENSITY: { keys: string[]; gPerMl: number }[] = [
  { keys: ['farinha'], gPerMl: 0.53 },
  { keys: ['açúcar', 'acucar'], gPerMl: 0.85 },
  { keys: ['água', 'agua', 'leite', 'caldo'], gPerMl: 1.0 },
  { keys: ['manteiga'], gPerMl: 0.96 },
  { keys: ['óleo', 'oleo', 'azeite'], gPerMl: 0.92 },
  { keys: ['mel'], gPerMl: 1.42 },
  { keys: ['sal'], gPerMl: 1.2 },
  { keys: ['aveia'], gPerMl: 0.4 },
  { keys: ['cacau', 'chocolate em pó', 'chocolate em po'], gPerMl: 0.53 },
  { keys: ['fermento'], gPerMl: 0.9 },
]

const UNICODE_FRACTIONS: Record<string, number> = {
  '¼': 0.25,
  '½': 0.5,
  '¾': 0.75,
  '⅓': 1 / 3,
  '⅔': 2 / 3,
  '⅕': 0.2,
  '⅖': 0.4,
  '⅗': 0.6,
  '⅘': 0.8,
  '⅙': 1 / 6,
  '⅛': 0.125,
  '⅜': 0.375,
  '⅝': 0.625,
  '⅞': 0.875,
}

/**
 * Parse a quantity token into a number: integers, decimals (1.5 or 1,5),
 * fractions (1/2), unicode fractions (½), and mixed numbers (1 1/2 or 1½).
 * A range ("2 a 3") is intentionally not converted — returns null — because
 * scaling a range is ambiguous. Returns null when nothing numeric is found.
 */
export function parseQuantity(input: string): number | null {
  const s = input.trim()
  if (s === '') {
    return null
  }

  // Ranges are ambiguous to convert - decline them.
  if (/\d\s*(?:-|–|a|até)\s*[\d¼½¾⅓⅔⅕⅖⅗⅘⅙⅚⅛⅜⅝⅞]/i.test(s)) {
    return null
  }

  // Mixed number with a slash fraction: "1 1/2".
  const mixed = s.match(/^(\d+)\s+(\d+)\/(\d+)$/)
  if (mixed) {
    return Number(mixed[1]) + Number(mixed[2]) / Number(mixed[3])
  }

  // Integer/decimal immediately followed by a unicode fraction: "1½".
  const mixedUnicode = s.match(/^(\d+)\s*([¼½¾⅓⅔⅕⅖⅗⅘⅙⅚⅛⅜⅝⅞])$/)
  if (mixedUnicode) {
    return Number(mixedUnicode[1]) + UNICODE_FRACTIONS[mixedUnicode[2]]
  }

  // Bare slash fraction: "1/2".
  const fraction = s.match(/^(\d+)\/(\d+)$/)
  if (fraction) {
    return Number(fraction[1]) / Number(fraction[2])
  }

  // Single unicode fraction: "½".
  if (s.length === 1 && s in UNICODE_FRACTIONS) {
    return UNICODE_FRACTIONS[s]
  }

  // Plain integer or decimal, comma or dot: "2", "1.5", "1,5".
  const decimal = s.match(/^\d+(?:[.,]\d+)?$/)
  if (decimal) {
    return Number(s.replace(',', '.'))
  }

  return null
}

/**
 * Split a measure string ("2 xícaras") into its numeric quantity and unit.
 * The quantity is the longest leading run of tokens that parses as a number;
 * whatever follows is the unit.
 */
function splitMeasure(measure: string): { quantity: number; unit: string } | null {
  const tokens = measure.trim().split(/\s+/)
  for (let i = tokens.length; i >= 1; i--) {
    const qty = parseQuantity(tokens.slice(0, i).join(' '))
    if (qty !== null) {
      const unit = tokens.slice(i).join(' ').toLowerCase()
      return { quantity: qty, unit }
    }
  }
  return null
}

function densityFor(name: string): number | null {
  const lower = name.toLowerCase()
  for (const entry of DENSITY) {
    if (entry.keys.some((k) => lower.includes(k))) {
      return entry.gPerMl
    }
  }
  return null
}

function format(value: number, unit: string): string {
  const rounded = unit === 'xícara' ? Math.round(value * 100) / 100 : Math.round(value) // g and ml to the nearest whole
  return `${rounded} ${unit}`
}

/**
 * Convert one ingredient line to the target unit system. Returns the converted
 * `{ measure, name }`, or null when conversion isn't possible/meaningful (no
 * quantity, an unrecognized unit, a range, or a cross volume/mass conversion
 * without a known density).
 */
export function convertIngredient(
  raw: string,
  target: UnitSystem,
): { measure: string; name: string } | null {
  if (target === 'original') {
    return null
  }

  const { measure, name } = parseIngredient(raw)
  if (!measure) {
    return null
  }

  const split = splitMeasure(measure)
  if (!split) {
    return null
  }

  const { quantity, unit } = split
  const ml = VOLUME_ML[unit]
  const g = MASS_G[unit]

  if (target === 'ml') {
    if (ml === undefined) {
      return null
    }
    return { measure: format(quantity * ml, 'ml'), name }
  }

  if (target === 'cup') {
    if (ml === undefined) {
      return null
    }
    return { measure: format((quantity * ml) / 240, 'xícara'), name }
  }

  // target === 'g'
  if (g !== undefined) {
    return { measure: format(quantity * g, 'g'), name }
  }
  if (ml !== undefined) {
    const density = densityFor(name)
    if (density === null) {
      return null
    }
    return { measure: format(quantity * ml * density, 'g'), name }
  }
  return null
}
