/* Strings for the card room (棋牌), AI opponents, new slots and the tutorial.
   Merged into I18N's dictionaries; same keys in both languages. */
(function () {
  const zh = {
    'game.zhajinhua': '炸金花', 'game.niuniu': '抢庄牛牛', 'game.doudizhu': '斗地主', 'game.mahjong': '血战麻将',
    'tag.zhajinhua': '5 人桌 · 闷牌 · 比牌 · 会诈唬的对手', 'tag.niuniu': '抢庄 · 下注 · 开牌比牛', 'tag.doudizhu': '叫地主 · 炸弹翻倍 · 春天', 'tag.mahjong': '四川血战到底 · 定缺 · 碰杠胡',

    'pv.you': '你', 'pv.chat': '牌桌聊天', 'pv.sayPh': '说点什么… 也可以诈他们', 'pv.send': '发送',
    'pv.q1': '你是不是在诈？', 'pv.q2': '我牌很大，劝你别跟', 'pv.q3': '跟到底！', 'pv.q4': '快点啦，等得花都谢了',
    'pv.q5': '发财发财', 'pv.q6': '我不信', 'pv.q7': '这把我让你', 'pv.q8': '好牌！',
    'pv.waiting': '对手思考中…', 'pv.broke': '筹码不足以开局，回大厅领取救济金或换小一点的桌', 'pv.stake': '底注', 'pv.deal': '开局',
    'pv.rebuy': '{who} 又买了 {n} 筹码', 'pv.style': '风格', 'pv.loose': '激进，爱加注', 'pv.tight': '稳健，少出手', 'pv.steady': '中规中矩',
    'pv.bluffs': '诈唬倾向', 'pv.brain': '大脑', 'pv.brainLLM': 'AI 大模型（真的会思考和说谎）', 'pv.brainScript': '脚本人设', 'pv.chips': '筹码',

    'zj.high': '单张', 'zj.pair': '对子', 'zj.straight': '顺子', 'zj.flush': '金花', 'zj.sflush': '顺金', 'zj.trips': '豹子',
    'zj.look': '看牌', 'zj.call': '跟注 {n}', 'zj.raise': '加到 ×{m} · {n}', 'zj.compare': '比牌…', 'zj.compareWith': '和{who}比牌', 'zj.fold': '弃牌',
    'zj.blind': '闷', 'zj.seen': '已看', 'zj.folded': '弃牌', 'zj.dealer': '庄', 'zj.called': '跟 {n}', 'zj.raised': '加注 ×{m}',
    'zj.lap': '第 {n}/{m} 轮 · 单注 ×{u}', 'zj.idle': '选好底注，开局', 'zj.youHave': '你的牌：{c}', 'zj.blindHint': '你在闷牌：不看牌跟注只要一半价钱。想看就点「看牌」。',
    'zj.pick': '点一位对手和他比牌', 'zj.vs': '比 牌', 'zj.cmpWin': '{who} 比赢了', 'zj.showdown': '开 牌', 'zj.winBy': '{who} 赢下底池 {c}',
    'zj.rake': '抽水 {n}', 'game.vipzjh': '贵宾厅炸金花', 'tag.vipzjh': '4 人私人局 · 底注 1,000 起 · 赌神坐镇', 'lobby.rake': '对战 · 抽水 5%', 'lobby.vip': '贵宾',
    'vip.gateT': '贵宾厅', 'vip.gate': '贵宾厅只对金卡以上会员，或携带 200,000 以上筹码的客人开放。', 'vip.introT': '赌神', 'vip.intro': '坐。这张桌子不看运气，只看谁先眨眼。', 'vip.terms': '底注 1,000 起 · 抽水 5%（封顶 10 倍底注）', 'vip.sit': '入座', 'vip.who': '高进 · 人称赌神',
    'zj.stakeHint': '底注越大，跟注和加注越贵。新手建议 10 或 50。',
    'zj.rules': `<p><b>一句话：</b>每人三张牌，比谁大。你可以不看牌（闷）也可以看牌，靠下注和嘴上功夫把别人吓走，最后剩下的人或比牌赢的人拿走整个底池。</p>
      <h3>牌型（从大到小）</h3><ol><li><b>豹子</b> 三张一样，如 AAA</li><li><b>顺金</b> 同花色的顺子，如 ♥4 5 6</li><li><b>金花</b> 三张同花色</li><li><b>顺子</b> 三张连号，A23 最小，QKA 最大</li><li><b>对子</b> 两张一样</li><li><b>单张</b> 比最大那张</li></ol>
      <p>特殊：花色不同的 <b>235</b> 可以吃掉豹子。</p>
      <h3>每轮你可以</h3><ul><li><b>看牌</b>：看自己的牌（不算一次行动）。看过以后跟注要付双倍。</li><li><b>跟注</b>：付当前单注留在牌局里。</li><li><b>加注</b>：把单注抬高，后面的人都得跟更多。</li><li><b>比牌</b>（第二轮起）：付一注，和某人亮牌比大小，输的出局。平局算发起人输。</li><li><b>弃牌</b>：放弃，已下的筹码归底池。</li></ul>
      <p><b>心理战：</b>对手会说话，会诈你，牌烂时喊得最凶，牌好时装可怜。你也可以在聊天里诈他们。12 轮后所有人强制开牌。</p>`,

    'nn.wuxiao': '五小牛', 'nn.bomb': '炸弹牛', 'nn.wuhua': '五花牛', 'nn.niuniu': '牛牛', 'nn.none': '没牛', 'nn.niu': '牛{n}',
    'nn.grabPhase': '抢庄：倍数最高的人当庄', 'nn.betPhase': '{who} 当庄 ×{m}，闲家选择下注倍数', 'nn.idle': '选好底注，开局',
    'nn.banker': '庄', 'nn.grabbed': '抢 ×{m}', 'nn.noGrab': '不抢', 'nn.grab': '抢 ×{m}', 'nn.isBanker': '{who} 坐庄 ×{m}',
    'nn.yourFour': '你的四张点数：{p}。', 'nn.hasBase': '已经凑出 10 的倍数，牛在第五张！', 'nn.needFifth': '还没凑出 10，看第五张的运气。',
    'nn.stakeHint': '赢输 = 底注 × 庄的倍数 × 你的下注倍数 × 牌型倍数。',
    'nn.rules': `<p><b>一句话：</b>五张牌里找出三张加起来是 10 的倍数（A=1，10/J/Q/K=10），剩下两张相加的个位就是你的「牛几」。每个闲家只和庄家比。</p>
      <h3>流程</h3><ol><li>先看到自己的 4 张牌。</li><li><b>抢庄</b>：选 0–4 倍，倍数最高的当庄（同倍随机）。</li><li><b>下注</b>：闲家选 1–5 倍。</li><li>亮出第五张，和庄家比。</li></ol>
      <h3>牌型与倍数</h3><ul><li>没牛 ~ 牛6：×1</li><li>牛7、牛8：×2</li><li>牛9：×3</li><li>牛牛（剩下两张也是 10 的倍数）：×4</li><li>五花牛（全是 JQK）：×5</li><li>炸弹牛（四张一样）：×6</li><li>五小牛（五张都小于 5 且总和 ≤ 10）：×8</li></ul>
      <p>同牌型比最大的单张（K 最大，黑桃 > 红桃 > 梅花 > 方块）。按赢家的牌型倍数付钱。</p>`,

    'dz.landlord': '地主', 'dz.farmer': '农民', 'dz.mult': '底 {b} · 倍数 ×{m}', 'dz.idle': '三人斗地主：选底注开局',
    'dz.bid': '{n} 分', 'dz.noBid': '不叫', 'dz.bidN': '叫 {n} 分', 'dz.pass': '不出', 'dz.hint': '提示', 'dz.play': '出牌', 'dz.invalid': '不成牌型',
    'dz.beat': '要压过{who}的{c}，或者不出', 'dz.lead': '你先出：任意合法牌型都行', 'dz.cannot': '要不起，只能不出',
    'dz.bidHint': '手牌强度 {s}（大于 4 可以考虑叫 3 分）', 'dz.isLandlord': '{who} 当地主！', 'dz.redeal': '都不叫，重新发牌',
    'dz.bomb': '炸 弹 ×2', 'dz.rocket': '王 炸 ×2', 'dz.spring': '春 天 ×2', 'dz.antiSpring': '反 春 ×2',
    'dz.stakeHint': '输赢 = 底注 × 叫分 × 2^炸弹数。地主一个人打两家，输赢都是双份。',
    'dz.c.single': '单张', 'dz.c.pair': '对子', 'dz.c.trio': '三张', 'dz.c.trio1': '三带一', 'dz.c.trio2': '三带二', 'dz.c.straight': '顺子', 'dz.c.dstraight': '连对',
    'dz.c.plane': '飞机', 'dz.c.plane1': '飞机带翅膀', 'dz.c.plane2': '飞机带对', 'dz.c.four2': '四带二', 'dz.c.four2p': '四带两对', 'dz.c.bomb': '炸弹', 'dz.c.rocket': '王炸',
    'dz.rules': `<p><b>一句话：</b>三个人，一个地主对两个农民。谁先把手里的牌出完，谁那一方就赢。</p>
      <h3>大小</h3><p>3 &lt; 4 &lt; … &lt; K &lt; A &lt; 2 &lt; 小王 &lt; 大王。花色不分大小。</p>
      <h3>流程</h3><ol><li>每人 17 张，留 3 张底牌。</li><li><b>叫地主</b>：轮流叫 1、2、3 分或不叫，最高的当地主，拿走 3 张底牌，先出牌。</li><li>下家必须出<b>同样牌型</b>且更大的牌，或者「不出」。两家都不出，最后出牌的人重新随便出。</li></ol>
      <h3>牌型</h3><ul><li>单张、对子、三张、三带一、三带二</li><li>顺子：5 张以上连号（不能带 2 和王）</li><li>连对：3 对以上连号</li><li>飞机：两个以上连号的三张，可带同数量的单张或对子</li><li>四带二</li><li><b>炸弹</b>：四张一样，能压任何非炸弹，倍数 ×2</li><li><b>王炸</b>：大小王，天下最大，倍数 ×2</li></ul>
      <p><b>春天</b>：地主出完时农民一张没出过（或反过来），再 ×2。</p><p>选好牌按「出牌」，不会出就按「提示」。可以在牌上滑动多选。</p>`,

    'mj.wall': '剩余', 'mj.idle': '四人血战：选底注开局', 'mj.dealer': '庄', 'mj.zimo': '自摸', 'mj.hu': '胡', 'mj.fan': '{n} 番',
    'mj.lackTag': '缺{s}', 'mj.lack': '缺 {s}（{n} 张）', 'mj.pong': '碰', 'mj.kong': '杠', 'mj.kongT': '杠 {t}', 'mj.pass': '过', 'mj.discard': '打出',
    'mj.tapAgain': '再点一次打出 {t}', 'mj.lackHint': '定缺：选一门你最少的花色，这门牌必须全部打掉才能胡。', 'mj.youWon': '你已经胡了！看其他人继续血战。',
    'mj.waits': '听牌！等 {w}', 'mj.shanten': '还差 {n} 步听牌', 'mj.discardHint': '点一张牌选中，再点一次打出', 'mj.claimHint': '{who} 打出 {t}，你可以：',
    'mj.winBy': '{who} {n} · {f} 番', 'mj.exhaust': '流局 · 查叫',
    'mj.stakeHint': '每番翻倍：平胡 = 底注 ×1，三番 = ×8。自摸每家再多付一份底注。',
    'mj.f.base': '平胡', 'mj.f.self': '自摸', 'mj.f.pong': '对对胡', 'mj.f.flush': '清一色', 'mj.f.seven': '七对', 'mj.f.gen': '根', 'mj.f.single': '金钩钓', 'mj.f.kongDraw': '杠上花', 'mj.f.kongDiscard': '杠上炮', 'mj.f.last': '海底捞月',
    'mj.rules': `<p><b>一句话：</b>凑出 4 组 + 1 对就胡了。一组 = 三张一样（刻子）或三张同花色连号（顺子），一对 = 两张一样。</p>
      <h3>牌</h3><p>只有万、条、筒三种花色，各 1–9，每张 4 份，共 108 张。没有字牌，不能吃，只能碰和杠。</p>
      <h3>流程</h3><ol><li><b>定缺</b>：开局选一门花色作为「缺」，这门牌必须全部打掉才能胡。</li><li>轮到你：摸一张，再打一张。</li><li>别人打出的牌，你手里有两张一样可以<b>碰</b>，有三张可以<b>杠</b>，能凑成胡就<b>胡</b>。</li><li><b>血战到底</b>：有人胡了游戏不结束，剩下的人继续打，直到三家胡牌或牌摸完。</li></ol>
      <h3>番数（每番翻倍）</h3><ul><li>对对胡 +1，清一色 +2，七对 +2，根（四张一样）每个 +1</li><li>金钩钓、杠上花、杠上炮、海底捞月 各 +1，最多 5 番</li></ul>
      <p>杠也收钱：暗杠每家 2 倍底注，明杠由打牌的人付 2 倍。流局时没听牌的人赔给听牌的人（查叫）。界面会提示你听哪几张。</p>`,

    'ai.title': 'AI 对手（大模型）', 'ai.lead': '把一位庄家对手交给真正的大语言模型：它会读规则、读牌桌、读你的聊天，决定怎么打，也会在聊天里诈你。不开也能玩，默认由脚本人设陪你打。',
    'ai.enable': '启用 AI 对手', 'ai.base': '接口地址 (Anthropic 兼容)', 'ai.key': 'API 密钥', 'ai.model': '模型', 'ai.seats': 'AI 座位数',
    'ai.proxy': '已通过本地服务器接入模型：{m}（密钥留在服务器上）', 'ai.note': '密钥只保存在本设备的浏览器存储里，只发往你填写的接口地址，不会进入代码或分享链接。', 'ai.test': '测试连接', 'ai.testing': '测试中…', 'ai.ok': '连接成功：{r}', 'ai.fail': '连接失败：{e}', 'ai.save': '保存',
    'set.ai': 'AI 对手', 'set.aiOpen': '设置',
    'lobby.cardroom': '棋牌室', 'lobby.slots': '老虎机', 'lobby.tables': '赌桌', 'lobby.instant': '快速游戏', 'lobby.all': '全部',
    'lobby.withAI': '对手会说话', 'pv.wasBluff': '亮牌了：{who} 刚才说「{s}」——其实牌不怎么样，是在诈你。', 'pv.wasSandbag': '亮牌了：{who} 刚才说「{s}」——其实牌很大，是在装弱钓你。',
    'pv.mind': '{who} 的心声：{s}', 'pv.mindSaid': '（嘴上说的是「{s}」）', 'lobby.noRake': '对战 · 不抽水', 'ai.saved': '已保存',
    'lobby.cardroomSub': '和会说话、会诈唬、会记仇的对手同桌', 'lobby.slotsSub': '转轴、免费旋转、大奖', 'lobby.tablesSub': '经典赌桌，规则就是赔率', 'lobby.instantSub': '几秒一局，心跳加速'
  };

  const en = {
    'game.zhajinhua': 'Three Card Brag', 'game.niuniu': 'Bull Bull', 'game.doudizhu': 'Fight the Landlord', 'game.mahjong': 'Sichuan Mahjong',
    'tag.zhajinhua': '5 seats, play blind, compare, bluffing rivals', 'tag.niuniu': 'Grab the bank, bet, reveal the bull', 'tag.doudizhu': 'Bid for landlord, bombs double, spring', 'tag.mahjong': 'Blood-to-the-end, void suit, pong kong win',

    'pv.you': 'You', 'pv.chat': 'Table chat', 'pv.sayPh': 'Say something... or bluff them', 'pv.send': 'Send',
    'pv.q1': 'Are you bluffing?', 'pv.q2': 'Big hand here. Do not follow.', 'pv.q3': 'I am calling all the way!', 'pv.q4': 'Any day now...',
    'pv.q5': 'Good luck all', 'pv.q6': 'I do not buy it', 'pv.q7': 'I will let you have this one', 'pv.q8': 'Nice hand!',
    'pv.waiting': 'Opponents are thinking...', 'pv.broke': 'Not enough chips to deal here. Grab the refill in the lobby or pick a smaller stake.', 'pv.stake': 'Stake', 'pv.deal': 'Deal',
    'pv.rebuy': '{who} bought {n} more chips', 'pv.style': 'Style', 'pv.loose': 'Loose, loves to raise', 'pv.tight': 'Tight, picks spots', 'pv.steady': 'Steady',
    'pv.bluffs': 'Bluffing', 'pv.brain': 'Brain', 'pv.brainLLM': 'Language model (really thinks, really lies)', 'pv.brainScript': 'Scripted persona', 'pv.chips': 'Chips',

    'zj.high': 'High card', 'zj.pair': 'Pair', 'zj.straight': 'Straight', 'zj.flush': 'Flush', 'zj.sflush': 'Straight flush', 'zj.trips': 'Trips',
    'zj.look': 'Look', 'zj.call': 'Call {n}', 'zj.raise': 'Raise ×{m} · {n}', 'zj.compare': 'Compare...', 'zj.compareWith': 'Compare with {who}', 'zj.fold': 'Fold',
    'zj.blind': 'Blind', 'zj.seen': 'Seen', 'zj.folded': 'Folded', 'zj.dealer': 'D', 'zj.called': 'Call {n}', 'zj.raised': 'Raise ×{m}',
    'zj.lap': 'Lap {n}/{m} · unit ×{u}', 'zj.idle': 'Pick a stake and deal', 'zj.youHave': 'Your hand: {c}', 'zj.blindHint': 'You are playing blind: calls cost half while you have not looked. Tap Look to see your cards.',
    'zj.pick': 'Tap an opponent to compare hands', 'zj.vs': 'SHOWDOWN', 'zj.cmpWin': '{who} wins the compare', 'zj.showdown': 'SHOWDOWN', 'zj.winBy': '{who} takes the pot {c}',
    'zj.rake': 'Rake {n}', 'game.vipzjh': 'VIP Brag', 'tag.vipzjh': '4-seat private game · antes from 1,000 · the God of Gamblers', 'lobby.rake': 'PvP · 5% rake', 'lobby.vip': 'VIP',
    'vip.gateT': 'VIP salon', 'vip.gate': 'The VIP salon is open to Gold members and above, or guests carrying 200,000 chips or more.', 'vip.introT': 'God of Gamblers', 'vip.intro': 'Sit. Luck doesn\'t play at this table. Only who blinks first.', 'vip.terms': 'Antes from 1,000 · 5% rake (capped at 10 antes)', 'vip.sit': 'Take a seat', 'vip.who': 'Ko Chun · the God of Gamblers',
    'zj.stakeHint': 'Bigger antes make every call and raise pricier. New players: try 10 or 50.',
    'zj.rules': `<p><b>In one line:</b> three cards each, best hand wins. Play blind or look, push others out with bets and table talk; the last player standing, or the winner of a compare, takes the whole pot.</p>
      <h3>Hands (high to low)</h3><ol><li><b>Trips</b> three of a kind, e.g. AAA</li><li><b>Straight flush</b> e.g. ♥4 5 6</li><li><b>Flush</b> three of one suit</li><li><b>Straight</b> three in a row; A23 lowest, QKA highest</li><li><b>Pair</b></li><li><b>High card</b></li></ol>
      <p>Special: an off-suit <b>2-3-5</b> beats trips.</p>
      <h3>On your turn</h3><ul><li><b>Look</b> at your cards (free). After looking, calls cost double.</li><li><b>Call</b> the current stake to stay in.</li><li><b>Raise</b> the stake unit; everyone after you pays more.</li><li><b>Compare</b> (from lap 2): pay one stake and show hands with one player; the lower hand is out. Ties lose for the one who asked.</li><li><b>Fold</b>: give up; your chips stay in the pot.</li></ul>
      <p><b>Mind games:</b> opponents talk. They bluff, shout loudest with junk and play meek with monsters. You can bluff them back in the chat. After 12 laps everyone shows.</p>`,

    'nn.wuxiao': 'Five little bulls', 'nn.bomb': 'Bomb bull', 'nn.wuhua': 'Five faces', 'nn.niuniu': 'Bull Bull', 'nn.none': 'No bull', 'nn.niu': 'Bull {n}',
    'nn.grabPhase': 'Grab the bank: the highest grab becomes banker', 'nn.betPhase': '{who} is banker ×{m}. Players choose a bet multiplier', 'nn.idle': 'Pick a stake and deal',
    'nn.banker': 'Bank', 'nn.grabbed': 'Grab ×{m}', 'nn.noGrab': 'No grab', 'nn.grab': 'Grab ×{m}', 'nn.isBanker': '{who} banks ×{m}',
    'nn.yourFour': 'Your four cards: {p}.', 'nn.hasBase': 'Three of them already make a ten: your bull rides on card five!', 'nn.needFifth': 'No ten yet. It all rides on card five.',
    'nn.stakeHint': 'Win or lose = stake × banker grab × your bet × hand multiplier.',
    'nn.rules': `<p><b>In one line:</b> among five cards find three that add up to a multiple of 10 (A=1, 10/J/Q/K=10). The last digit of the other two is your bull. Every player only plays the banker.</p>
      <h3>Flow</h3><ol><li>See four of your cards.</li><li><b>Grab the bank</b>: pick 0-4×; the highest becomes banker (ties at random).</li><li><b>Bet</b>: players pick 1-5×.</li><li>The fifth card shows; everyone is compared with the banker.</li></ol>
      <h3>Hands and multipliers</h3><ul><li>No bull to bull 6: ×1</li><li>Bull 7, bull 8: ×2</li><li>Bull 9: ×3</li><li>Bull bull (the last two also make ten): ×4</li><li>Five faces (all J/Q/K): ×5</li><li>Bomb bull (four of a kind): ×6</li><li>Five little bulls (all under 5, total ≤ 10): ×8</li></ul>
      <p>Equal hands: highest single card (K top; spades > hearts > clubs > diamonds). The winner's hand multiplier is paid.</p>`,

    'dz.landlord': 'Landlord', 'dz.farmer': 'Farmer', 'dz.mult': 'Stake {b} · ×{m}', 'dz.idle': '3 players: pick a stake and deal',
    'dz.bid': '{n} pt', 'dz.noBid': 'No bid', 'dz.bidN': 'Bid {n}', 'dz.pass': 'Pass', 'dz.hint': 'Hint', 'dz.play': 'Play', 'dz.invalid': 'Not a pattern',
    'dz.beat': 'Beat {who}’s {c}, or pass', 'dz.lead': 'Your lead: play any valid pattern', 'dz.cannot': 'Nothing beats it. Pass.',
    'dz.bidHint': 'Hand strength {s} (above 4: think about bidding 3)', 'dz.isLandlord': '{who} is the landlord!', 'dz.redeal': 'Nobody bid. Redeal.',
    'dz.bomb': 'BOMB ×2', 'dz.rocket': 'ROCKET ×2', 'dz.spring': 'SPRING ×2', 'dz.antiSpring': 'ANTI-SPRING ×2',
    'dz.stakeHint': 'Win or lose = stake × bid × 2^bombs. The landlord plays both farmers, so double either way.',
    'dz.c.single': 'Single', 'dz.c.pair': 'Pair', 'dz.c.trio': 'Trio', 'dz.c.trio1': 'Trio + 1', 'dz.c.trio2': 'Trio + pair', 'dz.c.straight': 'Straight', 'dz.c.dstraight': 'Pair straight',
    'dz.c.plane': 'Airplane', 'dz.c.plane1': 'Airplane + wings', 'dz.c.plane2': 'Airplane + pairs', 'dz.c.four2': 'Four + 2', 'dz.c.four2p': 'Four + 2 pairs', 'dz.c.bomb': 'Bomb', 'dz.c.rocket': 'Rocket',
    'dz.rules': `<p><b>In one line:</b> three players, one landlord against two farmers. Whoever empties their hand first wins for their side.</p>
      <h3>Ranks</h3><p>3 &lt; 4 &lt; … &lt; K &lt; A &lt; 2 &lt; small joker &lt; big joker. Suits do not matter.</p>
      <h3>Flow</h3><ol><li>17 cards each, 3 face down.</li><li><b>Bid</b> 1, 2, 3 or pass. The top bidder is landlord, takes the 3 cards and leads.</li><li>The next player must play the <b>same pattern</b>, higher, or pass. After two passes the last player leads anything.</li></ol>
      <h3>Patterns</h3><ul><li>Single, pair, trio, trio + 1, trio + pair</li><li>Straight: 5+ in a row (no 2s or jokers)</li><li>Pair straight: 3+ pairs in a row</li><li>Airplane: 2+ trios in a row, may carry as many singles or pairs</li><li>Four + 2</li><li><b>Bomb</b>: four of a kind, beats any non-bomb, doubles the stake</li><li><b>Rocket</b>: both jokers, beats everything, doubles the stake</li></ul>
      <p><b>Spring</b>: if one side never got to play, ×2 again.</p><p>Select cards and press Play, or press Hint. You can swipe across cards to select several.</p>`,

    'mj.wall': 'left', 'mj.idle': '4 players: pick a stake and deal', 'mj.dealer': 'D', 'mj.zimo': 'Self-drawn', 'mj.hu': 'Win', 'mj.fan': '{n} fan',
    'mj.lackTag': 'Void {s}', 'mj.lack': 'Void {s} ({n})', 'mj.pong': 'Pong', 'mj.kong': 'Kong', 'mj.kongT': 'Kong {t}', 'mj.pass': 'Pass', 'mj.discard': 'Discard',
    'mj.tapAgain': 'Tap again to discard {t}', 'mj.lackHint': 'Pick your void suit: the suit you hold fewest of. You must throw all of it before you can win.', 'mj.youWon': 'You won! The others fight on.',
    'mj.waits': 'Ready! Waiting on {w}', 'mj.shanten': '{n} away from ready', 'mj.discardHint': 'Tap a tile to pick it, tap again to discard', 'mj.claimHint': '{who} discarded {t}. You may:',
    'mj.winBy': '{who} {n} · {f} fan', 'mj.exhaust': 'Wall empty · settling ready hands',
    'mj.stakeHint': 'Each fan doubles: plain win = stake ×1, three fan = ×8. A self-draw adds one stake from each player.',
    'mj.f.base': 'Plain', 'mj.f.self': 'Self-drawn', 'mj.f.pong': 'All pongs', 'mj.f.flush': 'Pure suit', 'mj.f.seven': 'Seven pairs', 'mj.f.gen': 'Gen', 'mj.f.single': 'Single wait', 'mj.f.kongDraw': 'Win on kong draw', 'mj.f.kongDiscard': 'Win on kong discard', 'mj.f.last': 'Last tile',
    'mj.rules': `<p><b>In one line:</b> make 4 sets + 1 pair to win. A set is three of a kind or three in a row of one suit; a pair is two of a kind.</p>
      <h3>Tiles</h3><p>Only three suits, characters (万), bamboo (条) and dots (筒), 1-9, four of each: 108 tiles. No honours, no chow; only pong and kong.</p>
      <h3>Flow</h3><ol><li><b>Void suit</b>: pick one suit you must get rid of entirely before you can win.</li><li>Your turn: draw one, discard one.</li><li>When someone discards: with two of it you may <b>pong</b>, with three <b>kong</b>, and if it completes your hand, <b>win</b>.</li><li><b>Blood to the end</b>: a win does not end the hand; the rest play on until three have won or the wall runs out.</li></ol>
      <h3>Fan (each one doubles)</h3><ul><li>All pongs +1, pure suit +2, seven pairs +2, each gen (four of a kind) +1</li><li>Single wait, win on kong draw/discard, last tile +1 each; max 5</li></ul>
      <p>Kongs pay too. If the wall runs out, players who are not ready pay those who are. The table tells you which tiles you are waiting on.</p>`,

    'ai.title': 'AI opponents (language model)', 'ai.lead': 'Hand a house seat to a real language model: it reads the rules, the table and your chat, decides how to play, and bluffs you in the chat. Off by default; scripted personas play otherwise.',
    'ai.enable': 'Enable AI opponents', 'ai.base': 'Endpoint (Anthropic-compatible)', 'ai.key': 'API key', 'ai.model': 'Model', 'ai.seats': 'AI seats',
    'ai.proxy': 'Connected through the local server: {m} (the key stays on the server)', 'ai.note': 'The key is stored only in this browser on this device and sent only to the endpoint you enter. It never goes into the code or a shared link.', 'ai.test': 'Test', 'ai.testing': 'Testing...', 'ai.ok': 'Connected: {r}', 'ai.fail': 'Failed: {e}', 'ai.save': 'Save',
    'set.ai': 'AI opponents', 'set.aiOpen': 'Set up',
    'lobby.cardroom': 'Card room', 'lobby.slots': 'Slots', 'lobby.tables': 'Tables', 'lobby.instant': 'Instant', 'lobby.all': 'All',
    'lobby.withAI': 'Rivals talk', 'pv.wasBluff': 'Cards up: {who} said "{s}", and was holding very little. That was a bluff.', 'pv.wasSandbag': 'Cards up: {who} said "{s}", and was holding a monster. Playing weak to lure you in.',
    'pv.mind': '{who} was thinking: {s}', 'pv.mindSaid': '(out loud: "{s}")', 'lobby.noRake': 'PvP · no rake', 'ai.saved': 'Saved',
    'lobby.cardroomSub': 'Sit with rivals who talk, bluff and hold grudges', 'lobby.slotsSub': 'Reels, free spins, jackpots', 'lobby.tablesSub': 'The classics; the rules are the odds', 'lobby.instantSub': 'Rounds in seconds, pulse racing'
  };

  Object.assign(I18N._dict.zh, zh);
  Object.assign(I18N._dict.en, en);
})();
