(() => {
  const { poly, encre, place, croix, eclat, roc, croissant, flamme } = IconesV3.outils;
  const { P, INK } = IconesV3;
  const OR_C = '#ffd98f', OR_S = '#a8683a', OR_V = '#fff3d2';
  const MET_C = '#e6eef8', MET = '#6f80aa', MET_S = '#3e4a6e';
  const BOIS_C = '#f4e8d0', BOIS_S = '#b9a58a';
  const CUIR_C = '#c99a6a', CUIR_S = '#7a5236';
  const OS_C = '#f7f0de', OS_S = '#c9b48f';
  const GR_C = '#f0d9a8', GR_S = '#b8894f', GR_O = '#7a5236';
  const NUIT = '#2b2238', NUIT_C = '#4a3f5e';
  const PI_C = '#e8e0cc', PI = '#aab2c2', PI_S = '#6f7a90';
  const PEAU_C = '#f0cfa4', PEAU_S = '#b98a5e';
  const RUB_C = '#ef7574', RUB_S = '#b83a44';
  const FEUILLE = '#80d697', CRISTAL = '#52d2f4';
  const eau = P.eau, feu = P.feu;

  const deux = (pts, cut, c1, c2, w = 3) => poly(pts, c2) + poly(cut, c1) + encre(pts, w);
  const mir = a => a.map(([x, y]) => [-x, y]).reverse();
  const trait = (d, c, w, iw = w + 4.4, o = '') => `<path d="${d}" fill="none" stroke="${INK}" stroke-width="${iw}" stroke-linecap="round" stroke-linejoin="round" ${o}/><path d="${d}" fill="none" stroke="${c}" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round" ${o}/>`;
  const losange = (x, y, r, c, cl = '#ffffff', so = NUIT) => place(poly([[0, -r], [r, 0], [0, r], [-r, 0]], c) + poly([[0, -r], [r, 0], [0, 0]], cl) + poly([[0, r], [-r, 0], [0, 0]], so) + encre([[0, -r], [r, 0], [0, r], [-r, 0]], 2.2), x, y);
  const bulle = (x, y, r) => `<circle cx="${x}" cy="${y}" r="${r}" fill="#ffffff" stroke="${INK}" stroke-width="2"/><circle cx="${x - r * .3}" cy="${y - r * .3}" r="${r * .3}" fill="${eau[1]}"/>`;
  const chevrons = (x, y, s, c, r = 0) => place([0, 18].map(dx => `<path d="M${dx - 10} -16 L${dx + 6} 0 L${dx - 10} 16" fill="none" stroke="${INK}" stroke-width="10" stroke-linejoin="miter" stroke-linecap="square"/><path d="M${dx - 10} -16 L${dx + 6} 0 L${dx - 10} 16" fill="none" stroke="${c}" stroke-width="5.4" stroke-linejoin="miter" stroke-linecap="square"/>`).join(''), x, y, r, s);
  const vitesse = (x, y, s, c, r = 0) => place([[-30, -16, 26], [-40, 0, 34], [-30, 16, 24]].map(([a, b, l]) => `<path d="M${a} ${b} L${a + l} ${b}" stroke="${INK}" stroke-width="8" stroke-linecap="round"/><path d="M${a} ${b} L${a + l} ${b}" stroke="${c}" stroke-width="4" stroke-linecap="round"/>`).join(''), x, y, r, s);
  const ondes = (x, y, s, c, n = 3, r = 0) => place(Array.from({ length: n }, (_, k) => { const R = 14 + k * 11; return `<path d="M${R * .7} ${-R * .7} A${R} ${R} 0 0 1 ${R * .7} ${R * .7}" fill="none" stroke="${INK}" stroke-width="8" stroke-linecap="round"/><path d="M${R * .7} ${-R * .7} A${R} ${R} 0 0 1 ${R * .7} ${R * .7}" fill="none" stroke="${c}" stroke-width="4" stroke-linecap="round"/>`; }).join(''), x, y, r, s);
  const goutte = (x, y, s, p, r = 0) => place(deux([[0, -16], [10, 2], [8, 12], [0, 16], [-8, 12], [-10, 2]], [[0, -16], [0, 16], [-8, 12], [-10, 2]], p[1], p[2], 2.4) + poly([[-4, 0], [-1, -8], [-1, 4]], p[0]), x, y, r, s);
  const eclair = (x, y, s, c, r = 0) => place(deux([[6, -36], [-12, 4], [0, 4], [-8, 36], [16, -6], [4, -6], [14, -36]], [[6, -36], [-12, 4], [0, 4], [-8, 36], [4, -6], [14, -36]], '#ffffff', c, 2.8), x, y, r, s);
  const impact = (x, y, p, s = 1) => place(deux([[0, -20], [6, -6], [20, 0], [6, 6], [0, 20], [-6, 6], [-20, 0], [-6, -6]], [[0, -20], [6, -6], [0, 0], [-6, 6], [-20, 0], [-6, -6]], p[0], p[2], 2.6), x, y, 0, s);
  const coeur = (x, y, s, c1 = RUB_C, c2 = RUB_S) => place(deux([[0, 34], [-34, 2], [-34, -18], [-18, -30], [0, -18], [18, -30], [34, -18], [34, 2]], [[0, 34], [-34, 2], [-34, -18], [-18, -30], [0, -18]], c1, c2, 3.2)
    + poly([[-26, -14], [-18, -24], [-12, -16]], '#ffd2cc'), x, y, 0, s);
  const plus = (x, y, s, c = '#fff3d2') => place(`<path d="M0 -12 L0 12 M-12 0 L12 0" stroke="${INK}" stroke-width="10" stroke-linecap="round"/><path d="M0 -12 L0 12 M-12 0 L12 0" stroke="${c}" stroke-width="5" stroke-linecap="round"/>`, x, y, 0, s);
  const trajet = (d, c) => `<path d="${d}" fill="none" stroke="${INK}" stroke-width="7" stroke-dasharray="10 9" stroke-linecap="round"/><path d="${d}" fill="none" stroke="${c}" stroke-width="3.4" stroke-dasharray="10 9" stroke-linecap="round"/>`;
  const fleche = (d, c, x, y, r) => trait(d, c, 5, 10) + place(poly([[0, -12], [16, 0], [0, 12], [3, 0]], c) + encre([[0, -12], [16, 0], [0, 12], [3, 0]], 2.6), x, y, r);
  const cible = (x, y, s = 1) => place(`<circle r="24" fill="none" stroke="${INK}" stroke-width="10"/><circle r="24" fill="none" stroke="${RUB_C}" stroke-width="5"/><circle r="10" fill="${RUB_S}" stroke="${INK}" stroke-width="3"/><circle r="4" fill="#ffd2cc"/>`
    + `<path d="M0 -36 L0 -28 M0 28 L0 36 M-36 0 L-28 0 M28 0 L36 0" stroke="${INK}" stroke-width="7" stroke-linecap="round"/><path d="M0 -36 L0 -28 M0 28 L0 36 M-36 0 L-28 0 M28 0 L36 0" stroke="${RUB_C}" stroke-width="3" stroke-linecap="round"/>`, x, y, 0, s);
  const cercleAppel = (x, y, s, c) => place(`<ellipse rx="50" ry="15" fill="${c}" opacity=".3"/><ellipse rx="50" ry="15" fill="none" stroke="${INK}" stroke-width="10"/><ellipse rx="50" ry="15" fill="none" stroke="${OR_C}" stroke-width="4.6"/><path d="M-44 -7 A50 15 0 0 1 30 -12" fill="none" stroke="${OR_V}" stroke-width="1.6"/>`
    + croix(-50, 0, .9) + croix(50, 0, .9) + croix(0, 15, .9), x, y, 0, s);
  const sol = (y, x0 = 26, x1 = 174) => deux([[x0, y], [x1, y], [x1 - 8, y + 24], [x0 + 8, y + 24]], [[x0, y], [x1, y], [x1 - 4, y + 8], [x0 + 4, y + 8]], '#d9c4a6', '#7c6856', 3);

  const bague = (x, y, r = 0, w = 9) => place(deux([[-w, -4], [w, -4], [w, 4], [-w, 4]], [[-w, -4], [0, -4], [0, 4], [-w, 4]], OR_C, OR_S, 2.4), x, y, r);
  const lanterne = (p, x, y, s = 1, r = 0) => place(
    trait('M0 0 L0 13', OR_C, 2.2, 5.4) + `<path d="M-2 4 L2 4 M-2 9 L2 9" stroke="${INK}" stroke-width="1.4"/>`
    + trait('M-7 15 Q-17 5 -21 12 Q-24 21 -15 21', OS_C, 3.4, 7.4) + trait('M7 15 Q17 5 21 12 Q24 21 15 21', OS_C, 3.4, 7.4)
    + deux([[-10, 12], [10, 12], [12, 19], [-12, 19]], [[-10, 12], [0, 12], [0, 19], [-12, 19]], OR_C, OR_S, 2.2)
    + deux([[-11, 19], [11, 19], [9, 40], [0, 47], [-9, 40]], [[-11, 19], [0, 19], [0, 47], [-9, 40]], OR_C, OR_S, 2.6)
    + poly([[-7, 23], [7, 23], [6, 37], [0, 42], [-6, 37]], p[1]) + poly([[-7, 23], [0, 23], [0, 42], [-6, 37]], p[0])
    + poly([[0, 26], [3, 32], [0, 38], [-3, 32]], '#ffffff') + encre([[-7, 23], [7, 23], [6, 37], [0, 42], [-6, 37]], 1.6)
    + deux([[-4, 46], [4, 46], [0, 55]], [[-4, 46], [0, 46], [0, 55]], OR_C, OR_S, 2), x, y, r, s);
  const CROCHET = 'M0 -62 L0 -90 Q0 -122 28 -122 Q54 -122 52 -98 Q50 -80 34 -80';
  function houlette(p, o = {}) {
    return [
      deux([[-6, -62], [6, -62], [6, 66], [-6, 66]], [[-6, -62], [0, -62], [0, 66], [-6, 66]], BOIS_C, BOIS_S, 3),
      `<path d="M-3 -56 L-3 -20 M-3 32 L-3 60" stroke="#ffffff" stroke-width="1.4" opacity=".8"/>`,
      deux([[-7, -14], [7, -14], [7, 26], [-7, 26]], [[-7, -14], [0, -14], [0, 26], [-7, 26]], NUIT_C, NUIT, 2.6), croix(0, -3, .6), croix(0, 6, .6), croix(0, 15, .6),
      `<path d="${CROCHET}" fill="none" stroke="${INK}" stroke-width="16" stroke-linecap="round" stroke-linejoin="round"/>`,
      `<path d="${CROCHET}" fill="none" stroke="${MET}" stroke-width="11" stroke-linecap="round" stroke-linejoin="round"/>`,
      `<path d="M-3 -64 L-3 -90 Q-3 -119 27 -119" fill="none" stroke="${MET_C}" stroke-width="4"/>`,
      `<path d="M2.5 -66 L2.5 -90 Q2.5 -117 29 -117 Q49 -117 48 -100" fill="none" stroke="${p[1]}" stroke-width="1.8"/>`,
      bague(0, -62, 0, 9), bague(7, -113.5, 39.5, 8.5), bague(43, -81, 90, 7), bague(0, -17, 0, 8.5), bague(0, 29, 0, 8.5),
      deux([[-5, 66], [5, 66], [4, 76], [-4, 76]], [[-5, 66], [0, 66], [0, 76], [-4, 76]], MET_C, MET, 2.4),
      o.sansLanterne ? '' : lanterne(p, 36, -80),
    ].join('');
  }

  const corne = k => { const d = `M${k * 10} -16 Q${k * 30} -36 ${k * 40} -18 Q${k * 48} 2 ${k * 32} 6 Q${k * 20} 8 ${k * 22} -4`; return trait(d, OS_S, 9.4, 14) + `<path d="${d}" fill="none" stroke="${OS_C}" stroke-width="3.6" stroke-dasharray="4 4"/>`; };
  const FACE = [[-15, -20], [15, -20], [19, -2], [11, 24], [0, 30], [-11, 24], [-19, -2]];
  const grouk = (x, y, s = 1, oeil = INK, r = 0) => place(
    corne(-1) + corne(1)
    + deux([[-17, -6], [-31, -1], [-18, 5]], [[-17, -6], [-31, -1], [-20, 0]], GR_C, GR_S, 2.4) + deux([[17, -6], [31, -1], [18, 5]], [[17, -6], [31, -1], [20, 0]], GR_C, GR_S, 2.4)
    + deux(FACE, [[-15, -20], [0, -20], [0, 30], [-11, 24], [-19, -2]], GR_C, GR_S, 3)
    + deux([[-14, -22], [-5, -30], [6, -29], [14, -21], [6, -12], [-6, -12]], [[-14, -22], [-5, -30], [0, -29], [0, -12], [-6, -12]], GR_S, GR_O, 2.4)
    + poly([[-13, -4], [-5, -2], [-8, 2]], oeil) + poly([[13, -4], [5, -2], [8, 2]], oeil) + encre([[-13, -4], [-5, -2], [-8, 2]], 1.4) + encre([[13, -4], [5, -2], [8, 2]], 1.4)
    + deux([[-8, 15], [8, 15], [6, 25], [0, 28], [-6, 25]], [[-8, 15], [0, 15], [0, 28], [-6, 25]], '#9a6a48', GR_O, 2.2)
    + `<path d="M-4 20 L-2 22 M4 20 L2 22" stroke="${INK}" stroke-width="2.4" stroke-linecap="round"/>`, x, y, r, s);
  const AILE_H = [[-6, -6], [-30, -40], [-54, -46], [-42, -24], [-54, -18], [-36, -8], [-42, 0], [-10, 8]];
  const AILE_P = [[-6, -8], [-40, -16], [-68, -12], [-50, -4], [-60, 4], [-36, 4], [-10, 8]];
  const glym = (x, y, s = 1, c = CRISTAL, plane = false, r = 0) => {
    const A = plane ? AILE_P : AILE_H;
    const blanc = plane ? [[-40, -16], [-68, -12], [-50, -4], [-38, -8]] : [[-30, -40], [-54, -46], [-42, -24], [-34, -26]];
    const aile = k => { const f = k < 0 ? a => a : mir; return poly(f(A), NUIT) + poly(f(blanc), OS_C) + encre(f(A), 2.8); };
    return place(
      deux([[-4, 20], [4, 20], [3, 44], [0, 48], [-3, 44]], [[-4, 20], [0, 20], [0, 48], [-3, 44]], NUIT_C, NUIT, 2.4)
      + aile(-1) + aile(1)
      + deux([[0, -22], [10, -12], [12, 8], [5, 24], [-5, 24], [-12, 8], [-10, -12]], [[0, -22], [0, 24], [-5, 24], [-12, 8], [-10, -12]], NUIT_C, NUIT, 3)
      + poly([[-7, 4], [7, 4], [4, 18], [-4, 18]], OS_C)
      + losange(0, -6, 7.5, c, '#ffffff', NUIT)
      + deux([[0, -36], [9, -28], [7, -19], [-7, -19], [-9, -28]], [[0, -36], [0, -19], [-7, -19], [-9, -28]], NUIT_C, NUIT, 2.6)
      + `<circle cx="-4" cy="-28" r="1.8" fill="${c}"/><circle cx="4" cy="-28" r="1.8" fill="${c}"/>`
      + deux([[-3.5, -23], [3.5, -23], [0, -14]], [[-3.5, -23], [0, -23], [0, -14]], OR_V, OR_C, 1.8), x, y, r, s);
  };
  const molh = (x, y, s = 1, oeil = CRISTAL, pattes = true) => place(
    (pattes ? deux([[-46, 8], [-26, 8], [-26, 32], [-48, 32]], [[-46, 8], [-36, 8], [-36, 32], [-48, 32]], PI, PI_S, 3) + deux([[26, 8], [46, 8], [48, 32], [26, 32]], [[26, 8], [36, 8], [36, 32], [26, 32]], PI, PI_S, 3) : '')
    + deux([[-54, 16], [-50, -10], [-30, -34], [0, -42], [30, -34], [50, -10], [54, 16]], [[-54, 16], [-50, -10], [-30, -34], [0, -42], [-6, -2], [-22, 16]], PI_C, PI, 3.4)
    + `<path d="M-30 -34 L-22 -6 L-50 -10 M-22 -6 L0 -42 M-22 -6 L22 -4 L30 -34 M22 -4 L50 -10 M0 -42 L22 -4" stroke="${INK}" stroke-width="2" opacity=".5" fill="none"/>`
    + croix(-12, -24, .8) + croix(10, -24, .8)
    + deux([[-18, -2], [18, -2], [22, 16], [12, 30], [-12, 30], [-22, 16]], [[-18, -2], [0, -2], [0, 30], [-12, 30], [-22, 16]], PI, PI_S, 3)
    + poly([[-14, 8], [-4, 10], [-11, 14]], oeil) + poly([[14, 8], [4, 10], [11, 14]], oeil)
    + deux([[-11, 24], [-6, 24], [-10, 40]], [[-11, 24], [-8.5, 24], [-10, 40]], OS_C, OS_S, 2) + deux([[6, 24], [11, 24], [10, 40]], [[6, 24], [8.5, 24], [10, 40]], OS_C, OS_S, 2), x, y, 0, s);
  const groukGalop = (x, y, s = 1, r = 0, c = [GR_C, GR_S], oeil = INK, laisse = false) => {
    const patte = (a, sab, cl, so) => deux(a, [a[0], a[1], a[a.length - 1]], cl, so, 2.8) + deux(sab, [sab[0], sab[1], sab[3]], '#6a4c40', '#2b1d1a', 2.2);
    const avant = (dx, dy, cl, so) => patte([[10 + dx, 0 + dy], [26 + dx, 4 + dy], [50 + dx, 26 + dy], [42 + dx, 33 + dy]], [[50 + dx, 26 + dy], [42 + dx, 33 + dy], [47 + dx, 40 + dy], [57 + dx, 32 + dy]], cl, so);
    const arriere = (dx, dy, cl, so) => patte([[-42 + dx, -2 + dy], [-26 + dx, 6 + dy], [-58 + dx, 32 + dy], [-68 + dx, 25 + dy]], [[-58 + dx, 32 + dy], [-68 + dx, 25 + dy], [-75 + dx, 30 + dy], [-65 + dx, 39 + dy]], cl, so);
    return place(
      arriere(8, -4, GR_S, GR_O) + avant(-8, -2, GR_S, GR_O)
      + deux([[-50, 2], [-46, -18], [-20, -28], [14, -27], [30, -14], [28, 6], [10, 16], [-30, 16]], [[-50, 2], [-46, -18], [-20, -28], [14, -27], [8, -8], [-30, 4]], c[0], c[1], 3)
      + `<path d="M-38 -14 Q-34 -6 -28 -8 M-24 -20 Q-20 -12 -14 -14 M-10 -20 Q-6 -12 0 -14" stroke="${GR_O}" stroke-width="2.4" fill="none" stroke-linecap="round"/>`
      + deux([[-50, -8], [-64, -16], [-58, -2]], [[-50, -8], [-64, -16], [-56, -8]], c[0], c[1], 2.2)
      + arriere(0, 0, c[0], c[1]) + avant(0, 0, c[0], c[1])
      + deux([[20, -20], [40, -24], [56, -12], [66, 6], [60, 16], [46, 14], [28, 4], [18, -6]], [[20, -20], [40, -24], [56, -12], [36, -2], [18, -6]], c[0], c[1], 3)
      + poly([[58, 4], [66, 6], [60, 16], [54, 13]], '#9a6a48') + encre([[58, 4], [66, 6], [60, 16], [54, 13]], 1.8)
      + poly([[40, -10], [50, -7], [42, -3]], oeil) + encre([[40, -10], [50, -7], [42, -3]], 1.4)
      + trait('M40 -24 Q20 -32 18 -14 Q17 1 30 1 Q40 0 37 -9', OS_S, 8.4, 13) + `<path d="M40 -24 Q20 -32 18 -14 Q17 1 30 1 Q40 0 37 -9" fill="none" stroke="${OS_C}" stroke-width="3.2" stroke-dasharray="4 4"/>`
      + (laisse ? trait('M14 -24 Q8 -8 16 8', CUIR_S, 7, 12) + trait('M10 -18 C-6 -46 -24 -26 -50 -42', CUIR_S, 4.4, 9.4)
        + `<path d="M-50 -42 L-57 -50 M-50 -42 L-60 -41 M-50 -42 L-55 -34" stroke="${INK}" stroke-width="5" stroke-linecap="round"/><path d="M-50 -42 L-57 -50 M-50 -42 L-60 -41 M-50 -42 L-55 -34" stroke="${CUIR_C}" stroke-width="2.2" stroke-linecap="round"/>`
        + `<circle cx="10" cy="-18" r="5.5" fill="none" stroke="${INK}" stroke-width="7"/><circle cx="10" cy="-18" r="5.5" fill="none" stroke="${OR_C}" stroke-width="3.2"/>` : ''), x, y, r, s);
  };
  const groukHurle = (x, y, s = 1, r = 0) => {
    const croc = a => poly(a, OS_C) + encre(a, 1.6);
    const CORNE = 'M-12 -38 Q-36 -46 -47 -26 Q-54 -6 -40 5 Q-26 12 -23 -2 Q-21 -13 -32 -13';
    return place(
      trait('M-18 -34 Q-24 -60 -46 -58', OS_S, 9, 14) + `<path d="M-18 -34 Q-24 -60 -46 -58" fill="none" stroke="${OS_C}" stroke-width="3.2" stroke-dasharray="4 4"/>`
      + deux([[-30, 18], [-36, 58], [20, 58], [18, 10]], [[-30, 18], [-36, 58], [-6, 58], [-6, 16]], GR_C, GR_S, 3)
      + `<path d="M-36 58 L-29 50 L-22 59 L-14 50 L-6 59 L2 50 L10 59 L20 58" fill="${GR_S}" stroke="${INK}" stroke-width="2.4" stroke-linejoin="round"/>`
      + deux([[12, 4], [42, -28], [50, -20], [26, 16]], [[12, 4], [42, -28], [46, -24], [19, 10]], GR_C, GR_S, 2.8)
      + poly([[10, -10], [38, -52], [46, -24], [14, 4]], '#5a1e22') + poly([[16, -10], [34, -42], [40, -26], [18, -2]], '#8a2e30')
      + croc([[36, -21], [40, -26], [32, -30]]) + croc([[27, -12], [31, -17], [23, -21]])
      + deux([[-34, 10], [-36, -14], [-22, -34], [0, -42], [14, -34], [20, -12], [16, 12], [-4, 26], [-24, 24]], [[-34, 10], [-36, -14], [-22, -34], [0, -42], [-6, 0], [-24, 24]], GR_C, GR_S, 3.2)
      + deux([[2, -38], [16, -58], [30, -64], [40, -54], [30, -30], [16, -18]], [[2, -38], [16, -58], [30, -64], [22, -38], [16, -18]], GR_C, GR_S, 3.2)
      + poly([[24, -65], [33, -65], [40, -55], [32, -55]], '#9a6a48') + encre([[24, -65], [33, -65], [40, -55], [32, -55]], 1.8)
      + croc([[34, -45], [29, -40], [37, -38]]) + croc([[27, -34], [22, -29], [30, -27]])
      + poly([[-2, -26], [12, -32], [9, -22]], INK) + `<path d="M-4 -31 L13 -37" stroke="${GR_O}" stroke-width="3" stroke-linecap="round"/>`
      + trait(CORNE, OS_S, 10, 15) + `<path d="${CORNE}" fill="none" stroke="${OS_C}" stroke-width="4" stroke-dasharray="4.5 4.5"/>`, x, y, r, s);
  };
  const mur = (x, y, s = 1) => {
    const M = [[-24, 30], [-24, -22], [-18, -22], [-18, -30], [-6, -30], [-6, -22], [6, -22], [6, -30], [18, -30], [18, -22], [24, -22], [24, 30]];
    return place(poly(M, '#a8937d') + poly([[-24, 30], [-24, -22], [-18, -22], [-18, -30], [-6, -30], [-6, -22], [0, -22], [0, 30]], '#efe2c8')
      + `<path d="M-24 -10 L24 -10 M-24 4 L24 4 M-24 18 L24 18 M-8 -22 L-8 -10 M10 -22 L10 -10 M-14 -10 L-14 4 M4 -10 L4 4 M-6 4 L-6 18 M14 4 L14 18 M-14 18 L-14 30 M6 18 L6 30" stroke="${INK}" stroke-width="2.2"/>`
      + encre(M, 3.2), x, y, 0, s);
  };

  const croc = (x, y, s = 1, r = 0) => place(
    deux([[-10, 0], [10, 0], [9, 16], [4, 34], [-2, 48], [-3, 34], [-8, 16]], [[-10, 0], [0, 0], [-2, 48], [-3, 34], [-8, 16]], OS_C, OS_S, 2.8)
    + deux([[-11, -7], [11, -7], [10, 1], [-10, 1]], [[-11, -7], [0, -7], [0, 1], [-10, 1]], OR_C, OR_S, 2.4), x, y, r, s);
  const gueule = (x, y, s, c, ouv = 18, r = 0, oeil = '#ffffff') => {
    const dentsH = [-12, 6, 22].map(d => poly([[d - 5, -6], [d + 5, -6], [d, 6]], c[3]) + encre([[d - 5, -6], [d + 5, -6], [d, 6]], 1.8)).join('')
      + poly([[32, -8], [42, -10], [38, 14]], c[3]) + encre([[32, -8], [42, -10], [38, 14]], 2);
    const bas = poly([[-2, 0], [12, 0], [80, 2], [76, 12], [50, 20], [16, 16]], c[2]) + poly([[-2, 0], [12, 0], [80, 2], [40, 6]], c[1]) + encre([[-2, 0], [12, 0], [80, 2], [76, 12], [50, 20], [16, 16]], 2.8)
      + [28, 46].map(d => poly([[d - 4, 2], [d + 4, 2], [d, -9]], c[3]) + encre([[d - 4, 2], [d + 4, 2], [d, -9]], 1.8)).join('')
      + poly([[66, 2], [74, 2], [71, -14]], c[3]) + encre([[66, 2], [74, 2], [71, -14]], 2);
    return place(place(bas, -40, 4, ouv) + dentsH
      + deux([[-44, 0], [-36, -22], [-10, -34], [20, -30], [42, -16], [46, -6], [-30, -4]], [[-44, 0], [-36, -22], [-10, -34], [20, -30], [42, -16], [-20, -16]], c[0], c[1], 3)
      + losange(-8, -20, 5.5, oeil, '#ffffff', c[2]), x, y, r, s);
  };
  const plume = (x, y, s = 1, r = 0, c = MET_C) => place(
    deux([[0, -44], [8, -26], [9, 6], [4, 28], [-4, 28], [-9, 6], [-8, -26]], [[0, -44], [0, 28], [-4, 28], [-9, 6], [-8, -26]], NUIT_C, NUIT, 2.8)
    + deux([[0, -44], [8, -26], [8.6, -12], [-8.6, -12], [-8, -26]], [[0, -44], [0, -12], [-8.6, -12], [-8, -26]], '#ffffff', c, 2.4)
    + `<path d="M0 -8 L0 26" stroke="${c}" stroke-width="1.6"/><path d="M-9 4 L-3 0 M-9 16 L-3 12 M9 4 L3 0 M9 16 L3 12" stroke="${INK}" stroke-width="1.8"/>`
    + trait('M0 28 L0 42', OR_C, 2.6, 6.4), x, y, r, s);
  const galet = (x, y, s = 1, c1 = PI_C, c2 = PI, r = 0) => place(deux([[-20, -10], [-8, -20], [12, -18], [22, -4], [16, 14], [-2, 20], [-18, 12]], [[-20, -10], [-8, -20], [12, -18], [0, 0], [-2, 20], [-18, 12]], c1, c2, 3)
    + poly([[-8, -20], [12, -18], [2, -11]], '#ffffff', 'opacity=".55"'), x, y, r, s);
  const charbon = (x, y, s, p, r = 0) => galet(x, y, s, '#6a4c40', '#3a2a26', r) + place(`<path d="M-14 -4 L-4 2 L4 -8 L14 -2 M-4 2 L0 14" stroke="${INK}" stroke-width="5" fill="none" stroke-linejoin="round"/><path d="M-14 -4 L-4 2 L4 -8 L14 -2 M-4 2 L0 14" stroke="${p[1]}" stroke-width="2.6" fill="none" stroke-linejoin="round"/><path d="M-4 2 L4 -8" stroke="${p[0]}" stroke-width="1.2"/>`, x, y, r, s);
  const fumee = (x, y, s) => place([[0, 0, 1], [-16, 10, .7], [14, 12, .6]].map(([a, b, k]) => place(deux([[-14, 0], [-8, -12], [6, -12], [14, 0], [8, 10], [-8, 10]], [[-14, 0], [-8, -12], [6, -12], [0, 0], [-8, 10]], '#e6eef8', '#9fb2c8', 2.6), a, b, 0, k)).join(''), x, y, 0, s);
  const main = (x, y, s = 1, r = 0) => place(
    deux([[-20, 34], [-22, 6], [-34, -8], [-30, -16], [-16, -6], [-16, -34], [-8, -36], [-6, -12], [-4, -40], [4, -40], [6, -12], [8, -36], [16, -34], [16, -10], [18, -28], [26, -26], [24, 4], [20, 34]],
      [[-20, 34], [-22, 6], [-34, -8], [-30, -16], [-16, -6], [-16, -34], [-8, -36], [-6, -12], [-4, -40], [0, -40], [0, 34]], PEAU_C, PEAU_S, 3)
    + `<path d="M-6 -12 L-6 2 M6 -12 L6 2 M16 -10 L15 2" stroke="${INK}" stroke-width="2" opacity=".6"/>`
    + [[-12, -35], [0, -40], [12, -35], [22, -27]].map(([a, b]) => poly([[a - 3, b + 2], [a + 3, b + 2], [a, b - 6]], OS_C) + encre([[a - 3, b + 2], [a + 3, b + 2], [a, b - 6]], 1.6)).join('')
    + deux([[-22, 32], [22, 32], [22, 44], [-22, 44]], [[-22, 32], [0, 32], [0, 44], [-22, 44]], OR_C, OR_S, 2.8), x, y, r, s);
  const collier = (x, y, s = 1, brise = false, r = 0) => {
    const anneau = `<circle cx="0" cy="34" r="9" fill="none" stroke="${INK}" stroke-width="8"/><circle cx="0" cy="34" r="9" fill="none" stroke="${OR_C}" stroke-width="3.8"/>`;
    const boucle = deux([[-34, 2], [-22, 2], [-22, 16], [-34, 16]], [[-34, 2], [-28, 2], [-28, 16], [-34, 16]], OR_C, OR_S, 2.4);
    const d = brise ? 'M-14 -20 A36 22 0 1 0 14 -20' : 'M0 -22 A36 22 0 1 0 0.1 -22';
    const bouts = brise ? [-1, 1].map(k => poly([[k * 8, -26], [k * 14, -14], [k * 20, -24], [k * 16, -16]], CUIR_S) + encre([[k * 8, -26], [k * 14, -14], [k * 20, -24]], 2)).join('') : '';
    return place(anneau + trait(d, CUIR_S, 12, 17, 'stroke-linecap="butt"') + bouts + `<path d="M${brise ? -16 : -4} -20 A36 22 0 0 0 -35 -5" fill="none" stroke="${CUIR_C}" stroke-width="4"/>`
      + boucle + croix(24, 14, .7) + croix(34, 0, .7), x, y, r, s);
  };
  const cristal = (x, y, s = 1, r = 0, fendu = false) => place(poly([[0, -16], [11, -3], [6, 16], [-8, 13], [-11, -4]], '#209fec') + poly([[0, -16], [11, -3], [1, 0]], '#e6fbff') + poly([[-11, -4], [0, -16], [1, 0]], '#6fe0f2') + poly([[1, 0], [6, 16], [-8, 13]], '#113f8a')
    + (fendu ? `<path d="M-2 -16 L3 -4 L-3 3 L3 14" stroke="${INK}" stroke-width="3" fill="none"/>` : '') + encre([[0, -16], [11, -3], [6, 16], [-8, 13], [-11, -4]], 2.4), x, y, r, s);
  const oreille = (x, y, s = 1, r = 0) => place(deux([[-16, 30], [-12, 0], [0, -42], [12, -2], [16, 30]], [[-16, 30], [-12, 0], [0, -42], [0, 30]], GR_C, GR_S, 3)
    + poly([[-7, 24], [-5, 0], [0, -26], [5, 0], [7, 24]], RUB_C) + poly([[0, -26], [5, 0], [7, 24], [0, 24]], RUB_S, 'opacity=".5"'), x, y, r, s);
  const oeil = (x, y, s = 1) => place(deux([[-42, 0], [-18, -18], [16, -18], [42, 0], [16, 16], [-18, 16]], [[-42, 0], [-18, -18], [16, -18], [42, 0]], OS_C, OS_S, 3)
    + `<circle r="15" fill="${RUB_S}" stroke="${INK}" stroke-width="2.6"/><path d="M0 -15 A15 15 0 0 0 -15 0 L0 0 Z" fill="${RUB_C}"/><ellipse rx="3.6" ry="12" fill="${NUIT}"/><circle cx="-6" cy="-7" r="3" fill="#ffffff"/>`
, x, y, 0, s);
  const sifflet = (x, y, s = 1, r = 0) => place(deux([[-34, -7], [22, -9], [30, 0], [22, 9], [-34, 7]], [[-34, -7], [22, -9], [30, 0], [-34, 0]], OS_C, OS_S, 2.8)
    + poly([[2, -9], [12, -9], [9, -2], [4, -2]], NUIT) + deux([[-38, -9], [-30, -9], [-30, 9], [-38, 9]], [[-38, -9], [-34, -9], [-34, 9], [-38, 9]], OR_C, OR_S, 2.4)
    + `<circle cx="-46" cy="0" r="6" fill="none" stroke="${INK}" stroke-width="6"/><circle cx="-46" cy="0" r="6" fill="none" stroke="${OR_C}" stroke-width="2.6"/>`, x, y, r, s);
  const conque = (x, y, s = 1, r = 0) => place(
    deux([[-40, 10], [-30, -10], [-8, -24], [18, -26], [36, -14], [40, 4], [26, 18], [0, 24], [-24, 22]], [[-40, 10], [-30, -10], [-8, -24], [18, -26], [36, -14], [10, -4], [-24, 6]], OS_C, OS_S, 3.2)
    + `<path d="M36 -14 Q20 -10 22 4 Q24 14 34 8 M18 -26 Q4 -12 10 8 M-8 -24 Q-14 -2 -6 18" fill="none" stroke="${INK}" stroke-width="2.2" opacity=".6"/>`
    + deux([[-40, 10], [-24, 4], [-20, 20], [-34, 24]], [[-40, 10], [-24, 4], [-28, 14]], '#ffd2cc', RUB_C, 2.4)
    + deux([[36, -14], [50, -18], [52, -10], [40, 4]], [[36, -14], [50, -18], [44, -8]], OR_C, OR_S, 2.4), x, y, r, s);
  const coquille = (x, y, s = 1, r = 0) => place(
    deux([[0, 24], [-32, -2], [-28, -20], [-14, -30], [0, -32], [14, -30], [28, -20], [32, -2]], [[0, 24], [-32, -2], [-28, -20], [-14, -30], [0, -32]], OS_C, OS_S, 3)
    + `<path d="M0 24 L-24 -16 M0 24 L-10 -28 M0 24 L8 -30 M0 24 L22 -20" stroke="${INK}" stroke-width="2" opacity=".55"/>`
    + deux([[-10, 20], [10, 20], [8, 30], [-8, 30]], [[-10, 20], [0, 20], [0, 30], [-8, 30]], OR_C, OR_S, 2.4), x, y, r, s);
  const pelage = (x, y, s = 1) => place(deux([[-44, 18], [-40, -2], [-28, -10], [-32, -20], [-14, -14], [-10, -26], [4, -14], [14, -24], [20, -10], [36, -14], [34, 2], [44, 18]],
    [[-44, 18], [-40, -2], [-28, -10], [-32, -20], [-14, -14], [-10, -26], [4, -14], [0, 18]], GR_C, GR_S, 3), x, y, 0, s);
  const museau = (x, y, s = 1) => place(
    deux([[-44, -24], [-4, -24], [22, -14], [34, -2], [30, 10], [4, 14], [-44, 20]], [[-44, -24], [-4, -24], [22, -14], [34, -2], [0, -4], [-44, -2]], GR_C, GR_S, 3)
    + deux([[24, -14], [38, -8], [38, 4], [28, 4]], [[24, -14], [38, -8], [30, -4]], NUIT_C, NUIT, 2.4)
    + poly([[-8, -14], [0, -12], [-6, -8]], INK) + `<path d="M-36 -24 L-30 -36 L-22 -24" fill="${GR_S}" stroke="${INK}" stroke-width="2.4" stroke-linejoin="round"/>`, x, y, 0, s);
  const capuche = (x, y, s = 1) => place(
    deux([[0, -36], [22, -22], [28, 10], [20, 30], [-20, 30], [-28, 10], [-22, -22]], [[0, -36], [0, 30], [-20, 30], [-28, 10], [-22, -22]], FEUILLE, '#4a9a3e', 3)
    + deux([[0, -20], [13, -8], [12, 16], [0, 22], [-12, 16], [-13, -8]], [[0, -20], [0, 22], [-12, 16], [-13, -8]], NUIT_C, NUIT, 2.4)
    + `<circle cx="-5" cy="2" r="2.4" fill="${OR_C}"/><circle cx="5" cy="2" r="2.4" fill="${OR_C}"/>`, x, y, 0, s);
  const zone = (x, y, s, c, cl) => place([[0, 0], [-22, -11], [22, -11], [-22, 11], [22, 11]].map(([a, b]) => place(poly([[0, -11], [22, 0], [0, 11], [-22, 0]], c) + poly([[0, -11], [22, 0], [0, 0], [-22, 0]], cl, 'opacity=".55"') + encre([[0, -11], [22, 0], [0, 11], [-22, 0]], 2.2), a * 1.05, b * 1.05)).join(''), x, y, 0, s);
  const serre = (x, y, s = 1, r = 0) => place(
    deux([[-9, -62], [9, -62], [10, -14], [-10, -14]], [[-9, -62], [0, -62], [0, -14], [-10, -14]], '#e8c890', '#b8894f', 3)
    + `<path d="M-9 -50 L9 -50 M-9 -38 L9 -38 M-10 -26 L10 -26" stroke="${INK}" stroke-width="2" opacity=".55"/>`
    + [-1, 0, 1].map(k => trait(k ? `M0 -14 Q${k * 28} -8 ${k * 32} 20` : 'M0 -14 L0 28', '#e8c890', 8, 13)
      + place(deux([[-4, 0], [4, 0], [k ? -k * 6 : 0, 15]], [[-4, 0], [0, 0], [k ? -k * 6 : 0, 15]], OS_C, NUIT_C, 2), k * 32, k ? 18 : 26)).join(''), x, y, r, s);

  Object.assign(IconesV3.SUJETS, {
    morsure: p => trait('M34 46 Q100 104 166 46', CUIR_C, 3.4, 8)
      + croc(70, 64, .9, 28) + croc(130, 64, .9, -28) + croc(100, 78, 1.35) + `<circle cx="100" cy="72" r="6" fill="none" stroke="${INK}" stroke-width="6"/><circle cx="100" cy="72" r="6" fill="none" stroke="${OR_C}" stroke-width="2.6"/>`
      + impact(100, 156, p, .9) + roc(60, 146, .7, 20) + roc(142, 150, .6, -30) + eclat(156, 104, .7, p[1]) + eclat(44, 104, .55, p[0]),
    griffe_d_ecume: p => [-32, 0, 32].map(d => place(`<path d="M0 -54 Q24 0 -10 54 Q8 0 0 -54 Z" fill="#ffffff" stroke="${INK}" stroke-width="3.4" stroke-linejoin="round"/><path d="M2 -40 Q14 0 -4 40" fill="none" stroke="${p[1]}" stroke-width="3.4"/>`, 100 + d, 100 + d * .2, 28, 1)).join('')
      + bulle(150, 48, 7) + bulle(162, 64, 4.5) + bulle(126, 40, 4) + bulle(48, 154, 6) + bulle(66, 162, 4) + goutte(160, 128, .6, p) + goutte(44, 70, .5, p),

    fronde_rougie: p => fumee(66, 142, 1) + fumee(42, 166, .7)
      + `<path d="M58 140 Q90 120 112 98" fill="none" stroke="${p[2]}" stroke-width="12" stroke-linecap="round" opacity=".6"/>`
      + flamme(150, 50, .62, p) + charbon(112, 98, 1.9, p, 12) + eclat(162, 120, .8, p[1]) + eclat(150, 54, .6, p[0]),
    fronde_du_vent: p => croissant(100, 102, 62, -2.6, .9, p[1], p[0], 1.2) + croissant(100, 102, 62, .55, 3.9, p[2], p[1], 1.2)
      + `<circle cx="100" cy="102" r="62" fill="none" stroke="${INK}" stroke-width="2" stroke-dasharray="6 7" opacity=".6"/>`
      + trait('M100 104 L146 62', CUIR_C, 3, 7.4) + trait('M100 104 L156 72', CUIR_C, 3, 7.4)
      + place(deux([[-12, -6], [12, -6], [10, 6], [-10, 6]], [[-12, -6], [0, -6], [0, 6], [-10, 6]], CUIR_C, CUIR_S, 2.6), 154, 64, -42) + galet(160, 58, .85, '#ffffff', p[2])
      + `<circle cx="100" cy="104" r="9" fill="none" stroke="${INK}" stroke-width="8"/><circle cx="100" cy="104" r="9" fill="none" stroke="${OR_C}" stroke-width="3.8"/>` + eclat(56, 64, .7, p[0]) + eclat(64, 150, .55, p[1]),

    gueule_d_ecume: p => gueule(104, 100, 1.45, [p[0], p[1], p[2], '#ffffff'], 26, -6, CRISTAL)
      + bulle(48, 70, 8) + bulle(40, 92, 5) + bulle(56, 140, 6) + bulle(160, 150, 5) + goutte(150, 44, .6, p) + goutte(166, 120, .5, p),
    crocs_de_braise: p => flamme(66, 44, .55, p) + flamme(110, 36, .7, p) + flamme(146, 50, .5, p)
      + gueule(104, 108, 1.45, ['#6a4c40', '#4a3430', '#2b1d1a', p[1]], 14, -6, p[0])
      + `<path d="M58 92 L72 96 L82 88 M92 84 L104 90" fill="none" stroke="${p[1]}" stroke-width="2.6" stroke-linecap="round"/>` + eclat(160, 150, .7, p[1]) + eclat(46, 150, .55, p[0]),

    plume_de_glym: p => croissant(84, 120, 48, 1.6, 3.5, p[2], p[1], 1.25) + plume(108, 94, 1.55, 45, p[1]) + eclat(158, 46, 1, '#ffffff', p[1]) + eclat(140, 72, .5, p[0]) + eclat(50, 150, .6, p[1]),
    patte_lourde: p => main(76, 110, 1.4, 70) + impact(154, 94, p, 1.2) + chevrons(160, 150, .7, p[1]) + roc(150, 54, .7, 10) + roc(168, 74, .55, -20),

    appel_du_grouk: p => cercleAppel(100, 150, 1.05, p[1]) + grouk(100, 104, 1.55) + eclat(42, 74, .7, p[1]) + eclat(158, 74, .7, p[1]) + eclat(150, 128, .5, p[0]),
    grouk_lache: p => vitesse(62, 74, .6, p[1], 16) + fumee(30, 132, .55) + fumee(48, 150, .4) + cercleAppel(120, 158, .74, p[1]) + groukGalop(112, 108, .98, 16, [GR_C, GR_S], INK, true) + eclat(160, 64, .6, p[0]),

    appel_du_pilou: p => cercleAppel(100, 154, 1.05, p[1]) + glym(100, 110, 1.35) + eclat(44, 140, .6, p[1]) + eclat(156, 140, .6, p[1]),
    envol_du_glym: p => mur(64, 126, .95) + cercleAppel(130, 156, .55, p[1]) + trajet('M30 98 Q56 28 104 58 Q136 82 132 146', p[1]) + glym(104, 70, .95, CRISTAL, true, 8),

    appel_du_molh: p => cercleAppel(100, 150, 1.12, p[1]) + molh(100, 108, 1.25) + roc(36, 128, .7, 10) + roc(166, 132, .65, -30) + roc(150, 60, .5, 40),
    molh_de_rempart: p => roc(158, 62, .8, 20) + roc(168, 96, .6, -30) + roc(134, 44, .5, 40)
      + molh(108, 116, 1.05, CRISTAL, false)
      + deux([[30, 136], [64, 130], [80, 150], [136, 150], [150, 130], [170, 136], [170, 142], [148, 160], [52, 160], [30, 142]], [[30, 136], [64, 130], [80, 150], [136, 150], [150, 130], [170, 136], [168, 142], [32, 142]], '#d9c4a6', '#7c6856', 3)
      + roc(70, 136, .75, -30, '#d9c4a6', '#7c6856') + roc(146, 134, .7, 30, '#d9c4a6', '#7c6856')
      + place(deux([[-22, -24], [22, -24], [22, 2], [0, 26], [-22, 2]], [[-22, -24], [0, -24], [0, 26], [-22, 2]], OR_C, OR_S, 3.2) + `<path d="M-16 -18 L16 -18 L16 0 L0 18 L-16 0 Z" fill="none" stroke="${OR_V}" stroke-width="2"/>`, 52, 98, -8, 1.05),

    rappel_sacrificiel: p => collier(100, 112, 1.3, true) + eclat(100, 72, 3.6, p[1], p[0]) + eclat(150, 50, .9, RUB_C, '#ffd2cc') + eclat(52, 150, .7, RUB_C, '#ffd2cc') + eclat(156, 146, .55, p[0]),
    dernier_reflux: p => Array.from({ length: 10 }, (_, k) => { const a = k / 10 * Math.PI * 2; return bulle(100 + Math.cos(a) * 62, 100 + Math.sin(a) * 58, k % 2 ? 6 : 9.5); }).join('')
      + `<ellipse cx="100" cy="100" rx="50" ry="46" fill="none" stroke="${p[1]}" stroke-width="5" stroke-dasharray="14 8" opacity=".8"/>`
      + collier(100, 108, 1.2, true) + goutte(100, 64, 1.1, p) + goutte(80, 44, .6, p) + goutte(122, 46, .6, p) + goutte(146, 150, .55, p),

    soin_de_meute: p => eclat(100, 104, 4.6, OR_C, OR_V) + lanterne(P.neutre, 100, 28, 2.3) + coeur(100, 104, .27) + croix(52, 150, 1.1) + croix(150, 150, 1.1) + croix(150, 60, .9),
    baume_de_morrha: p => grouk(100, 136, 1) + coquille(64, 58, 1.1, -40) + goutte(98, 86, .7, eau) + goutte(114, 70, .5, eau) + goutte(84, 104, .5, eau)
      + place(deux([[-14, -16], [14, -16], [14, 2], [0, 16], [-14, 2]], [[-14, -16], [0, -16], [0, 16], [-14, 2]], OR_C, OR_S, 2.6), 150, 70, 0, 1.15) + eclat(162, 108, .6, eau[1]),

    cri_de_ralliement: p => glym(46, 124, .6) + molh(154, 136, .5) + grouk(100, 90, .95, RUB_C)
      + chevrons(100, 154, .62, RUB_C, -90) + eclat(40, 60, .7, RUB_C, '#ffd2cc') + eclat(160, 60, .7, RUB_C, '#ffd2cc'),
    eperon: p => sifflet(96, 136, 1.35, -22) + ondes(124, 112, .8, p[1], 3, -60) + cristal(62, 70, 1.05, -14) + cristal(100, 52, 1.15) + cristal(140, 70, 1.05, 14),

    traque: p => trajet('M152 70 Q174 100 162 124', p[1]) + place(houlette(p), 104, 140, -28, .74) + vitesse(124, 64, .45, p[1], -20) + galet(144, 56, 1.15, '#efe2c8', '#8f7a66', 20) + impact(160, 130, p, .9) + roc(140, 156, .6, 30),
    serre_d_orage: p => eclair(150, 62, 1.05, '#c9d6e8') + galet(96, 128, 1.3, '#efe2c8', '#8f7a66') + serre(96, 98, 1.25) + eclat(48, 60, .7, p[1]) + eclat(54, 150, .5, p[0]),

    tempete_de_meute: p => zone(100, 150, 1, p[2], p[0]) + croissant(100, 98, 64, 3.3, 6.1, p[1], p[0], 1.18)
      + glym(50, 84, .55, p[0], true, 138) + glym(100, 50, .55, p[0], true, 180) + glym(150, 84, .55, p[0], true, -138),
    colere_de_la_vouivre: p => {
      const cou = 'M40 176 Q30 110 70 76 Q100 52 124 66';
      return trait(cou, p[2], 30, 36) + `<path d="M36 170 Q28 112 66 80" fill="none" stroke="${p[1]}" stroke-width="10" stroke-linecap="round"/>`
        + [[44, 140], [46, 112], [62, 88], [86, 70]].map(([a, b], k) => place(deux([[-7, 0], [0, -14], [7, 0]], [[-7, 0], [0, -14], [0, 0]], p[0], p[1], 2), a - 12, b - 6, -40 + k * 14)).join('')
        + gueule(140, 86, .95, [p[0], p[1], p[2], '#ffffff'], 30, 28, '#ffffff')
        + bulle(160, 150, 7) + bulle(146, 164, 4.5) + bulle(170, 128, 4) + cible(160, 150, 0);
    },

    gueule_de_braise: p => place(deux([[-36, 0], [-24, -6], [24, -6], [36, -2], [30, 10], [12, 20], [-14, 20], [-32, 12]], [[-36, 0], [-24, -6], [0, -6], [0, 20], [-14, 20], [-32, 12]], PEAU_C, PEAU_S, 3)
      + deux([[-36, 0], [-44, -14], [-38, -18], [-26, -6]], [[-36, 0], [-44, -14], [-38, -18]], PEAU_C, PEAU_S, 2.6) + deux([[-16, 20], [16, 20], [14, 30], [-14, 30]], [[-16, 20], [0, 20], [0, 30], [-14, 30]], OR_C, OR_S, 2.4), 72, 148, -16, 1.15)
      + flamme(78, 112, .55, p) + charbon(74, 132, .75, p)
      + gueule(122, 76, .95, [p[0], p[1], p[2], '#fff3c0'], 32, -24, '#ffffff') + eclat(160, 130, .7, p[1]),
    flot_de_meute: p => {
      const bete = (x, y, s) => place(deux([[-26, 14], [-20, -6], [-6, -16], [6, -26], [8, -14], [22, -10], [32, 2], [20, 6], [22, 14]], [[-26, 14], [-20, -6], [-6, -16], [6, -26], [8, -14], [22, -10], [0, 2]], p[0], p[1], 2.8)
        + losange(10, -4, 3.2, '#ffffff', '#ffffff', p[2]) + bulle(-30, 18, 4), x, y, 0, s);
      return bete(50, 136, .8) + bete(92, 118, 1) + bete(140, 96, 1.2) + cible(160, 150, .62) + bulle(70, 90, 5) + bulle(120, 66, 4) + bulle(34, 160, 5) + bulle(84, 158, 4) + bulle(118, 140, 5);
    },

    rage_de_la_bete: p => oeil(100, 108, 1.35) + chevrons(100, 46, .7, RUB_C, -90) + eclat(40, 66, .7, RUB_C, '#ffd2cc') + eclat(160, 150, .7, RUB_C, '#ffd2cc') + eclat(50, 150, .5, p[1]),
    chaleur_du_troupeau: p => `<circle cx="100" cy="102" r="56" fill="${GR_S}" stroke="${INK}" stroke-width="3"/>`
      + Array.from({ length: 14 }, (_, k) => { const a = k / 14 * Math.PI * 2; return `<circle cx="${100 + Math.cos(a) * 56}" cy="${102 + Math.sin(a) * 56}" r="14" fill="${k % 2 ? GR_C : '#f7e6c2'}" stroke="${INK}" stroke-width="2.6"/>`; }).join('')
      + `<circle cx="100" cy="102" r="40" fill="${GR_O}" stroke="${INK}" stroke-width="3"/>` + corne(-1).replace(/^/, '<g transform="translate(100 60) scale(.7)">') + '</g>' + `<g transform="translate(100 60) scale(.7)">${corne(1)}</g>`
      + coeur(100, 104, .78) + plus(100, 100, .6),

    fleche_de_fil: p => trait('M56 58 Q78 86 91 119', CUIR_C, 3, 7.4) + trait('M56 58 Q46 92 51 128', CUIR_C, 3, 7.4)
      + place(deux([[-18, -4], [18, -4], [14, 10], [0, 16], [-14, 10]], [[-18, -4], [0, -4], [0, 16], [-14, 10]], CUIR_C, CUIR_S, 2.8) + croix(0, 4, .7), 72, 128, -13, 1.15)
      + `<circle cx="56" cy="58" r="8" fill="none" stroke="${INK}" stroke-width="8"/><circle cx="56" cy="58" r="8" fill="none" stroke="${OR_C}" stroke-width="3.8"/>`
      + vitesse(116, 104, .8, p[1], -8) + galet(142, 98, 1.4, '#efe2c8', '#8f7a66', 20) + eclat(150, 50, .6, p[1]) + eclat(70, 168, .5, p[0]),
    charbon_de_kaldum: p => {
      const R = Array.from({ length: 16 }, (_, k) => { const a = k / 16 * Math.PI * 2 - Math.PI / 2, r = k % 2 ? 30 : (k % 4 ? 60 : 74); return [100 + Math.cos(a) * r, 98 + Math.sin(a) * r]; });
      const R2 = R.map(([x, y]) => [100 + (x - 100) * .62, 98 + (y - 98) * .62]);
      return poly(R, p[2]) + poly(R2, p[1]) + encre(R, 3)
        + [[-60, 1], [-10, .9], [40, .8], [130, .9], [200, .75]].map(([a, k]) => { const r = a * Math.PI / 180; return roc(100 + Math.cos(r) * 52, 98 + Math.sin(r) * 52, k, a, '#6a4c40', '#2b1d1a'); }).join('')
        + charbon(100, 98, 1.25, p) + eclat(100, 98, 1.1, p[0], '#ffffff');
    },

    nuee_de_plumes: p => zone(100, 150, 1, p[2], p[0]) + [[100, 96, 1], [54, 116, .78], [146, 116, .78], [78, 54, .72], [122, 54, .72]].map(([x, y, s]) => plume(x, y, s, 180, p[1])).join(''),
    brasier_de_curee: p => zone(100, 150, 1, p[2], p[0])
      + trait('M72 152 L128 132', CUIR_S, 8, 13) + trait('M72 132 L128 152', CUIR_S, 8, 13)
      + flamme(100, 110, 1.3, p) + flamme(52, 128, .6, p) + flamme(148, 128, .6, p) + flamme(70, 72, .5, p) + flamme(130, 72, .5, p),

    cuir_de_durren: p => {
      const peau = [[-36, -34], [-14, -40], [0, -32], [14, -40], [36, -34], [30, -8], [42, 12], [28, 34], [10, 28], [0, 40], [-10, 28], [-28, 34], [-42, 12], [-30, -8]];
      return place(poly(peau, GR_S) + poly([[-36, -34], [-14, -40], [0, -32], [0, 40], [-10, 28], [-28, 34], [-42, 12], [-30, -8]], GR_C)
        + `<path d="M-30 -20 Q-24 -24 -18 -18 M-26 0 Q-20 -4 -14 2 M-30 18 Q-24 14 -18 20" stroke="${GR_O}" stroke-width="2.4" fill="none"/>`
        + poly([[0, -32], [14, -40], [36, -34], [30, -8], [16, -12]], PI_C) + poly([[0, -32], [16, -12], [30, -8], [42, 12], [14, 14]], PI) + poly([[0, -32], [14, 14], [28, 34], [10, 28], [0, 40]], PI_S)
        + `<path d="M0 -32 L16 -12 L30 -8 M16 -12 L14 14 L42 12 M14 14 L28 34" stroke="${INK}" stroke-width="2" fill="none"/>`
        + encre(peau, 3.2) + croix(0, -20, .8) + croix(0, -4, .8) + croix(0, 12, .8) + croix(0, 28, .8), 100, 104, 0, 1.55)
        + eclat(44, 54, .6, p[1]) + eclat(156, 150, .6, p[1]);
    },
    cercle_de_meute: p => Array.from({ length: 8 }, (_, k) => { const a = k / 8 * Math.PI * 2 - Math.PI / 2; return croc(100 + Math.cos(a) * 46, 102 + Math.sin(a) * 46, .62, a * 180 / Math.PI - 90); }).join('')
      + `<circle cx="100" cy="102" r="44" fill="none" stroke="${INK}" stroke-width="13"/><circle cx="100" cy="102" r="44" fill="none" stroke="${CUIR_S}" stroke-width="8"/><circle cx="100" cy="102" r="44" fill="none" stroke="${CUIR_C}" stroke-width="2.4" stroke-dasharray="6 6"/>`
      + place(deux([[-20, -24], [20, -24], [20, 2], [0, 26], [-20, 2]], [[-20, -24], [0, -24], [0, 26], [-20, 2]], OR_C, OR_S, 3), 100, 102, 0, 1),

    course_de_meute: p => fumee(40, 150, .65) + glym(60, 58, .52, CRISTAL, true, -10) + groukGalop(100, 122, 1) + chevrons(148, 68, .75, FEUILLE),
    odeur_du_gibier: p => museau(70, 92, 1.1) + trait('M116 92 Q130 76 142 92 Q152 106 160 92', p[1], 4, 9, 'stroke-dasharray="1 0"') + trait('M114 108 Q128 96 138 110', p[1], 3, 8)
      + cible(142, 146, .9) + eclat(160, 58, .6, p[1]),

    hurlement_de_meute: p => [14, 26, 38].map(R => { const d = `M${124 - R * .5} ${80 - R * .87} A${R} ${R} 0 0 1 ${124 + R * .94} ${80 - R * .34}`; return trait(d, p[1], 4.4, 9.4); }).join('')
      + groukHurle(86, 124, .88, -6) + cristal(154, 142, .78, 10, true),
    laisse_d_ecume: p => {
      const corde = d => trait(d, eau[0], 7, 12.4) + `<path d="${d}" fill="none" stroke="${eau[1]}" stroke-width="2.4" stroke-dasharray="9 5 3 7" stroke-linecap="round"/>`;
      const boucle = (cx, cy, rx, ry, r, haut) => `<g transform="rotate(${r} ${cx} ${cy})">${corde(`M${cx - rx} ${cy} A${rx} ${ry} 0 0 ${haut ? 1 : 0} ${cx + rx} ${cy}`)}</g>`;
      const BOTTE = [[66, 74], [96, 74], [98, 102], [110, 110], [130, 114], [140, 119], [143, 128], [141, 134], [62, 134], [64, 116]];
      return boucle(81, 86, 24, 7, -12, true) + boucle(85, 106, 31, 9, 8, true)
        + deux([[64, 70], [98, 70], [92, 48], [80, 22], [54, 22], [60, 48]], [[64, 70], [80, 70], [74, 48], [66, 22], [54, 22], [60, 48]], NUIT_C, NUIT, 3)
        + deux(BOTTE, [[66, 74], [82, 74], [84, 106], [78, 134], [62, 134], [64, 116]], '#e8b97f', '#a8723f', 3.2)
        + poly([[98, 102], [110, 110], [130, 114], [140, 119], [114, 118]], '#f2cf9c')
        + deux([[60, 129], [142, 129], [141, 140], [61, 140]], [[60, 129], [142, 129], [142, 133], [60, 133]], '#6a4c40', '#3a2a26', 2.4)
        + deux([[62, 66], [100, 66], [98, 78], [64, 78]], [[62, 66], [81, 66], [81, 78], [64, 78]], '#f4dcb0', '#c99a6a', 2.6)
        + boucle(81, 86, 24, 7, -12, false) + boucle(85, 106, 31, 9, 8, false)
        + corde('M115 110 Q136 104 140 84 Q143 66 156 58')
        + bulle(157, 57, 7) + bulle(166, 68, 4.5) + bulle(148, 48, 4) + bulle(62, 97, 5) + bulle(108, 93, 4.5) + bulle(118, 111, 4) + bulle(139, 84, 4.5) + bulle(57, 110, 3.6)
        + place([-18, 0, 18].map(dx => `<path d="M${dx + 6} -10 L${dx - 4} 0 L${dx + 6} 10" fill="none" stroke="${INK}" stroke-width="9" stroke-linejoin="miter"/><path d="M${dx + 6} -10 L${dx - 4} 0 L${dx + 6} 10" fill="none" stroke="${FEUILLE}" stroke-width="4.4" stroke-linejoin="miter"/>`).join(''), 102, 157);
    },

    au_pied: p => place(houlette(p, { sansLanterne: true }), 62, 128, 24, .78) + grouk(120, 86, .78) + chevrons(140, 148, .8, p[1], 180) + eclat(166, 52, .6, p[1]),
    lacher_la_bete: p => {
      const arc = 'M128 94 A42 30 0 1 1 100 84';
      return trait(arc, CUIR_C, 13, 19, 'stroke-linecap="butt"') + `<path d="M126 100 A38 25 0 1 1 74 92" fill="none" stroke="#e8c890" stroke-width="2.6"/>`
        + [[60, 104], [70, 132], [96, 142]].map(([a, b]) => croix(a, b, .7)).join('')
        + [[92, 83.5], [82, 85.5]].map(([a, b]) => `<circle cx="${a}" cy="${b}" r="2.6" fill="${INK}"/>`).join('')
        + place(`<rect x="-11" y="-12" width="22" height="24" rx="2" fill="none" stroke="${INK}" stroke-width="9"/><rect x="-11" y="-12" width="22" height="24" rx="2" fill="none" stroke="${OR_C}" stroke-width="4.4"/>` + trait('M0 -10 L0 10', OR_S, 2.6, 6), 132, 98, 50)
        + `<circle cx="92" cy="148" r="8" fill="none" stroke="${INK}" stroke-width="8"/><circle cx="92" cy="148" r="8" fill="none" stroke="${OR_C}" stroke-width="3.8"/>`
        + cristal(56, 62, 1.4, -12) + chevrons(144, 138, .72, FEUILLE) + eclat(150, 60, .7, FEUILLE, '#ffffff') + eclat(48, 140, .5, p[0]);
    },

    cor_de_morrha: p => conque(86, 116, 1.35, -14) + ondes(140, 84, .95, eau[1], 3, -30) + cristal(62, 58, 1.1, -10),
    sang_de_meneur: p => collier(100, 136, 1, false) + place(deux([[0, -36], [22, 0], [18, 20], [0, 30], [-18, 20], [-22, 0]], [[0, -36], [0, 30], [-18, 20], [-22, 0]], RUB_C, RUB_S, 3.2) + poly([[-10, 2], [-3, -18], [-3, 8]], '#ffd2cc')
      + `<path d="M-12 8 L12 4" stroke="${INK}" stroke-width="3"/>` + croix(-6, 6, .7) + croix(6, 5, .7), 100, 70, 0, 1.15) + plus(152, 70, .8) + croix(48, 150, 1) + croix(154, 160, .9),

    filet: p => croissant(100, 100, 66, -2.4, .4, p[1], p[0], 1.16)
      + [[-90, 1], [30, 1], [150, 1]].map(([a]) => { const r = a * Math.PI / 180, x = 100 + Math.cos(r) * 52, y = 104 + Math.sin(r) * 52; return trait(`M100 104 L${x} ${y}`, CUIR_C, 3, 7.4) + galet(x, y, .82, '#efe2c8', '#8f7a66', a); }).join('')
      + `<circle cx="100" cy="104" r="9" fill="none" stroke="${INK}" stroke-width="8"/><circle cx="100" cy="104" r="9" fill="none" stroke="${OR_C}" stroke-width="3.8"/>`,
    place_a_la_bete: p => capuche(62, 70, 1.05) + grouk(138, 132, .75)
      + fleche('M88 52 Q148 44 150 90', p[1], 150, 92, 92) + fleche('M112 150 Q52 158 50 112', p[1], 50, 110, -88),
  });
})();

IconesV3.TYPES = Object.assign(IconesV3.TYPES || {}, {hurlement_de_meute:'degats',odeur_du_gibier:'degats',laisse_d_ecume:'degats',filet:'degats'});
