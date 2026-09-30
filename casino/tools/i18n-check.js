// Verifies every I18N key referenced in the code exists in both languages: node casino/tools/i18n-check.js
const fs = require('fs'), path = require('path');
global.LS = { get: (k, d) => d, set() {} };
global.navigator = { language: 'en' };
global.document = { documentElement: {} };
global.window = global;
require('../js/i18n.js');
const D = I18N._dict;
const files = ['js/core.js', 'js/fx.js', 'js/main.js', ...fs.readdirSync(path.join(__dirname, '../js/games')).map(f => 'js/games/' + f)];
const keys = new Set();
for (const f of files) {
  const src = fs.readFileSync(path.join(__dirname, '..', f), 'utf8');
  for (const m of src.matchAll(/(?:\bt|I18N\.t)\(\s*'([\w.]+)'/g)) keys.add(m[1]);
  for (const m of src.matchAll(/data-i18n(?:-aria)?="([\w.]+)"/g)) keys.add(m[1]);
  for (const m of src.matchAll(/key: '([\w.]+)'/g)) if (m[1].includes('.')) keys.add(m[1]);
}
// dynamic keys
['slots', 'blackjack', 'roulette', 'baccarat', 'sicbo', 'crash', 'plinko'].forEach(g => { keys.add('game.' + g); keys.add('tag.' + g); });
['cherry', 'lemon', 'bell', 'bar', 'diamond', 'seven', 'wild', 'scatter'].forEach(s => keys.add('sym.' + s));
['red', 'black', 'green', 'doz1', 'doz2', 'doz3'].forEach(s => keys.add('rl.' + s));
['p', 'b', 't'].forEach(s => keys.add('bc.bead.' + s));
['low', 'medium', 'high'].forEach(s => keys.add('pl.' + s));
let bad = 0;
for (const k of [...keys].filter(k => !k.endsWith('.'))) for (const l of ['zh', 'en']) if (D[l][k] == null) { console.log('missing', l, k); bad++; }
for (const k of Object.keys(D.zh)) if (D.en[k] == null) { console.log('en lacks', k); bad++; }
for (const k of Object.keys(D.en)) if (D.zh[k] == null) { console.log('zh lacks', k); bad++; }
console.log(bad ? bad + ' problems' : `ok: ${keys.size} keys referenced, both languages complete`);
