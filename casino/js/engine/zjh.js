/* 炸金花 Zha Jin Hua (three-card brag) and 牛牛 Niu Niu (bull bull, grab the banker).
   Cards use the shared codes: rank A23456789TJQK + suit SHDC. */
(function (root) {
  const E = root.Engines || require('./core.js');
  const { R } = E;
  const RANKS = '23456789TJQKA';
  const SUITS = 'SHDC';
  const deck52 = () => { const d = []; for (const r of RANKS) for (const s of SUITS) d.push(r + s); return d; };
  const next = (seats, s, alive) => { let i = seats.indexOf(s); for (let k = 0; k < seats.length; k++) { i = (i + 1) % seats.length; if (!alive || alive(seats[i])) return seats[i]; } return s; };

  /* ======================= 炸金花 ======================= */
  // hand categories, high to low: 豹子 trips, 顺金 straight flush, 金花 flush, 顺子 straight, 对子 pair, 单张 high card
  const ZJ_CAT = ['high', 'pair', 'straight', 'flush', 'sflush', 'trips'];
  const ZJ_NAME = { high: '单张 high card', pair: '对子 pair', straight: '顺子 straight', flush: '金花 flush', sflush: '顺金 straight flush', trips: '豹子 trips' };
  const zv = c => RANKS.indexOf(c[0]) + 2; // 2..14
  // -> { cat, score } where a larger score wins; A-2-3 is the lowest straight, Q-K-A the highest
  function zjRank(cards) {
    const v = cards.map(zv).sort((a, b) => b - a);
    const flush = cards.every(c => c[1] === cards[0][1]);
    let straight = v[0] - v[1] === 1 && v[1] - v[2] === 1, top = v[0];
    if (!straight && v[0] === 14 && v[1] === 3 && v[2] === 2) { straight = true; top = 3; }
    let cat, keys;
    if (v[0] === v[2]) { cat = 'trips'; keys = [v[0]]; }
    else if (straight && flush) { cat = 'sflush'; keys = [top]; }
    else if (flush) { cat = 'flush'; keys = v; }
    else if (straight) { cat = 'straight'; keys = [top]; }
    else if (v[0] === v[1] || v[1] === v[2]) { const p = v[1], k = v[0] === v[1] ? v[2] : v[0]; cat = 'pair'; keys = [p, k]; }
    else { cat = 'high'; keys = v; }
    let score = ZJ_CAT.indexOf(cat);
    for (let i = 0; i < 3; i++) score = score * 16 + (keys[i] || 0);
    const s235 = !flush && v.join() === '5,3,2';
    return { cat, score, s235 };
  }
  // a beats b? ties go to the defender (the player who did not ask to compare)
  function zjBeats(a, b) {
    if (a.s235 && b.cat === 'trips') return true;
    if (b.s235 && a.cat === 'trips') return false;
    return a.score > b.score;
  }
  // share of random hands this one beats (for the bot), cached by category
  function zjStrength(cards) {
    const r = zjRank(cards);
    const base = { high: 0, pair: 0.74, straight: 0.91, flush: 0.94, sflush: 0.995, trips: 0.998 }[r.cat];
    const span = { high: 0.74, pair: 0.17, straight: 0.03, flush: 0.05, sflush: 0.003, trips: 0.002 }[r.cat];
    const v = cards.map(zv).sort((a, b) => b - a);
    const frac = r.cat === 'high' ? Math.max(0, (v[0] - 5) / 9) * 0.85 + (v[1] / 14) * 0.15 : r.cat === 'pair' ? (Math.max(v[1], 2) - 2) / 12 : (v[0] - 2) / 12;
    return base + span * Math.min(1, frac);
  }
  const ZJ_ANTES = [10, 50, 100, 500, 1000, 5000];
  const ZJ_LEVELS = [1, 2, 5, 10, 20]; // stake unit as a multiple of the ante (blind price)
  const ZJ_MAX_ROUNDS = 12;

  function zjCost(st, seat) { return st.unit * st.ante * (st.seen[seat] ? 2 : 1); }
  E.define({
    id: 'zhajinhua', kind: 'pvp', mode: 'pvp', seats: 5,
    name: { zh: '炸金花', en: 'Three Card Brag' },
    doc: 'Up to 5 players, 3 cards each, everyone antes into the pot. Players start blind (闷) and may look at any time on their turn. Each turn: call (跟) the current stake, raise (加注) to a higher stake level, fold (弃), or compare (比牌) with another player still in: the lower hand folds (ties lose for the one who asked). A blind player pays the stake, a player who has seen pays double. Last player standing takes the pot; after ' + ZJ_MAX_ROUNDS + ' rounds everyone left shows down. Hands high to low: trips (豹子) > straight flush (顺金) > flush (金花) > straight (顺子) > pair (对子) > high card; A-2-3 is the lowest straight. Special: an off-suit 2-3-5 beats trips only.',
    ANTES: ZJ_ANTES, LEVELS: ZJ_LEVELS, CAT: ZJ_CAT, CAT_NAME: ZJ_NAME, rank: zjRank, beats: zjBeats, strength: zjStrength,
    init: (rng, opts = {}) => ({ seats: (opts.seats || ['p1', 'p2', 'p3', 'p4', 'p5']).slice(0, 5), phase: 'idle', round: 0, dealer: null, result: null, hands: {}, seen: {}, folded: {}, known: {} }),
    turn: st => st.phase === 'play' ? st.turn : st.seats[0],
    legal(st, ctx) {
      const me = ctx.seat;
      if (st.phase !== 'play') {
        if (me !== st.seats[0]) return [];
        const can = ZJ_ANTES.filter(a => a * 30 <= ctx.balance && st.seats.every(s => ctx.balances[s] >= a));
        return can.length ? [{ type: 'start', params: { ante: { enum: can } }, desc: 'Everyone antes this amount and a new hand is dealt. Stakes can climb to 20x ante per call (40x once you have looked).' }] : [];
      }
      if (me !== st.turn) return [];
      const out = [], cost = zjCost(st, me), bal = ctx.balance;
      const alive = st.seats.filter(s => !st.folded[s]);
      if (!st.seen[me]) out.push({ type: 'look', desc: 'Look at your cards (does not end your turn; later calls cost double).' });
      if (bal >= cost) out.push({ type: 'call', desc: `Put ${cost} in the pot and stay in.` });
      const ups = ZJ_LEVELS.filter(l => l > st.unit && l * st.ante * (st.seen[me] ? 2 : 1) <= bal);
      if (ups.length) out.push({ type: 'raise', params: { level: { enum: ups } }, desc: `Raise the stake unit (now ${st.unit}x ante) to a higher level and pay it.` });
      if (st.lap >= 1 && alive.length >= 2) out.push({ type: 'compare', params: { target: { enum: alive.filter(s => s !== me) } }, desc: `Pay ${Math.min(cost, bal)} and compare hands with one player; the lower hand folds (ties lose for you).` });
      out.push({ type: 'fold', desc: 'Give up this hand; chips already in the pot are lost.' });
      return out;
    },
    step(st, a, ctx) {
      const me = ctx.seat;
      if (a.type === 'start') {
        const d = R.shuffle(ctx.rng, deck52());
        st.ante = a.ante; st.unit = 1; st.round++; st.pot = 0; st.lap = 0; st.acts = 0; st.result = null;
        st.hands = {}; st.seen = {}; st.folded = {}; st.known = {}; st.put = {};
        st.seats.forEach((s, i) => { st.hands[s] = d.slice(i * 3, i * 3 + 3); st.put[s] = a.ante; st.known[s] = []; });
        st.pot = a.ante * st.seats.length;
        st.dealer = st.dealer ? next(st.seats, st.dealer) : st.seats[R.int(ctx.rng, 0, st.seats.length - 1)];
        st.turn = next(st.seats, st.dealer); st.first = st.turn;
        st.phase = 'play';
        const ledger = Object.fromEntries(st.seats.map(s => [s, -a.ante]));
        return { events: [{ t: 'deal', ante: a.ante, dealer: st.dealer, pot: st.pot }, { t: 'turn', seat: st.turn }], ledger };
      }
      const events = [];
      let debit = 0;
      if (a.type === 'look') {
        st.seen[me] = true;
        return { events: [{ t: 'look' }, { t: 'cards', to: me, seat: me, cards: st.hands[me].slice(), rank: zjRank(st.hands[me]).cat }] };
      }
      if (a.type === 'fold') { st.folded[me] = true; events.push({ t: 'fold' }); }
      else if (a.type === 'call' || a.type === 'raise') {
        if (a.type === 'raise') st.unit = a.level;
        debit = zjCost(st, me);
        events.push({ t: a.type, amount: debit, unit: st.unit, seen: !!st.seen[me] });
      } else if (a.type === 'compare') {
        if (st.folded[a.target] || a.target === me) return { error: 'target must be another player still in the hand' };
        debit = Math.min(zjCost(st, me), ctx.balance);
        const win = zjBeats(zjRank(st.hands[me]), zjRank(st.hands[a.target]));
        const loser = win ? a.target : me;
        st.folded[loser] = true;
        st.known[me].push(a.target); st.known[a.target].push(me);
        events.push({ t: 'compare', target: a.target, amount: debit, winner: win ? me : a.target, loser });
        events.push({ t: 'cards', to: me, seat: a.target, cards: st.hands[a.target].slice() }, { t: 'cards', to: a.target, seat: me, cards: st.hands[me].slice() });
      }
      st.pot += debit; st.put[me] = (st.put[me] || 0) + debit;
      if (debit) events.push({ t: 'pot', pot: st.pot });
      const alive = st.seats.filter(s => !st.folded[s]);
      st.acts++;
      if (alive.length === 1) return zjFinish(st, alive, events, debit, ctx);
      st.turn = next(st.seats, me, s => !st.folded[s]);
      // a lap ends whenever play wraps around the table
      if (st.seats.indexOf(st.turn) <= st.seats.indexOf(me)) st.lap++;
      if (st.lap >= ZJ_MAX_ROUNDS) return zjFinish(st, alive, events, debit, ctx, true);
      events.push({ t: 'turn', seat: st.turn });
      return { events, debit };
    },
    view(st, seat) {
      const show = st.phase === 'done';
      const hands = {};
      for (const s of st.seats) {
        const vis = s === seat ? !!st.seen[seat] : show && st.result && st.result.shown.includes(s) || (st.known[seat] || []).includes(s);
        hands[s] = st.hands[s] ? (vis ? st.hands[s].slice() : ['??', '??', '??']) : [];
      }
      return {
        phase: st.phase, ante: st.ante || 0, unit: st.unit || 1, pot: st.pot || 0, lap: st.lap || 0, maxLaps: ZJ_MAX_ROUNDS, dealer: st.dealer,
        turn: st.phase === 'play' ? st.turn : null,
        callCost: st.phase === 'play' ? zjCost(st, seat) : 0,
        hand: hands[seat], seen: { ...st.seen }, folded: { ...st.folded }, put: { ...(st.put || {}) }, hands,
        myRank: st.seen[seat] && st.hands[seat] ? zjRank(st.hands[seat]).cat : null, result: st.result
      };
    },
    bot(obs, rng = Math.random) {
      const has = t => obs.legal.find(l => l.type === t);
      if (has('start')) { const e = has('start').params.ante.enum; return { type: 'start', ante: e.includes(100) ? 100 : e[0] }; }
      const me = obs.seat;
      const alive = Object.keys(obs.hands).filter(s => !obs.folded[s]);
      if (!obs.seen[me]) {
        // stay blind for a lap or two, then look (sooner when stakes rise)
        if (obs.lap >= 1 + Math.floor(rng() * 2) || obs.unit >= 5 || rng() < 0.25) return { type: 'look' };
        if (has('call') && rng() < 0.85) return { type: 'call' };
        return { type: 'look' };
      }
      const s = zjStrength(obs.hand);
      const opp = alive.length - 1;
      const need = 0.35 + 0.08 * opp + 0.07 * Math.log2(obs.unit) + 0.02 * obs.lap; // tighter as stakes grow
      const bluff = rng() < 0.08;
      if (s < need && !bluff) {
        if (has('compare') && alive.length === 2 && s > 0.45) return { type: 'compare', target: alive.find(x => x !== me) };
        return { type: 'fold' };
      }
      if (has('compare') && (obs.lap >= 4 || alive.length === 2 && obs.lap >= 2) && s < 0.93) {
        const tgts = has('compare').params.target.enum;
        return { type: 'compare', target: tgts[Math.floor(rng() * tgts.length)] };
      }
      if (has('raise') && (s > 0.9 || bluff && rng() < 0.5) && rng() < 0.6) return { type: 'raise', level: has('raise').params.level.enum[0] };
      if (has('call')) return { type: 'call' };
      if (has('compare')) return { type: 'compare', target: has('compare').params.target.enum[0] };
      return { type: 'fold' };
    }
  });
  function zjFinish(st, alive, events, debit, ctx, showdown) {
    let winner = alive[0];
    if (alive.length > 1) {
      for (const s of alive.slice(1)) if (zjBeats(zjRank(st.hands[s]), zjRank(st.hands[winner]))) winner = s;
      events.push({ t: 'showdown', hands: Object.fromEntries(alive.map(s => [s, st.hands[s].slice()])) });
    }
    st.phase = 'done';
    st.result = { winner, pot: st.pot, shown: showdown ? alive : [], showdown: !!showdown, cat: zjRank(st.hands[winner]).cat };
    events.push({ t: 'win', seat: winner, pot: st.pot, cat: alive.length > 1 ? st.result.cat : null });
    const ledger = { [winner]: st.pot };
    for (const s of st.seats) {
      const put = st.put[s] || 0, net = (s === winner ? st.pot : 0) - put;
      events.push({ t: 'settle', seat: s, bet: put, ret: s === winner ? st.pot : 0, net, win: s === winner });
    }
    return { events, debit, ledger, players: st.seats.slice(), done: true };
  }

  /* ======================= 牛牛 ======================= */
  const NN_GRAB = [0, 1, 2, 3, 4];
  const NN_BET = [1, 2, 3, 4, 5];
  const NN_BASES = [10, 50, 100, 500, 1000];
  const nnPoint = c => { const r = c[0]; return r === 'A' ? 1 : 'TJQK'.includes(r) ? 10 : +r; };
  const nnOrder = c => RANKS.indexOf(c[0]) === 12 ? 1 : RANKS.indexOf(c[0]) + 2; // A low: A=1 .. K=13
  const nnSuit = c => 'DCHS'.indexOf(c[1]); // spades high
  const NN_MULT = { 0: 1, 1: 1, 2: 1, 3: 1, 4: 1, 5: 1, 6: 1, 7: 2, 8: 2, 9: 3, 10: 4, wuhua: 5, bomb: 6, wuxiao: 8 };
  const NN_NAME = { 0: '没牛 no bull', 10: '牛牛 bull bull', wuhua: '五花牛 five faces', bomb: '炸弹牛 four of a kind', wuxiao: '五小牛 five little bulls' };
  // -> { niu: 0..10 | 'wuhua' | 'bomb' | 'wuxiao', score, mult, split: [three, two] }
  function nnRank(cards) {
    const pts = cards.map(nnPoint), tot = pts.reduce((a, b) => a + b, 0);
    const hi = cards.slice().sort((a, b) => nnOrder(b) - nnOrder(a) || nnSuit(b) - nnSuit(a))[0];
    const tie = nnOrder(hi) * 4 + nnSuit(hi);
    const cnt = {}; cards.forEach(c => cnt[c[0]] = (cnt[c[0]] || 0) + 1);
    let niu = 0, split = null;
    if (cards.every(c => nnPoint(c) < 5) && tot <= 10) niu = 'wuxiao';
    else if (Object.values(cnt).some(n => n === 4)) niu = 'bomb';
    else if (cards.every(c => 'JQK'.includes(c[0]))) niu = 'wuhua';
    else {
      for (let i = 0; i < 5 && !split; i++) for (let j = i + 1; j < 5 && !split; j++) for (let k = j + 1; k < 5 && !split; k++) {
        if ((pts[i] + pts[j] + pts[k]) % 10 === 0) {
          const rest = (tot - pts[i] - pts[j] - pts[k]) % 10;
          split = [[cards[i], cards[j], cards[k]], cards.filter((_, x) => x !== i && x !== j && x !== k)];
          niu = rest === 0 ? 10 : rest;
        }
      }
      // pick the best split, not merely the first
      if (split) {
        for (let i = 0; i < 5; i++) for (let j = i + 1; j < 5; j++) for (let k = j + 1; k < 5; k++) {
          if ((pts[i] + pts[j] + pts[k]) % 10 !== 0) continue;
          const rest = (tot - pts[i] - pts[j] - pts[k]) % 10 || 10;
          if (rest > niu) { niu = rest; split = [[cards[i], cards[j], cards[k]], cards.filter((_, x) => x !== i && x !== j && x !== k)]; }
        }
      }
    }
    const lvl = niu === 'wuxiao' ? 14 : niu === 'bomb' ? 13 : niu === 'wuhua' ? 12 : niu;
    return { niu, score: lvl * 100 + tie, mult: NN_MULT[niu], split };
  }
  E.define({
    id: 'niuniu', kind: 'pvp', mode: 'pvp', seats: 5,
    name: { zh: '抢庄牛牛', en: 'Bull Bull' },
    doc: 'Up to 5 players get 5 cards each; you see 4 of them first. 1) Grab the bank: everyone picks 0-4x, the highest grab becomes banker (ties drawn at random, nobody grabs = random banker at 1x). 2) Everyone else picks a bet multiplier 1-5x. 3) The fifth card is shown and every player is compared with the banker. Score: find three cards that sum to a multiple of 10 (A=1, 10/J/Q/K=10); the last two cards mod 10 are your bull (牛1-牛9, 0 = 牛牛 bull bull). No three = no bull. Payment = base x banker grab x bet x hand multiplier of the winner: no bull-bull 6 x1, bull 7-8 x2, bull 9 x3, bull bull x4, five faces (all J/Q/K) x5, four of a kind x6, five little bulls (all under 5, total <= 10) x8. Equal hands: the highest card wins (K high, spades > hearts > clubs > diamonds).',
    BASES: NN_BASES, GRAB: NN_GRAB, BET: NN_BET, MULT: NN_MULT, NAME: NN_NAME, rank: nnRank,
    init: (rng, opts = {}) => ({ seats: (opts.seats || ['p1', 'p2', 'p3', 'p4', 'p5']).slice(0, 5), phase: 'idle', round: 0, result: null, hands: {}, grabs: {}, bets: {} }),
    turn(st) {
      if (st.phase === 'grab') return st.seats.find(s => st.grabs[s] == null) || null;
      if (st.phase === 'bet') return st.seats.find(s => s !== st.banker && st.bets[s] == null) || null;
      return st.seats[0];
    },
    legal(st, ctx) {
      const me = ctx.seat, turn = this.turn(st);
      if (turn !== me) return [];
      if (st.phase === 'grab') return [{ type: 'grab', params: { mult: { enum: NN_GRAB.filter(m => m === 0 || st.base * m * 5 * 4 * (st.seats.length - 1) <= ctx.balance * 4) } }, desc: 'How much you want to be the banker (0 = no). The banker plays every other player; their stake is multiplied by this.' }];
      if (st.phase === 'bet') return [{ type: 'bet', params: { mult: { enum: NN_BET.filter(m => m === 1 || st.base * st.grabMult * m * 4 <= ctx.balance) } }, desc: 'Your bet multiplier against the banker.' }];
      const can = NN_BASES.filter(b => b * 80 <= ctx.balance && st.seats.every(s => ctx.balances[s] >= b * 10));
      return can.length ? [{ type: 'start', params: { base: { enum: can } }, desc: 'Deal a new hand at this base stake.' }] : [];
    },
    step(st, a, ctx) {
      const me = ctx.seat;
      if (a.type === 'start') {
        const d = R.shuffle(ctx.rng, deck52());
        st.base = a.base; st.round++; st.result = null; st.grabs = {}; st.bets = {}; st.banker = null;
        st.hands = {}; st.seats.forEach((s, i) => { st.hands[s] = d.slice(i * 5, i * 5 + 5); });
        st.phase = 'grab';
        return { events: [{ t: 'deal', base: a.base }, ...st.seats.map(s => ({ t: 'cards', to: s, seat: s, cards: st.hands[s].slice(0, 4) })), { t: 'turn', seat: this.turn(st), phase: 'grab' }] };
      }
      if (a.type === 'grab') {
        st.grabs[me] = a.mult;
        const events = [{ t: 'grab', mult: a.mult }];
        if (this.turn(st) == null) {
          const top = Math.max(...Object.values(st.grabs));
          const cands = st.seats.filter(s => st.grabs[s] === top);
          st.banker = cands[R.int(ctx.rng, 0, cands.length - 1)];
          st.grabMult = Math.max(1, top);
          st.phase = 'bet';
          events.push({ t: 'banker', seat: st.banker, mult: st.grabMult, candidates: cands });
        }
        events.push({ t: 'turn', seat: this.turn(st), phase: st.phase });
        return { events };
      }
      // bet
      st.bets[me] = a.mult;
      const events = [{ t: 'bet', mult: a.mult }];
      if (this.turn(st) != null) { events.push({ t: 'turn', seat: this.turn(st), phase: 'bet' }); return { events }; }
      // showdown
      const ranks = Object.fromEntries(st.seats.map(s => [s, nnRank(st.hands[s])]));
      events.push({ t: 'reveal', hands: JSON.parse(JSON.stringify(st.hands)), ranks: Object.fromEntries(st.seats.map(s => [s, { niu: ranks[s].niu, mult: ranks[s].mult, split: ranks[s].split }])) });
      const bk = st.banker, ledger = {}, vs = {};
      let bankBal = ctx.balances[bk];
      // banker collects from losers first, then pays winners in seat order while it can
      const others = st.seats.filter(s => s !== bk);
      const amt = s => { const w = ranks[s].score > ranks[bk].score; return { w, n: st.base * st.grabMult * st.bets[s] * (w ? ranks[s].mult : ranks[bk].mult) }; };
      for (const s of others) { const { w, n } = amt(s); if (!w) { const pay = Math.min(n, ctx.balances[s]); ledger[s] = -pay; bankBal += pay; vs[s] = -pay; } }
      for (const s of others) { const { w, n } = amt(s); if (w) { const pay = Math.min(n, ctx.balances[s] * 1e9, bankBal); bankBal -= pay; ledger[s] = pay; vs[s] = pay; } }
      ledger[bk] = -others.reduce((a2, s) => a2 + (ledger[s] || 0), 0);
      st.phase = 'done';
      st.result = { banker: bk, vs, ledger, ranks: Object.fromEntries(st.seats.map(s => [s, ranks[s].niu])) };
      for (const s of st.seats) {
        const net = ledger[s] || 0, exposure = s === bk ? st.base * st.grabMult * 5 : st.base * st.grabMult * st.bets[s];
        events.push({ t: 'settle', seat: s, bet: exposure, ret: net > 0 ? exposure + net : 0, net, banker: s === bk, niu: ranks[s].niu, win: net > 0 });
      }
      return { events, ledger, players: st.seats.slice(), done: true };
    },
    view(st, seat) {
      const done = st.phase === 'done';
      const hands = {};
      for (const s of st.seats) hands[s] = st.hands[s] ? (done ? st.hands[s].slice() : s === seat ? [...st.hands[s].slice(0, 4), '??'] : ['??', '??', '??', '??', '??']) : [];
      return {
        phase: st.phase, base: st.base || 0, banker: st.banker || null, grabMult: st.grabMult || 0,
        grabs: { ...st.grabs }, bets: { ...st.bets }, hand: hands[seat], hands, result: st.result,
        // value of your 4 known cards for quick reasoning
        hint: st.hands[seat] && !done ? { known: st.hands[seat].slice(0, 4).map(nnPoint) } : null
      };
    },
    bot(obs, rng = Math.random) {
      const has = t => obs.legal.find(l => l.type === t);
      if (has('start')) { const e = has('start').params.base.enum; return { type: 'start', base: e.includes(100) ? 100 : e[0] }; }
      // estimate from the 4 visible cards: average bull over the 48 possible fifth cards
      const known = obs.hand.filter(c => c !== '??');
      const rest = deck52().filter(c => !known.includes(c));
      let ev = 0;
      for (const c of rest) { const r = nnRank([...known, c]); ev += typeof r.niu === 'number' ? r.niu : 11; }
      ev /= rest.length;
      if (has('grab')) {
        const opts = has('grab').params.mult.enum;
        const want = ev > 7.2 ? 4 : ev > 6.3 ? 3 : ev > 5.3 ? 2 : ev > 4.3 ? 1 : 0;
        const pick = Math.min(want + (rng() < 0.15 ? 1 : 0), opts[opts.length - 1]);
        return { type: 'grab', mult: opts.filter(m => m <= pick).pop() };
      }
      const opts = has('bet').params.mult.enum;
      const want = ev > 7 ? 5 : ev > 6 ? 4 : ev > 5 ? 3 : ev > 4 ? 2 : 1;
      return { type: 'bet', mult: opts.filter(m => m <= want).pop() };
    }
  });
})(typeof window !== 'undefined' ? window : globalThis);
