// One drawing path for the live preview and the exported PNG. `renderCover`
// paints into a context whose canvas is already the target size; `renderPreview`
// grades the photos first and then calls it.

import { layoutById } from './poster-layouts.js';
import { drawPanelPhoto } from './photo-fit.js';
import { gradeById, gradePhoto, paintAtmosphere } from './color-grade.js';
import {
  drawTitle, drawSubtitle, drawPanelCaption, drawCredits, drawBarcode, drawTags,
} from './lettering.js';

const INK = '#0A0910';
const PAPER = 'rgba(243, 232, 214, 0.78)';
const CORAL = '#FF5F52';
const VIOLET = '#4B2360';

const PLATES = [
  ['#4B2360', '#FFB24A'],
  ['#0E9C96', '#D8306F'],
  ['#2B6E9C', '#F3E8D6'],
  ['#D8306F', '#0A0910'],
];

function imageOf(entry) {
  if (!entry) return null;
  return entry.image || entry;
}

function photoList(state) {
  return (state.photos || []).filter((entry) => imageOf(entry));
}

function panelState(state, index, slot) {
  const panels = state.panels || [];
  const own = panels[index] || {};
  return {
    zoom: own.zoom ?? 1,
    focusX: own.focusX ?? 0.5,
    focusY: own.focusY ?? 0.5,
    rotate: own.rotate ?? slot.rotate ?? 0,
    fit: own.fit || 'cover',
    caption: own.caption || '',
    timecode: own.timecode || '',
  };
}

function rectOf(slot, w, h) {
  return { x: slot.x * w, y: slot.y * h, w: slot.w * w, h: slot.h * h };
}

// A panel with no photo still has to read as part of the poster.
function plate(ctx, rect, index) {
  const pair = PLATES[index % PLATES.length];
  const g = ctx.createLinearGradient(rect.x, rect.y, rect.x + rect.w, rect.y + rect.h);
  g.addColorStop(0, pair[0]);
  g.addColorStop(1, pair[1]);
  ctx.fillStyle = g;
  ctx.fillRect(rect.x, rect.y, rect.w, rect.h);
}

// Four background painters: a flat colour field, a blurred photo under an ink
// wash, a radial vignette, and a two-stop linear gradient.
function background(ctx, layout, w, h, photo) {
  const bg = layout.background || {};
  if (bg.kind === 'field') {
    ctx.fillStyle = bg.color || '#14111C';
    ctx.fillRect(0, 0, w, h);
    return;
  }
  if (bg.kind === 'photo') {
    ctx.fillStyle = INK;
    ctx.fillRect(0, 0, w, h);
    if (photo) {
      const scale = bg.scale || 1.08;
      ctx.save();
      ctx.filter = 'blur(18px)';
      ctx.globalAlpha = 0.24;
      ctx.drawImage(photo, (w - w * scale) / 2, (h - h * scale) / 2, w * scale, h * scale);
      ctx.restore();
    }
    ctx.fillStyle = 'rgba(10, 9, 16, 0.4)';
    ctx.fillRect(0, 0, w, h);
    return;
  }
  if (bg.kind === 'vignette') {
    ctx.fillStyle = bg.color || '#14111C';
    ctx.fillRect(0, 0, w, h);
    const g = ctx.createRadialGradient(w / 2, h / 2, Math.min(w, h) * 0.2, w / 2, h / 2, Math.max(w, h) * 0.72);
    g.addColorStop(0, 'rgba(10, 9, 16, 0)');
    g.addColorStop(1, bg.edge || INK);
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);
    return;
  }
  const radians = ((bg.angle || 180) * Math.PI) / 180;
  const x1 = w / 2 + Math.sin(radians) * w / 2;
  const y1 = h / 2 + Math.cos(radians) * h / 2;
  const g = ctx.createLinearGradient(w - x1, h - y1, x1, y1);
  g.addColorStop(0, bg.from || bg.color || '#14111C');
  g.addColorStop(1, bg.to || bg.edge || INK);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);
}

