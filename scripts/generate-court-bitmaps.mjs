// Regenerates src/artwork/courtBitmaps/*.png: pre-rasterized bitmaps of the 12 DecoratedCourtFigure
// combinations (4 suits x jack/queen/king), for consumers that need a court figure mounted/unmounted
// rapidly (many-simultaneous-ghost animations - a card deal, a fast finish/win sweep) rather than
// steady-state on a settled board.
//
//   node scripts/generate-court-bitmaps.mjs           # rewrite src/artwork/courtBitmaps/*.png + index.ts
//   node scripts/generate-court-bitmaps.mjs --check   # exit 1 if the checked-in output is stale (run by the tests)
//
// What --check compares: NOT the PNG bytes. resvg's rasterizer (tiny-skia) takes different SIMD code
// paths on different CPUs (NEON on Apple Silicon, SSE/AVX on x86_64), so the same SVG rasterizes to
// PNGs that differ by a few anti-aliased edge pixels between a Mac and a Linux CI runner - a byte
// compare passed locally and failed every CI run. Instead, index.ts carries a SOURCE HASH: a sha256 of
// the exact SVG markup handed to resvg plus the resvg options (see sourceHash()). That markup is
// produced by pure JS (esbuild + react-dom/server), so it is identical on every OS, and it changes
// whenever DecoratedCourtFigure's art, its render output, or WIDTH/HEIGHT change. --check re-renders
// the SVGs (no rasterizing), rebuilds index.ts, and compares it byte-for-byte with the checked-in one,
// so a stale hash (art changed, PNGs not regenerated) fails. It also checks every PNG is present and
// is a PNG of exactly WIDTH x HEIGHT. A resvg-js upgrade does not invalidate the hash: rerun the
// script after one if the PNGs should pick up its rendering changes.
//
// Why bitmaps exist at all: DecoratedCourtFigure's art (src/artwork/decoratedCustom/courtFigures.ts,
// ~2.5MB of path data) renders one figure as ~90-100 <Path>/<G>/<Defs> elements with long, detailed
// curve data - real, measured cost every time a NEW one mounts (confirmed on a real iOS Simulator via
// frame-by-frame video capture of a Solitaire FreeCell deal: reverting to plain court silhouettes or
// swapping in a pre-rasterized bitmap both cut the deal's worst freezes roughly in half). A settled
// card pays this once and is memoized (CourtFigure.tsx, DecoratedCourtFigure.tsx are both
// React.memo'd) - it's only a many-mounts-per-second animation (a deal's ghost pool reusing a small
// number of slots across 52 cards) where the mount cost itself, not re-render cost, is the bottleneck.
//
// This script renders the REAL component (not a reimplementation of its shape-drawing logic) via
// react-dom/server, so the bitmap is pixel-derived from DecoratedCourtFigure.tsx itself and can never
// drift from it silently - only running this script (by hand, when the art changes) can make them
// diverge, and --check catches that in CI (via the source hash described above). The pipeline, in order:
//   1. esbuild bundles DecoratedCourtFigure.tsx for a plain Node process: 'react-native' is aliased to
//      react-native-web (a devDependency only - never shipped), and resolveExtensions prefers
//      '.web.js' so react-native-svg's real DOM-rendering implementation is picked over its native
//      (Fabric-module-requiring) one, which would throw outside a real RN runtime.
//   2. react-dom/server's renderToStaticMarkup renders each of the 12 (suit, rank) combinations to a
//      real SVG string - width/height chosen to match CardFace's real content-area aspect at this
//      package's documented max card width (CARD_WIDTH_MAX = 96pt @3x = 288px, see Solitaire's
//      cardLayout.ts), so the bitmap bakes in the exact preserveAspectRatio="none" stretch
//      DecoratedCourtFigure already applies at runtime - not a different one.
//   3. @resvg/resvg-js (a devDependency only - a real Rust SVG renderer, no system dependency)
//      rasterizes each SVG to PNG.
//
// A previous run of this same pipeline was cross-checked against a screenshot of the ACTUAL app
// (Solitaire's web build, a live King of Clubs on a real board, rasterized via an in-browser canvas)
// and matched pixel-for-pixel - this script's output is not a lookalike, it's the real art.
import { execSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import fs from 'node:fs'
import { createRequire } from 'node:module'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { Resvg } from '@resvg/resvg-js'

const HERE = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.join(HERE, '..')
const OUT_DIR = path.join(ROOT, 'src', 'artwork', 'courtBitmaps')
const BUNDLE_FILE = path.join(HERE, '.court-figure-bundle.cjs')
const INDEX_FILE = path.join(OUT_DIR, 'index.ts')

const SUITS = ['clubs', 'diamonds', 'hearts', 'spades']
const RANKS = ['jack', 'queen', 'king']

// CardFace's real content-area aspect at this package's documented max card width (see the file
// comment above) - keep in sync with CardSizeContext.tsx's CARD_ASPECT and CardFace.tsx's
// CORNER_ROW_FRACTION if either ever changes (a mismatch just re-bakes a slightly different stretch
// into the bitmap, not a crash - but the two should agree).
const WIDTH = 288
const CARD_ASPECT = 64 / 93
const CORNER_ROW_FRACTION = 0.39
const HEIGHT = Math.round(WIDTH * (1 / CARD_ASPECT - CORNER_ROW_FRACTION))
const RESVG_OPTIONS = { fitTo: { mode: 'width', value: WIDTH } }
const PNG_SIGNATURE = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])

