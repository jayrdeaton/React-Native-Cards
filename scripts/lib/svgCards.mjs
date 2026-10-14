// Shared plumbing for the SVG-cards extraction scripts (generate-card-artwork, generate-card-back,
// generate-court-figures, generate-court-silhouette): loading the vendored sheet, walking it,
// rewriting path geometry, relabeling baked colours, and writing (or --check-ing) the generated
// files. Each script keeps its own shape conversion, since those deliberately differ (see each
// script's header).
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

import prettier from 'prettier'
import { parse } from 'svgson'

const HERE = path.dirname(fileURLToPath(import.meta.url))
export const ROOT = path.join(HERE, '..', '..')
export const ARTWORK_DIR = path.join(ROOT, 'src', 'artwork')
// SVG-cards 4.0.2 (https://github.com/htdebeer/SVG-cards), vendored unmodified so every script runs
// with no arguments and --check works in CI. Not shipped (outside the package's `files`). LGPL, see
// src/artwork/LICENSE and NOTICE.md; the sheet's own header comment carries its copyright notice.
const SHEET_FILE = path.join(HERE, '..', 'svg-cards', 'svg-cards.svg')

export async function loadSheet() {
  return parse(fs.readFileSync(SHEET_FILE, 'utf-8'))
}

export function collectIds(node, map = new Map()) {
  if (node.attributes?.id) map.set(node.attributes.id, node)
  for (const child of node.children ?? []) collectIds(child, map)
  return map
}

export function findGroupById(root, id) {
  if (root.name === 'g' && root.attributes?.id === id) return root
  for (const child of root.children ?? []) {
    const found = findGroupById(child, id)
    if (found) return found
  }
  return null
}

/** Reads fill/stroke/stroke-width out of an inline style="..." attribute. `parseWidth` is Number
 * for most scripts; generate-card-back.mjs passes parseFloat for its "0.25pt" stroke-width. */
export function parseStyle(styleAttr, parseWidth = Number) {
  const out = {}
  if (!styleAttr) return out
  for (const decl of styleAttr.split(';')) {
    const [rawKey, rawValue] = decl.split(':')
    const key = rawKey?.trim()
    const value = rawValue?.trim()
    if (!key || !value) continue
    if (key === 'fill') out.fill = value
    else if (key === 'stroke') out.stroke = value
    else if (key === 'stroke-width') out.strokeWidth = parseWidth(value)
  }
  return out
}

/** Pushes every descendant of `node` (itself included) whose tag is in `tags`, in document order. */
export function collectDrawable(node, tags, out = []) {
  if (tags.includes(node.name)) out.push(node)
  for (const child of node.children ?? []) collectDrawable(child, tags, out)
  return out
}

/** Parses a matrix()/translate() transform attribute into a full [a,b,c,d,e,f] affine - i.e.
 * (x,y) -> (a*x+c*y+e, b*x+d*y+f). Every transform in this sheet is one of these two forms. */
export function parseTransform(transformAttr) {
  const asMatrix = transformAttr?.match(/matrix\(([^,]+),([^,]+),([^,]+),([^,]+),([^,]+),([^)]+)\)/)
  if (asMatrix) return asMatrix.slice(1).map(Number)
  const asTranslate = transformAttr?.match(/translate\(([^,]+),([^)]+)\)/)
  if (asTranslate) {
    const [x, y] = asTranslate.slice(1).map(Number)
    return [1, 0, 0, 1, x, y]
  }
  throw new Error(`unsupported transform: ${transformAttr}`)
}

/** The two affines a court card places its body art with, upright first. The sheet draws each
 * figure's body ONCE (e.g. "king_1") and places it twice via <use>: once upright, once rotated 180
 * degrees for the card's other half. The upright placement is always the one with a negative x
 * scale (confirmed by rendering, king/queen/jack alike) - the body art is authored in the
 * orientation the OTHER placement uses as-is, i.e. upside-down relative to how the card shows it. */
export function findBodyPlacements(cardGroup, bodyId) {
  const matrices = []
  function walk(node) {
    if (node.name === 'use' && node.attributes?.['xlink:href'] === `#${bodyId}`) matrices.push(parseTransform(node.attributes.transform))
    for (const child of node.children ?? []) walk(child)
  }
  walk(cardGroup)
  if (matrices.length !== 2) throw new Error(`expected exactly 2 <use> placements of #${bodyId}, found ${matrices.length}`)
  const [m1, m2] = matrices
  return m1[0] < 0 ? [m1, m2] : [m2, m1]
}

