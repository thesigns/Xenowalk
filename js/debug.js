// Developer mode (?debug): GPS diagnostics, moving by tapping the map, and a
// faster game clock to test galactic days and delivery deadlines.

import { advanceTime, enableDebugClock, resetTime, setTimeSpeed, timeOffset, timeSpeed } from './clock.js';
import { isSettingOn, saveSetting } from './settings.js';

export const isDebug = new URLSearchParams(location.search).has('debug');

if (isDebug) enableDebugClock();

// Where the debug player starts before any position is known (Warsaw).
export const DEBUG_START = { lat: 52.2297, lon: 21.0122 };

const PANEL_SETTING = 'xenowalk.debugPanel';
const DAY_MS = 86_400_000;

export class DebugPanel {
  // describeGame() returns a line about the game; onTimeChange() runs after
  // the clock changed; addCredits() is a cheat for testing purchases.
  constructor(root, tracker, { describeGame, onTimeChange, addCredits }) {
    this.root = root;
    this.tracker = tracker;
    this.describeGame = describeGame;
    this.fields = Object.fromEntries([...root.querySelectorAll('[data-field]')].map((el) => [el.dataset.field, el]));
    this.useGpsButton = root.querySelector('#use-gps');
    this.useGpsButton.addEventListener('click', () => tracker.useGps());
    this.speedButtons = [...root.querySelectorAll('[data-speed]')];
    for (const button of this.speedButtons) {
      button.addEventListener('click', () => {
        setTimeSpeed(Number(button.dataset.speed));
        onTimeChange();
      });
    }
    root.querySelector('#reset-time').addEventListener('click', () => {
      resetTime();
      onTimeChange();
    });
    root.querySelector('#next-day').addEventListener('click', () => {
      advanceTime(DAY_MS);
      onTimeChange();
    });
    root.querySelector('#add-credits').addEventListener('click', addCredits);
    this.enabled = isSettingOn(PANEL_SETTING);
    root.hidden = !this.enabled;
    setInterval(() => this.update(), 1000);
  }

  setEnabled(enabled) {
    this.enabled = enabled;
    saveSetting(PANEL_SETTING, enabled);
    this.root.hidden = !enabled;
  }

  update() {
    const { position, lastReading, stats, manual, signal } = this.tracker;
    this.fields.source.textContent = manual ? 'Manual' : 'GPS';
    this.fields.signal.textContent = signal;
    this.fields.position.textContent = position ? `${position.lat.toFixed(5)}, ${position.lon.toFixed(5)} (±${Math.round(position.accuracy)} m)` : '—';
    this.fields['last-reading'].textContent = lastReading ? `last ${Math.round((Date.now() - lastReading.timestamp) / 1000)} s ago, ±${Math.round(lastReading.accuracy)} m` : '—';
    this.fields.stats.textContent = `${stats.received} rx · ${stats.accepted} ok · ${stats.poor} poor · ${stats.stale} stale`;
    this.fields.game.textContent = this.describeGame();
    const minutes = Math.max(0, Math.round(timeOffset() / 60_000));
    this.fields.time.textContent = `${timeSpeed()}× · +${Math.floor(minutes / 60)} h ${minutes % 60} min`;
    this.useGpsButton.hidden = !manual;
    for (const button of this.speedButtons) button.classList.toggle('active', Number(button.dataset.speed) === timeSpeed());
  }
}
