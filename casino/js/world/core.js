/* The world's rules. One person (you) living in a city of people who remember.

   World.create(hooks) returns a world. Hooks bind it to a host (all optional):
     time() / advance(min)   an outside clock (the casino clock); otherwise the world keeps its own
     cash  { get, add(n) }   your wallet (the chip balance); otherwise its own
     bank  { get, add(n) }   your savings; otherwise its own
     loans()                 extra debts from the story layer, for observe() only
     lang()                  'zh' | 'en'
     rng()                   random source (seeded in tests)
     llm(system, messages)   a model call returning text; without it people speak from the script
     llmOn()                 whether the model is switched on right now (default: whenever llm is given)
     save(state)             persistence
     notify(event)           every event, as it happens

   Everything a screen does goes through the same calls an agent uses:
     observe()  legal()  act(action)  talk(who, input)  person(id)  relations()  map()  log()  tools()  call(name, input) */
(function (root) {
  const D = root.WorldData || require('./data.js');
  const DAY = 1440;
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const inSpan = (h, s) => s[0] <= s[1] ? h >= s[0] && h < s[1] : h >= s[0] || h < s[1];
  const dayOK = (wd, days) => !days || (days === 'wd' ? wd >= 1 && wd <= 5 : days === 'we' ? wd === 0 || wd === 6 : days.includes(wd));
  const STAT_KEYS = Object.keys(D.STATS);

  function create(hooks = {}) {
    let S = null;
    const rng = hooks.rng || Math.random;
    const lang = () => (hooks.lang ? hooks.lang() : 'zh');
    const tx = o => (o && typeof o === 'object' ? (o[lang()] || o.en) : o);
    const T = (k, p) => { let s = tx(D.TXT[k]) || k; for (const x in p || {}) s = s.split('{' + x + '}').join(p[x]); return s; };
    const fill = (s, p) => { for (const x in p || {}) s = s.split('{' + x + '}').join(p[x]); return s; };
    const fmt = n => Math.round(n).toLocaleString('en-US');
    const pick = a => a[Math.floor(rng() * a.length)];

    /* ---------------- clock ---------------- */
    const now = () => (hooks.time ? hooks.time() : S.t);
    const day = (t = now()) => Math.floor(t / DAY) + 1;
    const weekday = (t = now()) => day(t) % 7;              // day 1 is a Monday
    const hour = (t = now()) => Math.floor((((t % DAY) + DAY) % DAY) / 60);
    const hhmm = (t = now()) => { const m = Math.floor(((t % DAY) + DAY) % DAY); return String(Math.floor(m / 60)).padStart(2, '0') + ':' + String(m % 60).padStart(2, '0'); };
    const clock = (t = now()) => (lang() === 'zh' ? `第${day(t)}天 周${tx(D.TXT.wd)[weekday(t)]} ` : `Day ${day(t)} ${tx(D.TXT.wd).slice(weekday(t) * 2, weekday(t) * 2 + 2)} `) + hhmm(t);
    function advance(min) {
      if (min <= 0) return [];
      if (hooks.advance) hooks.advance(min); else S.t += min;
      return sync();
    }

    /* ---------------- events ---------------- */
    let sink = null;                                  // events produced during one act()
    function emit(k, text, extra) {
      const ev = Object.assign({ k, text, t: now() }, extra || {});
      S.log.push({ t: ev.t, k, text }); if (S.log.length > 240) S.log.splice(0, S.log.length - 240);
      if (sink) sink.push(ev);
      if (hooks.notify) try { hooks.notify(ev); } catch (e) { /* the host's problem */ }
      return ev;
    }
    function msg(from, text) {
      S.msgs.push({ from, text, t: now(), read: false }); if (S.msgs.length > 60) S.msgs.shift();
      emit('msg', T('ev.msg', { w: name(from) }), { from, say: text });
    }

    /* ---------------- people ---------------- */
    const P = id => D.PEOPLE[id];
    const name = id => (id === 'me' ? (lang() === 'zh' ? '你' : 'you') : tx(P(id) && P(id).n) || id);
    const traits = id => (id === 'me' ? S.me.traits : (P(id) && P(id).traits) || []);
    const has = (id, tr) => traits(id).includes(tr);
    function rel(a, b) {
      S.rel[a] = S.rel[a] || {};
      return S.rel[a][b] = S.rel[a][b] || { aff: 0, trust: 10, fam: 0, love: 0, tags: [], last: 0 };
    }
    function tagsOf(a, b) {
      const r = rel(a, b), out = r.tags.slice();
      if (r.fam >= 60 && r.aff >= 60 && r.trust >= 50) out.push('close');
      else if (r.fam >= 30 && r.aff >= 30) out.push('friend');
      if (r.aff <= -40 && !out.includes('rival')) out.push('enemy');
      return out;
    }
    function bump(a, b, d) {
      const r = rel(a, b), got = {};
      for (const k of ['aff', 'trust', 'fam', 'love']) {
        if (!d[k]) continue;
        const lo = k === 'aff' ? -100 : 0, before = r[k];
        r[k] = clamp(Math.round((r[k] + d[k]) * 10) / 10, lo, 100);
        if (r[k] !== before) got[k] = Math.round((r[k] - before) * 10) / 10;
      }
      r.last = day();
      if (b === 'me' && (got.aff || got.trust || got.love)) emit('rel', '', { who: a, d: got });
      return got;
    }
    function remember(id, text, w = 1) {
      const st = S.P[id]; if (!st || !text) return;
      st.mem.push({ d: day(), text: String(text).slice(0, 140), w });
      if (st.mem.length > 24) { st.mem.sort((x, y) => y.w - x.w || y.d - x.d); st.mem.length = 24; }
    }
    function whereIs(id, t = now()) {
      const p = P(id), st = S.P[id];
      if (!p || p.far) return null;
      const date = S.dates.find(x => x.who === id && !x.done && t >= x.at - 30 && t <= x.at + 120);
      if (date) return date.place;
      if (st.away > t) return null;
      const h = hour(t), wd = weekday(t);
      for (const [a, b, place, days] of p.sched || []) {
        const dd = a > b && h < b ? (wd + 6) % 7 : wd;      // the small hours belong to the night before
        if (inSpan(h, [a, b]) && dayOK(dd, days)) return place;
      }
      return null;
    }
    const peopleAt = (place, t) => Object.keys(D.PEOPLE).filter(id => whereIs(id, t) === place);
    const contacts = () => Object.keys(D.PEOPLE).filter(id => P(id).far || S.numbers.includes(id) || rel(id, 'me').fam >= 25);

    /* ---------------- you ---------------- */
    const me = () => S.me;
    const st = () => S.me.st;
    function buff(k) { const t = now(); return S.buffs.filter(b => b.k === k && b.until > t).reduce((s, b) => s + b.v, 0); }
    const attr = k => clamp(S.me.attrs[k] + buff(k), 1, 12);
    function check(skill, a, { base = 30, mod = 0 } = {}) {
      const chance = Math.round(clamp(base + (skill ? (S.me.skills[skill] || 0) / 2 : 0) + (a ? (attr(a) - 5) * 3 : 0) + mod - st().drunk / 8, 5, 95));
      const roll = Math.floor(rng() * 100);
      return { ok: roll < chance, chance, roll, skill, attr: a };
    }
    function practice(k, amt) {
      const sk = S.me.skills, before = sk[k] || 0;
      const gain = amt * (1 - before / 125) * (0.8 + attr('mind') * 0.04) * (st().energy < 20 ? 0.5 : 1) * (st().drunk > 40 ? 0.5 : 1);
      sk[k] = Math.min(100, before + gain); S.me.used[k] = day();
      if (Math.floor(sk[k] / 5) > Math.floor(before / 5)) emit('skill', T('ev.skill', { s: tx(D.SKILLS[k]), v: Math.floor(sk[k]) }), { skill: k, v: Math.floor(sk[k]) });
    }
    function grow(a, n) {
      const m = S.me; m.axp[a] = (m.axp[a] || 0) + n;
      const need = m.attrs[a] * 5;
      if (m.attrs[a] < 10 && m.axp[a] >= need) { m.axp[a] -= need; m.attrs[a]++; emit('attr', T('ev.attr', { a: tx(D.ATTRS[a]), v: m.attrs[a] }), { attr: a, v: m.attrs[a] }); }
    }
    function fx(d) {
      const s = st();
      for (const k in d || {}) if (k in s) s[k] = clamp(s[k] + d[k], 0, 100);
    }

    /* ---------------- money ---------------- */
    const cash = () => (hooks.cash ? hooks.cash.get() : S.cash);
    const addCash = n => { if (hooks.cash) hooks.cash.add(n); else S.cash += n; };
    const bank = () => (hooks.bank ? hooks.bank.get() : S.bank);
    const addBank = n => { if (hooks.bank) hooks.bank.add(n); else S.bank += n; };
    function spend(n) { if (n > cash()) return false; addCash(-n); return true; }
    const owe = d => Math.round(d.amt);
    const lateDebts = () => S.debts.filter(d => d.due < day());

    /* ---------------- news & gossip ---------------- */
    function news(kind, params, { aff = 0, trust = 0, also = [] } = {}) {
      const witnesses = peopleAt(S.at).concat(also).filter((x, i, a) => a.indexOf(x) === i && D.PEOPLE[x]);
      const n = { id: ++S.seq, kind, params: params || {}, day: day(), aff, trust, known: witnesses };
      S.news.push(n);
      for (const w of witnesses) hear(w, n, true);
      return n;
    }
    const newsText = n => T('news.' + n.kind, Object.assign({}, n.params, { w: n.params.w ? name(n.params.w) : '' }));
    function hear(who, n, direct) {
      let aff = n.aff, trust = n.trust;
      if (aff < 0) aff *= has(who, 'grudge') ? 1.5 : has(who, 'warm') ? 0.6 : 1;
      if (trust < 0 && has(who, 'shrewd')) trust *= 1.3;
      if (!direct) { aff *= 0.6; trust *= 0.6; }
      if (n.params.w === who) { aff *= 1.5; trust *= 1.5; }
      bump(who, 'me', { aff, trust });
      remember(who, newsText(n), Math.abs(n.aff) + Math.abs(n.trust) > 10 ? 3 : 1);
    }
    function spread() {
      const d = day();
      for (const n of S.news) {
        if (d - n.day > 7) continue;
        const knew = n.known.slice();
        for (const k of knew) for (const [a, b, w] of D.TIES) {
          const o = a === k ? b : b === k ? a : null;
          if (!o || n.known.includes(o)) continue;
          if (rng() < w / 100 + (k === 'jimmy' || k === 'fang' ? 0.25 : 0.1)) { n.known.push(o); hear(o, n, false); }
        }
      }
      S.news = S.news.filter(n => d - n.day <= 21);
    }

    /* ---------------- places & travel ---------------- */
    const isOpen = (id, t) => inSpan(hour(t), D.PLACES[id].open);
    function travel(from, to, by = 'walk') {
      const a = D.PLACES[from].d, b = D.PLACES[to].d;
      const walk = a === b ? D.WALK.same : (D.WALK[a] && D.WALK[a][b]) || D.WALK[b][a];
      const slow = st().drunk > 60 ? 1.4 : st().energy < 10 ? 1.25 : 1;
      if (by === 'taxi') { const min = Math.ceil(walk / 4) + 3; return { min, cost: 25 + 4 * min }; }
      if (by === 'bus' && a !== b) return { min: Math.ceil(walk / 2) + 6, cost: 4 };
      return { min: Math.round(walk * slow), cost: 0 };
    }

    /* ---------------- time passing ---------------- */
    function hourly(fr) {
      const s = st(), sleeping = S.sleeping;
      if (sleeping) { s.energy += 12.5 * fr; s.full -= 1.5 * fr; s.stress -= 1.5 * fr; }
      else { s.energy -= (4 + s.drunk / 30) * fr; s.full -= 4 * fr; }
      s.drunk -= 12 * fr;
      const partner = Object.keys(S.rel).some(id => id !== 'me' && S.rel[id].me && S.rel[id].me.tags.includes('partner'));
      const stressTo = 18 + lateDebts().length * 14 + S.rent.late * 12 + (S.home ? 0 : 20) + (s.urge > 70 ? 8 : 0) + (cash() + bank() < 500 ? 10 : 0) - (partner ? 6 : 0);
      s.stress += (stressTo - s.stress) * 0.06 * fr;
      const moodTo = 58 - (s.stress - 30) * 0.5 - (s.full < 15 ? 15 : 0) - (s.energy < 15 ? 12 : 0) - (s.health < 40 ? 10 : 0) - (s.urge > 80 ? 8 : 0) + (partner ? 10 : 0);
      s.mood += (moodTo - s.mood) * 0.08 * fr;
      s.urge += (0.15 + S.habit / 70 + s.stress / 160) * (has('me', 'gambler') ? 1.6 : 1) * (sleeping ? 0.3 : 1) * (1.15 - attr('will') * 0.05) * fr;
      if (s.full <= 0) s.health -= 1.5 * fr;
      if (s.energy <= 0) s.health -= 2 * fr;
      if (s.drunk > 70) s.health -= 0.5 * fr;
      if (s.full > 30 && s.energy > 20 && s.drunk < 30) s.health += 0.4 * fr;
      for (const k of STAT_KEYS) s[k] = clamp(s[k], 0, 100);
    }
    function onHour() {
      const s = st(), f = S.flags;
      const warn = (key, on, text) => { if (on && !f[key]) { f[key] = 1; emit('warn', text, { warn: key }); } else if (!on) f[key] = 0; };
      warn('hungry', s.full < 12, T('ev.hungry'));
      warn('tired', s.energy < 12 && !S.sleeping, T('ev.tired'));
      warn('urge', s.urge > 75 && !S.sleeping, T('ev.urge'));
      for (const x of S.dates) if (!x.done && now() > x.at + 120) {
        x.done = 'missed'; bump(x.who, 'me', { aff: -8, trust: -6 }); remember(x.who, T('ev.datemiss', { w: name('me') }), 2);
        emit('date', T('ev.datemiss', { w: name(x.who) }), { who: x.who });
      }
      S.dates = S.dates.filter(x => !x.done || now() - x.at < DAY);
    }
    function daily() {
      const d = day();
      S.today = {};
      // rent, weekly
      if (d >= S.rent.due) {
        S.rent.owed += D.RENT; S.rent.due += 7;
        S.rent.late = Math.max(0, Math.ceil(S.rent.owed / D.RENT) - 1);
        if (S.rent.late) {
          bump('bao', 'me', { aff: -8, trust: -10 }); emit('rent', T('ev.rentlate', { w: S.rent.late }));
          if (S.rent.late >= 2 && S.home) { S.home = false; news('evicted', {}, { aff: -4, trust: -6, also: ['bao'] }); emit('evicted', T('ev.evicted')); if (S.at === 'home') S.at = 'park'; }
        }
      }
      if (d === S.rent.due - 1) msg('bao', fill(tx(pick(D.MSGS.bao)), { n: fmt(D.RENT + S.rent.owed) }));
      // the job notices if you don't come in
      const J = S.job && D.JOBS[S.job.id];
      if (J) {
        const yWd = (weekday() + 6) % 7, due = J.weekdays ? yWd >= 1 && yWd <= 5 : false;
        if (due && S.job.last < d - 1) S.job.miss++;
        else if (!J.weekdays && S.job.last < d - 4) S.job.miss++;
        if (S.job.miss === 2) msg(J.boss || 'jie', T('ev.warn', { b: name(J.boss) || tx(J.n) }));
        if (S.job.miss >= 3) fire();
      }
      // debts accrue and go late
      for (const x of S.debts) {
        if (x.rate) x.amt *= 1 + x.rate;
        if (x.due < d) {
          x.late++;
          if (x.late === 1) { news('default', { w: x.who }, { aff: -6, trust: -12, also: [x.who] }); emit('debt', T('ev.debtlate', { w: name(x.who), n: fmt(owe(x)) }), { who: x.who }); }
          bump(x.who, 'me', { aff: -3, trust: -4 });
          if (x.who === 'scar') { S.flags.hunted = d; msg('scar', tx(pick(D.MSGS.scar))); }
        }
      }
      // money people owe you
      for (const x of S.lent) {
        if (x.done || d < x.due - 2) continue;
        const p = has(x.who, 'loyal') ? 0.45 : has(x.who, 'gambler') ? 0.18 : 0.3;
        if (rng() < p && S.P[x.who].cash > x.amt) { S.P[x.who].cash -= x.amt; addCash(x.amt); x.done = true; bump(x.who, 'me', { aff: 4, trust: 4 }); msg(x.who, tx(pick(x.who === 'jie' ? D.MSGS.jieRepay : D.MSGS.jieRepay))); }
        else if (d === x.due + 1 && x.who === 'jie') msg('jie', tx(pick(D.MSGS.jieLate)));
      }
      spread();
      // people get on with their lives
      for (const id in S.P) {
        const p = S.P[id], base = P(id).cash || 0;
        p.cash = Math.round(p.cash + (base - p.cash) * 0.06);
        p.mood = clamp(p.mood + (55 - p.mood) * 0.3 + (rng() - 0.5) * 10, 0, 100);
        const r = rel(id, 'me');
        if (r.last && d - r.last > 10) r.fam = Math.max(0, r.fam - 0.5);
      }
      // skills fade when unused
      for (const k in S.me.skills) if (S.me.skills[k] > 20 && d - (S.me.used[k] || 0) > 10) S.me.skills[k] -= 0.3;
      S.habit = Math.max(0, S.habit - 0.4);
      // the phone
      if (weekday() === 0) msg('mom', tx(pick(D.MSGS.mom)));
      if (!S.asks.some(a => a.who === 'jie' && !a.done) && S.P.jie.cash < 1500 && rng() < 0.18) ask('jie', 'money', 1000 + 500 * Math.floor(rng() * 4), tx(pick(D.MSGS.jieAsk)));
      const ry = rel('yu', 'me');
      if (ry.fam >= 20 && ry.aff >= 30 && rng() < 0.2 && !S.dates.some(x => x.who === 'yu' && !x.done)) {
        S.dates.push({ who: 'yu', place: 'park', at: (d) * DAY + 390, what: tx(D.L('海边跑步', 'jog by the sea')) });
        msg('yu', tx(D.MSGS.yuJog[0]));
      }
      if (!S.job && (S.me.skills.code || 0) >= 40 && !S.flags.liuJob && rng() < 0.3) { S.flags.liuJob = 1; S.numbers.push('liu'); msg('liu', tx(D.MSGS.liuJob[0])); }
      if (cash() > 80000 && rng() < 0.15) { S.numbers.includes('yan') || S.numbers.push('yan'); msg('yan', tx(D.MSGS.yan[0])); }
    }
    let syncing = false;
    function sync() {
      if (!S || syncing) return [];
      syncing = true;
      const t = now();
      let cur = Math.max(S.last, t - 14 * DAY);
      while (cur < t) {
        const next = Math.min((Math.floor(cur / 60) + 1) * 60, t);
        hourly((next - cur) / 60);
        const crossed = Math.floor(next / 60) > Math.floor(cur / 60);
        const newDay = Math.floor(next / DAY) > Math.floor(cur / DAY);
        cur = next;
        if (newDay) daily();
        if (crossed) onHour();
      }
      S.last = Math.max(S.last, t);
      syncing = false;
      const s = st();
      if (s.health <= 0) collapse();
      else if (s.energy <= 0 && !S.sleeping) passOut();
      return [];
    }
    function collapse() {
      const bill = 3000;
      S.at = 'hospital'; addCash(-Math.min(bill, Math.max(0, cash())));
      Object.assign(st(), { health: 45, energy: 50, full: 50, drunk: 0 });
      emit('collapse', T('ev.collapse', { n: fmt(bill) }));
      news('collapse', {}, { also: ['yu', 'lin'] });
      msg('mom', tx(D.L('医院打电话给我了！你怎么搞成这样？', 'The hospital called me! What happened to you?')));
      S.sleeping = true; advance(600); S.sleeping = false;
    }
    function passOut() {
      emit('passout', tx(D.L('眼前一黑，你睡了过去。', 'Everything goes black.')));
      const unsafe = ['bar', 'casino', 'netcafe', 'loanshark', 'park'].includes(S.at);
      S.sleeping = true; advance(300); S.sleeping = false;
      if (unsafe && rng() < 0.4 && cash() > 200) { const n = Math.round(cash() * 0.15); addCash(-n); emit('robbed', tx(D.L('醒来钱包轻了{n}。', 'Your wallet is {n} lighter.')).replace('{n}', fmt(n))); }
    }

    /* ---------------- jobs ---------------- */
    function needs(need) {
      for (const k in need || {}) {
        const v = k in D.ATTRS ? attr(k) : k in D.SKILLS ? S.me.skills[k] || 0 : null;
        if (v != null && v < need[k]) return (tx(D.ATTRS[k] || D.SKILLS[k])) + ' ≥ ' + need[k];
      }
      return null;
    }
    function hire(id, quiet) {
      const J = D.JOBS[id];
      S.job = { id, lv: 0, perf: 55, shifts: 0, last: day(), miss: 0 };
      if (J.boss) { bump(J.boss, 'me', { fam: 5 }); S.numbers.includes(J.boss) || S.numbers.push(J.boss); }
      if (!quiet) emit('job', T('ev.hired', { j: tx(J.n) }), { job: id });
    }
    function fire() {
      const J = D.JOBS[S.job.id];
      emit('fired', T('ev.fired', { j: tx(J.n) }));
      if (J.boss) bump(J.boss, 'me', { aff: -12, trust: -10 });
      news('fired', {}, { also: J.boss ? [J.boss] : [] });
      S.job = null;
    }
    function canWork() {
      if (!S.job) return 'no job';
      const J = D.JOBS[S.job.id];
      if (S.at !== J.at) return tx(D.PLACES[J.at].n);
      if (J.weekdays && (weekday() === 0 || weekday() === 6)) return tx(D.L('周末不用上班', 'no work at weekends'));
      if (!inSpan(hour(), J.hours)) return J.hours.join('–') + 'h';
      if (st().energy < 15) return tx(D.STATS.energy) + ' < 15';
      if (J.min >= 480 && S.job.last === day() && S.job.today) return tx(D.L('今天已经上过班', 'already worked today'));
      return null;
    }
    function work() {
      const J = D.JOBS[S.job.id], j = S.job, s = st();
      const sharp = s.energy > 40 && s.drunk < 20 && s.full > 20;
      advance(J.min);
      let pay = J.pay[j.lv] * (0.85 + j.perf / 333);
      if (J.commission) { const c = check('talk', 'charm', { base: 25 }); if (c.ok) pay += 200 + Math.round(rng() * 600) + j.lv * 150; }
      if (J.at === 'casino' && has('me', 'gambler')) fx({ urge: 6 });
      fx(J.fx);
      for (const k in J.xp || {}) practice(k, J.xp[k]);
      for (const k in J.axp || {}) grow(k, J.axp[k]);
      j.perf = clamp(j.perf + (sharp ? 4 : -4) + (rng() * 6 - 2) - (s.drunk > 30 ? 8 : 0), 0, 100);
      j.shifts++; j.last = day(); j.today = 1; j.miss = 0;
      pay = Math.round(pay); addCash(pay); S.stats.earned += pay; S.stats.shifts++;
      if (J.boss) bump(J.boss, 'me', { fam: 1, aff: sharp ? 1 : -1, trust: sharp ? 1 : 0 });
      peopleAt(S.at).forEach(id => bump(id, 'me', { fam: 1 }));
      emit('work', T('ev.work', { j: tx(J.n), n: fmt(pay) }), { pay });
      if (j.lv < 2 && j.shifts >= (j.lv + 1) * 12 && j.perf >= 70) {
        j.lv++; j.perf = 60; emit('promo', T('ev.promo', { l: tx(J.lv[j.lv]) }), { lv: j.lv });
        if (J.boss) bump(J.boss, 'me', { aff: 5, trust: 5 });
      }
    }
    function apply(id) {
      const J = D.JOBS[id];
      if (!J) return 'no such job';
      if (S.at !== J.at) return tx(D.PLACES[J.at].n);
      const miss = needs(J.need); if (miss) return miss;
      if (S.job && S.job.id === id) return 'already';
      advance(30);
      const boss = J.boss ? rel(J.boss, 'me') : null;
      const c = check('talk', 'charm', { base: 45, mod: boss ? boss.aff / 4 + boss.trust / 8 : 10 });
      if (!c.ok) { emit('apply', tx(D.L('面试没过。', 'The interview did not go your way.')), { check: c }); return null; }
      hire(id); return null;
    }

    /* ---------------- money between people ---------------- */
    function addDebt(who, amt, days, rate = 0) {
      const x = { id: 'd' + (++S.seq), who, amt, base: amt, due: day() + days, rate, late: 0, t0: day() };
      S.debts.push(x); addCash(amt);
      if (who !== 'scar') emit('borrow', T('ev.borrowed', { w: name(who), n: fmt(amt), d: days }), { who, amt });
      return x;
    }
    function repay(id, amount) {
      const x = S.debts.find(d => d.id === id); if (!x) return 'no such debt';
      const n = Math.min(owe(x), amount == null ? owe(x) : amount, cash());
      if (n <= 0) return tx(D.L('现金不够', 'not enough cash'));
      addCash(-n); x.amt -= n; if (x.who !== 'scar') S.P[x.who].cash += n;
      if (x.amt < 1) {
        S.debts = S.debts.filter(d => d !== x);
        bump(x.who, 'me', { trust: x.late ? 4 : 8, aff: 3 });
        if (x.who === 'scar' && !lateDebts().some(d => d.who === 'scar')) S.flags.hunted = 0;
      }
      emit('repay', T('ev.repaid', { w: name(x.who), n: fmt(n) }), { who: x.who, n });
      return null;
    }
    function ask(who, kind, amount, text) {
      const a = { id: 'a' + (++S.seq), who, kind, amount, text, day: day(), until: day() + 3 };
      S.asks.push(a); S.numbers.includes(who) || S.numbers.push(who);
      msg(who, fill(text || '', { n: fmt(amount) }));
      return a;
    }
    // you answer someone's request
    function answer(id, yes) {
      const a = S.asks.find(x => x.id === id && !x.done); if (!a) return 'no such request';
      a.done = yes ? 'yes' : 'no';
      if (!yes) { bump(a.who, 'me', { aff: has(a.who, 'loyal') ? -2 : -5 }); return null; }
      if (a.kind === 'money') {
        if (!spend(a.amount)) { a.done = 0; return tx(D.L('现金不够', 'not enough cash')); }
        S.P[a.who].cash += a.amount;
        S.lent.push({ who: a.who, amt: a.amount, due: day() + 7 });
        bump(a.who, 'me', { aff: 10, trust: 6 }); news('generous', { w: a.who }, { aff: 3, trust: 3, also: [a.who] });
        remember(a.who, tx(D.L('我缺钱的时候，你借了我{n}。', 'You lent me {n} when I was short.')).replace('{n}', fmt(a.amount)), 4);
      } else bump(a.who, 'me', { aff: 6, trust: 4 });
      return null;
    }

    /* ---------------- conversation effects (validated) ---------------- */
    const today = id => (S.today[id] = S.today[id] || { aff: 0, gave: 0, lent: 0, taught: 0, talks: 0 });
    function effects(who, list) {
      const p = P(who), ps = S.P[who], r = rel(who, 'me'), td = today(who), out = [];
      for (const e of (Array.isArray(list) ? list : []).slice(0, 6)) {
        if (!e || typeof e !== 'object') continue;
        switch (e.type) {
          case 'rel': {
            let aff = clamp(+e.aff || 0, -8, 8), trust = clamp(+e.trust || 0, -6, 6), love = clamp(+e.love || 0, -5, 5);
            if (aff > 0) aff = Math.max(0, Math.min(aff, 16 - td.aff));
            if (has(who, 'warm') && aff > 0) aff = Math.min(8, aff + 1);
            if (love > 0 && !(p.romance && r.aff >= 30 && r.fam >= 20)) love = 0;
            if (love > 0 && has(who, 'romantic')) love = Math.min(5, love + 1);
            if (trust > 0) trust = Math.min(trust, 10 - (td.trust || 0));
            td.aff += Math.max(0, aff); td.trust = (td.trust || 0) + Math.max(0, trust);
            const got = bump(who, 'me', { aff, trust, love });
            if (Object.keys(got).length) out.push(Object.assign({ type: 'rel' }, got));
            break;
          }
          case 'give': {
            if (td.gave || r.aff < 20) break;
            const cap = Math.min(ps.cash * 0.2, r.aff >= 60 ? 5000 : r.aff >= 35 ? 1500 : 300) * (has(who, 'stingy') ? 0.3 : 1);
            const n = Math.round(clamp(+e.amount || 0, 0, cap));
            if (n < 1) break;
            ps.cash -= n; addCash(n); td.gave = n; out.push({ type: 'give', amount: n });
            emit('give', tx(D.L('{w}给了你{n}。', '{w} gave you {n}.')).replace('{w}', name(who)).replace('{n}', fmt(n)), { who, n });
            break;
          }
          case 'lend': {
            if (td.lent || S.debts.some(x => x.who === who)) break;
            const bar = 35 + (has(who, 'stingy') ? 20 : 0) + (has(who, 'cautious') ? 10 : 0) - (has(who, 'naive') ? 10 : 0) - (has(who, 'loyal') && tagsOf(who, 'me').includes('friend') ? 15 : 0);
            if (who !== 'scar' && r.trust < bar) break;
            const cap = who === 'scar' ? 50000 : Math.min(ps.cash * 0.4, r.trust * 150 * (has(who, 'loyal') ? 2 : 1));
            const n = Math.round(clamp(+e.amount || 0, 0, cap) / 100) * 100;
            if (n < 100) break;
            const days = clamp(Math.round(+e.days || 7), 3, 30), rate = who === 'scar' ? 0.1 : clamp(+e.rate || 0, 0, 0.02);
            ps.cash -= n; td.lent = n; addDebt(who, n, days, rate);
            out.push({ type: 'lend', amount: n, days, rate });
            break;
          }
          case 'ask': {
            if (S.asks.some(a => a.who === who && !a.done)) break;
            const amount = Math.round(clamp(+e.amount || 0, 0, 5000));
            const a = ask(who, amount ? 'money' : 'favor', amount, String(e.text || '').slice(0, 140));
            out.push({ type: 'ask', id: a.id, amount });
            break;
          }
          case 'teach': {
            const k = e.skill;
            if (td.taught || !D.SKILLS[k] || r.aff < 25) break;
            if (((p.skills || {})[k] || 0) < (S.me.skills[k] || 0) + 10) break;
            td.taught = 1; practice(k, clamp(+e.amount || 3, 1, 4));
            emit('learn', T('ev.learn', { w: name(who), s: tx(D.SKILLS[k]) }), { who, skill: k });
            out.push({ type: 'teach', skill: k });
            break;
          }
          case 'job': {
            const J = D.JOBS[e.job];
            if (!J || J.boss !== who || needs(J.need) || (S.job && S.job.id === e.job) || r.aff < 10) break;
            hire(e.job); out.push({ type: 'job', job: e.job });
            break;
          }
          case 'invite': {
            const place = e.place in D.PLACES ? e.place : null;
            if (!place || r.aff < 15 || S.dates.some(x => x.who === who && !x.done)) break;
            const h = clamp(Math.round(+e.hour), 0, 23), off = clamp(Math.round(+e.day || 0), 0, 3);
            let at = (day() - 1 + off) * DAY + h * 60;
            if (at < now() + 30) at += DAY;
            const what = String(e.what || tx(D.PLACES[place].n)).slice(0, 40);
            S.dates.push({ who, place, at, what });
            emit('date', T('ev.date', { w: name(who), t: clock(at) + ' · ' + tx(D.PLACES[place].n) }), { who, place, at });
            out.push({ type: 'invite', place, at });
            break;
          }
          case 'remember': remember(who, e.text, clamp(+e.w || 1, 1, 3)); out.push({ type: 'remember' }); break;
          case 'reveal': {
            if (r.trust < 45 && r.fam < 50) break;
            const text = e.secret && D.SECRETS[who] ? tx(D.SECRETS[who]) : String(e.text || '').slice(0, 160);
            if (!text || S.intel.some(x => x.text === text)) break;
            S.intel.push({ who, text, day: day() }); out.push({ type: 'reveal', text });
            emit('intel', text, { who });
            break;
          }
          case 'mood': ps.mood = clamp(ps.mood + clamp(+e.v || 0, -10, 10), 0, 100); out.push({ type: 'mood', v: e.v }); break;
          case 'tag': {
            const tg = e.tag, has_ = r.tags.includes(tg);
            if (tg === 'partner' && !has_ && p.romance && r.love >= 60 && r.aff >= 55 && r.trust >= 40) { r.tags.push('partner'); news('partner', { w: who }, { also: [who] }); }
            else if (tg === 'rival' && !has_ && r.aff <= -30) r.tags.push('rival');
            else if (tg === 'ex' && r.tags.includes('partner')) { r.tags = r.tags.filter(x => x !== 'partner').concat('ex'); r.love = Math.min(r.love, 20); }
            else break;
            out.push({ type: 'tag', tag: tg });
            break;
          }
          case 'number': if (!S.numbers.includes(who) && r.aff >= 10) { S.numbers.push(who); out.push({ type: 'number' }); } break;
          case 'leave': ps.busy = now() + 90; out.push({ type: 'leave' }); break;
        }
      }
      return out;
    }
    // things you hand over in a conversation, before the other side reacts
    function hand(who, give) {
      if (!give) return null;
      if (give.item) {
        if (!(S.me.items[give.item] > 0)) return { err: 'no item' };
        S.me.items[give.item]--;
        const big = give.item === 'gift_l', stingy = has(who, 'stingy'), proud = has(who, 'proud');
        const aff = (big ? 9 : 4) + (proud && big ? 3 : 0) + (stingy && !big ? 2 : 0);
        const love = P(who).romance && rel(who, 'me').aff >= 25 ? (big ? 4 : 2) : 0;
        if (!today(who).gift) { today(who).gift = 1; bump(who, 'me', { aff, love }); }
        emit('gift', T('ev.gift', { w: name(who) }), { who });
        return { gave: give.item };
      }
      if (give.cash) {
        const n = Math.round(+give.cash);
        if (!(n > 0) || !spend(n)) return { err: 'not enough cash' };
        S.P[who].cash += n;
        const d = S.debts.find(x => x.who === who);
        if (d) { addCash(n); repay(d.id, n); return { repaid: n }; }
        if (!today(who).gift) { today(who).gift = 1; bump(who, 'me', { aff: Math.min(8, Math.round(Math.log10(n + 1) * 2)), trust: 2 }); }
        return { gave: n };
      }
      return null;
    }

    /* ---------------- what you can do ---------------- */
    function placeActs(all) {
      const out = [];
      for (const id in D.ACTS) {
        const A = D.ACTS[id];
        if (A.at !== '*' && !A.at.includes(S.at)) continue;
        if (id === 'sleep' && !(S.home && S.at === 'home')) continue;
        let why = null;
        if (!isOpen(S.at)) why = T('ev.closed', { p: tx(D.PLACES[S.at].n) });
        else if (A.cost && cash() < A.cost) why = tx(D.L('现金不够', 'not enough cash'));
        else if (A.need && A.need.energy && st().energy < A.need.energy) why = tx(D.STATS.energy) + ' < ' + A.need.energy;
        else if (A.need && A.need.item && !(S.me.items[A.need.item] > 0)) why = tx(D.ITEMS[A.need.item]) + ' ×0';
        else if (id === 'counsel' && !peopleAt('hospital').includes('lin')) why = tx(D.L('林医生不在（工作日9–17点）', 'Dr Lam is out (weekdays 9–17)'));
        else if (id === 'shark' && lateDebts().some(d => d.who === 'scar')) why = tx(D.L('疤哥：先把旧账还了', 'Scar: settle the old one first'));
        else if (id === 'pawnit' && !Object.keys(D.PAWN).some(k => S.me.items[k] > 0)) why = tx(D.L('没有能当的东西', 'nothing to pawn'));
        if (why && !all) continue;
        out.push({ type: 'do', id, n: tx(A.n), min: A.min, cost: A.cost || 0, ok: !why, why });
      }
      return out;
    }
    function legal(opts = {}) {
      sync();
      const all = !!opts.all, out = [];
      for (const id in D.PLACES) if (id !== S.at) {
        const w = travel(S.at, id, 'walk'), b = travel(S.at, id, 'bus'), x = travel(S.at, id, 'taxi');
        out.push({ type: 'go', to: id, n: tx(D.PLACES[id].n), open: isOpen(id, now() + w.min), walk: w.min, bus: b.cost ? b.min : null, taxi: { min: x.min, cost: x.cost } });
      }
      out.push(...placeActs(all));
      if (S.job) { const why = canWork(); if (!why || (all && S.at === D.JOBS[S.job.id].at)) out.push({ type: 'work', job: S.job.id, n: tx(D.JOBS[S.job.id].n), min: D.JOBS[S.job.id].min, ok: !why, why }); }
      for (const id in D.JOBS) if (D.JOBS[id].at === S.at && !(S.job && S.job.id === id)) {
        const why = needs(D.JOBS[id].need);
        if (!why || all) out.push({ type: 'apply', job: id, n: tx(D.JOBS[id].n), pay: D.JOBS[id].pay[0], ok: !why, why });
      }
      if (S.job) out.push({ type: 'quit' });
      for (const id of peopleAt(S.at)) if (!(S.P[id].busy > now())) out.push({ type: 'talk', who: id, n: name(id) });
      for (const id of contacts()) out.push({ type: 'call', who: id, n: name(id) });
      if (S.rent.owed > 0) out.push({ type: 'pay_rent', amount: S.rent.owed });
      for (const x of S.debts) out.push({ type: 'repay', id: x.id, who: x.who, amount: owe(x) });
      for (const a of S.asks) if (!a.done && a.until >= day()) out.push({ type: 'answer', id: a.id, who: a.who, amount: a.amount, yes: true });
      if (!S.home && S.at === 'park') out.push({ type: 'sleep', hours: 6, rough: true });
      out.push({ type: 'wait', min: 60 });
      return out;
    }

    /* ---------------- doing it ---------------- */
    function doAct(id, a) {
      const A = D.ACTS[id], opt = placeActs(true).find(x => x.id === id);
      if (!opt) return 'not here';
      if (!opt.ok) return opt.why;
      if (A.h === 'sleep') return sleep(a.hours);
      if (A.cost && !spend(A.cost)) return tx(D.L('现金不够', 'not enough cash'));
      if (A.need && A.need.item) S.me.items[A.need.item]--;
      if (A.min) advance(A.min);
      fx(A.fx);
      for (const k in A.xp || {}) practice(k, A.xp[k]);
      for (const k in A.axp || {}) grow(k, A.axp[k]);
      const done = special(A.h, a, A);
      if (typeof done === 'string') return done;
      emit('do', tx(A.n), { id, cost: A.cost || 0, min: A.min });
      return null;
    }
    function special(h, a, A) {
      const s = st();
      switch (h) {
        case 'groceries': S.me.items.groceries = (S.me.items.groceries || 0) + 3; break;
        case 'buy': S.me.items[A.item] = (S.me.items[A.item] || 0) + 1; break;
        case 'outfit': S.buffs.push({ k: 'charm', v: 1, until: now() + 3 * DAY }); break;
        case 'pray': S.buffs.push({ k: 'luck', v: 1, until: now() + 12 * 60 }); if (has('me', 'superstitious')) fx({ mood: 6 }); peopleAt('temple').forEach(id => bump(id, 'me', { fam: 1 })); break;
        case 'stick': {
          const r = rng() * 100 - attr('luck') * 2 - buff('luck') * 8;
          const n = r < 12 ? 1 : r < 35 ? 2 : r < 65 ? 3 : r < 88 ? 4 : 5;
          const sup = has('me', 'superstitious') ? 2 : 1;
          if (n <= 2) { fx({ mood: 6 * sup }); S.buffs.push({ k: 'luck', v: 1, until: now() + DAY }); }
          if (n >= 4) fx({ stress: 5 * sup, urge: -8 * sup });
          emit('stick', T('ev.stick', { n: [0, 8, 23, 41, 66, 99][n], t: T('stick.' + n) }), { n });
          break;
        }
        case 'gossip': {
          const c = check('read', 'charm', { base: 35 });
          const pool = Object.keys(D.SECRETS).filter(id => id !== 'mom' && !S.intel.some(x => x.who === id));
          const heard = S.news.filter(n => !n.known.includes('me') && n.day >= day() - 7);
          if (c.ok && pool.length) { const id = pick(pool), text = tx(D.SECRETS[id]); S.intel.push({ who: id, text, day: day(), via: S.at }); emit('intel', text, { who: id, check: c }); }
          else if (heard.length) { const n = heard[0]; n.known.push('me'); emit('intel', newsText(n), { check: c }); }
          else emit('intel', tx(D.L('今天没什么新鲜事。', 'Nothing new today.')), { check: c });
          peopleAt(S.at).forEach(id => bump(id, 'me', { fam: 1 }));
          break;
        }
        case 'volunteer': news('volunteer', {}, { aff: 3, trust: 2 }); break;
        case 'counsel': S.habit = Math.max(0, S.habit - 3); bump('lin', 'me', { fam: 3, trust: 2 }); S.numbers.includes('lin') || S.numbers.push('lin'); break;
        case 'pawn': {
          const item = a.item && S.me.items[a.item] > 0 && D.PAWN[a.item] ? a.item : Object.keys(D.PAWN).find(k => S.me.items[k] > 0);
          const n = Math.round(D.PAWN[item] * (0.8 + (S.me.skills.biz || 0) / 250 + rel('xu', 'me').aff / 500));
          S.me.items[item]--; addCash(n); S.pawned.push({ item, n, day: day() });
          emit('pawn', T('ev.pawn', { i: tx(D.ITEMS[item]), n: fmt(n) }), { item, n });
          break;
        }
        case 'shark': {
          const n = Math.round(clamp(+a.amount || 10000, 1000, 50000) / 1000) * 1000;
          addDebt('scar', n, 7, 0.1); S.numbers.includes('scar') || S.numbers.push('scar');
          emit('shark', T('ev.shark', { n: fmt(n) }), { n });
          break;
        }
        case 'bank': {
          const n = Math.round(+a.amount || 0);
          if (n > 0) { if (!spend(n)) return tx(D.L('现金不够', 'not enough cash')); addBank(n); }
          else if (n < 0) { const w = Math.min(-n, bank()); addBank(-w); addCash(w); }
          emit('bank', T('ev.bank', { n: fmt(bank()) }), { bank: bank() });
          break;
        }
        case 'casino': {
          if (hooks.casino) { emit('casino', tx(D.PLACES.casino.n), { enter: true }); hooks.casino(); break; }
          // headless: a plain even-money game at the house edge
          const min = clamp(+a.min || 60, 10, 600), stake = clamp(+a.stake || 100, 10, Math.max(10, cash()));
          let net = 0; for (let i = 0; i < min / 2 && cash() + net >= stake; i++) net += rng() < 0.4865 ? stake : -stake;
          advance(min); addCash(net); gambled({ min, net });
          break;
        }
      }
      return null;
    }
    function sleep(hours) {
      const h = clamp(Math.round(+hours || 8), 1, 14);
      if (!(S.home && S.at === 'home') && !(S.at === 'park' && !S.home)) return tx(D.L('只能回家睡', 'you sleep at home'));
      S.sleeping = true; advance(h * 60); S.sleeping = false;
      if (S.at === 'park') fx({ health: -4, mood: -6 });
      if (S.job) S.job.today = 0;
      emit('sleep', T('ev.slept', { h }), { h });
      return null;
    }
    // the casino tells the world what happened inside
    function gambled({ min = 60, net = 0 } = {}) {
      sync();
      const s = st(), mag = Math.log10(Math.abs(net) + 1);
      s.urge = clamp(s.urge - min * 0.35 + (net > 0 ? 6 : 0), 0, 100);
      S.habit = clamp(S.habit + (min / 60) * (has('me', 'gambler') ? 2 : 1.2) + (net > 0 ? 1.5 : 0), 0, 60);
      fx(net >= 0 ? { mood: Math.min(18, mag * 4) } : { mood: -Math.min(25, mag * 5), stress: Math.min(20, mag * 4) });
      practice('gamble', min / 40); practice('odds', min / 120);
      S.stats.gambledMin += min; S.stats.gambleNet += net;
      if (net >= 50000) news('bigwin', { n: fmt(net) }, { aff: 2, also: ['jimmy'] });
      if (net <= -50000) news('bigloss', { n: fmt(-net) }, { trust: -4, also: ['jimmy'] });
      emit('gambled', T('ev.gambled', { m: Math.round(min), r: (net >= 0 ? '+' : '−') + fmt(Math.abs(net)) }), { net, min });
    }
    function arrive(to) {
      S.at = to;
      emit('arrive', T(isOpen(to) ? 'ev.arrive' : 'ev.closed', { p: tx(D.PLACES[to].n) }), { at: to });
      for (const x of S.dates) if (!x.done && x.place === to && Math.abs(now() - x.at) <= 120) {
        x.done = 'met'; bump(x.who, 'me', { aff: 6, trust: 4, fam: 4, love: P(x.who).romance ? 3 : 0 });
        remember(x.who, tx(D.L('你守约来了（{w}）。', 'You kept our plan ({w}).')).replace('{w}', x.what || ''), 2);
        emit('date', T('ev.dateok', { w: name(x.who) }), { who: x.who, met: true });
      }
      if (S.flags.hunted && ['home', 'neon', 'bar', 'netcafe', 'casino'].some(k => k === to || D.PLACES[to].d === k) && rng() < 0.45) {
        emit('collector', T('ev.collector', { p: tx(D.PLACES[to].n) }), { who: 'scar' });
        fx({ stress: 15, mood: -10 });
      }
    }
    function act(a = {}) {
      if (!S) return { ok: false, err: 'no life yet' };
      sync();
      const events = sink = [];
      let err = null;
      try {
        switch (a.type) {
          case 'go': {
            if (!D.PLACES[a.to]) { err = 'no such place'; break; }
            if (a.to === S.at) { err = 'already here'; break; }
            const tr = travel(S.at, a.to, a.by || 'walk');
            if (tr.cost && !spend(tr.cost)) { err = tx(D.L('现金不够', 'not enough cash')); break; }
            advance(tr.min);
            if (a.by !== 'taxi' && a.by !== 'bus') fx({ energy: -tr.min / 15 });
            arrive(a.to);
            break;
          }
          case 'do': err = doAct(a.id, a); break;
          case 'work': err = canWork(); if (!err) work(); break;
          case 'apply': err = apply(a.job); break;
          case 'quit': if (S.job) { const J = D.JOBS[S.job.id]; if (J.boss) bump(J.boss, 'me', { aff: -4 }); emit('quit', tx(J.n)); S.job = null; } else err = 'no job'; break;
          case 'sleep': err = sleep(a.hours); break;
          case 'pay_rent': {
            const n = Math.min(S.rent.owed, cash());
            if (n <= 0) { err = S.rent.owed ? tx(D.L('现金不够', 'not enough cash')) : 'nothing owed'; break; }
            addCash(-n); S.rent.owed -= n; S.rent.late = Math.max(0, Math.ceil(S.rent.owed / D.RENT) - 1);
            bump('bao', 'me', { trust: 4, aff: 2 }); emit('rent', T('ev.rentpaid', { n: fmt(n) }));
            if (!S.home && S.rent.owed === 0) { S.home = true; bump('bao', 'me', { aff: -5 }); emit('home', tx(D.L('包租婆让你搬回去了，脸色很难看。', 'The landlady lets you back in, scowling.'))); }
            break;
          }
          case 'repay': err = repay(a.id, a.amount); break;
          case 'answer': err = answer(a.id, a.yes !== false); break;
          case 'wait': { const m = clamp(Math.round(+a.min || 60), 10, 600); advance(m); emit('wait', tx(D.ACTS.wait.n)); break; }
          case 'talk': case 'call': sink = null; return talk(a.who, a.text != null ? a.text : { intent: a.intent || 'chat', give: a.give }, { remote: a.type === 'call' });
          default: err = 'unknown action type';
        }
      } finally { sink = null; }
      save();
      return err ? { ok: false, err, events } : { ok: true, events };
    }

    /* ---------------- conversation ---------------- */
    async function talk(who, input, opts = {}) {
      if (!S) return { ok: false, err: 'no life yet' };
      sync();
      if (!P(who)) return { ok: false, err: 'no such person' };
      const remote = !!opts.remote;
      if (!remote && whereIs(who) !== S.at) return { ok: false, err: name(who) + ' ' + tx(D.L('不在这里', 'is not here')) };
      if (remote && !contacts().includes(who)) return { ok: false, err: tx(D.L('没有TA的电话', 'you don’t have their number')) };
      if (S.P[who].busy > now()) return { ok: false, err: name(who) + ' ' + tx(D.L('现在不想说话', 'doesn’t want to talk now')) };
      const Mind = root.WorldMind || require('./mind.js');
      const events = sink = [];
      try {
        advance(remote ? 5 : 10);
        const td = today(who);
        if (td.talks++ < 3) bump(who, 'me', { fam: remote ? 0.5 : 1.5 });
        S.stats.talks++;
        const r = await Mind.talk(api, who, input, { remote });
        save();
        return Object.assign({ ok: true, events }, r);
      } finally { sink = null; }
    }

    /* ---------------- reading the world ---------------- */
    function relView(id) {
      const r = rel(id, 'me');
      return { aff: Math.round(r.aff), trust: Math.round(r.trust), fam: Math.round(r.fam), love: Math.round(r.love), tags: tagsOf(id, 'me') };
    }
    function person(id) {
      if (id === 'me' || !id) {
        const m = S.me;
        return {
          id: 'me', name: m.name, attrs: Object.fromEntries(Object.keys(D.ATTRS).map(k => [k, attr(k)])), base: Object.assign({}, m.attrs),
          axp: Object.fromEntries(Object.keys(D.ATTRS).map(k => [k, Math.round(((m.axp[k] || 0) / (m.attrs[k] * 5)) * 100)])),
          skills: Object.fromEntries(Object.keys(D.SKILLS).map(k => [k, Math.floor(m.skills[k] || 0)])),
          status: Object.fromEntries(STAT_KEYS.map(k => [k, Math.round(m.st[k])])), traits: m.traits.slice(), items: Object.assign({}, m.items),
          habit: Math.round(S.habit), look: m.look
        };
      }
      const p = P(id); if (!p) return null;
      const r = rel(id, 'me'), known = r.fam >= 20 || r.trust >= 40;
      return {
        id, name: name(id), age: p.age, sex: p.sex, bio: tx(p.bio), job: p.job ? tx((D.JOBS[p.job] || {}).n) || p.job : null, persona: p.persona || null,
        traits: known ? p.traits.slice() : p.traits.slice(0, 1), at: whereIs(id), look: p.look, romance: !!p.romance,
        rel: relView(id), mood: Math.round(S.P[id].mood), memories: S.P[id].mem.slice(-6).map(m => m.text),
        secret: S.intel.find(x => x.who === id && D.SECRETS[id] && x.text === tx(D.SECRETS[id])) ? tx(D.SECRETS[id]) : null,
        number: contacts().includes(id)
      };
    }
    function people(here) {
      const ids = here ? peopleAt(S.at) : Object.keys(D.PEOPLE);
      return ids.map(id => ({ id, name: name(id), at: whereIs(id), rel: relView(id) }));
    }
    function relations() {
      const out = {};
      for (const a of Object.keys(S.rel)) for (const b of Object.keys(S.rel[a])) {
        const r = S.rel[a][b];
        if (b === 'me' || (r.aff >= 20)) (out[a] = out[a] || {})[b] = { aff: Math.round(r.aff), trust: Math.round(r.trust), fam: Math.round(r.fam), love: Math.round(r.love), tags: tagsOf(a, b) };
      }
      return out;
    }
    function map() {
      const t = now();
      return {
        districts: Object.fromEntries(Object.entries(D.DISTRICTS).map(([k, d]) => [k, { n: tx(d.n), c: d.c, x: d.x, y: d.y }])),
        places: Object.fromEntries(Object.entries(D.PLACES).map(([k, p]) => [k, { n: tx(p.n), d: p.d, x: p.x, y: p.y, icon: p.icon, open: isOpen(k, t), hours: p.open, people: peopleAt(k, t), job: Object.keys(D.JOBS).filter(j => D.JOBS[j].at === k) }])),
        at: S.at
      };
    }
    function observe() {
      sync();
      const loans = hooks.loans ? hooks.loans() || [] : [];
      return {
        time: clock(), t: now(), day: day(), weekday: weekday(), hour: hour(), at: S.at, place: tx(D.PLACES[S.at].n), open: isOpen(S.at),
        home: S.home, cash: cash(), bank: bank(), me: person('me'),
        job: S.job ? { id: S.job.id, n: tx(D.JOBS[S.job.id].n), title: tx(D.JOBS[S.job.id].lv[S.job.lv]), lv: S.job.lv, perf: Math.round(S.job.perf), shifts: S.job.shifts, miss: S.job.miss, at: D.JOBS[S.job.id].at, hours: D.JOBS[S.job.id].hours } : null,
        rent: { owed: S.rent.owed, due: S.rent.due, late: S.rent.late, weekly: D.RENT },
        debts: S.debts.map(x => ({ id: x.id, who: x.who, owed: owe(x), due: x.due, late: x.late, rate: x.rate })).concat(loans.map(l => Object.assign({ story: true }, l))),
        lent: S.lent.filter(x => !x.done).map(x => ({ who: x.who, amount: x.amt, due: x.due })),
        asks: S.asks.filter(a => !a.done && a.until >= day()).map(a => ({ id: a.id, who: a.who, kind: a.kind, amount: a.amount, text: a.text })),
        dates: S.dates.filter(x => !x.done).map(x => ({ who: x.who, place: x.place, at: x.at, when: clock(x.at), what: x.what })),
        here: people(true), unread: S.msgs.filter(m => !m.read).length,
        intel: S.intel.slice(-8), hunted: !!S.flags.hunted, stats: Object.assign({}, S.stats)
      };
    }

    /* ---------------- life & persistence ---------------- */
    function start(op = 'fresh', o = {}) {
      const O = D.OPENINGS[op] || D.OPENINGS.fresh;
      S = {
        v: 1, op, seq: 0, t: o.t != null ? o.t : 8 * 60, last: 0, at: 'home', home: true, sleeping: false, habit: O.urge / 4,
        cash: o.cash != null ? o.cash : 10000, bank: o.bank != null ? o.bank : 20000,
        me: {
          name: o.name || tx(D.L('你', 'You')), attrs: Object.assign({ body: 5, mind: 5, charm: 5, will: 5, luck: 5 }, O.attrs), axp: {},
          skills: Object.fromEntries(Object.keys(D.SKILLS).map(k => [k, (O.skills || {})[k] || 0])), used: {},
          st: { health: 90, energy: 85, full: 60, mood: 55, stress: O.stress || 25, urge: O.urge || 15, drunk: 0 },
          traits: O.traits.slice(), items: Object.assign({}, O.items),
          look: o.look || { skin: '#e6b48f', hair: '#1a1410', hs: 'side', top: '#2f6f5e', fem: 0 }
        },
        P: {}, rel: {}, job: null, rent: { due: 0, owed: 0, late: 0 }, debts: [], lent: [], asks: [], news: [], dates: [], msgs: [], log: [], intel: [], numbers: ['mom', 'jie'], pawned: [],
        today: {}, flags: {}, buffs: [], stats: { shifts: 0, earned: 0, talks: 0, gambledMin: 0, gambleNet: 0 }
      };
      if (o.t == null && hooks.time) S.t = hooks.time();
      if (!hooks.time) S.t = o.t != null ? o.t : 8 * 60;
      S.last = now();
      S.rent.due = day() + 7;
      for (const id in D.PEOPLE) {
        const p = D.PEOPLE[id];
        S.P[id] = { cash: p.cash || 0, mood: 55, mem: [], busy: 0, away: 0 };
        const r = rel(id, 'me'); Object.assign(r, p.rel || {}, { tags: ((p.rel || {}).tags || []).slice() });
        Object.assign(rel('me', id), { aff: r.aff, trust: r.trust, fam: r.fam, tags: r.tags.slice() });
      }
      for (const [a, b, w] of D.TIES) for (const [x, y] of [[a, b], [b, a]]) Object.assign(rel(x, y), { aff: w, trust: Math.round(w * 0.8), fam: w });
      if (O.job) hire(O.job, true);
      if (op === 'debt') { S.debts.push({ id: 'd' + (++S.seq), who: 'scar', amt: 15000, base: 15000, due: day() + 3, rate: 0.1, late: 0, t0: day() }); S.numbers.push('scar'); }
      if (op === 'god') { bump('ace', 'me', { fam: 10 }); bump('chenbo', 'me', { fam: 15, aff: 10 }); }
      emit('start', tx(D.PLACES.home.desc));
      save();
      return observe();
    }
    function save() { if (S && hooks.save) try { hooks.save(S); } catch (e) { /* storage full or blocked */ } }
    function load(state) { if (!state || state.v !== 1) return false; S = state; return true; }

    /* ---------------- tools for language models ---------------- */
    function tools() {
      return [
        { name: 'life_observe', description: 'Your life right now: time, place, status bars (0-100), attributes (1-10), skills (0-100), money, job, rent, debts, people here and how they see you, requests, plans.', input_schema: { type: 'object', properties: {} } },
        { name: 'life_legal', description: 'Every action you can take right now, as {type,...} objects ready for life_act.', input_schema: { type: 'object', properties: {} } },
        { name: 'life_act', description: 'Do one thing. Types: go {to, by: walk|bus|taxi}, do {id, item?, amount?, hours?}, work, apply {job}, quit, sleep {hours}, pay_rent, repay {id, amount?}, answer {id, yes}, wait {min}. Time passes and the world moves.', input_schema: { type: 'object', properties: { type: { type: 'string' }, to: { type: 'string' }, by: { type: 'string' }, id: { type: 'string' }, job: { type: 'string' }, item: { type: 'string' }, amount: { type: 'number' }, hours: { type: 'number' }, min: { type: 'number' }, yes: { type: 'boolean' } }, required: ['type'] } },
        { name: 'life_talk', description: 'Talk to someone here (or call them with remote=true). Say anything in text, or pick an intent: chat, praise, joke, confide, rumor, borrow, repay, gift, invite, flirt, confess, apologize, lie, threaten, advice, job, teach. give: {item} or {cash}. They answer in character and the world changes within the rules.', input_schema: { type: 'object', properties: { who: { type: 'string' }, text: { type: 'string' }, intent: { type: 'string' }, amount: { type: 'number' }, give: { type: 'object' }, remote: { type: 'boolean' } }, required: ['who'] } },
        { name: 'life_person', description: 'Everything you know about one person: bio, traits you have noticed, mood, what they remember about you, how they see you.', input_schema: { type: 'object', properties: { id: { type: 'string' } }, required: ['id'] } },
        { name: 'life_map', description: 'The city: districts, places, opening hours, who is where now, which jobs are where.', input_schema: { type: 'object', properties: {} } }
      ];
    }
    async function call(nameT, input = {}) {
      switch (nameT) {
        case 'life_observe': return observe();
        case 'life_legal': return legal();
        case 'life_act': return act(input);
        case 'life_talk': return talk(input.who, input.text != null ? input.text : { intent: input.intent || 'chat', amount: input.amount, give: input.give }, { remote: !!input.remote });
        case 'life_person': return person(input.id);
        case 'life_map': return map();
        default: return { ok: false, err: 'unknown tool ' + nameT };
      }
    }

    // what the conversation layer gets to touch
    const api = {
      D, get S() { return S; }, T, tx, fmt, now, day, hour, clock, rng, lang, name, rel, relView, tagsOf, has, check, practice,
      remember, effects, hand, news, person, whereIs, peopleAt, cash, emit, msg, ask, answer,
      get llm() { return hooks.llm && (!hooks.llmOn || hooks.llmOn()) ? hooks.llm : null; }, today, contacts
    };

    return {
      start, load, save, observe, legal, act, talk, person, people, relations, map, tools, call, gambled, sync,
      log: (n = 30) => S ? S.log.slice(-n) : [],
      msgs: () => S ? S.msgs.slice().reverse() : [],
      readAll: () => { if (S) S.msgs.forEach(m => { m.read = true; }); save(); },
      setAt: p => { if (S && D.PLACES[p]) { S.at = p; save(); } },
      // the casino hands its own energy and drunkenness back when you walk out
      setStatus: o => { if (!S) return; for (const k of ['energy', 'drunk', 'mood', 'stress']) if (o[k] != null) S.me.st[k] = clamp(Math.round(o[k]), 0, 100); save(); },
      get state() { return S; }, get started() { return !!S; },
      clock, travel: (to, by) => travel(S.at, to, by), isOpen, whereIs, name, tx, T, api, D
    };
  }

  const World = { create, DATA: D };
  root.World = World;
  if (typeof module !== 'undefined' && module.exports) module.exports = World;
})(typeof window !== 'undefined' ? window : globalThis);
