// Game rules (docs/xenowalk-gdd.md). Functions mutate the state; the caller saves.
// Time always comes in as an argument (game time from clock.now()).

import {
  ARTIFACTS,
  EVENT_VARIANTS,
  GOOD_IDS,
  SHIPS,
  economyById,
  goodById,
} from './data.js';
import { dailyRandom, planetName, planetsAt, sectorAt, toWorld } from './galaxy.js';

// Systems and areas (GDD 4)
export const SYSTEM_RADIUS = 100;
export const UNDOCK_RADIUS = 110;
export const MIN_SPACING = 300;
export const AREA_RADIUS = 2000;
export const AREA_MAX_SYSTEMS = 8;
export const DISCOVER_MAX_SPEED = 12 / 3.6; // m/s
export const FREE_DISCOVERIES = 2;
export const DISCOVERY_BASE_PRICE = 300;
export const DISCOVERY_GROWTH = 1.5;
export const START_CREDITS = 100;

// Galactic day (GDD 3.3)
export const DAY_START_HOUR = 4;

// Markets (GDD 6)
export const BUY_FACTOR = 0.6;
export const SELL_FACTORS = { P: 0.5, N: 0.8, D: 1.1, E: 1.4 };
export const DAILY_SUPPLY = 3;
export const DAILY_DEMAND = 3;
export const RESTOCK_CAP_DAYS = 2;
export const NEWS_FACTOR = 2;
export const NEWS_DEMAND = 10;

// Ships (GDD 5): a new game starts with the Mote; the Capsule waits for pirates.
export const START_SHIP = 1;
export const TRADE_IN = 0.5;

// The Glutta Vault (GDD 7.6): loans for one to three ship classes up, a flat
// fee, paid back from half of every profit. No interest, no deadline.
export const LOAN_FEE = 0.2;
export const LOAN_REPAY_SHARE = 0.5;
export const LOAN_CLASSES_UP = 3;

// Events (GDD 8)
// Dice stakes by ship, Capsule to Discovery.
export const DICE_STAKES = [10, 20, 20, 30, 40, 50, 60, 80, 100, 120];
export const JUNK_CHANCE = 0.1;
export const MISSION_PAY_PER_METER = 0.08;
export const MISSION_DEADLINE_FACTORS = { 24: 1.5, 48: 1.2, 72: 1 };
// Deliveries further than this are weekend jobs: offered on Friday and
// Saturday, due on Sunday at 20:00.
export const LONG_MISSION_KM = 3;
const WEEKEND_DEADLINE_HOUR = 20;
export const MAX_MISSIONS = 3;
const EVENT_WEIGHTS = { dice: 1, container: 1, mission: 1 };

// Artifacts (GDD 9.2)
export const ARTIFACT_BASE_CHANCE = 0.01;
export const ARTIFACT_CHANCE_PER_KM = 0.004;
export const ARTIFACT_MAX_CHANCE = 0.5;
export const MAX_KM_PER_DAY = 3;
export const MAX_KM_PER_WEEKEND_DAY = 15;
// A leg between dockings counts if covered slower than this on average:
// walking, running, cycling, even a tram; not a car on a highway or a train.
export const COUNTED_MAX_SPEED_KMH = 40;

// Asteroid mining (GDD 7.7). Mined areas merge like metaballs: each spreads
// an influence that fades to nothing at MINE_INFLUENCE meters, and a point
// counts as mined where the influences add up to at least 1. A lone one
// covers a disc of MINE_RADIUS; ones close together flow into one field.
export const MINE_GOOD = 'substances';
export const MINE_RADIUS = 200;
export const MINE_INFLUENCE = 1.5 * MINE_RADIUS;
const MINE_THRESHOLD = (1 - (MINE_RADIUS / MINE_INFLUENCE) ** 2) ** 2;
// Short enough that a favorite route can be mined again later the same day.
export const MINE_EXPIRY_MS = 6 * 3_600_000;

const HOUR_MS = 3_600_000;
const DAY_MS = 24 * HOUR_MS;

