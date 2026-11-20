# Project rules for agents working in this repository

This repository is a make.fun bounty entry: a static cover-art studio for a desktop browser.
Every file under `app/` and `main.ts` must be written by the recorded agent, from the briefs in
`../briefs/`, never copied from another tree.

## Machine rules (a 8 GB M1, other builds running)

- Do not install or download anything: no `npm install`, no `npx playwright install`, no
  `pip install`, no browser downloads. Chrome is installed and Playwright's browser cache is
  already there, but the `playwright` package is not a dependency of this project.
- Do not run `find` over the home directory, `mdfind`, or any recursive scan outside this
  repository: on this machine it takes minutes and stalls the pass.
- Drive the browser with `node scripts/shoot.mjs <url> <out.png> [--eval "<js>"] [--canvas
  "#preview"]`. It is dependency-free (global WebSocket + CDP) and already proven here.
- Serve the app with `python3 -m http.server 4173 --directory app` (background, then stop it).

## Build rules

- ES modules only, no bundler, no external requests, no `fetch`, no CDN, no remote fonts.
- All type is from `app/fonts/*.ttf` via `@font-face`; all photos from `app/samples/`.
- One renderer path for preview and export: the PNG must be the same drawing at a larger size.
- `node --check` every `.js` you touch. A pass reports numbers, never adjectives.

## Do not

- Do not read `../repos/gta6-cover-art-01*`, `~/makefun-ops/archive`, or any previous build of
  this app. Lines re-typed after reading are credited as copied, which fails the entry.
- Do not commit, push, tag, or call `makefun submit`. The operator does that.
