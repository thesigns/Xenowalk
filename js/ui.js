// DOM helpers: building elements, icons, formatting, dialogs and toasts.

const SVG_NS = 'http://www.w3.org/2000/svg';
const TOAST_MS = 3400;

// h('div.card.framed', { onclick }, child, 'text', ...): a tiny element builder.
// Attributes starting with "on" become listeners; `style` may be an object;
// `dataset` sets data-* attributes; false, null and undefined children are skipped.
export function h(spec, attrs = {}, ...children) {
  const [tag, ...classes] = spec.split('.');
  const element = document.createElement(tag || 'div');
  if (classes.length) element.className = classes.join(' ');
  if (attrs === null || typeof attrs !== 'object' || attrs instanceof Node || Array.isArray(attrs)) {
    children.unshift(attrs);
    attrs = {};
  }
  for (const [key, value] of Object.entries(attrs)) {
    if (value === undefined || value === null || value === false) continue;
    if (key.startsWith('on')) element.addEventListener(key.slice(2), value);
    else if (key === 'style' && typeof value === 'object') setStyle(element, value);
    else if (key === 'dataset') Object.assign(element.dataset, value);
    else if (key === 'class') element.className += ` ${value}`;
    else if (key === 'html') element.innerHTML = value;
    else if (key in element && typeof value !== 'string') element[key] = value;
    else element.setAttribute(key, value === true ? '' : value);
  }
  append(element, children);
  return element;
}

// Custom properties (--civ) need setProperty; plain assignment ignores them.
function setStyle(element, styles) {
  for (const [name, value] of Object.entries(styles)) {
    if (name.startsWith('--')) element.style.setProperty(name, value);
    else element.style[name] = value;
  }
}

function append(element, children) {
  for (const child of children.flat(Infinity)) {
    if (child === null || child === undefined || child === false) continue;
    element.append(child instanceof Node ? child : String(child));
  }
}

// Replaces an element's content with nodes, flattening arrays and skipping
// null, undefined and false, as h() does.
export function fill(root, ...nodes) {
  root.replaceChildren(...nodes.flat(Infinity).filter((node) => node !== null && node !== undefined && node !== false));
}

// An icon from img/icons.svg, e.g. icon('cargo').
export function icon(name, className = '') {
  const svg = document.createElementNS(SVG_NS, 'svg');
  svg.setAttribute('class', `icon ${className}`.trim());
  svg.setAttribute('aria-hidden', 'true');
  const use = document.createElementNS(SVG_NS, 'use');
  use.setAttribute('href', `img/icons.svg#i-${name}`);
  svg.append(use);
  return svg;
}

export function rankInsignia(index, className = 'insignia') {
  const svg = document.createElementNS(SVG_NS, 'svg');
  svg.setAttribute('class', className);
  svg.setAttribute('aria-hidden', 'true');
  const use = document.createElementNS(SVG_NS, 'use');
  use.setAttribute('href', `img/ranks.svg#rank-${index}`);
  svg.append(use);
  return svg;
}

export function formatCredits(value) {
  return Math.round(value).toLocaleString('en-US');
}

export function signed(value) {
  const rounded = Math.round(value);
  return `${rounded > 0 ? '+' : rounded < 0 ? '−' : '±'}${Math.abs(rounded).toLocaleString('en-US')}`;
}

export function formatDistance(meters) {
  if (meters < 1000) return `${Math.round(meters / 10) * 10} m`;
  return `${(meters / 1000).toFixed(meters < 10000 ? 1 : 0)} km`;
}

export function formatDuration(ms) {
  const minutes = Math.max(0, Math.ceil(ms / 60_000));
  const hours = Math.floor(minutes / 60);
  if (hours >= 24) return `${Math.floor(hours / 24)} d ${hours % 24} h`;
  if (hours > 0) return `${hours} h ${String(minutes % 60).padStart(2, '0')} min`;
  return `${minutes} min`;
}

export function formatDate(ms) {
  return new Date(ms).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}

const COMPASS = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];

// Direction from a to b (world points) as a compass word and degrees.
export function direction(a, b) {
  const degrees = ((Math.atan2(b.x - a.x, b.y - a.y) * 180) / Math.PI + 360) % 360;
  return { degrees, word: COMPASS[Math.round(degrees / 45) % 8] };
}

// ---------------------------------------------------------------- dialogs

const layer = () => document.getElementById('dialogs');
let queue = Promise.resolve();
let openCount = 0;

export function isDialogOpen() {
  return openCount > 0;
}

