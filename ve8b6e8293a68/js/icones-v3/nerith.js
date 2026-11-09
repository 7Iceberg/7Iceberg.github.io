(() => {
  const { poly, encre, place, croix, eclat, roc, croissant, flamme } = IconesV3.outils;
  const { P, INK } = IconesV3;
  const OR_C = '#ffd98f', OR_S = '#a8683a', OR_V = '#fff3d2';
  const AM = ['#e8d4ff', '#9764d6', '#734fb3', '#3e207f'];
  const NUIT = ['#6f80aa', '#3e4a6e', '#27344c', '#0f1728'];
  const CUIR = ['#e8c79a', '#c99a6a', '#7a5236'];
  const PIERRE = ['#efe2c8', '#a8937d', '#5a4a3c'];
  const VERT = ['#f2ffcf', '#80d697', '#4a9a3e'];

  const deux = (pts, cut, c1, c2, w = 3) => poly(pts, c2) + poly(cut, c1) + encre(pts, w);
  const trait = (d, c, w, iw = w + 4.4) => `<path d="${d}" fill="none" stroke="${INK}" stroke-width="${iw}" stroke-linecap="round" stroke-linejoin="round"/><path d="${d}" fill="none" stroke="${c}" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round"/>`;
  const rond = (n, r, ry = r, a0 = 0) => Array.from({ length: n }, (_, k) => { const a = a0 + k / n * Math.PI * 2; return [+(Math.cos(a) * r).toFixed(1), +(Math.sin(a) * ry).toFixed(1)]; });
  const gemme = (x, y, r, c = AM) => place(poly([[0, -r], [r, 0], [0, r], [-r, 0]], c[1]) + poly([[0, -r], [r, 0], [0, 0]], c[0]) + poly([[0, r], [-r, 0], [0, 0]], c[3]) + encre([[0, -r], [r, 0], [0, r], [-r, 0]], 2.2), x, y);
  const ame = (x, y, s) => eclat(x, y, s, AM[1], AM[0]);

  function dague(o = {}) {
    const L = o.lame || ['#c8d4ec', '#6f80aa', '#3e4a6e'];
    const F = o.fente || AM;
    const out = [[-9, 0], [-12, -36], [-9, -66], [0, -90], [16, -112], [13, -84], [12, -54], [11, -26], [9, 0]];
    return [
      poly(out, L[2]),
      poly([[-9, 0], [-12, -36], [-9, -66], [0, -90], [16, -112], [3, -68], [0, -36], [0, 0]], L[1]),
      poly([[-9, 0], [-12, -36], [-9, -66], [0, -90], [16, -112], [-2, -84], [-6, -64], [-8, -36], [-5, 0]], L[0]),
      o.strates || '',
      poly([[0, -8], [-2.8, -40], [1, -72], [4.4, -66], [2.8, -38]], F[1]),
      `<path d="M-0.4 -12 L-1.4 -40 L1.6 -62" fill="none" stroke="${F[0]}" stroke-width="1.3"/>`,
      encre(out, 3.2),
      deux([[-28, -18], [-22, -4], [-10, 4], [0, 6], [10, 4], [22, -4], [28, -18], [18, -8], [8, -3], [0, -2], [-8, -3], [-18, -8]],
        [[-28, -18], [-22, -4], [-10, 4], [0, 6], [0, -2], [-8, -3], [-18, -8]], OR_C, OR_S, 2.8),
      deux([[-7, -2], [0, -14], [7, -2], [0, 3]], [[-7, -2], [0, -14], [0, 3]], OR_V, OR_S, 2.2),
      deux([[-5, 6], [5, 6], [5.5, 32], [-5.5, 32]], [[-5, 6], [0, 6], [0, 32], [-5.5, 32]], AM[2], AM[3], 2.4),
      `<path d="M-5 13 L5 17 M-5 21 L5 25" stroke="${INK}" stroke-width="1.6"/>`,
      deux([[-8, 32], [8, 32], [6, 38], [-6, 38]], [[-8, 32], [0, 32], [0, 38], [-6, 38]], OR_C, OR_S, 2.2),
      gemme(0, 45, 7.5),
    ].join('');
  }
  const D = (x, y, r, s, o) => place(dague(o), x, y, r, s);
  const CHAUD = { lame: ['#fff3c0', '#ffb347', '#d9452b'], fente: ['#fff3c0', '#ef5a2a', '#7a1e0e', '#4a1208'] };
  const SUIE = { lame: ['#4a4458', '#2b2238', '#14101c'], fente: ['#ffb347', '#a8322a', '#5c1608', '#2a0a04'] };
  const SCHISTE = { lame: PIERRE, fente: ['#f2ffcf', '#4a9a3e', '#173a20', '#0b1d10'],
    strates: `<path d="M-11 -20 L11 -24 M-11 -46 L12 -50 M-8 -72 L11 -76 M-2 -92 L12 -96" stroke="${INK}" stroke-width="1.8" opacity=".55"/>` };

  const flaque = (x, y, s, c, bord = c[0]) => place(
    poly([[-50, 0], [-36, -12], [0, -16], [36, -12], [50, 0], [36, 12], [0, 16], [-36, 12]], c[2])
    + poly([[-50, 0], [-36, -12], [0, -16], [36, -12], [50, 0], [30, -4], [0, -8], [-30, -4]], c[1])
    + `<path d="M-42 6 L-30 11 L0 14 L26 11" fill="none" stroke="${bord}" stroke-width="2"/>`
    + encre([[-50, 0], [-36, -12], [0, -16], [36, -12], [50, 0], [36, 12], [0, 16], [-36, 12]], 3), x, y, 0, s);
  const ombre = (x, y, s) => flaque(x, y, s, [AM[1], NUIT[2], NUIT[3]], AM[1]);
  const lèvreFond = (x, y, s) => place(poly([[-52, 0], [-36, -13], [0, -18], [36, -13], [52, 0]], NUIT[3]) + poly([[-40, -4], [-26, -10], [0, -13], [26, -10], [40, -4], [0, -6]], NUIT[2]) + `<path d="M-52 0 L-36 -13 L0 -18 L36 -13 L52 0" fill="none" stroke="${INK}" stroke-width="3"/>`, x, y, 0, s);
  const lèvreAvant = (x, y, s) => place(poly([[-52, 0], [-36, 13], [0, 18], [36, 13], [52, 0], [0, 4]], NUIT[2]) + `<path d="M-46 4 L-32 10 L0 13 L30 10" fill="none" stroke="${AM[1]}" stroke-width="2.4"/>` + `<path d="M-52 0 L-36 13 L0 18 L36 13 L52 0" fill="none" stroke="${INK}" stroke-width="3"/>`, x, y, 0, s);
  const nuage = (x, y, s, c1, c2, r = 0) => {
    const B = [[-15, 4, 9], [14, 4, 9], [-5, -4, 12], [7, -7, 10]];
    const o = (cx, cy, R) => rond(12, R, R, Math.PI / 12).map(([a, b]) => [a + cx, b + cy]);
    return place(B.map(b => poly(o(...b), INK, `stroke="${INK}" stroke-width="5" stroke-linejoin="round"`)).join('')
      + B.map(b => poly(o(...b), c2)).join('') + poly([[-23, 8], [23, 8], [21, 12], [-21, 12]], c2)
      + B.map(([cx, cy, R]) => poly(o(cx, cy, R).slice(6, 11).concat([[cx + R * .2, cy + R * .1]]), c1)).join(''), x, y, r, s);
  };
  const main = (x, y, s, r = 0, l = 1) => {
    const doigts = [[-13, 20], [-4.5, 26], [4.5, 24], [13, 18]].map(([dx, h]) => {
      const H = h * l, pts = [[dx - 4, -4], [dx - 4, -4 - H], [dx, -8 - H], [dx + 4, -4 - H], [dx + 4, -4]];
      return deux(pts, [[dx - 4, -4], [dx - 4, -4 - H], [dx, -8 - H], [dx, -4]], CUIR[1], CUIR[2], 2.4);
    }).join('');
    return place(doigts
      + deux([[-19, -6], [19, -6], [20, 14], [12, 28], [-12, 28], [-20, 14]], [[-19, -6], [0, -6], [0, 28], [-12, 28], [-20, 14]], CUIR[1], CUIR[2], 2.8)
      + deux([[-18, 8], [-32, -6], [-29, -13], [-14, -4]], [[-18, 8], [-32, -6], [-29, -13]], CUIR[0], CUIR[2], 2.4)
      + deux([[-13, 28], [13, 28], [14, 40], [-14, 40]], [[-13, 28], [0, 28], [0, 40], [-14, 40]], NUIT[1], NUIT[2], 2.6) + croix(0, 34, .6), x, y, r, s);
  };
  const poing = (x, y, s, r = 0) => place(
    deux([[-22, -14], [22, -14], [26, 6], [16, 26], [-16, 26], [-26, 6]], [[-22, -14], [0, -14], [0, 26], [-16, 26], [-26, 6]], CUIR[1], CUIR[2], 3)
    + `<path d="M-11 -14 L-11 4 M0 -14 L0 4 M11 -14 L11 4" stroke="${INK}" stroke-width="2.4"/>`
    + deux([[-26, 6], [-6, 2], [2, 10], [-18, 16]], [[-26, 6], [-6, 2], [-10, 10]], CUIR[0], CUIR[1], 2.4)
    + deux([[-16, 26], [16, 26], [16, 40], [-16, 40]], [[-16, 26], [0, 26], [0, 40], [-16, 40]], NUIT[1], NUIT[2], 2.6) + croix(0, 33, .6), x, y, r, s);
  const PA = (x, y, s, r = 0) => place(deux([[0, -14], [12, -7], [12, 7], [0, 14], [-12, 7], [-12, -7]], [[0, -14], [0, 14], [-12, 7], [-12, -7]], OR_C, OR_S, 2.6)
    + `<circle r="4.4" fill="${OR_V}" stroke="${INK}" stroke-width="2"/>`, x, y, r, s);
  const PM = (x, y, s, r = 0) => place(deux([[-15, -13], [0, -13], [13, 0], [0, 13], [-15, 13], [-2, 0]], [[-15, -13], [0, -13], [13, 0], [-2, 0]], VERT[0], VERT[1], 2.6)
    + poly([[-2, 0], [13, 0], [0, 13], [-15, 13]], VERT[2]) + encre([[-15, -13], [0, -13], [13, 0], [0, 13], [-15, 13], [-2, 0]], 2.6), x, y, r, s);
  const moins = (x, y, s = 1, c = '#ef7574') => trait(`M${x - 9 * s} ${y} L${x + 9 * s} ${y}`, c, 4.4 * s, 9 * s);
  const plus = (x, y, s = 1, c = OR_V) => trait(`M${x - 9 * s} ${y} L${x + 9 * s} ${y} M${x} ${y - 9 * s} L${x} ${y + 9 * s}`, c, 4.4 * s, 9 * s);
  const chevrons = (x, y, s, c, r = 0) => place([0, 18].map(dx => `<path d="M${dx - 10} -16 L${dx + 6} 0 L${dx - 10} 16" fill="none" stroke="${INK}" stroke-width="10" stroke-linejoin="miter" stroke-linecap="square"/><path d="M${dx - 10} -16 L${dx + 6} 0 L${dx - 10} 16" fill="none" stroke="${c}" stroke-width="5.4" stroke-linejoin="miter" stroke-linecap="square"/>`).join(''), x, y, r, s);
  const buste = (x, y, s, c = NUIT, r = 0) => place(
    deux([[-30, 30], [-26, 6], [-12, -6], [12, -6], [26, 6], [30, 30]], [[-30, 30], [-26, 6], [-12, -6], [0, -6], [0, 30]], c[1], c[2], 2.8)
    + deux(rond(8, 13, 14, Math.PI / 8).map(([a, b]) => [a, b - 22]), [[0, -36], [-5, -35], [-12, -27], [-12, -17], [-5, -9], [0, -8]], c[1], c[2], 2.8)
    + poly([[-9, -28], [-4, -33], [-5, -24]], c[0]), x, y, r, s);
  const botte = (x, y, s, r = 0, c = NUIT) => place(deux([[-14, -28], [8, -28], [8, 2], [30, 10], [34, 24], [-16, 24], [-18, 4]], [[-14, -28], [-2, -28], [-4, 6], [-16, 24], [-18, 4]], c[0], c[1], 3)
    + `<path d="M-17 16 L34 16" stroke="${INK}" stroke-width="2.4"/>` + deux([[-16, -32], [10, -32], [10, -24], [-16, -24]], [[-16, -32], [0, -32], [0, -24], [-16, -24]], OR_C, OR_S, 2.2), x, y, r, s);
  const ECU = [[-26, -30], [26, -30], [26, 4], [0, 32], [-26, 4]];
  const bouclier = (x, y, s, breche = false) => place(
    (breche
      ? deux([[-26, -30], [8, -30], [-2, -10], [12, 2], [6, 25], [0, 32], [-26, 4]], [[-26, -30], [0, -30], [-6, -10], [0, 32], [-26, 4]], '#52d2f4', '#209fec', 3.2)
      : deux(ECU, [[-26, -30], [0, -30], [0, 32], [-26, 4]], '#52d2f4', '#209fec', 3.2))
    + `<path d="M-20 -24 L-4 -24 M-20 -24 L-20 2" stroke="#e6fbff" stroke-width="2.4" stroke-linecap="round"/>`, x, y, 0, s);
  const tesson = (x, y, s, r = 0) => place(deux([[-8, -14], [12, -12], [6, 4], [12, 14], [-4, 12]], [[-8, -14], [12, -12], [2, 0], [-4, 12]], '#e6fbff', '#209fec', 2.6), x, y, r, s);
  const pli = (x, y, s, ouvert = 1) => place(
    poly([[0, -60], [12 * ouvert, -24], [14 * ouvert, 24], [0, 60], [-14 * ouvert, 24], [-12 * ouvert, -24]], NUIT[3])
    + `<path d="M0 -50 L${-9 * ouvert} -20 L${-10 * ouvert} 22 L0 50" fill="none" stroke="${AM[1]}" stroke-width="2.4"/>`
    + deux([[-46, -62], [0, -60], [-12 * ouvert, -24], [-14 * ouvert, 24], [0, 60], [-46, 62], [-40, 20], [-44, -20]], [[-46, -62], [0, -60], [-12 * ouvert, -24], [-30, -18], [-40, 20], [-44, -20]], NUIT[0], NUIT[1], 3)
    + deux([[46, -62], [0, -60], [12 * ouvert, -24], [14 * ouvert, 24], [0, 60], [46, 62], [40, 20], [44, -20]], [[0, -60], [12 * ouvert, -24], [26, -18], [46, -62]], NUIT[1], NUIT[2], 3)
    + `<path d="M-30 -50 L-26 40 M30 -50 L28 40" stroke="${INK}" stroke-width="2" opacity=".5"/>`, x, y, 0, s);
  const sablier = (x, y, s, r = 0, verre = ['#d8e8f2', '#8fa6bd'], sable = P.neutre, cadre = [OR_C, OR_S]) => place(
    deux([[-26, -40], [26, -40], [26, -34], [6, -2], [26, 34], [26, 40], [-26, 40], [-26, 34], [-6, -2], [-26, -34]], [[-26, -40], [0, -40], [0, 40], [-26, 40], [-26, 34], [-6, -2], [-26, -34]], verre[0], verre[1], 3)
    + poly([[-16, 30], [16, 30], [6, 14], [-6, 14]], sable[1]) + poly([[-2, -2], [2, -2], [2, 14], [-2, 14]], sable[1]) + poly([[-14, -30], [14, -30], [8, -20], [-8, -20]], sable[2])
    + deux([[-32, -46], [32, -46], [32, -38], [-32, -38]], [[-32, -46], [0, -46], [0, -38], [-32, -38]], cadre[0], cadre[1], 2.6)
    + deux([[-32, 38], [32, 38], [32, 46], [-32, 46]], [[-32, 38], [0, 38], [0, 46], [-32, 46]], cadre[0], cadre[1], 2.6), x, y, r, s);
  const cadran = (x, y, s, a1 = -60, a2 = 30) => {
    const R = rond(12, 36, 36, Math.PI / 12), r = rond(12, 28, 28, Math.PI / 12);
    const aig = (a, l, w) => { const t = (a - 90) * Math.PI / 180; return trait(`M0 0 L${(Math.cos(t) * l).toFixed(1)} ${(Math.sin(t) * l).toFixed(1)}`, INK, w, w + .01); };
    return place(deux(R, R.slice(3, 10).concat([[0, 0]]), OR_C, OR_S, 3)
      + deux(r, r.slice(4, 10).concat([[0, 0]]), '#f7f0de', '#d9c4a6', 2.4)
      + [0, 90, 180, 270].map(a => { const t = a * Math.PI / 180; return `<path d="M${(Math.cos(t) * 20).toFixed(1)} ${(Math.sin(t) * 20).toFixed(1)} L${(Math.cos(t) * 26).toFixed(1)} ${(Math.sin(t) * 26).toFixed(1)}" stroke="${INK}" stroke-width="3"/>`; }).join('')
      + aig(a1, 17, 4.4) + aig(a2, 23, 3) + `<circle r="4" fill="${AM[1]}" stroke="${INK}" stroke-width="2"/>`, x, y, 0, s);
  };
  const piece = (x, y, s, r = 0) => place(deux(rond(8, 10, 7, Math.PI / 8), [[-9.2, -2.7], [-3.8, -6.5], [3.8, -6.5], [0, 0], [-9.2, 2.7]], OR_V, OR_S, 2.2) + poly([[-3.8, -6.5], [3.8, -6.5], [9.2, -2.7], [9.2, 2.7], [0, 0]], OR_C) + encre(rond(8, 10, 7, Math.PI / 8), 2.2), x, y, r, s);
  const sceauNoir = (x, y, s, r = 0) => place(deux(rond(8, 30, 30, Math.PI / 8), [[27.7, -11.5], [11.5, -27.7], [-11.5, -27.7], [-27.7, -11.5], [-27.7, 11.5], [0, 0]], '#4a4458', '#2b2238', 3.2)
    + `<path d="M0 -15 L12 0 L0 15 L-12 0 Z M0 -15 L0 15" fill="none" stroke="${INK}" stroke-width="6.4" stroke-linejoin="round"/><path d="M0 -15 L12 0 L0 15 L-12 0 Z M0 -15 L0 15" fill="none" stroke="${AM[1]}" stroke-width="3" stroke-linejoin="round"/>`, x, y, r, s);
  const capuchon = (x, y, s) => place(
    deux([[0, -54], [30, -26], [40, 14], [44, 46], [-44, 46], [-40, 14], [-30, -26]], [[0, -54], [-30, -26], [-40, 14], [-44, 46], [-8, 46], [-4, 8]], NUIT[0], NUIT[1], 3.4)
    + deux([[0, -32], [18, -10], [22, 26], [0, 40], [-22, 26], [-18, -10]], [[0, -32], [-18, -10], [-22, 26], [0, 40]], NUIT[3], '#080c16', 3)
    + `<path d="M0 -54 L-6 -40 M-30 -26 L-24 -14" stroke="${INK}" stroke-width="2"/>`
    + deux([[-44, 46], [44, 46], [36, 56], [-36, 56]], [[-44, 46], [0, 46], [0, 56], [-36, 56]], NUIT[1], NUIT[2], 3) + croix(-20, 51, .7) + croix(0, 51, .7) + croix(20, 51, .7), x, y, 0, s);
  const cape = (x, y, s, dedans = '') => place(
    deux([[0, -58], [-34, -30], [-62, 36], [-50, 46], [-38, 38], [-26, 48], [26, 48], [38, 38], [50, 46], [62, 36], [34, -30]],
      [[0, -58], [-34, -30], [-62, 36], [-50, 46], [-38, 38], [-26, 48], [-20, 20], [-14, -30]], NUIT[0], NUIT[1], 3.2)
    + poly([[0, -44], [-24, -18], [-40, 40], [40, 40], [24, -18]], NUIT[3]) + encre([[0, -44], [-24, -18], [-40, 40], [40, 40], [24, -18]], 2.4)
    + dedans + gemme(0, -56, 8, [OR_V, OR_C, OR_S, '#7a4a26']), x, y, 0, s);
  const levres = (x, y, s) => place(
    deux([[-38, 0], [-20, -12], [-6, -8], [0, -12], [6, -8], [20, -12], [38, 0], [20, 14], [0, 18], [-20, 14]], [[-38, 0], [-20, -12], [-6, -8], [0, -12], [0, 0]], '#ef7574', '#a8322a', 3)
    + `<path d="M-38 0 L0 2 L38 0" stroke="${INK}" stroke-width="3"/>`, x, y, 0, s);
  const oeil = (x, y, s) => place(
    deux([[-44, 0], [-22, -20], [0, -26], [22, -20], [44, 0], [22, 20], [0, 26], [-22, 20]], [[-44, 0], [-22, -20], [0, -26], [22, -20], [44, 0]], '#f7f0de', '#d9c4a6', 3.4)
    + deux(rond(8, 17, 17, Math.PI / 8), [[15.7, -6.5], [6.5, -15.7], [-6.5, -15.7], [-15.7, -6.5], [0, 0]], AM[1], AM[3], 2.6)
    + poly(rond(6, 7, 7), INK) + poly([[-8, -10], [-3, -12], [-6, -5]], '#ffffff'), x, y, 0, s);
  const aile = (x, y, s, r = 0) => place(
    deux([[8, 4], [-14, -18], [-46, -24], [-80, -14], [-68, -6], [-82, 4], [-64, 8], [-74, 20], [-54, 20], [-58, 32], [-36, 28], [-34, 38], [-12, 30], [6, 20]],
      [[8, 4], [-14, -18], [-46, -24], [-80, -14], [-68, -6], [-40, -8], [-10, 0]], NUIT[0], NUIT[2], 3)
    + `<path d="M-68 -6 L-40 -4 M-64 8 L-36 6 M-54 20 L-30 14 M-36 28 L-18 20" stroke="${INK}" stroke-width="2"/>`
    + `<path d="M-14 -18 L-46 -24 L-80 -14" fill="none" stroke="${AM[1]}" stroke-width="2"/>`, x, y, r, s);
  const chausse = (x, y, s, c = ['#f1e6d2', '#9fb2c8', '#3e4a6e']) => place(
    deux([[-6, -4], [-30, 22], [-1, 8]], [[-6, -4], [-30, 22], [-4, 2]], c[0], c[1], 2.6)
    + deux([[6, -4], [30, 22], [1, 8]], [[6, -4], [30, 22], [4, 2]], c[1], c[2], 2.6)
    + deux([[-7, 2], [0, 32], [7, 2]], [[-7, 2], [0, 32], [0, 2]], c[0], c[2], 2.6)
    + deux([[-7, 6], [0, -34], [7, 6]], [[-7, 6], [0, -34], [0, 6]], c[0], c[1], 2.6)
    + poly([[-7, 2], [0, -2], [7, 2], [0, 7]], c[2]) + encre([[-7, 2], [0, -2], [7, 2], [0, 7]], 2), x, y, 0, s);
  const entaille = (x, y, s, r, c, fond = INK) => place(`<path d="M-58 0 L-18 -13 L58 0 L-18 13 Z" fill="${fond}"/><path d="M-48 0 L-18 -7 L46 0 L-18 7 Z" fill="${c[1]}"/><path d="M-40 0 L42 0" stroke="${c[0]}" stroke-width="2.2"/>`, x, y, r, s);
  const bougie = (x, y, s) => place(
    deux([[-12, -24], [12, -24], [12, 30], [-12, 30]], [[-12, -24], [0, -24], [0, 30], [-12, 30]], '#f7f0de', '#d9c4a6', 3)
    + poly([[0, -24], [12, -24], [12, -10], [8, -14], [6, -4], [3, -16]], '#ffffff') + encre([[-12, -24], [12, -24], [12, 30], [-12, 30]], 3)
    + `<path d="M0 -24 L1 -32" stroke="${INK}" stroke-width="3" stroke-linecap="round"/>`
    + deux([[-26, 30], [26, 30], [20, 40], [-20, 40]], [[-26, 30], [0, 30], [0, 40], [-20, 40]], OR_C, OR_S, 2.6), x, y, 0, s);
  const bourse = (x, y, s, r = 0) => place(
    deux([[-14, -20], [14, -20], [28, -4], [32, 18], [20, 32], [-20, 32], [-32, 18], [-28, -4]], [[-14, -20], [0, -20], [0, 32], [-20, 32], [-32, 18], [-28, -4]], CUIR[1], CUIR[2], 3)
    + deux([[-12, -32], [-4, -24], [4, -24], [12, -32], [8, -20], [-8, -20]], [[-12, -32], [-4, -24], [0, -24], [0, -20], [-8, -20]], CUIR[1], CUIR[2], 2.4)
    + deux([[-14, -24], [14, -24], [14, -18], [-14, -18]], [[-14, -24], [0, -24], [0, -18], [-14, -18]], OR_C, OR_S, 2.4)
    + `<path d="M-18 6 L-6 12" stroke="${INK}" stroke-width="2" opacity=".5"/>`, x, y, r, s);
  const trainee = (x, y, l, c, r = 0, w = 5) => place(trait(`M0 0 L${-l} 0`, c, w), x, y, r, 1);
  const bulle = (x, y, s, c = ['#ffffff', '#e6eef8', '#9fb2c8']) => place(deux(rond(10, 9, 9), rond(10, 9, 9).slice(5, 9).concat([[0, 0]]), c[0], c[1], 2) , x, y, 0, s);
  const dalle = (x, y, s) => place(deux([[-46, 0], [-30, -14], [30, -14], [46, 0], [30, 14], [-30, 14]], [[-46, 0], [-30, -14], [30, -14], [46, 0]], PIERRE[0], PIERRE[1], 3)
    + `<path d="M-6 -14 L2 -4 L-4 6 L4 14" fill="none" stroke="${INK}" stroke-width="2.4"/>`, x, y, 0, s);
  const spirale = (x, y, s, c) => place(trait('M0 0 Q10 -8 18 0 Q22 12 0 16 Q-30 14 -28 -4 Q-22 -26 10 -26 Q46 -22 44 4 Q40 30 0 30', c, 5), x, y, 0, s);

  const SIL = [[0, -64], [14, -56], [20, -40], [22, -26], [36, -16], [42, 8], [38, 34], [34, 58], [-34, 58], [-38, 34], [-42, 8], [-36, -16], [-22, -26], [-20, -40], [-14, -56]];
  const VISAGE = [[0, -48], [10, -40], [11, -28], [0, -20], [-11, -28], [-10, -40]];
  const silhouette = (x, y, s, c = [NUIT[1], NUIT[2], NUIT[3]], yeux = AM[0], sx = 1) => place(`<g transform="scale(${sx} 1)">`
    + deux(SIL, [[0, -64], [-14, -56], [-20, -40], [-22, -26], [-36, -16], [-42, 8], [-38, 34], [-34, 58], [-6, 58], [-4, -12], [0, -20]], c[0], c[1], 3)
    + poly(VISAGE, c[2]) + encre(VISAGE, 2.2)
    + (yeux ? poly([[-8, -34], [-2.5, -37], [-2, -31]], yeux) + poly([[8, -34], [2.5, -37], [2, -31]], yeux) : '')
    + `<path d="M-16 -12 L-22 56 M12 -8 L18 56" stroke="${INK}" stroke-width="2" opacity=".45"/></g>`, x, y, 0, s);
  const fleche = (x, y, r, s = 1) => place(trait('M-4 0 L-46 0', '#e8c79a', 3.4, 7.4)
    + deux([[-40, 0], [-50, -10], [-60, -10], [-52, 0]], [[-40, 0], [-50, -10], [-56, -5], [-46, 0]], '#ef7574', '#a8322a', 2)
    + deux([[-40, 0], [-50, 10], [-60, 10], [-52, 0]], [[-40, 0], [-46, 0], [-56, 5], [-50, 10]], '#ef7574', '#a8322a', 2), x, y, r, s);

  const feu = P.feu, eau = P.eau, terre = P.terre, air = P.air;

  Object.assign(IconesV3.SUJETS, {
    coup_penombre: p => lèvreFond(100, 146, 1.05) + D(100, 128, 0, .8) + lèvreAvant(100, 146, 1.05) + ame(48, 72, .9) + ame(152, 104, .7) + eclat(140, 46, .6, p[0]),
    dague_de_houle: p => croissant(100, 88, 58, .2, 2.95, p[1], p[0], 1.3) + croissant(100, 88, 42, .2, 2.95, p[2], p[1], 1.3) + D(150, 110, -38, .72)
      + `<path d="M46 150 Q62 138 78 150 Q94 162 110 150 Q126 138 142 150 Q154 158 162 152" fill="none" stroke="${INK}" stroke-width="9" stroke-linecap="round"/><path d="M46 150 Q62 138 78 150 Q94 162 110 150 Q126 138 142 150 Q154 158 162 152" fill="none" stroke="${p[0]}" stroke-width="4" stroke-linecap="round"/>`,
    larcin: p => lèvreFond(100, 154, .85) + PA(100, 62, 1.7) + poing(100, 110, 1.25) + lèvreAvant(100, 154, .85) + ame(150, 60, .7) + ame(48, 92, .6),
    pas_derobe: p => main(96, 72, .95, 180) + botte(98, 130, 1.05, -14, [CUIR[0], NUIT[1]]) + PM(152, 140, .9) + roc(48, 156, .7, 10) + roc(64, 168, .5, 40),
    dague_de_forge: p => flamme(50, 150, .34, p) + flamme(66, 138, .26, p) + eclat(40, 128, .45, p[1], p[0]) + eclat(74, 164, .4, p[1], p[0])
      + D(108, 108, 45, .82, CHAUD) + flamme(52, 150, .38, p) + eclat(160, 46, .9, p[1], p[0]) + eclat(146, 76, .5, p[0]),
    dague_filante: p => trainee(128, 78, 70, p[0], 0, 5) + trainee(116, 124, 56, p[0], 0, 5) + trainee(150, 64, 26, p[1], 0, 3.4)
      + D(60, 101, 90, .74) + eclat(162, 92, .9, '#ffffff', p[1]),
    croc_en_jambe: p => botte(84, 116, 1.35, -28, [CUIR[1], CUIR[2]]) + PM(144, 72, 1.1, 120) + moins(150, 104, 1)
      + roc(130, 152, .8, 20) + roc(152, 160, .6, -30) + roc(112, 164, .5, 50),
    entaille_de_cendre: p => `<g transform="translate(100 120) rotate(-32) scale(1.05 2.1)">${entaille(0, 0, 1, 0, ['#ffd27a', '#ef5a2a'], '#2b2238')}</g>` + entaille(100, 120, .9, -32, ['#fff3c0', '#ffb347'], 'none')
      + trait('M66 96 Q54 82 66 70 Q78 58 66 44', '#d9d0c8', 4) + trait('M98 74 Q88 62 98 52 Q108 42 100 32', '#d9d0c8', 3.4) + nuage(70, 46, .75, '#ece4dc', '#9a90a0')
      + flamme(60, 150, .4, p) + flamme(146, 64, .34, p) + eclat(150, 112, .5, p[1], p[0]),
    voile_penombre: p => capuchon(100, 102, 1.25) + ame(150, 50, .8) + ame(56, 66, .6),
    pli_partage: p => cape(100, 104, 1.2, buste(0, 12, .9, [p[0], CUIR[1], CUIR[2]])) + plus(154, 58, 1.1) + ame(48, 70, .7) + ame(150, 150, .5),
    piege_penombre: p => ombre(100, 142, 1.08) + chausse(100, 108, 1.45) + chausse(54, 126, .55) + chausse(146, 124, .5) + ame(150, 62, .8) + ame(50, 86, .6),
    piege_ardent: p => ombre(100, 142, 1.08) + place(deux([[-26, 6], [-18, -14], [2, -22], [22, -12], [28, 6]], [[-26, 6], [-18, -14], [2, -22], [0, 6]], p[0], p[2], 3) + poly([[-8, 4], [-2, -10], [8, -4], [6, 4]], p[1]), 100, 140, 0, 1.2)
      + flamme(72, 106, .5, p) + flamme(124, 96, .62, p) + flamme(100, 84, .4, p) + nuage(150, 60, .7, '#ece4dc', '#9a90a0'),
    main_leste: p => bouclier(72, 116, 1.45, true) + trait('M150 28 L150 70', OR_C, 2.6)
      + trait('M150 70 L150 110 Q150 132 130 132 Q112 132 112 116', '#c8d2ec', 6) + poly([[106, 120], [112, 104], [120, 118]], '#c8d2ec', `stroke="${INK}" stroke-width="2.4" stroke-linejoin="round"`)
      + tesson(122, 136, 1.15, 20) + eclat(168, 150, .6, p[0]),
    souffle_derobe: p => trait('M42 54 Q66 42 90 62 Q106 80 122 90', '#ffffff', 5.4) + trait('M42 100 Q66 92 88 106 Q104 116 118 114', '#ffffff', 5.4)
      + `<path d="M50 50 Q58 46 66 47 M50 96 Q58 93 66 94" fill="none" stroke="${p[2]}" stroke-width="2"/>`
      + place(main(0, 0, 1.12, 0, .9), 134, 118, -62)
      + PM(80, 58, 1.05, 30) + PM(80, 104, .95, 14) + ame(150, 52, .6),
    piege_de_reflux: p => flaque(84, 150, 1, p) + place(poly([[-36, 14], [-26, -4], [-8, -14], [12, -12], [26, -2], [20, 4], [8, -2], [-2, 4], [4, 14]], p[2]) + poly([[-26, -4], [-8, -14], [12, -12], [26, -2], [20, 4], [8, -2], [-8, -4]], p[1]) + poly([[-8, -14], [12, -12], [8, -8]], p[0]) + encre([[-36, 14], [-26, -4], [-8, -14], [12, -12], [26, -2], [20, 4], [8, -2], [-2, 4], [4, 14]], 2.8), 80, 110, -10, 1.6)
      + chevrons(148, 84, .85, p[0], -20) + place(deux([[0, -16], [10, 2], [8, 12], [0, 16], [-8, 12], [-10, 2]], [[0, -16], [0, 16], [-8, 12], [-10, 2]], VERT[1], VERT[2], 2.4), 148, 138, 0, 1),
    piege_d_appel: p => place(spirale(0, 0, 1, p[1]), 100, 122, 0, 1.15) + chevrons(48, 82, .7, p[0], 30) + chevrons(152, 82, .7, p[0], 150) + chevrons(100, 56, .7, p[0], 90),
    leurre_penombre: p => ombre(100, 154, .78) + silhouette(100, 100, .94)
      + `<path d="M80 92 L90 104 L84 116 M118 112 L110 124 L118 136" fill="none" stroke="${AM[1]}" stroke-width="2.6" stroke-linejoin="round"/>`
      + fleche(84, 96, 22, 1) + fleche(120, 116, 160, 1) + fleche(96, 134, -18, .85)
      + ame(84, 96, .55) + ame(120, 116, .55) + ame(152, 58, .6),
    echange_d_ombre: p => buste(56, 118, .9, [p[0], CUIR[1], CUIR[2]]) + buste(144, 118, .9)
      + trait('M60 70 Q100 30 140 70', OR_C, 5) + poly([[132, 58], [148, 76], [126, 76]], OR_C, `stroke="${INK}" stroke-width="2.6" stroke-linejoin="round"`)
      + trait('M140 164 Q100 196 60 164', AM[1], 5) + poly([[68, 176], [52, 158], [74, 158]], AM[1], `stroke="${INK}" stroke-width="2.6" stroke-linejoin="round"`),
    dernier_souffle_ombre: p => `<clipPath id="nerith-sa"><path d="M-50 50 L-50 -50 L50 -50 Z"/></clipPath><clipPath id="nerith-sb"><path d="M-50 50 L50 50 L50 -50 Z"/></clipPath>`
      + place(`<g clip-path="url(#nerith-sa)">${sceauNoir(0, 0, 1)}</g>`, 100 - 7, 104 - 7, 0, 1.45) + place(`<g clip-path="url(#nerith-sb)">${sceauNoir(0, 0, 1)}</g>`, 100 + 7, 104 + 7, 0, 1.45)
      + D(62, 142, 45, .8) + eclat(150, 50, .8, p[0]) + eclat(48, 64, .5, p[0]),
    derniere_poche: p => bourse(104, 76, 1.25, 180) + piece(70, 132, 1.2, -10) + piece(104, 146, 1.1, 20) + piece(134, 128, 1.15, 10) + piece(88, 166, .9, 0) + piece(124, 164, .8, -20)
      + D(56, 82, 40, .5),
    pas_ombre: p => pli(100, 102, 1) + ame(100, 104, 1.4) + ame(100, 60, .6) + chevrons(160, 150, .5, OR_C, 0),
    retrait_dans_le_pli: p => pli(68, 102, .85, .7) + chevrons(134, 104, 1.1, OR_C, 180) + ame(162, 58, .6),
    silence_des_lames: p => levres(100, 122, 1.3) + croix(64, 126, 1.1) + croix(136, 126, 1.1) + D(100, 116, 0, .7) + eclat(150, 54, .7, p[0]) + eclat(52, 70, .5, p[0]),
    noyade_lente: p => `<clipPath id="nerith-ny"><path d="${IconesV3.FORMES.degats}" transform="translate(100 100) scale(.84) translate(-100 -100)"/></clipPath>`
      + `<path clip-path="url(#nerith-ny)" d="M0 86 L200 86 L200 200 L0 200 Z" fill="#0a1a30" opacity=".75"/>`
      + buste(100, 138, 1.05, [eau[1], NUIT[1], NUIT[2]])
      + `<path d="M22 86 Q46 76 70 86 Q94 96 118 86 Q142 76 178 86" fill="none" stroke="${INK}" stroke-width="8"/><path d="M22 86 Q46 76 70 86 Q94 96 118 86 Q142 76 178 86" fill="none" stroke="${p[0]}" stroke-width="3.4"/>`
      + bulle(88, 68, 1) + bulle(110, 52, .75) + ame(150, 50, .6),
    piege_de_glaise: p => flaque(100, 140, 1.3, ['#c99a6a', '#8f6a4a', '#4a3020']) + place(botte(0, 0, 1, 0, [CUIR[0], NUIT[1]]), 92, 112, 10, 1.2)
      + place(poly([[-52, 0], [-36, 13], [0, 18], [36, 13], [52, 0], [0, 6]], '#8f6a4a') + `<path d="M-52 0 L-36 13 L0 18 L36 13 L52 0" fill="none" stroke="${INK}" stroke-width="3"/>`, 100, 140, 0, 1.3)
      + PM(150, 70, .9, 90) + moins(150, 46, .9),
    piege_d_ecume: p => flaque(100, 146, 1.3, ['#ffffff', '#e6fcff', '#6fe0f2'], p[1])
      + [[74, 120, -24, 1], [126, 118, 22, 1.05], [100, 108, 0, 1.25]].map(([x, y, r, s]) => place(poly([[0, -26], [8, -6], [6, 18], [-6, 18], [-8, -6]], p[2]) + poly([[0, -26], [8, -6], [0, 0], [-8, -6]], p[0]) + poly([[0, 0], [8, -6], [6, 18]], p[1]) + encre([[0, -26], [8, -6], [6, 18], [-6, 18], [-8, -6]], 2.4), x, y, r, s)).join('')
      + PA(100, 62, 1.3) + `<path d="M92 52 L100 62 L96 72" fill="none" stroke="${INK}" stroke-width="2.4"/>` + nuage(56, 150, .55, '#ffffff', '#e6fcff') + nuage(146, 156, .5, '#ffffff', '#e6fcff'),
    victime_choisie: p => oeil(100, 68, 1.2) + buste(100, 138, .62, [P.neutre[0], '#a8322a', '#5c1608'])
      + `<circle cx="100" cy="130" r="25" fill="none" stroke="${INK}" stroke-width="7"/><circle cx="100" cy="130" r="25" fill="none" stroke="${OR_C}" stroke-width="3"/>`,
    doigts_longs: p => place(main(0, 0, 1, 0, 2.1), 64, 128, 50) + bouclier(146, 70, .8, true) + tesson(124, 108, .7, -30) + ame(160, 132, .6),
    lame_de_suie: p => nuage(60, 62, 1.05, '#6a6070', '#2b2238') + nuage(150, 136, .85, '#6a6070', '#2b2238') + trait('M128 76 Q140 64 132 52 Q124 42 136 34', '#6a6070', 4)
      + D(92, 132, 36, .86, SUIE) + eclat(60, 150, .5, p[1]),
    dague_de_schiste: p => D(110, 132, -36, .86, SCHISTE) + roc(150, 64, .9, 20) + roc(162, 96, .7, -30) + roc(48, 140, .6, 40) + roc(58, 160, .45, 10),
    souffle_retenu: p => trait('M62 94 Q74 78 102 76 Q142 72 148 92', '#ffffff', 5)
      + D(96, 126, 0, .82)
      + trait('M148 92 Q152 112 106 120 Q74 125 58 118 Q40 108 48 96 Q56 86 66 94 Q70 102 62 104', '#ffffff', 5) + croix(100, 121, .95)
      + chevrons(152, 142, .7, OR_C, -90) + ame(66, 54, .6) + ame(136, 52, .45),
    heure_volee: p => {
      const C = [78, 110], R = 44, A = (a, r = R) => [+(C[0] + Math.cos(a * Math.PI / 180) * r).toFixed(1), +(C[1] + Math.sin(a * Math.PI / 180) * r).toFixed(1)];
      const arc = (a0, a1, r = R) => Array.from({ length: 13 }, (_, k) => A(a0 + (a1 - a0) * k / 12, r));
      const a0 = -50, a1 = 10, coin = [C].concat(arc(a0, a1, R + 6)), dx = 40, dy = -12;
      const tick = (a, l = 9) => { const [x0, y0] = A(a, R - 4), [x1, y1] = A(a, R - 4 - l); return `M${x0} ${y0} L${x1} ${y1}`; };
      return deux([C].concat(arc(a1, 310, R + 6)), [C].concat(arc(90, 270, R + 6)), OR_C, OR_S, 3.2)
        + deux([C].concat(arc(a1, 310)), [C].concat(arc(90, 270)), NUIT[1], NUIT[2], 2.4)
        + `<path d="${tick(-90)} ${tick(90)} ${tick(180)}" stroke="${OR_C}" stroke-width="3.4"/>`
        + poly(coin, '#080c16') + encre(coin, 2.6)
        + trait(`M${C[0]} ${C[1]} L${A(215, 24).join(' ')}`, OR_C, 3.4) + `<circle cx="${C[0]}" cy="${C[1]}" r="5" fill="${AM[1]}" stroke="${INK}" stroke-width="2"/>`
        + `<g transform="translate(${dx} ${dy}) rotate(-8 ${C[0]} ${C[1]})">` + poly(coin, OR_C) + poly([C].concat(arc(a0, -20, R + 6)), OR_V) + poly(arc(a0, a1, R + 6).concat(arc(a1, a0, R)), OR_S)
        + `<path d="${tick(-20, 12)}" stroke="${INK}" stroke-width="3"/>` + encre(coin, 3) + '</g>'
        + plus(150, 152, 1.1) + ame(46, 56, .6) + ame(148, 48, .5);
    },
    poids_des_heures: p => sablier(98, 98, 1.2, 14, [PIERRE[0], PIERRE[1]], P.terre, [PIERRE[1], PIERRE[2]])
      + `<path d="M40 160 L160 160" stroke="${INK}" stroke-width="5"/><path d="M98 160 L84 176 M110 160 L124 178 M70 160 L58 172" stroke="${INK}" stroke-width="3"/>`
      + roc(50, 148, .7, 10) + roc(150, 146, .7, -20) + PM(150, 66, .75, 90),
    meche_soufflee: p => bougie(96, 120, 1.2)
      + trait('M98 84 Q86 70 98 58 Q112 46 100 32', '#d9c4a6', 4) + nuage(124, 42, .75, '#ece4dc', '#9a90a0') + eclat(100, 84, .6, p[1], p[0]) + D(150, 140, 30, .4, CHAUD),
    cape_doublee: p => bouclier(100, 118, 1.5)
      + deux([[100, 50], [80, 56], [54, 76], [38, 120], [32, 156], [46, 146], [56, 158], [64, 140], [66, 104], [84, 74], [100, 66]],
        [[100, 50], [80, 56], [54, 76], [38, 120], [32, 156], [46, 146], [48, 112], [64, 80]], NUIT[0], NUIT[1], 3)
      + deux([[100, 50], [120, 56], [146, 76], [162, 120], [168, 156], [154, 146], [144, 158], [136, 140], [134, 104], [116, 74], [100, 66]],
        [[100, 50], [120, 56], [146, 76], [136, 80], [116, 66]], NUIT[1], NUIT[2], 3)
      + poly([[66, 104], [64, 140], [56, 158], [52, 138], [58, 104], [76, 76], [84, 74]], AM[2]) + encre([[66, 104], [64, 140], [56, 158], [52, 138], [58, 104], [76, 76], [84, 74]], 2.2)
      + poly([[134, 104], [136, 140], [144, 158], [148, 138], [142, 104], [124, 76], [116, 74]], AM[3]) + encre([[134, 104], [136, 140], [144, 158], [148, 138], [142, 104], [124, 76], [116, 74]], 2.2)
      + eclat(60, 124, .45, AM[0], '#ffffff') + eclat(140, 120, .45, AM[0], '#ffffff')
      + gemme(100, 56, 10, [OR_V, OR_C, OR_S, '#7a4a26']) + croix(46, 132, .7) + croix(154, 132, .7),
    esquive_du_pli: p => `<clipPath id="nerith-eg"><path d="M0 0 L104 0 L104 200 L0 200 Z"/></clipPath><clipPath id="nerith-ed"><path d="M104 0 L200 0 L200 200 L104 200 Z"/></clipPath>`
      + `<g clip-path="url(#nerith-ed)" opacity=".5">${silhouette(90, 104, 1, [NUIT[1], NUIT[2], NUIT[3]], AM[0])}</g>`
      + fleche(118, 104, 196, 1.15) + place(poly([[0, 0], [-12, -6], [-12, 6]], '#f7f0de', `stroke="${INK}" stroke-width="2.2" stroke-linejoin="round"`), 118, 104, 196, 1.15)
      + `<g clip-path="url(#nerith-eg)">${silhouette(90, 104, 1, ['#f7f0de', '#d9c4a6', '#3e2614'], AM[1])}</g>`
      + poly([[104, 30], [111, 70], [112, 130], [104, 176], [97, 130], [98, 70]], NUIT[3]) + `<path d="M104 40 L100 70 L100 130 L104 166" fill="none" stroke="${AM[1]}" stroke-width="2.4"/>` + encre([[104, 30], [111, 70], [112, 130], [104, 176], [97, 130], [98, 70]], 2.4)
      + ame(152, 56, .6),
    piege_sifflant: p => trait('M84 136 Q70 104 92 84 Q110 68 102 50', '#ffffff', 5) + trait('M92 138 Q100 110 126 102 Q146 96 150 76', p[1], 5) + trait('M78 134 Q50 118 52 92', p[2], 4)
      + dalle(86, 146, 1.3)
      + chevrons(150, 96, .9, p[0], -30) + eclat(60, 62, .6, '#ffffff'),
    piege_de_lenteur: p => flaque(100, 148, 1.35, p) + place(cadran(0, 0, 1, -120, 150), 100, 108, 0, 1.1)
      + place(deux([[0, -12], [7, 2], [5, 9], [0, 12], [-5, 9], [-7, 2]], [[0, -12], [0, 12], [-5, 9], [-7, 2]], p[0], p[2], 2), 48, 70, 0, 1) + place(deux([[0, -12], [7, 2], [5, 9], [0, 12], [-5, 9], [-7, 2]], [[0, -12], [0, 12], [-5, 9], [-7, 2]], p[0], p[2], 2), 154, 62, 0, .8),
    peau_de_penombre: p => buste(96, 112, 1.45) + poly([[78, 76], [86, 66], [84, 84]], '#ffffff', 'opacity=".6"')
      + [[146, 116, 1, '#ef7574', '#a8322a'], [152, 146, .8, VERT[1], VERT[2]], [44, 132, .85, '#ef7574', '#a8322a'], [38, 158, .65, AM[1], AM[3]]].map(([x, y, s, c1, c2]) => place(deux([[0, -12], [7, 2], [5, 9], [0, 12], [-5, 9], [-7, 2]], [[0, -12], [0, 12], [-5, 9], [-7, 2]], c1, c2, 2), x, y, 0, s)).join('')
      + plus(150, 56, 1),
    ombre_portee: p => poly([[52, 143], [72, 145], [162, 140], [158, 132], [118, 133]], NUIT[3], `stroke="${INK}" stroke-width="2.6" stroke-linejoin="round"`)
      + `<path d="M74 142 L156 136" stroke="${AM[1]}" stroke-width="2.2"/>`
      + silhouette(138, 94, .76, [NUIT[1], NUIT[2], NUIT[3]], AM[0], .7)
      + silhouette(62, 118, .44, ['#f7f0de', '#d9c4a6', '#3e2614'], 0)
      + ame(164, 74, .55) + ame(100, 128, .45),
    poudre_aux_yeux: p => [[100, 100, 1.2], [100, 54, .9], [100, 146, .9], [54, 100, .9], [146, 100, .9]].map(([x, y, s]) => nuage(x, y, s, '#f7f0de', '#d9c4a6')).join('')
      + eclat(76, 76, .7, OR_C) + eclat(124, 124, .7, OR_C) + eclat(124, 74, .5, '#ffffff') + eclat(76, 126, .5, '#ffffff') + PA(140, 148, .7),
    heure_suspendue: p => cadran(100, 98, 1.4, 0, 0) + `<path d="M66 70 L82 86 L74 96" fill="none" stroke="${INK}" stroke-width="3"/>` + croix(76, 80, .8)
      + PM(58, 150, .6, 0) + PM(142, 150, .6, 180) + eclat(150, 50, .6, p[1]),
    double_entaille: p => croissant(100, 118, 70, -2.75, -.45, p[1], p[0], 1.28) + croissant(100, 146, 66, -2.7, -.5, AM[1], AM[0], 1.28)
      + D(78, 150, 18, .62) + D(122, 150, 18, .62),
    entailles_de_forge: p => croissant(100, 118, 70, -2.75, -.45, p[1], p[0], 1.28) + croissant(100, 146, 66, -2.7, -.5, p[2], p[1], 1.28)
      + D(78, 150, 18, .62, CHAUD) + D(122, 150, 18, .62, CHAUD) + eclat(160, 54, .6, p[1], p[0]) + flamme(44, 66, .3, p),
  });
  IconesV3.outilsDe = Object.assign(IconesV3.outilsDe || {}, { nerith: { poly, encre, place, croix, eclat, roc, croissant, flamme, P, INK, OR_C, AM, NUIT, CUIR, PIERRE, VERT, deux, trait, rond, gemme, ame, D, CHAUD, SUIE, SCHISTE, flaque, ombre, lèvreFond, lèvreAvant, nuage, main, poing, PA, PM, moins, plus, chevrons, buste, botte, ECU, bouclier, tesson, pli, sablier, cadran, piece, sceauNoir, capuchon, cape, levres, oeil, aile, chausse, entaille, bougie, bourse, trainee, bulle, dalle, spirale, SIL, VISAGE, silhouette, fleche, feu, dague } });
})();

IconesV3.TYPES = Object.assign(IconesV3.TYPES || {}, {piege_penombre:'degats',piege_ardent:'degats',piege_de_reflux:'degats',piege_d_appel:'degats',piege_de_glaise:'degats',piege_d_ecume:'degats',piege_sifflant:'degats',piege_de_lenteur:'degats',victime_choisie:'degats',poudre_aux_yeux:'degats',heure_suspendue:'degats'});
