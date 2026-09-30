/* Fortune Sevens slot machine */
(function () {
  const M = SlotMath, S = M.SYM;
  const BETS = [10, 20, 50, 100, 200, 500, 1000, 2000, 5000, 10000];

  const ART = {
    0: () => `
      <path d="M52 16 C47 34 38 46 33 60" stroke="#2f6b25" stroke-width="4.5" fill="none" stroke-linecap="round"/>
      <path d="M52 16 C57 33 64 44 67 57" stroke="#2f6b25" stroke-width="4.5" fill="none" stroke-linecap="round"/>
      <path d="M52 16 c9-9 25-9 31 0 c-10 7-23 7-31 0z" fill="url(#gLeaf)"/>
      <circle cx="33" cy="68" r="17" fill="url(#gCherry)"/><circle cx="68" cy="66" r="17" fill="url(#gCherry)"/>
      <ellipse cx="27" cy="62" rx="5" ry="3.5" fill="#fff" opacity=".7"/><ellipse cx="62" cy="60" rx="5" ry="3.5" fill="#fff" opacity=".7"/>`,
    1: () => `
      <path d="M12 52 C16 26 84 26 88 52 C84 78 16 78 12 52z" fill="url(#gLemon)" stroke="#a37a00" stroke-width="2"/>
      <path d="M8 52 l7-4 v8z M92 52 l-7-4 v8z" fill="#d6a400"/>
      <path d="M26 42 C36 34 56 33 66 38" stroke="#fff8c4" stroke-width="4" fill="none" stroke-linecap="round" opacity=".8"/>`,
    2: () => `
      <path d="M50 12 c-4 0-6 3-6 6 c-15 4-21 17-21 31 v13 l-9 11 h72 l-9-11 v-13 c0-14-6-27-21-31 c0-3-2-6-6-6z" fill="url(#gGold)" stroke="#6b4400" stroke-width="2.5"/>
      <circle cx="50" cy="80" r="8" fill="url(#gGold)" stroke="#6b4400" stroke-width="2.5"/>
      <path d="M33 44 c2-9 7-14 14-16" stroke="#fff5c6" stroke-width="4" fill="none" stroke-linecap="round" opacity=".85"/>
      <path d="M14 73 h72" stroke="#6b4400" stroke-width="2.5"/>`,
    3: () => `
      <rect x="8" y="30" width="84" height="40" rx="8" fill="#141414" stroke="url(#gGold)" stroke-width="5"/>
      <text x="50" y="61" text-anchor="middle" font-family="Limelight, Georgia, serif" font-size="29" fill="url(#gGold)" letter-spacing="1">BAR</text>`,
    4: () => `
      <path d="M26 22 h48 l18 20 l-42 44 l-42-44z" fill="url(#gGem)" stroke="#bff6ff" stroke-width="2"/>
      <path d="M8 42 h84 M26 22 l10 20 l14-20 l14 20 l10-20 M36 42 l14 44 l14-44" stroke="#e6fdff" stroke-width="1.6" fill="none" opacity=".75"/>
      <path d="M30 28 l6 10" stroke="#fff" stroke-width="3" stroke-linecap="round"/>`,
    5: () => `
      <text x="50" y="84" text-anchor="middle" font-family="Limelight, Georgia, serif" font-size="92" fill="url(#gRed)" stroke="url(#gGold)" stroke-width="4" paint-order="stroke">7</text>`,
    6: () => `
      <circle cx="50" cy="50" r="42" fill="url(#gGold)" stroke="#6b4400" stroke-width="3"/>
      <circle cx="50" cy="50" r="33" fill="none" stroke="#fff3b0" stroke-width="2" stroke-dasharray="3 4"/>
      <text x="50" y="${I18N.lang === 'zh' ? 61 : 58}" text-anchor="middle" font-family="${I18N.lang === 'zh' ? '\'ZCOOL QingKe HuangYou\', sans-serif' : 'Limelight, Georgia, serif'}" font-size="${I18N.lang === 'zh' ? 30 : 22}" fill="#6b1010">${I18N.t('slots.wild')}</text>`,
    7: () => `
      <rect x="20" y="10" width="60" height="80" rx="7" fill="url(#gRed)" stroke="#f6c94e" stroke-width="3"/>
      <path d="M20 17 L50 44 L80 17" fill="#a3121f" stroke="#f6c94e" stroke-width="3" stroke-linejoin="round"/>
      <circle cx="50" cy="60" r="16" fill="url(#gGold)" stroke="#7a4b0c" stroke-width="2"/>
      <text x="50" y="68" text-anchor="middle" font-family="'ZCOOL QingKe HuangYou', 'Noto Sans SC', sans-serif" font-size="22" fill="#a3121f">福</text>`
  };
  const DEFS = `
    <linearGradient id="gGold" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff2b0"/><stop offset=".45" stop-color="#f3c14a"/><stop offset="1" stop-color="#a86e14"/></linearGradient>
    <linearGradient id="gRed" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ff6b6b"/><stop offset=".5" stop-color="#d81f36"/><stop offset="1" stop-color="#7d0616"/></linearGradient>
    <radialGradient id="gCherry" cx=".35" cy=".35" r=".7"><stop offset="0" stop-color="#ff7a86"/><stop offset=".6" stop-color="#d1142e"/><stop offset="1" stop-color="#6d0414"/></radialGradient>
    <linearGradient id="gLeaf" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#8fe36a"/><stop offset="1" stop-color="#2f7d22"/></linearGradient>
    <radialGradient id="gLemon" cx=".4" cy=".35" r=".75"><stop offset="0" stop-color="#fff7a0"/><stop offset=".6" stop-color="#ffd21f"/><stop offset="1" stop-color="#c79200"/></radialGradient>
    <linearGradient id="gGem" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#c8fbff"/><stop offset=".5" stop-color="#34c6e8"/><stop offset="1" stop-color="#0b5f93"/></linearGradient>`;

  function buildDefs() {
    let host = document.getElementById('slot-defs');
    if (!host) {
      host = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
      host.id = 'slot-defs'; host.setAttribute('aria-hidden', 'true');
      host.style.cssText = 'position:absolute;width:0;height:0;overflow:hidden';
      document.body.appendChild(host);
    }
    host.innerHTML = `<defs>${DEFS}</defs>` +
      Object.keys(ART).map(k => `<symbol id="sym-${k}" viewBox="0 0 100 100">${ART[k]()}</symbol>`).join('');
  }
  buildDefs();
  addEventListener('langchange', buildDefs);
  const cellHTML = s => `<div class="cell s${s}"><svg viewBox="0 0 100 100"><use href="#sym-${s}"/></svg></div>`;

  const G = {
    id: 'slots',
    busy: false, auto: false, turbo: LS.get('turbo', false), fs: 0, fsTotal: 0, fsBet: 0,

    init(root) {
      this.strips = M.buildStrips(U.random);
      root.innerHTML = `
        <div class="slot-cab">
          <div class="marquee" aria-hidden="true"><i></i></div>
          <div class="slot-title"><span data-i18n="slots.title">${I18N.t('slots.title')}</span></div>
          <div class="slot-fs" hidden><span data-i18n="slots.freeSpins">${I18N.t('slots.freeSpins')}</span> <b class="fs-left">0</b> · <b>×${M.FREE_MULT}</b></div>
          <div class="reels-frame">
            <div class="reels"></div>
            <svg class="paylines" preserveAspectRatio="none"></svg>
          </div>
          <div class="slot-meter"><span class="sm-label" data-i18n="slots.goodLuck">${I18N.t('slots.goodLuck')}</span><b class="sm-val"></b></div>
        </div>
        <div class="slot-controls">
          <div class="bet-step"></div>
          <button class="spin-btn" aria-label="Spin"><span class="spin-ring"></span><span class="spin-txt" data-i18n="slots.spin">${I18N.t('slots.spin')}</span></button>
          <div class="slot-toggles">
            <button class="tog auto-btn">${C.icon('auto')}<span data-i18n="slots.auto">${I18N.t('slots.auto')}</span></button>
            <button class="tog turbo-btn">${C.icon('bolt')}<span data-i18n="slots.turbo">${I18N.t('slots.turbo')}</span></button>
          </div>
        </div>
        <p class="hint" data-i18n="slots.hint">${I18N.t('slots.hint')}</p>`;
      this.root = root;
      this.reelsEl = root.querySelector('.reels');
      this.lines = root.querySelector('.paylines');
      this.meterLab = root.querySelector('.sm-label');
      this.meterVal = root.querySelector('.sm-val');
      this.cab = root.querySelector('.slot-cab');
      this.stepper = C.Stepper(root.querySelector('.bet-step'), { values: BETS, key: 'slotBet', def: 100 });
      this.spinBtn = root.querySelector('.spin-btn');
      this.autoBtn = root.querySelector('.auto-btn');
      this.turboBtn = root.querySelector('.turbo-btn');
      this.spinBtn.onclick = () => this.onSpin();
      this.autoBtn.onclick = () => { Sound.fx.click(); this.auto = !this.auto; this.syncBtns(); if (this.auto && !this.busy) this.onSpin(); };
      this.turboBtn.onclick = () => { Sound.fx.click(); this.turbo = !this.turbo; LS.set('turbo', this.turbo); this.syncBtns(); };

      // initial window: a spin without wins shown
      this.grid = M.spin(this.strips, U.random).map(c => c.map(s => s === S.WILD ? S.BELL : s));
      this.reels = [];
      for (let i = 0; i < 5; i++) {
        const reel = U.h('div', { class: 'reel' }), strip = U.h('div', { class: 'strip' });
        strip.innerHTML = this.grid[i].map(cellHTML).join('');
        reel.appendChild(strip); this.reelsEl.appendChild(reel);
        this.reels.push({ reel, strip });
      }
      this.syncBtns();
      this.measure();
      this.ro = new ResizeObserver(() => this.measure());
      this.ro.observe(this.reelsEl);
    },
    enter() {
      this.measure();
      if (this.fs > 0 && !this.busy) setTimeout(() => { if (!this.busy && C.current === 'slots') this.spin(); }, 500);
    },
    leave() { this.auto = false; this.syncBtns(); if (this.antic) { this.antic.stop(); this.antic = null; } if (this.whirr) { this.whirr.stop(); this.whirr = null; } },
    key(e) { if (e.code === 'Space' || e.code === 'Enter') { this.onSpin(); return true; } },
    measure() {
      const h = this.reelsEl.clientHeight;
      if (!h) return;
      this.cell = h / 3;
      this.reelsEl.style.setProperty('--cell', this.cell + 'px');
      this.lines.setAttribute('viewBox', `0 0 ${this.reelsEl.clientWidth} ${h}`);
    },
    syncBtns() {
      this.autoBtn.classList.toggle('on', this.auto);
      this.turboBtn.classList.toggle('on', this.turbo);
      this.spinBtn.classList.toggle('stop', this.busy);
    },
    setMeter(labelKey, val, cls = '') {
      this.meterLab.textContent = I18N.t(labelKey);
      this.meterLab.dataset.i18n = labelKey;
      this.meterVal.textContent = val;
      this.meterVal.className = 'sm-val ' + cls;
    },

    onSpin() {
      Sound.unlock();
      if (this.busy) { if (!this.slam) { this.slam = true; Sound.fx.click(); } return; }
      this.spin();
    },

    clearWins() {
      clearTimeout(this.cycleT); this.cycleId = (this.cycleId || 0) + 1;
      this.lines.innerHTML = '';
      this.reelsEl.classList.remove('has-win');
      U.$$('.cell.hit', this.reelsEl).forEach(c => c.classList.remove('hit'));
      U.$$('.xwild', this.reelsEl).forEach(x => x.remove());
    },

    async spin() {
      const free = this.fs > 0;
      const bet = free ? this.fsBet : this.stepper.value;
      if (!free && !C.take(bet)) { this.auto = false; this.syncBtns(); return; }
      this.busy = true; this.slam = false; this.syncBtns();
      this.stepper.locked = true;
      this.clearWins();
      if (free) { this.fs--; this.cab.querySelector('.fs-left').textContent = this.fs; }
      else this.setMeter('slots.goodLuck', '');

      const raw = M.spin(this.strips, U.random);
      const { grid } = M.expand(raw);
      const mult = free ? M.FREE_MULT : 1;
      const ev = M.evaluate(grid, bet / 10);
      const scat = M.evaluate(raw, 1).scatters;

      const T = this.turbo;
      const dur = [0, 1, 2, 3, 4].map(i => (T ? 380 : 820) + i * (T ? 110 : 230));
      const hasSc = r => raw[r].includes(S.SCAT);
      const anticipate = hasSc(0) && hasSc(2);
      if (anticipate) dur[4] += T ? 1100 : 2000;
      // near line wins also slow the last reel a little: the classic "almost" feel
      const lineTease = !anticipate && M.LINES.some(l => {
        const a = grid[0][l[0]]; if (a === S.SCAT) return false;
        const hi = a === S.SEVEN || a === S.DIAMOND;
        return hi && [1, 2, 3].every(r => grid[r][l[r]] === a || grid[r][l[r]] === S.WILD);
      });
      if (lineTease) dur[4] += T ? 450 : 900;

      Sound.fx.whoosh(true, 0.3);
      this.whirr = Sound.loop('whirr');
      let scCount = 0;
      const stops = this.reels.map((r, i) => this.runReel(i, raw[i], dur[i], i === 4 && (anticipate || lineTease)).then(() => {
        Sound.fx.reelStop(i);
        U.pulse(r.reel, 'land');
        if (raw[i].includes(S.SCAT)) {
          scCount++; Sound.fx.scatterLand(scCount);
          U.$$('.cell.s7', r.strip).forEach(c => U.pulse(c, 'pop'));
        }
        if (raw[i].includes(S.WILD)) this.expandWild(i, raw[i].indexOf(S.WILD));
        if (i === 2 && anticipate && !this.slam) {
          this.antic = Sound.loop('anticipation');
          this.reels[4].reel.classList.add('antic');
          this.cab.classList.add('tense');
        }
        if (i === 3 && lineTease && !this.slam) this.reels[4].reel.classList.add('antic');
        if (i === 4) {
          if (this.whirr) { this.whirr.stop(); this.whirr = null; }
          if (this.antic) { this.antic.stop(); this.antic = null; }
          r.reel.classList.remove('antic'); this.cab.classList.remove('tense');
        }
      }));
      await Promise.all(stops);
      this.grid = raw;
      await U.sleep(this.expandedAny ? 380 : 60);
      this.expandedAny = false;

      // results
      const lineWin = ev.total * mult;
      const scWin = scat.length >= 3 ? M.SCATTER_PAY * bet * mult : 0;
      const win = Math.floor(lineWin + scWin);
      if (free) this.fsTotal += win;
      if (win > 0) await this.present(ev, scat, win, bet);
      else if (!free) this.setMeter('slots.noWin', '—', 'dim');

      if (!free) C.record(win, bet);

      if (scat.length >= 3) await this.triggerFree(bet, scat);

      this.busy = false; this.syncBtns();
      if (this.fs > 0) { await U.sleep(T ? 300 : 700); if (C.current === 'slots') return this.spin(); }
      if (free && this.fs === 0) await this.endFree();
      this.stepper.locked = false;
      if (this.auto && C.current === 'slots') {
        await U.sleep(T ? 250 : 600);
        if (this.auto && !this.busy && C.current === 'slots') this.onSpin();
      }
    },

    runReel(i, finalCol, durMs, tease) {
      const { reel, strip } = this.reels[i];
      const H = this.cell;
      const cur = this.grid[i];
      const src = this.strips[i];
      const perSec = this.turbo ? 30 : 24;
      const n = Math.max(6, Math.round(durMs / 1000 * perSec));
      const filler = [];
      let p = Math.floor(U.random() * src.length);
      for (let k = 0; k < n; k++) filler.push(src[(p + k) % src.length]);
      const seq = [...finalCol, ...filler, ...cur];
      strip.innerHTML = seq.map(cellHTML).join('');
      const D = (seq.length - 3) * H;
      const over = H * 0.14;
      const windup = this.turbo ? 50 : 110;
      const T2 = tease ? 900 : (this.turbo ? 200 : 380);
      const T1 = Math.max(60, durMs - T2);
      const v = (D + over) / (T1 + T2 / 2);
      const back = 170;
      let y = -D, lastIdx = null, slamFrom = null, slamT = 0;
      strip.style.transform = `translateY(${-D}px)`;
      reel.classList.add('spinning');
      return new Promise(res => {
        const t0 = performance.now();
        const frame = now => {
          const t = now - t0;
          let done = false;
          if (this.slam && slamFrom === null && t > 30) { slamFrom = y; slamT = now; reel.classList.remove('blur'); }
          if (slamFrom !== null) {
            const k = Math.min(1, (now - slamT) / 150);
            y = slamFrom + (0 - slamFrom) * U.ease.outCubic(k);
            if (k >= 1) done = true;
          } else if (t < windup) {
            y = -D - H * 0.22 * Math.sin(Math.PI * t / windup);
          } else {
            const tt = t - windup;
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
            strip.innerHTML = finalCol.map(cellHTML).join('');
            strip.style.transform = 'translateY(0)';
            res();
          }
        };
        requestAnimationFrame(frame);
      });
    },

    expandWild(i, row) {
      this.expandedAny = true;
      const { reel, strip } = this.reels[i];
      const x = U.h('div', { class: 'xwild', html: '<svg viewBox="0 0 100 100"><use href="#sym-6"/></svg>' });
      x.style.setProperty('--from', row);
      reel.appendChild(x);
      setTimeout(() => {
        strip.innerHTML = [6, 6, 6].map(cellHTML).join('');
        Sound.fx.wildExpand();
        const c = U.center(reel); FX.sparks(c.x, c.y, 22, 'gold', 1.4);
      }, 60);
    },

    cellCenter(r, row) {
      const w = this.reelsEl.clientWidth / 5;
      return [w * r + w / 2, this.cell * row + this.cell / 2];
    },

    async present(ev, scat, win, bet) {
      this.reelsEl.classList.add('has-win');
      const paths = ev.wins.map(w => {
        const pts = M.LINES[w.line].map((row, r) => this.cellCenter(r, row).join(','));
        return `<polyline class="pl pl-${w.line}" points="${pts.join(' ')}"/>`;
      }).join('');
      this.lines.innerHTML = paths;
      const mark = cells => cells.forEach(([r, row]) => { const c = this.reels[r].strip.children[row]; if (c) c.classList.add('hit'); });
      ev.wins.forEach(w => mark(w.cells));
      if (scat.length >= 3) mark(scat);

      const mult = win / bet;
      const level = mult >= 5 ? 2 : mult >= 2 ? 1 : 0;
      Sound.fx.win(level);
      const rc = U.center(this.reelsEl);
      FX.sparks(rc.x, rc.y, 12 + level * 10, 'gold');
      if (mult >= 3) FX.coins(rc.x, rc.y, 10 + level * 12);
      if (mult >= 10) await FX.bigWin(win, bet);
      this.setMeter(this.fs > 0 || this.inFree ? 'slots.fsWin' : 'slots.win', '0', 'good');
      await FX.countUp(this.meterVal, 0, win, U.clamp(400 + mult * 60, 400, 1600));
      U.pulse(this.meterVal, 'punch');
      C.pay(win, this.meterVal);
      if (ev.wins.length > 1) this.cycle(ev.wins, bet);
      else if (ev.wins.length === 1) this.lineText(ev.wins[0]);
    },
    lineText(w) {
      this.meterLab.textContent = I18N.t('slots.lineWin', { n: w.line + 1, k: w.count, s: I18N.t('sym.' + M.NAMES[w.sym]) });
    },
    cycle(wins) {
      const id = this.cycleId;
      let k = 0;
      const step = () => {
        if (id !== this.cycleId) return;
        const w = wins[k % wins.length];
        U.$$('.pl', this.lines).forEach(p => p.classList.toggle('solo', p.classList.contains('pl-' + w.line)));
        U.$$('.cell.hit', this.reelsEl).forEach(c => c.classList.remove('hit'));
        w.cells.forEach(([r, row]) => { const c = this.reels[r].strip.children[row]; if (c) { c.classList.add('hit'); } });
        this.lineText(w);
        k++;
        this.cycleT = setTimeout(step, 1100);
      };
      this.cycleT = setTimeout(step, 900);
    },

    async triggerFree(bet, scat) {
      const retrigger = this.inFree;
      this.fs += M.FREE_SPINS;
      if (!retrigger) { this.fsBet = bet; this.fsTotal = 0; }
      this.inFree = true;
      scat.forEach(([r, row]) => { const c = this.reels[r].strip.children[row]; if (c) U.pulse(c, 'mega'); });
      Sound.fx.fanfare(2);
      Sound.say(I18N.t('slots.fsSay'));
      FX.flash('red');
      const rc = U.center(this.reelsEl);
      FX.confetti(rc.x, rc.y, 90, 1.3); FX.coins(rc.x, rc.y, 30);
      await this.banner(I18N.t(retrigger ? 'slots.retrigger' : 'slots.fsWon', { n: M.FREE_SPINS }), I18N.t('slots.fsMult', { m: M.FREE_MULT }));
      this.cab.classList.add('free');
      const fsEl = this.cab.querySelector('.slot-fs');
      fsEl.hidden = false; fsEl.querySelector('.fs-left').textContent = this.fs;
    },
    async endFree() {
      this.inFree = false;
      this.cab.classList.remove('free');
      this.cab.querySelector('.slot-fs').hidden = true;
      const total = this.fsTotal;
      C.record(total, this.fsBet);
      Sound.fx.fanfare(1);
      await this.banner(I18N.t('slots.fsTotal'), U.fmt(total));
      this.setMeter('slots.fsTotal', U.fmt(total), 'good');
    },
    banner(title, sub) {
      return new Promise(res => {
        const b = U.h('div', { class: 'slot-banner' }, U.h('div', { class: 'sb-t' }, title), U.h('div', { class: 'sb-s' }, sub));
        this.cab.appendChild(b);
        let done = false;
        const close = () => { if (done) return; done = true; b.classList.add('out'); setTimeout(() => { b.remove(); res(); }, 300); };
        b.onclick = close;
        setTimeout(close, 2400);
      });
    },

    rules() {
      const row = s => `<tr><td class="pt-sym"><svg viewBox="0 0 100 100"><use href="#sym-${s}"/></svg></td><td>${I18N.t('sym.' + M.NAMES[s])}</td>${M.PAY[s].map(p => `<td>×${p}</td>`).join('')}</tr>`;
      return `
        <p>${I18N.t('slots.r1')}</p>
        <div class="table-scroll"><table class="paytable"><thead><tr><th></th><th></th><th>3</th><th>4</th><th>5</th></tr></thead>
        <tbody>${[5, 4, 3, 2, 1, 0].map(row).join('')}</tbody></table></div>
        <p class="pt-note">${I18N.t('slots.r2')}</p>
        <div class="pt-special"><svg viewBox="0 0 100 100"><use href="#sym-6"/></svg><p>${I18N.t('slots.r3')}</p></div>
        <div class="pt-special"><svg viewBox="0 0 100 100"><use href="#sym-7"/></svg><p>${I18N.t('slots.r4', { n: M.FREE_SPINS, m: M.FREE_MULT, p: M.SCATTER_PAY })}</p></div>
        <p class="pt-note">${I18N.t('slots.r5')}</p>`;
    }
  };
  C.register(G);
})();
