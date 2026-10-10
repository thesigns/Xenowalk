// Offline support: every file of the game is cached on install, served from
// the cache straight away and refreshed from the network in the background, so
// an update shows up on the next launch. The fonts from Google are cached the
// first time they load.
//
// Xenowalk shares its origin (thesigns.github.io) with other games, and Cache
// Storage is per origin, so every cache here is named xenowalk-… and only
// those are ever deleted.
//
// The version comes from js/version.js through the registration URL (sw.js?v=…).
// FILES is generated: after adding or removing files, run node tools/sw-files.mjs.

const VERSION = new URL(self.location).searchParams.get('v') ?? 'dev';
const CACHE = `xenowalk-${VERSION}`;
const FONTS = 'xenowalk-fonts';

// FILES:START
const FILES = [
  './',
  'css/style.css',
  'img/apple-touch-icon.png',
  'img/artifacts/amber-heart.svg',
  'img/artifacts/ash-urn.svg',
  'img/artifacts/basalt-mask.svg',
  'img/artifacts/black-star-seal.svg',
  'img/artifacts/bone-flute.svg',
  'img/artifacts/choir-shard.svg',
  'img/artifacts/clock-without-hands.svg',
  'img/artifacts/echo-mask.svg',
  'img/artifacts/folded-cube.svg',
  'img/artifacts/funeral-barge.svg',
  'img/artifacts/glass-feather.svg',
  'img/artifacts/infinite-knot.svg',
  'img/artifacts/iron-banner.svg',
  'img/artifacts/lantern-of-still-light.svg',
  'img/artifacts/last-equation.svg',
  'img/artifacts/lightglass-lens.svg',
  'img/artifacts/living-map.svg',
  'img/artifacts/loom-of-hours.svg',
  'img/artifacts/mirror-of-elsewhere.svg',
  'img/artifacts/mothers-coil.svg',
  'img/artifacts/ninth-spiral-starchart.svg',
  'img/artifacts/number-stone.svg',
  'img/artifacts/oath-gauntlet.svg',
  'img/artifacts/prism-crown.svg',
  'img/artifacts/resonance-bowl.svg',
  'img/artifacts/seed-of-hymns.svg',
  'img/artifacts/siege-blade.svg',
  'img/artifacts/silent-bell.svg',
  'img/artifacts/singing-egg.svg',
  'img/artifacts/sleeping-larva.svg',
  'img/artifacts/spore-censer.svg',
  'img/artifacts/starbreaker-shell.svg',
  'img/artifacts/sun-compass.svg',
  'img/artifacts/tacticians-die.svg',
  'img/artifacts/tomb-key.svg',
  'img/artifacts/war-drum.svg',
  'img/characters/alien-gambler.svg',
  'img/characters/bored-dockhand.svg',
  'img/characters/dispatcher.svg',
  'img/characters/foreman.svg',
  'img/characters/glutta-banker.svg',
  'img/characters/high-roller.svg',
  'img/characters/medic.svg',
  'img/characters/scrap-merchant.svg',
  'img/characters/shady-dealer.svg',
  'img/characters/smuggler.svg',
  'img/civs/kethu.svg',
  'img/civs/lumenari.svg',
  'img/civs/orrim.svg',
  'img/civs/thal.svg',
  'img/civs/vael.svg',
  'img/civs/ys.svg',
  'img/icon-192.png',
  'img/icon-512.png',
  'img/icon.svg',
  'img/icons.svg',
  'img/logo.svg',
  'img/planets/alien-biological.svg',
  'img/planets/alien-technological.svg',
  'img/planets/frontier-mining.svg',
  'img/planets/human-agricultural.svg',
  'img/planets/human-industrial.svg',
  'img/ships/bulwark.svg',
  'img/ships/capsule.svg',
  'img/ships/choirship.svg',
  'img/ships/discovery.svg',
  'img/ships/grindle.svg',
  'img/ships/kestrin.svg',
  'img/ships/lightbarque.svg',
  'img/ships/mote.svg',
  'img/ships/rookhaul.svg',
  'img/ships/tinderbox.svg',
  'index.html',
  'js/clock.js',
  'js/data.js',
  'js/debug.js',
  'js/dialogs.js',
  'js/dice.js',
  'js/galaxy.js',
  'js/game.js',
  'js/geo.js',
  'js/gps.js',
  'js/haptics.js',
  'js/heading.js',
  'js/main.js',
  'js/map.js',
  'js/noise.js',
  'js/page-cargo.js',
  'js/page-codex.js',
  'js/page-system.js',
  'js/settings.js',
  'js/ship-view.js',
  'js/sound.js',
  'js/state.js',
  'js/ui.js',
  'js/version.js',
  'manifest.webmanifest',
];
// FILES:END

self.addEventListener('install', (event) => {
  // `reload` skips the browser's HTTP cache, so a new version never mixes with old files.
  event.waitUntil(caches.open(CACHE).then((cache) => cache.addAll(FILES.map((file) => new Request(file, { cache: 'reload' })))));
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((key) => key.startsWith('xenowalk-') && key !== CACHE && key !== FONTS).map((key) => caches.delete(key))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);
  if (url.origin === self.location.origin) {
    // Only the game's own files, not the other games on this origin.
    if (!url.pathname.startsWith(new URL('./', self.location).pathname)) return;
    event.respondWith(staleWhileRevalidate(event, CACHE));
  } else if (url.hostname === 'fonts.googleapis.com' || url.hostname === 'fonts.gstatic.com') {
    event.respondWith(staleWhileRevalidate(event, FONTS));
  }
});

// The cached copy at once, and a fresh one fetched for next time.
async function staleWhileRevalidate(event, name) {
  const { request } = event;
  const cache = await caches.open(name);
  const cached = await cache.match(request, { ignoreSearch: true });
  const fresh = fetch(request)
    .then((response) => {
      if (response.ok || response.type === 'opaque') cache.put(request, response.clone());
      return response;
    })
    .catch(() => undefined);
  event.waitUntil(fresh);
  return cached ?? (await fresh) ?? Response.error();
}
