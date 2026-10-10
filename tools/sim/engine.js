// Xenowalk economy simulator. Plays many simulated players through months of
// walks, so the numbers in docs/xenowalk-gdd.md can be tuned before the game
// exists. Pure functions of the parameters and a seed: no DOM, so it runs in a
// worker and in Node alike.

export const GOODS = ['Human Food', 'Alien Food', 'Substances', 'Human Tech', 'Alien Tech'];
export const ECONOMIES = ['Human Agricultural', 'Human Industrial', 'Alien Biological', 'Alien Technological', 'Frontier Mining'];
export const SECTORS = ['Human', 'Alien', 'Frontier'];

// What each economy produces (index into GOODS).
const PRODUCES = [0, 3, 1, 4, 2];
// How each economy relates to each good, in GOODS order.
// P produces, N neutral, D demand, E exotic (the other side's goods).
const RELATIONS = [
  'PENDE',
  'DEDPE',
  'EPNED',
  'EDDEP',
  'DDPDD',
];
const REL_INDEX = { P: 0, N: 1, D: 2, E: 3 };
const REL = RELATIONS.map((row) => [...row].map((c) => REL_INDEX[c]));
const IS_PREMIUM = [false, false, true, true];

// Every tunable number, grouped for the form. `scale: 100` shows a fraction as
// a percentage. Defaults are the values in GDD v0.1.
export const PARAM_GROUPS = [
  {
    title: 'Walker',
    params: [
      { key: 'walkMinutes', label: 'Walk length', unit: 'min', def: 60 },
      { key: 'walksPerWeek', label: 'Walks per week', def: 7 },
      { key: 'persona', label: 'Route', def: 'loop', options: [['loop', 'Loop through own systems'], ['pingpong', 'Back and forth, 2 closest systems']] },
      { key: 'walkSpeedKmh', label: 'Walking speed', unit: 'km/h', def: 4.8, step: 0.1 },
      { key: 'detour', label: 'Streets vs straight line', unit: '×', def: 1.3, step: 0.05 },
      { key: 'stopMinutes', label: 'Time per stop', unit: 'min', def: 1.5, step: 0.5 },
      { key: 'placementRadius', label: 'Places within', unit: 'm', def: 900, step: 50 },
      { key: 'placeChoices', label: 'Picks the best fit of', unit: 'places', def: 3 },
      { key: 'fillFactor', label: 'Buys Coords until loop is', unit: '× walk', def: 1.3, step: 0.1 },
      { key: 'secondAreaKm', label: 'Second area (work, family) at', unit: 'km, 0 = none', def: 0, step: 0.5 },
      { key: 'weekendWalkMinutes', label: 'Weekend walk (Sat, Sun)', unit: 'min, 0 = as weekdays', def: 0, step: 15 },
      { key: 'newAreaKm', label: 'More areas, for weekend walks, at', unit: 'km, 0 = none', def: 0, step: 0.5 },
    ],
  },
  {
    title: 'Systems',
    params: [
      { key: 'minSpacing', label: 'Min spacing', unit: 'm', def: 300, step: 50 },
      { key: 'maxSystems', label: 'Max systems in an area', def: 99 },
      { key: 'coordPricing', label: 'Coord price grows with', def: 'global', options: [['global', 'All systems (v0.1)'], ['area', 'Systems in the area']] },
      { key: 'sectorSize', label: 'Sector diameter', unit: 'm', def: 600, step: 50 },
      { key: 'economyRule', label: 'Main planet', def: 'random', options: [['random', 'Random (GDD v0.1)'], ['choose', 'Player picks among planets']] },
      { key: 'startCoords', label: 'Coords at start', def: 2 },
      { key: 'startCredits', label: 'Credits at start', def: 500, step: 100 },
      { key: 'coordBase', label: 'Price of 1st bought Coord', def: 1500, step: 100 },
      { key: 'coordGrowth', label: 'Each next Coord', unit: '×', def: 1.5, step: 0.05 },
    ],
  },
  {
    title: 'Ships',
    params: [
      { key: 'shipNames', label: 'Names', def: 'Shuttle, Courier, Hauler, Freighter', list: true, text: true },
      { key: 'shipHolds', label: 'Holds', def: '10, 20, 40, 80', list: true },
      { key: 'shipPrices', label: 'Prices', def: '0, 4000, 15000, 50000', list: true },
      { key: 'shipSystems', label: 'Systems allowed', def: '999, 999, 999, 999', list: true },
      { key: 'shipMissionKm', label: 'Mission range', unit: 'km', def: '99, 99, 99, 99', list: true },
      { key: 'startShip', label: 'Start with ship no.', unit: '0 = first', def: 0 },
      { key: 'tradeIn', label: 'Trade-in', unit: '%', def: 0.5, scale: 100 },
    ],
  },
  {
    title: 'Market',
    params: [
      { key: 'marketModel', label: 'Model', def: 'impact', options: [['impact', 'Price impact, slow recovery (v0.1)'], ['daily', 'Daily stock and demand']] },
      { key: 'basePrices', label: 'Base prices (HF, AF, S, HT, AT)', def: '20, 30, 40, 80, 120', list: true },
      { key: 'roundPrices', label: 'Prices in whole credits', def: 'no', options: [['no', 'No'], ['yes', 'Yes, as in the game']] },
      { key: 'buyMults', label: 'Player buys at (P, N, D, E)', def: '0.6, 1.1, 1.5, 2.0', list: true },
      { key: 'sellMults', label: 'Player sells at (P, N, D, E)', def: '0.5, 0.9, 1.3, 1.7', list: true },
      { key: 'impact', label: 'Impact per unit', unit: '%', def: 0.03, scale: 100, model: 'impact' },
      { key: 'halfLifeHours', label: 'Recovery half-life', unit: 'h', def: 12, model: 'impact' },
      { key: 'priceFloor', label: 'Price floor', unit: '% of base', def: 0.3, scale: 100, model: 'impact' },
      { key: 'priceCap', label: 'Price cap', unit: '% of base', def: 3, scale: 100, model: 'impact' },
      { key: 'dailySupply', label: 'Stock of own product', unit: '/day', def: 20, model: 'daily' },
      { key: 'dailyDemand', label: 'Demand at premium', unit: '/day', def: 10, model: 'daily' },
      { key: 'restockCapDays', label: 'Stock piles up for', unit: 'days', def: 1, model: 'daily' },
      { key: 'newsMult', label: 'Market news: pays', unit: '% of base, 0 = off', def: 0, scale: 100 },
      { key: 'newsDemand', label: 'Market news: wants', unit: 'units', def: 10 },
    ],
  },
  {
    title: 'Events',
    params: [
      { key: 'eventRule', label: 'When', def: 'alternate', options: [['alternate', 'Each visit, not the same system twice in a row'], ['daily', 'Once per system per galactic day']] },
      { key: 'weightDice', label: 'Weight: dice', def: 1 },
      { key: 'weightContainer', label: 'Weight: container', def: 1 },
      { key: 'weightMission', label: 'Weight: mission', def: 1 },
      { key: 'diceStakes', label: 'Dice stake by ship', def: '100', list: true },
      { key: 'diceFold', label: 'House throws first, fold for half', def: 'no', options: [['no', 'No (v0.1, v0.2)'], ['yes', 'Yes (v0.3)']] },
      { key: 'containerPrice', label: 'Container price', def: 200, step: 50 },
      { key: 'containerMin', label: 'Container units, min', def: 3 },
      { key: 'containerMax', label: 'Container units, max', def: 12 },
      { key: 'containerJunk', label: 'Junk only', unit: '%', def: 0.1, scale: 100 },
      { key: 'missionPerMeter', label: 'Mission pay per meter', def: 0.5, step: 0.05 },
      { key: 'missionDeadlines', label: 'Deadlines', unit: 'h', def: '12, 24, 48, 72', list: true },
      { key: 'missionMults', label: 'Deadline multipliers', def: '4, 2.5, 1.5, 1', list: true },
      { key: 'missionUnits', label: 'Mission cargo', unit: 'units', def: 5 },
      { key: 'missionMax', label: 'Missions at once', def: 3 },
      { key: 'missionRange', label: 'Destination', def: 'any', options: [['any', 'Any own system'], ['area', 'Same area only'], ['ship', 'Within the ship’s range']] },
      { key: 'longMissionKm', label: 'Longer missions only Fri–Sat, due Sun 20:00', unit: 'km, 0 = off', def: 0, step: 0.5 },
    ],
  },
  {
    title: 'Artifacts',
    params: [
      { key: 'artifactCount', label: 'Artifacts', def: 36 },
      { key: 'artifactBase', label: 'Base chance per container', unit: '%', def: 0.04, scale: 100, step: 0.5 },
      { key: 'artifactStep', label: 'Plus per empty container', unit: 'p.p.', def: 0.03, scale: 100, step: 0.5 },
      { key: 'artifactPerKm', label: 'Plus per km between systems', unit: 'p.p.', def: 0, scale: 100, step: 0.1 },
      { key: 'artifactLegCapKm', label: 'Longer legs are commutes, not counted', unit: 'km, 0 = all count', def: 0, step: 0.5 },
      { key: 'artifactKmPerDay', label: 'Km counted per day, at most', unit: '0 = all', def: 0, step: 0.5 },
      { key: 'artifactKmPerWeekendDay', label: 'Km counted per weekend day', unit: '0 = as weekdays', def: 0, step: 0.5 },
      { key: 'artifactCap', label: 'Chance cap', unit: '%', def: 0.4, scale: 100 },
    ],
  },
  {
    title: 'Mining',
    params: [
      { key: 'miningDistance', label: 'Asteroids from this far from any system', unit: 'm, 0 = no mining', def: 0, step: 50 },
      { key: 'miningSpacing', label: 'One Substances per', unit: 'm walked out there', def: 200, step: 25 },
    ],
  },
  {
    title: 'Run',
    params: [
      { key: 'players', label: 'Players', def: 100, step: 50 },
      { key: 'days', label: 'Days', def: 270, step: 30 },
      { key: 'seed', label: 'Seed', def: 1 },
    ],
  },
];

