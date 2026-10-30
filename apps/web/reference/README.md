# Prototype reference

`Art Houz Website.dc.html` is the design source of truth for `apps/web`. It is a Design Canvas
document rendered in the browser by `support.js`; `image-slot.js` defines `<image-slot>`.
Do not edit these three files: the visual harness patches a copy.

## Visual harness

`tests/visual/normalise.ts` copies the prototype to `test-results/reference.html` (with the two
scripts beside it) after four textual patches. Each patch must match exactly once or the run fails:

1. **Artist order** — the `AH_ARTISTS` array literal is rewritten to the order of `flat[].name`
   from `GET /public/artists` (the API's collation, not the prototype's hand order).
2. **News order** — `AH_NEWS` items are reordered to match `GET /public/news` (matched by title).
3. **Home press** — `AH_NEWS.slice(1, 4)` becomes `AH_NEWS.slice(0, 3)` (home shows the three latest).
4. **Read article** — the "Read article ↗" anchor is wrapped in
   `<sc-if value="{{ n.hasUrl }}">` and `hasUrl: !!n.externalUrl` is added to the `newsList`
   mapping. The seed has no external URLs, so the link never renders on either side.

`renderPrototype` seeds `localStorage['arthouz-route']` (`{ page, param }`) before load and can
rewrite the `data-props` defaults (`heroLayout`, `artistIndex`) in a further copy.

### Determinism

- **Frozen date:** the API runs with `TODAY_OVERRIDE=2026-10-30`, which makes Tidewater current
  and matches the prototype's hard-coded statuses. The footer year comes from the clock and
  matches the prototype's "2012 – 2026" during 2026.
- **Browser:** installed Google Chrome (`channel: 'chrome'`), device scale factor 1, Asia/Kolkata.
  The bundled Playwright Chromium is not downloaded; both sides render in the same engine.
- Fonts (`document.fonts.ready`) and network idle are awaited, and the page is scrolled to the
  bottom and back so lazy images load before the full-page screenshot.
- Comparison: `pixelmatch` threshold 0.1, both images cropped to the smaller height; a case fails
  above 0.5 % differing pixels or a height delta over 4 px. On failure `prototype.png`, `port.png`
  and `diff.png` are written to `test-results/visual/<name>/`; `result.json` is always written.

## Running

```sh
pnpm --filter @arthouz/web test:visual
```

The API web server command migrates and seeds `VISUAL_DATABASE_URL`
(default `postgresql://manoranjith@localhost:5433/arthouz_test_t11`) before starting the API on
4100 (`STORAGE_DRIVER=memory`); Playwright starts web servers before `globalSetup`, so
`globalSetup` only verifies the API serves seeded data. The site is then built and served with
`next build && next start` on 3100: `next dev` reload-looped under Turbopack's dev cache and its
HMR keeps the network busy. In production `NEXT_IMAGE_UNOPTIMIZED` is ignored, so images go
through the optimiser. Ports 3100 and 4100 must be free.

The port is not awaited with `networkidle` (Next keeps link-prefetch requests open); it waits for
`load`, `document.fonts.ready` and every `<img>` to complete. Set `VISUAL_WRITE_ALL=1` to write
`prototype.png` / `port.png` / `diff.png` for passing cases too, for side-by-side review.
