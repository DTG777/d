# 金城浮生 · Gilded City: life simulator design

The casino used to be the whole game. Now it is one building in a city where you live a life: you work, eat, sleep, make friends, fall in love, borrow and owe, and maybe gamble it all away. Everything a person can do is an action with rules, and every rule is visible to an agent.

## 1. Layers

```
js/world/data.js     content only: attributes, skills, traits, places, jobs, items, people
js/world/core.js     the rules: clock, people, statuses, relationships, actions, loans, gossip, NPC days
js/world/mind.js     conversation: a model (or the script) talks and proposes effects; the core validates them
js/life/*.js         the screens: city map, place scenes, portraits, character sheet, phone, talk panel
js/life/bridge.js    binds the world to the casino: wallet = chips, clock = casino clock, loans = story loans
tools/serve.js       serves the game and forwards model calls with the key from the environment
```

`js/world/*` has no DOM. It runs in node (`node tools/life-sim.js`) and in the browser, the same way the card engines do.

## 2. A person

| group | fields | range |
|---|---|---|
| 属性 attributes | body 体魄, mind 头脑, charm 魅力, will 定力, luck 运气 | 1–10 at base (items and buffs can lift one to 12), slow to change |
| 技能 skills | gamble 赌技, odds 算牌, talk 口才, read 识人, lie 骗术, cook 厨艺, fit 体能, code 编程, biz 生意经 | 0–100, grow with practice, decay slowly |
| 状态 status | health 健康, energy 精力, full 饱腹, mood 心情, stress 压力, urge 赌瘾, drunk 醉意 | 0–100, change by the hour |
| 特质 traits | gambler, impulsive, cautious, warm, stingy, proud, shrewd, naive, loyal, grudge, romantic, superstitious | modify rolls and drift |
| 资产 money | cash, bank, items | the player's cash is the chip wallet |
| 记忆 memory | what this person remembers about you, with weight | the last 24 notes |

Skill checks: `chance = base + skill/2 + (attr − 5)×3 + relationship and trait terms − drunk/8`, clamped to 5–95%. An average attribute (5) adds nothing; a 10 adds 15 points, a 1 takes 12 away. The roll is shown after the fact, so a player can learn what drives success.

## 3. Relationships

Directed: how A sees B is not how B sees A.

| field | meaning | range |
|---|---|---|
| aff 好感 | do I like you | −100…100 |
| trust 信任 | do I believe you, will I lend to you | 0…100 |
| fam 熟络 | how well we know each other | 0…100 |
| love 心动 | romance | 0…100 |
| tags | family, friend, close, partner, colleague, boss, landlord, rival, ex | derived and set |

Tags follow from thresholds (friend: fam ≥ 30 and aff ≥ 30; close: fam ≥ 60 and aff ≥ 60 and trust ≥ 50) except family, boss, landlord, partner and ex, which events set.

**Gossip.** Notable things you do become news (a big win, a default, a lie that got caught, a fight). Each night, everyone who knows a piece of news tells the people they are close to. News changes trust and affinity when it lands.

## 4. Time and places

- One clock for the whole world (the casino clock). Actions take minutes, and statuses drift by the hour.
- 16 places in four districts (老城区 Old Town, 中环 Central, 不夜街 Neon Strip, 海滨 Harbour). Each has opening hours, its own actions and its own people at given hours.
- Moving costs time: walk (free), bus (2), taxi (fast, pricey).

## 5. Actions

Every action is data: `{ id, at, min, cost, need, fx, xp }`, plus an optional handler for special cases (work, sleep, borrowing). `World.legal()` lists what you can do right now; `World.act()` checks the action again, advances the clock, applies effects and returns events. A person on screen and an agent call the same function.

## 6. The economy

