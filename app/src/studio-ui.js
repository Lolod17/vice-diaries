// Editor: photos, panel framing, lettering, grade, undo, export.

import { LAYOUTS } from './poster-layouts.js';
import { renderPreview, lastMetrics } from './cover-render.js';
import { exportCover, exportAll, exportName } from './cover-export.js';
import { freshState } from './shots.js';

const SAMPLES = [
  'boulevard', 'pier', 'marina-night', 'hotel-dusk',
  'convertible-sunset', 'chrome-promenade', 'neon-crew',
];

const SHOTS = {
  cover: {
    layoutId: 'vice-classic',
    size: { w: 1920, h: 1080 },
    gradeId: 'vice-sunset',
    photos: ['boulevard', 'pier', 'marina-night', 'hotel-dusk'],
    panels: [
      ['01:12:04', 'BOULEVARD'],
      ['01:18:41', 'THE PIER'],
      ['01:24:09', 'MARINA'],
      ['01:31:55', 'HOTEL'],
    ],
  },
  portrait: {
    layoutId: 'sunset-stories',
    size: { w: 1080, h: 1350 },
    gradeId: 'miami-heat',
    photos: ['convertible-sunset', 'pier', 'boulevard', 'hotel-dusk'],
    panels: [
      ['02:02:11', 'SUNSET'],
      ['02:09:40', 'STRIP'],
      ['02:14:18', 'DRIVE'],
      ['02:21:03', 'DUSK'],
    ],
  },
  square: {
    layoutId: 'miami-lifestyle',
    size: { w: 1080, h: 1080 },
    gradeId: 'tropical-gold',
    photos: ['chrome-promenade', 'pier', 'hotel-dusk', 'marina-night', 'neon-crew', 'boulevard'],
    panels: [
      ['03:01:08', 'CHROME'],
      ['03:06:22', 'PIER'],
      ['03:11:47', 'HOTEL'],
      ['03:18:05', 'MARINA'],
      ['03:24:33', 'CREW'],
      ['03:30:12', 'STREET'],
    ],
  },
};

const $ = (id) => document.getElementById(id);

let state = freshState();
let photos = [];
let history = [];
let future = [];
let selected = 0;
let dirty = false;
let painting = false;
const stage = { zoom: 1 };

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function remember() {
  history.push(clone(state));
  if (history.length > 40) history.shift();
  future = [];
  dirty = true;
  const hint = $('hint');
  if (hint) hint.hidden = true;
}

function snapshotNow() {
  if (!history.length) remember();
  history[history.length - 1] = clone(state);
}

function commit(mutate) {
  remember();
  mutate(state);
  paint();
  syncControls();
}

function undo() {
  if (!history.length) return;
  future.push(clone(state));
  state = history.pop();
  paint();
  syncControls();
}

function redo() {
  if (!future.length) return;
  history.push(clone(state));
  state = future.pop();
  paint();
  syncControls();
}

function photoById(id) {
  return photos.find((photo) => photo.id === id) || null;
}

function orderedPhotos() {
  for (const item of state.photos || []) {
    if (!item || !item.image || photoById(item.id)) continue;
    photos.push({ id: item.id, image: item.image, url: item.url || '' });
  }
  const used = state.panels.map((panel) => photoById(panel.photoId)).filter(Boolean);
  const rest = photos.filter((photo) => !used.includes(photo));
  return used.concat(rest);
}

function applyLayout(next, layout) {
  next.layoutId = layout.id;
  next.gradeId = layout.defaultGrade;
  while (next.panels.length < layout.panels.length) {
    const index = next.panels.length;
    const photo = photos[index % Math.max(photos.length, 1)];
    next.panels.push({
      photoId: photo ? photo.id : '',
      zoom: 1,
      focusX: 0,
      focusY: 0,
      rotate: 0,
      timecode: '',
      caption: '',
    });
  }
}

function paint() {
  const canvas = $('preview');
  if (!canvas) return;
  canvas.width = state.size.w;
  canvas.height = state.size.h;
  state.photos = orderedPhotos().map((photo) => photo.image);
  painting = true;
  renderPreview(canvas, state);
  painting = false;
  canvas.style.transform = `scale(${stage.zoom})`;
  const label = $('zoom-label');
  if (label) label.textContent = `${Math.round(stage.zoom * 100)}%`;
  const name = $('export-name');
  if (name && document.activeElement !== name) name.value = exportName(state, state.size);
}

function setPressed(selector, attr, value) {
  document.querySelectorAll(selector).forEach((node) => {
    node.setAttribute('aria-pressed', String(node.dataset[attr] === value));
  });
}

