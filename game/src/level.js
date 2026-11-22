// Turns a text map from levels.js into a playable floor: solid tiles, cover, nooks,
// lamp light, the star dials, the exit, and grid pathfinding for the wardens.

import { TILE, COLS, ROWS } from './config.js';
import { hasLineOfSight } from './geometry.js';

const LAMP_RADIUS = 150;

export function tileCenter(col, row) {
  return { x: col * TILE + TILE / 2, y: row * TILE + TILE / 2 };
}

export function buildLevel(definition) {
  const rows = [];
  for (let r = 0; r < ROWS; r++) {
    let text = (definition.map[r] || '').padEnd(COLS, '#').slice(0, COLS);
    if (r === 0 || r === ROWS - 1) text = '#'.repeat(COLS);
    rows.push('#' + text.slice(1, COLS - 1) + '#');
  }

  const level = {
    name: definition.name,
    hint: definition.hint,
    rows,
    lamps: [],
    relics: [],
    crates: [],
    nooks: [],
    start: tileCenter(1, 1),
    exit: { ...tileCenter(COLS - 2, ROWS - 2), col: COLS - 2, row: ROWS - 2 },
    guardRoutes: definition.guards,
    light: new Float32Array(COLS * ROWS),
  };

  level.tileAt = (col, row) => (col < 0 || row < 0 || col >= COLS || row >= ROWS ? '#' : rows[row][col]);
  level.isSolidTile = (col, row) => {
    const t = level.tileAt(col, row);
    return t === '#' || t === 'c';
  };
  level.tileAtPoint = (x, y) => level.tileAt(Math.floor(x / TILE), Math.floor(y / TILE));
  level.blocksSightAt = (x, y) => level.isSolidTile(Math.floor(x / TILE), Math.floor(y / TILE));
  level.isNookAt = (x, y) => level.tileAt(Math.floor(x / TILE), Math.floor(y / TILE)) === 'n';
  level.lightAt = (x, y) => {
    const col = Math.floor(x / TILE);
    const row = Math.floor(y / TILE);
    if (col < 0 || row < 0 || col >= COLS || row >= ROWS) return 0;
    return level.light[row * COLS + col];
  };
  // True when a square body of this half-size overlaps a wall or crate.
  level.bodyCollides = (x, y, half) => {
    const c0 = Math.floor((x - half) / TILE);
    const c1 = Math.floor((x + half) / TILE);
    const r0 = Math.floor((y - half) / TILE);
    const r1 = Math.floor((y + half) / TILE);
    for (let r = r0; r <= r1; r++) for (let c = c0; c <= c1; c++) if (level.isSolidTile(c, r)) return true;
    return false;
  };

  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      const t = rows[r][c];
      const center = tileCenter(c, r);
      if (t === 'L') level.lamps.push({ ...center, radius: LAMP_RADIUS, lit: true, darkSeconds: 0 });
      if (t === 'g') level.relics.push({ ...center, taken: false });
      if (t === 'c') level.crates.push({ col: c, row: r });
      if (t === 'n') level.nooks.push({ col: c, row: r });
      if (t === 'S') level.start = center;
      if (t === 'E') level.exit = { ...center, col: c, row: r };
    }
  }
  bakeLight(level);
  return level;
}

// Each floor tile remembers how brightly the lit lamps reach it (0 dark .. 1 under a lamp).
// Crates and walls cast shadows: a tile a lamp cannot see stays dark.
export function bakeLight(level) {
  level.lightVersion = (level.lightVersion || 0) + 1;
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      level.light[r * COLS + c] = 0;
      if (level.isSolidTile(c, r)) continue;
      const { x, y } = tileCenter(c, r);
      let brightest = 0;
      for (const lamp of level.lamps) {
        if (!lamp.lit) continue;
        const d = Math.hypot(lamp.x - x, lamp.y - y);
        if (d > lamp.radius) continue;
        if (!hasLineOfSight(level, lamp.x, lamp.y, x, y)) continue;
        brightest = Math.max(brightest, 1 - d / lamp.radius);
      }
      level.light[r * COLS + c] = brightest;
    }
  }
}

export const LAMP_DARK_SECONDS = 14;
const LAMP_SNUFF_REACH = 62;

// Moth pinches out the nearest lit lamp in reach; it stays dark for a while, then relights.
export function snuffLampNear(level, x, y) {
  let nearest = null;
  let best = LAMP_SNUFF_REACH;
  for (const lamp of level.lamps) {
    const d = Math.hypot(lamp.x - x, lamp.y - y);
    if (lamp.lit && d <= best) {
      nearest = lamp;
      best = d;
    }
  }
  if (!nearest) return null;
  nearest.lit = false;
  nearest.darkSeconds = LAMP_DARK_SECONDS;
  bakeLight(level);
  return nearest;
}

export function updateLamps(level, dt) {
  for (const lamp of level.lamps) {
    if (lamp.lit) continue;
    lamp.darkSeconds -= dt;
    if (lamp.darkSeconds > 0) continue;
    lamp.lit = true;
    bakeLight(level);
  }
}

// Breadth-first route over walkable tiles; returns tile centres from start (exclusive) to goal.
export function findPath(level, fromX, fromY, toX, toY) {
  const startCol = Math.floor(fromX / TILE);
  const startRow = Math.floor(fromY / TILE);
  let goalCol = Math.floor(toX / TILE);
  let goalRow = Math.floor(toY / TILE);
  if (level.isSolidTile(goalCol, goalRow)) {
    const near = nearestOpenTile(level, goalCol, goalRow);
    goalCol = near.col;
    goalRow = near.row;
  }
  const start = startRow * COLS + startCol;
  const goal = goalRow * COLS + goalCol;
  const cameFrom = new Int32Array(COLS * ROWS).fill(-1);
  cameFrom[start] = start;
  const queue = [start];
  for (let head = 0; head < queue.length; head++) {
    const current = queue[head];
    if (current === goal) break;
    const c = current % COLS;
    const r = (current - c) / COLS;
    for (const [dc, dr] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const nc = c + dc;
      const nr = r + dr;
      if (level.isSolidTile(nc, nr)) continue;
      const next = nr * COLS + nc;
      if (cameFrom[next] !== -1) continue;
      cameFrom[next] = current;
      queue.push(next);
    }
  }
  if (cameFrom[goal] === -1) return [];
  const path = [];
  for (let at = goal; at !== start; at = cameFrom[at]) {
    const c = at % COLS;
    path.push(tileCenter(c, (at - c) / COLS));
  }
  return path.reverse();
}

function nearestOpenTile(level, col, row) {
  for (let reach = 1; reach < 6; reach++) {
    for (let r = row - reach; r <= row + reach; r++) {
      for (let c = col - reach; c <= col + reach; c++) {
        if (!level.isSolidTile(c, r)) return { col: c, row: r };
      }
    }
  }
  return { col, row };
}
