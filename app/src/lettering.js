const INK = '#0A0910';
const PAPER = '#F3E8D6';
const CREAM = '#F8EBCB';
const AMBER = '#FFB24A';
const CORAL = '#FF5F52';
const MAGENTA = '#D8306F';

const TITLE_FACE = '"Playfair Display", serif';
const SUB_FACE = '"Instrument Serif", serif';
const CAP_FACE = 'Oswald, sans-serif';
const MONO_FACE = '"Roboto Mono", monospace';

const clamp = (value, lo, hi) => Math.min(hi, Math.max(lo, value));

function px(value, scale) {
  return value * (Number.isFinite(scale) && scale > 0 ? scale : 1);
}

function widthOf(ctx, text) {
  return ctx.measureText(text).width;
}

function breakLine(ctx, text, maxWidth) {
  const words = String(text).split(/\s+/).filter(Boolean);
  if (!words.length) return [''];
  const lines = [];
  let line = words[0];
  for (let i = 1; i < words.length; i += 1) {
    const next = `${line} ${words[i]}`;
    if (widthOf(ctx, next) <= maxWidth) line = next;
    else {
      lines.push(line);
      line = words[i];
    }
  }
  lines.push(line);
  return lines;
}

function squashLine(ctx, text, maxWidth) {
  if (widthOf(ctx, text) <= maxWidth) return text;
  const words = text.split(/\s+/);
  if (words.length === 1) return text;
  let best = text;
  let bestOverflow = Infinity;
  for (let cut = 1; cut < words.length; cut += 1) {
    const a = words.slice(0, cut).join(' ');
    const b = words.slice(cut).join(' ');
    const overflow = Math.max(widthOf(ctx, a), widthOf(ctx, b)) - maxWidth;
    if (overflow < bestOverflow) {
      bestOverflow = overflow;
      best = `${a}\n${b}`;
    }
  }
  return best;
}

// Word wrap. `maxLines` of 2 is the poster rule; overflow collapses onto the last line.
export function wrapLines(ctx, text, maxWidth, maxLines = 2) {
  const raw = String(text ?? '').trim();
  if (!raw) return [];
  const limit = Math.max(1, maxLines | 0);
  const chunks = breakLine(ctx, raw, maxWidth);
  if (chunks.length <= limit) return chunks;
  if (limit === 1) return [chunks.join(' ')];
  const head = chunks.slice(0, limit - 1);
  const tail = chunks.slice(limit - 1).join(' ');
  return [...head, tail];
}

function setTitleFont(ctx, size) {
  ctx.font = `700 ${size}px ${TITLE_FACE}`;
  ctx.textBaseline = 'alphabetic';
}

function titleLinesAt(ctx, text, size, maxWidth) {
  setTitleFont(ctx, size);
  const words = String(text ?? '').trim().split(/\s+/).filter(Boolean);
  if (!words.length) return [];
  if (words.length === 1) return [words[0]];
  const joined = words.join(' ');
  if (widthOf(ctx, joined) <= maxWidth) return [joined];
  const broken = wrapLines(ctx, joined, maxWidth, 2);
  if (broken.length === 2 && broken.every((line) => widthOf(ctx, line) <= maxWidth * 1.02)) return broken;
  const split = squashLine(ctx, joined, maxWidth);
  return split.includes('\n') ? split.split('\n') : [split];
}

function blockHeight(lines, size) {
  if (!lines.length) return 0;
  return size + (lines.length - 1) * size * 0.92;
}

function fitTitle(ctx, text, zone, scale) {
  const maxWidth = zone.w * 0.96;
  const requested = px(zone.size || 108, scale) * (Number(zone.titleScale) || 1);
  const ceiling = px(132, scale);
  const floor = px(42, scale);
  const maxBlock = zone.maxH || px(280, scale);
  let size = clamp(requested, floor, ceiling);
  let lines = titleLinesAt(ctx, text, size, maxWidth);
  const widest = () => lines.reduce((m, line) => Math.max(m, widthOf(ctx, line)), 0);
  while (size > floor && (widest() > maxWidth || lines.length > 2 || blockHeight(lines, size) > maxBlock)) {
    size *= 0.92;
    lines = titleLinesAt(ctx, text, size, maxWidth);
  }
  if (widest() > maxWidth && lines.length === 1) {
    const ratio = maxWidth / widest();
    size = Math.max(floor, size * ratio);
    lines = titleLinesAt(ctx, text, size, maxWidth);
  }
  return { size, lines };
}