export const DEFAULTS = Object.fromEntries(PARAM_GROUPS.flatMap((g) => g.params).map((p) => [p.key, p.def]));

// Presets are overrides on top of DEFAULTS.
export const PRESETS = {
  'GDD v0.1': {},
  'Proposal v0.2': {
    maxSystems: 8,
    coordPricing: 'area',
    economyRule: 'choose',
    shipPrices: '0, 3000, 15000, 80000',
    marketModel: 'daily',
    sellMults: '0.5, 0.8, 1.3, 1.7',
    dailySupply: 5,
    dailyDemand: 4,
    restockCapDays: 2,
    newsMult: 2,
    newsDemand: 10,
    eventRule: 'daily',
    diceStakes: '100, 250, 500, 1000',
    containerPrice: 300,
    containerMin: 2,
    containerMax: 6,
    missionPerMeter: 0.15,
    missionDeadlines: '24, 48, 72',
    missionMults: '1.5, 1.2, 1',
    missionRange: 'area',
    artifactBase: 0.01,
    artifactStep: 0,
    artifactPerKm: 0.005,
    artifactLegCapKm: 2,
    artifactKmPerDay: 3,
    artifactCap: 0.5,
  },
};

// v0.3: the ship is the measure of progress (no ranks). It sets the hold, how
// many systems the captain may have and how far deliveries go. Credits are
// on a calorie scale, about 60 per km walked; weekends bring long walks.
PRESETS['Proposal v0.3'] = {
  ...PRESETS['Proposal v0.2'],
  shipNames: 'Capsule, Mote, Tinderbox, Kestrin, Grindle, Rookhaul, Bulwark, Lightbarque, Choirship, Discovery',
  shipHolds: '5, 10, 15, 20, 30, 40, 55, 70, 85, 100',
  shipSystems: '2, 3, 5, 8, 12, 17, 23, 30, 38, 999',
  shipMissionKm: '0, 1, 2, 3, 4, 5, 6, 7, 8, 9',
  shipPrices: '0, 300, 1000, 3500, 7000, 11000, 17000, 24000, 32000, 55000',
  startShip: 1,
  basePrices: '4, 6, 8, 16, 24',
  roundPrices: 'yes',
  sellMults: '0.5, 0.8, 1.1, 1.4',
  dailySupply: 3,
  dailyDemand: 3,
  startCredits: 100,
  coordBase: 300,
  diceStakes: '10, 20, 20, 30, 40, 50, 60, 80, 100, 120',
  diceFold: 'yes',
  containerPrice: 60,
  missionPerMeter: 0.08,
  missionRange: 'ship',
  longMissionKm: 3,
  artifactPerKm: 0.004,
  artifactLegCapKm: 0,
  artifactKmPerWeekendDay: 15,
  weekendWalkMinutes: 150,
  newAreaKm: 3,
  miningDistance: 200,
  miningSpacing: 200,
  days: 400,
};

const LIST_PARAMS = PARAM_GROUPS.flatMap((g) => g.params).filter((p) => p.list);

