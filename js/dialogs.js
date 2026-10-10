// Dialogs: the three events and their variants, charting a system, the
// artifact reveal, new ships, cards for systems and relics,
// and the menu. Each takes `app` (see main.js) for state and actions.

import {
  ARTIFACTS,
  GOODS,
  SECTORS,
  BANK,
  SHIPS,
  artifactById,
  civById,
  economyById,
  goodById,
  kebab,
} from './data.js';
import {
  AREA_MAX_SYSTEMS,
  MIN_SPACING,
  buyPrice,
  freeHold,
  galacticDay,
  newsItem,
  pendingEvent,
  sellTiers,
  systemById,
  variantOf,
} from './game.js';
import { debtWalkingText, shipTraits, systemsLabel, walkingText } from './ship-view.js';
import {
  confirmDialog,
  direction,
  formatCredits,
  formatDate,
  formatDistance,
  h,
  icon,
  openDialog,
  openOverlay,
  prefersReducedMotion,
  signed,
  wait,
} from './ui.js';

const ACCENTS = {
  'alien-gambler': '#b77dff',
  'bored-dockhand': '#5fe6ff',
  'high-roller': '#ffd479',
  'shady-dealer': '#5b9dff',
  'scrap-merchant': '#ffb24d',
  smuggler: '#6dffa8',
  dispatcher: '#5fe6ff',
  medic: '#ff5d7d',
  foreman: '#ffb24d',
};

function encounter(variant) {
  return h(
    'div.encounter',
    { style: { '--accent': ACCENTS[variant.id] } },
    h('div.portrait', {}, h('img', { src: `img/characters/${variant.id}.svg`, alt: '' })),
    h('div.role', {}, variant.title),
    h('div.who', {}, variant.name),
    h('p.line', {}, `“${variant.line}”`),
  );
}

// Empties a dialog for its next step, keeping the close button.
function clearDialog(dialog) {
  for (const node of [...dialog.childNodes]) if (!node.classList?.contains('dialog-close')) node.remove();
}

const offerLine = (key, value) => h('div.offer-line', {}, h('span.k', {}, key), h('span.v', {}, value));

// ---------------------------------------------------------------- events

export function openEventDialog(app, system) {
  const event = pendingEvent(system, app.now());
  if (!event) return Promise.resolve();
  app.feedback('event');
  if (event.kind === 'dice') return diceDialog(app, event);
  if (event.kind === 'container') return containerDialog(app, event);
  return missionDialog(app, event);
}

