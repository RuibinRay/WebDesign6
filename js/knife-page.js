/*
 * FRAGUA knife page: knife.html?k=paja | oro | bronce | azul.
 * The drawn knife leads until photos exist. "Fold another" draws a new pattern (every real blade's is its own);
 * the handle choice redraws the handle. Scrolling past the hero brings up the bag bar.
 */
(function (root) {
  var F = root.FRAGUA, ART = root.FG_ART, UI = root.FG_UI;
  var $ = function (s, el) { return (el || document).querySelector(s); };
  var esc = function (t) { return String(t).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); };
  var k = F.byId[F.current];
  document.documentElement.style.setProperty('--kc', k.spine);

  /* copy */
  document.title = k.name + ' · ' + k.kind + ' · Fragua';
  var meta = document.querySelector('meta[name="description"]');
  if (meta) meta.setAttribute('content', 'The Fragua ' + k.name + ': ' + k.line);
  var FIELDS = {
    kind: k.kind, name: k.name, kicker: k.kicker, line: k.line, price: F.money(k.price),
    'job-eyebrow': 'Its job · ' + k.job, 'job-title': k.kicker + '.', 'long-1': k.long[0], 'long-2': k.long[1],
    'bar-price': F.money(k.price) + ' · ' + k.color + ', ' + k.temp + ' °C',
  };
  Array.prototype.forEach.call(document.querySelectorAll('[data-f]'), function (el) { var v = FIELDS[el.getAttribute('data-f')]; if (v != null) el.textContent = v; });
  $('[data-chips]').innerHTML = [k.color + ' · ' + k.temp + ' °C', k.hrc + ' HRC', k.cm + ' cm', k.weight, '256 layers'].map(function (c) { return '<span>' + esc(c) + '</span>'; }).join('');
  $('[data-specs]').innerHTML = [
    ['Blade', k.kind + ', ' + k.cm + ' cm'], ['Steel', '1095 and 15N20, folded to 256 layers'], ['Temper', k.color + ', ' + k.temp + ' °C'],
    ['Hardness', k.hrc + ' HRC'], ['Edge', '15° each side, stropped'], ['Weight', k.weight],
    ['Spine', 'Left with its temper colour'], ['Best for', k.job], ['Care', 'Hand wash, dry at once, oil now and then'], ['Sharpening', 'Free, for life'],
  ].map(function (s) { return '<div><dt>' + s[0] + '</dt><dd>' + esc(s[1]) + '</dd></div>'; }).join('');
  var pos = ((k.temp - 170) / 140 * 100).toFixed(2) + '%';
  $('[data-scale-mark]').style.left = pos;
  $('[data-scale-label]').textContent = k.name + ' · ' + k.temp + ' °C · ' + k.hrc + ' HRC';

  /* the hero knife: drawn to fit, not at shared scale; it is the page morph target */
  var heroCanvas = $('[data-hero-knife]');
  heroCanvas.parentNode.style.setProperty('--ar', (k.blade + k.handle + 22) + ' / ' + (k.height + 22));
  var hero = ART.knife(k.id, { canvas: heroCanvas, trueScale: false });
  if (root.FG_GRAB) root.FG_GRAB(heroCanvas, { label: 'The ' + k.name });
  heroCanvas.style.viewTransitionName = 'blade-' + k.id; heroCanvas.style.viewTransitionClass = 'blade';
  var nameEl = $('.kp-name');
  nameEl.style.viewTransitionName = 'name-' + k.id; nameEl.style.viewTransitionClass = 'name';

  /* fold another: a new seed, a new pattern number */
  var noEl = $('[data-pattern-no]'), n = 1;
  var paintNo = function () { noEl.textContent = 'Pattern Nº ' + String(n).padStart(4, '0'); };
  paintNo();
  $('[data-refold]').addEventListener('click', function () {
    n++; paintNo();
    hero.seed(k.seed * 1000 + n * 97);
  });

  /* handle */
  var hEl = $('[data-handles]');
  var defaultHandle = k.id === 'azul' ? 'micarta' : k.id === 'bronce' ? 'nogal' : 'olivo';
  var handle = F.HANDLES.filter(function (h) { return h.id === defaultHandle; })[0];
  hEl.innerHTML = F.HANDLES.map(function (h) {
    return '<label class="hopt"><input type="radio" name="handle" value="' + h.id + '"' + (h.id === defaultHandle ? ' checked' : '') + '><i style="background:' + h.color + '"></i>' + esc(h.label) + '</label>';
  }).join('');
  hEl.addEventListener('change', function (e) {
    handle = F.HANDLES.filter(function (h) { return h.id === e.target.value; })[0];
    hero.handle(handle.id);
  });

  /* bag */
  Array.prototype.forEach.call(document.querySelectorAll('[data-add-here]'), function (b) {
    b.addEventListener('click', function () {
      UI.reserve({ knife: k.id, handle: handle.id, pattern: n, at: Date.now() });
      UI.toast('The ' + k.name + ' with a ' + handle.label.toLowerCase() + ' handle is in your bag. Checkout opens at launch; nothing was charged.');
    });
  });

  /* the other three */
  var othersEl = $('[data-others]');
  F.KNIVES.filter(function (o) { return o.id !== k.id; }).forEach(function (o) {
    var a = document.createElement('a');
    a.className = 'other rv'; a.href = 'knife.html?k=' + o.id;
    a.setAttribute('data-morph', o.id);
    a.style.setProperty('--kc', o.spine);
    a.innerHTML = '<canvas data-morph-part="blade"></canvas><span class="other__name" data-morph-part="name">' + esc(o.name) + '</span><span class="other__meta">' + esc(o.kind) + ' · ' + esc(o.color) + ', ' + o.temp + ' °C · ' + F.money(o.price) + '</span>';
    othersEl.appendChild(a);
    ART.knife(o.id, { canvas: a.querySelector('canvas') });
    if (root.FG_GRAB) root.FG_GRAB(a.querySelector('canvas'), { label: 'The ' + o.name });
  });
  UI.watch(othersEl);

  /* scroll: the bag bar arrives once the hero is behind you; the job photo eases out of a slow zoom */
  var heroEl = $('[data-hero]'), barEl = $('[data-bagbar]'), foot = $('.foot');
  var job = $('.kp-job'), jobImg = $('[data-job-img]');
  UI.onScroll(function () {
    var vh = window.innerHeight, r = heroEl.getBoundingClientRect();
    var on = r.bottom < vh * 0.35 && foot.getBoundingClientRect().top > vh;
    barEl.classList.toggle('is-on', on);
    barEl.setAttribute('aria-hidden', String(!on));
    barEl.querySelector('button').tabIndex = on ? 0 : -1;
    var jr = job.getBoundingClientRect();
    if (jr.bottom > 0 && jr.top < vh) jobImg.style.setProperty('--jz', (1.1 - 0.1 * UI.clamp((vh - jr.top) / (vh + jr.height), 0, 1)).toFixed(4));
  });
  var rz;
  window.addEventListener('resize', function () { clearTimeout(rz); rz = setTimeout(function () { hero.render(); }, 200); });

  var fk = $('[data-foot-knives]');
  if (fk) fk.innerHTML = F.KNIVES.map(function (o) { return '<li><a href="knife.html?k=' + o.id + '">' + esc(o.name) + ' · ' + esc(o.kind) + '</a></li>'; }).join('');
})(window);
