// The heads-up display: loot, pebbles, Moth's light meter, the awareness meter, controls,
// the thief's notes panel and the floor labels of the first floor.

import { TILE, VIEW_W, VIEW_H, HUD_TOP, HUD_BOTTOM, PALETTE, PLAYER_TUNING } from './config.js';
import { hasLineOfSight } from './geometry.js';

const STATUS_STYLE = {
  UNSEEN: { color: PALETTE.good, label: 'UNSEEN' },
  HIDDEN: { color: PALETTE.playerHidden, label: 'HIDDEN IN SHADOW' },
  GLIMPSED: { color: PALETTE.warn, label: 'GLIMPSED - BREAK LINE OF SIGHT' },
  SUSPICIOUS: { color: PALETTE.warn, label: 'A WARDEN IS SUSPICIOUS' },
  SPOTTED: { color: PALETTE.bad, label: 'SPOTTED! RUN AND HIDE' },
};

const NOTES = { x: 6, y: HUD_TOP + 322, width: 322, height: 266 };

export function drawHud(ctx, world) {
  drawTopBar(ctx, world);
  drawAwarenessMeter(ctx, world);
  drawControlsBar(ctx, world);
  drawFieldLabels(ctx, world);
  if (world.showNotes && !mothUnderNotes(world)) drawThiefNotes(ctx);
}

function drawTopBar(ctx, world) {
  ctx.fillStyle = '#060912';
  ctx.fillRect(0, 0, VIEW_W, HUD_TOP);
  ctx.textBaseline = 'middle';
  ctx.textAlign = 'left';
  ctx.font = 'bold 25px Georgia, serif';
  ctx.fillStyle = PALETTE.lamp;
  ctx.fillText('HUSHLIGHT', 12, HUD_TOP / 2 + 1);
  ctx.font = '14px system-ui, sans-serif';
  ctx.fillStyle = PALETTE.dim;
  ctx.fillText(world.level.name, 198, HUD_TOP / 2 + 2);

  ctx.font = 'bold 16px system-ui, sans-serif';
  ctx.fillStyle = PALETTE.relic;
  ctx.fillText(`STAR DIALS ${world.relicsTaken}/${world.level.relics.length}`, 382, HUD_TOP / 2);
  ctx.fillStyle = PALETTE.text;
  let pebbles = '';
  for (let i = 0; i < PLAYER_TUNING.pebblesPerLevel; i++) pebbles += i < world.player.pebbles ? '●' : '○';
  ctx.fillText(`PEBBLES ${pebbles}`, 528, HUD_TOP / 2);
  const light = lightReading(world);
  ctx.font = 'bold 15px system-ui, sans-serif';
  ctx.fillStyle = light.color;
  ctx.fillText(light.label, 668, HUD_TOP / 2);
  ctx.fillStyle = PALETTE.dim;
  ctx.fillText(formatTime(world.time), 848, HUD_TOP / 2);
  ctx.textBaseline = 'alphabetic';
}

// Moth's own light meter: how visible the floor under your feet makes you.
function lightReading(world) {
  const { player, level } = world;
  if (player.hidden) return { label: 'MOTH: HIDDEN', color: PALETTE.playerHidden };
  const light = level.lightAt(player.x, player.y);
  if (light > 0.3) return { label: 'MOTH: IN LAMPLIGHT', color: PALETTE.warn };
  if (light > 0) return { label: 'MOTH: IN HALF-LIGHT', color: PALETTE.lamp };
  return { label: 'MOTH: IN THE DARK', color: PALETTE.good };
}

// One bar for the most aware warden: green unseen, amber suspicious, red spotted.
function drawAwarenessMeter(ctx, world) {
  const style = STATUS_STYLE[world.status] || STATUS_STYLE.UNSEEN;
  const x = 886;
  const width = 382;
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
  ctx.font = 'bold 16px system-ui, sans-serif';
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
  ctx.fillText('WASD / ARROWS move  ·  SHIFT sneak  ·  CLICK throw pebble  ·  E snuff lamp  ·  H notes  ·  R retry  ·  P pause', 12, y + HUD_BOTTOM / 2);
  ctx.textAlign = 'right';
  ctx.fillStyle = PALETTE.dim;
  ctx.font = '14px system-ui, sans-serif';
  ctx.fillText(world.level.hint, VIEW_W - 12, y + HUD_BOTTOM / 2);
  ctx.textBaseline = 'alphabetic';
}

