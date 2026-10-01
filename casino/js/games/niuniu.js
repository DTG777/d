/* 抢庄牛牛 Bull Bull: see four cards, grab the bank, bet, reveal the fifth. */
(function () {
  const t = (k, v) => I18N.t(k, v);
  const niuName = n => n === 'wuxiao' ? t('nn.wuxiao') : n === 'bomb' ? t('nn.bomb') : n === 'wuhua' ? t('nn.wuhua') : n === 10 ? t('nn.niuniu') : n === 0 ? t('nn.none') : t('nn.niu', { n });

  class NiuNiu extends PvP.Table {
    constructor() { super('niuniu', { stakeKey: 'base' }); }
    setup() {
      this.center.innerHTML = `<div class="nn-center"><div class="nn-bank"></div><div class="nn-info"></div></div>`;
      this.potEl = this.center.querySelector('.nn-center');
    }
    stakeHint() { return t('nn.stakeHint'); }
    rules() { return t('nn.rules'); }

    renderGame(obs) {
      const live = obs.phase !== 'idle';
      const info = this.center.querySelector('.nn-info');
      info.textContent = obs.phase === 'grab' ? t('nn.grabPhase') : obs.phase === 'bet' ? t('nn.betPhase', { who: this.name(obs.banker), m: obs.grabMult }) : obs.phase === 'idle' ? t('nn.idle') : '';
      for (const id of this.L.seatIds) {
        const el = this.seatEl(id); if (!el) continue;
        if (id !== 'you') { const host = el.querySelector('.pv-cards'); if (!host.classList.contains('nn-split')) PvP.sync(host, live ? obs.hands[id] : []); }
        this.role(id, obs.banker === id ? t('nn.banker') : '');
        el.classList.toggle('banker', obs.banker === id);
        let tag = '';
        if (obs.phase === 'grab' && obs.grabs[id] != null) tag = obs.grabs[id] ? t('nn.grabbed', { m: obs.grabs[id] }) : t('nn.noGrab');
        if ((obs.phase === 'bet' || obs.phase === 'done') && obs.bets[id] != null) tag = '×' + obs.bets[id];
        if (obs.phase === 'done' && obs.result) tag = niuName(obs.result.ranks[id]);
        this.tag(id, tag, obs.phase === 'done' && obs.result && (obs.result.ledger[id] || 0) > 0 ? 'good' : '');
      }
      if (!this.handEl.classList.contains('nn-split')) PvP.sync(this.handEl, live ? obs.hand : []);
      if (obs.phase === 'grab' || obs.phase === 'bet') {
        const pts = obs.hint ? obs.hint.known : [];
        this.hint(t('nn.yourFour', { p: pts.join(' + ') }) + ' ' + this.read(obs.hand.filter(c => c !== '??')));
      } else if (obs.phase !== 'idle') this.hint('');
    }
    // beginner helper: is there already a bull among my four cards?
    read(four) {
      const pt = c => c[0] === 'A' ? 1 : 'TJQK'.includes(c[0]) ? 10 : +c[0];
      const p = four.map(pt);
      for (let i = 0; i < 4; i++) for (let j = i + 1; j < 4; j++) for (let k = j + 1; k < 4; k++) if ((p[i] + p[j] + p[k]) % 10 === 0) return t('nn.hasBase');
      return t('nn.needFifth');
    }
    actions(obs, legal) {
      const g = legal.find(l => l.type === 'grab'), b = legal.find(l => l.type === 'bet');
      if (g) return g.params.mult.enum.map(m => ({ label: m ? t('nn.grab', { m }) : t('nn.noGrab'), cls: m ? (m >= 3 ? 'btn-act' : 'btn-ghost') : 'btn-ghost', act: { type: 'grab', mult: m } }));
      if (b) return b.params.mult.enum.map(m => ({ label: '×' + m, cls: m === 1 ? 'btn-ghost' : 'btn-act', act: { type: 'bet', mult: m } }));
      return [];
    }
    async onEvent(ev) {
      const s = ev.seat;
      switch (ev.t) {
        case 'deal': {
          this.showMsg('');
          U.$$('.pv-seat', this.root).forEach(el => { el.classList.remove('winner', 'lost'); const h = el.querySelector('.pv-cards'); h.classList.remove('nn-split'); h.innerHTML = ''; el.querySelector('.pv-out').textContent = ''; });
          this.handEl.classList.remove('nn-split'); this.handEl.innerHTML = '';
          Sound.fx.shuffle(); await U.sleep(300);
          for (let r = 0; r < 5; r++) for (const id of this.L.seatIds) {
            const host = id === 'you' ? this.handEl : this.seatEl(id).querySelector('.pv-cards');
            const c = PvP.card('??'); host.appendChild(c); Sound.fx.deal();
            if (!U.reduced) c.animate([{ transform: 'translateY(-50px) scale(.7)', opacity: 0 }, { transform: 'none', opacity: 1 }], { duration: 160 });
            await U.sleep(45);
          }
          await U.sleep(150); this.render();
          break;
        }
        case 'grab':
          this.tag(s, ev.mult ? t('nn.grabbed', { m: ev.mult }) : t('nn.noGrab'), ev.mult >= 3 ? 'hot' : '');
          if (ev.mult) Sound.fx.chip(); await U.sleep(200);
          break;
        case 'banker': {
          // the dealer light hops between the tied grabbers before it settles
          const c = ev.candidates;
          if (c.length > 1 && !U.reduced) for (let i = 0; i < 8 + c.length; i++) {
            U.$$('.pv-seat', this.root).forEach(el => el.classList.toggle('hop', el.dataset.seat === c[i % c.length]));
            Sound.fx.tick(1 + i * 0.05); await U.sleep(90 + i * 12);
          }
          U.$$('.pv-seat.hop', this.root).forEach(el => el.classList.remove('hop'));
          this.render();
          Sound.fx.thud(1); U.pulse(this.seatEl(s), 'bump');
          this.showMsg(t('nn.isBanker', { who: this.name(s), m: ev.mult }), 'info');
          await U.sleep(700);
          break;
        }
        case 'bet':
          this.tag(s, '×' + ev.mult, ev.mult >= 4 ? 'hot' : ''); Sound.fx.chip(); await U.sleep(150);
          break;
        case 'reveal': {
          this.showMsg('');
          // banker last, for the drama
          const order = this.L.seatIds.filter(id => !ev.ranks[id] || id !== this.L.observe('you').banker);
          const bk = this.L.seatIds.find(id => !order.includes(id));
          for (const id of [...order, bk].filter(Boolean)) {
            const r = ev.ranks[id];
            const host = id === 'you' ? this.handEl : this.seatEl(id).querySelector('.pv-cards');
            const codes = r.split ? [...r.split[0], ...r.split[1]] : ev.hands[id];
            host.innerHTML = '';
            codes.forEach((c, i) => { const el = PvP.card(c, { down: true }); if (r.split && i === 3) el.classList.add('gap'); host.appendChild(el); setTimeout(() => PvP.flip(el), 40 + i * 60); });
            host.classList.add('nn-split');
            await U.sleep(380);
            this.tag(id, niuName(r.niu) + (r.mult > 1 ? ' ×' + r.mult : ''), r.mult >= 3 ? 'hot' : r.niu ? '' : 'bad');
            if (r.mult >= 4) { Sound.fx.fanfare(0); const c = U.center(host); FX.sparks(c.x, c.y, 18, 'gold'); } else Sound.fx.tick(r.niu ? 1.4 : 0.7);
            await U.sleep(id === bk ? 700 : 300);
          }
          break;
        }
        case 'settle': {
          const el = this.seatEl(s);
          if (ev.net) { el.querySelector('.pv-out').textContent = (ev.net > 0 ? '+' : '−') + U.fmtShort(Math.abs(ev.net)); el.classList.toggle('winner', ev.net > 0); el.classList.toggle('lost', ev.net < 0); }
          await U.sleep(80);
          break;
        }
      }
    }
  }

  C.register(new NiuNiu());
})();
