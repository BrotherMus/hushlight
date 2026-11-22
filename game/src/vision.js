// What a warden can see: a cone clipped by walls and crates, shorter over dark floor.

import { GUARD_TUNING } from './config.js';
import { angleDifference, castRay, distance, hasLineOfSight } from './geometry.js';

const CONE_RAYS = 36;

// The outline of the cone as the walls cut it, for drawing.
export function buildConePolygon(level, guard) {
  const points = [{ x: guard.x, y: guard.y }];
  const half = GUARD_TUNING.fieldOfView / 2;
  for (let i = 0; i <= CONE_RAYS; i++) {
    const angle = guard.heading - half + (GUARD_TUNING.fieldOfView * i) / CONE_RAYS;
    const reach = castRay(level, guard.x, guard.y, angle, GUARD_TUNING.sightRange);
    points.push({ x: guard.x + Math.cos(angle) * reach, y: guard.y + Math.sin(angle) * reach });
  }
  return points;
}

// The safe shadows behind cover: for each ray a crate stops, the stretch of floor from the
// far side of the crate to the next wall (or the cone's end) that the warden cannot see.
export function buildCoverShadows(level, guard) {
  const half = GUARD_TUNING.fieldOfView / 2;
  const range = GUARD_TUNING.sightRange;
  const slices = [];
  for (let i = 0; i <= CONE_RAYS; i++) {
    const angle = guard.heading - half + (GUARD_TUNING.fieldOfView * i) / CONE_RAYS;
    const cos = Math.cos(angle);
    const sin = Math.sin(angle);
    let d = castRay(level, guard.x, guard.y, angle, range) + 4;
    const tileAt = (dist) => level.tileAtPoint(guard.x + cos * dist, guard.y + sin * dist);
    if (d >= range || tileAt(d) !== 'c') {
      slices.push(null);
      continue;
    }
    while (d < range && tileAt(d) === 'c') d += 4;
    const from = d;
    while (d < range && tileAt(d) !== '#') d += 4;
    slices.push(d - from < 8 ? null : {
      nearX: guard.x + cos * from, nearY: guard.y + sin * from,
      farX: guard.x + cos * d, farY: guard.y + sin * d,
    });
  }
  return slices;
}

// How far this warden can make Moth out where Moth stands now.
export function sightRangeFor(level, player) {
  const light = level.lightAt(player.x, player.y);
  const factor = GUARD_TUNING.darkSightFactor + (1 - GUARD_TUNING.darkSightFactor) * Math.min(1, light * 1.6);
  return GUARD_TUNING.sightRange * factor;
}

// Returns 0 when Moth is unseen, else 0.3..1: stronger the closer Moth is.
export function sightStrength(level, guard, player) {
  const d = distance(guard.x, guard.y, player.x, player.y);
  if (player.hidden && d > GUARD_TUNING.nookRevealDistance) return 0;
  const range = sightRangeFor(level, player);
  if (d > range) return 0;
  const toPlayer = Math.atan2(player.y - guard.y, player.x - guard.x);
  const off = Math.abs(angleDifference(guard.heading, toPlayer));
  if (off > GUARD_TUNING.fieldOfView / 2 && d > GUARD_TUNING.radius + 14) return 0;
  if (!hasLineOfSight(level, guard.x, guard.y, player.x, player.y)) return 0;
  return 0.3 + 0.7 * (1 - d / range);
}
