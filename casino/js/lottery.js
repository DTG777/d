/* Lottery hall: Chinese and US draw games plus scratch cards. Every game shows its
   exact top-prize odds and its long-run return, computed from its own pay table.
   Prices are in chips at 10 chips per yuan or dollar. Exposed as window.Lottery */
(function () {
  const t = (k, p) => I18N.t(k, p);
  const zh = () => I18N.lang === 'zh';
  const fmt = U.fmt, h = U.h;
  const ST = Object.assign({ jp: {}, issue: {}, last: {}, spent: 0, won: 0, tickets: 0, best: 0, cards: 0 }, LS.get('lotto', {}));
  const save = () => LS.set('lotto', ST);
  const X = 10; // chips per yuan / dollar
  const comb = (n, k) => { if (k < 0 || k > n) return 0; let r = 1; for (let i = 0; i < k; i++) r = r * (n - i) / (i + 1); return r; };
  const sample = (n, k, from = 1) => { const a = []; for (let i = 0; i < n; i++) a.push(i + from); for (let i = 0; i < k; i++) { const j = i + Math.floor(Math.random() * (n - i)); [a[i], a[j]] = [a[j], a[i]]; } return a.slice(0, k).sort((x, y) => x - y); };
  const big = n => { n = Math.round(n); if (!zh()) return U.fmtShort(n); if (n >= 1e8) return (n / 1e8).toFixed(2).replace(/\.?0+$/, '') + '亿'; if (n >= 1e4) return Math.round(n / 1e4) + '万'; return fmt(n); };
  const pct = r => (r * 100).toFixed(r < 0.1 ? 1 : 0) + '%';
  const odds = p => '1 / ' + fmt(Math.round(1 / p));

  /* ---------------- the games ---------------- */
  const FIVE9 = [[[5, 1]], [[5, 0]], [[4, 1]], [[4, 0]], [[3, 1]], [[3, 0]], [[2, 1]], [[1, 1]], [[0, 1]]];
  const GAMES = {
    ssq: { reg: 'cn', kind: 'pool', price: 2 * X, a: [33, 6], b: [16, 1], ca: '#e8283c', cb: '#2f7cf6', jp0: 1.8e9 * X, others: 2.5, p2: 2e5 * X, issue0: 2026001,
      tiers: [[[6, 1]], [[6, 0]], [[5, 1]], [[5, 0], [4, 1]], [[4, 0], [3, 1]], [[2, 1], [1, 1], [0, 1]]], pay: ['jp', 'p2', 3000 * X, 200 * X, 10 * X, 5 * X] },
    dlt: { reg: 'cn', kind: 'pool', price: 2 * X, a: [35, 5], b: [12, 2], ca: '#3b7be0', cb: '#f6c94e', jp0: 8e8 * X, others: 0.8, p2: 2.5e5 * X, issue0: 26001,
      tiers: [[[5, 2]], [[5, 1]], [[5, 0]], [[4, 2]], [[4, 1]], [[3, 2]], [[4, 0]], [[3, 1], [2, 2]], [[3, 0], [1, 2], [2, 1], [0, 2]]], pay: ['jp', 'p2', 10000 * X, 3000 * X, 300 * X, 200 * X, 100 * X, 15 * X, 5 * X] },
    fc3d: { reg: 'cn', kind: 'digits', price: 2 * X, straight: 1040 * X, box3: 346 * X, box6: 173 * X, ca: '#e8283c', issue0: 2026001 },
    kl8: { reg: 'cn', kind: 'spots', price: 2 * X, n: 80, draw: 20, max: 10, ca: '#e8283c', issue0: 2026001,
      pay: { 1: { 1: 4.6 }, 2: { 2: 19 }, 3: { 3: 53, 2: 3 }, 4: { 4: 100, 3: 5, 2: 3 }, 5: { 5: 1000, 4: 21, 3: 3 }, 6: { 6: 3000, 5: 30, 4: 10, 3: 3 }, 7: { 7: 10000, 6: 288, 5: 28, 4: 4, 0: 2 }, 8: { 8: 50000, 7: 800, 6: 88, 5: 10, 4: 3, 0: 2 }, 9: { 9: 300000, 8: 2000, 7: 200, 6: 20, 5: 5, 4: 3, 0: 2 }, 10: { 10: 5000000, 9: 8000, 8: 720, 7: 80, 6: 5, 5: 3, 0: 2 } } },
    pb: { reg: 'us', kind: 'pool', price: 2 * X, a: [69, 5], b: [26, 1], ca: '#f3ead3', cb: '#e8283c', jp0: 2e7 * X, issue0: 1, tiers: FIVE9, pay: ['jp', 1e6 * X, 5e4 * X, 100 * X, 100 * X, 7 * X, 7 * X, 4 * X, 4 * X] },
    mm: { reg: 'us', kind: 'pool', price: 5 * X, a: [70, 5], b: [24, 1], ca: '#f3ead3', cb: '#f6c94e', jp0: 5e7 * X, issue0: 1, mult: [[2, 0.6], [3, 0.25], [4, 0.1], [5, 0.04], [10, 0.01]], tiers: FIVE9, pay: ['jp', 1e6 * X, 1e4 * X, 500 * X, 200 * X, 10 * X, 10 * X, 7 * X, 5 * X] },
    pick3: { reg: 'us', kind: 'digits', price: 1 * X, straight: 500 * X, box3: 160 * X, box6: 80 * X, ca: '#35d49a', issue0: 1 },
    keno: { reg: 'us', kind: 'spots', price: 1 * X, n: 80, draw: 20, max: 10, ca: '#6fb7ff', issue0: 1,
      pay: { 1: { 1: 2 }, 2: { 2: 9 }, 3: { 3: 25, 2: 2 }, 4: { 4: 72, 3: 5, 2: 1 }, 5: { 5: 450, 4: 18, 3: 2 }, 6: { 6: 1100, 5: 57, 4: 7, 3: 1 }, 7: { 7: 5000, 6: 100, 5: 11, 4: 2, 3: 1 }, 8: { 8: 10000, 7: 1000, 6: 50, 5: 12, 4: 2 }, 9: { 9: 30000, 8: 3000, 7: 150, 6: 25, 5: 4, 4: 1 }, 10: { 10: 100000, 9: 4250, 8: 450, 7: 40, 6: 4, 5: 2, 0: 5 } } }
  };
  const jp = g => ST.jp[g] || GAMES[g].jp0;
  const pickW = list => { let r = Math.random(); for (const [v, w] of list) { if ((r -= w) < 0) return v; } return list[0][0]; };
  const P = (n, k, m) => comb(k, m) * comb(n - k, k - m) / comb(n, k);
  const pSpots = (k, hit) => comb(20, hit) * comb(60, k - hit) / comb(80, k);
  // tax on a single winning line: China withholds 20% over 10,000 yuan, the US withholds 24% over $5,000
  const TAX = { cn: [1e4 * X, 0.2], us: [5e3 * X, 0.24] };
  const net = (g, v) => { const [th, r] = TAX[GAMES[g].reg]; return Math.round(v > th ? v * (1 - r) : v); };
  const ev = (g, v) => { const G = GAMES[g]; return G.mult ? G.mult.reduce((a, [m, w]) => a + w * net(g, v * m), 0) : net(g, v); };
  // China shows the pool, but one winning line takes at most 5 million, or 10 million once the pool tops 150 million.
  // US jackpots are advertised as a 30-year annuity; the cash option is about 45% of that
  const CASH = 0.45;
  const top1 = g => { const p = jp(g); return GAMES[g].reg === 'cn' ? Math.min(p, (p >= 1.5e8 * X ? 1e7 : 5e6) * X) : p * CASH; };
  // ticket sales grow with the jackpot, so a bigger jackpot is more often shared: expected co-winners, and the mean share
  const crowd = g => GAMES[g].reg === 'us' ? jp(g) / (1.5e9 * X) : 0;
  const share = l => l > 0 ? (1 - Math.exp(-l)) / l : 1;
  const poisson = l => { let k = 0, p = Math.exp(-l), s = p; const u = Math.random(); while (u > s && k < 50) { k++; p *= l / k; s += p; } return k; };

  // exact long-run return per ticket, and the chance of the top prize
  function rtp(g, k) {
    const G = GAMES[g];
    if (G.kind === 'pool') {
      let e = 0;
      G.tiers.forEach((ts, i) => ts.forEach(([x, y]) => { const p = P(G.a[0], G.a[1], x) * P(G.b[0], G.b[1], y); const v = G.pay[i] === 'jp' ? net(g, top1(g)) * share(crowd(g)) : G.pay[i] === 'p2' ? net(g, G.p2 * 1.05) : ev(g, G.pay[i]); e += p * v; }));
      return e / G.price;
    }
    if (G.kind === 'digits') return net(g, G.straight) / 1000 / G.price;
    let e = 0; for (const hh in G.pay[k]) e += pSpots(k, +hh) * net(g, G.pay[k][hh] * X); return e / G.price;
  }
  function topOdds(g) {
    const G = GAMES[g];
    if (G.kind === 'pool') return 1 / (comb(G.a[0], G.a[1]) * comb(G.b[0], G.b[1]));
    if (G.kind === 'digits') return 1 / 1000;
    return pSpots(10, 10);
  }
  const tierName = (g, i) => GAMES[g].reg === 'cn' ? t('lt.nth', { n: i + 1 }) : i === 0 ? t('lt.jackpot') : GAMES[g].tiers[i][0].join(' + ');

  /* ---------------- drawing and judging ---------------- */
  function draw(g) {
    const G = GAMES[g];
    const D = G.kind === 'pool' ? { a: sample(G.a[0], G.a[1]), b: sample(G.b[0], G.b[1]) } : G.kind === 'digits' ? { a: [0, 1, 2].map(() => U.randInt(0, 9)) } : { a: sample(G.n, G.draw) };
    if (G.mult) D.mult = pickW(G.mult);
    ST.issue[g] = (ST.issue[g] || G.issue0) + 1; D.issue = ST.issue[g];
    return D;
  }
  function judge(g, L, D) {
    const G = GAMES[g];
    if (G.kind === 'pool') {
      const ma = L.a.filter(x => D.a.includes(x)).length, mb = L.b.filter(x => D.b.includes(x)).length;
      const i = G.tiers.findIndex(ts => ts.some(([x, y]) => x === ma && y === mb));
      if (i < 0) return { i, ma, mb, win: 0 };
      const p = G.pay[i], split = p === 'jp' ? poisson(crowd(g)) : 0;
      const gross = Math.round(p === 'jp' ? top1(g) / (1 + split) : p === 'p2' ? G.p2 * U.rand(0.5, 1.6) : p * (G.mult ? D.mult : 1));
      return { i, ma, mb, split, gross, win: net(g, gross) };
    }
    if (G.kind === 'digits') {
      if (!L.box) { const ok = L.a.join('') === D.a.join(''); return { i: ok ? 0 : -1, gross: ok ? G.straight : 0, win: ok ? net(g, G.straight) : 0 }; }
      const ok = L.a.slice().sort().join('') === D.a.slice().sort().join(''), v = ok ? (new Set(L.a).size === 3 ? G.box6 : G.box3) : 0;
      return { i: ok ? 1 : -1, gross: v, win: net(g, v) };
    }
    const hit = L.a.filter(x => D.a.includes(x)).length, w = Math.round(((G.pay[L.a.length] || {})[hit] || 0) * X);
    return { i: w ? hit : -1, hit, gross: w, win: net(g, w) };
  }
  const valid = (g, L) => { const G = GAMES[g]; return G.kind === 'pool' ? L.a.length === G.a[1] && L.b.length === G.b[1] : G.kind === 'digits' ? L.a.length === 3 && (!L.box || new Set(L.a).size > 1) : L.a.length >= 1 && L.a.length <= G.max; };
  function quick(g, k) {
    const G = GAMES[g];
    if (G.kind === 'pool') return { a: sample(G.a[0], G.a[1]), b: sample(G.b[0], G.b[1]) };
    if (G.kind === 'digits') return { a: [0, 1, 2].map(() => U.randInt(0, 9)) };
    return { a: sample(G.n, k || 5) };
  }
  // money moves through the casino's own wallet so the ledger books the lottery's edge
  function wager(cost, id) { const was = C.current; C.current = id; const ok = C.take(cost); C.current = was; return ok; }
  function settle(won, cost, from) { if (won > 0) C.pay(won, from); C.record(won, cost); }

  function buy(g, lines, draws) {
    const G = GAMES[g], cost = G.price * lines.length * draws;
    if (!wager(cost, 'lottery')) return null;
    let won = 0, tax = 0, best = 0, last = null; const hits = {};
    for (let d = 0; d < draws; d++) {
      const D = draw(g), rs = lines.map(L => judge(g, L, D));
      rs.forEach(r => { if (r.win) { won += r.win; tax += r.gross - r.win; best = Math.max(best, r.win); hits[r.i] = (hits[r.i] || 0) + 1; } });
      if (G.jp0) {
        const mine = rs.some(r => r.i === 0);
        if (G.reg === 'cn') {
          // sales feed the pool; first prizes won elsewhere in the country drain it
          D.others = poisson(G.others);
          ST.jp[g] = U.clamp(jp(g) + G.jp0 * U.rand(0.005, 0.035) - (D.others + (mine ? 1 : 0)) * 6e6 * X, G.jp0 * 0.4, G.jp0 * 2.5);
        } else {
          // the bigger it gets, the likelier someone somewhere hits it
          D.other = !mine && Math.random() < Math.min(0.6, jp(g) / (3e9 * X));
          ST.jp[g] = mine || D.other ? G.jp0 : Math.min(2.2e9 * X, jp(g) * U.rand(1.05, 1.12));
        }
      }
      last = { D, rs };
    }
    if (G.kind === 'pool') ST.last[g] = [last.D.a, last.D.b];
    ST.spent += cost; ST.won += won; ST.tickets += lines.length * draws; ST.best = Math.max(ST.best, best); save();
    if (window.Story && Story.event) Story.event('lotto', draws);
    return { g, cost, won, tax, hits, last, draws, lines };
  }

  /* ---------------- scratch cards ---------------- */
  const CARDS = {
    hylx: { reg: 'cn', price: 5 * X, type: 'match3', c: '#c8283c', c2: '#ffd36b', art: '福' },
    fmt: { reg: 'cn', price: 10 * X, type: 'numbers', win: 2, max: 40, c: '#8a0f18', c2: '#ffd36b', art: '金' },
    lucky7: { reg: 'us', price: 1 * X, type: 'match3', c: '#5b2bd6', c2: '#ffd34a', art: '7' },
    gold: { reg: 'us', price: 10 * X, type: 'numbers', win: 3, max: 50, c: '#14110f', c2: '#f6c94e', art: '$' }
  };
  // prize multiples and their chances: about one card in four wins something, and the long-run return is about 63%
  const SCR = [[1, 0.12], [2, 0.06], [3, 0.02], [5, 0.025], [10, 0.008], [20, 0.003], [100, 0.0004], [1000, 0.00002], [10000, 0.000001]];
  const scrRtp = SCR.reduce((a, [m, p]) => a + m * p, 0), scrHit = SCR.reduce((a, [, p]) => a + p, 0);
  function scratchOutcome() { let r = Math.random(); for (const [m, p] of SCR) { if ((r -= p) < 0) return m; } return 0; }
  function makeCard(id) {
    const K = CARDS[id], AM = SCR.map(([m]) => m * K.price), top = AM[AM.length - 1];
    const m = scratchOutcome(), W = m * K.price;
    if (K.type === 'match3') {
      const cells = W ? [W, W, W] : [], cnt = {}; cells.forEach(v => { cnt[v] = 3; });
      // the near miss is printed on purpose: two top prizes, never the third
      if (W !== top) { cells.push(top, top); cnt[top] = 2; }
      while (cells.length < 9) { const v = U.pick(AM.slice(0, 7)); if ((cnt[v] || 0) < 2 && v !== W) { cells.push(v); cnt[v] = (cnt[v] || 0) + 1; } }
      return { id, W, cells: shuffle(cells), win: W ? [W] : [] };
    }
    const wins = sample(K.max, K.win), mine = [];
    const pool = sample(K.max, K.max).filter(x => !wins.includes(x));
    const near = wins.flatMap(x => [x - 1, x + 1]).filter(x => x >= 1 && x <= K.max && !wins.includes(x));
    const nums = [];
    if (W) nums.push(U.pick(wins));
    near.slice(0, 2).forEach(x => { if (!nums.includes(x)) nums.push(x); });
    for (const x of pool) { if (nums.length >= 10) break; if (!nums.includes(x)) nums.push(x); }
    const prizes = nums.map((x, i) => i === 0 && W ? W : i === 1 ? top : U.pick(AM.slice(0, 6)));
    nums.forEach((x, i) => mine.push({ n: x, p: prizes[i] }));
    return { id, W, wins, mine: shuffle(mine) };
  }
  function shuffle(a) { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; }

  /* ---------------- the hall ---------------- */
  let ov = null, tab = null, busy = false, shut = null;
  function open(kind) {
    if (shut) shut(true);
    tab = kind === 'scratch' ? 'scratch' : tab || (zh() ? 'cn' : 'us');
    ov = h('div', { class: 'lt-ov', role: 'dialog', 'aria-modal': 'true', 'aria-label': t('lt.title') });
    const box = h('div', { class: 'lt-box' });
    ov.append(box); document.body.append(ov);
    const me = ov, esc = e => { if (e.key === 'Escape' && !busy) close(); };
    document.addEventListener('keydown', esc);
    function close(now) {
      document.removeEventListener('keydown', esc); if (shut === close) shut = null;
      if (ov === me) { ov = null; busy = false; }
      if (now) me.remove(); else { me.classList.add('out'); setTimeout(() => me.remove(), 250); }
    }
    shut = close;
    function go(view, arg) { box.innerHTML = ''; box.scrollTop = 0; Sound.fx.click(); VIEWS[view](box, arg, go, close); }
    Sound.fx.open();
    go(kind && GAMES[kind] ? 'game' : kind && CARDS[kind] ? 'card' : 'hall', kind);
  }
  const top = (title, sub, go, close, back) => h('div', { class: 'lt-top' },
    back ? h('button', { class: 'lt-x', 'aria-label': t('st.back'), onclick: () => go(back), html: C.icon('back') }) : null,
    h('div', null, h('b', null, title), sub ? h('small', null, sub) : null),
    h('button', { class: 'lt-x', 'aria-label': t('ui.close'), onclick: () => close(), html: C.icon('x') }));
  function logo(g) {
    const G = GAMES[g];
    if (G.kind === 'pool') return h('span', { class: 'lt-logo' }, h('i', { class: 'lt-b', style: `--c:${G.ca}` }, ''), h('i', { class: 'lt-b', style: `--c:${G.ca}` }, ''), h('i', { class: 'lt-b', style: `--c:${G.cb}` }, ''));
    if (G.kind === 'digits') return h('span', { class: 'lt-logo dg' }, ...[3, 1, 4].map(d => h('i', { style: `--c:${G.ca}` }, String(d))));
    return h('span', { class: 'lt-logo sp', style: `--c:${G.ca}` }, ...Array.from({ length: 9 }, (_, i) => h('i', { class: [0, 4, 5, 8].includes(i) ? 'on' : '' })));
  }
  const VIEWS = {
    hall(el, _, go, close) {
      const tabs = h('div', { class: 'lt-tabs', role: 'tablist' }, ['cn', 'us', 'scratch'].map(k => h('button', { class: 'lt-tab' + (tab === k ? ' on' : ''), role: 'tab', 'aria-selected': String(tab === k), onclick: () => { tab = k; go('hall'); } }, t('lt.tab.' + k))));
      const grid = h('div', { class: 'lt-grid' });
      if (tab === 'scratch') {
        for (const id in CARDS) {
          const K = CARDS[id];
          grid.append(h('button', { class: 'lt-game lt-cardtile', style: `--c:${K.c};--c2:${K.c2}`, onclick: () => go('card', id) },
            h('span', { class: 'lt-mini-card' }, h('i', null, K.art)),
            h('b', null, t('lt.c.' + id)), h('small', null, t('lt.cs.' + id)),
            h('span', { class: 'lt-meta' }, h('em', null, t('lt.price', { n: fmt(K.price) })), h('em', null, t('lt.scr.top', { n: big(K.price * 10000) })))));
        }
      } else {
        for (const g in GAMES) {
          const G = GAMES[g]; if (G.reg !== tab) continue;
          const r = G.kind === 'spots' ? [1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(k => rtp(g, k)) : [rtp(g)];
          const rr = r.length > 1 ? `${pct(Math.min(...r))}–${pct(Math.max(...r))}` : pct(r[0]);
          grid.append(h('button', { class: 'lt-game', style: `--c:${G.cb || G.ca}`, onclick: () => go('game', g) },
            logo(g),
            h('b', null, t('lt.g.' + g)), h('small', null, t('lt.gs.' + g)),
            G.jp0 ? h('span', { class: 'lt-jp' }, h('small', null, t(G.reg === 'cn' ? 'lt.pool' : 'lt.jp')), h('strong', null, big(jp(g)))) : h('span', { class: 'lt-jp fixed' }, h('small', null, t('lt.topFixed')), h('strong', null, big(G.kind === 'digits' ? G.straight : G.pay[10][10] * X))),
            h('span', { class: 'lt-meta' }, h('em', null, t('lt.price', { n: fmt(G.price) })), h('em', null, t('lt.odds', { n: odds(topOdds(g)) })), h('em', { class: 'rtp' }, t('lt.rtp', { r: rr })))));
        }
      }
      el.append(top(t('lt.title'), t('lt.sub'), go, close), tabs, grid,
        h('p', { class: 'lt-note' }, t('lt.life', { s: fmt(ST.spent), w: fmt(ST.won), n: fmt(ST.tickets) })),
        h('p', { class: 'lt-note' }, t('lt.fine')));
    },
    game(el, g, go, close) {
      const G = GAMES[g];
      let cur = { a: [], b: [], box: false }, lines = [], draws = 1, k = 5;
      const linesEl = h('div', { class: 'lt-lines' }), costEl = h('b', null), pick = h('div', { class: 'lt-pick' }), table = h('div', { class: 'lt-table' });
      const head = h('div', { class: 'lt-hero', style: `--c:${G.cb || G.ca}` }, logo(g),
        h('div', null, h('small', null, G.jp0 ? t(G.reg === 'cn' ? 'lt.pool' : 'lt.jp') + ' · ' + t('lt.issue', { n: (ST.issue[g] || G.issue0) + 1 }) : t('lt.issue', { n: (ST.issue[g] || G.issue0) + 1 })),
          h('strong', null, G.jp0 ? big(jp(g)) : t('lt.g.' + g)), h('span', null, t('lt.how.' + g))));
      function paintPick() {
        pick.innerHTML = '';
        if (G.kind === 'pool') {
          for (const side of ['a', 'b']) {
            const [n, need] = G[side];
            pick.append(h('div', { class: 'lt-pickhead' }, h('span', null, t('lt.' + side + '.' + g)), h('em', null, `${cur[side].length}/${need}`)));
            pick.append(h('div', { class: 'lt-balls' + (n > 40 ? ' many' : '') }, Array.from({ length: n }, (_, i) => i + 1).map(x => h('button', { class: 'lt-ball ' + side + (cur[side].includes(x) ? ' on' : ''), style: `--c:${side === 'a' ? G.ca : G.cb}`, 'aria-pressed': String(cur[side].includes(x)), onclick: () => toggle(side, x, need) }, String(x).padStart(2, '0')))));
          }
        } else if (G.kind === 'digits') {
          pick.append(h('div', { class: 'lt-pickhead' }, h('span', null, t('lt.digits')), h('span', { class: 'lt-seg' },
            h('button', { class: 'sv-chipbtn' + (!cur.box ? ' on' : ''), onclick: () => { cur.box = false; paintPick(); paintCost(); } }, t('lt.straight')),
            h('button', { class: 'sv-chipbtn' + (cur.box ? ' on' : ''), onclick: () => { cur.box = true; paintPick(); paintCost(); } }, t('lt.box')))));
          pick.append(h('div', { class: 'lt-digits' }, [0, 1, 2].map(p => h('div', { class: 'lt-dcol' }, h('small', null, t('lt.pos.' + p)),
            ...Array.from({ length: 10 }, (_, d) => h('button', { class: 'lt-ball d' + (cur.a[p] === d ? ' on' : ''), style: `--c:${G.ca}`, onclick: () => { cur.a[p] = d; cur.a = cur.a.slice(0, 3); Sound.fx.chip(); paintPick(); paintCost(); } }, String(d)))))));
          pick.append(h('p', { class: 'lt-note' }, t('lt.digitsPay', { s: fmt(G.straight), b6: fmt(G.box6), b3: fmt(G.box3) })));
        } else {
          pick.append(h('div', { class: 'lt-pickhead' }, h('span', null, t('lt.spots', { n: cur.a.length || k })), h('em', null, `${cur.a.length}/${G.max}`)));
          pick.append(h('div', { class: 'lt-balls spots' }, Array.from({ length: G.n }, (_, i) => i + 1).map(x => h('button', { class: 'lt-ball a' + (cur.a.includes(x) ? ' on' : ''), style: `--c:${G.ca}`, onclick: () => toggle('a', x, G.max) }, String(x).padStart(2, '0')))));
        }
        paintTable();
      }
      function toggle(side, x, need) {
        const arr = cur[side], i = arr.indexOf(x);
        if (i >= 0) arr.splice(i, 1); else if (arr.length < need) arr.push(x); else { Sound.fx.error(); return; }
        arr.sort((p, q) => p - q); Sound.fx.chip(); if (G.kind === 'spots' && arr.length) k = arr.length;
        paintPick(); paintCost();
      }
      function paintTable() {
        table.innerHTML = '';
        const rows = [];
        if (G.kind === 'pool') G.tiers.forEach((ts, i) => { const p = ts.reduce((a, [x, y]) => a + P(G.a[0], G.a[1], x) * P(G.b[0], G.b[1], y), 0); rows.push([tierName(g, i), ts.map(m => m.join('+')).join(' / '), odds(p), G.pay[i] === 'jp' ? t('lt.float') : G.pay[i] === 'p2' ? t('lt.float') + ' ≈' + big(G.p2) : fmt(G.pay[i]) + (G.mult ? ' ×' : '')]); });
        else if (G.kind === 'digits') rows.push([t('lt.straight'), '3', odds(1 / 1000), fmt(G.straight)], [t('lt.box') + ' 6', '3', odds(6 / 1000), fmt(G.box6)], [t('lt.box') + ' 3', '3', odds(3 / 1000), fmt(G.box3)]);
        else { const kk = cur.a.length || k; Object.keys(G.pay[kk]).sort((p, q) => q - p).forEach(hh => rows.push([t('lt.hitN', { n: hh }), kk + '', odds(pSpots(kk, +hh)), fmt(Math.round(G.pay[kk][hh] * X))])); }
        table.append(h('details', { open: G.kind === 'spots' ? '' : null }, h('summary', null, t('lt.table') + ' · ' + t('lt.rtp', { r: pct(rtp(g, cur.a.length || k)) })),
          h('table', null, h('tr', null, ...['tier', 'match', 'odds', 'prize'].map(c => h('th', null, t('lt.col.' + c)))), ...rows.map(r => h('tr', null, ...r.map(c => h('td', null, c))))),
          G.mult ? h('p', { class: 'lt-note' }, t('lt.multNote')) : null,
          G.jp0 ? h('p', { class: 'lt-note' }, t(G.reg === 'cn' ? 'lt.capNote' : 'lt.cashNote', { a: big(5e6 * X), b: big(1e7 * X), p: big(1.5e8 * X) })) : null,
          h('p', { class: 'lt-note' }, t('lt.tax.' + G.reg, { n: fmt(TAX[G.reg][0]) }))));
      }
      function paintLines() {
        linesEl.innerHTML = '';
        lines.forEach((L, i) => linesEl.append(h('div', { class: 'lt-line' }, ballsOf(g, L), h('button', { class: 'lt-x sm', 'aria-label': t('lt.clear'), onclick: () => { lines.splice(i, 1); paintLines(); paintCost(); }, html: C.icon('x') }))));
      }
      const all = () => lines.concat(valid(g, cur) ? [cur] : []);
      function paintCost() { const n = all().length; costEl.textContent = t('lt.cost', { l: n, d: draws, n: fmt(n * draws * G.price) }); }
      const act = (label, fn, cls) => h('button', { class: 'btn btn-sm ' + (cls || 'btn-ghost'), onclick: fn }, label);
      const drawsSel = h('div', { class: 'lt-seg' }, [1, 10, 100].map(d => h('button', { class: 'sv-chipbtn' + (d === draws ? ' on' : ''), onclick: e => { draws = d; U.$$('button', drawsSel).forEach(b => b.classList.toggle('on', b === e.currentTarget)); paintCost(); } }, t('lt.drawsN', { n: d }))));
      el.append(top(t('lt.g.' + g), t('lt.gs.' + g), go, close, 'hall'), head, pick,
        h('div', { class: 'lt-acts' },
          act(t('lt.quick'), () => { cur = Object.assign(quick(g, cur.a.length || k), { box: cur.box }); Sound.fx.shuffle(); paintPick(); paintCost(); }),
          act(t('lt.clear'), () => { cur = { a: [], b: [], box: cur.box }; paintPick(); paintCost(); }),
          act(t('lt.add'), () => { if (!valid(g, cur)) { C.toast(t(G.kind === 'digits' && cur.box ? 'lt.boxTriple' : 'lt.need'), 'bad'); return; } if (lines.length >= 10) { C.toast(t('lt.max'), 'bad'); return; } lines.push(cur); cur = { a: [], b: [], box: cur.box }; paintPick(); paintLines(); paintCost(); }),
          act(t('lt.quick5'), () => { for (let i = 0; i < 5 && lines.length < 10; i++) lines.push(Object.assign(quick(g, cur.a.length || k), { box: cur.box })); Sound.fx.shuffle(); paintLines(); paintCost(); })),
        linesEl, table,
        h('div', { class: 'lt-buy' }, h('div', null, h('small', null, t('lt.draws')), drawsSel), costEl,
          h('button', { class: 'btn btn-gold', onclick: () => {
            const ls = all().map(L => ({ a: L.a.slice(), b: (L.b || []).slice(), box: !!L.box }));
            if (!ls.length) { C.toast(t('lt.need'), 'bad'); return; }
            const R = buy(g, ls, draws); if (!R) return;
            Sound.fx.cashReg();
            go(draws === 1 ? 'show' : 'sum', R);
          } }, t('lt.buy'))));
      paintPick(); paintCost();
    },
    async show(el, R, go, close) {
      const g = R.g, G = GAMES[g], D = R.last.D;
      let fast = U.reduced;
      busy = true;
      const stage = h('div', { class: 'lt-show k-' + G.kind, style: `--c:${G.cb || G.ca}` });
      const skip = h('button', { class: 'btn btn-ghost btn-sm lt-skip', onclick: () => { fast = true; } }, t('lt.skip'));
      el.append(top(t('lt.g.' + g), t('lt.issue', { n: D.issue }), go, close), stage, skip);
      const wait = ms => fast ? Promise.resolve() : U.sleep(ms);
      if (G.kind === 'pool') {
        const drum = h('div', { class: 'lt-drum' }, Array.from({ length: 22 }, (_, i) => h('i', { class: 'lt-b', style: `--c:${i % 4 === 3 ? G.cb : G.ca};--x:${U.rand(-38, 38).toFixed(0)}px;--y:${U.rand(-38, 38).toFixed(0)}px;--d:${U.rand(0.25, 0.6).toFixed(2)}s;--dl:-${U.rand(0, 0.6).toFixed(2)}s` })));
        const tray = h('div', { class: 'lt-tray' });
        stage.append(drum, tray);
        if (!fast) Sound.fx.drumroll(1.2);
        await wait(1100);
        for (const [side, list] of [['a', D.a], ['b', D.b]]) for (const x of list) {
          await wait(side === 'b' ? 1100 : 700);
          if (side === 'b' && !fast) Sound.fx.heartbeat();
          tray.append(h('i', { class: 'lt-b big drop', style: `--c:${side === 'a' ? G.ca : G.cb}` }, String(x).padStart(2, '0')));
          Sound.fx.ballClack(1.4);
        }
        if (G.mult) { await wait(600); tray.append(h('em', { class: 'lt-mult drop' }, '×' + D.mult)); Sound.fx.wheelTick(); }
        drum.classList.add('stop');
      } else if (G.kind === 'digits') {
        const wheels = [0, 1, 2].map(() => h('div', { class: 'lt-wheel' }, h('span', null, '0')));
        stage.append(h('div', { class: 'lt-wheels' }, wheels));
        for (let p = 0; p < 3; p++) {
          const sp = wheels[p].firstChild; const t0 = performance.now(); wheels[p].classList.add('spin');
          while (!fast && performance.now() - t0 < 700 + p * 350) { sp.textContent = U.randInt(0, 9); Sound.fx.wheelTick(); await U.sleep(55); }
          sp.textContent = D.a[p]; wheels[p].classList.remove('spin'); wheels[p].classList.add('done'); Sound.fx.thud();
          await wait(250);
        }
      } else {
        const mine = new Set(R.lines.flatMap(L => L.a));
        const cells = Array.from({ length: G.n }, (_, i) => h('i', { class: mine.has(i + 1) ? 'mine' : '' }, String(i + 1)));
        stage.append(h('div', { class: 'lt-board' }, cells));
        await wait(500);
        for (const x of D.a) { await wait(170); cells[x - 1].classList.add(mine.has(x) ? 'hit' : 'drawn'); mine.has(x) ? Sound.fx.ballClack(1.6) : Sound.fx.wheelTick(); }
      }
      skip.remove();
      await wait(400);
      result(el, R, go, close);
      busy = false;
    },
    sum(el, R, go, close) {
      const g = R.g, G = GAMES[g], net = R.won - R.cost, theo = R.lines.reduce((a, L) => a + rtp(g, L.a.length), 0) / R.lines.length;
      const rows = Object.keys(R.hits).sort((p, q) => G.kind === 'spots' ? q - p : p - q).map(i => h('tr', null, h('td', null, G.kind === 'spots' ? t('lt.hitN', { n: i }) : G.kind === 'digits' ? t(+i === 0 ? 'lt.straight' : 'lt.box') : tierName(g, +i)), h('td', null, '×' + R.hits[i])));
      el.append(top(t('lt.g.' + g), t('lt.sum.t', { n: R.draws }), go, close),
        h('div', { class: 'lt-sum' + (net >= 0 ? ' up' : ' down') },
          h('small', null, t('lt.sum.net')), h('strong', null, (net >= 0 ? '+' : '') + fmt(net)),
          h('div', { class: 'lt-sumrow' }, h('span', null, t('lt.sum.spent'), h('b', null, fmt(R.cost))), h('span', null, t('lt.sum.won'), h('b', null, fmt(R.won))), h('span', null, t('lt.sum.ret'), h('b', null, pct(R.won / R.cost)))),
          h('div', { class: 'lt-bars' }, h('i', { style: '--w:100%' }), h('i', { class: 'won', style: `--w:${Math.min(100, R.won / R.cost * 100).toFixed(1)}%` }))),
        rows.length ? h('table', { class: 'lt-hits' }, ...rows) : h('p', { class: 'lt-note' }, t('lt.noWin')),
        h('p', { class: 'lt-note' }, R.tax ? t('lt.taxed', { n: fmt(R.tax) }) : ''),
        h('p', { class: 'lt-lesson' }, t('lt.lesson', { r: pct(theo), k: fmt(Math.round(100 * (1 - theo))) })),
        h('div', { class: 'lt-acts' }, h('button', { class: 'btn btn-ghost btn-sm', onclick: () => go('game', g) }, t('lt.change')), h('button', { class: 'btn btn-ghost btn-sm', onclick: () => go('hall') }, t('lt.hall'))));
      settle(R.won, R.cost, el.querySelector('.lt-sum strong'));
      if (net > 0) { Sound.fx.win(2); FX.confetti(innerWidth / 2, innerHeight / 3, 90); } else Sound.fx.lose();
    },
    card(el, id, go, close) {
      const K = CARDS[id];
      const area = h('div', { class: 'lt-scr-wrap' });
      const buyBtn = h('button', { class: 'btn btn-gold', onclick: () => deal() }, t('lt.scr.buy', { n: fmt(K.price) }));
      const allBtn = h('button', { class: 'btn btn-ghost btn-sm', disabled: true }, t('lt.scr.all'));
      const msg = h('p', { class: 'lt-scr-msg' }, t('lt.scr.rule.' + K.type, { n: K.win }));
      el.append(top(t('lt.c.' + id), t('lt.cs.' + id), go, close, 'hall'), area, msg, h('div', { class: 'lt-acts' }, allBtn, buyBtn),
        h('p', { class: 'lt-note' }, t('lt.scr.odds', { h: Math.round(1 / scrHit), r: pct(scrRtp), n: fmt(ST.cards) })));
      paintCard(null);
      function paintCard(card) {
        area.innerHTML = '';
        const face = h('div', { class: 'lt-card t-' + K.type, style: `--c:${K.c};--c2:${K.c2}` },
          h('div', { class: 'lt-card-h' }, h('i', null, K.art), h('b', null, t('lt.c.' + id)), h('em', null, t('lt.price', { n: fmt(K.price) }))));
        const play = h('div', { class: 'lt-play' });
        if (K.type === 'match3') play.append(h('div', { class: 'lt-m3' }, Array.from({ length: 9 }, (_, i) => h('span', { class: card && card.win.includes(card.cells[i]) ? 'w' : '' }, card ? big(card.cells[i]) : '?'))));
        else {
          play.append(h('div', { class: 'lt-wn' }, h('small', null, t('lt.scr.winNums')), ...(card ? card.wins : Array(K.win).fill('?')).map(x => h('span', null, String(x)))));
          play.append(h('div', { class: 'lt-yn' }, h('small', null, t('lt.scr.yourNums')), ...Array.from({ length: 10 }, (_, i) => {
            const c = card && card.mine[i]; return h('span', { class: c && card.wins.includes(c.n) ? 'w' : '' }, h('b', null, c ? String(c.n) : '?'), h('small', null, c ? big(c.p) : ''));
          })));
        }
        face.append(play, h('div', { class: 'lt-card-f' }, t('lt.scr.top', { n: big(K.price * 10000) })));
        area.append(face);
        return play;
      }
      function deal() {
        if (busy) return;
        if (!wager(K.price, 'scratch')) return;
        const card = makeCard(id); ST.cards++; ST.spent += K.price; save();
        Sound.fx.cashReg();
        const play = paintCard(card);
        busy = true; buyBtn.disabled = true; allBtn.disabled = false;
        msg.textContent = t('lt.scr.rule.' + K.type, { n: K.win }); msg.className = 'lt-scr-msg';
        requestAnimationFrame(() => cover(play, () => reveal(card)));
        allBtn.onclick = () => { const cv = play.querySelector('canvas'); if (cv) cv.dispatchEvent(new Event('revealall')); };
      }
      function reveal(card) {
        busy = false; buyBtn.disabled = false; allBtn.disabled = true;
        buyBtn.textContent = t('lt.scr.again', { n: fmt(K.price) });
        ST.won += card.W; ST.best = Math.max(ST.best, card.W); save();
        area.querySelectorAll('.w').forEach(e => e.classList.add('lit'));
        if (card.W) { msg.textContent = t('lt.scr.win', { n: fmt(card.W) }); msg.className = 'lt-scr-msg win'; settle(card.W, K.price, msg); Sound.fx[card.W >= K.price * 20 ? 'fanfare' : 'win'](card.W >= K.price * 20 ? 2 : 1); if (card.W >= K.price * 20) FX.confetti(innerWidth / 2, innerHeight / 3, 90); }
        else { msg.textContent = t('lt.scr.lose') + ' ' + t('lt.scr.near'); msg.className = 'lt-scr-msg lose'; settle(0, K.price); Sound.fx.lose(); }
      }
    }
  };
  function ballsOf(g, L, D, r) {
    const G = GAMES[g];
    if (G.kind === 'pool') return h('span', { class: 'lt-row' }, ...L.a.map(x => h('i', { class: 'lt-b' + (D && D.a.includes(x) ? ' hit' : ''), style: `--c:${G.ca}` }, String(x).padStart(2, '0'))), ...L.b.map(x => h('i', { class: 'lt-b' + (D && D.b.includes(x) ? ' hit' : ''), style: `--c:${G.cb}` }, String(x).padStart(2, '0'))));
    if (G.kind === 'digits') return h('span', { class: 'lt-row' }, ...L.a.map((x, i) => h('i', { class: 'lt-b dg' + (D && (L.box ? D.a.includes(x) : D.a[i] === x) && r && r.win ? ' hit' : ''), style: `--c:${G.ca}` }, String(x))), h('small', null, t(L.box ? 'lt.box' : 'lt.straight')));
    return h('span', { class: 'lt-row' }, ...L.a.map(x => h('i', { class: 'lt-b sm' + (D && D.a.includes(x) ? ' hit' : ''), style: `--c:${G.ca}` }, String(x))));
  }
  function result(el, R, go, close) {
    const g = R.g, G = GAMES[g], { D, rs } = R.last;
    const list = h('div', { class: 'lt-results' }, R.lines.map((L, i) => h('div', { class: 'lt-line' + (rs[i].win ? ' won' : '') }, ballsOf(g, L, D, rs[i]),
      h('em', null, rs[i].win ? (G.kind === 'spots' ? t('lt.hitN', { n: rs[i].hit }) : G.kind === 'digits' ? t(rs[i].i === 0 ? 'lt.straight' : 'lt.box') : tierName(g, rs[i].i)) + (rs[i].split ? ' · ' + t('lt.split', { k: rs[i].split + 1 }) : '') + ' · ' + fmt(rs[i].win) : G.kind === 'pool' ? `${rs[i].ma}+${rs[i].mb}` : G.kind === 'spots' ? t('lt.hitN', { n: rs[i].hit }) : '—'))));
    const total = h('div', { class: 'lt-total' + (R.won ? ' win' : '') }, h('small', null, R.won ? t('lt.won') : t('lt.noWin')), h('strong', null, R.won ? '+' + fmt(R.won) : '-' + fmt(R.cost)));
    const roll = !G.jp0 || rs.some(r => r.i === 0) ? null : h('p', { class: 'lt-note' }, G.reg === 'cn' ? t('lt.others', { k: D.others, n: big(jp(g)) }) : D.other ? t('lt.elsewhere', { n: big(jp(g)) }) : t('lt.roll', { n: big(jp(g)) }));
    const taxed = R.tax ? h('p', { class: 'lt-note' }, t('lt.taxed', { n: fmt(R.tax) })) : null;
    el.append(...[total, list, roll, taxed].filter(Boolean),
      h('div', { class: 'lt-acts' },
        h('button', { class: 'btn btn-ghost btn-sm', onclick: () => go('game', g) }, t('lt.change')),
        h('button', { class: 'btn btn-ghost btn-sm', onclick: () => go('hall') }, t('lt.hall')),
        h('button', { class: 'btn btn-gold btn-sm', onclick: () => { const R2 = buy(g, R.lines, 1); if (R2) go('show', R2); } }, t('lt.again', { n: fmt(R.cost) }))));
    settle(R.won, R.cost, total);
    if (R.won >= G.price * 50) { Sound.fx.fanfare(2); FX.confetti(innerWidth / 2, innerHeight / 3, 90); } else if (R.won) Sound.fx.win(1); else Sound.fx.lose();
  }

  /* ---------------- the scratch layer ---------------- */
  function cover(host, done) {
    const r = host.getBoundingClientRect(), dpr = Math.min(2, window.devicePixelRatio || 1);
    const cv = h('canvas', { class: 'lt-foil', 'aria-label': t('lt.scr.hint') });
    cv.width = Math.max(1, r.width * dpr); cv.height = Math.max(1, r.height * dpr);
    host.append(cv);
    const g = cv.getContext('2d');
    g.scale(dpr, dpr);
    const grd = g.createLinearGradient(0, 0, r.width, r.height);
    grd.addColorStop(0, '#9aa0a6'); grd.addColorStop(0.35, '#e9ecef'); grd.addColorStop(0.5, '#b8bec4'); grd.addColorStop(0.8, '#f4f6f8'); grd.addColorStop(1, '#8f959b');
    g.fillStyle = grd; g.fillRect(0, 0, r.width, r.height);
    g.fillStyle = 'rgba(80, 86, 92, .35)'; g.font = `700 13px ${getComputedStyle(document.body).fontFamily}`; g.textAlign = 'center';
    const label = '★ ' + t('lt.scr.hint') + ' ★', step = g.measureText(label).width + 28;
    for (let y = 18, row = 0; y < r.height; y += 30, row++) for (let x = (row % 2) * step / 2; x < r.width + step; x += step) g.fillText(label, x, y);
    g.globalCompositeOperation = 'destination-out'; g.lineCap = 'round'; g.lineJoin = 'round'; g.lineWidth = 34;
    let last = null, moves = 0, over = false, tick = 0;
    const pt = e => { const b = cv.getBoundingClientRect(); return [e.clientX - b.left, e.clientY - b.top]; };
    const finish = () => { if (over) return; over = true; cv.classList.add('gone'); setTimeout(() => cv.remove(), 500); done(); };
    const check = () => { const d = g.getImageData(0, 0, cv.width, cv.height).data; let clear = 0, n = 0; for (let i = 3; i < d.length; i += 64) { n++; if (d[i] < 20) clear++; } if (clear / n > 0.55) finish(); };
    cv.addEventListener('pointerdown', e => { cv.setPointerCapture(e.pointerId); last = pt(e); g.beginPath(); g.arc(last[0], last[1], 17, 0, 7); g.fill(); });
    cv.addEventListener('pointermove', e => {
      if (!last || over) return;
      const p = pt(e); g.beginPath(); g.moveTo(last[0], last[1]); g.lineTo(p[0], p[1]); g.stroke(); last = p;
      const now = performance.now(); if (now - tick > 70) { tick = now; Sound.fx.wheelTick(); }
      if (++moves % 12 === 0) check();
    });
    const up = () => { last = null; if (!over) check(); };
    cv.addEventListener('pointerup', up); cv.addEventListener('pointercancel', up);
    cv.addEventListener('revealall', finish);
  }

  window.Lottery = {
    open, games: () => Object.keys(GAMES), cards: () => Object.keys(CARDS),
    rtp: (g, k) => GAMES[g] ? rtp(g, k || 5) : scrRtp, odds: g => topOdds(g), jackpot: g => jp(g),
    // for agents and tests: buy `lines` quick picks for `draws` draws and settle at once
    play(g, { lines = 1, draws = 1, k = 5 } = {}) {
      if (!GAMES[g]) return null;
      const R = buy(g, Array.from({ length: lines }, () => quick(g, k)), draws); if (!R) return null;
      settle(R.won, R.cost); return { cost: R.cost, won: R.won, hits: R.hits, draw: R.last.D };
    },
    scratch(id) { const K = CARDS[id]; if (!K || !wager(K.price, 'scratch')) return null; const c = makeCard(id); ST.cards++; ST.spent += K.price; ST.won += c.W; save(); settle(c.W, K.price); return { price: K.price, won: c.W }; },
    // the results board on the casino floor: the latest draw of the two big jackpots
    board: () => ['ssq', 'pb'].map(g => { if (!ST.last[g]) { const q = quick(g); ST.last[g] = [q.a, q.b]; } return [t('lt.g.' + g), ...ST.last[g]]; }),
    stats: () => Object.assign({}, ST)
  };
})();
