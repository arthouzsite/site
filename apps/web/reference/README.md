# Prototype reference

`Art Houz Website.dc.html` is the design source of truth for `apps/web`. It is a Design Canvas
document rendered in the browser by `support.js`; `image-slot.js` defines `<image-slot>`.
Do not edit these three files: the visual harness patches a copy.

## Visual harness

`tests/visual/normalise.ts` copies the prototype to `test-results/reference.html` (with the two
scripts beside it) after five textual patches. Each patch must match exactly once or the run fails:

1. **Artist order** — the `AH_ARTISTS` array literal is rewritten to the order of `flat[].name`
   from `GET /public/artists` (the API's collation, not the prototype's hand order).
2. **News order** — `AH_NEWS` items are reordered to match `GET /public/news` (matched by title).
3. **Home press** — `AH_NEWS.slice(1, 4)` becomes `AH_NEWS.slice(0, 3)` (home shows the three latest).
4. **Read article** — the "Read article ↗" anchor is wrapped in
   `<sc-if value="{{ n.hasUrl }}">` and `hasUrl: !!n.externalUrl` is added to the `newsList`
   mapping. The seed has no external URLs, so the link never renders on either side.
5. **(e) Artist base** — `(h >> 3) % AH_BASES.length` becomes `(h >>> 3) % AH_BASES.length`. The
   signed shift goes negative for large hashes (e.g. Vijay Pichumani), so the prototype's `base`
   was `undefined` ("practice in undefined"); the seed already uses the unsigned shift.
6. **(f) Publications link** — the "View more ↗" anchor on the About Publications tab is wrapped in
   `<sc-if value="{{ hasPubUrl }}">` and `hasPubUrl: false` is added to `renderVals()` (the seed has no
   URL). The port renders the link only when `externalUrl` is set, like the news link.
7. **(g) Image-slot frame size** — the harness serves a patched copy of `image-slot.js` in which `_geom()`'s
   `const fw = this.clientWidth, fh = this.clientHeight;` reads `getBoundingClientRect()` width/height instead.
   `clientWidth/clientHeight` round to integers, so a 251.25 px frame was cropped as 251 px (image 0.3 px too
   tall); only fractional 375 px frames were affected. `support.js` is copied unchanged.

`renderPrototype` seeds `localStorage['arthouz-route']` (`{ page, param, city, status, aq }`) before load and can
rewrite the `data-props` defaults (`heroLayout`, `artistIndex`) in a further copy.

### Determinism

- **Frozen date:** the API runs with `TODAY_OVERRIDE=2026-10-30`, which makes Tidewater current
  and matches the prototype's hard-coded statuses. For the footer year the site reads the same `TODAY_OVERRIDE`
  outside production; because `next start` forces `NODE_ENV=production`, the visual web server
  also sets `ALLOW_TEST_OVERRIDES=1` (never set in deployments). The footer therefore matches the prototype's "2012 – 2026" in any year. Header clips use `header.boundingBox()`
  (77 px including the hairline).
- **Browser:** installed Google Chrome (`channel: 'chrome'`), device scale factor 1, Asia/Kolkata.
  The bundled Playwright Chromium is not downloaded; both sides render in the same engine.
- Fonts (`document.fonts.ready`) and network idle are awaited, and the page is scrolled to the
  bottom and back so lazy images load before the full-page screenshot.
- Comparison: `pixelmatch` threshold 0.1 with `includeAA: false` (anti-aliased pixels are not
  counted), both images cropped to the smaller height. The gate is ≤ 0.5 % non-anti-aliased
  differing pixels and ≤ 4 px height delta. On failure `prototype.png`, `port.png`
  and `diff.png` are written to `test-results/visual/<name>/`; `result.json` is always written.

## Running

```sh
pnpm --filter @arthouz/web test:visual
```

The API web server command migrates and seeds `VISUAL_DATABASE_URL`
(default `postgresql://<os user>@localhost:5433/arthouz_test_web`; the user is filled in
explicitly because Prisma's CLI, unlike libpq, does not default to it) before starting the API on
4100 (`STORAGE_DRIVER=memory`); Playwright starts web servers before `globalSetup`, so
`globalSetup` only verifies the API serves seeded data. The site is then built and served with
`next build && next start` on 3100: `next dev` reload-looped under Turbopack's dev cache and its
HMR keeps the network busy. In production `NEXT_IMAGE_UNOPTIMIZED` applies only with `ALLOW_TEST_OVERRIDES=1` (set by the harness); otherwise images go
through the optimiser. Ports 3100 and 4100 must be free.

The port is not awaited with `networkidle` (Next keeps link-prefetch requests open); it waits for
`load`, `document.fonts.ready` and every `<img>` to complete. Set `VISUAL_WRITE_ALL=1` to write
`prototype.png` / `port.png` / `diff.png` for passing cases too, for side-by-side review.

## Port notes

Deliberate departures from a literal reading of the markup, each confirmed by the visual diffs:

- **Home upcoming band image** — the prototype's `<image-slot>` host is `width/height: 100%;
  aspect-ratio: 3/2`, so the image column is at least 3:2 tall (not just `min-height: 320px`). The
  port keeps `min-h-[320px]` on the column and renders an in-flow `ImageSlot ratio="3/2"` with
  `h-full w-full`, stretched by the text column.
- **"Now on view · {city}"** — the eyebrow is a flex container with a 10 px gap and the city is a
  separate flex item, so the port wraps the city in its own `<span>` to reproduce the gap after `·`.
- **Footer visual baseline** — `shell.spec.ts` compares the footer against the prototype's home page:
  the footer's fractional offset follows the content above it, so both sides must be the same page.
