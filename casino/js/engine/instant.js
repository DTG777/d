/* Instant games: crash, plinko, mines. */
(function (root) {
  const E = root.Engines || require('./core.js');
  const { R } = E;

  /* ---------- crash ---------- */
  // P(crash >= x) = 0.97 / x: a 3% edge whatever the cash-out target
  const crashPoint = rng => Math.max(1, Math.floor(0.97 / (1 - rng()) * 100) / 100);
  const CR_BETS = [10, 20, 50, 100, 200, 500, 1000, 2000, 5000, 10000, 25000];
  E.define({
    id: 'crash', kind: 'instant', mode: 'solo',
    name: { zh: '火箭冲天', en: 'Rocket Crash' },
    doc: 'A multiplier climbs from 1.00x as m(t)=e^(0.1t) until the rocket explodes at a random crash point (P(crash >= x) = 0.97/x). Cash out before it crashes to win bet x multiplier. Headless play takes the cash-out target up front; the live table also accepts a manual "cashout" while flying.',
    crashPoint, BETS: CR_BETS, K: 0.1,
    init: () => ({ last: null, history: [] }),
    legal(st, ctx) {
      const bets = CR_BETS.filter(b => b <= ctx.balance);
      return bets.length ? [{ type: 'bet', params: { bet: { enum: bets }, cashout: { num: true, min: 1.01, max: 10000 } }, desc: 'Bet and auto cash out at the given multiplier.' }] : [];
    },
    step(st, a, ctx) {
      const c = crashPoint(ctx.rng), win = a.cashout <= c;
      const ret = win ? Math.floor(a.bet * a.cashout) : 0;
      st.history = [c, ...st.history].slice(0, 20);
      st.last = { bet: a.bet, cashout: a.cashout, crash: c, ret };
      return { events: [{ t: 'crash', at: c }, { t: 'settle', bet: a.bet, ret, net: ret - a.bet }], debit: a.bet, credit: ret, done: true };
    },
    view: st => ({ last: st.last, history: st.history }),
    bot: obs => ({ type: 'bet', bet: Math.min(100, obs.legal[0].params.bet.enum.slice(-1)[0]), cashout: 2 })
  });

  /* ---------- plinko ---------- */
  const PL_ROWS = 12;
  const PL_TABLES = {
    low: [10, 3, 1.6, 1.4, 1.1, 1, 0.5, 1, 1.1, 1.4, 1.6, 3, 10],
    medium: [33, 11, 4, 2, 1.1, 0.6, 0.3, 0.6, 1.1, 2, 4, 11, 33],
    high: [170, 24, 8.1, 2, 0.7, 0.2, 0.2, 0.2, 0.7, 2, 8.1, 24, 170]
  };
  const PL_BETS = [10, 20, 50, 100, 200, 500, 1000, 2000, 5000];
  E.define({
    id: 'plinko', kind: 'instant', mode: 'solo',
    name: { zh: '弹珠台', en: 'Plinko' },
    doc: 'A ball falls through 12 rows of pegs, bouncing left or right with equal odds, into one of 13 bins. The bin multiplier times the bet is paid. Risk low/medium/high chooses the bin table.',
    ROWS: PL_ROWS, TABLES: PL_TABLES, BETS: PL_BETS,
    init: () => ({ last: null }),
    legal(st, ctx) {
      const bets = PL_BETS.filter(b => b <= ctx.balance);
      return bets.length ? [{ type: 'drop', params: { bet: { enum: bets }, risk: { enum: ['low', 'medium', 'high'], default: 'medium' } }, desc: 'Drop one ball.' }] : [];
    },
    step(st, a, ctx) {
      const path = Array.from({ length: PL_ROWS }, () => ctx.rng() < 0.5 ? 0 : 1);
      const bin = path.reduce((x, y) => x + y, 0), mult = PL_TABLES[a.risk][bin], ret = Math.floor(a.bet * mult);
      st.last = { bet: a.bet, risk: a.risk, bin, mult, ret };
      return { events: [{ t: 'drop', path, bin, mult }, { t: 'settle', bet: a.bet, ret, net: ret - a.bet }], debit: a.bet, credit: ret, done: true };
    },
    view: st => ({ last: st.last, tables: PL_TABLES }),
    bot: obs => ({ type: 'drop', bet: obs.legal[0].params.bet.enum[0], risk: 'medium' })
  });

  /* ---------- mines ---------- */
  const MN_CELLS = 25, MN_EDGE = 0.97;
  const MN_BETS = [10, 20, 50, 100, 200, 500, 1000, 2000, 5000, 10000];
  // fair odds of surviving k picks with m mines, times the 3% edge
  function minesMult(m, k) {
    let p = 1;
    for (let i = 0; i < k; i++) p *= (MN_CELLS - m - i) / (MN_CELLS - i);
    return k === 0 ? 1 : Math.floor(MN_EDGE / p * 100) / 100;
  }
  E.define({
    id: 'mines', kind: 'instant', mode: 'solo',
    name: { zh: '扫雷寻宝', en: 'Mines' },
    doc: 'A 5x5 grid hides 1-24 mines. Reveal tiles one at a time: each safe gem raises the multiplier, a mine loses the bet. Cash out any time after the first gem. Multiplier after k gems with m mines = 0.97 / P(k safe picks).',
    CELLS: MN_CELLS, BETS: MN_BETS, mult: minesMult,
    init: () => ({ phase: 'idle', bet: 0, mines: 3, layout: [], open: [], last: null }),
    legal(st, ctx) {
      if (st.phase === 'play') {
        const closed = []; for (let i = 0; i < MN_CELLS; i++) if (!st.open.includes(i)) closed.push(i);
        const out = [{ type: 'reveal', params: { cell: { enum: closed } }, desc: 'Open a tile (0-24, row-major).' }];
        if (st.open.length) out.push({ type: 'cashout', desc: `Take ${Math.floor(st.bet * minesMult(st.mines, st.open.length))}.` });
        return out;
      }
      const bets = MN_BETS.filter(b => b <= ctx.balance);
      return bets.length ? [{ type: 'start', params: { bet: { enum: bets }, mines: { int: true, min: 1, max: 24, default: 3 } }, desc: 'Bet and hide the mines.' }] : [];
    },
    step(st, a, ctx) {
      if (a.type === 'start') {
        const cells = R.shuffle(ctx.rng, Array.from({ length: MN_CELLS }, (_, i) => i));
        st.layout = cells.slice(0, a.mines).sort((x, y) => x - y); st.mines = a.mines; st.bet = a.bet; st.open = []; st.phase = 'play'; st.last = null;
        return { events: [{ t: 'start', mines: a.mines, bet: a.bet }], debit: a.bet };
      }
      if (a.type === 'reveal') {
        if (st.layout.includes(a.cell)) {
          st.phase = 'idle'; st.last = { bet: st.bet, ret: 0, gems: st.open.length, mines: st.layout };
          return { events: [{ t: 'mine', cell: a.cell, mines: st.layout }, { t: 'settle', bet: st.bet, ret: 0, net: -st.bet }], done: true };
        }
        st.open.push(a.cell);
        const m = minesMult(st.mines, st.open.length);
        const ev = [{ t: 'gem', cell: a.cell, gems: st.open.length, mult: m, next: minesMult(st.mines, st.open.length + 1) }];
        if (st.open.length === MN_CELLS - st.mines) return mnCash(st, ev);
        return { events: ev };
      }
      if (a.type === 'cashout') return mnCash(st, []);
    },
    view: st => ({ phase: st.phase, bet: st.bet, mines: st.mines, open: st.open.slice(), gems: st.open.length, mult: minesMult(st.mines, st.open.length), nextMult: minesMult(st.mines, st.open.length + 1), last: st.last }),
    bot(obs) {
      const L = obs.legal.map(a => a.type);
      if (L.includes('start')) return { type: 'start', bet: obs.legal[0].params.bet.enum[0], mines: 3 };
      if (obs.gems >= 3 && L.includes('cashout')) return { type: 'cashout' };
      return { type: 'reveal', cell: obs.legal[0].params.cell.enum[0] };
    }
  });
  function mnCash(st, ev) {
    const m = minesMult(st.mines, st.open.length), ret = Math.floor(st.bet * m);
    st.phase = 'idle'; st.last = { bet: st.bet, ret, gems: st.open.length, mult: m, mines: st.layout };
    ev.push({ t: 'cashout', mult: m, mines: st.layout }, { t: 'settle', bet: st.bet, ret, net: ret - st.bet });
    return { events: ev, credit: ret, done: true };
  }
})(typeof window !== 'undefined' ? window : globalThis);
