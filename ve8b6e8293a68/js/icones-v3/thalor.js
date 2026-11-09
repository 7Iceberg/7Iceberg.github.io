(() => {
  const { poly, encre, place, croix, eclat, roc, croissant, flamme } = IconesV3.outils;
  const { P, INK } = IconesV3;
  const OR_C = '#ffd98f', OR_S = '#a8683a', OR_V = '#fff3d2';
  const CAL = ['#fffaf0', '#efe2c8', '#b8a38a', '#7c6856'];
  const ARD = ['#e6eef8', '#a9b8d0', '#6f80aa', '#3e4a6e'];
  const SAPH = ['#e6fbff', '#52d2f4', '#209fec', '#113f8a'];
  const MAGMA = ['#fff3c0', '#ffb347', '#ef5a2a', '#4a1208'];
  const RUB = ['#ffd2cc', '#ef7574', '#b83a44', '#5a1a22'];
  const ORS = [OR_V, OR_C, OR_S, '#5a3a1c'];
  const R = Math.PI / 180;

  const deux = (pts, cut, c1, c2, w = 3) => poly(pts, c2) + poly(cut, c1) + encre(pts, w);
  const trait = (d, c, w, iw = w + 4.4, o = '') => `<path d="${d}" fill="none" stroke="${INK}" stroke-width="${iw}" stroke-linecap="round" stroke-linejoin="round" ${o}/><path d="${d}" fill="none" stroke="${c}" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round" ${o}/>`;
  const pointille = (d, c, w = 3.4) => `<path d="${d}" fill="none" stroke="${INK}" stroke-width="${w + 3.6}" stroke-dasharray="10 9" stroke-linecap="round"/><path d="${d}" fill="none" stroke="${c}" stroke-width="${w}" stroke-dasharray="10 9" stroke-linecap="round"/>`;
  const ngon = (cx, cy, rx, n, off = 0, ry = rx) => Array.from({ length: n }, (_, k) => { const a = (k * 360 / n + off) * R; return [cx + Math.cos(a) * rx, cy + Math.sin(a) * ry]; });
  const coulee = (d, p, w = 14) => `<path d="${d}" fill="none" stroke="${INK}" stroke-width="${w + 5}" stroke-linecap="round" stroke-linejoin="round"/><path d="${d}" fill="none" stroke="${p[2]}" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round"/><path d="${d}" fill="none" stroke="${p[1]}" stroke-width="${w * .5}" stroke-linecap="round" stroke-linejoin="round"/><path d="${d}" fill="none" stroke="${p[0]}" stroke-width="${Math.max(1.4, w * .14)}" stroke-linecap="round" stroke-linejoin="round"/>`;
  const bande = (q) => { const [a, b, c, d] = q, m1 = [(a[0] + d[0]) / 2, (a[1] + d[1]) / 2], m2 = [(b[0] + c[0]) / 2, (b[1] + c[1]) / 2]; return poly(q, OR_S) + poly([a, b, m2, m1], OR_C) + encre(q, 2.4); };
  const chevrons = (x, y, s, c, r = 0, n = 2) => place(Array.from({ length: n }, (_, k) => { const dx = k * 18; return `<path d="M${dx - 10} -16 L${dx + 6} 0 L${dx - 10} 16" fill="none" stroke="${INK}" stroke-width="10" stroke-linejoin="miter" stroke-linecap="square"/><path d="M${dx - 10} -16 L${dx + 6} 0 L${dx - 10} 16" fill="none" stroke="${c}" stroke-width="5.4" stroke-linejoin="miter" stroke-linecap="square"/>`; }).join(''), x, y, r, s);
  const echange = (x0, y0, x1, y1, h) => {
    const cx = (x0 + x1) / 2, cy = 2 * h - (y0 + y1) / 2, d = `M${x0} ${y0} Q${cx} ${cy} ${x1} ${y1}`;
    const tete = (x, y, a) => place(deux([[-4, -19], [22, 0], [-4, 19]], [[-4, -19], [22, 0], [-4, 0]], OR_V, OR_C, 3), x, y, a);
    return trait(d, OR_C, 12, 20) + `<path d="${d}" fill="none" stroke="${OR_V}" stroke-width="4.4" stroke-linecap="round" transform="translate(0 -2.8)"/>`
      + tete(x0, y0, Math.atan2(y0 - cy, x0 - cx) / R) + tete(x1, y1, Math.atan2(y1 - cy, x1 - cx) / R);
  };
  const impact = (x, y, s, p) => place(deux(ngon(0, 0, 1, 16).map(([a, b], k) => [a * (k % 2 ? 14 : 36), b * (k % 2 ? 14 : 36)]),
    ngon(0, 0, 1, 16).slice(8).map(([a, b], k) => [a * (k % 2 ? 14 : 36), b * (k % 2 ? 14 : 36)]).concat([[0, 0]]), p[0], p[1], 2.8) + poly(ngon(0, 0, 9, 8, 22.5), '#ffffff'), x, y, 0, s);

  function gantelet(o = {}) {
    const c = o.coeur || SAPH, f = o.fente || SAPH[1];
    let s = '';
    s += deux([[-27, 14], [27, 14], [31, 40], [-31, 40]], [[-27, 14], [0, 14], [0, 40], [-31, 40]], '#3d3354', '#241c34', 3);
    s += deux([[-26, -20], [26, -20], [27, 12], [-27, 12]], [[-26, -20], [0, -20], [0, 12], [-27, 12]], CAL[1], CAL[2], 3);
    s += bande([[-31, 2], [31, 2], [32, 16], [-32, 16]]);
    const B = [[-42, -80], [40, -82], [46, -56], [42, -26], [30, -16], [-30, -16], [-42, -26], [-46, -56]];
    s += poly(B, CAL[2]) + poly([[-42, -80], [2, -81], [-2, -16], [-30, -16], [-42, -26], [-46, -56]], CAL[1]) + poly([[-42, -80], [40, -82], [38, -74], [-40, -72]], CAL[0]);
    if (o.veines) s += trait('M-17 -44 L-27 -40 L-31 -29 L-39 -25 M21 -42 L29 -33 L39 -33 M0 -29 L-5 -21', f, 2.6, 6);
    s += encre(B, 3.6);
    s += deux([[-60, -66], [-46, -72], [-34, -36], [-48, -30]], [[-60, -66], [-53, -69], [-41, -33], [-48, -30]], CAL[1], CAL[2], 3)
      + bande([[-58, -55], [-44, -60], [-41, -50], [-55, -45]]);
    [-43, -21, 1, 23].forEach((x, k) => {
      const d = [9, 1, 0, 7][k], w = 20, F = [[x, -94 + d], [x + 4, -101 + d], [x + w - 4, -102 + d], [x + w, -95 + d], [x + w, -72], [x, -72]];
      s += deux(F, [[x, -94 + d], [x + 4, -101 + d], [x + w / 2, -101.5 + d], [x + w / 2, -72], [x, -72]], CAL[1], CAL[2], 3)
        + poly([[x + 4, -101 + d], [x + w - 4, -102 + d], [x + w - 3, -98 + d], [x + 5, -97 + d]], CAL[0])
        + bande([[x, -88 + d], [x + w, -89 + d], [x + w, -80 + d], [x, -79 + d]]);
    });
    const hx = r => ngon(2, -48, r, 6, -90);
    s += deux(hx(20), [hx(20)[3], hx(20)[4], hx(20)[5], hx(20)[0]], OR_C, OR_S, 3);
    const g = hx(13), C0 = [2, -48];
    s += poly(g, c[2]) + poly([g[5], g[0], C0], c[0]) + poly([g[4], g[5], C0], c[1]) + poly([g[0], g[1], C0], c[1]) + poly([g[2], g[3], C0], c[3]) + encre(g, 2.4);
    return s;
  }
  const G = (x, y, r, s, o) => place(gantelet(o), x, y, r, s);
  function main() {
    let s = '';
    s += deux([[-24, 14], [24, 14], [28, 36], [-28, 36]], [[-24, 14], [0, 14], [0, 36], [-28, 36]], '#3d3354', '#241c34', 3);
    s += bande([[-27, 2], [27, 2], [27, 12], [-27, 12]]);
    [[-26, -50, -12], [-11, -60, -4], [4, -58, 4], [18, -46, 12]].forEach(([x, h, r]) => {
      s += place(deux([[-7, 0], [7, 0], [7, h], [0, h - 4], [-7, h]], [[-7, 0], [0, 0], [0, h - 4], [-7, h]], CAL[1], CAL[2], 2.6) + bande([[-7, h * .55], [7, h * .55], [7, h * .55 + 7], [-7, h * .55 + 7]]), x + 7, -30, r, 1);
    });
    s += deux([[-30, -14], [-50, -36], [-42, -44], [-20, -26]], [[-30, -14], [-50, -36], [-46, -40], [-25, -20]], CAL[1], CAL[2], 2.6);
    const B = [[-30, -36], [32, -36], [34, -10], [24, 4], [-24, 4], [-34, -12]];
    s += deux(B, [[-30, -36], [2, -36], [0, 4], [-24, 4], [-34, -12]], CAL[1], CAL[2], 3.2);
    const g = ngon(1, -16, 9, 6, -90), C0 = [1, -16];
    s += deux(ngon(1, -16, 14, 6, -90), ngon(1, -16, 14, 6, -90).slice(3).concat([ngon(1, -16, 14, 6, -90)[0]]), OR_C, OR_S, 2.4);
    s += poly(g, SAPH[2]) + poly([g[5], g[0], C0], SAPH[0]) + poly([g[4], g[5], C0], SAPH[1]) + poly([g[2], g[3], C0], SAPH[3]) + encre(g, 1.8);
    return s;
  }
  const M = (x, y, r, s) => place(main(), x, y, r, s);
  const ov = (cx, cy, rx, ry, c = CAL, w = 2.4) => { const pt = ngon(cx, cy, rx, 10, 0, ry); return deux(pt, [pt[4], pt[5], pt[6], pt[7], pt[8], [cx, cy]], c[1], c[2], w) + poly([pt[6], pt[7], [cx - rx * .2, cy - ry * .3]], c[0]); };
  const cairn = (x, y, s = 1) => place(ov(0, 12, 24, 10) + ov(1, -5, 18, 8.5) + ov(-1, -20, 12, 7) + eclat(0, -33, .62, SAPH[1], SAPH[0]), x, y, 0, s);
  const pion = (x, y, s = 1, ami = false, r = 0) => {
    const c = ami ? ORS : RUB, H = ngon(0, -22, 10, 8, 22.5);
    return place(deux([[-14, -8], [14, -8], [19, 20], [-19, 20]], [[-14, -8], [0, -8], [0, 20], [-19, 20]], c[1], c[2], 2.8)
      + poly(H, c[1]) + poly([H[4], H[5], H[6], [0, -22]], c[0]) + poly([H[0], H[1], H[2], [0, -22]], c[2]) + encre(H, 2.8), x, y, r, s);
  };
  const bloc = (x, y, s, r = 0, c = CAL, fente) => place(
    deux([[-26, -12], [-10, -26], [16, -24], [28, -4], [20, 20], [-12, 24], [-28, 8]], [[-26, -12], [-10, -26], [16, -24], [2, -4], [-12, 24], [-28, 8]], c[1], c[2], 3)
    + poly([[-10, -26], [16, -24], [2, -4], [-26, -12]], c[0])
    + (fente ? trait('M-24 -4 L-14 0 L-12 -12 M-14 0 L-8 10 M6 -18 L8 -8 L20 -4 M8 -8 L4 6 L10 16', fente, 2.2, 5.4) : `<path d="M2 -4 L20 20 M2 -4 L-28 8" stroke="${INK}" stroke-width="1.6" opacity=".45"/>`), x, y, r, s);
  const galet = (x, y, s, r = 0, c = CAL) => place(ov(0, 0, 26, 16, c, 3) + `<path d="M-14 -8 Q-4 -13 8 -11" fill="none" stroke="${c[0]}" stroke-width="2.6" stroke-linecap="round"/>`, x, y, r, s);
  const pic = (x, y, s, c = CAL, neige = '#ffffff') => place(
    poly([[-56, 36], [-22, -12], [-10, -4], [10, -46], [56, 36]], c[2])
    + poly([[-56, 36], [-22, -12], [-14, 36]], c[1]) + poly([[-10, -4], [10, -46], [2, 36]], c[1])
    + poly([[10, -46], [20, -26], [12, -22], [4, -28]], neige) + poly([[-22, -12], [-16, -4], [-26, -4]], neige)
    + encre([[-56, 36], [-22, -12], [-10, -4], [10, -46], [56, 36]], 3.2), x, y, 0, s);
  const sol = (y = 150, x0 = 26, x1 = 174, c = ['#d9c4a6', '#7c6856']) => deux([[x0, y], [x1, y], [x1 - 8, y + 24], [x0 + 8, y + 24]], [[x0, y], [x1, y], [x1 - 3, y + 8], [x0 + 3, y + 8]], c[0], c[1], 3);
  const faille = (x, y, s, c) => place(poly([[-40, 0], [-14, -6], [0, -2], [16, -8], [40, 0], [14, 6], [0, 2], [-16, 8]], INK) + poly([[-32, 0], [-14, -3], [0, 0], [16, -4], [32, 0], [14, 3], [0, 3], [-16, 4]], c), x, y, 0, s);
  const dent = (x, y, s, r = 0) => place(deux([[-20, 30], [-14, -20], [2, -58], [12, -22], [22, 30]], [[-20, 30], [-14, -20], [2, -58], [0, 30]], CAL[1], CAL[2], 3.2)
    + poly([[2, -58], [-4, -40], [-14, -20], [-6, -26]], CAL[0]) + `<path d="M-8 4 L6 -8 L4 -30" fill="none" stroke="${INK}" stroke-width="1.8" opacity=".5"/>`, x, y, r, s);
  const goutte = (x, y, s, p) => place(deux([[0, -16], [10, 2], [8, 12], [0, 16], [-8, 12], [-10, 2]], [[0, -16], [0, 16], [-8, 12], [-10, 2]], p[1], p[2], 2.4) + poly([[-4, 0], [-1, -8], [-1, 4]], p[0]), x, y, 0, s);
  const glace = (x, y, s, r, p) => place(poly([[0, -16], [6, -4], [4, 14], [-4, 14], [-6, -4]], p[2]) + poly([[0, -16], [6, -4], [0, 0], [-6, -4]], p[0]) + poly([[0, 0], [6, -4], [4, 14]], p[1]) + encre([[0, -16], [6, -4], [4, 14], [-4, 14], [-6, -4]], 2), x, y, r, s);
  const flocon = (x, y, s, p) => place([0, 60, 120].map(a => place(deux([[0, -34], [6, -26], [3, 0], [0, 4], [-3, 0], [-6, -26]], [[0, -34], [0, 4], [-3, 0], [-6, -26]], p[0], p[1], 2.4)
    + deux([[0, 34], [6, 26], [3, 0], [0, -4], [-3, 0], [-6, 26]], [[0, 34], [0, -4], [-3, 0], [-6, 26]], p[0], p[1], 2.4), 0, 0, a)).join('')
    + poly(ngon(0, 0, 8, 6, -90), p[0]) + encre(ngon(0, 0, 8, 6, -90), 2), x, y, 0, s);
  const nuage = (x, y, s, c) => place(deux([[-46, 14], [-40, -4], [-24, -10], [-14, -28], [8, -32], [22, -18], [40, -16], [50, 2], [42, 14]],
    [[-46, 14], [-40, -4], [-24, -10], [-14, -28], [8, -32], [22, -18], [8, -6], [-30, 4]], c[0], c[1], 3), x, y, 0, s);
  const eclair = (x, y, s, c, r = 0) => place(deux([[6, -36], [-12, 4], [0, 4], [-8, 36], [16, -6], [4, -6], [14, -36]], [[6, -36], [-12, 4], [0, 4], [-8, 36], [4, -6], [14, -36]], '#ffffff', c, 2.8), x, y, r, s);
  const spirale = (cx, cy, r0, r1, tours, a0 = 0) => Array.from({ length: 61 }, (_, i) => { const t = i / 60, a = a0 + t * tours * Math.PI * 2, r = r0 + (r1 - r0) * t; return `${i ? 'L' : 'M'}${(cx + Math.cos(a) * r).toFixed(1)} ${(cy + Math.sin(a) * r).toFixed(1)}`; }).join(' ');
  const glyphe = (cx, cy, rx, ry, fond, bord = OR_C) => {
    const ext = ngon(cx, cy, rx, 16, 0, ry), int = ngon(cx, cy, rx * .78, 16, 0, ry * .78);
    return poly(ext, INK) + poly(ext, OR_S) + poly(ext.slice(8).concat([[cx, cy]]), bord) + poly(int, fond[0]) + poly(int.slice(0, 9), fond[1]) + encre(ext, 3) + encre(int, 2.4)
      + [0, 4, 8, 12].map(k => { const [a, b] = ngon(cx, cy, rx * .89, 16, 0, ry * .89)[k]; return croix(a, b, .7); }).join('');
  };
  const botte = (x, y, s, r = 0) => place(deux([[-14, -40], [12, -40], [14, 2], [38, 12], [40, 30], [-18, 30], [-20, 8]], [[-14, -40], [12, -40], [10, 0], [-6, 6], [-18, 30], [-20, 8]], CAL[1], CAL[2], 3.2)
    + bande([[-16, -24], [14, -24], [14, -16], [-17, -16]]) + `<path d="M-20 22 L40 22" stroke="${INK}" stroke-width="2.4"/>`
    + deux([[16, 4], [30, 9], [26, 20], [14, 14]], [[16, 4], [30, 9], [20, 12]], ARD[0], ARD[2], 2), x, y, r, s);
  const coeurPierre = (x, y, s, fente) => place(deux([[0, 34], [-34, 2], [-34, -18], [-18, -30], [0, -18], [18, -30], [34, -18], [34, 2]], [[0, 34], [-34, 2], [-34, -18], [-18, -30], [0, -18]], CAL[1], CAL[2], 3.2)
    + poly([[-26, -14], [-18, -24], [-10, -18]], CAL[0])
    + trait('M-8 2 L-22 -4 M8 2 L22 -6 M0 12 L0 24', RUB[1], 2.4, 6) + (() => { const g = ngon(0, 0, 9, 6, -90); return deux(ngon(0, 0, 13, 6, -90), ngon(0, 0, 13, 6, -90).slice(3).concat([ngon(0, 0, 13, 6, -90)[0]]), OR_C, OR_S, 2.2) + poly(g, RUB[2]) + poly([g[5], g[0], [0, 0]], RUB[0]) + poly([g[4], g[5], [0, 0]], RUB[1]) + poly([g[2], g[3], [0, 0]], RUB[3]) + encre(g, 1.8); })(), x, y, 0, s);

  Object.assign(IconesV3.SUJETS, {
    poigne: p => impact(136, 46, .9, p) + G(92, 140, 18, .84) + roc(160, 82, .9, -20) + roc(150, 26, .6, 40) + roc(170, 52, .55, 10) + eclat(44, 62, .8, p[1]),
    poing_de_magma: p => G(100, 136, 0, .86, { coeur: MAGMA, fente: '#ff7a2b', veines: true })
      + flamme(42, 70, .55, p) + flamme(160, 66, .62, p) + flamme(150, 32, .38, p) + eclat(48, 132, .6, p[1]),
    pierre_brulante: p => faille(70, 150, .6, p[1]) + pointille('M66 144 Q56 50 120 66', p[1]) + flamme(84, 64, .4, p) + flamme(98, 58, .32, p)
      + bloc(134, 76, 1.25, 10, ['#d9905a', '#9a3e22', '#4a1a10'], '#ffb347') + eclat(166, 112, .7, p[0]),
    caillou_des_vents: p => croissant(110, 96, 62, 1.9, 4.0, p[2], p[1], 1.22) + croissant(116, 96, 42, 2.0, 3.9, p[1], p[0], 1.25)
      + pointille('M40 150 Q70 130 98 112', p[1], 3) + galet(124, 90, 1.25, -20, ARD)
      + eclat(160, 140, .7, '#ffffff', p[1]) + eclat(54, 60, .55, p[1]),
    galet_du_torrent: p => galet(100, 102, 2.2, -12, ['#f7f9fb', '#c9d3dc', '#7a8a9c'])
      + glace(68, 70, .9, -40, p) + glace(88, 58, .7, -10, p) + glace(130, 62, .8, 20, p)
      + goutte(52, 150, .7, p) + goutte(150, 146, .8, p) + chevrons(100, 158, .55, p[1], 90, 1),
    cendre_de_faille: p => {
      const T = [[34, 152], [42, 132], [60, 120], [78, 116], [92, 106], [108, 110], [124, 106], [142, 118], [158, 130], [166, 152]];
      const flocon = (x, y, s, r) => place(deux([[-7, -4], [0, -8], [8, -2], [3, 7], [-6, 5]], [[-7, -4], [0, -8], [1, 0], [-6, 5]], '#b8aca4', '#5a4e48', 1.8), x, y, r, s);
      const braises = [[54, 142, 5], [72, 130, 4], [90, 142, 6], [110, 126, 4.4], [124, 142, 5.6], [146, 136, 4]];
      return pion(100, 90, 1.18)
        + deux(T, [[34, 152], [42, 132], [60, 120], [78, 116], [92, 106], [96, 152]], '#6e625c', '#3a302c', 3.2) + poly([[42, 132], [60, 120], [78, 116], [92, 106], [90, 116], [64, 126]], '#9a8c84')
        + trait('M60 136 L72 130 L80 138 M114 132 L126 128 L136 138', p[2], 2.4, 5) + braises.map(([x, y, r]) => poly(ngon(x, y, r, 4, 0, r * 1.3), p[1]) + poly(ngon(x, y, r * .45, 4, 0, r * .6), p[0])).join('')
        + flocon(46, 72, 1.1, 20) + flocon(152, 60, 1.2, -30) + flocon(64, 42, .8, 60) + flocon(140, 90, .8, 10)
        + eclat(74, 70, .62, p[1], p[0]) + eclat(136, 38, .55, p[1], p[0]) + eclat(162, 104, .5, p[1], p[0])
        + chevrons(100, 166, .52, p[1], 90, 1);
    },
    gravier_des_cols: p => trait('M24 74 Q60 62 96 76', p[0], 3, 7) + trait('M20 108 Q60 98 98 104', p[0], 3, 7) + trait('M30 140 Q62 126 92 124', p[0], 3, 7)
      + pion(142, 104, 1.05, false, 18)
      + [[58, 84, .95, 10], [92, 92, 1.25, 50], [50, 118, 1.05, -20], [84, 120, .9, 30], [110, 70, .8, 80], [114, 132, .75, -40]].map(([x, y, s, r]) => roc(x, y, s, r, '#f4f7fb', ARD[2])).join('')
      + impact(120, 98, .38, p) + chevrons(176, 100, .5, p[1], 0, 1),
    ressac_de_galets: p => coulee('M22 146 Q60 120 100 140 Q140 160 178 132', p, 12) + coulee('M30 112 Q70 92 110 110', p, 7)
      + galet(54, 122, .85, -10) + galet(100, 112, 1.05, 6) + galet(148, 108, 1.25, -8) + chevrons(160, 60, .7, p[1]),
    lancer: p => pointille('M66 108 Q86 26 132 52', p[1]) + G(62, 158, 26, .56) + bloc(140, 70, 1.3, 16) + roc(112, 34, .6, 20) + roc(164, 116, .7, -20) + eclat(168, 32, .6, p[1]),
    jet_de_crete: p => pointille('M36 120 Q70 20 132 50', p[1]) + pic(100, 146, 1.15) + pion(130, 62, 1, false, 30) + eclat(56, 54, .7, '#ffffff', p[1]) + eclat(166, 100, .55, p[1]),
    gorgee_de_cime: p => sol(146) + pic(100, 112, 1.3) + [40, 70, 100, 130, 160].map(x => croix(x, 156, 1.1)).join('') + eclat(150, 50, .7, p[1]),
    assise_pretee: p => sol(146) + pic(70, 118, .92) + place(pic(0, 0, 1, ORS, OR_V), 150, 128, 0, .56)
      + `<path d="M86 76 Q130 30 152 98" fill="none" stroke="${INK}" stroke-width="6" stroke-linecap="round"/><path d="M86 76 Q130 30 152 98" fill="none" stroke="${OR_C}" stroke-width="2.6" stroke-dasharray="7 5"/>`
      + croix(122, 156, 1) + croix(146, 156, 1) + croix(170, 156, 1) + eclat(150, 40, .6, p[1]),
    vague: p => deux([[22, 82], [176, 148], [168, 172], [22, 112]], [[22, 82], [176, 148], [174, 154], [22, 90]], '#d9c4a6', '#7c6856', 3)
      + trait('M28 52 L44 59 M70 70 L86 77 M114 90 L128 96', p[0], 2.6, 6.6)
      + bloc(52, 76, .72, 0) + bloc(96, 96, .82, 40) + bloc(140, 116, .92, 80)
      + chevrons(160, 76, .62, p[1], 24),
    crue_du_torrent: p => roc(40, 118, 1.3, 10) + roc(140, 66, 1.2, -30) + deux([[20, 50], [46, 56], [58, 50], [84, 66], [98, 60], [122, 80], [136, 76], [158, 96], [172, 94], [184, 132], [174, 152], [148, 128], [118, 112], [88, 96], [58, 86], [22, 82]],
        [[20, 50], [46, 56], [58, 50], [84, 66], [98, 60], [122, 80], [136, 76], [158, 96], [172, 94], [184, 132], [160, 112], [128, 96], [96, 80], [62, 70], [21, 66]], p[1], p[2], 3.2)
      + [[46, 56], [84, 66], [122, 80], [158, 96]].map(([x, y]) => poly([[x - 8, y + 4], [x, y - 1], [x + 8, y + 6], [x, y + 3]], p[0])).join('')
      + goutte(60, 46, .7, p) + goutte(108, 70, .8, p) + goutte(150, 96, .7, p) + goutte(96, 150, .6, p) + chevrons(150, 160, .55, p[1], 30),
    etreinte: p => pion(100, 108, 1.05)
      + deux([[30, 40], [62, 46], [80, 70], [70, 86], [84, 104], [70, 122], [80, 140], [60, 160], [36, 150], [24, 96]], [[30, 40], [62, 46], [80, 70], [70, 86], [84, 104], [50, 100], [24, 96]], CAL[1], CAL[3], 3.4)
      + poly([[30, 40], [62, 46], [52, 62], [28, 60]], CAL[0])
      + deux([[170, 40], [138, 46], [120, 70], [130, 86], [116, 104], [130, 122], [120, 140], [140, 160], [164, 150], [176, 96]], [[170, 40], [138, 46], [120, 70], [130, 86], [116, 104], [150, 100], [176, 96]], CAL[1], CAL[3], 3.4)
      + poly([[170, 40], [138, 46], [148, 62], [172, 60]], CAL[0])
      + chevrons(44, 104, .45, p[0], 0, 1) + chevrons(156, 104, .45, p[0], 180, 1) + eclat(100, 52, .7, p[1]),
    serre_du_glacier: p => pion(100, 110, 1.05)
      + deux([[40, 30], [66, 40], [82, 74], [80, 110], [70, 150], [56, 162], [62, 122], [58, 84], [46, 56]], [[40, 30], [66, 40], [82, 74], [80, 110], [70, 150], [64, 110], [52, 64]], p[0], p[1], 3.2)
      + deux([[160, 30], [134, 40], [118, 74], [120, 110], [130, 150], [144, 162], [138, 122], [142, 84], [154, 56]], [[160, 30], [134, 40], [118, 74], [120, 110], [130, 150], [136, 110], [148, 64]], p[0], p[2], 3.2)
      + glace(100, 46, .9, 0, p) + eclat(36, 120, .6, p[0]) + eclat(166, 118, .6, p[0]),
    transposition: p => deux([[22, 150], [178, 150], [171, 163], [29, 163]], [[22, 150], [178, 150], [177, 154], [23, 154]], CAL[1], CAL[2], 3)
      + cairn(58, 123, 1.24) + pion(142, 124, 1.32) + echange(72, 57, 128, 57, 42),
    tourne_vent: p => trait(spirale(100, 100, 6, 62, 1.6, 0), p[1], 7, 12) + cairn(100, 102, .8) + pion(146, 66, .8, false, 20) + impact(56, 150, .55, p) + eclat(160, 140, .6, p[0]),
    projection: p => deux([[22, 152], [176, 66], [176, 94], [22, 176]], [[22, 152], [176, 66], [176, 74], [22, 160]], '#d9c4a6', '#7c6856', 3)
      + cairn(48, 126, .82) + trait('M150 58 L166 50 M156 74 L172 66', p[0], 2.4, 6.4) + pion(130, 80, .95, false, -28) + chevrons(90, 92, .55, p[1], 150),
    pente_de_lave: p => deux([[22, 152], [176, 66], [176, 94], [22, 176]], [[22, 152], [176, 66], [176, 74], [22, 160]], '#9a7a62', '#4a3430', 3)
      + coulee('M30 150 L172 70', p, 12) + cairn(48, 126, .82) + pion(130, 76, .95, false, -28)
      + flamme(108, 80, .4, p) + flamme(80, 98, .32, p) + flamme(160, 40, .42, p),
    ancre: p => {
      const pics = (dos) => [[-60, 0], [-40, 1], [-18, 1], [0, 1], [20, 1], [42, 1], [60, 0]].map(([dx], k) => { const y = dos ? 128 : 150, h = dos ? 34 + (k % 2) * 8 : 46 - (k % 2) * 10; return (dos ? k % 2 === 1 : k % 2 === 0) ? deux([[100 + dx - 10, y], [100 + dx, y - h], [100 + dx + 10, y]], [[100 + dx - 10, y], [100 + dx, y - h], [100 + dx, y]], CAL[1], CAL[2], 2.6) : ''; }).join('');
      return pics(true) + pion(100, 96, 1.7) + pics(false) + deux(ngon(100, 156, 64, 12, 0, 12), ngon(100, 156, 64, 12, 0, 12).slice(6, 12).concat([[100, 156]]), CAL[1], CAL[3], 2.6) + eclat(160, 46, .6, p[0]);
    },
    boue_des_cols: p => {
      const X = [[76, 64], [124, 64], [124, 94], [154, 94], [154, 124], [124, 124], [124, 154], [76, 154], [76, 124], [46, 124], [46, 94], [76, 94]];
      return poly(X, '#5a4030') + poly([[76, 64], [124, 64], [118, 72], [82, 72]], '#9a7050') + encre(X, 3.2)
        + `<path d="M54 102 Q64 98 72 104 M114 134 Q126 128 140 134 M128 112 Q138 110 146 114" fill="none" stroke="${p[1]}" stroke-width="3" stroke-linecap="round"/>`
        + [[62, 112, 5], [138, 106, 6], [104, 140, 4.5], [86, 136, 4]].map(([x, y, r]) => `<circle cx="${x}" cy="${y}" r="${r}" fill="#7a5a3e" stroke="${INK}" stroke-width="2"/><circle cx="${x - r * .3}" cy="${y - r * .3}" r="${r * .35}" fill="#c9a07a"/>`).join('')
        + pion(100, 96, .9) + deux(ngon(100, 112, 26, 10, 0, 8), ngon(100, 112, 26, 10, 0, 8).slice(5).concat([[100, 112]]), '#9a7050', '#5a4030', 2.6)
        + goutte(56, 46, .65, p) + goutte(146, 46, .65, p);
    },
    poids_de_durren: p => poly(ngon(100, 158, 68, 14, 0, 17), '#2a1e18') + encre(ngon(100, 158, 68, 14, 0, 17), 2.6)
      + trait('M48 160 L66 152 L76 164 M124 164 L136 152 L154 160', p[1], 2.6, 6.2)
      + trait('M46 36 L46 70 M66 26 L66 52 M134 26 L134 52 M154 36 L154 70', p[0], 2.6, 6.6)
      + roc(36, 128, 1.05, 20) + roc(166, 124, 1.1, -30)
      + G(100, 52, 180, .74) + impact(100, 150, .95, p),
    tempete_des_cretes: p => pic(100, 144, .92, CAL) + nuage(100, 58, 1.1, ['#e6eef8', '#6f80aa']) + eclair(104, 100, .9, p[2]) + eclair(48, 96, .55, p[2], -10) + eclair(156, 96, .55, p[2], 10),
    mur_de_chair: p => {
      const D = [[26, 150], [32, 120], [46, 96], [68, 76], [94, 66], [120, 70], [144, 86], [162, 110], [174, 150]];
      const epines = [[1, 2, 18], [2, 3, 22], [3, 4, 26], [4, 5, 26], [5, 6, 22], [6, 7, 18]].map(([i, j, h]) => {
        const [x0, y0] = D[i], [x1, y1] = D[j], x = (x0 + x1) / 2, y = (y0 + y1) / 2, l = Math.hypot(x1 - x0, y1 - y0), tx = (x1 - x0) / l, ty = (y1 - y0) / l, nx = ty, ny = -tx;
        return deux([[x - tx * 9, y - ty * 9], [x + nx * h, y + ny * h], [x + tx * 9, y + ty * 9]], [[x - tx * 9, y - ty * 9], [x + nx * h, y + ny * h], [x, y]], ARD[0], ARD[2], 2.4); }).join('');
      return epines + deux(D, [[94, 66], [120, 70], [144, 86], [162, 110], [174, 150], [112, 150], [104, 96]], CAL[2], CAL[1], 3.4)
        + poly([[32, 120], [46, 96], [68, 76], [94, 66], [104, 96], [62, 104]], CAL[0])
        + `<path d="M62 104 L52 150 M104 96 L112 150 M62 104 L104 96" fill="none" stroke="${INK}" stroke-width="1.8" opacity=".5"/>`
        + bande([[22, 144], [178, 144], [180, 158], [20, 158]])
        + roc(152, 40, .9, 30) + `<path d="M140 54 L124 68 M148 58 L162 74" stroke="${p[1]}" stroke-width="3" stroke-linecap="round"/>` + eclat(128, 66, .7, p[1]);
    },
    peau_de_granit: p => {
      const D = [[56, 52], [140, 44], [158, 96], [140, 150], [62, 156], [42, 104]];
      const points = [[70, 70], [90, 62], [118, 60], [80, 92], [104, 84], [130, 80], [64, 120], [92, 116], [120, 110], [140, 120], [86, 140], [114, 138], [148, 98], [56, 96]];
      return deux(D, [[56, 52], [140, 44], [100, 100], [62, 156], [42, 104]], '#d6d0c8', '#8a8a96', 3.6) + poly([[56, 52], [140, 44], [100, 100]], '#ece8e2')
        + points.map(([x, y], k) => poly(ngon(x, y, k % 3 ? 3 : 4.4, 4, k * 20), k % 2 ? '#3e4252' : '#fffaf0')).join('')
        + impact(160, 40, .5, p) + `<path d="M150 50 L132 70" stroke="${INK}" stroke-width="5" stroke-linecap="round"/><path d="M150 50 L132 70" stroke="${p[0]}" stroke-width="2" stroke-linecap="round"/>`;
    },
    glyphe_pesant: p => glyphe(100, 136, 70, 28, ['#6e5a4c', '#3e2e26']) + poly(ngon(100, 140, 32, 16, 0, 12), '#2a1e18')
      + chevrons(100, 56, .9, p[1], 90) + chevrons(52, 72, .5, p[1], 90, 1) + chevrons(148, 72, .5, p[1], 90, 1),
    givre_des_cimes: p => glyphe(100, 136, 70, 28, [p[0], p[1]], p[0]) + [-56, -30, 0, 30, 56].map((dx, k) => glace(100 + dx, 124 - (k % 2 ? 4 : 0) + Math.abs(dx) * .1, .8 + (k === 2 ? .2 : 0), dx * .3, p)).join('')
      + flocon(100, 62, .95, p),
    chute_de_rocs: p => deux([[28, 26], [96, 26], [90, 40], [66, 44], [48, 60], [28, 62]], [[28, 26], [96, 26], [90, 40], [28, 40]], CAL[1], CAL[2], 3)
      + poly(ngon(104, 150, 54, 16, 0, 16), '#2a1e18') + encre(ngon(104, 150, 54, 16, 0, 16), 2.4)
      + trait('M84 150 L124 150 M104 142 L104 158', OR_C, 3.4, 7.4)
      + trait('M58 68 L58 82 M74 64 L74 80 M100 52 L100 70 M116 50 L116 68 M140 72 L140 88 M154 70 L154 86', p[0], 2, 5.4)
      + bloc(66, 110, .8, 20) + bloc(108, 104, 1, -10) + bloc(146, 116, .78, 40),
    rafale_de_gravier: p => {
      const a = 22, b = 10, tuile = (x, y) => deux([[x, y - b], [x + a, y], [x, y + b], [x - a, y]], [[x, y - b], [x + a, y], [x - a, y]], p[0], p[1], 2.4);
      return trait('M26 96 Q32 30 96 32 Q148 34 142 76', p[0], 7, 12) + `<path d="M132 64 L142 82 L154 66" fill="none" stroke="${INK}" stroke-width="10" stroke-linejoin="round" stroke-linecap="round"/><path d="M132 64 L142 82 L154 66" fill="none" stroke="${p[0]}" stroke-width="5" stroke-linejoin="round" stroke-linecap="round"/>`
        + [[78, 130], [122, 130], [100, 140], [78, 150], [122, 150]].map(([x, y]) => tuile(x, y)).join('')
        + [[60, 60, .9, 20], [88, 84, 1.15, -30], [120, 106, 1.05, 40], [70, 108, .8, 10], [146, 116, .8, -10]].map(([x, y, s, r]) => roc(x, y, s, r, '#f4f7fb', ARD[2])).join('');
    },
    dent_de_durren: p => sol(146) + `<path d="M58 152 L80 148 M120 148 L144 154" stroke="${INK}" stroke-width="3"/>` + dent(100, 116, 1.5)
      + roc(48, 96, .8, 20) + roc(156, 84, .9, -30) + roc(148, 124, .55, 10) + croix(98, 132, 1) + eclat(56, 54, .7, p[1]),
    echine_de_pierre: p => sol(146) + dent(50, 132, .8, -8) + dent(100, 122, 1.05) + dent(150, 132, .8, 8)
      + croix(50, 140, .8) + croix(100, 140, .8) + croix(150, 140, .8) + eclat(150, 50, .6, p[1]),
    geyser_ardent: p => sol(152) + faille(100, 156, .9, p[1])
      + deux([[86, 154], [80, 110], [90, 84], [86, 60], [100, 40], [114, 60], [110, 84], [120, 110], [114, 154]], [[86, 154], [80, 110], [90, 84], [86, 60], [100, 40], [100, 154]], p[1], p[2], 3)
      + poly([[96, 150], [94, 100], [100, 64], [104, 100], [104, 150]], p[0])
      + pion(132, 40, .8, false, 30) + flamme(62, 136, .42, p) + flamme(140, 134, .5, p),
    source_jaillissante: p => sol(152) + faille(100, 156, .9, p[1])
      + coulee('M100 152 Q98 100 100 56', p, 16) + coulee('M94 150 Q70 110 46 92', p, 10) + coulee('M106 150 Q132 112 150 104', p, 10)
      + goutte(100, 36, .8, p) + goutte(38, 74, .7, p) + goutte(70, 60, .55, p) + pion(152, 86, .8, false, 24),
    appel_des_cimes: p => place(pic(0, 0, 1, CAL), 140, 64, 0, .62) + trait('M150 40 Q178 110 124 128 Q100 136 86 134', p[1], 8, 13)
      + chevrons(80, 134, .55, p[1], 170) + pion(104, 106, .78, false, -20) + cairn(52, 130, .7),
    langue_de_lave: p => faille(52, 158, .8, p[1]) + coulee('M48 154 Q40 90 100 70 Q150 54 154 96 Q156 126 126 118 Q110 112 116 96', p, 12)
      + pion(130, 102, .8, false, 10) + flamme(38, 112, .38, p) + flamme(80, 50, .32, p) + eclat(164, 40, .6, p[0]),
    colere_du_mont: p => {
      const aura = ngon(100, 112, 1, 16, -90).map(([x, y], k) => { const l = k % 2 || y > 112.5 ? 44 : 84; return [100 + (x - 100) * l, 112 + (y - 112) * l]; });
      const hx = r => ngon(104, 124, r, 6, -90), g = hx(14), C0 = [104, 124];
      return poly(aura, RUB[2], 'opacity=".8"') + poly(ngon(100, 112, 54, 8, 22.5), RUB[1], 'opacity=".45"')
        + place(pic(0, 0, 1, CAL), 100, 128, 0, 1.3)
        + deux(hx(22), [hx(22)[3], hx(22)[4], hx(22)[5], hx(22)[0]], OR_C, OR_S, 3)
        + poly(g, RUB[2]) + poly([g[5], g[0], C0], RUB[0]) + poly([g[4], g[5], C0], RUB[1]) + poly([g[0], g[1], C0], RUB[1]) + poly([g[2], g[3], C0], RUB[3]) + encre(g, 2.4)
        + chevrons(40, 92, .62, OR_C, -90) + chevrons(160, 92, .62, OR_C, -90);
    },
    epaule_de_roc: p => `<circle cx="100" cy="104" r="44" fill="none" stroke="${INK}" stroke-width="10" stroke-dasharray="30 12"/><circle cx="100" cy="104" r="44" fill="none" stroke="${OR_C}" stroke-width="4.4" stroke-dasharray="30 12"/>`
      + cairn(100, 108, 1.15) + pion(40, 104, .66, false, -24) + pion(160, 104, .66, false, 24)
      + chevrons(58, 66, .5, p[1], -135, 1) + chevrons(142, 66, .5, p[1], -45, 1) + chevrons(58, 146, .5, p[1], 135, 1) + chevrons(142, 146, .5, p[1], 45, 1),
    tourbillon_de_galets: p => trait('M100 40 A62 62 0 0 1 162 102', p[1], 5, 9.4) + trait('M100 164 A62 62 0 0 1 38 102', p[1], 5, 9.4)
      + Array.from({ length: 6 }, (_, k) => { const a = (k * 60 - 60) * R; return galet(100 + Math.cos(a) * 58, 102 + Math.sin(a) * 58, .62, k * 60 + 30, ['#f4fdff', '#a8dcea', '#4a86a8']); }).join('')
      + cairn(100, 104, .78),
    ronde_de_lave: p => {
      const pt = ngon(100, 138, 60, 16, 0, 20);
      const jets = (dos) => [0, 2, 4, 6, 8, 10, 12, 14].filter(k => (dos ? pt[k][1] < 138 : pt[k][1] >= 138)).map(k => flamme(pt[k][0], pt[k][1] - 16, .5, p)).join('');
      return jets(true) + coulee(`M${pt.map(q => q.join(' ')).join(' L')} Z`, p, 10) + cairn(100, 118, .95) + jets(false);
    },
    bras_de_la_montagne: p => `<path d="M80 92 Q120 56 146 66" fill="none" stroke="${INK}" stroke-width="7" stroke-linecap="round"/><path d="M80 92 Q120 56 146 66" fill="none" stroke="${OR_C}" stroke-width="3" stroke-dasharray="8 5"/>`
      + croix(104, 70, .9) + croix(126, 62, .9) + M(64, 140, -10, .95) + pion(154, 70, .9, true) + chevrons(140, 116, .55, p[1], 180),
    lancer_fraternel: p => pointille('M66 106 Q100 0 152 120', OR_C) + M(50, 156, 30, .66) + pion(104, 52, .85, true, 24)
      + deux([[138, 134], [166, 134], [160, 142], [144, 142]], [[138, 134], [166, 134], [152, 138]], OR_C, OR_S, 2.4) + eclat(154, 114, .7, p[0]),
    elan: p => deux([[24, 138], [116, 138], [110, 162], [30, 162]], [[24, 138], [116, 138], [114, 144], [26, 144]], '#d9c4a6', '#7c6856', 3)
      + botte(76, 104, 1.25, -14) + chevrons(140, 96, .7, p[1])
      + `<path d="M154 36 L154 64 M140 50 L168 50" stroke="${INK}" stroke-width="11" stroke-linecap="round"/><path d="M154 36 L154 64 M140 50 L168 50" stroke="${OR_V}" stroke-width="5" stroke-linecap="round"/>`,
    saut_de_rocher: p => {
      const pilier = (x, y, w) => deux([[x - w, y], [x - w * .6, y - 8], [x + w * .5, y - 10], [x + w, y], [x + w * .8, 176], [x - w * .8, 176]], [[x - w, y], [x - w * .6, y - 8], [x + w * .5, y - 10], [x - w * .1, y + 6], [x - w * .8, 176]], CAL[1], CAL[2], 3);
      return pilier(46, 120, 22) + pilier(100, 136, 18) + pilier(154, 100, 22) + pointille('M50 104 Q100 10 150 86', p[1]) + cairn(46, 96, .62) + impact(154, 90, .45, p);
    },
  });
  IconesV3.outilsDe = Object.assign(IconesV3.outilsDe || {}, { thalor: { poly, encre, place, croix, eclat, roc, croissant, flamme, P, INK, OR_C, CAL, ARD, SAPH, MAGMA, RUB, ORS, R, deux, trait, pointille, ngon, coulee, bande, chevrons, echange, impact, G, M, ov, cairn, pion, bloc, galet, pic, sol, faille, dent, goutte, glace, flocon, nuage, eclair, spirale, glyphe, botte, coeurPierre, gantelet, main } });
})();

IconesV3.TYPES = Object.assign(IconesV3.TYPES || {}, {boue_des_cols:'degats',glyphe_pesant:'degats',givre_des_cimes:'degats',dent_de_durren:'placement',echine_de_pierre:'placement'});
