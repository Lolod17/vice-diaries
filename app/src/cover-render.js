import { layoutById } from './poster-layouts.js';
import { gradeById, gradePhoto, paintAtmosphere } from './color-grade.js';
import { drawPanelPhoto } from './photo-fit.js';
import {
  drawTitle, drawSubtitle, drawPanelCaption, drawCredits, drawBarcode, drawTags, drawCreamRule,
} from './lettering.js';

const INK = '#0A0910';
const PAPER = '#F3E8D6';
const CREAM = '#F8EBCB';
const AMBER = '#FFB24A';
const CORAL = '#FF5F52';
const MAGENTA = '#D8306F';
const VIOLET = '#4B2360';
const TEAL = '#0E9C96';

const DESIGN = 1080;

function photoById(state, id) {
  if (!id) return null;
  return (state.photos || []).find((photo) => photo.id === id)?.image ?? null;
}

function panelState(state, index) {
  const list = state.panels || [];
  if (!list.length) return { zoom: 1, focusX: 0.5, focusY: 0.5, rotate: 0 };
  return list[index] || list[index % list.length];
}

function photoForPanel(state, index) {
  const panel = panelState(state, index);
  const direct = photoById(state, panel.photoId);
  if (direct) return direct;
  const photos = (state.photos || []).filter((photo) => photo.image);
  if (!photos.length) return null;
  return photos[index % photos.length].image;
}

function absRect(panel, w, h) {
  return {
    x: panel.x * w,
    y: panel.y * h,
    w: panel.w * w,
    h: panel.h * h,
    rotate: panel.rotate || 0,
    border: panel.border ?? 3,
    kind: panel.kind || 'photo',
    bleed: panel.bleed || 0,
  };
}

function paintPlate(ctx, rect, seed = 0) {
  const gradient = ctx.createLinearGradient(rect.x, rect.y, rect.x + rect.w, rect.y + rect.h);
  const stops = [
    ['#2B6E9C', '#FF5F52', '#14111C'],
    ['#4B2360', '#D8306F', '#0A0910'],
    ['#0E9C96', '#FFB24A', '#14111C'],
  ][seed % 3];
  gradient.addColorStop(0, stops[0]);
  gradient.addColorStop(0.55, stops[1]);
  gradient.addColorStop(1, stops[2]);
  ctx.fillStyle = gradient;
  ctx.fillRect(rect.x, rect.y, rect.w, rect.h);
}

function paintBackground(ctx, layout, state, w, h) {
  const kind = layout.background;
  if (kind === 'paper-block') {
    ctx.fillStyle = PAPER;
    ctx.fillRect(0, 0, w, h);
    const wash = ctx.createLinearGradient(0, 0, 0, h * 0.62);
    wash.addColorStop(0, '#1A1422');
    wash.addColorStop(1, '#0A0910');
    ctx.fillStyle = wash;
    ctx.fillRect(0, 0, w, h * 0.64);
    return;
  }
  if (kind === 'sunset-field') {
    const sky = ctx.createLinearGradient(0, 0, 0, h);
    sky.addColorStop(0, '#2B6E9C');
    sky.addColorStop(0.42, '#D8306F');
    sky.addColorStop(0.72, '#FF5F52');
    sky.addColorStop(1, '#14111C');
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, w, h);
    return;
  }
  if (kind === 'blurred-photo') {
    const img = photoForPanel(state, 0);
    if (img) {
      ctx.save();
      ctx.filter = 'blur(28px) saturate(1.15)';
      ctx.globalAlpha = 0.24;
      const scale = Math.max(w / (img.naturalWidth || img.width), h / (img.naturalHeight || img.height)) * 1.15;
      const dw = (img.naturalWidth || img.width) * scale;
      const dh = (img.naturalHeight || img.height) * scale;
      ctx.drawImage(img, (w - dw) / 2, (h - dh) / 2, dw, dh);
      ctx.restore();
    }
    ctx.fillStyle = 'rgba(10,9,16,0.40)';
    ctx.fillRect(0, 0, w, h);
    return;
  }
  const depth = ctx.createLinearGradient(0, 0, w, h);
  depth.addColorStop(0, '#1A1424');
  depth.addColorStop(0.5, VIOLET);
  depth.addColorStop(1, INK);
  ctx.fillStyle = depth;
  ctx.fillRect(0, 0, w, h);
}

