#!/usr/bin/env node
/* Live a life in Gilded City, headless. Node 18+, no dependencies.

     node tools/life-sim.js [--days 14] [--op fresh] [--seed 7] [--lang zh]
         a scripted resident lives N days: works, eats, sleeps, makes friends, maybe gambles.
         Prints the diary and checks the world's invariants (exit code 1 if one breaks).

     node tools/life-sim.js --agent [--turns 60] [--model name]
         a language model lives the life through the life_* tools (the same ones window.Life.tools() gives a page).

     node tools/life-sim.js --voices [--model name]
         the scripted resident talks to people played by the model.

   The model endpoint comes from the environment only (ANTHROPIC_BASE_URL, ANTHROPIC_AUTH_TOKEN, ANTHROPIC_MODEL),
   never from a file in this repo. */
const path = require('path');
const dir = path.join(__dirname, '..', 'js', 'world');
require(path.join(dir, 'data.js'));
const World = require(path.join(dir, 'core.js'));
require(path.join(dir, 'mind.js'));
const Brain = require(path.join(__dirname, '..', 'js', 'engine', 'brain.js'));

const argv = process.argv.slice(2);
const flag = (k, d) => { const i = argv.indexOf('--' + k); return i < 0 ? d : (argv[i + 1] && !argv[i + 1].startsWith('--') ? argv[i + 1] : true); };
const lang = flag('lang', 'zh');
const seed = +flag('seed', 7);
function mulberry(a) { return () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
const cfg = { baseURL: process.env.ANTHROPIC_BASE_URL || '', apiKey: process.env.ANTHROPIC_AUTH_TOKEN || process.env.ANTHROPIC_API_KEY || '', model: flag('model', process.env.ANTHROPIC_MODEL || ''), timeout: 60000 };
const haveModel = cfg.baseURL && cfg.apiKey && cfg.model;
const tty = process.stdout.isTTY;
const col = (c, s) => (tty ? `\x1b[${c}m${s}\x1b[0m` : s);
const dim = s => col('2', s), gold = s => col('33', s), purple = s => col('35', s), cyan = s => col('36', s), red = s => col('31', s);

const llm = haveModel && (flag('voices') || flag('agent')) ? (sys, messages) => Brain.callModel(cfg, sys, messages, 500) : null;
const W = World.create({ rng: mulberry(seed), lang: () => lang, llm: flag('voices') ? llm : null });

const problems = [];
function invariants(o) {
  const s = o.me.status;
  for (const k in s) if (!(s[k] >= 0 && s[k] <= 100)) problems.push(`status ${k}=${s[k]}`);
  for (const k in o.me.attrs) if (!(o.me.attrs[k] >= 1 && o.me.attrs[k] <= 12)) problems.push(`attr ${k}=${o.me.attrs[k]}`);
  for (const k in o.me.skills) if (!(o.me.skills[k] >= 0 && o.me.skills[k] <= 100)) problems.push(`skill ${k}`);
  for (const p of o.here) for (const k of ['aff', 'trust', 'fam', 'love']) if (Math.abs(p.rel[k]) > 100) problems.push(`rel ${p.id}.${k}`);
  if (!Number.isFinite(o.cash) || !Number.isFinite(o.bank)) problems.push('money NaN');
}
const show = ev => { for (const e of ev || []) if (e.text) console.log('   ' + (e.k === 'talk' ? cyan(e.text) : e.k === 'warn' || e.k === 'debt' || e.k === 'collector' ? red(e.text) : dim(e.text))); };

/* a simple resident: needs first, then the job, then people and self-improvement */
async function resident(days) {
  W.start(flag('op', 'fresh'), { t: 7 * 60 });
  const end = W.observe().t + days * 1440;
  let steps = 0;
  const rng = mulberry(seed + 1);
  while (W.observe().t < end && steps++ < 4000) {
    const o = W.observe(), L = W.legal(), s = o.me.status;
    invariants(o);
    const find = f => L.find(f);
    let a = null;
    if (s.energy < 22 || (o.hour >= 23 || o.hour < 6)) a = o.home ? (o.at === 'home' ? { type: 'do', id: 'sleep', hours: 8 } : { type: 'go', to: 'home', by: 'bus' }) : (o.at === 'park' ? { type: 'sleep', hours: 6 } : { type: 'go', to: 'park' });
    else if (s.full < 30) a = find(x => x.type === 'do' && ['meal', 'milktea', 'streetfood', 'cook'].includes(x.id)) || { type: 'go', to: o.me.items.groceries ? 'home' : 'teahouse' };
    else if (o.rent.owed && o.cash >= o.rent.owed) a = { type: 'pay_rent' };
    else if (o.asks.length && o.cash > o.asks[0].amount * 3) a = { type: 'answer', id: o.asks[0].id, yes: rng() < 0.6 };
    else if (o.debts.find(d => !d.story && o.cash > d.owed + 2000)) a = { type: 'repay', id: o.debts.find(d => !d.story).id };
    else if (find(x => x.type === 'work')) a = { type: 'work' };
    else if (o.job && o.hour >= o.job.hours[0] && o.hour < o.job.hours[1] - 3 && o.at !== o.job.at && !(o.job.id === 'clerk' && (o.weekday === 0 || o.weekday === 6))) a = { type: 'go', to: o.job.at, by: 'bus' };
    else if (o.here.length && rng() < 0.55) {
      const p = o.here[Math.floor(rng() * o.here.length)];
      const intents = ['chat', 'chat', 'praise', 'joke', 'confide', 'rumor', 'invite', 'advice', 'teach', 'number', 'flirt'];
      const r = await W.talk(p.id, { intent: intents[Math.floor(rng() * intents.length)] });
      if (r.ok) { console.log(gold(W.clock()) + ' ' + p.name + (r.intent ? dim(' [' + r.intent + ']') : '') + ': ' + cyan(r.say) + (r.think ? purple('  (' + r.think + ')') : '') + (r.effects.length ? dim('  ' + JSON.stringify(r.effects)) : '')); }
      continue;
    } else if (o.me.status.urge > 70 && rng() < 0.6) a = o.at === 'casino' ? { type: 'do', id: 'casino', min: 90, stake: 200 } : { type: 'go', to: 'casino', by: 'bus' };
    else {
      const self = L.filter(x => x.type === 'do' && !['sleep', 'casino', 'shark', 'pawnit', 'bank', 'wait', 'gift_l', 'shopping'].includes(x.id));
      if (self.length && rng() < 0.6) a = self[Math.floor(rng() * self.length)];
      else { const go = L.filter(x => x.type === 'go' && x.open); a = { type: 'go', to: go[Math.floor(rng() * go.length)].to, by: 'bus' }; }
    }
    if (a.type === 'do' && a.id === 'sleep') a = { type: 'do', id: 'sleep', hours: 8 };
    const r = W.act(a);
    if (!r.ok) { W.act({ type: 'wait', min: 30 }); continue; }
    const important = (r.events || []).filter(e => !['rel', 'do', 'wait'].includes(e.k));
    if (important.length) { console.log(gold(W.clock()) + ' ' + dim(a.type + ' ' + (a.id || a.to || a.job || ''))); show(important); }
  }
  const o = W.observe(); invariants(o);
  console.log('\n' + gold('— after ' + days + ' days —'));
  console.log('status', o.me.status, '\nattrs', o.me.attrs, '\nskills', o.me.skills);
  console.log('cash', o.cash, 'bank', o.bank, 'job', o.job && o.job.title, 'perf', o.job && o.job.perf, 'stats', o.stats);
  console.log('debts', o.debts, 'rent', o.rent);
  const rel = World.DATA && W.people().filter(p => p.rel.fam >= 10).sort((a, b) => b.rel.aff - a.rel.aff);
  console.log('people you know:'); for (const p of rel) console.log('  ' + p.name.padEnd(8) + ' ' + JSON.stringify(p.rel));
  console.log('intel:', o.intel.map(x => x.text));
  console.log(problems.length ? red('PROBLEMS: ' + [...new Set(problems)].join(', ')) : 'invariants ok');
  process.exit(problems.length ? 1 : 0);
}

/* a language model lives the life */
async function agent(turns) {
  if (!haveModel) { console.error('set ANTHROPIC_BASE_URL, ANTHROPIC_AUTH_TOKEN and ANTHROPIC_MODEL (or --model) in your shell'); process.exit(2); }
  W.start(flag('op', 'fresh'), { t: 7 * 60 });
  const tools = W.tools();
  const sys = 'You live in Gilded City, a life simulation. Every chip is virtual. Build a good life: keep healthy, keep a job, make friends, pay rent, and decide for yourself whether the casino is worth it. ' +
    'Use the life_* tools. Reply with JSON only: {"tool": "<name>", "input": {...}, "why": "short"}. Tools: ' + JSON.stringify(tools.map(t => ({ name: t.name, description: t.description, input: t.input_schema.properties })));
  const messages = [{ role: 'user', content: 'You wake up. Observation: ' + JSON.stringify(W.observe()).slice(0, 6000) }];
  for (let i = 0; i < turns; i++) {
    let j;
    try { const text = await Brain.callModel(cfg, sys, messages.slice(-12), 400); j = JSON.parse(text.match(/\{[\s\S]*\}/)[0]); messages.push({ role: 'assistant', content: text }); }
    catch (e) { console.log(red('model error: ' + e.message)); break; }
    const out = await W.call(j.tool, j.input || {});
    console.log(gold(W.clock()) + ' ' + cyan(j.tool) + ' ' + dim(JSON.stringify(j.input || {})) + (j.why ? purple('  ' + j.why) : ''));
    show(out && out.events); if (out && out.say) console.log('   ' + cyan(out.say));
    messages.push({ role: 'user', content: 'Result: ' + JSON.stringify(out).slice(0, 4000) + '\nNow: ' + JSON.stringify(W.observe()).slice(0, 3000) });
  }
  console.log(W.observe());
}

if (flag('agent')) agent(+flag('turns', 60));
else resident(+flag('days', 14));
