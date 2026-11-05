const IconesV3 = (() => {
  const P = {
    terre: ['#f2ffcf', '#9fe06a', '#4a9a3e', '#173a20'],
    feu: ['#fff3c0', '#ffb347', '#ef5a2a', '#4a1208'],
    eau: ['#e6fcff', '#6fe0f2', '#1f8fc0', '#0a2a4c'],
    air: ['#ffffff', '#e6eef8', '#9fb2c8', '#27344c'],
    neutre: ['#fff3d2', '#f3bc72', '#b5773c', '#3e2614'],
  };
  const INK = '#1b1424';
  const FORMES = {
    degats: 'M20 16 L180 16 L180 100 Q180 148 100 192 Q20 148 20 100 Z',
    soin: 'M100 8 A92 92 0 1 1 99.9 8 Z',
    placement: 'M36 14 L164 14 L188 38 L188 162 L164 186 L36 186 L12 162 L12 38 Z',
    invocation: 'M100 8 L184 54 L184 146 L100 192 L16 146 L16 54 Z',
  };
  let n = 0;
  const k = (s) => `transform="translate(100 100) scale(${s}) translate(-100 -100)"`;
  const pts = a => a.map(p => p.join(' ')).join(' L');
  const poly = (a, fill, o = '') => `<path d="M${pts(a)} Z" fill="${fill}" ${o}/>`;
  const encre = (a, w = 3) => `<path d="M${pts(a)} Z" fill="none" stroke="${INK}" stroke-width="${w}" stroke-linejoin="round"/>`;
  const place = (svg, x, y, r = 0, s = 1) => `<g transform="translate(${x} ${y}) rotate(${r}) scale(${s})">${svg}</g>`;

  const croix = (x, y, s = 1) => `<g transform="translate(${x} ${y}) scale(${s})"><path d="M-4 -4 L4 4 M4 -4 L-4 4" stroke="${INK}" stroke-width="4.2" stroke-linecap="round"/><path d="M-4 -4 L4 4 M4 -4 L-4 4" stroke="#f3bc72" stroke-width="2.2" stroke-linecap="round"/><path d="M-4 -4 L0 0" stroke="#fff3d2" stroke-width="1" stroke-linecap="round"/></g>`;
  const eclat = (x, y, s, c, coeur = '#fff') => `<path transform="translate(${x} ${y}) scale(${s})" d="M0 -10 L2.6 -2.6 L10 0 L2.6 2.6 L0 10 L-2.6 2.6 L-10 0 L-2.6 -2.6 Z" fill="${c}"/><path transform="translate(${x} ${y}) scale(${s * .45})" d="M0 -10 L2.6 -2.6 L10 0 L2.6 2.6 L0 10 L-2.6 2.6 L-10 0 L-2.6 -2.6 Z" fill="${coeur}"/>`;
  const roc = (x, y, s, r, cl = '#e9d8bd', om = '#8f7a66') => place(poly([[-8, -5], [2, -9], [9, -1], [4, 8], [-7, 6]], om) + poly([[-8, -5], [2, -9], [1, 0], [-7, 6]], cl) + encre([[-8, -5], [2, -9], [9, -1], [4, 8], [-7, 6]], 2), x, y, r, s);
  function croissant(cx, cy, r, a0, a1, c1, c2, l = 1.32) {
    const P0 = a => [cx + Math.cos(a) * r, cy + Math.sin(a) * r];
    const [x0, y0] = P0(a0), [x1, y1] = P0(a1);
    const d = (rr, s) => `M${x0} ${y0} A${r} ${r} 0 0 1 ${x1} ${y1} A${rr} ${rr} 0 0 ${s} ${x0} ${y0} Z`;
    return `<path d="${d(r * l, 0)}" fill="${c1}"/><path d="${d(r * (1 + (l - 1) * .45), 0)}" fill="${c2}"/>`;
  }
  const flamme = (x, y, s, p) => place(
    poly([[0, -30], [10, -12], [16, 4], [10, 18], [0, 24], [-10, 18], [-16, 4], [-8, -10], [-4, -2]], p[2])
    + poly([[0, -30], [10, -12], [16, 4], [10, 18], [0, 24]], p[3], 'opacity=".35"')
    + poly([[0, -12], [7, 2], [5, 14], [0, 18], [-5, 14], [-7, 4]], p[1])
    + poly([[0, 0], [3, 8], [0, 14], [-3, 8]], p[0])
    + encre([[0, -30], [10, -12], [16, 4], [10, 18], [0, 24], [-10, 18], [-16, 4], [-8, -10], [-4, -2]], 2.4), x, y, 0, s);

  let EPEE = 'detail';
  function epeeA(p, o = {}) {
    const t = -112, w = 9;
    const clair = o.chaud ? '#ffd27a' : '#fbf4e4', froid = o.chaud ? '#d9452b' : '#6f80aa';
    return [
      poly([[-w, 0], [-w, t + 26], [0, t], [0, 0]], clair), poly([[0, 0], [0, t], [w, t + 26], [w, 0]], froid),
      `<path d="M${-w + 2.5} -4 L${-w + 2.5} ${t + 27} L-1 ${t + 6}" fill="none" stroke="#fff" stroke-width="2" stroke-linejoin="round"/>`,
      encre([[-w, 0], [-w, t + 26], [0, t], [w, t + 26], [w, 0]], 3.4),
      poly([[-30, -6], [30, -6], [34, 0], [30, 6], [-30, 6], [-34, 0]], '#a8683a'), poly([[-30, -6], [30, -6], [34, 0], [-34, 0]], '#ffd98f'),
      encre([[-30, -6], [30, -6], [34, 0], [30, 6], [-30, 6], [-34, 0]], 3),
      poly([[-5, 6], [5, 6], [5, 38], [-5, 38]], '#2b2238'), encre([[-5, 6], [5, 6], [5, 38], [-5, 38]], 2.6),
      poly([[0, 38], [9, 47], [0, 56], [-9, 47]], p[2]), poly([[0, 38], [9, 47], [0, 47], [-9, 47]], p[0]), encre([[0, 38], [9, 47], [0, 56], [-9, 47]], 2.6),
    ].join('');
  }
  function epeeB(p, o = {}) {
    const t = -108;
    const clair = o.chaud ? '#ffd27a' : '#fbf4e4', froid = o.chaud ? '#d9452b' : '#6f80aa';
    return [
      poly([[-11, -2], [-8, t + 30], [0, t], [0, -2]], clair), poly([[0, -2], [0, t], [8, t + 30], [11, -2]], froid),
      poly([[-2, -6], [0, t + 14], [2, -6]], p[1]), `<path d="M0 -6 L0 ${t + 20}" stroke="${p[0]}" stroke-width="1.2"/>`,
      encre([[-11, -2], [-8, t + 30], [0, t], [8, t + 30], [11, -2]], 3.4),
      poly([[-36, -14], [-24, -14], [0, 10], [24, -14], [36, -14], [0, 22]], '#a8683a'),
      poly([[-36, -14], [-24, -14], [0, 10], [0, 22]], '#ffd98f'),
      encre([[-36, -14], [-24, -14], [0, 10], [24, -14], [36, -14], [0, 22]], 3),
      poly([[-4.5, 22], [4.5, 22], [4.5, 44], [-4.5, 44]], '#2b2238'), encre([[-4.5, 22], [4.5, 22], [4.5, 44], [-4.5, 44]], 2.6),
      poly([[0, 44], [8, 52], [0, 60], [-8, 52]], p[2]), poly([[0, 44], [8, 52], [0, 52]], p[0]), poly([[0, 60], [-8, 52], [0, 52]], p[3]), encre([[0, 44], [8, 52], [0, 60], [-8, 52]], 2.4),
    ].join('');
  }
  function epeeC(p, o = {}) {
    const S = [[0, -114], [9, -88], [9, -8], [26, -8], [30, 0], [9, 4], [6, 34], [11, 44], [0, 56], [-11, 44], [-6, 34], [-9, 4], [-30, 0], [-26, -8], [-9, -8], [-9, -88]];
    const clair = o.chaud ? '#ffd27a' : '#f4e8d0', froid = o.chaud ? '#d9452b' : '#8a93ad';
    return poly(S, clair) + poly([[0, -114], [9, -88], [9, -8], [26, -8], [30, 0], [9, 4], [6, 34], [11, 44], [0, 56], [0, -114]], froid)
      + poly([[-1.6, -14], [0, -92], [1.6, -14]], p[1])
      + encre(S, 3.6);
  }
  function lame(p, o = {}) {
    if (EPEE === 'A') return epeeA(p, o);
    if (EPEE === 'B') return epeeB(p, o);
    if (EPEE === 'C') return epeeC(p, o);
    return lameDetail(p, o);
  }
  function lameDetail(p, o = {}) {
    const t = -104, b = 0, w = 13;
    const clair = o.chaud ? '#ffd27a' : '#fbf4e4', vif = o.chaud ? '#fff3c0' : '#ffffff';
    const froid = o.chaud ? '#d9452b' : '#7c8db4', ombre = o.chaud ? '#7a1e0e' : '#3e4a6e';
    const runes = [-22, -40, -58, -76].map(y => `<path d="M-2 ${y + 4} L0 ${y - 3} L2 ${y + 4}" stroke="${o.runes || p[1]}" stroke-width="2" fill="none" stroke-linejoin="round"/>`).join('');
    const fente = t * .5;
    return [
      poly([[-w, b], [-w, t + 32], [0, t], [0, b]], clair),
      poly([[0, b], [0, t], [w, t + 32], [w, b]], froid),
      poly([[-w, b], [-w, t + 32], [-w + 5, t + 32], [-w + 5, b]], vif),
      poly([[w, b], [w, t + 32], [w - 5, t + 32], [w - 5, b]], ombre),
      poly([[-w, t + 32], [0, t], [-w + 5, t + 32]], vif),
      poly([[w, t + 32], [0, t], [w - 5, t + 32]], ombre),
      poly([[-2.8, -6], [-2.8, t + 38], [0, t + 30], [2.8, t + 38], [2.8, -6]], '#241c34'),
      runes,
      `<path d="M${-w} ${fente + 6} L-4 ${fente - 2} L3 ${fente + 5} L${w} ${fente - 4}" fill="none" stroke="${INK}" stroke-width="2.4" stroke-linejoin="round"/>`,
      croix(-7, fente + 2, .78), croix(6, fente + 1, .78),
      encre([[-w, b], [-w, t + 32], [0, t], [w, t + 32], [w, b]], 3.4),
      poly([[-40, -2], [-32, -11], [32, -11], [40, -2], [32, 8], [-32, 8]], '#a8683a'),
      poly([[-40, -2], [-32, -11], [32, -11], [40, -2]], '#ffd98f'),
      poly([[-32, -11], [-24, -11], [-30, -2], [-40, -2]], '#fff3d2'),
      encre([[-40, -2], [-32, -11], [32, -11], [40, -2], [32, 8], [-32, 8]], 3),
      poly([[0, -9], [7, -2], [0, 6], [-7, -2]], p[2]), poly([[0, -9], [7, -2], [0, -2]], p[0]), poly([[0, 6], [-7, -2], [0, -2]], p[3]),
      encre([[0, -9], [7, -2], [0, 6], [-7, -2]], 1.8),
      poly([[-6, 8], [6, 8], [6, 46], [-6, 46]], '#2b2238'), encre([[-6, 8], [6, 8], [6, 46], [-6, 46]], 2.6),
      croix(0, 18, .7), croix(0, 29, .7), croix(0, 40, .7),
      poly([[0, 48], [11, 58], [0, 68], [-11, 58]], '#a8683a'), poly([[0, 48], [11, 58], [0, 58], [-11, 58]], '#ffd98f'),
      encre([[0, 48], [11, 58], [0, 68], [-11, 58]], 2.8),
    ].join('');
  }

  function fond(p, cx = 100, cy = 92) {
    const rayons = Array.from({ length: 16 }, (_, j) => {
      const a = j / 16 * Math.PI * 2, b = (j + .5) / 16 * Math.PI * 2;
      return j % 2 ? '' : `<path d="M${cx} ${cy} L${cx + Math.cos(a) * 170} ${cy + Math.sin(a) * 170} L${cx + Math.cos(b) * 170} ${cy + Math.sin(b) * 170} Z" fill="${p[2]}" opacity=".32"/>`;
    }).join('');
    const oct = (r, c, op) => `<path d="M${Array.from({ length: 8 }, (_, j) => { const a = (j + .5) / 8 * Math.PI * 2; return `${cx + Math.cos(a) * r} ${cy + Math.sin(a) * r}`; }).join(' L')} Z" fill="${c}" opacity="${op}"/>`;
    return `<rect width="200" height="200" fill="${p[3]}"/>${rayons}${oct(66, p[2], .35)}${oct(46, p[1], .3)}${oct(28, p[0], .22)}
      <path d="M118 14 L100 54 L114 82 L90 120 L104 190 L94 120 L106 84 L92 54 Z" fill="${p[1]}" opacity=".85"/>
      <path d="M114 22 L100 54 L110 82 L94 118" fill="none" stroke="${p[0]}" stroke-width="1.6"/>`;
  }

  const SUJETS = {
    taille_franche: p => croissant(102, 108, 70, -2.7, .35, p[1], p[0]) + place(lame(p), 96, 118, 44, .9)
      + roc(160, 66, .9, 20) + roc(172, 96, .7, -30) + roc(146, 50, .55, 60) + eclat(152, 86, .9, p[1]) + eclat(42, 150, .6, p[1]),
    fer_rougi: p => {
      const s = [[118, 94, 1.3], [138, 76, 1.05], [156, 60, .9], [130, 56, .7], [164, 92, .85], [148, 106, .7], [176, 70, .6], [110, 70, .6], [158, 40, .55]];
      return place(poly([[-40, 0], [0, -18], [40, -4], [46, 24], [-34, 30]], '#5a4038') + poly([[-40, 0], [0, -18], [40, -4], [0, 6]], '#9a7a62') + `<path d="M-14 -8 L-4 4 L10 -6 M-4 4 L-10 26" stroke="#ff7a2b" stroke-width="3" fill="none"/>` + encre([[-40, 0], [0, -18], [40, -4], [46, 24], [-34, 30]], 3), 82, 150, -8, .8)
        + s.map(([x, y, r]) => `<path d="M100 116 L${x} ${y}" stroke="${p[1]}" stroke-width="2" opacity=".7"/>`).join('')
        + place(lame(p, { chaud: true }), 76, 128, -54, .84)
        + s.map(([x, y, r]) => eclat(x, y, r, p[1], p[0])).join('');
    },
    fer_glace: p => {
      const glace = (x, y, s, r) => place(poly([[0, -16], [6, -4], [4, 14], [-4, 14], [-6, -4]], p[2]) + poly([[0, -16], [6, -4], [0, 0], [-6, -4]], p[0]) + poly([[0, 0], [6, -4], [4, 14]], p[1]) + encre([[0, -16], [6, -4], [4, 14], [-4, 14], [-6, -4]], 2), x, y, r, s);
      return place(lame(p, { runes: p[0] }), 76, 128, -54, .84)
        + glace(124, 86, 1, -30) + glace(146, 64, .8, 10) + glace(156, 100, .9, 50) + glace(132, 46, .6, -10) + glace(172, 74, .65, 20)
        + eclat(116, 112, .8, p[1]) + eclat(178, 48, .7, p[0]);
    },
    serment_jure: p => {
      const ruban = `<path d="M84 92 Q100 82 118 92 L116 102 Q100 94 86 102 Z" fill="#b8352b"/><path d="M84 92 Q100 82 118 92" fill="none" stroke="#e8705e" stroke-width="2"/>`;
      return place(lame(p, { runes: '#fff3d2' }), 98, 128, 0, .96)
        + ruban + croix(92, 92, .8) + croix(106, 91, .8)
        + `<path d="M116 98 Q128 112 128 128" stroke="#b8352b" stroke-width="5" fill="none"/><path d="M116 98 Q128 112 128 128" stroke="${INK}" stroke-width="1.6" fill="none" opacity=".6"/>`
        + place(`<path d="M0 -24 L17 -17 L24 0 L17 17 L0 24 L-17 17 L-24 0 L-17 -17 Z" fill="#a8322a"/><path d="M0 -24 L17 -17 L24 0 L0 0 L-17 -17 Z" fill="#d24a3c"/><path d="M0 -14 L0 12 M-9 -5 L0 -14 L9 -5 M-7 8 L7 8" stroke="#ffd08a" stroke-width="3.4" fill="none" stroke-linejoin="round" stroke-linecap="round"/>` + encre([[0, -24], [17, -17], [24, 0], [17, 17], [0, 24], [-17, 17], [-24, 0], [-17, -17]], 3), 134, 146)
        + eclat(64, 52, .8, p[1]) + eclat(140, 40, .6, p[0]);
    },
    garde_de_scorie: p => {
      const E = [[56, 42], [144, 42], [144, 100], [100, 156], [56, 100]];
      return poly(E, '#4a3a33') + poly([[56, 42], [100, 42], [100, 156], [56, 100]], '#6e5a4c') + poly([[56, 42], [144, 42], [100, 66]], '#8a7464')
        + `<path d="M74 54 L86 78 L78 100 L94 122 M128 54 L118 82 L128 102" stroke="#ff7a2b" stroke-width="5" fill="none" stroke-linejoin="round" stroke-linecap="round"/>`
        + `<path d="M74 54 L86 78 L78 100 L94 122 M128 54 L118 82 L128 102" stroke="#fff3c0" stroke-width="1.6" fill="none" stroke-linejoin="round"/>`
        + croix(81, 66, .8) + croix(84, 90, .8) + croix(87, 112, .8) + croix(123, 70, .8) + croix(122, 93, .8)
        + encre(E, 3.6) + `<path d="M58 44 L142 44" stroke="#f3bc72" stroke-width="3"/>`
        + place(lame(p), 118, 128, -128, .7);
    },
    lame_tournoyante: p => croissant(100, 102, 76, -1.4, 2.2, p[1], p[0], 1.22) + croissant(100, 102, 58, 1.6, 4.6, p[2], p[1], 1.25)
      + place(lame(p), 100, 112, 32, .84)
      + roc(36, 150, .8, 10) + roc(164, 148, .9, -20) + roc(58, 168, .55, 40) + eclat(150, 40, .8, p[1]) + eclat(40, 70, .6, p[0]),
  };

  function icone(s, px, o = {}) {
    const i = ++n, p = P[s.el], type = s.type || 'degats', f = FORMES[type];
    EPEE = o.epee || 'detail';
    const gy = type === 'soin' || type === 'invocation' ? 16 : 15, ry = type === 'soin' ? 176 : 172;
    return `<svg width="${px}" height="${px}" viewBox="0 0 200 200" style="overflow:visible">
      <defs>
        <linearGradient id="pf${i}" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#f4e8d0"/><stop offset=".5" stop-color="#d9c4a6"/><stop offset=".5" stop-color="#9c8670"/><stop offset="1" stop-color="#7c6856"/></linearGradient>
        <linearGradient id="or${i}" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#fff0c4"/><stop offset=".5" stop-color="#f3bc72"/><stop offset=".5" stop-color="#a8683a"/><stop offset="1" stop-color="#7a4a26"/></linearGradient>
        <clipPath id="cl${i}"><path d="${f}" ${k(.84)}/></clipPath>
      </defs>
      <path d="${f}" fill="url(#pf${i})" stroke="${INK}" stroke-width="4"/>
      <path d="${f}" ${k(.92)} fill="none" stroke="url(#or${i})" stroke-width="6"/>
      <g clip-path="url(#cl${i})">${fond(p)}</g>
      <path d="${f}" ${k(.84)} fill="none" stroke="${INK}" stroke-width="3"/>
      ${SUJETS[s.id](p)}
      <g transform="translate(100 ${gy})">${poly([[0, -15], [13, 0], [0, 15], [-13, 0]], p[2])}${poly([[0, -15], [13, 0], [0, 0]], p[0])}${poly([[0, 15], [-13, 0], [0, 0]], p[3])}${poly([[0, -15], [-13, 0], [0, 0]], p[1])}${encre([[0, -15], [13, 0], [0, 15], [-13, 0]], 2.6)}</g>
      ${o.motif ? `<g transform="translate(100 ${ry + 4})">${o.motif}</g>` : `<path d="M92 ${ry + 8} L100 ${ry} L108 ${ry + 8}" stroke="${INK}" stroke-width="5.4" fill="none" stroke-linejoin="round"/><path d="M92 ${ry + 8} L100 ${ry} L108 ${ry + 8}" stroke="#f3bc72" stroke-width="2.6" fill="none" stroke-linejoin="round"/>`}
      ${o.rang ? `<g transform="translate(172 24) scale(${.95 + o.rang * .12})">${poly([[0, -16], [11, -3], [6, 16], [-8, 13], [-11, -4]], '#209fec')}${poly([[0, -16], [11, -3], [1, 0]], '#e6fbff')}${poly([[-11, -4], [0, -16], [1, 0]], '#6fe0f2')}${poly([[1, 0], [6, 16], [-8, 13]], '#113f8a')}${encre([[0, -16], [11, -3], [6, 16], [-8, 13], [-11, -4]], 2.4)}</g>` : ''}
    </svg>`;
  }
  return { icone, SUJETS, P, FORMES, INK, outils: { poly, encre, place, croix, eclat, roc, croissant, flamme, lame, epeeA, epeeB, epeeC } };
})();
