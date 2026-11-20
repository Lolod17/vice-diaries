// Eight grade recipes plus the atmosphere layer. Each preset is a distinct
// filter / shadow / highlight / split-tone set; sliders scale on top of it.

const clamp = (value, lo, hi) => Math.min(hi, Math.max(lo, value));
const unit = (value) => clamp((Number(value) || 0) / 100, 0, 1);
const signed = (value) => clamp((Number(value) || 0) / 100, -1, 1);

function recipe(id, name, filter, shadow, highlight, split, atmosphere) {
  return Object.freeze({
    id,
    name,
    filter: Object.freeze(filter),
    shadow: Object.freeze(shadow),
    highlight: Object.freeze(highlight),
    split: Object.freeze(split),
    atmosphere: Object.freeze(atmosphere),
  });
}

export const GRADES = Object.freeze([
  recipe('vice-sunset', 'Vice Sunset',
    { brightness: 1.06, contrast: 1.12, saturate: 1.28, sepia: 0.18, hueRotate: -8 },
    { color: '#4B2360', alpha: 0.42 },
    { color: '#FFB24A', alpha: 0.34 },
    { shadow: '#D8306F', highlight: '#FFB24A', alpha: 0.18 },
    { grain: 28, vignette: 32, bloom: 22, leak: 18 }),
  recipe('miami-heat', 'Miami Heat',
    { brightness: 1.14, contrast: 1.08, saturate: 1.42, sepia: 0.08, hueRotate: 6 },
    { color: '#FF5F52', alpha: 0.30 },
    { color: '#F8EBCB', alpha: 0.40 },
    { shadow: '#D8306F', highlight: '#FF5F52', alpha: 0.16 },
    { grain: 18, vignette: 22, bloom: 30, leak: 26 }),
  recipe('neon-purple', 'Neon Purple',
    { brightness: 0.96, contrast: 1.22, saturate: 1.36, sepia: 0.04, hueRotate: -28 },
    { color: '#4B2360', alpha: 0.55 },
    { color: '#0E9C96', alpha: 0.28 },
    { shadow: '#4B2360', highlight: '#0E9C96', alpha: 0.22 },
    { grain: 22, vignette: 62, bloom: 34, leak: 12 }),
  recipe('tropical-gold', 'Tropical Gold',
    { brightness: 1.10, contrast: 1.06, saturate: 1.22, sepia: 0.28, hueRotate: 14 },
    { color: '#2B6E9C', alpha: 0.26 },
    { color: '#FFB24A', alpha: 0.46 },
    { shadow: '#0E9C96', highlight: '#FFB24A', alpha: 0.14 },
    { grain: 16, vignette: 18, bloom: 20, leak: 22 }),
  recipe('midnight-vice', 'Midnight Vice',
    { brightness: 0.86, contrast: 1.28, saturate: 0.78, sepia: 0.12, hueRotate: -16 },
    { color: '#0A0910', alpha: 0.62 },
    { color: '#D8306F', alpha: 0.22 },
    { shadow: '#14111C', highlight: '#D8306F', alpha: 0.20 },
    { grain: 55, vignette: 48, bloom: 10, leak: 8 }),
  recipe('retro-film', 'Retro Film',
    { brightness: 1.02, contrast: 0.94, saturate: 0.82, sepia: 0.42, hueRotate: 18 },
    { color: '#4B2360', alpha: 0.28 },
    { color: '#F3E8D6', alpha: 0.36 },
    { shadow: '#2B6E9C', highlight: '#FFB24A', alpha: 0.15 },
    { grain: 40, vignette: 28, bloom: 14, leak: 24 }),
  recipe('warm-cinema', 'Warm Cinema',
    { brightness: 1.04, contrast: 1.10, saturate: 1.08, sepia: 0.22, hueRotate: 4 },
    { color: '#4B2360', alpha: 0.34 },
    { color: '#F8EBCB', alpha: 0.30 },
    { shadow: '#D8306F', highlight: '#F3E8D6', alpha: 0.12 },
    { grain: 24, vignette: 26, bloom: 16, leak: 14 }),
  recipe('electric-night', 'Electric Night',
    { brightness: 0.98, contrast: 1.26, saturate: 1.48, sepia: 0.02, hueRotate: 168 },
    { color: '#0E9C96', alpha: 0.38 },
    { color: '#FF5F52', alpha: 0.32 },
    { shadow: '#0E9C96', highlight: '#FF5F52', alpha: 0.22 },
    { grain: 30, vignette: 44, bloom: 36, leak: 20 }),
]);

const GRADE_BY_ID = new Map(GRADES.map((grade) => [grade.id, grade]));

export function gradeById(id) {
  return GRADE_BY_ID.get(id) ?? null;
}

