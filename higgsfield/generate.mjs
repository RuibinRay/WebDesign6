/**
 * FRAGUA: make every picture and film on Higgsfield from js/shots.js.
 *
 *   node higgsfield/generate.mjs                        plan only: what would run, what it costs, the balance. Spends nothing.
 *   node higgsfield/generate.mjs --go                   make everything not yet made, stage by stage
 *   node higgsfield/generate.mjs images --go            only images   (also: films)
 *   node higgsfield/generate.mjs oro-hero rack --go     only these ids
 *   node higgsfield/generate.mjs oro-hero --go --force  re-roll (the old file is kept as oro-hero_v1.png)
 *   node higgsfield/generate.mjs images --go --force --quality xhigh   upgrade pass for the GPT Image shots
 *
 * Stages run in order, because later stages use earlier results:
 *   1  each knife's master (<id>-side, no reference) and the forge scenes
 *   2  everything that shows a knife, its master as reference, including the first frame of each cut film
 *   3  the last frame of each cut film, made from its first frame ("the same frame, a moment later")
 *   4  the cut films (Kling, image to video between a first and a last frame)
 * A job whose inputs do not exist yet fails without spending.
 *
 * After a run it calls optimize.mjs: images → WebP, films → scroll frames.
 * Needs the Higgsfield CLI, logged in. Set HF_BIN if it is not in the default place.
 * Every job is recorded in higgsfield/manifest.json (job ids only, never the download links).
 */
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT = path.join(ROOT, 'higgsfield/renders');
const MANIFEST = path.join(ROOT, 'higgsfield/manifest.json');
const CONCURRENCY = Number(process.env.HF_CONCURRENCY || 4);
const DEFAULT_BIN = path.join(process.env.LOCALAPPDATA || '', 'Programs/higgsfield-cli/hf.exe');
const HF = process.env.HF_BIN || (fs.existsSync(DEFAULT_BIN) ? DEFAULT_BIN : 'higgsfield');

/* Credit prices for jobs that need input files before `hf generate cost` can price them (quoted 2026-11-20). */
const QUOTED = { kling4_0: { 5: 18.75, 10: 37.5 } };

/* ── load the shot list (a browser script) ── */
const ctx = {};
ctx.globalThis = ctx;
vm.runInNewContext(fs.readFileSync(path.join(ROOT, 'js/shots.js'), 'utf8'), ctx);
const ALL = ctx.FRAGUA_SHOTS.all;
const kindOf = (s) => s.kind || 'image';

/* ── arguments ── */
const argv = process.argv.slice(2);
const flag = (n) => { const i = argv.indexOf(`--${n}`); return i > -1 ? argv[i + 1] : undefined; };
const GO = argv.includes('--go');
const FORCE = argv.includes('--force');
const override = { quality: flag('quality'), resolution: flag('resolution') };
const words = argv.filter((a, i) => !a.startsWith('--') && !/^--(quality|resolution)$/.test(argv[i - 1] || ''));
const GROUPS = { images: 'image', films: 'film' };

/* ── helpers ── */
function hf(args) {
  return new Promise((resolve, reject) => {
    const c = spawn(HF, args, { stdio: ['ignore', 'pipe', 'pipe'] });
    let o = '', e = '';
    c.stdout.on('data', (d) => (o += d));
    c.stderr.on('data', (d) => (e += d));
    c.on('error', reject);
    c.on('close', (code) => (code === 0 ? resolve(o) : reject(new Error((e || o).trim().slice(0, 500)))));
  });
}
const readManifest = () => (fs.existsSync(MANIFEST) ? JSON.parse(fs.readFileSync(MANIFEST, 'utf8')) : { images: {} });
const writeManifest = (m) => fs.writeFileSync(MANIFEST, JSON.stringify(m, null, 2));
const renderOf = (id) => {
  for (const ext of ['png', 'jpg', 'jpeg', 'webp', 'mp4']) {
    const f = path.join(OUT, `${id}.${ext}`);
    if (fs.existsSync(f)) return f;
  }
  return null;
};
/* An input is either a drawn pack (higgsfield/refs/<chip>-pack.png, used as written) or an earlier
   render (written as higgsfield/renders/<id>.png; whatever extension the download had is accepted). */
