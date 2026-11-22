// Screenshot poses. ?shot=<name> plays a short scripted scene through the real game
// (same floors, wardens, detection and drawing) and then freezes the frame for the camera.

import { TILE } from './config.js';
import { createWorld, stepWorld } from './world.js';
import { throwPebble } from './player.js';

const tilePoint = (col, row) => ({ x: col * TILE + TILE / 2, y: row * TILE + TILE / 2 });

// Each step: ['wait', seconds, heldKeys?] | ['place', col, row] | ['take', relicIndex]
//          | ['pebble', col, row] | ['mouse', col, row]
const SCENES = {
  cover: {
    floor: 0,
    // A pebble through the doorway lures one warden; Moth is glimpsed, then ducks behind crates.
    steps: [
      ['wait', 7],
      ['take', 0],
      ['place', 25, 6],
      ['pebble', 26, 8],
      ['wait', 1.6],
      ['place', 16, 6],
      ['wait', 0.35],
      ['place', 20, 4],
      ['wait', 0.3, ['ShiftLeft']],
      ['mouse', 24, 5],
    ],
  },
  alarm: {
    floor: 1,
    steps: [['wait', 3], ['take', 0], ['place', 14, 1], ['wait', 1.8], ['wait', 0.6, ['KeyD']]],
  },
  hidden: {
    floor: 2,
    steps: [['wait', 6], ['take', 0], ['take', 1], ['place', 11, 1], ['wait', 1.2], ['mouse', 14, 4]],
  },
  cleared: {
    floor: 2,
    steps: [['wait', 4], ['take', 0], ['take', 1], ['take', 2], ['place', 28, 13], ['wait', 0.6, ['KeyD']]],
  },
};

export function applyShot(name, game, update, stepSeconds) {
  if (!name) return;
  if (name === 'title') {
    for (let i = 0; i < 300; i++) update(stepSeconds);
    game.frozen = true;
    return;
  }
  const scene = SCENES[name];
  if (!scene) return;
  const world = createWorld(scene.floor);
  const input = { held: new Set(), tapped: new Set(), clicks: [], mouse: game.input.mouse };
  game.world = world;
  game.screen = 'play';

  for (const [action, a, b] of scene.steps) {
    if (action === 'wait') {
      input.held = new Set(b || []);
      for (let t = 0; t < a; t += stepSeconds) stepWorld(world, input, stepSeconds);
    } else if (action === 'place') {
      Object.assign(world.player, tilePoint(a, b));
    } else if (action === 'take') {
      Object.assign(world.player, { x: world.level.relics[a].x, y: world.level.relics[a].y });
      stepWorld(world, input, stepSeconds);
    } else if (action === 'pebble') {
      const target = tilePoint(a, b);
      throwPebble(world.player, target.x, target.y, world);
    } else if (action === 'mouse') {
      const target = tilePoint(a, b);
      Object.assign(game.input.mouse, { x: target.x, y: target.y + 44, inside: true });
    }
  }
  if (world.outcome === 'caught') game.screen = 'caught';
  if (world.outcome === 'escaped') game.screen = 'cleared';
  game.frozen = true;
}
