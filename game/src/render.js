// Draws the floor from above: cast lamplight, shadow nooks, crates, patrol routes,
// vision cones with the safe shadows behind cover, wardens and Moth.

import { TILE, COLS, ROWS, VIEW_W, HUD_TOP, PALETTE, PLAYER_TUNING, GUARD_TUNING } from './config.js';
import { buildConePolygon, buildCoverShadows } from './vision.js';
import { pebbleLanding } from './player.js';
import { lightLayerFor } from './lighting.js';
import { LAMP_DARK_SECONDS } from './level.js';

const FLOOR_H = ROWS * TILE;

export function drawWorld(ctx, world, mouse) {
  ctx.save();
  ctx.translate(0, HUD_TOP);
  drawFloor(ctx, world.level);
  drawNooks(ctx, world.level, world.time);
  for (const guard of world.guards) drawPatrolRoute(ctx, guard);
  drawExit(ctx, world);
  drawRelics(ctx, world);
  for (const guard of world.guards) drawCoverShadows(ctx, world.level, guard);
  for (const guard of world.guards) drawVisionCone(ctx, world.level, guard);
  drawRings(ctx, world.rings);
  drawWalls(ctx, world.level);
  drawCrates(ctx, world.level);
  drawLamps(ctx, world.level);
  drawPebbleAim(ctx, world, mouse);
  for (const guard of world.guards) drawGuard(ctx, guard);
  drawPlayer(ctx, world.player, world.time);
  for (const guard of world.guards) drawSpeechBubble(ctx, guard);
  drawFloatingTexts(ctx, world.floatingTexts);
  drawNightVignette(ctx);
  drawAlarmVignette(ctx, world);
  ctx.restore();
}

// Dark parquet is safe; the warm pools are lamplight, cut by whatever stands in its way.
function drawFloor(ctx, level) {
  ctx.fillStyle = PALETTE.night;
  ctx.fillRect(0, 0, VIEW_W, FLOOR_H);
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      if (level.tileAt(c, r) === '#') continue;
      const x = c * TILE;
      const y = r * TILE;
      const across = (c + r) % 2 === 0;
      ctx.fillStyle = across ? PALETTE.floorA : PALETTE.floorB;
      ctx.fillRect(x, y, TILE, TILE);
      ctx.fillStyle = 'rgba(0, 0, 0, 0.22)';
      if (across) {
        ctx.fillRect(x, y + 13, TILE, 1);
        ctx.fillRect(x, y + 26, TILE, 1);
      } else {
        ctx.fillRect(x + 13, y, 1, TILE);
        ctx.fillRect(x + 26, y, 1, TILE);
      }
    }
  }
  ctx.globalCompositeOperation = 'lighter';
  ctx.drawImage(lightLayerFor(level), 0, 0);
  ctx.globalCompositeOperation = 'source-over';
}

function drawNooks(ctx, level, time) {
  for (const nook of level.nooks) {
    const x = nook.col * TILE;
    const y = nook.row * TILE;
    ctx.fillStyle = PALETTE.nook;
    ctx.fillRect(x, y, TILE, TILE);
    ctx.strokeStyle = PALETTE.nookEdge;
    ctx.globalAlpha = 0.7 + Math.sin(time * 2 + nook.col) * 0.15;
    ctx.lineWidth = 2;
    ctx.setLineDash([6, 5]);
    ctx.strokeRect(x + 4, y + 4, TILE - 8, TILE - 8);
    ctx.setLineDash([]);
    // A closed eye: nobody sees you here.
    ctx.beginPath();
    ctx.arc(x + TILE / 2, y + TILE / 2 - 3, 8, 0.15 * Math.PI, 0.85 * Math.PI);
    ctx.stroke();
    ctx.globalAlpha = 1;
  }
}

