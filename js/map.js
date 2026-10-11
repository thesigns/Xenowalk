// MapView: the galaxy map on a canvas, in world meters (see galaxy.js).
// Sectors glow as nebulae, the sky has three layers of parallax stars, systems
// are small orreries, and the player's ship sits in the middle. It animates
// while visible (planets orbit, the news pulses) and handles panning and
// zooming (drag, pinch, mouse wheel) and taps on systems.

import { hasWorld, sectorField, starsInCell } from './galaxy.js';
import { createSimplex } from './noise.js';
import { MINE_INFLUENCE, SYSTEM_RADIUS, mineWeight } from './game.js';

const MIN_VIEW_METERS = 300;
const MAX_VIEW_METERS = 9000;
const DEFAULT_VIEW_METERS = 1500;
const TAP_TOLERANCE_PX = 10;
const SYSTEM_HIT_PX = 30;
const WHEEL_ZOOM_SPEED = 0.0015;
const FRAME_MS = 1000 / 30;
// The nebula is sampled every few pixels: coarser while the view moves.
const NEBULA_STEP_PX = 4;
const NEBULA_MOVING_STEP_PX = 9;
const SETTLE_MS = 160;
const EDGE_GLOW_PX = 11;
const FOLLOW_EASING = 0.18;
// Mined areas are outlined on a grid of 2 to 4 pixels' worth of meters (a
// power of two, so it changes only in steps), traced this far past the screen.
const OUTLINE_CELL_PX = 4;
const OUTLINE_PAD_PX = 120;
const SCANLINE_PX = 4;

// Mirrors the palette in css/style.css.
export const COLORS = {
  space: '#03050a',
  spaceCenter: '#0a1222',
  ink: '#e9f2ff',
  dim: '#61748d',
  cyan: '#5fe6ff',
  gold: '#ffd479',
  substances: '#ffc04d',
  sectors: ['#5b9dff', '#b77dff', '#ffb24d'],
  // The same as rgb triples, for the nebula's pixels.
  sectorRgb: [
    [91, 157, 255],
    [183, 125, 255],
    [255, 178, 77],
  ],
};

const GRID_STEPS = [100, 250, 500, 1000, 2000];
const SCALE_LENGTHS = [50, 100, 200, 250, 500, 1000, 2000, 5000];
const STAR_LAYERS = [
  { parallax: 0.08, cell: 120, alpha: 0.35, size: 0.9 },
  { parallax: 0.2, cell: 160, alpha: 0.55, size: 1.2 },
  { parallax: 0.42, cell: 220, alpha: 0.85, size: 1.6 },
];

const texture = createSimplex(7331);

