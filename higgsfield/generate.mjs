/**
 * FRAGUA: generate every image on Higgsfield from js/shots.js.
 *
 *   node higgsfield/generate.mjs                  plan only: what would run, what it costs, current balance
 *   node higgsfield/generate.mjs --go             generate everything not yet made (stage 1, then stage 2)
 *   node higgsfield/generate.mjs oro-side rack --go     only these
 *   node higgsfield/generate.mjs rack --go --force       re-roll (the old file is kept as rack_v1.png)
 *   node higgsfield/generate.mjs --go --quality xhigh    upgrade pass for the gpt_image_2_6 shots
 *
 * Stage 1 makes each knife's master (<id>-side) and the forge shots.
 * Stage 2 passes the master as a reference image so the same knife appears in every picture,
 * so a stage 2 shot is skipped until its master exists.
 *
 * After a run it calls optimize.mjs, which turns the renders into the WebP files the site loads.
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

/* ── load the shot list (a browser script) ── */
const ctx = {};
ctx.globalThis = ctx;
vm.runInNewContext(fs.readFileSync(path.join(ROOT, 'js/shots.js'), 'utf8'), ctx);
const { shots } = ctx.FRAGUA_SHOTS;

/* ── arguments ── */
const argv = process.argv.slice(2);
const flag = (n) => { const i = argv.indexOf(`--${n}`); return i > -1 ? argv[i + 1] : undefined; };
const GO = argv.includes('--go');
const FORCE = argv.includes('--force');
const override = { quality: flag('quality'), resolution: flag('resolution') };
const ids = argv.filter((a, i) => !a.startsWith('--') && !/^--(quality|resolution)$/.test(argv[i - 1] || ''));

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
  for (const ext of ['png', 'jpg', 'jpeg', 'webp']) {
    const f = path.join(OUT, `${id}.${ext}`);
    if (fs.existsSync(f)) return f;
  }
  return null;
};
/* refs are written as higgsfield/renders/<id>.png; accept whatever extension the download had */
const resolveRef = (ref) => renderOf(path.basename(ref).replace(/\.[^.]+$/, ''));
const paramsOf = (s) => {
  const p = { ...s.params };
  if (s.model === 'gpt_image_2_6') {
    if (override.quality) p.quality = override.quality;
    if (override.resolution) p.resolution = override.resolution;
  }
  return p;
};
const argsOf = (s, refs) => {
  const a = [s.model, '--prompt', s.prompt, '--aspect_ratio', s.aspect];
  for (const [k, v] of Object.entries(paramsOf(s))) a.push(`--${k}`, String(v));
  for (const r of refs) a.push('--image', r);
  return a;
};
const findUrl = (j) => {
  const m = JSON.stringify(j).match(/https?:\/\/[^"\\]+?\.(?:png|jpe?g|webp)(?:\?[^"\\]*)?/i);
  return m ? m[0] : null;
};

/* ── what to run ── */
const manifest = readManifest();
const unknown = ids.filter((i) => !['all'].includes(i) && !shots.some((s) => s.id === i));
if (unknown.length) { console.error('Unknown shot ids: ' + unknown.join(', ')); process.exit(1); }
const wanted = !ids.length || ids.includes('all') ? shots : shots.filter((s) => ids.includes(s.id));
const queue = wanted.filter((s) => FORCE || !renderOf(s.id));

/* ── plan: price every job (free), show the balance ── */
const prices = {};
async function priceOf(s) {
  const key = s.model + JSON.stringify(paramsOf(s)) + s.aspect;
  if (!(key in prices)) {
    try { prices[key] = JSON.parse(await hf(['generate', 'cost', ...argsOf(s, []), '--json'])).credits; }
    catch { prices[key] = null; }
  }
  return prices[key];
}
let total = 0;
console.log(`\n  ${queue.length} of ${shots.length} shots to make${FORCE ? ' (forced re-roll)' : ''}\n`);
for (const s of queue) {
  const c = await priceOf(s);
  total += c || 0;
  console.log(`  ${String(s.stage).padEnd(2)} ${s.id.padEnd(15)} ${s.model.padEnd(15)} ${s.aspect.padEnd(5)} ${c == null ? '?' : c.toFixed(2).padStart(6)} cr`);
}
let balance = null;
try { balance = JSON.parse(await hf(['account', 'status', '--json'])).credits; } catch (e) { console.log('\n  Could not read the balance: ' + e.message.split('\n')[0]); }
console.log(`\n  Estimated cost ${total.toFixed(2)} credits · balance ${balance == null ? 'unknown' : balance.toFixed(2)} credits\n`);

if (!GO) {
  console.log('  Plan only. Add --go to generate.\n');
  process.exit(0);
}
if (!queue.length) process.exit(0);
if (balance != null && balance < total * 1.05) {
  console.log(`  Not enough credits for this batch (need about ${(total * 1.05).toFixed(1)} with a 5% margin). Top up, or name fewer shots.\n`);
  process.exit(2);
}

/* ── run ── */
async function runJob(s) {
  const refs = (s.refs || []).map(resolveRef);
  if (refs.some((r) => !r)) throw new Error('reference not made yet: ' + s.refs.join(', '));
  const started = Date.now();
  const raw = await hf(['generate', 'create', ...argsOf(s, refs), '--wait', '--wait-timeout', '15m', '--json']);
  const json = JSON.parse(raw);
  const first = Array.isArray(json) ? json[0] : json;
  const url = first?.result_url || first?.results?.[0]?.url || findUrl(json);
  if (!url) throw new Error('no result url in CLI output');
  const ext = (url.match(/\.(png|jpe?g|webp)(?:\?|$)/i)?.[1] || 'png').toLowerCase().replace('jpeg', 'jpg');
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
    status: 'done', model: s.model, params: paramsOf(s), aspect: s.aspect, refs: s.refs || [],
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
        console.log(`  ✓ ${s.id.padEnd(15)} ${manifest.images[s.id].seconds}s`);
      } catch (e) {
        manifest.images[s.id] = { status: 'failed', error: String(e.message || e).slice(0, 300), at: new Date().toISOString() };
        console.log(`  ✗ ${s.id.padEnd(15)} ${e.message.split('\n')[0]}`);
      }
      writeManifest(manifest);
    }
  };
  await Promise.all(Array.from({ length: Math.min(CONCURRENCY, list.length) }, worker));
}

for (const stage of [1, 2]) {
  const list = queue.filter((s) => s.stage === stage);
  if (!list.length) continue;
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
