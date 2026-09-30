/* Crash: a rocket climbs an exponential curve; cash out before it explodes */
(function () {
  const t = (k, v) => I18N.t(k, v);
  const K = 0.1;                              // m(t) = e^(K t)
  const mAt = s => Math.exp(K * s);
  const tAt = m => Math.log(m) / K;
  const BETS = [10, 20, 50, 100, 200, 500, 1000, 2000, 5000, 10000, 25000];
  const MILESTONES = [2, 3, 5, 10, 20, 50, 100];
  const BOT_NAMES = ['Lucky_Lin', 'Mr.Wong', '阿强', 'HighRoller', '小美', 'Jade88', 'Macau_Mike', '发发发', 'Neon', '金手指', 'Ace_Q', 'Tiger', '龙哥', 'Vega$', 'Mei', 'RocketRay'];

  // P(crash >= x) = 0.97 / x  (3% edge; ~3% of rounds bust instantly at 1.00x)
  function crashPoint() {
    const u = U.random();
    const x = 0.97 / (1 - u);
    return Math.max(1, Math.floor(x * 100) / 100);
  }

  const G = {
    id: 'crash', state: 'idle', history: LS.get('crHist', []),

    init(root) {
      root.innerHTML = `
        <div class="cr-wrap">
          <div class="cr-stage">
            <canvas class="cr-canvas"></canvas>
            <div class="cr-mult">1.00×</div>
            <div class="cr-status"></div>
            <div class="cr-hist"></div>
          </div>
          <div class="cr-panel">
            <div class="bet-step"></div>
            <div class="cr-auto">
              <label class="switch"><input type="checkbox" id="cr-auto-on"><span class="sw"></span><span data-i18n="cr.autoCash">${t('cr.autoCash')}</span></label>
              <div class="auto-val"><button class="step-btn sm a-minus" aria-label="-">&minus;</button><input id="cr-auto-x" type="number" min="1.01" step="0.1" value="${LS.get('crAuto', 2)}" inputmode="decimal"><span>×</span><button class="step-btn sm a-plus" aria-label="+">+</button></div>
            </div>
            <button class="btn btn-gold btn-xl cr-btn"></button>
            <div class="cr-players">
              <div class="side-lab"><span data-i18n="cr.players">${t('cr.players')}</span><span class="cr-pcount"></span></div>
              <ul class="cr-list"></ul>
            </div>
          </div>
        </div>`;
      this.root = root;
      const $ = s => root.querySelector(s);
      this.$ = $;
      this.cv = $('.cr-canvas'); this.g = this.cv.getContext('2d');
      this.multEl = $('.cr-mult'); this.statusEl = $('.cr-status');
      this.btn = $('.cr-btn');
      this.stepper = C.Stepper($('.bet-step'), { values: BETS, key: 'crBet', def: 100 });
      this.stepper.onChange = () => this.sync();
      this.autoOn = $('#cr-auto-on'); this.autoX = $('#cr-auto-x');
      this.autoOn.checked = LS.get('crAutoOn', false);
      this.autoOn.onchange = () => { LS.set('crAutoOn', this.autoOn.checked); Sound.fx.click(); };
      this.autoX.onchange = () => { let v = Math.max(1.01, +this.autoX.value || 2); v = Math.round(v * 100) / 100; this.autoX.value = v; LS.set('crAuto', v); };
      $('.a-minus').onclick = () => { this.autoX.value = Math.max(1.1, Math.round((+this.autoX.value - 0.1) * 10) / 10); this.autoX.onchange(); Sound.fx.tick(); };
      $('.a-plus').onclick = () => { this.autoX.value = Math.round((+this.autoX.value + (+this.autoX.value >= 10 ? 1 : 0.1)) * 10) / 10; this.autoX.onchange(); Sound.fx.tick(); };
      this.btn.onclick = () => this.press();
      this.stars = Array.from({ length: 90 }, () => ({ x: U.random(), y: U.random(), z: U.rand(0.2, 1) }));
      this.trail = [];
      this.renderHist();
      this.resize();
      this.ro = new ResizeObserver(() => this.resize()); this.ro.observe(this.cv.parentElement);
    },
    enter() { this.resize(); this.active = true; this.startLoop(); if (this.state === 'idle') this.countdown(); },
    leave() {
      this.active = false;
      cancelAnimationFrame(this.raf); this.raf = null;
      if (this.snd) { this.snd.stop(); this.snd = null; }
      // an in-flight bet is settled at the crash point in the background, like a real table
      if (this.state === 'fly' && this.myBet && !this.cashed) {
        const crash = this.crash, bet = this.myBet, auto = this.autoTarget;
        this.myBet = 0;
        if (auto && auto <= crash) C.pay(bet * auto, null);
        C.record(auto && auto <= crash ? Math.floor(bet * auto) : 0, bet);
      }
      clearTimeout(this.cdT);
      if (this.state === 'wait' && this.myBet) C.refund(this.myBet);
      this.myBet = 0; this.cashed = false; this.queued = false;
      this.stepper.locked = false;
      this.state = 'idle';
    },
    key(e) { if (e.key === ' ' || e.key === 'Enter') { this.press(); return true; } },
    resize() {
      const p = this.cv.parentElement, DPR = Math.min(2, devicePixelRatio || 1);
      const w = p.clientWidth, h = p.clientHeight;
      if (!w || !h) return;
      this.W = w; this.H = h; this.DPR = DPR;
      this.cv.width = w * DPR; this.cv.height = h * DPR;
      this.cv.style.width = w + 'px'; this.cv.style.height = h + 'px';
    },

    /* ---------- round flow ---------- */
    countdown() {
      if (!this.active) return;
      this.state = 'wait';
      this.cashed = false;
      this.elapsed = 0; this.m = 1;
      this.trail = [];
      this.crash = crashPoint();
      this.bots = U.shuffle(BOT_NAMES.slice()).slice(0, U.randInt(5, 9)).map(n => ({
        n, bet: U.pick([10, 50, 100, 200, 500, 1000, 5000]), at: U.random() < 0.15 ? 0 : Math.round((1.05 + Math.pow(U.random(), 2.2) * 8) * 100) / 100, out: false
      }));
      if (this.queued) { this.queued = false; this.placeBet(); }
      this.cdEnd = performance.now() + 5000;
      this.stage().classList.remove('crashed', 'flying');
      this.multEl.className = 'cr-mult wait';
      this.renderPlayers(); this.sync();
      const tick = () => {
        if (!this.active || this.state !== 'wait') return;
        const left = Math.max(0, this.cdEnd - performance.now());
        this.statusEl.innerHTML = `<span>${t('cr.launchIn')}</span><b>${(left / 1000).toFixed(1)}s</b><i style="width:${left / 50}%"></i>`;
        if (left <= 0) return this.launch();
        if (Math.ceil(left / 1000) !== this.lastSec) { this.lastSec = Math.ceil(left / 1000); if (this.lastSec <= 3) Sound.fx.tick(0.7); }
        this.cdT = setTimeout(tick, 50);
      };
      tick();
    },
    stage() { return this.root.querySelector('.cr-stage'); },
    placeBet() {
      const v = this.stepper.value;
      if (!C.take(v)) return false;
      this.myBet = v; Sound.fx.chip();
      this.autoTarget = this.autoOn.checked ? Math.max(1.01, +this.autoX.value || 2) : 0;
      return true;
    },
    press() {
      Sound.unlock();
      if (this.state === 'wait') {
        if (this.myBet) { C.refund(this.myBet); this.myBet = 0; Sound.fx.chipsSlide(); }
        else this.placeBet();
      } else if (this.state === 'fly') {
        if (this.myBet && !this.cashed) this.cashOut();
        else { this.queued = !this.queued; Sound.fx.click(); }
      }
      this.renderPlayers(); this.sync();
    },
    launch() {
      this.state = 'fly';
      this.statusEl.innerHTML = '';
      this.t0 = performance.now();
      this.nextMs = 0;
      this.stage().classList.add('flying');
      this.multEl.className = 'cr-mult';
      this.autoTarget = this.myBet ? (this.autoOn.checked ? Math.max(1.01, +this.autoX.value || 2) : 0) : 0;
      this.snd = Sound.loop('rocket');
      Sound.fx.whoosh(true, 0.6);
      Sound.fx.thud(0.7);
      this.stepper.locked = true;
      this.sync();
    },
    update(now) {
      if (this.state !== 'fly') return;
      this.elapsed = (now - this.t0) / 1000;
      let m = mAt(this.elapsed);
      if (m >= this.crash) { m = this.crash; this.m = m; return this.boom(); }
      this.m = m;
      if (this.snd) this.snd.set(m);
      this.multEl.textContent = m.toFixed(2) + '×';
      const heat = Math.min(1, Math.log(m) / Math.log(20));
      this.multEl.style.setProperty('--heat', heat);
      if (MILESTONES[this.nextMs] && m >= MILESTONES[this.nextMs]) {
        Sound.fx.milestone(this.nextMs);
        U.pulse(this.multEl, 'punch');
        if (this.rocketPos) { const r = this.cv.getBoundingClientRect(); FX.sparks(r.left + this.rocketPos.x, r.top + this.rocketPos.y, 10 + this.nextMs * 4, 'gold'); }
        this.nextMs++;
      }
      if (this.myBet && !this.cashed && this.autoTarget && m >= this.autoTarget) this.cashOut(this.autoTarget);
      let changed = false;
      this.bots.forEach(b => { if (!b.out && b.at && m >= b.at) { b.out = true; changed = true; } });
      if (changed) this.renderPlayers();
      if (this.myBet && !this.cashed) this.btn.querySelector('.cr-live') && (this.btn.querySelector('.cr-live').textContent = U.fmt(this.myBet * m));
    },
    cashOut(at) {
      const m = at || this.m;
      const win = Math.floor(this.myBet * m);
      this.cashed = { m, win };
      C.pay(win, this.btn);
      C.record(win, this.myBet);
      Sound.fx.cashout();
      const c = U.center(this.btn);
      FX.coins(c.x, c.y, U.clamp(Math.round(m * 6), 8, 40));
      FX.float(c.x, c.y - 40, '+' + U.fmt(win), 'good big');
      if (m >= 10) FX.bigWin(win, this.myBet);
      else if (m >= 3) { FX.confetti(c.x, c.y, 40); Sound.say(t('cr.sayCash', { m: m.toFixed(2) })); }
      this.renderPlayers(); this.sync();
    },
    boom() {
      this.state = 'crashed';
      if (this.snd) { this.snd.stop(); this.snd = null; }
      Sound.fx.explosion();
      FX.shake(12, 500); FX.flash('red'); U.vibrate([80, 40, 120]);
      if (this.rocketPos) {
        const r = this.cv.getBoundingClientRect(), x = r.left + this.rocketPos.x, y = r.top + this.rocketPos.y;
        FX.sparks(x, y, 50, 'red', 2.2); FX.sparks(x, y, 30, 'gold', 1.5); FX.ring(x, y, '#ff6a4a', 160);
      }
      this.stage().classList.remove('flying'); this.stage().classList.add('crashed');
      this.multEl.className = 'cr-mult crashed';
      this.multEl.textContent = this.crash.toFixed(2) + '×';
      this.statusEl.innerHTML = `<b class="bust">${t('cr.crashed', { m: this.crash.toFixed(2) })}</b>`;
      const lost = this.myBet && !this.cashed;
      if (lost) { C.record(0, this.myBet); Sound.say(t('cr.sayBoom')); }
      this.history.unshift(this.crash); this.history = this.history.slice(0, 20); LS.set('crHist', this.history);
      this.renderHist(); this.renderPlayers(true);
      this.boomAt = performance.now();
      setTimeout(() => {
        if (this.state !== 'crashed') return;
        this.myBet = 0; this.cashed = false;
        this.stepper.locked = false;
        if (this.active && this.state === 'crashed') this.countdown();
      }, 3200);
      this.sync();
    },

    /* ---------- UI ---------- */
    sync() {
      const b = this.btn;
      b.className = 'btn btn-xl cr-btn';
      let html;
      if (this.state === 'wait') {
        if (this.myBet) { b.classList.add('btn-ghost'); html = `<span>${t('cr.cancel')}</span><small>${t('cr.betPlaced', { n: U.fmt(this.myBet) })}</small>`; }
        else { b.classList.add('btn-gold'); html = `<span>${t('cr.bet')}</span><small>${U.fmt(this.stepper.value)}</small>`; }
      } else if (this.state === 'fly') {
        if (this.myBet && !this.cashed) { b.classList.add('btn-cash'); html = `<span>${t('cr.cashOut')}</span><small class="cr-live">${U.fmt(this.myBet * this.m)}</small>`; }
        else if (this.cashed) { b.classList.add('btn-done'); html = `<span>${t('cr.cashedAt', { m: this.cashed.m.toFixed(2) })}</span><small>+${U.fmt(this.cashed.win)}</small>`; }
        else { b.classList.add(this.queued ? 'btn-ghost' : 'btn-gold'); html = `<span>${this.queued ? t('cr.cancel') : t('cr.betNext')}</span><small>${this.queued ? t('cr.queued') : U.fmt(this.stepper.value)}</small>`; }
      } else {
        b.classList.add(this.cashed ? 'btn-done' : 'btn-ghost');
        html = this.cashed ? `<span>${t('cr.cashedAt', { m: this.cashed.m.toFixed(2) })}</span><small>+${U.fmt(this.cashed.win)}</small>` : `<span>${t('cr.nextRound')}</span><small>…</small>`;
        b.disabled = true;
      }
      if (this.state !== 'crashed') b.disabled = false;
      b.innerHTML = html;
    },
    renderHist() {
      this.root.querySelector('.cr-hist').innerHTML = this.history.slice(0, 12).map(m =>
        `<span class="ch ${m >= 10 ? 'hot' : m >= 2 ? 'ok' : 'low'}">${m.toFixed(2)}×</span>`).join('');
    },
    renderPlayers(final) {
      const list = this.root.querySelector('.cr-list');
      const rows = [];
      if (this.myBet) {
        const st = this.cashed ? `<b class="ok">${this.cashed.m.toFixed(2)}×</b>` : final ? '<b class="bust">✕</b>' : '<b>…</b>';
        rows.push(`<li class="me"><span>${t('cr.you')}</span><span>${U.fmt(this.myBet)}</span>${st}</li>`);
      }
      (this.bots || []).forEach(b => {
        const st = b.out ? `<b class="ok">${b.at.toFixed(2)}×</b>` : final ? '<b class="bust">✕</b>' : '<b>…</b>';
        rows.push(`<li class="${b.out ? 'out' : ''}"><span>${b.n}</span><span>${U.fmt(b.bet)}</span>${st}</li>`);
      });
      list.innerHTML = rows.join('');
      this.root.querySelector('.cr-pcount').textContent = (this.bots || []).length + (this.myBet ? 1 : 0);
    },

    /* ---------- drawing ---------- */
    startLoop() {
      if (this.raf) return;
      const frame = now => {
        this.update(now);
        this.draw(now);
        this.raf = requestAnimationFrame(frame);
      };
      this.raf = requestAnimationFrame(frame);
    },
    draw(now) {
      const g = this.g, W = this.W, H = this.H, D = this.DPR;
      if (!W) return;
      g.setTransform(D, 0, 0, D, 0, 0);
      g.clearRect(0, 0, W, H);
      const pad = { l: 44, r: 22, t: 20, b: 30 };
      const flying = this.state === 'fly' || this.state === 'crashed';
      const el = flying ? this.elapsed : 0;
      const m = flying ? this.m : 1;
      const maxT = Math.max(8, el * 1.18), maxM = Math.max(2, 1 + (m - 1) * 1.25);
      const X = s => pad.l + (s / maxT) * (W - pad.l - pad.r);
      const Y = v => H - pad.b - ((v - 1) / (maxM - 1)) * (H - pad.t - pad.b);

      // star field drifting with speed
      const speed = this.state === 'fly' ? 0.02 + Math.log(m) * 0.05 : 0.004;
      g.fillStyle = '#f3ead3';
      this.stars.forEach(s => {
        s.x -= speed * s.z * 0.3; s.y += speed * s.z * 0.18;
        if (s.x < 0) s.x += 1; if (s.y > 1) s.y -= 1;
        g.globalAlpha = 0.15 + s.z * 0.5;
        g.fillRect(s.x * W, s.y * H, s.z * 1.8, s.z * 1.8);
      });
      g.globalAlpha = 1;

      // grid + labels
      g.strokeStyle = 'rgba(217,164,65,.12)'; g.lineWidth = 1;
      g.fillStyle = 'rgba(243,234,211,.55)'; g.font = '600 11px "Barlow Semi Condensed", sans-serif';
      const stepM = niceStep(maxM - 1);
      g.textAlign = 'right'; g.textBaseline = 'middle';
      for (let v = 1; v <= maxM + 1e-9; v += stepM) {
        const y = Y(v); g.beginPath(); g.moveTo(pad.l, y); g.lineTo(W - pad.r, y); g.stroke();
        g.fillText(v.toFixed(v < 10 && stepM < 1 ? 1 : 0) + '×', pad.l - 6, y);
      }
      const stepT = niceStep(maxT, 6);
      g.textAlign = 'center'; g.textBaseline = 'top';
      for (let s = 0; s <= maxT + 1e-9; s += stepT) g.fillText(Math.round(s) + 's', X(s), H - pad.b + 8);

      if (!flying) return;
      // curve
      const pts = [];
      const n = 80;
      for (let i = 0; i <= n; i++) { const s = el * i / n; pts.push([X(s), Y(mAt(Math.min(s, tAt(this.crash))))]); }
      const crashed = this.state === 'crashed';
      const grad = g.createLinearGradient(0, H, 0, Y(m));
      grad.addColorStop(0, crashed ? 'rgba(200,40,60,0)' : 'rgba(246,201,78,0)');
      grad.addColorStop(1, crashed ? 'rgba(200,40,60,.35)' : 'rgba(246,201,78,.35)');
      g.beginPath(); g.moveTo(pts[0][0], H - pad.b);
      pts.forEach(p => g.lineTo(p[0], p[1]));
      g.lineTo(pts[n][0], H - pad.b); g.closePath(); g.fillStyle = grad; g.fill();
      g.beginPath(); pts.forEach((p, i) => i ? g.lineTo(p[0], p[1]) : g.moveTo(p[0], p[1]));
      g.strokeStyle = crashed ? '#e8364f' : '#f6c94e'; g.lineWidth = 3.5; g.lineCap = 'round';
      g.shadowColor = crashed ? '#e8364f' : '#f6c94e'; g.shadowBlur = 12; g.stroke(); g.shadowBlur = 0;

      // cash-out marker
      if (this.cashed && this.cashed.m <= m) {
        const x = X(tAt(this.cashed.m)), y = Y(this.cashed.m);
        g.fillStyle = '#35d49a'; g.beginPath(); g.arc(x, y, 6, 0, Math.PI * 2); g.fill();
        g.fillStyle = '#35d49a'; g.font = '700 13px "Barlow Semi Condensed", sans-serif'; g.textAlign = 'center'; g.textBaseline = 'bottom';
        g.fillText(this.cashed.m.toFixed(2) + '×', x, y - 10);
      }

      // rocket
      const [x1, y1] = pts[n], [x0, y0] = pts[n - 2];
      const ang = Math.atan2(y1 - y0, x1 - x0);
      this.rocketPos = { x: x1, y: y1 };
      if (!crashed) {
        this.trail.push({ x: x1, y: y1, a: 1 });
        if (this.trail.length > 26) this.trail.shift();
        drawRocket(g, x1, y1, ang, now);
      } else {
        const k = Math.min(1, (now - (this.boomAt || now)) / 600);
        g.globalAlpha = 1 - k;
        g.fillStyle = '#ffb347';
        g.beginPath(); g.arc(x1, y1, 10 + k * 50, 0, Math.PI * 2); g.fill();
        g.globalAlpha = 1;
      }
      // exhaust trail
      this.trail.forEach((p, i) => {
        const a = i / this.trail.length;
        g.globalAlpha = a * 0.35;
        g.fillStyle = i % 2 ? '#ff9a3c' : '#f6c94e';
        g.beginPath(); g.arc(p.x - Math.cos(ang) * 10, p.y - Math.sin(ang) * 10, 2 + a * 4, 0, Math.PI * 2); g.fill();
      });
      g.globalAlpha = 1;
    },
    rules() { return t('cr.rules'); }
  };

  function niceStep(range, ticks = 5) {
    const raw = range / ticks, p = Math.pow(10, Math.floor(Math.log10(raw))), f = raw / p;
    return (f < 1.5 ? 1 : f < 3.5 ? 2 : f < 7.5 ? 5 : 10) * p;
  }
  function drawRocket(g, x, y, ang, now) {
    g.save(); g.translate(x, y); g.rotate(ang); g.scale(1.6, 1.6);
    const fl = 14 + Math.sin(now / 30) * 4 + Math.random() * 4;
    const fg = g.createLinearGradient(-10 - fl, 0, -8, 0);
    fg.addColorStop(0, 'rgba(255,90,40,0)'); fg.addColorStop(0.5, '#ff9a3c'); fg.addColorStop(1, '#fff3c0');
    g.fillStyle = fg;
    g.beginPath(); g.moveTo(-8, -5); g.quadraticCurveTo(-10 - fl, 0, -8, 5); g.closePath(); g.fill();
    g.fillStyle = '#c8283c';
    g.beginPath(); g.moveTo(-6, -6); g.lineTo(-12, -12); g.lineTo(-2, -6); g.closePath(); g.fill();
    g.beginPath(); g.moveTo(-6, 6); g.lineTo(-12, 12); g.lineTo(-2, 6); g.closePath(); g.fill();
    const bg = g.createLinearGradient(0, -7, 0, 7);
    bg.addColorStop(0, '#fffaf0'); bg.addColorStop(1, '#bfb49c');
    g.fillStyle = bg;
    g.beginPath(); g.moveTo(-9, -6); g.lineTo(8, -6); g.quadraticCurveTo(20, 0, 8, 6); g.lineTo(-9, 6); g.closePath(); g.fill();
    g.fillStyle = '#35d49a'; g.beginPath(); g.arc(4, 0, 3, 0, Math.PI * 2); g.fill();
    g.strokeStyle = '#8a5a17'; g.lineWidth = 1; g.stroke();
    g.restore();
  }
  C.register(G);
})();
