// Short vibrations for game events. The Vibration API works on Android;
// iPhone browsers don't support it, so there the setting is hidden.
// Names are shared with SOUNDS in sound.js.

import { isSettingOn, saveSetting } from './settings.js';

const SETTING_KEY = 'xenowalk.vibration';

// Vibration and pause lengths in ms.
const PATTERNS = {
  dock: [30, 60, 30],
  undock: [15],
  buy: [12],
  sell: [20, 40, 20],
  discover: [40, 60, 40, 60, 90],
  event: [25, 50, 25],
  dice: [10, 30, 10, 30, 10],
  win: [30, 50, 60],
  lose: [90],
  container: [20, 80, 20, 80, 50],
  mine: [15, 40, 30],
  artifact: [60, 80, 60, 80, 200],
  mission: [25],
  delivered: [30, 50, 30, 50, 60],
  ship: [100, 80, 160],
  expired: [80, 60, 40],
  error: [50],
  news: [20, 60, 20],
};

export const canVibrate = typeof navigator.vibrate === 'function';

export class Haptics {
  constructor() {
    this.enabled = isSettingOn(SETTING_KEY);
  }

  setEnabled(enabled) {
    this.enabled = enabled;
    saveSetting(SETTING_KEY, enabled);
  }

  play(name) {
    if (this.enabled && canVibrate && PATTERNS[name]) navigator.vibrate(PATTERNS[name]);
  }
}