// Turns list fields ('10, 20') into arrays and fills in anything missing.
export function normalizeParams(input) {
  const p = { ...DEFAULTS, ...input };
  for (const { key, text } of LIST_PARAMS) {
    if (typeof p[key] !== 'string') continue;
    p[key] = text ? p[key].split(',').map((item) => item.trim()).filter(Boolean) : p[key].split(/[,;\s]+/).filter(Boolean).map(Number);
  }
  return p;
}

// ---------------------------------------------------------------- helpers

function mulberry32(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);

// Galactic day: everything refreshes at 04:00, so a late walk and the next
// morning's are different days, but nobody walks at the boundary.
const galacticDay = (hours) => Math.floor((hours - 4) / 24);

// Hex sectors 3-colored by (q - r) mod 3, so every sector touches both other
// kinds. Rotation and offset differ per player, as World IDs would.
function makeSectorMap(rng, diameter) {
  const size = diameter / 2;
  const angle = rng() * (Math.PI / 3);
  const cos = Math.cos(angle);
  const sin = Math.sin(angle);
  const ox = rng() * diameter * 3;
  const oy = rng() * diameter * 3;
  return (x, y) => {
    const px = x * cos - y * sin + ox;
    const py = x * sin + y * cos + oy;
    const q = ((Math.sqrt(3) / 3) * px - py / 3) / size;
    const r = ((2 / 3) * py) / size;
    let rq = Math.round(q);
    let rr = Math.round(r);
    const rs = Math.round(-q - r);
    const dq = Math.abs(rq - q);
    const dr = Math.abs(rr - r);
    const ds = Math.abs(rs + q + r);
    if (dq > dr && dq > ds) rq = -rr - rs;
    else if (dr > ds) rr = -rq - rs;
    return (((rq - rr) % 3) + 3) % 3;
  };
}

function rollPlanets(rng, sector) {
  const count = 1 + Math.floor(rng() * 4);
  const planets = [];
  for (let i = 0; i < count; i++) {
    if (sector === 0) planets.push(rng() < 0.5 ? 0 : 1);
    else if (sector === 1) planets.push(rng() < 0.5 ? 2 : 3);
    else planets.push(i === 0 ? 4 : Math.floor(rng() * 4));
  }
  return planets;
}

// Premium per unit for carrying the product of economy a to a market of economy b.
function carryValue(a, b, p) {
  const good = PRODUCES[a];
  return p.basePrices[good] * Math.max(0, p.sellMults[REL[b][good]] - p.buyMults[0]);
}

// How much a new system of economy e adds to the trade network.
function economyScore(e, systems, p) {
  let score = systems.some((s) => s.economy === e) ? 0 : 1;
  for (const s of systems) score += carryValue(e, s.economy, p) + carryValue(s.economy, e, p);
  return score;
}

// ---------------------------------------------------------------- markets

function newMarket(economy, hours, p) {
  const m = { level: new Float64Array(5).fill(1), stock: p.dailySupply, demand: new Float64Array(5), stamp: hours, day: galacticDay(hours) };
  for (let g = 0; g < 5; g++) if (IS_PREMIUM[REL[economy][g]]) m.demand[g] = p.dailyDemand;
  return m;
}

function refreshMarket(sys, hours, p) {
  const m = sys.market;
  if (p.marketModel === 'impact') {
    const k = Math.pow(0.5, (hours - m.stamp) / p.halfLifeHours);
    for (let g = 0; g < 5; g++) m.level[g] = 1 + (m.level[g] - 1) * k;
    m.stamp = hours;
  } else {
    const day = galacticDay(hours);
    const elapsed = day - m.day;
    if (elapsed > 0) {
      const cap = p.restockCapDays;
      m.stock = Math.min(p.dailySupply * cap, m.stock + p.dailySupply * elapsed);
      for (let g = 0; g < 5; g++) {
        if (IS_PREMIUM[REL[sys.economy][g]]) m.demand[g] = Math.min(p.dailyDemand * cap, m.demand[g] + p.dailyDemand * elapsed);
      }
      m.day = day;
    }
  }
}

function levelBounds(rel, p) {
  return [p.priceFloor / p.sellMults[rel], p.priceCap / p.buyMults[rel]];
}

// The game rounds prices to whole credits, which matters once they are small.
const whole = (value, p) => (p.roundPrices === 'yes' ? Math.round(value) : value);

function buyPrice(sys, p) {
  const g = PRODUCES[sys.economy];
  const level = p.marketModel === 'impact' ? sys.market.level[g] : 1;
  return whole(p.basePrices[g] * p.buyMults[0] * level, p);
}

// Market news: today one system in each area pays extra for one good.
const hasNews = (sys, g) => sys.news && sys.news.good === g && sys.news.left >= 1;

function sellPrice(sys, g, p) {
  if (hasNews(sys, g)) return whole(p.basePrices[g] * p.newsMult, p);
  const rel = REL[sys.economy][g];
  if (p.marketModel === 'impact') return p.basePrices[g] * p.sellMults[rel] * sys.market.level[g];
  if (IS_PREMIUM[rel] && sys.market.demand[g] >= 1) return whole(p.basePrices[g] * p.sellMults[rel], p);
  return whole(p.basePrices[g] * p.sellMults[rel === 0 ? 0 : 1], p);
}

function recordSale(sys, g, p) {
  if (hasNews(sys, g)) {
    sys.news.left -= 1;
    return;
  }
  const m = sys.market;
  const rel = REL[sys.economy][g];
  if (p.marketModel === 'impact') {
    const [lo] = levelBounds(rel, p);
    m.level[g] = Math.max(lo, m.level[g] * (1 - p.impact));
  } else if (IS_PREMIUM[rel] && m.demand[g] >= 1) {
    m.demand[g] -= 1;
  }
}

function recordPurchase(sys, p) {
  const m = sys.market;
  const g = PRODUCES[sys.economy];
  if (p.marketModel === 'impact') {
    const [, hi] = levelBounds(0, p);
    m.level[g] = Math.min(hi, m.level[g] * (1 + p.impact));
  } else {
    m.stock -= 1;
  }
}

