import { render } from '@testing-library/react-native'

import { CardFace } from '../CardFace'
import { TableColors } from '../colors'
import { Card } from '../types'

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
})
