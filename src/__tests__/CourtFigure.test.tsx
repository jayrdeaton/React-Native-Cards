import { render } from '@testing-library/react-native'

import { CourtFigure } from '../CourtFigure'

const ranks = ['jack', 'queen', 'king'] as const

describe('CourtFigure', () => {
  it.each(ranks)('renders the %s silhouette without throwing', async (rank) => {
    const { toJSON } = await render(<CourtFigure rank={rank} color='#1A1A1A' width={64} height={93} />)
    expect(toJSON()).not.toBeNull()
  })
})
