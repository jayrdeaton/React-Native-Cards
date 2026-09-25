import { render } from '@testing-library/react-native'
import { Platform } from 'react-native'

import { CardFace, CORNER_ROW_FRACTION, CORNER_ROW_TOP_FRACTION, faceUpFanOffset } from '../CardFace'
import { TableColors } from '../colors'
import { RANK_INK_RIGHT_FRACTION as EXPORTED_RANK_INK_RIGHT_FRACTION } from '../index'
import { RANK_INK_RIGHT_FRACTION, rankGlyphGeometry, rankSvgSize } from '../RankGlyph'
import { RANK_FONT_SIZE_FRACTION, RANK_GLYPH_UNITS_PER_EM, RANK_GLYPHS, RankGlyphLabel } from '../rankGlyphs'
import { Card, Rank, rankLabel, Suit, SUITS } from '../types'

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
// Every 0.37pt from 28 to 96: the whole range of card widths a game lays out, through every
// fractional part, since a fractional Svg size is what native truncates.
const SWEEP_WIDTHS = Array.from({ length: 185 }, (_, i) => 28 + i * 0.37)
// One rank per distinct glyph shape that matters for the invariants: a digit, A/K, the widest ('10') and the two descenders.
const SWEEP_RANKS: Rank[] = [8, 1, 13, 10, 11, 12]
// The card width's font units per point at the designed scale: what the rank Svg must draw at, at every size.
const designedScale = (width: number) => (width * RANK_FONT_SIZE_FRACTION) / RANK_GLYPH_UNITS_PER_EM
const STYLES = ['compact', 'numeric', 'tarot'] as const
const RANKS = Array.from({ length: 13 }, (_, i) => (i + 1) as Rank)

interface JsonNode {
  type: string
  props: Record<string, unknown>
  children: JsonNode[] | null
}

// Merges an RN style prop (object, or a nested array with falsy holes) into one object.
function flat(style: unknown): Record<string, unknown> {
  if (Array.isArray(style)) return Object.assign({}, ...style.map(flat))
  return style && typeof style === 'object' ? (style as Record<string, unknown>) : {}
}
const num = (v: unknown) => v as number
const viewBoxOf = (node: JsonNode) => String(node.props.viewBox).split(' ').map(Number)

/** Renders a card face and reads its corner row back off the rendered tree: where the rank's ink
 * and the suit pip's ink actually land, in card-width fractions from the card's top-left corner.
 * Nothing here calls the component's own layout helpers - just the props it rendered with and the
 * generated outline table - so it checks the wiring end to end. */
async function corner(card: Card, width: number, cardStyle: (typeof STYLES)[number], extra: { muted?: boolean; invertDarkModeColors?: boolean } = {}) {
  const { toJSON } = await render(<CardFace card={card} colors={colors} width={width} height={(width * 93) / 64} cardStyle={cardStyle} {...extra} />)
  const root = toJSON() as unknown as JsonNode
  const frame = num(flat(root.props.style).borderWidth)
  const row = root.children![0]
  const rowStyle = flat(row.props.style)
  const [rankSvg, pipSvg] = row.children!
  const path = rankSvg.children![0]

  // What native actually draws. react-native-svg's root Svg truncates its width/height with parseInt
  // (Svg.tsx) on iOS and Android before they reach the native view, and the viewBox is then fitted into
  // that whole-point box with "xMidYMid meet" (RNSVGSvgView.mm drawRect / SvgView.java drawChildren) -
  // jest only sees the props and the web <svg> keeps fractions, so neither would show a fractional size
  // distorting the scale. Model it here: a size that isn't whole shows up as a scale off the designed one.
  const svgWidth = Math.floor(num(rankSvg.props.width))
  const svgHeight = Math.floor(num(rankSvg.props.height))
  const [vx, vy, vw, vh] = viewBoxOf(rankSvg)
  const k = Math.min(svgWidth / vw, svgHeight / vh)
  const letterboxX = (svgWidth - vw * k) / 2
  const letterboxY = (svgHeight - vh * k) / 2
  const half = num(path.props.strokeWidth) / 2
  const g = RANK_GLYPHS[rankLabel(card.rank) as RankGlyphLabel]
  // The row centres its Svg in its own height (alignItems), which the native, truncated, height decides.
  const svgLeft = frame + num(rowStyle.left)
  const svgTop = frame + num(rowStyle.top) + (num(rowStyle.height) - svgHeight) / 2
  const rankInk = { left: svgLeft + letterboxX + (g.x1 - half - vx) * k, right: svgLeft + letterboxX + (g.x2 + half - vx) * k, top: svgTop + letterboxY + (g.y1 - half - vy) * k, bottom: svgTop + letterboxY + (g.y2 + half - vy) * k }
  const svgRight = svgLeft + svgWidth

  // Suit pip ink: a square box anchored to the row's right edge and centred in its height, the art
  // fitted to it with SVG's default "meet" (so a narrow glyph is centred, not stretched).
  const [, , pw, ph] = viewBoxOf(pipSvg)
  const box = num(pipSvg.props.width)
  const inkWidth = box * Math.min(1, pw / ph)
  const pipRight = width - frame - num(rowStyle.right)
  const nudge = (flat(pipSvg.props.style).transform as { translateX: number }[] | undefined)?.[0]?.translateX ?? 0
  const pipInkLeft = pipRight - (box + inkWidth) / 2 + nudge
  const pipCenterY = frame + num(rowStyle.top) + num(rowStyle.height) / 2
  // Room left in the row once the rank Svg and the pip box are placed: never negative, or the pip would be pushed off its right anchor.
  const freeRowWidth = width - 2 * frame - num(rowStyle.left) - num(rowStyle.right) - svgWidth - box

  return { W: width, rankInk, svgLeft, svgRight, svgTop, svgBottom: svgTop + svgHeight, scale: k, letterboxX, letterboxY, freeRowWidth, pipInkLeft, pipCenterY, path, rankSvg }
}

