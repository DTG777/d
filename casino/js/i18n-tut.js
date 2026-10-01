/* Strings for the tutorial, the Casino 101 academy and the blackjack coach.
   Tour steps are "title|body" (body may hold simple HTML). */
(function () {
  const zh = {
    'tut.coach': '荷官 · 小金', 'tut.skip': '跳过', 'tut.next': '下一步', 'tut.prev': '上一步', 'tut.go': '开玩！', 'tut.explore': '我自己逛逛',
    'lobby.academy': '新手学堂', 'aca.open': '打开',

    'tut.lobby.1': '欢迎光临金玉满堂|我是荷官小金。你现在就站在赌场大门里：<b>点地面走路</b>（电脑上也可以用 WASD / 方向键），走到机台、牌桌、柜台跟前就能玩、能消费。先说最重要的：这里所有筹码都是<b>虚拟的</b>，不能充值也不能兑现。',
    'tut.lobby.2': '这是你的筹码|下注从这里扣，赢了飞回这里。吃饭、喝酒、开房、买表也从这里花。',
    'tut.lobby.3': '这就是赌场|老虎机区、桌台区、棋牌室、VIP 厅、酒吧、餐厅、彩票站、兑换处……每个区域都能走进去。点人可以搭话，点机台或桌子就坐下开玩。',
    'tut.lobby.4': '小地图|点小地图任意位置，直接跑过去。金色小点是你。',
    'tut.lobby.5': '导览|不想走路？这里列出了所有去处，可以「走过去」，也可以「直接开玩」。原来的游戏大厅和幸运转盘也在这里。',
    'tut.lobby.6': '手机|短信、借款、成就、你的赌场账本都在手机里。有人找你，这里会亮红点。',
    'tut.lobby.7': '状态|体力、酒意、欠款、时间。熬夜会累，喝多会晕，借的钱会滚利息。',
    'tut.lobby.8': '设置|中英文、音效、音乐、语音播报都在这里。还可以接入大模型，让 AI 坐上对手的位置、替赌场公关说话。',
    'tut.lobby.9': '新手学堂|随时点这里：赔率怎么算、牌桌黑话、每个游戏的入门带教。',
    'tut.lobby.10': '想从哪开始？|第一次推荐老虎机（按一下就行）或 21点（我会一步步提示）。想体验被人诈？去棋牌室找人玩炸金花。也可以先随便逛逛。',

    'tut.slots.1': '五个转轴|停下后看中间三行。同一条中奖线上<b>从最左边开始</b>连着 3 个以上相同图案就中奖。共 10 条线。',
    'tut.slots.2': '下注额|每转一次花多少。按 − / + 调整，新手建议先小注多转几次。',
    'tut.slots.3': '转！|点这里或按空格开转。转动中再点一次可以<b>急停</b>。',
    'tut.slots.4': '自动与极速|自动：连续转，再点停止。极速：动画更快。',
    'tut.slots.5': '大奖在这|3 个<b>红包</b>送 10 次免费旋转，期间奖金 ×3。百搭会展开整轴，替代红包以外的任何图案。',

    'tut.blackjack.1': '目标：比庄家更接近 21|牌点相加，越接近 21 越好，但<b>超过 21 就爆了</b>，直接输。J/Q/K 算 10，A 算 1 或 11。',
    'tut.blackjack.2': '先选筹码|点一个面额。',
    'tut.blackjack.3': '再点下注圈|每点一下放一枚。放错了可以清除。',
    'tut.blackjack.4': '发牌|你两张明牌，庄家一明一暗。',
    'tut.blackjack.5': '轮到你时|<b>要牌</b>再来一张；<b>停牌</b>不要了；<b>加倍</b>下注翻倍、只再拿一张；<b>分牌</b>两张一样可以拆成两手。我会把推荐的按钮点亮，并告诉你为什么。',

    'tut.roulette.1': '轮盘|0 到 36 共 37 格。小球最后停在哪个数字，就开哪个。',
    'tut.roulette.2': '下注区|押单个数字中了赔 <b>35 倍</b>，但只有 1/37 的机会。押<b>红/黑、单/双、大/小</b>赔 1 倍，接近一半机会，新手从这里开始。',
    'tut.roulette.3': '选筹码|选面额后点下注区放筹码，可以放好几处。',
    'tut.roulette.4': '旋转|下好注就转。0 出现时，红黑单双大小都输：这就是庄家的优势。',

    'tut.baccarat.1': '庄 vs 闲|两边各发两三张牌，点数只看个位，<b>越接近 9 越大</b>。补不补牌全按规则自动，你只管押。',
    'tut.baccarat.2': '押哪边|押闲中了赔 1 倍；押庄赔 0.95 倍（庄稍占优，所以抽 5%）；押和赔 8 倍但很少出。新手押庄最划算。',
    'tut.baccarat.3': '路单|记录每一局结果。每局都是独立的，路单好看，但预测不了下一局。',
    'tut.baccarat.4': '发牌|下好注就发牌。打开咪牌后，可以亲手拖开你押的那边的牌。',

    'tut.sicbo.1': '摇骰子|三颗骰子在盅里。摇完后点盅子，亲手开盅。',
    'tut.sicbo.2': '最简单的押法|<b>大</b>（11–17）或<b>小</b>（4–10），赔 1 倍。但如果三颗一样（围骰），大小都输。',
    'tut.sicbo.3': '开摇|其他格子赔得更多，但更难中。点数和单骰号码都可以押。',

    'tut.crash.1': '火箭起飞|倍数从 1.00× 一路往上涨，<b>随时可能爆炸</b>。没人知道它在哪炸。',
    'tut.crash.2': '下注，然后收手|起飞前下注；飞行中按这里<b>收手</b>，按当时倍数拿钱。爆炸前没收手，本金就没了。',
    'tut.crash.3': '自动收手|设定一个倍数，到了自动收钱，不怕手慢。新手推荐 2.00×。',
    'tut.crash.4': '别人也在玩|看看他们在哪收手。有人贪，有人怂。',

    'tut.plinko.1': '弹珠台|小球从顶上落下，每碰一颗钉随机往左或往右，最后落进底部格子，按格子上的倍数赔。',
    'tut.plinko.2': '风险|低风险：倍数平稳。高风险：两边最高 170 倍，但中间格子会亏更多。',
    'tut.plinko.3': '掉落！|可以连点，好几个球一起落。',

    'tut.pv.rivals': '你的对手|每个人都有性格：阿豪爱加注，玲姐会看人，小美装新手。他们说的话<b>可能是真的，也可能是诈</b>。',
    'tut.pv.chat': '牌桌聊天|对手的话都在这里。你也可以问他们「你是不是在诈？」，看他怎么接。局后亮牌，紫色字会揭穿谁刚才在诈。',

    'tut.zhajinhua.1': '炸金花|这桌 5 个人，每人 3 张牌，比谁大。先下底注，最后剩下的人拿走整个底池。',
    'tut.zhajinhua.2': '选底注，发牌|底注越大，输赢越大。',
    'tut.zhajinhua.3': '轮到你时|<b>跟注</b>：跟上当前注额。<b>加注</b>：抬高注额，吓走别人。<b>看牌</b>：之前没看（闷）的话，闷着跟只要一半价钱。<b>比牌</b>：和一个人比，输的出局。<b>弃牌</b>：不玩了，已下的注不退。',
    'tut.zhajinhua.4': '牌型大小|豹子（三张一样）> 顺金 > 金花（同花）> 顺子 > 对子 > 单张。特例：杂色 235 能吃豹子。完整规则在这里。',

    'tut.niuniu.1': '抢庄牛牛|每人 5 张牌，<b>闲家只和庄家比</b>，不和其他人比。',
    'tut.niuniu.2': '选底注，发牌|先看到 4 张牌。',
    'tut.niuniu.3': '流程|1. <b>抢庄</b>：牌好就抢高倍数当庄。2. 不当庄就选<b>下注倍数</b>。3. 亮第 5 张，系统自动帮你拆牛：三张凑成 10 的倍数，剩下两张的个位就是「牛几」，牛牛最大。',
    'tut.niuniu.4': '特殊牌|五花牛、炸弹牛、五小牛赔得更多。完整规则在这里。',

    'tut.doudizhu.1': '斗地主|3 个人：一个地主对两个农民。<b>谁先出完手里的牌，谁那一方就赢</b>。',
    'tut.doudizhu.2': '选底分，发牌|每人 17 张，留 3 张底牌。',
    'tut.doudizhu.3': '怎么打|先<b>叫分</b>抢地主（1–3 分），地主拿走 3 张底牌，一打二。出牌时点选手牌再按出牌；不会出就按<b>提示</b>，每按一次换一种出法。要不起就过。',
    'tut.doudizhu.4': '翻倍|炸弹（四张一样）和王炸（大小王）让输赢翻倍。完整牌型在这里。',

    'tut.mahjong.1': '血战麻将|四川麻将：只有万、条、筒三门，不能吃。<b>凑出 4 组 + 1 对就胡了</b>。',
    'tut.mahjong.2': '选底注，开局|每人 13 张，庄家 14 张。',
    'tut.mahjong.3': '怎么打|开局先<b>定缺</b>：选一门花色，这门打完才能胡。之后摸一张、打一张（点两下打出）。别人打的牌能<b>碰</b>（三张一样）或<b>杠</b>（四张）。听牌后下方会提示你在等哪几张。',
    'tut.mahjong.4': '血战到底|有人胡了也不结束，剩下的人继续打，直到三家胡或牌摸完。番型在这里。',

    'aca.title': '新手学堂',
    'aca.tab.start': '入门', 'aca.tab.games': '游戏', 'aca.tab.odds': '赔率', 'aca.tab.words': '黑话',
    'aca.level': '难度', 'aca.teach': '带我玩', 'aca.tour': '重看大厅导览', 'aca.coach': '新手提示（21点推荐打法）',
    'aca.start': `<p><b>三件事先知道：</b></p>
      <ol><li><b>筹码是假的。</b>不能充值，也不能兑现。输光了会送救济金。</li>
      <li><b>每一局都是独立的随机。</b>上一把开红，不代表下一把就该开黑。</li>
      <li><b>长期玩，庄家一定赢。</b>赌场游戏的返还率都低于 100%。这里只给你刺激，不给你赚钱的幻觉。</li></ol>
      <p><b>推荐路线：</b>老虎机（只按一个键）→ 百家乐（押庄或闲）→ 21点（有提示）→ 炸金花（开始和人斗心眼）→ 斗地主 / 麻将。</p>
      <p>每个游戏第一次进去，小金会带你走一遍。任何时候点右上角 ⓘ 都能看完整规则。</p>`,
    'aca.odds': `<p><b>赔率</b>：「1 赔 1」是押 100 中了拿回 100 本金再赢 100。「35 赔 1」是押 100 赢 3500。</p>
      <p><b>RTP（返还率）</b>：长期每押 100 平均拿回多少。轮盘 97.3%，就是长期每押 100 亏 2.7。差的那部分叫<b>庄家优势</b>。</p>
      <table><tr><th>游戏</th><th>返还率</th><th>新手最优选</th></tr>
      <tr><td>21点</td><td>≈ 99.4%</td><td>照着基本策略打（开启新手提示）</td></tr>
      <tr><td>百家乐</td><td>98.9%</td><td>押庄（98.94%）或闲（98.76%），别押和（85.6%）</td></tr>
      <tr><td>轮盘</td><td>97.3%</td><td>所有押法一样，只是波动不同</td></tr>
      <tr><td>骰宝</td><td>97.2%</td><td>押大小；单点围骰返还率低很多</td></tr>
      <tr><td>老虎机</td><td>≈ 95%</td><td>下注大小不影响返还率，只影响波动</td></tr>
      <tr><td>棋牌室</td><td>炸金花抽水 5%</td><td>筹码在玩家之间流动，赌场从每个底池抽一口；其余牌桌不抽水</td></tr></table>
      <p><b>两个常见误区：</b></p>
      <ul><li><b>赌徒谬误</b>：「连开五把庄，该开闲了」。不会的，骰子和牌都没有记忆。</li>
      <li><b>输了就加倍（马丁格尔）</b>：连输几把，注码会翻到你押不起，一把就全没了。</li></ul>`,
    'aca.words': `<table>
      <tr><th>词</th><th>意思</th></tr>
      <tr><td>庄 / 闲</td><td>百家乐两边；在牛牛里，庄是坐庄和所有人比的人</td></tr>
      <tr><td>爆牌</td><td>21点超过 21，直接输</td></tr>
      <tr><td>闷</td><td>炸金花不看牌就下注，只付一半</td></tr>
      <tr><td>比牌</td><td>炸金花两人亮牌比大小，小的出局</td></tr>
      <tr><td>豹子 / 顺金 / 金花</td><td>三条 / 同花顺 / 同花</td></tr>
      <tr><td>牛几 / 牛牛</td><td>牛牛点数，牛牛（个位为 0）最大</td></tr>
      <tr><td>地主 / 农民</td><td>斗地主一打二</td></tr>
      <tr><td>王炸 / 春天</td><td>大小王一起出 / 一方一张没出就输了，都翻倍</td></tr>
      <tr><td>定缺</td><td>血战麻将开局选一门花色不要</td></tr>
      <tr><td>碰 / 杠</td><td>拿别人打的牌凑成三张 / 四张一样</td></tr>
      <tr><td>自摸 / 点炮</td><td>自己摸到胡牌 / 打出的牌让别人胡了</td></tr>
      <tr><td>听牌</td><td>只差一张就胡</td></tr>
      <tr><td>围骰</td><td>骰宝三颗一样，大小都输</td></tr>
      <tr><td>收手</td><td>火箭爆炸前拿走当前倍数</td></tr>
      <tr><td>RTP</td><td>长期返还率，越高对玩家越好</td></tr></table>`,
    'aca.g.slots': '按一下就转。完全不用想，最适合第一次。',
    'aca.g.crash': '看着倍数涨，在爆炸前收手。练的是贪心和胆量。',
    'aca.g.plinko': '丢个球看它落哪。可以选风险高低。',
    'aca.g.roulette': '押数字或颜色，等小球停下。押红黑最稳。',
    'aca.g.baccarat': '只要选庄或闲，补牌全自动。最像电影里的赌场。',
    'aca.g.sicbo': '押三颗骰子的大小。开盅那一下最刺激。',
    'aca.g.blackjack': '唯一靠技术能把庄家优势压到很低的赌场游戏。有新手提示。',
    'aca.g.niuniu': '凑 10 的倍数比大小，关键在抢庄和下注倍数。',
    'aca.g.zhajinhua': '三张牌比大小，真正的乐趣是诈唬和看穿诈唬。',
    'aca.g.doudizhu': '一打二出牌游戏，要会算牌和配合。',
    'aca.g.mahjong': '最复杂也最上瘾：定缺、碰杠、听牌、血战到底。',

    'bjc.say': '建议：{a}',
    'bjc.split': '一对 {p}：拆开打，两手都更有希望。',
    'bjc.double': '{t} 点对庄家 {d}：这是你占优的时刻，加倍多赢。',
    'bjc.hitLow': '{t} 点再要一张也不可能爆。',
    'bjc.softHit': '软 {t}（A 当 11）：再要也不会爆，要牌。',
    'bjc.hitWeak': '庄家亮 {d}，很强。{t} 点停下大概率输，要牌搏一下。',
    'bjc.standBust': '庄家亮 {d}，容易爆牌。{t} 点就停，让庄家自己去爆。',
    'bjc.stand': '{t} 点够好了，停牌。'
  };

  const en = {
    'tut.coach': 'Jin · your croupier', 'tut.skip': 'Skip', 'tut.next': 'Next', 'tut.prev': 'Back', 'tut.go': 'Let\'s play!', 'tut.explore': 'I\'ll look around',
    'lobby.academy': 'Casino 101', 'aca.open': 'Open',

    'tut.lobby.1': 'Welcome to Gold & Jade|I am Jin, your croupier. You are standing inside the doors: <b>tap the floor to walk</b> (or WASD / arrow keys), walk up to a machine, table or counter to play or spend. First and most important: every chip here is <b>virtual</b>. Nothing to buy, nothing to cash out.',
    'tut.lobby.2': 'Your chips|Bets come out of here and wins fly back in. Dinner, drinks, a room or a watch come out of here too.',
    'tut.lobby.3': 'This is the casino|Slots, the pit, the card room, the VIP salon, the bar, the restaurant, the lottery hall, the cage. Walk into any of them. Tap a person to talk, tap a machine or table to sit and play.',
    'tut.lobby.4': 'Minimap|Tap anywhere on it to run there. The gold dot is you.',
    'tut.lobby.5': 'Directory|Rather not walk? Every place is listed here: walk there, or play right away. The classic lobby and the lucky wheel live here too.',
    'tut.lobby.6': 'Phone|Messages, loans, achievements and your casino ledger. A red dot means someone wants you.',
    'tut.lobby.7': 'Status|Energy, drink, debt and the time. Stay up and you tire, drink and you sway, borrow and it compounds.',
    'tut.lobby.8': 'Settings|Language, sound, music and voice. You can also plug in a language model to take an opponent\'s seat or speak for the casino host.',
    'tut.lobby.9': 'Casino 101|Tap here any time: how odds work, table slang and a guided lesson for every game.',
    'tut.lobby.10': 'Where to start?|First time: slots (one button) or blackjack (I will coach you). Want to be bluffed? Find someone in the card room for Zha Jin Hua. Or just take a walk.',

    'tut.slots.1': 'Five reels|When they stop, read the middle three rows. Three or more matching symbols on a line <b>starting from the far left</b> win. Ten lines in all.',
    'tut.slots.2': 'Your bet|What each spin costs. Use − / +. Start small and take a few spins.',
    'tut.slots.3': 'Spin!|Tap here or press Space. Tap again while spinning to <b>stop</b> early.',
    'tut.slots.4': 'Auto and turbo|Auto spins on its own until you tap again. Turbo speeds up the animation.',
    'tut.slots.5': 'The big stuff|Three <b>red envelopes</b> give 10 free spins with every win ×3. Wilds expand over the whole reel and stand in for anything but envelopes.',

    'tut.blackjack.1': 'Beat the dealer to 21|Add up your cards and get closer to 21 than the dealer, but <b>go over and you bust</b>. J/Q/K count 10, an ace counts 1 or 11.',
    'tut.blackjack.2': 'Pick a chip|Tap a value.',
    'tut.blackjack.3': 'Tap the bet circle|Each tap adds a chip. Clear takes them back.',
    'tut.blackjack.4': 'Deal|You get two cards face up; the dealer shows one and hides one.',
    'tut.blackjack.5': 'Your turn|<b>Hit</b> takes another card; <b>Stand</b> keeps your total; <b>Double</b> doubles the bet for exactly one card; <b>Split</b> turns a pair into two hands. I will light up the best button and tell you why.',

    'tut.roulette.1': 'The wheel|37 pockets, 0 to 36. Wherever the ball stops is the winning number.',
    'tut.roulette.2': 'The layout|A single number pays <b>35 to 1</b> but hits 1 time in 37. <b>Red/black, odd/even, high/low</b> pay 1 to 1 and hit almost half the time. Start there.',
    'tut.roulette.3': 'Pick a chip|Choose a value, then tap the layout to place it. Bet on as many spots as you like.',
    'tut.roulette.4': 'Spin|When the 0 hits, every even-money bet loses. That is the house edge.',

    'tut.baccarat.1': 'Banker vs player|Each side gets two or three cards; only the last digit counts and <b>closest to 9 wins</b>. Draws follow fixed rules, so you only pick a side.',
    'tut.baccarat.2': 'Which side|Player pays 1 to 1. Banker pays 0.95 to 1 (it wins slightly more often, so the house takes 5%). Tie pays 8 to 1 but rarely hits. Banker is the best bet.',
    'tut.baccarat.3': 'The road|Every result so far. Each hand is independent: the road looks meaningful but predicts nothing.',
    'tut.baccarat.4': 'Deal|Bet and deal. Turn on squeeze to peel your side\'s cards open yourself.',

    'tut.sicbo.1': 'Dice in a cup|Three dice under the cup. After the shake, tap the cup to lift it yourself.',
    'tut.sicbo.2': 'The simple bet|<b>Big</b> (11–17) or <b>small</b> (4–10) pays 1 to 1. But three of a kind beats both.',
    'tut.sicbo.3': 'Roll|Other boxes pay more and hit less: totals, single numbers, doubles and triples.',

    'tut.crash.1': 'Lift off|The multiplier climbs from 1.00× and <b>can explode any moment</b>. Nobody knows where.',
    'tut.crash.2': 'Bet, then cash out|Bet before launch; in flight, press here to <b>cash out</b> at the current multiplier. Still on board when it blows? The stake is gone.',
    'tut.crash.3': 'Auto cash-out|Pick a multiplier and it cashes out for you. 2.00× is a good start.',
    'tut.crash.4': 'Others are playing|Watch where they jump. Some are greedy, some are scared.',

    'tut.plinko.1': 'Plinko|The ball drops through the pegs, bouncing left or right at each one, and lands in a bin that sets your multiplier.',
    'tut.plinko.2': 'Risk|Low: steady multipliers. High: up to 170× at the edges, but the middle bins lose more.',
    'tut.plinko.3': 'Drop!|Tap again and again; several balls can fall at once.',

    'tut.pv.rivals': 'Your rivals|Each one has a character: Hao raises for fun, Ling reads people, Mei plays the beginner. What they say <b>may be true or may be a bluff</b>.',
    'tut.pv.chat': 'Table chat|Everything they say lands here. Ask them "Are you bluffing?" and see what they answer. After the hand, purple lines expose who was bluffing.',

    'tut.zhajinhua.1': 'Zha Jin Hua (three-card brag)|Five players, three cards each. Everyone antes; the last player standing takes the whole pot.',
    'tut.zhajinhua.2': 'Pick the ante, deal|A bigger ante means bigger swings.',
    'tut.zhajinhua.3': 'On your turn|<b>Call</b>: match the current stake. <b>Raise</b>: push it up and scare people off. <b>Look</b>: see your cards; playing blind costs half. <b>Compare</b>: show down with one player, the loser is out. <b>Fold</b>: give up, chips stay in the pot.',
    'tut.zhajinhua.4': 'Hand ranks|Trips > straight flush > flush > straight > pair > high card. Special: an off-suit 2-3-5 beats trips. Full rules here.',

    'tut.niuniu.1': 'Niu Niu (bull bull)|Five cards each, and <b>everyone plays only the banker</b>, not each other.',
    'tut.niuniu.2': 'Pick the base bet, deal|You see 4 cards first.',
    'tut.niuniu.3': 'How it goes|1. <b>Grab the bank</b>: good cards, grab high. 2. Not banker? Pick a <b>bet multiplier</b>. 3. The 5th card shows and your hand is split for you: three cards that make a multiple of 10, and the last digit of the other two is your bull. Bull bull is best.',
    'tut.niuniu.4': 'Special hands|Five faces, four of a kind and five little bulls pay more. Full rules here.',

    'tut.doudizhu.1': 'Dou Di Zhu (fight the landlord)|Three players: one landlord against two farmers. <b>Whoever empties their hand first wins for their side.</b>',
    'tut.doudizhu.2': 'Pick the base, deal|17 cards each, 3 kept aside.',
    'tut.doudizhu.3': 'How to play|First <b>bid</b> 1–3 to become landlord; the landlord takes the 3 extra cards and plays alone. To play, tap cards then Play. Stuck? Press <b>Hint</b>; each press shows another option. Can\'t beat it? Pass.',
    'tut.doudizhu.4': 'Doubling|Bombs (four of a kind) and the rocket (both jokers) double the stakes. All combinations here.',

    'tut.mahjong.1': 'Sichuan mahjong|Only characters, bamboo and dots, and no chow. <b>Make 4 sets + 1 pair to win.</b>',
    'tut.mahjong.2': 'Pick the base, start|13 tiles each, 14 for the dealer.',
    'tut.mahjong.3': 'How to play|First pick a <b>void suit</b>: you must throw all of it before you can win. Then draw one, discard one (tap a tile twice). Others\' discards can be <b>ponged</b> (three of a kind) or <b>konged</b> (four). When you are one tile away, the hint shows what you are waiting for.',
    'tut.mahjong.4': 'Bloody to the end|A win does not end the hand; the rest play on until three have won or the wall runs out. Scoring here.',

    'aca.title': 'Casino 101',
    'aca.tab.start': 'Start', 'aca.tab.games': 'Games', 'aca.tab.odds': 'Odds', 'aca.tab.words': 'Slang',
    'aca.level': 'Difficulty', 'aca.teach': 'Teach me', 'aca.tour': 'Replay the lobby tour', 'aca.coach': 'Beginner tips (best blackjack move)',
    'aca.start': `<p><b>Three things first:</b></p>
      <ol><li><b>The chips are not real.</b> Nothing to buy, nothing to cash out. Go broke and you get a free top-up.</li>
      <li><b>Every round is independent.</b> Red last time does not make black due.</li>
      <li><b>In the long run the house wins.</b> Every casino game returns less than 100%. This place sells the thrill, not a way to make money.</li></ol>
      <p><b>Suggested path:</b> slots (one button) → baccarat (pick a side) → blackjack (with tips) → Zha Jin Hua (mind games) → Dou Di Zhu / mahjong.</p>
      <p>Jin walks you through each game the first time you open it. The ⓘ in every game shows the full rules.</p>`,
    'aca.odds': `<p><b>Odds</b>: "1 to 1" means bet 100, get your 100 back plus 100. "35 to 1" means bet 100, win 3,500.</p>
      <p><b>RTP (return to player)</b>: what comes back per 100 bet over the long run. Roulette is 97.3%, so you lose 2.7 per 100 on average. The gap is the <b>house edge</b>.</p>
      <table><tr><th>Game</th><th>RTP</th><th>Beginner's best</th></tr>
      <tr><td>Blackjack</td><td>≈ 99.4%</td><td>play basic strategy (turn on tips)</td></tr>
      <tr><td>Baccarat</td><td>98.9%</td><td>banker (98.94%) or player (98.76%), never tie (85.6%)</td></tr>
      <tr><td>Roulette</td><td>97.3%</td><td>every bet is the same; only the swings differ</td></tr>
      <tr><td>Sic bo</td><td>97.2%</td><td>big/small; triples pay far less back</td></tr>
      <tr><td>Slots</td><td>≈ 95%</td><td>bet size changes the swings, not the return</td></tr>
      <tr><td>Card room</td><td>5% rake on Brag</td><td>chips move between players and the house skims each Brag pot; the other tables are rake-free</td></tr></table>
      <p><b>Two classic traps:</b></p>
      <ul><li><b>Gambler's fallacy</b>: "five bankers in a row, player is due." It is not. Cards and dice have no memory.</li>
      <li><b>Double after a loss (martingale)</b>: a short losing streak makes the next bet bigger than your stack, and one loss takes everything.</li></ul>`,
    'aca.words': `<table>
      <tr><th>Word</th><th>Meaning</th></tr>
      <tr><td>庄 / 闲 banker / player</td><td>the two sides in baccarat; in Niu Niu the banker plays everyone</td></tr>
      <tr><td>Bust</td><td>over 21 in blackjack: you lose at once</td></tr>
      <tr><td>闷 blind</td><td>betting in Zha Jin Hua without looking; costs half</td></tr>
      <tr><td>比牌 compare</td><td>two players show down in Zha Jin Hua, the lower hand is out</td></tr>
      <tr><td>豹子 / 顺金 / 金花</td><td>trips / straight flush / flush</td></tr>
      <tr><td>牛几 / 牛牛</td><td>your Niu Niu score; bull bull (last digit 0) is best</td></tr>
      <tr><td>地主 / 农民</td><td>landlord / farmers in Dou Di Zhu, one against two</td></tr>
      <tr><td>王炸 / 春天</td><td>both jokers / a side that never played a card; both double the stakes</td></tr>
      <tr><td>定缺 void</td><td>the suit you give up at the start of Sichuan mahjong</td></tr>
      <tr><td>碰 / 杠 pong / kong</td><td>claim a discard to make three / four of a kind</td></tr>
      <tr><td>自摸 / 点炮</td><td>winning on your own draw / discarding the tile someone wins on</td></tr>
      <tr><td>听牌 ready</td><td>one tile from winning</td></tr>
      <tr><td>围骰 triple</td><td>three of a kind in sic bo; big and small both lose</td></tr>
      <tr><td>Cash out</td><td>taking the multiplier before the rocket blows</td></tr>
      <tr><td>RTP</td><td>long-run return; higher is better for you</td></tr></table>`,
    'aca.g.slots': 'Press one button. Nothing to learn, perfect for a first visit.',
    'aca.g.crash': 'Watch the multiplier climb and cash out before it blows. Greed versus nerve.',
    'aca.g.plinko': 'Drop a ball, see where it lands. Pick your risk.',
    'aca.g.roulette': 'Bet a number or a colour and wait for the ball. Red/black is the steady choice.',
    'aca.g.baccarat': 'Pick banker or player; the drawing is automatic. The most movie-casino game there is.',
    'aca.g.sicbo': 'Bet big or small on three dice. Lifting the cup is the moment.',
    'aca.g.blackjack': 'The one casino game where skill pushes the house edge right down. Tips available.',
    'aca.g.niuniu': 'Make a multiple of ten; the real game is grabbing the bank and sizing your bet.',
    'aca.g.zhajinhua': 'Three cards, best hand wins. The fun is bluffing and seeing through bluffs.',
    'aca.g.doudizhu': 'One against two, shedding cards. Count cards, read your partner.',
    'aca.g.mahjong': 'The deepest and most addictive: void suit, pong, kong, waiting tiles, bloody to the end.',

    'bjc.say': 'Coach: {a}',
    'bjc.split': 'A pair of {p}s: split them; two hands, both with a better shot.',
    'bjc.double': '{t} against a dealer {d}: this is your edge. Double up.',
    'bjc.hitLow': '{t}: another card cannot bust you.',
    'bjc.softHit': 'Soft {t} (ace as 11): a card cannot bust you. Hit.',
    'bjc.hitWeak': 'Dealer shows {d}, a strong card. {t} will usually lose standing. Hit.',
    'bjc.standBust': 'Dealer shows {d} and busts often. Stand on {t} and let the dealer bust.',
    'bjc.stand': '{t} is good enough. Stand.'
  };

  Object.assign(I18N._dict.zh, zh);
  Object.assign(I18N._dict.en, en);
})();
