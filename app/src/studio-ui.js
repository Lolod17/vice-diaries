import { LAYOUTS, layoutById } from './poster-layouts.js';
import { GRADES } from './color-grade.js';
import { renderPreview } from './cover-render.js';
import { exportCover, exportAll } from './cover-export.js';
import { shootState } from './shots.js';

const SAMPLES = [
  'boulevard.jpg',
  'pier.jpg',
  'convertible-sunset.jpg',
  'marina-night.jpg',
  'hotel-dusk.jpg',
  'neon-crew.jpg',
  'chrome-promenade.jpg',
];

const CAPTIONS = [
  ['01:14:02', 'THE BOULEVARD'],
  ['01:22:40', 'LAST LIGHT'],
  ['01:41:18', 'NO WAY HOME'],
  ['02:03:55', 'AFTER HOURS'],
  ['02:16:07', 'ROOM WITH A VIEW'],
  ['02:28:33', 'THE CREW'],
];

const HISTORY = 40;

const $ = (id) => document.getElementById(id);

function clone(state) {
  return {
    ...state,
    size: { ...state.size },
    adjust: { ...state.adjust },
    panels: state.panels.map((panel) => ({ ...panel })),
  };
}

function blankState() {
  return {
    layoutId: 'vice-classic',
    size: { w: 1080, h: 1080 },
    title: 'VICE DIARIES',
    subtitle: 'a night on the boulevard',
    tagline: 'THE NIGHT IS OURS',
    issue: '01',
    rating: 'M',
    panels: CAPTIONS.map(([timecode, caption], index) => ({
      photoId: SAMPLES[index].replace(/\.jpg$/, ''),
      zoom: 1,
      focusX: 0.5,
      focusY: 0.42,
      rotate: 0,
      fit: 'cover',
      timecode,
      caption,
    })),
    gradeId: 'vice-sunset',
    grain: 25,
    vignette: 36,
    bloom: 18,
    leak: 15,
    adjust: { brightness: 0, contrast: 0, saturation: 0, temperature: 0, highlights: 0, shadows: 0 },
    titleScale: 1,
    titleRotate: 0,
    titleAlign: 'left',
    captionAlign: 'left',
    showCredits: true,
    photos: [],
    selected: 0,
    stageZoom: 1,
    compare: false,
    dirty: false,
  };
}

const state = blankState();
const past = [];
const future = [];
let drawing = null;
let photoSerial = 0;

function snapshot() {
  return JSON.stringify({
    layoutId: state.layoutId,
    size: state.size,
    title: state.title,
    subtitle: state.subtitle,
    tagline: state.tagline,
    issue: state.issue,
    rating: state.rating,
    panels: state.panels,
    gradeId: state.gradeId,
    grain: state.grain,
    vignette: state.vignette,
    bloom: state.bloom,
    leak: state.leak,
    adjust: state.adjust,
    titleScale: state.titleScale,
    titleRotate: state.titleRotate,
    titleAlign: state.titleAlign,
    captionAlign: state.captionAlign,
    showCredits: state.showCredits,
    selected: state.selected,
  });
}

function remember() {
  past.push(snapshot());
  if (past.length > HISTORY) past.shift();
  future.length = 0;
  state.dirty = true;
  syncHistoryButtons();
  const hint = $('hint');
  if (hint) hint.hidden = true;
}

function restore(json) {
  const data = JSON.parse(json);
  Object.assign(state, data, { size: data.size, adjust: data.adjust, panels: data.panels });
  syncControls();
  draw();
}

function undo() {
  if (!past.length) return;
  future.push(snapshot());
  restore(past.pop());
  syncHistoryButtons();
}

function redo() {
  if (!future.length) return;
  past.push(snapshot());
  restore(future.pop());
  syncHistoryButtons();
}

function syncHistoryButtons() {
  $('undo').disabled = past.length === 0;
  $('redo').disabled = future.length === 0;
}

function layout() {
  return layoutById(state.layoutId) || LAYOUTS[0];
}

function photoPanels() {
  return layout().panels.filter((panel) => panel.kind !== 'field');
}

function commit(mutator) {
  remember();
  mutator();
  syncControls();
  draw();
}

function loadImage(src) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error(`image failed: ${src}`));
    image.src = src;
  });
}

