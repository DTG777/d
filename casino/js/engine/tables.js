/* Shared-table engines: roulette, sic bo, baccarat, dragon tiger.
   Each declares spots + resolve + payout; Engines.sharedTable adds the rest. */
(function (root) {
  const E = root.Engines || require('./core.js');
  const { R, Cards } = E;

  /* ---------- roulette (European, single zero) ---------- */
  const RL_ORDER = [0, 32, 15, 19, 4, 21, 2, 25, 17, 34, 6, 27, 13, 36, 11, 30, 8, 23, 10, 5, 24, 16, 33, 1, 20, 14, 31, 9, 22, 18, 29, 7, 28, 12, 35, 3, 26];
  const RL_RED = [1, 3, 5, 7, 9, 12, 14, 16, 18, 19, 21, 23, 25, 27, 30, 32, 34, 36];
  const rlSpots = {};
  for (let n = 0; n <= 36; n++) rlSpots['n' + n] = { pays: 35, desc: 'straight up on ' + n };
  Object.assign(rlSpots, {
    col1: { pays: 2, desc: 'column 1,4,7..34' }, col2: { pays: 2, desc: 'column 2,5,8..35' }, col3: { pays: 2, desc: 'column 3,6,9..36' },
    doz1: { pays: 2, desc: '1-12' }, doz2: { pays: 2, desc: '13-24' }, doz3: { pays: 2, desc: '25-36' },
    low: { pays: 1, desc: '1-18' }, high: { pays: 1, desc: '19-36' }, even: { pays: 1, desc: 'even' }, odd: { pays: 1, desc: 'odd' },
    red: { pays: 1, desc: 'red' }, black: { pays: 1, desc: 'black' }
  });
  E.define({
    id: 'roulette', kind: 'table', mode: 'shared', start: 'spin', minBet: 10, maxTotal: 500000,
    name: { zh: '轮盘', en: 'Roulette' },
    doc: 'European roulette, numbers 0-36. Place one or more bets, then spin. Payouts are "pays N to 1"; a zero loses every outside bet. House edge 2.7%.',
    spots: rlSpots, ORDER: RL_ORDER, RED: RL_RED,
    colorOf: n => n === 0 ? 'green' : RL_RED.includes(n) ? 'red' : 'black',
    resolve: (st, rng) => { const n = Math.floor(rng() * 37); return { n, color: n === 0 ? 'green' : RL_RED.includes(n) ? 'red' : 'black' }; },
    payout(key, amt, o) {
      const n = o.n;
      if (key[0] === 'n') return +key.slice(1) === n ? amt * 36 : 0;
      if (n === 0) return 0;
      const m = {
        col1: n % 3 === 1, col2: n % 3 === 2, col3: n % 3 === 0,
        doz1: n <= 12, doz2: n > 12 && n <= 24, doz3: n > 24,
        low: n <= 18, high: n >= 19, even: n % 2 === 0, odd: n % 2 === 1,
        red: RL_RED.includes(n), black: !RL_RED.includes(n)
      };
      if (!m[key]) return 0;
      return key.startsWith('col') || key.startsWith('doz') ? amt * 3 : amt * 2;
    }
  });

  /* ---------- sic bo ---------- */
  const SB_TOTAL = { 4: 60, 5: 30, 6: 17, 7: 12, 8: 8, 9: 6, 10: 6, 11: 6, 12: 6, 13: 8, 14: 12, 15: 17, 16: 30, 17: 60 };
  const sbSpots = {
    small: { pays: 1, desc: 'total 4-10, loses on any triple' }, big: { pays: 1, desc: 'total 11-17, loses on any triple' },
    odd: { pays: 1, desc: 'odd total, loses on triple' }, even: { pays: 1, desc: 'even total, loses on triple' },
    any3: { pays: 30, desc: 'any triple' }
  };
  for (let n = 1; n <= 6; n++) {
    sbSpots['d' + n] = { pays: 10, desc: `at least two ${n}s` };
    sbSpots['t' + n] = { pays: 180, desc: `triple ${n}` };
    sbSpots['s' + n] = { pays: '1/2/3', desc: `${n} shows on 1/2/3 dice, pays 1:1, 2:1, 3:1` };
  }
  for (const n in SB_TOTAL) sbSpots['x' + n] = { pays: SB_TOTAL[n], desc: `dice total exactly ${n}` };
  E.define({
    id: 'sicbo', kind: 'table', mode: 'shared', start: 'roll', minBet: 10, maxTotal: 500000,
    name: { zh: '骰宝', en: 'Sic Bo' },
    doc: 'Three dice are shaken under a cup. Bet on totals, big/small, doubles, triples or single numbers, then roll.',
    spots: sbSpots, TOTAL_PAY: SB_TOTAL,
    resolve: (st, rng) => { const d = [R.int(rng, 1, 6), R.int(rng, 1, 6), R.int(rng, 1, 6)]; return { dice: d, sum: d[0] + d[1] + d[2], triple: d[0] === d[1] && d[1] === d[2] }; },
    payout(key, amt, o) {
      const d = o.dice, sum = o.sum, triple = o.triple;
      const cnt = n => d.filter(x => x === n).length;
      if (key === 'small') return !triple && sum <= 10 ? amt * 2 : 0;
      if (key === 'big') return !triple && sum >= 11 ? amt * 2 : 0;
      if (key === 'odd') return !triple && sum % 2 === 1 ? amt * 2 : 0;
      if (key === 'even') return !triple && sum % 2 === 0 ? amt * 2 : 0;
      if (key === 'any3') return triple ? amt * 31 : 0;
      const n = +key.slice(1);
      if (key[0] === 't') return triple && d[0] === n ? amt * 181 : 0;
      if (key[0] === 'd') return cnt(n) >= 2 ? amt * 11 : 0;
      if (key[0] === 'x') return sum === n ? amt * (SB_TOTAL[n] + 1) : 0;
      if (key[0] === 's') { const c = cnt(n); return c ? amt * (c + 1) : 0; }
      return 0;
    }
  });

  /* ---------- baccarat (punto banco, 8 decks) ---------- */
  const pv = c => c.r === 'A' ? 1 : ['10', 'J', 'Q', 'K'].includes(c.r) ? 0 : +c.r;
  const pts = cards => cards.reduce((a, c) => a + pv(c), 0) % 10;
  function bankerDraws(b, p3) {
    if (p3 == null) return b <= 5;
    if (b <= 2) return true;
    if (b === 3) return p3 !== 8;
    if (b === 4) return p3 >= 2 && p3 <= 7;
    if (b === 5) return p3 >= 4 && p3 <= 7;
    if (b === 6) return p3 === 6 || p3 === 7;
    return false;
  }
  function drawFrom(st, rng) {
    if (!st.shoe || st.shoe.length < 12) { st.shoe = Cards.shoe(rng, 8); st.shuffled = true; }
    return st.shoe.pop();
  }
  E.define({
    id: 'baccarat', kind: 'table', mode: 'shared', start: 'deal', minBet: 10, maxTotal: 500000,
    name: { zh: '百家乐', en: 'Baccarat' },
    doc: 'Punto banco. Bet Player, Banker or Tie (plus pair side bets), then deal. Hands count modulo 10; third cards follow the fixed tableau. Banker pays 0.95:1, Tie 8:1 (Player/Banker push on a tie), pairs 11:1.',
    spots: { player: { pays: 1 }, banker: { pays: 0.95 }, tie: { pays: 8 }, pp: { pays: 11, desc: 'player first two cards pair' }, bp: { pays: 11, desc: 'banker first two cards pair' } },
    pv, pts, bankerDraws,
    initExtra: (rng) => ({ shoe: Cards.shoe(rng, 8) }),
    viewExtra: st => ({ shoeLeft: st.shoe.length }),
    resolve(st, rng) {
      st.shuffled = false;
      const P = [drawFrom(st, rng)], B = [drawFrom(st, rng)];
      P.push(drawFrom(st, rng)); B.push(drawFrom(st, rng));
      let p = pts(P), b = pts(B), p3 = null;
      const natural = p >= 8 || b >= 8;
      if (!natural) {
        if (p <= 5) { const c = drawFrom(st, rng); P.push(c); p3 = pv(c); p = pts(P); }
        if (bankerDraws(b, p3)) { B.push(drawFrom(st, rng)); b = pts(B); }
      }
      return { P, B, p, b, natural, pPair: P[0].r === P[1].r, bPair: B[0].r === B[1].r, winner: p > b ? 'player' : b > p ? 'banker' : 'tie', shuffled: st.shuffled };
    },
    public: o => ({ player: o.P.map(Cards.code), banker: o.B.map(Cards.code), p: o.p, b: o.b, natural: o.natural, pPair: o.pPair, bPair: o.bPair, winner: o.winner }),
    payout(key, amt, r) {
      const tie = r.p === r.b;
      if (key === 'player') return r.p > r.b ? amt * 2 : tie ? amt : 0;
      if (key === 'banker') return r.b > r.p ? amt * 1.95 : tie ? amt : 0;
      if (key === 'tie') return tie ? amt * 9 : 0;
      if (key === 'pp') return r.pPair ? amt * 12 : 0;
      if (key === 'bp') return r.bPair ? amt * 12 : 0;
      return 0;
    }
  });

  /* ---------- dragon tiger (龙虎斗, 8 decks) ---------- */
  const dtRank = c => Cards.rankIndex(c) + 1; // A=1 .. K=13
  E.define({
    id: 'dragontiger', kind: 'table', mode: 'shared', start: 'deal', minBet: 10, maxTotal: 500000,
    name: { zh: '龙虎斗', en: 'Dragon Tiger' },
    doc: 'One card to Dragon, one to Tiger; higher rank wins (A low, K high, suits ignored). Dragon/Tiger pay 1:1 and lose half on a tie. Tie pays 11:1, suited tie 50:1.',
    spots: { dragon: { pays: 1 }, tiger: { pays: 1 }, tie: { pays: 11 }, stie: { pays: 50, desc: 'tie with the same suit' } },
    rank: dtRank,
    initExtra: (rng) => ({ shoe: Cards.shoe(rng, 8) }),
    viewExtra: st => ({ shoeLeft: st.shoe.length }),
    resolve(st, rng) {
      st.shuffled = false;
      const d = drawFrom(st, rng), t = drawFrom(st, rng);
      const a = dtRank(d), b = dtRank(t);
      return { D: d, T: t, d: a, t: b, winner: a > b ? 'dragon' : b > a ? 'tiger' : 'tie', suited: a === b && d.s === t.s, shuffled: st.shuffled };
    },
    public: o => ({ dragon: Cards.code(o.D), tiger: Cards.code(o.T), winner: o.winner, suited: o.suited }),
    payout(key, amt, o) {
      if (key === 'dragon' || key === 'tiger') return o.winner === key ? amt * 2 : o.winner === 'tie' ? amt * 0.5 : 0;
      if (key === 'tie') return o.winner === 'tie' ? amt * 12 : 0;
      if (key === 'stie') return o.suited ? amt * 51 : 0;
      return 0;
    }
  });
})(typeof window !== 'undefined' ? window : globalThis);
