/**
 * FRAGUA: turn renders into what the site loads.
 *
 *   node higgsfield/optimize.mjs
 *
 * Reads higgsfield/renders/ (from generate.mjs, or saved there by hand from the Higgsfield app) and writes:
 *   images   assets/img/<id>.webp (2000 px) and <id>-sm.webp (900 px); assets/img/og.jpg from the hero's first frame
 *   films    film-<name>.mp4 → assets/film/<name>/d/0001.webp…  (1600 px wide, 12 frames a second)
 *                              → assets/film/<name>/m/0001.webp…  (720 × 1280 portrait crop for phones)
 *            The first and last frames are swapped for the sharp first and last stills, where the page rests.
 *   ready    assets/img/ready.js, the list of everything that exists; the site only asks for these
 *
 * Re-running is cheap: work is only redone when a render is newer than its output.
 * Needs `npm install` once (sharp). Films need ffmpeg (set FFMPEG_BIN if it is not on PATH).
 */
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SRC = path.join(ROOT, 'higgsfield/renders');
const OUT = path.join(ROOT, 'assets/img');
const FILM = path.join(ROOT, 'assets/film');
const FPS = 12;
sharp.cache(false); /* do not hold files open between reads and writes */

const ctx = {};
ctx.globalThis = ctx;
vm.runInNewContext(fs.readFileSync(path.join(ROOT, 'js/shots.js'), 'utf8'), ctx);
const S = ctx.FRAGUA_SHOTS;
const known = new Set(S.shots.map((s) => s.id));
const newer = (a, b) => !fs.existsSync(b) || fs.statSync(a).mtimeMs > fs.statSync(b).mtimeMs;
const renders = fs.existsSync(SRC) ? fs.readdirSync(SRC).filter((f) => !/_v\d+\./.test(f)) : [];
const renderOf = (id) => renders.find((f) => f.replace(/\.[^.]+$/, '') === id && /\.(png|jpe?g|webp)$/i.test(f));
[OUT, FILM].forEach((d) => fs.mkdirSync(d, { recursive: true }));

/* ── images ── */
for (const file of renders.filter((f) => /\.(png|jpe?g|webp)$/i.test(f))) {
  const id = file.replace(/\.[^.]+$/, '');
  if (!known.has(id)) { console.log(`  · ${file}: not a shot id in js/shots.js, skipped`); continue; }
  const src = path.join(SRC, file), big = path.join(OUT, `${id}.webp`);
  const mid = path.join(OUT, `${id}-md.webp`);
  if (!newer(src, big) && fs.existsSync(mid)) continue;
  /* a cut-out is trimmed to its subject, with a thin clear margin, so it lines up with the layout */
  const shot = S.shots.find((s) => s.id === id);
  let input = src;
  if (shot && shot.cutout) {
    const m0 = await sharp(src).metadata();
    if (!m0.hasAlpha) console.log(`  ! ${id}: no transparency in the render; check it by eye`);
    input = await sharp(src).trim({ threshold: 8 }).toBuffer();
    const mt = await sharp(input).metadata(), pad = Math.round(Math.max(mt.width, mt.height) * 0.02);
    input = await sharp(input).extend({ top: pad, bottom: pad, left: pad, right: pad, background: { r: 0, g: 0, b: 0, alpha: 0 } }).png().toBuffer();
  }
  const meta = await sharp(input).metadata();
  await sharp(input).resize({ width: Math.min(2000, meta.width) }).webp({ quality: 80, alphaQuality: 90, effort: 5 }).toFile(big);
  await sharp(input).resize({ width: Math.min(1400, meta.width) }).webp({ quality: 79, alphaQuality: 90, effort: 5 }).toFile(mid);
  await sharp(input).resize({ width: Math.min(900, meta.width) }).webp({ quality: 78, alphaQuality: 90, effort: 5 }).toFile(path.join(OUT, `${id}-sm.webp`));
  console.log(`  ✓ ${id.padEnd(14)} ${meta.width}×${meta.height}${shot && shot.cutout ? ' (trimmed cut-out)' : ''}`);
}

