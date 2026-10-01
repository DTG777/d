#!/usr/bin/env node
/* Put a language model at the casino, headless. Node 18+ (global fetch), no dependencies.

   The endpoint comes from the environment only, never from files in this repo:
     ANTHROPIC_BASE_URL     an Anthropic-compatible endpoint (POST {base}/v1/messages)
     ANTHROPIC_AUTH_TOKEN   its key (ANTHROPIC_API_KEY also works)
     ANTHROPIC_MODEL        model name (or --model)

   Two ways to use it:

   1) table: language-model personas sit at a card-room table with scripted personas.
      You watch the transcript: every action, the table talk (bluffs included) and,
      in purple, what the model was really thinking when it said it.
        node tools/llm-agent.js table zhajinhua --hands 3 --llm 2 --lang zh

   2) play: the model is the gambler. It gets the casino_* function-calling tools
      (the same ones window.Casino.tools() hands to a browser agent) and plays any game
      on its own until it runs out of turns.
        node tools/llm-agent.js play blackjack --turns 20

   Games: zhajinhua, niuniu, doudizhu, mahjong for `table`; any game id for `play`
   (node tools/llm-agent.js games lists them). */
const path = require('path');
const dir = path.join(__dirname, '..', 'js', 'engine');
const E = require(path.join(dir, 'core.js'));
for (const f of ['agent', 'cards', 'tables', 'slots', 'instant', 'fortune7-math', 'ddz', 'zjh', 'mahjong']) require(path.join(dir, f + '.js'));
const Brain = require(path.join(dir, 'brain.js'));
const A = E.Agent;

/* ---------- args + config ---------- */
const argv = process.argv.slice(2);
const flag = (name, def) => { const i = argv.indexOf('--' + name); return i < 0 ? def : argv[i + 1]; };
const pos = argv.filter((a, i) => !a.startsWith('--') && !(i > 0 && argv[i - 1].startsWith('--')));
const [mode = 'help', game] = pos;
const lang = flag('lang', 'zh');
const cfg = {
  baseURL: process.env.ANTHROPIC_BASE_URL || '',
  apiKey: process.env.ANTHROPIC_AUTH_TOKEN || process.env.ANTHROPIC_API_KEY || '',
  model: flag('model', process.env.ANTHROPIC_MODEL || ''),
  timeout: +flag('timeout', 45000)
};
const tty = process.stdout.isTTY;
const col = (c, s) => tty ? `\x1b[${c}m${s}\x1b[0m` : s;
const gold = s => col('33', s), dim = s => col('2', s), purple = s => col('35', s), cyan = s => col('36', s), red = s => col('31', s), green = s => col('32', s);

function need() {
  const miss = [!cfg.baseURL && 'ANTHROPIC_BASE_URL', !cfg.apiKey && 'ANTHROPIC_AUTH_TOKEN', !cfg.model && 'ANTHROPIC_MODEL (or --model)'].filter(Boolean);
  if (miss.length) { console.error('missing: ' + miss.join(', ') + '\nset them in your shell, not in a file in this repo.'); process.exit(2); }
  console.log(dim(`endpoint ${cfg.baseURL.replace(/\/+$/, '')}/v1/messages · model ${cfg.model} · key ****${cfg.apiKey.slice(-4)}`));
}

/* ---------- transcript ---------- */
const names = {};
const who = id => names[id] || id;
const brief = ev => {
  const rest = { ...ev }; delete rest.t; delete rest.seat; delete rest.to;
  const s = JSON.stringify(rest);
  return s === '{}' ? '' : ' ' + (s.length > 110 ? s.slice(0, 107) + '...' : s);
};
function print(ev) {
  if (ev.t === 'say') return console.log(`  ${cyan('💬 ' + who(ev.seat))}: ${ev.text}`);
  if (ev.t === 'settle') return console.log(`  ${who(ev.seat)} ${ev.net > 0 ? green('+' + ev.net) : ev.net < 0 ? red(String(ev.net)) : '±0'}`);
  if (ev.t === 'turn' || ev.t === 'pot') return;
  console.log(dim(`  ${who(ev.seat)} ${ev.t}${brief(ev)}`));
}

