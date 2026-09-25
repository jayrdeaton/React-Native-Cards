module.exports = require('@infinitetoken/jest-config/react-native')({
  // Native modules this package imports have no real implementation under jsdom. @rific/auto-paper
  // is mocked too, not because it's native itself, but because its real dist pulls in
  // react-native-paper's whole theme engine at module-evaluation time (see
  // src/__mocks__/rific-auto-paper.ts) purely as a side effect of the one function CardBack.tsx
  // actually imports from it.
  moduleNameMapper: {
    '^react-native$': '<rootDir>/src/__mocks__/react-native.ts',
    '^react-native-svg$': '<rootDir>/src/__mocks__/react-native-svg.ts',
    '^@rific/auto-paper$': '<rootDir>/src/__mocks__/rific-auto-paper.ts',
    // courtBitmaps/index.ts require()s these directly (a real Metro/webpack asset reference at
    // runtime) - see src/__mocks__/fileMock.ts.
    '\\.png$': '<rootDir>/src/__mocks__/fileMock.ts'
  }
})
