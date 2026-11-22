// One floor in play: Moth, the wardens, the loot, and the rules for winning and losing.

import { GUARD_TUNING } from './config.js';
import { LEVELS } from './levels.js';
import { buildLevel } from './level.js';
import { distance } from './geometry.js';
import { createPlayer, updatePlayer } from './player.js';
import { createGuards, updateGuard } from './guards.js';
import { updateDetection } from './detection.js';
import { addFloatingText, addRing, updateEffects } from './effects.js';
import { playCaughtThud, playEscapeFanfare, playRelicChime } from './sound.js';

export function createWorld(levelIndex) {
  const level = buildLevel(LEVELS[levelIndex]);
  return {
    levelIndex,
    level,
    player: createPlayer(level),
    guards: createGuards(level),
    rings: [],
    floatingTexts: [],
    time: 0,
    threat: 0,
    status: 'UNSEEN',
    alarmTimer: 0,
    relicsTaken: 0,
    exitOpen: false,
    outcome: null,
    stats: { timesSpotted: 0, closeCalls: 0, nearMisses: 0, pebblesThrown: 0 },
  };
}

// Advances the floor by dt seconds; sets world.outcome to 'escaped' or 'caught' when it ends.
export function stepWorld(world, input, dt) {
  if (world.outcome) return;
  world.time += dt;
  updatePlayer(world.player, input, dt, world);
  for (const guard of world.guards) updateGuard(guard, dt, world);
  updateDetection(world, dt);
  collectRelics(world);
  checkExit(world);
  checkCaught(world);
  updateEffects(world, dt);
}

function collectRelics(world) {
  const { player, level } = world;
  for (const relic of level.relics) {
    if (relic.taken || distance(player.x, player.y, relic.x, relic.y) > 20) continue;
    relic.taken = true;
    world.relicsTaken += 1;
    playRelicChime();
    addRing(world, relic.x, relic.y, 40, '127, 233, 255', 0.6);
    const left = level.relics.length - world.relicsTaken;
    addFloatingText(world, relic.x, relic.y - 20, left ? `star dial! ${left} to go` : 'EXIT UNLOCKED', '#7fe9ff', 1.8);
  }
  world.exitOpen = world.relicsTaken >= level.relics.length;
}

function checkExit(world) {
  const { player, level } = world;
  if (!world.exitOpen || distance(player.x, player.y, level.exit.x, level.exit.y) > 22) return;
  world.outcome = 'escaped';
  playEscapeFanfare();
}

function checkCaught(world) {
  const { player } = world;
  for (const guard of world.guards) {
    if (guard.state !== 'chase') continue;
    if (distance(guard.x, guard.y, player.x, player.y) > GUARD_TUNING.catchDistance) continue;
    world.outcome = 'caught';
    playCaughtThud();
    return;
  }
}

// GHOST: never even suspected. SHADOW: suspected, never chased. SURVIVOR: chased and escaped.
export function rankFor(stats) {
  if (stats.timesSpotted === 0 && stats.closeCalls === 0) return 'GHOST';
  if (stats.timesSpotted === 0) return 'SHADOW';
  return 'SURVIVOR';
}

export function totalLevels() {
  return LEVELS.length;
}
