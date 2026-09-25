import { render } from '@testing-library/react-native'

import { CardFace } from '../CardFace'
import { TableColors } from '../colors'
import { Card } from '../types'

// Recursively finds the first node of the given host-element type in a test-renderer JSON tree
// (react-native.ts's mock View/Image, react-native-svg.ts's mock Svg are all plain strings, so
// `.type` is directly comparable) - used below to tell "rendered the bitmap" (an Image node exists
// somewhere under the court-figure area) from "rendered the live vector figure" (it doesn't) without
// asserting on the whole tree shape.
function findByType(node: unknown, type: string): boolean {
  if (!node || typeof node !== 'object') return false
  const n = node as { type?: unknown; children?: unknown[] }
  if (n.type === type) return true
  return (n.children ?? []).some((child) => findByType(child, type))
}

const colors: TableColors = {
  tableFelt: '#0B6E4F',
  tableFeltDark: '#08573F',
  cardFace: '#EEEEEE',
  cardFaceInverted: '#FFFFFF',
  cardBack: '#1B4B91',
  cardBackPattern: '#2E63B8',
  cardBackPatternInverted: '#2E63B8',
  cardBorder: '#00000055',
  selectedGlow: '#FFD54A',
  textRed: '#C41E3A',
  textBlack: '#1A1A1A',
  textBlackInverted: '#F2F2F2',
  emptySlot: '#00000033',
  hintGreen: '#3ECF6E',
  dimOverlay: '#00000066',
  dimOverlayInverted: '#00000066'
}

const numberedCard: Card = { id: 'clubs-7-0', suit: 'clubs', rank: 7, faceUp: true }
const courtCard: Card = { id: 'hearts-13-0', suit: 'hearts', rank: 13, faceUp: true }

describe('CardFace', () => {
  it('renders a numbered card without throwing', async () => {
    const { toJSON } = await render(<CardFace card={numberedCard} colors={colors} width={64} height={93} />)
    expect(toJSON()).not.toBeNull()
  })

  it('renders a court card without throwing', async () => {
    const { toJSON } = await render(<CardFace card={courtCard} colors={colors} width={64} height={93} />)
    expect(toJSON()).not.toBeNull()
  })

  it('renders a muted watermark card without throwing', async () => {
    const { toJSON } = await render(<CardFace card={numberedCard} colors={colors} width={64} height={93} muted />)
    expect(toJSON()).not.toBeNull()
  })

  it('renders the decorated card style without throwing', async () => {
    const { toJSON } = await render(<CardFace card={courtCard} colors={colors} width={64} height={93} cardStyle='decorated' />)
    expect(toJSON()).not.toBeNull()
  })

  it('renders the tarot card style without throwing', async () => {
    const { toJSON } = await render(<CardFace card={numberedCard} colors={colors} width={64} height={93} cardStyle='tarot' />)
    expect(toJSON()).not.toBeNull()
  })

  it('renders the numeric card style for a numbered card without throwing', async () => {
    const { toJSON } = await render(<CardFace card={numberedCard} colors={colors} width={64} height={93} cardStyle='numeric' />)
    expect(toJSON()).not.toBeNull()
  })

  it('renders the numeric card style for a two-character rank (10) without throwing', async () => {
    const tenCard: Card = { id: 'spades-10-0', suit: 'spades', rank: 10, faceUp: true }
    const { toJSON } = await render(<CardFace card={tenCard} colors={colors} width={64} height={93} cardStyle='numeric' />)
    expect(toJSON()).not.toBeNull()
  })

  it('renders the numeric card style for a court card with its illustrated figure, not a numeral', async () => {
    const { toJSON } = await render(<CardFace card={courtCard} colors={colors} width={64} height={93} cardStyle='numeric' />)
    expect(toJSON()).not.toBeNull()
  })

  it('renders with invertDarkModeColors without throwing', async () => {
    const { toJSON } = await render(<CardFace card={courtCard} colors={colors} width={64} height={93} invertDarkModeColors />)
    expect(toJSON()).not.toBeNull()
  })

  describe('bitmapCourtFigures', () => {
    it('defaults to the live vector figure (no Image node) when omitted', async () => {
      const { toJSON } = await render(<CardFace card={courtCard} colors={colors} width={64} height={93} />)
      expect(findByType(toJSON(), 'Image')).toBe(false)
    })

    it('renders the pre-rasterized bitmap for a court card in the default (compact, light, non-tarot) case', async () => {
      const { toJSON } = await render(<CardFace card={courtCard} colors={colors} width={64} height={93} bitmapCourtFigures />)
      expect(findByType(toJSON(), 'Image')).toBe(true)
    })

    it('is a no-op for a non-court rank (nothing to swap - still the big SuitPip, no Image)', async () => {
      const { toJSON } = await render(<CardFace card={numberedCard} colors={colors} width={64} height={93} bitmapCourtFigures />)
      expect(findByType(toJSON(), 'Image')).toBe(false)
    })

    it('falls back to the live vector figure when muted (the bitmap has no neutral/tinted form)', async () => {
      const { toJSON } = await render(<CardFace card={courtCard} colors={colors} width={64} height={93} bitmapCourtFigures muted />)
      expect(findByType(toJSON(), 'Image')).toBe(false)
    })

    it('falls back to the live vector figure when invertDarkModeColors is set (the bitmap bakes in only the default palette)', async () => {
      const { toJSON } = await render(<CardFace card={courtCard} colors={colors} width={64} height={93} bitmapCourtFigures invertDarkModeColors />)
      expect(findByType(toJSON(), 'Image')).toBe(false)
    })

    it("falls back to the live vector figure for cardStyle='tarot' (its own recolored figure, not the default palette)", async () => {
      const { toJSON } = await render(<CardFace card={courtCard} colors={colors} width={64} height={93} bitmapCourtFigures cardStyle='tarot' />)
      expect(findByType(toJSON(), 'Image')).toBe(false)
    })

    it("does not throw for cardStyle='decorated' (an entirely different whole-card component - bitmapCourtFigures never reaches the court-figure branch at all)", async () => {
      const { toJSON } = await render(<CardFace card={courtCard} colors={colors} width={64} height={93} bitmapCourtFigures cardStyle='decorated' />)
      expect(toJSON()).not.toBeNull()
    })

    it('renders the bitmap under the numeric card style too (bitmapCourtFigures is independent of cardStyle, aside from tarot/decorated)', async () => {
      const { toJSON } = await render(<CardFace card={courtCard} colors={colors} width={64} height={93} bitmapCourtFigures cardStyle='numeric' />)
      expect(findByType(toJSON(), 'Image')).toBe(true)
    })
  })
})
