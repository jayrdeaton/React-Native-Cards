import { cardWidthForRow } from '../CardSizeContext'
import { AnyCard, Card, cardColor, cloneCard, isJoker, Joker, rankLabel } from '../types'

describe('cardColor', () => {
  it('returns red for hearts and diamonds', () => {
    expect(cardColor('hearts')).toBe('red')
    expect(cardColor('diamonds')).toBe('red')
  })

  it('returns black for clubs and spades', () => {
    expect(cardColor('clubs')).toBe('black')
    expect(cardColor('spades')).toBe('black')
  })
})

describe('rankLabel', () => {
  it('labels the ace and face cards', () => {
    expect(rankLabel(1)).toBe('A')
    expect(rankLabel(11)).toBe('J')
    expect(rankLabel(12)).toBe('Q')
    expect(rankLabel(13)).toBe('K')
  })

  it('labels number cards as their own number', () => {
    expect(rankLabel(2)).toBe('2')
    expect(rankLabel(10)).toBe('10')
  })
})

describe('cloneCard', () => {
  it('returns a shallow copy of a Card, not the same reference', () => {
    const card: Card = { id: 'hearts-7-0', suit: 'hearts', rank: 7, faceUp: true }
    const clone = cloneCard(card)
    expect(clone).toEqual(card)
    expect(clone).not.toBe(card)
  })

  it('returns a shallow copy of a Joker, not the same reference', () => {
    const joker: Joker = { id: 'joker-0', suit: 'joker', rank: null, faceUp: false }
    const clone = cloneCard(joker)
    expect(clone).toEqual(joker)
    expect(clone).not.toBe(joker)
  })
})

describe('isJoker', () => {
  it('is true for a Joker', () => {
    const joker: AnyCard = { id: 'joker-0', suit: 'joker', rank: null, faceUp: false }
    expect(isJoker(joker)).toBe(true)
  })

  it('is false for a standard Card', () => {
    const card: AnyCard = { id: 'spades-1-0', suit: 'spades', rank: 1, faceUp: true }
    expect(isJoker(card)).toBe(false)
  })
})

describe('cardWidthForRow', () => {
  it('fills the available width evenly across columns, minus gaps', () => {
    // 400 width, 4 columns, 3 gaps of 8 => (400 - 24) / 4 = 94
    expect(cardWidthForRow(400, 4, 8)).toBe(94)
  })

  it('clamps to the minimum when the raw width would be too small', () => {
    expect(cardWidthForRow(100, 10, 8, { min: 28, max: 96 })).toBe(28)
  })

  it('clamps to the maximum when the raw width would be too large', () => {
    expect(cardWidthForRow(1000, 2, 8, { min: 28, max: 96 })).toBe(96)
  })

  it('falls back to the minimum when the raw result is not finite', () => {
    expect(cardWidthForRow(NaN, 4, 8, { min: 28, max: 96 })).toBe(28)
  })
})
