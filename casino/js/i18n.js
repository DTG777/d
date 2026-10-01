/* Chinese / English strings. I18N.t(key, vars) with {var} interpolation. */
(function () {
  const zh = {
    brand: '金玉满堂', title: '金玉满堂 娱乐场',
    'ui.close': '关闭', 'ui.lobby': '大厅', 'ui.rules': '玩法说明', 'ui.bet': '下注',
    'ui.clear': '清空', 'ui.rebet': '重复', 'ui.undo': '撤销', 'ui.placeBet': '下注区',
    'ui.placeBetFirst': '请先下注', 'ui.shuffle': '洗牌中…新牌靴', 'ui.youWin': '赢得 {n}',
    'ui.sayWin': '恭喜，你赢了', 'ui.history': '开奖记录', 'ui.totalBet': '本局总注',
    'toast.noFunds': '筹码不足', 'toast.refill': '救济金到账：10,000 筹码',
    'lvl.up': '升级！', 'lvl.reward': '奖励 {n} 筹码',
    'fx.bigWin': '大 奖', 'fx.megaWin': '巨 奖', 'fx.epicWin': '超级大奖', 'fx.legendWin': '传奇大奖', 'fx.tap': '点击继续',
    'game.slots': '发财777', 'game.blackjack': '21点', 'game.roulette': '轮盘', 'game.baccarat': '百家乐',
    'game.sicbo': '骰宝', 'game.crash': '火箭冲天', 'game.plinko': '弹珠台',
    'tag.slots': '5 轴 10 线 · 扩展百搭 · 红包免费转', 'tag.blackjack': '6 副牌 · 黑杰克 3 赔 2 · 可分牌加倍',
    'tag.roulette': '欧式单零 · 37 格', 'tag.baccarat': '庄闲和 · 亲手咪牌', 'tag.sicbo': '大小单双 · 围骰 180 倍',
    'tag.crash': '倍数狂飙 · 爆炸前收手', 'tag.plinko': '12 排钉 · 最高 170 倍',
    'lobby.eyebrow': '今晚，好运当头', 'lobby.sub': '老虎机、经典赌桌，还有会说话、会诈唬的棋牌对手。全部使用虚拟筹码：赢了尽情欢呼，输了一分钱都不花。',
    'lobby.hot': '热门', 'lobby.disclaimer': '纯娱乐模拟：筹码为虚拟道具，不可充值、不可兑换现金，也没有任何真实价值。',
    'stat.biggest': '最高单笔', 'stat.rounds': '总局数', 'stat.best': '最高倍数', 'stat.level': '等级',
    'stat.wagered': '累计下注', 'stat.won': '累计赢取',
    'bonus.title': '幸运转盘', 'bonus.spin': '转！', 'bonus.ready': '免费转盘已就绪，最高 50,000', 'bonus.next': '距下次免费转盘',
    'bonus.note': '每 4 小时可免费转一次', 'bonus.say': '恭喜获得 {n} 筹码',
    'set.title': '设置', 'set.sfx': '音效', 'set.music': '背景音乐', 'set.voice': '语音播报', 'set.lang': '语言',
    'set.stats': '战绩', 'set.reset': '重置所有进度', 'set.resetConfirm': '再点一次确认重置', 'set.voiceOn': '语音已开启',
    'set.mute': '关闭音效', 'set.unmute': '开启音效',

    'slots.title': '发财 777', 'slots.freeSpins': '免费旋转', 'slots.goodLuck': '祝你好运', 'slots.spin': '旋转',
    'slots.auto': '自动', 'slots.turbo': '极速', 'slots.hint': '空格键旋转 · 旋转中再按一次急停',
    'slots.wild': '百搭', 'slots.noWin': '未中奖', 'slots.win': '赢得', 'slots.fsWin': '免费旋转赢得',
    'slots.lineWin': '第 {n} 线 · {k} 个{s}', 'slots.fsSay': '免费旋转',
    'slots.retrigger': '再得 {n} 次免费旋转！', 'slots.fsWon': '{n} 次免费旋转', 'slots.fsMult': '期间所有奖金 ×{m}',
    'slots.fsTotal': '免费旋转总奖金',
    'slots.r1': '5 轴 3 行，10 条固定赔付线。总注平均分到 10 条线，从最左轴开始连续 3 个及以上相同符号即中奖，下表为单线注的倍数。',
    'slots.r2': '同一条线只按最高组合赔付一次，多条线奖金相加。',
    'slots.r3': '百搭只出现在第 2、3、4 轴，落下后展开覆盖整轴，可替代除红包以外的任何符号。',
    'slots.r4': '红包出现在第 1、3、5 轴。3 个红包赔总注 ×{p}，并触发 {n} 次免费旋转，期间所有奖金 ×{m}，可重复触发。',
    'slots.r5': '理论返还率约 95%。第 1、3 轴出现红包时，第 5 轴会放慢，悬念拉满。',
    'sym.cherry': '樱桃', 'sym.lemon': '柠檬', 'sym.bell': '铃铛', 'sym.bar': 'BAR', 'sym.diamond': '钻石', 'sym.seven': '红 7', 'sym.wild': '百搭', 'sym.scatter': '红包',

    'bj.dealer': '庄家', 'bj.arc1': '黑杰克 3 赔 2', 'bj.arc2': '庄家所有 17 点停牌 · 保险不开放',
    'bj.deal': '发牌', 'bj.hit': '要牌', 'bj.stand': '停牌', 'bj.double': '加倍', 'bj.split': '分牌',
    'bj.sayBJ': '黑杰克！', 'bj.bust': '爆牌', 'bj.sayBust': '爆牌', 'bj.sayDealerBust': '庄家爆牌',
    'bj.dealerBust': '庄家爆牌！', 'bj.blackjack': '黑杰克！', 'bj.push': '平局', 'bj.dealerBJ': '庄家黑杰克',
    'bj.dealerWins': '庄家赢', 'bj.win': '赢', 'bj.lose': '输',
    'bj.rules': `<p>目标：手牌点数比庄家更接近 21 点且不超过 21。</p>
      <ul><li>A 算 1 或 11，J/Q/K 算 10。</li><li>首两张 A + 10 点即“黑杰克”，赔 3:2。</li>
      <li>庄家补牌到 17 点，所有 17 点停牌。庄家明牌为 A 或 10 点时会先偷看底牌。</li>
      <li><b>加倍</b>：首两张牌时追加同额注，只再拿一张。</li><li><b>分牌</b>：两张同点可分成两手（每局一次），分开的 A 各只拿一张。</li>
      <li>平局退回本金。使用 6 副牌。</li></ul><p>快捷键：H 要牌 · S 停牌 · D 加倍 · P 分牌 · 空格 发牌</p>`,

    'rl.spin': '旋转', 'rl.doz1': '第一打 1–12', 'rl.doz2': '第二打 13–24', 'rl.doz3': '第三打 25–36',
    'rl.low': '1–18', 'rl.even': '双', 'rl.odd': '单', 'rl.high': '19–36', 'rl.red': '红', 'rl.black': '黑', 'rl.green': '绿',
    'rl.sayNoMore': '买定离手', 'rl.last': '近 {n} 局',
    'rl.rules': `<p>欧式轮盘，0–36 共 37 格。先放筹码，再按旋转。</p>
      <ul><li>单个号码：35 赔 1</li><li>列（2:1）与打（1–12 等）：2 赔 1</li><li>红/黑、单/双、1–18/19–36：1 赔 1</li>
      <li>开出 0 时，所有外围注全输。</li></ul><p>庄家优势 2.7%。空格键旋转，退格撤销。</p>`,

    'sb.open': '点击开盅', 'sb.road': '路单', 'sb.small': '小', 'sb.big': '大', 'sb.odd': '单', 'sb.even': '双',
    'sb.any3': '全围', 'sb.roll': '摇骰', 'sb.triple': '围骰',
    'sb.rules': `<p>三颗骰子，摇盅后开盅定输赢。</p>
      <ul><li><b>大</b> 11–17、<b>小</b> 4–10、单、双：1 赔 1，开出围骰（三颗相同）时通杀。</li>
      <li>双骰（指定对子）：10 赔 1</li><li>全围（任意三同）：30 赔 1</li><li>指定围骰：180 赔 1</li>
      <li>点数和：4/17 赔 60，5/16 赔 30，6/15 赔 17，7/14 赔 12，8/13 赔 8，9–12 赔 6</li>
      <li>单骰：出现 1 颗赔 1，2 颗赔 2，3 颗赔 3</li></ul><p>摇完后可点骰盅亲手开，或等待自动开盅。中国骰子的 1 点和 4 点是红色的。</p>`,

    'bc.player': '闲', 'bc.banker': '庄', 'bc.tie': '和', 'bc.pp': '闲对', 'bc.bp': '庄对', 'bc.road': '珠盘路',
    'bc.squeeze': '咪牌模式', 'bc.natural': '天生 {n} 点', 'bc.pDraws': '闲家补牌', 'bc.bDraws': '庄家补牌',
    'bc.sqHint': '按住牌往上拖，慢慢咪开', 'bc.sqOpen': '直接开牌', 'bc.playerWins': '闲赢', 'bc.bankerWins': '庄赢', 'bc.tieResult': '和局',
    'bc.bead.p': '闲', 'bc.bead.b': '庄', 'bc.bead.t': '和',
    'bc.rules': `<p>比较庄、闲两家点数，个位数越接近 9 越大。</p>
      <ul><li>A 为 1 点，10/J/Q/K 为 0 点，其余按牌面。</li><li>任一家前两张为 8 或 9 点即“天生赢家”，不再补牌。</li>
      <li>闲家 0–5 点补牌，6–7 停。庄家是否补牌依标准规则（取决于闲家第三张牌）。</li>
      <li>闲 1 赔 1；庄 1 赔 0.95（抽 5% 佣金）；和 8 赔 1，和局时庄闲注退回；庄对/闲对 11 赔 1。</li></ul>
      <p>开启“咪牌模式”后，每张牌都由你亲手拖开，越慢越刺激。</p>`,

    'cr.autoCash': '自动收手', 'cr.players': '本局玩家', 'cr.launchIn': '即将发射', 'cr.crashed': '在 {m}× 爆炸',
    'cr.sayCash': '{m} 倍收手', 'cr.sayBoom': '爆了', 'cr.cancel': '取消下注', 'cr.betPlaced': '已下注 {n}',
    'cr.bet': '下注', 'cr.cashOut': '收手', 'cr.cashedAt': '{m}× 已收手', 'cr.betNext': '下一局下注', 'cr.queued': '已预约下一局',
    'cr.nextRound': '下一局准备中', 'cr.you': '你',
    'cr.rules': `<p>火箭起飞后倍数从 1.00× 持续上涨，随时可能爆炸。</p>
      <ul><li>倒计时内下注，飞行中点击“收手”，按当前倍数赢得奖金。</li><li>爆炸前没收手，本注全输。</li>
      <li>可设定自动收手倍数，到点自动兑现。</li><li>约 3% 的局会在 1.00× 当场爆炸；理论返还率 97%。</li></ul>`,

    'pl.low': '低风险', 'pl.medium': '中风险', 'pl.high': '高风险', 'pl.drop': '投球', 'pl.session': '本次盈亏',
    'pl.rules': `<p>小球从顶部落下，穿过 {rows} 排钉子，每碰一颗钉随机向左或向右，最终落入底部格子，按格子倍数赔付。</p>
      <ul><li>越靠边越难落入，倍数越高。</li><li>高风险：边缘 170×，中间 0.2×。</li><li>可以连续投多个球，也可开启自动投球。</li></ul><p>理论返还率约 99%。</p>`
  };

  const en = {
    brand: 'Gold & Jade', title: 'Gold & Jade Casino',
    'ui.close': 'Close', 'ui.lobby': 'Lobby', 'ui.rules': 'How to play', 'ui.bet': 'Bet',
    'ui.clear': 'Clear', 'ui.rebet': 'Rebet', 'ui.undo': 'Undo', 'ui.placeBet': 'Bet here',
    'ui.placeBetFirst': 'Place a bet first', 'ui.shuffle': 'Shuffling a fresh shoe…', 'ui.youWin': 'You win {n}',
    'ui.sayWin': 'Winner!', 'ui.history': 'Results', 'ui.totalBet': 'Total bet',
    'toast.noFunds': 'Not enough chips', 'toast.refill': 'Refill: 10,000 chips on the house',
    'lvl.up': 'Level up!', 'lvl.reward': '+{n} chips',
    'fx.bigWin': 'BIG WIN', 'fx.megaWin': 'MEGA WIN', 'fx.epicWin': 'EPIC WIN', 'fx.legendWin': 'LEGENDARY', 'fx.tap': 'Tap to continue',
    'game.slots': 'Fortune Sevens', 'game.blackjack': 'Blackjack', 'game.roulette': 'Roulette', 'game.baccarat': 'Baccarat',
    'game.sicbo': 'Sic Bo', 'game.crash': 'Rocket Crash', 'game.plinko': 'Plinko',
    'tag.slots': '5 reels, 10 lines, expanding wilds, free spins', 'tag.blackjack': '6 decks, blackjack pays 3:2, split & double',
    'tag.roulette': 'European single zero, 37 pockets', 'tag.baccarat': 'Player, Banker, Tie. Squeeze your own cards', 'tag.sicbo': 'Big, Small, triples pay 180×',
    'tag.crash': 'Ride the multiplier, bail before the boom', 'tag.plinko': '12 rows of pegs, up to 170×',
    'lobby.eyebrow': 'Tonight the house is on you', 'lobby.sub': 'Slots, classic tables and card-room rivals who talk and bluff. All virtual chips: win loud, lose nothing real.',
    'lobby.hot': 'Hot', 'lobby.disclaimer': 'Entertainment only. Chips are virtual, cannot be bought or cashed out, and have no real-world value.',
    'stat.biggest': 'Biggest win', 'stat.rounds': 'Rounds played', 'stat.best': 'Best multiplier', 'stat.level': 'Level',
    'stat.wagered': 'Total wagered', 'stat.won': 'Total won',
    'bonus.title': 'Lucky Wheel', 'bonus.spin': 'SPIN', 'bonus.ready': 'Free spin ready, up to 50,000', 'bonus.next': 'Next free spin in',
    'bonus.note': 'One free spin every 4 hours', 'bonus.say': 'You won {n} chips',
    'set.title': 'Settings', 'set.sfx': 'Sound effects', 'set.music': 'Lounge music', 'set.voice': 'Voice callouts', 'set.lang': 'Language',
    'set.stats': 'Your record', 'set.reset': 'Reset all progress', 'set.resetConfirm': 'Tap again to reset', 'set.voiceOn': 'Voice on',
    'set.mute': 'Mute sound', 'set.unmute': 'Unmute sound',

    'slots.title': 'FORTUNE SEVENS', 'slots.freeSpins': 'Free spins', 'slots.goodLuck': 'Good luck', 'slots.spin': 'SPIN',
    'slots.auto': 'Auto', 'slots.turbo': 'Turbo', 'slots.hint': 'Space to spin · press again while spinning to slam-stop',
    'slots.wild': 'WILD', 'slots.noWin': 'No win', 'slots.win': 'Win', 'slots.fsWin': 'Free spin win',
    'slots.lineWin': 'Line {n} · {k}× {s}', 'slots.fsSay': 'Free spins!',
    'slots.retrigger': '+{n} free spins!', 'slots.fsWon': '{n} FREE SPINS', 'slots.fsMult': 'All wins ×{m}',
    'slots.fsTotal': 'Free spins total',
    'slots.r1': '5 reels, 3 rows, 10 fixed paylines. Your total bet is split across the 10 lines. Three or more matching symbols from the leftmost reel win; the table shows multiples of the line bet.',
    'slots.r2': 'Each line pays its highest combination only. Wins on different lines add up.',
    'slots.r3': 'Wilds land on reels 2, 3 and 4, expand to fill the whole reel, and substitute for everything except the red envelope.',
    'slots.r4': 'Red envelopes land on reels 1, 3 and 5. Three of them pay ×{p} your total bet and award {n} free spins where every win is ×{m}. Free spins can retrigger.',
    'slots.r5': 'Theoretical return about 95%. When envelopes hit reels 1 and 3, reel 5 slows down for the reveal.',
    'sym.cherry': 'Cherry', 'sym.lemon': 'Lemon', 'sym.bell': 'Bell', 'sym.bar': 'BAR', 'sym.diamond': 'Diamond', 'sym.seven': 'Red 7', 'sym.wild': 'Wild', 'sym.scatter': 'Red envelope',

    'bj.dealer': 'Dealer', 'bj.arc1': 'Blackjack pays 3 to 2', 'bj.arc2': 'Dealer stands on all 17s · no insurance',
    'bj.deal': 'DEAL', 'bj.hit': 'Hit', 'bj.stand': 'Stand', 'bj.double': 'Double', 'bj.split': 'Split',
    'bj.sayBJ': 'Blackjack!', 'bj.bust': 'BUST', 'bj.sayBust': 'Bust', 'bj.sayDealerBust': 'Dealer busts',
    'bj.dealerBust': 'Dealer busts!', 'bj.blackjack': 'BLACKJACK!', 'bj.push': 'Push', 'bj.dealerBJ': 'Dealer blackjack',
    'bj.dealerWins': 'Dealer wins', 'bj.win': 'WIN', 'bj.lose': 'LOSE',
    'bj.rules': `<p>Beat the dealer by finishing closer to 21 without going over.</p>
      <ul><li>Aces count 1 or 11, face cards count 10.</li><li>An ace plus a ten-value card on the first two cards is Blackjack and pays 3:2.</li>
      <li>The dealer draws to 17 and stands on all 17s. With an ace or ten showing, the dealer peeks for blackjack.</li>
      <li><b>Double</b>: add an equal bet on your first two cards and take exactly one more card.</li><li><b>Split</b>: split a pair into two hands once per round. Split aces get one card each.</li>
      <li>Ties push and return your bet. Six-deck shoe.</li></ul><p>Keys: H hit · S stand · D double · P split · Space deal</p>`,

    'rl.spin': 'SPIN', 'rl.doz1': '1st 12', 'rl.doz2': '2nd 12', 'rl.doz3': '3rd 12',
    'rl.low': '1–18', 'rl.even': 'EVEN', 'rl.odd': 'ODD', 'rl.high': '19–36', 'rl.red': 'Red', 'rl.black': 'Black', 'rl.green': 'Green',
    'rl.sayNoMore': 'No more bets', 'rl.last': 'Last {n} spins',
    'rl.rules': `<p>European wheel with 37 pockets, 0 to 36. Place chips, then spin.</p>
      <ul><li>Straight number: 35 to 1</li><li>Columns (2:1) and dozens: 2 to 1</li><li>Red/Black, Odd/Even, 1–18/19–36: 1 to 1</li>
      <li>When 0 hits, every outside bet loses.</li></ul><p>House edge 2.7%. Space to spin, Backspace to undo.</p>`,

    'sb.open': 'Tap to open', 'sb.road': 'Road', 'sb.small': 'SMALL', 'sb.big': 'BIG', 'sb.odd': 'ODD', 'sb.even': 'EVEN',
    'sb.any3': 'ANY TRIPLE', 'sb.roll': 'ROLL', 'sb.triple': 'Triple',
    'sb.rules': `<p>Three dice are shaken under a cup, then revealed.</p>
      <ul><li><b>Big</b> 11–17, <b>Small</b> 4–10, Odd, Even: 1 to 1. All four lose on a triple.</li>
      <li>Specific double: 10 to 1</li><li>Any triple: 30 to 1</li><li>Specific triple: 180 to 1</li>
      <li>Totals: 4/17 pay 60, 5/16 pay 30, 6/15 pay 17, 7/14 pay 12, 8/13 pay 8, 9–12 pay 6</li>
      <li>Single number: 1 to 1 per matching die (up to 3 to 1)</li></ul><p>Tap the cup to lift it yourself, or wait for the dealer. On Chinese dice the 1 and 4 are red.</p>`,

    'bc.player': 'PLAYER', 'bc.banker': 'BANKER', 'bc.tie': 'TIE', 'bc.pp': 'P PAIR', 'bc.bp': 'B PAIR', 'bc.road': 'Bead road',
    'bc.squeeze': 'Squeeze mode', 'bc.natural': 'Natural {n}', 'bc.pDraws': 'Player draws', 'bc.bDraws': 'Banker draws',
    'bc.sqHint': 'Drag the card upward to squeeze it open', 'bc.sqOpen': 'Reveal', 'bc.playerWins': 'Player wins', 'bc.bankerWins': 'Banker wins', 'bc.tieResult': 'Tie',
    'bc.bead.p': 'P', 'bc.bead.b': 'B', 'bc.bead.t': 'T',
    'bc.rules': `<p>Bet on the hand whose total ends closest to 9.</p>
      <ul><li>Aces count 1, tens and face cards count 0, everything else counts face value. Only the last digit matters.</li>
      <li>An 8 or 9 on the first two cards is a Natural and ends the hand.</li>
      <li>Player draws on 0–5 and stands on 6–7. The Banker follows the standard third-card table.</li>
      <li>Player pays 1:1, Banker pays 0.95:1 (5% commission), Tie pays 8:1 and pushes Player/Banker bets. Pairs pay 11:1.</li></ul>
      <p>With Squeeze mode on you peel every card open yourself.</p>`,

    'cr.autoCash': 'Auto cash-out', 'cr.players': 'Players this round', 'cr.launchIn': 'Launching in', 'cr.crashed': 'Crashed at {m}×',
    'cr.sayCash': 'Cashed out at {m}', 'cr.sayBoom': 'Boom', 'cr.cancel': 'Cancel bet', 'cr.betPlaced': 'Bet {n} placed',
    'cr.bet': 'BET', 'cr.cashOut': 'CASH OUT', 'cr.cashedAt': 'Cashed at {m}×', 'cr.betNext': 'Bet next round', 'cr.queued': 'Queued for next round',
    'cr.nextRound': 'Next round loading', 'cr.you': 'You',
    'cr.rules': `<p>The rocket launches at 1.00× and the multiplier climbs until it explodes.</p>
      <ul><li>Bet during the countdown, then hit Cash Out while it flies to win your bet times the current multiplier.</li><li>If it explodes before you cash out, the bet is lost.</li>
      <li>Set an auto cash-out target to lock in a multiplier automatically.</li><li>About 3% of rounds bust instantly at 1.00×. Theoretical return 97%.</li></ul>`,

    'pl.low': 'Low', 'pl.medium': 'Medium', 'pl.high': 'High', 'pl.drop': 'DROP', 'pl.session': 'Session net',
    'pl.rules': `<p>The ball falls through {rows} rows of pegs, bouncing left or right at each one, and lands in a bin that sets your multiplier.</p>
      <ul><li>Edge bins are rare and pay the most.</li><li>High risk: 170× on the edges, 0.2× in the middle.</li><li>Drop several balls at once, or turn on Auto.</li></ul><p>Theoretical return about 99%.</p>`
  };

  const DICT = { zh, en };
  let lang = (() => {
    const saved = LS.get('lang', null);
    if (saved === 'zh' || saved === 'en') return saved;
    return (navigator.language || '').toLowerCase().startsWith('zh') ? 'zh' : 'en';
  })();
  document.documentElement.lang = lang === 'zh' ? 'zh-CN' : 'en';

  window.I18N = {
    get lang() { return lang; },
    t(k, vars) {
      let s = DICT[lang][k];
      if (s == null) s = DICT.en[k];
      if (s == null) return k;
      if (vars) s = s.replace(/\{(\w+)\}/g, (m, v) => vars[v] != null ? vars[v] : m);
      return s;
    },
    set(l) {
      lang = l; LS.set('lang', l);
      document.documentElement.lang = l === 'zh' ? 'zh-CN' : 'en';
      dispatchEvent(new Event('langchange'));
    },
    apply(root) {
      root.querySelectorAll('[data-i18n]').forEach(el => { el.textContent = this.t(el.dataset.i18n); });
      root.querySelectorAll('[data-i18n-aria]').forEach(el => { el.setAttribute('aria-label', this.t(el.dataset.i18nAria)); });
    },
    _dict: DICT
  };
})();
