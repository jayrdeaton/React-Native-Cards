// Regenerates src/rankGlyphs.ts: the 13 corner-rank glyph OUTLINES (A, 2-10, J, Q, K) of DejaVu
// Serif Bold, as SVG path data in font units.
//
//   node scripts/generate-rank-glyphs.mjs           # rewrite src/rankGlyphs.ts
//   node scripts/generate-rank-glyphs.mjs --check   # exit 1 if src/rankGlyphs.ts is stale (run by the tests)
//
// Why outlines instead of a <Text>: React Native's Text can't stroke, and the corner rank wants a
// faux-bold stroke on top of DejaVu Serif Bold (see RankGlyph.tsx). Drawing the glyphs as paths
// also makes the rank independent of font loading and identical on iOS/Android/web (no per-platform
// text metrics, so nothing to nudge). The font is vendored next to this script (scripts/fonts, not
// shipped in the package's `files`) so the output never depends on what a consumer has installed;
// opentype.js is a devDependency only - nothing here runs at runtime.
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

import opentype from 'opentype.js'

const HERE = path.dirname(fileURLToPath(import.meta.url))
const FONT_FILE = path.join(HERE, 'fonts', 'DejaVuSerif-Bold.ttf')
const OUT_FILE = path.join(HERE, '..', 'src', 'rankGlyphs.ts')

// The corner rank's design, as fractions of card width. These two are baked into the '10' outline
// (its '0' sits one advance plus one letter-spacing after its '1'), so they live here, the single
// source of truth, and the generated file re-exports them for RankGlyph.tsx to lay out with.
const FONT_SIZE_FRACTION = 0.37
const LETTER_SPACING_FRACTION = -0.02
// One decimal is exact for TrueType: outline coordinates are integers, and the only fractions
// opentype.js introduces are the implied on-curve midpoints of consecutive quadratic control points.
const DECIMALS = 1

const LABELS = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K']

const round = (n) => Number(n.toFixed(DECIMALS))

// Path data from opentype.js's commands, written here rather than via Path#toPathData for two
// reasons that matter to a STROKED outline: TrueType glyphs come back with no Z at all (each
// contour just ends with a line back to its start, which fills fine but would leave the stroke's
// start/end as two butt caps instead of a join), and toPathData flips y by default. So: closed
// contours (the redundant closing line and zero-length lines are dropped, Z draws the last edge),
// y untouched (down, baseline at 0), coordinates space-separated so a negative never runs into
// the number before it.
function toPathData(commands) {
  const num = (n) => String(round(n))
  let d = ''
  let start = null
  let current = null
  let open = false
  commands.forEach((c, i) => {
    switch (c.type) {
      case 'M':
        if (open) d += 'Z'
        start = current = [round(c.x), round(c.y)]
        open = true
        d += `M${num(c.x)} ${num(c.y)}`
        break
      case 'L': {
        const to = [round(c.x), round(c.y)]
        const last = !commands[i + 1] || commands[i + 1].type === 'M' || commands[i + 1].type === 'Z'
        if ((to[0] === current[0] && to[1] === current[1]) || (last && to[0] === start[0] && to[1] === start[1])) break
        current = to
        d += `L${num(c.x)} ${num(c.y)}`
        break
      }
      case 'Q':
        current = [round(c.x), round(c.y)]
        d += `Q${num(c.x1)} ${num(c.y1)} ${num(c.x)} ${num(c.y)}`
        break
      case 'C':
        current = [round(c.x), round(c.y)]
        d += `C${num(c.x1)} ${num(c.y1)} ${num(c.x2)} ${num(c.y2)} ${num(c.x)} ${num(c.y)}`
        break
      case 'Z':
        break
      default:
        throw new Error(`Unexpected path command ${c.type}`)
    }
  })
  return open ? d + 'Z' : d
}

export function buildRankGlyphs(font) {
  const upm = font.unitsPerEm
  const letterSpacing = (LETTER_SPACING_FRACTION / FONT_SIZE_FRACTION) * upm
  const glyphs = {}
  for (const label of LABELS) {
    const run = new opentype.Path()
    let x = 0
    for (const ch of label) {
      const glyph = font.charToGlyph(ch)
      if (glyph.index === 0) throw new Error(`Font has no glyph for '${ch}'`)
      // fontSize === unitsPerEm makes getPath's output font units, y flipped to SVG's y-down with
      // the baseline at y = 0 (ink above the baseline is negative).
      run.extend(glyph.getPath(x, 0, upm))
      // RN applies letterSpacing after EVERY character, the last one included, so the run's
      // advance (what Text centres inside its box) carries the trailing spacing too.
      x += glyph.advanceWidth + letterSpacing
    }
    const box = run.getBoundingBox()
    glyphs[label] = { d: toPathData(run.commands), advance: round(x), x1: round(box.x1), y1: round(box.y1), x2: round(box.x2), y2: round(box.y2) }
  }
  return { upm, glyphs }
}

export function render({ upm, glyphs }) {
  const labels = LABELS.map((l) => `'${l}'`).join(' | ')
  const entries = LABELS.map((label) => {
    const g = glyphs[label]
    // Prettier's quote-props: as-needed leaves digit keys quoted but unquotes letters.
    const key = /^[A-Z]$/.test(label) ? label : `'${label}'`
    return `  ${key}: {\n    d: '${g.d}',\n    advance: ${g.advance},\n    x1: ${g.x1},\n    y1: ${g.y1},\n    x2: ${g.x2},\n    y2: ${g.y2}\n  }`
  }).join(',\n')
  return `// GENERATED by scripts/generate-rank-glyphs.mjs from scripts/fonts/DejaVuSerif-Bold.ttf - do not edit
// by hand; run \`node scripts/generate-rank-glyphs.mjs\` (the tests fail if this file is stale).
//
// The 13 corner-rank glyph outlines, in font units (y down, baseline at y = 0, so ink above the
// baseline has negative y). '10' is its '1' and '0' outlines laid out with the letter spacing below.

export const RANK_GLYPH_UNITS_PER_EM = ${upm}
/** The corner rank's font size and letter spacing, as fractions of card width. */
export const RANK_FONT_SIZE_FRACTION = ${FONT_SIZE_FRACTION}
export const RANK_LETTER_SPACING_FRACTION = ${LETTER_SPACING_FRACTION}

export type RankGlyphLabel = ${labels}

export interface RankGlyphOutline {
  /** SVG path data, absolute M/L/Q/C/Z commands only. */
  d: string
  /** Advance width of the whole run, letter spacing included (also after the last character). */
  advance: number
  /** The outline's tight ink bounding box. */
  x1: number
  y1: number
  x2: number
  y2: number
}

export const RANK_GLYPHS: Record<RankGlyphLabel, RankGlyphOutline> = {
${entries}
}
`
}

function main() {
  const buf = fs.readFileSync(FONT_FILE)
  const font = opentype.parse(buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength))
  const next = render(buildRankGlyphs(font))
  if (process.argv.includes('--check')) {
    const current = fs.existsSync(OUT_FILE) ? fs.readFileSync(OUT_FILE, 'utf8') : ''
    if (current !== next) {
      process.stderr.write('src/rankGlyphs.ts is stale - run: node scripts/generate-rank-glyphs.mjs\n')
      process.exit(1)
    }
    return
  }
  fs.writeFileSync(OUT_FILE, next)
  process.stdout.write(`wrote ${path.relative(process.cwd(), OUT_FILE)}\n`)
}

if (process.argv[1] === fileURLToPath(import.meta.url)) main()
