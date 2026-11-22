// Hushlight's hand-in program (Node 22, standard library only).
// It copies the game (game/) and its screenshots (screenshots/) into the output folder and
// writes dossier.json there with make.fun's own library, vendor/makefun-game.ts.
//   mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts

import { cpSync, existsSync, mkdirSync, readdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-game.ts';

const repositoryRoot = fileURLToPath(new URL('.', import.meta.url));
const outputRoot = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

// The gate's limits, as the bounty's rules give them.
const GATE_LIMITS = {
  text_max_bytes: 163840,
  screenshots: { max: 4, max_bytes: 262144 },
  game_max_files: 993,
  game_max_bytes: 50331648,
  game_path_max_bytes: 1000,
};

function copyFolder(name: string): number {
  const from = join(repositoryRoot, name);
  const to = join(outputRoot, name);
  mkdirSync(to, { recursive: true });
  if (!existsSync(from)) return 0;
  cpSync(from, to, { recursive: true });
  return readdirSync(to, { recursive: true }).length;
}

mkdirSync(outputRoot, { recursive: true });
const gameEntries = copyFolder('game');
const screenshotEntries = copyFolder('screenshots');
writeFileSync(join(outputRoot, 'dossier.json'), buildDossier(outputRoot, GATE_LIMITS));
console.log(`Hushlight handed in: ${gameEntries} game entries, ${screenshotEntries} screenshots, dossier.json written.`);
