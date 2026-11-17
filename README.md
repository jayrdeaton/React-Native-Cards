# @tastic/cards

Reusable playing-card rendering for React Native card games: card faces, backs, court figures,
suit pips, and a full-colour illustrated "decorated" art pack, plus the shared card/suit/rank
vocabulary (including jokers) and a card-size layout context. Extracted from
[Solitaire](https://github.com/jayrdeaton)'s own card-rendering layer so a second card game can
reuse it without depending on Solitaire itself.

## What it does

- **`CardFace`**: a card's face-up content: corner rank/suit index plus a big center pip, or a
  full-colour court figure for Jack/Queen/King. Four styles (`cardStyle`, default `compact`):
  `compact` (tintable single-tone ink), `decorated` (full-colour illustrated art), `tarot`
  (compact's own layout, recolored to the Minor Arcana suits), and `numeric` (compact, with a big
  rank numeral in place of the big center pip on Ace to 10). Supports a colorless `muted` watermark
  render (e.g. an empty foundation slot's suit hint) and a dark-mode ink/face inversion
  (`invertDarkModeColors`). `bitmapCourtFigures` draws Jack/Queen/King from
  `DecoratedCourtFigureBitmap` instead of the vector art; it's ignored (the vector art is drawn)
  when the card is `muted` or inverted, or in the `tarot` or `decorated` style.
- **`CardBack`**: an original hand-drawn geometric card back (two-tone diamond weave, nested-
  diamond medallion), recolorable to any table palette and able to host a short player-tag
  monogram in the medallion.
- **`CourtFigure`**: the single-tone Jack/Queen/King silhouette `CardFace` falls back to for a
  muted court card, since the full-colour decorated art has no neutral form.
- **`SuitPip`**: a single suit glyph (heart/diamond/club/spade), tintable by the caller, with a
  `tarot` theme swapping in cups/coins/wands/swords, and an optional `outline` ring for a pip drawn
  off the card (e.g. a black spade over a dark table).
- **`suitInk` / `cardFaceColor`**: the ink a face-up card draws each suit in and the face it draws
  it on, for a given card style and dark-mode inversion, so a pip drawn elsewhere matches the cards.
- **`DecoratedCardFace` / `DecoratedCardBack` / `DecoratedCourtFigure`**: the full-colour
  illustrated deck's own card face, card back (`style`: `ornate`/`plain`), and court figure. The
  face and the court figure are selectively recolorable via `colorOverrides` (e.g. for a dark-mode
  ink inversion) without touching the rest of the baked-in palette. The back paints its design in
  `colors.cardBack`/`colors.cardBackPattern` and takes `invertDarkModeColors` like `CardBack`; it
  has no `tag` monogram.
- **`DecoratedCourtFigureBitmap`**: a pre-rendered PNG of `DecoratedCourtFigure` (`suit`, `rank`
  `'jack' | 'queen' | 'king'`, `width`, `height`), for a figure mounted and unmounted many times in
  quick succession, such as a deal animation. It bakes in the default palette only (no
  `colorOverrides`) and is rendered for cards up to 96pt wide at 3x.
- **Card vocabulary** (`types.ts`): `Suit`, `Rank`, `Color`, `Card`, plus an additive `Joker`/
  `AnyCard`/`isJoker` for games that deal jokers, and `cardColor`/`rankLabel`/`cloneCard` helpers.
  `SUITS` is `['clubs', 'diamonds', 'hearts', 'spades']` and `SUIT_SYMBOLS` maps each suit to its
  text symbol (`♣ ♦ ♥ ♠`).
- **`CardSizeContext`**: `CardSizeProvider`/`useCardSize` size every card in a screen off a single
  `width`, keeping an `aspectRatio` (defaults to `CARD_ASPECT`); `cardWidthForRow` fills a row of
  piles evenly within an available width.
- **Layout constants**, all fractions of card width, for a game laying out piles round the corner
  index `CardFace` draws:
  - `CORNER_ROW_FRACTION` (`0.39`): the height of the top corner row (rank and suit).
  - `CORNER_ROW_TOP_FRACTION` (`0.03`): the corner row's inset from the card's top edge.
  - `faceUpFanOffset(cardWidth)`: `cardWidth * (CORNER_ROW_FRACTION + 2 * CORNER_ROW_TOP_FRACTION)`
    (0.45 of the width), the vertical step a face-up tableau fan needs to clear the corner row of
    the card under it. Use the same value for anything that animates a run of cards onto a fan.
  - `RANK_INK_RIGHT_FRACTION` (about `0.5073`): how far the widest corner rank's ink (the `10`,
    stroke included) reaches from the card's left edge, so a sideways fan (a draw-3 waste) shows at
    least this much of each covered card. It's worked out from the glyph outlines and the same
    layout constants the face draws with.
- **`CARD_FONT_FAMILY`** (`'DejaVu Serif'`): the font the `decorated` style's corner ranks (A to K)
  are set in, bold. The package doesn't bundle it: an app using the `decorated` style loads DejaVu
  Serif Bold under this name (for example from the `dejavu-fonts-ttf` npm package). The other
  styles draw their ranks from glyph outlines and need no font.

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

## Install

```bash
npm install @tastic/cards
```

## Peer dependencies

- `react` >=19.0.0, `react-native` >=0.76.0
- `react-native-svg` >=15.0.0: every SVG-rendered face/back/figure/pip
- `@rific/auto-paper` >=0.8.0: `CardBack`'s player-tag monogram picks a legible ink via
  `getContrastColor`.
- `react-native-paper` >=5.0.0 and `react-native-safe-area-context` >=5.5.0: not imported by this
  package, listed because `@rific/auto-paper` needs them. Install auto-paper's other required peers
  (`@rific/core` among them) too.

## License

The code is released under the MIT License, see [LICENSE](LICENSE).

Most of the card artwork under [`src/artwork/`](src/artwork) (the pips, court figures, decorated faces, and the Ornate and Plain backs, plus the pre-rendered `courtBitmaps/`) is derived from [SVG-cards](https://github.com/htdebeer/SVG-cards), (C) 2005 David Bellot and (C) 2016, 2017 Huub de Beer, and is licensed under the [LGPL-2.1](src/artwork/LICENSE). See [NOTICE.md](src/artwork/NOTICE.md) for the full attribution, which must be kept with any distributed copy of the artwork. The diamond pip, the tarot pips, and the Geometric back are original. The package's SPDX license is `(MIT AND LGPL-2.1-only)`.
