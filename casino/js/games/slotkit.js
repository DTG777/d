/* Shared slot cabinet for the engine-driven machines (Lucky 777, God of Wealth,
   Treasure Bowl). One code path for clicks and agents: the spin button and
   Casino.act(id, { type: 'spin', bet }) both go through perform(), which steps the
   engine once and animates the events it returns. */
(function () {
  const t = (k, v) => I18N.t(k, v);
  const BETS = [10, 20, 50, 100, 200, 500, 1000, 2000, 5000, 10000];

  // a hidden <svg> holding every game's <symbol>s; rebuilt on language change
  const defs = {};
  function buildDefs() {
    let host = document.getElementById('slot-defs-2');
    if (!host) {
      host = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
      host.id = 'slot-defs-2'; host.setAttribute('aria-hidden', 'true');
      host.style.cssText = 'position:absolute;width:0;height:0;overflow:hidden';
      document.body.appendChild(host);
    }
    let out = '<defs>';
    for (const k in defs) out += defs[k].grad || '';
    out += '</defs>';
    for (const k in defs) for (const id in defs[k].art) out += `<symbol id="${k}-${id}" viewBox="0 0 100 100">${defs[k].art[id]()}</symbol>`;
    host.innerHTML = out;
  }
  addEventListener('langchange', buildDefs);
  const use = (set, id) => `<svg viewBox="0 0 100 100"><use href="#${set}-${id}"/></svg>`;

  class SlotView {
    constructor(id, cfg) {
      Object.assign(this, { id, cfg, busy: false, auto: false, slam: false, turbo: LS.get('turbo', false) });
    }
    get L() { return Casino.live(this.id); }
    get T() { return this.turbo || U.reduced; }
    wait(ms) { return U.sleep(this.slam ? Math.min(ms, 60) : this.T ? ms * 0.5 : ms); }

    init(root) {
      const c = this.cfg;
      root.innerHTML = `
        <div class="slot-cab ${c.cab || ''}">
          <div class="marquee" aria-hidden="true"><i></i></div>
          ${c.top ? c.top() : ''}
          <div class="slot-title"><span data-i18n="${c.title}">${t(c.title)}</span></div>
          <div class="slot-fs" hidden><span data-i18n="slots.freeSpins">${t('slots.freeSpins')}</span> <b class="fs-left">0</b><b class="fs-x"></b></div>
          <div class="reels-frame">${c.board()}</div>
          <div class="slot-meter"><span class="sm-label" data-i18n="slots.goodLuck">${t('slots.goodLuck')}</span><b class="sm-val"></b></div>
        </div>
        <div class="slot-controls">
          <div class="bet-step"></div>
          <button class="spin-btn" aria-label="Spin"><span class="spin-ring"></span><span class="spin-txt" data-i18n="slots.spin">${t('slots.spin')}</span></button>
          <div class="slot-toggles">
            ${c.toggles || ''}
            <button class="tog auto-btn">${C.icon('auto')}<span data-i18n="slots.auto">${t('slots.auto')}</span></button>
            <button class="tog turbo-btn">${C.icon('bolt')}<span data-i18n="slots.turbo">${t('slots.turbo')}</span></button>
          </div>
        </div>
        <p class="hint" data-i18n="${c.hint || 'slots.hint'}">${t(c.hint || 'slots.hint')}</p>`;
      const q = s => root.querySelector(s);
      Object.assign(this, {
        root, cab: q('.slot-cab'), frame: q('.reels-frame'), meterLab: q('.sm-label'), meterVal: q('.sm-val'),
        spinBtn: q('.spin-btn'), autoBtn: q('.auto-btn'), turboBtn: q('.turbo-btn'), fsEl: q('.slot-fs')
      });
      this.stepper = C.Stepper(q('.bet-step'), { values: BETS, key: this.id + 'Bet', def: 100 });
      this.stepper.onChange = v => this.onBet && this.onBet(v);
      this.spinBtn.onclick = () => this.onSpin();
      this.autoBtn.onclick = () => { Sound.fx.click(); this.auto = !this.auto; this.syncBtns(); if (this.auto && !this.busy) this.onSpin(); };
      this.turboBtn.onclick = () => { Sound.fx.click(); this.turbo = !this.turbo; LS.set('turbo', this.turbo); this.syncBtns(); };
      this.build();
      this.syncBtns();
      this.measure();
      this.ro = new ResizeObserver(() => this.measure());
      this.ro.observe(this.frame);
    }
    enter() {
      this.L.driver = this;
      this.measure();
      this.syncFree();
      // came back with free spins pending: carry on
      if (this.L.observe().freeSpins > 0 && !this.busy) setTimeout(() => { if (!this.busy && C.current === this.id) this.run(); }, 600);
    }
    leave() {
      if (this.L.driver === this) this.L.driver = null;
      this.auto = false; this.syncBtns();
      this.stopLoops();
    }
    stopLoops() { for (const k of ['whirr', 'antic']) if (this[k]) { this[k].stop(); this[k] = null; } }
    key(e) { if (e.code === 'Space' || e.code === 'Enter') { this.onSpin(); return true; } }
    measure() {}
    syncBtns() {
      this.autoBtn.classList.toggle('on', this.auto);
      this.turboBtn.classList.toggle('on', this.turbo);
      this.spinBtn.classList.toggle('stop', this.busy);
    }
    syncFree() {
      const o = this.L.observe();
      const on = o.freeSpins > 0 || this.inFree;
      this.fsEl.hidden = !on;
      this.fsEl.querySelector('.fs-left').textContent = o.freeSpins || 0;
      this.fsEl.querySelector('.fs-x').textContent = this.freeBadge ? this.freeBadge(o) : '';
      this.cab.classList.toggle('free', on);
      this.stepper.locked = this.busy || o.freeSpins > 0;
    }
    setMeter(key, val, cls = '', vars) {
      this.meterLab.textContent = t(key, vars);
      if (vars) delete this.meterLab.dataset.i18n; else this.meterLab.dataset.i18n = key;
      this.meterVal.textContent = val;
      this.meterVal.className = 'sm-val ' + cls;
    }
    banner(title, sub, cls = '', ms = 2400) {
      return new Promise(res => {
        const b = U.h('div', { class: 'slot-banner ' + cls }, U.h('div', { class: 'sb-t' }, title), sub != null ? U.h('div', { class: 'sb-s' }, sub) : null);
        this.cab.appendChild(b);
        let done = false;
        const close = () => { if (done) return; done = true; b.classList.add('out'); setTimeout(() => { b.remove(); res(); }, 300); };
        b.onclick = close;
        setTimeout(close, this.T ? ms * 0.6 : ms);
      });
    }

    /* the human side: a press spins, a press while spinning slams the reels */
    onSpin() {
      Sound.unlock();
      if (this.busy) { if (!this.slam) { this.slam = true; Sound.fx.click(); } return; }
      this.run();
    }
    // spin, then keep going through free spins and auto play
    async run(first) {
      let r = await this.perform(first);
      while (r.ok && C.current === this.id) {
        if (r.obs.freeSpins > 0) { await U.sleep(this.T ? 300 : 700); r = await this.perform({ type: 'spin' }); continue; }
        if (!this.auto) break;
        await U.sleep(this.T ? 250 : 650);
        if (!this.auto || this.busy || C.current !== this.id) break;
        r = await this.perform();
      }
      if (!r.ok) { this.auto = false; this.syncBtns(); }
    }

    /* the driver: one engine step, animated. Agents reach this through Casino.act */
    async perform(action) {
      if (this.busy) return { ok: false, error: 'the reels are still spinning; try again in a moment' };
      Sound.unlock();
      const L = this.L, obs = L.observe();
      if (!action) action = obs.freeSpins > 0 ? { type: 'spin' } : { type: 'spin', bet: this.stepper.value };
      const cost = obs.freeSpins > 0 ? 0 : (action.bet || 0) * (action.type === 'buy' ? this.cfg.buyMult || 1 : 1);
      if (cost > C.S.balance) { C.noFunds(); return { ok: false, error: 'not enough chips for that bet' }; }
      this.busy = true; this.slam = false; this.syncBtns(); this.syncFree();
      this.clearWins();
      const r = L.step(action);
      if (!r.ok) { this.busy = false; this.syncBtns(); this.syncFree(); Sound.fx.error(); C.toast(r.error, 'bad'); return r; }
      try { await this.animate(r.screen, action); } catch (e) { console.error(e); }
      this.stopLoops();
      L.collect(this.meterVal); // anything the animation did not already pay out
      this.busy = false; this.syncBtns();
      const o = L.observe();
      if (!(o.freeSpins > 0)) this.inFree = false;
      this.syncFree();
      return { ok: true, events: r.screen, obs: o };
    }
    clearWins() {}

    /* shared win show: sound, particles, big-win overlay, meter count, coins fly home */
    async showWin(win, bet, label = 'slots.win', from = 0, collect = true) {
      const mult = win / Math.max(1, bet);
      const level = mult >= 5 ? 2 : mult >= 2 ? 1 : 0;
      Sound.fx.win(level);
      const rc = U.center(this.frame);
      FX.sparks(rc.x, rc.y, 12 + level * 10, 'gold');
      if (mult >= 3) FX.coins(rc.x, rc.y, 10 + level * 12);
      if (mult >= 10) await FX.bigWin(win, bet);
      this.setMeter(label, U.fmt(from), 'good');
      await FX.countUp(this.meterVal, from, win, U.clamp(400 + mult * 60, 400, this.T ? 700 : 1600));
      U.pulse(this.meterVal, 'punch');
      if (collect) this.L.collect(this.meterVal);
    }
    // run one reel: seq = cell HTML top to bottom, the first `rows` are the final window
    runReel(reel, strip, seq, rows, durMs, tease) {
      const H = this.cell;
      const D = (seq.length - rows) * H, over = H * 0.14;
      const windup = this.T ? 50 : 110;
      const T2 = tease ? 1000 : (this.T ? 200 : 380);
      const T1 = Math.max(60, durMs - T2);
      const v = (D + over) / (T1 + T2 / 2);
      const back = 170;
      let y = -D, lastIdx = null, slamFrom = null, slamT = 0;
      strip.innerHTML = seq.join('');
      strip.style.transform = `translateY(${-D}px)`;
      reel.classList.add('spinning');
      return new Promise(res => {
        const t0 = performance.now();
        const frame = now => {
          const tt0 = now - t0;
          let done = false;
          if (this.slam && slamFrom === null && tt0 > 30) { slamFrom = y; slamT = now; reel.classList.remove('blur'); }
          if (slamFrom !== null) {
            const k = Math.min(1, (now - slamT) / 150);
            y = slamFrom * (1 - U.ease.outCubic(k));
            if (k >= 1) done = true;
          } else if (tt0 < windup) {
            y = -D - H * 0.22 * Math.sin(Math.PI * tt0 / windup);
          } else {
            const tt = tt0 - windup;
            if (tt < T1) { y = -D + v * tt; reel.classList.add('blur'); }
            else if (tt < T1 + T2) {
              reel.classList.remove('blur');
              const k = (tt - T1) / T2;
              y = -D + v * T1 + v * T2 * (k - k * k / 2);
              const idx = Math.floor(y / H);
              if (idx !== lastIdx) { if (lastIdx !== null) Sound.fx.tick(tease ? 0.8 + k * 0.5 : 1); lastIdx = idx; }
            } else if (tt < T1 + T2 + back) {
              const k = (tt - T1 - T2) / back;
              y = over * (1 - U.ease.outBack(k, 2));
            } else done = true;
          }
          if (done) y = 0;
          strip.style.transform = `translateY(${y}px)`;
          if (!done) requestAnimationFrame(frame);
          else {
            reel.classList.remove('spinning', 'blur');
            strip.innerHTML = seq.slice(0, rows).join('');
            strip.style.transform = 'translateY(0)';
            res();
          }
        };
        requestAnimationFrame(frame);
      });
    }
    rules() { return this.cfg.rules(); }
  }

  window.SlotKit = { SlotView, BETS, defs, buildDefs, use };
})();
