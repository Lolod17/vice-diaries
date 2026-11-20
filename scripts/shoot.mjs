// Minimal Chrome DevTools Protocol driver with no dependencies.
// Node 22 ships a global WebSocket, so this replaces a Playwright install.
//
//   node scripts/shoot.mjs <url> <out.png> [--wait 2500] [--width 1440] [--height 900]
//        [--eval "<js expression, awaited>"] [--canvas "#preview"] [--json <report.json>]
//
// Prints a JSON report: console errors, off-site requests, the evaluated value,
// the canvas size if one was captured, and the output file size.
import { spawn } from 'node:child_process';
import { mkdtempSync, writeFileSync, rmSync, mkdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';

const CHROME = process.env.CHROME_BIN
  || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function arg(name, dflt = null) {
  const i = process.argv.indexOf(`--${name}`);
  return i === -1 ? dflt : process.argv[i + 1];
}

async function httpJson(path) {
  const res = await fetch(`http://127.0.0.1:${port}${path}`);
  return res.json();
}

const port = 9333 + Math.floor(Math.random() * 200);
const profile = mkdtempSync(join(tmpdir(), 'cdp-'));
const chrome = spawn(CHROME, [
  '--headless=new',
  `--remote-debugging-port=${port}`,
  `--user-data-dir=${profile}`,
  '--no-first-run',
  '--no-default-browser-check',
  '--disable-extensions',
  '--hide-scrollbars',
  '--allow-file-access-from-files',
  'about:blank',
], { stdio: 'ignore' });

class Session {
  constructor(ws) {
    this.ws = ws;
    this.id = 0;
    this.pending = new Map();
    this.handlers = new Map();
    ws.addEventListener('message', (ev) => {
      const msg = JSON.parse(ev.data);
      if (msg.id && this.pending.has(msg.id)) {
        const { resolve, reject } = this.pending.get(msg.id);
        this.pending.delete(msg.id);
        msg.error ? reject(new Error(JSON.stringify(msg.error))) : resolve(msg.result);
      } else if (msg.method) {
        for (const fn of this.handlers.get(msg.method) || []) fn(msg.params);
      }
    });
  }
  on(method, fn) {
    if (!this.handlers.has(method)) this.handlers.set(method, []);
    this.handlers.get(method).push(fn);
  }
  send(method, params = {}) {
    const id = ++this.id;
    return new Promise((resolve, reject) => {
      this.pending.set(id, { resolve, reject });
      this.ws.send(JSON.stringify({ id, method, params }));
      setTimeout(() => {
        if (this.pending.has(id)) {
          this.pending.delete(id);
          reject(new Error(`timeout: ${method}`));
        }
      }, 60000);
    });
  }
}

async function connect(url) {
  const ws = new WebSocket(url);
  await new Promise((resolve, reject) => {
    ws.addEventListener('open', resolve, { once: true });
    ws.addEventListener('error', () => reject(new Error('cdp socket error')), { once: true });
  });
  return new Session(ws);
}

async function main() {
  const url = process.argv[2];
  const out = process.argv[3];
  if (!url || !out) {
    console.error('usage: node scripts/shoot.mjs <url> <out.png> [--wait ms] [--eval js] [--canvas sel]');
    process.exit(2);
  }
  const wait = Number(arg('wait', 2500));
  const width = Number(arg('width', 1440));
  const height = Number(arg('height', 900));
  const expr = arg('eval', 'null');
  const canvasSel = arg('canvas', null);
  const report = { url, consoleErrors: [], pageErrors: [], offSite: [], eval: null, canvas: null };

  let target;
  for (let i = 0; i < 60; i++) {
    try {
      const version = await httpJson('/json/version');
      if (version.webSocketDebuggerUrl) break;
    } catch { /* not up yet */ }
    await sleep(250);
  }
  const created = await (await fetch(`http://127.0.0.1:${port}/json/new?about:blank`, { method: 'PUT' })).json();
  target = created.webSocketDebuggerUrl;
  const page = await connect(target);

  page.on('Runtime.consoleAPICalled', (p) => {
    if (p.type === 'error') report.consoleErrors.push(p.args.map((a) => a.value ?? a.description).join(' '));
  });
  page.on('Runtime.exceptionThrown', (p) => report.pageErrors.push(p.exceptionDetails?.text || 'exception'));
  page.on('Network.requestWillBeSent', (p) => {
    const u = p.request?.url || '';
    if (/^https?:/.test(u) && !u.startsWith('http://127.0.0.1') && !u.startsWith('http://localhost')) report.offSite.push(u);
  });

  await page.send('Runtime.enable');
  await page.send('Network.enable');
  await page.send('Page.enable');
  await page.send('Emulation.setDeviceMetricsOverride', { width, height, deviceScaleFactor: 2, mobile: false });
  await page.send('Page.navigate', { url });
  await sleep(wait);

  if (expr && expr !== 'null') {
    const r = await page.send('Runtime.evaluate', { expression: expr, awaitPromise: true, returnByValue: true });
    report.eval = r.result?.value ?? r.result?.description ?? null;
    await sleep(900);
  }

  if (canvasSel) {
    const grab = await page.send('Runtime.evaluate', {
      expression: `(() => { const c = document.querySelector(${JSON.stringify(canvasSel)}); if (!c) return null;
        return { w: c.width, h: c.height, data: c.toDataURL('image/png') }; })()`,
      returnByValue: true,
    });
    const v = grab.result?.value;
    if (v) {
      mkdirSync(dirname(out), { recursive: true });
      writeFileSync(out, Buffer.from(v.data.split(',')[1], 'base64'));
      report.canvas = { w: v.w, h: v.h, file: out };
    }
  } else {
    const shot = await page.send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false });
    mkdirSync(dirname(out), { recursive: true });
    writeFileSync(out, Buffer.from(shot.data, 'base64'));
  }

  report.file = out;
  console.log(JSON.stringify(report, null, 2));
  chrome.kill('SIGKILL');
  try { rmSync(profile, { recursive: true, force: true }); } catch { /* ignore */ }
  process.exit(0);
}

main().catch((err) => {
  console.error('shoot failed:', err.message);
  chrome.kill('SIGKILL');
  process.exit(1);
});
