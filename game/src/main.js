// Hushlight boot and game loop: owns the canvas, the current floor and the screen state.

import { VIEW_W, VIEW_H } from './config.js';
import { createInput, endFrame } from './input.js';
import { createWorld, stepWorld, totalLevels } from './world.js';
import { drawWorld } from './render.js';
import { drawHud } from './hud.js';
import { drawCaughtScreen, drawClearedScreen, drawPauseScreen, drawTitleScreen } from './screens.js';
import { unlockAudio } from './sound.js';
import { applyShot } from './shots.js';

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
canvas.width = VIEW_W;
canvas.height = VIEW_H;

const STEP = 1 / 60;
const game = {
  screen: 'title', // title | play | paused | caught | cleared
  world: createWorld(0),
  input: createInput(canvas, unlockAudio),
  clock: 0,
  frozen: false,
};

function startFloor(index) {
  game.world = createWorld(index);
  game.screen = 'play';
}

function confirmPressed() {
  const { input } = game;
  return input.tapped.has('Enter') || input.tapped.has('Space') || input.clicks.length > 0;
}

function update(dt) {
  const { input, world } = game;
  game.clock += dt;
  if (game.screen === 'title') {
    stepWorld(world, { held: new Set(), tapped: new Set(), clicks: [], mouse: input.mouse }, dt);
    if (confirmPressed()) startFloor(0);
  } else if (game.screen === 'play') {
    if (input.tapped.has('KeyH')) world.showNotes = !world.showNotes;
    if (input.tapped.has('KeyP')) game.screen = 'paused';
    else if (input.tapped.has('KeyR')) startFloor(world.levelIndex);
    else {
      stepWorld(world, input, dt);
      if (world.outcome === 'caught') game.screen = 'caught';
      if (world.outcome === 'escaped') game.screen = 'cleared';
    }
  } else if (game.screen === 'paused') {
    if (input.tapped.has('KeyP')) game.screen = 'play';
  } else if (game.screen === 'caught') {
    if (input.tapped.has('KeyR') || confirmPressed()) startFloor(world.levelIndex);
  } else if (game.screen === 'cleared') {
    if (confirmPressed()) startFloor((world.levelIndex + 1) % totalLevels());
  }
  endFrame(input);
}

function draw() {
  const { world } = game;
  ctx.clearRect(0, 0, VIEW_W, VIEW_H);
  drawWorld(ctx, world, game.screen === 'play' ? game.input.mouse : null);
  drawHud(ctx, world);
  if (game.screen === 'title') drawTitleScreen(ctx, game.clock);
  if (game.screen === 'paused') drawPauseScreen(ctx);
  if (game.screen === 'caught') drawCaughtScreen(ctx, world);
  if (game.screen === 'cleared') drawClearedScreen(ctx, world, world.levelIndex === totalLevels() - 1);
}

let last = performance.now();
let owed = 0;
function frame(now) {
  owed = Math.min(0.25, owed + (now - last) / 1000);
  last = now;
  while (owed >= STEP) {
    if (!game.frozen) update(STEP);
    owed -= STEP;
  }
  draw();
  requestAnimationFrame(frame);
}

// ?shot=<name> poses a real game state for a screenshot; see shots.js.
applyShot(new URLSearchParams(location.search).get('shot'), game, update, STEP);
window.hushlight = game;
draw();
requestAnimationFrame(frame);
