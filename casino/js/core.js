/* Core: wallet, levels, shared table components (chips, bet boards, cards),
   modal/toast, and the view router. Exposed as window.C */
(function () {
  const DEFAULT_STATS = { wagered: 0, won: 0, rounds: 0, biggest: 0, bestMult: 0 };
  const S = {
    balance: LS.get('bal', 10000),
    xp: LS.get('xp', 0),
    level: LS.get('lvl', 1),
    stats: Object.assign({}, DEFAULT_STATS, LS.get('stats', {}))
  };
  if (!Number.isFinite(S.balance) || S.balance < 0) S.balance = 10000;
  function save() { LS.set('bal', S.balance); LS.set('xp', S.xp); LS.set('lvl', S.level); LS.set('stats', S.stats); }

  let shown = S.balance, flying = 0;
  const balEl = () => document.getElementById('bal-num');
  const balWrap = () => document.getElementById('balance');
  function paint() { const e = balEl(); if (e) e.textContent = U.fmt(Math.max(0, shown)); }

  const xpFor = l => Math.round(2500 * Math.pow(l, 1.55));
  function paintLevel() {
    const lv = document.getElementById('lvl-num'), bar = document.getElementById('lvl-bar');
    if (lv) lv.textContent = S.level;
    if (bar) bar.style.width = Math.min(100, (S.xp / xpFor(S.level)) * 100) + '%';
  }
  function addXp(a) {
    S.xp += a;
    let ups = 0;
    while (S.xp >= xpFor(S.level)) { S.xp -= xpFor(S.level); S.level++; ups++; }
    paintLevel();
    if (ups) setTimeout(() => levelUp(), 600);
  }
  function levelUp() {
    const reward = 1000 * S.level;
    Sound.fx.levelUp();
    const box = U.h('div', { class: 'lvl-pop' },
      U.h('div', { class: 'lvl-badge' }, String(S.level)),
      U.h('div', { class: 'lvl-t' }, I18N.t('lvl.up')),
      U.h('div', { class: 'lvl-r' }, I18N.t('lvl.reward', { n: U.fmt(reward) })));
    document.body.appendChild(box);
    const c = { x: innerWidth / 2, y: innerHeight * 0.4 };
    FX.confetti(c.x, c.y, 70); FX.sparks(c.x, c.y, 30, 'gold', 1.6);
    Sound.say(I18N.t('lvl.up'));
    setTimeout(() => {
      C.pay(reward, box.querySelector('.lvl-badge'));
      box.classList.add('out'); setTimeout(() => box.remove(), 500);
    }, 1900);
  }

  function checkBroke() {
    const b = document.getElementById('refill');
    if (b) b.hidden = S.balance >= 100;
  }

  const C = {
    S, save, games: {}, current: null,

    register(g) { C.games[g.id] = g; },

    /* ---------- wallet ---------- */
    // force: the engine already checked the balance (live tables), never refuse
    take(amount, force) {
      amount = Math.floor(amount);
      if (amount <= 0) return true;
      if (S.balance < amount && !force) { C.noFunds(); return false; }
      amount = Math.min(amount, S.balance);
      S.balance -= amount; S.stats.wagered += amount;
      shown -= amount; paint();
      U.pulse(balWrap(), 'down');
      addXp(amount); save(); checkBroke();
      return true;
    },
    refund(amount) {
      amount = Math.floor(amount); if (amount <= 0) return;
      S.balance += amount; S.stats.wagered = Math.max(0, S.stats.wagered - amount);
      S.xp = Math.max(0, S.xp - amount); paintLevel(); save();
      C.animShown(amount, 350); checkBroke();
    },
    // credit winnings; `from` is an element or {x,y} coins fly from
    pay(amount, from, stat = true) {
      amount = Math.floor(amount); if (amount <= 0) return;
      S.balance += amount; if (stat) S.stats.won += amount; save(); checkBroke();
      const target = balWrap();
      if (!from || !target) { C.animShown(amount, 600); return; }
      const pt = from.nodeType ? U.center(from) : from;
      const count = U.clamp(Math.round(Math.log10(amount + 1) * 4), 4, 26);
      const share = Math.floor(amount / count);
      let given = 0;
      flying++;
      FX.home(pt, target, count, (i, n) => {
        const add = i === n ? amount - given : share;
        given += add; shown += add; paint();
        U.pulse(balWrap(), 'up');
        Sound.fx.coin(1 + (i / n) * 0.6);
      }, () => { flying--; if (!flying) { shown = S.balance; paint(); } });
    },
    animShown(delta, dur) {
      let applied = 0;
      U.tween(dur, e => { const v = Math.round(delta * e); shown += v - applied; applied = v; paint(); });
      if (delta > 0) U.pulse(balWrap(), 'up');
    },
    record(ret, bet) {
      S.stats.rounds++;
      if (ret > S.stats.biggest) S.stats.biggest = ret;
      if (bet > 0 && ret / bet > S.stats.bestMult) S.stats.bestMult = Math.round((ret / bet) * 100) / 100;
      save();
    },
    noFunds() {
      Sound.fx.error(); U.pulse(balWrap(), 'shake-x');
      C.toast(I18N.t('toast.noFunds'), 'bad');
      checkBroke();
    },
    refill() {
      if (S.balance >= 100) return;
      C.pay(10000, document.getElementById('refill'));
      Sound.fx.fanfare(1);
      C.toast(I18N.t('toast.refill'), 'good');
    },
    paintAll() { shown = S.balance; paint(); paintLevel(); checkBroke(); },
    xpFor,

    /* ---------- UI bits ---------- */
    toast(text, kind = '') {
      const host = document.getElementById('toasts');
      const t = U.h('div', { class: 'toast ' + kind }, text);
      host.appendChild(t);
      setTimeout(() => { t.classList.add('out'); setTimeout(() => t.remove(), 400); }, 2200);
    },
    modal({ title, body, actions = [], wide = false, onClose }) {
      const ov = U.h('div', { class: 'modal-ov' });
      const box = U.h('div', { class: 'modal' + (wide ? ' wide' : ''), role: 'dialog', 'aria-modal': 'true' });
      const close = () => { ov.classList.add('out'); setTimeout(() => ov.remove(), 250); document.removeEventListener('keydown', esc); onClose && onClose(); };
      const esc = e => { if (e.key === 'Escape') close(); };
      box.append(
        U.h('div', { class: 'modal-head' }, U.h('h2', null, title),
          U.h('button', { class: 'icon-btn', 'aria-label': I18N.t('ui.close'), onclick: () => { Sound.fx.click(); close(); }, html: C.icon('x') })),
        U.h('div', { class: 'modal-body' }, body));
      if (actions.length) {
        box.append(U.h('div', { class: 'modal-foot' }, actions.map(a => U.h('button', {
          class: 'btn ' + (a.primary ? 'btn-gold' : 'btn-ghost'),
          onclick: () => { Sound.fx.click(); if (a.onClick) a.onClick(close); else close(); }
        }, a.label))));
      }
      ov.append(box);
      ov.addEventListener('click', e => { if (e.target === ov) close(); });
      document.addEventListener('keydown', esc);
      document.body.appendChild(ov);
      Sound.fx.open();
      return close;
    },
    icon(name) {
      const P = {
        x: '<path d="M6 6l12 12M18 6L6 18"/>',
        back: '<path d="M15 5l-7 7 7 7"/>',
        info: '<circle cx="12" cy="12" r="9"/><path d="M12 11v6M12 7.5v.5"/>',
        gear: '<circle cx="12" cy="12" r="3.2"/><path d="M12 2.5v3M12 18.5v3M2.5 12h3M18.5 12h3M5.3 5.3l2.1 2.1M16.6 16.6l2.1 2.1M5.3 18.7l2.1-2.1M16.6 7.4l2.1-2.1"/>',
        sound: '<path d="M4 9.5h3.5L12 5.5v13l-4.5-4H4z"/><path d="M15.5 9a4 4 0 010 6M18 6.5a7.5 7.5 0 010 11"/>',
        mute: '<path d="M4 9.5h3.5L12 5.5v13l-4.5-4H4z"/><path d="M16 9.5l5 5M21 9.5l-5 5"/>',
        undo: '<path d="M9 7L4 12l5 5"/><path d="M4 12h10a6 6 0 010 12" transform="translate(0 -6)"/>',
        clear: '<path d="M5 7h14M9 7V4.5h6V7M7 7l1 13h8l1-13"/>',
        repeat: '<path d="M4 12a8 8 0 0114-5.3M20 12a8 8 0 01-14 5.3"/><path d="M18 3v4h-4M6 21v-4h4"/>',
        double: '<path d="M6 17L17 6M8 6h9v9"/>',
        bolt: '<path d="M13 3L5 13.5h6L10 21l9-11h-6z"/>',
        auto: '<path d="M4 12a8 8 0 1016 0 8 8 0 00-16 0z"/><path d="M10 8.5l5 3.5-5 3.5z"/>',
        chart: '<path d="M4 20V4M4 20h16M8 15l4-5 3 3 5-7"/>'
      };
      return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${P[name] || ''}</svg>`;
    },

    /* ---------- chips ---------- */
    CHIPS: [10, 50, 100, 500, 1000, 5000, 25000],
    chipLabel: v => v >= 1000 ? (v / 1000) + 'K' : String(v),
    chipEl(v, tag = 'div') {
      return U.h(tag, { class: 'chip c-' + v, 'data-v': v }, U.h('span', null, C.chipLabel(v)));
    },
    decompose(amount) {
      const out = [];
      for (const v of [...C.CHIPS].reverse()) while (amount >= v && out.length < 40) { out.push(v); amount -= v; }
      return out;
    },
    stack(amount, { max = 7, label = true } = {}) {
      const wrap = U.h('div', { class: 'stack' });
      const chips = C.decompose(amount).reverse().slice(-max);
      chips.forEach((v, i) => { const c = C.chipEl(v); c.style.setProperty('--i', i); wrap.appendChild(c); });
      if (label) wrap.appendChild(U.h('b', { class: 'stack-amt' }, U.fmtShort(amount)));
      return wrap;
    },
    flyChip(fromEl, toEl, v) {
      if (!fromEl || !toEl) return Promise.resolve();
      const a = U.center(fromEl), b = U.center(toEl);
      const c = C.chipEl(v); c.classList.add('chip-fly');
      c.style.left = (a.x - 22) + 'px'; c.style.top = (a.y - 22) + 'px';
      document.body.appendChild(c);
      const dx = b.x - a.x, dy = b.y - a.y;
      const anim = c.animate([
        { transform: 'translate(0,0) scale(1) rotate(0)' },
        { transform: `translate(${dx * 0.5}px,${dy * 0.5 - 60}px) scale(1.15) rotate(180deg)`, offset: 0.5 },
        { transform: `translate(${dx}px,${dy}px) scale(.7) rotate(360deg)` }
      ], { duration: U.reduced ? 120 : 360, easing: 'cubic-bezier(.3,.7,.4,1)' });
      return anim.finished.then(() => c.remove()).catch(() => c.remove());
    },
    ChipBar(host, { values = C.CHIPS } = {}) {
      let value = LS.get('chip', 100);
      if (!values.includes(value)) value = values[2] || values[0];
      host.classList.add('chipbar');
      const btns = values.map(v => {
        const b = C.chipEl(v, 'button');
        b.setAttribute('aria-label', U.fmt(v));
        b.addEventListener('click', () => { value = v; LS.set('chip', v); sync(); Sound.fx.chip(); });
        host.appendChild(b); return b;
      });
      function sync() { btns.forEach(b => b.classList.toggle('sel', +b.dataset.v === value)); }
      sync();
      return {
        get value() { return value; },
        get el() { return btns.find(b => +b.dataset.v === value) || host; }
      };
    },
    /* - / value / + stepper for single-bet games */
    Stepper(host, { values, key, def }) {
      let idx = values.indexOf(LS.get(key, def)); if (idx < 0) idx = values.indexOf(def);
      host.classList.add('stepper');
      const minus = U.h('button', { class: 'step-btn', 'aria-label': '-', html: '&minus;' });
      const val = U.h('div', { class: 'step-val' });
      const lab = U.h('div', { class: 'step-lab', 'data-i18n': 'ui.bet' }, I18N.t('ui.bet'));
      const plus = U.h('button', { class: 'step-btn', 'aria-label': '+', html: '+' });
      host.append(minus, U.h('div', { class: 'step-mid' }, lab, val), plus);
      let locked = false;
      const api = {
        get value() { return values[idx]; },
        set locked(v) { locked = v; minus.disabled = plus.disabled = v; },
        onChange: null,
        set(i) { idx = U.clamp(i, 0, values.length - 1); LS.set(key, values[idx]); val.textContent = U.fmt(values[idx]); U.pulse(val, 'pop'); api.onChange && api.onChange(values[idx]); }
      };
      minus.onclick = () => { if (!locked) { Sound.fx.chip(); api.set(idx - 1); } };
      plus.onclick = () => { if (!locked) { Sound.fx.chip(); api.set(idx + 1); } };
      val.textContent = U.fmt(values[idx]);
      return api;
    },

    /* ---------- cards ---------- */
    SUITS: ['♠', '♥', '♦', '♣'],
    RANKS: ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'],
    shoe(decks) {
      const a = [];
      for (let d = 0; d < decks; d++) for (const s of C.SUITS) for (const r of C.RANKS) a.push({ r, s });
      return U.shuffle(a);
    },
    cardEl(card, faceDown = true) {
      const red = card.s === '♥' || card.s === '♦';
      const face = ['J', 'Q', 'K'].includes(card.r);
      const el = U.h('div', { class: 'card' + (red ? ' red' : '') + (faceDown ? ' down' : '') + (face ? ' face' : '') },
        U.h('div', { class: 'ci' },
          U.h('div', { class: 'cf' },
            U.h('div', { class: 'cc tl' }, U.h('b', null, card.r), U.h('i', null, card.s)),
            U.h('div', { class: 'cm' }, face ? U.h('b', null, card.r) : null, U.h('i', null, card.s)),
            U.h('div', { class: 'cc br' }, U.h('b', null, card.r), U.h('i', null, card.s))),
          U.h('div', { class: 'cb' })));
      el.setAttribute('aria-label', faceDown ? '?' : card.r + card.s);
      el._card = card;
      return el;
    },
    async dealCard(card, container, { from, faceDown = false, sideways = false, flipDelay = 120 } = {}) {
      const el = C.cardEl(card, true);
      if (sideways) el.classList.add('side');
      container.appendChild(el);
      Sound.fx.deal();
      if (from && !U.reduced) {
        const a = from.getBoundingClientRect(), b = el.getBoundingClientRect();
        const dx = a.left + a.width / 2 - (b.left + b.width / 2), dy = a.top + a.height / 2 - (b.top + b.height / 2);
        const end = sideways ? 'rotate(90deg)' : 'none';
        await el.animate([
          { transform: `translate(${dx}px,${dy}px) rotate(-25deg) scale(.85)` },
          { transform: end }
        ], { duration: 360, easing: 'cubic-bezier(.2,.9,.3,1.05)' }).finished.catch(() => {});
      }
      if (!faceDown) { await U.sleep(flipDelay); C.flip(el); await U.sleep(200); }
      return el;
    },
    flip(el) {
      if (!el.classList.contains('down')) return;
      el.classList.remove('down');
      el.setAttribute('aria-label', el._card.r + el._card.s);
      Sound.fx.flip();
    },

    /* ---------- routing ---------- */
    go(id) {
      if (!id || (id !== 'lobby' && !C.games[id])) id = 'lobby';
      if (C.current === id) return;
      const prev = C.current;
      if (prev && C.games[prev] && C.games[prev].leave) C.games[prev].leave();
      U.$$('.view').forEach(v => v.classList.remove('active'));
      let view = document.querySelector(`.view[data-view="${id}"]`);
      if (!view) view = C.buildGameView(id);
      view.classList.add('active');
      C.current = id;
      document.body.dataset.view = id;
      if (location.hash.slice(1) !== id) history.replaceState(null, '', '#' + id);
      scrollTo(0, 0);
      if (id === 'lobby') C.onLobby && C.onLobby();
      else {
        const g = C.games[id];
        if (!g._inited) { g.init(view.querySelector('.game-body')); g._inited = true; }
        g.enter && g.enter();
      }
    },
    buildGameView(id) {
      const g = C.games[id];
      const view = U.h('section', { class: 'view game-view', 'data-view': id, id: 'view-' + id },
        U.h('div', { class: 'game-head' },
          U.h('button', { class: 'btn-back', onclick: () => { Sound.fx.click(); C.go('lobby'); } },
            U.h('span', { html: C.icon('back') }), U.h('span', { 'data-i18n': 'ui.lobby' }, I18N.t('ui.lobby'))),
          U.h('h1', { class: 'game-title', 'data-i18n': 'game.' + id }, I18N.t('game.' + id)),
          U.h('button', { class: 'icon-btn', 'aria-label': I18N.t('ui.rules'), 'data-i18n-aria': 'ui.rules', html: C.icon('info'),
            onclick: () => { Sound.fx.click(); C.modal({ title: I18N.t('game.' + id), body: U.h('div', { class: 'rules', html: g.rules() }), wide: true }); } })),
        U.h('div', { class: 'game-body' }));
      document.getElementById('views').appendChild(view);
      return view;
    },

    /* keyboard shortcuts routed to the active game */
    keys(e) {
      if (e.target.matches('input, textarea, select') || document.querySelector('.modal-ov')) return;
      const g = C.games[C.current];
      if (g && g.key && g.key(e)) e.preventDefault();
    }
  };

  /* ---------- Bet board: chips on labeled cells (roulette, sic bo, baccarat) ---------- */
  class BetBoard {
    constructor({ root, chips, canBet = () => true, onChange = () => {} }) {
      this.root = root; this.chips = chips; this.canBet = canBet; this.onChange = onChange;
      this.bets = {}; this.hist = []; this.last = null;
      root.addEventListener('click', e => {
        const cell = e.target.closest('[data-bet]');
        if (!cell || !root.contains(cell)) return;
        this.place(cell.dataset.bet);
      });
    }
    cell(key) { return this.root.querySelector(`[data-bet="${key}"]`); }
    total() { return Object.values(this.bets).reduce((a, b) => a + b, 0); }
    place(key, amt = this.chips.value, quiet = false) {
      if (!this.canBet()) { Sound.fx.error(); return false; }
      if (!C.take(amt)) return false;
      this.bets[key] = (this.bets[key] || 0) + amt;
      this.hist.push([key, amt]);
      const cell = this.cell(key);
      if (!quiet) C.flyChip(this.chips.el, cell, amt).then(() => { this.render(key); Sound.fx.chip(); U.pulse(cell, 'bump'); });
      else this.render(key);
      this.onChange();
      return true;
    }
    render(key) {
      const cell = this.cell(key); if (!cell) return;
      const old = cell.querySelector(':scope > .stack'); if (old) old.remove();
      if (this.bets[key]) cell.appendChild(C.stack(this.bets[key], { max: 4 }));
    }
    renderAll() { U.$$('[data-bet]', this.root).forEach(c => this.render(c.dataset.bet)); }
    undo() {
      if (!this.canBet()) return;
      const h = this.hist.pop(); if (!h) return;
      const [key, amt] = h;
      this.bets[key] -= amt; if (this.bets[key] <= 0) delete this.bets[key];
      C.refund(amt); this.render(key); Sound.fx.chip(); this.onChange();
    }
    clear() {
      if (!this.canBet()) return;
      const t = this.total(); if (!t) return;
      const keys = Object.keys(this.bets);
      this.bets = {}; this.hist = [];
      keys.forEach(k => this.render(k));
      C.refund(t); Sound.fx.chipsSlide(); this.onChange();
    }
    rebet() {
      if (!this.canBet() || !this.last) return;
      const need = Object.values(this.last).reduce((a, b) => a + b, 0);
      if (C.S.balance < need) { C.noFunds(); return; }
      for (const k in this.last) this.place(k, this.last[k], true);
      Sound.fx.chipsSlide();
    }
    double() {
      if (!this.canBet()) return;
      const cur = { ...this.bets }, need = this.total();
      if (!need) return;
      if (C.S.balance < need) { C.noFunds(); return; }
      for (const k in cur) this.place(k, cur[k], true);
      Sound.fx.chipsSlide();
    }
    /* retFn(key, amount) -> total returned (stake included) or 0. Animates and pays. */
    async settle(retFn) {
      const bet = this.total(); let ret = 0;
      const wins = [], loses = [];
      for (const k in this.bets) {
        const r = Math.floor(retFn(k, this.bets[k]));
        if (r > 0) { wins.push([k, r]); ret += r; } else loses.push(k);
      }
      loses.forEach(k => {
        const st = this.cell(k) && this.cell(k).querySelector(':scope > .stack');
        if (st) st.animate([{ transform: 'none', opacity: 1 }, { transform: 'translateY(-60px) scale(.6)', opacity: 0 }],
          { duration: 500, easing: 'ease-in', fill: 'forwards' });
      });
      if (loses.length) Sound.fx.chipsSlide();
      await U.sleep(wins.length ? 250 : 0);
      for (const [k, r] of wins) {
        const cell = this.cell(k);
        if (cell) { cell.classList.add('won'); const c = U.center(cell); FX.sparks(c.x, c.y, 14, 'gold'); FX.float(c.x, c.y - 10, '+' + U.fmt(r), 'good'); }
        C.pay(r, cell);
        await U.sleep(120);
      }
      C.record(ret, bet);
      this.last = { ...this.bets };
      return { ret, bet };
    }
    reset() {
      const keys = Object.keys(this.bets);
      this.bets = {}; this.hist = [];
      keys.forEach(k => this.render(k));
      U.$$('.won', this.root).forEach(c => c.classList.remove('won'));
      this.onChange();
    }
  }
  C.BetBoard = BetBoard;

  window.C = C;
})();