function panelVignette(ctx, rect) {
  const cx = rect.x + rect.w / 2;
  const cy = rect.y + rect.h / 2;
  const radius = Math.hypot(rect.w, rect.h) * 0.62;
  const shade = ctx.createRadialGradient(cx, cy, radius * 0.42, cx, cy, radius);
  shade.addColorStop(0, 'rgba(10,9,16,0)');
  shade.addColorStop(1, 'rgba(10,9,16,0.38)');
  ctx.fillStyle = shade;
  ctx.fillRect(rect.x, rect.y, rect.w, rect.h);
  const scrim = ctx.createLinearGradient(0, rect.y + rect.h * 0.55, 0, rect.y + rect.h);
  scrim.addColorStop(0, 'rgba(10,9,16,0)');
  scrim.addColorStop(1, 'rgba(10,9,16,0.62)');
  ctx.fillStyle = scrim;
  ctx.fillRect(rect.x, rect.y + rect.h * 0.55, rect.w, rect.h * 0.45);
}

function paperBorder(ctx, rect, scale) {
  const width = Math.max(1, (rect.border || 3) * (scale || 1) * 0.55);
  ctx.save();
  ctx.strokeStyle = `rgba(243,232,214,0.78)`;
  ctx.lineWidth = width;
  ctx.strokeRect(rect.x + width / 2, rect.y + width / 2, rect.w - width, rect.h - width);
  ctx.restore();
}

function tapeStrip(ctx, x, y, w, angle, scale) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(angle);
  ctx.globalAlpha = 0.82;
  ctx.fillStyle = CORAL;
  ctx.fillRect(-w / 2, -px(7, scale), w, px(14, scale));
  ctx.restore();
}

function px(value, scale) {
  return value * (scale || 1);
}

function drawPhotoPanel(ctx, img, rect, panel, grade, adjust, compare) {
  ctx.save();
  if (rect.rotate) {
    const cx = rect.x + rect.w / 2;
    const cy = rect.y + rect.h / 2;
    ctx.translate(cx, cy);
    ctx.rotate((rect.rotate * Math.PI) / 180);
    ctx.translate(-cx, -cy);
  }
  ctx.beginPath();
  ctx.rect(rect.x, rect.y, rect.w, rect.h);
  ctx.clip();
  const source = img && !compare ? gradePhoto(img, grade, adjust) : img;
  if (source) drawPanelPhoto(ctx, source, rect, panel);
  else paintPlate(ctx, rect, panel.slot || 0);
  if (!compare) panelVignette(ctx, rect);
  ctx.restore();
}

function titleZonePx(layout, w, h, scale) {
  const zone = layout.titleZone;
  return {
    x: zone.x * w,
    y: zone.y * h,
    w: zone.w * w,
    h: (zone.h || 0.16) * h,
    align: zone.align,
    size: zone.size,
    rotate: zone.rotate || 0,
    scale,
  };
}

function panelLuma(ctx, rect) {
  const sample = 16;
  const snap = document.createElement('canvas');
  snap.width = sample;
  snap.height = sample;
  const pass = snap.getContext('2d', { willReadFrequently: true });
  const sx = rect.x + rect.w * 0.18;
  const sy = rect.y + rect.h * 0.12;
  const sw = rect.w * 0.64;
  const sh = rect.h * 0.5;
  pass.drawImage(ctx.canvas, sx, sy, sw, sh, 0, 0, sample, sample);
  const data = pass.getImageData(0, 0, sample, sample).data;
  let sum = 0;
  for (let i = 0; i < data.length; i += 4) {
    sum += 0.2126 * data[i] + 0.7152 * data[i + 1] + 0.0722 * data[i + 2];
  }
  return sum / (sample * sample);
}

function balancePanels(ctx, layout, w, h) {
  const panels = layout.panels
    .filter((panel) => panel.kind === 'photo' || (panel.kind === 'plate' && panel.border))
    .map((panel) => absRect(panel, w, h));
  if (panels.length < 2) return;
  equalize(ctx, panels);
}

let panelSpread = { before: 0, after: 0 };

