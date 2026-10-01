/* Card-room tables (棋牌室): the seat ring, avatars, speech bubbles, table chat and the
   driver every pvp game shares. Every move, yours or an opponent's, goes through
   Casino.live(id): the same engine, rules and events an outside AI agent uses.

   A game view extends PvP.Table and supplies:
     stakeParam            name of the stake param on its `start` action
     renderGame(obs)       draw the centre, seats' cards and your hand from an observation
     actions(obs, legal)   [{ label, cls, act | onClick, hint }] buttons for your turn
     onEvent(ev)           optional animation for one event (await-able)
     rules()               HTML for the How-to-play modal */
(function () {
  const t = (k, v) => I18N.t(k, v);
  const POS = { 3: ['bottom', 'right', 'left'], 4: ['bottom', 'right', 'top', 'left'], 5: ['bottom', 'right', 'top-right', 'top-left', 'left'] };
  const QUICK = ['pv.q1', 'pv.q2', 'pv.q3', 'pv.q4', 'pv.q5', 'pv.q6', 'pv.q7', 'pv.q8'];
  const VOICE = { hao: { pitch: 0.7, rate: 1.12 }, ling: { pitch: 1.25, rate: 1.05, female: true }, oldk: { pitch: 0.6, rate: 0.88 }, mei: { pitch: 1.5, rate: 1.12, female: true }, ace: { pitch: 0.5, rate: 0.82 }, fei: { pitch: 0.95, rate: 1.25 } };

  /* ---------- cards & tiles from engine codes ---------- */
  function card(code, { cls = '', down = false } = {}) {
    if (code === 'BJ' || code === 'RJ') {
      const red = code === 'RJ';
      const el = U.h('div', { class: 'card joker face' + (red ? ' red' : '') + (down ? ' down' : '') + (cls ? ' ' + cls : ''), 'aria-label': red ? 'Red Joker' : 'Black Joker' },
        U.h('div', { class: 'ci' },
          U.h('div', { class: 'cf' }, U.h('div', { class: 'jk-t' }, 'JOKER'), U.h('div', { class: 'jk-m' }, red ? '大王' : '小王')),
          U.h('div', { class: 'cb' })));
      el.dataset.code = code;
      return el;
    }
    const c = code && code !== '??' ? Engines.Cards.decode(code) : null;
    const el = C.cardEl(c || { r: 'A', s: '♠' }, !c || down);
    if (cls) el.className += ' ' + cls;
    el.dataset.code = code || '??';
    return el;
  }
  function flip(el) { if (!el.classList.contains('down')) return; el.classList.remove('down'); Sound.fx.flip(); }
  /* bring a row of cards / tiles in line with `codes`, flipping the ones that just became known */
  function sync(host, codes, { mk = card, stagger = 90 } = {}) {
    const kids = [...host.children];
    const same = kids.length === codes.length && kids.every((k, i) => k.dataset.code === codes[i] || (k.dataset.code === '??' && codes[i] !== '??'));
    if (!same) { host.innerHTML = ''; codes.forEach(c => { const el = mk(c); el.dataset.code = c; host.appendChild(el); }); return false; }
    let n = 0;
    codes.forEach((c, i) => {
      const k = kids[i];
      if (k.dataset.code === c) return;
      const el = mk(c, { down: true }); el.dataset.code = c;
      k.replaceWith(el);
      setTimeout(() => flip(el), 40 + n++ * stagger);
    });
    return n > 0;
  }
  const NUM_ZH = ['', '一', '二', '三', '四', '五', '六', '七', '八', '九'];
  const SUIT_ZH = { m: '万', s: '条', p: '筒' };
  function tile(code, { cls = '' } = {}) {
    if (!code || code === '??') return U.h('div', { class: 'mjt back ' + cls, 'aria-label': '?' });
    const n = +code[0], s = code[1];
    const el = U.h('div', { class: `mjt t-${s} ${cls}`, 'data-tile': code, 'aria-label': n + SUIT_ZH[s] },
      U.h('b', null, s === 'm' ? NUM_ZH[n] : String(n)), U.h('i', null, SUIT_ZH[s]),
      s === 'p' ? U.h('span', { class: 'pips', html: '●'.repeat(Math.min(n, 9)) }) : null);
    return el;
  }

  class Table {
    constructor(id, opts = {}) {
      this.id = id; this.opts = opts; this.busy = false; this.log = [];
    }
    get L() { return Casino.live(this.id); }
    pos(seat) { const order = this.L.seatIds; return (POS[order.length] || POS[4])[order.indexOf(seat)] || 'top'; }
    seatEl(seat) { return this.root.querySelector(`.pv-seat[data-seat="${seat}"]`); }
    persona(seat) { const m = this.L.seat(seat).meta || {}; return m.persona; }
    name(seat) {
      if (seat === 'you') return t('pv.you');
      const m = this.L.seat(seat).meta || {};
      return m.name ? (m.name[I18N.lang] || m.name.en) : this.L.seat(seat).name;
    }

    init(root) {
      this.root = root;
      root.innerHTML = `
        <div class="pv-wrap pv-${this.id}">
          <div class="pv-main">
            <div class="felt pv-felt">
              <div class="pv-center"></div>
              <div class="pv-seats"></div>
              <div class="table-msg" aria-live="polite"></div>
            </div>
            <div class="pv-me">
              <div class="pv-hand-wrap"><div class="pv-hand"></div></div>
              <div class="pv-hint" aria-live="polite"></div>
              <div class="pv-actions btn-row"></div>
            </div>
          </div>
          <aside class="pv-chat">
            <button class="pv-chat-head" aria-expanded="false"><span data-i18n="pv.chat">${t('pv.chat')}</span><b class="pv-unread" hidden>0</b><span class="pv-ai-tag" hidden>AI</span></button>
            <div class="pv-chat-body">
              <div class="pv-log" aria-live="polite"></div>
              <div class="pv-quick"></div>
              <form class="pv-say"><input type="text" maxlength="120" autocomplete="off" placeholder="${t('pv.sayPh')}" aria-label="${t('pv.sayPh')}"><button class="btn btn-ghost btn-sm" type="submit">${t('pv.send')}</button></form>
            </div>
          </aside>
        </div>`;
      const $ = s => root.querySelector(s);
      this.$ = $;
      this.felt = $('.pv-felt'); this.center = $('.pv-center'); this.handEl = $('.pv-hand');
      this.actEl = $('.pv-actions'); this.hintEl = $('.pv-hint'); this.msg = $('.table-msg');
      this.chatLog = $('.pv-log');
      const chat = $('.pv-chat');
      $('.pv-chat-head').onclick = () => { const open = !chat.classList.contains('open'); chat.classList.toggle('open', open); $('.pv-chat-head').setAttribute('aria-expanded', open); if (open) { this.unread = 0; this.paintUnread(); } Sound.fx.click(); };
      $('.pv-say').onsubmit = e => { e.preventDefault(); const inp = $('.pv-say input'); const v = inp.value.trim(); if (v) { inp.value = ''; this.say(v); } };
      this.paintQuick();
      this.unread = 0;
      this.buildSeats();
      // opponents' replies to chat arrive on the bus, possibly seconds later (a model is typing)
      Casino.on('say', ev => { if (ev.reply && ev.game === this.id && ev.seat !== 'you' && C.current === this.id) this.speak(ev.seat, ev.text); });
      addEventListener('langchange', () => { if (this._inited) { this.paintQuick(); this.buildSeats(); this.render(); } });
      this._inited = true;
      this.setup && this.setup();
    }
    paintQuick() {
      const q = this.$('.pv-quick'); q.innerHTML = '';
      QUICK.forEach(k => q.appendChild(U.h('button', { class: 'pv-q', type: 'button', onclick: () => this.say(t(k)) }, t(k))));
      this.$('.pv-say input').placeholder = t('pv.sayPh');
    }
    buildSeats() {
      const host = this.$('.pv-seats'); host.innerHTML = '';
      for (const id of this.L.seatIds) {
        const s = this.L.seat(id), m = s.meta || {};
        const el = U.h('div', { class: `pv-seat pos-${this.pos(id)}${id === 'you' ? ' me' : ''}`, 'data-seat': id },
          U.h('div', { class: 'pv-plate' },
            U.h('div', { class: 'pv-av', style: `--c:${id === 'you' ? '#f6c94e' : m.color || '#888'}` }, id === 'you' ? '我' : m.av || '?', U.h('i', { class: 'pv-role' })),
            U.h('div', { class: 'pv-meta' }, U.h('b', { class: 'pv-name' }, this.name(id)), U.h('span', { class: 'pv-bal' }, U.fmtShort(s.balance))),
            U.h('div', { class: 'pv-tag' }),
            U.h('div', { class: 'pv-think', 'aria-hidden': 'true' }, U.h('i'), U.h('i'), U.h('i'))),
          U.h('div', { class: 'pv-cards' }),
          U.h('div', { class: 'pv-out' }),
          U.h('div', { class: 'pv-bubble', role: 'status' }));
        if (id !== 'you') el.querySelector('.pv-plate').onclick = () => this.profile(id);
        host.appendChild(el);
      }
      const aiOn = this.L.brains.some(b => b.kind === 'llm');
      this.$('.pv-ai-tag').hidden = !aiOn;
    }
    profile(id) {
      const s = this.L.seat(id), m = s.meta || {}, P = Engines.Brain.PERSONAS[m.persona];
      if (!P) return;
      const kind = s.policy && s.policy.kind;
      C.modal({ title: this.name(id), body: U.h('div', { class: 'pv-profile' },
        U.h('div', { class: 'pv-av big', style: `--c:${m.color}` }, m.av),
        U.h('p', null, P.bio[I18N.lang] || P.bio.en),
        U.h('dl', { class: 'stats-grid' },
          U.h('dt', null, t('pv.style')), U.h('dd', null, t(P.aggr > 0.55 ? 'pv.loose' : P.aggr < 0.4 ? 'pv.tight' : 'pv.steady')),
          U.h('dt', null, t('pv.bluffs')), U.h('dd', null, '●'.repeat(Math.round(P.bluff * 10) || 1)),
          U.h('dt', null, t('pv.brain')), U.h('dd', null, kind === 'llm' ? t('pv.brainLLM') : t('pv.brainScript')),
          U.h('dt', null, t('pv.chips')), U.h('dd', null, U.fmt(s.balance)))) });
    }

    enter() {
      this.L.driver = this;
      this.buildSeats();
      this.render();
      if (!this.greeted) { this.greeted = true; this.greet(); }
      this.kick();
    }
    leave() { if (this.L.driver === this) this.L.driver = null; }
    // let the AI seats play if they are on the move (e.g. after you came back mid-hand)
    async kick() {
      if (this.busy) return;
      const obs = this.L.observe('you');
      if (obs.toAct && obs.toAct !== 'you' && this.L.legal(obs.toAct).length) {
        this.busy = true; this.render();
        try { await this.others(); } finally { this.busy = false; this.render(); }
        this.debrief();
      }
    }
    /* after the hand: expose the bluffs whose cards got shown, and what the language-model players were really thinking */
    debrief() {
      const obs = this.L.observe('you');
      if (obs.phase !== 'done' || this.debriefed) return;
      this.debriefed = true;
      for (const id of this.L.seatIds) {
        const pol = this.L.seat(id).policy;
        if (id === 'you' || !pol || !pol.tells || !pol.tells.length) continue;
        const shown = obs.hands && obs.hands[id] && obs.hands[id].length && !obs.hands[id].includes('??');
        const lies = pol.tells.filter(x => x.kind !== 'think');
        const lie = lies[lies.length - 1];
        if (lie && shown) this.chatLine(null, t(lie.kind === 'bluff' ? 'pv.wasBluff' : 'pv.wasSandbag', { who: this.name(id), s: lie.said }));
        // one inner voice per player: the moment their words and their thoughts parted ways, else their last thought
        const thoughts = pol.tells.filter(x => x.kind === 'think');
        const th = [...thoughts].reverse().find(x => x.said) || thoughts[thoughts.length - 1];
        if (th) this.chatLine(null, t('pv.mind', { who: this.name(id), s: th.text }) + (th.said ? ' ' + t('pv.mindSaid', { s: th.said }) : ''), 'mind');
        pol.tells = [];
      }
    }
    async greet() {
      const others = this.L.seatIds.filter(s => s !== 'you');
      const s = U.pick(others), pid = this.persona(s);
      await U.sleep(900);
      const pol = this.L.seat(s).policy; if (pol) pol.greeted = true; // they already said hello
      const line = Engines.Brain.line('greet', I18N.lang, U.random, {}, pid);
      if (line && C.current === this.id) { this.L.table.say(s, line); this.speak(s, line); }
    }

    /* ---------- driver: one code path for clicks and agents ---------- */
    async perform(action) {
      if (this.busy) return { ok: false, error: 'the table is busy animating; try again in a moment' };
      Sound.unlock();
      this.busy = true; this.render();
      if (action && action.type === 'start') this.debriefed = false;
      const r = this.L.step(action, 'you');
      if (!r.ok) { this.busy = false; this.render(); Sound.fx.error(); C.toast(r.error, 'bad'); return r; }
      const events = [...r.screen];
      try {
        await this.play(r.screen, 'you');
        events.push(...await this.others());
      } finally { this.busy = false; }
      this.render();
      this.debrief();
      return { ok: true, events, obs: this.L.observe('you') };
    }
    others() {
      return this.L.runOthers((evs, s) => this.play(evs, s), {
        onThink: (s, kind) => {
          this.thinking(s, true);
          // humans take a moment; bigger decisions take longer
          const base = kind === 'llm' ? 300 : U.rand(550, 1250) * (this.speed || 1);
          return U.sleep(U.random() < 0.12 ? base + 1400 : base);
        }
      });
    }
    async play(events, actor) {
      this.thinking(actor, false);
      for (const ev of events) {
        if (ev.t === 'say') { this.speak(ev.seat, ev.text); await U.sleep(ev.seat === 'you' ? 100 : 350); continue; }
        if (ev.t === 'turn') { this.turnTo(ev.seat); continue; }
        if (ev.t === 'rebuy') { this.chatLine(null, t('pv.rebuy', { who: this.name(ev.seat), n: U.fmt(ev.amount) })); continue; }
        if (this.onEvent) await this.onEvent(ev, actor);
        if (ev.t === 'settle' && ev.seat === 'you') await this.settled(ev);
      }
      this.render();
    }
    async settled(ev) {
      const from = this.center;
      await U.sleep(250);
      if (ev.net > 0) {
        const c = U.center(from);
        Sound.fx.win(ev.net >= ev.bet * 3 ? 2 : 1);
        this.showMsg(t('ui.youWin', { n: U.fmt(ev.net) }), 'win');
        FX.sparks(c.x, c.y, 24, 'gold', 1.3);
        Sound.say(t('ui.sayWin'));
        this.L.collect(from);
        if (ev.net >= 20000) FX.rain(30, 1.2);
      } else if (ev.net < 0) {
        Sound.fx.lose();
        this.showMsg('−' + U.fmt(-ev.net), 'lose');
        this.L.collect(from);
      } else this.L.collect(from);
    }

    /* ---------- talk ---------- */
    say(text) {
      Sound.fx.click();
      this.speak('you', text);
      Casino.say(this.id, text);
    }
    speak(seat, text) {
      const el = this.seatEl(seat);
      if (el) {
        const b = el.querySelector('.pv-bubble');
        b.textContent = text; b.classList.remove('show'); void b.offsetWidth; b.classList.add('show');
        clearTimeout(b._t); b._t = setTimeout(() => b.classList.remove('show'), 2600 + text.length * 60);
      }
      this.chatLine(seat, text);
      if (seat !== 'you') {
        Sound.fx.tick(1.6);
        Sound.say(text, VOICE[this.persona(seat)] || {});
      }
    }
    chatLine(seat, text, cls = '') {
      const row = seat
        ? U.h('div', { class: 'pv-line' + (seat === 'you' ? ' me' : '') }, U.h('b', { style: seat === 'you' ? '' : `color:${(this.L.seat(seat).meta || {}).color}` }, this.name(seat)), ' ', text)
        : U.h('div', { class: 'pv-line sys' + (cls ? ' ' + cls : '') }, text);
      this.chatLog.appendChild(row);
      while (this.chatLog.children.length > 60) this.chatLog.firstChild.remove();
      this.chatLog.scrollTop = this.chatLog.scrollHeight;
      if (seat && seat !== 'you' && !this.$('.pv-chat').classList.contains('open')) { this.unread++; this.paintUnread(); }
    }
    paintUnread() { const u = this.$('.pv-unread'); u.hidden = !this.unread; u.textContent = this.unread; }

    /* ---------- seat state ---------- */
    thinking(seat, on) { const el = seat && this.seatEl(seat); if (el) el.classList.toggle('thinking', on); }
    turnTo(seat) { U.$$('.pv-seat', this.root).forEach(el => el.classList.toggle('turn', el.dataset.seat === seat)); if (seat === 'you') Sound.fx.tick(1.3); }
    tag(seat, text, cls = '') { const el = this.seatEl(seat); if (!el) return; const tg = el.querySelector('.pv-tag'); tg.textContent = text || ''; tg.className = 'pv-tag ' + cls; }
    role(seat, text) { const el = this.seatEl(seat); if (el) { const r = el.querySelector('.pv-role'); r.textContent = text || ''; r.hidden = !text; } }
    showMsg(text, cls = '') { this.msg.className = 'table-msg ' + cls; this.msg.textContent = text; if (text) U.pulse(this.msg, 'show'); }
    flyChips(fromSeat, toEl, amount) {
      const from = fromSeat === 'you' ? this.seatEl('you').querySelector('.pv-av') : this.seatEl(fromSeat) && this.seatEl(fromSeat).querySelector('.pv-av');
      Sound.fx.chip();
      return C.flyChip(from, toEl, C.decompose(Math.max(10, amount))[0] || 10);
    }

    /* ---------- render ---------- */
    render() {
      if (!this.root) return;
      const obs = this.L.observe('you');
      for (const id of this.L.seatIds) {
        const el = this.seatEl(id); if (!el) continue;
        const s = this.L.seat(id);
        el.querySelector('.pv-bal').textContent = U.fmtShort(id === 'you' ? C.S.balance + this.L.pending : s.balance);
        el.querySelector('.pv-name').textContent = this.name(id);
      }
      U.$$('.pv-seat', this.root).forEach(el => el.classList.toggle('turn', obs.toAct === el.dataset.seat && obs.phase !== 'idle' && obs.phase !== 'done'));
      this.renderGame(obs);
      this.renderActions(obs);
    }
    renderActions(obs) {
      const host = this.actEl; host.innerHTML = '';
      const legal = obs.toAct === 'you' ? obs.legal : [];
      if (this.busy) { host.appendChild(U.h('div', { class: 'pv-wait' }, t('pv.waiting'))); return; }
      const start = legal.find(l => l.type === 'start');
      if (start) { this.renderStart(host, start); return; }
      if (obs.phase === 'idle' || obs.phase === 'done' || !legal.length) {
        if (obs.phase !== 'idle' && obs.phase !== 'done') host.appendChild(U.h('div', { class: 'pv-wait' }, t('pv.waiting')));
        else if (!start) host.appendChild(U.h('div', { class: 'pv-wait' }, t('pv.broke')));
        return;
      }
      for (const b of this.actions(obs, legal)) {
        const btn = U.h('button', { class: 'btn ' + (b.cls || 'btn-ghost'), disabled: b.disabled || false, title: b.hint || '' }, b.label);
        btn.onclick = () => { Sound.fx.click(); if (b.onClick) b.onClick(); else this.perform(b.act); };
        host.appendChild(btn);
      }
    }
    renderStart(host, spec) {
      const key = this.opts.stakeKey || 'stake', param = spec.params[key], vals = param.enum;
      let v = LS.get('pv_' + this.id, vals.includes(100) ? 100 : vals[0]);
      if (!vals.includes(v)) v = vals[0];
      const seg = U.h('div', { class: 'pv-stakes', role: 'radiogroup', 'aria-label': t('pv.stake') },
        U.h('span', { class: 'pv-stake-lab' }, t('pv.stake')),
        vals.map(x => U.h('button', { class: 'seg-btn' + (x === v ? ' on' : ''), role: 'radio', 'aria-checked': x === v, onclick: e => { v = x; LS.set('pv_' + this.id, x); U.$$('.seg-btn', seg).forEach(b => { b.classList.toggle('on', b === e.currentTarget); b.setAttribute('aria-checked', b === e.currentTarget); }); Sound.fx.chip(); } }, U.fmtShort(x))));
      const go = U.h('button', { class: 'btn btn-gold btn-lg' }, t('pv.deal'));
      go.onclick = () => this.perform({ type: 'start', [key]: v });
      host.append(seg, go);
      this.hint(this.stakeHint ? this.stakeHint() : '');
    }
    hint(text) { this.hintEl.textContent = text || ''; }
    key(e) {
      if (e.key === 'Enter' && !this.busy) {
        const b = this.actEl.querySelector('.btn-gold:not(:disabled)'); if (b) { b.click(); return true; }
      }
    }
  }

  window.PvP = { Table, card, tile, flip, sync, NUM_ZH, SUIT_ZH };
})();
