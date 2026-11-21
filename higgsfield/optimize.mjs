/**
 * FRAGUA: turn renders into what the site loads.
 *
 *   node higgsfield/optimize.mjs
 *
 * Reads   higgsfield/renders/<id>.png|jpg|webp   (from generate.mjs, or saved there by hand from the Higgsfield app)
 * Writes  assets/img/<id>.webp      2000 px wide
 *         assets/img/<id>-sm.webp   900 px wide, for phones
 *         assets/img/og.jpg         social card from the rack shot, if it exists
 *         assets/img/ready.js       the list of images and videos that exist; the site only asks for these
 *
 * Videos are optional: put <id>.mp4 in assets/video/ (for example closing.mp4) and run this again.
 * Re-running is cheap: an image is only re-encoded when its render is newer than its WebP.
 */
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SRC = path.join(ROOT, 'higgsfield/renders');
const OUT = path.join(ROOT, 'assets/img');
const VID = path.join(ROOT, 'assets/video');

const ctx = {};
ctx.globalThis = ctx;
vm.runInNewContext(fs.readFileSync(path.join(ROOT, 'js/shots.js'), 'utf8'), ctx);
const known = new Set(ctx.FRAGUA_SHOTS.shots.map((s) => s.id));

fs.mkdirSync(OUT, { recursive: true });
const renders = fs.existsSync(SRC) ? fs.readdirSync(SRC).filter((f) => /\.(png|jpe?g|webp)$/i.test(f) && !/_v\d+\./.test(f)) : [];

for (const file of renders) {
  const id = file.replace(/\.[^.]+$/, '');
  if (!known.has(id)) { console.log(`  · ${file}: not a shot id in js/shots.js, skipped`); continue; }
  const src = path.join(SRC, file);
  const big = path.join(OUT, `${id}.webp`);
  if (fs.existsSync(big) && fs.statSync(big).mtimeMs >= fs.statSync(src).mtimeMs) continue;
  const meta = await sharp(src).metadata();
  await sharp(src).resize({ width: Math.min(2000, meta.width) }).webp({ quality: 80, effort: 5 }).toFile(big);
  await sharp(src).resize({ width: Math.min(900, meta.width) }).webp({ quality: 78, effort: 5 }).toFile(path.join(OUT, `${id}-sm.webp`));
  console.log(`  ✓ ${id.padEnd(15)} ${meta.width}×${meta.height}`);
}

/* social card: the rack shot with the mark (a square billet with its folded layers and one spark) */
const hero = renders.find((f) => /^rack\.(png|jpe?g|webp)$/i.test(f));
if (hero) {
  const mark =
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 40 40" width="120" height="120"><rect x="3" y="3" width="34" height="34" rx="3" fill="#0E0C0B" stroke="#FF5A1F" stroke-width="1.6"/>' +
    '<g fill="none" stroke="#FF5A1F" stroke-width="1.6" stroke-linecap="round"><path d="M9 13 C15 10 25 16 31 13"/><path d="M9 18 C15 15 25 21 31 18"/><path d="M9 23 C15 20 25 26 31 23"/><path d="M9 28 C15 25 25 31 31 28"/></g>' +
    '<circle cx="31" cy="8" r="1.6" fill="#FFD06A"/></svg>';
  await sharp(path.join(SRC, hero))
    .resize(1200, 630, { fit: 'cover', position: 'centre' })
    .composite([{ input: Buffer.from(mark), left: 64, top: 64 }])
    .jpeg({ quality: 84, mozjpeg: true })
    .toFile(path.join(OUT, 'og.jpg'));
  console.log('  ✓ og.jpg');
}

/* the ready list */
const img = [...known].filter((id) => fs.existsSync(path.join(OUT, `${id}.webp`))).sort();
const video = fs.existsSync(VID) ? fs.readdirSync(VID).filter((f) => f.endsWith('.mp4')).map((f) => f.slice(0, -4)).sort() : [];
fs.writeFileSync(
  path.join(OUT, 'ready.js'),
  '/* Written by higgsfield/optimize.mjs. Lists the images and videos that exist, so the site never requests a missing file. */\n' +
    `window.FRAGUA_READY = ${JSON.stringify({ img, video })};\n`
);
console.log(`\n  ${img.length} of ${known.size} images ready${video.length ? `, videos: ${video.join(', ')}` : ''}. Reload the site.\n`);