// ---------------------------------------------------------------- time

// The galactic day of a moment: days run from 04:00 to 04:00 local time.
export function galacticDay(ms) {
  const d = new Date(ms - DAY_START_HOUR * HOUR_MS);
  return Math.round(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()) / DAY_MS);
}

// Day of the week of a galactic day: 0 Monday … 6 Sunday.
export function galacticWeekday(ms) {
  return (new Date(ms - DAY_START_HOUR * HOUR_MS).getDay() + 6) % 7;
}

export const isWeekend = (ms) => galacticWeekday(ms) >= 5;

// Sunday 20:00 of this galactic week, when weekend jobs are due.
export function weekendDeadline(ms) {
  const d = new Date(ms - DAY_START_HOUR * HOUR_MS);
  return new Date(d.getFullYear(), d.getMonth(), d.getDate() + (6 - galacticWeekday(ms)), WEEKEND_DEADLINE_HOUR).getTime();
}

// When the next galactic day starts.
export function nextDayStart(ms) {
  const d = new Date(ms);
  const next = new Date(d.getFullYear(), d.getMonth(), d.getDate(), DAY_START_HOUR);
  if (next.getTime() <= ms) next.setDate(next.getDate() + 1);
  return next.getTime();
}

// ---------------------------------------------------------------- helpers

const distance = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);

export function systemById(state, id) {
  return state.systems.find((system) => system.id === id) ?? null;
}

export function shipOf(state) {
  return SHIPS[state.ship];
}

export function cargoUnits(state) {
  let units = 0;
  for (const id of GOOD_IDS) units += state.cargo[id].units;
  for (const mission of state.missions) units += mission.units;
  return units;
}

export function freeHold(state) {
  return shipOf(state).hold - cargoUnits(state);
}

export function systemsNear(state, point, radius) {
  return state.systems.filter((system) => distance(system, point) <= radius);
}

function weightedPick(items, weightOf, random = Math.random) {
  const total = items.reduce((sum, item) => sum + weightOf(item), 0);
  let roll = random() * total;
  for (const item of items) {
    roll -= weightOf(item);
    if (roll < 0) return item;
  }
  return items[items.length - 1];
}

const randomInt = (min, max) => min + Math.floor(Math.random() * (max - min + 1));

// ---------------------------------------------------------------- profit

// Lifetime profit, kept for the log. Progress itself is the ship (GDD 5).
// While the captain owes the Glutta, half of every gain goes to them; buying
// goods is never touched, only what the trade earned.
function addProfit(state, amount) {
  state.profit += amount;
  if (amount > 0 && state.debt) {
    const paid = Math.min(state.debt.owed, Math.floor(amount * LOAN_REPAY_SHARE));
    state.credits -= paid;
    payDebt(state, paid);
  }
}

// ---------------------------------------------------------------- the bank

// What the Glutta would lend: for each of the next three ship classes, what it
// costs at the yard, rounded up to hundreds. None while a loan is open.
export function loanOffers(state) {
  if (state.debt) return [];
  const offers = [];
  for (let up = 1; up <= LOAN_CLASSES_UP && state.ship + up < SHIPS.length; up++) {
    const index = state.ship + up;
    const amount = Math.ceil(shipCost(state, index) / 100) * 100;
    offers.push({ ship: index, amount, owed: Math.round(amount * (1 + LOAN_FEE)) });
  }
  return offers;
}

export function takeLoan(state, offer, now) {
  if (state.debt) return false;
  state.credits += offer.amount;
  state.debt = { principal: offer.amount, owed: offer.owed, takenAt: now };
  state.stats.loans = (state.stats.loans ?? 0) + 1;
  return true;
}

function payDebt(state, amount) {
  state.debt.owed -= amount;
  state.stats.repaid = (state.stats.repaid ?? 0) + amount;
  if (state.debt.owed <= 0) state.debt = null;
}

// Pays back early, as much as the captain has. Returns the amount paid.
export function repayDebt(state) {
  if (!state.debt) return 0;
  const paid = Math.max(0, Math.min(state.debt.owed, Math.floor(state.credits)));
  state.credits -= paid;
  payDebt(state, paid);
  return paid;
}