// Where units of good g could be sold: a list of { price, cap, here }.
// `fresh` means a later galactic day (daily stock back, impact partly recovered),
// discounted by `factor` because a sale today beats one tomorrow.
function pushSellSlots(out, sys, g, p, fresh, factor, here, units) {
  if (!fresh && hasNews(sys, g)) out.push({ price: whole(p.basePrices[g] * p.newsMult, p) * factor, cap: Math.floor(sys.news.left), here });
  const rel = REL[sys.economy][g];
  if (p.marketModel === 'daily') {
    const fallback = whole(p.basePrices[g] * p.sellMults[rel === 0 ? 0 : 1], p) * factor;
    if (IS_PREMIUM[rel]) {
      const cap = fresh ? p.dailyDemand : Math.floor(sys.market.demand[g]);
      if (cap > 0) out.push({ price: whole(p.basePrices[g] * p.sellMults[rel], p) * factor, cap, here });
    }
    out.push({ price: fallback, cap: Infinity, here });
    return;
  }
  let level = sys.market.level[g];
  if (fresh) level = 1 + (level - 1) * Math.pow(0.5, 24 / p.halfLifeHours);
  const [lo] = levelBounds(rel, p);
  // Chunks keep this cheap; each chunk is priced at its middle unit.
  const chunk = Math.max(1, Math.ceil(units / 8));
  for (let i = 0; i < units; i += chunk) {
    const mid = Math.max(lo, level * Math.pow(1 - p.impact, i + (chunk - 1) / 2));
    out.push({ price: p.basePrices[g] * p.sellMults[rel] * mid * factor, cap: chunk, here });
  }
}

const bySlotPrice = (a, b) => b.price - a.price || (b.here ? 1 : 0) - (a.here ? 1 : 0);

// ---------------------------------------------------------------- one player

function holdOf(st, p) {
  return p.shipHolds[st.tier];
}

function cargoUsed(st) {
  let used = 0;
  for (let g = 0; g < 5; g++) used += st.cargo[g];
  for (const m of st.missions) used += m.units;
  return used;
}

const inArea = (st, area) => st.systems.filter((s) => s.area === area);

// Of the places that come to mind, the captain picks the one that lengthens the
// area's loop least. The first system of an area is its anchor: home, or work.
function tryPlaceSystem(st, p, hours, area = 0) {
  const local = inArea(st, area);
  const home = local[0];
  const tour = home ? planLoop(local, p, Infinity) : [];
  let pos = null;
  let bestCost = Infinity;
  for (let attempt = 0, found = 0; attempt < 60 && found < p.placeChoices; attempt++) {
    const r = st.placeRadius * Math.sqrt(st.rng());
    const a = st.rng() * Math.PI * 2;
    const c = home ? { x: home.x + r * Math.cos(a), y: home.y + r * Math.sin(a) } : { ...st.areas[area].center };
    if (st.systems.some((s) => dist(s, c) < p.minSpacing)) continue;
    found++;
    let cost = 0;
    if (home) {
      cost = Infinity;
      for (let i = 1; i < tour.length; i++) cost = Math.min(cost, dist(tour[i - 1], c) + dist(c, tour[i]) - dist(tour[i - 1], tour[i]));
    }
    if (cost < bestCost) {
      bestCost = cost;
      pos = c;
    }
  }
  if (pos) {
    const sector = st.sectorAt(pos.x, pos.y);
    const planets = rollPlanets(st.rng, sector);
    let economy = planets[0];
    if (p.economyRule === 'choose') {
      let best = -1;
      for (const e of new Set(planets)) {
        const score = economyScore(e, st.systems, p);
        if (score > best) {
          best = score;
          economy = e;
        }
      }
    }
    const sys = { id: st.systems.length, area, x: pos.x, y: pos.y, sector, economy, market: newMarket(economy, hours, p), lastEventDay: -1 };
    st.systems.push(sys);
    return sys;
  }
  return null;
}

// Walking minutes of a closed tour through `tour` (system list, home first and last).
function tourMinutes(tour, p) {
  let meters = 0;
  for (let i = 1; i < tour.length; i++) meters += dist(tour[i - 1], tour[i]);
  return (meters * p.detour) / ((p.walkSpeedKmh * 1000) / 60) + (tour.length - 1) * p.stopMinutes;
}

// Cheapest-insertion loop from home within the walk budget. `noise` varies the
// route from day to day when the network is bigger than one walk.
function planLoop(systems, p, budget, rng) {
  const home = systems[0];
  const tour = [home, home];
  const left = systems.slice(1).map((s) => ({ s, noise: rng ? (s.news ? 0.2 : 0.7 + rng() * 0.6) : 1 }));
  while (left.length) {
    let best = null;
    for (const item of left) {
      for (let i = 1; i < tour.length; i++) {
        const cost = (dist(tour[i - 1], item.s) + dist(item.s, tour[i]) - dist(tour[i - 1], tour[i])) * item.noise;
        if (!best || cost < best.cost) best = { item, i, cost };
      }
    }
    const trial = tour.slice();
    trial.splice(best.i, 0, best.item.s);
    left.splice(left.indexOf(best.item), 1);
    if (tourMinutes(trial, p) <= budget) tour.splice(best.i, 0, best.item.s);
  }
  return tour;
}

function planPingPong(systems, p, budget) {
  const home = systems[0];
  let near = null;
  for (const s of systems.slice(1)) if (!near || dist(home, s) < dist(home, near)) near = s;
  const tour = [home];
  if (!near) return tour;
  for (;;) {
    const trial = [...tour, tour.length % 2 ? near : home];
    if (tourMinutes(trial, p) > budget) break;
    tour.push(trial[trial.length - 1]);
  }
  return tour;
}

function newPlayer(p, seed) {
  const rng = mulberry32(seed);
  const budgetMeters = (p.walkMinutes * p.walkSpeedKmh * 1000) / 60 / p.detour;
  const st = {
    rng,
    sectorAt: makeSectorMap(rng, p.sectorSize),
    // Someone who walks 15 minutes puts their systems closer than someone who walks two hours.
    placeRadius: Math.max(p.minSpacing * 1.2, Math.min(p.placementRadius, budgetMeters * 0.3)),
    systems: [],
    credits: p.startCredits,
    tier: p.startShip,
    cargo: new Float64Array(5),
    missions: [],
    coordsBought: 0,
    // Home area, optionally a second one (work, family) a commute away with a
    // walk of its own, and areas opened later for weekend walks.
    areas: [{ center: { x: 0, y: 0 }, wants: true, kind: 'home' }],
    artifacts: 0,
    emptyContainers: 0,
    kmSinceArtifact: 0,
    lastEventSystem: -1,
    spentShips: 0,
    spentCoords: 0,
    minedCarry: 0,
    totals: { mined: 0, sales: 0, buys: 0, missions: 0, missionsDone: 0, missionsFailed: 0, dice: 0, diceGames: 0, containerSpend: 0, containers: 0, containerValue: 0, events: 0 },
  };
  if (p.secondAreaKm > 0) {
    const a = rng() * Math.PI * 2;
    st.areas.push({ center: { x: p.secondAreaKm * 1000 * Math.cos(a), y: p.secondAreaKm * 1000 * Math.sin(a) }, wants: true, kind: 'second' });
  }
  for (let i = 0; i < p.startCoords; i++) tryPlaceSystem(st, p, 0);
  return st;
}

