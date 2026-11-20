// Spec section 8, driven by scripts/shoot.mjs (no Playwright, no downloads).
// Serves nothing itself: the app must already be on http://127.0.0.1:4173.

import { spawn } from 'node:child_process';
import { existsSync, readFileSync, statSync, unlinkSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const BASE = 'http://127.0.0.1:4173';
const SHOOT = resolve(root, 'scripts/shoot.mjs');
const SHOTS = resolve(root, 'screenshots');
const MAX_BYTES = 262144;

const rows = [];
const failures = [];

function note(name, value, pass) {
  rows.push({ name, value: String(value), pass });
  console.log(`${pass ? 'ok ' : 'NO '} ${name}: ${value}`);
  if (!pass) failures.push(name);
}

function shoot(out, args) {
  return new Promise((resolveRun, reject) => {
    const child = spawn(process.execPath, [SHOOT, `${BASE}/`, out, ...args], {
      cwd: root,
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    let stdout = '';
    let stderr = '';
    child.stdout.on('data', (chunk) => { stdout += chunk; });
    child.stderr.on('data', (chunk) => { stderr += chunk; });
    child.on('error', reject);
    child.on('close', (code) => {
      if (code !== 0) {
        reject(new Error(`shoot exit ${code}: ${stderr || stdout}`));
        return;
      }
      const start = stdout.indexOf('{');
      resolveRun(JSON.parse(stdout.slice(start)));
    });
  });
}

function resample(file, width, height) {
  return new Promise((resolveRun, reject) => {
    const child = spawn('sips', ['-z', String(height), String(width), file], { stdio: 'ignore' });
    child.on('error', reject);
    child.on('close', (code) => (code === 0 ? resolveRun() : reject(new Error(`sips resize exit ${code}`))));
  });
}

function jpeg(png, jpg, quality) {
  return new Promise((resolveRun, reject) => {
    const child = spawn('sips', ['-s', 'format', 'jpeg', '-s', 'formatOptions', String(Math.round(quality * 100)), png, '--out', jpg], { stdio: 'ignore' });
    child.on('error', reject);
    child.on('close', (code) => (code === 0 ? resolveRun() : reject(new Error(`sips exit ${code}`))));
  });
}

function jpegSize(buffer) {
  let offset = 2;
  while (offset < buffer.length) {
    if (buffer[offset] !== 0xff) break;
    const marker = buffer[offset + 1];
    const length = buffer.readUInt16BE(offset + 2);
    if (marker >= 0xc0 && marker <= 0xc3) {
      return { h: buffer.readUInt16BE(offset + 5), w: buffer.readUInt16BE(offset + 7) };
    }
    offset += 2 + length;
  }
  throw new Error('jpeg size not found');
}

const page = await shoot(resolve(SHOTS, '2-editor.png'), [
  '--width', '1440', '--height', '900', '--wait', '3500',
  '--eval', `(async () => {
    const deadline = Date.now() + 8000;
    while (!window.__studio && Date.now() < deadline) await new Promise((r) => setTimeout(r, 100));
    await window.__studio.ready;
    const canvas = document.querySelector('#preview');
    const data = canvas.getContext('2d').getImageData(0, 0, canvas.width, canvas.height).data;
    const seen = new Set();
    let sum = 0;
    for (let i = 0; i < data.length; i += 16) {
      seen.add((data[i] << 16) | (data[i + 1] << 8) | data[i + 2]);
      sum += data[i] + data[i + 1] + data[i + 2];
    }
    const controls = ['#rail-left', '#rail-right', '#export-png', '#photo-strip'].map((sel) => {
      const node = document.querySelector(sel);
      const box = node.getBoundingClientRect();
      return box.width > 0 && box.height > 0;
    });
    return {
      colors: seen.size,
      mean: Math.round(sum / (data.length / 16) / 3),
      photos: window.__studio.state.photos.length,
      controls: controls.filter(Boolean).length,
      canvas: [canvas.width, canvas.height],
    };
  })()`,
]);

note('console errors', page.consoleErrors.length, page.consoleErrors.length === 0);
note('page errors', page.pageErrors.length, page.pageErrors.length === 0);
note('off-site requests', page.offSite.length, page.offSite.length === 0);
note('editor canvas', `${page.eval.canvas[0]}x${page.eval.canvas[1]}`, page.eval.canvas[0] > 0);
note('editor colours', page.eval.colors, page.eval.colors > 8);
note('editor photos', page.eval.photos, page.eval.photos >= 1);
note('editor controls visible', page.eval.controls, page.eval.controls === 4);
await jpeg(resolve(SHOTS, '2-editor.png'), resolve(SHOTS, '2-editor.jpg'), 0.55);
unlinkSync(resolve(SHOTS, '2-editor.png'));
await resample(resolve(SHOTS, '2-editor.jpg'), 1280, 800);
if (page.pageErrors.length) console.log(page.pageErrors.join('\n'));
if (page.consoleErrors.length) console.log(page.consoleErrors.join('\n'));
if (page.offSite.length) console.log(page.offSite.join('\n'));

const layouts = await shoot(resolve(root, 'out/layout-probe.png'), [
  '--width', '1440', '--height', '900', '--wait', '2500',
  '--eval', `(async () => {
    const deadline = Date.now() + 8000;
    while (!window.__studio && Date.now() < deadline) await new Promise((r) => setTimeout(r, 100));
    await window.__studio.ready;
    const layouts = (await import('./src/poster-layouts.js')).LAYOUTS;
    const canvas = document.querySelector('#preview');
    const rows = [];
    for (const layout of layouts) {
      await window.__studio.setLayout(layout.id);
      const ctx = canvas.getContext('2d');
      const data = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
      const seen = new Set();
      for (let i = 0; i < data.length; i += 32) seen.add((data[i] << 16) | (data[i + 1] << 8) | data[i + 2]);
      rows.push({ id: layout.id, panels: layout.panels.length, colors: seen.size, w: canvas.width, h: canvas.height });
    }
    await window.__studio.setLayout('vice-classic');
    return rows;
  })()`,
]);

for (const row of layouts.eval) {
  note(`layout ${row.id}`, `${row.panels} panels, ${row.colors} colours, ${row.w}x${row.h}`, row.colors > 8 && row.panels > 0);
}

const edits = await shoot(resolve(root, 'out/edit-probe.png'), [
  '--width', '900', '--height', '700', '--wait', '2500',
  '--eval', `(async () => {
    const deadline = Date.now() + 8000;
    while (!window.__studio && Date.now() < deadline) await new Promise((r) => setTimeout(r, 100));
    await window.__studio.ready;
    const canvas = document.querySelector('#preview');
    const hashOf = () => {
      const data = canvas.getContext('2d').getImageData(0, 0, canvas.width, canvas.height).data;
      let h = 2166136261;
      for (let i = 0; i < data.length; i += 17) h = Math.imul(h ^ data[i], 16777619);
      return (h >>> 0).toString(16);
    };
    const portrait = await new Promise((resolveImage) => {
      const image = new Image();
      image.onload = () => resolveImage(image);
      image.src = './samples/marina-night.jpg';
    });
    const landscape = await new Promise((resolveImage) => {
      const image = new Image();
      image.onload = () => resolveImage(image);
      image.src = './samples/chrome-promenade.jpg';
    });
    const state = window.__studio.state;
    const before = hashOf();
    state.photos.push({ id: 'upload-portrait', name: 'marina-night.jpg', image: portrait });
    state.photos.push({ id: 'upload-landscape', name: 'chrome-promenade.jpg', image: landscape });
    state.panels[0].photoId = 'upload-portrait';
    state.panels[1].photoId = 'upload-landscape';
    await window.__studio.render();
    const assigned = hashOf();
    state.panels[0].caption = 'NIGHT MARKET';
    state.titleScale = 1.35;
    state.titleRotate = 4;
    await window.__studio.render();
    const lettered = hashOf();
    const title = document.querySelector('#title');
    title.value = 'NIGHT RUN';
    title.dispatchEvent(new Event('input', { bubbles: true }));
    await new Promise((r) => setTimeout(r, 500));
    const titled = hashOf();
    document.querySelector('#undo').click();
    await new Promise((r) => setTimeout(r, 500));
    const undone = hashOf();
    document.querySelector('#redo').click();
    await new Promise((r) => setTimeout(r, 500));
    const redone = hashOf();
    const sample = state.photos.find((photo) => photo.id === 'pier') || state.photos[0];
    const srcW = sample.image.naturalWidth;
    const srcH = sample.image.naturalHeight;
    return {
      before, assigned, lettered, titled, undone, redone,
      portrait: [portrait.naturalWidth, portrait.naturalHeight],
      landscape: [landscape.naturalWidth, landscape.naturalHeight],
      sample: [srcW, srcH],
    };
  })()`,
]);

const edit = edits.eval;
note('assign changes hash', `${edit.before} -> ${edit.assigned}`, edit.before !== edit.assigned);
note('lettering changes hash', `${edit.assigned} -> ${edit.lettered}`, edit.assigned !== edit.lettered);
note('undo hash', `${edit.titled} -> ${edit.undone}`, edit.undone !== edit.titled && edit.undone === edit.lettered);
note('redo hash', `${edit.undone} -> ${edit.redone}`, edit.redone !== edit.undone && edit.redone === edit.titled);
note('portrait source', `${edit.portrait[0]}x${edit.portrait[1]}`, edit.portrait[1] > edit.portrait[0]);
note('landscape source', `${edit.landscape[0]}x${edit.landscape[1]}`, edit.landscape[0] > edit.landscape[1]);

const grades = await shoot(resolve(root, 'out/grade-probe.png'), [
  '--width', '900', '--height', '700', '--wait', '2500',
  '--eval', `(async () => {
    const deadline = Date.now() + 8000;
    while (!window.__studio && Date.now() < deadline) await new Promise((r) => setTimeout(r, 100));
    await window.__studio.ready;
    const ids = (await import('./src/color-grade.js')).GRADES.map((grade) => grade.id);
    const canvas = document.querySelector('#preview');
    const mean = () => {
      const data = canvas.getContext('2d').getImageData(0, 0, canvas.width, canvas.height).data;
      let r = 0, g = 0, b = 0, n = 0;
      for (let i = 0; i < data.length; i += 16) { r += data[i]; g += data[i + 1]; b += data[i + 2]; n += 1; }
      return [Math.round(r / n), Math.round(g / n), Math.round(b / n)];
    };
    const rows = [];
    let previous = null;
    for (const id of ids) {
      await window.__studio.setGrade(id);
      const rgb = mean();
      const delta = previous ? Math.abs(rgb[0] - previous[0]) + Math.abs(rgb[1] - previous[1]) + Math.abs(rgb[2] - previous[2]) : null;
      rows.push({ id, rgb, delta });
      previous = rgb;
    }
    return rows;
  })()`,
]);

for (const row of grades.eval) {
  const moved = row.delta === null || row.delta > 0;
  note(`grade ${row.id}`, `rgb ${row.rgb.join(',')} delta ${row.delta ?? 'base'}`, moved);
}

const exported = await shoot(resolve(root, 'out/export-probe.png'), [
  '--width', '900', '--height', '700', '--wait', '2500',
  '--eval', `(async () => {
    const deadline = Date.now() + 8000;
    while (!window.__studio && Date.now() < deadline) await new Promise((r) => setTimeout(r, 100));
    await window.__studio.ready;
    await window.__studio.setLayout('vice-classic');
    await window.__studio.setGrade('vice-sunset');
    const sizes = [[1080, 1080], [1080, 1350], [1920, 1080]];
    const rows = [];
    for (const [w, h] of sizes) {
      const first = await window.__studio.exportSize(w, h, { download: false });
      const second = await window.__studio.exportSize(w, h, { download: false });
      const a = new Uint8Array(await first.blob.arrayBuffer());
      const b = new Uint8Array(await second.blob.arrayBuffer());
      let same = a.length === b.length;
      for (let i = 0; same && i < a.length; i += 1) if (a[i] !== b[i]) same = false;
      let hash = 2166136261;
      for (let i = 0; i < a.length; i += 64) hash = Math.imul(hash ^ a[i], 16777619);
      rows.push({ w: first.size.w, h: first.size.h, bytes: a.length, same, hash: (hash >>> 0).toString(16) });
    }
    await window.__studio.setLayout('neon-nights');
    const other = await window.__studio.exportSize(1080, 1080, { download: false });
    const bytes = new Uint8Array(await other.blob.arrayBuffer());
    let otherHash = 2166136261;
    for (let i = 0; i < bytes.length; i += 64) otherHash = Math.imul(otherHash ^ bytes[i], 16777619);
    return { rows, other: (otherHash >>> 0).toString(16) };
  })()`,
]);

for (const row of exported.eval.rows) {
  const expected = (row.w === 1080 && row.h === 1080) || (row.w === 1080 && row.h === 1350) || (row.w === 1920 && row.h === 1080);
  note(`export ${row.w}x${row.h}`, `${row.bytes} bytes, identical ${row.same}, hash ${row.hash}`, expected && row.same && row.bytes > 1000);
}
const square = exported.eval.rows.find((row) => row.w === 1080 && row.h === 1080);
note('export differs by layout', `${square.hash} vs ${exported.eval.other}`, square.hash !== exported.eval.other);

const covers = [
  ['1-cover.jpg', 1280, 720, '1920x1080', 'vice-classic'],
  ['3-portrait.jpg', 1024, 1280, '1080x1350', 'sunset-stories'],
  ['4-square.jpg', 1080, 1080, '1080x1080', 'miami-lifestyle'],
];
for (const [name, w, h, size, layout] of covers) {
  const png = resolve(SHOTS, name.replace(/\.jpg$/, '.png'));
  const result = await shoot(png, [
    '--width', String(w), '--height', String(h), '--wait', '2500',
    '--eval', `(async () => {
      const deadline = Date.now() + 8000;
      while (!window.__studio && Date.now() < deadline) await new Promise((r) => setTimeout(r, 100));
      await window.__studio.ready;
      await window.__studio.setLayout(${JSON.stringify(layout)});
      const exported = await window.__studio.exportSize(${JSON.stringify(size)}, { download: false });
      const bitmap = await createImageBitmap(exported.blob);
      const canvas = document.querySelector('#preview');
      canvas.width = ${w};
      canvas.height = ${h};
      canvas.getContext('2d').drawImage(bitmap, 0, 0, ${w}, ${h});
      return { source: [exported.size.w, exported.size.h], bytes: exported.blob.size };
    })()`,
    '--canvas', '#preview',
  ]);
  note(`export source ${name}`, `${result.eval.source[0]}x${result.eval.source[1]}, ${result.eval.bytes} bytes`, result.eval.source.join('x') === size);
  await jpeg(png, resolve(SHOTS, name), name === '4-square.jpg' ? 0.6 : 0.62);
  unlinkSync(png);
}

const expectedShot = {
  '1-cover.jpg': [1280, 720],
  '2-editor.jpg': [1280, 800],
  '3-portrait.jpg': [1024, 1280],
  '4-square.jpg': [1080, 1080],
};
for (const [name, [w, h]] of Object.entries(expectedShot)) {
  const file = resolve(SHOTS, name);
  const exists = existsSync(file);
  const bytes = exists ? statSync(file).size : 0;
  const size = exists && name.endsWith('.jpg') ? jpegSize(readFileSync(file)) : null;
  const long = size ? Math.max(size.w, size.h) : 0;
  const short = size ? Math.min(size.w, size.h) : 0;
  const match = size && size.w === w && size.h === h;
  note(
    `shot ${name}`,
    exists ? `${size.w}x${size.h}, ${bytes} bytes` : 'missing',
    exists && match && bytes <= MAX_BYTES && long <= 1280 && short >= 480,
  );
}

console.log('');
console.log('check'.padEnd(34) + 'value'.padEnd(42) + 'pass');
for (const row of rows) {
  console.log(row.name.padEnd(34) + row.value.slice(0, 40).padEnd(42) + (row.pass ? 'yes' : 'no'));
}
console.log(`failed: ${failures.length}`);
process.exit(failures.length ? 1 : 0);
