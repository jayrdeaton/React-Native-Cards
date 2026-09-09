import { render } from '@testing-library/react-native'

import { TableColors } from '../colors'
import { DecoratedCardBack } from '../DecoratedCardBack'

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

describe('DecoratedCardBack', () => {
  it('renders the ornate style without throwing', async () => {
    const { toJSON } = await render(<DecoratedCardBack style='ornate' colors={colors} width={64} height={93} />)
    expect(toJSON()).not.toBeNull()
  })

  it('renders the plain style without throwing', async () => {
    const { toJSON } = await render(<DecoratedCardBack style='plain' colors={colors} width={64} height={93} />)
    expect(toJSON()).not.toBeNull()
  })

  it('renders with invertDarkModeColors without throwing', async () => {
    const { toJSON } = await render(<DecoratedCardBack style='ornate' colors={colors} width={64} height={93} invertDarkModeColors />)
    expect(toJSON()).not.toBeNull()
  })
})
