(() => {
  const { poly, encre, place, croix, eclat, roc, croissant, flamme } = IconesV3.outils;
  const { P, INK } = IconesV3;
  const OR_C = '#ffd98f', OR_S = '#a8683a', OR_V = '#fff3d2';
  const SC_C = '#6a5a54', SC_S = '#3a2e2e', SC_R = '#8f7f76', SC_N = '#2a2024';
  const FER_C = '#c4cbdc', FER_S = '#5c6480';
  const GA_C = '#8a7b72', GA_S = '#3a2e2e', GA_V = '#b3a59a';
  const BOIS_C = '#c99a6a', BOIS_S = '#7a5236';
  const BR = '#ff7a2b', BR_C = '#ffb347', BR_V = '#fff3c0', BR_S = '#c2361e';
  const RUB_C = '#ef7574', RUB_S = '#b83a44';
  const feu = P.feu;

  const deux = (pts, cut, c1, c2, w = 3) => poly(pts, c2) + poly(cut, c1) + encre(pts, w);
  const trait = (d, c, w, iw = w + 4.4) => `<path d="${d}" fill="none" stroke="${INK}" stroke-width="${iw}" stroke-linecap="round" stroke-linejoin="round"/><path d="${d}" fill="none" stroke="${c}" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round"/>`;
  const oct = (r, n = 8) => Array.from({ length: n }, (_, j) => { const a = (j + .5) / n * Math.PI * 2; return [+(Math.cos(a) * r).toFixed(1), +(Math.sin(a) * r).toFixed(1)]; });
  const hexa = r => Array.from({ length: 6 }, (_, j) => { const a = (j * 60 - 90) * Math.PI / 180; return [+(Math.cos(a) * r).toFixed(1), +(Math.sin(a) * r).toFixed(1)]; });
  const tri = (x, y, s, r, c) => place(deux([[0, -9], [8, 7], [-8, 7]], [[0, -9], [0, 7], [-8, 7]], OR_V, c, 2.2), x, y, r, s);

  function lk(p, o = {}) {
    const chaud = !!o.chaud;
    const cl = chaud ? '#d9452b' : SC_C, so = chaud ? '#7a1e0e' : SC_S, ri = chaud ? '#ff9b4a' : SC_R, haut = chaud ? '#ef5a2a' : '#7c6c64';
    const fil = o.fil || '#ff9b4a', fe = o.fente || BR;
    const B = [[-17, -4], [-19, -68], [-11, -100], [12, -122], [20, -92], [18, -4]];
    const Y = 'M-5 -10 L3 -32 L-5 -52 L1 -68 L-7 -92 M1 -68 L9 -90';
    return [
      poly(B, so),
      poly([[-17, -4], [-19, -68], [-11, -100], [12, -122], [1, -62], [0, -4]], cl),
      poly([[-11, -100], [12, -122], [1, -62]], haut),
      poly([[-19, -68], [-11, -100], [-6, -98], [-13, -68], [-12, -4], [-17, -4]], ri),
      `<path d="M-19 -68 L1 -62 M0 -30 L-17 -24" stroke="${INK}" stroke-width="1.4" opacity=".35"/>`,
      poly([[12, -122], [20, -92], [18, -4], [11, -4], [12, -90]], fil), poly([[12, -122], [20, -92], [15, -96]], BR_V),
      trait(Y, fe, 4, 8.6), `<path d="${Y}" fill="none" stroke="${BR_V}" stroke-width="1.4" stroke-linejoin="round"/>`,
      encre(B, 3.4),
      poly([[-32, -4], [30, -4], [36, 3], [30, 10], [-32, 10], [-38, 3]], GA_S), poly([[-32, -4], [30, -4], [36, 3], [-38, 3]], GA_C),
      poly([[-32, -4], [-22, -4], [-28, 3], [-38, 3]], GA_V),
      encre([[-32, -4], [30, -4], [36, 3], [30, 10], [-32, 10], [-38, 3]], 3),
      poly([[-6, 10], [6, 10], [6, 44], [-6, 44]], '#2b2238'), encre([[-6, 10], [6, 10], [6, 44], [-6, 44]], 2.6),
      croix(0, 21, .62), croix(0, 33, .62),
      deux([[-9, 44], [9, 44], [7, 50], [-7, 50]], [[-9, 44], [0, 44], [0, 50], [-7, 50]], GA_C, GA_S, 2.4),
      deux([[0, 50], [11, 60], [0, 72], [-11, 60]], [[0, 50], [-11, 60], [0, 60]], GA_C, GA_S, 2.6),
      poly([[0, 54], [5, 60], [0, 67], [-5, 60]], BR), poly([[0, 54], [-5, 60], [0, 60]], BR_V),
    ].join('');
  }
  const LK = (p, x, y, r, s, o) => place(lk(p, o), x, y, r, s);

  const braise = (x, y, s = 1) => place(
    poly([[0, -22], [15, 0], [0, 22], [-15, 0]], BR_S) + poly([[0, -22], [15, 0], [0, 0]], '#ef5a2a') + poly([[0, -22], [-15, 0], [0, 0]], BR_C)
    + trait('M1 -13 L-3 -3 L3 4 L-1 13', BR_V, 2, 5.6) + encre([[0, -22], [15, 0], [0, 22], [-15, 0]], 3), x, y, 0, s);
  const charbon = (x, y, s, r = 0) => place(deux([[-14, 6], [-10, -8], [4, -12], [14, -4], [12, 8], [-4, 12]], [[-14, 6], [-10, -8], [4, -12], [2, 0]], '#ff9b4a', '#4a2a22', 2.4)
    + `<path d="M-8 -3 L2 -5 L8 3" stroke="${BR_V}" stroke-width="1.6" fill="none"/>`, x, y, r, s);
  const bouffee = (x, y, r, c1, c2) => { const o = oct(r); return place(poly(o, c2) + poly([o[3], o[4], o[5], o[6], [0, 0]], c1) + encre(o, 2.4), x, y); };
  const nuage = (l, c1, c2) => l.map(([x, y, r]) => bouffee(x, y, r, c1, c2)).join('');
  const goutte = (x, y, s, p, r = 0) => place(deux([[0, -16], [10, 2], [8, 12], [0, 16], [-8, 12], [-10, 2]], [[0, -16], [0, 16], [-8, 12], [-10, 2]], p[1], p[2], 2.4) + poly([[-4, 0], [-1, -8], [-1, 4]], p[0]), x, y, r, s);
  const bulle = (x, y, r, c) => `<circle cx="${x}" cy="${y}" r="${r}" fill="${c}" fill-opacity=".45" stroke="${INK}" stroke-width="2.2"/><path d="M${x - r * .5} ${y - r * .1} L${x - r * .2} ${y - r * .5}" stroke="#fff" stroke-width="1.6" stroke-linecap="round"/>`;
  const vague = (x, y, s, p, r = 0) => place(
    poly([[-36, 14], [-26, -4], [-8, -14], [12, -12], [26, -2], [20, 4], [8, -2], [-2, 4], [4, 14]], p[2])
    + poly([[-26, -4], [-8, -14], [12, -12], [26, -2], [20, 4], [8, -2], [-8, -4]], p[1]) + poly([[-8, -14], [12, -12], [8, -8]], p[0])
    + encre([[-36, 14], [-26, -4], [-8, -14], [12, -12], [26, -2], [20, 4], [8, -2], [-2, 4], [4, 14]], 2.8), x, y, r, s);
  const chevrons = (x, y, s, c, r = 0) => place([0, 18].map(dx => `<path d="M${dx - 10} -16 L${dx + 6} 0 L${dx - 10} 16" fill="none" stroke="${INK}" stroke-width="10" stroke-linejoin="miter" stroke-linecap="square"/><path d="M${dx - 10} -16 L${dx + 6} 0 L${dx - 10} 16" fill="none" stroke="${c}" stroke-width="5.4" stroke-linejoin="miter" stroke-linecap="square"/>`).join(''), x, y, r, s);
  const ondes = (x, y, s, c, n = 3, r = 0) => place(Array.from({ length: n }, (_, k) => { const R = 14 + k * 11; return trait(`M${R * .7} ${-R * .7} A${R} ${R} 0 0 1 ${R * .7} ${R * .7}`, c, 4, 8); }).join(''), x, y, r, s);
  const coeur = (x, y, s) => place(deux([[0, 34], [-34, 2], [-34, -18], [-18, -30], [0, -18], [18, -30], [34, -18], [34, 2]], [[0, 34], [-34, 2], [-34, -18], [-18, -30], [0, -18]], RUB_C, RUB_S, 3.2)
    + poly([[-26, -14], [-18, -24], [-12, -16]], '#ffd2cc'), x, y, 0, s);
  const sol = (c1 = '#d9c4a6', c2 = '#7c6856') => deux([[22, 150], [178, 150], [168, 176], [32, 176]], [[22, 150], [178, 150], [174, 158], [26, 158]], c1, c2, 3);
  const brique = (x, y, w, h, c1 = '#efe2c8', c2 = '#a8937d') => deux([[x, y], [x + w, y], [x + w, y + h], [x, y + h]], [[x, y], [x + w, y], [x + w - 4, y + 4], [x + 4, y + 4], [x + 4, y + h - 4], [x, y + h]], c1, c2, 2.4);
  const scorie = (x, y, s, r) => roc(x, y, s, r, '#7c6c64', '#2e2426');
  const enclume = (x, y, s) => place(
    deux([[-54, -18], [38, -18], [42, -6], [20, -2], [14, 14], [28, 22], [28, 30], [-28, 30], [-28, 22], [-14, 14], [-20, -2], [-36, -6]],
      [[-54, -18], [38, -18], [38, -12], [-10, -10], [-4, 14], [-28, 22], [-28, 30], [-28, 22], [-14, 14], [-20, -2], [-36, -6]], FER_C, FER_S, 3.2)
    + poly([[-54, -18], [38, -18], [40, -13], [-44, -13]], '#eef1f8'), x, y, 0, s);
  const aile = (x, y, s, r = 0, sx = 1) => place(`<g transform="scale(${sx} 1)">`
    + `<path d="M0 0 L26 -48 L62 -78 Q58 -56 90 -50 Q70 -36 88 -12 Q62 -18 44 4 Q24 2 0 0 Z" fill="${feu[2]}"/>`
    + `<path d="M0 0 L26 -48 L62 -78 Q58 -56 90 -50 L36 -28 Z" fill="${feu[1]}"/><path d="M26 -48 L62 -78 L44 -52 Z" fill="${feu[0]}"/>`
    + `<path d="M2 -2 L26 -48 L62 -78 M26 -48 L90 -50 M26 -48 L88 -12 M26 -48 L44 4" fill="none" stroke="${INK}" stroke-width="2.6" stroke-linejoin="round" stroke-linecap="round"/>`
    + `<path d="M0 0 L26 -48 L62 -78 Q58 -56 90 -50 Q70 -36 88 -12 Q62 -18 44 4 Q24 2 0 0 Z" fill="none" stroke="${INK}" stroke-width="3" stroke-linejoin="round"/>` + '</g>', x, y, r, s);
  const NUEE = [[-46, 16], [46, 16], [54, 4], [46, -10], [32, -14], [26, -28], [8, -34], [-8, -26], [-22, -32], [-36, -22], [-40, -8], [-54, 4]];
  const nuee = (x, y, s, c1, c2, c3) => place(poly(NUEE, c2) + poly([[-54, 4], [-40, -8], [-36, -22], [-22, -32], [-8, -26], [8, -34], [26, -28], [10, -6], [-20, 0]], c1)
    + poly([[-46, 16], [46, 16], [54, 4], [0, 8]], c3) + encre(NUEE, 3 / Math.max(s, .6)), x, y, 0, s);
  const wyverne = (x, y, s) => place(
    poly([[-6, -2], [18, -6], [46, -12], [42, 22], [6, 6]], '#ef5a2a') + poly([[-6, -2], [18, -6], [30, 4], [6, 6]], BR_C)
    + deux([[-24, -28], [-48, -46], [-30, -18]], [[-24, -28], [-48, -46], [-36, -22]], SC_R, SC_S, 2.6)
    + deux([[-34, -8], [-24, -28], [-2, -34], [22, -28], [48, -18], [50, -10], [18, -6], [-6, -2], [-12, 12], [-32, 10]], [[-34, -8], [-24, -28], [-2, -34], [22, -28], [48, -18], [10, -16], [-12, 12], [-32, 10]], SC_C, SC_S, 3)
    + [[24, -7], [33, -9], [42, -11]].map(([a, b]) => deux([[a - 4, b], [a + 4, b - 1], [a, b + 9]], [[a - 4, b], [a, b - .5], [a, b + 9]], OR_V, '#d9c4a6', 1.6)).join('')
    + deux([[-12, 10], [6, 6], [34, 14], [44, 24], [14, 28], [-14, 22]], [[-12, 10], [6, 6], [34, 14], [44, 24], [10, 18]], SC_C, SC_S, 3)
    + [[18, 12], [27, 15], [36, 18]].map(([a, b]) => deux([[a - 4, b + 1], [a + 4, b + 2], [a, b - 8]], [[a - 4, b + 1], [a, b + 1.5], [a, b - 8]], OR_V, '#d9c4a6', 1.6)).join('')
    + `<path d="M-30 -10 L-14 -18 M-8 -24 L10 -26" stroke="${BR}" stroke-width="2.2"/>`
    + deux([[6, -24], [12, -20], [6, -16], [0, -20]], [[6, -24], [0, -20], [6, -20]], BR_V, BR, 1.8), x, y, 0, s);
  const piquee = () => {
    const CORPS = [[-50, -2], [-24, -16], [6, -16], [22, -8], [26, 6], [8, 14], [-26, 10]];
    return trait('M-46 0 Q-74 -6 -98 10', SC_S, 6, 10.4) + place(deux([[0, -10], [9, 4], [-9, 4]], [[0, -10], [-9, 4], [0, 4]], BR_C, BR_S, 2.2), -100, 12, -110)
      + aile(-10, -10, .96, -22, -1)
      + deux(CORPS, [[-50, -2], [-24, -16], [6, -16], [22, -8], [-8, -2], [-26, 10]], SC_R, SC_S, 3.2)
      + trait('M-38 -4 L-24 2 L-10 -6 L4 0', BR, 2.6, 6)
      + deux([[0, 10], [10, 26], [2, 30], [-6, 14]], [[0, 10], [10, 26], [4, 26]], SC_C, SC_S, 2.4)
      + [[2, 30], [7, 32], [11, 28]].map(([x, y]) => deux([[x - 2, y - 3], [x + 3, y - 2], [x, y + 6]], [[x - 2, y - 3], [x, y - 2.5], [x, y + 6]], OR_V, '#d9c4a6', 1.4)).join('')
      + wyverne(46, -2, .62);
  };
  const poing = (x, y, s, r = 0) => place(
    deux([[-28, -22], [24, -24], [30, -6], [28, 14], [18, 30], [-18, 30], [-30, 12], [-32, -6]], [[-28, -22], [0, -23], [-2, 30], [-18, 30], [-30, 12], [-32, -6]], SC_C, SC_S, 3.4)
    + `<path d="M-15 -23 L-15 -6 M-1 -23 L-1 -6 M13 -24 L13 -6" stroke="${INK}" stroke-width="2.4"/>`
    + trait('M-22 -14 L-12 0 L-18 8 M22 -16 L12 0 L20 16', BR, 2.6, 6)
    + deux([[-32, -4], [6, -6], [10, 4], [0, 12], [-30, 12]], [[-32, -4], [6, -6], [4, 2], [-30, 4]], SC_R, SC_S, 2.8)
    + deux([[-20, 30], [20, 30], [20, 46], [-20, 46]], [[-20, 30], [0, 30], [0, 46], [-20, 46]], OR_C, OR_S, 3) + croix(-8, 38, .6) + croix(8, 38, .6), x, y, r, s);
  const main = (x, y, s, r = 0) => place(
    deux([[-16, 34], [-20, 4], [-18, -30], [-12, -44], [0, -46], [12, -42], [16, -28], [16, -4], [28, -16], [36, -12], [22, 14], [12, 34]],
      [[-16, 34], [-20, 4], [-18, -30], [-12, -44], [0, -46], [-2, 34]], '#b0a096', '#5a4a44', 3.2)
    + `<path d="M-7 -44 L-7 -12 M5 -45 L5 -12" stroke="${INK}" stroke-width="2"/>`
    + trait('M-12 -30 L-4 -18 L-10 -4', BR, 2.4, 5.6)
    + deux([[-18, 34], [14, 34], [14, 48], [-18, 48]], [[-18, 34], [-2, 34], [-2, 48], [-18, 48]], OR_C, OR_S, 3), x, y, r, s);
  const crochet = (x, y, s, c, r = 0) => place(
    `<circle cx="0" cy="-58" r="9" fill="none" stroke="${INK}" stroke-width="11"/><circle cx="0" cy="-58" r="9" fill="none" stroke="${c}" stroke-width="6"/>`
    + trait('M0 -48 L0 6 Q0 32 -20 32 Q-40 32 -40 10 L-40 4', c, 8, 13) + `<path d="M-2 -44 L-2 6 Q-2 26 -18 28" fill="none" stroke="${BR_V}" stroke-width="2.2" opacity=".85"/>`
    + deux([[-47, 6], [-40, -14], [-33, 6]], [[-47, 6], [-40, -14], [-40, 6]], BR_V, c, 2.6), x, y, r, s);
  const maillon = (x, y, r, c, chant) => place(chant
    ? trait('M-13 0 L13 0', c, 5, 10)
    : `<rect x="-15" y="-8.5" width="30" height="17" rx="8.5" fill="none" stroke="${INK}" stroke-width="10"/><rect x="-15" y="-8.5" width="30" height="17" rx="8.5" fill="none" stroke="${c}" stroke-width="5"/><path d="M-9 -8 L8 -8" stroke="${BR_V}" stroke-width="1.6"/>`, x, y, r);
  const chaine = (x0, y0, x1, y1, n, c) => { const a = Math.atan2(y1 - y0, x1 - x0) * 180 / Math.PI; return Array.from({ length: n }, (_, k) => maillon(x0 + (x1 - x0) * k / (n - 1), y0 + (y1 - y0) * k / (n - 1), a, c, k % 2)).join(''); };
  const fournaise = (x, y, s, ouvert) => place(
    deux([[-54, 44], [-54, -6], [-40, -34], [0, -50], [40, -34], [54, -6], [54, 44]], [[-54, 44], [-54, -6], [-40, -34], [0, -50], [0, 44]], '#b0806a', '#6a4a3e', 3.4)
    + `<path d="M-54 8 L54 8 M-54 26 L54 26 M-48 -16 L48 -16 M-28 -40 L28 -40 M-30 8 L-30 26 M30 8 L30 26 M-40 -16 L-40 8 M40 -16 L40 8 M-12 26 L-12 44 M12 26 L12 44" stroke="${INK}" stroke-width="1.8" opacity=".55"/>`
    + poly([[-30, 44], [-30, 4], [-20, -16], [0, -24], [20, -16], [30, 4], [30, 44]], ouvert ? BR_C : SC_N)
    + (ouvert
      ? poly([[-30, 44], [-30, 4], [-20, -16], [0, -24], [0, 44]], '#fff3c0', 'opacity=".55"') + flamme(-8, 20, .6, feu) + flamme(12, 24, .48, feu)
        + deux([[-30, 4], [-52, -2], [-52, 46], [-30, 44]], [[-30, 4], [-52, -2], [-52, 10], [-30, 14]], '#5c6480', '#2b2238', 2.6)
        + deux([[30, 4], [52, -2], [52, 46], [30, 44]], [[30, 4], [52, -2], [52, 10], [30, 14]], '#5c6480', '#2b2238', 2.6)
      : poly([[-30, 30], [30, 30], [30, 44], [-30, 44]], BR) + poly([[-30, 30], [30, 30], [30, 33], [-30, 33]], BR_V)
        + deux([[-30, 4], [-20, -16], [0, -24], [20, -16], [30, 4], [30, 28], [-30, 28]], [[-30, 4], [-20, -16], [0, -24], [0, 28], [-30, 28]], '#5c6480', '#2b2238', 2.6)
        + `<path d="M-16 -2 L16 -2 M-20 12 L20 12" stroke="${INK}" stroke-width="2.4"/>` + croix(0, 5, .8))
    + encre([[-30, 44], [-30, 4], [-20, -16], [0, -24], [20, -16], [30, 4], [30, 44]], 3)
    + deux([[-60, 44], [60, 44], [60, 54], [-60, 54]], [[-60, 44], [0, 44], [0, 54], [-60, 54]], '#8f7a66', '#4a3a33', 3), x, y, 0, s);
  const soufflet = (x, y, s) => place(
    deux([[-44, -6], [-74, -6], [-80, 0], [-74, 6], [-44, 6]], [[-44, -6], [-74, -6], [-80, 0], [-44, 0]], BOIS_C, BOIS_S, 2.6)
    + deux([[-46, -30], [-14, -38], [18, -26], [38, -8], [38, 8], [18, 26], [-14, 38], [-46, 30], [-54, 0]], [[-46, -30], [-14, -38], [18, -26], [38, -8], [-54, 0]], BOIS_C, BOIS_S, 3.4)
    + `<path d="M-40 -22 L-14 -30 L12 -20 L28 -6 L28 6 L12 20 L-14 30 L-40 22 L-46 0 Z" fill="none" stroke="${OR_C}" stroke-width="2.4"/>`
    + `<circle cx="-12" cy="0" r="9" fill="#2b2238" stroke="${INK}" stroke-width="2.6"/>` + croix(-12, 0, .7)
    + deux([[36, -8], [64, -4], [64, 4], [36, 8]], [[36, -8], [64, -4], [64, 0], [36, 0]], OR_C, OR_S, 2.6), x, y, 0, s);
  const tenaille = (x, y, s, r = 0) => place(
    deux([[-13, -62], [13, -62], [15, -46], [-15, -46]], [[-13, -62], [0, -62], [0, -46], [-15, -46]], BR_V, BR, 2.8)
    + trait('M-30 66 L8 -20 L17 -50 L8 -60', FER_S, 7, 12) + trait('M30 66 L-8 -20 L-17 -50 L-8 -60', FER_C, 7, 12)
    + `<path d="M31 60 L-6 -20 L-14 -48" fill="none" stroke="#ffffff" stroke-width="1.6" opacity=".7"/>`
    + deux([[0, -9], [7, -2], [0, 5], [-7, -2]], [[0, -9], [-7, -2], [0, -2]], OR_C, OR_S, 2.2), x, y, r, s);
  const cuirasse = (x, y, s) => place(
    deux([[-40, -36], [-16, -42], [0, -30], [16, -42], [40, -36], [46, 0], [34, 38], [0, 48], [-34, 38], [-46, 0]],
      [[-40, -36], [-16, -42], [0, -30], [0, 48], [-34, 38], [-46, 0]], SC_C, SC_S, 3.6)
    + trait('M0 -30 L0 48', BR, 3, 7) + trait('M-36 12 L-8 20 M36 12 L8 20 M-28 -16 L-10 -6 M28 -16 L10 -6', BR, 2.4, 6)
    + croix(0, -12, .8) + croix(0, 8, .8) + croix(0, 28, .8)
    + deux([[-40, -36], [-16, -42], [-16, -34], [-34, -28]], [[-40, -36], [-16, -42], [-28, -34]], OR_C, OR_S, 2.4)
    + deux([[40, -36], [16, -42], [16, -34], [34, -28]], [[40, -36], [16, -42], [28, -34]], OR_C, OR_S, 2.4), x, y, 0, s);
  const botte = (x, y, s) => place(
    deux([[-22, -42], [10, -42], [12, 2], [38, 12], [44, 30], [-24, 30], [-28, 8]], [[-22, -42], [10, -42], [12, 2], [-6, 8], [-24, 30], [-28, 8]], SC_C, SC_S, 3.4)
    + deux([[-28, 30], [46, 30], [44, 40], [-28, 40]], [[-28, 30], [46, 30], [46, 34], [-28, 34]], BR_V, BR, 2.8)
    + deux([[-24, -42], [12, -42], [12, -32], [-24, -32]], [[-24, -42], [0, -42], [0, -32], [-24, -32]], OR_C, OR_S, 2.4) + croix(-6, -12, .8), x, y, 0, s);
  const bac = (x, y, s, p) => place(
    deux([[-52, -12], [52, -12], [44, 32], [-44, 32]], [[-52, -12], [0, -12], [0, 32], [-44, 32]], BOIS_C, BOIS_S, 3.2)
    + `<path d="M-50 0 L50 0 M-46 20 L46 20" stroke="${INK}" stroke-width="6"/><path d="M-50 0 L50 0 M-46 20 L46 20" stroke="${OR_C}" stroke-width="3"/>`
    + deux([[-50, -14], [50, -14], [44, -6], [-44, -6]], [[-50, -14], [50, -14], [0, -10]], p[0], p[1], 2.6), x, y, 0, s);
  const cheminee = (x, y, s, r = 0) => place(
    [0, 1, 2, 3, 4].map(k => [0, 1].map(j => brique(-26 + j * 26 - (k % 2) * 13 + (k % 2 && j === 0 ? 13 : 0), -50 + k * 20, (k % 2 && j === 0) ? 13 : (k % 2 && j === 1 ? 26 : 26), 20, '#c88a6a', '#7a4a36')).join('') + (k % 2 ? brique(13, -50 + k * 20, 13, 20, '#c88a6a', '#7a4a36') : '')).join('')
    + deux([[-32, -62], [32, -62], [32, -50], [-32, -50]], [[-32, -62], [0, -62], [0, -50], [-32, -50]], '#8f7a66', '#4a3a33', 3), x, y, r, s);
  const cible = (x, y, s) => place([[40, RUB_S], [30, '#f7f0de'], [20, RUB_C], [10, '#f7f0de']].map(([r, c]) => `<circle r="${r}" fill="${c}" stroke="${INK}" stroke-width="2.6"/>`).join(''), x, y, 0, s);
  const sablier = (x, y, s) => place(
    deux([[-20, -30], [20, -30], [4, 0], [20, 30], [-20, 30], [-4, 0]], [[-20, -30], [0, -30], [0, 30], [-20, 30], [-4, 0]], '#d8e8f2', '#8fa6bd', 2.6)
    + poly([[-12, 24], [12, 24], [4, 10], [-4, 10]], BR) + poly([[-10, -24], [10, -24], [5, -16], [-5, -16]], BR_C)
    + deux([[-24, -36], [24, -36], [24, -30], [-24, -30]], [[-24, -36], [0, -36], [0, -30], [-24, -30]], OR_C, OR_S, 2.2)
    + deux([[-24, 30], [24, 30], [24, 36], [-24, 36]], [[-24, 30], [0, 30], [0, 36], [-24, 36]], OR_C, OR_S, 2.2), x, y, 0, s);
  const fleche = (d, hx, hy, ha, c) => trait(d, c, 7, 12) + place(deux([[0, -14], [16, 0], [0, 14]], [[0, -14], [16, 0], [0, 0]], OR_V, c, 2.8), hx, hy, ha);
  const spirale = (cx, cy, R, tours, c1, c2) => {
    const n = 90, pts = Array.from({ length: n + 1 }, (_, k) => { const t = k / n, a = -Math.PI / 2 + t * tours * Math.PI * 2, r = R * (1 - t * .82); return `${(cx + Math.cos(a) * r).toFixed(1)} ${(cy + Math.sin(a) * r).toFixed(1)}`; });
    const d = 'M' + pts.join(' L');
    return `<path d="${d}" fill="none" stroke="${INK}" stroke-width="20" stroke-linecap="round" stroke-linejoin="round"/><path d="${d}" fill="none" stroke="${c2}" stroke-width="14" stroke-linecap="round" stroke-linejoin="round"/><path d="${d}" fill="none" stroke="${c1}" stroke-width="5" stroke-linecap="round" stroke-linejoin="round" transform="translate(-2 -2)"/>`;
  };
  const ferMarque = (x, y, s, r = 0) => place(
    trait('M0 0 L0 84', FER_S, 6, 10.4)
    + deux([[-7, 64], [7, 64], [7, 100], [-7, 100]], [[-7, 64], [0, 64], [0, 100], [-7, 100]], BOIS_C, BOIS_S, 2.6) + croix(0, 76, .6) + croix(0, 88, .6)
    + braise(0, -12, .95), x, y, r, s);
  const machefer = (x, y, s) => place(
    deux([[-44, -20], [-20, -40], [20, -38], [44, -14], [40, 22], [10, 40], [-30, 34], [-48, 8]], [[-44, -20], [-20, -40], [20, -38], [0, -6], [-30, 34], [-48, 8]], SC_C, SC_S, 3.6)
    + [[-26, -14, 6], [-4, -24, 5], [18, -18, 4], [-30, 12, 5], [-8, 4, 7], [16, 10, 5], [28, -2, 4], [2, 26, 4]].map(([a, b, r]) => place(poly(oct(r, 6), '#1b1424') + poly(oct(r * .55, 6), RUB_C), a, b)).join(''), x, y, 0, s);
  const impact = (x, y, s, c1, c2) => place(deux([[0, -22], [6, -6], [22, 0], [6, 6], [0, 22], [-6, 6], [-22, 0], [-6, -6]], [[0, -22], [6, -6], [0, 0], [-6, 6], [-22, 0], [-6, -6]], c1, c2, 2.6), x, y, 0, s);
  const ondeDent = (x, y, s, c, sens = 1) => place([0, 1, 2].map(k => { const R = 18 + k * 13, n = 4; const pts = Array.from({ length: n * 2 + 1 }, (_, j) => { const a = (-50 + j * 100 / (n * 2)) * Math.PI / 180, rr = R + (j % 2 ? 5 : 0); return `${(sens * Math.cos(a) * rr).toFixed(1)} ${(Math.sin(a) * rr).toFixed(1)}`; }); return trait('M' + pts.join(' L'), c, 3.6, 7.6); }).join(''), x, y, 0, s);
  const fumee = (c1, c2) => (l) => nuage(l, c1, c2);

  Object.assign(IconesV3.SUJETS, {
    taillade: p => [[108, 156, 1.1, 10], [138, 152, 1, -20], [164, 146, .85, 30], [84, 160, .8, 40], [124, 168, .7, 0], [152, 166, .6, -10]].map(([x, y, s, r]) => charbon(x, y, s, r)).join('')
      + LK(p, 70, 128, 68, .8, { chaud: true }) + flamme(120, 132, .4, feu) + flamme(150, 128, .34, feu) + eclat(150, 64, .8, p[1]) + eclat(172, 92, .55, p[0]),
    lame_de_vapeur: p => vague(150, 142, 1.1, p) + LK(p, 70, 128, 68, .8, { chaud: true })
      + nuee(146, 66, .62, '#ffffff', p[0], p[1]) + nuee(128, 100, .38, '#ffffff', p[0], p[1]) + goutte(176, 112, .5, p) + goutte(116, 154, .45, p),
    poing_de_scorie: p => impact(146, 62, 1.3, p[0], p[1]) + poing(92, 106, 1.45, -8) + roc(150, 122, .7, 20) + roc(44, 58, .5, -10) + eclat(56, 152, .6, BR_C),
    revers_de_cendre: p => croissant(100, 110, 70, -2.9, -.6, '#8a8490', p[1], 1.22) + main(104, 112, 1.25, -38)
      + nuee(52, 54, .5, '#d8d2dc', '#8a8490', '#5a5460') + nuee(152, 40, .32, '#d8d2dc', '#8a8490', '#5a5460') + eclat(154, 70, .7, BR_C) + eclat(40, 92, .5, BR),
    vapeur_mordante: p => nuage([[58, 84, 18], [84, 64, 20], [118, 60, 20], [146, 78, 18], [150, 112, 16], [124, 132, 18], [88, 134, 18], [60, 116, 16], [100, 100, 22]], '#ffffff', p[0])
      + poly([[64, 98], [100, 88], [142, 96], [130, 118], [100, 124], [74, 116]], p[3]) + encre([[64, 98], [100, 88], [142, 96], [130, 118], [100, 124], [74, 116]], 3)
      + [[80, 95], [96, 91], [112, 92], [128, 95]].map(([x, y]) => deux([[x - 6, y - 1], [x + 6, y], [x, y + 13]], [[x - 6, y - 1], [x, y - .5], [x, y + 13]], '#ffffff', p[1], 1.8)).join('')
      + [[88, 120], [104, 122], [120, 119]].map(([x, y]) => deux([[x - 6, y + 1], [x + 6, y], [x, y - 12]], [[x - 6, y + 1], [x, y + .5], [x, y - 12]], '#ffffff', p[1], 1.8)).join('')
      + place(deux([[-12, -9], [10, -9], [10, 9], [-12, 9]], [[-12, -9], [10, -9], [10, 0], [-12, 0]], GA_C, GA_S, 2.6) + deux([[10, -13], [17, -13], [17, 13], [10, 13]], [[10, -13], [17, -13], [17, 0], [10, 0]], GA_C, GA_S, 2.4), 36, 152, -45)
      + eclat(160, 46, .6, p[0]),
    eclat_de_laitier: p => `<path d="M36 156 Q56 60 108 76" fill="none" stroke="${INK}" stroke-width="7" stroke-dasharray="10 9" stroke-linecap="round"/><path d="M36 156 Q56 60 108 76" fill="none" stroke="${p[1]}" stroke-width="3.4" stroke-dasharray="10 9" stroke-linecap="round"/>`
      + place(deux([[-26, -30], [10, -38], [34, -8], [22, 26], [-16, 30], [-34, 0]], [[-26, -30], [10, -38], [0, -2], [-16, 30], [-34, 0]], '#4e6a5a', '#1e2c26', 3.6)
        + poly([[-20, -24], [4, -30], [-6, -10]], '#9fe0c0') + poly([[10, -38], [34, -8], [18, -8]], '#2e4a3e'), 128, 96, 12, 1.05)
      + [[112, 134, .55], [136, 140, .7], [156, 128, .45]].map(([x, y, s]) => place(deux([[0, -16], [8, 4], [0, 14], [-8, 4]], [[0, -16], [0, 14], [-8, 4]], '#4e6a5a', '#1e2c26', 2.4), x, y, 0, s)).join('')
      + deux([[96, 160], [170, 160], [160, 172], [106, 172]], [[96, 160], [170, 160], [100, 166]], '#4e6a5a', '#1e2c26', 2.6),
    gerbe_d_escarbilles: p => trait('M36 112 Q50 70 96 62', '#ffffff', 4.4, 9) + trait('M50 130 Q66 96 104 90', p[1], 3.6, 8)
      + LK(p, 72, 140, 40, .58)
      + [[108, 76, .62], [134, 56, .52], [130, 100, .48], [158, 74, .44], [154, 38, .36], [176, 96, .34]].map(([x, y, s]) => braise(x, y, s)).join('')
      + [[118, 40, .9], [172, 58, .8], [150, 118, .7], [104, 104, .55], [178, 124, .5]].map(([x, y, s]) => eclat(x, y, s, BR_C, BR_V)).join(''),
    pluie_bouillante: p => {
      const F = [[-40, 0], [-28, -12], [0, -16], [28, -12], [40, 0], [28, 12], [0, 16], [-28, 12]];
      return place(deux(F, [[-40, 0], [-28, -12], [0, -16], [28, -12], [40, 0]], p[1], p[2], 3) + poly([[-24, -6], [0, -10], [14, -6], [-6, -2]], p[0]), 100, 116, 0, 1)
        + bulle(86, 112, 6, p[0]) + bulle(106, 118, 7.5, p[0]) + bulle(120, 110, 4.5, p[0]) + bulle(96, 104, 4, p[0])
        + nuee(100, 74, .42, '#ffffff', p[0], p[1])
        + goutte(100, 40, .85, p) + goutte(100, 160, .85, p, 180) + goutte(40, 114, .85, p, -90) + goutte(160, 114, .85, p, 90);
    },
    dernier_souffle: p => {
      const C = [[150, 46], [168, 38], [164, 58], [188, 66], [176, 86], [194, 104], [176, 122], [188, 142], [164, 150], [168, 170], [150, 162]];
      const k = (f) => [[58, 104]].concat(C.map(([x, y]) => [58 + (x - 58) * f, 104 + (y - 104) * f]));
      return poly(k(1), p[2]) + poly(k(.74), p[1]) + poly(k(.46), p[0]) + encre(k(1), 3)
        + braise(48, 104, 1.45) + eclat(108, 54, .6, p[0]) + eclat(110, 156, .55, p[0]);
    },
    rafale_d_iskar: p => croissant(132, 104, 44, -1.1, 1.1, p[1], p[0], 1.25) + croissant(160, 104, 30, -1.1, 1.1, p[2], p[1], 1.25)
      + aile(40, 136, 1.1, 8) + braise(40, 138, .6) + eclat(170, 46, .6, BR_C) + eclat(176, 152, .5, BR),
    serment_de_sang: p => {
      const HOTTE = [[40, 148], [160, 148], [132, 112], [118, 108], [82, 108], [68, 112]];
      return deux(HOTTE, [[40, 148], [100, 148], [100, 108], [82, 108], [68, 112]], SC_R, SC_S, 3.4)
        + `<path d="M54 130 L146 130 M76 112 L76 130 M124 112 L124 130 M60 140 L60 148 M140 140 L140 148" stroke="${INK}" stroke-width="1.8" opacity=".5"/>`
        + deux([[82, 108], [82, 80], [118, 80], [118, 108]], [[82, 108], [82, 80], [100, 80], [100, 108]], SC_C, SC_N, 3.2)
        + deux([[76, 72], [124, 72], [124, 82], [76, 82]], [[76, 72], [124, 72], [120, 76], [76, 76]], GA_V, GA_S, 2.8)
        + poly([[74, 148], [74, 128], [86, 118], [114, 118], [126, 128], [126, 148]], BR_C) + poly([[74, 148], [74, 128], [86, 118], [100, 118], [100, 148]], BR_V, 'opacity=".6"')
        + encre([[74, 148], [74, 128], [86, 118], [114, 118], [126, 128], [126, 148]], 3)
        + trait('M100 136 L95 120 L104 104 L97 88 L102 78', BR, 3.4, 7.6)
        + braise(100, 138, .6) + flamme(100, 50, .86, feu)
        + deux([[30, 148], [170, 148], [166, 160], [34, 160]], [[30, 148], [170, 148], [168, 152], [32, 152]], '#8f7a66', '#4a3a33', 3)
        + chevrons(50, 86, .62, OR_C, -90) + chevrons(150, 86, .62, OR_C, -90);
    },
    foulee_de_braise: p => botte(110, 96, 1.3) + flamme(76, 158, .42, feu) + flamme(110, 160, .38, feu) + braise(42, 136, .55) + braise(48, 98, .45) + chevrons(166, 112, .6, OR_C),
    sang_pour_sang: p => LK(p, 118, 116, 40, .72) + coeur(58, 140, .82)
      + trait('M168 52 Q176 132 92 150', p[1], 3.4, 7.4) + [[176, 84], [164, 124], [128, 146]].map(([x, y]) => eclat(x, y, .55, BR_C, BR_V)).join('')
      + place(deux([[0, -12], [14, 0], [0, 12]], [[0, -12], [14, 0], [0, 0]], OR_V, p[1], 2.6), 88, 152, 168),
    machefer_avide: p => machefer(98, 108, 1.25) + coeur(150, 46, .44)
      + [[34, 70, 30], [34, 140, -30], [166, 150, 40]].map(([x, y, r]) => place(deux([[0, -10], [7, 2], [0, 10], [-7, 2]], [[0, -10], [0, 10], [-7, 2]], RUB_C, RUB_S, 2.2), x, y, r)).join(''),
    rage: p => fournaise(100, 104, 1.15, true) + eclat(150, 40, .7, BR_C) + eclat(48, 44, .55, BR_C),
    brasier_couve: p => fournaise(92, 104, 1.05, false) + sablier(158, 136, .62) + `<path d="M64 52 L76 46 L90 52 L104 44 L118 52" fill="none" stroke="${INK}" stroke-width="5"/><path d="M64 52 L76 46 L90 52 L104 44 L118 52" fill="none" stroke="#b8b2bc" stroke-width="2.4"/>`,
    lien_de_sang: p => chaine(150, 46, 112, 78, 3, BR_C) + crochet(92, 116, 1.1, BR, 38) + eclat(54, 70, .7, p[1]) + eclat(150, 150, .55, p[0]),
    crochet_d_ecume: p => vague(98, 160, 1.4, p) + chaine(150, 46, 112, 78, 3, '#9fb2c8') + crochet(92, 116, 1.1, p[1], 38)
      + goutte(56, 132, .55, p) + goutte(78, 160, .45, p) + bulle(48, 92, 7, p[0]) + bulle(150, 132, 6, p[0]) + bulle(136, 114, 4.5, p[0]),
    charge: p => [[34, 150, .42], [60, 148, .5], [88, 146, .58]].map(([x, y, s]) => flamme(x, y, s, feu)).join('')
      + LK(p, 64, 104, 90, .74) + chevrons(160, 148, .7, BR_C),
    bond_de_wyverne: p => `<path d="M26 160 Q22 60 74 50" fill="none" stroke="${INK}" stroke-width="7" stroke-dasharray="10 9" stroke-linecap="round"/><path d="M26 160 Q22 60 74 50" fill="none" stroke="${p[0]}" stroke-width="3.4" stroke-dasharray="10 9" stroke-linecap="round"/>`
      + [[0, -1], [1, 0], [0, 1], [-1, 0]].map(([dx, dy]) => trait(`M${146 + dx * 19} ${146 + dy * 19} L${146 + dx * 27} ${146 + dy * 27}`, '#ffffff', 4, 8.4)).join('')
      + impact(146, 146, .86, p[0], p[2])
      + place(piquee(), 96, 100, 36, .8),
    frappe_lourde: p => sol() + `<path d="M100 150 L92 160 L104 168 L98 176" fill="none" stroke="${INK}" stroke-width="4"/>` + LK(p, 100, 72, 180, .64)
      + impact(100, 148, 1, p[0], p[1]) + chevrons(156, 128, .62, p[1]) + chevrons(44, 128, .62, p[1], 180),
    coup_d_enclume: p => enclume(96, 138, 1.15)
      + place(trait('M0 0 L0 -62', BOIS_S, 6, 10.4) + deux([[-24, -84], [20, -84], [24, -62], [-20, -62]], [[-24, -84], [20, -84], [0, -73], [-20, -62]], FER_C, FER_S, 3), 108, 112, -52, 1)
      + impact(110, 112, 1.1, BR_V, BR) + chevrons(166, 100, .6, p[1]),
    effondrement_de_forge: p => cheminee(92, 100, .9, 16) + brique(130, 46, 22, 14, '#c88a6a', '#7a4a36') + place(brique(-11, -7, 22, 14, '#c88a6a', '#7a4a36'), 152, 74, 30) + place(brique(-11, -7, 22, 14, '#c88a6a', '#7a4a36'), 48, 54, -24)
      + flamme(60, 150, .55, feu) + flamme(132, 152, .5, feu) + scorie(98, 162, .8, 0) + eclat(160, 120, .6, BR_C),
    embrasement_d_iskar: p => [0, 120, 240].map(a => place(trait('M0 -60 A60 60 0 0 1 48 -36', p[1], 7, 12) + place(deux([[0, -12], [16, 0], [0, 12]], [[0, -12], [16, 0], [0, 0]], p[0], p[2], 2.6), 48, -36, 125) + flamme(-20, -60, .38, p), 100, 102, a)).join('')
      + coeur(100, 104, .78),
    colosse: p => place(poly(hexa(64), BR) + [[0, 0], ...Array.from({ length: 6 }, (_, k) => { const a = k * 60 * Math.PI / 180; return [Math.cos(a) * 35, Math.sin(a) * 35]; })].map(([x, y]) => { const h = hexa(17.5); return place(poly(h, '#4a4048') + poly([h[4], h[5], h[0], [0, 0]], '#8a8088') + encre(h, 2.4), x, y); }).join('') + encre(hexa(64), 3.2), 100, 100, 0, 1),
    cuirasse_de_scorie: p => cuirasse(100, 104, 1.3) + eclat(160, 54, .7, BR_C) + eclat(44, 150, .5, BR_C),
    poigne_de_machefer: p => tenaille(100, 106, 1, 0) + eclat(136, 40, .8, BR_V) + eclat(66, 44, .6, BR_C) + eclat(148, 72, .5, BR_C) + coeur(150, 140, .4),
    morsure_bouillante: p => {
      const machoire = (sy) => place(deux([[-40, 0], [-30, -24], [0, -34], [30, -24], [40, 0], [26, -10], [0, -18], [-26, -10]], [[-40, 0], [-30, -24], [0, -34], [0, -18], [-26, -10]], p[1], p[2], 3)
        + [-18, 0, 18].map(x => deux([[x - 6, -14 + Math.abs(x) * .2], [x + 6, -14 + Math.abs(x) * .2], [x, 0]], [[x - 6, -14 + Math.abs(x) * .2], [x, -14], [x, 0]], '#ffffff', p[0], 2)).join(''), 0, 0, 0, 1) ;
      return place(machoire(), 100, 84, 0, 1.3) + place(machoire(), 100, 124, 180, 1.3)
        + bulle(100, 104, 7, p[0]) + bulle(84, 104, 4, p[0]) + bulle(118, 102, 5, p[0]) + bulle(156, 52, 6, p[0]) + bulle(44, 150, 5, p[0]) + bulle(162, 152, 4, p[0]);
    },
    soufflet_de_forge: p => soufflet(88, 104, 1) + braise(160, 76, .64) + braise(162, 132, .64) + chevrons(160, 104, .36, OR_C),
    fer_de_marque: p => cible(124, 82, 1.05) + ferMarque(104, 104, .95, 45) + eclat(160, 130, .7, BR_C) + eclat(158, 40, .55, BR_V),
    tourbillon_de_cendres: p => spirale(100, 102, 64, 2.1, '#d8d2dc', '#6e6874') + [[150, 56], [56, 140], [148, 148], [74, 70]].map(([x, y]) => eclat(x, y, .6, BR_C, BR_V)).join('') + charbon(108, 104, .55, 20),
    eboulis_de_scorie: p => place(deux([[-54, 30], [-30, -10], [-8, -30], [14, -26], [36, 0], [56, 30]], [[-54, 30], [-30, -10], [-8, -30], [0, 30]], SC_C, SC_S, 3.4)
      + trait('M-20 4 L-6 -10 L4 6 M18 -6 L26 14', BR, 2.4, 6), 100, 112, 0, 1.15)
      + scorie(100, 44, 1.6, 10) + scorie(34, 112, 1.5, -30) + scorie(166, 112, 1.5, 40) + scorie(100, 164, 1.3, 0),
    chaine_rougie: p => chaine(138, 66, 70, 134, 6, BR) + place(`<path d="M-16 0 A16 16 0 1 1 16 0" fill="none" stroke="${INK}" stroke-width="12"/><path d="M-16 0 A16 16 0 1 1 16 0" fill="none" stroke="${BR}" stroke-width="7"/>` + deux([[-22, 0], [22, 0], [22, 7], [-22, 7]], [[-22, 0], [0, 0], [0, 7], [-22, 7]], OR_C, OR_S, 2.4), 148, 56, 225, .8)
      + chevrons(46, 154, .6, OR_C, 135) + eclat(160, 140, .6, BR_C),
    place_brulante: p => fleche('M48 92 Q100 34 146 82', 150, 92, 70, OR_C) + fleche('M152 112 Q100 170 54 122', 50, 112, 250, BR)
      + braise(100, 102, .7) + flamme(34, 154, .32, feu) + flamme(168, 46, .32, feu),
    lame_bouillante: p => LK(p, 100, 100, 0, .68) + bac(100, 152, 1.15, p)
      + bulle(66, 118, 7, p[0]) + bulle(138, 110, 6, p[0]) + bulle(130, 82, 4.5, p[0]) + bulle(72, 88, 5, p[0]) + bulle(146, 140, 4, p[0]) + bulle(58, 142, 4, p[0]),
    lame_de_fumee: p => LK(p, 92, 122, 44, .88) + nuee(78, 136, .95, '#c9d6e8', '#7c8aa2', '#4e5a72') + nuee(126, 154, .5, '#c9d6e8', '#7c8aa2', '#4e5a72')
      + nuee(46, 92, .42, '#c9d6e8', '#7c8aa2', '#4e5a72') + eclat(160, 40, .6, BR_C),
    cendres_ranimees: p => coeur(100, 112, 1.35) + trait('M100 88 L92 104 L106 118 L98 136', BR, 3.4, 8) + croix(88, 100, .8) + croix(110, 112, .8) + croix(90, 126, .8)
      + flamme(100, 58, .72, feu) + eclat(150, 54, .55, BR_C) + eclat(52, 64, .5, BR_C),
    rempart_de_cendre: p => braise(100, 76, 1) + Array.from({ length: 2 }, (_, row) => Array.from({ length: 8 }, (_, k) => {
      const da = 240 / 8, a0 = 210 - k * da - (row ? da / 2 : 0), a1 = a0 - da + 2, r0 = 40 + row * 15, r1 = r0 + 14, R = a => a * Math.PI / 180;
      if (row && k === 7) return '';
      const q = [[Math.cos(R(a0)) * r0, Math.sin(R(a0)) * r0], [Math.cos(R(a0)) * r1, Math.sin(R(a0)) * r1], [Math.cos(R(a1)) * r1, Math.sin(R(a1)) * r1], [Math.cos(R(a1)) * r0, Math.sin(R(a1)) * r0]].map(([x, y]) => [+(100 + x).toFixed(1), +(96 - y).toFixed(1)]);
      return poly(q, row ? '#5a4e4a' : '#6e625c') + poly([q[0], q[1], q[2]], row ? '#7a6e68' : '#8f837c') + encre(q, 2.2);
    }).join('')).join(''),
    souffle_avide: p => trait('M40 128 Q96 64 150 74 Q182 88 162 120 Q140 150 96 132', p[1], 9, 15) + trait('M44 124 Q96 68 148 78', '#ffffff', 2.4, .01)
      + place(deux([[0, -15], [18, 0], [0, 15]], [[0, -15], [18, 0], [0, 0]], OR_V, p[2], 2.8), 92, 130, 200) + coeur(64, 150, .42)
      + [[110, 72], [168, 96], [130, 140]].map(([x, y]) => eclat(x, y, .5, BR_C, BR_V)).join(''),
    fumee_acre: p => {
      const A = ['#d9d09a', '#9a9064', '#5c5438'];
      return [[30, 70], [26, 86], [32, 102]].map(([x, y], k) => trait(`M${x} ${y} L${x + 18 - k * 4} ${y}`, A[0], 3.4, 7.4)).join('')
        + bouffee(58, 108, 13, A[0], A[1]) + bouffee(44, 126, 9, A[0], A[1])
        + nuee(108, 92, 1.12, A[0], A[1], A[2])
        + `<path d="M140 98 Q150 82 136 74 Q122 70 118 84 Q118 94 128 92" fill="none" stroke="${INK}" stroke-width="3.6" stroke-linecap="round"/><path d="M70 98 Q84 86 100 96" fill="none" stroke="${INK}" stroke-width="3" stroke-linecap="round" opacity=".6"/>`
        + place(deux([[0, -20], [15, 0], [0, 20], [-15, 0]], [[0, -20], [0, 20], [-15, 0]], '#f7dca8', '#835737', 3)
          + poly([[0, -20], [15, 0], [0, 0]], '#ddaa72') + poly([[0, 0], [15, 0], [0, 20]], '#5a4a44', 'opacity=".75"')
          + `<path d="M-3 -18 L3 -6 L-4 4 L2 18" fill="none" stroke="${INK}" stroke-width="3" stroke-linejoin="round"/>`, 112, 146, 0, 1)
        + chevrons(146, 140, .44, p[1], 90);
    },
    rugissement_d_iskar: p => wyverne(80, 104, 1.25) + ondes(136, 108, .95, BR_C) + eclat(48, 46, .55, BR_C),
    ailes_de_braise: p => aile(104, 116, 1.05, 8) + aile(96, 116, 1.05, -8, -1) + braise(100, 118, .95) + chevrons(100, 162, .5, OR_C, -90),
    hurlement: p => ondeDent(112, 102, 1.15, p[1], 1) + ondeDent(88, 102, 1.15, p[1], -1) + braise(100, 102, 1.2) + flamme(100, 48, .44, p),
    cri_de_vapeur: p => ondes(118, 104, 1.1, '#ffffff') + ondes(82, 104, 1.1, '#ffffff', 3, 180)
      + goutte(100, 104, 1.45, p) + nuage([[150, 56, 8], [162, 70, 6], [44, 150, 7]], '#ffffff', p[0]) + bulle(96, 58, 5, p[0]) + bulle(110, 48, 3.6, p[0]),
  });
})();

IconesV3.TYPES = Object.assign(IconesV3.TYPES || {}, {fer_de_marque:'degats',fumee_acre:'degats',rugissement_d_iskar:'degats'});