// The house throws first; then fold for half the stake, or throw for all of it.
function diceDialog(app, event) {
  const variant = variantOf(event);
  const { stake } = event.offer;
  const half = Math.ceil(stake / 2);
  return openDialog((close, dialog) => {
    const yours = [die('you'), die('you')];
    const theirs = [die('house'), die('house')];
    const yourTotal = h('div.dice-total', {}, '?');
    const theirTotal = h('div.dice-total', {}, '?');
    const table = () =>
      h(
        'div.dice-table',
        {},
        // The house throws first, so it reads first, on the left.
        h('div.dice-side', {}, h('div.who', {}, 'House'), h('div.dice-pair', {}, theirs), theirTotal),
        h('div.versus', {}, 'VS'),
        h('div.dice-side', {}, h('div.who', {}, 'You'), h('div.dice-pair', {}, yours), yourTotal),
      );
    const tumble = async (dice) => {
      app.feedback('dice');
      dice.forEach((d) => d.classList.add('rolling'));
      const spins = prefersReducedMotion() ? 1 : 12;
      for (let i = 0; i < spins; i++) {
        dice.forEach((d) => setFace(d, 1 + Math.floor(Math.random() * 6)));
        await wait(85);
      }
      dice.forEach((d) => d.classList.remove('rolling'));
    };
    // Once the house has thrown there is no walking away: fold or play.
    const lock = () => {
      dialog.dataset.locked = '1';
      dialog.querySelector('.dialog-close')?.remove();
    };

    const offer = () => {
      dialog.append(
        encounter(variant),
        h('div.offer', {}, offerLine('Stake', `${formatCredits(stake)} cr`), offerLine('Rules', 'House throws first · fold for half')),
        h(
          'div.button-row',
          {},
          h('button.button', { type: 'button', onclick: () => { app.declineEvent(); close(); } }, 'Walk away'),
          h('button.button.primary', { type: 'button', onclick: () => houseThrows(true) }, 'Let them throw'),
        ),
      );
    };

    const houseThrows = async (animate) => {
      lock();
      const house = app.houseRoll();
      clearDialog(dialog);
      dialog.append(h('h2', {}, `Dice with ${variant.name}`), table());
      if (animate) await tumble(theirs);
      setFace(theirs[0], house[0]);
      setFace(theirs[1], house[1]);
      const total = house[0] + house[1];
      theirTotal.textContent = total;
      const chance = app.diceWinChance(total);
      const need = total + 1;
      dialog.append(
        h(
          'p.dice-odds',
          { style: { textAlign: 'center' } },
          need > 12 ? 'Nothing beats a 12. Fold, or pray.' : `You need ${need}${need < 12 ? '+' : ''} to win · ${Math.round(chance * 100)}% chance`,
        ),
        h(
          'div.button-row',
          {},
          h('button.button', { type: 'button', onclick: fold }, `Fold · −${formatCredits(half)}`),
          h('button.button.primary', { type: 'button', onclick: play }, `Throw · ${formatCredits(stake)}`),
        ),
      );
    };

    const finish = (won, text, line) => {
      app.feedback(won ? 'win' : 'lose');
      app.refresh();
      dialog.append(
        h(`div.result.${won ? 'win' : 'lose'}`, {}, text),
        h('p', { style: { textAlign: 'center' } }, line),
        h('button.button.wide', { type: 'button', onclick: () => close() }, 'Done'),
      );
      app.afterEvent();
    };

    const removeChoices = () => {
      dialog.querySelector('.dice-odds')?.remove();
      dialog.querySelector('.button-row')?.remove();
    };

    const fold = () => {
      const { loss } = app.foldDice();
      removeChoices();
      finish(false, `You fold · −${formatCredits(loss)} cr`, '“Wise. Or cowardly. The credits don’t care.”');
    };

    const play = async () => {
      const result = app.playDice();
      removeChoices();
      await tumble(yours);
      setFace(yours[0], result.player[0]);
      setFace(yours[1], result.player[1]);
      yourTotal.textContent = result.player[0] + result.player[1];
      await wait(300);
      finish(
        result.win,
        result.win ? `You win ${signed(stake)} cr` : `You lose ${formatCredits(stake)} cr`,
        result.win ? '“Beginner’s luck. Or is it?”' : '“The house thanks you for your generosity.”',
      );
    };

    // Reopened after the house already threw: straight to the choice.
    if (event.house) houseThrows(false);
    else offer();
  });
}

function die(side) {
  return h(`div.die${side === 'house' ? '.house' : ''}`, {}, Array.from({ length: 9 }, () => h('i')));
}

const PIPS = { 1: [4], 2: [0, 8], 3: [0, 4, 8], 4: [0, 2, 6, 8], 5: [0, 2, 4, 6, 8], 6: [0, 2, 3, 5, 6, 8] };

function setFace(die, value) {
  [...die.children].forEach((pip, i) => {
    pip.style.visibility = PIPS[value].includes(i) ? 'visible' : 'hidden';
  });
}

const CRATE_SVG = `
<svg class="crate" viewBox="0 0 220 160" aria-hidden="true">
  <defs>
    <radialGradient id="crate-light" cx="0.5" cy="1" r="0.8">
      <stop offset="0" stop-color="#ffd479" stop-opacity="0.9"/>
      <stop offset="1" stop-color="#ffd479" stop-opacity="0"/>
    </radialGradient>
  </defs>
  <g fill="none" stroke-linecap="round" stroke-linejoin="round">
    <path class="light" d="M40 64 L0 0 L220 0 L180 64 Z" fill="url(#crate-light)" stroke="none"/>
    <rect x="30" y="64" width="160" height="84" rx="6" fill="#0a101b" stroke="#e9f2ff" stroke-width="3"/>
    <path d="M70 64v84M110 64v84M150 64v84" stroke="#9fb1c8" stroke-width="1.5" opacity="0.6"/>
    <path d="M30 128h160" stroke="#5fe6ff" stroke-width="2" opacity="0.6"/>
    <g class="lid">
      <rect x="24" y="44" width="172" height="22" rx="5" fill="#101a2b" stroke="#e9f2ff" stroke-width="3"/>
      <path d="M40 55h140" stroke="#5fe6ff" stroke-width="2" opacity="0.7"/>
    </g>
    <g class="seal">
      <rect x="96" y="80" width="28" height="24" rx="4" fill="#2a0b14" stroke="#ff5d7d" stroke-width="2.5"/>
      <path d="M102 92h16" stroke="#ff5d7d" stroke-width="2"/>
    </g>
  </g>
</svg>`;

