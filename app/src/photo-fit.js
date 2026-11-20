// How a photo sits inside a panel. Both fits are pure math: a source rectangle in
// image pixels and a destination rectangle in canvas pixels. The renderer never
// scales a photo non-uniformly, so portrait and landscape stills keep their shape.

const clamp = (n, lo, hi) => Math.min(hi, Math.max(lo, n));

function natural(img) {
  const w = img.naturalWidth || img.width;
  const h = img.naturalHeight || img.height;
  return { w, h };
}

// Cover: the photo fills the rect completely and is cropped to match. zoom is a
// factor on the cover scale (1 = just covered), focusX/focusY are 0..1 points in
// the photo that land at the centre of the rect, rotate is degrees.
export function coverFit(img, rect, { zoom = 1, focusX = 0.5, focusY = 0.5, rotate = 0 } = {}) {
  const { w, h } = natural(img);
  const z = clamp(zoom || 1, 0.25, 8);
  const fx = clamp(focusX, 0, 1);
  const fy = clamp(focusY, 0, 1);
  const cover = Math.max(rect.w / w, rect.h / h) * z;
  const sw = rect.w / cover;
  const sh = rect.h / cover;
  const sx = clamp(fx * w - sw / 2, 0, Math.max(0, w - sw));
  const sy = clamp(fy * h - sh / 2, 0, Math.max(0, h - sh));
  return {
    sx, sy, sw, sh,
    dx: rect.x, dy: rect.y, dw: rect.w, dh: rect.h,
    rotate,
  };
}

// Fit: the whole photo is visible inside the rect, letterboxed. Same focus and
// rotate knobs, but nothing is cropped.
export function fitInside(img, rect, { zoom = 1, focusX = 0.5, focusY = 0.5, rotate = 0 } = {}) {
  const { w, h } = natural(img);
  const z = clamp(zoom || 1, 0.25, 8);
  const contain = Math.min(rect.w / w, rect.h / h) * z;
  const dw = w * contain;
  const dh = h * contain;
  return {
    sx: 0, sy: 0, sw: w, sh: h,
    dx: rect.x + (rect.w - dw) * clamp(focusX, 0, 1),
    dy: rect.y + (rect.h - dh) * clamp(focusY, 0, 1),
    dw, dh,
    rotate,
  };
}

// Draws one panel. panel.fit === 'fit' uses fitInside; anything else covers.
// Rotation happens around the panel centre and is clipped to the panel rect.
export function drawPanelPhoto(ctx, img, rect, panel = {}, state = {}) {
  if (!img || rect.w <= 0 || rect.h <= 0) return;
  const knobs = {
    zoom: panel.zoom ?? 1,
    focusX: panel.focusX ?? 0.5,
    focusY: panel.focusY ?? 0.5,
    rotate: panel.rotate ?? 0,
  };
  const fit = panel.fit === 'fit'
    ? fitInside(img, rect, knobs)
    : coverFit(img, rect, knobs);
  ctx.save();
  ctx.beginPath();
  ctx.rect(rect.x, rect.y, rect.w, rect.h);
  ctx.clip();
  if (fit.rotate) {
    const cx = rect.x + rect.w / 2;
    const cy = rect.y + rect.h / 2;
    ctx.translate(cx, cy);
    ctx.rotate((fit.rotate * Math.PI) / 180);
    ctx.translate(-cx, -cy);
  }
  ctx.drawImage(img, fit.sx, fit.sy, fit.sw, fit.sh, fit.dx, fit.dy, fit.dw, fit.dh);
  ctx.restore();
  void state;
}