function earned(st, p) {
  let cargo = 0;
  for (let g = 0; g < 5; g++) cargo += st.cargo[g] * p.basePrices[g] * p.buyMults[0];
  return st.credits + cargo + st.spentShips + st.spentCoords - p.startCredits;
}

function runEvent(st, sys, ctx, p) {
  const { day, hours } = ctx;
  if (p.eventRule === 'daily' ? sys.lastEventDay === day : st.lastEventSystem === sys.id) return;
  const options = [];
  const stake = p.diceStakes[Math.min(st.tier, p.diceStakes.length - 1)];
  if (st.credits >= stake && p.weightDice > 0) options.push(['dice', p.weightDice]);
  if (st.credits >= p.containerPrice && p.weightContainer > 0) options.push(['container', p.weightContainer]);
  const targets = missionTargets(st, sys, ctx, p);
  if (targets.length && p.weightMission > 0) options.push(['mission', p.weightMission]);
  if (!options.length) return;
  let roll = st.rng() * options.reduce((s, o) => s + o[1], 0);
  let kind = options[0][0];
  for (const [k, w] of options) {
    if ((roll -= w) < 0) {
      kind = k;
      break;
    }
  }
  sys.lastEventDay = day;
  st.lastEventSystem = sys.id;
  st.totals.events++;

  if (kind === 'dice') {
    // A cautious captain only plays with money to spare.
    if (st.credits < stake * 3) return;
    const d = () => 2 + Math.floor(st.rng() * 6) + Math.floor(st.rng() * 6);
    const house = d();
    // v0.3: the house throws first; the captain folds for half when the odds are poor.
    if (p.diceFold === 'yes' && diceWinChance(house) < 0.25) {
      const loss = Math.ceil(stake / 2);
      st.credits -= loss;
      st.totals.dice -= loss;
      st.totals.diceGames++;
      return;
    }
    const win = d() > house;
    st.credits += win ? stake : -stake;
    st.totals.dice += win ? stake : -stake;
    st.totals.diceGames++;
  } else if (kind === 'container') {
    if (st.credits < p.containerPrice * 2) return;
    st.credits -= p.containerPrice;
    st.totals.containerSpend += p.containerPrice;
    st.totals.containers++;
    if (st.artifacts < p.artifactCount) {
      const chance = Math.min(p.artifactCap, p.artifactBase + p.artifactStep * st.emptyContainers + p.artifactPerKm * st.kmSinceArtifact);
      if (st.rng() < chance) {
        st.artifacts++;
        st.emptyContainers = 0;
        st.kmSinceArtifact = 0;
      } else {
        st.emptyContainers++;
      }
    }
    if (st.rng() >= p.containerJunk) {
      const g = Math.floor(st.rng() * 5);
      const units = p.containerMin + Math.floor(st.rng() * (p.containerMax - p.containerMin + 1));
      const kept = Math.max(0, Math.min(units, holdOf(st, p) - cargoUsed(st)));
      st.cargo[g] += kept;
      st.totals.containerValue += kept * p.basePrices[g] * p.sellMults[1];
    }
  } else {
    if (st.missions.length >= p.missionMax || holdOf(st, p) < p.missionUnits) return;
    const dest = targets[Math.floor(st.rng() * targets.length)];
    // When will the captain get there: later on this walk, or on the next walk?
    const later = ctx.arrivals.findIndex((a, i) => i > ctx.stopIndex && ctx.route[i] === dest);
    const eta = later >= 0 ? ctx.arrivals[later] - hours : ctx.nextWalkHours - hours + 1;
    // Only jobs the captain's walks will actually pass: weekday walks stay in
    // their areas, the weekend walk reaches what it reaches.
    const reachable = later >= 0 || (ctx.nextIsWeekend ? weekendReach(st, p, ctx).has(dest) : st.areas[dest.area].kind !== 'weekend');
    if (!reachable) return;
    let deadlineHours;
    let reward;
    if (p.longMissionKm > 0 && dist(sys, dest) > p.longMissionKm * 1000) {
      // A weekend job: due on Sunday at 20:00. Taken if the weekend walk can do it.
      deadlineHours = (ctx.dayIndex + (6 - ctx.weekday)) * 24 + 20 - hours;
      if (later < 0 && !(p.weekendWalkMinutes > 0 && ctx.weekday < 6 && weekendReach(st, p, ctx).has(dest))) return;
      reward = Math.round(p.missionPerMeter * dist(sys, dest));
    } else {
      let pick = -1;
      for (let i = 0; i < p.missionDeadlines.length; i++) {
        if (p.missionDeadlines[i] >= eta + 0.5 && (pick < 0 || p.missionDeadlines[i] < p.missionDeadlines[pick])) pick = i;
      }
      if (pick < 0) return;
      deadlineHours = p.missionDeadlines[pick];
      reward = Math.round(p.missionPerMeter * dist(sys, dest) * (p.missionMults[pick] ?? 1));
    }
    // A full hold makes room by selling its cheapest cargo here, if the pay is worth it.
    let need = p.missionUnits - (holdOf(st, p) - cargoUsed(st));
    if (need > 0) {
      const order = [0, 1, 2, 3, 4].sort((a, b) => p.basePrices[a] - p.basePrices[b]);
      let value = 0;
      let left = need;
      for (const g of order) {
        const n = Math.min(left, Math.round(st.cargo[g]));
        value += n * p.basePrices[g];
        left -= n;
      }
      if (left > 0 || reward < value) return;
      for (const g of order) {
        while (need > 0 && st.cargo[g] >= 1) {
          sellUnit(st, sys, g, p);
          need--;
        }
      }
    }
    st.missions.push({ dest, units: p.missionUnits, deadline: hours + deadlineHours, reward });
  }
}

// Asteroid mining (v0.3): one Substances for every miningSpacing meters walked
// further than miningDistance from all systems, while the hold has room. The
// mined areas don't last to the next walk, so only the leg itself matters.
function mine(st, from, to, p) {
  if (!(p.miningDistance > 0)) return;
  const length = dist(from, to);
  const steps = Math.ceil(length / 25);
  let far = 0;
  for (let k = 0; k < steps; k++) {
    const t = (k + 0.5) / steps;
    const point = { x: from.x + (to.x - from.x) * t, y: from.y + (to.y - from.y) * t };
    if (st.systems.every((s) => dist(s, point) > p.miningDistance)) far += length / steps;
  }
  st.minedCarry += far / p.miningSpacing;
  const units = Math.min(Math.floor(st.minedCarry), Math.max(0, Math.floor(holdOf(st, p) - cargoUsed(st))));
  st.minedCarry -= Math.floor(st.minedCarry);
  st.cargo[2] += units;
  st.totals.mined += units;
}

