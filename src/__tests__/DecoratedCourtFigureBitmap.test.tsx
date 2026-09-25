import { render } from '@testing-library/react-native'

import { DecoratedCourtFigureBitmap } from '../DecoratedCourtFigureBitmap'
import { Suit } from '../types'

const ranks = ['jack', 'queen', 'king'] as const
const suits: Suit[] = ['clubs', 'diamonds', 'hearts', 'spades']

describe('DecoratedCourtFigureBitmap', () => {
  it.each(suits)('renders the %s king without throwing', async (suit) => {
    const { toJSON } = await render(<DecoratedCourtFigureBitmap suit={suit} rank='king' width={64} height={93} />)
    expect(toJSON()).not.toBeNull()
  })

  it.each(ranks)('renders spades %s without throwing', async (rank) => {
    const { toJSON } = await render(<DecoratedCourtFigureBitmap suit='spades' rank={rank} width={64} height={93} />)
    expect(toJSON()).not.toBeNull()
  })

  it("renders an Image sized to exactly the width/height it's given (a stretch, matching DecoratedCourtFigure's own preserveAspectRatio='none')", async () => {
    const { toJSON } = await render(<DecoratedCourtFigureBitmap suit='hearts' rank='queen' width={64} height={93} />)
    const tree = toJSON()
    const node = Array.isArray(tree) ? tree[0] : tree
    expect(node?.type).toBe('Image')
    const flatStyle = Array.isArray(node?.props.style) ? Object.assign({}, ...node.props.style) : node?.props.style
    expect(flatStyle.width).toBe(64)
    expect(flatStyle.height).toBe(93)
    expect(node?.props.resizeMode).toBe('stretch')
  })
})
