# 金城浮生 · Gilded City

一座霓虹城市里的人生模拟。你在这里上班、吃饭、睡觉、交朋友、谈恋爱、借钱和欠钱；城里二十多个人各有性格、记忆和日程，会记住你做过的事，也会把它传出去。接上大模型后，他们由 AI 扮演，你可以直接跟他们说话。**金玉满堂**赌场只是城里的一栋楼。全部使用**虚拟筹码**：没有充值，没有兑现，没有真钱。
A life in a neon city. You work, eat, sleep, make friends, fall in love, borrow and owe. More than twenty people live here, each with a temperament, a memory and a daily routine; they remember what you did and tell each other. With a model connected, they are played by AI and you can talk to them in your own words. The **Gold & Jade** casino is one building in town. **Virtual chips only.** Nothing to buy, nothing to cash out.

## 运行 / Run

纯前端，无需构建。直接双击 `index.html`，或者起一个静态服务器：
No build step. Open `index.html` directly, or serve the folder:

```bash
cd casino && python3 -m http.server 8000   # http://localhost:8000
```

要让城里的人由大模型扮演，用自带的小服务器启动。它从**环境变量**读取密钥，替页面转发请求，密钥不会进浏览器，也不会进仓库：
To have the people played by a model, start the bundled server. It reads the key **from the environment** and forwards the page's requests, so the key never reaches the browser or the repository:

```bash
export ANTHROPIC_BASE_URL=https://your-endpoint
export ANTHROPIC_AUTH_TOKEN=…            # never write it into a file in this repo
node tools/serve.js                       # http://localhost:8000, picks a model from /v1/models
node tools/serve.js --model your-model --port 8080
```

页面启动时会自动检测这个服务器，右上角显示「AI · 模型名」；没有它时，所有人用写好的剧本说话，游戏完整可玩。
The page detects the server at start and shows "AI · model" in the HUD. Without it, everyone speaks from the script and the game is fully playable.

## 城市 / The city

- **地图**：老城区、中环、不夜街、海滨四个区，16 个地点，各有营业时间。走路免费、巴士 4 块、打车快但贵，路上都花时间。
  **Map**: four districts and 16 places, each with opening hours. Walk for free, take the bus for 4, or a taxi that is fast and pricey. Travel takes time.
- **人物**：5 项属性（体魄、头脑、魅力、定力、运气）、9 项技能（赌技、算牌、口才、识人、骗术、厨艺、体能、编程、生意经）、7 条状态（健康、精力、饱腹、心情、压力、赌瘾、醉意）和性格特质。技能越练越高，不练会慢慢退。
  **You**: 5 attributes, 9 skills that grow with practice and fade without it, 7 status bars that change by the hour, and traits.
- **关系**：好感、信任、熟络、心动四条线分开算，而且是双向的；朋友、至交、恋人、仇人由数值和事件决定。你干的事会变成消息，每晚在熟人之间传开。
  **People**: affinity, trust, familiarity and romance, tracked separately and in both directions. What you do becomes news that spreads overnight.
- **生计**：七份工作（外卖骑手、茶餐厅伙计、便利店店员、程序员、销售、荷官、补习老师），按表现升职；每周交租，不交会被赶出去；可以跟人借钱、借给别人，也可以找疤哥借高利贷。
  **Living**: seven jobs with promotions; weekly rent or eviction; borrow from friends, lend to them, or go to the loan shark.
- **对话**：点话题（闲聊、夸人、借钱、送礼、约会、表白、撒谎、威胁……）或直接打字。每句话的效果都显示出来，包括掷骰判定；信任够高或识人判定成功时，还能看到 TA 心里真正在想什么。
  **Talking**: pick a topic or type freely. Every effect is shown, including the dice; with enough trust or a good read, you see what they really think.
- **赌场**：走进金玉满堂就是原来那座可以走动的赌场，精力和醉意带进去，输赢和时间带出来，赌瘾随之变化。
  **The casino**: walk into the Gold & Jade and you are on the old casino floor. Your energy goes in with you; the result and the hours come back out, and so does the habit.

设计细节见 [docs/LIFE_DESIGN.md](docs/LIFE_DESIGN.md)。
Design notes: [docs/LIFE_DESIGN.md](docs/LIFE_DESIGN.md).

## 游戏 / Games

### 棋牌室 / Card room (PvP)