function clipShape(ctx, slot, rect) {
  ctx.beginPath();
  if (slot.kind === 'diagonal') {
    ctx.moveTo(rect.x, rect.y);
    ctx.lineTo(rect.x + rect.w, rect.y);
    ctx.lineTo(rect.x + rect.w * 0.72, rect.y + rect.h);
    ctx.lineTo(rect.x, rect.y + rect.h);
  } else {
    ctx.rect(rect.x, rect.y, rect.w, rect.h);
  }
  ctx.closePath();
}

// Darkens the panel edges and lays a short scrim along the bottom so a caption
// set over the photo stays readable.
function panelShade(ctx, rect) {
  ctx.save();
  const edge = ctx.createRadialGradient(
    rect.x + rect.w / 2, rect.y + rect.h / 2, Math.min(rect.w, rect.h) * 0.3,
    rect.x + rect.w / 2, rect.y + rect.h / 2, Math.max(rect.w, rect.h) * 0.72,
  );
  edge.addColorStop(0, 'rgba(10, 9, 16, 0)');
  edge.addColorStop(1, 'rgba(10, 9, 16, 0.45)');
  ctx.fillStyle = edge;
  ctx.fillRect(rect.x, rect.y, rect.w, rect.h);
  const scrim = ctx.createLinearGradient(0, rect.y + rect.h * 0.62, 0, rect.y + rect.h);
  scrim.addColorStop(0, 'rgba(10, 9, 16, 0)');
  scrim.addColorStop(1, 'rgba(10, 9, 16, 0.72)');
  ctx.fillStyle = scrim;
  ctx.fillRect(rect.x, rect.y + rect.h * 0.62, rect.w, rect.h * 0.38);
  ctx.restore();
}

function paperBorder(ctx, rect, scale, color) {
  ctx.save();
  ctx.strokeStyle = color;
  ctx.lineWidth = 3 * scale;
  ctx.strokeRect(rect.x + 1.5 * scale, rect.y + 1.5 * scale, rect.w - 3 * scale, rect.h - 3 * scale);
  ctx.restore();
}

// The title band on Vice Classic is a gradient rather than bare photo.
function titleBand(ctx, zone, w, h) {
  const band = ctx.createLinearGradient(0, zone.y * h, 0, h);
  band.addColorStop(0, 'rgba(216, 48, 111, 0)');
  band.addColorStop(0.35, 'rgba(216, 48, 111, 0.55)');
  band.addColorStop(1, 'rgba(10, 9, 16, 0.92)');
  ctx.fillStyle = band;
  ctx.fillRect(0, zone.y * h, w, h - zone.y * h);
}

// Pulls the finished poster toward one palette: the grade's shadow tint
// multiplied in, its highlight tint screened in, a coral-to-violet wash and a
// light magenta veil.
function unify(ctx, w, h, gradeId) {
  const grade = gradeById(gradeId);
  ctx.save();
  ctx.globalCompositeOperation = 'multiply';
  ctx.fillStyle = hexAlpha(grade.shadow.color, 0.22);
  ctx.fillRect(0, 0, w, h);
  ctx.globalCompositeOperation = 'screen';
  ctx.fillStyle = hexAlpha(grade.highlight.color, 0.16);
  ctx.fillRect(0, 0, w, h);
  ctx.globalCompositeOperation = 'overlay';
  const wash = ctx.createLinearGradient(0, 0, w * Math.cos(Math.PI / 6), h * Math.sin(Math.PI / 6));
  wash.addColorStop(0, 'rgba(255, 95, 82, 0.12)');
  wash.addColorStop(1, 'rgba(75, 35, 96, 0.16)');
  ctx.fillStyle = wash;
  ctx.fillRect(0, 0, w, h);
  ctx.globalCompositeOperation = 'source-over';
  ctx.fillStyle = 'rgba(216, 48, 111, 0.08)';
  ctx.fillRect(0, 0, w, h);
  ctx.restore();
}