function equalize(ctx, panels) {
  let lumas = panels.map((rect) => panelLuma(ctx, rect));
  const before = spreadOf(lumas);
  let guard = 0;
  while (spreadOf(lumas) > 14 && guard < 16) {
    const mean = lumas.reduce((sum, value) => sum + value, 0) / lumas.length;
    let index = 0;
    lumas.forEach((value, i) => {
      if (Math.abs(value - mean) > Math.abs(lumas[index] - mean)) index = i;
    });
    const rect = panels[index];
    const delta = mean - lumas[index];
    ctx.save();
    if (rect.rotate) {
      const cx = rect.x + rect.w / 2;
      const cy = rect.y + rect.h / 2;
      ctx.translate(cx, cy);
      ctx.rotate((rect.rotate * Math.PI) / 180);
      ctx.translate(-cx, -cy);
    }
    ctx.beginPath();
    ctx.rect(rect.x, rect.y, rect.w, rect.h);
    ctx.clip();
    const gain = Math.min(0.34, 0.05 + Math.abs(delta) / 160);
    if (delta > 0) {
      ctx.globalCompositeOperation = 'screen';
      ctx.fillStyle = '#F8EBCB';
      ctx.globalAlpha = gain;
    } else {
      ctx.globalCompositeOperation = 'multiply';
      ctx.fillStyle = '#14111C';
      ctx.globalAlpha = gain;
    }
    ctx.fillRect(rect.x, rect.y, rect.w, rect.h);
    ctx.restore();
    lumas = panels.map((entry) => panelLuma(ctx, entry));
    guard += 1;
  }
  panelSpread = { before: +before.toFixed(2), after: +spreadOf(lumas).toFixed(2) };
}

export function lastPanelSpread() {
  return panelSpread;
}

function spreadOf(values) {
  if (values.length < 2) return 0;
  return Math.max(...values) - Math.min(...values);
}

function unifyPass(ctx, w, h, grade) {
  const preset = gradeById(grade) || gradeById('vice-sunset');
  ctx.save();
  ctx.globalCompositeOperation = 'multiply';
  ctx.fillStyle = preset.shadow.color;
  ctx.globalAlpha = 0.23;
  ctx.fillRect(0, 0, w, h);

  ctx.globalCompositeOperation = 'screen';
  ctx.fillStyle = preset.highlight.color;
  ctx.globalAlpha = 0.17;
  ctx.fillRect(0, 0, w, h);

  ctx.globalCompositeOperation = 'source-over';
  const angle = (30 * Math.PI) / 180;
  const length = Math.abs(w * Math.cos(angle)) + Math.abs(h * Math.sin(angle));
  const split = ctx.createLinearGradient(0, 0, Math.cos(angle) * length, Math.sin(angle) * length);
  split.addColorStop(0, 'rgba(255,95,82,0.12)');
  split.addColorStop(1, 'rgba(75,35,96,0.16)');
  ctx.fillStyle = split;
  ctx.globalAlpha = 1;
  ctx.fillRect(0, 0, w, h);

  ctx.globalCompositeOperation = 'source-over';
  ctx.fillStyle = MAGENTA;
  ctx.globalAlpha = 0.08;
  ctx.fillRect(0, 0, w, h);
  ctx.restore();
}

function layoutChrome(ctx, layout, state, w, h, scale) {
  const id = layout.id;
  if (id === 'vice-classic') {
    const band = ctx.createLinearGradient(0, h * 0.58, 0, h * 0.92);
    band.addColorStop(0, 'rgba(10,9,16,0)');
    band.addColorStop(0.35, 'rgba(216,48,111,0.28)');
    band.addColorStop(1, 'rgba(10,9,16,0.45)');
    ctx.fillStyle = band;
    ctx.fillRect(0, h * 0.58, w * 0.46, h * 0.34);
  }
  if (id === 'sunset-stories') {
    drawCreamRule(ctx, w * 0.1, h * 0.70, w * 0.8, scale);
  }
  if (id === 'neon-nights') {
    const field = layout.panels.find((panel) => panel.kind === 'field');
    if (field) {
      const rect = absRect(field, w, h);
      const wash = ctx.createLinearGradient(rect.x, rect.y, rect.x, rect.y + rect.h);
      wash.addColorStop(0, VIOLET);
      wash.addColorStop(1, '#1A1028');
      ctx.fillStyle = wash;
      ctx.fillRect(rect.x, rect.y, rect.w, rect.h);
    }
  }
  if (id === 'cinematic-split') {
    ctx.fillStyle = 'rgba(10,9,16,0.40)';
    ctx.fillRect(0, 0, w * 0.55, h);
    ctx.fillStyle = PAPER;
    ctx.fillRect(w * 0.55, 0, px(6, scale), h);
  }
  if (id === 'crime-drama') {
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(w * 0.62, 0);
    ctx.lineTo(w * 0.74, 0);
    ctx.lineTo(w * 0.66, h);
    ctx.lineTo(w * 0.54, h);
    ctx.closePath();
    ctx.fillStyle = 'rgba(10,9,16,0.28)';
    ctx.fill();
    ctx.restore();
  }
  if (layout.rules?.tape) {
    tapeStrip(ctx, w * 0.12, h * 0.08, px(72, scale), -0.5, scale);
    tapeStrip(ctx, w * 0.86, h * 0.1, px(64, scale), 0.4, scale);
  }
}

