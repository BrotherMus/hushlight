// Noise travels: a running footstep or a thrown pebble draws every warden in earshot.

import { addRing } from './effects.js';
import { hearNoise } from './guards.js';

const RING_COLORS = { step: '244, 241, 232', pebble: '127, 233, 255' };

export function emitNoise(world, x, y, radius, kind) {
  addRing(world, x, y, radius, RING_COLORS[kind] || RING_COLORS.step, kind === 'pebble' ? 0.9 : 0.5);
  for (const guard of world.guards) hearNoise(guard, x, y, radius, world);
}
