// The System page: the market, today's event and the shipyard of the system
// the player is docked at, or, in deep space, the way to their systems.

import { GOODS, SECTORS, SHIPS, economyById, goodById, kebab } from './data.js';
import {
  buyPrice,
  galacticDay,
  newsFor,
  newsItem,
  nextDayStart,
  pendingEvent,
  quoteTrade,
  refreshMarket,
  sellTiers,
  shipCost,
  systemById,
  variantOf,
} from './game.js';
import { direction, fill, formatCredits, formatDistance, formatDuration, h, holdRepeat, icon, signed } from './ui.js';

// The units the player has dialed in, per good: negative sells, positive buys.
let orders = {};
let ordersFor = null;

export function resetOrders() {
  orders = {};
  ordersFor = null;
}

export function renderSystemPage(root, app) {
  const system = app.docked;
  fill(root, system ? dockedView(system, app) : deepSpaceView(app));
}

function sectorColor(system) {
  return SECTORS[system.sector].color;
}

// ---------------------------------------------------------------- docked

function dockedView(system, app) {
  const { state } = app;
  const now = app.now();
  const day = galacticDay(now);
  refreshMarket(system, day);
  if (ordersFor !== system.id) {
    orders = {};
    ordersFor = system.id;
  }
  const economy = economyById[system.economy];
  const sector = SECTORS[system.sector];
  const parts = [];

  parts.push(
    h(
      'div.card.framed.system-hero',
      { style: { '--sector': sector.color } },
      h(
        'div',
        {},
        h('div.eyebrow', {}, 'Docked at'),
        h('h1.page-title', {}, system.name),
        h(
          'div.chips',
          {},
          h('span.chip', { style: { color: sector.color } }, sector.short),
          h('span.chip.plain', { style: { color: 'var(--ink-2)' } }, economy.name),
        ),
        h('div.planets-line', {}, system.planets.map((planet, i) => (i === system.main ? `${planet.name} ◆` : planet.name)).join('  ·  ')),
        h(
          'div.system-tools',
          {},
          h('button.button.small', { type: 'button', onclick: () => app.renameSystem(system) }, icon('edit'), 'Rename'),
          h('button.button.small', { type: 'button', onclick: () => app.showSystemInfo(system) }, icon('info'), 'Info'),
        ),
      ),
      h('img.planet-art', { src: `img/planets/${kebab(system.economy)}.svg`, alt: '' }),
    ),
  );

  parts.push(eventCard(system, app, day, now));

  const news = newsItem(state, system.id, day);
  if (news && news.left > 0) {
    const good = goodById[news.good];
    parts.push(
      h(
        'div.card.news-card',
        {},
        icon('news'),
        h('div', {}, h('b', {}, `Shortage of ${good.name}`), h('div.muted', {}, `Pays ${Math.round(good.base * 2)} cr for the next ${news.left} today`)),
      ),
    );
  }

  parts.push(marketSection(system, app, day));
  parts.push(shipyardSection(app));
  return parts;
}

function eventCard(system, app, day, now) {
  const { state } = app;
  if (system.lastEventDay === day) {
    return h('div.card.event-card.done', {}, icon('event'), h('div', {}, `Today's event is done. Next one in ${formatDuration(nextDayStart(now) - now)}.`));
  }
  const event = pendingEvent(system, now);
  if (!event) {
    return h('div.card.event-card.done', {}, icon('event'), h('div', {}, 'Nobody is waiting for you here right now.'));
  }
  const variant = variantOf(event);
  return h(
    'button.card.event-card',
    { type: 'button', onclick: () => app.openEvent(system) },
    h('img', { src: `img/characters/${variant.id}.svg`, alt: '' }),
    h('div', {}, h('div.eyebrow', {}, variant.title), h('b', {}, variant.name), h('div.muted', {}, 'Wants a word with you.')),
    icon('chevron'),
  );
}

// ---------------------------------------------------------------- market

function marketSection(system, app, day) {
  const { state } = app;
  const produced = economyById[system.economy].produces;
  const rows = GOODS.map((good) => marketRow(system, good, produced, app, day));
  const bar = tradeBar(system, app, day);
  return h(
    'section.section',
    {},
    h('h2.section-title', {}, 'Market', h('span.aside', {}, `Hold ${holdText(state, app)}`)),
    quickActions(system, app, day),
    h('div.market', {}, rows),
    bar,
  );
}

function holdText(state, app) {
  const used = app.cargoUnits() + Object.values(orders).reduce((sum, units) => sum + units, 0);
  return `${used}/${SHIPS[state.ship].hold}`;
}

