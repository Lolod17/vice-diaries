// Eight grade recipes. Each photo is filtered, then tinted; the atmosphere
// layer (grain, vignette, bloom, leak, chromatic edge) is painted over the
// finished poster and scaled by a 0..100 amount.

export const GRADES = [
  {
    id: 'vice-sunset',
    name: 'Vice Sunset',
    filter: { brightness: 1.06, contrast: 1.12, saturate: 1.28, sepia: 0.18, hueRotate: -8 },
    shadow: { color: '#4B2360', alpha: 0.42 },
    highlight: { color: '#FFB24A', alpha: 0.3 },
    split: { shadow: '#D8306F', highlight: '#FFB24A', alpha: 0.16 },
    atmosphere: { grain: 28, vignette: 34, bloom: 22, leak: 30 },
  },
  {
    id: 'miami-heat',
    name: 'Miami Heat',
    filter: { brightness: 1.1, contrast: 1.04, saturate: 1.4, sepia: 0.28, hueRotate: 6 },
    shadow: { color: '#FF5F52', alpha: 0.34 },
    highlight: { color: '#F8EBCB', alpha: 0.38 },
    split: { shadow: '#FF5F52', highlight: '#FFB24A', alpha: 0.2 },
    atmosphere: { grain: 18, vignette: 22, bloom: 30, leak: 40 },
  },
  {
    id: 'neon-purple',
    name: 'Neon Purple',
    filter: { brightness: 0.96, contrast: 1.22, saturate: 1.34, sepia: 0.04, hueRotate: 268 },
    shadow: { color: '#4B2360', alpha: 0.55 },
    highlight: { color: '#0E9C96', alpha: 0.32 },
    split: { shadow: '#0E9C96', highlight: '#D8306F', alpha: 0.22 },
    atmosphere: { grain: 20, vignette: 48, bloom: 34, leak: 14 },
  },
  {
    id: 'tropical-gold',
    name: 'Tropical Gold',
    filter: { brightness: 1.08, contrast: 1.06, saturate: 1.18, sepia: 0.34, hueRotate: 14 },
    shadow: { color: '#2B6E9C', alpha: 0.28 },
    highlight: { color: '#FFB24A', alpha: 0.46 },
    split: { shadow: '#2B6E9C', highlight: '#FFB24A', alpha: 0.14 },
    atmosphere: { grain: 16, vignette: 20, bloom: 26, leak: 24 },
  },
  {
    id: 'midnight-vice',
    name: 'Midnight Vice',
    filter: { brightness: 0.86, contrast: 1.3, saturate: 0.82, sepia: 0.1, hueRotate: 212 },
    shadow: { color: '#0A0910', alpha: 0.62 },
    highlight: { color: '#2B6E9C', alpha: 0.22 },
    split: { shadow: '#0A0910', highlight: '#0E9C96', alpha: 0.18 },
    atmosphere: { grain: 55, vignette: 52, bloom: 10, leak: 8 },
  },
  {
    id: 'retro-film',
    name: 'Retro Film',
    filter: { brightness: 1.02, contrast: 0.94, saturate: 0.78, sepia: 0.42, hueRotate: 18 },
    shadow: { color: '#4B2360', alpha: 0.3 },
    highlight: { color: '#F3E8D6', alpha: 0.34 },
    split: { shadow: '#2B6E9C', highlight: '#FFB24A', alpha: 0.12 },
    atmosphere: { grain: 42, vignette: 30, bloom: 14, leak: 20 },
  },
  {
    id: 'warm-cinema',
    name: 'Warm Cinema',
    filter: { brightness: 1.0, contrast: 1.16, saturate: 1.06, sepia: 0.22, hueRotate: -4 },
    shadow: { color: '#4B2360', alpha: 0.36 },
    highlight: { color: '#F8EBCB', alpha: 0.26 },
    split: { shadow: '#D8306F', highlight: '#F3E8D6', alpha: 0.14 },
    atmosphere: { grain: 24, vignette: 28, bloom: 18, leak: 12 },
  },
  {
    id: 'electric-night',
    name: 'Electric Night',
    filter: { brightness: 1.04, contrast: 1.26, saturate: 1.46, sepia: 0.0, hueRotate: 196 },
    shadow: { color: '#0E9C96', alpha: 0.4 },
    highlight: { color: '#D8306F', alpha: 0.34 },
    split: { shadow: '#0E9C96', highlight: '#FF5F52', alpha: 0.2 },
    atmosphere: { grain: 22, vignette: 40, bloom: 36, leak: 18 },
  },
];

export function gradeById(id) {
  return GRADES.find((grade) => grade.id === id) || GRADES[0];
}