function bundle() {
  execSync(
    [
      `${path.join(ROOT, 'node_modules', '.bin', 'esbuild')} ${path.join(ROOT, 'src', 'DecoratedCourtFigure.tsx')}`,
      '--bundle --format=cjs --platform=node',
      `--outfile=${BUNDLE_FILE}`,
      '--resolve-extensions=.web.tsx,.web.ts,.web.js,.tsx,.ts,.js',
      '--main-fields=browser,module,main',
      '--conditions=browser',
      '--alias:react-native=react-native-web',
      '--external:react --external:react-dom --external:react-dom/server',
      // Transitively pulled in by @rific/auto-paper's barrel (CardBack.tsx's getContrastColor import)
      // but never actually reached by DecoratedCourtFigure's own render path - just needs a loader so
      // esbuild can finish resolving the module graph.
      '--loader:.png=dataurl --loader:.ttf=dataurl --loader:.otf=dataurl',
      '--jsx=automatic',
      '--log-level=warning'
    ].join(' '),
    { cwd: ROOT, stdio: 'inherit' }
  )
}

function renderAll() {
  const req = createRequire(import.meta.url)
  const React = req('react')
  const { renderToStaticMarkup } = req('react-dom/server')
  const { DecoratedCourtFigure } = req(BUNDLE_FILE)

  const svgs = {}
  for (const suit of SUITS) {
    for (const rank of RANKS) {
      const el = React.createElement(DecoratedCourtFigure, { suit, rank, width: WIDTH, height: HEIGHT })
      const html = renderToStaticMarkup(el)
      const match = html.match(/<svg[\s\S]*<\/svg>/)
      if (!match) throw new Error(`generate-court-bitmaps: no <svg> in output for ${suit} ${rank}`)
      let svg = match[0]
      if (!svg.includes('xmlns=')) svg = svg.replace('<svg', '<svg xmlns="http://www.w3.org/2000/svg"')
      svgs[`${suit}-${rank}`] = svg
    }
  }
  return svgs
}

function rasterize(svgs) {
  const pngs = {}
  for (const [key, svg] of Object.entries(svgs)) {
    pngs[key] = new Resvg(svg, RESVG_OPTIONS).render().asPng()
  }
  return pngs
}

// Platform-independent fingerprint of everything the PNGs are rasterized FROM - see the file comment.
function sourceHash(svgs) {
  const hash = createHash('sha256')
  hash.update(JSON.stringify(RESVG_OPTIONS))
  for (const key of Object.keys(svgs).sort()) hash.update(`\n${key}\n${svgs[key]}`)
  return hash.digest('hex')
}