function marketRow(system, good, produced, app, day) {
  const { state } = app;
  const held = state.cargo[good.id].units;
  const relation = economyById[system.economy].relations[good.id];
  const tiers = sellTiers(state, system, good.id, day);
  const isProduct = good.id === produced;
  const qty = orders[good.id] ?? 0;

  const prices = [];
  if (isProduct) {
    prices.push(h('span.price.offer', {}, h('span.k', {}, 'BUY'), `${buyPrice(system)}`, h('span.muted', {}, ` · ${system.market.stock} left`)));
  }
  const top = tiers[0];
  const kind = top.kind === 'news' ? 'hot' : relation === 'E' ? 'exotic' : relation === 'D' ? 'wanted' : '';
  const label = top.kind === 'news' ? 'SHORTAGE' : top.kind === 'demand' ? (relation === 'E' ? 'EXOTIC' : 'WANTED') : 'SELL';
  prices.push(
    h(
      `span.price${kind ? `.${kind}` : ''}`,
      {},
      h('span.k', {}, label),
      `${top.price}`,
      Number.isFinite(top.units) ? h('span.muted', {}, ` · ${top.units}`) : null,
    ),
  );
  if (tiers.length > 1 && top.kind !== 'regular') prices.push(h('span.price', {}, h('span.k', {}, 'THEN'), `${tiers[tiers.length - 1].price}`));

  const qtyLabel = h(`span.qty${qty < 0 ? '.sell' : qty > 0 ? '.buy' : ''}`, {}, qty === 0 ? '0' : qty < 0 ? `−${-qty}` : `+${qty}`);
  const minus = h('button', { type: 'button', 'aria-label': `Sell ${good.name}`, disabled: qty <= -held }, icon('minus'));
  const plus = h('button', { type: 'button', 'aria-label': `Buy ${good.name}`, disabled: qty < 0 ? false : !isProduct }, icon('plus'));
  const change = (delta) => {
    const next = (orders[good.id] ?? 0) + delta;
    if (next < -held) return;
    if (next > 0 && !isProduct) return;
    if (next > system.market.stock) return;
    if (delta > 0 && next > 0 && app.freeHold() - Object.values(orders).reduce((s, u) => s + u, 0) <= 0) return;
    orders[good.id] = next;
    app.feedbackSoft();
    app.refreshPage();
  };
  holdRepeat(minus, () => change(-1));
  holdRepeat(plus, () => change(1));

  return h(
    `div.market-row${qty < 0 ? '.selling' : qty > 0 ? '.buying' : ''}`,
    {},
    h('span.good-icon', { style: { '--good': good.color } }, icon(good.id)),
    h('div.name', {}, good.name, h('span.held', {}, held ? `${held} aboard` : '')),
    h('div.prices', {}, prices),
    h('div.stepper', {}, minus, qtyLabel, plus),
  );
}

// Appears once something is dialed in: what it comes to, and the button.
function tradeBar(system, app, day) {
  const { state } = app;
  const active = Object.entries(orders).filter(([, units]) => units !== 0);
  if (!active.length) return null;
  const quote = quoteTrade(state, system, orders, day);
  const sold = active.filter(([, u]) => u < 0).reduce((s, [, u]) => s - u, 0);
  const bought = active.filter(([, u]) => u > 0).reduce((s, [, u]) => s + u, 0);
  const net = quote.net ?? 0;
  const confirm = h(
    'button.button.primary',
    {
      type: 'button',
      disabled: !quote.ok,
      onclick: () => {
        const result = app.trade(system, orders);
        if (result?.ok) {
          orders = {};
          app.refreshPage();
        }
      },
    },
    'Trade',
  );
  return h(
    'div.trade-bar',
    {},
    h(
      'div.trade-summary',
      {},
      h('span', {}, quote.ok ? [sold ? `Sell ${sold}` : '', bought ? `Buy ${bought}` : ''].filter(Boolean).join(' · ') : quote.reason),
      h(`span.net${net > 0 ? '.plus' : net < 0 ? '.minus' : ''}`, {}, `${signed(net)} cr`),
    ),
    h('button.button', { type: 'button', 'aria-label': 'Clear', onclick: () => { orders = {}; app.refreshPage(); } }, icon('close')),
    confirm,
  );
}

// Shortcuts: sell everything this market pays well for, or fill the hold with its product.
function quickActions(system, app, day) {
  const { state } = app;
  const produced = economyById[system.economy].produces;
  const sellWanted = () => {
    for (const good of GOODS) {
      const held = state.cargo[good.id].units;
      if (!held || good.id === produced) continue;
      const top = sellTiers(state, system, good.id, day)[0];
      if (top.kind !== 'regular') orders[good.id] = -held;
    }
    app.refreshPage();
  };
  const fill = () => {
    const room = app.freeHold() - Object.values(orders).reduce((s, u) => s + u, 0) + Math.max(0, orders[produced] ?? 0);
    const affordable = Math.floor(state.credits / buyPrice(system));
    orders[produced] = Math.max(0, Math.min(room, system.market.stock, affordable));
    app.refreshPage();
  };
  return h(
    'div.quick',
    {},
    h('button.button.small', { type: 'button', onclick: sellWanted }, 'Sell wanted'),
    h('button.button.small', { type: 'button', onclick: fill }, 'Fill hold'),
  );
}

