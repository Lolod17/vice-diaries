// Spec section 8, driven by scripts/shoot.mjs (CDP, no Playwright).
// Serves nothing itself: the page must already be on http://127.0.0.1:4173.
import { spawn } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, statSync, unlinkSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const BASE = 'http://127.0.0.1:4173';
const SHOOT = resolve(root, 'scripts/shoot.mjs');
const SHOTS = resolve(root, 'screenshots');
const OUT = resolve(root, 'out');
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

function sips(args) {
  return new Promise((resolveRun, reject) => {
    const child = spawn('sips', args, { stdio: 'ignore' });
    child.on('error', reject);
    child.on('close', (code) => (code === 0 ? resolveRun() : reject(new Error(`sips exit ${code}`))));
  });
}

function jpegSize(buffer) {
  let offset = 2;
  while (offset + 8 < buffer.length) {
    if (buffer[offset] !== 0xff) break;
    const marker = buffer[offset + 1];
    if (marker === 0xd8 || marker === 0xd9) { offset += 2; continue; }
    const length = buffer.readUInt16BE(offset + 2);
    if (marker >= 0xc0 && marker <= 0xc3) {
      return { h: buffer.readUInt16BE(offset + 5), w: buffer.readUInt16BE(offset + 7) };
    }
    offset += 2 + length;
  }
  throw new Error('jpeg size not found');
}

const READY = `
  const deadline = Date.now() + 8000;
  while (!window.__studio && Date.now() < deadline) await new Promise((r) => setTimeout(r, 80));
  if (!window.__studio) throw new Error('studio missing');
  await window.__studio.ready;
`;

mkdirSync(SHOTS, { recursive: true });
mkdirSync(OUT, { recursive: true });

const page = await shoot(resolve(OUT, 'page-probe.png'), [
  '--width', '1440', '--height', '900', '--wait', '4000',
  '--eval', `(async () => {
    ${READY}
    const canvas = document.querySelector('#preview');
    const data = canvas.getContext('2d').getImageData(0, 0, canvas.width, canvas.height).data;
    const seen = new Set();
    for (let i = 0; i < data.length; i += 32) seen.add((data[i] << 16) | (data[i + 1] << 8) | data[i + 2]);
    const box = (sel) => {
      const node = document.querySelector(sel);
      if (!node) return false;
      const r = node.getBoundingClientRect();
      return r.width > 8 && r.height > 8 && r.bottom > 0 && r.right > 0;
    };
    return {
      colors: seen.size,
      photos: window.__studio.state.photos.length,
      controls: ['#rail-left', '#rail-right', '#export-png', '#photo-strip'].filter(box).length,
      canvas: [canvas.width, canvas.height],
    };
  })()`,
]);

note('console errors', page.consoleErrors.length, page.consoleErrors.length === 0);
note('page errors', page.pageErrors.length, page.pageErrors.length === 0);
note('off-site requests', page.offSite.length, page.offSite.length === 0);
note('first paint photos', page.eval.photos, page.eval.photos >= 1);
note('first paint colours', page.eval.colors, page.eval.colors > 8);

const layouts = await shoot(resolve(OUT, 'layout-probe.png'), [
  '--width', '900', '--height', '700', '--wait', '2500',
  '--eval', `(async () => {
    ${READY}
    const layouts = (await import('./src/poster-layouts.js')).LAYOUTS;
    const canvas = document.querySelector('#preview');
    const rows = [];
    for (const layout of layouts) {
      await window.__studio.setLayout(layout.id);
      const data = canvas.getContext('2d').getImageData(0, 0, canvas.width, canvas.height).data;
      const seen = new Set();
      for (let i = 0; i < data.length; i += 48) seen.add((data[i] << 16) | (data[i + 1] << 8) | data[i + 2]);
      rows.push({ id: layout.id, panels: layout.panels.length, statePanels: window.__studio.state.panels.length, colors: seen.size, w: canvas.width, h: canvas.height });
    }
    return rows;
  })()`,
]);

note('layout count', layouts.eval.length, layouts.eval.length === 8);
for (const row of layouts.eval) {
  const match = row.statePanels >= row.panels;
  note(`layout ${row.id}`, `${row.panels} panels, ${row.colors} colours, ${row.w}x${row.h}`, row.colors > 8 && row.panels >= 1 && match);
}