function syncControls() {
  $('field-title').value = state.title;
  $('field-subtitle').value = state.subtitle;
  $('field-tagline').value = state.tagline;
  $('field-issue').value = state.issue;
  $('field-rating').value = state.rating;
  $('title-scale').value = state.titleScale;
  $('title-rotate').value = state.titleRotate;
  $('title-align').value = state.titleAlign;
  $('caption-align').value = state.captionAlign;
  $('adjust-brightness').value = state.adjust.brightness;
  $('adjust-contrast').value = state.adjust.contrast;
  $('adjust-saturation').value = state.adjust.saturation;
  $('adjust-temperature').value = state.adjust.temperature;
  $('adjust-highlights').value = state.adjust.highlights;
  $('adjust-shadows').value = state.adjust.shadows;
  $('effect-grain').value = state.grain;
  $('effect-vignette').value = state.vignette;
  $('effect-bloom').value = state.bloom;
  $('effect-leak').value = state.leak;
  setPressed('#layout-list button', 'layout', state.layoutId);
  setPressed('#size-row button', 'size', `${state.size.w}x${state.size.h}`);
  setPressed('#grade-list button', 'grade', state.gradeId);
  renderStrip();
}

function renderStrip() {
  const strip = $('photo-strip');
  if (!strip) return;
  strip.replaceChildren();
  photos.forEach((photo, index) => {
    const card = document.createElement('figure');
    card.className = 'thumb';
    const img = document.createElement('img');
    img.src = photo.url;
    img.alt = photo.id;
    const use = document.createElement('button');
    use.type = 'button';
    use.textContent = `Panel ${selected + 1}`;
    use.addEventListener('click', () => {
      commit((next) => { next.panels[selected].photoId = photo.id; });
    });
    const remove = document.createElement('button');
    remove.type = 'button';
    remove.textContent = 'Remove';
    remove.addEventListener('click', () => {
      commit(() => { photos = photos.filter((item) => item !== photo); });
    });
    card.append(img, use, remove);
    strip.append(card);
    card.dataset.index = String(index);
  });
}

function loadImage(url) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = url;
  });
}

async function addFiles(files) {
  const accepted = [...files].filter((file) => /image\/(jpeg|png|webp)/.test(file.type));
  if (!accepted.length) return;
  remember();
  for (const file of accepted) {
    const image = await createImageBitmap(file);
    const url = URL.createObjectURL(file);
    const id = `upload-${photos.length}-${file.name}`;
    photos.push({ id, image, url });
    const empty = state.panels.find((panel) => !photoById(panel.photoId));
    (empty || state.panels[selected]).photoId = id;
  }
  dirty = true;
  $('hint').hidden = true;
  paint();
  syncControls();
}

async function loadSamples(names) {
  const loaded = [];
  for (const name of names) {
    const image = await loadImage(`./samples/${name}.jpg`);
    image.__name = name;
    loaded.push({ id: name, image, url: `./samples/${name}.jpg` });
  }
  photos = loaded;
}

function applyShot(shot) {
  const spec = SHOTS[shot];
  if (!spec) return;
  state.layoutId = spec.layoutId;
  state.size = { ...spec.size };
  state.gradeId = spec.gradeId;
  spec.panels.forEach((pair, index) => {
    if (!state.panels[index]) {
      state.panels[index] = { photoId: '', zoom: 1, focusX: 0, focusY: 0, rotate: 0, timecode: '', caption: '' };
    }
    state.panels[index].photoId = spec.photos[index];
    state.panels[index].timecode = pair[0];
    state.panels[index].caption = pair[1];
  });
  document.body.dataset.shot = shot;
}

function canvasPoint(event) {
  const canvas = $('preview');
  const bounds = canvas.getBoundingClientRect();
  return {
    x: ((event.clientX - bounds.left) / bounds.width) * canvas.width,
    y: ((event.clientY - bounds.top) / bounds.height) * canvas.height,
  };
}

function hitPanel(point) {
  const layout = LAYOUTS.find((item) => item.id === state.layoutId);
  if (!layout) return 0;
  const frame = state.size;
  let found = 0;
  layout.panels.forEach((panel, index) => {
    if (panel.kind === 'field') return;
    const x = panel.x * frame.w;
    const y = panel.y * frame.h;
    const w = panel.w * frame.w;
    const h = panel.h * frame.h;
    if (point.x >= x && point.x <= x + w && point.y >= y && point.y <= y + h) found = panel.slot ?? index;
  });
  return found;
}