/* ---------- mode 1: LLM personas at a card-room table ---------- */
async function table() {
  const e = E.list[game];
  if (!e || e.mode !== 'pvp') { console.error('table mode needs a card-room game: ' + Object.values(E.list).filter(x => x.mode === 'pvp').map(x => x.id).join(', ')); process.exit(2); }
  need();
  const hands = +flag('hands', 3), nLLM = Math.max(1, Math.min(e.seats, +flag('llm', 1)));
  const cast = ['hao', 'ling', 'mei', 'oldk', 'fei', 'ace'];
  const brains = {}, seats = [];
  for (let i = 0; i < e.seats; i++) {
    const id = 'p' + i, persona = cast[i % cast.length], P = Brain.PERSONAS[persona];
    const llm = i < nLLM;
    brains[id] = llm
      ? Brain.llm(game, persona, cfg, { lang, onThought: t => console.log(`  ${purple('🧠 ' + (P.name[lang] || P.name.en) + ' thinks: ' + t)}`) })
      : Brain.scripted(game, persona, { lang });
    names[id] = (P.name[lang] || P.name.en) + (llm ? '(AI)' : '');
    seats.push({ id, name: names[id], balance: 100000, policy: brains[id], meta: { persona } });
  }
  const t = new E.Table(game, { seed: flag('seed', 'llm:' + Date.now()), seats });
  const total0 = t.order.reduce((a, id) => a + t.seats[id].balance, 0);
  console.log(gold(`\n== ${e.name[lang] || e.name.en} · ${t.order.map(who).join(' / ')} ==`));
  const react = ev => {
    for (const id in brains) {
      if (id === ev.seat) continue;
      const line = brains[id].react(ev, id);
      if (line) for (const s of t.say(id, line).events || []) print(s);
    }
  };
  for (let h = 1; h <= hands; h++) {
    console.log(gold(`\n-- hand ${h} --`));
    for (let i = 0; i < 2000; i++) {
      const s = t.turn(), obs = s && t.observe(s);
      if (!obs || !obs.legal.length) { console.log(dim('  (nobody can act)')); break; }
      const pol = brains[s];
      let a = await pol(obs);
      let r = t.act(s, a);
      if (!r.ok) { console.log(red(`  ${who(s)} illegal (${r.error}), playing it safe`)); r = t.act(s, e.bot(obs, Math.random)); }
      for (const ev of r.all) if (ev.to === undefined) { print(ev); react(ev); }
      if (pol.lastError) { console.log(red(`  ${who(s)} model error: ${pol.lastError} (fell back to its script)`)); pol.lastError = null; }
      if (r.done) break;
    }
    // what the table did not see: the bluffs, and what the model thought while it talked
    for (const id in brains) {
      for (const tell of brains[id].tells || []) {
        if (tell.kind === 'think') { if (tell.said) console.log(purple(`  ${who(id)} said "${tell.said}" while thinking: ${tell.text}`)); }
        else console.log(purple(`  ${who(id)} ${tell.kind === 'bluff' ? 'was bluffing' : 'was sandbagging'}: "${tell.said}"`));
      }
      brains[id].tells = [];
    }
  }
  console.log(gold('\n== chips =='));
  for (const id of t.order) { const d = t.seats[id].balance - 100000; console.log(`  ${who(id).padEnd(10)} ${t.seats[id].balance}  (${d > 0 ? green('+' + d) : d < 0 ? red(String(d)) : '±0'})`); }
  const total1 = t.order.reduce((a, id) => a + t.seats[id].balance, 0);
  if (total0 !== total1) { console.error(red('chips not conserved!')); process.exit(1); }
}

/* ---------- mode 2: the model is the gambler (function calling) ---------- */
async function messages(body) {
  const ctl = new AbortController(), timer = setTimeout(() => ctl.abort(), cfg.timeout);
  try {
    const res = await fetch(cfg.baseURL.replace(/\/+$/, '') + '/v1/messages', {
      method: 'POST', signal: ctl.signal,
      headers: { 'content-type': 'application/json', 'anthropic-version': '2023-06-01', 'x-api-key': cfg.apiKey, authorization: 'Bearer ' + cfg.apiKey },
      body: JSON.stringify({ model: cfg.model, max_tokens: 1024, ...body })
    });
    if (!res.ok) throw new Error('HTTP ' + res.status + ' ' + (await res.text()).slice(0, 300));
    return await res.json();
  } finally { clearTimeout(timer); }
}
async function play() {
  if (!E.list[game]) { console.error('unknown game; try: node tools/llm-agent.js games'); process.exit(2); }
  need();
  const turns = +flag('turns', 20);
  const provider = A.sessionProvider({ balance: +flag('balance', 10000), seed: flag('seed', 'llm-play:' + Date.now()) });
  const call = A.handler(provider);
  const system = `You are a gambler at a virtual-chip casino (no real money). Play ${game} with the casino_* tools: describe it once, then loop observe -> act. Pick only actions from \`legal\`. Size your bets sensibly, you want to leave with more chips than you came with. Keep your text short.`;
  const msgs = [{ role: 'user', content: `Sit down at ${game} and play. You have ${turns} tool calls.` }];
  let used = 0;
  while (used < turns) {
    const r = await messages({ system, tools: A.tools(), messages: msgs });
    msgs.push({ role: 'assistant', content: r.content });
    for (const c of r.content) if (c.type === 'text' && c.text.trim()) console.log(purple('🧠 ' + c.text.trim()));
    const uses = r.content.filter(c => c.type === 'tool_use');
    if (!uses.length) break;
    const results = [];
    for (const u of uses) {
      used++;
      const out = await call(u.name, u.input);
      if (u.name === 'casino_act') {
        console.log(cyan(`▶ ${JSON.stringify(u.input.action)}`));
        if (out.error) console.log(red('  ' + out.error));
        for (const ev of out.events || []) print(ev);
      } else console.log(dim(`▶ ${u.name} ${JSON.stringify(u.input)}`));
      results.push({ type: 'tool_result', tool_use_id: u.id, content: JSON.stringify(out).slice(0, 12000) });
    }
    msgs.push({ role: 'user', content: results });
    if (r.stop_reason !== 'tool_use') break;
  }
  const s = provider.sessions[game];
  if (s) console.log(gold(`\nbalance ${s.balance} · rounds ${s.stats.rounds} · wagered ${s.stats.wagered} · returned ${s.stats.returned}`));
}

/* ---------- main ---------- */
const run = { table, play, games: async () => { for (const g of A.gamesList()) console.log(`${g.id.padEnd(12)} ${g.kind.padEnd(8)} ${g.mode.padEnd(7)} ${g.name.zh} / ${g.name.en}`); } }[mode];
if (!run) { console.log(require('fs').readFileSync(__filename, 'utf8').split('*/')[0].replace(/^#!.*\n\/\* ?/, '')); process.exit(mode === 'help' ? 0 : 2); }
run().catch(err => { console.error(red(String(err && err.stack || err))); process.exit(1); });
