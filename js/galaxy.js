// The galaxy around the player: a flat world in meters east and north of the
// world's origin (the first position of a new game), its sectors, the planets
// a new system would get, and the background stars. Everything here is a pure
// function of the World ID and the position, so players who share an ID get
// the same sectors around their starting points. Never use Math.random here.

import { createSimplex, hash } from './noise.js';
import { ECONOMIES, PLANET_SYLLABLES } from './data.js';

const EARTH_RADIUS = 6371008.8;
const RADIANS = Math.PI / 180;

// Sectors: a hex grid 600 m across, 3-colored so every sector touches both
// other kinds, with edges warped by noise so it doesn't look like a honeycomb.
const SECTOR_DIAMETER = 600;
const WARP_SCALE = 420;
const WARP_AMOUNT = 75;

let world = null; // { seed, origin: { lat, lon }, cosLat, angle, offsetX, offsetY, warpX, warpY }

// The World ID's seed, the same hashing as Tinwalk's, so an ID means the same in both.
export function worldSeed(id) {
  let h = 0x811c9dc5;
  for (const char of id.trim().toLowerCase()) {
    h = Math.imul(h ^ char.codePointAt(0), 0x01000193);
  }
  return Math.floor(hash(h, 0, 709) * 4294967296);
}

// { id, origin: { lat, lon } }, or null until a new game knows where it starts.
export function setWorld(settings) {
  if (!settings?.origin) {
    world = null;
    return;
  }
  const seed = worldSeed(settings.id);
  world = {
    seed,
    origin: settings.origin,
    cosLat: Math.cos(settings.origin.lat * RADIANS),
    angle: hash(seed, 1, 11) * (Math.PI / 3),
    offsetX: hash(seed, 2, 13) * SECTOR_DIAMETER * 3,
    offsetY: hash(seed, 3, 17) * SECTOR_DIAMETER * 3,
    warpX: createSimplex(seed ^ 0x51ed),
    warpY: createSimplex(seed ^ 0x2c9f),
  };
}

export function hasWorld() {
  return world !== null;
}

// A local flat projection: at walking distances its error is far below GPS noise.
export function toWorld({ lat, lon }) {
  return {
    x: (lon - world.origin.lon) * RADIANS * EARTH_RADIUS * world.cosLat,
    y: (lat - world.origin.lat) * RADIANS * EARTH_RADIUS,
  };
}

export function fromWorld({ x, y }) {
  return {
    lat: world.origin.lat + y / (RADIANS * EARTH_RADIUS),
    lon: world.origin.lon + x / (RADIANS * EARTH_RADIUS * world.cosLat),
  };
}

// Sector at a world position: 0 human, 1 alien, 2 frontier.
export function sectorAt(x, y) {
  return sectorField(x, y).sector;
}

// The sector at a world position and roughly how far its border is, in
// meters, for drawing glowing edges at any zoom.
export function sectorField(x, y) {
  const wx = x + WARP_AMOUNT * world.warpX(x / WARP_SCALE, y / WARP_SCALE);
  const wy = y + WARP_AMOUNT * world.warpY(x / WARP_SCALE, y / WARP_SCALE);
  const cos = Math.cos(world.angle);
  const sin = Math.sin(world.angle);
  const px = wx * cos - wy * sin + world.offsetX;
  const py = wx * sin + wy * cos + world.offsetY;
  const size = SECTOR_DIAMETER / 2;
  const q = ((Math.sqrt(3) / 3) * px - py / 3) / size;
  const r = ((2 / 3) * py) / size;
  const s = -q - r;
  let rq = Math.round(q);
  let rr = Math.round(r);
  let rs = Math.round(s);
  const dq = Math.abs(rq - q);
  const dr = Math.abs(rr - r);
  const ds = Math.abs(rs - s);
  if (dq > dr && dq > ds) rq = -rr - rs;
  else if (dr > ds) rr = -rq - rs;
  else rs = -rq - rr;
  // In cube coordinates a cell's border with a neighbor lies where the
  // difference of two offsets reaches 1; half of it is 0.5 at the border.
  const a = q - rq;
  const b = r - rr;
  const c = s - rs;
  const m = Math.max(Math.abs(a - b), Math.abs(b - c), Math.abs(c - a)) / 2;
  return { sector: (((rq - rr) % 3) + 3) % 3, edge: (0.5 - m) * Math.sqrt(3) * size };
}

// The planets a system discovered here would have: 1 to 4 economies. Fixed
// per 25 m square, so cancelling and retrying on the spot changes nothing,
// but walking a little further might.
export function planetsAt(x, y, sector) {
  const qx = Math.floor(x / 25);
  const qy = Math.floor(y / 25);
  const roll = (salt) => hash(qx, qy, world.seed ^ salt);
  const count = 1 + Math.floor(roll(101) * 4);
  const planets = [];
  for (let i = 0; i < count; i++) {
    const r = roll(211 + i * 37);
    if (sector === 0) planets.push(r < 0.5 ? 'humanAgricultural' : 'humanIndustrial');
    else if (sector === 1) planets.push(r < 0.5 ? 'alienBiological' : 'alienTechnological');
    else planets.push(i === 0 ? 'frontierMining' : ECONOMIES[Math.floor(r * 4)].id);
  }
  return planets;
}

// A planet's name, made up from syllables and fixed by where it is.
export function planetName(x, y, index) {
  const qx = Math.floor(x / 25);
  const qy = Math.floor(y / 25);
  const pick = (list, salt) => list[Math.floor(hash(qx, qy, (world?.seed ?? 0) ^ (salt + index * 97)) * list.length)];
  const { start, middle, end } = PLANET_SYLLABLES;
  return pick(start, 7) + pick(middle, 19) + pick(end, 31);
}

// Background stars in a square cell of the sky: [{ x, y, size, phase }] in
// cell units 0..1. The sky is the same for everyone, it needs no world.
export function starsInCell(cx, cy, layer) {
  const count = 2 + Math.floor(hash(cx, cy, 900 + layer) * 4);
  const stars = [];
  for (let i = 0; i < count; i++) {
    stars.push({
      x: hash(cx, cy, 1000 + layer * 31 + i * 3),
      y: hash(cx, cy, 2000 + layer * 31 + i * 3),
      size: hash(cx, cy, 3000 + layer * 31 + i * 3),
      phase: hash(cx, cy, 4000 + layer * 31 + i * 3) * Math.PI * 2,
    });
  }
  return stars;
}

// A number in [0, 1) fixed by the world, a day and a salt, for daily draws
// such as the market news.
export function dailyRandom(day, a, salt) {
  return hash(day, a, (world?.seed ?? 0) ^ salt);
}
