/* Opponent brains. Every seat at a table is driven by a policy obs -> action
   (sync or async). Two kinds ship here, both speaking through the same API any
   outside agent uses:

   Brain.scripted(gameId, persona)  fast rule-based play + a persona that talks:
                                    it bluffs with words (weak hand, big talk),
                                    sandbags (monster hand, "meh"), needles you,
                                    and its betting style follows its character.
   Brain.llm(gameId, persona, cfg)  a real language model plays the seat: it reads
                                    the rules, its private view, the table chat
                                    (including what you say), decides, and talks.
                                    Falls back to the scripted brain on any error.

   cfg = { baseURL, apiKey, model } for an Anthropic-compatible /v1/messages API.
   Keys are never stored in code: the browser keeps them in this device's storage
   (Settings -> AI opponents), node reads ANTHROPIC_BASE_URL / ANTHROPIC_AUTH_TOKEN. */
(function (root) {
  const E = root.Engines || require('./core.js');
  const A = E.Agent || require('./agent.js');

  const PERSONAS = {
    hao: { av: '豪', color: '#e2574c', name: { zh: '阿豪', en: 'Hao' }, aggr: 0.75, bluff: 0.35, chatty: 0.7, honest: 0.3,
      bio: { zh: '做建材发家的暴发户，金链子，嗓门大，爱加注，输了也嘴硬。', en: 'Loud self-made building-supplies tycoon in a gold chain. Raises for fun, never admits a loss.' } },
    ling: { av: '玲', color: '#6fb7ff', name: { zh: '玲姐', en: 'Ling' }, aggr: 0.45, bluff: 0.15, chatty: 0.55, honest: 0.2,
      bio: { zh: '茶楼老板娘，精明，看人很准，说话带刺，从不白白放水。', en: 'Sharp tea-house owner who reads people well. Polite words, sharp edges, never gives anything away.' } },
    oldk: { av: 'K', color: '#35d49a', name: { zh: '老K', en: 'Old K' }, aggr: 0.35, bluff: 0.1, chatty: 0.4, honest: 0.5,
      bio: { zh: '在澳门混了三十年的老江湖，慢条斯理，爱讲赌桌老话。', en: 'Thirty years on the Macau tables. Slow, calm, full of old gambling sayings.' } },
    mei: { av: '美', color: '#f39bd0', name: { zh: '小美', en: 'Mei' }, aggr: 0.4, bluff: 0.25, chatty: 0.8, honest: 0.1,
      bio: { zh: '甜美爱笑的新手模样，其实是扮猪吃老虎的高手。', en: 'Sweet and giggly, plays the beginner. Is not a beginner.' } },
    ace: { av: '神', color: '#f6c94e', name: { zh: '赌神', en: 'Ace' }, aggr: 0.6, bluff: 0.3, chatty: 0.3, honest: 0.4,
      bio: { zh: '传说中的赌神，话少，冷，偶尔一句让人发毛。', en: 'A legend. Few words, cold stare, each sentence lands like a chip on felt.' } },
    fei: { av: '飞', color: '#b48cff', name: { zh: '大飞', en: 'Fei' }, aggr: 0.65, bluff: 0.4, chatty: 0.65, honest: 0.4,
      bio: { zh: '急性子，输两把就上头，越输越大。', en: 'Hot-headed. Two losses in a row and he is chasing.' } }
  };

  // lines by situation; {n} = an amount, {who} = a player name
  const LINES = {
    zh: {
      greet: ['来来来，今天手气好！', '老板发财～', '坐下就是缘分。', '今晚不醉不归。'],
      bluff: ['这把我稳了，劝你早点跑。', '我这牌啊……你不会想看的。', '跟？你确定？', '我从来不诈的，你信不信？', '加！牌好没办法。'],
      strongTalk: ['牌不错，你们自己掂量。', '这把我不客气了。'],
      sandbag: ['唉，这牌……随便跟跟吧。', '我就凑个热闹。', '牌一般，看看再说。', '手气差，陪你们玩玩。'],
      fold: ['不跟了，让你一把。', '先撤，留得青山在。', '这把算你的。'],
      win: ['承让承让！', '哈哈，收钱！', '我就说吧。', '运气，纯运气～'],
      bigwin: ['发了发了！', '今晚我请客！', '这就叫实力！'],
      lose: ['下把还回来。', '行，你狠。', '运气不在我这。', '不急，夜还长。'],
      tilt: ['再来！我就不信了！', '加倍！全压！', '庄家出千吧？'],
      taunt: ['怕了？', '手抖什么？', '新手吧你？', '慢慢想，不急～'],
      raise: ['加注！', '玩点大的。', '来点刺激的。'],
      call: ['跟。', '我跟。', '陪你。'],
      bomb: ['炸！', '王炸！服不服？', '吃我一炸！'],
      landlord: ['地主我当了！', '这地主我要了。'],
      alarm: ['我只剩{n}张了哦～', '报单！', '要走了要走了。'],
      pong: ['碰！', '这张我要了。'], kong: ['杠！', '杠上开花等着吧。'], hu: ['胡了！', '自摸，给钱给钱！', '和了！'],
      grab: ['庄我来坐。', '抢！'], bank: ['今天我坐庄，都来。'],
      replyBluff: ['你猜？', '诈不诈，跟了才知道。', '我像会诈的人吗？'], replyThreat: ['口气不小。', '那就看谁先手软。', '吓唬谁呢？'],
      replyNice: ['客气客气。', '大家发财！', '哈哈，你也不错。'], replyAny: ['嗯哼。', '专心打牌。', '有意思。', '你说了算～']
    },
    en: {
      greet: ['Evening, everyone. Feeling lucky tonight.', 'Deal me in.', 'Let us make this interesting.'],
      bluff: ['I would fold if I were you.', 'You do not want to see these cards.', 'Call? Really? Brave.', 'I never bluff. Ever.', 'Raise. Cannot help it, the cards love me.'],
      strongTalk: ['Decent cards. Your move.', 'Not holding back this time.'],
      sandbag: ['Meh. I will just tag along.', 'Just here for the company.', 'Rough hand. Let us see.', 'Cold deck. I will call I guess.'],
      fold: ['I am out. Take it.', 'Live to fight another hand.', 'Yours this time.'],
      win: ['Thank you, thank you.', 'Pay up!', 'Told you.', 'Pure luck. Obviously.'],
      bigwin: ['Now that is a pot!', 'Drinks are on me!', 'Skill. Just skill.'],
      lose: ['I will get it back.', 'Fine. Nice hand.', 'Cards hate me tonight.', 'Long night ahead.'],
      tilt: ['Again! I do not believe this!', 'Double it. All of it.', 'Is this deck rigged?'],
      taunt: ['Scared?', 'Hands shaking?', 'First time?', 'Take your time, sweetheart.'],
      raise: ['Raise.', 'Let us play for real.', 'Spice it up.'],
      call: ['Call.', 'I am in.', 'Right with you.'],
      bomb: ['BOMB!', 'Rocket! Bow down.', 'Eat that.'],
      landlord: ['I will be the landlord.', 'Mine.'],
      alarm: ['Only {n} cards left~', 'Last card!', 'Almost out.'],
      pong: ['Pong!', 'I will take that.'], kong: ['Kong!', 'Kong, and counting.'], hu: ['Mahjong!', 'Self-drawn, pay up!', 'That is the hand.'],
      grab: ['I will be the bank.', 'Grab!'], bank: ['Bank is open. Come at me.'],
      replyBluff: ['Guess.', 'Only one way to find out.', 'Do I look like a bluffer?'], replyThreat: ['Big words.', 'We will see who blinks.', 'Scaring someone?'],
      replyNice: ['Likewise.', 'Good luck to all.', 'Ha, not bad yourself.'], replyAny: ['Mm-hm.', 'Focus on your cards.', 'Interesting.', 'If you say so.']
    }
  };
  // each character has a voice of its own; these lines win most of the time when they exist
  const VOICE = {
    zh: {
      hao: { raise: ['钱不是问题，加！', '老子有的是钱。'], win: ['看到没，这就是气场！'], lose: ['这点小钱，洒洒水啦。'], taunt: ['兄弟，没钱就别上桌嘛。'] },
      ling: { taunt: ['小兄弟，手心出汗了吧？', '眼神飘了哦。'], sandbag: ['姐姐我随便玩玩。'], win: ['谢谢惠顾～'], replyBluff: ['你看我像缺这点钱的人？'] },
      oldk: { greet: ['小赌怡情，大赌伤身。'], fold: ['该走就走，这叫纪律。'], win: ['牌桌上，耐心值钱。'], lose: ['输赢都是常事。'], taunt: ['年轻人，沉住气。'], replyAny: ['牌桌上没有朋友。'] },
      mei: { bluff: ['哎呀我也不知道这牌大不大～', '这个……能赢吗？我跟一下嘛。'], sandbag: ['我不太会，跟着玩～', '是不是要输了呀……'], win: ['诶？我赢了？好开心！'], greet: ['我第一次玩，大家手下留情哦～'] },
      ace: { greet: ['……'], bluff: ['你的牌，我已经看到了。'], strongTalk: ['你输了。'], taunt: ['……'], win: ['意料之中。'], lose: ['……'], replyAny: ['……', '嗯。'] },
      fei: { tilt: ['再来！今天不赢回来不走！', '全压！我就不信了！'], lose: ['靠！又是这样！'], raise: ['怕个锤子，加！'] }
    },
    en: {
      hao: { raise: ['Money is no object. Raise!'], win: ['See that? That is presence.'], lose: ['Pocket change.'], taunt: ['If you cannot afford it, kid, step aside.'] },
      ling: { taunt: ['Sweaty palms, darling?', 'Your eyes just moved.'], sandbag: ['I am only here for the tea.'], win: ['Thank you for your business.'], replyBluff: ['Do I look like I need your chips?'] },
      oldk: { greet: ['Small bets for fun, big bets for regret.'], fold: ['Know when to walk. That is discipline.'], win: ['Patience pays at this table.'], lose: ['Win some, lose some.'], taunt: ['Easy, youngster.'], replyAny: ['No friends at the table.'] },
      mei: { bluff: ['Is this good? I cannot tell~', 'Um... I will just call, is that ok?'], sandbag: ['I do not really know this game hehe', 'Am I losing already?'], win: ['Wait, I won? Yay!'], greet: ['First time here, be gentle~'] },
      ace: { greet: ['...'], bluff: ['I have already seen your cards.'], strongTalk: ['You lose.'], taunt: ['...'], win: ['As expected.'], lose: ['...'], replyAny: ['...', 'Hm.'] },
      fei: { tilt: ['Again! Not leaving till I win it back!', 'All in! Come on!'], lose: ['Not again!'], raise: ['Scared of what? Raise!'] }
    }
  };
  const pick = (rng, a) => a[Math.floor(rng() * a.length)];
  function line(key, lang, rng, vars = {}, persona) {
    const own = persona && ((VOICE[lang] || VOICE.en)[persona] || {})[key];
    const bank = own && rng() < 0.65 ? own : (LINES[lang] || LINES.en)[key] || [];
    if (!bank.length) return null;
    return pick(rng, bank).replace(/\{(\w+)\}/g, (_, k) => vars[k] != null ? vars[k] : '');
  }

  /* private read of how good my position is, 0..1 (null = unknown) */
  function strengthOf(game, obs) {
    const e = E.list[game];
    try {
      if (game === 'zhajinhua') return obs.seen && obs.seen[obs.seat] && obs.hand[0] !== '??' ? e.strength(obs.hand) : null;
      if (game === 'niuniu') { const known = obs.hand.filter(c => c !== '??'); if (known.length < 4) return null; const pts = known.map(c => 'TJQK'.includes(c[0]) ? 10 : c[0] === 'A' ? 1 : +c[0]); return Math.min(1, (pts.reduce((a, b) => a + b, 0) % 10) / 10 + 0.2); }
      if (game === 'doudizhu') return obs.hand && obs.hand.length ? Math.max(0, Math.min(1, e.strength(obs.hand) / 8)) : null;
      if (game === 'mahjong') return obs.shanten != null ? Math.max(0, 1 - (obs.shanten + 1) / 6) : null;
    } catch (err) { /* unknown */ }
    return null;
  }
  const AGGRESSIVE = { raise: 1, compare: 1, bid: 1, grab: 1 };

  /* ---------- scripted brain ---------- */
  function scripted(game, personaId = 'hao', { lang = 'zh', rng = Math.random } = {}) {
    const e = E.list[game], P = PERSONAS[personaId] || PERSONAS.hao;
    const L = (key, vars) => line(key, lang, rng, vars || {}, personaId);
    let losing = 0, greeted = false;
    const policy = obs => {
      let a = e.bot(obs, rng);
      const has = t => obs.legal.find(l => l.type === t);
      const s = strengthOf(game, obs);
      // character changes play: aggressive personas raise light, tilted players chase
      if (game === 'zhajinhua' && a.type === 'call' && has('raise') && (rng() < P.aggr * 0.25 || losing >= 2 && rng() < 0.4)) a = { type: 'raise', level: has('raise').params.level.enum[0] };
      if (game === 'zhajinhua' && a.type === 'fold' && s != null && s > 0.35 && rng() < P.bluff * 0.5 && has('call')) a = { type: 'call' };
      if (game === 'niuniu' && a.type === 'bet' && losing >= 2) { const en = has('bet').params.mult.enum; a = { type: 'bet', mult: en[en.length - 1] }; }
      // talk
      let say = null;
      if (!greeted && rng() < P.chatty) { greeted = true; if (rng() < 0.5) say = L('greet'); }
      const loud = AGGRESSIVE[a.type] && !(a.type === 'grab' && a.mult === 0) && !(a.type === 'bid' && a.score < 2);
      if (!say && rng() < P.chatty * (loud ? 0.55 : 0.18)) {
        if (losing >= 3 && rng() < 0.5) say = L('tilt');
        else if (loud && s != null && s < 0.5) say = L('bluff');                         // weak, acting strong
        else if (loud && s != null && s > 0.85) say = rng() < P.honest ? L('strongTalk') : L('taunt');
        else if (a.type === 'call' && s != null && s > 0.85) say = L('sandbag');          // strong, acting weak
        else if (a.type === 'fold') say = L('fold');
        else if (a.type === 'raise') say = L('raise');
        else if (a.type === 'grab' && a.mult >= 3) say = L('grab');
        else if (a.type === 'bid' && a.score === 3) say = L('landlord');
        else if (a.type === 'pong') say = L('pong');
        else if (a.type === 'kong') say = L('kong');
        else if (a.type === 'hu') say = L('hu');
        else if (a.type === 'call') say = L('call');
      }
      if (game === 'doudizhu' && a.type === 'play') {
        const c = e.classify(a.cards);
        if (c && (c.type === 'bomb' || c.type === 'rocket') && rng() < 0.8) say = L('bomb');
        else if (obs.hand.length - a.cards.length <= 2 && obs.hand.length - a.cards.length > 0 && rng() < 0.6) say = L('alarm', { n: obs.hand.length - a.cards.length });
      }
      if (game === 'mahjong' && a.type === 'hu') say = pick(rng, (LINES[lang] || LINES.en).hu.filter((x, i) => obs.phase === 'claim' ? i !== 1 : true));
      return say ? { ...a, say } : a;
    };
    // reactions to what happened (settle results, chat aimed at the table)
    policy.react = (ev, me) => {
      if (ev.t === 'settle' && ev.seat === me) {
        if (ev.net > 0) { losing = 0; return rng() < P.chatty * 0.5 ? L(ev.net >= (ev.bet || Infinity) * 5 || ev.net >= 5000 ? 'bigwin' : 'win') : null; }
        if (ev.net < 0) { losing++; return rng() < P.chatty * 0.3 ? L(losing >= 3 ? 'tilt' : 'lose') : null; }
      }
      if (ev.t === 'say' && ev.seat === 'you' && rng() < P.chatty * 0.8) {
        const t = ev.text.toLowerCase();
        if (/诈|bluff|骗|假/.test(t)) return L('replyBluff');
        if (/跑|死|输|怕|scared|lose|fold|弄死|干/.test(t)) return L('replyThreat');
        if (/好|发财|厉害|nice|gg|good|luck|谢/.test(t)) return L('replyNice');
        return L('replyAny');
      }
      return null;
    };
    policy.persona = personaId; policy.kind = 'scripted';
    return policy;
  }

  /* ---------- LLM brain ---------- */
  function compactObs(obs) {
    const o = JSON.parse(JSON.stringify(obs));
    for (const l of o.legal || []) if (l.options && l.options.length > 25) l.options = l.options.slice(0, 25);
    delete o.hands; // others' hidden hands are all "??" anyway; my own is in `hand`
    return o;
  }
  async function callModel(cfg, system, messages, maxTokens = 400) {
    const url = cfg.baseURL.replace(/\/+$/, '') + '/v1/messages';
    const ctl = typeof AbortController !== 'undefined' ? new AbortController() : null;
    const timer = ctl && setTimeout(() => ctl.abort(), cfg.timeout || 25000);
    try {
      const res = await fetch(url, {
        method: 'POST', signal: ctl && ctl.signal,
        headers: {
          'content-type': 'application/json', 'anthropic-version': '2023-06-01',
          'x-api-key': cfg.apiKey, authorization: 'Bearer ' + cfg.apiKey,
          'anthropic-dangerous-direct-browser-access': 'true'
        },
        body: JSON.stringify({ model: cfg.model, max_tokens: maxTokens, system, messages })
      });
      if (!res.ok) throw new Error('HTTP ' + res.status + ' ' + (await res.text()).slice(0, 200));
      const j = await res.json();
      return (j.content || []).filter(c => c.type === 'text').map(c => c.text).join('');
    } finally { if (timer) clearTimeout(timer); }
  }
  const parseJSON = text => { const m = text.match(/\{[\s\S]*\}/); if (!m) throw new Error('no JSON in reply'); return JSON.parse(m[0]); };

  function llm(game, personaId, cfg, { lang = 'zh', rng = Math.random, onThought } = {}) {
    const P = PERSONAS[personaId] || PERSONAS.hao;
    const fallback = scripted(game, personaId, { lang, rng });
    const rules = A.describe(game);
    const system = [
      `You are ${P.name[lang] || P.name.en}, a player at a virtual-chip casino table (no real money). Character: ${P.bio[lang] || P.bio.en}`,
      `Game: ${rules.name.en} / ${rules.name.zh}. Rules: ${rules.rules}`,
      rules.cards ? rules.cards : '', rules.tiles ? rules.tiles : '',
      'You play to win chips. Table talk is part of the game: you may bluff, sandbag, needle, flatter or mislead other players with what you say, just like a real card shark. Never reveal your hidden cards honestly unless it helps you. Stay in character. Keep "say" short (under 25 words), in ' + (lang === 'zh' ? 'Chinese (casual, spoken)' : 'English') + ', or empty when silence is better.',
      'Each turn you get your private observation as JSON (including `legal`: the only actions you may take, with their parameter ranges, and `chat`: what people said recently, including the human player "you"). Reply with ONLY a JSON object: {"think": "<one-line private reasoning>", "action": {"type": ..., ...params}, "say": "<optional table talk>"}.'
    ].filter(Boolean).join('\n\n');
    const policy = async obs => {
      const user = 'Observation:\n' + JSON.stringify(compactObs(obs));
      let messages = [{ role: 'user', content: user }];
      for (let attempt = 0; attempt < 2; attempt++) {
        try {
          const text = await callModel(cfg, system, messages);
          const j = parseJSON(text);
          const action = j.action || {};
          const err = E.validate(action, obs.legal);
          if (err) { messages = [...messages, { role: 'assistant', content: text }, { role: 'user', content: 'Illegal: ' + err + '. Pick from legal again, JSON only.' }]; continue; }
          if (onThought && j.think) onThought(j.think);
          return j.say ? { ...action, say: String(j.say).slice(0, 160) } : action;
        } catch (err) { if (attempt === 1 || /HTTP 4/.test(err.message)) { policy.lastError = err.message; break; } }
      }
      return fallback(obs);
    };
    // replies to chat with the model, everything else scripted
    policy.react = (ev, me) => fallback.react(ev, me);
    policy.reply = async (obs, chatEvent) => {
      try {
        const text = await callModel(cfg, system, [{ role: 'user', content: 'Observation:\n' + JSON.stringify(compactObs(obs)) + `\n\n"${chatEvent.seat}" just said: "${chatEvent.text}". Answer in character, or stay silent. Reply JSON only: {"say": "..."}` }], 150);
        return parseJSON(text).say || null;
      } catch (err) { policy.lastError = err.message; return fallback.react(chatEvent, me => me); }
    };
    policy.persona = personaId; policy.kind = 'llm';
    return policy;
  }

  const Brain = { PERSONAS, LINES, VOICE, line, scripted, llm, callModel, strengthOf };
  E.Brain = Brain;
  if (typeof module !== 'undefined' && module.exports) module.exports = Brain;
})(typeof window !== 'undefined' ? window : globalThis);
