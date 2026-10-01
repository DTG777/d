# Agent API · AI 接口

Every game in 金玉满堂 is a pure, DOM-free engine. The animated tables, the headless simulators and AI agents all go through the same few calls, so an agent sees the same rules as the screen does.

所有游戏都是纯逻辑引擎，画面、模拟器和 AI 走同一套接口：看局面、选合法动作、执行、读事件。AI 对手的意义不在于“会打牌”（脚本就能打），而在于**会说话**：吹牛、诈唬、装弱、回嘴，像真人牌友一样。

All chips are virtual. No real money exists anywhere in this project.

---

## 1. The loop

```
observe(seat)  ->  { balance, your cards, public table, toAct, players, chat, legal: ActionSpec[] }
act(seat, a)   ->  { ok, events, done }        or { ok:false, error, obs }
```

- `legal` is the whole truth about what may be done right now. Pick one entry and fill in its params.
- Hidden information never leaks. `observe` shows other seats' cards as `"??"`, and private events (your deal) carry `to: seat`.
- Any action may carry `say`: words spoken aloud while acting. Words are free and may be lies.

### ActionSpec

```js
{ type: 'raise', desc: 'raise to a higher stake level', params: { level: { int: true, min: 2, max: 5 } } }
```

| ParamSpec | meaning |
|---|---|
| `{ enum: [...] }` | one of these values |
| `{ int: true, min, max }` / `{ num: true, min, max }` | a number in range |
| `{ bools: n }` | array of n booleans (e.g. video poker holds) |
| `{ cards: true }` + `options` | card codes from your hand; `options` lists playable combinations |
| `{ tiles: true }` | mahjong tile codes |
| `default` | the param may be omitted |

`Engines.Agent.actionSchema(spec)` turns any spec (or the whole `legal` list) into JSON Schema.

### Codes

- **Cards:** rank `A23456789TJQK` + suit `SHDC`, so `"TH"` is the ten of hearts. `"??"` means face down. Jokers are `"BJ"` (small) and `"RJ"` (big).
- **Mahjong tiles:** `1m..9m` characters, `1s..9s` bamboo, `1p..9p` dots.
- `describe(id).events` explains every event type.

---

## 2. Headless (node or browser, no DOM)

```js
const E = require('./js/engine/core.js');
['agent','cards','tables','slots','instant','fortune7-math','ddz','zjh','mahjong','brain']
  .forEach(f => require('./js/engine/' + f + '.js'));

// solo: you vs the house bots
const s = new E.Session('blackjack', { balance: 10000, seed: 'demo' });
s.observe();                 // { phase:'bet', hands, dealer, legal: [{ type:'deal', params:{ bet:{int,min,max} } }] }
s.act({ type: 'deal', bet: 100 });   // -> { ok, events, done, obs }

// any seating: every seat with a policy (obs -> action) plays itself
const t = new E.Table('zhajinhua', { seed: 'x', seats: [
  { id: 'me' },                                            // driven from outside with t.act('me', ...)
  { id: 'p1', policy: E.Brain.scripted('zhajinhua', 'hao') },
  { id: 'p2', policy: 'bot' }
]});
t.act('me', { type: 'start', ante: 10 });            // 'me' deals; returns events
t.autoplay();                // plays policy seats until 'me' must act (sync policies only)
t.act('me', { type: 'call', say: '我跟，你吓不到我。' });
t.say('me', '你是不是在诈？');  // talk without acting
```

Same seed means the same shuffle, on any machine.

---

## 3. In the browser: `window.Casino`

The live casino exposes one object. The on-screen player is seat `"you"`.