// ---------------------------------------------------------------- discovery

// Price of discovering a system at a world position (GDD 7.3): grows with the
// systems already nearby, so a new area starts cheap again.
export function discoveryPrice(state, point) {
  if (state.freeDiscoveries > 0) return 0;
  const nearby = systemsNear(state, point, AREA_RADIUS).length;
  return Math.round(DISCOVERY_BASE_PRICE * DISCOVERY_GROWTH ** Math.max(0, nearby - 2));
}

// Can a system be discovered here? { ok, reason, price, nearby, point }
export function discoveryCheck(state, position, { goodSignal, speed }) {
  if (!position) return { ok: false, reason: 'Waiting for GPS' };
  if (!goodSignal) return { ok: false, reason: 'GPS signal too weak' };
  const point = toWorld(position);
  const price = discoveryPrice(state, point);
  const nearby = systemsNear(state, point, AREA_RADIUS).length;
  const result = { ok: false, price, nearby, point };
  if (speed !== null && speed > DISCOVER_MAX_SPEED) return { ...result, reason: 'Moving too fast' };
  const close = state.systems
    .map((system) => ({ system, d: distance(system, point) }))
    .filter(({ d }) => d < MIN_SPACING)
    .sort((a, b) => a.d - b.d)[0];
  if (close) return { ...result, reason: `Too close to ${close.system.name}` };
  const ship = shipOf(state);
  if (state.systems.length >= ship.systems) return { ...result, reason: `Your ${ship.name} holds ${ship.systems} systems` };
  if (nearby >= AREA_MAX_SYSTEMS) return { ...result, reason: `Area full (${nearby}/${AREA_MAX_SYSTEMS})` };
  if (state.credits < price) return { ...result, reason: 'Not enough credits' };
  return { ...result, ok: true };
}

// Premium per unit for carrying the product of economy a to a market of economy b.
function carryValue(a, b) {
  const good = economyById[a].produces;
  const relation = economyById[b].relations[good];
  return goodById[good].base * Math.max(0, SELL_FACTORS[relation] - BUY_FACTOR);
}

// What the planets here would offer as the main planet, each with the systems
// nearby it would trade well with.
export function planetOptions(state, point) {
  const sector = sectorAt(point.x, point.y);
  const economies = planetsAt(point.x, point.y, sector);
  const neighbors = systemsNear(state, point, AREA_RADIUS);
  const planets = economies.map((economy, index) => {
    const partners = neighbors
      .map((system) => ({ system, value: carryValue(economy, system.economy) + carryValue(system.economy, economy) }))
      .filter(({ value }) => value > 0)
      .sort((a, b) => b.value - a.value);
    return {
      index,
      economy,
      name: planetName(point.x, point.y, index),
      score: partners.reduce((sum, { value }) => sum + value, 0),
      partners: partners.slice(0, 2).map(({ system }) => system.name),
    };
  });
  return { sector, planets };
}

export function discoverSystem(state, position, { name, mainPlanet }, now) {
  const point = toWorld(position);
  const { sector, planets } = planetOptions(state, point);
  const price = discoveryPrice(state, point);
  if (state.freeDiscoveries > 0) state.freeDiscoveries--;
  else state.credits -= price;
  const system = {
    id: state.nextSystemId++,
    name,
    lat: position.lat,
    lon: position.lon,
    x: point.x,
    y: point.y,
    sector,
    planets: planets.map(({ economy, name: planetLabel }) => ({ economy, name: planetLabel })),
    main: mainPlanet,
    economy: planets[mainPlanet].economy,
    discoveredAt: now,
    market: freshMarket(planets[mainPlanet].economy, galacticDay(now)),
    lastEventDay: null,
    pendingEvent: null,
  };
  state.systems.push(system);
  state.stats.discovered++;
  return { system, price };
}

// ---------------------------------------------------------------- mining

export function activeMinedAreas(state, now) {
  return state.minedAreas.filter((area) => now - area.minedAt < MINE_EXPIRY_MS);
}

