/* 斗地主 Fight the Landlord: bid, take the three hidden cards, play patterns, bomb. */
(function () {
  const t = (k, v) => I18N.t(k, v);
  const E = () => Engines.list.doudizhu;

  class DDZ extends PvP.Table {
    constructor() { super('doudizhu', { stakeKey: 'base' }); this.sel = new Set(); this.hintIdx = -1; }
    setup() {
      this.center.innerHTML = `<div class="dz-center"><div class="dz-bottom"></div><div class="dz-mult"></div></div>`;
      this.bottomEl = this.center.querySelector('.dz-bottom');
      // tap or swipe across cards to select
      let dragging = false, mode = true;
      const toggle = (el, force) => {
        if (!el || !el.dataset.code || this.busy) return;
        const on = force != null ? force : !this.sel.has(el.dataset.i);
        if (on) this.sel.add(el.dataset.i); else this.sel.delete(el.dataset.i);
        el.classList.toggle('sel', on); Sound.fx.tick(on ? 1.5 : 1.1);
        this.syncPlayBtn();
      };
      this.handEl.addEventListener('pointerdown', e => { const el = e.target.closest('.card'); if (!el) return; dragging = true; mode = !this.sel.has(el.dataset.i); toggle(el, mode); e.preventDefault(); });
      this.handEl.addEventListener('pointerover', e => { if (dragging) toggle(e.target.closest('.card'), mode); });
      addEventListener('pointerup', () => { dragging = false; });
    }
    stakeHint() { return t('dz.stakeHint'); }
    rules() { return t('dz.rules'); }
    selected() { const h = this.L.observe('you').hand.slice().reverse(); return [...this.sel].map(i => h[+i]).filter(Boolean); }

    renderGame(obs) {
      const live = obs.phase !== 'idle';
      PvP.sync(this.bottomEl, live ? obs.bottom : []);
      this.center.querySelector('.dz-mult').textContent = live ? t('dz.mult', { m: obs.mult, b: U.fmt(obs.base) }) : t('dz.idle');
      for (const id of this.L.seatIds) {
        const el = this.seatEl(id); if (!el) continue;
        this.role(id, obs.landlord ? (obs.landlord === id ? t('dz.landlord') : t('dz.farmer')) : '');
        el.classList.toggle('landlord', obs.landlord === id);
        if (id !== 'you') {
          const n = live ? obs.counts[id] : 0, host = el.querySelector('.pv-cards');
          if (obs.phase === 'done' && obs.hands) { if (!host.classList.contains('open')) { host.classList.add('open'); PvP.sync(host, obs.hands[id].slice().reverse()); } }
          else { host.classList.remove('open'); host.innerHTML = n ? `<div class="dz-back"><div class="card down"><div class="ci"><div class="cb"></div></div></div><b>${n}</b></div>` : ''; }
          el.classList.toggle('alarm', live && obs.phase === 'play' && n > 0 && n <= 2);
        }
        if (obs.phase === 'bid' && obs.bidder === id) this.tag(id, t('dz.bidN', { n: obs.curBid }), 'gold');
        else if (obs.phase !== 'bid') this.tag(id, '');
      }
      // your hand: big cards high to low
      const hand = live ? obs.hand.slice().reverse() : [];
      const host = this.handEl, kids = [...host.children];
      if (kids.length !== hand.length || kids.some((k, i) => k.dataset.code !== hand[i])) {
        host.innerHTML = ''; this.sel.clear(); this.hintIdx = -1;
        hand.forEach((c, i) => { const el = PvP.card(c); el.dataset.i = i; el.dataset.code = c; host.appendChild(el); });
      }
      host.classList.toggle('dense', hand.length > 17);
      if (obs.phase === 'play' && obs.toAct === 'you' && obs.last && obs.last.seat !== 'you') this.hint(t('dz.beat', { who: this.name(obs.last.seat), c: this.comboName(obs.last.combo) }));
      else if (obs.phase === 'play' && obs.toAct === 'you') this.hint(t('dz.lead'));
      else if (obs.phase === 'bid' && obs.toAct === 'you') this.hint(t('dz.bidHint', { s: Math.round(E().strength(obs.hand) * 10) / 10 }));
      else if (obs.phase !== 'idle') this.hint('');
      this.syncPlayBtn();
    }
    comboName(c) { return c ? t('dz.c.' + c.type) : ''; }
    syncPlayBtn() {
      const b = this.actEl.querySelector('.dz-play'); if (!b) return;
      const obs = this.L.observe('you'), sel = this.selected();
      const c = E().classify(sel);
      const lead = !obs.last || obs.last.seat === 'you';
      b.disabled = !c || (!lead && !E().beats(c, obs.last.combo));
      b.querySelector('small').textContent = c ? this.comboName(c) : sel.length ? t('dz.invalid') : '';
    }
    actions(obs, legal) {
      const bid = legal.find(l => l.type === 'bid'), play = legal.find(l => l.type === 'play'), pass = legal.find(l => l.type === 'pass');
      if (bid) return [...bid.params.score.enum.map(n => ({ label: t('dz.bid', { n }), cls: n === 3 ? 'btn-act' : 'btn-ghost', act: { type: 'bid', score: n } })), { label: t('dz.noBid'), act: { type: 'pass' } }];
      const out = [];
      if (pass) out.push({ label: t('dz.pass'), act: { type: 'pass' } });
      if (play) {
        out.push({ label: t('dz.hint'), onClick: () => this.suggest(obs, play) });
        out.push({ label: t('dz.play'), cls: 'btn-gold dz-play', onClick: () => { const cards = this.selected(); this.sel.clear(); this.perform({ type: 'play', cards }); } });
      } else if (pass) this.hint(t('dz.cannot'));
      return out;
    }
    renderActions(obs) {
      super.renderActions(obs);
      const b = this.actEl.querySelector('.dz-play');
      if (b && !b.querySelector('small')) { b.classList.add('btn-xl'); b.style.width = 'auto'; b.appendChild(U.h('small')); this.syncPlayBtn(); }
    }
    // hint: the bot's choice first, then cycle through the other legal plays
    suggest(obs, play) {
      const best = E().bot(obs, U.random);
      const list = [...(best.type === 'play' ? [best.cards] : []), ...play.options];
      this.hintIdx = (this.hintIdx + 1) % list.length;
      const want = list[this.hintIdx].slice();
      const hand = obs.hand.slice().reverse();
      this.sel.clear();
      hand.forEach((c, i) => { const k = want.indexOf(c); if (k >= 0) { want.splice(k, 1); this.sel.add(String(i)); } });
      U.$$('.card', this.handEl).forEach(el => el.classList.toggle('sel', this.sel.has(el.dataset.i)));
      Sound.fx.tick(1.4); this.syncPlayBtn();
    }
    showPlay(seat, cards, combo) {
      const out = this.seatEl(seat).querySelector('.pv-out');
      out.innerHTML = ''; out.classList.remove('passed');
      const row = U.h('div', { class: 'dz-play-row' });
      cards.slice().reverse().forEach((c, i) => { const el = PvP.card(c); row.appendChild(el); if (!U.reduced) el.animate([{ transform: 'translateY(30px) scale(.6)', opacity: 0 }, { transform: 'none', opacity: 1 }], { duration: 220, delay: i * 25, fill: 'backwards', easing: 'cubic-bezier(.2,1.4,.4,1)' }); });
      out.appendChild(row);
      if (combo && !['single', 'pair'].includes(combo.type)) out.appendChild(U.h('em', { class: 'dz-combo' }, this.comboName(combo)));
    }
    async onEvent(ev) {
      const s = ev.seat;
      switch (ev.t) {
        case 'deal': case 'redeal':
          this.showMsg(ev.t === 'redeal' ? t('dz.redeal') : '', 'info');
          U.$$('.pv-out', this.root).forEach(o => { o.innerHTML = ''; o.classList.remove('passed'); });
          U.$$('.pv-seat', this.root).forEach(el => el.classList.remove('winner', 'lost', 'alarm'));
          U.$$('.pv-cards', this.root).forEach(h => { h.classList.remove('open'); h.innerHTML = ''; });
          this.handEl.innerHTML = '';
          Sound.fx.shuffle(); await U.sleep(450);
          break;
        case 'hand':
          if (s === 'you') {
            this.render();
            if (!U.reduced) U.$$('.card', this.handEl).forEach((el, i) => el.animate([{ transform: 'translateY(-80px) rotate(-20deg)', opacity: 0 }, { transform: 'none', opacity: 1 }], { duration: 260, delay: i * 35, fill: 'backwards', easing: 'ease-out' }));
            for (let i = 0; i < 6; i++) { Sound.fx.deal(); await U.sleep(80); }
          }
          break;
        case 'bid':
          this.tag(s, t('dz.bidN', { n: ev.score }), 'gold'); Sound.fx.chip();
          if (ev.score === 3) { Sound.fx.thud(1); U.pulse(this.seatEl(s), 'bump'); }
          await U.sleep(300);
          break;
        case 'pass': {
          const out = this.seatEl(s).querySelector('.pv-out');
          if (ev.phase === 'bid') this.tag(s, t('dz.noBid'));
          else { out.innerHTML = ''; out.classList.add('passed'); out.textContent = t('dz.pass'); }
          Sound.fx.tick(0.8); await U.sleep(250);
          break;
        }
        case 'landlord': {
          this.render();
          U.$$('.card', this.bottomEl).forEach((el, i) => setTimeout(() => PvP.flip(el), i * 120));
          Sound.fx.fanfare(0); U.pulse(this.seatEl(s), 'bump');
          this.showMsg(t('dz.isLandlord', { who: this.name(s) }), s === 'you' ? 'win' : 'info');
          await U.sleep(900);
          U.$$('.pv-seat', this.root).forEach(el => this.tag(el.dataset.seat, ''));
          break;
        }
        case 'play':
          this.showPlay(s, ev.cards, ev.combo);
          Sound.fx.deal(); if (ev.cards.length >= 5) Sound.fx.whoosh(true, 0.3);
          if (['plane', 'plane1', 'plane2'].includes(ev.combo.type)) { this.showMsg(t('dz.c.plane'), 'info'); Sound.fx.rocket && Sound.fx.whoosh(true, 0.6); }
          if (ev.combo.type === 'straight' || ev.combo.type === 'dstraight') FX.flash('gold');
          this.render();
          await U.sleep(380);
          break;
        case 'bomb': {
          const c = U.center(this.seatEl(s).querySelector('.pv-out'));
          Sound.fx.explosion(); FX.shake(ev.kind === 'rocket' ? 14 : 9, 450); FX.flash(ev.kind === 'rocket' ? 'red' : 'gold');
          FX.sparks(c.x, c.y, 40, 'gold', 1.8); FX.ring(c.x, c.y, '#ff5a3c', 220);
          this.showMsg(ev.kind === 'rocket' ? t('dz.rocket') : t('dz.bomb'), 'win');
          await U.sleep(800);
          break;
        }
        case 'alarm':
          Sound.fx.heartbeat(); U.pulse(this.seatEl(s), 'shake-x');
          break;
        case 'newRound':
          await U.sleep(350);
          U.$$('.pv-out', this.root).forEach(o => { o.innerHTML = ''; o.classList.remove('passed'); });
          break;
        case 'spring':
          FX.flash('gold'); Sound.fx.fanfare(1);
          this.showMsg(ev.anti ? t('dz.antiSpring') : t('dz.spring'), 'win'); await U.sleep(900);
          break;
        case 'reveal':
          await U.sleep(300); this.render(); await U.sleep(500);
          break;
        case 'settle': {
          const el = this.seatEl(s);
          el.classList.add(ev.net > 0 ? 'winner' : 'lost');
          this.tag(s, (ev.net > 0 ? '+' : '−') + U.fmtShort(Math.abs(ev.net)), ev.net > 0 ? 'good' : 'bad');
          break;
        }
      }
    }
  }

  C.register(new DDZ());
})();