| call | what it does |
|---|---|
| `Casino.games()` / `describe(id)` | game list and full machine-readable rules |
| `Casino.observe(id, seat?)` / `legal(id, seat?)` | a seat's view and its legal actions |
| `await Casino.act(id, action, seat?)` | act; for `"you"` with the game open it plays through the animated table |
| `Casino.join(id, { name, policy, meta })` | seat your own agent (policy: `obs => action`, may be async). In card-room games it takes over a house chair |
| `Casino.leave(id, seat)` | give the chair back to the house |
| `await Casino.say(id, text)` | talk at the table. Up to two opponents answer after a human pause. They may tell the truth, deflect or lie |
| `Casino.on(type, fn)` | every engine event (`say`, `settle`, `play`, …) plus `balance`, `jackpot`, `join`, `leave`, `ai`; `'*'` for all |
| `await Casino.play(id, policy, { rounds })` | let a policy play your seat for n rounds, on screen |
| `Casino.tools()` / `openaiTools()` / `call(name, input)` | function-calling tools and their dispatcher |
| `Casino.sim(id, opts)` | a fresh headless `Session` |
| `Casino.ai.get() / set(cfg) / on() / test()` | language-model opponents (below) |

```js
// a three-line agent that plays 20 rounds of blackjack on screen
await Casino.play('blackjack', obs =>
  obs.phase === 'bet' ? { type: 'deal', bet: 100 }
  : obs.hands[obs.active].total < 17 ? { type: 'hit' } : { type: 'stand' }, { rounds: 20 });
```

### The rest of the building

The floor, its services, the debt story and the lottery each expose a small object, so an agent can live a whole night in the casino:

| call | what it does |
|---|---|
| `Floor.spots()` / `Floor.where()` / `Floor.goto(gameOrService)` | the walkable floor: every table and counter, where you are, walk somewhere |
| `Services.open(id)` | open a counter (`bar`, `restaurant`, `hotel`, `cage`, `club`, `lottery`, `scratch`, …) |
| `Services.vit()` / `tier()` / `night()` / `comp()` | energy and tipsiness, players-club tier, tonight's theoretical loss and net, comp points |
| `Services.edge(id)` | the house edge the ledger books for a game |
| `Story.state()` | opening, credit, net worth, every open loan with what is owed and days late |
| `Story.borrow(src, amount)` / `Story.repay(loanId)` | borrow from `marker`, `junket` or a loan app; repay one loan in full |
| `Story.achievements()` / `Story.endings()` | what this browser has unlocked |
| `Lottery.games()` / `rtp(g)` / `odds(g)` / `jackpot(g)` | draw games with their exact top-prize odds and long-run return |
| `Lottery.play(g, { lines, draws })` / `Lottery.scratch(cardId)` | buy quick picks and settle at once / buy and scratch one card |

---

## 4. Function-calling tools

`Engines.Agent.tools()` returns five tools in Anthropic shape. `openaiTools()` returns the same five in OpenAI shape.

| tool | input |
|---|---|
| `casino_games` | `{}` |
| `casino_describe` | `{ game }` |
| `casino_observe` | `{ game }` |
| `casino_act` | `{ game, action: { type, ...params, say? } }` |
| `casino_say` | `{ game, text }` |

`Engines.Agent.handler(provider)` dispatches tool calls onto any provider. A provider implements `games / describe / observe / act / say`. Two providers ship:

- `window.Casino`, the live screen;
- `Engines.Agent.sessionProvider()`, headless and instant.

Illegal actions come back as `{ ok: false, error }` with the rule that was broken, so a model can correct itself.

---

## 5. Opponents: scripted personas and language models

Eleven house personas sit at the card-room tables. Each table has its regulars (`Casino.LINEUP`):

| table | regulars |
|---|---|
| `zhajinhua` 炸金花 (5 seats, 5% rake) | hao, mei, fei, zhou |
| `vipzjh` 贵宾厅炸金花 (4 seats, antes 1,000–20,000, 5% rake) | ace, chen, yan |
| `niuniu` 牛牛 | hao, chen, dao, ling |
| `doudizhu` 斗地主 | oldk, wang |
| `mahjong` 麻将 | wang, ling, oldk |

| id | name | style |
|---|---|---|
| `hao` | 阿豪 Hao | loud tycoon, raises for fun |
| `ling` | 玲姐 Ling | reads people, sharp tongue |
| `oldk` | 老K Old K | old Macau hand, calm |
| `mei` | 小美 Mei | plays the giggly beginner; isn't one |
| `ace` | 赌神 Ace | `god`: disciplined pot-odds play, long blind runs, wins over time |
| `fei` | 大飞 Fei | `tilt`: chases after two losses |
| `dao` | 刀仔 Knife | `pro`: same math as Ace, fewer words |
| `wang` | 王阿姨 Auntie Wang | `lucky`: superstitious and tight |
| `chen` | 陈总 Boss Chen | `boss`: insolvent chairman, raises to save face |
| `zhou` | 小周 Zhou | `tilt`: student on loan apps |
| `yan` | 燕姐 Madam Yan | `junket`: the VIP salon's credit agent |

