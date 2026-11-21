/*
 * FRAGUA: image slots.
 *
 *   <figure class="slot" data-shot="oro-side"></figure>
 *   <figure class="slot slot--fill" data-shot="closing"></figure>
 *
 * If the shot id is listed in assets/img/ready.js (written by higgsfield/optimize.mjs),
 * the slot loads assets/img/<id>.webp (and <id>-sm.webp for small screens).
 * If not, it draws a placeholder that says exactly which picture belongs there,
 * over a Damascus pattern in that shot's colour. Never a broken image.
 */
(function (root) {
  var SHOTS = root.FRAGUA_SHOTS;
  var READY = root.FRAGUA_READY || { img: [], video: [] };
  var img = {}, vid = {};
  (READY.img || []).forEach(function (id) { img[id] = 1; });
  (READY.video || []).forEach(function (id) { vid[id] = 1; });

  var ratio = function (a) { var p = a.split(':'); return p[0] + ' / ' + p[1]; };
  var backdrop = function (s) { var m = s.prompt.match(/Backdrop:[^#]*(#[0-9A-Fa-f]{6})/); return m ? m[1] : null; };
  var esc = function (t) { return String(t).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); };
  var SEED = { forge: 0, steel: 1, wood: 2, kitchen: 3, dark: 4 };

  function pending(el, s) {
    var bg = backdrop(s);
    el.classList.add('slot--pending', 'slot--' + s.tone);
    if (bg) {
      var n = parseInt(bg.slice(1), 16);
      var lum = (0.2126 * (n >> 16) + 0.7152 * ((n >> 8) & 255) + 0.0722 * (n & 255)) / 255;
      el.classList.add(lum > 0.55 ? 'slot--on-light' : 'slot--on-dark');
    }
    el.innerHTML =
      root.FG_ART.pattern(SEED[s.tone] || 0) +
      '<figcaption class="slot__note">' +
      '<span class="slot__tag"><b>Image pending</b><span>' + esc(s.id) + '</span><span>' + esc(s.aspect) + '</span></span>' +
      '<span class="slot__brief">' + esc(s.brief) + '</span>' +
      '</figcaption>';
    el.setAttribute('role', 'img');
    el.setAttribute('aria-label', s.alt + ' (image not produced yet)');
  }

  /*
   * A photo, done properly:
   *   focus     the crop centres on the subject: data-focus on the slot wins, else the focus the optimiser measured
   *   blur-up   the slot shows a 24 px preview of the photo at once (from ready.js), so it is never an empty box
   *   sizes     three widths (900, 1400, 2000); the browser picks by the width the slot is actually drawn at
   *   loading   eager for the first screen and priority shots, lazy (with a generous margin) for the rest
   *   reveal    decoded off the main thread before it fades in, so the fade never stutters
   */
  var META = READY.meta || {};
  function sizesFor(el) {
    if (el.getAttribute('data-img-sizes')) return el.getAttribute('data-img-sizes');
    var w = el.getBoundingClientRect().width || el.parentNode.getBoundingClientRect().width;
    return w ? Math.ceil(w) + 'px' : '100vw';
  }
  function picture(el, s) {
    var m = META[s.id] || {};
    var i = document.createElement('img');
    var pos = el.dataset.focus || (m.f ? (m.f[0] * 100).toFixed(1) + '% ' + (m.f[1] * 100).toFixed(1) + '%' : '');
    if (m.q) {
      el.style.backgroundImage = 'url(' + m.q + ')';
      el.style.backgroundSize = 'cover';
      el.style.backgroundPosition = pos || '50% 50%';
      el.classList.add('slot--blur');
    }
    i.alt = s.alt;
    i.decoding = 'async';
    var r = el.getBoundingClientRect();
    var near = r.top < window.innerHeight * 1.2 && r.bottom > -window.innerHeight * 0.2;
    if (s.priority || near) { i.loading = 'eager'; if (s.priority || r.top < window.innerHeight) i.setAttribute('fetchpriority', 'high'); } else i.loading = 'lazy';
    i.sizes = sizesFor(el);
    i.srcset = 'assets/img/' + s.id + '-sm.webp 900w, ' + (m.md ? 'assets/img/' + s.id + '-md.webp 1400w, ' : '') + 'assets/img/' + s.id + '.webp 2000w';
    i.src = 'assets/img/' + s.id + '.webp';
    if (pos) i.style.objectPosition = pos;
    var shown = false;
    var show = function () { if (shown) return; shown = true; el.classList.add('is-loaded'); };
    i.addEventListener('load', function () { (i.decode ? i.decode() : Promise.resolve()).then(show, show); });
    el.innerHTML = '';
    el.appendChild(i);
    el.classList.add('slot--ready');
    if (i.complete && i.naturalWidth) show();
  }

  function video(el, id) {
    var v = document.createElement('video');
    v.className = 'slot__video';
    v.muted = true; v.loop = true; v.playsInline = true; v.autoplay = !document.documentElement.classList.contains('reduce');
    v.setAttribute('muted', ''); v.setAttribute('playsinline', '');
    v.preload = 'auto';
    v.src = 'assets/video/' + id + '.mp4';
    el.appendChild(v);
  }

  function fill(el) {
    var id = el.getAttribute('data-shot');
    var s = SHOTS && SHOTS.byId[id];
    if (!s) { el.textContent = 'Unknown shot: ' + id; return; }
    if (!el.classList.contains('slot--fill')) el.style.aspectRatio = ratio(s.aspect);
    var bg = backdrop(s);
    if (bg) el.style.setProperty('--slot-bg', bg);
    if (img[id]) picture(el, s);
    else pending(el, s);
    var v = el.getAttribute('data-video');
    if (v && vid[v]) video(el, v);
  }

  root.FG_MEDIA = {
    fill: fill,
    all: function (scope) { Array.prototype.forEach.call((scope || document).querySelectorAll('[data-shot]'), fill); },
    ready: function (id) { return !!img[id]; },
  };
})(window);
