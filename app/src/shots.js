// Screenshot hook and the live studio handle. Later passes replace the placeholder
// paint by importing the real renderer; this file still boots without them.

import { exportCover, exportName } from './cover-export.js';
import { coverFit } from './photo-fit.js';

const LATER = ['./poster-layouts.js', './cover-render.js', './lettering.js', './color-grade.js'];

async function laterModules() {
  const loaded = {};
  for (const spec of LATER) {
    try {
      loaded[spec] = await import(spec);
    } catch {
      loaded[spec] = null;
    }
  }
  return loaded;
}

const SIZES = {
  cover: { w: 1920, h: 1080 },
  editor: { w: 1080, h: 1350 },
  portrait: { w: 1080, h: 1350 },
  square: { w: 1080, h: 1080 },
};

const SHOT_LAYOUT = {
  cover: 'vice-classic',
  editor: 'vice-classic',
  portrait: 'sunset-stories',
  square: 'miami-lifestyle',
};

const SHOT_GRADE = {
  cover: 'vice-sunset',
  editor: 'vice-sunset',
  portrait: 'miami-heat',
  square: 'tropical-gold',
};

export function freshState() {
  return {
    layoutId: 'vice-classic',
    size: { w: 1080, h: 1350 },
    title: 'VICE DIARIES',
    subtitle: 'a night on the boulevard',
    tagline: 'coming soon',
    issue: '01',
    rating: 'M',
    panels: [
      { photoId: 'boulevard', zoom: 1, focusX: 0, focusY: 0, rotate: 0, timecode: '01:12:04', caption: 'BOULEVARD' },
      { photoId: 'pier', zoom: 1.08, focusX: 0, focusY: -0.1, rotate: 0, timecode: '01:18:41', caption: 'THE PIER' },
      { photoId: 'marina-night', zoom: 1, focusX: 0.1, focusY: 0, rotate: 0, timecode: '01:24:09', caption: 'MARINA' },
      { photoId: 'hotel-dusk', zoom: 1, focusX: 0, focusY: 0, rotate: 0, timecode: '01:31:55', caption: 'HOTEL' },
    ],
    gradeId: 'vice-sunset',
    grain: 28,
    vignette: 36,
    bloom: 18,
    leak: 22,
    adjust: { brightness: 0, contrast: 0, saturation: 0, temperature: 0, highlights: 0, shadows: 0 },
    titleScale: 1,
    titleRotate: 0,
    titleAlign: 'center',
    captionAlign: 'left',
    showCredits: true,
    stageZoom: 1,
    compare: false,
  };
}

const studio = {
  state: freshState(),
  render: paintPlaceholder,
  setLayout,
  setSize,
  setGrade,
  loadSample,
  exportSize,
};

function paintPlaceholder(canvas, state = studio.state) {
  const ctx = canvas.getContext('2d');
  const w = canvas.width;
  const h = canvas.height;
  const photo = state.sample;
  if (photo) {
    const fit = coverFit(photo, { x: 0, y: 0, w, h }, { zoom: 1, focusX: 0, focusY: 0 });
    ctx.drawImage(photo, fit.sx, fit.sy, fit.sw, fit.sh, fit.dx, fit.dy, fit.dw, fit.dh);
  } else {
    const sky = ctx.createLinearGradient(0, 0, 0, h);
    sky.addColorStop(0, '#2b6e9c');
    sky.addColorStop(0.55, '#d8306f');
    sky.addColorStop(1, '#ffb24a');
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, w, h);
  }
  const band = ctx.createLinearGradient(0, h * 0.62, 0, h);
  band.addColorStop(0, 'rgba(10, 9, 16, 0)');
  band.addColorStop(1, 'rgba(216, 48, 111, 0.86)');
  ctx.fillStyle = band;
  ctx.fillRect(0, Math.round(h * 0.62), w, Math.round(h * 0.38));
  const titlePx = Math.round(w * 0.072);
  ctx.fillStyle = '#f8ebcb';
  ctx.font = `700 ${titlePx}px "Oswald", sans-serif`;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';
  ctx.fillText(state.title || 'VICE DIARIES', Math.round(w * 0.06), Math.round(h * 0.78));
  ctx.fillStyle = 'rgba(243, 232, 214, 0.92)';
  ctx.font = `italic ${Math.round(w * 0.028)}px "Instrument Serif", serif`;
  ctx.fillText(state.subtitle || '', Math.round(w * 0.06), Math.round(h * 0.84));
}

function applySize(canvas, size) {
  canvas.width = size.w;
  canvas.height = size.h;
  studio.state.size = { w: size.w, h: size.h };
}

export function setLayout(id) {
  studio.state.layoutId = id;
  studio.render(preview(), studio.state);
  return studio.state;
}

export function setSize(w, h) {
  const canvas = preview();
  if (canvas) applySize(canvas, { w, h });
  studio.render(canvas, studio.state);
  return studio.state;
}

export function setGrade(id) {
  studio.state.gradeId = id;
  studio.render(preview(), studio.state);
  return studio.state;
}

export async function loadSample(name = 'boulevard') {
  const img = new Image();
  img.src = `./samples/${name}.jpg`;
  await img.decode();
  studio.state.sample = img;
  if (studio.state.panels[0]) studio.state.panels[0].photoId = name;
  studio.render(preview(), studio.state);
  return studio.state;
}

export async function exportSize(w, h, filename) {
  const size = { w, h };
  const name = filename || exportName(studio.state, size);
  return exportCover(studio.state, size, name, {
    renderCover(ctx, state) {
      paintPlaceholder(ctx.canvas, state);
    },
    onProgress(info) {
      const log = document.getElementById('export-log');
      if (log) log.textContent = `${info.phase} ${info.filename}`;
    },
  });
}

function preview() {
  return document.getElementById('preview');
}

export async function shootState() {
  const params = new URLSearchParams(location.search);
  const shot = params.get('shot');
  if (shot && SIZES[shot]) {
    document.body.dataset.shot = shot;
    studio.state.layoutId = SHOT_LAYOUT[shot];
    studio.state.gradeId = SHOT_GRADE[shot];
    const canvas = preview();
    if (canvas) applySize(canvas, SIZES[shot]);
  }
  try {
    await loadSample(params.get('photo') || 'boulevard');
  } catch {
    studio.render(preview(), studio.state);
  }
  window.__shotReady = true;
  return studio.state;
}

export async function mountStudio() {
  window.__studio = studio;
  const modules = await laterModules();
  const previewRender = modules['./cover-render.js']?.renderPreview;
  if (typeof previewRender === 'function') studio.render = previewRender;
  const canvas = preview();
  if (canvas) {
    applySize(canvas, studio.state.size);
    studio.render(canvas, studio.state);
  }
  return shootState();
}
