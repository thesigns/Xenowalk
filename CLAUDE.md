# Xenowalk

A walking game: the player's favorite places become star systems, and every walk between them is a trade run. They chart systems where they stand (real GPS), buy what a system produces, sell where it's wanted, meet one stranger per system per day (dice, sealed containers, deliveries), and hunt the 36 relics of six dead civilizations. It runs in the browser (PWA later) with no server: all state lives in `localStorage`. The design goal is one walk of about an hour a day.

## Source of truth

- `docs/xenowalk-gdd.md` is the game design document (in Polish). Check it before changing game rules. Its numbers were tuned with the economy simulator in `tools/sim/`; the "Proposal v0.2" preset there mirrors the GDD's parameter table (section 13). When a rule or number changes, change the GDD, the constants in `js/game.js` and that preset together.
- The project author communicates in Polish; reply in Polish.

## Project rules

- Everything in the app is in English: UI text, code, identifiers, comments, commit messages.
- Exception: documentation in `docs/*.md` is written in Polish.
- Plain HTML, CSS and JavaScript (ES modules). No frameworks, no build step, no npm dependencies. The map is drawn on a Canvas.
- Mobile-first, portrait.
- Commit only when the project author asks.

## Running locally

```sh
python tools/serve.py 8000
```

Open `http://localhost:8000/?debug`. `tools/serve.py` sends `Cache-Control: no-store`, so edited modules load without a hard reload (plain `python -m http.server` works too, but Chrome caches ES modules aggressively). `tools/phone.html` shows the game in a 390-px phone frame on a desktop.

Debug mode (`?debug`) starts at the last docked system (or in Warsaw), moves the player wherever the map is tapped, can speed game time up (1×, 60×, 3600×), jump a galactic day ahead and add credits. In debug mode `window.xenowalk` exposes `app`, `state`, `tracker`, `map`, `fromWorld` and `toWorld` for scripted testing.

The economy simulator: `node tools/sim/run.js "Proposal v0.2" key=value …`, or open `tools/sim/` in the browser.

## Architecture

All game code is in `js/`, loaded from `index.html` via `js/main.js`.

| Module | Responsibility |
|---|---|
| `main.js` | Wiring: start screen, GPS readings and docking, the tick (galactic day rollover, expired deliveries), the HUD (credits, GPS, ticker, action button, tab badges), tabs and pages, actions. Builds the `app` object pages and dialogs use |
| `game.js` | Game rules and constants: galactic day, discovery and its price, areas, markets (daily stock and demand, tiers of sale prices), market news, trade with cost basis and profit, ships, docking and kilometers, missions, events. Functions mutate the state; the caller saves |
| `data.js` | Content: goods, sectors, economies and their relations, ships, ranks, event variants (characters and lines), civilizations, the 36 artifacts with their texts, planet name syllables |
| `galaxy.js` | The world: World ID seed, local flat projection around the origin (`toWorld`/`fromWorld`), hex sectors warped by noise (`sectorField` gives the distance to a border, for drawing), planets and planet names at a position, background stars, daily random numbers. Deterministic: never `Math.random` |
| `state.js` | State shape, `STATE_VERSION`, migrations, load/save (`xenowalk.state`), export/import with validation |
| `map.js` | `MapView`: canvas galaxy in world meters. Parallax stars, sector nebulae (sampled coarsely and smoothed), grid crosses, systems as small orreries, the player's ship and heading, delivery routes, edge pointers, ripples. Pan, pinch, wheel, taps on systems. Animates at 30 fps only while the map is visible |
| `page-system.js` | The System page: docked (hero, event card, news, market with steppers and a trade bar, shipyard) or deep space (nearest system, news, list of systems) |
| `page-cargo.js` | Ship and hold, rank, deliveries, relic signal and log |
| `page-codex.js` | The 36 relics by civilization, silhouettes until found |
| `dialogs.js` | Event dialogs (dice, container with the crate animation, delivery), charting a system, the full-screen relic reveal, promotions, new ships, system and relic cards, rename/delete, menu, how-to-play |
| `ui.js` | `h()` element builder, `fill()`, icons from the sprite, formatting, queued dialogs and overlays, toasts, hold-to-repeat buttons |
| `gps.js`, `heading.js`, `geo.js`, `clock.js`, `noise.js`, `dice.js`, `settings.js` | Copied from Tinwalk (`clock.js` gained `advanceTime` for debug) |
| `sound.js` | Synthesized sounds (Web Audio): chimes, the dice rattle, the container hiss, the relic shimmer |
| `haptics.js` | Vibration patterns; names shared with `sound.js` |
| `debug.js` | Debug panel and the debug clock |
| `version.js` | `APP_UPDATED`, shown on the start screen and in the menu |

## Conventions and gotchas

- **Time:** rules read time from `clock.now()`, never `Date.now()`, so debug time works. The galactic day runs from 04:00 to 04:00 local time (`galacticDay`, `nextDayStart` in `game.js`).
- **Saved state:** when changing its shape, bump `STATE_VERSION`, add a migration and update `isValidState`. Today's event is drawn once and kept on its system (`system.pendingEvent`), so leaving and returning can't redraw it.
- **The world is deterministic:** sectors, planets and stars depend only on the World ID and the position relative to the origin. Changing the hex size, the warp, or how seeds are derived changes every player's galaxy.
- **Element builder:** `h('div.card', { style: { '--civ': color } }, …children)`. Custom properties go through `setProperty` (plain `style` assignment ignores them). Children may be arrays and `null`; use `fill(root, …)` rather than `replaceChildren`, which would print arrays and `null`. Dialogs filter `null` in `dialog.append` for the same reason.
- **Dialogs queue:** `openDialog` and `openOverlay` wait for the one before, so a promotion opened during an event shows after it.
- **Colors:** the palette lives as custom properties in `css/style.css`; `COLORS` in `map.js` mirrors it for the canvas. Sector, good and civilization colors are in `data.js` and must match the art.
- **Art:** all illustrations are hand-drawn SVG line art in `img/`, futuristic minimalism on deep space: main lines `#e9f2ff` width 4, details width 2 in `#9fb1c8` or an accent, translucent accent fills (0.06–0.3), no filters, no text, ids prefixed with the file name. Artifacts (`img/artifacts/<id>.svg`, 512², transparent, object within radius ~190, no outer glow so the CSS silhouette shows the shape), civilization emblems (`img/civs/`), characters (`img/characters/<variant id>.svg`), ships (`img/ships/`, 640×320), planets (`img/planets/<economy in kebab case>.svg`), the emblem and app icon (`img/logo.svg`, `img/icon.svg`). UI icons are symbols in the sprite `img/icons.svg` (`#i-<name>`, goods use their ids), rank insignia in `img/ranks.svg` (`#rank-0` … `#rank-8`).
- **Feedback:** `feedback(name)` in `main.js` plays a sound and a vibration; `SOUNDS` and `PATTERNS` share names. Audio needs a user gesture first: `sound.unlock()` runs on the start buttons and tabs.
- **Safety first:** nothing happens between systems; anything that asks for attention happens in a system the player chose. Keep it that way.
- **Code style:** match the surrounding code: 2-space indent, single quotes, semicolons, small focused modules, comments that explain why.
