// Regenerates src/artwork/court.ts from the vendored SVG-cards sheet (scripts/svg-cards/svg-cards.svg,
// LGPL-2.1 - see src/artwork/NOTICE.md and LICENSE).
//
//   node scripts/generate-court-silhouette.mjs           # rewrite src/artwork/court.ts
//   node scripts/generate-court-silhouette.mjs --check   # exit 1 if it is stale (run by the tests)
//
// Unlike generate-card-artwork.mjs (the full-colour "decorated" deck), this produces the
// "compact" style's single-colour court silhouette: one shape per rank, shared across all four
// suits and tinted red/black by the caller (see CourtFigure.tsx), the same contract as the suit
// pips in pips.ts. COURT_SOURCE below picks a single suit's figure per rank, arbitrarily (the
// output is suit-agnostic), and every one of its paths is filled with one colour so the
// individually-coloured costume/body regions merge into a single outline.
//
// The source deck draws each figure's body ONLY ONCE (e.g. "king_1"), then places it on the card
// via two <use> references - one upright, one rotated 180 degrees for the card's other half - and
// relies on their overlap to read as one complete figure: some regions (confirmed by rendering,
// e.g. the collar/chest area right where the sash crosses) are only covered by one placement's
// paths, not both, so using just one <use> leaves real gaps, not merely a duplicated head. This
// script instead uses BOTH real <use> transforms from the sheet - the upright one for the whole
// figure, and the other one (which contributes the gap-filling overlap, but also carries its own
// second head/body further down the card) clipped to the upright copy's own bounding box, so only
// its contribution to the shared figure is kept.
import path from 'node:path'

import { ARTWORK_DIR, boundingBox, collectDrawable, findBodyPlacements, findGroupById, formatWithPrettier, loadSheet, pathNumbers, run, transformPathData, writeOrCheck } from './lib/svgCards.mjs'

const OUT_FILE = path.join(ARTWORK_DIR, 'court.ts')

// rank -> { cardId: the <suit>_<rank> card whose two <use> placements we read transforms from,
//           bodyId: that card's body-art id (see generate-court-figures.mjs's BODY_VARIANT for
//           the id scheme) }. Picked for cleanest source content - no polygon-only figures - not
// for any suit-consistency reason, since the output is suit-agnostic.
const COURT_SOURCE = {
  king: { cardId: 'spade_king', bodyId: 'king_1' },
  queen: { cardId: 'heart_queen', bodyId: 'queen_1' },
  jack: { cardId: 'club_jack', bodyId: 'jack_4' }
}

function polylineToPathData(points) {
  const pairs = points
    .trim()
    .split(/\s+/)
    .map((pair) => pair.split(',').map(Number))
  return 'M' + pairs.map(([x, y]) => `${x},${y}`).join('L')
}

/** Keeps only the overlap copy's shapes that land ENTIRELY within the upright copy's own bounding
 * box - a coarse per-shape clip (not true geometric clipping against the upright figure's actual
 * silhouette), but enough here: the overlap only needs to contribute small gap-filling regions
 * (e.g. under the sash), while its own head/body are large shapes that inherently extend well
 * outside that box and get dropped whole rather than leaking a partially-clipped fragment in. */
function keepPathsWithinRect(paths, [rx0, ry0, rx1, ry1]) {
  return paths.filter((d) => {
    const [x0, y0, x1, y1] = boundingBox(pathNumbers(d))
    return x0 >= rx0 && x1 <= rx1 && y0 >= ry0 && y1 <= ry1
  })
}

async function main() {
  const root = await loadSheet()

  const entries = []
  for (const [rank, { cardId, bodyId }] of Object.entries(COURT_SOURCE)) {
    const cardGroup = findGroupById(root, cardId)
    if (!cardGroup) throw new Error(`missing card group: ${cardId}`)
    const bodyGroup = findGroupById(root, bodyId)
    if (!bodyGroup) throw new Error(`missing body group: ${bodyId}`)

    const [upright, overlap] = findBodyPlacements(cardGroup, bodyId)
    // The silhouette's own placements are plain scale+translate - its bounding-box clip below
    // assumes no rotation, unlike generate-court-figures.mjs's sash, which is genuinely rotated.
    for (const [, b, c] of [upright, overlap]) {
      if (b !== 0 || c !== 0) throw new Error(`<use> of #${bodyId} is rotated/skewed, expected a plain scale+translate matrix()`)
    }

    const drawable = collectDrawable(bodyGroup, ['path', 'polyline'])
    const rawPaths = drawable.map((n) => (n.name === 'polyline' ? polylineToPathData(n.attributes.points) : n.attributes.d))

    const uprightPaths = rawPaths.map((d) => transformPathData(d, upright))
    const uprightBbox = boundingBox(uprightPaths.flatMap(pathNumbers))

    const overlapPaths = keepPathsWithinRect(
      rawPaths.map((d) => transformPathData(d, overlap)),
      uprightBbox
    )

    const paths = [...uprightPaths, ...overlapPaths]
    const PAD = 10
    const [x0, y0, x1, y1] = uprightBbox
    const viewBox = [x0 - PAD, y0 - PAD, x1 - x0 + 2 * PAD, y1 - y0 + 2 * PAD]

    entries.push(`  ${rank}: {\n    viewBox: [${viewBox.join(', ')}],\n    paths: [\n${paths.map((d) => `      '${d}',`).join('\n')}\n    ],\n  },`)
  }

  const content = `import type { OutlineArt } from './types';

export type CourtRank = 'jack' | 'queen' | 'king';

// AUTO-GENERATED by scripts/generate-court-silhouette.mjs from SVG-cards
// (https://github.com/htdebeer/SVG-cards), LGPL-2.1 - see NOTICE.md and LICENSE for attribution.
// Do not hand-edit; regenerate with: node scripts/generate-court-silhouette.mjs
export const courtArt: Record<CourtRank, OutlineArt> = {
${entries.join('\n')}
};
`

  writeOrCheck('generate-court-silhouette.mjs', { [OUT_FILE]: await formatWithPrettier(OUT_FILE, content) })
}

run(main)
