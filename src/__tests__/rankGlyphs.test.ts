/**
 * @jest-environment node
 */
import { spawnSync } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'

import { RANK_FONT_SIZE_FRACTION, RANK_GLYPH_UNITS_PER_EM, RANK_GLYPHS, RANK_LETTER_SPACING_FRACTION, RankGlyphLabel } from '../rankGlyphs'
import { Rank, rankLabel } from '../types'

// opentype.js ships no types; the slice this test touches. It is a devDependency only (it also
// drives scripts/generate-rank-glyphs.mjs) - the shipped package never loads it.
interface OpenTypeBox {
  x1: number
  y1: number
  x2: number
  y2: number
}
interface OpenTypeCommand {
  type: string
  x?: number
  y?: number
  x1?: number
  y1?: number
  x2?: number
  y2?: number
}
interface OpenTypePath {
  commands: OpenTypeCommand[]
  extend(other: OpenTypePath): void
  getBoundingBox(): OpenTypeBox
}
interface OpenTypeGlyph {
  advanceWidth: number
  getPath(x: number, y: number, fontSize: number): OpenTypePath
}
interface OpenTypeFont {
  unitsPerEm: number
  charToGlyph(char: string): OpenTypeGlyph
}
interface OpenType {
  parse(buffer: ArrayBuffer): OpenTypeFont
  Path: { new (): OpenTypePath; fromSVG(d: string, options?: { flipY?: boolean }): OpenTypePath }
}

const opentype = jest.requireActual<OpenType>('opentype.js')
const SCRIPT = path.join(__dirname, '..', '..', 'scripts', 'generate-rank-glyphs.mjs')
const FONT_FILE = path.join(__dirname, '..', '..', 'scripts', 'fonts', 'DejaVuSerif-Bold.ttf')

const buf = fs.readFileSync(FONT_FILE)
const font = opentype.parse(buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength))
const LABELS = (Array.from({ length: 13 }, (_, i) => i + 1) as Rank[]).map(rankLabel) as RankGlyphLabel[]
const TOLERANCE = 0.051 // the table is rounded to one decimal
// fromSVG flips y by default; the table is already in SVG's y-down.
const PARSE_AS_IS = { flipY: false }

// The font's own outline for a rank, laid out the way the corner rank is: each glyph one advance
// plus one letter-spacing after the last.
function fontRun(label: string) {
  const letterSpacing = (RANK_LETTER_SPACING_FRACTION / RANK_FONT_SIZE_FRACTION) * font.unitsPerEm
  const run = new opentype.Path()
  let x = 0
  for (const ch of label) {
    const glyph = font.charToGlyph(ch)
    run.extend(glyph.getPath(x, 0, font.unitsPerEm))
    x += glyph.advanceWidth + letterSpacing
  }
  return { run, advance: x }
}

// Every point an outline visits, in order. The path data is written closed (Z draws the last
// edge), so the font's own redundant line back to a contour's start - and any zero-length line -
// doesn't count, and neither do the Zs.
function outlinePoints(commands: OpenTypeCommand[]): number[][] {
  const points: number[][] = []
  let start: OpenTypeCommand | undefined
  let current: OpenTypeCommand | undefined
  commands.forEach((c, i) => {
    if (c.type === 'Z') return
    if (c.type === 'M') start = c
    if (c.type === 'L') {
      const last = !commands[i + 1] || commands[i + 1].type === 'M' || commands[i + 1].type === 'Z'
      if ((c.x === current?.x && c.y === current?.y) || (last && c.x === start?.x && c.y === start?.y)) return
    }
    current = c
    points.push([c.x1 ?? 0, c.y1 ?? 0, c.x2 ?? 0, c.y2 ?? 0, c.x ?? 0, c.y ?? 0])
  })
  return points
}

describe('rankGlyphs (generated corner-rank outlines)', () => {
  it('has exactly the 13 ranks, A through K', () => {
    expect(Object.keys(RANK_GLYPHS).sort()).toEqual([...LABELS].sort())
    expect(LABELS).toEqual(['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'])
  })

  it('is expressed in the vendored font units, at the design size and spacing', () => {
    expect(RANK_GLYPH_UNITS_PER_EM).toBe(font.unitsPerEm)
    expect(RANK_FONT_SIZE_FRACTION).toBe(0.37)
    expect(RANK_LETTER_SPACING_FRACTION).toBe(-0.02)
  })

  it.each(LABELS)("rank %s matches the font's real glyph outline", (label) => {
    const { run, advance } = fontRun(label)
    const entry = RANK_GLYPHS[label]

    // Same outline: every point the same, in the same order (to the table's rounding).
    const tablePoints = outlinePoints(opentype.Path.fromSVG(entry.d, PARSE_AS_IS).commands)
    const fontPoints = outlinePoints(run.commands)
    expect(tablePoints).toHaveLength(fontPoints.length)
    tablePoints.forEach((p, i) => p.forEach((v, k) => expect(Math.abs(v - fontPoints[i][k])).toBeLessThan(TOLERANCE)))

    // The stored ink box is the outline's true box (curve extremes, not control points) ...
    const box = run.getBoundingBox()
    const fromPath = opentype.Path.fromSVG(entry.d, PARSE_AS_IS).getBoundingBox()
    for (const k of ['x1', 'y1', 'x2', 'y2'] as const) {
      expect(Math.abs(entry[k] - box[k])).toBeLessThan(TOLERANCE)
      expect(Math.abs(entry[k] - fromPath[k])).toBeLessThan(TOLERANCE)
    }
    // ... and the advance carries the trailing letter spacing (what Text centres inside its box).
    expect(Math.abs(entry.advance - advance)).toBeLessThan(TOLERANCE)
  })

  it("lays '10' out as its '1' then its '0', one letter-spacing apart", () => {
    const one = font.charToGlyph('1')
    const zero = font.charToGlyph('0')
    const spacing = (RANK_LETTER_SPACING_FRACTION / RANK_FONT_SIZE_FRACTION) * font.unitsPerEm
    const zeroBox = zero.getPath(one.advanceWidth + spacing, 0, font.unitsPerEm).getBoundingBox()
    expect(Math.abs(RANK_GLYPHS['10'].x2 - zeroBox.x2)).toBeLessThan(TOLERANCE)
    expect(Math.abs(RANK_GLYPHS['10'].x1 - one.getPath(0, 0, font.unitsPerEm).getBoundingBox().x1)).toBeLessThan(TOLERANCE)
  })

  it('is what scripts/generate-rank-glyphs.mjs produces from the vendored font today (regenerate if this fails)', () => {
    const result = spawnSync(process.execPath, [SCRIPT, '--check'], { encoding: 'utf8' })
    expect(result.stderr).toBe('')
    expect(result.status).toBe(0)
  })
})
