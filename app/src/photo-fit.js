// Photo placement for a panel. `coverFit` crops to fill, `fitInside` letterboxes,
// `drawPanelPhoto` paints the result with a paper frame. Rects are design-space pixels.

function imageSize(img) {
  const w = img?.naturalWidth || img?.videoWidth || img?.width || 0;
  const h = img?.naturalHeight || img?.videoHeight || img?.height || 0;
  return { w, h };
}

function clamp(n, lo, hi) {
  return Math.min(hi, Math.max(lo, n));
}

function optsOf(opts) {
  const zoom = Number(opts?.zoom);
  const rotate = Number(opts?.rotate);
  return {
    zoom: Number.isFinite(zoom) && zoom > 0 ? zoom : 1,
    focusX: Number(opts?.focusX) || 0,
    focusY: Number(opts?.focusY) || 0,
    rotate: Number.isFinite(rotate) ? rotate : 0,
  };
}

/** Source crop and dest rect that cover `rect` without stretching. */
export function coverFit(img, rect, opts) {
  const { w: iw, h: ih } = imageSize(img);
  const dw = Math.max(1, rect.w);
  const dh = Math.max(1, rect.h);
  if (iw < 1 || ih < 1) {
    return { sx: 0, sy: 0, sw: 0, sh: 0, dx: rect.x, dy: rect.y, dw, dh };
  }
  const { zoom, focusX, focusY } = optsOf(opts);
  const scale = Math.max(dw / iw, dh / ih) * zoom;
  const sw = dw / scale;
  const sh = dh / scale;
  const slackX = iw - sw;
  const slackY = ih - sh;
  const sx = clamp((iw - sw) / 2 - focusX * slackX, 0, Math.max(0, slackX));
  const sy = clamp((ih - sh) / 2 - focusY * slackY, 0, Math.max(0, slackY));
  return { sx, sy, sw, sh, dx: rect.x, dy: rect.y, dw, dh };
}

/** Source and dest that fit the whole photo inside `rect`, centred. */
export function fitInside(img, rect, opts) {
  const { w: iw, h: ih } = imageSize(img);
  const dw = Math.max(1, rect.w);
  const dh = Math.max(1, rect.h);
  if (iw < 1 || ih < 1) {
    return { sx: 0, sy: 0, sw: 0, sh: 0, dx: rect.x, dy: rect.y, dw: 0, dh: 0 };
  }
  const { zoom, focusX, focusY } = optsOf(opts);
  const scale = Math.min(dw / iw, dh / ih) * Math.min(zoom, 1);
  const drawnW = iw * scale;
  const drawnH = ih * scale;
  const dx = rect.x + (dw - drawnW) / 2 + focusX * (dw - drawnW) * 0.5;
  const dy = rect.y + (dh - drawnH) / 2 + focusY * (dh - drawnH) * 0.5;
  return { sx: 0, sy: 0, sw: iw, sh: ih, dx, dy, dw: drawnW, dh: drawnH };
}

function roundRect(ctx, x, y, w, h, r) {
  const radius = Math.max(0, Math.min(r, w / 2, h / 2));
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.arcTo(x + w, y, x + w, y + h, radius);
  ctx.arcTo(x + w, y + h, x, y + h, radius);
  ctx.arcTo(x, y + h, x, y, radius);
  ctx.arcTo(x, y, x + w, y, radius);
  ctx.closePath();
}

function plate(ctx, rect) {
  const paint = ctx.createLinearGradient(rect.x, rect.y, rect.x + rect.w, rect.y + rect.h);
  paint.addColorStop(0, '#4b2360');
  paint.addColorStop(0.55, '#d8306f');
  paint.addColorStop(1, '#ffb24a');
  ctx.fillStyle = paint;
  ctx.fillRect(rect.x, rect.y, rect.w, rect.h);
}

/**
 * Draw one panel photo. `panel.mode === 'fit'` letterboxes; otherwise the photo covers.
 * `panel.gradeCanvas`, when present, is drawn in place of `img`.
 */
export function drawPanelPhoto(ctx, img, rect, panel, state) {
  const frame = panel || {};
  const source = frame.gradeCanvas || img;
  const fit = frame.mode === 'fit'
    ? fitInside(source, rect, frame)
    : coverFit(source, rect, frame);
  const radius = Number.isFinite(frame.radius) ? frame.radius : 0;
  const spin = optsOf(frame).rotate;

  ctx.save();
  roundRect(ctx, rect.x, rect.y, rect.w, rect.h, radius);
  ctx.clip();
  if (spin) {
    ctx.translate(rect.x + rect.w / 2, rect.y + rect.h / 2);
    ctx.rotate((spin * Math.PI) / 180);
    ctx.translate(-(rect.x + rect.w / 2), -(rect.y + rect.h / 2));
  }
  if (fit.sw > 0 && fit.sh > 0 && source) {
    ctx.drawImage(source, fit.sx, fit.sy, fit.sw, fit.sh, fit.dx, fit.dy, fit.dw, fit.dh);
  } else {
    plate(ctx, rect);
  }
  ctx.restore();

  const border = Number.isFinite(frame.border) ? frame.border : 3;
  if (border > 0) {
    ctx.save();
    ctx.strokeStyle = 'rgba(243, 232, 214, 0.78)';
    ctx.lineWidth = border;
    roundRect(ctx, rect.x + border / 2, rect.y + border / 2, rect.w - border, rect.h - border, radius);
    ctx.stroke();
    ctx.restore();
  }

  ctx.save();
  ctx.strokeStyle = 'rgba(10, 9, 16, 0.45)';
  ctx.lineWidth = 10;
  roundRect(ctx, rect.x + 6, rect.y + 6, rect.w - 12, rect.h - 12, radius);
  ctx.stroke();
  ctx.restore();

  return { fit, state };
}
