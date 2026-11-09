(() => {
  const O = IconesV3.outilsDe || {};
  const S = IconesV4.SUJETS;
  const { poly, encre, place, croix, eclat } = IconesV3.outils;
  const INK = IconesV3.INK;
  const OR_V = '#fff3d2', OR_C = '#ffd98f', OR_S = '#a8683a';
  const trait = (d, c, w, iw = w + 4.4) => `<path d="${d}" fill="none" stroke="${INK}" stroke-width="${iw}" stroke-linecap="round" stroke-linejoin="round"/><path d="${d}" fill="none" stroke="${c}" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round"/>`;
  const pointe = (x, y, a, c, s = 1) => place(poly([[-4, -12], [18, 0], [-4, 12], [2, 0]], c) + encre([[-4, -12], [18, 0], [-4, 12], [2, 0]], 2.6), x, y, a, s);
  const jet = (d, c = '#fff3d2') => `<path d="${d}" fill="none" stroke="${INK}" stroke-width="8" stroke-dasharray="10 9" stroke-linecap="round"/><path d="${d}" fill="none" stroke="${c}" stroke-width="3.6" stroke-dasharray="10 9" stroke-linecap="round"/>`;

  if (O.nerith) {
    const N = O.nerith, { AM, NUIT, CUIR, PIERRE } = N;
    Object.assign(S, {
      hantise: p => N.ombre(100, 154, .95)
        + N.silhouette(64, 98, .82)
        + N.buste(128, 112, .66, [CUIR[0], CUIR[1], CUIR[2]])
        + N.chevrons(158, 104, .62, AM[1])
        + N.chausse(150, 150, .38)
        + N.ame(42, 52, .7) + N.ame(104, 58, .5),
      piege_de_vase: p => N.flaque(100, 140, 1.3, ['#6f7f5a', '#3a4630', '#151c12'], '#9fb27a')
        + N.botte(96, 106, 1.25, 0)
        + `<circle cx="62" cy="138" r="6" fill="#4d5b3e" stroke="${INK}" stroke-width="2.4"/><circle cx="140" cy="142" r="4.5" fill="#4d5b3e" stroke="${INK}" stroke-width="2.2"/><circle cx="128" cy="132" r="3" fill="#7f9266" stroke="${INK}" stroke-width="2"/>`
        + N.PM(150, 66, .8) + N.moins(150, 98, .9)
        + eclat(52, 70, .6, p[1], p[0]),
      appel_du_leurre: p => N.ombre(66, 150, .62) + N.silhouette(64, 102, .72)
        + N.buste(150, 116, .8, [CUIR[0], CUIR[1], CUIR[2]])
        + N.chevrons(108, 108, .8, AM[1], 180)
        + N.ame(64, 44, .55),
      rejet_du_leurre: p => N.ombre(60, 150, .62) + N.silhouette(58, 102, .72)
        + N.buste(156, 116, .78, [CUIR[0], CUIR[1], CUIR[2]])
        + N.chevrons(100, 108, .8, AM[1], 0)
        + N.ame(58, 44, .55),
      lame_du_pli: p => N.pli(100, 96, .95, .55)
        + N.D(104, 150, 24, 1, N.SCHISTE)
        + [[46, 70], [52, 120], [150, 64], [156, 112], [100, 36]].map(([x, y]) => N.ame(x, y, .55)).join(''),
    });
  }

  if (O.oriel) {
    const L = O.oriel;
    const cadran = (x, y, s) => place(`<circle r="30" fill="${OR_C}" stroke="${INK}" stroke-width="3.4"/><circle r="24" fill="#fff8ea" stroke="${OR_S}" stroke-width="2"/>`
      + [0, 1, 2, 3].map(k => `<path d="M0 -24 L0 -18" stroke="${INK}" stroke-width="2.6" transform="rotate(${k * 90})"/>`).join('')
      + `<path d="M0 0 L0 -16" stroke="${INK}" stroke-width="3.4" stroke-linecap="round"/><path d="M0 0 L12 6" stroke="${INK}" stroke-width="3.4" stroke-linecap="round"/><circle r="3.2" fill="${OR_S}" stroke="${INK}" stroke-width="1.6"/>`
      + `<path d="M22 -28 A36 36 0 0 1 36 -6" fill="none" stroke="${INK}" stroke-width="7" stroke-linecap="round"/><path d="M22 -28 A36 36 0 0 1 36 -6" fill="none" stroke="${OR_V}" stroke-width="3" stroke-linecap="round"/>`
      + poly([[30, -8], [42, -10], [36, 2]], OR_V) + encre([[30, -8], [42, -10], [36, 2]], 2), x, y, 0, s);
    Object.assign(S, {
      heure_juste: p => L.lanterne(76, 116, 1, p) + cadran(138, 70, 1.15) + L.chevrons(146, 136, .6, '#fff3d2'),
    });

    const LUNE_C = '#f2f6ff', LUNE_S = '#a9b9dc', ROC_C = '#d8c3a5', ROC_S = '#7a6450', BRAISE = ['#fff3c0', '#ffb347', '#ef5a2a'];
    const r2 = v => +v.toFixed(2);
    const etoile = (x, y, r, c1 = OR_V, c2 = OR_C, n = 5, rot = 0, iw = 2.6) => {
      const pts = Array.from({ length: n * 2 }, (_, j) => { const a = j / (n * 2) * Math.PI * 2 - Math.PI / 2, rr = j % 2 ? r * .44 : r; return [r2(Math.cos(a) * rr), r2(Math.sin(a) * rr)]; });
      let f = poly(pts, c2);
      for (let j = 0; j < n * 2; j += 2) f += poly([[0, 0], pts[j], pts[(j + 1) % (n * 2)]], c1);
      return place(f + encre(pts, iw), x, y, rot);
    };
    const croissantD = (r, k = 1.25) => `M0 ${-r} A${r} ${r} 0 0 0 0 ${r} A${r2(r * k)} ${r2(r * k)} 0 0 1 0 ${-r} Z`;
    const lune = (x, y, r, rot = 0, c1 = LUNE_C, c2 = LUNE_S) => place(`<path d="${croissantD(r)}" fill="${c2}"/>`
      + `<path d="${croissantD(r * .8, 1.32)}" transform="translate(${r2(-r * .12)} ${r2(-r * .1)})" fill="${c1}"/>`
      + `<path d="${croissantD(r)}" fill="none" stroke="${INK}" stroke-width="3" stroke-linejoin="round"/>`, x, y, rot);
    const ROC = [[-18, -10], [2, -20], [20, -4], [12, 16], [-12, 16]];
    const pierre = (s = 1, c1 = ROC_C, c2 = ROC_S) => place(poly(ROC, c2) + poly([[-18, -10], [2, -20], [4, 0], [-12, 16]], c1) + poly([[-6, -8], [2, -14], [2, -4]], '#fff3d2', 'opacity=".7"') + encre(ROC, 3), 0, 0, 0, s);
    const TRAINE = [[0, -24], [-34, -26], [-82, -12], [-58, -4], [-98, 6], [-52, 13], [-34, 24], [0, 24]];
    const meteore = (x, y, s, a, c1, c2, f = BRAISE) => place(
      poly(TRAINE, f[2]) + poly([[0, -16], [-34, -17], [-66, -5], [-44, 1], [-72, 9], [-30, 15], [0, 16]], f[1]) + poly([[0, -8], [-28, -7], [-48, 1], [-24, 8], [0, 8]], f[0]) + encre(TRAINE, 2.6)
      + pierre(1.25, c1, c2), x, y, a, s);
    const comete = (x, y, s, a, p) => place(trait('M-10 -8 Q-56 -26 -118 -14', p[1], 6) + trait('M-10 8 Q-62 14 -108 32', p[0], 4.4) + trait('M-12 0 Q-64 -6 -128 8', '#ffffff', 3)
      + L.halo(0, 0, 30, p[0], .7) + etoile(0, 0, 18, '#ffffff', OR_C, 4, 45), x, y, a, s);
    const scintille = (pts, c) => pts.map(([x, y, s]) => eclat(x, y, s, c, '#ffffff')).join('');

    Object.assign(S, {
      lueur_de_rosee: p => L.halo(100, 78, 54, p[0], .6) + lune(98, 76, 34, -20) + L.main(100, 132, 1.2)
        + L.plus(156, 64, .8) + scintille([[50, 66, .7], [144, 108, .5], [60, 104, .45]], p[0]),
      rosee_vive: p => lune(76, 96, 46, 0) + `<path d="M64 52 L76 82 L62 98 L80 116 L70 140" fill="none" stroke="${INK}" stroke-width="3.4" stroke-linejoin="round"/>`
        + [[128, 62, 30, .95], [150, 102, -20, 1.15], [132, 142, 60, .85], [168, 64, -40, .6]].map(([x, y, r, s]) => place(L.deux([[0, -12], [6, 2], [0, 10], [-5, 0]], [[0, -12], [0, 10], [-5, 0]], LUNE_C, p[1], 2.2), x, y, r, s)).join('')
        + eclat(170, 132, .6, p[0]),
      rai_de_nuee: p => trait('M64 64 L170 150', p[1], 8, 13) + trait('M64 64 L170 150', '#ffffff', 2.6, 0) + L.halo(56, 56, 40, p[0], .6) + etoile(56, 56, 30, '#ffffff', p[1], 4)
        + place(L.deux([[0, -10], [22, 0], [0, 10]], [[0, -10], [22, 0], [0, 0]], '#ffffff', p[1], 2.4), 168, 148, 39) + scintille([[132, 70, .6], [96, 150, .5]], p[0]),
      trait_d_aurore: p => comete(84, 116, 1.1, 145, p) + L.chevrons(150, 150, .62, '#fff3d2') + scintille([[50, 52, .6], [162, 134, .55]], p[0]),
      eclat_d_or_ancien: p => L.sol(150) + [[70, 54, 14], [118, 40, 18], [146, 86, 12], [92, 98, 15], [56, 118, 9], [132, 128, 10]].map(([x, y, r], j) => etoile(x, y, r, OR_V, j % 2 ? OR_C : p[1], 5, j * 12, 2.2)).join('')
        + Array.from({ length: 14 }, (_, j) => { const x = 46 + (j * 37) % 112, y = 40 + (j * 53) % 104; return poly([[x - 2.6, y], [x, y - 2.6], [x + 2.6, y], [x, y + 2.6]], j % 2 ? '#ffffff' : OR_C); }).join(''),
      ambre_fige: p => L.pied(96, 104, 1.1, '#8a5a3c', '#4e3022') + meteore(112, 82, .9, 40, p[0], p[2])
        + L.moins(48, 60, .9) + eclat(160, 140, .6, BRAISE[1]),
      meche_lente: p => L.soleil(100, 92, 42, P('feu'), { n: 12, long: 26, court: 14 })
        + place(poly([[-16, -6], [-4, -16], [14, -10], [16, 6], [2, 16], [-14, 10]], '#4a1208') + poly([[-8, -4], [0, -10], [8, -4], [4, 6], [-6, 4]], '#7a2410') + encre([[-16, -6], [-4, -16], [14, -10], [16, 6], [2, 16], [-14, 10]], 2.4), 112, 102)
        + IconesV3.outils.flamme(50, 154, .45, P('feu')) + IconesV3.outils.flamme(150, 156, .4, P('feu')),
      flamme_vive: p => place(L.deux([[-70, 30], [-62, -6], [-36, -34], [0, -42], [30, -30], [12, -22], [4, -4], [22, 8], [50, 4], [70, 30]], [[-70, 30], [-62, -6], [-36, -34], [0, -42], [30, -30], [12, -22], [4, -4], [-20, 30]], p[0], p[1], 3.4)
        + `<path d="M-50 20 Q-30 -20 0 -32" fill="none" stroke="#ffffff" stroke-width="3" stroke-linecap="round" opacity=".8"/>`, 98, 112)
        + lune(152, 48, 20, 20) + trait('M150 120 Q176 100 168 78', p[0], 4) + L.coeur(156, 132, .42) + L.chevrons(42, 72, .5, '#fff3d2', 180),
      souffle_partage: p => L.halo(56, 52, 34, p[0], .55) + etoile(56, 52, 20, '#ffffff', p[1], 4)
        + `<path d="M72 66 Q130 72 140 128" fill="none" stroke="${INK}" stroke-width="8" stroke-dasharray="10 9" stroke-linecap="round"/><path d="M72 66 Q130 72 140 128" fill="none" stroke="#fff3d2" stroke-width="3.6" stroke-dasharray="10 9" stroke-linecap="round"/>`
        + L.coeur(140, 146, .5) + cadranMini(54, 140, .9) + scintille([[160, 52, .5], [100, 40, .45]], p[0]),
      cercle_de_veille: p => place(poly(L.ngone(64, 20, 0, 24), p[2], 'opacity=".5"') + poly(L.ngone(46, 20, 0, 17), p[0], 'opacity=".55"') + `<path d="M${L.ngone(64, 20, 0, 24).map(q => q.join(' ')).join(' L')} Z" fill="none" stroke="${INK}" stroke-width="3"/>`, 100, 136)
        + [[-58, 0], [-30, 18], [8, 22], [44, 14], [56, -8], [24, -20], [-14, -22], [-44, -16]].map(([x, y], j) => etoile(100 + x, 136 + y, j % 2 ? 8 : 10, OR_V, OR_C, 5, j * 9, 2)).join('')
        + L.plus(100, 76, 1) + scintille([[62, 70, .55], [140, 62, .6]], p[0]),
      manteau_partage: p => [[100, 44], [44, 100], [156, 100], [100, 156]].map(([x, y]) => L.bulle(x, y, 18, p)).join('')
        + `<path d="M100 66 L100 134 M66 100 L134 100" stroke="${INK}" stroke-width="7" stroke-dasharray="6 7"/><path d="M100 66 L100 134 M66 100 L134 100" stroke="#fff3d2" stroke-width="3" stroke-dasharray="6 7"/>`
        + L.halo(100, 100, 34, LUNE_C, .5) + lune(100, 100, 26, -30),
      couronne_de_lumiere: p => L.halo(100, 150, 40, p[0], .5) + L.tuile(100, 152, 46, 16, p[0], p[1])
        + `<path d="M76 104 L70 140 M124 104 L130 140" stroke="${p[0]}" stroke-width="3" stroke-dasharray="5 6"/>`
        + place(poly(L.ngone(52, 24, 0, 16), 'none') + `<path d="M${L.ngone(52, 24, 0, 16).map(q => q.join(' ')).join(' L')} Z" fill="none" stroke="${INK}" stroke-width="8"/><path d="M${L.ngone(52, 24, 0, 16).map(q => q.join(' ')).join(' L')} Z" fill="none" stroke="${OR_C}" stroke-width="3.6"/>`, 100, 80)
        + [[-52, 0, 13], [-28, -14, 15], [0, -18, 19], [28, -14, 15], [52, 0, 13], [-28, 14, 11], [28, 14, 11]].map(([x, y, r]) => etoile(100 + x, 80 + y, r, '#ffffff', OR_C, 5, 0, 2.4)).join(''),
      eclair_solaire: p => L.sol(152) + meteore(114, 116, 1.1, 45, p[0], p[2]) + `<path d="M84 150 L70 140 M150 150 L164 138 M118 148 L118 134" stroke="${BRAISE[1]}" stroke-width="4" stroke-linecap="round"/>`
        + L.moins(44, 60, .8) + scintille([[160, 52, .5]], BRAISE[0]),
      perle_de_rosee: p => L.soleil(100, 96, 46, p, { n: 16, long: 28, court: 16 }) + L.halo(100, 96, 26, '#ffffff', .4) + scintille([[40, 44, .7], [166, 150, .6]], p[0]),
      geode_brisee: p => L.sol(154) + meteore(80, 66, .62, 45, p[0], p[2]) + meteore(152, 80, .56, 45, p[0], p[2]) + meteore(112, 126, .8, 45, p[0], p[2])
        + `<path d="M86 152 L76 144 M138 152 L148 142" stroke="${BRAISE[1]}" stroke-width="4" stroke-linecap="round"/>`,
      plume_d_aube: p => L.sol(150) + comete(80, 124, 1.05, 145, p) + L.moins(158, 128, .8) + scintille([[46, 54, .6], [150, 40, .5]], p[0]),
      grains_d_or: p => L.main(76, 138, .84, -36)
        + [[118, 92, 13, 0], [146, 64, 17, 1], [122, 50, 11, 2], [158, 106, 12, 3], [100, 70, 9, 4]].map(([x, y, r, j]) => `<path d="M${x - r * .8} ${y + r * .7} L${x - r * 2} ${y + r * 1.6}" stroke="${p[0]}" stroke-width="${r * .3}" stroke-linecap="round" opacity=".75"/>` + etoile(x, y, r, OR_V, j % 2 ? OR_C : p[1], 5, j * 17, 2.2)).join('')
        + eclat(52, 70, .6, p[1]),
      sable_d_aube: p => place(poly(L.ngone(70, 18, 0, 28), ROC_S) + poly(L.ngone(54, 18, 0, 20), '#4e3d2e') + poly(L.ngone(38, 18, 0, 13), p[1], 'opacity=".9"') + poly(L.ngone(22, 18, 0, 7), '#ffffff', 'opacity=".7"')
        + `<path d="M${L.ngone(70, 18, 0, 28).map(q => q.join(' ')).join(' L')} Z" fill="none" stroke="${INK}" stroke-width="3"/>`, 100, 138)
        + [[38, 128, 20], [160, 124, -30], [72, 108, 60], [134, 104, 10]].map(([x, y, r]) => place(pierre(.5), x, y, r)).join('')
        + L.halo(100, 120, 30, p[0], .5) + L.plus(100, 78, 1.05) + scintille([[60, 60, .6], [148, 56, .55]], p[0]),
      poids_du_jour: p => L.sol(152) + meteore(108, 110, 1.35, 60, p[0], p[2])
        + `<path d="M48 160 L62 152 L58 168 M152 160 L138 152 L142 168" stroke="${INK}" stroke-width="2.6" fill="none"/>`
        + L.chevrons(40, 100, .55, p[1], 90) + L.chevrons(166, 100, .55, p[1], 90),
      bascule_du_ciel: p => place(`<path d="M0 -40 A40 40 0 0 0 0 40 Z" fill="#ffc870"/><path d="M0 -40 A40 40 0 0 1 0 40 Z" fill="#3b2f5c"/>`
          + `<path d="M0 -40 A40 40 0 0 0 0 40 Z" fill="none" stroke="${INK}" stroke-width="3"/><circle r="40" fill="none" stroke="${INK}" stroke-width="3.4"/>`, 100, 100)
        + L.soleil(84, 100, 16, P('feu'), { n: 8, long: 10, court: 6 }) + lune(120, 100, 18, 180)
        + `<path d="M58 54 A62 62 0 0 1 150 60" fill="none" stroke="${INK}" stroke-width="9" stroke-linecap="round"/><path d="M58 54 A62 62 0 0 1 150 60" fill="none" stroke="#fff3d2" stroke-width="4" stroke-linecap="round"/>`
        + `<path d="M142 146 A62 62 0 0 1 50 140" fill="none" stroke="${INK}" stroke-width="9" stroke-linecap="round"/><path d="M142 146 A62 62 0 0 1 50 140" fill="none" stroke="#fff3d2" stroke-width="4" stroke-linecap="round"/>`
        + pointe(152, 64, 60, '#fff3d2', .9) + pointe(48, 136, 240, '#fff3d2', .9),
    });
    function cadranMini(x, y, s) { return cadran(x, y, s * .55); }
  }

  if (O.thalor) {
    const T = O.thalor, { CAL, SAPH, MAGMA, ARD, RUB } = T;
    const lance = (fin, c) => T.pointille('M52 128 Q60 26 ' + fin, c) + T.G(44, 156, 26, .5);
    Object.assign(S, {
      empoigne: p => T.G(100, 130, 0, .9) + T.pion(100, 70, 1, false) + T.chevrons(156, 116, .5, '#fff3d2', 180, 1) + T.chevrons(44, 116, .5, '#fff3d2', 0, 1),
      prise_ferme: p => T.G(96, 134, 0, .9) + T.pion(96, 74, 1, false) + T.impact(146, 62, .62, p) + eclat(48, 58, .7, p[1], p[0]),
      lancer_de_durren: p => T.sol(154) + lance('136 92', p[0]) + T.impact(138, 146, .8, p) + T.pion(138, 116, 1.15, false, 14)
        + T.chevrons(178, 140, .42, p[0], 180, 1),
      bloc_de_durren: p => T.sol(152) + T.bloc(100, 110, 2.2, 0, CAL, SAPH[1]) + eclat(156, 50, .8, SAPH[1], SAPH[0]) + eclat(46, 70, .55, SAPH[1], SAPH[0]),
      jet_du_torrent: p => lance('136 86', SAPH[0])
        + T.coulee('M78 160 Q108 128 136 146 Q156 158 182 134', p, 20) + T.galet(136, 112, 1.25, 20)
        + T.goutte(104, 124, 1, p) + T.goutte(170, 104, .9, p)
        + place(trait('M0 -12 L0 12 M-12 0 L12 0', '#fff3d2', 5, 10), 158, 48),
      jet_de_lave: p => lance('136 86', MAGMA[1])
        + T.coulee('M78 160 Q108 128 136 146 Q156 158 182 134', MAGMA, 20) + T.galet(136, 112, 1.25, 20, [MAGMA[0], MAGMA[1], MAGMA[2], MAGMA[3]])
        + IconesV3.outils.flamme(100, 132, .5, P('feu')) + IconesV3.outils.flamme(172, 120, .4, P('feu')) + eclat(160, 50, .8, MAGMA[1], MAGMA[0]),
      jet_des_cimes: p => T.sol(154) + lance('132 90', ARD[0]) + T.galet(132, 126, 1.2, 20, ARD)
        + T.chevrons(176, 128, .5, ARD[0], 0, 1) + T.chevrons(92, 128, .5, ARD[0], 180, 1)
        + trait('M96 56 Q116 40 136 52 Q152 62 170 46', ARD[0], 4.4) + trait('M120 74 Q136 64 152 72', ARD[0], 3.4),
    });
  }

  if (O.orvald) {
    const V = O.orvald;
    const roche = (x, y, s, filon) => place(
      poly([[-48, 30], [-52, -6], [-30, -36], [6, -42], [40, -24], [52, 8], [40, 34]], '#5a4a3c')
      + poly([[-48, 30], [-52, -6], [-30, -36], [6, -42], [10, -8], [-12, 30]], '#8a7464')
      + poly([[-30, -36], [6, -42], [10, -8], [-20, -6]], '#a8937d')
      + encre([[-48, 30], [-52, -6], [-30, -36], [6, -42], [40, -24], [52, 8], [40, 34]], 3.4)
      + trait('M-38 12 L-16 -2 L-2 10 L18 -14 L38 -4', filon[1], 6, 11)
      + trait('M-38 12 L-16 -2 L-2 10 L18 -14 L38 -4', filon[0], 2, 2), x, y, 0, s);
    const OR = [OR_V, OR_C, OR_S];
    Object.assign(S, {
      marque_du_filon: p => roche(100, 128, 1.05, OR) + V.PI(p, 92, 112, -30, .62) + V.pepite(150, 70, .8, 20) + V.pepite(54, 150, .6, -10) + eclat(64, 74, .7, OR_C, OR_V),
      veine_profonde: p => roche(100, 124, 1.05, [p[0], p[1]]) + V.PI(p, 92, 108, -30, .62) + V.goutte(146, 150, .8, p) + V.goutte(62, 156, .6, p) + V.goutte(156, 70, .6, p),
      charge_de_mineur: p => V.filets(64, 104, 1.1, p[1]) + V.botte(118, 130, .8, 0) + V.PI(p, 126, 84, 40, .62) + V.impact(168, 58, p, .7),
      course_de_galerie: p => V.galerie(false) + V.filets(78, 108, 1, p[0]) + V.PI(p, 124, 112, 50, .55) + V.chevrons(150, 150, .5, p[0]),
      veine_d_or: p => roche(100, 122, 1.15, OR) + V.pepite(64, 62, .9, -20) + V.pepite(138, 56, 1.1, 10) + V.pepite(160, 92, .7, 40)
        + eclat(100, 40, 1, OR_C, OR_V) + eclat(46, 104, .6, OR_C, OR_V),
      galerie_de_fortune: p => V.galerie(false) + jet('M64 150 Q100 70 142 128', OR_V) + pointe(142, 128, 60, OR_C) + V.botte(60, 140, .42, 0),
      detour_par_la_besace: p => V.besace(66, 124, .82) + V.botte(146, 136, .5, 0)
        + jet('M66 76 Q104 36 142 82', OR_V) + pointe(142, 82, 70, OR_C) + jet('M146 168 Q104 196 70 166', OR_V) + pointe(70, 166, 210, OR_C),
    });
  }

  if (O.fennal) {
    const F = O.fennal;
    const sifflet = (x, y, s, r = 0) => place(
      poly([[-34, -9], [24, -9], [34, -14], [34, 14], [24, 9], [-34, 9]], '#efe2c8') + poly([[-34, -9], [24, -9], [34, -14], [34, 0], [-34, 0]], '#fffaf0')
      + encre([[-34, -9], [24, -9], [34, -14], [34, 14], [24, 9], [-34, 9]], 3)
      + `<rect x="-6" y="-9" width="12" height="7" fill="${INK}"/>` + `<path d="M-20 -9 V9 M10 -9 V9" stroke="${OR_S}" stroke-width="3"/>`, x, y, r, s);
    const fouet = d => trait(d, '#7a5236', 9, 15) + trait(d, '#c99a6a', 3.4, 3.4);
    Object.assign(S, {
      coup_de_sifflet: p => sifflet(66, 72, .95, -24) + F.ondes(102, 58, .9, '#fff3d2', 3, -20)
        + F.grouk(132, 128, .78) + F.croc(70, 140, .7, 20) + F.croc(98, 160, .55, -10),
      fouet_de_meneur: p => fouet('M36 170 Q44 84 104 66 Q146 54 160 36') + place(trait('M-6 0 L6 0', '#3a2a20', 6, 11), 36, 172, 70)
        + eclat(162, 36, 1.2, OR_C, OR_V) + F.groukGalop(116, 136, .62) + F.chevrons(168, 132, .55, '#fff3d2') + F.plus(56, 58, .7),
      horde_ephemere: p => F.cercleAppel(100, 150, 1.25, '#80d697')
        + `<g opacity=".55">${F.grouk(52, 112, .6)}${F.molh(150, 112, .55)}</g>` + F.glym(100, 104, .9)
        + eclat(46, 52, .6, '#ffffff') + eclat(156, 48, .7, '#ffffff'),
      pacte_de_meute: p => F.coeur(100, 108, 1.15) + F.grouk(48, 64, .45) + F.glym(152, 60, .5) + F.molh(100, 164, .38)
        + F.plus(152, 150, .6),
    });
  }

  {
    const BR = ['#f4f1ff', '#c9c2e6', '#7e78ad', '#2e2a4c'];
    const { flamme, roc } = IconesV3.outils;
    const brume = (x, y, s, c = BR, op = 1) => place(`<g opacity="${op}">`
      + `<path d="M-40 10 Q-46 -8 -28 -12 Q-24 -30 -4 -26 Q8 -40 24 -26 Q44 -26 40 -6 Q52 6 38 14 Z" fill="${c[1]}" stroke="${INK}" stroke-width="3.4" stroke-linejoin="round"/>`
      + `<path d="M-30 -2 Q-30 -14 -18 -14 Q-14 -26 0 -22 Q10 -32 22 -22" fill="none" stroke="${c[0]}" stroke-width="5" stroke-linecap="round"/>`
      + `<path d="M-34 10 Q0 18 34 12" fill="none" stroke="${c[2]}" stroke-width="4" stroke-linecap="round"/></g>`, x, y, 0, s);
    const tisseur = (x, y, s, c = BR, op = 1) => place(`<g opacity="${op}">`
      + `<path d="M0 -52 Q26 -50 26 -18 L44 40 Q0 50 -44 40 L-26 -18 Q-26 -50 0 -52 Z" fill="${c[2]}" stroke="${INK}" stroke-width="3.4" stroke-linejoin="round"/>`
      + `<path d="M0 -52 Q-26 -50 -26 -18 L-44 40 Q-20 46 -4 44 L-6 -10 Q-8 -40 0 -52 Z" fill="${c[1]}"/>`
      + `<path d="M-12 -2 Q0 8 12 -2 L18 44 M-12 -2 L-18 44" fill="none" stroke="${c[3]}" stroke-width="2.6"/>`
      + `<ellipse cx="0" cy="-26" rx="13" ry="15" fill="${INK}"/><circle cx="-5" cy="-26" r="2.6" fill="#bff3ff"/><circle cx="5" cy="-26" r="2.6" fill="#bff3ff"/>`
      + `<path d="M0 -52 Q26 -50 26 -18 L44 40 Q0 50 -44 40 L-26 -18 Q-26 -50 0 -52 Z" fill="none" stroke="${INK}" stroke-width="3.4" stroke-linejoin="round"/></g>`, x, y, 0, s);
    const pion = (x, y, s, c = ['#ffd2c4', '#e0644e', '#7a2418']) => place(
      `<circle cx="0" cy="-26" r="13" fill="${c[1]}" stroke="${INK}" stroke-width="3.2"/><circle cx="-4" cy="-30" r="4" fill="${c[0]}"/>`
      + poly([[-16, 22], [-10, -10], [10, -10], [16, 22]], c[1]) + poly([[-16, 22], [-10, -10], [0, -10], [-2, 22]], c[0]) + encre([[-16, 22], [-10, -10], [10, -10], [16, 22]], 3.2), x, y, 0, s);
    const corde = (d, c = '#e9cf9a') => trait(d, '#9a6a3a', 8, 13) + `<path d="${d}" fill="none" stroke="${c}" stroke-width="3" stroke-dasharray="5 6" stroke-linecap="round"/>`;
    Object.assign(S, {
      eclat: p => brume(50, 156, .72) + trait('M56 150 L132 72', p[2], 26, 34) + trait('M62 144 L130 76', p[1], 12, 12) + trait('M66 140 L126 80', p[0], 3.4, 3.4) + flamme(140, 62, 1, p) + eclat(170, 120, .8, p[1], p[0]) + eclat(54, 70, .6, p[1], p[0]),
      givre: p => tisseur(100, 98, .9, BR, .35)
        + `<ellipse cx="100" cy="128" rx="58" ry="22" fill="none" stroke="${INK}" stroke-width="20"/><ellipse cx="100" cy="128" rx="58" ry="22" fill="none" stroke="${p[1]}" stroke-width="13"/><ellipse cx="100" cy="124" rx="56" ry="19" fill="none" stroke="${p[0]}" stroke-width="3.4"/>`
        + [[44, 116, -30], [154, 112, 30], [100, 152, 180], [72, 146, 200], [130, 148, 160]].map(([x, y, r]) => place(poly([[0, -16], [6, 0], [0, 6], [-6, 0]], p[0]) + encre([[0, -16], [6, 0], [0, 6], [-6, 0]], 2.6), x, y, r)).join('')
        + eclat(150, 54, .8, p[1], p[0]) + eclat(56, 62, .55, p[1], p[0]),
      bourrasque: p => `<rect x="160" y="40" width="22" height="124" rx="3" fill="#6f6680" stroke="${INK}" stroke-width="3.4"/><path d="M160 72 H182 M160 104 H182 M160 136 H182" stroke="${INK}" stroke-width="2.6"/>`
        + brume(66, 92, 1, BR) + trait('M36 132 Q80 150 124 128', p[0], 6) + trait('M50 66 Q90 52 128 70', p[0], 5)
        + pion(140, 118, .8) + eclat(150, 74, .7, p[1], p[0]),
      secousse: p => `<path d="M100 100 L100 30 M100 100 L100 172 M100 100 L28 100 M100 100 L172 100" stroke="${INK}" stroke-width="20" stroke-linecap="round"/><path d="M100 100 L100 30 M100 100 L100 172 M100 100 L28 100 M100 100 L172 100" stroke="#3a2a1c" stroke-width="11" stroke-linecap="round"/>`
        + `<path d="M100 44 L94 60 L104 72 L96 86 M100 158 L108 140 L96 128 L104 114 M42 100 L58 94 L70 104 L84 96 M158 100 L142 108 L128 96 L114 104" fill="none" stroke="${p[1]}" stroke-width="4" stroke-linejoin="round"/>`
        + roc(100, 100, 3.2, 0, '#e9d8bd', '#8f7a66') + roc(148, 56, 1.8, 30, p[1], p[2]) + roc(50, 148, 1.7, -20, p[1], p[2]) + roc(52, 54, 1.5, 60, p[1], p[2]) + roc(150, 148, 1.5, 10, p[1], p[2]),
      pas_de_voile: p => tisseur(54, 118, .78, BR, .4) + brume(54, 158, .7) + tisseur(146, 82, .86) + brume(146, 126, .78)
        + jet('M66 86 Q86 24 128 40', BR[0]) + pointe(128, 42, 20, BR[1]),
      lame_orage: p => trait('M36 170 L120 86', '#6a4424', 13, 20) + trait('M40 164 L116 90', '#b07a52', 4, 4)
        + place(poly([[0, -46], [20, 0], [0, 46], [-20, 0]], p[1]) + poly([[0, -46], [20, 0], [0, 0], [-20, 0]], p[0]) + encre([[0, -46], [20, 0], [0, 46], [-20, 0]], 3.4), 140, 64, 45, 1.05)
        + trait('M120 128 L142 118 L132 104 L164 92', '#bff3ff', 7, 13) + flamme(150, 50, .5, p) + eclat(60, 64, .8, '#bff3ff', '#ffffff'),
      retour_de_voile: p => tisseur(100, 100, .9, BR, .55) + brume(100, 146, 1.25)
        + `<path d="M150 108 A48 48 0 1 0 68 66" fill="none" stroke="${INK}" stroke-width="13" stroke-linecap="round"/><path d="M150 108 A48 48 0 1 0 68 66" fill="none" stroke="${BR[0]}" stroke-width="6" stroke-linecap="round"/>`
        + pointe(66, 70, 140, BR[0], 1.1),
      siphon: p => `<path d="M30 70 Q70 40 100 70 T170 70" fill="none" stroke="${INK}" stroke-width="20" stroke-linecap="round"/><path d="M30 70 Q70 40 100 70 T170 70" fill="none" stroke="${p[2]}" stroke-width="12" stroke-linecap="round"/><path d="M34 66 Q70 40 100 66" fill="none" stroke="${p[0]}" stroke-width="3.4" stroke-linecap="round"/>`
        + `<path d="M100 76 Q86 108 108 122 Q132 136 116 160" fill="none" stroke="${INK}" stroke-width="16" stroke-linecap="round"/><path d="M100 76 Q86 108 108 122 Q132 136 116 160" fill="none" stroke="${p[1]}" stroke-width="8" stroke-linecap="round"/>`
        + place(`<circle r="14" fill="${p[1]}" stroke="${INK}" stroke-width="3"/><path d="M-6 -2 L0 6 L6 -2" fill="none" stroke="${INK}" stroke-width="3"/>`, 150, 140) + place(`<circle r="14" fill="${p[1]}" stroke="${INK}" stroke-width="3"/><path d="M-6 -2 L0 6 L6 -2" fill="none" stroke="${INK}" stroke-width="3"/>`, 60, 140)
        + eclat(150, 108, .55, p[1], p[0]),
      nova: p => [0, 1, 2, 3, 4, 5, 6, 7].map(k => { const a = k * Math.PI / 4 + Math.PI / 8, x = 100 + Math.cos(a) * 66, y = 104 + Math.sin(a) * 60; return flamme(x, y, .52, p); }).join('')
        + brume(100, 136, 1.1, ['#ffe9c8', '#f1b07a', '#a35a3a', '#3e1e0c']) + tisseur(100, 96, .82),
      attraction: p => corde('M36 156 Q46 60 112 80 Q136 88 140 104') + pion(142, 122, 1.05) + `<ellipse cx="142" cy="106" rx="24" ry="9" fill="none" stroke="${INK}" stroke-width="11"/><ellipse cx="142" cy="106" rx="24" ry="9" fill="none" stroke="#e9cf9a" stroke-width="4.6"/>` + place(trait('M0 -14 L-14 0 L0 14', p[0], 6), 98, 152) + place(trait('M0 -14 L-14 0 L0 14', p[0], 6), 80, 152),
    });
    Object.assign(IconesV4.TYPES = IconesV4.TYPES || {}, { retour_de_voile: 'placement' });
  }

  {
    const AC = ['#eef3f8', '#b4c0cd', '#66727f', '#262d38'];
    const CU = ['#ffe2bd', '#e39a5a', '#a35a2a', '#3e1e0c'];
    const { flamme } = IconesV3.outils;
    const rivets = (pts, c = AC[0]) => pts.map(([x, y]) => `<circle cx="${x}" cy="${y}" r="3.6" fill="${c}" stroke="${INK}" stroke-width="2"/>`).join('');
    const engrenage = (x, y, s, c = CU) => { let d = ''; for (let k = 0; k < 16; k++) { const a = k * Math.PI / 8, r = k % 2 ? 22 : 28, a2 = a + Math.PI / 8 * .5; d += `${k ? 'L' : 'M'}${(Math.cos(a) * r).toFixed(1)} ${(Math.sin(a) * r).toFixed(1)} L${(Math.cos(a2) * r).toFixed(1)} ${(Math.sin(a2) * r).toFixed(1)}`; }
      return place(`<path d="${d}Z" fill="${c[1]}" stroke="${INK}" stroke-width="3" stroke-linejoin="round"/><circle r="12" fill="${c[2]}" stroke="${INK}" stroke-width="2.6"/><circle r="5" fill="${c[0]}" stroke="${INK}" stroke-width="2"/>`, x, y, 0, s); };
    const vapeur = (x, y, s, op = .95) => place(`<g opacity="${op}"><path d="M0 0 Q-14 -10 -6 -24 Q4 -34 -2 -48" fill="none" stroke="${INK}" stroke-width="12" stroke-linecap="round"/><path d="M0 0 Q-14 -10 -6 -24 Q4 -34 -2 -48" fill="none" stroke="#f4f6fa" stroke-width="6" stroke-linecap="round"/><path d="M14 -6 Q24 -18 16 -30" fill="none" stroke="${INK}" stroke-width="10" stroke-linecap="round"/><path d="M14 -6 Q24 -18 16 -30" fill="none" stroke="#dfe6ee" stroke-width="4.4" stroke-linecap="round"/></g>`, x, y, 0, s);
    const plaque = (x, y, w, h, c = AC) => `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="4" fill="${c[2]}" stroke="${INK}" stroke-width="3.2"/><rect x="${x + 4}" y="${y + 4}" width="${w - 8}" height="${h * .42}" rx="2" fill="${c[1]}"/>`;
    const cle = (x, y, r, s) => place(poly([[-6, 40], [6, 40], [6, -14], [-6, -14]], AC[1]) + encre([[-6, 40], [6, 40], [6, -14], [-6, -14]], 3)
      + `<path d="M-16 -14 L-16 -36 L-6 -36 L-6 -24 L6 -24 L6 -36 L16 -36 L16 -14 Z" fill="${AC[1]}" stroke="${INK}" stroke-width="3" stroke-linejoin="round"/><path d="M-3 32 V-10" stroke="${AC[0]}" stroke-width="3"/>`, x, y, r, s);
    Object.assign(S, {
      tourelle_de_kaldum: p => plaque(46, 132, 108, 30) + rivets([[56, 147], [100, 147], [144, 147]])
        + `<path d="M62 132 Q62 86 100 84 Q138 86 138 132 Z" fill="${CU[1]}" stroke="${INK}" stroke-width="3.4"/><path d="M70 128 Q70 94 100 92" fill="none" stroke="${CU[0]}" stroke-width="4" stroke-linecap="round"/>`
        + `<rect x="96" y="84" width="74" height="18" rx="4" transform="rotate(-24 100 92)" fill="${AC[2]}" stroke="${INK}" stroke-width="3.2"/><rect x="100" y="86" width="66" height="6" transform="rotate(-24 100 92)" fill="${AC[0]}"/>`
        + rivets([[80, 118], [120, 118], [100, 104]], CU[0]) + eclat(170, 50, .8, p[1], p[0]) + engrenage(48, 74, .62),
      mur_articule: p => [44, 82, 120].map((x, k) => plaque(x, 46 + (k % 2) * 6, 36, 110 - (k % 2) * 12) + rivets([[x + 8, 58 + (k % 2) * 6], [x + 28, 58 + (k % 2) * 6], [x + 8, 140 - (k % 2) * 6], [x + 28, 140 - (k % 2) * 6]])).join('')
        + `<path d="M80 60 V146 M118 60 V146" stroke="${CU[1]}" stroke-width="6"/><path d="M80 60 V146 M118 60 V146" stroke="${INK}" stroke-width="2" stroke-dasharray="6 10"/>`
        + `<path d="M30 164 H170" stroke="${INK}" stroke-width="6" stroke-linecap="round"/><path d="M30 164 H170" stroke="${p[1]}" stroke-width="2.6" stroke-linecap="round"/>`,
      mine_a_fil: p => `<path d="M24 140 H176" stroke="${INK}" stroke-width="8" stroke-linecap="round"/><path d="M24 140 H176" stroke="#8a7464" stroke-width="4" stroke-linecap="round"/>`
        + `<path d="M50 140 Q50 92 100 92 Q150 92 150 140 Z" fill="${AC[2]}" stroke="${INK}" stroke-width="3.4"/><path d="M58 136 Q58 100 100 100" fill="none" stroke="${AC[1]}" stroke-width="5" stroke-linecap="round"/>`
        + rivets([[70, 128], [100, 112], [130, 128]]) + `<path d="M120 96 Q128 70 112 58 Q100 48 108 36" fill="none" stroke="${INK}" stroke-width="7" stroke-linecap="round"/><path d="M120 96 Q128 70 112 58 Q100 48 108 36" fill="none" stroke="#c9a46a" stroke-width="3" stroke-linecap="round"/>`
        + flamme(110, 36, .36, p) + eclat(146, 54, .6, p[1], p[0]) + `<path d="M84 140 L92 128 L100 140 L108 128 L116 140" fill="none" stroke="${p[1]}" stroke-width="3"/>`,
      marteau: p => `<path d="M40 162 H160" stroke="${INK}" stroke-width="8" stroke-linecap="round"/>`
        + `<rect x="92" y="18" width="16" height="70" fill="${AC[1]}" stroke="${INK}" stroke-width="3.2"/><rect x="95" y="20" width="5" height="66" fill="${AC[0]}"/>`
        + `<rect x="56" y="80" width="88" height="54" rx="6" fill="${AC[2]}" stroke="${INK}" stroke-width="3.6"/><rect x="62" y="86" width="76" height="16" rx="3" fill="${AC[1]}"/><rect x="50" y="122" width="100" height="16" rx="4" fill="${CU[1]}" stroke="${INK}" stroke-width="3.2"/>`
        + rivets([[68, 112], [132, 112]]) + `<path d="M40 150 L56 140 M160 150 L144 140 M30 132 L50 130 M170 132 L150 130" stroke="${p[1]}" stroke-width="5" stroke-linecap="round"/>`,
      surchauffe: p => engrenage(100, 120, 1.5, AC) + `<rect x="92" y="44" width="16" height="40" fill="${CU[1]}" stroke="${INK}" stroke-width="3"/><circle cx="100" cy="120" r="10" fill="${p[2]}" stroke="${INK}" stroke-width="2.6"/>`
        + vapeur(70, 60, 1) + vapeur(126, 52, .9) + flamme(148, 92, .42, p) + flamme(52, 100, .36, p),
      reparation: p => engrenage(84, 112, 1.5) + cle(132, 96, 40, 1.1) + `<path d="M40 54 A60 60 0 0 1 104 36" fill="none" stroke="${INK}" stroke-width="9" stroke-linecap="round"/><path d="M40 54 A60 60 0 0 1 104 36" fill="none" stroke="#fff3d2" stroke-width="4" stroke-linecap="round"/>` + pointe(104, 37, 10, '#fff3d2')
        + place(trait('M0 -12 L0 12 M-12 0 L12 0', '#9fe06a', 6, 11), 152, 156),
      propulseur: p => plaque(26, 78, 70, 46) + rivets([[36, 88], [86, 88], [36, 114], [86, 114]])
        + `<rect x="94" y="92" width="50" height="18" fill="${AC[1]}" stroke="${INK}" stroke-width="3"/><rect x="96" y="94" width="46" height="5" fill="${AC[0]}"/><rect x="140" y="74" width="16" height="54" rx="3" fill="${CU[1]}" stroke="${INK}" stroke-width="3.2"/>`
        + vapeur(40, 76, .7) + place(trait('M0 -14 L14 0 L0 14', p[0], 5), 168, 100) + place(trait('M0 -14 L14 0 L0 14', p[0], 5), 184, 100) + eclat(152, 60, .6, p[1], p[0]),
      grappin: p => `<path d="M40 150 Q60 60 128 66" fill="none" stroke="${INK}" stroke-width="10" stroke-dasharray="12 6" stroke-linecap="round"/><path d="M40 150 Q60 60 128 66" fill="none" stroke="${AC[1]}" stroke-width="5" stroke-dasharray="12 6" stroke-linecap="round"/>`
        + place(`<path d="M0 -20 V10 Q0 28 18 28 Q34 28 34 12" fill="none" stroke="${INK}" stroke-width="13" stroke-linecap="round"/><path d="M0 -20 V10 Q0 28 18 28 Q34 28 34 12" fill="none" stroke="${AC[1]}" stroke-width="6" stroke-linecap="round"/>` + poly([[34, 2], [42, 16], [28, 14]], AC[0]) + encre([[34, 2], [42, 16], [28, 14]], 2.6), 136, 72, -20, 1.2)
        + engrenage(44, 150, .7) + place(trait('M0 -14 L-14 0 L0 14', p[0], 5), 100, 150) + place(trait('M0 -14 L-14 0 L0 14', p[0], 5), 118, 150),
      detonation: p => [[0, 1], [1, .8], [2, 1], [3, .8], [4, 1], [5, .8], [6, 1], [7, .8]].map(([k, l]) => { const a = k * Math.PI / 4 + .2; return trait(`M100 104 L${(100 + Math.cos(a) * 74 * l).toFixed(1)} ${(104 + Math.sin(a) * 74 * l).toFixed(1)}`, p[1], 7); }).join('')
        + `<path d="M64 132 L60 90 Q100 62 140 90 L136 132 Z" fill="${CU[2]}" stroke="${INK}" stroke-width="3.4"/><path d="M70 96 Q100 76 130 96" fill="none" stroke="${CU[0]}" stroke-width="4"/><path d="M92 78 L100 98 L110 82 L104 110" fill="none" stroke="${INK}" stroke-width="4"/>`
        + rivets([[72, 118], [128, 118], [100, 122]]) + flamme(100, 60, .5, p) + eclat(40, 54, .7, p[1], p[0]) + eclat(160, 150, .6, p[1], p[0]),
      forge: p => `<circle cx="100" cy="110" r="52" fill="${CU[1]}" stroke="${INK}" stroke-width="4"/><circle cx="100" cy="110" r="42" fill="#fbf4e6" stroke="${INK}" stroke-width="2.6"/>`
        + `<path d="M64 128 A40 40 0 0 1 136 128" fill="none" stroke="#9fe06a" stroke-width="7"/><path d="M118 82 A40 40 0 0 1 136 128" fill="none" stroke="#ef5a2a" stroke-width="7"/>`
        + `<path d="M100 110 L132 88" stroke="${INK}" stroke-width="6" stroke-linecap="round"/><circle cx="100" cy="110" r="7" fill="${AC[2]}" stroke="${INK}" stroke-width="2.4"/>`
        + vapeur(52, 60, .8) + vapeur(150, 58, .8) + place(trait('M0 12 V-12 M-10 -2 L0 -12 L10 -2', '#fff3d2', 6, 11), 100, 34),
    });
    Object.assign(IconesV4.TYPES = IconesV4.TYPES || {}, { mur_articule: 'placement', mine_a_fil: 'degats', forge: 'soin' });
  }

  {
    const NO = ['#fff8ea', '#f3d9a8', '#3a2c4c', '#1b1424'];
    const note = (x, y, s, c = NO[2], croche = false, r = 0) => place(
      `<ellipse cx="0" cy="0" rx="14" ry="10" transform="rotate(-24)" fill="${c}" stroke="${INK}" stroke-width="3"/><ellipse cx="-4" cy="-3" rx="5" ry="3" transform="rotate(-24)" fill="#fff" opacity=".35"/>`
      + `<path d="M12 -4 V-58" stroke="${INK}" stroke-width="8" stroke-linecap="round"/><path d="M12 -4 V-58" stroke="${c}" stroke-width="3.4" stroke-linecap="round"/>`
      + (croche ? `<path d="M12 -58 Q32 -46 28 -24" fill="none" stroke="${INK}" stroke-width="9" stroke-linecap="round"/><path d="M12 -58 Q32 -46 28 -24" fill="none" stroke="${c}" stroke-width="4" stroke-linecap="round"/>` : ''), x, y, r, s);
    const portee = (y, c = '#fff3d2', ond = 8) => [0, 1, 2].map(k => trait(`M28 ${y + k * 12} Q64 ${y + k * 12 - ond} 100 ${y + k * 12} T172 ${y + k * 12}`, c, 2.6, 6)).join('');
    const ondes = (x, y, s, c, r = 0, n = 3) => place(Array.from({ length: n }, (_, k) => trait(`M${14 + k * 14} -${16 + k * 8} Q${24 + k * 16} 0 ${14 + k * 14} ${16 + k * 8}`, c, 4.4)).join(''), x, y, r, s);
    Object.assign(S, {
      cadence: p => note(92, 136, 1.4, NO[2]) + place(trait('M-16 -10 L10 0 L-16 10', p[1], 6, 11), 52, 58) + place(trait('M0 -12 L0 12 M-12 0 L12 0', '#fff3d2', 6, 11), 150, 140) + eclat(150, 60, .9, p[1], p[0]),
      refrain: p => portee(50) + note(70, 146, .95, NO[2], true) + note(124, 132, .95, NO[2], true) + place(trait('M0 -12 L12 0 L0 12', '#fff3d2', 5), 164, 154) + place(trait('M0 -12 L12 0 L0 12', '#fff3d2', 5), 180, 154),
      dissonance: p => note(90, 140, 1.25, NO[2]) + `<path d="M58 160 L80 136 L74 126 L104 98" fill="none" stroke="#fff3d2" stroke-width="4" stroke-linejoin="round"/>` + `<path d="M70 66 L86 80 L74 92 L94 108" fill="none" stroke="${INK}" stroke-width="8" stroke-linejoin="round"/><path d="M70 66 L86 80 L74 92 L94 108" fill="none" stroke="${p[0]}" stroke-width="3.4" stroke-linejoin="round"/>`
        + `<path d="M130 60 L146 70 L134 80 L152 90 L138 100 L156 110" fill="none" stroke="${INK}" stroke-width="9" stroke-linejoin="round"/><path d="M130 60 L146 70 L134 80 L152 90 L138 100 L156 110" fill="none" stroke="${p[1]}" stroke-width="4" stroke-linejoin="round"/>` + IconesV3.outils.croix(156, 150, 2.2),
      note_vive: p => trait('M30 140 L80 120', p[1], 4) + trait('M34 162 L84 140', p[1], 4) + trait('M40 116 L76 104', p[1], 3.4)
        + note(124, 140, 1.15, NO[2], true, 18) + `<circle cx="150" cy="150" r="7" fill="${NO[2]}" stroke="${INK}" stroke-width="2.6"/>` + eclat(160, 56, .9, p[1], p[0]),
      berceuse: p => `<path d="M96 36 A54 54 0 1 0 150 120 A42 42 0 1 1 96 36 Z" fill="#ffe8a8" stroke="${INK}" stroke-width="3.6" stroke-linejoin="round"/><path d="M84 48 A42 42 0 0 0 70 120" fill="none" stroke="#fff8e0" stroke-width="5" stroke-linecap="round"/>` + note(140, 150, .8, NO[2]) + note(66, 160, .55, NO[2])
        + `<text x="140" y="70" font-family="Inter,sans-serif" font-weight="800" font-size="30" fill="${p[0]}" stroke="${INK}" stroke-width="3" paint-order="stroke">z</text><text x="160" y="46" font-family="Inter,sans-serif" font-weight="800" font-size="22" fill="${p[0]}" stroke="${INK}" stroke-width="3" paint-order="stroke">z</text>`,
      envolee: p => place(`<path d="M0 0 Q-30 -24 -44 -6 Q-30 -10 -24 4 Q-36 2 -40 14 Q-20 12 0 6 Z" fill="#fffaf0" stroke="${INK}" stroke-width="3" stroke-linejoin="round"/>`, 98, 110, 0, 1.2)
        + place(`<path d="M0 0 Q30 -24 44 -6 Q30 -10 24 4 Q36 2 40 14 Q20 12 0 6 Z" fill="#fffaf0" stroke="${INK}" stroke-width="3" stroke-linejoin="round"/>`, 120, 104, 0, 1.2)
        + note(104, 130, 1.1, NO[2], true) + place(trait('M-12 8 L0 -6 L12 8', '#fff3d2', 5), 156, 150) + place(trait('M-12 8 L0 -6 L12 8', '#fff3d2', 5), 156, 134),
      choeur: p => `<path d="M100 52 L148 70 Q148 132 100 160 Q52 132 52 70 Z" fill="${p[1]}" stroke="${INK}" stroke-width="3.6" stroke-linejoin="round"/><path d="M100 60 L140 74 Q140 100 128 120" fill="none" stroke="${p[0]}" stroke-width="4" stroke-linecap="round"/>`
        + note(84, 136, .62, NO[2]) + note(116, 128, .62, NO[2]) + note(100, 112, .5, NO[2]) + note(44, 74, .5, NO[2], true) + note(160, 70, .5, NO[2], true)
        + place(trait('M0 -12 L0 12 M-12 0 L12 0', '#9fe06a', 6, 11), 156, 150),
      cri: p => place(`<path d="M0 -26 Q24 -26 30 0 Q24 26 0 26 Q-14 12 -14 0 Q-14 -12 0 -26 Z" fill="#c8484e" stroke="${INK}" stroke-width="3.4"/><path d="M4 -16 Q16 -16 20 0 Q16 16 4 16 Q-4 8 -4 0 Q-4 -8 4 -16 Z" fill="#3a1218"/><path d="M2 -24 Q14 -22 18 -14" fill="none" stroke="#fff" stroke-width="4" stroke-linecap="round"/>`, 64, 100, 0, 1.15)
        + ondes(96, 100, 1.2, p[0]) + ondes(64, 56, .6, p[1], -90, 2) + ondes(64, 146, .6, p[1], 90, 2),
      tempo: p => `<path d="M64 162 L84 40 L116 40 L136 162 Z" fill="${'#8a5a3a'}" stroke="${INK}" stroke-width="3.6" stroke-linejoin="round"/><path d="M72 154 L88 50 L100 50 L92 154 Z" fill="#b07a52"/><rect x="58" y="150" width="84" height="16" rx="3" fill="#5a3a24" stroke="${INK}" stroke-width="3"/>`
        + `<path d="M100 146 L140 58" stroke="${INK}" stroke-width="8" stroke-linecap="round"/><path d="M100 146 L140 58" stroke="#e8eef4" stroke-width="3" stroke-linecap="round"/><rect x="122" y="84" width="16" height="12" rx="2" transform="rotate(24 130 90)" fill="${p[1]}" stroke="${INK}" stroke-width="2.6"/>`
        + trait('M150 46 Q166 60 160 82', '#fff3d2', 3.6) + eclat(54, 60, .9, p[1], p[0]) + place(trait('M0 12 V-12 M-10 -2 L0 -12 L10 -2', '#fff3d2', 6, 11), 160, 140),
      silence: p => place(`<path d="M-20 -30 Q20 -40 22 -6 Q20 26 -20 40" fill="none" stroke="${INK}" stroke-width="14" stroke-linecap="round"/><path d="M-20 -30 Q20 -40 22 -6 Q20 26 -20 40" fill="none" stroke="${NO[2]}" stroke-width="7" stroke-linecap="round"/><circle cx="-18" cy="-24" r="10" fill="${NO[2]}" stroke="${INK}" stroke-width="3"/><circle cx="36" cy="-20" r="5" fill="${NO[2]}" stroke="${INK}" stroke-width="2.4"/><circle cx="36" cy="4" r="5" fill="${NO[2]}" stroke="${INK}" stroke-width="2.4"/>`, 80, 96, 0, 1.25)
        + ondes(130, 104, 1, p[0]) + `<path d="M40 160 Q60 150 80 160 T120 160 T160 160" fill="none" stroke="${INK}" stroke-width="8" stroke-linecap="round"/><path d="M40 160 Q60 150 80 160 T120 160 T160 160" fill="none" stroke="${p[1]}" stroke-width="3.4" stroke-linecap="round"/>`,
    });
  }

  function P(el) { return IconesV3.P[el]; }

  IconesV4.TYPES = Object.assign(IconesV4.TYPES || {}, {
    hantise: 'placement', appel_du_leurre: 'placement', rejet_du_leurre: 'placement', piege_de_vase: 'degats',
    empoigne: 'placement', coup_de_sifflet: 'degats', fouet_de_meneur: 'placement',
    bascule_du_ciel: 'soin',
  });
})();
