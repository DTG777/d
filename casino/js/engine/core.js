/* Engine core. Every game's rules live in a pure, DOM-free engine so the same
   logic drives the animated tables, headless simulations and AI agents.

   Engine contract (see docs/AGENT_API.md):
     id, kind ('slot'|'table'|'instant'), mode ('solo'|'shared'), name {zh,en}, doc
     init(rng, opts)            -> state            plain JSON, may hold hidden info
     legal(state, ctx)          -> ActionSpec[]     ctx = { seat, balance, balances, rng, jackpots }
     step(state, action, ctx)   -> { events, debit, credit, refund, ledger, done, players }   mutates state
                                   or { error } (state untouched) when the action breaks a rule the schema can't express
                                   debit/credit book the acting seat; ledger = { seatId: delta } for transfers
     view(state, seat)          -> observation      what `seat` may see (others' hidden cards removed)
   Multi-player engines (mode 'pvp') also declare
     seats (count), turn(state) -> seatId to act | null, bot(obs, rng) -> action
   Shared tables (many seats bet on one outcome) instead declare
     spots, resolve(state, rng) -> outcome, payout(spot, amount, outcome) -> return
   and get init/legal/step/view from Engines.sharedTable().

   ActionSpec: { type, params: { name: ParamSpec }, desc }
   ParamSpec:  { enum: [...] } | { int: true, min, max } | { bools: n } | { num: true, min, max }
               plus optional { default } (param may be omitted) */
