/* Baccarat (百家乐) with punto banco drawing rules and drag-to-squeeze reveals */
(function () {
  const t = (k, v) => I18N.t(k, v);
  const pv = c => c.r === 'A' ? 1 : ['10', 'J', 'Q', 'K'].includes(c.r) ? 0 : +c.r;
  const pts = cards => cards.reduce((a, c) => a + pv(c), 0) % 10;

  function bankerDraws(b, p3) {
    if (p3 == null) return b <= 5;
    if (b <= 2) return true;
    if (b === 3) return p3 !== 8;
    if (b === 4) return p3 >= 2 && p3 <= 7;
    if (b === 5) return p3 >= 4 && p3 <= 7;
    if (b === 6) return p3 === 6 || p3 === 7;
    return false;
  }
  function payout(key, amt, r) {
    const tie = r.p === r.b;
    if (key === 'player') return r.p > r.b ? amt * 2 : tie ? amt : 0;
    if (key === 'banker') return r.b > r.p ? amt * 1.95 : tie ? amt : 0;
    if (key === 'tie') return tie ? amt * 9 : 0;
    if (key === 'pp') return r.pPair ? amt * 12 : 0;
    if (key === 'bp') return r.bPair ? amt * 12 : 0;
    return 0;
  }

  const G = {
    id: 'baccarat', state: 'bet', road: LS.get('bcRoad', []), squeeze: LS.get('bcSqueeze', true),

    init(root) {
      root.innerHTML = `
        <div class="felt bc-table">
          <div class="shoe" aria-hidden="true"><i></i><i></i><i></i></div>
          <div class="bc-sides">
            <div class="bc-side player"><div class="bc-name"><b data-i18n="bc.player">${t('bc.player')}</b></div><div class="hand bc-hand p-cards"></div><div class="pts p-pts" hidden></div></div>
            <div class="bc-side banker"><div class="bc-name"><b data-i18n="bc.banker">${t('bc.banker')}</b></div><div class="hand bc-hand b-cards"></div><div class="pts b-pts" hidden></div></div>
          </div>
          <div class="table-msg" aria-live="polite"></div>
          <div class="bc-bets">
            <button class="bc-cell side-bet p" data-bet="pp"><b data-i18n="bc.pp">${t('bc.pp')}</b><em>11:1</em></button>
            <button class="bc-cell main p" data-bet="player"><b data-i18n="bc.player">${t('bc.player')}</b><em>1:1</em></button>
            <button class="bc-cell main tie" data-bet="tie"><b data-i18n="bc.tie">${t('bc.tie')}</b><em>8:1</em></button>
            <button class="bc-cell main b" data-bet="banker"><b data-i18n="bc.banker">${t('bc.banker')}</b><em>0.95:1</em></button>
            <button class="bc-cell side-bet b" data-bet="bp"><b data-i18n="bc.bp">${t('bc.bp')}</b><em>11:1</em></button>
          </div>
        </div>
        <div class="bc-under">
          <div class="side-block grow"><div class="side-lab"><span data-i18n="bc.road">${t('bc.road')}</span><span class="road-count"></span></div><div class="road bc-road"></div></div>
          <label class="switch"><input type="checkbox" id="bc-squeeze" ${this.squeeze ? 'checked' : ''}><span class="sw"></span><span data-i18n="bc.squeeze">${t('bc.squeeze')}</span></label>
        </div>
        <div class="table-controls">
          <div class="chips-row"></div>
          <div class="btn-row">
            <button class="btn btn-ghost b-undo">${C.icon('undo')}<span data-i18n="ui.undo">${t('ui.undo')}</span></button>
            <button class="btn btn-ghost b-clear">${C.icon('clear')}<span data-i18n="ui.clear">${t('ui.clear')}</span></button>
            <button class="btn btn-ghost b-rebet">${C.icon('repeat')}<span data-i18n="ui.rebet">${t('ui.rebet')}</span></button>
            <button class="btn btn-ghost b-x2">${C.icon('double')}<span>×2</span></button>
            <button class="btn btn-gold btn-lg b-deal"><span data-i18n="bj.deal">${t('bj.deal')}</span></button>
          </div>
        </div>`;
      this.root = root;
      const $ = s => root.querySelector(s);
      this.$ = $;
      this.shoeEl = $('.shoe');
      this.pEl = $('.p-cards'); this.bEl = $('.b-cards');
      this.pPts = $('.p-pts'); this.bPts = $('.b-pts');
      this.msg = $('.table-msg');
      this.betsEl = $('.bc-bets');
      this.chips = C.ChipBar($('.chips-row'));
      this.bb = new C.BetBoard({ root: this.betsEl, chips: this.chips, canBet: () => this.state === 'bet', onChange: () => this.sync() });
      $('.b-undo').onclick = () => this.bb.undo();
      $('.b-clear').onclick = () => this.bb.clear();
      $('.b-rebet').onclick = () => this.bb.rebet();
      $('.b-x2').onclick = () => this.bb.double();
      $('.b-deal').onclick = () => this.deal();
      $('#bc-squeeze').onchange = e => { this.squeeze = e.target.checked; LS.set('bcSqueeze', this.squeeze); Sound.fx.click(); };
      this.shoe = C.shoe(8);
      this.renderRoad();
      this.sync();
    },
    leave() { if (this._sqClose) this._sqClose(true); },
    key(e) {
      if (e.key === ' ' || e.key === 'Enter') {
        if (this._sqClose) this._sqClose(true); else this.deal();
        return true;
      }
    },
    sync() {
      const $ = this.$, bet = this.state === 'bet', tot = this.bb.total();
      $('.b-deal').disabled = !bet || !tot;
      $('.b-undo').disabled = !bet || !this.bb.hist.length;
      $('.b-clear').disabled = !bet || !tot;
      $('.b-rebet').disabled = !bet || !this.bb.last;
      $('.b-x2').disabled = !bet || !tot;
      this.betsEl.classList.toggle('locked', !bet);
    },
    draw() {
      if (this.shoe.length < 12) { this.shoe = C.shoe(8); Sound.fx.shuffle(); C.toast(t('ui.shuffle')); }
      return this.shoe.pop();
    },
    showMsg(text, cls = '') { this.msg.className = 'table-msg ' + cls; this.msg.textContent = text; if (text) U.pulse(this.msg, 'show'); },
    setPts(side, cards) {
      const el = side === 'p' ? this.pPts : this.bPts;
      el.hidden = false; el.textContent = pts(cards);
      U.pulse(el, 'pop'); Sound.fx.tick(1.2);
    },

    async deal() {
      Sound.unlock();
      if (this.state !== 'bet') return;
      if (!this.bb.total()) { Sound.fx.error(); C.toast(t('ui.placeBetFirst')); return; }
      this.state = 'deal'; this.sync();
      this.pEl.innerHTML = ''; this.bEl.innerHTML = '';
      this.pPts.hidden = this.bPts.hidden = true;
      this.showMsg('');
      U.$$('.bc-side', this.root).forEach(s => s.classList.remove('winner'));
      const P = [], B = [];
      const els = [];
      for (let i = 0; i < 2; i++) {
        P.push(this.draw()); els.push(['p', await C.dealCard(P[i], this.pEl, { from: this.shoeEl, faceDown: true })]);
        B.push(this.draw()); els.push(['b', await C.dealCard(B[i], this.bEl, { from: this.shoeEl, faceDown: true })]);
      }
      await U.sleep(250);
      // reveal player's two, then banker's two
      for (const side of ['p', 'b']) {
        for (const [s, el] of els) if (s === side) await this.reveal(el);
        this.setPts(side, side === 'p' ? P : B);
        await U.sleep(250);
      }
      let p = pts(P), b = pts(B);
      const natural = p >= 8 || b >= 8;
      if (natural) {
        this.showMsg(t('bc.natural', { n: Math.max(p, b) }), 'bj');
        Sound.say(t('bc.natural', { n: Math.max(p, b) }));
        await U.sleep(900);
      } else {
        let p3 = null;
        if (p <= 5) {
          this.showMsg(t('bc.pDraws'), 'info'); await U.sleep(500);
          const c = this.draw(); P.push(c); p3 = pv(c);
          const el = await C.dealCard(c, this.pEl, { from: this.shoeEl, faceDown: true, sideways: true });
          await this.reveal(el, true);
          this.setPts('p', P); p = pts(P);
        }
        if (bankerDraws(b, p3)) {
          this.showMsg(t('bc.bDraws'), 'info'); await U.sleep(500);
          const c = this.draw(); B.push(c);
          const el = await C.dealCard(c, this.bEl, { from: this.shoeEl, faceDown: true, sideways: true });
          await this.reveal(el, true);
          this.setPts('b', B); b = pts(B);
        }
      }
      await this.finish({ p, b, pPair: P[0].r === P[1].r, bPair: B[0].r === B[1].r });
    },

    async reveal(el, third) {
      if (this.squeeze && C.current === 'baccarat') return this.squeezeCard(el);
      if (third) { Sound.fx.heartbeat(); el.classList.add('tease'); await U.sleep(700); el.classList.remove('tease'); }
      C.flip(el); await U.sleep(third ? 450 : 320);
    },

    /* drag the card's bottom edge upward to peel it open */
    squeezeCard(tableEl) {
      return new Promise(res => {
        const card = tableEl._card;
        const big = C.cardEl(card, false); big.classList.add('sq-front');
        const back = U.h('div', { class: 'sq-back' }), flap = U.h('div', { class: 'sq-flap' });
        const wrap = U.h('div', { class: 'sq-card' }, big, back, flap);
        const ov = U.h('div', { class: 'sq-ov' },
          U.h('div', { class: 'sq-hint' }, t('bc.sqHint')),
          wrap,
          U.h('button', { class: 'btn btn-gold sq-open' }, t('bc.sqOpen')));
        document.body.appendChild(ov);
        Sound.fx.whoosh(true, 0.25);
        let f = 0, dragging = false, y0 = 0, f0 = 0, lastStep = 0, closed = false, beat = 0;
        const H = () => wrap.getBoundingClientRect().height;
        const paint = () => {
          back.style.clipPath = `inset(0 0 ${f * 100}% 0)`;
          const fh = Math.min(f, 1 - f) * 0.35 + (f > 0 && f < 1 ? 0.03 : 0);
          flap.style.bottom = (f * 100) + '%';
          flap.style.height = (fh * 100) + '%';
          flap.style.opacity = f > 0 && f < 1 ? 1 : 0;
          const s = Math.floor(f * 12);
          if (s !== lastStep) { lastStep = s; Sound.fx.tick(0.6 + f * 0.8); }
          const b = Math.floor(f * 3);
          if (b > beat && f < 0.9) { beat = b; Sound.fx.heartbeat(); }
        };
        const finish = (instant) => {
          if (closed) return; closed = true;
          this._sqClose = null;
          const end = () => {
            Sound.fx.flip();
            ov.classList.add('out');
            C.flip(tableEl);
            U.pulse(tableEl, 'pop');
            setTimeout(() => { ov.remove(); res(); }, instant ? 150 : 350);
          };
          if (instant) { f = 1; paint(); end(); }
          else { const from = f; U.tween(220, e => { f = from + (1 - from) * e; paint(); }).then(end); }
        };
        this._sqClose = finish;
        wrap.addEventListener('pointerdown', e => { dragging = true; y0 = e.clientY; f0 = f; wrap.setPointerCapture(e.pointerId); ov.classList.add('dragging'); });
        wrap.addEventListener('pointermove', e => {
          if (!dragging || closed) return;
          f = U.clamp(f0 + (y0 - e.clientY) / (H() * 0.85), 0, 1); paint();
          if (f > 0.97) finish();
        });
        const up = () => { if (!dragging) return; dragging = false; ov.classList.remove('dragging'); if (f > 0.62) finish(); };
        wrap.addEventListener('pointerup', up); wrap.addEventListener('pointercancel', up);
        ov.querySelector('.sq-open').onclick = () => finish();
        paint();
      });
    },

    async finish(r) {
      this.state = 'settle';
      const win = r.p > r.b ? 'player' : r.b > r.p ? 'banker' : 'tie';
      const key = { player: 'bc.playerWins', banker: 'bc.bankerWins', tie: 'bc.tieResult' }[win];
      this.showMsg(t(key) + (win !== 'tie' ? ` ${Math.max(r.p, r.b)} : ${Math.min(r.p, r.b)}` : ` ${r.p}`), win === 'tie' ? 'tie' : 'win-' + win);
      Sound.say(t(key));
      if (win !== 'tie') this.root.querySelector('.bc-side.' + win).classList.add('winner');
      Sound.fx.win(0);
      this.road.push(win[0]); this.road = this.road.slice(-72); LS.set('bcRoad', this.road);
      this.renderRoad();
      U.$$('[data-bet]', this.betsEl).forEach(c => { if (payout(c.dataset.bet, 1, r) > 1 || (c.dataset.bet === win)) c.classList.add('lit'); });
      await U.sleep(500);
      const { ret, bet } = await this.bb.settle((k, a) => payout(k, a, r));
      if (ret > bet) C.toast(t('ui.youWin', { n: U.fmt(ret - bet) }), 'good');
      if (ret >= bet * 10) await FX.bigWin(ret, bet);
      else if (!ret) Sound.fx.lose();
      await U.sleep(1500);
      U.$$('.lit', this.betsEl).forEach(c => c.classList.remove('lit'));
      this.bb.reset();
      this.state = 'bet'; this.sync();
    },
    renderRoad() {
      const el = this.root.querySelector('.bc-road');
      const last = this.road.slice(-72);
      const cells = [];
      for (let i = 0; i < 72; i++) {
        const r = last[i];
        const lab = r ? t('bc.bead.' + r) : '';
        cells.push(r ? `<i class="bead ${r}${i === last.length - 1 ? ' new' : ''}">${lab}</i>` : '<i class="bead empty"></i>');
      }
      el.innerHTML = cells.join('');
      const c = k => last.filter(x => x === k).length;
      this.root.querySelector('.road-count').innerHTML = `<i class="dot b"></i>${c('b')} <i class="dot p"></i>${c('p')} <i class="dot t"></i>${c('t')}`;
    },
    rules() { return t('bc.rules'); }
  };
  C.register(G);
})();
