/* The city screen: HUD, map, the place you are in, your sheet, your people, your phone, your diary.
   Everything here calls Life.world, the same object an agent drives. */
(function () {
  const t = (k, p) => I18N.t(k, p);
  const D = window.WorldData;
  const W = () => Life.world;
  const tx = o => W().tx(o);
  const esc = s => String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const fmt = n => U.fmt(Math.round(n));
  const STATUS = ['health', 'energy', 'full', 'mood', 'stress', 'urge', 'drunk'];
  const BAD = { stress: 1, urge: 1, drunk: 1 };
  const SC = { health: '#ff5d6c', energy: '#f6c94e', full: '#ff9f43', mood: '#ff7ab8', stress: '#a77bff', urge: '#ff4d4d', drunk: '#5fd3c6' };

  const ICON = { sleep: '🛏', nap: '😴', cook: '🍳', tv: '📺', selfstudy: '📖', milktea: '🧋', meal: '🍱', gossip: '🗣', groceries: '🥬', streetfood: '🍢', pawnit: '💍', pray: '🙏', stick: '🎋',
    volunteer: '🤝', bizbook: '📊', oddsbook: '🧮', novel: '📚', workout: '🏋', boxing: '🥊', jog: '🏃', seaview: '🌊', shopping: '🛍', gift_s: '🎁', gift_l: '💝', cinema: '🎬', drink: '🍸',
    karaoke: '🎤', netgame: '🎮', pokerbook: '🃏', shark: '🦈', checkup: '🩺', counsel: '🛋', casino: '🎰', bank: '🏦', wait: '⏳' };
  let root = null, tab = 'map', sel = null, timer = null, lastHour = -1, acts = [], busy = false;

  /* ---------------- portraits ---------------- */
  const faces = {};
  function look(id) { return id === 'me' ? W().state.me.look : (D.PEOPLE[id] || {}).look; }
  function face(id, o = {}) {
    const r = id === 'me' ? null : W().person(id).rel;
    return Portrait.svg(look(id), Object.assign({ ring: r ? Portrait.relColor(r) : '#f6c94e', title: id === 'me' ? W().state.me.name : W().name(id) }, o));
  }
  function faceURI(id) {
    const r = id === 'me' ? null : W().person(id).rel, k = id + (r ? Portrait.relColor(r) : '');
    return faces[k] || (faces[k] = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(Portrait.svg(look(id), { nobg: 0 }).replace('<svg ', '<svg xmlns="http://www.w3.org/2000/svg" ')));
  }
  const known = id => { const r = W().person(id).rel; return r.fam >= 5 || r.tags.length > 0 || W().state.numbers.includes(id); };
  const tagLab = k => t('lf.tag.' + k);
  const hours = p => (p.open[0] === 0 && p.open[1] === 24 ? t('lf.24h') : String(p.open[0]).padStart(2, '0') + '–' + String(p.open[1] % 24).padStart(2, '0'));

  /* ---------------- shell ---------------- */
  function shell() {
    root.innerHTML = `
      <div class="lf-hud"></div>
      <nav class="lf-tabs" role="tablist">${['map', 'me', 'people', 'phone', 'diary'].map(k => `<button class="lf-tab" role="tab" data-x="tab" data-k="${k}"><i>${{ map: '🏙', me: '🧍', people: '🕸', phone: '📱', diary: '📔' }[k]}</i><span>${t('lf.tab.' + k)}</span><b class="lf-badge" data-badge="${k}"></b></button>`).join('')}</nav>
      <div class="lf-feed" aria-live="polite"></div>
      <div class="lf-body"></div>
      <p class="lf-fine">${t('lf.fine')}</p>`;
    root.addEventListener('click', onClick);
    root.addEventListener('keydown', e => { if ((e.key === 'Enter' || e.key === ' ') && e.target.matches('.mp-pin')) { e.preventDefault(); pickPlace(e.target.dataset.place); } });
  }

  /* ---------------- HUD ---------------- */
  function hud() {
    const o = W().observe(), s = o.me.status, el = root.querySelector('.lf-hud');
    const h = o.hour, sky = Art.sky(h);
    const ai = Life.ai();
    el.dataset.sky = sky.k;
    el.innerHTML = `
      <button class="lf-me" data-x="tab" data-k="me" aria-label="${esc(t('lf.tab.me'))}">${face('me', { emotion: s.mood > 65 ? 'happy' : s.mood < 30 || s.stress > 75 ? 'worried' : 'neutral' })}</button>
      <div class="lf-when">
        <b class="lf-clock">${esc(o.time)}</b>
        <span class="lf-where">${D.PLACES[o.at].icon} ${esc(o.place)}${o.open ? '' : ` <em>${t('lf.shut')}</em>`}</span>
      </div>
      <div class="lf-money">
        <span><small>${t('lf.cash')}</small><b>${fmt(o.cash)}</b></span>
        <span><small>${t('lf.bank')}</small><b>${fmt(o.bank)}</b></span>
        ${o.debts.length ? `<span class="neg"><small>${t('lf.debt')}</small><b>${fmt(o.debts.reduce((a, d) => a + (d.owed || 0), 0))}</b></span>` : ''}
      </div>
      <div class="lf-bars">${STATUS.filter(k => k !== 'drunk' || s.drunk > 0).map(k => `<div class="lf-bar${BAD[k] ? ' bad' : ''}${(BAD[k] ? s[k] > 70 : s[k] < 25) ? ' warn' : ''}" title="${esc(tx(D.STATS[k]))} ${s[k]}"><small>${esc(tx(D.STATS[k]))}</small><span><i style="width:${s[k]}%;background:${SC[k]}"></i></span><b>${s[k]}</b></div>`).join('')}</div>
      <button class="lf-ai${ai.on ? ' on' : ''}" data-x="ai" title="${esc(t('lf.ai.tip'))}"><i></i>${ai.on ? esc(t('lf.ai.on', { m: ai.model || 'AI' })) : t('lf.ai.off')}</button>`;
    root.querySelectorAll('.lf-tab').forEach(b => b.classList.toggle('on', b.dataset.k === tab));
    const ph = root.querySelector('[data-badge=phone]'), n = o.unread + o.asks.length;
    ph.textContent = n ? n : ''; ph.hidden = !n;
    if (o.hunted) el.classList.add('hunted'); else el.classList.remove('hunted');
  }

  /* ---------------- tabs ---------------- */
  function render() {
    if (!root || !W().started) return;
    hud();
    const body = root.querySelector('.lf-body');
    body.dataset.tab = tab;
    ({ map: tabMap, me: tabMe, people: tabPeople, phone: tabPhone, diary: tabDiary })[tab](body);
    lastHour = W().observe().hour;
  }

  /* ----- the city ----- */
  function tabMap(body) {
    const o = W().observe(), m = W().map();
    const ppl = W().people().filter(p => p.at).map(p => ({ id: p.id, at: p.at, known: known(p.id), img: known(p.id) ? faceURI(p.id) : '', ring: Portrait.relColor(p.rel) }));
    body.innerHTML = `
      <div class="lf-cols">
        <section class="lf-mapwrap">
          <div class="lf-map">${Art.map(m, { hour: o.hour, people: ppl, sel })}</div>
          <div class="lf-pop" ${sel ? '' : 'hidden'}>${sel ? popover(sel) : ''}</div>
        </section>
        <section class="lf-place">${place(o)}</section>
      </div>`;
  }
  function popover(id) {
    const p = D.PLACES[id], m = W().map().places[id], here = id === W().state.at;
    const go = here ? null : W().legal().find(a => a.type === 'go' && a.to === id);
    const who = m.people.filter(known);
    return `
      <button class="lf-x" data-x="unsel" aria-label="${esc(t('lf.close'))}">×</button>
      <div class="lf-pop-h"><i>${p.icon}</i><div><b>${esc(tx(p.n))}</b><small>${esc(tx(D.DISTRICTS[p.d].n))} · ${hours(p)} · <span class="${m.open ? 'ok' : 'neg'}">${m.open ? t('lf.open') : t('lf.shut')}</span></small></div></div>
      <p>${esc(tx(p.desc))}</p>
      ${who.length ? `<div class="lf-pop-ppl">${who.map(id2 => `<span title="${esc(W().name(id2))}">${face(id2)}</span>`).join('')}</div>` : ''}
      ${m.job.length ? `<p class="lf-pop-job">💼 ${m.job.map(j => esc(tx(D.JOBS[j].n))).join(' · ')}</p>` : ''}
      ${here ? `<p class="lf-here">📍 ${t('lf.here')}</p>` : `<div class="lf-go">
        <button class="btn" data-x="go" data-to="${id}" data-by="walk">🚶 ${t('lf.walk')}<small>${go.walk}${t('lf.min')}</small></button>
        ${go.bus != null ? `<button class="btn" data-x="go" data-to="${id}" data-by="bus">🚌 ${t('lf.bus')}<small>${go.bus}${t('lf.min')} · 4</small></button>` : ''}
        <button class="btn btn-gold" data-x="go" data-to="${id}" data-by="taxi">🚕 ${t('lf.taxi')}<small>${go.taxi.min}${t('lf.min')} · ${fmt(go.taxi.cost)}</small></button>
      </div>${go.open ? '' : `<p class="neg">${t('lf.closedthen')}</p>`}`}`;
  }
  function pickPlace(id) {
    sel = sel === id ? null : id;
    Sound.fx.click();
    const pop = root.querySelector('.lf-pop');
    root.querySelectorAll('.mp-pin').forEach(g => g.classList.toggle('sel', g.dataset.place === sel));
    pop.hidden = !sel; pop.innerHTML = sel ? popover(sel) : '';
  }

  /* the place you are in: scene, people, things to do */
  function fxChips(fx, xp, axp) {
    const out = [];
    for (const k in fx || {}) out.push(`<span class="lf-chip ${(BAD[k] ? fx[k] < 0 : fx[k] > 0) ? 'up' : 'dn'}">${esc(tx(D.STATS[k]))} ${fx[k] > 0 ? '+' : ''}${fx[k]}</span>`);
    for (const k in xp || {}) out.push(`<span class="lf-chip xp">${esc(tx(D.SKILLS[k]))} +${xp[k]}</span>`);
    for (const k in axp || {}) out.push(`<span class="lf-chip xp">${esc(tx(D.ATTRS[k]))} ↑</span>`);
    return out.join('');
  }
  function place(o) {
    const id = o.at, p = D.PLACES[id];
    acts = W().legal({ all: true });
    const here = o.here, n = here.length;
    const doing = acts.filter(a => a.type === 'do');
    const work = acts.filter(a => a.type === 'work' || a.type === 'apply' || a.type === 'sleep');
    return `
      <div class="lf-scene">${Art.scene(id, o.hour)}
        <div class="lf-sc-ppl">${here.map((q, i) => `<button class="lf-sc-p" data-x="talk" data-who="${q.id}" style="left:${n === 1 ? 50 : 14 + (i * 72) / Math.max(1, n - 1)}%;--d:${i * 0.12}s">${face(q.id, { emotion: W().state.P[q.id].mood > 65 ? 'happy' : W().state.P[q.id].mood < 30 ? 'sad' : 'neutral' })}<span>${esc(q.name)}</span></button>`).join('')}</div>
        <div class="lf-sc-cap"><b>${p.icon} ${esc(tx(p.n))}</b><small>${esc(tx(D.DISTRICTS[p.d].n))} · ${hours(p)}</small></div>
      </div>
      <p class="lf-desc">${esc(tx(p.desc))}</p>
      ${here.length ? `<h3>${t('lf.peoplehere')}</h3><div class="lf-ppl">${here.map(q => pcard(q.id)).join('')}</div>` : `<p class="lf-empty">${t('lf.nobody')}</p>`}
      ${work.length ? `<h3>${t('lf.work')}</h3><div class="lf-acts">${work.map(a => actCard(a)).join('')}</div>` : ''}
      <h3>${t('lf.todo')}</h3>
      <div class="lf-acts">${doing.map(a => actCard(a)).join('') || `<p class="lf-empty">${t('lf.nothing')}</p>`}
        ${actCard({ type: 'wait', min: 60, ok: true })}</div>`;
  }
  function actCard(a) {
    const i = acts.indexOf(a) >= 0 ? acts.indexOf(a) : (acts.push(a), acts.length - 1);
    let n = a.n, sub = '', chips = '', icon = '•';
    if (a.type === 'do') {
      const A = D.ACTS[a.id];
      icon = ICON[a.id] || D.PLACES[W().state.at].icon;
      sub = `${a.min ? a.min + t('lf.min') : ''}${a.cost ? ' · ' + fmt(a.cost) : ''}`;
      chips = fxChips(A.fx, A.xp, A.axp);
    } else if (a.type === 'work') {
      const J = D.JOBS[a.job], j = W().state.job;
      icon = '💼'; n = t('lf.dowork', { j: a.n }); sub = `${a.min}${t('lf.min')} · ${fmt(J.pay[j.lv])}`; chips = fxChips(J.fx, J.xp, J.axp);
    } else if (a.type === 'apply') {
      const J = D.JOBS[a.job];
      icon = '📝'; n = t('lf.apply', { j: a.n }); sub = `${fmt(a.pay)}/${t('lf.shift')} · ${J.hours[0]}–${J.hours[1]}`;
      chips = Object.keys(J.need || {}).map(k => `<span class="lf-chip">${esc(tx(D.ATTRS[k] || D.SKILLS[k] || D.STATS[k]))} ≥ ${J.need[k]}</span>`).join('');
    } else if (a.type === 'sleep') { icon = '🌙'; n = t('lf.rough'); sub = '6h'; }
    else if (a.type === 'wait') { icon = '⏳'; n = t('lf.wait'); sub = '60' + t('lf.min'); }
    return `<button class="lf-act${a.ok === false ? ' no' : ''}" data-x="act" data-i="${i}" ${a.ok === false ? 'aria-disabled="true"' : ''}>
      <i>${icon}</i><b>${esc(n)}</b><small>${esc(sub)}</small>${chips ? `<span class="lf-chips">${chips}</span>` : ''}${a.why ? `<em>${esc(a.why)}</em>` : ''}</button>`;
  }
  function pcard(id) {
    const p = W().person(id), r = p.rel;
    return `<button class="lf-pc" data-x="talk" data-who="${id}">
      <span class="lf-pc-f">${face(id)}</span>
      <span class="lf-pc-t"><b>${esc(p.name)}</b><small>${esc(p.job || p.bio.split(/[，。,.]/)[0])}</small>
      <span class="lf-pc-r">${r.tags.map(k => `<em>${tagLab(k)}</em>`).join('')}${relMini(r)}</span></span></button>`;
  }
  const relMini = r => `<span class="lf-rm" title="${esc(t('lf.r.aff'))} ${r.aff} · ${esc(t('lf.r.trust'))} ${r.trust}"><i class="${r.aff < 0 ? 'neg' : ''}" style="width:${Math.abs(r.aff) / 2 + 2}%"></i></span>`;

  /* ----- me ----- */
  function tabMe(body) {
    const o = W().observe(), me = o.me, s = me.status, A = Object.keys(D.ATTRS);
    const j = o.job;
    body.innerHTML = `
      <div class="lf-sheet">
        <section class="lf-card lf-who">
          <div class="lf-big">${face('me', { emotion: s.mood > 65 ? 'happy' : s.mood < 30 ? 'sad' : 'neutral' })}</div>
          <div><h2>${esc(W().state.me.name)}</h2>
            <p class="lf-traits">${me.traits.map(k => `<span class="lf-chip" title="${esc(tx(D.TRAITS[k].d))}">${esc(tx(D.TRAITS[k].n))}</span>`).join('')}</p>
            <p class="lf-sub">${t('lf.habit')} <b class="${me.habit > 25 ? 'neg' : ''}">${me.habit}</b> · ${o.home ? t('lf.hashome') : `<span class="neg">${t('lf.nohome')}</span>`}</p>
          </div>
        </section>
        <section class="lf-card"><h3>${t('lf.attrs')}</h3>
          <div class="lf-radar">${Art.radar(A.map(k => me.attrs[k]), A.map(k => tx(D.ATTRS[k])))}</div>
          <div class="lf-axp">${A.map(k => `<div><small>${esc(tx(D.ATTRS[k]))} ${me.attrs[k]}${me.attrs[k] !== me.base[k] ? `<em>(${me.base[k]}${me.attrs[k] > me.base[k] ? '+' : ''}${me.attrs[k] - me.base[k]})</em>` : ''}</small><span><i style="width:${me.axp[k]}%"></i></span></div>`).join('')}</div>
        </section>
        <section class="lf-card"><h3>${t('lf.skills')}</h3>
          <div class="lf-skills">${Object.keys(D.SKILLS).map(k => `<div class="lf-sk"><small>${esc(tx(D.SKILLS[k]))}</small><span><i style="width:${me.skills[k]}%"></i></span><b>${me.skills[k]}</b><em>${t('lf.sklv.' + Math.min(4, Math.floor(me.skills[k] / 20)))}</em></div>`).join('')}</div>
        </section>
        <section class="lf-card"><h3>${t('lf.status')}</h3>
          <div class="lf-skills">${STATUS.map(k => `<div class="lf-sk${BAD[k] ? ' bad' : ''}"><small>${esc(tx(D.STATS[k]))}</small><span><i style="width:${s[k]}%;background:${SC[k]}"></i></span><b>${s[k]}</b></div>`).join('')}</div>
        </section>
        <section class="lf-card"><h3>${t('lf.job')}</h3>
          ${j ? `<p><b>${esc(j.n)}</b> · ${esc(j.title)}</p><p class="lf-sub">${esc(tx(D.PLACES[j.at].n))} · ${j.hours[0]}–${j.hours[1]} · ${fmt(D.JOBS[j.id].pay[j.lv])}/${t('lf.shift')}</p>
            <div class="lf-sk"><small>${t('lf.perf')}</small><span><i style="width:${j.perf}%"></i></span><b>${j.perf}</b></div>
            <p class="lf-sub">${t('lf.shifts', { n: j.shifts })}${j.lv < 2 ? ' · ' + t('lf.promo', { n: Math.max(0, (j.lv + 1) * 12 - j.shifts) }) : ''}${j.miss ? ` · <span class="neg">${t('lf.miss', { n: j.miss })}</span>` : ''}</p>`
            : `<p class="lf-sub">${t('lf.nojob')}</p>`}
        </section>
        <section class="lf-card"><h3>${t('lf.items')}</h3>
          <p class="lf-traits">${Object.keys(me.items).filter(k => me.items[k] > 0).map(k => `<span class="lf-chip">${esc(tx(D.ITEMS[k]))} ×${me.items[k]}</span>`).join('') || `<span class="lf-sub">${t('lf.noitems')}</span>`}</p>
          <h3>${t('lf.stats')}</h3>
          <p class="lf-sub">${t('lf.statline', { s: o.stats.shifts, e: fmt(o.stats.earned), c: o.stats.talks, g: Math.round(o.stats.gambledMin / 60), n: (o.stats.gambleNet >= 0 ? '+' : '−') + fmt(Math.abs(o.stats.gambleNet)) })}</p>
        </section>
      </div>`;
  }

  /* ----- people: the web ----- */
  function tabPeople(body) {
    const all = W().people(), rels = W().relations();
    const met = all.filter(p => known(p.id));
    const close = p => (p.rel.fam + Math.max(0, p.rel.aff) + p.rel.trust / 2) / 2.5;
    met.sort((a, b) => close(b) - close(a));
    const pos = {}, N = met.length;
    met.forEach((p, i) => {
      const a = (i / Math.max(1, N)) * Math.PI * 2 - Math.PI / 2, r = 175 - Math.min(100, close(p)) * 1.05;
      pos[p.id] = [250 + Math.cos(a) * r, 250 + Math.sin(a) * r];
    });
    let lines = '';
    for (const a in rels) for (const b in rels[a]) if (b !== 'me' && a < b && pos[a] && pos[b]) lines += `<line x1="${pos[a][0]}" y1="${pos[a][1]}" x2="${pos[b][0]}" y2="${pos[b][1]}" stroke="${Portrait.relColor(rels[a][b])}" stroke-opacity=".28" stroke-width="1.2" stroke-dasharray="3 4"/>`;
    for (const p of met) lines += `<line x1="250" y1="250" x2="${pos[p.id][0]}" y2="${pos[p.id][1]}" stroke="${Portrait.relColor(p.rel)}" stroke-opacity=".75" stroke-width="${1 + p.rel.fam / 25}"/>`;
    const nodes = met.map(p => `<g class="lf-node" data-x="person" data-who="${p.id}" transform="translate(${pos[p.id][0].toFixed(1)},${pos[p.id][1].toFixed(1)})" tabindex="0" role="button">
        <circle r="21" fill="${Portrait.relColor(p.rel)}"/><image href="${faceURI(p.id)}" x="-19" y="-19" width="38" height="38" clip-path="url(#lf-clip)"/>
        <text y="34" text-anchor="middle">${esc(p.name)}</text></g>`).join('');
    const unmet = all.length - met.length;
    body.innerHTML = `
      <div class="lf-cols">
        <section class="lf-card lf-web">
          <svg viewBox="0 0 500 500" class="lf-websvg"><defs><clipPath id="lf-clip"><circle r="19"/></clipPath><clipPath id="lf-clip-me"><circle r="26"/></clipPath><radialGradient id="lf-wg"><stop offset="0" stop-color="rgba(246,201,78,.18)"/><stop offset="1" stop-color="rgba(246,201,78,0)"/></radialGradient></defs>
            <circle cx="250" cy="250" r="240" fill="url(#lf-wg)"/>${[70, 120, 170].map(r => `<circle cx="250" cy="250" r="${r}" fill="none" stroke="rgba(255,255,255,.06)"/>`).join('')}
            ${lines}<g transform="translate(250,250)"><circle r="29" fill="#f6c94e"/><image href="${faceURI('me')}" x="-26" y="-26" width="52" height="52" clip-path="url(#lf-clip-me)"/></g>${nodes}</svg>
          <p class="lf-legend">${['close', 'friend', 'love', 'known', 'hostile'].map(k => `<span><i style="background:${{ close: '#f6c94e', friend: '#35d49a', love: '#ff8ab8', known: '#6fb7ff', hostile: '#e0443c' }[k]}"></i>${t('lf.lg.' + k)}</span>`).join('')}</p>
          ${unmet ? `<p class="lf-sub">${t('lf.unmet', { n: unmet })}</p>` : ''}
        </section>
        <section class="lf-plist">${met.map(p => pcard(p.id)).join('')}</section>
      </div>`;
  }
  function personSheet(id) {
    const p = W().person(id), r = p.rel, here = p.at === W().state.at;
    const body = U.h('div', { class: 'lf-ps', html: `
      <div class="lf-ps-h"><div class="lf-big">${face(id, { emotion: p.mood > 65 ? 'happy' : p.mood < 30 ? 'sad' : 'neutral' })}</div>
        <div><p class="lf-sub">${p.age}${t('lf.age')}${p.job ? ' · ' + esc(p.job) : ''}</p><p>${esc(p.bio)}</p>
        <p class="lf-traits">${p.traits.map(k => `<span class="lf-chip" title="${esc(tx(D.TRAITS[k].d))}">${esc(tx(D.TRAITS[k].n))}</span>`).join('')}${p.traits.length < D.PEOPLE[id].traits.length ? `<span class="lf-chip dim">？</span>` : ''}</p>
        <p class="lf-sub">📍 ${p.at ? esc(tx(D.PLACES[p.at].n)) : t('lf.nowhere')}${p.number ? ' · 📱' : ''}</p></div></div>
      ${relBars(r, p.romance)}
      ${p.memories.length ? `<h4>${t('lf.remembers')}</h4><ul class="lf-mem">${p.memories.map(m => `<li>${esc(m)}</li>`).join('')}</ul>` : ''}
      ${p.secret ? `<h4>${t('lf.secret')}</h4><p class="lf-secret">${esc(p.secret)}</p>` : ''}` });
    const actions = [];
    if (here) actions.push({ label: t('lf.talk'), primary: true, onClick: c => { c(); Talk.open(id); } });
    else if (p.number) actions.push({ label: t('lf.call'), primary: true, onClick: c => { c(); Talk.open(id, true); } });
    if (p.at && !here) actions.push({ label: t('lf.goto'), onClick: c => { c(); tab = 'map'; sel = p.at; render(); } });
    C.modal({ title: p.name, body, actions, wide: true });
  }
  function relBars(r, romance) {
    const bar = (k, v, lo) => `<div class="lf-rb"><small>${t('lf.r.' + k)}</small><span class="${lo ? 'mid' : ''}">${lo ? `<i class="${v < 0 ? 'neg' : ''}" style="left:${v < 0 ? 50 + v / 2 : 50}%;width:${Math.abs(v) / 2}%"></i>` : `<i style="width:${v}%"></i>`}</span><b>${v}</b></div>`;
    return `<div class="lf-rel">${bar('aff', r.aff, 1)}${bar('trust', r.trust)}${bar('fam', r.fam)}${romance || r.love ? bar('love', r.love) : ''}
      <p class="lf-traits">${r.tags.map(k => `<span class="lf-chip tag-${k}">${tagLab(k)}</span>`).join('')}</p></div>`;
  }

  /* ----- phone ----- */
  function tabPhone(body) {
    const o = W().observe(), msgs = W().msgs().slice(0, 30), contacts = W().state.numbers;
    body.innerHTML = `
      <div class="lf-phone">
        <section class="lf-card"><h3>📨 ${t('lf.msgs')}</h3>${msgs.length ? `<ul class="lf-msgs">${msgs.map(m => `<li class="${m.read ? '' : 'new'}"><span class="lf-mf">${face(m.from)}</span><div><b>${esc(W().name(m.from))}</b><small>${esc(W().clock(m.t))}</small><p>${esc(m.text)}</p></div></li>`).join('')}</ul>` : `<p class="lf-empty">${t('lf.nomsgs')}</p>`}</section>
        ${o.asks.length ? `<section class="lf-card"><h3>🙏 ${t('lf.asks')}</h3>${o.asks.map(a => `<div class="lf-ask"><span class="lf-mf">${face(a.who)}</span><p><b>${esc(W().name(a.who))}</b> ${esc(a.text || t('lf.askfor', { n: fmt(a.amount) }))}</p><button class="btn btn-sm btn-gold" data-x="answer" data-id="${a.id}" data-yes="1">${t('lf.yes')}</button><button class="btn btn-sm" data-x="answer" data-id="${a.id}" data-yes="0">${t('lf.no')}</button></div>`).join('')}</section>` : ''}
        ${o.dates.length ? `<section class="lf-card"><h3>📅 ${t('lf.plans')}</h3>${o.dates.map(d => `<p>${esc(W().name(d.who))} · ${esc(tx(D.PLACES[d.place].n))} · <b>${esc(d.when)}</b>${d.what ? ' · ' + esc(d.what) : ''}</p>`).join('')}</section>` : ''}
        <section class="lf-card"><h3>💸 ${t('lf.money')}</h3>
          <p>${t('lf.rent')}: ${o.rent.owed ? `<b class="neg">${fmt(o.rent.owed)}</b> <button class="btn btn-sm btn-gold" data-x="rent">${t('lf.payrent')}</button>` : t('lf.rentok', { d: o.rent.due, n: fmt(o.rent.weekly) })}</p>
          ${o.debts.map(d => `<div class="lf-debt${d.late ? ' late' : ''}"><span>${esc(d.story ? t('st.src.' + d.who) : W().name(d.who))}</span><b>${fmt(d.owed)}</b>${d.late ? `<em>${t('lf.late', { n: d.late })}</em>` : d.due ? `<small>${t('lf.due', { d: d.due })}</small>` : ''}<button class="btn btn-sm" data-x="repay" data-id="${d.id}" data-story="${d.story ? 1 : ''}">${t('lf.repay')}</button></div>`).join('')}
          ${o.lent.map(l => `<p class="lf-sub">${t('lf.lentto', { w: W().name(l.who), n: fmt(l.amount), d: l.due })}</p>`).join('')}
          <button class="btn" data-x="story-phone">🏦 ${t('lf.apps')}</button>
        </section>
        <section class="lf-card"><h3>☎️ ${t('lf.contacts')}</h3><div class="lf-contacts">${contacts.map(id => `<button class="lf-ct" data-x="call" data-who="${id}"><span class="lf-mf">${face(id)}</span><b>${esc(W().name(id))}</b></button>`).join('')}</div></section>
        ${o.intel.length ? `<section class="lf-card"><h3>🕵️ ${t('lf.intel')}</h3><ul class="lf-mem">${o.intel.slice().reverse().map(x => `<li><b>${esc(W().name(x.who))}</b> ${esc(x.text)}</li>`).join('')}</ul></section>` : ''}
      </div>`;
    W().readAll();
    hud();
  }

  /* ----- diary ----- */
  function tabDiary(body) {
    const log = W().log(120).filter(e => e.text).reverse();
    let d = -1, html = '';
    for (const e of log) {
      const dd = Math.floor(e.t / 1440) + 1;
      if (dd !== d) { d = dd; html += `<h3>${t('lf.dayn', { n: dd })}</h3>`; }
      html += `<p class="lf-log k-${e.k}"><small>${String(Math.floor(((e.t % 1440) + 1440) % 1440 / 60)).padStart(2, '0')}:${String(Math.floor(((e.t % 60) + 60) % 60)).padStart(2, '0')}</small>${esc(e.text)}</p>`;
    }
    body.innerHTML = `<section class="lf-card lf-diary">${html || `<p class="lf-empty">${t('lf.nolog')}</p>`}</section>`;
  }

  /* ---------------- doing things ---------------- */
  async function travel(to, by) {
    if (busy) return; busy = true;
    const from = W().state.at, svg = root.querySelector('.mp-svg');
    const r = W().act({ type: 'go', to, by });
    if (r.ok && svg && !U.reduced) {
      const a = D.PLACES[from], b = D.PLACES[to], NS = 'http://www.w3.org/2000/svg';
      const ln = document.createElementNS(NS, 'line'), dot = document.createElementNS(NS, 'text');
      Object.entries({ x1: a.x * 10, y1: a.y * 10 - 20, x2: a.x * 10, y2: a.y * 10 - 20, class: 'mp-route' }).forEach(([k, v]) => ln.setAttribute(k, v));
      dot.textContent = { walk: '🚶', bus: '🚌', taxi: '🚕' }[by]; dot.setAttribute('class', 'mp-mover'); dot.setAttribute('text-anchor', 'middle'); dot.setAttribute('font-size', '34');
      svg.append(ln, dot);
      Sound.fx.click();
      const t0 = performance.now(), dur = by === 'walk' ? 1100 : 800;
      await new Promise(res => {
        const step = now => {
          const k = Math.min(1, (now - t0) / dur), e = k < 0.5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2;
          const x = a.x * 10 + (b.x - a.x) * 10 * e, y = a.y * 10 - 20 + (b.y - a.y) * 10 * e;
          ln.setAttribute('x2', x); ln.setAttribute('y2', y); dot.setAttribute('x', x); dot.setAttribute('y', y - 10 - Math.sin(k * Math.PI * 6) * 3);
          if (k < 1) requestAnimationFrame(step); else res();
        };
        requestAnimationFrame(step);
      });
    }
    busy = false;
    if (!r.ok) C.toast(r.err, 'bad');
    sel = null;
    render();
    events(r.events);
  }
  async function run(a) {
    if (busy) return;
    if (a.ok === false) { C.toast(a.why || t('lf.cant'), 'bad'); return; }
    if (a.type === 'do') {
      const A = D.ACTS[a.id];
      if (A.h === 'bank') return bankSheet();
      if (A.h === 'shark') return pickSheet(t('lf.shark.t'), t('lf.shark.b'), [5000, 10000, 20000, 50000].map(n => ({ label: fmt(n), v: n })), v => doAct(Object.assign({}, a, { amount: v })));
      if (A.h === 'pawn') return pickSheet(t('lf.pawn.t'), '', Object.keys(D.PAWN).filter(k => W().state.me.items[k] > 0).map(k => ({ label: `${tx(D.ITEMS[k])} · ~${fmt(D.PAWN[k])}`, v: k })), v => doAct(Object.assign({}, a, { item: v })));
      if (A.h === 'sleep') return pickSheet(tx(A.n), '', [4, 6, 8, 10].map(h => ({ label: h + t('lf.hours'), v: h })), v => doAct(Object.assign({}, a, { hours: v })), 2);
      if (A.h === 'casino') { Sound.fx.click(); return doAct(a, true); }
    }
    if (a.type === 'quit') return C.modal({ title: t('lf.quit'), body: U.h('p', null, t('lf.quit.b')), actions: [{ label: t('lf.no'), onClick: c => c() }, { label: t('lf.quit'), primary: true, onClick: c => { c(); doAct(a); } }] });
    return doAct(a);
  }
  async function doAct(a, quick) {
    if (busy) return; busy = true;
    const t0 = W().api.now();
    const r = W().act(Object.assign({}, a, { n: undefined, ok: undefined, why: undefined }));
    const t1 = W().api.now();
    if (r.ok && !quick && t1 - t0 >= 45) await lapse(a, t0, t1);
    busy = false;
    if (!r.ok) C.toast(r.err, 'bad');
    if (C.current === 'city') render();
    events(r.events);
  }
  // time passing, shown as a clock that spins forward
  function lapse(a, t0, t1) {
    if (U.reduced) return Promise.resolve();
    const name = a.type === 'do' ? tx(D.ACTS[a.id].n) : a.type === 'work' ? t('lf.dowork', { j: tx(D.JOBS[a.job].n) }) : a.type === 'sleep' ? t('lf.rough') : t('lf.wait');
    const ov = U.h('div', { class: 'lf-lapse', html: `<div class="lf-lapse-in"><svg viewBox="0 0 100 100" class="lf-dial"><circle cx="50" cy="50" r="44"/>${[...Array(12)].map((_, i) => `<line x1="50" y1="9" x2="50" y2="15" transform="rotate(${i * 30} 50 50)"/>`).join('')}<line class="h" x1="50" y1="50" x2="50" y2="28"/><line class="m" x1="50" y1="50" x2="50" y2="16"/><circle cx="50" cy="50" r="3"/></svg><b>${esc(name)}</b><span class="lf-lapse-t"></span></div>` });
    document.body.append(ov);
    const hh = ov.querySelector('.h'), mm = ov.querySelector('.m'), tt = ov.querySelector('.lf-lapse-t');
    const dur = Math.min(1600, 500 + (t1 - t0) * 1.6), s0 = performance.now();
    return new Promise(res => {
      const step = now => {
        const k = Math.min(1, (now - s0) / dur), m = t0 + (t1 - t0) * (1 - Math.pow(1 - k, 2));
        hh.setAttribute('transform', `rotate(${(m / 2) % 360} 50 50)`); mm.setAttribute('transform', `rotate(${(m * 6) % 360} 50 50)`);
        tt.textContent = W().clock(m);
        if (k < 1) requestAnimationFrame(step); else { ov.classList.add('out'); setTimeout(() => { ov.remove(); res(); }, 260); }
      };
      requestAnimationFrame(step);
    });
  }
  function pickSheet(title, text, opts, cb, def) {
    if (!opts.length) { C.toast(t('lf.cant'), 'bad'); return; }
    C.modal({ title, body: U.h('p', null, text || ''), actions: opts.map((o, i) => ({ label: o.label, primary: i === (def || 0), onClick: c => { c(); cb(o.v); } })) });
  }
  function bankSheet() {
    const inp = U.h('input', { type: 'number', min: 0, step: 100, value: 1000, class: 'lf-input', inputmode: 'numeric' });
    const o = W().observe();
    C.modal({ title: tx(D.ACTS.bank.n), body: U.h('div', { class: 'lf-bank' }, U.h('p', null, `${t('lf.cash')} ${fmt(o.cash)} · ${t('lf.bank')} ${fmt(o.bank)}`), inp), actions: [
      { label: t('lf.withdraw'), onClick: c => { c(); doAct({ type: 'do', id: 'bank', amount: -Math.abs(+inp.value || 0) }, true); } },
      { label: t('lf.deposit'), primary: true, onClick: c => { c(); doAct({ type: 'do', id: 'bank', amount: Math.abs(+inp.value || 0) }, true); } }] });
  }

  /* ---------------- events from the world ---------------- */
  const LOUD = { msg: 'info', collector: 'bad', promo: 'good', hired: 'good', fired: 'bad', warn: 'bad', evicted: 'bad', collapse: 'bad', hungry: 'bad', tired: 'bad', urge: 'bad', debtlate: 'bad', date: 'good', news: 'info', learn: 'good', skill: 'good', attr: 'good', rentdue: 'bad', rentlate: 'bad', call: 'info', passout: 'bad' };
  const feedQ = [];
  function events(list) {
    for (const e of list || []) {
      if (!e.text) continue;
      if (LOUD[e.k]) C.toast(e.text, LOUD[e.k] === 'bad' ? 'bad' : undefined);
      feed(e);
    }
  }
  function feed(e) {
    if (!root) return;
    const f = root.querySelector('.lf-feed');
    feedQ.push(e); if (feedQ.length > 4) feedQ.shift();
    f.innerHTML = feedQ.map(x => `<p class="k-${x.k}"><small>${esc(W().clock(x.t).split(' ').pop())}</small>${esc(x.text)}</p>`).join('');
  }

  /* ---------------- clicks ---------------- */
  function onClick(e) {
    const pin = e.target.closest('.mp-pin');
    if (pin) return pickPlace(pin.dataset.place);
    const pp = e.target.closest('.mp-ppl');
    if (pp) return personSheet(pp.dataset.person);
    const b = e.target.closest('[data-x]');
    if (!b) return;
    const x = b.dataset.x, d = b.dataset;
    switch (x) {
      case 'tab': tab = d.k; Sound.fx.click(); render(); root.querySelector('.lf-body').scrollTop = 0; break;
      case 'unsel': pickPlace(sel); break;
      case 'go': travel(d.to, d.by); break;
      case 'act': run(acts[+d.i]); break;
      case 'talk': Talk.open(d.who); break;
      case 'call': Talk.open(d.who, true); break;
      case 'person': personSheet(d.who); break;
      case 'answer': { const r = W().act({ type: 'answer', id: d.id, yes: d.yes === '1' }); if (!r.ok) C.toast(r.err, 'bad'); render(); events(r.events); break; }
      case 'rent': { const r = W().act({ type: 'pay_rent' }); if (!r.ok) C.toast(r.err, 'bad'); render(); events(r.events); break; }
      case 'repay': {
        if (d.story) { if (window.Story) Story.phone(); break; }
        const r = W().act({ type: 'repay', id: d.id }); if (!r.ok) C.toast(r.err, 'bad'); render(); events(r.events); break;
      }
      case 'story-phone': if (window.Story) Story.phone(); break;
      case 'ai': if (window.Casino) document.getElementById('btn-settings').click(); break;
    }
  }

  /* ---------------- talking ---------------- */
  const Talk = {
    who: null, remote: false, el: null, last: null,
    open(who, remote) {
      this.who = who; this.remote = !!remote; this.last = null;
      Sound.fx.click();
      if (this.el) this.el.remove();
      this.el = U.h('div', { class: 'lf-talk', role: 'dialog', 'aria-modal': 'true' });
      document.body.append(this.el);
      this.el.addEventListener('click', e => this.click(e));
      this.el.addEventListener('keydown', e => { if (e.key === 'Escape') this.close(); });
      this.paint();
      requestAnimationFrame(() => this.el && this.el.classList.add('in'));
      const i = this.el.querySelector('.lf-say input'); if (i && matchMedia('(pointer:fine)').matches) i.focus();
    },
    close() { if (!this.el) return; const el = this.el; this.el = null; el.classList.remove('in'); setTimeout(() => el.remove(), 250); render(); },
    paint(waiting) {
      const id = this.who, p = W().person(id), ai = Life.ai(), chat = (W().state.P[id].chat || []).slice(-12);
      const emo = this.last ? this.last.emotion : p.mood > 65 ? 'happy' : p.mood < 30 ? 'sad' : 'neutral';
      const M = WorldMind, intents = M.INTENTS.filter(k => (!this.remote || M.REMOTE_OK.includes(k)) && (!['flirt', 'confess'].includes(k) || p.romance) && (k !== 'repay' || W().state.debts.some(x => x.who === id)) && (k !== 'number' || !p.number));
      const L = this.last;
      this.el.innerHTML = `
        <div class="lf-talk-in">
          <header><button class="lf-x" data-t="close" aria-label="${esc(t('lf.close'))}">×</button>
            <span class="lf-ai${ai.on ? ' on' : ''}"><i></i>${ai.on ? esc(t('lf.ai.on', { m: ai.model || 'AI' })) : t('lf.ai.off')}</span>
            ${this.remote ? `<span class="lf-chip">📱 ${t('lf.oncall')}</span>` : ''}</header>
          <aside class="lf-talk-who">
            <div class="lf-big emo-${emo}">${face(id, { emotion: emo })}</div>
            <h2>${esc(p.name)}</h2><p class="lf-sub">${p.age}${t('lf.age')}${p.job ? ' · ' + esc(p.job) : ''}</p>
            <p class="lf-traits">${p.traits.map(k => `<span class="lf-chip" title="${esc(tx(D.TRAITS[k].d))}">${esc(tx(D.TRAITS[k].n))}</span>`).join('')}</p>
            ${relBars(p.rel, p.romance)}
            ${p.memories.length ? `<details><summary>${t('lf.remembers')}</summary><ul class="lf-mem">${p.memories.map(m => `<li>${esc(m)}</li>`).join('')}</ul></details>` : ''}
          </aside>
          <section class="lf-chat">
            <div class="lf-log-c">${chat.map(c => `<p class="b ${c.r}">${esc(c.text)}</p>`).join('') || `<p class="lf-empty">${esc(p.bio)}</p>`}
              ${L && L.think ? `<p class="b think">💭 ${esc(L.think)}</p>` : ''}
              ${L && L.hidden ? `<p class="b think dim">💭 ${t('lf.unread')}</p>` : ''}
              ${L ? `<div class="lf-fx">${effChips(L)}</div>` : ''}
              ${waiting ? `<p class="b npc typing"><i></i><i></i><i></i></p>` : ''}</div>
            <div class="lf-intents">${intents.map(k => `<button class="lf-in" data-t="intent" data-k="${k}" ${waiting ? 'disabled' : ''}>${t('lf.in.' + k)}</button>`).join('')}</div>
            <form class="lf-say" data-t="form"><input type="text" maxlength="300" placeholder="${esc(t(ai.on ? 'lf.say.ai' : 'lf.say.script'))}" ${waiting ? 'disabled' : ''} aria-label="${esc(t('lf.say'))}"><button class="btn btn-gold" ${waiting ? 'disabled' : ''}>${t('lf.send')}</button></form>
          </section>
        </div>`;
      const lc = this.el.querySelector('.lf-log-c'); lc.scrollTop = lc.scrollHeight;
      this.el.querySelector('.lf-say').onsubmit = e => { e.preventDefault(); const v = e.target.querySelector('input').value.trim(); if (v) this.say(v); };
    },
    click(e) {
      if (e.target === this.el) return this.close();
      const b = e.target.closest('[data-t]'); if (!b) return;
      if (b.dataset.t === 'close') return this.close();
      if (b.dataset.t !== 'intent') return;
      const k = b.dataset.k, id = this.who;
      if (k === 'borrow' || k === 'lie') return pickSheet(t('lf.in.' + k), t('lf.howmuch'), [1000, 3000, 5000, 10000, 20000].map(n => ({ label: fmt(n), v: n })), v => this.say({ intent: k, amount: v }), 1);
      if (k === 'gift') {
        const it = W().state.me.items, opts = ['gift_l', 'gift_s', 'watch', 'ring', 'groceries'].filter(x => it[x] > 0).map(x => ({ label: tx(D.ITEMS[x]), v: { item: x } }));
        [500, 2000, 8000].forEach(n => { if (W().observe().cash >= n) opts.push({ label: `💵 ${fmt(n)}`, v: { cash: n } }); });
        return pickSheet(t('lf.in.gift'), t('lf.giftwhat'), opts, v => this.say({ intent: 'gift', give: v }));
      }
      if (k === 'repay') { const d = W().state.debts.find(x => x.who === id); return this.say({ intent: 'repay', amount: Math.round(d.amt), give: { cash: Math.round(d.amt) } }); }
      this.say({ intent: k });
    },
    async say(input) {
      if (busy || !this.el) return;
      busy = true;
      const id = this.who, before = W().person(id).rel;
      const chat = W().state.P[id].chat = W().state.P[id].chat || [];
      const echo = typeof input === 'string' ? input : null;
      if (echo) chat.push({ r: 'me', text: echo, t: W().api.now(), echo: 1 });
      this.paint(true);
      if (echo) chat.pop();
      let r;
      try { r = await W().talk(id, input, { remote: this.remote }); } catch (e) { r = { ok: false, err: String(e.message || e) }; }
      busy = false;
      if (!this.el) return;
      if (!r.ok) { C.toast(r.err, 'bad'); this.paint(); return; }
      r.before = before;
      this.last = r;
      if (r.emotion === 'angry') Sound.fx.lose && Sound.fx.lose(); else Sound.fx.click();
      this.paint();
      events((r.events || []).filter(e => e.k !== 'talk'));
      hud();
    }
  };
  function effChips(r) {
    const out = [];
    for (const e of r.effects || []) {
      switch (e.type) {
        case 'rel': for (const k of ['aff', 'trust', 'fam', 'love']) if (e[k]) out.push(`<span class="lf-chip ${e[k] > 0 ? 'up' : 'dn'}">${t('lf.r.' + k)} ${e[k] > 0 ? '+' : ''}${e[k]}</span>`); break;
        case 'give': out.push(`<span class="lf-chip up">💵 +${fmt(e.amount)}</span>`); break;
        case 'lend': out.push(`<span class="lf-chip up">${t('lf.fx.lend', { n: fmt(e.amount), d: e.days })}</span>`); break;
        case 'ask': out.push(`<span class="lf-chip dn">${t('lf.fx.ask', { n: fmt(e.amount) })}</span>`); break;
        case 'teach': out.push(`<span class="lf-chip xp">${t('lf.fx.teach', { s: tx(D.SKILLS[e.skill]) })}</span>`); break;
        case 'job': out.push(`<span class="lf-chip up">${t('lf.fx.job', { j: tx(D.JOBS[e.job].n) })}</span>`); break;
        case 'invite': out.push(`<span class="lf-chip up">${t('lf.fx.invite', { p: tx(D.PLACES[e.place].n), w: W().clock(e.at) })}</span>`); break;
        case 'reveal': out.push(`<span class="lf-chip xp">${t('lf.fx.reveal')}</span>`); break;
        case 'tag': out.push(`<span class="lf-chip">${t('lf.fx.tag', { k: tagLab(e.tag) })}</span>`); break;
        case 'number': out.push(`<span class="lf-chip up">📱 ${t('lf.fx.number')}</span>`); break;
        case 'leave': out.push(`<span class="lf-chip dn">${t('lf.fx.leave')}</span>`); break;
        case 'remember': out.push(`<span class="lf-chip">${t('lf.fx.remember')}</span>`); break;
      }
    }
    if (r.check) out.push(`<span class="lf-chip roll ${r.check.ok ? 'up' : 'dn'}">🎲 ${esc(tx(D.SKILLS[r.check.skill]) || r.check.skill)} ${r.check.chance}% · ${Math.round(r.check.roll)} ${r.check.ok ? '✓' : '✗'}</span>`);
    out.push(`<span class="lf-chip via">${r.via === 'model' ? t('lf.via.model') : t('lf.via.script')}</span>`);
    return out.join('');
  }

  /* ---------------- the view ---------------- */
  const game = {
    id: 'city',
    rules: () => t('lf.rules'),
    init(body) {
      root = U.h('div', { class: 'lf' });
      body.append(root);
      shell();
      Life.on(e => {
        if (e.k === 'newlife') { tab = 'map'; sel = null; feedQ.length = 0; if (C.current === 'city') render(); return; }
        if (C.current !== 'city' || busy) return;
        if (e.k === 'msg' || e.k === 'collector' || e.k === 'call') { C.toast(e.text, e.k === 'collector' ? 'bad' : undefined); feed(e); }
      });
    },
    async enter() {
      document.body.classList.add('in-city');
      if (Life.inside()) Life.onLeave();
      if (!Life.active()) {
        root.querySelector('.lf-body').innerHTML = '';
        if (window.Story && Story.opening) await Story.opening(true);
        if (!Life.active()) Life.start('fresh');
      }
      Services.setVit({ energy: Math.max(60, Services.vit().energy) });
      render();
      clearInterval(timer);
      timer = setInterval(() => {
        if (document.hidden || C.current !== 'city' || busy) return;
        if (Services.vit().energy < 30) Services.setVit({ energy: 60 });
        const h = W().observe().hour;
        if (h !== lastHour && (tab === 'map' || tab === 'phone') && !document.querySelector('.modal-ov, .lf-talk')) render(); else hud();
      }, 3000);
    },
    leave() { document.body.classList.remove('in-city'); clearInterval(timer); if (Talk.el) { Talk.el.remove(); Talk.el = null; } }
  };
  C.register(game);
  window.LifeUI = { talk: (id, remote) => Talk.open(id, remote), render, tab: k => { tab = k; render(); } };
})();
