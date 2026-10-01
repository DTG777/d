/* 四川麻将 · 血战到底 Sichuan Mahjong "Bloody to the End".
   108 tiles (characters m, bamboo s, dots p; 1-9, four of each), 4 players, no chow.
   Pick a void suit (定缺) first; you can only win once that suit is gone from your hand.
   A winner leaves the table and the rest play on until three have won or the wall runs dry.
   Tiles are codes "1m".."9m", "1s".."9s", "1p".."9p". */
(function (root) {
  const E = root.Engines || require('./core.js');
  const { R } = E;
  const SUITS = ['m', 's', 'p'];
  const code = i => (i % 9 + 1) + SUITS[Math.floor(i / 9)];
  const idx = c => SUITS.indexOf(c[1]) * 9 + (+c[0] - 1);
  const suitOf = i => Math.floor(i / 9);
  const BASES = [10, 50, 100, 500, 1000];
  const MAX_FAN = 5;

  const counts = tiles => { const c = new Array(27).fill(0); for (const t of tiles) c[t]++; return c; };
  // can counts be split entirely into sets (triplets / runs)?
  function allSets(c) {
    let i = 0; while (i < 27 && !c[i]) i++;
    if (i >= 27) return true;
    if (c[i] >= 3) { c[i] -= 3; const ok = allSets(c); c[i] += 3; if (ok) return true; }
    if (i % 9 <= 6 && c[i + 1] && c[i + 2]) { c[i]--; c[i + 1]--; c[i + 2]--; const ok = allSets(c); c[i]++; c[i + 1]++; c[i + 2]++; if (ok) return true; }
    return false;
  }
  function allTriplets(c) { return c.every(n => n === 0 || n === 3); }
  // complete hand? c = concealed counts (sum = 14 - 3 x melds)
  function winShape(c, melds) {
    const n = c.reduce((a, b) => a + b, 0);
    if (n % 3 !== 2) return null;
    if (!melds && n === 14 && c.every(x => x % 2 === 0)) return { seven: true, pong: false };
    let any = null;
    for (let i = 0; i < 27; i++) if (c[i] >= 2) {
      c[i] -= 2;
      if (allSets(c)) { const p = allTriplets(c); any = any && any.pong ? any : { seven: false, pong: p }; }
      c[i] += 2;
    }
    return any;
  }
  const FAN_NAME = { base: '平胡 plain win', pong: '对对胡 all pongs', flush: '清一色 pure suit', seven: '七对 seven pairs', gen: '根 four-of-a-kind', single: '金钩钓 single wait', kongDraw: '杠上花 win on kong draw', kongDiscard: '杠上炮 win on kong discard', last: '海底捞月 last tile', self: '自摸 self-drawn' };
  // fan for a complete hand. tiles = concealed incl. winning tile
  function fan(tiles, melds, extra = {}) {
    const c = counts(tiles), shape = winShape(c, melds.length);
    if (!shape) return null;
    const names = [];
    let f = 0;
    if (shape.seven) { f += 2; names.push('seven'); }
    else if (shape.pong) { f += 1; names.push('pong'); }
    const all = [...tiles, ...melds.map(m => m.tile)];
    if (all.every(t => suitOf(t) === suitOf(all[0]))) { f += 2; names.push('flush'); }
    const full = counts(tiles); melds.forEach(m => { full[m.tile] += m.type === 'kong' ? 4 : 3; });
    const gens = full.filter(n => n === 4).length;
    for (let k = 0; k < gens; k++) { f++; names.push('gen'); }
    if (melds.length === 4) { f++; names.push('single'); }
    if (extra.kongDraw) { f++; names.push('kongDraw'); }
    if (extra.kongDiscard) { f++; names.push('kongDiscard'); }
    if (extra.last) { f++; names.push('last'); }
    if (!names.length) names.push('base');
    return { fan: Math.min(MAX_FAN, f), names };
  }
  // shanten (tiles away from ready, -1 = complete) ignoring the void suit
  function shanten(tiles, meldCount, lack) {
    const c = counts(tiles.filter(t => suitOf(t) !== lack));
    let best = 8;
    let sets = meldCount, parts = 0, pair = 0;
    const evalNow = () => { const p = Math.min(parts, 4 - sets); const s = 8 - 2 * sets - p - pair; if (s < best) best = s; };
    function dfs(i) {
      while (i < 27 && !c[i]) i++;
      if (i >= 27) { evalNow(); return; }
      if (c[i] >= 3) { c[i] -= 3; sets++; dfs(i); sets--; c[i] += 3; }
      if (i % 9 <= 6 && c[i + 1] && c[i + 2]) { c[i]--; c[i + 1]--; c[i + 2]--; sets++; dfs(i); sets--; c[i]++; c[i + 1]++; c[i + 2]++; }
      if (c[i] >= 2) {
        if (!pair) { c[i] -= 2; pair = 1; dfs(i); pair = 0; c[i] += 2; }
        c[i] -= 2; parts++; dfs(i); parts--; c[i] += 2;
      }
      if (i % 9 <= 7 && c[i + 1]) { c[i]--; c[i + 1]--; parts++; dfs(i); parts--; c[i]++; c[i + 1]++; }
      if (i % 9 <= 6 && c[i + 2]) { c[i]--; c[i + 2]--; parts++; dfs(i); parts--; c[i]++; c[i + 2]++; }
      c[i]--; dfs(i + (c[i] ? 0 : 1)); c[i]++;
    }
    dfs(0);
    if (!meldCount) { const pairs = c.filter(n => n >= 2).length; best = Math.min(best, 6 - pairs + Math.max(0, 7 - c.filter(n => n > 0).length)); }
    return best;
  }
  // tiles that would complete a 13-tile hand
  function waits(tiles, melds, lack) {
    if (tiles.some(t => suitOf(t) === lack)) return [];
    const out = [];
    for (let t = 0; t < 27; t++) {
      if (suitOf(t) === lack) continue;
      const c = counts([...tiles, t]);
      if (c[t] > 4) continue;
      if (winShape(c, melds.length)) out.push(t);
    }
    return out;
  }

  const next = (st, s) => { let i = st.seats.indexOf(s); for (let k = 0; k < 4; k++) { i = (i + 1) % 4; if (!st.won[st.seats[i]]) return st.seats[i]; } return null; };
  const active = st => st.seats.filter(s => !st.won[s]);
  const sortTiles = a => a.sort((x, y) => x - y);

  // pay helper: moves chips inside a step, capped by what each payer still has
  function payer(ctx, st) {
    const left = { ...ctx.balances };
    const ledger = {};
    return {
      ledger,
      pay(from, to, amount) {
        const n = Math.max(0, Math.min(amount, left[from]));
        left[from] -= n; left[to] += n;
        ledger[from] = (ledger[from] || 0) - n; ledger[to] = (ledger[to] || 0) + n;
        st.net[from] -= n; st.net[to] += n;
        return n;
      }
    };
  }

  function canHu(st, seat, tiles) {
    if (tiles.some(t => suitOf(t) === st.lack[seat])) return null;
    return winShape(counts(tiles), st.melds[seat].length);
  }

  E.define({
    id: 'mahjong', kind: 'pvp', mode: 'pvp', seats: 4,
    name: { zh: '血战麻将', en: 'Sichuan Mahjong' },
    doc: 'Sichuan "bloody to the end" mahjong. 108 tiles: characters (m), bamboo (s) and dots (p) 1-9, four of each; no honours, no chow. Everyone gets 13 tiles, the dealer 14. First pick a void suit (定缺): you must throw all tiles of that suit before you can win. On your turn you draw, then discard (or declare a kong / win). When someone discards, others may claim it: win (胡) beats pong (碰, three of a kind) and kong (杠, four). A complete hand is 4 sets (pongs or runs like 3-4-5 of one suit) plus a pair, or seven pairs. Winners leave and the rest play on until three have won or the wall is empty; then players who are not ready pay those who are (查叫). Hand value = base x 2^fan (max ' + MAX_FAN + ' fan): all pongs +1, pure one suit +2, seven pairs +2, each four-of-a-kind (根) +1, single wait after four melds +1, win on a kong draw / kong discard / last tile +1 each. A self-drawn win is paid by every player still in (+1 base each); a win on a discard is paid by the discarder. Kongs pay at once: exposed kong 2x base from the discarder, concealed kong 2x base from everyone still in, added kong 1x base from everyone still in.',
    BASES, FAN_NAME, code, idx, fan, shanten, waits, winShape: tiles => winShape(counts(tiles.map(idx)), 0),
    tileCodes: 'Tiles are "1m".."9m" (characters 万), "1s".."9s" (bamboo 条), "1p".."9p" (dots 筒).',
    init: (rng, opts = {}) => ({ seats: (opts.seats || ['p1', 'p2', 'p3', 'p4']).slice(0, 4), phase: 'idle', round: 0, dealer: null, hands: {}, melds: {}, discards: {}, lack: {}, won: {}, net: {}, result: null, wall: [] }),
    turn(st) {
      if (st.phase === 'lack') return st.seats.find(s => st.lack[s] == null) || null;
      if (st.phase === 'play') return st.turn;
      if (st.phase === 'claim') return st.claim.eligible.find(s => !st.claim.resp[s]) || null;
      return st.seats[0];
    },
    legal(st, ctx) {
      const me = ctx.seat;
      if (this.turn(st) !== me) return [];
      if (st.phase === 'idle' || st.phase === 'done') {
        const can = BASES.filter(b => b * 60 <= ctx.balance && st.seats.every(s => ctx.balances[s] >= b * 4));
        return can.length ? [{ type: 'start', params: { base: { enum: can } }, desc: 'Deal a new hand at this base stake.' }] : [];
      }
      if (st.phase === 'lack') {
        return [{ type: 'lack', params: { suit: { enum: SUITS } }, desc: 'Choose your void suit (usually the suit you hold fewest of). You must discard all of it before winning.' }];
      }
      const hand = st.hands[me], lack = st.lack[me];
      if (st.phase === 'claim') {
        const t = st.claim.tile, out = [];
        const o = st.claim.opts[me];
        if (o.hu) out.push({ type: 'hu', desc: `Win on ${code(t)} discarded by ${st.claim.from}.` });
        if (o.kong) out.push({ type: 'kong', desc: `Kong ${code(t)} (four of a kind; the discarder pays 2x base, you draw a replacement).` });
        if (o.pong) out.push({ type: 'pong', desc: `Pong ${code(t)} (three of a kind), then discard.` });
        out.push({ type: 'pass', desc: 'Let it go.' });
        return out;
      }
      // play: my turn with a full hand
      const out = [];
      const lackTiles = hand.filter(t => suitOf(t) === lack);
      const pool = [...new Set(lackTiles.length ? lackTiles : hand)].sort((a, b) => a - b);
      if (canHu(st, me, hand)) out.push({ type: 'hu', desc: 'Declare a self-drawn win (自摸).' });
      const kongs = kongOptions(st, me);
      if (kongs.length) out.push({ type: 'kong', params: { tile: { enum: kongs.map(code) } }, desc: 'Declare a concealed kong (four in hand) or add to a pong you hold.' });
      out.push({ type: 'discard', params: { tile: { enum: pool.map(code) } }, desc: lackTiles.length ? 'Discard (you must throw your void-suit tiles first).' : 'Discard one tile.' });
      return out;
    },
    step(st, a, ctx) {
      const me = ctx.seat;
      if (a.type === 'start') return startHand(st, a, ctx);
      if (a.type === 'lack') {
        st.lack[me] = SUITS.indexOf(a.suit);
        const events = [{ t: 'lack', suit: a.suit }];
        if (this.turn(st) == null) {
          st.phase = 'play'; st.turn = st.dealer; st.kongFlag = false;
          events.push({ t: 'turn', seat: st.turn, phase: 'play' });
        }
        return { events };
      }
      if (st.phase === 'claim') {
        st.claim.resp[me] = a.type;
        const events = [{ t: a.type === 'pass' ? 'pass' : 'claimIntent', claim: a.type }];
        if (this.turn(st) != null) return { events };
        return resolveClaim(st, events, ctx);
      }
      // play phase
      if (a.type === 'discard') {
        const t = idx(a.tile), hand = st.hands[me];
        hand.splice(hand.indexOf(t), 1);
        st.discards[me].push(t);
        const afterKong = st.kongFlag; st.kongFlag = false; st.drawn = null;
        const events = [{ t: 'discard', tile: a.tile }];
        // who may claim it
        const opts = {}, eligible = [];
        let s = me;
        for (let k = 0; k < 3; k++) {
          s = st.seats[(st.seats.indexOf(s) + 1) % 4];
          if (st.won[s] || s === me) continue;
          const h = st.hands[s], same = h.filter(x => x === t).length, okSuit = suitOf(t) !== st.lack[s];
          const o = { hu: !!(okSuit && canHu(st, s, [...h, t])), pong: okSuit && same >= 2, kong: okSuit && same >= 3 && st.wall.length > 0 };
          if (o.hu || o.pong || o.kong) { opts[s] = o; eligible.push(s); }
        }
        if (eligible.length) {
          st.phase = 'claim';
          st.claim = { tile: t, from: me, opts, eligible, resp: {}, afterKong };
          events.push({ t: 'claim', tile: a.tile, from: me, seats: eligible });
          return { events };
        }
        return advance(st, next(st, me), events, ctx);
      }
      if (a.type === 'hu') {
        const hand = st.hands[me];
        const f = fan(hand, st.melds[me], { kongDraw: st.kongFlag, last: !st.wall.length });
        const P = payer(ctx, st);
        const amt = st.base * Math.pow(2, f.fan) + st.base;
        const payers = active(st).filter(s => s !== me);
        payers.forEach(s => P.pay(s, me, amt));
        st.won[me] = { tile: st.drawn != null ? st.drawn : hand[hand.length - 1], self: true, fan: f.fan, names: f.names, order: Object.keys(st.won).length + 1 };
        st.hands[me] = sortTiles(hand.slice());
        const events = [{ t: 'hu', self: true, tile: code(st.won[me].tile), fan: f.fan, names: f.names, hand: st.hands[me].map(code), each: amt, from: payers }];
        st.kongFlag = false;
        if (active(st).length <= 1) return finish(st, events, P.ledger, ctx);
        return advance(st, next(st, me), events, ctx, P.ledger);
      }
      if (a.type === 'kong') {
        const t = idx(a.tile), hand = st.hands[me];
        const P = payer(ctx, st);
        const pongM = st.melds[me].find(m => m.type === 'pong' && m.tile === t);
        let kind;
        if (pongM) { hand.splice(hand.indexOf(t), 1); pongM.type = 'kong'; pongM.added = true; kind = 'added'; active(st).filter(s => s !== me).forEach(s => P.pay(s, me, st.base)); }
        else { for (let k = 0; k < 4; k++) hand.splice(hand.indexOf(t), 1); st.melds[me].push({ type: 'kong', tile: t, concealed: true }); kind = 'concealed'; active(st).filter(s => s !== me).forEach(s => P.pay(s, me, st.base * 2)); }
        const events = [{ t: 'kong', tile: a.tile, kind, pay: { ...P.ledger } }];
        return drawFor(st, me, events, ctx, P.ledger, true);
      }
      return { error: 'unexpected action' };
    },
    view(st, seat) {
      const done = st.phase === 'done';
      const hands = {};
      for (const s of st.seats) hands[s] = s === seat || done || st.won[s] ? (st.hands[s] || []).map(code) : (st.hands[s] || []).map(() => '??');
      const me = st.hands[seat] || [];
      const full = me.length % 3 === 2;
      return {
        phase: st.phase, base: st.base || 0, dealer: st.dealer, wall: st.wall.length, turn: this.turn(st),
        hand: me.map(code), drawn: st.turn === seat && st.drawn != null ? code(st.drawn) : null,
        hands, counts: Object.fromEntries(st.seats.map(s => [s, (st.hands[s] || []).length])),
        melds: Object.fromEntries(st.seats.map(s => [s, (st.melds[s] || []).map(m => ({ type: m.type, tile: code(m.tile), concealed: !!m.concealed, from: m.from }))])),
        discards: Object.fromEntries(st.seats.map(s => [s, (st.discards[s] || []).map(code)])),
        lack: Object.fromEntries(st.seats.map(s => [s, st.lack[s] != null ? SUITS[st.lack[s]] : null])),
        won: JSON.parse(JSON.stringify(Object.fromEntries(Object.entries(st.won).map(([s, w]) => [s, { ...w, tile: code(w.tile) }])))),
        net: { ...st.net },
        claim: st.phase === 'claim' ? { tile: code(st.claim.tile), from: st.claim.from, you: st.claim.opts[seat] || null } : null,
        // ready? which tiles win (for beginners and agents)
        waits: !full && st.lack[seat] != null && me.length ? waits(me, st.melds[seat] || [], st.lack[seat]).map(code) : [],
        shanten: st.lack[seat] != null && me.length ? shanten(me, (st.melds[seat] || []).length, st.lack[seat]) : null,
        result: st.result
      };
    },
    bot(obs) {
      const has = t => obs.legal.find(l => l.type === t);
      if (has('start')) { const e = has('start').params.base.enum; return { type: 'start', base: e.includes(100) ? 100 : e[0] }; }
      const hand = obs.hand.map(idx), melds = obs.melds[obs.seat].length;
      if (has('lack')) {
        const n = SUITS.map((_, s) => hand.filter(t => suitOf(t) === s).length);
        return { type: 'lack', suit: SUITS[n.indexOf(Math.min(...n))] };
      }
      const lack = SUITS.indexOf(obs.lack[obs.seat]);
      if (has('hu')) return { type: 'hu' };
      if (obs.phase === 'claim') {
        if (has('kong')) return { type: 'kong' };
        if (has('pong')) {
          const t = idx(obs.claim.tile);
          const now = shanten(hand, melds, lack);
          const pairs = counts(hand).filter(n => n >= 2).length;
          const after = hand.slice(); after.splice(after.indexOf(t), 1); after.splice(after.indexOf(t), 1);
          let best = 9;
          for (const d of new Set(after)) { const h = after.slice(); h.splice(h.indexOf(d), 1); best = Math.min(best, shanten(h, melds + 1, lack)); }
          if (best <= now - (melds ? 0 : 0) && pairs < 5) return { type: 'pong' };
        }
        return { type: 'pass' };
      }
      if (has('kong')) return { type: 'kong', tile: has('kong').params.tile.enum[0] };
      const pool = has('discard').params.tile.enum.map(idx);
      if (pool.some(t => suitOf(t) === lack)) {
        // throw the most isolated void tile
        const c = counts(hand);
        const iso = t => (c[t] > 1 ? 3 : 0) + (t % 9 > 0 && c[t - 1] ? 1 : 0) + (t % 9 < 8 && c[t + 1] ? 1 : 0);
        return { type: 'discard', tile: code(pool.sort((x, y) => iso(x) - iso(y))[0]) };
      }
      let best = null, bs = Infinity;
      const c = counts(hand);
      for (const t of pool) {
        const h = hand.slice(); h.splice(h.indexOf(t), 1);
        const s = shanten(h, melds, lack);
        // tie-break: keep connected tiles, drop terminals first
        const link = (c[t] - 1) * 2 + (t % 9 > 0 && c[t - 1] ? 1 : 0) + (t % 9 < 8 && c[t + 1] ? 1 : 0) + (t % 9 > 1 && c[t - 2] ? 0.5 : 0) + (t % 9 < 7 && c[t + 2] ? 0.5 : 0);
        const term = t % 9 === 0 || t % 9 === 8 ? -0.3 : 0;
        const score = s * 10 + link + term;
        if (score < bs) { bs = score; best = t; }
      }
      return { type: 'discard', tile: code(best) };
    }
  });

  function kongOptions(st, me) {
    if (!st.wall.length) return [];
    const hand = st.hands[me], c = counts(hand), lack = st.lack[me], out = [];
    for (let t = 0; t < 27; t++) if (c[t] === 4 && suitOf(t) !== lack) out.push(t);
    for (const m of st.melds[me]) if (m.type === 'pong' && c[m.tile]) out.push(m.tile);
    return out;
  }
  function startHand(st, a, ctx) {
    const wall = [];
    for (let t = 0; t < 27; t++) for (let k = 0; k < 4; k++) wall.push(t);
    R.shuffle(ctx.rng, wall);
    st.base = a.base; st.round++; st.result = null; st.wall = wall;
    st.dealer = st.dealer ? st.seats[(st.seats.indexOf(st.dealer) + 1) % 4] : st.seats[R.int(ctx.rng, 0, 3)];
    st.hands = {}; st.melds = {}; st.discards = {}; st.lack = {}; st.won = {}; st.net = {};
    for (const s of st.seats) { st.hands[s] = sortTiles(wall.splice(0, 13)); st.melds[s] = []; st.discards[s] = []; st.net[s] = 0; }
    const d = wall.pop(); st.hands[st.dealer].push(d); st.drawn = d;
    st.phase = 'lack'; st.turn = st.dealer; st.kongFlag = false; st.claim = null;
    return { events: [{ t: 'deal', base: a.base, dealer: st.dealer, wall: wall.length }, ...st.seats.map(s => ({ t: 'hand', to: s, seat: s, tiles: st.hands[s].map(code) })), { t: 'turn', seat: st.seats[0], phase: 'lack' }] };
  }
  // seat `s` draws (normal turn or kong replacement) and must then act
  function drawFor(st, s, events, ctx, ledger = {}, afterKong = false) {
    if (!st.wall.length) return finish(st, events, ledger, ctx, true);
    const t = st.wall.pop();
    st.hands[s].push(t); st.drawn = t; st.turn = s; st.phase = 'play'; st.kongFlag = afterKong;
    events.push({ t: 'draw', seat: s, left: st.wall.length, kong: afterKong }, { t: 'drawn', to: s, seat: s, tile: code(t) }, { t: 'turn', seat: s, phase: 'play' });
    return { events, ledger };
  }
  function advance(st, s, events, ctx, ledger = {}) {
    if (!s || active(st).length <= 1) return finish(st, events, ledger, ctx);
    return drawFor(st, s, events, ctx, ledger);
  }
  function resolveClaim(st, events, ctx) {
    const cl = st.claim, t = cl.tile, from = cl.from;
    st.phase = 'play'; st.claim = null;
    const P = payer(ctx, st);
    const hus = cl.eligible.filter(s => cl.resp[s] === 'hu');
    if (hus.length) {
      st.discards[from].pop();
      for (const s of hus) {
        const tiles = [...st.hands[s], t];
        const f = fan(tiles, st.melds[s], { kongDiscard: cl.afterKong, last: !st.wall.length });
        const amt = st.base * Math.pow(2, f.fan);
        P.pay(from, s, amt);
        st.hands[s] = sortTiles(tiles);
        st.won[s] = { tile: t, self: false, from, fan: f.fan, names: f.names, order: Object.keys(st.won).length + 1 };
        events.push({ t: 'hu', seat: s, self: false, tile: code(t), from, fan: f.fan, names: f.names, hand: st.hands[s].map(code), each: amt });
      }
      if (active(st).length <= 1) return finish(st, events, P.ledger, ctx);
      // play continues after the last winner (counting from the discarder)
      let last = from;
      for (let k = 1; k < 4; k++) { const s = st.seats[(st.seats.indexOf(from) + k) % 4]; if (hus.includes(s)) last = s; }
      return advance(st, next(st, last), events, ctx, P.ledger);
    }
    const kongBy = cl.eligible.find(s => cl.resp[s] === 'kong');
    const pongBy = cl.eligible.find(s => cl.resp[s] === 'pong');
    const who = kongBy || pongBy;
    if (who) {
      st.discards[from].pop();
      const hand = st.hands[who];
      const n = kongBy ? 3 : 2;
      for (let k = 0; k < n; k++) hand.splice(hand.indexOf(t), 1);
      st.melds[who].push({ type: kongBy ? 'kong' : 'pong', tile: t, from });
      if (kongBy) {
        P.pay(from, who, st.base * 2);
        events.push({ t: 'kong', seat: who, tile: code(t), kind: 'exposed', from, pay: { ...P.ledger } });
        return drawFor(st, who, events, ctx, P.ledger, true);
      }
      st.turn = who; st.drawn = null; st.kongFlag = false;
      events.push({ t: 'pong', seat: who, tile: code(t), from }, { t: 'turn', seat: who, phase: 'play' });
      return { events };
    }
    return advance(st, next(st, from), events, ctx);
  }
  function finish(st, events, ledger, ctx, exhausted) {
    const P = payer({ balances: Object.fromEntries(Object.keys(ctx.balances).map(s => [s, ctx.balances[s] + (ledger[s] || 0)])) }, st);
    if (exhausted) {
      // 查叫: players still in who are not ready pay each ready player their best possible hand
      const rest = active(st);
      const ready = {}, notReady = [];
      for (const s of rest) {
        const w = waits(st.hands[s], st.melds[s], st.lack[s]);
        if (w.length) ready[s] = Math.max(...w.map(t => fan([...st.hands[s], t], st.melds[s]).fan));
        else notReady.push(s);
      }
      for (const loser of notReady) for (const w in ready) P.pay(loser, w, st.base * Math.pow(2, ready[w]));
      events.push({ t: 'exhaust', ready: Object.keys(ready), notReady });
    }
    for (const s in P.ledger) ledger[s] = (ledger[s] || 0) + P.ledger[s];
    st.phase = 'done';
    st.result = { net: { ...st.net }, won: Object.keys(st.won), exhausted: !!exhausted };
    events.push({ t: 'reveal', hands: Object.fromEntries(st.seats.map(s => [s, st.hands[s].map(code)])) });
    for (const s of st.seats) {
      const net = st.net[s];
      events.push({ t: 'settle', seat: s, bet: st.base * 4, ret: net > 0 ? st.base * 4 + net : 0, net, win: net > 0 });
    }
    return { events, ledger, players: st.seats.slice(), done: true };
  }
})(typeof window !== 'undefined' ? window : globalThis);
