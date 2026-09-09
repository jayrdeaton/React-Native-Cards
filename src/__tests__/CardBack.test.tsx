import { render } from '@testing-library/react-native'

import { CardBack } from '../CardBack'
import { TableColors } from '../colors'

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

describe('CardBack', () => {
  it('renders the plain medallion (no tag) without throwing', async () => {
    const { toJSON } = await render(<CardBack colors={colors} width={64} height={93} />)
    expect(toJSON()).not.toBeNull()
  })

  it('renders a player-tag monogram without throwing', async () => {
    const { toJSON } = await render(<CardBack colors={colors} width={64} height={93} tag='JD' />)
    expect(toJSON()).not.toBeNull()
  })

  it('renders with invertDarkModeColors without throwing', async () => {
    const { toJSON } = await render(<CardBack colors={colors} width={64} height={93} invertDarkModeColors />)
    expect(toJSON()).not.toBeNull()
  })
})