const NEUTRAL = { brightness: 0, contrast: 0, saturation: 0, temperature: 0, highlights: 0, shadows: 0 };

function clamp(value, lo, hi) {
  return Math.min(hi, Math.max(lo, value));
}

function unit(value) {
  return clamp((value ?? 0) / 100, 0, 1);
}

function signed(value) {
  return clamp((value ?? 0) / 100, -1, 1);
}

function hexToRgb(hex) {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

function rgba(hex, alpha) {
  const [r, g, b] = hexToRgb(hex);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

function filterString(grade, adjust) {
  const f = grade.filter;
  const a = { ...NEUTRAL, ...adjust };
  const brightness = clamp(f.brightness + signed(a.brightness) * 0.5, 0.4, 1.8);
  const contrast = clamp(f.contrast + signed(a.contrast) * 0.5, 0.5, 1.8);
  const saturate = clamp(f.saturate + signed(a.saturation) * 0.8, 0, 2.4);
  return `brightness(${brightness}) contrast(${contrast}) saturate(${saturate}) sepia(${f.sepia}) hue-rotate(${f.hueRotate}deg)`;
}

// Luminance of one pixel, 0..255, used to mask the highlight and shadow lifts.
function luma(data, i) {
  return data[i] * 0.299 + data[i + 1] * 0.587 + data[i + 2] * 0.114;
}

function paintGradient(ctx, w, h, stops, composite) {
  const grad = ctx.createLinearGradient(0, 0, 0, h);
  for (const [at, color] of stops) grad.addColorStop(at, color);
  ctx.save();
  ctx.globalCompositeOperation = composite;
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, w, h);
  ctx.restore();
}

// Screen-brightens the bright pixels and lifts the dark ones, by `amount` in -1..1.
function paintLumaMask(ctx, w, h, amount, mode) {
  if (!amount) return;
  const image = ctx.getImageData(0, 0, w, h);
  const { data } = image;
  const lift = Math.abs(amount);
  for (let i = 0; i < data.length; i += 4) {
    const weight = mode === 'highlight' ? luma(data, i) / 255 : 1 - luma(data, i) / 255;
    const gain = 1 + amount * weight * 0.6;
    data[i] = clamp(data[i] * gain + (amount > 0 ? lift * weight * 28 : 0), 0, 255);
    data[i + 1] = clamp(data[i + 1] * gain + (amount > 0 ? lift * weight * 24 : 0), 0, 255);
    data[i + 2] = clamp(data[i + 2] * gain + (amount > 0 ? lift * weight * 18 : 0), 0, 255);
  }
  ctx.putImageData(image, 0, 0);
}

export function gradePhoto(img, grade, adjust = {}) {
  const recipe = typeof grade === 'string' ? gradeById(grade) : grade;
  const w = img.naturalWidth || img.width;
  const h = img.naturalHeight || img.height;
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');
  ctx.filter = filterString(recipe, adjust);
  ctx.drawImage(img, 0, 0, w, h);
  ctx.filter = 'none';

  paintGradient(ctx, w, h, [
    [0, rgba(recipe.shadow.color, 0)],
    [1, rgba(recipe.shadow.color, recipe.shadow.alpha)],
  ], 'multiply');
  paintGradient(ctx, w, h, [
    [0, rgba(recipe.highlight.color, recipe.highlight.alpha)],
    [1, rgba(recipe.highlight.color, 0)],
  ], 'screen');
  paintGradient(ctx, w, h, [
    [0, rgba(recipe.split.shadow, recipe.split.alpha)],
    [0.5, 'rgba(0, 0, 0, 0)'],
    [1, rgba(recipe.split.highlight, recipe.split.alpha)],
  ], 'overlay');

  const a = { ...NEUTRAL, ...adjust };
  const temp = signed(a.temperature);
  if (temp) {
    const tint = temp > 0 ? '#FFB24A' : '#2B6E9C';
    ctx.save();
    ctx.globalCompositeOperation = 'overlay';
    ctx.fillStyle = rgba(tint, Math.abs(temp) * 0.4);
    ctx.fillRect(0, 0, w, h);
    ctx.restore();
  }
  paintLumaMask(ctx, w, h, signed(a.highlights), 'highlight');
  paintLumaMask(ctx, w, h, signed(a.shadows), 'shadow');
  return canvas;
}

// One 256 px tile, hashed from its own coordinates so two renders match.
function grainTile() {
  const size = 256;
  const tile = document.createElement('canvas');
  tile.width = size;
  tile.height = size;
  const ctx = tile.getContext('2d');
  const image = ctx.createImageData(size, size);
  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      const n = (Math.imul(x + 1, 374761393) ^ Math.imul(y + 1, 668265263)) >>> 0;
      const v = n % 255;
      const i = (y * size + x) * 4;
      image.data[i] = v;
      image.data[i + 1] = v;
      image.data[i + 2] = v;
      image.data[i + 3] = 255;
    }
  }
  ctx.putImageData(image, 0, 0);
  return tile;
}