function containerDialog(app, event) {
  const variant = variantOf(event);
  const { price, units: [min, max] } = event.offer;
  return openDialog((close, dialog) => {
    const room = freeHold(app.state);
    dialog.append(
      encounter(variant),
      h('div.offer', {}, offerLine('Price', `${formatCredits(price)} cr`), offerLine('Inside', `${min}–${max} units of something`)),
      room < max
        ? h('div.notice', {}, icon('warning'), h('span', {}, room > 0 ? `Only ${room} free slots in your hold. Whatever doesn't fit goes overboard.` : 'Your hold is full. Any goods inside would go overboard.'))
        : null,
      h(
        'div.button-row',
        {},
        h('button.button', { type: 'button', onclick: () => { app.declineEvent(); close(); } }, 'No thanks'),
        h('button.button.primary', { type: 'button', disabled: app.state.credits < price, onclick: open }, `Buy · ${formatCredits(price)}`),
      ),
    );

    async function open() {
      const result = app.openContainer();
      clearDialog(dialog);
      const holder = h('div', { html: CRATE_SVG });
      const crate = holder.firstElementChild;
      dialog.append(h('h2', {}, 'Breaking the seal…'), holder);
      app.feedback('container');
      crate.classList.add('shaking');
      await wait(prefersReducedMotion() ? 0 : 650);
      crate.classList.add('broken');
      await wait(250);
      crate.classList.add('open');
      await wait(prefersReducedMotion() ? 0 : 700);
      dialog.querySelector('h2').textContent = result.junk ? 'Scrap.' : 'The crate is yours';
      if (result.junk) {
        dialog.append(h('div.loot', {}, h('span.good-icon', { style: { '--good': '#61748d' } }, icon('junk')), h('div', {}, h('div.amount', {}, 'Junk'), h('div.muted', {}, 'Rusted fittings and packing foam. It happens.'))));
      } else {
        const good = goodById[result.good];
        const lost = result.units - result.kept;
        dialog.append(
          h(
            'div.loot',
            {},
            h('span.good-icon', { style: { '--good': good.color } }, icon(good.id)),
            h('div', {}, h('div.amount', {}, `${result.units} × ${good.name}`), h('div.muted', {}, lost > 0 ? `${lost} went overboard: no room in the hold.` : `Worth about ${formatCredits(result.units * good.base * 0.8)} cr anywhere.`)),
          ),
        );
      }
      app.refresh();
      if (result.artifact) {
        app.feedback('news');
        dialog.append(
          h('p', { style: { textAlign: 'center', color: 'var(--gold)' } }, 'Under the false bottom, something hums.'),
          h('button.button.gold.wide', { type: 'button', onclick: () => { close(); app.revealArtifact(result.artifact.id); } }, 'Look closer'),
        );
      } else {
        dialog.append(h('button.button.wide', { type: 'button', onclick: () => close() }, 'Done'));
      }
      app.afterEvent();
    }
  });
}

