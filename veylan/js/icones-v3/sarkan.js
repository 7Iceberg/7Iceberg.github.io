(() => {
  const { poly, encre, place, croix, eclat, roc, croissant, flamme, lame } = IconesV3.outils;
  const { P, INK } = IconesV3;
  const OR_C = '#ffd98f', OR_S = '#a8683a', MET_C = '#e9dcc4', MET_S = '#8f7a66';

  const deux = (pts, cut, c1, c2, w = 3) => poly(pts, c2) + poly(cut, c1) + encre(pts, w);
  const gant = (x, y, s, r = 0, ouvert = false) => place(
    (ouvert
      ? deux([[-22, 10], [-24, -14], [-16, -16], [-14, -30], [-6, -32], [-4, -40], [4, -40], [6, -32], [14, -30], [16, -14], [26, -20], [30, -12], [20, 10], [10, 26], [-14, 26]],
        [[-22, 10], [-24, -14], [-16, -16], [-14, -30], [-6, -32], [-4, -40], [4, -40], [0, 26], [-14, 26]], MET_C, MET_S)
      : deux([[-22, -14], [22, -14], [26, 6], [16, 26], [-16, 26], [-26, 6]], [[-22, -14], [0, -14], [0, 26], [-16, 26], [-26, 6]], MET_C, MET_S)
        + `<path d="M-11 -14 L-11 4 M0 -14 L0 4 M11 -14 L11 4" stroke="${INK}" stroke-width="2.4"/>`)
    + deux([[-16, 26], [16, 26], [16, 42], [-16, 42]], [[-16, 26], [0, 26], [0, 42], [-16, 42]], OR_C, OR_S, 3), x, y, r, s);
  const sceau = (x, y, s, rune = '#ffd08a') => place(
    `<path d="M0 -24 L17 -17 L24 0 L17 17 L0 24 L-17 17 L-24 0 L-17 -17 Z" fill="#a8322a"/><path d="M0 -24 L17 -17 L24 0 L0 0 L-17 -17 Z" fill="#d24a3c"/>`
    + `<path d="M0 -14 L0 12 M-9 -5 L0 -14 L9 -5 M-7 8 L7 8" stroke="${rune}" stroke-width="3.4" fill="none" stroke-linejoin="round" stroke-linecap="round"/>`
    + encre([[0, -24], [17, -17], [24, 0], [17, 17], [0, 24], [-17, 17], [-24, 0], [-17, -17]], 3), x, y, 0, s);
  const montagne = (x, y, s) => place(
    poly([[-60, 30], [-22, -30], [-6, -6], [14, -40], [60, 30]], '#8f7a66')
    + poly([[-60, 30], [-22, -30], [-14, 30]], '#efe2c8') + poly([[-6, -6], [14, -40], [6, 30]], '#efe2c8')
    + poly([[14, -40], [24, -24], [16, -20], [8, -26]], '#ffffff') + poly([[-22, -30], [-16, -20], [-26, -18]], '#ffffff')
    + encre([[-60, 30], [-22, -30], [-6, -6], [14, -40], [60, 30]], 3.2), x, y, 0, s);
  const goutte = (x, y, s, p) => place(deux([[0, -16], [10, 2], [8, 12], [0, 16], [-8, 12], [-10, 2]], [[0, -16], [0, 16], [-8, 12], [-10, 2]], p[1], p[2], 2.4) + poly([[-4, 0], [-1, -8], [-1, 4]], p[0]), x, y, 0, s);
  const vague = (x, y, s, p, r = 0) => place(
    poly([[-36, 14], [-26, -4], [-8, -14], [12, -12], [26, -2], [20, 4], [8, -2], [-2, 4], [4, 14]], p[2])
    + poly([[-26, -4], [-8, -14], [12, -12], [26, -2], [20, 4], [8, -2], [-8, -4]], p[1])
    + poly([[-8, -14], [12, -12], [8, -8]], p[0])
    + encre([[-36, 14], [-26, -4], [-8, -14], [12, -12], [26, -2], [20, 4], [8, -2], [-2, 4], [4, 14]], 2.8), x, y, r, s);
  const eclair = (x, y, s, c, r = 0) => place(deux([[6, -36], [-12, 4], [0, 4], [-8, 36], [16, -6], [4, -6], [14, -36]], [[6, -36], [-12, 4], [0, 4], [-8, 36], [4, -6], [14, -36]], '#ffffff', c, 2.8), x, y, r, s);
  const chevrons = (x, y, s, c, r = 0) => place([0, 18].map(dx => `<path d="M${dx - 10} -16 L${dx + 6} 0 L${dx - 10} 16" fill="none" stroke="${INK}" stroke-width="10" stroke-linejoin="miter" stroke-linecap="square"/><path d="M${dx - 10} -16 L${dx + 6} 0 L${dx - 10} 16" fill="none" stroke="${c}" stroke-width="5.4" stroke-linejoin="miter" stroke-linecap="square"/>`).join(''), x, y, r, s);
  const vitesse = (x, y, s, c, r = 0) => place([[-30, -16, 26], [-40, 0, 34], [-30, 16, 24]].map(([a, b, l]) => `<path d="M${a} ${b} L${a + l} ${b}" stroke="${INK}" stroke-width="8" stroke-linecap="round"/><path d="M${a} ${b} L${a + l} ${b}" stroke="${c}" stroke-width="4" stroke-linecap="round"/>`).join(''), x, y, r, s);
  const ecu = (x, y, s, embleme = '') => place(deux([[-36, -40], [36, -40], [36, 4], [0, 44], [-36, 4]], [[-36, -40], [0, -40], [0, 44], [-36, 4]], MET_C, MET_S, 3.4)
    + `<path d="M-30 -34 L30 -34 L30 2 L0 36 L-30 2 Z" fill="none" stroke="${OR_C}" stroke-width="3"/>` + embleme, x, y, 0, s);
  const coeur = (x, y, s, p) => place(deux([[0, 34], [-34, 2], [-34, -18], [-18, -30], [0, -18], [18, -30], [34, -18], [34, 2]], [[0, 34], [-34, 2], [-34, -18], [-18, -30], [0, -18]], '#ef7574', '#b83a44', 3.2)
    + poly([[-26, -14], [-18, -24], [-12, -16]], '#ffd2cc'), x, y, 0, s);
  const sablier = (x, y, s, p) => place(
    deux([[-26, -40], [26, -40], [26, -34], [6, -2], [26, 34], [26, 40], [-26, 40], [-26, 34], [-6, -2], [-26, -34]], [[-26, -40], [0, -40], [0, 40], [-26, 40], [-26, 34], [-6, -2], [-26, -34]], '#d8e8f2', '#8fa6bd', 3)
    + poly([[-16, 30], [16, 30], [6, 14], [-6, 14]], p[1]) + poly([[-2, -2], [2, -2], [2, 14], [-2, 14]], p[1]) + poly([[-14, -30], [14, -30], [8, -20], [-8, -20]], p[2])
    + deux([[-32, -46], [32, -46], [32, -38], [-32, -38]], [[-32, -46], [0, -46], [0, -38], [-32, -38]], OR_C, OR_S, 2.6)
    + deux([[-32, 38], [32, 38], [32, 46], [-32, 46]], [[-32, 38], [0, 38], [0, 46], [-32, 46]], OR_C, OR_S, 2.6), x, y, 0, s);
  const cor = (x, y, s) => place(deux([[-44, 22], [-40, 4], [-18, -4], [16, -16], [30, -38], [46, -30], [40, -4], [18, 8], [-14, 18], [-30, 30]],
    [[-44, 22], [-40, 4], [-18, -4], [16, -16], [30, -38], [36, -26], [14, -6], [-16, 6], [-30, 30]], MET_C, MET_S, 3.2)
    + `<ellipse cx="38" cy="-34" rx="7" ry="11" transform="rotate(30 38 -34)" fill="#2b2238" stroke="${INK}" stroke-width="2.4"/>`
    + deux([[-6, -8], [2, -10], [8, 10], [0, 12]], [[-6, -8], [2, -10], [4, 0], [-3, 2]], OR_C, OR_S, 2.2), x, y, 0, s);
  const ondes = (x, y, s, c, n = 3) => place(Array.from({ length: n }, (_, k) => { const r = 14 + k * 11; return `<path d="M${r * .7} ${-r * .7} A${r} ${r} 0 0 1 ${r * .7} ${r * .7}" fill="none" stroke="${INK}" stroke-width="8" stroke-linecap="round"/><path d="M${r * .7} ${-r * .7} A${r} ${r} 0 0 1 ${r * .7} ${r * .7}" fill="none" stroke="${c}" stroke-width="4" stroke-linecap="round"/>`; }).join(''), x, y, 0, s);
  const plaie = (p, bord) => `<path d="M30 46 L64 74 L104 94 L150 140 L104 104 L60 86 Z" fill="${INK}"/><path d="M38 52 L66 76 L104 96 L140 130 L102 100 L62 82 Z" fill="${p[2]}"/><path d="M46 60 L68 78 L104 98 L128 120" fill="none" stroke="${p[0]}" stroke-width="2.4"/>` + (bord || '');
  const glace = (x, y, s, r, p) => place(poly([[0, -16], [6, -4], [4, 14], [-4, 14], [-6, -4]], p[2]) + poly([[0, -16], [6, -4], [0, 0], [-6, -4]], p[0]) + poly([[0, 0], [6, -4], [4, 14]], p[1]) + encre([[0, -16], [6, -4], [4, 14], [-4, 14], [-6, -4]], 2), x, y, r, s);
  const trajectoire = (p) => `<path d="M34 150 Q60 34 118 70" fill="none" stroke="${INK}" stroke-width="7" stroke-dasharray="10 9" stroke-linecap="round"/><path d="M34 150 Q60 34 118 70" fill="none" stroke="${p[1]}" stroke-width="3.4" stroke-dasharray="10 9" stroke-linecap="round"/>`;
  const impact = (x, y, p) => place(deux([[0, -20], [6, -6], [20, 0], [6, 6], [0, 20], [-6, 6], [-20, 0], [-6, -6]], [[0, -20], [6, -6], [0, 0], [-6, 6], [-20, 0], [-6, -6]], p[0], p[2], 2.6), x, y, 0, 1);
  const explosion = (x, y, s, p) => place(deux(Array.from({ length: 16 }, (_, k) => { const a = k / 16 * Math.PI * 2, r = k % 2 ? 18 : 40; return [Math.cos(a) * r, Math.sin(a) * r]; }), Array.from({ length: 9 }, (_, k) => { const a = (k + 8) / 16 * Math.PI * 2, r = k % 2 ? 18 : 40; return [Math.cos(a) * r, Math.sin(a) * r]; }).concat([[0, 0]]), p[1], p[2], 3)
    + poly(Array.from({ length: 8 }, (_, k) => { const a = (k + .5) / 8 * Math.PI * 2; return [Math.cos(a) * 12, Math.sin(a) * 12]; }), p[0]), x, y, 0, s);
  const brique = (x, y, w, h) => deux([[x, y], [x + w, y], [x + w, y + h], [x, y + h]], [[x, y], [x + w, y], [x + w - 4, y + 4], [x + 4, y + 4], [x + 4, y + h - 4], [x, y + h]], '#efe2c8', '#a8937d', 2.4);
  const sol = () => deux([[24, 150], [176, 150], [168, 176], [32, 176]], [[24, 150], [176, 150], [172, 158], [28, 158]], '#d9c4a6', '#7c6856', 3);
  const L = (p, x, y, r, s, o) => place(lame(p, o), x, y, r, s);
  const feu = P.feu, eau = P.eau;

  Object.assign(IconesV3.SUJETS, {
    taille_ardente: p => croissant(102, 108, 70, -2.7, .35, p[1], p[0]) + L(p, 96, 118, 44, .9, { chaud: true }) + flamme(150, 70, .5, p) + flamme(168, 98, .38, p) + eclat(44, 150, .6, p[1]),
    trempe: p => vague(100, 158, 1.5, p) + L(p, 100, 74, 180, .82) + goutte(54, 128, .8, p) + goutte(150, 124, .7, p) + goutte(130, 104, .5, p),
    taille_d_orage: p => eclair(140, 74, 1.2, '#c9d6e8') + croissant(102, 108, 70, -2.7, .35, p[2], p[1]) + L(p, 92, 118, 44, .9) + eclat(160, 120, .7, '#ffffff'),
    lame_vive: p => vitesse(80, 74, .9, p[1], 20) + L(p, 104, 112, 52, .9) + chevrons(150, 148, .7, p[1]),
    coup_de_roche: p => place(deux([[-36, -14], [-10, -36], [24, -30], [36, 0], [22, 30], [-20, 32], [-38, 10]], [[-36, -14], [-10, -36], [24, -30], [-4, -4], [-20, 32], [-38, 10]], '#efe2c8', '#8f7a66', 3.4) + `<path d="M-10 -36 L-4 -4 L22 30 M-4 -4 L-38 10" stroke="${INK}" stroke-width="2" opacity=".6"/>`, 76, 104, 0, 1.05) + chevrons(140, 104, 1, p[1]) + roc(120, 62, .6, 20),
    serment_de_cendre: p => L(p, 98, 128, 0, .96) + sceau(134, 146, 1) + flamme(134, 110, .62, feu) + eclat(62, 52, .8, p[1]),
    saut_delan: p => trajectoire(p) + impact(128, 150, p) + L(p, 128, 86, 180, .72) + roc(98, 160, .6, 20) + roc(158, 158, .55, -30),
    bond_d_ecume: p => trajectoire(p) + vague(128, 156, 1.2, p) + L(p, 128, 84, 180, .72) + goutte(94, 136, .7, p) + goutte(160, 132, .65, p),
    rempart_de_lame: p => brique(30, 104, 46, 24) + brique(78, 104, 46, 24) + brique(126, 104, 46, 24) + brique(52, 130, 46, 24) + brique(100, 130, 46, 24) + L(p, 100, 70, 180, .7) + eclat(150, 50, .7, p[1]),
    verdict: p => place(sceau(0, 0, 1.1) + `<path d="M-30 -30 L30 30" stroke="${INK}" stroke-width="7"/><path d="M-30 -30 L30 30" stroke="#fff3d2" stroke-width="2.4"/>`, 100, 150, 0, 1) + L(p, 100, 66, 180, .74) + eclat(68, 132, .7, p[0]) + eclat(136, 168, .6, p[0]),
    arret_du_vent: p => croissant(70, 96, 46, 2.2, 4.1, p[1], p[0]) + croissant(62, 96, 30, 2.2, 4.1, p[2], p[1]) + L(p, 118, 76, 180, .78),
    poigne_juree: p => gant(84, 98, 1.3) + chevrons(150, 98, .9, p[1]),
    poigne_brulante: p => gant(92, 104, 1.3) + flamme(56, 64, .55, p) + flamme(130, 56, .7, p) + flamme(146, 96, .45, p),
    tourbillon_d_acier: p => croissant(100, 100, 74, -1.4, 2.2, p[2], p[0], 1.22) + croissant(100, 100, 56, 1.6, 4.6, p[1], p[0], 1.25)
      + [0, 120, 240].map(a => L(p, 100 + Math.sin(a * Math.PI / 180) * 30, 100 - Math.cos(a * Math.PI / 180) * 30, a, .42)).join('') + eclair(100, 100, .5, p[2]),
    defi: p => gant(90, 112, 1.3, -10, true) + vitesse(156, 70, .8, p[1], 135) + eclat(150, 120, .7, p[1]),
    appel_du_fer: p => L(p, 64, 110, 0, .8) + chevrons(120, 98, 1, p[1], 180) + ondes(80, 98, 1.2, p[0]),
    jugement_de_durren: p => montagne(100, 136, 1.2) + L(p, 112, 60, 180, .6) + eclat(70, 70, .8, p[1]) + impact(112, 112, p),
    embrasement_jure: p => Array.from({ length: 6 }, (_, k) => { const a = k / 6 * Math.PI * 2; return flamme(100 + Math.cos(a) * 54, 102 + Math.sin(a) * 54, .5, p); }).join('') + sceau(100, 102, 1.3),
    ferveur: p => L(p, 100, 134, 0, .8) + flamme(100, 52, 1.2, P.neutre),
    ire_juree: p => L(p, 100, 134, 0, .8) + flamme(76, 58, .9, feu) + flamme(122, 50, 1.05, P.neutre),
    entaille_ardente: p => plaie(p) + flamme(70, 50, .5, p) + flamme(112, 76, .6, p) + flamme(146, 112, .45, p),
    saignee_de_givre: p => plaie(p) + glace(56, 46, .8, -30, p) + glace(104, 74, .9, 10, p) + glace(150, 112, .7, 40, p),
    ruee: p => vitesse(74, 72, .9, p[1], 30) + L(p, 106, 114, 48, .86) + chevrons(150, 150, .75, p[1], 48),
    pas_de_durren: p => place(deux([[-26, -40], [6, -40], [8, 4], [36, 14], [40, 34], [-30, 34], [-34, 10]], [[-26, -40], [6, -40], [8, 4], [-8, 8], [-30, 34], [-34, 10]], '#efe2c8', '#8f7a66', 3.4)
      + `<path d="M-34 24 L40 24" stroke="${INK}" stroke-width="2.4"/>` + croix(-12, -14, .9), 82, 100, 0, 1.1) + chevrons(150, 100, .9, p[1]),
    ecume_fendue: p => vague(100, 52, 1, p, -90) + vague(100, 150, 1, p, 90) + vague(52, 102, 1, p, 180) + vague(150, 102, 1, p) + L(p, 100, 72, 180, .5),
    croix_d_orage: p => eclair(100, 56, .9, p[2]) + eclair(100, 148, .9, p[2], 180) + eclair(52, 102, .9, p[2], -90) + eclair(150, 102, .9, p[2], 90) + L(p, 100, 74, 180, .48),
    garde_juree: p => ecu(100, 100, 1.4, `<path d="M0 -22 L0 18 M-12 -10 L0 -22 L12 -10 M-10 10 L10 10" stroke="${INK}" stroke-width="8" fill="none" stroke-linejoin="round" stroke-linecap="round"/><path d="M0 -22 L0 18 M-12 -10 L0 -22 L12 -10 M-10 10 L10 10" stroke="#f3bc72" stroke-width="4" fill="none" stroke-linejoin="round" stroke-linecap="round"/>`),
    egide_de_durren: p => ecu(100, 100, 1.4) + montagne(100, 98, .52),
    coup_de_vent: p => croissant(118, 96, 52, -1.2, 1.4, p[1], p[0]) + croissant(122, 96, 34, -1.2, 1.4, p[2], p[1]) + L(p, 76, 116, 50, .72) + chevrons(160, 140, .6, p[1]),
    coup_de_grisou: p => explosion(92, 104, 1.5, p) + chevrons(158, 104, .8, p[1]),
    cri_de_guerre: p => cor(90, 108, 1.2) + ondes(140, 76, .9, p[1]),
    grondement: p => montagne(100, 110, 1.3) + `<path d="M100 104 L92 124 L104 140 L96 160" fill="none" stroke="${INK}" stroke-width="5"/><path d="M100 104 L92 124 L104 140 L96 160" fill="none" stroke="${p[1]}" stroke-width="2"/>` + sol(),
    lame_des_cimes: p => montagne(100, 146, 1) + L(p, 100, 70, 180, .62) + eclat(100, 28, 1.1, '#ffffff', p[1]) + eclat(150, 60, .6, p[1]),
    lame_de_brume: p => L(p, 92, 118, 44, .9) + [[42, 128, 76], [62, 106, 82], [92, 74, 64]].map(([x, y, w]) => `<path d="M${x} ${y} l${w} 0" stroke="${p[0]}" stroke-width="12" stroke-linecap="round" opacity=".85"/><path d="M${x + 10} ${y} l${w - 20} 0" stroke="${p[1]}" stroke-width="5" stroke-linecap="round"/>`).join(''),
    souffle_jure: p => sablier(100, 100, 1.4, P.neutre) + eclat(150, 56, .8, p[1]) + eclat(52, 140, .6, p[1]),
    second_souffle: p => coeur(100, 100, 1.5, p) + `<path d="M100 76 L100 124 M76 100 L124 100" stroke="${INK}" stroke-width="12" stroke-linecap="round"/><path d="M100 76 L100 124 M76 100 L124 100" stroke="#fff3d2" stroke-width="6" stroke-linecap="round"/>` + eclat(150, 50, .7, p[1]),
    lame_de_braise: p => [[52, 150, .5], [72, 130, .44], [40, 124, .36]].map(([x, y, k]) => flamme(x, y, k, p)).join('') + L(p, 104, 112, 44, .9, { chaud: true }),
    lame_de_maree: p => vague(64, 142, 1.2, p, -40) + L(p, 104, 112, 44, .9) + goutte(150, 56, .6, p),
  });
  IconesV3.TYPES = Object.assign(IconesV3.TYPES || {}, { serment_jure: 'degats', serment_de_cendre: 'degats', grondement: 'degats', defi: 'placement', appel_du_fer: 'placement' });
})();
