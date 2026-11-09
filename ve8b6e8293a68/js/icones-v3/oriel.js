(() => {
  const { poly, encre, place, croix, eclat, roc, croissant, flamme, epeeC } = IconesV3.outils;
  const { P, INK } = IconesV3;
  const OR_C = '#ffd98f', OR_S = '#a8683a', OR_V = '#fff3d2', OR_M = '#e0a860';
  const IV_C = '#f4ead6', IV_S = '#b9a585';
  const MET_C = '#e9eef6', MET_S = '#7c8db4';
  const NUIT = '#2b2238';
  const VIT_CH = '#ffe2a0', VIT_FR = '#bfe6f7', VIT_BL = '#fffbea';
  const PEAU_C = '#f4e3c8', PEAU_S = '#b98f6a';
  const PIERRE_C = '#efe2c8', PIERRE_S = '#8f7a66';
  const RUBIS = '#ef7574', RUBIS_S = '#b83a44', FEUILLE = '#80d697', FEUILLE_S = '#3f8a52', AMETHYSTE = '#9764d6';

  const deux = (pts, cut, c1, c2, w = 3) => poly(pts, c2) + poly(cut, c1) + encre(pts, w);
  const trait = (d, c, w, iw = w + 4.4, o = '') => `<path d="${d}" fill="none" stroke="${INK}" stroke-width="${iw}" stroke-linecap="round" stroke-linejoin="round" ${o}/><path d="${d}" fill="none" stroke="${c}" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round" ${o}/>`;
  const ngone = (r, n = 8, ph = .5, ry = r) => Array.from({ length: n }, (_, j) => { const a = (j + ph) / n * Math.PI * 2; return [+(Math.cos(a) * r).toFixed(2), +(Math.sin(a) * ry).toFixed(2)]; });
  const rai = (a, r0, r1, w, c, iw = 2) => { const ux = Math.cos(a), uy = Math.sin(a), px = -uy, py = ux; const pts = [[ux * r0 + px * w, uy * r0 + py * w], [ux * r1, uy * r1], [ux * r0 - px * w, uy * r0 - py * w]]; return poly(pts, c) + (iw ? encre(pts, iw) : ''); };
  const rayons = (x, y, n, r0, r1, w, c, ph = 0, iw = 2) => place(Array.from({ length: n }, (_, j) => rai((j + ph) / n * Math.PI * 2 - Math.PI / 2, r0, j % 2 ? r0 + (r1 - r0) * .62 : r1, w, c, iw)).join(''), x, y);
  const halo = (x, y, r, c, op = .5) => place(poly(ngone(r), c, `opacity="${op * .45}"`) + poly(ngone(r * .7), c, `opacity="${op * .8}"`) + poly(ngone(r * .42), '#ffffff', `opacity="${op}"`), x, y);
  const chevrons = (x, y, s, c, r = 0) => place([0, 18].map(dx => `<path d="M${dx - 10} -16 L${dx + 6} 0 L${dx - 10} 16" fill="none" stroke="${INK}" stroke-width="10" stroke-linejoin="miter" stroke-linecap="square"/><path d="M${dx - 10} -16 L${dx + 6} 0 L${dx - 10} 16" fill="none" stroke="${c}" stroke-width="5.4" stroke-linejoin="miter" stroke-linecap="square"/>`).join(''), x, y, r, s);
  const plus = (x, y, s, c = OR_V) => place(`<path d="M0 -12 L0 12 M-12 0 L12 0" stroke="${INK}" stroke-width="10" stroke-linecap="round"/><path d="M0 -12 L0 12 M-12 0 L12 0" stroke="${c}" stroke-width="5" stroke-linecap="round"/>`, x, y, 0, s);
  const moins = (x, y, s, c = OR_V) => place(`<path d="M-12 0 L12 0" stroke="${INK}" stroke-width="10" stroke-linecap="round"/><path d="M-12 0 L12 0" stroke="${c}" stroke-width="5" stroke-linecap="round"/>`, x, y, 0, s);
  const coeur = (x, y, s) => place(deux([[0, 34], [-34, 2], [-34, -18], [-18, -30], [0, -18], [18, -30], [34, -18], [34, 2]], [[0, 34], [-34, 2], [-34, -18], [-18, -30], [0, -18]], RUBIS, RUBIS_S, 3.4)
    + poly([[-26, -14], [-18, -24], [-12, -16]], '#ffd2cc'), x, y, 0, s);
  const goutte = (x, y, s, p, r = 0) => place(deux([[0, -16], [10, 2], [8, 12], [0, 16], [-8, 12], [-10, 2]], [[0, -16], [0, 16], [-8, 12], [-10, 2]], p[1], p[2], 2.4 / Math.max(1, s * .6)) + poly([[-4, 0], [-1, -8], [-1, 4]], p[0]), x, y, r, s);
  const bille = (x, y, r, p) => place(poly(ngone(r, 12, 0), p[2]) + poly([[-r, 0], ...ngone(r, 12, 0).slice(6, 11), [0, 0]], p[1]) + poly([[-r * .62, -r * .2], [-r * .5, -r * .5], [-r * .2, -r * .62], [-r * .1, -r * .3]], p[0]) + poly([[-r * .5, -r * .5], [-r * .32, -r * .58], [-r * .38, -r * .38]], '#ffffff') + encre(ngone(r, 12, 0), 3), x, y);
  const soleil = (x, y, r, p, o = {}) => {
    const n = 16, a0 = o.demi ? Math.PI : 0, a1 = Math.PI * 2;
    const P0 = (a, rr) => [+(Math.cos(a) * rr).toFixed(2), +(Math.sin(a) * rr).toFixed(2)];
    const disque = o.demi ? Array.from({ length: 9 }, (_, j) => P0(a0 + j / 8 * Math.PI, r)) : ngone(r, n, 0);
    const gauche = o.demi ? Array.from({ length: 5 }, (_, j) => P0(Math.PI + j / 8 * Math.PI, r)).concat([[0, 0]]) : Array.from({ length: 9 }, (_, j) => P0(Math.PI / 2 + j / 8 * Math.PI, r));
    const nr = o.n || 12;
    const rays = Array.from({ length: nr }, (_, j) => { const a = a0 + (o.demi ? (j + .5) / nr * Math.PI : j / nr * Math.PI * 2); return rai(a, r + 4, r + (j % 2 ? o.court || 14 : o.long || 26), 5, o.cr || OR_C, 2); }).join('');
    return place(rays + poly(disque, p[1]) + poly(gauche, p[0]) + poly(o.demi ? [[-r * .4, 0], [0, -r * .4], [r * .4, 0]] : ngone(r * .45, 8, 0), '#ffffff', 'opacity=".85"') + encre(disque, 3), x, y);
  };
  const sol = (y = 150, c1 = PIERRE_C, c2 = PIERRE_S) => deux([[24, y], [176, y], [168, y + 24], [32, y + 24]], [[24, y], [176, y], [172, y + 8], [28, y + 8]], c1, c2, 3);
  const bez = (A, B, C, D, t) => { const u = 1 - t; return [u * u * u * A[0] + 3 * u * u * t * B[0] + 3 * u * t * t * C[0] + t * t * t * D[0], u * u * u * A[1] + 3 * u * u * t * B[1] + 3 * u * t * t * C[1] + t * t * t * D[1]]; };
  const ruban = (f, w, n = 28, t0 = 0, t1 = 1, k = .5) => {
    const H = [], S = [], M = [], G = [], r1 = v => +v.toFixed(1);
    for (let j = 0; j <= n; j++) {
      const t = t0 + (t1 - t0) * j / n, [x, y] = f(t), [xa, ya] = f(t - .002), [xb, yb] = f(t + .002);
      const l = Math.hypot(xb - xa, yb - ya) || 1, dx = (xb - xa) / l, dy = (yb - ya) / l, h = w(t) / 2, m = (k - .5) * 2 * h;
      H.push([r1(x + dy * h), r1(y - dx * h)]); S.push([r1(x - dy * h), r1(y + dx * h)]); M.push([r1(x + dy * m), r1(y - dx * m)]); G.push(Math.atan2(dy, dx) * 180 / Math.PI);
    }
    return { H, S, M, G, tour: H.concat(S.slice().reverse()) };
  };
  let nClip = 0;

  const main = (x, y, s, r = 0) => place(
    deux([[-50, 2], [-30, -2], [-24, -16], [-14, -18], [-12, -2], [14, 0], [30, -10], [42, -18], [50, -12], [40, 4], [26, 18], [2, 26], [-24, 24], [-50, 18]],
      [[-50, 2], [-30, -2], [-24, -16], [-14, -18], [-12, -2], [14, 0], [30, -10], [42, -18], [46, -14], [26, 8], [0, 12], [-28, 10], [-50, 10]], PEAU_C, PEAU_S, 3)
    + `<path d="M20 4 L36 -10 M12 10 L30 -2" stroke="${INK}" stroke-width="2" opacity=".55"/>`
    + deux([[-60, 0], [-48, 0], [-48, 20], [-60, 20]], [[-60, 0], [-48, 0], [-48, 10], [-60, 10]], OR_C, OR_S, 2.4) + croix(-54, 10, .6), x, y, r, s);

  function cage(p, o = {}) {
    const corps = [[-20, -28], [20, -28], [18, 16], [-18, 16]];
    const coeur = o.coeur || p[1];
    return [
      o.anse === false ? '' : trait('M-9 -38 Q0 -54 9 -38', OR_C, 3, 7.4),
      deux([[-12, -38], [12, -38], [22, -28], [-22, -28]], [[-12, -38], [0, -38], [0, -28], [-22, -28]], OR_C, OR_S, 2.6),
      poly([[-20, -28], [-8, -28], [-7, 16], [-18, 16]], VIT_CH), poly([[-8, -28], [8, -28], [7, 16], [-7, 16]], VIT_BL), poly([[8, -28], [20, -28], [18, 16], [7, 16]], VIT_FR),
      poly([[0, -24], [11, -6], [0, 12], [-11, -6]], coeur), poly([[0, -24], [0, 12], [-11, -6]], p[0]),
      poly([[0, -16], [6, -6], [0, 4], [-6, -6]], '#ffffff'),
      `<path d="M-19 -6 L-13 -16 L-8 -6 L-13 4 Z M19 -6 L13 -16 L8 -6 L13 4 Z" fill="none" stroke="${OR_S}" stroke-width="1.4" opacity=".7"/>`,
      `<path d="M-8 -28 L-7 16 M8 -28 L7 16" stroke="${INK}" stroke-width="4.6"/><path d="M-8 -28 L-7 16 M8 -28 L7 16" stroke="${OR_C}" stroke-width="2"/>`,
      encre(corps, 3),
      deux([[-22, 16], [22, 16], [0, 34]], [[-22, 16], [0, 16], [0, 34]], OR_C, OR_S, 2.6),
    ].join('');
  }
  const lanterne = (x, y, s, p, o = {}) => place((o.halo === false ? '' : halo(0, -6, 46, p[0], .55)) + cage(p, o), x, y, o.r || 0, s);

  function baton(p, o = {}) {
    const branches = (sx, c) => {
      const m = d => d.replace(/(-?\d+(\.\d+)?) (-?\d+(\.\d+)?)/g, (_, a, __, b) => `${sx * +a} ${b}`);
      return trait(m('M-30 -50 Q-44 -58 -50 -76'), c, 4.6, 9.4) + trait(m('M0 -6 Q-32 -22 -32 -60 Q-32 -92 -18 -114'), c, 6, 10.8);
    };
    return [
      o.halo === false ? '' : halo(0, -58, 52, p[0], .6),
      branches(-1, OR_M), branches(1, OR_C), `<path d="M-3 -9 Q-33.5 -24 -33.5 -60 Q-33.5 -88 -21 -108" fill="none" stroke="${OR_V}" stroke-width="1.8" stroke-linecap="round"/>`,
      place(cage(p, { anse: false, coeur: o.coeur }), 0, -54, 0, 1.08),
      deux([[-8, -10], [8, -10], [10, 2], [0, 12], [-10, 2]], [[-8, -10], [0, -10], [0, 12], [-10, 2]], MET_C, MET_S, 2.6), poly([[-1.4, -7], [1.4, -7], [0, 8]], p[1]),
      deux([[-8, 12], [8, 12], [8, 18], [-8, 18]], [[-8, 12], [0, 12], [0, 18], [-8, 18]], OR_C, OR_S, 2.4),
      deux([[-5, 18], [5, 18], [5, 84], [-5, 84]], [[-5, 18], [0, 18], [0, 84], [-5, 84]], IV_C, IV_S, 2.6),
      deux([[-5.5, 36], [5.5, 36], [5.5, 60], [-5.5, 60]], [[-5.5, 36], [0, 36], [0, 60], [-5.5, 60]], '#3b2f5c', NUIT, 2.4), croix(0, 44, .55), croix(0, 53, .55),
      deux([[-8, 32], [8, 32], [8, 37], [-8, 37]], [[-8, 32], [0, 32], [0, 37], [-8, 37]], OR_C, OR_S, 2.2), deux([[-8, 59], [8, 59], [8, 64], [-8, 64]], [[-8, 59], [0, 59], [0, 64], [-8, 64]], OR_C, OR_S, 2.2),
      deux([[-7, 82], [7, 82], [6, 90], [0, 96], [-6, 90]], [[-7, 82], [0, 82], [0, 96], [-6, 90]], MET_C, MET_S, 2.4),
    ].join('');
  }
  const B = (p, x, y, r, s, o) => place(baton(p, o), x, y, r, s);

  const NU = [[-40, 12], [-42, 0], [-32, -8], [-28, -20], [-14, -26], [-4, -20], [4, -32], [20, -30], [26, -18], [38, -16], [44, -2], [40, 12]];
  const nuage = (x, y, s, p) => place(deux(NU, NU.slice(0, 8).concat([[6, -8], [-20, 0], [-36, 6]]), p[0], p[1], 3), x, y, 0, s);
  const ecaille = (x, y, s, c1, c2, r = 0) => place(deux([[0, -40], [30, -28], [38, 2], [22, 30], [0, 44], [-22, 30], [-38, 2], [-30, -28]], [[0, -40], [0, 44], [-22, 30], [-38, 2], [-30, -28]], c1, c2, 3.4), x, y, r, s);
  const ECA = Array.from({ length: 9 }, (_, j) => [+(Math.cos(Math.PI + j / 8 * Math.PI) * 34).toFixed(2), +(Math.sin(Math.PI + j / 8 * Math.PI) * 30).toFixed(2)]).concat([[26, 22], [0, 46], [-26, 22]]);
  const plaque = (x, y, s, r = 0) => place(deux(ECA, ECA.slice(0, 5).concat([[0, 46], [-26, 22]]), OR_C, OR_S, 3.4)
    + `<path d="M${ECA.map(q => `${q[0] * .66} ${q[1] * .66 + 4}`).join(' L')} Z" fill="none" stroke="${OR_V}" stroke-width="2.4"/>` + poly([[-30, -14], [-16, -26], [-10, -20], [-22, -8]], OR_V), x, y, r, s);
  const bulle = (x, y, r, p) => place(poly(ngone(r), '#bfe6f7', 'opacity=".85"') + poly(ngone(r * .6), p[0], 'opacity=".8"') + poly([ngone(r)[4], ngone(r)[5], ngone(r)[6], [0, 0]], '#ffffff', 'opacity=".7"')
    + `<path d="M${ngone(r * .78).map(q => q.join(' ')).join(' L')} Z" fill="none" stroke="${OR_C}" stroke-width="2.4"/>` + encre(ngone(r), 3), x, y);
  const tuile = (x, y, w, h, c1, c2, iw = 2.6) => place(deux([[0, -h], [w, 0], [0, h], [-w, 0]], [[0, -h], [w, 0], [0, 0], [-w, 0]], c1, c2, iw), x, y);
  const pied = (x, y, s, c1 = '#c08a5e', c2 = '#7a5236') => place(deux([[-26, -40], [6, -40], [8, 4], [36, 14], [40, 34], [-30, 34], [-34, 10]], [[-26, -40], [6, -40], [8, 4], [-8, 8], [-30, 34], [-34, 10]], c1, c2, 3.4)
    + `<path d="M-34 24 L40 24" stroke="${INK}" stroke-width="2.4"/>`, x, y, 0, s);
  const silhouette = (x, y, s) => place(poly([[-16, 30], [-14, 10], [-6, 4], [6, 4], [14, 10], [16, 30]], NUIT) + poly(ngone(9, 8, .5), NUIT, 'transform="translate(0 -6)"')
    + `<path d="M-14 10 L-6 4 M6 4 L14 10" stroke="${OR_C}" stroke-width="2"/>` + encre([[-16, 30], [-14, 10], [-6, 4], [6, 4], [14, 10], [16, 30]], 2.4) + `<g transform="translate(0 -6)">${encre(ngone(9, 8, .5), 2.4)}</g>`, x, y, 0, s);
  const volute = (d, c, w = 7) => trait(d, c, w, w + 5);

  Object.assign(IconesV3.SUJETS, {
    lueur: p => halo(100, 84, 54, p[0], .6) + rayons(100, 84, 12, 26, 50, 4, p[1], .5)
      + place(poly(ngone(22), '#7fc6e8') + poly([[0, 22], ...ngone(22).slice(2, 7), [0, -22]], '#ffc870')
        + poly([[0, -14], [9, 0], [0, 14], [-9, 0]], '#ffffff') + encre(ngone(22), 3), 100, 84)
      + main(100, 132, 1.2) + eclat(48, 60, .7, p[1]) + eclat(156, 56, .6, '#bfe6f7'),
    lueur_de_rosee: p => halo(100, 80, 54, p[0], .6) + goutte(100, 78, 2.5, p) + poly([[100, 70], [106, 82], [100, 94], [94, 82]], '#ffffff')
      + main(100, 132, 1.2) + goutte(50, 72, .7, p) + goutte(154, 58, .55, p) + eclat(150, 96, .6, p[0]),
    rosee_vive: p => `<path d="M30 160 Q40 120 62 112" fill="none" stroke="${p[1]}" stroke-width="4" stroke-dasharray="8 7" stroke-linecap="round"/>`
      + bille(90, 98, 34, p) + `<path d="M90 64 L96 86 L84 100 L98 116 L92 132 M96 86 L120 92 M84 100 L58 96" fill="none" stroke="${INK}" stroke-width="3" stroke-linejoin="round"/><path d="M96 86 L84 100 L98 116" fill="none" stroke="#ffffff" stroke-width="1.2"/>`
      + [[146, 62, 30, .9], [156, 104, -20, 1.1], [138, 138, 60, .8], [128, 40, -40, .6]].map(([x, y, r, s]) => place(deux([[0, -12], [6, 2], [0, 10], [-5, 0]], [[0, -12], [0, 10], [-5, 0]], p[0], p[1], 2.2), x, y, r, s)).join('')
      + eclat(122, 74, 1, '#ffffff', p[0]),
    rai_de_nuee: p => poly([[94, 50], [112, 50], [124, 150], [82, 150]], p[0], 'opacity=".75"') + poly([[100, 50], [106, 50], [108, 150], [98, 150]], '#ffffff')
      + `<path d="M94 50 L82 150 M112 50 L124 150" stroke="${INK}" stroke-width="2.4"/>`
      + place(poly([[0, -16], [5, -5], [16, 0], [5, 5], [0, 12], [-5, 5], [-16, 0], [-5, -5]], p[1]) + encre([[0, -16], [5, -5], [16, 0], [5, 5], [0, 12], [-5, 5], [-16, 0], [-5, -5]], 2.4), 103, 152, 0, 1.4)
      + nuage(66, 64, .78, p) + nuage(142, 58, .7, p) + eclat(150, 120, .6, p[1]),
    trait_d_aurore: p => soleil(58, 148, 26, P.neutre, { demi: true, n: 6, long: 20, court: 12 }) + deux([[28, 150], [176, 150], [170, 160], [34, 160]], [[28, 150], [176, 150], [172, 154], [30, 154]], PIERRE_C, PIERRE_S, 2.6)
      + trait('M66 130 Q86 56 160 44', p[1], 14, 20) + `<path d="M66 130 Q86 56 160 44" fill="none" stroke="${OR_C}" stroke-width="6" stroke-linecap="round"/><path d="M70 120 Q90 60 156 46" fill="none" stroke="#ffffff" stroke-width="2.4" stroke-linecap="round"/>`
      + eclat(162, 44, 1.5, '#ffffff', OR_C) + chevrons(132, 118, .75, OR_C),
    eclat_d_or_ancien: p => [[60, 34, 22], [80, 24, 30], [140, 30, 24]].map(([x, y, l]) => trait(`M${x} ${y} L${x} ${y + l}`, p[1], 3, 7)).join('')
      + place(deux([[-40, -10], [-16, -40], [22, -38], [44, -6], [30, 30], [-10, 40], [-42, 18]], [[-40, -10], [-16, -40], [22, -38], [0, -4], [-10, 40], [-42, 18]], OR_C, OR_S, 3.6)
        + poly([[-16, -40], [22, -38], [0, -4]], OR_V) + poly([[0, -4], [44, -6], [30, 30]], '#7a4a26') + `<path d="M0 -4 L-10 40 M0 -4 L-40 -10" stroke="${INK}" stroke-width="2" opacity=".5"/>`, 100, 96, 0, 1.15)
      + roc(56, 150, .9, 20, PIERRE_C, PIERRE_S) + roc(148, 152, .8, -30, PIERRE_C, PIERRE_S) + eclat(150, 70, .7, p[0]) + `<path d="M64 156 L136 156" stroke="${INK}" stroke-width="5" stroke-linecap="round"/>`,
    ambre_fige: p => pied(96, 92, 1.2, '#8a5a3c', '#4e3022')
      + poly([[40, 150], [42, 118], [60, 104], [84, 112], [108, 100], [134, 110], [160, 112], [160, 150]], '#c4701e')
      + poly([[40, 150], [42, 118], [60, 104], [84, 112], [108, 100], [118, 150]], '#f3a53c') + poly([[42, 118], [60, 104], [84, 112], [108, 100], [96, 122], [56, 126]], '#ffd98f')
      + poly([[108, 100], [134, 110], [160, 112], [140, 124], [118, 150]], '#e0943c')
      + `<path d="M54 142 L64 124 M70 144 L76 132 M130 142 L140 124" stroke="#fff3d2" stroke-width="3" stroke-linecap="round" opacity=".9"/>` + encre([[40, 150], [42, 118], [60, 104], [84, 112], [108, 100], [134, 110], [160, 112], [160, 150]], 3.4)
      + place(deux([[0, -16], [10, 2], [8, 12], [0, 16], [-8, 12], [-10, 2]], [[0, -16], [0, 16], [-8, 12], [-10, 2]], '#ffd98f', '#e0943c', 2.4), 112, 34, 0, .9)
      + place(deux([[0, -16], [10, 2], [8, 12], [0, 16], [-8, 12], [-10, 2]], [[0, -16], [0, 16], [-8, 12], [-10, 2]], '#ffd98f', '#e0943c', 2.4), 150, 74, 0, .65) + eclat(52, 70, .6, p[1]),
    meche_lente: p => volute('M52 160 Q58 108 98 104 Q136 100 136 70', '#e9dcc4', 8) + `<path d="M52 160 Q58 108 98 104 Q136 100 136 70" fill="none" stroke="#8f7a66" stroke-width="8" stroke-dasharray="3 7"/>`
      + poly([[128, 74], [144, 74], [140, 64], [132, 64]], NUIT) + flamme(136, 40, .9, p)
      + [[80, 134], [104, 126]].map(([x, y]) => place(poly(ngone(6, 4, 0), p[1]) + encre(ngone(6, 4, 0), 2), x, y)).join('')
      + place(deux([[-12, -16], [12, -16], [2, 0], [12, 16], [-12, 16], [-2, 0]], [[-12, -16], [0, -16], [0, 16], [-12, 16], [-2, 0]], '#d8e8f2', '#8fa6bd', 2.4) + poly([[-6, 12], [6, 12], [2, 6], [-2, 6]], p[1]), 64, 62, 0, 1.1),
    flamme_vive: p => flamme(90, 86, 1.7, p) + `<path d="M92 32 L84 66 L96 92 L86 128" fill="none" stroke="${p[3]}" stroke-width="7" stroke-linejoin="round"/><path d="M92 32 L84 66 L96 92 L86 128" fill="none" stroke="${INK}" stroke-width="2" stroke-linejoin="round"/>`
      + trait('M130 104 Q168 132 140 160 Q118 176 96 160', OR_C, 4, 8.4) + place(poly([[0, -8], [12, 0], [0, 8]], OR_C) + encre([[0, -8], [12, 0], [0, 8]], 2.4), 92, 156, 200, 1)
      + coeur(72, 150, .5),
    souffle_partage: p => place(deux([[-15, 0], [15, 0], [15, 54], [-15, 54]], [[-15, 0], [0, 0], [0, 54], [-15, 54]], IV_C, IV_S, 3.2) + poly([[-15, 0], [-7, 0], [-7, 14], [-11, 19], [-15, 14]], '#ffffff')
        + `<path d="M0 0 L0 -9" stroke="${INK}" stroke-width="3.6" stroke-linecap="round"/>` + poly([[-1.6, -9], [1.6, -9], [0, -12]], '#ff7a2b'), 54, 108)
      + trait('M58 88 Q72 44 116 42 Q154 42 156 70 Q156 92 136 90 Q122 88 126 74', p[0], 7, 12.4)
      + trait('M66 96 Q88 66 120 66 Q138 68 140 80', p[0], 6, 11)
      + trait('M74 104 Q92 88 112 90', p[0], 5, 9.6)
      + `<path d="M64 80 Q76 50 112 48" fill="none" stroke="${p[2]}" stroke-width="2" stroke-linecap="round"/>`
      + coeur(132, 122, .62) + eclat(36, 60, .6, p[0]) + eclat(168, 112, .5, p[0]),
    lanterne_de_veille: p => place(poly(ngone(50, 12, 0, 14), p[1], 'opacity=".55"') + poly(ngone(34, 12, 0, 9), p[0], 'opacity=".8"') + `<path d="M${ngone(50, 12, 0, 14).map(q => q.join(' ')).join(' L')} Z" fill="none" stroke="${OR_C}" stroke-width="2.4"/>`, 100, 150)
      + lanterne(100, 102, 1.42, p) + plus(46, 84, .6) + plus(156, 92, .5) + eclat(148, 56, .6, '#ffffff', p[0]),
    cercle_de_veille: p => {
      const n = 10, R = 64, r = 46, ry = .38;
      const seg = Array.from({ length: n }, (_, j) => { const a = j / n * Math.PI * 2, b = (j + .86) / n * Math.PI * 2; const q = [[Math.cos(a) * R, Math.sin(a) * R * ry], [Math.cos(b) * R, Math.sin(b) * R * ry], [Math.cos(b) * r, Math.sin(b) * r * ry], [Math.cos(a) * r, Math.sin(a) * r * ry]]; return poly(q, j % 2 ? VIT_FR : OR_C) + encre(q, 2.4); }).join('');
      return place(poly(ngone(r, 16, 0, r * ry), p[0], 'opacity=".55"') + seg, 100, 132)
        + [[78, 104, .5], [122, 96, .6], [100, 78, .45]].map(([x, y, s]) => eclat(x, y, s, p[1], '#ffffff')).join('') + plus(100, 70, .9);
    },
    ardeur: p => croissant(104, 100, 66, -2.7, .2, p[1], p[0]) + flamme(150, 60, .45, p) + flamme(168, 98, .38, p)
      + B(p, 86, 114, 44, .68, { halo: false }) + chevrons(150, 146, .7, p[1], 20),
    ressac_d_aube: p => croissant(104, 100, 66, -2.7, .2, p[1], p[0]) + goutte(156, 58, .7, p) + goutte(172, 92, .55, p) + goutte(140, 36, .45, p)
      + B(p, 86, 114, 44, .68, { halo: false, coeur: p[1] }) + chevrons(150, 146, .7, p[0], 20),
    renaissance: p => halo(100, 66, 46, p[0], .5) + flamme(100, 64, 1.6, P.feu)
      + place(deux([[-22, 0], [22, 0], [22, 58], [-22, 58]], [[-22, 0], [0, 0], [0, 58], [-22, 58]], IV_C, IV_S, 3) + poly([[-22, 0], [-10, 0], [-10, 14], [-16, 20], [-22, 14]], '#ffffff') + poly([[8, 0], [22, 0], [22, 22], [15, 26], [12, 10]], '#fbf4e4'), 100, 104)
      + place(poly(ngone(15, 10, 0), RUBIS_S) + poly([...ngone(15, 10, 0).slice(5, 10), [0, 0]], RUBIS) + `<path d="M-6 -6 L6 6 M6 -6 L-6 6" stroke="#ffd2cc" stroke-width="2.6" stroke-linecap="round"/>` + encre(ngone(15, 10, 0), 2.6), 112, 136)
      + eclat(48, 64, .7, p[1]) + eclat(154, 56, .6, p[1]),
    premier_souffle: p => volute('M42 156 Q26 92 76 60 Q126 32 158 66 Q184 100 150 130 Q126 148 112 130', OR_C, 8) + `<path d="M76 60 Q126 32 158 66" fill="none" stroke="${OR_V}" stroke-width="2.4"/>`
      + coeur(100, 108, .95) + eclat(156, 40, .8, p[0], '#ffffff') + eclat(46, 100, .6, p[1]),
    manteau_partage: p => [[100, 48], [48, 100], [152, 100], [100, 152]].map(([x, y]) => bulle(x, y, 20, p)).join('') + `<path d="M100 70 L100 130 M70 100 L130 100" stroke="${OR_C}" stroke-width="2" stroke-dasharray="4 5"/>` + bulle(100, 100, 30, p) + eclat(100, 100, .9, '#ffffff', p[0]),
    ecaille_partagee: p => [[100, 40, 0], [44, 100, -90], [156, 100, 90], [100, 158, 180]].map(([x, y, r]) => ecaille(x, y, .32, OR_C, OR_S, r)).join('')
      + place(poly([[0, -40], [30, -28], [38, 2], [0, 4]], P.feu[1]) + poly([[0, -40], [-30, -28], [-38, 2], [0, 4]], P.terre[1]) + poly([[-38, 2], [-22, 30], [0, 44], [0, 4]], P.eau[1]) + poly([[38, 2], [22, 30], [0, 44], [0, 4]], P.air[1])
        + poly([[0, -40], [-30, -28], [-12, -8]], '#ffffff', 'opacity=".55"') + `<path d="M0 -40 L0 44 M-38 2 L38 2" stroke="${INK}" stroke-width="2.4"/>` + encre([[0, -40], [30, -28], [38, 2], [22, 30], [0, 44], [-22, 30], [-38, 2], [-30, -28]], 3.6), 100, 98, 0, 1.05),
    aube: p => soleil(100, 118, 44, p, { demi: true, n: 9, long: 34, court: 20 })
      + [[30, 118], [76, 118], [122, 118]].map(([x, y]) => deux([[x, y], [x + 46, y], [x + 46, y + 22], [x, y + 22]], [[x, y], [x + 46, y], [x + 42, y + 4], [x + 4, y + 4], [x + 4, y + 18], [x, y + 22]], PIERRE_C, PIERRE_S, 2.6)).join('')
      + [[52, 140], [100, 140], [146, 140]].map(([x, y]) => deux([[x - 22, y], [x + 22, y], [x + 22, y + 20], [x - 22, y + 20]], [[x - 22, y], [x + 22, y], [x + 18, y + 4], [x - 18, y + 4], [x - 18, y + 16], [x - 22, y + 20]], PIERRE_C, PIERRE_S, 2.6)).join('')
      + plus(40, 70, .55) + plus(160, 66, .55),
    couronne_de_lumiere: p => halo(100, 150, 40, p[0], .5) + tuile(100, 150, 46, 16, p[0], p[1])
      + `<path d="M84 90 L74 140 M116 90 L126 140" stroke="${p[0]}" stroke-width="3" stroke-dasharray="5 6"/>`
      + place(deux([[-44, 0], [44, 0], [40, 18], [-40, 18]], [[-44, 0], [0, 0], [0, 18], [-40, 18]], OR_C, OR_S, 3)
        + [[-44, -40], [-22, -50], [0, -60], [22, -50], [44, -40]].map(([x, y], j) => deux([[x - 9 + (j === 0 ? 4 : 0), 0], [x, y + 30], [x + 9 - (j === 4 ? 4 : 0), 0]], [[x - 9 + (j === 0 ? 4 : 0), 0], [x, y + 30], [x, 0]], OR_V, OR_C, 2.6) + eclat(x, y + 22, .55, '#ffffff', p[0])).join('')
        + [[-24, 9], [0, 9], [24, 9]].map(([x, y]) => place(poly(ngone(5, 4, 0), '#209fec') + poly([[0, -5], [5, 0], [0, 0]], '#e6fbff') + encre(ngone(5, 4, 0), 1.8), x, y)).join(''), 100, 84),
    eclair_solaire: p => {
      const vive = ['#ffffff', '#fff3c0', '#ffc247', '#4a1208'];
      return roc(50, 150, 1.8, 10, PIERRE_C, PIERRE_S) + roc(80, 164, 1.3, -40, PIERRE_C, PIERRE_S) + eclat(70, 134, 1, p[1], '#ffffff')
        + `<path d="M78 124 Q88 108 98 102" fill="none" stroke="${p[0]}" stroke-width="3.4" stroke-dasharray="5 6" stroke-linecap="round"/>`
        + `<path d="M84 76 L62 88 M92 94 L72 108" stroke="${p[0]}" stroke-width="3" stroke-linecap="round" opacity=".8"/>`
        + place(flamme(0, 0, 1.55, vive), 122, 80, 40) + eclat(160, 132, .5, p[0]) + eclat(56, 68, .45, p[0]);
    },
    perle_de_rosee: p => place(deux([[-62, 30], [-30, -8], [10, -26], [56, -30], [40, 4], [4, 26], [-40, 36]], [[-62, 30], [-30, -8], [10, -26], [56, -30], [-6, 8]], FEUILLE, FEUILLE_S, 3.4)
        + `<path d="M-62 30 L-6 8 L56 -30 M-30 8 L-22 -6 M2 0 L8 -16" stroke="${INK}" stroke-width="2" fill="none" opacity=".6"/>`, 96, 126, 0, 1.1)
      + bille(108, 96, 26, p) + eclat(124, 80, .7, '#ffffff', p[0]) + eclat(54, 60, .6, p[1]) + eclat(156, 56, .5, p[1]),
    souffle_de_ruhani: p => `<path d="M${ngone(56, 24, 0).map(q => `${100 + q[0]} ${102 + q[1]}`).join(' L')} Z" fill="none" stroke="${p[1]}" stroke-width="5" opacity=".7"/>`
      + soleil(100, 102, 24, P.neutre, { n: 8, long: 16, court: 10 })
      + Array.from({ length: 6 }, (_, k) => { const a = (k / 6) * Math.PI * 2 - Math.PI / 2, x = 100 + Math.cos(a) * 58, y = 102 + Math.sin(a) * 58; return k % 2 ? coeur(x, y, .36) : flamme(x, y, .52, p); }).join(''),
    boucle_du_dragon: p => {
      const A = [38, 140], B1 = [46, 54], C1 = [138, 40], D = [164, 140], f = t => bez(A, B1, C1, D, t);
      const R = ruban(f, t => 26 + 6 * Math.sin(Math.PI * t), 26, 0, 1, .34), dos = R.H, mil = R.M, ven = R.S;
      const crete = dos.map((q, i) => i % 3 === 2 && i < 25 ? place(deux([[-7, 1], [-13, -19], [7, 1]], [[-7, 1], [-13, -19], [-2, 1]], OR_C, OR_S, 2.4), q[0], q[1], R.G[i], .9 + .35 * Math.sin(Math.PI * i / 26)) : '').join('');
      const ecailles = mil.map((q, i) => i % 2 && i > 1 && i < 25 ? place(`<path d="M-5 -5 L1 1 L-5 7" fill="none" stroke="${OR_S}" stroke-width="2.4" stroke-linejoin="round"/>`, (q[0] + dos[i][0]) / 2, (q[1] + dos[i][1]) / 2, R.G[i], 1) : '').join('');
      const plaques = mil.map((q, i) => i % 2 ? '' : `<path d="M${q.join(' ')} L${ven[i].join(' ')}" stroke="${INK}" stroke-width="1.8" opacity=".6"/>`).join('');
      const ombre = dos.slice(14).concat(ven.slice(14).reverse());
      return [68, 100, 132].map(x => tuile(x, 158, 15, 6, p[0], p[1], 2.2)).join('') + eclat(100, 132, .8, '#ffffff', p[0])
        + crete + poly(dos.concat(mil.slice().reverse()), OR_M) + poly(mil.concat(ven.slice().reverse()), IV_C) + poly(ombre, OR_S, 'opacity=".3"') + ecailles + plaques
        + `<path d="M${dos.slice(1, 14).map(q => `${q[0] + 1.5} ${q[1] + 2.5}`).join(' L')}" fill="none" stroke="${OR_V}" stroke-width="2.2" stroke-linecap="round"/>`
        + `<path d="M${mil.map(q => q.join(' ')).join(' L')}" fill="none" stroke="${OR_S}" stroke-width="1.6"/>` + encre(R.tour, 3.4)
        + nuage(46, 142, .76, p) + nuage(156, 140, .76, p) + eclat(152, 56, .6, '#ffffff', p[0]);
    },
    lumiere_aveuglante: p => rayons(122, 78, 10, 38, 62, 6, p[0], .5) + B(p, 104, 112, 30, .74) + eclat(160, 112, .6, p[1]),
    eblouissement: p => place(deux([[-50, 0], [-26, -20], [0, -26], [26, -20], [50, 0], [26, 18], [0, 24], [-26, 18]], [[-50, 0], [-26, -20], [0, -26], [26, -20], [50, 0]], PIERRE_C, '#d9c4a6', 3.4)
        + poly(ngone(16, 10, 0), p[2]) + poly([...ngone(16, 10, 0).slice(5, 10), [0, 0]], p[1]) + poly([[0, -10], [3, 0], [0, 10], [-3, 0]], INK)
        + deux([[-52, -2], [-26, -12], [0, -14], [26, -12], [52, -2], [26, -24], [0, -30], [-26, -24]], [[-52, -2], [-26, -24], [0, -30], [26, -24], [52, -2], [26, -12], [0, -14], [-26, -12]], PEAU_C, PEAU_S, 3)
        + `<path d="M-40 14 L-46 24 M-20 22 L-22 32 M20 22 L22 32 M40 14 L46 24" stroke="${INK}" stroke-width="3" stroke-linecap="round"/>`, 92, 116, 0, 1.15)
      + eclat(136, 62, 3.4, p[1], '#ffffff') + rayons(136, 62, 8, 12, 50, 3, '#ffffff', .5, 1.6),
    flamme_confiee: p => lanterne(62, 110, 1.05, p, { halo: false }) + lanterne(142, 116, .9, p, { halo: false, coeur: OR_C })
      + trait('M68 66 Q100 26 136 76', OR_C, 4, 8.4, 'stroke-dasharray="1 0"') + flamme(100, 46, .55, P.feu) + halo(62, 104, 36, p[0], .45) + eclat(170, 64, .6, p[1]),
    pas_de_lumiere: p => halo(100, 128, 60, p[0], .4) + tuile(76, 158, 34, 12, p[0], p[1]) + tuile(110, 128, 27, 10, p[0], p[1]) + tuile(88, 102, 21, 8, p[0], p[1]) + tuile(112, 82, 16, 6, p[0], p[1])
      + chevrons(112, 50, .75, OR_C, -90) + eclat(46, 104, .6, p[1]) + eclat(154, 104, .6, p[1]),
    geode_brisee: p => [0, 90, 180, 270].map(a => place(deux([[0, -14], [7, -2], [5, 14], [-5, 14], [-7, -2]], [[0, -14], [0, 14], [-5, 14], [-7, -2]], p[0], p[1], 2.4), 100 + Math.sin(a * Math.PI / 180) * 64, 102 - Math.cos(a * Math.PI / 180) * 64, a, 1.2)).join('')
      + place(deux(ngone(38, 9, .1), [...ngone(38, 9, .1).slice(3, 8), [0, 0]], PIERRE_C, PIERRE_S, 3.6) + poly(ngone(26, 9, .3), p[3])
        + Array.from({ length: 7 }, (_, k) => { const a = k / 7 * Math.PI * 2; return place(deux([[-5, 0], [0, -16], [5, 0]], [[-5, 0], [0, -16], [0, 0]], p[0], p[1], 1.8), Math.cos(a) * 20, Math.sin(a) * 20, a * 180 / Math.PI - 90, 1); }).join('')
        + eclat(0, 0, 1.2, '#ffffff', p[0]), 100, 102),
    onde_d_aube: p => place(poly(ngone(42, 16, 0, 18), p[2]) + poly(ngone(28, 16, 0, 12), p[1]) + poly(ngone(14, 16, 0, 6), p[0]) + encre(ngone(42, 16, 0, 18), 3), 100, 112)
      + [45, 135, 225, 315].map(a => place(deux([[-8, 0], [0, -30], [8, 0], [0, 6]], [[-8, 0], [0, -30], [0, 6]], '#ffffff', p[1], 2.6), 100 + Math.sin(a * Math.PI / 180) * 58, 108 - Math.cos(a * Math.PI / 180) * 50, a, 1)).join('')
      + goutte(100, 64, .9, p) + eclat(100, 112, .7, '#ffffff', p[0]),
    plein_midi: p => soleil(140, 56, 24, p, { n: 12, long: 20, court: 12 }) + B(p, 84, 124, -8, .68) + plus(146, 126, .7),
    voile_du_soir: p => soleil(100, 150, 40, P.feu, { demi: true, n: 7, long: 24, court: 14 })
      + deux([[40, 34], [160, 34], [158, 120], [146, 132], [130, 118], [116, 138], [100, 120], [84, 140], [70, 118], [54, 134], [42, 120]], [[40, 34], [100, 34], [100, 120], [84, 140], [70, 118], [54, 134], [42, 120]], '#3e4a6e', '#27344c', 3.4)
      + `<path d="M70 40 L70 116 M100 40 L100 118 M130 40 L130 116" stroke="${INK}" stroke-width="2" opacity=".5"/><path d="M40 34 L160 34" stroke="${OR_C}" stroke-width="4"/>`
      + eclat(64, 70, .7, AMETHYSTE, '#e6d4ff') + eclat(136, 88, .55, AMETHYSTE, '#e6d4ff') + eclat(112, 56, .4, AMETHYSTE, '#e6d4ff'),
    plume_d_aube: p => sol(146) + `<path d="M86 148 L70 164 M86 148 L106 166 M86 148 L60 152" stroke="${INK}" stroke-width="2.6"/>`
      + deux([[170, 28], [106, 124], [84, 150], [92, 108]], [[170, 28], [92, 108], [84, 150]], OR_V, OR_C, 3.2) + `<path d="M166 34 L90 140" stroke="${OR_S}" stroke-width="1.6"/>`
      + [[136, 72], [118, 94]].map(([x, y]) => `<path d="M${x} ${y} l14 -2 M${x} ${y} l-2 14" stroke="${p[0]}" stroke-width="3.4" stroke-linecap="round"/>`).join('')
      + eclat(166, 30, 1.1, '#ffffff', p[0]) + roc(110, 140, .7, 30, PIERRE_C, PIERRE_S) + roc(62, 140, .6, -20, PIERRE_C, PIERRE_S),
    grains_d_or: p => main(78, 136, .84, -36)
      + [[120, 90, 1.6, 0], [144, 70, 1.9, 1], [124, 54, 1.4, 2], [156, 100, 1.5, 3], [102, 70, 1.15, 4], [160, 44, 1.1, 5]].map(([x, y, s, j]) =>
        `<path d="M${x - 9 * s} ${y + 7 * s} L${x - 22 * s} ${y + 17 * s}" stroke="${p[0]}" stroke-width="${2.4 * s}" stroke-linecap="round" opacity=".75"/>`
        + place(deux([[-7, -5], [2, -8], [8, -1], [4, 7], [-6, 5]], [[-7, -5], [2, -8], [1, 0], [-6, 5]], OR_V, OR_M, 2.4 / Math.max(1, s * .8)) + poly([[1, 0], [8, -1], [4, 7]], OR_S), x, y, j * 47, s)).join('')
      + eclat(52, 70, .6, p[1]) + eclat(170, 126, .5, OR_C),
    larme_de_ruhani: p => goutte(100, 68, 2.6, p) + poly([[94, 64], [100, 50], [100, 74]], '#ffffff', 'opacity=".8"')
      + place(poly(ngone(48, 16, 0, 12), p[2]) + poly(ngone(32, 16, 0, 8), p[1]) + encre(ngone(48, 16, 0, 12), 3)
        + [[-40, -4, -40], [-22, -14, -16], [0, -18, 0], [22, -14, 16], [40, -4, 40]].map(([x, y, r]) => place(deux([[-5, 0], [0, -18], [5, 0]], [[-5, 0], [0, -18], [0, 0]], p[0], p[1], 2), x, y, r, 1)).join(''), 100, 146)
      + coeur(160, 116, .32) + eclat(40, 116, .7, p[1]),
    sable_d_aube: p => soleil(100, 44, 18, P.neutre, { n: 8, long: 12, court: 8 }) + poly([[94, 62], [106, 62], [138, 140], [62, 140]], OR_C, 'opacity=".45"')
      + Array.from({ length: 22 }, (_, j) => { const t = (j * 7 % 22) / 22, y = 66 + t * 76, w = 4 + t * 34, x = 100 + ((j * 13) % 11 - 5) / 5 * w; return poly([[x - 2.4, y], [x, y - 2.4], [x + 2.4, y], [x, y + 2.4]], j % 2 ? OR_S : '#fff3c0'); }).join('')
      + deux([[40, 160], [74, 132], [100, 126], [128, 132], [160, 160]], [[40, 160], [74, 132], [100, 126], [96, 160]], OR_C, OR_S, 3)
      + coeur(156, 92, .34) + eclat(48, 100, .6, p[1]),
    ecaille_d_or: p => {
      const id = `oriel-ecaille-${++nClip}`;
      const buste = deux([[22, 200], [30, 150], [52, 128], [80, 118], [120, 118], [148, 128], [170, 150], [178, 200]], [[22, 200], [30, 150], [52, 128], [80, 118], [100, 118], [100, 200]], '#4a3d6e', NUIT, 3.4);
      const tete = place(deux(ngone(21, 8, .5), [...ngone(21, 8, .5).slice(2, 7), [0, 0]], '#4a3d6e', NUIT, 3.2), 100, 74) + deux([[-9, 92], [9, 92], [11, 120], [-11, 120]].map(([x, y]) => [x + 100, y]), [[91, 92], [100, 92], [100, 120], [89, 120]], '#4a3d6e', NUIT, 3);
      return halo(100, 100, 62, p[0], .3) + `<clipPath id="${id}"><circle cx="100" cy="100" r="77"/></clipPath><g clip-path="url(#${id})">${tete}${buste}</g>`
        + plaque(100, 124, 1.12) + croix(100, 114, .95) + croix(100, 136, .95)
        + eclat(146, 58, .9, '#ffffff', p[0]) + eclat(56, 96, .6, p[0]);
    },
    clarte_offerte: p => poly([[62, 96], [160, 30], [178, 140]], p[0], 'opacity=".5"') + poly([[62, 96], [158, 60], [168, 124]], '#ffffff', 'opacity=".5"')
      + lanterne(60, 100, 1.02, p, { r: -60 }) + place(epeeC(p, { chaud: true }), 136, 118, 18, .66) + eclat(160, 70, .9, '#ffffff', p[0]) + eclat(110, 66, .5, '#ffffff', p[0]) + plus(160, 148, .55),
    poids_du_jour: p => sol(150) + place(deux([[-34, -34], [34, -34], [46, 30], [-46, 30]], [[-34, -34], [0, -34], [0, 30], [-46, 30]], PIERRE_C, PIERRE_S, 3.6)
        + deux([[-12, -44], [12, -44], [16, -34], [-16, -34]], [[-12, -44], [0, -44], [0, -34], [-16, -34]], OR_C, OR_S, 2.4), 100, 112)
      + soleil(100, 108, 14, P.neutre, { n: 8, long: 9, court: 6 }) + `<path d="M48 160 L62 152 L58 168 M152 160 L138 152 L142 168" stroke="${INK}" stroke-width="2.6" fill="none"/>`
      + chevrons(36, 92, .55, p[1], 90) + chevrons(164, 92, .55, p[1], 90),
    rafale_doree: p => volute('M40 140 Q30 70 90 56 Q140 46 146 86 Q148 116 116 116 Q92 114 96 92 Q100 76 116 80', p[1], 9) + `<path d="M40 140 Q30 70 90 56 Q140 46 146 86" fill="none" stroke="${p[0]}" stroke-width="3"/>`
      + [[60, 80], [80, 64], [126, 62], [140, 96], [70, 120], [104, 100], [52, 104]].map(([x, y], j) => place(poly(ngone(4 + j % 3, 4, 0), OR_C) + encre(ngone(4 + j % 3, 4, 0), 1.6), x, y)).join('')
      + chevrons(146, 146, .8, OR_C, 0),
    reveil_de_l_aube: p => soleil(100, 76, 32, p, { n: 12, long: 28, court: 16 }) + chevrons(100, 148, 1, OR_C, -90) + eclat(44, 120, .8, '#ffffff', p[0]) + eclat(156, 120, .8, '#ffffff', p[0]),
    lever_du_jour: p => soleil(100, 128, 42, p, { demi: true, n: 9, long: 30, court: 18 }) + deux([[24, 128], [176, 128], [164, 156], [130, 172], [70, 172], [36, 156]], [[24, 128], [176, 128], [172, 136], [28, 136]], PIERRE_S, '#5e4c40', 3)
      + silhouette(62, 132, 1.05) + silhouette(100, 138, 1.2) + silhouette(138, 132, 1.05),
    rappel: p => place(deux([[-46, -8], [30, -8], [56, -24], [48, -6], [28, 14], [-30, 14], [-50, 4]], [[-46, -8], [30, -8], [56, -24], [44, -12], [-48, -2]], OR_C, OR_S, 3.4) + deux([[-14, -16], [14, -16], [18, -8], [-18, -8]], [[-14, -16], [0, -16], [0, -8], [-18, -8]], OR_V, OR_C, 2.4)
        + `<path d="M-60 -2 Q-70 6 -60 14 Q-54 18 -48 8" fill="none" stroke="${INK}" stroke-width="7"/><path d="M-60 -2 Q-70 6 -60 14 Q-54 18 -48 8" fill="none" stroke="${OR_S}" stroke-width="3"/>`, 96, 140)
      + flamme(152, 92, 1.05, P.neutre)
      + volute('M92 124 Q72 104 90 88 Q106 74 88 58', '#4b4258', 7) + volute('M70 124 Q52 108 60 92', '#4b4258', 5) + volute('M112 122 Q124 104 112 90', '#4b4258', 5)
      + eclat(40, 48, .6, OR_C) + eclat(132, 40, .6, OR_C) + eclat(74, 38, .45, OR_C),
    lavis_d_aube: p => {
      const F = [[-38, 50], [-38, -16], [-26, -40], [0, -52], [26, -40], [38, -16], [38, 50]];
      return place(poly(F, VIT_FR) + poly([[-38, 50], [-38, -16], [-26, -40], [0, -52], [0, 50]], VIT_CH)
        + poly([[-38, 6], [0, 6], [0, 50], [-38, 50]], '#fff3d2') + poly([[0, -52], [26, -40], [38, -16], [38, 6], [0, 6]], VIT_BL)
        + poly([[12, 22], [26, 16], [30, 34], [16, 40]], '#3e3550', 'opacity=".7"') + poly([[-30, -14], [-18, -20], [-16, -6], [-28, -2]], '#3e3550', 'opacity=".4"')
        + `<path d="M0 -52 L0 50 M-38 6 L38 6" stroke="${INK}" stroke-width="6"/><path d="M0 -52 L0 50 M-38 6 L38 6" stroke="${OR_C}" stroke-width="2.6"/>`
        + encre(F, 4) + `<path d="${'M' + F.map(q => q.join(' ')).join(' L')}" fill="none" stroke="${OR_C}" stroke-width="2" transform="scale(.9)"/>`, 100, 100, 0, 1.2)
        + [[60, 44], [86, 36], [112, 46], [140, 34], [74, 74], [128, 70]].map(([x, y]) => `<path d="M${x} ${y} l-10 30" stroke="${INK}" stroke-width="6" stroke-linecap="round"/><path d="M${x} ${y} l-10 30" stroke="${p[0]}" stroke-width="2.6" stroke-linecap="round"/>`).join('')
        + plus(156, 150, .5) + eclat(46, 140, .6, p[1]);
    },
  });
  IconesV3.outilsDe = Object.assign(IconesV3.outilsDe || {}, { oriel: { poly, encre, place, croix, eclat, roc, croissant, flamme, epeeC, P, INK, OR_C, IV_C, MET_C, NUIT, VIT_CH, PEAU_C, PIERRE_C, RUBIS, deux, trait, ngone, rai, rayons, halo, chevrons, plus, moins, coeur, goutte, bille, soleil, sol, bez, ruban, nClip, main, lanterne, B, NU, nuage, ecaille, ECA, plaque, bulle, tuile, pied, silhouette, volute, cage, baton } });
})();

IconesV3.TYPES = Object.assign(IconesV3.TYPES || {}, {eblouissement:'degats',voile_du_soir:'degats'});
