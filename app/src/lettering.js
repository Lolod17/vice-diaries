// Poster type. Every draw takes a 2d context, the studio state and a rect in
// canvas pixels, so preview and export share one path. Sizes are given in the
// 1080-wide design space and multiplied by `scale`.

const INK = '#0A0910';
const PAPER = '#F3E8D6';
const CREAM = '#F8EBCB';
const AMBER = '#FFB24A';
const CORAL = '#FF5F52';
const MAGENTA = '#D8306F';

const TITLE_MAX = 168;
const TITLE_MIN = 72;
const TITLE_MARGIN = 24;

function px(n) {
  return Math.max(1, Math.round(n));
}

function designSize(scale, value) {
  return px(value * (scale || 1));
}

// Splits `text` into at most `max` lines, breaking on spaces and keeping a
// word that is longer than the line on its own line rather than overflowing it.
export function wrapLines(ctx, text, maxWidth, maxLines) {
  const words = String(text || '').trim().split(/\s+/).filter(Boolean);
  if (!words.length) return [];
  const limit = Math.max(1, maxLines || 1);
  const lines = [];
  let current = '';
  for (const word of words) {
    if (lines.length === limit) break;
    const candidate = current ? `${current} ${word}` : word;
    if (ctx.measureText(candidate).width <= maxWidth || !current) {
      current = candidate;
      continue;
    }
    lines.push(current);
    current = word;
  }
  if (current && lines.length < limit) lines.push(current);
  return lines;
}

function titleFont(size) {
  return `700 ${size}px "Playfair Display", serif`;
}

// Shrinks the cap height until the two-line block, stroke included, sits inside
// the zone with a margin on every side. Returns the size, the lines and the
// measured width of the wider line.
function fitTitle(ctx, text, zone, scale) {
  const margin = TITLE_MARGIN * scale;
  const boxW = Math.max(8, zone.w - margin * 2);
  const boxH = Math.max(8, zone.h - margin * 2);
  let size = TITLE_MAX * scale;
  let rows = [text];
  let widest = Infinity;
  for (let guard = 0; guard < 40; guard += 1) {
    ctx.font = titleFont(size);
    rows = wrapLines(ctx, text, boxW, 2);
    widest = 0;
    for (const row of rows) widest = Math.max(widest, ctx.measureText(row).width);
    const step = size * 0.86;
    const block = rows.length * step;
    const stroke = 7 * scale * 2;
    if ((widest + stroke <= boxW && block + stroke <= boxH) || size <= TITLE_MIN * scale) break;
    size = Math.max(TITLE_MIN * scale, size * 0.92);
  }
  return { size, rows, widest };
}

function anchorX(align, zone, scale) {
  const pad = 8 * scale;
  if (align === 'center') return zone.x + zone.w / 2;
  if (align === 'right') return zone.x + zone.w - pad;
  return zone.x + pad;
}

// Title: cream to amber to coral fill, a near-black stroke under it, a paper
// hairline offset up-left, and a hard shadow. The size is fitted, not fixed.
export function drawTitle(ctx, state, zone, scale) {
  const text = String(state.title || '').trim();
  if (!text || !zone || zone.w <= 0 || zone.h <= 0) return null;
  const align = state.titleAlign || 'left';
  ctx.save();
  const fitted = fitTitle(ctx, text, zone, scale);
  const { size, rows } = fitted;
  const x = anchorX(align, zone, scale);
  const y0 = zone.y + zone.h * 0.5;
  ctx.translate(x, y0);
  ctx.rotate(((state.titleRotate || 0) * Math.PI) / 180);
  ctx.font = titleFont(size);
  ctx.textAlign = align === 'center' ? 'center' : align === 'right' ? 'right' : 'left';
  ctx.textBaseline = 'middle';
  ctx.lineJoin = 'round';
  ctx.miterLimit = 2;
  const step = size * 0.86;
  rows.forEach((row, i) => {
    const y = (i - (rows.length - 1) / 2) * step;
    ctx.lineWidth = designSize(scale, 7);
    ctx.strokeStyle = INK;
    ctx.strokeText(row, 0, y);
    ctx.lineWidth = designSize(scale, 2);
    ctx.strokeStyle = PAPER;
    ctx.strokeText(row, -2 * scale, y - 2 * scale);
    const fill = ctx.createLinearGradient(0, y - size * 0.62, 0, y + size * 0.62);
    fill.addColorStop(0, CREAM);
    fill.addColorStop(0.55, AMBER);
    fill.addColorStop(1, CORAL);
    ctx.fillStyle = fill;
    ctx.shadowColor = 'rgba(10, 9, 16, 0.42)';
    ctx.shadowOffsetX = 10 * scale;
    ctx.shadowOffsetY = 14 * scale;
    ctx.shadowBlur = 0;
    ctx.fillText(row, 0, y);
    ctx.shadowColor = 'transparent';
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = 0;
  });
  ctx.restore();
  return { size, width: fitted.widest, lines: rows.length };
}

export function drawSubtitle(ctx, state, zone, scale) {
  const text = String(state.subtitle || '').trim();
  if (!text || !zone) return;
  const size = designSize(scale, 38);
  const align = state.titleAlign || 'left';
  ctx.save();
  ctx.font = `italic ${size}px "Instrument Serif", serif`;
  ctx.fillStyle = PAPER;
  ctx.globalAlpha = 0.92;
  ctx.textAlign = align === 'center' ? 'center' : align === 'right' ? 'right' : 'left';
  ctx.textBaseline = 'alphabetic';
  const rows = wrapLines(ctx, text, Math.max(8, zone.w - 16 * scale), 2);
  const x = anchorX(align, zone, scale);
  rows.forEach((row, i) => {
    ctx.fillText(row, x, zone.y + size + i * size * 1.15);
  });
  ctx.restore();
}