// Opens a bottom-sheet dialog. build(close, dialog) fills it and returns
// nothing; close(value) closes it and resolves the returned promise with value.
// Dialogs queue, so one waits for the one before it.
export function openDialog(build, { dismissible = true, className = '' } = {}) {
  const run = () =>
    new Promise((resolve) => {
      openCount++;
      const dialog = h(`div.dialog${className ? `.${className}` : ''}`, { role: 'dialog', 'aria-modal': 'true' });
      // Builders pass `cond ? node : null`; the DOM would print "null".
      const nativeAppend = dialog.append.bind(dialog);
      dialog.append = (...nodes) => nativeAppend(...nodes.flat().filter((node) => node !== null && node !== undefined && node !== false));
      const backdrop = h('div.dialog-backdrop', {}, dialog);
      let closed = false;
      const close = (value) => {
        if (closed) return;
        closed = true;
        backdrop.classList.add('leaving');
        setTimeout(() => {
          backdrop.remove();
          openCount--;
          resolve(value);
        }, 220);
      };
      if (dismissible) {
        dialog.append(h('button.dialog-close', { type: 'button', 'aria-label': 'Close', onclick: () => close(null) }, icon('close')));
        backdrop.addEventListener('click', (event) => {
          if (event.target === backdrop) close(null);
        });
      }
      build(close, dialog);
      layer().append(backdrop);
    });
  const result = queue.then(run);
  queue = result.catch(() => {});
  return result;
}

// A full-screen moment outside the dialog queue's sheet style, still queued.
export function openOverlay(build) {
  const run = () =>
    new Promise((resolve) => {
      openCount++;
      const overlay = h('div');
      const close = (value) => {
        overlay.classList.add('leaving');
        setTimeout(() => {
          overlay.remove();
          openCount--;
          resolve(value);
        }, 400);
      };
      build(close, overlay);
      layer().append(overlay);
    });
  const result = queue.then(run);
  queue = result.catch(() => {});
  return result;
}

export function confirmDialog({ title, text, confirm = 'Confirm', danger = false }) {
  return openDialog((close, dialog) => {
    dialog.append(
      h('h2', {}, title),
      text && h('p', {}, text),
      h('div.button-row', {}, h('button.button', { type: 'button', onclick: () => close(false) }, 'Cancel'), h(`button.button.${danger ? 'danger' : 'primary'}`, { type: 'button', onclick: () => close(true) }, confirm)),
    );
  });
}

// ---------------------------------------------------------------- toasts

export function toast(text, { icon: iconName = 'info', kind = '' } = {}) {
  const box = document.getElementById('toasts');
  const element = h(`div.toast${kind ? `.${kind}` : ''}`, {}, icon(iconName), h('span', { html: text }));
  box.append(element);
  while (box.children.length > 3) box.firstElementChild.remove();
  setTimeout(() => {
    element.classList.add('leaving');
    setTimeout(() => element.remove(), 350);
  }, TOAST_MS);
}

export function escapeHtml(text) {
  return String(text).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
}

// Repeats an action while a button is held, faster the longer it's held.
// Only one button repeats at a time.
let stopRepeating = null;

// The release is watched on the window, not the button: a touch that ends on
// another element (or on a button that was re-rendered meanwhile) must still
// stop it. A button that left the page or got disabled stops too, as a
// disabled button receives no pointer events at all.
export function holdRepeat(button, action) {
  button.addEventListener('pointerdown', (event) => {
    if (event.pointerType === 'mouse' && event.button !== 0) return;
    event.preventDefault();
    stopRepeating?.();
    let delay = 380;
    let timer = null;
    const stop = () => {
      clearTimeout(timer);
      window.removeEventListener('pointerup', stop, true);
      window.removeEventListener('pointercancel', stop, true);
      window.removeEventListener('blur', stop);
      button.removeEventListener('pointerleave', stop);
      if (stopRepeating === stop) stopRepeating = null;
    };
    const tick = () => {
      if (!button.isConnected || button.disabled) {
        stop();
        return;
      }
      action();
      delay = Math.max(45, delay * 0.8);
      timer = setTimeout(tick, delay);
    };
    stopRepeating = stop;
    window.addEventListener('pointerup', stop, true);
    window.addEventListener('pointercancel', stop, true);
    window.addEventListener('blur', stop);
    button.addEventListener('pointerleave', stop);
    action();
    timer = setTimeout(tick, delay);
  });
  // A long press would open the phone's context menu.
  button.addEventListener('contextmenu', (event) => event.preventDefault());
  // Keyboard users get one step per press.
  button.addEventListener('keydown', (event) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      action();
    }
  });
}

export function prefersReducedMotion() {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

export function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
