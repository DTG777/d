/* Treasure Bowl: 5x3, 243 ways, Hold & Win coins and four progressive jackpots.
   The jackpot bar shows the live pots scaled to your bet; they climb while the floor plays. */
(function () {
  const t = (k, v) => I18N.t(k, v);
  const K = SlotKit, E = Engines.list.treasure;
  const { PAY, NAMES, SYM } = E;
  const TIERS = ['grand', 'major', 'minor', 'mini'];

  const letter = (ch, a, b) => `<defs><linearGradient id="tl${ch}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${a}"/><stop offset="1" stop-color="${b}"/></linearGradient></defs>
    <text x="50" y="78" text-anchor="middle" font-family="Limelight, Georgia, serif" font-size="72" fill="url(#tl${ch})" stroke="#f6c94e" stroke-width="3" paint-order="stroke">${ch}</text>`;
  const medal = (ch, a, b, ring) => `<defs><radialGradient id="tm${ch.charCodeAt(0)}" cx=".4" cy=".35" r=".75"><stop offset="0" stop-color="${a}"/><stop offset="1" stop-color="${b}"/></radialGradient></defs>
    <circle cx="50" cy="50" r="43" fill="url(#tm${ch.charCodeAt(0)})" stroke="${ring}" stroke-width="5"/>
    <circle cx="50" cy="50" r="35" fill="none" stroke="#fff3c0" stroke-width="1.5" stroke-dasharray="1 4" opacity=".8"/>
    <text x="50" y="66" text-anchor="middle" font-family="'ZCOOL QingKe HuangYou', sans-serif" font-size="46" fill="url(#gGold)" stroke="#3a1205" stroke-width="1.2">${ch}</text>`;
  K.defs.tb = {
    grad: `<linearGradient id="gKoi" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#ffd27a"/><stop offset=".5" stop-color="#ff6a1f"/><stop offset="1" stop-color="#b3220c"/></linearGradient>`,
    art: {
      0: () => letter('J', '#7dffb6', '#0e8a5c'),
      1: () => letter('Q', '#9fd0ff', '#1f4fa8'),
      2: () => letter('K', '#e2b6ff', '#6a1fb0'),
      3: () => letter('A', '#ff9aa6', '#b8132c'),
      4: () => `<path d="M10 52 Q34 18 70 44 L92 26 Q84 52 92 78 L70 60 Q34 86 10 52Z" fill="url(#gKoi)" stroke="#6b1a04" stroke-width="3" stroke-linejoin="round"/>
        <path d="M40 34 Q48 22 60 30" fill="#ff8a3a" stroke="#6b1a04" stroke-width="2.5"/><path d="M42 70 Q50 80 58 72" fill="#ff8a3a" stroke="#6b1a04" stroke-width="2.5"/>
        <path d="M36 44 q6 8 0 16 M46 42 q6 10 0 20 M56 44 q6 8 0 16" stroke="#fff3c0" stroke-width="2" fill="none" opacity=".7"/>
        <circle cx="22" cy="48" r="4" fill="#1a0a02"/><circle cx="23" cy="47" r="1.3" fill="#fff"/>`,
      5: () => medal('龜', '#7fdcae', '#0b5a33', '#c9b58a'),
      6: () => medal('鳳', '#ff8a8a', '#7d0616', '#f6c94e'),
      7: () => medal('龍', '#ffe08a', '#b8741a', '#fff3c0'),
      8: () => `<ellipse cx="50" cy="40" rx="30" ry="9" fill="#5a2e12"/>
        ${[[34, 34], [50, 28], [66, 34], [42, 22], [58, 22]].map(([x, y]) => `<path d="M${x - 11} ${y} Q${x} ${y + 9} ${x + 11} ${y} Q${x + 6} ${y - 4} ${x} ${y - 7} Q${x - 6} ${y - 4} ${x - 11} ${y}Z" fill="url(#gGold)" stroke="#6b4400" stroke-width="1.5"/>`).join('')}
        <path d="M12 40 H88 Q86 72 62 80 H38 Q14 72 12 40Z" fill="url(#gRed)" stroke="#f6c94e" stroke-width="3"/>
        <path d="M34 80 L30 92 H70 L66 80" fill="url(#gGold)" stroke="#6b4400" stroke-width="2"/>
        <text x="50" y="${I18N.lang === 'zh' ? 68 : 66}" text-anchor="middle" font-family="${I18N.lang === 'zh' ? '\'ZCOOL QingKe HuangYou\', sans-serif' : 'Limelight, Georgia, serif'}" font-size="${I18N.lang === 'zh' ? 22 : 16}" fill="#fff3c0">${t('slots.wild')}</text>`,
      9: () => `<circle cx="50" cy="50" r="44" fill="url(#gGold)" stroke="#6b4400" stroke-width="3"/>
        <circle cx="50" cy="50" r="36" fill="none" stroke="#fff3b0" stroke-width="2" opacity=".8"/>
        <path d="M24 30 q8-10 20-12" stroke="#fff" stroke-width="5" stroke-linecap="round" opacity=".55" fill="none"/>`
    }
  };
  K.buildDefs();
  const symName = s => t('tb.sym.' + NAMES[s]);

  const G = new K.SlotView('treasure', {
    cab: 'tb-cab', title: 'tb.title', hint: 'slots.hint',
    top: () => `<div class="tb-jp">${TIERS.map(k => `<div class="jp jp-${k}"><span data-i18n="tb.jp.${k}">${t('tb.jp.' + k)}</span><b>—</b></div>`).join('')}</div>`,
    board: () => `<div class="reels tb-reels"></div>`,
    rules: () => {
      const row = s => `<tr><td class="pt-sym"><svg viewBox="0 0 100 100"><use href="#tb-${s}"/></svg></td><td>${symName(s)}</td>${PAY[s].map(p => `<td>×${p}</td>`).join('')}</tr>`;
      return `
        <p>${t('tb.r1')}</p>
        <div class="table-scroll"><table class="paytable"><thead><tr><th></th><th></th><th>3</th><th>4</th><th>5</th></tr></thead>
        <tbody>${[7, 6, 5, 4, 3, 2, 1, 0].map(row).join('')}</tbody></table></div>
        <div class="pt-special"><svg viewBox="0 0 100 100"><use href="#tb-8"/></svg><p>${t('tb.r2')}</p></div>
        <div class="pt-special"><svg viewBox="0 0 100 100"><use href="#tb-9"/></svg><p>${t('tb.r3')}</p></div>
        <p class="pt-note">${t('tb.r4')}</p>`;
    }
  });

  const coinLabel = (v, bet) => typeof v === 'number' ? U.fmtShort(v * bet) : t('tb.jp.' + v);
  Object.assign(G, {
    bet: 100,
    cellHTML(c) {
      if (!c || c.s == null) return '<div class="cell tb-empty"></div>';
      const jp = c.s === SYM.COIN && typeof c.v === 'string';
      return `<div class="cell tb-s${c.s}${jp ? ' tb-jpc tb-' + c.v : ''}">${K.use('tb', c.s)}${c.s === SYM.COIN ? `<b class="tb-v">${coinLabel(c.v, this.bet)}</b>` : ''}</div>`;
    },
    // what scrolls past while spinning; only the final window comes from the engine
    filler(r) {
      const x = U.random();
      if (x < 0.1) return { s: SYM.COIN, v: U.pick([1, 1, 2, 2, 3, 5, 8, 10]) };
      if (x < 0.16 && r >= 1 && r <= 3) return { s: SYM.WILD };
      return { s: U.pick([0, 0, 1, 1, 2, 2, 3, 3, 4, 4, 5, 5, 6, 7]) };
    },
    build() {
      this.reelsEl = this.root.querySelector('.tb-reels');
      this.jpEl = this.root.querySelector('.tb-jp');
      this.bet = this.stepper.value;
      this.grid = [0, 1, 2, 3, 4].map(r => [0, 1, 2].map(() => { let c; do c = this.filler(r); while (c.s === SYM.COIN); return c; }));
      this.reels = this.grid.map(col => {
        const reel = U.h('div', { class: 'reel' }), strip = U.h('div', { class: 'strip' });
        strip.innerHTML = col.map(c => this.cellHTML(c)).join('');
        reel.appendChild(strip); this.reelsEl.appendChild(reel);
        return { reel, strip };
      });
      this.onBet = v => { this.bet = v; this.paintJp(); };
      this.paintJp();
    },
    enter() {
      K.SlotView.prototype.enter.call(this);
      clearInterval(this.jpT);
      this.jpT = setInterval(() => { if (!this.busy) this.paintJp(); }, 1000);
    },
    leave() { K.SlotView.prototype.leave.call(this); clearInterval(this.jpT); },
    paintJp() {
      const J = Casino.Jackpots.values, b = this.busy ? this.bet : this.stepper.value;
      TIERS.forEach(k => { this.jpEl.querySelector('.jp-' + k + ' b').textContent = U.fmt(Math.floor(J[k] * b / 100)); });
    },
    measure() {
      const h = this.reelsEl.clientHeight;
      if (!h) return;
      this.cell = h / 3;
      this.reelsEl.style.setProperty('--cell', this.cell + 'px');
    },
    clearWins() {
      clearTimeout(this.cycleT); this.cycleId = (this.cycleId || 0) + 1;
      this.reelsEl.classList.remove('has-win');
      U.$$('.cell.hit', this.reelsEl).forEach(c => c.classList.remove('hit'));
      this.setMeter('slots.goodLuck', '');
    },
    cellEl(r, row) { return this.reels[r].strip.children[row]; },

    async animate(events) {
      const reels = events.find(e => e.t === 'reels'), wins = events.find(e => e.t === 'wins');
      const hold = events.find(e => e.t === 'hold'), settle = events.find(e => e.t === 'settle');
      this.bet = settle.bet;
      const grid = reels.grid;
      const coinsIn = r => grid[r].filter(c => c.s === SYM.COIN).length;
      // three coins on the first three reels: the last two reels crawl
      const early = coinsIn(0) + coinsIn(1) + coinsIn(2);
      const tease = early >= 3;
      const dur = [0, 1, 2, 3, 4].map(i => (this.T ? 380 : 800) + i * (this.T ? 110 : 220));
      if (tease) { dur[3] += this.T ? 600 : 1300; dur[4] += this.T ? 1100 : 2400; }
      Sound.fx.whoosh(true, 0.3);
      this.whirr = Sound.loop('whirr');
      let coins = 0;
      await Promise.all(this.reels.map(({ reel, strip }, r) => {
        const n = Math.max(6, Math.round(dur[r] / 1000 * (this.T ? 30 : 24)));
        const seq = [...grid[r], ...Array.from({ length: n }, () => this.filler(r)), ...this.grid[r]].map(c => this.cellHTML(c));
        return this.runReel(reel, strip, seq, 3, dur[r], tease && r >= 3).then(() => {
          Sound.fx.reelStop(r);
          U.pulse(reel, 'land');
          grid[r].forEach((c, row) => {
            if (c.s === SYM.COIN) { coins++; Sound.fx.scatterLand(Math.min(5, coins)); U.pulse(strip.children[row], 'pop'); }
          });
          if (r === 2 && tease && !this.slam) {
            this.antic = Sound.loop('anticipation');
            this.reels[3].reel.classList.add('antic'); this.reels[4].reel.classList.add('antic');
            this.cab.classList.add('tense');
          }
          if (r >= 3) reel.classList.remove('antic');
          if (r === 4) { this.stopLoops(); this.cab.classList.remove('tense'); }
        });
      }));
      this.grid = grid;
      await this.wait(80);
      if (wins) {
        this.reelsEl.classList.add('has-win');
        wins.ways.forEach(w => w.cells.forEach(([r, row]) => this.cellEl(r, row).classList.add('hit')));
        if (hold) { // a quick look at the ways win; the real show comes after the bonus
          Sound.fx.win(0);
          this.setMeter('slots.win', U.fmt(wins.win), 'good');
          await this.wait(1100);
          this.clearWins();
        } else {
          await this.showWin(wins.win, settle.bet);
          this.cycle(wins.ways);
        }
      } else if (!hold) this.setMeter('slots.noWin', '—', 'dim');
      if (hold) await this.holdAndWin(hold, wins ? wins.win : 0, settle.bet);
    },
    wayText(w) { return t('tb.way', { s: symName(w.sym), n: w.reels, w: w.ways }) + ' · ' + U.fmt(w.pay); },
    cycle(ways) {
      const id = this.cycleId;
      if (ways.length === 1) { this.meterLab.textContent = this.wayText(ways[0]); delete this.meterLab.dataset.i18n; return; }
      let k = 0;
      const step = () => {
        if (id !== this.cycleId) return;
        const w = ways[k++ % ways.length];
        U.$$('.cell.hit', this.reelsEl).forEach(c => c.classList.remove('hit'));
        w.cells.forEach(([r, row]) => this.cellEl(r, row).classList.add('hit'));
        this.meterLab.textContent = this.wayText(w); delete this.meterLab.dataset.i18n;
        this.cycleT = setTimeout(step, 1200);
      };
      this.cycleT = setTimeout(step, 900);
    },

    /* Hold & Win: coins lock, three respins, every new coin resets the count */
    async holdAndWin(h, waysWin, bet) {
      const held = new Set(h.start.map(c => c.r + ':' + c.row));
      h.start.forEach(c => U.pulse(this.cellEl(c.r, c.row), 'mega'));
      Sound.fx.fanfare(2); Sound.say(t('tb.say'));
      FX.flash('gold');
      await this.wait(900);
      await this.banner(t('tb.hold'), t('tb.holdSub'), 'tb-banner', 2600);
      this.cab.classList.add('hold');
      // everything that is not a coin empties out
      for (let r = 0; r < 5; r++) for (let row = 0; row < 3; row++) {
        const el = this.cellEl(r, row);
        if (held.has(r + ':' + row)) el.classList.add('held');
        else el.outerHTML = this.cellHTML(null);
      }
      this.setMeter('tb.respins', '3', 'good');
      for (const [i, sp] of h.respins.entries()) {
        const empties = U.$$('.tb-empty', this.reelsEl);
        const last = i === h.respins.length - 1 && !sp.landed.length;
        empties.forEach(el => el.classList.add('spin'));
        const hb = sp.left === 1 || (i && h.respins[i - 1].left === 1);
        if (hb) Sound.fx.heartbeat();
        const ms = hb ? 1300 : 800;
        for (let k = 0; k < ms / 90; k++) { setTimeout(() => Sound.fx.tick(0.9), k * 90); }
        await this.wait(ms);
        empties.forEach(el => el.classList.remove('spin'));
        for (const c of sp.landed) {
          const el = this.cellEl(c.r, c.row);
          el.outerHTML = this.cellHTML({ s: SYM.COIN, v: c.v });
          const ne = this.cellEl(c.r, c.row);
          ne.classList.add('held'); U.pulse(ne, 'pop');
          const p = U.center(ne); FX.sparks(p.x, p.y, 16, 'gold', 1.1);
          Sound.fx.scatterLand(4); U.vibrate(15);
          await this.wait(220);
        }
        this.setMeter('tb.respins', String(sp.left), sp.landed.length ? 'good' : sp.left === 1 ? '' : 'good');
        U.pulse(this.meterVal, 'punch');
        if (sp.landed.length) Sound.fx.tierUp(0);
        if (last) break;
        await this.wait(300);
      }
      if (h.full) {
        Sound.fx.fanfare(2); FX.flash('gold'); FX.shake(10, 500);
        await this.banner(t('tb.jp.grand'), t('tb.full'), 'tb-banner jp', 3000);
      }
      // count every coin into the meter, in reading order
      const order = h.coins.slice().sort((a, b) => a.r - b.r || a.row - b.row);
      let sum = 0;
      this.setMeter('tb.collect', U.fmt(waysWin), 'good');
      sum = waysWin;
      for (const c of order) {
        const el = this.cellEl(c.r, c.row);
        el.classList.add('hit');
        const p = U.center(el);
        if (typeof c.v === 'string') await this.jackpot(c.v, c.amount);
        FX.float(p.x, p.y, '+' + U.fmt(c.amount), 'good');
        Sound.fx.coin(1 + Math.min(1, sum / Math.max(1, h.total)));
        const from = sum; sum += c.amount;
        await FX.countUp(this.meterVal, from, sum, this.T ? 120 : 260, { tick: false });
        el.classList.remove('hit'); el.classList.add('done');
      }
      const grand = h.jackpots.find(j => j.tier === 'grand');
      if (grand) { await this.jackpot('grand', grand.amount); sum += grand.amount; }
      this.cab.classList.remove('hold');
      this.grid = this.reels.map((_, r) => [0, 1, 2].map(row => { const c = h.coins.find(x => x.r === r && x.row === row); return c ? { s: SYM.COIN, v: c.v } : this.filler(r); }));
      this.reels.forEach((rl, r) => { rl.strip.innerHTML = this.grid[r].map(c => this.cellHTML(c)).join(''); });
      await this.showWin(sum, bet, 'tb.total', 0);
      this.paintJp();
    },
    async jackpot(tier, amount) {
      const el = this.jpEl.querySelector('.jp-' + tier);
      if (el) U.pulse(el, 'jp-hit');
      Sound.fx.fanfare(tier === 'mini' ? 1 : 2);
      Sound.say(t('tb.jp.' + tier) + ' ' + t('tb.jpWord'));
      FX.flash('gold');
      const c = U.center(this.frame); FX.confetti(c.x, c.y, tier === 'mini' ? 40 : 120, 1.3); FX.coins(c.x, c.y, 24);
      await this.banner(t('tb.jp.' + tier) + ' ' + t('tb.jpWord'), U.fmt(amount), 'tb-banner jp', 2600);
    }
  });
  C.register(G);
})();