// Removes the mined areas that have grown back. Returns true if any did.
export function pruneMinedAreas(state, now) {
  const active = activeMinedAreas(state, now);
  const changed = active.length !== state.minedAreas.length;
  state.minedAreas = active;
  return changed;
}

// What a mined area adds to the field at a distance: exactly 1 at MINE_RADIUS,
// more closer in, 0 from MINE_INFLUENCE on. Takes the distance squared, so the
// map can evaluate it on a whole grid without square roots.
export function mineWeight(distanceSquared) {
  if (distanceSquared >= MINE_INFLUENCE ** 2) return 0;
  return (1 - distanceSquared / MINE_INFLUENCE ** 2) ** 2 / MINE_THRESHOLD;
}

function isMined(areas, point) {
  let field = 0;
  for (const area of areas) {
    field += mineWeight((area.x - point.x) ** 2 + (area.y - point.y) ** 2);
    if (field >= 1) return true;
  }
  return false;
}

// Can the captain mine here? { ok, reason, point }. Anywhere, systems
// included, where nothing was mined in the last hours: at home that is one
// unit every few hours, too little to matter.
export function miningCheck(state, position, { goodSignal }, now) {
  if (!position) return { ok: false, reason: 'Waiting for GPS' };
  if (!goodSignal) return { ok: false, reason: 'GPS signal too weak' };
  if (state.systems.length === 0) return { ok: false, reason: 'Chart your first system first' };
  const point = toWorld(position);
  if (isMined(activeMinedAreas(state, now), point)) return { ok: false, point, reason: 'Mined out here. Walk on to fresh rock.', short: 'Mined out' };
  if (freeHold(state) < 1) return { ok: false, point, reason: 'Cargo hold full', short: 'Hold full' };
  return { ok: true, point };
}

// Mines one unit of Substances at a point checked with miningCheck. What is
// mined cost nothing, so all it sells for is profit.
export function mineAsteroids(state, point, now) {
  state.minedAreas.push({ x: Math.round(point.x * 10) / 10, y: Math.round(point.y * 10) / 10, minedAt: now });
  state.cargo[MINE_GOOD].units += 1;
  state.stats.mined = (state.stats.mined ?? 0) + 1;
}

export function renameSystem(state, id, name) {
  const system = systemById(state, id);
  if (system) system.name = name;
}

// Removes a system for good (GDD 4.5): no refund; cargo for deliveries to or
// from it is lost.
export function deleteSystem(state, id) {
  state.systems = state.systems.filter((system) => system.id !== id);
  state.missions = state.missions.filter((mission) => mission.to !== id && mission.from !== id);
  if (state.lastDock?.systemId === id) state.lastDock = null;
  if (state.news) state.news.items = state.news.items.filter((item) => item.systemId !== id);
}

// ---------------------------------------------------------------- markets

function freshMarket(economyId, day) {
  const demand = {};
  for (const id of GOOD_IDS) {
    const relation = economyById[economyId].relations[id];
    demand[id] = relation === 'D' || relation === 'E' ? DAILY_DEMAND : 0;
  }
  return { day, stock: DAILY_SUPPLY, demand };
}

// Restocks a market for the days since it was last seen; stock and demand
// wait at most two days, so one missed day isn't lost (GDD 6.4).
export function refreshMarket(system, day) {
  const market = system.market;
  const elapsed = day - market.day;
  if (elapsed <= 0) return;
  market.stock = Math.min(DAILY_SUPPLY * RESTOCK_CAP_DAYS, market.stock + DAILY_SUPPLY * elapsed);
  for (const id of GOOD_IDS) {
    const relation = economyById[system.economy].relations[id];
    if (relation === 'D' || relation === 'E') {
      market.demand[id] = Math.min(DAILY_DEMAND * RESTOCK_CAP_DAYS, market.demand[id] + DAILY_DEMAND * elapsed);
    }
  }
  market.day = day;
}

export function buyPrice(system) {
  return Math.round(goodById[economyById[system.economy].produces].base * BUY_FACTOR);
}

