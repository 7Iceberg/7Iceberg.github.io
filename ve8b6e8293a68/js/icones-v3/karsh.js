(() => {
  const { poly, encre, place, croix, eclat, roc, croissant, flamme } = IconesV3.outils;
  const { P, INK } = IconesV3;
  const OR_C = '#ffd98f', OR_S = '#a8683a', OR_V = '#fff3d2';
  const GA_C = '#8a8496', GA_S = '#2e2838', GA_V = '#c4bed0';
  const BOIS_C = '#c99a6a', BOIS_S = '#7a5236';
  const SG = ['#ffd2d8', '#ef5a6e', '#b51f35', '#4a0a16'];
  const [SANG_V, SANG_C, SANG, SANG_S] = SG;
  const NUIT_C = '#6a5c8c', NUIT = '#3e3458', NUIT_S = '#1e1830';
  const PI_C = '#aaa4b8', PI = '#706a80', PI_S = '#3a3448';
  const IV = '#f4ead8', IV_S = '#b8a888';
  const LUNE = '#f2eedc', LUNE_S = '#b8b2a0';
  const GLACE = ['#f2fdff', '#bfeefa', '#6fc4e0', '#1e4a6a'];
  const BRUME = ['#ffffff', '#f2d4dc', '#b07a8c', '#5a3448'];

  const deux = (pts, cut, c1, c2, w = 3) => poly(pts, c2) + poly(cut, c1) + encre(pts, w);
  const trait = (d, c, w, iw = w + 4.4) => `<path d="${d}" fill="none" stroke="${INK}" stroke-width="${iw}" stroke-linecap="round" stroke-linejoin="round"/><path d="${d}" fill="none" stroke="${c}" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round"/>`;
  const oct = (r, n = 8) => Array.from({ length: n }, (_, j) => { const a = (j + .5) / n * Math.PI * 2; return [+(Math.cos(a) * r).toFixed(1), +(Math.sin(a) * r).toFixed(1)]; });
  const hexa = r => Array.from({ length: 6 }, (_, j) => { const a = (j * 60 - 90) * Math.PI / 180; return [+(Math.cos(a) * r).toFixed(1), +(Math.sin(a) * r).toFixed(1)]; });
  const mx = a => a.map(([x, y]) => [-x, y]).reverse();
  const tirets = (d, c) => `<path d="${d}" fill="none" stroke="${INK}" stroke-width="7" stroke-dasharray="10 9" stroke-linecap="round"/><path d="${d}" fill="none" stroke="${c}" stroke-width="3.4" stroke-dasharray="10 9" stroke-linecap="round"/>`;

  function ls(o = {}) {
    const B = [[-12, -4], [-15, -62], [-7, -96], [13, -126], [17, -92], [13, -4]];
    const G = [[0, -6], [14, -8], [30, -16], [44, -12], [37, -4], [42, 5], [28, 2], [16, 8], [0, 8], [-16, 8], [-28, 2], [-42, 5], [-37, -4], [-44, -12], [-30, -16], [-14, -8]];
    const lit = o.glace ? '#bfeefa' : '#e0384e', mid = o.glace ? '#6fc4e0' : '#a8182c', dark = o.glace ? '#1e4a6a' : SANG_S, vif = o.glace ? '#f2fdff' : '#ff9aa6';
    return [
      poly(B, dark),
      poly([[-12, -4], [-15, -62], [-7, -96], [13, -126], [2, -60], [1, -4]], lit),
      poly([[-7, -96], [13, -126], [2, -60]], vif, 'opacity=".55"'),
      poly([[13, -126], [17, -92], [13, -4], [7, -4], [8, -90]], mid),
      poly([[13, -126], [17, -92], [11, -96]], vif),
      `<path d="M-4 -10 L-2 -38 L-7 -62 L-1 -90" fill="none" stroke="${dark}" stroke-width="2.6" stroke-linejoin="round"/>`,
      `<path d="M-9 -12 L-11 -60 L-5 -90" fill="none" stroke="${vif}" stroke-width="1.6" stroke-linejoin="round" opacity=".8"/>`,
      encre(B, 3.4),
      poly(G, GA_S), poly([[0, -6], [14, -8], [30, -16], [44, -12], [37, -4], [-37, -4], [-44, -12], [-30, -16], [-14, -8]], GA_C),
      poly([[-30, -16], [-44, -12], [-37, -4], [-24, -6]], GA_V), encre(G, 3),
      poly([[0, -8], [7, 0], [0, 8], [-7, 0]], SANG), poly([[0, -8], [7, 0], [0, 0]], SANG_V), encre([[0, -8], [7, 0], [0, 8], [-7, 0]], 1.8),
      poly([[-6, 8], [6, 8], [6, 44], [-6, 44]], '#d9c4a6'), poly([[-6, 8], [0, 8], [0, 44], [-6, 44]], '#efe2c8'),
      `<path d="M-6 16 L6 12 M-6 25 L6 21 M-6 34 L6 30 M-6 43 L6 39" stroke="${INK}" stroke-width="1.8"/>`, encre([[-6, 8], [6, 8], [6, 44], [-6, 44]], 2.6),
      deux([[0, 44], [10, 56], [7, 64], [0, 68], [-7, 64], [-10, 56]], [[0, 44], [0, 68], [-7, 64], [-10, 56]], SANG_C, SANG, 2.6),
      poly([[-4, 54], [-1, 49], [-1, 58]], SANG_V),
    ].join('');
  }
  const LS = (x, y, r, s, o) => place(ls(o), x, y, r, s);

  const goutte = (x, y, s, p = SG, r = 0) => place(deux([[0, -16], [10, 2], [8, 12], [0, 16], [-8, 12], [-10, 2]], [[0, -16], [0, 16], [-8, 12], [-10, 2]], p[1], p[2], 2.4) + poly([[-4, 0], [-1, -8], [-1, 4]], p[0]), x, y, r, s);
  const gouttes = l => l.map(([x, y, s, r]) => goutte(x, y, s, SG, r || 0)).join('');
  const bulle = (x, y, r, c) => `<circle cx="${x}" cy="${y}" r="${r}" fill="${c}" fill-opacity=".45" stroke="${INK}" stroke-width="2.2"/><path d="M${x - r * .5} ${y - r * .1} L${x - r * .2} ${y - r * .5}" stroke="#fff" stroke-width="1.6" stroke-linecap="round"/>`;
  const chevrons = (x, y, s, c, r = 0) => place([0, 18].map(dx => `<path d="M${dx - 10} -16 L${dx + 6} 0 L${dx - 10} 16" fill="none" stroke="${INK}" stroke-width="10" stroke-linejoin="miter" stroke-linecap="square"/><path d="M${dx - 10} -16 L${dx + 6} 0 L${dx - 10} 16" fill="none" stroke="${c}" stroke-width="5.4" stroke-linejoin="miter" stroke-linecap="square"/>`).join(''), x, y, r, s);
  const ondes = (x, y, s, c, n = 3, r = 0) => place(Array.from({ length: n }, (_, k) => { const R = 14 + k * 11; return trait(`M${R * .7} ${-R * .7} A${R} ${R} 0 0 1 ${R * .7} ${R * .7}`, c, 4, 8); }).join(''), x, y, r, s);
  const ondeDent = (x, y, s, c, sens = 1) => place([0, 1, 2].map(k => { const R = 18 + k * 13, n = 4; const pts = Array.from({ length: n * 2 + 1 }, (_, j) => { const a = (-50 + j * 100 / (n * 2)) * Math.PI / 180, rr = R + (j % 2 ? 5 : 0); return `${(sens * Math.cos(a) * rr).toFixed(1)} ${(Math.sin(a) * rr).toFixed(1)}`; }); return trait('M' + pts.join(' L'), c, 3.6, 7.6); }).join(''), x, y, 0, s);
  const coeur = (x, y, s) => place(deux([[0, 34], [-34, 2], [-34, -18], [-18, -30], [0, -18], [18, -30], [34, -18], [34, 2]], [[0, 34], [-34, 2], [-34, -18], [-18, -30], [0, -18]], SANG_C, SANG, 3.2)
    + poly([[-26, -14], [-18, -24], [-12, -16]], SANG_V), x, y, 0, s);
  const impact = (x, y, s, c1, c2) => place(deux([[0, -22], [6, -6], [22, 0], [6, 6], [0, 22], [-6, 6], [-22, 0], [-6, -6]], [[0, -22], [6, -6], [0, 0], [-6, 6], [-22, 0], [-6, -6]], c1, c2, 2.6), x, y, 0, s);
  const sol = (c1 = PI_C, c2 = PI_S) => deux([[22, 150], [178, 150], [168, 176], [32, 176]], [[22, 150], [178, 150], [174, 158], [26, 158]], c1, c2, 3);
  const bouffee = (x, y, r, c1, c2) => { const o = oct(r); return place(poly(o, c2) + poly([o[3], o[4], o[5], o[6], [0, 0]], c1) + encre(o, 2.4), x, y); };
  const nuage = (l, c1, c2) => l.map(([x, y, r]) => bouffee(x, y, r, c1, c2)).join('');
  const NUEE = [[-46, 16], [46, 16], [54, 4], [46, -10], [32, -14], [26, -28], [8, -34], [-8, -26], [-22, -32], [-36, -22], [-40, -8], [-54, 4]];
  const nuee = (x, y, s, c1, c2, c3) => place(poly(NUEE, c2) + poly([[-54, 4], [-40, -8], [-36, -22], [-22, -32], [-8, -26], [8, -34], [26, -28], [10, -6], [-20, 0]], c1)
    + poly([[-46, 16], [46, 16], [54, 4], [0, 8]], c3) + encre(NUEE, 3 / Math.max(s, .6)), x, y, 0, s);
  const vague = (x, y, s, p, r = 0) => place(
    poly([[-36, 14], [-26, -4], [-8, -14], [12, -12], [26, -2], [20, 4], [8, -2], [-2, 4], [4, 14]], p[2])
    + poly([[-26, -4], [-8, -14], [12, -12], [26, -2], [20, 4], [8, -2], [-8, -4]], p[1]) + poly([[-8, -14], [12, -12], [8, -8]], p[0])
    + encre([[-36, 14], [-26, -4], [-8, -14], [12, -12], [26, -2], [20, 4], [8, -2], [-2, 4], [4, 14]], 2.8), x, y, r, s);
  const glace = (x, y, s, r) => place(poly([[0, -16], [6, -4], [4, 14], [-4, 14], [-6, -4]], GLACE[2]) + poly([[0, -16], [6, -4], [0, 0], [-6, -4]], GLACE[0]) + poly([[0, 0], [6, -4], [4, 14]], GLACE[1]) + encre([[0, -16], [6, -4], [4, 14], [-4, 14], [-6, -4]], 2), x, y, r, s);
  const pierre = (x, y, s, r) => roc(x, y, s, r, PI_C, PI_S);

  const AILE_CS = [[6, -6], [18, -18], [36, -22], [54, -14], [48, -6], [46, 6], [37, 1], [30, 11], [22, 3], [13, 11], [6, 6]];
  const chauveSouris = (x, y, s, r = 0, c = NUIT) => place(
    poly(AILE_CS, c) + poly([[6, -6], [18, -18], [36, -22], [54, -14], [22, -6]], NUIT_C) + encre(AILE_CS, 2.6)
    + poly(mx(AILE_CS), c) + poly(mx([[6, -6], [18, -18], [36, -22], [54, -14], [22, -6]]), NUIT_C) + encre(mx(AILE_CS), 2.6)
    + `<path d="M18 -18 L22 3 M36 -22 L37 1 M-18 -18 L-22 3 M-36 -22 L-37 1" stroke="${INK}" stroke-width="1.8"/>`
    + deux([[-7, -8], [-6, -19], [-2, -12], [2, -12], [6, -19], [7, -8], [6, 6], [0, 13], [-6, 6]], [[-7, -8], [-6, -19], [-2, -12], [0, -12], [0, 13], [-6, 6]], '#4a4060', '#1b1424', 2.4)
    + `<circle cx="-3" cy="-6" r="1.9" fill="${SANG_C}"/><circle cx="3" cy="-6" r="1.9" fill="${SANG_C}"/>`, x, y, r, s);
  const AILE_M = [[0, 0], [20, -40], [60, -72], [96, -62], [84, -40], [88, -12], [66, -22], [58, 4], [38, -8], [24, 10]];
  const aile = (x, y, s, r = 0, sx = 1, c = NUIT) => place(`<g transform="scale(${sx} 1)">`
    + poly(AILE_M, c) + poly([[0, 0], [20, -40], [60, -72], [96, -62], [40, -30]], NUIT_C) + poly([[20, -40], [60, -72], [44, -46]], '#8a7cac')
    + `<path d="M20 -40 L96 -62 M20 -40 L88 -12 M20 -40 L58 4 M20 -40 L38 -8" fill="none" stroke="${INK}" stroke-width="2.4" stroke-linecap="round"/>`
    + encre(AILE_M, 3) + '</g>', x, y, r, s);
  const LUNE_D = 'M0 -30 A30 30 0 1 0 0 30 A43.5 43.5 0 0 1 0 -30 Z';
  const lune = (x, y, s) => place(`<path d="${LUNE_D}" fill="${LUNE}"/><path d="M0 30 A30 30 0 0 1 -30 0 L-12 0 A43.5 43.5 0 0 0 0 30 Z" fill="${LUNE_S}"/><path d="${LUNE_D}" fill="none" stroke="${INK}" stroke-width="3" stroke-linejoin="round"/>`, x, y, 0, s);
  const pleineLune = (x, y, r) => { const o = oct(r, 12); return place(poly(o, LUNE_S) + poly(o.slice(4, 10).concat([[0, 0]]), LUNE) + encre(o, 2.6) + `<circle cx="${r * .25}" cy="${-r * .2}" r="${r * .16}" fill="${LUNE_S}"/><circle cx="${-r * .3}" cy="${r * .3}" r="${r * .1}" fill="${LUNE_S}"/>`, x, y); };
  const machoire = (gc, gs, dents = IV) => deux([[-42, 0], [-32, -24], [0, -34], [32, -24], [42, 0], [26, -10], [0, -18], [-26, -10]], [[-42, 0], [-32, -24], [0, -34], [0, -18], [-26, -10]], gc, gs, 3)
    + [[-22, 22, 7], [22, 22, 7], [-8, 9, 5], [8, 9, 5]].map(([x, l, w]) => { const y0 = -14 + Math.abs(x) * .2; return deux([[x - w, y0], [x + w, y0], [x, y0 + l]], [[x - w, y0], [x, y0], [x, y0 + l]], '#ffffff', dents === IV ? IV_S : dents, 2); }).join('');
  const crocs = (x, y, s, gc = SANG, gs = SANG_S, ecart = 20) => place(place(machoire(gc, gs), 0, -ecart) + place(machoire(gc, gs), 0, ecart, 180), x, y, 0, s);
  const oeil = (x, y, s) => place(deux([[-42, 0], [-22, -18], [0, -22], [22, -18], [42, 0], [22, 18], [0, 22], [-22, 18]], [[-42, 0], [-22, -18], [0, -22], [22, -18], [42, 0]], IV, IV_S, 3.2)
    + `<circle r="16" fill="${SANG}" stroke="${INK}" stroke-width="2.6"/><path d="M0 -16 A16 16 0 0 0 -16 0 L0 0 Z" fill="${SANG_C}"/><ellipse rx="3.4" ry="12" fill="${INK}"/><circle cx="-6" cy="-7" r="3.2" fill="#fff"/>`, x, y, 0, s);
  const STELE = [[-26, 40], [-26, -14], [-20, -30], [-8, -38], [8, -38], [20, -30], [26, -14], [26, 40]];
  const stele = (x, y, s, r = 0) => place(deux(STELE, [[-26, 40], [-26, -14], [-20, -30], [-8, -38], [0, -38], [0, 40]], PI_C, PI, 3.4)
    + poly([[-26, 40], [-20, 40], [-20, -12], [-26, -14]], '#cac4d6') + `<path d="M4 -22 A10 10 0 1 0 4 -2 A7 7 0 1 1 4 -22 Z" fill="${PI_S}"/>`
    + `<path d="M-14 10 L14 10 M-14 20 L10 20" stroke="${PI_S}" stroke-width="2.6"/>` + trait('M18 -26 L10 -10 L16 2', SANG, 2.2, 5.4), x, y, r, s);
  const calice = (x, y, s) => place(
    deux([[-30, -30], [30, -30], [24, -6], [10, 6], [-10, 6], [-24, -6]], [[-30, -30], [0, -30], [0, 6], [-10, 6], [-24, -6]], OR_C, OR_S, 3.2)
    + deux([[-28, -30], [28, -30], [24, -24], [-24, -24]], [[-28, -30], [0, -30], [0, -24], [-24, -24]], SANG_C, SANG, 2.4)
    + deux([[16, -28], [22, -28], [22, -10], [19, -4], [16, -10]], [[16, -28], [19, -28], [19, -4], [16, -10]], SANG_C, SANG, 2)
    + deux([[-5, 6], [5, 6], [5, 26], [-5, 26]], [[-5, 6], [0, 6], [0, 26], [-5, 26]], OR_C, OR_S, 2.4)
    + deux([[-22, 26], [22, 26], [26, 34], [-26, 34]], [[-22, 26], [0, 26], [0, 34], [-26, 34]], OR_C, OR_S, 2.8)
    + poly([[0, -18], [6, -12], [0, -6], [-6, -12]], SANG) + encre([[0, -18], [6, -12], [0, -6], [-6, -12]], 1.8), x, y, 0, s);
  const fiole = (x, y, s) => { const o = oct(28); return place(
    poly(o, '#d8e8f2', 'fill-opacity=".9"') + poly([[-27, -2], [27, -2], [25.9, 10.7], [10.7, 25.9], [-10.7, 25.9], [-25.9, 10.7]], SANG) + poly([[-27, -2], [27, -2], [24, 3], [-24, 3]], SANG_C)
    + poly([[-18, -16], [-8, -22], [-10, -12]], '#ffffff') + encre(o, 3)
    + deux([[-8, -26], [8, -26], [8, -40], [-8, -40]], [[-8, -26], [0, -26], [0, -40], [-8, -40]], '#f2f8fc', '#9fb2c8', 2.6)
    + deux([[-10, -40], [10, -40], [8, -52], [-8, -52]], [[-10, -40], [0, -40], [0, -52], [-8, -52]], BOIS_C, BOIS_S, 2.6), x, y, 0, s); };
  const cadran = (x, y, s) => place(`<circle r="34" fill="#1e2a52" stroke="${INK}" stroke-width="3.2"/><path d="M0 -34 A34 34 0 0 0 -34 0 L0 0 Z" fill="#2e3e72"/>`
    + Array.from({ length: 12 }, (_, k) => { const a = k * 30 * Math.PI / 180, c = Math.cos(a), sn = Math.sin(a); return `<path d="M${(sn * 26).toFixed(1)} ${(-c * 26).toFixed(1)} L${(sn * (k % 3 ? 30 : 32)).toFixed(1)} ${(-c * (k % 3 ? 30 : 32)).toFixed(1)}" stroke="${OR_C}" stroke-width="${k % 3 ? 2 : 3.4}"/>`; }).join('')
    + eclat(-12, 10, .5, '#c9d4ff') + eclat(14, 12, .4, '#c9d4ff') + eclat(-14, -12, .35, '#c9d4ff')
    + trait('M0 4 L0 -24', OR_C, 4, 7.4) + trait('M2 4 L-1 -16', OR_V, 3, 6) + `<circle r="4" fill="${OR_C}" stroke="${INK}" stroke-width="2"/>`
    + `<circle r="34" fill="none" stroke="${OR_S}" stroke-width="2" transform="scale(.9)"/>`, x, y, 0, s);
  const main = (x, y, s, r = 0) => place(
    deux([[-16, 34], [-20, 4], [-18, -30], [-12, -44], [0, -46], [12, -42], [16, -28], [16, -4], [28, -16], [36, -12], [22, 14], [12, 34]],
      [[-16, 34], [-20, 4], [-18, -30], [-12, -44], [0, -46], [-2, 34]], '#e2dce6', '#9a90a6', 3.2)
    + [[-12, -44], [0, -46], [12, -42]].map(([a, b]) => deux([[a - 4, b + 2], [a + 4, b + 2], [a + 1, b - 9]], [[a - 4, b + 2], [a, b + 2], [a + 1, b - 9]], '#3a3048', INK, 1.8)).join('')
    + `<path d="M-7 -44 L-7 -12 M5 -45 L5 -12" stroke="${INK}" stroke-width="2"/>`
    + deux([[-18, 34], [14, 34], [14, 48], [-18, 48]], [[-18, 34], [-2, 34], [-2, 48], [-18, 48]], '#efe2c8', '#a8937d', 3) + `<path d="M-18 40 L14 38 M-18 46 L14 44" stroke="${INK}" stroke-width="1.6"/>`, x, y, r, s);
  const poing = (x, y, s, r = 0) => place(
    deux([[-28, -22], [24, -24], [30, -6], [28, 14], [18, 30], [-18, 30], [-30, 12], [-32, -6]], [[-28, -22], [0, -23], [-2, 30], [-18, 30], [-30, 12], [-32, -6]], PI_C, PI_S, 3.4)
    + `<path d="M-15 -23 L-15 -6 M-1 -23 L-1 -6 M13 -24 L13 -6" stroke="${INK}" stroke-width="2.4"/>`
    + trait('M-22 -14 L-12 0 L-18 8 M22 -16 L12 0 L20 16', SANG, 2.6, 6)
    + deux([[-32, -4], [6, -6], [10, 4], [0, 12], [-30, 12]], [[-32, -4], [6, -6], [4, 2], [-30, 4]], '#cac4d6', PI, 2.8)
    + deux([[-20, 30], [20, 30], [20, 46], [-20, 46]], [[-20, 30], [0, 30], [0, 46], [-20, 46]], '#efe2c8', '#a8937d', 3) + `<path d="M-20 36 L20 34 M-20 42 L20 40" stroke="${INK}" stroke-width="1.6"/>`, x, y, r, s);
  const crochet = (x, y, s, c, r = 0) => place(
    `<circle cx="0" cy="-58" r="9" fill="none" stroke="${INK}" stroke-width="11"/><circle cx="0" cy="-58" r="9" fill="none" stroke="${c}" stroke-width="6"/>`
    + trait('M0 -48 L0 6 Q0 32 -20 32 Q-40 32 -40 10 L-40 4', c, 8, 13) + `<path d="M-2 -44 L-2 6 Q-2 26 -18 28" fill="none" stroke="#ffffff" stroke-width="2" opacity=".55"/>`
    + deux([[-47, 6], [-40, -14], [-33, 6]], [[-47, 6], [-40, -14], [-40, 6]], SANG_V, SANG, 2.6), x, y, r, s);
  const maillon = (x, y, r, c, chant) => place(chant
    ? trait('M-13 0 L13 0', c, 5, 10)
    : `<rect x="-15" y="-8.5" width="30" height="17" rx="8.5" fill="none" stroke="${INK}" stroke-width="10"/><rect x="-15" y="-8.5" width="30" height="17" rx="8.5" fill="none" stroke="${c}" stroke-width="5"/><path d="M-9 -8 L8 -8" stroke="#ffffff" stroke-width="1.6" opacity=".6"/>`, x, y, r);
  const chaine = (x0, y0, x1, y1, n, c) => { const a = Math.atan2(y1 - y0, x1 - x0) * 180 / Math.PI; return Array.from({ length: n }, (_, k) => maillon(x0 + (x1 - x0) * k / (n - 1), y0 + (y1 - y0) * k / (n - 1), a, c, k % 2)).join(''); };
  const botte = (x, y, s) => place(
    deux([[-22, -42], [10, -42], [12, 2], [38, 12], [44, 30], [-24, 30], [-28, 8]], [[-22, -42], [10, -42], [12, 2], [-6, 8], [-24, 30], [-28, 8]], NUIT_C, NUIT_S, 3.4)
    + deux([[-28, 30], [46, 30], [44, 40], [-28, 40]], [[-28, 30], [46, 30], [46, 34], [-28, 34]], SANG_C, SANG_S, 2.8)
    + deux([[-24, -42], [12, -42], [12, -32], [-24, -32]], [[-24, -42], [0, -42], [0, -32], [-24, -32]], SANG_C, SANG, 2.4) + croix(-6, -12, .8), x, y, 0, s);
  const cuirasse = (x, y, s) => place(
    deux([[-40, -36], [-16, -42], [0, -30], [16, -42], [40, -36], [46, 0], [34, 38], [0, 48], [-34, 38], [-46, 0]],
      [[-40, -36], [-16, -42], [0, -30], [0, 48], [-34, 38], [-46, 0]], NUIT_C, NUIT_S, 3.6)
    + trait('M0 -30 L0 48', SANG, 3, 7) + trait('M-36 12 L-8 20 M36 12 L8 20 M-28 -16 L-10 -6 M28 -16 L10 -6', SANG, 2.4, 6)
    + croix(0, -12, .8) + croix(0, 8, .8) + croix(0, 28, .8)
    + deux([[-40, -36], [-16, -42], [-16, -34], [-34, -28]], [[-40, -36], [-16, -42], [-28, -34]], GA_V, GA_S, 2.4)
    + deux([[40, -36], [16, -42], [16, -34], [34, -28]], [[40, -36], [16, -42], [28, -34]], GA_V, GA_S, 2.4), x, y, 0, s);
  const brique = (x, y, w, h, c1 = PI_C, c2 = PI) => deux([[x, y], [x + w, y], [x + w, y + h], [x, y + h]], [[x, y], [x + w, y], [x + w - 4, y + 4], [x + 4, y + 4], [x + 4, y + h - 4], [x, y + h]], c1, c2, 2.4);
  const crypte = (x, y, s) => place(
    deux([[-54, 44], [-54, -6], [-40, -34], [0, -50], [40, -34], [54, -6], [54, 44]], [[-54, 44], [-54, -6], [-40, -34], [0, -50], [0, 44]], PI_C, PI, 3.4)
    + `<path d="M-54 8 L54 8 M-54 26 L54 26 M-48 -16 L48 -16 M-28 -40 L28 -40 M-30 8 L-30 26 M30 8 L30 26 M-40 -16 L-40 8 M40 -16 L40 8 M-12 26 L-12 44 M12 26 L12 44" stroke="${INK}" stroke-width="1.8" opacity=".55"/>`
    + poly([[-30, 44], [-30, 4], [-20, -16], [0, -24], [20, -16], [30, 4], [30, 44]], NUIT_S)
    + `<circle cx="-8" cy="8" r="2.6" fill="${SANG_C}"/><circle cx="8" cy="8" r="2.6" fill="${SANG_C}"/>`
    + encre([[-30, 44], [-30, 4], [-20, -16], [0, -24], [20, -16], [30, 4], [30, 44]], 3)
    + trait('M20 -44 L12 -26 L22 -12 L14 4', INK, 2, 2), x, y, 0, s);
  const fleche = (d, hx, hy, ha, c) => trait(d, c, 7, 12) + place(deux([[0, -14], [16, 0], [0, 14]], [[0, -14], [16, 0], [0, 0]], OR_V, c, 2.8), hx, hy, ha);
  const spirale = (cx, cy, R, tours, c1, c2) => {
    const n = 90, pts = Array.from({ length: n + 1 }, (_, k) => { const t = k / n, a = -Math.PI / 2 + t * tours * Math.PI * 2, r = R * (1 - t * .82); return `${(cx + Math.cos(a) * r).toFixed(1)} ${(cy + Math.sin(a) * r).toFixed(1)}`; });
    const d = 'M' + pts.join(' L');
    return `<path d="${d}" fill="none" stroke="${INK}" stroke-width="20" stroke-linecap="round" stroke-linejoin="round"/><path d="${d}" fill="none" stroke="${c2}" stroke-width="14" stroke-linecap="round" stroke-linejoin="round"/><path d="${d}" fill="none" stroke="${c1}" stroke-width="5" stroke-linecap="round" stroke-linejoin="round" transform="translate(-2 -2)"/>`;
  };
  const sablier = (x, y, s) => place(
    deux([[-20, -30], [20, -30], [4, 0], [20, 30], [-20, 30], [-4, 0]], [[-20, -30], [0, -30], [0, 30], [-20, 30], [-4, 0]], '#d8e8f2', '#8fa6bd', 2.6)
    + poly([[-12, 24], [12, 24], [4, 10], [-4, 10]], SANG) + poly([[-10, -24], [10, -24], [5, -16], [-5, -16]], SANG_C)
    + deux([[-24, -36], [24, -36], [24, -30], [-24, -30]], [[-24, -36], [0, -36], [0, -30], [-24, -30]], OR_C, OR_S, 2.2)
    + deux([[-24, 30], [24, 30], [24, 36], [-24, 36]], [[-24, 30], [0, 30], [0, 36], [-24, 36]], OR_C, OR_S, 2.2), x, y, 0, s);
  const dalle = (x, y, s) => place(
    deux([[-44, -20], [-20, -40], [20, -38], [44, -14], [40, 22], [10, 40], [-30, 34], [-48, 8]], [[-44, -20], [-20, -40], [20, -38], [0, -6], [-30, 34], [-48, 8]], PI_C, PI_S, 3.6)
    + [[-26, -14, 6], [-4, -24, 5], [18, -18, 4], [-30, 12, 5], [-8, 4, 7], [16, 10, 5], [28, -2, 4], [2, 26, 4]].map(([a, b, r]) => place(poly(oct(r, 6), SANG_S) + poly(oct(r * .6, 6), SANG_C), a, b)).join(''), x, y, 0, s);
  const paFele = (x, y, s) => place(deux([[0, -20], [15, 0], [0, 20], [-15, 0]], [[0, -20], [0, 20], [-15, 0]], '#f7dca8', '#835737', 3)
    + poly([[0, -20], [15, 0], [0, 0]], '#ddaa72') + poly([[0, 0], [15, 0], [0, 20]], '#5a4a44', 'opacity=".75"')
    + `<path d="M-3 -18 L3 -6 L-4 4 L2 18" fill="none" stroke="${INK}" stroke-width="3" stroke-linejoin="round"/>`, x, y, 0, s);
  const silhouette = (x, y, s) => place(
    aile(10, -6, .9, -6, 1) + aile(-10, -6, .9, 6, -1)
    + deux([[0, -48], [18, -34], [22, -8], [30, 40], [0, 50], [-30, 40], [-22, -8], [-18, -34]], [[0, -48], [0, 50], [-30, 40], [-22, -8], [-18, -34]], '#3a3048', NUIT_S, 3.4)
    + poly([[0, -38], [12, -26], [12, -10], [0, -4], [-12, -10], [-12, -26]], '#120c1c')
    + `<path d="M-9 -20 L-3 -17 M9 -20 L3 -17" stroke="${SANG_C}" stroke-width="3.4" stroke-linecap="round"/>`
    + poly([[-5, -10], [-3, -4], [-1, -10]], IV) + poly([[1, -10], [3, -4], [5, -10]], IV)
    + trait('M-14 6 L0 14 L14 6', SANG, 2.6, 6) + croix(0, 26, .8), x, y, 0, s);

  Object.assign(IconesV3.SUJETS, {
    taillade: p => croissant(102, 108, 70, -2.7, .35, SANG, SANG_C) + LS(86, 128, 48, .82)
      + gouttes([[150, 120, .7], [128, 150, .55], [164, 152, .45]]) + coeur(154, 60, .36) + eclat(52, 54, .7, SANG_V),
    lame_de_vapeur: p => lune(150, 64, .95) + nuee(132, 128, .7, '#ffffff', p[0], p[1]) + LS(70, 132, 50, .78)
      + nuee(52, 154, .36, '#ffffff', p[0], p[1]) + gouttes([[112, 66, .5]]) + eclat(176, 112, .6, '#ffffff'),
    poing_de_scorie: p => impact(146, 62, 1.3, p[0], p[1]) + poing(92, 106, 1.45, -8) + pierre(150, 122, .9, 20) + pierre(44, 58, .6, -10) + pierre(162, 96, .55, 60),
    revers_de_cendre: p => croissant(100, 110, 70, -2.9, -.6, '#ffffff', p[1], 1.22) + main(104, 112, 1.25, -38)
      + trait('M88 120 L102 104 L116 98', SANG, 3, 6.4) + gouttes([[56, 150, .55], [40, 128, .4]]) + chauveSouris(152, 46, .55),
    vapeur_mordante: p => nuage([[58, 84, 18], [84, 64, 20], [118, 60, 20], [146, 78, 18], [150, 112, 16], [124, 132, 18], [88, 134, 18], [60, 116, 16], [100, 100, 22]], BRUME[1], BRUME[2])
      + crocs(100, 102, .82, SANG, SANG_S, 14) + gouttes([[160, 150, .5], [40, 150, .4]]) + eclat(160, 46, .6, p[0]),
    eclat_de_laitier: p => tirets('M36 156 Q56 60 108 76', p[1])
      + place(stele(0, 0, 1), 132, 96, 18, .95)
      + [[108, 146, .7, -20], [140, 152, .85, 30], [164, 136, .55, 70]].map(([x, y, s, r]) => pierre(x, y, s, r)).join('')
      + eclat(60, 60, .6, p[0]),
    gerbe_d_escarbilles: p => trait('M36 112 Q50 70 96 62', '#ffffff', 4.4, 9) + LS(64, 146, 40, .56)
      + [[112, 74, .62, -10], [150, 50, .5, 15], [140, 102, .55, 5], [176, 82, .42, -15], [110, 120, .4, 20], [176, 128, .36, 10]].map(([x, y, s, r]) => chauveSouris(x, y, s, r)).join('')
      + eclat(132, 30, .6, p[0]) + eclat(186, 50, .5, p[0]),
    pluie_bouillante: p => {
      const F = [[-40, 0], [-28, -12], [0, -16], [28, -12], [40, 0], [28, 12], [0, 16], [-28, 12]];
      const C = [[-30, 4], [-24, -14], [-16, -2], [-8, -24], [0, -6], [8, -26], [16, -4], [24, -16], [30, 4]];
      return place(deux(F, [[-40, 0], [-28, -12], [0, -16], [28, -12], [40, 0]], SANG, SANG_S, 3) + poly([[-24, -6], [0, -10], [14, -6], [-6, -2]], SANG_C), 100, 120, 0, 1.1)
        + place(deux(C, [[-30, 4], [-24, -14], [-16, -2], [-8, -24], [0, -6], [0, 4]], SANG_C, SANG, 2.6), 100, 112, 0, 1)
        + goutte(100, 40, .9) + goutte(100, 168, .9, SG, 180) + goutte(36, 112, .9, SG, -90) + goutte(164, 112, .9, SG, 90)
        + gouttes([[64, 70, .45], [138, 66, .4], [140, 152, .45, 180]]);
    },
    dernier_souffle: p => {
      const C = [[150, 46], [168, 38], [164, 58], [188, 66], [176, 86], [194, 104], [176, 122], [188, 142], [164, 150], [168, 170], [150, 162]];
      const k = f => [[58, 104]].concat(C.map(([x, y]) => [58 + (x - 58) * f, 104 + (y - 104) * f]));
      return poly(k(1), SANG) + poly(k(.74), SANG_C) + poly(k(.46), SANG_V) + encre(k(1), 3)
        + cadran(54, 104, 1.15) + gouttes([[118, 50, .5], [124, 160, .5, 180]]);
    },
    rafale_d_iskar: p => croissant(132, 104, 44, -1.1, 1.1, p[1], p[0], 1.25) + croissant(160, 104, 30, -1.1, 1.1, p[2], p[1], 1.25)
      + aile(36, 140, 1.05, 8) + cadran(42, 142, .5) + eclat(170, 46, .6, '#c9d4ff') + eclat(176, 152, .5, p[0]),
    serment_de_sang: p => calice(96, 112, 1.5) + gouttes([[150, 150, .5], [134, 166, .36]]) + chevrons(44, 70, .62, OR_C, -90) + chevrons(156, 70, .62, OR_C, -90),
    foulee_de_braise: p => botte(110, 96, 1.3) + chauveSouris(50, 150, .5, -10) + chauveSouris(40, 104, .4, 10) + gouttes([[80, 160, .4]]) + chevrons(166, 112, .6, OR_C),
    sang_pour_sang: p => crocs(118, 94, .8) + trait('M134 116 Q130 150 92 156', SANG_C, 4, 8.4) + coeur(62, 148, .78)
      + place(deux([[0, -12], [14, 0], [0, 12]], [[0, -12], [14, 0], [0, 0]], OR_V, SANG, 2.6), 90, 156, 170) + gouttes([[118, 128, .5]]) + eclat(54, 54, .7, p[0]),
    machefer_avide: p => dalle(98, 108, 1.25) + coeur(150, 46, .44)
      + gouttes([[34, 70, .55, 30], [34, 140, .5, -30], [166, 150, .55, 40]]),
    rage: p => place(poly([[-70, 0], [-40, -30], [0, -40], [40, -30], [70, 0], [40, 30], [0, 40], [-40, 30]], NUIT_S) + encre([[-70, 0], [-40, -30], [0, -40], [40, -30], [70, 0], [40, 30], [0, 40], [-40, 30]], 3), 100, 98)
      + place(oeil(0, 0, .55), 72, 88, -12) + place(oeil(0, 0, .55), 128, 88, 12)
      + `<path d="M78 70 L96 80 M122 70 L104 80" stroke="${INK}" stroke-width="6" stroke-linecap="round"/>`
      + place(machoire(SANG, SANG_S), 100, 114, 180, .7) + eclat(160, 40, .7, SANG_C) + eclat(40, 44, .55, SANG_C),
    brasier_couve: p => fiole(90, 108, 1.4) + sablier(158, 136, .62) + eclat(146, 50, .55, p[0]),
    lien_de_sang: p => chaine(150, 46, 112, 78, 3, SANG) + crochet(92, 116, 1.1, '#4a4060', 38) + gouttes([[56, 150, .5], [150, 150, .45]]) + eclat(54, 70, .7, p[0]),
    crochet_d_ecume: p => nuee(98, 156, .8, p[0], p[1], p[2]) + chaine(150, 46, 112, 78, 3, '#9fb2c8') + crochet(92, 116, 1.1, '#4a4060', 38)
      + nuee(50, 92, .36, p[0], p[1], p[2]) + bulle(150, 132, 6, p[0]) + eclat(160, 90, .5, '#ffffff'),
    charge: p => [[30, 70], [24, 88], [30, 136], [24, 154]].map(([x, y], k) => trait(`M${x} ${y} L${x + 30 - k % 2 * 8} ${y}`, '#ffffff', 3.4, 7.4)).join('')
      + [[50, 72, .5, .55], [84, 64, .6, .8], [56, 150, .46, .5]].map(([x, y, s, o]) => `<g opacity="${o}">${chauveSouris(x, y, s, -12)}</g>`).join('')
      + LS(76, 112, 90, .72) + chevrons(166, 112, .7, SANG_C),
    bond_de_wyverne: p => tirets('M26 160 Q22 60 74 50', p[0])
      + [[0, -1], [1, 0], [0, 1], [-1, 0]].map(([dx, dy]) => trait(`M${146 + dx * 19} ${146 + dy * 19} L${146 + dx * 27} ${146 + dy * 27}`, '#ffffff', 4, 8.4)).join('')
      + impact(146, 146, .86, p[0], p[2]) + chauveSouris(100, 92, 1.3, 30),
    frappe_lourde: p => sol() + `<path d="M100 150 L92 160 L104 168 L98 176" fill="none" stroke="${INK}" stroke-width="4"/>` + LS(100, 72, 180, .64)
      + impact(100, 148, 1, p[0], p[1]) + chevrons(156, 128, .62, p[1]) + chevrons(44, 128, .62, p[1], 180) + gouttes([[60, 92, .45], [142, 84, .4]]),
    coup_d_enclume: p => sol() + stele(98, 98, 1.4, -14) + impact(116, 150, .8, p[0], p[1])
      + trait('M44 42 L56 60 M30 70 L48 78', '#ffffff', 3.4, 7.4) + chevrons(166, 112, .6, p[1]),
    effondrement_de_forge: p => crypte(96, 108, 1) + brique(130, 34, 22, 14) + place(brique(-11, -7, 22, 14), 156, 62, 30) + place(brique(-11, -7, 22, 14), 44, 50, -24)
      + pierre(60, 160, .8, 0) + pierre(138, 162, .9, 30) + eclat(164, 110, .6, p[0]),
    embrasement_d_iskar: p => [0, 120, 240].map(a => place(trait('M0 -60 A60 60 0 0 1 48 -36', SANG_C, 7, 12) + place(vague(0, 0, .5, SG), 46, -40, 125), 100, 102, a)).join('')
      + coeur(100, 104, .78),
    colosse: p => place(poly(hexa(64), SANG) + [[0, 0], ...Array.from({ length: 6 }, (_, k) => { const a = k * 60 * Math.PI / 180; return [Math.cos(a) * 35, Math.sin(a) * 35]; })].map(([x, y]) => { const h = hexa(17.5); return place(poly(h, NUIT) + poly([h[4], h[5], h[0], [0, 0]], NUIT_C) + encre(h, 2.4), x, y); }).join('') + encre(hexa(64), 3.2), 100, 100, 0, 1)
      + lune(108, 100, .5),
    cuirasse_de_scorie: p => lune(50, 58, .62) + cuirasse(100, 108, 1.25) + eclat(46, 150, .5, p[0]),
    poigne_de_machefer: p => stele(132, 92, .9, 10) + main(82, 112, 1.2, 20) + pierre(150, 150, .7, 30) + coeur(52, 50, .36),
    morsure_bouillante: p => crocs(100, 104, 1.25, GLACE[2], GLACE[3], 20)
      + glace(152, 56, .9, 20) + glace(48, 150, .8, -30) + glace(166, 146, .6, 50) + eclat(46, 56, .7, GLACE[0]) + gouttes([[100, 106, .5]]),
    soufflet_de_forge: p => oeil(96, 100, 1.4) + gouttes([[96, 150, .7], [72, 160, .45]]) + chevrons(160, 150, .5, SANG_C, -90) + eclat(150, 50, .6, p[0]) + eclat(48, 52, .5, p[0]),
    forme_d_iskar: p => pleineLune(100, 70, 46) + silhouette(100, 118, 1.05),
    tourbillon_de_cendres: p => spirale(100, 102, 64, 2.1, '#d8d2dc', NUIT_C) + [[150, 52, .5, 20], [52, 146, .5, -20], [154, 150, .42, 10], [56, 62, .44, -10]].map(([x, y, s, r]) => chauveSouris(x, y, s, r)).join(''),
    eboulis_de_scorie: p => place(deux([[-54, 30], [-30, -10], [-8, -30], [14, -26], [36, 0], [56, 30]], [[-54, 30], [-30, -10], [-8, -30], [0, 30]], PI_C, PI_S, 3.4)
      + trait('M-20 4 L-6 -10 L4 6 M18 -6 L26 14', SANG, 2.4, 6), 100, 112, 0, 1.15)
      + place(brique(-14, -9, 28, 18), 100, 44, 10) + place(brique(-14, -9, 28, 18), 34, 112, -30) + place(brique(-14, -9, 28, 18), 166, 112, 40) + place(brique(-12, -8, 24, 16), 100, 164, 0),
    chaine_rougie: p => chaine(138, 66, 70, 134, 6, '#a04a9a') + place(`<path d="M-16 0 A16 16 0 1 1 16 0" fill="none" stroke="${INK}" stroke-width="12"/><path d="M-16 0 A16 16 0 1 1 16 0" fill="none" stroke="#a04a9a" stroke-width="7"/>` + deux([[-22, 0], [22, 0], [22, 7], [-22, 7]], [[-22, 0], [0, 0], [0, 7], [-22, 7]], OR_C, OR_S, 2.4), 148, 56, 225, .8)
      + chevrons(46, 154, .6, OR_C, 135) + gouttes([[160, 140, .5]]),
    place_brulante: p => fleche('M48 92 Q100 34 146 82', 150, 92, 70, OR_C) + fleche('M152 112 Q100 170 54 122', 50, 112, 250, SANG_C)
      + chauveSouris(100, 104, .8) + eclat(34, 154, .5, p[0]) + eclat(168, 46, .5, p[0]),
    lame_bouillante: p => LS(92, 128, 36, .82, { glace: true }) + glace(150, 60, 1, 20) + glace(160, 104, .8, 60) + glace(126, 40, .6, -10)
      + glace(52, 150, .7, -40) + eclat(170, 140, .7, GLACE[0]) + eclat(48, 60, .5, GLACE[0]),
    lame_de_fumee: p => LS(92, 122, 44, .86) + nuee(78, 136, .95, '#d8d2e4', '#8a80a2', '#4e4672') + nuee(126, 154, .5, '#d8d2e4', '#8a80a2', '#4e4672')
      + nuee(46, 92, .42, '#d8d2e4', '#8a80a2', '#4e4672') + eclat(160, 40, .6, SANG_C),
    cendres_ranimees: p => coeur(100, 112, 1.35) + trait('M100 88 L92 104 L106 118 L98 136', SANG_S, 3.4, 8) + croix(88, 100, .8) + croix(110, 112, .8) + croix(90, 126, .8)
      + goutte(100, 54, 1) + eclat(150, 54, .55, p[0]) + eclat(52, 64, .5, p[0]),
    rempart_de_cendre: p => lune(102, 80, .9) + Array.from({ length: 2 }, (_, row) => Array.from({ length: 8 }, (_, k) => {
      const da = 240 / 8, a0 = 210 - k * da - (row ? da / 2 : 0), a1 = a0 - da + 2, r0 = 40 + row * 15, r1 = r0 + 14, R = a => a * Math.PI / 180;
      if (row && k === 7) return '';
      const q = [[Math.cos(R(a0)) * r0, Math.sin(R(a0)) * r0], [Math.cos(R(a0)) * r1, Math.sin(R(a0)) * r1], [Math.cos(R(a1)) * r1, Math.sin(R(a1)) * r1], [Math.cos(R(a1)) * r0, Math.sin(R(a1)) * r0]].map(([x, y]) => [+(100 + x).toFixed(1), +(96 - y).toFixed(1)]);
      return poly(q, row ? NUIT : NUIT_C) + poly([q[0], q[1], q[2]], row ? NUIT_C : '#8a7cac') + encre(q, 2.2);
    }).join('')).join(''),
    souffle_avide: p => trait('M40 128 Q96 64 150 74 Q182 88 162 120 Q140 150 96 132', p[1], 9, 15) + trait('M44 124 Q96 68 148 78', '#ffffff', 2.4, .01)
      + place(deux([[0, -15], [18, 0], [0, 15]], [[0, -15], [18, 0], [0, 0]], OR_V, p[2], 2.8), 92, 130, 200) + coeur(64, 150, .42)
      + gouttes([[110, 72, .45], [168, 96, .45, 60], [130, 140, .4, 140]]),
    fumee_acre: p => {
      const A = ['#d8cce6', '#8a7aa6', '#4a3e66'];
      return [[30, 70], [26, 86], [32, 102]].map(([x, y], k) => trait(`M${x} ${y} L${x + 18 - k * 4} ${y}`, A[0], 3.4, 7.4)).join('')
        + bouffee(58, 108, 13, A[0], A[1]) + bouffee(44, 126, 9, A[0], A[1])
        + nuee(108, 92, 1.12, A[0], A[1], A[2])
        + `<path d="M140 98 Q150 82 136 74 Q122 70 118 84 Q118 94 128 92" fill="none" stroke="${INK}" stroke-width="3.6" stroke-linecap="round"/>`
        + paFele(112, 146, 1) + chevrons(146, 140, .44, p[1], 90);
    },
    rugissement_d_iskar: p => pleineLune(84, 96, 38) + chauveSouris(84, 100, .9) + ondes(132, 100, .95, SANG_C) + eclat(160, 46, .55, p[0]),
    pied_ferme: p => sol() + botte(96, 106, 1.3) + chevrons(160, 96, .6, SANG_C, 180) + chevrons(34, 96, .6, SANG_C)
      + `<path d="M40 158 L30 172 M162 158 L172 172 M150 160 L156 170" stroke="${INK}" stroke-width="3.4" stroke-linecap="round"/>`
      + place(deux([[-16, -18], [16, -18], [16, 0], [0, 18], [-16, 0]], [[-16, -18], [0, -18], [0, 18], [-16, 0]], GA_V, GA_S, 2.8) + croix(0, -4, .7), 46, 54, -12, 1),
    hurlement: p => ondeDent(112, 102, 1.15, SANG_C, 1) + ondeDent(88, 102, 1.15, SANG_C, -1) + crocs(100, 102, .62) + chauveSouris(100, 44, .5),
    cri_de_vapeur: p => ondes(118, 104, 1.1, '#ffffff') + ondes(82, 104, 1.1, '#ffffff', 3, 180)
      + glace(100, 104, 2.2, 0) + eclat(150, 56, .6, GLACE[0]) + eclat(48, 150, .5, GLACE[0]) + glace(160, 150, .5, 30),
  });
})();

IconesV3.TYPES = Object.assign(IconesV3.TYPES || {}, {fumee_acre:'degats',rugissement_d_iskar:'degats',pied_ferme:'degats'});