十一位有性格的牌友，各自有固定的牌桌，会吹牛、会诈唬、会回嘴。每局结束后，亮出的牌会揭穿谁刚才在诈。可以在设置里接入大模型，让它坐上对手的位置。
Eleven opponents with personalities, each a regular at their own table. They bluff, needle and answer back. After each hand, the shown cards expose who was bluffing. In Settings you can let a language model take their seats (see [docs/AGENT_API.md](docs/AGENT_API.md)).

| 游戏 | Game | 规则 / Rules | 常客 / Regulars |
|---|---|---|---|
| 炸金花 | Zha Jin Hua | 5 人、闷牌/看牌、跟注、加注、比牌，豹子 > 顺金 > 金花 > 顺子 > 对子，235 吃豹子；**抽水 5%**（封顶 10 倍底注） | 阿豪、小美、大飞、小周 |
| 贵宾厅炸金花 | VIP Brag | 4 人私人局，底注 1,000–20,000，抽水 5%；金卡会员或身上 200,000 筹码才能进门 | **赌神**、陈总、燕姐 |
| 斗地主 | Dou Di Zhu | 叫分抢地主、炸弹与王炸翻倍、春天，选牌出牌带提示 | 老K、王阿姨 |
| 血战麻将 | Sichuan Mahjong | 定缺、碰、杠（刮风下雨）、自摸、点炮，血战到底，番型结算 | 王阿姨、玲姐、老K |
| 抢庄牛牛 | Niu Niu | 抢庄倍数、下注倍数、自动拆牛，五花牛、炸弹牛、五小牛 | 阿豪、陈总、刀仔、玲姐 |

打法风格 / Play styles：赌神和职业牌手刀仔按底池赔率算牌，紧而凶，长期是赢家；大飞和小周输两把就上头；陈总签单硬撑面子；王阿姨看黄历、打得最抠；燕姐是叠码仔，你一输她就递名片。
The God of Gamblers and Knife play disciplined, pot-odds poker and win over time. Fei and Zhou tilt after two losses. Boss Chen raises to save face. Auntie Wang plays tight and superstitious. Madam Yan is a junket agent who hands you her card the moment you lose.

### 赌场 / Casino

| 游戏 | Game | 亮点 / Highlights | RTP |
|---|---|---|---|
| 发财777 | Fortune Sevens | 5×3、10 线、扩展百搭、红包免费旋转 ×3、第 5 轴悬念慢停、急停、自动、极速 | ≈ 95% |
| 幸运777 | Lucky 777 | 经典 3 轴单线、可拖拽拉杆、亮灯赔率表、百搭 ×2、"差一点"提示 | 95.4%（精确枚举） |
| 财神到 | God of Wealth | 6×5 任意位置 8 个即中、消除连锁、倍数球、财字散布触发免费旋转、购买免费旋转 | ≈ 96% |
| 聚宝盆 | Treasure Bowl | 5×3 243 路、金币锁定重转 (Hold & Win)、四级奖池 GRAND/MAJOR/MINOR/MINI | ≈ 95% |
| 21点 | Blackjack | 6 副牌、3:2、加倍、分牌、庄家偷看底牌、键盘 H/S/D/P | ≈ 99.4% |
| 轮盘 | Roulette | Canvas 欧式轮盘，小球物理落点与开奖结果一致；手机上自动竖排 | 97.3% |
| 百家乐 | Baccarat | 标准补牌规则、庄对/闲对、**拖拽咪牌**、珠盘路 | 98.9% |
| 骰宝 | Sic Bo | 摇盅、亲手开盅、全套澳门下注区、红色 1/4 点骰子、路单 | 97.2% |
| 火箭冲天 | Rocket Crash | 指数倍数、自动收手、里程碑卡点、爆炸震屏、其他玩家列表 | 97% |
| 弹珠台 | Plinko | 12 排钉、三档风险、多球同时下落 | ≈ 99% |

另有：每 4 小时一次的幸运转盘、等级与升级奖励、破产救济金、战绩统计。
Also: a lucky wheel every 4 hours, levels with rewards, a free refill when you go broke, and lifetime stats.

### 彩票大厅 / Lottery hall

| 中国 / China | 美国 / US | 刮刮乐 / Scratch |
|---|---|---|
| 双色球、大乐透、福彩 3D、快乐 8 | Powerball、Mega Millions、Pick 3、Keno | 6 种票面，用手指刮开 |

