// Lamplight with cast shadows: each lit lamp throws a pool of light that walls and crates
// cut, painted once per floor (and again when a lamp is snuffed or relights).

import { TILE, ROWS, VIEW_W } from './config.js';
import { castRay } from './geometry.js';

const LIGHT_RAYS = 180;
let cached = { level: null, version: -1, canvas: null };

export function lightLayerFor(level) {
  if (cached.level === level && cached.version === level.lightVersion) return cached.canvas;
  const canvas = document.createElement('canvas');
  canvas.width = VIEW_W;
  canvas.height = ROWS * TILE;
  const ctx = canvas.getContext('2d');
  for (const lamp of level.lamps) if (lamp.lit) paintLampPool(ctx, level, lamp);
  cached = { level, version: level.lightVersion, canvas };
  return canvas;
}

function paintLampPool(ctx, level, lamp) {
  const reach = lamp.radius * 1.12;
  ctx.beginPath();
  for (let i = 0; i <= LIGHT_RAYS; i++) {
    const angle = (i / LIGHT_RAYS) * Math.PI * 2;
    const free = castRay(level, lamp.x, lamp.y, angle, reach) + 6;
    const x = lamp.x + Math.cos(angle) * free;
    const y = lamp.y + Math.sin(angle) * free;
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.closePath();
  const pool = ctx.createRadialGradient(lamp.x, lamp.y, 4, lamp.x, lamp.y, reach);
  pool.addColorStop(0, 'rgba(255, 206, 120, 0.78)');
  pool.addColorStop(0.5, 'rgba(255, 186, 96, 0.44)');
  pool.addColorStop(1, 'rgba(255, 176, 90, 0.1)');
  ctx.fillStyle = pool;
  ctx.fill();
}
