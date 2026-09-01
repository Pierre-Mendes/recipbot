/**
 * Split an ingredient line into its leading measure (quantity + optional unit)
 * and the remaining name, so the UI can emphasize the amount — "**2 xícaras**
 * de farinha". Best-effort and non-destructive: when there is no recognizable
 * leading quantity (e.g. "sal a gosto"), `measure` is null and `name` is the
 * whole line. This is the shared foundation the unit converter will build on.
 */
export interface ParsedIngredient {
  /** The highlighted amount as written, e.g. "2 xícaras" or "1/2" — or null. */
  measure: string | null
  /** The rest of the line, e.g. "de farinha". */
  name: string
}

const FRACTIONS = '¼½¾⅓⅔⅕⅖⅗⅘⅙⅚⅛⅜⅝⅞'

// A leading quantity: an integer/decimal, a fraction (1/2 or ½), a mixed
// number (1 1/2), optionally a range ("2 a 3", "2-3").
const QUANTITY = new RegExp(
  `^\\s*(?:\\d+\\s+\\d+/\\d+|\\d+/\\d+|[${FRACTIONS}]|\\d+(?:[.,]\\d+)?)` +
    `(?:\\s*(?:-|–|a|até)\\s*(?:\\d+(?:[.,]\\d+)?|[${FRACTIONS}]))?`,
  'i',
)

// Common Portuguese cooking units, longest first so multi-word and plural
// forms win over their prefixes ("gramas" before "g", "colher de sopa" before
// "colher").
const UNITS = [
  'colheres de sopa',
  'colher de sopa',
  'colheres de chá',
  'colher de chá',
  'xícaras',
  'xícara',
  'xicaras',
  'xicara',
  'colheres',
  'colher',
  'copos',
  'copo',
  'gramas',
  'grama',
  'quilos',
  'quilo',
  'litros',
  'litro',
  'pitadas',
  'pitada',
  'dentes',
  'dente',
  'unidades',
  'unidade',
  'latas',
  'lata',
  'pacotes',
  'pacote',
  'fatias',
  'fatia',
  'ramos',
  'ramo',
  'punhados',
  'punhado',
  'kg',
  'ml',
  'cm',
  'g',
  'l',
]

export function parseIngredient(raw: string): ParsedIngredient {
  const text = raw.trim()
  const match = QUANTITY.exec(text)

  if (!match || match[0].trim() === '') {
    return { measure: null, name: text }
  }

  let end = match[0].length
  const afterQuantity = text.slice(end)
  const leadingSpace = afterQuantity.length - afterQuantity.replace(/^\s+/, '').length
  const rest = afterQuantity.slice(leadingSpace)
  const lower = rest.toLowerCase()

  const unit = UNITS.find((u) => {
    if (!lower.startsWith(u)) {
      return false
    }
    // The unit must be a whole word: what follows is a space, punctuation, or
    // the end of the line — so "g" matches "g de sal" but not "gelo".
    const next = rest[u.length]
    return next === undefined || /[\s,.;]/.test(next)
  })

  if (unit) {
    end += leadingSpace + unit.length
  }

  return {
    measure: text.slice(0, end).trim(),
    name: text.slice(end).trim(),
  }
}
