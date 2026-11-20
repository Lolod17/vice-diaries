// Hands the Vice Diaries studio in. Copies app/ and screenshots/ to the output
// directory, then writes dossier.json from the vendored make.fun builder using
// the scorer's own caps. Refuses to write inside this repository, and refuses a
// screenshots directory that does not hold exactly 3 or 4 images.

import { cpSync, existsSync, mkdirSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { dirname, isAbsolute, join, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-app.ts';

const repo = fileURLToPath(new URL('.', import.meta.url));

const CAPS = {
  text_max_bytes: 163840,
  screenshots: { max: 4, max_bytes: 262144 },
  app_max_files: 993,
  app_max_bytes: 50331648,
  app_path_max_bytes: 1000,
};

const IMAGE = /\.(png|jpe?g)$/i;

function fail(message: string): never {
  console.error(message);
  process.exit(1);
}

function insideRepo(dir: string): boolean {
  const rel = relative(repo, dir);
  return rel === '' || (!rel.startsWith('..') && !isAbsolute(rel));
}

function imageCount(dir: string): number {
  const walk = (at: string): number => {
    let n = 0;
    for (const name of readdirSync(at)) {
      if (name.startsWith('.')) continue;
      const full = join(at, name);
      const st = statSync(full);
      if (st.isDirectory()) n += walk(full);
      else if (IMAGE.test(name)) n += 1;
    }
    return n;
  };
  return walk(dir);
}

const dryRun = process.argv.includes('--dry-run');
const out = resolve(process.env.MAKEFUN_OUTPUT_DIR ?? '/output');

if (insideRepo(out)) fail(`refusing to write inside the repository: ${out}`);

const shots = join(repo, 'screenshots');
const shotCount = existsSync(shots) ? imageCount(shots) : 0;
if (shotCount !== 3 && shotCount !== 4) {
  fail(`screenshots/ holds ${shotCount} images; the hand-in needs 3 or 4`);
}

if (dryRun) {
  console.log(`dry-run: would copy app/ and ${shotCount} screenshots to ${out}`);
  process.exit(0);
}

mkdirSync(out, { recursive: true });
cpSync(join(repo, 'app'), join(out, 'app'), { recursive: true });
mkdirSync(join(out, 'screenshots'), { recursive: true });
cpSync(shots, join(out, 'screenshots'), { recursive: true });

const dossier = buildDossier(out, CAPS);
writeFileSync(join(out, 'dossier.json'), dossier);

const appFiles = readdirSync(join(out, 'app'), { recursive: true }).length;
console.log(`handed in ${appFiles} app entries, ${shotCount} screenshots, dossier ${dossier.length} bytes -> ${out}${sep === '/' ? '' : dirname(out)}`);