// The systems a weekend walk from home would pass, worked out once a day.
function weekendReach(st, p, ctx) {
  ctx.weekendReach ??= new Set(planLoop(st.systems, p, p.weekendWalkMinutes));
  return ctx.weekendReach;
}

// Where a delivery from this system may go: the same area (v0.2), the ship's
// range (v0.3), or anywhere. Jobs longer than longMissionKm only on Fri and Sat.
function missionTargets(st, sys, ctx, p) {
  const range = p.missionRange === 'ship' ? (p.shipMissionKm[st.tier] ?? 0) * 1000 : Infinity;
  const longOk = !(p.longMissionKm > 0) || ctx.weekday === 4 || ctx.weekday === 5;
  return st.systems.filter((s) => {
    if (s === sys) return false;
    if (p.missionRange === 'area' && s.area !== sys.area) return false;
    const d = dist(s, sys);
    if (d > range) return false;
    return longOk || d <= p.longMissionKm * 1000;
  });
}

// The chance that 2d6 beats a house total.
function diceWinChance(house) {
  let wins = 0;
  for (let a = 1; a <= 6; a++) for (let b = 1; b <= 6; b++) if (a + b > house) wins++;
  return wins / 36;
}

function sellUnit(st, sys, g, p) {
  const price = sellPrice(sys, g, p);
  st.credits += price;
  st.totals.sales += price;
  st.cargo[g] -= 1;
  recordSale(sys, g, p);
}

// Sell what this market pays best for, then buy its product if a later stop
// pays enough more. The captain knows today's route and expects a similar one tomorrow.
function trade(st, sys, ctx, p) {
  const ahead = [];
  const seen = new Set([sys]);
  for (let i = ctx.stopIndex + 1; i < ctx.route.length; i++) {
    const s = ctx.route[i];
    if (!seen.has(s)) {
      seen.add(s);
      ahead.push([s, false, 1]);
    }
  }
  for (const s of new Set(ctx.route)) ahead.push([s, true, 0.95]);

  for (let g = 0; g < 5; g++) {
    const units = Math.round(st.cargo[g]);
    if (!units) continue;
    const slots = [];
    pushSellSlots(slots, sys, g, p, false, 1, true, units);
    for (const [s, fresh, factor] of ahead) pushSellSlots(slots, s, g, p, fresh, factor, false, units);
    slots.sort(bySlotPrice);
    let left = units;
    let sellHere = 0;
    for (const slot of slots) {
      const n = Math.min(left, slot.cap);
      if (slot.here) sellHere += n;
      left -= n;
      if (!left) break;
    }
    for (let i = 0; i < sellHere; i++) sellUnit(st, sys, g, p);
  }

  const g = PRODUCES[sys.economy];
  const room = holdOf(st, p) - cargoUsed(st);
  if (room <= 0) return;
  const slots = [];
  for (const [s, fresh, factor] of ahead) if (s !== sys) pushSellSlots(slots, s, g, p, fresh, factor, false, room + st.cargo[g]);
  slots.sort(bySlotPrice);
  // Units already aboard take the best outlets first.
  let skip = Math.round(st.cargo[g]);
  let si = 0;
  let used = 0;
  while (si < slots.length && skip > 0) {
    const n = Math.min(skip, slots[si].cap - used);
    skip -= n;
    used += n;
    if (used >= slots[si].cap) {
      si++;
      used = 0;
    }
  }
  for (let bought = 0; bought < room; bought++) {
    if (p.marketModel === 'daily' && sys.market.stock < 1) break;
    const price = buyPrice(sys, p);
    if (si >= slots.length || slots[si].price < price * 1.1 || st.credits < price) break;
    st.credits -= price;
    st.totals.buys += price;
    st.cargo[g] += 1;
    recordPurchase(sys, p);
    if (++used >= slots[si].cap) {
      si++;
      used = 0;
    }
  }
}

// Working capital: enough to fill the hold with an average good.
function reserveFor(hold, p) {
  const average = p.basePrices.reduce((a, b) => a + b, 0) / p.basePrices.length;
  return hold * average * p.buyMults[0];
}

function shop(st, p, hours) {
  const reserve = reserveFor(holdOf(st, p), p);
  // The ship caps how many systems the captain may have in all.
  const roomForSystems = st.systems.length < (p.shipSystems[st.tier] ?? Infinity);
  // The second area only starts once home is as big as the walk allows.
  let area = st.areas.findIndex((a, i) => a.wants && inArea(st, i).length < p.maxSystems);
  if (area < 0 && roomForSystems && p.newAreaKm > 0) {
    // Home is done: a new area a few km away, in a direction not used yet.
    const a = st.rng() * Math.PI * 2;
    st.areas.push({ center: { x: p.newAreaKm * 1000 * Math.cos(a), y: p.newAreaKm * 1000 * Math.sin(a) }, wants: true, kind: 'weekend' });
    area = st.areas.length - 1;
  }
  if (area >= 0 && roomForSystems) {
    // Paid on discovery: priced by the systems nearby, or by all of them.
    const count = p.coordPricing === 'area' ? Math.max(0, inArea(st, area).length - p.startCoords) : st.coordsBought;
    const coordPrice = p.coordBase * Math.pow(p.coordGrowth, count);
    if (st.credits >= coordPrice + reserve) {
      if (tryPlaceSystem(st, p, hours, area)) {
        st.credits -= coordPrice;
        st.spentCoords += coordPrice;
        st.coordsBought++;
        // Weekend areas fill up to the area limit; the others only as far as their walk reaches.
        if (st.areas[area].kind !== 'weekend') st.areas[area].wants = tourMinutes(planLoop(inArea(st, area), p, Infinity), p) <= p.walkMinutes * p.fillFactor;
      } else {
        st.areas[area].wants = false;
      }
      return;
    }
  }
  const next = st.tier + 1;
  if (next < p.shipHolds.length) {
    const cost = p.shipPrices[next] - p.shipPrices[st.tier] * p.tradeIn;
    if (st.credits >= cost + reserveFor(p.shipHolds[next], p)) {
      st.credits -= cost;
      st.spentShips += cost;
      st.tier = next;
    }
  }
}

