import { cpSync, existsSync, lstatSync, mkdirSync, readdirSync, realpathSync, rmSync, writeFileSync } from 'node:fs';
import { basename, dirname, isAbsolute, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier, readAppTree } from './vendor/makefun-app.ts';

const root = realpathSync(dirname(fileURLToPath(import.meta.url)));
const outputArgument = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';
const output = resolve(outputArgument);
const dryRun = process.argv.includes('--dry-run');
const caps = {
  text_max_bytes: 163840,
  screenshots: { max: 4, max_bytes: 262144 },
  app_max_files: 993,
  app_max_bytes: 50331648,
  app_path_max_bytes: 1000,
};

function physicalTarget(path) {
  let probe = path;
  const missing = [];
  while (!existsSync(probe)) {
    const parent = dirname(probe);
    if (parent === probe) throw new Error(`Cannot resolve output path: ${path}`);
    missing.unshift(basename(probe));
    probe = parent;
  }
  return resolve(realpathSync(probe), ...missing);
}

function isWithin(parent, child) {
  const path = relative(parent, child);
  return path === '' || (!path.startsWith(`..${sep}`) && path !== '..' && !isAbsolute(path));
}

function readScreenshotNames() {
  const folder = resolve(root, 'screenshots');
  let status;
  try { status = lstatSync(folder); }
  catch { throw new Error('screenshots/ is required and must contain 3 or 4 PNG or JPEG files.'); }
  if (!status.isDirectory()) throw new Error('screenshots/ must be a directory.');
  const entries = readdirSync(folder, { withFileTypes: true }).filter(entry => !entry.name.startsWith('.'));
  const names = entries.filter(entry => entry.isFile() && /\.(?:png|jpe?g)$/i.test(entry.name)).map(entry => entry.name);
  if (entries.length !== names.length || names.length < 3 || names.length > 4) {
    throw new Error(`screenshots/ must contain 3 or 4 image files; found ${names.length} image(s) and ${entries.length - names.length} other entr${entries.length - names.length === 1 ? 'y' : 'ies'}.`);
  }
  return names;
}

function dossierFor(directory) {
  const bytes = buildDossier(directory, caps);
  return { bytes, document: JSON.parse(new TextDecoder().decode(bytes)) };
}

function report(directory, dossier) {
  const tree = readAppTree(resolve(directory, 'app'), caps);
  const shots = readdirSync(resolve(directory, 'screenshots'), { withFileTypes: true })
    .filter(entry => entry.isFile() && !entry.name.startsWith('.'));
  const shotBytes = shots.reduce((sum, shot) => sum + lstatSync(resolve(directory, 'screenshots', shot.name)).size, 0);
  console.log(`${dryRun ? 'Dry run' : 'Hand-in'} totals`);
  console.log(`App: ${tree.count} files and directories, ${tree.totalBytes} bytes`);
  console.log(`Screenshots: ${shots.length} images, ${shotBytes} bytes`);
  console.log(`Dossier: ${dossier.bytes.length} bytes, ${dossier.document.text.length} text characters`);
  console.log(`Output: ${directory}`);
}

function run() {
  const target = physicalTarget(output);
  if (isWithin(root, target)) throw new Error(`Output directory must be outside the repository: ${target}`);
  readScreenshotNames();

  if (dryRun) {
    const dossier = dossierFor(root);
    report(root, dossier);
    return;
  }

  mkdirSync(output, { recursive: true });
  cpSync(resolve(root, 'app'), resolve(output, 'app'), { recursive: true, force: true });
  const targetShots = resolve(output, 'screenshots');
  rmSync(targetShots, { recursive: true, force: true });
  mkdirSync(targetShots, { recursive: true });
  cpSync(resolve(root, 'screenshots'), targetShots, { recursive: true, force: true });
  const dossier = dossierFor(output);
  writeFileSync(resolve(output, 'dossier.json'), dossier.bytes);
  report(output, dossier);
}

try { run(); }
catch (error) {
  console.error(`Hand-in stopped: ${error instanceof Error ? error.message : String(error)}`);
  process.exitCode = 1;
}
