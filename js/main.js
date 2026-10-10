// Wires everything together: the start screen, GPS and docking, the HUD over
// the map, the tabs and their pages, actions, dialogs and the game tick.

import { now } from './clock.js';
import { DEBUG_START, DebugPanel, isDebug } from './debug.js';
import { BANK, SECTORS, SHIPS, goodById } from './data.js';
import {
  acceptMission,
  buyShip,
  cargoUnits,
  declineEvent,
  deleteSystem,
  deliverMissions,
  diceWinChance,
  discoverSystem,
  discoveryCheck,
  dockedSystem,
  expireMissions,
  foldDice,
  freeHold,
  LONG_MISSION_KM,
  MAX_KM_PER_WEEKEND_DAY,
  galacticDay,
  galacticWeekday,
  houseRoll,
  newsFor,
  nextDayStart,
  openContainer,
  pendingEvent,
  planetOptions,
  playDice,
  recordDock,
  refreshMarket,
  renameSystem,
  repayDebt,
  takeLoan,
  systemById,
  systemEvent,
  trade,
} from './game.js';
import { fromWorld, hasWorld, setWorld, toWorld } from './galaxy.js';
import { LocationTracker } from './gps.js';
import { HeadingTracker } from './heading.js';
import { Haptics, canVibrate } from './haptics.js';
import { MapView } from './map.js';
import { renderCargoPage } from './page-cargo.js';
import { renderCodexPage } from './page-codex.js';
import { renderSystemPage, resetOrders } from './page-system.js';
import { SoundEffects } from './sound.js';
import { clearState, createInitialState, exportState, loadState, parseSave, randomWorldId, requestPersistentStorage, saveState } from './state.js';
import { confirmDialog, formatCredits, formatDistance, formatDuration, h, icon, isDialogOpen, signed, toast } from './ui.js';
import { APP_UPDATED } from './version.js';
import {
  confirmDelete,
  confirmLoan,
  confirmShip,
  openArtifactCard,
  openDiscoverDialog,
  openEventDialog,
  openGuide,
  openMenu,
  openRenameDialog,
  openSystemCard,
  revealArtifact,
  showNewShip,
} from './dialogs.js';

const $ = (id) => document.getElementById(id);
const TICK_MS = 1000;
const TICKER_MS = 5200;

const tracker = new LocationTracker();
const heading = new HeadingTracker();
const sound = new SoundEffects();
const haptics = new Haptics();
const map = new MapView($('map'));

let state = null;
let player = null; // the player's world position
let dockedId = null;
let activeTab = 'map';
let eventShownFor = null; // `${systemId}:${day}` once today's event popped up on docking
let eventSystemId = null; // the system whose event dialog is open
let shownDay = null;
let shownCredits = null;
let tickerIndex = 0;
let tickerKey = '';
let debugPanel = null;
const newArtifacts = new Set();

// ---------------------------------------------------------------- the app interface for pages and dialogs