// The dotted loop a warden walks, with a dot at every stop where it pauses to look around.
function drawPatrolRoute(ctx, guard) {
  ctx.strokeStyle = 'rgba(255, 157, 60, 0.42)';
  ctx.lineWidth = 2;
  ctx.setLineDash([3, 8]);
  ctx.beginPath();
  guard.loop.forEach((point, i) => (i ? ctx.lineTo(point.x, point.y) : ctx.moveTo(point.x, point.y)));
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.fillStyle = 'rgba(255, 157, 60, 0.6)';
  for (const stop of guard.stops) {
    ctx.beginPath();
    ctx.arc(stop.x, stop.y, 4, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawWalls(ctx, level) {
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      if (level.tileAt(c, r) !== '#') continue;
      const x = c * TILE;
      const y = r * TILE;
      ctx.fillStyle = PALETTE.wall;
      ctx.fillRect(x, y, TILE, TILE);
      // Brick courses.
      ctx.fillStyle = 'rgba(20, 26, 52, 0.4)';
      ctx.fillRect(x, y + 13, TILE, 1.5);
      ctx.fillRect(x, y + 27, TILE, 1.5);
      ctx.fillRect(x + 20, y, 1.5, 13);
      ctx.fillRect(x + 8, y + 14, 1.5, 13);
      ctx.fillRect(x + 30, y + 28, 1.5, 12);
      if (level.tileAt(c, r - 1) !== '#' || r === 0) {
        ctx.fillStyle = PALETTE.wallTop;
        ctx.fillRect(x, y, TILE, 7);
      }
      // A dark foot where the wall meets open floor below it, so rooms read at a glance.
      if (level.tileAt(c, r + 1) !== '#') {
        ctx.fillStyle = PALETTE.wallShade;
        ctx.fillRect(x, y + TILE - 9, TILE, 9);
      }
    }
  }
}

function drawCrates(ctx, level) {
  for (const crate of level.crates) {
    const x = crate.col * TILE + 2;
    const y = crate.row * TILE + 2;
    const size = TILE - 4;
    ctx.fillStyle = 'rgba(0, 0, 0, 0.45)';
    ctx.fillRect(x + 3, y + 5, size, size);
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

// A lit lamp glows; a snuffed one shows a ring that closes as it gets ready to relight.
function drawLamps(ctx, level) {
  for (const lamp of level.lamps) {
    if (!lamp.lit) {
      ctx.fillStyle = '#39415c';
      ctx.beginPath();
      ctx.arc(lamp.x, lamp.y, 6, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = PALETTE.lamp;
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.arc(lamp.x, lamp.y, 12, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * (1 - lamp.darkSeconds / LAMP_DARK_SECONDS));
      ctx.stroke();
      continue;
    }
    const glow = ctx.createRadialGradient(lamp.x, lamp.y, 2, lamp.x, lamp.y, 40);
    glow.addColorStop(0, 'rgba(255, 236, 180, 0.9)');
    glow.addColorStop(1, 'rgba(255, 230, 160, 0)');
    ctx.fillStyle = glow;
    ctx.fillRect(lamp.x - 40, lamp.y - 40, 80, 80);
    ctx.fillStyle = '#fff6d8';
    ctx.beginPath();
    ctx.arc(lamp.x, lamp.y, 6, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#b9853a';
    ctx.lineWidth = 2;
    ctx.stroke();
  }
}

function drawRelics(ctx, world) {
  for (const relic of world.level.relics) {
    if (relic.taken) continue;
    const bob = Math.sin(world.time * 3 + relic.x) * 2;
    ctx.save();
    ctx.translate(relic.x, relic.y + bob);
    ctx.shadowColor = PALETTE.relic;
    ctx.shadowBlur = 18;
    ctx.fillStyle = PALETTE.relic;
    ctx.beginPath();
    ctx.moveTo(0, -13);
    ctx.lineTo(11, 0);
    ctx.lineTo(0, 13);
    ctx.lineTo(-11, 0);
    ctx.closePath();
    ctx.fill();
    ctx.shadowBlur = 0;
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(-2, -6, 4, 4);
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
  ctx.shadowBlur = world.exitOpen ? 24 + Math.sin(world.time * 5) * 6 : 10;
  ctx.fillStyle = world.exitOpen ? 'rgba(93, 255, 143, 0.32)' : 'rgba(255, 107, 107, 0.22)';
  ctx.fillRect(x - 2, y - 2, TILE + 4, TILE + 4);
  ctx.strokeStyle = color;
  ctx.lineWidth = 3;
  ctx.strokeRect(x - 1, y - 1, TILE + 2, TILE + 2);
  ctx.shadowBlur = 0;
  ctx.fillStyle = color;
  ctx.font = 'bold 16px system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('EXIT', exit.x, exit.y + 6);
  ctx.font = 'bold 13px system-ui, sans-serif';
  ctx.fillText(world.exitOpen ? 'OPEN' : 'LOCKED', exit.x, y - 8);
  ctx.restore();
}

let hatchPattern = null;
function coverHatch(ctx) {
  if (hatchPattern) return hatchPattern;
  const tile = document.createElement('canvas');
  tile.width = tile.height = 10;
  const pen = tile.getContext('2d');
  pen.strokeStyle = 'rgba(63, 214, 194, 0.95)';
  pen.lineWidth = 2;
  pen.beginPath();
  pen.moveTo(-2, 12);
  pen.lineTo(12, -2);
  pen.moveTo(-2, 2);
  pen.lineTo(2, -2);
  pen.moveTo(8, 12);
  pen.lineTo(12, 8);
  pen.stroke();
  hatchPattern = ctx.createPattern(tile, 'repeat');
  return hatchPattern;
}

// Teal hatching marks the floor a crate hides from this warden: stand there and you are safe.
function drawCoverShadows(ctx, level, guard) {
  const slices = buildCoverShadows(level, guard);
  ctx.beginPath();
  let any = false;
  for (let i = 0; i < slices.length - 1; i++) {
    const a = slices[i];
    const b = slices[i + 1];
    if (!a || !b) continue;
    any = true;
    ctx.moveTo(a.nearX, a.nearY);
    ctx.lineTo(a.farX, a.farY);
    ctx.lineTo(b.farX, b.farY);
    ctx.lineTo(b.nearX, b.nearY);
    ctx.closePath();
  }
  if (!any) return;
  ctx.fillStyle = 'rgba(63, 214, 194, 0.13)';
  ctx.fill();
  ctx.globalAlpha = 0.6;
  ctx.fillStyle = coverHatch(ctx);
  ctx.fill();
  ctx.globalAlpha = 1;
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
    ctx.strokeStyle = `rgba(${ring.color}, ${(0.8 * (1 - t)).toFixed(3)})`;
    ctx.lineWidth = 2.5;
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
  ctx.arc(0, 0, GUARD_TUNING.radius + 3, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = guard.state === 'chase' ? PALETTE.bad : PALETTE.guard;
  ctx.beginPath();
  ctx.arc(0, 0, GUARD_TUNING.radius, 0, Math.PI * 2);
  ctx.fill();
  // Cap and the lantern the warden carries in front.
  ctx.fillStyle = '#5a3210';
  ctx.beginPath();
  ctx.arc(-1, 0, GUARD_TUNING.radius - 4, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#fff3c4';
  ctx.beginPath();
  ctx.moveTo(GUARD_TUNING.radius + 7, 0);
  ctx.lineTo(5, -6);
  ctx.lineTo(5, 6);
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
  ctx.arc(guard.x, guard.y, 21, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * (alert ? 1 : Math.max(0.08, guard.awareness)));
  ctx.stroke();
  ctx.fillStyle = alert ? PALETTE.bad : PALETTE.warn;
  ctx.font = 'bold 22px system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(alert ? '!' : '?', guard.x, guard.y - 27);
}

// What the warden mutters when it hears, sees or gives up: its state, in words.
function drawSpeechBubble(ctx, guard) {
  if (!guard.speech) return;
  ctx.font = 'italic bold 15px Georgia, serif';
  const width = ctx.measureText(guard.speech.text).width + 18;
  const left = Math.max(4, Math.min(VIEW_W - width - 4, guard.x + 16));
  const top = Math.max(4, guard.y - 62);
  ctx.fillStyle = '#fff8e6';
  ctx.strokeStyle = '#1a1206';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.roundRect(left, top, width, 26, 8);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = '#1a1206';
  ctx.textAlign = 'left';
  ctx.fillText(guard.speech.text, left + 9, top + 18);
}

function drawPlayer(ctx, player, time) {
  ctx.save();
  ctx.translate(player.x, player.y);
  if (player.hidden) {
    ctx.strokeStyle = PALETTE.playerHidden;
    ctx.lineWidth = 2.5;
    ctx.globalAlpha = 0.7 + Math.sin(time * 6) * 0.2;
    ctx.beginPath();
    ctx.arc(0, 0, PLAYER_TUNING.radius + 7, 0, Math.PI * 2);
    ctx.stroke();
    ctx.globalAlpha = 0.6;
  } else {
    // A soft halo so Moth is easy to find on the dark floor.
    const halo = ctx.createRadialGradient(0, 0, 4, 0, 0, 28);
    halo.addColorStop(0, 'rgba(160, 235, 255, 0.55)');
    halo.addColorStop(1, 'rgba(160, 235, 255, 0)');
    ctx.fillStyle = halo;
    ctx.fillRect(-28, -28, 56, 56);
  }
  ctx.rotate(player.facing);
  ctx.fillStyle = '#05070d';
  ctx.beginPath();
  ctx.arc(0, 0, PLAYER_TUNING.radius + 3, 0, Math.PI * 2);
  ctx.fill();
  // Two cloak wings behind, like the moth Moth is named for.
  ctx.fillStyle = '#6b58c9';
  ctx.beginPath();
  ctx.ellipse(-7, -7, 8, 5, -0.6, 0, Math.PI * 2);
  ctx.ellipse(-7, 7, 8, 5, 0.6, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = player.hidden ? PALETTE.playerHidden : PALETTE.player;
  ctx.beginPath();
  ctx.arc(0, 0, PLAYER_TUNING.radius, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#3b2f6b';
  ctx.beginPath();
  ctx.arc(-2, 0, PLAYER_TUNING.radius - 2, Math.PI * 0.5, Math.PI * 1.5);
  ctx.fill();
  ctx.fillStyle = '#05070d';
  ctx.fillRect(4, -4, 3, 3);
  ctx.fillRect(4, 2, 3, 3);
  ctx.restore();
}

// A dotted line from Moth to where a pebble would land, while the mouse is over the floor.
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
  ctx.strokeStyle = 'rgba(127, 233, 255, 0.75)';
  ctx.lineWidth = 2;
  ctx.setLineDash([4, 6]);
  ctx.beginPath();
  ctx.moveTo(player.x, player.y);
  ctx.lineTo(landing.x, landing.y);
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.beginPath();
  ctx.arc(landing.x, landing.y, 8, 0, Math.PI * 2);
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

function drawNightVignette(ctx) {
  const edge = ctx.createRadialGradient(VIEW_W / 2, FLOOR_H / 2, FLOOR_H * 0.55, VIEW_W / 2, FLOOR_H / 2, VIEW_W * 0.7);
  edge.addColorStop(0, 'rgba(3, 5, 12, 0)');
  edge.addColorStop(1, 'rgba(3, 5, 12, 0.5)');
  ctx.fillStyle = edge;
  ctx.fillRect(0, 0, VIEW_W, FLOOR_H);
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