export class MapView {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.scene = { player: null, systems: [], pointers: [], showArea: false, areaRadius: 2000 };
    this.center = null; // world point in the middle of the screen
    this.panned = false; // the user moved the map away from the player
    this.viewMeters = DEFAULT_VIEW_METERS;
    this.effects = [];
    this.running = false;
    this.lastFrame = 0;
    this.frame = null;
    this.nebula = document.createElement('canvas');
    // Android may drop a canvas's memory (low on memory, back from the
    // background) and give it back blank, with its transform reset; the
    // cached layers are then drawn again.
    const restored = () => {
      this.nebulaKey = '';
      if (!this.running) this.draw();
    };
    canvas.addEventListener('contextrestored', restored);
    this.nebula.addEventListener('contextrestored', restored);
    this.nebulaKey = '';
    this.onTap = null; // (worldPoint) => void
    this.onSystemTap = null; // (system) => void
    this.onScale = null; // (meters, pixels) => void
    this.onPan = null; // (panned) => void
    this.scale = null;
    this.resize();
    this.setUpGestures();
    window.addEventListener('resize', () => {
      this.resize();
      this.draw();
    });
  }

  resize() {
    const ratio = Math.min(window.devicePixelRatio || 1, 2.5);
    this.ratio = ratio;
    this.width = this.canvas.clientWidth || window.innerWidth;
    this.height = this.canvas.clientHeight || window.innerHeight;
    this.canvas.width = Math.round(this.width * ratio);
    this.canvas.height = Math.round(this.height * ratio);
    this.ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
    this.nebulaKey = '';
  }

  get metersPerPixel() {
    return this.viewMeters / Math.min(this.width, this.height);
  }

  setScene(scene) {
    this.scene = { ...this.scene, ...scene };
    if (!this.center && this.scene.player) this.center = { x: this.scene.player.x, y: this.scene.player.y };
    if (!this.running) this.draw();
  }

  // Goes back to following the player.
  recenter() {
    this.panned = false;
    this.onPan?.(false);
    if (!this.running) this.draw();
  }

  focus(point, viewMeters) {
    this.center = { x: point.x, y: point.y };
    if (viewMeters) this.viewMeters = clamp(viewMeters, MIN_VIEW_METERS, MAX_VIEW_METERS);
    this.panned = true;
    this.onPan?.(true);
    if (!this.running) this.draw();
  }

  zoomBy(factor) {
    this.viewMeters = clamp(this.viewMeters * factor, MIN_VIEW_METERS, MAX_VIEW_METERS);
    if (!this.running) this.draw();
  }

  // Animates while the map can be seen; a page over it pauses the animation.
  start() {
    if (this.running) return;
    this.running = true;
    const loop = (time) => {
      if (!this.running) return;
      this.frame = requestAnimationFrame(loop);
      if (time - this.lastFrame < FRAME_MS) return;
      this.lastFrame = time;
      this.draw(time);
    };
    this.frame = requestAnimationFrame(loop);
  }

  stop() {
    this.running = false;
    cancelAnimationFrame(this.frame);
    this.draw();
  }

  toScreen(point) {
    const mpp = this.metersPerPixel;
    return { x: this.width / 2 + (point.x - this.center.x) / mpp, y: this.height / 2 - (point.y - this.center.y) / mpp };
  }

  toWorld(sx, sy) {
    const mpp = this.metersPerPixel;
    return { x: this.center.x + (sx - this.width / 2) * mpp, y: this.center.y - (sy - this.height / 2) * mpp };
  }

  setUpGestures() {
    const { canvas } = this;
    const pointers = new Map();
    let pinch = null;
    let tap = null;
    let drag = null;
    const positionOf = (event) => {
      const rect = canvas.getBoundingClientRect();
      return { x: event.clientX - rect.left, y: event.clientY - rect.top };
    };
    const pinchDistance = () => {
      const [a, b] = pointers.values();
      return Math.hypot(a.x - b.x, a.y - b.y);
    };
    const panBy = (dx, dy) => {
      if (!this.center) return;
      const mpp = this.metersPerPixel;
      this.center = { x: this.center.x - dx * mpp, y: this.center.y + dy * mpp };
      if (!this.panned) {
        this.panned = true;
        this.onPan?.(true);
      }
      if (!this.running) this.draw();
    };

    canvas.addEventListener('pointerdown', (event) => {
      canvas.setPointerCapture(event.pointerId);
      pointers.set(event.pointerId, positionOf(event));
      tap = pointers.size === 1 ? positionOf(event) : null;
      drag = pointers.size === 1 ? positionOf(event) : null;
      if (pointers.size === 2) pinch = { distance: pinchDistance(), viewMeters: this.viewMeters };
    });
    canvas.addEventListener('pointermove', (event) => {
      if (!pointers.has(event.pointerId)) return;
      const point = positionOf(event);
      pointers.set(event.pointerId, point);
      if (tap && Math.hypot(point.x - tap.x, point.y - tap.y) > TAP_TOLERANCE_PX) tap = null;
      if (drag && !tap && pointers.size === 1) {
        panBy(point.x - drag.x, point.y - drag.y);
        drag = point;
      }
      const d = pointers.size === 2 ? pinchDistance() : 0;
      if (pinch && d > 0) {
        this.viewMeters = clamp((pinch.viewMeters * pinch.distance) / d, MIN_VIEW_METERS, MAX_VIEW_METERS);
        if (!this.running) this.draw();
      }
    });
    const release = (event) => {
      if (!pointers.delete(event.pointerId)) return;
      if (event.type === 'pointerup' && tap && pointers.size === 0 && this.center) {
        const system = this.systemAt(tap.x, tap.y);
        if (system) this.onSystemTap?.(system);
        else this.onTap?.(this.toWorld(tap.x, tap.y));
      }
      if (pointers.size < 2) pinch = null;
      if (pointers.size === 0) tap = null;
      drag = pointers.size === 1 ? [...pointers.values()][0] : null;
    };
    canvas.addEventListener('pointerup', release);
    canvas.addEventListener('pointercancel', release);
    canvas.addEventListener(
      'wheel',
      (event) => {
        event.preventDefault();
        this.zoomBy(Math.exp(event.deltaY * WHEEL_ZOOM_SPEED));
      },
      { passive: false },
    );
  }

  systemAt(sx, sy) {
    let best = null;
    for (const system of this.scene.systems) {
      const p = this.toScreen(system);
      const d = Math.hypot(p.x - sx, p.y - sy);
      const reach = Math.max(SYSTEM_HIT_PX, SYSTEM_RADIUS / this.metersPerPixel);
      if (d <= reach && (!best || d < best.d)) best = { system, d };
    }
    return best?.system ?? null;
  }

  // Plays a short animation over the map; draw(ctx, progress) gets 0..1.
  animate(duration, draw) {
    return new Promise((resolve) => {
      this.effects.push({ start: performance.now(), duration, draw, resolve });
      if (!this.running) {
        const step = () => {
          this.draw();
          if (this.effects.length) requestAnimationFrame(step);
        };
        requestAnimationFrame(step);
      }
    });
  }

  // Expanding rings, e.g. when docking or discovering.
  ripple(point, color = COLORS.cyan, rings = 3) {
    return this.animate(1400, (ctx, t) => {
      const p = this.toScreen(point);
      for (let i = 0; i < rings; i++) {
        const local = clamp(t * 1.4 - i * 0.18, 0, 1);
        if (local <= 0 || local >= 1) continue;
        ctx.beginPath();
        ctx.arc(p.x, p.y, 12 + local * 120, 0, Math.PI * 2);
        ctx.strokeStyle = color;
        ctx.globalAlpha = (1 - local) * 0.8;
        ctx.lineWidth = 2 * (1 - local) + 0.5;
        ctx.stroke();
      }
      ctx.globalAlpha = 1;
    });
  }

  draw(time = performance.now()) {
    const { ctx, width, height } = this;
    // Set every frame: a restored context comes back with an identity
    // transform, which drew the whole map small in the top left corner.
    ctx.setTransform(this.ratio, 0, 0, this.ratio, 0, 0);
    const { player } = this.scene;
    if (player && this.center && !this.panned) {
      // The camera eases after the player, so GPS steps glide.
      this.center = {
        x: this.center.x + (player.x - this.center.x) * (this.running ? FOLLOW_EASING : 1),
        y: this.center.y + (player.y - this.center.y) * (this.running ? FOLLOW_EASING : 1),
      };
    }
    const glow = ctx.createRadialGradient(width / 2, height * 0.45, 0, width / 2, height * 0.45, Math.max(width, height) * 0.75);
    glow.addColorStop(0, COLORS.spaceCenter);
    glow.addColorStop(1, COLORS.space);
    ctx.fillStyle = glow;
    ctx.fillRect(0, 0, width, height);
    if (!this.center) {
      this.drawStars(time, { x: 0, y: 0 });
      return;
    }
    this.drawStars(time, this.center);
    if (hasWorld()) this.drawNebula(time);
    this.drawGrid();
    if (this.scene.minedAreas?.length) this.drawMinedAreas(time);
    if (this.scene.showArea && player) this.drawArea(player, time);
    this.drawRoutes(time);
    for (const system of this.scene.systems) this.drawSystem(system, time);
    this.drawEffects();
    if (player) this.drawPlayer(player, time);
    this.drawPointers();
    this.updateScale();
  }

  drawStars(time, center) {
    const { ctx, width, height } = this;
    for (const [index, layer] of STAR_LAYERS.entries()) {
      const ox = (center.x / 2) * layer.parallax;
      const oy = (-center.y / 2) * layer.parallax;
      const x0 = Math.floor(ox / layer.cell);
      const y0 = Math.floor(oy / layer.cell);
      const x1 = Math.floor((ox + width) / layer.cell);
      const y1 = Math.floor((oy + height) / layer.cell);
      for (let cx = x0; cx <= x1; cx++) {
        for (let cy = y0; cy <= y1; cy++) {
          for (const star of starsInCell(cx, cy, index)) {
            const sx = (cx + star.x) * layer.cell - ox;
            const sy = (cy + star.y) * layer.cell - oy;
            const twinkle = 0.65 + 0.35 * Math.sin(time / 900 + star.phase);
            ctx.globalAlpha = layer.alpha * twinkle * (0.4 + star.size * 0.6);
            ctx.fillStyle = star.size > 0.93 ? COLORS.cyan : COLORS.ink;
            const r = layer.size * (0.4 + star.size * 0.6);
            ctx.fillRect(sx - r / 2, sy - r / 2, r, r);
          }
        }
      }
    }
    ctx.globalAlpha = 1;
  }

  // Sectors as soft nebulae with glowing borders, sampled on a coarse grid
  // and smoothed by scaling up. Redrawn only when the view changes.
  drawNebula(time) {
    const { width, height } = this;
    const mpp = this.metersPerPixel;
    const view = `${Math.round(this.center.x / mpp)},${Math.round(this.center.y / mpp)},${mpp.toFixed(4)},${width},${height}`;
    if (view !== this.nebulaView) {
      this.nebulaView = view;
      this.viewChangedAt = time;
    }
    const settled = !this.running || time - this.viewChangedAt > SETTLE_MS;
    const step = settled ? NEBULA_STEP_PX : NEBULA_MOVING_STEP_PX;
    const cols = Math.ceil(width / step) + 3;
    const rows = Math.ceil(height / step) + 3;
    const key = `${view},${step}`;
    if (key !== this.nebulaKey) {
      this.nebulaKey = key;
      this.nebula.width = cols;
      this.nebula.height = rows;
      const nctx = this.nebula.getContext('2d');
      const image = nctx.createImageData(cols, rows);
      // Zoomed out, borders crowd the screen, so they dim.
      const calm = Math.max(0.5, Math.min(1, 5 / mpp));
      const left = this.center.x - (width / 2) * mpp - step * mpp;
      const top = this.center.y + (height / 2) * mpp + step * mpp;
      for (let j = 0; j < rows; j++) {
        for (let i = 0; i < cols; i++) {
          const wx = left + i * step * mpp;
          const wy = top - j * step * mpp;
          const { sector, edge } = sectorField(wx, wy);
          const edgePx = edge / mpp;
          // A thin bright border, a wider soft rim inside it, and faint clouds.
          const line = Math.max(0, 1 - edgePx / EDGE_GLOW_PX) ** 2;
          const rim = Math.max(0, 1 - edgePx / (EDGE_GLOW_PX * 6));
          const cloud = 0.5 + 0.35 * texture(wx / 380, wy / 380) + 0.15 * texture(wx / 110, wy / 110);
          const [r, g, b] = COLORS.sectorRgb[sector];
          const o = (j * cols + i) * 4;
          image.data[o] = r;
          image.data[o + 1] = g;
          image.data[o + 2] = b;
          image.data[o + 3] = Math.min(255, (120 * line + 22 * rim) * calm + 16 * cloud);
        }
      }
      nctx.putImageData(image, 0, 0);
    }
    const { ctx } = this;
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(this.nebula, -step * 1.5, -step * 1.5, cols * step, rows * step);
  }

  // Small crosses on a round-numbered grid, a navigation display's scale.
  drawGrid() {
    const { ctx, width, height } = this;
    const mpp = this.metersPerPixel;
    const spacing = GRID_STEPS.find((s) => s / mpp >= 90) ?? GRID_STEPS[GRID_STEPS.length - 1];
    const tl = this.toWorld(0, 0);
    const br = this.toWorld(width, height);
    ctx.strokeStyle = COLORS.cyan;
    ctx.globalAlpha = 0.16;
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (let x = Math.floor(tl.x / spacing) * spacing; x <= br.x; x += spacing) {
      for (let y = Math.floor(br.y / spacing) * spacing; y <= tl.y; y += spacing) {
        const p = this.toScreen({ x, y });
        ctx.moveTo(p.x - 4, p.y);
        ctx.lineTo(p.x + 4, p.y);
        ctx.moveTo(p.x, p.y - 4);
        ctx.lineTo(p.x, p.y + 4);
      }
    }
    ctx.stroke();
    ctx.globalAlpha = 1;
  }

  // Mined areas are ringed in amber, merged just as the rule merges them, so
  // the line is exactly where Mine says "Mined out": a crisp line with a glow,
  // a spark running along it, scanlines inside. The outline is traced in world
  // meters on a grid pinned to the world, so it holds still while the map
  // pans, and is traced again only when the zoom steps, the view moves past
  // the margin, or the areas change.
  drawMinedAreas(time) {
    const { ctx, width, height } = this;
    const { minedAreas } = this.scene;
    const mpp = this.metersPerPixel;
    const cell = 2 ** Math.floor(Math.log2(OUTLINE_CELL_PX * mpp));
    const block = cell * 32;
    const tl = this.toWorld(-OUTLINE_PAD_PX, -OUTLINE_PAD_PX);
    const br = this.toWorld(width + OUTLINE_PAD_PX, height + OUTLINE_PAD_PX);
    const xs = minedAreas.map((area) => area.x);
    const ys = minedAreas.map((area) => area.y);
    const bounds = {
      left: Math.floor(Math.max(tl.x, Math.min(...xs) - MINE_INFLUENCE) / block) * block,
      right: Math.ceil(Math.min(br.x, Math.max(...xs) + MINE_INFLUENCE) / block) * block,
      bottom: Math.floor(Math.max(br.y, Math.min(...ys) - MINE_INFLUENCE) / block) * block,
      top: Math.ceil(Math.min(tl.y, Math.max(...ys) + MINE_INFLUENCE) / block) * block,
    };
    if (bounds.left >= bounds.right || bounds.bottom >= bounds.top) return;
    const key = [cell, bounds.left, bounds.right, bounds.bottom, bounds.top, ...minedAreas.map((area) => area.minedAt)].join();
    if (this.minedOutline?.key !== key) this.minedOutline = { key, contours: traceMinedOutline(minedAreas, cell, bounds) };
    const { contours } = this.minedOutline;
    if (contours.length === 0) return;

    const outline = new Path2D();
    for (const contour of contours) {
      contour.forEach((point, index) => {
        const p = this.toScreen(point);
        if (index === 0) outline.moveTo(p.x, p.y);
        else outline.lineTo(p.x, p.y);
      });
      outline.closePath();
    }
    const amber = COLORS.substances;
    ctx.save();
    ctx.fillStyle = amber;
    ctx.globalAlpha = 0.05;
    ctx.fill(outline, 'evenodd');
    // Scanlines pinned to the world, so they don't slide as the map moves.
    ctx.clip(outline, 'evenodd');
    const phase = ((this.toScreen({ x: 0, y: 0 }).y % SCANLINE_PX) + SCANLINE_PX) % SCANLINE_PX;
    ctx.beginPath();
    for (let y = phase; y < height; y += SCANLINE_PX) {
      ctx.moveTo(0, y + 0.5);
      ctx.lineTo(width, y + 0.5);
    }
    ctx.strokeStyle = amber;
    ctx.globalAlpha = 0.07;
    ctx.lineWidth = 1;
    ctx.stroke();
    ctx.restore();

    ctx.save();
    ctx.strokeStyle = amber;
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';
    ctx.globalAlpha = 0.14;
    ctx.lineWidth = 6;
    ctx.stroke(outline);
    // The line itself is pale, so it can't be taken for a sector's border.
    ctx.strokeStyle = COLORS.ink;
    ctx.globalAlpha = 0.75;
    ctx.lineWidth = 1.2;
    ctx.stroke(outline);
    ctx.strokeStyle = amber;
    ctx.setLineDash([18, 260]);
    ctx.lineDashOffset = -time / 25;
    ctx.globalAlpha = 0.9;
    ctx.lineWidth = 2.4;
    ctx.stroke(outline);
    ctx.restore();
  }

  // The area around the player in which at most 8 systems fit.
  drawArea(player, time) {
    const { ctx } = this;
    const p = this.toScreen(player);
    const r = this.scene.areaRadius / this.metersPerPixel;
    ctx.save();
    ctx.setLineDash([2, 8]);
    ctx.lineDashOffset = -time / 60;
    ctx.beginPath();
    ctx.arc(p.x, p.y, r, 0, Math.PI * 2);
    ctx.strokeStyle = COLORS.cyan;
    ctx.globalAlpha = 0.5;
    ctx.lineWidth = 1.5;
    ctx.stroke();
    ctx.restore();
  }

  // Dashed lines from the player to delivery targets.
  drawRoutes(time) {
    const { ctx } = this;
    const { player, systems } = this.scene;
    if (!player) return;
    const from = this.toScreen(player);
    ctx.save();
    ctx.setLineDash([3, 7]);
    ctx.lineDashOffset = -time / 40;
    ctx.lineWidth = 1.2;
    for (const system of systems) {
      if (!system.target) continue;
      const to = this.toScreen(system);
      ctx.strokeStyle = COLORS.cyan;
      ctx.globalAlpha = 0.45;
      ctx.beginPath();
      ctx.moveTo(from.x, from.y);
      ctx.lineTo(to.x, to.y);
      ctx.stroke();
    }
    ctx.restore();
  }

  drawSystem(system, time) {
    const { ctx } = this;
    const p = this.toScreen(system);
    if (p.x < -160 || p.y < -160 || p.x > this.width + 160 || p.y > this.height + 160) return;
    const color = COLORS.sectors[system.sector];
    const dockR = SYSTEM_RADIUS / this.metersPerPixel;

    // The docking zone, 100 m around the star.
    ctx.save();
    ctx.beginPath();
    ctx.arc(p.x, p.y, dockR, 0, Math.PI * 2);
    ctx.fillStyle = color;
    ctx.globalAlpha = system.docked ? 0.12 : 0.05;
    ctx.fill();
    ctx.setLineDash(system.docked ? [] : [4, 6]);
    ctx.lineDashOffset = -time / 120;
    ctx.globalAlpha = system.docked ? 0.9 : 0.45;
    ctx.strokeStyle = color;
    ctx.lineWidth = system.docked ? 1.6 : 1;
    ctx.stroke();
    ctx.restore();

    // Planets on tilted orbits.
    const scale = clamp(dockR / 40, 0.55, 1.4);
    for (let i = 0; i < system.planetCount; i++) {
      const rx = (16 + i * 9) * scale;
      const ry = rx * 0.42;
      ctx.beginPath();
      ctx.ellipse(p.x, p.y, rx, ry, -0.35, 0, Math.PI * 2);
      ctx.strokeStyle = COLORS.ink;
      ctx.globalAlpha = 0.18;
      ctx.lineWidth = 1;
      ctx.stroke();
      const angle = time / (2600 + i * 1700) + system.id * 1.7 + i * 2.1;
      const ex = Math.cos(angle) * rx;
      const ey = Math.sin(angle) * ry;
      const px = p.x + ex * Math.cos(-0.35) - ey * Math.sin(-0.35);
      const py = p.y + ex * Math.sin(-0.35) + ey * Math.cos(-0.35);
      ctx.globalAlpha = 0.95;
      ctx.beginPath();
      ctx.arc(px, py, i === system.main ? 2.6 : 1.7, 0, Math.PI * 2);
      ctx.fillStyle = i === system.main ? color : COLORS.ink;
      ctx.fill();
    }
    ctx.globalAlpha = 1;

    // The star: a glow, a core and four thin flares.
    const glow = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, 14);
    glow.addColorStop(0, 'rgba(255,255,255,0.95)');
    glow.addColorStop(0.25, color);
    glow.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = glow;
    ctx.globalAlpha = 0.85;
    ctx.beginPath();
    ctx.arc(p.x, p.y, 14, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 0.7;
    ctx.strokeStyle = COLORS.ink;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(p.x - 11, p.y);
    ctx.lineTo(p.x + 11, p.y);
    ctx.moveTo(p.x, p.y - 11);
    ctx.lineTo(p.x, p.y + 11);
    ctx.stroke();
    ctx.globalAlpha = 1;

    // Today's market news: a slow gold pulse.
    if (system.news) {
      const pulse = (time / 1600) % 1;
      ctx.beginPath();
      ctx.arc(p.x, p.y, 20 + pulse * 26, 0, Math.PI * 2);
      ctx.strokeStyle = COLORS.gold;
      ctx.globalAlpha = (1 - pulse) * 0.7;
      ctx.lineWidth = 1.5;
      ctx.stroke();
      ctx.globalAlpha = 1;
    }

    // A delivery target: brackets turning around the star.
    if (system.target) {
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(time / 2400);
      ctx.strokeStyle = COLORS.cyan;
      ctx.lineWidth = 1.6;
      for (let k = 0; k < 4; k++) {
        ctx.rotate(Math.PI / 2);
        ctx.beginPath();
        ctx.moveTo(22, 14);
        ctx.lineTo(22, 22);
        ctx.lineTo(14, 22);
        ctx.stroke();
      }
      ctx.restore();
    }

    // Name, and a marker if today's event still waits.
    const labelY = p.y + Math.max(30, 26 * scale + 8);
    ctx.font = '600 11px Oxanium, "Segoe UI", sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    const label = system.name.toUpperCase();
    ctx.letterSpacing = '1.5px';
    ctx.fillStyle = 'rgba(3,5,10,0.65)';
    const w = ctx.measureText(label).width;
    ctx.fillRect(p.x - w / 2 - 6, labelY - 8, w + 12, 16);
    ctx.fillStyle = system.docked ? COLORS.cyan : COLORS.ink;
    ctx.fillText(label, p.x, labelY);
    ctx.fillStyle = color;
    ctx.fillRect(p.x - w / 2 - 6, labelY - 8, 2, 16);
    if (system.event) {
      const x = p.x + w / 2 + 12;
      ctx.save();
      ctx.translate(x, labelY);
      ctx.rotate(Math.PI / 4);
      ctx.fillStyle = COLORS.cyan;
      ctx.globalAlpha = 0.6 + 0.4 * Math.sin(time / 300);
      ctx.fillRect(-3.5, -3.5, 7, 7);
      ctx.restore();
    }
    ctx.letterSpacing = '0px';
    ctx.globalAlpha = 1;
  }

  drawEffects() {
    const now = performance.now();
    this.effects = this.effects.filter((effect) => {
      const t = Math.min(1, (now - effect.start) / effect.duration);
      effect.draw(this.ctx, t);
      if (t < 1) return true;
      effect.resolve();
      return false;
    });
  }

  drawPlayer(player, time) {
    const { ctx } = this;
    const p = this.toScreen(player);
    const accuracy = player.accuracy / this.metersPerPixel;
    if (accuracy > 10) {
      ctx.beginPath();
      ctx.arc(p.x, p.y, accuracy, 0, Math.PI * 2);
      ctx.fillStyle = COLORS.cyan;
      ctx.globalAlpha = 0.06;
      ctx.fill();
      ctx.globalAlpha = 1;
    }
    const heading = player.heading;
    if (heading !== null) {
      const angle = (heading - 90) * (Math.PI / 180);
      const beam = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, 90);
      beam.addColorStop(0, 'rgba(95,230,255,0.35)');
      beam.addColorStop(1, 'rgba(95,230,255,0)');
      ctx.beginPath();
      ctx.moveTo(p.x, p.y);
      ctx.arc(p.x, p.y, 90, angle - 0.42, angle + 0.42);
      ctx.closePath();
      ctx.fillStyle = beam;
      ctx.fill();
    }
    const pulse = (time / 2200) % 1;
    ctx.beginPath();
    ctx.arc(p.x, p.y, 10 + pulse * 22, 0, Math.PI * 2);
    ctx.strokeStyle = COLORS.cyan;
    ctx.globalAlpha = (1 - pulse) * 0.6;
    ctx.lineWidth = 1.2;
    ctx.stroke();
    ctx.globalAlpha = 1;

    // The ship: a chevron along the heading, north when it's unknown.
    ctx.save();
    ctx.translate(p.x, p.y);
    ctx.rotate(((heading ?? 0) * Math.PI) / 180);
    const shine = ctx.createRadialGradient(0, 0, 0, 0, 0, 16);
    shine.addColorStop(0, 'rgba(95,230,255,0.55)');
    shine.addColorStop(1, 'rgba(95,230,255,0)');
    ctx.fillStyle = shine;
    ctx.beginPath();
    ctx.arc(0, 0, 16, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(0, -11);
    ctx.lineTo(8, 9);
    ctx.lineTo(0, 4.5);
    ctx.lineTo(-8, 9);
    ctx.closePath();
    ctx.fillStyle = COLORS.space;
    ctx.fill();
    ctx.strokeStyle = COLORS.cyan;
    ctx.lineWidth = 2;
    ctx.lineJoin = 'round';
    ctx.stroke();
    ctx.restore();
  }

  // Arrows at the screen's edge toward things off screen: { x, y, color, label }.
  drawPointers() {
    const { ctx, width, height } = this;
    const margin = 26;
    const top = 84;
    const bottom = height - 150;
    for (const pointer of this.scene.pointers) {
      const p = this.toScreen(pointer);
      if (p.x > margin && p.x < width - margin && p.y > top && p.y < bottom) continue;
      const cx = width / 2;
      const cy = (top + bottom) / 2;
      const dx = p.x - cx;
      const dy = p.y - cy;
      const k = Math.min((width / 2 - margin) / Math.abs(dx || 1e-6), ((bottom - top) / 2) / Math.abs(dy || 1e-6));
      const x = cx + dx * k;
      const y = cy + dy * k;
      const angle = Math.atan2(dy, dx);
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(angle);
      ctx.beginPath();
      ctx.moveTo(8, 0);
      ctx.lineTo(-5, -6);
      ctx.lineTo(-2, 0);
      ctx.lineTo(-5, 6);
      ctx.closePath();
      ctx.fillStyle = pointer.color;
      ctx.fill();
      ctx.restore();
      if (pointer.label) {
        ctx.font = '600 10px Oxanium, "Segoe UI", sans-serif';
        ctx.fillStyle = pointer.color;
        ctx.textAlign = x < width / 2 ? 'left' : 'right';
        ctx.textBaseline = 'middle';
        const lx = x + (x < width / 2 ? 12 : -12);
        const ly = clamp(y + (y < cy ? 14 : -14), top, bottom);
        ctx.fillText(pointer.label, lx, ly);
      }
    }
  }

  updateScale() {
    const max = 110 * this.metersPerPixel;
    const meters = SCALE_LENGTHS.filter((length) => length <= max).at(-1) ?? SCALE_LENGTHS[0];
    const pixels = Math.round(meters / this.metersPerPixel);
    if (meters === this.scale?.meters && pixels === this.scale?.pixels) return;
    this.scale = { meters, pixels };
    this.onScale?.(meters, pixels);
  }
}

