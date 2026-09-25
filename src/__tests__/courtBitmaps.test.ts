import { spawnSync } from 'node:child_process'
import path from 'node:path'

const SCRIPT = path.join(__dirname, '..', '..', 'scripts', 'generate-court-bitmaps.mjs')

describe('courtBitmaps', () => {
  it('is what scripts/generate-court-bitmaps.mjs produces from DecoratedCourtFigure today (regenerate if this fails)', () => {
    const result = spawnSync(process.execPath, [SCRIPT, '--check'], { encoding: 'utf8' })
    expect(result.stderr).toBe('')
    expect(result.status).toBe(0)
  }, 30000)
})