每个玩法都按真实规则开奖，并列出头奖概率和长期返还率：中国大陆返还约 50–58%，头奖封顶 500 万（奖池超 1.5 亿时 1000 万），单注超 1 万缴 20% 个税；美国强力球只返还约 15–20%，一次性领取约为宣传头奖的 45%，再扣 24% 预扣税，头奖还可能被别人分走。
Every game draws by its real rules and shows its top-prize odds and long-run return. Chinese lotteries return about 50–58%, with the top prize capped at 5M (10M when the pool passes 150M) and 20% tax on single wins over 10,000. US jackpot games return only about 15–20%: the cash option is about 45% of the advertised jackpot, 24% is withheld, and co-winners may split it.

## 赌场大堂 / The floor

大厅就是一座可以走的赌场（72 × 56 格，3/4 俯视）：棋牌室、贵宾厅、吧台、老虎机区、赌桌区、餐厅、彩票站、账房、精品店、酒店前台和大门。点地面或用方向键走动，走到桌边、机台或柜台前就能坐下或办事。场子里的人会玩、会赢、会喝酒、会跟你搭话，贵宾厅门口有保镖。
The lobby is a casino you walk through (72 × 56 tiles, 3/4 view): card room, VIP salon, bar, slot banks, table pit, restaurant, lottery kiosk, cage, boutique, hotel desk and the front door. Tap the floor or use the arrow keys; walk up to a table, machine or counter to sit down or be served. The floor is full of people who play, win, drink and talk to you, and there are bodyguards at the VIP door.

**配套服务 / Services**：精力和酒意两项状态、赌场时钟（没有窗、没有钟）；餐厅和吧台花筹码吃饭喝酒，服务员会送免费酒；酒店睡一晚恢复精力；会员卡按理论输额（下注额 × 庄家优势）升级并发放积分；账房能看到「庄家优势账本」，告诉你今晚按数学期望应该输多少。
Energy and tipsiness, a casino clock (no windows, no clocks on the walls); pay chips to eat and drink, and the waitress brings free drinks; sleep at the hotel to recover; the players club ranks you by theoretical loss (wagered × house edge) and pays comps; the cage shows a house-edge ledger of what tonight should have cost you on average.

**借钱与剧情 / Borrowing and story**：开局可选身份（打工人、拆迁户、富二代、负债开局、赌神之路）；账房签码、叠码仔放数、手机里的网贷 App，利息在你睡觉时照算，逾期会有催收找上门。有成就、多种结局和家人来电。全部是虚构情节和虚拟数字。
Pick an opening: wage earner, relocation windfall, rich kid, already in debt, or the road to God of Gamblers. Borrow at the cage, from a junket agent, or from loan apps on your phone; interest runs while you sleep, and late payments bring collectors to the door. Achievements, several endings, and calls from home. Everything is fiction and every number is virtual.

## 手感 / Feel

- **声音**：全部由 WebAudio 实时合成（筹码碰撞、发牌、转轴、小球、骰子、爆炸、铜管号角），另有爵士大堂背景音乐。
- **语音播报**：浏览器 `speechSynthesis`，按当前语言播报（“黑杰克！”“买定离手”“庄赢”）。
- **动效**：Canvas 粒子（方孔铜钱、彩纸、火花）、金币飞入余额、震屏、闪光。大奖分四档（大奖 → 巨奖 → 超级大奖 → 传奇），数字滚动中逐级升级。
- 设置里可以单独开关音效、音乐、语音，并切换中英文。系统开启“减少动态效果”时，动画会自动收敛。

## 结构 / Layout

