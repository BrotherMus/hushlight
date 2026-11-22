// Draws the floor from above: lamp light, shadow nooks, crates, vision cones, wardens, Moth.

import { TILE, COLS, ROWS, VIEW_W, HUD_TOP, PALETTE, PLAYER_TUNING, GUARD_TUNING } from './config.js';
import { buildConePolygon } from './vision.js';
import { pebbleLanding } from './player.js';

const FLOOR_H = ROWS * TILE;

export function drawWorld(ctx, world, mouse) {
  ctx.save();
  ctx.translate(0, HUD_TOP);
  drawFloor(ctx, world.level);
  drawNooks(ctx, world.level, world.time);
  drawExit(ctx, world);
  drawRelics(ctx, world);
  for (const guard of world.guards) drawVisionCone(ctx, world.level, guard);
  drawRings(ctx, world.rings);
  drawWalls(ctx, world.level);
  drawCrates(ctx, world.level);
  drawLamps(ctx, world.level);
  drawPebbleAim(ctx, world, mouse);
  for (const guard of world.guards) drawGuard(ctx, guard);
  drawPlayer(ctx, world.player, world.time);
  drawFloatingTexts(ctx, world.floatingTexts);
  drawAlarmVignette(ctx, world);
  ctx.restore();
}

// Dark tiles are safe, warm tiles are lit: the floor itself is the light map.
function drawFloor(ctx, level) {
  ctx.fillStyle = PALETTE.night;
  ctx.fillRect(0, 0, VIEW_W, FLOOR_H);
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      if (level.tileAt(c, r) === '#') continue;
      ctx.fillStyle = (c + r) % 2 ? PALETTE.floorA : PALETTE.floorB;
      ctx.fillRect(c * TILE, r * TILE, TILE, TILE);
      const light = level.light[r * COLS + c];
      if (light > 0) {
        ctx.fillStyle = `rgba(255, 214, 130, ${(0.1 + light * 0.3).toFixed(3)})`;
        ctx.fillRect(c * TILE, r * TILE, TILE, TILE);
      }
    }
  }
}

function drawNooks(ctx, level, time) {
  for (const nook of level.nooks) {
    const x = nook.col * TILE;
    const y = nook.row * TILE;
    ctx.fillStyle = PALETTE.nook;
    ctx.fillRect(x, y, TILE, TILE);
    ctx.strokeStyle = PALETTE.nookEdge;
    ctx.globalAlpha = 0.65 + Math.sin(time * 2 + nook.col) * 0.15;
    ctx.lineWidth = 2;
    ctx.setLineDash([6, 5]);
    ctx.strokeRect(x + 4, y + 4, TILE - 8, TILE - 8);
    ctx.setLineDash([]);
    ctx.globalAlpha = 1;
  }
}

function drawWalls(ctx, level) {
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      if (level.tileAt(c, r) !== '#') continue;
      ctx.fillStyle = PALETTE.wall;
      ctx.fillRect(c * TILE, r * TILE, TILE, TILE);
      if (level.tileAt(c, r - 1) !== '#' || r === 0) {
        ctx.fillStyle = PALETTE.wallTop;
        ctx.fillRect(c * TILE, r * TILE, TILE, 8);
      }
      // A dark foot where the wall meets open floor below it, so rooms read at a glance.
      if (level.tileAt(c, r + 1) !== '#') {
        ctx.fillStyle = PALETTE.wallShade;
        ctx.fillRect(c * TILE, r * TILE + TILE - 9, TILE, 9);
      }
    }
  }
}

function drawCrates(ctx, level) {
  for (const crate of level.crates) {
    const x = crate.col * TILE + 2;
    const y = crate.row * TILE + 2;
    const size = TILE - 4;
    ctx.fillStyle = PALETTE.crateDark;
    ctx.fillRect(x, y, size, size);
    ctx.fillStyle = PALETTE.crate;
    ctx.fillRect(x + 3, y + 3, size - 6, size - 6);
    ctx.strokeStyle = PALETTE.crateLight;
    ctx.lineWidth = 2;
    ctx.strokeRect(x + 4, y + 4, size - 8, size - 8);
    ctx.beginPath();
    ctx.moveTo(x + 5, y + 5);
    ctx.lineTo(x + size - 5, y + size - 5);
    ctx.moveTo(x + size - 5, y + 5);
    ctx.lineTo(x + 5, y + size - 5);
    ctx.stroke();
  }
}

