// Geometry and grade audit. Imports the catalogue as ES modules and prints,
// per layout, panel count, union area, overlap and title coverage, and per
// grade the filter numbers and tint colours. No canvas, no browser.

import { LAYOUTS } from '../app/src/poster-layouts.js';
import { GRADES } from '../app/src/color-grade.js';

function rectsOverlap(a, b) {
  const gap = 1e-6;
  return a.x < b.x + b.w - gap && b.x < a.x + a.w - gap
    && a.y < b.y + b.h - gap && b.y < a.y + a.h - gap;
}

function overlapArea(a, b) {
  const left = Math.max(a.x, b.x);
  const right = Math.min(a.x + a.w, b.x + b.w);
  const top = Math.max(a.y, b.y);
  const bottom = Math.min(a.y + a.h, b.y + b.h);
  const width = right - left;
  const height = bottom - top;
  return width > 0 && height > 0 ? width * height : 0;
}

// Sweep the horizontal edges and union the vertical spans between them.
function unionArea(rects) {
  const xs = [...new Set(rects.flatMap((r) => [r.x, r.x + r.w]))].sort((a, b) => a - b);
  let area = 0;
  for (let i = 0; i < xs.length - 1; i += 1) {
    const x0 = xs[i];
    const x1 = xs[i + 1];
    const spans = rects
      .filter((r) => r.x < x1 && r.x + r.w > x0)
      .map((r) => [r.y, r.y + r.h])
      .sort((a, b) => a[0] - b[0]);
    let covered = 0;
    let end = -Infinity;
    for (const [y0, y1] of spans) {
      if (y0 > end) covered += y1 - y0;
      else if (y1 > end) covered += y1 - end;
      end = Math.max(end, y1);
    }
    area += (x1 - x0) * covered;
  }
  return area;
}

function titleCoverage(zone) {
  const height = zone.size / 1080;
  return +(zone.w * height).toFixed(4);
}

function geometryKey(layout) {
  return layout.panels
    .map((p) => [p.x, p.y, p.w, p.h].map((n) => n.toFixed(3)).join(','))
    .join('|');
}

const rows = [];
for (const layout of LAYOUTS) {
  const panels = layout.panels;
  let overlap = 0;
  for (let i = 0; i < panels.length; i += 1) {
    for (let j = i + 1; j < panels.length; j += 1) {
      if (rectsOverlap(panels[i], panels[j])) overlap += 1;
    }
  }
  rows.push({
    id: layout.id,
    panels: panels.length,
    union: +unionArea(panels).toFixed(4),
    overlaps: overlap,
    title: titleCoverage(layout.titleZone),
    key: geometryKey(layout),
  });
}

const seen = new Map();
let distinct = true;
for (const row of rows) {
  const same = LAYOUTS.filter((other) => geometryKey(other) === row.key && other.panels.length === row.panels);
  if (same.length > 1 && seen.has(row.key)) distinct = false;
  seen.set(row.key, row.id);
}

console.log('layout            panels  union   overlaps  title');
for (const row of rows) {
  console.log(
    `${row.id.padEnd(18)} ${String(row.panels).padStart(4)}   ${row.union.toFixed(4)}   ${String(row.overlaps).padStart(4)}    ${row.title.toFixed(4)}`,
  );
}
console.log(`distinct geometry: ${distinct}`);

console.log('\ngrade            bright  contrast  sat    sepia  hue   shadow            highlight         split');
for (const grade of GRADES) {
  const f = grade.filter;
  console.log(
    `${grade.id.padEnd(16)} ${f.brightness.toFixed(2).padStart(6)}  ${f.contrast.toFixed(2).padStart(8)}  ${f.saturate.toFixed(2).padStart(5)}  ${f.sepia.toFixed(2).padStart(5)}  ${String(f.hueRotate).padStart(4)}  ${grade.shadow.color} @${grade.shadow.alpha.toFixed(2)}   ${grade.highlight.color} @${grade.highlight.alpha.toFixed(2)}   ${grade.split.shadow}->${grade.split.highlight} @${grade.split.alpha.toFixed(2)}`,
  );
}
