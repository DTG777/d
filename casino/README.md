# 金玉满堂 · Gold & Jade Casino

七款经典赌场游戏，全部使用**虚拟筹码**：没有充值，没有兑现，没有真钱。
Seven classic casino games played with **virtual chips only**. Nothing to buy, nothing to cash out.

## 运行 / Run

纯前端，无需构建。直接双击 `index.html`，或者起一个静态服务器：
No build step. Open `index.html` directly, or serve the folder:

```bash
cd casino && python3 -m http.server 8000   # http://localhost:8000
```

## 游戏 / Games

| 游戏 | Game | 亮点 / Highlights | RTP |
|---|---|---|---|
| 发财777 | Fortune Sevens | 5×3、10 线、扩展百搭、红包免费旋转 ×3、第 5 轴悬念慢停、急停、自动、极速 | ≈ 95% |
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
js/games/*.js       七个游戏
js/main.js          大厅、幸运转盘、设置、启动
tools/sim.js        老虎机与弹珠台的 RTP 模拟：node tools/sim.js
tools/i18n-check.js 校验两种语言的文案键是否齐全
```

进度保存在浏览器 localStorage 中，可在设置里一键重置。
Progress is stored in localStorage and can be reset from Settings.
