// Poster lettering. Design-space pixels; preview and export call the same functions.

const CREAM = '#F8EBCB';
const AMBER = '#FFB24A';
const CORAL = '#FF5F52';
const PAPER = '#F3E8D6';
const INK = '#0A0910';
const MAGENTA = '#D8306F';

const TITLE_FONT = '"Playfair Display", serif';
const CAPTION_FONT = '"Oswald", sans-serif';
const MONO_FONT = '"Roboto Mono", monospace';
const ITALIC_FONT = '"Instrument Serif", serif';

const TITLE_MIN = 48;
const TITLE_MAX = 132;
const MARGIN = 24;

function clamp(n, lo, hi) {
  return Math.min(hi, Math.max(lo, n));
}

function alignOf(value, fallback) {
  if (value === 'left' || value === 'center' || value === 'right') return value;
  return fallback;
}

function ellipsis(ctx, word, maxWidth) {
  let cut = word;
  while (cut.length > 1 && ctx.measureText(`${cut}…`).width > maxWidth) cut = cut.slice(0, -1);
  return `${cut}…`;
}

/** Split `text` into at most `maxLines` lines that fit `maxWidth`. */
export function wrapLines(ctx, text, maxWidth, maxLines = 2) {
  const words = String(text || '').trim().split(/\s+/).filter(Boolean);
  if (!words.length || maxWidth <= 0) return [];
  const lines = [];
  let line = '';
  let index = 0;
  while (index < words.length && lines.length < maxLines) {
    const word = words[index];
    const next = line ? `${line} ${word}` : word;
    if (ctx.measureText(next).width <= maxWidth) {
      line = next;
      index += 1;
      continue;
    }
    if (!line) {
      lines.push(ellipsis(ctx, word, maxWidth));
      index += 1;
      continue;
    }
    lines.push(line);
    line = '';
    if (lines.length === maxLines) {
      const tail = words.slice(index).join(' ');
      lines[lines.length - 1] = ellipsis(ctx, `${lines[lines.length - 1]} ${tail}`, maxWidth);
      break;
    }
  }
  if (line && lines.length < maxLines) lines.push(line);
  return lines;
}

function titlePaint(ctx, x, y, w, h) {
  const paint = ctx.createLinearGradient(x, y, x, y + h);
  paint.addColorStop(0, CREAM);
  paint.addColorStop(0.55, AMBER);
  paint.addColorStop(1, CORAL);
  return paint;
}

function lineHeight(size) {
  return size * 0.92;
}

/**
 * Two-line title. Shrinks from the zone's design size until the block fits
 * inside `zone` with a 24 px margin. Returns the box actually painted.
 */
export function drawTitle(ctx, state, zone, frame) {
  const text = String(state.title || '').trim();
  const box = {
    x: zone.x * frame.w,
    y: zone.y * frame.h,
    w: zone.w * frame.w,
    h: Math.max(0, (1 - zone.y) * frame.h),
  };
  if (!text) return { ...box, size: 0, lines: [] };

  const scale = clamp(Number(state.titleScale) || 1, 0.7, 1.4);
  const base = clamp((Number(zone.size) || 112) * scale * (frame.w / 1080), TITLE_MIN, TITLE_MAX * 1.8);
  const innerW = Math.max(8, box.w - MARGIN * 2);
  const innerH = Math.max(8, box.h - MARGIN);
  const align = alignOf(state.titleAlign, zone.align || 'left');
  const spin = ((Number(state.titleRotate) || 0) + (Number(zone.rotate) || 0)) * Math.PI / 180;

  let size = base;
  let lines = [text];
  let widest = 0;
  for (let step = 0; step < 48; step += 1) {
    ctx.font = `700 ${size}px ${TITLE_FONT}`;
    lines = wrapLines(ctx, text, innerW, 2);
    widest = Math.max(...lines.map((line) => ctx.measureText(line).width), 0);
    const blockH = lines.length * lineHeight(size);
    if ((widest <= innerW && blockH <= innerH) || size <= TITLE_MIN) break;
    size = Math.max(TITLE_MIN, size - 4);
  }

  const blockH = lines.length * lineHeight(size);
  const originX = box.x + box.w / 2;
  const originY = box.y + MARGIN + blockH / 2;

  ctx.save();
  ctx.translate(originX, originY);
  ctx.rotate(spin);
  ctx.font = `700 ${size}px ${TITLE_FONT}`;
  ctx.textAlign = align;
  ctx.textBaseline = 'middle';
  ctx.lineJoin = 'round';
  ctx.miterLimit = 2;

  const anchor = align === 'left' ? -box.w / 2 + MARGIN : align === 'right' ? box.w / 2 - MARGIN : 0;
  const top = -blockH / 2;
  lines.forEach((line, index) => {
    const y = top + lineHeight(size) * (index + 0.5);
    ctx.save();
    ctx.shadowColor = 'rgba(10, 9, 16, 0.42)';
    ctx.shadowOffsetX = 10;
    ctx.shadowOffsetY = 14;
    ctx.shadowBlur = 0;
    ctx.lineWidth = 7;
    ctx.strokeStyle = INK;
    ctx.strokeText(line, anchor, y);
    ctx.restore();

    ctx.save();
    ctx.lineWidth = 2;
    ctx.strokeStyle = PAPER;
    ctx.strokeText(line, anchor - 2, y - 2);
    ctx.restore();

    ctx.fillStyle = titlePaint(ctx, anchor - innerW / 2, top, innerW, blockH);
    ctx.fillText(line, anchor, y);
  });
  ctx.restore();

  return { x: box.x, y: box.y, w: box.w, h: blockH + MARGIN, size, lines, ink: widest };
}

