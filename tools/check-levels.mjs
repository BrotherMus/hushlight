// Sanity-checks every floor: row widths, walkable patrol stops, and that the start can
// reach every star dial and the exit.   node tools/check-levels.mjs
import { LEVELS } from '../game/src/levels.js';
import { buildLevel, findPath, tileCenter } from '../game/src/level.js';
import { COLS, ROWS, TILE } from '../game/src/config.js';

let problems = 0;
const report = (text) => {
  problems += 1;
  console.log('PROBLEM ' + text);
};

LEVELS.forEach((definition, index) => {
  if (definition.map.length !== ROWS) report(`floor ${index + 1}: ${definition.map.length} rows`);
  definition.map.forEach((row, r) => {
    if (row.length !== COLS) report(`floor ${index + 1} row ${r}: ${row.length} columns`);
  });
  const level = buildLevel(definition);
  const reach = (x, y) => findPath(level, level.start.x, level.start.y, x, y).length > 0;
  level.relics.forEach((relic, i) => {
    if (!reach(relic.x, relic.y)) report(`floor ${index + 1}: star dial ${i} unreachable`);
  });
  if (!reach(level.exit.x, level.exit.y)) report(`floor ${index + 1}: exit unreachable`);
  definition.guards.forEach((guard, g) => {
    guard.route.forEach(([col, row]) => {
      if (level.isSolidTile(col, row)) report(`floor ${index + 1} warden ${g}: stop ${col},${row} is solid`);
      const stop = tileCenter(col, row);
      if (!reach(stop.x, stop.y)) report(`floor ${index + 1} warden ${g}: stop ${col},${row} unreachable`);
    });
  });
  console.log(`floor ${index + 1}: ${level.relics.length} dials, ${level.crates.length} crates, ${level.nooks.length} nooks, ${level.lamps.length} lamps, ${definition.guards.length} wardens, tile ${TILE}`);
});
console.log(problems ? `${problems} problems` : 'all floors ok');
process.exit(problems ? 1 : 0);