// A timecode chip in Roboto Mono above an Oswald caption, with a coral rule.
export function drawPanelCaption(ctx, panel, rect, state, scale) {
  const caption = String(panel.caption || '').trim();
  const timecode = String(panel.timecode || '').trim();
  if (!caption && !timecode) return;
  const align = (state && state.captionAlign) || 'left';
  const pad = 10 * scale;
  const textX = align === 'center' ? rect.x + rect.w / 2 : align === 'right' ? rect.x + rect.w - pad : rect.x + pad;
  ctx.save();
  ctx.beginPath();
  ctx.rect(rect.x, rect.y, rect.w, rect.h);
  ctx.clip();
  ctx.textAlign = align === 'center' ? 'center' : align === 'right' ? 'right' : 'left';
  ctx.textBaseline = 'top';
  let y = rect.y + pad;
  if (timecode) {
    const chip = designSize(scale, 18);
    ctx.font = `${chip}px "Roboto Mono", monospace`;
    const width = ctx.measureText(timecode).width + 12 * scale;
    const chipX = align === 'center' ? textX - width / 2 : align === 'right' ? textX - width : textX;
    ctx.fillStyle = 'rgba(10, 9, 16, 0.55)';
    ctx.fillRect(chipX - 4 * scale, y - 2 * scale, width + 4 * scale, chip + 6 * scale);
    ctx.globalAlpha = 0.7;
    ctx.fillStyle = PAPER;
    ctx.fillText(timecode, textX, y);
    ctx.globalAlpha = 1;
    y += chip + 8 * scale;
  }
  if (caption) {
    const cap = designSize(scale, 22);
    ctx.font = `600 ${cap}px Oswald, sans-serif`;
    ctx.letterSpacing = `${0.14 * cap}px`;
    ctx.fillStyle = PAPER;
    const row = caption.toUpperCase();
    ctx.fillText(row, textX, y);
    const rule = Math.min(rect.w * 0.46, Math.max(28 * scale, ctx.measureText(row).width));
    const ruleX = align === 'center' ? textX - rule / 2 : align === 'right' ? textX - rule : textX;
    ctx.fillStyle = CORAL;
    ctx.fillRect(ruleX, y + cap + 4 * scale, rule, Math.max(1, 2 * scale));
  }
  ctx.restore();
}

export function drawCredits(ctx, state, x, y, scale) {
  if (state.showCredits === false) return;
  const rows = [
    'VICE CITY PICTURES',
    'A MIDNIGHT CAUSEWAY FILM',
    `ISSUE ${state.issue || '01'}`,
    'PHOTOGRAPHED ON THE STRIP',
    'COLOUR BY THE NIGHT SHIFT',
  ];
  ctx.save();
  ctx.font = `300 ${designSize(scale, 13)}px Oswald, sans-serif`;
  ctx.letterSpacing = `${0.08 * 13 * scale}px`;
  ctx.fillStyle = PAPER;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'top';
  rows.forEach((row, i) => ctx.fillText(row, x, y + i * 16 * scale));
  ctx.globalAlpha = 0.55;
  const marks = ['VC', 'MD', '01', 'R'];
  const markY = y + rows.length * 16 * scale + 8 * scale;
  marks.forEach((mark, i) => {
    ctx.strokeRect(x - 54 * scale + i * 30 * scale, markY, 16 * scale, 16 * scale);
    ctx.fillText(mark, x - 46 * scale + i * 30 * scale, markY + 2 * scale);
  });
  ctx.restore();
}

// 48 bars from a fixed integer hash, so the same poster always prints the same
// strip. `n` is mixed twice so neighbouring bars do not share a width.
export function drawBarcode(ctx, x, y, w, h) {
  ctx.save();
  ctx.fillStyle = PAPER;
  const slot = w / 48;
  for (let i = 0; i < 48; i += 1) {
    let n = (Math.imul(i + 3, 1103515245) + 12345) >>> 0;
    n = (Math.imul(n ^ (n >>> 16), 2246822519)) >>> 0;
    if (n % 5 === 0) continue;
    const bw = Math.max(1, slot * (0.45 + (n % 5) * 0.12));
    ctx.fillRect(x + slot * i, y, Math.min(bw, slot), h);
  }
  ctx.restore();
}

// Issue tag, an outlined rating box and the magenta tagline band.
export function drawTags(ctx, state, w, h, scale) {
  ctx.save();
  const box = 18 * scale;
  ctx.strokeStyle = PAPER;
  ctx.lineWidth = Math.max(1, 1.5 * scale);
  ctx.strokeRect(w - (16 * scale + box), 16 * scale, box, box);
  ctx.fillStyle = PAPER;
  ctx.font = `700 ${designSize(scale, 12)}px Oswald, sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(String(state.rating || 'R').slice(0, 1).toUpperCase(), w - (16 * scale + box / 2), 16 * scale + box / 2);
  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';
  ctx.fillText(`ISSUE ${state.issue || '01'}`, 16 * scale, 16 * scale);
  const band = Math.max(1, 10 * scale);
  ctx.fillStyle = MAGENTA;
  ctx.fillRect(0, h - band, w, band);
  ctx.fillStyle = PAPER;
  ctx.font = `700 ${designSize(scale, 12)}px Oswald, sans-serif`;
  ctx.letterSpacing = `${0.18 * 12 * scale}px`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(String(state.tagline || '').toUpperCase(), w / 2, h - band / 2);
  ctx.restore();
}