const app = {
  get state() {
    return state;
  },
  get docked() {
    return dockedId !== null ? systemById(state, dockedId) : null;
  },
  get player() {
    return player;
  },
  now,
  sound,
  haptics,
  canVibrate,
  get debugPanel() {
    return debugPanel;
  },
  version: `updated ${APP_UPDATED}`,
  cargoUnits: () => cargoUnits(state),
  freeHold: () => freeHold(state),
  feedback,
  feedbackSoft: () => sound.play('tap'),
  refresh,
  refreshPage,

  trade(system, orders) {
    const owed = owedNow();
    const result = trade(state, system, orders, galacticDay(now()));
    if (!result.ok) {
      feedback('error');
      toast(result.reason, { icon: 'warning', kind: 'bad' });
      return result;
    }
    save();
    feedback(result.proceeds > 0 ? 'sell' : 'buy');
    const parts = [];
    if (result.proceeds) parts.push(`sold for ${formatCredits(result.proceeds)}`);
    if (result.cost) parts.push(`bought for ${formatCredits(result.cost)}`);
    toast(`Trade done: ${parts.join(', ')} · <b>${signed(result.net)} cr</b>`, { icon: 'credits', kind: result.net >= 0 ? 'good' : '' });
    noteRepayment(owed);
    refresh();
    return result;
  },

  async buyShip(index) {
    if (!(await confirmShip(app, index))) return;
    if (!buyShip(state, index)) {
      feedback('error');
      return;
    }
    save();
    refresh();
    showNewShip(app, index);
  },

  openEvent(system) {
    eventSystemId = system.id;
    return openEventDialog(app, system).then(() => {
      eventSystemId = null;
      refresh();
    });
  },
  declineEvent() {
    declineEvent(state, eventSystem());
    save();
    refresh();
  },
  houseRoll() {
    const house = houseRoll(state, eventSystem());
    save();
    return house;
  },
  diceWinChance,
  foldDice() {
    const result = foldDice(state, eventSystem());
    save();
    return result;
  },
  playDice() {
    const owed = owedNow();
    const result = playDice(state, eventSystem());
    noteRepayment(owed);
    save();
    return result;
  },
  async takeLoan(offer) {
    if (!(await confirmLoan(app, offer))) return;
    if (!takeLoan(state, offer, now())) return;
    save();
    feedback('sell');
    toast(`${formatCredits(offer.amount)} cr from the ${BANK.name}. Ossumar smiles.`, { icon: 'credits', kind: 'gold' });
    refresh();
  },
  repayDebt() {
    const owed = owedNow();
    const paid = repayDebt(state);
    if (!paid) return;
    save();
    feedback('buy');
    toast(`Paid ${formatCredits(paid)} cr to the Glutta`, { icon: 'credits' });
    noteRepayment(owed, true);
    refresh();
  },
  openContainer() {
    const result = openContainer(state, eventSystem(), now());
    if (result.artifact) newArtifacts.add(result.artifact.id);
    save();
    return result;
  },
  acceptMission(index) {
    const mission = acceptMission(state, eventSystem(), index, now());
    if (!mission) {
      feedback('error');
      return null;
    }
    save();
    feedback('mission');
    const to = systemById(state, mission.to);
    toast(`Delivery accepted: ${mission.units} crates to <b>${escape(to.name)}</b> within ${mission.hours} h`, { icon: 'mission' });
    refresh();
    return mission;
  },
  afterEvent() {
    refresh();
  },
  revealArtifact(id) {
    revealArtifact(app, id).then(() => {
      toast('Added to your Codex', { icon: 'artifact', kind: 'gold' });
      refresh();
    });
  },
  openArtifact(id) {
    newArtifacts.delete(id);
    openArtifactCard(app, id).then(() => refresh());
  },
  isNewArtifact: (id) => newArtifacts.has(id),

  focusSystem(system) {
    goTo('map');
    map.focus(system, 1200);
    setTimeout(() => openSystemCard(app, system), 350);
  },
  showSystemInfo(system) {
    openSystemCard(app, system);
  },
  async renameSystem(system) {
    const name = await openRenameDialog(system);
    if (!name) return;
    renameSystem(state, system.id, name);
    save();
    refresh();
  },
  async deleteSystem(system) {
    if (!(await confirmDelete(system))) return;
    deleteSystem(state, system.id);
    if (dockedId === system.id) dockedId = null;
    save();
    toast(`${escape(system.name)} is gone`, { icon: 'trash' });
    updateDock();
    refresh();
  },

  exportSave() {
    const blob = new Blob([exportState(state)], { type: 'application/json' });
    const link = h('a', { href: URL.createObjectURL(blob), download: `xenowalk-${new Date().toISOString().slice(0, 10)}.json` });
    document.body.append(link);
    link.click();
    setTimeout(() => {
      URL.revokeObjectURL(link.href);
      link.remove();
    }, 1000);
  },
  async importSave(text) {
    const result = parseSave(text);
    if (result.error) {
      toast(result.error, { icon: 'warning', kind: 'bad' });
      return;
    }
    if (!(await confirmDialog({ title: 'Load this save?', text: 'It replaces the galaxy you have now.', confirm: 'Load' }))) return;
    state = result.state;
    setWorld(state.world.origin ? state.world : null);
    dockedId = null;
    save();
    afterPosition();
    toast('Save loaded', { icon: 'import', kind: 'good' });
  },
  async newGame() {
    if (!(await confirmDialog({ title: 'Start over?', text: 'Your systems, cargo, credits and relics will be gone for good. Export a save first if you might want them back.', confirm: 'Start over', danger: true }))) return;
    clearState();
    location.reload();
  },
};

function owedNow() {
  return state.debt?.owed ?? 0;
}