// What the market pays for a good, as tiers taken in order:
// [{ price, units, kind: 'news' | 'demand' | 'regular' }].
export function sellTiers(state, system, goodId, day) {
  refreshMarket(system, day);
  const base = goodById[goodId].base;
  const relation = economyById[system.economy].relations[goodId];
  const tiers = [];
  const news = newsItem(state, system.id, day);
  if (news && news.good === goodId && news.left > 0) {
    tiers.push({ price: Math.round(base * NEWS_FACTOR), units: news.left, kind: 'news' });
  }
  if (relation === 'D' || relation === 'E') {
    const demand = system.market.demand[goodId];
    if (demand > 0) tiers.push({ price: Math.round(base * SELL_FACTORS[relation]), units: demand, kind: 'demand' });
    tiers.push({ price: Math.round(base * SELL_FACTORS.N), units: Infinity, kind: 'regular' });
  } else {
    tiers.push({ price: Math.round(base * SELL_FACTORS[relation]), units: Infinity, kind: 'regular' });
  }
  return tiers;
}

export function tiersTotal(tiers, units) {
  let total = 0;
  let left = units;
  for (const tier of tiers) {
    const n = Math.min(left, tier.units);
    total += n * tier.price;
    left -= n;
    if (!left) break;
  }
  return total;
}

// Checks a set of orders { goodId: units } (negative sells, positive buys)
// against the hold, the credits and the market. Returns
// { ok, reason, proceeds, cost, profit, net }.
export function quoteTrade(state, system, orders, day) {
  refreshMarket(system, day);
  const produced = economyById[system.economy].produces;
  let proceeds = 0;
  let cost = 0;
  let profit = 0;
  let unitsAfter = cargoUnits(state);
  for (const id of GOOD_IDS) {
    const units = orders[id] ?? 0;
    if (units < 0) {
      const sold = Math.min(-units, state.cargo[id].units);
      const value = tiersTotal(sellTiers(state, system, id, day), sold);
      proceeds += value;
      const held = state.cargo[id];
      profit += value - (held.units ? (held.cost * sold) / held.units : 0);
      unitsAfter -= sold;
    } else if (units > 0) {
      if (id !== produced) return { ok: false, reason: `${system.name} doesn't sell ${goodById[id].name}` };
      if (units > system.market.stock) return { ok: false, reason: 'Not that much in stock today' };
      cost += units * buyPrice(system);
      unitsAfter += units;
    }
  }
  const net = proceeds - cost;
  if (unitsAfter > shipOf(state).hold) return { ok: false, reason: 'Not enough room in the hold', proceeds, cost, profit, net };
  if (state.credits + net < 0) return { ok: false, reason: 'Not enough credits', proceeds, cost, profit, net };
  return { ok: true, proceeds, cost, profit, net };
}

// Carries out orders checked with quoteTrade. Returns the quote.
export function trade(state, system, orders, day) {
  const quote = quoteTrade(state, system, orders, day);
  if (!quote.ok) return quote;
  for (const id of GOOD_IDS) {
    const units = orders[id] ?? 0;
    if (units < 0) {
      const sold = Math.min(-units, state.cargo[id].units);
      takeTiers(state, system, id, sold, day);
      const held = state.cargo[id];
      held.cost = held.units > sold ? (held.cost * (held.units - sold)) / held.units : 0;
      held.units -= sold;
      state.stats.sold += sold;
    } else if (units > 0) {
      system.market.stock -= units;
      state.cargo[id].units += units;
      state.cargo[id].cost += units * buyPrice(system);
      state.stats.bought += units;
    }
  }
  state.credits += quote.net;
  addProfit(state, quote.profit);
  return quote;
}

// Uses up news and demand as units are sold.
function takeTiers(state, system, goodId, units, day) {
  let left = units;
  const news = newsItem(state, system.id, day);
  if (news && news.good === goodId && news.left > 0) {
    const n = Math.min(left, news.left);
    news.left -= n;
    left -= n;
  }
  const relation = economyById[system.economy].relations[goodId];
  if (left > 0 && (relation === 'D' || relation === 'E')) {
    system.market.demand[goodId] -= Math.min(left, system.market.demand[goodId]);
  }
}