function filterString(filter, adjust) {
  const bright = filter.brightness * (1 + 0.45 * signed(adjust.brightness));
  const contrast = filter.contrast * (1 + 0.4 * signed(adjust.contrast));
  const saturate = Math.min(1.25, filter.saturate * (1 + 0.7 * signed(adjust.saturation)));
  return [
    `brightness(${bright.toFixed(3)})`,
    `contrast(${contrast.toFixed(3)})`,
    `saturate(${Math.max(0, saturate).toFixed(3)})`,
    `sepia(${filter.sepia.toFixed(3)})`,
    `hue-rotate(${filter.hueRotate}deg)`,
  ].join(' ');
}

function fillGradient(ctx, w, h, stops, alpha) {
  const gradient = ctx.createLinearGradient(0, h, 0, 0);
  for (const [offset, color] of stops) gradient.addColorStop(offset, color);
  ctx.fillStyle = gradient;
  ctx.globalAlpha = alpha;
  ctx.fillRect(0, 0, w, h);
  ctx.globalAlpha = 1;
}

const gradeCache = new WeakMap();

export function gradePhoto(img, grade, adjust = {}) {
  const recipeId = typeof grade === 'string' ? grade : grade?.id;
  const preset = (typeof grade === 'object' && grade?.filter) ? grade : gradeById(recipeId) ?? GRADES[0];
  const width = img?.naturalWidth || img?.videoWidth || img?.width || 0;
  const height = img?.naturalHeight || img?.videoHeight || img?.height || 0;
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, width);
  canvas.height = Math.max(1, height);
  const ctx = canvas.getContext('2d');
  if (!ctx || !(width > 0 && height > 0)) return canvas;

  ctx.filter = filterString(preset.filter, adjust);
  ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
  ctx.filter = 'none';

  ctx.globalCompositeOperation = 'multiply';
  fillGradient(ctx, canvas.width, canvas.height, [[0, preset.shadow.color], [0.55, 'transparent']], preset.shadow.alpha);

  ctx.globalCompositeOperation = 'screen';
  fillGradient(ctx, canvas.width, canvas.height, [[0.4, 'transparent'], [1, preset.highlight.color]], preset.highlight.alpha);

  ctx.globalCompositeOperation = 'overlay';
  const split = ctx.createLinearGradient(0, canvas.height, 0, 0);
  split.addColorStop(0, preset.split.shadow);
  split.addColorStop(0.5, 'transparent');
  split.addColorStop(1, preset.split.highlight);
  ctx.fillStyle = split;
  ctx.globalAlpha = preset.split.alpha;
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.globalAlpha = 1;
  ctx.globalCompositeOperation = 'source-over';

  paintAdjustments(ctx, canvas.width, canvas.height, adjust);
  gradeCache.set(canvas, { id: preset.id, adjust: { ...adjust } });
  return canvas;
}

function paintAdjustments(ctx, w, h, adjust) {
  const temperature = signed(adjust.temperature);
  if (temperature !== 0) {
    ctx.globalCompositeOperation = 'overlay';
    ctx.fillStyle = temperature > 0 ? '#FFB24A' : '#2B6E9C';
    ctx.globalAlpha = Math.abs(temperature) * 0.16 + 0.02;
    ctx.fillRect(0, 0, w, h);
  }

  const highlights = signed(adjust.highlights);
  if (highlights !== 0) {
    ctx.globalCompositeOperation = highlights > 0 ? 'screen' : 'multiply';
    const lift = ctx.createLinearGradient(0, h, 0, 0);
    lift.addColorStop(0, 'rgba(0,0,0,0)');
    lift.addColorStop(0.55, 'rgba(0,0,0,0)');
    lift.addColorStop(1, highlights > 0 ? '#F8EBCB' : '#0A0910');
    ctx.fillStyle = lift;
    ctx.globalAlpha = Math.abs(highlights) * 0.45;
    ctx.fillRect(0, 0, w, h);
  }

  const shadows = signed(adjust.shadows);
  if (shadows !== 0) {
    ctx.globalCompositeOperation = shadows > 0 ? 'lighter' : 'multiply';
    const shade = ctx.createLinearGradient(0, h, 0, 0);
    shade.addColorStop(0, shadows > 0 ? '#F3E8D6' : '#0A0910');
    shade.addColorStop(0.45, 'rgba(0,0,0,0)');
    shade.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = shade;
    ctx.globalAlpha = shadows > 0 ? 0.08 + Math.abs(shadows) * 0.12 : Math.abs(shadows) * 0.4;
    ctx.fillRect(0, 0, w, h);
  }

  ctx.globalAlpha = 1;
  ctx.globalCompositeOperation = 'source-over';
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
  let seed = 0x9e3779b1;
  for (let i = 0; i < image.data.length; i += 4) {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    const v = seed & 255;
    image.data[i] = v;
    image.data[i + 1] = v;
    image.data[i + 2] = v;
    image.data[i + 3] = 255;
  }
  ctx.putImageData(image, 0, 0);
  grainTile = canvas;
  return canvas;
}