(function (root) {
  const Engines = { list: {}, version: '1.0' };

  /* ---------- RNG ---------- */
  // sfc32: small, fast, good quality, seedable. Seeds are reproducible across machines.
  function seeded(seed) {
    let h = 1779033703 ^ String(seed).length;
    const s = String(seed);
    for (let i = 0; i < s.length; i++) { h = Math.imul(h ^ s.charCodeAt(i), 3432918353); h = (h << 13) | (h >>> 19); }
    const next = () => { h = Math.imul(h ^ (h >>> 16), 2246822507); h = Math.imul(h ^ (h >>> 13), 3266489909); return (h ^= h >>> 16) >>> 0; };
    let a = next(), b = next(), c = next(), d = next();
    const rng = () => {
      a >>>= 0; b >>>= 0; c >>>= 0; d >>>= 0;
      let t = (a + b) | 0; a = b ^ (b >>> 9); b = (c + (c << 3)) | 0; c = (c << 21) | (c >>> 11);
      d = (d + 1) | 0; t = (t + d) | 0; c = (c + t) | 0;
      return (t >>> 0) / 4294967296;
    };
    for (let i = 0; i < 12; i++) rng();
    return rng;
  }
  function cryptoRng() {
    const buf = new Uint32Array(1);
    return () => { try { crypto.getRandomValues(buf); return buf[0] / 4294967296; } catch (e) { return Math.random(); } };
  }
  const R = {
    seeded, crypto: cryptoRng,
    int: (rng, a, b) => Math.floor(a + rng() * (b - a + 1)),
    pick: (rng, arr) => arr[Math.floor(rng() * arr.length)],
    shuffle(rng, a) { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rng() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; },
    weighted(rng, weights) { // weights: array of numbers -> index
      let tot = 0; for (const w of weights) tot += w;
      let r = rng() * tot;
      for (let i = 0; i < weights.length; i++) { r -= weights[i]; if (r < 0) return i; }
      return weights.length - 1;
    }
  };

  /* ---------- cards ---------- */
  const SUITS = ['♠', '♥', '♦', '♣'], RANKS = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];
  const SUIT_CODE = { '♠': 'S', '♥': 'H', '♦': 'D', '♣': 'C' };
  const Cards = {
    SUITS, RANKS,
    shoe(rng, decks) {
      const a = [];
      for (let d = 0; d < decks; d++) for (const s of SUITS) for (const r of RANKS) a.push({ r, s });
      return R.shuffle(rng, a);
    },
    // compact code for agents: rank (A23456789TJQK) + suit (SHDC), e.g. "TH" = 10 of hearts
    code: c => c ? (c.r === '10' ? 'T' : c.r) + SUIT_CODE[c.s] : '??',
    decode(code) {
      if (!code || code === '??') return null;
      const r = code[0] === 'T' ? '10' : code[0], s = { S: '♠', H: '♥', D: '♦', C: '♣', J: 'J' }[code[1]];
      return { r, s };
    },
    rankIndex: c => RANKS.indexOf(c.r) // 0 = ace
  };

  /* ---------- schema / validation ---------- */
  function checkParam(name, spec, v) {
    if (v === undefined) return spec.default !== undefined ? null : `missing param "${name}"`;
    if (spec.enum) return spec.enum.some(e => e === v) ? null : `"${name}" must be one of ${JSON.stringify(spec.enum.slice(0, 40))}${spec.enum.length > 40 ? '…' : ''}`;
    if (spec.int || spec.num) {
      if (typeof v !== 'number' || !Number.isFinite(v)) return `"${name}" must be a number`;
      if (spec.int && !Number.isInteger(v)) return `"${name}" must be an integer`;
      if (spec.min != null && v < spec.min) return `"${name}" must be >= ${spec.min}`;
      if (spec.max != null && v > spec.max) return `"${name}" must be <= ${spec.max}`;
      return null;
    }
    if (spec.bools) {
      if (!Array.isArray(v) || v.length !== spec.bools || v.some(x => typeof x !== 'boolean')) return `"${name}" must be an array of ${spec.bools} booleans`;
      return null;
    }
    return null;
  }
  // -> null when ok, else a human/agent readable error string
  function validate(action, specs) {
    if (!action || typeof action !== 'object' || typeof action.type !== 'string') return 'action must be an object with a string "type"';
    const spec = specs.find(s => s.type === action.type);
    if (!spec) return `"${action.type}" is not legal now; legal: ${specs.map(s => s.type).join(', ') || '(none)'}`;
    for (const k in (spec.params || {})) { const e = checkParam(k, spec.params[k], action[k]); if (e) return e; }
    return null;
  }
  // fill omitted params that have defaults
  function withDefaults(action, specs) {
    const spec = specs.find(s => s.type === action.type); const out = { ...action };
    if (spec) for (const k in (spec.params || {})) if (out[k] === undefined && spec.params[k].default !== undefined) out[k] = spec.params[k].default;
    return out;
  }

  function define(e) {
    if (e.mode === 'shared') sharedTable(e);
    Engines.list[e.id] = e;
    return e;
  }

  /* Shared table: every seat stakes on spots, one outcome settles everyone.
     The first seat is the host and is the only one who may start the round; other
     seats bet and then say `done`. Bets are public (that is the fun of a busy table). */
  function sharedTable(e) {
    const startType = e.start || 'deal';
    const staked = (st, seat) => Object.values(st.bets[seat] || {}).reduce((a, b) => a + b, 0);
    e.init = e.init || ((rng, opts = {}) => ({ seats: opts.seats || ['you'], bets: {}, round: 0, last: null, ...(e.initExtra ? e.initExtra(rng, opts) : {}) }));
    e.legal = e.legal || ((st, ctx) => {
      const out = [], me = ctx.seat, mine = staked(st, me);
      const host = !st.seats || st.seats[0] === me;
      const room = Math.min(ctx.balance, e.maxTotal - mine);
      if (room >= e.minBet) out.push({ type: 'bet', params: { spot: { enum: Object.keys(e.spots) }, amount: { int: true, min: e.minBet, max: room } }, desc: 'Stake chips on a spot. Repeat to add more or to cover several spots.' });
      if (mine) out.push({ type: 'clear', desc: 'Take back every bet you placed this round.' });
      if (host && Object.keys(st.bets).some(k => staked(st, k) > 0)) out.push({ type: startType, desc: 'Close betting and resolve the round for everyone at the table.' });
      if (!host) out.push({ type: 'done', desc: 'Finish betting for this round and wait for the result.' });
      return out;
    });
    e.step = e.step || ((st, a, ctx) => {
      const me = ctx.seat;
      if (a.type === 'bet') { const b = st.bets[me] = st.bets[me] || {}; b[a.spot] = (b[a.spot] || 0) + a.amount; return { events: [{ t: 'bet', spot: a.spot, amount: a.amount }], debit: a.amount }; }
      if (a.type === 'clear') { const n = staked(st, me); delete st.bets[me]; return { events: [{ t: 'clear', amount: n }], credit: n, refund: true }; }
      if (a.type === 'done') { st.ready = [...new Set([...(st.ready || []), me])]; return { events: [{ t: 'ready' }] }; }
      const outcome = e.resolve(st, ctx.rng);
      const pub = e.public ? e.public(outcome) : outcome;
      const events = [{ t: 'outcome', outcome: pub }], ledger = {}, results = {};
      for (const seat in st.bets) {
        let ret = 0; const bet = staked(st, seat), wins = {};
        for (const k in st.bets[seat]) { const r = Math.floor(e.payout(k, st.bets[seat][k], outcome)); if (r) { wins[k] = r; ret += r; } }
        if (ret) ledger[seat] = ret;
        results[seat] = { bets: st.bets[seat], wins, bet, ret, net: ret - bet };
        events.push({ t: 'settle', seat, bet, ret, net: ret - bet, wins });
      }
      st.last = { outcome: pub, results };
      const players = Object.keys(st.bets);
      st.bets = {}; st.ready = []; st.round++;
      return { events, ledger, players, done: true };
    });
    e.view = e.view || ((st, seat) => ({ bets: JSON.parse(JSON.stringify(st.bets[seat] || {})), table: JSON.parse(JSON.stringify(st.bets)), round: st.round, last: st.last, ...(e.viewExtra ? e.viewExtra(st, seat) : {}) }));
    // house bot: a chip or two on simple chances, then done / start
    e.bot = e.bot || ((obs, rng) => {
      const bet = obs.legal.find(l => l.type === 'bet'), mine = Object.keys(obs.bets).length;
      const fin = obs.legal.find(l => l.type === 'done' || l.type === startType);
      if (bet && mine < 1 + Math.floor(rng() * 2)) {
        const spots = (e.botSpots || bet.params.spot.enum).filter(s => bet.params.spot.enum.includes(s));
        const amt = Math.max(bet.params.amount.min, Math.min(bet.params.amount.max, [10, 50, 100, 500][Math.floor(rng() * 4)]));
        return { type: 'bet', spot: spots[Math.floor(rng() * spots.length)], amount: amt };
      }
      return fin ? { type: fin.type } : { type: 'clear' };
    });
  }

  /* ---------- headless table: any number of seats, instant, own wallets ----------
     Seats with a `policy` (obs -> action, sync) are played automatically; seats
     without one are driven from outside through act(). A Session is a Table where
     you hold seat "you" and the house bots fill the other chairs. */
  class Table {
    constructor(id, { seed = Date.now() + ':' + Math.random(), seats, jackpots, opts = {} } = {}) {
      const e = Engines.list[id];
      if (!e) throw new Error(`unknown game "${id}"; games: ${Object.keys(Engines.list).join(', ')}`);
      this.engine = e; this.game = id; this.seed = seed;
      this.rng = seeded(seed);
      if (!seats) seats = [{ id: 'you' }];
      this.seats = {};
      this.order = seats.map(s => s.id);
      seats.forEach(s => {
        const pol = s.policy === 'bot' ? (obs => e.bot(obs, this.rng)) : s.policy;
        this.seats[s.id] = { id: s.id, name: s.name || s.id, balance: s.balance != null ? s.balance : 10000, policy: pol || null, stats: { rounds: 0, wagered: 0, returned: 0 } };
      });
      this.jackpots = jackpots || { mini: 500, minor: 2500, major: 25000, grand: 250000 };
      this.state = e.init(this.rng, { seats: this.order, ...opts });
    }
    ctx(seat) {
      const s = this.seats[seat];
      return { seat, balance: s ? s.balance : 0, rng: this.rng, jackpots: this.jackpots, balances: Object.fromEntries(this.order.map(k => [k, this.seats[k].balance])) };
    }
    turn() { return this.engine.turn ? this.engine.turn(this.state) : this.order[0]; }
    legal(seat = this.order[0]) {
      if (this.engine.turn && this.turn() !== seat) return [];
      return this.engine.legal(this.state, this.ctx(seat));
    }
    observe(seat = this.order[0]) {
      const v = this.engine.view(this.state, seat);
      const players = this.engine.mode === 'pvp' || this.order.length > 1 ? { players: this.order.map(id => ({ seat: id, name: this.seats[id].name, balance: this.seats[id].balance })) } : {};
      const chat = this.chat && this.chat.length ? { chat: this.chat.slice(-8) } : {};
      return { game: this.game, seat, balance: this.seats[seat].balance, ...(this.engine.turn ? { toAct: this.turn() } : {}), ...players, ...v, ...chat, legal: this.legal(seat) };
    }
    apply(seat, r) {
      const book = (id, d, refund) => {
        const s = this.seats[id]; if (!s || !d) return;
        s.balance += d;
        if (d < 0) s.stats.wagered -= d; else if (refund) s.stats.wagered -= d; else s.stats.returned += d;
      };
      if (r.debit) book(seat, -r.debit);
      if (r.credit) book(seat, r.credit, r.refund);
      if (r.ledger) for (const id in r.ledger) book(id, r.ledger[id]);
      if (r.done) for (const id of (r.players || [seat])) if (this.seats[id]) this.seats[id].stats.rounds++;
    }
    act(seat, action) {
      const specs = this.legal(seat);
      const err = validate(action, specs);
      if (err) return { ok: false, error: err, obs: this.observe(seat) };
      const a = withDefaults(action, specs);
      const r = this.engine.step(this.state, a, this.ctx(seat)) || {};
      if (r.error) return { ok: false, error: r.error, obs: this.observe(seat) };
      this.apply(seat, r);
      // table talk: any action may carry `say` (what the seat says aloud while acting). Words are free;
      // they may be honest or a bluff, exactly like at a real table.
      const talk = typeof action.say === 'string' && action.say.trim() ? [{ t: 'say', seat, text: action.say.trim().slice(0, 160) }] : [];
      const all = [...talk, ...(r.events || [])].map(ev => ev.seat ? ev : { seat, ...ev });
      if (talk.length) { (this.chat = this.chat || []).push(all[0]); if (this.chat.length > 30) this.chat.shift(); }
      return { ok: true, all, events: Table.visible(all, seat), done: !!r.done, ledger: r.ledger || null, debit: r.debit || 0, credit: r.credit || 0, refund: !!r.refund, jackpots: r.jackpots || null };
    }
    // talk without acting (any time, any seat)
    say(seat, text) {
      if (!this.seats[seat] || typeof text !== 'string' || !text.trim()) return { ok: false, error: 'say needs a seat and some text' };
      const ev = { t: 'say', seat, text: text.trim().slice(0, 160) };
      (this.chat = this.chat || []).push(ev); if (this.chat.length > 30) this.chat.shift();
      return { ok: true, events: [ev] };
    }
    // play every seat that has a policy until an external seat must act (or nobody can)
    autoplay(limit = 2000) {
      if (!this.engine.turn) return this.autoplayFree();
      const events = [];
      for (let i = 0; i < limit; i++) {
        const s = this.turn();
        if (!s || !this.seats[s] || !this.seats[s].policy) break;
        const obs = this.observe(s);
        if (!obs.legal.length) break; // e.g. someone is too broke to start another hand
        const r = this.act(s, this.seats[s].policy(obs));
        if (!r.ok) throw new Error(`policy for ${s} chose an illegal action: ${r.error}`);
        events.push(...r.all);
        if (r.done) break; // one round at a time
      }
      return events;
    }
    // games without turns (shared tables): every policy seat that is not ready yet bets until it
    // says done; a policy host then starts the round
    autoplayFree() {
      const events = [], ready = () => this.state.ready || [];
      const order = [...this.order.slice(1), this.order[0]];
      for (const id of order) {
        const seat = this.seats[id];
        if (!seat.policy || ready().includes(id)) continue;
        for (let k = 0; k < 30; k++) {
          const obs = this.observe(id);
          if (!obs.legal.length) break;
          const a = seat.policy(obs);
          const r = this.act(id, a);
          if (!r.ok) throw new Error(`policy for ${id} chose an illegal action: ${r.error}`);
          events.push(...r.all);
          if (a.type !== 'bet') break;
        }
      }
      return events;
    }
  }

  // events marked { to: seat } are private (your own cards); others never see them
  Table.visible = (events, seat) => events.filter(ev => ev.to === undefined || ev.to === seat);

  class Session {
    constructor(id, opts = {}) {
      const e = Engines.list[id];
      if (!e) throw new Error(`unknown game "${id}"; games: ${Object.keys(Engines.list).join(', ')}`);
      const seats = [{ id: 'you', balance: opts.balance != null ? opts.balance : 10000 }];
      for (let i = 1; i < (opts.bots != null ? opts.bots + 1 : e.seats || 1); i++) seats.push({ id: 'bot' + i, name: (opts.botNames || [])[i - 1], balance: opts.botBalance || 100000, policy: 'bot' });
      this.table = new Table(id, { ...opts, seats });
      this.game = id; this.seed = this.table.seed;
    }
    get state() { return this.table.state; }
    get balance() { return this.table.seats.you.balance; }
    get stats() { return this.table.seats.you.stats; }
    legal() { return this.table.legal('you'); }
    observe() { return this.table.observe('you'); }
    act(action) {
      const r = this.table.act('you', action);
      if (!r.ok) return r;
      const more = Table.visible(this.table.autoplay(), 'you');
      return { ok: true, events: [...r.events, ...more], done: r.done || more.some(ev => ev.t === 'settle'), obs: this.observe() };
    }
  }

  Object.assign(Engines, { define, sharedTable, validate, withDefaults, Session, Table, R, Cards, rng: { seeded, crypto: cryptoRng } });
  if (typeof module !== 'undefined' && module.exports) module.exports = Engines;
  root.Engines = Engines;
})(typeof window !== 'undefined' ? window : globalThis);