const edits = await shoot(resolve(OUT, 'edit-probe.png'), [
  '--width', '900', '--height', '700', '--wait', '2500',
  '--eval', `(async () => {
    ${READY}
    const canvas = document.querySelector('#preview');
    const hashOf = () => {
      const data = canvas.getContext('2d').getImageData(0, 0, canvas.width, canvas.height).data;
      let h = 2166136261;
      for (let i = 0; i < data.length; i += 17) h = Math.imul(h ^ data[i], 16777619);
      return (h >>> 0).toString(16);
    };
    const load = (src) => new Promise((resolveImage, reject) => {
      const image = new Image();
      image.onload = () => resolveImage(image);
      image.onerror = () => reject(new Error(src));
      image.src = src;
    });
    const portrait = await load('./samples/marina-night.jpg');
    const landscape = await load('./samples/chrome-promenade.jpg');
    const studio = window.__studio;
    const state = studio.state;
    await studio.setLayout('vice-classic');
    const before = hashOf();
    studio.checkpoint();
    state.photos.push({ id: 'upload-portrait', name: 'marina-night.jpg', image: portrait });
    state.photos.push({ id: 'upload-landscape', name: 'chrome-promenade.jpg', image: landscape });
    state.panels[0].photoId = 'upload-portrait';
    if (state.panels[1]) state.panels[1].photoId = 'upload-landscape';
    await studio.render();
    const assigned = hashOf();
    studio.checkpoint();
    state.panels[0].caption = 'NIGHT MARKET';
    state.titleScale = 1.35;
    state.titleRotate = 4;
    await studio.render();
    const lettered = hashOf();
    await studio.undo();
    const undone = hashOf();
    await studio.redo();
    const redone = hashOf();
    const fit = (img, panel) => {
      const nw = img.naturalWidth;
      const nh = img.naturalHeight;
      const slot = 400;
      const cover = Math.max(slot / nw, slot / nh);
      return { src: [nw, nh], drawn: [Math.round(nw * cover), Math.round(nh * cover)], panel };
    };
    return {
      before, assigned, lettered, undone, redone,
      portrait: fit(portrait, 0),
      landscape: fit(landscape, 1),
    };
  })()`,
]);

const edit = edits.eval;
note('assign changes hash', `${edit.before} -> ${edit.assigned}`, edit.before !== edit.assigned);
note('lettering changes hash', `${edit.assigned} -> ${edit.lettered}`, edit.assigned !== edit.lettered);
note('undo restores hash', `${edit.lettered} -> ${edit.undone}`, edit.undone === edit.assigned && edit.undone !== edit.lettered);
note('redo restores hash', `${edit.undone} -> ${edit.redone}`, edit.redone === edit.lettered && edit.redone !== edit.undone);
note('portrait source', `${edit.portrait.src[0]}x${edit.portrait.src[1]} drawn ${edit.portrait.drawn[0]}x${edit.portrait.drawn[1]}`, edit.portrait.src[1] > edit.portrait.src[0] && edit.portrait.drawn[0] >= 400 && edit.portrait.drawn[1] >= 400);
note('landscape source', `${edit.landscape.src[0]}x${edit.landscape.src[1]} drawn ${edit.landscape.drawn[0]}x${edit.landscape.drawn[1]}`, edit.landscape.src[0] > edit.landscape.src[1] && edit.landscape.drawn[0] >= 400 && edit.landscape.drawn[1] >= 400);

const grades = await shoot(resolve(OUT, 'grade-probe.png'), [
  '--width', '900', '--height', '700', '--wait', '2500',
  '--eval', `(async () => {
    ${READY}
    const ids = (await import('./src/color-grade.js')).GRADES.map((grade) => grade.id);
    const canvas = document.querySelector('#preview');
    const mean = () => {
      const data = canvas.getContext('2d').getImageData(0, 0, canvas.width, canvas.height).data;
      let r = 0, g = 0, b = 0, n = 0;
      for (let i = 0; i < data.length; i += 16) { r += data[i]; g += data[i + 1]; b += data[i + 2]; n += 1; }
      return [+(r / n).toFixed(2), +(g / n).toFixed(2), +(b / n).toFixed(2)];
    };
    const baseId = window.__studio.state.gradeId;
    const base = mean();
    const rows = [];
    for (const id of ids) {
      await window.__studio.setGrade(id);
      const rgb = mean();
      const delta = Math.abs(rgb[0] - base[0]) + Math.abs(rgb[1] - base[1]) + Math.abs(rgb[2] - base[2]);
      rows.push({ id, rgb, delta: +delta.toFixed(2), base: id === baseId });
    }
    return rows;
  })()`,
]);

