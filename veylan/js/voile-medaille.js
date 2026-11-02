// La médaille du V, fond animé du voile de chargement (js/scene.js) : l'image du fondateur
// retravaillée (agrandie, les douze insignes remplacés par ceux des classes de Veylan), et par-dessus
// des calques qui bougent sans le fil principal (opacité et transformations, que le navigateur anime
// seul pendant que la page construit l'île) :
// - les cristaux de l'entre-deux respirent, une lumière les balaie, des étincelles s'y allument ;
// - le cristal du cœur bat, des éclairs courent sur le V ;
// - les douze médaillons s'allument un à un avec la progression.
// Toutes les positions sont en pourcentage de l'image (1612 x 656 à l'origine), ou dans son repère
// pour les éclairs (viewBox 0 0 1612 656).
const VoileMedaille = (() => {
  const W = 1612, H = 656;
  // Les douze médaillons, dans l'ordre des aiguilles depuis le haut (tools/medaille).
  const MEDAILLONS = [
    ['vaelith', 50.03, 16.92, '#4a90ff'], ['sarkan', 56.54, 21.21, '#d9a441'], ['lyssar', 61.31, 33.16, '#2fd2a0'],
    ['oriel', 62.97, 49.24, '#ffcf4a'], ['nerith', 61.28, 65.32, '#a66bff'], ['kaldrin', 56.54, 77.27, '#ff7a45'],
    ['karsh', 50.03, 81.55, '#e83a3a'], ['mirel', 43.55, 77.27, '#7ff0d0'], ['lheth', 38.81, 65.4, '#8fa8ff'],
    ['fennal', 37.07, 49.09, '#6fdc8c'], ['kaelum', 38.75, 33.23, '#ff4d8a'], ['thalor', 43.49, 21.29, '#9fb0c8'],
  ];
  // Les étincelles : les points les plus vifs des cristaux de l'entre-deux.
  const ECLATS = [[30.02, 50], [65.07, 82.16], [32.32, 71.34], [66.81, 19.66], [31.33, 25.91], [30.33, 35.21], [69.91, 53.96], [67.8, 72.26],
    [24.13, 40.09], [64.39, 14.18], [29.53, 63.87], [77.67, 54.27], [72.83, 39.33], [45.29, 98.63], [31.82, 78.51], [73.14, 48.48], [25.19, 66.01],
    [55.65, 95.58], [30.89, 17.38], [26.3, 57.47], [65.88, 8.23], [69.6, 46.34], [41.94, 95.12], [76.3, 17.53], [69.67, 61.43], [70.53, 33.69],
    [27.67, 45.12], [36.29, 83.54], [27.3, 22.1], [72.33, 25], [21.34, 26.52], [67.49, 26.68], [38.71, 5.18], [32.44, 85.37]];
  // Le V, dans le repère de l'image : ses bords extérieurs et le haut de ses branches.
  const BORDS = [
    [[690, 237], [802, 452]], [[925, 237], [802, 452]],
    [[692, 236], [798, 232]], [[836, 234], [923, 237]],
  ];
  const COEUR = [[786, 262], [800, 300], [784, 330], [770, 290]];
  // Le contour du V : le haut de la branche gauche, l'encoche, la branche droite, la pointe.
  const CONTOUR = [[692, 236], [798, 232], [802, 376], [836, 234], [923, 237], [802, 452], [692, 236]];
  // Le même, qui crépite : chaque côté en petits zigzags.
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
  // Le cristal du cœur (assets/ui/medaille-coeur.webp) : sa boîte dans l'image.
  const BOITE_COEUR = [664, 174, 922, 456];
  const pc = (v, t) => (v / t * 100).toFixed(3) + '%';

  // Un éclair de a à b : le milieu déplacé de côté, récursivement (une ligne brisée), et parfois une
  // branche courte.
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

  // Un tracé au hasard : un éclair qui court le long d'un bord du V, un arc qui en jaillit, ou un
  // éclair du cristal vers une branche.
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
      // vers l'extérieur du V (loin de son centre, 808 300)
      let nx = -dy / l, ny = dx / l;
      if ((p[0] + nx - 808) ** 2 + (p[1] + ny - 300) ** 2 < (p[0] - 808) ** 2 + (p[1] - 300) ** 2) { nx = -nx; ny = -ny; }
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
    // Une étincelle qui court sur le contour du V (deux, en décalé).
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

  // Les éclairs prennent une forme neuve à chaque fois qu'ils se rallument.
  function demarrer(racine) {
    let graine = (Date.now() % 100000) + 1;
    const alea = () => { graine = (graine * 16807) % 2147483647; return (graine - 1) / 2147483646; };
    // L'image d'abord : les effets ne s'allument qu'une fois la médaille là.
    const boite = racine.querySelector('.vy-medaille'), img = boite && boite.querySelector('.vy-medaille__image');
    // decode() : l'image est décodée et prête à peindre (sans lui, le navigateur peint les grandes
    // images en différé, et l'on verrait les éclairs sur du noir).
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

  // Les médaillons allumés : un par douzième de la progression (0 à 1).
  function progres(racine, p) {
    const n = Math.floor(Math.min(1, Math.max(0, p)) * 12 + 1e-6);
    racine.querySelectorAll('.vy-medaille__pastille').forEach((e, i) => e.classList.toggle('on', i < n));
  }

  const IMAGES = ['assets/ui/medaille.webp', 'assets/ui/medaille-cristaux.webp', 'assets/ui/medaille-coeur.webp'];
  return { html, demarrer, progres, MEDAILLONS, IMAGES, trace };
})();