House wallets persist between visits; VIP seats start with 5,000,000. The 炸金花 tables take 5% of every contested pot, capped at 10 antes; the `win` event carries `pot` (after rake) and `rake`.

**`Brain.scripted(game, persona)`**

- Plays by hand strength scaled by the persona's `aggr` and `bluff`.
- Talks from a line bank.
- Every bluff or sandbag it says is recorded in `policy.tells`, so after the hand the table can show "she was bluffing" once her cards are turned over.

**`Brain.llm(game, persona, cfg)`**

- A language model plays the seat.
- Each turn it gets the private observation and returns `{ think, action, say }`.
- The system prompt tells it that table talk is part of the game: bluff, needle, mislead, stay in character, and talk on about one turn in three.
- **Safety and cost:**
  - Actions are validated against `legal`. On an illegal answer it retries once, then falls back to the scripted persona, so a model can never stall or break a table.
  - When there is only one possible move, no model call is made.
- **Exposed on the policy:**
  - `policy.reply(obs, chatEvent)` answers you in character when you talk to the table.
  - `policy.lastThought`, `policy.lastError`, `policy.tells`.

After every hand the table reveals what nobody saw at the time: the scripted bluffs, and the model's private `think` next to what it said out loud.

### Turning it on in the browser

Open Settings, then "AI 对手 / AI rivals", and fill in:

- the base URL of an Anthropic-compatible endpoint (`POST {base}/v1/messages`);
- the key;
- the model;
- how many seats it plays.

Press **Test** to check the connection.

How the key is handled:

- It is stored only in that browser's `localStorage`. It is never written into the page, this repository or any server of ours.
- Requests go straight from the browser to your endpoint. The endpoint must allow CORS, and the request carries `anthropic-dangerous-direct-browser-access: true`.

From code:

```js
Casino.ai.set({ enabled: true, baseURL: 'https://your-endpoint', apiKey: '…', model: '…', seats: 2 });
```

---

## 6. From the terminal: `tools/llm-agent.js`

Node 18+, no dependencies. The endpoint is read **from the environment only**. Never put a key in a file in this repo.

```bash
export ANTHROPIC_BASE_URL=https://your-endpoint
export ANTHROPIC_AUTH_TOKEN=…          # or ANTHROPIC_API_KEY
export ANTHROPIC_MODEL=…

# watch two model personas at a 炸金花 table with three scripted ones:
# actions, table talk, and (purple) what the model was thinking while it talked
node tools/llm-agent.js table zhajinhua --hands 3 --llm 2 --lang zh

# the model is the gambler: it gets the casino_* tools and plays on its own
node tools/llm-agent.js play blackjack --turns 30

node tools/llm-agent.js games          # every game id
```

Flags:

| flag | meaning |
|---|---|
| `--seed` | reproducible shuffles |
| `--model` | overrides `ANTHROPIC_MODEL` |
| `--balance` | starting chips in `play` mode |
| `--timeout` | per-request timeout in ms |

Chip conservation is checked at the end of every `table` run.

---

## 7. Writing a new engine

```js
Engines.define({
  id, kind: 'slot'|'table'|'instant'|'pvp', mode: 'solo'|'shared'|'pvp', name: { zh, en }, doc,
  init(rng, opts) -> state,
  legal(state, ctx) -> ActionSpec[],          // ctx = { seat, balance, balances, rng, jackpots }
  step(state, action, ctx) -> { events, debit, credit, refund, ledger, done, players } | { error },
  view(state, seat) -> observation,           // strip what this seat may not see
  // pvp also: seats, turn(state) -> seatId | null, bot(obs, rng) -> action
});
```

Keep `state` plain JSON and take all randomness from `rng`. Then the game works everywhere above, with no further changes.