// Tells the captain what the Glutta took, and when the debt is gone.
function noteRepayment(owedBefore, quiet = false) {
  const taken = owedBefore - owedNow();
  if (taken <= 0) return;
  if (!state.debt) {
    setTimeout(() => {
      feedback('delivered');
      toast(BANK.paidOff, { icon: 'credits', kind: 'gold' });
    }, 600);
  } else if (!quiet) {
    setTimeout(() => toast(`The Glutta took ${formatCredits(taken)} cr · ${formatCredits(state.debt.owed)} left`, { icon: 'credits' }), 500);
  }
}

function eventSystem() {
  return systemById(state, eventSystemId ?? dockedId);
}

function escape(text) {
  return String(text).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
}

// ---------------------------------------------------------------- feedback and saving

function feedback(name) {
  sound.play(name);
  haptics.play(name);
}

function save() {
  if (state) saveState(state);
}

// ---------------------------------------------------------------- start screen

function showStart() {
  const saved = loadState();
  document.body.classList.add('at-start');
  $('start').hidden = false;
  $('continue-game').hidden = !saved;
  $('new-game').classList.toggle('primary', !saved);
  $('world-id').value = saved?.world.id ?? randomWorldId();
  $('start-version').textContent = `Updated ${APP_UPDATED}`;
  map.start();

  $('continue-game').onclick = () => {
    state = saved;
    begin();
  };
  $('new-game').onclick = async () => {
    if (saved && !(await confirmDialog({ title: 'Start a new game?', text: 'Your saved galaxy will be overwritten.', confirm: 'New game', danger: true }))) return;
    const id = $('world-id').value.trim().toUpperCase().slice(0, 32) || randomWorldId();
    state = createInitialState(id, now());
    save();
    begin();
    setTimeout(() => openGuide(), 900);
  };
}

function begin() {
  sound.unlock();
  heading.start();
  requestPersistentStorage();
  const start = $('start');
  document.body.classList.remove('at-start');
  start.classList.add('leaving');
  setTimeout(() => {
    start.hidden = true;
    start.classList.remove('leaving');
    // Docking may have happened behind the start screen; its event shows now.
    maybeShowEvent();
  }, 600);
  if (state.world.origin) setWorld(state.world);
  shownDay = galacticDay(now());
  if (isDebug) {
    // Debug starts where the game was, or in Warsaw; tapping the map moves.
    const last = state.lastDock && systemById(state, state.lastDock.systemId);
    tracker.setManualPosition(last ? { lat: last.lat, lon: last.lon } : state.systems[0] ?? DEBUG_START);
  } else {
    tracker.start();
  }
  refresh();
  setInterval(tick, TICK_MS);
}

// ---------------------------------------------------------------- position and docking

tracker.addEventListener('reading', () => {
  if (!state) return;
  const { position } = tracker;
  if (!state.world.origin) {
    // The sectors are laid out around the place the game starts.
    state.world.origin = { lat: position.lat, lon: position.lon };
    setWorld(state.world);
    save();
  }
  afterPosition();
});

tracker.addEventListener('change', () => updateGps());
heading.addEventListener('change', () => updateScene());

// Readings come about once a second: they move the map and the HUD, but the
// page is re-rendered only when docking changes (or on the tick), never on
// every reading, or a button pressed at that moment would lose its release.
function afterPosition() {
  const first = !player;
  if (tracker.position && hasWorld()) player = toWorld(tracker.position);
  updateDock();
  updateScene();
  updateHud();
  if (first) refreshPage();
}

function updateDock() {
  if (!state || !player) return;
  const system = dockedSystem(state, player, dockedId);
  const id = system?.id ?? null;
  if (id === dockedId) {
    maybeShowEvent();
    return;
  }
  const previous = dockedId !== null ? systemById(state, dockedId) : null;
  dockedId = id;
  resetOrders();
  if (previous && !system) {
    feedback('undock');
    toast(`Left <b>${escape(previous.name)}</b>. Deep space.`, { icon: 'ship' });
  }
  if (system) dock(system);
  if (activeTab === 'system') refreshPage();
}

