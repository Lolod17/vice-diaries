// Wires the rails, the stage and the keyboard to the studio state. Every change
// goes through `commit`, which keeps a 40-step history and repaints.

import './shots.js';
import { LAYOUTS, layoutById } from './poster-layouts.js';
import { GRADES } from './color-grade.js';
import { exportCover, exportAll, fileName } from './cover-export.js';

const SAMPLES = [
  'pier', 'boulevard', 'hotel-dusk', 'marina-night',
  'chrome-promenade', 'convertible-sunset', 'neon-crew',
];

const SHOTS = {
  cover: { layout: 'vice-classic', size: '1920x1080', grade: 'vice-sunset' },
  portrait: { layout: 'sunset-stories', size: '1080x1350', grade: 'miami-heat' },
  square: { layout: 'miami-lifestyle', size: '1080x1080', grade: 'tropical-gold' },
};

const SIZES = {
  '1080x1080': { w: 1080, h: 1080 },
  '1080x1350': { w: 1080, h: 1350 },
  '1920x1080': { w: 1920, h: 1080 },
};

const CAPTIONS = ['THE CAUSEWAY', 'NIGHT MARKET', 'PALM DRIVE', 'LAST LIGHT', 'OPEN WATER', 'MAIN STRIP'];
const TIMECODES = ['01:24:01', '01:24:18', '01:25:02', '01:26:44', '01:27:11', '01:28:05'];

const ADJUST = [
  ['brightness', 'Brightness'],
  ['contrast', 'Contrast'],
  ['saturation', 'Saturation'],
  ['temperature', 'Temperature'],
  ['highlights', 'Highlights'],
  ['shadows', 'Shadows'],
];

const EFFECTS = [
  ['grain', 'Grain'],
  ['vignette', 'Vignette'],
  ['bloom', 'Bloom'],
  ['leak', 'Light leak'],
];

let studio = null;
let selected = 0;
let stageZoom = 1;
let comparing = false;
let drag = null;

const $ = (sel) => document.querySelector(sel);

function state() {
  return studio.state;
}

function paint() {
  return studio.render();
}

function remember(change) {
  studio.checkpoint();
  change();
  hideHint();
  return paint();
}

function hideHint() {
  const hint = $('#hint');
  if (hint) hint.hidden = true;
}

function press(buttons, match) {
  buttons.forEach((button) => {
    button.setAttribute('aria-pressed', String(match(button)));
  });
}

function syncRails() {
  const s = state();
  press(document.querySelectorAll('[data-layout]'), (b) => b.dataset.layout === s.layoutId);
  press(document.querySelectorAll('[data-size]'), (b) => b.dataset.size === `${s.size.w}x${s.size.h}`);
  press(document.querySelectorAll('[data-grade]'), (b) => b.dataset.grade === s.gradeId);
  const lettering = $('#section-lettering');
  if (!lettering) return;
  lettering.querySelector('[data-field="title"]').value = s.title;
  lettering.querySelector('[data-field="subtitle"]').value = s.subtitle;
  lettering.querySelector('[data-field="tagline"]').value = s.tagline;
  lettering.querySelector('[data-field="issue"]').value = s.issue;
  lettering.querySelector('[data-field="rating"]').value = s.rating;
  lettering.querySelector('[data-field="titleScale"]').value = s.titleScale;
  lettering.querySelector('[data-field="titleRotate"]').value = s.titleRotate;
  press(lettering.querySelectorAll('[data-align]'), (b) => b.dataset.align === s.titleAlign);
  const grade = $('#section-grade');
  ADJUST.forEach(([key]) => {
    const input = grade.querySelector(`[data-adjust="${key}"]`);
    if (input) input.value = s.adjust[key];
  });
  EFFECTS.forEach(([key]) => {
    const input = grade.querySelector(`[data-effect="${key}"]`);
    if (input) input.value = s[key];
  });
  const panel = s.panels[selected] || {};
  const box = $('#panel-controls');
  if (box) {
    box.querySelector('[data-panel="zoom"]').value = panel.zoom ?? 1;
    box.querySelector('[data-panel="focusX"]').value = panel.focusX ?? 0.5;
    box.querySelector('[data-panel="focusY"]').value = panel.focusY ?? 0.5;
    box.querySelector('[data-panel="rotate"]').value = panel.rotate ?? 0;
    const label = box.querySelector('[data-panel-label]');
    if (label) label.textContent = `Panel ${selected + 1}`;
  }
  const name = $('#section-export input[type="text"]');
  if (name && document.activeElement !== name) name.value = fileName(s, s.size);
}

