import { render } from '@testing-library/react-native'

import { suitPipArt } from '../artwork/pips'
import { SuitPip } from '../SuitPip'
import { Suit } from '../types'

const suits: Suit[] = ['clubs', 'diamonds', 'hearts', 'spades']

const SIZE = 32

// react-native's own StyleSheet.flatten doesn't merge this repo's jest-rendered style arrays
// correctly (an array entry of `false`, from the component's `cond && {...}` pattern, confused it
// into losing the transform) - a plain recursive merge, the same approach CornerRank.test.tsx uses
// for the same reason, is what actually reads back what was rendered.
function flat(style: unknown): Record<string, unknown> {
  if (Array.isArray(style)) return Object.assign({}, ...style.map(flat))
  return style && typeof style === 'object' ? (style as Record<string, unknown>) : {}
}

/** The pip's ink centre, in points from a corner row's right anchor (negative = left of it, 0 = on
 * it) - what CardFace's cornerRow (space-between flex, right-anchoring the pip's box regardless of
 * its own rendered size) actually places on screen. The box's right edge always sits at that anchor,
 * so its own centre - before any transform - is -renderSize / 2 from it; the component's transform
 * (width-fill recentring, the heart nudge) is read off the rendered tree, not assumed. */
async function inkCenter(suit: Suit, edgeFill = false) {
  const { toJSON } = await render(<SuitPip suit={suit} color='#000000' size={SIZE} edgeFill={edgeFill} />)
  const node = toJSON() as unknown as { props: { width: string | number; style?: unknown } }
  const renderSize = Number(node.props.width)
  const translateX = (flat(node.props.style) as { transform?: { translateX: number }[] }).transform?.[0]?.translateX ?? 0
  return -renderSize / 2 + translateX
}

describe('SuitPip', () => {
  it.each(suits)('renders the standard %s pip without throwing', async (suit) => {
    const { toJSON } = await render(<SuitPip suit={suit} color='#000000' size={32} />)
    expect(toJSON()).not.toBeNull()
  })

  it('renders a diamond with edgeFill without throwing', async () => {
    const { toJSON } = await render(<SuitPip suit='diamonds' color='#C41E3A' size={32} edgeFill />)
    expect(toJSON()).not.toBeNull()
  })

  it.each(suits)('renders the tarot %s pip without throwing', async (suit) => {
    const { toJSON } = await render(<SuitPip suit={suit} color='#000000' size={32} theme='tarot' />)
    expect(toJSON()).not.toBeNull()
  })

  it("geometrically centres diamond on clubs' point in a right-anchored row (edgeFill, as CardFace's corner row always passes it), however its own width-fill compensation grew its box - no CORNER_NUDGE_PX entry for diamond, so this is recenter alone", async () => {
    const club = await inkCenter('clubs', true) // never compensated (compensation 1): the baseline every other suit is checked against
    const diamondEdge = await inkCenter('diamonds', true) // edgeFill: grown box (DIAMOND_EDGE_FILL_COMPENSATION)
    expect(diamondEdge).toBeCloseTo(club, 9)
  })

  it("applies spades' own CORNER_NUDGE_PX on top of the geometric recentring, in that same row - measured empirically against the other suits, not derivable from the viewBox math alone", async () => {
    const club = await inkCenter('clubs', true)
    const spade = await inkCenter('spades', true)
    expect(spade).toBeCloseTo(club - 0.4, 9)
  })

  it("omits the heart glyph's own big-pip perceptual nudge in the corner row - unlike there, its geometric (unnudged) centre already lands on clubs' own, so this is the one suit CORNER_NUDGE_PX has no entry for and needs none", async () => {
    const club = await inkCenter('clubs', true)
    const heart = await inkCenter('hearts', true)
    expect(heart).toBeCloseTo(club, 9)
  })

  it("keeps the heart glyph's own deliberate 1px perceptual nudge for the big single pip (no edgeFill) - the context HEART_NUDGE_PX was actually tuned for", async () => {
    const club = await inkCenter('clubs', false)
    const heart = await inkCenter('hearts', false)
    expect(heart).toBeCloseTo(club - 1, 9)
  })

  it("emits no transform outside a right-anchored row (no edgeFill, as CardFace's big centre pip never passes it), even for spades - always compensated (SIZE_COMPENSATION is suit-driven, not edgeFill-gated), but not right-anchored, so nothing here should shift it. A centred box's own centre doesn't move when it grows, so it needs none: the regression this pins is the correction leaking into that call and dragging the big centre pip off-centre", async () => {
    const { toJSON } = await render(<SuitPip suit='spades' color='#000000' size={SIZE} />)
    const node = toJSON() as unknown as { props: { width: number; style?: unknown } }
    expect(node.props.width).toBeGreaterThan(SIZE) // still compensated...
    expect(flat(node.props.style)).not.toHaveProperty('transform') // ...but not shifted
  })

  it('leaves diamond narrower than clubs even once edgeFill has centred it - the compensation is deliberately partial, not a full width match', async () => {
    const { toJSON: clubJSON } = await render(<SuitPip suit='clubs' color='#000000' size={SIZE} edgeFill />)
    const { toJSON: diamondJSON } = await render(<SuitPip suit='diamonds' color='#000000' size={SIZE} edgeFill />)
    const clubRenderSize = Number((clubJSON() as unknown as { props: { width: number } }).props.width)
    const diamondRenderSize = Number((diamondJSON() as unknown as { props: { width: number } }).props.width)
    const [, , cw, ch] = suitPipArt.clubs.viewBox
    const [, , dw, dh] = suitPipArt.diamonds.viewBox
    const clubInkWidth = clubRenderSize * Math.min(1, cw / ch)
    const diamondInkWidth = diamondRenderSize * Math.min(1, dw / dh)
    expect(diamondInkWidth).toBeLessThan(clubInkWidth)
    expect(diamondRenderSize).toBeGreaterThan(clubRenderSize) // it did grow toward clubs' width-fill...
    expect(diamondInkWidth / clubInkWidth).toBeLessThan(0.95) // ...just not all the way there
  })

  it('applies neither compensation nor the heart nudge to tarot pips: every suit renders at the plain size with no transform', async () => {
    for (const suit of suits) {
      const { toJSON } = await render(<SuitPip suit={suit} color='#000000' size={SIZE} theme='tarot' />)
      const node = toJSON() as unknown as { props: { width: number; style?: unknown } }
      expect(node.props.width).toBe(SIZE)
      expect(flat(node.props.style)).not.toHaveProperty('transform')
    }
  })
})
