module.exports = [
  // Auto-generated card art data (Solitaire's scripts/generate-decorated-custom-pack.mjs) -
  // thousands of tiny object literals, never hand-edited, not worth formatting/lint-checking - the
  // same exclusion Solitaire's own eslint.config.cjs applies to these same files (confirmed: linting
  // them unignored produces 23000+ prettier/prettier warnings and crashes ESLint's own stylish
  // formatter with a RangeError building the output table, not just a large-but-harmless count).
  // colors.ts is deliberately NOT listed here - it's a real hand-written file, unlike its sibling
  // data files.
  {
    ignores: ['src/artwork/decoratedCustom/hearts.ts', 'src/artwork/decoratedCustom/diamonds.ts', 'src/artwork/decoratedCustom/clubs.ts', 'src/artwork/decoratedCustom/spades.ts', 'src/artwork/decoratedCustom/courtFigures.ts', 'src/artwork/decoratedCustom/index.ts']
  },
  ...require('@infinitetoken/eslint-config/react-native')
]