function paintGrain(ctx, w, h, amount) {
  const alpha = 0.04 + unit(amount) * 0.12;
  const tile = noiseTile();
  const pattern = ctx.createPattern(tile, 'repeat');
  ctx.save();
  ctx.globalCompositeOperation = 'overlay';
  ctx.globalAlpha = alpha;
  ctx.fillStyle = pattern;
  ctx.fillRect(0, 0, w, h);
  ctx.restore();
}

function paintVignette(ctx, w, h, amount) {
  const alpha = 0.25 + unit(amount) * 0.30;
  const radius = Math.hypot(w, h) * 0.62;
  const gradient = ctx.createRadialGradient(w / 2, h / 2, radius * 0.35, w / 2, h / 2, radius);
  gradient.addColorStop(0, 'rgba(10,9,16,0)');
  gradient.addColorStop(1, `rgba(10,9,16,${alpha.toFixed(3)})`);
  ctx.save();
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, w, h);
  ctx.restore();
}

function paintBloom(ctx, w, h, amount) {
  const scale = 0.25;
  const small = document.createElement('canvas');
  small.width = Math.max(1, Math.round(w * scale));
  small.height = Math.max(1, Math.round(h * scale));
  const pass = small.getContext('2d');
  pass.filter = 'brightness(1.6) contrast(1.4) blur(18px)';
  pass.drawImage(ctx.canvas, 0, 0, small.width, small.height);
  pass.filter = 'none';
  ctx.save();
  ctx.globalCompositeOperation = 'screen';
  ctx.globalAlpha = 0.18 * unit(amount);
  ctx.imageSmoothingEnabled = true;
  ctx.drawImage(small, 0, 0, w, h);
  ctx.restore();
}

function paintLeak(ctx, w, h, amount) {
  const strength = unit(amount);
  ctx.save();
  ctx.globalCompositeOperation = 'screen';
  ctx.translate(w * 0.08, h * 0.92);
  ctx.rotate(-0.6);
  const coral = ctx.createLinearGradient(0, 0, w * 0.7, 0);
  coral.addColorStop(0, 'rgba(255,95,82,0.0)');
  coral.addColorStop(0.35, `rgba(255,95,82,${(0.55 * strength).toFixed(3)})`);
  coral.addColorStop(1, 'rgba(255,95,82,0)');
  ctx.fillStyle = coral;
  ctx.fillRect(-w, -h * 0.25, w * 2, h * 0.5);
  ctx.rotate(0.35);
  const amber = ctx.createLinearGradient(0, 0, w * 0.55, 0);
  amber.addColorStop(0, 'rgba(255,178,74,0)');
  amber.addColorStop(0.4, `rgba(255,178,74,${(0.4 * strength).toFixed(3)})`);
  amber.addColorStop(1, 'rgba(255,178,74,0)');
  ctx.fillStyle = amber;
  ctx.fillRect(-w * 0.4, -h * 0.15, w * 1.4, h * 0.32);
  ctx.restore();
}

function paintChromatic(ctx, w, h, amount) {
  const alpha = 0.08 * unit(amount);
  if (alpha <= 0) return;
  ctx.save();
  ctx.globalCompositeOperation = 'screen';
  ctx.fillStyle = `rgba(14,156,150,${alpha.toFixed(3)})`;
  ctx.fillRect(2, 2, 2, h - 4);
  ctx.fillStyle = `rgba(255,95,82,${alpha.toFixed(3)})`;
  ctx.fillRect(w - 4, 2, 2, h - 4);
  ctx.restore();
}

// Atmosphere sits over the composed poster. Each channel is a no-op at 0.
// Chromatic edge follows the leak slider so the five named effects stay one set.
export function paintAtmosphere(ctx, size, grade, amount = {}) {
  const preset = (typeof grade === 'object' && grade?.atmosphere) ? grade : gradeById(grade) ?? GRADES[0];
  const base = preset.atmosphere;
  const w = size?.w || ctx.canvas?.width || 0;
  const h = size?.h || ctx.canvas?.height || 0;
  if (!(w > 0 && h > 0)) return;
  const grain = amount.grain ?? base.grain;
  const vignette = amount.vignette ?? base.vignette;
  const bloom = amount.bloom ?? base.bloom;
  const leak = amount.leak ?? base.leak;
  if (grain > 0) paintGrain(ctx, w, h, grain);
  if (vignette > 0) paintVignette(ctx, w, h, vignette);
  if (bloom > 0) paintBloom(ctx, w, h, bloom);
  if (leak > 0) {
    paintLeak(ctx, w, h, leak);
    paintChromatic(ctx, w, h, leak);
  }
}