// Marching squares: which cell edges the outline crosses, by which corners of
// the cell are inside (1: top left, 2: top right, 4: bottom right, 8: bottom
// left). Edges are 0: top, 1: right, 2: bottom, 3: left. The two saddle cases
// (5 and 10) depend on the middle of the cell and are resolved separately.
const CELL_SEGMENTS = [
  [], [[3, 0]], [[0, 1]], [[3, 1]], [[1, 2]], null, [[0, 2]], [[3, 2]],
  [[2, 3]], [[0, 2]], null, [[1, 2]], [[3, 1]], [[0, 1]], [[3, 0]], [],
];

// Traces the outline of mined areas, where their influences add up to 1 (see
// mineWeight), on a grid of cells over the bounds (world meters, top above
// bottom), as Tinwalk traces its searched areas. Returns closed polygons in
// world meters; holes are polygons too, so fill them with the even-odd rule.
function traceMinedOutline(areas, cell, bounds) {
  const columns = Math.round((bounds.right - bounds.left) / cell) + 1;
  const rows = Math.round((bounds.top - bounds.bottom) / cell) + 1;
  const field = new Float32Array(columns * rows);
  const reach = Math.ceil(MINE_INFLUENCE / cell);
  for (const area of areas) {
    const ci = Math.round((area.x - bounds.left) / cell);
    const cj = Math.round((bounds.top - area.y) / cell);
    // The border stays empty, so every outline closes, off screen where it
    // runs into the border.
    for (let j = Math.max(1, cj - reach); j <= Math.min(rows - 2, cj + reach); j++) {
      const dy = bounds.top - j * cell - area.y;
      for (let i = Math.max(1, ci - reach); i <= Math.min(columns - 2, ci + reach); i++) {
        const dx = bounds.left + i * cell - area.x;
        field[j * columns + i] += mineWeight(dx * dx + dy * dy);
      }
    }
  }

  // Where the outline crosses each grid edge, keyed by the edge, and which
  // crossings the outline connects it to.
  const crossings = new Map();
  const links = new Map();
  const value = (i, j) => field[j * columns + i];
  const crossing = (edge, i, j) => {
    // Horizontal edges get even keys, vertical ones odd keys.
    const horizontal = edge === 0 || edge === 2;
    const ei = edge === 1 ? i + 1 : i;
    const ej = edge === 2 ? j + 1 : j;
    const key = 2 * (ej * columns + ei) + (horizontal ? 0 : 1);
    if (!crossings.has(key)) {
      const a = value(ei, ej);
      const b = horizontal ? value(ei + 1, ej) : value(ei, ej + 1);
      const t = (1 - a) / (b - a);
      crossings.set(key, {
        x: bounds.left + (ei + (horizontal ? t : 0)) * cell,
        y: bounds.top - (ej + (horizontal ? 0 : t)) * cell,
      });
    }
    return key;
  };
  const link = (a, b) => {
    if (!links.has(a)) links.set(a, []);
    if (!links.has(b)) links.set(b, []);
    links.get(a).push(b);
    links.get(b).push(a);
  };

  const inside = new Uint8Array(field.length);
  for (let k = 0; k < field.length; k++) inside[k] = field[k] >= 1 ? 1 : 0;
  for (let j = 0; j < rows - 1; j++) {
    for (let i = 0; i < columns - 1; i++) {
      const k = j * columns + i;
      const index = inside[k] | (inside[k + 1] << 1) | (inside[k + columns + 1] << 2) | (inside[k + columns] << 3);
      if (index === 0 || index === 15) continue;
      let segments = CELL_SEGMENTS[index];
      if (!segments) {
        const middleInside = (field[k] + field[k + 1] + field[k + columns + 1] + field[k + columns]) / 4 >= 1;
        // Separate the two outside corners if the middle is inside, the two inside ones otherwise.
        const cutTopRight = (index === 5) === middleInside;
        segments = cutTopRight ? [[0, 1], [2, 3]] : [[3, 0], [1, 2]];
      }
      for (const [a, b] of segments) link(crossing(a, i, j), crossing(b, i, j));
    }
  }

  // Every crossing is shared by two neighboring cells, so following the links
  // walks around a closed outline.
  const contours = [];
  const visited = new Set();
  for (const start of links.keys()) {
    if (visited.has(start)) continue;
    const contour = [];
    let previous = null;
    let current = start;
    while (!visited.has(current)) {
      visited.add(current);
      contour.push(crossings.get(current));
      const [a, b] = links.get(current);
      const next = a === previous ? b : a;
      previous = current;
      current = next;
    }
    contours.push(contour);
  }
  return contours;
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}
