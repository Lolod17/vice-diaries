// Eight poster compositions. Rects are normalized 0..1 with the origin at the
// top-left of the design square. Panel order is the photo-slot order.

export const LAYOUTS = [
  {
    id: 'vice-classic',
    name: 'Vice Classic',
    tag: '01',
    defaultGrade: 'vice-sunset',
    slots: 4,
    background: { kind: 'gradient', from: '#D8306F', to: '#0A0910', angle: 180 },
    titleZone: { x: 0, y: 0.86, w: 1, h: 0.14, size: 118 },
    rules: { gap: 0.02, border: 3, overlap: 'band' },
    panels: [
      { id: 'hero', x: 0, y: 0, w: 0.46, h: 1, kind: 'portrait', rotate: 0, border: 'paper' },
      { id: 'stack-a', x: 0.48, y: 0, w: 0.52, h: 0.3, kind: 'stack', rotate: 0, border: 'paper' },
      { id: 'stack-b', x: 0.48, y: 0.345, w: 0.52, h: 0.3, kind: 'stack', rotate: 0, border: 'paper' },
      { id: 'stack-c', x: 0.48, y: 0.69, w: 0.52, h: 0.3, kind: 'stack', rotate: 0, border: 'paper' },
    ],
  },
  {
    id: 'sunset-stories',
    name: 'Sunset Stories',
    tag: '02',
    defaultGrade: 'miami-heat',
    slots: 4,
    background: { kind: 'photo', dim: 0.4, scale: 1.08 },
    titleZone: { x: 0.08, y: 0.74, w: 0.84, h: 0.2, size: 108 },
    rules: { gap: 0.012, border: 8, overlap: 'strip' },
    panels: [
      { id: 'bleed', x: 0, y: 0, w: 1, h: 1, kind: 'bleed', rotate: 0, border: 'none' },
      { id: 'strip-a', x: 0.06, y: 0.06, w: 0.88, h: 0.3, kind: 'strip', rotate: -3, border: 'paper' },
      { id: 'strip-b', x: 0.08, y: 0.38, w: 0.84, h: 0.3, kind: 'strip', rotate: 0, border: 'paper' },
      { id: 'strip-c', x: 0.05, y: 0.68, w: 0.9, h: 0.3, kind: 'strip', rotate: 2.5, border: 'paper' },
    ],
  },
  {
    id: 'neon-nights',
    name: 'Neon Nights',
    tag: '03',
    defaultGrade: 'neon-purple',
    slots: 3,
    background: { kind: 'vignette', color: '#14111C', edge: '#0A0910' },
    titleZone: { x: 0.506, y: 0.506, w: 0.482, h: 0.482, size: 96 },
    rules: { gap: 0.012, border: 3, overlap: 'field' },
    panels: [
      { id: 'quad-a', x: 0.012, y: 0.012, w: 0.482, h: 0.482, kind: 'grid', rotate: 0, border: 'paper' },
      { id: 'quad-b', x: 0.506, y: 0.012, w: 0.482, h: 0.482, kind: 'grid', rotate: 0, border: 'paper' },
      { id: 'quad-c', x: 0.012, y: 0.506, w: 0.482, h: 0.482, kind: 'grid', rotate: 0, border: 'paper' },
      { id: 'title-field', x: 0.506, y: 0.506, w: 0.482, h: 0.482, kind: 'field', rotate: 0, border: 'none' },
    ],
  },
  {
    id: 'miami-lifestyle',
    name: 'Miami Lifestyle',
    tag: '04',
    defaultGrade: 'tropical-gold',
    slots: 6,
    background: { kind: 'field', color: '#F3E8D6' },
    titleZone: { x: 0.06, y: 0.68, w: 0.88, h: 0.26, size: 104 },
    rules: { gap: 0.01, border: 3, overlap: 'barcode' },
    panels: [
      { id: 'col-1', x: 0.012, y: 0.02, w: 0.155, h: 0.6, kind: 'column', rotate: 0, border: 'paper' },
      { id: 'col-2', x: 0.177, y: 0.02, w: 0.155, h: 0.6, kind: 'column', rotate: 0, border: 'paper' },
      { id: 'col-3', x: 0.342, y: 0.02, w: 0.155, h: 0.6, kind: 'column', rotate: 0, border: 'paper' },
      { id: 'col-4', x: 0.507, y: 0.02, w: 0.155, h: 0.6, kind: 'column', rotate: 0, border: 'paper' },
      { id: 'col-5', x: 0.672, y: 0.02, w: 0.155, h: 0.6, kind: 'column', rotate: 0, border: 'paper' },
      { id: 'col-6', x: 0.837, y: 0.02, w: 0.151, h: 0.6, kind: 'column', rotate: 0, border: 'paper' },
    ],
  },
  {
    id: 'crime-drama',
    name: 'Crime Drama',
    tag: '05',
    defaultGrade: 'midnight-vice',
    slots: 2,
    background: { kind: 'gradient', from: '#14111C', to: '#0A0910', angle: 160 },
    titleZone: { x: 0.42, y: 0.34, w: 0.5, h: 0.28, size: 126 },
    rules: { gap: 0, border: 3, overlap: 'seam' },
    panels: [
      { id: 'cut', x: 0, y: 0, w: 0.68, h: 1, kind: 'diagonal', rotate: 0, border: 'paper' },
      { id: 'side', x: 0.66, y: 0.04, w: 0.32, h: 0.92, kind: 'lean', rotate: 1.5, border: 'paper' },
    ],
  },
  {
    id: 'cinematic-split',
    name: 'Cinematic Split',
    tag: '06',
    defaultGrade: 'retro-film',
    slots: 4,
    background: { kind: 'gradient', from: '#2B6E9C', to: '#0A0910', angle: 200 },
    titleZone: { x: 0.03, y: 0.62, w: 0.49, h: 0.3, size: 112 },
    rules: { gap: 0.006, border: 3, overlap: 'scrim' },
    panels: [
      { id: 'left', x: 0, y: 0, w: 0.55, h: 1, kind: 'scrim', rotate: 0, border: 'none' },
      { id: 'insert-a', x: 0.57, y: 0.02, w: 0.41, h: 0.3, kind: 'insert', rotate: 0, border: 'paper' },
      { id: 'insert-b', x: 0.57, y: 0.35, w: 0.41, h: 0.3, kind: 'insert', rotate: 0, border: 'paper' },
      { id: 'insert-c', x: 0.57, y: 0.68, w: 0.41, h: 0.3, kind: 'insert', rotate: 0, border: 'paper' },
    ],
  },
  {
    id: 'vertical-editorial',
    name: 'Vertical Editorial',
    tag: '07',
    defaultGrade: 'warm-cinema',
    slots: 3,
    background: { kind: 'field', color: '#4B2360' },
    titleZone: { x: 0.12, y: 0.74, w: 0.76, h: 0.2, size: 132 },
    rules: { gap: 0.06, border: 3, overlap: 'tape' },
    panels: [
      { id: 'inset', x: 0.12, y: 0.06, w: 0.76, h: 0.66, kind: 'inset', rotate: 0, border: 'paper' },
      { id: 'rail-left', x: 0, y: 0.06, w: 0.1, h: 0.9, kind: 'rail', rotate: 0, border: 'none' },
      { id: 'rail-right', x: 0.9, y: 0.06, w: 0.1, h: 0.9, kind: 'rail', rotate: 0, border: 'none' },
    ],
  },
  {
    id: 'multi-collage',
    name: 'Multi-Character Collage',
    tag: '08',
    defaultGrade: 'electric-night',
    slots: 6,
    background: { kind: 'gradient', from: '#14111C', to: '#4B2360', angle: 135 },
    titleZone: { x: 0.04, y: 0.8, w: 0.64, h: 0.16, size: 128 },
    rules: { gap: 0, border: 4, overlap: 'stack' },
    panels: [
      { id: 'hero', x: 0, y: 0, w: 0.5, h: 0.62, kind: 'hero', rotate: 0, border: 'paper' },
      { id: 'chip-a', x: 0.42, y: 0.02, w: 0.24, h: 0.24, kind: 'chip', rotate: 0, border: 'paper' },
      { id: 'chip-b', x: 0.74, y: 0.1, w: 0.24, h: 0.22, kind: 'chip', rotate: -4, border: 'paper' },
      { id: 'chip-c', x: 0.5, y: 0.34, w: 0.2, h: 0.2, kind: 'chip', rotate: 0, border: 'coral' },
      { id: 'chip-d', x: 0.72, y: 0.4, w: 0.24, h: 0.22, kind: 'chip', rotate: 0, border: 'paper' },
      { id: 'chip-e', x: 0.06, y: 0.66, w: 0.88, h: 0.3, kind: 'band', rotate: 0, border: 'paper' },
    ],
  },
];

export function layoutById(id) {
  return LAYOUTS.find((layout) => layout.id === id) || LAYOUTS[0];
}

// Fills `count` panels from `photos` in order, then wraps. Distinct photos are
// used up before any photo is repeated, so two panels never share one while
// another loaded photo is still unused.
export function panelsForPhotoCount(layout, photos, count) {
  const panels = layout.panels.slice(0, count ?? layout.panels.length);
  const pool = (photos || []).filter(Boolean);
  if (!pool.length) return panels.map((panel) => ({ ...panel, photo: null, photoIndex: -1 }));
  return panels.map((panel, index) => ({
    ...panel,
    photo: pool[index % pool.length],
    photoIndex: index % pool.length,
  }));
}
