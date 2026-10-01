/* 斗地主 Dou Di Zhu (Fight the Landlord): 3 seats, 54 cards, bidding 1-3,
   bombs and rocket double the stake, spring doubles again.
   Cards are codes: rank 3456789TJQKA2 + suit SHDC, jokers BJ (small) and RJ (big). */
(function (root) {
  const E = root.Engines || require('./core.js');
  const { R } = E;
  const ORDER = '3456789TJQKA2';
  const rv = c => c === 'BJ' ? 16 : c === 'RJ' ? 17 : ORDER.indexOf(c[0]) + 3; // 3..15, jokers 16/17
  const SUIT_ORDER = 'SHCD';
  const sortHand = h => h.sort((a, b) => rv(a) - rv(b) || SUIT_ORDER.indexOf(a[1]) - SUIT_ORDER.indexOf(b[1]));
  const BASES = [10, 50, 100, 500, 1000, 5000];
  const TYPE_NAME = {
    single: '单张 single', pair: '对子 pair', trio: '三张 trio', trio1: '三带一 trio + single', trio2: '三带二 trio + pair',
    straight: '顺子 straight (5+)', dstraight: '连对 pair straight (3+ pairs)', plane: '飞机 airplane (2+ trios)', plane1: '飞机带单 airplane + singles',
    plane2: '飞机带对 airplane + pairs', four2: '四带二 four + two singles', four2p: '四带两对 four + two pairs', bomb: '炸弹 bomb', rocket: '王炸 rocket'
  };

  function deck() {
    const d = [];
    for (const r of ORDER) for (const s of 'SHDC') d.push(r + s);
    d.push('BJ', 'RJ');
    return d;
  }
  const countBy = cards => { const m = {}; for (const c of cards) { const v = rv(c); m[v] = (m[v] || 0) + 1; } return m; };
  const consec = rs => rs.every((r, i) => i === 0 || r === rs[i - 1] + 1) && rs[rs.length - 1] < 15;

  // -> { type, main, len, n } or null
  function classify(cards) {
    const n = cards.length; if (!n) return null;
    const cnt = countBy(cards);
    const ranks = Object.keys(cnt).map(Number).sort((a, b) => a - b);
    if (n === 2 && cnt[16] && cnt[17]) return { type: 'rocket', main: 17, len: 1, n };
    if (ranks.length === 1) {
      const k = cnt[ranks[0]];
      return { type: ['single', 'pair', 'trio', 'bomb'][k - 1], main: ranks[0], len: 1, n };
    }
    if (n >= 5 && ranks.every(r => cnt[r] === 1) && consec(ranks)) return { type: 'straight', main: ranks[0], len: n, n };
    if (ranks.length >= 3 && ranks.every(r => cnt[r] === 2) && consec(ranks)) return { type: 'dstraight', main: ranks[0], len: ranks.length, n };
    for (const r of ranks) if (cnt[r] === 4) {
      if (n === 6) return { type: 'four2', main: r, len: 1, n };
      if (n === 8 && ranks.filter(x => x !== r).every(x => cnt[x] % 2 === 0)) return { type: 'four2p', main: r, len: 1, n };
    }
    const tri = ranks.filter(r => cnt[r] >= 3);
    for (let k = tri.length; k >= 1; k--) {
      for (let i = tri.length - k; i >= 0; i--) {
        const w = tri.slice(i, i + k);
        if (k > 1 && !consec(w)) continue;
        const rest = n - 3 * k;
        if (rest === 0 && k > 1) return { type: 'plane', main: w[0], len: k, n };
        if (rest === k) return { type: k === 1 ? 'trio1' : 'plane1', main: w[0], len: k, n };
        if (rest === 2 * k) {
          const left = { ...cnt }; w.forEach(r => left[r] -= 3);
          if (Object.values(left).every(v => v % 2 === 0)) return { type: k === 1 ? 'trio2' : 'plane2', main: w[0], len: k, n };
        }
      }
    }
    return null;
  }
  function beats(a, b) {
    if (!a) return false;
    if (!b) return true;
    if (a.type === 'rocket') return true;
    if (b.type === 'rocket') return false;
    if (a.type === 'bomb' && b.type !== 'bomb') return true;
    if (a.type !== b.type || a.len !== b.len || a.n !== b.n) return false;
    return a.main > b.main;
  }
  function combos(arr, k, cap = 120) {
    const out = [];
    const rec = (s, cur) => { if (out.length >= cap) return; if (cur.length === k) { out.push(cur.slice()); return; } for (let i = s; i < arr.length; i++) { cur.push(arr[i]); rec(i + 1, cur); cur.pop(); } };
    rec(0, []);
    return out;
  }
  // every distinct play available from a hand (suits chosen low-first)
  function generate(hand) {
    const by = {};
    sortHand(hand.slice()).forEach(c => { (by[rv(c)] = by[rv(c)] || []).push(c); });
    const rs = Object.keys(by).map(Number).sort((a, b) => a - b);
    const take = (r, k) => by[r].slice(0, k);
    const out = [];
    for (const r of rs) {
      const n = by[r].length;
      out.push(take(r, 1));
      if (n >= 2) out.push(take(r, 2));
      if (n >= 3) out.push(take(r, 3));
      if (n === 4) out.push(take(r, 4));
    }
    if (by[16] && by[17]) out.push(['BJ', 'RJ']);
    for (const t of rs) if (by[t].length >= 3) for (const r of rs) if (r !== t) {
      out.push([...take(t, 3), ...take(r, 1)]);
      if (by[r].length >= 2) out.push([...take(t, 3), ...take(r, 2)]);
    }
    const run = (min, minLen) => {
      for (let s = 3; s < 15; s++) {
        let e = s;
        while (e < 15 && by[e] && by[e].length >= min) {
          if (e - s + 1 >= minLen) { const seq = []; for (let v = s; v <= e; v++) seq.push(...take(v, min)); out.push(seq); }
          e++;
        }
      }
    };
    run(1, 5); run(2, 3);
    // airplanes
    for (let s = 3; s < 15; s++) {
      let e = s;
      while (by[s] && by[s].length >= 3 && e < 14 && by[e + 1] && by[e + 1].length >= 3) {
        e++;
        const body = [], used = [];
        for (let v = s; v <= e; v++) { body.push(...take(v, 3)); used.push(v); }
        const k = used.length;
        out.push(body);
        const others = rs.filter(r => !used.includes(r));
        combos(others, k, 40).forEach(ws => out.push([...body, ...ws.flatMap(r => take(r, 1))]));
        combos(others.filter(r => by[r].length >= 2), k, 40).forEach(ws => out.push([...body, ...ws.flatMap(r => take(r, 2))]));
      }
    }
    for (const b of rs) if (by[b].length === 4) {
      const rest = hand.filter(c => rv(c) !== b);
      const seen = new Set();
      combos(sortHand(rest.slice()), 2, 60).forEach(ws => { const key = ws.map(rv).join(); if (!seen.has(key)) { seen.add(key); out.push([...take(b, 4), ...ws]); } });
      combos(rs.filter(r => r !== b && by[r].length >= 2), 2, 30).forEach(ws => out.push([...take(b, 4), ...ws.flatMap(r => take(r, 2))]));
    }
    return out.map(cards => ({ cards, c: classify(cards) })).filter(p => p.c);
  }

  /* ---------- heuristic AI ---------- */
  // rough count of turns needed to play out a hand
  function moves(hand) {
    const cnt = countBy(hand);
    let m = 0;
    if (cnt[16] && cnt[17]) { m++; delete cnt[16]; delete cnt[17]; }
    for (const r in cnt) if (cnt[r] === 4) { m++; delete cnt[r]; }
    // straights that soak up lonely singles
    for (let guard = 0; guard < 4; guard++) {
      let best = null;
      for (let s = 3; s <= 10; s++) {
        let e = s; while (e < 15 && cnt[e]) e++;
        if (e - s >= 5) { const lone = [...Array(e - s)].filter((_, i) => cnt[s + i] === 1).length; if (lone >= 3 && (!best || lone > best.lone)) best = { s, e, lone }; }
      }
      if (!best) break;
      for (let v = best.s; v < best.e; v++) { cnt[v]--; if (!cnt[v]) delete cnt[v]; }
      m++;
    }
    let singles = 0, pairs = 0, trios = 0;
    for (const r in cnt) { if (cnt[r] === 1) singles++; else if (cnt[r] === 2) pairs++; else if (cnt[r] === 3) trios++; }
    // each trio carries a single or a pair
    let carry = trios;
    const s2 = Math.max(0, singles - carry); carry = Math.max(0, carry - singles);
    const p2 = Math.max(0, pairs - carry);
    return m + trios + s2 + p2;
  }
  function strength(hand) {
    const cnt = countBy(hand);
    let s = 0;
    if (cnt[16] && cnt[17]) s += 4; else s += (cnt[16] ? 1 : 0) + (cnt[17] ? 1.5 : 0);
    for (const r in cnt) if (cnt[r] === 4 && r < 16) s += 2.5;
    s += (cnt[15] || 0) * 1.1 + (cnt[14] || 0) * 0.4;
    return s - Math.max(0, moves(hand) - 7) * 0.4;
  }
  function bot(obs, rng = Math.random) {
    const legal = obs.legal;
    const has = t => legal.find(l => l.type === t);
    if (has('start')) return { type: 'start', base: has('start').params.base.enum.includes(100) ? 100 : has('start').params.base.enum[0] };
    if (has('bid')) {
      const st = strength(obs.hand) + (rng() - 0.5);
      const want = st >= 6.5 ? 3 : st >= 4.5 ? 2 : st >= 3 ? 1 : 0;
      const ok = has('bid').params.score.enum.filter(x => x <= want);
      return ok.length ? { type: 'bid', score: ok[ok.length - 1] } : { type: 'pass' };
    }
    if (!has('play')) return { type: 'pass' };
    const me = obs.seat, hand = obs.hand, ll = obs.landlord;
    const mate = s => s !== me && me !== ll && s !== ll;
    const enemyMin = Math.min(...Object.entries(obs.counts).filter(([s]) => s !== me && !mate(s)).map(([, n]) => n));
    const lead = !obs.last || obs.last.seat === me;
    let plays = generate(hand);
    if (!lead) plays = plays.filter(p => beats(p.c, obs.last.combo));
    const rest = p => { const left = hand.slice(); p.cards.forEach(c => left.splice(left.indexOf(c), 1)); return left; };
    const cost = p => {
      const left = rest(p);
      if (!left.length) return -1000;
      const big = p.c.type === 'bomb' || p.c.type === 'rocket';
      let c = moves(left) * 10 + p.c.main * (lead ? 0.6 : 0.9) - (lead ? p.cards.length * 0.8 : 0);
      if (big) c += enemyMin <= 3 || moves(left) <= 1 ? 0 : 28;
      // never break a bomb for a small play
      const cnt = countBy(hand); if (!big && p.cards.some(x => cnt[rv(x)] === 4)) c += 14;
      // leading low singles into an enemy who is almost out is suicide
      if (lead && enemyMin <= 2 && p.c.type === 'single') c += 12 - Math.min(12, p.c.main - 3);
      return c;
    };
    let best = null, bc = Infinity;
    for (const p of plays) { const c = cost(p); if (c < bc) { bc = c; best = p; } }
    if (lead) return { type: 'play', cards: best.cards };
    const lastBy = obs.last.seat;
    let passCost = moves(hand) * 10 + 5;
    if (mate(lastBy)) passCost -= 25 - (enemyMin <= 2 ? 12 : 0);
    if (!mate(lastBy) && obs.counts[lastBy] <= 2) passCost += 40;
    if (!best || bc > passCost) return { type: 'pass' };
    return { type: 'play', cards: best.cards };
  }

  /* ---------- engine ---------- */
  const next = (st, s) => st.seats[(st.seats.indexOf(s) + 1) % st.seats.length];
  function deal(st, rng) {
    const d = R.shuffle(rng, deck());
    st.hands = {}; st.seats.forEach((s, i) => { st.hands[s] = sortHand(d.slice(i * 17, i * 17 + 17)); });
    st.bottom = d.slice(51);
    st.bids = {}; st.curBid = 0; st.bidder = null; st.landlord = null;
    st.bidStart = st.seats[R.int(rng, 0, 2)]; st.turn = st.bidStart; st.bidCount = 0;
    st.last = null; st.passes = 0; st.bombs = 0; st.plays = Object.fromEntries(st.seats.map(s => [s, 0])); st.log = [];
    st.phase = 'bid';
  }
  const multOf = st => Math.max(1, st.curBid) * Math.pow(2, st.bombs);

  E.define({
    id: 'doudizhu', kind: 'pvp', mode: 'pvp', seats: 3,
    name: { zh: '斗地主', en: 'Fight the Landlord' },
    doc: '3 players, 54 cards (with two jokers), 17 each + 3 hidden. Bid 1, 2 or 3 points (or pass) to be the landlord; the top bid takes the 3 extra cards and plays alone against the two farmers. Landlord leads; each player must beat the last play with the same pattern but higher (or pass). After two passes the last player leads anything. Bombs (four of a kind) beat any non-bomb, the rocket (both jokers) beats everything; each bomb/rocket doubles the stake. First to empty their hand wins for their side. Payment per farmer = base x bid x 2^bombs (x2 for a spring: one side never got to play). Rank order 3 < 4 < ... < K < A < 2 < small joker < big joker.',
    BASES, TYPE_NAME, rv, classify, beats, generate, moves, strength, sortHand,
    init: (rng, opts = {}) => ({ seats: (opts.seats || ['p1', 'p2', 'p3']).slice(0, 3), phase: 'idle', base: 0, hands: {}, bottom: [], round: 0, result: null }),
    turn: st => st.phase === 'idle' || st.phase === 'done' ? st.seats[0] : st.turn,
    legal(st, ctx) {
      if (st.phase === 'idle' || st.phase === 'done') {
        if (ctx.seat !== st.seats[0]) return [];
        const can = BASES.filter(b => b * 6 <= ctx.balance && st.seats.every(s => ctx.balances[s] >= b * 2));
        return can.length ? [{ type: 'start', params: { base: { enum: can } }, desc: 'Deal a new hand at this base stake (you can lose base x bid x 2^bombs, more as landlord).' }] : [];
      }
      if (ctx.seat !== st.turn) return [];
      if (st.phase === 'bid') {
        const can = [1, 2, 3].filter(x => x > st.curBid);
        return [{ type: 'bid', params: { score: { enum: can } }, desc: 'Bid to become the landlord; 3 ends the bidding at once.' }, { type: 'pass', desc: 'Do not bid.' }];
      }
      const hand = st.hands[ctx.seat], lead = !st.last || st.last.seat === ctx.seat;
      let opts = generate(hand);
      if (!lead) opts = opts.filter(p => beats(p.c, st.last.combo));
      const out = [];
      if (opts.length) out.push({
        type: 'play', params: { cards: { cards: true } },
        desc: lead ? 'You lead: play any valid pattern from your hand.' : `Beat ${st.last.combo.type} (${st.last.cards.join(' ')}) from ${st.last.seat}.`,
        options: opts.slice(0, 40).map(p => p.cards)
      });
      if (!lead) out.push({ type: 'pass', desc: 'Do not play this round.' });
      return out;
    },
    step(st, a, ctx) {
      const me = ctx.seat;
      if (a.type === 'start') {
        st.base = a.base; st.round++; st.result = null;
        deal(st, ctx.rng);
        return { events: [{ t: 'deal', base: a.base, counts: { [st.seats[0]]: 17, [st.seats[1]]: 17, [st.seats[2]]: 17 } }, ...st.seats.map(s => ({ t: 'hand', to: s, seat: s, cards: st.hands[s].slice() })), { t: 'turn', seat: st.turn, phase: 'bid' }] };
      }
      if (st.phase === 'bid') {
        const events = [];
        if (a.type === 'bid') { st.curBid = a.score; st.bidder = me; events.push({ t: 'bid', score: a.score }); }
        else events.push({ t: 'pass', phase: 'bid' });
        st.bidCount++;
        if (st.curBid === 3 || st.bidCount >= 3) {
          if (!st.bidder) {
            deal(st, ctx.rng);
            events.push({ t: 'redeal' }, ...st.seats.map(s => ({ t: 'hand', to: s, seat: s, cards: st.hands[s].slice() })), { t: 'turn', seat: st.turn, phase: 'bid' });
            return { events };
          }
          st.landlord = st.bidder;
          st.hands[st.landlord] = sortHand([...st.hands[st.landlord], ...st.bottom]);
          st.phase = 'play'; st.turn = st.landlord;
          events.push({ t: 'landlord', seat: st.landlord, bid: st.curBid, bottom: st.bottom.slice(), mult: multOf(st) }, { t: 'hand', to: st.landlord, seat: st.landlord, cards: st.hands[st.landlord].slice() }, { t: 'turn', seat: st.turn, phase: 'play' });
        } else { st.turn = next(st, me); events.push({ t: 'turn', seat: st.turn, phase: 'bid' }); }
        return { events };
      }
      // play phase
      if (a.type === 'pass') {
        st.passes++; st.log.push({ seat: me, pass: true });
        st.turn = next(st, me);
        const events = [{ t: 'pass' }];
        if (st.passes >= 2) { st.passes = 0; events.push({ t: 'newRound', leader: st.turn }); }
        events.push({ t: 'turn', seat: st.turn, phase: 'play' });
        return { events };
      }
      const cards = a.cards;
      if (!Array.isArray(cards) || !cards.length) return { error: '"cards" must be a non-empty array of card codes from your hand' };
      const hand = st.hands[me].slice();
      for (const c of cards) { const i = hand.indexOf(c); if (i < 0) return { error: `you do not hold ${c}; your hand: ${st.hands[me].join(' ')}` }; hand.splice(i, 1); }
      const combo = classify(cards);
      if (!combo) return { error: `${cards.join(' ')} is not a valid pattern (single, pair, trio, trio+1, trio+2, straight 5+, pair straight 3+, airplane, four+two, bomb, rocket)` };
      const lead = !st.last || st.last.seat === me;
      if (!lead && !beats(combo, st.last.combo)) return { error: `${cards.join(' ')} (${combo.type}) does not beat ${st.last.cards.join(' ')} (${st.last.combo.type}); play a higher ${st.last.combo.type} of the same length, a bomb, or pass` };
      st.hands[me] = hand; st.passes = 0; st.plays[me]++;
      st.last = { seat: me, cards: sortHand(cards.slice()), combo };
      st.log.push({ seat: me, cards: st.last.cards });
      const events = [{ t: 'play', cards: st.last.cards, combo, left: hand.length }];
      if (combo.type === 'bomb' || combo.type === 'rocket') { st.bombs++; events.push({ t: 'bomb', kind: combo.type, mult: multOf(st) }); }
      if (hand.length && hand.length <= 2) events.push({ t: 'alarm', left: hand.length });
      if (!hand.length) return finish(st, me, events, ctx);
      st.turn = next(st, me);
      events.push({ t: 'turn', seat: st.turn, phase: 'play' });
      return { events };
    },
    view(st, seat) {
      const counts = Object.fromEntries(st.seats.map(s => [s, (st.hands[s] || []).length]));
      return {
        phase: st.phase, base: st.base, hand: (st.hands[seat] || []).slice(), counts,
        landlord: st.landlord, bottom: st.landlord || st.phase === 'done' ? st.bottom.slice() : st.bottom.map(() => '??'),
        curBid: st.curBid, bidder: st.bidder, turn: st.phase === 'bid' || st.phase === 'play' ? st.turn : null,
        last: st.last ? { seat: st.last.seat, cards: st.last.cards, combo: st.last.combo } : null,
        bombs: st.bombs, mult: multOf(st), history: (st.log || []).slice(-9), result: st.result,
        hands: st.phase === 'done' ? JSON.parse(JSON.stringify(st.hands)) : undefined
      };
    },
    bot
  });

  function finish(st, winner, events, ctx) {
    const ll = st.landlord, farmers = st.seats.filter(s => s !== ll);
    const llWin = winner === ll;
    const spring = llWin ? farmers.every(f => st.plays[f] === 0) : st.plays[ll] === 1;
    const mult = multOf(st) * (spring ? 2 : 1);
    const unit = st.base * mult;
    const ledger = {};
    if (llWin) {
      let tot = 0;
      for (const f of farmers) { const pay = Math.min(unit, ctx.balances[f]); ledger[f] = -pay; tot += pay; }
      ledger[ll] = tot;
    } else {
      const owe = Math.min(unit * 2, ctx.balances[ll]);
      ledger[ll] = -owe; farmers.forEach(f => { ledger[f] = Math.floor(owe / 2); });
    }
    st.phase = 'done';
    st.result = { winner, side: llWin ? 'landlord' : 'farmers', spring, mult, ledger };
    if (spring) events.push({ t: 'spring', anti: !llWin, mult });
    events.push({ t: 'reveal', hands: JSON.parse(JSON.stringify(st.hands)) });
    for (const s of st.seats) {
      const exposure = s === ll ? unit * 2 : unit;
      const net = ledger[s] || 0;
      events.push({ t: 'settle', seat: s, bet: exposure, ret: net > 0 ? exposure + net : 0, net, landlord: s === ll, win: net > 0, mult });
    }
    return { events, ledger, players: st.seats.slice(), done: true };
  }
})(typeof window !== 'undefined' ? window : globalThis);
