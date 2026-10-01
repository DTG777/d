/* Beginner help: a croupier (荷官小金) walks you through the lobby and every game with
   spotlight coach marks the first time you visit, a Casino 101 academy you can open any
   time, and a live coach that lights up the best move (blackjack basic strategy).
   Exposed as window.Tutor. Progress lives in LS 'tut'. */
(function () {
  const t = (k, v) => I18N.t(k, v);
  const st = Object.assign({ welcome: false, seen: {}, coach: true }, LS.get('tut', {}));
  const save = () => LS.set('tut', st);
  const reduced = () => matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------- tours: [selector | null (centred), i18n key] ---------- */
  const TOURS = {
    lobby: [
      [null, 'tut.lobby.1'], ['#balance', 'tut.lobby.2'], ['.bonus-card', 'tut.lobby.3'],
      ['.tile-zhajinhua', 'tut.lobby.4'], ['.tile-slots', 'tut.lobby.5'], ['.tile-blackjack', 'tut.lobby.6'],
      ['.tile-crash', 'tut.lobby.7'], ['#btn-settings', 'tut.lobby.8'], ['.academy-btn', 'tut.lobby.9'], [null, 'tut.lobby.10']
    ],
    slots: [['.reels-frame', 'tut.slots.1'], ['.bet-step', 'tut.slots.2'], ['.spin-btn', 'tut.slots.3'], ['.slot-toggles', 'tut.slots.4'], ['.slot-meter', 'tut.slots.5']],
    classic: [['.cl-glass', 'tut.classic.1'], ['.cl-line', 'tut.classic.2'], ['.cl-lever', 'tut.classic.3'], ['.bet-step', 'tut.slots.2']],
    caishen: [['.cs-board', 'tut.caishen.1'], [null, 'tut.caishen.2'], ['.buy-btn', 'tut.caishen.3'], ['.spin-btn', 'tut.slots.3']],
    treasure: [['.tb-jp', 'tut.treasure.1'], ['.tb-reels', 'tut.treasure.2'], [null, 'tut.treasure.3'], ['.spin-btn', 'tut.slots.3']],
    blackjack: [['.bj-dealer', 'tut.blackjack.1'], ['.chips-row', 'tut.blackjack.2'], ['.bet-spot', 'tut.blackjack.3'], ['.b-deal', 'tut.blackjack.4'], [null, 'tut.blackjack.5']],
    roulette: [['.wheel-wrap', 'tut.roulette.1'], ['.rl-board-wrap', 'tut.roulette.2'], ['.chips-row', 'tut.roulette.3'], ['.b-spin', 'tut.roulette.4']],
    baccarat: [['.bc-sides', 'tut.baccarat.1'], ['.bc-bets', 'tut.baccarat.2'], ['.bc-under', 'tut.baccarat.3'], ['.b-deal', 'tut.baccarat.4']],
    sicbo: [['.sb-stage', 'tut.sicbo.1'], ['.big-cell', 'tut.sicbo.2'], ['.b-roll', 'tut.sicbo.3']],
    crash: [['.cr-stage', 'tut.crash.1'], ['.cr-btn', 'tut.crash.2'], ['.cr-auto', 'tut.crash.3'], ['.cr-players', 'tut.crash.4']],
    plinko: [['.pl-stage', 'tut.plinko.1'], ['.pl-panel .seg', 'tut.plinko.2'], ['.pl-drop', 'tut.plinko.3']],
    zhajinhua: [['.pv-felt', 'tut.zhajinhua.1'], ['.pv-seat.pos-left', 'tut.pv.rivals'], ['.pv-actions', 'tut.zhajinhua.2'], [null, 'tut.zhajinhua.3'], ['.pv-chat', 'tut.pv.chat'], ['.game-head .icon-btn', 'tut.zhajinhua.4']],
    niuniu: [['.pv-felt', 'tut.niuniu.1'], ['.pv-actions', 'tut.niuniu.2'], [null, 'tut.niuniu.3'], ['.pv-chat', 'tut.pv.chat'], ['.game-head .icon-btn', 'tut.niuniu.4']],
    doudizhu: [['.pv-felt', 'tut.doudizhu.1'], ['.pv-actions', 'tut.doudizhu.2'], [null, 'tut.doudizhu.3'], ['.pv-chat', 'tut.pv.chat'], ['.game-head .icon-btn', 'tut.doudizhu.4']],
    mahjong: [['.pv-felt', 'tut.mahjong.1'], ['.pv-actions', 'tut.mahjong.2'], [null, 'tut.mahjong.3'], ['.pv-chat', 'tut.pv.chat'], ['.game-head .icon-btn', 'tut.mahjong.4']]
  };

  /* ---------- spotlight overlay ---------- */
  let cur = null;
  function visible(el) {
    if (!el) return false;
    const r = el.getBoundingClientRect(), cs = getComputedStyle(el);
    return r.width > 0 && r.height > 0 && cs.visibility !== 'hidden' && !el.closest('[hidden]');
  }
  // the active view first: every game view has its own .game-head, .chips-row...
  const find = sel => sel && (document.querySelector('.view.active ' + sel) || document.querySelector(sel));
  function tour(steps, { onDone, final } = {}) {
    stop();
    steps = steps.filter(s => !s[0] || visible(find(s[0])));
    if (!steps.length) return;
    const ov = U.h('div', { class: 'tut-ov', role: 'dialog', 'aria-modal': 'true' });
    const hole = U.h('div', { class: 'tut-hole' });
    const card = U.h('div', { class: 'tut-card' });
    ov.append(hole, card);
    document.body.appendChild(ov);
    let i = 0, raf = 0;
    const place = () => {
      const el = find(steps[i][0]);
      const vw = innerWidth, vh = innerHeight, cw = card.offsetWidth, ch = card.offsetHeight, m = 16;
      if (!el) {
        hole.classList.add('none');
        Object.assign(hole.style, { left: vw / 2 + 'px', top: vh / 2 + 'px', width: '0px', height: '0px' });
        Object.assign(card.style, { left: Math.max(m, (vw - cw) / 2) + 'px', top: Math.max(m, (vh - ch) / 2) + 'px' });
        return;
      }
      hole.classList.remove('none');
      const r = el.getBoundingClientRect(), p = 8;
      const box = { l: Math.max(4, r.left - p), t: Math.max(4, r.top - p), r: Math.min(vw - 4, r.right + p), b: Math.min(vh - 4, r.bottom + p) };
      Object.assign(hole.style, { left: box.l + 'px', top: box.t + 'px', width: (box.r - box.l) + 'px', height: (box.b - box.t) + 'px' });
      let x = U.clamp((box.l + box.r) / 2 - cw / 2, m, Math.max(m, vw - cw - m)), y;
      if (vh - box.b >= ch + m + 4) y = box.b + 12;
      else if (box.t >= ch + m + 4) y = box.t - ch - 12;
      else if (vw - box.r >= cw + m + 8) { x = box.r + 12; y = U.clamp((box.t + box.b) / 2 - ch / 2, m, vh - ch - m); }
      else if (box.l >= cw + m + 8) { x = box.l - cw - 12; y = U.clamp((box.t + box.b) / 2 - ch / 2, m, vh - ch - m); }
      else y = vh - ch - m; // big target: card floats over its bottom edge
      Object.assign(card.style, { left: x + 'px', top: y + 'px' });
    };
    const onMove = () => { cancelAnimationFrame(raf); raf = requestAnimationFrame(place); };
    const show = async n => {
      i = n;
      const [sel, key] = steps[i], last = i === steps.length - 1;
      const el = find(sel);
      const [title, ...rest] = t(key).split('|');
      card.innerHTML = `
        <div class="tut-who"><span class="tut-av">金</span><span>${t('tut.coach')}</span><span class="tut-n">${i + 1} / ${steps.length}</span></div>
        <h3>${title}</h3><p>${rest.join('|')}</p>
        <div class="tut-btns">
          <button class="btn btn-ghost btn-sm tut-skip">${t(last ? 'ui.close' : 'tut.skip')}</button>
          <span class="tut-dots">${steps.map((s, k) => `<i class="${k === i ? 'on' : ''}"></i>`).join('')}</span>
          ${i ? `<button class="btn btn-ghost btn-sm tut-prev" aria-label="${t('tut.prev')}">‹</button>` : ''}
          ${last && final ? '' : `<button class="btn btn-gold btn-sm tut-next">${t(last ? 'tut.go' : 'tut.next')}</button>`}
        </div>
        ${last && final ? `<div class="tut-final">${final.map((f, k) => `<button class="btn ${k ? 'btn-ghost' : 'btn-gold'} btn-sm" data-f="${k}">${f.label}</button>`).join('')}</div>` : ''}`;
      card.querySelector('.tut-skip').onclick = () => end(true);
      const nx = card.querySelector('.tut-next'); if (nx) nx.onclick = () => next();
      const pv = card.querySelector('.tut-prev'); if (pv) pv.onclick = () => { Sound.fx.click(); show(i - 1); };
      card.querySelectorAll('[data-f]').forEach(b => b.onclick = () => { end(); final[+b.dataset.f].run(); });
      Sound.fx.chip();
      Sound.say(title.replace(/<[^>]+>/g, ''), { female: true, pitch: 1.1 });
      if (el) {
        const r = el.getBoundingClientRect();
        if (r.top < 70 || r.bottom > innerHeight - 20) {
          el.scrollIntoView({ block: 'center', behavior: reduced() ? 'auto' : 'smooth' });
          // wait for the scroll to land (long smooth scrolls take a while), then place once
          for (let k = 0, last = NaN, same = 0; k < 90 && same < 4; k++) {
            await new Promise(res => requestAnimationFrame(res));
            const y = Math.round(el.getBoundingClientRect().top);
            same = y === last ? same + 1 : 0; last = y;
          }
          if (cur !== api || steps[i][1] !== key) return; // closed or moved on meanwhile
        }
      }
      card.classList.remove('in'); void card.offsetWidth; card.classList.add('in');
      place();
      (card.querySelector('.tut-next') || card.querySelector('[data-f]') || card.querySelector('.tut-skip')).focus({ preventScroll: true });
    };
    const next = () => { Sound.fx.click(); if (i < steps.length - 1) show(i + 1); else end(); };
    const key = e => {
      if (e.key === 'Escape') { e.preventDefault(); end(true); }
      else if (e.key === 'ArrowRight' || e.key === 'Enter') { if (!e.target.closest('[data-f], .tut-skip, .tut-prev')) { e.preventDefault(); if (card.querySelector('.tut-next')) next(); } }
      else if (e.key === 'ArrowLeft' && i) { e.preventDefault(); show(i - 1); }
      e.stopPropagation();
    };
    const end = skipped => {
      if (cur !== api) return;
      cur = null;
      removeEventListener('resize', onMove); removeEventListener('scroll', onMove, true); removeEventListener('keydown', key, true);
      ov.classList.add('out');
      setTimeout(() => ov.remove(), reduced() ? 0 : 220);
      try { speechSynthesis.cancel(); } catch (e) { /* no speech */ }
      if (onDone) onDone(!!skipped);
    };
    addEventListener('resize', onMove); addEventListener('scroll', onMove, true); addEventListener('keydown', key, true);
    ov.addEventListener('click', e => { if (e.target === ov || e.target === hole) card.classList.remove('nudge'), void card.offsetWidth, card.classList.add('nudge'); });
    const api = { end, el: ov };
    cur = api;
    show(0);
    return api;
  }
  function stop() { if (cur) cur.end(true); }

  /* ---------- first visits ---------- */
  function gameTour(id, force) {
    if (!TOURS[id] || (!force && st.seen[id])) return;
    st.seen[id] = true; save();
    tour(TOURS[id], { onDone: () => { if (id === 'blackjack') coachHint(); } });
  }
  function lobbyTour() {
    st.welcome = true; save();
    tour(TOURS.lobby, {
      final: [
        { label: t('game.slots'), run: () => C.go('slots') },
        { label: t('game.blackjack'), run: () => C.go('blackjack') },
        { label: t('game.zhajinhua'), run: () => C.go('zhajinhua') },
        { label: t('tut.explore'), run: () => {} }
      ]
    });
  }
  // a game opened for the first time gets its tour once the view has settled
  function onEnter(id) {
    if (id === 'lobby') { if (!st.welcome) setTimeout(() => C.current === 'lobby' && !document.querySelector('.modal-ov') && lobbyTour(), 700); return; }
    stop();
    if (!st.seen[id]) setTimeout(() => C.current === id && !document.querySelector('.modal-ov') && gameTour(id), 650);
  }

  /* ---------- Casino 101 ---------- */
  const LEVEL = { slots: 1, classic: 1, treasure: 1, caishen: 1, crash: 1, plinko: 1, roulette: 1, baccarat: 1, sicbo: 2, blackjack: 2, niuniu: 2, zhajinhua: 2, doudizhu: 3, mahjong: 4 };
  function academy(tab = 'start') {
    const body = U.h('div', { class: 'aca' });
    const tabs = ['start', 'games', 'odds', 'words'];
    const paint = which => {
      body.innerHTML = `
        <div class="seg aca-tabs" role="tablist">${tabs.map(k => `<button class="seg-btn ${k === which ? 'on' : ''}" role="tab" data-tab="${k}">${t('aca.tab.' + k)}</button>`).join('')}</div>
        <div class="aca-body">${which === 'games' ? `<div class="aca-games">${Object.keys(LEVEL).sort((a, b) => LEVEL[a] - LEVEL[b]).map(id => `
          <div class="aca-game">
            <div class="aca-g-head"><b>${t('game.' + id)}</b><span class="aca-lv" title="${t('aca.level')}">${'★'.repeat(LEVEL[id])}<i>${'★'.repeat(4 - LEVEL[id])}</i></span></div>
            <p>${t('aca.g.' + id)}</p>
            <div class="aca-g-btns"><button class="btn btn-gold btn-sm" data-play="${id}">${t('aca.teach')}</button><button class="btn btn-ghost btn-sm" data-rules="${id}">${t('ui.rules')}</button></div>
          </div>`).join('')}</div>` : `<div class="rules">${t('aca.' + which)}</div>`}
          ${which === 'start' ? `<div class="aca-start"><button class="btn btn-gold aca-tour">${t('aca.tour')}</button><label class="set-row aca-coach"><span>${t('aca.coach')}</span><span class="switch"><input type="checkbox" ${st.coach ? 'checked' : ''}><span class="sw"></span></span></label></div>` : ''}
        </div>`;
      body.querySelectorAll('[data-tab]').forEach(b => b.onclick = () => { Sound.fx.click(); paint(b.dataset.tab); });
      body.querySelectorAll('[data-play]').forEach(b => b.onclick = () => { close(); teach(b.dataset.play); });
      body.querySelectorAll('[data-rules]').forEach(b => b.onclick = () => { const g = C.games[b.dataset.rules]; C.modal({ title: t('game.' + b.dataset.rules), body: U.h('div', { class: 'rules', html: g.rules() }), wide: true }); });
      const tb = body.querySelector('.aca-tour'); if (tb) tb.onclick = () => { close(); C.go('lobby'); setTimeout(lobbyTour, 350); };
      const cb = body.querySelector('.aca-coach input'); if (cb) cb.onchange = e => { st.coach = e.target.checked; save(); coachHint(); };
    };
    const close = C.modal({ title: t('aca.title'), body, wide: true });
    paint(tab);
  }
  // open a game and walk through it now, even if seen before
  function teach(id) {
    if (C.current !== id) { st.seen[id] = true; save(); C.go(id); setTimeout(() => gameTour(id, true), 650); }
    else gameTour(id, true);
  }

  /* ---------- live coach: blackjack basic strategy (6 decks, dealer stands on soft 17) ---------- */
  const cv = c => c.r === 'A' ? 11 : ['J', 'Q', 'K', '10'].includes(c.r) ? 10 : +c.r;
  function bjAdvice(cards, up, canDouble, canSplit) {
    let total = 0, aces = 0;
    for (const c of cards) { total += cv(c); if (c.r === 'A') aces++; }
    while (total > 21 && aces) { total -= 10; aces--; }
    const soft = aces > 0, d = cv(up), v = { t: total, d: d === 11 ? 'A' : d };
    if (canSplit) {
      const p = cv(cards[0]);
      const split = p === 11 || p === 8 || ([2, 3, 7].includes(p) && d <= 7) || (p === 6 && d <= 6) || (p === 4 && (d === 5 || d === 6)) || (p === 9 && d <= 9 && d !== 7);
      if (split) return { a: 'split', why: t('bjc.split', { p: cards[0].r }) };
    }
    const dbl = why => canDouble ? { a: 'double', why } : null;
    if (soft && total <= 21) {
      if (total >= 19) return { a: 'stand', why: t('bjc.stand', v) };
      if (total === 18) return (d >= 3 && d <= 6 && dbl(t('bjc.double', v))) || (d >= 9 ? { a: 'hit', why: t('bjc.softHit', v) } : { a: 'stand', why: t('bjc.stand', v) });
      const lo = { 13: 5, 14: 5, 15: 4, 16: 4, 17: 3 }[total];
      return (lo && d >= lo && d <= 6 && dbl(t('bjc.double', v))) || { a: 'hit', why: t('bjc.softHit', v) };
    }
    if (total <= 8) return { a: 'hit', why: t('bjc.hitLow', v) };
    if (total === 9) return (d >= 3 && d <= 6 && dbl(t('bjc.double', v))) || { a: 'hit', why: t('bjc.hitLow', v) };
    if (total === 10) return (d <= 9 && dbl(t('bjc.double', v))) || { a: 'hit', why: t('bjc.hitLow', v) };
    if (total === 11) return (d <= 10 && dbl(t('bjc.double', v))) || { a: 'hit', why: t('bjc.hitLow', v) };
    if (total === 12) return d >= 4 && d <= 6 ? { a: 'stand', why: t('bjc.standBust', v) } : { a: 'hit', why: t('bjc.hitWeak', v) };
    if (total <= 16) return d <= 6 ? { a: 'stand', why: t('bjc.standBust', v) } : { a: 'hit', why: t('bjc.hitWeak', v) };
    return { a: 'stand', why: t('bjc.stand', v) };
  }
  function coachHint() {
    const g = C.games.blackjack; if (!g || !g.root) return;
    let box = g.root.querySelector('.coach-line');
    g.root.querySelectorAll('.btn.coach').forEach(b => b.classList.remove('coach'));
    const h = g.hands && g.hands[g.active];
    if (st.coach && g.state === 'busy' && box && !box.hidden) { box.classList.add('dim'); return; } // dealing: keep the line, no jump
    if (box) box.classList.remove('dim');
    if (!st.coach || g.state !== 'play' || !h || !g.dealer[0] || h.cards.length < 2) { if (box) box.hidden = true; return; }
    const adv = bjAdvice(h.cards, g.dealer[0], !g.root.querySelector('.b-double').disabled, !g.root.querySelector('.b-split').disabled);
    if (!box) { box = U.h('div', { class: 'coach-line', role: 'status' }); g.root.querySelector('.phase-play').prepend(box); }
    box.hidden = false;
    box.innerHTML = `<span class="tut-av sm">金</span><span><b>${t('bjc.say', { a: t('bj.' + adv.a) })}</b> ${adv.why}</span>`;
    const btn = g.root.querySelector('.b-' + adv.a); if (btn) btn.classList.add('coach');
  }
  // blackjack re-syncs its buttons after every card; the coach follows
  function hookBlackjack() {
    const g = C.games.blackjack; if (!g || g._coached) return;
    g._coached = true;
    const sync = g.syncPlay;
    g.syncPlay = function () { sync.apply(this, arguments); try { coachHint(); } catch (e) { console.warn(e); } };
  }

  /* ---------- wiring ---------- */
  const go = C.go;
  C.go = function (id) { const prev = C.current; go.call(C, id); if (C.current !== prev) { if (C.current === 'blackjack') hookBlackjack(); onEnter(C.current); } };

  window.Tutor = { tour, stop, academy, teach, lobbyTour, gameTour, bjAdvice, TOURS, get state() { return st; } };
})();
