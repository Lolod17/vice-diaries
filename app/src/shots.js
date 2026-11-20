import { drawCover, exportCover, EXPORT_SIZES, loadRendererModules } from './cover-export.js';

const sampleNames = ['boulevard', 'pier', 'convertible-sunset', 'marina-night', 'hotel-dusk', 'neon-crew', 'chrome-promenade'];
const captions = ['THE BOULEVARD', 'LAST LIGHT', 'NO WAY HOME', 'AFTER HOURS', 'ROOM WITH A VIEW', 'THE NIGHT IS OURS'];
const layoutIds = ['vice-classic', 'sunset-stories', 'neon-nights', 'miami-lifestyle', 'crime-drama', 'cinematic-split', 'vertical-editorial', 'multi-collage'];

function initialState() {
  return {
    layoutId: 'vice-classic', size: { w: 1080, h: 1080 }, title: 'VICE DIARIES',
    subtitle: 'a night on the boulevard', tagline: 'THE NIGHT IS OURS', issue: '01', rating: 'M',
    panels: captions.map((caption, i) => ({ photoId: sampleNames[i], zoom: 1, focusX: 0.5, focusY: 0.5,
      rotate: 0, timecode: `0${i + 1}:2${i}:00`, caption })),
    gradeId: 'vice-sunset', grain: 25, vignette: 36, bloom: 18, leak: 15,
    adjust: { brightness: 0, contrast: 0, saturation: 0, temperature: 0, highlights: 0, shadows: 0 },
    titleScale: 1, titleRotate: 0, titleAlign: 'center', captionAlign: 'left', showCredits: true,
    photos: [],
  };
}

function sizeFrom(value, height) {
  const size = typeof value === 'string'
    ? { w: Number(value.split('x')[0]), h: Number(value.split('x')[1]) }
    : typeof value === 'number' ? { w: value, h: height } : value;
  if (!size || !EXPORT_SIZES.some(entry => entry.w === size.w && entry.h === size.h)) {
    throw new RangeError('Choose 1080x1080, 1080x1350, or 1920x1080.');
  }
  return { ...size };
}

// F3 may pass its live state and actions. Keeping that reference makes the automation API exercise the editor.
export function shootState(binding = {}) {
  const state = binding.state ?? initialState();
  const render = binding.render ?? (() => drawCover(document.querySelector('#preview'), state));
  const setLayout = binding.setLayout ?? (async id => {
    if (!layoutIds.includes(id)) throw new RangeError(`Unknown composition: ${id}`);
    const modules = await loadRendererModules();
    const layout = modules?.layouts.layoutById(id);
    state.layoutId = id;
    if (layout) {
      const previous = state.panels;
      state.panels = layout.panels.map((_, i) => ({ ...previous[i % previous.length] }));
    }
    return render();
  });
  const setSize = binding.setSize ?? ((value, height) => {
    state.size = sizeFrom(value, height);
    return render();
  });
  const setGrade = binding.setGrade ?? (async id => {
    const modules = await loadRendererModules();
    const grades = modules?.grades.GRADES;
    if (grades && !grades.some(grade => grade.id === id)) throw new RangeError(`Unknown grade: ${id}`);
    state.gradeId = id;
    return render();
  });
  const loadSample = binding.loadSample ?? (async (name = 'boulevard') => {
    const stem = String(name).replace(/\.jpg$/i, '');
    if (!sampleNames.includes(stem)) throw new RangeError(`Unknown sample: ${name}`);
    const existing = state.photos.find(photo => photo.id === stem);
    if (existing) return existing;
    const image = new Image();
    image.src = new URL(`../samples/${stem}.jpg`, import.meta.url).href;
    await image.decode();
    const photo = { id: stem, name: `${stem}.jpg`, image };
    state.photos.push(photo);
    return photo;
  });
  const exportSize = binding.exportSize ?? ((value, heightOrOptions, options = {}) => {
    const numeric = typeof value === 'number';
    return exportCover(state, { ...(numeric ? options : heightOrOptions),
      size: sizeFrom(value, numeric ? heightOrOptions : undefined) });
  });

  const api = { state, render, setLayout, setSize, setGrade, loadSample, exportSize };
  window.__studio = api;
  const ready = (async () => {
    const shot = new URLSearchParams(location.search).get('shot');
    if (!['cover', 'editor', 'portrait', 'square'].includes(shot)) {
      const photo = await loadSample('boulevard');
      state.panels[0].photoId = photo.id;
      await render();
      return;
    }
    document.body.dataset.shot = shot;
    await Promise.all(sampleNames.map(name => loadSample(name)));
    const modes = {
      cover: ['vice-classic', '1920x1080'], editor: ['vice-classic', '1080x1080'],
      portrait: ['sunset-stories', '1080x1350'], square: ['miami-lifestyle', '1080x1080'],
    };
    const [layout, size] = modes[shot];
    await setLayout(layout);
    await setGrade('vice-sunset');
    await setSize(size);
  })();
  Object.defineProperty(api, 'ready', { value: ready, writable: true, enumerable: false });
  return api;
}
