const unit = (value, fallback) => Number.isFinite(value) ? Math.min(1, Math.max(0, value)) : fallback;

function fit(img, rect, options, inside) {
  const width = img?.naturalWidth ?? img?.videoWidth ?? img?.width;
  const height = img?.naturalHeight ?? img?.videoHeight ?? img?.height;
  if (!(width > 0 && height > 0 && rect.w > 0 && rect.h > 0)) return null;

  const angle = Number.isFinite(options.rotate) ? options.rotate * Math.PI / 180 : 0;
  const cos = Math.abs(Math.cos(angle));
  const sin = Math.abs(Math.sin(angle));
  // For cover, project the panel corners onto the image axes. For contain, project the photo onto the panel axes.
  const projectedW = rect.w * cos + rect.h * sin;
  const projectedH = rect.w * sin + rect.h * cos;
  const baseScale = inside
    ? Math.min(rect.w / (width * cos + height * sin), rect.h / (width * sin + height * cos))
    : Math.max(projectedW / width, projectedH / height);
  const zoom = Number.isFinite(options.zoom) ? Math.max(1, options.zoom) : 1;
  const scale = baseScale * (inside ? 1 : zoom);
  const w = width * scale;
  const h = height * scale;
  const focusX = inside ? 0.5 : unit(options.focusX, 0.5);
  const focusY = inside ? 0.5 : unit(options.focusY, 0.5);

  return {
    x: -w / 2 + (0.5 - focusX) * Math.max(0, w - projectedW),
    y: -h / 2 + (0.5 - focusY) * Math.max(0, h - projectedH),
    w, h, scale, angle,
    cx: rect.x + rect.w / 2,
    cy: rect.y + rect.h / 2,
  };
}

// Returns a draw rectangle in local coordinates after translating to (cx, cy) and rotating by angle (radians).
export function coverFit(img, rect, options = {}) {
  return fit(img, rect, options, false);
}

export function fitInside(img, rect, options = {}) {
  return fit(img, rect, options, true);
}

export function drawPanelPhoto(ctx, img, rect, panel = {}, state) {
  if (!(rect.w > 0 && rect.h > 0)) return null;
  const options = typeof panel === 'number' ? state?.panels?.[panel] ?? {} : panel;
  const inside = options.fit === 'fit' || options.fit === 'contain';
  const placement = (inside ? fitInside : coverFit)(img, rect, options);

  ctx.save();
  try {
    ctx.beginPath();
    ctx.rect(rect.x, rect.y, rect.w, rect.h);
    ctx.clip();

    if (!placement || inside) {
      const plate = ctx.createLinearGradient(rect.x, rect.y, rect.x + rect.w, rect.y + rect.h);
      plate.addColorStop(0, '#4b2360');
      plate.addColorStop(1, '#14111c');
      ctx.fillStyle = plate;
      ctx.fillRect(rect.x, rect.y, rect.w, rect.h);
    }
    if (placement) {
      const { x, y, w, h, cx, cy, angle } = placement;
      ctx.translate(cx, cy);
      ctx.rotate(angle);
      ctx.drawImage(img, x, y, w, h);
    }
  } finally {
    ctx.restore();
  }
  return placement;
}