function missionDialog(app, event) {
  const variant = variantOf(event);
  const { to, units, options } = event.offer;
  const target = systemById(app.state, to);
  const from = systemById(app.state, event.systemId);
  return openDialog((close, dialog) => {
    const room = freeHold(app.state);
    const full = app.state.missions.length >= 3;
    const meters = from && target ? Math.hypot(target.x - from.x, target.y - from.y) : 0;
    dialog.append(
      encounter(variant),
      h(
        'div.offer',
        {},
        offerLine('Cargo', `${units} crates`),
        offerLine('Deliver to', `${target?.name ?? '?'} · ${formatDistance(meters)}`),
        options[0].until ? offerLine('Weekend job', 'due Sunday 20:00') : null,
      ),
      room < units ? h('div.notice', {}, icon('warning'), h('span', {}, `You need ${units} free slots in the hold. Sell something first, then come back to this.`)) : null,
      full ? h('div.notice', {}, icon('warning'), h('span', {}, 'You already run three deliveries. Finish one first.')) : null,
      h(
        'div.deadline-options',
        {},
        options.map((option, index) =>
          h(
            'button.deadline-option',
            {
              type: 'button',
              disabled: room < units || full,
              onclick: () => {
                if (app.acceptMission(index)) close();
              },
            },
            h('span', {}, option.until ? 'By Sunday 20:00' : `Within ${option.hours} h`),
            h('span.reward', {}, `+${formatCredits(option.reward)} cr`),
          ),
        ),
      ),
      h('button.button.wide', { type: 'button', onclick: () => { app.declineEvent(); close(); } }, 'Decline'),
    );
  });
}

// ---------------------------------------------------------------- discovery

const NAME_SUGGESTIONS = ['Home', 'Work', 'Park', 'Café', 'Shop', 'Gym', 'Station', 'Parents', 'Lake', 'Bench'];

// Resolves to { name, mainPlanet } or null.
export function openDiscoverDialog(app, check, options) {
  const sector = SECTORS[options.sector];
  const best = options.planets.reduce((top, planet) => (planet.score > top.score ? planet : top), options.planets[0]);
  let selected = best.index;
  const taken = new Set(app.state.systems.map((system) => system.name.toLowerCase()));
  const suggestions = NAME_SUGGESTIONS.filter((name) => !taken.has(name.toLowerCase()));
  return openDialog((close, dialog) => {
    const input = h('input.text-field', {
      type: 'text',
      maxlength: '24',
      placeholder: 'Name this place',
      value: app.state.systems.length === 0 ? 'Home' : '',
      autocomplete: 'off',
      spellcheck: false,
    });
    const confirm = h('button.button.primary.wide', { type: 'button' }, check.price ? `Chart system · ${formatCredits(check.price)} cr` : 'Chart system · free');
    const update = () => {
      confirm.disabled = !input.value.trim();
    };
    input.addEventListener('input', update);
    const cards = options.planets.map((planet) => {
      const economy = economyById[planet.economy];
      const card = h(
        `button.planet-option${planet.index === selected ? '.selected' : ''}`,
        {
          type: 'button',
          onclick: () => {
            selected = planet.index;
            cards.forEach((c, i) => c.classList.toggle('selected', i === selected));
          },
        },
        h('img', { src: `img/planets/${kebab(planet.economy)}.svg`, alt: '' }),
        h(
          'div',
          {},
          h('div.pname', {}, planet.name, planet === best && options.planets.length > 1 && best.score > 0 ? h('span.best', {}, 'BEST') : null),
          h('div', { style: { fontSize: '13px' } }, `${economy.name} · sells ${goodById[economy.produces].name}`),
          h('div.pdetail', {}, planet.partners.length ? `Trades well with ${planet.partners.join(' and ')}` : app.state.systems.length ? 'No good partners nearby yet' : economy.blurb),
        ),
      );
      return card;
    });
    confirm.addEventListener('click', () => close({ name: input.value.trim().slice(0, 24), mainPlanet: selected }));
    dialog.append(
      h('div.eyebrow', {}, `${check.nearby + 1}/${AREA_MAX_SYSTEMS} systems in this area`),
      h('h2', {}, 'Chart a new system'),
      h('div', { style: { display: 'flex', gap: '8px', flexWrap: 'wrap' } }, h('span.chip', { style: { color: sector.color } }, sector.name), h('span.chip.plain', { style: { color: 'var(--ink-2)' } }, `${options.planets.length} planet${options.planets.length > 1 ? 's' : ''}`)),
      h('p', {}, options.planets.length > 1 ? 'Pick the main planet: its market becomes the system’s market.' : 'One planet, one market.'),
      h('div.planet-options', {}, cards),
      input,
      suggestions.length ? h('div.suggestions', {}, suggestions.slice(0, 6).map((name) => h('button', { type: 'button', onclick: () => { input.value = name; update(); } }, name))) : null,
      confirm,
    );
    update();
  });
}

