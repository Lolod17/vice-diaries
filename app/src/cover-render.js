// One drawing path for the live preview and the exported PNG.

import { layoutById, panelsForPhotoCount } from './poster-layouts.js';
import { drawPanelPhoto } from './photo-fit.js';
import { gradeByName, gradePhoto, paintAtmosphere } from './color-grade.js';
import {
  drawTitle, drawSubtitle, drawPanelCaption, drawCredits, drawBarcode, drawTags,
} from './lettering.js';

function hexToRgb(hex) {
  const n = parseInt(String(hex).replace('#', ''), 16);
  return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
}

function rectOf(panel, frame) {
  return {
    x: panel.x * frame.w,
    y: panel.y * frame.h,
    w: panel.w * frame.w,
    h: panel.h * frame.h,
  };
}

function paintBackground(ctx, layout, frame, photos, compare) {
  const bg = layout.background || { type: 'field', color: '#0A0910' };
  ctx.fillStyle = '#0A0910';
  ctx.fillRect(0, 0, frame.w, frame.h);
  if (bg.type === 'field') {
    ctx.fillStyle = bg.color || '#14111C';
    ctx.fillRect(0, 0, frame.w, frame.h);
    return;
  }
  if (bg.type === 'photo') {
    const photo = photos[bg.photoSlot || 0];
    if (photo && !compare) {
      const scale = bg.scale || 1.18;
      const dw = frame.w * scale;
      const dh = frame.h * scale;
      ctx.save();
      ctx.filter = 'blur(18px)';
      ctx.globalAlpha = bg.opacity ?? 0.24;
      ctx.drawImage(photo, (frame.w - dw) / 2, (frame.h - dh) / 2, dw, dh);
      ctx.restore();
    }
    ctx.fillStyle = bg.overlay || 'rgba(10, 9, 16, 0.4)';
    ctx.fillRect(0, 0, frame.w, frame.h);
    return;
  }
  const angle = ((bg.angle ?? 160) * Math.PI) / 180;
  const cx = frame.w / 2;
  const cy = frame.h / 2;
  const len = Math.hypot(frame.w, frame.h) / 2;
  const paint = ctx.createLinearGradient(
    cx - Math.cos(angle) * len,
    cy - Math.sin(angle) * len,
    cx + Math.cos(angle) * len,
    cy + Math.sin(angle) * len,
  );
  paint.addColorStop(0, bg.from || '#4B2360');
  paint.addColorStop(1, bg.to || '#0A0910');
  ctx.fillStyle = paint;
  ctx.fillRect(0, 0, frame.w, frame.h);
}

function panelPhoto(panel, photos) {
  if (panel.kind === 'field' || panel.photoIndex < 0) return null;
  return photos[panel.photoIndex] || null;
}

function panelState(panel, state) {
  const slots = state.panels || [];
  const slot = slots[panel.slot] || slots[panel.photoIndex] || {};
  return {
    zoom: slot.zoom ?? 1,
    focusX: slot.focusX ?? 0,
    focusY: slot.focusY ?? 0,
    rotate: (panel.rotate || 0) + (slot.rotate || 0),
    border: panel.border,
    mode: slot.mode,
    timecode: slot.timecode || '',
    caption: slot.caption || '',
  };
}

function scrim(ctx, rect, alpha) {
  const paint = ctx.createLinearGradient(rect.x, rect.y, rect.x, rect.y + rect.h);
  paint.addColorStop(0, 'rgba(10, 9, 16, 0)');
  paint.addColorStop(0.62, 'rgba(10, 9, 16, 0)');
  paint.addColorStop(1, `rgba(10, 9, 16, ${alpha})`);
  ctx.fillStyle = paint;
  ctx.fillRect(rect.x, rect.y, rect.w, rect.h);
}

function vignettePanel(ctx, rect) {
  const paint = ctx.createRadialGradient(
    rect.x + rect.w / 2, rect.y + rect.h / 2, rect.w * 0.2,
    rect.x + rect.w / 2, rect.y + rect.h / 2, Math.hypot(rect.w, rect.h) * 0.55,
  );
  paint.addColorStop(0, 'rgba(10, 9, 16, 0)');
  paint.addColorStop(1, 'rgba(10, 9, 16, 0.38)');
  ctx.fillStyle = paint;
  ctx.fillRect(rect.x, rect.y, rect.w, rect.h);
}

function clipDiagonal(ctx, rect) {
  ctx.beginPath();
  ctx.moveTo(rect.x, rect.y);
  ctx.lineTo(rect.x + rect.w * 0.92, rect.y);
  ctx.lineTo(rect.x + rect.w * 0.62, rect.y + rect.h);
  ctx.lineTo(rect.x, rect.y + rect.h);
  ctx.closePath();
  ctx.clip();
}

function paintTape(ctx, rect) {
  ctx.save();
  ctx.translate(rect.x + 18, rect.y - 6);
  ctx.rotate(-0.4);
  ctx.fillStyle = 'rgba(255, 95, 82, 0.82)';
  ctx.fillRect(0, 0, 54, 16);
  ctx.restore();
}

