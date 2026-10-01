/* Solo card engines: blackjack and video poker (Jacks or Better, with double-up). */
(function (root) {
  const E = root.Engines || require('./core.js');
  const { R, Cards } = E;
  const code = Cards.code;

  /* ================= Blackjack ================= */
  const cv = c => c.r === 'A' ? 11 : ['J', 'Q', 'K', '10'].includes(c.r) ? 10 : +c.r;
  function value(cards) {
    let total = 0, aces = 0;
    for (const c of cards) { total += cv(c); if (c.r === 'A') aces++; }
    while (total > 21 && aces) { total -= 10; aces--; }
    return { total, soft: aces > 0 && total <= 21 };
  }
  const isBJ = cards => cards.length === 2 && value(cards).total === 21;
  const BJ_MAX = 50000;

  function bjDraw(st, rng, ev) {
    if (st.shoe.length < 20) { st.shoe = Cards.shoe(rng, 6); ev.push({ t: 'shuffle' }); }
    return st.shoe.pop();
  }
  function bjNextHand(st) {
    while (st.active < st.hands.length) {
      const h = st.hands[st.active];
      if (!h.done && value(h.cards).total < 21 && !h.splitAce) return true;
      h.done = true; st.active++;
    }
    return false;
  }
  function bjFinish(st, rng, ev) {
    st.phase = 'done'; st.active = -1;
    const live = st.hands.some(h => !h.bust);
    ev.push({ t: 'reveal', card: code(st.dealer[1]), total: value(st.dealer).total });
    if (live && !(st.peeked && isBJ(st.dealer))) {
      const pBJonly = st.hands.length === 1 && isBJ(st.hands[0].cards);
      if (!pBJonly) while (value(st.dealer).total < 17) { const c = bjDraw(st, rng, ev); st.dealer.push(c); ev.push({ t: 'card', to: 'dealer', card: code(c), total: value(st.dealer).total }); }
    }
    const d = value(st.dealer).total, dBJ = isBJ(st.dealer);
    let ret = 0, bet = 0;
    const results = st.hands.map((h, i) => {
      bet += h.bet;
      const v = value(h.cards).total, pBJ = isBJ(h.cards) && st.hands.length === 1;
      let res, r = 0;
      if (h.bust) res = 'lose';
      else if (dBJ) { res = pBJ ? 'push' : 'lose'; r = pBJ ? h.bet : 0; }
      else if (pBJ) { res = 'bj'; r = h.bet * 2.5; }
      else if (d > 21 || v > d) { res = 'win'; r = h.bet * 2; }
      else if (v === d) { res = 'push'; r = h.bet; }
      else res = 'lose';
      h.res = res; ret += r;
      return { hand: i, res, bet: h.bet, ret: r, total: v };
    });
    ret = Math.floor(ret);
    st.last = { bet, ret, dealer: d, dealerBJ: dBJ, results };
    ev.push({ t: 'settle', bet, ret, net: ret - bet, dealer: d, dealerBJ: dBJ, results });
    return ret;
  }
  // basic strategy for 6 decks, S17, no surrender. Used by the hint button and the house bot.
  function basic(obs) {
    const L = obs.legal.map(a => a.type);
    if (L.includes('deal')) return { type: 'deal', bet: Math.min(100, obs.balance) };
    const h = obs.hands[obs.active], up = Cards.decode(obs.dealer.cards[0]);
    const cards = h.cards.map(Cards.decode), u = up.r === 'A' ? 11 : cv(up);
    const { total, soft } = value(cards);
    const can = t => L.includes(t);
    if (can('split')) {
      const p = cv(cards[0]);
      const split = p === 11 || p === 8 || (p === 9 && ![7, 10, 11].includes(u)) || ((p === 7 || p === 3 || p === 2) && u <= 7) || (p === 6 && u <= 6) || (p === 4 && (u === 5 || u === 6));
      if (split) return { type: 'split' };
    }
    if (soft) {
      if (total >= 19) return { type: 'stand' };
      if (total === 18) { if (u >= 3 && u <= 6 && can('double')) return { type: 'double' }; return { type: u >= 9 ? 'hit' : 'stand' }; }
      const dbl = (total === 17 && u >= 3 && u <= 6) || ((total === 15 || total === 16) && u >= 4 && u <= 6) || ((total === 13 || total === 14) && u >= 5 && u <= 6);
      if (dbl && can('double')) return { type: 'double' };
      return { type: 'hit' };
    }
    if (total >= 17) return { type: 'stand' };
    if (total >= 13) return { type: u <= 6 ? 'stand' : 'hit' };
    if (total === 12) return { type: u >= 4 && u <= 6 ? 'stand' : 'hit' };
    if (total === 11 && can('double')) return { type: 'double' };
    if (total === 10 && u <= 9 && can('double')) return { type: 'double' };
    if (total === 9 && u >= 3 && u <= 6 && can('double')) return { type: 'double' };
    return { type: 'hit' };
  }

  E.define({
    id: 'blackjack', kind: 'table', mode: 'solo',
    name: { zh: '21点', en: 'Blackjack' },
    doc: 'Six decks, dealer stands on all 17s and peeks for blackjack. Get closer to 21 than the dealer without going over. Blackjack pays 3:2. Double on any first two cards (one more card), split one pair once (split aces get one card each).',
    value, isBJ, cardValue: cv, basic, maxBet: BJ_MAX,
    init: rng => ({ phase: 'bet', shoe: Cards.shoe(rng, 6), hands: [], dealer: [], active: -1, last: null }),
    legal(st, ctx) {
      if (st.phase !== 'play') {
        const max = Math.min(ctx.balance, BJ_MAX);
        return max >= 10 ? [{ type: 'deal', params: { bet: { int: true, min: 10, max } }, desc: 'Place your bet and deal a new hand.' }] : [];
      }
      const h = st.hands[st.active];
      const out = [{ type: 'hit', desc: 'Take a card.' }, { type: 'stand', desc: 'Keep this total.' }];
      if (h.cards.length === 2 && ctx.balance >= h.bet) out.push({ type: 'double', desc: 'Double the bet, take exactly one card.' });
      if (st.hands.length === 1 && h.cards.length === 2 && cv(h.cards[0]) === cv(h.cards[1]) && ctx.balance >= h.bet) out.push({ type: 'split', desc: 'Split the pair into two hands, matching the bet.' });
      return out;
    },
    step(st, a, ctx) {
      const ev = [], rng = ctx.rng;
      if (a.type === 'deal') {
        st.hands = [{ cards: [], bet: a.bet }]; st.dealer = []; st.active = 0; st.peeked = false; st.last = null;
        const P = st.hands[0];
        for (let i = 0; i < 2; i++) {
          const c = bjDraw(st, rng, ev); P.cards.push(c); ev.push({ t: 'card', to: 'player', hand: 0, card: code(c), total: value(P.cards).total });
          const d = bjDraw(st, rng, ev); st.dealer.push(d); ev.push(i === 0 ? { t: 'card', to: 'dealer', card: code(d), total: value([d]).total } : { t: 'card', to: 'dealer', card: '??', hidden: true });
        }
        const up = st.dealer[0];
        if (up.r === 'A' || cv(up) === 10) { st.peeked = true; ev.push({ t: 'peek', blackjack: isBJ(st.dealer) }); }
        if ((st.peeked && isBJ(st.dealer)) || isBJ(P.cards)) {
          if (isBJ(P.cards)) ev.push({ t: 'blackjack', hand: 0 });
          const ret = bjFinish(st, rng, ev);
          return { events: ev, debit: a.bet, credit: ret, done: true };
        }
        st.phase = 'play';
        ev.push({ t: 'turn', hand: 0 });
        return { events: ev, debit: a.bet };
      }
      const h = st.hands[st.active];
      let debit = 0;
      if (a.type === 'hit') {
        const c = bjDraw(st, rng, ev); h.cards.push(c);
        const v = value(h.cards).total;
        ev.push({ t: 'card', to: 'player', hand: st.active, card: code(c), total: v });
        if (v > 21) { h.bust = true; h.done = true; ev.push({ t: 'bust', hand: st.active }); }
        else if (v === 21) h.done = true;
      } else if (a.type === 'stand') h.done = true;
      else if (a.type === 'double') {
        debit = h.bet; h.bet *= 2; h.doubled = true;
        const c = bjDraw(st, rng, ev); h.cards.push(c);
        const v = value(h.cards).total;
        ev.push({ t: 'double', hand: st.active, bet: h.bet }, { t: 'card', to: 'player', hand: st.active, card: code(c), total: v, sideways: true });
        if (v > 21) { h.bust = true; ev.push({ t: 'bust', hand: st.active }); }
        h.done = true;
      } else if (a.type === 'split') {
        debit = h.bet;
        const h2 = { cards: [h.cards.pop()], bet: h.bet };
        st.hands.push(h2);
        ev.push({ t: 'split', bet: h.bet });
        const aces = h.cards[0].r === 'A';
        for (const [i, x] of [[0, h], [1, h2]]) { const c = bjDraw(st, rng, ev); x.cards.push(c); ev.push({ t: 'card', to: 'player', hand: i, card: code(c), total: value(x.cards).total }); }
        if (aces) { h.splitAce = h2.splitAce = true; h.done = h2.done = true; }
      }
      if (h.done) st.active++;
      if (bjNextHand(st)) {
        if (h.done || a.type === 'split') ev.push({ t: 'turn', hand: st.active });
        return { events: ev, debit };
      }
      const ret = bjFinish(st, rng, ev);
      return { events: ev, debit, credit: ret, done: true };
    },
    view(st) {
      const hole = st.phase === 'play';
      return {
        phase: st.phase === 'play' ? 'play' : 'bet',
        active: st.active,
        hands: st.hands.map(h => ({ cards: h.cards.map(code), total: value(h.cards).total, soft: value(h.cards).soft, bet: h.bet, done: !!h.done, bust: !!h.bust, res: h.res || null })),
        dealer: { cards: st.dealer.map((c, i) => i === 1 && hole ? '??' : code(c)), total: hole ? value(st.dealer.slice(0, 1)).total : st.dealer.length ? value(st.dealer).total : 0 },
        shoeLeft: st.shoe.length,
        last: st.last
      };
    },
    bot: basic
  });

  /* ================= Video poker: Jacks or Better 9/6 ================= */
  const VP_PAY = [
    ['royal', 800], ['sflush', 50], ['quads', 25], ['full', 9], ['flush', 6], ['straight', 4], ['trips', 3], ['twopair', 2], ['jacks', 1]
  ];
  const VP_BETS = [10, 20, 50, 100, 200, 500, 1000, 2000, 5000];
  const rv = c => { const i = Cards.rankIndex(c); return i === 0 ? 14 : i + 1; }; // 2..14
  function vpRank(hand) {
    const vals = hand.map(rv).sort((a, b) => a - b);
    const flush = hand.every(c => c.s === hand[0].s);
    const uniq = [...new Set(vals)];
    let straight = uniq.length === 5 && (vals[4] - vals[0] === 4 || vals.join() === '2,3,4,5,14');
    const cnt = {}; vals.forEach(v => cnt[v] = (cnt[v] || 0) + 1);
    const groups = Object.values(cnt).sort((a, b) => b - a);
    if (straight && flush) return vals[0] === 10 ? 'royal' : 'sflush';
    if (groups[0] === 4) return 'quads';
    if (groups[0] === 3 && groups[1] === 2) return 'full';
    if (flush) return 'flush';
    if (straight) return 'straight';
    if (groups[0] === 3) return 'trips';
    if (groups[0] === 2 && groups[1] === 2) return 'twopair';
    if (groups[0] === 2) { const p = +Object.keys(cnt).find(k => cnt[k] === 2); if (p >= 11) return 'jacks'; }
    return null;
  }
  const vpPay = rank => rank ? VP_PAY.find(p => p[0] === rank)[1] : 0;
  // which cards a good player holds (simplified Jacks-or-Better strategy chart)
  function vpAdvice(hand) {
    const idx = [0, 1, 2, 3, 4];
    const rank = vpRank(hand);
    if (rank && ['royal', 'sflush', 'quads', 'full', 'flush', 'straight'].includes(rank)) return idx.map(() => true);
    const vals = hand.map(rv);
    const hold = set => idx.map(i => set.includes(i));
    const bySuit = {}; hand.forEach((c, i) => (bySuit[c.s] = bySuit[c.s] || []).push(i));
    const cnt = {}; vals.forEach((v, i) => (cnt[v] = cnt[v] || []).push(i));
    const pairs = Object.keys(cnt).filter(v => cnt[v].length === 2).map(Number);
    const trips = Object.keys(cnt).find(v => cnt[v].length === 3);
    const suitedWith = (pred, n) => { for (const s in bySuit) { const ids = bySuit[s].filter(i => pred(vals[i])); if (ids.length >= n) return ids.slice(0, n); } return null; };
    const royalN = n => suitedWith(v => v >= 10, n);
    const sfDraw = n => { for (const s in bySuit) { const ids = bySuit[s]; if (ids.length < n) continue; for (let lo = 1; lo <= 10; lo++) { const inRun = ids.filter(i => { const v = vals[i] === 14 && lo === 1 ? 1 : vals[i]; return v >= lo && v <= lo + 4; }); if (inRun.length >= n) return inRun.slice(0, n); } } return null; };
    const r4 = royalN(4); if (r4) return hold(r4);
    if (trips) return hold(cnt[trips]);
    if (pairs.length === 2) return hold([...cnt[pairs[0]], ...cnt[pairs[1]]]);
    const sf4 = sfDraw(4); if (sf4) return hold(sf4);
    const hi = pairs.find(p => p >= 11); if (hi) return hold(cnt[hi]);
    const r3 = royalN(3); if (r3) return hold(r3);
    for (const s in bySuit) if (bySuit[s].length === 4) return hold(bySuit[s]);
    if (pairs.length) return hold(cnt[pairs[0]]);
    // open-ended 4 to a straight
    const u = [...new Set(vals)].sort((a, b) => a - b);
    for (let i = 0; i + 3 < u.length; i++) if (u[i + 3] - u[i] === 3 && u[i] >= 2 && u[i + 3] <= 13) return hold(u.slice(i, i + 4).map(v => cnt[v][0]));
    const h2s = suitedWith(v => v >= 11, 2); if (h2s) return hold(h2s);
    const sf3 = sfDraw(3); if (sf3) return hold(sf3);
    const highs = idx.filter(i => vals[i] >= 11).sort((a, b) => vals[a] - vals[b]);
    if (highs.length >= 2) return hold(highs.slice(0, 2));
    const t10 = suitedWith(v => v >= 10 && v <= 13, 2); if (t10 && t10.some(i => vals[i] === 10)) return hold(t10);
    if (highs.length) return hold(highs.slice(0, 1));
    return idx.map(() => false);
  }
  const MAX_GAMBLE = 5;
  E.define({
    id: 'videopoker', kind: 'table', mode: 'solo',
    name: { zh: '视频扑克', en: 'Video Poker' },
    doc: 'Jacks or Better. Deal five cards, choose which to hold, draw once. Pays (total return per bet): royal 800, straight flush 50, four of a kind 25, full house 9, flush 6, straight 4, three of a kind 3, two pair 2, pair of jacks or better 1. After a win you may double-up up to 5 times: guess red or black on the next card, or collect.',
    PAY: VP_PAY, BETS: VP_BETS, rank: vpRank, pay: vpPay, advice: vpAdvice,
    init: () => ({ phase: 'bet', hand: [], deck: [], bet: 0, win: 0, gambles: 0, last: null }),
    legal(st, ctx) {
      if (st.phase === 'draw') return [{ type: 'draw', params: { hold: { bools: 5 } }, desc: 'Hold the cards marked true, replace the rest.' }];
      if (st.phase === 'gamble') {
        const out = [{ type: 'collect', desc: `Bank the ${st.win} win.` }];
        if (st.gambles < MAX_GAMBLE) out.push({ type: 'gamble', params: { guess: { enum: ['red', 'black'] } }, desc: 'Double or nothing on the colour of the next card.' });
        return out;
      }
      const bets = VP_BETS.filter(b => b <= ctx.balance);
      return bets.length ? [{ type: 'deal', params: { bet: { enum: bets } }, desc: 'Bet and deal five cards.' }] : [];
    },
    step(st, a, ctx) {
      const rng = ctx.rng;
      if (a.type === 'deal') {
        st.deck = Cards.shoe(rng, 1); st.hand = st.deck.splice(0, 5); st.bet = a.bet; st.phase = 'draw'; st.win = 0; st.gambles = 0; st.last = null;
        return { events: [{ t: 'deal', cards: st.hand.map(code), made: vpRank(st.hand) }], debit: a.bet };
      }
      if (a.type === 'draw') {
        const replaced = [];
        st.hand = st.hand.map((c, i) => { if (a.hold[i]) return c; const n = st.deck.shift(); replaced.push({ i, card: code(n) }); return n; });
        const rank = vpRank(st.hand), win = vpPay(rank) * st.bet;
        const ev = [{ t: 'draw', replaced, cards: st.hand.map(code), rank, win }];
        if (win > 0) { st.win = win; st.phase = 'gamble'; return { events: ev }; }
        st.phase = 'bet'; st.last = { bet: st.bet, ret: 0, rank: null };
        ev.push({ t: 'settle', bet: st.bet, ret: 0, net: -st.bet });
        return { events: ev, done: true };
      }
      if (a.type === 'gamble') {
        const c = st.deck.shift() || Cards.shoe(rng, 1)[0];
        const red = c.s === '♥' || c.s === '♦';
        const ok = (a.guess === 'red') === red;
        st.gambles++;
        const ev = [{ t: 'gamble', card: code(c), color: red ? 'red' : 'black', guess: a.guess, won: ok }];
        if (ok) { st.win *= 2; if (st.gambles >= MAX_GAMBLE) return finishVP(st, ev); return { events: ev }; }
        st.win = 0; return finishVP(st, ev);
      }
      if (a.type === 'collect') return finishVP(st, []);
    },
    view: st => ({ phase: st.phase, hand: st.hand.map(code), made: st.hand.length ? vpRank(st.hand) : null, bet: st.bet, win: st.win, gamblesLeft: MAX_GAMBLE - st.gambles, last: st.last, paytable: Object.fromEntries(VP_PAY) }),
    bot(obs) {
      const L = obs.legal.map(a => a.type);
      if (L.includes('deal')) return { type: 'deal', bet: obs.legal[0].params.bet.enum.includes(100) ? 100 : obs.legal[0].params.bet.enum[0] };
      if (L.includes('draw')) return { type: 'draw', hold: vpAdvice(obs.hand.map(Cards.decode)) };
      return { type: 'collect' };
    }
  });
  function finishVP(st, ev) {
    const ret = st.win;
    st.phase = 'bet'; st.last = { bet: st.bet, ret, rank: vpRank(st.hand) };
    ev.push({ t: 'settle', bet: st.bet, ret, net: ret - st.bet });
    return { events: ev, credit: ret, done: true };
  }
})(typeof window !== 'undefined' ? window : globalThis);