// ---------------------------------------------------------------- the big moments

export function revealArtifact(app, id) {
  const artifact = artifactById[id];
  const civ = civById[artifact.civ];
  const entry = app.state.artifacts.find((a) => a.id === id);
  app.feedback('artifact');
  return openOverlay((close, overlay) => {
    overlay.className = 'reveal';
    overlay.style.setProperty('--civ', civ.color);
    const particles = h('div.particles');
    if (!prefersReducedMotion()) {
      for (let i = 0; i < 40; i++) {
        const angle = Math.random() * Math.PI * 2;
        const reach = 120 + Math.random() * 260;
        particles.append(h('i', { style: { '--dx': `${Math.cos(angle) * reach}px`, '--dy': `${Math.sin(angle) * reach}px`, animationDelay: `${0.4 + Math.random() * 0.8}s` } }));
      }
    }
    overlay.append(
      h('div.rays'),
      particles,
      h(
        'div.reveal-inner',
        {},
        h('div.kicker', {}, 'Relic recovered'),
        h('div.medallion', { style: { '--civ': civ.color } }, h('img', { src: `img/artifacts/${id}.svg`, alt: '' })),
        h('h2', {}, artifact.name),
        h('div.civ-line', {}, h('img', { src: `img/civs/${civ.id}.svg`, alt: '' }), `${civ.name} · ${civ.motif}`),
        h('p', {}, artifact.text),
        h('div.meta', {}, `Found at ${entry?.systemName ?? 'an unknown system'} · ${app.state.artifacts.length} of ${ARTIFACTS.length} in your Codex`),
        h('button.button.gold', { type: 'button', onclick: () => close() }, 'Add to Codex'),
      ),
    );
  });
}

export function showNewShip(app, index) {
  const ship = SHIPS[index];
  app.feedback('ship');
  return openDialog((close, dialog) => {
    dialog.append(
      h(
        'div.ceremony',
        {},
        h('img.ship-art', { src: `img/ships/${ship.id}.svg`, alt: '' }),
        h('div.kicker', { style: { color: 'var(--cyan)' } }, `New ship · ${ship.maker}`),
        h('h2', {}, ship.name),
        h('p', {}, ship.tagline),
        shipTraits(ship),
      ),
      h('button.button.primary.wide', { type: 'button', onclick: () => close() }, 'Take the helm'),
    );
  });
}

// Ossumar's terms, before a loan is taken.
export function confirmLoan(app, offer) {
  const ship = SHIPS[offer.ship];
  return openDialog((close, dialog) => {
    dialog.append(
      h(
        'div.encounter',
        { style: { '--accent': '#ffd479' } },
        h('div.portrait', {}, h('img', { src: `img/characters/${BANK.art}.svg`, alt: '' })),
        h('div.role', {}, BANK.title),
        h('div.who', {}, BANK.banker),
        h('p.line', {}, `“${BANK.line}”`),
      ),
      h(
        'div.offer',
        {},
        offerLine('You get', `${formatCredits(offer.amount)} cr`),
        offerLine('Enough for', `a ${ship.name}`),
        offerLine('You owe', `${formatCredits(offer.owed)} cr`),
        offerLine('Paid back', 'half of every profit'),
      ),
      h('p.muted', { style: { fontSize: '13px', textAlign: 'center' } }, `No interest and no deadline: the debt never grows. ${debtWalkingText(offer.owed)}.`),
      h('div.button-row', {}, h('button.button', { type: 'button', onclick: () => close(false) }, 'No, thanks'), h('button.button.gold', { type: 'button', onclick: () => close(true) }, `Borrow ${formatCredits(offer.amount)}`)),
    );
  });
}