function dock(system) {
  const t = now();
  recordDock(state, system, t);
  refreshMarket(system, galacticDay(t));
  const owed = owedNow();
  const delivered = deliverMissions(state, system, t);
  if (delivered.length) setTimeout(() => noteRepayment(owed), 800);
  save();
  feedback('dock');
  map.ripple(system, SECTORS[system.sector].color);
  toast(`Docked at <b>${escape(system.name)}</b>`, { icon: 'system' });
  for (const mission of delivered) {
    setTimeout(() => {
      feedback('delivered');
      toast(`Delivered ${mission.units} crates · <b>+${formatCredits(mission.reward)} cr</b>`, { icon: 'mission', kind: 'good' });
    }, 700);
  }
  maybeShowEvent();
}

// Today's event greets the captain once per dock, when nothing else is open.
function maybeShowEvent() {
  const system = app.docked;
  if (!system || isDialogOpen() || !$('start').hidden) return;
  const t = now();
  const drawn = system.pendingEvent;
  const event = systemEvent(state, system, t);
  if (!event) return;
  if (event !== drawn) save();
  const key = `${system.id}:${event.day}`;
  if (eventShownFor === key) return;
  eventShownFor = key;
  setTimeout(() => {
    if (app.docked?.id === system.id && !isDialogOpen()) app.openEvent(system);
  }, 900);
}

// ---------------------------------------------------------------- discovering

async function discover() {
  const position = tracker.position;
  const check = discoveryCheck(state, position, { goodSignal: tracker.hasGoodSignal, speed: position?.speed ?? null });
  if (!check.ok) {
    feedback('error');
    toast(check.reason, { icon: 'warning' });
    return;
  }
  const options = planetOptions(state, check.point);
  map.setScene({ showArea: true });
  const choice = await openDiscoverDialog(app, check, options);
  map.setScene({ showArea: false });
  if (!choice) return;
  const again = discoveryCheck(state, position, { goodSignal: true, speed: null });
  if (!again.ok) {
    toast(again.reason, { icon: 'warning' });
    return;
  }
  const { system } = discoverSystem(state, position, choice, now());
  save();
  feedback('discover');
  map.ripple(system, SECTORS[system.sector].color, 5);
  toast(`<b>${escape(system.name)}</b> charted. Welcome to your galaxy.`, { icon: 'discover', kind: 'good' });
  dockedId = null;
  updateDock();
  refresh();
}

// ---------------------------------------------------------------- the tick

function tick() {
  if (!state) return;
  const t = now();
  const day = galacticDay(t);
  if (day !== shownDay) {
    shownDay = day;
    eventShownFor = null;
    const news = newsFor(state, day);
    save();
    feedback('news');
    toast(news.length ? 'A new galactic day. Markets restocked, and there is news.' : 'A new galactic day. Markets restocked.', { icon: 'news', kind: 'gold' });
    if (app.docked) refreshMarket(app.docked, day);
    maybeShowEvent();
  }
  const expired = expireMissions(state, t);
  if (expired.length) {
    save();
    feedback('expired');
    for (const mission of expired) {
      const to = systemById(state, mission.to);
      toast(`Delivery to ${escape(to?.name ?? 'nowhere')} expired. The cargo is lost.`, { icon: 'clock', kind: 'bad' });
    }
  }
  updateHud();
  if (activeTab === 'cargo' || (activeTab === 'system' && !app.docked)) {
    // Countdowns and distances.
    if (t % 10_000 < TICK_MS) refreshPage();
  }
}

// ---------------------------------------------------------------- rendering

function refresh() {
  if (!state) return;
  updateScene();
  updateHud();
  refreshPage();
}

function updateScene() {
  if (!state) return;
  const day = galacticDay(now());
  const news = hasWorld() ? newsFor(state, day) : [];
  const newsIds = new Set(news.filter((item) => item.left > 0).map((item) => item.systemId));
  const targets = new Set(state.missions.map((mission) => mission.to));
  const pointers = [];
  for (const system of state.systems) {
    if (newsIds.has(system.id)) pointers.push({ x: system.x, y: system.y, color: '#ffd479', label: system.name.toUpperCase() });
    else if (targets.has(system.id)) pointers.push({ x: system.x, y: system.y, color: '#5fe6ff', label: system.name.toUpperCase() });
  }
  map.setScene({
    player: player ? { ...player, accuracy: tracker.position?.accuracy ?? 0, heading: heading.heading } : null,
    systems: state.systems.map((system) => ({
      id: system.id,
      x: system.x,
      y: system.y,
      name: system.name,
      sector: system.sector,
      planetCount: system.planets.length,
      main: system.main,
      docked: system.id === dockedId,
      event: system.lastEventDay !== day,
      news: newsIds.has(system.id),
      target: targets.has(system.id),
      ref: system,
    })),
    pointers,
  });
}

