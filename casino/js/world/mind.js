/* Conversation: people answer you, and what they say can change the world.

   Mind.talk(api, who, input, { remote })   input = free text, or { intent, amount, give }
   returns { say, emotion, effects, intent, check, think?, via }

   With a model (api.llm), the person is played by the model. It sees who they are, what they
   remember about you, how they see you, the scene and what you look like right now, and it
   replies in JSON with words, a private thought and proposed effects. The world core
   (api.effects) checks every effect against hard limits before anything changes.
   Without a model, or when the call fails, the same intents resolve by skill checks and
   written lines. Free text maps to an intent by keywords. */
(function (root) {
  const L = (zh, en) => ({ zh, en });
  const INTENTS = ['chat', 'praise', 'joke', 'confide', 'rumor', 'borrow', 'repay', 'gift', 'invite', 'flirt', 'confess', 'apologize', 'lie', 'threaten', 'advice', 'job', 'teach', 'number'];
  const REMOTE_OK = ['chat', 'confide', 'rumor', 'borrow', 'repay', 'invite', 'apologize', 'advice', 'job', 'lie'];
  const KEYS = [
    ['repay', /还钱|还你|还给你|还债|repay|pay you back|pay back|your money back/i],
    ['borrow', /借|周转|loan|lend|borrow|spot me/i],
    ['gift', /送你|礼物|一点心意|gift|present for you/i],
    ['confess', /喜欢你|爱你|女朋友|男朋友|在一起|love you|be my (girl|boy)friend|go out with me|date me/i],
    ['invite', /一起|约你|请你|吃饭|看电影|喝一杯|跑步|invite|join me|let'?s|wanna|want to (go|grab)|dinner|movie/i],
    ['flirt', /漂亮|好看|可爱|帅|美女|cute|beautiful|pretty|handsome|gorgeous/i],
    ['threaten', /小心点|弄死|揍你|找人|后果|threat|or else|kill you|beat you|you'?ll regret/i],
    ['apologize', /对不起|抱歉|不好意思|我错了|sorry|apolog|my bad|forgive/i],
    ['teach', /教我|教教|指点|teach|show me how|train me/i],
    ['job', /工作|招人|上班|请人|职位|job|hire|hiring|work for you|position/i],
    ['number', /电话|微信|号码|联系方式|number|contact|whatsapp/i],
    ['rumor', /听说|八卦|消息|有什么新鲜|最近.*(出了|发生)什么|rumou?r|gossip|what'?s new|any news|heard anything/i],
    ['advice', /怎么办|建议|该不该|意见|advice|should i|what do you think i/i],
    ['confide', /心事|压力|难受|烦|累|睡不着|想不开|stressed|tired of|can'?t sleep|depressed|struggling/i],
    ['praise', /厉害|佩服|牛|了不起|好厉害|great|amazing|respect|impressive|you'?re the best/i],
    ['joke', /哈哈|笑话|讲个笑|joke|lol|haha|funny/i]
  ];
  function classify(text) {
    const s = String(text || '');
    for (const [k, re] of KEYS) if (re.test(s)) return k;
    return 'chat';
  }
  const num = text => { const m = String(text || '').replace(/,/g, '').match(/(\d+(?:\.\d+)?)\s*(万|k|千)?/i); if (!m) return 0; let n = +m[1]; if (m[2] === '万') n *= 10000; else if (m[2] && /k|千/i.test(m[2])) n *= 1000; return Math.round(n); };

  /* written lines. {me} = how they address you, {n} = an amount, {p} = a place */
  const LINES = {
    greet: [L('哟，是你啊。', 'Oh, it’s you.'), L('来了？坐。', 'Here again? Sit.'), L('今天怎么有空？', 'What brings you here?')],
    chat: { ok: [L('最近还行吧，你呢？', 'Can’t complain. You?'), L('天气热死了，街上都没人。', 'Too hot, the street is empty.'), L('哈，跟你聊天还挺舒服的。', 'Ha, you’re easy to talk to.')],
      no: [L('嗯。', 'Mm.'), L('我有点忙。', 'I’m a bit busy.'), L('……还有事吗？', '…Anything else?')] },
    praise: { ok: [L('哎呀，你嘴真甜。', 'Oh stop, you flatterer.'), L('算你有眼光。', 'At least you have taste.')], no: [L('少来这套。', 'Save it.'), L('拍马屁？说吧，想要什么。', 'Buttering me up? What do you want?')] },
    joke: { ok: [L('哈哈哈哈！你这人真逗。', 'Hahaha! You’re a riot.'), L('噗……好吧，有点好笑。', 'Pff… okay, that’s funny.')], no: [L('……这个不好笑。', '…Not funny.'), L('冷。', 'Cold.')] },
    confide: { ok: [L('谁没难的时候？说出来就好了，我听着。', 'Everyone has hard days. Say it, I’m listening.'), L('你别一个人扛着。', 'Don’t carry it alone.')], no: [L('呃……我也不知道该说什么。', 'Er… I don’t know what to say.'), L('大家都不容易。', 'Life’s hard for everyone.')] },
    rumor: { ok: [L('我跟你说，你别说是我说的……', 'Between us, don’t say you heard it from me…')], no: [L('我什么都不知道。', 'I don’t know anything.'), L('八卦？我不爱讲人是非。', 'Gossip? Not my thing.')] },
    borrow: { ok: [L('{n}？……行，就这一次，记得还。', '{n}? …Fine, just this once. Pay me back.'), L('拿去，{n}。别让我后悔。', 'Here, {n}. Don’t make me regret it.')],
      no: [L('借钱？我自己都紧。', 'Lend you money? I’m tight myself.'), L('不是我不帮你，这个口一开就没完了。', 'It’s not that I won’t help. Once that door opens it never closes.'), L('你上次的还没还呢。', 'You haven’t paid back the last one.')] },
    repay: { ok: [L('还挺准时的嘛。', 'Right on time, huh.'), L('好，钱货两清。', 'Good, we’re square.')], no: [L('你身上没钱还说什么还？', 'Talking about repaying with empty pockets?')] },
    gift: { ok: [L('给我的？哎呀，破费了。', 'For me? You shouldn’t have.'), L('有心了。', 'That’s thoughtful.')], no: [L('无事献殷勤……', 'Gifts out of nowhere…'), L('我不能收。', 'I can’t take this.')] },
    invite: { ok: [L('好啊，{p}，{t}见。', 'Sure. {p}, see you {t}.'), L('可以，别迟到。{p}，{t}。', 'Okay, don’t be late. {p}, {t}.')], no: [L('最近没空，改天吧。', 'I’m busy lately. Some other time.'), L('我们……还没那么熟吧。', 'We’re… not that close.')] },
    flirt: { ok: [L('（脸红）你乱说什么呢。', '(blushing) What are you saying.'), L('嘴这么甜，跟谁学的？', 'Where did you learn to talk like that?')], no: [L('……你认真的？', '…Are you serious?'), L('别闹了。', 'Cut it out.')] },
    confess: { ok: [L('……我也是。笨蛋，怎么现在才说。', '…Me too. Idiot, why only now?')], no: [L('对不起，我只把你当朋友。', 'I’m sorry. I see you as a friend.'), L('我现在不想谈这些。', 'I don’t want to talk about this now.')] },
    apologize: { ok: [L('算了，这次原谅你。', 'Fine. Forgiven, this time.'), L('知道错就好。', 'As long as you know.')], no: [L('一句对不起就完了？', 'You think sorry fixes it?')] },
    lie: { ok: [L('真的假的？……唉，你也不容易。', 'Really? …Poor you.'), L('原来是这样。', 'So that’s what happened.')], no: [L('你骗鬼呢？', 'Who are you trying to fool?'), L('这话你自己信吗？', 'Do you even believe that?')] },
    threaten: { ok: [L('好……好，有话好说。', 'Okay… okay, let’s talk calmly.')], no: [L('你吓唬谁呢？', 'Who are you trying to scare?'), L('信不信我现在就报警。', 'One more word and I call the police.')] },
    advice: { ok: [L('听我一句：{a}', 'Take it from me: {a}')], no: [L('你的事你自己拿主意。', 'Your life, your call.')] },
    job: { ok: [L('行，你明天来上班。', 'Fine. Start tomorrow.')], no: [L('我这里不缺人。', 'We’re not hiring.'), L('你的条件还差点。', 'You’re not quite there yet.')] },
    teach: { ok: [L('看好了，我只说一遍。', 'Watch closely, I’ll only show you once.')], no: [L('这个教不了，得自己悟。', 'Can’t be taught, you have to get it yourself.'), L('我们没那么熟。', 'We’re not that close.')] },
    number: { ok: [L('存一下吧，有事打给我。', 'Save it. Call if you need anything.')], no: [L('电话就不用了吧。', 'Let’s skip the numbers.')] },
    remote: [L('这事电话里说不清，当面聊吧。', 'Can’t do this over the phone. Let’s meet.')],
    busy: [L('我真的要走了。', 'I really have to go.')]
  };
  const ADVICE = {
    lin: L('赌瘾不是意志力问题，是习惯。把钱交给信得过的人，每周来见我一次。', 'Gambling is a habit, not a lack of will. Give your money to someone you trust and come see me weekly.'),
    chenbo: L('赌桌上没有贵人。你的贵人在你身边。', 'There are no helpers at the table. Yours are beside you.'),
    oldk: L('赢了先走，输了更要走。我年轻时就是不懂这个。', 'Leave when you win, leave faster when you lose. I never learned that young.'),
    dao: L('只打正期望的局。赌场里几乎没有。', 'Only play positive-expectation games. The casino has almost none.'),
    mom: L('好好吃饭，好好睡觉，别跟人借钱。', 'Eat properly, sleep properly, don’t borrow money.'),
    bao: L('钱放在银行，不要放口袋。口袋里的钱会自己跑。', 'Keep money in the bank, not your pocket. Pocket money walks.'),
    liu: L('学点硬本事，编程也好，生意也好。', 'Learn a real skill: code, business, anything.'),
    yu: L('早点睡，少喝酒。还有，别去那种地方。', 'Sleep early, drink less, and stay out of that place.'),
    jimmy: L('别在酒吧做决定，更别在赌场。', 'Never decide anything in a bar, and never in a casino.'),
    _: L('慢慢来，别急。', 'Take it slow. No rush.')
  };
  const THINK = {
    shrewd: [L('他到底想要什么？', 'What does this one really want?')], stingy: [L('别是来借钱的吧。', 'Please don’t ask for money.')],
    warm: [L('这孩子其实不坏。', 'Not a bad kid, really.')], proud: [L('总算有人懂得尊重我。', 'Finally someone shows some respect.')],
    gambler: [L('今晚要不要去翻本……', 'Maybe I can win it back tonight…')], romantic: [L('他笑起来还挺好看的。', 'Nice smile, actually.')],
    cautious: [L('再观察一下。', 'Wait and see.')], naive: [L('他人真好。', 'So nice.')], grudge: [L('上次的事我还记着。', 'I haven’t forgotten last time.')],
    _: [L('嗯……', 'Hmm…')]
  };

  const pickL = (api, arr) => api.tx(arr[Math.floor(api.rng() * arr.length)]);
  const fill = (s, p) => { for (const k in p || {}) s = s.split('{' + k + '}').join(p[k]); return s; };

  /* ---------------- scripted resolution ---------------- */
  function scripted(api, who, intent, input, ctx) {
    const D = api.D, P = D.PEOPLE[who], r = api.rel(who, 'me'), has = t => api.has(who, t), S = api.S;
    const out = { effects: [], emotion: 'neutral' };
    const said = (S.P[who].chat || []).filter(x => x.r === 'npc').slice(-3).map(x => x.text);
    const line = (k, ok, p) => {                 // don't say the same thing twice in a row
      const pool = LINES[k][ok ? 'ok' : 'no'];
      let out = fill(pickL(api, pool), p);
      for (let i = 0; i < 4 && said.includes(out) && pool.length > 1; i++) out = fill(pickL(api, pool), p);
      return out;
    };
    const relMod = r.aff / 4 + r.trust / 6;
    let c = null, fx = [];
    const roll = (skill, attr, base, mod = 0) => (c = api.check(skill, attr, { base, mod }));
    switch (intent) {
      case 'chat':
        roll('talk', 'charm', 55, relMod);
        fx = c.ok ? [{ type: 'rel', aff: 2 }] : [{ type: 'rel', aff: -1 }];
        out.say = c.ok && r.fam < 10 ? pickL(api, LINES.greet) + ' ' + line('chat', true) : line('chat', c.ok);
        break;
      case 'praise':
        roll('talk', 'charm', 45, relMod + (has('proud') ? 20 : 0) - (has('shrewd') ? 15 : 0));
        fx = [{ type: 'rel', aff: c.ok ? (has('proud') ? 5 : 3) : -2 }];
        out.say = line('praise', c.ok);
        break;
      case 'joke':
        roll('talk', 'charm', 40, relMod + (has('warm') ? 10 : 0));
        fx = [{ type: 'rel', aff: c.ok ? 4 : -2 }];
        out.say = line('joke', c.ok);
        break;
      case 'confide': {
        roll('talk', 'will', 35, relMod + (has('warm') ? 20 : 0) + (has('loyal') ? 15 : 0));
        fx = c.ok ? [{ type: 'rel', trust: 4, aff: 3 }, { type: 'remember', text: api.tx(L('{me}跟我说了心事。', '{me} opened up to me.')).replace('{me}', api.name('me')), w: 2 }] : [{ type: 'rel', aff: -1 }];
        if (c.ok) api.S.me.st.stress = Math.max(0, api.S.me.st.stress - 8);
        if (c.ok && r.trust >= 45) fx.push({ type: 'reveal', secret: true });
        out.say = line('confide', c.ok);
        break;
      }
      case 'rumor': {
        roll('read', 'charm', 30, relMod);
        const ties = D.TIES.filter(t => t[0] === who || t[1] === who).map(t => (t[0] === who ? t[1] : t[0]));
        const pool = ties.filter(id => D.SECRETS[id] && !S.intel.some(x => x.text === api.tx(D.SECRETS[id])));
        if (c.ok && pool.length && r.trust >= 25) {
          const id = pool[Math.floor(api.rng() * pool.length)];
          out.say = line('rumor', true) + api.tx(D.SECRETS[id]);
          S.intel.push({ who: id, text: api.tx(D.SECRETS[id]), day: api.day(), via: who });
          fx = [{ type: 'rel', fam: 1 }];
        } else out.say = line('rumor', false);
        break;
      }
      case 'borrow': {
        const want = Math.max(100, input.amount || 1000);
        roll('talk', 'charm', 30, relMod + (has('loyal') ? 25 : 0) + (has('naive') ? 15 : 0) - (has('stingy') ? 30 : 0) - (has('cautious') ? 10 : 0) + (api.today(who).sob ? 15 : 0));
        if (who === 'scar') c.ok = true;
        const got = c.ok ? api.effects(who, [{ type: 'lend', amount: want, days: who === 'scar' ? 7 : 7 }]) : [];
        const lent = got.find(e => e.type === 'lend');
        out.applied = got;
        fx = lent ? [] : [{ type: 'rel', aff: -2 }];
        out.say = lent ? line('borrow', true, { n: api.fmt(lent.amount) }) : line('borrow', false);
        out.emotion = lent ? 'reluctant' : 'cold';
        break;
      }
      case 'repay': {
        const d = S.debts.find(x => x.who === who);
        if (!d) { out.say = api.tx(L('你不欠我钱啊。', 'You don’t owe me anything.')); break; }
        const n = Math.min(Math.round(d.amt), input.amount || Math.round(d.amt));
        const h = input.handed || api.hand(who, { cash: n });
        out.say = h && h.repaid ? line('repay', true) : line('repay', false);
        out.emotion = h && h.repaid ? 'happy' : 'cold';
        break;
      }
      case 'gift': {
        const item = (input.give && input.give.item) || (S.me.items.gift_l > 0 ? 'gift_l' : S.me.items.gift_s > 0 ? 'gift_s' : null);
        const h = input.handed ? input.handed : item ? api.hand(who, { item }) : input.give && input.give.cash ? api.hand(who, { cash: input.give.cash }) : null;
        const ok = h && !h.err && !(has('cautious') && r.fam < 10);
        out.say = ok ? line('gift', true) : h && h.err ? api.tx(L('（你手上没有礼物）', '(You have nothing to give.)')) : line('gift', false);
        out.emotion = ok ? 'happy' : 'neutral';
        break;
      }
      case 'invite': {
        roll('talk', 'charm', 30, relMod + (has('warm') ? 10 : 0) - (has('cautious') ? 10 : 0));
        const place = P.romance ? (api.rng() < 0.5 ? 'mall' : 'park') : (['teahouse', 'bar', 'park'])[Math.floor(api.rng() * 3)];
        const hour = place === 'park' ? 19 : place === 'bar' ? 21 : place === 'mall' ? 19 : 12;
        const got = c.ok ? api.effects(who, [{ type: 'invite', place, hour, day: 1, what: api.tx(D.PLACES[place].n) }]) : [];
        const inv = got.find(e => e.type === 'invite');
        out.applied = got;
        out.say = inv ? line('invite', true, { p: api.tx(D.PLACES[place].n), t: api.clock(inv.at) }) : line('invite', false);
        out.emotion = inv ? 'warm' : 'neutral';
        break;
      }
      case 'flirt': {
        if (!P.romance) { out.say = api.tx(L('……你在跟我开玩笑吧？', '…You’re joking, right?')); fx = [{ type: 'rel', aff: -1 }]; out.emotion = 'awkward'; break; }
        roll('talk', 'charm', 25, r.aff / 3 + r.love / 3 + (has('romantic') ? 15 : 0) - (has('cautious') ? 10 : 0));
        fx = c.ok ? [{ type: 'rel', love: 4, aff: 2 }] : [{ type: 'rel', aff: has('cautious') ? -4 : -2 }];
        out.say = line('flirt', c.ok); out.emotion = c.ok ? 'shy' : 'cold';
        break;
      }
      case 'confess': {
        const ready = P.romance && r.love >= 60 && r.aff >= 55 && r.trust >= 40;
        roll('talk', 'charm', ready ? 60 : 5, 0);
        if (ready && c.ok) fx = [{ type: 'tag', tag: 'partner' }, { type: 'rel', love: 5, aff: 5 }, { type: 'remember', text: api.tx(L('{me}向我表白了，我答应了。', '{me} told me how they feel. I said yes.')).replace('{me}', api.name('me')), w: 3 }];
        else fx = [{ type: 'rel', aff: -4, love: -3 }];
        out.say = line('confess', ready && c.ok); out.emotion = ready && c.ok ? 'tender' : 'sad';
        break;
      }
      case 'apologize': {
        roll('talk', 'will', 40, (has('grudge') ? -25 : 0) + (has('warm') ? 20 : 0) + (r.aff < 0 ? 10 : -10));
        fx = c.ok ? [{ type: 'rel', aff: r.aff < 0 ? 6 : 1, trust: 2 }] : [{ type: 'rel', aff: -1 }];
        out.say = line('apologize', c.ok);
        break;
      }
      case 'lie': {
        const sharp = ((P.skills || {}).read || 30) / 2 + (has('shrewd') ? 20 : 0) - (has('naive') ? 25 : 0);
        roll('lie', 'charm', 55, -sharp);
        if (c.ok) { fx = [{ type: 'rel', aff: 3 }]; api.today(who).sob = 1; }
        else { fx = [{ type: 'rel', trust: -6, aff: -5 }, { type: 'remember', text: api.tx(L('{me}对我撒谎，被我看穿了。', '{me} lied to me and I caught it.')).replace('{me}', api.name('me')), w: 3 }]; api.news('lie', { w: who }, { aff: -3, trust: -8, also: [who] }); }
        out.say = line('lie', c.ok); out.emotion = c.ok ? 'sympathetic' : 'angry';
        break;
      }
      case 'threaten': {
        roll('read', 'body', 20, -(((P.attrs || {}).body || 5) - 5) * 8 - (who === 'scar' ? 100 : 0) + (has('naive') ? 15 : 0));
        fx = [{ type: 'rel', aff: -8, trust: -6 }];
        if (r.aff <= -22) fx.push({ type: 'tag', tag: 'rival' });
        api.news('threat', { w: who }, { aff: -5, trust: -5, also: [who] });
        if (c.ok && S.debts.some(x => x.who === who)) { const d = S.debts.find(x => x.who === who); d.due += 3; }
        out.say = line('threaten', c.ok); out.emotion = c.ok ? 'scared' : 'angry';
        if (!c.ok && (who === 'scar' || ((P.attrs || {}).body || 5) >= 7)) { S.me.st.health = Math.max(1, S.me.st.health - 15); fx.push({ type: 'leave' }); }
        break;
      }
      case 'advice': {
        const a = api.tx(ADVICE[who] || ADVICE._);
        out.say = line('advice', true, { a }); fx = [{ type: 'rel', aff: 1 }];
        if (who === 'lin') S.me.st.urge = Math.max(0, S.me.st.urge - 5);
        break;
      }
      case 'job': {
        const jobs = Object.keys(D.JOBS).filter(j => D.JOBS[j].boss === who);
        const got = jobs.length ? api.effects(who, jobs.map(j => ({ type: 'job', job: j })).slice(-1).concat(jobs.length > 1 ? [{ type: 'job', job: jobs[0] }] : [])) : [];
        out.applied = got;
        out.say = got.some(e => e.type === 'job') ? line('job', true) : line('job', false);
        break;
      }
      case 'teach': {
        const sk = Object.entries(P.skills || {}).sort((a, b) => b[1] - a[1]).map(x => x[0]).find(k => P.skills[k] >= (S.me.skills[k] || 0) + 10);
        const got = sk ? api.effects(who, [{ type: 'teach', skill: sk, amount: 3 }]) : [];
        out.applied = got;
        out.say = got.length ? line('teach', true) : line('teach', false);
        break;
      }
      case 'number': {
        const got = api.effects(who, [{ type: 'number' }]);
        out.applied = got; out.say = line('number', got.length > 0 || api.contacts().includes(who));
        break;
      }
      default: out.say = line('chat', true);
    }
    if (ctx.remote && !REMOTE_OK.includes(intent)) { out.say = pickL(api, LINES.remote); fx = []; c = null; }
    const traitList = (P.traits || []).filter(t => THINK[t]);
    out.think = pickL(api, THINK[traitList.length ? traitList[Math.floor(api.rng() * traitList.length)] : '_']);
    out.proposed = fx; out.check = c;
    return out;
  }

  /* ---------------- the model plays the person ---------------- */
  function system(api, who, ctx) {
    const D = api.D, P = D.PEOPLE[who], S = api.S, r = api.relView(who), st = S.P[who], lang = api.lang();
    const me = S.me.st, debt = S.debts.find(x => x.who === who), lent = S.lent.find(x => x.who === who && !x.done);
    const look = [me.energy < 25 && 'exhausted', me.drunk > 40 && 'drunk', me.stress > 65 && 'visibly stressed', me.full < 15 && 'hungry', me.health < 40 && 'looks ill', me.urge > 75 && 'restless, keeps checking the time'].filter(Boolean);
    const job = S.job ? api.tx(D.JOBS[S.job.id].n) : 'no job';
    const bossOf = Object.keys(D.JOBS).filter(j => D.JOBS[j].boss === who);
    const skills = Object.entries(P.skills || {}).filter(([, v]) => v >= 40).map(([k, v]) => `${k} ${v}`).join(', ') || 'none in particular';
    return [
      `You are ${api.tx(P.n)} (${P.age}, ${P.sex === 'f' ? 'woman' : 'man'}) in Gilded City (金城), a life-simulation world with a casino on the Neon Strip. Everything is fictional and money is virtual chips.`,
      `Who you are: ${api.tx(P.bio)} Traits: ${(P.traits || []).map(t => t + ' (' + D.TRAITS[t].d.en + ')').join('; ')}.`,
      `Your mood now: ${st.mood}/100. Money you have: about ${Math.round(st.cash)}.`,
      `How you see the player: affinity ${r.aff} (-100..100), trust ${r.trust}/100, familiarity ${r.fam}/100${P.romance ? `, romantic interest ${r.love}/100` : ''}. Tags: ${r.tags.join(', ') || 'none'}.`,
      `What you remember about the player: ${st.mem.slice(-10).map(m => '- ' + m.text).join(' ') || 'nothing yet.'}`,
      D.SECRETS[who] ? `Your secret (only share it if trust is 45+ and it feels natural; then add {"type":"reveal","secret":true}): ${D.SECRETS[who].en}` : '',
      `Scene: ${ctx.remote ? 'a phone call' : api.tx(D.PLACES[S.at].n) + ', face to face'}, ${api.clock()}.`,
      `The player: works as ${job}; ${look.length ? 'right now: ' + look.join(', ') : 'looks normal'}.${debt ? ` They owe you ${Math.round(debt.amt)}${debt.due < api.day() ? ', overdue' : ''}.` : ''}${lent ? ` You owe them ${lent.amt}.` : ''}`,
      ctx.handed ? `Just now the player handed you: ${JSON.stringify(ctx.handed)}.` : '',
      `Recent conversation with them: ${(st.chat || []).slice(-8).map(c => (c.r === 'me' ? 'Player: ' : 'You: ') + c.text).join(' | ') || 'none.'}`,
      '',
      `Reply with JSON only, no prose around it:`,
      `{"say": "what you say out loud, in ${lang === 'zh' ? 'Chinese (Cantonese flavour welcome), under 60 characters' : 'English, under 35 words'}", "think": "what you really think, one short line", "emotion": "warm|happy|neutral|shy|nervous|sad|cold|angry|scared", "effects": []}`,
      `Effects you may propose (the world enforces limits; anything else is ignored):`,
      `{"type":"rel","aff":-8..8,"trust":-6..6${P.romance ? ',"love":-5..5' : ''}}  how this exchange changes how you see them`,
      `{"type":"lend","amount":n,"days":3-30}  only if you would really lend it`,
      `{"type":"give","amount":n}  a gift of money, rare`,
      `{"type":"ask","amount":n,"text":"..."}  ask THEM for money or a favour`,
      `{"type":"teach","skill":"<${Object.keys(D.SKILLS).join('|')}>"}  you are good at: ${skills}`,
      bossOf.length ? `{"type":"job","job":"<${bossOf.join('|')}>"}  you can hire for these` : '',
      `{"type":"invite","place":"<${Object.keys(D.PLACES).join('|')}>","hour":0-23,"day":0-3,"what":"..."}  make a plan to meet`,
      `{"type":"remember","text":"..."}  something worth remembering about them`,
      `{"type":"reveal","text":"..."}  tell them something true you know about the city or people`,
      `{"type":"number"}  give your phone number    {"type":"tag","tag":"partner|rival|ex"}    {"type":"leave"}  end the conversation`,
      `Be a real person, not a helper: you can refuse, lie, get annoyed, tease, ask for things, or change the subject. Money is precious to you. Small talk moves affinity by 1-3, not more. If the player is rude, react.`
    ].filter(Boolean).join('\n');
  }
  function parse(text) {
    const m = String(text || '').match(/\{[\s\S]*\}/);
    if (!m) throw new Error('no JSON');
    const j = JSON.parse(m[0]);
    if (!j.say) throw new Error('no say');
    return j;
  }

  async function talk(api, who, input, ctx = {}) {
    const S = api.S, ps = S.P[who];
    const text = typeof input === 'string' ? input.slice(0, 300) : null;
    const o = typeof input === 'object' && input ? input : {};
    let intent = text != null ? classify(text) : (INTENTS.includes(o.intent) ? o.intent : 'chat');
    const amount = o.amount || (text ? num(text) : 0);
    ps.chat = ps.chat || [];
    const said = text != null ? text : api.tx(INTENT_SAY[intent] || INTENT_SAY.chat).replace('{n}', amount ? api.fmt(amount) : '');
    ps.chat.push({ r: 'me', text: said, t: api.now() });
    let handed = null;
    if (o.give && api.llm) handed = api.hand(who, o.give);
    let res = null;
    if (api.llm) {
      try {
        const sys = system(api, who, Object.assign({}, ctx, { handed }));
        const reply = await api.llm(sys, [{ role: 'user', content: (text != null ? text : `(${intent}${amount ? ' ' + amount : ''}) ${said}`) }]);
        const j = parse(reply);
        const effects = api.effects(who, j.effects);
        res = { say: String(j.say).slice(0, 240), think: String(j.think || '').slice(0, 200), emotion: String(j.emotion || 'neutral').slice(0, 16), effects, intent, via: 'model' };
      } catch (e) { res = null; api.S.flags.llmErr = String(e.message || e).slice(0, 120); }
    }
    if (!res) {
      const s = scripted(api, who, intent, Object.assign({}, o, { amount, handed }), ctx);   // the model failed after the gift changed hands: don't hand it twice
      const effects = (s.applied || []).concat(api.effects(who, s.proposed));
      res = { say: s.say, think: s.think, emotion: s.emotion, effects, intent, check: s.check, via: 'script' };
    }
    ps.chat.push({ r: 'npc', text: res.say, t: api.now() });
    if (ps.chat.length > 16) ps.chat.splice(0, ps.chat.length - 16);
    // you see what they really think only if you read people well, or they trust you completely
    const r = api.rel(who, 'me');
    const see = r.trust >= 75 || api.check('read', 'mind', { base: 5 }).ok;
    if (!see) { res.hidden = true; delete res.think; }
    api.emit('talk', res.say, { who, emotion: res.emotion, via: res.via });
    return res;
  }
  const INTENT_SAY = {
    chat: L('聊两句？', 'Got a minute?'), praise: L('你真有本事。', 'You’re really something.'), joke: L('给你讲个笑话……', 'Heard this one?…'),
    confide: L('最近压力好大……', 'I’ve been under a lot of pressure…'), rumor: L('最近有什么消息吗？', 'Heard anything lately?'),
    borrow: L('能借我{n}吗？', 'Could you lend me {n}?'), repay: L('钱还你。', 'Here’s your money.'), gift: L('一点心意。', 'Something for you.'),
    invite: L('改天一起出去？', 'Want to hang out sometime?'), flirt: L('你今天很好看。', 'You look great today.'), confess: L('我喜欢你。', 'I like you.'),
    apologize: L('之前的事，对不起。', 'I’m sorry about before.'), lie: L('我妈住院了，急需用钱……', 'My mum is in hospital, I need money fast…'),
    threaten: L('你最好识相点。', 'You’d better be smart about this.'), advice: L('你说我该怎么办？', 'What should I do?'),
    job: L('你那里招人吗？', 'Are you hiring?'), teach: L('教我两手？', 'Teach me something?'), number: L('留个电话？', 'Can I get your number?')
  };

  const Mind = { talk, classify, scripted, system, INTENTS, REMOTE_OK, INTENT_SAY, LINES };
  root.WorldMind = Mind;
  if (typeof module !== 'undefined' && module.exports) module.exports = Mind;
})(typeof window !== 'undefined' ? window : globalThis);