export async function confirmShip(app, index) {
  const ship = SHIPS[index];
  const current = SHIPS[app.state.ship];
  const cost = ship.price - Math.round(current.price * 0.5);
  return confirmDialog({
    title: `Buy the ${ship.name}?`,
    text: `${formatCredits(ship.price)} cr, minus ${formatCredits(Math.round(current.price * 0.5))} for your ${current.name}: ${formatCredits(cost)} cr (${walkingText(cost)}). Hold ${current.hold} → ${ship.hold}, ${systemsLabel(current)} → ${systemsLabel(ship).toLowerCase()}, jobs to ${ship.missionKm} km. Your cargo moves over.`,
    confirm: `Buy · ${formatCredits(cost)}`,
  });
}

// ---------------------------------------------------------------- cards

export function openArtifactCard(app, id) {
  const artifact = artifactById[id];
  const civ = civById[artifact.civ];
  const entry = app.state.artifacts.find((a) => a.id === id);
  return openDialog((close, dialog) => {
    dialog.style.setProperty('--civ', civ.color);
    dialog.append(
      h(
        'div.ceremony',
        {},
        h(`div.medallion${entry ? '' : '.locked'}`, { style: { '--civ': civ.color, width: 'min(60vw, 230px)' } }, h('img', { src: `img/artifacts/${id}.svg`, alt: '' })),
        h('div.kicker', { style: { color: civ.color } }, `${civ.name} · ${civ.motif}`),
        h('h2', {}, entry ? artifact.name : 'Unknown relic'),
        h('p', {}, entry ? artifact.text : 'Not found yet. Sealed containers sometimes hide relics, and the further you walk between your systems, the stronger their signal.'),
        entry ? h('p.muted', { style: { fontSize: '12px' } }, `Found ${formatDate(entry.foundAt)} at ${entry.systemName}`) : null,
        h('p.muted', { style: { fontSize: '12px' } }, civ.blurb),
      ),
    );
  });
}

export function openSystemCard(app, system) {
  const { state } = app;
  const day = galacticDay(app.now());
  const economy = economyById[system.economy];
  const sector = SECTORS[system.sector];
  const product = goodById[economy.produces];
  const news = newsItem(state, system.id, day);
  const wanted = GOODS.filter((good) => ['D', 'E'].includes(economy.relations[good.id]));
  const d = app.player ? Math.hypot(system.x - app.player.x, system.y - app.player.y) : null;
  return openDialog((close, dialog) => {
    dialog.append(
      h('div.eyebrow', {}, d === null ? sector.name : `${sector.name} · ${formatDistance(d)} ${direction(app.player, system).word}`),
      h('h2', {}, system.name),
      h(
        'div.system-hero',
        { style: { '--sector': sector.color, gridTemplateColumns: '84px minmax(0,1fr)' } },
        h('img.planet-art', { src: `img/planets/${kebab(system.economy)}.svg`, alt: '', style: { width: '84px', height: '84px' } }),
        h('div', {}, h('b', {}, economy.name), h('div.muted', { style: { fontSize: '13px' } }, economy.blurb), h('div.planets-line', {}, system.planets.map((p) => p.name).join(' · '))),
      ),
      h(
        'div.offer',
        {},
        offerLine('Sells', `${product.name} · ${buyPrice(system)} cr`),
        ...wanted.map((good) => offerLine(economy.relations[good.id] === 'E' ? 'Exotic' : 'Wants', `${good.name} · ${sellTiers(state, system, good.id, day).find((t) => t.kind !== 'news').price} cr`)),
        news && news.left > 0 ? offerLine('Shortage', `${goodById[news.good].name} · ${goodById[news.good].base * 2} cr`) : null,
      ),
      h(
        'div.button-row',
        {},
        h('button.button', { type: 'button', onclick: () => { close(); app.renameSystem(system); } }, icon('edit'), 'Rename'),
        h('button.button.danger', { type: 'button', onclick: () => { close(); app.deleteSystem(system); } }, icon('trash'), 'Delete'),
      ),
    );
  });
}

export function openRenameDialog(system) {
  return openDialog((close, dialog) => {
    const input = h('input.text-field', { type: 'text', maxlength: '24', value: system.name, autocomplete: 'off', spellcheck: false });
    dialog.append(
      h('h2', {}, 'Rename system'),
      input,
      h('button.button.primary.wide', { type: 'button', onclick: () => close(input.value.trim().slice(0, 24) || null) }, 'Save'),
    );
    setTimeout(() => input.focus(), 300);
  });
}

