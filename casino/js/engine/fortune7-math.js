/* Fortune Sevens math: 5x3 reels, 10 lines, expanding wilds on reels 2-4,
   red-envelope scatters on reels 1/3/5 that award free spins. Pure functions so
   the RTP can be simulated outside the browser (see tools/sim.js). */
(function (root) {
  const SYM = { CHERRY: 0, LEMON: 1, BELL: 2, BAR: 3, DIAMOND: 4, SEVEN: 5, WILD: 6, SCAT: 7 };
  const NAMES = ['cherry', 'lemon', 'bell', 'bar', 'diamond', 'seven', 'wild', 'scatter'];
  // pays per line bet for 3 / 4 / 5 of a kind
  const PAY = {
    0: [4, 10, 40],
    1: [4, 10, 40],
    2: [6, 20, 80],
    3: [10, 40, 150],
    4: [20, 80, 400],
    5: [40, 200, 1500]
  };
  const LINES = [
    [1, 1, 1, 1, 1], [0, 0, 0, 0, 0], [2, 2, 2, 2, 2], [0, 1, 2, 1, 0], [2, 1, 0, 1, 2],
    [0, 0, 1, 2, 2], [2, 2, 1, 0, 0], [1, 0, 0, 0, 1], [1, 2, 2, 2, 1], [0, 1, 1, 1, 0]
  ];
  const WEIGHTS = [
    { 0: 10, 1: 10, 2: 8, 3: 6, 4: 4, 5: 3, 7: 3 },
    { 0: 10, 1: 10, 2: 8, 3: 6, 4: 4, 5: 3, 6: 1 },
    { 0: 10, 1: 10, 2: 8, 3: 6, 4: 4, 5: 3, 6: 1, 7: 3 },
    { 0: 10, 1: 10, 2: 8, 3: 6, 4: 4, 5: 3, 6: 1 },
    { 0: 10, 1: 10, 2: 8, 3: 6, 4: 4, 5: 3, 7: 3 }
  ];
  const SCATTER_PAY = 5;      // x total bet for 3 scatters
  const FREE_SPINS = 10;
  const FREE_MULT = 3;

  function buildStrips(rnd) {
    return WEIGHTS.map(w => {
      let s;
      for (let tries = 0; tries < 200; tries++) {
        s = [];
        for (const k in w) for (let i = 0; i < w[k]; i++) s.push(+k);
        for (let i = s.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [s[i], s[j]] = [s[j], s[i]]; }
        // keep specials and sevens spaced so a window never shows two of them
        let ok = true;
        for (let i = 0; i < s.length && ok; i++) {
          for (let d = 1; d <= 2; d++) {
            const a = s[i], b = s[(i + d) % s.length];
            if (a === b && (a === 6 || a === 7)) ok = false;
          }
        }
        if (ok) break;
      }
      return s;
    });
  }

  function spin(strips, rnd) {
    // grid[reel][row]
    return strips.map(s => {
      const p = Math.floor(rnd() * s.length);
      return [s[p], s[(p + 1) % s.length], s[(p + 2) % s.length]];
    });
  }

  // wilds expand to cover their whole reel
  function expand(grid) {
    const expanded = [];
    const g = grid.map((col, r) => {
      if (col.includes(SYM.WILD)) { expanded.push(r); return [6, 6, 6]; }
      return col.slice();
    });
    return { grid: g, expanded };
  }

  function evaluate(grid, lineBet) {
    const wins = [];
    let total = 0;
    LINES.forEach((line, li) => {
      const first = grid[0][line[0]];
      if (first === SYM.SCAT || first === SYM.WILD) return;
      let n = 1;
      for (let r = 1; r < 5; r++) {
        const s = grid[r][line[r]];
        if (s === first || s === SYM.WILD) n++; else break;
      }
      if (n >= 3) {
        const amt = PAY[first][n - 3] * lineBet;
        total += amt;
        wins.push({ line: li, sym: first, count: n, amount: amt, cells: line.slice(0, n).map((row, r) => [r, row]) });
      }
    });
    const scat = [];
    grid.forEach((col, r) => col.forEach((s, row) => { if (s === SYM.SCAT) scat.push([r, row]); }));
    return { wins, total, scatters: scat };
  }

  const api = { SYM, NAMES, PAY, LINES, WEIGHTS, SCATTER_PAY, FREE_SPINS, FREE_MULT, buildStrips, spin, expand, evaluate };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.SlotMath = api;
})(typeof window !== 'undefined' ? window : globalThis);
