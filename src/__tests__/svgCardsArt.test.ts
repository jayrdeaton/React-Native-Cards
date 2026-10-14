/**
 * @jest-environment node
 */
import { spawnSync } from 'node:child_process'
import path from 'node:path'

const SCRIPTS = ['generate-card-artwork.mjs', 'generate-card-back.mjs', 'generate-court-figures.mjs', 'generate-court-silhouette.mjs']

describe('SVG-cards artwork', () => {
  it.each(SCRIPTS)(
    'is what scripts/%s extracts from the vendored sheet today (regenerate if this fails)',
    (script) => {
      const result = spawnSync(process.execPath, [path.join(__dirname, '..', '..', 'scripts', script), '--check'], { encoding: 'utf8' })
      expect(result.stderr).toBe('')
      expect(result.status).toBe(0)
    },
    30000
  )
})
