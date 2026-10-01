#!/usr/bin/env node
/* Serve the game and lend it a language model, without the key ever reaching the browser.

     ANTHROPIC_BASE_URL=https://… ANTHROPIC_AUTH_TOKEN=… node tools/serve.js [--port 8080] [--host 127.0.0.1] [--model name]

   - static files from this folder (index.html and friends)
   - POST /llm/v1/messages   forwarded to {ANTHROPIC_BASE_URL}/v1/messages with the key from the environment
   - GET  /llm/health        { ok, model } so the page can turn AI on by itself

   The key is read from the environment only (ANTHROPIC_AUTH_TOKEN or ANTHROPIC_API_KEY); never put it in a file
   in this repo. The model is --model, LLM_MODEL or ANTHROPIC_MODEL; if none is set, the server asks the endpoint's
   /v1/models and prefers a "flash" model, then a "deepseek" one, then the first listed.
   Only same-origin pages may use the forwarder, and it listens on 127.0.0.1 unless told otherwise. Node 18+. */
const http = require('http');
const fs = require('fs');
const path = require('path');

const argv = process.argv.slice(2);
const flag = (k, d) => { const i = argv.indexOf('--' + k); return i < 0 ? d : argv[i + 1]; };
const ROOT = path.resolve(__dirname, '..');
const PORT = +flag('port', process.env.PORT || 8080);
const HOST = flag('host', '127.0.0.1');
const BASE = (process.env.ANTHROPIC_BASE_URL || '').replace(/\/+$/, '');
const KEY = process.env.ANTHROPIC_AUTH_TOKEN || process.env.ANTHROPIC_API_KEY || '';
let MODEL = flag('model', process.env.LLM_MODEL || process.env.ANTHROPIC_MODEL || '');
const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.ico': 'image/x-icon', '.md': 'text/markdown; charset=utf-8', '.woff2': 'font/woff2' };

const auth = () => ({ 'content-type': 'application/json', 'anthropic-version': '2023-06-01', 'x-api-key': KEY, authorization: 'Bearer ' + KEY });
async function pickModel() {
  if (MODEL || !BASE || !KEY) return MODEL;
  try {
    const r = await fetch(BASE + '/v1/models', { headers: auth(), signal: AbortSignal.timeout(15000) });
    const j = await r.json();
    const ids = (j.data || j.models || []).map(m => m.id || m.name).filter(Boolean);
    MODEL = ids.find(id => /flash/i.test(id)) || ids.find(id => /deepseek|ds/i.test(id)) || ids[0] || '';
  } catch (e) { console.error('could not list models (' + e.message + '); pass --model'); }
  return MODEL;
}

function sameOrigin(req) {
  const o = req.headers.origin;
  if (!o) return true;
  try { return new URL(o).host === req.headers.host; } catch (e) { return false; }
}
function send(res, code, body, type = 'application/json') {
  res.writeHead(code, { 'content-type': type, 'cache-control': 'no-store', 'x-content-type-options': 'nosniff' });
  res.end(typeof body === 'string' || Buffer.isBuffer(body) ? body : JSON.stringify(body));
}

async function forward(req, res) {
  if (!BASE || !KEY) return send(res, 503, { error: 'no model configured: set ANTHROPIC_BASE_URL and ANTHROPIC_AUTH_TOKEN' });
  if (!sameOrigin(req)) return send(res, 403, { error: 'cross-origin use is not allowed' });
  let raw = '';
  for await (const chunk of req) { raw += chunk; if (raw.length > 400000) return send(res, 413, { error: 'too large' }); }
  let body;
  try { body = JSON.parse(raw); } catch (e) { return send(res, 400, { error: 'bad json' }); }
  if (!body.model || body.model === 'auto' || body.model === MODEL) body.model = await pickModel();
  body.max_tokens = Math.min(+body.max_tokens || 400, 2000);
  delete body.stream;
  try {
    const r = await fetch(BASE + '/v1/messages', { method: 'POST', headers: auth(), body: JSON.stringify(body), signal: AbortSignal.timeout(90000) });
    const text = await r.text();
    send(res, r.status, text);
  } catch (e) { send(res, 502, { error: 'upstream: ' + e.message }); }
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, 'http://x');
  if (url.pathname === '/llm/health') return send(res, BASE && KEY ? 200 : 503, { ok: !!(BASE && KEY), model: await pickModel() || null });
  if (url.pathname === '/llm/v1/messages' && req.method === 'POST') return forward(req, res);
  if (req.method !== 'GET' && req.method !== 'HEAD') return send(res, 405, { error: 'method' });
  let p = decodeURIComponent(url.pathname);
  if (p.endsWith('/')) p += 'index.html';
  const file = path.join(ROOT, path.normalize(p).replace(/^([/\\])+/, ''));
  if (!file.startsWith(ROOT) || /[/\\]\./.test(path.relative(ROOT, file))) return send(res, 404, 'not found', 'text/plain');
  fs.readFile(file, (err, data) => {
    if (err) return send(res, 404, 'not found', 'text/plain');
    res.writeHead(200, { 'content-type': TYPES[path.extname(file)] || 'application/octet-stream', 'cache-control': 'no-cache' });
    res.end(req.method === 'HEAD' ? '' : data);
  });
});
server.listen(PORT, HOST, async () => {
  console.log(`Gilded City on http://${HOST}:${PORT}/`);
  if (BASE && KEY) console.log('model forwarding on, model: ' + (await pickModel() || '(none found, pass --model)'));
  else console.log('no ANTHROPIC_BASE_URL / ANTHROPIC_AUTH_TOKEN in the environment: people speak from the script');
});