function mothUnderNotes(world) {
  const { player } = world;
  return player.x < NOTES.x + NOTES.width + 14 && player.y + HUD_TOP > NOTES.y - 14;
}

// The thief's notes: every sign on the floor and what it means. H folds them away.
function drawThiefNotes(ctx) {
  const { x, y, width, height } = NOTES;
  ctx.fillStyle = 'rgba(8, 10, 20, 0.93)';
  ctx.fillRect(x, y, width, height);
  ctx.strokeStyle = PALETTE.lamp;
  ctx.lineWidth = 2;
  ctx.strokeRect(x, y, width, height);
  ctx.textAlign = 'left';
  ctx.fillStyle = PALETTE.lamp;
  ctx.font = 'bold 18px Georgia, serif';
  ctx.fillText("THIEF'S NOTES", x + 14, y + 26);
  ctx.font = '13px system-ui, sans-serif';
  ctx.fillStyle = PALETTE.dim;
  ctx.fillText('H folds them', x + width - 92, y + 25);

  const rows = [
    [drawWardenSign, 'Warden + cone: what it sees'],
    [drawHatchSign, 'Hatched: safe behind crates'],
    [drawLampSign, 'Lamplight: seen from afar'],
    [drawSnuffedSign, 'E snuffs a lamp for 14 s'],
    [drawNookSign, 'Shadow nook: stand still, vanish'],
    [drawRingSign, 'Rings: noise and warden steps'],
    [drawRouteSign, "Dotted: a warden's patrol loop"],
    [drawExitSign, 'Exit: opens with every star dial'],
  ];
  ctx.font = 'bold 16px system-ui, sans-serif';
  rows.forEach(([drawSign, text], i) => {
    const rowY = y + 54 + i * 27;
    drawSign(ctx, x + 26, rowY - 5);
    ctx.fillStyle = PALETTE.text;
    ctx.textAlign = 'left';
    ctx.fillText(text, x + 50, rowY);
  });
}

function drawWardenSign(ctx, x, y) {
  ctx.fillStyle = 'rgba(255, 232, 150, 0.6)';
  ctx.beginPath();
  ctx.moveTo(x - 4, y);
  ctx.lineTo(x + 16, y - 9);
  ctx.lineTo(x + 16, y + 9);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = PALETTE.guard;
  ctx.beginPath();
  ctx.arc(x - 6, y, 7, 0, Math.PI * 2);
  ctx.fill();
}

function drawHatchSign(ctx, x, y) {
  ctx.strokeStyle = PALETTE.nookEdge;
  ctx.lineWidth = 2;
  ctx.strokeRect(x - 11, y - 9, 22, 18);
  ctx.beginPath();
  for (let i = -6; i <= 12; i += 6) {
    ctx.moveTo(x - 11 + Math.max(0, i), y + 9 - Math.max(0, -i));
    ctx.lineTo(x - 11 + Math.min(22, i + 18), y + 9 - Math.min(18, 18 + (22 - i - 18 < 0 ? 22 - i - 18 : 0)));
  }
  ctx.stroke();
}

function drawLampSign(ctx, x, y) {
  const glow = ctx.createRadialGradient(x, y, 1, x, y, 13);
  glow.addColorStop(0, 'rgba(255, 236, 180, 1)');
  glow.addColorStop(1, 'rgba(255, 200, 110, 0.15)');
  ctx.fillStyle = glow;
  ctx.beginPath();
  ctx.arc(x, y, 13, 0, Math.PI * 2);
  ctx.fill();
}