function hexAlpha(hex, alpha) {
  const n = parseInt(String(hex).slice(1), 16);
  return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${alpha})`;
}

// A panel names its photo; panels past the end of the loaded set wrap around so
// a slot is never left blank while a photo exists.
function resolvePhoto(state, photos, graded, index) {
  if (!photos.length) return null;
  const wanted = state.panels && state.panels[index] && state.panels[index].photoId;
  const entry = photos.find((photo) => photo.id === wanted) || photos[index % photos.length];
  return graded.get(entry.id) || imageOf(entry);
}

export function renderCover(ctx, state, opts = {}) {
  const layout = layoutById(state.layoutId);
  const w = ctx.canvas.width;
  const h = ctx.canvas.height;
  const scale = opts.scale || w / 1080;
  const photos = photoList(state);
  const graded = opts.graded || new Map();
  const first = resolvePhoto(state, photos, graded, 0);

  ctx.clearRect(0, 0, w, h);
  background(ctx, layout, w, h, imageOf(photos[0]));

  layout.panels.forEach((slot, index) => {
    const rect = rectOf(slot, w, h);
    if (slot.kind === 'field') {
      ctx.fillStyle = VIOLET;
      ctx.fillRect(rect.x, rect.y, rect.w, rect.h);
      return;
    }
    const panel = panelState(state, index, slot);
    const img = resolvePhoto(state, photos, graded, index);
    ctx.save();
    clipShape(ctx, slot, rect);
    ctx.clip();
    if (img) drawPanelPhoto(ctx, img, rect, panel, state);
    else plate(ctx, rect, index);
    if (slot.kind !== 'bleed') panelShade(ctx, rect);
    if (slot.kind === 'scrim') {
      ctx.fillStyle = 'rgba(10, 9, 16, 0.4)';
      ctx.fillRect(rect.x, rect.y, rect.w, rect.h);
    }
    ctx.restore();
    if (slot.border && slot.border !== 'none') {
      paperBorder(ctx, rect, scale, slot.border === 'coral' ? CORAL : PAPER);
    }
    if (slot.kind !== 'bleed' && slot.kind !== 'scrim' && slot.kind !== 'field') {
      drawPanelCaption(ctx, panel, rect, state, scale);
    }
  });

  const zone = layout.titleZone;
  if (layout.id === 'vice-classic') titleBand(ctx, zone, w, h);
  const titleRect = { x: zone.x * w, y: zone.y * h, w: zone.w * w, h: zone.h * h };
  const measured = drawTitle(ctx, state, titleRect, scale);
  drawSubtitle(ctx, state, {
    x: titleRect.x,
    y: titleRect.y + titleRect.h * 0.62,
    w: titleRect.w,
    h: titleRect.h * 0.38,
  }, scale);
  drawCredits(ctx, state, w * 0.5, h - 92 * scale, scale);
  drawBarcode(ctx, w - 168 * scale, h - 86 * scale, 132 * scale, 40 * scale);
  drawTags(ctx, state, w, h, scale);

  if (!opts.compare && !state.compare) {
    paintAtmosphere(ctx, { w, h }, state.gradeId, {
      grain: state.grain,
      vignette: state.vignette,
      bloom: state.bloom,
      leak: state.leak,
    });
  }
  unify(ctx, w, h, state.gradeId);

  if (measured) state.lastTitle = { width: measured.width, frame: w };
  void first;
}

function gradeCache(state) {
  const map = new Map();
  if (state.compare) return map;
  for (const entry of state.photos || []) {
    const img = imageOf(entry);
    if (!img || !entry.id || map.has(entry.id)) continue;
    map.set(entry.id, gradePhoto(img, state.gradeId, state.adjust));
  }
  return map;
}

export function renderPreview(canvas, state, opts = {}) {
  const ctx = canvas.getContext('2d');
  renderCover(ctx, state, { ...opts, scale: opts.scale || canvas.width / 1080, graded: gradeCache(state) });
}