function updateHud() {
  if (!state) return;
  updateCredits();
  updateGps();
  const ship = SHIPS[state.ship];
  $('tab-cargo').textContent = `${cargoUnits(state)}/${ship.hold}`;
  $('tab-codex').textContent = `${state.artifacts.length}/36`;
  const docked = app.docked;
  $('tab-system').textContent = docked ? docked.name : 'Deep Space';
  $('tab-map').textContent = hasWorld() ? `${state.systems.length} systems` : 'Galaxy';
  setBadge('system', docked && pendingEvent(docked, now()) ? 'cyan' : null);
  setBadge('codex', newArtifacts.size ? 'gold' : null);
  setBadge('cargo', state.missions.length ? 'gold' : null);
  updateAction();
  updateTicker();
}

function setBadge(tab, kind) {
  const button = document.querySelector(`[data-tab="${tab}"]`);
  let badge = button.querySelector('.badge');
  if (!kind) {
    badge?.remove();
    return;
  }
  if (!badge) {
    badge = h('span.badge');
    button.append(badge);
  }
  badge.classList.toggle('gold', kind === 'gold');
}

function updateCredits() {
  const target = Math.round(state.credits);
  if (shownCredits === null) {
    shownCredits = target;
    $('credits-value').textContent = formatCredits(target);
    return;
  }
  if (target === shownCredits) return;
  const from = shownCredits;
  shownCredits = target;
  const box = $('credits');
  box.classList.remove('up', 'down');
  void box.offsetWidth;
  box.classList.add(target > from ? 'up' : 'down');
  const start = performance.now();
  const step = (time) => {
    const t = Math.min(1, (time - start) / 700);
    const eased = 1 - (1 - t) ** 3;
    $('credits-value').textContent = formatCredits(from + (target - from) * eased);
    if (t < 1 && shownCredits === target) requestAnimationFrame(step);
  };
  requestAnimationFrame(step);
}

function updateGps() {
  const gps = $('gps');
  const signal = tracker.signal;
  gps.className = `gps ${signal === 'good' ? 'good' : signal === 'poor' ? 'poor' : signal === 'searching' ? 'searching' : 'off'}`;
  $('gps-label').textContent = signal === 'good' && tracker.position ? `±${Math.round(tracker.position.accuracy)} m` : signal === 'poor' ? 'WEAK' : signal === 'searching' ? 'GPS' : 'NO GPS';
}

function updateAction() {
  const button = $('action');
  const title = button.querySelector('.action-title');
  const detail = button.querySelector('.action-detail');
  const use = button.querySelector('use');
  const docked = app.docked;
  if (docked) {
    const waiting = pendingEvent(docked, now());
    use.setAttribute('href', 'img/icons.svg#i-system');
    title.textContent = docked.name;
    detail.textContent = waiting ? 'Someone is waiting for you · open the system' : 'Docked · open market and shipyard';
    button.classList.remove('disabled');
    button.classList.toggle('pulse', Boolean(waiting));
    button.onclick = () => goTo('system');
    return;
  }
  button.classList.remove('pulse');
  use.setAttribute('href', 'img/icons.svg#i-discover');
  title.textContent = 'Discover System';
  const check = discoveryCheck(state, tracker.position, { goodSignal: tracker.hasGoodSignal, speed: tracker.position?.speed ?? null });
  button.classList.toggle('disabled', !check.ok);
  if (check.ok) {
    detail.textContent = check.price ? `${formatCredits(check.price)} cr · ${check.nearby + 1}/8 in this area` : `Free · ${state.freeDiscoveries} free left`;
  } else {
    detail.textContent = check.reason === 'Not enough credits' ? `Needs ${formatCredits(check.price)} cr` : check.reason;
  }
  button.onclick = discover;
}

