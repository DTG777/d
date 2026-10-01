/* window.Life: the world bound to the casino.
   One clock (the casino clock), one wallet (cash is the chip balance), one bank and one set of
   story loans. The casino is a building in the city: walking in hands your energy to the floor,
   walking out hands back the night's result. */
(function () {
  const t = (k, p) => I18N.t(k, p);
  const IN = 'life_in';
  const listeners = [];

  const W = World.create({
    time: () => Services.time(),
    advance: m => Services.advance(m),
    cash: {
      get: () => C.S.balance,
      add: n => {
        n = Math.round(n);
        if (n > 0) C.pay(n, null, false);
        else if (n < 0 && C.S.balance >= -n) C.spend(-n, null, true);
        else if (n < 0) { C.S.balance = 0; C.save(); C.paintAll(); }   // the world already checked; never pop the out-of-chips sheet
      }
    },
    bank: { get: () => (window.Story && Story.bank ? Story.bank.get() : 0), add: n => window.Story && Story.bank && Story.bank.add(n) },
    loans: () => { const s = window.Story && Story.state && Story.state(); return s ? s.loans.map(l => ({ id: l.id, who: l.src, owed: l.owed, late: l.late })) : []; },
    lang: () => I18N.lang,
    llm: (system, messages) => Brain.callModel(Casino.ai.get(), system, messages, 500),
    llmOn: () => !!(window.Casino && Casino.ai && Casino.ai.on()),
    save: s => LS.set('life', s),
    notify: ev => listeners.forEach(f => { try { f(ev); } catch (e) { /* a screen's problem */ } }),
    casino: () => enterCasino()
  });

  const inside = () => LS.get(IN, null);

  function enterCasino() {
    const s = W.state.me.st;
    LS.set(IN, { t0: Services.time(), at: Date.now() });
    Services.setVit({ energy: Math.max(8, s.energy), drunk: s.drunk });
    Services.startNight();
    setTimeout(() => C.go('lobby'), 0);
  }
  // called by the casino's door, or by the city when you came back some other way
  function onLeave(o = {}) {
    const k = inside();
    LS.set(IN, null);
    if (!W.started) { C.go('city'); return; }
    const n = o.net != null ? o.net : Services.night().net;
    const v = o.energy != null ? o : Services.vit();
    const min = k ? Math.max(5, Services.time() - k.t0) : 30;
    W.sync();
    W.setStatus({ energy: v.energy, drunk: v.drunk });
    if (k || n) W.gambled({ min, net: n });
    W.setAt('casino');
    Services.startNight();
    if (C.current !== 'city') C.go('city');
  }

  function start(op) {
    // a new life starts in the morning
    const m = ((Services.time() % 1440) + 1440) % 1440;
    const d = (480 - m + 1440) % 1440;
    if (d) Services.advance(d);
    LS.set(IN, null);
    W.start(op || 'fresh');
    Services.setVit({ energy: 100, drunk: 0 });
    listeners.forEach(f => f({ k: 'newlife', text: '' }));
  }
  addEventListener('story:new', e => start(e.detail && e.detail.op));

  // pick up where you left off
  (function boot() {
    const s = LS.get('life', null);
    if (s && W.load(s)) return;
    if (window.Story && Story.run) W.start(Story.run);
  })();

  window.Life = {
    world: W,
    active: () => W.started,
    inside: () => !!inside(),
    start, enterCasino, onLeave,
    on(f) { listeners.push(f); },
    // the same calls the screen uses, for agents in the page
    observe: () => W.observe(), legal: o => W.legal(o), act: a => W.act(a), talk: (who, x, o) => W.talk(who, x, o),
    person: id => W.person(id), people: here => W.people(here), relations: () => W.relations(), map: () => W.map(),
    log: n => W.log(n), tools: () => W.tools(), call: (n, i) => W.call(n, i),
    ai: () => ({ on: !!(window.Casino && Casino.ai.on()), model: window.Casino ? Casino.ai.get().model : null }),
    t
  };
})();