function strokeText(ctx, text, x, y, width, color) {
  ctx.lineJoin = 'round';
  ctx.lineWidth = width;
  ctx.strokeStyle = color;
  ctx.strokeText(text, x, y);
}

function fillGradientText(ctx, text, x, y, size) {
  const top = y - size * 0.82;
  const bottom = y + size * 0.18;
  const gradient = ctx.createLinearGradient(x, top, x, bottom);
  gradient.addColorStop(0, CREAM);
  gradient.addColorStop(0.55, AMBER);
  gradient.addColorStop(1, CORAL);
  ctx.fillStyle = gradient;
  ctx.fillText(text, x, y);
}

function titleAnchor(align, zone) {
  if (align === 'left') return { x: zone.x + zone.w * 0.02, mode: 'left' };
  if (align === 'right') return { x: zone.x + zone.w * 0.98, mode: 'right' };
  return { x: zone.x + zone.w / 2, mode: 'center' };
}

// Title: cream→amber→coral, 7px ink stroke, 2px paper hairline, hard shadow, two lines.
export function drawTitle(ctx, state, zone, opts = {}) {
  const text = String(state?.title ?? '').trim();
  if (!text || !zone) return { cap: 0, lines: [], box: null };
  const scale = opts.scale || 1;
  const align = state.titleAlign || zone.align || 'center';
  const rotate = Number(state.titleRotate ?? zone.rotate ?? 0);
  const fitted = fitTitle(ctx, text, { ...zone, titleScale: state.titleScale }, scale);
  const { size, lines } = fitted;
  const leading = size * 0.92;
  const anchor = titleAnchor(align, zone);
  const stroke = px(7, scale);
  const hair = px(2, scale);
  const shadowX = px(8, scale);
  const shadowY = px(12, scale);

  ctx.save();
  ctx.translate(anchor.x, zone.y + size);
  if (rotate) ctx.rotate((rotate * Math.PI) / 180);
  ctx.textAlign = anchor.mode;
  setTitleFont(ctx, size);

  let widest = 0;
  lines.forEach((line, index) => {
    const y = index * leading;
    widest = Math.max(widest, widthOf(ctx, line));
    ctx.save();
    ctx.fillStyle = `rgba(10,9,16,0.35)`;
    ctx.fillText(line, shadowX, y + shadowY);
    ctx.restore();
    strokeText(ctx, line, 0, y, stroke, INK);
    strokeText(ctx, line, -hair * 0.7, y - hair * 0.7, hair, PAPER);
    fillGradientText(ctx, line, 0, y, size);
  });
  ctx.restore();

  const blockH = size + (lines.length - 1) * leading;
  return { cap: size, lines, box: { w: widest, h: blockH } };
}

export function drawSubtitle(ctx, state, zone, opts = {}) {
  const text = String(state?.subtitle ?? '').trim();
  if (!text || !zone) return null;
  const scale = opts.scale || 1;
  const size = clamp(px(38, scale) * (Number(state.titleScale) || 1), px(28, scale), px(48, scale));
  const align = state.titleAlign || zone.align || 'center';
  const anchor = titleAnchor(align, zone);
  const y = (zone.subtitleY ?? zone.y + px(zone.size || 108, scale) * 1.15);
  ctx.save();
  ctx.font = `italic ${size}px ${SUB_FACE}`;
  ctx.textAlign = anchor.mode;
  ctx.textBaseline = 'alphabetic';
  ctx.fillStyle = `rgba(243,232,214,0.92)`;
  ctx.fillText(text, anchor.x, y);
  ctx.restore();
  return { size, y };
}

