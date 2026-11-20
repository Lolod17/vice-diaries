export const EXPORT_SIZES = Object.freeze([
  Object.freeze({ w: 1080, h: 1080 }),
  Object.freeze({ w: 1080, h: 1350 }),
  Object.freeze({ w: 1920, h: 1080 }),
]);

let rendererModules;

export async function loadRendererModules() {
  return rendererModules ??= (async () => {
    try {
      const renderer = await import('./cover-render.js');
      const [layouts, lettering, grades] = await Promise.all([
        import('./poster-layouts.js'), import('./lettering.js'), import('./color-grade.js'),
      ]);
      return { renderer, layouts, lettering, grades };
    } catch (error) {
      if (error instanceof TypeError && /dynamically imported module|module script|module specifier/i.test(error.message)) return null;
      rendererModules = undefined;
      throw error;
    }
  })();
}

export async function drawCover(canvas, state, { forExport = false, useRenderer = true } = {}) {
  const modules = useRenderer ? await loadRendererModules() : null;
  if (modules) {
    await Promise.all([
      document.fonts.load('700 24px "Playfair Display"'),
      document.fonts.load('500 24px Oswald'),
      document.fonts.load('400 24px "Roboto Mono"'),
      document.fonts.load('italic 24px "Instrument Serif"'),
    ]);
  }
  const { w, h } = state.size;
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas 2D context is unavailable.');
  if (modules) {
    await modules.renderer.renderCover(ctx, state, { scale: w / 1080, forExport });
  } else {
    ctx.fillStyle = '#14111c';
    ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = '#f3e8d6';
    ctx.font = '500 22px Oswald, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('Cover preview', w / 2, h / 2);
  }
  return canvas;
}

const slug = (value, fallback) => String(value ?? '').normalize('NFKD')
  .replace(/\p{Mark}/gu, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || fallback;

function nameFor(state, override) {
  const { w, h } = state.size;
  const edited = override?.replace(/[\\/:*?"<>|\u0000-\u001f]/g, '-').trim().replace(/\.png$/i, '').trim();
  return `${edited || `${slug(state.title, 'cover')}-${slug(state.layoutId, 'layout')}-${w}x${h}`}.png`;
}

function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.append(link);
  try { link.click(); }
  finally {
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
}

function snapshot(state, size) {
  return { ...state, size: { ...size }, adjust: { ...state.adjust },
    panels: state.panels?.map(panel => ({ ...panel })) };
}

function checkSize({ w, h }) {
  if (!EXPORT_SIZES.some(size => size.w === w && size.h === h)) {
    throw new RangeError(`Unsupported export size: ${w}x${h}`);
  }
}

async function encode(state, options, index, total) {
  const { download = true, onProgress, useRenderer = true } = options;
  const filename = nameFor(state, options.filename);
  const size = { ...state.size };
  const progress = (phase, error) => onProgress?.({ phase, index, total, size: { ...size }, filename, error });
  progress('rendering');
  // Leave a paint between the progress update and synchronous canvas work.
  await new Promise(resolve => setTimeout(resolve, 32));
  let blob;
  try {
    const canvas = await drawCover(document.createElement('canvas'), state, { forExport: true, useRenderer });
    progress('encoding');
    blob = await new Promise((resolve, reject) => canvas.toBlob(
      result => result ? resolve(result) : reject(new Error('PNG encoding failed.')), 'image/png'));
    if (download) downloadBlob(blob, filename);
  } catch (error) {
    progress('error', error);
    throw error;
  }
  progress('done');
  return { blob, filename, size };
}

// Progress receives { phase, index, total, size, filename }; index is one-based.
export async function exportCover(state, options = {}) {
  const size = options.size ?? state.size;
  checkSize(size);
  return encode(snapshot(state, size), options, 1, 1);
}

export async function exportAll(state, options = {}) {
  const source = snapshot(state, state.size);
  const results = [];
  for (const [i, size] of EXPORT_SIZES.entries()) {
    const filename = options.filename?.trim()
      ? `${options.filename.trim().replace(/\.png$/i, '')}-${size.w}x${size.h}.png`
      : undefined;
    results.push(await encode({ ...source, size }, { ...options, filename }, i + 1, EXPORT_SIZES.length));
  }
  return results;
}
