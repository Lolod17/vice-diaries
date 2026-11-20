// Offscreen export. Preview and PNG share `renderCover`; this file only sizes the
// canvas, reports progress, and starts the download.

export const EXPORT_SIZES = [
  { w: 1080, h: 1080 },
  { w: 1080, h: 1350 },
  { w: 1920, h: 1080 },
];

function slug(value) {
  const clean = String(value || 'cover')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
  return clean || 'cover';
}

export function exportName(state, size) {
  return `${slug(state?.title)}-${slug(state?.layoutId)}-${size.w}x${size.h}.png`;
}

function canvasOf(size) {
  const canvas = document.createElement('canvas');
  canvas.width = size.w;
  canvas.height = size.h;
  return canvas;
}

function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1500);
}

/** Render `state` at `size` and download it. `onProgress` receives `{ phase, index, total, filename }`. */
export async function exportCover(state, size, filename, hooks = {}) {
  const { renderCover, onProgress } = hooks;
  if (typeof renderCover !== 'function') throw new Error('exportCover needs renderCover');
  const name = filename || exportName(state, size);
  onProgress?.({ phase: 'start', index: 0, total: 1, filename: name });
  const canvas = canvasOf(size);
  const ctx = canvas.getContext('2d');
  await renderCover(ctx, state, { scale: 1, forExport: true, size });
  const blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/png'));
  if (!blob) throw new Error('png encode failed');
  if (hooks.download !== false) downloadBlob(blob, name);
  onProgress?.({ phase: 'done', index: 1, total: 1, filename: name });
  return { filename: name, width: size.w, height: size.h, bytes: blob.size, blob, size: { w: size.w, h: size.h } };
}

/** Render the three poster sizes in order. */
export async function exportAll(state, hooks = {}) {
  const names = [];
  const total = EXPORT_SIZES.length;
  for (let i = 0; i < total; i += 1) {
    const size = EXPORT_SIZES[i];
    const filename = exportName(state, size);
    hooks.onProgress?.({ phase: 'start', index: i, total, filename });
    const result = await exportCover(state, size, filename, {
      renderCover: hooks.renderCover,
    });
    names.push(result);
    hooks.onProgress?.({ phase: 'done', index: i + 1, total, filename });
  }
  return names;
}
