# Fragua · fire, folded

Concept brand: a two-smith forge making Damascus kitchen knives. **Fragua** is Spanish for *forge*. The idea: polished steel turns straw, gold, bronze, then blue as it is tempered, and the lower the colour, the harder the edge. Each knife is named for the colour it is tempered to, and keeps that colour on its spine.

| Knife | Temper | Hardness | Blade | Best for | Price |
|---|---|---|---|---|---|
| **Paja** | Straw, 205 °C | 62 HRC | Petty, 13 cm, 84 g | Shallots, herbs, fruit | $240 |
| **Oro** | Gold, 230 °C | 60 HRC | Chef’s knife, 21 cm, 196 g | Almost everything | $420 |
| **Bronce** | Bronze, 260 °C | 58 HRC | Slicer, 24 cm, 168 g | Roasts, salmon, long slices | $460 |
| **Azul** | Blue, 290 °C | 55 HRC | Cleaver, 18 cm, 412 g | Joints, bone, squash | $520 |
| **El Juego** (set) | All four | | In a waxed-canvas roll | | $1,640 |

**Look:** soot `#0E0C0B`, bone `#ECE6DE`, plaster `#E4DED4`, one ember orange `#FF5A1F`; the temper colours straw `#E6CC80`, gold `#C99A3E`, bronze `#9A5B32` and blue `#2E5AA8` belong to the knives. Type: **Big Shoulders Display** (stamped, uppercase), **IBM Plex Mono** (readings) and **Instrument Sans** (body).

## Pages

| Page | What it is |
|---|---|
| `index.html` | Home: the fold (hero), the temper (the four knives), the edge 1000×, the four (cards, bag), El Juego (the knife roll), the forge, sharpened for life |
| `knife.html?k=oro` | Knife page, one template for all four: drawn knife, “Fold another”, handle choice, temper scale, bag · gallery · its job · specs · the other tempers · bag bar |
| `breakdown.html` | The brand breakdown: idea, name and mark, the four, colour, type, **every scroll transition and why**, pages, pictures, what is invented |
| `shots.html` | The shot sheet (not linked from the site): every image with prompt, model, aspect, reference and copy buttons |

## Signature pieces, all drawn in code (`js/steel.js`)

- **The fold** (pinned hero): scroll folds a glowing bar seven times, 2 layers to 256, with the layer count, fold number and heat read out. Every fold fires sparks and jolts the bar like a hammer blow. At the end the glow drains away and the etched pattern comes up.
- **The temper** (pinned): scroll raises the heat from 175 to 293 °C; the blade and the stage take on the real oxide colour of that temperature, a scale tracks temperature and hardness, and each knife holds the stage at its temper.
- **The edge, 1000×** (pinned): a cross-section of the Oro zooms from actual size to the apex, with labels that appear at the scale where they matter and a live scale bar.
- **Damascus, per pixel:** every blade is computed from a seed in one of four patterns (raindrop, ladder, twist, wild) with polished bevel, temper-tinted spine, bolster, and wood or micarta handle with grain, all in millimetres at true relative size. “Fold another” on a knife page draws a new one.
- **El Juego, the roll** (pinned): a strapped waxed-canvas roll unrolls and the four knives drop into their pockets one by one, each ticked off on a list, ending on the set total ($1,640, concept) and “Add the set to bag”. Built after the Horæ box the user asked for.
- **Pictures out of the fire:** forge photos rise from ember red to full colour as they scroll in.
- **Pick it up** (`js/grab.js`): every drawn knife outside the scroll scenes (cards, knife page hero, the other tempers) can be dragged to turn it over, with momentum, and settles face up or face down; arrow keys flip and tilt it. Vertical page scroll still works on phones.
- **Scroll feel:** Lenis inertia on desktop; shortly after scrolling stops inside a pinned scene, the page settles onto the nearest resting state if it is close (after each hammer blow, at each knife’s temper, at each zoom of the edge); left and right arrow keys and the arrows on the temper stage step between them. `FG_SETTLE()` runs it on demand for tests.
- Page morphs (the drawn knife flies into the knife page), fast-forward menu links and the faint **Reduce motion** button at the top right (also in the footer) come from the shared setup.

## Images and films: all generated

First 22 made on Higgsfield on 2026-11-21 for **36.48 credits** (GPT Image 2.6 2k high at 2.00, Soul Cinematic 2k at 0.12): stage 1, the four masters (`<knife>-side`) and four forge scenes; stage 2, each knife at work, its spine in macro and in the hand, all four on a rack, and a closing shot, each passing its master as a reference. One job dropped its connection and passed on a retry. Originals are in `higgsfield/renders/`, job ids in `higgsfield/manifest.json`. The closing photo's crop is set with `data-focus` in `index.html`.

**Knife page v2 (2026-11-21, 99 credits):** per knife a hero photo on slate (`<k>-hero`), and **the cut**, a pinned scroll film of the knife at its job: a 16:9 first frame (`<k>-cut-start`), a last frame made from it (`<k>-cut-end`), and a 5 s Kling 4.0 film between them (`cut-<k>`), cut by the optimiser into 61 desktop and 61 phone frames under `assets/film/`. The film runs on `js/film.js` (ported from Racimo) with three tiers: frames, else a crossfade of the two stills, else the at-work photo. Films average 57–66 brightness out of 255: moody, readable.

**Image logic:** `optimize.mjs` now also writes a 1,400 px size and, per image, a measured subject focus (studio shots: the box around whatever differs from the backdrop; scenes: sharp's attention point eased toward the centre; a `focus` on the shot in `js/shots.js` wins) and a 24 px blur-up preview, cached in `higgsfield/image-meta.json` and shipped in `ready.js`. `media.js` crops every photo on its subject, shows the blurred preview at once, picks 900 / 1,400 / 2,000 px by the slot's real width, loads the first screen eagerly and fades a photo in only once it is decoded.

```powershell
node higgsfield/generate.mjs
```

prints the plan and cost and spends nothing. Re-roll one picture with:

```powershell
node higgsfield/generate.mjs oro-board --go --force
```

By hand: copy prompts from `shots.html`, save as `higgsfield/renders/<id>.png`, run `npm install` once and `node higgsfield/optimize.mjs`. The social card `assets/img/og.jpg` is cut from `rack`.

## Edit

- Knives, copy, prices, temper scale, stats: `js/data.js`
- Prompts and the look bible: `js/shots.js`
- Drawing (Damascus, knives, billet, sparks): `js/steel.js`
- Colours, type, layout: `css/fragua.css`
- Home: `js/home.js`. Knife page: `js/knife-page.js`. Shared: `js/common.js`, `js/media.js`

## Run it locally

```powershell
node tools/serve.mjs
```

Then open http://localhost:4186/. Plain HTML, CSS and JS, no build step. Reduce motion (footer, or the phone setting) stops sparks, entrance effects, smooth scroll and page transitions; scroll-driven scenes stay. `?sync` is a test aid for background tabs.

## Before a real launch

- **Name:** check “Fragua” for trademarks in cutlery (Nice class 8).
- **Concept values:** every price, weight, size, hardness, tempering temperature per knife, layer and fold count, edge geometry, “three days a knife”, “two smiths”, the three-week lead time and free lifetime sharpening are proposals. The temper colours are real physics; the rest must come from the forge.
- **The bag** stores choices in the browser and sends nothing. Connect a store.
- Care links in the footer are plain text until those pages exist.