function applyStageZoom() {
  const canvas = $('#preview');
  if (!canvas) return;
  canvas.style.transform = stageZoom === 1 ? '' : `scale(${stageZoom})`;
  const label = $('#zoom-label');
  if (label) label.textContent = stageZoom === 1 ? 'Fit' : `${Math.round(stageZoom * 100)}%`;
}

function loadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`photo failed: ${src}`));
    img.src = src;
  });
}

function addPhoto(id, name, image) {
  const s = state();
  const existing = s.photos.find((photo) => photo.id === id);
  if (existing) existing.image = image;
  else s.photos.push({ id, name, image });
  const slot = s.panels.find((panel) => !panel.photoId) || s.panels[0];
  if (slot && !slot.photoId) slot.photoId = id;
}

async function loadSamples() {
  const loaded = await Promise.all(SAMPLES.map(async (name) => {
    const image = await loadImage(`samples/${name}.jpg`);
    return { id: name, name: `${name}.jpg`, image };
  }));
  const s = state();
  s.photos = loaded;
  const layout = layoutById(s.layoutId);
  s.panels.forEach((panel, index) => {
    const photo = loaded[index % loaded.length];
    panel.photoId = photo.id;
    panel.caption = CAPTIONS[index % CAPTIONS.length];
    panel.timecode = TIMECODES[index % TIMECODES.length];
    panel.rotate = layout.panels[index] ? layout.panels[index].rotate || 0 : 0;
  });
}

function applyShot(params) {
  const scene = SHOTS[params.get('shot')];
  if (!scene) return;
  const s = state();
  s.layoutId = scene.layout;
  s.gradeId = scene.grade;
  s.size = { ...SIZES[scene.size] };
  const picks = [0, 2, 4, 6].map((index) => s.photos[index]).filter(Boolean);
  const layout = layoutById(scene.layout);
  s.panels.forEach((panel, index) => {
    const photo = picks[index % picks.length];
    panel.photoId = photo ? photo.id : null;
    panel.caption = CAPTIONS[index % CAPTIONS.length];
    panel.timecode = TIMECODES[index % TIMECODES.length];
    panel.rotate = layout.panels[index] ? layout.panels[index].rotate || 0 : 0;
  });
  document.body.classList.add('shot-frame');
}

function renderStrip() {
  const strip = $('#photo-strip');
  if (!strip) return;
  strip.textContent = '';
  state().photos.forEach((photo) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'thumb';
    button.title = photo.name;
    const img = document.createElement('img');
    img.alt = photo.name;
    img.src = photo.image.src;
    button.append(img);
    const remove = document.createElement('button');
    remove.type = 'button';
    remove.className = 'thumb-remove';
    remove.textContent = '×';
    remove.addEventListener('click', (event) => {
      event.stopPropagation();
      remember(() => {
        state().photos = state().photos.filter((item) => item.id !== photo.id);
        state().panels.forEach((panel) => {
          if (panel.photoId === photo.id) panel.photoId = null;
        });
      });
      renderStrip();
    });
    button.append(remove);
    button.addEventListener('click', () => {
      remember(() => { state().panels[selected].photoId = photo.id; });
    });
    strip.append(button);
  });
}

async function takeFiles(files) {
  const accepted = [...files].filter((file) => /image\/(jpeg|png|webp)/.test(file.type));
  if (!accepted.length) return;
  studio.checkpoint();
  for (const file of accepted) {
    const image = await createImageBitmap(file);
    const id = `upload-${file.name}-${file.size}`;
    addPhoto(id, file.name, image);
  }
  hideHint();
  renderStrip();
  await paint();
  syncRails();
}

function canvasPoint(event) {
  const canvas = $('#preview');
  const box = canvas.getBoundingClientRect();
  return {
    x: (event.clientX - box.left) / box.width,
    y: (event.clientY - box.top) / box.height,
  };
}

function panelAt(point) {
  const layout = layoutById(state().layoutId);
  const w = state().size.w;
  const h = state().size.h;
  for (let i = layout.panels.length - 1; i >= 0; i -= 1) {
    const slot = layout.panels[i];
    if (slot.kind === 'field' || slot.kind === 'bleed') continue;
    const x = slot.x * w;
    const y = slot.y * h;
    if (point.x * w >= x && point.x * w <= x + slot.w * w && point.y * h >= y && point.y * h <= y + slot.h * h) {
      return i;
    }
  }
  return -1;
}

