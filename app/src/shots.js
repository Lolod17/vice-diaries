import { LAYOUTS, layoutById } from './poster-layouts.js';
import { renderPreview } from './cover-render.js';
import { exportCover } from './cover-export.js';

const SIZES = {
  '1080x1080': { w: 1080, h: 1080 },
  '1080x1350': { w: 1080, h: 1350 },
  '1920x1080': { w: 1920, h: 1080 },
};

const GRADE_DEFAULT = Object.fromEntries(LAYOUTS.map((layout) => [layout.id, layout.defaultGrade]));

const CAPTIONS = ['THE CAUSEWAY', 'NIGHT MARKET', 'PALM DRIVE', 'LAST LIGHT', 'OPEN WATER', 'MAIN STRIP'];
const TIMECODES = ['01:24:01', '01:24:18', '01:25:02', '01:26:44', '01:27:11', '01:28:05'];

function blankPanel(index) {
  return {
    photoId: null,
    zoom: 1,
    focusX: 0.5,
    focusY: 0.5,
    rotate: 0,
    timecode: TIMECODES[index] || `01:2${index}:0${index}`,
    caption: CAPTIONS[index] || '',
  };
}

function freshState() {
  return {
    layoutId: 'vice-classic',
    size: { w: 1080, h: 1080 },
    title: 'VICE DIARIES',
    subtitle: 'Midnight on the causeway',
    tagline: 'COMING SOON',
    issue: '01',
    rating: 'R',
    panels: Array.from({ length: 6 }, (_, i) => blankPanel(i)),
    gradeId: 'vice-sunset',
    grain: 24,
    vignette: 36,
    bloom: 12,
    leak: 16,
    adjust: { brightness: 0, contrast: 0, saturation: 0, temperature: 0, highlights: 0, shadows: 0 },
    titleScale: 1,
    titleRotate: 0,
    titleAlign: 'left',
    captionAlign: 'left',
    showCredits: true,
    compare: false,
    photos: [],
  };
}

const state = freshState();
const history = [];
const future = [];
let readyResolve;
const ready = new Promise((resolve) => { readyResolve = resolve; });

function snapshot() {
  return JSON.stringify({
    ...state,
    photos: state.photos.map((photo) => ({ id: photo.id, name: photo.name })),
  });
}

function remember() {
  const shot = snapshot();
  if (history[history.length - 1] === shot) return;
  history.push(shot);
  if (history.length > 40) history.shift();
  future.length = 0;
}

function restore(raw) {
  const data = JSON.parse(raw);
  const images = new Map(state.photos.map((photo) => [photo.id, photo.image]));
  Object.assign(state, data);
  state.photos = data.photos.map((photo) => ({ ...photo, image: images.get(photo.id) || null })).filter((photo) => photo.image);
}

export async function render() {
  const canvas = document.getElementById('preview');
  if (!canvas) return;
  canvas.width = state.size.w;
  canvas.height = state.size.h;
  renderPreview(canvas, state, { compare: state.compare });
}

export function setLayout(id) {
  if (state.layoutId === id) return render();
  remember();
  state.layoutId = id;
  const layout = layoutById(id);
  if (GRADE_DEFAULT[id]) state.gradeId = layout.defaultGrade;
  return render();
}

export function setSize(key) {
  const size = typeof key === 'string' ? SIZES[key] : key;
  if (!size) return render();
  if (state.size.w === size.w && state.size.h === size.h) return render();
  remember();
  state.size = { w: size.w, h: size.h };
  return render();
}

export function setGrade(id, adjust) {
  const nextAdjust = adjust ? { ...state.adjust, ...adjust } : state.adjust;
  const sameGrade = !id || state.gradeId === id;
  const sameAdjust = JSON.stringify(nextAdjust) === JSON.stringify(state.adjust);
  if (sameGrade && sameAdjust) return render();
  remember();
  if (id) state.gradeId = id;
  if (adjust) state.adjust = nextAdjust;
  return render();
}

export function undo() {
  if (!history.length) return render();
  future.push(snapshot());
  restore(history.pop());
  return render();
}

// Lets the editor push a checkpoint before a change it makes directly on
// `state`, so the same 40-step stack serves both the rails and the keyboard.
export function checkpoint() {
  remember();
}

export function redo() {
  if (!future.length) return render();
  history.push(snapshot());
  restore(future.pop());
  return render();
}

function loadImage(url) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`photo failed: ${url}`));
    img.src = url;
  });
}

export async function loadSample(name) {
  const id = name.replace(/\.jpg$/, '');
  const image = await loadImage(`samples/${id}.jpg`);
  const existing = state.photos.find((photo) => photo.id === id);
  if (existing) existing.image = image;
  else state.photos.push({ id, name: `${id}.jpg`, image });
  state.panels[0].photoId = id;
  await render();
  return id;
}

export function exportSize(key, height, opts = {}) {
  let size = state.size;
  if (typeof key === 'string') size = SIZES[key] || state.size;
  else if (typeof key === 'number' && typeof height === 'number') size = { w: key, h: height };
  else if (key && key.w) size = key;
  else if (height && typeof height === 'object') opts = height;
  return exportCover(state, size, opts);
}

const SHOTS = {
  cover: { layout: 'vice-classic', size: '1920x1080', grade: 'vice-sunset' },
  editor: { layout: 'vice-classic', size: '1080x1080', grade: 'vice-sunset' },
  portrait: { layout: 'sunset-stories', size: '1080x1350', grade: 'miami-heat' },
  square: { layout: 'miami-lifestyle', size: '1080x1080', grade: 'tropical-gold' },
};

const SAMPLES = ['pier', 'boulevard', 'hotel-dusk', 'marina-night', 'chrome-promenade', 'convertible-sunset', 'neon-crew'];

async function applyShot() {
  const shot = new URLSearchParams(location.search).get('shot');
  const scene = SHOTS[shot];
  if (!scene) return false;
  state.layoutId = scene.layout;
  state.gradeId = scene.grade || GRADE_DEFAULT[scene.layout] || state.gradeId;
  state.size = { ...SIZES[scene.size] };
  for (const name of SAMPLES) await loadSample(name);
  const picks = [0, 2, 4, 6].map((index) => state.photos[index]).filter(Boolean);
  const layout = layoutById(scene.layout);
  state.panels.forEach((panel, index) => {
    const photo = picks[index % picks.length];
    panel.photoId = photo ? photo.id : null;
    panel.caption = CAPTIONS[index % CAPTIONS.length];
    panel.timecode = TIMECODES[index % TIMECODES.length];
    panel.rotate = layout.panels[index] ? layout.panels[index].rotate || 0 : 0;
  });
  await render();
  return true;
}

function bind() {
  const exportButtons = document.querySelectorAll('#section-export .action');
  if (exportButtons[0] && !exportButtons[0].id) exportButtons[0].id = 'export-png';
}

window.__studio = {
  state,
  get photos() { return state.photos; },
  ready,
  render,
  setLayout,
  setSize,
  setGrade,
  undo,
  redo,
  checkpoint,
  loadSample,
  exportSize,
};

async function open() {
  bind();
  try {
    await applyShot();
    if (!state.photos.length) await loadSample('pier');
  } catch {
    await render();
  }
  readyResolve();
}

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', open);
else open();
