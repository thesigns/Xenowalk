# Xenowalk

A walking game for your phone's browser. Your favorite places become star systems, and every walk between them is a trade run.

- **Chart your places.** Stand at home, in a park, at your café, and discover a star system there. Up to eight fit in an area, so a full loop is about an hour's walk.
- **Walk and trade.** Each system sells what it makes and pays well for what it lacks. Buy cheap, carry, sell dear. Markets restock every galactic day at 04:00, and every day one system in each area runs short of something.
- **Meet strangers.** Each system has one encounter a day: dice with an alien gambler, a sealed container from a smuggler, a delivery job for a medic.
- **Find relics.** Containers may hide the relics of six extinct civilizations. The more you walk between your systems, the stronger their signal.
- **Grow.** From a Shuttle to a Freighter, from Stowaway to Elite.

Nothing happens between systems: keep the phone in your pocket and your eyes on the street.

There is no server and no account. The game lives in your browser's storage; export a save from the menu to keep it safe.

## Running it

Plain HTML, CSS and JavaScript modules, no build step:

```sh
python tools/serve.py 8000
```

Then open `http://localhost:8000/` (or `/?debug` to move by tapping the map and speed time up). Geolocation needs HTTPS or `localhost`.

The design document (in Polish) is `docs/xenowalk-gdd.md`; the economy simulator used to tune it is in `tools/sim/`.