function chipBox(ctx, timecode, caption, size, maxWidth) {
  ctx.font = `600 ${size}px ${CAP_FACE}`;
  const capW = Math.min(maxWidth, widthOf(ctx, caption));
  const mono = size * 0.82;
  ctx.font = `400 ${mono}px ${MONO_FACE}`;
  const timeW = widthOf(ctx, timecode);
  return { capW, timeW, mono, w: Math.max(capW, timeW) + size * 1.4 };
}

export function drawPanelCaption(ctx, panel, rect, opts = {}) {
  const caption = String(panel?.caption ?? '').trim();
  const timecode = String(panel?.timecode ?? '').trim();
  if ((!caption && !timecode) || !rect) return { x: rect?.x ?? 0, y: rect?.y ?? 0, w: 0, h: 0 };
  const scale = opts.scale || rect.scale || 1;
  const size = px(22, scale);
  const align = opts.align || 'left';
  const padX = px(10, scale);
  const padY = px(6, scale);
  const maxInner = Math.max(px(40, scale), rect.w - padX * 2);
  const label = caption.toUpperCase();
  ctx.save();
  ctx.font = `600 ${size}px ${CAP_FACE}`;
  const lines = wrapLines(ctx, label, maxInner, 2);
  const lineW = lines.reduce((m, line) => Math.max(m, widthOf(ctx, line)), 0);
  const mono = px(18, scale);
  ctx.font = `400 ${mono}px ${MONO_FACE}`;
  const timeW = timecode ? widthOf(ctx, timecode) : 0;
  const inner = Math.min(maxInner, Math.max(lineW, timeW));
  const boxW = Math.min(rect.w - 8, inner + padX * 2);
  const lineH = size * 1.05;
  const timeH = timecode ? mono * 1.35 : 0;
  const boxH = Math.min(rect.h - 8, padY + timeH + lines.length * lineH + padY * 0.6);
  let x = rect.x + px(12, scale);
  if (align === 'center') x = rect.x + (rect.w - boxW) / 2;
  if (align === 'right') x = rect.x + rect.w - boxW - px(12, scale);
  x = clamp(x, rect.x + 4, Math.max(rect.x + 4, rect.x + rect.w - boxW - 4));
  const y = clamp(rect.y + rect.h - boxH - px(12, scale), rect.y + 4, Math.max(rect.y + 4, rect.y + rect.h - boxH - 4));
  ctx.fillStyle = 'rgba(10,9,16,0.72)';
  ctx.fillRect(x, y, boxW, boxH);
  ctx.fillStyle = CORAL;
  ctx.fillRect(x, y, px(2, scale), boxH);
  let cursor = y + padY + mono;
  if (timecode) {
    ctx.font = `400 ${mono}px ${MONO_FACE}`;
    ctx.fillStyle = 'rgba(243,232,214,0.70)';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'alphabetic';
    ctx.fillText(timecode, x + padX, cursor);
    cursor += timeH;
  }
  ctx.font = `600 ${size}px ${CAP_FACE}`;
  ctx.fillStyle = PAPER;
  ctx.letterSpacing = `${0.14 * size}px`;
  lines.forEach((line) => {
    ctx.fillText(line, x + padX, cursor);
    cursor += lineH;
  });
  ctx.letterSpacing = '0px';
  ctx.restore();
  return { x, y, w: boxW, h: boxH };
}

const CREDIT_LINES = [
  'VICE DIARIES  ·  ISSUE',
  'PHOTOGRAPHED ON THE BOULEVARD',
  'A NIGHT STUDIO PRODUCTION',
  'COLOUR BY THE GRADE DESK',
];

