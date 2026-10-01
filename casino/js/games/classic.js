/* Lucky 777: a classic three-reel machine with a pull lever and a lit pay glass.
   Reels turn through their real 16-stop strips, so what scrolls past is what is on the reel. */
(function () {
  const t = (k, v) => I18N.t(k, v);
  const K = SlotKit, E = Engines.list.classic;
  const { SYM: S, PAY, STRIPS } = E;
  const N = STRIPS[0].length;
  const at = (r, i) => STRIPS[r][((i % N) + N) % N][0];

  const bar = (n, fill) => {
    const h = 20, gap = 5, y0 = 50 - (n * h + (n - 1) * gap) / 2;
    return Array.from({ length: n }, (_, k) => `<rect x="12" y="${y0 + k * (h + gap)}" width="76" height="${h}" rx="4" fill="#141414" stroke="url(#gGold)" stroke-width="3"/>
      <text x="50" y="${y0 + k * (h + gap) + 15.5}" text-anchor="middle" font-family="Limelight, Georgia, serif" font-size="15" fill="${fill}" letter-spacing="1">BAR</text>`).join('');
  };
  K.defs.cl = {
    grad: `<radialGradient id="gStar" cx=".5" cy=".4" r=".6"><stop offset="0" stop-color="#fff8d0"/><stop offset=".55" stop-color="#ffcf3a"/><stop offset="1" stop-color="#c06a00"/></radialGradient>`,
    art: {
      1: () => '<use href="#sym-0"/>',
      2: () => bar(1, 'url(#gGold)'),
      3: () => bar(2, '#ff5468'),
      4: () => bar(3, '#6fb7ff'),
      5: () => '<use href="#sym-5"/>',
      6: () => `<path d="M50 4 L61 35 L94 36 L68 56 L77 88 L50 69 L23 88 L32 56 L6 36 L39 35 Z" fill="url(#gStar)" stroke="#7a3b00" stroke-width="3" stroke-linejoin="round"/>
        <text x="50" y="${I18N.lang === 'zh' ? 62 : 58}" text-anchor="middle" font-family="${I18N.lang === 'zh' ? '\'ZCOOL QingKe HuangYou\', sans-serif' : 'Limelight, Georgia, serif'}" font-size="${I18N.lang === 'zh' ? 22 : 15}" fill="#7a1010">${t('slots.wild')}</text>
        <text x="50" y="80" text-anchor="middle" font-family="'Barlow Semi Condensed', sans-serif" font-weight="800" font-size="13" fill="#7a1010">×2</text>`
    }
  };
  K.buildDefs();
  const cell = s => `<div class="cell cl-s${s}">${s ? K.use('cl', s) : ''}</div>`;
  const ic = s => `<svg viewBox="0 0 100 100"><use href="#cl-${s}"/></svg>`;
  // pay glass rows: [kind, icons]
  const GLASS = [
    ['wild3', [6, 6, 6]], ['seven', [5, 5, 5]], ['bar3', [4, 4, 4]], ['bar2', [3, 3, 3]], ['bar1', [2, 2, 2]],
    ['anybar', [2, 3, 4]], ['cherry3', [1, 1, 1]], ['cherry2', [1, 1]], ['cherry1', [1]]
  ];

  const G = new K.SlotView('classic', {
    cab: 'cl-cab', title: 'cl.title', hint: 'cl.hint',
    top: () => `<div class="cl-glass">${GLASS.map(([k, s]) => `<div class="clg" data-kind="${k}"><span class="clg-i">${s.map(ic).join('')}</span><b>×${PAY[k]}</b></div>`).join('')}</div>`,
    board: () => `<div class="cl-wrap"><div class="cl-win"><div class="reels cl-reels"></div><div class="cl-line" aria-hidden="true"></div></div>
      <button class="cl-lever" aria-label="${t('cl.lever')}" data-i18n-aria="cl.lever"><span class="lv-slot"></span><span class="lv-rod"></span><span class="lv-hub"></span><b class="lv-ball"></b></button></div>`,
    rules: () => `
      <p>${t('cl.r1')}</p>
      <div class="table-scroll"><table class="paytable cl-pt"><tbody>${GLASS.map(([k, s]) => `<tr><td class="clg-i">${s.map(ic).join('')}</td><td>${t('cl.k.' + k)}</td><td>×${PAY[k]}</td></tr>`).join('')}</tbody></table></div>
      <div class="pt-special"><svg viewBox="0 0 100 100"><use href="#cl-6"/></svg><p>${t('cl.r2')}</p></div>
      <p class="pt-note">${t('cl.r3')}</p>`
  });

  Object.assign(G, {
    stops: [0, 5, 10],
    build() {
      this.reelsEl = this.root.querySelector('.cl-reels');
      this.glass = this.root.querySelector('.cl-glass');
      this.reels = [0, 1, 2].map(r => {
        const reel = U.h('div', { class: 'reel' }), strip = U.h('div', { class: 'strip' });
        strip.innerHTML = [-1, 0, 1].map(k => cell(at(r, this.stops[r] + k))).join('');
        reel.appendChild(strip); this.reelsEl.appendChild(reel);
        return { reel, strip };
      });
      this.lever();
    },
    measure() {
      const h = this.reelsEl.clientHeight;
      if (!h) return;
      this.cell = h / 3;
      this.reelsEl.style.setProperty('--cell', this.cell + 'px');
    },
    clearWins() {
      this.reelsEl.classList.remove('has-win');
      U.$$('.cell.hit', this.reelsEl).forEach(c => c.classList.remove('hit'));
      U.$$('.clg.on', this.glass).forEach(c => c.classList.remove('on'));
      this.setMeter('slots.goodLuck', '');
    },

    /* the lever: drag it down (or tap it) to spin */
    lever() {
      const lv = this.root.querySelector('.cl-lever');
      let y0 = null, p = 0, ticks = 0;
      const set = v => { p = U.clamp(v, 0, 1); lv.style.setProperty('--p', p); };
      const release = fire => {
        lv.classList.add('back'); set(0);
        setTimeout(() => lv.classList.remove('back'), 420);
        if (fire) { Sound.fx.thud(1.2); U.vibrate(25); this.onSpin(); }
      };
      lv.addEventListener('pointerdown', e => {
        if (this.busy) { this.onSpin(); return; }
        y0 = e.clientY; ticks = 0; lv.setPointerCapture(e.pointerId); lv.classList.remove('back');
      });
      lv.addEventListener('pointermove', e => {
        if (y0 === null) return;
        set((e.clientY - y0) / 90);
        const k = Math.floor(p * 6);
        if (k > ticks) { ticks = k; Sound.fx.tick(0.7 + p * 0.4); }
      });
      const up = () => {
        if (y0 === null) return;
        y0 = null;
        if (p > 0.55) return release(true);
        if (p < 0.08) { // a tap: play the whole pull
          Sound.unlock();
          lv.classList.add('pull');
          [0, 70, 140, 210].forEach((d, i) => setTimeout(() => Sound.fx.tick(0.8 + i * 0.1), d));
          setTimeout(() => { lv.classList.remove('pull'); release(true); }, 300);
          return;
        }
        release(false);
      };
      lv.addEventListener('pointerup', up);
      lv.addEventListener('pointercancel', up);
      lv.addEventListener('click', e => { if (e.detail === 0) this.onSpin(); }); // keyboard
    },

    async animate(events) {
      const reels = events.find(e => e.t === 'reels'), win = events.find(e => e.t === 'wins');
      const settle = events.find(e => e.t === 'settle');
      const line = reels.line;
      const hi = s => s === S.SEVEN || s === S.WILD;
      const tease = (hi(line[0]) && hi(line[1])) || (line[0] === S.WILD && line[1] === S.WILD);
      const dur = [0, 1, 2].map(i => (this.T ? 420 : 820) + i * (this.T ? 170 : 380));
      if (tease) dur[2] += this.T ? 700 : 1500;
      Sound.fx.whoosh(true, 0.3);
      this.whirr = Sound.loop('whirr');
      await Promise.all(this.reels.map(({ reel, strip }, r) => {
        const p = reels.stops[r], q = this.stops[r];
        const d = ((q - p) % N + N) % N;
        const loops = Math.max(1, Math.round((dur[r] / 1000 * 22 - d) / N));
        const seq = Array.from({ length: d + 3 + loops * N }, (_, k) => cell(at(r, p - 1 + k)));
        return this.runReel(reel, strip, seq, 3, dur[r], r === 2 && tease).then(() => {
          Sound.fx.reelStop(r);
          U.pulse(reel, 'land');
          if (line[r] === S.SEVEN || line[r] === S.WILD) { Sound.fx.scatterLand(r + 1); U.pulse(strip.children[1], 'pop'); }
          if (r === 1 && tease && !this.slam) { this.antic = Sound.loop('anticipation'); this.reels[2].reel.classList.add('antic'); this.cab.classList.add('tense'); }
          if (r === 2) { this.stopLoops(); reel.classList.remove('antic'); this.cab.classList.remove('tense'); }
        });
      }));
      this.stops = reels.stops;
      if (!win) {
        // the famous near miss: two sevens on the line, the third one just off it
        const sev = line.filter(hi).length;
        const off = reels.window[2][0] === S.SEVEN || reels.window[2][2] === S.SEVEN;
        if (sev === 2 && off && line[2] !== S.SEVEN) { this.setMeter('cl.near', '—', 'dim'); Sound.fx.lose(); }
        else this.setMeter('slots.noWin', '—', 'dim');
        return;
      }
      this.reelsEl.classList.add('has-win');
      const cherry = win.kind.startsWith('cherry') && win.kind !== 'cherry3';
      this.reels.forEach(({ strip }, r) => { if (!cherry || line[r] === S.CHERRY) strip.children[1].classList.add('hit'); });
      const g = this.glass.querySelector(`[data-kind="${win.kind}"]`);
      if (g) g.classList.add('on');
      if (win.mult > 1) this.reels.forEach(({ strip }, r) => {
        if (line[r] !== S.WILD) return;
        const c = U.center(strip.children[1]);
        FX.float(c.x, c.y - 20, '×2', 'good');
      });
      await this.showWin(win.win, settle.bet);
      this.meterLab.textContent = t('cl.k.' + win.kind) + (win.mult > 1 ? ` · ×${win.mult}` : '');
      delete this.meterLab.dataset.i18n;
    }
  });
  C.register(G);
})();
