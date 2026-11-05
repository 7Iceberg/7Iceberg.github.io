(() => {
  const { poly, encre, place, croix, eclat, roc, croissant, flamme } = IconesV3.outils;
  const { P, INK } = IconesV3;
  const OR_C = '#ffd98f', OR_S = '#a8683a', OR_V = '#fff3d2';
  const MET_C = '#f1e6d2', MET_S = '#7c8db4', MET_O = '#3e4a6e';
  const TEAL = '#2aa6b8', TEAL_S = '#1d6f7c', TEAL_C = '#8fdbe4', CRIST = '#52d2f4';
  const PIERRE = ['#f4ead6', '#d9c4a6', '#8f7a66', '#4a3a33'];
  const SABLE = ['#fff3d2', '#e8cf9a', '#b5915c', '#5a4028'];
  const CORAIL = ['#ffd2cc', '#ef7574', '#b83a44', '#5a1820'];
  const EAU = P.eau;
  const r1 = v => Math.round(v * 10) / 10;
  const placeS = (svg, x, y, r, sx, sy, o = '') => `<g transform="translate(${x} ${y}) rotate(${r}) scale(${sx} ${sy})" ${o}>${svg}</g>`;

  const deux = (pts, cut, c1, c2, w = 3) => poly(pts, c2) + poly(cut, c1) + encre(pts, w);
  const trait = (d, c, w, iw = w + 4.4, o = '') => `<path d="${d}" fill="none" stroke="${INK}" stroke-width="${iw}" stroke-linecap="round" stroke-linejoin="round" ${o}/><path d="${d}" fill="none" stroke="${c}" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round" ${o}/>`;
  const bez = (a, b, c, d, n = 16) => Array.from({ length: n + 1 }, (_, i) => {
    const t = i / n, u = 1 - t;
    return [0, 1].map(j => r1(u * u * u * a[j] + 3 * u * u * t * b[j] + 3 * u * t * t * c[j] + t * t * t * d[j]));
  });
  function tube(pts, w0, w1, cA, cB, enc = 3, cut = true) {
    const L = [], R = [];
    pts.forEach((p, i) => {
      const q = pts[Math.min(i + 1, pts.length - 1)], o = pts[Math.max(i - 1, 0)];
      const dx = q[0] - o[0], dy = q[1] - o[1], l = Math.hypot(dx, dy) || 1, nx = -dy / l, ny = dx / l;
      const w = (w0 + (w1 - w0) * i / (pts.length - 1)) / 2;
      L.push([r1(p[0] + nx * w), r1(p[1] + ny * w)]); R.push([r1(p[0] - nx * w), r1(p[1] - ny * w)]);
    });
    const tout = L.concat(R.slice().reverse());
    return poly(tout, cB) + (cut ? poly(L.concat(pts.slice().reverse()), cA) : '') + encre(tout, enc);
  }
  const arc = (cx, cy, r, a0, a1) => `M${r1(cx + Math.cos(a0) * r)} ${r1(cy + Math.sin(a0) * r)} A${r} ${r} 0 ${Math.abs(a1 - a0) > Math.PI ? 1 : 0} ${a1 > a0 ? 1 : 0} ${r1(cx + Math.cos(a1) * r)} ${r1(cy + Math.sin(a1) * r)}`;

  function pavois(o = {}) {
    const R = 57, c = [6, 2], lueur = o.lueur || CRIST;
    const A = [-112, -58, -8, 40, 92, 140, 186, 236].map(d => d * Math.PI / 180);
    const cols = ['#8fd0da', '#5fb3c4', '#4a90a8', '#2a7f8f', '#1d6f7c', '#3a7a96', '#7fb8cf', '#a9dce4'];
    const plaques = A.map((a, i) => {
      const b = A[(i + 1) % A.length] + (i === A.length - 1 ? Math.PI * 2 : 0);
      return `<path d="M${c[0]} ${c[1]} L${r1(Math.cos(a) * R)} ${r1(Math.sin(a) * R)} A${R} ${R} 0 0 1 ${r1(Math.cos(b) * R)} ${r1(Math.sin(b) * R)} Z" fill="${cols[i]}" stroke="${INK}" stroke-width="1.4" stroke-opacity=".55"/>`;
    }).join('');
    const rivets = Array.from({ length: 8 }, (_, k) => {
      const a = (k + .5) / 8 * Math.PI * 2, x = r1(Math.cos(a) * 48), y = r1(Math.sin(a) * 48);
      return place(poly([[0, -3.4], [3.4, 0], [0, 3.4], [-3.4, 0]], OR_S) + poly([[0, -3.4], [-3.4, 0], [0, 0], [3.4, 0]], OR_V) + encre([[0, -3.4], [3.4, 0], [0, 3.4], [-3.4, 0]], 1.2), x, y);
    }).join('');
    const crete = 'M-55 16 C-42 12 -32 -4 -14 -15 C4 -26 28 -22 31 -5 C34 11 15 17 8 7 C3 0 9 -7 15 -2';
    const queue = 'M-2 20 C16 27 38 22 56 8';
    return `<circle r="62" fill="${INK}"/>` + plaques
      + `<path d="${crete}" transform="translate(1 7)" fill="none" stroke="${INK}" stroke-width="7" stroke-linecap="round"/><path d="${crete}" transform="translate(1 7)" fill="none" stroke="${lueur}" stroke-width="3.6" stroke-linecap="round"/>`
      + `<path d="${queue}" transform="translate(0 6)" fill="none" stroke="${INK}" stroke-width="7" stroke-linecap="round"/><path d="${queue}" transform="translate(0 6)" fill="none" stroke="${lueur}" stroke-width="3.6" stroke-linecap="round"/>`
      + [crete, queue].map(d => `<path d="${d}" fill="none" stroke="${INK}" stroke-width="12.5" stroke-linecap="round"/><path d="${d}" fill="none" stroke="${OR_S}" stroke-width="8" stroke-linecap="round"/><path d="${d}" transform="translate(-1 -1.4)" fill="none" stroke="${OR_C}" stroke-width="4.4" stroke-linecap="round"/><path d="${d}" transform="translate(-1.6 -2.4)" fill="none" stroke="${OR_V}" stroke-width="1.2" stroke-linecap="round"/>`).join('')
      + rivets
      + `<circle r="${R + 1}" fill="none" stroke="${OR_S}" stroke-width="8"/>`
      + `<path d="${arc(0, 0, R + 1, Math.PI * .62, Math.PI * 1.62)}" fill="none" stroke="${OR_C}" stroke-width="8"/>`
      + `<path d="${arc(0, 0, R + 2, Math.PI * .95, Math.PI * 1.4)}" fill="none" stroke="${OR_V}" stroke-width="2.2"/>`
      + `<circle r="${R - 3.4}" fill="none" stroke="${INK}" stroke-width="1.6"/><circle r="61" fill="none" stroke="${INK}" stroke-width="3.4"/>`;
  }
  const PAV = (x, y, s, r = 0, o) => place(pavois(o), x, y, r, s);

  function harpon(o = {}) {
    const fente = o.lueur || CRIST;
    const OS_C = '#f4ecd8', OS_S = '#b4ab98', LIG = '#3d4a7a', LIG_C = '#6474aa';
    const hampe = [[-4.6, 0], [4.6, 0], [4.2, 128], [0, 140], [-4.2, 128]];
    const bague = y => deux([[-6.4, y - 4], [6.4, y - 4], [6.4, y + 4], [-6.4, y + 4]], [[-6.4, y - 4], [0, y - 4], [0, y + 4], [-6.4, y + 4]], OR_C, OR_S, 2);
    const liga = (y0, y1) => poly([[-4.6, y0], [4.6, y0], [4.6, y1], [-4.6, y1]], LIG)
      + Array.from({ length: Math.floor((y1 - y0) / 6) }, (_, k) => `<path d="M-4.6 ${y0 + 4 + k * 6} L4.6 ${y0 + k * 6}" stroke="${LIG_C}" stroke-width="2"/>`).join('')
      + encre([[-4.6, y0], [4.6, y0], [4.6, y1], [-4.6, y1]], 1.6);
    const tete = [[0, -78], [7, -50], [5, -44], [21, -30], [9, -31], [5, -18], [-5, -18], [-9, -31], [-21, -30], [-5, -44], [-7, -50]];
    return poly(hampe, OS_S) + poly([[-4.6, 0], [0, 0], [0, 140], [-4.2, 128]], OS_C) + encre(hampe, 2.6)
      + liga(14, 34) + liga(84, 104)
      + bague(4) + bague(40) + bague(78) + bague(110)
      + poly(tete, MET_S) + poly([[0, -78], [-7, -50], [-5, -44], [-21, -30], [-9, -31], [-5, -18], [0, -18]], MET_C)
      + poly([[0, -60], [4, -42], [3, -22], [0, -18], [-3, -22], [-4, -42]], OR_S) + poly([[0, -60], [-4, -42], [-3, -22], [0, -18]], OR_C)
      + `<path d="M0 -54 L0 -24" stroke="${fente}" stroke-width="1.6"/>`
      + encre(tete, 2.6)
      + deux([[-5.6, -18], [5.6, -18], [6.4, -4], [-6.4, -4]], [[-5.6, -18], [0, -18], [0, -4], [-6.4, -4]], OR_C, OR_S, 2.2);
  }
  const HAR = (x, y, s, r = 0, o) => place(harpon(o), x, y, r, s);

  const vague = (x, y, s, c, r = 0, sx = 1) => placeS(
    poly([[-50, 26], [-44, 6], [-30, -12], [-8, -27], [16, -32], [36, -25], [47, -10], [44, 2], [35, 4], [30, -6], [20, -12], [9, -9], [3, 2], [9, 15], [20, 26]], c[2])
    + poly([[-50, 26], [-44, 6], [-30, -12], [-8, -27], [16, -32], [9, -9], [3, 2], [-6, 26]], c[1])
    + poly([[-8, -27], [16, -32], [36, -25], [47, -10], [44, 2], [36, -8], [24, -17], [6, -19]], c[0])
    + poly([[9, -9], [3, 2], [9, 15], [20, 26], [26, 12], [20, 2]], c[3], 'opacity=".45"')
    + `<path d="M-40 14 L-26 -2 M-26 18 L-14 4" stroke="${c[0]}" stroke-width="2.4" stroke-linecap="round"/>`
    + encre([[-50, 26], [-44, 6], [-30, -12], [-8, -27], [16, -32], [36, -25], [47, -10], [44, 2], [35, 4], [30, -6], [20, -12], [9, -9], [3, 2], [9, 15], [20, 26]], 3), x, y, r, s * sx, s);
  const goutte = (x, y, s, c, r = 0) => place(deux([[0, -16], [10, 2], [8, 12], [0, 16], [-8, 12], [-10, 2]], [[0, -16], [0, 16], [-8, 12], [-10, 2]], c[1], c[2], 2.4) + poly([[-4, 0], [-1, -8], [-1, 4]], c[0]), x, y, r, s);
  const bulle = (x, y, s, c) => place(deux([[-6, -9], [6, -9], [10, 0], [6, 9], [-6, 9], [-10, 0]], [[-6, -9], [6, -9], [0, 0], [-6, 9], [-10, 0]], c[0], c[1], 2.2), x, y, 0, s);
  const ecume = (x, y, s, c) => bulle(x - 8, y + 2, .9 * s, c) + bulle(x + 6, y - 4, 1.1 * s, c) + bulle(x + 8, y + 8, .7 * s, c);
  const chevrons = (x, y, s, c, r = 0) => place([0, 18].map(dx => `<path d="M${dx - 10} -16 L${dx + 6} 0 L${dx - 10} 16" fill="none" stroke="${INK}" stroke-width="10" stroke-linejoin="miter" stroke-linecap="square"/><path d="M${dx - 10} -16 L${dx + 6} 0 L${dx - 10} 16" fill="none" stroke="${c}" stroke-width="5.4" stroke-linejoin="miter" stroke-linecap="square"/>`).join(''), x, y, r, s);
  const impact = (x, y, s, c) => place(deux([[0, -20], [6, -6], [20, 0], [6, 6], [0, 20], [-6, 6], [-20, 0], [-6, -6]], [[0, -20], [6, -6], [0, 0], [-6, 6], [-20, 0], [-6, -6]], c[0], c[2], 2.6), x, y, 0, s);
  const plus = (x, y, s, c = '#fff3d2') => place(`<path d="M0 -12 L0 12 M-12 0 L12 0" stroke="${INK}" stroke-width="10" stroke-linecap="round"/><path d="M0 -12 L0 12 M-12 0 L12 0" stroke="${c}" stroke-width="5" stroke-linecap="round"/>`, x, y, 0, s);
  const trajet = (d, c) => `<path d="${d}" fill="none" stroke="${INK}" stroke-width="7" stroke-dasharray="10 9" stroke-linecap="round"/><path d="${d}" fill="none" stroke="${c}" stroke-width="3.4" stroke-dasharray="10 9" stroke-linecap="round"/>`;
  const fleche = (d, c, w = 6) => trait(d, c, w, w + 5);
  const pointe = (x, y, r, c, s = 1) => place(deux([[0, -11], [14, 0], [0, 11], [3, 0]], [[0, -11], [14, 0], [3, 0]], OR_V, c, 2.4), x, y, r, s);
  const pion = (x, y, s, c1 = '#f4ead6', c2 = '#a8937d') => place(
    deux([[-20, 34], [-18, 8], [-8, 0], [8, 0], [18, 8], [20, 34]], [[-20, 34], [-18, 8], [-8, 0], [0, 0], [0, 34]], c1, c2, 3)
    + deux([[0, -26], [10, -20], [12, -8], [5, -2], [-5, -2], [-12, -8], [-10, -20]], [[0, -26], [0, -2], [-5, -2], [-12, -8], [-10, -20]], c1, c2, 3), x, y, 0, s);
  const galet = (x, y, s, r = 0) => place(
    deux([[-34, -4], [-24, -20], [0, -26], [26, -20], [36, -4], [30, 14], [6, 22], [-22, 18]], [[-34, -4], [-24, -20], [0, -26], [26, -20], [4, -6], [-22, 18]], '#ece4d4', '#8f8577', 3.2)
    + poly([[-24, -20], [0, -26], [26, -20], [4, -14]], '#ffffff', 'opacity=".6"')
    + `<path d="M-30 6 Q0 -6 32 6" fill="none" stroke="#fff8ea" stroke-width="5"/><path d="M-30 6 Q0 -6 32 6" fill="none" stroke="${INK}" stroke-width="1.2" opacity=".35"/>`, x, y, r, s);
  const tete = (x, y, s, r = 0, pierre = CRIST, ouverte = true) => {
    const U = [[-32, -2], [-28, -18], [-14, -28], [4, -28], [16, -22], [32, -18], [50, -14], [60, -8], [60, -1], [52, 3], [32, 3], [14, 5], [-6, 10], [-24, 10]];
    const M = ouverte ? [[-20, 14], [-6, 9], [12, 6], [30, 6], [44, 18], [52, 26], [48, 31], [40, 31], [20, 28], [-2, 24], [-16, 22]]
      : [[-20, 14], [-6, 9], [14, 6], [34, 5], [54, 4], [50, 11], [28, 14], [4, 18], [-14, 20]];
    const dents = ouverte ? [[24, 3, 1], [35, 3, 1], [45, 3, 1], [26, 10, -1], [37, 15.6, -1]] : [[28, 4, 1], [40, 4, 1]];
    return place(
      deux([[-16, -20], [-56, -30], [-40, -14], [-28, -4]], [[-16, -20], [-56, -30], [-28, -13]], OR_C, OR_S, 2.6)
      + (ouverte ? poly([[-8, 9], [12, 4], [52, 3], [46, 20], [30, 8], [10, 8]], '#5a1820') : '')
      + deux(M, M.slice(0, 5).concat([[20, 16], [-8, 18]]), TEAL, TEAL_S, 2.8)
      + dents.map(([a, b, d]) => poly([[a - 3.2, b], [a, b + 8 * d], [a + 3.2, b]], '#ffffff') + encre([[a - 3.2, b], [a, b + 8 * d], [a + 3.2, b]], 1.2)).join('')
      + deux(U, [[-32, -2], [-28, -18], [-14, -28], [4, -28], [16, -22], [32, -18], [50, -14], [60, -8], [24, -8], [0, -4], [-22, 2]], TEAL_C, TEAL, 3)
      + poly([[-6, -14], [6, -24], [24, -18], [8, -19]], TEAL_S)
      + deux([[-4, -12], [8, -19], [22, -13], [8, -5]], [[-4, -12], [8, -19], [22, -13]], '#fff3c0', OR_C, 2)
      + poly([[9, -18], [11, -12], [9, -6], [7, -12]], INK)
      + `<path d="M50 -10 L54 -7" stroke="${INK}" stroke-width="2.4" stroke-linecap="round"/>`
      + deux([[-6, -27], [-46, -50], [-34, -26], [-20, -14]], [[-6, -27], [-46, -50], [-24, -22]], OR_V, OR_S, 2.8)
      + place(deux([[0, -9], [7, 0], [0, 9], [-7, 0]], [[0, -9], [-7, 0], [0, 0], [7, 0]], '#ffffff', pierre, 2.2), 30, -22, 0, 1.15), x, y, r, s);
  };
  const cou = (pts, w0, w1) => tube(pts, w0, w1, TEAL_C, TEAL, 3.2) + pts.slice(2, -2).filter((_, i) => i % 3 === 0).map(([a, b]) => `<circle cx="${a}" cy="${b}" r="2.4" fill="${OR_C}" stroke="${INK}" stroke-width="1.2"/>`).join('');
  const ecaille = (x, y, s, c1, c2) => place(deux([[-10, -8], [10, -8], [10, 2], [0, 12], [-10, 2]], [[-10, -8], [0, -8], [0, 12], [-10, 2]], c1, c2, 2), x, y, 0, s);
  const ECU = [[-40, -42], [40, -42], [40, 6], [0, 48], [-40, 6]];
  const ronds = (x, y, c, n = 3, rx = 22, ry = 7, dr = 16) => Array.from({ length: n }, (_, k) => `<ellipse cx="${x}" cy="${y}" rx="${rx + k * dr}" ry="${ry + k * dr * .32}" fill="none" stroke="${INK}" stroke-width="7"/><ellipse cx="${x}" cy="${y}" rx="${rx + k * dr}" ry="${ry + k * dr * .32}" fill="none" stroke="${c}" stroke-width="3.4"/>`).reverse().join('');
  const dalle = (x, y, s, c1 = '#efe2c8', c2 = '#8f7a66') => place(deux([[-50, 0], [0, -20], [50, 0], [0, 20]], [[-50, 0], [0, -20], [50, 0], [0, 4]], c1, c2, 3) + poly([[-50, 0], [0, 20], [50, 0], [50, 8], [0, 28], [-50, 8]], '#5a4a40') + encre([[-50, 0], [0, 20], [50, 0], [50, 8], [0, 28], [-50, 8]], 2.6), x, y, 0, s);
  const ancre = (x, y, s, r, c, corail = false) => {
    const bras = corail
      ? tube(bez([0, 40], [-14, 48], [-34, 36], [-40, 12], 10), 11, 6, c[1], c[2], 2.6) + tube(bez([0, 40], [14, 48], [34, 36], [40, 12], 10), 11, 6, c[1], c[2], 2.6)
        + tube(bez([-22, 42], [-30, 50], [-40, 52], [-46, 46], 6), 6, 3, c[1], c[2], 2) + tube(bez([24, 41], [30, 50], [40, 54], [48, 48], 6), 6, 3, c[1], c[2], 2)
        + tube(bez([-6, 0], [-14, -2], [-20, -8], [-22, -16], 6), 6, 3, c[1], c[2], 2)
      : tube(bez([0, 40], [-14, 48], [-34, 36], [-40, 12], 10), 11, 7, c[1], c[2], 2.8) + tube(bez([0, 40], [14, 48], [34, 36], [40, 12], 10), 11, 7, c[1], c[2], 2.8);
    return place(
      `<circle cx="0" cy="-52" r="9" fill="none" stroke="${INK}" stroke-width="10"/><circle cx="0" cy="-52" r="9" fill="none" stroke="${corail ? c[1] : OR_C}" stroke-width="5"/>`
      + deux([[-6, -44], [6, -44], [5, 42], [-5, 42]], [[-6, -44], [0, -44], [0, 42], [-5, 42]], c[1], c[2], 3)
      + bras
      + deux([[-40, 2], [-49, 22], [-34, 17]], [[-40, 2], [-49, 22], [-40, 15]], c[0], c[2], 2.4) + deux([[40, 2], [49, 22], [34, 17]], [[40, 2], [34, 17], [40, 15]], c[0], c[2], 2.4)
      + deux([[-28, -40], [28, -40], [30, -34], [-30, -34]], [[-28, -40], [28, -40], [0, -37], [-30, -34]], corail ? c[0] : OR_C, corail ? c[2] : OR_S, 2.6)
      + deux([[0, 38], [7, 46], [0, 54], [-7, 46]], [[0, 38], [-7, 46], [0, 46]], c[0], c[2], 2.2), x, y, r, s);
  };
  const gouffre = (x, y, s, c, hole) => place(
    `<path d="M0 -64 L46 -46 L64 0 L46 46 L0 64 L-46 46 L-64 0 L-46 -46 Z" fill="${c[3]}" stroke="${INK}" stroke-width="3"/>`
    + [0, 1, 2].map(k => {
      const pts = Array.from({ length: 22 }, (_, i) => { const t = i / 21, rr = 62 - t * 56, a = k * Math.PI * 2 / 3 + t * Math.PI * 1.7; return [r1(Math.cos(a) * rr), r1(Math.sin(a) * rr)]; });
      return tube(pts, 26, 3, c[1], c[2], 2.6);
    }).join('')
    + poly([[0, -9], [8, -4], [8, 5], [0, 9], [-8, 5], [-8, -4]], hole || c[3]) + encre([[0, -9], [8, -4], [8, 5], [0, 9], [-8, 5], [-8, -4]], 2), x, y, 0, s);
  const queue = (c1, c2, nag1, nag2, epines) => {
    const pts = bez([40, 168], [58, 112], [102, 84], [134, 76], 18);
    return tube(pts, 34, 8, c1, c2, 3.2)
      + (epines ? pts.slice(3, 15).filter((_, i) => i % 3 === 0).map(([a, b], i) => place(deux([[-6, 0], [0, -16], [6, 0]], [[-6, 0], [0, -16], [0, 0]], PIERRE[0], PIERRE[2], 2), a - 4, b - 10 + i * 1.5, -30 + i * 14, 1.1 - i * .12)).join('')
        : pts.slice(2, 15).filter((_, i) => i % 3 === 0).map(([a, b]) => `<circle cx="${a}" cy="${b}" r="2.6" fill="${OR_C}" stroke="${INK}" stroke-width="1.2"/>`).join(''))
      + place(deux([[0, 0], [-2, -32], [12, -12], [38, -18], [18, 6]], [[0, 0], [-2, -32], [12, -12], [6, -2]], nag1, nag2, 3), 132, 78, 0, 1.25);
  };
  const phare = (x, y, s, p) => place(
    deux([[-16, 10], [16, 10], [22, 70], [-22, 70]], [[-16, 10], [0, 10], [0, 70], [-22, 70]], '#f4ead6', '#a8937d', 3)
    + poly([[-18.6, 28], [18.6, 28], [19.8, 40], [-19.8, 40]], '#b8352b') + poly([[-21, 52], [21, 52], [22, 64], [-22, 64]], '#b8352b')
    + encre([[-16, 10], [16, 10], [22, 70], [-22, 70]], 3)
    + deux([[-24, 4], [24, 4], [24, 12], [-24, 12]], [[-24, 4], [0, 4], [0, 12], [-24, 12]], OR_C, OR_S, 2.4)
    + poly([[-14, -26], [14, -26], [14, 4], [-14, 4]], '#1b2238') + flamme(0, -10, .5, p)
    + `<path d="M-14 -26 L-14 4 M0 -26 L0 4 M14 -26 L14 4" stroke="${OR_C}" stroke-width="2.4"/>` + encre([[-14, -26], [14, -26], [14, 4], [-14, 4]], 2.6)
    + deux([[-20, -26], [0, -46], [20, -26]], [[-20, -26], [0, -46], [0, -26]], OR_C, OR_S, 2.6), x, y, 0, s);
  const voile = (x, y, s, p) => place(
    trait('M-30 -56 L-30 56', '#7a5236', 5, 9)
    + deux([[-26, -50], [10, -40], [30, -10], [24, 26], [-26, 36]], [[-26, -50], [10, -40], [30, -10], [-6, -6], [-26, 36]], '#fbf4e4', '#b8c4d6', 3)
    + `<path d="M-26 -14 Q4 -16 28 -10 M-26 12 Q4 10 26 10" stroke="${INK}" stroke-width="1.6" fill="none" opacity=".45"/>`
    + deux([[-30, -56], [-6, -62], [-30, -66]], [[-30, -56], [-6, -62], [-30, -62]], p[1], p[2], 2), x, y, 0, s);
  const oeil = (x, y, s, iris = OR_C) => place(
    deux([[-56, 0], [-28, -22], [0, -28], [28, -22], [56, 0], [28, 22], [0, 28], [-28, 22]], [[-56, 0], [-28, -22], [0, -28], [28, -22], [56, 0], [0, 0]], TEAL, TEAL_S, 3.4)
    + deux([[-40, 0], [-20, -14], [0, -18], [20, -14], [40, 0], [20, 14], [0, 18], [-20, 14]], [[-40, 0], [-20, -14], [0, -18], [20, -14], [40, 0]], '#fff3c0', iris, 2.6)
    + deux([[0, -17], [5, -6], [5, 6], [0, 17], [-5, 6], [-5, -6]], [[0, -17], [0, 17], [-5, 6], [-5, -6]], '#2b2238', INK, 1.6)
    + poly([[-14, -10], [-8, -12], [-10, -6]], '#ffffff'), x, y, 0, s);
  const coupe = (x, y, s, c) => place(
    deux([[-34, -20], [34, -20], [26, 6], [10, 16], [-10, 16], [-26, 6]], [[-34, -20], [0, -20], [0, 16], [-10, 16], [-26, 6]], OR_C, OR_S, 3)
    + poly([[-30, -18], [30, -18], [26, -10], [-26, -10]], c[1]) + poly([[-30, -18], [0, -18], [0, -10], [-26, -10]], c[0]) + encre([[-30, -18], [30, -18], [26, -10], [-26, -10]], 2)
    + deux([[-5, 16], [5, 16], [6, 36], [-6, 36]], [[-5, 16], [0, 16], [0, 36], [-6, 36]], OR_C, OR_S, 2.4)
    + deux([[-22, 36], [22, 36], [26, 46], [-26, 46]], [[-22, 36], [0, 36], [0, 46], [-26, 46]], OR_C, OR_S, 2.6), x, y, 0, s);
  const coeur = (x, y, s) => place(deux([[0, 34], [-34, 2], [-34, -18], [-18, -30], [0, -18], [18, -30], [34, -18], [34, 2]], [[0, 34], [-34, 2], [-34, -18], [-18, -30], [0, -18]], '#ef7574', '#b83a44', 3.2)
    + poly([[-26, -14], [-18, -24], [-12, -16]], '#ffd2cc'), x, y, 0, s);
  const gemme = (x, y, s, c, fendue = false) => place(
    poly([[0, -30], [22, -18], [26, 6], [0, 30], [-26, 6], [-22, -18]], c[2])
    + poly([[0, -30], [-22, -18], [-26, 6], [-10, 0], [0, -14]], c[1]) + poly([[0, -14], [10, 0], [0, 30], [-10, 0]], c[1])
    + poly([[0, -30], [0, -14], [-10, 0], [-22, -18]], c[0]) + poly([[0, -14], [22, -18], [10, 0]], c[0], 'opacity=".55"')
    + poly([[10, 0], [26, 6], [0, 30]], c[3], 'opacity=".5"')
    + (fendue ? `<path d="M-6 -30 L2 -10 L-6 4 L6 28" fill="none" stroke="${INK}" stroke-width="3.4"/><path d="M-6 -30 L2 -10 L-6 4 L6 28" fill="none" stroke="#ffffff" stroke-width="1.2"/>` : '')
    + encre([[0, -30], [22, -18], [26, 6], [0, 30], [-26, 6], [-22, -18]], 3), x, y, 0, s);
  const brisure = (x, y, s, r, c) => place(deux([[0, -10], [7, -2], [3, 10], [-6, 4]], [[0, -10], [-6, 4], [1, 0]], c[0], c[2], 2), x, y, r, s);
  const corail = (x, y, s, r = 0) => place(
    tube(bez([0, 30], [-2, 10], [4, -6], [0, -30], 10), 12, 5, CORAIL[1], CORAIL[2], 2.6)
    + tube(bez([0, 6], [-10, 0], [-18, -6], [-20, -20], 8), 8, 4, CORAIL[1], CORAIL[2], 2.2)
    + tube(bez([2, -4], [12, -8], [16, -16], [18, -26], 8), 7, 3.6, CORAIL[1], CORAIL[2], 2.2), x, y, r, s);
  const vapeur = (x, y, s) => place(`<path d="M0 0 C-10 -8 8 -16 0 -24 C-8 -32 8 -38 2 -46" fill="none" stroke="${INK}" stroke-width="8" stroke-linecap="round"/><path d="M0 0 C-10 -8 8 -16 0 -24 C-8 -32 8 -38 2 -46" fill="none" stroke="#e6eef8" stroke-width="4" stroke-linecap="round"/>`, x, y, 0, s);
  const sol = (c = PIERRE) => deux([[22, 152], [178, 152], [170, 176], [30, 176]], [[22, 152], [178, 152], [174, 160], [26, 160]], c[1], c[2], 3);

  Object.assign(IconesV3.SUJETS, {
    ressac: p => vague(66, 146, 1.05, p, 0) + impact(150, 56, .9, p) + HAR(112, 94, .74, 45, { lueur: p[1] }) + goutte(152, 106, .6, p) + goutte(120, 38, .5, p),
    coup_de_houle: p => sol() + `<path d="M100 152 L84 164 L90 176 M100 152 L120 166 M100 152 L70 156" fill="none" stroke="${INK}" stroke-width="3" stroke-linejoin="round"/>`
      + impact(100, 150, 1.75, P.neutre) + roc(40, 132, .9, 20) + roc(162, 128, .85, -30) + roc(54, 104, .55, 60) + roc(150, 98, .5, -10)
      + croissant(100, 118, 74, -2.75, -.4, p[1], p[0], 1.24)
      + PAV(100, 92, .72, -14, { lueur: p[1] }),

    ecume_cinglante: p => vague(58, 142, .62, EAU, -30)
      + [[78, 116, .7], [104, 96, .85], [134, 70, 1], [92, 76, .6], [120, 52, .75], [116, 124, .6], [148, 102, .75]].map(([x, y, s], i) => i % 3 === 1 ? ecume(x, y, s * .9, p) : goutte(x, y, s, [p[0], p[1], p[2]], 50)).join('')
      + eclat(160, 54, .8, p[0]),
    embruns_brulants: p => place(roc(0, 0, 2.2, 0, '#9a7a62', '#5a4038') + `<path d="M-10 -3 L-2 3 L7 -4" stroke="#ff7a2b" stroke-width="2.6" fill="none"/>`, 58, 142, -8, 1)
      + [[78, 116, .7], [104, 96, .85], [134, 70, 1], [92, 76, .6], [120, 52, .75], [116, 124, .6], [148, 102, .75]].map(([x, y, s], i) => i % 3 === 1 ? flamme(x, y, s * .5, p) : goutte(x, y, s, [p[0], p[1], p[2]], 50) + place(poly([[0, -8], [4, 0], [0, 4], [-4, 0]], p[0]), x + 7, y - 9, 50, s)).join('')
      + eclat(160, 54, .8, p[1]),
    galet_roule: p => [0, 1, 2].map(k => `<path d="${arc(84, 100, 46 + k * 12, Math.PI * .7, Math.PI * 1.25)}" fill="none" stroke="${INK}" stroke-width="7" stroke-linecap="round"/><path d="${arc(84, 100, 46 + k * 12, Math.PI * .7, Math.PI * 1.25)}" fill="none" stroke="${p[1]}" stroke-width="3.4" stroke-linecap="round"/>`).join('')
      + galet(96, 100, 1.45, -16) + chevrons(158, 104, .7, p[1]) + roc(150, 150, .6, 20) + roc(128, 160, .45, -10),
    galet_d_ecume: p => [[150, 80, -30], [160, 104, 0], [150, 128, 30], [138, 62, -50], [138, 146, 50]].map(([x, y, r]) => goutte(x, y, .8, p, r + 90)).join('')
      + galet(86, 104, 1.45, -16) + ecume(132, 104, 1.3, [p[0], p[1]]) + eclat(64, 54, .7, p[1]),

    braise_de_phare: p => trajet('M82 70 Q120 18 150 70', p[1]) + phare(66, 104, .95, p) + flamme(152, 92, .7, p) + eclat(152, 120, .7, p[0]) + eclat(118, 140, .5, p[1]),
    vent_du_large: p => trajet('M82 70 Q120 18 150 70', p[1]) + voile(70, 112, .95, p) + impact(150, 92, .9, p) + vague(132, 150, .6, EAU),

    bouclier_d_ecume: p => place(deux(ECU, [[-40, -42], [0, -42], [0, 48], [-40, 6]], EAU[1], EAU[2], 3.4)
      + `<path d="M-30 -14 Q-10 -30 8 -14 Q20 -4 30 -16" fill="none" stroke="${EAU[0]}" stroke-width="5" stroke-linecap="round"/><path d="M-26 14 Q-6 0 12 14" fill="none" stroke="${EAU[0]}" stroke-width="4" stroke-linecap="round"/>`
      + [[-40, -42, 1.1], [40, -42, 1.1], [0, 48, 1], [-40, 6, .8], [40, 6, .8], [-14, -44, .7], [16, -44, .6], [22, 28, .6], [-22, 28, .6]].map(([a, b, k]) => bulle(a, b, k, ['#ffffff', EAU[1]])).join(''), 100, 98, 0, 1.2)
      + goutte(100, 96, .9, EAU),
    carapace_de_vouivre: p => place(deux(ECU, [[-40, -42], [0, -42], [0, 48], [-40, 6]], TEAL, TEAL_S, 3.4)
      + [[-26, -30], [-6, -30], [14, -30], [32, -30], [-16, -14], [4, -14], [24, -14], [-26, 2], [-6, 2], [14, 2], [32, 2], [-14, 18], [6, 18], [24, 16], [-4, 32], [10, 32]].map(([a, b], i) => ecaille(a, b, 1, i % 4 === 0 ? '#e6fbff' : TEAL_C, i % 3 ? TEAL : TEAL_S)).join('')
      + `<path d="M-35 -37 L35 -37 L35 4 L0 41 L-35 4 Z" fill="none" stroke="${OR_C}" stroke-width="3"/>` + encre(ECU, 3.4), 100, 98, 0, 1.2)
      + eclat(150, 44, .7, p[0]),

    reflux: p => fleche('M150 132 C176 76 132 34 86 46', p[0], 7) + pointe(84, 48, 196, p[2], 1.3)
      + vague(92, 128, 1.3, p) + `<path d="M40 154 L164 154" stroke="${INK}" stroke-width="5"/><path d="M40 154 L164 154" stroke="${p[1]}" stroke-width="2"/>`,
    grand_reflux: p => fleche('M54 132 C24 76 68 34 114 46', p[0], 7) + pointe(116, 48, -16, p[2], 1.3)
      + deux([[22, 160], [70, 146], [130, 150], [178, 160], [178, 176], [22, 176]], [[22, 160], [70, 146], [130, 150], [178, 160]], SABLE[1], SABLE[2], 3)
      + vague(110, 126, 1.3, p, 0, -1) + roc(52, 152, .6, 0) + roc(150, 156, .5, 30),

    appel_de_la_vouivre: p => vague(146, 158, .85, EAU) + cou(bez([138, 172], [152, 136], [124, 108], [142, 78], 14), 30, 22)
      + placeS(tete(0, 0, .98, 0, CRIST), 124, 64, 0, -1, 1)
      + [16, 30].map(rr => trait(arc(70, 64, rr, Math.PI * .78, Math.PI * 1.22), p[0], 3.4, 7.6)).join('')
      + chevrons(58, 126, .85, p[1]),
    chaine_de_maree: p => [[56, 104, 0], [80, 104, 90], [104, 104, 0], [128, 104, 90], [150, 104, 0]].map(([x, y, r]) => place(`<ellipse rx="14" ry="8" fill="none" stroke="${INK}" stroke-width="10"/><ellipse rx="14" ry="8" fill="none" stroke="${EAU[1]}" stroke-width="5"/><path d="M-10 -5 Q0 -9 10 -5" fill="none" stroke="${EAU[0]}" stroke-width="2"/>`, x, y, r)).join('')
      + tube(bez([158, 104], [176, 106], [178, 136], [160, 140], 10), 8, 6, MET_C, MET_S, 2.6) + deux([[160, 134], [150, 150], [158, 142], [166, 144]], [[160, 134], [150, 150], [158, 142]], MET_C, MET_O, 2.2)
      + chevrons(78, 62, .7, p[1], 180) + chevrons(78, 146, .7, p[1], 180) + goutte(40, 70, .5, EAU) + goutte(124, 150, .5, EAU),

    rempart_des_flots: p => {
      const pic = (a, h, fond) => { const x = 100 + Math.cos(a) * 60, y = 128 + Math.sin(a) * 18; return place(deux([[-12, 0], [-6, -h * .6], [2, -h], [10, -h * .5], [12, 0]], [[-12, 0], [-6, -h * .6], [2, -h], [0, 0]], fond ? EAU[2] : EAU[0], fond ? EAU[3] : EAU[1], 2.6), x, y); };
      const A = Array.from({ length: 12 }, (_, k) => k / 12 * Math.PI * 2);
      return A.filter(a => Math.sin(a) < 0).map(a => pic(a, 46, true)).join('') + PAV(100, 96, .5, 0) + A.filter(a => Math.sin(a) >= 0).map(a => pic(a, 40 + Math.cos(a * 2) * 6, false)).join('');
    },
    muraille_d_eau: p => dalle(100, 152, 1.3) + place(deux([[-44, 20], [-44, -28], [-30, -48], [-6, -58], [20, -52], [40, -36], [44, -20], [44, 30], [0, 44]], [[-44, 20], [-44, -28], [-30, -48], [-6, -58], [0, -20], [0, 44]], EAU[1], EAU[2], 3.4)
      + poly([[-30, -48], [-6, -58], [20, -52], [40, -36], [44, -20], [30, -30], [6, -40], [-14, -38]], EAU[0]) + encre([[-30, -48], [-6, -58], [20, -52], [40, -36], [44, -20], [30, -30], [6, -40], [-14, -38]], 2)
      + `<path d="M0 -20 L0 44 M-44 -2 L0 12 L44 -2 M-22 -24 L-22 26 M22 -24 L22 26" stroke="${INK}" stroke-width="1.8" opacity=".5" fill="none"/>`
      + croix(-22, 2, .8) + croix(22, 2, .8), 100, 112, 0, 1.15) + eclat(160, 48, .7, '#ffffff', EAU[1]),

    houle_montante: p => sol() + deux([[46, 152], [70, 112], [100, 92], [130, 112], [154, 152]], [[46, 152], [70, 112], [100, 92], [104, 152]], PIERRE[0], PIERRE[2], 3.4)
      + `<path d="M100 96 L94 116 L106 130 L98 150 M74 118 L84 134 M128 116 L118 136" fill="none" stroke="${INK}" stroke-width="3"/>`
      + roc(72, 70, .8, 20) + roc(128, 64, .9, -20) + roc(100, 50, .6, 40) + chevrons(44, 96, .8, p[1], 180) + chevrons(156, 96, .8, p[1]),
    tempete_de_ressac: p => Array.from({ length: 8 }, (_, k) => { const a = k / 8 * Math.PI * 2 + .2; return goutte(100 + Math.cos(a) * 40, 102 + Math.sin(a) * 40, .75, p, a * 180 / Math.PI - 90) + flamme(100 + Math.cos(a) * 40 + Math.cos(a + 1.57) * 9, 102 + Math.sin(a) * 40 + Math.sin(a + 1.57) * 9 - 6, .22, p); }).join('')
      + [0, 1, 2].map(k => `<path d="${arc(100, 102, 22, k * 2.1, k * 2.1 + 1.4)}" fill="none" stroke="${INK}" stroke-width="8" stroke-linecap="round"/><path d="${arc(100, 102, 22, k * 2.1, k * 2.1 + 1.4)}" fill="none" stroke="${p[1]}" stroke-width="4" stroke-linecap="round"/>`).join('')
      + chevrons(36, 102, .7, p[1], 180) + chevrons(164, 102, .7, p[1]),

    prendre_les_coups: p => pion(136, 98, 1.1) + fleche('M60 54 Q100 22 140 50', p[1], 6) + pointe(140, 50, 40, p[2], 1)
      + fleche('M140 152 Q100 180 64 156', p[1], 6) + pointe(62, 154, 210, p[2], 1) + PAV(80, 104, .62, 0),
    garde_de_morrha: p => {
      const pts = Array.from({ length: 26 }, (_, i) => { const a = -Math.PI * .62 + i / 25 * Math.PI * 1.85; return [r1(100 + Math.cos(a) * 54), r1(106 + Math.sin(a) * 50)]; });
      return pion(80, 104, .7) + pion(120, 104, .7) + pion(100, 120, .75)
        + tube(pts, 8, 24, TEAL_C, TEAL, 3.2) + pts.slice(3, 24).filter((_, i) => i % 3 === 0).map(([a, b]) => `<circle cx="${a}" cy="${b}" r="2.6" fill="${OR_C}" stroke="${INK}" stroke-width="1.2"/>`).join('')
        + tete(70, 52, .62, -30, CRIST, false);
    },

    lame_de_fond: p => deux([[68, 178], [82, 128], [76, 100], [124, 100], [118, 128], [132, 178]], [[68, 178], [82, 128], [76, 100], [100, 100], [100, 178]], p[1], p[2], 3.2)
      + `<path d="M88 170 L92 128 M108 170 L106 132" stroke="${p[0]}" stroke-width="3" stroke-linecap="round"/>`
      + goutte(56, 104, .7, p, -40) + goutte(146, 102, .7, p, 40) + goutte(60, 136, .5, p, -60) + goutte(142, 136, .5, p, 60)
      + place(dalle(0, 0, 1.2), 100, 76, -8, 1) + `<path d="M84 70 L96 82 L90 92 M110 64 L112 78" stroke="${INK}" stroke-width="3" fill="none"/>` + eclat(154, 44, .6, p[0]),
    courant_de_braise: p => place(tube(bez([20, 150], [70, 120], [120, 178], [186, 136], 18), 26, 18, p[1], p[2], 3.2), 0, 0) + flamme(60, 136, .45, p) + flamme(140, 144, .42, p) + flamme(100, 126, .55, p)
      + place(dalle(0, 0, 1.2), 100, 76, -8, 1) + `<path d="M84 70 L96 82 L90 92 M110 64 L112 78" stroke="${INK}" stroke-width="3" fill="none"/>` + eclat(154, 44, .6, p[1]),
    colere_de_morrha: p => cou(bez([100, 180], [100, 142], [68, 126], [78, 90], 14), 42, 28) + tete(96, 76, 1.05, -16, '#ffffff')
      + vague(44, 152, .85, p, 0) + vague(156, 152, .85, p, 0, -1) + goutte(160, 92, .6, p) + goutte(146, 116, .45, p) + eclat(40, 76, .7, p[0]),
    jugement_des_marees: p => sol() + placeS(vague(0, 0, 1, PIERRE), 90, 100, 0, 1.36, 1.86)
      + `<path d="M36 142 L46 122 L44 108" stroke="${INK}" stroke-width="2.6" fill="none"/>`
      + roc(156, 112, .75, 20) + roc(148, 128, .6, -30) + roc(162, 132, .5, 50)
      + impact(150, 152, 1.35, P.neutre) + roc(178, 140, .6, 10) + roc(122, 160, .5, -20) + eclat(36, 62, .7, p[1]),
    coup_de_queue: p => croissant(86, 112, 70, -1.9, .1, p[1], p[0], 1.25) + queue(TEAL_C, TEAL, OR_C, OR_S, false) + chevrons(160, 120, .7, p[1]),
    queue_de_vouivre: p => croissant(86, 112, 70, -1.9, .1, p[1], p[0], 1.25) + queue(PIERRE[0], PIERRE[2], PIERRE[1], PIERRE[3], true) + chevrons(160, 120, .7, p[1]) + roc(150, 150, .7, 20) + roc(46, 70, .6, -30),

    pierre_du_front: p => cou(bez([76, 180], [52, 158], [44, 134], [52, 114], 10), 32, 26) + tete(72, 104, 1.02, -8, p[1], false)
      + poly([[100, 70], [186, 110], [170, 140]], p[1], 'opacity=".9"') + poly([[100, 70], [186, 110], [180, 118]], p[0]) + encre([[100, 70], [186, 110], [170, 140]], 2.6)
      + gemme(100, 72, .62, p) + eclat(174, 124, 1, p[0], '#ffffff') + eclat(150, 50, .6, p[1]),
    eclat_de_la_pierre: p => `<path d="M24 150 L176 150" stroke="${INK}" stroke-width="6"/><path d="M24 150 L176 150" stroke="${p[1]}" stroke-width="2.4"/>`
      + gemme(74, 92, 1.15, p, true) + [[124, 70, 1.2, 20], [146, 96, 1, -30], [124, 112, .9, 60], [160, 62, .8, 10], [168, 120, .7, 80]].map(([x, y, s, r]) => brisure(x, y, s, r, p)).join('')
      + placeS([[124, 70, 1.2, 20], [146, 96, 1, -30]].map(([x, y, s, r]) => brisure(x, 300 - y, s * .7, -r, p)).join(''), 0, -128, 0, 1, 1, 'opacity=".55"'),

    ancrage: p => trait('M100 14 L100 40', MET_S, 4, 9) + [22, 32].map(y => `<ellipse cx="100" cy="${y}" rx="4" ry="6" fill="none" stroke="${INK}" stroke-width="6"/><ellipse cx="100" cy="${y}" rx="4" ry="6" fill="none" stroke="${MET_C}" stroke-width="2.4"/>`).join('')
      + deux([[28, 156], [70, 146], [130, 146], [172, 156], [168, 176], [32, 176]], [[28, 156], [70, 146], [130, 146], [172, 156]], SABLE[1], SABLE[2], 3)
      + ancre(100, 100, 1.05, 0, [MET_C, '#d8dde8', MET_S]) + roc(48, 150, .7, 10) + roc(152, 148, .8, -20) + bulle(140, 56, .8, ['#ffffff', EAU[1]]) + bulle(152, 78, .55, ['#ffffff', EAU[1]]),
    ancre_de_corail: p => {
      const B = [[-9, -40], [9, -40], [10, -2], [26, 2], [30, 14], [-11, 14]];
      return deux([[28, 156], [70, 146], [130, 146], [172, 156], [168, 176], [32, 176]], [[28, 156], [70, 146], [130, 146], [172, 156]], SABLE[1], SABLE[2], 3)
        + place(deux(B, [[-9, -40], [0, -40], [0, 14], [-11, 14]], '#e6c294', '#8a5a36', 3)
          + poly([[-11, 8], [30, 8], [30, 14], [-11, 14]], '#3b2f2a') + encre([[-11, 8], [30, 8], [30, 14], [-11, 14]], 2), 140, 132, 0, 1.08)
        + ancre(88, 98, 1.02, 0, CORAIL, true)
        + [88, 104].map(y => tube([[126, y + 4], [140, y - 1], [155, y + 2]], 7, 6, CORAIL[1], CORAIL[2], 2.4)).join('')
        + eclat(42, 60, .7, p[1]);
    },

    vague_scellee: p => {
      const C = [[100, 90], [44, 122], [156, 122], [100, 154], [100, 122]];
      return C.map(([x, y]) => dalle(x, y, .54, SABLE[1], SABLE[2])).join('')
        + C.slice(0, 4).map(([x, y], i) => vague(x, y - 10, .4, SABLE, 0, i % 3 ? (i === 1 ? -1 : 1) : (i ? -1 : 1))).join('')
        + roc(90, 116, .6, 10) + roc(112, 114, .5, 70) + croix(100, 124, 1.2) + eclat(100, 48, .8, p[1]);
    },
    vague_d_ecume: p => {
      const C = [[100, 90], [44, 122], [156, 122], [100, 154], [100, 122]];
      return C.map(([x, y]) => dalle(x, y, .54, EAU[0], EAU[2])).join('')
        + C.slice(0, 4).map(([x, y], i) => vague(x, y - 10, .4, [p[0], p[1], p[2], p[3]], 0, i % 3 ? (i === 1 ? -1 : 1) : (i ? -1 : 1))).join('')
        + ecume(100, 118, .75, ['#ffffff', p[1]]) + eclat(100, 48, .8, p[0]);
    },
    sang_de_vouivre: p => [[100, 36], [164, 100], [100, 164], [36, 100]].map(([x, y]) => trait(`M100 100 L${x} ${y}`, OR_C, 2.4, 6) + goutte(x, y, .9, ['#e6fbff', CRIST, '#209fec'])).join('')
      + place(deux([[0, -44], [26, -2], [22, 22], [0, 36], [-22, 22], [-26, -2]], [[0, -44], [0, 36], [-22, 22], [-26, -2]], CRIST, '#209fec', 3.4)
        + [[-8, 0], [8, 0], [0, 14], [-10, 18], [10, 18]].map(([a, b]) => ecaille(a, b, .7, '#e6fbff', '#209fec')).join('') + poly([[-12, -6], [-4, -26], [-4, -6]], '#ffffff', 'opacity=".8"'), 100, 98, 0, 1),
    cocon_d_ecume: p => pion(100, 104, 1.05) + place(
      [-38, -14, 10, 32].map((b, i) => tube(bez([-36 + Math.abs(b) * .3, b], [-14, b + 10], [14, b + 10], [36 - Math.abs(b) * .3, b - 2], 10), 14, 10, '#ffffff', EAU[1], 2.6)).join(''), 100, 100, 0, 1.15)
      + `<ellipse cx="100" cy="100" rx="52" ry="66" fill="none" stroke="${INK}" stroke-width="7"/><ellipse cx="100" cy="100" rx="52" ry="66" fill="none" stroke="${EAU[0]}" stroke-width="3"/>`
      + bulle(52, 58, .8, ['#ffffff', EAU[1]]) + bulle(150, 146, .7, ['#ffffff', EAU[1]]) + eclat(152, 52, .8, p[0]),

    maelstrom: p => gouffre(100, 100, 1.08, p) + goutte(156, 44, .6, p) + goutte(44, 156, .5, p),
    maelstrom_de_feu: p => gouffre(100, 100, 1.08, p, '#fff3c0') + flamme(156, 46, .45, p) + flamme(44, 154, .4, p) + flamme(160, 150, .34, p),

    provocation_des_flots: p => ronds(100, 152, EAU[1], 3, 20, 6, 20) + HAR(100, 72, .64, 0, { lueur: CRIST })
      + goutte(64, 130, .6, EAU, -40) + goutte(136, 130, .6, EAU, 40) + goutte(76, 110, .45, EAU, -20) + goutte(124, 110, .45, EAU, 20)
      + eclat(54, 60, .8, p[1]) + eclat(148, 60, .8, p[1]),
    regard_de_morrha: p => ronds(100, 150, p[1], 2, 34, 8, 20) + oeil(100, 84, 1.05) + [[48, 50], [152, 50], [100, 30]].map(([x, y]) => ecaille(x, y, .9, TEAL_C, TEAL)).join('')
      + place(chevrons(0, 0, .7, p[0]), 100, 138, 90, 1),

    deferlante: p => vague(128, 100, .95, p) + vague(78, 130, .6, p) + vague(44, 152, .38, p) + eclat(160, 150, .7, p[0]),
    deferlante_ardente: p => vague(128, 100, .95, p) + vague(78, 130, .6, p) + vague(44, 152, .38, p) + vapeur(110, 62, .9) + vapeur(140, 62, .7) + vapeur(74, 104, .6) + bulle(158, 148, .6, [p[0], p[1]]),
    retour_des_eaux: p => coupe(100, 120, 1.25, EAU) + [[62, 54, .5], [82, 46, .6], [118, 46, .6], [138, 54, .5]].map(([x, y, s], i) => goutte(x, y, s, EAU, i < 2 ? 160 : -160)).join('')
      + fleche('M60 76 Q100 30 140 76', EAU[1], 5) + plus(100, 70, .8),
    bastion: p => deux([[24, 160], [36, 112], [70, 82], [116, 78], [156, 100], [176, 160]], [[24, 160], [36, 112], [70, 82], [116, 78], [96, 120], [80, 160]], PIERRE[0], PIERRE[2], 3.4)
      + `<path d="M70 82 L96 120 L80 160 M116 78 L96 120 L140 160" stroke="${INK}" stroke-width="2.2" fill="none" opacity=".6"/>`
      + corail(70, 66, .9, -14) + corail(130, 62, 1.05, 12) + corail(156, 92, .6, 30) + croix(84, 130, .9) + croix(118, 120, .9)
      + eclat(50, 126, .7, p[0]) + bulle(156, 50, .7, ['#ffffff', EAU[1]]),

    pleine_mer: p => croissant(100, 132, 76, 3.3, 6.12, EAU[1], EAU[0], 1.22)
      + deux([[22, 156], [178, 156], [174, 176], [26, 176]], [[22, 156], [178, 156], [176, 162], [24, 162]], SABLE[1], SABLE[2], 3)
      + plus(64, 126, .8) + plus(100, 110, 1) + plus(136, 126, .8) + bulle(40, 112, .6, ['#ffffff', EAU[1]]) + bulle(160, 112, .6, ['#ffffff', EAU[1]]),
    ecume_salvatrice: p => `<path d="M48 148 L84 130 L118 140 L156 118" fill="none" stroke="${INK}" stroke-width="10" stroke-linecap="round" stroke-linejoin="round"/><path d="M48 148 L84 130 L118 140 L156 118" fill="none" stroke="#b83a44" stroke-width="5" stroke-linecap="round" stroke-linejoin="round"/>`
      + croix(66, 139, 1) + croix(100, 135, 1) + croix(137, 129, 1)
      + place(deux([[0, -40], [24, -2], [20, 20], [0, 32], [-20, 20], [-24, -2]], [[0, -40], [0, 32], [-20, 20], [-24, -2]], '#ffffff', EAU[1], 3.2)
        + [[-8, 8], [8, 14], [4, -6]].map(([a, b]) => `<circle cx="${a}" cy="${b}" r="5" fill="none" stroke="${EAU[2]}" stroke-width="2"/>`).join(''), 100, 70, 0, 1)
      + plus(150, 60, .7, EAU[0]),
  });
})();

IconesV3.TYPES = Object.assign(IconesV3.TYPES || {}, {muraille_d_eau:'placement',ancre_de_corail:'degats',regard_de_morrha:'degats',provocation_des_flots:'degats'});