function walkSchedule(rng, p, days) {
  const walks = new Uint8Array(days);
  const perWeek = Math.max(0, Math.min(7, Math.round(p.walksPerWeek)));
  for (let w = 0; w * 7 < days; w++) {
    const week = [0, 1, 2, 3, 4, 5, 6];
    for (let i = 0; i < perWeek; i++) {
      const j = i + Math.floor(rng() * (7 - i));
      [week[i], week[j]] = [week[j], week[i]];
      if (w * 7 + week[i] < days) walks[w * 7 + week[i]] = 1;
    }
  }
  return walks;
}

// A walk in the second area at lunch, the home walk in the evening.
const WALK_HOURS = [17, 12];

export function simulatePlayer(input, seed, days) {
  const p = input.basePrices instanceof Array ? input : normalizeParams(input);
  const st = newPlayer(p, seed);
  const walks = walkSchedule(st.rng, p, days);
  const speed = (p.walkSpeedKmh * 1000) / 60;
  const series = { earned: new Float64Array(days), systems: new Uint8Array(days), tier: new Uint8Array(days), artifacts: new Uint8Array(days), km: new Float64Array(days) };
  const daily = { walks: 0, km: 0, stops: 0, events: 0, minutes: 0 };
  let totalKm = 0;
  const start = { identical: st.systems.length >= 2 && st.systems[0].economy === st.systems[1].economy, weekTrade: 0 };

  for (let day = 0; day < days; day++) {
    if (walks[day]) {
      // The day's stops in order, walk by walk, so trading and missions can look ahead across walks.
      const route = [];
      const arrivals = [];
      const walkStart = [];
      let kmToday = 0;
      for (const s of st.systems) s.news = null;
      if (p.newsMult > 0) {
        for (let area = 0; area < st.areas.length; area++) {
          const local = inArea(st, area);
          if (local.length < 2) continue;
          const sys = local[Math.floor(st.rng() * local.length)];
          const goods = [0, 1, 2, 3, 4].filter((g) => g !== PRODUCES[sys.economy]);
          sys.news = { good: goods[Math.floor(st.rng() * goods.length)], left: p.newsDemand };
        }
      }
      // Days run Monday (0) to Sunday (6).
      const weekday = day % 7;
      const weekend = weekday >= 5 && p.weekendWalkMinutes > 0;
      // Weekdays: a walk at home, and one in the second area if there is one.
      // Weekends: one long walk from home through any systems it can reach.
      const plans = weekend
        ? [{ systems: st.systems, budget: p.weekendWalkMinutes, hour: 10 }]
        : st.areas
            .map((a, i) => ({ a, i }))
            .filter(({ a, i }) => a.kind !== 'weekend' && inArea(st, i).length)
            .sort((x, y) => WALK_HOURS[x.i] - WALK_HOURS[y.i])
            .map(({ i }) => ({ systems: inArea(st, i), budget: p.walkMinutes, hour: WALK_HOURS[i], area: i }));
      for (const plan of plans) {
        const local = plan.systems;
        let walk;
        if (local.length === 1) walk = [local[0]];
        else if (p.persona === 'pingpong' && plan.area === 0) walk = planPingPong(local, p, plan.budget);
        else walk = planLoop(local, p, plan.budget, st.rng);
        let t = day * 24 + plan.hour;
        for (let i = 0; i < walk.length; i++) {
          if (i > 0) t += (dist(walk[i - 1], walk[i]) * p.detour) / speed / 60 + p.stopMinutes / 60;
          walkStart.push(i === 0);
          route.push(walk[i]);
          arrivals.push(t);
        }
        daily.walks++;
        daily.minutes += (t - (day * 24 + plan.hour)) * 60;
      }
      let next = day + 1;
      while (next < days && !walks[next]) next++;
      const firstHour = plans[0]?.hour ?? 17;
      const nextIsWeekend = next % 7 >= 5 && p.weekendWalkMinutes > 0;
      const ctx = { day: galacticDay(day * 24 + firstHour), dayIndex: day, weekday, nextIsWeekend, route, arrivals, stopIndex: 0, hours: 0, nextWalkHours: next * 24 + (nextIsWeekend ? 10 : 17) };
      const kmCap = weekday >= 5 && p.artifactKmPerWeekendDay > 0 ? p.artifactKmPerWeekendDay : p.artifactKmPerDay;

      for (let i = 0; i < route.length; i++) {
        const sys = route[i];
        const hours = arrivals[i];
        ctx.stopIndex = i;
        ctx.hours = hours;
        if (i > 0) {
          // The game only sees straight lines between dockings, commutes included:
          // a leg longer than an area is a tram ride, and a daily cap keeps a
          // second walk elsewhere from doubling the pace of the collection.
          const km = dist(route[i - 1], sys) / 1000;
          if (!(p.artifactLegCapKm > 0 && km > p.artifactLegCapKm)) {
            const counted = kmCap > 0 ? Math.min(km, kmCap - kmToday) : km;
            kmToday += counted;
            st.kmSinceArtifact += counted;
          }
          if (!walkStart[i]) {
            daily.km += km * p.detour;
            totalKm += km * p.detour;
            mine(st, route[i - 1], sys, p);
          }
        }
        daily.stops++;
        refreshMarket(sys, hours, p);
        for (let m = st.missions.length - 1; m >= 0; m--) {
          const mission = st.missions[m];
          if (hours > mission.deadline) {
            st.missions.splice(m, 1);
            st.totals.missionsFailed++;
          } else if (mission.dest === sys) {
            st.credits += mission.reward;
            st.totals.missions += mission.reward;
            st.totals.missionsDone++;
            st.missions.splice(m, 1);
          }
        }
        const eventsBefore = st.totals.events;
        runEvent(st, sys, ctx, p);
        daily.events += st.totals.events - eventsBefore;
        trade(st, sys, ctx, p);
        shop(st, p, hours);
      }
    }
    if (day === 6) start.weekTrade = st.totals.sales - st.totals.buys;
    series.earned[day] = earned(st, p);
    series.systems[day] = st.systems.length;
    series.tier[day] = st.tier;
    series.artifacts[day] = st.artifacts;
    series.km[day] = totalKm;
  }
  return { series, totals: st.totals, daily, start, economies: st.systems.map((s) => s.economy) };
}

// ---------------------------------------------------------------- many players

