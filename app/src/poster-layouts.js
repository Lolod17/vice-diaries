// Eight poster compositions. Rects are normalized 0..1, origin top-left.
// Geometry differs per layout: panel count, gutters, rotation and title placement.

export const LAYOUTS = [
  {
    id: 'vice-classic',
    name: 'Vice Classic',
    tag: 'hero + three',
    designSpace: { w: 1080, h: 1080 },
    slots: 4,
    defaultGrade: 'vice-sunset',
    background: {
      type: 'gradient',
      from: '#4b2360',
      to: '#0a0910',
      angle: 160,
    },
    titleZone: { x: 0.04, y: 0.86, w: 0.92, align: 'left', size: 112, rotate: -1.5 },
    rules: { gutter: 0.02, border: 3, overlap: 'timecode' },
    panels: [
      { slot: 0, kind: 'photo', x: 0, y: 0, w: 0.46, h: 1, rotate: 0, border: 3 },
      { slot: 1, kind: 'photo', x: 0.48, y: 0, w: 0.52, h: 0.3, rotate: 0, border: 3 },
      { slot: 2, kind: 'photo', x: 0.48, y: 0.345, w: 0.52, h: 0.3, rotate: 0, border: 3 },
      { slot: 3, kind: 'photo', x: 0.48, y: 0.69, w: 0.52, h: 0.3, rotate: 0, border: 3 },
    ],
  },
  {
    id: 'sunset-stories',
    name: 'Sunset Stories',
    tag: 'three strips',
    designSpace: { w: 1080, h: 1350 },
    slots: 4,
    defaultGrade: 'miami-heat',
    background: {
      type: 'photo',
      photoSlot: 0,
      scale: 1.18,
      opacity: 0.24,
      overlay: 'rgba(10, 9, 16, 0.4)',
    },
    titleZone: { x: 0.08, y: 0.78, w: 0.84, align: 'center', size: 118, rotate: 0 },
    rules: { gutter: 0.04, border: 3, overlap: 'tape', rule: 'cream' },
    panels: [
      { slot: 0, kind: 'photo', x: 0, y: 0, w: 1, h: 1, rotate: 0, border: 0 },
      { slot: 1, kind: 'photo', x: 0.06, y: 0.06, w: 0.88, h: 0.3, rotate: -3, border: 3 },
      { slot: 2, kind: 'photo', x: 0.08, y: 0.4, w: 0.84, h: 0.3, rotate: 0, border: 3 },
      { slot: 3, kind: 'photo', x: 0.1, y: 0.74, w: 0.8, h: 0.22, rotate: 2.5, border: 3 },
    ],
  },
  {
    id: 'neon-nights',
    name: 'Neon Nights',
    tag: '2x2, one field',
    designSpace: { w: 1080, h: 1080 },
    slots: 3,
    defaultGrade: 'neon-purple',
    background: {
      type: 'gradient',
      from: '#14111c',
      to: '#0e9c96',
      angle: 200,
    },
    titleZone: { x: 0.524, y: 0.06, w: 0.46, align: 'center', size: 132, rotate: -90 },
    rules: { gutter: 0.012, border: 3, overlap: 'none' },
    panels: [
      { slot: 0, kind: 'photo', x: 0.012, y: 0.012, w: 0.482, h: 0.482, rotate: 0, border: 3 },
      { slot: 1, kind: 'photo', x: 0.506, y: 0.012, w: 0.482, h: 0.482, rotate: 0, border: 3 },
      { slot: 2, kind: 'field', x: 0.012, y: 0.506, w: 0.482, h: 0.482, rotate: 0, border: 0, fill: '#4b2360' },
      { slot: 3, kind: 'photo', x: 0.506, y: 0.506, w: 0.482, h: 0.482, rotate: 0, border: 3 },
    ],
  },
  {
    id: 'miami-lifestyle',
    name: 'Miami Lifestyle',
    tag: 'six strips',
    designSpace: { w: 1080, h: 1080 },
    slots: 6,
    defaultGrade: 'tropical-gold',
    background: {
      type: 'field',
      color: '#f3e8d6',
    },
    titleZone: { x: 0.04, y: 0.74, w: 0.92, align: 'left', size: 128, rotate: 0 },
    rules: { gutter: 0.008, border: 3, overlap: 'barcode' },
    panels: [
      { slot: 0, kind: 'photo', x: 0.01, y: 0, w: 0.155, h: 0.7, rotate: 0, border: 3 },
      { slot: 1, kind: 'photo', x: 0.173, y: 0, w: 0.155, h: 0.62, rotate: 0, border: 3 },
      { slot: 2, kind: 'photo', x: 0.336, y: 0, w: 0.155, h: 0.62, rotate: 0, border: 3 },
      { slot: 3, kind: 'photo', x: 0.499, y: 0, w: 0.155, h: 0.62, rotate: 0, border: 3 },
      { slot: 4, kind: 'photo', x: 0.662, y: 0, w: 0.155, h: 0.62, rotate: 0, border: 3 },
      { slot: 5, kind: 'photo', x: 0.825, y: 0, w: 0.155, h: 0.7, rotate: 0, border: 3 },
    ],
  },
  {
    id: 'crime-drama',
    name: 'Crime Drama',
    tag: 'diagonal pair',
    designSpace: { w: 1080, h: 1080 },
    slots: 2,
    defaultGrade: 'midnight-vice',
    background: {
      type: 'gradient',
      from: '#0a0910',
      to: '#4b2360',
      angle: 225,
    },
    titleZone: { x: 0.42, y: 0.38, w: 0.5, align: 'left', size: 120, rotate: -6 },
    rules: { gutter: 0, border: 3, overlap: 'seam', grain: 0.55 },
    panels: [
      { slot: 0, kind: 'photo', x: 0, y: 0, w: 0.74, h: 1, rotate: 0, border: 0, clip: 'diagonal' },
      { slot: 1, kind: 'photo', x: 0.62, y: 0.08, w: 0.36, h: 0.84, rotate: 1.5, border: 3 },
    ],
  },
  {
    id: 'cinematic-split',
    name: 'Cinematic Split',
    tag: '55/45 + inserts',
    designSpace: { w: 1920, h: 1080 },
    slots: 4,
    defaultGrade: 'retro-film',
    background: {
      type: 'gradient',
      from: '#14111c',
      to: '#2b6e9c',
      angle: 180,
    },
    titleZone: { x: 0.04, y: 0.34, w: 0.48, align: 'left', size: 128, rotate: 0 },
    rules: { gutter: 0.016, border: 3, overlap: 'scrim', seam: 6 },
    panels: [
      { slot: 0, kind: 'photo', x: 0, y: 0, w: 0.55, h: 1, rotate: 0, border: 0, scrim: 0.4 },
      { slot: 1, kind: 'photo', x: 0.58, y: 0.02, w: 0.4, h: 0.3, rotate: 0, border: 3 },
      { slot: 2, kind: 'photo', x: 0.58, y: 0.35, w: 0.4, h: 0.3, rotate: 0, border: 3 },
      { slot: 3, kind: 'photo', x: 0.58, y: 0.68, w: 0.4, h: 0.3, rotate: 0, border: 3 },
    ],
  },
  {
    id: 'vertical-editorial',
    name: 'Vertical Editorial',
    tag: 'inset portrait',
    designSpace: { w: 1080, h: 1350 },
    slots: 1,
    defaultGrade: 'warm-cinema',
    background: {
      type: 'field',
      color: '#f3e8d6',
    },
    titleZone: { x: 0.08, y: 0.82, w: 0.84, align: 'center', size: 124, rotate: 0 },
    rules: { gutter: 0, border: 3, overlap: 'tape' },
    panels: [
      { slot: 0, kind: 'photo', x: 0.06, y: 0.07, w: 0.88, h: 0.72, rotate: 0, border: 3 },
    ],
  },
  {
    id: 'multi-collage',
    name: 'Multi-Character Collage',
    tag: 'hero + five',
    designSpace: { w: 1080, h: 1080 },
    slots: 6,
    defaultGrade: 'electric-night',
    background: {
      type: 'gradient',
      from: '#0a0910',
      to: '#d8306f',
      angle: 135,
    },
    titleZone: { x: 0.04, y: 0.8, w: 0.5, align: 'left', size: 100, rotate: 1.5 },
    rules: { gutter: 0, border: 3, overlap: 'photos' },
    panels: [
      { slot: 0, kind: 'photo', x: 0, y: 0, w: 0.5, h: 0.62, rotate: 0, border: 3 },
      { slot: 1, kind: 'photo', x: 0.42, y: 0.04, w: 0.24, h: 0.28, rotate: 0, border: 3 },
      { slot: 2, kind: 'photo', x: 0.68, y: 0.02, w: 0.22, h: 0.24, rotate: -4, border: 3 },
      { slot: 3, kind: 'photo', x: 0.46, y: 0.34, w: 0.2, h: 0.24, rotate: 0, border: 3 },
      { slot: 4, kind: 'photo', x: 0.7, y: 0.3, w: 0.24, h: 0.26, rotate: 0, border: 3 },
      { slot: 5, kind: 'photo', x: 0.54, y: 0.62, w: 0.22, h: 0.24, rotate: 0, border: 3 },
    ],
  },
];

const byId = new Map(LAYOUTS.map((layout) => [layout.id, layout]));

export function layoutById(id) {
  return byId.get(id) || null;
}

function photoPanels(layout) {
  return layout.panels.filter((panel) => panel.kind !== 'field');
}

/**
 * Map `count` loaded photos onto the layout's photo panels.
 * Distinct photos fill distinct panels first; only then does a photo repeat.
 * With zero photos every photo panel is a plate. Field panels stay fields.
 */
export function panelsForPhotoCount(layout, count) {
  const n = Math.max(0, count | 0);
  const photos = photoPanels(layout);
  const assignment = new Map();
  photos.forEach((panel, index) => {
    if (n === 0) {
      assignment.set(panel, { photoIndex: -1, kind: 'plate' });
      return;
    }
    assignment.set(panel, { photoIndex: index % n, kind: 'photo' });
  });
  return layout.panels.map((panel) => {
    if (panel.kind === 'field') return { ...panel, photoIndex: -1 };
    const assigned = assignment.get(panel);
    return { ...panel, photoIndex: assigned.photoIndex, kind: assigned.kind };
  });
}
