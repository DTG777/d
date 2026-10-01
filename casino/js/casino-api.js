/* window.Casino: the live, AI-native API of the running casino.

   The screen and any agent go through the same doors:
     Casino.games() / describe(id)          what exists and the full rules
     Casino.observe(id, seat?)               what a seat may see + its legal actions
     Casino.act(id, action, seat?)           -> Promise<{ ok, events, obs }>
                                             for "you" it plays through the on-screen table, with animation
     Casino.join(id, { name, policy })       seat an agent at a live table (policy: obs => action | Promise)
     Casino.on(type, fn)                     every engine event, plus 'balance', 'jackpot', 'join', 'leave'
     Casino.tools() / Casino.call(name, in)  function-calling tools + dispatcher for LLM agents
     Casino.sim(id, opts)                    headless Engines.Session for instant simulations
   See docs/AGENT_API.md. */
(function () {
  const E = Engines, A = E.Agent;

  /* ---------- event bus ---------- */
  const subs = {};
  function on(type, fn) { (subs[type] = subs[type] || []).push(fn); return () => off(type, fn); }
  function off(type, fn) { subs[type] = (subs[type] || []).filter(f => f !== fn); }
  function emit(type, data) {
    for (const f of [...(subs[type] || []), ...(type !== '*' ? subs['*'] || [] : [])]) { try { f(data, type); } catch (e) { console.error(e); } }
  }

  /* ---------- progressive jackpots (pots quoted for a 100 bet) ---------- */
  const JP_SEED = { mini: 500, minor: 2500, major: 25000, grand: 250000 };
  const JP_RATE = { mini: 0.0004, minor: 0.0012, major: 0.004, grand: 0.012 }; // share of each slot bet (normalised to 100)
  const jp = Object.assign({}, JP_SEED, LS.get('jp', {}));
  for (const k in JP_SEED) if (!(jp[k] >= JP_SEED[k])) jp[k] = JP_SEED[k];
  const Jackpots = {
    values: jp, seed: JP_SEED,
    feed(bet) { for (const k in jp) jp[k] += JP_RATE[k] * 100 * Math.min(1, bet / 100) * 3; LS.set('jp', jp); },
    // the floor slowly rises on its own: the rest of the casino is playing too
    drift() { for (const k in jp) jp[k] += JP_RATE[k] * (2 + Math.random() * 6); LS.set('jp', jp); },
    hit(tier) { jp[tier] = JP_SEED[tier]; LS.set('jp', jp); emit('jackpot.reset', { tier }); }
  };
  setInterval(() => Jackpots.drift(), 1000);

  /* ---------- agent wallets: opponents keep their chips between visits ---------- */
  const wallets = LS.get('agents', {});
  const saveWallets = () => LS.set('agents', wallets);

  /* ---------- live tables ---------- */
  const lives = {};
  const HOUSE = [
    { name: { zh: '阿豪', en: 'Hao' }, av: '豪', color: '#e2574c' }, { name: { zh: '玲姐', en: 'Ling' }, av: '玲', color: '#6fb7ff' },
    { name: { zh: '老K', en: 'Old K' }, av: 'K', color: '#35d49a' }, { name: { zh: '小美', en: 'Mei' }, av: '美', color: '#f39bd0' },
    { name: { zh: '赌神', en: 'Ace' }, av: '神', color: '#f6c94e' }, { name: { zh: '大飞', en: 'Fei' }, av: '飞', color: '#b48cff' }
  ];
  const randomSeed = () => { const a = new Uint32Array(2); try { crypto.getRandomValues(a); } catch (e) { a[0] = Date.now(); a[1] = Math.random() * 1e9; } return a[0].toString(36) + a[1].toString(36); };

  class Live {
    constructor(id) {
      const e = E.list[id];
      if (!e) throw new Error(`unknown game "${id}"`);
      this.id = id; this.e = e; this.pending = 0; this.driver = null; this.agents = {};
      const seats = [{ id: 'you', name: 'you', balance: C.S.balance }];
      const n = e.mode === 'pvp' ? e.seats : 1;
      for (let i = 1; i < n; i++) seats.push(this.houseSeat('p' + (i + 1), i - 1));
      this.table = new E.Table(id, { seed: randomSeed(), seats, jackpots: jp });
      this.table.rng = E.rng.crypto();
    }
    houseSeat(seat, i) {
      const h = HOUSE[(i + this.id.length) % HOUSE.length];
      const key = this.id + ':' + seat;
      if (!(wallets[key] > 2000)) wallets[key] = 200000;
      return { id: seat, name: h.name[I18N.lang] || h.name.en, balance: wallets[key], policy: 'bot', meta: { ...h, house: true } };
    }
    seat(id) { return this.table.seats[id]; }
    get seatIds() { return this.table.order; }
    sync() { this.table.seats.you.balance = C.S.balance + this.pending; }
    observe(seat = 'you') { this.sync(); return this.table.observe(seat); }
    legal(seat = 'you') { this.sync(); return this.table.legal(seat); }
    persist() { for (const id of this.table.order) if (id !== 'you' && this.agents[id] == null) wallets[this.id + ':' + id] = this.table.seats[id].balance; saveWallets(); }

    /* apply one action; for "you" the wallet moves: stakes leave now, winnings wait in
       `pending` until the screen calls collect(from) so coins can fly at the right moment */
    step(action, seat = 'you') {
      this.sync();
      const r = this.table.act(seat, action);
      if (!r.ok) return r;
      const youLedger = r.ledger && r.ledger.you || 0;
      if (seat === 'you' || youLedger) {
        const out = (seat === 'you' ? r.debit : 0) + Math.max(0, -youLedger);
        const inc = (seat === 'you' ? r.credit : 0) + Math.max(0, youLedger);
        if (seat === 'you' && r.refund) { C.refund(inc); } else {
          if (out) { C.take(out, true); if (this.e.kind === 'slot' && seat === 'you') Jackpots.feed(out); }
          if (inc) this.pending += inc;
        }
      }
      if (r.jackpots) r.jackpots.forEach(j => Jackpots.hit(j.tier));
      r.screen = E.Table.visible(r.all, 'you'); // what the human's screen may show
      for (const ev of r.screen) {
        if (ev.t === 'settle' && ev.seat === 'you') C.record(ev.ret || 0, ev.bet || 0);
        emit(ev.t, { game: this.id, ...ev }); emit('event', { game: this.id, ...ev });
      }
      if (r.done) this.persist();
      r.obs = this.observe(seat);
      return r;
    }
    // pay out pending winnings (coins fly from `from` when given)
    collect(from) {
      const p = this.pending; this.pending = 0;
      if (p > 0) { C.pay(p, from); emit('balance', { balance: C.S.balance, delta: p }); }
      return p;
    }
    // ask agent / house seats for their moves until it is your turn (pvp) or everyone is ready (shared)
    async runOthers(onEvents, { maxSteps = 400 } = {}) {
      const all = [];
      if (this.e.mode === 'pvp') {
        for (let i = 0; i < maxSteps; i++) {
          const s = this.table.turn();
          if (!s || s === 'you') break;
          const a = await this.decide(s);
          const r = this.step(a, s);
          if (!r.ok) { console.warn('agent', s, 'illegal', r.error); const fb = this.e.bot(this.observe(s), this.table.rng); const r2 = this.step(fb, s); all.push(...r2.screen); if (onEvents) await onEvents(r2.screen, s); continue; }
          all.push(...r.screen);
          if (onEvents) await onEvents(r.screen, s);
        }
      } else if (this.e.mode === 'shared') {
        for (const s of this.table.order.slice(1)) {
          for (let k = 0; k < 12; k++) {
            const obs = this.observe(s);
            if ((this.table.state.ready || []).includes(s) || !obs.legal.length) break;
            const a = await this.decide(s);
            const r = this.step(a, s);
            if (!r.ok) break;
            all.push(...r.screen);
            if (onEvents) await onEvents(r.screen, s);
            if (a.type !== 'bet') break;
          }
        }
      }
      return all;
    }
    async decide(seat) {
      const s = this.table.seats[seat], obs = this.observe(seat);
      try { return await s.policy(obs); } catch (e) { console.warn('policy failed', e); return this.e.bot(obs, this.table.rng); }
    }
    join({ seat, name, policy = 'bot', balance = 100000, meta = {} } = {}) {
      const pol = policy === 'bot' ? (obs => this.e.bot(obs, this.table.rng)) : policy;
      if (this.e.mode === 'pvp') {
        seat = seat || this.table.order.find(id => id !== 'you' && !this.agents[id]);
        if (!seat || !this.table.seats[seat]) throw new Error('no free seat; seats: ' + this.table.order.join(', '));
        Object.assign(this.table.seats[seat], { name: name || seat, policy: pol, meta: { ...this.table.seats[seat].meta, ...meta, house: false } });
      } else {
        seat = seat || 'a' + (this.table.order.length + 1);
        this.table.order.push(seat);
        this.table.seats[seat] = { id: seat, name: name || seat, balance, policy: pol, meta: { color: meta.color || HOUSE[this.table.order.length % HOUSE.length].color, av: meta.av || (name || seat)[0], ...meta }, stats: { rounds: 0, wagered: 0, returned: 0 } };
        if (this.table.state.seats) this.table.state.seats = this.table.order;
      }
      this.agents[seat] = true;
      emit('join', { game: this.id, seat, name });
      return seat;
    }
    leave(seat) {
      if (seat === 'you' || !this.table.seats[seat]) return false;
      delete this.agents[seat];
      if (this.e.mode === 'pvp') { const i = this.table.order.indexOf(seat); Object.assign(this.table.seats[seat], this.houseSeat(seat, i - 1)); }
      else {
        const st = this.table.state;
        if (st.bets && st.bets[seat]) { this.table.seats[seat].balance += Object.values(st.bets[seat]).reduce((a, b) => a + b, 0); delete st.bets[seat]; }
        this.table.order = this.table.order.filter(id => id !== seat); delete this.table.seats[seat];
        if (st.seats) st.seats = this.table.order;
      }
      emit('leave', { game: this.id, seat });
      return true;
    }
  }
  const live = id => lives[id] || (lives[id] = new Live(id));

  /* ---------- public API ---------- */
  const Casino = {
    version: '1.0', Jackpots, on, off, emit, live, HOUSE,
    games: () => A.gamesList(),
    describe: id => A.describe(id),
    observe: (id, seat = 'you') => live(id).observe(seat),
    legal: (id, seat = 'you') => live(id).legal(seat),
    // for "you" the action plays on screen when that game is open, else instantly
    async act(id, action, seat = 'you') {
      const L = live(id);
      if (seat === 'you' && L.driver && C.current === id && L.driver.perform) return L.driver.perform(action);
      const r = L.step(action, seat);
      if (r.ok && seat === 'you') { L.collect(); await L.runOthers(); r.obs = L.observe(seat); }
      return r;
    },
    join: (id, opts) => live(id).join(opts),
    leave: (id, seat) => live(id).leave(seat),
    tools: () => A.tools(), openaiTools: () => A.openaiTools(), actionSchema: A.actionSchema,
    call: (name, input) => A.handler(Casino)(name, input),
    sim: (id, opts) => new E.Session(id, opts),
    // let a policy play your seat for n rounds (on screen when the game is open)
    async play(id, policy, { rounds = 10 } = {}) {
      const log = [];
      for (let i = 0, guard = 0; i < rounds && guard < rounds * 60; guard++) {
        const obs = Casino.observe(id);
        if (!obs.legal.length) break;
        const r = await Casino.act(id, await policy(obs));
        if (!r.ok) { log.push(r); break; }
        if (r.events.some(e => e.t === 'settle' && e.seat === 'you')) i++;
        log.push(r);
      }
      return log;
    },
    get balance() { return C.S.balance; }
  };
  window.Casino = Casino;
})();