// A line under the top bar: first-steps hints, else rotating status and news.
function updateTicker() {
  const t = now();
  const day = galacticDay(t);
  const items = [];
  let hint = null;
  if (tracker.signal === 'denied') hint = ['GPS', 'Location access is blocked. Allow it for this site in your browser settings.'];
  else if (tracker.signal === 'unavailable' && !tracker.position) hint = ['GPS', 'This device isn’t reporting a location yet. Retrying…'];
  else if (!tracker.position) hint = ['GPS', 'Waiting for a GPS fix. Open sky helps.'];
  else if (state.systems.length === 0) hint = ['START', 'Stand at home and tap <b>Discover System</b>. Your first two systems are free.'];
  else if (state.systems.length === 1) hint = ['NEXT', 'Walk to a place you often visit, at least 300 m away, and chart a second system.'];
  else if (state.stats.bought + state.stats.sold === 0) hint = ['TRADE', 'Dock at a system and open its market: buy what it sells, sell where it’s wanted.'];
  if (hint) {
    items.push({ tag: hint[0], kind: 'hint', text: hint[1] });
  } else {
    const docked = app.docked;
    if (docked) items.push({ tag: 'DOCKED', text: `<b>${escape(docked.name)}</b> · ${SECTORS[docked.sector].short}` });
    for (const item of newsFor(state, day)) {
      if (item.left <= 0) continue;
      const system = systemById(state, item.systemId);
      items.push({ tag: 'NEWS', kind: 'gold', text: `<b>${goodById[item.good].name}</b> wanted at ${escape(system.name)} · 200%` });
    }
    for (const mission of state.missions) {
      const to = systemById(state, mission.to);
      items.push({ tag: 'CARGO', text: `${mission.units} crates to <b>${escape(to?.name ?? '?')}</b> · ${formatDuration(mission.deadline - t)} left` });
    }
    if (!docked && player && state.systems.length) {
      const nearest = state.systems.map((s) => ({ s, d: Math.hypot(s.x - player.x, s.y - player.y) })).sort((a, b) => a.d - b.d)[0];
      items.push({ tag: 'NAV', text: `${escape(nearest.s.name)} · ${formatDistance(nearest.d)}` });
    }
    const weekday = galacticWeekday(t);
    if ((weekday === 4 || weekday === 5) && SHIPS[state.ship].missionKm > LONG_MISSION_KM) {
      items.push({ tag: 'WEEKEND', kind: 'gold', text: `Jobs beyond ${LONG_MISSION_KM} km on offer today, due Sunday 20:00` });
    }
    if (weekday >= 5) items.push({ tag: 'WEEKEND', kind: 'gold', text: `Up to ${MAX_KM_PER_WEEKEND_DAY} km count toward relics today` });
    if (state.debt) items.push({ tag: 'DEBT', text: `You owe the Glutta <b>${formatCredits(state.debt.owed)} cr</b>` });
    items.push({ tag: 'DAY', text: `New galactic day in ${formatDuration(nextDayStart(t) - t)}` });
  }
  const index = Math.floor(Date.now() / TICKER_MS) % items.length;
  const item = items[index];
  const key = `${item.tag}|${item.text}`;
  const ticker = $('ticker');
  if (key === tickerKey) return;
  const swap = index !== tickerIndex;
  tickerIndex = index;
  tickerKey = key;
  ticker.innerHTML = `<span class="tag ${item.kind ?? ''}">${item.tag}</span><span class="text">${item.text}</span>`;
  if (swap) {
    ticker.classList.remove('swap');
    void ticker.offsetWidth;
    ticker.classList.add('swap');
  }
}

// ---------------------------------------------------------------- tabs and pages

function goTo(tab) {
  if (tab === activeTab && tab !== 'map') return;
  activeTab = tab;
  document.body.classList.toggle('on-map', tab === 'map');
  for (const button of document.querySelectorAll('[data-tab]')) button.classList.toggle('active', button.dataset.tab === tab);
  const sheet = $('sheet');
  if (tab === 'map') {
    sheet.hidden = true;
    $('map-hud').hidden = false;
    map.start();
  } else {
    sheet.hidden = false;
    $('map-hud').hidden = true;
    for (const page of sheet.querySelectorAll('.page')) page.hidden = page.id !== `page-${tab}`;
    // The footer is the System page's trade bar; it shows up when that page renders.
    if (tab !== 'system') $('sheet-footer').hidden = true;
    $(`page-${tab}`).scrollTop = 0;
    refreshPage();
    map.stop();
  }
}