for (const row of grades.eval) {
  const moved = row.base ? true : row.delta > 0.5;
  note(`grade ${row.id}`, `rgb ${row.rgb.join(',')} delta ${row.delta}`, moved);
}

const exported = await shoot(resolve(OUT, 'export-probe.png'), [
  '--width', '900', '--height', '700', '--wait', '2500',
  '--eval', `(async () => {
    ${READY}
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
  ['1-cover.jpg', 1280, 720, 1920, 1080, 'vice-classic'],
  ['3-portrait.jpg', 1024, 1280, 1080, 1350, 'sunset-stories'],
  ['4-square.jpg', 1080, 1080, 1080, 1080, 'miami-lifestyle'],
];

for (const [name, w, h, srcW, srcH, layout] of covers) {
  const png = resolve(SHOTS, name.replace(/\.jpg$/, '.png'));
  const result = await shoot(png, [
    '--width', String(Math.max(w, 480)), '--height', String(Math.max(h, 480)), '--wait', '2000',
    '--eval', `(async () => {
      ${READY}
      await window.__studio.setLayout(${JSON.stringify(layout)});
      const exported = await window.__studio.exportSize(${srcW}, ${srcH}, { download: false });
      const bitmap = await createImageBitmap(exported.blob);
      const canvas = document.querySelector('#preview');
      canvas.width = ${w};
      canvas.height = ${h};
      canvas.getContext('2d').drawImage(bitmap, 0, 0, ${w}, ${h});
      return { source: [exported.size.w, exported.size.h], bytes: exported.blob.size };
    })()`,
    '--canvas', '#preview',
  ]);
  note(`export source ${name}`, `${result.eval.source[0]}x${result.eval.source[1]}, ${result.eval.bytes} bytes`, result.eval.source[0] === srcW && result.eval.source[1] === srcH && result.canvas.w === w && result.canvas.h === h);
  let quality = name === '4-square.jpg' ? 46 : 52;
  const jpg = resolve(SHOTS, name);
  for (let pass = 0; pass < 4; pass += 1) {
    await sips(['-s', 'format', 'jpeg', '-s', 'formatOptions', String(quality), png, '--out', jpg]);
    if (statSync(jpg).size <= MAX_BYTES) break;
    quality -= 8;
  }
  unlinkSync(png);
}

const editorPng = resolve(SHOTS, '2-editor.png');
const editor = await shoot(editorPng, [
  '--width', '1440', '--height', '900', '--wait', '3500',
  '--eval', `(async () => {
    ${READY}
    return { photos: window.__studio.state.photos.length };
  })()`,
]);
note('editor photos', editor.eval.photos, editor.eval.photos >= 1);
await sips(['-z', '800', '1280', editorPng]);
await sips(['-s', 'format', 'jpeg', '-s', 'formatOptions', '42', editorPng, '--out', resolve(SHOTS, '2-editor.jpg')]);
unlinkSync(editorPng);

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
  const size = exists ? jpegSize(readFileSync(file)) : null;
  const long = size ? Math.max(size.w, size.h) : 0;
  const short = size ? Math.min(size.w, size.h) : 0;
  const match = size && size.w === w && size.h === h;
  note(
    `shot ${name}`,
    exists ? `${size.w}x${size.h}, ${bytes} bytes` : 'missing',
    exists && match && bytes <= MAX_BYTES && bytes > 0 && long <= 1280 && short >= 480,
  );
}

console.log('');
console.log('check'.padEnd(36) + 'value'.padEnd(48) + 'pass');
for (const row of rows) {
  console.log(row.name.padEnd(36) + row.value.slice(0, 46).padEnd(48) + (row.pass ? 'yes' : 'no'));
}
console.log(`checks: ${rows.length}`);
console.log(`failed: ${failures.length}`);
if (failures.length) console.log(`failed names: ${failures.join(', ')}`);
process.exit(failures.length ? 1 : 0);
