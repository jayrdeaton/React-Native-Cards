// No existing template for this mock in the fleet - this package is the first to render real
// react-native-svg primitives under a mocked-native jsdom test setup. Every named export below is
// exactly what the copied src/ tree imports from 'react-native-svg' (confirmed via grep across
// CardBack.tsx, CourtFigure.tsx, SuitPip.tsx, DecoratedCardBack.tsx/DecoratedCardFace.tsx/
// DecoratedCourtFigure.tsx, and DecoratedShapeRenderer.tsx).
//
// Each is a plain string element type, not a function component - see react-native.ts's own mock
// for why: `test-renderer` only puts string-typed ("host") elements in its `.toJSON()` tree, and
// most of these (Path/Rect/Circle/Line/Polygon/Polyline in particular) are leaf shape primitives
// with no children of their own, so a function-component passthrough would render nothing
// representable at all for a card whose art is built entirely from these leaves.

const Svg = 'Svg'
const G = 'G'
const Path = 'Path'
const Rect = 'Rect'
const Circle = 'Circle'
const Line = 'Line'
const Polygon = 'Polygon'
const Polyline = 'Polyline'
const Defs = 'Defs'
const ClipPath = 'ClipPath'
const Text = 'Text'

export default Svg
export { Circle, ClipPath, Defs, G, Line, Path, Polygon, Polyline, Rect, Text }