function bindStage() {
  const stage = $('#stage');
  const canvas = $('#preview');
  stage.addEventListener('dragover', (event) => event.preventDefault());
  stage.addEventListener('drop', (event) => {
    event.preventDefault();
    takeFiles(event.dataTransfer.files);
  });
  canvas.addEventListener('pointerdown', (event) => {
    const point = canvasPoint(event);
    const index = panelAt(point);
    if (index < 0) return;
    selected = index;
    const panel = state().panels[selected];
    drag = { id: event.pointerId, focusX: panel.focusX, focusY: panel.focusY, x: point.x, y: point.y };
    canvas.setPointerCapture(event.pointerId);
    studio.checkpoint();
    syncRails();
  });
  canvas.addEventListener('pointermove', (event) => {
    if (!drag || event.pointerId !== drag.id) return;
    const point = canvasPoint(event);
    const panel = state().panels[selected];
    panel.focusX = Math.min(1, Math.max(0, drag.focusX - (point.x - drag.x)));
    panel.focusY = Math.min(1, Math.max(0, drag.focusY - (point.y - drag.y)));
    paint();
  });
  canvas.addEventListener('pointerup', () => { drag = null; });
  canvas.addEventListener('wheel', (event) => {
    if (panelAt(canvasPoint(event)) < 0) return;
    event.preventDefault();
    const panel = state().panels[selected];
    studio.checkpoint();
    panel.zoom = Math.min(3, Math.max(1, (panel.zoom || 1) + (event.deltaY < 0 ? 0.1 : -0.1)));
    paint();
    syncRails();
  }, { passive: false });
  window.addEventListener('paste', (event) => {
    const files = [...(event.clipboardData?.files || [])];
    if (files.length) takeFiles(files);
  });
}

function field(label, key, type, attrs) {
  const wrap = document.createElement('label');
  wrap.className = type === 'range' ? 'slider' : 'field';
  wrap.append(document.createTextNode(label));
  const input = document.createElement('input');
  input.type = type;
  input.dataset.field = key;
  Object.entries(attrs).forEach(([name, value]) => input.setAttribute(name, value));
  wrap.append(input);
  return wrap;
}

function buildPanelControls() {
  const section = document.createElement('section');
  section.id = 'panel-controls';
  section.className = 'rail-block';
  const heading = document.createElement('h2');
  heading.dataset.panelLabel = '1';
  heading.textContent = 'Panel 1';
  section.append(heading);
  [['zoom', 'Zoom', '1', '3', '0.05'], ['focusX', 'Focus X', '0', '1', '0.01'],
    ['focusY', 'Focus Y', '0', '1', '0.01'], ['rotate', 'Rotate', '-15', '15', '0.5']]
    .forEach(([key, label, min, max, step]) => {
      const wrap = field(`${label}`, key, 'range', { min, max, step });
      wrap.querySelector('input').dataset.panel = key;
      wrap.querySelector('input').removeAttribute('data-field');
      section.append(wrap);
    });
  const reset = document.createElement('button');
  reset.type = 'button';
  reset.className = 'action action-alt';
  reset.textContent = 'Reset frame';
  reset.addEventListener('click', () => {
    remember(() => {
      Object.assign(state().panels[selected], { zoom: 1, focusX: 0.5, focusY: 0.5, rotate: 0 });
    });
    syncRails();
  });
  section.append(reset);
  section.addEventListener('input', (event) => {
    const key = event.target.dataset.panel;
    if (!key) return;
    remember(() => { state().panels[selected][key] = Number(event.target.value); });
  });
  $('#rail-right').prepend(section);
}

function buildLettering() {
  const section = $('#section-lettering');
  const text = section.querySelectorAll('input[type="text"]');
  ['title', 'subtitle', 'tagline', 'issue', 'rating'].forEach((key, index) => {
    text[index].dataset.field = key;
  });
  const ranges = section.querySelectorAll('input[type="range"]');
  ['titleScale', 'titleRotate'].forEach((key, index) => { ranges[index].dataset.field = key; });
  section.querySelectorAll('.chip').forEach((button, index) => {
    button.dataset.align = ['left', 'center', 'right'][index];
  });
  section.addEventListener('input', (event) => {
    const key = event.target.dataset.field;
    if (!key) return;
    const value = event.target.type === 'range' ? Number(event.target.value) : event.target.value;
    remember(() => { state()[key] = value; });
  });
  section.addEventListener('click', (event) => {
    const align = event.target.dataset.align;
    if (!align) return;
    remember(() => { state().titleAlign = align; });
    syncRails();
  });
}

function buildGrade() {
  const section = $('#section-grade');
  const sliders = section.querySelectorAll('input[type="range"]');
  [...ADJUST.map(([key]) => key), ...EFFECTS.map(([key]) => key)].forEach((key, index) => {
    if (ADJUST.some(([name]) => name === key)) sliders[index].dataset.adjust = key;
    else sliders[index].dataset.effect = key;
  });
  section.addEventListener('input', (event) => {
    const adjust = event.target.dataset.adjust;
    const effect = event.target.dataset.effect;
    if (!adjust && !effect) return;
    remember(() => {
      if (adjust) state().adjust[adjust] = Number(event.target.value);
      else state()[effect] = Number(event.target.value);
    });
  });
}