async function addSample(name) {
  const stem = name.replace(/\.jpg$/i, '');
  if (state.photos.some((photo) => photo.id === stem)) return;
  const image = await loadImage(`./samples/${name}`);
  state.photos.push({ id: stem, name, image, sample: true });
}

async function addFiles(fileList) {
  const files = [...fileList].filter((file) => /image\/(jpeg|png|webp)/.test(file.type));
  if (!files.length) return;
  remember();
  for (const file of files) {
    const url = URL.createObjectURL(file);
    const image = await loadImage(url);
    photoSerial += 1;
    const photo = { id: `upload-${photoSerial}`, name: file.name, image, sample: false, url };
    state.photos.push(photo);
    const target = state.panels[Math.min(state.selected + photoSerial - 1, state.panels.length - 1)] || state.panels[0];
    if (target) target.photoId = photo.id;
  }
  state.dirty = true;
  $('hint').hidden = true;
  syncPhotos();
  draw();
}

function removePhoto(id) {
  const index = state.photos.findIndex((photo) => photo.id === id);
  if (index < 0) return;
  remember();
  const [removed] = state.photos.splice(index, 1);
  if (removed.url) URL.revokeObjectURL(removed.url);
  const fallback = state.photos[0]?.id || null;
  state.panels.forEach((panel) => {
    if (panel.photoId === id) panel.photoId = fallback;
  });
  syncPhotos();
  draw();
}

function useInPanel(id) {
  remember();
  const panel = state.panels[state.selected] || state.panels[0];
  if (panel) panel.photoId = id;
  syncPhotos();
  draw();
}

function syncPhotos() {
  const strip = $('photo-strip');
  strip.replaceChildren();
  state.photos.forEach((photo, index) => {
    const card = document.createElement('figure');
    card.className = 'thumb';
    const img = document.createElement('img');
    img.src = photo.image.src;
    img.alt = photo.name;
    const use = document.createElement('button');
    use.type = 'button';
    use.className = 'chip';
    use.textContent = `Panel ${(state.selected ?? 0) + 1}`;
    use.addEventListener('click', () => useInPanel(photo.id));
    const drop = document.createElement('button');
    drop.type = 'button';
    drop.className = 'chip';
    drop.textContent = 'Remove';
    drop.addEventListener('click', () => removePhoto(photo.id));
    card.append(img, use, drop);
    card.dataset.index = String(index);
    strip.append(card);
  });
}

function syncPressed(selector, attr, value) {
  document.querySelectorAll(selector).forEach((button) => {
    button.setAttribute('aria-pressed', String(button.dataset[attr] === value));
  });
}

function syncControls() {
  $('title').value = state.title;
  $('subtitle').value = state.subtitle;
  $('tagline').value = state.tagline;
  $('issue').value = state.issue;
  $('rating').value = state.rating;
  $('title-scale').value = state.titleScale;
  $('title-rotate').value = state.titleRotate;
  $('title-align').value = state.titleAlign;
  $('caption-align').value = state.captionAlign;
  $('show-credits').checked = state.showCredits;
  $('grain').value = state.grain;
  $('vignette').value = state.vignette;
  $('bloom').value = state.bloom;
  $('leak').value = state.leak;
  for (const key of Object.keys(state.adjust)) $(key).value = state.adjust[key];
  syncPressed('[data-layout]', 'layout', state.layoutId);
  syncPressed('[data-grade]', 'grade', state.gradeId);
  syncPressed('[data-size]', 'size', `${state.size.w}x${state.size.h}`);
  const panel = state.panels[state.selected];
  const section = $('section-panel');
  if (panel) {
    section.hidden = false;
    $('panel-zoom').value = panel.zoom;
    $('panel-focus-x').value = panel.focusX;
    $('panel-focus-y').value = panel.focusY;
    $('panel-rotate').value = panel.rotate;
    $('panel-caption').value = panel.caption;
    $('panel-timecode').value = panel.timecode;
  }
  const zoom = state.stageZoom;
  $('zoom-label').textContent = zoom === 1 ? 'Fit' : `${Math.round(zoom * 100)}%`;
  const file = `${slug(state.title)}-${state.layoutId}-${state.size.w}x${state.size.h}.png`;
  if (!state.filenameEdited) $('export-filename').value = file;
  applyStageZoom();
}

function slug(value) {
  return String(value || 'cover').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'cover';
}