```
index.html          页面骨架
css/*.css           样式：style（主题）、pvp、floor、services、story、lottery
js/util.js          工具函数、localStorage
js/i18n*.js         中英文字典（按模块拆分）
js/audio.js         合成音效、音乐、语音
js/fx.js            粒子、飞币、震屏、大奖演出
js/core.js          钱包、等级、筹码/下注板/扑克牌组件、路由
js/engine/*.js      纯规则引擎（无 DOM）：每个游戏的 init/legal/step/view，AI 工具，性格化对手 Brain
js/casino-api.js    window.Casino：画面与 AI 共用的实时接口；每张牌桌的常客阵容
js/games/*.js       各游戏画面
js/floor.js         可行走的赌场大堂 window.Floor
js/services.js      吃喝住、会员卡、账房、庄家优势账本 window.Services
js/story.js         开局、借贷、催收、成就、结局 window.Story
js/lottery.js       彩票大厅与刮刮乐 window.Lottery
js/tutorial.js      新手引导、新手学堂、21点教练
js/main.js          大厅、幸运转盘、设置、启动
js/world/data.js    城市的内容：属性、技能、特质、地点、行动、工作、人物、关系网
js/world/core.js    城市的规则（无 DOM，node 里也能跑）：时钟、状态、关系、传闻、行动、借贷 World
js/world/mind.js    对话：模型扮演或剧本判定，效果一律过规则校验 WorldMind
js/life/portrait.js 程序化画的人物头像，带表情 Portrait
js/life/art.js      城市夜景地图、每个地点的场景、属性雷达图 Art
js/life/bridge.js   把城市接到赌场：钱包、时钟、存款、借贷共用 window.Life
js/life/city.js     城市画面：HUD、地图、地点、对话、人物卡、人脉网、手机、日记
docs/AGENT_API.md   AI 接入文档 / how agents and language models join the tables
tools/llm-agent.js  命令行里让大模型上桌：node tools/llm-agent.js table zhajinhua
tools/sim.js        老虎机与弹珠台的 RTP 模拟：node tools/sim.js
tools/i18n-check.js 校验两种语言的文案键是否齐全
tools/serve.js      本地服务器 + 模型转发（密钥只从环境变量读）
tools/life-sim.js   命令行跑人生：node tools/life-sim.js --days 14；--agent 让模型自己过日子
docs/LIFE_DESIGN.md 人生模拟的设计文档
```

## 新手 / Beginners

- 第一次打开时，荷官「小金」会带你逛大厅；每个游戏第一次进去，都有聚光灯式的分步讲解。
  On your first visit, Jin the croupier shows you around the lobby, and each game gets a spotlight walkthrough the first time you open it.
- **新手学堂**（大厅按钮或设置里）包含：入门须知、按难度排好的游戏和「带我玩」按钮、赔率与返还率、牌桌黑话。
  **Casino 101** (lobby button or Settings) covers the basics, games sorted by difficulty with a "Teach me" button, odds and RTP, and table slang.
- 21点里，小金会按基本策略点亮推荐按钮并说明理由，可在学堂里关闭。
  In blackjack, Jin lights up the basic-strategy move and explains why. You can turn this off in Casino 101.

## AI 用在哪里 / Where the language model is used

数学、发牌、记账、赔率、抽水、彩票开奖、利息和催收的节奏全部是脚本，确定、可验证，模型碰不到。模型只用在「说话」和「判断人」的地方：
The math, dealing, ledger, odds, rake, lottery draws, interest and collection schedule are all scripts: deterministic, checkable, and out of the model's reach. The model is used only where talking and judging people matter:

- **牌桌对手**：每回合给出 `{think, action, say}`，会诈唬、会钓鱼，局后公开它当时真正在想什么（紫色）。动作先过合法性校验，出错就回退到脚本。
  **Opponents**: each turn returns `{think, action, say}`. They bluff and bait; after the hand you see what they were really thinking (in purple). Every action is checked against the rules; on failure the seat falls back to its script.
- **叠码仔、催收、家人**：用模型说话；你可以在手机上跟催收讨价还价，模型决定给不给宽限，但最多 2 天，由脚本卡死。
  **Junket agent, collector, family**: they speak through the model. You can plead with the collector by text; the model decides whether to grant extra days, and the script caps it at 2.
- **城里的人**：模型拿到这个人的身份、性格、状态、记忆、和你的关系以及当下的场景，回一句话、一句心里话和一组效果（加好感、借钱给你、教你技能、约你见面、给你工作……）。效果先过规则：每句话好感最多 ±8，借钱不超过对方手里的钱、也不超过信任允许的额度，工作要满足条件，心动要先有好感。说什么都行，改变世界只能在规则之内。
  **People in the city**: the model gets the person (who they are, temperament, state, memories), how they see you and the scene, and answers with a line, a private thought and a list of effects (affinity, a loan, a lesson, a date, a job…). Every effect is checked: at most ±8 affinity per line, loans capped by their cash and their trust, jobs by requirements, romance by affinity. The model can say anything; it can only change the world within the rules.
- 默认（不接模型）时，这些角色都用写好的台词，游戏完整可玩。
  Without a model, all of them use written lines and the game is fully playable.
- 密钥只存在你自己浏览器的 localStorage，或命令行的环境变量里，**不要提交进仓库**。
  The key lives only in your browser's localStorage or in your shell environment. **Never commit it.**

进度保存在浏览器 localStorage 中，可在设置里一键重置。
Progress is stored in localStorage and can be reset from Settings.
