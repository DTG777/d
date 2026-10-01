/* 炸金花 Zha Jin Hua: blind or seen, call, raise, compare, fold. Opponents talk. */
(function () {
  const t = (k, v) => I18N.t(k, v);
  const CAT = { high: 'zj.high', pair: 'zj.pair', straight: 'zj.straight', flush: 'zj.flush', sflush: 'zj.sflush', trips: 'zj.trips' };

  class ZJH extends PvP.Table {
    constructor() { super('zhajinhua', { stakeKey: 'ante' }); this.picking = false; }
    setup() {
      this.center.innerHTML = `
        <div class="zj-pot"><div class="zj-pile"></div><div class="zj-pot-n">0</div><div class="zj-info"></div></div>`;
      this.potEl = this.center.querySelector('.zj-pot');
      this.root.addEventListener('click', e => {
        if (!this.picking) return;
        const seat = e.target.closest('.pv-seat.pickable');
        if (seat) { this.picking = false; this.root.classList.remove('picking'); this.perform({ type: 'compare', target: seat.dataset.seat }); }
      });
    }
    stakeHint() { return t('zj.stakeHint'); }
    rules() { return t('zj.rules'); }

    renderGame(obs) {
      const live = obs.phase === 'play' || obs.phase === 'done';
      this.potEl.querySelector('.zj-pot-n').textContent = obs.phase === 'play' ? U.fmt(obs.pot) : '';
      this.potEl.querySelector('.zj-info').textContent = obs.phase === 'play' ? t('zj.lap', { n: obs.lap + 1, m: obs.maxLaps, u: obs.unit }) : obs.phase === 'idle' ? t('zj.idle') : '';
      const pile = this.potEl.querySelector('.zj-pile');
      const pot = obs.phase === 'play' ? obs.pot : 0;
      if (pile._pot !== pot) { pile._pot = pot; pile.innerHTML = ''; if (pot) pile.appendChild(C.stack(pot, { max: 9, label: false })); }
      for (const id of this.L.seatIds) {
        const el = this.seatEl(id); if (!el) continue;
        const codes = live ? (obs.hands[id] || []) : [];
        if (id !== 'you') PvP.sync(el.querySelector('.pv-cards'), codes);
        el.classList.toggle('folded', !!(live && obs.folded[id]));
        const put = live && obs.put ? obs.put[id] || 0 : 0;
        el.querySelector('.pv-out').textContent = put ? U.fmtShort(put) : '';
        if (live) this.tag(id, obs.folded[id] ? t('zj.folded') : obs.seen[id] ? t('zj.seen') : t('zj.blind'), obs.folded[id] ? 'bad' : obs.seen[id] ? '' : 'gold');
        else this.tag(id, '');
        this.role(id, live && obs.dealer === id ? t('zj.dealer') : '');
        el.classList.toggle('pickable', this.picking && live && id !== 'you' && !obs.folded[id]);
      }
      // your cards: big, below the felt
      PvP.sync(this.handEl, live ? obs.hand : []);
      this.handEl.classList.toggle('folded', !!(live && obs.folded.you));
      if (obs.phase === 'play' && obs.myRank) this.hint(t('zj.youHave', { c: t(CAT[obs.myRank]) }));
      else if (obs.phase === 'play' && !obs.seen.you && !obs.folded.you) this.hint(t('zj.blindHint'));
      else if (obs.phase !== 'idle') this.hint('');
    }
    actions(obs, legal) {
      const has = k => legal.find(l => l.type === k), out = [];
      if (this.picking) return [{ label: t('ui.close'), act: null, onClick: () => { this.picking = false; this.root.classList.remove('picking'); this.render(); } }];
      if (has('look')) out.push({ label: t('zj.look'), act: { type: 'look' } });
      if (has('call')) out.push({ label: t('zj.call', { n: U.fmt(obs.callCost) }), cls: 'btn-gold', act: { type: 'call' } });
      if (has('raise')) for (const lv of has('raise').params.level.enum.slice(0, 3)) out.push({ label: t('zj.raise', { m: lv, n: U.fmt(lv * obs.ante * (obs.seen.you ? 2 : 1)) }), cls: 'btn-act', act: { type: 'raise', level: lv } });
      if (has('compare')) {
        const tg = has('compare').params.target.enum;
        out.push(tg.length === 1
          ? { label: t('zj.compareWith', { who: this.name(tg[0]) }), act: { type: 'compare', target: tg[0] } }
          : { label: t('zj.compare'), onClick: () => { this.picking = true; this.root.classList.add('picking'); this.hint(t('zj.pick')); this.render(); } });
      }
      if (has('fold')) out.push({ label: t('zj.fold'), cls: 'btn-ghost danger', act: { type: 'fold' } });
      return out;
    }

    async onEvent(ev, actor) {
      const s = ev.seat;
      switch (ev.t) {
        case 'deal': {
          this.showMsg('');
          U.$$('.pv-seat', this.root).forEach(el => { el.classList.remove('folded', 'lost', 'winner'); el.querySelector('.pv-cards').innerHTML = ''; });
          this.handEl.innerHTML = '';
          Sound.fx.shuffle(); await U.sleep(300);
          for (const id of this.L.seatIds) this.flyChips(id, this.potEl, ev.ante);
          // deal three rounds, one card at a time
          for (let r = 0; r < 3; r++) for (const id of this.L.seatIds) {
            const host = id === 'you' ? this.handEl : this.seatEl(id).querySelector('.pv-cards');
            const c = PvP.card('??'); c.dataset.code = '??'; host.appendChild(c);
            Sound.fx.deal();
            if (!U.reduced) c.animate([{ transform: 'translateY(-60px) scale(.7)', opacity: 0 }, { transform: 'none', opacity: 1 }], { duration: 180, easing: 'ease-out' });
            await U.sleep(70);
          }
          this.render();
          break;
        }
        case 'look':
          if (s !== 'you') { this.tag(s, t('zj.seen')); Sound.fx.flip(); await U.sleep(250); }
          break;
        case 'cards':
          if (s === 'you') { this.render(); await U.sleep(700); const r = this.L.observe('you').myRank; if (r === 'trips' || r === 'sflush') { FX.flash('gold'); Sound.fx.fanfare(1); } else if (r !== 'high') Sound.fx.win(0); }
          break;
        case 'call': case 'raise':
          this.flyChips(s, this.potEl, ev.amount);
          this.tag(s, ev.t === 'raise' ? t('zj.raised', { m: ev.unit }) : t('zj.called', { n: U.fmtShort(ev.amount) }), ev.t === 'raise' ? 'hot' : '');
          if (ev.t === 'raise') { Sound.fx.thud(1); U.pulse(this.seatEl(s), 'bump'); if (ev.unit >= 10) FX.shake(4, 250); }
          await U.sleep(320);
          break;
        case 'compare': {
          const a = this.seatEl(s), b = this.seatEl(ev.target);
          this.flyChips(s, this.potEl, ev.amount);
          a.classList.add('vs'); b.classList.add('vs');
          this.showMsg(t('zj.vs'), 'info');
          Sound.fx.drumroll(1.1); await U.sleep(1200);
          a.classList.remove('vs'); b.classList.remove('vs');
          const lost = this.seatEl(ev.loser); lost.classList.add('lost');
          Sound.fx[ev.loser === 'you' ? 'lose' : 'thud'](1);
          const c = U.center(this.seatEl(ev.winner)); FX.sparks(c.x, c.y, 16, 'gold');
          this.showMsg(t('zj.cmpWin', { who: this.name(ev.winner) }), ev.winner === 'you' ? 'win' : 'info');
          await U.sleep(600);
          break;
        }
        case 'fold':
          Sound.fx.chipsSlide(); this.tag(s, t('zj.folded'), 'bad');
          this.seatEl(s).classList.add('folded');
          await U.sleep(250);
          break;
        case 'showdown':
          this.showMsg(t('zj.showdown'), 'info'); Sound.fx.drumroll(0.8);
          await U.sleep(500); this.render(); await U.sleep(900);
          break;
        case 'win': {
          this.render();
          const w = this.seatEl(s); w.classList.add('winner');
          const c = U.center(w);
          const pile = this.potEl.querySelector('.zj-pile');
          pile.innerHTML = ''; pile._pot = -1;
          C.flyChip(this.potEl, w.querySelector('.pv-av'), 1000);
          FX.sparks(c.x, c.y, 26, 'gold', 1.2);
          if (s !== 'you') this.showMsg(t('zj.winBy', { who: this.name(s), c: ev.cat ? t(CAT[ev.cat]) : '' }), 'info');
          await U.sleep(700);
          break;
        }
      }
    }
  }

  C.register(new ZJH());
})();
