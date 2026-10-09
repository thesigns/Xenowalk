// The Cargo page: the ship and its hold, the captain's rank, deliveries
// under way, and the log: kilometers toward the next relic and a few records.

import { GOODS, RANKS, SHIPS, goodById } from './data.js';
import { MAX_KM_PER_DAY, artifactChance, galacticDay, systemById, ARTIFACT_MAX_CHANCE } from './game.js';
import { fill, formatCredits, formatDistance, formatDuration, h, icon, rankInsignia } from './ui.js';

const MAX_HOLD_SEGMENTS = 40;

export function renderCargoPage(root, app) {
  const { state } = app;
  const now = app.now();
  fill(
    root,
    h('div.page-head', {}, h('div', {}, h('div.eyebrow', {}, 'Captain'), h('h1.page-title', {}, 'Ship & cargo'))),
    shipCard(app),
    rankCard(state),
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
    h('div.ship-name', {}, h('h3', {}, ship.name), h('span.num', {}, `${used}/${ship.hold}`)),
    h('div.hold', {}, segments),
    h('div.muted', { style: { fontSize: '13px' } }, ship.tagline),
  );
}

function rankCard(state) {
  const rank = RANKS[state.rank];
  const next = RANKS[state.rank + 1];
  const progress = next ? Math.min(1, (state.profit - rank.profit) / (next.profit - rank.profit)) : 1;
  const bar = h('div.meter.gold', {}, h('i', { style: { width: `${Math.max(0, progress) * 100}%` } }));
  return h(
    'div.card.rank-card',
    {},
    rankInsignia(state.rank),
    h(
      'div',
      {},
      h('div.eyebrow', {}, `Rank ${state.rank + 1} of ${RANKS.length}`),
      h('div.rank-name', {}, rank.name),
      h(
        'div.rank-detail',
        {},
        next
          ? `${formatCredits(state.profit)} / ${formatCredits(next.profit)} cr profit · next: ${next.name}`
          : `${formatCredits(state.profit)} cr lifetime profit. There is nothing above Elite.`,
      ),
      bar,
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
  const chance = artifactChance(state);
  const complete = state.artifacts.length >= 36;
  const signal = h(
    'div.card.signal-card',
    {},
    h('div.signal-head', {}, h('div', {}, h('div.eyebrow', {}, 'Relic signal'), h('div.muted', { style: { fontSize: '12px' } }, complete ? 'Every relic is home. The signal is quiet.' : 'Grows with every kilometer between your systems. Sealed containers may answer it.')), h('span.value', {}, complete ? '—' : `${Math.round(chance * 100)}%`)),
    h('div.meter.gold', {}, h('i', { style: { width: `${(chance / ARTIFACT_MAX_CHANCE) * 100}%` } })),
    h('div.muted', { style: { fontSize: '12px' } }, `Today: ${kmToday.toFixed(1)} of ${MAX_KM_PER_DAY} km counted`),
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
      stat('Dice', stats.diceGames ? `${stats.diceWins}–${stats.diceGames - stats.diceWins}` : '—'),
    ),
  );
}

export function goodName(id) {
  return goodById[id].name;
}
