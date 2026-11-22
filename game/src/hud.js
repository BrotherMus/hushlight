// The heads-up display: the objective, the awareness meter, Moth's light meter, loot and
// pebbles, the controls, the thief's notes panel and the floor labels of the first floor.

import { TILE, VIEW_W, VIEW_H, HUD_TOP, HUD_BOTTOM, PALETTE, PLAYER_TUNING } from './config.js';
import { hasLineOfSight } from './geometry.js';

const STATUS_STYLE = {
  UNSEEN: { color: PALETTE.good, label: 'UNSEEN' },
  HIDDEN: { color: PALETTE.playerHidden, label: 'HIDDEN IN SHADOW' },
  GLIMPSED: { color: PALETTE.warn, label: 'GLIMPSED: BREAK LINE OF SIGHT' },
  SUSPICIOUS: { color: PALETTE.warn, label: 'A WARDEN IS SUSPICIOUS' },
  SPOTTED: { color: PALETTE.bad, label: 'SPOTTED! RUN AND HIDE' },
};

const NOTES = { x: 6, y: HUD_TOP + 312, width: 348, height: 290 };

export function drawHud(ctx, world) {
  drawTopBar(ctx, world);
  drawAwarenessMeter(ctx, world);
  drawStatColumns(ctx, world);
  drawControlsBar(ctx, world);
  drawFieldLabels(ctx, world);
  if (world.showNotes && !mothUnderNotes(world)) drawThiefNotes(ctx);
}

// Left: the game and floor. Centre: what to do right now.
function drawTopBar(ctx, world) {
  ctx.fillStyle = '#060912';
  ctx.fillRect(0, 0, VIEW_W, HUD_TOP);
  ctx.fillStyle = PALETTE.lamp;
  ctx.fillRect(0, HUD_TOP - 2, VIEW_W, 2);
  ctx.textAlign = 'left';
  ctx.font = 'bold 38px Georgia, serif';
  ctx.fillText('HUSHLIGHT', 14, 44);
  ctx.font = 'bold 16px system-ui, sans-serif';
  ctx.fillStyle = PALETTE.dim;
  ctx.fillText(world.level.name.toUpperCase(), 16, 72);

  ctx.textAlign = 'center';
  ctx.font = 'bold 21px system-ui, sans-serif';
  ctx.fillStyle = PALETTE.text;
  const objective = world.exitOpen ? 'EVERY DIAL TAKEN: REACH THE EXIT, UNSEEN' : 'STEAL THE STAR DIALS, THEN ESCAPE UNSEEN';
  ctx.fillText(objective, 618, 30);
}

// One bar for the most aware warden: green unseen, amber suspicious, red spotted.
function drawAwarenessMeter(ctx, world) {
  const style = STATUS_STYLE[world.status] || STATUS_STYLE.UNSEEN;
  const x = 398;
  const y = 44;
  const width = 440;
  const height = 32;
  ctx.fillStyle = '#141a2e';
  ctx.fillRect(x, y, width, height);
  const fill = world.status === 'SPOTTED' ? 1 : world.threat;
  ctx.fillStyle = style.color;
  ctx.globalAlpha = 0.38;
  ctx.fillRect(x, y, width * fill, height);
  ctx.globalAlpha = 1;
  ctx.strokeStyle = style.color;
  ctx.lineWidth = 2.5;
  ctx.strokeRect(x, y, width, height);
  ctx.fillStyle = style.color;
  ctx.font = 'bold 20px system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(style.label, x + width / 2, y + 23);
}

// Right: four readings, each a value over its name.
function drawStatColumns(ctx, world) {
  const light = lightReading(world);
  let pebbles = '';
  for (let i = 0; i < PLAYER_TUNING.pebblesPerLevel; i++) pebbles += i < world.player.pebbles ? '●' : '○';
  const columns = [
    [928, light.label, 'VISIBILITY', light.color],
    [1056, pebbles, 'PEBBLES', PALETTE.text],
    [1150, `${world.relicsTaken}/${world.level.relics.length}`, 'STAR DIALS', PALETTE.relic],
    [1236, formatTime(world.time), 'TIME', PALETTE.text],
  ];
  ctx.textAlign = 'center';
  for (const [x, value, name, color] of columns) {
    ctx.font = 'bold 22px system-ui, sans-serif';
    ctx.fillStyle = color;
    ctx.fillText(value, x, 42);
    ctx.font = 'bold 13px system-ui, sans-serif';
    ctx.fillStyle = PALETTE.dim;
    ctx.fillText(name, x, 66);
  }
}

// Moth's own light meter: how visible the floor under your feet makes you.
function lightReading(world) {
  const { player, level } = world;
  if (player.hidden) return { label: 'HIDDEN', color: PALETTE.playerHidden };
  const light = level.lightAt(player.x, player.y);
  if (light > 0.3) return { label: 'LAMPLIT', color: PALETTE.warn };
  if (light > 0) return { label: 'HALF-LIT', color: PALETTE.lamp };
  return { label: 'IN DARK', color: PALETTE.good };
}

