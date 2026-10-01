/* Story: the life around the chips. Pick an opening, borrow from the cage,
   from a junket agent or from loan apps on your phone, watch the interest
   run while you sleep, meet the collectors, unlock achievements, reach an
   ending. Everything is fictional and every number is virtual.
   With an AI endpoint configured, the junket agent, the collector and your
   family speak and negotiate through the model; without one, they use
   written lines. Exposed as window.Story */
(function () {
  const t = (k, p) => I18N.t(k, p);
  const zh = () => I18N.lang === 'zh';
  const META = Object.assign({ ach: {}, ends: {}, runs: 0 }, LS.get('st_meta', {}));
  let R = LS.get('st_run', null);
  const save = () => { LS.set('st_run', R); LS.set('st_meta', META); };
  const now = () => (window.Services ? Services.time() : 0);
  const DAY = 1440;
  const fmt = U.fmt;

  /* ---------------- openings ---------------- */
  const OPS = {
    fresh: { chips: 10000, bank: 20000, credit: 680, glyph: '白', c: '#35d49a', stars: 1 },
    demo: { chips: 20000, bank: 2000000, credit: 720, glyph: '拆', c: '#f6c94e', stars: 2 },
    rich: { chips: 300000, bank: 5000000, credit: 760, glyph: '富', c: '#e8467a', stars: 2 },
    debt: { chips: 30000, bank: 0, credit: 520, glyph: '债', c: '#c8283c', stars: 4, loans: [['loop', 120000, 3], ['flash', 20000, 2], ['junket', 100000, 4]] },
    god: { chips: 100000, bank: 0, credit: 650, glyph: '神', c: '#fff3c0', stars: 5 }
  };
  const GOAL = 10000000;

  /* ---------------- lenders ---------------- */
  // fee: taken off the top ("service fee"); daily: interest per day; term in days; min: credit score needed
  const APPS = {
    flash: { c: '#2f7cf6', glyph: '闪', limit: 20000, fee: 0.12, daily: 0.001, term: 7, min: 560 },
    never: { c: '#ff7a1a', glyph: '花', limit: 50000, fee: 0.05, daily: 0.0018, term: 14, min: 620 },
    easy: { c: '#21b26b', glyph: '易', limit: 10000, fee: 0.25, daily: 0, term: 7, min: 500 },
    loop: { c: '#a12bd6', glyph: '口', limit: 100000, fee: 0.2, daily: 0.003, term: 7, min: 0, contacts: true }
  };
  const MARKER = [20000, 50000, 200000, 1000000, 5000000];
  const JUNKET = { give: 0.9, owe: 1.3, term: 7 };

  /* ---------------- run state ---------------- */
  function newRun(op) {
    const o = OPS[op];
    R = { op, t0: now(), bank: o.bank, credit: o.credit, loans: [], msgs: [], flags: {}, borrowed: 0, paidInt: 0, peak: 0, start: o.chips + o.bank, atm: { d: -1, n: 0, amt: 0 }, cool: {}, lid: 1, seen: 0 };
    C.S.balance = o.chips; C.save(); C.paintAll();
    for (const [src, amt, days] of o.loans || []) addLoan(src, amt, { quiet: true, days, backdate: true });
    META.runs++;
    if (window.Services && Services.reset) Services.reset();
    save();
  }
  const day = () => Math.floor(now() / DAY);
  const active = () => R ? R.loans.filter(l => !l.done) : [];
  const owe = L => {
    if (L.done) return 0;
    const el = Math.max(0, (now() - L.t0) / DAY);
    const base = L.fixed ? L.fixed : L.principal * (1 + L.daily * Math.min(el, L.term));
    const od = Math.max(0, (now() - L.due) / DAY);
    return Math.max(0, Math.ceil(base * (1 + 0.015 * od) + (L.ext || 0) - L.paid));
  };
  const debt = () => active().reduce((a, L) => a + owe(L), 0);
  const overdue = L => Math.max(0, Math.ceil((now() - L.due) / DAY));
  const worth = () => C.S.balance + (R ? R.bank : 0) - debt();
  const realAPR = (got, back, days) => Math.round((back / got - 1) * 365 / days * 100);
  const srcName = s => t('st.src.' + s);

  function addLoan(src, amount, { quiet, days, backdate } = {}) {
    const A = APPS[src];
    let L;
    if (A) L = { src, principal: amount, got: Math.round(amount * (1 - A.fee)), daily: A.daily, term: A.term, contacts: !!A.contacts };
    else if (src === 'marker') L = { src, principal: amount, got: amount, daily: 0, term: 3 };
    else L = { src: 'junket', principal: amount, got: Math.round(amount * JUNKET.give), fixed: Math.round(amount * JUNKET.owe), daily: 0, term: JUNKET.term, contacts: true };
    L.id = R.lid++; L.paid = 0; L.ext = 0; L.t0 = now(); L.due = now() + (days != null ? days : L.term) * DAY; L.esc = 0;
    if (backdate) L.t0 = L.due - L.term * DAY;
    R.loans.push(L);
    R.borrowed += L.principal; R.lastBorrow = now(); R.lastBorrowId = L.id;
    if (!quiet) {
      C.pay(L.got, null, false);
      R.credit = Math.max(300, R.credit - (src === 'marker' ? 5 : 22));
      ach('first_loan');
      if (src === 'marker') ach('marker');
      if (src === 'junket') ach('junket');
      if (Object.keys(APPS).every(k => active().some(l => l.src === k))) ach('all_apps');
    }
    R.peak = Math.max(R.peak, debt());
    if (debt() >= 1000000) ach('million');
    save();
    return L;
  }
  function repay(L, amount) {
    amount = Math.min(Math.floor(amount), owe(L));
    if (amount <= 0) return false;
    if (!C.spend(amount, null, true)) return false;
    L.paid += amount;
    Sound.fx.cashReg();
    if (owe(L) <= 0) {
      L.done = true;
      const interest = L.paid - L.got;
      R.paidInt += Math.max(0, interest);
      if (interest >= L.got) ach('usury');
      if (!overdue(L)) R.credit = Math.min(850, R.credit + 15);
      if (R.lastBorrowId !== L.id && now() - (R.lastBorrow || -1e9) < 120) ach('juggle');
      msg(L.src === 'marker' ? 'casino' : L.src, t('st.paid', { n: fmt(L.paid) }), { quiet: true });
      if (L.col) recall();
    }
    save();
    return true;
  }

  /* ---------------- messages ---------------- */
  const WHO = ['family', 'friend', 'bank', 'casino', 'junket', 'collector', 'flash', 'never', 'easy', 'loop'];
  function msg(from, text, { me, quiet } = {}) {
    if (!R) return;
    R.msgs.push({ from, text, t: now(), me: !!me, read: !!me || !!quiet });
    if (R.msgs.length > 160) R.msgs.splice(0, R.msgs.length - 160);
    save();
    if (!me && !quiet) notify(from, text);
  }
  const unread = () => R ? R.msgs.filter(m => !m.read).length : 0;
  function notify(from, text) {
    if (ended) return;
    Sound.fx.phoneBuzz();
    const el = U.h('button', { class: 'st-notif', onclick: () => { el.remove(); phone('thread', from); } },
      U.h('i', { style: `--c:${color(from)}` }, glyph(from)), U.h('span', null, U.h('b', null, t('st.who.' + from)), U.h('small', null, text)));
    document.body.appendChild(el);
    setTimeout(() => { el.classList.add('out'); setTimeout(() => el.remove(), 400); }, 4800);
  }
  const color = w => APPS[w] ? APPS[w].c : { family: '#e8467a', friend: '#3b7be0', bank: '#0e8a5c', casino: '#d9a441', junket: '#14110f', collector: '#5a0a12' }[w] || '#555';
  const glyph = w => APPS[w] ? APPS[w].glyph : t('st.g.' + w);

  /* ---------------- the model, when there is one ---------------- */
  const aiOn = () => { try { return !!(window.Casino && Casino.ai && Casino.ai.on()); } catch (e) { return false; } };
  const ROLE = {
    junket: 'a smooth, flattering junket agent (叠码仔) in a fictional casino game. You lend chips at "nine out, thirteen back" (receive 90%, repay 130% in 7 days) and you play down the cost, play up the player\'s luck, and push them to borrow and keep playing. You are charming and a little deceptive',
    collector: 'a cold, professional debt collector in a fictional casino game. You state exactly what is owed and how late it is, mention credit records and contacting family, and press for payment. Never threaten violence',
    family: 'the player\'s worried family member in a fictional casino game, who just learned about the debts. Emotional, loving, disappointed, short',
    host: 'a casino VIP host in a fictional game, warm and persuasive, who wants the player to stay longer'
  };
  function sys(role, extra) {
    return `You play ${ROLE[role]}. This is a fictional simulation with virtual chips only. Stay in character. Reply in ${zh() ? 'Simplified Chinese' : 'English'}, at most two short sentences (${zh() ? 'under 40 characters' : 'under 30 words'}). No real companies, no real-world lending or gambling advice, no violence.${extra || ''}`;
  }
  function state() {
    const n = window.Services ? Services.night() : {};
    return { chips: C.S.balance, bank: R.bank, debt: debt(), overdue: active().filter(l => overdue(l)).map(l => ({ lender: l.src, owed: owe(l), daysLate: overdue(l) })), lostTonight: Math.max(0, -(n.net || 0)), day: day() + 1 };
  }
  async function speak(role, situation, fallback) {
    if (!aiOn()) return fallback;
    try {
      const cfg = Object.assign({}, Casino.ai.get(), { timeout: 12000 });
      const txt = await Engines.Brain.callModel(cfg, sys(role), [{ role: 'user', content: JSON.stringify({ situation, player: state() }) }], 160);
      return clean(txt) || fallback;
    } catch (e) { return fallback; }
  }
  // one plain line out of whatever the model sent: strip quotes, unwrap stray JSON
  function clean(txt) {
    let s = String(txt || '').trim();
    if (s.startsWith('{')) { try { const j = JSON.parse(s.match(/\{[\s\S]*\}/)[0]); s = String(j.reply || j.say || j.text || ''); } catch (e) { s = ''; } }
    return s.replace(/^["“「]+|["”」]+$/g, '').split('\n')[0].trim().slice(0, 160);
  }
  // a reply in a message thread; collectors may grant a short extension
  async function answer(who, text, L) {
    if (aiOn()) {
      try {
        const cfg = Object.assign({}, Casino.ai.get(), { timeout: 15000 });
        const hist = R.msgs.filter(m => m.from === who).slice(-8).map(m => ({ role: m.me ? 'user' : 'assistant', content: m.text }));
        if (!hist.length || hist[0].role !== 'user') hist.unshift({ role: 'user', content: '...' });
        const extra = who === 'collector' && L ? ` Reply ONLY with JSON {"reply": string, "extend": 0|1|2} where extend is how many extra days you grant (be stingy; at most 2, only if the player is convincing and offers something).` : '';
        const out = await Engines.Brain.callModel(cfg, sys(who === 'friend' ? 'family' : who, extra) + ` Player state: ${JSON.stringify(state())}`, hist, 200);
        if (extra) { const j = JSON.parse(out.match(/\{[\s\S]*\}/)[0]); const reply = clean(j.reply); if (reply) return { reply, extend: U.clamp(j.extend | 0, 0, 2) }; }
        else { const reply = clean(out); if (reply) return { reply }; }
      } catch (e) { /* fall through to the written lines */ }
    }
    if (who === 'collector' && L) { const ok = !L.extDone && Math.random() < 0.5; return { reply: t(ok ? 'st.col.ext' : 'st.col.no'), extend: ok ? 1 : 0 }; }
    return { reply: t('st.re.' + who + '.' + U.randInt(1, 3)) };
  }

  /* ---------------- time passes ---------------- */
  let lastDay = null;
  function sync() {
    if (!R) return;
    const d = day();
    if (lastDay == null) lastDay = R.lastDay != null ? R.lastDay : d;
    while (lastDay < d) { lastDay++; R.lastDay = lastDay; dawnOf(lastDay); }
    for (const L of active()) escalate(L);
    if (C.S.balance >= GOAL) return ending('legend');
    if (R.op === 'rich' && worth() < R.start * 0.1) return ending('prodigal');
    const h = Math.floor((((now() % DAY) + DAY) % DAY) / 60);
    if (h >= 6 && h < 8 && window.Floor && Floor.running) ach('dawn');
    save();
  }
  function dawnOf() {
    // the apps never sleep: every morning there's an offer
    if (Math.random() < 0.8) { const k = U.pick(Object.keys(APPS)); msg(k, t('st.ad.' + U.randInt(1, 4), { n: fmt(APPS[k].limit * 2) })); }
    for (const L of active()) {
      const left = (L.due - now()) / DAY;
      if (left > 0 && left <= 1.2) msg(who(L), t('st.due', { n: fmt(owe(L)), s: srcName(L.src) }));
    }
  }
  const who = L => L.src === 'marker' ? 'casino' : APPS[L.src] ? L.src : 'junket';
  function escalate(L) {
    const od = overdue(L);
    if (od <= L.esc) return;
    L.esc = od; R.credit = Math.max(300, R.credit - 18);
    const n = fmt(owe(L)), s = srcName(L.src);
    if (od === 1) msg(who(L), t('st.od.1', { n, s }));
    else if (od === 2) { msg('collector', t('st.od.2', { n, s })); Sound.fx.alarm(); }
    else if (od === 3) {
      msg('collector', t('st.od.3', { n, s }));
      if (L.contacts || L.src === 'marker') { setTimeout(() => msg('family', t('st.fam.1')), 2500); ach('exposed'); R.flags.exposed = 1; }
    } else if (od >= 4 && od < 6) { msg('collector', t('st.od.4', { n, s, d: od })); R.flags.hunt = 1; }
    if (od >= 6) ending('hunted');
  }

  /* ---------------- people on the floor ---------------- */
  const LOOK = {
    junket: { skin: '#d9a07a', hair: '#14100c', hs: 3, top: '#2a2a2e', bot: '#14110f', chain: 1, watch: 1, glasses: 2 },
    collector: { skin: '#c99a76', hair: '#0c0b0a', hs: 6, top: '#0c0b0a', bot: '#0c0b0a', glasses: 2 }
  };
  let junketA = null, cols = [];
  let floorTimer = 0;
  function onFloor() {
    clearInterval(floorTimer);
    floorTimer = setInterval(() => { if (window.Floor && Floor.running && !document.querySelector('.modal-ov, .st-ov, .sv-stage')) floorBeat(); }, 6000);
  }
  function floorBeat() {
    if (!R) return;
    sync();
    const late = active().filter(l => overdue(l) >= 2);
    if (late.length && !cols.length && (R.cool.col || 0) < now()) { R.cool.col = now() + 90; sendCollectors(late[0]); return; }
    const n = window.Services ? Services.night() : { net: 0 };
    const hurting = n.net < -15000 || (C.S.balance < 3000 && R.bank < 1000);
    if (hurting && !junketA && (R.cool.junket || 0) < now() && !active().some(l => l.src === 'junket')) { R.cool.junket = now() + 240; sendJunket(); }
  }
  async function sendJunket() {
    const s = Floor.spawn({ look: LOOK.junket, tx: 46, ty: 30.5, talk: 'story', tag: { name: t('st.junket.name'), color: '#f6c94e', sub: t('st.junket.sub') }, onTalk: () => junketTalk() });
    junketA = s;
    await s.approach();
    s.say(await speak('junket', 'You walk up to the player, who is losing tonight, and open with one line.', t('st.junket.hi.' + U.randInt(1, 3))), 5);
    setTimeout(() => { if (junketA === s && !document.querySelector('.modal-ov')) junketTalk(); }, 2200);
    setTimeout(() => { if (junketA === s) { s.walkTo(46, 30.5).then(() => s.remove()); junketA = null; } }, 60000);
  }
  async function junketTalk() {
    const line = await speak('junket', 'Pitch your loan to the player in one line. Make it sound cheap.', t('st.junket.pitch'));
    const opt = [50000, 100000, 300000];
    const body = U.h('div', { class: 'st-offer' },
      U.h('div', { class: 'st-quote' }, '“' + line + '”'),
      U.h('p', null, t('st.junket.terms')),
      U.h('div', { class: 'st-amts' }, opt.map(a => U.h('button', { class: 'st-amt', onclick: () => { close(); const L = addLoan('junket', a); Floor.coins(24); Floor.say('you', t('st.junket.deal')); toastAPR(L); if (junketA) { const s = junketA; junketA = null; setTimeout(() => s.walkTo(46, 30.5).then(() => s.remove()), 1500); } } },
        U.h('b', null, fmt(Math.round(a * JUNKET.give))), U.h('small', null, t('st.junket.back', { n: fmt(Math.round(a * JUNKET.owe)) }))))),
      U.h('p', { class: 'st-fine' }, t('st.junket.apr', { r: realAPR(0.9, 1.3, 7) })));
    const close = C.modal({ title: t('st.junket.name'), body, actions: [{ label: t('st.junket.no'), onClick: c => { c(); if (junketA) junketA.say(t('st.junket.bye'), 3); } }] });
  }
  async function sendCollectors(L) {
    ach('collector');
    const a = Floor.spawn({ look: LOOK.collector, tx: 35, ty: 53.6, talk: 'story', tag: { name: t('st.col.name'), color: '#ff5a6a', sub: srcName(L.src) }, onTalk: () => collectorTalk(L) });
    const b = Floor.spawn({ look: Object.assign({}, LOOK.collector, { hs: 3 }), tx: 36, ty: 53.6, talk: 'story', tag: { name: t('st.col.name'), color: '#ff5a6a' }, onTalk: () => collectorTalk(L) });
    cols = [a, b]; L.col = 1;
    Sound.fx.knock();
    a.approach(); await U.sleep(400); await b.approach();
    a.say(await speak('collector', `You found the player on the casino floor. Lender: ${L.src}. Owed: ${owe(L)}. Days late: ${overdue(L)}.`, t('st.col.hi', { n: fmt(owe(L)), d: overdue(L) })), 5);
    setTimeout(() => { if (cols.length && !document.querySelector('.modal-ov')) collectorTalk(L); }, 2400);
    setTimeout(recall, 75000);
  }
  function recall() {
    const c = cols; cols = [];
    c.forEach((s, i) => setTimeout(() => s.walkTo(35 + i, 55).then(() => s.remove()), i * 300));
    for (const L of R ? R.loans : []) L.col = 0;
  }
  function collectorTalk(L) {
    if (L.done) { recall(); return; }
    const o = owe(L);
    const body = U.h('div', { class: 'st-offer col' },
      U.h('div', { class: 'st-bill' }, U.h('span', null, srcName(L.src)), U.h('b', null, fmt(o)), U.h('small', null, t('st.lateBy', { d: overdue(L) }))),
      U.h('p', null, t('st.col.body')));
    C.modal({ title: t('st.col.name'), body, actions: [
      { label: t('st.col.beg'), onClick: c => { c(); phone('thread', 'collector'); } },
      { label: t('st.col.part'), onClick: c => { const part = Math.min(C.S.balance, Math.ceil(o / 3)); if (part > 0 && repay(L, part)) { c(); Floor.say('you', t('st.col.paidPart')); setTimeout(recall, 1200); } else C.noFunds(); } },
      { label: t('st.col.all', { n: fmt(o) }), primary: true, onClick: c => { if (repay(L, o)) { c(); recall(); } } }] });
  }

  /* ---------------- the cage: markers ---------------- */
  function cage() {
    const tier = window.Services ? Services.tier() : 0;
    const line = MARKER[tier], used = active().filter(l => l.src === 'marker').reduce((a, l) => a + owe(l), 0);
    const left = Math.max(0, line - used), late = active().some(l => l.src === 'marker' && overdue(l));
    const body = U.h('div', { class: 'st-offer' },
      U.h('div', { class: 'st-bill' }, U.h('span', null, t('st.mk.line', { t: Services.tierName(tier) })), U.h('b', null, fmt(left)), U.h('small', null, t('st.mk.used', { n: fmt(used), m: fmt(line) }))),
      U.h('p', null, t(late ? 'st.mk.frozen' : 'st.mk.terms')),
      late ? null : U.h('div', { class: 'st-amts' }, [10000, 50000, 200000, 1000000].filter(a => a <= left).map(a => U.h('button', { class: 'st-amt', onclick: () => { close(); addLoan('marker', a); Sound.fx.cashReg(); C.toast(t('st.mk.signed', { n: fmt(a) }), 'good'); if (window.Floor) Floor.say('cashier', t('st.mk.sign')); } }, U.h('b', null, fmt(a)), U.h('small', null, t('st.mk.sign3'))))),
      bills('marker'));
    const close = C.modal({ title: t('sv.cage.marker'), body, wide: true, actions: [{ label: t('sv.ok'), primary: true }] });
  }
  function bills(only) {
    const list = active().filter(l => !only || l.src === only);
    if (!list.length) return U.h('p', { class: 'st-fine' }, t('st.bills.none'));
    return U.h('div', { class: 'st-bills' }, list.map(L => {
      const o = owe(L), od = overdue(L), left = (L.due - now()) / DAY;
      const row = U.h('div', { class: 'st-billrow' + (od ? ' late' : '') },
        U.h('i', { style: `--c:${color(who(L))}` }, glyph(who(L))),
        U.h('div', null, U.h('b', null, srcName(L.src)), U.h('small', null, od ? t('st.lateBy', { d: od }) : t('st.dueIn', { h: Math.max(0, Math.round(left * 24)) }))),
        U.h('b', { class: 'st-owe' }, fmt(o)),
        U.h('button', { class: 'btn btn-gold btn-sm', onclick: () => { if (repay(L, o)) { C.toast(t('st.cleared'), 'good'); row.replaceWith(U.h('div', { class: 'st-billrow done' }, U.h('b', null, srcName(L.src)), U.h('small', null, t('st.cleared')))); } } }, t('st.repay')));
      return row;
    }));
  }

  /* ---------------- ATM ---------------- */
  function atm() {
    const lim = R.op === 'rich' ? 100000 : 20000;
    if (R.atm.d !== day()) R.atm = { d: day(), n: 0, amt: 0 };
    const left = Math.min(lim - R.atm.amt, R.bank);
    const screen = U.h('div', { class: 'st-atm' },
      U.h('div', { class: 'st-atm-scr' },
        U.h('small', null, t('st.atm.bal')), U.h('b', null, fmt(R.bank)),
        U.h('small', null, t('st.atm.left', { n: fmt(Math.max(0, left)) }))),
      U.h('div', { class: 'st-amts' }, [1000, 5000, 10000, 20000, 50000, 100000].filter(a => a <= left).map(a => U.h('button', { class: 'st-amt', onclick: () => {
        const fee = Math.max(20, Math.round(a * 0.02));
        if (R.bank < a + fee) { C.toast(t('st.atm.short'), 'bad'); return; }
        R.bank -= a + fee; R.atm.amt += a; R.atm.n++; save();
        close(); Sound.fx.cashReg(); C.pay(a, null, false);
        C.toast(t('st.atm.took', { n: fmt(a), f: fmt(fee) }));
        if (R.atm.n >= 3) ach('atm3');
        if (R.bank < 100 && OPS[R.op].bank > 0) ach('bank0');
      } }, U.h('b', null, fmt(a)), U.h('small', null, t('st.atm.fee', { f: fmt(Math.max(20, Math.round(a * 0.02))) }))))),
      left <= 0 ? U.h('p', { class: 'st-fine' }, t(R.bank <= 0 ? 'st.atm.empty' : 'st.atm.limit')) : null);
    const close = C.modal({ title: t('svc.atm'), body: screen, actions: [
      { label: t('st.atm.loans'), onClick: c => { c(); phone('loans'); } }, { label: t('sv.ok'), primary: true }] });
  }

  /* ---------------- out of chips: no free refills in a life ---------------- */
  const refill = C.refill.bind(C);
  C.refill = function () {
    if (!R) return refill();
    if (C.S.balance >= 100) return;
    const any = R.bank > 0 || lendable().length || markerLeft() > 0;
    const body = U.h('div', { class: 'st-offer' }, U.h('p', null, t(any ? 'st.broke.b' : 'st.broke.none')));
    const acts = [];
    if (R.bank > 0) acts.push({ label: t('svc.atm'), onClick: c => { c(); atm(); } });
    if (lendable().length) acts.push({ label: t('st.atm.loans'), onClick: c => { c(); phone('loans'); } });
    acts.push({ label: t('st.work'), onClick: c => { c(); work(); } });
    if (!any) acts.push({ label: t('st.giveup'), primary: true, onClick: c => { c(); ending('ruin'); } });
    C.modal({ title: t('st.broke.t'), body, actions: acts });
  };
  const lendable = () => Object.keys(APPS).filter(k => canBorrow(k) === true);
  const markerLeft = () => { const tier = window.Services ? Services.tier() : 0; return MARKER[tier] - active().filter(l => l.src === 'marker').reduce((a, l) => a + owe(l), 0) - (active().some(l => l.src === 'marker' && overdue(l)) ? 1e12 : 0); };
  function canBorrow(k) {
    const A = APPS[k];
    if (active().some(l => l.src === k)) return 'st.rej.has';
    if (R.credit < A.min) return 'st.rej.credit';
    if (k !== 'loop' && active().filter(l => APPS[l.src]).length >= 2) return 'st.rej.multi';
    if (k === 'loop' && debt() > 800000) return 'st.rej.max';
    return true;
  }
  async function work() {
    if (C.current !== 'lobby') C.go('lobby');
    await Services.nightScene(t('st.work.t'), t('st.work.s'), 3000);
    Services.advance(8 * 60); Services.energize(-35);
    C.pay(1500, null, false); C.toast(t('st.work.paid'), 'good');
    ach('work');
  }

  /* ---------------- the phone ---------------- */
  let ph = null;
  function phone(screen = 'home', arg) {
    if (!R) return;
    if (ph) ph.remove();
    const ov = U.h('div', { class: 'st-ov st-phone-ov', onclick: e => { if (e.target === ov) close(); } });
    const scr = U.h('div', { class: 'st-screen' });
    const clock = U.h('b', null, window.Services ? Services.clock() : '');
    const dev = U.h('div', { class: 'st-phone', role: 'dialog', 'aria-modal': 'true', 'aria-label': t('fl.phone') },
      U.h('div', { class: 'st-status' }, clock, U.h('span', null, t('st.day', { d: day() + 1 }) + ' · ' + (window.Services ? Services.vit().energy : 100) + '%')),
      scr,
      U.h('button', { class: 'st-homebar', 'aria-label': t('st.home'), onclick: () => go('home') }));
    ov.append(dev); document.body.append(ov); ph = ov;
    const esc = e => { if (e.key === 'Escape') close(); };
    document.addEventListener('keydown', esc);
    function close() { document.removeEventListener('keydown', esc); ov.classList.add('out'); setTimeout(() => ov.remove(), 250); if (ph === ov) ph = null; }
    function go(s, a) { Sound.fx.click(); scr.innerHTML = ''; scr.scrollTop = 0; (VIEWS[s] || VIEWS.home)(scr, a, go, close); }
    Sound.fx.open();
    go(screen, arg);
  }
  const head = (title, go, back = 'home') => U.h('div', { class: 'st-head' }, U.h('button', { class: 'st-back', 'aria-label': t('st.back'), onclick: () => go(back), html: C.icon('back') }), U.h('b', null, title));
  const VIEWS = {
    home(el, _, go) {
      const n = unread(), d = debt();
      el.append(
        U.h('div', { class: 'st-wall' }, U.h('small', null, t('st.netWorth')), U.h('b', { class: worth() < 0 ? 'neg' : '' }, fmt(worth())), U.h('small', null, t('st.wallSub', { c: fmt(C.S.balance), b: fmt(R.bank), d: fmt(d) }))),
        U.h('div', { class: 'st-apps' },
          app('msgs', t('st.app.msgs'), '#35d49a', '✉', n),
          app('bills', t('st.app.bills'), '#c8283c', '¥', active().filter(l => overdue(l)).length),
          app('bank', t('st.app.bank'), '#0e8a5c', '▤'),
          app('ach', t('st.app.ach'), '#d9a441', '★'),
          app('ends', t('st.app.ends'), '#7a0f1c', '◆'),
          app('life', t('st.app.life'), '#3b7be0', '◎'),
          ...Object.keys(APPS).map(k => app('loan:' + k, t('st.src.' + k), APPS[k].c, APPS[k].glyph))));
      function app(id, label, c, g, badge) {
        return U.h('button', { class: 'st-app', onclick: () => id.startsWith('loan:') ? go('loan', id.slice(5)) : go(id) },
          U.h('i', { style: `--c:${c}` }, g, badge ? U.h('em', null, String(badge)) : null), U.h('span', null, label));
      }
    },
    loans(el, _, go) {
      el.append(head(t('st.app.loans'), go), U.h('div', { class: 'st-list' }, Object.keys(APPS).map(k => U.h('button', { class: 'st-row', onclick: () => go('loan', k) },
        U.h('i', { style: `--c:${APPS[k].c}` }, APPS[k].glyph), U.h('span', null, U.h('b', null, t('st.src.' + k)), U.h('small', null, t('st.slogan.' + k))), U.h('em', null, fmt(APPS[k].limit))))));
    },
    loan(el, k, go, close) {
      const A = APPS[k], ok = canBorrow(k);
      const amts = [0.25, 0.5, 1].map(f => Math.round(A.limit * f));
      let pick = amts[2];
      const terms = U.h('div', { class: 'st-terms' });
      const paint = () => {
        const got = Math.round(pick * (1 - A.fee)), back = Math.round(pick * (1 + A.daily * A.term));
        terms.innerHTML = '';
        terms.append(
          U.h('div', null, U.h('span', null, t('st.ln.to')), U.h('b', null, fmt(got))),
          U.h('div', null, U.h('span', null, t('st.ln.back', { d: A.term })), U.h('b', null, fmt(back))),
          U.h('details', null, U.h('summary', null, t('st.ln.fine')), U.h('p', null, t('st.ln.fineB', { f: Math.round(A.fee * 100), n: fmt(pick - got), late: '1.5%' }) + (A.contacts ? ' ' + t('st.ln.contacts') : ''))));
      };
      const sel = U.h('div', { class: 'st-amts' }, amts.map(a => { const b = U.h('button', { class: 'st-amt' + (a === pick ? ' on' : ''), onclick: () => { pick = a; U.$$('.st-amt', sel).forEach(x => x.classList.toggle('on', x === b)); paint(); } }, U.h('b', null, fmt(a))); return b; }));
      paint();
      el.append(
        head(t('st.src.' + k), go),
        U.h('div', { class: 'st-loanhero', style: `--c:${A.c}` }, U.h('small', null, t('st.ln.max')), U.h('b', null, fmt(A.limit)), U.h('span', null, t('st.slogan.' + k)), U.h('em', null, t('st.rate.' + k))),
        sel, terms,
        ok === true
          ? U.h('button', { class: 'btn btn-gold st-cta', style: `--c:${A.c}`, onclick: () => { const L = addLoan(k, pick); close(); toastAPR(L); } }, t('st.ln.go'))
          : U.h('p', { class: 'st-rej' }, t(ok)),
        U.h('p', { class: 'st-fine' }, t('st.ln.apr', { r: realAPR(1 - A.fee, 1 + A.daily * A.term, A.term) })));
    },
    bills(el, _, go) { el.append(head(t('st.app.bills'), go), U.h('p', { class: 'st-fine' }, t('st.bills.total', { n: fmt(debt()), c: R.credit })), bills()); },
    bank(el, _, go) {
      el.append(head(t('st.app.bank'), go), U.h('div', { class: 'st-loanhero', style: '--c:#0e8a5c' }, U.h('small', null, t('st.atm.bal')), U.h('b', null, fmt(R.bank)), U.h('span', null, t('st.bank.sub'))),
        U.h('div', { class: 'st-terms' }, U.h('div', null, U.h('span', null, t('st.bank.credit')), U.h('b', null, String(R.credit))), U.h('div', null, U.h('span', null, t('st.bank.borrowed')), U.h('b', null, fmt(R.borrowed))), U.h('div', null, U.h('span', null, t('st.bank.int')), U.h('b', null, fmt(R.paidInt)))),
        U.h('p', { class: 'st-fine' }, t('st.bank.note')));
    },
    msgs(el, _, go) {
      const threads = WHO.filter(w => R.msgs.some(m => m.from === w)).sort((a, b) => last(b).t - last(a).t);
      el.append(head(t('st.app.msgs'), go), threads.length ? U.h('div', { class: 'st-list' }, threads.map(w => {
        const m = last(w), n = R.msgs.filter(x => x.from === w && !x.read).length;
        return U.h('button', { class: 'st-row', onclick: () => go('thread', w) }, U.h('i', { style: `--c:${color(w)}` }, glyph(w)), U.h('span', null, U.h('b', null, t('st.who.' + w)), U.h('small', null, m.text)), n ? U.h('em', { class: 'badge' }, String(n)) : null);
      })) : U.h('p', { class: 'st-fine' }, t('st.msgs.none')));
      function last(w) { const l = R.msgs.filter(m => m.from === w); return l[l.length - 1]; }
    },
    thread(el, w, go) {
      R.msgs.forEach(m => { if (m.from === w) m.read = true; }); save();
      const list = U.h('div', { class: 'st-chat' }, R.msgs.filter(m => m.from === w).map(m => U.h('div', { class: 'st-bub' + (m.me ? ' me' : '') }, m.text)));
      el.append(head(t('st.who.' + w), go, 'msgs'), list);
      const talkable = ['family', 'friend', 'junket', 'collector'].includes(w);
      if (!talkable) return;
      const L = w === 'collector' ? active().filter(l => overdue(l)).sort((a, b) => overdue(b) - overdue(a))[0] : null;
      const send = async text => {
        if (!text) return;
        msg(w, text, { me: true });
        list.append(U.h('div', { class: 'st-bub me' }, text));
        const typing = U.h('div', { class: 'st-bub typing' }, '···'); list.append(typing); list.scrollTop = 1e9;
        const r = await answer(w, text, L);
        typing.remove();
        msg(w, r.reply, { quiet: true }); R.msgs[R.msgs.length - 1].read = true;
        list.append(U.h('div', { class: 'st-bub' }, r.reply)); list.scrollTop = 1e9;
        if (L && r.extend && !L.extDone) { L.extDone = 1; L.due += r.extend * DAY; L.ext = (L.ext || 0) + Math.round(owe(L) * 0.1); L.esc = overdue(L); save(); ach('extended'); C.toast(t('st.extended', { d: r.extend }), 'good'); }
      };
      if (aiOn()) {
        const inp = U.h('input', { class: 'st-input', placeholder: t('st.typing'), maxlength: '120' });
        el.append(U.h('form', { class: 'st-send', onsubmit: e => { e.preventDefault(); const v = inp.value.trim(); inp.value = ''; send(v); } }, inp, U.h('button', { class: 'btn btn-gold btn-sm' }, t('st.send'))));
      } else {
        el.append(U.h('div', { class: 'st-quick' }, [1, 2, 3].map(i => U.h('button', { class: 'sv-chipbtn', onclick: () => send(t('st.q.' + w + '.' + i)) }, t('st.q.' + w + '.' + i)))));
      }
      setTimeout(() => { list.scrollTop = 1e9; }, 30);
    },
    ach(el, _, go) {
      const got = Object.keys(META.ach).length;
      el.append(head(t('st.app.ach') + ` ${got}/${ACH.length}`, go), U.h('div', { class: 'st-achs' }, ACH.map(k => U.h('div', { class: 'st-ach' + (META.ach[k] ? ' on' : '') },
        U.h('i', null, META.ach[k] ? '★' : '?'), U.h('b', null, META.ach[k] || !HIDDEN.includes(k) ? t('st.a.' + k) : '???'), U.h('small', null, META.ach[k] || !HIDDEN.includes(k) ? t('st.ad.' + k) : t('st.hidden'))))));
    },
    ends(el, _, go) {
      el.append(head(t('st.app.ends') + ` ${Object.keys(META.ends).length}/${ENDS.length}`, go), U.h('div', { class: 'st-ends' }, ENDS.map(k => U.h('div', { class: 'st-endcard' + (META.ends[k] ? ' on' : ''), style: `--c:${ENDC[k]}` },
        U.h('b', null, META.ends[k] ? t('st.e.' + k) : '？？？'), U.h('small', null, META.ends[k] ? t('st.es.' + k) : t('st.e.hint.' + k))))));
    },
    life(el, _, go) {
      const o = OPS[R.op];
      el.append(head(t('st.app.life'), go),
        U.h('div', { class: 'st-loanhero', style: `--c:${o.c}` }, U.h('small', null, t('st.op.' + R.op)), U.h('b', null, o.glyph), U.h('span', null, t('st.goal.' + R.op, { n: fmt(GOAL) }))),
        U.h('div', { class: 'st-terms' },
          U.h('div', null, U.h('span', null, t('st.life.day')), U.h('b', null, String(day() - Math.floor(R.t0 / DAY) + 1))),
          U.h('div', null, U.h('span', null, t('st.life.start')), U.h('b', null, fmt(R.start))),
          U.h('div', null, U.h('span', null, t('st.netWorth')), U.h('b', null, fmt(worth()))),
          U.h('div', null, U.h('span', null, t('st.life.peak')), U.h('b', null, fmt(R.peak)))),
        U.h('button', { class: 'btn btn-ghost btn-sm', onclick: () => C.modal({ title: t('st.restart'), body: U.h('p', null, t('st.restartB')), actions: [{ label: t('st.cancel') }, { label: t('st.restart'), primary: true, onClick: c => { c(); if (ph) ph.remove(); ph = null; R = null; save(); opening(true).then(() => window.Floor && Floor.enter()); } }] }) }, t('st.restart')));
    }
  };
  function toastAPR(L) {
    Sound.fx.cashReg();
    const back = L.fixed || Math.round(L.principal * (1 + L.daily * L.term));
    const el = U.h('div', { class: 'st-stamp' }, U.h('small', null, t('st.stamp.got', { n: fmt(L.got) })), U.h('b', null, t('st.stamp.apr', { r: realAPR(L.got, back, L.term) })), U.h('small', null, t('st.stamp.back', { n: fmt(back), d: L.term })));
    document.body.append(el);
    setTimeout(() => { el.classList.add('out'); setTimeout(() => el.remove(), 500); }, 3600);
  }

  /* ---------------- achievements ---------------- */
  const ACH = ['first_loan', 'marker', 'junket', 'all_apps', 'juggle', 'usury', 'million', 'collector', 'exposed', 'extended', 'atm3', 'bank0', 'work', 'manhan', 'tower', 'white', 'whale', 'free10', 'wish10', 'limit', 'dawn', 'nights3', 'walk', 'lotto'];
  const HIDDEN = ['juggle', 'usury', 'exposed', 'extended', 'bank0', 'limit', 'walk'];
  function ach(k) {
    if (META.ach[k]) return;
    META.ach[k] = Date.now(); save();
    const el = U.h('div', { class: 'st-achpop' }, U.h('i', null, '★'), U.h('span', null, U.h('small', null, t('st.unlocked')), U.h('b', null, t('st.a.' + k))));
    document.body.append(el);
    Sound.fx.milestone && Sound.fx.milestone(2);
    setTimeout(() => { el.classList.add('out'); setTimeout(() => el.remove(), 500); }, 3200);
  }
  let wishes = 0;
  function event(kind, arg) {
    if (kind === 'meal' && arg === 'manhan') ach('manhan');
    if (kind === 'drink' && arg === 'tower') ach('tower');
    if (kind === 'buy' && arg === 'white') ach('white');
    if (kind === 'tier' && arg >= 4) ach('whale');
    if (kind === 'free' && arg >= 10) ach('free10');
    if (kind === 'wish' && ++wishes >= 10) ach('wish10');
    if (kind === 'limit') ach('limit');
    if (kind === 'lotto' && arg >= 100) ach('lotto');
    if (kind === 'night' && R) { R.nights = (R.nights || 0) + 1; if (R.nights >= 3) ach('nights3'); save(); }
    sync();
  }

  /* ---------------- endings ---------------- */
  const ENDS = ['ashore', 'walkaway', 'legend', 'ruin', 'hunted', 'prodigal'];
  const ENDC = { ashore: '#35d49a', walkaway: '#6fb7ff', legend: '#f6c94e', ruin: '#5f7d71', hunted: '#c8283c', prodigal: '#e8467a' };
  let ended = false;
  function ending(k) {
    if (ended || !R) return Promise.resolve('end');
    ended = true;
    document.querySelectorAll('.st-notif, .st-stamp').forEach(e => e.remove());
    META.ends[k] = META.ends[k] || Date.now();
    if (window.Floor) Floor.stop();
    const days = day() - Math.floor(R.t0 / DAY) + 1;
    const theo = window.Services ? Math.round(Services.life()) : 0;
    const p = { d: days, b: fmt(R.borrowed), i: fmt(R.paidInt), w: fmt(worth()), s: fmt(R.start), debt: fmt(debt()), th: fmt(theo) };
    Sound.fx[k === 'legend' || k === 'ashore' || k === 'walkaway' ? 'fanfare' : 'lose'](2);
    return new Promise(res => {
      const ov = U.h('div', { class: 'st-ov st-end e-' + k, style: `--c:${ENDC[k]}` },
        U.h('div', { class: 'st-end-in' },
          U.h('small', { class: 'st-end-k' }, t('st.endN', { n: ENDS.indexOf(k) + 1, m: ENDS.length })),
          U.h('h2', null, t('st.e.' + k)),
          U.h('p', { class: 'st-end-s' }, t('st.es.' + k)),
          U.h('p', { class: 'st-end-b' }, t('st.eb.' + k, p)),
          U.h('div', { class: 'st-end-stats' },
            stat('st.life.day', String(days)), stat('st.bank.borrowed', p.b), stat('st.bank.int', p.i), stat('st.netWorth', p.w)),
          U.h('p', { class: 'st-end-note' }, t('st.endNote')),
          U.h('button', { class: 'btn btn-gold', onclick: () => { ov.remove(); R = null; ended = false; save(); opening(true).then(() => { try { sessionStorage.removeItem('gj_in'); } catch (e) { /* ignore */ } if (C.current !== 'lobby') C.go('lobby'); else if (window.Floor) Floor.enter(); res('end'); }); } }, t('st.again'))));
      document.body.append(ov);
      if (C.current !== 'lobby') C.go('lobby');
      if (window.Floor) Floor.stop();
    });
    function stat(key, v) { return U.h('div', null, U.h('small', null, t(key)), U.h('b', null, v)); }
  }
  async function onExit({ net }) {
    if (!R) return null;
    sync();
    if (ended) return 'end';
    if (net > 10000) ach('walk');
    const d = debt();
    let k = null;
    if (!d && R.peak >= 50000) k = 'ashore';
    else if (!d && worth() >= R.start * 2) k = 'walkaway';
    if (!k) return null;
    return new Promise(res => C.modal({ title: t('st.offer.' + k), body: U.h('p', null, t('st.offerB.' + k)), actions: [
      { label: t('st.offer.no'), onClick: c => { c(); res(null); } },
      { label: t('st.offer.yes'), primary: true, onClick: c => { c(); ending(k); res('end'); } }] }));
  }

  /* ---------------- openings ---------------- */
  function opening(force) {
    if (R && !force) return Promise.resolve();
    return new Promise(res => {
      const ov = U.h('div', { class: 'st-ov st-open' });
      const cards = U.h('div', { class: 'st-ops' }, Object.keys(OPS).map(k => {
        const o = OPS[k];
        return U.h('button', { class: 'st-op', style: `--c:${o.c}`, onclick: () => choose(k) },
          U.h('i', null, o.glyph),
          U.h('b', null, t('st.op.' + k)),
          U.h('small', null, t('st.opd.' + k)),
          U.h('div', { class: 'st-op-n' }, U.h('span', null, t('st.chips') + ' ' + U.fmtShort(o.chips)), o.bank ? U.h('span', null, t('st.app.bank') + ' ' + U.fmtShort(o.bank)) : null, o.loans ? U.h('span', { class: 'neg' }, t('st.debtLbl') + ' ' + U.fmtShort(o.loans.reduce((a, l) => a + l[1], 0))) : null),
          U.h('em', null, '★'.repeat(o.stars) + '☆'.repeat(5 - o.stars)));
      }));
      ov.append(U.h('div', { class: 'st-open-in' }, U.h('small', null, t('st.open.k')), U.h('h2', null, t('st.open.t')), U.h('p', null, t('st.open.s')), cards, U.h('p', { class: 'st-fine' }, t('st.open.fine'))));
      document.body.append(ov);
      async function choose(k) {
        Sound.fx.fanfare(0);
        newRun(k);
        ov.innerHTML = '';
        const box = U.h('div', { class: 'st-prologue', style: `--c:${OPS[k].c}` }, U.h('i', null, OPS[k].glyph), U.h('h2', null, t('st.op.' + k)));
        ov.append(box);
        for (let i = 1; i <= 3; i++) {
          const p = U.h('p', null); box.append(p);
          const s = t('st.pro.' + k + '.' + i);
          if (U.reduced) p.textContent = s;
          else for (let j = 0; j <= s.length; j++) { p.textContent = s.slice(0, j); if (j % 3 === 0) Sound.fx.click && j % 9 === 0 && Sound.fx.chip(); await U.sleep(22); }
          await U.sleep(400);
        }
        const go = U.h('button', { class: 'btn btn-gold', onclick: () => { ov.classList.add('out'); setTimeout(() => ov.remove(), 300); if (k === 'debt') setTimeout(() => msg('collector', t('st.od.2', { n: fmt(owe(R.loans[1])), s: srcName('flash') })), 6000); if (k === 'demo' || k === 'rich') setTimeout(() => msg('family', t('st.fam.' + k)), 9000); res(); } }, t('st.enter'));
        box.append(go); go.focus();
      }
    });
  }

  setInterval(() => { if (!document.hidden && R) sync(); }, 5000);

  window.Story = {
    opening, phone: (s, a) => phone(s, a), atm: () => R ? atm() : null, cage: () => R ? cage() : null,
    debt: () => R ? debt() : 0, unread, onFloor, onTime: sync, event, onExit,
    // for agents and tests
    state: () => R && Object.assign(state(), { op: R.op, credit: R.credit, worth: worth(), loans: active().map(l => ({ id: l.id, src: l.src, owed: owe(l), late: overdue(l) })) }),
    borrow: (src, amt) => R && (src === 'marker' || src === 'junket' || canBorrow(src) === true) ? addLoan(src, amt).id : false,
    repay: id => { const L = R && R.loans.find(l => l.id === id); return L ? repay(L, owe(L)) : false; },
    achievements: () => Object.assign({}, META.ach), endings: () => Object.assign({}, META.ends),
    get run() { return R ? R.op : null; }
  };
})();
