import { render } from '@testing-library/react-native'

import { DecoratedCourtFigure } from '../DecoratedCourtFigure'
import { Suit } from '../types'

const ranks = ['jack', 'queen', 'king'] as const
const suits: Suit[] = ['clubs', 'diamonds', 'hearts', 'spades']

describe('DecoratedCourtFigure', () => {
  it.each(suits)('renders the %s king without throwing', async (suit) => {
    const { toJSON } = await render(<DecoratedCourtFigure suit={suit} rank='king' width={64} height={93} />)
    expect(toJSON()).not.toBeNull()
  })

  it.each(ranks)('renders spades %s without throwing', async (rank) => {
    const { toJSON } = await render(<DecoratedCourtFigure suit='spades' rank={rank} width={64} height={93} />)
    expect(toJSON()).not.toBeNull()
  })

  it('renders with colorOverrides without throwing', async () => {
    const { toJSON } = await render(<DecoratedCourtFigure suit='hearts' rank='queen' width={64} height={93} colorOverrides={{ inkBlack: '#F2F2F2', cardWhite: '#1A1A1A' }} />)
    expect(toJSON()).not.toBeNull()
  })
})
