// Moth, the thief: walk (heard), sneak (silent), hide in shadow nooks, throw pebbles.

import { HUD_TOP, PLAYER_TUNING } from './config.js';
import { castRay, distance } from './geometry.js';
import { isSneaking, moveAxis } from './input.js';
import { emitNoise } from './noise.js';
import { snuffLampNear } from './level.js';
import { addFloatingText, addRing } from './effects.js';
import { playPebbleClack, playPlayerFootstep } from './sound.js';

export function createPlayer(level) {
  return {
    x: level.start.x,
    y: level.start.y,
    facing: 0,
    moving: false,
    sneaking: false,
    hidden: false,
    stepTimer: 0.15,
    pebbles: PLAYER_TUNING.pebblesPerLevel,
    pebbleCooldown: 0,
    pebbleInFlight: null,
  };
}

export function updatePlayer(player, input, dt, world) {
  const { level } = world;
  const axis = moveAxis(input);
  player.sneaking = isSneaking(input);
  player.moving = axis.moving;
  const speed = player.sneaking ? PLAYER_TUNING.sneakSpeed : PLAYER_TUNING.walkSpeed;

  const nextX = player.x + axis.x * speed * dt;
  if (!level.bodyCollides(nextX, player.y, PLAYER_TUNING.radius)) player.x = nextX;
  const nextY = player.y + axis.y * speed * dt;
  if (!level.bodyCollides(player.x, nextY, PLAYER_TUNING.radius)) player.y = nextY;
  if (axis.moving) player.facing = Math.atan2(axis.y, axis.x);

  // A nook hides you only while you are still or creeping.
  player.hidden = level.isNookAt(player.x, player.y) && (!player.moving || player.sneaking);

  if (input.tapped.has('KeyE') || input.tapped.has('Space')) snuffLamp(player, world);
  makeFootstepNoise(player, dt, world);
  player.pebbleCooldown = Math.max(0, player.pebbleCooldown - dt);
  for (const click of input.clicks) throwPebble(player, click.x, click.y - HUD_TOP, world);
  flyPebble(player, dt, world);
}

// E: pinch out the lamp beside you. Its pool goes dark, and so does your way through it.
export function snuffLamp(player, world) {
  const lamp = snuffLampNear(world.level, player.x, player.y);
  if (!lamp) return false;
  world.stats.lampsSnuffed += 1;
  addRing(world, lamp.x, lamp.y, 60, '255, 217, 138', 0.5);
  addFloatingText(world, lamp.x, lamp.y - 18, 'lamp snuffed', '#ffd98a', 1.5);
  return true;
}

function makeFootstepNoise(player, dt, world) {
  if (!player.moving || player.sneaking) {
    player.stepTimer = 0.15;
    return;
  }
  player.stepTimer -= dt;
  if (player.stepTimer > 0) return;
  player.stepTimer = PLAYER_TUNING.stepInterval;
  emitNoise(world, player.x, player.y, PLAYER_TUNING.stepNoiseRadius, 'step');
  playPlayerFootstep();
}

// Where a pebble thrown toward (x, y) would land: short of walls, within arm's reach.
export function pebbleLanding(player, x, y, level) {
  const angle = Math.atan2(y - player.y, x - player.x);
  const wanted = Math.min(distance(player.x, player.y, x, y), PLAYER_TUNING.pebbleRange);
  const reach = Math.max(0, castRay(level, player.x, player.y, angle, wanted) - 6);
  return { x: player.x + Math.cos(angle) * reach, y: player.y + Math.sin(angle) * reach };
}

export function throwPebble(player, x, y, world) {
  if (player.pebbles <= 0 || player.pebbleCooldown > 0 || player.pebbleInFlight) return false;
  const landing = pebbleLanding(player, x, y, world.level);
  player.pebbleInFlight = { fromX: player.x, fromY: player.y, toX: landing.x, toY: landing.y, progress: 0 };
  player.pebbles -= 1;
  player.pebbleCooldown = PLAYER_TUNING.pebbleCooldown;
  world.stats.pebblesThrown += 1;
  return true;
}

function flyPebble(player, dt, world) {
  const pebble = player.pebbleInFlight;
  if (!pebble) return;
  pebble.progress += dt / PLAYER_TUNING.pebbleFlightTime;
  if (pebble.progress < 1) return;
  player.pebbleInFlight = null;
  emitNoise(world, pebble.toX, pebble.toY, PLAYER_TUNING.pebbleNoiseRadius, 'pebble');
  playPebbleClack();
}
