/* Shared helpers: DOM, storage, math, tweening. Exposed as window.U / window.LS */
(function () {
  const LS = {
    get(k, d) {
      try { const v = localStorage.getItem('gj_' + k); return v == null ? d : JSON.parse(v); } catch (e) { return d; }
    },
    set(k, v) {
      try { localStorage.setItem('gj_' + k, JSON.stringify(v)); } catch (e) { /* storage unavailable */ }
    },
    clear() {
      try { Object.keys(localStorage).filter(k => k.startsWith('gj_')).forEach(k => localStorage.removeItem(k)); } catch (e) { /* ignore */ }
    }
  };

  const reduced = (() => { try { return matchMedia('(prefers-reduced-motion: reduce)').matches; } catch (e) { return false; } })();

  // cryptographically strong [0,1) for fair-feeling outcomes
  const buf = new Uint32Array(1);
  function random() {
    try { crypto.getRandomValues(buf); return buf[0] / 4294967296; } catch (e) { return Math.random(); }
  }

  const U = {
    reduced,
    random,
    $: (s, r = document) => r.querySelector(s),
    $$: (s, r = document) => Array.from(r.querySelectorAll(s)),
    h(tag, attrs, ...kids) {
      const e = document.createElement(tag);
      if (attrs) for (const k in attrs) {
        const v = attrs[k];
        if (v == null || v === false) continue;
        if (k === 'class') e.className = v;
        else if (k === 'style') e.style.cssText = v;
        else if (k === 'html') e.innerHTML = v;
        else if (k.startsWith('on') && typeof v === 'function') e.addEventListener(k.slice(2), v);
        else e.setAttribute(k, v === true ? '' : v);
      }
      for (const k of kids.flat()) if (k != null && k !== false) e.append(k.nodeType ? k : document.createTextNode(k));
      return e;
    },
    sleep: ms => new Promise(r => setTimeout(r, ms)),
    rand: (a, b) => a + random() * (b - a),
    randInt: (a, b) => Math.floor(a + random() * (b - a + 1)),
    pick: arr => arr[Math.floor(random() * arr.length)],
    clamp: (v, a, b) => Math.max(a, Math.min(b, v)),
    lerp: (a, b, t) => a + (b - a) * t,
    shuffle(a) {
      for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
      return a;
    },
    ease: {
      linear: t => t,
      inQuad: t => t * t,
      outQuad: t => 1 - (1 - t) * (1 - t),
      outCubic: t => 1 - Math.pow(1 - t, 3),
      outQuart: t => 1 - Math.pow(1 - t, 4),
      inOutCubic: t => t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2,
      outBack: (t, s = 1.70158) => 1 + (s + 1) * Math.pow(t - 1, 3) + s * Math.pow(t - 1, 2),
      outElastic: t => t === 0 || t === 1 ? t : Math.pow(2, -10 * t) * Math.sin((t * 10 - .75) * (2 * Math.PI) / 3) + 1
    },
    // rAF tween; fn receives eased progress. Resolves when done.
    tween(dur, fn, ease = U.ease.outCubic) {
      return new Promise(res => {
        const t0 = performance.now();
        const step = now => {
          const p = Math.min(1, (now - t0) / dur);
          fn(ease(p), p);
          if (p < 1) requestAnimationFrame(step); else res();
        };
        requestAnimationFrame(step);
      });
    },
    fmt(n) {
      n = Math.floor(n);
      return n.toLocaleString('en-US');
    },
    fmtShort(n) {
      const a = Math.abs(n);
      if (a >= 1e9) return (n / 1e9).toFixed(a >= 1e10 ? 0 : 1).replace(/\.0$/, '') + 'B';
      if (a >= 1e6) return (n / 1e6).toFixed(a >= 1e7 ? 0 : 1).replace(/\.0$/, '') + 'M';
      if (a >= 1e4) return (n / 1e3).toFixed(0) + 'K';
      if (a >= 1e3) return (n / 1e3).toFixed(1).replace(/\.0$/, '') + 'K';
      return String(Math.floor(n));
    },
    center(el) {
      const r = el.getBoundingClientRect();
      return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
    },
    vibrate(p) { try { navigator.vibrate && navigator.vibrate(p); } catch (e) { /* ignore */ } },
    // restart a CSS animation class
    pulse(el, cls) {
      if (!el) return;
      el.classList.remove(cls); void el.offsetWidth; el.classList.add(cls);
    }
  };

  window.U = U;
  window.LS = LS;
})();