export function drawCredits(ctx, state, rect, opts = {}) {
  if (state?.showCredits === false || !rect) return;
  const scale = opts.scale || 1;
  const size = px(13, scale);
  const lines = CREDIT_LINES.map((line, index) => (
    index === 0 ? `${line} ${state.issue || '01'}` : line
  ));
  ctx.save();
  ctx.font = `300 ${size}px ${CAP_FACE}`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'alphabetic';
  ctx.fillStyle = `rgba(243,232,214,0.86)`;
  ctx.letterSpacing = `${0.08 * size}px`;
  const cx = rect.x + rect.w / 2;
  lines.forEach((line, index) => {
    ctx.fillText(line, cx, rect.y + size * 1.4 * (index + 1));
  });
  ctx.letterSpacing = '0px';
  const markY = rect.y + size * 1.4 * (lines.length + 1.1);
  const gap = px(18, scale);
  const start = cx - gap * 1.5;
  ctx.globalAlpha = 0.55;
  ctx.fillStyle = PAPER;
  for (let i = 0; i < 4; i += 1) {
    const mx = start + i * gap;
    ctx.beginPath();
    ctx.arc(mx, markY, px(3.2, scale), 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

function hashBars(seedText) {
  let seed = 0x6d2b79f5;
  const text = String(seedText || 'VICE');
  for (let i = 0; i < text.length; i += 1) seed = Math.imul(seed ^ text.charCodeAt(i), 16777619) >>> 0;
  const bars = [];
  for (let i = 0; i < 48; i += 1) {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    bars.push((seed & 255) > 148 ? 1 : 0);
  }
  return bars;
}

export function drawBarcode(ctx, state, rect, opts = {}) {
  if (!rect) return;
  const scale = opts.scale || 1;
  const bars = hashBars(`${state?.issue || '01'}-${state?.title || ''}`);
  const gap = rect.w / bars.length;
  ctx.save();
  ctx.fillStyle = PAPER;
  bars.forEach((on, index) => {
    if (!on) return;
    const x = rect.x + index * gap;
    ctx.fillRect(x, rect.y, Math.max(1, gap * 0.62), rect.h);
  });
  ctx.font = `400 ${px(10, scale)}px ${MONO_FACE}`;
  ctx.fillStyle = 'rgba(243,232,214,0.7)';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';
  ctx.fillText(String(state?.issue || '01').padStart(2, '0'), rect.x, rect.y + rect.h + px(3, scale));
  ctx.restore();
}

export function drawTags(ctx, state, frame, opts = {}) {
  if (!frame) return;
  const scale = opts.scale || 1;
  const issue = String(state?.issue || '01').toUpperCase();
  const rating = String(state?.rating || 'M').slice(0, 1).toUpperCase();
  const tagline = String(state?.tagline || '').toUpperCase();
  const bandH = px(22, scale);
  const margin = px(36, scale);

  ctx.save();
  ctx.fillStyle = MAGENTA;
  ctx.fillRect(0, frame.h - bandH, frame.w, bandH);
  if (tagline) {
    ctx.font = `700 ${px(12, scale)}px ${CAP_FACE}`;
    ctx.fillStyle = PAPER;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.letterSpacing = `${0.16 * px(12, scale)}px`;
    ctx.fillText(tagline, frame.w / 2, frame.h - bandH / 2);
    ctx.letterSpacing = '0px';
  }

  const box = px(22, scale);
  const rx = frame.w - margin - box;
  const ry = margin;
  ctx.strokeStyle = PAPER;
  ctx.lineWidth = px(1.5, scale);
  ctx.strokeRect(rx, ry, box, box);
  ctx.font = `600 ${px(13, scale)}px ${CAP_FACE}`;
  ctx.fillStyle = PAPER;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(rating, rx + box / 2, ry + box / 2 + px(1, scale));

  ctx.font = `500 ${px(12, scale)}px ${CAP_FACE}`;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';
  ctx.letterSpacing = `${0.18 * px(12, scale)}px`;
  ctx.fillText(`ISSUE ${issue}`, margin, margin + px(14, scale));
  ctx.letterSpacing = '0px';
  ctx.restore();
}

export function drawCreamRule(ctx, x, y, w, scale = 1) {
  ctx.save();
  ctx.fillStyle = PAPER;
  ctx.globalAlpha = 0.9;
  ctx.fillRect(x, y, w, px(2, scale));
  ctx.restore();
}
