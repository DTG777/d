/* Slot engines: Fortune Sevens (lines + expanding wilds), Lucky 777 (classic
   3-reel), God of Wealth (6x5 tumbling scatter-pays with multipliers) and
   Treasure Bowl (243 ways + hold & win coins with progressive jackpots).
   Every spin is one action: { type: 'spin', bet } or { type: 'spin' } while
   free spins are pending. Returned events fully describe what to animate. */
(function (root) {
  const E = root.Engines || require('./core.js');
  const { R } = E;
  const SLOT_BETS = [10, 20, 50, 100, 200, 500, 1000, 2000, 5000, 10000];
  const betSpec = (st, ctx) => {
    const bets = SLOT_BETS.filter(b => b <= ctx.balance);
    return bets.length ? [{ type: 'spin', params: { bet: { enum: bets } }, desc: 'Bet and spin.' }] : [];
  };
  const freeSpec = st => [{ type: 'spin', desc: `Free spin (${st.fs} left, bet ${st.fsBet} locked in).` }];
  // jackpot pots are quoted for a 100-chip bet and scale linearly with the bet
  const JP_UNIT = 100;
  const jpValue = (ctx, tier, bet) => Math.floor((ctx.jackpots[tier] || 0) * bet / JP_UNIT);
  // cumulative weight picker
  function picker(pairs) {
    const tot = pairs.reduce((a, p) => a + p[1], 0);
    return rng => { let r = rng() * tot; for (const [s, w] of pairs) { r -= w; if (r < 0) return s; } return pairs[pairs.length - 1][0]; };
  }

  /* ================= Fortune Sevens ================= */
  const M = root.SlotMath || require('./fortune7-math.js');
  E.define({
    id: 'slots', kind: 'slot', mode: 'solo',
    name: { zh: '发财777', en: 'Fortune Sevens' },
    doc: '5 reels x 3 rows, 10 fixed lines, line bet = bet/10. Wilds on reels 2-4 expand to the full reel. 3+ red envelopes (reels 1,3,5) pay 5x bet and award 10 free spins at x3 (retriggerable).',
    BETS: SLOT_BETS, math: M,
    init: rng => ({ strips: M.buildStrips(rng), fs: 0, fsBet: 0, fsTotal: 0, last: null }),
    legal: (st, ctx) => st.fs > 0 ? freeSpec(st) : betSpec(st, ctx),
    step(st, a, ctx) {
      const free = st.fs > 0;
      const bet = free ? st.fsBet : a.bet;
      if (free) st.fs--;
      const raw = M.spin(st.strips, ctx.rng);
      const { grid, expanded } = M.expand(raw);
      const mult = free ? M.FREE_MULT : 1;
      const ev = M.evaluate(grid, bet / 10);
      const scat = M.evaluate(raw, 1).scatters;
      const win = Math.floor(ev.total * mult + (scat.length >= 3 ? M.SCATTER_PAY * bet * mult : 0));
      const events = [{ t: 'reels', grid: raw, final: grid, expanded, free, mult }];
      if (win) events.push({ t: 'wins', lines: ev.wins, scatters: scat.length >= 3 ? scat : [], win });
      if (free) st.fsTotal += win;
      if (scat.length >= 3) {
        if (!free) { st.fsBet = bet; st.fsTotal = win; }
        st.fs += M.FREE_SPINS;
        events.push({ t: 'freeSpins', add: M.FREE_SPINS, left: st.fs, retrigger: free, mult: M.FREE_MULT, scatters: scat });
      }
      if (free && st.fs === 0) events.push({ t: 'freeEnd', total: st.fsTotal, bet });
      st.last = { bet: free ? 0 : bet, ret: win };
      events.push({ t: 'settle', bet: free ? 0 : bet, baseBet: bet, ret: win, net: win - (free ? 0 : bet), free });
      return { events, debit: free ? 0 : bet, credit: win, done: true };
    },
    view: st => ({ freeSpins: st.fs, freeBet: st.fsBet, freeTotal: st.fsTotal, last: st.last }),
    bot: obs => obs.legal[0].params ? { type: 'spin', bet: obs.legal[0].params.bet.enum[0] } : { type: 'spin' }
  });

  /* ================= Lucky 777: classic three reel ================= */
  // 0 blank, 1 cherry, 2 single bar, 3 double bar, 4 triple bar, 5 seven, 6 wild (x2, doubles any win it is part of)
  const CL = { BLANK: 0, CHERRY: 1, BAR1: 2, BAR2: 3, BAR3: 4, SEVEN: 5, WILD: 6 };
  const CL_NAMES = ['blank', 'cherry', 'bar', 'bar2', 'bar3', 'seven', 'wild'];
  const CL_PAY = { wild3: 1000, seven: 100, bar3: 50, bar2: 25, bar1: 12, anybar: 5, cherry3: 30, cherry2: 6, cherry1: 2 };
  // physical strips: symbols alternate with blanks. Each stop carries a weight (a "virtual reel").
  // weight per symbol on the virtual reel; RTP 95.4% (exact enumeration, tools/sim.js)
  const CL_W = [5, 3, 6, 5, 4, 2.4, 1.4];
  const CL_LAYOUT = [5, 0, 2, 0, 1, 0, 3, 0, 6, 0, 4, 0, 2, 0, 1, 0];
  const CL_STRIPS = [0, 1, 2].map(() => CL_LAYOUT.map(s => [s, CL_W[s]]));
  function clEval(line) {
    const w = line.filter(s => s === CL.WILD).length;
    if (w === 3) return { pay: CL_PAY.wild3, kind: 'wild3', mult: 1 };
    const rest = line.filter(s => s !== CL.WILD);
    const m = Math.pow(2, w);
    let best = { pay: 0, kind: null, mult: 1 };
    const tryKind = (ok, kind) => { if (ok && CL_PAY[kind] * m > best.pay) best = { pay: CL_PAY[kind] * m, kind, mult: m }; };
    tryKind(rest.every(s => s === CL.SEVEN), 'seven');
    tryKind(rest.every(s => s === CL.BAR3), 'bar3');
    tryKind(rest.every(s => s === CL.BAR2), 'bar2');
    tryKind(rest.every(s => s === CL.BAR1), 'bar1');
    tryKind(rest.every(s => s >= CL.BAR1 && s <= CL.BAR3), 'anybar');
    tryKind(rest.every(s => s === CL.CHERRY), 'cherry3');
    const ch = line.filter(s => s === CL.CHERRY).length;
    if (!best.pay && ch) best = { pay: CL_PAY['cherry' + Math.min(2, ch)], kind: 'cherry' + Math.min(2, ch), mult: 1 };
    return best;
  }
  E.define({
    id: 'classic', kind: 'slot', mode: 'solo',
    name: { zh: '幸运777', en: 'Lucky 777' },
    doc: 'Classic 3-reel machine with one centre payline. Pays x bet: 3 wilds 1000, 777 100, triple bars 50, double bars 25, single bars 12, any 3 bars 5, 3 cherries 30, 2 cherries 6, 1 cherry 2. A wild substitutes and doubles the win (two wilds x4).',
    SYM: CL, NAMES: CL_NAMES, PAY: CL_PAY, STRIPS: CL_STRIPS, evaluate: clEval, BETS: SLOT_BETS,
    init: () => ({ last: null, stops: [0, 0, 0] }),
    legal: betSpec,
    step(st, a, ctx) {
      const stops = CL_STRIPS.map(strip => R.weighted(ctx.rng, strip.map(s => s[1])));
      const at = (r, i) => CL_STRIPS[r][(i + CL_STRIPS[r].length) % CL_STRIPS[r].length][0];
      const window = stops.map((p, r) => [at(r, p - 1), at(r, p), at(r, p + 1)]); // [above, line, below]
      const line = window.map(c => c[1]);
      const res = clEval(line);
      const win = res.pay * a.bet;
      st.stops = stops; st.last = { bet: a.bet, ret: win, kind: res.kind };
      return {
        events: [{ t: 'reels', stops, window, line }, ...(win ? [{ t: 'wins', kind: res.kind, mult: res.mult, pay: res.pay, win }] : []), { t: 'settle', bet: a.bet, ret: win, net: win - a.bet }],
        debit: a.bet, credit: win, done: true
      };
    },
    view: st => ({ stops: st.stops, last: st.last }),
    bot: obs => ({ type: 'spin', bet: obs.legal[0].params.bet.enum[0] })
  });

  /* ================= God of Wealth: 6x5 tumbling scatter pays ================= */
  // 0-3 gems (low), 4 coin, 5 lantern, 6 lucky bag, 7 gold ingot, 8 golden toad, 9 scatter (财神), 10 multiplier orb
  const CS = { SCAT: 9, ORB: 10 };
  const CS_NAMES = ['jade', 'ruby', 'amethyst', 'sapphire', 'coin', 'lantern', 'bag', 'ingot', 'toad', 'scatter', 'orb'];
  // pays x total bet for 8-9 / 10-11 / 12+ of a symbol anywhere
  const CS_PAY = {
    0: [0.5, 1.5, 4], 1: [0.75, 1.75, 7.5], 2: [1, 2, 10], 3: [1.5, 2.25, 15],
    4: [1.75, 3, 20], 5: [2.5, 4, 25], 6: [4, 10, 30], 7: [5, 20, 50], 8: [20, 50, 100]
  };
  const CS_W_BASE = [[0, 22], [1, 21], [2, 20], [3, 18], [4, 16], [5, 14], [6, 12], [7, 10], [8, 7], [9, 2.6], [10, 0.6]];
  const CS_W_FREE = [[0, 22], [1, 21], [2, 20], [3, 18], [4, 16], [5, 14], [6, 12], [7, 10], [8, 7], [9, 2.0], [10, 7.5]];
  const CS_ORBS = [[2, 30], [3, 22], [4, 14], [5, 12], [8, 8], [10, 6], [15, 3.5], [20, 2], [25, 1.2], [50, 0.5], [100, 0.15]];
  const CS_FS = 15, CS_RETRIGGER = 5;
  const CS_SCAT_PAY = { 4: 3, 5: 5, 6: 100 };
  const csPick = { base: picker(CS_W_BASE), free: picker(CS_W_FREE), orb: picker(CS_ORBS) };
  const CS_BUY = 100;
  function csCell(rng, free) {
    const s = (free ? csPick.free : csPick.base)(rng);
    return s === CS.ORB ? { s, x: csPick.orb(rng) } : { s };
  }
  // one full spin including all tumbles. grid[reel][row], row 0 = top
  function csSpin(rng, bet, free) {
    const grid = Array.from({ length: 6 }, () => Array.from({ length: 5 }, () => csCell(rng, free)));
    const start = grid.map(c => c.map(x => ({ ...x })));
    const tumbles = [];
    let win = 0;
    for (let guard = 0; guard < 50; guard++) {
      const counts = {};
      grid.forEach(col => col.forEach(c => { if (c.s < 9) counts[c.s] = (counts[c.s] || 0) + 1; }));
      const hits = [];
      for (const s in counts) {
        const n = counts[s]; if (n < 8) continue;
        const pay = CS_PAY[s][n >= 12 ? 2 : n >= 10 ? 1 : 0] * bet;
        hits.push({ sym: +s, count: n, pay });
      }
      if (!hits.length) break;
      const stepWin = hits.reduce((a, h) => a + h.pay, 0);
      win += stepWin;
      const removed = [];
      grid.forEach((col, r) => col.forEach((c, row) => { if (hits.some(h => h.sym === c.s)) removed.push([r, row]); }));
      // drop: remove hits, survivors fall, new symbols enter from the top
      const fill = [];
      for (let r = 0; r < 6; r++) {
        const keep = grid[r].filter(c => !hits.some(h => h.sym === c.s));
        const add = Array.from({ length: 5 - keep.length }, () => csCell(rng, free));
        fill.push(add);
        grid[r] = [...add, ...keep];
      }
      tumbles.push({ hits, removed, win: stepWin, fill, grid: grid.map(c => c.map(x => ({ ...x }))) });
    }
    const orbs = [];
    grid.forEach((col, r) => col.forEach((c, row) => { if (c.s === CS.ORB) orbs.push({ r, row, x: c.x }); }));
    const scat = [];
    grid.forEach((col, r) => col.forEach((c, row) => { if (c.s === CS.SCAT) scat.push([r, row]); }));
    const orbSum = orbs.reduce((a, o) => a + o.x, 0);
    return { start, tumbles, final: grid, win, orbs, orbSum, scat };
  }
  E.define({
    id: 'caishen', kind: 'slot', mode: 'solo',
    name: { zh: '财神到', en: 'God of Wealth' },
    doc: '6 reels x 5 rows, pays anywhere: 8+ of a symbol win, then winners vanish and new symbols tumble in until no more wins. Red lucky orbs (x2-x100) add up and multiply the spin\'s total win. 4+ God-of-Wealth scatters pay 3x/5x/100x and award 15 free spins with frequent orbs; in free spins every orb on a winning spin adds to a total multiplier that keeps growing for the whole round. 3+ scatters in free spins add 5. Buy free spins for 100x bet.',
    BETS: SLOT_BETS, PAY: CS_PAY, NAMES: CS_NAMES, SYM: CS, BUY: CS_BUY, FS: CS_FS, SCAT_PAY: CS_SCAT_PAY, spinOnce: csSpin,
    init: () => ({ fs: 0, fsBet: 0, fsTotal: 0, fsMult: 0, last: null }),
    legal(st, ctx) {
      if (st.fs > 0) return freeSpec(st);
      const out = betSpec(st, ctx);
      const buys = SLOT_BETS.filter(b => b * CS_BUY <= ctx.balance);
      if (buys.length) out.push({ type: 'buy', params: { bet: { enum: buys } }, desc: `Pay ${CS_BUY}x bet to start ${CS_FS} free spins at once.` });
      return out;
    },
    step(st, a, ctx) {
      const rng = ctx.rng;
      if (a.type === 'buy') {
        st.fs = CS_FS; st.fsBet = a.bet; st.fsTotal = 0; st.fsMult = 0; st.bought = true;
        return { events: [{ t: 'buy', cost: a.bet * CS_BUY }, { t: 'freeSpins', add: CS_FS, left: CS_FS, retrigger: false, bought: true }, { t: 'settle', bet: a.bet * CS_BUY, baseBet: a.bet, ret: 0, net: -a.bet * CS_BUY, bought: true }], debit: a.bet * CS_BUY, done: true };
      }
      const free = st.fs > 0, bet = free ? st.fsBet : a.bet;
      if (free) st.fs--;
      // a bought round never pays scatters on the trigger spin; natural triggers do
      const r = csSpin(rng, bet, free);
      // base game: orbs multiply this spin. free spins: orbs on a winning spin add to a
      // running total multiplier that then multiplies the spin (it never resets until the round ends)
      let mult = 1;
      if (r.win > 0 && r.orbSum > 0) {
        if (free) { st.fsMult += r.orbSum; mult = st.fsMult; } else mult = r.orbSum;
      }
      let win = Math.floor(r.win * mult);
      const ns = r.scat.length;
      const scatPay = !free && ns >= 4 ? CS_SCAT_PAY[Math.min(6, ns)] * bet : 0;
      win += scatPay;
      const events = [{ t: 'grid', grid: r.start, free }, ...r.tumbles.map(tb => ({ t: 'tumble', ...tb }))];
      if (r.orbs.length) events.push({ t: 'orbs', orbs: r.orbs, sum: r.orbSum, applied: r.win > 0, total: free ? st.fsMult : r.orbSum });
      if (win) events.push({ t: 'wins', base: r.win, mult, scatter: scatPay, win });
      if (free) st.fsTotal += win;
      if (!free && ns >= 4) { st.fs = CS_FS; st.fsBet = bet; st.fsTotal = win; st.fsMult = 0; st.bought = false; events.push({ t: 'freeSpins', add: CS_FS, left: st.fs, retrigger: false, scatters: r.scat }); }
      else if (free && ns >= 3) { st.fs += CS_RETRIGGER; events.push({ t: 'freeSpins', add: CS_RETRIGGER, left: st.fs, retrigger: true, scatters: r.scat }); }
      if (free && st.fs === 0) events.push({ t: 'freeEnd', total: st.fsTotal, bet });
      st.last = { bet: free ? 0 : bet, ret: win };
      events.push({ t: 'settle', bet: free ? 0 : bet, baseBet: bet, ret: win, net: win - (free ? 0 : bet), free });
      return { events, debit: free ? 0 : bet, credit: win, done: true };
    },
    view: st => ({ freeSpins: st.fs, freeBet: st.fsBet, freeTotal: st.fsTotal, freeMult: st.fsMult, last: st.last }),
    bot: obs => obs.legal[0].params ? { type: 'spin', bet: obs.legal[0].params.bet.enum[0] } : { type: 'spin' }
  });

  /* ================= Treasure Bowl: 243 ways + hold & win ================= */
  // 0 J, 1 Q, 2 K, 3 A, 4 koi, 5 tortoise, 6 phoenix, 7 dragon, 8 wild (reels 2-4), 9 coin
  const TB = { WILD: 8, COIN: 9 };
  const TB_NAMES = ['j', 'q', 'k', 'a', 'koi', 'tortoise', 'phoenix', 'dragon', 'wild', 'coin'];
  // pays x total bet per way for 3 / 4 / 5 reels
  const TB_PAY = {
    0: [0.25, 0.5, 1.25], 1: [0.25, 0.5, 1.25], 2: [0.25, 0.75, 2], 3: [0.4, 1, 2.5],
    4: [0.5, 1.5, 4], 5: [0.75, 2, 5], 6: [1, 3, 8], 7: [1.5, 5, 15]
  };
  const TB_W = r => [[0, 14], [1, 14], [2, 12], [3, 12], [4, 9], [5, 8], [6, 6], [7, 4], ...(r >= 1 && r <= 3 ? [[8, 4.2]] : []), [9, 12.5]];
  const tbPick = [0, 1, 2, 3, 4].map(r => picker(TB_W(r)));
  const TB_COIN = [[1, 30], [2, 25], [3, 16], [5, 10], [8, 6], [10, 4], [15, 2.5], [25, 1.2], ['mini', 1.2], ['minor', 0.4], ['major', 0.05]];
  const tbCoin = picker(TB_COIN);
  const TB_TRIGGER = 6, TB_RESPINS = 3, TB_LAND = 0.055;
  const coinAt = rng => ({ s: TB.COIN, v: tbCoin(rng) });
  function tbWays(grid, bet) {
    const wins = [];
    let total = 0;
    for (let s = 0; s < 8; s++) {
      let ways = 1, n = 0;
      for (let r = 0; r < 5; r++) {
        const c = grid[r].filter(x => x.s === s || x.s === TB.WILD).length;
        if (!c) break;
        ways *= c; n++;
      }
      if (n >= 3) {
        const pay = TB_PAY[s][n - 3] * bet * ways;
        total += pay;
        const cells = [];
        for (let r = 0; r < n; r++) grid[r].forEach((x, row) => { if (x.s === s || x.s === TB.WILD) cells.push([r, row]); });
        wins.push({ sym: s, reels: n, ways, pay, cells });
      }
    }
    return { wins, total };
  }
  E.define({
    id: 'treasure', kind: 'slot', mode: 'solo',
    name: { zh: '聚宝盆', en: 'Treasure Bowl' },
    doc: '5x3, 243 ways (left to right, any row). Wild bowls on reels 2-4. 6+ gold coins start Hold & Win: coins lock, 3 respins, every new coin resets to 3. Coins carry 1x-25x bet or MINI / MINOR / MAJOR jackpots; fill all 15 spots for the GRAND. Jackpot pots are quoted for a 100 bet and scale with your bet.',
    BETS: SLOT_BETS, PAY: TB_PAY, NAMES: TB_NAMES, SYM: TB, JP_UNIT, ways: tbWays,
    init: () => ({ last: null }),
    legal: betSpec,
    step(st, a, ctx) {
      const rng = ctx.rng, bet = a.bet;
      const grid = [0, 1, 2, 3, 4].map(r => [0, 1, 2].map(() => { const s = tbPick[r](rng); return s === TB.COIN ? coinAt(rng) : { s }; }));
      const ways = tbWays(grid, bet);
      let win = Math.floor(ways.total);
      const events = [{ t: 'reels', grid }];
      if (ways.total) events.push({ t: 'wins', ways: ways.wins, win: Math.floor(ways.total) });
      const coins = [];
      grid.forEach((c, r) => c.forEach((x, row) => { if (x.s === TB.COIN) coins.push({ r, row, v: x.v }); }));
      const jackpots = [];
      if (coins.length >= TB_TRIGGER) {
        const held = coins.slice();
        const respins = [];
        let left = TB_RESPINS;
        while (left > 0 && held.length < 15) {
          const landed = [];
          for (let r = 0; r < 5; r++) for (let row = 0; row < 3; row++) {
            if (held.some(c => c.r === r && c.row === row)) continue;
            if (rng() < TB_LAND) { const c = { r, row, v: tbCoin(rng) }; held.push(c); landed.push(c); }
          }
          left = landed.length ? TB_RESPINS : left - 1;
          respins.push({ landed, left, held: held.length });
        }
        let sum = 0;
        const values = held.map(c => {
          if (typeof c.v === 'number') { const amt = c.v * bet; sum += amt; return { ...c, amount: amt }; }
          const amt = jpValue(ctx, c.v, bet); sum += amt; jackpots.push({ tier: c.v, amount: amt }); return { ...c, amount: amt };
        });
        if (held.length === 15) { const g = jpValue(ctx, 'grand', bet); sum += g; jackpots.push({ tier: 'grand', amount: g }); }
        events.push({ t: 'hold', start: coins, respins, coins: values, full: held.length === 15, total: sum, jackpots });
        win += sum;
      }
      st.last = { bet, ret: win, jackpots };
      events.push({ t: 'settle', bet, ret: win, net: win - bet, jackpots });
      return { events, debit: bet, credit: win, done: true, jackpots };
    },
    view: st => ({ last: st.last }),
    bot: obs => ({ type: 'spin', bet: obs.legal[0].params.bet.enum.includes(100) ? 100 : obs.legal[0].params.bet.enum[0] })
  });
})(typeof window !== 'undefined' ? window : globalThis);
