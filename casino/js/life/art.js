/* Painted SVG for the city: the night map with its districts, buildings and people,
   and a scene for every place, lit by the hour. */
(function () {
  const rnd = seed => () => { seed |= 0; seed = seed + 0x6D2B79F5 | 0; let t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
  const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

  /* light by hour: how dark the sky is, how many windows are lit, the tint */
  function sky(h) {
    if (h >= 6 && h < 8) return { k: 'dawn', dark: 0.25, lit: 0.25, top: '#f7a76c', bot: '#5a6fa8', tint: 'rgba(255,170,110,.12)' };
    if (h >= 8 && h < 17) return { k: 'day', dark: 0.05, lit: 0.08, top: '#8cc6f0', bot: '#cfe6f5', tint: 'rgba(180,220,255,.10)' };
    if (h >= 17 && h < 19) return { k: 'dusk', dark: 0.3, lit: 0.5, top: '#ff7e5f', bot: '#7b4a9e', tint: 'rgba(255,110,140,.12)' };
    return { k: 'night', dark: 0.55, lit: 0.8, top: '#070b1c', bot: '#1a1240', tint: 'rgba(10,14,40,.28)' };
  }

  function isoBlock(x, y, w, d, h, c, lit, r, night) {
    const top = `${x},${y - h} ${x + w},${y - h - w / 2} ${x + w + d},${y - h - w / 2 + d / 2} ${x + d},${y - h + d / 2}`;
    const left = `${x},${y - h} ${x + d},${y - h + d / 2} ${x + d},${y + d / 2} ${x},${y}`;
    const right = `${x + d},${y - h + d / 2} ${x + w + d},${y - h - w / 2 + d / 2} ${x + w + d},${y - w / 2 + d / 2} ${x + d},${y + d / 2}`;
    let win = '';
    const rows = Math.floor(h / 9);
    for (let i = 0; i < rows; i++) for (let j = 0; j < Math.floor(w / 7); j++) {
      if (r() > lit) continue;
      const wx = x + d + 3 + j * 7, wy = y - h + d / 2 + 5 + i * 9 - (j * 7 + 3) / 2;
      win += `<rect x="${wx.toFixed(1)}" y="${wy.toFixed(1)}" width="3" height="4" fill="${night ? (r() < 0.2 ? '#7fdcff' : '#ffd77a') : '#cfe8ff'}" opacity="${night ? 0.9 : 0.5}" transform="skewY(-26.6)" transform-origin="${wx} ${wy}"/>`;
    }
    return `<g><polygon points="${left}" fill="${c[1]}"/><polygon points="${right}" fill="${c[2]}"/><polygon points="${top}" fill="${c[0]}"/>${win}</g>`;
  }

  /* the whole city: m = World.map(), o = { hour, at, people: [{id, at, look, known, rel}], sel } */
  function map(m, o = {}) {
    const S = sky(o.hour), night = S.k === 'night' || S.k === 'dusk';
    const W = 1000, H = 640, out = [];
    out.push(`<defs>
      <linearGradient id="mp-sea" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${night ? '#0b2a4a' : '#2d7fb8'}"/><stop offset="1" stop-color="${night ? '#04101f' : '#164f7a'}"/></linearGradient>
      <linearGradient id="mp-land" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${night ? '#141a2e' : '#3a4a5e'}"/><stop offset="1" stop-color="${night ? '#0d1322' : '#2c3a4c'}"/></linearGradient>
      <filter id="mp-glow" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="6"/></filter>
      <filter id="mp-soft" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="28"/></filter>
      <radialGradient id="mp-vig" cx="50%" cy="45%" r="75%"><stop offset=".6" stop-color="#000" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity=".55"/></radialGradient>
    </defs>`);
    out.push(`<rect width="${W}" height="${H}" fill="url(#mp-land)"/>`);
    // districts glow
    for (const k in m.districts) {
      const d = m.districts[k];
      out.push(`<ellipse cx="${d.x * 10}" cy="${d.y * 10}" rx="210" ry="130" fill="${d.c}" opacity="${night ? 0.16 : 0.1}" filter="url(#mp-soft)"/>`);
    }
    // the sea and the far shore
    out.push(`<path d="M0 ${H} L0 585 Q140 560 300 590 T620 588 T1000 570 L1000 ${H}Z" fill="url(#mp-sea)"/>`);
    out.push(`<g class="mp-waves" stroke="${night ? '#3a7ab8' : '#a8dcff'}" stroke-width="1.4" fill="none" opacity=".45">${[600, 615, 630].map((y, i) => `<path d="M0 ${y} q40 -6 80 0 t80 0 t80 0 t80 0 t80 0 t80 0 t80 0 t80 0 t80 0 t80 0 t80 0 t80 0 t80 0" style="animation-delay:${-i * 1.3}s"/>`).join('')}</g>`);
    if (night) out.push(`<g opacity=".8">${[...Array(30)].map((_, i) => { const r = rnd(i + 9); return `<rect x="${(r() * W).toFixed(0)}" y="${(605 + r() * 30).toFixed(0)}" width="${(6 + r() * 20).toFixed(0)}" height="1.5" fill="${['#ffd77a', '#ff5ca8', '#7fdcff'][i % 3]}" opacity="${(0.2 + r() * 0.4).toFixed(2)}"/>`; }).join('')}</g>`);
    // roads between districts and to every place
    const ds = m.districts, link = [['old', 'central'], ['central', 'neon'], ['old', 'harbour'], ['central', 'harbour'], ['neon', 'harbour']];
    out.push(`<g stroke="${night ? '#2a3654' : '#5d6e84'}" stroke-width="9" stroke-linecap="round" fill="none">${link.map(([a, b]) => `<path d="M${ds[a].x * 10} ${ds[a].y * 10} Q${(ds[a].x + ds[b].x) * 5} ${(ds[a].y + ds[b].y) * 5 + 30} ${ds[b].x * 10} ${ds[b].y * 10}"/>`).join('')}</g>`);
    out.push(`<g class="mp-traffic" stroke="${night ? '#ffcf6a' : '#fff'}" stroke-width="2" stroke-dasharray="2 22" stroke-linecap="round" fill="none" opacity=".7">${link.map(([a, b]) => `<path d="M${ds[a].x * 10} ${ds[a].y * 10} Q${(ds[a].x + ds[b].x) * 5} ${(ds[a].y + ds[b].y) * 5 + 30} ${ds[b].x * 10} ${ds[b].y * 10}"/>`).join('')}</g>`);
    out.push(`<g stroke="${night ? '#1f2944' : '#53627a'}" stroke-width="4" stroke-linecap="round">${Object.values(m.places).map(p => `<line x1="${ds[p.d].x * 10}" y1="${ds[p.d].y * 10}" x2="${p.x * 10}" y2="${p.y * 10}"/>`).join('')}</g>`);
    // buildings, back to front
    const blocks = [];
    const PAL = { old: ['#4a3a34', '#2e2420', '#3a2c26'], central: ['#3c5c80', '#22344c', '#2c4462'], neon: ['#4a2a4e', '#2a1630', '#381e3e'], harbour: ['#2e4e4a', '#1a302e', '#243e3a'] };
    const DAYPAL = { old: ['#a88b72', '#6e5848', '#8a705c'], central: ['#9cc0e0', '#5d7c9c', '#7a9ebe'], neon: ['#a07aa8', '#64466a', '#7e5c86'], harbour: ['#8ab0a8', '#56746e', '#6e908a'] };
    for (const k in ds) {
      const r = rnd(k.length * 97 + k.charCodeAt(0));
      for (let i = 0; i < (k === 'central' ? 26 : 20); i++) {
        const a = r() * Math.PI * 2, rr = 40 + r() * 150;
        const x = ds[k].x * 10 + Math.cos(a) * rr * 1.3, y = ds[k].y * 10 + Math.sin(a) * rr * 0.75;
        if (y > 575 || y < 30 || x < 10 || x > 960) continue;
        if (Object.values(m.places).some(p => Math.hypot(p.x * 10 - x, p.y * 10 - y) < 46)) continue;
        const h = (k === 'central' ? 40 + r() * 110 : k === 'neon' ? 25 + r() * 60 : 15 + r() * 45);
        blocks.push({ x, y, w: 16 + r() * 18, d: 12 + r() * 12, h, c: (night ? PAL : DAYPAL)[k], seed: r() * 1e9, k });
      }
    }
    blocks.sort((a, b) => a.y - b.y);
    for (const b of blocks) out.push(isoBlock(b.x, b.y, b.w, b.d, b.h, b.c, S.lit * (b.k === 'neon' ? 1.1 : 1), rnd(b.seed), night));
    // neon on the strip
    if (night) out.push(`<g class="mp-neon" font-family="ZCOOL QingKe HuangYou, sans-serif" font-size="22" text-anchor="middle">
      <text x="${ds.neon.x * 10 - 70}" y="${ds.neon.y * 10 - 70}" fill="#ff4fb0" filter="url(#mp-glow)">夜</text><text x="${ds.neon.x * 10 - 70}" y="${ds.neon.y * 10 - 70}" fill="#ffd1ec">夜</text>
      <text x="${ds.neon.x * 10 + 96}" y="${ds.neon.y * 10 + 50}" fill="#3ff0ff" filter="url(#mp-glow)">押</text><text x="${ds.neon.x * 10 + 96}" y="${ds.neon.y * 10 + 50}" fill="#d6fdff">押</text></g>`);
    // district names
    out.push(`<g font-family="ZCOOL QingKe HuangYou, Barlow Semi Condensed, sans-serif" font-size="30" text-anchor="middle" opacity=".22" fill="#fff">${Object.values(ds).map(d => `<text x="${d.x * 10}" y="${d.y * 10 + (d.y > 40 ? 70 : -60)}" letter-spacing="6">${esc(d.n)}</text>`).join('')}</g>`);
    // people near their places
    const byPlace = {};
    for (const p of o.people || []) if (p.at && m.places[p.at]) (byPlace[p.at] = byPlace[p.at] || []).push(p);
    // place pins
    for (const id in m.places) {
      const p = m.places[id], x = p.x * 10, y = p.y * 10, here = id === m.at, sel = id === o.sel;
      const col = ds[p.d].c;
      out.push(`<g class="mp-pin${here ? ' here' : ''}${sel ? ' sel' : ''}${p.open ? '' : ' shut'}" data-place="${id}" tabindex="0" role="button" aria-label="${esc(p.n)}">
        <ellipse cx="${x}" cy="${y + 4}" rx="30" ry="10" fill="#000" opacity=".35"/>
        ${p.open ? `<circle cx="${x}" cy="${y - 18}" r="30" fill="${col}" opacity="${night ? 0.35 : 0.2}" filter="url(#mp-glow)"/>` : ''}
        <path d="M${x} ${y} L${x - 9} ${y - 14} A22 22 0 1 1 ${x + 9} ${y - 14}Z" fill="#0c111f" stroke="${p.open ? col : '#556'}" stroke-width="3"/>
        <text x="${x}" y="${y - 22}" font-size="22" text-anchor="middle" dominant-baseline="middle">${p.icon}</text>
        <text class="mp-lab" x="${x}" y="${y + 22}" text-anchor="middle">${esc(p.n)}</text>
        ${here ? `<circle class="mp-you" cx="${x}" cy="${y - 25}" r="30" fill="none" stroke="#fff3b0" stroke-width="2.5"/>` : ''}
      </g>`);
      const ppl = byPlace[id] || [];
      ppl.slice(0, 6).forEach((q, i) => {
        const ax = x + 30 + (i % 3) * 17, ay = y - 34 + Math.floor(i / 3) * 17;
        out.push(q.known ? `<g class="mp-ppl" data-person="${q.id}"><circle cx="${ax}" cy="${ay}" r="8.5" fill="${q.ring}"/><image href="${q.img}" x="${ax - 7.5}" y="${ay - 7.5}" width="15" height="15" clip-path="circle(7.5px)"/></g>`
          : `<circle cx="${ax}" cy="${ay}" r="4" fill="#9aa8bf" opacity=".7"/>`);
      });
      if (ppl.length > 6) out.push(`<text x="${x + 64}" y="${y - 30}" font-size="13" fill="#cfd8e8">+${ppl.length - 6}</text>`);
    }
    out.push(`<rect width="${W}" height="${H}" fill="${S.tint}" pointer-events="none"/>`);
    out.push(`<rect width="${W}" height="${H}" fill="url(#mp-vig)" pointer-events="none"/>`);
    return `<svg viewBox="0 0 ${W} ${H}" class="mp-svg" preserveAspectRatio="xMidYMid slice">${out.join('')}</svg>`;
  }

  /* ---------------- scenes ---------------- */
  const lamp = (x, y, c) => `<line x1="${x}" y1="0" x2="${x}" y2="${y - 10}" stroke="#222" stroke-width="1.5"/><path d="M${x - 12} ${y} Q${x} ${y - 16} ${x + 12} ${y}Z" fill="${c}"/><ellipse cx="${x}" cy="${y + 2}" rx="40" ry="18" fill="${c}" opacity=".18"/>`;
  const neon = (t, x, y, c, s = 26) => `<text x="${x}" y="${y}" font-size="${s}" font-family="ZCOOL QingKe HuangYou, Limelight, sans-serif" fill="${c}" filter="url(#sc-glow)" text-anchor="middle">${t}</text><text x="${x}" y="${y}" font-size="${s}" font-family="ZCOOL QingKe HuangYou, Limelight, sans-serif" fill="#fff" opacity=".85" text-anchor="middle">${t}</text>`;
  const win = (x, y, w, h, S) => `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="url(#sc-sky)" stroke="#111" stroke-width="3"/>` + (S.k === 'night' ? `<g fill="#ffd77a" opacity=".8">${[...Array(8)].map((_, i) => `<rect x="${x + 6 + (i * 13) % (w - 10)}" y="${y + h - 10 - (i * 7) % (h - 14)}" width="3" height="4"/>`).join('')}</g>` : '') + `<line x1="${x + w / 2}" y1="${y}" x2="${x + w / 2}" y2="${y + h}" stroke="#111" stroke-width="2"/>`;
  const skyline = (y, c) => { const r = rnd(5); let d = `M0 ${y}`; for (let x = 0; x <= 400; x += 14) { const h = 10 + r() * 34; d += ` L${x} ${y - h} L${x + 12} ${y - h}`; } return `<path d="${d} L400 ${y} Z" fill="${c}"/>`; };
  const SC = {
    home: S => `<rect width="400" height="170" fill="#2a2230"/>${win(250, 26, 110, 70, S)}<rect y="128" width="400" height="42" fill="#1c1620"/><rect x="30" y="102" width="140" height="34" rx="5" fill="#4a3a5a"/><rect x="30" y="96" width="40" height="14" rx="6" fill="#e8e0f0"/>${lamp(210, 70, '#ffcf7a')}<rect x="200" y="112" width="34" height="22" fill="#3a2a22"/><rect x="214" y="96" width="4" height="16" fill="#222"/>`,
    teahouse: S => `<rect width="400" height="170" fill="#e9d9a8"/><g fill="#d8c48e">${[...Array(10)].map((_, i) => `<rect x="${i * 40}" y="0" width="38" height="110" opacity="${0.4 + (i % 2) * 0.3}"/>`).join('')}</g><rect x="20" y="16" width="120" height="56" fill="#2c3a2e" rx="3"/><g fill="#f4f0c8" font-size="11" font-family="sans-serif"><text x="30" y="34">奶茶 28</text><text x="30" y="50">菠萝油 18</text><text x="30" y="66">叉烧饭 58</text></g>${lamp(200, 46, '#ffe08a')}${lamp(320, 46, '#ffe08a')}<rect y="110" width="400" height="60" fill="#6a2a22"/><g fill="#f4ecd8"><rect x="60" y="118" width="70" height="10" rx="4"/><rect x="250" y="118" width="70" height="10" rx="4"/></g>`,
    market: S => `<rect width="400" height="170" fill="url(#sc-sky)"/>${skyline(90, S.k === 'day' ? '#7a8ea4' : '#1a2034')}<g>${[0, 1, 2, 3].map(i => `<path d="M${i * 100} 60 L${i * 100 + 96} 60 L${i * 100 + 90} 84 L${i * 100 + 6} 84Z" fill="${['#2e8a4e', '#c83a3a', '#2e6ac8', '#e8a640'][i]}"/><rect x="${i * 100 + 10}" y="84" width="76" height="40" fill="#3a2a1e"/>`).join('')}</g><g>${[...Array(12)].map((_, i) => `<circle cx="${18 + i * 32}" cy="${102 + (i % 2) * 6}" r="7" fill="${['#e84a3a', '#8ad05a', '#ffb43a', '#f0e04a'][i % 4]}"/>`).join('')}</g><rect y="124" width="400" height="46" fill="#3a3a40"/>${[50, 150, 250, 350].map(x => `<circle cx="${x}" cy="56" r="4" fill="#fff4b0"/><circle cx="${x}" cy="56" r="14" fill="#fff4b0" opacity=".2"/>`).join('')}`,
    pawn: S => `<rect width="400" height="170" fill="#2a1e14"/><rect x="40" y="10" width="70" height="90" fill="#7a1a1a"/><text x="75" y="76" font-size="64" text-anchor="middle" fill="#f6d36b" font-family="ZCOOL QingKe HuangYou, serif">押</text><rect y="96" width="400" height="74" fill="#4a3220"/><g stroke="#9a9a9a" stroke-width="3">${[...Array(11)].map((_, i) => `<line x1="${150 + i * 22}" y1="10" x2="${150 + i * 22}" y2="96"/>`).join('')}</g><rect x="150" y="90" width="230" height="8" fill="#6a4a2a"/>${lamp(270, 40, '#ffcf6a')}`,
    temple: S => `<rect width="400" height="170" fill="url(#sc-sky)"/><path d="M60 70 L200 22 L340 70Z" fill="#a8241c"/><path d="M50 72 L350 72 L340 80 L60 80Z" fill="#f2b632"/><rect x="90" y="80" width="220" height="70" fill="#7a1a14"/><rect x="170" y="96" width="60" height="54" fill="#2a0a08"/>${[110, 290].map(x => `<ellipse cx="${x}" cy="96" rx="12" ry="15" fill="#e8342a"/><ellipse cx="${x}" cy="96" rx="28" ry="28" fill="#ff6a3a" opacity=".2"/>`).join('')}<rect y="150" width="400" height="20" fill="#5a4a3a"/><g class="sc-smoke" fill="none" stroke="#fff" stroke-width="3" opacity=".25"><path d="M200 150 q-10 -20 0 -40 q10 -20 0 -40"/><path d="M186 150 q-8 -18 2 -36 q8 -18 -2 -36"/></g><rect x="184" y="140" width="32" height="12" fill="#c8a040"/>`,
    office: S => `<rect width="400" height="170" fill="#1e2a3a"/>${win(20, 14, 360, 80, S)}<g stroke="#0a0f18" stroke-width="2">${[1, 2, 3, 4, 5].map(i => `<line x1="${20 + i * 60}" y1="14" x2="${20 + i * 60}" y2="94"/>`).join('')}</g><rect y="100" width="400" height="70" fill="#2c3a4a"/>${[30, 150, 270].map(x => `<rect x="${x}" y="104" width="100" height="10" fill="#c8d4e0"/><rect x="${x + 30}" y="84" width="40" height="22" fill="#0a1420" stroke="#4a6a8a"/><rect x="${x + 34}" y="88" width="32" height="14" fill="#3ab0ff" opacity=".6"/>`).join('')}`,
    bank: S => `<rect width="400" height="170" fill="#e8e4dc"/>${[40, 120, 200, 280, 360].map(x => `<rect x="${x - 12}" y="10" width="24" height="120" fill="#f6f2ea"/><rect x="${x - 16}" y="8" width="32" height="8" fill="#d8d0c0"/>`).join('')}<rect y="130" width="400" height="40" fill="#b8b0a0"/><rect x="100" y="104" width="200" height="30" fill="#2a3a4a"/><text x="200" y="60" font-size="22" text-anchor="middle" fill="#8a7040" font-family="Limelight, serif">HENG KAM BANK</text>`,
    gym: S => `<rect width="400" height="170" fill="#22252b"/><rect x="200" y="10" width="190" height="100" fill="#3a4250" opacity=".7"/><line x1="90" y1="0" x2="90" y2="30" stroke="#888" stroke-width="2"/><rect x="74" y="30" width="32" height="70" rx="12" fill="#b82a2a"/><rect y="120" width="400" height="50" fill="#141518"/><rect x="230" y="112" width="120" height="6" fill="#999"/><circle cx="236" cy="115" r="14" fill="#333" stroke="#666"/><circle cx="344" cy="115" r="14" fill="#333" stroke="#666"/>${lamp(300, 30, '#f2f2ff')}`,
    mall: S => `<rect width="400" height="170" fill="#f2eef4"/>${[0, 1, 2].map(i => `<rect x="${12 + i * 130}" y="20" width="118" height="90" fill="${['#ffd6e8', '#d6ecff', '#fff1c6'][i]}" stroke="#c8b8d0" stroke-width="3"/><text x="${71 + i * 130}" y="44" font-size="14" text-anchor="middle" fill="#6a4a7a" font-family="Limelight, serif">${['LUXE', 'CINEMA', 'GIFTS'][i]}</text><rect x="${36 + i * 130}" y="60" width="70" height="40" fill="#fff" opacity=".6"/>`).join('')}<rect y="118" width="400" height="52" fill="#d8d0dc"/><g fill="#fff" opacity=".6">${[...Array(8)].map((_, i) => `<rect x="${i * 52}" y="130" width="40" height="3"/>`).join('')}</g>`,
    casino: S => `<rect width="400" height="170" fill="#1a0a0a"/><path d="M0 170 L0 60 Q200 -30 400 60 L400 170Z" fill="#3a1a0a"/><path d="M60 170 L60 70 Q200 0 340 70 L340 170Z" fill="#f2b632" opacity=".9"/><path d="M80 170 L80 76 Q200 14 320 76 L320 170Z" fill="#120606"/>${neon('金玉满堂', 200, 64, '#f6c94e', 30)}<g>${[...Array(18)].map((_, i) => `<circle class="sc-bulb" cx="${70 + i * 15.3}" cy="${78 - Math.sin(i / 17 * Math.PI) * 50}" r="3" fill="#fff3b0" style="animation-delay:${i * 0.08}s"/>`).join('')}</g><path d="M150 170 L170 110 L230 110 L250 170Z" fill="#a8121c"/>`,
    bar: S => `<rect width="400" height="170" fill="#0c1430"/><rect x="20" y="20" width="220" height="70" fill="#141c3a"/><g>${[...Array(14)].map((_, i) => `<rect x="${30 + i * 15}" y="${40 + (i % 3) * 3}" width="8" height="${24 - (i % 3) * 3}" rx="2" fill="${['#3ab070', '#c8a040', '#7a3a2a', '#d0e8f0'][i % 4]}" opacity=".85"/>`).join('')}</g>${neon('Midnight Blue', 320, 50, '#3a8aff', 20)}<rect y="100" width="400" height="16" fill="#3a2418"/><rect y="116" width="400" height="54" fill="#1a1010"/>${lamp(110, 66, '#7ab0ff')}`,
    netcafe: S => `<rect width="400" height="170" fill="#0a0c12"/>${neon('极速', 70, 40, '#3ff0a0', 22)}${[0, 1, 2, 3, 4].map(i => `<rect x="${20 + i * 76}" y="66" width="60" height="40" fill="#111" stroke="#2a2a3a"/><rect x="${24 + i * 76}" y="70" width="52" height="32" fill="${['#2a6aff', '#3ff0a0', '#ff4f8a', '#ffb43a', '#8a5aff'][i]}" opacity=".7"/><ellipse cx="${50 + i * 76}" cy="86" rx="50" ry="28" fill="${['#2a6aff', '#3ff0a0', '#ff4f8a', '#ffb43a', '#8a5aff'][i]}" opacity=".12"/>`).join('')}<rect y="108" width="400" height="62" fill="#14161e"/>`,
    loanshark: S => `<rect width="400" height="170" fill="#1e1a14"/><rect x="40" y="20" width="90" height="60" fill="#2a2418" stroke="#4a3a20" stroke-width="3"/><text x="85" y="58" font-size="26" text-anchor="middle" fill="#c8a040" font-family="ZCOOL QingKe HuangYou, serif">发达</text><rect x="280" y="40" width="70" height="80" fill="#4a4a4a" stroke="#6a6a6a" stroke-width="2"/><circle cx="315" cy="80" r="10" fill="none" stroke="#9a9a9a" stroke-width="3"/><rect y="120" width="400" height="50" fill="#120e0a"/><rect x="140" y="96" width="120" height="26" fill="#3a2a1a"/>${lamp(200, 50, '#e8e0a0')}<g class="sc-fan" style="transform-origin:200px 18px"><ellipse cx="200" cy="18" rx="40" ry="4" fill="#555"/></g>`,
    park: S => `<rect width="400" height="170" fill="url(#sc-sky)"/>${S.k === 'night' ? `<circle cx="330" cy="34" r="14" fill="#fff6d0"/><circle cx="330" cy="34" r="30" fill="#fff6d0" opacity=".15"/>` : S.k === 'day' ? `<circle cx="330" cy="34" r="16" fill="#fff8c0"/>` : `<circle cx="330" cy="70" r="20" fill="#ffb070"/>`}${skyline(92, S.k === 'day' ? '#6a7e98' : '#141a30')}${S.k !== 'day' ? `<g fill="#ffd77a" opacity=".7">${[...Array(30)].map((_, i) => `<rect x="${i * 13 + 4}" y="${70 + (i * 7) % 18}" width="2" height="3"/>`).join('')}</g>` : ''}<rect y="92" width="400" height="44" fill="${S.k === 'day' ? '#2d7fb8' : '#0b2a4a'}"/><g class="sc-wave" stroke="#9fd0ff" opacity=".3" fill="none"><path d="M0 110 q20 -4 40 0 t40 0 t40 0 t40 0 t40 0 t40 0 t40 0 t40 0 t40 0 t40 0"/></g><rect y="136" width="400" height="34" fill="#3a3a44"/><g stroke="#888" stroke-width="2">${[...Array(21)].map((_, i) => `<line x1="${i * 20}" y1="126" x2="${i * 20}" y2="138"/>`).join('')}<line x1="0" y1="126" x2="400" y2="126"/></g>`,
    hospital: S => `<rect width="400" height="170" fill="#e6f2f2"/><rect x="170" y="14" width="60" height="60" fill="#fff"/><path d="M192 24 h16 v16 h16 v16 h-16 v16 h-16 v-16 h-16 v-16 h16Z" fill="#e8342a"/><rect y="110" width="400" height="60" fill="#b8d0d0"/><rect x="30" y="80" width="100" height="34" fill="#fff" stroke="#9ab"/><rect x="270" y="80" width="100" height="34" fill="#fff" stroke="#9ab"/>${lamp(200, 92, '#f2ffff')}`,
    library: S => `<rect width="400" height="170" fill="#3a2a1e"/>${[0, 1, 2, 3].map(i => `<rect x="${10 + i * 98}" y="10" width="90" height="100" fill="#2a1c12"/>${[0, 1, 2, 3].map(j => `<g>${[...Array(9)].map((_, k) => `<rect x="${14 + i * 98 + k * 9.5}" y="${14 + j * 24}" width="8" height="${18 - (k % 3) * 2}" fill="${['#8a3a2a', '#2a5a7a', '#c8a040', '#3a6a3a'][(i + j + k) % 4]}"/>`).join('')}</g>`).join('')}`).join('')}<rect y="112" width="400" height="58" fill="#5a3e28"/>${lamp(200, 70, '#ffe0a0')}`
  };
  function scene(place, hour) {
    const S = sky(hour);
    const body = (SC[place] || SC.home)(S);
    return `<svg viewBox="0 0 400 170" preserveAspectRatio="xMidYMid slice" class="sc-svg"><defs>
      <linearGradient id="sc-sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${S.top}"/><stop offset="1" stop-color="${S.bot}"/></linearGradient>
      <filter id="sc-glow" x="-30%" y="-30%" width="160%" height="160%"><feGaussianBlur stdDeviation="3"/></filter></defs>${body}
      <rect width="400" height="170" fill="${S.tint}"/></svg>`;
  }

  /* attribute radar: values 1-10 */
  function radar(vals, labels, o = {}) {
    const n = vals.length, cx = 100, cy = 100, R = 72;
    const pt = (i, r) => [cx + Math.sin((i / n) * Math.PI * 2) * r, cy - Math.cos((i / n) * Math.PI * 2) * r];
    const ring = k => vals.map((_, i) => pt(i, (R * k) / 10).map(v => v.toFixed(1)).join(',')).join(' ');
    let s = '';
    for (const k of [2, 4, 6, 8, 10]) s += `<polygon points="${ring(k)}" fill="none" stroke="rgba(255,255,255,${k === 10 ? 0.25 : 0.08})"/>`;
    for (let i = 0; i < n; i++) { const [x, y] = pt(i, R); s += `<line x1="${cx}" y1="${cy}" x2="${x}" y2="${y}" stroke="rgba(255,255,255,.08)"/>`; }
    const poly = vals.map((v, i) => pt(i, (R * Math.min(10, v)) / 10).map(q => q.toFixed(1)).join(',')).join(' ');
    s += `<polygon points="${poly}" fill="${o.fill || 'rgba(246,201,78,.28)'}" stroke="${o.stroke || '#f6c94e'}" stroke-width="2" class="rd-poly"/>`;
    vals.forEach((v, i) => { const [x, y] = pt(i, (R * Math.min(10, v)) / 10); s += `<circle cx="${x}" cy="${y}" r="3.5" fill="#fff3b0"/>`; });
    labels.forEach((l, i) => { const [x, y] = pt(i, R + 18); s += `<text x="${x}" y="${y}" text-anchor="middle" dominant-baseline="middle" class="rd-lab">${esc(l)} <tspan class="rd-v">${vals[i]}</tspan></text>`; });
    return `<svg viewBox="-10 -6 220 212" class="rd-svg">${s}</svg>`;
  }

  window.Art = { map, scene, radar, sky };
})();
