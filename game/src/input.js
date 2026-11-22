// Keyboard and mouse state. Movement keys are held; taps and clicks are queued once.

import { VIEW_W, VIEW_H } from './config.js';

export function createInput(canvas, onFirstGesture) {
  const input = {
    held: new Set(),
    tapped: new Set(),
    mouse: { x: VIEW_W / 2, y: VIEW_H / 2, inside: false },
    clicks: [],
  };

  const toView = (event) => {
    const box = canvas.getBoundingClientRect();
    return {
      x: ((event.clientX - box.left) / box.width) * VIEW_W,
      y: ((event.clientY - box.top) / box.height) * VIEW_H,
    };
  };

  window.addEventListener('keydown', (event) => {
    onFirstGesture();
    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].includes(event.code)) event.preventDefault();
    if (!event.repeat) input.tapped.add(event.code);
    input.held.add(event.code);
  });
  window.addEventListener('keyup', (event) => input.held.delete(event.code));
  window.addEventListener('blur', () => input.held.clear());
  canvas.addEventListener('mousemove', (event) => {
    Object.assign(input.mouse, toView(event), { inside: true });
  });
  canvas.addEventListener('mouseleave', () => (input.mouse.inside = false));
  canvas.addEventListener('mousedown', (event) => {
    onFirstGesture();
    if (event.button === 0) input.clicks.push(toView(event));
  });
  canvas.addEventListener('contextmenu', (event) => event.preventDefault());
  return input;
}

export function moveAxis(input) {
  const held = input.held;
  let x = 0;
  let y = 0;
  if (held.has('KeyA') || held.has('ArrowLeft')) x -= 1;
  if (held.has('KeyD') || held.has('ArrowRight')) x += 1;
  if (held.has('KeyW') || held.has('ArrowUp')) y -= 1;
  if (held.has('KeyS') || held.has('ArrowDown')) y += 1;
  const length = Math.hypot(x, y) || 1;
  return { x: x / length, y: y / length, moving: x !== 0 || y !== 0 };
}

export function isSneaking(input) {
  return input.held.has('ShiftLeft') || input.held.has('ShiftRight');
}

export function endFrame(input) {
  input.tapped.clear();
  input.clicks.length = 0;
}