/* social card: the rack shot with the mark (a square billet with its folded layers and one spark) */
const hero = renderOf('rack');
if (hero && newer(path.join(SRC, hero), path.join(OUT, 'og.jpg'))) {
  const mark =
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 40 40" width="120" height="120"><rect x="3" y="3" width="34" height="34" rx="3" fill="#0E0C0B" stroke="#FF5A1F" stroke-width="1.6"/>' +
    '<g fill="none" stroke="#FF5A1F" stroke-width="1.6" stroke-linecap="round"><path d="M9 13 C15 10 25 16 31 13"/><path d="M9 18 C15 15 25 21 31 18"/><path d="M9 23 C15 20 25 26 31 23"/><path d="M9 28 C15 25 25 31 31 28"/></g>' +
    '<circle cx="31" cy="8" r="1.6" fill="#FFD06A"/></svg>';
  await sharp(path.join(SRC, hero)).resize(1200, 630, { fit: 'cover', position: 'centre' })
    .composite([{ input: Buffer.from(mark), left: 64, top: 64 }]).jpeg({ quality: 84, mozjpeg: true }).toFile(path.join(OUT, 'og.jpg'));
  console.log('  ✓ og.jpg');
}

/* ── films → scroll frames ── */
function ffmpegBin() {
  if (process.env.FFMPEG_BIN) return process.env.FFMPEG_BIN;
  if (spawnSync('ffmpeg', ['-version']).status === 0) return 'ffmpeg';
  const base = path.join(process.env.LOCALAPPDATA || '', 'Microsoft/WinGet/Packages');
  if (fs.existsSync(base)) {
    for (const d of fs.readdirSync(base).filter((n) => /ffmpeg/i.test(n))) {
      for (const sub of fs.readdirSync(path.join(base, d))) {
        const exe = path.join(base, d, sub, 'bin', 'ffmpeg.exe');
        if (fs.existsSync(exe)) return exe;
      }
    }
  }
  return null;
}
async function swapEnd(dir, still, index, w, h, focus) {
  if (!still) return;
  const meta = await sharp(still).metadata();
  const crop = h > w && meta.width > meta.height
    ? { left: Math.round((meta.width - (meta.height * w) / h) * focus), top: 0, width: Math.round((meta.height * w) / h), height: meta.height }
    : null;
  let img = sharp(still);
  if (crop) img = img.extract(crop);
  /* written beside the frame and then renamed over it: on Windows a frame that was just read cannot be written in place */
  const frame = path.join(dir, String(index).padStart(4, '0') + '.webp'), tmp = frame + '.tmp';
  await img.resize(w, h, { fit: 'cover' }).sharpen({ sigma: 0.6 }).webp({ quality: 84 }).toFile(tmp);
  fs.rmSync(frame, { force: true });
  fs.renameSync(tmp, frame);
}
const films = {};
const ff = S.films.some((f) => fs.existsSync(path.join(SRC, `${f.id}.mp4`))) ? ffmpegBin() : null;
for (const f of S.films) {
  const src = path.join(SRC, `${f.id}.mp4`), base = path.join(FILM, f.name);
  const stamp = path.join(base, 'd', '0001.webp');
  if (fs.existsSync(src) && newer(src, stamp)) {
    if (!ff) { console.log(`  ✗ ${f.id}: ffmpeg not found, set FFMPEG_BIN`); continue; }
    const focus = f.focus ?? 0.5;
    for (const [set, vf] of [
      ['d', `fps=${FPS},scale=1600:-2:flags=lanczos,unsharp=5:5:0.35`],
      ['m', `fps=${FPS},crop=ih*9/16:ih:(iw-ih*9/16)*${focus}:0,scale=720:1280:flags=lanczos,unsharp=5:5:0.35`],
    ]) {
      const dir = path.join(base, set);
      fs.rmSync(dir, { recursive: true, force: true });
      fs.mkdirSync(dir, { recursive: true });
      /* phones get a lighter set: a small screen hides the difference, a mobile connection does not */
      const q = set === 'm' ? '68' : '80';
      const r = spawnSync(ff, ['-v', 'error', '-y', '-i', src, '-an', '-vf', vf, '-c:v', 'libwebp', '-quality', q, '-compression_level', '6', path.join(dir, '%04d.webp')]);
      if (r.status !== 0) { console.log(`  ✗ ${f.id} (${set}): ${String(r.stderr).slice(0, 200)}`); continue; }
      const frames = fs.readdirSync(dir).filter((n) => n.endsWith('.webp')).sort();
      const m0 = await sharp(path.join(dir, frames[0])).metadata();
      const st = (id) => (renderOf(id) ? path.join(SRC, renderOf(id)) : null);
      await swapEnd(dir, st(f.start), 1, m0.width, m0.height, focus);
      await swapEnd(dir, st(f.end), frames.length, m0.width, m0.height, focus);
      console.log(`  ✓ film ${f.name}/${set}  ${frames.length} frames ${m0.width}×${m0.height}`);
    }
  }
}
for (const f of S.films) {
  const count = (set) => { const d = path.join(FILM, f.name, set); return fs.existsSync(d) ? fs.readdirSync(d).filter((n) => n.endsWith('.webp')).length : 0; };
  if (count('d')) films[f.name] = { d: count('d'), m: count('m') };
}