const fileOfRef = (ref) => {
  if (ref.startsWith('higgsfield/refs/')) { const f = path.join(ROOT, ref); return fs.existsSync(f) ? f : null; }
  return renderOf(path.basename(ref).replace(/\.[^.]+$/, ''));
};
const inputsOf = (s) => (kindOf(s) === 'film' ? [s.start, s.end].map((id) => `higgsfield/renders/${id}.png`) : s.refs || []);
const paramsOf = (s) => {
  const p = { ...s.params };
  if (s.model === 'gpt_image_2_6') {
    if (override.quality) p.quality = override.quality;
    if (override.resolution) p.resolution = override.resolution;
  }
  return p;
};
function argsOf(s, files) {
  const a = [s.model, '--prompt', s.prompt, '--aspect_ratio', s.aspect];
  for (const [k, v] of Object.entries(paramsOf(s))) a.push(`--${k}`, String(v));
  if (kindOf(s) === 'film') { if (files[0]) a.push('--start-image', files[0]); if (files[1]) a.push('--end-image', files[1]); }
  else for (const f of files) a.push('--image', f);
  return a;
}
const findUrl = (j) => {
  const m = JSON.stringify(j).match(/https?:\/\/[^"\\]+?\.(?:png|jpe?g|webp|mp4)(?:\?[^"\\]*)?/i);
  return m ? m[0] : null;
};

/* ── what to run ── */
const manifest = readManifest();
const unknown = words.filter((w) => w !== 'all' && !GROUPS[w] && !ALL.some((s) => s.id === w));
if (unknown.length) { console.error('Unknown ids or groups: ' + unknown.join(', ')); process.exit(1); }
const wanted = !words.length || words.includes('all') ? ALL
  : ALL.filter((s) => words.includes(s.id) || words.some((w) => GROUPS[w] === kindOf(s)));
const queue = wanted.filter((s) => FORCE || !renderOf(s.id)).sort((a, b) => a.stage - b.stage);

/* ── plan: price every job (free), show the balance ── */
const prices = {};
async function priceOf(s) {
  if (s.model in QUOTED) { const q = QUOTED[s.model]; return typeof q === 'number' ? q : q[s.params.duration] ?? null; }
  const key = s.model + JSON.stringify(paramsOf(s)) + s.aspect;
  if (!(key in prices)) {
    try { prices[key] = JSON.parse(await hf(['generate', 'cost', ...argsOf(s, []), '--json'])).credits; }
    catch { prices[key] = null; }
  }
  return prices[key];
}
let total = 0;
console.log(`\n  ${queue.length} of ${ALL.length} assets to make${FORCE ? ' (forced re-roll)' : ''}\n`);
for (const s of queue) {
  const c = await priceOf(s);
  total += c || 0;
  console.log(`  ${String(s.stage).padEnd(2)} ${s.id.padEnd(14)} ${kindOf(s).padEnd(6)} ${s.model.padEnd(16)} ${String(s.aspect).padEnd(5)} ${c == null ? '     ?' : c.toFixed(2).padStart(6)} cr`);
}
const packs = [...new Set(queue.flatMap((s) => s.refs || []).filter((r) => r.startsWith('higgsfield/refs/')))];
const missingPacks = packs.filter((r) => !fileOfRef(r));
if (missingPacks.length) console.log(`\n  Drawn packs not saved yet: ${missingPacks.map((r) => path.basename(r)).join(', ')}\n  Open refs.html on the local server and press "Save the four references" (free).`);
let balance = null;
try { balance = JSON.parse(await hf(['account', 'status', '--json'])).credits; } catch (e) { console.log('\n  Could not read the balance: ' + e.message.split('\n')[0]); }
console.log(`\n  Estimated cost ${total.toFixed(2)} credits · balance ${balance == null ? 'unknown' : balance.toFixed(2)} credits\n`);

