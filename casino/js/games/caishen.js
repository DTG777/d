/* God of Wealth: 6x5 pays-anywhere with tumbles, lucky multiplier orbs and buyable free spins.
   Cells are absolutely placed by (column, row) so tumbles are just rows changing. */
(function () {
  const t = (k, v) => I18N.t(k, v);
  const K = SlotKit, E = Engines.list.caishen;
  const { PAY, NAMES, SYM, BUY, FS, SCAT_PAY } = E;
  const COLS = 6, ROWS = 5;

  const gem = (shape, a, b, c) => `<defs><linearGradient id="cg${a.slice(1)}" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${a}"/><stop offset=".55" stop-color="${b}"/><stop offset="1" stop-color="${c}"/></linearGradient></defs>
    <path d="${shape}" fill="url(#cg${a.slice(1)})" stroke="#fff6" stroke-width="2.5" stroke-linejoin="round"/>
    <path d="M34 30 l10 -6" stroke="#fff" stroke-width="5" stroke-linecap="round" opacity=".7"/>`;
  K.defs.cs = {
    grad: `<radialGradient id="gOrb" cx=".38" cy=".32" r=".7"><stop offset="0" stop-color="#ffe0a0"/><stop offset=".35" stop-color="#ff5a3c"/><stop offset=".8" stop-color="#a30a1c"/><stop offset="1" stop-color="#5a0410"/></radialGradient>
      <linearGradient id="gToad" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff0a8"/><stop offset=".5" stop-color="#e3a92c"/><stop offset="1" stop-color="#8a5a10"/></linearGradient>`,
    art: {
      0: () => gem('M50 10 C74 10 90 28 90 50 C90 72 74 90 50 90 C26 90 10 72 10 50 C10 28 26 10 50 10Z', '#b8ffcf', '#1fbf6a', '#0b5a33'),
      1: () => gem('M50 88 C30 72 10 56 10 36 C10 20 22 12 33 12 C42 12 48 18 50 24 C52 18 58 12 67 12 C78 12 90 20 90 36 C90 56 70 72 50 88Z', '#ffc2c8', '#e8233f', '#7a0618'),
      2: () => gem('M50 8 L92 84 L8 84 Z', '#f1d0ff', '#9b3cf0', '#4a0f86'),
      3: () => gem('M34 10 H66 L90 34 V66 L66 90 H34 L10 66 V34 Z', '#cfe6ff', '#2f7bf0', '#0c2f7a'),
      4: () => `<circle cx="50" cy="50" r="40" fill="url(#gGold)" stroke="#6b4400" stroke-width="3"/><rect x="38" y="38" width="24" height="24" fill="#3a1d0a" stroke="#6b4400" stroke-width="2"/>
        <circle cx="50" cy="50" r="31" fill="none" stroke="#fff3b0" stroke-width="1.5" opacity=".7"/>
        ${['乾', '隆', '通', '宝'].map((c, i) => `<text x="${[50, 50, 72, 28][i]}" y="${[30, 80, 56, 56][i]}" text-anchor="middle" font-family="'ZCOOL QingKe HuangYou', sans-serif" font-size="13" fill="#6b4400">${c}</text>`).join('')}`,
      5: () => `<rect x="44" y="4" width="12" height="10" fill="#f6c94e"/><ellipse cx="50" cy="50" rx="36" ry="34" fill="url(#gRed)" stroke="#f6c94e" stroke-width="3"/>
        <path d="M50 16 V84 M30 20 Q20 50 30 80 M70 20 Q80 50 70 80" stroke="#f6c94e" stroke-width="2" fill="none" opacity=".7"/>
        <rect x="36" y="80" width="28" height="8" rx="2" fill="#f6c94e"/><path d="M42 88 v8 M50 88 v10 M58 88 v8" stroke="#f6c94e" stroke-width="2.5"/>
        <text x="50" y="59" text-anchor="middle" font-family="'ZCOOL QingKe HuangYou', sans-serif" font-size="24" fill="#fff3c0">福</text>`,
      6: () => `<path d="M30 30 Q14 60 22 80 Q30 94 50 94 Q70 94 78 80 Q86 60 70 30 Z" fill="url(#gRed)" stroke="#f6c94e" stroke-width="3"/>
        <path d="M30 30 Q40 22 34 10 Q50 18 66 10 Q60 22 70 30 Z" fill="#c8182e" stroke="#f6c94e" stroke-width="3" stroke-linejoin="round"/>
        <path d="M28 31 H72" stroke="#f6c94e" stroke-width="5" stroke-linecap="round"/>
        <circle cx="50" cy="62" r="17" fill="url(#gGold)" stroke="#6b4400" stroke-width="2"/>
        <text x="50" y="70" text-anchor="middle" font-family="'ZCOOL QingKe HuangYou', sans-serif" font-size="21" fill="#a3121f">財</text>`,
      7: () => `<path d="M8 46 Q14 70 50 74 Q86 70 92 46 Q74 56 50 56 Q26 56 8 46Z" fill="url(#gGold)" stroke="#6b4400" stroke-width="3"/>
        <ellipse cx="50" cy="44" rx="22" ry="16" fill="url(#gGold)" stroke="#6b4400" stroke-width="3"/>
        <path d="M8 46 Q4 34 14 30 Q20 44 30 50 M92 46 Q96 34 86 30 Q80 44 70 50" fill="url(#gGold)" stroke="#6b4400" stroke-width="3"/>
        <path d="M38 36 q6-6 14-4" stroke="#fff6c8" stroke-width="4" fill="none" stroke-linecap="round"/>`,
      8: () => `<ellipse cx="50" cy="62" rx="36" ry="26" fill="url(#gToad)" stroke="#6b4400" stroke-width="3"/>
        <circle cx="32" cy="36" r="12" fill="url(#gToad)" stroke="#6b4400" stroke-width="3"/><circle cx="68" cy="36" r="12" fill="url(#gToad)" stroke="#6b4400" stroke-width="3"/>
        <circle cx="32" cy="35" r="6" fill="#1a0e04"/><circle cx="68" cy="35" r="6" fill="#1a0e04"/><circle cx="34" cy="33" r="2" fill="#fff"/><circle cx="70" cy="33" r="2" fill="#fff"/>
        <path d="M30 58 Q50 72 70 58" stroke="#6b4400" stroke-width="3" fill="none"/>
        <circle cx="50" cy="70" r="11" fill="url(#gGold)" stroke="#6b4400" stroke-width="2"/><rect x="46" y="66" width="8" height="8" fill="#6b4400"/>
        <circle cx="30" cy="70" r="3" fill="#a86e14"/><circle cx="72" cy="74" r="3" fill="#a86e14"/><circle cx="62" cy="52" r="2.5" fill="#a86e14"/>`,
      9: () => `<g opacity=".85">${Array.from({ length: 12 }, (_, i) => `<path d="M50 50 L${50 + 48 * Math.cos(i * Math.PI / 6 - 0.13)} ${50 + 48 * Math.sin(i * Math.PI / 6 - 0.13)} L${50 + 48 * Math.cos(i * Math.PI / 6 + 0.13)} ${50 + 48 * Math.sin(i * Math.PI / 6 + 0.13)}Z" fill="#ffd24a"/>`).join('')}</g>
        <circle cx="50" cy="50" r="34" fill="url(#gRed)" stroke="url(#gGold)" stroke-width="5"/>
        <text x="50" y="64" text-anchor="middle" font-family="'ZCOOL QingKe HuangYou', sans-serif" font-size="40" fill="url(#gGold)" stroke="#5a0410" stroke-width="1">財</text>
        <rect x="14" y="78" width="72" height="16" rx="8" fill="#5a0410" stroke="#f6c94e" stroke-width="2"/>
        <text x="50" y="90.5" text-anchor="middle" font-family="${I18N.lang === 'zh' ? '\'ZCOOL QingKe HuangYou\', sans-serif' : '\'Barlow Semi Condensed\', sans-serif'}" font-weight="800" font-size="${I18N.lang === 'zh' ? 13 : 10}" fill="#ffe8a0">${t('cs.scatter')}</text>`,
      10: () => `<circle cx="50" cy="50" r="42" fill="url(#gOrb)" stroke="#ffd24a" stroke-width="3"/><circle cx="50" cy="50" r="42" fill="none" stroke="#fff3c0" stroke-width="1" stroke-dasharray="2 5" opacity=".8"/>
        <ellipse cx="36" cy="30" rx="12" ry="7" fill="#fff" opacity=".45"/>`
    }
  };
  K.buildDefs();
  const cellHTML = c => K.use('cs', c.s) + (c.s === SYM.ORB ? `<b class="cs-x">×${c.x}</b>` : '');
  const symName = s => t('cs.sym.' + NAMES[s]);

  const G = new K.SlotView('caishen', {
    cab: 'cs-cab', title: 'cs.title', hint: 'cs.hint', buyMult: BUY,
    toggles: `<button class="tog buy-btn"><span data-i18n="cs.buy">${t('cs.buy')}</span></button>`,
    board: () => `<div class="cs-board"></div>`,
    rules: () => {
      const row = s => `<tr><td class="pt-sym"><svg viewBox="0 0 100 100"><use href="#cs-${s}"/></svg></td><td>${symName(s)}</td>${PAY[s].map(p => `<td>×${p}</td>`).join('')}</tr>`;
      return `
        <p>${t('cs.r1')}</p>
        <div class="table-scroll"><table class="paytable"><thead><tr><th></th><th></th><th>8–9</th><th>10–11</th><th>12+</th></tr></thead>
        <tbody>${[8, 7, 6, 5, 4, 3, 2, 1, 0].map(row).join('')}</tbody></table></div>
        <div class="pt-special"><svg viewBox="0 0 100 100"><use href="#cs-10"/></svg><p>${t('cs.r2')}</p></div>
        <div class="pt-special"><svg viewBox="0 0 100 100"><use href="#cs-9"/></svg><p>${t('cs.r3', { a: SCAT_PAY[4], b: SCAT_PAY[5], c: SCAT_PAY[6], n: FS })}</p></div>
        <p class="pt-note">${t('cs.r4', { m: BUY, n: FS })}</p>`;
    }
  });

  Object.assign(G, {
    build() {
      this.board = this.root.querySelector('.cs-board');
      this.cells = [];
      const rnd = () => ({ s: Math.floor(U.random() * 9) });
      for (let c = 0; c < COLS; c++) { this.cells.push([]); for (let r = 0; r < ROWS; r++) this.cells[c].push(this.mk(rnd(), c, r)); }
      this.root.querySelector('.buy-btn').onclick = () => this.buy();
      this.freeBadge = o => o.freeMult > 0 ? ` · ×${o.freeMult}` : '';
    },
    mk(c, col, row) {
      const el = U.h('div', { class: 'cs-cell cs-s' + c.s, html: cellHTML(c) });
      el.style.setProperty('--c', col); el.style.setProperty('--r', row);
      el._c = c;
      this.board.appendChild(el);
      return el;
    },
    clearWins() {
      this.board.classList.remove('has-win');
      U.$$('.cs-cell.hit', this.board).forEach(c => c.classList.remove('hit'));
      this.setMeter('slots.goodLuck', '');
    },
    syncBtns() {
      K.SlotView.prototype.syncBtns.call(this);
      const b = this.root && this.root.querySelector('.buy-btn');
      if (b) b.disabled = this.busy || this.L.observe().freeSpins > 0;
    },
    buy() {
      if (this.busy) return;
      Sound.fx.click();
      const bet = this.stepper.value, cost = bet * BUY;
      const close = C.modal({
        title: t('cs.buyT'),
        body: U.h('div', { class: 'cs-buy', html: `<svg viewBox="0 0 100 100"><use href="#cs-9"/></svg><p>${t('cs.buyQ', { n: FS, c: U.fmt(cost), b: U.fmt(bet) })}</p>` }),
        actions: [
          { label: t('cs.buyNo') },
          { label: t('cs.buyYes', { c: U.fmt(cost) }), primary: true, onClick: done => { done(); if (cost > C.S.balance) { C.noFunds(); return; } this.run({ type: 'buy', bet }); } }
        ]
      });
      return close;
    },
    pos(el) { return U.center(el); },

    // all cells fall out, the new grid drops in column by column
    async drop(grid, free) {
      const old = U.$$('.cs-cell', this.board);
      old.forEach(el => { el.classList.add('out'); el.style.setProperty('--r', +el.style.getPropertyValue('--r') + ROWS + 1); });
      Sound.fx.whoosh(false, 0.25);
      await this.wait(160);
      old.forEach(el => el.remove());
      // scatters build tension: once three are in, the remaining columns hold back
      let sc = 0, tense = false;
      const colGap = this.T ? 50 : 110;
      this.cells = [];
      for (let c = 0; c < COLS; c++) {
        this.cells.push(grid[c].map((cell, r) => {
          const el = this.mk(cell, c, r - ROWS - 1);
          el.classList.add('falling');
          return el;
        }));
        void this.board.offsetWidth;
        this.cells[c].forEach((el, r) => { el.style.transitionDelay = (ROWS - 1 - r) * 22 + 'ms'; el.style.setProperty('--r', r); });
        const n = grid[c].filter(x => x.s === SYM.SCAT).length;
        await this.wait(tense ? (this.T ? 600 : 1300) : colGap);
        Sound.fx.reelStop(c % 5);
        if (n) { sc += n; Sound.fx.scatterLand(Math.min(5, sc)); this.cells[c].forEach(el => { if (el._c.s === SYM.SCAT) U.pulse(el, 'pop'); }); }
        if (!tense && sc >= (free ? 2 : 3) && c < COLS - 1 && !this.slam) {
          tense = true;
          this.antic = Sound.loop('anticipation');
          this.cab.classList.add('tense'); this.board.classList.add('antic');
        }
      }
      await this.wait(260);
      this.stopLoops(); this.cab.classList.remove('tense'); this.board.classList.remove('antic');
      this.cells.forEach(col => col.forEach(el => { el.classList.remove('falling'); el.style.transitionDelay = ''; }));
    },

    async tumble(tb, k, running) {
      this.board.classList.add('has-win');
      const gone = new Set(tb.removed.map(([c, r]) => c + ':' + r));
      tb.removed.forEach(([c, r]) => this.cells[c][r].classList.add('hit'));
      Sound.fx.win(Math.min(2, k));
      // label each paying symbol once, over one of its cells
      tb.hits.forEach(h => {
        const at = tb.removed.find(([c, r]) => this.cells[c][r]._c.s === h.sym);
        if (!at) return;
        const p = this.pos(this.cells[at[0]][at[1]]);
        FX.float(p.x, p.y, `${h.count}× ${U.fmt(h.pay)}`, 'good');
      });
      running += tb.win;
      this.setMeter(k ? 'cs.chain' : 'slots.win', U.fmt(running), 'good', k ? { n: k + 1 } : undefined);
      U.pulse(this.meterVal, 'punch');
      await this.wait(650);
      // burst
      tb.removed.forEach(([c, r], i) => {
        const el = this.cells[c][r];
        el.classList.remove('hit'); el.classList.add('boom');
        if (i % 3 === 0) { const p = this.pos(el); FX.sparks(p.x, p.y, 6, 'gold', 0.8); }
      });
      Sound.fx.coin(1.2); Sound.fx.coin(1.5);
      await this.wait(300);
      // gravity: survivors fall, new symbols enter from the top
      for (let c = 0; c < COLS; c++) {
        const keep = this.cells[c].filter((el, r) => !gone.has(c + ':' + r));
        this.cells[c].forEach((el, r) => { if (gone.has(c + ':' + r)) el.remove(); });
        const add = tb.fill[c].map((cell, i) => this.mk(cell, c, i - tb.fill[c].length));
        this.cells[c] = [...add, ...keep];
      }
      void this.board.offsetWidth;
      this.board.classList.remove('has-win');
      this.cells.forEach(col => col.forEach((el, r) => el.style.setProperty('--r', r)));
      await this.wait(360);
      Sound.fx.thud(0.8);
      tb.fill.forEach((add, c) => add.forEach(cell => { if (cell.s === SYM.SCAT) Sound.fx.scatterLand(3); }));
      return running;
    },

    async animate(events) {
      const settle = events.find(e => e.t === 'settle');
      const bet = settle.baseBet || settle.bet;
      const buy = events.find(e => e.t === 'buy');
      if (buy) {
        Sound.fx.chipsSlide();
        const fs = events.find(e => e.t === 'freeSpins');
        await this.startFree(fs, bet);
        return;
      }
      const grid = events.find(e => e.t === 'grid');
      await this.drop(grid.grid, grid.free);
      let running = 0, k = 0;
      for (const ev of events) if (ev.t === 'tumble') running = await this.tumble(ev, k++, running);
      const orbs = events.find(e => e.t === 'orbs'), wins = events.find(e => e.t === 'wins');
      const fs = events.find(e => e.t === 'freeSpins'), end = events.find(e => e.t === 'freeEnd');
      if (orbs) await this.orbs(orbs, grid.free);
      if (wins) {
        if (wins.mult > 1) {
          this.setMeter('cs.multWin', U.fmt(wins.base), 'good', { m: wins.mult });
          await this.wait(500);
          FX.flash('gold'); Sound.fx.tierUp(1);
        }
        await this.showWin(wins.win, bet, grid.free ? 'slots.fsWin' : 'slots.win', wins.mult > 1 ? wins.base : running);
        if (wins.mult > 1) { this.meterLab.textContent = t('cs.multWin', { m: wins.mult }); delete this.meterLab.dataset.i18n; }
      } else if (!grid.free) this.setMeter('slots.noWin', '—', 'dim');
      if (fs) {
        const sc = fs.scatters || [];
        this.cells.forEach(col => col.forEach(el => { if (el._c.s === SYM.SCAT) U.pulse(el, 'mega'); }));
        await this.wait(900);
        if (fs.retrigger) { Sound.fx.fanfare(1); await this.banner(t('slots.retrigger', { n: fs.add }), null, 'cs-banner'); }
        else await this.startFree(fs, bet, sc.length);
      }
      if (end) {
        this.inFree = false;
        Sound.fx.fanfare(1);
        if (end.total >= bet * 10) await FX.bigWin(end.total, bet);
        await this.banner(t('slots.fsTotal'), U.fmt(end.total), 'cs-banner');
        this.setMeter('slots.fsTotal', U.fmt(end.total), 'good');
      }
    },
    async startFree(fs, bet) {
      this.inFree = true;
      Sound.fx.fanfare(2);
      Sound.say(t('cs.say'));
      FX.flash('red');
      const rc = U.center(this.frame);
      FX.confetti(rc.x, rc.y, 90, 1.3); FX.coins(rc.x, rc.y, 30);
      await this.banner(t('slots.fsWon', { n: fs.add }), t('cs.fsSub'), 'cs-banner', 2800);
      this.syncFree();
    },
    async orbs(o, free) {
      const els = [];
      this.cells.forEach(col => col.forEach(el => { if (el._c.s === SYM.ORB) els.push(el); }));
      if (!o.applied) { els.forEach(el => el.classList.add('dud')); return; }
      // each orb flies its number into the meter
      let sum = 0;
      for (const el of els) {
        U.pulse(el, 'mega');
        Sound.fx.scatterLand(Math.min(5, els.indexOf(el) + 2));
        const p = this.pos(el);
        FX.sparks(p.x, p.y, 14, 'red', 1);
        sum += el._c.x;
        FX.float(p.x, p.y - 10, '×' + el._c.x, 'good');
        this.setMeter('cs.orbSum', '×' + sum, 'good');
        U.pulse(this.meterVal, 'punch');
        await this.wait(420);
      }
      if (free && o.total !== o.sum) {
        this.setMeter('cs.orbTotal', '×' + o.total, 'good');
        U.pulse(this.meterVal, 'punch'); Sound.fx.tierUp(0);
        this.fsEl.querySelector('.fs-x').textContent = ` · ×${o.total}`;
        U.pulse(this.fsEl, 'punch');
        await this.wait(700);
      }
    }
  });
  C.register(G);
})();
