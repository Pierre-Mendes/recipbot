import { describe, expect, it } from 'vitest'

import { RECIPE_TONES, recipeTone, relativeTime, titleInitial } from '@/utils/format'

describe('relativeTime', () => {
  it('returns null for missing or unparseable dates', () => {
    expect(relativeTime('')).toBeNull()
    expect(relativeTime(null)).toBeNull()
    expect(relativeTime(undefined)).toBeNull()
    expect(relativeTime('not-a-date')).toBeNull()
  })

  it('formats a recent past date in pt-BR', () => {
    const threeDaysAgo = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString()
    const result = relativeTime(threeDaysAgo)
    expect(result).toMatch(/dia/)
  })
})

describe('recipeTone', () => {
  it('is deterministic for the same title', () => {
    expect(recipeTone('Bolo de Cenoura')).toBe(recipeTone('Bolo de Cenoura'))
  })

  it('always returns one of the design-system tones', () => {
    for (const title of ['Feijoada', 'Bolo', 'Torta', 'Pão de queijo', '']) {
      expect(RECIPE_TONES).toContain(recipeTone(title))
    }
  })

  it('spreads different titles across more than one tone', () => {
    const tones = new Set(
      ['Bolo', 'Torta', 'Feijoada', 'Moqueca', 'Risoto', 'Pudim'].map(recipeTone),
    )
    expect(tones.size).toBeGreaterThan(1)
  })
})

describe('titleInitial', () => {
  it('returns the first letter upper-cased, keeping accents', () => {
    expect(titleInitial('bolo de fubá')).toBe('B')
    expect(titleInitial('  ética no forno')).toBe('É')
  })

  it('skips leading punctuation and falls back for empty titles', () => {
    expect(titleInitial('"Pudim" da vó')).toBe('P')
    expect(titleInitial('')).toBe('?')
  })
})
