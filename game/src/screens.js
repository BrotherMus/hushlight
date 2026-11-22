// Full-screen panels drawn over the floor: title, pause, caught, floor cleared, victory.

import { VIEW_W, VIEW_H, PALETTE } from './config.js';
import { formatTime } from './hud.js';
import { rankFor } from './world.js';

function dimFloor(ctx, alpha) {
  ctx.fillStyle = `rgba(4, 6, 12, ${alpha})`;
  ctx.fillRect(0, 0, VIEW_W, VIEW_H);
}

function centered(ctx, text, y, size, color, weight = 'bold') {
  ctx.font = `${weight} ${size}px system-ui, sans-serif`;
  ctx.textAlign = 'center';
  ctx.fillStyle = color;
  // Panels were laid out for a 720-tall view; keep them centred on the taller one.
  ctx.fillText(text, VIEW_W / 2, y + (VIEW_H - 720) / 2);
}

export function drawTitleScreen(ctx, time) {
  dimFloor(ctx, 0.72);
  ctx.save();
  ctx.shadowColor = PALETTE.lamp;
  ctx.shadowBlur = 30;
  centered(ctx, 'HUSHLIGHT', 220, 120, PALETTE.lamp);
  ctx.restore();
  centered(ctx, 'A top-down stealth heist in Orrery House', 280, 30, PALETTE.text);
  centered(ctx, 'Wardens see in cones. Light betrays you. Crates and shadow nooks hide you.', 345, 22, PALETTE.dim, 'normal');
  centered(ctx, 'Steal every star dial, then reach the EXIT unseen.', 380, 22, PALETTE.dim, 'normal');
  centered(ctx, 'WASD move  ·  SHIFT sneak  ·  CLICK throw a pebble  ·  E snuff a lamp', 445, 24, PALETTE.relic);
  if (Math.sin(time * 4) > -0.4) centered(ctx, 'PRESS ENTER OR CLICK TO BEGIN', 540, 40, PALETTE.good);
  centered(ctx, '3 floors  ·  learnable patrols  ·  awareness meter  ·  GHOST rank for a perfect run', 610, 20, PALETTE.dim, 'normal');
}

export function drawPauseScreen(ctx) {
  dimFloor(ctx, 0.6);
  centered(ctx, 'PAUSED', 340, 90, PALETTE.text);
  centered(ctx, 'Press P to resume', 410, 30, PALETTE.dim);
}

export function drawCaughtScreen(ctx, world) {
  dimFloor(ctx, 0.7);
  centered(ctx, 'CAUGHT', 300, 130, PALETTE.bad);
  centered(ctx, `A warden grabbed Moth on ${world.level.name}.`, 370, 30, PALETTE.text);
  centered(ctx, 'Tip: break line of sight behind crates, then wait in a shadow nook.', 420, 24, PALETTE.dim, 'normal');
  centered(ctx, 'PRESS R OR ENTER TO RETRY', 520, 40, PALETTE.warn);
}

export function drawClearedScreen(ctx, world, isLastFloor) {
  dimFloor(ctx, 0.72);
  const { stats } = world;
  const rank = rankFor(stats);
  centered(ctx, isLastFloor ? 'HEIST COMPLETE' : 'FLOOR CLEARED', 200, 100, PALETTE.good);
  centered(ctx, `RANK: ${rank}`, 290, 64, rank === 'GHOST' ? PALETTE.relic : PALETTE.lamp);
  centered(ctx, `Time ${formatTime(world.time)}   ·   Times spotted ${stats.timesSpotted}   ·   Close calls ${stats.closeCalls}`, 360, 28, PALETTE.text);
  centered(ctx, `Near misses ${stats.nearMisses}   ·   Pebbles ${stats.pebblesThrown}   ·   Lamps snuffed ${stats.lampsSnuffed}   ·   Star dials ${world.relicsTaken}/${world.level.relics.length}`, 405, 26, PALETTE.dim, 'normal');
  centered(ctx, 'GHOST: never suspected   SHADOW: never chased   SURVIVOR: chased and escaped', 465, 20, PALETTE.dim, 'normal');
  centered(ctx, isLastFloor ? 'Moth vanishes into the night. PRESS ENTER TO PLAY AGAIN' : 'PRESS ENTER FOR THE NEXT FLOOR', 550, 38, PALETTE.warn);
}
