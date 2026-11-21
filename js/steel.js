/*
 * FRAGUA: everything drawn in code. No images needed.
 *
 *   FG_ART.mark()                      the logo: a folded billet, layers inside a square
 *   FG_ART.pattern(seed)               flowing layer lines, the pattern behind every image placeholder
 *   FG_ART.knife(id, opts)             a knife on a canvas: Damascus blade (seeded, per pixel), polished bevel,
 *                                      temper-coloured spine, bolster, handle. .draw({tint, tintAmount}) .seed(n) .handle(h)
 *   FG_ART.billet(canvas)              the glowing bar for the fold: .draw(folds, heat, etch)
 *   FG_ART.sparks(canvas)              hammer sparks: .burst(x, y, n), runs itself
 *   FG_ART.heatColor(t)                black-body colour of steel at t °C
 *
 * All knife geometry is in millimetres, so the four knives are drawn at true relative size.
 */
(function (root) {
  var F = root.FRAGUA;
  var clamp = function (v, a, b) { return v < a ? a : v > b ? b : v; };
  var smooth = function (a, b, v) { var t = clamp((v - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
  var lerp = function (a, b, t) { return a + (b - a) * t; };
  var mix3 = function (a, b, t) { return [lerp(a[0], b[0], t), lerp(a[1], b[1], t), lerp(a[2], b[2], t)]; };
  var css = function (c, a) { return 'rgba(' + Math.round(c[0]) + ',' + Math.round(c[1]) + ',' + Math.round(c[2]) + ',' + (a == null ? 1 : a) + ')'; };
  var hex = F.hex;

  /* ───────── seeded value noise ───────── */
  function noise2(seed) {
    var p = new Uint8Array(512), s = seed * 9301 + 49297;
    var r = function () { s = (s * 16807) % 2147483647; return s / 2147483647; };
    for (var i = 0; i < 256; i++) p[i] = i;
    for (var j = 255; j > 0; j--) { var k = Math.floor(r() * (j + 1)), t = p[j]; p[j] = p[k]; p[k] = t; }
    for (var m = 0; m < 256; m++) p[m + 256] = p[m];
    var g = new Float32Array(256);
    for (var q = 0; q < 256; q++) g[q] = r() * 2 - 1;
    var fade = function (t) { return t * t * (3 - 2 * t); };
    function n(x, y) {
      var xi = Math.floor(x), yi = Math.floor(y), xf = x - xi, yf = y - yi;
      xi &= 255; yi &= 255;
      var a = g[p[p[xi] + yi]], b = g[p[p[xi + 1] + yi]], c = g[p[p[xi] + yi + 1]], d = g[p[p[xi + 1] + yi + 1]];
      var u = fade(xf), v = fade(yf);
      return lerp(lerp(a, b, u), lerp(c, d, u), v);
    }
    n.fbm = function (x, y) { return n(x, y) * 0.6 + n(x * 2.1, y * 2.1) * 0.28 + n(x * 4.3, y * 4.3) * 0.12; };
    n.rand = r;
    return n;
  }

  /* ───────── the Damascus distortion field, per pattern ─────────
     returns D(u, v) in "layers": how far the layers are pushed at a point (u, v in mm) */
  function field(kind, seed) {
    var n = noise2(seed);
    var drops = [], COLS = 30, ROWS = 12;
    if (kind === 'raindrop') {
      /* one drop per 9 mm cell, jittered; looked up by cell so each point checks only its neighbours */
      for (var gx = 0; gx < COLS; gx++) for (var gy = 0; gy < ROWS; gy++) drops[gx * ROWS + gy] = [-6 + gx * 9 + n.rand() * 6, -6 + gy * 9 + n.rand() * 6, 3 + n.rand() * 2.5];
    }
    return function (u, v) {
      /* a coarse drift plus a fine wander, so no two layers run perfectly parallel */
      var d = n.fbm(u * 0.05, v * 0.08) * 1.4 + n(u * 0.6, v * 0.9) * 0.18;
      if (kind === 'ladder') d += 1.9 * Math.pow(Math.abs(Math.sin(u * 0.36 + n(u * 0.02, 3) * 1.2)), 0.55);
      else if (kind === 'twist') d += 1.6 * Math.sin(u * 0.16 + v * 0.22 + n.fbm(u * 0.03, v * 0.03) * 3) + 0.8 * Math.sin(u * 0.045);
      else if (kind === 'wild') d += n.fbm(u * 0.035, v * 0.05) * 5.5;
      else if (kind === 'raindrop') {
        var cx = Math.floor((u + 6) / 9), cy = Math.floor((v + 6) / 9);
        for (var ix = cx - 2; ix <= cx + 2; ix++) {
          if (ix < 0 || ix >= COLS) continue;
          for (var iy = cy - 2; iy <= cy + 2; iy++) {
            if (iy < 0 || iy >= ROWS) continue;
            var dr = drops[ix * ROWS + iy], dx = u - dr[0], dy = v - dr[1];
            d += 3.4 * Math.exp(-(dx * dx + dy * dy) / (dr[2] * dr[2] * 2));
          }
        }
      }
      return d;
    };
  }

  /* ───────── colours ───────── */
  var HEAT = [[450, '#120402'], [560, '#3A0A04'], [650, '#7A1608'], [750, '#C2230E'], [850, '#EE4A14'], [950, '#FF7A1F'], [1050, '#FFA640'], [1150, '#FFD06A'], [1260, '#FFF2C4']]
    .map(function (k) { return [k[0], hex(k[1])]; });
  function heatColor(t) {
    if (t <= HEAT[0][0]) return HEAT[0][1];
    for (var i = 0; i < HEAT.length - 1; i++) if (t <= HEAT[i + 1][0]) return mix3(HEAT[i][1], HEAT[i + 1][1], (t - HEAT[i][0]) / (HEAT[i + 1][0] - HEAT[i][0]));
    return HEAT[HEAT.length - 1][1];
  }
  var STEEL_D = [84, 90, 97], STEEL_L = [206, 211, 216];

  /* ───────── blade outlines (mm; heel at x=0, spine y=0, edge toward +y) ───────── */
  var BLADE = {
    petty: function (L, h) { return 'M0,0 L' + L * 0.7 + ',0 C' + L * 0.86 + ',0 ' + L * 0.96 + ',' + h * 0.12 + ' ' + L + ',' + h * 0.3 + ' C' + L * 0.9 + ',' + h * 0.78 + ' ' + L * 0.76 + ',' + h + ' ' + L * 0.57 + ',' + h + ' L3,' + h + ' Q0,' + h + ' 0,' + (h - 3) + ' Z'; },
    chef: function (L, h) { return 'M0,0 L' + L * 0.66 + ',0 C' + L * 0.82 + ',0 ' + L * 0.94 + ',' + h * 0.12 + ' ' + L + ',' + h * 0.28 + ' C' + L * 0.89 + ',' + h * 0.7 + ' ' + L * 0.77 + ',' + h + ' ' + L * 0.57 + ',' + h + ' L4,' + h + ' Q0,' + h + ' 0,' + (h - 4) + ' Z'; },
    slicer: function (L, h) { return 'M0,0 L' + L * 0.83 + ',0 C' + L * 0.93 + ',0 ' + L * 0.985 + ',' + h * 0.25 + ' ' + L + ',' + h * 0.47 + ' C' + L * 0.96 + ',' + h * 0.84 + ' ' + L * 0.88 + ',' + h + ' ' + L * 0.78 + ',' + h + ' L3,' + h + ' Q0,' + h + ' 0,' + (h - 3) + ' Z'; },
    cleaver: function (L, h) { return 'M0,0 L' + (L - 4) + ',0 Q' + L + ',0 ' + L + ',4 L' + L + ',' + (h - 7) + ' Q' + (L - 1) + ',' + h + ' ' + (L - 10) + ',' + (h + 0.5) + ' C' + L * 0.6 + ',' + (h + 2.5) + ' ' + L * 0.25 + ',' + (h + 2) + ' 8,' + (h - 1) + ' Q0,' + (h - 2) + ' 0,' + (h - 7) + ' Z'; },
  };

  /* ───────── the mark: a billet folded, its layers inside a square ───────── */
  function mark() {
    return '<svg class="mark" viewBox="0 0 40 40" aria-hidden="true"><rect x="3" y="3" width="34" height="34" rx="3" fill="none" stroke="currentColor" stroke-width="1.6"/>' +
      '<g fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round">' +
      '<path d="M9 13 C15 10 25 16 31 13"/><path d="M9 18 C15 15 25 21 31 18"/><path d="M9 23 C15 20 25 26 31 23"/><path d="M9 28 C15 25 25 31 31 28"/></g>' +
      '<circle cx="31" cy="8" r="1.6" fill="currentColor"/></svg>';
  }

  /* ───────── placeholder art: flowing layer lines ───────── */
  function pattern(seed) {
    var n = noise2(seed + 3), out = '';
    for (var i = 0; i < 34; i++) {
      var y0 = -10 + i * 7, d = 'M-10,' + y0;
      for (var x = 0; x <= 220; x += 10) d += ' L' + x + ',' + (y0 + n.fbm(x * 0.02, i * 0.13) * 22).toFixed(1);
      out += '<path d="' + d + '"/>';
    }
    return '<svg class="slot__art" viewBox="0 0 200 220" preserveAspectRatio="xMidYMid slice" aria-hidden="true"><g fill="none" stroke="currentColor" stroke-width=".5">' + out + '</g></svg>';
  }

  /* ───────── a knife on a canvas ───────── */
  var MAXL = 380; /* mm across the widest knife (slicer 240 + handle 125 + margins) */
  function knife(id, opts) {
    opts = opts || {};
    var k = F.byId[id];
    var canvas = opts.canvas || document.createElement('canvas');
    canvas.className = (canvas.className ? canvas.className + ' ' : '') + 'knife knife--' + id;
    canvas.setAttribute('aria-hidden', 'true');
    var seed = opts.seed || k.seed;
    var handle = F.HANDLES.filter(function (h) { return h.id === (opts.handle || (k.id === 'azul' ? 'micarta' : k.id === 'bronce' ? 'nogal' : 'olivo')); })[0];
    var trueScale = opts.trueScale !== false; /* draw at shared mm scale, so a petty looks small beside a slicer */
    var pad = 8;
    var Lmm = trueScale ? MAXL : k.blade + k.handle + pad * 2 + 6;
    var Hmm = trueScale ? 104 : k.height + pad * 2 + 6;
    var bladePath = new Path2D(BLADE[k.shape](k.blade, k.height));
    var base = document.createElement('canvas'); /* the finished knife, without tint */
    var ppm = 1; /* pixels per mm, set on resize */

    var hh = k.shape === 'cleaver' ? 30 : k.shape === 'petty' ? 19 : 23; /* handle height */
    var hy = k.shape === 'cleaver' ? 6 : 1.5; /* handle top, from the spine */
    var ox = function () { return trueScale ? (MAXL - (k.blade + k.handle)) / 2 + k.handle : pad + k.handle; };
    var oy = function () { return trueScale ? (104 - k.height) / 2 : pad; };

    function render() {
      var cssW = canvas.clientWidth || opts.width || 800;
      var dpr = Math.min(window.devicePixelRatio || 1, 2);
      ppm = (cssW * dpr) / Lmm;
      var W = Math.round(Lmm * ppm), Hh = Math.round(Hmm * ppm);
      base.width = canvas.width = W; base.height = canvas.height = Hh;
      var c = base.getContext('2d');
      c.clearRect(0, 0, W, Hh);
      c.save();
      c.scale(ppm, ppm);
      c.translate(ox(), oy());

      /* handle */
      var hp = new Path2D('M-8,' + hy + ' L' + (-k.handle + 8) + ',' + (hy + 0.5) + ' Q' + (-k.handle) + ',' + (hy + 1) + ' ' + (-k.handle) + ',' + (hy + hh * 0.5) +
        ' Q' + (-k.handle) + ',' + (hy + hh - 1) + ' ' + (-k.handle + 8) + ',' + (hy + hh - 0.5) + ' L-8,' + (hy + hh) + ' Z');
      var hg = c.createLinearGradient(0, hy, 0, hy + hh);
      var hc = hex(handle.color);
      hg.addColorStop(0, css(mix3(hc, [255, 255, 255], 0.18))); hg.addColorStop(0.45, handle.color); hg.addColorStop(1, css(mix3(hc, [0, 0, 0], 0.35)));
      c.fillStyle = hg; c.fill(hp);
      c.save(); c.clip(hp);
      var gn = noise2(seed + 7);
      c.strokeStyle = handle.grain; c.globalAlpha = handle.id === 'micarta' ? 0.25 : 0.55; c.lineWidth = 0.35;
      for (var gi = 0; gi < 22; gi++) {
        c.beginPath();
        for (var gxp = -k.handle; gxp <= 0; gxp += 3) {
          var gy = hy + (gi + 0.5) * hh / 22 + gn.fbm(gxp * 0.03, gi * 0.4) * 5;
          if (gxp === -k.handle) c.moveTo(gxp, gy); else c.lineTo(gxp, gy);
        }
        c.stroke();
      }
      c.restore();
      c.globalAlpha = 1;
      /* pins */
      [-k.handle * 0.78, -k.handle * 0.45].forEach(function (px) {
        var pg = c.createRadialGradient(px - 0.8, hy + hh / 2 - 0.8, 0.2, px, hy + hh / 2, 2.6);
        pg.addColorStop(0, '#F4F6F8'); pg.addColorStop(1, '#7D838A');
        c.fillStyle = pg; c.beginPath(); c.arc(px, hy + hh / 2, 2.4, 0, Math.PI * 2); c.fill();
      });
      /* bolster */
      var bg = c.createLinearGradient(-9, 0, 1, 0);
      bg.addColorStop(0, '#8A9096'); bg.addColorStop(0.35, '#F2F4F6'); bg.addColorStop(0.7, '#A9AFB5'); bg.addColorStop(1, '#5F656B');
      c.fillStyle = bg;
      c.beginPath(); c.moveTo(-9, hy - 0.6); c.lineTo(0.6, -0.2); c.lineTo(0.6, k.height * (k.shape === 'cleaver' ? 0.5 : 0.82)); c.lineTo(-9, hy + hh + 0.6); c.closePath(); c.fill();

      c.restore();

      /* blade: Damascus, per pixel */
      var bx0 = Math.floor((ox() - 1) * ppm), by0 = Math.floor((oy() - 1) * ppm);
      var bw = Math.ceil((k.blade + 2) * ppm), bh = Math.ceil((k.height + 4) * ppm);
      var img = c.getImageData(bx0, by0, bw, bh), data = img.data;
      var mask = document.createElement('canvas'); mask.width = bw; mask.height = bh;
      var mc = mask.getContext('2d');
      mc.setTransform(ppm, 0, 0, ppm, -bx0 + ox() * ppm, -by0 + oy() * ppm);
      mc.fill(bladePath);
      var md = mc.getImageData(0, 0, bw, bh).data;
      var D = field(k.pattern, seed);
      var cycles = k.height * 0.78; /* visible layer bands across the blade height */
      var grain = noise2(seed + 41);
      var step = ppm > 3 ? 2 : 1; /* evaluate the field every other pixel on dense canvases */
      var memo = new Float32Array(Math.ceil(bw / step) * Math.ceil(bh / step));
      for (var yy = 0; yy < bh; yy += step) for (var xx = 0; xx < bw; xx += step) {
        var u = (xx + bx0) / ppm - ox(), v = (yy + by0) / ppm - oy();
        memo[(yy / step) * Math.ceil(bw / step) + xx / step] = D(u, v);
      }
      var rowW = Math.ceil(bw / step);
      for (var y = 0; y < bh; y++) {
        var vmm = (y + by0) / ppm - oy();
        var vn = vmm / k.height;
        var refl = 0.78 + 0.36 * Math.exp(-Math.pow(vn - 0.3, 2) / 0.018) - 0.12 * vn; /* the strip light along the flat */
        var bevel = smooth(0.8, 1, vn); /* the ground edge reads brighter and the pattern fades */
        for (var x = 0; x < bw; x++) {
          var i4 = (y * bw + x) * 4;
          var a = md[i4 + 3];
          if (!a) continue;
          var dval = memo[Math.floor(y / step) * rowW + Math.floor(x / step)];
          var band = 0.5 + 0.5 * Math.sin(6.2832 * (vn * cycles + dval));
          /* etched steel: soft-edged grey and silver layers, a little brushed grain, the bevel polished brighter */
          var s = smooth(0.18, 0.82, band) * (1 - bevel * 0.7) + bevel * 0.75;
          var col = mix3(STEEL_D, STEEL_L, s);
          var f = refl + bevel * 0.12 + grain((x + bx0) * 0.9, (y + by0) * 0.05) * 0.06;
          data[i4] = clamp(col[0] * f, 0, 255); data[i4 + 1] = clamp(col[1] * f, 0, 255); data[i4 + 2] = clamp(col[2] * f + 2, 0, 255);
          data[i4 + 3] = a;
        }
      }
      c.putImageData(img, bx0, by0);

      /* spine heat-tint and edge highlight */
      c.save(); c.scale(ppm, ppm); c.translate(ox(), oy());
      c.save(); c.clip(bladePath);
      var sp = hex(k.spine);
      var sg = c.createLinearGradient(0, 0, 0, k.height * 0.16);
      sg.addColorStop(0, css(sp, 0.95)); sg.addColorStop(0.35, css(sp, 0.55)); sg.addColorStop(1, css(sp, 0));
      c.fillStyle = sg; c.fillRect(-1, -1, k.blade + 2, k.height * 0.16 + 1);
      c.restore();
      c.strokeStyle = 'rgba(255,255,255,.5)'; c.lineWidth = 0.35; c.stroke(bladePath);
      c.restore();
      paint(lastTint);
    }

    var lastTint = null;
    function paint(t) {
      lastTint = t;
      var ctx = canvas.getContext('2d');
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(base, 0, 0);
      if (t && t.amount > 0.001) {
        ctx.save(); ctx.scale(ppm, ppm); ctx.translate(ox(), oy()); ctx.clip(bladePath);
        ctx.globalCompositeOperation = 'color';
        ctx.globalAlpha = t.amount;
        ctx.fillStyle = css(t.color); ctx.fillRect(-1, -1, k.blade + 2, k.height + 6);
        ctx.globalCompositeOperation = 'soft-light';
        ctx.globalAlpha = t.amount * 0.6;
        ctx.fillRect(-1, -1, k.blade + 2, k.height + 6);
        ctx.restore();
      }
    }

    var api = {
      el: canvas, id: id,
      render: render,
      tint: function (color, amount) { paint({ color: color, amount: amount }); return api; },
      seed: function (s) { seed = s; render(); return api; },
      handle: function (hid) { handle = F.HANDLES.filter(function (h) { return h.id === hid; })[0] || handle; render(); return api; },
      currentSeed: function () { return seed; },
    };
    if (opts.defer !== true) requestAnimationFrame(function () { render(); });
    return api;
  }

  /* ───────── the billet, for the fold ───────── */
  function billet(canvas) {
    var W = 560, Hh = 110; /* low resolution on purpose: drawn every frame, scaled up smoothly */
    canvas.width = W; canvas.height = Hh;
    var c = canvas.getContext('2d');
    var img = c.createImageData(W, Hh), data = img.data;
    var D = field('twist', 91), DW = field('wild', 17);
    var dist = new Float32Array(W * Hh), etch = new Float32Array(W * Hh);
    for (var y = 0; y < Hh; y++) for (var x = 0; x < W; x++) {
      var u = x / W * 300, v = y / Hh * 60;
      dist[y * W + x] = D(u, v) * 0.18 + DW(u, v) * 0.05;
      etch[y * W + x] = D(u * 0.8, v);
    }
    /* rounded bar ends */
    var mask = new Uint8Array(W * Hh);
    for (var my = 0; my < Hh; my++) for (var mx = 0; mx < W; mx++) {
      var ex = Math.min(mx, W - 1 - mx), ey = Math.min(my, Hh - 1 - my);
      var r = 10, inside = ex >= r || ey >= r || Math.pow(r - ex, 2) + Math.pow(r - ey, 2) <= r * r;
      mask[my * W + mx] = inside ? 1 : 0;
    }
    return {
      /* folds: 1..8 (fractional while the hammer works), heat 0..1, etched 0..1 (cooled and etched) */
      draw: function (folds, heat, etched) {
        var layers = Math.pow(2, folds);
        var cyc = Math.min(layers, 96) / 2; /* finer than this is below a pixel: the count keeps rising, the drawing settles */
        var hot = heatColor(lerp(560, 1090, heat));
        for (var y = 0; y < Hh; y++) {
          var vn = y / Hh;
          var edgeShade = 0.72 + 0.28 * Math.sin(Math.PI * vn);
          for (var x = 0; x < W; x++) {
            var i = y * W + x, i4 = i * 4;
            if (!mask[i]) { data[i4 + 3] = 0; continue; }
            var band = 0.5 + 0.5 * Math.sin(6.2832 * (vn * cyc + dist[i] * Math.min(1, layers / 8)));
            var hotC = [hot[0] * (0.7 + band * 0.34), hot[1] * (0.58 + band * 0.48), hot[2] * (0.5 + band * 0.6)];
            var eb = 0.5 + 0.5 * Math.sin(6.2832 * (vn * 26 + etch[i] * 0.7));
            var cold = mix3(STEEL_D, STEEL_L, smooth(0.15, 0.85, eb));
            var col = mix3(hotC, cold, etched);
            data[i4] = clamp(col[0] * edgeShade, 0, 255); data[i4 + 1] = clamp(col[1] * edgeShade, 0, 255); data[i4 + 2] = clamp(col[2] * edgeShade, 0, 255);
            data[i4 + 3] = 255;
          }
        }
        c.putImageData(img, 0, 0);
        return hot;
      },
    };
  }

  /* ───────── sparks ───────── */
  function sparks(canvas) {
    var c = canvas.getContext('2d'), parts = [], running = false, last = 0;
    function size() {
      var dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = canvas.clientWidth * dpr; canvas.height = canvas.clientHeight * dpr;
      c.setTransform(dpr, 0, 0, dpr, 0, 0);
    }
    size();
    window.addEventListener('resize', size);
    function tick(t) {
      var dt = Math.min(0.05, (t - last) / 1000 || 0.016); last = t;
      c.clearRect(0, 0, canvas.clientWidth, canvas.clientHeight);
      c.globalCompositeOperation = 'lighter';
      for (var i = parts.length - 1; i >= 0; i--) {
        var p = parts[i];
        p.life -= dt; if (p.life <= 0) { parts.splice(i, 1); continue; }
        p.vy += 900 * dt; p.vx *= 0.995;
        var nx = p.x + p.vx * dt, ny = p.y + p.vy * dt;
        var a = Math.min(1, p.life / p.max * 1.4);
        c.strokeStyle = 'rgba(255,' + Math.round(150 + 90 * a) + ',' + Math.round(60 * a) + ',' + a + ')';
        c.lineWidth = p.w; c.beginPath(); c.moveTo(p.x, p.y); c.lineTo(nx, ny); c.stroke();
        p.x = nx; p.y = ny;
      }
      c.globalCompositeOperation = 'source-over';
      if (parts.length) requestAnimationFrame(tick); else running = false;
    }
    return {
      burst: function (x, y, n) {
        for (var i = 0; i < n; i++) {
          var ang = -Math.PI / 2 + (Math.random() - 0.5) * Math.PI * 1.7, sp = 250 + Math.random() * 650;
          var life = 0.35 + Math.random() * 0.7;
          parts.push({ x: x + (Math.random() - 0.5) * 60, y: y, vx: Math.cos(ang) * sp, vy: Math.sin(ang) * sp, life: life, max: life, w: 0.8 + Math.random() * 1.4 });
        }
        if (!running) { running = true; last = performance.now(); requestAnimationFrame(tick); }
      },
      resize: size,
    };
  }

  root.FG_ART = { mark: mark, pattern: pattern, knife: knife, billet: billet, sparks: sparks, heatColor: heatColor, BLADE: BLADE, css: css, mix3: mix3 };
})(window);
