import { render } from '@testing-library/react-native'

import { DecoratedCardFace } from '../DecoratedCardFace'
import { Card } from '../types'

const ace: Card = { id: 'clubs-1-0', suit: 'clubs', rank: 1, faceUp: true }
const king: Card = { id: 'spades-13-0', suit: 'spades', rank: 13, faceUp: true }
const queen: Card = { id: 'hearts-12-0', suit: 'hearts', rank: 12, faceUp: true }
const jack: Card = { id: 'diamonds-11-0', suit: 'diamonds', rank: 11, faceUp: true }

describe('DecoratedCardFace', () => {
  it('renders a numbered card without throwing', async () => {
    const { toJSON } = await render(<DecoratedCardFace card={ace} width={64} height={93} />)
    expect(toJSON()).not.toBeNull()
  })

  it.each([king, queen, jack])('renders a court card ($suit) without throwing', async (card) => {
    const { toJSON } = await render(<DecoratedCardFace card={card} width={64} height={93} />)
    expect(toJSON()).not.toBeNull()
  })

  it('renders a muted watermark without throwing', async () => {
    const { toJSON } = await render(<DecoratedCardFace card={king} width={64} height={93} ink='#1A1A1A' opacity={0.35} />)
    expect(toJSON()).not.toBeNull()
  })

  it('renders with colorOverrides without throwing', async () => {
    const { toJSON } = await render(<DecoratedCardFace card={queen} width={64} height={93} colorOverrides={{ inkBlack: '#F2F2F2', cardWhite: '#1A1A1A' }} />)
    expect(toJSON()).not.toBeNull()
  })
})
