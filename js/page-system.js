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

// `footer` sits under the scrolling page: the trade bar lives there, in the
// same place whether or not anything is selected, so it never pops up under
// a finger or covers the market.
export function renderSystemPage(root, app, footer) {
  const system = app.docked;
  if (system) {
    const bar = tradeBar(system, app, galacticDay(app.now()));
    fill(root, dockedView(system, app, bar));
    footer.replaceChildren(bar.element);
    footer.hidden = false;
  } else {
    fill(root, deepSpaceView(app));
    footer.replaceChildren();
    footer.hidden = true;
  }
}

function sectorColor(system) {
  return SECTORS[system.sector].color;
}

// ---------------------------------------------------------------- docked

function dockedView(system, app, bar) {
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

  parts.push(marketSection(system, app, day, bar));
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

// Steppers update the market in place: re-rendering the page under a finger
// would swallow the release that stops a held button.
function marketSection(system, app, day, bar) {
  const produced = economyById[system.economy].produces;
  const holdLabel = h('span.aside');
  const rows = GOODS.map((good) => marketRow(system, good, produced, app, day, () => update()));
  const update = () => {
    holdLabel.textContent = `Hold ${holdText(app)}`;
    for (const row of rows) row.update();
    bar.update();
  };
  bar.onChange = update;
  update();
  return h(
    'section.section',
    {},
    h('h2.section-title', {}, 'Market', holdLabel),
    quickActions(system, app, day, update),
    h('div.market', {}, rows.map((row) => row.element)),
  );
}

const ordered = () => Object.values(orders).reduce((sum, units) => sum + units, 0);

function holdText(app) {
  return `${app.cargoUnits() + ordered()}/${SHIPS[app.state.ship].hold}`;
}

// A market row and update(), which redraws its quantity and buttons.
function marketRow(system, good, produced, app, day, onChange) {
  const { state } = app;
  const held = state.cargo[good.id].units;
  const relation = economyById[system.economy].relations[good.id];
  const tiers = sellTiers(state, system, good.id, day);
  const isProduct = good.id === produced;

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

  const qtyLabel = h('span.qty');
  const minus = h('button', { type: 'button', 'aria-label': `Sell ${good.name}` }, icon('minus'));
  const plus = h('button', { type: 'button', 'aria-label': `Buy ${good.name}` }, icon('plus'));
  const element = h(
    'div.market-row',
    {},
    h('span.good-icon', { style: { '--good': good.color } }, icon(good.id)),
    h('div.name', {}, good.name, h('span.held', {}, held ? `${held} aboard` : '')),
    h('div.prices', {}, prices),
    h('div.stepper', {}, minus, qtyLabel, plus),
  );

  // Whether one more unit can be bought (or one less sold).
  const canAdd = (qty) => {
    const next = qty + 1;
    if (next <= 0) return true;
    return isProduct && next <= system.market.stock && app.freeHold() - ordered() > 0;
  };
  const change = (delta) => {
    const qty = orders[good.id] ?? 0;
    if (delta < 0 && qty <= -held) return;
    if (delta > 0 && !canAdd(qty)) return;
    orders[good.id] = qty + delta;
    app.feedbackSoft();
    onChange();
  };
  holdRepeat(minus, () => change(-1));
  holdRepeat(plus, () => change(1));

  const update = () => {
    const qty = orders[good.id] ?? 0;
    qtyLabel.textContent = qty === 0 ? '0' : qty < 0 ? `−${-qty}` : `+${qty}`;
    qtyLabel.className = `qty${qty < 0 ? ' sell' : qty > 0 ? ' buy' : ''}`;
    element.classList.toggle('selling', qty < 0);
    element.classList.toggle('buying', qty > 0);
    minus.disabled = qty <= -held;
    plus.disabled = !canAdd(qty);
  };
  return { element, update };
}

// What the selection comes to, and the buttons to clear it or trade. Built
// once per page; update() changes only texts and states, so the buttons never
// move or get replaced.
function tradeBar(system, app, day) {
  const { state } = app;
  const summary = h('span');
  const net = h('span.net');
  const clear = h('button.button', { type: 'button', 'aria-label': 'Clear selection' }, icon('close'));
  const confirm = h('button.button.primary', { type: 'button' }, 'Trade');
  const bar = {
    element: h('div.trade-bar', {}, h('div.trade-summary', {}, summary, net), clear, confirm),
    onChange: () => {},
    update() {
      const active = Object.entries(orders).filter(([, units]) => units !== 0);
      bar.element.classList.toggle('idle', !active.length);
      clear.disabled = !active.length;
      if (!active.length) {
        summary.textContent = 'Tap − to sell, + to buy';
        net.textContent = '';
        confirm.disabled = true;
        return;
      }
      const quote = quoteTrade(state, system, orders, day);
      const sold = active.filter(([, u]) => u < 0).reduce((sum, [, u]) => sum - u, 0);
      const bought = active.filter(([, u]) => u > 0).reduce((sum, [, u]) => sum + u, 0);
      const value = quote.net ?? 0;
      summary.textContent = quote.ok ? [sold ? `Sell ${sold}` : '', bought ? `Buy ${bought}` : ''].filter(Boolean).join(' · ') : quote.reason;
      net.textContent = `${signed(value)} cr`;
      net.className = `net${value > 0 ? ' plus' : value < 0 ? ' minus' : ''}`;
      confirm.disabled = !quote.ok;
    },
  };
  clear.addEventListener('click', () => {
    orders = {};
    bar.onChange();
  });
  confirm.addEventListener('click', () => {
    // Cleared first: a successful trade re-renders the page.
    const placed = orders;
    orders = {};
    const result = app.trade(system, placed);
    if (!result?.ok) {
      orders = placed;
      bar.onChange();
    }
  });
  return bar;
}

// Shortcuts: sell everything this market pays well for, or fill the hold with its product.
function quickActions(system, app, day, update) {
  const { state } = app;
  const produced = economyById[system.economy].produces;
  const sellWanted = () => {
    for (const good of GOODS) {
      const held = state.cargo[good.id].units;
      if (!held || good.id === produced) continue;
      const top = sellTiers(state, system, good.id, day)[0];
      if (top.kind !== 'regular') orders[good.id] = -held;
    }
    app.feedbackSoft();
    update();
  };
  const fill = () => {
    const room = app.freeHold() - ordered() + Math.max(0, orders[produced] ?? 0);
    const affordable = Math.floor(state.credits / buyPrice(system));
    orders[produced] = Math.max(0, Math.min(room, system.market.stock, affordable));
    app.feedbackSoft();
    update();
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
