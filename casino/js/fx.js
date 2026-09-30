/* Visual FX: canvas particles (coins, confetti, sparks), homing coins that fly
   into the balance, screen shake, flashes, floating text and the big-win show. */
(function () {
  const RM = U.reduced;
  let cv, cx, W = 0, H = 0, DPR = 1;
  const parts = [];
  let running = false, last = 0;

  const sprites = {};
  function makeCoin(size) {
    const c = document.createElement('canvas'); c.width = c.height = size;
    const g = c.getContext('2d'), r = size / 2;
    const grd = g.createRadialGradient(r * 0.7, r * 0.6, r * 0.1, r, r, r);
    grd.addColorStop(0, '#fff6c8'); grd.addColorStop(0.35, '#f6c94e'); grd.addColorStop(0.8, '#c48a1c'); grd.addColorStop(1, '#7a4b0c');
    g.fillStyle = grd; g.beginPath(); g.arc(r, r, r - 1, 0, Math.PI * 2); g.fill();
    g.strokeStyle = 'rgba(122,75,12,.9)'; g.lineWidth = size * 0.05;
    g.beginPath(); g.arc(r, r, r * 0.72, 0, Math.PI * 2); g.stroke();
    // square hole, the classic Chinese cash coin
    const hs = size * 0.2;
    g.fillStyle = '#5a3606'; g.fillRect(r - hs / 2, r - hs / 2, hs, hs);
    g.strokeStyle = '#ffe9a0'; g.lineWidth = size * 0.03; g.strokeRect(r - hs / 2 - size * .03, r - hs / 2 - size * .03, hs + size * .06, hs + size * .06);
    return c;
  }
  function makeGlow(size, color) {
    const c = document.createElement('canvas'); c.width = c.height = size;
    const g = c.getContext('2d'), r = size / 2;
    const grd = g.createRadialGradient(r, r, 0, r, r, r);
    grd.addColorStop(0, 'rgba(255,255,255,1)'); grd.addColorStop(0.25, color); grd.addColorStop(1, 'rgba(0,0,0,0)');
    g.fillStyle = grd; g.fillRect(0, 0, size, size);
    return c;
  }

  function init() {
    cv = document.createElement('canvas'); cv.id = 'fx-canvas';
    document.body.appendChild(cv);
    cx = cv.getContext('2d');
    sprites.coin = makeCoin(64);
    sprites.glowGold = makeGlow(64, 'rgba(255,196,64,.8)');
    sprites.glowJade = makeGlow(64, 'rgba(80,230,170,.8)');
    sprites.glowRed = makeGlow(64, 'rgba(255,80,80,.8)');
    sprites.glowWhite = makeGlow(64, 'rgba(255,240,220,.8)');
    resize(); addEventListener('resize', resize);
  }
  function resize() {
    DPR = Math.min(2, devicePixelRatio || 1);
    W = innerWidth; H = innerHeight;
    cv.width = W * DPR; cv.height = H * DPR;
  }
  function add(p) {
    parts.push(p);
    if (!running) { running = true; last = performance.now(); requestAnimationFrame(loop); }
  }
  const CONF = ['#f6c94e', '#e8364f', '#35d49a', '#fff3d6', '#6fb7ff', '#ff9a3c'];

  function loop(now) {
    const dt = Math.min(0.05, (now - last) / 1000); last = now;
    cx.setTransform(DPR, 0, 0, DPR, 0, 0);
    cx.clearRect(0, 0, W, H);
    for (let i = parts.length - 1; i >= 0; i--) {
      const p = parts[i];
      p.age += dt;
      if (p.age >= p.life) { parts.splice(i, 1); p.done && p.done(); continue; }
      const k = p.age / p.life;
      if (p.kind === 'home') {
        const t = U.ease.inOutCubic(Math.min(1, p.age / p.life));
        const a = 1 - t;
        p.x = a * a * p.x0 + 2 * a * t * p.cx + t * t * p.tx;
        p.y = a * a * p.y0 + 2 * a * t * p.cy + t * t * p.ty;
        p.rot += dt * p.spin;
        drawCoin(p, 1);
        if (p.age + dt >= p.life) { /* arrive next frame */ }
        continue;
      }
      p.vy += p.g * dt; p.vx *= p.drag; p.vy *= p.drag;
      p.x += p.vx * dt; p.y += p.vy * dt; p.rot += p.spin * dt;
      if (p.floor && p.y > H - 10 && p.vy > 0) { p.y = H - 10; p.vy *= -0.35; p.vx *= 0.7; }
      const alpha = k > 0.75 ? 1 - (k - 0.75) / 0.25 : 1;
      if (p.kind === 'coin') drawCoin(p, alpha);
      else if (p.kind === 'confetti') {
        cx.save(); cx.globalAlpha = alpha; cx.translate(p.x, p.y); cx.rotate(p.rot);
        cx.scale(1, Math.cos(p.age * p.flutter)); cx.fillStyle = p.color;
        cx.fillRect(-p.size / 2, -p.size / 4, p.size, p.size / 2); cx.restore();
      } else if (p.kind === 'spark') {
        cx.save(); cx.globalCompositeOperation = 'lighter'; cx.globalAlpha = alpha * (1 - k * 0.5);
        const s = p.size * (1 - k * 0.6);
        cx.drawImage(p.sprite, p.x - s / 2, p.y - s / 2, s, s); cx.restore();
      } else if (p.kind === 'ring') {
        cx.save(); cx.globalAlpha = (1 - k) * 0.8; cx.strokeStyle = p.color; cx.lineWidth = 4 * (1 - k) + 1;
        cx.beginPath(); cx.arc(p.x, p.y, p.r0 + (p.r1 - p.r0) * U.ease.outCubic(k), 0, Math.PI * 2); cx.stroke(); cx.restore();
      }
    }
    if (parts.length) requestAnimationFrame(loop);
    else { running = false; cx.clearRect(0, 0, W, H); }
  }
  function drawCoin(p, alpha) {
    const sx = Math.cos(p.rot);
    const w = Math.max(0.12, Math.abs(sx)) * p.size;
    cx.save(); cx.globalAlpha = alpha; cx.translate(p.x, p.y);
    if (Math.abs(sx) < 0.15) { cx.fillStyle = '#a86e14'; cx.fillRect(-w / 2, -p.size / 2, w, p.size); }
    else cx.drawImage(sprites.coin, -w / 2, -p.size / 2, w, p.size);
    cx.restore();
  }

  const n = x => Math.max(1, Math.round(RM ? x * 0.25 : x));
  let bwSeq = 0;

  const FX = {
    init,
    coins(x, y, count = 20, { spread = 1, power = 1, size = 26 } = {}) {
      for (let i = 0; i < n(count); i++) {
        const a = -Math.PI / 2 + U.rand(-0.9, 0.9) * spread;
        const sp = U.rand(380, 820) * power;
        add({ kind: 'coin', x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, g: 1500, drag: 0.995,
          rot: U.rand(0, 6), spin: U.rand(6, 16), size: U.rand(size * 0.7, size * 1.2), age: 0, life: U.rand(1.4, 2.2), floor: false });
      }
    },
    rain(count = 60, dur = 2) {
      for (let i = 0; i < n(count); i++) {
        setTimeout(() => add({ kind: 'coin', x: U.rand(0, W), y: -40, vx: U.rand(-60, 60), vy: U.rand(200, 500), g: 900, drag: 0.998,
          rot: U.rand(0, 6), spin: U.rand(5, 14), size: U.rand(22, 40), age: 0, life: 2.6, floor: false }), U.rand(0, dur * 1000));
      }
    },
    fountain(x, y, count = 40, dur = 1.5) {
      for (let i = 0; i < n(count); i++) setTimeout(() => FX.coins(x, y, 1, { spread: 0.6, power: 1.25 }), (i / count) * dur * 1000);
    },
    confetti(x, y, count = 60, power = 1) {
      for (let i = 0; i < n(count); i++) {
        const a = -Math.PI / 2 + U.rand(-1.2, 1.2), sp = U.rand(300, 900) * power;
        add({ kind: 'confetti', x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, g: 700, drag: 0.975, rot: U.rand(0, 6), spin: U.rand(-8, 8),
          flutter: U.rand(6, 14), size: U.rand(8, 14), color: U.pick(CONF), age: 0, life: U.rand(1.8, 3) });
      }
    },
    sparks(x, y, count = 16, color = 'gold', power = 1) {
      const sp = { gold: sprites.glowGold, jade: sprites.glowJade, red: sprites.glowRed, white: sprites.glowWhite }[color] || sprites.glowGold;
      for (let i = 0; i < n(count); i++) {
        const a = U.rand(0, Math.PI * 2), v = U.rand(80, 380) * power;
        add({ kind: 'spark', sprite: sp, x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, g: 200, drag: 0.93, rot: 0, spin: 0, size: U.rand(14, 34), age: 0, life: U.rand(0.4, 0.9) });
      }
    },
    ring(x, y, color = '#f6c94e', r1 = 120) { add({ kind: 'ring', x, y, r0: 10, r1, color, vx: 0, vy: 0, g: 0, drag: 1, rot: 0, spin: 0, age: 0, life: 0.6 }); },
    // coins that fly from a point into a target element (the balance)
    home(from, target, count = 12, onEach, onDone) {
      const t = U.center(target);
      const c = Math.max(1, Math.round(RM ? Math.min(count, 4) : count));
      let arrived = 0;
      for (let i = 0; i < c; i++) {
        const delay = i * (RM ? 60 : 45);
        setTimeout(() => {
          const x0 = from.x + U.rand(-24, 24), y0 = from.y + U.rand(-16, 16);
          add({ kind: 'home', x0, y0, x: x0, y: y0, tx: t.x + U.rand(-6, 6), ty: t.y,
            cx: (x0 + t.x) / 2 + U.rand(-160, 160), cy: Math.min(y0, t.y) - U.rand(40, 180),
            rot: U.rand(0, 6), spin: U.rand(8, 16), size: 22, age: 0, life: U.rand(0.55, 0.8),
            done() { arrived++; onEach && onEach(arrived, c); if (arrived === c) onDone && onDone(); } });
        }, delay);
      }
    },
    shake(mag = 8, dur = 380, el = document.getElementById('app')) {
      if (RM || !el) return;
      const t0 = performance.now();
      const step = now => {
        const k = (now - t0) / dur;
        if (k >= 1) { el.style.transform = ''; return; }
        const m = mag * (1 - k) * (1 - k);
        el.style.transform = `translate(${U.rand(-m, m)}px,${U.rand(-m, m)}px) rotate(${U.rand(-m, m) * 0.05}deg)`;
        requestAnimationFrame(step);
      };
      requestAnimationFrame(step);
    },
    flash(kind = 'gold') {
      const f = document.getElementById('flash'); if (!f) return;
      f.dataset.kind = kind; U.pulse(f, 'on');
    },
    float(x, y, text, cls = '') {
      const el = U.h('div', { class: 'float-text ' + cls, style: `left:${x}px;top:${y}px` }, text);
      document.body.appendChild(el);
      setTimeout(() => el.remove(), 1500);
    },
    countUp(el, from, to, dur, { prefix = '', tick = true, onDone } = {}) {
      let lastTick = 0;
      return U.tween(dur, e => {
        const v = from + (to - from) * e;
        el.textContent = prefix + U.fmt(v);
        const now = performance.now();
        if (tick && now - lastTick > 55 && e < 1) { lastTick = now; Sound.fx.countTick(e); }
      }, U.ease.outQuart).then(() => { el.textContent = prefix + U.fmt(to); onDone && onDone(); });
    },

    /* Big win show. Tiers upgrade mid-count with a punch; tap once to fast-forward, again to close. */
    bigWin(amount, bet) {
      const mult = amount / Math.max(1, bet);
      const tiers = [
        { m: 10, key: 'fx.bigWin', cls: 't1' },
        { m: 25, key: 'fx.megaWin', cls: 't2' },
        { m: 50, key: 'fx.epicWin', cls: 't3' },
        { m: 100, key: 'fx.legendWin', cls: 't4' }
      ];
      const reached = tiers.filter(t => mult >= t.m);
      if (!reached.length) return Promise.resolve();
      const ov = document.getElementById('bigwin');
      const title = ov.querySelector('.bw-title'), amt = ov.querySelector('.bw-amt'), tap = ov.querySelector('.bw-tap');
      const dur = RM ? 1200 : 2200 + reached.length * 1300;
      ov.hidden = false; ov.className = 'bigwin show ' + reached[0].cls;
      title.textContent = I18N.t(reached[0].key); tap.textContent = I18N.t('fx.tap');
      amt.textContent = '0';
      Sound.duck(dur / 1000 + 2.5);
      Sound.fx.fanfare(0);
      Sound.say(I18N.t(reached[0].key));
      U.vibrate([30, 40, 60]);
      let tierIdx = 0, skip = false, finished = false;
      const myId = ++bwSeq;
      const cen = () => ({ x: innerWidth / 2, y: innerHeight * 0.45 });
      const rainT = setInterval(() => FX.rain(6 + tierIdx * 6, 0.3), 280);
      return new Promise(res => {
        let t0 = performance.now(), lastTick = 0;
        let closed = false;
        const close = () => {
          if (closed) return; closed = true;
          clearInterval(rainT); ov.classList.remove('show'); ov.classList.add('hide');
          setTimeout(() => { ov.hidden = true; ov.className = 'bigwin'; }, 350);
          ov.onclick = null; res();
        };
        ov.onclick = () => { if (finished) close(); else skip = true; };
        const step = now => {
          let p = Math.min(1, (now - t0) / dur);
          if (skip) p = 1;
          const v = amount * U.ease.outQuad(p);
          amt.textContent = U.fmt(v);
          if (now - lastTick > 60 && p < 1) { lastTick = now; Sound.fx.countTick(p); }
          const cm = v / Math.max(1, bet);
          while (tierIdx + 1 < reached.length && cm >= reached[tierIdx + 1].m) {
            tierIdx++;
            const t = reached[tierIdx];
            ov.className = 'bigwin show ' + t.cls;
            title.textContent = I18N.t(t.key);
            U.pulse(title, 'punch');
            Sound.fx.tierUp(tierIdx);
            Sound.say(I18N.t(t.key));
            const c = cen(); FX.sparks(c.x, c.y, 40, 'gold', 2); FX.ring(c.x, c.y, '#fff3c0', 360); FX.confetti(c.x, c.y, 50, 1.3);
            FX.shake(10, 400); FX.flash('gold'); U.vibrate(60);
          }
          if (p < 1) requestAnimationFrame(step);
          else {
            finished = true; amt.textContent = U.fmt(amount);
            U.pulse(amt, 'punch'); Sound.fx.cashout();
            const c = cen(); FX.coins(c.x, c.y + 40, 50, { power: 1.3 }); FX.confetti(c.x, c.y, 80, 1.4);
            setTimeout(() => { if (bwSeq === myId && !closed) close(); }, 2600);
          }
        };
        requestAnimationFrame(step);
      });
    }
  };
  window.FX = FX;
})();