function drawControlsBar(ctx, world) {
  const y = VIEW_H - HUD_BOTTOM;
  ctx.fillStyle = '#060912';
  ctx.fillRect(0, y, VIEW_W, HUD_BOTTOM);
  ctx.fillStyle = PALETTE.lamp;
  ctx.fillRect(0, y, VIEW_W, 2);
  ctx.textAlign = 'center';
  ctx.font = 'bold 19px system-ui, sans-serif';
  ctx.fillStyle = PALETTE.text;
  ctx.fillText('WASD / ARROWS move  ·  SHIFT sneak  ·  CLICK throw pebble  ·  E snuff lamp  ·  H notes  ·  R retry  ·  P pause', VIEW_W / 2, y + 30);
  ctx.fillStyle = PALETTE.dim;
  ctx.font = 'italic 17px Georgia, serif';
  ctx.fillText(world.level.hint, VIEW_W / 2, y + 57);
}

function mothUnderNotes(world) {
  const { player } = world;
  return player.x < NOTES.x + NOTES.width + 14 && player.y + HUD_TOP > NOTES.y - 14;
}

// The thief's notes: every sign on the floor and what it means. H folds them away.
function drawThiefNotes(ctx) {
  const { x, y, width, height } = NOTES;
  ctx.fillStyle = 'rgba(8, 10, 20, 0.94)';
  ctx.fillRect(x, y, width, height);
  ctx.strokeStyle = PALETTE.lamp;
  ctx.lineWidth = 2.5;
  ctx.strokeRect(x, y, width, height);
  ctx.textAlign = 'left';
  ctx.fillStyle = PALETTE.lamp;
  ctx.font = 'bold 21px Georgia, serif';
  ctx.fillText("THIEF'S NOTES", x + 14, y + 30);
  ctx.font = '14px system-ui, sans-serif';
  ctx.fillStyle = PALETTE.dim;
  ctx.fillText('H folds them', x + width - 98, y + 28);

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
  ctx.font = 'bold 18px system-ui, sans-serif';
  rows.forEach(([drawSign, text], i) => {
    const rowY = y + 62 + i * 29;
    drawSign(ctx, x + 28, rowY - 6);
    ctx.fillStyle = PALETTE.text;
    ctx.textAlign = 'left';
    ctx.fillText(text, x + 54, rowY);
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
  ctx.save();
  ctx.beginPath();
  ctx.rect(x - 11, y - 9, 22, 18);
  ctx.clip();
  ctx.fillStyle = 'rgba(63, 214, 194, 0.2)';
  ctx.fillRect(x - 11, y - 9, 22, 18);
  ctx.strokeStyle = PALETTE.nookEdge;
  ctx.lineWidth = 2;
  ctx.beginPath();
  for (let offset = -18; offset <= 22; offset += 7) {
    ctx.moveTo(x - 11 + offset, y + 9);
    ctx.lineTo(x - 11 + offset + 18, y - 9);
  }
  ctx.stroke();
  ctx.restore();
  ctx.strokeStyle = PALETTE.nookEdge;
  ctx.lineWidth = 2;
  ctx.strokeRect(x - 11, y - 9, 22, 18);
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
  if (crate) drawLabel(ctx, crate.col * TILE + TILE, crate.row * TILE + HUD_TOP - 10, 'COVER: crates block sight', PALETTE.crateLight);
  if (nook) drawLabel(ctx, nook.col * TILE + TILE / 2, nook.row * TILE + HUD_TOP - 10, 'SHADOW NOOK: hide here', PALETTE.nookEdge);
  drawLabel(ctx, level.exit.x - 40, level.exit.y + HUD_TOP + 54, 'EXIT: leave unseen', PALETTE.exitOpen);

  const darkLamp = level.lamps.find((lamp) => !lamp.lit);
  if (darkLamp) drawLabel(ctx, darkLamp.x, darkLamp.y + HUD_TOP - 26, `SNUFFED LAMP: dark for ${Math.ceil(darkLamp.darkSeconds)} s`, PALETTE.lamp);
  const litLamp = level.lamps.find((lamp) => lamp.lit && lamp !== darkLamp);
  if (litLamp) drawLabel(ctx, litLamp.x, litLamp.y + HUD_TOP - 26, 'LAMPLIGHT: seen from afar', PALETTE.lamp);

  const watcher = world.guards.find((guard) => Math.hypot(guard.x - player.x, guard.y - player.y) < 300 && !guard.seesPlayer && !hasLineOfSight(level, guard.x, guard.y, player.x, player.y));
  const text = player.hidden ? 'YOU: hidden in a shadow nook' : watcher ? 'YOU: unseen behind the crates' : 'YOU (Moth)';
  drawLabel(ctx, player.x, player.y + HUD_TOP + 48, text, PALETTE.relic);
}

function drawLabel(ctx, x, y, text, color) {
  ctx.font = 'bold 18px system-ui, sans-serif';
  const width = ctx.measureText(text).width + 18;
  const left = Math.max(4, Math.min(VIEW_W - width - 4, x - width / 2));
  ctx.fillStyle = 'rgba(5, 7, 13, 0.92)';
  ctx.fillRect(left, y - 22, width, 30);
  ctx.strokeStyle = color;
  ctx.lineWidth = 2;
  ctx.strokeRect(left, y - 22, width, 30);
  ctx.fillStyle = color;
  ctx.textAlign = 'left';
  ctx.fillText(text, left + 9, y - 1);
}

export function formatTime(seconds) {
  const whole = Math.floor(seconds);
  return `${Math.floor(whole / 60)}:${String(whole % 60).padStart(2, '0')}`;
}
