// RTP simulator for the math models: node casino/tools/sim.js
const M = require('../js/games/slots-math.js');
const rnd = Math.random;
function slots(N = 2e6) {
  let bet = 0, ret = 0, hits = 0, fsTrig = 0, big = 0;
  const strips = M.buildStrips(rnd);
  const one = (mult) => {
    const raw = M.spin(strips, rnd);
    const { grid } = M.expand(raw);
    const ev = M.evaluate(grid, 1);
    const sc = M.evaluate(raw, 1).scatters.length;
    let w = ev.total * mult;
    if (sc >= 3) w += M.SCATTER_PAY * 10 * mult;
    return { w, sc };
  };
  for (let i = 0; i < N; i++) {
    bet += 10;
    let { w, sc } = one(1);
    let spinWin = w;
    if (sc >= 3) {
      fsTrig++;
      let left = M.FREE_SPINS;
      while (left-- > 0) { const r = one(M.FREE_MULT); spinWin += r.w; if (r.sc >= 3) left += M.FREE_SPINS; }
    }
    if (spinWin > 0) hits++;
    if (spinWin >= 100) big++;
    ret += spinWin;
  }
  console.log('SLOTS RTP', (ret / bet * 100).toFixed(2) + '%', 'hit', (hits / N * 100).toFixed(1) + '%', 'FS 1 in', Math.round(N / fsTrig), 'bigwin(10x) 1 in', Math.round(N / big));
}
function plinko() {
  const T = {
    low: [10, 3, 1.6, 1.4, 1.1, 1, 0.5, 1, 1.1, 1.4, 1.6, 3, 10],
    medium: [33, 11, 4, 2, 1.1, 0.6, 0.3, 0.6, 1.1, 2, 4, 11, 33],
    high: [170, 24, 8.1, 2, 0.7, 0.2, 0.2, 0.2, 0.7, 2, 8.1, 24, 170]
  };
  const C = (n, k) => { let r = 1; for (let i = 1; i <= k; i++) r = r * (n - k + i) / i; return r; };
  for (const k in T) { let e = 0; T[k].forEach((m, i) => e += m * C(12, i) / 4096); console.log('PLINKO', k, (e * 100).toFixed(2) + '%'); }
}
slots(+process.argv[2] || 1e6);
plinko();
