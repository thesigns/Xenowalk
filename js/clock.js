// Game time. All game rules read the current time from here, so that the
// debug mode can speed time up in one place.

const OFFSET_KEY = 'xenowalk.debug.clockOffset';
const SAVE_INTERVAL_MS = 1000;

let speed = 1;
let anchorReal = Date.now();
let anchorGame = anchorReal;

export function now() {
  return anchorGame + (Date.now() - anchorReal) * speed;
}

export function timeSpeed() {
  return speed;
}

// How far game time is ahead of real time, in ms.
export function timeOffset() {
  return now() - Date.now();
}

export function setTimeSpeed(newSpeed) {
  anchorGame = now();
  anchorReal = Date.now();
  speed = newSpeed;
}

// Debug mode only: jumps game time ahead, e.g. to the next galactic day.
export function advanceTime(ms) {
  anchorGame += ms;
}

export function resetTime() {
  anchorReal = Date.now();
  anchorGame = anchorReal;
  speed = 1;
}

// Debug mode only: lets the clock run ahead, and keeps how far ahead it is across reloads,
// so mission deadlines and galactic days set in sped-up time don't jump back.
export function enableDebugClock() {
  try {
    const saved = Number(localStorage.getItem(OFFSET_KEY));
    if (Number.isFinite(saved)) anchorGame = anchorReal + saved;
  } catch (error) {
    console.warn('Could not load the debug clock', error);
  }
  setInterval(() => {
    try {
      localStorage.setItem(OFFSET_KEY, String(timeOffset()));
    } catch {
      // Not important enough to report every second.
    }
  }, SAVE_INTERVAL_MS);
}
