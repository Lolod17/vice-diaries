// Eight grade recipes plus the atmosphere pass. Preview and export share these functions.

const clampByte = (n) => Math.max(0, Math.min(255, n));
const clamp01 = (n) => Math.max(0, Math.min(1, n));

export const GRADES = [
  {
    id: 'vice-sunset',
    name: 'Vice Sunset',
    filter: { brightness: 1.06, contrast: 1.12, saturate: 1.28, sepia: 0.18, hueRotate: -8 },
    shadow: { color: '#4b2360', alpha: 0.42 },
    highlight: { color: '#ffb24a', alpha: 0.34 },
    split: { shadow: '#d8306f', highlight: '#ff5f52', alpha: 0.16 },
    atmosphere: { grain: 32, vignette: 40, bloom: 22, leak: 28, edge: 18 },
  },
  {
    id: 'miami-heat',
    name: 'Miami Heat',
    filter: { brightness: 1.14, contrast: 1.08, saturate: 1.42, sepia: 0.28, hueRotate: 12 },
    shadow: { color: '#ff5f52', alpha: 0.36 },
    highlight: { color: '#f8ebcb', alpha: 0.4 },
    split: { shadow: '#d8306f', highlight: '#ffb24a', alpha: 0.2 },
    atmosphere: { grain: 18, vignette: 28, bloom: 36, leak: 48, edge: 12 },
  },
  {
    id: 'neon-purple',
    name: 'Neon Purple',
    filter: { brightness: 0.96, contrast: 1.24, saturate: 1.36, sepia: 0.04, hueRotate: 268 },
    shadow: { color: '#4b2360', alpha: 0.55 },
    highlight: { color: '#0e9c96', alpha: 0.32 },
    split: { shadow: '#d8306f', highlight: '#0e9c96', alpha: 0.22 },
    atmosphere: { grain: 24, vignette: 62, bloom: 44, leak: 16, edge: 40 },
  },
  {
    id: 'tropical-gold',
    name: 'Tropical Gold',
    filter: { brightness: 1.1, contrast: 1.04, saturate: 1.18, sepia: 0.42, hueRotate: 22 },
    shadow: { color: '#2b6e9c', alpha: 0.28 },
    highlight: { color: '#ffb24a', alpha: 0.48 },
    split: { shadow: '#0e9c96', highlight: '#ffb24a', alpha: 0.14 },
    atmosphere: { grain: 14, vignette: 22, bloom: 30, leak: 36, edge: 8 },
  },
  {
    id: 'midnight-vice',
    name: 'Midnight Vice',
    filter: { brightness: 0.82, contrast: 1.32, saturate: 0.86, sepia: 0.12, hueRotate: 196 },
    shadow: { color: '#0a0910', alpha: 0.62 },
    highlight: { color: '#2b6e9c', alpha: 0.22 },
    split: { shadow: '#14111c', highlight: '#4b2360', alpha: 0.18 },
    atmosphere: { grain: 55, vignette: 70, bloom: 10, leak: 8, edge: 14 },
  },
  {
    id: 'retro-film',
    name: 'Retro Film',
    filter: { brightness: 1.02, contrast: 0.92, saturate: 0.78, sepia: 0.55, hueRotate: 4 },
    shadow: { color: '#4b2360', alpha: 0.3 },
    highlight: { color: '#f3e8d6', alpha: 0.36 },
    split: { shadow: '#2b6e9c', highlight: '#ffb24a', alpha: 0.12 },
    atmosphere: { grain: 46, vignette: 34, bloom: 14, leak: 24, edge: 10 },
  },
  {
    id: 'warm-cinema',
    name: 'Warm Cinema',
    filter: { brightness: 1.04, contrast: 1.16, saturate: 1.08, sepia: 0.22, hueRotate: -14 },
    shadow: { color: '#d8306f', alpha: 0.24 },
    highlight: { color: '#f8ebcb', alpha: 0.3 },
    split: { shadow: '#ff5f52', highlight: '#ffb24a', alpha: 0.15 },
    atmosphere: { grain: 20, vignette: 38, bloom: 18, leak: 12, edge: 6 },
  },
  {
    id: 'electric-night',
    name: 'Electric Night',
    filter: { brightness: 1.08, contrast: 1.28, saturate: 1.52, sepia: 0.06, hueRotate: 188 },
    shadow: { color: '#0e9c96', alpha: 0.38 },
    highlight: { color: '#ff5f52', alpha: 0.34 },
    split: { shadow: '#0e9c96', highlight: '#d8306f', alpha: 0.22 },
    atmosphere: { grain: 30, vignette: 48, bloom: 52, leak: 20, edge: 46 },
  },
];

const gradeById = new Map(GRADES.map((grade) => [grade.id, grade]));

export function gradeByName(id) {
  return gradeById.get(id) || GRADES[0];
}

function imageSize(img) {
  return {
    w: img.naturalWidth || img.videoWidth || img.width || 0,
    h: img.naturalHeight || img.videoHeight || img.height || 0,
  };
}

