// Game rules (docs/xenowalk-gdd.md). Functions mutate the state; the caller saves.
// Time always comes in as an argument (game time from clock.now()).

import {
  ARTIFACTS,
  EVENT_VARIANTS,
  GOOD_IDS,
  RANKS,
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
export const DISCOVERY_BASE_PRICE = 1500;
export const DISCOVERY_GROWTH = 1.5;
export const START_CREDITS = 500;

// Galactic day (GDD 3.3)
export const DAY_START_HOUR = 4;

// Markets (GDD 6)
export const BUY_FACTOR = 0.6;
export const SELL_FACTORS = { P: 0.5, N: 0.8, D: 1.3, E: 1.7 };
export const DAILY_SUPPLY = 5;
export const DAILY_DEMAND = 4;
export const RESTOCK_CAP_DAYS = 2;
export const NEWS_FACTOR = 2;
export const NEWS_DEMAND = 10;

// Ships (GDD 5)
export const TRADE_IN = 0.5;

// Events (GDD 8)
export const DICE_STAKES = [100, 250, 500, 1000];
export const JUNK_CHANCE = 0.1;
export const MISSION_PAY_PER_METER = 0.15;
export const MISSION_DEADLINE_FACTORS = { 24: 1.5, 48: 1.2, 72: 1 };
export const MAX_MISSIONS = 3;
const EVENT_WEIGHTS = { dice: 1, container: 1, mission: 1 };

// Artifacts (GDD 9.2)
export const ARTIFACT_BASE_CHANCE = 0.01;
export const ARTIFACT_CHANCE_PER_KM = 0.005;
export const ARTIFACT_MAX_CHANCE = 0.5;
export const COMMUTE_LEG_KM = 2;
export const MAX_KM_PER_DAY = 3;

const HOUR_MS = 3_600_000;
const DAY_MS = 24 * HOUR_MS;

// ---------------------------------------------------------------- time

// The galactic day of a moment: days run from 04:00 to 04:00 local time.
export function galacticDay(ms) {
  const d = new Date(ms - DAY_START_HOUR * HOUR_MS);
  return Math.round(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()) / DAY_MS);
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

// ---------------------------------------------------------------- profit and ranks

export function rankIndex(profit) {
  let index = 0;
  RANKS.forEach((rank, i) => {
    if (profit >= rank.profit) index = i;
  });
  return index;
}

// Adds to lifetime profit. Returns the new rank's index on a promotion, else null.
// The rank never drops, even after losses.
export function addProfit(state, amount) {
  state.profit += amount;
  const index = rankIndex(state.profit);
  if (index > state.rank) {
    state.rank = index;
    return index;
  }
  return null;
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

// Carries out orders checked with quoteTrade. Returns the quote, plus a promotion if any.
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
  const promotion = addProfit(state, quote.profit);
  return { ...quote, promotion };
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
// artifact (GDD 9.2): legs longer than an area are commutes, and at most
// 3 km a day count. Returns the kilometers counted.
export function recordDock(state, system, now) {
  const day = galacticDay(now);
  if (state.kmToday.day !== day) state.kmToday = { day, km: 0 };
  let counted = 0;
  const last = state.lastDock && systemById(state, state.lastDock.systemId);
  if (last && last.id !== system.id) {
    const km = distance(last, system) / 1000;
    if (km <= COMMUTE_LEG_KM) {
      counted = Math.max(0, Math.min(km, MAX_KM_PER_DAY - state.kmToday.km));
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

function missionTargets(state, system) {
  return state.systems.filter((other) => other.id !== system.id && distance(other, system) <= AREA_RADIUS);
}

function missionReward(meters, hours, factor) {
  return Math.max(20, Math.round((MISSION_PAY_PER_METER * meters * MISSION_DEADLINE_FACTORS[hours] * factor) / 5) * 5);
}

// Pays for deliveries to this system. Returns [{ mission, promotion }].
export function deliverMissions(state, system, now) {
  const delivered = [];
  state.missions = state.missions.filter((mission) => {
    if (mission.to !== system.id || now > mission.deadline) return true;
    state.credits += mission.reward;
    state.stats.delivered++;
    delivered.push({ mission, promotion: addProfit(state, mission.reward) });
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
  const targets = missionTargets(state, system);
  if (targets.length) kinds.push({ kind: 'mission', variants: EVENT_VARIANTS.mission });
  if (!kinds.length) return null;

  const { kind, variants } = weightedPick(kinds, (k) => EVENT_WEIGHTS[k.kind]);
  const variant = weightedPick(variants, (v) => v.weight);
  let offer;
  if (kind === 'dice') {
    offer = { stake: Math.round(stake * variant.stakeFactor) };
  } else if (kind === 'container') {
    offer = { price: variant.price, units: variant.units };
  } else {
    const target = targets[Math.floor(Math.random() * targets.length)];
    const meters = distance(system, target);
    offer = {
      to: target.id,
      units: variant.units,
      options: variant.deadlines.map((hours) => ({ hours, reward: missionReward(meters, hours, variant.rewardFactor) })),
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

// Both throw 2d6, higher wins, a tie goes to the house (GDD 8.2).
export function playDice(state, system) {
  const { stake } = system.pendingEvent.offer;
  const player = roll2d6();
  const house = roll2d6();
  const win = player[0] + player[1] > house[0] + house[1];
  state.credits += win ? stake : -stake;
  state.stats.diceGames++;
  if (win) state.stats.diceWins++;
  closeEvent(state, system);
  const promotion = addProfit(state, win ? stake : -stake);
  return { player, house, win, stake, promotion };
}

// Buys the sealed container. Returns { good, units, kept, junk, artifact, promotion }.
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
  const promotion = addProfit(state, -price);
  return { good, units, kept, junk, artifact, promotion };
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
    hours: option.hours,
    deadline: now + option.hours * HOUR_MS,
    takenAt: now,
  };
  state.missions.push(mission);
  closeEvent(state, system);
  return mission;
}