const cardOf = (suit: Suit, rank: Rank): Card => ({ id: `${suit}-${rank}-0`, suit, rank, faceUp: true })

/** Every invariant of the corner row, read off the rendered card as native would draw it. */
async function expectCornerInvariants(card: Card, width: number, cardStyle: (typeof STYLES)[number], id: string) {
  const c = await corner(card, width, cardStyle)
  const rank = card.rank

  // the Svg is a whole number of points, so react-native-svg's truncation leaves it alone, and it draws at exactly
  // the designed scale (font units per point) with nothing letterboxed
  expect({ id, whole: Number.isInteger(num(c.rankSvg.props.width)) && Number.isInteger(num(c.rankSvg.props.height)) }).toEqual({ id, whole: true })
  expect({ id, scale: Math.abs(c.scale / designedScale(width) - 1) < 1e-9 }).toEqual({ id, scale: true })
  expect({ id, letterbox: Math.abs(c.letterboxX) < 1e-9 * width && Math.abs(c.letterboxY) < 1e-9 * width }).toEqual({ id, letterbox: true })

  // (a) the rank's ink centre is the pip's centre, for every rank
  const inkCenterY = (c.rankInk.top + c.rankInk.bottom) / 2
  expect({ id, off: Math.abs(inkCenterY - c.pipCenterY) / width < 0.002 }).toEqual({ id, off: true })

  // all the ink (stroke included) is inside its Svg, so nothing is clipped, and the Svg leaves the pip where it was
  expect(c.rankInk.left).toBeGreaterThanOrEqual(c.svgLeft)
  expect(c.rankInk.right).toBeLessThanOrEqual(c.svgRight)
  expect(c.rankInk.top).toBeGreaterThanOrEqual(c.svgTop)
  expect(c.rankInk.bottom).toBeLessThanOrEqual(c.svgBottom)
  expect({ id, room: c.freeRowWidth >= 0 }).toEqual({ id, room: true })

  // (b) J and Q hang lowest; they still clear the strip a covering card leaves by 0.02W
  if (rank === 11 || rank === 12) expect(c.rankInk.bottom).toBeLessThanOrEqual(faceUpFanOffset(width) - 0.02 * width)

  // (c) the '10' keeps a clear margin from the frame and from the pip, at every size - and its left edge sits at 0.062W
  // whatever the width (it wandered 0.060W-0.069W when the Svg's size was truncated)
  if (rank === 10) {
    expect(c.rankInk.left / width).toBeCloseTo(0.062, 6)
    expect((c.pipInkLeft - c.rankInk.right) / width).toBeGreaterThanOrEqual(0.1)
  }
}

