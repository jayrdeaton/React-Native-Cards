import { render } from '@testing-library/react-native'
import { Platform } from 'react-native'

import { bigRankFontScale, BigRankGlyph, bigRankGlyphGeometry } from '../BigRankGlyph'
import { CardFace } from '../CardFace'
import { TableColors } from '../colors'
import { RANK_STROKE_EM } from '../RankGlyph'
import { RANK_GLYPH_UNITS_PER_EM, RANK_GLYPHS, RankGlyphLabel } from '../rankGlyphs'
import { Card, Rank, rankLabel } from '../types'

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

const WIDTHS = [28, 28.2, 34, 50.571, 64, 96]
// Every 0.41pt from 28 to 96: the whole range of card widths a game lays out, through every
// fractional part - a fractional Svg size is exactly what native's parseInt truncates.
const SWEEP_WIDTHS = Array.from({ length: 167 }, (_, i) => 28 + i * 0.41)
// Non-court ranks only: this component never renders J/Q/K (CardFace keeps their own court figure).
const NON_COURT_RANKS: Rank[] = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]
const UNITS = RANK_GLYPH_UNITS_PER_EM
const designedScale = (width: number, rank: Rank) => (width * bigRankFontScale(rank)) / UNITS

interface JsonNode {
  type: string
  props: Record<string, unknown>
  children: JsonNode[] | null
}
const num = (v: unknown) => v as number
const viewBoxOf = (node: JsonNode) => String(node.props.viewBox).split(' ').map(Number)

/** Renders the glyph and reads its ink back off the rendered tree, exactly like CornerRank.test.tsx
 * does for the corner rank - the wiring end to end, not the component's own helper math repeated. */
async function measure(rank: Rank, width: number) {
  const { toJSON } = await render(<BigRankGlyph rank={rank} color='#1A1A1A' cardWidth={width} />)
  const svg = toJSON() as unknown as JsonNode
  const path = svg.children![0]
  const svgWidth = Math.floor(num(svg.props.width))
  const svgHeight = Math.floor(num(svg.props.height))
  const [vx, vy, vw, vh] = viewBoxOf(svg)
  const scale = Math.min(svgWidth / vw, svgHeight / vh)
  const letterboxX = (svgWidth - vw * scale) / 2
  const letterboxY = (svgHeight - vh * scale) / 2
  const strokeWidth = num(path.props.strokeWidth)
  const half = strokeWidth / 2
  const g = RANK_GLYPHS[rankLabel(rank) as RankGlyphLabel]
  const ink = {
    left: letterboxX + (g.x1 - half - vx) * scale,
    right: letterboxX + (g.x2 + half - vx) * scale,
    top: letterboxY + (g.y1 - half - vy) * scale,
    bottom: letterboxY + (g.y2 + half - vy) * scale
  }
  return { svg, svgWidth, svgHeight, scale, letterboxX, letterboxY, ink, strokeWidth }
}

describe('bigRankFontScale', () => {
  it('gives 10 its own smaller scale and every other rank the same larger one', () => {
    expect(bigRankFontScale(10)).toBe(0.65)
    ;[1, 2, 3, 4, 5, 6, 7, 8, 9, 11, 12, 13].forEach((rank) => expect(bigRankFontScale(rank as Rank)).toBe(0.85))
  })
})

describe('BigRankGlyph geometry', () => {
  it.each(WIDTHS)('at card width %spt: whole-point Svg, exact designed scale, no letterboxing, for every non-court rank', async (width) => {
    for (const rank of NON_COURT_RANKS) {
      const m = await measure(rank, width)
      expect(Number.isInteger(m.svgWidth)).toBe(true)
      expect(Number.isInteger(m.svgHeight)).toBe(true)
      expect(Math.abs(m.scale / designedScale(width, rank) - 1)).toBeLessThan(1e-9)
      expect(Math.abs(m.letterboxX)).toBeLessThan(1e-9 * width)
      expect(Math.abs(m.letterboxY)).toBeLessThan(1e-9 * width)
    }
  })

  it.each(WIDTHS)('at card width %spt: the ink (stroke included) never touches the Svg edge, for every non-court rank', async (width) => {
    for (const rank of NON_COURT_RANKS) {
      const m = await measure(rank, width)
      expect(m.ink.left).toBeGreaterThan(0)
      expect(m.ink.right).toBeLessThan(m.svgWidth)
      expect(m.ink.top).toBeGreaterThan(0)
      expect(m.ink.bottom).toBeLessThan(m.svgHeight)
    }
  })

  it.each(WIDTHS)('at card width %spt: the ink is centred on the Svg itself, both axes, for every non-court rank - unlike the corner rank, nothing here right-anchors it', async (width) => {
    for (const rank of NON_COURT_RANKS) {
      const m = await measure(rank, width)
      const inkCenterX = (m.ink.left + m.ink.right) / 2
      const inkCenterY = (m.ink.top + m.ink.bottom) / 2
      expect(inkCenterX).toBeCloseTo(m.svgWidth / 2, 6)
      expect(inkCenterY).toBeCloseTo(m.svgHeight / 2, 6)
    }
  })

  it('uses the same em-relative faux-bold stroke as the corner rank, scaled to its own (larger) font size, so both read equally bold', async () => {
    for (const rank of NON_COURT_RANKS) {
      const m = await measure(rank, 50.571)
      const expectedStrokeUnits = RANK_STROKE_EM * UNITS
      expect(m.strokeWidth).toBeCloseTo(expectedStrokeUnits, 9)
      // As a fraction of the glyph's own em size (not card width), the stroke is identical to the corner rank's.
      expect((m.strokeWidth / UNITS) * bigRankFontScale(rank)).toBeCloseTo(RANK_STROKE_EM * bigRankFontScale(rank), 9)
    }
  })

  it.each(SWEEP_WIDTHS)('holds every invariant across a full fractional-width sweep at %spt (10, the smaller scale, and 8, the larger)', async (width) => {
    for (const rank of [10, 8] as Rank[]) {
      const m = await measure(rank, width)
      expect(Number.isInteger(m.svgWidth)).toBe(true)
      expect(Number.isInteger(m.svgHeight)).toBe(true)
      expect(Math.abs(m.scale / designedScale(width, rank) - 1)).toBeLessThan(1e-9)
      expect(m.ink.left).toBeGreaterThan(0)
      expect(m.ink.right).toBeLessThan(m.svgWidth)
      expect(m.ink.top).toBeGreaterThan(0)
      expect(m.ink.bottom).toBeLessThan(m.svgHeight)
    }
  })

  it('rankGlyphGeometry (the exported helper) matches what actually rendered, at a zero-width card (no ratio to divide by)', () => {
    const g = bigRankGlyphGeometry('8', 0, 8)
    expect(g.width).toBe(0)
    expect(g.height).toBe(0)
    expect(g.viewBox).toContain(' ') // still a well-formed 4-number viewBox, not NaN
    expect(g.viewBox).not.toContain('NaN')
  })
})