- **Jobs:** rider, waiter, clerk, coder, sales, dealer and tutor. Each has requirements, pay per shift by level, and promotion by performance.
- **Rent and costs:** rent is due weekly to the landlady, and food, transport and hospital cost money.
- **Loans:** the cage, the junket agent and loan apps live in the story layer. People can also lend to you, and to each other, with their own terms. Late payments hurt relationships and spread as gossip; the loan shark sends people.
- **Gambling:** urge (赌瘾) rises with stress, with time away from the tables and after near misses. Playing relieves it for a while and raises the baseline.

## 7. Conversation changes the world

`Mind.talk(npc, input)` takes either an intent (small talk, compliment, joke, confide, ask around, borrow, repay, gift, invite, confess, apologize, lie, threaten, ask for advice, ask for a job) or free text.

- **With a model:** the model gets the person (bio, traits, statuses, memories), the relationship, the scene and the player's visible state. It replies with:
  ```json
  {"say": "…", "think": "…", "emotion": "warm|cold|angry|sad|happy|nervous",
   "effects": [{"type": "rel", "aff": 3, "trust": -2}, {"type": "lend", "amount": 2000, "days": 7}, …]}
  ```
- **Effect types:** rel, give, lend, ask, teach, job, invite, remember, reveal, mood, tag, leave.
- **Hard limits:** the core validates every effect before it lands. Relationship moves are capped per message; money is capped by what the person has and by trust; jobs need the requirements; romance needs thresholds. Anything else is dropped. A model can talk anyone into anything in words, but it can only move the world within the rules.
- **Without a model:** the same intents resolve by skill checks against the person's traits and relationship, with written lines. Free text maps to an intent by keywords.

What the person really thought (`think`) is kept. When trust grows, or when news reveals it, the player gets to see it.

## 8. Agent-native

`window.Life` (browser) and `World` (node) expose:

- `observe()`, `legal()`, `act(action)`;
- `talk(id, text | {intent})`, `people(here?)`, `person(id)`, `relations()`;
- `map()`, `log()`;
- `tools()`, function-calling definitions over the same calls.

A language model can live a whole life through these calls (`node tools/life-sim.js --agent`).

## 9. The screens

The city is the home screen (`#city`); the casino lobby is one building on its map.

- **HUD**: portrait, day and time, where you are, cash, bank and debt, status bars that warn when low, the AI badge and the phone badge.
- **地图 Map**: the city at its time of day, with the people you know drawn where they are. Tap a place for its hours, who is there and how to get there (walk, bus or taxi, each with its time and cost); travel is animated along the route. Inside a place: a scene with the people present, jobs to take or work, and every action with its effects and, when it is greyed out, the reason.
- **我 Me**: attribute radar, skills with levels, status, job and promotion progress, items, lifetime stats.
- **人脉 People**: a web with you in the middle; distance is closeness, colour is the relationship, dashed lines are ties between other people. Tap anyone for their sheet: affinity, trust, respect, romance, fear, what they remember, and Talk, Call or Go find.
- **手机 Phone**: messages, requests waiting for an answer, plans, rent and debts (story debts open the 网贷 app), money you lent, contacts and gossip you picked up.
- **日记 Diary**: everything that happened, by day.
- **Talk panel**: the person's face changes with their mood. Pick an intent (chat, flatter, borrow, lie, flirt, ask for a job, …) or type anything. Each reply shows its effects as chips, the dice roll when a skill was checked, and whether the model or the script answered.

Long actions run a short time-lapse. Walking into the casino hands your energy and drunkenness to the floor; walking out hands back the night's net, the minutes spent and how tired you are, and puts you outside the casino at that hour.

## 10. The model connection

`tools/serve.js` reads `ANTHROPIC_BASE_URL` and `ANTHROPIC_AUTH_TOKEN` from the environment, serves the game, and forwards `POST /llm/v1/messages`. The page checks `/llm/health` at start and turns AI on when the server answers, so the key never reaches the browser or the repository. Without the server, the page can still call an endpoint directly with a key from Settings, which is kept in this browser only.
