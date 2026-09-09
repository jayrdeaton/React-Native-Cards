import { render } from '@testing-library/react-native'

import { SuitPip } from '../SuitPip'
import { Suit } from '../types'

const suits: Suit[] = ['clubs', 'diamonds', 'hearts', 'spades']

describe('SuitPip', () => {
  it.each(suits)('renders the standard %s pip without throwing', async (suit) => {
    const { toJSON } = await render(<SuitPip suit={suit} color='#000000' size={32} />)
    expect(toJSON()).not.toBeNull()
  })

  it('renders a diamond with edgeFill without throwing', async () => {
    const { toJSON } = await render(<SuitPip suit='diamonds' color='#C41E3A' size={32} edgeFill />)
    expect(toJSON()).not.toBeNull()
  })

  it.each(suits)('renders the tarot %s pip without throwing', async (suit) => {
    const { toJSON } = await render(<SuitPip suit={suit} color='#000000' size={32} theme='tarot' />)
    expect(toJSON()).not.toBeNull()
  })
})