describe('BigRankGlyph accessibility', () => {
  it('announces the rank on native (accessible + accessibilityRole + accessibilityLabel)', async () => {
    const originalOS = Platform.OS
    Object.defineProperty(Platform, 'OS', { get: () => 'ios' })
    const { toJSON } = await render(<BigRankGlyph rank={7} color='#1A1A1A' cardWidth={64} />)
    const svg = toJSON() as unknown as JsonNode
    expect(svg.props.accessible).toBe(true)
    expect(svg.props.accessibilityRole).toBe('image')
    expect(svg.props.accessibilityLabel).toBe('7')
    Object.defineProperty(Platform, 'OS', { get: () => originalOS })
  })

  it('announces the rank on web (role="img" + aria-label, no accessible prop)', async () => {
    const originalOS = Platform.OS
    Object.defineProperty(Platform, 'OS', { get: () => 'web' })
    const { toJSON } = await render(<BigRankGlyph rank={10} color='#1A1A1A' cardWidth={64} />)
    const svg = toJSON() as unknown as JsonNode
    expect(svg.props.role).toBe('img')
    expect(svg.props['aria-label']).toBe('10')
    expect(svg.props.accessible).toBeUndefined()
    Object.defineProperty(Platform, 'OS', { get: () => originalOS })
  })
})

describe('CardFace, numeric style: integration', () => {
  const cardOf = (rank: Rank): Card => ({ id: `spades-${rank}-0`, suit: 'spades', rank, faceUp: true }) as Card

  it('renders every non-court rank as a BigRankGlyph (an Svg with the rank glyph path), not a Text', async () => {
    for (const rank of NON_COURT_RANKS) {
      const { toJSON } = await render(<CardFace card={cardOf(rank)} colors={colors} width={64} height={93} cardStyle='numeric' />)
      const root = toJSON() as unknown as JsonNode
      // second top-level child is the centre content (first is the corner row)
      const centerFill = root.children![1]
      const svg = centerFill.children![0]
      expect(svg.type).toBe('Svg')
      expect(svg.props.accessibilityLabel ?? svg.props['aria-label']).toBe(rankLabel(rank))
    }
  })

  it('keeps court ranks (J, Q, K) on their own figure - BigRankGlyph is never reached for them, even in numeric style', async () => {
    for (const rank of [11, 12, 13] as Rank[]) {
      const { toJSON } = await render(<CardFace card={cardOf(rank)} colors={colors} width={64} height={93} cardStyle='numeric' />)
      const root = toJSON() as unknown as JsonNode
      const courtWrap = root.children![1]
      const child = courtWrap.children![0]
      // DecoratedCourtFigure's own root is ALSO an Svg (illustrated card art, not a rank glyph), so
      // 'not Svg' isn't the right check - its props have no accessibilityLabel/aria-label at all
      // (a whole figure, not one announced rank), unlike every BigRankGlyph (see rankA11yProps).
      expect(child.props.accessibilityLabel).toBeUndefined()
      expect(child.props['aria-label']).toBeUndefined()
    }
  })

  it('draws the same rank glyph outlines (RANK_GLYPHS path data) as the corner rank, just at the big-pip scale - confirming both read as one consistent typeface', async () => {
    const { toJSON } = await render(<CardFace card={cardOf(8)} colors={colors} width={64} height={93} cardStyle='numeric' />)
    const root = toJSON() as unknown as JsonNode
    const cornerRank = root.children![0].children![0]
    const bigRank = root.children![1].children![0]
    const cornerPath = cornerRank.children![0]
    const bigPath = bigRank.children![0]
    expect(bigPath.props.d).toBe(cornerPath.props.d) // same outline data (RANK_GLYPHS['8'].d)
    expect(bigPath.props.d).toBe(RANK_GLYPHS['8'].d)
  })
})