function applyStageZoom() {
  const canvas = $('preview');
  const view = canvas.parentElement.getBoundingClientRect();
  const fit = Math.min(view.width / state.size.w, view.height / state.size.h) || 1;
  const scale = fit * state.stageZoom;
  canvas.style.width = `${Math.round(state.size.w * scale)}px`;
  canvas.style.height = `${Math.round(state.size.h * scale)}px`;
  canvas.style.maxWidth = 'none';
  canvas.style.maxHeight = 'none';
}

function draw() {
  const canvas = $('preview');
  const job = renderPreview(canvas, state, { compare: state.compare });
  drawing = Promise.resolve(job).then(() => {
    applyStageZoom();
  }).catch((error) => {
    console.error(error);
  });
  return drawing;
}

function canvasPoint(event) {
  const canvas = $('preview');
  const box = canvas.getBoundingClientRect();
  return {
    x: ((event.clientX - box.left) / box.width) * canvas.width,
    y: ((event.clientY - box.top) / box.height) * canvas.height,
  };
}

function hitPanel(point) {
  const panels = photoPanels();
  const { w, h } = state.size;
  for (let i = panels.length - 1; i >= 0; i -= 1) {
    const panel = panels[i];
    if (panel.kind === 'plate' && panel.border === 0) continue;
    const x = panel.x * w;
    const y = panel.y * h;
    if (point.x >= x && point.x <= x + panel.w * w && point.y >= y && point.y <= y + panel.h * h) {
      return panel.slot ?? i;
    }
  }
  return null;
}

function bindCanvas() {
  const canvas = $('preview');
  let drag = null;
  canvas.addEventListener('pointerdown', (event) => {
    const point = canvasPoint(event);
    const slot = hitPanel(point);
    if (slot == null) return;
    state.selected = slot;
    syncControls();
    const panel = state.panels[slot];
    drag = { slot, x: point.x, y: point.y, focusX: panel.focusX, focusY: panel.focusY, moved: false };
    canvas.setPointerCapture(event.pointerId);
  });
  canvas.addEventListener('pointermove', (event) => {
    if (!drag) return;
    const point = canvasPoint(event);
    const dx = point.x - drag.x;
    const dy = point.y - drag.y;
    if (Math.hypot(dx, dy) < 3) return;
    if (!drag.moved) {
      remember();
      drag.moved = true;
    }
    const panel = state.panels[drag.slot];
    const rect = photoPanels().find((entry) => (entry.slot ?? 0) === drag.slot);
    const span = rect ? rect.w * state.size.w : state.size.w;
    panel.focusX = clamp01(drag.focusX - dx / span);
    panel.focusY = clamp01(drag.focusY - dy / (rect ? rect.h * state.size.h : state.size.h));
    syncControls();
    draw();
  });
  const end = () => { drag = null; };
  canvas.addEventListener('pointerup', end);
  canvas.addEventListener('pointercancel', end);
  canvas.addEventListener('wheel', (event) => {
    if (state.selected == null) return;
    event.preventDefault();
    const panel = state.panels[state.selected];
    if (!panel) return;
    remember();
    const delta = event.deltaY > 0 ? -0.06 : 0.06;
    panel.zoom = clamp(panel.zoom + delta, 1, 3);
    syncControls();
    draw();
  }, { passive: false });
}

function clamp(value, lo, hi) {
  return Math.min(hi, Math.max(lo, value));
}

function clamp01(value) {
  return clamp(value, 0, 1);
}

function bindField(id, read, write) {
  const node = $(id);
  let last = read(node);
  const apply = () => {
    const next = read(node);
    if (Object.is(next, last)) return;
    last = next;
    remember();
    write(next);
    draw();
  };
  node.addEventListener('change', apply);
  if (node.type === 'range' || node.type === 'text') node.addEventListener('input', apply);
}

