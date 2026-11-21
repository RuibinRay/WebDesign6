/*
 * FRAGUA: scroll films. Scrolling plays a film forward and back.
 *
 *   <section class="film" data-film="ripen" style="--len:230">     (--len = section height in svh)
 *     <div class="film__stage">                                    (sticky, one screen tall)
 *       <figure class="slot slot--fill film__still" data-shot="ripen-start">        first frame
 *       <figure class="slot slot--fill film__still film__still--end" data-shot="ripen-end">  last frame
 *       <canvas class="film__canvas">
 *       <div class="film__draw" data-film-draw="racimo">             optional: a drawing driven by the scroll
 *       <div class="chap" data-in="0" data-out=".3">…</div>          copy that shows between two moments
 *       <div class="film__hud">…</div>
 *
 * Three tiers, so the section is designed whatever exists:
 *   1. frames   assets/film/<name>/d|m/0001.webp…  (listed in ready.js by optimize.mjs) → drawn on the canvas
 *   2. stills   first and last frames exist → a slow push-in that crossfades from one to the other
 *   3. nothing  the hero draws the bunch in code and ripens it as you scroll; the kettle crossfades its
 *               two stand-ins. The HUD reads out the storyboard beat by beat.
 */
(function (root) {
  var SHOTS = root.FRAGUA_SHOTS, READY = root.FRAGUA_READY || {}, MEDIA = root.FG_MEDIA, UI = root.FG_UI, ART = root.FG_ART;
  var FILMS = (READY.film || {});
  var clamp = function (v, a, b) { return Math.max(a, Math.min(b, v)); };
  var smooth = function (t) { t = clamp(t, 0, 1); return t * t * (3 - 2 * t); };
  var pad = function (n) { return (n < 10 ? '0' : '') + n.toFixed(1); };
  var pad2 = function (n) { return (n < 10 ? '0' : '') + n; };

  function Film(sec) {
    var name = sec.dataset.film;
    var meta = SHOTS.films.filter(function (f) { return f.name === name; })[0];
    var stage = sec.querySelector('.film__stage');
    var canvas = sec.querySelector('.film__canvas');
    var ctx = canvas.getContext('2d');
    var stillA = sec.querySelector('.film__still:not(.film__still--end)');
    var stillB = sec.querySelector('.film__still--end');
    var chaps = Array.prototype.slice.call(sec.querySelectorAll('.chap'));
    var bar = sec.querySelector('.film__bar i');
    var tc = sec.querySelector('.film__tc');
    var beat = sec.querySelector('.film__beat');
    var drawEl = sec.querySelector('[data-film-draw]');
    var focus = parseFloat(sec.dataset.focus || '0.5');
    var dur = meta ? meta.params.duration : 10;
    var asDays = sec.dataset.hud === 'day';
    var have = FILMS[name];
    var phone = root.matchMedia('(max-width: 700px) and (orientation: portrait)').matches;
    var set = have ? (phone && have.m ? 'm' : 'd') : null;
    var count = have ? have[set] : 0;
    var tier = count ? 'frames' : (meta && MEDIA.ready(meta.start) && MEDIA.ready(meta.end) ? 'stills' : 'board');
    sec.classList.add('film--' + tier);

    /* tier 3 with a drawing: the bunch, ripened by the scroll */
    var drawn = null;
    if (tier === 'board' && drawEl) {
      drawEl.innerHTML = ART.racimo();
      drawn = drawEl.querySelector('svg');
      sec.classList.add('film--drawn');
    }

    /* HUD: beat ticks, and a "pending" tag while the film does not exist */
    var ticks = sec.querySelector('.film__ticks');
    if (ticks && meta) ticks.innerHTML = meta.beats.map(function (b) { return '<i style="left:' + b.at * 100 + '%"></i>'; }).join('');
    var tag = sec.querySelector('.film__tag');
    if (tag && meta) {
      var missing = [meta.start, meta.end].filter(function (id) { return !MEDIA.ready(id); });
      tag.innerHTML = tier === 'frames' ? meta.id + ' · ' + dur + ' s'
        : 'Film pending · ' + meta.id + ' · ' + dur + ' s' + (missing.length ? '<span class="film__tag-x"> · frames ' + missing.join(' + ') + ' pending</span>' : '');
    }

    /* frames: load coarse first so scrubbing works early, then fill in */
    var imgs = [], loaded = [], started = false;
    function load() {
      if (started || !count) return;
      started = true;
      var order = [], seen = {};
      [16, 8, 4, 2, 1].forEach(function (step) {
        for (var i = 0; i < count; i += step) if (!seen[i]) { seen[i] = 1; order.push(i); }
      });
      if (!seen[count - 1]) order.push(count - 1);
      var next = 0, active = 0;
      function pump() {
        while (active < 6 && next < order.length) {
          var i = order[next++], im = new Image();
          active++;
          im.decoding = 'async';
          im.onload = (function (i, im) { return function () { loaded[i] = 1; imgs[i] = im; active--; pump(); draw(true); }; })(i, im);
          im.onerror = function () { active--; pump(); };
          im.src = 'assets/film/' + name + '/' + set + '/' + String(i + 1).padStart(4, '0') + '.webp';
        }
      }
      pump();
    }
    function nearest(i) {
      for (var d = 0; d < count; d++) {
        if (loaded[i - d]) return i - d;
        if (loaded[i + d]) return i + d;
      }
      return -1;
    }

    var W = 0, H = 0, shown = -1;
    function size() {
      var r = stage.getBoundingClientRect(), dpr = Math.min(root.devicePixelRatio || 1, 2);
      W = Math.round(r.width * dpr); H = Math.round(r.height * dpr);
      if (canvas.width !== W || canvas.height !== H) { canvas.width = W; canvas.height = H; shown = -1; }
    }
    function draw(force) {
      if (tier !== 'frames') return;
      var i = nearest(Math.round(q * (count - 1)));
      if (i < 0 || (i === shown && !force)) return;
      var im = imgs[i], s = Math.max(W / im.naturalWidth, H / im.naturalHeight);
      var w = im.naturalWidth * s, h = im.naturalHeight * s;
      ctx.drawImage(im, (W - w) * focus, (H - h) / 2, w, h);
      shown = i;
      if (!sec.classList.contains('has-frame')) sec.classList.add('has-frame');
    }

    /* progress */
    var p = 0, q = 0, raf = 0, last = 0;
    function measure() {
      var r = sec.getBoundingClientRect(), span = sec.offsetHeight - root.innerHeight;
      p = span > 0 ? clamp(-r.top / span, 0, 1) : 0;
      if (r.top < root.innerHeight * 2 && r.bottom > -root.innerHeight) load();
      if (!raf) { last = performance.now(); raf = requestAnimationFrame(step); }
    }
    function step(now) {
      raf = 0;
      var dt = Math.min(0.1, (now - last) / 1000);
      last = now;
      q += (p - q) * (UI.reduce() ? 1 : 1 - Math.exp(-dt * 14));
      if (Math.abs(p - q) < 0.0004) q = p;
      paint();
      if (q !== p) raf = requestAnimationFrame(step);
    }
    function paint() {
      draw(false);
      if (drawn) {
        ART.ripen(drawn, q);
        drawn.style.transform = UI.reduce() ? '' : 'rotate(' + (Math.sin(q * 5) * 1.4).toFixed(2) + 'deg) scale(' + (1 + q * 0.05).toFixed(4) + ')';
      } else if (tier !== 'frames') {
        var x = smooth((q - 0.28) / 0.5);
        /* never crossfade into a frame that does not exist yet: the first still holds */
        if (stillB) stillB.style.opacity = stillB.classList.contains('slot--pending') ? 0 : x.toFixed(3);
        var zoom = UI.reduce() ? 1 : 1 + q * 0.08;
        stillA.style.transform = 'scale(' + zoom.toFixed(4) + ')';
        if (stillB) stillB.style.transform = 'scale(' + (zoom + 0.02).toFixed(4) + ')';
      }
      chaps.forEach(function (c) {
        var a = parseFloat(c.dataset.in), b = parseFloat(c.dataset.out);
        var o = (a <= 0 ? 1 : clamp((q - a) / 0.05, 0, 1)) * (b >= 1 ? 1 : clamp((b - q) / 0.05, 0, 1));
        c.style.opacity = o.toFixed(3);
        c.style.transform = UI.reduce() ? '' : 'translate3d(0,' + ((1 - o) * (q < a ? 24 : -24)).toFixed(1) + 'px,0)';
        var live = o > 0.5;
        if (c.classList.contains('is-live') !== live) { c.classList.toggle('is-live', live); c.inert = !live; }
      });
      if (bar) bar.style.transform = 'scaleX(' + q.toFixed(4) + ')';
      if (tc) tc.textContent = asDays ? 'Día ' + pad2(Math.round(1 + q * 11)) + ' / 12' : '00:' + pad(q * dur) + ' / 00:' + pad(dur);
      if (beat && meta) {
        var cur = meta.beats[0];
        meta.beats.forEach(function (b) { if (q >= b.at) cur = b; });
        if (beat.textContent !== cur.text) beat.textContent = cur.text;
      }
    }

    size();
    root.addEventListener('resize', function () { size(); draw(true); measure(); });
    UI.onScroll(measure);
    measure();
  }

  Array.prototype.forEach.call(document.querySelectorAll('[data-film]'), function (s) {
    if (s.classList.contains('film')) Film(s);
  });
})(window);