function bindCanvas() {
  const canvas = $('preview');
  let drag = null;
  canvas.addEventListener('pointerdown', (event) => {
    selected = hitPanel(canvasPoint(event));
    const panel = state.panels[selected];
    if (!panel) return;
    drag = { x: event.clientX, y: event.clientY, fx: panel.focusX, fy: panel.focusY };
    canvas.setPointerCapture(event.pointerId);
    remember();
  });
  canvas.addEventListener('pointermove', (event) => {
    if (!drag) return;
    const panel = state.panels[selected];
    panel.focusX = Math.max(-1, Math.min(1, drag.fx + (event.clientX - drag.x) / 280));
    panel.focusY = Math.max(-1, Math.min(1, drag.fy + (event.clientY - drag.y) / 280));
    paint();
  });
  canvas.addEventListener('pointerup', () => { drag = null; });
  let zoomArmed = true;
  canvas.addEventListener('wheel', (event) => {
    event.preventDefault();
    const panel = state.panels[selected];
    if (!panel) return;
    if (zoomArmed) { remember(); zoomArmed = false; }
    clearTimeout(canvas._zoomTimer);
    canvas._zoomTimer = setTimeout(() => { zoomArmed = true; }, 400);
    panel.zoom = Math.max(1, Math.min(3, panel.zoom + (event.deltaY < 0 ? 0.08 : -0.08)));
    dirty = true;
    paint();
  }, { passive: false });
}

function bindText(id, key) {
  const node = $(id);
  node.addEventListener('focus', () => { node.dataset.before = state[key]; });
  node.addEventListener('change', () => {
    const before = node.dataset.before;
    const value = node.value;
    state[key] = before;
    commit((next) => { next[key] = value; });
  });
  node.addEventListener('input', (event) => {
    state[key] = event.target.value;
    dirty = true;
    $('hint').hidden = true;
    paint();
  });
}

function bindRange(id, read) {
  const node = $(id);
  node.addEventListener('pointerdown', () => { if (!node.dataset.open) { remember(); node.dataset.open = '1'; } });
  node.addEventListener('pointerup', () => { node.dataset.open = ''; });
  node.addEventListener('input', (event) => {
    read(state, Number(event.target.value));
    dirty = true;
    $('hint').hidden = true;
    paint();
  });
}

function bindKeys() {
  document.addEventListener('keydown', (event) => {
    const typing = /input|textarea|select/i.test(event.target.tagName);
    const meta = event.metaKey || event.ctrlKey;
    if (meta && event.key.toLowerCase() === 'z') {
      event.preventDefault();
      if (event.shiftKey) redo();
      else undo();
      return;
    }
    if (typing) return;
    if (event.key >= '1' && event.key <= '8') {
      const layout = LAYOUTS[Number(event.key) - 1];
      commit((next) => { applyLayout(next, layout); });
    } else if (event.key.toLowerCase() === 'e') {
      event.preventDefault();
      runExport(state.size);
    } else if (event.key === '+' || event.key === '=') {
      stage.zoom = Math.min(2, stage.zoom + 0.1);
      paint();
    } else if (event.key === '-' || event.key === '_') {
      stage.zoom = Math.max(0.4, stage.zoom - 0.1);
      paint();
    }
  });
}

function drawExport(ctx, next) {
  next.photos = orderedPhotos().map((photo) => photo.image);
  renderPreview(ctx.canvas, next);
}

function runExport(size, opts = {}) {
  const log = $('export-log');
  log.textContent = 'Rendering…';
  const name = opts.filename || $('export-name').value;
  return exportCover(state, size, name, {
    renderCover: drawExport,
    download: opts.download,
    onProgress(info) { log.textContent = `${info.phase} ${info.filename}`; },
  }).then((result) => {
    if (opts.download === false) return result;
    return result;
  }).catch((error) => { log.textContent = error.message; throw error; });
}

function bindExport() {
  document.querySelectorAll('[data-export]').forEach((button) => {
    button.addEventListener('click', () => {
      const [w, h] = button.dataset.export.split('x').map(Number);
      runExport({ w, h });
    });
  });
  $('export-all').addEventListener('click', () => {
    const log = $('export-log');
    log.textContent = 'Rendering…';
    exportAll(state, {
      renderCover(ctx, next) {
        next.photos = orderedPhotos().map((photo) => photo.image);
        renderPreview(ctx.canvas, next);
      },
      onProgress(info) { log.textContent = `${info.index}/${info.total} ${info.filename}`; },
    }).catch((error) => { log.textContent = error.message; });
  });
}