function placedZone(layout, w, h, scale) {
  const zone = titleZonePx(layout, w, h, scale);
  const margin = px(36, scale);
  if (layout.id === 'sunset-stories') zone.y = h * 0.68;
  if (layout.id === 'vertical-editorial') zone.y = h * 0.76;
  if (layout.id === 'miami-lifestyle') zone.y = h * 0.68;
  if (layout.id === 'vice-classic') {
    zone.y = h * 0.60;
    zone.w = w * 0.42;
    zone.x = px(28, scale);
    zone.maxH = h * 0.28;
  }
  if (layout.id === 'crime-drama') zone.y = h * 0.28;
  if (layout.id === 'cinematic-split') zone.y = h * 0.18;
  if (layout.id === 'multi-collage') zone.y = h * 0.74;
  zone.x = clampBox(zone.x, margin, w - margin);
  zone.y = clampBox(zone.y, margin, h - margin);
  return zone;
}

function clampBox(value, lo, hi) {
  return Math.min(hi, Math.max(lo, value));
}

function letteringPass(ctx, layout, state, w, h, scale) {
  const zone = placedZone(layout, w, h, scale);
  const inkOnPaper = layout.id === 'miami-lifestyle';
  if (layout.id === 'neon-nights') {
    const field = layout.panels.find((panel) => panel.kind === 'field');
    const rect = field ? absRect(field, w, h) : zone;
    ctx.save();
    ctx.translate(rect.x + rect.w / 2, rect.y + rect.h / 2);
    ctx.rotate(-Math.PI / 2);
    const spun = { x: -rect.h / 2, y: -px(40, scale), w: rect.h * 0.86, h: rect.w, align: 'center', size: 96, rotate: 0 };
    drawTitle(ctx, state, spun, { scale });
    ctx.restore();
  } else if (inkOnPaper) {
    ctx.save();
    ctx.fillStyle = INK;
    const fitted = drawTitle(ctx, { ...state, title: '' }, zone, { scale });
    void fitted;
    ctx.restore();
    drawInkTitle(ctx, state, zone, scale);
  } else {
    drawTitle(ctx, state, zone, { scale });
  }

  const cap = px(Math.min(132, (zone.size || 108) * (state.titleScale || 1)), scale);
  const subY = layout.id === 'vice-classic' ? zone.y + cap * 2.15
    : layout.id === 'miami-lifestyle' ? h * 0.82
      : layout.id === 'vertical-editorial' ? px(48, scale)
        : zone.y + cap * 1.15;
  if (layout.id !== 'neon-nights') {
    drawSubtitle(ctx, state, { ...zone, y: subY, subtitleY: Math.min(subY, h - px(48, scale)) }, { scale });
  }

  if (state.showCredits !== false && layout.id !== 'neon-nights' && layout.id !== 'vice-classic') {
    const credits = inkOnPaper
      ? { x: w * 0.18, y: h * 0.86, w: w * 0.64, h: h * 0.08 }
      : { x: w * 0.2, y: h * 0.86, w: w * 0.6, h: h * 0.08 };
    drawCredits(ctx, state, credits, { scale });
  }
}

function drawInkTitle(ctx, state, zone, scale) {
  const text = String(state.title || '').trim();
  if (!text) return;
  const size = px((zone.size || 104) * (state.titleScale || 1), scale);
  const used = Math.min(size, px(120, scale));
  ctx.save();
  ctx.font = `700 ${used}px "Playfair Display", serif`;
  ctx.textAlign = zone.align || 'center';
  ctx.textBaseline = 'alphabetic';
  ctx.fillStyle = INK;
  const x = zone.align === 'left' ? zone.x : zone.align === 'right' ? zone.x + zone.w : zone.x + zone.w / 2;
  ctx.fillText(text, x, zone.y + used);
  ctx.restore();
}

