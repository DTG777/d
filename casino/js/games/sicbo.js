/* Sic Bo (骰宝): three dice under a shaking cup, full Macau bet layout */
(function () {
  const t = (k, v) => I18N.t(k, v);
  const TOTAL_PAY = { 4: 60, 5: 30, 6: 17, 7: 12, 8: 8, 9: 6, 10: 6, 11: 6, 12: 6, 13: 8, 14: 12, 15: 17, 16: 30, 17: 60 };
  const PIPS = {
    1: [[2, 2]], 2: [[1, 1], [3, 3]], 3: [[1, 1], [2, 2], [3, 3]],
    4: [[1, 1], [1, 3], [3, 1], [3, 3]], 5: [[1, 1], [1, 3], [2, 2], [3, 1], [3, 3]],
    6: [[1, 1], [2, 1], [3, 1], [1, 3], [2, 3], [3, 3]]
  };
  const die = (n, cls = '') => `<span class="die f${n} ${cls}">${PIPS[n].map(([r, c]) => `<i style="grid-area:${r}/${c}"></i>`).join('')}</span>`;

  function payout(key, amt, d) {
    const sum = d[0] + d[1] + d[2], triple = d[0] === d[1] && d[1] === d[2];
    const cnt = n => d.filter(x => x === n).length;
    if (key === 'small') return !triple && sum <= 10 ? amt * 2 : 0;
    if (key === 'big') return !triple && sum >= 11 ? amt * 2 : 0;
    if (key === 'odd') return !triple && sum % 2 === 1 ? amt * 2 : 0;
    if (key === 'even') return !triple && sum % 2 === 0 ? amt * 2 : 0;
    if (key === 'any3') return triple ? amt * 31 : 0;
    const n = +key.slice(1);
    if (key[0] === 't') return triple && d[0] === n ? amt * 181 : 0;
    if (key[0] === 'd') return cnt(n) >= 2 ? amt * 11 : 0;
    if (key[0] === 'x') return sum === n ? amt * (TOTAL_PAY[n] + 1) : 0;
    if (key[0] === 's') { const c = cnt(n); return c ? amt * (c + 1) : 0; }
    return 0;
  }

  const G = {
    id: 'sicbo', state: 'bet', road: LS.get('sbRoad', []),

    init(root) {
      const nums = [1, 2, 3, 4, 5, 6];
      root.innerHTML = `
        <div class="sb-top">
          <div class="sb-stage">
            <div class="sb-plate"><div class="sb-dice"></div></div>
            <button class="sb-cup" aria-label="Cup"><span class="cup-knob"></span><span class="cup-hint" data-i18n="sb.open">${t('sb.open')}</span></button>
            <div class="sb-total" hidden></div>
          </div>
          <div class="sb-side">
            <div class="side-block"><div class="side-lab" data-i18n="sb.road">${t('sb.road')}</div><div class="road sb-road"></div></div>
            <div class="side-block"><div class="side-lab" data-i18n="ui.totalBet">${t('ui.totalBet')}</div><div class="side-val sb-tot">0</div></div>
          </div>
        </div>
        <div class="felt sb-board">
          <div class="sb-row sb-main">
            <button class="sb-cell big-cell" data-bet="small"><b class="zh-big" data-i18n="sb.small">${t('sb.small')}</b><small>4 – 10</small><em>1:1</em></button>
            <button class="sb-cell" data-bet="odd"><b data-i18n="sb.odd">${t('sb.odd')}</b><em>1:1</em></button>
            <button class="sb-cell any3" data-bet="any3"><b data-i18n="sb.any3">${t('sb.any3')}</b><span class="mini-dice">${die(1, 'mini')}${die(1, 'mini')}${die(1, 'mini')}</span><em>30:1</em></button>
            <button class="sb-cell" data-bet="even"><b data-i18n="sb.even">${t('sb.even')}</b><em>1:1</em></button>
            <button class="sb-cell big-cell" data-bet="big"><b class="zh-big" data-i18n="sb.big">${t('sb.big')}</b><small>11 – 17</small><em>1:1</em></button>
          </div>
          <div class="sb-row sb-six">${nums.map(n => `<button class="sb-cell" data-bet="d${n}" aria-label="double ${n}"><span class="mini-dice">${die(n, 'mini')}${die(n, 'mini')}</span><em>10:1</em></button>`).join('')}</div>
          <div class="sb-row sb-six">${nums.map(n => `<button class="sb-cell trip" data-bet="t${n}" aria-label="triple ${n}"><span class="mini-dice">${die(n, 'mini')}${die(n, 'mini')}${die(n, 'mini')}</span><em>180:1</em></button>`).join('')}</div>
          <div class="sb-row sb-totals">${Object.keys(TOTAL_PAY).map(n => `<button class="sb-cell tot" data-bet="x${n}"><b>${n}</b><em>${TOTAL_PAY[n]}:1</em></button>`).join('')}</div>
          <div class="sb-row sb-six">${nums.map(n => `<button class="sb-cell single" data-bet="s${n}" aria-label="single ${n}">${die(n, 'mid')}<em>1:1 · 2:1 · 3:1</em></button>`).join('')}</div>
        </div>
        <div class="table-controls">
          <div class="chips-row"></div>
          <div class="btn-row">
            <button class="btn btn-ghost b-undo">${C.icon('undo')}<span data-i18n="ui.undo">${t('ui.undo')}</span></button>
            <button class="btn btn-ghost b-clear">${C.icon('clear')}<span data-i18n="ui.clear">${t('ui.clear')}</span></button>
            <button class="btn btn-ghost b-rebet">${C.icon('repeat')}<span data-i18n="ui.rebet">${t('ui.rebet')}</span></button>
            <button class="btn btn-ghost b-x2">${C.icon('double')}<span>×2</span></button>
            <button class="btn btn-gold btn-lg b-roll"><span data-i18n="sb.roll">${t('sb.roll')}</span></button>
          </div>
        </div>`;
      this.root = root;
      const $ = s => root.querySelector(s);
      this.$ = $;
      this.cup = $('.sb-cup'); this.diceEl = $('.sb-dice'); this.totEl = $('.sb-total');
      this.board = $('.sb-board');
      this.chips = C.ChipBar($('.chips-row'));
      this.bb = new C.BetBoard({ root: this.board, chips: this.chips, canBet: () => this.state === 'bet', onChange: () => this.sync() });
      $('.b-undo').onclick = () => this.bb.undo();
      $('.b-clear').onclick = () => this.bb.clear();
      $('.b-rebet').onclick = () => this.bb.rebet();
      $('.b-x2').onclick = () => this.bb.double();
      $('.b-roll').onclick = () => this.roll();
      this.cup.onclick = () => { if (this.state === 'wait' && this._open) this._open(); };
      this.diceEl.innerHTML = [U.randInt(1, 6), U.randInt(1, 6), U.randInt(1, 6)].map((n, i) => die(n, 'big p' + i)).join('');
      this.renderRoad();
      this.sync();
    },
    key(e) {
      if (e.key === ' ' || e.key === 'Enter') {
        if (this.state === 'wait' && this._open) this._open(); else this.roll();
        return true;
      }
    },
    sync() {
      const $ = this.$, bet = this.state === 'bet', tot = this.bb.total();
      $('.sb-tot').textContent = U.fmt(tot);
      $('.b-roll').disabled = !bet || !tot;
      $('.b-undo').disabled = !bet || !this.bb.hist.length;
      $('.b-clear').disabled = !bet || !tot;
      $('.b-rebet').disabled = !bet || !this.bb.last;
      $('.b-x2').disabled = !bet || !tot;
      this.board.classList.toggle('locked', !bet);
    },

    async roll() {
      Sound.unlock();
      if (this.state !== 'bet') return;
      if (!this.bb.total()) { Sound.fx.error(); C.toast(t('ui.placeBetFirst')); return; }
      this.state = 'roll'; this.sync();
      U.$$('.lit', this.board).forEach(c => c.classList.remove('lit'));
      this.totEl.hidden = true;
      const d = [U.randInt(1, 6), U.randInt(1, 6), U.randInt(1, 6)];

      // cover and shake
      this.cup.classList.remove('lift', 'peek');
      this.cup.classList.add('down');
      await U.sleep(350);
      Sound.fx.thud(0.8);
      this.diceEl.innerHTML = d.map((n, i) => die(n, 'big p' + i)).join('');
      U.$$('.die', this.diceEl).forEach(el => { el.style.setProperty('--r', U.rand(-35, 35) + 'deg'); el.style.setProperty('--dx', U.rand(-8, 8) + 'px'); el.style.setProperty('--dy', U.rand(-6, 6) + 'px'); });
      this.cup.classList.add('shake');
      Sound.fx.diceRattle(1.3);
      U.vibrate([20, 30, 20, 30, 20]);
      await U.sleep(U.reduced ? 400 : 1350);
      this.cup.classList.remove('shake');
      Sound.fx.diceLand();
      FX.shake(4, 200);

      // wait for the player to open, or auto after a moment
      this.state = 'wait';
      this.cup.classList.add('ready');
      await new Promise(res => {
        const timer = setTimeout(() => this._open && this._open(), 2600);
        this._open = () => { clearTimeout(timer); this._open = null; res(); };
      });
      this.cup.classList.remove('ready');
      this.state = 'reveal';
      this.cup.classList.add('peek');
      Sound.fx.heartbeat();
      await U.sleep(650);
      this.cup.classList.add('lift');
      Sound.fx.whoosh(true, 0.3);
      await U.sleep(380);
      await this.showResult(d);
    },
    async showResult(d) {
      const sum = d[0] + d[1] + d[2], triple = d[0] === d[1] && d[1] === d[2];
      const kind = triple ? 'trip' : sum >= 11 ? 'big' : 'small';
      this.totEl.hidden = false;
      this.totEl.className = 'sb-total show ' + kind;
      this.totEl.innerHTML = `<b>${sum}</b><span>${triple ? t('sb.triple') : t(kind === 'big' ? 'sb.big' : 'sb.small')}</span>`;
      Sound.fx.win(0);
      Sound.say(`${sum}${I18N.lang === 'zh' ? '点' : ''}, ${triple ? t('sb.triple') : t(kind === 'big' ? 'sb.big' : 'sb.small')}`);
      if (triple) { FX.flash('red'); const c = U.center(this.diceEl); FX.confetti(c.x, c.y, 60); }
      this.road.push({ s: sum, k: kind }); this.road = this.road.slice(-72); LS.set('sbRoad', this.road);
      this.renderRoad();
      U.$$('[data-bet]', this.board).forEach(c => { if (payout(c.dataset.bet, 1, d) > 0) c.classList.add('lit'); });
      await U.sleep(600);
      const { ret, bet } = await this.bb.settle((k, a) => payout(k, a, d));
      if (ret > bet) C.toast(t('ui.youWin', { n: U.fmt(ret - bet) }), 'good');
      if (ret >= bet * 10) await FX.bigWin(ret, bet);
      else if (!ret) Sound.fx.lose();
      await U.sleep(1300);
      this.bb.reset();
      this.cup.classList.remove('down', 'peek', 'lift');
      this.state = 'bet'; this.sync();
    },
    renderRoad() {
      const el = this.root.querySelector('.sb-road');
      const cells = [];
      const last = this.road.slice(-72);
      for (let i = 0; i < 72; i++) {
        const r = last[i];
        cells.push(r ? `<i class="bead ${r.k}${i === last.length - 1 ? ' new' : ''}">${r.s}</i>` : '<i class="bead empty"></i>');
      }
      el.innerHTML = cells.join('');
      const big = last.filter(r => r.k === 'big').length, small = last.filter(r => r.k === 'small').length;
      el.dataset.stats = `${t('sb.big')} ${big} · ${t('sb.small')} ${small}`;
    },
    rules() { return t('sb.rules'); }
  };
  C.register(G);
})();
