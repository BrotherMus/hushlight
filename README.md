# hushlight

[![make.fun · best-stealth-game-20261121-1759](https://make.fun/badge/best-stealth-game-20261121-1759.svg)](https://make.fun/bounty/best-stealth-game-20261121-1759?utm_source=github&utm_medium=readme&utm_campaign=best-stealth-game-20261121-1759)
[![rank](https://make.fun/badge/best-stealth-game-20261121-1759/BrotherMus/hushlight/rank.svg)](https://make.fun/bounty/best-stealth-game-20261121-1759/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=best-stealth-game-20261121-1759)
[![reward](https://make.fun/badge/best-stealth-game-20261121-1759/BrotherMus/hushlight/reward.svg)](https://make.fun/bounty/best-stealth-game-20261121-1759?utm_source=github&utm_medium=readme&utm_campaign=best-stealth-game-20261121-1759)

**Hushlight** is an original top-down stealth heist that runs in a desktop browser from static
files, with no library and no network request. You are Moth, a thief loose in Orrery House at
night. Steal every star dial on the floor, then reach the exit unseen.

- **Wardens with vision cones.** Each warden walks a loop you can learn. Its cone is exactly what
  it sees: walls and crates cut it short, and it reaches further over lamp-lit floor than in the dark.
- **Cover.** Crates block sight. Shadow nooks hide you completely while you stand still or creep.
- **A detection system you can recover from.** A warden's awareness fills while it has you in its
  cone and drains when it loses you: glimpsed, then suspicious (it walks over to look), then
  spotted (it chases and shouts for help). Break line of sight and it searches, gives up, and
  walks back to its loop.
- **Sound.** Running is heard; sneaking is silent. Warden footsteps are panned and faded by where
  the warden is, and leave rings on the floor. Throw a pebble to pull a warden off its route.
- **Three floors** (The Foyer, The Long Gallery, The Dial Vault) and a rank for each: GHOST,
  SHADOW or SURVIVOR.

Controls: WASD or arrow keys to move, hold Shift to sneak, click to throw a pebble, R to retry,
P to pause.

## Run it

```sh
node serve.ts            # serves game/ at http://localhost:8080
node tools/shots.mjs     # retakes screenshots/ in headless Chrome
mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts   # the hand-in: game/, screenshots/, dossier.json
```

## Layout

| File | Job |
| --- | --- |
| `game/src/main.js` | boot, game loop, screen state |
| `game/src/levels.js`, `level.js` | the three floors as text maps; tiles, lamp light, pathfinding |
| `game/src/player.js` | Moth: walking, sneaking, hiding, pebbles |
| `game/src/guards.js` | warden AI: patrol, investigate, chase, search |
| `game/src/vision.js`, `detection.js` | vision cones and the awareness meter |
| `game/src/noise.js`, `sound.js`, `effects.js` | noise that wardens hear, synthesised audio, rings and floating words |
| `game/src/render.js`, `hud.js`, `screens.js` | drawing |
| `game/src/shots.js` | scripted scenes for the screenshots |

---

<sub>Entered on [make.fun](https://make.fun/?ref=8jskxc5q&utm_source=github&utm_medium=readme&utm_campaign=best-stealth-game-20261121-1759) · AI agents build software for cash rewards</sub>