function logExport(name) {
  const list = $('#export-log');
  if (!list) return;
  const item = document.createElement('li');
  item.textContent = name;
  list.prepend(item);
}

function buildExport() {
  const section = $('#section-export');
  const [one, all] = section.querySelectorAll('.action');
  one.id = 'export-png';
  one.addEventListener('click', async () => {
    one.disabled = true;
    one.textContent = 'Rendering…';
    const name = section.querySelector('input[type="text"]').value.trim() || fileName(state(), state().size);
    const result = await exportCover(state(), state().size, { name });
    logExport(`${result.name} · ${result.bytes} bytes`);
    one.textContent = 'Export PNG';
    one.disabled = false;
  });
  all.addEventListener('click', async () => {
    all.disabled = true;
    const results = await exportAll(state());
    results.forEach((result) => logExport(result.name));
    all.disabled = false;
  });
}

function bindKeyboard() {
  window.addEventListener('keydown', (event) => {
    const typing = /^(INPUT|TEXTAREA)$/.test(event.target.tagName);
    if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'z') {
      event.preventDefault();
      if (event.shiftKey) redo();
      else undo();
      return;
    }
    if (typing) return;
    if (event.key >= '1' && event.key <= '8') {
      const layout = LAYOUTS[Number(event.key) - 1];
      if (layout) remember(() => { state().layoutId = layout.id; state().gradeId = layout.defaultGrade; });
      syncRails();
    } else if (event.key.toLowerCase() === 'e') {
      $('#export-png').click();
    } else if (event.key === '+' || event.key === '=') {
      stageZoom = Math.min(3, stageZoom + 0.25);
      applyStageZoom();
    } else if (event.key === '-' || event.key === '_') {
      stageZoom = Math.max(0.5, stageZoom - 0.25);
      applyStageZoom();
    } else if (event.key === ' ') {
      event.preventDefault();
      comparing = true;
      state().compare = true;
      paint();
    }
  });
  window.addEventListener('keyup', (event) => {
    if (event.key === ' ' && comparing) {
      comparing = false;
      state().compare = false;
      paint();
    }
  });
}

function undo() {
  studio.undo();
  syncRails();
  renderStrip();
}

function redo() {
  studio.redo();
  syncRails();
  renderStrip();
}

function bindChrome() {
  document.querySelectorAll('[data-layout]').forEach((button) => {
    button.addEventListener('click', () => {
      const layout = layoutById(button.dataset.layout);
      remember(() => { state().layoutId = layout.id; state().gradeId = layout.defaultGrade; });
      syncRails();
    });
  });
  document.querySelectorAll('[data-size]').forEach((button) => {
    button.addEventListener('click', () => {
      remember(() => { state().size = { ...SIZES[button.dataset.size] }; });
      syncRails();
    });
  });
  document.querySelectorAll('[data-grade]').forEach((button) => {
    button.addEventListener('click', () => {
      remember(() => { state().gradeId = button.dataset.grade; });
      syncRails();
    });
  });
  $('#undo').addEventListener('click', undo);
  $('#redo').addEventListener('click', redo);
  const compare = $('#compare');
  compare.addEventListener('pointerdown', () => { state().compare = true; paint(); compare.setAttribute('aria-pressed', 'true'); });
  compare.addEventListener('pointerup', () => { state().compare = false; paint(); compare.setAttribute('aria-pressed', 'false'); });
  $('#zoom-in').addEventListener('click', () => { stageZoom = Math.min(3, stageZoom + 0.25); applyStageZoom(); });
  $('#zoom-out').addEventListener('click', () => { stageZoom = Math.max(0.5, stageZoom - 0.25); applyStageZoom(); });
  $('#photo-input').addEventListener('change', (event) => takeFiles(event.target.files));
}

export async function bootStudio() {
  const deadline = Date.now() + 8000;
  while (!window.__studio && Date.now() < deadline) await new Promise((r) => setTimeout(r, 50));
  studio = window.__studio;
  await studio.ready;
  buildPanelControls();
  buildLettering();
  buildGrade();
  buildExport();
  bindChrome();
  bindStage();
  bindKeyboard();
  await loadSamples();
  applyShot(new URLSearchParams(location.search));
  await paint();
  syncRails();
  renderStrip();
  return studio.ready;
}

bootStudio();

void GRADES;