export async function renderCover(ctx, state, opts = {}) {
  const w = ctx.canvas.width;
  const h = ctx.canvas.height;
  const scale = opts.scale || w / DESIGN;
  const layout = layoutById(state.layoutId) || layoutById('vice-classic');
  const grade = state.gradeId || layout.defaultGrade;
  const compare = Boolean(opts.compare || state.compare);

  if (opts.letteringOnly) {
    ctx.clearRect(0, 0, w, h);
    const zone = placedZone(layout, w, h, scale);
    if (layout.id === 'neon-nights') {
      const field = layout.panels.find((panel) => panel.kind === 'field');
      const rect = field ? absRect(field, w, h) : zone;
      ctx.save();
      ctx.translate(rect.x + rect.w / 2, rect.y + rect.h / 2);
      ctx.rotate(-Math.PI / 2);
      const spun = { x: -rect.h / 2, y: -px(40, scale), w: rect.h * 0.86, h: rect.w, align: 'center', size: 96, rotate: 0 };
      const drawn = drawTitle(ctx, state, spun, { scale });
      ctx.restore();
      return drawn;
    }
    return drawTitle(ctx, state, zone, { scale });
  }

  ctx.clearRect(0, 0, w, h);
  paintBackground(ctx, layout, state, w, h);

  const photos = layout.panels.filter((panel) => panel.kind === 'photo' || panel.kind === 'plate');
  photos.forEach((panel, index) => {
    const rect = absRect(panel, w, h);
    const slot = panel.slot ?? index;
    const img = panel.kind === 'plate' && panel.border === 0 ? photoForPanel(state, slot) : photoForPanel(state, slot);
    const spec = panelState(state, slot);
    if (panel.kind === 'plate' && panel.border === 0 && img) {
      ctx.save();
      ctx.globalAlpha = 0.55;
      drawPanelPhoto(ctx, img, { x: 0, y: 0, w, h }, { zoom: 1, focusX: 0.5, focusY: 0.4, rotate: 0 });
      ctx.restore();
      ctx.fillStyle = 'rgba(10,9,16,0.28)';
      ctx.fillRect(0, 0, w, h);
      return;
    }
    drawPhotoPanel(ctx, img, rect, spec, grade, state.adjust, compare);
    if (rect.border) paperBorder(ctx, rect, scale);
  });

  layoutChrome(ctx, layout, state, w, h, scale);

  layout.panels.forEach((panel) => {
    if (panel.kind === 'field') return;
    if (panel.kind === 'plate' && panel.border === 0) return;
    const rect = absRect(panel, w, h);
    const spec = panelState(state, panel.slot ?? 0);
    if (!spec.caption && !spec.timecode) return;
    drawPanelCaption(ctx, spec, { ...rect, scale }, { scale, align: state.captionAlign || 'left' });
  });

  if (!opts.skipLettering) letteringPass(ctx, layout, state, w, h, scale);

  if (layout.id !== 'miami-lifestyle') {
    const barW = px(132, scale);
    const barH = px(28, scale);
    drawBarcode(ctx, state, { x: w - barW - px(28, scale), y: h - barH - px(36, scale), w: barW, h: barH }, { scale });
    drawTags(ctx, state, { w, h }, { scale });
  } else {
    ctx.save();
    ctx.fillStyle = INK;
    drawBarcode(ctx, state, { x: w * 0.08, y: h * 0.9, w: px(150, scale), h: px(32, scale) }, { scale });
    ctx.restore();
    const bandH = px(18, scale);
    ctx.fillStyle = CORAL;
    ctx.fillRect(0, h - bandH, w, bandH);
    ctx.font = `700 ${px(12, scale)}px Oswald, sans-serif`;
    ctx.fillStyle = PAPER;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(String(state.tagline || '').toUpperCase(), w / 2, h - bandH / 2);
  }

  if (!compare) {
    unifyPass(ctx, w, h, grade);
    paintAtmosphere(ctx, { w, h }, grade, {
      grain: state.grain,
      vignette: state.vignette,
      bloom: state.bloom,
      leak: state.leak,
    });
    balancePanels(ctx, layout, w, h);
  }
  return { w, h, layout: layout.id };
}

export function renderPreview(canvas, state, opts = {}) {
  const { w, h } = state.size;
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');
  return renderCover(ctx, state, { scale: w / DESIGN, forExport: false, ...opts });
}