// Arity (numeric args per repetition) for every path command the sheet's figures use. S (smooth
// cubic) has an implicit first control point - the previous command's C/S second control point
// reflected about the current point, or the current point itself if there wasn't one - so it's
// rewritten into a regular, explicit C rather than tracked as its own case throughout.
const ARITY = { m: 2, l: 2, h: 1, v: 1, c: 6, s: 4, z: 0 }

/** Normalizes an M/L/H/V/C/S path (any mix of absolute/relative commands) into absolute M/L/C
 * commands with every coordinate passed through the affine [a,b,c,d,e,f]. Re-expressing H/V as L
 * is necessary once a translate is involved: an H's untouched y-coordinate is only "keep cy as-is"
 * in the pre-transform space, not the post-transform one. */
export function transformPathData(d, [a, b, c, dd, e, f]) {
  const tokens = d.match(/[MLHVCSZmlhvcsz]|-?[0-9]*\.?[0-9]+(?:[eE]-?[0-9]+)?/g) ?? []
  let cx = 0
  let cy = 0
  let startX = 0
  let startY = 0
  let lastControl2 = null // previous C/S command's second control point, in pre-transform space
  let lastWasCurve = false
  let i = 0
  let out = ''
  const point = (x, y) => `${(a * x + c * y + e).toFixed(3)},${(b * x + dd * y + f).toFixed(3)}`
  const emitCubic = (c1x, c1y, c2x, c2y, ex, ey) => {
    out += 'C' + [point(c1x, c1y), point(c2x, c2y), point(ex, ey)].join(' ')
    lastControl2 = [c2x, c2y]
    cx = ex
    cy = ey
  }
  while (i < tokens.length) {
    const cmd = tokens[i++]
    const letter = cmd.toLowerCase()
    const arity = ARITY[letter]
    if (arity === undefined) throw new Error(`unsupported path command: ${cmd}`)
    if (arity === 0) {
      out += 'Z'
      cx = startX
      cy = startY
      lastWasCurve = false
      continue
    }
    const relative = cmd === letter
    do {
      const args = tokens.slice(i, i + arity).map(Number)
      i += arity
      if (letter === 'h') {
        cx = relative ? cx + args[0] : args[0]
        out += 'L' + point(cx, cy)
        lastWasCurve = false
      } else if (letter === 'v') {
        cy = relative ? cy + args[0] : args[0]
        out += 'L' + point(cx, cy)
        lastWasCurve = false
      } else if (letter === 'c') {
        const c1x = relative ? cx + args[0] : args[0]
        const c1y = relative ? cy + args[1] : args[1]
        const c2x = relative ? cx + args[2] : args[2]
        const c2y = relative ? cy + args[3] : args[3]
        const ex = relative ? cx + args[4] : args[4]
        const ey = relative ? cy + args[5] : args[5]
        emitCubic(c1x, c1y, c2x, c2y, ex, ey)
        lastWasCurve = true
      } else if (letter === 's') {
        const c1x = lastWasCurve ? 2 * cx - lastControl2[0] : cx
        const c1y = lastWasCurve ? 2 * cy - lastControl2[1] : cy
        const c2x = relative ? cx + args[0] : args[0]
        const c2y = relative ? cy + args[1] : args[1]
        const ex = relative ? cx + args[2] : args[2]
        const ey = relative ? cy + args[3] : args[3]
        emitCubic(c1x, c1y, c2x, c2y, ex, ey)
        lastWasCurve = true
      } else {
        cx = relative ? cx + args[0] : args[0]
        cy = relative ? cy + args[1] : args[1]
        out += (letter === 'm' ? 'M' : 'L') + point(cx, cy)
        if (letter === 'm') {
          startX = cx
          startY = cy
        }
        lastWasCurve = false
      }
      // An SVG path command letter repeats implicitly while more of its own arg-groups follow.
    } while (i < tokens.length && !isNaN(Number(tokens[i])))
  }
  return out
}

/** [x0, y0, x1, y1] over a flat list of alternating x,y numbers (e.g. every number in a path
 * that transformPathData produced, which is only ever absolute coordinate pairs). */
export function boundingBox(nums) {
  let x0 = Infinity
  let y0 = Infinity
  let x1 = -Infinity
  let y1 = -Infinity
  for (let i = 0; i < nums.length; i += 2) {
    x0 = Math.min(x0, nums[i])
    x1 = Math.max(x1, nums[i])
    y0 = Math.min(y0, nums[i + 1])
    y1 = Math.max(y1, nums[i + 1])
  }
  return [x0, y0, x1, y1]
}

