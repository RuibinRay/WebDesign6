/*
 * FRAGUA: pick a knife up and turn it.
 *   FG_GRAB(el)   el is the drawn knife (a canvas). Drag sideways to turn it over (with momentum), up and down
 *                 to tilt; let go and it settles face up or face down. Left/right arrow keys flip it, up/down tilt.
 * A knife is nearly flat, so a turning plane is the honest 3D: seen from behind, the layers run through the
 * steel and show mirrored, as they do on a real blade. Vertical page scroll still works on touch (pan-y).
 */
(function (root) {
  var reduce = function () { return document.documentElement.classList.contains('reduce'); };
  root.FG_GRAB = function (el, opts) {
    opts = opts || {};
    var ry = 0, rx = 0, vy = 0, down = false, lx = 0, ly = 0, lt = 0, moved = 0, raf = 0;
    el.classList.add('grab');
    el.setAttribute('tabindex', el.getAttribute('tabindex') || '0');
    el.setAttribute('role', 'img');
    el.setAttribute('aria-label', (opts.label || 'Knife') + '. Drag or use the arrow keys to turn it over.');
    if (el.parentNode) el.parentNode.classList.add('grab-wrap');
    function paint() { el.style.transform = 'rotateX(' + rx.toFixed(2) + 'deg) rotateY(' + ry.toFixed(2) + 'deg)'; }
    function settle() {
      cancelAnimationFrame(raf);
      var last = performance.now();
      (function step(t) {
        var dt = Math.min(0.05, (t - last) / 1000 || 0.016); last = t;
        if (!down) {
          ry += vy * dt; vy *= Math.exp(-dt * 3.2);
          if (Math.abs(vy) < 40) { var target = Math.round(ry / 180) * 180; ry += (target - ry) * (1 - Math.exp(-dt * 9)); vy *= 0.9; }
          rx += (0 - rx) * (1 - Math.exp(-dt * 8));
          paint();
          var rest = Math.abs(ry - Math.round(ry / 180) * 180) < 0.05 && Math.abs(rx) < 0.05 && Math.abs(vy) < 1;
          if (rest) { ry = Math.round(ry / 180) * 180; rx = 0; vy = 0; paint(); return; }
        }
        raf = requestAnimationFrame(step);
      })(last);
    }
    el.addEventListener('pointerdown', function (e) {
      if (e.button !== 0) return;
      down = true; moved = 0; lx = e.clientX; ly = e.clientY; lt = performance.now(); vy = 0;
      el.setPointerCapture(e.pointerId); el.classList.add('is-grabbed');
      cancelAnimationFrame(raf);
    });
    el.addEventListener('pointermove', function (e) {
      if (!down) return;
      var dx = e.clientX - lx, dy = e.clientY - ly, now = performance.now(), dt = Math.max(1, now - lt) / 1000;
      moved += Math.abs(dx) + Math.abs(dy);
      ry += dx * 0.55; rx = Math.max(-28, Math.min(28, rx - dy * 0.3));
      vy = Math.max(-900, Math.min(900, dx * 0.55 / dt)); /* a hard flick turns it over once or twice, not ten times */
      lx = e.clientX; ly = e.clientY; lt = now;
      paint();
    });
    var up = function () { if (!down) return; down = false; el.classList.remove('is-grabbed'); if (reduce()) vy = 0; settle(); };
    el.addEventListener('pointerup', up);
    el.addEventListener('pointercancel', up);
    /* a drag is not a click: inside a link, swallow the click that ends a drag */
    el.addEventListener('click', function (e) { if (moved > 6) { e.preventDefault(); e.stopPropagation(); } }, true);
    el.addEventListener('keydown', function (e) {
      var k = e.key;
      if (k === 'ArrowLeft' || k === 'ArrowRight') { e.preventDefault(); vy = 0; settleTo(Math.round(ry / 180) * 180 + (k === 'ArrowLeft' ? -180 : 180)); }
      else if (k === 'ArrowUp' || k === 'ArrowDown') { e.preventDefault(); rx = Math.max(-28, Math.min(28, rx + (k === 'ArrowUp' ? 14 : -14))); paint(); clearTimeout(el._t); el._t = setTimeout(settle, 700); }
    });
    /* turn to a resting face: ease out over 0.65 s (instantly under reduce motion) */
    function settleTo(target) {
      var start = ry, t0 = performance.now(), dur = reduce() ? 0 : 650;
      cancelAnimationFrame(raf);
      (function step(t) {
        var k = dur ? Math.min(1, (t - t0) / dur) : 1;
        ry = start + (target - start) * (1 - Math.pow(1 - k, 3));
        paint();
        if (k < 1) raf = requestAnimationFrame(step);
      })(t0);
    }
    paint();
    return { settle: settle, flip: function () { settleTo(Math.round(ry / 180) * 180 + 180); } };
  };
})(window);
