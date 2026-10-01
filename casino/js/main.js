/* Lobby, bonus wheel, settings, and boot */
(function () {
  const t = (k, v) => I18N.t(k, v);
  const WHEEL_COOLDOWN = 4 * 3600 * 1000;
  const PRIZES = [1000, 2500, 500, 5000, 1000, 10000, 750, 2500, 1500, 25000, 1000, 50000];
  const PRIZE_W = [14, 9, 14, 5, 14, 2.5, 14, 9, 11, 1, 14, 0.4];

  const GAMES = [
    { id: 'zhajinhua', sec: 'cardroom', ai: true, hot: true },
    { id: 'doudizhu', sec: 'cardroom', ai: true },
    { id: 'mahjong', sec: 'cardroom', ai: true },
    { id: 'niuniu', sec: 'cardroom', ai: true },
    { id: 'caishen', sec: 'slots', rtp: '≈ 96%', hot: true },
    { id: 'treasure', sec: 'slots', rtp: '≈ 95%+' },
    { id: 'slots', sec: 'slots', rtp: '≈ 95%' },
    { id: 'classic', sec: 'slots', rtp: '95.4%' },
    { id: 'blackjack', sec: 'tables', rtp: '≈ 99.4%' },
    { id: 'roulette', sec: 'tables', rtp: '97.3%' },
    { id: 'baccarat', sec: 'tables', rtp: '98.9%' },
    { id: 'sicbo', sec: 'tables', rtp: '97.2%' },
    { id: 'crash', sec: 'instant', rtp: '97%', hot: true },
    { id: 'plinko', sec: 'instant', rtp: '≈ 99%' }
  ];
  const SECTIONS = ['cardroom', 'slots', 'tables', 'instant'];

  /* ---------- tile art (inline SVG) ---------- */
  function art(id) {
    const pip = (cx, cy, r = 3.2, c = '#1a1410') => `<circle cx="${cx}" cy="${cy}" r="${r}" fill="${c}"/>`;
    const card = (x, y, rot, rank, suit, red) => `<g transform="translate(${x} ${y}) rotate(${rot})">
      <rect x="-22" y="-31" width="44" height="62" rx="5" fill="#fbf6ea" stroke="#c9b58a"/>
      <text x="-15" y="-15" font-family="Limelight, serif" font-size="14" fill="${red ? '#c8283c' : '#15110e'}">${rank}</text>
      <text x="0" y="12" text-anchor="middle" font-size="26" fill="${red ? '#c8283c' : '#15110e'}">${suit}</text></g>`;
    switch (id) {
      case 'slots': return `<svg viewBox="0 0 160 100"><rect x="14" y="18" width="132" height="64" rx="10" fill="#120b06" stroke="#d9a441" stroke-width="3"/>
        ${[0, 1, 2].map(i => `<rect x="${22 + i * 40}" y="25" width="36" height="50" rx="4" fill="#f7efdc"/><svg x="${24 + i * 40}" y="32" width="32" height="36" viewBox="0 0 100 100"><use href="#sym-5"/></svg>`).join('')}
        <path d="M14 50 h-6 M146 50 h6" stroke="#f6c94e" stroke-width="3"/></svg>`;
      case 'classic': return `<svg viewBox="0 0 160 100"><rect x="20" y="16" width="108" height="68" rx="10" fill="#22262e" stroke="#aeb6c2" stroke-width="3"/>
        ${[0, 1, 2].map(i => `<rect x="${28 + i * 32}" y="24" width="28" height="52" rx="3" fill="#f7efdc"/><svg x="${29 + i * 32}" y="36" width="26" height="28" viewBox="0 0 100 100"><use href="#sym-5"/></svg>`).join('')}
        <path d="M24 50 h100" stroke="#e8364f" stroke-width="2.5"/>
        <path d="M140 66 V30" stroke="#d8dce2" stroke-width="4" stroke-linecap="round"/><circle cx="140" cy="27" r="8" fill="#e8233f"/><circle cx="140" cy="68" r="6" fill="#aeb6c2"/></svg>`;
      case 'caishen': return `<svg viewBox="0 0 160 100">
        ${[[22, 60, 0], [46, 72, 1], [114, 72, 2], [138, 60, 3], [30, 26, 7], [130, 26, 6]].map(([x, y, s]) => `<svg x="${x - 13}" y="${y - 13}" width="26" height="26" viewBox="0 0 100 100"><use href="#cs-${s}"/></svg>`).join('')}
        <svg x="48" y="8" width="64" height="64" viewBox="0 0 100 100"><use href="#cs-9"/></svg>
        <svg x="64" y="66" width="32" height="32" viewBox="0 0 100 100"><use href="#cs-10"/></svg>
        <text x="80" y="87" text-anchor="middle" font-family="'Barlow Semi Condensed', sans-serif" font-weight="800" font-size="12" fill="#fff3c0">×50</text></svg>`;
      case 'treasure': return `<svg viewBox="0 0 160 100">
        <rect x="34" y="6" width="92" height="18" rx="9" fill="#0a0403" stroke="#f6c94e"/><text x="80" y="19.5" text-anchor="middle" font-family="'Barlow Semi Condensed', sans-serif" font-weight="800" font-size="12" fill="#ffe08a" letter-spacing="2">GRAND</text>
        <svg x="50" y="28" width="60" height="64" viewBox="0 0 100 100"><use href="#tb-8"/></svg>
        ${[[30, 62], [130, 62], [22, 38], [138, 38]].map(([x, y]) => `<svg x="${x - 12}" y="${y - 12}" width="24" height="24" viewBox="0 0 100 100"><use href="#tb-9"/></svg>`).join('')}</svg>`;
      case 'zhajinhua': return `<svg viewBox="0 0 160 100">${card(56, 54, -16, 'A', '♠', 0)}${card(80, 50, 0, 'A', '♥', 1)}${card(104, 54, 16, 'A', '♦', 1)}
        <text x="80" y="96" text-anchor="middle" font-family="'ZCOOL QingKe HuangYou', sans-serif" font-size="16" fill="#f6c94e">豹子</text></svg>`;
      case 'niuniu': return `<svg viewBox="0 0 160 100">${[['K', '♠', 0], ['Q', '♥', 1], ['J', '♣', 0], ['T', '♦', 1], ['K', '♥', 1]].map(([r, su, red], i) => card(40 + i * 20, 52, (i - 2) * 8, r === 'T' ? '10' : r, su, red)).join('')}
        <text x="80" y="97" text-anchor="middle" font-family="'ZCOOL QingKe HuangYou', sans-serif" font-size="17" fill="#f6c94e">五花牛</text></svg>`;
      case 'doudizhu': return `<svg viewBox="0 0 160 100">${card(64, 46, -10, '2', '♠', 0)}
        <g transform="translate(96 44) rotate(10)"><rect x="-22" y="-31" width="44" height="62" rx="5" fill="#fff4dc" stroke="#c9b58a"/>
        <text x="-15" y="-10" font-family="'Barlow Semi Condensed', sans-serif" font-weight="800" font-size="8" fill="#c8283c" writing-mode="tb">JOKER</text>
        <text x="4" y="14" text-anchor="middle" font-family="'ZCOOL QingKe HuangYou', sans-serif" font-size="20" fill="#c8283c">大王</text></g>
        <text x="80" y="97" text-anchor="middle" font-family="'ZCOOL QingKe HuangYou', sans-serif" font-size="16" fill="#f6c94e">斗地主</text></svg>`;
      case 'mahjong': {
        const tl = (x, y, rot, n, su, col) => `<g transform="translate(${x} ${y}) rotate(${rot})"><rect x="-17" y="-24" width="34" height="48" rx="5" fill="#fbf6ea" stroke="#c9b58a"/><rect x="-17" y="18" width="34" height="6" rx="2" fill="#1f7a55"/>
          <text x="0" y="-1" text-anchor="middle" font-family="'ZCOOL QingKe HuangYou', sans-serif" font-size="18" fill="${col}">${n}</text><text x="0" y="15" text-anchor="middle" font-family="'ZCOOL QingKe HuangYou', sans-serif" font-size="13" fill="${col === '#15110e' ? '#c8283c' : col}">${su}</text></g>`;
        return `<svg viewBox="0 0 160 100">${tl(46, 54, -8, '一', '万', '#15110e')}${tl(80, 50, 0, '5', '条', '#157a4c')}${tl(114, 54, 8, '9', '筒', '#1f4fa8')}
          <text x="80" y="97" text-anchor="middle" font-family="'ZCOOL QingKe HuangYou', sans-serif" font-size="16" fill="#f6c94e">血战到底</text></svg>`;
      }
      case 'blackjack': return `<svg viewBox="0 0 160 100">${card(64, 52, -12, 'A', '♠', 0)}${card(96, 50, 10, 'K', '♥', 1)}
        <circle cx="126" cy="80" r="11" fill="#c8283c" stroke="#fff" stroke-dasharray="4 3" stroke-width="2"/><circle cx="126" cy="76" r="11" fill="#1f4fa8" stroke="#fff" stroke-dasharray="4 3" stroke-width="2"/></svg>`;
      case 'roulette': {
        let w = '';
        const order = [0, 32, 15, 19, 4, 21, 2, 25, 17, 34, 6, 27, 13, 36, 11, 30, 8, 23, 10, 5, 24, 16, 33, 1, 20, 14, 31, 9, 22, 18, 29, 7, 28, 12, 35, 3, 26];
        const red = new Set([1, 3, 5, 7, 9, 12, 14, 16, 18, 19, 21, 23, 25, 27, 30, 32, 34, 36]);
        order.forEach((n, i) => {
          const a0 = (i - 0.5) / 37 * Math.PI * 2 - Math.PI / 2, a1 = (i + 0.5) / 37 * Math.PI * 2 - Math.PI / 2;
          const P = (a, r) => `${80 + Math.cos(a) * r} ${50 + Math.sin(a) * r}`;
          w += `<path d="M${P(a0, 42)} A42 42 0 0 1 ${P(a1, 42)} L${P(a1, 28)} A28 28 0 0 0 ${P(a0, 28)}Z" fill="${n === 0 ? '#0e8a5c' : red.has(n) ? '#b8132c' : '#16110f'}"/>`;
        });
        return `<svg viewBox="0 0 160 100"><circle cx="80" cy="50" r="47" fill="#5a2e12" stroke="#d9a441" stroke-width="2"/>${w}
          <circle cx="80" cy="50" r="28" fill="#6b3a17" stroke="#d9a441" stroke-width="1.5"/><path d="M80 30v40M60 50h40" stroke="#e8c06a" stroke-width="3" stroke-linecap="round"/>
          <circle cx="80" cy="50" r="5" fill="#f6c94e"/><circle cx="109" cy="24" r="4" fill="#fff"/></svg>`;
      }
      case 'sicbo': {
        const die = (x, y, rot, face, s = 34) => {
          const P = { 1: [[.5, .5]], 3: [[.25, .25], [.5, .5], [.75, .75]], 4: [[.27, .27], [.73, .27], [.27, .73], [.73, .73]], 5: [[.25, .25], [.75, .25], [.5, .5], [.25, .75], [.75, .75]], 6: [[.28, .22], [.28, .5], [.28, .78], [.72, .22], [.72, .5], [.72, .78]] }[face];
          const col = face === 1 || face === 4 ? '#c8283c' : '#1a1410';
          return `<g transform="translate(${x} ${y}) rotate(${rot})"><rect x="${-s / 2}" y="${-s / 2}" width="${s}" height="${s}" rx="7" fill="#fbf6ea" stroke="#c9b58a"/>
            ${P.map(([px, py]) => pip(-s / 2 + px * s, -s / 2 + py * s, face === 1 ? 6 : 3.2, col)).join('')}</g>`;
        };
        return `<svg viewBox="0 0 160 100"><ellipse cx="80" cy="66" rx="62" ry="22" fill="#0c2b21" stroke="#d9a441" stroke-width="2"/>
          ${die(52, 58, -14, 4)}${die(84, 50, 8, 1)}${die(112, 62, 20, 6)}</svg>`;
      }
      case 'baccarat': return `<svg viewBox="0 0 160 100">${card(52, 52, -8, '9', '♦', 1)}${card(86, 52, 6, 'K', '♣', 0)}
        <text x="126" y="44" text-anchor="middle" font-family="'ZCOOL QingKe HuangYou', sans-serif" font-size="26" fill="#e8364f">庄</text>
        <text x="126" y="76" text-anchor="middle" font-family="'ZCOOL QingKe HuangYou', sans-serif" font-size="26" fill="#6fb7ff">闲</text></svg>`;
      case 'crash': return `<svg viewBox="0 0 160 100"><path d="M16 86 H148 M16 86 V12" stroke="rgba(217,164,65,.35)"/>
        <path d="M16 86 C70 84 104 70 132 26 L132 86Z" fill="rgba(246,201,78,.25)"/><path d="M16 86 C70 84 104 70 132 26" stroke="#f6c94e" stroke-width="3.5" fill="none"/>
        <g transform="translate(134 22) rotate(-55)"><path d="M-9 -6 H8 Q20 0 8 6 H-9Z" fill="#fbf6ea"/><circle cx="3" cy="0" r="3" fill="#35d49a"/><path d="M-9 -5 Q-26 0 -9 5Z" fill="#ff9a3c"/></g>
        <text x="30" y="34" font-family="Limelight, serif" font-size="20" fill="#f6c94e">8.88×</text></svg>`;
      case 'plinko': {
        let d = '';
        for (let r = 0; r < 7; r++) for (let j = 0; j < r + 3; j++) d += pip(80 + (j - (r + 2) / 2) * 13, 14 + r * 10, 2, '#e9dcc0');
        const bins = ['#ce263c', '#d9a441', '#16785a', '#d9a441', '#ce263c'];
        return `<svg viewBox="0 0 160 100">${d}${[-2, -1, 0, 1, 2].map((k, i) => `<rect x="${80 + k * 22 - 10}" y="84" width="20" height="10" rx="3" fill="${bins[i]}"/>`).join('')}<circle cx="86" cy="36" r="4.5" fill="#f6c94e"/></svg>`;
      }
    }
    return '';
  }

  // the lobby is the casino floor; the classic grid lives in its directory drawer
  function buildLobby() {
    const view = document.querySelector('.view[data-view="lobby"]');
    Floor.mount(view);
    const root = Floor.dirLobby;
    root.innerHTML = `
      <div class="lobby-hero">
        <div class="hero-copy">
          <p class="eyebrow" data-i18n="lobby.eyebrow">${t('lobby.eyebrow')}</p>
          <h1 class="hero-title"><span data-i18n="brand">${t('brand')}</span></h1>
          <p class="hero-sub" data-i18n="lobby.sub">${t('lobby.sub')}</p>
          <div class="hero-stats">
            <div><span data-i18n="stat.biggest">${t('stat.biggest')}</span><b class="st-big">0</b></div>
            <div><span data-i18n="stat.rounds">${t('stat.rounds')}</span><b class="st-rounds">0</b></div>
            <div><span data-i18n="stat.best">${t('stat.best')}</span><b class="st-mult">—</b></div>
          </div>
        </div>
        <div class="bonus-card">
          <div class="bonus-wheel-mini" aria-hidden="true"></div>
          <div class="bonus-copy">
            <div class="bonus-t" data-i18n="bonus.title">${t('bonus.title')}</div>
            <div class="bonus-s"></div>
            <button class="btn btn-gold bonus-btn"></button>
          </div>
        </div>
      </div>
      <div class="floor">
        <a class="floor-jp" href="#treasure">
          <div class="fj-head"><b data-i18n="floor.jp">${t('floor.jp')}</b><span data-i18n="floor.jpSub">${t('floor.jpSub')}</span></div>
          <div class="tb-jp">${['grand', 'major', 'minor', 'mini'].map(k => `<div class="jp jp-${k}"><span data-i18n="tb.jp.${k}">${t('tb.jp.' + k)}</span><b class="fj-${k}"></b></div>`).join('')}</div>
        </a>
        <div class="floor-feed"><div class="ff-head"><i class="live-dot"></i><b data-i18n="floor.live">${t('floor.live')}</b></div><ul class="ff-list"></ul></div>
      </div>
      ${SECTIONS.map(sec => `
      <div class="lobby-sec"><h2 data-i18n="lobby.${sec}">${t('lobby.' + sec)}</h2><p data-i18n="lobby.${sec}Sub">${t('lobby.' + sec + 'Sub')}</p></div>
      <div class="lobby-grid">
        ${GAMES.filter(g => g.sec === sec).map(g => `
          <a class="tile tile-${g.id}" href="#${g.id}">
            <div class="tile-art">${art(g.id)}</div>
            <div class="tile-info">
              <div class="tile-name" data-i18n="game.${g.id}">${t('game.' + g.id)}</div>
              <div class="tile-tag" data-i18n="tag.${g.id}">${t('tag.' + g.id)}</div>
              <div class="tile-meta">${g.rtp ? `<span class="rtp">RTP ${g.rtp}</span>` : `<span class="rtp" data-i18n="lobby.noRake">${t('lobby.noRake')}</span>`}${g.ai ? `<span class="ai-badge" data-i18n="lobby.withAI">${t('lobby.withAI')}</span>` : ''}${g.hot ? `<span class="hot" data-i18n="lobby.hot">${t('lobby.hot')}</span>` : ''}</div>
            </div>
          </a>`).join('')}
      </div>`).join('')}
      <p class="disclaimer" data-i18n="lobby.disclaimer">${t('lobby.disclaimer')}</p>`;
    root.querySelector('.bonus-btn').onclick = () => openWheel();
    U.$$('.tile', root).forEach(a => {
      a.addEventListener('pointerenter', () => Sound.fx.hover());
      a.addEventListener('click', () => Sound.fx.click());
    });
    refreshLobby();
    paintFeed();
  }
  function refreshLobby() {
    const root = document.querySelector('.view[data-view="lobby"]');
    if (!root) return;
    const s = C.S.stats;
    const jp = Casino.Jackpots.values;
    for (const k in jp) { const el = root.querySelector('.fj-' + k); if (el) el.textContent = U.fmt(Math.floor(jp[k])) + '.' + String(Math.floor(jp[k] * 100) % 100).padStart(2, '0'); }
    const set = (sel, v) => { const el = root.querySelector(sel); if (el) el.textContent = v; };
    set('.st-big', U.fmt(s.biggest)); set('.st-rounds', U.fmt(s.rounds)); set('.st-mult', s.bestMult ? s.bestMult + '×' : '—');
    const left = LS.get('wheelAt', 0) + WHEEL_COOLDOWN - Date.now();
    const btn = root.querySelector('.bonus-btn'), sub = root.querySelector('.bonus-s');
    if (!btn) return;
    if (left <= 0) { btn.disabled = false; btn.textContent = t('bonus.spin'); sub.textContent = t('bonus.ready'); root.querySelector('.bonus-card').classList.add('ready'); }
    else {
      btn.disabled = true;
      const h = Math.floor(left / 3600000), m = Math.floor(left / 60000) % 60, sec = Math.floor(left / 1000) % 60;
      btn.textContent = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
      sub.textContent = t('bonus.next');
      root.querySelector('.bonus-card').classList.remove('ready');
    }
  }
  C.onLobby = () => { refreshLobby(); Floor.enter(); };
  Floor.hooks.wheel = () => { if (LS.get('wheelAt', 0) + WHEEL_COOLDOWN > Date.now()) C.toast(t('bonus.next') + ' ' + (document.querySelector('.bonus-btn') || {}).textContent); else openWheel(); };
  // the floor only animates while it is on screen
  const go = C.go;
  C.go = function (id) { go.call(C, id); if (C.current !== 'lobby') Floor.stop(); };

  /* ---------- the floor: what everyone else is winning ---------- */
  const FEED_GAMES = ['caishen', 'caishen', 'treasure', 'treasure', 'slots', 'classic', 'crash', 'crash', 'roulette', 'baccarat', 'blackjack', 'sicbo', 'plinko', 'zhajinhua', 'niuniu', 'mahjong'];
  const FEED_BETS = [20, 50, 50, 100, 100, 100, 200, 200, 500, 1000, 2000, 5000];
  // a plausible multiplier per game: mostly small, now and then something that makes you look twice
  const feedMult = g => {
    const tail = (lo, a, cap) => Math.min(cap, lo / Math.pow(1 - Math.random(), a));
    switch (g) {
      case 'roulette': return Math.random() < 0.3 ? 36 : U.pick([2, 3, 6, 12]);
      case 'baccarat': return U.pick([1.95, 2, 2, 9, 12]);
      case 'blackjack': return U.pick([2, 2, 2.5, 4]);
      case 'sicbo': return U.pick([2, 2, 9, 31, 61, 151]);
      case 'crash': return Math.round(tail(1.5, 0.9, 400) * 100) / 100;
      case 'plinko': return U.pick([3, 5, 9, 13, 26, 130]);
      case 'zhajinhua': case 'niuniu': case 'mahjong': return U.pick([3, 4, 6, 8, 12, 24]);
      default: return Math.round(tail(3, 0.85, 2500));
    }
  };
  const feed = [];
  function pushFeed(e) {
    feed.unshift(e); feed.length = Math.min(feed.length, 6);
    paintFeed(true);
    dispatchEvent(new CustomEvent('floorwin', { detail: e }));
  }
  function fakeWin() {
    const g = U.pick(FEED_GAMES), bet = U.pick(FEED_BETS), mult = feedMult(g);
    return { who: U.randInt(0, 14), g, amt: Math.round(bet * mult), mult };
  }
  function paintFeed(fresh) {
    const ul = document.querySelector('.view[data-view="lobby"] .ff-list');
    if (!ul) return;
    const names = t('floor.names').split(',');
    ul.innerHTML = feed.map((e, i) => `<li class="${e.mult >= 50 ? 'big' : ''}${e.you ? ' you' : ''}${fresh && i === 0 ? ' new' : ''}">
      <b class="ff-n">${e.you ? t('floor.you') : names[e.who % names.length]}</b>
      <span class="ff-g">${t('floor.won', { g: t('game.' + e.g) })}</span>
      <b class="ff-a">+${U.fmt(e.amt)}</b>${e.mult >= 2 ? `<span class="ff-x">×${e.mult}</span>` : ''}</li>`).join('');
  }
  for (let i = 0; i < 5; i++) feed.push(fakeWin());
  (function tick() {
    if (C.current === 'lobby' && !document.hidden) { pushFeed(fakeWin()); if (feed[0].mult >= 50) Sound.fx.chip && Sound.fx.chip(); }
    setTimeout(tick, U.rand(2200, 6500));
  })();
  addEventListener('langchange', () => paintFeed());
  // your own good wins show up on the floor too
  const rec = C.record.bind(C);
  C.record = (ret, bet) => { rec(ret, bet); if (bet > 0 && ret >= bet * 5 && C.current && C.current !== 'lobby') feed.unshift({ you: true, g: C.current, amt: Math.round(ret), mult: Math.round(ret / bet * 10) / 10 }); feed.length = Math.min(feed.length, 6); };
  setInterval(() => { if (C.current === 'lobby') refreshLobby(); }, 1000);

  /* ---------- bonus wheel ---------- */
  function openWheel() {
    Sound.unlock();
    if (LS.get('wheelAt', 0) + WHEEL_COOLDOWN > Date.now()) return;
    const body = U.h('div', { class: 'wheel-modal' },
      U.h('div', { class: 'bw-wrap' }, U.h('canvas', { class: 'bw-canvas', width: 640, height: 640 }), U.h('div', { class: 'bw-pointer' }), U.h('button', { class: 'bw-hub' }, t('bonus.spin'))),
      U.h('p', { class: 'bw-note' }, t('bonus.note')));
    const close = C.modal({ title: t('bonus.title'), body });
    const cv = body.querySelector('canvas'), g = cv.getContext('2d'), R = 320, N = PRIZES.length, SEG = Math.PI * 2 / N;
    const cols = ['#b8132c', '#16110f', '#0e8a5c', '#16110f'];
    let ang = 0;
    function draw() {
      g.setTransform(1, 0, 0, 1, 0, 0); g.clearRect(0, 0, 640, 640);
      g.translate(R, R); g.rotate(ang);
      for (let i = 0; i < N; i++) {
        g.fillStyle = PRIZES[i] >= 25000 ? '#d9a441' : cols[i % 4];
        g.beginPath(); g.moveTo(0, 0); g.arc(0, 0, R - 14, i * SEG - Math.PI / 2 - SEG / 2, i * SEG - Math.PI / 2 + SEG / 2); g.closePath(); g.fill();
        g.strokeStyle = '#e8c06a'; g.lineWidth = 3; g.stroke();
        g.save(); g.rotate(i * SEG);
        g.fillStyle = PRIZES[i] >= 25000 ? '#1a1006' : '#f3ead3';
        g.font = '700 34px "Barlow Semi Condensed", sans-serif'; g.textAlign = 'center';
        g.fillText(U.fmtShort(PRIZES[i]), 0, -R + 70);
        g.restore();
      }
      g.lineWidth = 14; g.strokeStyle = '#8a5a17'; g.beginPath(); g.arc(0, 0, R - 8, 0, Math.PI * 2); g.stroke();
      for (let i = 0; i < N * 2; i++) {
        const a = i * SEG / 2; g.fillStyle = i % 2 ? '#fff3c0' : '#f6c94e';
        g.beginPath(); g.arc(Math.sin(a) * (R - 8), -Math.cos(a) * (R - 8), 5, 0, Math.PI * 2); g.fill();
      }
    }
    draw();
    const hub = body.querySelector('.bw-hub'), pointer = body.querySelector('.bw-pointer');
    let spun = false;
    hub.onclick = async () => {
      if (spun) return; spun = true;
      hub.disabled = true;
      LS.set('wheelAt', Date.now());
      const tot = PRIZE_W.reduce((a, b) => a + b, 0);
      let r = U.random() * tot, idx = 0;
      while (r > PRIZE_W[idx]) { r -= PRIZE_W[idx]; idx++; }
      const target = Math.PI * 2 * 8 - idx * SEG + U.rand(-SEG * 0.35, SEG * 0.35);
      Sound.fx.whoosh(true, 0.5);
      let lastSeg = 0;
      await U.tween(U.reduced ? 1500 : 5200, e => {
        ang = target * e; draw();
        const s = Math.floor((ang + SEG / 2) / SEG);
        if (s !== lastSeg) { lastSeg = s; Sound.fx.wheelTick(); U.pulse(pointer, 'flick'); }
      }, U.ease.outQuart);
      const prize = PRIZES[idx];
      Sound.fx.fanfare(1);
      const rc = U.center(cv);
      FX.confetti(rc.x, rc.y, 80); FX.sparks(rc.x, rc.y, 30, 'gold', 1.6);
      hub.textContent = U.fmt(prize); hub.classList.add('won');
      Sound.say(t('bonus.say', { n: U.fmt(prize) }));
      await U.sleep(900);
      C.pay(prize, hub);
      if (prize >= 10000) FX.rain(40, 1.5);
      await U.sleep(1400);
      close(); refreshLobby();
    };
  }

  /* ---------- settings ---------- */
  function openSettings() {
    const st = Sound.state, s = C.S.stats;
    const row = (id, key, on) => `<label class="set-row" for="${id}"><span>${t(key)}</span><span class="switch"><input type="checkbox" id="${id}" ${on ? 'checked' : ''}><span class="sw"></span></span></label>`;
    const body = U.h('div', { class: 'settings', html: `
      ${row('set-sfx', 'set.sfx', st.sfx)}
      ${row('set-music', 'set.music', st.music)}
      ${row('set-voice', 'set.voice', st.voice)}
      <div class="set-row"><span>${t('set.lang')}</span><div class="seg"><button class="seg-btn ${I18N.lang === 'zh' ? 'on' : ''}" data-l="zh">中文</button><button class="seg-btn ${I18N.lang === 'en' ? 'on' : ''}" data-l="en">English</button></div></div>
      <div class="set-row"><span>${t('lobby.academy')}</span><button class="btn btn-ghost btn-sm set-aca">${t('aca.open')}</button></div>
      <div class="set-row"><span>${t('set.ai')} <small class="ai-on-lab">${Casino.ai.on() ? '· ON' : ''}</small></span><button class="btn btn-ghost btn-sm set-ai">${t('set.aiOpen')}</button></div>
      <h3>${t('set.stats')}</h3>
      <dl class="stats-grid">
        <dt>${t('stat.level')}</dt><dd>${C.S.level}</dd>
        <dt>${t('stat.wagered')}</dt><dd>${U.fmt(s.wagered)}</dd>
        <dt>${t('stat.won')}</dt><dd>${U.fmt(s.won)}</dd>
        <dt>${t('stat.rounds')}</dt><dd>${U.fmt(s.rounds)}</dd>
        <dt>${t('stat.biggest')}</dt><dd>${U.fmt(s.biggest)}</dd>
        <dt>${t('stat.best')}</dt><dd>${s.bestMult ? s.bestMult + '×' : '—'}</dd>
      </dl>
      <div class="reset-zone"><button class="btn btn-ghost danger set-reset">${t('set.reset')}</button></div>
      <p class="fine">${t('lobby.disclaimer')}</p>` });
    const close = C.modal({ title: t('set.title'), body });
    body.querySelector('#set-sfx').onchange = e => { Sound.setSfx(e.target.checked); syncSoundBtn(); Sound.fx.click(); };
    body.querySelector('#set-music').onchange = e => { Sound.setMusic(e.target.checked); Sound.unlock(); };
    body.querySelector('#set-voice').onchange = e => { Sound.setVoice(e.target.checked); if (e.target.checked) Sound.say(t('set.voiceOn')); };
    U.$$('[data-l]', body).forEach(b => b.onclick = () => { setLang(b.dataset.l); close(); openSettings(); });
    body.querySelector('.set-ai').onclick = () => { close(); openAI(); };
    body.querySelector('.set-aca').onclick = () => { close(); Tutor.academy(); };
    const reset = body.querySelector('.set-reset');
    reset.onclick = () => {
      if (!reset.classList.contains('confirm')) { reset.classList.add('confirm'); reset.textContent = t('set.resetConfirm'); Sound.fx.error(); return; }
      LS.clear(); location.hash = 'lobby'; location.reload();
    };
  }

  /* ---------- AI opponents: a language model takes a house seat ---------- */
  function openAI() {
    const c = Casino.ai.get();
    const esc = v => String(v || '').replace(/[&"<>]/g, ch => ({ '&': '&amp;', '"': '&quot;', '<': '&lt;', '>': '&gt;' }[ch]));
    const body = U.h('div', { class: 'settings ai-set', html: `
      <p class="fine">${t('ai.lead')}</p>
      <label class="set-row" for="ai-on"><span>${t('ai.enable')}</span><span class="switch"><input type="checkbox" id="ai-on" ${c.enabled ? 'checked' : ''}><span class="sw"></span></span></label>
      <label>${t('ai.base')}<input type="url" id="ai-base" placeholder="https://api.anthropic.com" value="${esc(c.baseURL)}" autocomplete="off" spellcheck="false"></label>
      <label>${t('ai.key')}<input type="password" id="ai-key" value="${esc(c.apiKey)}" autocomplete="off" spellcheck="false"></label>
      <label>${t('ai.model')}<input type="text" id="ai-model" placeholder="claude-sonnet-5-5" value="${esc(c.model)}" autocomplete="off" spellcheck="false"></label>
      <label>${t('ai.seats')}<select id="ai-seats">${[1, 2, 3, 4].map(n => `<option ${n === c.seats ? 'selected' : ''}>${n}</option>`).join('')}</select></label>
      <div class="ai-row"><button class="btn btn-ghost btn-sm ai-test">${t('ai.test')}</button><span class="ai-status" aria-live="polite"></span></div>
      <p class="fine">${t('ai.note')}</p>` });
    const $ = s => body.querySelector(s);
    const read = () => ({ enabled: $('#ai-on').checked, baseURL: $('#ai-base').value.trim().replace(/\/+$/, ''), apiKey: $('#ai-key').value.trim(), model: $('#ai-model').value.trim(), seats: +$('#ai-seats').value });
    C.modal({ title: t('ai.title'), body, actions: [{ label: t('ai.save'), primary: true, onClick: close => { Casino.ai.set(read()); C.toast(t('ai.saved'), 'good'); close(); } }] });
    $('.ai-test').onclick = async () => {
      const st = $('.ai-status'); st.className = 'ai-status'; st.textContent = t('ai.testing');
      Casino.ai.set(Object.assign(read(), { enabled: true }));
      try { const r = await Casino.ai.test(); st.textContent = t('ai.ok', { r: r.slice(0, 40) }); st.classList.add('good'); $('#ai-on').checked = true; }
      catch (e) { st.textContent = t('ai.fail', { e: String(e.message || e).slice(0, 140) }); st.classList.add('bad'); Casino.ai.set(read()); }
    };
  }

  function syncSoundBtn() {
    const b = document.getElementById('btn-sound');
    const on = Sound.state.sfx;
    b.innerHTML = C.icon(on ? 'sound' : 'mute');
    b.setAttribute('aria-label', t(on ? 'set.mute' : 'set.unmute'));
  }
  function setLang(l) {
    I18N.set(l);
    I18N.apply(document);
    document.getElementById('btn-lang').textContent = l === 'zh' ? 'EN' : '中';
    document.title = t('title');
    buildLobby();
    syncSoundBtn();
    Sound.fx.click();
  }

  /* ---------- boot ---------- */
  function boot() {
    FX.init();
    I18N.apply(document);
    document.title = t('title');
    document.getElementById('btn-lang').textContent = I18N.lang === 'zh' ? 'EN' : '中';
    document.getElementById('btn-lang').onclick = () => setLang(I18N.lang === 'zh' ? 'en' : 'zh');
    document.getElementById('btn-sound').onclick = () => { Sound.setSfx(!Sound.state.sfx); syncSoundBtn(); Sound.unlock(); Sound.fx.click(); };
    document.getElementById('btn-settings').onclick = () => { Sound.unlock(); openSettings(); };
    document.getElementById('refill').onclick = () => C.refill();
    document.querySelector('.brand').onclick = e => { e.preventDefault(); Sound.fx.click(); C.go('lobby'); };
    syncSoundBtn();
    buildLobby();
    C.paintAll();
    addEventListener('hashchange', () => C.go(location.hash.slice(1) || 'lobby'));
    addEventListener('keydown', e => C.keys(e));
    const unlock = () => { Sound.unlock(); removeEventListener('pointerdown', unlock); removeEventListener('keydown', unlock); };
    addEventListener('pointerdown', unlock); addEventListener('keydown', unlock);
    // button press feel everywhere
    document.addEventListener('pointerdown', e => {
      const b = e.target.closest('.btn, .tog, .spin-btn, .step-btn, .seg-btn');
      if (b && !b.disabled) U.pulse(b, 'press');
    });
    C.go(location.hash.slice(1) || 'lobby');
    document.body.classList.add('ready');
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot); else boot();
})();
