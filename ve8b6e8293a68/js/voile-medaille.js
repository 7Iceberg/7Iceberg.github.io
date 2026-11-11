const VoileMedaille = (() => {
  const W = 2000, H = 1115;
  const MEDAILLONS = [
    ['nerith', 50.30, 20.63, '#8fb4ff'], ['lyssar', 60.42, 27.16, '#e8f0f4'], ['oriel', 65.72, 43.56, '#f2c24a'],
    ['velmar', 63.89, 62.20, '#6fe0e8'], ['fennal', 55.80, 74.39, '#6fe0e8'], ['sarkan', 45.05, 74.48, '#9fe07a'],
    ['thalor', 36.91, 62.29, '#9fe07a'], ['orvald', 35.03, 43.47, '#9fe07a'], ['karsh', 40.38, 27.25, '#d0303c'],
  ];
  const ECLATS = [[70.3, 14.35], [73.65, 21.97], [28.3, 32.29], [67.7, 17.04], [42.1, 95.16], [80.15, 22.51], [73.35, 15.87], [25.6, 25.02], [37.1, 10.94], [73.75, 44.39], [25.65, 49.87], [15.25, 28.61], [19.2, 64.22], [75.15, 59.73], [31.1, 20.36], [70.75, 24.75], [22.75, 78.12], [74.35, 53.63], [57.25, 90.76], [75.35, 35.7], [25.9, 72.91], [24.25, 35.16], [72.35, 71.48], [78.45, 47.89], [27.15, 18.92], [81.45, 35.34], [42.75, 89.87], [73.8, 65.29], [64.85, 15.34], [61.7, 88.43], [72.25, 6.64], [76.3, 41.52], [63.95, 94.8], [78.1, 58.74]];
  const BORDS = [
    [[835, 415], [1000, 717]], [[1180, 415], [1000, 717]],
    [[835, 415], [972, 417]], [[1060, 417], [1180, 415]],
  ];
  const COEUR = [[980, 440], [1005, 480], [985, 540], [955, 500]];
  const CONTOUR = [[835, 415], [972, 417], [1000, 607], [1060, 417], [1180, 415], [1000, 717], [835, 415]];
  function contourCrepitant(alea) {
    let d = '';
    for (let i = 0; i < CONTOUR.length - 1; i++) {
      const a = CONTOUR[i], b = CONTOUR[i + 1], dx = b[0] - a[0], dy = b[1] - a[1], l = Math.hypot(dx, dy), n = Math.max(3, Math.round(l / 9));
      for (let k = i ? 1 : 0; k <= n; k++) {
        const t = k / n, j = k && k < n ? (alea() - 0.5) * 5 : 0;
        d += (d ? 'L' : 'M') + (a[0] + dx * t - dy / l * j).toFixed(1) + ' ' + (a[1] + dy * t + dx / l * j).toFixed(1);
      }
    }
    return d;
  }
  const BOITE_COEUR = [900, 400, 1120, 700];
  const pc = (v, t) => (v / t * 100).toFixed(3) + '%';

  function eclair(a, b, alea) {
    const pts = [a, b];
    let ecart = Math.hypot(b[0] - a[0], b[1] - a[1]) * 0.22;
    for (let n = 0; n < 5; n++) {
      for (let i = pts.length - 1; i > 0; i--) {
        const p = pts[i - 1], q = pts[i];
        const dx = q[0] - p[0], dy = q[1] - p[1], l = Math.hypot(dx, dy) || 1;
        const d = (alea() - 0.5) * ecart;
        pts.splice(i, 0, [(p[0] + q[0]) / 2 - dy / l * d, (p[1] + q[1]) / 2 + dx / l * d]);
      }
      ecart *= 0.55;
    }
    let d = 'M' + pts.map(p => p[0].toFixed(1) + ' ' + p[1].toFixed(1)).join('L');
    if (alea() < 0.6) {
      const k = 2 + Math.floor(alea() * (pts.length - 4)), o = pts[k];
      const ang = Math.atan2(b[1] - a[1], b[0] - a[0]) + (alea() < 0.5 ? -1 : 1) * (0.5 + alea() * 0.6);
      const len = 10 + alea() * 18;
      d += ' M' + o[0].toFixed(1) + ' ' + o[1].toFixed(1) + 'L' + (o[0] + Math.cos(ang) * len * 0.5 + (alea() - 0.5) * 4).toFixed(1) + ' ' + (o[1] + Math.sin(ang) * len * 0.5 + (alea() - 0.5) * 4).toFixed(1) +
        'L' + (o[0] + Math.cos(ang) * len).toFixed(1) + ' ' + (o[1] + Math.sin(ang) * len).toFixed(1);
    }
    return d;
  }
  const lerp = (s, t) => [s[0][0] + (s[1][0] - s[0][0]) * t, s[0][1] + (s[1][1] - s[0][1]) * t];

  function trace(alea) {
    const genre = alea();
    const bord = BORDS[Math.floor(alea() * BORDS.length)];
    if (genre < 0.5) {
      const t = alea() * 0.75, u = Math.min(1, t + 0.12 + alea() * 0.25);
      return eclair(lerp(bord, t), lerp(bord, u), alea);
    }
    if (genre < 0.8) {
      const p = lerp(bord, 0.1 + alea() * 0.8);
      const dx = bord[1][0] - bord[0][0], dy = bord[1][1] - bord[0][1], l = Math.hypot(dx, dy);
      let nx = -dy / l, ny = dx / l;
      if ((p[0] + nx - 1003) ** 2 + (p[1] + ny - 520) ** 2 < (p[0] - 1003) ** 2 + (p[1] - 520) ** 2) { nx = -nx; ny = -ny; }
      const len = 14 + alea() * 26;
      return eclair(p, [p[0] + nx * len + (alea() - 0.5) * 10, p[1] + ny * len + (alea() - 0.5) * 10], alea);
    }
    const c = COEUR[Math.floor(alea() * COEUR.length)];
    return eclair(c, lerp(BORDS[Math.floor(alea() * 2)], 0.2 + alea() * 0.4), alea);
  }

  const N_ECLAIRS = 14;
  function html() {
    const med = MEDAILLONS.map(([id, x, y, c], i) => `<i class="vy-medaille__pastille" data-i="${i}" data-classe="${id}" style="left:${x}%;top:${y}%;--c:${c}"></i>`).join('');
    const ecl = ECLATS.map(([x, y], i) => `<i class="vy-medaille__eclat" style="left:${x}%;top:${y}%;animation-delay:${(-(i * 0.731) % 5).toFixed(2)}s;animation-duration:${(2.6 + (i * 0.37) % 2.4).toFixed(2)}s"></i>`).join('');
    const fil = Array.from({ length: N_ECLAIRS }, (_, i) =>
      `<svg class="vy-medaille__eclair" viewBox="0 0 ${W} ${H}" preserveAspectRatio="none" style="animation-delay:${(i * 0.29).toFixed(2)}s;animation-duration:${(1.6 + (i * 0.53) % 1.6).toFixed(2)}s"><path class="lueur"/><path class="halo"/><path class="coeur"/></svg>`).join('');
    const contour = '<svg class="vy-medaille__contour" viewBox="0 0 ' + W + ' ' + H + '" preserveAspectRatio="none">' +
      [0, 1].map(k => `<g style="animation-delay:${-k * 1.7}s"><path class="halo"/><path class="coeur"/></g>`).join('') + '</svg>';
    const [cx0, cy0, cx1, cy1] = BOITE_COEUR;
    return '<div class="vy-medaille">' +
      '<img class="vy-medaille__image" src="assets/ui/medaille.webp" alt="" decoding="sync">' +
      '<img class="vy-medaille__cristaux" src="assets/ui/medaille-cristaux.webp" alt="" decoding="async">' +
      '<div class="vy-medaille__balayage"><img src="assets/ui/medaille-cristaux.webp" alt="" decoding="async"></div>' +
      `<img class="vy-medaille__coeur" src="assets/ui/medaille-coeur.webp" alt="" decoding="async" style="left:${pc(cx0, W)};top:${pc(cy0, H)};width:${pc(cx1 - cx0, W)};height:${pc(cy1 - cy0, H)}">` +
      med + ecl + contour + fil + '</div>';
  }

  function demarrer(racine) {
    let graine = (Date.now() % 100000) + 1;
    const alea = () => { graine = (graine * 16807) % 2147483647; return (graine - 1) / 2147483646; };
    const boite = racine.querySelector('.vy-medaille'), img = boite && boite.querySelector('.vy-medaille__image');
    if (img) {
      const prete = () => boite.classList.add('prete');
      if (img.decode) img.decode().then(prete, () => img.addEventListener('load', prete, { once: true }));
      else if (img.complete && img.naturalWidth) prete(); else img.addEventListener('load', prete, { once: true });
    }
    racine.querySelectorAll('.vy-medaille__contour path').forEach(p => {
      p.setAttribute('d', contourCrepitant(alea));
      const l = p.getTotalLength ? p.getTotalLength() : 1000;
      p.style.setProperty('--l', l.toFixed(1));
      p.style.strokeDasharray = (l * 0.085).toFixed(1) + ' ' + (l * 0.915).toFixed(1);
    });
    racine.querySelectorAll('.vy-medaille__eclair').forEach(svg => {
      const dessiner = () => { const d = trace(alea); svg.querySelectorAll('path').forEach(p => p.setAttribute('d', d)); };
      dessiner();
      svg.addEventListener('animationiteration', dessiner);
    });
  }

  function progres(racine, p) {
    const n = Math.floor(Math.min(1, Math.max(0, p)) * MEDAILLONS.length + 1e-6);
    racine.querySelectorAll('.vy-medaille__pastille').forEach((e, i) => e.classList.toggle('on', i < n));
  }

  const IMAGES = ['assets/ui/medaille.webp', 'assets/ui/medaille-cristaux.webp', 'assets/ui/medaille-coeur.webp'];
  return { html, demarrer, progres, MEDAILLONS, IMAGES, trace };
})();
