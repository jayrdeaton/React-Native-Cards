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

  describe('the player tag', () => {
    // The host-element shape of a rendered tree (every svg element here is a string-typed host element, see the react-native-svg mock).
    type Node = { type: string; props: Record<string, string | number | undefined>; children: (Node | string)[] | null }
    const nodes = (tree: Node | Node[] | null): Node[] => {
      if (!tree) return []
      if (Array.isArray(tree)) return tree.flatMap(nodes)
      return [tree, ...(tree.children ?? []).flatMap((c) => (typeof c === 'string' ? [] : nodes(c)))]
    }
    const textOf = (node: Node): string => (node.children ?? []).map((c) => (typeof c === 'string' ? c : textOf(c))).join('')
    const renderTree = async (tag?: string) => nodes((await render(<CardBack colors={colors} width={64} height={93} tag={tag} />)).toJSON() as Node | null)
    const fontSizeOf = async (tag: string) => Number((await renderTree(tag)).find((n) => n.type === 'Text')!.props.fontSize)
    // The contrast color of the dark navy back above.
    const INK = '#FFFFFF'

    it("prints letters in the back's own ink, upper-cased", async () => {
      const text = (await renderTree('jd')).find((n) => n.type === 'Text')!

      expect(textOf(text)).toBe('JD')
      expect(text.props.fill).toBe(INK)
      expect(text.props.opacity).toBeUndefined()
    })

    it('sizes letters to their length, so one to three all fit', async () => {
      const one = await fontSizeOf('M')
      const two = await fontSizeOf('JR')
      const three = await fontSizeOf('DAD')

      expect(one).toBeGreaterThan(two)
      expect(two).toBeGreaterThan(three)
    })

    it('draws an emoji in its own colors but see-through, so the back shows through it', async () => {
      const text = (await renderTree('🦄')).find((n) => n.type === 'Text')!

      expect(textOf(text)).toBe('🦄')
      expect(text.props.opacity).toBe(0.6)
    })

    it('draws an emoji at the one-letter size, which reads bigger (a capital fills ~70% of its font size, an emoji all of it)', async () => {
      expect(await fontSizeOf('🐢')).toBe(await fontSizeOf('M'))
      expect(await fontSizeOf('🐢')).toBeGreaterThan(await fontSizeOf('JR'))
    })

    it('puts a tag on one solid diamond, with no medallion outline behind it to show through', async () => {
      const paths = async (tag?: string) => (await renderTree(tag)).filter((n) => n.type === 'Path')

      // The weave (solid + outlined cells) and the outer diamond; the no-tag medallion adds its inner diamond.
      expect(await paths('🦄')).toHaveLength(3)
      expect(await paths('DAD')).toHaveLength(3)
      expect(await paths()).toHaveLength(4)
    })

    it('treats a blank tag as no tag: the plain medallion, unchanged', async () => {
      const blank = await renderTree('   ')
      const none = await renderTree()

      expect(blank).toEqual(none)
      expect(none.some((n) => n.type === 'Text' || n.type === 'Mask')).toBe(false)
    })
  })
})