// A re-render while a finger is down would replace what it presses (and jerk
// a scroll), so it waits for the release. A lost release can't block it for
// long: a new first touch starts the count over, and it waits 2.5 s at most.
const pointersDown = new Set();
let refreshWaiting = null;
window.addEventListener(
  'pointerdown',
  (event) => {
    if (event.isPrimary) pointersDown.clear();
    pointersDown.add(event.pointerId);
  },
  true,
);
for (const type of ['pointerup', 'pointercancel']) {
  window.addEventListener(
    type,
    (event) => {
      pointersDown.delete(event.pointerId);
      if (!pointersDown.size && refreshWaiting) setTimeout(refreshPage, 0);
    },
    true,
  );
}

function refreshPage() {
  if (!state || activeTab === 'map') return;
  if (pointersDown.size && (!refreshWaiting || performance.now() - refreshWaiting < 2500)) {
    refreshWaiting ??= performance.now();
    return;
  }
  refreshWaiting = null;
  const page = $(`page-${activeTab}`);
  const scroll = page.scrollTop;
  if (activeTab === 'system') renderSystemPage(page, app, $('sheet-footer'));
  else if (activeTab === 'cargo') renderCargoPage(page, app);
  else if (activeTab === 'codex') renderCodexPage(page, app);
  page.scrollTop = scroll;
}

// ---------------------------------------------------------------- wiring

for (const button of document.querySelectorAll('[data-tab]')) {
  button.addEventListener('click', () => {
    sound.unlock();
    if (button.dataset.tab !== activeTab) sound.play('tab');
    goTo(button.dataset.tab);
  });
}

$('menu-button').addEventListener('click', () => {
  sound.unlock();
  if (state) openMenu(app);
});

$('gps').addEventListener('click', () => {
  const messages = {
    good: `GPS is good, accurate to ${Math.round(tracker.position?.accuracy ?? 0)} m.`,
    poor: 'The GPS signal is weak. Docking and charting wait for a better fix.',
    searching: 'Looking for a GPS fix…',
    denied: 'Location access is blocked. Allow it in your browser settings to play.',
    unavailable: 'This device can’t report its location.',
  };
  toast(messages[tracker.signal] ?? 'GPS', { icon: 'gps' });
});

$('zoom-in').addEventListener('click', () => map.zoomBy(1 / 1.5));
$('zoom-out').addEventListener('click', () => map.zoomBy(1.5));
$('recenter').addEventListener('click', () => map.recenter());
map.onPan = (panned) => {
  $('recenter').hidden = !panned;
};
map.onScale = (meters, pixels) => {
  $('scale').querySelector('.bar').style.width = `${pixels}px`;
  $('scale').querySelector('.text').textContent = formatDistance(meters);
};
map.onSystemTap = (scene) => {
  sound.play('tap');
  if (scene.ref.id === dockedId) goTo('system');
  else openSystemCard(app, scene.ref);
};
map.onTap = (point) => {
  if (!isDebug || !state || !hasWorld()) return;
  // Debug: walk there, facing along the move.
  if (player) heading.setManual((Math.atan2(point.x - player.x, point.y - player.y) * 180) / Math.PI);
  tracker.setManualPosition(fromWorld(point));
};

document.addEventListener('visibilitychange', () => {
  if (document.hidden) {
    save();
    map.stop();
  } else if (state) {
    tracker.resume();
    // Opening the app in a system shows its event again.
    eventShownFor = null;
    if (activeTab === 'map') map.start();
    refresh();
  }
});

document.fonts?.ready.then(() => map.draw());

if (isDebug) {
  debugPanel = new DebugPanel($('debug'), tracker, {
    describeGame: () => (state ? `${state.systems.length} systems · day ${galacticDay(now())} · km ${state.artifactKm.toFixed(2)} · docked ${app.docked?.name ?? '—'}` : 'no game'),
    onTimeChange: () => tick(),
    addCredits: () => {
      if (!state) return;
      state.credits += 5000;
      save();
      refresh();
    },
  });
}

document.body.classList.add('on-map');
showStart();

// Offline play once installed. Not on a development server, where a cached
// copy would hide every edit, unless asked for with ?sw.
const devServer = ['localhost', '127.0.0.1', '[::1]'].includes(location.hostname);
if ('serviceWorker' in navigator && (!devServer || new URLSearchParams(location.search).has('sw'))) {
  navigator.serviceWorker.register(`sw.js?v=${APP_UPDATED}`, { scope: './' }).catch((error) => console.warn('Service worker not registered', error));
}

// Exposed for poking at the game from the console in debug mode.
if (isDebug) window.xenowalk = { app, get state() { return state; }, tracker, map, fromWorld, toWorld };
