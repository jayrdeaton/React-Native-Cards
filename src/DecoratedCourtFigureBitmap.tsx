import React from 'react'
import { Image } from 'react-native'

import { CourtRank } from './artwork/court'
import { courtBitmaps } from './artwork/courtBitmaps'
import { Suit } from './types'

interface DecoratedCourtFigureBitmapProps {
  suit: Suit
  rank: CourtRank
  width: number
  height: number
}

/**
 * A pre-rasterized stand-in for DecoratedCourtFigure, pixel-derived from it (see
 * scripts/generate-court-bitmaps.mjs) rather than a hand-drawn lookalike. Use this in place of
 * DecoratedCourtFigure specifically where a court figure is mounted and unmounted many times in
 * quick succession - a card deal's ghost pool, a fast-finish/win-sweep flight layer - never as a
 * blanket replacement: DecoratedCourtFigure is a React.memo'd live vector tree that costs nothing on
 * a re-render and nothing extra once a settled board has mounted it, and it scales to any size and
 * any colorOverrides (dark-mode invert, a tarot palette). This bitmap is fixed-resolution (rasterized
 * at COURT_BITMAP_ASPECT, sized for this package's documented max card width - 96pt @3x = 288px, see
 * Solitaire's cardLayout.ts) and bakes in the DEFAULT palette only - it has no `colorOverrides` prop,
 * on purpose, so a caller can't reach for it and silently lose dark-mode-invert or tarot recoloring.
 * `resizeMode='stretch'` matches DecoratedCourtFigure's own `preserveAspectRatio="none"` - the same
 * non-uniform stretch, not a different one, so swapping between the two mid-animation (a deal ghost
 * handing off to the real, settled DecoratedCourtFigure underneath it) shows no seam. Deliberately laid
 * out IN FLOW, no `position: 'absolute'` - CardFace's `courtFigureWrap` (the parent this renders into)
 * has no explicit height of its own; it sizes itself from this component's normal box, exactly like it
 * does from DecoratedCourtFigure's plain (non-absolute) <Svg>. An earlier version of this component set
 * `position: 'absolute'` on the Image, which pulled it out of flow and collapsed courtFigureWrap to
 * zero height - a real, confirmed layout bug regardless of whether it's the whole explanation for any
 * given visual report; fixed here to match DecoratedCourtFigure's own layout behavior exactly.
 */
export const DecoratedCourtFigureBitmap = React.memo(function DecoratedCourtFigureBitmap({ suit, rank, width, height }: DecoratedCourtFigureBitmapProps) {
  return <Image source={courtBitmaps[suit][rank]} style={{ width, height }} resizeMode='stretch' />
})
