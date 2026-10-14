# TODO: card artwork licensing follow-up

1. Optional: check whether LGPL-2.1's other terms, beyond keeping the notice, matter for art bundled
   into an app binary (section 6: letting users rebuild the app with a modified copy of the art). The
   package and the games that use it are public on GitHub with the art in source form, and the
   unmodified source deck is vendored at `scripts/svg-cards/svg-cards.svg`, which covers the
   "provide the source" side. The sheet's own header grants "version 2 ... or any later version",
   so the declared `LGPL-2.1-only` is a valid (narrower) choice, not a mismatch. This note is not
   legal advice.
