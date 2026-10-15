# @tastic/cards

Reusable playing-card rendering for React Native card games: card faces, backs, court figures,
suit pips, and a full-colour illustrated "decorated" art pack, plus the shared card/suit/rank
vocabulary (including jokers) and a card-size layout context. Extracted from
[Solitaire](https://github.com/jayrdeaton)'s own card-rendering layer so a second card game can
reuse it without depending on Solitaire itself.

## What it does

- **`CardFace`**: a card's face-up content: corner rank/suit index plus a big center pip, or a
  full-colour court figure for Jack/Queen/King. Three styles: `compact` (tintable single-tone
  ink), `decorated` (full-colour illustrated art), and `tarot` (compact's own layout, recolored to
  the Minor Arcana suits). Supports a colorless `muted` watermark render (e.g. an empty foundation
  slot's suit hint) and a dark-mode ink/face inversion.
- **`CardBack`**: an original hand-drawn geometric card back (two-tone diamond weave, nested-
  diamond medallion), recolorable to any table palette and able to host a short player-tag
  monogram in the medallion.
- **`CourtFigure`**: the single-tone Jack/Queen/King silhouette `CardFace` falls back to for a
  muted court card, since the full-colour decorated art has no neutral form.
- **`SuitPip`**: a single suit glyph (heart/diamond/club/spade), tintable by the caller, with a
  `tarot` theme swapping in cups/coins/wands/swords.
- **`DecoratedCardFace` / `DecoratedCardBack` / `DecoratedCourtFigure`**: the full-colour
  illustrated deck's own card face, card back (`ornate`/`plain`), and court figure, each
  selectively recolorable via `colorOverrides` (e.g. for a dark-mode ink inversion) without
  touching the rest of the baked-in palette.
- **Card vocabulary** (`types.ts`): `Suit`, `Rank`, `Color`, `Card`, plus an additive `Joker`/
  `AnyCard`/`isJoker` for games that deal jokers, and `cardColor`/`rankLabel`/`cloneCard` helpers.
- **`CardSizeContext`**: `CardSizeProvider`/`useCardSize` size every card in a screen off a single
  `width`, keeping an `aspectRatio` (defaults to `CARD_ASPECT`); `cardWidthForRow` fills a row of
  piles evenly within an available width.

## Usage

```tsx
import { CardBack, CardFace, CardSizeProvider, useCardSize, type Card, type TableColors } from '@tastic/cards'

function Hand({ card, colors }: { card: Card; colors: TableColors }) {
  const { width, height } = useCardSize()
  return card.faceUp ? <CardFace card={card} colors={colors} width={width} height={height} /> : <CardBack colors={colors} width={width} height={height} />
}

function Table({ colors }: { colors: TableColors }) {
  return (
    <CardSizeProvider width={64}>
      {/* every card within here sizes off that one width, at CARD_ASPECT's ratio */}
    </CardSizeProvider>
  )
}
```

`colors` is any object matching the `TableColors` interface: this package renders whatever
palette it's handed, it doesn't own or derive one itself.

## Install (local dev via yalc)

Not installed from the registry by consuming apps during development; it's linked via yalc, same as
`@rific/updater` is in this author's other projects:

```bash
npm run build && yalc publish   # from this package
cd ../your-game && yalc add @tastic/cards && npm install
```

Re-run `npm run build && yalc push` after any change to propagate it to every linked consumer.

## Peer dependencies

- `react` >=19.0.0, `react-native` >=0.76.0
- `react-native-svg` >=15.0.0: every SVG-rendered face/back/figure/pip
- `@rific/auto-paper` >=0.8.0: `CardBack`'s player-tag monogram picks a legible ink via
  `getContrastColor`. Its own peers (`@rific/core`, `react-native-paper`,
  `react-native-safe-area-context`) come with it.

## License

The code is released under the MIT License, see [LICENSE](LICENSE).

Most of the card artwork under [`src/artwork/`](src/artwork) (the pips, court figures, decorated faces, and the Ornate and Plain backs, plus the pre-rendered `courtBitmaps/`) is derived from [SVG-cards](https://github.com/htdebeer/SVG-cards), (C) 2005 David Bellot and (C) 2016, 2017 Huub de Beer, and is licensed under the [LGPL-2.1](src/artwork/LICENSE). See [NOTICE.md](src/artwork/NOTICE.md) for the full attribution, which must be kept with any distributed copy of the artwork. The diamond pip, the tarot pips, and the Geometric back are original. The package's SPDX license is `(MIT AND LGPL-2.1-only)`.