function bindRails() {
  document.querySelectorAll('#layout-list button').forEach((button) => {
    button.addEventListener('click', () => {
      const layout = LAYOUTS.find((item) => item.id === button.dataset.layout);
      commit((next) => { applyLayout(next, layout); });
    });
  });
  document.querySelectorAll('#size-row button').forEach((button) => {
    button.addEventListener('click', () => {
      const [w, h] = button.dataset.size.split('x').map(Number);
      commit((next) => { next.size = { w, h }; });
    });
  });
  document.querySelectorAll('#grade-list button').forEach((button) => {
    button.addEventListener('click', () => {
      commit((next) => { next.gradeId = button.dataset.grade; });
    });
  });
  bindText('field-title', 'title');
  bindText('field-subtitle', 'subtitle');
  bindText('field-tagline', 'tagline');
  bindText('field-issue', 'issue');
  bindText('field-rating', 'rating');
  bindRange('title-scale', (next, value) => { next.titleScale = value; });
  bindRange('title-rotate', (next, value) => { next.titleRotate = value; });
  $('title-align').addEventListener('change', (event) => {
    commit((next) => { next.titleAlign = event.target.value; });
  });
  $('caption-align').addEventListener('change', (event) => {
    commit((next) => { next.captionAlign = event.target.value; });
  });
  ['brightness', 'contrast', 'saturation', 'temperature', 'highlights', 'shadows'].forEach((key) => {
    bindRange(`adjust-${key}`, (next, value) => { next.adjust[key] = value; });
  });
  ['grain', 'vignette', 'bloom', 'leak'].forEach((key) => {
    bindRange(`effect-${key}`, (next, value) => { next[key] = value; });
  });
}

function bindStage() {
  $('zoom-out').addEventListener('click', () => { stage.zoom = Math.max(0.4, stage.zoom - 0.1); paint(); });
  $('zoom-in').addEventListener('click', () => { stage.zoom = Math.min(2, stage.zoom + 0.1); paint(); });
  $('undo').addEventListener('click', undo);
  $('redo').addEventListener('click', redo);
  const compare = $('compare');
  const hold = (down) => {
    compare.addEventListener(down ? 'pointerdown' : 'pointerup', () => {
      state.compare = down;
      paint();
    });
  };
  hold(true);
  hold(false);
  compare.addEventListener('pointerleave', () => { state.compare = false; paint(); });
  document.addEventListener('keydown', (event) => {
    if (event.code === 'Space' && event.target === document.body) {
      event.preventDefault();
      state.compare = true;
      paint();
    }
  });
  document.addEventListener('keyup', (event) => {
    if (event.code === 'Space') { state.compare = false; paint(); }
  });
}

function bindIntake() {
  $('photo-input').addEventListener('change', (event) => addFiles(event.target.files));
  const stageEl = $('stage');
  stageEl.addEventListener('dragover', (event) => event.preventDefault());
  stageEl.addEventListener('drop', (event) => {
    event.preventDefault();
    addFiles(event.dataTransfer.files);
  });
  document.addEventListener('paste', (event) => {
    const files = [...(event.clipboardData?.files || [])];
    if (files.length) addFiles(files);
  });
}

export async function bootStudio() {
  const shot = new URLSearchParams(location.search).get('shot');
  state = freshState();
  if (shot && SHOTS[shot]) applyShot(shot);
  const names = shot && SHOTS[shot] ? SHOTS[shot].photos : SAMPLES.slice(0, 4);
  await loadSamples(names);
  if (!(shot && SHOTS[shot])) {
    state.panels.forEach((panel, index) => { panel.photoId = names[index % names.length]; });
  }
  bindCanvas();
  bindRails();
  bindStage();
  bindIntake();
  bindExport();
  bindKeys();
  syncControls();
  paint();
  window.__shotReady = true;
  window.__metrics = () => lastMetrics();
  const ready = Promise.resolve(state);
  window.__studio = {
    ready,
    get state() { return state; },
    set state(next) { state = next; },
    get photos() { return photos; },
    checkpoint() { snapshotNow(); },
    async render() { paint(); return state; },
    async setLayout(id) {
      const layout = LAYOUTS.find((item) => item.id === id);
      if (!layout) throw new Error(`unknown layout ${id}`);
      commit((next) => { applyLayout(next, layout); });
      return state;
    },
    async setGrade(id) {
      commit((next) => { next.gradeId = id; });
      return state;
    },
    async undo() { undo(); return state; },
    async redo() { redo(); return state; },
    async exportSize(w, h, opts = {}) {
      return runExport({ w, h }, opts);
    },
  };
  return state;
}

if (!painting) bootStudio();