export const pathNumbers = (d) => d.match(/-?[0-9.]+/g).map(Number)

// The decorated pack's baked colour literals -> the named constants in
// src/artwork/decoratedCustom/colors.ts, so the pack accepts colour overrides as props (see
// DecoratedCardFace's colorOverrides). Two formats are mixed in the generated data: unquoted key
// with a space (generate-card-artwork.mjs, and most of courtFigures.ts) and quoted key with no
// space (the clipped overlap group in courtFigures.ts, which generate-court-figures.mjs serializes
// with plain JSON.stringify). Every literal is distinct and non-overlapping, so order doesn't
// matter. `fill: "none"` is deliberately absent: it's an SVG sentinel ("no fill"), not a colour.
const COLOR_CONSTANTS = {
  black: 'INK_BLACK',
  '#000000': 'INK_BLACK',
  '#1C1585': 'NAVY',
  '#E61408': 'INK_RED_ALT',
  '#E6180A': 'INK_RED',
  '#e6180a': 'INK_RED',
  '#F8C20F': 'GOLD',
  '#FFFFFF': 'CARD_WHITE',
  '#ffffff': 'CARD_WHITE'
}
// Only the stroke literal that actually occurs in the sheet's art is relabeled.
const STROKE_CONSTANTS = { '#000000': 'INK_BLACK' }
const SUBSTITUTIONS = [
  ...Object.entries(COLOR_CONSTANTS).map(([v, name]) => [`fill: "${v}"`, `fill: ${name}`]),
  ...Object.entries(STROKE_CONSTANTS).map(([v, name]) => [`stroke: "${v}"`, `stroke: ${name}`]),
  ...Object.entries(COLOR_CONSTANTS).map(([v, name]) => [`"fill":"${v}"`, `"fill":${name}`]),
  ...Object.entries(STROKE_CONSTANTS).map(([v, name]) => [`"stroke":"${v}"`, `"stroke":${name}`])
]
const ALL_CONSTANTS = ['CARD_WHITE', 'GOLD', 'INK_BLACK', 'INK_RED_ALT', 'INK_RED', 'NAVY']

/** Replaces every baked colour literal in a generated decorated-pack module with its named
 * constant, and imports (only) the constants it ended up using from ./colors - a black suit's file
 * never has a red literal, and an unused import would fail noUnusedLocals. */
export function relabelColors(source) {
  let out = source
  for (const [literal, replacement] of SUBSTITUTIONS) out = out.split(literal).join(replacement)
  // \b-bounded so INK_RED doesn't false-positive on INK_RED_ALT.
  const used = ALL_CONSTANTS.filter((name) => new RegExp(`\\b${name}\\b`).test(out))
  const exportIdx = out.indexOf('\nexport const')
  if (exportIdx === -1) throw new Error('relabelColors: no "export const" to insert the color import before')
  return out.slice(0, exportIdx + 1) + `import { ${used.join(', ')} } from './colors';\n` + out.slice(exportIdx + 1)
}

/** Formats a generated module with the repo's own Prettier config, for output that isn't in
 * eslint.config.cjs's ignore list (the decoratedCustom/ data is, being far too large to lint). */
export async function formatWithPrettier(file, source) {
  const options = await prettier.resolveConfig(file)
  return prettier.format(source, { ...options, filepath: file })
}

/** Writes each { absolutePath: contents } entry, or with --check (run by the tests) exits 1 if any
 * checked-in file differs from what the script would write. */
export function writeOrCheck(script, files) {
  if (process.argv.includes('--check')) {
    const stale = Object.entries(files).filter(([file, next]) => !fs.existsSync(file) || fs.readFileSync(file, 'utf8') !== next)
    if (stale.length > 0) {
      for (const [file] of stale) process.stderr.write(`${path.relative(ROOT, file)} is stale - run: node scripts/${script}\n`)
      process.exit(1)
    }
    return
  }
  for (const [file, next] of Object.entries(files)) {
    fs.mkdirSync(path.dirname(file), { recursive: true })
    fs.writeFileSync(file, next)
    process.stdout.write(`wrote ${path.relative(process.cwd(), file)}\n`)
  }
}

export function run(main) {
  main().catch((err) => {
    process.stderr.write(`${err.stack ?? err}\n`)
    process.exit(1)
  })
}