function buildIndexSource(svgs) {
  // require(), not a static `import`: an ES import of '*.png' needs an ambient module declaration
  // that a CONSUMING app provides for ITS OWN source (Solitaire's, via Expo/RN's generated types) but
  // this package can't assume every consumer has, and re-declaring it here would collide with theirs.
  // require() has no such dependency - untyped module specifiers resolve to `any`, which the explicit
  // `ImageSourcePropType` annotation below narrows for every real caller regardless of tsconfig.
  const suitCases = SUITS.map((suit) => `  ${suit}: {\n${RANKS.map((rank) => `    ${rank}: require('./${suit}-${rank}.png') as ImageSourcePropType`).join(',\n')}\n  }`).join(',\n')
  return `// GENERATED by scripts/generate-court-bitmaps.mjs - do not edit by hand.
// Source hash: ${sourceHash(svgs)} (the SVGs these PNGs were rasterized from, checked by --check)
import type { ImageSourcePropType } from 'react-native'

import type { Suit } from '../../types'
import type { CourtRank } from '../court'

/** A pre-rasterized bitmap for one (suit, rank) court figure - see the script's own header comment
 * for why these exist alongside the live DecoratedCourtFigure.tsx vector art. Each is a real RN
 * image asset reference (a Metro/webpack-resolved id on native, a URL on web via react-native-web's
 * asset loader) - render with a plain <Image>, e.g. DecoratedCourtFigureBitmap. */
export const courtBitmaps: Record<Suit, Record<CourtRank, ImageSourcePropType>> = {
${suitCases}
}

/** The aspect (width / height) every bitmap above was rasterized at - see the script's WIDTH/HEIGHT
 * derivation from CardFace's real content-area shape. Consumers sizing the bitmap to a different box
 * should letterbox/stretch consistently with this, not assume a square or a card's full aspect. */
export const COURT_BITMAP_ASPECT = ${(WIDTH / HEIGHT).toFixed(6)}
`
}

// The PNG's IHDR width/height, or null if the file isn't a PNG.
function pngSize(buf) {
  if (buf.length < 24 || !buf.subarray(0, 8).equals(PNG_SIGNATURE) || buf.toString('latin1', 12, 16) !== 'IHDR') return null
  return { width: buf.readUInt32BE(16), height: buf.readUInt32BE(20) }
}

function currentOutputs() {
  const files = {}
  if (!fs.existsSync(OUT_DIR)) return files
  for (const name of fs.readdirSync(OUT_DIR)) {
    files[name] = fs.readFileSync(path.join(OUT_DIR, name))
  }
  return files
}

const check = process.argv.includes('--check')

bundle()
const svgs = renderAll()
fs.rmSync(BUNDLE_FILE, { force: true })
const indexSource = Buffer.from(buildIndexSource(svgs), 'utf8')
const pngNames = Object.keys(svgs).map((key) => `${key}.png`)

if (check) {
  const current = currentOutputs()
  const problems = []
  const expectedNames = ['index.ts', ...pngNames].sort()
  const currentNames = Object.keys(current).sort()
  if (JSON.stringify(currentNames) !== JSON.stringify(expectedNames)) problems.push(`files are [${currentNames.join(', ')}], expected [${expectedNames.join(', ')}]`)
  if (!current['index.ts']?.equals(indexSource)) problems.push('index.ts (or its source hash) does not match the SVGs DecoratedCourtFigure renders today')
  for (const name of pngNames) {
    if (!current[name]) continue
    const size = pngSize(current[name])
    if (!size || size.width !== WIDTH || size.height !== HEIGHT) problems.push(`${name} is not a ${WIDTH}x${HEIGHT} PNG`)
  }
  if (problems.length > 0) {
    console.error(`src/artwork/courtBitmaps is stale - run \`node scripts/generate-court-bitmaps.mjs\`\n${problems.map((p) => `  - ${p}`).join('\n')}`)
    process.exit(1)
  }
  console.log('src/artwork/courtBitmaps is up to date')
  process.exit(0)
}

const pngs = rasterize(svgs)
const nextFiles = { 'index.ts': indexSource }
for (const [key, png] of Object.entries(pngs)) nextFiles[`${key}.png`] = png

fs.mkdirSync(OUT_DIR, { recursive: true })
for (const [name, contents] of Object.entries(nextFiles)) fs.writeFileSync(path.join(OUT_DIR, name), contents)
console.log(`wrote ${Object.keys(nextFiles).length} files to ${path.relative(ROOT, OUT_DIR)}`)
