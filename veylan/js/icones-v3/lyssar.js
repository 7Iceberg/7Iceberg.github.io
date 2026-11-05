(() => {
  const { poly, encre, place, croix, eclat, roc, croissant, flamme } = IconesV3.outils;
  const { P, INK } = IconesV3;
  const OR_C = '#ffd98f', OR_S = '#a8683a', OR_V = '#fff3d2', OR = '#f3bc72';
  const MET_C = '#f1e6d2', MET_S = '#7c8db4', MET_O = '#3e4a6e';
  const PL_C = '#f7f0de', PL_S = '#c9b48e';
  const BL_C = '#c3d2e6', BL_S = '#6f80aa';
  const BOIS_C = '#c99a6a', BOIS_S = '#7a5236';
  const PIE_C = '#efe2c8', PIE_S = '#8f7a66';
  const NUIT = '#2b2238';
  const VERT = P.terre;
  const ROUGE = '#ef7574', ROUGE_S = '#b83a44';
  const feu = P.feu, eau = P.eau;

  const deux = (pts, cut, c1, c2, w = 3) => poly(pts, c2) + poly(cut, c1) + encre(pts, w);
  const trait = (d, c, w, iw = w + 4.4, o = '') => `<path d="${d}" fill="none" stroke="${INK}" stroke-width="${iw}" stroke-linecap="round" stroke-linejoin="round" ${o}/><path d="${d}" fill="none" stroke="${c}" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round" ${o}/>`;
  const gemme = (x, y, r, g = VERT) => place(poly([[0, -r], [r, 0], [0, r], [-r, 0]], g[2]) + poly([[0, -r], [r, 0], [0, 0]], g[0]) + poly([[0, -r], [-r, 0], [0, 0]], g[1]) + poly([[0, r], [-r, 0], [0, 0]], g[3]) + encre([[0, -r], [r, 0], [0, r], [-r, 0]], 2), x, y);
  const fil = (d, w = 2.4) => trait(d, OR, w, w + 3.4) + `<path d="${d}" fill="none" stroke="${OR_V}" stroke-width="${w * .35}" stroke-linecap="round"/>`;
  const pointille = (d, c, w = 3.4) => `<path d="${d}" fill="none" stroke="${INK}" stroke-width="${w + 3.6}" stroke-dasharray="10 9" stroke-linecap="round"/><path d="${d}" fill="none" stroke="${c}" stroke-width="${w}" stroke-dasharray="10 9" stroke-linecap="round"/>`;

  const plumeL = (len, w, c1, c2, sw = 2.2) => {
    const pts = [[-w, 0], [-w * .8, -len * .6], [0, -len], [w * .9, -len * .5], [w, 0]];
    return poly(pts, c2) + poly([[-w, 0], [-w * .8, -len * .6], [0, -len], [0, 0]], c1) + encre(pts, sw);
  };
  const plume = (x, y, s, r, c1 = PL_C, c2 = PL_S, c3 = BL_S) => place(
    deux([[0, -48], [12, -30], [14, -8], [8, 12], [0, 22], [-6, 14], [-12, -6], [-10, -30]], [[0, -48], [0, 22], [-6, 14], [-12, -6], [-10, -30]], c1, c2, 2.8)
    + poly([[0, -48], [12, -30], [6, -22], [0, -30]], c3, 'opacity=".55"')
    + `<path d="M-11 -14 L-4 -10 M-12 0 L-4 4 M12 -16 L4 -10 M12 0 L4 6" stroke="${INK}" stroke-width="1.6" opacity=".55"/>`
    + trait('M0 -44 L0 40', OR_C, 2.2, 5.2), x, y, r, s);

  function aile() {
    const B = [[10, -8], [36, -14], [62, -9], [84, 6], [98, 30], [86, 22], [62, 4], [36, -2], [10, 6]];
    const bleues = [[28, -12, 42, 56], [50, -11, 52, 66], [70, -5, 62, 62]]
      .map(([x, y, r, l]) => place(plumeL(l, 11, BL_C, BL_S, 2.6), x, y, r)).join('');
    const cremes = [[18, -11, 38, 38], [36, -13, 46, 40], [54, -10, 54, 36], [72, -3, 64, 28]]
      .map(([x, y, r, l]) => place(plumeL(l, 10, PL_C, PL_S, 2.6), x, y, r)).join('');
    return bleues + cremes
      + poly(B, MET_O) + poly([[10, -8], [36, -14], [62, -9], [84, 6], [98, 30], [62, -2], [36, -7], [10, -1]], OR_C)
      + poly([[10, -1], [36, -7], [62, -2], [90, 18], [86, 22], [62, 4], [36, -2], [10, 6]], BL_S)
      + encre(B, 2.8)
      + place(deux([[0, -6], [7, 0], [0, 6], [-7, 0]], [[0, -6], [7, 0], [0, 0]], OR_C, OR_S, 2), 97, 30);
  }
  function arc(p, o = {}) {
    const ty = o.tire || 30;
    const corde = o.tire ? `M-97 30 L0 ${ty} L97 30` : 'M-97 30 L97 30';
    const lg = o.fleche ? (o.fleche.len || 128) : 0;
    return fil(corde, 3)
      + aile() + `<g transform="scale(-1 1)">${aile()}</g>`
      + (o.fleche ? place(fleche(p, o.fleche), 0, ty - lg / 2) : '')
      + deux([[-13, -10], [13, -10], [13, 10], [-13, 10]], [[-13, -10], [0, -10], [0, 10], [-13, 10]], '#4a3e62', NUIT, 2.6)
      + [-13, 13].map(x => deux([[x - 3, -12], [x + 3, -12], [x + 3, 12], [x - 3, 12]], [[x - 3, -12], [x, -12], [x, 12], [x - 3, 12]], OR_C, OR_S, 2)).join('')
      + gemme(0, 0, 9);
  }

  const TETES = {
    fer: (p) => deux([[0, 0], [10, 20], [5, 28], [-5, 28], [-10, 20]], [[0, 0], [0, 28], [-5, 28], [-10, 20]], MET_C, MET_S, 2.6) + `<path d="M0 6 L0 22" stroke="${p[1]}" stroke-width="2"/>`,
    braise: () => deux([[0, -2], [12, 20], [6, 30], [-6, 30], [-12, 20]], [[0, -2], [0, 30], [-6, 30], [-12, 20]], '#fff3c0', '#ef5a2a', 2.6) + poly([[0, 8], [5, 20], [0, 26], [-5, 20]], '#ffb347'),
    silex: () => deux([[0, -4], [12, 14], [10, 30], [-10, 30], [-12, 14]], [[0, -4], [0, 30], [-10, 30], [-12, 14]], PIE_C, PIE_S, 2.6)
      + `<path d="M-11 15 L0 10 L11 15 M-10 26 L0 20 L10 26" stroke="${INK}" stroke-width="1.6" fill="none" opacity=".55"/>`,
    roc: () => deux([[0, -8], [16, 6], [18, 26], [6, 34], [-8, 34], [-18, 22], [-14, 4]], [[0, -8], [2, 16], [-8, 34], [-18, 22], [-14, 4]], PIE_C, PIE_S, 2.8)
      + `<path d="M0 -8 L2 16 L18 26 M2 16 L-8 34" stroke="${INK}" stroke-width="1.6" fill="none" opacity=".5"/>`,
    cristal: () => deux([[0, -6], [10, 14], [6, 32], [-6, 32], [-10, 14]], [[0, -6], [0, 32], [-6, 32], [-10, 14]], '#e6fcff', '#209fec', 2.6) + poly([[0, -6], [10, 14], [0, 12]], '#52d2f4'),
    emousse: () => deux([[-14, 4], [-8, -6], [8, -6], [14, 4], [6, 12], [-6, 12]], [[-14, 4], [-8, -6], [0, -6], [0, 12], [-6, 12]], '#c99a6a', '#7a5236', 2.6),
    ancre: (p) => trait('M0 6 Q-26 8 -28 30', MET_S, 6, 11) + trait('M0 6 Q26 8 28 30', MET_S, 6, 11) + `<path d="M-2 8 Q-22 10 -25 28 M2 8 Q22 10 25 28" fill="none" stroke="${MET_C}" stroke-width="2"/>`
      + deux([[-28, 30], [-36, 16], [-22, 20]], [[-28, 30], [-36, 16], [-29, 20]], MET_C, MET_S, 2.2) + deux([[28, 30], [36, 16], [22, 20]], [[28, 30], [29, 20], [22, 20]], MET_C, MET_S, 2.2)
      + deux([[0, -4], [7, 8], [0, 14], [-7, 8]], [[0, -4], [0, 14], [-7, 8]], MET_C, MET_S, 2.4)
      + deux([[-20, 40], [20, 40], [22, 47], [-22, 47]], [[-20, 40], [0, 40], [0, 47], [-22, 47]], OR_C, OR_S, 2.4),
    montagne: () => deux([[0, -50], [20, -14], [28, -20], [46, 30], [-46, 30], [-30, -4], [-22, 2]], [[0, -50], [0, 30], [-46, 30], [-30, -4], [-22, 2]], PIE_C, PIE_S, 3.2)
      + poly([[0, -50], [10, -32], [3, -26], [-4, -32], [-10, -30]], '#ffffff') + poly([[28, -20], [34, -4], [26, -8]], '#ffffff') + encre([[0, -50], [20, -14], [28, -20], [46, 30], [-46, 30], [-30, -4], [-22, 2]], 3.2),
  };
  function fleche(p, o = {}) {
    const len = o.len || 128, h = len / 2, tete = o.tete || 'fer';
    const [c1, c2] = o.plume || [VERT[1], VERT[2]];
    const base = { braise: 30, roc: 34, montagne: 34, emousse: 12, ancre: 14 }[tete] || 28;
    return deux([[-2, h - 2], [-13, h + 4], [-13, h - 12], [-2, h - 32]], [[-2, h - 2], [-13, h + 4], [-13, h - 12]], c1, c2, 2.4)
      + deux([[2, h - 2], [13, h + 4], [13, h - 12], [2, h - 32]], [[2, h - 2], [13, h - 12], [2, h - 32]], c1, c2, 2.4)
      + trait(`M0 ${h + 2} L0 ${-h + base - 2}`, o.fut || MET_C, 4.4)
      + place(deux([[-4, 0], [4, 0], [3, 6], [-3, 6]], [[-4, 0], [0, 0], [0, 6], [-3, 6]], OR_C, OR_S, 1.6), 0, h)
      + place(TETES[tete](p), 0, -h);
  }
  const F = (p, x, y, r, s = 1, o = {}) => place(fleche(p, o), x, y, r, s);
  const A = (p, x, y, r, s = 1, o = {}) => place(arc(p, o), x, y, r, s);

  const goutte = (x, y, s, p) => place(deux([[0, -16], [10, 2], [8, 12], [0, 16], [-8, 12], [-10, 2]], [[0, -16], [0, 16], [-8, 12], [-10, 2]], p[1], p[2], 2.4) + poly([[-4, 0], [-1, -8], [-1, 4]], p[0]), x, y, 0, s);
  const vague = (x, y, s, p, r = 0) => place(
    poly([[-36, 14], [-26, -4], [-8, -14], [12, -12], [26, -2], [20, 4], [8, -2], [-2, 4], [4, 14]], p[2])
    + poly([[-26, -4], [-8, -14], [12, -12], [26, -2], [20, 4], [8, -2], [-8, -4]], p[1])
    + poly([[-8, -14], [12, -12], [8, -8]], p[0])
    + encre([[-36, 14], [-26, -4], [-8, -14], [12, -12], [26, -2], [20, 4], [8, -2], [-2, 4], [4, 14]], 2.8), x, y, r, s);
  const chevrons = (x, y, s, c, r = 0) => place([0, 18].map(dx => `<path d="M${dx - 10} -16 L${dx + 6} 0 L${dx - 10} 16" fill="none" stroke="${INK}" stroke-width="10" stroke-linejoin="miter" stroke-linecap="square"/><path d="M${dx - 10} -16 L${dx + 6} 0 L${dx - 10} 16" fill="none" stroke="${c}" stroke-width="5.4" stroke-linejoin="miter" stroke-linecap="square"/>`).join(''), x, y, r, s);
  const vitesse = (x, y, s, c, r = 0) => place([[-30, -16, 26], [-40, 0, 34], [-30, 16, 24]].map(([a, b, l]) => `<path d="M${a} ${b} L${a + l} ${b}" stroke="${INK}" stroke-width="8" stroke-linecap="round"/><path d="M${a} ${b} L${a + l} ${b}" stroke="${c}" stroke-width="4" stroke-linecap="round"/>`).join(''), x, y, r, s);
  const ondes = (x, y, s, c, n = 3, r = 0) => place(Array.from({ length: n }, (_, k) => { const R = 12 + k * 10; return trait(`M${R * .7} ${-R * .7} A${R} ${R} 0 0 1 ${R * .7} ${R * .7}`, c, 3.6, 7.6); }).join(''), x, y, r, s);
  const tuile = (x, y, s, c = PIE_C, cs = '#a8937d') => place(deux([[0, -16], [36, 0], [0, 16], [-36, 0]], [[0, -16], [-36, 0], [0, 0], [36, 0]], c, cs, 2.8), x, y, 0, s);
  const sol = (y = 150, c1 = '#d9c4a6', c2 = '#7c6856', a = 24, b = 176) => deux([[a, y], [b, y], [b - 8, y + 22], [a + 8, y + 22]], [[a, y], [b, y], [b - 4, y + 8], [a + 4, y + 8]], c1, c2, 3);
  const herbe = (x, y, s, c1 = VERT[1], c2 = VERT[2], r = 0) => place(
    deux([[-14, 0], [-12, -26], [-6, -6], [-2, -40], [4, -8], [12, -30], [12, 0]], [[-14, 0], [-12, -26], [-6, -6], [-2, -40], [0, 0]], c1, c2, 2.4), x, y, r, s);
  const brasier = (x, y, s, pal = feu) => flamme(x, y, s, pal);
  const fumee = (x, y, s, c = '#d9c4a6') => place(trait('M0 0 Q14 -12 2 -24 Q-12 -36 4 -50 Q16 -60 8 -72', c, 6, 11) + trait('M-14 -8 Q-4 -18 -12 -30', c, 4, 8.4), x, y, 0, s);
  const empreinte = (x, y, s, r = 0, c1 = PIE_C, c2 = '#5a4038') => place(
    deux([[-14, 2], [-6, -6], [6, -6], [14, 2], [12, 14], [0, 18], [-12, 14]], [[-14, 2], [-6, -6], [0, -6], [0, 18], [-12, 14]], c1, c2, 2.6)
    + [[-17, -12, -20], [-7, -22, -6], [7, -22, 6], [17, -12, 20]].map(([a, b, rr]) => place(deux([[0, -7], [5, 0], [0, 7], [-5, 0]], [[0, -7], [0, 7], [-5, 0]], c1, c2, 2.2), a, b, rr)).join(''), x, y, r, s);
  const pas = (x, y, s, r = 0, c1 = PIE_C, c2 = '#7c6856') => place(
    deux([[-12, -24], [-2, -32], [10, -28], [15, -12], [12, 4], [-10, 4], [-15, -10]], [[-12, -24], [-2, -32], [0, 4], [-10, 4], [-15, -10]], c1, c2, 2.8)
    + deux([[-10, 12], [10, 12], [11, 26], [0, 32], [-11, 26]], [[-10, 12], [0, 12], [0, 32], [-11, 26]], c1, c2, 2.8), x, y, r, s);
  const collet = (x, y, s, c = '#e0b98a', cv = '#fff3d2', braise = false) => place(
    deux([[-6, -50], [6, -50], [8, 14], [0, 24], [-8, 14]], [[-6, -50], [0, -50], [0, 24], [-8, 14]], BOIS_C, BOIS_S, 2.6)
    + `<ellipse cx="0" cy="22" rx="58" ry="22" fill="none" stroke="${INK}" stroke-width="14"/><ellipse cx="0" cy="22" rx="58" ry="22" fill="none" stroke="${c}" stroke-width="8"/>`
    + `<path d="M-52 12 A58 22 0 0 1 42 4" fill="none" stroke="${cv}" stroke-width="2.6"/>`
    + (braise ? `<path d="M-40 38 A58 22 0 0 0 46 36" fill="none" stroke="#ef5a2a" stroke-width="3"/>` : '')
    + trait('M-4 -34 Q-26 -24 -36 8', c, 6, 11)
    + place(deux([[-12, -8], [12, -8], [14, 0], [12, 8], [-12, 8], [-14, 0]], [[-12, -8], [12, -8], [14, 0], [-14, 0]], OR_C, OR_S, 2.4), -2, -36)
    + croix(-2, -36, .9), x, y, 0, s);
  const piquet = (x, y, s, c1 = '#e0b98a', c2 = '#7a5236') => place(deux([[-7, -50], [7, -50], [7, 30], [0, 44], [-7, 30]], [[-7, -50], [0, -50], [0, 44], [-7, 30]], c1, c2, 2.8), x, y, 0, s);
  const nuage = (x, y, s, p) => place(deux([[-44, 12], [-40, -6], [-24, -14], [-14, -30], [6, -32], [20, -18], [36, -20], [48, -4], [44, 12]], [[-44, 12], [-40, -6], [-24, -14], [-14, -30], [6, -32], [4, -14], [-10, -2], [-30, 12]], p[0], p[1], 3), x, y, 0, s);
  const sapin = (x, y, s, c1 = VERT[1], c2 = VERT[2]) => place(
    deux([[0, -50], [18, -22], [10, -22], [26, 4], [14, 4], [30, 30], [-30, 30], [-14, 4], [-26, 4], [-10, -22], [-18, -22]], [[0, -50], [0, 30], [-30, 30], [-14, 4], [-26, 4], [-10, -22], [-18, -22]], c1, c2, 2.8)
    + deux([[-5, 30], [5, 30], [5, 44], [-5, 44]], [[-5, 30], [0, 30], [0, 44], [-5, 44]], BOIS_C, BOIS_S, 2.4), x, y, 0, s);
  const montagne = (x, y, s) => place(
    poly([[-60, 30], [-22, -30], [-6, -6], [14, -40], [60, 30]], PIE_S)
    + poly([[-60, 30], [-22, -30], [-14, 30]], PIE_C) + poly([[-6, -6], [14, -40], [6, 30]], PIE_C)
    + poly([[14, -40], [24, -24], [16, -20], [8, -26]], '#ffffff') + poly([[-22, -30], [-16, -20], [-26, -18]], '#ffffff')
    + encre([[-60, 30], [-22, -30], [-6, -6], [14, -40], [60, 30]], 3.2), x, y, 0, s);
  const oeil = (x, y, s, iris = VERT) => place(
    `<path d="M-34 0 L-16 -14 L16 -14 L34 0 L16 14 L-16 14 Z" fill="${PL_C}" stroke="${INK}" stroke-width="3.2" stroke-linejoin="round"/>`
    + poly([[-34, 0], [-16, -14], [16, -14], [34, 0]], '#ffffff')
    + gemme(0, 0, 11, iris) + poly([[-3, -3], [3, -3], [3, 3], [-3, 3]], INK), x, y, 0, s);
  const coeur = (x, y, s) => place(deux([[0, 34], [-34, 2], [-34, -18], [-18, -30], [0, -18], [18, -30], [34, -18], [34, 2]], [[0, 34], [-34, 2], [-34, -18], [-18, -30], [0, -18]], ROUGE, ROUGE_S, 3.2)
    + poly([[-26, -14], [-18, -24], [-12, -16]], '#ffd2cc'), x, y, 0, s);
  const explosionPetite = (x, y, s, p) => place(deux([[0, -20], [6, -6], [20, 0], [6, 6], [0, 20], [-6, 6], [-20, 0], [-6, -6]], [[0, -20], [6, -6], [0, 0], [-6, 6], [-20, 0], [-6, -6]], p[0], p[2], 2.6), x, y, 0, s);
  const PA = (x, y, s, r = 0) => place(deux([[0, -14], [12, -7], [12, 7], [0, 14], [-12, 7], [-12, -7]], [[0, -14], [0, 14], [-12, 7], [-12, -7]], OR_C, OR_S, 2.6)
    + `<circle r="4.4" fill="${OR_V}" stroke="${INK}" stroke-width="2"/>`, x, y, r, s);
  const balise = (x, y, s, o = {}) => {
    const [b1, b2] = o.solide ? [MET_C, MET_S] : [BOIS_C, BOIS_S];
    return place(
      plume(38, -96, 1.25, 62, ...(o.solide ? [BL_C, BL_S, MET_O] : [PL_C, PL_S, BL_S]))
      + deux([[-9, -110], [9, -110], [9, -8], [0, 8], [-9, -8]], [[-9, -110], [0, -110], [0, 8], [-9, -8]], b1, b2, 3.2)
      + (o.solide ? [-100, -24].map(yy => deux([[-12, yy - 5], [12, yy - 5], [12, yy + 5], [-12, yy + 5]], [[-12, yy - 5], [0, yy - 5], [0, yy + 5], [-12, yy + 5]], OR_C, OR_S, 2.4)).join('') : '')
      + deux([[-12, -64], [12, -64], [12, -48], [-12, -48]], [[-12, -64], [0, -64], [0, -48], [-12, -48]], OR_C, OR_S, 2.6) + croix(0, -56, 1), x, y, 0, s);
  };

  Object.assign(IconesV3.SUJETS, {
    trait_tisse: p => A(p, 86, 118, 40, .74, { fleche: {} }) + F(p, 154, 50, 40, .55, {}) + vitesse(128, 80, .5, p[1], 40) + eclat(44, 52, .7, p[1]),
    lys_fleche_de_bruine: p => A(p, 86, 118, 40, .74, { fleche: { plume: [p[1], p[2]] } }) + F(p, 154, 50, 40, .55, { plume: [p[1], p[2]] })
      + goutte(124, 92, .5, p) + goutte(138, 70, .42, p) + goutte(112, 72, .36, p) + goutte(44, 54, .6, p),
    lys_fleche_de_braise: p => F(p, 92, 108, 45, 1.05, { tete: 'braise', len: 130 }) + flamme(144, 54, .62, p) + eclat(160, 84, .7, p[1], p[0]) + eclat(118, 40, .55, p[1], p[0]) + eclat(172, 46, .45, p[0]),
    lys_trait_de_bise: p => F(p, 104, 104, 90, 1, { len: 196 }) + vitesse(70, 70, .8, p[1]) + vitesse(84, 140, .7, p[0]) + eclat(166, 66, .7, '#ffffff', p[1]),
    lys_fleche_de_ressac: p => trait('M150 146 C192 96 160 36 110 50 C72 62 72 100 100 106', p[1], 9, 15) + `<path d="M150 146 C192 96 160 36 110 50" fill="none" stroke="${p[0]}" stroke-width="2.4"/>`
      + F(p, 82, 112, -112, .9, { len: 110 }) + goutte(150, 156, .7, p) + roc(40, 150, 1.1, 10) + eclat(46, 112, .7, p[0]),
    lys_fleche_de_rocaille: p => F(p, 82, 108, 70, .95, { tete: 'roc', len: 120 }) + chevrons(158, 128, .7, p[1]) + roc(150, 68, .7, 20) + roc(164, 92, .5, -30) + roc(34, 140, .6, 50),
    lys_fleche_de_silex: p => place(deux([[0, -66], [24, -24], [22, 12], [10, 34], [-10, 34], [-22, 12], [-24, -24]], [[0, -66], [0, 34], [-10, 34], [-22, 12], [-24, -24]], PIE_C, PIE_S, 3.6)
      + poly([[0, -66], [12, -40], [0, -30], [-12, -40]], '#ffffff') + poly([[-24, -24], [-8, -18], [-10, 2], [-22, 12]], '#d9c4a6') + poly([[24, -24], [10, -16], [12, 6], [22, 12]], '#6e5a4c')
      + poly([[-10, 34], [-4, 14], [6, 16], [10, 34]], '#a8937d')
      + `<path d="M-24 -24 L-8 -18 L0 -30 L10 -16 L24 -24 M-22 12 L-10 2 L-8 -18 M22 12 L12 6 L10 -16 M-10 2 L-4 14 L6 16 L12 6" stroke="${INK}" stroke-width="2" fill="none" opacity=".6" stroke-linejoin="round"/>`
      + encre([[0, -66], [24, -24], [22, 12], [10, 34], [-10, 34], [-22, 12], [-24, -24]], 3.6), 100, 96, 0, 1.15) + trait('M100 136 L100 190', MET_C, 9, 14)
      + `<path d="M86 134 L114 146 M86 146 L114 158" stroke="${INK}" stroke-width="6" stroke-linecap="round"/><path d="M86 134 L114 146 M86 146 L114 158" stroke="${OR}" stroke-width="3" stroke-linecap="round"/>` + eclat(152, 60, .8, p[1]) + eclat(48, 84, .6, p[0]),
    lys_fleche_couvee: p => place(deux([[0, -8], [-30, 22], [-36, -14], [-4, -60]], [[0, -8], [-30, 22], [-36, -14]], PL_C, PL_S, 3) + deux([[0, -8], [30, 22], [36, -14], [4, -60]], [[0, -8], [36, -14], [4, -60]], PL_C, PL_S, 3)
      + `<path d="M-6 -20 L-28 4 M-6 -36 L-30 -10 M6 -20 L28 4 M6 -36 L30 -10" stroke="${INK}" stroke-width="1.8" opacity=".5"/>`
      + trait('M0 34 L0 -80', MET_C, 5), 96, 120, 0, 1.15) + flamme(96, 108, .66, p) + fumee(118, 74, .85, '#d9c4a6') + fumee(78, 70, .6, '#9a7a62') + eclat(46, 70, .6, p[1], p[0]),
    repli_traqueur: p => pas(78, 70, 1.15, 0) + pas(124, 106, 1.15, 0) + chevrons(100, 158, .95, p[1], 90),
    lys_bond_de_plume: p => pointille('M40 150 Q84 24 150 124', p[1], 4.4) + tuile(150, 150, 1.1) + plume(96, 78, 1.2, 40) + eclat(48, 58, .7, p[1]),
    collet: p => collet(100, 120, 1.1) + eclat(158, 64, .6, p[1]) + croix(46, 66, .9),
    lys_collet_de_braise: p => collet(100, 120, 1.1, '#ffb347', '#fff3c0', true) + flamme(52, 136, .45, p) + flamme(150, 140, .5, p) + flamme(100, 156, .4, p) + eclat(158, 64, .6, p[1], p[0]),
    fil_tendu: p => A(p, 56, 100, 90, .62, { tire: 74, fleche: { tete: 'emousse', len: 168 } }) + chevrons(150, 100, 1.1, p[1]) + eclat(148, 48, .6, '#ffffff', p[1]),
    lys_corde_d_ecume: p => A(p, 56, 100, 90, .62, { tire: 74, fleche: { tete: 'emousse', len: 168, plume: [p[1], p[2]] } }) + chevrons(150, 100, 1.1, p[1])
      + [[114, 74, .5], [108, 128, .45], [128, 142, .38], [132, 60, .36]].map(([x, y, k]) => goutte(x, y, k, p)).join(''),
    marque_traqueur: p => trait('M100 44 L148 66 L156 116 L120 154 L74 150 L44 110 L52 62 Z', ROUGE, 6, 11) + empreinte(100, 108, 1.4) + eclat(156, 46, .7, p[1]),
    lys_marque_de_battue: p => trait('M100 36 L156 58 L168 114 L130 160 L70 160 L32 114 L44 58 Z', ROUGE, 6, 11) + empreinte(74, 84, .8, -16) + empreinte(126, 84, .8, 14) + empreinte(100, 130, .8),
    balise_de_fil: p => fil('M18 146 Q52 132 86 100', 3.4) + deux([[60, 152], [74, 140], [114, 138], [130, 152], [114, 160], [76, 160]], [[60, 152], [74, 140], [92, 139], [88, 160], [76, 160]], '#d9c4a6', '#7c6856', 2.8) + balise(92, 150, .9) + eclat(160, 124, .7, p[1]),
    lys_balise_lointaine: p => trait('M20 92 Q50 90 94 80', OR, 3, 6.6) + croix(34, 91, .85) + croix(56, 89, .85) + croix(78, 85, .85)
      + [[74, 148, 15, 10], [102, 149, 15, 10], [130, 148, 15, 10], [88, 129, 15, 10], [116, 129, 15, 10], [102, 110, 14, 9]].map(([x, y, w, h]) => deux([[-w, 2], [-w + 6, -h], [w - 4, -h - 2], [w, 1], [w - 6, h], [-w + 4, h]], [[-w, 2], [-w + 6, -h], [w - 4, -h - 2], [-2, 0], [-w + 4, h]], PIE_C, PIE_S, 2.8)
        .replace(/^/, `<g transform="translate(${x} ${y})">`) + '</g>').join('')
      + balise(102, 104, .6, { solide: true }) + eclat(46, 136, .6, p[1]) + eclat(160, 120, .5, p[1]),
    trait_du_veilleur: p => [[66, 134], [126, 74]].map(([x, y]) => place(deux([[-14, -36], [14, -32], [14, 36], [-14, 32]], [[-14, -36], [0, -34], [0, 34], [-14, 32]], PIE_C, PIE_S, 3)
        + `<path d="M0 0 L-9 -12 M0 0 L10 -8 M0 0 L-6 14 M0 0 L8 12" stroke="${INK}" stroke-width="2" opacity=".6"/>`, x, y, -45)).join('')
      + F(p, 100, 100, 45, 1.1, { tete: 'cristal', len: 176 }) + eclat(162, 40, .8, '#ffffff', p[1]) + eclat(46, 52, .6, p[1]),
    lys_trait_d_iskar: p => [[66, 134], [126, 74]].map(([x, y]) => place(deux([[-14, -36], [14, -32], [14, 36], [-14, 32]], [[-14, -36], [0, -34], [0, 34], [-14, 32]], PIE_C, PIE_S, 3)
        + `<path d="M0 0 L-9 -12 M0 0 L10 -8 M0 0 L-6 14 M0 0 L8 12" stroke="${feu[2]}" stroke-width="3.4"/>`, x, y, -45)).join('')
      + F(p, 100, 100, 45, 1.1, { tete: 'braise', len: 176 }) + flamme(52, 116, .42, p) + flamme(112, 56, .45, p) + eclat(162, 40, .7, p[1], p[0]),
    pluie_de_fil: p => pointille('M28 150 Q56 24 96 54', p[1]) + [[74, 96], [108, 84], [142, 98]].map(([x, y]) => F(p, x, y, 165, .62, { plume: [PL_C, PL_S] })).join('') + tuile(108, 156, 1.1),
    lys_grele_de_gravier: p => pointille('M28 150 Q60 20 100 60', p[1]) + [[90, 74, 1.4], [132, 70, 1.2], [146, 108, 1.4], [100, 112, 1.1], [64, 110, .9]].map(([x, y, s], k) => roc(x, y, s, k * 40)).join('')
      + [[90, 74], [132, 70], [146, 108]].map(([x, y]) => `<path d="M${x - 8} ${y - 16} L${x - 14} ${y - 34}" stroke="${p[0]}" stroke-width="3.4" stroke-linecap="round"/>`).join('') + tuile(108, 156, 1.1),
    lys_fleche_d_ysvane: p => F(p, 106, 94, 45, 1.25, { len: 170 }) + ondes(60, 140, .9, p[1], 3, 225) + eclat(186, 14, 1.1, '#ffffff', p[1]) + eclat(150, 150, .6, p[0]),
    lys_fleche_montagne: p => A(p, 100, 128, 0, .72, { tire: 66, fleche: { tete: 'montagne', len: 120 } }) + roc(36, 72, .7, 10) + roc(166, 74, .6, -30) + roc(150, 44, .45, 30),
    corde_longue: p => place(deux([[-26, -30], [26, -30], [20, -22], [20, 22], [26, 30], [-26, 30], [-20, 22], [-20, -22]], [[-26, -30], [0, -30], [0, 30], [-26, 30], [-20, 22], [-20, -22]], BOIS_C, BOIS_S, 3)
      + deux([[-20, -22], [20, -22], [20, 22], [-20, 22]], [[-20, -22], [0, -22], [0, 22], [-20, 22]], OR_C, OR_S, 2.6)
      + `<path d="M-20 -12 L20 -8 M-20 0 L20 4 M-20 12 L20 16" stroke="${OR_S}" stroke-width="2"/>`, 64, 112, -10, 1.15)
      + fil('M88 92 Q120 80 150 70 L184 58', 3) + chevrons(160, 116, .6, p[1], -20) + eclat(176, 44, .6, p[1]),
    lys_fil_de_lisiere: p => sapin(42, 108, 1.1) + sapin(160, 108, 1.1) + fil('M54 88 L148 88', 3) + fil('M54 108 L148 108', 3) + croix(100, 88, .9) + croix(100, 108, .9) + eclat(100, 52, .7, p[1]),
    lys_fleche_de_tison: p => trait('M22 150 Q40 120 58 128 T92 116', '#9a7a62', 7, 12) + F(p, 104, 104, 72, 1.05, { tete: 'braise', len: 150 }) + place(deux([[-30, -10], [24, -10], [34, 0], [24, 10], [-30, 10], [-34, 0]], [[-30, -10], [24, -10], [34, 0], [-34, 0]], '#7a5236', '#3e2614', 3)
      + `<path d="M-22 -10 L-14 0 L-20 10 M-2 -10 L6 0 L0 10" fill="none" stroke="#ef5a2a" stroke-width="3"/>` + poly([[22, -10], [34, 0], [22, 10], [26, 0]], '#ffb347') + poly([[28, -4], [34, 0], [28, 4]], '#fff3c0')
      + croix(-10, 0, .9) + croix(12, 0, .9), 112, 100, 72, 1.2) + flamme(150, 62, .45, p) + eclat(52, 60, .7, p[1], p[0]) + eclat(156, 140, .5, p[1], p[0]),
    lys_trait_de_tempete: p => croissant(100, 104, 72, -2.4, 1.0, p[2], p[1], 1.22) + croissant(100, 104, 50, .8, 4.2, p[1], p[0], 1.25)
      + F(p, 100, 100, 0, 1.05, { len: 150 }) + eclat(160, 150, .7, '#ffffff', p[1]) + eclat(42, 56, .6, p[0]) + eclat(156, 46, .5, '#ffffff', p[1]),
    lys_trait_de_maree: p => F(p, 92, 100, 135, 1.05, { len: 140, plume: [p[1], p[2]] })
      + deux([[30, 120], [62, 104], [96, 116], [134, 100], [170, 112], [164, 146], [100, 182], [36, 146]], [[30, 120], [62, 104], [96, 116], [134, 100], [170, 112], [168, 120], [134, 110], [96, 126], [62, 114], [34, 130]], p[1], p[2], 3.4)
      + `<path d="M48 140 L80 130 L112 140 L150 128 M70 158 L100 150 L132 158" fill="none" stroke="${p[0]}" stroke-width="3" stroke-linecap="round"/>`
      + goutte(104, 84, .45, p) + goutte(150, 82, .55, p) + goutte(136, 60, .4, p) + eclat(50, 64, .6, p[1]),
    lys_fleche_de_forge: p => place(deux([[-50, -14], [40, -14], [56, -24], [54, -8], [30, 4], [18, 4], [18, 20], [32, 30], [-32, 30], [-18, 20], [-18, 4], [-40, 0]], [[-50, -14], [40, -14], [56, -24], [30, -6], [-40, -6]], '#9fb2c8', '#3e4a6e', 3.2), 100, 140, 0, 1)
      + place(TETES.braise(p), 98, 96, 90, 1.5) + trait('M54 112 L96 112', MET_C, 4) + flamme(50, 76, .5, p) + eclat(132, 62, .9, p[1], p[0]) + eclat(156, 92, .6, p[1], p[0]) + eclat(118, 46, .5, p[0]),
    lys_fleche_fend_roc: p => place(deux([[-40, 30], [-44, -6], [-24, -30], [-4, -32], [-10, -6], [-2, 8], [-8, 30]], [[-40, 30], [-44, -6], [-24, -30], [-4, -32], [-10, -6], [-22, 30]], PIE_C, PIE_S, 3.2), 102, 126, -8, 1)
      + place(deux([[4, -32], [28, -26], [44, 2], [38, 30], [4, 30], [10, 8], [2, -6]], [[4, -32], [28, -26], [24, 0], [4, 30], [10, 8], [2, -6]], PIE_C, PIE_S, 3.2), 112, 126, 10, 1)
      + F(p, 98, 66, 166, .82, { len: 120 }) + roc(46, 70, .6, 20) + roc(168, 82, .55, -30) + eclat(102, 100, .8, p[1], p[0]),
    lys_fleche_de_houle: p => trait('M24 150 Q60 112 100 132 T176 128', p[1], 9, 15) + `<path d="M28 146 Q60 114 100 134" fill="none" stroke="${p[0]}" stroke-width="2"/>` + vague(64, 128, 1, p) + F(p, 96, 96, 90, .95, { len: 130, plume: [p[1], p[2]] }) + chevrons(158, 66, .6, p[1]) + goutte(48, 68, .5, p),
    lys_collet_rejeteur: p => collet(70, 130, .84) + chevrons(144, 90, 1.2, p[1], -90)
      + trait('M120 132 L128 120 M126 148 L139 143', p[1], 3.6, 8) + eclat(118, 152, .8, p[1]) + eclat(56, 62, .55, p[1]),
    lys_collet_entravant: p => place(
        deux([[-20, 0], [-22, -38], [-34, -54], [-28, -60], [-14, -48], [-14, -70], [-6, -74], [0, -70], [2, -76], [10, -74], [12, -66], [18, -68], [24, -62], [22, -30], [18, 0]],
          [[-20, 0], [-22, -38], [-34, -54], [-28, -60], [-14, -48], [-14, -70], [-6, -74], [0, -70], [0, 0]], '#f1e6d2', '#c9b48e', 3.2)
        + `<path d="M-6 -72 L-6 -46 M0 -70 L2 -46 M10 -72 L10 -46 M18 -66 L18 -44" stroke="${INK}" stroke-width="2.2" opacity=".6"/>`
        + deux([[-20, 0], [18, 0], [16, 44], [-18, 44]], [[-20, 0], [0, 0], [0, 44], [-18, 44]], '#4a3e62', NUIT, 3), 84, 126, -10, 1)
      + [112, 125].map(y => trait(`M54 ${y - 6} L114 ${y + 2}`, '#e0b98a', 6, 11)).join('') + croix(84, 113, .95) + croix(84, 125, .95)
      + trait('M58 122 Q40 142 48 170', '#e0b98a', 5, 10)
      + PA(140, 70, 1.1) + PA(144, 110, 1.1) + trait('M122 52 L162 128', ROUGE, 5, 10),
    lys_fil_tremblant: p => piquet(36, 116, .62) + piquet(164, 116, .62) + fil('M40 96 L56 84 L72 108 L88 84 L104 108 L120 84 L136 108 L152 84 L160 96', 4)
      + place(deux([[-10, -8], [10, -8], [14, 14], [-14, 14]], [[-10, -8], [0, -8], [0, 14], [-14, 14]], OR_C, OR_S, 2.6) + poly([[-3, 14], [3, 14], [3, 20], [-3, 20]], INK), 100, 120)
      + ondes(124, 136, .6, p[1], 2) + ondes(76, 136, .6, p[1], 2, 180) + oeil(100, 54, .55),
    lys_coup_de_corde: p => trait('M30 150 C60 150 60 100 92 100 S128 54 150 60', '#e0b98a', 10, 16) + fil('M30 150 C60 150 60 100 92 100 S128 54 150 60', 2) + explosionPetite(156, 60, 1.3, p) + chevrons(150, 126, .9, p[1], -40),
    lys_salve_de_cendres: p => trait('M28 140 Q100 -10 172 140', p[1], 4, 9) + [[52, 86, -40], [100, 46, 0], [148, 86, 40]].map(([x, y, r]) => flamme(x, y, .55, p)).join('')
      + [[84, 138], [100, 150], [118, 140], [92, 162], [110, 166]].map(([x, y]) => poly([[x - 3, y - 3], [x + 3, y - 3], [x + 3, y + 3], [x - 3, y + 3]], '#d9c4a6')).join('') + tuile(100, 154, 1.1, '#9a7a62', '#5a4038'),
    lys_averse_de_morrha: p => nuage(100, 56, 1.2, p) + [[68, 104], [100, 114], [132, 104]].map(([x, y]) => F(p, x, y, 180, .45, { plume: [p[1], p[2]] })).join('') + goutte(84, 140, .5, p) + goutte(118, 144, .5, p) + tuile(100, 162, 1),
    lys_signal_de_crete: p => montagne(100, 150, .9) + place(deux([[-14, -40], [14, -40], [18, 30], [-18, 30]], [[-14, -40], [0, -40], [0, 30], [-18, 30]], PIE_C, PIE_S, 3)
      + deux([[-20, -46], [20, -46], [20, -38], [-20, -38]], [[-20, -46], [0, -46], [0, -38], [-20, -38]], OR_C, OR_S, 2.4) + poly([[-4, -24], [4, -24], [4, -12], [-4, -12]], INK), 100, 106, 0, 1) + flamme(100, 44, .9, feu) + eclat(150, 50, .7, p[1]) + eclat(52, 60, .6, p[1]),
    lys_sifflet_d_alerte: p => place(deux([[-46, -10], [30, -10], [42, -4], [42, 10], [-46, 10]], [[-46, -10], [30, -10], [42, -4], [-46, -4]], PL_C, PL_S, 3.2)
      + poly([[-30, -10], [-16, -10], [-20, -2], [-30, -2]], INK) + `<circle cx="16" cy="2" r="4" fill="${INK}"/>` + croix(-2, 2, .8), 82, 116, -20, 1.1)
      + ondes(140, 82, .8, p[1], 3, -20) + chevrons(70, 54, .55, VERT[1], -90),
    lys_repos_du_guetteur: p => oeil(100, 92, 1.05) + herbe(40, 150, 1.2) + herbe(76, 156, 1.4) + herbe(118, 156, 1.3, VERT[1], VERT[2], 6) + herbe(158, 150, 1.2)
      + place(`<path d="M0 -10 L0 10 M-10 0 L10 0" stroke="${INK}" stroke-width="9" stroke-linecap="round"/><path d="M0 -10 L0 10 M-10 0 L10 0" stroke="${ROUGE}" stroke-width="4.6" stroke-linecap="round"/>`, 156, 50),
    lys_cape_de_lande: p => place(deux([[0, -50], [22, -36], [28, -6], [40, 44], [0, 52], [-40, 44], [-28, -6], [-22, -36]], [[0, -50], [0, 52], [-40, 44], [-28, -6], [-22, -36]], '#9fe06a', '#4a9a3e', 3.4)
      + poly([[0, -36], [14, -26], [16, -6], [0, 2], [-16, -6], [-14, -26]], NUIT) + `<path d="M-8 -14 L-3 -14 M3 -14 L8 -14" stroke="${VERT[0]}" stroke-width="2.4"/>`
      + `<path d="M-24 10 L-10 44 M0 6 L0 50 M24 10 L10 44" stroke="${INK}" stroke-width="2" opacity=".5"/>` + croix(0, 12, .9), 100, 98, 0, 1.15)
      + herbe(40, 160, 1, '#c99a6a', '#7a5236') + herbe(160, 160, 1, '#c99a6a', '#7a5236', 4) + eclat(156, 50, .6, p[1]),
    fleche_ancre: p => sol(148, '#d9c4a6', '#7c6856', 30, 170) + F(p, 100, 86, 180, .95, { tete: 'ancre', len: 116 }) + roc(46, 134, .7, 0) + chevrons(158, 84, .5, p[1], 180) + eclat(52, 64, .6, p[1]),
    lys_fleche_de_vase: p => place(deux([[-62, 0], [-46, -14], [-10, -18], [30, -16], [60, -6], [56, 10], [20, 18], [-30, 18]], [[-62, 0], [-46, -14], [-10, -18], [30, -16], [60, -6], [10, 0]], '#9a7a62', '#5a4038', 3), 100, 148, 0, 1.1)
      + F(p, 104, 88, 200, .95, { len: 120, plume: [p[1], p[2]] }) + goutte(72, 120, .5, ['#d9c4a6', '#9a7a62', '#5a4038']) + goutte(140, 128, .45, ['#d9c4a6', '#9a7a62', '#5a4038']) + eclat(54, 54, .6, p[1]),
  });
})();

IconesV3.TYPES = Object.assign(IconesV3.TYPES || {}, {collet:'degats',lys_collet_de_braise:'degats',lys_collet_entravant:'degats',lys_collet_rejeteur:'placement',marque_traqueur:'degats',lys_marque_de_battue:'degats',lys_fil_tremblant:'degats'});
