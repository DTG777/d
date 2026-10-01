/* Procedural audio: every sound is synthesized with WebAudio, no files.
   Sound.fx.<name>() plays an effect, Sound.music(on) runs the lounge loop,
   Sound.say(key) speaks a localized callout via speechSynthesis. */
(function () {
  let ctx = null, comp, sfxBus, musBus, noiseBuf, verb;
  const st = {
    sfx: LS.get('sfx', true),
    music: LS.get('music', true),
    voice: LS.get('voice', true)
  };
  const MUS_VOL = 0.26;

  function makeImpulse(c, secs, decay) {
    const len = Math.floor(c.sampleRate * secs);
    const b = c.createBuffer(2, len, c.sampleRate);
    for (let ch = 0; ch < 2; ch++) {
      const d = b.getChannelData(ch);
      for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, decay);
    }
    return b;
  }

  function ensure() {
    if (!ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return null;
      ctx = new AC();
      comp = ctx.createDynamicsCompressor();
      comp.threshold.value = -16; comp.knee.value = 12; comp.ratio.value = 5;
      comp.attack.value = 0.003; comp.release.value = 0.2;
      const master = ctx.createGain(); master.gain.value = 0.9;
      comp.connect(master); master.connect(ctx.destination);

      verb = ctx.createConvolver(); verb.buffer = makeImpulse(ctx, 2.2, 3.2);
      const verbOut = ctx.createGain(); verbOut.gain.value = 0.5;
      verb.connect(verbOut); verbOut.connect(comp);

      sfxBus = ctx.createGain(); sfxBus.gain.value = st.sfx ? 1 : 0;
      musBus = ctx.createGain(); musBus.gain.value = st.music ? MUS_VOL : 0;
      for (const [bus, send] of [[sfxBus, 0.16], [musBus, 0.3]]) {
        bus.connect(comp);
        const s = ctx.createGain(); s.gain.value = send; bus.connect(s); s.connect(verb);
      }
      const len = ctx.sampleRate * 2;
      noiseBuf = ctx.createBuffer(1, len, ctx.sampleRate);
      const d = noiseBuf.getChannelData(0);
      for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    }
    if (ctx.state === 'suspended') ctx.resume();
    return ctx;
  }

  function tone({ f = 440, f2 = null, type = 'sine', t = 0, d = 0.2, v = 0.3, a = 0.005, det = 0, bus, lp = 0 }) {
    const c = ensure(); if (!c) return;
    const t0 = c.currentTime + t;
    const o = c.createOscillator(), g = c.createGain();
    o.type = type; o.detune.value = det;
    o.frequency.setValueAtTime(f, t0);
    if (f2) o.frequency.exponentialRampToValueAtTime(Math.max(1, f2), t0 + d);
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(Math.max(0.0002, v), t0 + a);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + d);
    let last = o;
    if (lp) { const fl = c.createBiquadFilter(); fl.type = 'lowpass'; fl.frequency.value = lp; o.connect(fl); last = fl; }
    last.connect(g); g.connect(bus || sfxBus);
    o.start(t0); o.stop(t0 + d + 0.05);
  }

  function noise({ t = 0, d = 0.1, v = 0.3, type = 'bandpass', f = 2000, f2 = null, q = 1, a = 0.002, bus }) {
    const c = ensure(); if (!c) return;
    const t0 = c.currentTime + t;
    const s = c.createBufferSource(); s.buffer = noiseBuf;
    const fl = c.createBiquadFilter(); fl.type = type; fl.Q.value = q;
    fl.frequency.setValueAtTime(f, t0);
    if (f2) fl.frequency.exponentialRampToValueAtTime(f2, t0 + d);
    const g = c.createGain();
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(Math.max(0.0002, v), t0 + a);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + d);
    s.connect(fl); fl.connect(g); g.connect(bus || sfxBus);
    s.start(t0, Math.random() * 1.5); s.stop(t0 + d + 0.05);
  }

  const R = (a, b) => a + Math.random() * (b - a);
  const NOTE = n => 440 * Math.pow(2, (n - 69) / 12); // midi -> Hz

  // Continuous voices (return handles with set/stop)
  function loopNoise({ type = 'bandpass', f = 800, q = 1, v = 0.1 }) {
    const c = ensure(); if (!c) return { set() {}, stop() {} };
    const s = c.createBufferSource(); s.buffer = noiseBuf; s.loop = true;
    const fl = c.createBiquadFilter(); fl.type = type; fl.frequency.value = f; fl.Q.value = q;
    const g = c.createGain(); g.gain.value = 0.0001;
    g.gain.exponentialRampToValueAtTime(v, c.currentTime + 0.08);
    s.connect(fl); fl.connect(g); g.connect(sfxBus); s.start();
    return {
      set(freq, vol) {
        const n = c.currentTime;
        if (freq) fl.frequency.setTargetAtTime(freq, n, 0.05);
        if (vol != null) g.gain.setTargetAtTime(Math.max(0.0001, vol), n, 0.05);
      },
      stop(fade = 0.15) {
        const n = c.currentTime;
        g.gain.cancelScheduledValues(n); g.gain.setTargetAtTime(0.0001, n, fade / 3);
        s.stop(n + fade + 0.1);
      }
    };
  }

  const fx = {
    click() { tone({ f: 1100, f2: 700, type: 'triangle', d: 0.06, v: 0.12 }); },
    hover() { tone({ f: 2200, type: 'sine', d: 0.03, v: 0.025 }); },
    chip() {
      // two clay chips clacking
      noise({ f: 3600, q: 5, d: 0.04, v: 0.4 });
      tone({ f: R(2100, 2500), type: 'triangle', d: 0.05, v: 0.1 });
      noise({ t: 0.035, f: 4400, q: 6, d: 0.03, v: 0.22 });
    },
    chipsSlide() {
      for (let i = 0; i < 5; i++) noise({ t: i * 0.03, f: R(3000, 4800), q: 6, d: 0.03, v: 0.18 });
    },
    coin(p = 1) {
      const b = 1500 * p * R(0.96, 1.06);
      tone({ f: b, d: 0.22, v: 0.09 });
      tone({ f: b * 1.5, t: 0.035, d: 0.28, v: 0.07 });
      tone({ f: b * 2.76, d: 0.1, v: 0.03 });
    },
    deal() { noise({ f: 900, f2: 4200, q: 0.9, d: 0.13, v: 0.32 }); },
    flip() {
      noise({ f: 2600, q: 1.2, d: 0.05, v: 0.3 });
      tone({ f: 260, f2: 160, d: 0.07, v: 0.12 });
    },
    tick(p = 1) { tone({ f: 1700 * p, type: 'square', d: 0.018, v: 0.03, lp: 5000 }); },
    thud(p = 1) {
      tone({ f: 150 * p, f2: 45, d: 0.25, v: 0.55 });
      noise({ type: 'lowpass', f: 700, d: 0.07, v: 0.25 });
    },
    reelStop(i = 0) {
      tone({ f: 130, f2: 50, d: 0.2, v: 0.5 });
      tone({ f: 520 + i * 45, type: 'triangle', d: 0.07, v: 0.08 });
      noise({ f: 1800, q: 2, d: 0.04, v: 0.15 });
    },
    scatterLand(n = 1) {
      [0, 4, 7, 12].forEach((s, i) => tone({ f: NOTE(72 + s + n * 2), type: 'triangle', t: i * 0.05, d: 0.35, v: 0.12 }));
      tone({ f: NOTE(96 + n * 2), t: 0.1, d: 0.6, v: 0.05 });
    },
    wildExpand() {
      noise({ f: 400, f2: 6000, q: 1, d: 0.45, v: 0.25 });
      [0, 7, 12, 19].forEach((s, i) => tone({ f: NOTE(67 + s), type: 'sawtooth', t: 0.05 + i * 0.04, d: 0.4, v: 0.05, lp: 3000 }));
    },
    whoosh(up = true, d = 0.4) { noise({ f: up ? 400 : 3000, f2: up ? 3200 : 300, q: 1.1, d, v: 0.28 }); },
    win(level = 0) {
      const base = 72 + level * 2;
      [0, 4, 7, 12].forEach((s, i) => {
        tone({ f: NOTE(base + s), type: 'triangle', t: i * 0.075, d: 0.35, v: 0.14 });
        tone({ f: NOTE(base + s + 12), t: i * 0.075, d: 0.25, v: 0.04 });
      });
    },
    lose() {
      tone({ f: NOTE(62), type: 'triangle', d: 0.25, v: 0.1 });
      tone({ f: NOTE(57), type: 'triangle', t: 0.16, d: 0.4, v: 0.09 });
    },
    bust() {
      tone({ f: 220, f2: 70, type: 'sawtooth', d: 0.5, v: 0.12, lp: 900 });
      noise({ type: 'lowpass', f: 500, d: 0.3, v: 0.3 });
    },
    fanfare(level = 0) {
      // brassy stab chords: da-da-da-DAAA
      const root = 60 + level * 2;
      const hits = [[0, 0.0, 0.12], [0, 0.14, 0.12], [0, 0.28, 0.12], [5, 0.44, 0.9]];
      hits.forEach(([tr, t, d]) => {
        [0, 4, 7, 12].forEach(s => {
          tone({ f: NOTE(root + tr + s), type: 'sawtooth', t, d, v: 0.05, a: 0.02, lp: 2600 });
          tone({ f: NOTE(root + tr + s), type: 'sawtooth', t, d, v: 0.04, a: 0.02, det: 9, lp: 2600 });
        });
      });
      tone({ f: NOTE(root - 12 + 5), type: 'triangle', t: 0.44, d: 1, v: 0.2 });
      noise({ type: 'highpass', f: 6000, t: 0.44, d: 0.9, v: 0.08 });
    },
    tierUp(level = 0) {
      noise({ f: 300, f2: 8000, q: 0.8, d: 0.35, v: 0.3 });
      tone({ f: 80, f2: 40, d: 0.4, v: 0.6 });
      [0, 4, 7, 11, 14].forEach((s, i) => tone({ f: NOTE(76 + level * 3 + s), type: 'triangle', t: 0.05 + i * 0.04, d: 0.5, v: 0.1 }));
    },
    countTick(p = 0) { tone({ f: 700 + p * 1300, type: 'square', d: 0.025, v: 0.028, lp: 4000 }); },
    levelUp() {
      [0, 4, 7, 12, 16, 19, 24].forEach((s, i) => tone({ f: NOTE(67 + s), type: 'triangle', t: i * 0.06, d: 0.5, v: 0.12 }));
      noise({ type: 'highpass', f: 7000, t: 0.3, d: 1, v: 0.06 });
    },
    diceRattle(dur = 1.2) {
      let t = 0;
      while (t < dur) {
        noise({ t, f: R(1400, 4200), q: 7, d: 0.025, v: R(0.12, 0.4) });
        tone({ t, f: R(500, 1100), type: 'triangle', d: 0.03, v: 0.04 });
        t += R(0.025, 0.075);
      }
    },
    diceLand() {
      [0, 0.07, 0.12].forEach((t, i) => {
        tone({ t, f: 300 - i * 30, f2: 120, d: 0.08, v: 0.2 });
        noise({ t, f: 2500, q: 4, d: 0.03, v: 0.2 });
      });
    },
    ballClack(v = 1) {
      noise({ f: R(4500, 6500), q: 9, d: 0.018, v: 0.28 * v });
      tone({ f: R(2800, 3400), d: 0.02, v: 0.05 * v });
    },
    explosion() {
      noise({ type: 'lowpass', f: 2400, f2: 60, q: 0.7, d: 1.6, v: 0.9, a: 0.004 });
      tone({ f: 110, f2: 28, d: 0.9, v: 0.7 });
      noise({ f: 800, f2: 200, q: 2, t: 0.05, d: 0.6, v: 0.3 });
    },
    cashout() {
      noise({ f: 5000, q: 3, d: 0.06, v: 0.35 });
      tone({ f: NOTE(88), d: 0.5, v: 0.12 });
      tone({ f: NOTE(93), t: 0.08, d: 0.7, v: 0.12 });
      tone({ f: NOTE(100), t: 0.16, d: 0.8, v: 0.07 });
    },
    milestone(n = 0) {
      tone({ f: NOTE(84 + n * 2), d: 0.5, v: 0.1 });
      tone({ f: NOTE(91 + n * 2), t: 0.05, d: 0.5, v: 0.06 });
    },
    peg(row = 0) { tone({ f: NOTE(60 + row * 1.5 + R(-0.3, 0.3)), type: 'triangle', d: 0.07, v: 0.06 }); },
    bin(mult) {
      if (mult >= 1) {
        const n = Math.min(5, Math.floor(Math.log2(mult + 1)));
        for (let i = 0; i <= n; i++) tone({ f: NOTE(72 + i * 4), type: 'triangle', t: i * 0.05, d: 0.3, v: 0.1 });
      } else tone({ f: NOTE(55), type: 'triangle', d: 0.15, v: 0.08 });
    },
    heartbeat() {
      tone({ f: 60, f2: 40, d: 0.14, v: 0.6 });
      tone({ f: 55, f2: 38, t: 0.18, d: 0.16, v: 0.45 });
    },
    drumroll(dur = 1) {
      let t = 0;
      while (t < dur) { noise({ t, f: 1200, q: 0.8, d: 0.05, v: 0.06 + 0.2 * (t / dur) }); t += 0.045; }
    },
    shuffle() { for (let i = 0; i < 18; i++) noise({ t: i * 0.035, f: R(2500, 4500), q: 3, d: 0.03, v: 0.15 }); },
    wheelTick() { tone({ f: 2400, type: 'square', d: 0.012, v: 0.05, lp: 6000 }); noise({ f: 4000, q: 5, d: 0.015, v: 0.15 }); },
    error() { tone({ f: 200, type: 'square', d: 0.08, v: 0.06, lp: 1200 }); tone({ f: 160, type: 'square', t: 0.09, d: 0.12, v: 0.06, lp: 1200 }); },
    open() { noise({ f: 800, f2: 2000, q: 1, d: 0.25, v: 0.15 }); tone({ f: NOTE(79), t: 0.05, d: 0.3, v: 0.06 }); }
  };

  const loops = {
    anticipation() {
      const c = ensure(); if (!c) return { stop() {} };
      const o = c.createOscillator(); o.type = 'sawtooth';
      o.frequency.setValueAtTime(110, c.currentTime);
      o.frequency.exponentialRampToValueAtTime(440, c.currentTime + 2.5);
      const lfo = c.createOscillator(); lfo.frequency.value = 9;
      const lg = c.createGain(); lg.gain.value = 0.05;
      const fl = c.createBiquadFilter(); fl.type = 'lowpass'; fl.frequency.value = 1400; fl.Q.value = 6;
      const g = c.createGain(); g.gain.value = 0.0001; g.gain.exponentialRampToValueAtTime(0.09, c.currentTime + 0.3);
      lfo.connect(lg); lg.connect(g.gain);
      o.connect(fl); fl.connect(g); g.connect(sfxBus);
      o.start(); lfo.start();
      return { stop() { const n = c.currentTime; g.gain.cancelScheduledValues(n); g.gain.setTargetAtTime(0.0001, n, 0.05); o.stop(n + 0.3); lfo.stop(n + 0.3); } };
    },
    rocket() {
      const c = ensure(); if (!c) return { set() {}, stop() {} };
      const o = c.createOscillator(); o.type = 'sawtooth'; o.frequency.value = 55;
      const fl = c.createBiquadFilter(); fl.type = 'lowpass'; fl.frequency.value = 300;
      const g = c.createGain(); g.gain.value = 0.0001; g.gain.exponentialRampToValueAtTime(0.07, c.currentTime + 0.4);
      o.connect(fl); fl.connect(g); g.connect(sfxBus); o.start();
      const hiss = loopNoise({ type: 'bandpass', f: 1200, q: 0.6, v: 0.05 });
      return {
        set(m) {
          const n = c.currentTime, k = Math.log(m);
          o.frequency.setTargetAtTime(55 + k * 45, n, 0.1);
          fl.frequency.setTargetAtTime(300 + k * 700, n, 0.1);
          hiss.set(1200 + k * 900, 0.05 + Math.min(0.08, k * 0.03));
        },
        stop() { const n = c.currentTime; g.gain.cancelScheduledValues(n); g.gain.setTargetAtTime(0.0001, n, 0.05); o.stop(n + 0.3); hiss.stop(0.2); }
      };
    },
    whirr() { return loopNoise({ type: 'bandpass', f: 500, q: 0.7, v: 0.05 }); },
    roll() { return loopNoise({ type: 'bandpass', f: 1800, q: 1.4, v: 0.07 }); }
  };

  /* ---------- Lounge music: Ebmaj9 - Cm9 - Fm9 - Bb13, swung ---------- */
  const prog = [
    { bass: 39, chord: [55, 58, 62, 65] },   // Eb: G Bb D F
    { bass: 36, chord: [55, 58, 62, 63] },   // Cm9: G Bb D Eb
    { bass: 41, chord: [56, 60, 63, 67] },   // Fm9: Ab C Eb G
    { bass: 46, chord: [56, 60, 62, 67] }    // Bb13: Ab C D G
  ];
  const scale = [63, 65, 67, 70, 72, 75, 77, 79, 82];
  let musTimer = null, nextT = 0, step = 0, bpm = 92;

  function ep(n, t, d, v) { // electric piano-ish
    tone({ f: NOTE(n), t, d, v, bus: musBus, a: 0.01 });
    tone({ f: NOTE(n) * 2.001, t, d: d * 0.5, v: v * 0.25, bus: musBus, a: 0.005 });
  }
  function schedule() {
    const c = ctx; if (!c) return;
    const spb = 60 / bpm, eighth = spb / 2;
    while (nextT < c.currentTime + 0.25) {
      const bar = Math.floor(step / 8) % 4, e = step % 8;
      const swing = (e % 2) ? eighth * 0.33 : 0;
      const t = nextT - c.currentTime + swing;
      const ch = prog[bar];
      // bass: walk on quarter notes
      if (e % 2 === 0) {
        const walk = [0, 7, 12, 10][e / 2];
        tone({ f: NOTE(ch.bass + walk - 12), type: 'triangle', t, d: spb * 0.9, v: 0.32, bus: musBus, lp: 600 });
      }
      // comping
      if (e === 0 || e === 3 || e === 6) ch.chord.forEach(n => ep(n, t, e === 0 ? spb * 1.6 : spb * 0.7, 0.045));
      // brushes
      noise({ t, type: 'highpass', f: 7000, d: e % 2 ? 0.05 : 0.09, v: e % 4 === 2 ? 0.05 : 0.025, bus: musBus });
      // vibes melody sprinkle
      if (Math.random() < 0.22) {
        const n = scale[Math.floor(Math.random() * scale.length)];
        tone({ f: NOTE(n + 12), t, d: 0.9, v: 0.05, bus: musBus, a: 0.003 });
        tone({ f: NOTE(n + 24), t, d: 0.25, v: 0.012, bus: musBus });
      }
      nextT += eighth; step++;
    }
  }
  function startMusic() {
    if (musTimer || !st.music) return;
    const c = ensure(); if (!c) return;
    nextT = c.currentTime + 0.1; step = 0;
    musTimer = setInterval(schedule, 80);
  }
  function stopMusic() { clearInterval(musTimer); musTimer = null; }

  let duckT = null;
  function duck(secs = 3) {
    if (!ctx || !st.music) return;
    const n = ctx.currentTime;
    musBus.gain.cancelScheduledValues(n);
    musBus.gain.setTargetAtTime(MUS_VOL * 0.25, n, 0.1);
    clearTimeout(duckT);
    duckT = setTimeout(() => { if (st.music) musBus.gain.setTargetAtTime(MUS_VOL, ctx.currentTime, 0.6); }, secs * 1000);
  }

  /* ---------- Voice ---------- */
  // opts: { pitch, rate, female } gives each character at the table its own voice
  function say(text, opts = {}) {
    if (!st.voice || !window.speechSynthesis || !text) return;
    try {
      const zh = (window.I18N && I18N.lang === 'zh');
      const u = new SpeechSynthesisUtterance(text);
      u.lang = zh ? 'zh-CN' : 'en-US';
      u.rate = opts.rate || (zh ? 1.05 : 1.0); u.pitch = opts.pitch || 0.85; u.volume = 1;
      const voices = speechSynthesis.getVoices().filter(v => v.lang && v.lang.toLowerCase().startsWith(zh ? 'zh' : 'en'));
      const fem = /female|xiaoxiao|xiaoyi|tingting|meijia|samantha|victoria|karen|zira|susan/i, male = /male|daniel|yunxi|yunyang|kangkang|alex|fred|david|google/i;
      if (voices.length) u.voice = (opts.female ? voices.find(v => fem.test(v.name)) : voices.find(v => male.test(v.name) && !fem.test(v.name))) || voices[0];
      speechSynthesis.cancel();
      speechSynthesis.speak(u);
    } catch (e) { /* speech unavailable */ }
  }

  window.Sound = {
    fx: new Proxy(fx, { get: (o, k) => (...a) => { if (st.sfx && o[k]) { try { o[k](...a); } catch (e) { /* audio err */ } } } }),
    loop(name, ...a) { if (!st.sfx) return { set() {}, stop() {} }; try { return loops[name](...a); } catch (e) { return { set() {}, stop() {} }; } },
    unlock() { ensure(); if (st.music) startMusic(); },
    get state() { return { ...st }; },
    setSfx(on) { st.sfx = on; LS.set('sfx', on); if (ctx) sfxBus.gain.value = on ? 1 : 0; },
    setMusic(on) {
      st.music = on; LS.set('music', on);
      if (ctx) musBus.gain.setTargetAtTime(on ? MUS_VOL : 0, ctx.currentTime, 0.2);
      if (on) startMusic(); else setTimeout(() => { if (!st.music) stopMusic(); }, 800);
    },
    setVoice(on) { st.voice = on; LS.set('voice', on); if (!on) try { speechSynthesis.cancel(); } catch (e) { /* ignore */ } },
    duck,
    say
  };
  try { window.speechSynthesis && speechSynthesis.getVoices(); } catch (e) { /* ignore */ }
})();