let grain = null;

function paintGrain(ctx, w, h, amount) {
  const alpha = unit(amount) * 0.16;
  if (!alpha) return;
  if (!grain) grain = grainTile();
  ctx.save();
  ctx.globalCompositeOperation = 'overlay';
  ctx.globalAlpha = alpha;
  const pattern = ctx.createPattern(grain, 'repeat');
  ctx.fillStyle = pattern;
  ctx.fillRect(0, 0, w, h);
  ctx.restore();
}

function paintVignette(ctx, w, h, amount) {
  const alpha = 0.25 + unit(amount) * 0.3;
  const reach = Math.max(w, h);
  const grad = ctx.createRadialGradient(w / 2, h / 2, reach * 0.28, w / 2, h / 2, reach * 0.72);
  grad.addColorStop(0, 'rgba(10, 9, 16, 0)');
  grad.addColorStop(1, rgba('#0A0910', alpha));
  ctx.save();
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, w, h);
  ctx.restore();
}

function paintBloom(ctx, w, h, amount) {
  const scale = 0.25;
  const small = document.createElement('canvas');
  small.width = Math.max(1, Math.round(w * scale));
  small.height = Math.max(1, Math.round(h * scale));
  const sctx = small.getContext('2d');
  sctx.filter = 'brightness(1.6) blur(6px)';
  sctx.drawImage(ctx.canvas, 0, 0, small.width, small.height);
  ctx.save();
  ctx.globalCompositeOperation = 'screen';
  ctx.globalAlpha = unit(amount) * 0.18;
  ctx.drawImage(small, 0, 0, w, h);
  ctx.restore();
}

function paintLeak(ctx, w, h, amount) {
  const alpha = unit(amount);
  if (!alpha) return;
  const reach = Math.max(w, h);
  ctx.save();
  ctx.globalCompositeOperation = 'screen';
  ctx.translate(w * 0.1, h * 0.05);
  ctx.rotate(-0.4);
  const coral = ctx.createLinearGradient(0, 0, reach * 0.6, 0);
  coral.addColorStop(0, rgba('#FF5F52', 0.55 * alpha));
  coral.addColorStop(1, 'rgba(255, 95, 82, 0)');
  ctx.fillStyle = coral;
  ctx.fillRect(-reach, -reach, reach * 2, reach);
  ctx.rotate(0.7);
  const amber = ctx.createLinearGradient(0, 0, reach * 0.5, 0);
  amber.addColorStop(0, rgba('#FFB24A', 0.4 * alpha));
  amber.addColorStop(1, 'rgba(255, 178, 74, 0)');
  ctx.fillStyle = amber;
  ctx.fillRect(-reach, -reach, reach * 2, reach);
  ctx.restore();
}

function paintChromaticEdge(ctx, w, h) {
  ctx.save();
  ctx.globalAlpha = 0.08;
  ctx.fillStyle = '#0E9C96';
  ctx.fillRect(0, 0, 2, h);
  ctx.fillStyle = '#FF5F52';
  ctx.fillRect(w - 2, 0, 2, h);
  ctx.restore();
}

function frameOf(ctx, size) {
  if (size && typeof size === 'object') return { w: size.w, h: size.h };
  const canvas = ctx.canvas;
  if (typeof size === 'number') {
    return canvas && canvas.width !== canvas.height
      ? { w: canvas.width, h: canvas.height }
      : { w: size, h: size };
  }
  return { w: canvas.width, h: canvas.height };
}

export function paintAtmosphere(ctx, size, grade, amount = {}) {
  const recipe = typeof grade === 'string' ? gradeById(grade) : grade;
  const base = recipe.atmosphere || {};
  const grainAmount = amount.grain ?? base.grain ?? 0;
  const vignetteAmount = amount.vignette ?? base.vignette ?? 0;
  const bloomAmount = amount.bloom ?? base.bloom ?? 0;
  const leakAmount = amount.leak ?? base.leak ?? 0;
  const { w, h } = frameOf(ctx, size);
  paintGrain(ctx, w, h, grainAmount);
  paintVignette(ctx, w, h, vignetteAmount);
  paintBloom(ctx, w, h, bloomAmount);
  paintLeak(ctx, w, h, leakAmount);
  paintChromaticEdge(ctx, w, h);
}
