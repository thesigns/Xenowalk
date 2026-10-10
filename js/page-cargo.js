// The Cargo page: the ship, which says who the captain is, the next one to
// work toward, the hold, deliveries under way, and the log: kilometers toward
// the next relic and a few records.

import { BANK, GOODS, SHIPS, goodById } from './data.js';
import { ARTIFACT_MAX_CHANCE, MAX_KM_PER_DAY, MAX_KM_PER_WEEKEND_DAY, artifactChance, galacticDay, isWeekend, shipCost, systemById } from './game.js';
import { debtWalkingText, priceText, shipTraits, walkingText } from './ship-view.js';
import { fill, formatCredits, formatDistance, formatDuration, h, icon } from './ui.js';

const MAX_HOLD_SEGMENTS = 40;

export function renderCargoPage(root, app) {
  const { state } = app;
  const now = app.now();
  fill(
    root,
    h('div.page-head', {}, h('div', {}, h('div.eyebrow', {}, 'Captain'), h('h1.page-title', {}, 'Ship & cargo'))),
    shipCard(app),
    debtCard(state),
    nextShipCard(app),
    holdSection(app),
    missionsSection(app, now),
    logSection(state, now),
  );
}

function shipCard(app) {
  const { state } = app;
  const ship = SHIPS[state.ship];
  const used = app.cargoUnits();
  const missionUnits = state.missions.reduce((sum, mission) => sum + mission.units, 0);
  // Big holds are drawn as one segment per few units.
  const per = Math.ceil(ship.hold / MAX_HOLD_SEGMENTS);
  const segments = [];
  for (let i = 0; i < ship.hold / per; i++) {
    const unit = i * per;
    const kind = unit < used - missionUnits ? 'cargo' : unit < used ? 'mission' : '';
    segments.push(h(`i${kind ? `.${kind}` : ''}`));
  }
  return h(
    'div.card.framed.ship-card',
    {},
    h('img.ship-art', { src: `img/ships/${ship.id}.svg`, alt: '' }),
    h('div.ship-name', {}, h('div', {}, h('div.eyebrow', {}, ship.maker), h('h3', {}, ship.name)), h('span.num', {}, `${used}/${ship.hold}`)),
    h('div.hold', {}, segments),
    shipTraits(ship, state.systems.length),
    h('div.muted', { style: { fontSize: '13px' } }, ship.tagline),
  );
}

function debtCard(state) {
  if (!state.debt) return null;
  return h(
    'div.card.bank-card.owing',
    {},
    h('img.banker', { src: `img/characters/${BANK.art}.svg`, alt: '' }),
    h('div', {}, h('div.eyebrow', {}, `You owe the ${BANK.name}`), h('div.debt', {}, priceText(state.debt.owed)), h('div.muted', { style: { fontSize: '12px' } }, `${debtWalkingText(state.debt.owed)} · half of every profit goes to the Glutta`)),
  );
}

// The next ship up, what it adds, and how far away it is in credits and km.
function nextShipCard(app) {
  const { state } = app;
  const next = SHIPS[state.ship + 1];
  if (!next) {
    return h('div.card.next-ship', {}, h('div', {}, h('div.eyebrow', {}, 'Next ship'), h('b', {}, 'There is no next ship.'), h('div.muted', {}, 'You fly the Discovery. Every road is yours.')));
  }
  const cost = shipCost(state, state.ship + 1);
  const progress = Math.max(0, Math.min(1, state.credits / cost));
  return h(
    'div.card.next-ship',
    {},
    h('img', { src: `img/ships/${next.id}.svg`, alt: '' }),
    h(
      'div',
      {},
      h('div.eyebrow', {}, 'Next ship'),
      h('b', {}, next.name),
      shipTraits(next),
      h('div.meter', {}, h('i', { style: { width: `${progress * 100}%` } })),
      h('div.muted', { style: { fontSize: '12px' } }, cost > state.credits ? `${priceText(cost - state.credits)} to go · ${walkingText(cost - state.credits)}` : `Affordable now: ${priceText(cost)} at any shipyard`),
    ),
  );
}

