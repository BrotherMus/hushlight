// Warden AI. A warden patrols its loop, investigates what it half-saw or heard,
// chases when sure, searches where it lost you, then gives up and walks back.

import { GUARD_TUNING } from './config.js';
import { findPath, tileCenter } from './level.js';
import { distance, turnToward, hasLineOfSight } from './geometry.js';
import { addRing, addFloatingText } from './effects.js';
import { playGuardFootstep } from './sound.js';

export function createGuards(level) {
  return level.guardRoutes.map((definition, id) => {
    const stops = definition.route.map(([col, row]) => tileCenter(col, row));
    const first = stops[0];
    const second = stops[1 % stops.length];
    return {
      id,
      x: first.x,
      y: first.y,
      heading: Math.atan2(second.y - first.y, second.x - first.x),
      stops,
      stopIndex: 1 % stops.length,
      pauseSeconds: definition.pause,
      state: 'patrol',
      path: [],
      waitTimer: 0,
      lookCenter: 0,
      noticeTimer: 0,
      searchTimer: 0,
      repathTimer: 0,
      target: null,
      lastSeen: null,
      awareness: 0,
      peakAwareness: 0,
      seesPlayer: false,
      strideLeft: GUARD_TUNING.strideLength,
      clock: id * 1.7,
    };
  });
}

export function updateGuard(guard, dt, world) {
  guard.clock += dt;
  if (guard.state === 'patrol') patrolRoute(guard, dt, world);
  else if (guard.state === 'investigate') investigateTarget(guard, dt, world);
  else if (guard.state === 'chase') chasePlayer(guard, dt, world);
  else if (guard.state === 'search') searchAround(guard, dt, world);
}

// A noise or a glimpse: stop, turn to it, then walk over for a look.
export function startInvestigating(guard, x, y, world) {
  if (guard.state === 'chase') return;
  if (guard.state !== 'investigate') addFloatingText(world, guard.x, guard.y - 26, '?', '#ffb428', 1.2);
  guard.state = 'investigate';
  guard.target = { x, y };
  guard.noticeTimer = 0.55;
  guard.path = null;
}

export function startChasing(guard, world) {
  guard.state = 'chase';
  guard.repathTimer = 0;
  guard.lastSeen = { x: world.player.x, y: world.player.y };
  addFloatingText(world, guard.x, guard.y - 26, '!', '#ff4d4d', 1.4);
}

// Walls muffle sound: a noise carries less far without a clear line to the warden.
export function hearNoise(guard, x, y, radius, world) {
  if (guard.state === 'chase') return;
  const clear = hasLineOfSight(world.level, x, y, guard.x, guard.y);
  const reach = clear ? radius : radius * 0.65;
  if (distance(guard.x, guard.y, x, y) <= reach) startInvestigating(guard, x, y, world);
}

function patrolRoute(guard, dt, world) {
  if (guard.waitTimer > 0) {
    guard.waitTimer -= dt;
    lookAround(guard, dt, 0.75);
    return;
  }
  if (!guard.path || guard.path.length === 0) {
    const stop = guard.stops[guard.stopIndex];
    guard.path = findPath(world.level, guard.x, guard.y, stop.x, stop.y);
    if (guard.path.length === 0) {
      arriveAtStop(guard);
      return;
    }
  }
  if (walkAlongPath(guard, GUARD_TUNING.patrolSpeed, dt, world)) arriveAtStop(guard);
}

function arriveAtStop(guard) {
  guard.stopIndex = (guard.stopIndex + 1) % guard.stops.length;
  guard.waitTimer = guard.pauseSeconds;
  guard.lookCenter = guard.heading;
}

function investigateTarget(guard, dt, world) {
  const target = guard.target;
  if (guard.noticeTimer > 0) {
    guard.noticeTimer -= dt;
    faceToward(guard, target.x, target.y, dt, 2);
    return;
  }
  if (!guard.path) guard.path = findPath(world.level, guard.x, guard.y, target.x, target.y);
  if (walkAlongPath(guard, GUARD_TUNING.investigateSpeed, dt, world)) beginSearch(guard, GUARD_TUNING.lookSeconds * 2);
}

function chasePlayer(guard, dt, world) {
  const player = world.player;
  if (guard.seesPlayer) guard.lastSeen = { x: player.x, y: player.y };
  const goal = guard.lastSeen;
  guard.repathTimer -= dt;
  if (guard.repathTimer <= 0) {
    guard.path = findPath(world.level, guard.x, guard.y, goal.x, goal.y);
    guard.repathTimer = 0.25;
  }
  const near = distance(guard.x, guard.y, player.x, player.y);
  if (guard.seesPlayer && near < 70) guard.path = [{ x: player.x, y: player.y }];
  const arrived = walkAlongPath(guard, GUARD_TUNING.chaseSpeed, dt, world);
  if (arrived && !guard.seesPlayer) beginSearch(guard, GUARD_TUNING.searchSeconds);
}

function beginSearch(guard, seconds) {
  guard.state = 'search';
  guard.searchTimer = seconds;
  guard.lookCenter = guard.heading;
  guard.path = [];
}

function searchAround(guard, dt, world) {
  guard.searchTimer -= dt;
  lookAround(guard, dt, 1.5);
  if (guard.searchTimer > 0) return;
  guard.state = 'patrol';
  guard.path = [];
  guard.waitTimer = 0;
  guard.awareness = 0;
  addFloatingText(world, guard.x, guard.y - 26, '...', '#93a0c8', 1.2);
}

// Sweep the cone left and right of where the warden was facing.
function lookAround(guard, dt, sweep) {
  const wanted = guard.lookCenter + Math.sin(guard.clock * 1.9) * sweep;
  guard.heading = turnToward(guard.heading, wanted, GUARD_TUNING.turnRate * dt);
}

function faceToward(guard, x, y, dt, urgency) {
  const wanted = Math.atan2(y - guard.y, x - guard.x);
  guard.heading = turnToward(guard.heading, wanted, GUARD_TUNING.turnRate * urgency * dt);
}

// Moves toward the next point of the path; true once the path is walked.
function walkAlongPath(guard, speed, dt, world) {
  const next = guard.path[0];
  if (!next) return true;
  const gap = distance(guard.x, guard.y, next.x, next.y);
  const step = speed * dt;
  if (gap > 1) faceToward(guard, next.x, next.y, dt, speed > 100 ? 2.4 : 1.2);
  if (gap <= step) {
    guard.x = next.x;
    guard.y = next.y;
    guard.path.shift();
  } else {
    guard.x += ((next.x - guard.x) / gap) * step;
    guard.y += ((next.y - guard.y) / gap) * step;
  }
  leaveFootstep(guard, Math.min(step, gap), world);
  return guard.path.length === 0;
}

// Every stride leaves a ring on the floor and a boot-fall in your ears.
function leaveFootstep(guard, moved, world) {
  guard.strideLeft -= moved;
  if (guard.strideLeft > 0) return;
  guard.strideLeft = GUARD_TUNING.strideLength;
  addRing(world, guard.x, guard.y, 20, '255, 157, 60', 0.6);
  const player = world.player;
  playGuardFootstep(guard.x - player.x, distance(guard.x, guard.y, player.x, player.y));
}
