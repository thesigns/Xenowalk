// Loads, saves, exports and imports the game state.
// Keys carry the `xenowalk.` prefix: on GitHub Pages Xenowalk and Tinwalk
// share an origin, and so localStorage.

import { ARTIFACTS, ECONOMIES, GOOD_IDS, SHIPS } from './data.js';
import { FREE_DISCOVERIES, START_CREDITS } from './game.js';

const STORAGE_KEY = 'xenowalk.state';
export const STATE_VERSION = 1;
export const WORLD_ID_MAX_LENGTH = 32;

const INVALID_SAVE = "This file isn't a valid Xenowalk save";
const OTHER_VERSION = 'This save comes from a newer version of Xenowalk';

// Each migration upgrades a save from the version it is keyed by to the next one.
const MIGRATIONS = {};

export function randomWorldId() {
  const letters = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
  const pick = () => letters[Math.floor(Math.random() * letters.length)];
  return `${pick()}${pick()}${pick()}-${String(Math.floor(Math.random() * 10000)).padStart(4, '0')}`;
}

function emptyCargo() {
  return Object.fromEntries(GOOD_IDS.map((id) => [id, { units: 0, cost: 0 }]));
}

export function createInitialState(worldId, now) {
  return {
    version: STATE_VERSION,
    createdAt: now,
    // The origin is set by the first good position, the sectors are laid out around it.
    world: { id: worldId, origin: null },
    credits: START_CREDITS,
    freeDiscoveries: FREE_DISCOVERIES,
    ship: 0,
    cargo: emptyCargo(),
    systems: [],
    nextSystemId: 1,
    missions: [],
    nextMissionId: 1,
    news: null,
    artifacts: [],
    artifactKm: 0,
    kmToday: { day: 0, km: 0 },
    lastDock: null,
    profit: 0,
    rank: 0,
    stats: {
      km: 0,
      docks: 0,
      discovered: 0,
      bought: 0,
      sold: 0,
      delivered: 0,
      events: 0,
      diceGames: 0,
      diceWins: 0,
      containers: 0,
    },
  };
}

export function loadState() {
  try {
    const text = localStorage.getItem(STORAGE_KEY);
    if (!text) return null;
    const save = migrate(JSON.parse(text));
    return isValidState(save) ? save : null;
  } catch (error) {
    console.warn('Could not load the saved game', error);
    return null;
  }
}

export function saveState(state) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch (error) {
    console.warn('Could not save the game', error);
  }
}

export function clearState() {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch (error) {
    console.warn('Could not clear the saved game', error);
  }
}

// Asks the browser not to evict the save under storage pressure.
export function requestPersistentStorage() {
  navigator.storage?.persist?.().catch(() => {});
}

export function exportState(state) {
  return JSON.stringify(state, null, 1);
}

// Parses an imported file. Returns { state } or { error }.
export function parseSave(text) {
  let save;
  try {
    save = JSON.parse(text);
  } catch {
    return { error: INVALID_SAVE };
  }
  if (!isObject(save) || !Number.isInteger(save.version)) return { error: INVALID_SAVE };
  if (save.version > STATE_VERSION) return { error: OTHER_VERSION };
  save = migrate(save);
  return isValidState(save) ? { state: save } : { error: INVALID_SAVE };
}

function migrate(save) {
  while (isObject(save) && save.version < STATE_VERSION && MIGRATIONS[save.version]) MIGRATIONS[save.version](save);
  return save;
}

// ---------------------------------------------------------------- validation

const isObject = (value) => value !== null && typeof value === 'object' && !Array.isArray(value);
const isNumber = (value) => typeof value === 'number' && Number.isFinite(value);
const isCount = (value) => Number.isInteger(value) && value >= 0;
const economyIds = new Set(ECONOMIES.map((economy) => economy.id));
const artifactIds = new Set(ARTIFACTS.map((artifact) => artifact.id));

function isValidSystem(system) {
  return (
    isObject(system) &&
    isCount(system.id) &&
    typeof system.name === 'string' &&
    [system.lat, system.lon, system.x, system.y].every(isNumber) &&
    [0, 1, 2].includes(system.sector) &&
    economyIds.has(system.economy) &&
    Array.isArray(system.planets) &&
    system.planets.every((planet) => isObject(planet) && economyIds.has(planet.economy) && typeof planet.name === 'string') &&
    isCount(system.main) &&
    isObject(system.market) &&
    isNumber(system.market.day) &&
    isNumber(system.market.stock) &&
    isObject(system.market.demand) &&
    GOOD_IDS.every((id) => isNumber(system.market.demand[id])) &&
    (system.lastEventDay === null || isNumber(system.lastEventDay)) &&
    (system.pendingEvent === null || isObject(system.pendingEvent))
  );
}

function isValidMission(mission) {
  return (
    isObject(mission) &&
    [mission.id, mission.from, mission.to, mission.units, mission.reward].every(isCount) &&
    isNumber(mission.deadline)
  );
}

export function isValidState(state) {
  return (
    isObject(state) &&
    state.version === STATE_VERSION &&
    isObject(state.world) &&
    typeof state.world.id === 'string' &&
    (state.world.origin === null || (isObject(state.world.origin) && isNumber(state.world.origin.lat) && isNumber(state.world.origin.lon))) &&
    isNumber(state.credits) &&
    isCount(state.freeDiscoveries) &&
    Number.isInteger(state.ship) &&
    state.ship >= 0 &&
    state.ship < SHIPS.length &&
    isObject(state.cargo) &&
    GOOD_IDS.every((id) => isObject(state.cargo[id]) && isCount(state.cargo[id].units) && isNumber(state.cargo[id].cost)) &&
    Array.isArray(state.systems) &&
    state.systems.every(isValidSystem) &&
    isCount(state.nextSystemId) &&
    Array.isArray(state.missions) &&
    state.missions.every(isValidMission) &&
    isCount(state.nextMissionId) &&
    (state.news === null || (isObject(state.news) && Array.isArray(state.news.items))) &&
    Array.isArray(state.artifacts) &&
    state.artifacts.every((entry) => isObject(entry) && artifactIds.has(entry.id) && isNumber(entry.foundAt)) &&
    isNumber(state.artifactKm) &&
    isObject(state.kmToday) &&
    (state.lastDock === null || isObject(state.lastDock)) &&
    isNumber(state.profit) &&
    isCount(state.rank) &&
    isObject(state.stats)
  );
}