/* ── image meta: where the subject is, and a tiny blurred preview ──
   focus  [x, y] in 0..1, used as object-position wherever a photo is cropped, so the knife stays in frame at any aspect.
          1. a `focus` on the shot in js/shots.js always wins (decided by eye after generation);
          2. studio shots (a prompt with "Backdrop:") use the box around everything that differs from the backdrop colour;
          3. scenes use sharp's attention point, eased well back toward the centre, more so vertically (it likes lamps and windows).
   q      a 24 px WebP as a data URI (well under 1 KB), shown blurred at once while the photo loads.
   Cached in higgsfield/image-meta.json and redone only when a render changes. */
const META_FILE = path.join(ROOT, 'higgsfield/image-meta.json');
const metaCache = fs.existsSync(META_FILE) ? JSON.parse(fs.readFileSync(META_FILE, 'utf8')) : {};
const r3 = (n) => Math.round(n * 1000) / 1000;
async function subjectBox(file) {
  const { data, info } = await sharp(file).resize(200, null).removeAlpha().raw().toBuffer({ resolveWithObject: true });
  const W = info.width, H = info.height, px = (x, y) => { const i = (y * W + x) * 3; return [data[i], data[i + 1], data[i + 2]]; };
  const bg = [0, 0, 0], n = 6;
  for (const [cx, cy] of [[0, 0], [W - n, 0], [0, H - n], [W - n, H - n]]) for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) { const p = px(cx + x, cy + y); bg[0] += p[0]; bg[1] += p[1]; bg[2] += p[2]; }
  bg.forEach((v, i) => (bg[i] = v / (4 * n * n)));
  const xs = [], ys = [];
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) { const p = px(x, y); if (Math.abs(p[0] - bg[0]) + Math.abs(p[1] - bg[1]) + Math.abs(p[2] - bg[2]) > 60) { xs.push(x); ys.push(y); } }
  if (xs.length < W * H * 0.01) return null;
  xs.sort((a, b) => a - b); ys.sort((a, b) => a - b);
  const q = (arr, t) => arr[Math.floor((arr.length - 1) * t)];
  return [r3((q(xs, 0.02) + q(xs, 0.98)) / 2 / W), r3((q(ys, 0.02) + q(ys, 0.98)) / 2 / H)];
}
const meta = {};
for (const id of [...known].filter((id) => fs.existsSync(path.join(OUT, `${id}.webp`)))) {
  const file = path.join(OUT, `${id}.webp`), mtime = fs.statSync(file).mtimeMs;
  const shot = S.shots.find((s) => s.id === id);
  let m = metaCache[id];
  if (!m || m.t !== mtime) {
    let f = null;
    if (/Backdrop:/.test(shot.prompt)) f = await subjectBox(file);
    if (!f) {
      const md = await sharp(file).metadata();
      const { info } = await sharp(file).resize(160, 160, { fit: 'cover', position: sharp.strategy.attention }).toBuffer({ resolveWithObject: true });
      f = [r3(0.5 + (info.attentionX / md.width - 0.5) * 0.6), r3(0.5 + (info.attentionY / md.height - 0.5) * 0.45)];
    }
    const tiny = await sharp(file).resize(24, null).webp({ quality: 42 }).toBuffer();
    m = { t: mtime, f, q: 'data:image/webp;base64,' + tiny.toString('base64') };
    metaCache[id] = m;
  }
  meta[id] = { f: shot.focus || m.f, q: m.q, md: fs.existsSync(path.join(OUT, `${id}-md.webp`)) ? 1 : 0 };
}
fs.writeFileSync(META_FILE, JSON.stringify(metaCache));

/* ── the ready list ── */
const img = [...known].filter((id) => fs.existsSync(path.join(OUT, `${id}.webp`))).sort();
fs.writeFileSync(
  path.join(OUT, 'ready.js'),
  '/* Written by higgsfield/optimize.mjs. Lists what exists, so the site never requests a missing file;\n   meta: per image, the subject focus [x, y] and a tiny blurred preview. */\n' +
    `window.FRAGUA_READY = ${JSON.stringify({ img, film: films, meta })};\n`
);
console.log(`\n  Ready: ${img.length} of ${known.size} images · films: ${Object.keys(films).join(', ') || 'none'}. Reload the site.\n`);