export function confirmDelete(system) {
  return confirmDialog({
    title: `Delete ${system.name}?`,
    text: 'The system disappears for good, and the credits you paid for it are not returned. Deliveries to or from it are lost. It frees a place in this area.',
    confirm: 'Delete',
    danger: true,
  });
}

// ---------------------------------------------------------------- menu and guide

export function openMenu(app) {
  return openDialog((close, dialog) => {
    const toggle = (label, iconName, target) => {
      const knob = h(`span.switch${target.enabled ? '.on' : ''}`);
      return h(
        'button.menu-item',
        {
          type: 'button',
          onclick: () => {
            target.setEnabled(!target.enabled);
            knob.classList.toggle('on', target.enabled);
          },
        },
        icon(iconName),
        h('span.grow', {}, label),
        knob,
      );
    };
    const item = (label, iconName, onclick, detail) => h('button.menu-item', { type: 'button', onclick }, icon(iconName), h('span.grow', {}, label, detail ? h('div.muted', { style: { fontSize: '12px' } }, detail) : null), icon('chevron'));
    const file = h('input', { type: 'file', accept: '.json,application/json', hidden: true });
    file.addEventListener('change', async () => {
      const text = await file.files[0]?.text();
      if (text) {
        close();
        app.importSave(text);
      }
    });
    dialog.append(
      h('h2', {}, 'Ship’s computer'),
      h(
        'div.menu-list',
        {},
        item('How to play', 'info', () => { close(); openGuide(); }),
        toggle('Sound', 'sound', app.sound),
        app.canVibrate ? toggle('Vibration', 'vibration', app.haptics) : null,
        app.debugPanel ? toggle('Debug panel', 'signal', app.debugPanel) : null,
        item('Export save', 'export', () => app.exportSave(), 'A file with your whole galaxy'),
        item('Import save', 'import', () => file.click()),
        item('New game', 'warning', async () => {
          close();
          app.newGame();
        }, `World ID ${app.state.world.id}`),
      ),
      file,
      h('p.muted', { style: { fontSize: '12px', textAlign: 'center' } }, `Xenowalk · ${app.version}`),
    );
  });
}

export function openGuide() {
  const step = (iconName, title, text) => h('div.guide-step', {}, icon(iconName), h('div', {}, h('b', {}, title), h('span', {}, text)));
  return openDialog((close, dialog) => {
    dialog.append(
      h('h2', {}, 'How to play'),
      h(
        'div.guide',
        {},
        step('discover', 'Chart your places', `Tap Discover System where you stand: home, a park bench, your café. Systems sit at least ${MIN_SPACING} m apart, up to ${AREA_MAX_SYSTEMS} within 2 km. The first two are free.`),
        step('cargo', 'Walk and trade', 'Each system sells what it makes (3 a day) and pays well for what it lacks (3 a day). Buy cheap, carry, sell dear. Markets restock at 04:00, and stock waits two days. A kilometer walked earns about 70 credits, roughly the calories you burn.'),
        step('news', 'Read the news', 'Every day one system in each area runs short of something and pays double for it.'),
        step('event', 'Meet people', 'Each system has one encounter a day: dice with strangers, sealed containers, delivery jobs.'),
        step('artifact', 'Find relics', 'Containers may hide relics of six dead civilizations. Every kilometer between your systems strengthens the signal: 3 km a day count, 15 on Saturdays and Sundays.'),
        step('ship', 'Grow', 'Your ship says who you are. Each bigger one carries more, lets you chart more systems and takes delivery jobs further, from the Mote to the legendary Discovery.'),
        step('mission', 'Go far at weekends', 'On Fridays and Saturdays, jobs beyond 3 km turn up, due Sunday 20:00. A long walk, a big reward.'),
        step('warning', 'Stay safe', 'Nothing happens between systems. Keep the phone in your pocket and your eyes on the street.'),
      ),
      h('button.button.primary.wide', { type: 'button', onclick: () => close() }, 'Got it'),
    );
  });
}
