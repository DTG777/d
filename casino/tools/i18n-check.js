// Verifies every I18N key referenced in the code exists in both languages: node casino/tools/i18n-check.js
const fs = require('fs'), path = require('path');
global.LS = { get: (k, d) => d, set() {} };
global.navigator = { language: 'en' };
global.document = { documentElement: {} };
global.window = global;
require('../js/i18n.js');
for (const f of fs.readdirSync(path.join(__dirname, '../js')).filter(f => /^i18n-.+\.js$/.test(f))) require('../js/' + f);
const D = I18N._dict;
const files = [...fs.readdirSync(path.join(__dirname, '../js')).filter(f => f.endsWith('.js') && !f.startsWith('i18n') && !['util.js', 'audio.js'].includes(f)).map(f => 'js/' + f), ...fs.readdirSync(path.join(__dirname, '../js/games')).map(f => 'js/games/' + f)];
const keys = new Set();
for (const f of files) {
  const src = fs.readFileSync(path.join(__dirname, '..', f), 'utf8');
  for (const m of src.matchAll(/(?:\bt|I18N\.t)\(\s*'([\w.]+)'/g)) keys.add(m[1]);
  for (const m of src.matchAll(/data-i18n(?:-aria)?="([\w.]+)"/g)) keys.add(m[1]);
  for (const m of src.matchAll(/key: '([\w.]+)'/g)) if (m[1].includes('.')) keys.add(m[1]);
  for (const m of src.matchAll(/'((?:tut|aca|bjc|cl|cs|tb)\.[\w.]+)'/g)) keys.add(m[1]);
}
// dynamic keys
['slots', 'classic', 'caishen', 'treasure', 'blackjack', 'roulette', 'baccarat', 'sicbo', 'crash', 'plinko', 'zhajinhua', 'niuniu', 'doudizhu', 'mahjong'].forEach(g => { keys.add('game.' + g); keys.add('tag.' + g); });
['cherry', 'lemon', 'bell', 'bar', 'diamond', 'seven', 'wild', 'scatter'].forEach(s => keys.add('sym.' + s));
['red', 'black', 'green', 'doz1', 'doz2', 'doz3'].forEach(s => keys.add('rl.' + s));
['p', 'b', 't'].forEach(s => keys.add('bc.bead.' + s));
['low', 'medium', 'high'].forEach(s => keys.add('pl.' + s));
['cardroom', 'slots', 'tables', 'instant'].forEach(s => { keys.add('lobby.' + s); keys.add('lobby.' + s + 'Sub'); });
['high', 'pair', 'straight', 'flush', 'sflush', 'trips'].forEach(s => keys.add('zj.' + s));
for (let i = 1; i <= 8; i++) keys.add('pv.q' + i);
['start', 'games', 'odds', 'words'].forEach(k => keys.add('aca.tab.' + k));
['start', 'odds', 'words'].forEach(k => keys.add('aca.' + k));
['slots', 'classic', 'caishen', 'treasure', 'blackjack', 'roulette', 'baccarat', 'sicbo', 'crash', 'plinko', 'zhajinhua', 'niuniu', 'doudizhu', 'mahjong'].forEach(g => keys.add('aca.g.' + g));
['hit', 'stand', 'double', 'split'].forEach(a => keys.add('bj.' + a));
const EN = require('../js/engine/core.js'); require('../js/engine/ddz.js'); require('../js/engine/mahjong.js'); require('../js/engine/fortune7-math.js'); require('../js/engine/slots.js');
Object.keys(EN.list.classic.PAY).forEach(k => keys.add('cl.k.' + k));
EN.list.caishen.NAMES.forEach(n => keys.add('cs.sym.' + n));
EN.list.treasure.NAMES.forEach(n => keys.add('tb.sym.' + n));
['grand', 'major', 'minor', 'mini'].forEach(k => keys.add('tb.jp.' + k));
Object.keys(EN.list.mahjong.FAN_NAME).forEach(f => keys.add('mj.f.' + f));
for (const m of fs.readFileSync(path.join(__dirname, '../js/engine/ddz.js'), 'utf8').matchAll(/type: '(\w+)'/g)) if (!['play', 'pass', 'bid', 'start'].includes(m[1])) keys.add('dz.c.' + m[1]);
// the floor: every zone, place and talking role
const FLOOR = fs.readFileSync(path.join(__dirname, '../js/floor.js'), 'utf8');
for (const m of FLOOR.matchAll(/\{ id: '(\w+)', r: \[/g)) { keys.add('zone.' + m[1]); keys.add('zsub.' + m[1]); }
for (const m of FLOOR.matchAll(/(?:svc|fn): '(\w+)', ux/g)) { keys.add('svc.' + m[1]); keys.add('svcSub.' + m[1]); }
for (const m of FLOOR.matchAll(/talk: '(\w+)'/g)) if (m[1] !== 'persona') keys.add('npc.' + m[1]);
for (const m of FLOOR.matchAll(/'sign', '(\w+)'/g)) keys.add('zone.' + m[1]);
['slot', 'slotwin', 'tablewin', 'table', 'card', 'dealer', 'bar', 'din', 'walk', 'waitress', 'pitboss', 'vip', 'lottoguy', 'pianist'].forEach(k => keys.add('fl.chat.' + k));
['hao', 'ling', 'oldk', 'mei', 'ace', 'fei'].forEach(k => keys.add('fl.p.' + k));
['bartender', 'cashier', 'club', 'host', 'chef', 'lotto', 'concierge', 'shop', 'hotel', 'bell', 'doorman', 'pianist'].forEach(k => keys.add('fl.hi.' + k));
['taken', 'marquee.slots', 'marquee.pit', 'music.on', 'music.off', 'vipSub', 'pvpSub', 'use', 'play'].forEach(k => keys.add('fl.' + k));
// services: menus and tiers
const SV = fs.readFileSync(path.join(__dirname, '../js/services.js'), 'utf8');
for (const [list, a, b] of [['FOOD', 'f', 'fd'], ['BAR', 'd', 'dd'], ['ROOMS', 'h', 'hd'], ['WEAR', 'w', 'wd'], ['ACC', 'w', 'wd']]) {
  const block = SV.match(new RegExp('const ' + list + ' = \\[([\\s\\S]*?)\\n  \\];'))[1];
  for (const m of block.matchAll(/id: '(\w+)'/g)) { keys.add('sv.' + a + '.' + m[1]); keys.add('sv.' + b + '.' + m[1]); }
}
for (let i = 0; i < 5; i++) { keys.add('sv.tier.' + i); keys.add('sv.perk.' + i); }
for (let i = 1; i <= 6; i++) keys.add('sv.wish.' + i);
['water', 'pour'].forEach(k => keys.add('sv.bt.' + k));
// story: openings, lenders, people, achievements, endings
const ST = fs.readFileSync(path.join(__dirname, '../js/story.js'), 'utf8');
const listOf = name => ST.match(new RegExp('const ' + name + ' = \\[([^\\]]*)\\]'))[1].match(/'(\w+)'/g).map(s => s.slice(1, -1));
const keysOf = name => [...ST.match(new RegExp('const ' + name + ' = \\{([\\s\\S]*?)\\n  \\};'))[1].matchAll(/^\s+(\w+): \{/gm)].map(m => m[1]);
const OPS = keysOf('OPS'), APPS = keysOf('APPS');
OPS.forEach(k => { ['op', 'opd', 'goal'].forEach(p => keys.add(`st.${p}.${k}`)); for (let i = 1; i <= 3; i++) keys.add(`st.pro.${k}.${i}`); });
APPS.forEach(k => ['src', 'slogan', 'rate', 'who'].forEach(p => keys.add(`st.${p}.${k}`)));
['marker', 'junket'].forEach(k => keys.add('st.src.' + k));
listOf('WHO').forEach(w => keys.add('st.who.' + w));
['family', 'friend', 'bank', 'casino', 'junket', 'collector'].forEach(w => keys.add('st.g.' + w));
['family', 'friend', 'junket', 'collector'].forEach(w => { for (let i = 1; i <= 3; i++) { keys.add(`st.re.${w}.${i}`); keys.add(`st.q.${w}.${i}`); } });
listOf('ACH').forEach(k => { keys.add('st.a.' + k); keys.add('st.ad.' + k); });
listOf('ENDS').forEach(k => ['e', 'es', 'e.hint', 'eb'].forEach(p => keys.add(`st.${p}.${k}`)));
['ashore', 'walkaway'].forEach(k => { keys.add('st.offer.' + k); keys.add('st.offerB.' + k); });
for (let i = 1; i <= 4; i++) keys.add('st.ad.' + i);
for (let i = 1; i <= 3; i++) keys.add('st.junket.hi.' + i);
['demo', 'rich'].forEach(k => keys.add('st.fam.' + k));
['has', 'credit', 'multi', 'max'].forEach(k => keys.add('st.rej.' + k));
['msgs', 'bills', 'bank', 'ach', 'ends', 'life', 'loans'].forEach(k => keys.add('st.app.' + k));
let bad = 0;
for (const k of [...keys].filter(k => !k.endsWith('.'))) for (const l of ['zh', 'en']) if (D[l][k] == null) { console.log('missing', l, k); bad++; }
for (const k of Object.keys(D.zh)) if (D.en[k] == null) { console.log('en lacks', k); bad++; }
for (const k of Object.keys(D.en)) if (D.zh[k] == null) { console.log('zh lacks', k); bad++; }
console.log(bad ? bad + ' problems' : `ok: ${keys.size} keys referenced, both languages complete`);
