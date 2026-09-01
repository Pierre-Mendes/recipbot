import { describe, expect, it } from 'vitest'

import { parseIngredient } from '@/utils/parseIngredient'

describe('parseIngredient', () => {
  it('splits quantity + unit from the name', () => {
    expect(parseIngredient('2 xícaras de farinha')).toEqual({
      measure: '2 xícaras',
      name: 'de farinha',
    })
  })

  it('handles fractions written with a slash', () => {
    expect(parseIngredient('1/2 copo de açúcar')).toEqual({
      measure: '1/2 copo',
      name: 'de açúcar',
    })
  })

  it('handles unicode fractions', () => {
    expect(parseIngredient('½ colher de chá de sal')).toEqual({
      measure: '½ colher de chá',
      name: 'de sal',
    })
  })

  it('keeps the quantity when there is no recognized unit', () => {
    expect(parseIngredient('3 ovos')).toEqual({ measure: '3', name: 'ovos' })
  })

  it('handles a range', () => {
    expect(parseIngredient('2 a 3 dentes de alho')).toEqual({
      measure: '2 a 3 dentes',
      name: 'de alho',
    })
  })

  it('returns null measure when there is no leading quantity', () => {
    expect(parseIngredient('sal a gosto')).toEqual({ measure: null, name: 'sal a gosto' })
  })

  it('does not mistake a word starting with a unit letter for a unit', () => {
    // "gelo" starts with "g" but is not the unit "g".
    expect(parseIngredient('1 gelo picado')).toEqual({ measure: '1', name: 'gelo picado' })
  })

  it('matches abbreviated units as whole words', () => {
    expect(parseIngredient('200 g de chocolate')).toEqual({
      measure: '200 g',
      name: 'de chocolate',
    })
  })

  it('trims surrounding whitespace', () => {
    expect(parseIngredient('  4 ovos  ')).toEqual({ measure: '4', name: 'ovos' })
  })
})
