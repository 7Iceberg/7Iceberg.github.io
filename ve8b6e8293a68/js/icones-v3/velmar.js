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


  const BOIS = ['#e6b884', '#b57c48', '#7a4a28', '#3e2414'];
  const ACIER = ['#eef1f6', '#b9c1cf', '#6e7789', '#363c4a'];
  const ECAIL = ['#dcd9a4', '#a6a26c', '#6b6a44', '#363522'];
  const ROCHE = ['#e2ddd2', '#b3aa9a', '#7b7263', '#3f3a33'];
  const PEAU = ['#d3d98f', '#98a65c', '#5d6a34'];
  const hexa = (x, y, r, k = 1) => Array.from({ length: 6 }, (_, i) => { const a = i * Math.PI / 3; return [r1(x + Math.cos(a) * r), r1((y + Math.sin(a) * r) * k)]; });
  const ell = (rx, ry, f) => `<ellipse rx="${r1(rx)}" ry="${r1(ry)}" ${f}/>`;

  function bouclier(o = {}) {
    const R = 56, lueur = o.lueur || CRIST;
    const planches = [-36, -18, 0, 18, 36].map(x => { const h = r1(Math.sqrt(R * R - x * x)); return `<path d="M${x} ${-h} L${x} ${h}" stroke="${INK}" stroke-width="1.6" opacity=".5"/>`; }).join('');
    const grain = [[-27, -24, 14], [-9, 8, 18], [9, -30, 12], [27, 16, 12], [-27, 22, 10], [9, 30, 10]].map(([x, y, l]) => `<path d="M${x - 2} ${y} q3 ${l / 2} 0 ${l}" stroke="${BOIS[3]}" stroke-width="1.3" fill="none" opacity=".45"/>`).join('');
    const bras = [45, 135, 225, 315].map(d => place(deux([[17, -6], [52, -8], [52, 8], [17, 6]], [[17, -6], [52, -8], [52, 0], [17, 0]], ACIER[0], ACIER[1], 2)
      + `<circle cx="42" cy="0" r="2.6" fill="${ACIER[2]}" stroke="${INK}" stroke-width="1.1"/>`, 0, 0, d)).join('');
    const sigle = `M-8 3 L0 -5 L8 3 M0 2 L0 3`;
    const glyphes = [0, 90, 180, 270].map(d => { const a = d * Math.PI / 180; return place(`<path d="${sigle}" fill="none" stroke="${INK}" stroke-width="6" stroke-linejoin="round" stroke-linecap="round"/><path d="${sigle}" fill="none" stroke="${OR_C}" stroke-width="2.8" stroke-linejoin="round" stroke-linecap="round"/>`, r1(Math.cos(a) * 34), r1(Math.sin(a) * 34), d + 90); }).join('');
    const clous = Array.from({ length: 8 }, (_, k) => { const a = (k * 45 + 22.5) * Math.PI / 180; return place(deux([[0, -4.4], [3.6, 0], [0, 4.4], [-3.6, 0]], [[0, -4.4], [-3.6, 0], [0, 0]], '#e6fcff', lueur, 1.3), r1(Math.cos(a) * (R + 1)), r1(Math.sin(a) * (R + 1)), (k * 45 + 22.5) + 90); }).join('');
    const dents = []; for (let i = 0; i < 10; i++) { const a = i / 10 * Math.PI * 2; [[-.2, 15], [-.12, 21], [.12, 21], [.2, 15]].forEach(([d, r]) => dents.push([r1(Math.cos(a + d) * r), r1(Math.sin(a + d) * r)])); }
    return `<circle r="62" fill="${INK}"/><circle r="${R}" fill="${BOIS[1]}"/>`
      + `<path d="${arc(0, 0, R, Math.PI * .75, Math.PI * 1.75)} Z" fill="${BOIS[0]}" opacity=".55"/>`
      + planches + grain + glyphes + bras
      + `<circle r="${R + 1}" fill="none" stroke="${INK}" stroke-width="12"/><circle r="${R + 1}" fill="none" stroke="${ACIER[1]}" stroke-width="8"/>`
      + `<path d="${arc(0, 0, R + 1, Math.PI * .95, Math.PI * 1.55)}" fill="none" stroke="${ACIER[0]}" stroke-width="3.4"/>`
      + `<path d="${arc(0, 0, R + 1, Math.PI * .1, Math.PI * .6)}" fill="none" stroke="${ACIER[2]}" stroke-width="3.4"/>`
      + clous
      + poly(dents, ACIER[2]) + `<circle r="15" fill="${ACIER[1]}"/><path d="${arc(0, 0, 15, Math.PI * .75, Math.PI * 1.75)} Z" fill="${ACIER[0]}"/>` + encre(dents, 2.2)
      + `<circle r="8.6" fill="${OR_S}" stroke="${INK}" stroke-width="2.2"/><circle r="5.4" fill="${OR_C}"/><circle r="2.4" fill="${o.coeur || lueur}" stroke="${INK}" stroke-width="1.2"/>`
      + `<circle r="61" fill="none" stroke="${INK}" stroke-width="3.4"/>`;
  }
  const BOU = (x, y, s, r = 0, o) => place(bouclier(o), x, y, r, s);

  function baton(o = {}) {
    const lueur = o.lueur || CRIST;
    const fut = bez([0, 120], [-8, 76], [8, 24], [0, -40], 16);
    const torsade = fut.slice(1, -1).filter((_, i) => i % 2 === 0).map(([x, y]) => `<path d="M${r1(x - 7)} ${r1(y + 4)} L${r1(x + 7)} ${r1(y - 5)}" stroke="${BOIS[3]}" stroke-width="2.2" opacity=".6"/>`).join('');
    const prise = poly([[-9, -4], [9, -4], [9, 22], [-9, 22]], '#5a3a24') + [0, 7, 14].map(y => `<path d="M-9 ${y + 4} L9 ${y - 3}" stroke="#a5734a" stroke-width="2.6"/>`).join('') + encre([[-9, -4], [9, -4], [9, 22], [-9, 22]], 2.4);
    const bague = deux([[-10, -46], [10, -46], [10, -36], [-10, -36]], [[-10, -46], [0, -46], [0, -36], [-10, -36]], OR_C, OR_S, 2.4);
    return `<circle cx="0" cy="-70" r="${o.halo || 26}" fill="${lueur}" opacity=".26"/>`
      + tube(bez([2, -40], [22, -50], [26, -74], [12, -96], 10), 12, 4.4, BOIS[1], BOIS[2], 2.6)
      + tube(bez([-2, -40], [-24, -50], [-28, -76], [-10, -100], 10), 13, 5, BOIS[0], BOIS[1], 2.6)
      + tube(fut, 14, 16, BOIS[0], BOIS[1], 3) + torsade
      + deux([[-7, 106], [7, 106], [5, 124], [-5, 124]], [[-7, 106], [0, 106], [0, 124], [-5, 124]], ACIER[0], ACIER[2], 2.4)
      + prise + bague
      + deux([[0, -98], [16, -70], [0, -44], [-16, -70]], [[0, -98], [0, -44], [-16, -70]], '#e6fcff', lueur, 3)
      + poly([[0, -88], [7, -70], [0, -56]], '#ffffff', 'opacity=".75"');
  }
  const BAT = (x, y, s, r = 0, o) => place(baton(o), x, y, r, s);

  function glyphe(c, k = .44, o = {}) {
    const H = 12.5, D = H * Math.sqrt(3);
    const centres = [[0, 0]].concat(Array.from({ length: 6 }, (_, i) => { const a = (i * 60 + 30) * Math.PI / 180; return [r1(Math.cos(a) * D), r1(Math.sin(a) * D)]; }));
    const traits = Array.from({ length: 16 }, (_, i) => { const a = (i + .5) / 16 * Math.PI * 2; return `<path d="M${r1(Math.cos(a) * 47)} ${r1(Math.sin(a) * 47 * k)} L${r1(Math.cos(a) * 53)} ${r1(Math.sin(a) * 53 * k)}" stroke="${OR_C}" stroke-width="2.8" stroke-linecap="round"/>`; }).join('');
    const plaques = centres.map(([x, y], i) => {
      const h = hexa(x, y, H - 1.4, k);
      return poly(h, i ? (o.plaque || '#a9c6dc') : c[1]) + poly(h.slice(3).concat([[x, r1(y * k)]]), i ? '#ffffff' : c[0], 'opacity=".4"')
        + `<polygon points="${h.map(q => q.join(',')).join(' ')}" fill="none" stroke="${OR_S}" stroke-width="2.2"/>`;
    }).join('');
    return (o.halo ? ell(76, 76 * k, `fill="${o.halo}" opacity=".28"`) : '')
      + ell(64, 64 * k, `fill="${INK}"`) + ell(60, 60 * k, `fill="${o.fond || '#33405c'}"`)
      + ell(56, 56 * k, `fill="none" stroke="${OR_S}" stroke-width="7"`) + ell(56, 56 * k, `fill="none" stroke="${OR_C}" stroke-width="3.4"`)
      + ell(43, 43 * k, `fill="none" stroke="${INK}" stroke-width="4.6"`) + ell(43, 43 * k, `fill="none" stroke="${OR_C}" stroke-width="2.2"`)
      + traits + plaques
      + poly([[0, r1(-7 * k)], [4.4, 0], [0, r1(7 * k)], [-4.4, 0]], CRIST) + encre([[0, r1(-7 * k)], [4.4, 0], [0, r1(7 * k)], [-4.4, 0]], 1.4)
      + ell(64, 64 * k, `fill="none" stroke="${INK}" stroke-width="3"`);
  }
  const GLY = (x, y, s, c, k = .44, o) => place(glyphe(c, k, o), x, y, 0, s);

  const marque = (x, y, s, c = CRIST) => place(`<path d="M0 -6.5 L5 0 L0 6.5 L-5 0 Z" fill="none" stroke="${INK}" stroke-width="4.4" stroke-linejoin="round"/><path d="M0 -6.5 L5 0 L0 6.5 L-5 0 Z" fill="none" stroke="${c}" stroke-width="2.2" stroke-linejoin="round"/><circle r="1.8" fill="${c}"/>`, x, y, 0, s);
  const plaque = (x, y, s, c = ECAIL, lueur = CRIST) => { const h = hexa(0, 0, 16); return place(deux(h, h.slice(3).concat([[0, 0]]), c[0], c[1], 2.8) + `<polygon points="${hexa(0, 0, 10).map(q => q.join(',')).join(' ')}" fill="none" stroke="${c[2]}" stroke-width="1.6"/>` + marque(0, 0, 1.1, lueur), x, y, 0, s); };

  function carapace(o = {}) {
    const C = o.c || ECAIL, lueur = o.lueur || CRIST;
    const D = Array.from({ length: 25 }, (_, i) => { const a = Math.PI + i / 24 * Math.PI; return [r1(Math.cos(a) * 62), r1(18 + Math.sin(a) * 50)]; });
    const pl = [[0, -16, 14], [-31, -4, 13], [31, -4, 13], [-51, 8, 8], [51, 8, 8]];
    return (o.tete ? teteT(58, 6, 1) : '')
      + poly(D, C[2]) + poly(D.slice(0, 13).concat([[0, 18]]), C[1], 'opacity=".45"')
      + pl.map(([x, y, r]) => { const h = hexa(x, y, r); return poly(h, x < 0 ? C[0] : C[1]) + poly(h.slice(3).concat([[x, y]]), '#ffffff', 'opacity=".22"') + encre(h, 2) + (r > 10 ? marque(x, y, r / 13, lueur) : ''); }).join('')
      + `<path d="M-24 3.5 L-14 -4 M24 3.5 L14 -4 M-40 7 L-44 16 M40 7 L44 16 M-18 6 L-16 16 M18 6 L16 16" stroke="${INK}" stroke-width="1.8" opacity=".6"/>`
      + encre(D, 3)
      + deux([[-64, 16], [64, 16], [60, 27], [-60, 27]], [[-64, 16], [64, 16], [62, 20], [-62, 20]], C[0], C[2], 2.8)
      + [-40, -20, 0, 20, 40].map(x => `<path d="M${x} 17 L${x} 26" stroke="${INK}" stroke-width="1.8"/>`).join('');
  }
  const CAR = (x, y, s, r = 0, o) => place(carapace(o), x, y, r, s);

  const teteT = (x, y, s) => place(
    tube(bez([-6, 8], [4, 6], [10, 0], [16, -8], 8), 20, 16, PEAU[0], PEAU[1], 2.6)
    + deux([[12, -20], [24, -26], [37, -22], [44, -13], [42, -4], [33, 0], [19, 2], [10, -6]], [[12, -20], [24, -26], [37, -22], [44, -13], [26, -12], [10, -6]], PEAU[0], PEAU[1], 2.8)
    + deux([[39, -15], [49, -11], [45, -3], [40, -5]], [[39, -15], [49, -11], [42, -10]], '#f1e3a8', '#b9a463', 2)
    + `<path d="M25 -19 L35 -16" stroke="${INK}" stroke-width="2.6" stroke-linecap="round"/><circle cx="32" cy="-12.4" r="2.2" fill="${INK}"/>`
    + deux([[20, 0], [36, -1], [33, 12], [28, 24], [23, 12]], [[20, 0], [28, 0], [28, 24], [23, 12]], '#ffffff', '#cfc8ba', 2.2), x, y, 0, s);

  const patte = (x, y, s, r = 0) => place(
    deux([[-14, -44], [14, -44], [18, -12], [28, 0], [26, 10], [-26, 10], [-28, 0], [-18, -12]], [[-14, -44], [0, -44], [0, 10], [-26, 10], [-28, 0], [-18, -12]], PEAU[0], PEAU[1], 3)
    + [[-8, -32], [6, -24], [-4, -14], [12, -8], [-14, -2]].map(([a, b]) => `<circle cx="${a}" cy="${b}" r="3" fill="${PEAU[2]}" opacity=".55"/>`).join('')
    + [-18, 0, 18].map(a => deux([[a - 6, 7], [a + 6, 7], [a + 2, 22], [a, 27]], [[a - 6, 7], [a, 7], [a, 27]], '#fbf3df', '#b5a68a', 2.2)).join(''), x, y, r, s);

  const queueT = () => {
    const pts = bez([40, 168], [58, 116], [100, 90], [146, 80], 18);
    return tube(pts, 34, 4, PEAU[0], PEAU[1], 3.2)
      + pts.slice(2, 14).filter((_, i) => i % 3 === 0).map(([a, b], i) => place(deux([[-7, 2], [0, -9], [7, 2], [0, 6]], [[-7, 2], [0, -9], [0, 6]], ECAIL[0], ECAIL[2], 2), a - 3, b - 8 + i * 1.6, -40 + i * 12, 1.25 - i * .14)).join('');
  };

  const bulleDome = (x, y, rx, ry, c = CRIST) => {
    const pe = (a, k = 1) => `${r1(x + Math.cos(a) * rx * k)} ${r1(y + Math.sin(a) * ry * k)}`;
    return `<path d="M${x - rx} ${y} A${rx} ${ry} 0 0 1 ${x + rx} ${y} Z" fill="${c}" opacity=".18"/>`
      + `<path d="M${x - rx} ${y} A${rx} ${ry} 0 0 1 ${x + rx} ${y}" fill="none" stroke="${INK}" stroke-width="7"/><path d="M${x - rx} ${y} A${rx} ${ry} 0 0 1 ${x + rx} ${y}" fill="none" stroke="#bff4ff" stroke-width="3.2"/>`
      + `<path d="M${pe(Math.PI * 1.12, .84)} A${r1(rx * .84)} ${r1(ry * .84)} 0 0 1 ${pe(Math.PI * 1.36, .84)}" fill="none" stroke="#ffffff" stroke-width="3.4" stroke-linecap="round"/>`;
  };

  const epee = (x, y, s, r = 0) => place(
    deux([[0, -46], [5, -38], [5, 6], [-5, 6], [-5, -38]], [[0, -46], [0, 6], [-5, 6], [-5, -38]], '#f4f6fa', '#9aa6bc', 2.4)
    + deux([[-16, 6], [16, 6], [16, 12], [-16, 12]], [[-16, 6], [0, 6], [0, 12], [-16, 12]], OR_C, OR_S, 2.2)
    + deux([[-3.6, 12], [3.6, 12], [3.6, 30], [-3.6, 30]], [[-3.6, 12], [0, 12], [0, 30], [-3.6, 30]], '#8a5a36', '#5a3a24', 2)
    + `<circle cy="34" r="4.4" fill="${OR_C}" stroke="${INK}" stroke-width="2"/>`, x, y, r, s);

  const sablier = (x, y, s) => place(
    poly([[-12, -22], [12, -22], [3, 0], [12, 22], [-12, 22], [-3, 0]], '#e6fcff', 'opacity=".85"')
    + poly([[-8, -15], [8, -15], [1.6, -2], [-1.6, -2]], SABLE[1]) + poly([[-11, 22], [11, 22], [0, 11]], SABLE[2])
    + `<path d="M0 -2 L0 20" stroke="${SABLE[1]}" stroke-width="1.6"/>` + encre([[-12, -22], [12, -22], [3, 0], [12, 22], [-12, 22], [-3, 0]], 2.4)
    + deux([[-17, -28], [17, -28], [17, -22], [-17, -22]], [[-17, -28], [0, -28], [0, -22], [-17, -22]], BOIS[0], BOIS[2], 2.2)
    + deux([[-17, 22], [17, 22], [17, 28], [-17, 28]], [[-17, 22], [0, 22], [0, 28], [-17, 28]], BOIS[0], BOIS[2], 2.2), x, y, 0, s);

  const rayon = (x0, y0, x1, y1, w0, w1, c1, c2) => {
    const l = Math.hypot(x1 - x0, y1 - y0), nx = -(y1 - y0) / l, ny = (x1 - x0) / l;
    const Q = k => [[r1(x0 + nx * w0 * k), r1(y0 + ny * w0 * k)], [r1(x1 + nx * w1 * k), r1(y1 + ny * w1 * k)], [r1(x1 - nx * w1 * k), r1(y1 - ny * w1 * k)], [r1(x0 - nx * w0 * k), r1(y0 - ny * w0 * k)]];
    return poly(Q(1), c2) + poly(Q(.45), c1) + encre(Q(1), 2.4);
  };
  const flocon = (x, y, s, c = '#e6fcff') => place([0, 60, 120].map(d => place(`<path d="M0 -16 L0 16 M-5 -12 L0 -8 L5 -12 M-5 12 L0 8 L5 12" fill="none" stroke="${INK}" stroke-width="6" stroke-linecap="round" stroke-linejoin="round"/><path d="M0 -16 L0 16 M-5 -12 L0 -8 L5 -12 M-5 12 L0 8 L5 12" fill="none" stroke="${c}" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/>`, 0, 0, d)).join(''), x, y, 0, s);
  const volute = (d, c = '#ffffff') => trait(d, c, 3.6, 8);

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
  const corail = (x, y, s, r = 0) => place(
    tube(bez([0, 30], [-2, 10], [4, -6], [0, -30], 10), 12, 5, CORAIL[1], CORAIL[2], 2.6)
    + tube(bez([0, 6], [-10, 0], [-18, -6], [-20, -20], 8), 8, 4, CORAIL[1], CORAIL[2], 2.2)
    + tube(bez([2, -4], [12, -8], [16, -16], [18, -26], 8), 7, 3.6, CORAIL[1], CORAIL[2], 2.2), x, y, r, s);
  const sol = (c = PIERRE) => deux([[22, 152], [178, 152], [170, 176], [30, 176]], [[22, 152], [178, 152], [174, 160], [26, 160]], c[1], c[2], 3);


  Object.assign(IconesV3.SUJETS, {
    ressac: p => vague(66, 146, 1.05, p, 0) + impact(150, 56, .9, p) + BAT(112, 96, .62, 45, { lueur: p[1] })
      + plaque(56, 60, .95) + goutte(152, 108, .6, p) + goutte(120, 34, .5, p),
    coup_de_houle: p => sol() + `<path d="M120 152 L104 164 L110 176 M120 152 L140 166" fill="none" stroke="${INK}" stroke-width="3" stroke-linejoin="round"/>`
      + impact(150, 150, 1.2, P.neutre) + roc(36, 140, .8, 20) + roc(174, 128, .7, -30) + roc(118, 164, .55, 60)
      + [[24, 70, 50], [20, 92, 44], [26, 114, 40]].map(([x, y, l]) => trait(`M${x} ${y} L${x + l * .6} ${y}`, p[0], 3.4, 7.6)).join('')
      + CAR(78, 104, .78, 12, { tete: true }) + chevrons(166, 84, .72, p[1]),

    ecume_cinglante: p => rayon(100, 76, 162, 44, 7, 15, '#ffffff', p[1]) + BAT(80, 112, .58, 30, { lueur: p[1], halo: 30 })
      + eclat(162, 46, 1.25, p[0], '#ffffff') + eclat(132, 84, .55, p[1]) + eclat(150, 104, .45, p[0]) + eclat(120, 34, .5, p[0]),
    embruns_brulants: p => rayon(100, 76, 160, 46, 7, 14, p[0], p[1]) + BAT(80, 112, .58, 30, { lueur: p[1], halo: 30 })
      + flamme(156, 56, .62, p) + [[128, 88, .3], [146, 98, .24], [118, 36, .26]].map(([x, y, s]) => flamme(x, y, s, p)).join(''),
    galet_roule: p => [0, 1, 2].map(k => `<path d="${arc(84, 100, 46 + k * 12, Math.PI * .7, Math.PI * 1.25)}" fill="none" stroke="${INK}" stroke-width="7" stroke-linecap="round"/><path d="${arc(84, 100, 46 + k * 12, Math.PI * .7, Math.PI * 1.25)}" fill="none" stroke="${p[1]}" stroke-width="3.4" stroke-linecap="round"/>`).join('')
      + galet(96, 100, 1.45, -16) + chevrons(158, 104, .7, p[1]) + roc(150, 150, .6, 20) + roc(128, 160, .45, -10),
    galet_d_ecume: p => [[150, 80, -30], [160, 104, 0], [150, 128, 30], [138, 62, -50], [138, 146, 50]].map(([x, y, r]) => goutte(x, y, .8, p, r + 90)).join('')
      + galet(82, 104, 1.45, -16) + place(glyphe(p, .62), 80, 100, -16, .36) + ecume(132, 104, 1.2, [p[0], p[1]]) + eclat(60, 52, .7, p[1]),

    braise_de_phare: p => [0, 1, 2, 3, 4, 5, 6, 7].map(k => { const a = k / 8 * Math.PI * 2; return trait(`M${r1(66 + Math.cos(a) * 26)} ${r1(60 + Math.sin(a) * 26)} L${r1(66 + Math.cos(a) * 36)} ${r1(60 + Math.sin(a) * 36)}`, p[0], 2.6, 6.4); }).join('')
      + trajet('M90 50 Q126 10 152 72', p[1]) + BAT(66, 98, .54, 0, { lueur: p[1], halo: 30 }) + flamme(152, 96, .74, p) + eclat(150, 128, .6, p[0]),
    vent_du_large: p => [0, 1].map(k => trait(arc(86, 104, 52 + k * 10, Math.PI * (1.05 + k * .9), Math.PI * (1.55 + k * .9)), '#ffffff', 3, 7)).join('')
      + BAT(86, 104, .6, -38) + volute('M112 70 C134 58 156 64 152 82 C150 94 136 92 138 84', p[1]) + volute('M108 104 C130 98 148 102 164 112', '#ffffff')
      + impact(160, 132, .82, p) + volute('M30 142 C48 134 62 140 76 136', p[1]),

    mare_de_vase: p => GLY(100, 132, 1.05, p, .44, { halo: p[1] }) + `<path d="M62 136 L76 128 L72 120 M134 130 L122 122 L128 114" stroke="${INK}" stroke-width="2.6" fill="none"/>`
      + roc(66, 92, 1.1, 20, p[0], p[2]) + roc(132, 84, 1.3, -30, p[0], p[2]) + roc(100, 62, .9, 50, p[0], p[2]) + roc(86, 104, .6, 0, p[0], p[2]) + roc(120, 110, .55, 80, p[0], p[2]),
    mare_d_embruns: p => GLY(100, 132, 1.05, p, .44, { halo: p[1] })
      + [[100, 118, 12, 4], [102, 104, 20, 6], [98, 88, 28, 8], [102, 70, 36, 10], [100, 52, 42, 11]].map(([x, y, rx, ry], i) => `<path d="M${x - rx} ${y} A${rx} ${ry} 0 1 0 ${x + rx} ${y - 2}" fill="none" stroke="${INK}" stroke-width="8" stroke-linecap="round"/><path d="M${x - rx} ${y} A${rx} ${ry} 0 1 0 ${x + rx} ${y - 2}" fill="none" stroke="${i % 2 ? p[1] : '#ffffff'}" stroke-width="3.6" stroke-linecap="round"/>`).join('')
      + eclat(150, 50, .7, p[0]) + eclat(52, 64, .55, p[1]),
    bouclier_d_ecume: p => GLY(118, 150, .6, p) + pion(126, 100, 1.05) + BOU(84, 108, .6) + eclat(150, 46, .7, CRIST),
    carapace_de_vouivre: p => {
      const dans = (x, y) => y >= -42 && (y <= 6 ? Math.abs(x) <= 40 : Math.abs(x) <= 40 * (48 - y) / 42);
      const cs = []; [-33, -16.5, 0, 16.5, 33].forEach((x, i) => [-30, -11, 8, 27, 46].forEach(y0 => { const y = y0 + (i % 2 ? 9.5 : 0); if (hexa(x, y, 9.4).every(([a, b]) => dans(a, b))) cs.push([x, y]); }));
      return place(deux(ECU, [[-40, -42], [0, -42], [0, 48], [-40, 6]], ECAIL[1], ECAIL[2], 3.4)
        + cs.map(([x, y]) => { const h = hexa(x, y, 9.4); return poly(h, x < 0 ? ECAIL[0] : ECAIL[1]) + encre(h, 1.8) + marque(x, y, .62); }).join('')
        + `<path d="M-35 -37 L35 -37 L35 4 L0 41 L-35 4 Z" fill="none" stroke="${OR_C}" stroke-width="3"/>` + encre(ECU, 3.4)
        + place(glyphe(P.eau, 1), 0, -2, 0, .3), 100, 98, 0, 1.2) + eclat(152, 44, .7, CRIST);
    },

    mare_bouillante: p => GLY(100, 132, 1.05, p, .44, { halo: p[1] }) + flamme(72, 100, .5, p) + flamme(100, 82, .72, p) + flamme(128, 98, .52, p) + eclat(150, 50, .6, p[0]),
    mare_froide: p => GLY(100, 132, 1.05, p, .44, { halo: p[1] })
      + [[74, 112, -18, .8], [100, 104, 0, 1.15], [126, 112, 16, .85]].map(([x, y, r, s]) => place(deux([[-8, 0], [0, -40], [8, 0]], [[-8, 0], [0, -40], [0, 0]], '#ffffff', p[1], 2.6), x, y, r, s)).join('')
      + flocon(60, 58, .8) + flocon(146, 54, .65, p[0]),

    reflux: p => fleche('M150 132 C176 76 132 34 86 46', p[0], 7) + pointe(84, 48, 196, p[2], 1.3)
      + vague(92, 128, 1.3, p) + `<path d="M40 154 L164 154" stroke="${INK}" stroke-width="5"/><path d="M40 154 L164 154" stroke="${p[1]}" stroke-width="2"/>` + plaque(46, 66, .8),
    grand_reflux: p => fleche('M54 132 C24 76 68 34 114 46', p[0], 7) + pointe(116, 48, -16, p[2], 1.3)
      + deux([[22, 160], [70, 146], [130, 150], [178, 160], [178, 176], [22, 176]], [[22, 160], [70, 146], [130, 150], [178, 160]], SABLE[1], SABLE[2], 3)
      + vague(110, 126, 1.3, p, 0, -1) + roc(52, 152, .6, 0) + roc(150, 156, .5, 30),

    digue: p => trait(arc(100, 128, 74, Math.PI * 1.08, Math.PI * 1.92), OR_C, 3.4, 8) + CAR(100, 118, 1.05)
      + epee(136, 56, .84, 215) + impact(116, 84, .62, [OR_V, OR_C, OR_S]) + eclat(96, 62, .5, OR_V) + eclat(150, 98, .45, OR_C),
    brise_lames: p => [[176, 56, 136, 76], [178, 112, 146, 112]].map(([x0, y0, x1, y1]) => fleche(`M${x0} ${y0} L${x1} ${y1}`, '#e6eef8', 3.6) + pointe(x1, y1, r1(Math.atan2(y1 - y0, x1 - x0) * 180 / Math.PI), MET_S, .9)).join('')
      + BOU(88, 104, .92) + impact(140, 82, .5, [OR_V, CRIST, '#209fec']) + impact(146, 112, .45, [OR_V, CRIST, '#209fec'])
      + [[0, -1], [1, 1]].map(([k, d]) => trait(arc(98, 104, 74 + k * 10, Math.PI * (d > 0 ? .08 : -.32), Math.PI * (d > 0 ? .3 : -.1)), CRIST, 2.4, 6)).join(''),

    maree_haute: p => [[52, 148, .5], [148, 148, .5]].map(([x, y, s]) => `<path d="M${x - 22} ${y} L${x - 14} ${y - 92} L${x + 14} ${y - 92} L${x + 22} ${y} Z" fill="${CRIST}" opacity=".3"/>` + GLY(x, y, s, p, .44, { halo: CRIST })).join('')
      + GLY(100, 166, .56, p, .44, { halo: CRIST }) + BAT(100, 92, .52, 0) + impact(100, 156, .7, [OR_V, CRIST, '#209fec'])
      + eclat(52, 60, .7, CRIST) + eclat(148, 60, .7, CRIST),
    saut_de_maree: p => trajet('M46 140 Q98 26 148 112', p[1]) + place(carapace(), 46, 146, -20, .42).replace('<g ', '<g opacity=".5" ')
      + GLY(146, 154, .66, p, .44, { halo: CRIST }) + CAR(146, 128, .64, 10) + [[124, 106], [118, 120]].map(([x, y]) => trait(`M${x} ${y} L${x - 16} ${y - 4}`, '#ffffff', 2.4, 6)).join('')
      + eclat(98, 48, .7, CRIST),

    garde_vivante: p => pion(66, 132, .66) + pion(134, 132, .66) + pion(100, 140, .72)
      + CAR(100, 76, 1.12) + [[54, 112], [146, 112]].map(([x, y]) => eclat(x, y, .55, CRIST)).join(''),
    bouclier_lointain: p => trajet('M92 78 Q122 32 142 74', p[1]) + BAT(64, 112, .5, 40) + pion(146, 114, .9)
      + GLY(146, 150, .5, p) + plaque(146, 112, .95) + eclat(170, 70, .55, CRIST),

    colere_de_morrha: p => cou(bez([100, 180], [100, 142], [68, 126], [78, 90], 14), 42, 28) + tete(96, 76, 1.05, -16, '#ffffff')
      + vague(44, 152, .85, p, 0) + vague(156, 152, .85, p, 0, -1) + goutte(160, 92, .6, p) + goutte(146, 116, .45, p) + eclat(40, 76, .7, p[0]),
    jugement_des_marees: p => sol() + [[100, 30, 100, 66], [72, 40, 76, 78], [128, 40, 124, 78]].map(([a, b, c, d]) => trait(`M${a} ${b} L${c} ${d}`, p[0], 2.4, 6)).join('')
      + GLY(100, 48, .32, p, 1) + GLY(100, 84, .42, p, .72) + GLY(100, 122, .56, p, .44)
      + impact(100, 152, 1.25, P.neutre) + roc(46, 146, .8, 20) + roc(156, 142, .75, -30) + roc(170, 160, .5, 50),

    rempart_des_flots: p => pion(38, 124, .6) + pion(162, 124, .6) + trait(arc(100, 140, 82, Math.PI * 1.1, Math.PI * 1.9), OR_C, 3.4, 8)
      + CAR(100, 118, 1.02) + [[38, 92], [162, 92]].map(([x, y]) => plaque(x, y, .55)).join('') + eclat(100, 46, .7, CRIST),
    muraille_d_eau: p => {
      const F = [[-50, -34], [50, -34], [50, 32], [-50, 32]], cs = [];
      [-37.5, -22.5, -7.5, 7.5, 22.5, 37.5].forEach((x, i) => [-24, -6, 12, 30].forEach(y0 => { const y = y0 + (i % 2 ? 9 : 0); if (y - 7 > -34 && y + 7 < 32) cs.push([x, y]); }));
      return dalle(100, 156, 1.3) + place(
        deux([[-50, -34], [-40, -44], [60, -44], [50, -34]], [[-50, -34], [-40, -44], [10, -44], [0, -34]], '#f6f2ea', ROCHE[0], 2.6)
        + deux([[50, -34], [60, -44], [60, 22], [50, 32]], [[50, -34], [60, -44], [60, -20], [50, -10]], ROCHE[2], ROCHE[3], 2.6)
        + deux(F, [[-50, -34], [50, -34], [50, -20], [-50, -20]], ROCHE[0], ROCHE[1], 3)
        + cs.map(([x, y]) => { const h = hexa(x, y, 8.4); return `<polygon points="${h.map(q => q.join(',')).join(' ')}" fill="${ROCHE[1]}" stroke="${CRIST}" stroke-width="2.2"/>`; }).join('')
        + place(glyphe(P.neutre, 1), 0, 0, 0, .28) + encre(F, 3), 100, 110, 0, 1.08) + eclat(158, 44, .7, CRIST);
    },

    lame_de_fond: p => deux([[68, 178], [82, 128], [76, 100], [124, 100], [118, 128], [132, 178]], [[68, 178], [82, 128], [76, 100], [100, 100], [100, 178]], p[1], p[2], 3.2)
      + `<path d="M88 170 L92 128 M108 170 L106 132" stroke="${p[0]}" stroke-width="3" stroke-linecap="round"/>`
      + goutte(56, 104, .7, p, -40) + goutte(146, 102, .7, p, 40) + goutte(60, 136, .5, p, -60) + goutte(142, 136, .5, p, 60)
      + place(dalle(0, 0, 1.2), 100, 76, -8, 1) + `<path d="M84 70 L96 82 L90 92 M110 64 L112 78" stroke="${INK}" stroke-width="3" fill="none"/>` + eclat(154, 44, .6, p[0]),
    courant_de_braise: p => place(tube(bez([20, 150], [70, 120], [120, 178], [186, 136], 18), 26, 18, p[1], p[2], 3.2), 0, 0) + flamme(60, 136, .45, p) + flamme(140, 144, .42, p) + flamme(100, 126, .55, p)
      + place(dalle(0, 0, 1.2), 100, 76, -8, 1) + `<path d="M84 70 L96 82 L90 92 M110 64 L112 78" stroke="${INK}" stroke-width="3" fill="none"/>` + eclat(154, 44, .6, p[1]),

    prendre_les_coups: p => pion(136, 98, 1.1) + fleche('M60 54 Q100 22 140 50', p[1], 6) + pointe(140, 50, 40, p[2], 1)
      + fleche('M140 152 Q100 180 64 156', p[1], 6) + pointe(62, 154, 210, p[2], 1) + BOU(80, 104, .58),
    garde_de_morrha: p => {
      const pts = Array.from({ length: 26 }, (_, i) => { const a = -Math.PI * .62 + i / 25 * Math.PI * 1.85; return [r1(100 + Math.cos(a) * 54), r1(106 + Math.sin(a) * 50)]; });
      return pion(80, 104, .7) + pion(120, 104, .7) + pion(100, 120, .75)
        + tube(pts, 8, 24, TEAL_C, TEAL, 3.2) + pts.slice(3, 24).filter((_, i) => i % 3 === 0).map(([a, b]) => `<circle cx="${a}" cy="${b}" r="2.6" fill="${OR_C}" stroke="${INK}" stroke-width="1.2"/>`).join('')
        + tete(70, 52, .62, -30, CRIST, false);
    },

    coup_de_queue: p => croissant(86, 112, 70, -1.9, .1, p[1], p[0], 1.25) + queueT() + chevrons(162, 120, .7, p[1]) + roc(150, 156, .55, 20),
    queue_de_vouivre: p => [0, 1, 2].map(k => trait(`M${116 + k * 16} ${56 + k * 4} Q${146 + k * 12} ${98 + k * 4} ${128 + k * 14} ${142 + k * 2}`, k === 1 ? '#ffffff' : p[0], 3.6, 8.4)).join('')
      + patte(70, 104, 1.15, -66) + chevrons(166, 150, .66, p[1]) + roc(160, 64, .7, 20) + roc(48, 160, .6, -30),

    sang_de_vouivre: p => [[100, 34], [166, 100], [100, 166], [34, 100]].map(([x, y]) => trait(`M100 100 L${x} ${y}`, OR_C, 2.4, 6) + plaque(x, y, .62)).join('')
      + place(deux(hexa(0, 0, 44), hexa(0, 0, 44).slice(3).concat([[0, 0]]), ECAIL[0], ECAIL[1], 3.4)
        + `<polygon points="${hexa(0, 0, 32).map(q => q.join(',')).join(' ')}" fill="none" stroke="${ECAIL[2]}" stroke-width="2.4"/>`
        + `<path d="M-30 -24 L-18 -14 L-22 -2 M26 20 L16 12 L18 30" fill="none" stroke="${INK}" stroke-width="2.6"/>` + place(glyphe(p, 1), 0, 0, 0, .34), 100, 100, 0, 1),
    cocon_d_ecume: p => GLY(100, 150, .9, P.eau) + pion(100, 118, .9) + bulleDome(100, 150, 60, 92)
      + [[56, 92, .5], [146, 84, .6], [128, 50, .45]].map(([x, y, s]) => place(deux([[0, -9], [6, 0], [0, 9], [-6, 0]], [[0, -9], [-6, 0], [0, 0]], '#e6fcff', CRIST, 1.6), x, y, 0, s * 1.6)).join(''),

    maelstrom: p => gouffre(100, 100, 1.08, p) + goutte(156, 44, .6, p) + goutte(44, 156, .5, p),
    maelstrom_de_feu: p => gouffre(100, 100, 1.08, p, '#fff3c0') + flamme(156, 46, .45, p) + flamme(44, 154, .4, p) + flamme(160, 150, .34, p),

    reflux_protecteur: p => GLY(100, 144, 1.08, p, .44, { halo: CRIST }) + pion(96, 112, .78)
      + sablier(150, 62, .95) + eclat(46, 60, .6, CRIST),
    regard_de_morrha: p => ronds(100, 150, p[1], 2, 34, 8, 20) + oeil(100, 84, 1.05) + [[48, 50], [152, 50], [100, 30]].map(([x, y]) => ecaille(x, y, .9, TEAL_C, TEAL)).join('')
      + place(chevrons(0, 0, .7, p[0]), 100, 138, 90, 1),

    ancrage: p => deux([[24, 150], [70, 140], [130, 140], [176, 150], [172, 176], [28, 176]], [[24, 150], [70, 140], [130, 140], [176, 150]], SABLE[1], SABLE[2], 3)
      + `<path d="M40 160 L52 152 L48 146 M160 160 L148 152 L154 146 M86 168 L96 158 M114 168 L104 158" fill="none" stroke="${INK}" stroke-width="2.6"/>`
      + patte(68, 146, .9, -8) + patte(132, 146, .9, 8) + CAR(100, 84, .9) + roc(34, 140, .6, 10) + roc(168, 138, .65, -20),
    ancre_de_corail: p => {
      const B = [[-9, -40], [9, -40], [10, -2], [26, 2], [30, 14], [-11, 14]];
      return deux([[28, 156], [70, 146], [130, 146], [172, 156], [168, 176], [32, 176]], [[28, 156], [70, 146], [130, 146], [172, 156]], SABLE[1], SABLE[2], 3)
        + place(deux(B, [[-9, -40], [0, -40], [0, 14], [-11, 14]], '#e6c294', '#8a5a36', 3)
          + poly([[-11, 8], [30, 8], [30, 14], [-11, 14]], '#3b2f2a') + encre([[-11, 8], [30, 8], [30, 14], [-11, 14]], 2), 140, 132, 0, 1.08)
        + ancre(88, 98, 1.02, 0, CORAIL, true)
        + [88, 104].map(y => tube([[126, y + 4], [140, y - 1], [155, y + 2]], 7, 6, CORAIL[1], CORAIL[2], 2.4)).join('')
        + eclat(42, 60, .7, p[1]);
    },

    retour_des_eaux: p => coupe(100, 120, 1.25, EAU) + [[62, 54, .5], [82, 46, .6], [118, 46, .6], [138, 54, .5]].map(([x, y, s], i) => goutte(x, y, s, EAU, i < 2 ? 160 : -160)).join('')
      + fleche('M60 76 Q100 30 140 76', EAU[1], 5) + plus(100, 70, .8),
    bastion: p => deux([[22, 160], [44, 136], [156, 136], [178, 160], [174, 176], [26, 176]], [[22, 160], [44, 136], [156, 136], [178, 160]], ROCHE[1], ROCHE[2], 3)
      + CAR(100, 118, 1.12, 0, { c: ROCHE }) + corail(36, 128, .62, -20) + corail(164, 124, .55, 24)
      + roc(56, 150, .9, 10) + roc(146, 152, .8, -30) + roc(100, 160, .6, 40) + bulle(150, 56, .7, ['#ffffff', EAU[1]]) + bulle(162, 76, .5, ['#ffffff', EAU[1]]) + eclat(46, 62, .7, CRIST),

    pleine_mer: p => croissant(100, 132, 76, 3.3, 6.12, EAU[1], EAU[0], 1.22)
      + deux([[22, 156], [178, 156], [174, 176], [26, 176]], [[22, 156], [178, 156], [176, 162], [24, 162]], SABLE[1], SABLE[2], 3)
      + plus(64, 126, .8) + plus(100, 110, 1) + plus(136, 126, .8) + bulle(40, 112, .6, ['#ffffff', EAU[1]]) + bulle(160, 112, .6, ['#ffffff', EAU[1]]),
    ecume_salvatrice: p => `<path d="M42 150 L80 132 L116 142 L158 120" fill="none" stroke="${INK}" stroke-width="10" stroke-linecap="round" stroke-linejoin="round"/><path d="M42 150 L80 132 L116 142 L158 120" fill="none" stroke="#b83a44" stroke-width="5" stroke-linecap="round" stroke-linejoin="round"/>`
      + croix(62, 141, 1) + croix(98, 137, 1) + croix(138, 131, 1)
      + GLY(100, 74, .5, p, 1, { halo: CRIST }) + plus(100, 74, .9) + plus(152, 62, .7, CRIST) + plus(48, 92, .55, CRIST),
  });
})();

IconesV3.TYPES = Object.assign(IconesV3.TYPES || {}, {muraille_d_eau:'placement',ancre_de_corail:'degats',regard_de_morrha:'degats',maree_haute:'degats'});
