// `@rific/auto-paper`'s real published package pulls in `react-native-paper`'s whole theme engine
// at module-evaluation time (its barrel unconditionally exports Paper-wrapped components alongside
// getContrastColor, the only thing CardBack.tsx actually uses) - react-native-paper's own theme
// tokens call real native APIs (Platform.select and friends) this package's minimal react-native
// mock doesn't provide, and isn't worth expanding just to satisfy an unused dependency chain. This
// mock replaces the whole package with a real (not stubbed-out) implementation of the one function
// this package imports, using the same WCAG-style relative-luminance approach real contrast-color
// pickers use, so CardBack's monogram rendering stays meaningful under test.

function srgbToLinear(channel: number): number {
  const c = channel / 255
  return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4)
}

function relativeLuminance(hex: string): number {
  const normalized = hex.replace('#', '')
  const r = parseInt(normalized.substring(0, 2), 16)
  const g = parseInt(normalized.substring(2, 4), 16)
  const b = parseInt(normalized.substring(4, 6), 16)
  return 0.2126 * srgbToLinear(r) + 0.7152 * srgbToLinear(g) + 0.0722 * srgbToLinear(b)
}

export function getContrastColor(backgroundHex: string): string {
  return relativeLuminance(backgroundHex) > 0.179 ? '#000000' : '#FFFFFF'
}
