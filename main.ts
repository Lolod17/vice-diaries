// Vice Diaries hand-in. Copies the static studio and its screenshots to the
// grader output dir, then writes the dossier the scorer compares byte for byte.
// Refuses to write inside this repository, and refuses a screenshots folder that
// does not hold exactly 3 or 4 images.

import { cpSync, existsSync, mkdirSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { isAbsolute, join, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-app.ts';

const GATE = {
  text_max_bytes: 163840,
  screenshots: { max: 4, max_bytes: 262144 },
  app_max_files: 993,
  app_max_bytes: 50331648,
  app_path_max_bytes: 1000,
};

const IMAGE = /\.(?:png|jpe?g)$/i;
const here = fileURLToPath(new URL('.', import.meta.url));
const dryRun = process.argv.includes('--dry-run');

function outputDir() {
  const raw = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';
  const out = resolve(raw);
  const rel = relative(resolve(here), out);
  const inside = rel === '' || (!rel.startsWith(`..${sep}`) && rel !== '..' && !isAbsolute(rel));
  if (inside) throw new Error(`refusing to write inside the repository: ${out}`);
  return out;
}

function screenshotNames() {
  const dir = join(here, 'screenshots');
  if (!existsSync(dir) || !statSync(dir).isDirectory()) return [];
  return readdirSync(dir).filter((name) => IMAGE.test(name) && statSync(join(dir, name)).isFile()).sort();
}

function copyTree(out: string) {
  mkdirSync(out, { recursive: true });
  cpSync(join(here, 'app'), join(out, 'app'), { recursive: true });
  const shots = join(here, 'screenshots');
  if (existsSync(shots)) cpSync(shots, join(out, 'screenshots'), { recursive: true });
  else mkdirSync(join(out, 'screenshots'), { recursive: true });
}

function main() {
  const names = screenshotNames();
  if (names.length < 3 || names.length > 4) {
    throw new Error(`screenshots/ needs 3 or 4 images, found ${names.length}`);
  }
  const out = outputDir();
  if (dryRun) {
    console.log(`dry-run ${names.length} screenshots -> ${out}`);
    return;
  }
  copyTree(out);
  const dossier = buildDossier(out, GATE);
  writeFileSync(join(out, 'dossier.json'), dossier);
  const doc = JSON.parse(Buffer.from(dossier).toString('utf8'));
  const lines = String(doc.text).split('\n');
  const totals = lines.find((line) => line.startsWith('Totals:')) ?? '';
  const sources = lines.find((line) => line.startsWith('Source files:')) ?? '';
  console.log(`${sources}; ${totals}; dossier ${dossier.length} bytes; screenshots ${doc.images.length}`);
}

main();
