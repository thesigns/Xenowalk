// Runs the simulator off the page's thread and reports progress.

import { simulate, sweep, farmingCheck } from './engine.js';

self.onmessage = ({ data: { id, params } }) => {
  // The three parts take roughly 40%, 50% and 10% of the time.
  const progress = (base, span) => (f) => self.postMessage({ id, progress: base + f * span });
  const main = simulate(params, progress(0, 0.4));
  const grid = sweep(params, {}, progress(0.4, 0.5));
  const farming = farmingCheck(params);
  self.postMessage({ id, result: { params, main, grid, farming } });
};