// Milestones follow the ship list: each ship, the system counts ships allow,
// and the artifacts.
export function milestonesFor(p) {
  const list = [];
  const counts = [...new Set([3, 5, 8, ...p.shipSystems.filter((n) => n > 8 && n < 900)])].sort((a, b) => a - b);
  for (const n of counts) list.push({ label: `${n} systems`, test: (s, d) => s.systems[d] >= n });
  p.shipHolds.forEach((_, i) => {
    if (i > p.startShip) list.push({ label: p.shipNames[i] ?? `Ship ${i}`, test: (s, d) => s.tier[d] >= i });
  });
  list.push(
    { label: '1st artifact', test: (s, d) => s.artifacts[d] >= 1 },
    { label: '12 artifacts', test: (s, d) => s.artifacts[d] >= 12 },
    { label: '24 artifacts', test: (s, d) => s.artifacts[d] >= 24 },
    { label: 'All artifacts', test: (s, d) => s.artifacts[d] >= p.artifactCount },
  );
  return list;
}

function quantile(sorted, q) {
  if (!sorted.length) return NaN;
  const i = (sorted.length - 1) * q;
  const lo = Math.floor(i);
  return sorted[lo] + (sorted[Math.min(lo + 1, sorted.length - 1)] - sorted[lo]) * (i - lo);
}

const QS = [0.1, 0.5, 0.9];

export function simulate(input, onProgress) {
  const p = normalizeParams(input);
  const days = Math.max(1, Math.round(p.days));
  const players = Math.max(1, Math.round(p.players));
  const runs = [];
  for (let i = 0; i < players; i++) {
    runs.push(simulatePlayer(p, p.seed * 100003 + i, days));
    if (onProgress && i % 10 === 9) onProgress((i + 1) / players);
  }
  return summarize(runs, p, days);
}

function summarize(runs, p, days) {
  const band = (key) => {
    const out = QS.map(() => new Float64Array(days));
    const col = new Float64Array(runs.length);
    for (let d = 0; d < days; d++) {
      for (let r = 0; r < runs.length; r++) col[r] = runs[r].series[key][d];
      col.sort();
      QS.forEach((q, k) => (out[k][d] = quantile(col, q)));
    }
    return out.map((a) => Array.from(a));
  };

  const milestones = milestonesFor(p).map((m) => {
    const reached = [];
    for (const run of runs) {
      for (let d = 0; d < days; d++) {
        if (m.test(run.series, d, p)) {
          reached.push(d + 1);
          break;
        }
      }
    }
    reached.sort((a, b) => a - b);
    return { label: m.label, share: reached.length / runs.length, days: QS.map((q) => quantile(reached, q)) };
  });

  const sum = (f) => runs.reduce((s, r) => s + f(r), 0);
  const n = runs.length;
  const walks = sum((r) => r.daily.walks) || 1;
  const t = (k) => sum((r) => r.totals[k]) / n;
  const economyMix = [0, 0, 0, 0, 0];
  for (const r of runs) for (const e of r.economies) economyMix[e]++;

  // Credits per km walked, month by month: the "1 cr ≈ 1 kcal" check.
  const perKm = [];
  for (let m = 0; (m + 1) * 30 <= days; m++) {
    const from = m * 30 - 1;
    const to = (m + 1) * 30 - 1;
    const ratios = runs
      .map((r) => {
        const km = r.series.km[to] - (from >= 0 ? r.series.km[from] : 0);
        const cr = r.series.earned[to] - (from >= 0 ? r.series.earned[from] : 0);
        return km > 0 ? cr / km : NaN;
      })
      .filter(Number.isFinite)
      .sort((a, b) => a - b);
    perKm.push(quantile(ratios, 0.5));
  }

  return {
    days,
    players: n,
    perKm,
    earned: band('earned'),
    systems: band('systems'),
    artifacts: band('artifacts'),
    milestones,
    perPlayer: {
      trade: t('sales') - t('buys'),
      mined: t('mined'),
      missions: t('missions'),
      dice: t('dice'),
      containerSpend: t('containerSpend'),
      containerValue: t('containerValue'),
      containers: t('containers'),
      missionsDone: t('missionsDone'),
      missionsFailed: t('missionsFailed'),
      diceGames: t('diceGames'),
      events: t('events'),
    },
    perWalk: {
      km: sum((r) => r.daily.km) / walks,
      minutes: sum((r) => r.daily.minutes) / walks,
      stops: sum((r) => r.daily.stops) / walks,
      events: sum((r) => r.daily.events) / walks,
      walksPerPlayer: walks / n,
    },
    start: {
      identical: runs.filter((r) => r.start.identical).length / n,
      deadWeek: runs.filter((r) => r.start.weekTrade <= 0).length / n,
    },
    economyMix: economyMix.map((c) => c / economyMix.reduce((a, b) => a + b, 0)),
  };
}

// How rewards respond to walking habits: median earnings and artifacts after
// `days` for each walk length and frequency.
export const SWEEP_MINUTES = [15, 30, 45, 60, 90, 120];
export const SWEEP_PER_WEEK = [7, 5, 3, 1];

export function sweep(input, { players = 40, days = 90 } = {}, onProgress) {
  const p = normalizeParams(input);
  const cells = [];
  let done = 0;
  const total = SWEEP_MINUTES.length * SWEEP_PER_WEEK.length;
  for (const perWeek of SWEEP_PER_WEEK) {
    for (const minutes of SWEEP_MINUTES) {
      const q = { ...p, walkMinutes: minutes, walksPerWeek: perWeek, persona: 'loop' };
      const earnedAt = [];
      const artifactsAt = [];
      for (let i = 0; i < players; i++) {
        const run = simulatePlayer(q, p.seed * 7919 + i, days);
        earnedAt.push(run.series.earned[days - 1]);
        artifactsAt.push(run.series.artifacts[days - 1]);
      }
      earnedAt.sort((a, b) => a - b);
      artifactsAt.sort((a, b) => a - b);
      cells.push({ minutes, perWeek, earned: quantile(earnedAt, 0.5), artifacts: quantile(artifactsAt, 0.5) });
      if (onProgress) onProgress(++done / total);
    }
  }
  return { days, players, cells };
}

// The farming check: the same hour a day spent walking back and forth between
// the two closest systems instead of a loop.
export function farmingCheck(input, { players = 60, days = 30 } = {}) {
  const p = normalizeParams(input);
  const result = {};
  for (const persona of ['loop', 'pingpong']) {
    const q = { ...p, persona, walkMinutes: 60, walksPerWeek: 7 };
    let events = 0;
    let artifacts = 0;
    let earnedSum = 0;
    let walks = 0;
    for (let i = 0; i < players; i++) {
      const run = simulatePlayer(q, p.seed * 31337 + i, days);
      events += run.daily.events;
      walks += run.daily.walks;
      artifacts += run.series.artifacts[days - 1];
      earnedSum += run.series.earned[days - 1];
    }
    result[persona] = { eventsPerWalk: events / walks, artifacts: artifacts / players, earned: earnedSum / players };
  }
  return { days, ...result };
}
