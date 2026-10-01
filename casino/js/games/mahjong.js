/* 血战麻将 Sichuan mahjong: pick a void suit, draw, discard, pong, kong, win; the
   hand goes on until three players have won ("bloody to the end"). */
(function () {
  const t = (k, v) => I18N.t(k, v);
  const SUITS = ['m', 's', 'p'];
  const EN_SUIT = { m: 'Crak', s: 'Bam', p: 'Dot' };
  const tileName = c => I18N.lang === 'zh' ? PvP.NUM_ZH[+c[0]] + PvP.SUIT_ZH[c[1]] : c[0] + ' ' + EN_SUIT[c[1]];
  const suitName = s => I18N.lang === 'zh' ? PvP.SUIT_ZH[s] : EN_SUIT[s];

  class Mahjong extends PvP.Table {
    constructor() { super('mahjong', { stakeKey: 'base' }); this.pick = null; this.lastVoice = 0; }
    setup() {
      this.center.innerHTML = `<div class="mj-center"><div class="mj-wall"></div><div class="mj-last"></div></div>`;
      this.wallEl = this.center.querySelector('.mj-wall'); this.lastEl = this.center.querySelector('.mj-last');
      const wrap = this.root.querySelector('.pv-hand-wrap');
      this.meldEl = U.h('div', { class: 'mj-melds mine' }); wrap.prepend(this.meldEl);
      this.handEl.classList.add('mj-hand');
      this.handEl.addEventListener('click', e => {
        const el = e.target.closest('.mjt'); if (!el || this.busy) return;
        const obs = this.L.observe('you'), d = obs.legal.find(l => l.type === 'discard');
        if (!d || !d.params.tile.enum.includes(el.dataset.tile)) { Sound.fx.error(); U.pulse(el, 'shake-x'); return; }
        if (this.pick === el) { this.pick = null; this.perform({ type: 'discard', tile: el.dataset.tile }); return; }
        U.$$('.mjt.sel', this.handEl).forEach(x => x.classList.remove('sel'));
        this.pick = el; el.classList.add('sel'); Sound.fx.tick(1.4);
        this.hint(t('mj.tapAgain', { t: tileName(el.dataset.tile) }));
      });
    }
    stakeHint() { return t('mj.stakeHint'); }
    rules() { return t('mj.rules'); }
    callout(code) {
      if (Date.now() - this.lastVoice < 2600) return;
      Sound.say(tileName(code), { rate: 1.15 });
    }
    speak(seat, text) { super.speak(seat, text); if (seat !== 'you') this.lastVoice = Date.now(); }

    melds(list) {
      return list.map(m => U.h('div', { class: 'mj-meld' }, ...Array.from({ length: m.type === 'kong' ? 4 : 3 }, (_, i) => PvP.tile(m.concealed && (i === 0 || i === 3) ? '??' : m.tile, { cls: 'sm' }))));
    }
    renderGame(obs) {
      const live = obs.phase !== 'idle';
      this.wallEl.innerHTML = live ? `<b>${obs.wall}</b><span>${t('mj.wall')}</span>` : `<span>${t('mj.idle')}</span>`;
      for (const id of this.L.seatIds) {
        const el = this.seatEl(id); if (!el) continue;
        const won = obs.won && obs.won[id];
        el.classList.toggle('won', !!won);
        this.role(id, obs.dealer === id && live ? t('mj.dealer') : '');
        const lack = obs.lack && obs.lack[id];
        this.tag(id, won ? (won.self ? t('mj.zimo') : t('mj.hu')) + ' ' + t('mj.fan', { n: won.fan }) : lack ? t('mj.lackTag', { s: suitName(lack) }) : '', won ? 'good' : '');
        // discards in front of each player
        const pool = el.querySelector('.pv-out'); pool.classList.add('mj-pool');
        const ds = live ? obs.discards[id] : [];
        if (pool.childElementCount !== ds.length) { pool.innerHTML = ''; ds.forEach(c => pool.appendChild(PvP.tile(c, { cls: 'xs' }))); }
        if (id === 'you') continue;
        const host = el.querySelector('.pv-cards');
        host.innerHTML = '';
        if (!live) continue;
        host.append(...this.melds(obs.melds[id]));
        const open = obs.phase === 'done' || won;
        if (open) host.appendChild(U.h('div', { class: 'mj-row' }, obs.hands[id].map(c => PvP.tile(c, { cls: 'sm' }))));
        else host.appendChild(U.h('div', { class: 'mj-backs' }, U.h('div', { class: 'mjt back sm' }), U.h('b', null, '×' + obs.counts[id])));
      }
      // my hand: drawn tile sits apart on the right
      this.meldEl.innerHTML = ''; if (live) this.meldEl.append(...this.melds(obs.melds.you));
      const hand = live ? obs.hand.slice() : [];
      let drawn = null;
      if (obs.drawn && hand.includes(obs.drawn) && obs.toAct === 'you' && obs.phase === 'play') { drawn = obs.drawn; hand.splice(hand.lastIndexOf(drawn), 1); }
      const key = hand.join() + '|' + drawn + '|' + obs.phase + '|' + (obs.toAct === 'you');
      if (this.handEl._key !== key) {
        this.handEl._key = key; this.pick = null; this.handEl.innerHTML = '';
        const d = obs.toAct === 'you' ? obs.legal.find(l => l.type === 'discard') : null;
        const lack = obs.lack && obs.lack.you;
        for (const c of hand) this.handEl.appendChild(PvP.tile(c, { cls: (lack && c[1] === lack ? 'void ' : '') + (d && !d.params.tile.enum.includes(c) ? 'dim' : '') }));
        if (drawn) { const el = PvP.tile(drawn, { cls: 'drawn' + (lack && drawn[1] === lack ? ' void' : '') + (d && !d.params.tile.enum.includes(drawn) ? ' dim' : '') }); this.handEl.appendChild(el); if (!U.reduced) el.animate([{ transform: 'translateY(-40px)', opacity: 0 }, { transform: 'none', opacity: 1 }], { duration: 220, easing: 'ease-out' }); }
      }
      this.handEl.classList.toggle('won', !!(obs.won && obs.won.you));
      // guidance
      if (obs.phase === 'lack' && obs.toAct === 'you') this.hint(t('mj.lackHint'));
      else if (obs.won && obs.won.you) this.hint(t('mj.youWon'));
      else if (obs.phase === 'play' || obs.phase === 'claim') {
        if (obs.waits && obs.waits.length) this.hint(t('mj.waits', { w: obs.waits.map(tileName).join(' ') }));
        else if (obs.shanten != null && obs.shanten > 0) this.hint(t('mj.shanten', { n: obs.shanten }));
        else if (obs.toAct === 'you' && obs.phase === 'play') this.hint(t('mj.discardHint'));
        else this.hint('');
      } else if (obs.phase !== 'idle') this.hint('');
    }
    actions(obs, legal) {
      const has = k => legal.find(l => l.type === k), out = [];
      if (has('lack')) {
        const n = SUITS.map(s => obs.hand.filter(c => c[1] === s).length), min = Math.min(...n);
        return SUITS.map((s, i) => ({ label: t('mj.lack', { s: suitName(s), n: n[i] }), cls: n[i] === min ? 'btn-gold' : 'btn-ghost', act: { type: 'lack', suit: s } }));
      }
      if (obs.phase === 'claim' && obs.claim) {
        this.hint(t('mj.claimHint', { who: this.name(obs.claim.from), t: tileName(obs.claim.tile) }));
        if (has('hu')) out.push({ label: t('mj.hu'), cls: 'btn-gold', act: { type: 'hu' } });
        if (has('kong')) out.push({ label: t('mj.kong'), cls: 'btn-act', act: { type: 'kong' } });
        if (has('pong')) out.push({ label: t('mj.pong'), cls: 'btn-act', act: { type: 'pong' } });
        if (has('pass')) out.push({ label: t('mj.pass'), act: { type: 'pass' } });
        return out;
      }
      if (has('hu')) out.push({ label: t('mj.zimo'), cls: 'btn-gold', act: { type: 'hu' } });
      if (has('kong')) for (const c of has('kong').params.tile.enum) out.push({ label: t('mj.kongT', { t: tileName(c) }), cls: 'btn-act', act: { type: 'kong', tile: c } });
      if (has('discard')) out.push({ label: t('mj.discard'), onClick: () => { const p = this.pick; if (p) { this.pick = null; this.perform({ type: 'discard', tile: p.dataset.tile }); } else { this.hint(t('mj.discardHint')); Sound.fx.error(); } } });
      return out;
    }
    stamp(seat, text, big) {
      const el = this.seatEl(seat); if (!el) return;
      const s = U.h('div', { class: 'mj-stamp' + (big ? ' big' : '') }, text);
      el.appendChild(s); setTimeout(() => s.remove(), 1600);
    }
    async onEvent(ev) {
      const s = ev.seat;
      switch (ev.t) {
        case 'deal':
          this.showMsg(''); this.lastEl.innerHTML = '';
          U.$$('.pv-seat', this.root).forEach(el => el.classList.remove('winner', 'lost'));
          Sound.fx.shuffle(); await U.sleep(250); Sound.fx.shuffle(); await U.sleep(350);
          break;
        case 'hand':
          if (s === 'you') { this.render(); if (!U.reduced) U.$$('.mjt', this.handEl).forEach((el, i) => el.animate([{ transform: 'translateY(-50px)', opacity: 0 }, { transform: 'none', opacity: 1 }], { duration: 240, delay: i * 30, fill: 'backwards' })); for (let i = 0; i < 4; i++) { Sound.fx.diceLand(); await U.sleep(90); } }
          break;
        case 'lack': this.tag(s, t('mj.lackTag', { s: suitName(ev.suit) })); Sound.fx.tick(1); await U.sleep(120); break;
        case 'draw': if (s !== 'you') { Sound.fx.tick(0.9); await U.sleep(120); } break;
        case 'drawn': this.render(); Sound.fx.deal(); break;
        case 'discard': {
          this.lastEl.innerHTML = ''; const big = PvP.tile(ev.tile, { cls: 'lg' }); this.lastEl.appendChild(big);
          if (!U.reduced) big.animate([{ transform: 'scale(1.6)', opacity: 0 }, { transform: 'none', opacity: 1 }], { duration: 200, easing: 'cubic-bezier(.2,1.4,.4,1)' });
          Sound.fx.diceLand(); this.callout(ev.tile);
          this.render(); await U.sleep(s === 'you' ? 200 : 380);
          break;
        }
        case 'claim': if (ev.seats.includes('you')) { Sound.fx.tick(1.6); U.pulse(this.lastEl, 'bump'); } break;
        case 'pong': this.stamp(s, t('mj.pong')); Sound.fx.thud(1); Sound.say(t('mj.pong')); this.lastEl.innerHTML = ''; this.render(); await U.sleep(500); break;
        case 'kong': {
          this.stamp(s, t('mj.kong')); Sound.fx.thud(1.2); FX.shake(4, 200); Sound.say(t('mj.kong'));
          this.lastEl.innerHTML = ''; this.render(); await U.sleep(600);
          break;
        }
        case 'hu': {
          const self = ev.self;
          this.stamp(s, self ? t('mj.zimo') : t('mj.hu'), true);
          Sound.say(self ? t('mj.zimo') : t('mj.hu'));
          const c = U.center(this.seatEl(s));
          if (s === 'you') { Sound.fx.fanfare(ev.fan >= 3 ? 2 : 1); FX.confetti(c.x, c.y, 60); FX.flash('gold'); } else { Sound.fx.thud(1); FX.sparks(c.x, c.y, 20, 'gold'); }
          this.showMsg(t('mj.winBy', { who: this.name(s), f: ev.fan, n: (ev.names || []).map(n => t('mj.f.' + n)).join(' · ') }), s === 'you' ? 'win' : 'info');
          this.lastEl.innerHTML = '';
          this.render(); await U.sleep(1300);
          break;
        }
        case 'exhaust': this.showMsg(t('mj.exhaust'), 'info'); Sound.fx.drumroll(0.6); await U.sleep(1000); break;
        case 'reveal': this.render(); await U.sleep(500); break;
        case 'settle': {
          const el = this.seatEl(s);
          el.classList.add(ev.net > 0 ? 'winner' : ev.net < 0 ? 'lost' : 'even');
          const c = U.center(el.querySelector('.pv-av'));
          if (ev.net) FX.float(c.x, c.y - 20, (ev.net > 0 ? '+' : '−') + U.fmt(Math.abs(ev.net)), ev.net > 0 ? 'good' : 'bad');
          break;
        }
      }
    }
  }

  C.register(new Mahjong());
})();