export function drawSubtitle(ctx, state, zone, frame, titleBox) {
  const text = String(state.subtitle || '').trim();
  if (!text) return null;
  const size = clamp(38 * (frame.w / 1080), 28, 48);
  const y = (titleBox?.y || zone.y * frame.h) + (titleBox?.h || 0) + size * 0.35;
  const align = alignOf(state.titleAlign, zone.align || 'center');
  const x = align === 'left'
    ? zone.x * frame.w + MARGIN
    : align === 'right'
      ? (zone.x + zone.w) * frame.w - MARGIN
      : (zone.x + zone.w / 2) * frame.w;
  ctx.save();
  ctx.font = `italic 400 ${size}px ${ITALIC_FONT}`;
  ctx.fillStyle = 'rgba(243, 232, 214, 0.92)';
  ctx.textAlign = align;
  ctx.textBaseline = 'top';
  ctx.fillText(text, x, y);
  ctx.restore();
  return { x, y, size };
}

/** Roboto Mono timecode chip above an Oswald caption, with a coral rule. */
export function drawPanelCaption(ctx, panel, rect, state) {
  const caption = String(panel.caption || '').trim();
  const timecode = String(panel.timecode || '').trim();
  if (!caption && !timecode) return;
  const align = alignOf(state.captionAlign, 'left');
  const capSize = Math.max(13, Math.min(22, Math.round(rect.w * 0.045)));
  const monoSize = Math.max(11, Math.round(capSize * 0.8));
  const pad = 10;
  const x = align === 'center' ? rect.x + rect.w / 2 : align === 'right' ? rect.x + rect.w - pad : rect.x + pad;
  const foot = rect.y + rect.h - pad;

  ctx.save();
  ctx.textAlign = align;
  ctx.textBaseline = 'bottom';
  if (timecode) {
    ctx.font = `400 ${monoSize}px ${MONO_FONT}`;
    const width = ctx.measureText(timecode).width + 12;
    const chipX = align === 'center' ? x - width / 2 : align === 'right' ? x - width : x;
    const chipY = foot - capSize - monoSize - 8;
    ctx.fillStyle = 'rgba(10, 9, 16, 0.72)';
    ctx.fillRect(chipX, chipY, width, monoSize + 6);
    ctx.fillStyle = 'rgba(243, 232, 214, 0.7)';
    ctx.fillText(timecode, align === 'center' ? x : align === 'right' ? x - 6 : x + 6, chipY + monoSize + 1);
  }
  if (caption) {
    ctx.font = `600 ${capSize}px ${CAPTION_FONT}`;
    ctx.fillStyle = PAPER;
    ctx.fillText(caption.toUpperCase(), x, foot);
    const rule = Math.min(rect.w * 0.28, ctx.measureText(caption.toUpperCase()).width);
    const ruleX = align === 'center' ? x - rule / 2 : align === 'right' ? x - rule : x;
    ctx.fillStyle = CORAL;
    ctx.fillRect(ruleX, foot + 3, rule, 2);
  }
  ctx.restore();
}

