/* Blackjack: 6 decks, dealer stands on all 17s, 3:2 blackjack, double, one split */
(function () {
  const t = (k, v) => I18N.t(k, v);
  const cv = c => c.r === 'A' ? 11 : ['J', 'Q', 'K', '10'].includes(c.r) ? 10 : +c.r;
  function value(cards) {
    let total = 0, aces = 0;
    for (const c of cards) { total += cv(c); if (c.r === 'A') aces++; }
    while (total > 21 && aces) { total -= 10; aces--; }
    return { total, soft: aces > 0 && total <= 21 };
  }
  const isBJ = cards => cards.length === 2 && value(cards).total === 21;

  const G = {
    id: 'blackjack', state: 'bet', bet: 0, lastBet: LS.get('bjLast', 0), hands: [], dealer: [],

    init(root) {
      root.innerHTML = `
        <div class="felt bj-table">
          <div class="shoe" aria-hidden="true"><i></i><i></i><i></i></div>
          <div class="discard" aria-hidden="true"></div>
          <div class="bj-dealer">
            <div class="seat-label" data-i18n="bj.dealer">${t('bj.dealer')}</div>
            <div class="hand d-hand"></div>
            <div class="score d-score" hidden></div>
          </div>
          <div class="table-arc"><span data-i18n="bj.arc1">${t('bj.arc1')}</span><small data-i18n="bj.arc2">${t('bj.arc2')}</small></div>
          <div class="table-msg" aria-live="polite"></div>
          <div class="bj-hands"></div>
        </div>
        <div class="table-controls">
          <div class="phase phase-bet">
            <div class="chips-row"></div>
            <div class="btn-row">
              <button class="btn btn-ghost b-clear">${C.icon('clear')}<span data-i18n="ui.clear">${t('ui.clear')}</span></button>
              <button class="btn btn-ghost b-rebet">${C.icon('repeat')}<span data-i18n="ui.rebet">${t('ui.rebet')}</span></button>
              <button class="btn btn-ghost b-x2">${C.icon('double')}<span>×2</span></button>
              <button class="btn btn-gold btn-lg b-deal"><span data-i18n="bj.deal">${t('bj.deal')}</span></button>
            </div>
          </div>
          <div class="phase phase-play" hidden>
            <div class="btn-row">
              <button class="btn btn-act b-hit" data-k="H"><span data-i18n="bj.hit">${t('bj.hit')}</span><kbd>H</kbd></button>
              <button class="btn btn-act b-stand" data-k="S"><span data-i18n="bj.stand">${t('bj.stand')}</span><kbd>S</kbd></button>
              <button class="btn btn-act b-double" data-k="D"><span data-i18n="bj.double">${t('bj.double')}</span><kbd>D</kbd></button>
              <button class="btn btn-act b-split" data-k="P"><span data-i18n="bj.split">${t('bj.split')}</span><kbd>P</kbd></button>
            </div>
          </div>
        </div>`;
      this.root = root;
      this.$ = s => root.querySelector(s);
      this.shoeEl = this.$('.shoe');
      this.dHand = this.$('.d-hand'); this.dScore = this.$('.d-score');
      this.handsEl = this.$('.bj-hands');
      this.msg = this.$('.table-msg');
      this.chips = C.ChipBar(this.$('.chips-row'));
      this.$('.b-clear').onclick = () => this.clearBet();
      this.$('.b-rebet').onclick = () => this.rebet();
      this.$('.b-x2').onclick = () => this.doubleBet();
      this.$('.b-deal').onclick = () => this.deal();
      this.$('.b-hit').onclick = () => this.act('hit');
      this.$('.b-stand').onclick = () => this.act('stand');
      this.$('.b-double').onclick = () => this.act('double');
      this.$('.b-split').onclick = () => this.act('split');
      this.newShoe(true);
      this.resetTable();
    },
    leave() {},
    key(e) {
      const k = e.key.toLowerCase();
      if (this.state === 'bet' && (k === ' ' || k === 'enter')) { this.deal(); return true; }
      if (this.state === 'play') {
        const m = { h: 'hit', s: 'stand', d: 'double', p: 'split' }[k];
        if (m) { this.act(m); return true; }
      }
    },

    newShoe(silent) {
      this.shoe = C.shoe(6);
      if (!silent) { Sound.fx.shuffle(); C.toast(t('ui.shuffle')); }
    },
    draw() {
      if (this.shoe.length < 20) this.newShoe();
      return this.shoe.pop();
    },

    /* ---------- betting ---------- */
    spotHand() { return this.hands[0]; },
    makeHandEl(bet) {
      const root = U.h('div', { class: 'p-hand' },
        U.h('div', { class: 'hand' }),
        U.h('div', { class: 'score', hidden: true }),
        U.h('button', { class: 'bet-spot', 'aria-label': t('ui.placeBet') }, U.h('span', { class: 'spot-ring', 'data-i18n': 'ui.placeBet' }, t('ui.placeBet'))),
        U.h('div', { class: 'result-tag' }));
      const h = { cards: [], bet, root, hand: root.querySelector('.hand'), score: root.querySelector('.score'), spot: root.querySelector('.bet-spot'), tag: root.querySelector('.result-tag') };
      h.spot.onclick = () => this.addChip();
      return h;
    },
    resetTable() {
      this.state = 'bet';
      this.dealer = []; this.dHand.innerHTML = ''; this.dScore.hidden = true;
      this.handsEl.innerHTML = '';
      const h = this.makeHandEl(0);
      this.hands = [h]; this.handsEl.appendChild(h.root);
      this.bet = 0; this.renderSpot(h);
      this.showMsg('');
      this.phase('bet');
    },
    renderSpot(h, amount = h.bet) {
      const old = h.spot.querySelector('.stack'); if (old) old.remove();
      h.spot.classList.toggle('has', amount > 0);
      if (amount > 0) h.spot.appendChild(C.stack(amount));
    },
    addChip() {
      if (this.state !== 'bet') return;
      const v = this.chips.value;
      if (!C.take(v)) return;
      this.bet += v;
      const h = this.spotHand(); h.bet = this.bet;
      C.flyChip(this.chips.el, h.spot, v).then(() => { Sound.fx.chip(); this.renderSpot(h); U.pulse(h.spot, 'bump'); });
      this.syncBet();
    },
    clearBet() {
      if (this.state !== 'bet' || !this.bet) return;
      C.refund(this.bet); this.bet = 0; this.hands[0].bet = 0; this.renderSpot(this.hands[0]);
      Sound.fx.chipsSlide(); this.syncBet();
    },
    rebet() {
      if (this.state !== 'bet' || !this.lastBet) return;
      if (this.bet) this.clearBet();
      if (!C.take(this.lastBet)) return;
      this.bet = this.lastBet; this.hands[0].bet = this.bet; this.renderSpot(this.hands[0]);
      Sound.fx.chipsSlide(); this.syncBet();
    },
    doubleBet() {
      if (this.state !== 'bet' || !this.bet) return;
      if (!C.take(this.bet)) return;
      this.bet *= 2; this.hands[0].bet = this.bet; this.renderSpot(this.hands[0]);
      Sound.fx.chipsSlide(); this.syncBet();
    },
    syncBet() {
      this.$('.b-deal').disabled = !this.bet;
      this.$('.b-rebet').disabled = !this.lastBet;
      this.$('.b-x2').disabled = !this.bet;
      this.$('.b-clear').disabled = !this.bet;
    },
    phase(p) {
      this.$('.phase-bet').hidden = p !== 'bet';
      this.$('.phase-play').hidden = p === 'bet';
      if (p === 'bet') this.syncBet();
      this.syncPlay();
    },
    syncPlay() {
      const h = this.hands[this.active];
      const can = this.state === 'play' && h;
      this.$('.b-hit').disabled = !can;
      this.$('.b-stand').disabled = !can;
      this.$('.b-double').disabled = !(can && h.cards.length === 2 && C.S.balance >= h.bet);
      this.$('.b-split').disabled = !(can && this.hands.length === 1 && h.cards.length === 2 && cv(h.cards[0]) === cv(h.cards[1]) && C.S.balance >= h.bet);
    },
    showMsg(text, cls = '') {
      this.msg.className = 'table-msg ' + cls;
      this.msg.textContent = text;
      if (text) U.pulse(this.msg, 'show');
    },

    /* ---------- dealing ---------- */
    async giveP(h, opts = {}) {
      const c = this.draw(); h.cards.push(c);
      await C.dealCard(c, h.hand, { from: this.shoeEl, ...opts });
      this.renderScore(h);
      return c;
    },
    async giveD(faceDown) {
      const c = this.draw(); this.dealer.push(c);
      const el = await C.dealCard(c, this.dHand, { from: this.shoeEl, faceDown });
      if (faceDown) this.holeEl = el;
      this.renderDealerScore();
      return c;
    },
    renderScore(h) {
      const v = value(h.cards);
      h.score.hidden = !h.cards.length;
      h.score.className = 'score' + (v.total > 21 ? ' bust' : v.total === 21 ? ' good' : '');
      h.score.textContent = isBJ(h.cards) && this.hands.length === 1 ? 'BJ' : (v.soft && v.total < 21 ? `${v.total - 10}/${v.total}` : v.total);
      U.pulse(h.score, 'pop');
    },
    renderDealerScore(full) {
      const shown = full ? this.dealer : this.dealer.filter((c, i) => i !== 1 || !this.holeEl || !this.holeEl.classList.contains('down'));
      if (!shown.length) return;
      const v = value(shown);
      this.dScore.hidden = false;
      this.dScore.className = 'score d-score' + (v.total > 21 ? ' bust' : '');
      this.dScore.textContent = v.soft && v.total < 21 && full ? `${v.total}` : v.total;
      U.pulse(this.dScore, 'pop');
    },

    async deal() {
      Sound.unlock();
      if (this.state !== 'bet' || !this.bet) { if (!this.bet) { Sound.fx.error(); this.showMsg(t('ui.placeBetFirst'), 'info'); } return; }
      this.state = 'deal';
      this.lastBet = this.bet; LS.set('bjLast', this.bet);
      this.phase('play');
      this.showMsg('');
      this.holeEl = null;
      const h = this.hands[0];
      await this.giveP(h); await this.giveD(false);
      await this.giveP(h); await this.giveD(true);

      const up = this.dealer[0];
      const dealerBJ = isBJ(this.dealer);
      if (up.r === 'A' || cv(up) === 10) {
        this.holeEl.classList.add('peek');
        Sound.fx.heartbeat();
        await U.sleep(900);
        this.holeEl.classList.remove('peek');
        if (dealerBJ) {
          await this.reveal();
          return this.finish();
        }
      }
      if (isBJ(h.cards)) {
        Sound.say(t('bj.sayBJ'));
        await this.reveal();
        return this.finish();
      }
      this.state = 'play';
      for (this.active = 0; this.active < this.hands.length; this.active++) {
        await this.playHand(this.hands[this.active]);
      }
      this.active = -1; this.syncPlay();
      const live = this.hands.some(x => value(x.cards).total <= 21);
      await this.reveal();
      if (live) await this.dealerPlay();
      this.finish();
    },

    act(a) {
      if (!this._act) return;
      if (a === 'double' && this.$('.b-double').disabled) return Sound.fx.error();
      if (a === 'split' && this.$('.b-split').disabled) return Sound.fx.error();
      Sound.fx.click();
      const f = this._act; this._act = null; f(a);
    },
    async playHand(h) {
      this.hands.forEach(x => x.root.classList.toggle('active', x === h && this.hands.length > 1));
      if (h.splitAce) { this.renderScore(h); return; }
      while (true) {
        const v = value(h.cards).total;
        if (v >= 21) {
          if (v > 21) await this.bust(h);
          return;
        }
        this.state = 'play'; this.syncPlay();
        const a = await new Promise(r => { this._act = r; });
        this.state = 'busy'; this.syncPlay();
        if (a === 'stand') return;
        if (a === 'hit') { await this.giveP(h); continue; }
        if (a === 'double') {
          if (!C.take(h.bet)) continue;
          h.bet *= 2; h.doubled = true;
          Sound.fx.chipsSlide(); this.renderSpot(h);
          await this.giveP(h, { sideways: true });
          if (value(h.cards).total > 21) await this.bust(h);
          return;
        }
        if (a === 'split') { await this.split(h); if (h.splitAce) return; continue; }
      }
    },
    async split(h) {
      if (!C.take(h.bet)) return;
      const h2 = this.makeHandEl(h.bet);
      h2.spot.onclick = null; h.spot.onclick = null;
      const moved = h.hand.lastElementChild;
      h2.cards.push(h.cards.pop());
      this.hands.push(h2); this.handsEl.appendChild(h2.root);
      h2.hand.appendChild(moved);
      this.renderSpot(h2); Sound.fx.chipsSlide();
      this.handsEl.classList.add('split');
      const aces = h.cards[0].r === 'A';
      await this.giveP(h);
      await this.giveP(h2);
      if (aces) { h.splitAce = h2.splitAce = true; }
      this.renderScore(h); this.renderScore(h2);
      this.hands.forEach(x => x.root.classList.toggle('active', x === h));
      if (aces) this.active = this.hands.length; // both hands done
    },
    async bust(h) {
      h.bust = true;
      Sound.fx.bust(); FX.shake(6, 300);
      h.tag.textContent = t('bj.bust'); h.tag.className = 'result-tag lose show';
      Sound.say(t('bj.sayBust'));
      const st = h.spot.querySelector('.stack');
      if (st) st.animate([{ transform: 'none', opacity: 1 }, { transform: 'translateY(-160px) scale(.6)', opacity: 0 }], { duration: 600, easing: 'ease-in', fill: 'forwards' });
      await U.sleep(500);
    },
    async reveal() {
      if (this.holeEl && this.holeEl.classList.contains('down')) {
        await U.sleep(250);
        C.flip(this.holeEl);
        await U.sleep(300);
      }
      this.renderDealerScore(true);
    },
    async dealerPlay() {
      while (value(this.dealer).total < 17) {
        await U.sleep(550);
        await this.giveD(false);
        this.renderDealerScore(true);
      }
      if (value(this.dealer).total > 21) {
        Sound.say(t('bj.sayDealerBust'));
        this.showMsg(t('bj.dealerBust'), 'win');
      }
    },
    async finish() {
      this.state = 'settle'; this.syncPlay();
      const d = value(this.dealer).total, dBJ = isBJ(this.dealer);
      let total = 0, staked = 0, anyWin = false, anyBJ = false;
      for (const h of this.hands) {
        staked += h.bet;
        const v = value(h.cards).total;
        const pBJ = isBJ(h.cards) && this.hands.length === 1;
        let ret = 0, res;
        if (h.bust) { res = 'lose'; }
        else if (dBJ) { res = pBJ ? 'push' : 'lose'; ret = pBJ ? h.bet : 0; }
        else if (pBJ) { res = 'bj'; ret = h.bet * 2.5; }
        else if (d > 21 || v > d) { res = 'win'; ret = h.bet * 2; }
        else if (v === d) { res = 'push'; ret = h.bet; }
        else res = 'lose';
        total += ret;
        await this.settleHand(h, res, ret);
      }
      const net = total - staked;
      anyWin = this.hands.some(h => h.res === 'win' || h.res === 'bj');
      anyBJ = this.hands.some(h => h.res === 'bj');
      if (anyBJ) {
        this.showMsg(t('bj.blackjack'), 'bj');
        FX.flash('gold');
        const c = U.center(this.msg); FX.confetti(c.x, c.y, 70); FX.sparks(c.x, c.y, 30, 'gold', 1.5);
        Sound.fx.fanfare(0);
      } else if (anyWin && net > 0) {
        if (!this.msg.textContent) this.showMsg(t('ui.youWin', { n: U.fmt(net) }), 'win');
        Sound.fx.win(this.hands.length > 1 ? 1 : 0);
        if (!this.hands.every(h => h.res === 'win')) { /* mixed split */ }
        else Sound.say(t('ui.sayWin'));
      } else if (net === 0 && this.hands.some(h => h.res === 'push')) {
        this.showMsg(t('bj.push'), 'info'); Sound.fx.chipsSlide();
      } else if (net < 0) {
        this.showMsg(dBJ ? t('bj.dealerBJ') : t('bj.dealerWins'), 'lose');
        if (!this.hands.every(h => h.bust)) Sound.fx.lose();
      }
      C.record(total, staked);
      await U.sleep(1600);
      await this.sweep();
      this.resetTable();
      this.hands[0].bet = 0;
    },
    async settleHand(h, res, ret) {
      h.res = res;
      const labels = { win: t('bj.win'), bj: 'BLACKJACK', push: t('bj.push'), lose: h.bust ? t('bj.bust') : t('bj.lose') };
      h.tag.textContent = labels[res]; h.tag.className = 'result-tag show ' + res;
      if (res === 'win' || res === 'bj') {
        await C.flyChip(this.dHand, h.spot, C.decompose(ret - h.bet)[0] || 10);
        Sound.fx.chip();
        this.renderSpot(h, ret);
        U.pulse(h.spot, 'bump');
        const c = U.center(h.spot); FX.sparks(c.x, c.y, 18, 'gold');
        await U.sleep(350);
        C.pay(ret, h.spot);
        this.renderSpot(h, 0);
      } else if (res === 'push') {
        C.pay(ret, h.spot, false); this.renderSpot(h, 0);
      } else if (!h.bust) {
        const st = h.spot.querySelector('.stack');
        if (st) await st.animate([{ transform: 'none', opacity: 1 }, { transform: 'translateY(-160px) scale(.6)', opacity: 0 }], { duration: 500, easing: 'ease-in', fill: 'forwards' }).finished.catch(() => {});
        Sound.fx.chipsSlide();
      }
      await U.sleep(200);
    },
    async sweep() {
      const cards = U.$$('.card', this.root);
      const to = this.$('.discard').getBoundingClientRect();
      Sound.fx.whoosh(false, 0.35);
      await Promise.all(cards.map((c, i) => {
        const r = c.getBoundingClientRect();
        return c.animate([{ transform: getComputedStyle(c).transform === 'none' ? 'none' : getComputedStyle(c).transform, opacity: 1 },
          { transform: `translate(${to.left - r.left}px,${to.top - r.top}px) rotate(20deg) scale(.6)`, opacity: 0 }],
          { duration: 420, delay: i * 25, easing: 'ease-in', fill: 'forwards' }).finished.catch(() => {});
      }));
      this.handsEl.classList.remove('split');
    },

    rules() { return t('bj.rules'); }
  };
  C.register(G);
})();
