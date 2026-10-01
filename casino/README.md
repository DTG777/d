# 金玉满堂 · Gold & Jade Casino

棋牌室对战加经典赌场游戏，全部使用**虚拟筹码**：没有充值，没有兑现，没有真钱。
Card-room games against talking opponents plus classic casino games, all with **virtual chips only**. Nothing to buy, nothing to cash out.

## 运行 / Run

纯前端，无需构建。直接双击 `index.html`，或者起一个静态服务器：
No build step. Open `index.html` directly, or serve the folder:

```bash
cd casino && python3 -m http.server 8000   # http://localhost:8000
```

## 游戏 / Games

### 棋牌室 / Card room (PvP, no rake)

对手是六位有性格的牌友（阿豪、玲姐、老K、小美、赌神、大飞），会吹牛、会诈唬、会回嘴。每局结束后，亮出的牌会揭穿谁刚才在诈。可以在设置里接入大模型，让它坐上对手的位置。
Six opponents with personalities bluff, needle and answer back. After each hand, the shown cards expose who was bluffing. In Settings you can let a language model take their seats (see [docs/AGENT_API.md](docs/AGENT_API.md)).

| 游戏 | Game | 规则 / Rules |
|---|---|---|
| 炸金花 | Zha Jin Hua | 5 人、闷牌/看牌、跟注、加注、比牌，豹子 > 顺金 > 金花 > 顺子 > 对子，235 吃豹子 |
| 斗地主 | Dou Di Zhu | 叫分抢地主、炸弹与王炸翻倍、春天，选牌出牌带提示 |
| 血战麻将 | Sichuan Mahjong | 定缺、碰、杠（刮风下雨）、自摸、点炮，血战到底，番型结算 |
| 抢庄牛牛 | Niu Niu | 抢庄倍数、下注倍数、自动拆牛，五花牛、炸弹牛、五小牛 |

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

## 手感 / Feel

- **声音**：全部由 WebAudio 实时合成（筹码碰撞、发牌、转轴、小球、骰子、爆炸、铜管号角），另有爵士大堂背景音乐。
- **语音播报**：浏览器 `speechSynthesis`，按当前语言播报（“黑杰克！”“买定离手”“庄赢”）。
- **动效**：Canvas 粒子（方孔铜钱、彩纸、火花）、金币飞入余额、震屏、闪光。大奖分四档（大奖 → 巨奖 → 超级大奖 → 传奇），数字滚动中逐级升级。
- 设置里可以单独开关音效、音乐、语音，并切换中英文。系统开启“减少动态效果”时，动画会自动收敛。

## 结构 / Layout

```
index.html          页面骨架
css/style.css       全部样式（单一深色主题）
js/util.js          工具函数、localStorage
js/i18n.js          中英文字典
js/audio.js         合成音效、音乐、语音
js/fx.js            粒子、飞币、震屏、大奖演出
js/core.js          钱包、等级、筹码/下注板/扑克牌组件、路由
js/engine/*.js      纯规则引擎（无 DOM）：每个游戏的 init/legal/step/view，AI 工具，性格化对手 Brain
js/casino-api.js    window.Casino：画面与 AI 共用的实时接口
js/games/*.js       各游戏画面
js/tutorial.js      新手引导、新手学堂、21点教练
js/main.js          大厅、幸运转盘、设置、启动
docs/AGENT_API.md   AI 接入文档 / how agents and language models join the tables
tools/llm-agent.js  命令行里让大模型上桌：node tools/llm-agent.js table zhajinhua
tools/sim.js        老虎机与弹珠台的 RTP 模拟：node tools/sim.js
tools/i18n-check.js 校验两种语言的文案键是否齐全
```

## 新手 / Beginners

- 第一次打开时，荷官「小金」会带你逛大厅；每个游戏第一次进去，都有聚光灯式的分步讲解。
  On your first visit, Jin the croupier shows you around the lobby, and each game gets a spotlight walkthrough the first time you open it.
- **新手学堂**（大厅按钮或设置里）包含：入门须知、按难度排好的游戏和「带我玩」按钮、赔率与返还率、牌桌黑话。
  **Casino 101** (lobby button or Settings) covers the basics, games sorted by difficulty with a "Teach me" button, odds and RTP, and table slang.
- 21点里，小金会按基本策略点亮推荐按钮并说明理由，可在学堂里关闭。
  In blackjack, Jin lights up the basic-strategy move and explains why. You can turn this off in Casino 101.

## AI 对手 / AI opponents

- 默认对手是脚本人格：打法随性格变化，台词按局势触发，诈唬会被记录，亮牌后揭穿。
  By default, opponents are scripted personas. Their play follows their personality, they talk according to the situation, and their bluffs are recorded and exposed when cards are shown.
- 接入大模型后，它每回合给出 `{think, action, say}`。它会骗你，而你能在局后看到它当时真正在想什么（紫色）。动作会先过一遍合法性校验，出错就回退到脚本，所以牌局不会卡住。
  With a language model, each turn returns `{think, action, say}`. It may lie to you, and after the hand you see what it was really thinking (in purple). Every action is validated against the rules, and on failure the seat falls back to its script, so the table never stalls.
- 密钥只存在你自己浏览器的 localStorage，或命令行的环境变量里，**不要提交进仓库**。
  The key lives only in your browser's localStorage or in your shell environment. **Never commit it.**

进度保存在浏览器 localStorage 中，可在设置里一键重置。
Progress is stored in localStorage and can be reset from Settings.