export function drawCredits(ctx, state, frame) {
  if (state.showCredits === false) return;
  const lines = [
    `VICE DIARIES  ·  ISSUE ${state.issue || '01'}`,
    'A MAKE.FUN PICTURE',
    'SHOT ON THE BOULEVARD',
    state.tagline ? String(state.tagline).toUpperCase() : 'COMING SOON',
  ];
  const size = Math.max(11, Math.round(13 * (frame.w / 1080)));
  const x = frame.w / 2;
  let y = frame.h - size * 6.2;
  ctx.save();
  ctx.font = `300 ${size}px ${CAPTION_FONT}`;
  ctx.fillStyle = 'rgba(243, 232, 214, 0.86)';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'top';
  for (const line of lines) {
    ctx.fillText(line, x, y);
    y += size * 1.35;
  }
  const marks = ['VD', '01', 'MIA', 'NIGHT'];
  const gap = 36 * (frame.w / 1080);
  let mx = x - ((marks.length - 1) * gap) / 2;
  ctx.globalAlpha = 0.55;
  marks.forEach((mark) => {
    ctx.strokeRect(mx - 11, y + 2, 22, 16);
    ctx.fillText(mark, mx, y + 4);
    mx += gap;
  });
  ctx.restore();
}

/** 48 deterministic bars plus the issue digits. */
export function drawBarcode(ctx, state, frame) {
  const bars = 48;
  const bw = Math.max(1.4, frame.w * 0.0016);
  const bh = Math.round(frame.h * 0.055);
  const x0 = frame.w - MARGIN - bars * bw * 1.7;
  const y0 = frame.h - bh - Math.round(frame.h * 0.07);
  let seed = 0x51ce;
  const issue = String(state.issue || '01');
  for (let i = 0; i < issue.length; i += 1) seed = (seed * 33 + issue.charCodeAt(i)) >>> 0;
  ctx.save();
  ctx.fillStyle = PAPER;
  for (let i = 0; i < bars; i += 1) {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    const tall = (seed & 3) !== 0;
    const thick = 1 + (seed & 1);
    ctx.fillRect(x0 + i * bw * 1.7, y0 + (tall ? 0 : bh * 0.18), bw * thick, tall ? bh : bh * 0.82);
  }
  ctx.font = `400 ${Math.max(10, Math.round(12 * frame.w / 1080))}px ${MONO_FONT}`;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';
  ctx.fillText(issue.padStart(4, '0'), x0, y0 + bh + 3);
  ctx.restore();
  return { x: x0, y: y0, w: bars * bw * 1.7, h: bh };
}

/** Issue chip, rating box, and the 10 px tagline band. */
export function drawTags(ctx, state, frame) {
  const size = Math.max(12, Math.round(14 * frame.w / 1080));
  ctx.save();
  ctx.font = `600 ${size}px ${CAPTION_FONT}`;
  ctx.textBaseline = 'middle';
  const issue = `ISSUE ${state.issue || '01'}`;
  const chipW = ctx.measureText(issue).width + 16;
  ctx.fillStyle = CORAL;
  ctx.fillRect(MARGIN, MARGIN, chipW, size + 10);
  ctx.fillStyle = INK;
  ctx.textAlign = 'left';
  ctx.fillText(issue, MARGIN + 8, MARGIN + (size + 10) / 2);

  const box = Math.max(18, Math.round(22 * frame.w / 1080));
  const bx = frame.w - MARGIN - box;
  ctx.strokeStyle = PAPER;
  ctx.lineWidth = 1.5;
  ctx.strokeRect(bx, MARGIN, box, box);
  ctx.fillStyle = PAPER;
  ctx.font = `700 ${box * 0.62}px ${CAPTION_FONT}`;
  ctx.textAlign = 'center';
  ctx.fillText(String(state.rating || 'M').slice(0, 1).toUpperCase(), bx + box / 2, MARGIN + box / 2);

  const band = 10 * (frame.h / 1080);
  const bandH = Math.max(16, band + 8);
  ctx.fillStyle = MAGENTA;
  ctx.fillRect(0, frame.h - bandH, frame.w, bandH);
  ctx.fillStyle = CREAM;
  ctx.font = `700 ${Math.max(11, Math.round(12 * frame.w / 1080))}px ${CAPTION_FONT}`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(String(state.tagline || 'coming soon').toUpperCase(), frame.w / 2, frame.h - bandH / 2);
  ctx.restore();
}
