// How a ship is shown wherever it appears: its three traits as chips, and
// prices also as the walking they stand for (GDD 5.2, 7.1).

import { CREDITS_PER_KM } from './data.js';
import { LOAN_REPAY_SHARE } from './game.js';
import { formatCredits, h, icon } from './ui.js';

export function systemsLabel(ship) {
  return Number.isFinite(ship.systems) ? `${ship.systems} systems` : 'Unlimited systems';
}

export function missionLabel(ship) {
  return ship.missionKm > 0 ? `Jobs to ${ship.missionKm} km` : 'No jobs';
}

// Hold, systems and delivery range, with how many systems are in use when given.
export function shipTraits(ship, systemsInUse = null) {
  const systems = systemsInUse === null ? systemsLabel(ship) : `${systemsInUse}/${Number.isFinite(ship.systems) ? ship.systems : '∞'} systems`;
  return h(
    'div.ship-traits',
    {},
    h('span.trait', {}, icon('cargo'), `Hold ${ship.hold}`),
    h('span.trait', {}, icon('system'), systems),
    h('span.trait', {}, icon('mission'), missionLabel(ship)),
  );
}

export function priceText(credits) {
  return `${formatCredits(credits)} cr`;
}

// How far a debt is in walking, with half of every profit going to the Glutta.
export function debtWalkingText(owed) {
  return `≈ ${formatCredits(Math.round(owed / (CREDITS_PER_KM * LOAN_REPAY_SHARE)))} km to pay back`;
}

// "≈ 450 km of walking" for a price.
export function walkingText(credits) {
  return `≈ ${formatCredits(Math.round(credits / CREDITS_PER_KM))} km of walking`;
}
