import { render } from '@testing-library/react-native'

import { tarotInk } from '../artwork/tarotPips'
import { CardFace } from '../CardFace'
import { TableColors } from '../colors'
import { cardFaceColor, CardStyle, suitInk } from '../faceInk'
import { Suit } from '../types'

const colors = {
  cardFaceInverted: '#1A1A1A',
  textBlack: '#1A1A1A',
  textBlackInverted: '#F2F2F2',
  textRed: '#C41E3A'
} as TableColors

const suits: Suit[] = ['clubs', 'diamonds', 'hearts', 'spades']

describe('suitInk', () => {
  it('draws red suits in textRed and black suits in textBlack', () => {
    expect(suits.map((s) => suitInk(s, colors))).toEqual(['#1A1A1A', '#C41E3A', '#C41E3A', '#1A1A1A'])
  })

  it('flips only the black suits under invertDarkModeColors', () => {
    expect(suits.map((s) => suitInk(s, colors, { invertDarkModeColors: true }))).toEqual(['#F2F2F2', '#C41E3A', '#C41E3A', '#F2F2F2'])
  })

  it.each([false, true])('draws every tarot suit in its own ink whatever the invert (%s)', (invertDarkModeColors) => {
    expect(suits.map((s) => suitInk(s, colors, { cardStyle: 'tarot', invertDarkModeColors }))).toEqual(suits.map((s) => tarotInk[s]))
  })
})

describe('cardFaceColor', () => {
  it('is white, or cardFaceInverted under invertDarkModeColors', () => {
    expect(cardFaceColor(colors)).toBe('#FFFFFF')
    expect(cardFaceColor(colors, true)).toBe('#1A1A1A')
  })
})

describe('CardFace draws with the same inks', () => {
  type Node = { type: string; props: Record<string, unknown>; children?: Node[] | null }
  const all = (node: Node): Node[] => [node, ...(node.children ?? []).flatMap(all)]
  const cases: [CardStyle, boolean][] = [
    ['compact', false],
    ['compact', true],
    ['tarot', false],
    ['tarot', true],
    ['numeric', true]
  ]
  it.each(cases)('%s, invert %s', async (cardStyle, invertDarkModeColors) => {
    for (const suit of suits) {
      const { toJSON } = await render(<CardFace card={{ id: `${suit}-7-0`, suit, rank: 7, faceUp: true }} colors={colors} width={64} height={93} cardStyle={cardStyle} invertDarkModeColors={invertDarkModeColors} />)
      const root = toJSON() as unknown as Node
      expect((root.props.style as { backgroundColor: string }).backgroundColor).toBe(cardFaceColor(colors, invertDarkModeColors))
      const fills = new Set(all(root).filter((n) => n.type === 'Path' && typeof n.props.fill === 'string').map((n) => n.props.fill))
      expect(fills).toContain(suitInk(suit, colors, { cardStyle, invertDarkModeColors }))
    }
  })
})