function bindRails() {
  document.querySelectorAll('[data-layout]').forEach((button) => {
    button.addEventListener('click', () => {
      const id = button.dataset.layout;
      if (id === state.layoutId) return;
      const next = layoutById(id);
      remember();
      state.layoutId = id;
      if (next?.defaultGrade) state.gradeId = next.defaultGrade;
      const count = next.panels.filter((panel) => panel.kind === 'photo').length;
      while (state.panels.length < count) {
        const i = state.panels.length;
        const pair = CAPTIONS[i % CAPTIONS.length];
        state.panels.push({
          photoId: state.photos[i % Math.max(1, state.photos.length)]?.id || null,
          zoom: 1, focusX: 0.5, focusY: 0.42, rotate: 0, fit: 'cover',
          timecode: pair[0], caption: pair[1],
        });
      }
      syncControls();
      draw();
    });
  });
  document.querySelectorAll('[data-size]').forEach((button) => {
    button.addEventListener('click', () => {
      const [w, h] = button.dataset.size.split('x').map(Number);
      if (state.size.w === w && state.size.h === h) return;
      remember();
      state.size = { w, h };
      syncControls();
      draw();
    });
  });
  document.querySelectorAll('[data-grade]').forEach((button) => {
    button.addEventListener('click', () => {
      if (button.dataset.grade === state.gradeId) return;
      remember();
      state.gradeId = button.dataset.grade;
      syncControls();
      draw();
    });
  });

  bindField('title', (node) => node.value, (value) => { state.title = value; });
  bindField('subtitle', (node) => node.value, (value) => { state.subtitle = value; });
  bindField('tagline', (node) => node.value, (value) => { state.tagline = value; });
  bindField('issue', (node) => node.value, (value) => { state.issue = value; });
  bindField('rating', (node) => node.value.slice(0, 1).toUpperCase(), (value) => { state.rating = value; });
  bindField('title-scale', (node) => Number(node.value), (value) => { state.titleScale = value; });
  bindField('title-rotate', (node) => Number(node.value), (value) => { state.titleRotate = value; });
  bindField('title-align', (node) => node.value, (value) => { state.titleAlign = value; });
  bindField('caption-align', (node) => node.value, (value) => { state.captionAlign = value; });
  $('show-credits').addEventListener('change', () => {
    remember();
    state.showCredits = $('show-credits').checked;
    draw();
  });

  for (const key of ['brightness', 'contrast', 'saturation', 'temperature', 'highlights', 'shadows']) {
    bindField(key, (node) => Number(node.value), (value) => { state.adjust[key] = value; });
  }
  for (const key of ['grain', 'vignette', 'bloom', 'leak']) {
    bindField(key, (node) => Number(node.value), (value) => { state[key] = value; });
  }

  $('panel-zoom').addEventListener('input', () => {
    const panel = state.panels[state.selected];
    if (!panel) return;
    remember();
    panel.zoom = Number($('panel-zoom').value);
    draw();
  });
  $('panel-focus-x').addEventListener('input', () => {
    const panel = state.panels[state.selected];
    if (!panel) return;
    remember();
    panel.focusX = Number($('panel-focus-x').value);
    draw();
  });
  $('panel-focus-y').addEventListener('input', () => {
    const panel = state.panels[state.selected];
    if (!panel) return;
    remember();
    panel.focusY = Number($('panel-focus-y').value);
    draw();
  });
  $('panel-rotate').addEventListener('input', () => {
    const panel = state.panels[state.selected];
    if (!panel) return;
    remember();
    panel.rotate = Number($('panel-rotate').value);
    draw();
  });
  $('panel-caption').addEventListener('input', () => {
    const panel = state.panels[state.selected];
    if (!panel) return;
    remember();
    panel.caption = $('panel-caption').value;
    draw();
  });
  $('panel-timecode').addEventListener('input', () => {
    const panel = state.panels[state.selected];
    if (!panel) return;
    remember();
    panel.timecode = $('panel-timecode').value;
    draw();
  });
  $('panel-fill').addEventListener('click', () => {
    const panel = state.panels[state.selected];
    if (!panel) return;
    remember();
    panel.fit = 'cover';
    panel.zoom = 1;
    syncControls();
    draw();
  });
  $('panel-fit').addEventListener('click', () => {
    const panel = state.panels[state.selected];
    if (!panel) return;
    remember();
    panel.fit = 'fit';
    panel.zoom = 1;
    panel.focusX = 0.5;
    panel.focusY = 0.5;
    syncControls();
    draw();
  });
}