function holdSection(app) {
  const { state } = app;
  const goods = GOODS.filter((good) => state.cargo[good.id].units > 0);
  return h(
    'section.section',
    {},
    h('h2.section-title', {}, 'In the hold'),
    goods.length
      ? h(
          'div.list',
          {},
          goods.map((good) => {
            const held = state.cargo[good.id];
            const average = held.units ? held.cost / held.units : 0;
            return h(
              'div.row',
              {},
              h('span.good-icon', { style: { '--good': good.color } }, icon(good.id)),
              h('div.grow', {}, h('div.title', {}, good.name), h('div.sub', {}, average > 0 ? `Paid ${Math.round(average)} cr each` : 'Found in a container')),
              h('span.end', {}, `×${held.units}`),
            );
          }),
        )
      : h('div.empty', {}, 'The hold is empty. Buy what a system sells and carry it where it is wanted.'),
  );
}

function missionsSection(app, now) {
  const { state } = app;
  if (!state.missions.length) return null;
  return h(
    'section.section',
    {},
    h('h2.section-title', {}, 'Deliveries', h('span.aside', {}, `${state.missions.length} under way`)),
    h(
      'div.list',
      {},
      state.missions.map((mission) => {
        const to = systemById(state, mission.to);
        const left = mission.deadline - now;
        const distance = app.player && to ? formatDistance(Math.hypot(to.x - app.player.x, to.y - app.player.y)) : '';
        return h(
          'button.row.mission-row',
          { type: 'button', onclick: () => to && app.focusSystem(to) },
          h('span.good-icon', { style: { '--good': 'var(--gold)' } }, icon('mission')),
          h(
            'div.grow',
            {},
            h('div.title', {}, `${mission.units} crates to ${to?.name ?? 'a lost system'}`),
            h('div.sub', {}, h(`span.countdown${left < 3 * 3_600_000 ? '.urgent' : ''}`, {}, `${formatDuration(left)} left`), distance ? ` · ${distance}` : ''),
          ),
          h('span.end', { style: { color: 'var(--profit)' } }, `+${formatCredits(mission.reward)}`),
        );
      }),
    ),
  );
}

function logSection(state, now) {
  const day = galacticDay(now);
  const kmToday = state.kmToday.day === day ? state.kmToday.km : 0;
  const kmCap = isWeekend(now) ? MAX_KM_PER_WEEKEND_DAY : MAX_KM_PER_DAY;
  const chance = artifactChance(state);
  const complete = state.artifacts.length >= 36;
  const signal = h(
    'div.card.signal-card',
    {},
    h('div.signal-head', {}, h('div', {}, h('div.eyebrow', {}, 'Relic signal'), h('div.muted', { style: { fontSize: '12px' } }, complete ? 'Every relic is home. The signal is quiet.' : 'Grows with every kilometer between your systems. Sealed containers may answer it.')), h('span.value', {}, complete ? '—' : `${Math.round(chance * 100)}%`)),
    h('div.meter.gold', {}, h('i', { style: { width: `${(chance / ARTIFACT_MAX_CHANCE) * 100}%` } })),
    h('div.muted', { style: { fontSize: '12px' } }, `Today: ${kmToday.toFixed(1)} of ${kmCap} km counted${isWeekend(now) ? ' (weekend)' : ''}`),
  );
  const stats = state.stats;
  const stat = (label, value) => h('div.stat', {}, h('div.label', {}, label), h('div.value', {}, value));
  return h(
    'section.section',
    {},
    h('h2.section-title', {}, 'Log'),
    signal,
    h(
      'div.stat-grid',
      {},
      stat('Walked between systems', `${stats.km.toFixed(1)} km`),
      stat('Systems charted', String(stats.discovered)),
      stat('Units traded', String(stats.bought + stats.sold)),
      stat('Deliveries', String(stats.delivered)),
      stat('Containers opened', String(stats.containers)),
      stat('Substances mined', String(stats.mined ?? 0)),
      stat('Dice', stats.diceGames ? `${stats.diceWins}–${stats.diceGames - stats.diceWins}` : '—'),
      stat('Lifetime profit', `${formatCredits(state.profit)} cr`),
      // The calorie scale at work: what a kilometer has been worth so far.
      stat('Credits per km', stats.km >= 1 ? formatCredits(state.profit / stats.km) : '—'),
    ),
  );
}

export function goodName(id) {
  return goodById[id].name;
}