describe('corner row geometry', () => {
  it('has a 0.39W row, so a covered card shows a 0.45W strip', () => {
    expect(CORNER_ROW_FRACTION).toBe(0.39)
    expect(CORNER_ROW_TOP_FRACTION).toBe(0.03)
    expect(faceUpFanOffset(1)).toBe(0.45)
    expect(faceUpFanOffset(50)).toBeCloseTo(22.5, 10)
  })

  describe.each(WIDTHS)('at card width %spt', (width) => {
    it.each(STYLES)('centres every rank\'s ink on the suit pip, keeps J/Q clear of the fan strip and the "10" off the frame and the pip (%s)', async (cardStyle) => {
      for (const suit of SUITS) {
        for (const rank of RANKS) {
          await expectCornerInvariants(cardOf(suit, rank), width, cardStyle, `${cardStyle} ${suit} ${rankLabel(rank)} @${width}`)
        }
      }
    })
  })

  // The truncation is a function of the fractional part of the size, so sweep it: every one of these
  // widths must still draw at the designed scale with every invariant intact.
  it('holds every invariant at every fractional card width from 28pt to 96pt', async () => {
    for (const width of SWEEP_WIDTHS) {
      for (const rank of SWEEP_RANKS) {
        await expectCornerInvariants(cardOf('clubs', rank), width, 'compact', `${rankLabel(rank)} @${width}`)
      }
    }
  })

  it('puts J and Q where their ink already sat and moves the digits, A and K to meet them', async () => {
    // The whole point of per-rank centring: every rank's ink centre is the same 0.245W, however tall its glyph.
    const centres = new Set<string>()
    for (const rank of RANKS) {
      const c = await corner(cardOf('clubs', rank), 50.57, 'compact')
      centres.add(((c.rankInk.top + c.rankInk.bottom) / 2 / 50.57).toFixed(3))
    }
    expect([...centres]).toEqual(['0.245'])
  })

  it('leaves the rank centred in one fixed box, so the suit pip never moves with it', async () => {
    const one = await corner(cardOf('spades', 8), 50, 'compact')
    const ten = await corner(cardOf('spades', 10), 50, 'compact')
    expect(ten.svgLeft).toBe(one.svgLeft)
    expect(ten.svgRight).toBe(one.svgRight)
    expect(ten.pipInkLeft).toBe(one.pipInkLeft)
    // a single glyph is centred in the box, the '10' fills it
    expect((one.rankInk.left + one.rankInk.right) / 2 - (one.svgLeft + one.svgRight) / 2).toBeLessThan(0.05 * 50)
  })
})

describe('corner rank drawing', () => {
  it('is two native views: one Svg holding one stroked Path', async () => {
    const c = await corner(cardOf('hearts', 10), 64, 'compact')
    expect(c.rankSvg.children).toHaveLength(1)
    expect(c.path.type).toBe('Path')
    expect(c.path.props.d).toBe(RANK_GLYPHS['10'].d)
    // faux-bold: 0.035em of stroke in the ink colour, round joins
    expect(c.path.props.strokeWidth).toBeCloseTo(0.035 * 2048, 6)
    expect(c.path.props.stroke).toBe(c.path.props.fill)
    expect(c.path.props.strokeLinejoin).toBe('round')
  })

  it.each(STYLES)('uses the same ink as the pip for each suit (%s)', async (cardStyle) => {
    const red = await corner(cardOf('hearts', 5), 64, cardStyle)
    const black = await corner(cardOf('spades', 5), 64, cardStyle)
    if (cardStyle === 'tarot') {
      expect(red.path.props.fill).not.toBe(black.path.props.fill)
    } else {
      expect(red.path.props.fill).toBe(colors.textRed)
      expect(black.path.props.fill).toBe(colors.textBlack)
    }
  })

  it('swaps black ink for the inverted ink in dark mode, and never touches red', async () => {
    const black = await corner(cardOf('clubs', 7), 64, 'compact', { invertDarkModeColors: true })
    const red = await corner(cardOf('diamonds', 7), 64, 'compact', { invertDarkModeColors: true })
    expect(black.path.props.fill).toBe(colors.textBlackInverted)
    expect(red.path.props.fill).toBe(colors.textRed)
  })

  it('draws a muted watermark rank in the one neutral ink, the whole card fading as a single layer', async () => {
    const { toJSON } = await render(<CardFace card={cardOf('hearts', 9)} colors={colors} width={64} height={93} muted />)
    const root = toJSON() as unknown as JsonNode
    expect(flat(root.props.style).opacity).toBeLessThan(1)
    const path = root.children![0].children![0].children![0]
    expect(path.props.fill).toBe(colors.textBlack)
  })

  it('leaves the decorated style alone: its index is baked into the art, so no rank glyph is drawn', async () => {
    const { toJSON } = await render(<CardFace card={cardOf('hearts', 10)} colors={colors} width={64} height={93} cardStyle='decorated' />)
    expect(JSON.stringify(toJSON())).not.toContain('accessibilityLabel')
  })
})

