/* Services: everything on the floor that isn't a table. Your vitals (energy,
   drink), the casino clock, the restaurant, bar, hotel, boutique, the cage with
   its house-edge ledger, the players club and its comps, the concierge, the
   fountain and the door out. Exposed as window.Services */
(function () {
  const t = (k, p) => I18N.t(k, p);
  const V = Object.assign({ energy: 100, drunk: 0, min: 20 * 60, life: 0, comp: 0, free: 0, drinks: 0, meals: 0, nights: 0, limit: 0, remind: 0, owned: [] }, LS.get('svc', {}));
  const save = () => LS.set('svc', V);
  // one night on the floor, until you walk out of the door
  const fresh = () => ({ t0: Date.now(), w: C.S.stats.wagered, won: C.S.stats.won, spent: C.S.stats.spent || 0, theo: 0, comp: 0, drinks: 0, free: 0, rounds: C.S.stats.rounds, pts: [[0, 0]], warned: 0, checked: 0 });
  let N = Object.assign(fresh(), LS.get('night', {}));
  const saveN = () => LS.set('night', N);

  /* ---------------- the house edge, per game ---------------- */
  const EDGE = { slots: 0.05, classic: 0.046, caishen: 0.04, treasure: 0.05, blackjack: 0.006, roulette: 0.027, baccarat: 0.011, sicbo: 0.028, crash: 0.03, plinko: 0.01 };
  const edge = id => EDGE[id] || 0;
  const TIERS = [0, 500, 5000, 50000, 500000];
  const COLORS = ['#9aa7a0', '#d8dde4', '#f6c94e', '#e6ecf2', '#20232a'];
  const tier = () => { let i = 0; while (i < 4 && V.life >= TIERS[i + 1]) i++; return i; };

  // every wager earns the casino its edge on paper; the club hands a quarter of that back
  const take = C.take.bind(C), refund = C.refund.bind(C), record = C.record.bind(C);
  C.take = function (amount, force) {
    const before = C.S.balance, ok = take(amount, force);
    const real = before - C.S.balance;
    if (ok && real > 0 && C.current && C.current !== 'lobby') {
      const th = real * edge(C.current), t0 = tier();
      V.life += th; V.comp += th * 0.25; N.theo += th; N.comp += th * 0.25;
      V.energy = Math.max(0, V.energy - 0.12); N.dirty = 1;
      if (tier() > t0) setTimeout(() => tierUp(tier()), 900);
    }
    return ok;
  };
  C.refund = function (amount) {
    const th = Math.floor(amount) * edge(C.current);
    if (th > 0) { V.life = Math.max(0, V.life - th); V.comp = Math.max(0, V.comp - th * 0.25); N.theo = Math.max(0, N.theo - th); N.comp = Math.max(0, N.comp - th * 0.25); }
    refund(amount);
  };
  C.record = function (ret, bet) {
    record(ret, bet);
    V.min += 1;
    const p = N.pts; p.push([Math.round(-N.theo), net()]);
    if (p.length > 400) N.pts = p.filter((_, i) => i % 2 === 0 || i === p.length - 1);
    save(); saveN();
    guard();
  };
  const net = () => (C.S.stats.won - N.won) - (C.S.stats.wagered - N.w);

  /* ---------------- vitals and the clock ---------------- */
  function vit() {
    let speed = V.energy < 20 ? 0.62 : V.energy < 40 ? 0.84 : 1;
    if (V.drunk > 60) speed *= 0.86;
    return { energy: Math.round(V.energy), drunk: Math.round(V.drunk), speed };
  }
  const hhmm = m => { m = ((m % 1440) + 1440) % 1440; return String(m / 60 | 0).padStart(2, '0') + ':' + String(m % 60 | 0).padStart(2, '0'); };
  const day = () => Math.floor(V.min / 1440) + 1;
  function advance(min) { V.min += min; save(); if (window.Story && Story.onTime) Story.onTime(min); }
  let tick = 0;
  setInterval(() => {
    if (document.hidden) return;
    tick++;
    V.min += 1 / 3;                                // four casino minutes a minute: nights go fast in here
    V.energy = Math.max(0, V.energy - 0.06);
    V.drunk = Math.max(0, V.drunk - 0.18);
    if (V.energy < 22 && !N.warned) { N.warned = 1; C.toast(t('sv.tired'), 'bad'); }
    if (V.energy <= 0) passOut();
    if (tick % 6 === 0) { save(); saveN(); }
    reality();
  }, 5000);

  async function passOut() {
    if (passOut.on) return; passOut.on = 1;
    if (C.current !== 'lobby') C.go('lobby');
    await night(t('sv.out.t'), t('sv.out.s'), 1600);
    V.energy = 35; V.drunk = Math.min(V.drunk, 20); N.warned = 0; advance(180);
    C.modal({ title: t('sv.out.t'), body: U.h('p', null, t('sv.out.b')), actions: [{ label: t('sv.ok'), primary: true }] });
    passOut.on = 0;
  }

  /* responsible-gaming tools the concierge sets up */
  function guard() {
    if (V.limit && -net() >= V.limit && !N.limitHit) {
      N.limitHit = 1; saveN();
      setTimeout(() => C.modal({ title: t('sv.lim.hit'), body: U.h('p', null, t('sv.lim.hitB', { n: U.fmt(-net()) })), actions: [
        { label: t('sv.lim.go'), primary: true, onClick: c => { c(); story('limit'); C.go('lobby'); setTimeout(() => window.Floor && Floor.goto('exit'), 400); } },
        { label: t('sv.lim.stay') }] }), 1400);
    }
  }
  function reality() {
    if (!V.remind) return;
    const mins = (Date.now() - N.t0) / 60000;
    if (mins - N.checked >= V.remind) {
      N.checked = Math.floor(mins / V.remind) * V.remind; saveN();
      C.toast(t('sv.rc', { m: Math.round(mins), n: (net() >= 0 ? '+' : '') + U.fmt(net()) }), net() < 0 ? 'bad' : '');
    }
  }

  /* ---------------- paying: comps first, then chips ---------------- */
  function pay(price, el) {
    if (price <= 0) return true;
    const c = Math.min(Math.floor(V.comp), price);
    if (price - c > 0 && !C.spend(price - c, el)) return false;
    if (c > 0) { V.comp -= c; C.toast(t('sv.comped', { n: U.fmt(c) }), 'good'); }
    save(); Sound.fx.cashReg();
    return true;
  }

  /* ---------------- shared sheet UI ---------------- */
  const story = (k, a) => { if (window.Story && Story.event) Story.event(k, a); };
  const fmtP = p => p ? U.fmt(p) : t('sv.free');
  function sheet(kind, title, intro, items, buy, extra) {
    const grid = U.h('div', { class: 'sv-grid' });
    const paint = () => {
      grid.innerHTML = '';
      for (const it of items()) {
        const eff = [];
        if (it.e) eff.push(U.h('span', { class: 'sv-eff e' }, (it.e > 0 ? '+' : '') + it.e + ' ' + t('vit.energy')));
        if (it.d) eff.push(U.h('span', { class: 'sv-eff d' }, (it.d > 0 ? '+' : '') + it.d + ' ' + t('vit.drunk')));
        if (it.tag) eff.push(U.h('span', { class: 'sv-eff' }, it.tag));
        const b = U.h('button', { class: 'sv-item' + (it.lux ? ' lux' : '') + (it.on ? ' on' : ''), disabled: it.off ? '' : null },
          U.h('div', { class: 'sv-art', html: it.art || '' }),
          U.h('div', { class: 'sv-txt' }, U.h('b', null, it.name), U.h('small', null, it.desc), U.h('div', { class: 'sv-effs' }, eff)),
          U.h('div', { class: 'sv-price' + (it.p ? '' : ' free') }, it.priceText || fmtP(it.p)));
        if (it.off) b.disabled = true;
        b.onclick = () => buy(it, b, paint);
        grid.appendChild(b);
      }
    };
    paint();
    const body = U.h('div', { class: 'sv sv-' + kind },
      U.h('div', { class: 'sv-hero' }, U.h('p', null, intro), U.h('div', { class: 'sv-wallet' },
        U.h('span', null, t('sv.comp') + ' ', U.h('b', null, U.fmt(Math.floor(V.comp)))),
        U.h('span', null, t('vit.energy') + ' ', U.h('b', null, Math.round(V.energy))),
        U.h('span', null, t('vit.drunk') + ' ', U.h('b', null, Math.round(V.drunk))))),
      grid, extra || null);
    const close = C.modal({ title, body, wide: true });
    return { close, paint };
  }

  /* full-screen moments: a dish under a cloche, a pour, a tower, a sunrise */
  function stage(cls, art, title, sub, ms = 2600) {
    return new Promise(res => {
      const el = U.h('div', { class: 'sv-stage ' + cls, role: 'status' },
        U.h('div', { class: 'sv-stage-art', html: art }),
        U.h('div', { class: 'sv-stage-t' }, title), sub ? U.h('div', { class: 'sv-stage-s' }, sub) : null);
      document.body.appendChild(el);
      let done = false;
      const end = () => { if (done) return; done = true; el.classList.add('out'); setTimeout(() => { el.remove(); res(); }, 420); };
      el.onclick = end;
      setTimeout(end, U.reduced ? Math.min(ms, 1200) : ms);
    });
  }
  function night(title, sub, ms = 3200) {
    return stage('sv-night', `<div class="sv-sky"><i class="moon"></i><i class="sun"></i>${Array.from({ length: 24 }, (_, i) => `<b style="left:${(i * 37) % 100}%;top:${(i * 53) % 60}%;--d:${(i % 7) * 0.3}s"></b>`).join('')}<div class="sv-city"></div></div>`, title, sub, ms);
  }

  /* ---------------- art ---------------- */
  const plate = (inner, big) => `<svg viewBox="0 0 120 90" aria-hidden="true"><ellipse cx="60" cy="60" rx="${big ? 56 : 48}" ry="${big ? 22 : 19}" fill="#000" opacity=".25"/><ellipse cx="60" cy="56" rx="${big ? 56 : 48}" ry="${big ? 22 : 19}" fill="#f7f2e6" stroke="#d9a441" stroke-width="2.5"/><ellipse cx="60" cy="56" rx="${big ? 40 : 34}" ry="${big ? 14 : 12}" fill="#efe7d3"/>${inner}</svg>`;
  const DISH = {
    coffee: `<svg viewBox="0 0 120 90" aria-hidden="true"><ellipse cx="60" cy="70" rx="36" ry="9" fill="#f7f2e6" stroke="#d9a441" stroke-width="2"/><path d="M38 34h44l-5 32H43z" fill="#fbf8f0" stroke="#d9a441" stroke-width="2"/><ellipse cx="60" cy="35" rx="22" ry="5" fill="#5a3418"/><ellipse cx="57" cy="34" rx="8" ry="2" fill="#c8915a" opacity=".7"/><path d="M82 42c10 0 10 14 0 14" fill="none" stroke="#d9a441" stroke-width="3"/></svg>`,
    noodles: `<svg viewBox="0 0 120 90" aria-hidden="true"><ellipse cx="60" cy="74" rx="30" ry="6" fill="#000" opacity=".25"/><path d="M18 40h84c-2 22-18 34-42 34S20 62 18 40z" fill="#b3192b" stroke="#f6c94e" stroke-width="2"/><path d="M26 52h68" stroke="#f6c94e" stroke-width="1.5" stroke-dasharray="4 3"/><ellipse cx="60" cy="40" rx="42" ry="9" fill="#e7b04f"/>${[30, 40, 50, 62, 74, 84].map((x, i) => `<path d="M${x} 36q4 6 8 0" fill="none" stroke="#fff0b8" stroke-width="2"/>`).join('')}<circle cx="48" cy="38" r="3" fill="#3f9b3a"/><circle cx="72" cy="40" r="3" fill="#3f9b3a"/><ellipse cx="62" cy="37" rx="7" ry="4" fill="#f4d9b8"/></svg>`,
    buffet: plate(`<ellipse cx="44" cy="52" rx="10" ry="6" fill="#c8283c"/><ellipse cx="66" cy="50" rx="12" ry="6" fill="#f2c14e"/><ellipse cx="58" cy="60" rx="11" ry="5" fill="#3f9b3a"/><ellipse cx="78" cy="58" rx="8" ry="5" fill="#8a4a20"/><circle cx="46" cy="49" r="2" fill="#fff"/>`),
    cantonese: `<svg viewBox="0 0 120 90" aria-hidden="true"><ellipse cx="60" cy="72" rx="46" ry="10" fill="#000" opacity=".25"/><path d="M14 46v16c0 8 20 14 46 14s46-6 46-14V46" fill="#c99a52" stroke="#7a5320" stroke-width="2"/><path d="M14 54c0 8 20 14 46 14s46-6 46-14" fill="none" stroke="#7a5320" stroke-width="1.5"/><ellipse cx="60" cy="46" rx="46" ry="14" fill="#e8c27a" stroke="#7a5320" stroke-width="2"/>${[[42, 42], [60, 38], [78, 42], [50, 50], [70, 50]].map(([x, y]) => `<path d="M${x - 9} ${y + 3}q9-14 18 0z" fill="#fbf6ea" stroke="#e6dcc4"/><path d="M${x - 4} ${y - 2}l2 -4M${x + 1} ${y - 3}l1 -4" stroke="#e6dcc4"/>`).join('')}</svg>`,
    abalone: plate(`<ellipse cx="60" cy="56" rx="30" ry="9" fill="#7a3d10" opacity=".55"/><ellipse cx="50" cy="53" rx="12" ry="7" fill="#c98a3a"/><ellipse cx="50" cy="52" rx="8" ry="4" fill="#e8b25a"/><ellipse cx="72" cy="54" rx="12" ry="7" fill="#c98a3a"/><ellipse cx="72" cy="53" rx="8" ry="4" fill="#e8b25a"/><path d="M40 62q6-4 12 0M66 62q6-4 12 0" stroke="#3f9b3a" stroke-width="3" fill="none"/>`, true),
    manhan: `<svg viewBox="0 0 120 90" aria-hidden="true"><ellipse cx="60" cy="64" rx="58" ry="20" fill="#000" opacity=".3"/><ellipse cx="60" cy="58" rx="58" ry="20" fill="#e3b04b" stroke="#8a5a17" stroke-width="2"/><ellipse cx="60" cy="56" rx="48" ry="15" fill="#f4d58a"/><path d="M28 54c0-14 18-22 34-22s30 8 30 20c0 6-12 10-32 10S28 62 28 54z" fill="#a0391c"/><path d="M36 48c8-10 30-12 46-4" stroke="#d96b3a" stroke-width="4" fill="none" stroke-linecap="round"/><circle cx="86" cy="46" r="3" fill="#2a120a"/><path d="M92 50l8-3" stroke="#a0391c" stroke-width="4" stroke-linecap="round"/>${[[18, 60, '#3f9b3a'], [102, 60, '#3f9b3a'], [30, 68, '#c8283c'], [90, 68, '#c8283c'], [60, 72, '#f6c94e']].map(([x, y, c]) => `<circle cx="${x}" cy="${y}" r="5" fill="${c}"/>`).join('')}</svg>`
  };
  const glass = (kind, color) => {
    const L = color;
    if (kind === 'tall') return `<svg viewBox="0 0 120 90" aria-hidden="true"><defs><clipPath id="gt"><path d="M44 10h32l-4 70H48z"/></clipPath></defs><g clip-path="url(#gt)"><rect class="lq" x="40" y="22" width="40" height="60" fill="${L}"/>${L === '#f2b632' ? '<rect class="lq" x="40" y="18" width="40" height="8" fill="#fffbe8"/>' : ''}</g><path d="M44 10h32l-4 70H48z" fill="rgba(255,255,255,.08)" stroke="#e8f2f2" stroke-width="2"/><g class="bub"><circle cx="54" cy="60" r="1.6"/><circle cx="64" cy="48" r="1.3"/><circle cx="58" cy="38" r="1.1"/></g></svg>`;
    if (kind === 'martini') return `<svg viewBox="0 0 120 90" aria-hidden="true"><defs><clipPath id="gm"><path d="M30 14h60L60 46z"/></clipPath></defs><g clip-path="url(#gm)"><rect class="lq" x="28" y="20" width="64" height="30" fill="${L}"/></g><path d="M30 14h60L60 46zM60 46v28M44 78h32" fill="rgba(255,255,255,.06)" stroke="#e8f2f2" stroke-width="2"/><circle cx="72" cy="24" r="4" fill="#c8283c"/><path d="M72 20l6-10" stroke="#3a2a1a" stroke-width="1.5"/></svg>`;
    if (kind === 'rocks') return `<svg viewBox="0 0 120 90" aria-hidden="true"><defs><clipPath id="gr"><path d="M34 28h52l-4 48H38z"/></clipPath></defs><g clip-path="url(#gr)"><rect class="lq" x="30" y="46" width="60" height="34" fill="${L}"/><rect x="46" y="42" width="16" height="14" rx="3" fill="rgba(230,245,255,.7)" transform="rotate(-12 54 49)"/></g><path d="M34 28h52l-4 48H38z" fill="rgba(255,255,255,.07)" stroke="#e8f2f2" stroke-width="2.4"/><path d="M38 70h44" stroke="#e8f2f2" stroke-width="3"/></svg>`;
    if (kind === 'wine') return `<svg viewBox="0 0 120 90" aria-hidden="true"><defs><clipPath id="gw"><path d="M42 8h36c2 22-4 36-18 36S40 30 42 8z"/></clipPath></defs><g clip-path="url(#gw)"><rect class="lq" x="38" y="24" width="44" height="24" fill="${L}"/></g><path d="M42 8h36c2 22-4 36-18 36S40 30 42 8zM60 44v30M46 78h28" fill="rgba(255,255,255,.06)" stroke="#e8f2f2" stroke-width="2"/><g transform="translate(88 18)"><rect x="0" y="16" width="14" height="52" rx="3" fill="#1b0a10"/><rect x="4" y="2" width="6" height="16" fill="#1b0a10"/><rect x="2" y="30" width="10" height="16" fill="#f3ead3"/><text x="7" y="41" font-size="5" text-anchor="middle" fill="#7a0f1c">82</text></g></svg>`;
    // champagne tower: 1 + 2 + 3 + 4 coupes, poured from the top
    let s = '<svg viewBox="0 0 120 90" aria-hidden="true">';
    for (let r = 0; r < 4; r++) for (let i = 0; i <= r; i++) {
      const x = 60 + (i - r / 2) * 22, y = 12 + r * 19;
      s += `<g transform="translate(${x} ${y})"><clipPath id="cp${r}${i}"><path d="M-10 0h20c0 7-4 9-10 9s-10-2-10-9z"/></clipPath><g clip-path="url(#cp${r}${i})"><rect class="lq" style="--dl:${r * 0.45 + i * 0.08}s" x="-11" y="0" width="22" height="10" fill="${L}"/></g><path d="M-10 0h20c0 7-4 9-10 9s-10-2-10-9zM0 9v7M-5 16h10" fill="rgba(255,255,255,.08)" stroke="#e8f2f2" stroke-width="1.2"/></g>`;
    }
    return s + '</svg>';
  };
  const ICON = {
    bed: '<svg viewBox="0 0 120 90" aria-hidden="true"><rect x="14" y="44" width="92" height="22" rx="4" fill="#7a0f1c"/><rect x="14" y="36" width="30" height="14" rx="5" fill="#f3ead3"/><rect x="40" y="40" width="66" height="12" rx="4" fill="#c8283c"/><path d="M14 30v46M106 52v24" stroke="#d9a441" stroke-width="4"/><path d="M60 22a10 10 0 1 0 12 12a8 8 0 1 1-12-12z" fill="#f6c94e"/></svg>',
    suite: '<svg viewBox="0 0 120 90" aria-hidden="true"><rect x="10" y="20" width="100" height="56" fill="#0d1a2c" stroke="#d9a441" stroke-width="2"/>' + Array.from({ length: 16 }, (_, i) => `<rect x="${16 + (i % 8) * 12}" y="${48 - (i * 7 % 22)}" width="8" height="${28 + (i * 7 % 22)}" fill="#1f3550"/><rect x="${18 + (i % 8) * 12}" y="${52 - (i * 7 % 22)}" width="2" height="2" fill="#f6c94e"/>`).join('') + '<path d="M10 76h100" stroke="#d9a441" stroke-width="3"/><circle cx="92" cy="30" r="5" fill="#fff3c0"/></svg>',
    villa: '<svg viewBox="0 0 120 90" aria-hidden="true"><path d="M60 8l46 26H14z" fill="#d9a441"/><rect x="20" y="34" width="80" height="42" fill="#f3ead3"/>' + [28, 46, 64, 82].map(x => `<rect x="${x}" y="40" width="10" height="36" fill="#e3d6b8"/>`).join('') + '<rect x="54" y="56" width="12" height="20" fill="#7a0f1c"/><path d="M8 78h104" stroke="#d9a441" stroke-width="4"/></svg>',
    nap: '<svg viewBox="0 0 120 90" aria-hidden="true"><rect x="22" y="40" width="76" height="22" rx="10" fill="#1f3a5f"/><rect x="26" y="34" width="22" height="12" rx="5" fill="#f3ead3"/><text x="78" y="34" font-size="16" fill="#f6c94e" font-weight="800">z</text><text x="90" y="24" font-size="12" fill="#f6c94e" font-weight="800">z</text></svg>'
  };

  /* ---------------- restaurant ---------------- */
  const FOOD = [
    { id: 'coffee', p: 30, e: 8, d: -5 },
    { id: 'noodles', p: 288, e: 22 },
    { id: 'buffet', p: 888, e: 38 },
    { id: 'cantonese', p: 2888, e: 58 },
    { id: 'abalone', p: 18888, e: 85, lux: 1 },
    { id: 'manhan', p: 88888, e: 100, lux: 1 }
  ];
  function restaurant() {
    const s = sheet('food', t('svc.restaurant'), t('sv.food.intro'), () => FOOD.map(f => Object.assign({ name: t('sv.f.' + f.id), desc: t('sv.fd.' + f.id), art: DISH[f.id] }, f)), async (it, b) => {
      if (!pay(it.p, b)) return;
      s.close();
      V.meals++; N.meals = (N.meals || 0) + 1;
      if (it.id === 'manhan' && window.Floor) Floor.crowd(12);
      Sound.fx.open();
      setTimeout(() => Sound.fx.glass(), 650);
      await stage('sv-serve' + (it.lux ? ' lux' : ''), `<div class="sv-dish">${DISH[it.id]}<div class="sv-cloche"></div><i class="steam"></i><i class="steam"></i><i class="steam"></i></div>`, t('sv.f.' + it.id), t('sv.served', { n: it.e }), it.lux ? 3600 : 2600);
      V.energy = Math.min(100, V.energy + it.e); if (it.d) V.drunk = Math.max(0, V.drunk + it.d);
      N.warned = 0; advance(it.lux ? 90 : it.id === 'coffee' ? 5 : 35); save();
      if (it.lux && window.Floor) { Floor.coins(26); Floor.say('host', t('sv.host.lux')); }
      if (window.Story && Story.event) Story.event('meal', it.id);
    });
  }

  /* ---------------- bar ---------------- */
  const BAR = [
    { id: 'water', p: 0, d: -12, e: 2, g: ['tall', '#cfe8f2'] },
    { id: 'beer', p: 58, d: 12, e: 2, g: ['tall', '#f2b632'] },
    { id: 'cocktail', p: 288, d: 18, g: ['martini', '#e8467a'] },
    { id: 'whisky', p: 888, d: 26, g: ['rocks', '#c06a1c'] },
    { id: 'lafite', p: 28888, d: 22, g: ['wine', '#6a0f22'], lux: 1 },
    { id: 'tower', p: 88888, d: 30, g: ['tower', '#f3dc8a'], lux: 1 }
  ];
  function bar() {
    const cut = V.drunk >= 80;
    const s = sheet('bar', t('svc.bar'), t(cut ? 'sv.bar.cut' : 'sv.bar.intro'), () => BAR.map(d => Object.assign({ name: t('sv.d.' + d.id), desc: t('sv.dd.' + d.id), art: glass(d.g[0], d.g[1]), off: cut && d.d > 0 }, d)), async (it, b) => {
      if (!pay(it.p, b)) return;
      s.close();
      if (window.Floor) Floor.say('bartender', t(it.lux ? 'sv.bt.lux' : 'sv.bt.' + (it.id === 'water' ? 'water' : 'pour')));
      Sound.fx.pour(); setTimeout(() => Sound.fx.glass(), 900);
      if (it.id === 'tower') { if (window.Floor) Floor.crowd(14); setTimeout(() => Sound.fx.cheer(1.4), 900); setTimeout(() => FX.confetti(innerWidth / 2, innerHeight * 0.4, 90), 1800); }
      await stage('sv-pour' + (it.id === 'tower' ? ' tower' : '') + (it.lux ? ' lux' : ''), `<div class="sv-glass">${glass(it.g[0], it.g[1])}</div>`, t('sv.d.' + it.id), it.d > 0 ? t('sv.drank') : t('sv.sober'), it.id === 'tower' ? 4200 : 2400);
      drink(it.d, it.e || 0);
      story('drink', it.id);
    });
  }
  function drink(d, e = 0) {
    V.drunk = U.clamp(V.drunk + d, 0, 100); V.energy = Math.min(100, V.energy + e);
    if (d > 0) { V.drinks++; N.drinks++; }
    save(); saveN();
    if (V.drunk >= 80) C.toast(t('sv.wasted'), 'bad');
  }
  // the waitress brings it to you, free; the casino is not being generous
  function freeDrink(w) {
    if (document.querySelector('.modal-ov')) return;
    const opts = [BAR[0], BAR[1], BAR[2]];
    const body = U.h('div', { class: 'sv sv-free' },
      U.h('p', null, t(N.free >= 2 ? 'sv.free.again' : 'sv.free.intro')),
      U.h('div', { class: 'sv-row' }, opts.map(d => U.h('button', { class: 'sv-mini', onclick: () => {
        close(); N.free++; V.free++; story('free', V.free);
        Sound.fx.glass(); drink(d.d, d.e || 0);
        if (window.Floor) { Floor.say('you', t('sv.free.thanks')); if (w) setTimeout(() => Floor.say(w, t('sv.free.enjoy')), 900); }
        if (N.free === 3) setTimeout(() => C.modal({ title: t('sv.free.why'), body: U.h('p', null, t('sv.free.whyB')), actions: [{ label: t('sv.ok'), primary: true }] }), 1200);
      } }, U.h('span', { html: glass(d.g[0], d.g[1]) }), U.h('b', null, t('sv.d.' + d.id))))),
      U.h('button', { class: 'btn btn-ghost btn-sm', onclick: () => { if (C.spend(50)) { close(); Sound.fx.coin(); C.toast(t('sv.free.tip'), 'good'); } } }, t('sv.free.tipBtn')));
    const close = C.modal({ title: t('sv.free.t'), body, actions: [{ label: t('sv.free.no') }] });
  }

  /* ---------------- hotel ---------------- */
  const ROOMS = [
    { id: 'nap', p: 588, e: 40, h: 120 },
    { id: 'deluxe', p: 2888, e: 100, wake: true },
    { id: 'suite', p: 18888, e: 100, wake: true, lux: 1 },
    { id: 'villa', p: 188888, e: 100, wake: true, lux: 1 }
  ];
  function hotel() {
    const tr = tier();
    const s = sheet('hotel', t('svc.hotel'), t('sv.hotel.intro', { h: hhmm(V.min) }), () => ROOMS.map(r => {
      const comp = (r.id === 'deluxe' && tr >= 2) || (r.id === 'suite' && tr >= 4);
      return Object.assign({ name: t('sv.h.' + r.id), desc: t('sv.hd.' + r.id), art: ICON[r.id === 'deluxe' ? 'bed' : r.id], tag: comp ? t('sv.roomComp') : null }, r, { p: comp ? 0 : r.p });
    }), async (it, b) => {
      if (!pay(it.p, b)) return;
      s.close();
      Sound.fx.open();
      const before = V.min;
      if (it.wake) { const m = ((V.min % 1440) + 1440) % 1440; V.min += (m < 600 ? 600 - m : 1440 - m + 600); V.nights++; }
      else V.min += it.h;
      V.energy = Math.min(100, V.energy + it.e); V.drunk = it.wake ? 0 : Math.max(0, V.drunk - 30); N.warned = 0; save();
      await night(it.wake ? t('sv.morning') : t('sv.napped'), t('sv.slept', { a: hhmm(before), b: hhmm(V.min), d: day() }), it.wake ? 3800 : 2400);
      if (window.Story && Story.onTime) Story.onTime(V.min - before);
      if (window.Story && Story.event) Story.event('sleep', it.id);
    });
  }

  /* ---------------- boutique ---------------- */
  const WEAR = [
    { id: 'tee', p: 0, look: { top: '#1f3a5f', bot: '#22262e', tie: null, trim: null, vest: null } },
    { id: 'hawaii', p: 888, look: { top: '#1e8c7e', bot: '#e8dcc0', tie: null, trim: null, vest: null } },
    { id: 'navy', p: 3888, look: { top: '#1c2a4a', bot: '#151a28', tie: '#7a0f1c', trim: null, vest: null } },
    { id: 'tang', p: 6888, look: { top: '#8a1420', bot: '#14110f', tie: null, trim: '#f6c94e', vest: null } },
    { id: 'tux', p: 12888, look: { top: '#121212', bot: '#121212', tie: null, bow: '#121212', trim: null, vest: '#f3ead3' } },
    { id: 'white', p: 28888, look: { top: '#efe9dc', bot: '#efe9dc', tie: '#14110f', trim: null, vest: null }, lux: 1 }
  ];
  const ACC = [
    { id: 'shades', p: 1888, k: 'glasses', v: 2 },
    { id: 'chain', p: 28888, k: 'chain', v: 1, lux: 1 },
    { id: 'watch', p: 58888, k: 'watch', v: 1, lux: 1 }
  ];
  const HAIR = [0, 1, 2, 3, 4, 6];
  function wearArt(L) {
    const dark = c => c === '#121212' || c === '#14110f' || c === '#151a28';
    let s = `<svg viewBox="0 0 120 90" aria-hidden="true"><path d="M38 14l-22 14 8 16 10-5v42h52V39l10 5 8-16-22-14c-3 6-9 9-16 9s-13-3-16-9z" fill="${L.top}" stroke="${dark(L.top) ? '#3a3a3a' : 'rgba(0,0,0,.35)'}" stroke-width="1.5"/>`;
    if (L.vest) s += `<path d="M44 20l16 14 16-14v61H44z" fill="${L.vest}"/><path d="M60 34v47" stroke="#121212" stroke-width="1.5"/>`;
    s += `<path d="M46 14l14 12 14-12" fill="none" stroke="${dark(L.top) ? '#555' : 'rgba(0,0,0,.25)'}" stroke-width="2"/>`;
    if (L.tie) s += `<path d="M57 26h6l2 30-5 6-5-6z" fill="${L.tie}"/>`;
    if (L.bow) s += `<path d="M60 27l-9-5v10zM60 27l9-5v10z" fill="${L.bow}"/>`;
    if (L.trim) s += `<path d="M60 22v59M34 78h52M24 42l-6-12M96 42l6-12" stroke="${L.trim}" stroke-width="2.5"/>` + [36, 48, 60, 72].map(y => `<circle cx="64" cy="${y}" r="2" fill="${L.trim}"/>`).join('');
    if (L.top === '#1e8c7e') s += [[44, 40], [70, 54], [52, 66], [80, 34], [40, 72]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="4" fill="#f6c94e" opacity=".85"/><circle cx="${x}" cy="${y}" r="1.6" fill="#e8467a"/>`).join('');
    return s + '</svg>';
  }
  const ACC_ART = {
    shades: '<svg viewBox="0 0 120 90" aria-hidden="true"><path d="M14 36h92" stroke="#2a2a2a" stroke-width="3"/><rect x="20" y="34" width="34" height="20" rx="8" fill="#0c0b0a"/><rect x="66" y="34" width="34" height="20" rx="8" fill="#0c0b0a"/><path d="M26 40h12M72 40h12" stroke="rgba(255,255,255,.4)" stroke-width="2"/></svg>',
    chain: '<svg viewBox="0 0 120 90" aria-hidden="true"><path d="M24 18c0 34 16 52 36 52s36-18 36-52" fill="none" stroke="#f6c94e" stroke-width="6" stroke-dasharray="6 3"/><path d="M24 18c0 34 16 52 36 52s36-18 36-52" fill="none" stroke="#a86e14" stroke-width="2" stroke-dasharray="6 3" stroke-dashoffset="3"/><rect x="52" y="64" width="16" height="16" rx="3" fill="#f6c94e" stroke="#a86e14" stroke-width="2"/></svg>',
    watch: '<svg viewBox="0 0 120 90" aria-hidden="true"><rect x="46" y="4" width="28" height="82" rx="6" fill="#d9a441"/><path d="M46 14h28M46 24h28M46 66h28M46 76h28" stroke="#8a5a17" stroke-width="1.5"/><circle cx="60" cy="45" r="21" fill="#f6c94e" stroke="#8a5a17" stroke-width="2"/><circle cx="60" cy="45" r="16" fill="#14110f"/><path d="M60 45V34M60 45l8 4" stroke="#f6c94e" stroke-width="2" stroke-linecap="round"/><circle cx="83" cy="45" r="3" fill="#d9a441"/></svg>'
  };
  function shop() {
    const look = () => Object.assign({ skin: '#e8b88f', hair: '#14100c', hs: 0, top: '#1f3a5f', bot: '#22262e' }, LS.get('look', {}));
    const mirror = U.h('canvas', { class: 'sv-mirror', width: 160, height: 200 });
    const paintMirror = l => { if (window.Floor && Floor.portrait) Floor.portrait(mirror, l || look()); };
    const owned = id => id === 'tee' || V.owned.includes(id);
    const set = patch => { const l = Object.assign(look(), patch); for (const k in patch) if (patch[k] == null) delete l[k]; LS.set('look', l); paintMirror(l); if (window.Floor) Floor.refreshLook(); };
    const hairRow = U.h('div', { class: 'sv-row sv-hair' }, U.h('span', null, t('sv.hair')), HAIR.map(h => U.h('button', { class: 'sv-chipbtn', onclick: () => { Sound.fx.click(); set({ hs: h }); } }, String.fromCharCode(65 + HAIR.indexOf(h)))),
      ['#14100c', '#5a3418', '#c9a05a', '#8a8a8a', '#a8243a'].map(c => U.h('button', { class: 'sv-dot', style: `--c:${c}`, 'aria-label': c, onclick: () => { Sound.fx.click(); set({ hair: c }); } })));
    const extra = U.h('div', { class: 'sv-shopx' }, mirror, hairRow);
    const items = () => [
      ...WEAR.map(w => ({ id: w.id, w, lux: w.lux, art: wearArt(w.look), name: t('sv.w.' + w.id), desc: t('sv.wd.' + w.id), p: owned(w.id) ? 0 : w.p, priceText: owned(w.id) ? t('sv.wear') : null, on: Object.keys(w.look).every(k => (look()[k] || null) === w.look[k]) })),
      ...ACC.map(a => ({ id: a.id, a, lux: a.lux, art: ACC_ART[a.id], name: t('sv.w.' + a.id), desc: t('sv.wd.' + a.id), p: owned(a.id) ? 0 : a.p, priceText: owned(a.id) ? t(look()[a.k] ? 'sv.takeOff' : 'sv.wear') : null, on: !!look()[a.k] }))
    ];
    const s = sheet('shop', t('svc.shop'), t('sv.shop.intro'), items, (it, b, repaint) => {
      if (!owned(it.id)) { if (!pay(it.p, b)) return; V.owned.push(it.id); save(); Sound.fx.cashReg(); if (it.lux) { FX.sparks(innerWidth / 2, innerHeight / 2, 30, 'gold', 1.4); if (window.Floor) Floor.say('you', t('sv.shop.brag')); } }
      else Sound.fx.click();
      if (it.w) set(it.w.look);
      else set({ [it.a.k]: look()[it.a.k] ? null : it.a.v });
      repaint();
      if (window.Story && Story.event) Story.event('buy', it.id);
    }, extra);
    paintMirror();
    return s;
  }

  /* ---------------- cage and the ledger ---------------- */
  function chart() {
    const p = N.pts.length > 1 ? N.pts : [[0, 0], [0, 0]];
    const W = 320, H = 150, lo = Math.min(0, ...p.map(q => Math.min(q[0], q[1]))), hi = Math.max(1, ...p.map(q => Math.max(q[0], q[1])));
    const x = i => 8 + i / (p.length - 1) * (W - 16), y = v => 10 + (hi - v) / (hi - lo || 1) * (H - 26);
    const line = j => p.map((q, i) => (i ? 'L' : 'M') + x(i).toFixed(1) + ' ' + y(q[j]).toFixed(1)).join('');
    return `<svg class="sv-chart" viewBox="0 0 ${W} ${H}" role="img" aria-label="${t('sv.led.aria')}"><line x1="8" x2="${W - 8}" y1="${y(0)}" y2="${y(0)}" stroke="rgba(243,234,211,.25)" stroke-dasharray="3 4"/><path d="${line(0)}" fill="none" stroke="#c8283c" stroke-width="2.2"/><path d="${line(1)}" fill="none" stroke="#f6c94e" stroke-width="2"/><text x="10" y="${H - 4}" fill="#9fbcae" font-size="8">${t('sv.led.rounds', { n: C.S.stats.rounds - N.rounds })}</text></svg>`;
  }
  function cage() {
    const n = net(), th = Math.round(N.theo);
    const stat = (k, v, cls) => U.h('div', { class: 'sv-stat ' + (cls || '') }, U.h('small', null, t(k)), U.h('b', null, v));
    const sgn = v => (v > 0 ? '+' : '') + U.fmt(v);
    const life = C.S.stats.won - C.S.stats.wagered;
    const body = U.h('div', { class: 'sv sv-cage' },
      U.h('div', { class: 'sv-hero' }, U.h('p', null, t('sv.cage.intro'))),
      U.h('div', { class: 'sv-stats' },
        stat('sv.led.bal', U.fmt(C.S.balance)),
        stat('sv.led.wager', U.fmt(C.S.stats.wagered - N.w)),
        stat('sv.led.theo', '-' + U.fmt(th), 'theo'),
        stat('sv.led.net', sgn(n), n < 0 ? 'neg' : 'pos')),
      U.h('div', { class: 'sv-ledger', html: chart() }),
      U.h('div', { class: 'sv-legend' }, U.h('span', { class: 'theo' }, t('sv.led.theoL')), U.h('span', { class: 'act' }, t('sv.led.netL'))),
      U.h('p', { class: 'sv-note' }, t(Math.abs(n + th) < Math.max(200, th * 0.3) ? 'sv.led.close' : n > -th ? 'sv.led.lucky' : 'sv.led.unlucky')),
      U.h('details', { class: 'sv-life' }, U.h('summary', null, t('sv.led.life')),
        U.h('div', { class: 'sv-stats' },
          stat('sv.led.wager', U.fmt(C.S.stats.wagered)), stat('sv.led.theo', '-' + U.fmt(Math.round(V.life)), 'theo'),
          stat('sv.led.net', sgn(life), life < 0 ? 'neg' : 'pos'), stat('sv.led.spent', U.fmt(C.S.stats.spent || 0)))));
    const acts = [];
    if (window.Story && Story.cage) acts.push({ label: t('sv.cage.marker'), onClick: c => { c(); Story.cage(); } });
    acts.push({ label: t('sv.cage.refill'), primary: true, onClick: c => { if (C.S.balance >= 100) { C.toast(t('sv.cage.noRefill')); return; } c(); C.refill(); } });
    C.modal({ title: t('svc.cage'), body, actions: acts, wide: true });
    if (window.Floor) Floor.say('cashier', t('sv.cashier.hi'));
  }

  /* ---------------- players club ---------------- */
  const tierName = i => t('sv.tier.' + i);
  function tierUp(i) {
    Sound.fx.tierUp && Sound.fx.tierUp(i);
    C.toast(t('sv.tierUp', { t: tierName(i) }), 'good');
    if (window.Floor) Floor.coins(20);
    if (window.Story && Story.event) Story.event('tier', i);
  }
  function club() {
    const i = tier(), nx = TIERS[i + 1];
    const pct = nx ? U.clamp((V.life - TIERS[i]) / (nx - TIERS[i]), 0, 1) : 1;
    const card = U.h('div', { class: 'sv-card t' + i, style: `--tc:${COLORS[i]}` },
      U.h('span', { class: 'sv-card-brand' }, t('brand')), U.h('b', null, tierName(i)), U.h('small', null, 'No. ' + String(8800000 + (V.life | 0) % 99999).padStart(7, '0')), U.h('i'));
    const body = U.h('div', { class: 'sv sv-club' },
      U.h('div', { class: 'sv-clubtop' }, card, U.h('div', null,
        U.h('div', { class: 'sv-stat' }, U.h('small', null, t('sv.comp')), U.h('b', null, U.fmt(Math.floor(V.comp)))),
        U.h('div', { class: 'sv-stat theo' }, U.h('small', null, t('sv.club.theo')), U.h('b', null, U.fmt(Math.round(V.life)))),
        U.h('div', { class: 'sv-prog' }, U.h('i', { style: `width:${pct * 100}%` })),
        U.h('small', { class: 'sv-next' }, nx ? t('sv.club.next', { t: tierName(i + 1), n: U.fmt(Math.ceil(nx - V.life)) }) : t('sv.club.top')))),
      U.h('ul', { class: 'sv-perks' }, [0, 1, 2, 3, 4].map(k => U.h('li', { class: k <= i ? 'on' : '' }, U.h('b', null, tierName(k)), ' ', t('sv.perk.' + k)))),
      U.h('p', { class: 'sv-note' }, t('sv.club.how')));
    C.modal({ title: t('svc.club'), body, wide: true, actions: [{ label: t('sv.ok'), primary: true }] });
  }

  /* ---------------- concierge ---------------- */
  function concierge() {
    const go = q => U.h('button', { class: 'sv-mini', onclick: () => { close(); window.Floor && Floor.goto(q); } }, U.h('b', null, ['baccarat', 'blackjack', 'caishen'].includes(q) ? t('game.' + q) : t('svc.' + q)));
    const lim = [0, 1000, 5000, 20000, 100000], rem = [0, 15, 30, 60];
    const pick = (arr, key, fmtv) => U.h('div', { class: 'sv-row' }, arr.map(v => U.h('button', { class: 'sv-chipbtn' + (V[key] === v ? ' on' : ''), onclick: e => { V[key] = v; if (key === 'limit') N.limitHit = 0; save(); saveN(); Sound.fx.click(); U.$$('.sv-chipbtn', e.target.parentNode).forEach(b => b.classList.toggle('on', b === e.target)); } }, v ? fmtv(v) : t('sv.off'))));
    const body = U.h('div', { class: 'sv sv-con' },
      U.h('p', null, t('sv.con.intro')),
      U.h('h4', null, t('sv.con.where')),
      U.h('div', { class: 'sv-row wrap' }, ['restaurant', 'bar', 'hotel', 'cage', 'club', 'shop', 'lottery', 'baccarat', 'blackjack', 'caishen'].map(go)),
      U.h('h4', null, t('sv.con.limit')), U.h('p', { class: 'sv-note' }, t('sv.con.limitB')), pick(lim, 'limit', v => U.fmtShort(v)),
      U.h('h4', null, t('sv.con.remind')), pick(rem, 'remind', v => t('sv.min', { n: v })),
      U.h('p', { class: 'sv-note' }, t('sv.con.night', { t: hhmm(V.min), d: day(), m: Math.round((Date.now() - N.t0) / 60000) })));
    const close = C.modal({ title: t('svc.concierge'), body, wide: true, actions: [{ label: t('sv.ok'), primary: true }] });
  }

  /* ---------------- fountain ---------------- */
  function fountain() {
    if (!C.spend(10)) return;
    Sound.fx.coin(1.2); setTimeout(() => Sound.fx.splash(), 380);
    if (window.Floor) Floor.coins(6);
    const lucky = Math.random() < 0.01;
    story('wish');
    setTimeout(() => {
      if (lucky) { C.pay(500, null, false); C.toast(t('sv.wish.lucky'), 'good'); Sound.fx.win(1); }
      else C.toast(t('sv.wish.' + U.randInt(1, 6)));
    }, 700);
  }

  /* ---------------- the door ---------------- */
  function exit() {
    const n = net(), mins = Math.round((Date.now() - N.t0) / 60000);
    const row = (k, v, cls) => U.h('div', { class: 'sv-sum ' + (cls || '') }, U.h('span', null, t(k)), U.h('b', null, v));
    const body = U.h('div', { class: 'sv sv-exit' },
      U.h('p', null, t('sv.exit.intro')),
      row('sv.exit.time', t('sv.exit.mins', { m: mins, h: hhmm(V.min) })),
      row('sv.exit.rounds', U.fmt(C.S.stats.rounds - N.rounds)),
      row('sv.led.wager', U.fmt(C.S.stats.wagered - N.w)),
      row('sv.led.theo', '-' + U.fmt(Math.round(N.theo)), 'theo'),
      row('sv.led.net', (n > 0 ? '+' : '') + U.fmt(n), n < 0 ? 'neg' : 'pos'),
      row('sv.exit.spent', U.fmt((C.S.stats.spent || 0) - N.spent)),
      row('sv.exit.drinks', t('sv.exit.drinksV', { n: N.drinks, f: N.free })),
      row('sv.exit.comp', '+' + U.fmt(Math.round(N.comp))));
    const close = C.modal({ title: t('svc.exit'), body, wide: true, actions: [
      { label: t('sv.exit.stay') },
      { label: t('sv.exit.go'), primary: true, onClick: c => { c(); retain(n); } }] });
    return close;
  }
  // the host's last move: a little free play, so you stay one more hour
  function retain(n) {
    if (n < -2000 && !N.offered) {
      N.offered = 1; saveN();
      if (window.Floor) Floor.say('host', t('sv.host.stay'));
      const amt = U.clamp(Math.round(-n * 0.05 / 100) * 100, 500, 20000);
      C.modal({ title: t('sv.host.t'), body: U.h('div', { class: 'sv' }, U.h('p', null, t('sv.host.b', { n: U.fmt(amt) })), U.h('p', { class: 'sv-note' }, t('sv.host.why'))), actions: [
        { label: t('sv.host.take', { n: U.fmt(amt) }), onClick: c => { c(); C.pay(amt, null, false); C.toast(t('sv.host.took')); } },
        { label: t('sv.host.leave'), primary: true, onClick: c => { c(); leave(); } }] });
      return;
    }
    leave();
  }
  async function leave() {
    const n = net();
    Sound.fx.doors && Sound.fx.doors();
    if (window.Floor) Floor.stop();
    const m = ((V.min % 1440) + 1440) % 1440;
    await night(t(m < 600 ? 'sv.dawn' : 'sv.home'), t(n < 0 ? 'sv.dawn.lost' : 'sv.dawn.won', { n: U.fmt(Math.abs(n)) }), 4200);
    const r = window.Story && Story.onExit ? await Story.onExit({ net: n, theo: N.theo }) : null;
    V.min += m < 600 ? 1200 - m : 2640 - m;            // sleep at home, back at 20:00
    V.energy = 100; V.drunk = 0; V.nights++; save();
    N = fresh(); saveN();
    story('night', V.nights);
    if (r === 'end') return;
    if (window.Floor) { try { sessionStorage.removeItem('gj_in'); } catch (e) { /* ignore */ } Floor.enter(); }
  }

  /* ---------------- floor reactions ---------------- */
  let reacted = {};
  function react(kind, arg) {
    if (kind !== 'zone' || !window.Floor) return;
    const z = arg, k = z + (day());
    if (reacted[k]) return;
    if (z === 'restaurant' && V.energy < 45) { reacted[k] = 1; Floor.say('host', t('sv.host.hungry')); }
    else if (z === 'bar' && V.drunk > 60) { reacted[k] = 1; Floor.say('bartender', t('sv.bt.slow')); }
    else if (z === 'hotel' && V.energy < 30) { reacted[k] = 1; Floor.say('you', t('sv.yawn')); }
    else if (z === 'cage' && net() < -5000) { reacted[k] = 1; Floor.say('cashier', t('sv.cashier.loss')); }
  }

  function open(id) {
    switch (id) {
      case 'restaurant': return restaurant();
      case 'bar': return bar();
      case 'hotel': return hotel();
      case 'shop': return shop();
      case 'cage': return cage();
      case 'club': return club();
      case 'concierge': return concierge();
      case 'fountain': return fountain();
      case 'exit': return exit();
      case 'atm': if (window.Story && Story.atm) return Story.atm(); if (window.Story && Story.phone) return Story.phone(); break;
      case 'lottery': case 'scratch': if (window.Lottery && Lottery.open) return Lottery.open(id === 'scratch' ? 'scratch' : null); break;
    }
    C.toast(t('fl.soon'));
  }

  window.Services = {
    open, vit, tier, tierName, react, freeDrink, pay, net, advance, day, hhmm,
    clock: () => hhmm(V.min),
    time: () => V.min,
    edge, setEdge(id, e) { EDGE[id] = e; },
    comp: () => Math.floor(V.comp),
    night: () => ({ theo: N.theo, net: net(), mins: (Date.now() - N.t0) / 60000, drinks: N.drinks }),
    life: () => V.life,
    drink, stage, nightScene: night,
    energize(n) { V.energy = U.clamp(V.energy + n, 0, 100); save(); },
    // a new life: fresh night, rested, sober; the club and wardrobe stay with the player
    reset() { V.energy = 100; V.drunk = 0; V.min = Math.max(V.min, 0); N = fresh(); saveN(); save(); }
  };
})();
