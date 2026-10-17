import { tarotInk } from './artwork/tarotPips'
import { TableColors } from './colors'
import { cardColor, Suit } from './types'

/** The card styles CardFace draws (see its `cardStyle` prop). */
export type CardStyle = 'compact' | 'decorated' | 'tarot' | 'numeric'

export interface FaceInkOptions {
  cardStyle?: CardStyle
  /** CardFace's own `invertDarkModeColors`: flips black ink and the face, never red or tarot ink. */
  invertDarkModeColors?: boolean
}

/** The ink a face-up CardFace draws `suit` in (its corner pip, big pip and rank), so a pip drawn anywhere else (e.g. a celebration over the felt) can
 * match the cards on the table exactly. Tarot draws each suit in its own ink; otherwise red suits are `textRed` and black suits `textBlack`, or
 * `textBlackInverted` under `invertDarkModeColors`. The `decorated` style draws its own baked art, whose inks are close to but not exactly these. */
export function suitInk(suit: Suit, colors: TableColors, { cardStyle, invertDarkModeColors }: FaceInkOptions = {}): string {
  if (cardStyle === 'tarot') return tarotInk[suit]
  if (cardColor(suit) === 'red') return colors.textRed
  return invertDarkModeColors ? colors.textBlackInverted : colors.textBlack
}

/** The background a face-up CardFace is drawn on: white, or `cardFaceInverted` under `invertDarkModeColors`. */
export function cardFaceColor(colors: TableColors, invertDarkModeColors?: boolean): string {
  return invertDarkModeColors ? colors.cardFaceInverted : '#FFFFFF'
}
