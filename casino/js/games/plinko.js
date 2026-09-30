/* Plinko: 12 rows of pegs, three risk tables, multiple balls at once */
(function () {
  const t = (k, v) => I18N.t(k, v);
  const ROWS = 12;
  const TABLES = {
    low: [10, 3, 1.6, 1.4, 1.1, 1, 0.5, 1, 1.1, 1.4, 1.6, 3, 10],
    medium: [33, 11, 4, 2, 1.1, 0.6, 0.3, 0.6, 1.1, 2, 4, 11, 33],
    high: [170, 24, 8.1, 2, 0.7, 0.2, 0.2, 0.2, 0.7, 2, 8.1, 24, 170]
  };
  const BETS = [10, 20, 50, 100, 200, 500, 1000, 2000, 5000];

  function binColor(i) {
    const d = Math.abs(i - ROWS / 2) / (ROWS / 2); // 0 centre .. 1 edge
    const a = [22, 120, 90], b = [217, 164, 65], c = [206, 38, 60];
    const mix = (p, q, k) => p.map((v, j) => Math.round(v + (q[j] - v) * k));
    const col = d < 0.5 ? mix(a, b, d / 0.5) : mix(b, c, (d - 0.5) / 0.5);
    return `rgb(${col.join(',')})`;
  }

  const G = {
    id: 'plinko', risk: LS.get('plRisk', 'medium'), balls: [], auto: false, hist: [],

    init(root) {
      root.innerHTML = `
        <div class="pl-wrap">
          <div class="pl-stage"><canvas class="pl-canvas"></canvas><div class="pl-hist"></div></div>
          <div class="pl-panel">
            <div class="bet-step"></div>
            <div class="seg" role="radiogroup" aria-label="Risk">
              ${['low', 'medium', 'high'].map(r => `<button class="seg-btn" data-risk="${r}" role="radio"><span data-i18n="pl.${r}">${t('pl.' + r)}</span></button>`).join('')}
            </div>
            <button class="btn btn-gold btn-xl pl-drop"><span data-i18n="pl.drop">${t('pl.drop')}</span></button>
            <button class="tog pl-auto">${C.icon('auto')}<span data-i18n="slots.auto">${t('slots.auto')}</span></button>
            <div class="pl-stats"><div class="side-lab" data-i18n="pl.session">${t('pl.session')}</div><div class="pl-net side-val">0</div></div>
          </div>
        </div>`;
      this.root = root;
      const $ = s => root.querySelector(s);
      this.cv = $('.pl-canvas'); this.g = this.cv.getContext('2d');
      this.stepper = C.Stepper($('.bet-step'), { values: BETS, key: 'plBet', def: 100 });
      U.$$('.seg-btn', root).forEach(b => b.onclick = () => { this.risk = b.dataset.risk; LS.set('plRisk', this.risk); Sound.fx.click(); this.syncRisk(); });
      $('.pl-drop').onclick = () => { Sound.unlock(); this.drop(); };
      this.autoBtn = $('.pl-auto');
      this.autoBtn.onclick = () => { Sound.unlock(); this.auto = !this.auto; this.autoBtn.classList.toggle('on', this.auto); Sound.fx.click(); if (this.auto) this.autoLoop(); };
      this.pegGlow = {}; this.binHit = {};
      this.net = 0;
      this.syncRisk();
      this.resize();
      this.ro = new ResizeObserver(() => this.resize()); this.ro.observe(this.cv.parentElement);
    },
    enter() { this.resize(); this.startLoop(); },
    leave() { this.auto = false; this.autoBtn.classList.remove('on'); cancelAnimationFrame(this.raf); this.raf = null; this.flushBalls(); },
    key(e) { if (e.key === ' ' || e.key === 'Enter') { this.drop(); return true; } },
    syncRisk() { U.$$('.seg-btn', this.root).forEach(b => { const on = b.dataset.risk === this.risk; b.classList.toggle('on', on); b.setAttribute('aria-checked', on); }); },
    resize() {
      const p = this.cv.parentElement, D = Math.min(2, devicePixelRatio || 1);
      const w = p.clientWidth, h = p.clientHeight;
      if (!w || !h) return;
      this.W = w; this.H = h; this.D = D;
      this.cv.width = w * D; this.cv.height = h * D;
      this.cv.style.width = w + 'px'; this.cv.style.height = h + 'px';
      const binH = Math.max(26, h * 0.075);
      this.s = Math.min(w / (ROWS + 2.2), (h - binH - 40) / (ROWS + 0.6));
      this.top = 26 + this.s * 0.4;
      this.cx = w / 2;
      this.binY = this.top + ROWS * this.s;
      this.binH = binH;
      this.pegR = Math.max(2.5, this.s * 0.1);
      this.ballR = Math.max(4.5, this.s * 0.2);
    },
    pegXY(r, j) { return [this.cx + (j - (r + 2) / 2) * this.s, this.top + r * this.s]; },

    drop() {
      const bet = this.stepper.value;
      if (!C.take(bet)) { this.auto = false; this.autoBtn.classList.remove('on'); return false; }
      const path = Array.from({ length: ROWS }, () => U.random() < 0.5 ? 0 : 1);
      this.balls.push({ path, bet, table: TABLES[this.risk], h: -1, u: 0, off: 0, x: this.cx + U.rand(-2, 2), y: 6, hue: U.pick(['#fff3c0', '#f6c94e', '#ffd9a0']) });
      Sound.fx.chip();
      if (!this.raf) this.startLoop();
      return true;
    },
    async autoLoop() {
      while (this.auto && C.current === 'plinko') {
        if (!this.drop()) break;
        await U.sleep(380);
      }
    },
    // settle any balls still in flight when leaving the view
    flushBalls() {
      this.balls.forEach(b => {
        const k = b.path.reduce((a, v) => a + v, 0), m = b.table[k];
        const win = Math.floor(b.bet * m);
        if (win) C.pay(win, null);
        C.record(win, b.bet);
      });
      this.balls = [];
    },

    startLoop() {
      if (this.raf) return;
      let last = performance.now();
      const frame = now => {
        const dt = Math.min(0.05, (now - last) / 1000); last = now;
        this.step(dt, now);
        this.draw(now);
        this.raf = requestAnimationFrame(frame);
      };
      this.raf = requestAnimationFrame(frame);
    },
    step(dt, now) {
      const s = this.s;
      for (let i = this.balls.length - 1; i >= 0; i--) {
        const b = this.balls[i];
        const hopDur = b.h < 0 ? 0.28 : 0.15 + (b.h === ROWS - 1 ? 0.08 : 0);
        b.u += dt / hopDur;
        // source and target points of this hop
        const from = b.h < 0 ? [this.cx, this.top - s * 1.2] : [this.cx + b.off * s, this.top + b.h * s - this.pegR - this.ballR];
        let to, dx;
        if (b.h < 0) { to = [this.cx, this.top - this.pegR - this.ballR]; dx = 0; }
        else {
          const nOff = b.off + (b.path[b.h] ? 0.5 : -0.5);
          dx = nOff - b.off;
          to = b.h === ROWS - 1 ? [this.cx + nOff * s, this.binY + this.binH * 0.35] : [this.cx + nOff * s, this.top + (b.h + 1) * s - this.pegR - this.ballR];
        }
        const u = Math.min(1, b.u);
        const hb = b.h < 0 ? 0 : s * 0.28;
        b.x = from[0] + (to[0] - from[0]) * U.ease.outQuad(u);
        b.y = from[1] + (to[1] - from[1]) * u * u - hb * 4 * u * (1 - u);
        if (b.u >= 1) {
          b.u = 0;
          if (b.h >= 0) b.off += dx;
          b.h++;
          if (b.h < ROWS) {
            const j = Math.round(b.off + (b.h + 2) / 2);
            this.pegGlow[b.h + ':' + j] = now;
            Sound.fx.peg(b.h);
          } else {
            this.balls.splice(i, 1);
            this.land(b, now);
          }
        }
      }
    },
    land(b, now) {
      const k = b.path.reduce((a, v) => a + v, 0);
      const m = b.table[k];
      const win = Math.floor(b.bet * m);
      this.binHit[k] = now;
      Sound.fx.bin(m);
      const r = this.cv.getBoundingClientRect();
      const x = r.left + this.cx + (k - ROWS / 2) * this.s, y = r.top + this.binY + this.binH / 2;
      FX.float(x, y - 20, m + '×', m >= 1 ? 'good' : 'dim');
      if (win) C.pay(win, { x, y });
      C.record(win, b.bet);
      this.net += win - b.bet;
      const nEl = this.root.querySelector('.pl-net');
      nEl.textContent = (this.net > 0 ? '+' : '') + U.fmt(this.net);
      nEl.className = 'pl-net side-val ' + (this.net > 0 ? 'good' : this.net < 0 ? 'bad' : '');
      if (m >= 10) { FX.sparks(x, y, 30, 'gold', 1.5); FX.coins(x, y, 16); }
      if (m >= 24) FX.bigWin(win, b.bet);
      this.hist.unshift(m); this.hist = this.hist.slice(0, 10);
      this.root.querySelector('.pl-hist').innerHTML = this.hist.map(v => `<span class="ch ${v >= 10 ? 'hot' : v >= 1 ? 'ok' : 'low'}">${v}×</span>`).join('');
    },
    draw(now) {
      const g = this.g, W = this.W, H = this.H, s = this.s;
      if (!W) return;
      g.setTransform(this.D, 0, 0, this.D, 0, 0);
      g.clearRect(0, 0, W, H);
      // pegs
      for (let r = 0; r < ROWS; r++) {
        for (let j = 0; j < r + 3; j++) {
          const [x, y] = this.pegXY(r, j);
          const gl = this.pegGlow[r + ':' + j];
          const k = gl ? Math.max(0, 1 - (now - gl) / 350) : 0;
          if (k > 0) {
            g.fillStyle = `rgba(246,201,78,${k * 0.5})`;
            g.beginPath(); g.arc(x, y, this.pegR * (2 + k * 2), 0, Math.PI * 2); g.fill();
          }
          g.fillStyle = k > 0 ? '#fff3c0' : '#e9dcc0';
          g.beginPath(); g.arc(x, y, this.pegR, 0, Math.PI * 2); g.fill();
        }
      }
      // bins
      const table = TABLES[this.risk];
      for (let i = 0; i <= ROWS; i++) {
        const x = this.cx + (i - ROWS / 2) * s, w = s * 0.9;
        const hit = this.binHit[i]; const k = hit ? Math.max(0, 1 - (now - hit) / 400) : 0;
        const y = this.binY + Math.sin(k * Math.PI) * 6;
        g.fillStyle = binColor(i);
        g.globalAlpha = 0.85 + k * 0.15;
        roundRect(g, x - w / 2, y, w, this.binH, 5); g.fill();
        g.globalAlpha = 1;
        if (k > 0) { g.fillStyle = `rgba(255,255,255,${k * 0.5})`; roundRect(g, x - w / 2, y, w, this.binH, 5); g.fill(); }
        g.fillStyle = '#10100c';
        g.font = `700 ${Math.max(9, Math.min(14, s * 0.3))}px "Barlow Semi Condensed", sans-serif`;
        g.textAlign = 'center'; g.textBaseline = 'middle';
        g.fillText(table[i] + (table[i] < 100 ? '×' : ''), x, y + this.binH / 2);
      }
      // balls
      this.balls.forEach(b => {
        const gr = g.createRadialGradient(b.x - this.ballR * 0.3, b.y - this.ballR * 0.3, 1, b.x, b.y, this.ballR);
        gr.addColorStop(0, '#ffffff'); gr.addColorStop(1, b.hue === '#fff3c0' ? '#e0b44a' : '#b77a1a');
        g.shadowColor = 'rgba(246,201,78,.8)'; g.shadowBlur = 10;
        g.fillStyle = gr; g.beginPath(); g.arc(b.x, b.y, this.ballR, 0, Math.PI * 2); g.fill();
        g.shadowBlur = 0;
      });
    },
    rules() { return t('pl.rules', { rows: ROWS }); }
  };
  function roundRect(g, x, y, w, h, r) {
    g.beginPath(); g.moveTo(x + r, y); g.lineTo(x + w - r, y); g.quadraticCurveTo(x + w, y, x + w, y + r);
    g.lineTo(x + w, y + h - r); g.quadraticCurveTo(x + w, y + h, x + w - r, y + h); g.lineTo(x + r, y + h);
    g.quadraticCurveTo(x, y + h, x, y + h - r); g.lineTo(x, y + r); g.quadraticCurveTo(x, y, x + r, y); g.closePath();
  }
  C.register(G);
})();