function drawLamps(ctx, level) {
  for (const lamp of level.lamps) {
    const glow = ctx.createRadialGradient(lamp.x, lamp.y, 2, lamp.x, lamp.y, 46);
    glow.addColorStop(0, 'rgba(255, 230, 160, 0.75)');
    glow.addColorStop(1, 'rgba(255, 230, 160, 0)');
    ctx.fillStyle = glow;
    ctx.fillRect(lamp.x - 46, lamp.y - 46, 92, 92);
    ctx.fillStyle = PALETTE.lamp;
    ctx.beginPath();
    ctx.arc(lamp.x, lamp.y, 5, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawRelics(ctx, world) {
  for (const relic of world.level.relics) {
    if (relic.taken) continue;
    const bob = Math.sin(world.time * 3 + relic.x) * 2;
    ctx.save();
    ctx.translate(relic.x, relic.y + bob);
    ctx.shadowColor = PALETTE.relic;
    ctx.shadowBlur = 16;
    ctx.fillStyle = PALETTE.relic;
    ctx.beginPath();
    ctx.moveTo(0, -11);
    ctx.lineTo(9, 0);
    ctx.lineTo(0, 11);
    ctx.lineTo(-9, 0);
    ctx.closePath();
    ctx.fill();
    ctx.shadowBlur = 0;
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(-2, -5, 3, 3);
    ctx.restore();
  }
}

function drawExit(ctx, world) {
  const { exit } = world.level;
  const color = world.exitOpen ? PALETTE.exitOpen : PALETTE.exitLocked;
  const x = exit.col * TILE;
  const y = exit.row * TILE;
  ctx.save();
  ctx.shadowColor = color;
  ctx.shadowBlur = world.exitOpen ? 22 + Math.sin(world.time * 5) * 6 : 8;
  ctx.fillStyle = world.exitOpen ? 'rgba(93, 255, 143, 0.3)' : 'rgba(255, 107, 107, 0.2)';
  ctx.fillRect(x + 2, y + 2, TILE - 4, TILE - 4);
  ctx.strokeStyle = color;
  ctx.lineWidth = 3;
  ctx.strokeRect(x + 3, y + 3, TILE - 6, TILE - 6);
  ctx.shadowBlur = 0;
  ctx.fillStyle = color;
  ctx.font = 'bold 15px system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('EXIT', exit.x, exit.y + 5);
  ctx.font = 'bold 13px system-ui, sans-serif';
  ctx.fillText(world.exitOpen ? 'OPEN' : 'LOCKED', exit.x, y - 6);
  ctx.restore();
}

// The cone is exactly what the warden sees: walls and crates cut it short.
function drawVisionCone(ctx, level, guard) {
  const points = buildConePolygon(level, guard);
  const tint =
    guard.state === 'chase' ? PALETTE.coneAlert : guard.state === 'patrol' && guard.awareness < 0.05 ? PALETTE.coneCalm : PALETTE.coneSuspicious;
  const fill = ctx.createRadialGradient(guard.x, guard.y, 6, guard.x, guard.y, GUARD_TUNING.sightRange);
  fill.addColorStop(0, `rgba(${tint}, 0.62)`);
  fill.addColorStop(1, `rgba(${tint}, 0.2)`);
  ctx.beginPath();
  ctx.moveTo(points[0].x, points[0].y);
  for (let i = 1; i < points.length; i++) ctx.lineTo(points[i].x, points[i].y);
  ctx.closePath();
  ctx.fillStyle = fill;
  ctx.fill();
  ctx.strokeStyle = `rgba(${tint}, 0.85)`;
  ctx.lineWidth = 2;
  ctx.stroke();
}

function drawRings(ctx, rings) {
  for (const ring of rings) {
    const t = ring.age / ring.life;
    ctx.strokeStyle = `rgba(${ring.color}, ${(0.7 * (1 - t)).toFixed(3)})`;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(ring.x, ring.y, 4 + ring.maxRadius * t, 0, Math.PI * 2);
    ctx.stroke();
  }
}

function drawGuard(ctx, guard) {
  ctx.save();
  ctx.translate(guard.x, guard.y);
  ctx.rotate(guard.heading);
  ctx.fillStyle = '#1a1206';
  ctx.beginPath();
  ctx.arc(0, 0, GUARD_TUNING.radius + 2.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = guard.state === 'chase' ? PALETTE.bad : PALETTE.guard;
  ctx.beginPath();
  ctx.arc(0, 0, GUARD_TUNING.radius, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#fff3c4';
  ctx.beginPath();
  ctx.moveTo(GUARD_TUNING.radius + 6, 0);
  ctx.lineTo(4, -6);
  ctx.lineTo(4, 6);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
  drawAwarenessArc(ctx, guard);
}

// The ring over a warden's head fills as it becomes sure of what it sees.
function drawAwarenessArc(ctx, guard) {
  if (guard.awareness <= 0.02 && guard.state === 'patrol') return;
  const alert = guard.state === 'chase';
  ctx.lineWidth = 4;
  ctx.strokeStyle = 'rgba(0, 0, 0, 0.6)';
  ctx.beginPath();
  ctx.arc(guard.x, guard.y, 21, 0, Math.PI * 2);
  ctx.stroke();
  ctx.strokeStyle = alert ? PALETTE.bad : PALETTE.warn;
  ctx.beginPath();
  ctx.arc(guard.x, guard.y, 21, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * (alert ? 1 : guard.awareness));
  ctx.stroke();
  ctx.fillStyle = alert ? PALETTE.bad : PALETTE.warn;
  ctx.font = 'bold 20px system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(alert ? '!' : '?', guard.x, guard.y - 27);
}

function drawPlayer(ctx, player, time) {
  ctx.save();
  ctx.translate(player.x, player.y);
  if (player.hidden) {
    ctx.strokeStyle = PALETTE.playerHidden;
    ctx.lineWidth = 2;
    ctx.globalAlpha = 0.6 + Math.sin(time * 6) * 0.2;
    ctx.beginPath();
    ctx.arc(0, 0, PLAYER_TUNING.radius + 6, 0, Math.PI * 2);
    ctx.stroke();
    ctx.globalAlpha = 0.55;
  } else {
    // A soft halo so Moth is easy to find on the dark floor.
    const halo = ctx.createRadialGradient(0, 0, 4, 0, 0, 26);
    halo.addColorStop(0, 'rgba(244, 241, 232, 0.45)');
    halo.addColorStop(1, 'rgba(244, 241, 232, 0)');
    ctx.fillStyle = halo;
    ctx.fillRect(-26, -26, 52, 52);
  }
  ctx.rotate(player.facing);
  ctx.fillStyle = '#05070d';
  ctx.beginPath();
  ctx.arc(0, 0, PLAYER_TUNING.radius + 2.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = player.hidden ? PALETTE.playerHidden : PALETTE.player;
  ctx.beginPath();
  ctx.arc(0, 0, PLAYER_TUNING.radius, 0, Math.PI * 2);
  ctx.fill();
  // Moth's hood and two wing-like cloak tips.
  ctx.fillStyle = '#3b2f6b';
  ctx.beginPath();
  ctx.arc(-2, 0, PLAYER_TUNING.radius - 2, Math.PI * 0.5, Math.PI * 1.5);
  ctx.fill();
  ctx.fillStyle = '#05070d';
  ctx.fillRect(4, -4, 3, 3);
  ctx.fillRect(4, 2, 3, 3);
  ctx.restore();
}

// A dotted arc from Moth to where a pebble would land, while the mouse is over the floor.
function drawPebbleAim(ctx, world, mouse) {
  const { player, level } = world;
  const flying = player.pebbleInFlight;
  if (flying) {
    const t = flying.progress;
    const x = flying.fromX + (flying.toX - flying.fromX) * t;
    const y = flying.fromY + (flying.toY - flying.fromY) * t - Math.sin(t * Math.PI) * 26;
    ctx.fillStyle = PALETTE.relic;
    ctx.beginPath();
    ctx.arc(x, y, 4, 0, Math.PI * 2);
    ctx.fill();
  }
  if (!mouse || !mouse.inside || player.pebbles <= 0) return;
  const landing = pebbleLanding(player, mouse.x, mouse.y - HUD_TOP, level);
  ctx.strokeStyle = 'rgba(127, 233, 255, 0.6)';
  ctx.lineWidth = 1.5;
  ctx.setLineDash([4, 6]);
  ctx.beginPath();
  ctx.moveTo(player.x, player.y);
  ctx.lineTo(landing.x, landing.y);
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.beginPath();
  ctx.arc(landing.x, landing.y, 7, 0, Math.PI * 2);
  ctx.stroke();
}

function drawFloatingTexts(ctx, words) {
  ctx.textAlign = 'center';
  ctx.font = 'bold 16px system-ui, sans-serif';
  for (const word of words) {
    ctx.globalAlpha = Math.max(0, 1 - word.age / word.life);
    ctx.fillStyle = '#05070d';
    ctx.fillText(word.text, word.x + 1, word.y + 1);
    ctx.fillStyle = word.color;
    ctx.fillText(word.text, word.x, word.y);
  }
  ctx.globalAlpha = 1;
}

function drawAlarmVignette(ctx, world) {
  if (world.status !== 'SPOTTED') return;
  const pulse = 0.25 + Math.abs(Math.sin(world.time * 6)) * 0.2;
  const edge = ctx.createRadialGradient(VIEW_W / 2, FLOOR_H / 2, FLOOR_H * 0.45, VIEW_W / 2, FLOOR_H / 2, VIEW_W * 0.62);
  edge.addColorStop(0, 'rgba(255, 40, 40, 0)');
  edge.addColorStop(1, `rgba(255, 40, 40, ${pulse.toFixed(3)})`);
  ctx.fillStyle = edge;
  ctx.fillRect(0, 0, VIEW_W, FLOOR_H);
}
