# TODO: card artwork licensing follow-ups

The license declaration itself was fixed on 2026-10-14: package.json is now `(MIT AND LGPL-2.1-only)`
(upstream SVG-cards says LGPL-2.1, no "or later"), the README has a License section, NOTICE.md covers
`courtBitmaps/`, and the stale `src/components/cards/...` paths in `types.ts`, `pips.ts` and NOTICE.md
are corrected. The fix reaches npm with the next release.

## Still open

1. Port the SVG-cards extraction scripts into this repo. They were removed from Solitaire, where they
   wrote into the old `src/components/cards/artwork/` location. The last copies are in Solitaire's
   history at commit `ec825cf`:
   `git -C ../Solitaire show ec825cf:scripts/<name>.mjs` for `generate-card-artwork`,
   `generate-card-back`, `generate-court-figures`, `generate-court-silhouette` and
   `generate-decorated-custom-pack`. They need their output paths retargeted to `src/artwork/`, and the
   decorated pipeline writes an intermediate `decorated/` folder that this repo no longer keeps.
2. Optional: copy `src/artwork/LICENSE` and `NOTICE.md` to the package root (e.g. `LICENSE-artwork`) so
   they sit next to package.json and show up more visibly on npm.
3. Apps that ship this art in store builds (Solitaire, EgyptianRatscrew) should show the attribution
   in-app, for example on an about or credits screen, as NOTICE.md asks.
4. Optional: check whether LGPL-2.1's other terms, beyond keeping the notice, matter for art bundled
   into an app binary. This note is not legal advice.