describe('corner rank accessibility', () => {
  const setPlatform = (os: string) => {
    ;(Platform as { OS: string }).OS = os
  }
  afterEach(() => setPlatform('ios'))

  it.each(['ios', 'android'])('is an accessible image labelled with the rank on %s, so a screen reader announces it as the old Text was', async (os) => {
    setPlatform(os)
    for (const rank of RANKS) {
      const { rankSvg } = await corner(cardOf('hearts', rank), 64, 'compact')
      expect(rankSvg.props.accessible).toBe(true)
      expect(rankSvg.props.accessibilityRole).toBe('image')
      expect(rankSvg.props.accessibilityLabel).toBe(rankLabel(rank))
      expect(rankSvg.props).not.toHaveProperty('role')
    }
  })

  it('is role="img" with an aria-label on web, and passes no `accessible` for react-native-web to put on the DOM', async () => {
    setPlatform('web')
    for (const rank of RANKS) {
      const { rankSvg } = await corner(cardOf('hearts', rank), 64, 'compact')
      expect(rankSvg.props.role).toBe('img')
      expect(rankSvg.props['aria-label']).toBe(rankLabel(rank))
      // `accessible` would reach the <svg> as an unknown attribute (React warns), and the accessibility* props are deprecated there
      expect(rankSvg.props).not.toHaveProperty('accessible')
      expect(rankSvg.props).not.toHaveProperty('accessibilityRole')
      expect(rankSvg.props).not.toHaveProperty('accessibilityLabel')
    }
  })

  it('announces the same label on a muted card', async () => {
    const { toJSON } = await render(<CardFace card={cardOf('spades', 12)} colors={colors} width={64} height={93} muted />)
    const rankSvg = (toJSON() as unknown as JsonNode).children![0].children![0]
    expect(rankSvg.props.accessibilityLabel).toBe('Q')
    expect(rankSvg.props.accessible).toBe(true)
  })
})

describe('the rank Svg size', () => {
  it.each(WIDTHS)('is the designed box rounded up to whole points at %spt', (width) => {
    const { width: w, height: h } = rankSvgSize(width, CORNER_ROW_FRACTION)
    expect(Number.isInteger(w) && Number.isInteger(h)).toBe(true)
    expect(w).toBeGreaterThanOrEqual(width * 0.52 - 1e-9)
    expect(w).toBeLessThan(width * 0.52 + 1)
    expect(h).toBeGreaterThanOrEqual(width * CORNER_ROW_FRACTION - 1e-9)
    expect(h).toBeLessThan(width * CORNER_ROW_FRACTION + 1)
  })

  it('has a viewBox exactly as big as its box at the designed scale, centred on the ink', () => {
    for (const width of SWEEP_WIDTHS) {
      for (const rank of RANKS) {
        const label = rankLabel(rank) as RankGlyphLabel
        const geo = rankGlyphGeometry(label, width, CORNER_ROW_FRACTION)
        const [, vy, vw, vh] = geo.viewBox.split(' ').map(Number)
        const k = designedScale(width)
        expect(vw * k).toBeCloseTo(geo.width, 6)
        expect(vh * k).toBeCloseTo(geo.height, 6)
        const g = RANK_GLYPHS[label]
        expect(vy + vh / 2).toBeCloseTo((g.y1 + g.y2) / 2, 6)
      }
    }
  })

  it('stays finite at a zero-width card', () => {
    const geo = rankGlyphGeometry('10', 0, CORNER_ROW_FRACTION)
    expect(geo.width).toBe(0)
    expect(geo.viewBox.split(' ').every((n) => Number.isFinite(Number(n)))).toBe(true)
  })
})

describe('RANK_INK_RIGHT_FRACTION', () => {
  it('is exported from the package', () => {
    expect(EXPORTED_RANK_INK_RIGHT_FRACTION).toBe(RANK_INK_RIGHT_FRACTION)
  })

  it.each(WIDTHS)('is where the rendered "10"\'s ink ends, and no rank reaches further, at %spt', async (width) => {
    let widest = 0
    for (const rank of RANKS) {
      const c = await corner(cardOf('clubs', rank), width, 'compact')
      const right = c.rankInk.right / width
      widest = Math.max(widest, right)
      if (rank === 10) expect(right).toBeCloseTo(RANK_INK_RIGHT_FRACTION, 9)
      expect(right).toBeLessThanOrEqual(RANK_INK_RIGHT_FRACTION + 1e-9)
    }
    expect(widest).toBeCloseTo(RANK_INK_RIGHT_FRACTION, 9)
  })

  it('is wider than the 0.45W strip a covered horizontal-fan card shows (the "0" would be clipped), and inside the card', () => {
    expect(RANK_INK_RIGHT_FRACTION).toBeGreaterThan(faceUpFanOffset(1))
    expect(RANK_INK_RIGHT_FRACTION).toBeCloseTo(0.5073, 4)
    expect(RANK_INK_RIGHT_FRACTION).toBeLessThan(0.7)
  })
})
