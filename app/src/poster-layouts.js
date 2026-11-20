// Eight poster compositions. Rects are normalized 0..1, origin top-left.
// Photo panels map to slots in order; a field panel carries type and takes no photo.

const DESIGN = Object.freeze({ w: 1080, h: 1080 });

const PAPER_BORDER = 3;

function panel(slot, x, y, w, h, extra = {}) {
  return Object.freeze({
    slot,
    x, y, w, h,
    rotate: extra.rotate ?? 0,
    border: extra.border ?? PAPER_BORDER,
    kind: extra.kind ?? 'photo',
    bleed: extra.bleed ?? 0,
  });
}

export const LAYOUTS = Object.freeze([
  Object.freeze({
    id: 'vice-classic',
    name: 'Vice Classic',
    tag: '01',
    designSpace: DESIGN,
    background: 'ink-depth',
    titleZone: Object.freeze({ x: 0.04, y: 0.875, w: 0.92, align: 'left', size: 108, rotate: 0 }),
    rules: Object.freeze({
      gutters: 0.02,
      seam: 'magenta-band',
      overlap: 'title-band',
      tape: false,
    }),
    panels: Object.freeze([
      panel(0, 0, 0, 0.46, 1, { bleed: 14 }),
      panel(1, 0.48, 0, 0.52, 0.30),
      panel(2, 0.48, 0.345, 0.52, 0.30),
      panel(3, 0.48, 0.69, 0.52, 0.30),
    ]),
    slots: 4,
    defaultGrade: 'vice-sunset',
  }),
  Object.freeze({
    id: 'sunset-stories',
    name: 'Sunset Stories',
    tag: '02',
    designSpace: DESIGN,
    background: 'sunset-field',
    titleZone: Object.freeze({ x: 0.08, y: 0.72, w: 0.84, align: 'center', size: 118, rotate: -1.2 }),
    rules: Object.freeze({
      gutters: 0.028,
      seam: 'cream-rule',
      overlap: 'timecode-chip',
      tape: true,
    }),
    panels: Object.freeze([
      panel(0, 0, 0, 1, 1, { kind: 'plate', border: 0, bleed: 0 }),
      panel(1, 0.06, 0.05, 0.88, 0.30, { rotate: -3, bleed: 16 }),
      panel(2, 0.08, 0.36, 0.84, 0.30, { rotate: 0, bleed: 12 }),
      panel(3, 0.05, 0.66, 0.90, 0.30, { rotate: 2.5, bleed: 18 }),
    ]),
    slots: 4,
    defaultGrade: 'miami-heat',
  }),
  Object.freeze({
    id: 'neon-nights',
    name: 'Neon Nights',
    tag: '03',
    designSpace: DESIGN,
    background: 'ink-depth',
    titleZone: Object.freeze({ x: 0.506, y: 0.06, w: 0.482, align: 'center', size: 220, rotate: -90 }),
    rules: Object.freeze({
      gutters: 0.012,
      seam: 'violet-field',
      overlap: 'vertical-title',
      tape: false,
    }),
    panels: Object.freeze([
      panel(0, 0.012, 0.012, 0.482, 0.482),
      panel(1, 0.506, 0.012, 0.482, 0.482, { kind: 'field', border: 0 }),
      panel(2, 0.012, 0.506, 0.482, 0.482),
      panel(3, 0.506, 0.506, 0.482, 0.482),
    ]),
    slots: 3,
    defaultGrade: 'neon-purple',
  }),
  Object.freeze({
    id: 'miami-lifestyle',
    name: 'Miami Lifestyle',
    tag: '04',
    designSpace: DESIGN,
    background: 'paper-block',
    titleZone: Object.freeze({ x: 0.08, y: 0.68, w: 0.84, align: 'center', size: 104, rotate: 0 }),
    rules: Object.freeze({
      gutters: 0.012,
      seam: 'paper-block',
      overlap: 'none',
      tape: false,
    }),
    panels: Object.freeze([
      panel(0, 0.010, 0.02, 0.155, 0.60),
      panel(1, 0.177, 0.02, 0.155, 0.60),
      panel(2, 0.344, 0.02, 0.155, 0.60),
      panel(3, 0.511, 0.02, 0.155, 0.60),
      panel(4, 0.678, 0.02, 0.155, 0.60),
      panel(5, 0.845, 0.02, 0.145, 0.60),
    ]),
    slots: 6,
    defaultGrade: 'tropical-gold',
  }),
  Object.freeze({
    id: 'crime-drama',
    name: 'Crime Drama',
    tag: '05',
    designSpace: DESIGN,
    background: 'ink-depth',
    titleZone: Object.freeze({ x: 0.28, y: 0.30, w: 0.68, align: 'left', size: 148, rotate: -2 }),
    rules: Object.freeze({
      gutters: 0,
      seam: 'diagonal',
      overlap: 'asymmetric-title',
      tape: false,
    }),
    panels: Object.freeze([
      panel(0, 0, 0, 0.70, 1, { bleed: 20 }),
      panel(1, 0.64, 0.06, 0.34, 0.88, { rotate: 1.5, bleed: 16 }),
    ]),
    slots: 2,
    defaultGrade: 'midnight-vice',
  }),
  Object.freeze({
    id: 'cinematic-split',
    name: 'Cinematic Split',
    tag: '06',
    designSpace: DESIGN,
    background: 'blurred-photo',
    titleZone: Object.freeze({ x: 0.03, y: 0.22, w: 0.50, align: 'left', size: 168, rotate: 0 }),
    rules: Object.freeze({
      gutters: 0.018,
      seam: 'paper-6px',
      overlap: 'ink-scrim',
      tape: false,
    }),
    panels: Object.freeze([
      panel(0, 0, 0, 0.55, 1, { bleed: 12 }),
      panel(1, 0.568, 0.02, 0.412, 0.30),
      panel(2, 0.568, 0.35, 0.412, 0.30),
      panel(3, 0.568, 0.68, 0.412, 0.30),
    ]),
    slots: 4,
    defaultGrade: 'retro-film',
  }),
  Object.freeze({
    id: 'vertical-editorial',
    name: 'Vertical Editorial',
    tag: '07',
    designSpace: DESIGN,
    background: 'sunset-field',
    titleZone: Object.freeze({ x: 0.06, y: 0.78, w: 0.88, align: 'center', size: 148, rotate: 0 }),
    rules: Object.freeze({
      gutters: 0.04,
      seam: 'colour-field',
      overlap: 'tape-corners',
      tape: true,
    }),
    panels: Object.freeze([
      panel(0, 0.06, 0.035, 0.88, 0.72, { bleed: 18 }),
    ]),
    slots: 1,
    defaultGrade: 'warm-cinema',
  }),
  Object.freeze({
    id: 'multi-collage',
    name: 'Multi-Character Collage',
    tag: '08',
    designSpace: DESIGN,
    background: 'blurred-photo',
    titleZone: Object.freeze({ x: 0.04, y: 0.80, w: 0.62, align: 'left', size: 108, rotate: 1.5 }),
    rules: Object.freeze({
      gutters: 0,
      seam: 'stacked',
      overlap: 'offset-cards',
      tape: false,
    }),
    panels: Object.freeze([
      panel(0, 0, 0, 0.52, 0.66, { bleed: 14 }),
      panel(1, 0.40, 0.03, 0.24, 0.30),
      panel(2, 0.66, 0.14, 0.24, 0.28, { rotate: -4, bleed: 18 }),
      panel(3, 0.44, 0.36, 0.22, 0.26),
      panel(4, 0.68, 0.46, 0.24, 0.24),
      panel(5, 0.34, 0.64, 0.24, 0.22),
    ]),
    slots: 6,
    defaultGrade: 'electric-night',
  }),
]);

const BY_ID = new Map(LAYOUTS.map((layout) => [layout.id, layout]));

export function layoutById(id) {
  return BY_ID.get(id) ?? null;
}

function photoPanels(layout) {
  return layout.panels.filter((entry) => entry.kind === 'photo');
}

// Assigns loaded photos to photo panels in slot order. Distinct photos are never
// repeated while any remain unused; extras cycle from the start. Zero photos
// turns every photo panel into a procedural plate.
export function panelsForPhotoCount(layout, count) {
  const source = typeof layout === 'string' ? layoutById(layout) : layout;
  if (!source) return [];
  const n = Math.max(0, count | 0);
  const photos = photoPanels(source);
  let next = 0;
  return source.panels.map((entry) => {
    if (entry.kind !== 'photo') return { ...entry };
    if (n === 0) return { ...entry, kind: 'plate', photoIndex: -1 };
    const photoIndex = next < n ? next : next % n;
    next += 1;
    return { ...entry, kind: 'photo', photoIndex };
  });
}
