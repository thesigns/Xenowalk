// Headless run: node tools/sim/run.js ["Preset name"] [key=value ...]
// Prints the same numbers the page shows, for quick tuning from the terminal.

import { PRESETS, simulate, sweep, farmingCheck, SWEEP_MINUTES } from './engine.js';

const args = process.argv.slice(2);
const preset = args[0] && !args[0].includes('=') ? args.shift() : 'Proposal v0.2';
const overrides = Object.fromEntries(args.map((a) => a.split('=')).map(([k, v]) => [k, isNaN(Number(v)) ? v : Number(v)]));
const params = { ...PRESETS[preset], ...overrides };

const fmt = (x) => (Number.isFinite(x) ? Math.round(x).toLocaleString('en-US') : '-');
const started = Date.now();
const r = simulate(params);
console.log(`${preset} ${JSON.stringify(overrides)}: ${r.players} players, ${r.days} days, ${Date.now() - started} ms`);
console.log('\nMilestone        reached   p10   p50   p90 (day)');
for (const m of r.milestones) {
  console.log(`${m.label.padEnd(16)} ${(m.share * 100).toFixed(0).padStart(5)}%  ${m.days.map((d) => fmt(d).padStart(5)).join(' ')}`);
}
const w = r.perWalk;
console.log(`\nPer walk: ${w.minutes.toFixed(0)} min, ${w.km.toFixed(1)} km, ${w.stops.toFixed(1)} stops, ${w.events.toFixed(1)} events`);
const pp = r.perPlayer;
console.log(`Per player over ${r.days} days: trade ${fmt(pp.trade)}, missions ${fmt(pp.missions)} (${fmt(pp.missionsDone)} done, ${fmt(pp.missionsFailed)} failed), dice ${fmt(pp.dice)} in ${fmt(pp.diceGames)} games, containers ${fmt(pp.containers)} cost ${fmt(pp.containerSpend)} for goods worth ~${fmt(pp.containerValue)}, Substances mined ${fmt(pp.mined ?? 0)}`);
console.log(`Credits per km walked, by month: ${r.perKm.map((v) => fmt(v)).join(' / ')}`);
console.log(`Earned p50 at day 7/30/90/end: ${[6, 29, 89, r.days - 1].map((d) => fmt(r.earned[1][d])).join(' / ')}`);
console.log(`Start: identical markets ${(r.start.identical * 100).toFixed(0)}%, no trade profit in week 1 ${(r.start.deadWeek * 100).toFixed(0)}%`);

if (!process.env.NOSWEEP) {
  const s = sweep(params);
  console.log(`\nSweep: median earned after ${s.days} days (artifacts)`);
  console.log('per week  ' + SWEEP_MINUTES.map((m) => `${m} min`.padStart(14)).join(''));
  for (const perWeek of [7, 5, 3, 1]) {
    const row = s.cells.filter((c) => c.perWeek === perWeek);
    console.log(`${String(perWeek).padStart(8)}  ` + row.map((c) => `${fmt(c.earned)} (${c.artifacts})`.padStart(14)).join(''));
  }
  const f = farmingCheck(params);
  console.log(`\nFarming check, 60 min daily for ${f.days} days:`);
  for (const k of ['loop', 'pingpong']) console.log(`  ${k.padEnd(9)} ${f[k].eventsPerWalk.toFixed(1)} events/walk, ${f[k].artifacts.toFixed(1)} artifacts, earned ${fmt(f[k].earned)}`);
}
