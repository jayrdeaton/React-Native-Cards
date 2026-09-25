// This package's own components only ever import View/Text/Image/StyleSheet/Platform from
// 'react-native' (no measured-ref/useWindowDimensions need, unlike split-screen's own mock - cards
// don't measure anything). @testing-library/react-native's matcher/helper modules additionally reach
// into StyleSheet (via its own require('react-native')) regardless of which matcher a given test
// actually calls, so it has to be present and functional even though nothing here calls it directly.
const StyleSheet = {
  create: <T extends object>(styles: T): T => styles,
  flatten: (style: unknown) => style
}

export { StyleSheet }

// Plain string element types, not function components. `test-renderer` (like the classic
// react-test-renderer it replaces) represents any string-typed element as a generic host node in
// its own `.toJSON()` tree without needing real native host-component registration - a function
// component wouldn't: composite (function) components are never themselves host nodes, only
// whatever they go on to render is, so a leaf that renders no children (e.g. an SVG shape with no
// text content anywhere under it) would disappear from the tree entirely instead of showing up as
// an empty node.
export const View = 'View'
export const Text = 'Text'
export const Image = 'Image'

// Just enough of Platform for `Platform.select`. `OS` is mutable so a test can render a component as
// another platform (`Platform.OS = 'web'`); select() follows it, and falls back to `default` (and
// `native` off the web) the way the real one does.
export const Platform = {
  OS: 'ios' as string,
  select<T>(spec: Record<string, T>): T | undefined {
    return spec[Platform.OS] ?? (Platform.OS !== 'web' ? spec.native : undefined) ?? spec.default
  }
}