if (!GO) { console.log('  Plan only. Add --go to generate.\n'); process.exit(0); }
if (!queue.length) process.exit(0);
if (balance != null && balance < total * 1.05) {
  console.log(`  Not enough credits for this batch (need about ${(total * 1.05).toFixed(1)} with a 5% margin). Top up, or name fewer assets.\n`);
  process.exit(2);
}

/* ── run ── */
async function runJob(s) {
  const refs = inputsOf(s), files = refs.map(fileOfRef);
  if (files.some((f) => !f)) throw new Error('needs ' + refs.filter((r, i) => !files[i]).map((r) => path.basename(r)).join(', ') + ' first (no credits spent)');
  const started = Date.now();
  const wait = kindOf(s) === 'image' ? '15m' : '40m';
  const raw = await hf(['generate', 'create', ...argsOf(s, files), '--wait', '--wait-timeout', wait, '--json']);
  const json = JSON.parse(raw);
  const first = Array.isArray(json) ? json[0] : json;
  const url = first?.result_url || first?.results?.[0]?.url || findUrl(json);
  if (!url) throw new Error('no result url in CLI output');
  const ext = (url.match(/\.(png|jpe?g|webp|mp4)(?:\?|$)/i)?.[1] || (kindOf(s) === 'film' ? 'mp4' : 'png')).toLowerCase().replace('jpeg', 'jpg');
  fs.mkdirSync(OUT, { recursive: true });
  const old = renderOf(s.id);
  if (old) {
    let n = 1;
    while (fs.existsSync(path.join(OUT, `${s.id}_v${n}${path.extname(old)}`))) n++;
    fs.renameSync(old, path.join(OUT, `${s.id}_v${n}${path.extname(old)}`));
  }
  const res = await fetch(url);
  if (!res.ok) throw new Error(`download failed ${res.status}`);
  const file = path.join(OUT, `${s.id}.${ext}`);
  fs.writeFileSync(file, Buffer.from(await res.arrayBuffer()));
  return {
    status: 'done', kind: kindOf(s), model: s.model, params: paramsOf(s), aspect: s.aspect, inputs: refs.map((r) => path.basename(r)),
    job_id: first?.id || first?.job_id || null, file: path.relative(ROOT, file).replaceAll('\\', '/'),
    seconds: Math.round((Date.now() - started) / 1000), at: new Date().toISOString(),
  };
}

async function runStage(list) {
  let i = 0;
  const worker = async () => {
    while (i < list.length) {
      const s = list[i++];
      try {
        manifest.images[s.id] = await runJob(s);
        console.log(`  ✓ ${s.id.padEnd(14)} ${manifest.images[s.id].seconds}s`);
      } catch (e) {
        manifest.images[s.id] = { status: 'failed', error: String(e.message || e).slice(0, 300), at: new Date().toISOString() };
        console.log(`  ✗ ${s.id.padEnd(14)} ${e.message.split('\n')[0]}`);
      }
      writeManifest(manifest);
    }
  };
  /* Higgsfield runs fewer videos than images at once */
  const n = list.every((s) => kindOf(s) === 'film') ? Math.min(2, CONCURRENCY) : CONCURRENCY;
  await Promise.all(Array.from({ length: Math.min(n, list.length) }, worker));
}

for (const stage of [...new Set(queue.map((s) => s.stage))]) {
  const list = queue.filter((s) => s.stage === stage);
  console.log(`  Stage ${stage}: ${list.map((s) => s.id).join(', ')}`);
  await runStage(list);
}

const failed = queue.filter((s) => manifest.images[s.id]?.status !== 'done');
console.log(`\n  Done: ${queue.length - failed.length} made, ${failed.length} failed${failed.length ? ' (' + failed.map((s) => s.id).join(', ') + '). Run the same command again to retry them.' : '.'}\n`);

/* hand the new renders to the site */
await new Promise((resolve) => {
  const c = spawn(process.execPath, [path.join(ROOT, 'higgsfield/optimize.mjs')], { stdio: 'inherit' });
  c.on('close', resolve);
});
