/* The casino floor. You are a gambler walking a gilded casino in 3/4 view: games are places
   (machine banks, tables, rooms), services are counters you walk up to, the floor is full of
   people who play, win, drink, chat and stare at you. Canvas world + HTML HUD.
   Exposed as window.Floor; the lobby view hosts it. Map is 72 x 56 tiles of 32px. */
(function () {
  const t = (k, v) => I18N.t(k, v);
  const T = 32, W = 72, H = 56, WH = 46, TAU = Math.PI * 2;
  const lines = k => t(k).split('|');

  /* ================= map ================= */
  const wall = new Uint8Array(W * H), solid = new Uint8Array(W * H);
  const id = (x, y) => y * W + x;
  const inb = (x, y) => x >= 0 && y >= 0 && x < W && y < H;
  const isWall = (x, y) => !inb(x, y) || wall[id(x, y)] === 1;
  const hwall = (y, x0, x1, gaps = []) => { for (let x = x0; x <= x1; x++) if (!gaps.some(([a, b]) => x >= a && x <= b)) wall[id(x, y)] = 1; };
  const vwall = (x, y0, y1, gaps = []) => { for (let y = y0; y <= y1; y++) if (!gaps.some(([a, b]) => y >= a && y <= b)) wall[id(x, y)] = 1; };
  const D17 = [[10, 13], [27, 29], [43, 45], [57, 59]];
  const D39 = [[6, 9], [31, 40], [48, 51], [57, 58], [65, 66]];
  hwall(0, 0, W - 1); hwall(H - 1, 0, W - 1); vwall(0, 0, H - 1); vwall(W - 1, 0, H - 1);
  hwall(17, 1, W - 2, D17); hwall(39, 1, W - 2, D39);
  vwall(24, 1, 16); vwall(47, 1, 16);
  vwall(16, 40, H - 2); vwall(28, 40, H - 2, [[46, 48]]); vwall(43, 40, H - 2, [[46, 48]]); vwall(56, 40, H - 2); vwall(64, 40, H - 2);
  const VIP_GATE = [57, 58, 59];

  const ZONES = [
    { id: 'cardroom', r: [1, 1, 24, 17], fl: 'red' }, { id: 'bar', r: [25, 1, 47, 17], fl: 'wood' }, { id: 'vip', r: [48, 1, 71, 17], fl: 'black' },
    { id: 'slots', r: [1, 18, 25, 39], fl: 'slots' }, { id: 'atrium', r: [25, 18, 47, 39], fl: 'cream' }, { id: 'pit', r: [47, 18, 71, 39], fl: 'pit' },
    { id: 'restaurant', r: [1, 40, 16, 55], fl: 'wood2' }, { id: 'lottery', r: [17, 40, 28, 55], fl: 'lotto' }, { id: 'entrance', r: [29, 40, 43, 55], fl: 'cream' },
    { id: 'cage', r: [44, 40, 56, 55], fl: 'black' }, { id: 'boutique', r: [57, 40, 64, 55], fl: 'white' }, { id: 'hotel', r: [65, 40, 71, 55], fl: 'beige' }
  ];
  const zoneAt = (tx, ty) => ZONES.find(z => tx >= z.r[0] && tx < z.r[2] && ty >= z.r[1] && ty < z.r[3]) || null;

  /* ---------- objects & spots ---------- */
  const OBJ = [], SPOTS = [];
  function obj(kind, x, y, w, h, o = {}) {
    const ob = Object.assign({ kind, x, y, w, h, solid: true, sh: 40, seed: Math.random() * 100 }, o);
    ob.base = (y + h) * T;
    OBJ.push(ob);
    if (ob.solid) for (let i = x; i < x + w; i++) for (let j = y; j < y + h; j++) solid[id(i, j)] = 1;
    return ob;
  }
  // a place you can walk up to and use: game, service or custom
  function spot(o) { const s = Object.assign({ face: 1, r: 1.25 }, o); s.x = s.ux * T; s.y = s.uy * T; SPOTS.push(s); return s; }

  const BANK = {
    caishen: { body: '#5a0c10', trim: '#f6c94e', top: '#c8283c', glyph: '财', scr: '#ff5a3c' },
    treasure: { body: '#2a0f3a', trim: '#f6c94e', top: '#7a3bd0', glyph: '宝', scr: '#c58cff' },
    slots: { body: '#0f1d3a', trim: '#9fd0ff', top: '#1f5fd0', glyph: '7', scr: '#5ab0ff' },
    classic: { body: '#2a2d34', trim: '#d8dce2', top: '#e8364f', glyph: 'BAR', scr: '#ffd56a' }
  };
  [['caishen', 3, 21], ['treasure', 14, 21], ['slots', 3, 27], ['classic', 14, 27], ['caishen', 3, 33], ['treasure', 14, 33]].forEach(([g, x0, y], bi) => {
    obj('bankSign', x0, y, 8, 1, { solid: false, game: g, base: (y + 1) * T + 2 });
    for (let i = 0; i < 8; i++) {
      const m = obj('slot', x0 + i, y, 1, 1, { game: g, sh: 76, spinT: -9, winT: -9, sym: [0, 1, 2].map(() => U.randInt(0, 5)) });
      obj('stool', x0 + i, y + 1, 1, 1, { solid: false, base: (y + 1) * T + 18 });
      m.spot = spot({ kind: 'game', game: g, ux: x0 + i + 0.5, uy: y + 1.55, obj: m, main: bi < 4 && i === 4 });
    }
  });
  const PIT = [['blackjack', 50, 21], ['baccarat', 57, 21], ['roulette', 64, 21], ['blackjack', 50, 29], ['baccarat', 57, 29], ['sicbo', 64, 29]];
  PIT.forEach(([g, x, y], i) => {
    const o = obj('t_' + g, x, y, 5, 2, { game: g, sh: 40 });
    o.spot = spot({ kind: 'game', game: g, ux: x + 2.5, uy: y + 2.6, obj: o, main: i < 3 || g === 'sicbo' });
  });
  const CARDT = [['zhajinhua', 3, 4], ['doudizhu', 10, 4], ['niuniu', 17, 4], ['mahjong', 6, 11], ['zhajinhua', 14, 11]];
  CARDT.forEach(([g, x, y], i) => {
    const o = obj(g === 'mahjong' ? 'mjtable' : 'cardtable', x, y, 3, 3, { game: g, sh: 30 });
    o.spot = spot({ kind: 'game', game: g, ux: x + 1.5, uy: y + 3.55, obj: o, main: i < 4 });
  });
  // atrium
  const fountain = obj('fountain', 33, 26, 6, 4, { sh: 100 });
  spot({ kind: 'svc', svc: 'fountain', ux: 36, uy: 30.7, obj: fountain, main: true });
  const wheel = obj('wheel', 27, 20, 2, 1, { sh: 96 });
  spot({ kind: 'fn', fn: 'wheel', ux: 28, uy: 21.6, obj: wheel, main: true });
  const crash = obj('crash', 42, 20, 3, 1, { game: 'crash', sh: 92 });
  spot({ kind: 'game', game: 'crash', ux: 43.5, uy: 21.6, obj: crash, main: true });
  const plinko = obj('plinko', 27, 34, 2, 1, { game: 'plinko', sh: 100 });
  spot({ kind: 'game', game: 'plinko', ux: 28, uy: 35.6, obj: plinko, main: true });
  [[24, 19], [24, 23], [24, 27], [24, 31], [24, 35], [47, 19], [47, 23], [47, 27], [47, 31], [47, 35]].forEach(([x, y]) => obj('pillar', x, y, 1, 1, { sh: 110 }));
  [[26, 37], [45, 37], [45, 19], [31, 19], [41, 19]].forEach(([x, y]) => obj('plant', x, y, 1, 1, { sh: 54 }));
  [[30, 32], [41, 32]].forEach(([x, y]) => obj('bench', x, y, 2, 1, { sh: 20 }));
  // bar & lounge
  const bar = obj('counter', 28, 4, 14, 1, { style: 'bar', sh: 44 });
  spot({ kind: 'svc', svc: 'bar', ux: 35.5, uy: 5.6, obj: bar, main: true });
  for (let x = 28; x < 42; x += 2) obj('stool', x, 5, 1, 1, { solid: false, base: 5 * T + 18 });
  [[27, 10], [27, 13], [33, 13]].forEach(([x, y]) => obj('sofa', x, y, 3, 1, { sh: 30 }));
  [[28, 11], [34, 11]].forEach(([x, y]) => obj('ctable', x, y, 1, 1, { sh: 18 }));
  const piano = obj('piano', 42, 9, 3, 2, { sh: 52 });
  spot({ kind: 'fn', fn: 'piano', ux: 43.5, uy: 11.6, obj: piano, main: true });
  [[25, 2], [46, 2], [25, 15], [46, 15]].forEach(([x, y]) => obj('plant', x, y, 1, 1, { sh: 54 }));
  // VIP
  const vipT = obj('viptable', 55, 6, 6, 3, { game: 'vip', sh: 36 });
  spot({ kind: 'game', game: 'vip', ux: 58, uy: 9.7, obj: vipT, main: true });
  obj('tank', 49, 12, 4, 1, { sh: 46 });
  [[65, 4], [65, 9]].forEach(([x, y]) => obj('sofa', x, y, 3, 1, { sh: 30, hue: 'gold' }));
  [[49, 2], [69, 2], [69, 15], [53, 15], [62, 15]].forEach(([x, y]) => obj('plant', x, y, 1, 1, { sh: 54 }));
  const rope = obj('rope', 57, 17, 3, 1, { solid: false, sh: 30, base: 18 * T - 1 });
  // restaurant
  const host = obj('stand', 11, 41, 1, 1, { sh: 36 });
  spot({ kind: 'svc', svc: 'restaurant', ux: 11.5, uy: 42.6, obj: host, main: true });
  obj('tank', 2, 41, 4, 1, { sh: 46, sea: true });
  const DINE = [[3, 45], [8, 45], [12, 45], [3, 50], [8, 50], [12, 50]];
  DINE.forEach(([x, y]) => obj('dine', x, y, 2, 1, { sh: 26 }));
  // lottery
  const lotto = obj('counter', 18, 43, 9, 1, { style: 'lotto', sh: 40 });
  spot({ kind: 'svc', svc: 'lottery', ux: 22.5, uy: 44.6, obj: lotto, main: true });
  const balls = obj('balls', 24, 49, 2, 1, { sh: 70 });
  spot({ kind: 'svc', svc: 'lottery', ux: 25, uy: 50.6, obj: balls });
  [[18, 50], [20, 50]].forEach(([x, y]) => { const k = obj('kiosk', x, y, 1, 1, { sh: 50 }); spot({ kind: 'svc', svc: 'scratch', ux: x + 0.5, uy: y + 1.6, obj: k, main: x === 18 }); });
  // entrance
  const desk = obj('counter', 30, 44, 3, 1, { style: 'desk', sh: 40 });
  spot({ kind: 'svc', svc: 'concierge', ux: 31.5, uy: 45.6, obj: desk, main: true });
  const atm = obj('atm', 41, 44, 1, 1, { sh: 54 });
  spot({ kind: 'svc', svc: 'atm', ux: 41.5, uy: 45.6, obj: atm, main: true });
  obj('lion', 32, 51, 1, 1, { sh: 58 }); obj('lion', 39, 51, 1, 1, { sh: 58, flip: true });
  [[29, 41], [42, 41], [29, 53], [42, 53]].forEach(([x, y]) => obj('plant', x, y, 1, 1, { sh: 54 }));
  const exitSpot = spot({ kind: 'svc', svc: 'exit', ux: 35.5, uy: 54.25, obj: null, main: true, face: 0, r: 1.6 });
  // cage & players club
  const cage = obj('counter', 45, 43, 5, 1, { style: 'cage', sh: 72 });
  spot({ kind: 'svc', svc: 'cage', ux: 47.5, uy: 44.6, obj: cage, main: true });
  const club = obj('counter', 51, 43, 4, 1, { style: 'club', sh: 44 });
  spot({ kind: 'svc', svc: 'club', ux: 53, uy: 44.6, obj: club, main: true });
  [[45, 49], [52, 49]].forEach(([x, y]) => obj('sofa', x, y, 3, 1, { sh: 30 }));
  // boutique
  [[58, 43], [61, 43]].forEach(([x, y]) => obj('case', x, y, 2, 1, { sh: 40 }));
  obj('mannequin', 62, 48, 1, 1, { sh: 56 });
  const shop = obj('counter', 58, 51, 4, 1, { style: 'glass', sh: 40 });
  spot({ kind: 'svc', svc: 'shop', ux: 60, uy: 52.6, obj: shop, main: true });
  // hotel
  const front = obj('counter', 66, 44, 4, 1, { style: 'desk', sh: 40 });
  spot({ kind: 'svc', svc: 'hotel', ux: 68, uy: 45.6, obj: front, main: true });
  obj('cart', 65, 50, 1, 1, { sh: 50 });
  obj('plant', 70, 53, 1, 1, { sh: 54 });

  /* wall decor on the visible (south) faces of rows 0, 17, 39: [row, x0, x1, kind, arg] */
  const DECOR = [
    [0, 2, 7, 'lanterns'], [0, 9, 15, 'sign', 'cardroom'], [0, 17, 22, 'lanterns'],
    [0, 26, 34, 'bottles'], [0, 35, 39, 'sign', 'bar'], [0, 40, 46, 'bottles'],
    [0, 49, 53, 'sign', 'vip'], [0, 55, 61, 'dragon'], [0, 63, 69, 'fu'],
    [17, 2, 9, 'sign', 'slots'], [17, 14, 22, 'marquee', 'slots'], [17, 31, 41, 'jackpot'], [17, 49, 55, 'sign', 'pit'], [17, 61, 69, 'marquee', 'pit'],
    [39, 1, 5, 'sign', 'restaurant'], [39, 10, 15, 'menu'], [39, 17, 27, 'results'], [39, 44, 47, 'sign', 'cage'], [39, 52, 55, 'sign', 'club'],
    [39, 59, 63, 'sign', 'boutique'], [39, 67, 70, 'sign', 'hotel']
  ];
  const PLAQUES = [[17, 10, 13, 'cardroom'], [17, 27, 29, 'bar'], [17, 43, 45, 'bar'], [17, 57, 59, 'vip'], [39, 6, 9, 'restaurant'], [39, 31, 40, 'entrance'], [39, 48, 51, 'cage'], [39, 57, 58, 'boutique'], [39, 65, 66, 'hotel']];
  const LIGHTS = [[12, 8, 1.2], [36, 9, 1.1], [58, 8, 1.5], [8, 25, 1], [18, 31, 1], [8, 36, 0.8], [36, 22, 1.2], [36, 35, 1.1], [55, 25, 1], [63, 33, 1], [8, 47, 1], [22, 47, 0.9], [36, 47, 1.3], [50, 47, 0.9], [60, 47, 0.8], [68, 47, 0.8]];
  const SCONCE = [];
  [[0, 1, W - 2], [17, 1, W - 2], [39, 1, W - 2]].forEach(([row, a, b]) => {
    for (let x = a + 1; x < b; x += 3) {
      if (!wall[id(x, row)] || DECOR.some(d => d[0] === row && x >= d[1] - 1 && x <= d[2] + 1)) continue;
      if (row < H - 1 && wall[id(x, row + 1)]) continue;
      SCONCE.push([x, row]);
    }
  });

  /* ================= pathfinding ================= */
  let gateOpen = false;
  const walkable = (x, y) => inb(x, y) && !wall[id(x, y)] && !solid[id(x, y)] && !(y === 17 && !gateOpen && VIP_GATE.includes(x));
  function astar(sx, sy, tx, ty) {
    if (!walkable(tx, ty)) return null;
    const N = W * H, g = new Float32Array(N).fill(1e9), from = new Int32Array(N).fill(-1), closed = new Uint8Array(N), heap = [];
    const push = (f, i) => { heap.push([f, i]); let k = heap.length - 1; while (k) { const p = (k - 1) >> 1; if (heap[p][0] <= heap[k][0]) break; [heap[p], heap[k]] = [heap[k], heap[p]]; k = p; } };
    const pop = () => {
      const top = heap[0], last = heap.pop();
      if (heap.length) { heap[0] = last; let k = 0; for (;;) { const l = 2 * k + 1, r = l + 1; let m = k; if (l < heap.length && heap[l][0] < heap[m][0]) m = l; if (r < heap.length && heap[r][0] < heap[m][0]) m = r; if (m === k) break; [heap[m], heap[k]] = [heap[k], heap[m]]; k = m; } }
      return top;
    };
    const hf = (x, y) => { const dx = Math.abs(x - tx), dy = Math.abs(y - ty); return dx + dy + (Math.SQRT2 - 2) * Math.min(dx, dy); };
    const s = id(sx, sy); g[s] = 0; push(hf(sx, sy), s);
    while (heap.length) {
      const i = pop()[1]; if (closed[i]) continue; closed[i] = 1;
      const x = i % W, y = (i / W) | 0;
      if (x === tx && y === ty) { const out = []; for (let k = i; k !== -1; k = from[k]) out.push([k % W, (k / W) | 0]); return out.reverse(); }
      for (let dx = -1; dx <= 1; dx++) for (let dy = -1; dy <= 1; dy++) {
        if (!dx && !dy) continue;
        const nx = x + dx, ny = y + dy;
        if (!walkable(nx, ny) || (dx && dy && (!walkable(x + dx, y) || !walkable(x, y + dy)))) continue;
        const ni = id(nx, ny), ng = g[i] + (dx && dy ? Math.SQRT2 : 1);
        if (ng < g[ni]) { g[ni] = ng; from[ni] = i; push(ng + hf(nx, ny), ni); }
      }
    }
    return null;
  }
  function los(ax, ay, bx, by, r = 0.3) {
    const n = Math.ceil(Math.hypot(bx - ax, by - ay) / 0.2);
    for (let k = 1; k <= n; k++) {
      const x = ax + (bx - ax) * k / n, y = ay + (by - ay) * k / n;
      if (!walkable(Math.floor(x - r), Math.floor(y - r)) || !walkable(Math.floor(x + r), Math.floor(y - r)) || !walkable(Math.floor(x - r), Math.floor(y + r)) || !walkable(Math.floor(x + r), Math.floor(y + r))) return false;
    }
    return true;
  }
  function nearestWalkable(x, y) {
    for (let r = 1; r < 8; r++) {
      let best = null, bd = 1e9;
      for (let dx = -r; dx <= r; dx++) for (let dy = -r; dy <= r; dy++) {
        if (Math.max(Math.abs(dx), Math.abs(dy)) !== r || !walkable(x + dx, y + dy)) continue;
        const d = dx * dx + dy * dy; if (d < bd) { bd = d; best = [x + dx, y + dy]; }
      }
      if (best) return best;
    }
    return null;
  }
  // plan a smoothed route for actor `a` to the tile-space point (tx, ty)
  function route(a, tx, ty) {
    let sx = Math.floor(a.x / T), sy = Math.floor(a.y / T);
    if (!walkable(sx, sy)) { const n = nearestWalkable(sx, sy); if (n) [sx, sy] = n; }
    let gx = Math.floor(tx), gy = Math.floor(ty);
    if (!walkable(gx, gy)) { const n = nearestWalkable(gx, gy); if (!n) return false; [gx, gy] = n; tx = gx + 0.5; ty = gy + 0.5; }
    const p = astar(sx, sy, gx, gy); if (!p) return false;
    const pts = p.map(([x, y]) => [x + 0.5, y + 0.5]);
    pts[0] = [a.x / T, a.y / T]; pts[pts.length - 1] = [tx, ty];
    const out = []; let i = 0;
    while (i < pts.length - 1) { let j = pts.length - 1; while (j > i + 1 && !los(pts[i][0], pts[i][1], pts[j][0], pts[j][1])) j--; out.push(pts[j]); i = j; }
    a.path = out.map(([x, y]) => ({ x: x * T, y: y * T }));
    return true;
  }

  /* ================= people ================= */
  const SKIN = ['#f1c9a5', '#e8b88f', '#d9a27a', '#c68863', '#9a6545', '#f5d6bf'];
  const HAIR = ['#14100c', '#1f1610', '#2b1d14', '#4a2f1d', '#6b4a2a', '#9a9a9a', '#c8c8c8', '#3a2418'];
  const TOPS = ['#1f3a5f', '#5a1a1a', '#2a2a2a', '#e8e2d4', '#3f5a3a', '#6a4a8a', '#8a5a2a', '#14110f', '#b83a3a', '#2a4a6a', '#c8a050', '#4a4a52'];
  const BOTS = ['#1a1410', '#22262e', '#3a3226', '#14110f', '#2a2a3a', '#4a3a2a'];
  const pk = a => a[Math.floor(Math.random() * a.length)];
  function randLook(fem = Math.random() < 0.42) {
    const L = { skin: pk(SKIN), hair: pk(HAIR), top: pk(TOPS), bot: pk(BOTS), fem };
    if (fem) { L.hs = pk([1, 1, 2, 0]); L.dress = Math.random() < 0.45; if (L.dress) L.top = pk(['#8a1a2a', '#1a2a5a', '#14110f', '#6a2a6a', '#c8a050', '#1f5a4a']); }
    else { L.hs = pk([0, 0, 0, 3, 4, 5, 6]); if (Math.random() < 0.2) L.chain = 1; if (Math.random() < 0.25) L.tie = pk(['#c8283c', '#1f3a8a', '#d9a441']); }
    if (L.hair === '#9a9a9a' || L.hair === '#c8c8c8') L.glasses = Math.random() < 0.6 ? 1 : 0;
    else if (Math.random() < 0.12) L.glasses = 1;
    if (L.hs === 6) L.cap = pk(['#c8283c', '#1f3a8a', '#14110f']);
    return L;
  }
  const STAFF = {
    dealer: () => ({ skin: pk(SKIN), hair: pk(HAIR.slice(0, 5)), hs: pk([0, 2, 4]), top: '#f4f1ea', vest: '#16110f', bow: '#c8283c', bot: '#16110f' }),
    waitress: () => ({ skin: pk(SKIN), hair: '#14100c', hs: 2, top: '#b8132c', dress: 1, fem: 1, trim: '#f6c94e', tray: 1 }),
    guard: () => ({ skin: pk(SKIN), hair: '#14100c', hs: 3, top: '#0c0b0a', bot: '#0c0b0a', tie: '#0c0b0a', glasses: 2, ear: 1 }),
    bartender: () => ({ skin: pk(SKIN), hair: '#2b1d14', hs: 4, top: '#f4f1ea', vest: '#3a1a0a', bow: '#14110f', bot: '#14110f' }),
    cashier: () => ({ skin: pk(SKIN), hair: '#14100c', hs: 2, top: '#0c4a39', trim: '#f6c94e', bot: '#0c2b21', fem: 1 }),
    clerk: () => ({ skin: pk(SKIN), hair: pk(HAIR.slice(0, 4)), hs: pk([0, 2]), top: '#1a2340', tie: '#d9a441', bot: '#1a2340' }),
    chef: () => ({ skin: pk(SKIN), hair: '#14100c', hs: 0, top: '#f8f6f0', bot: '#22262e', chef: 1 }),
    doorman: () => ({ skin: pk(SKIN), hair: '#14100c', hs: 0, top: '#7a0f1c', trim: '#f6c94e', bot: '#14110f', cap: '#7a0f1c', capTrim: 1 }),
    pianist: () => ({ skin: pk(SKIN), hair: '#14100c', hs: 4, top: '#0c0b0a', bow: '#f4f1ea', bot: '#0c0b0a' })
  };
  const PLOOK = {
    hao: { skin: '#e0ac85', hair: '#14100c', hs: 0, top: '#c8283c', bot: '#14110f', chain: 1 },
    ling: { skin: '#f1c9a5', hair: '#120d0a', hs: 2, top: '#1f5fa8', dress: 1, fem: 1, trim: '#f6c94e' },
    oldk: { skin: '#d9a27a', hair: '#c8c8c8', hs: 0, top: '#7a6a4a', bot: '#3a3226', glasses: 1 },
    mei: { skin: '#f5d6bf', hair: '#2b1d14', hs: 1, top: '#f39bd0', dress: 1, fem: 1 },
    ace: { skin: '#e8b88f', hair: '#0c0a08', hs: 4, top: '#14110f', bot: '#14110f', tie: '#f6c94e', glasses: 2 },
    fei: { skin: '#c68863', hair: '#14100c', hs: 3, top: '#6a3fb0', bot: '#14110f' }
  };

  const ACT = [];
  function actor(o) {
    const a = Object.assign({ x: 0, y: 0, dir: 0, wp: 0, moving: false, path: null, speed: 2.2, seed: Math.random() * 99, next: 0, look: randLook() }, o);
    a.x = (o.tx || 0) * T; a.y = (o.ty || 0) * T;
    ACT.push(a); return a;
  }
  const you = actor({ kind: 'you', you: true, tx: 35.5, ty: 46, dir: 1, speed: 4.6, look: Object.assign({ skin: '#e8b88f', hair: '#14100c', hs: 0, top: '#1f3a5f', bot: '#22262e' }, LS.get('look', {})) });

  // the regulars: personas at the card room and the VIP salon
  const SEATS = (x, y, w, h) => ({ N: [x + w / 2, y - 0.25, 0], S: [x + w / 2, y + h + 0.45, 1], W: [x - 0.4, y + h / 2 + 0.3, 3], E: [x + w + 0.4, y + h / 2 + 0.3, 2] });
  function seat(tx, ty, dir, o = {}) { return actor(Object.assign({ kind: 'seated', tx, ty, dir, seated: true }, o)); }
  [['hao', 0, 'N'], ['ling', 0, 'W'], [null, 0, 'E'], ['oldk', 1, 'N'], [null, 1, 'E'], ['fei', 2, 'W'], [null, 2, 'N'], ['mei', 3, 'N'], [null, 3, 'W'], [null, 3, 'E'], [null, 4, 'N'], [null, 4, 'E']].forEach(([p, ti, side]) => {
    const [g, x, y] = CARDT[ti], s = SEATS(x, y, 3, 3)[side];
    seat(s[0], s[1], s[2], p ? { persona: p, look: PLOOK[p], game: g, talk: 'persona' } : { game: g, talk: 'card' });
  });
  const ace = seat(58, 5.75, 0, { persona: 'ace', look: PLOOK.ace, game: 'vip', talk: 'persona' });
  seat(54.6, 7.8, 3, { talk: 'vipguest', look: Object.assign(randLook(false), { top: '#14110f', bot: '#14110f', chain: 1 }) });
  [[55.2, 4.3], [60.8, 4.3]].forEach(([x, y]) => actor({ kind: 'staff', tx: x, ty: y, dir: 0, look: STAFF.guard(), talk: 'bodyguard' }));
  const guard = actor({ kind: 'staff', role: 'guard', tx: 56.2, ty: 16.3, dir: 0, look: STAFF.guard(), talk: 'guard' });
  // pit: dealers behind, players in front
  PIT.forEach(([g, x, y]) => {
    actor({ kind: 'staff', role: 'dealer', game: g, tx: x + 2.5, ty: y - 0.15, dir: 0, look: STAFF.dealer(), talk: 'dealer' });
    [[x + 0.7, y + 2.25], [x + 4.3, y + 2.25], [x + 1.4, y + 2.75], [x + 3.6, y + 2.75]].forEach(([sx, sy]) => { if (Math.random() < 0.6) seat(sx, sy, 1, { game: g, talk: 'table' }); });
  });
  // machines: most stools are taken
  OBJ.filter(o => o.kind === 'slot').forEach(m => {
    if (Math.random() < 0.55) { const a = seat(m.x + 0.5, m.y + 1.42, 1, { game: m.game, machine: m, talk: 'slot', next: Math.random() * 4 }); m.spot.busy = a; }
  });
  // bar, restaurant, services
  const bartender = actor({ kind: 'staff', role: 'bartender', tx: 35.5, ty: 3.5, dir: 0, look: STAFF.bartender(), talk: 'bartender', patrol: [30, 40] });
  [29, 33, 39].forEach(x => seat(x + 0.5, 5.42, 1, { talk: 'bar' }));
  seat(43.5, 11.3, 1, { look: STAFF.pianist(), talk: 'pianist', pianist: true });
  [[28.3, 10.4, 0], [30.2, 13.4, 0], [34.6, 13.4, 0]].forEach(([x, y, d]) => seat(x, y, d, { talk: 'bar', sofa: true }));
  actor({ kind: 'staff', role: 'host', tx: 11.5, ty: 40.6, dir: 0, look: Object.assign(STAFF.cashier(), { top: '#7a0f1c' }), talk: 'host' });
  actor({ kind: 'staff', tx: 4, ty: 40.6, dir: 0, look: STAFF.chef(), talk: 'chef' });
  DINE.forEach(([x, y]) => { if (Math.random() < 0.75) { seat(x + 0.6, y - 0.15, 0, { talk: 'din' }); if (Math.random() < 0.7) seat(x + 1.4, y + 1.3, 1, { talk: 'din' }); } });
  actor({ kind: 'staff', role: 'clerk', tx: 22.5, ty: 42.5, dir: 0, look: Object.assign(STAFF.clerk(), { top: '#9a1a1a' }), talk: 'lotto' });
  [[19.6, 46.2, 1], [25.4, 47.5, 2]].forEach(([x, y, d]) => actor({ kind: 'idle', tx: x, ty: y, dir: d, talk: 'lottoguy' }));
  actor({ kind: 'staff', tx: 31.5, ty: 43.5, dir: 0, look: STAFF.clerk(), talk: 'concierge' });
  [[33.2, 54.3], [37.8, 54.3]].forEach(([x, y]) => actor({ kind: 'staff', role: 'doorman', tx: x, ty: y, dir: 1, look: STAFF.doorman(), talk: 'doorman' }));
  actor({ kind: 'staff', role: 'cashier', tx: 47.5, ty: 42.5, dir: 0, look: STAFF.cashier(), talk: 'cashier' });
  actor({ kind: 'staff', tx: 53, ty: 42.5, dir: 0, look: Object.assign(STAFF.cashier(), { top: '#14110f' }), talk: 'club' });
  actor({ kind: 'staff', tx: 60, ty: 50.5, dir: 0, look: { skin: pk(SKIN), hair: '#14100c', hs: 1, top: '#14110f', dress: 1, fem: 1, chain: 1 }, talk: 'shop' });
  actor({ kind: 'staff', tx: 68, ty: 43.5, dir: 0, look: STAFF.clerk(), talk: 'hotel' });
  actor({ kind: 'idle', tx: 66.2, ty: 50.8, dir: 3, look: STAFF.doorman(), talk: 'bell' });
  // the crowd
  const WANDER_Z = ['slots', 'atrium', 'pit', 'entrance', 'atrium', 'pit', 'slots', 'bar', 'cardroom'];
  for (let i = 0; i < 18; i++) {
    const z = ZONES.find(q => q.id === WANDER_Z[i % WANDER_Z.length]);
    const p = randomTileIn(z);
    if (p) actor({ kind: 'wander', tx: p[0] + 0.5, ty: p[1] + 0.5, speed: U.rand(1.5, 2.4), talk: 'walk', next: Math.random() * 3 });
  }
  const waitresses = [actor({ kind: 'waitress', tx: 34, ty: 7, speed: 2.4, look: STAFF.waitress(), talk: 'waitress' }), actor({ kind: 'waitress', tx: 12, ty: 30, speed: 2.4, look: STAFF.waitress(), talk: 'waitress' })];
  actor({ kind: 'wander', role: 'pitboss', tx: 59, ty: 26, speed: 1.4, look: Object.assign(STAFF.clerk(), { top: '#14110f', tie: '#c8283c' }), talk: 'pitboss', zone: 'pit' });

  function randomTileIn(z, tries = 40) {
    for (let k = 0; k < tries; k++) {
      const x = U.randInt(z.r[0], z.r[2] - 1), y = U.randInt(z.r[1], z.r[3] - 1);
      if (walkable(x, y) && !SPOTS.some(s => Math.abs(s.ux - x - 0.5) < 1 && Math.abs(s.uy - y - 0.5) < 1)) return [x, y];
    }
    return null;
  }

  /* ================= drawing helpers ================= */
  let cv, g, mini, mg, wrap, dpr = 1, vw = 0, vh = 0;
  const cam = { x: you.x, y: you.y, z: 1, zt: 1, base: 1 };
  function rr(x, y, w, h, r) { g.beginPath(); g.roundRect ? g.roundRect(x, y, w, h, r) : g.rect(x, y, w, h); }
  function ell(x, y, rx, ry, fill) { g.beginPath(); g.ellipse(x, y, Math.max(0.1, rx), Math.max(0.1, ry), 0, 0, TAU); if (fill) { g.fillStyle = fill; g.fill(); } }
  function lg(x0, y0, x1, y1, stops) { const q = g.createLinearGradient(x0, y0, x1, y1); stops.forEach(([o, c]) => q.addColorStop(o, c)); return q; }
  const FONT = '"PingFang SC","Microsoft YaHei","Noto Sans SC",sans-serif';
  function seeded(s) { return () => { s |= 0; s = (s + 0x6D2B79F5) | 0; let q = Math.imul(s ^ (s >>> 15), 1 | s); q = (q + Math.imul(q ^ (q >>> 7), 61 | q)) ^ q; return ((q ^ (q >>> 14)) >>> 0) / 4294967296; }; }

  /* floor patterns, made once at 2x and drawn in world space */
  const PAT = {};
  function makePatterns() {
    const mk = (s, fn) => {
      const c = document.createElement('canvas'); c.width = c.height = s * 2;
      const q = c.getContext('2d'); q.scale(2, 2); fn(q, s, seeded(s * 7 + 3));
      const p = g.createPattern(c, 'repeat'); if (p.setTransform) p.setTransform(new DOMMatrix([0.5, 0, 0, 0.5, 0, 0])); return p;
    };
    const wrapDraw = (s, f) => { for (const ox of [-s, 0, s]) for (const oy of [-s, 0, s]) f(ox, oy); };
    PAT.red = mk(48, (q, s) => {
      q.fillStyle = '#4a0b12'; q.fillRect(0, 0, s, s);
      q.strokeStyle = 'rgba(232,176,72,.32)'; q.lineWidth = 1.2; q.strokeRect(3.5, 3.5, s - 7, s - 7);
      q.strokeStyle = 'rgba(232,176,72,.18)'; q.strokeRect(9.5, 9.5, s - 19, s - 19);
      q.fillStyle = 'rgba(246,201,78,.45)'; q.beginPath(); q.arc(s / 2, s / 2, 3, 0, TAU); q.fill();
      q.strokeStyle = 'rgba(246,201,78,.3)'; q.beginPath(); q.arc(s / 2, s / 2, 7, 0, TAU); q.stroke();
      q.fillStyle = 'rgba(0,0,0,.2)'; q.fillRect(0, 0, s, 1);
    });
    PAT.slots = mk(64, (q, s, r) => {
      q.fillStyle = '#170a33'; q.fillRect(0, 0, s, s);
      const cols = ['rgba(246,201,78,.5)', 'rgba(200,40,60,.55)', 'rgba(53,212,154,.35)', 'rgba(111,183,255,.35)'];
      for (let i = 0; i < 9; i++) {
        const x = r() * s, y = r() * s, rad = 3 + r() * 9, c = cols[i % 4], a0 = r() * TAU;
        wrapDraw(s, (ox, oy) => { q.strokeStyle = c; q.lineWidth = 1.6; q.beginPath(); q.arc(x + ox, y + oy, rad, a0, a0 + 3.6); q.stroke(); });
      }
      for (let i = 0; i < 14; i++) { const x = r() * s, y = r() * s; q.fillStyle = cols[i % 4]; q.fillRect(x, y, 1.6, 1.6); }
    });
    PAT.wood = mk(64, (q, s, r) => {
      for (let row = 0; row < 4; row++) {
        const off = (row % 2) * 24;
        for (let k = -1; k < 3; k++) {
          const x = k * 32 + off, c = ['#3a2212', '#42281a', '#34200f', '#3e2516'][(row + k + 4) % 4];
          q.fillStyle = c; q.fillRect(x, row * 16, 32, 16);
          q.fillStyle = 'rgba(0,0,0,.35)'; q.fillRect(x, row * 16, 1, 16);
          q.strokeStyle = 'rgba(255,220,160,.05)'; q.beginPath(); q.moveTo(x + 2, row * 16 + 5 + r() * 6); q.lineTo(x + 30, row * 16 + 5 + r() * 6); q.stroke();
        }
        q.fillStyle = 'rgba(0,0,0,.4)'; q.fillRect(0, row * 16, s, 1);
      }
    });
    PAT.wood2 = mk(64, (q, s) => {
      for (let row = 0; row < 4; row++) for (let k = -1; k < 3; k++) {
        const x = k * 32 + (row % 2) * 16; q.fillStyle = ['#2a120c', '#33170f', '#2e140d'][(row + k + 3) % 3]; q.fillRect(x, row * 16, 32, 16);
        q.fillStyle = 'rgba(0,0,0,.4)'; q.fillRect(x, row * 16, 1, 16); q.fillRect(0, row * 16, s, 0.8);
      }
    });
    PAT.black = mk(128, (q, s, r) => {
      q.fillStyle = '#0f0d0c'; q.fillRect(0, 0, s, s);
      q.fillStyle = 'rgba(255,255,255,.025)'; q.fillRect(0, 0, s / 2, s / 2); q.fillRect(s / 2, s / 2, s / 2, s / 2);
      for (let i = 0; i < 6; i++) {
        const x0 = r() * s, y0 = r() * s, x1 = x0 + (r() - 0.5) * 120, y1 = y0 + (r() - 0.5) * 120;
        const c = i % 3 ? 'rgba(255,255,255,.07)' : 'rgba(217,164,65,.22)';
        wrapDraw(s, (ox, oy) => { q.strokeStyle = c; q.lineWidth = 0.8; q.beginPath(); q.moveTo(x0 + ox, y0 + oy); q.quadraticCurveTo(x0 + ox + 30, y1 + oy - 20, x1 + ox, y1 + oy); q.stroke(); });
      }
      q.strokeStyle = 'rgba(217,164,65,.22)'; q.lineWidth = 1; q.strokeRect(0.5, 0.5, s / 2, s / 2); q.strokeRect(s / 2 + 0.5, s / 2 + 0.5, s / 2, s / 2);
    });
    PAT.cream = mk(64, (q, s, r) => {
      q.fillStyle = '#b39c74'; q.fillRect(0, 0, s, s);
      q.fillStyle = '#a28a62'; q.fillRect(0, 0, s / 2, s / 2); q.fillRect(s / 2, s / 2, s / 2, s / 2);
      for (let i = 0; i < 4; i++) { const x = r() * s, y = r() * s; wrapDraw(s, (ox, oy) => { q.strokeStyle = 'rgba(255,255,255,.12)'; q.lineWidth = 0.6; q.beginPath(); q.moveTo(x + ox, y + oy); q.quadraticCurveTo(x + ox + 12, y + oy + 6, x + ox + 26, y + oy - 4); q.stroke(); }); }
      q.strokeStyle = 'rgba(232,192,106,.55)'; q.lineWidth = 0.8; q.strokeRect(0.4, 0.4, s / 2, s / 2); q.strokeRect(s / 2 + 0.4, s / 2 + 0.4, s / 2, s / 2);
      q.fillStyle = 'rgba(246,201,78,.7)'; q.save(); q.translate(s / 2, s / 2); q.rotate(Math.PI / 4); q.fillRect(-2.5, -2.5, 5, 5); q.restore();
    });
    PAT.pit = mk(48, (q, s) => {
      q.fillStyle = '#0a2a22'; q.fillRect(0, 0, s, s);
      q.strokeStyle = 'rgba(217,164,65,.3)'; q.lineWidth = 1; q.beginPath();
      q.moveTo(0, s / 2); q.lineTo(s / 2, 0); q.lineTo(s, s / 2); q.lineTo(s / 2, s); q.closePath(); q.stroke();
      q.fillStyle = 'rgba(200,40,60,.6)'; [[0, s / 2], [s / 2, 0], [s, s / 2], [s / 2, s]].forEach(([x, y]) => { q.beginPath(); q.arc(x, y, 2, 0, TAU); q.fill(); });
      q.fillStyle = 'rgba(246,201,78,.35)'; q.beginPath(); q.arc(s / 2, s / 2, 4, 0, TAU); q.fill();
    });
    PAT.lotto = mk(32, (q, s) => {
      q.fillStyle = '#5e0d14'; q.fillRect(0, 0, s, s); q.fillStyle = '#6e1519'; q.fillRect(0, 0, s / 2, s / 2); q.fillRect(s / 2, s / 2, s / 2, s / 2);
      q.fillStyle = 'rgba(246,201,78,.55)'; q.beginPath(); q.arc(s / 2, s / 2, 1.5, 0, TAU); q.fill();
    });
    PAT.white = mk(64, (q, s) => {
      q.fillStyle = '#c9c1b2'; q.fillRect(0, 0, s, s); q.fillStyle = '#bfb6a6'; q.fillRect(0, 0, s / 2, s / 2); q.fillRect(s / 2, s / 2, s / 2, s / 2);
      q.strokeStyle = 'rgba(160,130,80,.5)'; q.strokeRect(0.5, 0.5, s / 2, s / 2); q.strokeRect(s / 2 + 0.5, s / 2 + 0.5, s / 2, s / 2);
    });
    PAT.beige = mk(32, (q, s) => {
      q.fillStyle = '#4e3a28'; q.fillRect(0, 0, s, s); q.strokeStyle = 'rgba(232,192,106,.18)'; q.beginPath();
      q.moveTo(0, s / 2); q.lineTo(s / 2, 0); q.lineTo(s, s / 2); q.lineTo(s / 2, s); q.closePath(); q.stroke();
    });
  }

  /* cached glow sprites, additive */
  const GLOW = {};
  function glow(color) {
    if (GLOW[color]) return GLOW[color];
    const c = document.createElement('canvas'); c.width = c.height = 128;
    const q = c.getContext('2d'), gr = q.createRadialGradient(64, 64, 0, 64, 64, 64);
    gr.addColorStop(0, color); gr.addColorStop(0.35, color.replace(/[\d.]+\)$/, m => (parseFloat(m) * 0.4) + ')')); gr.addColorStop(1, 'rgba(0,0,0,0)');
    q.fillStyle = gr; q.fillRect(0, 0, 128, 128);
    return (GLOW[color] = c);
  }
  const lamp = (x, y, r, color) => g.drawImage(glow(color), x - r, y - r, r * 2, r * 2);

  /* ================= characters ================= */
  function drawChar(a, tm) {
    const L = a.look, sit = a.seated, mv = a.moving, ph = a.wp, d = a.dir;
    const x = a.x + (a.ox || 0), y = a.y;
    const bob = mv ? Math.abs(Math.sin(ph)) * 1.6 : Math.sin(tm * 2.1 + a.seed) * 0.35;
    const cheer = a.cheerT && tm - a.cheerT < 1.4;
    g.globalAlpha = a.alpha == null ? 1 : a.alpha;
    ell(x, y + (sit ? -2 : 0), 9, 3.6, 'rgba(0,0,0,.32)');
    if (a.you) {
      g.strokeStyle = `rgba(246,201,78,${0.55 + Math.sin(tm * 4) * 0.25})`; g.lineWidth = 1.4;
      ell(x, y, 12, 4.8); g.stroke();
    }
    const top = sit ? y - 20 : y - 26;
    const hy = top - 7.5 - bob;
    // legs
    if (!sit) {
      const sw = mv ? Math.sin(ph) : 0;
      g.fillStyle = L.dress ? L.skin : L.bot;
      if (d < 2) {
        const l1 = Math.max(0, sw) * 2.6, l2 = Math.max(0, -sw) * 2.6;
        g.fillRect(x - 4.4, y - 12 - bob, 3.8, 11 - l1); g.fillRect(x + 0.6, y - 12 - bob, 3.8, 11 - l2);
        g.fillStyle = '#0c0907'; g.fillRect(x - 4.6, y - 2.6 - l1 - bob, 4.2, 2.4); g.fillRect(x + 0.4, y - 2.6 - l2 - bob, 4.2, 2.4);
      } else {
        g.fillRect(x - 2 + sw * 2.8, y - 12 - bob, 3.8, 11); g.fillRect(x - 2 - sw * 2.8, y - 12 - bob, 3.8, 11);
        g.fillStyle = '#0c0907'; const f = d === 3 ? 1 : -1;
        g.fillRect(x - 2 + sw * 2.8 + (f > 0 ? 0 : -1), y - 2.6 - bob, 4.8, 2.4); g.fillRect(x - 2 - sw * 2.8 + (f > 0 ? 0 : -1), y - 2.6 - bob, 4.8, 2.4);
      }
    }
    // torso
    const ty = top - bob;
    g.fillStyle = L.top;
    if (L.dress && !sit) { g.beginPath(); g.moveTo(x - 6.5, ty); g.lineTo(x + 6.5, ty); g.lineTo(x + 8, y - 6 - bob); g.lineTo(x - 8, y - 6 - bob); g.closePath(); g.fill(); }
    rr(x - 7, ty, 14, sit ? 13 : 15, 4); g.fill();
    if (L.trim) { g.fillStyle = L.trim; g.fillRect(x - 7, ty + (sit ? 11 : 13), 14, 1.4); if (d === 0) g.fillRect(x - 0.6, ty, 1.2, 6); }
    if (L.vest && d !== 1) { g.fillStyle = L.vest; g.fillRect(x - 7, ty + 2, 4, sit ? 11 : 13); g.fillRect(x + 3, ty + 2, 4, sit ? 11 : 13); }
    if (L.bot && !L.dress && !sit) { g.fillStyle = 'rgba(0,0,0,.25)'; g.fillRect(x - 7, ty + 13, 14, 2); }
    if (d === 0) {
      if (L.bow) { g.fillStyle = L.bow; g.beginPath(); g.moveTo(x, ty + 1.8); g.lineTo(x - 3.2, ty + 0.2); g.lineTo(x - 3.2, ty + 3.4); g.closePath(); g.moveTo(x, ty + 1.8); g.lineTo(x + 3.2, ty + 0.2); g.lineTo(x + 3.2, ty + 3.4); g.closePath(); g.fill(); }
      if (L.tie) { g.fillStyle = L.tie; g.beginPath(); g.moveTo(x - 1.2, ty + 0.5); g.lineTo(x + 1.2, ty + 0.5); g.lineTo(x + 1.6, ty + 9); g.lineTo(x, ty + 10.5); g.lineTo(x - 1.6, ty + 9); g.fill(); }
      if (L.chain) { g.strokeStyle = '#f6c94e'; g.lineWidth = 1.3; g.beginPath(); g.arc(x, ty - 0.5, 4.6, 0.35, Math.PI - 0.35); g.stroke(); g.fillStyle = '#ffe08a'; g.fillRect(x - 1, ty + 3.6, 2, 2); }
      if (L.watch) { g.fillStyle = '#ffe08a'; g.fillRect(x + 7.6, ty + 8.5, 3, 2); }
    }
    // arms
    const as = mv ? Math.sin(ph) * 2.2 : 0;
    g.fillStyle = L.top;
    if (cheer) {
      const up = Math.sin(tm * 18) * 1.5;
      g.fillRect(x - 10, ty - 9 + up, 3.4, 11); g.fillRect(x + 6.6, ty - 9 - up, 3.4, 11);
      g.fillStyle = L.skin; ell(x - 8.3, ty - 9.5 + up, 2, 2, L.skin); ell(x + 8.3, ty - 9.5 - up, 2, 2, L.skin);
    } else if (d < 2) {
      g.fillRect(x - 9.8, ty + 1 + as, 3.2, sit ? 9 : 11); g.fillRect(x + 6.6, ty + 1 - as, 3.2, sit ? 9 : 11);
      if (d === 0) { ell(x - 8.2, ty + (sit ? 10.5 : 12.5) + as, 1.8, 1.8, L.skin); ell(x + 8.2, ty + (sit ? 10.5 : 12.5) - as, 1.8, 1.8, L.skin); }
      if (L.tray) {
        g.fillStyle = L.top; g.fillRect(x + 6.6, ty - 6, 3.2, 8);
        ell(x + 9, ty - 7, 7, 2.2, '#d8dce2');
        ['#f6c94e', '#c8283c', '#fff3c0'].forEach((c, i) => { g.fillStyle = c; g.fillRect(x + 5 + i * 3, ty - 12, 2, 5); });
      }
    } else {
      g.fillRect(x - 1.6 + as * (d === 3 ? 1 : -1), ty + 1, 3.2, 11);
      ell(x + as * (d === 3 ? 1 : -1), ty + 12.5, 1.8, 1.8, L.skin);
    }
    // head
    g.fillStyle = L.skin; g.fillRect(x - 1.8, ty - 2.5, 3.6, 3);
    ell(x, hy, 7, 7.2, L.skin);
    hair(L, x, hy, d);
    if (d !== 1) face(a, L, x, hy, d, tm);
    if (L.chef) { g.fillStyle = '#fbfaf6'; rr(x - 6, hy - 17, 12, 11, 4); g.fill(); ell(x, hy - 6.5, 7.2, 2, '#e8e6e0'); }
    if (L.cap) { g.fillStyle = L.cap; g.beginPath(); g.arc(x, hy - 1.5, 7.3, Math.PI, TAU); g.fill(); if (d === 0) { g.fillRect(x - 7.5, hy - 2.4, 15, 2.2); } else if (d > 1) g.fillRect(x + (d === 3 ? 2 : -9), hy - 2.4, 7, 2); if (L.capTrim) { g.fillStyle = '#f6c94e'; g.fillRect(x - 7, hy - 3.8, 14, 1.2); } }
    if (L.ear && d !== 0) { g.fillStyle = '#0c0b0a'; g.fillRect(x + (d === 2 ? 4 : -5.5), hy, 1.5, 6); }
    g.globalAlpha = 1;
  }
  function hair(L, x, hy, d) {
    const c = L.hair, hs = L.hs || 0;
    g.fillStyle = c;
    if (hs === 5) { if (d === 1) { g.beginPath(); g.arc(x, hy + 1, 7, 0.2, Math.PI - 0.2); g.fill(); } return; }
    if (d === 1) {
      ell(x, hy - 0.5, 7.4, 7.4, c);
      if (hs === 1) g.fillRect(x - 7.4, hy, 14.8, 11);
      if (hs === 2) ell(x, hy - 7, 4, 3.4, c);
      return;
    }
    g.beginPath(); g.arc(x, hy - 0.6, 7.5, Math.PI * 1.02, Math.PI * 1.98); g.fill();
    if (hs === 3) return;
    if (hs === 4) { g.fillStyle = 'rgba(255,255,255,.18)'; g.fillRect(x - 3, hy - 6.5, 5, 1.2); g.fillStyle = c; }
    if (d === 0) {
      if (hs === 0 || hs === 4) { g.fillRect(x - 7.2, hy - 3.4, 14.4, 2.6); }
      if (hs === 1) { g.fillRect(x - 7.6, hy - 3, 3, 11); g.fillRect(x + 4.6, hy - 3, 3, 11); g.fillRect(x - 6, hy - 4, 12, 2.4); }
      if (hs === 2) { ell(x, hy - 7.6, 4, 3.4, c); g.fillRect(x - 7, hy - 3.6, 14, 2.4); }
      if (hs === 6) g.fillRect(x - 7, hy - 3.2, 14, 2);
    } else {
      const bk = d === 3 ? -1 : 1;
      ell(x + bk * 3.4, hy - 0.2, 4.6, 6.4, c);
      if (hs === 1) g.fillRect(x + bk * 2 - (bk > 0 ? 0 : 5), hy, 5.4, 10);
      if (hs === 2) ell(x + bk * 5.2, hy - 4.6, 3.4, 3.2, c);
    }
  }
  function face(a, L, x, hy, d, tm) {
    const blink = (tm + a.seed) % 4.2 < 0.12;
    g.fillStyle = '#1a1410';
    const ey = hy + 0.8;
    if (d === 0) {
      if (L.glasses === 2) { g.fillStyle = '#0c0b0a'; rr(x - 5.6, ey - 1.8, 11.2, 3.6, 1.5); g.fill(); g.fillStyle = 'rgba(255,255,255,.35)'; g.fillRect(x - 4.4, ey - 1.2, 2, 0.8); }
      else {
        if (blink) { g.fillRect(x - 3.6, ey, 2.2, 0.8); g.fillRect(x + 1.4, ey, 2.2, 0.8); }
        else { g.fillRect(x - 3.2, ey - 1, 1.6, 2.2); g.fillRect(x + 1.6, ey - 1, 1.6, 2.2); }
        if (L.glasses) { g.strokeStyle = '#2a2420'; g.lineWidth = 0.8; g.strokeRect(x - 4.4, ey - 1.8, 3.8, 3.4); g.strokeRect(x + 0.6, ey - 1.8, 3.8, 3.4); }
      }
      if (L.fem) { g.fillStyle = 'rgba(232,90,110,.35)'; g.fillRect(x - 5.2, ey + 2.2, 2, 1.2); g.fillRect(x + 3.2, ey + 2.2, 2, 1.2); }
      const talking = a.bubble && (tm * 10 | 0) % 2;
      g.fillStyle = talking ? '#5a1a1a' : 'rgba(90,40,30,.6)'; g.fillRect(x - 1.2, hy + 4.2, 2.4, talking ? 1.6 : 0.8);
    } else {
      const s = d === 3 ? 1 : -1;
      if (L.glasses === 2) { g.fillStyle = '#0c0b0a'; g.fillRect(x + s * 1.5 - (s < 0 ? 4.5 : 0), ey - 1.6, 4.5, 3.2); }
      else if (!blink) g.fillRect(x + s * 3 - 0.8, ey - 1, 1.6, 2.2);
      g.fillStyle = L.skin; g.fillRect(x + s * 6.4 - (s < 0 ? 1.4 : 0), hy + 1, 1.4, 2);
    }
  }

  /* ================= objects ================= */
  const SYMC = ['#e8364f', '#f6c94e', '#35d49a', '#6fb7ff', '#c58cff', '#fff3c0'];
  function drawObj(o, tm) {
    const x = o.x * T, y = o.y * T, w = o.w * T, b = o.base;
    switch (o.kind) {
      case 'slot': {
        const C = BANK[o.game], spin = tm - o.spinT < 1.1, win = tm - o.winT < 2.6, fl = win && (tm * 8 | 0) % 2;
        g.fillStyle = 'rgba(0,0,0,.45)'; g.fillRect(x + 1, b - 5, T - 2, 6);
        g.fillStyle = lg(x, 0, x + T, 0, [[0, C.body], [0.8, C.body], [1, '#000']]); rr(x + 3, b - 62, 26, 58, 4); g.fill();
        g.strokeStyle = C.trim; g.lineWidth = 1; rr(x + 3.5, b - 61.5, 25, 57, 4); g.stroke();
        g.fillStyle = fl ? '#fff3c0' : C.top; rr(x + 1, b - 76, 30, 15, 5); g.fill();
        g.strokeStyle = C.trim; g.stroke();
        g.fillStyle = fl ? C.top : '#fff3c0'; g.font = `800 ${C.glyph.length > 1 ? 7 : 10}px ${FONT}`; g.textAlign = 'center'; g.textBaseline = 'middle';
        g.fillText(C.glyph, x + 16, b - 68);
        g.fillStyle = '#07040c'; g.fillRect(x + 6, b - 56, 20, 18);
        for (let r = 0; r < 3; r++) {
          const s = spin ? ((tm * 14 + r * 2.3 + o.seed) | 0) % 6 : o.sym[r];
          g.fillStyle = '#f7efdc'; g.fillRect(x + 7 + r * 6.2, b - 54.5, 5.4, 15);
          g.fillStyle = SYMC[s]; g.fillRect(x + 7.8 + r * 6.2, b - 49 + (spin ? Math.sin(tm * 40 + r) * 3 : 0), 3.8, 4);
        }
        if (win) { g.fillStyle = `rgba(255,243,192,${0.25 + Math.sin(tm * 20) * 0.2})`; g.fillRect(x + 6, b - 56, 20, 18); }
        g.fillStyle = '#100a06'; g.fillRect(x + 4, b - 35, 24, 6);
        ['#e8364f', '#f6c94e', '#35d49a'].forEach((c, i) => { g.fillStyle = c; g.fillRect(x + 7 + i * 7, b - 33.5, 4, 2.6); });
        g.fillStyle = C.top; g.globalAlpha = 0.55; g.fillRect(x + 6, b - 27, 20, 15); g.globalAlpha = 1;
        g.fillStyle = C.trim; g.font = `700 8px ${FONT}`; g.fillText(C.glyph, x + 16, b - 19.5);
        const cnd = win ? (tm * 6 | 0) % 2 : ((tm * 0.7 + o.seed) | 0) % 5 === 0;
        g.fillStyle = cnd ? '#ffe08a' : '#5a3a14'; g.fillRect(x + 14, b - 82, 4, 6);
        break;
      }
      case 'stool': ell(x + 16, b - 10, 7, 3.4, '#5a0c14'); g.fillStyle = '#9aa0a8'; g.fillRect(x + 15, b - 8, 2, 7); ell(x + 16, b - 1, 5, 1.6, '#3a3f46'); break;
      case 'bankSign': {
        const C = BANK[o.game], cx = x + w / 2, ty = b - 104;
        g.fillStyle = 'rgba(8,4,2,.92)'; rr(cx - 70, ty - 12, 140, 22, 11); g.fill();
        g.strokeStyle = C.trim; g.lineWidth = 1.4; g.stroke();
        g.font = `800 13px ${FONT}`; g.textAlign = 'center'; g.textBaseline = 'middle';
        g.fillStyle = C.scr; g.shadowColor = C.scr; g.shadowBlur = 10; g.fillText(t('game.' + o.game), cx, ty - 1); g.shadowBlur = 0;
        for (let i = 0; i < 14; i++) { g.fillStyle = ((tm * 6 | 0) + i) % 3 ? 'rgba(246,201,78,.35)' : '#ffe08a'; g.fillRect(cx - 66 + i * 10, ty + 7, 3, 2); }
        g.fillStyle = '#3a2a14'; g.fillRect(cx - 50, ty + 10, 2, 10); g.fillRect(cx + 48, ty + 10, 2, 10);
        break;
      }
      case 'cardtable': case 'mjtable': {
        const cx = x + w / 2, cy = y + o.h * T / 2;
        ell(cx, b - 6, 52, 18, 'rgba(0,0,0,.4)');
        g.fillStyle = '#1c0d04'; rr(x - 2, y + 8, w + 4, o.h * T - 6, 20); g.fill();
        g.fillStyle = '#4a2410'; rr(x - 4, y - 2, w + 8, o.h * T - 6, 22); g.fill();
        g.strokeStyle = '#d9a441'; g.lineWidth = 1.2; g.stroke();
        g.fillStyle = o.kind === 'mjtable' ? '#0f5a43' : '#0d4a38'; rr(x + 5, y + 6, w - 10, o.h * T - 22, 14); g.fill();
        if (o.kind === 'mjtable') {
          for (let s = 0; s < 4; s++) for (let i = 0; i < 6; i++) {
            const along = -21 + i * 8.4;
            const [tx2, ty2, vw2, vh2] = s === 0 ? [cx + along, cy - 30, 7, 5] : s === 1 ? [cx + along, cy + 14, 7, 5] : s === 2 ? [cx - 34, cy - 12 + i * 4.4, 5, 4] : [cx + 29, cy - 12 + i * 4.4, 5, 4];
            g.fillStyle = '#f3ead3'; g.fillRect(tx2, ty2, vw2, vh2); g.fillStyle = '#1f7a55'; g.fillRect(tx2, ty2 + vh2 - 1.2, vw2, 1.2);
          }
        } else {
          [[cx - 12, cy - 30], [cx - 4, cy - 30], [cx + 4, cy - 30], [cx - 34, cy - 14], [cx - 34, cy - 6], [cx + 28, cy - 14], [cx + 28, cy - 6], [cx - 8, cy + 10], [cx, cy + 10]].forEach(([px, py], i) => {
            g.fillStyle = i % 3 === 0 ? '#c8283c' : '#f3ead3'; g.fillRect(px, py, 6, 8); g.strokeStyle = 'rgba(0,0,0,.4)'; g.strokeRect(px, py, 6, 8);
          });
          chipPile(cx - 2, cy - 8, 5, tm);
        }
        break;
      }
      case 'viptable': {
        const cx = x + w / 2, cy = y + o.h * T / 2;
        ell(cx, cy + 12, 104, 44, 'rgba(0,0,0,.45)');
        ell(cx, cy + 8, 100, 40, '#1c0d04');
        ell(cx, cy, 100, 40, '#2a0c06'); g.strokeStyle = '#f6c94e'; g.lineWidth = 2; g.stroke();
        ell(cx, cy - 1, 88, 33, lg(0, cy - 30, 0, cy + 30, [[0, '#7a0f1c'], [1, '#4a0610']]));
        g.strokeStyle = 'rgba(246,201,78,.5)'; g.lineWidth = 1; ell(cx, cy - 1, 70, 25); g.stroke();
        g.font = `400 26px ${FONT}`; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillStyle = 'rgba(246,201,78,.25)'; g.fillText('龍', cx, cy);
        chipPile(cx - 30, cy - 4, 9, tm); chipPile(cx + 34, cy - 2, 7, tm); chipPile(cx + 2, cy - 18, 12, tm);
        break;
      }
      case 't_blackjack': case 't_baccarat': case 't_roulette': case 't_sicbo': tableDraw(o, x, y, w, b, tm); break;
      case 'fountain': fountainDraw(o, x, y, w, b, tm); break;
      case 'wheel': {
        const cx = x + w / 2, cy = b - 56, R = 34, rot = tm * 0.35 + (o.kick ? Math.max(0, o.kick - tm) * 3 : 0);
        g.fillStyle = '#2a1408'; g.fillRect(cx - 4, cy, 8, b - cy - 4); rr(cx - 22, b - 10, 44, 8, 3); g.fill();
        ell(cx, cy, R + 5, R + 5, '#8a5a17');
        for (let i = 0; i < 24; i++) {
          const a0 = rot + i * TAU / 24;
          g.fillStyle = i === 0 ? '#f6c94e' : ['#b8132c', '#16110f', '#0e8a5c', '#16110f'][i % 4];
          g.beginPath(); g.moveTo(cx, cy); g.arc(cx, cy, R, a0, a0 + TAU / 24); g.closePath(); g.fill();
        }
        ell(cx, cy, 8, 8, '#f6c94e');
        for (let i = 0; i < 16; i++) { const a0 = i * TAU / 16; g.fillStyle = ((tm * 5 | 0) + i) % 2 ? '#fff3c0' : '#f6c94e'; g.beginPath(); g.arc(cx + Math.cos(a0) * (R + 3), cy + Math.sin(a0) * (R + 3), 1.6, 0, TAU); g.fill(); }
        g.fillStyle = '#fff3c0'; g.beginPath(); g.moveTo(cx - 5, cy - R - 9); g.lineTo(cx + 5, cy - R - 9); g.lineTo(cx, cy - R + 2); g.fill();
        break;
      }
      case 'crash': {
        const sx = x + 2, sy = b - 88, sw = w - 4, sh = 58;
        g.fillStyle = '#2a1408'; g.fillRect(x + 12, sy + sh, 5, b - sy - sh); g.fillRect(x + w - 17, sy + sh, 5, b - sy - sh);
        g.fillStyle = '#05080a'; rr(sx, sy, sw, sh, 4); g.fill(); g.strokeStyle = '#d9a441'; g.lineWidth = 1.4; g.stroke();
        const cyc = (tm + o.seed) % 9, crashAt = 6.2, k = Math.min(cyc, crashAt), m = Math.exp(0.32 * k);
        g.strokeStyle = 'rgba(217,164,65,.15)'; g.lineWidth = 0.6;
        for (let i = 1; i < 4; i++) { g.beginPath(); g.moveTo(sx, sy + i * sh / 4); g.lineTo(sx + sw, sy + i * sh / 4); g.stroke(); }
        g.strokeStyle = cyc > crashAt ? '#e8364f' : '#35d49a'; g.lineWidth = 2; g.beginPath();
        for (let i = 0; i <= 20; i++) { const q = i / 20 * k, px = sx + 4 + (q / crashAt) * (sw - 12), py = sy + sh - 6 - (Math.exp(0.32 * q) - 1) / (Math.exp(0.32 * crashAt) - 1) * (sh - 16); i ? g.lineTo(px, py) : g.moveTo(px, py); }
        g.stroke();
        g.font = `800 13px ${FONT}`; g.textAlign = 'left'; g.textBaseline = 'top';
        g.fillStyle = cyc > crashAt ? '#e8364f' : '#fff3c0'; g.fillText(cyc > crashAt ? 'CRASH ' + m.toFixed(2) + '×' : m.toFixed(2) + '×', sx + 6, sy + 5);
        g.font = `700 8px ${FONT}`; g.fillStyle = '#d9a441'; g.textAlign = 'right'; g.fillText(t('game.crash'), sx + sw - 5, sy + 5);
        break;
      }
      case 'plinko': {
        const sx = x + 4, sy = b - 98, sw = w - 8, sh = 86;
        g.fillStyle = '#120a1e'; rr(sx, sy, sw, sh, 5); g.fill(); g.strokeStyle = '#d9a441'; g.lineWidth = 1.4; g.stroke();
        for (let r = 0; r < 8; r++) for (let j = 0; j <= r + 1; j++) { g.fillStyle = '#e9dcc0'; g.fillRect(sx + sw / 2 + (j - (r + 1) / 2) * 6 - 0.8, sy + 10 + r * 8, 1.6, 1.6); }
        ['#ce263c', '#d9a441', '#16785a', '#d9a441', '#ce263c'].forEach((c, i) => { g.fillStyle = c; g.fillRect(sx + 4 + i * (sw - 8) / 5, sy + sh - 10, (sw - 8) / 5 - 1, 6); });
        for (let k = 0; k < 3; k++) {
          const p = ((tm * 0.45 + k / 3 + o.seed) % 1), r = p * 8, wob = Math.sin(r * Math.PI) * (((k * 7 + Math.floor(tm * 0.45 + k / 3)) % 5) - 2) * 3;
          g.fillStyle = '#f6c94e'; g.beginPath(); g.arc(sx + sw / 2 + wob, sy + 6 + p * (sh - 16), 2.2, 0, TAU); g.fill();
        }
        break;
      }
      case 'pillar': {
        const cx = x + 16;
        g.fillStyle = 'rgba(0,0,0,.4)'; ell(cx, b - 4, 15, 5);
        g.fillStyle = '#8a5a17'; g.fillRect(cx - 14, b - 12, 28, 9); g.fillStyle = '#d9a441'; g.fillRect(cx - 14, b - 12, 28, 2);
        g.fillStyle = lg(cx - 10, 0, cx + 10, 0, [[0, '#8a7a62'], [0.35, '#efe4cc'], [0.6, '#cdbd9c'], [1, '#6a5a42']]); g.fillRect(cx - 10, b - 104, 20, 92);
        g.fillStyle = 'rgba(0,0,0,.1)'; for (let i = -6; i <= 6; i += 4) g.fillRect(cx + i, b - 104, 1, 92);
        g.fillStyle = lg(0, b - 116, 0, b - 102, [[0, '#fff3c0'], [0.5, '#d9a441'], [1, '#8a5a17']]); g.fillRect(cx - 15, b - 116, 30, 13);
        g.fillStyle = '#c8283c'; g.fillRect(cx - 7, b - 92, 14, 26); g.fillStyle = '#f6c94e'; g.font = `400 10px ${FONT}`; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('福', cx, b - 79);
        break;
      }
      case 'plant': {
        const cx = x + 16;
        g.fillStyle = lg(cx - 9, 0, cx + 9, 0, [[0, '#8a5a17'], [0.5, '#f6c94e'], [1, '#8a5a17']]); g.beginPath(); g.moveTo(cx - 9, b - 20); g.lineTo(cx + 9, b - 20); g.lineTo(cx + 6, b - 3); g.lineTo(cx - 6, b - 3); g.fill();
        for (let i = 0; i < 7; i++) {
          const a0 = -Math.PI / 2 + (i - 3) * 0.42 + Math.sin(tm * 0.8 + i + o.seed) * 0.04, L = 26 + (i % 2) * 6;
          g.strokeStyle = i % 2 ? '#1f6a3a' : '#2a8a4a'; g.lineWidth = 4; g.lineCap = 'round';
          g.beginPath(); g.moveTo(cx, b - 20); g.quadraticCurveTo(cx + Math.cos(a0) * L * 0.6, b - 20 + Math.sin(a0) * L * 0.9, cx + Math.cos(a0) * L, b - 20 + Math.sin(a0) * L * 0.6 + 6); g.stroke();
        }
        g.lineCap = 'butt';
        break;
      }
      case 'bench': g.fillStyle = '#3a1d0a'; rr(x + 2, b - 16, w - 4, 10, 3); g.fill(); g.fillStyle = '#7a0f1c'; rr(x + 3, b - 19, w - 6, 6, 3); g.fill(); g.fillStyle = '#d9a441'; g.fillRect(x + 4, b - 7, 2, 6); g.fillRect(x + w - 6, b - 7, 2, 6); break;
      case 'sofa': {
        const c = o.hue === 'gold' ? '#8a6a20' : '#6a0c18', c2 = o.hue === 'gold' ? '#c8a040' : '#9a1a2a';
        g.fillStyle = 'rgba(0,0,0,.35)'; g.fillRect(x + 2, b - 5, w - 4, 6);
        g.fillStyle = c; rr(x + 1, b - 30, w - 2, 14, 6); g.fill();
        g.fillStyle = c2; rr(x + 4, b - 20, w - 8, 14, 4); g.fill();
        g.fillStyle = c; rr(x, b - 22, 7, 18, 3); g.fill(); rr(x + w - 7, b - 22, 7, 18, 3); g.fill();
        g.strokeStyle = 'rgba(246,201,78,.4)'; g.lineWidth = 0.8; for (let i = 1; i < 3; i++) { g.beginPath(); g.moveTo(x + i * w / 3, b - 19); g.lineTo(x + i * w / 3, b - 7); g.stroke(); }
        break;
      }
      case 'ctable': ell(x + 16, b - 4, 11, 4, 'rgba(0,0,0,.35)'); g.fillStyle = '#2a1408'; g.fillRect(x + 14, b - 14, 4, 10); ell(x + 16, b - 15, 12, 5, '#1c0d04'); g.strokeStyle = '#d9a441'; g.lineWidth = 0.8; g.stroke(); g.fillStyle = '#c8283c'; g.fillRect(x + 13, b - 22, 3, 6); g.fillStyle = '#f6c94e'; g.fillRect(x + 18, b - 21, 3, 5); break;
      case 'piano': {
        g.fillStyle = 'rgba(0,0,0,.4)'; ell(x + w / 2, b - 4, w / 2, 10);
        g.fillStyle = '#0a0908'; g.beginPath(); g.moveTo(x + 4, b - 20); g.lineTo(x + w - 10, b - 20); g.quadraticCurveTo(x + w + 6, b - 40, x + w - 20, b - 56); g.lineTo(x + 18, b - 58); g.quadraticCurveTo(x - 2, b - 50, x + 4, b - 20); g.fill();
        g.strokeStyle = '#d9a441'; g.lineWidth = 0.8; g.stroke();
        g.fillStyle = '#16130f'; g.beginPath(); g.moveTo(x + 14, b - 56); g.lineTo(x + w - 22, b - 54); g.lineTo(x + w - 30, b - 82); g.closePath(); g.fill();
        g.fillStyle = '#f3ead3'; g.fillRect(x + 8, b - 22, w - 24, 5);
        g.fillStyle = '#0a0908'; for (let i = 0; i < 12; i++) if (i % 7 !== 2 && i % 7 !== 6) g.fillRect(x + 10 + i * 6, b - 22, 2.4, 3);
        g.fillRect(x + 8, b - 17, 3, 15); g.fillRect(x + w - 16, b - 17, 3, 15);
        break;
      }
      case 'tank': {
        const th = 40;
        g.fillStyle = '#1c0d04'; g.fillRect(x, b - 12, w, 12); g.fillStyle = '#d9a441'; g.fillRect(x, b - 12, w, 1.5);
        g.fillStyle = lg(0, b - 12 - th, 0, b - 12, [[0, 'rgba(60,160,220,.55)'], [1, 'rgba(10,40,90,.85)']]); g.fillRect(x + 2, b - 12 - th, w - 4, th);
        for (let i = 0; i < (o.sea ? 4 : 3); i++) {
          const fx = x + 10 + ((tm * (8 + i * 3) + o.seed * 7 + i * 37) % (w - 20)), fy = b - 40 + i * 8 + Math.sin(tm * 1.4 + i) * 3, dir = 1;
          g.fillStyle = o.sea ? ['#e8603c', '#d9d0b0', '#c8283c', '#7a5a3a'][i] : ['#f6c94e', '#e8a03c', '#f6c94e'][i];
          ell(fx, fy, o.sea ? 6 : 9, o.sea ? 2.6 : 3.4); g.fill();
          g.beginPath(); g.moveTo(fx - dir * (o.sea ? 6 : 9), fy); g.lineTo(fx - dir * (o.sea ? 10 : 14), fy - 3); g.lineTo(fx - dir * (o.sea ? 10 : 14), fy + 3); g.fill();
        }
        if (o.sea) { g.fillStyle = '#c8603c'; for (let i = 0; i < 3; i++) g.fillRect(x + 20 + i * 30, b - 18, 10, 5); }
        for (let i = 0; i < 4; i++) { const by = b - 14 - ((tm * 18 + i * 11) % th); g.fillStyle = 'rgba(255,255,255,.5)'; g.fillRect(x + 8 + i * (w / 4), by, 1.5, 1.5); }
        g.strokeStyle = 'rgba(255,255,255,.35)'; g.lineWidth = 1; g.strokeRect(x + 2, b - 12 - th, w - 4, th);
        g.fillStyle = '#1c0d04'; g.fillRect(x, b - 16 - th, w, 5);
        break;
      }
      case 'rope': {
        const posts = gateOpen ? [x - 10, x + w + 10] : [x + 2, x + w / 2, x + w - 2];
        if (!gateOpen) { g.strokeStyle = '#9a0f22'; g.lineWidth = 3; g.beginPath(); g.moveTo(posts[0], b - 22); g.quadraticCurveTo((posts[0] + posts[1]) / 2, b - 12, posts[1], b - 22); g.quadraticCurveTo((posts[1] + posts[2]) / 2, b - 12, posts[2], b - 22); g.stroke(); }
        posts.forEach(px => { g.fillStyle = '#d9a441'; g.fillRect(px - 1.5, b - 24, 3, 22); ell(px, b - 24, 3, 3, '#ffe08a'); ell(px, b - 2, 5, 2, '#8a5a17'); });
        break;
      }
      case 'stand': g.fillStyle = '#3a1d0a'; g.beginPath(); g.moveTo(x + 6, b - 34); g.lineTo(x + 26, b - 34); g.lineTo(x + 23, b - 3); g.lineTo(x + 9, b - 3); g.fill(); g.fillStyle = '#d9a441'; g.fillRect(x + 5, b - 36, 22, 3); g.fillStyle = '#f3ead3'; g.fillRect(x + 10, b - 40, 12, 4); break;
      case 'dine': {
        const cx = x + w / 2;
        g.fillStyle = '#3a1d0a'; rr(cx - 8, b - 36, 16, 6, 2); g.fill();
        ell(cx, b - 6, 30, 9, 'rgba(0,0,0,.35)');
        ell(cx, b - 16, 30, 12, '#f4efe2'); g.fillStyle = '#e4dccb'; g.fillRect(cx - 30, b - 16, 60, 10); ell(cx, b - 6, 30, 5, '#d8cfbc'); ell(cx, b - 16, 30, 12, '#fbf8f0');
        [[-14, -18], [12, -18], [-12, -12], [14, -12]].forEach(([dx, dy]) => { ell(cx + dx, b + dy, 4.6, 2, '#e8e2d4'); g.strokeStyle = '#d9a441'; g.lineWidth = 0.6; g.stroke(); });
        ell(cx, b - 17, 6, 2.6, '#c8603c');
        g.fillStyle = '#f6c94e'; g.fillRect(cx - 1, b - 26, 2, 7); ell(cx, b - 27, 1.6, 2.4, `rgba(255,200,90,${0.7 + Math.sin(tm * 12 + o.seed) * 0.3})`);
        break;
      }
      case 'counter': counterDraw(o, x, y, w, b, tm); break;
      case 'balls': {
        const cx = x + w / 2, cy = b - 42, R = 22;
        g.fillStyle = '#8a5a17'; rr(cx - 18, b - 18, 36, 16, 3); g.fill(); g.fillStyle = '#d9a441'; g.fillRect(cx - 18, b - 18, 36, 2);
        ell(cx, cy, R, R, 'rgba(160,210,255,.12)'); g.strokeStyle = 'rgba(255,255,255,.4)'; g.lineWidth = 1.2; g.stroke();
        for (let i = 0; i < 12; i++) {
          const a0 = tm * (1.5 + (i % 4) * 0.7) + i * 1.7, rr2 = 6 + (i * 37 % 13);
          g.fillStyle = i % 4 === 0 ? '#3b7be0' : '#e8364f'; g.beginPath(); g.arc(cx + Math.cos(a0) * rr2, cy + Math.sin(a0 * 1.3) * rr2, 3, 0, TAU); g.fill();
        }
        g.fillStyle = 'rgba(255,255,255,.35)'; g.beginPath(); g.ellipse(cx - 8, cy - 10, 5, 3, -0.6, 0, TAU); g.fill();
        break;
      }
      case 'kiosk': g.fillStyle = '#7a1016'; rr(x + 5, b - 48, 22, 46, 3); g.fill(); g.fillStyle = '#d9a441'; g.fillRect(x + 5, b - 48, 22, 2); g.fillStyle = '#0a1a2a'; g.fillRect(x + 8, b - 42, 16, 12); g.fillStyle = `rgba(246,201,78,${0.6 + Math.sin(tm * 3 + o.seed) * 0.3})`; g.fillRect(x + 10, b - 39, 12, 2); g.fillRect(x + 10, b - 35, 8, 2); g.fillStyle = '#fff3c0'; g.fillRect(x + 11, b - 24, 10, 3); break;
      case 'atm': g.fillStyle = '#1a2a3a'; rr(x + 4, b - 52, 24, 50, 3); g.fill(); g.strokeStyle = '#6fb7ff'; g.lineWidth = 1; g.stroke(); g.fillStyle = `rgba(111,183,255,${0.7 + Math.sin(tm * 2) * 0.2})`; g.fillRect(x + 8, b - 46, 16, 12); g.fillStyle = '#05080a'; g.fillRect(x + 9, b - 28, 14, 3); g.fillStyle = '#c8283c'; g.font = `800 6px ${FONT}`; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('ATM', x + 16, b - 40); break;
      case 'lion': {
        const cx = x + 16, s = o.flip ? -1 : 1;
        g.fillStyle = '#3a2a1a'; g.fillRect(cx - 12, b - 16, 24, 14); g.fillStyle = '#d9a441'; g.fillRect(cx - 12, b - 16, 24, 2);
        g.fillStyle = lg(cx - 10, 0, cx + 10, 0, [[0, '#8a5a17'], [0.5, '#ffe08a'], [1, '#a86e14']]);
        rr(cx - 9, b - 40, 18, 24, 6); g.fill();
        g.beginPath(); g.arc(cx + s * 2, b - 44, 10, 0, TAU); g.fill();
        g.fillStyle = '#8a5a17'; for (let i = 0; i < 8; i++) { const a0 = i * TAU / 8; g.beginPath(); g.arc(cx + s * 2 + Math.cos(a0) * 9, b - 44 + Math.sin(a0) * 9, 3, 0, TAU); g.fill(); }
        g.fillStyle = '#ffe08a'; g.beginPath(); g.arc(cx + s * 2, b - 44, 6.5, 0, TAU); g.fill();
        g.fillStyle = '#3a2405'; g.fillRect(cx + s * 2 - 3, b - 46, 1.6, 1.6); g.fillRect(cx + s * 2 + 1.4, b - 46, 1.6, 1.6);
        g.fillStyle = '#ffe08a'; g.beginPath(); g.arc(cx - s * 7, b - 19, 4, 0, TAU); g.fill();
        break;
      }
      case 'case': {
        g.fillStyle = '#1c1612'; g.fillRect(x + 2, b - 16, w - 4, 14); g.fillStyle = '#d9a441'; g.fillRect(x + 2, b - 16, w - 4, 1.5);
        g.fillStyle = 'rgba(200,230,255,.12)'; g.fillRect(x + 2, b - 38, w - 4, 22); g.strokeStyle = 'rgba(255,255,255,.4)'; g.lineWidth = 0.8; g.strokeRect(x + 2, b - 38, w - 4, 22);
        g.fillStyle = '#f6c94e'; g.beginPath(); g.arc(x + 14, b - 24, 4, 0, TAU); g.fill(); g.fillStyle = '#e8e2d4'; g.fillRect(x + 26, b - 28, 8, 8); g.strokeStyle = '#f6c94e'; g.beginPath(); g.arc(x + 46, b - 24, 5, 0, Math.PI); g.stroke();
        if (((tm * 2 + o.seed) | 0) % 3 === 0) { g.fillStyle = '#fff'; g.fillRect(x + 13, b - 29, 1.5, 1.5); }
        break;
      }
      case 'mannequin': g.fillStyle = '#8a8a8a'; g.fillRect(x + 15, b - 12, 2, 10); ell(x + 16, b - 2, 6, 2, '#3a3a3a'); g.fillStyle = '#14110f'; rr(x + 8, b - 44, 16, 32, 4); g.fill(); g.fillStyle = '#f4f1ea'; g.fillRect(x + 14, b - 44, 4, 10); g.fillStyle = '#c8283c'; g.fillRect(x + 15, b - 42, 2, 8); ell(x + 16, b - 50, 5, 6, '#d8d0c0'); break;
      case 'cart': g.strokeStyle = '#d9a441'; g.lineWidth = 2; g.strokeRect(x + 4, b - 50, 24, 44); g.beginPath(); g.moveTo(x + 4, b - 50); g.quadraticCurveTo(x + 16, b - 62, x + 28, b - 50); g.stroke(); g.fillStyle = '#5a2a14'; g.fillRect(x + 7, b - 26, 18, 16); g.fillStyle = '#1f3a5f'; g.fillRect(x + 9, b - 40, 14, 13); g.fillStyle = '#d9a441'; ell(x + 7, b - 3, 3, 3, '#333'); ell(x + 25, b - 3, 3, 3, '#333'); break;
    }
  }
  function chipPile(cx, cy, n, tm) {
    const cols = ['#c8283c', '#1f4fa8', '#16110f', '#0e8a5c', '#f6c94e'];
    for (let i = 0; i < n; i++) { const c = cols[i % 5]; ell(cx + (i % 3) * 5, cy - Math.floor(i / 3) * 2.2, 3.6, 1.6, c); g.strokeStyle = 'rgba(255,255,255,.4)'; g.lineWidth = 0.5; g.stroke(); }
  }
  function tableDraw(o, x, y, w, b, tm) {
    const cx = x + w / 2, top = y + 6, h = o.h * T;
    ell(cx, b - 4, w / 2 + 4, 12, 'rgba(0,0,0,.4)');
    const shape = (ins, dy = 0) => {
      g.beginPath();
      if (o.kind === 't_blackjack' || o.kind === 't_baccarat') {
        g.moveTo(x + ins, top + ins + dy); g.lineTo(x + w - ins, top + ins + dy);
        g.ellipse(cx, top + ins + dy, w / 2 - ins, h - 14 - ins, 0, 0, Math.PI); g.closePath();
      } else { g.roundRect ? g.roundRect(x + ins, top + ins + dy, w - ins * 2, h - 18 - ins * 2, 10) : g.rect(x + ins, top + ins + dy, w - ins * 2, h - 18 - ins * 2); }
    };
    shape(0, 9); g.fillStyle = '#1c0d04'; g.fill();
    shape(0); g.fillStyle = '#4a2410'; g.fill(); g.strokeStyle = '#d9a441'; g.lineWidth = 1.2; g.stroke();
    const felt = { t_blackjack: '#0f5a43', t_baccarat: '#123a6b', t_roulette: '#0f5a43', t_sicbo: '#5a1418' }[o.kind];
    shape(6); g.fillStyle = felt; g.fill();
    g.fillStyle = '#16110f'; g.fillRect(cx - 22, top + 6, 44, 7);
    for (let i = 0; i < 6; i++) { g.fillStyle = ['#c8283c', '#1f4fa8', '#16110f', '#0e8a5c', '#f6c94e', '#fff'][i]; g.fillRect(cx - 20 + i * 7, top + 7, 5, 5); }
    g.strokeStyle = 'rgba(246,201,78,.55)'; g.lineWidth = 0.8; g.font = `700 8px ${FONT}`; g.textAlign = 'center'; g.textBaseline = 'middle';
    if (o.kind === 't_blackjack') {
      for (let i = 0; i < 5; i++) { const a0 = Math.PI * (0.15 + i * 0.175); ell(cx + Math.cos(a0) * 56, top + 10 + Math.sin(a0) * 32, 6, 3.4); g.stroke(); }
      g.fillStyle = 'rgba(246,201,78,.6)'; g.fillText('BLACKJACK 3:2', cx, top + 24);
      [[cx - 6, top + 15], [cx + 2, top + 15]].forEach(([px, py], i) => { g.fillStyle = '#f3ead3'; g.fillRect(px, py, 6, 8); g.fillStyle = i ? '#c8283c' : '#15110e'; g.fillRect(px + 1.5, py + 2, 3, 3); });
    } else if (o.kind === 't_baccarat') {
      g.fillStyle = 'rgba(232,54,79,.85)'; g.font = `400 12px ${FONT}`; g.fillText('庄', cx - 22, top + 26); g.fillStyle = 'rgba(111,183,255,.9)'; g.fillText('闲', cx + 22, top + 26);
      g.strokeStyle = 'rgba(246,201,78,.45)'; ell(cx, top + 14, 54, 24); g.stroke();
    } else if (o.kind === 't_roulette') {
      const wx = x + 24, wy = top + 20, rot = tm * 1.6;
      ell(wx, wy, 19, 13, '#3a1d0a');
      for (let i = 0; i < 18; i++) { g.fillStyle = i === 0 ? '#0e8a5c' : i % 2 ? '#b8132c' : '#16110f'; g.beginPath(); g.ellipse(wx, wy, 15, 10, 0, rot + i * TAU / 18, rot + (i + 1) * TAU / 18); g.lineTo(wx, wy); g.fill(); }
      ell(wx, wy, 6, 4, '#8a5a17'); g.fillStyle = '#f6c94e'; g.fillRect(wx - 0.8, wy - 4, 1.6, 8);
      const ba = -rot * 1.7; g.fillStyle = '#fff'; g.beginPath(); g.arc(wx + Math.cos(ba) * 13, wy + Math.sin(ba) * 8.5, 1.6, 0, TAU); g.fill();
      for (let r = 0; r < 3; r++) for (let c = 0; c < 8; c++) { g.fillStyle = (r + c) % 2 ? 'rgba(184,19,44,.8)' : 'rgba(22,17,15,.8)'; g.fillRect(x + 50 + c * 12, top + 12 + r * 8, 11, 7); }
    } else {
      for (let r = 0; r < 2; r++) for (let c = 0; c < 6; c++) { g.strokeRect(x + 14 + c * 22, top + 16 + r * 12, 21, 11); }
      g.fillStyle = 'rgba(246,201,78,.7)'; g.font = `400 9px ${FONT}`; g.fillText('大', x + 25, top + 22); g.fillText('小', x + w - 25, top + 22);
      ell(cx, top + 11, 11, 8, 'rgba(200,230,255,.25)'); g.strokeStyle = 'rgba(255,255,255,.5)'; g.stroke();
      const sh = ((tm * 0.5 + o.seed) % 6) < 0.6 ? Math.sin(tm * 50) * 2 : 0;
      [[-5, 0], [2, -2], [3, 3]].forEach(([dx, dy]) => { g.fillStyle = '#fbf6ea'; g.fillRect(cx + dx - 2 + sh, top + 10 + dy - 2, 4, 4); g.fillStyle = '#c8283c'; g.fillRect(cx + dx - 0.5 + sh, top + 10 + dy - 0.5, 1, 1); });
    }
    g.fillStyle = 'rgba(255,240,200,.08)'; g.fillRect(cx - 30, y - 40, 60, 3);
  }
  function counterDraw(o, x, y, w, b, tm) {
    const st = o.style, fh = 22, th = 14;
    g.fillStyle = 'rgba(0,0,0,.4)'; g.fillRect(x, b - 4, w, 6);
    const top = { bar: '#2a1408', cage: '#2a2622', club: '#14110f', desk: '#4a2a14', lotto: '#f3ead3', glass: 'rgba(200,230,255,.25)' }[st];
    const face = { bar: '#3a1a0a', cage: '#0c2b21', club: '#0c0b0a', desk: '#3a1d0a', lotto: '#8a1016', glass: 'rgba(200,230,255,.14)' }[st];
    g.fillStyle = top; g.fillRect(x, b - fh - th, w, th);
    g.fillStyle = face; g.fillRect(x, b - fh, w, fh);
    g.fillStyle = '#d9a441'; g.fillRect(x, b - fh - 1, w, 2); g.fillRect(x, b - 3, w, 1.2);
    if (st === 'bar') {
      for (let i = 8; i < w; i += 16) { g.fillStyle = 'rgba(217,164,65,.35)'; g.fillRect(x + i, b - fh + 3, 1, fh - 7); }
      g.fillStyle = 'rgba(255,190,90,.35)'; g.fillRect(x, b - 4, w, 1.5);
      for (let i = 0; i < w / 40; i++) { const gx = x + 18 + i * 40; g.fillStyle = 'rgba(255,255,255,.5)'; g.fillRect(gx, b - fh - th + 2, 3, 6); g.fillStyle = ['#c8283c', '#f6c94e', '#35d49a'][i % 3]; g.fillRect(gx, b - fh - th + 5, 3, 3); }
    } else if (st === 'cage') {
      g.fillStyle = '#d9a441';
      for (let i = 2; i < w; i += 6) g.fillRect(x + i, b - fh - th - 34, 1.4, 34);
      g.fillRect(x, b - fh - th - 36, w, 3); g.fillRect(x, b - fh - th - 1, w, 2);
      for (let i = 0; i < 2; i++) { g.fillStyle = '#0a0806'; g.fillRect(x + 22 + i * 80, b - fh - th - 22, 26, 14); g.strokeStyle = '#d9a441'; g.strokeRect(x + 22 + i * 80, b - fh - th - 22, 26, 14); }
      g.font = `800 8px ${FONT}`; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillStyle = '#ffe08a'; g.fillText('CASHIER · 兑换', x + w / 2, b - fh / 2);
    } else if (st === 'club') {
      g.font = `800 8px ${FONT}`; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillStyle = '#ffe08a'; g.fillText('PLAYERS CLUB · 会员', x + w / 2, b - fh / 2);
      ['#b0b8c0', '#d9a441', '#e8e2d4', '#14110f'].forEach((c, i) => { g.fillStyle = c; g.fillRect(x + 14 + i * 26, b - fh - th + 3, 14, 9); g.strokeStyle = '#d9a441'; g.lineWidth = 0.6; g.strokeRect(x + 14 + i * 26, b - fh - th + 3, 14, 9); });
    } else if (st === 'lotto') {
      g.font = `800 9px ${FONT}`; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillStyle = '#ffe08a';
      g.fillText(I18N.lang === 'zh' ? '福利彩票 · 体育彩票 · POWERBALL' : 'LOTTO · POWERBALL · MEGA MILLIONS · 双色球', x + w / 2, b - fh / 2);
      for (let i = 0; i < 6; i++) { g.fillStyle = i === 5 ? '#3b7be0' : '#e8364f'; g.beginPath(); g.arc(x + 30 + i * 12, b - fh - th / 2, 3.6, 0, TAU); g.fill(); }
    } else if (st === 'glass') {
      g.strokeStyle = 'rgba(255,255,255,.4)'; g.lineWidth = 0.8; g.strokeRect(x + 0.5, b - fh - th, w - 1, fh + th - 2);
      g.fillStyle = '#f6c94e'; for (let i = 0; i < 4; i++) { g.beginPath(); g.arc(x + 18 + i * 28, b - fh + 8, 3, 0, TAU); g.fill(); }
    } else {
      g.fillStyle = 'rgba(217,164,65,.3)'; g.fillRect(x + 6, b - fh + 6, w - 12, 1); g.fillStyle = '#f3ead3'; g.fillRect(x + w / 2 - 6, b - fh - th + 3, 12, 6); g.fillStyle = '#d9a441'; g.fillRect(x + w / 2 + 12, b - fh - th + 2, 3, 6);
    }
  }
  function fountainDraw(o, x, y, w, b, tm) {
    const cx = x + w / 2, cy = y + o.h * T / 2 + 6, rx = w / 2 + 6, ry = o.h * T / 2 + 2;
    ell(cx, cy + 10, rx + 6, ry + 4, 'rgba(0,0,0,.35)');
    ell(cx, cy + 8, rx, ry, '#8a7a62'); ell(cx, cy, rx, ry, lg(0, cy - ry, 0, cy + ry, [[0, '#efe4cc'], [1, '#a8987a']]));
    g.strokeStyle = '#d9a441'; g.lineWidth = 1.5; g.stroke();
    ell(cx, cy, rx - 9, ry - 7, lg(0, cy - ry, 0, cy + ry, [[0, '#1d6f86'], [1, '#0b3a4e']]));
    g.save(); g.beginPath(); g.ellipse(cx, cy, rx - 9, ry - 7, 0, 0, TAU); g.clip();
    for (let i = 0; i < 3; i++) { const p = ((tm * 0.35 + i / 3) % 1); g.strokeStyle = `rgba(200,240,255,${0.35 * (1 - p)})`; g.lineWidth = 1; ell(cx, cy + 4, 20 + p * (rx - 20), 8 + p * (ry - 12)); g.stroke(); }
    for (let i = 0; i < 26; i++) { const r2 = seeded(i + 11), a0 = r2() * TAU, rd = 0.35 + r2() * 0.55; g.fillStyle = r2() < 0.8 ? '#f6c94e' : '#d8dce2'; g.fillRect(cx + Math.cos(a0) * (rx - 14) * rd, cy + Math.sin(a0) * (ry - 10) * rd, 2.4, 1.6); }
    g.restore();
    // pedestal and the golden treasure bowl
    g.fillStyle = lg(cx - 8, 0, cx + 8, 0, [[0, '#8a7a62'], [0.5, '#efe4cc'], [1, '#8a7a62']]); g.fillRect(cx - 7, cy - 44, 14, 44);
    const by = cy - 52;
    g.fillStyle = lg(cx - 24, 0, cx + 24, 0, [[0, '#8a5a17'], [0.35, '#ffe08a'], [0.6, '#f6c94e'], [1, '#8a5a17']]);
    g.beginPath(); g.moveTo(cx - 26, by - 10); g.quadraticCurveTo(cx - 24, by + 12, cx, by + 13); g.quadraticCurveTo(cx + 24, by + 12, cx + 26, by - 10); g.closePath(); g.fill();
    ell(cx, by - 10, 26, 6, '#fff3c0'); ell(cx, by - 10, 22, 4.4, '#c8901c');
    [[-12, -16], [0, -21], [12, -16], [-5, -13], [7, -12]].forEach(([dx, dy], i) => {
      g.fillStyle = i % 2 ? '#ffe08a' : '#f6c94e'; g.beginPath(); g.ellipse(cx + dx, by + dy, 7, 3.6, 0, 0, TAU); g.fill();
      g.fillStyle = '#fff3c0'; g.beginPath(); g.ellipse(cx + dx, by + dy - 2.6, 3, 2.4, 0, 0, TAU); g.fill();
    });
    g.fillStyle = '#c8283c'; g.font = `400 9px ${FONT}`; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('聚宝', cx, by + 3);
    // water arcs
    g.lineWidth = 1.6; g.setLineDash([4, 5]); g.lineDashOffset = -tm * 30;
    for (let i = 0; i < 8; i++) {
      const a0 = i * TAU / 8 + 0.2, ex = cx + Math.cos(a0) * (rx - 18), ey = cy + Math.sin(a0) * (ry - 12), sx = cx + Math.cos(a0) * 20, sy = by - 8;
      g.strokeStyle = 'rgba(190,235,255,.65)'; g.beginPath(); g.moveTo(sx, sy); g.quadraticCurveTo((sx + ex) / 2 + Math.cos(a0) * 10, sy - 26, ex, ey); g.stroke();
    }
    g.setLineDash([]);
  }

  /* ---------- walls ---------- */
  function drawWall(x, y, tm) {
    const px = x * T, py = y * T, front = !(y + 1 < H && wall[id(x, y + 1)]);
    g.fillStyle = '#1e0f08'; g.fillRect(px, py - WH, T, T);
    g.fillStyle = '#d9a441';
    if (!isWall(x - 1, y)) g.fillRect(px, py - WH, 1.5, T);
    if (!isWall(x + 1, y)) g.fillRect(px + T - 1.5, py - WH, 1.5, T);
    if (!isWall(x, y - 1)) g.fillRect(px, py - WH, T, 1.5);
    if (front) {
      const fy = py + T - WH;
      g.fillStyle = lg(0, fy, 0, py + T, [[0, '#3b1c0c'], [0.55, '#28120a'], [1, '#140904']]); g.fillRect(px, fy, T, WH);
      g.fillStyle = '#d9a441'; g.fillRect(px, fy, T, 2); g.fillRect(px, py + T - 7, T, 1);
      g.fillStyle = '#0c0604'; g.fillRect(px, py + T - 6, T, 6);
      g.strokeStyle = 'rgba(217,164,65,.22)'; g.lineWidth = 1; g.strokeRect(px + 4.5, fy + 8.5, T - 9, WH - 20);
    }
  }
  function drawDecor(dc, tm) {
    const [row, x0, x1, kind, arg] = dc, px = x0 * T, w = (x1 - x0 + 1) * T, fy = (row + 1) * T - WH, cx = px + w / 2;
    g.textAlign = 'center'; g.textBaseline = 'middle';
    switch (kind) {
      case 'sign': {
        const neon = { cardroom: '#ff5a6e', bar: '#6fe0ff', vip: '#ffe08a', slots: '#ff7ad9', pit: '#5affb4', restaurant: '#ffb85a', cage: '#ffe08a', club: '#c58cff', boutique: '#fff3c0', hotel: '#9fd0ff' }[arg] || '#ffe08a';
        g.fillStyle = 'rgba(6,3,2,.95)'; rr(px + 4, fy + 6, w - 8, WH - 16, 6); g.fill(); g.strokeStyle = '#d9a441'; g.lineWidth = 1.2; g.stroke();
        g.font = `800 ${Math.min(17, (w - 16) / Math.max(2, t('zone.' + arg).length) * 1.1)}px ${FONT}`; g.fillStyle = neon;
        const fl = ((tm * 3 + x0) | 0) % 37 === 0 ? 0.4 : 1;
        g.globalAlpha = fl; g.shadowColor = neon; g.shadowBlur = 12; g.fillText(t('zone.' + arg), cx, fy + WH / 2 - 5); g.shadowBlur = 0; g.globalAlpha = 1;
        break;
      }
      case 'lanterns':
        for (let i = 0; i < (x1 - x0 + 1); i += 2) {
          const lx = px + i * T + T, sw = Math.sin(tm * 1.3 + i) * 1.5;
          g.strokeStyle = '#3a2405'; g.lineWidth = 1; g.beginPath(); g.moveTo(lx, fy); g.lineTo(lx + sw, fy + 10); g.stroke();
          ell(lx + sw, fy + 20, 9, 11, '#c8132c'); g.fillStyle = '#f6c94e'; g.fillRect(lx + sw - 5, fy + 8, 10, 2.5); g.fillRect(lx + sw - 5, fy + 29, 10, 2.5);
          g.fillStyle = 'rgba(255,220,120,.6)'; g.font = `400 8px ${FONT}`; g.fillText('福', lx + sw, fy + 20);
          g.strokeStyle = '#f6c94e'; g.beginPath(); g.moveTo(lx + sw, fy + 31); g.lineTo(lx + sw, fy + 38); g.stroke();
        }
        break;
      case 'bottles':
        for (let s = 0; s < 3; s++) {
          g.fillStyle = '#5a3418'; g.fillRect(px + 2, fy + 12 + s * 11, w - 4, 2);
          for (let i = 0; i < (w - 8) / 7; i++) { const c = ['#2a6a3a', '#7a3a14', '#c8a050', '#3a2a5a', '#9a1a2a', '#e8e2d4'][(i * 7 + s * 3) % 6]; g.fillStyle = c; g.fillRect(px + 6 + i * 7, fy + 4 + s * 11, 4, 8); g.fillRect(px + 7 + i * 7, fy + 1 + s * 11, 2, 3); }
        }
        break;
      case 'dragon': {
        g.fillStyle = lg(0, fy, 0, fy + WH, [[0, '#7a0f1c'], [1, '#3a0610']]); g.fillRect(px + 2, fy + 2, w - 4, WH - 8);
        g.strokeStyle = '#f6c94e'; g.lineWidth = 1.6; g.strokeRect(px + 4, fy + 4, w - 8, WH - 12);
        g.strokeStyle = 'rgba(246,201,78,.55)'; g.lineWidth = 2.4; g.beginPath();
        for (let i = 0; i <= 40; i++) { const q = i / 40, dx = px + 14 + q * (w - 28), dy = fy + WH / 2 - 4 + Math.sin(q * 9 + tm * 0.6) * 8; i ? g.lineTo(dx, dy) : g.moveTo(dx, dy); }
        g.stroke(); g.font = `400 22px ${FONT}`; g.fillStyle = '#ffe08a'; g.shadowColor = '#f6c94e'; g.shadowBlur = 10; g.fillText('龍', cx, fy + WH / 2 - 4); g.shadowBlur = 0;
        break;
      }
      case 'fu': for (let i = 0; i < 3; i++) { const fx = px + T + i * T * 2.3; g.save(); g.translate(fx, fy + 18); g.rotate(Math.PI / 4); g.fillStyle = '#b8132c'; g.fillRect(-11, -11, 22, 22); g.restore(); g.font = `400 15px ${FONT}`; g.fillStyle = '#f6c94e'; g.save(); g.translate(fx, fy + 18); g.rotate(Math.PI); g.fillText('福', 0, 0); g.restore(); } break;
      case 'marquee': {
        g.fillStyle = '#05080a'; rr(px + 4, fy + 6, w - 8, WH - 16, 4); g.fill(); g.strokeStyle = '#d9a441'; g.lineWidth = 1; g.stroke();
        const txt = t(arg === 'slots' ? 'fl.marquee.slots' : 'fl.marquee.pit');
        g.save(); g.beginPath(); g.rect(px + 6, fy + 8, w - 12, WH - 20); g.clip();
        g.font = `800 13px ${FONT}`; g.textAlign = 'left'; g.fillStyle = arg === 'slots' ? '#ff7ad9' : '#5affb4';
        const tw = g.measureText(txt).width + 60, off = (tm * 40) % tw;
        for (let k = -1; k < 3; k++) g.fillText(txt, px + 8 - off + k * tw, fy + WH / 2 - 5);
        g.restore();
        break;
      }
      case 'jackpot': {
        g.fillStyle = '#05080a'; rr(px + 2, fy - 22, w - 4, WH + 12, 6); g.fill(); g.strokeStyle = '#f6c94e'; g.lineWidth = 2; g.stroke();
        g.font = `800 10px ${FONT}`; g.fillStyle = '#ffe08a'; g.fillText(t('floor.jp'), cx, fy - 12);
        const jp = (window.Casino && Casino.Jackpots.values) || {};
        ['grand', 'major', 'minor', 'mini'].forEach((k, i) => {
          const colx = px + 14 + i * (w - 28) / 4 + (w - 28) / 8;
          g.font = `700 8px ${FONT}`; g.fillStyle = ['#ff5a6e', '#c58cff', '#5ab0ff', '#5affb4'][i]; g.fillText(t('tb.jp.' + k), colx, fy + 2);
          g.font = `800 12px ${FONT}`; g.fillStyle = '#fff3c0'; g.shadowColor = '#f6c94e'; g.shadowBlur = 6; g.fillText(U.fmt(Math.floor(jp[k] || 0)), colx, fy + 16); g.shadowBlur = 0;
        });
        for (let i = 0; i < 40; i++) { g.fillStyle = ((tm * 8 | 0) + i) % 4 ? 'rgba(246,201,78,.3)' : '#fff3c0'; g.fillRect(px + 8 + i * (w - 16) / 40, fy + 26, 3, 2); }
        break;
      }
      case 'menu': g.fillStyle = '#14110f'; rr(px + 6, fy + 4, w - 12, WH - 12, 4); g.fill(); g.strokeStyle = '#d9a441'; g.stroke(); g.font = `700 9px ${FONT}`; g.fillStyle = '#ffe08a'; g.fillText(t('fl.menuBoard'), cx, fy + 12); g.font = `500 7px ${FONT}`; g.fillStyle = '#e8e2d4'; g.fillText(t('fl.menuLine'), cx, fy + 24); break;
      case 'results': {
        g.fillStyle = '#0a0806'; rr(px + 4, fy - 4, w - 8, WH, 5); g.fill(); g.strokeStyle = '#f6c94e'; g.lineWidth = 1.4; g.stroke();
        const R = (window.Lottery && Lottery.board && Lottery.board()) || [['双色球', [3, 8, 12, 19, 26, 31], [7]], ['POWERBALL', [5, 18, 33, 47, 62], [11]]];
        R.slice(0, 2).forEach(([name, main, extra], r) => {
          const ry = fy + 6 + r * 17; g.font = `800 8px ${FONT}`; g.textAlign = 'left'; g.fillStyle = '#ffe08a'; g.fillText(name, px + 10, ry + 1);
          [...main, ...extra].forEach((n, i) => { const bx = px + 86 + i * 17; g.fillStyle = i >= main.length ? '#3b7be0' : '#e8364f'; g.beginPath(); g.arc(bx, ry, 6.5, 0, TAU); g.fill(); g.fillStyle = '#fff'; g.textAlign = 'center'; g.font = `800 7px ${FONT}`; g.fillText(String(n).padStart(2, '0'), bx, ry + 0.5); });
        });
        break;
      }
    }
  }
  function drawPlaque(pq, tm) {
    const [row, x0, x1, z] = pq, cx = (x0 + x1 + 1) / 2 * T, py = (row + 1) * T - WH - 10;
    const txt = t('zone.' + z);
    g.font = `800 10px ${FONT}`; const tw = g.measureText(txt).width + 16;
    g.strokeStyle = '#8a5a17'; g.lineWidth = 1; g.beginPath(); g.moveTo(cx - tw / 2 + 4, py - 8); g.lineTo(cx - tw / 2 + 4, py - 16); g.moveTo(cx + tw / 2 - 4, py - 8); g.lineTo(cx + tw / 2 - 4, py - 16); g.stroke();
    g.fillStyle = '#0a0604'; rr(cx - tw / 2, py - 8, tw, 16, 4); g.fill(); g.strokeStyle = '#d9a441'; g.stroke();
    g.fillStyle = '#ffe08a'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(txt, cx, py);
  }

  /* ================= particles & bubbles ================= */
  const PARTS = [];
  function coins(wx, wy, n = 14, color = '#f6c94e') {
    if (U.reduced) n = Math.min(n, 4);
    for (let i = 0; i < n; i++) PARTS.push({ x: wx, y: wy, z: 20, vx: U.rand(-40, 40), vy: U.rand(-14, 14), vz: U.rand(60, 150), life: 1.4, c: color, s: U.rand(2, 3.4) });
  }
  function sparkle(wx, wy, n = 6, color = '#fff3c0') { for (let i = 0; i < n; i++) PARTS.push({ x: wx + U.rand(-10, 10), y: wy, z: U.rand(10, 50), vx: U.rand(-8, 8), vy: 0, vz: U.rand(5, 25), g: 0, life: 0.9, c: color, s: 1.6, star: 1 }); }
  function updParts(dt) {
    for (let i = PARTS.length - 1; i >= 0; i--) {
      const p = PARTS[i]; p.life -= dt; if (p.life <= 0) { PARTS.splice(i, 1); continue; }
      p.x += p.vx * dt; p.y += p.vy * dt; p.z += p.vz * dt; p.vz -= (p.g == null ? 320 : p.g) * dt;
      if (p.z < 0) { p.z = 0; p.vz *= -0.4; p.vx *= 0.6; }
    }
  }
  function drawParts() {
    for (const p of PARTS) {
      g.globalAlpha = Math.min(1, p.life * 2);
      if (p.star) { g.fillStyle = p.c; g.fillRect(p.x - p.s, p.y - p.z - 0.4, p.s * 2, 0.8); g.fillRect(p.x - 0.4, p.y - p.z - p.s, 0.8, p.s * 2); }
      else { ell(p.x, p.y - p.z, p.s, p.s * 0.85, p.c); g.fillStyle = '#fff8d0'; g.fillRect(p.x - 0.8, p.y - p.z - 1, 1.2, 1.2); }
    }
    g.globalAlpha = 1;
  }
  function say(a, text, dur = 3) {
    if (!a || !text) return;
    a.bubble = { text: String(text), t0: now, dur: dur + String(text).length * 0.04 };
  }

  /* ================= state, input, behaviour ================= */
  let now = 0, last = 0, raf = 0, running = false, busy = false, intro = false;
  let hover = null, prompt = null, target = null, pending = null, lastZone = null, zoneT = 0, lastSpot = null;
  const keys = new Set();
  const svc = id => {
    if (id === 'wheel') return Floor.hooks.wheel && Floor.hooks.wheel();
    if (id === 'piano') return playPiano();
    if (window.Services && Services.open) return Services.open(id);
    C.toast(t('fl.soon'), '');
  };
  // which games in this build can be opened from a spot
  const gameId = gid => gid === 'vip' ? (C.games.vipzjh ? 'vipzjh' : 'zhajinhua') : gid;

  function vipOK() {
    try { if (window.Services && Services.tier && Services.tier() >= 2) return true; } catch (e) { /* ignore */ }
    return C.S.balance >= 200000;
  }

  function activate(s) {
    if (!s || busy) return;
    if (s.kind === 'game') {
      if (s.busy) { const alt = freeSpot(s.game, s); if (alt) { say(s.busy, U.pick(lines('fl.taken'))); go(alt); } return; }
      enterGame(gameId(s.game), s);
    } else if (s.kind === 'svc') { lastSpot = s; Sound.fx.open(); svc(s.svc); }
    else if (s.kind === 'fn') { lastSpot = s; svc(s.fn); }
    else if (s.kind === 'npc') talkTo(s.npc);
  }
  function freeSpot(game, near) {
    let best = null, bd = 1e9;
    for (const s of SPOTS) if (s.kind === 'game' && s.game === game && !s.busy) { const d = Math.hypot(s.x - near.x, s.y - near.y); if (d < bd) { bd = d; best = s; } }
    return best;
  }
  function go(s, run) {
    pending = s; target = { x: s.x, y: s.y };
    you.run = !!run;
    if (!route(you, s.ux, s.uy)) { pending = null; target = null; }
  }
  async function enterGame(gid, s) {
    if (!C.games[gid]) { C.toast(t('fl.soon')); return; }
    busy = true; lastSpot = s;
    you.dir = s.face; Sound.fx.whoosh(true, 0.35);
    const fade = wrap.querySelector('.fl-fade');
    const z0 = cam.z;
    const fx = s.obj ? (s.obj.x + s.obj.w / 2) * T : s.x, fy = s.obj ? s.obj.base - 30 : s.y;
    fade.classList.add('on');
    await U.tween(U.reduced ? 120 : 520, e => { cam.z = z0 * (1 + e * 0.9); cam.x = U.lerp(cam.x, fx, e * 0.4); cam.y = U.lerp(cam.y, fy, e * 0.4); }, U.ease.inOutCubic);
    busy = false; cam.z = z0;
    C.go(gid);
  }
  function talkTo(a) {
    a.dir = faceTo(a, you); you.dir = faceTo(you, a);
    const k = a.talk;
    if (a.persona) return persona(a);
    if (k === 'guard') return guardTalk();
    if (k === 'waitress') return offerDrink(a);
    const map = { bartender: 'bar', cashier: 'cage', club: 'club', host: 'restaurant', chef: 'restaurant', lotto: 'lottery', concierge: 'concierge', shop: 'shop', hotel: 'hotel', bell: 'hotel', doorman: 'exit', pianist: 'piano', dealer: null };
    if (k === 'dealer') { say(a, U.pick(lines('fl.chat.dealer'))); const s = SPOTS.find(q => q.kind === 'game' && q.game === a.game && Math.hypot(q.x - a.x, q.y - a.y) < 4 * T); if (s) setTimeout(() => go(s), 600); return; }
    if (map[k]) { say(a, U.pick(lines('fl.hi.' + k))); setTimeout(() => svc(map[k]), 450); return; }
    const pool = (Floor.talkHook && Floor.talkHook(a)) || lines('fl.chat.' + (k || 'walk'));
    say(a, U.pick(pool));
    if (window.Services && Services.react) Services.react('talk', a);
  }
  function persona(a) {
    const P = Engines.Brain.PERSONAS[a.persona]; if (!P) return;
    say(a, U.pick(lines('fl.p.' + a.persona)));
    const gid = gameId(a.game);
    const body = U.h('div', { class: 'pv-profile' },
      U.h('div', { class: 'pv-av big', style: `--c:${P.color}` }, P.av),
      U.h('p', null, P.bio[I18N.lang] || P.bio.en),
      U.h('dl', { class: 'stats-grid' },
        U.h('dt', null, t('pv.style')), U.h('dd', null, t(P.aggr > 0.55 ? 'pv.loose' : P.aggr < 0.4 ? 'pv.tight' : 'pv.steady')),
        U.h('dt', null, t('pv.bluffs')), U.h('dd', null, '●'.repeat(Math.round(P.bluff * 10) || 1)),
        U.h('dt', null, t('fl.plays')), U.h('dd', null, t('game.' + (a.game === 'vip' ? 'zhajinhua' : a.game)))));
    C.modal({ title: P.name[I18N.lang] || P.name.en, body, actions: [
      { label: t('fl.later'), onClick: c => c() },
      { label: t('fl.sit'), primary: true, onClick: c => { c(); const s = SPOTS.find(q => q.kind === 'game' && q.game === a.game && Math.hypot(q.x - a.x, q.y - a.y) < 5 * T); if (s) { if (Math.hypot(you.x - s.x, you.y - s.y) < 1.5 * T) enterGame(gid, s); else go(s); } } }
    ] });
  }
  let guardSaid = 0;
  function guardTalk() {
    if (gateOpen) { say(guard, t('fl.guard.yes')); return; }
    say(guard, t('fl.guard.no'), 4);
    if (now - guardSaid > 6) { guardSaid = now; Sound.say(t('fl.guard.no'), { pitch: 0.7 }); }
  }
  let drinkCD = 25;
  function offerDrink(w) {
    say(w, t('fl.drink.offer'), 4);
    Sound.say(t('fl.drink.offer'), { female: true, pitch: 1.15 });
    if (window.Services && Services.freeDrink) setTimeout(() => Services.freeDrink(w), 500);
    drinkCD = now + 70;
  }
  function playPiano() {
    const p = ACT.find(a => a.pianist);
    say(p, U.pick(lines('fl.chat.pianist')));
    Sound.setMusic(!Sound.state.music); Sound.unlock();
    C.toast(t(Sound.state.music ? 'fl.music.on' : 'fl.music.off'));
  }
  const faceTo = (a, b) => { const dx = b.x - a.x, dy = b.y - a.y; return Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 3 : 2) : (dy > 0 ? 0 : 1); };

  function stepActor(a, dt) {
    if (!a.path || !a.path.length) { a.moving = false; return; }
    const p = a.path[0], dx = p.x - a.x, dy = p.y - a.y, d = Math.hypot(dx, dy);
    let sp = a.speed * T * (a.run ? 1.6 : 1);
    if (a.you) sp *= vitSpeed();
    if (d < sp * dt || d < 0.5) { a.x = p.x; a.y = p.y; a.path.shift(); if (!a.path.length) { a.moving = false; a.path = null; a.arrive && a.arrive(); } return; }
    a.x += dx / d * sp * dt; a.y += dy / d * sp * dt;
    a.dir = Math.abs(dx) > Math.abs(dy) * 1.1 ? (dx > 0 ? 3 : 2) : (dy > 0 ? 0 : 1);
    a.moving = true; a.wp += dt * sp / 5.2;
  }
  function vitSpeed() { try { return window.Services && Services.vit ? Services.vit().speed : 1; } catch (e) { return 1; } }

  const VIEWZ = ['slots', 'atrium', 'pit', 'entrance', 'bar', 'cardroom', 'restaurant', 'lottery', 'cage'];
  function think(a, dt) {
    if (a.kind === 'wander') {
      if (!a.path && now > a.next) {
        const zid = a.zone || U.pick(VIEWZ), z = ZONES.find(q => q.id === zid);
        const p = randomTileIn(z, 10);
        if (p && route(a, p[0] + U.rand(0.3, 0.7), p[1] + U.rand(0.3, 0.7))) a.arrive = () => { a.next = now + U.rand(2, 9); if (Math.random() < 0.3) a.dir = U.randInt(0, 3); };
        else a.next = now + 1;
      }
    } else if (a.kind === 'waitress') {
      const dp = Math.hypot(a.x - you.x, a.y - you.y);
      if (!a.path && !a.serving && now > drinkCD && dp < 7 * T && !you.moving && !busy && !document.querySelector('.modal-ov') && zoneOf(you) !== 'vip') {
        a.serving = true;
        route(a, you.x / T + (you.x > a.x ? -0.9 : 0.9), you.y / T + 0.1);
        a.arrive = () => { a.dir = faceTo(a, you); offerDrink(a); a.next = now + 6; a.serving = false; };
      } else if (!a.path && now > a.next) {
        const zid = U.pick(['slots', 'pit', 'atrium', 'bar', 'slots']), z = ZONES.find(q => q.id === zid);
        const p = randomTileIn(z, 10); if (p) route(a, p[0] + 0.5, p[1] + 0.5);
        a.arrive = () => { a.next = now + U.rand(3, 7); };
      }
    } else if (a.patrol && !a.path && now > a.next) {
      route(a, U.rand(a.patrol[0], a.patrol[1]), a.y / T); a.arrive = () => { a.dir = 0; a.next = now + U.rand(3, 8); };
    } else if (a.machine) {
      const m = a.machine;
      if (now > a.next) {
        m.spinT = now; a.next = now + U.rand(2.2, 5);
        if (near(a, 9)) { const [pan, v] = pos(a); Sound.fx.slotSpin && Sound.fx.slotSpin(pan, v * 0.5); }
        setTimeout(() => { m.sym = [0, 1, 2].map(() => U.randInt(0, 5)); if (Math.random() < 0.12) slotWin(a, Math.round(U.pick([50, 100, 200, 500]) * U.pick([2, 3, 5, 8, 12]))); }, 1100);
      }
    }
  }
  function slotWin(a, amt, big) {
    const m = a.machine; if (!m) return;
    m.winT = now; a.cheerT = now;
    m.sym = [U.randInt(0, 5)]; m.sym.push(m.sym[0], m.sym[0]);
    if (near(a, 14)) {
      coins(a.x, m.base - 30, big ? 26 : 10);
      say(a, (big ? '★ ' : '') + '+' + U.fmt(amt) + ' ' + U.pick(lines('fl.chat.slotwin')), 2.5);
      const [pan, v] = pos(a); Sound.fx.slotWin && Sound.fx.slotWin(pan, v, big);
    }
  }
  const near = (a, tiles) => Math.hypot(a.x - you.x, a.y - you.y) < tiles * T;
  const pos = a => [U.clamp((a.x - cam.x) / (vw / 2 / scale()), -1, 1) * 0.8, U.clamp(1 - Math.hypot(a.x - you.x, a.y - you.y) / (14 * T), 0, 1)];
  const zoneOf = a => { const z = zoneAt(Math.floor(a.x / T), Math.floor(a.y / T)); return z ? z.id : null; };

  // the floor feed (main.js) tells us who just won what; show it on the floor
  addEventListener('floorwin', e => {
    if (!running) return;
    const w = e.detail, cands = ACT.filter(a => a.game === w.g && a.kind === 'seated');
    const a = cands.length ? U.pick(cands) : null;
    if (a && a.machine) slotWin(a, w.amt, w.mult >= 50);
    else if (a) { a.cheerT = now; if (near(a, 14)) { say(a, '+' + U.fmt(w.amt) + ' ' + U.pick(lines('fl.chat.tablewin')), 2.5); coins(a.x, a.y - 20, 8); } }
    else if (w.g === 'crash') { const c = OBJ.find(o => o.kind === 'crash'); if (c) sparkle((c.x + 1.5) * T, c.base - 40, 10, '#5affb4'); }
    tick(w);
  });
  function tick(w) {
    const el = wrap && wrap.querySelector('.fl-ticker span'); if (!el) return;
    const names = t('floor.names').split(',');
    el.textContent = `${w.you ? t('floor.you') : names[w.who % names.length]} ${t('floor.won', { g: t('game.' + w.g) })} +${U.fmt(w.amt)}${w.mult >= 2 ? ' ×' + w.mult : ''}`;
    el.parentNode.classList.remove('pop'); void el.offsetWidth; el.parentNode.classList.add('pop');
  }

  // ambient chatter
  let chatT = 2;
  function chatter() {
    if (now < chatT) return;
    chatT = now + U.rand(1.6, 3.6);
    const vis = ACT.filter(a => !a.you && !a.bubble && near(a, 11) && a.talk);
    if (!vis.length) return;
    const a = U.pick(vis);
    if (a.persona) { say(a, U.pick(lines('fl.p.' + a.persona))); return; }
    const k = { slot: 'slot', table: 'table', card: 'card', dealer: 'dealer', bar: 'bar', din: 'din', walk: 'walk', waitress: 'waitress', pitboss: 'pitboss', bodyguard: 'vip', vipguest: 'vip', lottoguy: 'lottoguy' }[a.talk];
    if (k) say(a, U.pick(lines('fl.chat.' + k)));
  }

  /* ================= frame ================= */
  const scale = () => cam.base * cam.z;
  function resize() {
    if (!cv) return;
    const r = wrap.getBoundingClientRect();
    vw = Math.max(1, r.width); vh = Math.max(1, r.height);
    dpr = Math.min(devicePixelRatio || 1, 2);
    cv.width = Math.round(vw * dpr); cv.height = Math.round(vh * dpr);
    cam.base = U.clamp(Math.min(vw / 24, vh / 15), 24, 46) / T;
  }
  function frame(ts) {
    raf = 0;
    if (!running) return;
    const dt = Math.min(0.05, (ts - last) / 1000 || 0.016); last = ts; now += dt;
    update(dt); render();
    raf = requestAnimationFrame(frame);
  }
  function update(dt) {
    // keyboard walking
    let kx = 0, ky = 0;
    if (!busy && !intro && !document.querySelector('.modal-ov, .tut-ov')) {
      if (keys.has('arrowleft') || keys.has('a')) kx--; if (keys.has('arrowright') || keys.has('d')) kx++;
      if (keys.has('arrowup') || keys.has('w')) ky--; if (keys.has('arrowdown') || keys.has('s')) ky++;
    }
    if (kx || ky) {
      you.path = null; pending = null; target = null;
      const n = Math.hypot(kx, ky), sp = you.speed * T * (keys.has('shift') ? 1.6 : 1) * vitSpeed() * dt;
      const r = 0.26 * T, free = (px, py) => walkable(Math.floor((px - r) / T), Math.floor((py - r * 0.6) / T)) && walkable(Math.floor((px + r) / T), Math.floor((py - r * 0.6) / T)) && walkable(Math.floor((px - r) / T), Math.floor((py + r * 0.4) / T)) && walkable(Math.floor((px + r) / T), Math.floor((py + r * 0.4) / T));
      const nx = you.x + kx / n * sp, ny = you.y + ky / n * sp;
      if (free(nx, you.y)) you.x = nx; if (free(you.x, ny)) you.y = ny;
      you.dir = kx && Math.abs(kx) >= Math.abs(ky) ? (kx > 0 ? 3 : 2) : (ky > 0 ? 0 : 1);
      you.moving = true; you.wp += sp / 5.2;
    } else if (!you.path) you.moving = false;
    const wasMoving = you.moving;
    for (const a of ACT) { stepActor(a, dt); if (!a.you) think(a, dt); if (a.bubble && now - a.bubble.t0 > a.bubble.dur) a.bubble = null; }
    // footsteps
    if (you.moving) { const st = Math.floor(you.wp / Math.PI); if (st !== you.step) { you.step = st; Sound.fx.step && Sound.fx.step(['red', 'slots', 'pit', 'beige'].includes((ZONES.find(z => z.id === zoneOf(you)) || {}).fl) ? 0 : 1); } }
    // drunk sway
    const vit = window.Services && Services.vit ? Services.vit() : null;
    you.ox = vit && vit.drunk > 20 ? Math.sin(now * 1.7) * vit.drunk / 100 * 6 : 0;
    // arriving at a spot
    if (pending && !you.path && !wasMoving) {
      const s = pending; pending = null; target = null;
      if (Math.hypot(you.x - s.x, you.y - s.y) < s.r * T) { you.dir = s.face; activate(s); }
    }
    // VIP gate
    if ((now * 2 | 0) !== (update.g || 0)) { update.g = now * 2 | 0; const ok = vipOK(); if (ok !== gateOpen) gateOpen = ok; }
    if (!gateOpen && Math.hypot(you.x - 58.5 * T, you.y - 18.3 * T) < 1.8 * T && now - guardSaid > 7) { guardSaid = now; say(guard, t('fl.guard.no'), 4); }
    // zone banner
    const z = zoneOf(you);
    if (z && z !== lastZone) { lastZone = z; zoneBanner(z); }
    // prompt
    const p = nearestSpot();
    if (p !== prompt) { prompt = p; paintPrompt(); }
    chatter();
    updParts(dt);
    // camera
    const k = 1 - Math.exp(-dt * 5);
    if (!busy) { cam.x += (you.x - cam.x) * k; cam.y += (you.y - 20 - cam.y) * k; cam.z += (cam.zt - cam.z) * k; }
    clampCam();
    if ((now * 4 | 0) !== (update.m || 0)) { update.m = now * 4 | 0; drawMini(); }
    if ((now | 0) !== (update.p || 0)) { update.p = now | 0; paintPills(); }
  }
  function clampCam() {
    const s = scale(), hw = vw / 2 / s, hh = vh / 2 / s;
    cam.x = W * T < hw * 2 ? W * T / 2 : U.clamp(cam.x, hw, W * T - hw);
    cam.y = H * T < hh * 2 ? H * T / 2 : U.clamp(cam.y, hh - WH, H * T - hh);
  }
  function nearestSpot() {
    if (you.moving || busy) return null;
    let best = null, bd = 1e9;
    for (const s of SPOTS) {
      if (s.kind === 'game' && s.busy) continue;
      const d = Math.hypot(s.x - you.x, s.y - you.y);
      if (d < s.r * T && d < bd) { bd = d; best = s; }
    }
    if (best) return best;
    for (const a of ACT) {
      if (a.you || !a.talk) continue;
      const d = Math.hypot(a.x - you.x, a.y - you.y);
      if (d < 1.4 * T && d < bd) { bd = d; best = { kind: 'npc', npc: a, x: a.x, y: a.y }; }
    }
    return best;
  }

  function render() {
    const s = scale() * dpr, hw = vw / 2 / scale(), hh = vh / 2 / scale();
    const vx0 = cam.x - hw, vy0 = cam.y - hh, vx1 = cam.x + hw, vy1 = cam.y + hh;
    g.setTransform(1, 0, 0, 1, 0, 0);
    g.fillStyle = '#05030a'; g.fillRect(0, 0, cv.width, cv.height);
    g.setTransform(s, 0, 0, s, cv.width / 2 - cam.x * s, cv.height / 2 - cam.y * s);
    // floors
    for (const z of ZONES) {
      const [x0, y0, x1, y1] = z.r.map(v => v * T);
      if (x1 < vx0 || x0 > vx1 || y1 < vy0 || y0 > vy1) continue;
      g.fillStyle = PAT[z.fl]; g.fillRect(x0, y0, x1 - x0, y1 - y0);
    }
    floorDeco();
    // y-sorted world
    const list = [];
    const tx0 = Math.max(0, Math.floor(vx0 / T) - 1), tx1 = Math.min(W - 1, Math.ceil(vx1 / T) + 1), ty0 = Math.max(0, Math.floor(vy0 / T) - 1), ty1 = Math.min(H - 1, Math.ceil((vy1 + WH) / T) + 1);
    for (let y = ty0; y <= ty1; y++) for (let x = tx0; x <= tx1; x++) if (wall[id(x, y)]) list.push({ b: (y + 1) * T - 0.5, w: [x, y] });
    for (const dc of DECOR) if ((dc[0] + 1) * T > vy0 - 40 && dc[0] * T < vy1 + 60 && (dc[2] + 1) * T > vx0 && dc[1] * T < vx1) list.push({ b: (dc[0] + 1) * T - 0.2, d: dc });
    for (const o of OBJ) if ((o.x + o.w) * T > vx0 - 40 && o.x * T < vx1 + 40 && o.base > vy0 - 10 && o.base - 130 < vy1) list.push({ b: o.base, o });
    for (const a of ACT) if (a.x > vx0 - 30 && a.x < vx1 + 30 && a.y > vy0 - 10 && a.y < vy1 + 60) list.push({ b: a.y + (a.seated ? 0.3 : 0), a });
    list.sort((p, q) => p.b - q.b);
    for (const it of list) {
      if (it.w) drawWall(it.w[0], it.w[1], now);
      else if (it.d) drawDecor(it.d, now);
      else if (it.o) drawObj(it.o, now);
      else drawChar(it.a, now);
    }
    for (const pq of PLAQUES) drawPlaque(pq, now);
    // see yourself through walls
    g.globalAlpha = 0.28; drawChar(you, now); g.globalAlpha = 1;
    // target marker
    if (target) { const k2 = (now * 2) % 1; g.strokeStyle = `rgba(246,201,78,${1 - k2})`; g.lineWidth = 1.5; ell(target.x, target.y, 6 + k2 * 10, (6 + k2 * 10) * 0.4); g.stroke(); }
    if (prompt && prompt.kind !== 'npc') { const k2 = Math.sin(now * 5) * 0.5 + 0.5; g.strokeStyle = `rgba(246,201,78,${0.4 + k2 * 0.5})`; g.lineWidth = 1.8; ell(prompt.x, prompt.y, 13, 5.2); g.stroke(); }
    drawParts();
    // light
    lights(vx0, vy0, vx1, vy1);
    // screen-space text
    g.setTransform(dpr, 0, 0, dpr, 0, 0);
    labels();
  }
  function floorDeco() {
    // red runners: entrance to fountain, VIP door to table
    const runner = (x0, y0, x1, y1) => {
      g.fillStyle = '#6a0a14'; g.fillRect(x0, y0, x1 - x0, y1 - y0);
      g.fillStyle = '#d9a441'; g.fillRect(x0 + 3, y0, 2, y1 - y0); g.fillRect(x1 - 5, y0, 2, y1 - y0);
      g.fillStyle = 'rgba(246,201,78,.2)'; for (let y = y0 + 8; y < y1; y += 24) { g.save(); g.translate((x0 + x1) / 2, y); g.rotate(Math.PI / 4); g.fillRect(-4, -4, 8, 8); g.restore(); }
    };
    runner(34 * T, 31 * T, 38 * T, 55 * T); runner(57 * T, 10 * T, 60 * T, 18 * T);
    // atrium medallion around the fountain
    const cx = 36 * T, cy = 28 * T;
    g.strokeStyle = 'rgba(232,192,106,.6)'; g.lineWidth = 2; ell(cx, cy, 150, 110); g.stroke(); g.lineWidth = 1; ell(cx, cy, 160, 118); g.stroke();
    g.fillStyle = 'rgba(80,50,20,.25)'; g.beginPath();
    for (let i = 0; i < 32; i++) { const a0 = i * TAU / 32, r = i % 2 ? 150 : 128; g.lineTo(cx + Math.cos(a0) * r, cy + Math.sin(a0) * r * 0.73); }
    g.closePath(); g.fill();
    // door thresholds
    for (const [row, gaps] of [[17, D17], [39, D39]]) for (const [a, b] of gaps) { g.fillStyle = '#1a0f08'; g.fillRect(a * T, row * T, (b - a + 1) * T, T); g.fillStyle = 'rgba(217,164,65,.6)'; g.fillRect(a * T, row * T + 2, (b - a + 1) * T, 1.5); g.fillRect(a * T, row * T + T - 3, (b - a + 1) * T, 1.5); }
    [[28, 46, 48], [43, 46, 48]].forEach(([x, a, b]) => { g.fillStyle = '#1a0f08'; g.fillRect(x * T, a * T, T, (b - a + 1) * T); });
    // restaurant rugs
    for (const [x, y] of DINE) { g.fillStyle = 'rgba(120,20,30,.45)'; rr(x * T - 8, y * T - 18, 2 * T + 16, T + 30, 10); g.fill(); }
    // entrance glass doors on the outer wall (open during the intro)
    const op = U.clamp((now - doorsT) / 0.9, 0, 1) * (1 - U.clamp((now - doorsT - 3) / 0.9, 0, 1));
    const dx0 = 33 * T, dy = 55 * T - WH;
    g.fillStyle = 'rgba(255,240,210,.85)'; g.fillRect(dx0, dy, 6 * T, WH + T);
    g.fillStyle = 'rgba(150,200,230,.5)'; const pw = 3 * T * (1 - op * 0.85);
    g.fillRect(dx0, dy, pw, WH + T); g.fillRect(dx0 + 6 * T - pw, dy, pw, WH + T);
    g.strokeStyle = '#d9a441'; g.lineWidth = 2; g.strokeRect(dx0, dy, pw, WH + T); g.strokeRect(dx0 + 6 * T - pw, dy, pw, WH + T);
    g.font = `800 11px ${FONT}`; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillStyle = '#1a6a3a'; g.fillText(t('zone.exit'), 36 * T, dy + 10);
  }
  let doorsT = -99;
  function lights(vx0, vy0, vx1, vy1) {
    g.fillStyle = 'rgba(4,2,10,.30)'; g.fillRect(vx0 - 10, vy0 - 10, vx1 - vx0 + 20, vy1 - vy0 + 20);
    g.globalCompositeOperation = 'lighter';
    const on = (x, y, r) => x + r > vx0 && x - r < vx1 && y + r > vy0 && y - r < vy1;
    for (const [x, y, k] of LIGHTS) {
      const px = x * T, py = y * T, R = 230 * k;
      if (!on(px, py, R)) continue;
      lamp(px, py, R, 'rgba(255,196,110,.20)'); lamp(px, py - 40, 60 * k, 'rgba(255,230,170,.45)');
      for (let i = 0; i < 6; i++) { const a0 = i * TAU / 6 + now * 0.2, tw = (Math.sin(now * 3 + i * 2 + x) + 1) / 2; g.fillStyle = `rgba(255,250,220,${0.3 + tw * 0.6})`; const sx = px + Math.cos(a0) * 18 * k, sy = py - 40 + Math.sin(a0) * 7 * k; g.fillRect(sx - 2, sy - 0.4, 4, 0.8); g.fillRect(sx - 0.4, sy - 2, 0.8, 4); }
    }
    for (const [x, row] of SCONCE) { const px = x * T + 16, py = (row + 1) * T - WH + 14; if (on(px, py, 60)) { lamp(px, py, 46, 'rgba(255,190,100,.35)'); } }
    for (const o of OBJ) {
      const cx = (o.x + o.w / 2) * T;
      if (!on(cx, o.base - 40, 80)) continue;
      if (o.kind === 'slot') { const C = BANK[o.game], win = now - o.winT < 2.6; lamp(cx, o.base - 46, win ? 70 : 26, hexA(C.scr, win ? 0.6 : 0.32)); }
      else if (o.kind === 'fountain') { lamp(cx, o.base - 50, 130, 'rgba(120,220,255,.16)'); lamp(cx, o.base - 90, 60, 'rgba(255,220,120,.4)'); }
      else if (o.kind === 'crash') lamp(cx, o.base - 60, 70, 'rgba(90,255,180,.22)');
      else if (o.kind === 'wheel') lamp(cx, o.base - 56, 60, 'rgba(255,220,120,.3)');
      else if (o.kind.startsWith('t_') || o.kind === 'cardtable' || o.kind === 'mjtable' || o.kind === 'viptable') lamp(cx, o.base - 30, 90, 'rgba(255,230,180,.16)');
      else if (o.kind === 'tank') lamp(cx, o.base - 30, 70, 'rgba(80,170,255,.22)');
      else if (o.kind === 'counter' && o.style === 'bar') lamp(cx, o.base, 160, 'rgba(255,170,80,.16)');
      else if (o.kind === 'atm' || o.kind === 'kiosk') lamp(cx, o.base - 40, 34, 'rgba(111,183,255,.3)');
    }
    for (const dc of DECOR) {
      if (dc[3] !== 'sign' && dc[3] !== 'jackpot' && dc[3] !== 'marquee') continue;
      const px = (dc[1] + dc[2] + 1) / 2 * T, py = (dc[0] + 1) * T - WH / 2;
      if (on(px, py, 100)) lamp(px, py, dc[3] === 'jackpot' ? 150 : 70, dc[3] === 'jackpot' ? 'rgba(255,200,90,.3)' : 'rgba(255,150,200,.16)');
    }
    lamp(36 * T, 55 * T, 160, 'rgba(255,245,220,.35)');
    g.globalCompositeOperation = 'source-over';
  }
  function hexA(hex, a) { const n = parseInt(hex.slice(1), 16); return `rgba(${n >> 16},${(n >> 8) & 255},${n & 255},${a})`; }
  const toScreen = (wx, wy) => [(wx - cam.x) * scale() + vw / 2, (wy - cam.y) * scale() + vh / 2];
  function labels() {
    const sc = scale();
    g.textAlign = 'center'; g.textBaseline = 'middle';
    // regulars' names
    for (const a of ACT) {
      if (!a.persona || !near(a, 9)) continue;
      const P = Engines.Brain.PERSONAS[a.persona], [sx, sy] = toScreen(a.x, a.y - 50);
      const n = P.name[I18N.lang] || P.name.en;
      g.font = `800 11px ${FONT}`; const tw = g.measureText(n).width + 12;
      g.fillStyle = 'rgba(6,3,2,.8)'; rr(sx - tw / 2, sy - 8, tw, 16, 8); g.fill(); g.strokeStyle = P.color; g.lineWidth = 1; g.stroke();
      g.fillStyle = P.color; g.fillText(n, sx, sy);
    }
    // speech bubbles
    for (const a of ACT) {
      if (!a.bubble) continue;
      const age = now - a.bubble.t0, al = Math.min(1, age * 6, (a.bubble.dur - age) * 3);
      const [sx, sy] = toScreen(a.x, a.y - (a.seated ? 44 : 52) - (a.persona ? 14 : 0));
      if (sx < -100 || sx > vw + 100 || sy < -40 || sy > vh + 40) continue;
      g.globalAlpha = al;
      g.font = `600 ${a.you ? 13 : 12}px ${FONT}`;
      const words = wrapText(a.bubble.text, 170);
      const bw = Math.max(...words.map(w => g.measureText(w).width)) + 16, bh = words.length * 15 + 9;
      const by = sy - bh - 6 + (1 - Math.min(1, age * 5)) * 6;
      g.fillStyle = a.you ? 'rgba(246,201,78,.96)' : 'rgba(251,246,234,.95)'; rr(sx - bw / 2, by, bw, bh, 8); g.fill();
      g.beginPath(); g.moveTo(sx - 5, by + bh); g.lineTo(sx + 5, by + bh); g.lineTo(sx, by + bh + 6); g.fill();
      g.fillStyle = '#15110e'; words.forEach((w, i) => g.fillText(w, sx, by + 12 + i * 15));
      g.globalAlpha = 1;
    }
    // hovered or nearby spot label
    const lab = hover || (prompt && prompt.kind !== 'npc' ? prompt : null);
    if (lab && lab.kind !== 'npc') {
      const [sx, sy] = toScreen(lab.obj ? (lab.obj.x + lab.obj.w / 2) * T : lab.x, lab.obj ? lab.obj.base - lab.obj.sh - 10 : lab.y - 60);
      const n = spotName(lab); g.font = `800 12px ${FONT}`; const tw = g.measureText(n).width + 18;
      g.fillStyle = 'rgba(6,3,2,.88)'; rr(sx - tw / 2, sy - 11, tw, 22, 11); g.fill(); g.strokeStyle = '#f6c94e'; g.lineWidth = 1.2; g.stroke();
      g.fillStyle = '#ffe08a'; g.fillText(n, sx, sy);
    }
    void sc;
  }
  function wrapText(s, maxW) {
    const out = []; let cur = '';
    const parts = /\s/.test(s) && I18N.lang === 'en' ? s.split(/(\s+)/) : Array.from(s);
    for (const p of parts) { if (g.measureText(cur + p).width > maxW && cur) { out.push(cur.trim()); cur = p.trimStart(); } else cur += p; }
    if (cur.trim()) out.push(cur.trim());
    return out.slice(0, 4);
  }
  const spotName = s => s.kind === 'game' ? (s.game === 'vip' ? t('zone.vipTable') : t('game.' + s.game)) : t('svc.' + (s.svc || s.fn));

  /* ================= HUD ================= */
  const ICON = {
    map: '<path d="M4 6l5-2 6 2 5-2v14l-5 2-6-2-5 2z"/><path d="M9 4v14M15 6v14"/>',
    phone: '<rect x="7" y="2.5" width="10" height="19" rx="2.5"/><path d="M11 18.5h2"/>',
    cap: '<path d="M2 9l10-5 10 5-10 5z"/><path d="M6 11v5c3 2 9 2 12 0v-5"/>',
    bolt: '<path d="M13 3L5 13.5h6L10 21l9-11h-6z"/>',
    glass: '<path d="M7 3h10l-1 7a4 4 0 01-8 0z"/><path d="M12 14v6M8.5 20.5h7"/>',
    debt: '<path d="M12 3v18M17 7.5c-1-2-3-2.5-5-2.5-2.5 0-4.5 1.3-4.5 3.3 0 4.7 9.5 2.4 9.5 7.2 0 2-2 3.5-5 3.5-2.2 0-4.2-.8-5-2.8"/>',
    clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
    zoomIn: '<circle cx="11" cy="11" r="7"/><path d="M11 8v6M8 11h6M16.5 16.5L21 21"/>',
    zoomOut: '<circle cx="11" cy="11" r="7"/><path d="M8 11h6M16.5 16.5L21 21"/>'
  };
  const svg = n => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICON[n]}</svg>`;
  function mount(root) {
    if (wrap && root.contains(wrap)) { relabel(); return; }
    wrap = U.h('div', { class: 'fl-wrap' });
    wrap.innerHTML = `
      <canvas class="fl-cv" aria-label="${t('fl.aria')}" role="img"></canvas>
      <div class="fl-vig" aria-hidden="true"></div>
      <div class="fl-tl">
        <div class="fl-zone"><small></small><b></b></div>
        <div class="fl-pills"></div>
      </div>
      <div class="fl-ticker"><i class="live-dot"></i><span></span></div>
      <canvas class="fl-mini" width="216" height="168" aria-label="${t('fl.minimap')}"></canvas>
      <div class="fl-zbtns"><button class="icon-btn fl-zin" aria-label="+">${svg('zoomIn')}</button><button class="icon-btn fl-zout" aria-label="-">${svg('zoomOut')}</button></div>
      <div class="fl-prompt" hidden><div class="fp-t"><b></b><small></small></div><button class="btn btn-gold fp-go"></button></div>
      <div class="fl-dock">
        <button class="fl-btn fl-dir-btn">${svg('map')}<span></span></button>
        <button class="fl-btn fl-phone-btn">${svg('phone')}<span></span><i class="fl-badge" hidden></i></button>
        <button class="fl-btn fl-aca-btn">${svg('cap')}<span></span></button>
      </div>
      <p class="fl-fine"></p>
      <div class="fl-banner" aria-live="polite"><small></small><b></b></div>
      <div class="fl-fade on"></div>
      <aside class="fl-dir" hidden><div class="fl-dir-head"><h2></h2><button class="icon-btn fl-dir-x" aria-label="${t('ui.close')}">${C.icon('x')}</button></div><div class="fl-dir-body"><div class="fl-places"></div><div class="fl-dir-lobby"></div></div></aside>`;
    root.appendChild(wrap);
    cv = wrap.querySelector('.fl-cv'); g = cv.getContext('2d');
    mini = wrap.querySelector('.fl-mini'); mg = mini.getContext('2d');
    makePatterns(); resize(); buildMini();
    addEventListener('resize', () => { resize(); buildMini(); });
    bindInput();
    wrap.querySelector('.fl-dir-btn').onclick = () => { Sound.fx.click(); openDir(); };
    wrap.querySelector('.fl-dir-x').onclick = () => { Sound.fx.click(); closeDir(); };
    wrap.querySelector('.fl-phone-btn').onclick = () => { Sound.fx.click(); if (window.Story && Story.phone) Story.phone(); else C.toast(t('fl.soon')); };
    wrap.querySelector('.fl-aca-btn').onclick = () => { Sound.fx.click(); Tutor.academy(); };
    wrap.querySelector('.fl-zin').onclick = () => { cam.zt = U.clamp(cam.zt * 1.25, 0.6, 2.4); };
    wrap.querySelector('.fl-zout').onclick = () => { cam.zt = U.clamp(cam.zt / 1.25, 0.6, 2.4); };
    wrap.querySelector('.fp-go').onclick = () => { Sound.fx.click(); if (prompt) activate(prompt); };
    relabel();
  }
  function relabel() {
    if (!wrap) return;
    const q = s => wrap.querySelector(s);
    q('.fl-dir-btn span').textContent = t('fl.dir'); q('.fl-phone-btn span').textContent = t('fl.phone'); q('.fl-aca-btn span').textContent = t('fl.academy');
    q('.fl-dir h2').textContent = t('fl.dir'); q('.fl-fine').textContent = t('fl.fine');
    if (lastZone) { q('.fl-zone small').textContent = t('fl.floor'); q('.fl-zone b').textContent = t('zone.' + lastZone); }
    paintPlaces(); paintPrompt(); paintPills();
  }
  function zoneBanner(z) {
    const q = s => wrap.querySelector(s);
    q('.fl-zone small').textContent = t('fl.floor'); q('.fl-zone b').textContent = t('zone.' + z);
    const b = q('.fl-banner');
    b.querySelector('small').textContent = t('zsub.' + z); b.querySelector('b').textContent = t('zone.' + z);
    b.classList.remove('show'); void b.offsetWidth; b.classList.add('show');
    if (now - zoneT > 1.5) Sound.fx.zone && Sound.fx.zone();
    zoneT = now;
    if (window.Services && Services.react) Services.react('zone', z);
  }
  function paintPrompt() {
    if (!wrap) return;
    const el = wrap.querySelector('.fl-prompt'), p = prompt;
    if (!p || intro) { el.hidden = true; return; }
    el.hidden = false;
    const key = matchMedia('(pointer: fine)').matches ? ' <kbd>E</kbd>' : '';
    if (p.kind === 'npc') {
      const a = p.npc, P = a.persona && Engines.Brain.PERSONAS[a.persona];
      el.querySelector('b').textContent = P ? (P.name[I18N.lang] || P.name.en) : t('npc.' + (a.talk || 'walk'));
      el.querySelector('small').textContent = P ? t('game.' + (a.game === 'vip' ? 'zhajinhua' : a.game)) : '';
      el.querySelector('.fp-go').innerHTML = t('fl.talk') + key;
    } else {
      el.querySelector('b').textContent = spotName(p);
      el.querySelector('small').textContent = spotSub(p);
      el.querySelector('.fp-go').innerHTML = t(p.kind === 'game' ? 'fl.play' : 'fl.use') + key;
    }
  }
  const RTP = { caishen: '≈96%', treasure: '≈95%+', slots: '≈95%', classic: '95.4%', blackjack: '≈99.4%', roulette: '97.3%', baccarat: '98.9%', sicbo: '97.2%', crash: '97%', plinko: '≈99%' };
  function spotSub(s) {
    if (s.kind === 'game') return RTP[s.game] ? 'RTP ' + RTP[s.game] + ' · ' + t('fl.edge', { e: edgeOf(s.game) }) : t(s.game === 'vip' ? 'fl.vipSub' : 'fl.pvpSub');
    return t('svcSub.' + (s.svc || s.fn));
  }
  const edgeOf = gm => ({ caishen: '4%', treasure: '5%', slots: '5%', classic: '4.6%', blackjack: '0.6%', roulette: '2.7%', baccarat: '1.1%', sicbo: '2.8%', crash: '3%', plinko: '1%' }[gm] || '—');
  function paintPills() {
    if (!wrap) return;
    const host = wrap.querySelector('.fl-pills');
    const v = window.Services && Services.vit ? Services.vit() : null;
    const debt = window.Story && Story.debt ? Story.debt() : 0;
    const clock = window.Story && Story.clock ? Story.clock() : window.Services && Services.clock ? Services.clock() : '';
    let h = '';
    if (v) {
      h += `<span class="fl-pill ${v.energy < 25 ? 'bad' : ''}" title="${t('vit.energy')}">${svg('bolt')}<i style="--v:${v.energy}%"></i></span>`;
      if (v.drunk > 5) h += `<span class="fl-pill drunk" title="${t('vit.drunk')}">${svg('glass')}<i style="--v:${v.drunk}%"></i></span>`;
    }
    if (debt > 0) h += `<span class="fl-pill debt" title="${t('st.debt')}">${svg('debt')}<b>-${U.fmtShort(debt)}</b></span>`;
    if (clock) h += `<span class="fl-pill" title="${t('st.clock')}">${svg('clock')}<b>${clock}</b></span>`;
    host.innerHTML = h;
    const badge = wrap.querySelector('.fl-badge'), n = window.Story && Story.unread ? Story.unread() : 0;
    badge.hidden = !n; badge.textContent = n;
    if (v) { wrap.style.setProperty('--tired', String(U.clamp((30 - v.energy) / 30, 0, 1))); wrap.style.setProperty('--drunk', String(U.clamp((v.drunk - 30) / 70, 0, 1))); wrap.classList.toggle('drunk', v.drunk > 30); }
  }

  /* directory: every place on the floor, plus the classic game grid */
  function places() {
    const out = [];
    for (const s of SPOTS) if (s.main) out.push(s);
    return out;
  }
  function paintPlaces() {
    const host = wrap && wrap.querySelector('.fl-places'); if (!host) return;
    const groups = {};
    for (const s of places()) { const z = zoneOf(s) || 'atrium'; (groups[z] = groups[z] || []).push(s); }
    host.innerHTML = ZONES.filter(z => groups[z.id]).map(z => `<section><h3>${t('zone.' + z.id)} <small>${t('zsub.' + z.id)}</small></h3><div class="fl-pl">${groups[z.id].map(s => {
      const i = SPOTS.indexOf(s);
      return `<div class="fl-pi"><button class="fl-walk" data-i="${i}"><b>${spotName(s)}</b><small>${spotSub(s)}</small></button>${s.kind === 'game' ? `<button class="btn btn-ghost btn-sm fl-now" data-i="${i}">${t('fl.now')}</button>` : ''}</div>`;
    }).join('')}</div></section>`).join('');
    U.$$('.fl-walk', host).forEach(b => b.onclick = () => { Sound.fx.click(); closeDir(); go(SPOTS[+b.dataset.i], true); });
    U.$$('.fl-now', host).forEach(b => b.onclick = () => { Sound.fx.click(); closeDir(); const s = SPOTS[+b.dataset.i]; lastSpot = s; C.go(gameId(s.game)); });
  }
  function openDir() { const d = wrap.querySelector('.fl-dir'); d.hidden = false; requestAnimationFrame(() => d.classList.add('open')); }
  function closeDir() { const d = wrap.querySelector('.fl-dir'); d.classList.remove('open'); setTimeout(() => { if (!d.classList.contains('open')) d.hidden = true; }, 260); }

  /* minimap */
  let miniBase = null;
  const MZ = { cardroom: '#5a1018', bar: '#3a2212', vip: '#2a2016', slots: '#24124a', atrium: '#6a5a3a', pit: '#0e3a2e', restaurant: '#3a1a10', lottery: '#5e0d14', entrance: '#5a4a32', cage: '#1a1612', boutique: '#5a564e', hotel: '#3e2e20' };
  function buildMini() {
    miniBase = document.createElement('canvas'); miniBase.width = W * 3; miniBase.height = H * 3;
    const q = miniBase.getContext('2d');
    for (const z of ZONES) { q.fillStyle = MZ[z.id]; q.fillRect(z.r[0] * 3, z.r[1] * 3, (z.r[2] - z.r[0]) * 3, (z.r[3] - z.r[1]) * 3); }
    q.fillStyle = 'rgba(255,240,200,.35)'; for (const o of OBJ) if (o.solid) q.fillRect(o.x * 3, o.y * 3, o.w * 3, o.h * 3);
    q.fillStyle = '#d9a441'; for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (wall[id(x, y)]) q.fillRect(x * 3, y * 3, 3, 3);
  }
  function drawMini() {
    if (!mg || !miniBase) return;
    mg.setTransform(1, 0, 0, 1, 0, 0); mg.clearRect(0, 0, mini.width, mini.height);
    mg.drawImage(miniBase, 0, 0, mini.width, mini.height);
    const sx = mini.width / (W * T), sy = mini.height / (H * T), s = scale();
    mg.strokeStyle = 'rgba(255,243,192,.7)'; mg.lineWidth = 1.5; mg.strokeRect((cam.x - vw / 2 / s) * sx, (cam.y - vh / 2 / s) * sy, vw / s * sx, vh / s * sy);
    mg.fillStyle = 'rgba(255,255,255,.55)'; for (const a of ACT) if (a.kind === 'wander' || a.kind === 'waitress') mg.fillRect(a.x * sx - 1, a.y * sy - 1, 2, 2);
    if (target) { mg.fillStyle = '#ffe08a'; mg.fillRect(target.x * sx - 2, target.y * sy - 2, 4, 4); }
    mg.fillStyle = '#35d49a'; mg.beginPath(); mg.arc(you.x * sx, you.y * sy, 4.5, 0, TAU); mg.fill(); mg.strokeStyle = '#fff'; mg.lineWidth = 1.5; mg.stroke();
  }

  /* input */
  function bindInput() {
    const pts = new Map(); let pinch = 0, downAt = null;
    const world = e => { const r = cv.getBoundingClientRect(), s = scale(); return [(e.clientX - r.left - vw / 2) / s + cam.x, (e.clientY - r.top - vh / 2) / s + cam.y]; };
    cv.addEventListener('pointerdown', e => {
      pts.set(e.pointerId, [e.clientX, e.clientY]); cv.setPointerCapture(e.pointerId);
      if (pts.size === 2) { const [a, b] = [...pts.values()]; pinch = Math.hypot(a[0] - b[0], a[1] - b[1]); downAt = null; }
      else downAt = [e.clientX, e.clientY, performance.now()];
      if (intro) skipIntro();
    });
    cv.addEventListener('pointermove', e => {
      if (pts.has(e.pointerId)) pts.set(e.pointerId, [e.clientX, e.clientY]);
      if (pts.size === 2 && pinch) { const [a, b] = [...pts.values()], d = Math.hypot(a[0] - b[0], a[1] - b[1]); cam.zt = cam.z = U.clamp(cam.z * d / pinch, 0.6, 2.4); pinch = d; return; }
      if (e.pointerType === 'mouse') { const [wx, wy] = world(e); const h = hit(wx, wy); const hs = h && h.spot && h.spot.kind !== 'npc' ? h.spot : null; if (hs !== hover) { hover = hs; if (hs) Sound.fx.hover(); } cv.style.cursor = h ? 'pointer' : 'default'; }
    });
    const up = e => {
      pts.delete(e.pointerId); if (pts.size < 2) pinch = 0;
      if (!downAt || busy || intro) return;
      const moved = Math.hypot(e.clientX - downAt[0], e.clientY - downAt[1]);
      downAt = null; if (moved > 10) return;
      Sound.unlock(); Sound.ambience && Sound.ambience(true);
      const [wx, wy] = world(e), h = hit(wx, wy);
      if (h && h.spot) {
        const s = h.spot;
        if (s.kind === 'npc') { const a = s.npc; if (Math.hypot(a.x - you.x, a.y - you.y) < 1.8 * T) activate(s); else { const tx = a.x / T + (you.x < a.x ? -0.9 : 0.9), ty = a.y / T + (a.seated ? 0.8 : 0.2); pending = null; route(you, tx, ty); target = { x: tx * T, y: ty * T }; you.arrive = () => { you.arrive = null; if (Math.hypot(a.x - you.x, a.y - you.y) < 2.2 * T) activate(s); }; } }
        else if (Math.hypot(s.x - you.x, s.y - you.y) < s.r * T) activate(s);
        else go(s);
        Sound.fx.click();
        return;
      }
      pending = null; you.arrive = null;
      const tx = wx / T, ty = wy / T;
      if (route(you, tx, ty)) { target = { x: you.path[you.path.length - 1].x, y: you.path[you.path.length - 1].y }; Sound.fx.tick(0.6); }
      else if (!gateOpen && ty < 17 && tx > 48) guardTalk();
    };
    cv.addEventListener('pointerup', up); cv.addEventListener('pointercancel', e => { pts.delete(e.pointerId); downAt = null; });
    cv.addEventListener('pointerleave', () => { hover = null; });
    cv.addEventListener('wheel', e => { e.preventDefault(); cam.zt = U.clamp(cam.zt * (e.deltaY < 0 ? 1.12 : 0.89), 0.6, 2.4); }, { passive: false });
    mini.addEventListener('click', e => {
      const r = mini.getBoundingClientRect(), tx = (e.clientX - r.left) / r.width * W, ty = (e.clientY - r.top) / r.height * H;
      pending = null; if (route(you, tx, ty)) { you.run = true; target = { x: you.path[you.path.length - 1].x, y: you.path[you.path.length - 1].y }; Sound.fx.click(); }
    });
    addEventListener('keydown', e => {
      if (C.current !== 'lobby' || e.target.matches('input, textarea, select') || document.querySelector('.modal-ov, .tut-ov')) return;
      const k = e.key.toLowerCase();
      if (intro) { skipIntro(); return; }
      if (['arrowleft', 'arrowright', 'arrowup', 'arrowdown', 'w', 'a', 's', 'd', 'shift'].includes(k)) { keys.add(k); if (k.startsWith('arrow')) e.preventDefault(); you.run = false; }
      else if ((k === 'e' || k === 'enter' || k === ' ') && prompt) { e.preventDefault(); activate(prompt); }
      else if (k === 'm' || k === 'tab') { e.preventDefault(); const d = wrap.querySelector('.fl-dir'); d.hidden ? openDir() : closeDir(); }
      else if (k === '+' || k === '=') cam.zt = U.clamp(cam.zt * 1.2, 0.6, 2.4);
      else if (k === '-') cam.zt = U.clamp(cam.zt / 1.2, 0.6, 2.4);
    });
    addEventListener('keyup', e => keys.delete(e.key.toLowerCase()));
    addEventListener('blur', () => keys.clear());
  }
  function hit(wx, wy) {
    let best = null;
    for (const a of ACT) {
      if (a.you || !a.talk) continue;
      const top = a.y - (a.seated ? 40 : 48);
      if (wx > a.x - 10 && wx < a.x + 10 && wy > top && wy < a.y + 4 && (!best || a.y > best.b)) best = { b: a.y, spot: { kind: 'npc', npc: a, x: a.x, y: a.y } };
    }
    for (const s of SPOTS) {
      const o = s.obj;
      const box = o ? [o.x * T, o.base - o.sh, o.w * T, o.sh + 6] : [s.x - 32, s.y - 40, 64, 50];
      if (o && o.kind === 'slot') box[3] += T;
      if (wx > box[0] && wx < box[0] + box[2] && wy > box[1] && wy < box[1] + box[3]) {
        const b = (o ? o.base : s.y) + (s.kind === 'game' && !s.busy ? 1 : 0);
        if (!best || b >= best.b - 2) best = { b, spot: s.busy ? s : s };
      }
    }
    return best;
  }

  /* ================= lifecycle ================= */
  function start() {
    if (running) return;
    running = true; last = performance.now(); raf = requestAnimationFrame(frame);
    if (Sound.ambience) Sound.ambience(true);
  }
  function stop() { running = false; if (raf) cancelAnimationFrame(raf); raf = 0; keys.clear(); if (Sound.ambience) Sound.ambience(false); }
  function enter() {
    if (!wrap) return;
    resize(); buildMini();
    const fade = wrap.querySelector('.fl-fade');
    let first = false;
    try { first = !sessionStorage.getItem('gj_in'); sessionStorage.setItem('gj_in', '1'); } catch (e) { first = !enter.done; }
    enter.done = true;
    if (lastSpot) {
      you.x = lastSpot.x; you.y = lastSpot.y + (lastSpot.face === 1 ? 0.25 * T : -0.25 * T); you.dir = 0; you.path = null;
      if (!walkable(Math.floor(you.x / T), Math.floor(you.y / T))) { const n = nearestWalkable(Math.floor(you.x / T), Math.floor(you.y / T)); if (n) { you.x = (n[0] + 0.5) * T; you.y = (n[1] + 0.5) * T; } }
      cam.x = you.x; cam.y = you.y; cam.z = cam.zt * 1.5;
    }
    start();
    const go2 = () => { if (first && !U.reduced) runIntro(); else { requestAnimationFrame(() => fade.classList.remove('on')); } };
    if (first && window.Story && Story.opening) Story.opening().then(go2); else go2();
    if (window.Story && Story.onFloor) Story.onFloor();
  }
  async function runIntro() {
    intro = true; Floor.intro = true;
    const fade = wrap.querySelector('.fl-fade');
    you.x = 35.5 * T; you.y = 54.3 * T; you.dir = 1; cam.x = you.x; cam.y = 51 * T; cam.z = cam.zt = 1.55;
    doorsT = now + 0.2;
    fade.classList.remove('on');
    wrap.classList.add('intro');
    Sound.fx.doors && Sound.fx.doors();
    await U.sleep(700); if (!intro) return;
    route(you, 35.5, 47.2); you.run = false;
    ACT.filter(a => a.talk === 'doorman').forEach((a, i) => setTimeout(() => say(a, t('fl.hi.doorman')), 200 + i * 500));
    setTimeout(() => intro && Sound.say(t('fl.hi.doorman'), { pitch: 0.9 }), 300);
    const b = wrap.querySelector('.fl-banner'); b.querySelector('small').textContent = t('fl.welcomeSub'); b.querySelector('b').textContent = t('brand');
    b.classList.remove('show'); void b.offsetWidth; b.classList.add('show', 'big');
    for (let i = 0; i < 40 && intro; i++) { cam.zt = U.lerp(1.55, 1, i / 39); await U.sleep(60); }
    skipIntro();
  }
  function skipIntro() {
    if (!intro) return;
    intro = false; Floor.intro = false; cam.zt = 1;
    wrap.classList.remove('intro'); wrap.querySelector('.fl-banner').classList.remove('big');
    if (!you.path) { you.x = 35.5 * T; you.y = 47.2 * T; }
    paintPrompt();
  }

  /* ================= public API ================= */
  const Floor = {
    mount, enter, stop, start, intro: false, hooks: {},
    get running() { return running; },
    get dirLobby() { return wrap && wrap.querySelector('.fl-dir-lobby'); },
    spots: () => places().map(s => ({ id: SPOTS.indexOf(s), kind: s.kind, game: s.game, svc: s.svc || s.fn, zone: zoneOf(s), name: spotName(s), x: +(s.ux.toFixed(1)), y: +(s.uy.toFixed(1)) })),
    where: () => ({ x: +(you.x / T).toFixed(1), y: +(you.y / T).toFixed(1), zone: zoneOf(you), near: prompt ? (prompt.kind === 'npc' ? 'npc' : spotName(prompt)) : null }),
    goto(q) {
      const s = typeof q === 'number' ? SPOTS[q] : places().find(p => p.game === q || p.svc === q || p.fn === q);
      if (!s) return false;
      if (C.current !== 'lobby') C.go('lobby');
      go(s, true); return true;
    },
    say(who, text, dur) { const a = who === 'you' ? you : ACT.find(q => q.role === who || q.persona === who || q === who); say(a, text, dur); },
    you: () => you,
    coins: (n = 18) => coins(you.x, you.y - 20, n),
    cheer() { you.cheerT = now; },
    // everyone near you throws their hands up
    crowd(r = 9) { for (const a of ACT) if (!a.seated || a.persona) if (Math.hypot(a.x - you.x, a.y - you.y) < r * T) a.cheerT = now + U.rand(0, 0.3); you.cheerT = now; },
    // paint a character into any canvas (boutique mirror, phone avatar)
    portrait(c, look, d = 0) {
      const keep = g, k = c.width / 40;
      g = c.getContext('2d'); g.setTransform(k, 0, 0, k, 0, 0); g.clearRect(0, 0, 40, 50);
      drawChar({ look, x: 20, y: 47, dir: d, wp: 0, seed: 1, moving: false }, now);
      g.setTransform(1, 0, 0, 1, 0, 0); g = keep;
    },
    refreshLook() { you.look = Object.assign({ skin: '#e8b88f', hair: '#14100c', hs: 0, top: '#1f3a5f', bot: '#22262e' }, LS.get('look', {})); },
    // story characters walk the floor: { look, tx, ty, talk, name }
    spawn(spec) {
      const a = actor(Object.assign({ kind: 'story', speed: 2.6 }, spec));
      return {
        a,
        say: (s, d) => say(a, s, d),
        walkTo: (tx, ty) => new Promise(res => { if (!route(a, tx, ty)) return res(); a.arrive = () => { a.arrive = null; res(); }; }),
        approach: () => new Promise(res => { const tx = you.x / T + (you.x > a.x ? -0.9 : 0.9), ty = you.y / T; if (!route(a, tx, ty)) return res(); a.arrive = () => { a.arrive = null; a.dir = faceTo(a, you); you.dir = faceTo(you, a); res(); }; }),
        remove: () => { const i = ACT.indexOf(a); if (i >= 0) ACT.splice(i, 1); }
      };
    },
    zoneOf: () => zoneOf(you),
    lastSpot: () => lastSpot
  };
  window.Floor = Floor;
})();