function unify(ctx, frame, grade) {
  const shadow = hexToRgb(grade.shadow.color);
  const highlight = hexToRgb(grade.highlight.color);
  ctx.save();
  ctx.globalCompositeOperation = 'multiply';
  ctx.fillStyle = `rgba(${shadow.r}, ${shadow.g}, ${shadow.b}, 0.22)`;
  ctx.fillRect(0, 0, frame.w, frame.h);
  ctx.restore();

  ctx.save();
  ctx.globalCompositeOperation = 'screen';
  ctx.fillStyle = `rgba(${highlight.r}, ${highlight.g}, ${highlight.b}, 0.16)`;
  ctx.fillRect(0, 0, frame.w, frame.h);
  ctx.restore();

  const angle = (30 * Math.PI) / 180;
  const len = Math.hypot(frame.w, frame.h);
  const wash = ctx.createLinearGradient(0, frame.h, Math.cos(angle) * len, frame.h - Math.sin(angle) * len);
  wash.addColorStop(0, 'rgba(255, 95, 82, 0.12)');
  wash.addColorStop(1, 'rgba(75, 35, 96, 0.16)');
  ctx.save();
  ctx.fillStyle = wash;
  ctx.fillRect(0, 0, frame.w, frame.h);
  ctx.restore();

  ctx.save();
  ctx.fillStyle = 'rgba(216, 48, 111, 0.08)';
  ctx.fillRect(0, 0, frame.w, frame.h);
  ctx.restore();
}

function resolvePhotos(state) {
  const list = state.photos || [];
  if (list.length) return list;
  return state.sample ? [state.sample] : [];
}

const gradeCache = new Map();

function cachedGrade(photo, grade, adjust) {
  const key = `${photo.__name || photo.src || ''}|${grade.id}|${JSON.stringify(adjust)}`;
  let canvas = gradeCache.get(key);
  if (!canvas) {
    canvas = gradePhoto(photo, grade, adjust);
    gradeCache.set(key, canvas);
  }
  return canvas;
}

function meanLum(ctx, rect) {
  const x = Math.max(0, Math.round(rect.x));
  const y = Math.max(0, Math.round(rect.y));
  const w = Math.max(1, Math.min(ctx.canvas.width - x, Math.round(rect.w)));
  const h = Math.max(1, Math.min(ctx.canvas.height - y, Math.round(rect.h)));
    const step = Math.max(16, Math.round((w * h) / 4000)) * 4;
  const data = ctx.getImageData(x, y, w, h).data;
  let sum = 0;
  let n = 0;
  for (let i = 0; i < data.length; i += step) {
    sum += 0.2126 * data[i] + 0.7152 * data[i + 1] + 0.0722 * data[i + 2];
    n += 1;
  }
  return n ? sum / n : 0;
}

let metrics = { titleFrac: 0, lumSpread: 0, panelLum: [] };

export function lastMetrics() {
  return metrics;
}

/** Draw the whole cover. `ctx.canvas` is already the target size. */
export function renderCover(ctx, state, opts = {}) {
  const frame = { w: ctx.canvas.width, h: ctx.canvas.height };
  const layout = layoutById(state.layoutId) || layoutById('vice-classic');
  const grade = gradeByName(state.gradeId || layout.defaultGrade);
  const photos = resolvePhotos(state);
  const compare = Boolean(state.compare) && !opts.forExport;
  const panels = panelsForPhotoCount(layout, photos.length);

  paintBackground(ctx, layout, frame, photos, compare);

  const zone = layout.titleZone;
  const lum = [];
  panels.forEach((panel) => {
    const rect = rectOf(panel, frame);
    const slot = panelState(panel, state);
    ctx.save();
    if (panel.clip === 'diagonal') clipDiagonal(ctx, rect);
    if (panel.kind === 'field') {
      ctx.fillStyle = panel.fill || '#4B2360';
      ctx.fillRect(rect.x, rect.y, rect.w, rect.h);
    } else {
      const photo = panelPhoto(panel, photos);
      const graded = photo && !compare ? cachedGrade(photo, grade, state.adjust || {}) : null;
      drawPanelPhoto(ctx, photo, rect, { ...slot, gradeCanvas: graded, border: panel.border }, state);
      vignettePanel(ctx, rect);
      scrim(ctx, rect, panel.scrim ? Math.max(0.4, panel.scrim) : 0.55);
      if (panel.scrim) {
        ctx.fillStyle = `rgba(10, 9, 16, ${panel.scrim})`;
        ctx.fillRect(rect.x, rect.y, rect.w, rect.h);
      }
      if (layout.rules?.overlap === 'tape') paintTape(ctx, rect);
      lum.push(meanLum(ctx, rect));
      const underTitle = panel.y + panel.h > zone.y + 0.02;
      const captionRect = underTitle
        ? { x: rect.x, y: rect.y + 8, w: rect.w, h: Math.min(72, rect.h * 0.34) }
        : rect;
      if (panel.kind !== 'plate') drawPanelCaption(ctx, slot, captionRect, state);
    }
    ctx.restore();
  });

  const titleBox = drawTitle(ctx, state, zone, frame);
  const spread = lum.length ? Math.max(...lum) - Math.min(...lum) : 0;
  metrics = {
    titleFrac: frame.w ? (titleBox.ink || 0) / frame.w : 0,
    lumSpread: spread,
    panelLum: lum,
  };
  drawSubtitle(ctx, state, zone, frame, titleBox);
  if (layout.rules?.rule === 'cream') {
    ctx.fillStyle = '#F8EBCB';
    ctx.fillRect(zone.x * frame.w, titleBox.y - 10, zone.w * frame.w, 2);
  }
  drawCredits(ctx, state, frame);
  drawTags(ctx, state, frame);
  drawBarcode(ctx, state, frame);

  if (!compare) {
    paintAtmosphere(ctx, frame, grade, {
      grain: state.grain,
      vignette: state.vignette,
      bloom: state.bloom,
      leak: state.leak,
    });
    unify(ctx, frame, grade);
  }
}

/** Size is the canvas bitmap. Stage zoom is CSS, applied by the editor. */
export function renderPreview(canvas, state) {
  const ctx = canvas.getContext('2d');
  renderCover(ctx, state, { scale: 1, forExport: false });
  return canvas;
}