function bindStage() {
  $('undo').addEventListener('click', undo);
  $('redo').addEventListener('click', redo);
  $('zoom-in').addEventListener('click', () => {
    state.stageZoom = clamp(state.stageZoom + 0.1, 0.5, 2.4);
    syncControls();
  });
  $('zoom-out').addEventListener('click', () => {
    state.stageZoom = clamp(state.stageZoom - 0.1, 0.5, 2.4);
    syncControls();
  });
  const compareOn = () => { state.compare = true; draw(); };
  const compareOff = () => { state.compare = false; draw(); };
  const compare = $('compare');
  compare.addEventListener('pointerdown', compareOn);
  compare.addEventListener('pointerup', compareOff);
  compare.addEventListener('pointerleave', compareOff);
  $('photo-input').addEventListener('change', (event) => {
    addFiles(event.target.files);
    event.target.value = '';
  });
  const stage = $('stage');
  stage.addEventListener('dragover', (event) => { event.preventDefault(); });
  stage.addEventListener('drop', (event) => {
    event.preventDefault();
    if (event.dataTransfer?.files?.length) addFiles(event.dataTransfer.files);
  });
  window.addEventListener('paste', (event) => {
    const files = [...(event.clipboardData?.files || [])];
    if (files.length) addFiles(files);
  });
  window.addEventListener('keydown', (event) => {
    const tag = event.target?.tagName;
    const typing = tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT';
    if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'z') {
      event.preventDefault();
      if (event.shiftKey) redo();
      else undo();
      return;
    }
    if (typing) return;
    if (event.key === ' ' && !event.repeat) {
      event.preventDefault();
      compareOn();
    }
    if (event.key >= '1' && event.key <= '8') {
      const button = document.querySelector(`[data-layout="${LAYOUTS[Number(event.key) - 1].id}"]`);
      button?.click();
    }
    if (event.key === 'e' || event.key === 'E') {
      event.preventDefault();
      $('export-png').click();
    }
    if (event.key === '+' || event.key === '=') $('zoom-in').click();
    if (event.key === '-' || event.key === '_') $('zoom-out').click();
  });
  window.addEventListener('keyup', (event) => {
    if (event.key === ' ') compareOff();
  });
  window.addEventListener('resize', applyStageZoom);
}

async function runExport(all) {
  const log = $('export-log');
  const filename = $('export-filename').value.trim();
  state.filenameEdited = true;
  log.textContent = 'Rendering…';
  try {
    if (all) {
      const results = await exportAll(state, {
        filename,
        onProgress: ({ phase, index, total }) => { log.textContent = `${phase} ${index}/${total}`; },
      });
      log.textContent = results.map((item) => item.filename).join(' · ');
    } else {
      const result = await exportCover(state, {
        filename,
        onProgress: ({ phase }) => { log.textContent = phase; },
      });
      log.textContent = result.filename;
    }
  } catch (error) {
    log.textContent = error.message;
  }
}

function bindExport() {
  $('export-png').addEventListener('click', () => runExport(false));
  $('export-all').addEventListener('click', () => runExport(true));
  $('export-filename').addEventListener('input', () => { state.filenameEdited = true; });
}

function installShotApi() {
  const api = shootState({
    state,
    render: () => draw(),
    setLayout: async (id) => {
      const next = layoutById(id);
      if (!next) throw new RangeError(`Unknown composition: ${id}`);
      state.layoutId = id;
      syncControls();
      await draw();
    },
    setSize: async (value, height) => {
      const size = typeof value === 'string'
        ? { w: Number(value.split('x')[0]), h: Number(value.split('x')[1]) }
        : { w: value, h: height };
      state.size = size;
      syncControls();
      await draw();
    },
    setGrade: async (id) => {
      if (!GRADES.some((grade) => grade.id === id)) throw new RangeError(`Unknown grade: ${id}`);
      state.gradeId = id;
      syncControls();
      await draw();
    },
    loadSample: async (name = 'boulevard') => {
      const stem = String(name).replace(/\.jpg$/i, '');
      await addSample(`${stem}.jpg`);
      return state.photos.find((photo) => photo.id === stem);
    },
  });
  api.ready = api.ready.then(async () => {
    await drawing;
    window.__shotReady = true;
  });
  return api;
}

export async function bootStudio() {
  bindRails();
  bindStage();
  bindCanvas();
  bindExport();
  await Promise.all(SAMPLES.map((name) => addSample(name)));
  state.panels.forEach((panel, index) => {
    panel.photoId = SAMPLES[index % SAMPLES.length].replace(/\.jpg$/, '');
  });
  syncPhotos();
  syncControls();
  syncHistoryButtons();
  await document.fonts.ready;
  await draw();
  installShotApi();
  return state;
}

bootStudio();
