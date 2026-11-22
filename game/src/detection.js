// The detection system: each warden's awareness fills while it has Moth in its cone and
// drains when it loses sight, so a glimpse is a warning you can still walk away from.

import { GUARD_TUNING } from './config.js';
import { distance } from './geometry.js';
import { sightStrength } from './vision.js';
import { startChasing, startInvestigating } from './guards.js';
import { addFloatingText } from './effects.js';
import { playAlarm, playSuspicionSting } from './sound.js';

export function updateDetection(world, dt) {
  const { level, player } = world;
  let highest = 0;
  let chasing = false;
  let hunting = false;

  for (const guard of world.guards) {
    const strength = sightStrength(level, guard, player);
    const before = guard.awareness;
    guard.seesPlayer = strength > 0;

    if (strength > 0) {
      const urgency = guard.state === 'chase' ? 3 : guard.state === 'patrol' ? 1 : 1.5;
      guard.awareness = Math.min(1, before + strength * GUARD_TUNING.awarenessFillRate * urgency * dt);
    } else {
      const calm = guard.state === 'chase' ? 0.5 : 1;
      guard.awareness = Math.max(0, before - GUARD_TUNING.awarenessDecayRate * calm * dt);
    }
    guard.peakAwareness = Math.max(guard.peakAwareness, guard.awareness);

    if (guard.state !== 'chase') {
      if (guard.awareness >= 1) raiseAlarm(world, guard);
      else if (before < GUARD_TUNING.suspiciousAt && guard.awareness >= GUARD_TUNING.suspiciousAt) {
        world.stats.closeCalls += 1;
        playSuspicionSting();
        startInvestigating(guard, player.x, player.y, world);
      } else if (strength > 0 && guard.state === 'investigate') {
        guard.target = { x: player.x, y: player.y };
      }
    }
    if (guard.awareness === 0 && before > 0) {
      if (guard.peakAwareness > 0.12 && guard.peakAwareness < GUARD_TUNING.suspiciousAt) {
        world.stats.nearMisses += 1;
        addFloatingText(world, player.x, player.y - 24, 'near miss', '#3fd6c2', 1.3);
      }
      guard.peakAwareness = 0;
    }

    highest = Math.max(highest, guard.awareness);
    if (guard.state === 'chase') chasing = true;
    if (guard.state === 'investigate' || guard.state === 'search') hunting = true;
  }

  world.threat = highest;
  world.alarmTimer = Math.max(0, world.alarmTimer - dt);
  if (chasing) world.status = 'SPOTTED';
  else if (highest >= GUARD_TUNING.suspiciousAt || hunting) world.status = 'SUSPICIOUS';
  else if (highest > 0.05) world.status = 'GLIMPSED';
  else world.status = player.hidden ? 'HIDDEN' : 'UNSEEN';
}

// One warden is sure: it gives chase and shouts, and wardens in earshot come to look.
function raiseAlarm(world, guard) {
  const { player } = world;
  startChasing(guard, world);
  world.stats.timesSpotted += 1;
  world.alarmTimer = 2.5;
  playAlarm();
  for (const other of world.guards) {
    if (other === guard || other.state === 'chase') continue;
    if (distance(other.x, other.y, guard.x, guard.y) <= GUARD_TUNING.shoutRadius) {
      startInvestigating(other, player.x, player.y, world);
    }
  }
}