function hexToRgb(hex) {
  const n = parseInt(hex.slice(1), 16);
  return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
}

function filterString(filter, adjust) {
  const bright = filter.brightness * (1 + (adjust.brightness || 0) / 100);
  const contrast = filter.contrast * (1 + (adjust.contrast || 0) / 140);
  const sat = filter.saturate * (1 + (adjust.saturation || 0) / 100);
  return `brightness(${bright}) contrast(${contrast}) saturate(${sat}) sepia(${filter.sepia}) hue-rotate(${filter.hueRotate}deg)`;
}

function fillVertical(ctx, w, h, top, bottom) {
  const paint = ctx.createLinearGradient(0, 0, 0, h);
  paint.addColorStop(0, top);
  paint.addColorStop(1, bottom);
  ctx.fillStyle = paint;
  ctx.fillRect(0, 0, w, h);
}

function applySplit(ctx, w, h, split) {
  const shadow = hexToRgb(split.shadow);
  const highlight = hexToRgb(split.highlight);
  const image = ctx.getImageData(0, 0, w, h);
  const data = image.data;
  const mix = split.alpha;
  for (let i = 0; i < data.length; i += 4) {
    const lum = (0.2126 * data[i] + 0.7152 * data[i + 1] + 0.0722 * data[i + 2]) / 255;
    const tone = lum < 0.5 ? shadow : highlight;
    data[i] = clampByte(data[i] * (1 - mix) + tone.r * mix);
    data[i + 1] = clampByte(data[i + 1] * (1 - mix) + tone.g * mix);
    data[i + 2] = clampByte(data[i + 2] * (1 - mix) + tone.b * mix);
  }
  ctx.putImageData(image, 0, 0);
}

function screenChannel(base, strength) {
  return base + (255 - base) * strength;
}

function applyAdjust(ctx, w, h, adjust) {
  const temp = (adjust.temperature || 0) / 100;
  if (temp) {
    const amount = Math.abs(temp) * 0.16;
    ctx.save();
    ctx.globalCompositeOperation = 'overlay';
    ctx.fillStyle = temp > 0
      ? `rgba(255, 178, 74, ${amount})`
      : `rgba(43, 110, 156, ${amount})`;
    ctx.fillRect(0, 0, w, h);
    ctx.restore();
  }
  const hi = (adjust.highlights || 0) / 100;
  const sh = (adjust.shadows || 0) / 100;
  if (!hi && !sh) return;
  const image = ctx.getImageData(0, 0, w, h);
  const data = image.data;
  for (let i = 0; i < data.length; i += 4) {
    let r = data[i];
    let g = data[i + 1];
    let b = data[i + 2];
    const lum = (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
    if (hi && lum > 0.5) {
      const mask = (lum - 0.5) * 2;
      const strength = hi * mask;
      if (strength > 0) {
        r = screenChannel(r, strength);
        g = screenChannel(g, strength);
        b = screenChannel(b, strength);
      } else {
        const keep = 1 + strength;
        r *= keep;
        g *= keep;
        b *= keep;
      }
    }
    if (sh && lum < 0.5) {
      const mask = (0.5 - lum) * 2;
      const strength = sh * mask;
      if (strength > 0) {
        const lift = 255 * Math.min(0.2, strength * 0.2);
        r = Math.max(r, lift);
        g = Math.max(g, lift);
        b = Math.max(b, lift);
      } else {
        const keep = 1 + strength * 0.65;
        r *= keep;
        g *= keep;
        b *= keep;
      }
    }
    data[i] = clampByte(r);
    data[i + 1] = clampByte(g);
    data[i + 2] = clampByte(b);
  }
  ctx.putImageData(image, 0, 0);
}

/** Grade one photo onto a new canvas. `adjust` is the manual slider set, each -100..100. */
export function gradePhoto(img, grade, adjust = {}) {
  const recipe = typeof grade === 'string' ? gradeByName(grade) : grade;
  const { w, h } = imageSize(img);
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, w);
  canvas.height = Math.max(1, h);
  const ctx = canvas.getContext('2d');
  if (w < 1 || h < 1) return canvas;
  ctx.filter = filterString(recipe.filter, adjust);
  ctx.drawImage(img, 0, 0, w, h);
  ctx.filter = 'none';
  ctx.save();
  ctx.globalCompositeOperation = 'multiply';
  fillVertical(ctx, w, h, 'rgba(0,0,0,0)', `rgba(${hexToRgb(recipe.shadow.color).r}, ${hexToRgb(recipe.shadow.color).g}, ${hexToRgb(recipe.shadow.color).b}, ${recipe.shadow.alpha})`);
  ctx.restore();
  ctx.save();
  ctx.globalCompositeOperation = 'screen';
  const hi = hexToRgb(recipe.highlight.color);
  fillVertical(ctx, w, h, `rgba(${hi.r}, ${hi.g}, ${hi.b}, ${recipe.highlight.alpha})`, 'rgba(0,0,0,0)');
  ctx.restore();
  applySplit(ctx, w, h, recipe.split);
  applyAdjust(ctx, w, h, adjust);
  return canvas;
}

