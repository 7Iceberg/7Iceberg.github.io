(() => {
  const { poly, encre, place, croix, eclat, roc, croissant, flamme } = IconesV3.outils;
  const { P, INK } = IconesV3;
  const OR_C = '#ffd98f', OR_S = '#a8683a', OR_V = '#fff3d2', OR_O = '#7a4a26';
  const IV_C = '#fbf1dc', IV_M = '#e6d3b0', IV_S = '#b39874';
  const AC_C = '#eef4fb', AC_M = '#b9c6dc', AC_S = '#7c8db4', AC_O = '#3e4a6e';
  const BOIS_C = '#c99a6a', BOIS_S = '#7a5236';
  const CUIR_C = '#c8925a', CUIR_S = '#7a4a26';
  const PI_C = '#efe2c8', PI_M = '#c9b498', PI_S = '#8f7a66';
  const NUIT = '#2b2238';
  const feu = P.feu, eau = P.eau, air = P.air;

  const deux = (pts, cut, c1, c2, w = 3) => poly(pts, c2) + poly(cut, c1) + encre(pts, w);
  const trait = (d, c, w, iw = w + 4.4) => `<path d="${d}" fill="none" stroke="${INK}" stroke-width="${iw}" stroke-linecap="round" stroke-linejoin="round"/><path d="${d}" fill="none" stroke="${c}" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round"/>`;
  const ngone = (n, r, a0 = 0) => Array.from({ length: n }, (_, k) => { const a = a0 + k / n * Math.PI * 2; return [Math.cos(a) * r, Math.sin(a) * r]; });
  const etire = (svg, x, y, sx, sy, r = 0) => `<g transform="translate(${x} ${y}) rotate(${r}) scale(${sx} ${sy})">${svg}</g>`;

  function pioche(p, o = {}) {
    const C = t => [64 * t, -84 + 24 * t * t];
    const N = t => { const dx = 64, dy = 48 * t, l = Math.hypot(dx, dy); return [dy / l, -dx / l]; };
    const H = t => { const a = Math.abs(t); return a <= .74 ? 14 - 6 * a : 9.6 * (1.06 - a) / .32; };
    const U = (t, e = 0) => { const c = C(t), n = N(t), h = H(t) + e; return [c[0] + n[0] * h, c[1] + n[1] * h]; };
    const D = (t, e = 0) => { const c = C(t), n = N(t), h = H(t) + e; return [c[0] - n[0] * h, c[1] - n[1] * h]; };
    const T = (a, b, n = 8) => Array.from({ length: n + 1 }, (_, k) => a + (b - a) * k / n);
    const tc = o.chaud ? ['#fff3c0', '#ffb347', '#ef5a2a'] : [AC_C, AC_M, AC_S];
    const tete = T(-1.06, 1.06, 24).map(t => U(t)).concat(T(1.06, -1.06, 24).map(t => D(t)));
    const bague = t => { const a = t - .05, b = t + .05; return deux([U(a, 2.6), U(b, 2.6), D(b, 2.6), D(a, 2.6)], [U(a, 2.6), U(b, 2.6), C(b), C(a)], OR_C, OR_S, 2.2); };
    const fente = (a, b) => poly(T(a, b, 6).map(t => U(t, -H(t) + 1.3)).concat(T(b, a, 6).map(t => D(t, -H(t) + 1.3))), o.fente || p[1]);
    return [
      deux([[-5.5, -74], [5.5, -74], [5.5, 0], [-5.5, 0]], [[-5.5, -74], [0, -74], [0, 0], [-5.5, 0]], BOIS_C, BOIS_S, 2.8),
      poly(T(-.74, .74, 16).map(t => U(t)).concat(T(.74, -.74, 16).map(t => D(t))), IV_S),
      poly(T(-.74, 0).map(t => U(t)).concat(T(0, -.74).map(C)), IV_C),
      poly(T(0, .74).map(t => U(t)).concat(T(.74, 0).map(C)), IV_M),
      poly(T(-.74, 0).map(C).concat(T(0, -.74).map(t => D(t))), IV_M),
      poly(T(.74, 1.06).map(t => U(t)).concat(T(1.06, .74).map(t => D(t))), tc[2]),
      poly(T(.74, 1.06).map(t => U(t)).concat(T(1.06, .74).map(C)), tc[1]),
      poly(T(-1.06, -.74).map(t => U(t)).concat(T(-.74, -1.06).map(t => D(t))), tc[1]),
      poly(T(-1.06, -.74).map(t => U(t)).concat(T(-.74, -1.06).map(C)), tc[0]),
      fente(-.62, -.24), fente(.24, .62),
      encre(tete, 3.2),
      bague(-.74), bague(.74),
      deux([[0, -108], [18, -97], [18, -73], [0, -62], [-18, -73], [-18, -97]], [[0, -108], [0, -62], [-18, -73], [-18, -97]], OR_C, OR_S, 3),
      poly([[0, -101], [11, -85], [0, -69], [-11, -85]], p[1]), poly([[0, -101], [-11, -85], [0, -85]], o.quartz || '#ffffff'), poly([[0, -69], [11, -85], [0, -85]], p[2]),
      encre([[0, -101], [11, -85], [0, -69], [-11, -85]], 2),
      place(poly([[-4.5, -1], [-1.5, -5], [3, -4.5], [4.5, -.5], [1, 3], [-3.5, 2]], OR_C) + poly([[-1.5, -5], [3, -4.5], [0, -1]], OR_V) + encre([[-4.5, -1], [-1.5, -5], [3, -4.5], [4.5, -.5], [1, 3], [-3.5, 2]], 1.4), 0, -85, 0, 1.15),
      deux([[-8.5, -5], [8.5, -5], [8.5, 4], [-8.5, 4]], [[-8.5, -5], [0, -5], [0, 4], [-8.5, 4]], OR_C, OR_S, 2.4),
      poly([[-6.5, 4], [6.5, 4], [6.5, 44], [-6.5, 44]], NUIT), encre([[-6.5, 4], [6.5, 4], [6.5, 44], [-6.5, 44]], 2.6),
      croix(0, 13, .72), croix(0, 24, .72), croix(0, 35, .72),
      deux([[-8.5, 44], [8.5, 44], [8.5, 51], [-8.5, 51]], [[-8.5, 44], [0, 44], [0, 51], [-8.5, 51]], AC_C, AC_S, 2.2),
      deux([[-6, 51], [6, 51], [0, 66]], [[-6, 51], [0, 51], [0, 66]], AC_C, AC_S, 2.2),
    ].join('');
  }
  const PI = (p, x, y, r, s, o) => place(pioche(p, o), x, y, r, s);
  const PIC = (p, x, y, r, s, o) => place(place(pioche(p, o), 0, 42), x, y, r, s);

  const PEP = [[-14, -4], [-7, -13], [5, -13], [14, -5], [13, 7], [3, 14], [-9, 11]];
  const pepite = (x, y, s = 1, r = 0, c = [OR_V, OR_C, OR_S]) => place(poly(PEP, c[2]) + poly([[-14, -4], [-7, -13], [5, -13], [1, 0], [-9, 11]], c[1]) + poly([[-7, -13], [5, -13], [1, -4], [-6, -6]], c[0]) + encre(PEP, 2.6 / Math.max(s, .8) * 1.1), x, y, r, s);
  const goutte = (x, y, s, p) => place(deux([[0, -16], [10, 2], [8, 12], [0, 16], [-8, 12], [-10, 2]], [[0, -16], [0, 16], [-8, 12], [-10, 2]], p[1], p[2], 2.4) + poly([[-4, 0], [-1, -8], [-1, 4]], p[0]), x, y, 0, s);
  const chevrons = (x, y, s, c, r = 0) => place([0, 18].map(dx => `<path d="M${dx - 10} -16 L${dx + 6} 0 L${dx - 10} 16" fill="none" stroke="${INK}" stroke-width="10" stroke-linejoin="miter" stroke-linecap="square"/><path d="M${dx - 10} -16 L${dx + 6} 0 L${dx - 10} 16" fill="none" stroke="${c}" stroke-width="5.4" stroke-linejoin="miter" stroke-linecap="square"/>`).join(''), x, y, r, s);
  const filets = (x, y, s, c, r = 0) => place([[-30, -14, 26], [-40, 0, 34], [-30, 14, 24]].map(([a, b, l]) => `<path d="M${a} ${b} L${a + l} ${b}" stroke="${INK}" stroke-width="7" stroke-linecap="round"/><path d="M${a} ${b} L${a + l} ${b}" stroke="${c}" stroke-width="3.4" stroke-linecap="round"/>`).join(''), x, y, r, s);
  const impact = (x, y, p, s = 1) => place(deux([[0, -20], [6, -6], [20, 0], [6, 6], [0, 20], [-6, 6], [-20, 0], [-6, -6]], [[0, -20], [6, -6], [0, 0], [-6, 6], [-20, 0], [-6, -6]], p[0], p[2], 2.6), x, y, 0, s);
  const ondes = (x, y, s, c, r = 0, n = 3) => place(Array.from({ length: n }, (_, k) => { const R = 14 + k * 11; return `<path d="M${R * .7} ${-R * .7} A${R} ${R} 0 0 1 ${R * .7} ${R * .7}" fill="none" stroke="${INK}" stroke-width="8" stroke-linecap="round"/><path d="M${R * .7} ${-R * .7} A${R} ${R} 0 0 1 ${R * .7} ${R * .7}" fill="none" stroke="${c}" stroke-width="4" stroke-linecap="round"/>`; }).join(''), x, y, r, s);
  const montagne = (x, y, s) => place(
    poly([[-60, 30], [-22, -30], [-6, -6], [14, -40], [60, 30]], PI_S)
    + poly([[-60, 30], [-22, -30], [-14, 30]], PI_C) + poly([[-6, -6], [14, -40], [6, 30]], PI_C)
    + poly([[14, -40], [24, -24], [16, -20], [8, -26]], '#ffffff') + poly([[-22, -30], [-16, -20], [-26, -18]], '#ffffff')
    + encre([[-60, 30], [-22, -30], [-6, -6], [14, -40], [60, 30]], 3.2), x, y, 0, s);
  const glace = (x, y, s, r, p) => place(poly([[0, -16], [6, -4], [4, 14], [-4, 14], [-6, -4]], p[2]) + poly([[0, -16], [6, -4], [0, 0], [-6, -4]], p[0]) + poly([[0, 0], [6, -4], [4, 14]], p[1]) + encre([[0, -16], [6, -4], [4, 14], [-4, 14], [-6, -4]], 2), x, y, r, s);
  const ecu = (x, y, s, embleme = '') => place(deux([[-36, -40], [36, -40], [36, 4], [0, 44], [-36, 4]], [[-36, -40], [0, -40], [0, 44], [-36, 4]], '#e9dcc4', PI_S, 3.4)
    + `<path d="M-30 -34 L30 -34 L30 2 L0 36 L-30 2 Z" fill="none" stroke="${OR_C}" stroke-width="3"/>` + embleme, x, y, 0, s);
  const piece = (x, y, s = 1, sx = 1, r = 0, marque = 'sol') => {
    const O = ngone(12, 22, Math.PI / 12);
    const m = marque === 'sol'
      ? poly(ngone(8, 6.5, Math.PI / 8), OR_S) + [0, 1, 2, 3, 4, 5, 6, 7].map(k => { const a = k / 8 * Math.PI * 2; return `<path d="M${Math.cos(a) * 9} ${Math.sin(a) * 9} L${Math.cos(a) * 13} ${Math.sin(a) * 13}" stroke="${OR_S}" stroke-width="2.6" stroke-linecap="round"/>`; }).join('')
      : `<path d="M-8 -6 L0 8 L8 -6" fill="none" stroke="${OR_S}" stroke-width="4" stroke-linejoin="round"/>`;
    return etire(poly(O, OR_S) + poly(O.slice(4, 11).concat([[0, 0]]), OR_C) + poly([[-14, -14], [-4, -19], [-17, -6]], OR_V)
      + `<circle r="15.5" fill="none" stroke="${OR_O}" stroke-width="1.6"/>` + m + encre(O, 3), x, y, s * sx, s, r);
  };
  const pile = (x, y, n, s = 1) => place(Array.from({ length: n }, (_, k) => {
    const yy = -k * 8;
    return deux([[-18, yy - 4], [18, yy - 4], [18, yy + 3], [-18, yy + 3]], [[-18, yy - 4], [0, yy - 4], [0, yy + 3], [-18, yy + 3]], OR_C, OR_S, 2.4)
      + (k === n - 1 ? `<ellipse cx="0" cy="${yy - 4}" rx="18" ry="6" fill="${OR_C}" stroke="${INK}" stroke-width="2.4"/><path d="M-10 ${yy - 6} L0 ${yy - 8}" stroke="${OR_V}" stroke-width="2" stroke-linecap="round"/>` : '');
  }).join(''), x, y, 0, s);
  const poing = (x, y, s, r = 0) => place(
    deux([[-44, -16], [-22, -20], [-22, 20], [-44, 18]], [[-44, -16], [-22, -20], [-22, 0], [-44, 0]], BOIS_C, BOIS_S, 3)
    + deux([[-24, -20], [14, -26], [28, -16], [30, 10], [20, 24], [-22, 22], [-28, 2]], [[-24, -20], [14, -26], [28, -16], [6, -8], [-22, 22], [-28, 2]], CUIR_C, CUIR_S, 3.2)
    + `<path d="M10 -12 L29 -10 M8 2 L30 2 M8 14 L25 14" stroke="${INK}" stroke-width="2.6" stroke-linecap="round"/>`
    + deux([[-20, -18], [6, -24], [12, -12], [-10, -6]], [[-20, -18], [6, -24], [-4, -14]], '#e2b07c', CUIR_C, 2.6)
    + deux([[-18, 2], [-4, 2], [-4, 16], [-18, 16]], [[-18, 2], [-4, 2], [-18, 16]], OR_C, OR_S, 2) + croix(-11, 9, .62), x, y, r, s);
  const main = (x, y, s, r = 0) => place(
    deux([[-60, -10], [-36, -10], [-36, 20], [-60, 20]], [[-60, -10], [-36, -10], [-36, 4], [-60, 4]], BOIS_C, BOIS_S, 3)
    + deux([[-38, -8], [-8, -4], [26, -8], [44, -18], [50, -12], [36, 4], [12, 14], [-16, 20], [-38, 18]], [[-38, -8], [-8, -4], [26, -8], [44, -18], [50, -12], [30, -2], [-6, 4], [-38, 6]], '#e2b07c', CUIR_C, 3)
    + deux([[-16, -4], [-6, -24], [2, -24], [0, -4]], [[-16, -4], [-6, -24], [-4, -4]], '#f0c898', '#e2b07c', 2.6)
    + `<path d="M24 0 L40 -10 M14 6 L34 -2" stroke="${INK}" stroke-width="2" stroke-linecap="round"/>`, x, y, r, s);
  const GANT_C = '#76637e', GANT_S = '#3a2e44';
  const serre = (x, y, s) => {
    const doigts = [['M-28 -14 L-40 10 L-30 30', -30, 30, 1], ['M-10 -12 L-16 14 L-10 36', -10, 36, 1], ['M10 -12 L16 14 L10 36', 10, 36, -1], ['M28 -14 L40 10 L30 30', 30, 30, -1]];
    const fil = (d, c, w) => `<path d="${d}" fill="none" stroke="${c}" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round"/>`;
    return place(
      pepite(0, 40, 2.7, -6, ['#ffffff', OR_V, OR_C])
      + deux([[-32, -58], [32, -58], [42, -26], [32, -8], [-32, -8], [-42, -26]], [[-32, -58], [0, -58], [0, -8], [-32, -8], [-42, -26]], GANT_C, GANT_S, 3.4)
      + `<path d="M-30 -24 L-24 -16 M-10 -22 L-8 -14 M10 -22 L8 -14 M30 -24 L24 -16" stroke="${INK}" stroke-width="2.4" stroke-linecap="round"/>`
      + [['M-40 -36 L-56 -14 L-48 6'], ...doigts].map(([d]) => fil(d, INK, 18.4) + fil(d, GANT_S, 12) + `<g transform="translate(-2.6 0)">${fil(d, GANT_C, 6.4)}</g>`).join('')
      + [[-48, 6, 1], ...doigts.map(([, a, b, k]) => [a, b, k])].map(([a, b, k]) => deux([[a - 6, b - 3], [a + 6, b - 3], [a + k * 8, b + 10]], [[a - 6, b - 3], [a, b - 3], [a + k * 8, b + 10]], OR_V, OR_C, 2.2)).join('')
      + deux([[-28, -76], [28, -76], [32, -56], [-32, -56]], [[-28, -76], [0, -76], [0, -56], [-32, -56]], OR_C, OR_S, 3) + croix(-12, -66, .7) + croix(12, -66, .7), x, y, 0, s);
  };
  const lanterne = (x, y, s, p, r = 0) => place(
    trait('M0 -44 m-7 0 a7 7 0 1 0 14 0 a7 7 0 1 0 -14 0', OR_C, 3, 7.4)
    + deux([[-12, -36], [12, -36], [18, -24], [-18, -24]], [[-12, -36], [0, -36], [0, -24], [-18, -24]], OR_C, OR_S, 2.6)
    + poly([[-14, -24], [14, -24], [14, 14], [-14, 14]], p[1]) + poly([[-14, -24], [0, -24], [0, 14], [-14, 14]], p[0])
    + flamme(0, -2, .52, p)
    + `<path d="M-7 -24 L-7 14 M7 -24 L7 14" stroke="${INK}" stroke-width="2.6"/>`
    + encre([[-14, -24], [14, -24], [14, 14], [-14, 14]], 3)
    + deux([[-19, 14], [19, 14], [17, 28], [-17, 28]], [[-19, 14], [0, 14], [0, 28], [-17, 28]], OR_C, OR_S, 2.8)
    + `<path d="M-17 21 L17 21" stroke="${OR_O}" stroke-width="1.6"/>`, x, y, r, s);
  const wagonnet = (x, y, s) => place(
    pepite(-16, -30, .9, 10) + pepite(6, -34, 1, -20) + pepite(24, -28, .8, 40)
    + deux([[-46, -26], [46, -26], [36, 14], [-36, 14]], [[-46, -26], [0, -26], [0, 14], [-36, 14]], BOIS_C, BOIS_S, 3.2)
    + `<path d="M-18 -26 L-15 14 M18 -26 L15 14" stroke="${INK}" stroke-width="2"/>`
    + deux([[-48, -32], [48, -32], [46, -24], [-46, -24]], [[-48, -32], [0, -32], [0, -24], [-46, -24]], AC_C, AC_S, 2.6)
    + deux([[-42, -6], [42, -6], [41, 0], [-41, 0]], [[-42, -6], [0, -6], [0, 0], [-41, 0]], OR_C, OR_S, 2)
    + [-24, 24].map(cx => `<circle cx="${cx}" cy="18" r="12" fill="${NUIT}" stroke="${INK}" stroke-width="3"/><circle cx="${cx}" cy="18" r="6" fill="${AC_M}"/><path d="M${cx - 6} 18 L${cx + 6} 18 M${cx} 12 L${cx} 24" stroke="${INK}" stroke-width="2"/>`).join(''), x, y, 0, s);
  const rails = (y, a = 44, b = 156) => `<path d="M${a} ${y} L${b} ${y}" stroke="${INK}" stroke-width="8" stroke-linecap="round"/><path d="M${a} ${y} L${b} ${y}" stroke="${AC_M}" stroke-width="3.4" stroke-linecap="round"/>`
    + [64, 91, 118].map(a => poly([[a, y + 4], [a + 18, y + 4], [a + 16, y + 11], [a - 2, y + 11]], BOIS_S) + encre([[a, y + 4], [a + 18, y + 4], [a + 16, y + 11], [a - 2, y + 11]], 2)).join('');
  const besace = (x, y, s) => place(
    trait('M-30 -12 Q0 -70 30 -12', CUIR_S, 6, 11)
    + deux([[-38, -10], [38, -10], [42, 30], [32, 40], [-32, 40], [-42, 30]], [[-38, -10], [0, -10], [0, 40], [-32, 40], [-42, 30]], CUIR_C, CUIR_S, 3.2)
    + deux([[-22, 18], [-4, 16], [-2, 34], [-20, 36]], [[-22, 18], [-4, 16], [-20, 36]], BOIS_C, BOIS_S, 2.2) + croix(-12, 26, .7)
    + deux([[-40, -16], [40, -16], [36, 10], [0, 18], [-36, 10]], [[-40, -16], [0, -16], [0, 18], [-36, 10]], '#e2b07c', CUIR_C, 3)
    + croix(-24, -6, .62) + croix(24, -6, .62)
    + deux([[-6, 8], [6, 8], [6, 20], [-6, 20]], [[-6, 8], [0, 8], [0, 20], [-6, 20]], OR_C, OR_S, 2.2), x, y, 0, s);
  const idole = (x, y, s, yeux = OR_C) => place(
    deux([[-20, -46], [20, -46], [24, -20], [14, -14], [28, -6], [30, 30], [-30, 30], [-28, -6], [-14, -14], [-24, -20]],
      [[-20, -46], [0, -46], [0, 30], [-30, 30], [-28, -6], [-14, -14], [-24, -20]], PI_C, PI_S, 3.2)
    + deux([[-22, -50], [22, -50], [24, -42], [-24, -42]], [[-22, -50], [0, -50], [0, -42], [-24, -42]], OR_C, OR_S, 2.2)
    + poly([[-14, -34], [-4, -32], [-4, -27], [-14, -29]], INK) + poly([[14, -34], [4, -32], [4, -27], [14, -29]], INK)
    + poly([[-12, -32], [-6, -31], [-6, -29], [-12, -30]], yeux) + poly([[12, -32], [6, -31], [6, -29], [12, -30]], yeux)
    + `<path d="M-6 -21 L6 -21" stroke="${INK}" stroke-width="2.6" stroke-linecap="round"/><path d="M-26 0 L0 12 L26 0 M0 12 L0 30" stroke="${INK}" stroke-width="2.4" fill="none"/>`
    + poly([[0, -8], [5, 0], [0, 6], [-5, 0]], yeux) + encre([[0, -8], [5, 0], [0, 6], [-5, 0]], 1.6), x, y, 0, s);
  const fosse = (h = 148) => {
    const xg = 29.4 + (h + 4 - 138.6) * 70.6 / 38.7, xd = 200 - xg;
    const T = [[xg, h + 4], [xg + 14, h - 6], [82, h - 12], [118, h - 12], [xd - 14, h - 6], [xd, h + 4], [100, 177.3]];
    return poly(T, PI_S) + poly([[xg, h + 4], [xg + 14, h - 6], [82, h - 12], [100, h - 11], [100, 177.3]], PI_M) + encre(T, 3)
      + roc(xg + 16, h + 2, .6, 20) + roc(xd - 18, h + 4, .55, -30) + roc(100, h + 14, .5, 70);
  };
  const coffre = (x, y, s) => place(
    deux([[-40, -32], [40, -32], [44, -8], [-44, -8]], [[-40, -32], [0, -32], [0, -8], [-44, -8]], BOIS_C, BOIS_S, 3)
    + poly([[-38, -6], [-22, -18], [-4, -22], [16, -20], [38, -6]], OR_C) + poly([[-4, -22], [16, -20], [38, -6], [6, -6]], OR_S) + encre([[-38, -6], [-22, -18], [-4, -22], [16, -20], [38, -6]], 2.4)
    + pepite(-14, -18, .6, 20) + pepite(18, -16, .55, -10)
    + deux([[-42, -6], [42, -6], [42, 30], [-42, 30]], [[-42, -6], [0, -6], [0, 30], [-42, 30]], BOIS_C, BOIS_S, 3.2)
    + deux([[-42, -6], [42, -6], [42, 2], [-42, 2]], [[-42, -6], [0, -6], [0, 2], [-42, 2]], OR_C, OR_S, 2.2)
    + `<path d="M-26 2 L-26 30 M26 2 L26 30" stroke="${OR_C}" stroke-width="4"/><path d="M-26 2 L-26 30 M26 2 L26 30" stroke="${INK}" stroke-width="1.4" opacity=".5"/>`
    + deux([[-7, 0], [7, 0], [7, 14], [0, 18], [-7, 14]], [[-7, 0], [0, 0], [0, 18], [-7, 14]], OR_C, OR_S, 2.2), x, y, 0, s);
  const balance = (x, y, s, a, gauche, droite) => {
    const r = a * Math.PI / 180, cx = 0, cy = -38, L = 44;
    const g = [cx - Math.cos(r) * L, cy - Math.sin(r) * L], d = [cx + Math.cos(r) * L, cy + Math.sin(r) * L];
    const plateau = ([px, py], charge) => `<path d="M${px} ${py} L${px - 15} ${py + 30} M${px} ${py} L${px + 15} ${py + 30}" stroke="${INK}" stroke-width="2"/>`
      + place(charge, px, py + 26) + deux([[px - 20, py + 30], [px + 20, py + 30], [px + 12, py + 40], [px - 12, py + 40]], [[px - 20, py + 30], [px, py + 30], [px, py + 40], [px - 12, py + 40]], OR_C, OR_S, 2.6);
    return place(
      deux([[-22, 38], [22, 38], [26, 48], [-26, 48]], [[-22, 38], [0, 38], [0, 48], [-26, 48]], OR_C, OR_S, 2.6)
      + deux([[-4, -38], [4, -38], [4, 38], [-4, 38]], [[-4, -38], [0, -38], [0, 38], [-4, 38]], BOIS_C, BOIS_S, 2.4)
      + trait(`M${g[0]} ${g[1]} L${d[0]} ${d[1]}`, OR_C, 4, 9)
      + poly([[0, -48], [7, -38], [0, -30], [-7, -38]], OR_C) + encre([[0, -48], [7, -38], [0, -30], [-7, -38]], 2)
      + plateau(g, gauche) + plateau(d, droite), x, y, 0, s);
  };
  const perle = (x, y, r, c = ['#ffffff', '#e6fcff', '#6fe0f2']) => `<circle cx="${x}" cy="${y}" r="${r}" fill="${c[1]}" stroke="${INK}" stroke-width="2"/><path d="M${x - r * .5} ${y - r * .1} A${r * .5} ${r * .5} 0 0 1 ${x + r * .1} ${y - r * .55}" stroke="${c[0]}" stroke-width="${r * .35}" fill="none" stroke-linecap="round"/><path d="M${x + r * .7} ${y} A${r * .7} ${r * .7} 0 0 1 ${x} ${y + r * .7}" stroke="${c[2]}" stroke-width="${r * .3}" fill="none"/>`;
  const CAL_V = '#fbe6b4', CAL_C = '#f0c878', CAL_S = '#b07a3e';
  const gourde = (x, y, s, r = 0) => {
    const bas = ngone(10, 32, Math.PI / 10).map(([a, b]) => [a, b + 16]), haut = ngone(8, 18, Math.PI / 8).map(([a, b]) => [a, b - 28]);
    return place(
      trait('M-14 -14 Q-52 -20 -40 -52', CUIR_S, 4, 8.4)
      + poly(bas, CAL_S) + poly(bas.filter(([a]) => a <= 0).concat([[0, 48], [0, -16]]), CAL_C) + poly([[-24, -2], [-12, -10], [-20, 14]], CAL_V) + encre(bas, 3.2)
      + poly(haut, CAL_S) + poly(haut.filter(([a]) => a <= 0).concat([[0, -10], [0, -46]]), CAL_C) + poly([[-12, -36], [-5, -41], [-10, -28]], CAL_V) + encre(haut, 3)
      + deux([[-7, -56], [7, -56], [6, -44], [-6, -44]], [[-7, -56], [0, -56], [0, -44], [-6, -44]], BOIS_C, BOIS_S, 2.4)
      + deux([[-19, -18], [19, -18], [21, -9], [-21, -9]], [[-19, -18], [0, -18], [0, -9], [-21, -9]], CUIR_C, CUIR_S, 2.6) + croix(-9, -13.5, .6) + croix(9, -13.5, .6)
      + deux([[-31, 12], [31, 12], [31, 20], [-31, 20]], [[-31, 12], [0, 12], [0, 20], [-31, 20]], CUIR_C, CUIR_S, 2.4), x, y, r, s);
  };
  const botte = (x, y, s, r = 0, sx = 1) => etire(
    deux([[-18, -42], [10, -42], [10, 4], [30, 10], [40, 20], [40, 28], [-22, 28], [-22, 4]], [[-18, -42], [0, -42], [0, 6], [-8, 28], [-22, 28], [-22, 4]], CUIR_C, CUIR_S, 3.2)
    + deux([[-20, -46], [12, -46], [12, -36], [-20, -36]], [[-20, -46], [0, -46], [0, -36], [-20, -36]], '#e2b07c', CUIR_C, 2.6)
    + croix(-2, -24, .6) + croix(-2, -12, .6)
    + deux([[-24, 26], [42, 26], [42, 34], [-24, 34]], [[-24, 26], [42, 26], [42, 29], [-24, 29]], '#5a4a5e', NUIT, 2.6), x, y, s * sx, s, r);
  const cle = (x, y, s, r = 0) => place(trait('M-28 0 m-10 0 a10 10 0 1 0 20 0 a10 10 0 1 0 -20 0', OR_C, 5, 10) + trait('M-18 0 L34 0 M24 0 L24 12 M32 0 L32 10', OR_C, 5, 10) + `<path d="M-14 -1 L30 -1" stroke="${OR_V}" stroke-width="1.6"/>`, x, y, r, s);
  const grille = (x, y, s) => place(
    [-24, -8, 8, 24].map(bx => trait(`M${bx} ${-36 + (Math.abs(bx) > 10 ? 10 : 0)} L${bx} 44`, AC_S, 5, 10)).join('')
    + trait('M-40 6 L40 6 M-40 28 L40 28', AC_S, 5, 10)
    + trait('M-40 46 L-40 -16 Q0 -62 40 -16 L40 46', AC_M, 8, 14)
    + [-24, -8, 8, 24].map(bx => poly([[bx, 44], [bx + 4, 50], [bx, 56], [bx - 4, 50]], AC_C) + encre([[bx, 44], [bx + 4, 50], [bx, 56], [bx - 4, 50]], 2)).join('')
    + croix(-40, 6, .7) + croix(40, 6, .7), x, y, 0, s);
  const etai = (x, y, h, r = 0) => place(deux([[-7, 0], [7, 0], [7, h], [-7, h]], [[-7, 0], [0, 0], [0, h], [-7, h]], BOIS_C, BOIS_S, 3), x, y, r);
  const galerie = (brise) => etai(46, 64, 108) + etai(154, 64, 108)
    + (brise
      ? place(deux([[-50, -8], [0, -8], [6, -2], [-2, 4], [4, 8], [-50, 8]], [[-50, -8], [0, -8], [6, -2], [-50, 0]], BOIS_C, BOIS_S, 3), 92, 66, 24) + place(deux([[50, -8], [2, -8], [-6, -2], [2, 4], [-4, 8], [50, 8]], [[50, -8], [2, -8], [-6, -2], [50, 0]], BOIS_C, BOIS_S, 3), 112, 66, -24)
      : deux([[34, 52], [166, 52], [166, 68], [34, 68]], [[34, 52], [166, 52], [166, 60], [34, 60]], BOIS_C, BOIS_S, 3.2));
  const casque = (x, y, s, p) => place(
    deux([[-36, 8], [-34, -12], [-20, -28], [0, -34], [20, -28], [34, -12], [36, 8]], [[-36, 8], [-34, -12], [-20, -28], [0, -34], [-4, 8]], OR_C, OR_S, 3.2)
    + `<path d="M0 -34 L0 8" stroke="${OR_O}" stroke-width="2"/>`
    + deux([[-46, 6], [46, 6], [44, 16], [-44, 16]], [[-46, 6], [0, 6], [0, 16], [-44, 16]], OR_C, OR_S, 2.8)
    + poly(ngone(8, 12, Math.PI / 8).map(([a, b]) => [a, b - 12]), AC_S) + poly(ngone(8, 8, Math.PI / 8).map(([a, b]) => [a, b - 12]), p[0])
    + poly([[-5, -16], [0, -19], [2, -12]], '#ffffff') + encre(ngone(8, 12, Math.PI / 8).map(([a, b]) => [a, b - 12]), 2.6), x, y, 0, s);
  const creuset = (x, y, s, bain) => place(
    deux([[-34, -26], [34, -26], [32, 2], [18, 24], [-18, 24], [-32, 2]], [[-34, -26], [0, -26], [0, 24], [-18, 24], [-32, 2]], PI_C, PI_S, 3.4) + `<path d="M-33 -8 L33 -8" stroke="${PI_S}" stroke-width="2"/>`
    + deux([[-38, -32], [38, -32], [36, -24], [-36, -24]], [[-38, -32], [0, -32], [0, -24], [-36, -24]], '#ffffff', PI_M, 2.6)
    + `<ellipse cx="0" cy="-28" rx="32" ry="5" fill="${bain[1]}" stroke="${INK}" stroke-width="2.4"/><path d="M-22 -29 L4 -31" stroke="${bain[0]}" stroke-width="2.4" stroke-linecap="round"/>`
    + deux([[6, -24], [12, -24], [10, 6], [6, 2]], [[6, -24], [9, -24], [8, 4], [6, 2]], bain[0], bain[1], 1.8), x, y, 0, s);
  const dalle = (x, y, s, entaille = '') => place(
    deux([[-64, 0], [0, 26], [64, 0], [64, 10], [0, 36], [-64, 10]], [[-64, 0], [0, 26], [0, 36], [-64, 10]], PI_M, PI_S, 3)
    + deux([[0, -26], [64, 0], [0, 26], [-64, 0]], [[0, -26], [0, 26], [-64, 0]], PI_C, PI_M, 3) + entaille, x, y, 0, s);
  const ECA = [[0, 30], [-22, 8], [-26, -10], [-16, -26], [0, -30], [16, -26], [26, -10], [22, 8]];
  const ecaille = (x, y, s, p, r = 0, brisee = false) => {
    const S = brisee ? [[0, 30], [-22, 8], [-26, -10], [-16, -26], [0, -30], [10, -18], [4, -8], [14, 0], [6, 12]] : ECA;
    return place(poly(S, p[2]) + poly(S.filter(([a]) => a <= 0).concat([[0, 30]]), p[1]) + poly([[0, -30], [-4, 0], [0, 30], [4, 0]], p[0])
      + `<path d="M-14 -16 Q-18 0 -10 14" stroke="${p[0]}" stroke-width="2" fill="none" opacity=".8"/>` + encre(S, 3), x, y, r, s);
  };
  const filonRoc = (x, y, s, veine, r = 0) => place(
    deux([[-44, -10], [-24, -36], [10, -40], [40, -20], [46, 12], [24, 36], [-20, 38], [-46, 18]], [[-44, -10], [-24, -36], [10, -40], [-6, -4], [-20, 38], [-46, 18]], PI_C, PI_S, 3.4)
    + poly([[10, -40], [40, -20], [46, 12], [-6, -4]], PI_M)
    + trait('M-36 -18 L-14 -6 L-18 10 L6 16 L4 30', veine[1], 4.4, 9)
    + `<path d="M-36 -18 L-14 -6 L-18 10 L6 16" stroke="${veine[0]}" stroke-width="1.4" fill="none"/>`
    + encre([[-44, -10], [-24, -36], [10, -40], [40, -20], [46, 12], [24, 36], [-20, 38], [-46, 18]], 3.4), x, y, r, s);
  const poussiere = (x, y, s, c) => place(deux([[-40, 14], [-46, 0], [-34, -14], [-18, -14], [-10, -28], [10, -30], [22, -16], [38, -16], [48, 0], [40, 14]],
    [[-40, 14], [-46, 0], [-34, -14], [-18, -14], [-10, -28], [10, -30], [0, -6], [-14, 14]], c[0], c[1], 3), x, y, 0, s);
  const bourse = (x, y, s, r = 0) => place(
    deux([[-10, -26], [10, -26], [6, -16], [26, 0], [30, 20], [18, 34], [-18, 34], [-30, 20], [-26, 0], [-6, -16]], [[-10, -26], [0, -26], [0, 34], [-18, 34], [-30, 20], [-26, 0], [-6, -16]], CUIR_C, CUIR_S, 3.2)
    + trait('M-8 -16 Q0 -10 8 -16', OR_C, 2.6, 6) + croix(-12, 16, .7) + croix(10, 18, .7), x, y, r, s);
  const buche = (x, y, r) => place(deux([[-36, -7], [36, -7], [36, 7], [-36, 7]], [[-36, -7], [36, -7], [36, 0], [-36, 0]], BOIS_C, BOIS_S, 3) + `<ellipse cx="36" cy="0" rx="4" ry="7" fill="${PI_C}" stroke="${INK}" stroke-width="2"/>`, x, y, r);
  const manteau = (x, y, s) => place(deux([[-46, -40], [40, -46], [48, 36], [-40, 44]], [[-46, -40], [40, -46], [-40, 44]], '#5a4a5e', NUIT, 3.2)
    + `<path d="M-46 -40 L-40 44" stroke="${OR_C}" stroke-width="2" stroke-dasharray="5 5"/>`, x, y, 0, s);

  Object.assign(IconesV3.SUJETS, {
    pepite_lancee: p => filets(72, 128, .95, p[1], -38) + pepite(122, 82, 2.4, -12) + goutte(150, 132, .7, p) + goutte(166, 108, .5, p) + goutte(86, 52, .55, p) + eclat(148, 46, .8, p[0]),
    eclat_d_ecaille: p => place(flamme(0, 0, .62, p), 70, 132, -135) + place(flamme(0, 0, .44, p), 48, 112, -135) + place(flamme(0, 0, .4, p), 92, 154, -135)
      + ecaille(120, 84, 1.45, ['#fff3d2', '#ef7574', '#a8322a'], 40, true) + eclat(160, 132, .7, p[0]) + eclat(64, 54, .6, p[1]),

    coup_de_vieux_briscard: p => impact(148, 100, p, 1.5) + poing(88, 102, 1.32) + chevrons(70, 158, .6, p[1]) + eclat(156, 52, .7, p[0]),
    pioche_de_braise: p => impact(150, 152, p, 1.2) + PI(p, 62, 134, 62, .8, { chaud: true }) + flamme(172, 118, .4, p) + flamme(122, 168, .32, p) + eclat(150, 50, .7, p[0]),

    pioche_rougie: p => croissant(100, 100, 72, -2.8, .2, p[1], p[0], 1.22) + PIC(p, 100, 106, 128, .8, { chaud: true }) + flamme(42, 136, .5, p) + flamme(60, 162, .36, p) + eclat(160, 150, .7, p[0]),
    pioche_de_vent: p => croissant(100, 100, 72, -2.8, .2, p[2], p[0], 1.22) + croissant(100, 100, 52, .4, 3.2, p[1], p[0], 1.25) + PIC(p, 100, 106, 128, .8) + eclat(160, 152, .8, '#ffffff', p[1]) + eclat(42, 62, .6, p[1]),

    coup_d_aubaine: p => filonRoc(112, 112, 1.25, [OR_V, OR_C]) + eclat(92, 96, 1, OR_C, OR_V) + eclat(118, 128, .7, OR_C, OR_V) + eclat(150, 54, .7, p[1])
      + trait('M30 52 Q58 48 70 72', p[1], 4, 9) + trait('M22 82 Q48 80 58 98', p[1], 4, 9),
    feu_de_fortune: p => buche(100, 146, 18) + buche(100, 146, -18) + flamme(100, 98, 1.6, p) + pepite(148, 62, .9, 10) + eclat(56, 64, .8, OR_C, OR_V) + eclat(160, 104, .55, OR_C, OR_V),

    deterrer_la_besace: p => fosse() + besace(100, 98, 1.2) + eclat(150, 54, .8, p[1]) + eclat(48, 70, .6, p[0]),
    deterrer_le_wagonnet: p => rails(146) + wagonnet(88, 114, 1.08) + chevrons(150, 94, .66, p[1]) + eclat(150, 50, .7, p[1]),

    poussiere_dans_les_bottes: p => deux([[34, 150], [70, 138], [130, 138], [168, 150], [130, 164], [66, 164]], [[34, 150], [70, 138], [130, 138], [100, 150]], p[1], p[2], 3)
      + botte(92, 104, 1.3) + goutte(150, 74, .7, p) + goutte(160, 116, .5, p) + goutte(52, 64, .5, p) + roc(140, 144, .5, 20, '#b39874', '#7a5236'),
    sable_aux_semelles: p => botte(108, 96, 1.25, -14)
      + [[40, 136, 1], [58, 150, .8], [78, 142, .9], [98, 156, .7], [124, 150, .8], [52, 118, .6], [150, 140, .6]].map(([x, y, k]) => roc(x, y, k * .7, x * 3, '#f2e3c4', '#b39874')).join('')
      + trait('M24 116 Q70 126 112 152', p[1], 3.4, 8) + trait('M30 160 Q90 170 150 158', p[1], 3.4, 8) + eclat(156, 56, .7, p[1]),

    filon_partage: p => place(deux([[-56, -38], [52, -46], [58, 36], [-50, 44]], [[-56, -38], [52, -46], [-50, 44]], '#f7f0de', PI_M, 3.2)
      + `<path d="M-38 26 Q-30 -8 -6 6 Q14 18 28 -18" fill="none" stroke="${INK}" stroke-width="5.4" stroke-dasharray="7 6" stroke-linecap="round"/><path d="M-38 26 Q-30 -8 -6 6 Q14 18 28 -18" fill="none" stroke="${OR_S}" stroke-width="2.4" stroke-dasharray="7 6" stroke-linecap="round"/>`
      + poly([[-46, -14], [-34, -32], [-22, -14]], PI_S) + encre([[-46, -14], [-34, -32], [-22, -14]], 2), 96, 104, -6, 1.15)
      + croix(130, 78, 2.2) + pepite(130, 78, .6) + eclat(158, 52, .8, OR_C, OR_V) + eclat(52, 150, .5, OR_C, OR_V),
    pepite_offerte: p => main(104, 130, 1.25) + pepite(108, 90, 1.5, 8) + eclat(64, 62, .8, OR_C, OR_V) + eclat(148, 56, .7, OR_C, OR_V) + eclat(150, 98, .5, p[1]),

    fouille: p => bourse(104, 72, 1.3, 160) + piece(66, 120, .7, 1, 20) + piece(100, 138, .85, .5, -10) + piece(138, 132, .65, 1, 40, 'v') + pepite(86, 162, .7, 30) + eclat(150, 50, .7, p[1]),
    fouille_profonde: p => deux([[34, 96], [166, 96], [166, 116], [146, 146], [100, 172], [54, 146], [34, 116]], [[34, 96], [166, 96], [166, 108], [34, 108]], p[1], p[2], 3)
      + `<path d="M34 96 L166 96" stroke="${p[0]}" stroke-width="3"/>`
      + trait('M100 30 L100 70', BOIS_S, 3, 7) + bourse(100, 108, 1.15) + piece(66, 132, .55, .5, 20) + piece(134, 144, .55, 1, -20, 'v')
      + [[70, 112, 5], [134, 120, 4], [124, 102, 3], [84, 154, 3]].map(([x, y, r]) => `<circle cx="${x}" cy="${y}" r="${r}" fill="${p[0]}" stroke="${INK}" stroke-width="1.8"/>`).join(''),

    avidite: p => serre(100, 92, .9) + chevrons(38, 132, .62, OR_C) + chevrons(162, 132, .62, OR_C, 180) + eclat(158, 46, .75, '#52d2f4', '#ffffff'),
    gourde_de_mineur: p => gourde(94, 108, 1.2, -14) + goutte(138, 52, .85, eau) + goutte(160, 82, .7, eau) + goutte(152, 118, .6, eau)
      + eclat(52, 70, .7, eau[1], '#ffffff') + eclat(150, 156, .6, p[1]),

    deterrer_l_idole: p => ondes(124, 98, .9, OR_C) + place(ondes(0, 0, .9, OR_C), 76, 98, 180) + fosse() + idole(100, 110, 1.2),
    deterrer_la_lanterne: p => [0, 1, 2, 3, 4, 5, 6, 7].map(k => { const a = (k + .5) / 8 * Math.PI * 2; return eclat(100 + Math.cos(a) * 58, 100 + Math.sin(a) * 50, k % 2 ? .5 : .75, feu[1], feu[0]); }).join('')
      + fosse() + lanterne(100, 104, 1.3, feu),

    eboulis_de_galerie: p => galerie(true) + roc(100, 96, 1.6, 10) + roc(76, 126, 1.2, -30) + roc(126, 128, 1.3, 50) + roc(100, 158, 1.1, 0)
      + poussiere(100, 164, .7, [PI_C, PI_M]) + roc(100, 128, .9, 90),
    boue_de_galerie: p => galerie(false) + poly([[64, 68], [136, 68], [128, 92], [118, 132], [108, 116], [100, 150], [92, 118], [80, 136], [72, 92]], '#7a5236')
      + poly([[64, 68], [100, 68], [100, 150], [92, 118], [80, 136], [72, 92]], '#b5773c') + encre([[64, 68], [136, 68], [128, 92], [118, 132], [108, 116], [100, 150], [92, 118], [80, 136], [72, 92]], 3)
      + deux([[56, 160], [144, 160], [132, 172], [68, 172]], [[56, 160], [144, 160], [100, 166]], '#b5773c', '#7a5236', 3)
      + goutte(100, 156, .55, p) + goutte(64, 150, .5, p) + goutte(136, 148, .55, p),

    tresor_de_durren: p => montagne(100, 80, .85) + coffre(100, 136, 1.2) + eclat(100, 86, 1.1, OR_C, OR_V) + eclat(62, 104, .6, OR_C, OR_V) + eclat(140, 100, .7, OR_C, OR_V) + eclat(156, 50, .6, p[1]),
    dernier_filon: p => {
      const prisme = (x, y, h, w, r) => place(poly([[-w, 0], [-w, -h + w * 1.6], [0, -h], [w, -h + w * 1.6], [w, 0]], p[2])
        + poly([[-w, 0], [-w, -h + w * 1.6], [0, -h], [0, 0]], p[1]) + poly([[-w, -h + w * 1.6], [0, -h], [-w * .2, -h + w * 2.4]], p[0])
        + `<path d="M${-w * .55} -6 L${-w * .55} ${-h + w * 2}" stroke="${p[0]}" stroke-width="2.4" stroke-linecap="round"/>`
        + encre([[-w, 0], [-w, -h + w * 1.6], [0, -h], [w, -h + w * 1.6], [w, 0]], 3), x, y, r);
      const R = [[-58, 14], [-46, -6], [-20, -14], [14, -16], [44, -8], [60, 12], [40, 26], [-36, 26]];
      return prisme(70, 136, 56, 11, -34) + prisme(132, 136, 60, 11, 32) + prisme(86, 130, 82, 14, -12) + prisme(118, 130, 76, 13, 14) + prisme(102, 128, 100, 16, 0)
        + place(poly(R, PI_S) + poly([[-58, 14], [-46, -6], [-20, -14], [-4, 2], [-36, 26]], PI_C) + poly([[-20, -14], [14, -16], [44, -8], [-4, 2]], PI_M) + encre(R, 3.4)
          + `<path d="M-30 4 L-12 10 L-16 22 M20 0 L30 14" stroke="${INK}" stroke-width="2.4" fill="none" stroke-linecap="round"/>` + croix(-20, 8, .8) + croix(24, 7, .8) + pepite(42, 6, .66, 20), 100, 142, 0, .84)
        + eclat(54, 60, .8, p[0]) + eclat(152, 56, .6, p[1]);
    },

    eboulement_de_tresors: p => etai(46, 30, 84, -40) + roc(100, 56, 1.9, 20) + roc(52, 104, 1.75, -20) + roc(148, 104, 1.75, 60) + roc(100, 152, 1.75, -40)
      + piece(100, 104, 1.12, 1) + piece(140, 60, .55, .5, 20) + piece(62, 150, .5, .5, -20),
    averse_de_reliques: p => [[64, 30, 56], [110, 34, 44], [160, 52, 50]].map(([x, y, l]) => trait(`M${x} ${y} L${x - 12} ${y + l}`, p[1], 3, 7)).join('')
      + place(deux([[-14, -16], [14, -16], [8, 4], [3, 6], [3, 16], [10, 20], [-10, 20], [-3, 16], [-3, 6], [-8, 4]], [[-14, -16], [0, -16], [0, 20], [-10, 20], [-3, 16], [-3, 6], [-8, 4]], OR_C, OR_S, 2.8), 64, 80, -20, 1.45)
      + piece(120, 76, .85, .6, 14) + cle(84, 144, 1, -40) + idole(140, 134, .72) + eclat(160, 92, .55, p[0]),

    cle_des_galeries: p => grille(100, 96, 1.2) + cle(116, 150, .95, -12) + eclat(156, 46, .6, p[1]),
    lampe_frontale: p => poly([[86, 98], [176, 46], [180, 104]], OR_V, 'opacity=".75"') + poly([[86, 98], [176, 46], [178, 74]], '#ffffff', 'opacity=".6"')
      + casque(76, 116, 1.2, P.feu) + eclat(160, 74, .8, OR_C, '#ffffff') + eclat(60, 164, .5, p[1]),

    pesee_d_or: p => balance(100, 102, 1.25, -18, pile(0, 2, 2, .6), pepite(-6, 0, .6, 10) + pepite(8, -2, .5, -20) + pepite(0, -8, .5, 40)) + eclat(150, 48, .7, p[1]),
    pesee_de_nacre: p => balance(100, 102, 1.25, 18, pepite(0, -2, .55), perle(-8, -2, 6) + perle(7, -2, 6) + perle(0, -11, 6)) + place(deux([[0, 18], [-20, 0], [-14, -14], [0, -18], [14, -14], [20, 0]], [[0, 18], [-20, 0], [-14, -14], [0, -18]], '#ffffff', p[1], 2.6) + `<path d="M0 18 L-8 -12 M0 18 L0 -14 M0 18 L8 -12" stroke="${p[2]}" stroke-width="1.6"/>`, 58, 146, -20, .9) + eclat(150, 48, .7, p[1]),

    croc_en_jambe_de_mineur: p => deux([[30, 146], [150, 146], [150, 156], [30, 156]], [[30, 146], [150, 146], [150, 151], [30, 151]], BOIS_C, BOIS_S, 2.8)
      + deux([[150, 144], [172, 144], [172, 158], [150, 158]], [[150, 144], [172, 144], [172, 151], [150, 151]], '#5a4a5e', NUIT, 2.6) + croix(156, 151, .55) + croix(166, 151, .55)
      + botte(92, 98, 1.15, 38) + place(trait('M-24 0 Q0 -22 24 0', OR_C, 3, 7.4), 140, 62, 34) + eclat(52, 64, .7, p[1]) + chevrons(60, 120, .5, OR_C, 180),
    mauvais_pas: p => {
      const fente = [[4, -30], [-4, -14], [7, -1], [-4, 13], [6, 29]];
      const gauche = [[-62, 0], [0, -32]].concat(fente, [[0, 32]]);
      const trou = fente.concat([[18, 26], [26, 30], [34, 18], [46, 14], [52, 6], [66, 0], [52, -6], [44, -14], [32, -14], [24, -24], [14, -26], [10, -34]]);
      const paroi = [[4, -30], [10, -34], [14, -26], [24, -24], [32, -14], [44, -14], [52, -6], [66, 0]];
      return place(
        poly(trou, '#140e1c')
        + poly(paroi.concat(paroi.slice().reverse().map(([a, b]) => [a - 2, b + 10])), PI_S) + poly(paroi.concat(paroi.slice().reverse().map(([a, b]) => [a - 1, b + 4])), PI_M)
        + deux([[10, -12], [46, 0], [44, 8], [8, -4]], [[10, -12], [46, 0], [8, -4]], PI_M, PI_S, 2.4)
        + poly([[8, -4], [44, 8], [42, 16], [10, 4]], '#3a2e44') + encre([[8, -4], [44, 8], [42, 16], [10, 4]], 2.2)
        + encre(trou, 3.4)
        + deux([[-62, 0], [0, 32], [6, 29], [6, 41], [0, 44], [-62, 12]], [[-62, 0], [0, 32], [0, 44], [-62, 12]], PI_M, PI_S, 3)
        + poly(gauche, PI_C) + poly([[0, -32]].concat(fente, [[0, 32], [-26, 0]]), PI_M) + encre(gauche, 3.4)
        + `<path d="M-42 -2 L-26 4 L-20 -6 M-22 18 L-12 10" stroke="${INK}" stroke-width="2.4" fill="none" stroke-linecap="round"/>`,
        102, 126, 0, 1.04)
      + chevrons(128, 64, 1, OR_C, 90) + roc(156, 96, .5, 40) + roc(108, 92, .4, -20);
    },

    coup_de_pioche: p => croissant(102, 108, 70, -2.7, .35, p[1], p[0]) + PI(p, 76, 146, 44, .8)
      + impact(158, 132, p, .8) + eclat(60, 60, .8, OR_C, OR_V) + eclat(42, 92, .55, OR_C, OR_V) + eclat(80, 40, .5, OR_C, OR_V),
    coup_de_lanterne: p => croissant(102, 108, 70, -2.7, .35, p[1], p[0]) + trait('M40 34 L100 94', AC_S, 3, 7.4) + lanterne(114, 110, 1.25, feu, -40)
      + impact(158, 140, p, .8) + eclat(60, 60, .8, OR_C, OR_V) + eclat(42, 92, .55, OR_C, OR_V) + eclat(150, 46, .5, OR_C, OR_V),

    garde_de_l_idole: p => ecu(100, 100, 1.45) + idole(100, 106, .78) + eclat(152, 52, .7, p[1]),
    ecaille_protectrice: p => manteau(100, 104, 1.2) + ecaille(100, 98, 1.45, P.neutre, -8)
      + croix(80, 62, .9) + croix(122, 60, .9) + croix(66, 102, .9) + croix(134, 98, .9) + croix(84, 140, .9) + croix(118, 140, .9),

    fievre_de_l_or: p => flamme(70, 148, .6, p) + flamme(130, 148, .6, p) + flamme(100, 154, .72, p) + creuset(100, 98, 1.3, [OR_V, OR_C])
      + [[88, 50, 5], [108, 42, 4], [96, 30, 3]].map(([x, y, r]) => `<circle cx="${x}" cy="${y}" r="${r}" fill="${OR_C}" stroke="${INK}" stroke-width="2"/>`).join('') + eclat(152, 56, .7, p[1]),
    fievre_des_marees: p => glace(70, 150, .8, -20, p) + glace(130, 150, .8, 20, p) + glace(100, 156, .75, 0, p) + creuset(100, 98, 1.3, [p[0], p[1]])
      + perle(100, 44, 11) + glace(62, 56, .6, -30, p) + glace(140, 52, .6, 30, p),

    filon_brulant: p => dalle(100, 132, 1.15, trait('M-44 0 L-20 -6 L-8 6 L14 -4 L40 2', p[2], 4.4, 9) + `<path d="M-44 0 L-20 -6 L-8 6 L14 -4 L40 2" stroke="${p[0]}" stroke-width="1.4" fill="none"/>`)
      + flamme(100, 94, 1.2, p) + flamme(62, 112, .5, p) + flamme(140, 114, .45, p),
    poussiere_volante: p => dalle(100, 140, 1.15) + poussiere(100, 96, 1.2, ['#f2e3c4', '#b39874']) + poussiere(62, 122, .5, ['#f2e3c4', '#b39874']) + poussiere(140, 124, .48, ['#f2e3c4', '#b39874'])
      + roc(76, 64, .55, 20) + roc(130, 58, .5, -30) + roc(150, 92, .4, 60) + eclat(156, 46, .6, p[1]) + eclat(50, 80, .55, p[0]),

    coup_de_fortune: p => trait('M38 78 A64 28 0 0 1 162 78', p[1], 4, 9) + trait('M162 122 A64 28 0 0 1 38 122', p[1], 4, 9)
      + poly([[156, 70], [170, 78], [154, 86]], p[0]) + encre([[156, 70], [170, 78], [154, 86]], 2) + poly([[44, 114], [30, 122], [46, 130]], p[0]) + encre([[44, 114], [30, 122], [46, 130]], 2)
      + piece(100, 100, 2, .62) + eclat(156, 44, .9, '#ffffff', OR_C) + eclat(48, 52, .6, p[1]),
    coup_du_sort: p => flamme(58, 112, .75, p) + flamme(142, 112, .75, p) + flamme(100, 54, .6, p) + piece(100, 104, 2, .62, 18) + eclat(150, 156, .7, p[0]) + eclat(52, 60, .6, p[1]),

    benediction_du_pilleur: p => pile(56, 146, 3) + pile(100, 146, 5) + pile(144, 146, 3) + croix(56, 106, 1) + croix(144, 106, 1) + eclat(100, 52, 1, OR_C, OR_V) + eclat(150, 60, .6, p[1]),
    ruee_des_mineurs: p => PI(p, 106, 110, -40, .72) + PI(p, 94, 110, 40, .72) + chevrons(100, 162, .72, OR_C, -90) + eclat(150, 150, .6, OR_C, OR_V) + eclat(50, 150, .6, OR_C, OR_V),
  });
  IconesV3.outilsDe = Object.assign(IconesV3.outilsDe || {}, { orvald: { poly, encre, place, croix, eclat, roc, croissant, flamme, P, INK, OR_C, IV_C, AC_C, BOIS_C, CUIR_C, PI_C, NUIT, feu, deux, trait, ngone, etire, PI, PIC, PEP, pepite, goutte, chevrons, filets, impact, ondes, montagne, glace, ecu, piece, pile, poing, main, GANT_C, serre, lanterne, wagonnet, rails, besace, idole, fosse, coffre, balance, perle, CAL_V, gourde, botte, cle, grille, etai, galerie, casque, creuset, dalle, ECA, ecaille, filonRoc, poussiere, bourse, buche, manteau, pioche } });
})();

IconesV3.TYPES = Object.assign(IconesV3.TYPES || {}, {avidite:'degats',cle_des_galeries:'degats',croc_en_jambe_de_mineur:'degats',mauvais_pas:'degats',filon_brulant:'degats',poussiere_volante:'degats'});