// ---------------------------------------------------------------- shipyard

function shipyardSection(app) {
  const { state } = app;
  const offers = SHIPS.map((ship, index) => ({ ship, index })).filter(({ index }) => index > state.ship);
  if (!offers.length) {
    return h('section.section', {}, h('h2.section-title', {}, 'Shipyard'), h('div.empty', {}, 'You fly the biggest ship there is. Respect.'));
  }
  return h(
    'section.section',
    {},
    h('h2.section-title', {}, 'Shipyard', h('span.aside', {}, `Your ${SHIPS[state.ship].name} counts for half its price`)),
    h(
      'div.shipyard',
      {},
      offers.map(({ ship, index }) => {
        const cost = shipCost(state, index);
        return h(
          'div.card.ship-offer',
          {},
          h('img', { src: `img/ships/${ship.id}.svg`, alt: '' }),
          h(
            'div',
            {},
            h('b', {}, ship.name),
            h('div.muted', {}, `Hold ${ship.hold} · ${ship.tagline}`),
            h(
              'button.button.small',
              { type: 'button', disabled: state.credits < cost, onclick: () => app.buyShip(index) },
              `${formatCredits(cost)} cr`,
            ),
          ),
        );
      }),
    ),
  );
}

// ---------------------------------------------------------------- deep space

function deepSpaceView(app) {
  const { state } = app;
  const now = app.now();
  const day = galacticDay(now);
  const player = app.player;
  const parts = [];

  const sorted = player
    ? [...state.systems].map((system) => ({ system, d: Math.hypot(system.x - player.x, system.y - player.y) })).sort((a, b) => a.d - b.d)
    : state.systems.map((system) => ({ system, d: null }));

  const nearest = sorted[0];
  const compass = icon('ship', 'compass');
  if (nearest && player) compass.style.transform = `rotate(${direction(player, nearest.system).degrees}deg)`;
  parts.push(
    h(
      'div.card.framed.deep-space',
      {},
      nearest && player ? compass : icon('map', 'compass'),
      h('div.eyebrow', {}, 'Deep space'),
      h('h1.page-title', {}, nearest && player ? `${nearest.system.name} · ${formatDistance(nearest.d)} ${direction(player, nearest.system).word}` : 'No systems yet'),
      h(
        'p.muted',
        { style: { margin: 0 } },
        nearest ? 'Walk into a system to dock: trade, meet whoever waits there, buy ships.' : 'Go home and tap Discover System on the map. Your first two systems are free.',
      ),
    ),
  );

  const news = newsFor(state, day).filter((item) => item.left > 0);
  if (news.length) {
    parts.push(
      h(
        'section.section',
        {},
        h('h2.section-title', {}, 'Market news', h('span.aside', {}, `New day in ${formatDuration(nextDayStart(now) - now)}`)),
        news.map((item) => {
          const system = systemById(state, item.systemId);
          const good = goodById[item.good];
          return h(
            'button.card.news-card',
            { type: 'button', onclick: () => app.focusSystem(system) },
            icon('news'),
            h('div', {}, h('b', {}, `${good.name} wanted at ${system.name}`), h('div.muted', {}, `${Math.round(good.base * 2)} cr each, for ${item.left} more today`)),
          );
        }),
      ),
    );
  }

  if (sorted.length) {
    parts.push(
      h(
        'section.section.systems-list',
        {},
        h('h2.section-title', {}, 'Your systems', h('span.aside', {}, `${state.systems.length}`)),
        h(
          'div.list',
          {},
          sorted.map(({ system, d }) => {
            const hasEvent = system.lastEventDay !== day;
            const hasNews = news.some((item) => item.systemId === system.id);
            const isTarget = state.missions.some((mission) => mission.to === system.id);
            return h(
              'button.row',
              { type: 'button', style: { '--sector': sectorColor(system) }, onclick: () => app.focusSystem(system) },
              h('span.dot'),
              h('div.grow', {}, h('div.title', {}, system.name), h('div.sub', {}, `${economyById[system.economy].name}`)),
              h(
                'span.status-icons',
                {},
                hasEvent ? icon('event') : null,
                hasNews ? icon('news', 'gold') : null,
                isTarget ? icon('mission') : null,
              ),
              h('span.end', {}, d === null ? '' : formatDistance(d)),
            );
          }),
        ),
      ),
    );
  }
  return parts;
}
