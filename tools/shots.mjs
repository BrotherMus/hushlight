// Takes the entry's screenshots: serves game/, opens each shots.json query in headless
// Chrome at 1280x720 and saves what the browser rendered as a JPEG in screenshots/.
//   node tools/shots.mjs            every shot in shots.json
//   node tools/shots.mjs --probe    also print the game state after each shot (for testing)
import { spawn } from 'node:child_process';
import { createServer } from 'node:http';
import { existsSync, mkdtempSync, readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { extname, join, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(fileURLToPath(new URL('..', import.meta.url)));
const gameDir = join(root, 'game');
const probe = process.argv.includes('--probe');
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json' };

const server = createServer((request, response) => {
  let path = decodeURIComponent(new URL(request.url, 'http://x').pathname);
  if (path.endsWith('/')) path += 'index.html';
  const file = resolve(join(gameDir, path));
  if (!file.startsWith(gameDir + sep) || !existsSync(file)) return response.writeHead(404).end('not found');
  response.writeHead(200, { 'content-type': TYPES[extname(file)] || 'application/octet-stream' });
  response.end(readFileSync(file));
});
await new Promise((done) => server.listen(0, '127.0.0.1', done));
const origin = `http://127.0.0.1:${server.address().port}`;

const chromePath = [
  process.env.CHROME_PATH,
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
  '/usr/bin/google-chrome',
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
].find((candidate) => candidate && existsSync(candidate));
if (!chromePath) throw new Error('No Chrome found: set CHROME_PATH');

const debugPort = 9300 + Math.floor(Math.random() * 500);
const chrome = spawn(chromePath, [
  '--headless=new',
  `--remote-debugging-port=${debugPort}`,
  `--user-data-dir=${mkdtempSync(join(tmpdir(), 'hushlight-shots-'))}`,
  '--window-size=1280,720',
  '--hide-scrollbars',
  '--no-first-run',
  'about:blank',
], { stdio: 'ignore' });

async function pageSocketUrl() {
  for (let attempt = 0; attempt < 50; attempt++) {
    try {
      const targets = await (await fetch(`http://127.0.0.1:${debugPort}/json/list`)).json();
      const page = targets.find((target) => target.type === 'page');
      if (page) return page.webSocketDebuggerUrl;
    } catch {}
    await new Promise((done) => setTimeout(done, 200));
  }
  throw new Error('Chrome did not open a debugging port');
}

const socket = new WebSocket(await pageSocketUrl());
await new Promise((done) => socket.addEventListener('open', done));
let nextId = 1;
const waiting = new Map();
const pageErrors = [];
socket.addEventListener('message', (event) => {
  const message = JSON.parse(event.data);
  if (message.id && waiting.has(message.id)) {
    waiting.get(message.id)(message.result || message);
    waiting.delete(message.id);
  }
  if (message.method === 'Runtime.exceptionThrown') pageErrors.push(message.params.exceptionDetails.exception?.description || message.params.exceptionDetails.text);
  if (message.method === 'Runtime.consoleAPICalled' && message.params.type === 'error') pageErrors.push(message.params.args.map((a) => a.value || a.description).join(' '));
});
const send = (method, params = {}) =>
  new Promise((done) => {
    const id = nextId++;
    waiting.set(id, done);
    socket.send(JSON.stringify({ id, method, params }));
  });

await send('Runtime.enable');
await send('Page.enable');
await send('Emulation.setDeviceMetricsOverride', { width: 1280, height: 720, deviceScaleFactor: 1, mobile: false });

const shots = JSON.parse(readFileSync(join(root, 'shots.json'), 'utf8'));
mkdirSync(join(root, 'screenshots'), { recursive: true });
for (const shot of shots) {
  await send('Page.navigate', { url: `${origin}/index.html${shot.query}` });
  await new Promise((done) => setTimeout(done, 900));
  const { data } = await send('Page.captureScreenshot', { format: 'jpeg', quality: 84 });
  const bytes = Buffer.from(data, 'base64');
  writeFileSync(join(root, 'screenshots', shot.name), bytes);
  console.log(`${shot.name}  ${bytes.length} bytes`);
  if (probe) {
    const expression = `JSON.stringify({ screen: hushlight.screen, status: hushlight.world.status, outcome: hushlight.world.outcome, stats: hushlight.world.stats, guards: hushlight.world.guards.map(g => g.state + ':' + g.awareness.toFixed(2)) })`;
    const result = await send('Runtime.evaluate', { expression });
    console.log('  ', result.result?.value || JSON.stringify(result));
  }
}
// --playtest: drive the real page with key and mouse events and print what happened.
if (process.argv.includes('--playtest')) {
  const read = async (expression) => (await send('Runtime.evaluate', { expression })).result?.value;
  const key = (type, code) => send('Input.dispatchKeyEvent', { type, code, key: code, windowsVirtualKeyCode: code === 'Enter' ? 13 : 68 });
  const pause = (ms) => new Promise((done) => setTimeout(done, ms));
  await send('Page.navigate', { url: `${origin}/index.html` });
  await pause(800);
  console.log('title screen:', await read('hushlight.screen'));
  await key('keyDown', 'Enter');
  await key('keyUp', 'Enter');
  await pause(200);
  const startX = await read('hushlight.world.player.x');
  await key('keyDown', 'KeyD');
  await pause(700);
  await key('keyUp', 'KeyD');
  console.log('after Enter:', await read('hushlight.screen'), 'moved right by', (await read('hushlight.world.player.x')) - startX);
  await send('Input.dispatchMouseEvent', { type: 'mousePressed', x: 300, y: 200, button: 'left', clickCount: 1 });
  await send('Input.dispatchMouseEvent', { type: 'mouseReleased', x: 300, y: 200, button: 'left', clickCount: 1 });
  await pause(900);
  console.log('pebbles left after a click:', await read('hushlight.world.player.pebbles'), 'rings:', await read('hushlight.world.rings.length'), 'time:', await read('hushlight.world.time'));
}
if (pageErrors.length) console.log('PAGE ERRORS:\n' + pageErrors.join('\n'));
socket.close();
chrome.kill();
server.close();
process.exit(pageErrors.length ? 1 : 0);
