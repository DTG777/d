/* Agent kit: everything an AI player needs, shared by the browser (window.Casino)
   and node (tools/llm-agent.js, tools/agent-sim.js).

   - describe(id)       full machine-readable rules of a game
   - actionSchema(spec) JSON Schema for one legal action, oneOf for a list
   - tools()            function-calling tool definitions (Anthropic / OpenAI shape)
   - handler(provider)  dispatches tool calls onto any provider that implements
                        games() / describe(id) / observe(id, seat) / act(id, action, seat)
   - sessionProvider()  a provider backed by headless Engines.Session objects */
(function (root) {
  const E = root.Engines || require('./core.js');

  // what each event type means, so an agent can read a round transcript
  const EVENTS = {
    bet: 'chips staked on a spot', clear: 'bets withdrawn', ready: 'seat finished betting', outcome: 'round result (number, dice, cards...)',
    settle: 'round settled for one seat: bet = total staked, ret = total returned incl. stake, net = ret - bet',
    card: 'a card was dealt', deal: 'initial cards dealt', draw: 'cards replaced', reels: 'reel symbols landed', wins: 'winning combinations',
    tumble: 'winning symbols removed and new ones dropped', orbs: 'multiplier orbs on screen', freeSpins: 'free spins awarded', freeEnd: 'free spins finished',
    hold: 'hold & win respin feature', drop: 'plinko ball path', gem: 'safe tile revealed', mine: 'mine hit', cashout: 'player cashed out',
    turn: 'next seat to act', bid: 'landlord bid', play: 'cards played', pass: 'seat passed', bomb: 'bomb / rocket doubles the stake',
    look: 'seat looked at its cards', call: 'matched the current stake', raise: 'raised the stake', fold: 'gave up', compare: 'two hands compared, loser folds',
    banker: 'banker chosen', discard: 'tile discarded', pong: 'pong (three of a kind) claimed', kong: 'kong (four of a kind) declared',
    hu: 'winning hand declared', lack: 'suit chosen to discard first (que)', shuffle: 'shoe reshuffled'
  };

  function paramSchema(p) {
    if (p.enum) return { enum: p.enum.slice(0, 200) };
    if (p.int) return { type: 'integer', ...(p.min != null ? { minimum: p.min } : {}), ...(p.max != null ? { maximum: p.max } : {}) };
    if (p.num) return { type: 'number', ...(p.min != null ? { minimum: p.min } : {}), ...(p.max != null ? { maximum: p.max } : {}) };
    if (p.bools) return { type: 'array', items: { type: 'boolean' }, minItems: p.bools, maxItems: p.bools };
    if (p.cards) return { type: 'array', items: { type: 'string' }, description: 'card codes from your hand' };
    if (p.tiles) return { type: 'array', items: { type: 'string' } };
    return {};
  }
  function actionSchema(spec) {
    if (Array.isArray(spec)) return { oneOf: spec.map(actionSchema) };
    const props = { type: { const: spec.type } }, req = ['type'];
    for (const k in (spec.params || {})) {
      props[k] = { ...paramSchema(spec.params[k]), ...(spec.params[k].default !== undefined ? { default: spec.params[k].default } : {}) };
      if (spec.params[k].default === undefined) req.push(k);
    }
    return { type: 'object', description: spec.desc, properties: props, required: req, additionalProperties: false };
  }

  function describe(id) {
    const e = E.list[id];
    if (!e) return { error: `unknown game "${id}"`, games: Object.keys(E.list) };
    const out = { id, name: e.name, kind: e.kind, mode: e.mode, seats: e.seats || (e.mode === 'shared' ? 'any' : 1), rules: e.doc };
    if (e.spots) out.spots = Object.fromEntries(Object.entries(e.spots).map(([k, v]) => [k, { pays: v.pays, desc: v.desc }]));
    if (e.minBet) out.limits = { minBet: e.minBet, maxTotal: e.maxTotal };
    if (e.BETS) out.bets = e.BETS;
    if (e.PAY && !e.spots) out.paytable = e.PAY;
    if (e.cardCodes !== false && (e.kind === 'table' || e.kind === 'pvp')) out.cards = 'Cards are 2-char codes: rank A23456789TJQK + suit S H D C, e.g. "TH" = ten of hearts, "??" = face down. Jokers: "BJ" (black / small) and "RJ" (red / big).';
    if (e.tileCodes) out.tiles = e.tileCodes;
    out.loop = e.mode === 'pvp'
      ? 'observe -> if toAct is your seat, pick one action from legal and act -> repeat. Other seats act on their own turns.'
      : e.mode === 'shared'
        ? 'observe -> bet (repeat as needed) -> start the round (host) or done (guest) -> read settle events.'
        : 'observe -> act with one action from legal -> read events -> repeat.';
    out.events = EVENTS;
    return out;
  }

  const TOOLS = [
    { name: 'casino_games', description: 'List every game at the casino with id, name and kind.', input_schema: { type: 'object', properties: {}, additionalProperties: false } },
    { name: 'casino_describe', description: 'Full rules of one game: payouts, spots, action shapes and the event glossary. Read this before playing a game for the first time.', input_schema: { type: 'object', properties: { game: { type: 'string' } }, required: ['game'], additionalProperties: false } },
    { name: 'casino_observe', description: 'Your current view of a game: balance, your cards / bets, public table state, whose turn it is, and `legal`: the exact actions you may take now (with parameter ranges).', input_schema: { type: 'object', properties: { game: { type: 'string' } }, required: ['game'], additionalProperties: false } },
    { name: 'casino_act', description: 'Take one action. `action` must match one entry of `legal` from casino_observe, e.g. {"type":"bet","spot":"red","amount":100} or {"type":"hit"}. Returns the events it caused (cards, results, settle with net chips) and your new observation. Illegal actions return an error explaining what is allowed. Add "say" to the action to talk at the table while you act (banter, bluffs, taunts; other players read it), e.g. {"type":"raise","level":5,"say":"I would fold if I were you."}', input_schema: { type: 'object', properties: { game: { type: 'string' }, action: { type: 'object', properties: { type: { type: 'string' }, say: { type: 'string', description: 'optional table talk, max 160 chars' } }, required: ['type'] } }, required: ['game', 'action'], additionalProperties: false } },
    { name: 'casino_say', description: 'Say something at the table without acting (reply to chat, needle an opponent). Everyone at the table sees it in `chat`.', input_schema: { type: 'object', properties: { game: { type: 'string' }, text: { type: 'string' } }, required: ['game', 'text'], additionalProperties: false } }
  ];
  // OpenAI-compatible shape of the same tools
  const openaiTools = () => TOOLS.map(t => ({ type: 'function', function: { name: t.name, description: t.description, parameters: t.input_schema } }));

  // provider: { games(), describe(id), observe(id, seat), act(id, action, seat) } -> tool handler
  function handler(provider, seat = 'you') {
    return async function call(name, input = {}) {
      try {
        if (name === 'casino_games') return await provider.games();
        if (name === 'casino_describe') return await provider.describe(input.game);
        if (name === 'casino_observe') return await provider.observe(input.game, seat);
        if (name === 'casino_act') return await provider.act(input.game, input.action, seat);
        if (name === 'casino_say') return await provider.say(input.game, input.text, seat);
        return { error: `unknown tool ${name}` };
      } catch (err) { return { error: String(err && err.message || err) }; }
    };
  }

  const gamesList = () => Object.values(E.list).map(e => ({ id: e.id, name: e.name, kind: e.kind, mode: e.mode, seats: e.seats || 1 }));

  // headless provider: one Session per game, created on first use
  function sessionProvider(opts = {}) {
    const sessions = {};
    const get = id => sessions[id] || (sessions[id] = new E.Session(id, { balance: 10000, ...opts, seed: (opts.seed || 'agent') + ':' + id }));
    return {
      sessions,
      games: gamesList,
      describe,
      observe: id => get(id).observe(),
      act(id, action) {
        const s = get(id), r = s.act(action);
        return r.ok ? { ok: true, events: r.events, obs: r.obs } : r;
      },
      say: (id, text) => get(id).table.say('you', text)
    };
  }

  const Agent = { EVENTS, describe, actionSchema, tools: () => TOOLS, openaiTools, handler, sessionProvider, gamesList };
  E.Agent = Agent;
  if (typeof module !== 'undefined' && module.exports) module.exports = Agent;
})(typeof window !== 'undefined' ? window : globalThis);