// ---------------------------------------------------------------- market news

// Groups of systems that are each within an area's reach of another, for
// one piece of news per area a day.
function areaGroups(state) {
  const groups = [];
  const seen = new Set();
  for (const start of state.systems) {
    if (seen.has(start.id)) continue;
    const group = [];
    const queue = [start];
    seen.add(start.id);
    while (queue.length) {
      const system = queue.pop();
      group.push(system);
      for (const other of state.systems) {
        if (!seen.has(other.id) && distance(system, other) <= AREA_RADIUS) {
          seen.add(other.id);
          queue.push(other);
        }
      }
    }
    groups.push(group);
  }
  return groups;
}

// Today's market news (GDD 6.6): in each area with at least two systems, one
// system pays double for one good. Drawn per area, so an area that gets its
// second system during the day has news at once; the draw is fixed by the
// world, the day and the area's oldest system.
export function newsFor(state, day) {
  if (state.news?.day !== day) state.news = { day, items: [] };
  const { items } = state.news;
  for (const group of areaGroups(state)) {
    if (group.length < 2) continue;
    if (items.some((item) => group.some((system) => system.id === item.systemId))) continue;
    const anchor = Math.min(...group.map((system) => system.id));
    const system = group[Math.floor(dailyRandom(day, anchor, 0x6e77) * group.length)];
    const goods = GOOD_IDS.filter((id) => id !== economyById[system.economy].produces);
    const good = goods[Math.floor(dailyRandom(day, anchor, 0x900d) * goods.length)];
    items.push({ systemId: system.id, good, left: NEWS_DEMAND });
  }
  return items;
}

export function newsItem(state, systemId, day) {
  return newsFor(state, day).find((item) => item.systemId === systemId) ?? null;
}

// ---------------------------------------------------------------- ships

export function shipCost(state, index) {
  return SHIPS[index].price - Math.round(SHIPS[state.ship].price * TRADE_IN);
}

export function buyShip(state, index) {
  const cost = shipCost(state, index);
  if (index <= state.ship || state.credits < cost) return false;
  state.credits -= cost;
  state.ship = index;
  return true;
}

// ---------------------------------------------------------------- docking and distance

// The system the player is docked at: the nearest within 100 m, or the
// current one until they are 110 m away, so GPS jitter at the edge doesn't flicker.
export function dockedSystem(state, point, currentId) {
  const current = currentId !== null ? systemById(state, currentId) : null;
  if (current && distance(current, point) <= UNDOCK_RADIUS) return current;
  let nearest = null;
  for (const system of state.systems) {
    const d = distance(system, point);
    if (d <= SYSTEM_RADIUS && (!nearest || d < nearest.d)) nearest = { system, d };
  }
  return nearest?.system ?? null;
}

// Counts the straight line from the last docked system toward the next
// artifact (GDD 9.2): a leg counts if it was covered slower than 40 km/h on
// average, and at most 3 km count a day, 15 on Saturdays and Sundays.
// Returns the kilometers counted.
export function recordDock(state, system, now) {
  const day = galacticDay(now);
  if (state.kmToday.day !== day) state.kmToday = { day, km: 0 };
  let counted = 0;
  const last = state.lastDock && systemById(state, state.lastDock.systemId);
  if (last && last.id !== system.id) {
    const km = distance(last, system) / 1000;
    const hours = (now - (state.lastDock.at ?? 0)) / HOUR_MS;
    if (hours > 0 && km / hours <= COUNTED_MAX_SPEED_KMH) {
      const cap = isWeekend(now) ? MAX_KM_PER_WEEKEND_DAY : MAX_KM_PER_DAY;
      counted = Math.max(0, Math.min(km, cap - state.kmToday.km));
      state.kmToday.km += counted;
      state.artifactKm += counted;
      state.stats.km += km;
    }
  }
  state.lastDock = { systemId: system.id, at: now };
  state.stats.docks++;
  return counted;
}