function drawSnuffedSign(ctx, x, y) {
  ctx.fillStyle = '#39415c';
  ctx.beginPath();
  ctx.arc(x, y, 5, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = PALETTE.lamp;
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  ctx.arc(x, y, 10, -Math.PI / 2, Math.PI * 0.8);
  ctx.stroke();
}

function drawNookSign(ctx, x, y) {
  ctx.fillStyle = PALETTE.nook;
  ctx.fillRect(x - 11, y - 10, 22, 20);
  ctx.strokeStyle = PALETTE.nookEdge;
  ctx.lineWidth = 2;
  ctx.setLineDash([4, 3]);
  ctx.strokeRect(x - 11, y - 10, 22, 20);
  ctx.setLineDash([]);
}

function drawRingSign(ctx, x, y) {
  ctx.strokeStyle = PALETTE.relic;
  ctx.lineWidth = 2;
  for (const radius of [4, 10]) {
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    ctx.stroke();
  }
}

function drawRouteSign(ctx, x, y) {
  ctx.strokeStyle = PALETTE.guard;
  ctx.lineWidth = 2.5;
  ctx.setLineDash([3, 6]);
  ctx.beginPath();
  ctx.moveTo(x - 13, y);
  ctx.lineTo(x + 13, y);
  ctx.stroke();
  ctx.setLineDash([]);
}

function drawExitSign(ctx, x, y) {
  ctx.fillStyle = 'rgba(93, 255, 143, 0.3)';
  ctx.fillRect(x - 10, y - 10, 20, 20);
  ctx.strokeStyle = PALETTE.exitOpen;
  ctx.lineWidth = 2.5;
  ctx.strokeRect(x - 10, y - 10, 20, 20);
}

// On the first floor, point at the things a thief must read at a glance.
function drawFieldLabels(ctx, world) {
  if (world.levelIndex !== 0 || !world.showNotes) return;
  const { level, player } = world;
  const crate = level.crates[3] || level.crates[0];
  const nook = level.nooks[1] || level.nooks[0];
  if (crate) drawLabel(ctx, crate.col * TILE + TILE, crate.row * TILE + HUD_TOP - 8, 'COVER: crates block sight', PALETTE.crateLight);
  if (nook) drawLabel(ctx, nook.col * TILE + TILE / 2, nook.row * TILE + HUD_TOP - 8, 'SHADOW NOOK: hide here', PALETTE.nookEdge);
  drawLabel(ctx, level.exit.x - 30, level.exit.y + HUD_TOP + 50, 'EXIT: leave unseen', PALETTE.exitOpen);

  const darkLamp = level.lamps.find((lamp) => !lamp.lit);
  if (darkLamp) drawLabel(ctx, darkLamp.x, darkLamp.y + HUD_TOP - 24, `SNUFFED LAMP: dark for ${Math.ceil(darkLamp.darkSeconds)} s`, PALETTE.lamp);
  const litLamp = level.lamps.find((lamp) => lamp.lit && lamp !== darkLamp);
  if (litLamp) drawLabel(ctx, litLamp.x, litLamp.y + HUD_TOP - 24, 'LAMPLIGHT: seen from afar', PALETTE.lamp);

  const watcher = world.guards.find((guard) => Math.hypot(guard.x - player.x, guard.y - player.y) < 300 && !guard.seesPlayer && !hasLineOfSight(level, guard.x, guard.y, player.x, player.y));
  const text = player.hidden ? 'YOU: hidden in a shadow nook' : watcher ? 'YOU: unseen behind the crates' : 'YOU (Moth)';
  drawLabel(ctx, player.x, player.y + HUD_TOP + 44, text, PALETTE.relic);
}

function drawLabel(ctx, x, y, text, color) {
  ctx.font = 'bold 16px system-ui, sans-serif';
  const width = ctx.measureText(text).width + 16;
  const left = Math.max(4, Math.min(VIEW_W - width - 4, x - width / 2));
  ctx.fillStyle = 'rgba(5, 7, 13, 0.92)';
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
