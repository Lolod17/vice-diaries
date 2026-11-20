import { renderPreview } from './cover-render.js';

const SIZES = [
  { w: 1080, h: 1080 },
  { w: 1080, h: 1350 },
  { w: 1920, h: 1080 },
];

function canvasBlob(canvas) {
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error('png encode failed'))), 'image/png');
  });
}

function download(blob, name) {
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = name;
  document.body.append(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 4000);
}

function slug(s) {
  return String(s || 'cover').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'cover';
}

export function fileName(state, size) {
  return `vice-diaries-${slug(state.layoutId)}-${size.w}x${size.h}.png`;
}

export async function exportCover(state, size, opts = {}) {
  const target = size || state.size || SIZES[0];
  const name = opts.name || fileName(state, target);
  const canvas = document.createElement('canvas');
  canvas.width = target.w;
  canvas.height = target.h;
  renderPreview(canvas, state, { forExport: true, scale: target.w / 1080 });
  const blob = await canvasBlob(canvas);
  if (opts.download !== false) download(blob, name);
  return { name, bytes: blob.size, blob, size: { w: target.w, h: target.h }, w: target.w, h: target.h };
}

export async function exportAll(state, opts = {}) {
  const out = [];
  for (const size of SIZES) out.push(await exportCover(state, size, { ...opts, name: fileName(state, size) }));
  return out;
}