export function artifactChance(state) {
  if (state.artifacts.length >= ARTIFACTS.length) return 0;
  return Math.min(ARTIFACT_MAX_CHANCE, ARTIFACT_BASE_CHANCE + ARTIFACT_CHANCE_PER_KM * state.artifactKm);
}

// ---------------------------------------------------------------- missions

// Where a delivery from this system may go (GDD 8.4): within the ship's range;
// beyond 3 km only on Friday and Saturday, as weekend jobs.
function missionTargets(state, system, now) {
  const range = shipOf(state).missionKm * 1000;
  const weekendJobs = [4, 5].includes(galacticWeekday(now));
  return state.systems.filter((other) => {
    if (other.id === system.id) return false;
    const d = distance(other, system);
    return d <= range && (weekendJobs || d <= LONG_MISSION_KM * 1000);
  });
}

const isLong = (meters) => meters > LONG_MISSION_KM * 1000;

function missionReward(meters, factor) {
  return Math.max(10, Math.round((MISSION_PAY_PER_METER * meters * factor) / 5) * 5);
}

// Pays for deliveries to this system. Returns the missions delivered.
export function deliverMissions(state, system, now) {
  const delivered = [];
  state.missions = state.missions.filter((mission) => {
    if (mission.to !== system.id || now > mission.deadline) return true;
    state.credits += mission.reward;
    state.stats.delivered++;
    addProfit(state, mission.reward);
    delivered.push(mission);
    return false;
  });
  return delivered;
}

// Drops deliveries past their deadline: the cargo is lost, nothing else (GDD 8.4).
export function expireMissions(state, now) {
  const expired = state.missions.filter((mission) => now > mission.deadline);
  if (expired.length) state.missions = state.missions.filter((mission) => now <= mission.deadline);
  return expired;
}

// ---------------------------------------------------------------- events

// Today's event in a system (GDD 8.1): one per system per galactic day, drawn
// once and kept with the system, so leaving and coming back doesn't draw it
// again. Null if the system had its event today or no event can be offered.
export function systemEvent(state, system, now) {
  const day = galacticDay(now);
  if (system.lastEventDay === day) return null;
  const pending = system.pendingEvent;
  if (pending?.day === day) return pending;

  const stake = DICE_STAKES[state.ship];
  const kinds = [];
  const dice = EVENT_VARIANTS.dice.filter((variant) => state.credits >= stake * variant.stakeFactor);
  if (dice.length) kinds.push({ kind: 'dice', variants: dice });
  const containers = EVENT_VARIANTS.container.filter((variant) => state.credits >= variant.price);
  if (containers.length) kinds.push({ kind: 'container', variants: containers });
  const targets = missionTargets(state, system, now);
  // The medic's parcel is always a short, 24-hour job.
  const missions = EVENT_VARIANTS.mission.filter((variant) => variant.id !== 'medic' || targets.some((t) => !isLong(distance(t, system))));
  if (targets.length) kinds.push({ kind: 'mission', variants: missions });
  if (!kinds.length) return null;

  const { kind, variants } = weightedPick(kinds, (k) => EVENT_WEIGHTS[k.kind]);
  const variant = weightedPick(variants, (v) => v.weight);
  let offer;
  if (kind === 'dice') {
    offer = { stake: Math.round(stake * variant.stakeFactor) };
  } else if (kind === 'container') {
    offer = { price: variant.price, units: variant.units };
  } else {
    const pool = variant.id === 'medic' ? targets.filter((t) => !isLong(distance(t, system))) : targets;
    const target = pool[Math.floor(Math.random() * pool.length)];
    const meters = distance(system, target);
    offer = {
      to: target.id,
      units: variant.units,
      // A weekend job has one deadline, Sunday 20:00; short ones offer three.
      options: isLong(meters)
        ? [{ until: weekendDeadline(now), reward: missionReward(meters, variant.rewardFactor) }]
        : variant.deadlines.map((hours) => ({ hours, reward: missionReward(meters, MISSION_DEADLINE_FACTORS[hours] * variant.rewardFactor) })),
    };
  }
  system.pendingEvent = { systemId: system.id, day, kind, variant: variant.id, offer };
  return system.pendingEvent;
}

