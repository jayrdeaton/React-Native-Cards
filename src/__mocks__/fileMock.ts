// Stands in for any binary asset (courtBitmaps/*.png) a source file require()s directly - the real
// Metro/webpack asset pipeline resolves those to a numeric id or a URL, neither of which exists under
// Jest's jsdom environment. A plain string is enough: nothing under test inspects the resolved value
// itself, only that DecoratedCourtFigureBitmap's <Image source={...}> receives SOMETHING.
export default 'test-file-stub'
