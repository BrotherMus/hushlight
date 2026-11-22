// Tuning for Hushlight: every number that shapes how the heist feels lives here.

export const TILE = 40;
export const COLS = 32;
export const ROWS = 16;
export const VIEW_W = 1280;
export const VIEW_H = 800;
export const HUD_TOP = 88;
export const HUD_BOTTOM = 72;

export const PLAYER_TUNING = {
  radius: 10,
  walkSpeed: 150,
  sneakSpeed: 70,
  stepInterval: 0.3,
  stepNoiseRadius: 150,
  pebbleRange: 340,
  pebbleNoiseRadius: 240,
  pebbleFlightTime: 0.45,
  pebbleCooldown: 1.0,
  pebblesPerLevel: 4,
};

export const GUARD_TUNING = {
  radius: 13,
  patrolSpeed: 60,
  investigateSpeed: 82,
  chaseSpeed: 128,
  fieldOfView: Math.PI * 0.44,
  sightRange: 250,
  darkSightFactor: 0.55,
  nookRevealDistance: 46,
  awarenessFillRate: 1.5,
  awarenessDecayRate: 0.4,
  suspiciousAt: 0.4,
  catchDistance: 22,
  searchSeconds: 4.5,
  lookSeconds: 1.4,
  turnRate: 3.4,
  strideLength: 30,
  shoutRadius: 300,
};

export const PALETTE = {
  night: '#0b0f1a',
  floorA: '#18203a',
  floorB: '#151c33',
  wall: '#5a6aa3',
  wallTop: '#93a4dd',
  wallShade: '#333f6b',
  crate: '#a8733c',
  crateDark: '#6d4520',
  crateLight: '#d49a58',
  nook: '#070a14',
  nookEdge: '#3fd6c2',
  lamp: '#ffd98a',
  relic: '#7fe9ff',
  exitOpen: '#5dff8f',
  exitLocked: '#ff6b6b',
  player: '#f4f1e8',
  playerHidden: '#3fd6c2',
  guard: '#ff9d3c',
  coneCalm: '255, 232, 150',
  coneSuspicious: '255, 170, 40',
  coneAlert: '255, 60, 60',
  text: '#eef2ff',
  dim: '#93a0c8',
  good: '#5dff8f',
  warn: '#ffb428',
  bad: '#ff4d4d',
};