// The event waiting in a system today, without drawing one.
export function pendingEvent(system, now) {
  const event = system.pendingEvent;
  return event && event.day === galacticDay(now) && system.lastEventDay !== event.day ? event : null;
}

export function variantOf(event) {
  return EVENT_VARIANTS[event.kind].find((variant) => variant.id === event.variant);
}

function closeEvent(state, system) {
  system.lastEventDay = system.pendingEvent.day;
  system.pendingEvent = null;
  state.stats.events++;
}

export function declineEvent(state, system) {
  if (system.pendingEvent) closeEvent(state, system);
}

const roll2d6 = () => [randomInt(1, 6), randomInt(1, 6)];

// Dice (GDD 8.2): the house throws 2d6 first, kept with the event so closing
// the app can't take it back. Then the captain folds for half the stake or
// throws too: higher wins, a tie goes to the house.
export function houseRoll(state, system) {
  const event = system.pendingEvent;
  event.house ??= roll2d6();
  return event.house;
}

// The chance that 2d6 beats a house total.
export function diceWinChance(houseTotal) {
  let wins = 0;
  for (let a = 1; a <= 6; a++) for (let b = 1; b <= 6; b++) if (a + b > houseTotal) wins++;
  return wins / 36;
}

export function foldDice(state, system) {
  const event = system.pendingEvent;
  const loss = Math.ceil(event.offer.stake / 2);
  state.credits -= loss;
  state.stats.diceGames++;
  closeEvent(state, system);
  addProfit(state, -loss);
  return { loss };
}

export function playDice(state, system) {
  const event = system.pendingEvent;
  const { stake } = event.offer;
  const house = houseRoll(state, system);
  const player = roll2d6();
  const win = player[0] + player[1] > house[0] + house[1];
  state.credits += win ? stake : -stake;
  state.stats.diceGames++;
  if (win) state.stats.diceWins++;
  closeEvent(state, system);
  addProfit(state, win ? stake : -stake);
  return { player, house, win, stake };
}

// Buys the sealed container. Returns { good, units, kept, junk, artifact }.
export function openContainer(state, system, now) {
  const { price, units: [min, max] } = system.pendingEvent.offer;
  state.credits -= price;
  state.stats.containers++;

  let artifact = null;
  if (state.artifacts.length < ARTIFACTS.length && Math.random() < artifactChance(state)) {
    // Never a duplicate: drawn from the ones not found yet.
    const found = new Set(state.artifacts.map((entry) => entry.id));
    const left = ARTIFACTS.filter((entry) => !found.has(entry.id));
    artifact = left[Math.floor(Math.random() * left.length)];
    state.artifacts.push({ id: artifact.id, foundAt: now, systemName: system.name });
    state.artifactKm = 0;
  }

  const junk = Math.random() < JUNK_CHANCE;
  let good = null;
  let units = 0;
  let kept = 0;
  if (!junk) {
    good = GOOD_IDS[Math.floor(Math.random() * GOOD_IDS.length)];
    units = randomInt(min, max);
    kept = Math.max(0, Math.min(units, freeHold(state)));
    state.cargo[good].units += kept;
  }
  closeEvent(state, system);
  addProfit(state, -price);
  return { good, units, kept, junk, artifact };
}

export function acceptMission(state, system, optionIndex, now) {
  const { to, units, options } = system.pendingEvent.offer;
  const option = options[optionIndex];
  if (freeHold(state) < units || state.missions.length >= MAX_MISSIONS) return null;
  const mission = {
    id: state.nextMissionId++,
    from: system.id,
    to,
    units,
    reward: option.reward,
    hours: option.hours ?? null,
    deadline: option.until ?? now + option.hours * HOUR_MS,
    takenAt: now,
  };
  state.missions.push(mission);
  closeEvent(state, system);
  return mission;
}
