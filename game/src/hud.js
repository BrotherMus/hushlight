// The heads-up display: loot, pebbles, the awareness meter, controls, and floor labels.

import { TILE, VIEW_W, VIEW_H, HUD_TOP, HUD_BOTTOM, PALETTE, PLAYER_TUNING } from './config.js';

const STATUS_STYLE = {
  UNSEEN: { color: PALETTE.good, label: 'UNSEEN' },
  HIDDEN: { color: PALETTE.playerHidden, label: 'HIDDEN IN SHADOW' },
  GLIMPSED: { color: PALETTE.warn, label: 'GLIMPSED - BREAK LINE OF SIGHT' },
  SUSPICIOUS: { color: PALETTE.warn, label: 'SUSPICIOUS - WARDEN INVESTIGATING' },
  SPOTTED: { color: PALETTE.bad, label: 'SPOTTED! RUN AND HIDE' },
};

export function drawHud(ctx, world) {
  drawTopBar(ctx, world);
  drawAwarenessMeter(ctx, world);
  drawControlsBar(ctx, world);
  drawFieldLabels(ctx, world);
}

function drawTopBar(ctx, world) {
  ctx.fillStyle = '#060912';
  ctx.fillRect(0, 0, VIEW_W, HUD_TOP);
  ctx.textBaseline = 'middle';
  ctx.textAlign = 'left';
  ctx.font = 'bold 25px system-ui, sans-serif';
  ctx.fillStyle = PALETTE.lamp;
  ctx.fillText('HUSHLIGHT', 12, HUD_TOP / 2 + 1);
  ctx.font = '16px system-ui, sans-serif';
  ctx.fillStyle = PALETTE.dim;
  ctx.fillText(world.level.name, 170, HUD_TOP / 2);

  ctx.font = 'bold 17px system-ui, sans-serif';
  ctx.fillStyle = PALETTE.relic;
  ctx.fillText(`STAR DIALS ${world.relicsTaken}/${world.level.relics.length}`, 386, HUD_TOP / 2);
  ctx.fillStyle = PALETTE.text;
  let pebbles = '';
  for (let i = 0; i < PLAYER_TUNING.pebblesPerLevel; i++) pebbles += i < world.player.pebbles ? '●' : '○';
  ctx.fillText(`PEBBLES ${pebbles}`, 546, HUD_TOP / 2);
  ctx.fillStyle = PALETTE.dim;
  ctx.fillText(formatTime(world.time), 728, HUD_TOP / 2);
  ctx.textBaseline = 'alphabetic';
}

// One bar for the most aware warden: green unseen, amber suspicious, red spotted.
function drawAwarenessMeter(ctx, world) {
  const style = STATUS_STYLE[world.status] || STATUS_STYLE.UNSEEN;
  const x = 790;
  const width = 476;
  ctx.fillStyle = '#141a2e';
  ctx.fillRect(x, 8, width, 28);
  const fill = world.status === 'SPOTTED' ? 1 : world.threat;
  ctx.fillStyle = style.color;
  ctx.globalAlpha = 0.35;
  ctx.fillRect(x, 8, width * fill, 28);
  ctx.globalAlpha = 1;
  ctx.strokeStyle = style.color;
  ctx.lineWidth = 2;
  ctx.strokeRect(x, 8, width, 28);
  ctx.fillStyle = style.color;
  ctx.font = 'bold 15px system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(style.label, x + width / 2, 23);
  ctx.textBaseline = 'alphabetic';
}

function drawControlsBar(ctx, world) {
  const y = VIEW_H - HUD_BOTTOM;
  ctx.fillStyle = '#060912';
  ctx.fillRect(0, y, VIEW_W, HUD_BOTTOM);
  ctx.textBaseline = 'middle';
  ctx.textAlign = 'left';
  ctx.font = 'bold 15px system-ui, sans-serif';
  ctx.fillStyle = PALETTE.text;
  ctx.fillText('WASD / ARROWS move   SHIFT sneak (silent)   CLICK throw pebble   R retry   P pause', 12, y + HUD_BOTTOM / 2);
  ctx.textAlign = 'right';
  ctx.fillStyle = PALETTE.dim;
  ctx.fillText(world.level.hint, VIEW_W - 14, y + HUD_BOTTOM / 2);
  ctx.textBaseline = 'alphabetic';
}

// On the first floor, name the things a thief must read at a glance.
function drawFieldLabels(ctx, world) {
  if (world.levelIndex !== 0) return;
  const { level } = world;
  const crate = level.crates[3] || level.crates[0];
  const nook = level.nooks[1] || level.nooks[0];
  const guard = world.guards[0];
  if (crate) drawLabel(ctx, crate.col * TILE + TILE, crate.row * TILE + HUD_TOP - 6, 'COVER: crates block sight', PALETTE.crateLight);
  if (nook) drawLabel(ctx, nook.col * TILE + TILE / 2, nook.row * TILE + HUD_TOP - 6, 'SHADOW NOOK: hide here', PALETTE.nookEdge);
  if (guard) drawLabel(ctx, guard.x, guard.y + HUD_TOP + 38, 'WARDEN + VISION CONE', PALETTE.guard);
  drawLabel(ctx, level.exit.x - 20, level.exit.y + HUD_TOP + 38, 'EXIT: leave unseen', PALETTE.exitOpen);
  drawLabel(ctx, world.player.x, world.player.y + HUD_TOP + 40, 'MOTH (you)', PALETTE.player);
}

function drawLabel(ctx, x, y, text, color) {
  ctx.font = 'bold 16px system-ui, sans-serif';
  const width = ctx.measureText(text).width + 16;
  const left = Math.max(4, Math.min(VIEW_W - width - 4, x - width / 2));
  ctx.fillStyle = 'rgba(5, 7, 13, 0.9)';
  ctx.fillRect(left, y - 20, width, 26);
  ctx.strokeStyle = color;
  ctx.lineWidth = 2;
  ctx.strokeRect(left, y - 20, width, 26);
  ctx.fillStyle = color;
  ctx.textAlign = 'left';
  ctx.fillText(text, left + 8, y - 2);
}

export function formatTime(seconds) {
  const whole = Math.floor(seconds);
  return `${Math.floor(whole / 60)}:${String(whole % 60).padStart(2, '0')}`;
}
