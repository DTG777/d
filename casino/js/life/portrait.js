/* Procedural portraits: every person in the city gets a face, drawn as SVG from a small
   look spec ({ skin, hair, hs, top, fem, age, glasses, tie, chain, earring, beads, scar, beard, acc, phones })
   and an emotion (neutral, warm, happy, shy, nervous, sad, cold, angry, scared, tender, sympathetic, reluctant, awkward). */
(function () {
  let uid = 0;
  const shade = (hex, k) => {
    const n = parseInt(hex.slice(1), 16);
    const f = c => Math.max(0, Math.min(255, Math.round(c * k)));
    return '#' + ((1 << 24) + (f(n >> 16) << 16) + (f((n >> 8) & 255) << 8) + f(n & 255)).toString(16).slice(1);
  };
  const MOOD = {
    happy: 'happy', warm: 'happy', tender: 'happy', sympathetic: 'soft', shy: 'shy', nervous: 'worried', scared: 'scared',
    sad: 'sad', cold: 'flat', angry: 'angry', reluctant: 'flat', awkward: 'worried', neutral: 'neutral'
  };

  function hairBack(l, c) {
    switch (l.hs) {
      case 'long': return `<path d="M27 44 Q24 78 30 92 L70 92 Q76 78 73 44 Q70 18 50 17 Q30 18 27 44Z" fill="${c}"/>`;
      case 'pony': return `<path d="M68 34 Q84 40 80 66 Q78 74 72 78 Q76 60 66 46Z" fill="${c}"/>`;
      case 'bun': return `<circle cx="50" cy="15" r="9" fill="${c}"/>`;
      case 'bob': return `<path d="M28 42 Q26 66 34 70 L66 70 Q74 66 72 42 Q70 18 50 18 Q30 18 28 42Z" fill="${c}"/>`;
      case 'curly': return `<g fill="${c}">${[[30, 34], [36, 24], [46, 19], [56, 19], [65, 24], [71, 34], [73, 45], [27, 45]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="9"/>`).join('')}</g>`;
      case 'hood': return `<path d="M22 60 Q20 18 50 14 Q80 18 78 60 L74 92 L26 92Z" fill="${c}"/>`;
      default: return '';
    }
  }
  function hairFront(l, c) {
    const hi = shade(c, 1.5);
    switch (l.hs) {
      case 'spiky': return `<path d="M30 40 L31 24 L37 30 L40 17 L46 27 L51 14 L55 26 L61 17 L63 29 L69 23 L70 40 Q60 30 50 31 Q38 30 30 40Z" fill="${c}"/>`;
      case 'side': return `<path d="M30 42 Q29 22 50 20 Q71 21 70 40 Q66 30 56 29 Q44 28 38 33 Q33 36 30 42Z" fill="${c}"/><path d="M40 25 Q52 22 62 26" stroke="${hi}" stroke-width="1.2" fill="none" opacity=".5"/>`;
      case 'slick': return `<path d="M30 40 Q28 20 50 19 Q72 20 70 40 Q68 28 50 27 Q34 27 30 40Z" fill="${c}"/><path d="M36 26 Q50 20 66 27" stroke="${hi}" stroke-width="1.5" fill="none" opacity=".6"/>`;
      case 'buzz': return `<path d="M31 38 Q30 22 50 21 Q70 22 69 38 Q62 30 50 30 Q38 30 31 38Z" fill="${c}" opacity=".85"/>`;
      case 'swoop': return `<path d="M29 42 Q26 18 52 18 Q74 19 71 36 Q60 24 44 30 Q36 34 29 42Z" fill="${c}"/><path d="M44 22 Q60 18 70 30" stroke="${hi}" stroke-width="2" fill="none" opacity=".5"/>`;
      case 'long': case 'bob': return `<path d="M29 44 Q28 20 50 19 Q72 20 71 44 Q66 28 52 28 Q44 34 36 32 Q31 36 29 44Z" fill="${c}"/>`;
      case 'pony': case 'bun': return `<path d="M30 40 Q29 20 50 19 Q71 20 70 40 Q64 27 50 27 Q36 27 30 40Z" fill="${c}"/><path d="M38 24 Q50 20 62 24" stroke="${hi}" stroke-width="1" fill="none" opacity=".5"/>`;
      case 'curly': return `<g fill="${c}">${[[36, 28], [44, 25], [52, 24], [60, 26], [66, 31]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="6"/>`).join('')}</g>`;
      case 'hood': return `<path d="M30 40 Q30 24 50 23 Q70 24 70 40 Q62 30 50 30 Q38 30 30 40Z" fill="#111"/>`;
      case 'bald': return `<path d="M34 30 Q50 22 66 30" stroke="${shade(l.skin, 1.12)}" stroke-width="3" fill="none" opacity=".7"/><path d="M28 44 Q28 36 31 34 M72 44 Q72 36 69 34" stroke="${c}" stroke-width="3" fill="none"/>`;
      default: return '';
    }
  }
  function eyes(l, m) {
    const ink = '#1b1410', y = 47;
    const lash = l.fem ? `<path d="M36 ${y - 2} l-2 -2 M64 ${y - 2} l2 -2" stroke="${ink}" stroke-width="1"/>` : '';
    let e;
    if (m === 'happy') e = `<path d="M37 ${y + 1} Q41 ${y - 3} 45 ${y + 1} M55 ${y + 1} Q59 ${y - 3} 63 ${y + 1}" stroke="${ink}" stroke-width="2" fill="none" stroke-linecap="round"/>`;
    else if (m === 'scared') e = `<circle cx="41" cy="${y}" r="3.4" fill="#fff"/><circle cx="59" cy="${y}" r="3.4" fill="#fff"/><circle cx="41" cy="${y}" r="1.6" fill="${ink}"/><circle cx="59" cy="${y}" r="1.6" fill="${ink}"/>`;
    else if (m === 'flat') e = `<path d="M37 ${y} h8 M55 ${y} h8" stroke="${ink}" stroke-width="2.2" stroke-linecap="round"/>`;
    else e = `<ellipse cx="41" cy="${y}" rx="2.6" ry="${m === 'shy' ? 2 : 3}" fill="${ink}"/><ellipse cx="59" cy="${y}" rx="2.6" ry="${m === 'shy' ? 2 : 3}" fill="${ink}"/><circle cx="42" cy="${y - 1}" r=".9" fill="#fff"/><circle cx="60" cy="${y - 1}" r=".9" fill="#fff"/>`;
    const b = { angry: [`M35 ${y - 9} L46 ${y - 5}`, `M65 ${y - 9} L54 ${y - 5}`], sad: [`M36 ${y - 6} L45 ${y - 9}`, `M64 ${y - 6} L55 ${y - 9}`], worried: [`M36 ${y - 6} L45 ${y - 9}`, `M64 ${y - 6} L55 ${y - 9}`], scared: [`M36 ${y - 9} Q41 ${y - 12} 46 ${y - 9}`, `M54 ${y - 9} Q59 ${y - 12} 64 ${y - 9}`] }[m] ||
      [`M36 ${y - 8} Q41 ${y - 10} 46 ${y - 8}`, `M54 ${y - 8} Q59 ${y - 10} 64 ${y - 8}`];
    const brow = `<path d="${b[0]} ${b[1]}" stroke="${shade(l.hair || '#222', 0.8)}" stroke-width="${l.fem ? 1.6 : 2.4}" stroke-linecap="round" fill="none"/>`;
    return e + lash + brow;
  }
  function mouth(l, m) {
    const lip = l.fem ? '#b8455a' : shade(l.skin, 0.62);
    switch (m) {
      case 'happy': return `<path d="M42 60 Q50 68 58 60 Q50 63 42 60Z" fill="#7a2230" stroke="${lip}" stroke-width="1.2"/>`;
      case 'soft': case 'shy': return `<path d="M44 61 Q50 64 56 61" stroke="${lip}" stroke-width="2" fill="none" stroke-linecap="round"/>`;
      case 'sad': return `<path d="M44 63 Q50 59 56 63" stroke="${lip}" stroke-width="2" fill="none" stroke-linecap="round"/>`;
      case 'angry': return `<path d="M43 63 Q50 59 57 63" stroke="${lip}" stroke-width="2.4" fill="none" stroke-linecap="round"/>`;
      case 'scared': return `<ellipse cx="50" cy="62" rx="3.5" ry="4" fill="#5a1a22"/>`;
      case 'worried': return `<path d="M44 62 q3 -2 6 0 t6 0" stroke="${lip}" stroke-width="1.8" fill="none" stroke-linecap="round"/>`;
      case 'flat': return `<path d="M44 62 h12" stroke="${lip}" stroke-width="2" stroke-linecap="round"/>`;
      default: return `<path d="M44 61 Q50 63.5 56 61" stroke="${lip}" stroke-width="1.8" fill="none" stroke-linecap="round"/>`;
    }
  }

  /* svg(look, { emotion, bg, ring, title }) -> markup */
  function svg(look, o = {}) {
    const l = Object.assign({ skin: '#e6b48f', hair: '#1a1410', hs: 'side', top: '#2f6f5e', fem: 0, age: 0 }, look || {});
    const m = MOOD[o.emotion] || 'neutral';
    const id = 'pt' + (++uid);
    const skinD = shade(l.skin, 0.82), topD = shade(l.top, 0.7), topL = shade(l.top, 1.25);
    const bg = o.bg || '#1b2a3a';
    const parts = [];
    parts.push(`<defs><radialGradient id="${id}b" cx="50%" cy="38%" r="70%"><stop offset="0" stop-color="${shade(bg, 1.6)}"/><stop offset="1" stop-color="${shade(bg, 0.6)}"/></radialGradient>` +
      `<linearGradient id="${id}t" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${topL}"/><stop offset="1" stop-color="${topD}"/></linearGradient>` +
      `<radialGradient id="${id}s" cx="45%" cy="40%" r="65%"><stop offset="0" stop-color="${shade(l.skin, 1.08)}"/><stop offset="1" stop-color="${skinD}"/></radialGradient></defs>`);
    if (!o.nobg) parts.push(`<rect width="100" height="100" fill="url(#${id}b)"/>`);
    parts.push(hairBack(l, l.hair));
    // shoulders and clothes
    parts.push(`<path d="M14 100 Q16 78 36 73 L64 73 Q84 78 86 100Z" fill="url(#${id}t)"/>`);
    parts.push(`<rect x="44" y="62" width="12" height="14" rx="4" fill="${skinD}"/>`);
    if (l.tie) parts.push(`<path d="M42 74 L50 82 L58 74 L54 73 L50 77 L46 73Z" fill="#f2f2f2"/><path d="M48.5 78 L51.5 78 L53 92 L50 96 L47 92Z" fill="${l.tie}"/>`);
    else parts.push(`<path d="M41 74 Q50 84 59 74" stroke="${topD}" stroke-width="2" fill="${shade(l.skin, 0.9)}"/>`);
    if (l.chain) parts.push(`<path d="M41 75 Q50 89 59 75" stroke="#f3c64a" stroke-width="2.2" fill="none" stroke-dasharray="2 1.2"/>`);
    if (l.beads) parts.push(`<path d="M42 75 Q50 86 58 75" stroke="#7a3a1a" stroke-width="2.6" fill="none" stroke-dasharray=".1 3.2" stroke-linecap="round"/>`);
    // head
    parts.push(`<ellipse cx="29.5" cy="50" rx="3.5" ry="5" fill="${skinD}"/><ellipse cx="70.5" cy="50" rx="3.5" ry="5" fill="${skinD}"/>`);
    parts.push(`<path d="M30 44 Q30 22 50 22 Q70 22 70 44 Q70 62 58 68 Q50 72 42 68 Q30 62 30 44Z" fill="url(#${id}s)"/>`);
    if (l.earring) parts.push(`<circle cx="29" cy="57" r="1.8" fill="#f6d36b"/><circle cx="71" cy="57" r="1.8" fill="#f6d36b"/>`);
    if (l.age >= 1) parts.push(`<path d="M35 54 q2 2 4 2 M65 54 q-2 2 -4 2" stroke="${skinD}" stroke-width="1" fill="none"/>`);
    if (l.age >= 2) parts.push(`<path d="M40 36 h20 M42 39 h16" stroke="${skinD}" stroke-width=".8" opacity=".8"/><path d="M42 64 q-3 0 -4 -3 M58 64 q3 0 4 -3" stroke="${skinD}" stroke-width="1" fill="none"/>`);
    parts.push(eyes(l, m));
    parts.push(`<path d="M50 50 Q48 56 50 57.5 Q52 58 53 57" stroke="${skinD}" stroke-width="1.4" fill="none" stroke-linecap="round"/>`);
    if (m === 'shy' || (l.fem && m === 'happy')) parts.push(`<ellipse cx="37" cy="56" rx="4" ry="2.2" fill="#ff7a8a" opacity=".45"/><ellipse cx="63" cy="56" rx="4" ry="2.2" fill="#ff7a8a" opacity=".45"/>`);
    if (l.beard) parts.push(`<path d="M38 60 Q40 70 50 71 Q60 70 62 60 Q58 66 50 66 Q42 66 38 60Z" fill="${shade(l.hair, l.age >= 2 ? 1 : 0.9)}" opacity=".85"/>`);
    parts.push(mouth(l, m));
    if (l.scar) parts.push(`<path d="M37 40 L34 58" stroke="#8a3a3a" stroke-width="1.6" stroke-linecap="round"/><path d="M34 44 l3 1 M35 50 l3 1" stroke="#8a3a3a" stroke-width="1"/>`);
    if (m === 'scared' || m === 'worried') parts.push(`<path d="M68 36 q2 4 0 6 q-2 -2 0 -6Z" fill="#9fd8ff" opacity=".8"/>`);
    parts.push(hairFront(l, l.hair));
    if (l.glasses) parts.push(`<g fill="rgba(200,230,255,.15)" stroke="#1a1a1a" stroke-width="1.6"><rect x="34" y="42" width="13" height="10" rx="3"/><rect x="53" y="42" width="13" height="10" rx="3"/><path d="M47 46 h6" fill="none"/></g>`);
    if (l.acc === 'cap') parts.push(`<path d="M28 36 Q30 16 50 16 Q70 16 72 36Z" fill="${shade(l.top, 0.9)}"/><path d="M28 36 Q50 30 82 38 Q70 40 50 38 Q36 38 28 36Z" fill="${shade(l.top, 0.6)}"/>`);
    if (l.phones) parts.push(`<path d="M28 46 Q28 18 50 18 Q72 18 72 46" stroke="#222" stroke-width="3" fill="none"/><rect x="24" y="42" width="7" height="12" rx="3" fill="#333"/><rect x="69" y="42" width="7" height="12" rx="3" fill="#333"/>`);
    if (o.ring) parts.push(`<circle cx="50" cy="50" r="48" fill="none" stroke="${o.ring}" stroke-width="3"/>`);
    return `<svg viewBox="0 0 100 100" class="pt" role="img" aria-label="${o.title || ''}">${parts.join('')}</svg>`;
  }

  // relationship colour: red (hostile) to grey to gold (close); pink when there is love
  function relColor(r) {
    if (!r) return '#5a6b7c';
    if (r.tags && r.tags.includes('partner')) return '#ff5c9a';
    if (r.love >= 40) return '#ff8ab8';
    if (r.aff <= -30) return '#e0443c';
    if (r.aff < 0) return '#c07a5a';
    if (r.tags && r.tags.includes('close')) return '#f6c94e';
    if (r.tags && r.tags.includes('friend')) return '#35d49a';
    return r.fam >= 15 ? '#6fb7ff' : '#5a6b7c';
  }

  window.Portrait = { svg, relColor, shade };
})();
