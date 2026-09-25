# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

# @tastic/cards

Standalone npm package. Reusable playing-card rendering for React Native card games: card faces,
backs, court figures, suit pips, and a full-colour illustrated "decorated" art pack, plus the
shared card/suit/rank vocabulary (including jokers) and a card-size layout context.

Published under the `tastic` npm org — game-specific rendering, as opposed to `@rific`'s generic
React Native tooling. Extracted from [Solitaire](https://github.com/jayrdeaton)'s own
`src/components/cards/` layer so a second card game can reuse the same card rendering without
depending on Solitaire itself or duplicating its (sizeable) generated SVG art data. This package
owns no game rules, no table/theme palette, and no board layout — just a card's own rendering and
the card/suit/rank vocabulary every game needs to describe one.

## Commands

```bash
npm run lint       # ESLint + Prettier check (@infinitetoken/eslint-config/react-native preset)
npm run fix        # Auto-fix lint/format issues
npm run typecheck  # TypeScript type check (tsc --noEmit)
npm test           # Run all Jest tests
npm run test:watch # Jest --watchAll
npm run build      # tsup, config via tsup.config.cjs -> @infinitetoken/tsconfig/tsup/lib preset
npm run build:watch
npm run verify     # lint && test && typecheck && build — also runs via `preversion` (see Release)
node scripts/generate-rank-glyphs.mjs   # regenerate src/rankGlyphs.ts from the vendored DejaVu Serif Bold (see below)
```

Always run `npm run lint` before finishing any task.

## Release

```bash
npm run release:patch   # or release:minor / release:major
```

Each `release:*` script runs `npm version <bump>` (bumps `package.json`, commits, creates a `vX.Y.Z`
git tag) then `npm run release` (`git push --follow-tags`). `preversion` runs the full `verify` chain
first, so a broken lint/test/typecheck/build blocks the version bump.

Pushing the tag triggers the `publish` GitHub Action (`.github/workflows/publish.yml`, calling the
shared `infinitetoken/Workflows/.github/workflows/npm-publish.yml@v1`), which runs `npm publish`.
Not yet published — `version` starts at `0.1.0` and no `release:*` has run yet.

## Local development (yalc)

Not installed from the registry by consuming apps during development — linked via yalc, same as
`@rific/updater` is in this author's other projects:

```bash
npm run build && yalc publish   # from this package
cd ../your-game && yalc add @tastic/cards && npm install
```

Re-run `npm run build && yalc push` after any change to propagate it to every linked consumer.

## Code Style

Enforced by ESLint + Prettier — run the linter before finishing any task.

**Prettier config:**
- Single quotes, JSX single quotes
- No semicolons
- No trailing commas
- Print width: 1000 (effectively disabled)

**ESLint rules (warnings):**
- `simple-import-sort` — imports and exports must be sorted
- `react-native/no-inline-styles` — no inline style objects
- `react-native/no-unused-styles` — no unused StyleSheet entries
- `no-console` — no console statements

## Architecture

### Source files (`src/`)

| File | Purpose |
|---|---|
| `types.ts` | The card vocabulary: `Suit`/`Rank`/`Color`/`Card`/`SUITS`/`SUIT_SYMBOLS`/`cardColor`/`rankLabel` re-exported unchanged from Solitaire's own `engine/types.ts`, plus an additive `Joker`/`AnyCard`/`isJoker`, and `cloneCard` widened to a generic over `Card \| Joker` (a strict superset of Solitaire's original `Card`-only signature). |
| `colors.ts` | Just the `TableColors` interface — no palette, no derivation logic. This package renders whatever palette it's handed; a consuming app owns picking/deriving one (Solitaire's own `theme.ts` is a worked example, not part of this package). |
| `CardSizeContext.tsx` | `CardSizeProvider`/`useCardSize`/`cardWidthForRow`. `CardSizeProvider` takes an `aspectRatio` prop (defaults to `CARD_ASPECT`, Solitaire's own 64/93 standard-deck ratio) instead of importing fixed `CARD_WIDTH`/`CARD_HEIGHT` from an app-owned theme — this is what lets a consumer with different card proportions (e.g. a taller tarot-only deck) size its own board without forking this file. Deliberately does not carry Solitaire's `FACE_UP_OFFSET_RATIO`/`FACE_DOWN_OFFSET_RATIO` — those tune a tableau's own fan-stacking overlap, not a property of a card itself. |
| `fonts.ts` | `CARD_FONT_FAMILY` (`'DejaVu Serif'`) — the font every generated decorated-mode rank-corner text glyph is baked to expect (`fontWeight: 'bold'`, see `artwork/decoratedCustom`'s generation script comments). A consuming app is responsible for actually loading this font (e.g. via `expo-font` + `dejavu-fonts-ttf`, as Solitaire's own `useFontsPreload` does) — this package only names it. |
| `CardFace.tsx` | Face-up card content: corner rank/suit index plus a big center pip, or a court figure for Jack/Queen/King. `compact` (tintable single-tone ink, this file's own rendering), `decorated` (delegates whole-card to `DecoratedCardFace`), and `tarot` (compact's own layout, recolored to the Minor Arcana suits via `tarotInk`) styles; a colorless `muted` watermark render; a dark-mode ink/face inversion. Exports `CORNER_ROW_FRACTION` (0.39)/`CORNER_ROW_TOP_FRACTION` (0.03)/`faceUpFanOffset` (0.45 x width) so a consumer's own tableau-fan layout can clear the corner row by an exact, non-guessed margin. The corner row's every measure (rank Svg left, pip right, row top/height) is a pure fraction of card width - no absolute-point offsets. |
| `RankGlyph.tsx` / `rankGlyphs.ts` | The corner rank of `compact`/`numeric`/`tarot`, drawn from glyph OUTLINES rather than a `<Text>`: DejaVu Serif Bold at 0.37W with a faux-bold stroke (0.035em, round joins, in the ink colour), which RN's `Text` can't do, and which also makes the rank independent of font loading and identical on every platform. Two native views (Svg + Path). Each rank's Svg viewBox centres that rank's INK (not its font box, which sits high for digits/A/K and low for J/Q) on the row's centre, i.e. the suit pip's centre; horizontally every rank is centred in one fixed 0.46W box (so the pip never moves with it) except that the box is placed so the '10''s ink starts at 0.062W from the card's left edge at every width. `rankGlyphs.ts` is GENERATED (never edit it) by `scripts/generate-rank-glyphs.mjs` from `scripts/fonts/DejaVuSerif-Bold.ttf` (vendored with its licence, not shipped; `opentype.js` is a devDependency for it only) - the 13 outlines, y-down font units, contours closed with Z (so the stroke joins at the start point), plus the font size / letter-spacing fractions the '10' layout is baked with. The Svg is wider than the box (padded) because the '10''s ink overshoots the box and native Svgs can clip. **The Svg's size is whole points, rounded UP (`rankSvgSize`), with a viewBox built for exactly that box at the designed scale** - react-native-svg's root `Svg` truncates a fractional `width`/`height` with `parseInt` (its `Svg.tsx`, both native platforms; RNSVGSvgView.mm/SvgView.java then fit the viewBox into that truncated box, `bbWidth`/`bbHeight` only matter for a nested Svg), so a fractional size drew the whole rank at `floor(w)/w` of its scale (0.916x at a 28pt card, and the '10' ink-left wandered 0.058W-0.073W) - web and jest keep the fractions and never show it, which is why `CornerRank.test.tsx` models the truncation. Extra width is added on the right (ink x unchanged) and extra height symmetrically (the row's `alignItems: 'center'` - unclamped in Yoga - keeps the ink centred). **Accessibility:** the rank used to be a `Text`; the Svg is `accessible` + `accessibilityRole='image'` + `accessibilityLabel` on native and `role='img'` + `aria-label` on web (`Platform.select` - react-native-web would put `accessible` on the DOM and React warns about the non-boolean attribute). `RANK_INK_RIGHT_FRACTION` (~0.5073W, the '10', half the stroke included) is exported for a layout that shows only the left strip of covered cards (draw-3 waste fan): `faceUpFanOffset` (0.45W) clips the '0'. The big numeral of `numeric` style is still a `Text` in `CARD_FONT_FAMILY`. |
| `CardBack.tsx` | An original hand-drawn geometric card back (two-tone diamond weave, nested-diamond medallion) — not derived from the SVG-cards sheet, unlike `DecoratedCardBack`. Recolorable to any `TableColors`, and can host a short player-tag monogram in the medallion. Exports `MARGIN_FRACTION`, the sheet-matched card-wide margin every `Decorated*` sibling reuses for its own inset. |
| `CourtFigure.tsx` | The single-tone Jack/Queen/King silhouette `CardFace` falls back to for a *muted* court card — the full-colour decorated art (`DecoratedCourtFigure`) has no neutral/tintable form. |
| `SuitPip.tsx` | A single suit glyph (heart/diamond/club/spade), tinted by the caller. `theme: 'tarot'` swaps in `artwork/tarotPips`' cups/coins/wands/swords instead of the standard four. |
| `DecoratedCardBack.tsx` / `DecoratedCardFace.tsx` / `DecoratedCourtFigure.tsx` | The full-colour illustrated "decorated" style's own card back (`ornate`/`plain`), whole card face, and court figure — each built from `artwork/decoratedCustom/`'s pre-flattened shape data via `DecoratedShapeRenderer`, and each selectively recolorable via `colorOverrides` (e.g. the "invert dark mode colors" setting) without touching the rest of the baked-in palette. |
| `DecoratedShapeRenderer.tsx` | Renders a `DecoratedShape` tree (see `artwork/types.ts`) as plain `react-native-svg` elements — no runtime XML parsing, no `<use>`. Shared by every `Decorated*` component above. |
| `index.ts` | Public exports (see Public API below). |
| `artwork/` | Raw art data: `types.ts` (the `OutlineArt`/`DecoratedShape`/`DecoratedArt`/`BackArt` shape vocabulary), `pips.ts`/`court.ts`/`backs.ts` (SVG-cards-derived, LGPL-2.1 — see `NOTICE.md`/`LICENSE`), `tarotPips.ts` (hand-authored, original), and `decoratedCustom/` (the full-colour illustrated pack, colors relabeled to named constants so callers can override them — see `colors.ts`'s `buildColorOverrideMap`). |

### Why `artwork/decorated/` wasn't copied

Solitaire has two illustrated-pack directories: `artwork/decoratedCustom/` (real colour-relabeled
data, actually imported by `DecoratedCardFace`/`DecoratedCourtFigure`) and `artwork/decorated/` (its
un-relabeled source, kept in Solitaire only as a fallback reference for regenerating the custom
pack — confirmed to have zero runtime importers anywhere in that app). Only `decoratedCustom/` does
any real work here, so only it was copied; regenerating a relabeled pack from scratch is a
build-time script concern, not something this runtime package needs to carry.

### Why `Joker`/`AnyCard` are additive, not a `Card` change

Solitaire's four games never deal jokers, so `Card`'s own `suit`/`rank` stay exactly as Solitaire
defines them (`suit: Suit`, `rank: Rank` — no `'joker'`/`null` widening). A second game that *does*
deal jokers describes its hand as `AnyCard[]` and narrows with `isJoker()`; a plain `Card[]` consumer
(Solitaire's own four games, ported onto this package in a later step) never sees `'joker'` as a
possible `suit` value at all. `cloneCard` is generic over `Card | Joker` rather than two separate
overloads, since a single `<T extends Card | Joker>(card: T): T` signature already covers both
call shapes with no behavior change for existing `Card`-only callers.

## Public API

The complete `src/index.ts` export list:

```ts
export { CardFace, CORNER_ROW_FRACTION, CORNER_ROW_TOP_FRACTION, faceUpFanOffset } from './CardFace'
export { CardBack } from './CardBack'
export { CourtFigure } from './CourtFigure'
export { SuitPip } from './SuitPip'
export { DecoratedCardBack } from './DecoratedCardBack'
export { DecoratedCardFace } from './DecoratedCardFace'
export { DecoratedCourtFigure } from './DecoratedCourtFigure'
export type { Suit, Rank, Color, Card, Joker, AnyCard } from './types'
export { SUITS, SUIT_SYMBOLS, cardColor, rankLabel, cloneCard, isJoker } from './types'
export type { TableColors } from './colors'
export { CardSizeProvider, useCardSize, CARD_ASPECT, cardWidthForRow } from './CardSizeContext'
export { CARD_FONT_FAMILY } from './fonts'
export { RANK_INK_RIGHT_FRACTION } from './RankGlyph'
```

None of the component prop-type interfaces (`CardFaceProps`, `CardBackProps`, etc.) are exported
here — none of them are exported from their own source files either (all local, unlike this
package's own hooks/context, which do export their prop/state shapes). `DecoratedShapeRenderer`'s
`renderDecoratedShape` and every `artwork/` type (`OutlineArt`, `DecoratedShape`, `DecoratedArt`,
`BackArt`, `CourtRank`, `DecoratedPackColors`) are deliberately NOT re-exported either — they're
internal wiring the `Decorated*`/`CourtFigure`/`SuitPip` components import directly; consumers only
ever render the finished components.

## Peer Dependencies

- `react` >=19.0.0, `react-native` >=0.76.0
- `react-native-svg` >=15.0.0 — every SVG-rendered face/back/figure/pip (`CardBack`, `CourtFigure`,
  `SuitPip`, every `Decorated*` component, `DecoratedShapeRenderer`)
- `react-native-paper` >=5.0.0, `react-native-safe-area-context` >=5.5.0 — not used by this
  package's own code at all, but required transitively: `@rific/auto-paper` declares both as its
  own required peers (not optional — only its `expo-blur`/`expo-navigation-bar` peers are), and its
  real published `dist`/`react-native`-conditioned entry unconditionally pulls in every Paper-wrapped
  component it exports alongside `getContrastColor` (the only export `CardBack.tsx` actually uses).
  Not part of the original spec for this package — surfaced as real `tsc`/Metro-resolution failures
  once `@rific/auto-paper` was wired in as a regular dependency, the same category of gap Solitaire's
  own CLAUDE.md documents for `@shopify/react-native-skia` and `@tastic/hud`'s barrel.

Regular (non-peer) dependency: `@rific/auto-paper` — `CardBack`'s player-tag monogram picks a
legible ink via `getContrastColor`.

No `react-native-reanimated`, no `react-native-gesture-handler`.

## Testing

- **Framework:** Jest, configured through the shared `@infinitetoken/jest-config/react-native`
  preset (jsdom environment; ts-jest transform under the hood, resolved transitively through the
  preset — not a direct devDependency here) + `@testing-library/react-native`'s `render` (not
  `@testing-library/react`, unlike `@tastic/split-screen` — this package renders actual
  `react-native`/`react-native-svg` component trees, which `@testing-library/react-native`'s own
  `test-renderer`-backed renderer walks directly, rather than DOM-shaped content). `test-renderer`
  (a modern, React-19-compatible replacement for the deprecated `react-test-renderer`, published by
  the `@testing-library/react-native` maintainer) is a required peer of `@testing-library/react-native`
  itself — `render()` calls straight into it — so it's a devDependency here too, alongside the
  `react-native`/`react-native-svg` mocks below.
- **Location:** `src/__tests__/*.test.ts` and `*.test.tsx`
- **Corner-rank tests:** `CornerRank.test.tsx` renders every rank x suit x style (compact/numeric/tarot) at card widths 28/28.2/34/50.571/64/96 (plus a 0.37pt sweep from 28 to 96 for a handful of ranks) and reads the ink boxes back off the rendered props + the generated outline table, through a model of react-native-svg's native `parseInt` truncation (rank ink centre == pip centre within 0.002W, J/Q ink clear of the 0.45W strip by 0.02W, '10' ink-left 0.062W and >= 0.10W from the pip, drawn at exactly the designed scale, `faceUpFanOffset(1) === 0.45`), the native/web accessibility props, and `RANK_INK_RIGHT_FRACTION` against the rendered '10'. `rankGlyphs.test.ts` (node environment) checks the table against the vendored font with opentype.js and runs `scripts/generate-rank-glyphs.mjs --check` (fails if `src/rankGlyphs.ts` is stale).
- **Mocks:** `src/__mocks__/`:
  - `react-native` — `StyleSheet.create`/`flatten` as identity functions (this package never
    measures a ref or reads `useWindowDimensions`, unlike `@tastic/split-screen`'s own richer mock);
    `View`/`Text` as plain **string** element types, not function-component passthroughs;
    `Platform` (`OS` mutable so a test can render as `'web'`, and `select`).
  - `react-native-svg` — `Svg` default export plus `G`/`Path`/`Rect`/`Circle`/`Line`/`Polygon`/
    `Polyline`/`Defs`/`ClipPath`/`Text`, every one also a plain string element type. No existing
    template for this mock anywhere else in the fleet, since no other package renders real SVG
    under a mocked-native jsdom setup.
  - `@rific/auto-paper` — not a native module, but its real published `dist` pulls in
    `react-native-paper`'s whole theme engine at module-evaluation time (its barrel unconditionally
    exports Paper-wrapped components alongside `getContrastColor`, the only thing `CardBack.tsx`
    actually imports), and `react-native-paper`'s own theme tokens call real native APIs
    (`Platform.select`) this package's minimal `react-native` mock doesn't provide. Mocked with a
    real (not stubbed-out) WCAG-style relative-luminance implementation of `getContrastColor`, so
    `CardBack`'s monogram rendering stays meaningful under test. Not part of the original spec for
    this package — added once `npm test` actually crashed on it; see the top of this file's history
    for the full reasoning if it resurfaces after a `@rific/auto-paper` upgrade.

  All three mocks use plain **string** element/return types rather than function-component
  passthroughs (an earlier draft used passthroughs and looked reasonable until real coverage numbers
  came back near-zero) — `@testing-library/react-native`'s `render` walks the tree via the
  `test-renderer` package, which (like the classic `react-test-renderer` it replaces) only
  represents string-typed ("host") elements in its own `.toJSON()` output. A function component is
  never itself a host node, only whatever it goes on to render is — so a leaf with no children of
  its own (an SVG `Path`/`Rect`/etc., which most of this package's art bottoms out in) would
  disappear from the rendered tree entirely instead of showing up as an empty node, and a whole card
  built from nothing but such leaves (no rank/suit text anywhere, e.g. a plain no-tag `CardBack` or
  any pure-SVG-shape `Decorated*` figure) would render to a `null` tree and fail even a bare
  "did this throw" assertion that also checks the result isn't empty.
- Tests cover the pure card/size helpers (`cardColor`, `rankLabel`, `cloneCard`, `isJoker`,
  `cardWidthForRow`) and a component smoke test per component (`CardFace`, `CardBack`, `SuitPip`,
  `CourtFigure`, `DecoratedCardFace`, `DecoratedCardBack`, `DecoratedCourtFigure`) exercising each
  component's real prop-driven branches (muted, `cardStyle` variants, `invertDarkModeColors`,
  `edgeFill`, `colorOverrides`, both `DecoratedCardBack` styles, every suit/court-rank combination)
  rather than a single bare render per component — `artwork/`'s generated shape data covers most of
  its own `DecoratedShape` tag variants (`g`/`path`/`circle`/`rect`/`line`/`polygon`/`polyline`/
  `text`) just by being imported and rendered through those cases, so this also keeps
  `DecoratedShapeRenderer`'s own switch meaningfully covered without a dedicated unit test file for
  it.
- **Current:** 10 suites / 119 tests, all passing. Coverage: 98.45% stmts / 96.47% branches / 92.68%
  funcs / 99.01% lines — clears the shared preset's 70%/70%/70%/70% default on every metric (every
  `artwork/` data file included, since `collectCoverageFrom` scopes to all of `src/**/*.{ts,tsx}`),
  so `jest.config.cjs` carries no local `coverageThreshold` override.
- When adding new component prop or card-vocabulary behavior, add a corresponding test case.
