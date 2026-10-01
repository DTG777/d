/* World content: the city, its people, their days, jobs and everything you can do.
   Data only, no rules (those live in core.js). Shared by the browser and node.
   Text is { zh, en }. Times are minutes; hours are 0-24 (a span like [20, 4] wraps midnight). */
(function (root) {
  const L = (zh, en) => ({ zh, en });

  const ATTRS = {
    body: L('体魄', 'Body'), mind: L('头脑', 'Mind'), charm: L('魅力', 'Charm'), will: L('定力', 'Will'), luck: L('运气', 'Luck')
  };
  const SKILLS = {
    gamble: L('赌技', 'Gambling'), odds: L('算牌', 'Odds'), talk: L('口才', 'Talk'), read: L('识人', 'Read people'), lie: L('骗术', 'Deceit'),
    cook: L('厨艺', 'Cooking'), fit: L('体能', 'Fitness'), code: L('编程', 'Coding'), biz: L('生意经', 'Business')
  };
  const STATS = {
    health: L('健康', 'Health'), energy: L('精力', 'Energy'), full: L('饱腹', 'Fullness'), mood: L('心情', 'Mood'),
    stress: L('压力', 'Stress'), urge: L('赌瘾', 'Urge'), drunk: L('醉意', 'Drunk')
  };
  // what each trait does, in words (core.js applies the numbers)
  const TRAITS = {
    gambler: { n: L('赌性', 'Gambler'), d: L('赌瘾涨得快，赢了更上头', 'Urge climbs faster; wins hit harder') },
    impulsive: { n: L('冲动', 'Impulsive'), d: L('容易答应，也容易翻脸', 'Says yes fast, snaps fast') },
    cautious: { n: L('谨慎', 'Cautious'), d: L('借钱、表白都更难', 'Harder to borrow from or win over') },
    warm: { n: L('热心', 'Warm'), d: L('好感涨得快，坏消息打折扣', 'Warms quickly, forgives bad news') },
    stingy: { n: L('抠门', 'Stingy'), d: L('很难借到钱，喜欢实在的礼物', 'Rarely lends, likes practical gifts') },
    proud: { n: L('好面子', 'Proud'), d: L('爱听夸，受不了顶撞', 'Loves praise, hates being crossed') },
    shrewd: { n: L('精明', 'Shrewd'), d: L('很难被骗，看穿谎话会记仇', 'Hard to fool; remembers lies') },
    naive: { n: L('单纯', 'Naive'), d: L('容易信人，也容易被骗', 'Trusts easily, gets fooled easily') },
    loyal: { n: L('仗义', 'Loyal'), d: L('朋友有难一定帮', 'Always helps a friend in need') },
    grudge: { n: L('记仇', 'Holds grudges'), d: L('坏消息加倍记住', 'Bad news counts double') },
    romantic: { n: L('浪漫', 'Romantic'), d: L('心动来得快', 'Falls quickly') },
    superstitious: { n: L('迷信', 'Superstitious'), d: L('信风水、求签，运气起伏大', 'Believes in signs; luck swings') }
  };

  const DISTRICTS = {
    old: { n: L('老城区', 'Old Town'), c: '#e8a65a', x: 22, y: 30 },
    central: { n: L('中环', 'Central'), c: '#6fb7ff', x: 50, y: 18 },
    neon: { n: L('不夜街', 'Neon Strip'), c: '#f04ab0', x: 78, y: 32 },
    harbour: { n: L('海滨', 'Harbour'), c: '#35d49a', x: 50, y: 50 }
  };

  /* places: x/y on a 100 x 64 map, open [from, to] hours ([0, 24] = always) */
  const PLACES = {
    home: { d: 'old', x: 14, y: 36, open: [0, 24], icon: '🏠', n: L('出租屋', 'Your flat'), desc: L('唐楼六楼，没电梯。窗外是霓虹和晾衣竿。', 'Sixth floor walk-up. Neon and laundry poles outside the window.') },
    teahouse: { d: 'old', x: 24, y: 24, open: [7, 23], icon: '🍵', n: L('玲记茶餐厅', "Ling's Café"), desc: L('丝袜奶茶、菠萝油，街坊八卦的集散地。', 'Milk tea, pineapple buns and every rumour on the street.') },
    market: { d: 'old', x: 30, y: 38, open: [6, 21], icon: '🥬', n: L('街市', 'Wet market'), desc: L('鱼腥、叫卖、外卖骑手在门口抽烟等单。', 'Fish, shouting, delivery riders smoking by the gate between orders.') },
    pawn: { d: 'old', x: 8, y: 22, open: [10, 21], icon: '💍', n: L('许记押', "Hui's Pawn"), desc: L('高柜台、铁栏杆。这里的人不问你为什么。', 'High counter, iron bars. Nobody asks why.') },
    temple: { d: 'old', x: 18, y: 12, open: [6, 19], icon: '⛩️', n: L('黄大仙庙', 'Wong Tai Sin Temple'), desc: L('香火缭绕，求签问卦。', 'Incense smoke and fortune sticks.') },
    office: { d: 'central', x: 44, y: 10, open: [8, 21], icon: '🏢', n: L('环球大厦', 'Global Tower'), desc: L('玻璃幕墙，三十层的格子间。', 'Glass curtain wall, thirty floors of cubicles.') },
    bank: { d: 'central', x: 56, y: 8, open: [9, 17], icon: '🏦', n: L('恒金银行', 'Heng Kam Bank'), desc: L('大理石大堂。你的存款和你的信用都在这里。', 'Marble lobby. Your savings and your credit live here.') },
    gym: { d: 'central', x: 60, y: 20, open: [6, 23], icon: '🏋️', n: L('铁馆', 'Iron Gym'), desc: L('拳击沙袋和镜子墙。', 'Heavy bags and a wall of mirrors.') },
    mall: { d: 'central', x: 40, y: 22, open: [10, 22], icon: '🛍️', n: L('海港城', 'Harbour City Mall'), desc: L('名牌、电影院、礼品店。', 'Brands, a cinema, gift shops.') },
    casino: { d: 'neon', x: 80, y: 26, open: [0, 24], icon: '🎰', n: L('金玉满堂', 'Gold & Jade Casino'), desc: L('二十四小时不打烊，没有窗，也没有钟。', 'Open 24 hours. No windows, no clocks.') },
    bar: { d: 'neon', x: 72, y: 38, open: [17, 4], icon: '🍸', n: L('午夜蓝酒吧', 'Midnight Blue'), desc: L('爵士、威士忌，酒保什么都知道。', 'Jazz, whisky, and a bartender who knows everything.') },
    netcafe: { d: 'neon', x: 88, y: 40, open: [0, 24], icon: '🎮', n: L('极速网吧', 'Turbo Net Café'), desc: L('泡面味和键盘声，通宵的人在这里。', 'Instant noodles and keyboards, the all-nighters live here.') },
    loanshark: { d: 'neon', x: 92, y: 18, open: [12, 2], icon: '💰', n: L('发达财务', 'Fat Dat Finance'), desc: L('二楼一间小办公室，门口站着两个纹身的。', 'A small office upstairs, two tattooed men at the door.') },
    park: { d: 'harbour', x: 40, y: 54, open: [0, 24], icon: '🌊', n: L('海滨长廊', 'Harbour Promenade'), desc: L('海风、跑步的人、对岸的灯火。', 'Sea breeze, joggers and the lights across the water.') },
    hospital: { d: 'harbour', x: 58, y: 50, open: [0, 24], icon: '🏥', n: L('仁心医院', 'Benevolent Hospital'), desc: L('急诊室的灯永远亮着。三楼有戒赌辅导。', 'The ER is always lit. Gambling counselling on the third floor.') },
    library: { d: 'harbour', x: 66, y: 56, open: [9, 21], icon: '📚', n: L('中央图书馆', 'Central Library'), desc: L('安静、免费、空调足。', 'Quiet, free, and well air-conditioned.') }
  };

  /* minutes between districts on foot; bus is half (2 chips), taxi a fifth (base 25 + 4/min) */
  const WALK = { same: 10, old: { central: 30, neon: 45, harbour: 35 }, central: { neon: 25, harbour: 25 }, neon: { harbour: 30 } };

  /* actions: at = places ('*' anywhere), min = minutes, cost = chips, need = minimums,
     fx = status changes, xp = skill practice, axp = attribute growth, h = special handler */
  const ACTS = {
    sleep: { at: ['home'], min: 0, h: 'sleep', n: L('睡觉', 'Sleep') },
    nap: { at: ['home', 'park', 'library'], min: 90, fx: { energy: 22, stress: -4 }, n: L('打个盹', 'Nap') },
    cook: { at: ['home'], min: 45, need: { item: 'groceries' }, fx: { full: 55, mood: 6, health: 2 }, xp: { cook: 4 }, n: L('自己做饭', 'Cook a meal') },
    tv: { at: ['home'], min: 60, fx: { mood: 6, stress: -6, energy: -2 }, n: L('躺平刷剧', 'Binge a show') },
    selfstudy: { at: ['home', 'library', 'netcafe'], min: 120, need: { energy: 20 }, fx: { energy: -14, stress: 4 }, xp: { code: 5 }, axp: { mind: 1 }, n: L('自学编程', 'Study coding') },
    milktea: { at: ['teahouse'], min: 30, cost: 28, fx: { full: 20, mood: 5, energy: 6 }, n: L('奶茶菠萝油', 'Milk tea & bun') },
    meal: { at: ['teahouse'], min: 40, cost: 58, fx: { full: 55, mood: 4 }, n: L('叉烧饭套餐', 'Char siu set') },
    gossip: { at: ['teahouse', 'bar'], min: 40, cost: 20, h: 'gossip', fx: { mood: 3 }, xp: { read: 2 }, n: L('听街坊八卦', 'Listen to gossip') },
    groceries: { at: ['market'], min: 30, cost: 75, h: 'groceries', n: L('买菜（3份）', 'Buy groceries (3)') },
    streetfood: { at: ['market', 'netcafe'], min: 20, cost: 22, fx: { full: 35, health: -1 }, n: L('路边鱼蛋', 'Street fish balls') },
    pawnit: { at: ['pawn'], min: 20, h: 'pawn', n: L('典当', 'Pawn something') },
    pray: { at: ['temple'], min: 30, cost: 20, h: 'pray', fx: { stress: -8, mood: 4 }, n: L('上香祈福', 'Burn incense') },
    stick: { at: ['temple'], min: 20, cost: 10, h: 'stick', n: L('求签', 'Draw a fortune stick') },
    volunteer: { at: ['temple', 'hospital'], min: 180, need: { energy: 25 }, fx: { energy: -18, mood: 10, stress: -10, urge: -6 }, xp: { talk: 2, read: 2 }, axp: { will: 1 }, h: 'volunteer', n: L('做义工', 'Volunteer') },
    bizbook: { at: ['library', 'office'], min: 120, need: { energy: 15 }, fx: { energy: -10 }, xp: { biz: 5 }, axp: { mind: 1 }, n: L('读商业书', 'Read business books') },
    oddsbook: { at: ['library'], min: 120, need: { energy: 15 }, fx: { energy: -10 }, xp: { odds: 6 }, axp: { mind: 1 }, n: L('研究概率论', 'Study probability') },
    novel: { at: ['library', 'home', 'park'], min: 90, fx: { mood: 8, stress: -8 }, xp: { talk: 1 }, n: L('读小说', 'Read a novel') },
    workout: { at: ['gym'], min: 90, cost: 60, need: { energy: 25 }, fx: { energy: -25, stress: -14, mood: 6, full: -10, urge: -4 }, xp: { fit: 6 }, axp: { body: 2 }, n: L('撸铁', 'Lift weights') },
    boxing: { at: ['gym'], min: 60, cost: 80, need: { energy: 25 }, fx: { energy: -22, stress: -20, mood: 4, full: -8 }, xp: { fit: 4, read: 1 }, axp: { body: 1, will: 1 }, n: L('打沙袋', 'Hit the bag') },
    jog: { at: ['park'], min: 45, need: { energy: 15 }, fx: { energy: -12, stress: -10, mood: 5, health: 2 }, xp: { fit: 3 }, axp: { body: 1 }, n: L('海边跑步', 'Jog by the sea') },
    seaview: { at: ['park'], min: 40, fx: { stress: -12, mood: 4, urge: -3 }, axp: { will: 1 }, n: L('看海发呆', 'Stare at the sea') },
    shopping: { at: ['mall'], min: 90, cost: 900, fx: { mood: 14, stress: -6 }, h: 'outfit', n: L('买身新衣服', 'Buy new clothes') },
    gift_s: { at: ['mall', 'market'], min: 15, cost: 120, h: 'buy', item: 'gift_s', n: L('买小礼物', 'Buy a small gift') },
    gift_l: { at: ['mall'], min: 25, cost: 3800, h: 'buy', item: 'gift_l', n: L('买名牌礼物', 'Buy a designer gift') },
    cinema: { at: ['mall'], min: 130, cost: 90, fx: { mood: 12, stress: -8 }, n: L('看电影', 'See a film') },
    drink: { at: ['bar'], min: 40, cost: 85, fx: { drunk: 22, mood: 6, stress: -8 }, xp: { talk: 1 }, n: L('喝一杯', 'Have a drink') },
    karaoke: { at: ['bar'], min: 60, cost: 120, fx: { drunk: 10, mood: 12, stress: -12, energy: -8 }, xp: { talk: 3 }, axp: { charm: 1 }, n: L('上台唱一首', 'Sing a song') },
    netgame: { at: ['netcafe'], min: 120, cost: 16, fx: { mood: 8, stress: -6, energy: -10 }, xp: { code: 1, read: 1 }, n: L('打游戏', 'Play online') },
    pokerbook: { at: ['netcafe'], min: 120, cost: 16, need: { energy: 15 }, fx: { energy: -10, urge: 6 }, xp: { gamble: 4, odds: 3 }, n: L('看牌局复盘', 'Study poker replays') },
    shark: { at: ['loanshark'], min: 20, h: 'shark', n: L('借高利贷', 'Borrow from the shark') },
    checkup: { at: ['hospital'], min: 90, cost: 480, fx: { health: 25, stress: -4 }, n: L('看医生', 'See a doctor') },
    counsel: { at: ['hospital'], min: 60, h: 'counsel', fx: { urge: -18, stress: -10 }, axp: { will: 2 }, n: L('戒赌辅导', 'Gambling counselling') },
    casino: { at: ['casino'], min: 0, h: 'casino', n: L('进赌场', 'Go inside') },
    bank: { at: ['bank'], min: 15, h: 'bank', n: L('存取款', 'Deposit / withdraw') },
    wait: { at: '*', min: 60, fx: {}, n: L('消磨一小时', 'Kill an hour') }
  };

  const ITEMS = {
    groceries: L('食材', 'Groceries'), gift_s: L('小礼物', 'Small gift'), gift_l: L('名牌礼物', 'Designer gift'),
    watch: L('旧手表', 'Old watch'), ring: L('金戒指', 'Gold ring'), suit: L('好西装', 'Good suit')
  };
  const PAWN = { watch: 1800, ring: 6500, suit: 1200, gift_l: 1900 };

  /* jobs: shift minutes, hours you can start, pay per shift by level, needs, practice */
  const JOBS = {
    rider: { at: 'market', boss: null, min: 240, hours: [9, 20], pay: [240, 300, 380], need: { body: 3 }, fx: { energy: -28, full: -15, stress: 4 }, xp: { fit: 3 }, axp: { body: 1 }, n: L('外卖骑手', 'Delivery rider'), lv: [L('新骑手', 'New rider'), L('金牌骑手', 'Gold rider'), L('站长', 'Station lead')] },
    waiter: { at: 'teahouse', boss: 'ling', min: 240, hours: [7, 19], pay: [210, 260, 330], need: {}, fx: { energy: -24, stress: 5 }, xp: { cook: 2, talk: 2, read: 1 }, n: L('茶餐厅伙计', 'Café waiter'), lv: [L('伙计', 'Waiter'), L('楼面', 'Floor lead'), L('主管', 'Manager')] },
    clerk: { at: 'office', boss: 'liu', min: 480, hours: [8, 11], weekdays: true, pay: [420, 560, 760], need: { mind: 5 }, fx: { energy: -30, stress: 10 }, xp: { biz: 3, code: 1 }, n: L('文员', 'Office clerk'), lv: [L('文员', 'Clerk'), L('主任', 'Supervisor'), L('经理', 'Manager')] },
    coder: { at: 'office', boss: 'liu', min: 480, hours: [8, 12], weekdays: true, pay: [1100, 1500, 2200], need: { code: 40 }, fx: { energy: -32, stress: 12 }, xp: { code: 4 }, axp: { mind: 1 }, n: L('程序员', 'Programmer'), lv: [L('初级工程师', 'Junior dev'), L('工程师', 'Engineer'), L('架构师', 'Architect')] },
    sales: { at: 'office', boss: 'liu', min: 480, hours: [8, 12], weekdays: true, pay: [300, 380, 480], commission: true, need: { talk: 35 }, fx: { energy: -30, stress: 14 }, xp: { talk: 4, read: 2, lie: 1 }, axp: { charm: 1 }, n: L('销售', 'Sales rep'), lv: [L('销售', 'Sales rep'), L('销售主管', 'Sales lead'), L('销冠', 'Top seller')] },
    dealer: { at: 'casino', boss: 'yan', min: 480, hours: [18, 23], pay: [650, 820, 1100], need: { odds: 25, mind: 4 }, fx: { energy: -30, stress: 8, urge: 8 }, xp: { odds: 3, read: 3, gamble: 1 }, n: L('荷官', 'Dealer'), lv: [L('荷官', 'Dealer'), L('资深荷官', 'Senior dealer'), L('场面经理', 'Pit boss')] },
    tutor: { at: 'library', boss: null, min: 180, hours: [15, 19], pay: [360, 450, 600], need: { odds: 40 }, fx: { energy: -18, stress: 3 }, xp: { talk: 2, odds: 1 }, axp: { mind: 1 }, n: L('数学家教', 'Maths tutor'), lv: [L('家教', 'Tutor'), L('金牌家教', 'Star tutor'), L('补习名师', 'Cram-school star')] }
  };
  const RENT = 2800;

  /* people. look: portrait spec. sched: [from, to, place, days?] first match wins, days = 'wd' | 'we' | [0-6].
     rel: how they see you at the start. ties: who they talk to (gossip runs along these). */
  const PEOPLE = {
    mom: { n: L('妈妈', 'Mum'), age: 58, sex: 'f', far: true, traits: ['warm', 'superstitious'], attrs: { mind: 5, charm: 5, will: 7 }, cash: 30000,
      bio: L('在老家，一个人住。每周打一次电话，只问你吃了没有。', 'Lives alone back home. Calls once a week and only asks if you ate.'),
      look: { skin: '#e6b48f', hair: '#4a4a4a', hs: 'bun', top: '#8a4b5c', fem: 1, age: 2 }, rel: { aff: 80, trust: 60, fam: 90, tags: ['family'] } },
    jie: { n: L('阿杰', 'Kit'), age: 27, sex: 'm', job: 'rider', home: 'home', traits: ['loyal', 'impulsive', 'gambler'], attrs: { body: 7, mind: 4, charm: 5, will: 3, luck: 5 }, skills: { fit: 50, talk: 35, gamble: 30 }, cash: 1800,
      bio: L('发小，外卖骑手，讲义气，嘴上说戒赌，手机里装了三个赌博App。', 'Childhood friend, delivery rider. Loyal to a fault, says he quit gambling, has three betting apps.'),
      look: { skin: '#d8a27a', hair: '#1a1410', hs: 'spiky', top: '#f0b400', fem: 0, acc: 'cap' },
      sched: [[9, 19, 'market'], [19, 21, 'teahouse'], [21, 24, 'netcafe', 'wd'], [21, 3, 'casino', 'we'], [0, 9, 'home']], rel: { aff: 55, trust: 50, fam: 70, tags: [] } },
    yu: { n: L('小雨', 'Yu'), age: 26, sex: 'f', job: 'nurse', traits: ['warm', 'romantic', 'cautious'], attrs: { body: 5, mind: 7, charm: 7, will: 6, luck: 5 }, skills: { read: 55, talk: 45, cook: 50 }, cash: 9000, romance: true,
      bio: L('仁心医院护士，早上在海边跑步。见过太多赌到住院的人，所以对赌徒很警惕。', 'Nurse at the Benevolent. Jogs by the sea at dawn. Has seen too many gamblers in the ER to trust one.'),
      look: { skin: '#f0c8a8', hair: '#2a1a14', hs: 'pony', top: '#7fc4d8', fem: 1 },
      sched: [[6, 7, 'park'], [8, 18, 'hospital', 'wd'], [19, 21, 'library', [1, 3]], [19, 21, 'teahouse', [2, 4]], [10, 13, 'mall', 'we'], [14, 17, 'park', 'we']], rel: { aff: 5, trust: 10, fam: 0 } },
    bao: { n: L('包租婆', 'The landlady'), age: 61, sex: 'f', traits: ['stingy', 'shrewd', 'grudge'], attrs: { mind: 7, charm: 3, will: 8 }, skills: { biz: 70, read: 60 }, cash: 280000,
      bio: L('整栋唐楼都是她的，拖鞋、发卷、算盘打得比计算器快。', 'Owns the whole walk-up. Slippers, curlers, does sums faster than a calculator.'),
      look: { skin: '#e2b08a', hair: '#3a2a22', hs: 'curly', top: '#c44a6a', fem: 1, age: 2 },
      sched: [[8, 12, 'home'], [12, 14, 'market'], [14, 18, 'teahouse'], [18, 23, 'home']], rel: { aff: 0, trust: 35, fam: 25, tags: ['landlord'] } },
    liu: { n: L('刘经理', 'Mr Lau'), age: 45, sex: 'm', traits: ['proud', 'shrewd'], attrs: { mind: 7, charm: 5, will: 6 }, skills: { biz: 75, talk: 60, read: 55 }, cash: 120000,
      bio: L('环球大厦里一家贸易公司的经理，招人看简历也看面相。', 'Runs a trading firm in Global Tower. Hires by CV and by face.'),
      look: { skin: '#e0b090', hair: '#1a1a1a', hs: 'side', top: '#2a3a5a', fem: 0, tie: '#a01c2c', glasses: 1 },
      sched: [[9, 19, 'office', 'wd'], [20, 23, 'bar', [5]], [10, 12, 'gym', 'we']], rel: { aff: 0, trust: 20, fam: 0 } },
    fang: { n: L('阿芳', 'Fong'), age: 31, sex: 'f', traits: ['warm', 'naive'], attrs: { mind: 5, charm: 6 }, skills: { talk: 55, biz: 30 }, cash: 15000,
      bio: L('公司前台，全楼的消息她最先知道。', 'Receptionist. Hears everything in the building first.'),
      look: { skin: '#f2c9a5', hair: '#6a3a1a', hs: 'long', top: '#e88aa8', fem: 1 },
      sched: [[9, 18, 'office', 'wd'], [18, 20, 'teahouse', 'wd'], [13, 18, 'mall', 'we']], rel: { aff: 10, trust: 15, fam: 5 } },
    lin: { n: L('林医生', 'Dr Lam'), age: 50, sex: 'm', traits: ['cautious', 'warm'], attrs: { mind: 9, will: 8 }, skills: { read: 80, talk: 60 }, cash: 90000,
      bio: L('仁心医院的心理医生，三楼戒赌辅导就是他开的。说话很慢，从不评判。', 'Psychiatrist; runs the gambling clinic on the third floor. Speaks slowly, never judges.'),
      look: { skin: '#e8c0a0', hair: '#9a9a9a', hs: 'side', top: '#f2f2f2', fem: 0, glasses: 1, age: 1 },
      sched: [[9, 17, 'hospital', 'wd'], [7, 8, 'park']], rel: { aff: 10, trust: 20, fam: 0 } },
    chenbo: { n: L('陈伯', 'Uncle Chan'), age: 72, sex: 'm', traits: ['superstitious', 'warm'], attrs: { mind: 6, will: 8, luck: 7 }, skills: { read: 65 }, cash: 8000,
      bio: L('庙祝，解签五十年。据说年轻时也是个赌徒。', 'Temple keeper, fifty years reading fortune sticks. Was a gambler once, they say.'),
      look: { skin: '#c89a74', hair: '#e0e0e0', hs: 'bald', top: '#c87a2a', fem: 0, age: 2, beard: 1 },
      sched: [[6, 18, 'temple'], [18, 20, 'park']], rel: { aff: 10, trust: 20, fam: 5 } },
    xu: { n: L('老许', 'Old Hui'), age: 66, sex: 'm', traits: ['stingy', 'shrewd'], attrs: { mind: 7 }, skills: { biz: 70, read: 75, lie: 40 }, cash: 400000,
      bio: L('当铺老板。他见过太多手表、戒指和故事。', 'Pawnbroker. He has seen too many watches, rings and stories.'),
      look: { skin: '#d4a882', hair: '#7a7a7a', hs: 'side', top: '#3a3a2a', fem: 0, glasses: 1, age: 2 },
      sched: [[10, 21, 'pawn']], rel: { aff: 0, trust: 10, fam: 0 } },
    jimmy: { n: L('阿Jim', 'Jimmy'), age: 38, sex: 'm', traits: ['warm', 'shrewd'], attrs: { charm: 7, mind: 6 }, skills: { read: 70, talk: 70, cook: 40 }, cash: 25000,
      bio: L('午夜蓝的酒保，听过这条街每一个人的心事。', 'Bartender at Midnight Blue. Has heard every confession on this street.'),
      look: { skin: '#c8906a', hair: '#1a1a1a', hs: 'slick', top: '#1a1a1a', fem: 0, tie: '#2a6aa0', beard: 1 },
      sched: [[17, 4, 'bar'], [13, 15, 'gym']], rel: { aff: 10, trust: 15, fam: 5 } },
    scar: { n: L('疤哥', 'Scar'), age: 42, sex: 'm', traits: ['grudge', 'shrewd'], attrs: { body: 8, mind: 6, will: 7 }, skills: { read: 60, lie: 55, biz: 50 }, cash: 900000,
      bio: L('发达财务的老板，左脸一道疤。借钱很爽快，收钱更爽快。', 'Runs Fat Dat Finance, scar down the left cheek. Lends fast, collects faster.'),
      look: { skin: '#b8865e', hair: '#0a0a0a', hs: 'buzz', top: '#2a2a2a', fem: 0, chain: 1, scar: 1 },
      sched: [[12, 2, 'loanshark'], [22, 1, 'bar', [5, 6]]], rel: { aff: 0, trust: 0, fam: 0 } },
    // the card-room regulars (same people as the casino personas)
    hao: { n: L('阿豪', 'Hao'), age: 48, sex: 'm', persona: 'hao', traits: ['proud', 'impulsive', 'gambler'], attrs: { body: 6, charm: 5, luck: 6 }, skills: { biz: 60, gamble: 45 }, cash: 600000,
      bio: L('做建材发家的暴发户，金链子，嗓门大。', 'Loud self-made building-supplies tycoon in a gold chain.'),
      look: { skin: '#d09a70', hair: '#151515', hs: 'slick', top: '#c8a040', fem: 0, chain: 1 },
      sched: [[10, 12, 'teahouse'], [14, 17, 'mall', 'we'], [20, 3, 'casino']], rel: { aff: 0, trust: 5, fam: 0 } },
    ling: { n: L('玲姐', 'Ling'), age: 44, sex: 'f', persona: 'ling', traits: ['shrewd', 'proud'], attrs: { mind: 7, charm: 6 }, skills: { biz: 65, read: 70, cook: 60 }, cash: 160000,
      bio: L('茶餐厅老板娘，看人很准，说话带刺。晚上偶尔去赌场打牛牛。', 'Owns the café. Reads people, sharp tongue, plays niuniu some nights.'),
      look: { skin: '#e8b898', hair: '#2a1410', hs: 'bob', top: '#2a6a8a', fem: 1 },
      sched: [[7, 22, 'teahouse'], [22, 2, 'casino', [5, 6]]], rel: { aff: 5, trust: 15, fam: 15 } },
    oldk: { n: L('老K', 'Old K'), age: 69, sex: 'm', persona: 'oldk', traits: ['cautious', 'superstitious'], attrs: { mind: 7, will: 6 }, skills: { gamble: 70, odds: 55, read: 60 }, cash: 70000,
      bio: L('在澳门混了三十年的老江湖，早上在海边遛鸟。', 'Thirty years on the Macau tables. Walks his songbird by the sea every morning.'),
      look: { skin: '#cfa07c', hair: '#c8c8c8', hs: 'side', top: '#3a5a3a', fem: 0, age: 2 },
      sched: [[6, 10, 'park'], [10, 14, 'teahouse'], [20, 4, 'casino']], rel: { aff: 5, trust: 10, fam: 5 } },
    mei: { n: L('小美', 'Mei'), age: 24, sex: 'f', persona: 'mei', traits: ['shrewd', 'romantic'], attrs: { charm: 8, mind: 7 }, skills: { lie: 70, read: 65, gamble: 60 }, cash: 50000, romance: true,
      bio: L('甜美爱笑，看起来是新手，其实专门扮猪吃老虎。', 'Sweet and giggly, plays the beginner. Is not a beginner.'),
      look: { skin: '#f6d2b8', hair: '#3a1a10', hs: 'long', top: '#f39bd0', fem: 1, earring: 1 },
      sched: [[13, 18, 'mall'], [20, 3, 'casino']], rel: { aff: 0, trust: 5, fam: 0 } },
    fei: { n: L('大飞', 'Fei'), age: 33, sex: 'm', persona: 'fei', traits: ['impulsive', 'gambler', 'loyal'], attrs: { body: 7, will: 2 }, skills: { gamble: 35, fit: 45 }, cash: 6000,
      bio: L('修车的，急性子，输两把就上头。', 'Car mechanic. Two losses and he is chasing.'),
      look: { skin: '#c88a60', hair: '#1a1008', hs: 'spiky', top: '#5a3a8a', fem: 0 },
      sched: [[14, 19, 'netcafe'], [20, 4, 'casino']], rel: { aff: 0, trust: 5, fam: 0 } },
    dao: { n: L('刀仔', 'Knife'), age: 29, sex: 'm', persona: 'dao', traits: ['cautious', 'shrewd'], attrs: { mind: 8, will: 8 }, skills: { gamble: 75, odds: 80, read: 70 }, cash: 120000,
      bio: L('职业牌手，白天在图书馆算概率，晚上在赌场收钱。', 'Pro grinder. Studies probability at the library by day, collects at night.'),
      look: { skin: '#e0b896', hair: '#0a0a0a', hs: 'hood', top: '#4a5868', fem: 0, phones: 1 },
      sched: [[10, 16, 'library'], [18, 4, 'casino']], rel: { aff: 0, trust: 5, fam: 0 } },
    wang: { n: L('王阿姨', 'Auntie Wang'), age: 63, sex: 'f', persona: 'wang', traits: ['superstitious', 'stingy', 'warm'], attrs: { mind: 6 }, skills: { odds: 40, biz: 45 }, cash: 60000,
      bio: L('退休会计，出门看黄历，下午在茶餐厅打麻将。', 'Retired accountant. Checks the almanac, plays mahjong at the café in the afternoon.'),
      look: { skin: '#e4b896', hair: '#5a4a40', hs: 'curly', top: '#ff9a40', fem: 1, age: 2, beads: 1 },
      sched: [[7, 9, 'temple'], [9, 11, 'market'], [14, 18, 'teahouse'], [19, 23, 'casino']], rel: { aff: 5, trust: 10, fam: 5 } },
    chen: { n: L('陈老板', 'Boss Chan'), age: 55, sex: 'm', persona: 'chen', traits: ['proud', 'shrewd'], attrs: { mind: 8, charm: 6 }, skills: { biz: 90, gamble: 55 }, cash: 8000000,
      bio: L('上市公司老板，贵宾厅常客，输赢都面不改色。', 'Chairman of a listed company, VIP regular, never blinks.'),
      look: { skin: '#e0b090', hair: '#2a2a2a', hs: 'slick', top: '#1a1a2a', fem: 0, tie: '#c8a040', glasses: 1, age: 1 },
      sched: [[10, 18, 'office', 'wd'], [22, 4, 'casino']], rel: { aff: 0, trust: 0, fam: 0 } },
    zhou: { n: L('周少', 'Young Chow'), age: 25, sex: 'm', persona: 'zhou', traits: ['proud', 'impulsive', 'romantic'], attrs: { charm: 6, will: 2, luck: 5 }, skills: { gamble: 30 }, cash: 1500000,
      bio: L('富二代，跑车、名表、输了就找老爸。', 'Rich kid. Sports car, big watch, calls daddy when he loses.'),
      look: { skin: '#f0c8a0', hair: '#c88a2a', hs: 'swoop', top: '#e8e8e8', fem: 0, glasses: 1 },
      sched: [[15, 19, 'mall'], [20, 23, 'bar'], [23, 5, 'casino']], rel: { aff: 0, trust: 5, fam: 0 } },
    yan: { n: L('燕姐', 'Yan'), age: 39, sex: 'f', persona: 'yan', traits: ['shrewd', 'warm'], attrs: { charm: 8, mind: 7 }, skills: { talk: 80, read: 75, lie: 60, biz: 70 }, cash: 2000000,
      bio: L('赌场的叠码仔，人人都是她的好朋友，直到你欠她钱。', 'Junket agent. Everyone is her friend until they owe her.'),
      look: { skin: '#f0c4a4', hair: '#1a0a0a', hs: 'bob', top: '#a01c3c', fem: 1, earring: 1 },
      sched: [[14, 17, 'bar'], [18, 4, 'casino']], rel: { aff: 5, trust: 10, fam: 0 } },
    ace: { n: L('赌神', 'Ace'), age: 52, sex: 'm', persona: 'ace', traits: ['cautious', 'superstitious'], attrs: { mind: 10, will: 10, luck: 9 }, skills: { gamble: 99, odds: 95, read: 95 }, cash: 50000000,
      bio: L('只在贵宾厅出现的传说。天亮前有人见过他一个人在庙里上香。', 'A legend who only plays the VIP salon. Some say he burns incense alone before dawn.'),
      look: { skin: '#e0b494', hair: '#0a0a0a', hs: 'slick', top: '#0a0a0a', fem: 0, tie: '#f6c94e' },
      sched: [[5, 7, 'temple'], [23, 3, 'casino', [5, 6]]], rel: { aff: 0, trust: 0, fam: 0 } }
  };

  /* who talks to whom (both directions), how warmly: the gossip network */
  const TIES = [
    ['jie', 'fei', 40], ['jie', 'ling', 30], ['jie', 'jimmy', 25], ['yu', 'lin', 45], ['yu', 'fang', 35], ['bao', 'wang', 60], ['bao', 'ling', 45],
    ['ling', 'wang', 40], ['ling', 'oldk', 35], ['ling', 'fang', 25], ['liu', 'fang', 30], ['liu', 'chen', 35], ['jimmy', 'yan', 40], ['jimmy', 'scar', 20],
    ['jimmy', 'zhou', 30], ['jimmy', 'mei', 30], ['yan', 'chen', 50], ['yan', 'zhou', 45], ['yan', 'hao', 40], ['hao', 'fei', 25], ['hao', 'wang', 20],
    ['oldk', 'dao', 30], ['oldk', 'chenbo', 50], ['chenbo', 'ace', 60], ['chenbo', 'wang', 35], ['xu', 'scar', 30], ['xu', 'bao', 25], ['mei', 'zhou', 35],
    ['dao', 'ace', 20], ['scar', 'fei', 20], ['lin', 'chenbo', 25], ['mom', 'jie', 30]
  ];

  /* what each person keeps to themselves: learned by gossip, by trust, or by asking the right way */
  const SECRETS = {
    jie: L('阿杰欠了疤哥两万，一直瞒着所有人。', 'Kit owes Scar 20,000 and has told no one.'),
    yu: L('小雨的爸爸当年赌光了家里的房子，所以她当了护士。', 'Yu’s father gambled away the family flat; that is why she became a nurse.'),
    bao: L('包租婆打算把整栋楼卖给发展商，租客都还不知道。', 'The landlady plans to sell the whole building to a developer. The tenants don’t know.'),
    liu: L('刘经理下个月要招一个程序员，编程40分以上就有机会。', 'Mr Lau is hiring a programmer next month. Coding 40+ gets you in.'),
    fang: L('阿芳暗恋刘经理很多年了。', 'Fong has had a crush on Mr Lau for years.'),
    lin: L('林医生自己也戒过赌，十五年没碰过牌。', 'Dr Lam is a recovered gambler himself, fifteen years clean.'),
    chenbo: L('陈伯年轻时和赌神是同一张台上的对手。', 'Uncle Chan once sat across the table from the God of Gamblers.'),
    xu: L('老许收的东西有一半是赌客的，他从不卖回给本人以外的人。', 'Half of what Old Hui holds came from gamblers. He only ever sells it back to its owner.'),
    jimmy: L('阿Jim以前是叠码仔，跟燕姐闹翻才来调酒。', 'Jimmy was a junket runner until he fell out with Yan.'),
    scar: L('疤哥最怕的是他妈，每周日都去庙里陪她上香。', 'Scar is terrified of his mother and takes her to the temple every Sunday.'),
    hao: L('阿豪的建材公司其实快周转不过来了。', 'Hao’s building-supplies firm is about to run out of cash.'),
    ling: L('玲姐的茶餐厅是用赌桌上赢的钱开的，她再也没输过大钱。', 'Ling opened the café with one big win and has never lost big since.'),
    oldk: L('老K算牌被三家赌场拉过黑名单。', 'Old K has been banned from three casinos for counting.'),
    mei: L('小美是燕姐的人，专门把新手带到贵宾厅。', 'Mei works for Yan, steering beginners to the VIP salon.'),
    fei: L('大飞的修车铺已经押给了疤哥。', 'Fei has already signed his garage over to Scar.'),
    dao: L('刀仔一年只在两个月里亏钱，他有一本记了七年的账。', 'Knife loses money in only two months a year. He has kept a ledger for seven years.'),
    wang: L('王阿姨的佛珠是假的，但她赢钱是真的。', 'Auntie Wang’s beads are fake; her winnings are real.'),
    chen: L('陈老板的公司在被调查，他来赌场是为了洗钱。', 'Boss Chan’s company is under investigation; the VIP salon is where he washes money.'),
    zhou: L('周少的老爸上个月停了他的卡。', 'Young Chow’s father cut off his cards last month.'),
    yan: L('燕姐手上有一份“不还钱名单”，会发给全城的财务公司。', 'Yan keeps a list of people who don’t pay and sends it to every lender in town.'),
    ace: L('赌神每天天亮前都在黄大仙庙上香，求的是“戒”。', 'Every dawn the God of Gamblers burns incense at the temple and prays to quit.'),
    mom: L('妈妈把养老钱存了一张卡，说是留给你结婚用。', 'Mum keeps her savings on one card “for your wedding”.')
  };

  /* phone messages and calls the world sends you */
  const MSGS = {
    mom: [L('吃饭了没有？天冷了多穿件衣服。', 'Have you eaten? It’s getting cold, wear more.'), L('隔壁阿姨的儿子升职了。你呢，工作顺不顺利？', 'The neighbour’s son got promoted. How’s work for you?'), L('别学你爸。妈不求你发财，平平安安就好。', 'Don’t be like your dad. I don’t need you rich, just safe.')],
    jieAsk: [L('兄弟，借我{n}周转一下，下周一定还。', 'Bro, lend me {n} till next week, I swear.'), L('急事！{n}，帮帮忙，别跟我妈说。', 'Emergency! {n}, help me out. Don’t tell my mum.')],
    yuJog: [L('明早六点半海边跑步？顺路可以一起。', 'Jogging by the sea at 6:30 tomorrow? Join me if you like.')],
    liuJob: [L('听说你会写代码？公司缺人，来面试吧。', 'Heard you can code? We’re short a dev, come interview.')],
    scar: [L('钱呢？我的人知道你住哪。', 'Where’s my money? My boys know where you live.'), L('今天再见不到钱，就不是打电话这么简单了。', 'No money today and it won’t be a phone call next time.')],
    bao: [L('明天交租，{n}，现金还是转账都行。', 'Rent’s due tomorrow, {n}. Cash or transfer.')],
    yan: [L('贵宾厅今晚有局，赌神也在。给你留了位，筹码我先垫。', 'Big game in the VIP salon tonight, Ace is in. Seat’s yours, I’ll front the chips.')],
    jieRepay: [L('钱还你了，兄弟，谢了。', 'Paid you back, bro. Thanks.')],
    jieLate: [L('再宽限几天……这礼拜手气太差了。', 'Give me a few more days… rough week at the tables.')]
  };

  /* how you start: matches the story openings (and stands alone without them) */
  const OPENINGS = {
    fresh: { attrs: { body: 5, mind: 5, charm: 5, will: 5, luck: 5 }, skills: { fit: 30, talk: 25, gamble: 10, odds: 10, cook: 20 }, traits: ['loyal'], job: 'rider', items: { watch: 1 }, urge: 15 },
    demo: { attrs: { body: 4, mind: 4, charm: 4, will: 4, luck: 8 }, skills: { biz: 15, talk: 30, gamble: 10 }, traits: ['naive', 'superstitious'], items: { ring: 1, watch: 1 }, urge: 20 },
    rich: { attrs: { body: 5, mind: 5, charm: 8, will: 3, luck: 6 }, skills: { talk: 40, biz: 25, gamble: 25 }, traits: ['proud', 'impulsive'], items: { watch: 1, suit: 1, ring: 1 }, urge: 30 },
    debt: { attrs: { body: 5, mind: 6, charm: 5, will: 3, luck: 4 }, skills: { talk: 35, lie: 30, gamble: 35, odds: 20, code: 30 }, traits: ['gambler', 'impulsive'], job: 'clerk', items: { watch: 1 }, urge: 55, stress: 60 },
    god: { attrs: { body: 5, mind: 8, charm: 6, will: 7, luck: 6 }, skills: { gamble: 60, odds: 55, read: 50 }, traits: ['gambler', 'shrewd'], items: {}, urge: 45 }
  };

  /* phrases the core uses for events and the log */
  const TXT = {
    'ev.arrive': L('到了{p}。', 'You reach {p}.'), 'ev.closed': L('{p}现在关门。', '{p} is closed now.'),
    'ev.slept': L('睡了{h}小时。', 'Slept {h} hours.'), 'ev.paid': L('花了{n}。', 'Spent {n}.'),
    'ev.work': L('上完一班{j}，拿到{n}。', 'Finished a {j} shift, earned {n}.'), 'ev.promo': L('升职了：{l}！', 'Promoted: {l}!'),
    'ev.hired': L('{j}的工作，明天开始。', 'Hired as {j}. Start any time.'), 'ev.fired': L('你被{j}的工作炒了。', 'You were fired from {j}.'),
    'ev.warn': L('{b}：再不来上班就别来了。', '{b}: Show up or don’t bother coming back.'),
    'ev.rentdue': L('包租婆：这周的租金{n}，别忘了。', 'Landlady: this week’s rent is {n}. Don’t forget.'),
    'ev.rentlate': L('租金拖欠了{w}周。', 'Rent is {w} week(s) late.'), 'ev.evicted': L('包租婆把你的东西搬到了楼梯口。你被赶出来了。', 'The landlady piled your things on the landing. You are evicted.'),
    'ev.rentpaid': L('交了房租{n}。', 'Paid rent {n}.'), 'ev.collapse': L('你倒下了，醒来在医院。账单{n}。', 'You collapsed and woke up in hospital. Bill: {n}.'),
    'ev.hungry': L('饿得发慌。', 'You are starving.'), 'ev.tired': L('困得睁不开眼。', 'You can barely keep your eyes open.'),
    'ev.urge': L('脑子里全是赌桌上的声音。', 'All you can hear is the tables.'),
    'ev.debtlate': L('欠{w}的{n}逾期了。', 'Your {n} debt to {w} is overdue.'), 'ev.repaid': L('还了{w} {n}。', 'Repaid {w} {n}.'),
    'ev.borrowed': L('{w}借给你{n}，{d}天内还。', '{w} lent you {n}, due in {d} days.'), 'ev.gift': L('{w}收下了礼物。', '{w} accepted the gift.'),
    'ev.news': L('{w}听说了：{t}', '{w} heard: {t}'), 'ev.date': L('和{w}约好了：{t}', 'Plan with {w}: {t}'),
    'ev.dateok': L('{w}如约而至。', '{w} showed up as promised.'), 'ev.datemiss': L('你放了{w}鸽子。', 'You stood {w} up.'),
    'ev.learn': L('{w}教了你一手{s}。', '{w} taught you some {s}.'), 'ev.skill': L('{s}提升到{v}', '{s} rose to {v}'),
    'ev.attr': L('{a}提升到{v}！', '{a} rose to {v}!'), 'ev.pawn': L('当掉了{i}，拿到{n}。', 'Pawned the {i} for {n}.'),
    'ev.stick': L('第{n}签：{t}', 'Stick {n}: {t}'), 'ev.bank': L('银行余额{n}。', 'Bank balance {n}.'),
    'ev.shark': L('疤哥数了{n}给你：“七天，一天一成，别让我去找你。”', 'Scar counts out {n}: “Seven days, ten percent a day. Don’t make me come find you.”'),
    'ev.collector': L('疤哥的人在{p}门口等你。', 'Scar’s men are waiting for you at {p}.'),
    'ev.call': L('{w}打来电话。', '{w} is calling.'), 'ev.msg': L('{w}发来消息。', 'Message from {w}.'),
    'ev.gambled': L('在赌场待了{m}分钟，{r}。', 'Spent {m} minutes inside, {r}.'),
    'news.bigwin': L('有人在金玉满堂赢了{n}', 'Somebody won {n} at Gold & Jade'), 'news.bigloss': L('有人一晚上输了{n}', 'Somebody lost {n} in one night'),
    'news.default': L('有人欠{w}的钱不还', 'Somebody won’t pay {w} back'), 'news.lie': L('有人对{w}撒谎被拆穿', 'Somebody got caught lying to {w}'),
    'news.evicted': L('六楼那个被包租婆赶出来了', 'The guy on six got evicted'), 'news.fired': L('有人被炒了鱿鱼', 'Somebody got fired'),
    'news.generous': L('有人很仗义，帮了{w}', 'Somebody stood up for {w}'), 'news.partner': L('有人和{w}在一起了', 'Somebody is seeing {w}'),
    'news.threat': L('有人威胁{w}', 'Somebody threatened {w}'), 'news.collapse': L('有人累垮被送进了医院', 'Somebody collapsed and ended up in hospital'), 'news.volunteer': L('有人在做义工', 'Somebody is volunteering'),
    'stick.1': L('上上签：守得云开见月明。', 'Great fortune: the clouds part for those who wait.'),
    'stick.2': L('上签：贵人在近处，不在赌桌。', 'Good fortune: your helper is near you, not at the table.'),
    'stick.3': L('中签：钱财如流水，堵不如疏。', 'Middling: money flows like water, guide it.'),
    'stick.4': L('下签：急则生乱，近赌者失。', 'Poor: haste breeds ruin; who stays near the dice, loses.'),
    'stick.5': L('下下签：回头是岸。', 'Worst: turn back, the shore is behind you.'),
    'wd': L('日一二三四五六', 'SuMoTuWeThFrSa')
  };

  const DATA = { L, ATTRS, SKILLS, STATS, TRAITS, DISTRICTS, PLACES, WALK, ACTS, ITEMS, PAWN, JOBS, RENT, PEOPLE, TIES, SECRETS, MSGS, OPENINGS, TXT };
  root.WorldData = DATA;
  if (typeof module !== 'undefined' && module.exports) module.exports = DATA;
})(typeof window !== 'undefined' ? window : globalThis);