let grainTile = null;

function noiseTile() {
  if (grainTile) return grainTile;
  const size = 256;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  const image = ctx.createImageData(size, size);
  const data = image.data;
  let seed = 0x6d2b79f5;
  for (let i = 0; i < data.length; i += 4) {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    const v = seed & 255;
    data[i] = v;
    data[i + 1] = v;
    data[i + 2] = v;
    data[i + 3] = 255;
  }
  ctx.putImageData(image, 0, 0);
  grainTile = canvas;
  return canvas;
}

function amountOf(value, fallback) {
  const n = Number(value);
  return clamp01((Number.isFinite(n) ? n : fallback) / 100);
}

/**
 * Atmosphere over the composed poster. `amount` is `{ grain, vignette, bloom, leak, edge }`,
 * each 0..100; a missing key falls back to the grade recipe. Zero is a no-op for that effect.
 */
export function paintAtmosphere(ctx, size, grade, amount = {}) {
  const recipe = typeof grade === 'string' ? gradeByName(grade) : grade;
  const base = recipe.atmosphere;
  const w = size.w;
  const h = size.h;
  const grain = amountOf(amount.grain, base.grain);
  const vignette = amountOf(amount.vignette, base.vignette);
  const bloom = amountOf(amount.bloom, base.bloom);
  const leak = amountOf(amount.leak, base.leak);
  const edge = amountOf(amount.edge, base.edge);

  if (grain > 0) {
    ctx.save();
    ctx.globalCompositeOperation = 'overlay';
    ctx.globalAlpha = 0.04 + grain * 0.12;
    const tile = noiseTile();
    const pattern = ctx.createPattern(tile, 'repeat');
    ctx.fillStyle = pattern;
    ctx.fillRect(0, 0, w, h);
    ctx.restore();
  }

  if (vignette > 0) {
    const radius = Math.hypot(w, h) * 0.62;
    const paint = ctx.createRadialGradient(w / 2, h / 2, radius * 0.35, w / 2, h / 2, radius);
    const alpha = 0.25 + vignette * 0.3;
    paint.addColorStop(0, 'rgba(0, 0, 0, 0)');
    paint.addColorStop(1, `rgba(10, 9, 16, ${alpha})`);
    ctx.save();
    ctx.fillStyle = paint;
    ctx.fillRect(0, 0, w, h);
    ctx.restore();
  }

  if (bloom > 0) {
    const scale = 0.25;
    const small = document.createElement('canvas');
    small.width = Math.max(1, Math.round(w * scale));
    small.height = Math.max(1, Math.round(h * scale));
    const sctx = small.getContext('2d');
    sctx.filter = 'brightness(1.8) contrast(1.4)';
    sctx.drawImage(ctx.canvas, 0, 0, small.width, small.height);
    sctx.filter = 'none';
    const blurred = document.createElement('canvas');
    blurred.width = small.width;
    blurred.height = small.height;
    const bctx = blurred.getContext('2d');
    bctx.filter = 'blur(18px)';
    bctx.drawImage(small, 0, 0);
    ctx.save();
    ctx.globalCompositeOperation = 'screen';
    ctx.globalAlpha = bloom * 0.18;
    ctx.drawImage(blurred, 0, 0, w, h);
    ctx.restore();
  }

  if (leak > 0) {
    ctx.save();
    ctx.translate(w * 0.92, h * 0.08);
    ctx.rotate(-0.6);
    const coral = ctx.createLinearGradient(0, 0, w * 0.7, 0);
    coral.addColorStop(0, `rgba(255, 95, 82, ${0.18 + leak * 0.28})`);
    coral.addColorStop(1, 'rgba(255, 95, 82, 0)');
    ctx.fillStyle = coral;
    ctx.fillRect(-w * 0.2, -h * 0.4, w, h * 0.7);
    ctx.rotate(0.35);
    const amber = ctx.createLinearGradient(0, 0, w * 0.5, h * 0.4);
    amber.addColorStop(0, `rgba(255, 178, 74, ${0.12 + leak * 0.22})`);
    amber.addColorStop(1, 'rgba(255, 178, 74, 0)');
    ctx.fillStyle = amber;
    ctx.fillRect(-w * 0.1, -h * 0.1, w * 0.8, h * 0.6);
    ctx.restore();
  }

  if (edge > 0) {
    const alpha = 0.08 * edge;
    ctx.save();
    ctx.fillStyle = `rgba(14, 156, 150, ${alpha})`;
    ctx.fillRect(2, 2, 2, h - 4);
    ctx.fillStyle = `rgba(255, 95, 82, ${alpha})`;
    ctx.fillRect(w - 4, 2, 2, h - 4);
    ctx.restore();
  }
}
