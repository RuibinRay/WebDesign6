/*
 * FRAGUA home page.
 *   1. The fold: scroll folds a glowing bar, 2 → 256 layers, sparks on every hammer blow; then it cools and the pattern is etched up.
 *   2. The temper: scroll raises the heat 175 → 293 °C. Each knife holds the stage at its temper colour.
 *   3. The edge: scroll zooms a cross-section of the Oro from actual size to the apex (1× → 1000×).
 *   4. The four: cards with the drawn knife and its photo. 5. The forge: pictures come up out of the fire.
 */
(function (root) {
  var F = root.FRAGUA, ART = root.FG_ART, UI = root.FG_UI;
  var $ = function (s, el) { return (el || document).querySelector(s); };
  var $$ = UI.$$, clamp = UI.clamp, smooth = UI.smooth;
  var lerp = function (a, b, t) { return a + (b - a) * t; };
  var mobile = function () { return window.innerWidth < 760; };
  var esc = function (t) { return String(t).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); };
  var num = function (n) { return Math.round(n).toLocaleString('en-US'); };
  var progressOf = function (sec) {
    var r = sec.getBoundingClientRect(), vh = window.innerHeight;
    return { p: clamp(-r.top / (r.height - vh), 0, 1), on: r.bottom > 0 && r.top < vh };
  };
  ['fold', 'temper'].forEach(function (id) { var s = document.getElementById(id); if (s) s.setAttribute('data-tone', 'dark'); });

  /* bag: any [data-add="<id>"] button */
  document.addEventListener('click', function (e) {
    var b = e.target.closest && e.target.closest('[data-add]');
    if (!b) return;
    var k = F.byId[b.getAttribute('data-add')];
    UI.reserve({ knife: k.id, at: Date.now() });
    UI.toast('The ' + k.name + ' is in your bag. Checkout opens at launch; nothing was charged.');
  });

  /* ═════════ 1 · THE FOLD ═════════ */
  var foldStage = $('[data-fold]');
  if (foldStage) {
    var foldSec = $('#fold');
    var bar = ART.billet($('[data-billet]', foldStage));
    var sparks = ART.sparks($('[data-sparks]', foldStage));
    var barWrap = $('[data-bar]', foldStage);
    var caps = $$('[data-fcap]', foldStage);
    var CAP = { hero: [-1, 0, 0.03], two: [0.05, 0.08, 0.2], double: [0.27, 0.32, 0.64], cool: [0.79, 0.84, 1.2] };
    var nEl = $('[data-fold-n]', foldStage), tEl = $('[data-fold-t]', foldStage), lEl = $('[data-layers]', foldStage);
    var lastF = null, lastFold = 0, lastKey = '';

    /* folds (log2 of the layers) for a scroll position: each hammer stroke lands in the middle of its slice */
    function foldsAt(p) {
      var q = clamp((p - 0.1) / 0.62, 0, 1) * 7;
      var i = Math.min(6, Math.floor(q)), fr = q - i;
      return q >= 7 ? 8 : 1 + i + smooth(0.3, 0.75, fr);
    }
    UI.onScroll(function () {
      var sp = progressOf(foldSec);
      if (!sp.on) return;
      var p = sp.p;
      var f = foldsAt(p);
      var cool = smooth(0.76, 0.95, p);
      var heat = 1 - cool;
      var etched = smooth(0.8, 0.97, p);
      var key = f.toFixed(3) + '|' + heat.toFixed(3);
      if (key !== lastKey) { lastKey = key; bar.draw(f, 0.85 + 0.15 * heat - 0.85 * cool, etched); }
      foldStage.style.setProperty('--glow', (0.25 + 0.75 * heat).toFixed(3));

      var fold = Math.round(f) - 1; /* 0..7 */
      if (lastF !== null && fold > lastFold && !UI.reduce()) {
        var r = barWrap.getBoundingClientRect(), sr = foldStage.getBoundingClientRect();
        sparks.burst(r.left - sr.left + r.width / 2, r.top - sr.top + r.height * 0.2, mobile() ? 50 : 110);
        barWrap.classList.remove('is-hit'); void barWrap.offsetWidth; barWrap.classList.add('is-hit');
      }
      lastF = f; lastFold = fold;
      nEl.textContent = Math.max(0, fold) + ' / 7';
      var frac = f % 1;
      var temp = lerp(1150 - (f < 8 ? 70 * Math.sin(Math.PI * frac) : 0), 24, cool);
      tEl.textContent = num(temp) + ' °C';
      lEl.textContent = Math.pow(2, Math.round(f));

      caps.forEach(function (c) {
        var w = CAP[c.getAttribute('data-fcap')], vis;
        vis = smooth(w[0], w[1], p) * (1 - smooth(w[2], w[2] + 0.04, p));
        if (w[0] < 0) vis = 1 - smooth(w[1] + 0.008, w[2] + 0.01, p);
        c.style.opacity = vis.toFixed(3);
        c.style.setProperty('--cy', ((1 - vis) * (p < w[1] ? 24 : -24)).toFixed(1) + 'px');
        c.classList.toggle('is-vis', vis > 0.02);
      });
    });
    window.addEventListener('resize', function () { sparks.resize(); });
  }

  /* ═════════ 2 · THE TEMPER ═════════ */
  var tStage = $('[data-temper]');
  if (tStage) {
    var tSec = $('#temper');
    var KF = [[0, 175], [0.06, 205], [0.2, 206], [0.32, 230], [0.46, 231], [0.58, 260], [0.7, 261], [0.82, 290], [0.96, 291], [1, 293]];
    var PLATEAU = { paja: [0.06, 0.2], oro: [0.32, 0.46], bronce: [0.58, 0.7], azul: [0.82, 1.03] };
    var BOUNDS = [0.26, 0.52, 0.76];
    var HRC = [[170, 63.5], [205, 62], [230, 60], [260, 58], [290, 55], [310, 53.5]];
    var tempAt = function (p) {
      for (var i = 0; i < KF.length - 1; i++) if (p <= KF[i + 1][0]) { var t = (p - KF[i][0]) / (KF[i + 1][0] - KF[i][0]); return lerp(KF[i][1], KF[i + 1][1], t * t * (3 - 2 * t)); }
      return KF[KF.length - 1][1];
    };
    var hrcAt = function (t) { for (var i = 0; i < HRC.length - 1; i++) if (t <= HRC[i + 1][0]) return lerp(HRC[i][1], HRC[i + 1][1], (t - HRC[i][0]) / (HRC[i + 1][0] - HRC[i][0])); return 53.5; };
    var pos = function (t) { return ((t - 170) / 140 * 100).toFixed(2) + '%'; };

    var holder = $('[data-tknives]', tStage);
    var tk = F.KNIVES.map(function (k) {
      var wrap = document.createElement('div');
      wrap.className = 'temper__k';
      wrap.setAttribute('data-morph-for', k.id); wrap.setAttribute('data-morph-part', 'blade');
      var c = document.createElement('canvas'); wrap.appendChild(c); holder.appendChild(wrap);
      return { k: k, wrap: wrap, art: ART.knife(k.id, { canvas: c }), on: false, lastTint: '' };
    });
    F.KNIVES.forEach(function (k, i) {
      var el = document.createElement('article');
      el.className = 'temper__panel';
      el.setAttribute('data-tpanel', k.id); el.setAttribute('data-morph', k.id);
      el.style.setProperty('--kc', k.spine);
      el.innerHTML =
        '<p class="eyebrow">0' + (i + 1) + ' / 04 · ' + esc(k.kind) + ' · ' + k.cm + ' cm</p>' +
        '<h2 class="temper__name" data-morph-part="name">' + esc(k.name) + '</h2>' +
        '<p class="temper__chip"><span><i></i>' + esc(k.color) + '</span><span>' + k.temp + ' °C</span><span>' + k.hrc + ' HRC</span></p>' +
        '<p class="temper__kicker">' + esc(k.kicker) + '</p>' +
        '<p class="temper__line">' + esc(k.line) + '</p>' +
        '<div class="temper__cta"><button class="btn" type="button" data-add="' + k.id + '">Add to bag · ' + F.money(k.price) + '</button><a class="link" href="knife.html?k=' + k.id + '">Discover ' + esc(k.name) + '</a></div>';
      tStage.appendChild(el);
    });
    var panels = $$('[data-tpanel]', tStage);
    var nearKnife = function (t) { return F.KNIVES.some(function (k) { return Math.abs(k.temp - t) < 9; }); };
    $('[data-tticks]', tStage).innerHTML = [180, 200, 220, 240, 260, 280, 300].filter(function (t) { return !nearKnife(t); }).map(function (t) { return '<span style="bottom:' + pos(t) + '">' + t + '</span>'; }).join('') +
      F.KNIVES.map(function (k) { return '<span class="is-k" style="bottom:' + pos(k.temp) + '">' + k.name + ' ' + k.temp + ' —</span>'; }).join('');
    var mark = $('[data-tmark]', tStage), readT = $('[data-tread]', tStage), readH = $('[data-thrc]', tStage);
    var idxAt = function (p) { return p < BOUNDS[0] ? 0 : p < BOUNDS[1] ? 1 : p < BOUNDS[2] ? 2 : 3; };

    UI.onScroll(function () {
      var sp = progressOf(tSec);
      if (!sp.on) return;
      var p = sp.p, t = tempAt(p);
      var col = F.temperAt(t), colCss = ART.css(col);
      tStage.style.setProperty('--tint', colCss);
      mark.style.bottom = pos(t);
      readT.textContent = Math.round(t) + ' °C';
      readH.textContent = hrcAt(t).toFixed(1) + ' HRC';

      /* which knife is on the anvil, with a crossfade and a small breath at each change */
      var w = [0, 0, 0, 0], edge = 0;
      w[idxAt(p)] = 1;
      BOUNDS.forEach(function (B, i) {
        var W = 0.022;
        if (Math.abs(p - B) < W) { var x = smooth(B - W, B + W, p); w = [0, 0, 0, 0]; w[i] = 1 - x; w[i + 1] = x; edge = 1 - Math.abs(2 * x - 1); }
      });
      holder.style.setProperty('--ks', (1 - 0.05 * edge).toFixed(4));
      var tintAmt = 0.25 + 0.5 * smooth(175, 200, t);
      tk.forEach(function (o, i) {
        if (w[i] > 0.001) {
          if (!o.on) { o.wrap.style.visibility = 'visible'; o.on = true; }
          o.wrap.style.opacity = w[i].toFixed(3);
          var key = colCss + tintAmt.toFixed(2);
          if (key !== o.lastTint) { o.lastTint = key; o.art.tint(col, tintAmt); }
        } else if (o.on) { o.on = false; o.wrap.style.visibility = 'hidden'; o.wrap.style.opacity = 0; }
      });

      panels.forEach(function (pn) {
        var id = pn.getAttribute('data-tpanel'), vis, dir;
        if (id === 'intro') { vis = 1 - smooth(0.02, 0.045, p); dir = -1; }
        else { var a = PLATEAU[id][0], z = PLATEAU[id][1]; vis = smooth(a - 0.04, a - 0.004, p) * (1 - smooth(z, z + 0.036, p)); dir = p < a ? 1 : -1; }
        pn.style.opacity = vis.toFixed(3);
        pn.style.setProperty('--py', ((1 - vis) * 30 * dir).toFixed(1) + 'px');
        pn.classList.toggle('is-vis', vis > 0.02);
      });
    });
    var rz;
    window.addEventListener('resize', function () { clearTimeout(rz); rz = setTimeout(function () { tk.forEach(function (o) { o.art.render(); o.lastTint = ''; }); UI.kick(); }, 200); });
  }

  /* ═════════ 3 · THE EDGE ═════════ */
  var eStage = $('[data-edge]');
  if (eStage) {
    var eSec = $('#edge'), svg = $('[data-esvg]', eStage);
    /* cross-section of the Oro in microns: apex at (0,0), height up the blade is negative y */
    var Hb = 48000, spine = 1200, sh = 280, sx = 75;
    var poly = [[0, -0.4], [sx, -sh], [spine, -Hb + 700], [spine - 250, -Hb], [-spine + 250, -Hb], [-spine, -Hb + 700], [-sx, -sh]];
    var dpath = 'M' + poly.map(function (q) { return q[0] + ',' + q[1]; }).join(' L') + ' Z';
    svg.innerHTML =
      '<defs><linearGradient id="eg" x1="0" x2="1"><stop offset="0" stop-color="#6B7178"/><stop offset=".42" stop-color="#E4E7EA"/><stop offset=".58" stop-color="#C9CED3"/><stop offset="1" stop-color="#5B6167"/></linearGradient></defs>' +
      '<g data-eg>' +
      '<path d="' + dpath + '" fill="url(#eg)" stroke="#0E0C0B" stroke-width="1.2" vector-effect="non-scaling-stroke"/>' +
      '<line data-eang x1="0" y1="0" x2="0" y2="-1" stroke="#FF5A1F" stroke-width="1.2" vector-effect="non-scaling-stroke" stroke-dasharray="5 4"/>' +
      '<path data-earc fill="none" stroke="#FF5A1F" stroke-width="1.5" vector-effect="non-scaling-stroke"/>' +
      '<circle data-hair cx="-260" cy="-120" r="35" fill="none" stroke="#5E5751" stroke-width="1.2" vector-effect="non-scaling-stroke" stroke-dasharray="3 3"/>' +
      '<g data-elabels font-family="IBM Plex Mono, monospace" fill="#0E0C0B"></g></g>';
    var g = $('[data-elabels]', svg), arc = $('[data-earc]', svg), axis = $('[data-eang]', svg);
    var zEl = $('[data-ezoom]', eStage), bEl = $('[data-ebar]', eStage), lbEl = $('[data-elabel]', eStage);
    var steps = $$('[data-esteps] li', eStage);
    var LBL = [
      { at: [0.5, 30], x: spine + 260, y: -Hb + 300, t: 'Spine 2.4 mm' },
      { at: [0.5, 30], x: spine + 260, y: -Hb / 2, t: 'Height 48 mm' },
      { at: [6, 300], x: sx + 70, y: -sh - 20, t: '0.15 mm behind the edge' },
      { at: [40, 3000], x: 120, y: -150, t: '15° each side' },
      { at: [40, 600], x: -310, y: -110, t: 'a hair, 70 µm', end: true },
      { at: [400, 5000], x: 9, y: -6, t: 'apex under 1 µm' },
    ];
    UI.onScroll(function () {
      var sp = progressOf(eSec);
      if (!sp.on) return;
      var p = sp.p;
      var z = Math.pow(10, 3 * smooth(0.06, 0.9, p));
      var box = svg.getBoundingClientRect();
      var aspect = box.width / Math.max(1, box.height);
      var Hv = 60000 / z, Wv = Hv * aspect;
      var yc = -0.4 * Hv;
      svg.setAttribute('viewBox', (-Wv / 2).toFixed(3) + ' ' + (yc - Hv / 2).toFixed(3) + ' ' + Wv.toFixed(3) + ' ' + Hv.toFixed(3));
      var fs = Hv * 0.03;
      g.innerHTML = LBL.filter(function (l) { return z >= l.at[0] && z <= l.at[1]; }).map(function (l) {
        /* keep every label inside the view: estimate its width and pull it in from the edge */
        var w = l.t.length * fs * 0.62, m = Wv * 0.03;
        var x = l.end ? Math.max(l.x, -Wv / 2 + m + w) : Math.min(l.x, Wv / 2 - m - w);
        return '<text x="' + x.toFixed(3) + '" y="' + l.y + '" font-size="' + fs.toFixed(3) + '"' + (l.end ? ' text-anchor="end"' : '') + '>' + l.t + '</text>';
      }).join('');
      /* the 15° angle: from the apex up the face of the bevel */
      var R = Hv * 0.28, a = 15 * Math.PI / 180;
      axis.setAttribute('y2', (-R * 1.15).toFixed(3));
      arc.setAttribute('d', 'M' + (R * Math.sin(-a)).toFixed(3) + ',' + (-R * Math.cos(a)).toFixed(3) + ' A' + R.toFixed(3) + ',' + R.toFixed(3) + ' 0 0 1 ' + (R * Math.sin(a)).toFixed(3) + ',' + (-R * Math.cos(a)).toFixed(3));
      var showAng = z >= 40 && z <= 3000 ? 1 : 0;
      arc.style.opacity = axis.style.opacity = showAng;
      zEl.textContent = (z < 10 ? z.toFixed(1) : Math.round(z)) + '×';
      /* a scale bar of a round length, 60 to 200 px long */
      var pxPerUm = box.height / Hv, len = [10000, 5000, 1000, 500, 100, 50, 10, 5, 1].filter(function (u) { return u * pxPerUm <= 200; })[0] || 1;
      bEl.style.width = Math.max(40, len * pxPerUm).toFixed(0) + 'px';
      lbEl.textContent = len >= 1000 ? (len / 1000) + ' mm' : len + ' µm';
      steps.forEach(function (li) { li.classList.toggle('is-on', z >= +li.getAttribute('data-z') * 0.8); });
    });
  }

  /* ═════════ 4 · THE FOUR ═════════ */
  var cardsEl = $('[data-kcards]');
  if (cardsEl) {
    cardsEl.innerHTML = F.KNIVES.map(function (k, i) {
      return '<article class="kcard rv" data-morph="' + k.id + '" style="--kc:' + k.spine + '">' +
        '<div class="kcard__draw" data-morph-part="blade"><p class="eyebrow">0' + (i + 1) + ' · ' + esc(k.kind) + '</p><canvas data-kdraw="' + k.id + '"></canvas></div>' +
        '<div class="kcard__body">' +
        '<h3 class="kcard__name" data-morph-part="name">' + esc(k.name) + '</h3><p class="kcard__price">' + F.money(k.price) + '</p>' +
        '<p class="kcard__meta"><span><i></i>' + esc(k.color) + ', ' + k.temp + ' °C</span><span>' + k.hrc + ' HRC</span><span>' + k.cm + ' cm</span><span>' + esc(k.weight) + '</span></p>' +
        '<p class="kcard__line">' + esc(k.job) + '.</p>' +
        '<div class="kcard__photo slot" data-shot="' + k.id + '-board" data-img-sizes="(max-width: 860px) 100vw, 45vw"></div>' +
        '<div class="kcard__cta"><button class="btn" type="button" data-add="' + k.id + '">Add to bag</button><a class="link" href="knife.html?k=' + k.id + '">Discover ' + esc(k.name) + '</a></div>' +
        '</div></article>';
    }).join('');
    root.FG_MEDIA.all(cardsEl);
    UI.watch(cardsEl);
    $$('[data-kdraw]', cardsEl).forEach(function (c) {
      var id = c.getAttribute('data-kdraw');
      ART.knife(id, { canvas: c });
      if (root.FG_GRAB) root.FG_GRAB(c, { label: 'The ' + F.byId[id].name });
    });
  }

  /* ═════════ 4b · EL JUEGO: the roll ═════════
     Rolled and strapped. Scroll slides the strap off and unrolls the canvas left to right, then each knife drops
     into its pocket, petty to cleaver, and is checked off. With all four in, the set's total appears. */
  var jStage = $('[data-juego]');
  if (jStage) {
    var jSec = $('#juego'), S = F.SET;
    var rollEl = $('[data-roll]', jStage), cyl = $('[data-cyl]', jStage);
    var tick = '<svg class="tick" viewBox="0 0 22 22" aria-hidden="true"><circle cx="11" cy="11" r="10"/><path d="M6.5 11.4l3 3 6-6.4"/></svg>';
    var rk = $('[data-roll-knives]', jStage);
    rk.innerHTML = F.KNIVES.map(function (k) { return '<div class="roll__k" data-rk="' + k.id + '"><canvas></canvas></div>'; }).join('');
    var rollKnives = F.KNIVES.map(function (k) { var el = rk.querySelector('[data-rk="' + k.id + '"]'); ART.knife(k.id, { canvas: el.querySelector('canvas') }); return { k: k, el: el }; });
    $('[data-juego-line]', jStage).textContent = S.line;
    $('[data-juego-price]', jStage).textContent = F.money(S.price);
    var jList = $('[data-juego-list]', jStage);
    jList.innerHTML = '<li data-item="roll" style="--kc:var(--ember)">' + tick + '<span><b>The roll</b><small>' + esc(S.roll) + '</small></span><span class="pr">Included</span></li>' +
      F.KNIVES.map(function (k) { return '<li data-item="' + k.id + '" style="--kc:' + k.spine + '">' + tick + '<span><b>' + esc(k.name) + '</b><small>' + esc(k.kind) + ' · ' + esc(k.color) + '</small></span><span class="pr">' + F.money(k.price) + '</span></li>'; }).join('');
    var jItems = {};
    $$('li', jList).forEach(function (li) { jItems[li.getAttribute('data-item')] = li; });
    var jStatus = $('[data-juego-status]', jStage), jCount = $('[data-juego-count]', jStage), jSum = $('[data-juego-sum]', jStage), jHint = $('[data-juego-hint]', jStage);
    var lastJ = '';
    var markItem = function (id, on) { var li = jItems[id]; if (li._on !== on) { li._on = on; li.classList.toggle('is-checked', on); } };
    UI.onScroll(function () {
      var sp = progressOf(jSec);
      if (!sp.on) return;
      var p = sp.p, W = rollEl.offsetWidth;
      var strap = smooth(0.05, 0.13, p);
      cyl.style.setProperty('--sx', (strap * 120).toFixed(1) + '%');
      cyl.style.setProperty('--so', (1 - strap).toFixed(3));
      var u = smooth(0.12, 0.32, p);
      var cw = lerp(W * 0.2, W * 0.065, Math.sqrt(u));
      rollEl.style.setProperty('--u', u.toFixed(4));
      rollEl.style.setProperty('--cw', cw.toFixed(1) + 'px');
      rollEl.style.setProperty('--tx', ((1 - u) * W / 2).toFixed(1) + 'px');
      var inRoll = 0, last = null;
      rollKnives.forEach(function (o, i) {
        var s0 = 0.36 + i * 0.1, e = smooth(s0, s0 + 0.08, p);
        o.el.style.opacity = smooth(s0 - 0.01, s0 + 0.02, p).toFixed(3);
        o.el.style.transform = 'translateY(' + (-(1 - e) * 115).toFixed(1) + '%)';
        var inNow = e > 0.97;
        if (inNow) { inRoll++; last = o.k; }
        markItem(o.k.id, inNow);
      });
      var open = u > 0.97;
      markItem('roll', open);
      jCount.textContent = inRoll + ' of 4 in the roll';
      var st = p < 0.05 ? 'Rolled and strapped.' : !open ? 'Unrolling.' : inRoll === 0 ? 'Open. Four pockets, cut to size.'
        : inRoll < 4 ? last.name + ', in. ' + last.color + ', ' + last.temp + ' °C.' : 'All four tempers, one roll.';
      if (st !== lastJ) { lastJ = st; jStatus.textContent = st; }
      jSum.classList.toggle('is-on', inRoll === 4);
      jHint.style.opacity = (1 - smooth(0.02, 0.1, p)).toFixed(2);
    });
    $('[data-add-set]', jStage).addEventListener('click', function () {
      UI.reserve({ set: S.id, knives: F.KNIVES.map(function (k) { return k.id; }), at: Date.now() });
      UI.toast(S.name + ', all four in the roll, is in your bag (' + F.money(S.price) + '). Checkout opens at launch; nothing was charged.');
    });
  }

  /* ═════════ 5 · THE FORGE: pictures come up out of the fire ═════════ */
  var heats = $$('[data-heat]');
  if (heats.length) UI.onScroll(function () {
    var vh = window.innerHeight;
    heats.forEach(function (el) {
      var r = el.getBoundingClientRect();
      if (r.bottom < -40 || r.top > vh + 40) return;
      var k = smooth(vh * 0.95, vh * 0.3, r.top); /* 0: ember, 1: full colour */
      el.style.setProperty('--hs', (1 - k).toFixed(3));
      el.style.setProperty('--hsat', (1 + 3 * (1 - k)).toFixed(3));
      el.style.setProperty('--hh', (-18 * (1 - k)).toFixed(1) + 'deg');
      el.style.setProperty('--hb', (0.35 + 0.65 * k).toFixed(3));
      el.style.setProperty('--hc', (1 + 0.3 * (1 - k)).toFixed(3));
    });
  });
  var numsEl = $('[data-numbers]');
  if (numsEl) {
    numsEl.innerHTML = F.STATS.map(function (s) { return '<li><b data-count="' + s.n + '">' + s.n + '</b><span>' + esc(s.label) + '</span></li>'; }).join('');
  }

  var fk = $('[data-foot-knives]');
  if (fk) fk.innerHTML = F.KNIVES.map(function (k) { return '<li><a href="knife.html?k=' + k.id + '">' + esc(k.name) + ' · ' + esc(k.kind) + '</a></li>'; }).join('');

  /* ═════════ scroll feel: settle onto resting states, step with arrows and keys ═════════
     Lenis gives inertia on desktop (phones keep their native momentum). Shortly after scrolling stops inside
     a pinned scene, the page settles onto the nearest resting state, if it is close: after each hammer blow,
     at each knife's temper, at each zoom of the edge. Never while a finger or the mouse is down. Left and
     right arrow keys, and the arrows on the temper stage, step between them. FG_SETTLE() runs it on demand. */
  var testing = /[?&]sync\b/.test(location.search);
  var SCENES = [];
  var foldS = $('#fold'), tempS = $('#temper'), edgeS = $('#edge');
  if (foldS) { var fr = [0.02]; for (var i = 0; i < 7; i++) fr.push(0.1 + (i + 0.9) / 7 * 0.62); fr.push(0.97); SCENES.push({ sec: foldS, rests: fr }); }
  if (tempS) SCENES.push({ sec: tempS, rests: [0.01, 0.13, 0.39, 0.64, 0.92] });
  if (edgeS) SCENES.push({ sec: edgeS, rests: [0.03, 0.365, 0.595, 0.95] });
  var juegoS = $('#juego');
  if (juegoS) SCENES.push({ sec: juegoS, rests: [0.02, 0.34, 0.45, 0.55, 0.65, 0.75, 0.95] });
  var held = false, idle = 0;
  window.addEventListener('pointerdown', function () { held = true; }, true);
  window.addEventListener('pointerup', function () { held = false; queue(); }, true);
  window.addEventListener('touchstart', function () { held = true; }, { passive: true });
  window.addEventListener('touchend', function () { held = false; queue(); }, { passive: true });
  function active() {
    var vh = window.innerHeight;
    for (var i = 0; i < SCENES.length; i++) {
      var r = SCENES[i].sec.getBoundingClientRect();
      if (r.top <= 1 && r.bottom >= vh - 1) return { s: SCENES[i], top: r.top + window.scrollY, span: r.height - vh, p: clamp(-r.top / (r.height - vh), 0, 1) };
    }
    return null;
  }
  var ease = function (t) { return 1 - Math.pow(1 - t, 3); };
  function goP(a, p, dur) {
    var y = Math.round(a.top + p * a.span), L = UI.lenis();
    if (L) L.scrollTo(y, { duration: dur || 0.7, easing: ease });
    else window.scrollTo({ top: y, behavior: testing || UI.reduce() ? 'instant' : 'smooth' });
  }
  function settle() {
    if (held || UI.reduce()) return;
    var a = active();
    if (!a) return;
    var best = a.s.rests.reduce(function (b, r) { return Math.abs(r - a.p) < Math.abs(b - a.p) ? r : b; }, a.s.rests[0]);
    var dist = Math.abs(best - a.p) * a.span;
    if (dist > 3 && dist < window.innerHeight * 0.6) goP(a, best);
  }
  function step(dir) {
    var a = active();
    if (!a) return false;
    var rs = a.s.rests, next = dir > 0 ? rs.filter(function (r) { return r > a.p + 0.004; })[0] : rs.filter(function (r) { return r < a.p - 0.004; }).pop();
    if (next == null) return false;
    goP(a, next, 0.9);
    return true;
  }
  function queue() { clearTimeout(idle); idle = setTimeout(settle, 260); }
  UI.onScroll(queue);
  root.FG_SETTLE = settle;
  document.addEventListener('keydown', function (e) {
    if (e.defaultPrevented || (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight')) return;
    if (/INPUT|TEXTAREA|SELECT/.test(document.activeElement.tagName) || document.activeElement.classList.contains('grab')) return;
    if (step(e.key === 'ArrowRight' ? 1 : -1)) e.preventDefault();
  });
  if (tStage) {
    tStage.insertAdjacentHTML('beforeend', '<div class="temper__steps"><button type="button" data-tstep="-1" aria-label="Previous temper">←</button><button type="button" data-tstep="1" aria-label="Next temper">→</button></div>');
    $$('[data-tstep]', tStage).forEach(function (b) { b.addEventListener('click', function () { step(+b.getAttribute('data-tstep')); }); });
  }
})(window);
