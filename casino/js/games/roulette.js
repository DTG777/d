/* European roulette: canvas wheel, ball physics that lands on the drawn number */
(function () {
  const t = (k, v) => I18N.t(k, v);
  const ORDER = [0, 32, 15, 19, 4, 21, 2, 25, 17, 34, 6, 27, 13, 36, 11, 30, 8, 23, 10, 5, 24, 16, 33, 1, 20, 14, 31, 9, 22, 18, 29, 7, 28, 12, 35, 3, 26];
  const RED = new Set([1, 3, 5, 7, 9, 12, 14, 16, 18, 19, 21, 23, 25, 27, 30, 32, 34, 36]);
  const TAU = Math.PI * 2, STEP = TAU / 37;
  const colorOf = n => n === 0 ? 'green' : RED.has(n) ? 'red' : 'black';
  const FILL = { green: '#0e8a5c', red: '#b8132c', black: '#16110f' };
  const mod = (a, m) => ((a % m) + m) % m;

  function payout(key, amt, n) {
    if (key[0] === 'n') return +key.slice(1) === n ? amt * 36 : 0;
    if (n === 0) return 0;
    const m = {
      col1: n % 3 === 1, col2: n % 3 === 2, col3: n % 3 === 0,
      doz1: n <= 12, doz2: n > 12 && n <= 24, doz3: n > 24,
      low: n <= 18, high: n >= 19, even: n % 2 === 0, odd: n % 2 === 1,
      red: RED.has(n), black: !RED.has(n)
    };
    if (!m[key]) return 0;
    return key.startsWith('col') || key.startsWith('doz') ? amt * 3 : amt * 2;
  }

  // board cells: h = [row, col, rowspan, colspan] horizontal; v = vertical (phones)
  function cells() {
    const list = [{ key: 'n0', label: '0', cls: 'green', h: [1, 1, 3, 1], v: [1, 1, 1, 3] }];
    for (let n = 1; n <= 36; n++) {
      const r = 3 - ((n - 1) % 3), c = 2 + Math.floor((n - 1) / 3);
      list.push({ key: 'n' + n, label: String(n), cls: colorOf(n), h: [r, c, 1, 1], v: [2 + Math.floor((n - 1) / 3), 1 + ((n - 1) % 3), 1, 1] });
    }
    [3, 2, 1].forEach((cn, i) => list.push({ key: 'col' + cn, label: '2:1', cls: 'out', h: [1 + i, 14, 1, 1], v: [14, cn, 1, 1] }));
    [1, 2, 3].forEach(d => list.push({ key: 'doz' + d, i18n: 'rl.doz' + d, short: `${(d - 1) * 12 + 1}–${d * 12}`, cls: 'out', h: [4, 2 + (d - 1) * 4, 1, 4], v: [2 + (d - 1) * 4, 4, 4, 1] }));
    const even = [['low', 'rl.low'], ['even', 'rl.even'], ['red', null], ['black', null], ['odd', 'rl.odd'], ['high', 'rl.high']];
    even.forEach(([k, i18n], i) => list.push({ key: k, i18n, cls: 'out ' + (k === 'red' || k === 'black' ? 'sw-' + k : ''), h: [5, 2 + i * 2, 1, 2], v: [2 + i * 2, 5, 2, 1] }));
    return list;
  }

  const G = {
    id: 'roulette', state: 'bet', history: LS.get('rlHist', []),

    init(root) {
      root.innerHTML = `
        <div class="rl-top">
          <div class="wheel-wrap"><canvas class="wheel" aria-label="Roulette wheel"></canvas><div class="rl-result" hidden></div></div>
          <div class="rl-side">
            <div class="side-block"><div class="side-lab" data-i18n="ui.history">${t('ui.history')}</div><div class="rl-hist"></div></div>
            <div class="side-block"><div class="side-lab" data-i18n="ui.totalBet">${t('ui.totalBet')}</div><div class="side-val rl-total">0</div></div>
            <div class="side-block rl-split"></div>
          </div>
        </div>
        <div class="felt rl-board-wrap"><div class="rl-board"></div></div>
        <div class="table-controls">
          <div class="chips-row"></div>
          <div class="btn-row">
            <button class="btn btn-ghost b-undo">${C.icon('undo')}<span data-i18n="ui.undo">${t('ui.undo')}</span></button>
            <button class="btn btn-ghost b-clear">${C.icon('clear')}<span data-i18n="ui.clear">${t('ui.clear')}</span></button>
            <button class="btn btn-ghost b-rebet">${C.icon('repeat')}<span data-i18n="ui.rebet">${t('ui.rebet')}</span></button>
            <button class="btn btn-ghost b-x2">${C.icon('double')}<span>×2</span></button>
            <button class="btn btn-gold btn-lg b-spin"><span data-i18n="rl.spin">${t('rl.spin')}</span></button>
          </div>
        </div>`;
      this.root = root;
      const $ = s => root.querySelector(s);
      this.canvas = $('.wheel'); this.g = this.canvas.getContext('2d');
      this.resEl = $('.rl-result');
      this.board = $('.rl-board');
      this.cells = cells();
      this.cells.forEach(c => {
        const el = U.h('button', { class: 'rl-cell ' + c.cls, 'data-bet': c.key, 'aria-label': c.label || t(c.i18n) });
        if (c.key === 'red' || c.key === 'black') el.appendChild(U.h('i', { class: 'diamond-sw' }));
        else el.appendChild(U.h('span', c.i18n ? { 'data-i18n': c.i18n, class: c.short ? 'full' : null } : null, c.label || t(c.i18n)));
        if (c.short) el.appendChild(U.h('span', { class: 'short' }, c.short));
        c.el = el; this.board.appendChild(el);
      });
      this.chips = C.ChipBar($('.chips-row'));
      this.bb = new C.BetBoard({ root: this.board, chips: this.chips, canBet: () => this.state === 'bet', onChange: () => this.sync() });
      $('.b-undo').onclick = () => this.bb.undo();
      $('.b-clear').onclick = () => this.bb.clear();
      $('.b-rebet').onclick = () => this.bb.rebet();
      $('.b-x2').onclick = () => this.bb.double();
      $('.b-spin').onclick = () => this.spin();
      this.w = 0; this.rel = null; this.ballR = 0;
      this.layout();
      this.ro = new ResizeObserver(() => this.layout());
      this.ro.observe(root);
      this.renderHist();
      this.sync();
    },
    enter() { this.layout(); this.startLoop(); },
    leave() { this.stopLoop(); if (this.rollSnd) { this.rollSnd.stop(); this.rollSnd = null; } },
    key(e) { if (e.key === ' ' || e.key === 'Enter') { this.spin(); return true; } if (e.key === 'Backspace' || (e.key === 'z' && (e.ctrlKey || e.metaKey))) { this.bb.undo(); return true; } },

    layout() {
      const vertical = this.root.clientWidth < 640;
      this.board.classList.toggle('vertical', vertical);
      this.cells.forEach(c => {
        const [r, col, rs, cs] = vertical ? c.v : c.h;
        c.el.style.gridArea = `${r} / ${col} / span ${rs} / span ${cs}`;
      });
      const wrap = this.canvas.parentElement;
      const size = Math.round(wrap.clientWidth);
      if (size && size !== this.size) { this.size = size; this.prerender(); this.draw(); }
    },
    sync() {
      const tot = this.bb.total();
      this.root.querySelector('.rl-total').textContent = U.fmt(tot);
      const $ = s => this.root.querySelector(s);
      const bet = this.state === 'bet';
      $('.b-spin').disabled = !bet || !tot;
      $('.b-undo').disabled = !bet || !this.bb.hist.length;
      $('.b-clear').disabled = !bet || !tot;
      $('.b-rebet').disabled = !bet || !this.bb.last;
      $('.b-x2').disabled = !bet || !tot;
      this.board.classList.toggle('locked', !bet);
    },

    /* ---------- wheel drawing ---------- */
    prerender() {
      const DPR = Math.min(2, devicePixelRatio || 1), S = this.size, px = Math.round(S * DPR);
      this.canvas.width = this.canvas.height = px;
      this.canvas.style.width = this.canvas.style.height = S + 'px';
      this.DPR = DPR;
      const R = px / 2;
      // static bowl
      const bowl = document.createElement('canvas'); bowl.width = bowl.height = px;
      let g = bowl.getContext('2d');
      g.translate(R, R);
      let grd = g.createRadialGradient(0, 0, R * 0.8, 0, 0, R);
      grd.addColorStop(0, '#2a1409'); grd.addColorStop(0.5, '#7a4219'); grd.addColorStop(0.8, '#4a230c'); grd.addColorStop(1, '#1e0d04');
      g.fillStyle = grd; g.beginPath(); g.arc(0, 0, R, 0, TAU); g.fill();
      grd = g.createRadialGradient(0, -R * 0.3, R * 0.2, 0, 0, R * 0.94);
      grd.addColorStop(0, '#4a4440'); grd.addColorStop(0.7, '#221e1b'); grd.addColorStop(1, '#0f0c0a');
      g.fillStyle = grd; g.beginPath(); g.arc(0, 0, R * 0.94, 0, TAU); g.fill();
      g.strokeStyle = '#d9a441'; g.lineWidth = R * 0.012;
      g.beginPath(); g.arc(0, 0, R * 0.94, 0, TAU); g.stroke();
      g.beginPath(); g.arc(0, 0, R * 0.805, 0, TAU); g.stroke();
      for (let i = 0; i < 8; i++) { // deflector diamonds
        const a = i * TAU / 8 + STEP / 2;
        g.save(); g.rotate(a); g.translate(0, -R * 0.875);
        g.fillStyle = '#e8c06a'; g.beginPath(); g.moveTo(0, -R * 0.03); g.lineTo(R * 0.012, 0); g.lineTo(0, R * 0.03); g.lineTo(-R * 0.012, 0); g.closePath(); g.fill();
        g.restore();
      }
      this.bowl = bowl;
      // rotor
      const rot = document.createElement('canvas'); rot.width = rot.height = px;
      g = rot.getContext('2d'); g.translate(R, R);
      ORDER.forEach((n, i) => {
        const a0 = i * STEP - STEP / 2 - Math.PI / 2, a1 = a0 + STEP;
        g.fillStyle = FILL[colorOf(n)];
        g.beginPath(); g.arc(0, 0, R * 0.8, a0, a1); g.arc(0, 0, R * 0.655, a1, a0, true); g.closePath(); g.fill();
        g.fillStyle = shade(FILL[colorOf(n)]);
        g.beginPath(); g.arc(0, 0, R * 0.655, a0, a1); g.arc(0, 0, R * 0.52, a1, a0, true); g.closePath(); g.fill();
        g.save(); g.rotate(i * STEP);
        g.fillStyle = '#f3ead3'; g.font = `700 ${R * 0.068}px "Barlow Semi Condensed", sans-serif`;
        g.textAlign = 'center'; g.textBaseline = 'middle';
        g.fillText(String(n), 0, -R * 0.728);
        g.restore();
        // frets
        g.save(); g.rotate(i * STEP - STEP / 2);
        g.strokeStyle = '#d9a441'; g.lineWidth = R * 0.008;
        g.beginPath(); g.moveTo(0, -R * 0.8); g.lineTo(0, -R * 0.52); g.stroke();
        g.restore();
      });
      g.strokeStyle = '#d9a441'; g.lineWidth = R * 0.01;
      g.beginPath(); g.arc(0, 0, R * 0.655, 0, TAU); g.stroke();
      g.beginPath(); g.arc(0, 0, R * 0.52, 0, TAU); g.stroke();
      grd = g.createRadialGradient(-R * 0.1, -R * 0.15, R * 0.05, 0, 0, R * 0.52);
      grd.addColorStop(0, '#9a5a26'); grd.addColorStop(0.6, '#5b2f10'); grd.addColorStop(1, '#2a1406');
      g.fillStyle = grd; g.beginPath(); g.arc(0, 0, R * 0.515, 0, TAU); g.fill();
      // turret
      g.strokeStyle = '#e8c06a'; g.lineCap = 'round';
      for (let i = 0; i < 4; i++) {
        g.save(); g.rotate(i * Math.PI / 2); g.lineWidth = R * 0.03;
        g.beginPath(); g.moveTo(0, 0); g.lineTo(0, -R * 0.3); g.stroke();
        const kg = g.createRadialGradient(-R * 0.01, -R * 0.31, 0, 0, -R * 0.3, R * 0.045);
        kg.addColorStop(0, '#fff3c0'); kg.addColorStop(1, '#a8741c');
        g.fillStyle = kg; g.beginPath(); g.arc(0, -R * 0.3, R * 0.045, 0, TAU); g.fill();
        g.restore();
      }
      const cg = g.createRadialGradient(-R * 0.02, -R * 0.03, 0, 0, 0, R * 0.09);
      cg.addColorStop(0, '#fff3c0'); cg.addColorStop(1, '#8a5a17');
      g.fillStyle = cg; g.beginPath(); g.arc(0, 0, R * 0.09, 0, TAU); g.fill();
      this.rotor = rot;
      function shade(hex) {
        const n = parseInt(hex.slice(1), 16);
        const f = v => Math.round(v * 0.62);
        return `rgb(${f(n >> 16)},${f((n >> 8) & 255)},${f(n & 255)})`;
      }
    },
    draw() {
      if (!this.rotor) return;
      const g = this.g, px = this.canvas.width, R = px / 2;
      g.setTransform(1, 0, 0, 1, 0, 0);
      g.clearRect(0, 0, px, px);
      g.drawImage(this.bowl, 0, 0);
      g.save(); g.translate(R, R); g.rotate(this.w); g.drawImage(this.rotor, -R, -R);
      if (this.hlIdx != null) {
        const a0 = this.hlIdx * STEP - STEP / 2 - Math.PI / 2;
        g.globalCompositeOperation = 'lighter';
        g.fillStyle = `rgba(255,220,120,${0.25 + 0.2 * Math.sin(performance.now() / 150)})`;
        g.beginPath(); g.arc(0, 0, R * 0.8, a0, a0 + STEP); g.arc(0, 0, R * 0.52, a0 + STEP, a0, true); g.closePath(); g.fill();
        g.globalCompositeOperation = 'source-over';
      }
      g.restore();
      if (this.rel != null) {
        const a = this.w + this.rel - Math.PI / 2, r = this.ballR * R;
        const x = R + Math.cos(a) * r, y = R + Math.sin(a) * r, br = R * 0.034;
        g.fillStyle = 'rgba(0,0,0,.45)'; g.beginPath(); g.arc(x + br * 0.3, y + br * 0.5, br, 0, TAU); g.fill();
        const bg = g.createRadialGradient(x - br * 0.35, y - br * 0.35, br * 0.1, x, y, br);
        bg.addColorStop(0, '#ffffff'); bg.addColorStop(0.6, '#e8e2d6'); bg.addColorStop(1, '#9a948a');
        g.fillStyle = bg; g.beginPath(); g.arc(x, y, br, 0, TAU); g.fill();
      }
    },
    startLoop() {
      if (this.raf) return;
      let last = performance.now();
      const tick = now => {
        const dt = (now - last) / 1000; last = now;
        if (!this.spinning) this.w += dt * 0.25;
        this.draw();
        this.raf = requestAnimationFrame(tick);
      };
      this.raf = requestAnimationFrame(tick);
    },
    stopLoop() { cancelAnimationFrame(this.raf); this.raf = null; },

    /* ---------- spin ---------- */
    async spin() {
      Sound.unlock();
      if (this.state !== 'bet') return;
      if (!this.bb.total()) { Sound.fx.error(); C.toast(t('ui.placeBetFirst')); return; }
      this.state = 'spin'; this.sync();
      this.resEl.hidden = true; this.hlIdx = null;
      U.$$('.lit', this.board).forEach(c => c.classList.remove('lit'));
      const n = ORDER[Math.floor(U.random() * 37)];
      const idx = ORDER.indexOf(n);
      Sound.say(t('rl.sayNoMore'));
      Sound.fx.whoosh(true, 0.5);

      const T = U.reduced ? 3000 : 7600, pLock = 0.86;
      const w0 = this.w, W = TAU * 1.25;
      const rel0 = mod(U.rand(0, TAU) - w0, TAU);
      const target = idx * STEP;
      const N = 9;
      const relEnd = rel0 - TAU * N - mod(rel0 - target, TAU);
      const TRACK = 0.873, POCKET = 0.59;
      this.spinning = true;
      this.rollSnd = Sound.loop('roll');
      let lastPocket = null, dropped = false, lastBounce = 0;
      await new Promise(res => {
        const t0 = performance.now();
        const step = now => {
          const p = Math.min(1, (now - t0) / T);
          this.w = w0 + W * U.ease.outCubic(p) + 0.25 * (now - t0) / 1000;
          const q = Math.min(1, p / pLock);
          let rel = rel0 + (relEnd - rel0) * U.ease.outCubic(q);
          let r = TRACK;
          if (p > 0.5) {
            const d = Math.min(1, (p - 0.5) / (pLock - 0.5));
            const bounce = Math.abs(Math.sin(d * Math.PI * 3.5)) * Math.pow(1 - d, 2) * 0.18;
            r = POCKET + (TRACK - POCKET) * Math.pow(1 - d, 1.6) + bounce;
            rel += Math.sin(d * Math.PI * 5) * Math.pow(1 - d, 2) * 0.35;
            if (!dropped) { dropped = true; if (this.rollSnd) { this.rollSnd.stop(0.3); this.rollSnd = null; } Sound.fx.ballClack(1); }
            const b = Math.floor(d * 3.5);
            if (b !== lastBounce && d < 0.95) { lastBounce = b; Sound.fx.ballClack(0.9 - d * 0.5); }
          } else if (this.rollSnd) {
            this.rollSnd.set(1400 + (1 - p) * 1400, 0.03 + 0.06 * (1 - p * 1.6));
          }
          this.rel = rel; this.ballR = r;
          if (r < 0.67) {
            const pk = Math.floor(mod(rel + STEP / 2, TAU) / STEP);
            if (pk !== lastPocket) { if (lastPocket !== null && q < 1) Sound.fx.ballClack(0.35 + 0.65 * (1 - q)); lastPocket = pk; }
          }
          if (p < 1) requestAnimationFrame(step); else res();
        };
        requestAnimationFrame(step);
        if (!this.raf) this.startLoop();
      });
      this.rel = relEnd; this.ballR = POCKET;
      this.spinning = false;
      if (this.rollSnd) { this.rollSnd.stop(); this.rollSnd = null; }
      Sound.fx.thud(1.4);
      this.hlIdx = idx;
      await this.showResult(n);
    },
    async showResult(n) {
      const col = colorOf(n);
      this.resEl.hidden = false;
      this.resEl.className = 'rl-result show ' + col;
      this.resEl.innerHTML = `<b>${n}</b><small>${t('rl.' + col)}</small>`;
      Sound.say(`${n} ${t('rl.' + col)}`);
      this.history.unshift(n); this.history = this.history.slice(0, 40); LS.set('rlHist', this.history);
      this.renderHist();
      // light every board cell that wins on this number
      this.cells.forEach(c => { if (payout(c.key, 1, n) > 0) c.el.classList.add('lit'); });
      await U.sleep(700);
      const { ret, bet } = await this.bb.settle((k, a) => payout(k, a, n));
      if (ret > 0) {
        const net = ret - bet;
        if (net > 0) {
          Sound.fx.win(net > bet * 5 ? 2 : net > bet ? 1 : 0);
          C.toast(t('ui.youWin', { n: U.fmt(net) }), 'good');
        }
        if (ret >= bet * 10) await FX.bigWin(ret, bet);
        else { const c = U.center(this.canvas); FX.sparks(c.x, c.y, 20, 'gold'); }
      } else Sound.fx.lose();
      await U.sleep(1400);
      this.bb.reset();
      this.state = 'bet'; this.sync();
    },
    renderHist() {
      const h = this.root.querySelector('.rl-hist');
      h.innerHTML = this.history.slice(0, 14).map((n, i) => `<span class="hb ${colorOf(n)}${i === 0 ? ' new' : ''}">${n}</span>`).join('');
      const last = this.history.slice(0, 40);
      const rc = last.filter(n => RED.has(n)).length, zc = last.filter(n => n === 0).length, bc = last.length - rc - zc;
      const pct = x => last.length ? Math.round(x / last.length * 100) : 0;
      this.root.querySelector('.rl-split').innerHTML = last.length ? `
        <div class="side-lab">${t('rl.last', { n: last.length })}</div>
        <div class="split-bar"><i class="red" style="flex:${rc || 0.0001}"></i><i class="green" style="flex:${zc || 0.0001}"></i><i class="black" style="flex:${bc || 0.0001}"></i></div>
        <div class="split-lab"><span>${t('rl.red')} ${pct(rc)}%</span><span>${t('rl.black')} ${pct(bc)}%</span></div>` : '';
    },
    rules() { return t('rl.rules'); }
  };
  C.register(G);
})();
