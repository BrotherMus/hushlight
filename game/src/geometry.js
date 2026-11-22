// Small maths helpers shared by sight, movement and drawing.

export function clamp(value, low, high) {
  return value < low ? low : value > high ? high : value;
}

export function distance(ax, ay, bx, by) {
  return Math.hypot(bx - ax, by - ay);
}

// Signed shortest turn from angle a to angle b, in -PI..PI.
export function angleDifference(a, b) {
  let d = (b - a) % (Math.PI * 2);
  if (d > Math.PI) d -= Math.PI * 2;
  if (d < -Math.PI) d += Math.PI * 2;
  return d;
}

export function turnToward(current, target, maxStep) {
  const d = angleDifference(current, target);
  if (Math.abs(d) <= maxStep) return target;
  return current + Math.sign(d) * maxStep;
}

// March a ray through the level until something blocks sight; returns the free distance.
export function castRay(level, x, y, angle, maxDistance) {
  const stepSize = 4;
  const dx = Math.cos(angle) * stepSize;
  const dy = Math.sin(angle) * stepSize;
  let px = x;
  let py = y;
  for (let travelled = 0; travelled < maxDistance; travelled += stepSize) {
    px += dx;
    py += dy;
    if (level.blocksSightAt(px, py)) return travelled;
  }
  return maxDistance;
}

export function hasLineOfSight(level, ax, ay, bx, by) {
  const total = distance(ax, ay, bx, by);
  if (total < 1) return true;
  const angle = Math.atan2(by - ay, bx - ax);
  return castRay(level, ax, ay, angle, total) >= total - 4;
}
