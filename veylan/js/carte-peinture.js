// Peinture de la carte du monde, vue de dessus : chaque carte du monde peinte d'après son plan
// (docs/SPEC-CONTENU.md : sol, chemins, herbe, eau, murs, arbres, décors, sorties), une seule
// fois, dans un canvas hors écran. Aussi : la version voilée des cartes inexplorées, les nuages
// du brouillard, les pastilles (relais, donjon, artisan, marchand, quêtes) et les épingles. La
// carte en 2D (js/hud-carte.js) et la vue 3D (js/carte-3d.js) se servent des mêmes images.
//
// Rendu « peint » : taches de couleur douces pour le sol, masques adoucis (bords fondus des
// chemins, écume des rives, lèvre claire autour du vide), ombre de contact au pied des murs et
// des rochers, ombres portées floues sous les arbres. Lumière en haut à gauche, comme le jeu.
const CartePeinture = (() => {
  const T = 16;                       // pixels par case du plan : une carte de 15 cases fait 240 px
  const cartes = new Map(), brumes = new Map(), arts = new Map();

  const canvas = (w, h) => { const c = document.createElement('canvas'); c.width = Math.max(1, Math.round(w)); c.height = Math.max(1, Math.round(h)); return c; };
  const scratch = {};
  // Canvas de travail réutilisés : un masque, son flou, un calque.
  const travail = (k, w, h) => { let c = scratch[k]; if (!c || c.width !== w || c.height !== (h || w)) c = scratch[k] = canvas(w, h || w); return c; };

  // ----- Hasard déterministe et bruit -----
  const hashStr = s => { let h = 2166136261; for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619); return h >>> 0; };
  const rng = seed => () => { seed = (seed + 0x6d2b79f5) | 0; let t = Math.imul(seed ^ (seed >>> 15), 1 | seed); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  const h2 = (x, y, s) => { let h = (Math.imul(x, 374761393) + Math.imul(y, 668265263) + Math.imul(s, 974634211)) | 0; h = Math.imul(h ^ (h >>> 13), 1274126177); return ((h ^ (h >>> 16)) >>> 0) / 4294967296; };
  const vnoise = (x, y, s) => { const xi = Math.floor(x), yi = Math.floor(y), fx = x - xi, fy = y - yi, u = fx * fx * (3 - 2 * fx), v = fy * fy * (3 - 2 * fy); const a = h2(xi, yi, s), b = h2(xi + 1, yi, s), c = h2(xi, yi + 1, s), d = h2(xi + 1, yi + 1, s); return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v; };
  const fbm = (x, y, s, o) => { let v = 0, a = 0.5, f = 1, n = 0; for (let k = 0; k < (o || 4); k++) { v += a * vnoise(x * f, y * f, s + k * 31); n += a; a *= 0.5; f *= 2; } return v / n; };

  // ----- Couleurs -----
  const rgb = h => { const n = parseInt(String(h).slice(1), 16); return [n >> 16, (n >> 8) & 255, n & 255]; };
  const mix = (a, b, t) => { const A = rgb(a), B = rgb(b); return '#' + A.map((v, i) => Math.round(v + (B[i] - v) * t).toString(16).padStart(2, '0')).join(''); };
  const rgba = (h, a) => { const [r, g, b] = rgb(h); return `rgba(${r},${g},${b},${a})`; };

  // ----- Palettes vues du ciel : la roche des régions (docs/DIRECTION-ARTISTIQUE.md), en plein jour -----
  const REGIONS = {
    // Orsane : calcaire des Cimes, herbes pastel, toits d'ardoise bleue, or des lanternes.
    orsane: {
      herbe: ['#a2c97a', '#8cba66', '#b8d98a', '#7ead5c', '#98c270'], herbeOmbre: '#456f3e',
      touffe: '#5f8f4a', touffeClaire: '#d6eba6', fleurs: ['#fff6dc', '#f6d36b', '#eab8dc', '#bcd8ff'], tauxFleurs: 0.07, tauxCailloux: 0.05, tauxBuissons: 0.05,
      chemin: '#e0d3b4', cheminBord: '#b5a281', cheminClair: '#f3ead2', caillou: '#bdb5a3',
      dalle: '#e9e2d2', dalleJoint: '#b9ae98',
      roche: '#cfd3dc', rocheSombre: '#949cad', rocheClaire: '#f1f2f5', encre: '#3b4260', mousse: '#7aa865',
      toit: '#7d8db1', toitSombre: '#596891', toitClair: '#a8b5d1', faitage: '#e2c690', mur: '#ebe5d6', murSombre: '#b5ad9b',
      feuillage: '#5e9a58', feuillageClair: '#98cf7c', feuillageSombre: '#386a42', tronc: '#7a5a3e',
      eau: '#62b4e2', eauProfonde: '#3279b9', eauClaire: '#d9f3ff', ecume: '#f5fbff',
      vide: '#16224a', videProfond: '#070c1c', videBord: '#ede6d6', etoile: '#d6e6ff',
      lanterne: '#f2b134', lueur: '#ffe7a3', cristal: '#3fc8e9', cristalClair: '#b8f0ff', or: '#e2c690', brume: '#d3dbea',
    },
    // Kaldum : basalte et scorie, poussière chaude, toits de brique, lave et braises.
    kaldum: {
      herbe: ['#8a7b6f', '#7a6c61', '#988878', '#6e6158', '#837468'], herbeOmbre: '#3d322c',
      touffe: '#5e4f45', touffeClaire: '#c29a78', fleurs: ['#ff8a4a', '#ffb37a', '#ffd27a'], tauxFleurs: 0.02, tauxCailloux: 0.1, tauxBuissons: 0.015,
      chemin: '#b59c84', cheminBord: '#6e5c50', cheminClair: '#cfb69b', caillou: '#5e5049',
      dalle: '#9d8d80', dalleJoint: '#55463e',
      roche: '#7d6c60', rocheSombre: '#3f3330', rocheClaire: '#ab998c', encre: '#241a18', mousse: '#8a6a3a',
      toit: '#8c3f2b', toitSombre: '#5f291c', toitClair: '#b5583c', faitage: '#ffb37a', mur: '#9a887a', murSombre: '#56473f',
      feuillage: '#5d4c41', feuillageClair: '#8a7260', feuillageSombre: '#33281f', tronc: '#3a2e28', mort: true,
      eau: '#ff7a2a', eauProfonde: '#c43c10', eauClaire: '#ffe08a', ecume: '#ffd27a', lave: true,
      vide: '#1d1210', videProfond: '#080404', videBord: '#ab998c', etoile: '#ffb37a',
      lanterne: '#ff6a2b', lueur: '#ffb37a', cristal: '#3fc8e9', cristalClair: '#b8f0ff', or: '#ffb37a', brume: '#ddd0c6',
    },
  };
  // Les régions à venir reprennent le calcaire d'Orsane, teinté de leur roche, en attendant leur contenu.
  for (const [id, roche, sombre, encre, lanterne] of [['thessa', '#b9c7b4', '#5f7a74', '#22403d', '#35d6c8'], ['lisiere', '#b5aeb4', '#5c5466', '#2a2432', '#d08cff'], ['basvoiles', '#4a3b5c', '#1e1830', '#0e0a16', '#c0266e']]) {
    REGIONS[id] = Object.assign({}, REGIONS.orsane, { roche, rocheSombre: sombre, rocheClaire: mix(roche, '#ffffff', 0.5), encre, lanterne, lueur: mix(lanterne, '#ffffff', 0.5), herbe: REGIONS.orsane.herbe.map(c => mix(c, roche, 0.35)) });
  }
  // Une nuance par zone : la ville et ses dalles, les prés en fleurs, l'alpage caillouteux, les
  // Toiles et leurs fils, les Éboulis, les galeries sombres, les vapeurs, la fonderie.
  const ZONES = {
    orsane_cimes: { ville: true, herbe: ['#a9d084', '#94c270', '#bfdf96', '#87b565', '#a3cb7c'], tauxFleurs: 0.06, tauxBuissons: 0.03 },
    orsane_clairieres: { herbe: ['#9bd06a', '#84bf56', '#b4de7c', '#74b04b', '#9ccd66'], tauxFleurs: 0.16, tauxBuissons: 0.07 },
    orsane_sentiers: { herbe: ['#a9c088', '#97b277', '#bccf9a', '#8aa56c', '#a2ba80'], tauxCailloux: 0.12, tauxFleurs: 0.05, tauxBuissons: 0.03 },
    orsane_toiles: { herbe: ['#a9b598', '#9aa78b', '#bcc4aa', '#8e9a82', '#b0afa2'], toiles: true, tauxFleurs: 0.03, tauxBuissons: 0.04, feuillage: '#6a8f66', feuillageClair: '#a2c498', feuillageSombre: '#425e46' },
    orsane_eboulis: { herbe: ['#cdbd92', '#bfad83', '#dccca4', '#b09c76', '#c6b48a'], tauxCailloux: 0.34, tauxFleurs: 0.02, tauxBuissons: 0.02 },
    kaldum_ville: { ville: true },
    kaldum_galeries: { herbe: ['#6f6259', '#635750', '#7b6d62', '#584d47', '#6a5d54'], grotte: true },
    kaldum_vapeurs: { herbe: ['#8f7a6c', '#816d60', '#9d887a', '#746256', '#897466'], vapeur: true },
    kaldum_fonderie: { herbe: ['#8f6a58', '#81604f', '#9c7764', '#735446', '#896553'], braises: true },
  };
  const palette = zone => Object.assign({}, REGIONS[zone && zone.palette] || REGIONS[zone && zone.region] || REGIONS.orsane, (zone && ZONES[zone.id]) || {});
  // Hauteur de chaque zone, pour le relief et la vue 3D : les Cimes tout en haut, les Galeries
  // de Kaldum au ras de la roche (unités libres, 6 au plus).
  const HAUTEURS = { orsane_cimes: 6, orsane_clairieres: 2, orsane_sentiers: 4.4, orsane_toiles: 3.6, orsane_eboulis: 3, kaldum_ville: 2.4, kaldum_galeries: 1.2, kaldum_vapeurs: 1.7, kaldum_fonderie: 2.6 };
  const hauteur = zone => (zone && HAUTEURS[zone.id]) || 2;

  const TYPE = { '#': 'roc', 'T': 'arbre', '~': 'eau', 'o': 'vide', ',': 'chemin', 'n': 'chemin', 's': 'chemin', 'e': 'chemin', 'w': 'chemin' };

  // Grain de peinture : un motif de bruit gris, posé en lumière douce.
  let grainCv = null;
  function grain(c, S, alpha, mode) {
    if (!grainCv) {
      const N = 128;
      grainCv = canvas(N, N);
      const g = grainCv.getContext('2d'), img = g.createImageData(N, N), d = img.data;
      for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
        const v = Math.round(70 + 120 * (0.6 * fbm(x / 9, y / 9, 5, 3) + 0.4 * h2(x, y, 9)));
        const i = (y * N + x) * 4; d[i] = d[i + 1] = d[i + 2] = v; d[i + 3] = 255;
      }
      g.putImageData(img, 0, 0);
    }
    c.save(); c.globalCompositeOperation = mode || 'soft-light'; c.globalAlpha = alpha;
    c.fillStyle = c.createPattern(grainCv, 'repeat'); c.fillRect(0, 0, S, S);
    c.restore();
  }

  // Le sol : un champ de taches de couleur, petit et agrandi en douceur, pour des teintes fondues.
  function champ(c, S, couleurs, seed) {
    const n = 30, m = travail('champ', n), g = m.getContext('2d'), img = g.createImageData(n, n), d = img.data;
    const cols = couleurs.map(rgb);
    for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) {
      const v = Math.min(0.999, Math.max(0, fbm(x / 7 + seed % 97, y / 7, seed % 13, 3) * 1.25 - 0.12)) * (cols.length - 1);
      const i0 = Math.floor(v), t = v - i0, a = cols[i0], b = cols[Math.min(cols.length - 1, i0 + 1)];
      const i = (y * n + x) * 4;
      d[i] = a[0] + (b[0] - a[0]) * t; d[i + 1] = a[1] + (b[1] - a[1]) * t; d[i + 2] = a[2] + (b[2] - a[2]) * t; d[i + 3] = 255;
    }
    g.putImageData(img, 0, 0);
    c.save(); c.imageSmoothingEnabled = true; c.imageSmoothingQuality = 'high';
    c.drawImage(m, 0, 0, n, n, -S / n, -S / n, S + 2 * S / n, S + 2 * S / n);
    c.restore();
  }

  // Masque d'un type de case : un disque par case, des ponts vers les voisines du même type, puis
  // un adoucissement (réduction puis agrandissement) pour des bords fondus. `test` borne lui-même.
  function masque(N, test, r, flou) {
    const S = N * T, m = travail('masque', S), c = m.getContext('2d');
    c.setTransform(1, 0, 0, 1, 0, 0); c.clearRect(0, 0, S, S); c.fillStyle = '#fff';
    const rr = r * T;
    for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
      if (!test(x, y)) continue;
      const cx = (x + 0.5) * T, cy = (y + 0.5) * T;
      c.beginPath(); c.arc(cx, cy, rr, 0, Math.PI * 2); c.fill();
      if (test(x + 1, y)) c.fillRect(cx, cy - rr, T, rr * 2);
      if (test(x, y + 1)) c.fillRect(cx - rr, cy, rr * 2, T);
      if (test(x - 1, y) && x === 0) c.fillRect(0, cy - rr, cx, rr * 2);
      if (test(x, y - 1) && y === 0) c.fillRect(cx - rr, 0, rr * 2, cy);
      if (test(x + 1, y) && test(x, y + 1) && test(x + 1, y + 1)) c.fillRect(cx, cy, T, T);
    }
    return adoucir(m, flou);
  }

  // Adoucit un masque : réduit puis agrandi, les bords se fondent sur quelques pixels.
  function adoucir(m, flou) {
    if (!flou) return m;
    const S = m.width, c = m.getContext('2d');
    const f = travail('flou', Math.round(S / (2 * flou))), g = f.getContext('2d');
    g.clearRect(0, 0, f.width, f.height); g.imageSmoothingEnabled = true; g.drawImage(m, 0, 0, f.width, f.height);
    c.clearRect(0, 0, S, S); c.imageSmoothingEnabled = true; c.imageSmoothingQuality = 'high'; c.drawImage(f, 0, 0, S, S);
    return m;
  }

  // Masque d'un tracé : des lignes à bouts ronds, adoucies.
  function masqueTrace(S, lignes, largeur, flou) {
    const m = travail('masque', S), c = m.getContext('2d');
    c.setTransform(1, 0, 0, 1, 0, 0); c.clearRect(0, 0, S, S);
    c.strokeStyle = '#fff'; c.lineWidth = largeur; c.lineCap = 'round'; c.lineJoin = 'round';
    for (const l of lignes) { c.beginPath(); l.forEach((p, i) => (i ? c.lineTo(p[0], p[1]) : c.moveTo(p[0], p[1]))); c.stroke(); }
    return adoucir(m, flou);
  }

  // Lissage d'une ligne brisée (Chaikin) : des coudes arrondis, comme tracés à la main.
  const chaikin = pts => { if (pts.length < 3) return pts; const o = [pts[0]]; for (let i = 0; i < pts.length - 1; i++) { const a = pts[i], b = pts[i + 1]; o.push([a[0] * 0.75 + b[0] * 0.25, a[1] * 0.75 + b[1] * 0.25], [a[0] * 0.25 + b[0] * 0.75, a[1] * 0.25 + b[1] * 0.75]); } o.push(pts[pts.length - 1]); return o; };

  // Sentiers : de chaque sortie au cœur de la carte (relais, porte, ou la case libre la plus
  // centrale), par le plus court chemin praticable, un peu tremblé puis lissé. Ils relient les
  // cartes voisines d'une case à l'autre. Renvoie les lignes et les cases traversées.
  function sentiers(N, kAt, ty, R) {
    const libre = (x, y) => x >= 0 && y >= 0 && x < N && y < N && !['roc', 'arbre', 'eau', 'vide'].includes(ty(x, y));
    let hub = null, best = 1e9;
    for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
      const k = kAt(x, y);
      if (k === 'Z') { hub = [x, y]; best = -2; }
      else if (k === 'D' && best > -2) { hub = [x, y]; best = -1; }
      else if (best >= 0 && libre(x, y)) { const d = Math.hypot(x - (N - 1) / 2, y - (N - 1) / 2); if (d < best) { best = d; hub = [x, y]; } }
    }
    const cases = new Set(), lignes = [];
    if (!hub) return { lignes, cases };
    // Plus court chemin pondéré par un bruit : le sentier serpente au lieu de filer droit.
    const graine = Math.floor(R() * 1000), cout = (x, y) => 1 + 2.4 * fbm(x / 3.2, y / 3.2, graine, 2);
    const dist = new Map([[hub[0] + ',' + hub[1], 0]]), prev = new Map([[hub[0] + ',' + hub[1], null]]), ouverts = [hub];
    while (ouverts.length) {
      let bi = 0;
      for (let i = 1; i < ouverts.length; i++) if (dist.get(ouverts[i][0] + ',' + ouverts[i][1]) < dist.get(ouverts[bi][0] + ',' + ouverts[bi][1])) bi = i;
      const [x, y] = ouverts.splice(bi, 1)[0], d0 = dist.get(x + ',' + y);
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const nx = x + dx, ny = y + dy, k = nx + ',' + ny;
        if (!libre(nx, ny)) continue;
        const d = d0 + cout(nx, ny);
        if (!dist.has(k) || d < dist.get(k)) { if (!dist.has(k)) ouverts.push([nx, ny]); dist.set(k, d); prev.set(k, [x, y]); }
      }
    }
    for (const d of ['n', 's', 'e', 'w']) {
      const sorties = [];
      for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) if (kAt(x, y) === d) sorties.push([x, y]);
      if (!sorties.length) continue;
      const [sx, sy] = sorties[Math.floor(sorties.length / 2)];
      if (!prev.has(sx + ',' + sy)) continue;
      const o = { n: [0, -1], s: [0, 1], e: [1, 0], w: [-1, 0] }[d];
      const pts = [[(sx + 0.5 + o[0] * 0.9) * T, (sy + 0.5 + o[1] * 0.9) * T]];
      let cur = [sx, sy], i = 0;
      while (cur) {
        cases.add(cur[0] + ',' + cur[1]);
        const j = i++ && prev.get(cur[0] + ',' + cur[1]) ? 0.22 : 0;
        pts.push([(cur[0] + 0.5 + (R() - 0.5) * j * 2) * T, (cur[1] + 0.5 + (R() - 0.5) * j * 2) * T]);
        cur = prev.get(cur[0] + ',' + cur[1]);
      }
      lignes.push(chaikin(chaikin(pts)));
    }
    return { lignes, cases };
  }

  // Pose un calque masqué : `peint(ctx)` remplit le calque, le masque découpe, on compose.
  function calque(c, S, m, peint, alpha, dx, dy) {
    const l = travail('calque', S), g = l.getContext('2d');
    g.setTransform(1, 0, 0, 1, 0, 0); g.globalCompositeOperation = 'source-over'; g.globalAlpha = 1; g.clearRect(0, 0, S, S);
    if (typeof peint === 'string') { g.fillStyle = peint; g.fillRect(0, 0, S, S); } else peint(g);
    g.globalCompositeOperation = 'destination-in'; g.drawImage(m, 0, 0);
    c.save(); c.globalAlpha = alpha == null ? 1 : alpha; c.drawImage(l, dx || 0, dy || 0); c.restore();
  }

  const poly = (c, pts) => { c.beginPath(); c.moveTo(pts[0][0], pts[0][1]); for (let i = 1; i < pts.length; i++) c.lineTo(pts[i][0], pts[i][1]); c.closePath(); };

  // ----- Petits peintres -----

  function rocher(c, x, y, r, P, R) {
    const pts = [];
    const n = 7;
    for (let i = 0; i < n; i++) { const a = (i / n) * Math.PI * 2 + R() * 0.5, rr = r * (0.78 + R() * 0.3); pts.push([x + Math.cos(a) * rr, y + Math.sin(a) * rr * 0.9]); }
    c.fillStyle = rgba(P.encre, 0.2); poly(c, pts.map(p => [p[0] + r * 0.2, p[1] + r * 0.28])); c.fill();
    const g = c.createLinearGradient(x - r, y - r, x + r, y + r);
    g.addColorStop(0, P.rocheClaire); g.addColorStop(0.45, P.roche); g.addColorStop(1, P.rocheSombre);
    c.fillStyle = g; poly(c, pts); c.fill();
    c.strokeStyle = rgba(P.encre, 0.32); c.lineWidth = 0.8; c.stroke();
    c.fillStyle = 'rgba(255,255,255,0.28)'; c.beginPath(); c.moveTo(pts[3][0] * 0.5 + x * 0.5, pts[3][1] * 0.5 + y * 0.5); c.lineTo(pts[4][0], pts[4][1]); c.lineTo(pts[5][0], pts[5][1]); c.closePath(); c.fill();
    if (R() < 0.45) { c.strokeStyle = rgba(P.encre, 0.28); c.lineWidth = 0.7; c.beginPath(); c.moveTo(x - r * 0.1, y - r * 0.4); c.lineTo(x + r * 0.1, y); c.lineTo(x - r * 0.05, y + r * 0.35); c.stroke(); }
    if (P.mousse && !P.lave && R() < 0.35) { c.fillStyle = rgba(P.mousse, 0.65); c.beginPath(); c.ellipse(x - r * 0.3, y - r * 0.35, r * 0.35, r * 0.2, -0.4, 0, Math.PI * 2); c.fill(); }
  }

  // Colonne de basalte vue de dessus : un hexagone et son flanc, parfois une veine de braise.
  function basalte(c, x, y, r, P, R) {
    const hexa = (cx, cy, rr) => { const pts = []; for (let i = 0; i < 6; i++) { const a = Math.PI / 6 + (i * Math.PI) / 3; pts.push([cx + Math.cos(a) * rr, cy + Math.sin(a) * rr]); } return pts; };
    c.fillStyle = mix(P.rocheSombre, P.encre, 0.3); poly(c, hexa(x + r * 0.16, y + r * 0.26, r)); c.fill();
    const g = c.createLinearGradient(x - r, y - r, x + r, y + r);
    g.addColorStop(0, P.rocheClaire); g.addColorStop(0.5, P.roche); g.addColorStop(1, mix(P.roche, P.rocheSombre, 0.6));
    c.fillStyle = g; poly(c, hexa(x, y, r)); c.fill();
    c.strokeStyle = rgba(P.encre, 0.5); c.lineWidth = 0.8; c.stroke();
    c.strokeStyle = 'rgba(255,255,255,0.18)'; poly(c, hexa(x, y, r * 0.62)); c.stroke();
    if (R() < 0.22) { c.save(); c.strokeStyle = rgba(P.lanterne, 0.75); c.lineWidth = 0.9; c.beginPath(); c.moveTo(x - r * 0.4, y - r * 0.1); c.lineTo(x, y + r * 0.1); c.lineTo(x + r * 0.35, y - r * 0.2); c.stroke(); c.restore(); }
  }

  // Un arbre vu de dessus : une couronne de lobes, éclairée en haut à gauche, des touches de feuilles.
  function couronne(c, x, y, r, P, R) {
    const n = 6 + Math.floor(R() * 3);
    const lobes = [];
    for (let i = 0; i < n; i++) { const a = (i / n) * Math.PI * 2 + R() * 0.4, d = r * (0.42 + R() * 0.14); lobes.push([x + Math.cos(a) * d, y + Math.sin(a) * d, r * (0.48 + R() * 0.12)]); }
    const forme = e => { c.beginPath(); c.arc(x, y, r * 0.72 + e, 0, Math.PI * 2); for (const [lx, ly, lr] of lobes) { c.moveTo(lx + lr + e, ly); c.arc(lx, ly, lr + e, 0, Math.PI * 2); } };
    // Le liseré : la même forme un peu plus grande, dans l'encre du feuillage (jamais noire).
    c.fillStyle = rgba(mix(P.feuillageSombre, P.encre, 0.45), 0.75); forme(0.9); c.fill();
    const g = c.createRadialGradient(x - r * 0.35, y - r * 0.4, r * 0.1, x, y, r * 1.15);
    g.addColorStop(0, P.feuillageClair); g.addColorStop(0.55, P.feuillage); g.addColorStop(1, P.feuillageSombre);
    c.fillStyle = g; forme(0); c.fill();
    for (let k = 0; k < 8; k++) {
      const a = R() * Math.PI * 2, d = R() * r * 0.7, px = x + Math.cos(a) * d, py = y + Math.sin(a) * d;
      const clair = (px - x) + (py - y) < -r * 0.1;
      c.fillStyle = clair ? rgba(P.feuillageClair, 0.55) : rgba(P.feuillageSombre, 0.32);
      c.beginPath(); c.ellipse(px, py, r * 0.2, r * 0.13, a, 0, Math.PI * 2); c.fill();
    }
    if (P.mort) {
      c.strokeStyle = rgba(P.tronc, 0.9); c.lineWidth = 1;
      for (let k = 0; k < 4; k++) { const a = R() * Math.PI * 2; c.beginPath(); c.moveTo(x, y); c.lineTo(x + Math.cos(a) * r * 0.85, y + Math.sin(a) * r * 0.85); c.stroke(); }
      if (P.lave && R() < 0.5) { c.fillStyle = rgba(P.lanterne, 0.85); c.beginPath(); c.arc(x + (R() - 0.5) * r, y + (R() - 0.5) * r, 0.9, 0, Math.PI * 2); c.fill(); }
    }
  }

  // Une maison vue de dessus : ombre portée, bande de mur sous l'avant-toit, toit à quatre pans
  // (un faîtage selon la grande longueur), rangs de tuiles et faîtage d'or.
  function maison(c, x0, y0, w, h, P, R) {
    const bande = Math.min(h * 0.22, T * 0.22), hh = h - bande;
    c.fillStyle = rgba(P.encre, 0.3); c.fillRect(x0 + T * 0.14, y0 + T * 0.2, w, h);
    c.fillStyle = P.mur; c.fillRect(x0 + 1, y0 + hh, w - 2, bande);
    c.fillStyle = rgba(P.encre, 0.25); c.fillRect(x0 + 1, y0 + h - 1.2, w - 2, 1.2);
    if (w >= T * 0.9 && R() < 0.8) { c.fillStyle = mix(P.murSombre, P.encre, 0.3); c.fillRect(x0 + w * 0.5 - T * 0.08, y0 + hh + bande * 0.25, T * 0.16, bande * 0.75); }
    const hor = w >= hh, mid = hor ? y0 + hh / 2 : x0 + w / 2;
    const a = hor ? [x0 + hh / 2, mid] : [mid, y0 + w / 2], b = hor ? [x0 + w - hh / 2, mid] : [mid, y0 + hh - w / 2];
    if (!hor && b[1] < a[1]) b[1] = a[1];
    if (hor && b[0] < a[0]) b[0] = a[0];
    const tl = [x0, y0], tr = [x0 + w, y0], br = [x0 + w, y0 + hh], bl = [x0, y0 + hh];
    const faces = hor
      ? [[[tl, tr, b, a], P.toitClair], [[bl, br, b, a], P.toitSombre], [[tl, a, bl], P.toit], [[tr, b, br], mix(P.toit, P.toitSombre, 0.55)]]
      : [[[tl, bl, b, a], P.toitClair], [[tr, br, b, a], P.toitSombre], [[tl, a, tr], P.toit], [[bl, b, br], mix(P.toit, P.toitSombre, 0.55)]];
    for (const [pts, col] of faces) { c.fillStyle = col; poly(c, pts); c.fill(); }
    // Rangs de tuiles : des traits parallèles au bord, sur chaque pan.
    c.save(); poly(c, [tl, tr, br, bl]); c.clip();
    c.strokeStyle = rgba(P.encre, 0.16); c.lineWidth = 0.7;
    const pas = 2.6;
    if (hor) for (let y = y0 + pas; y < y0 + hh; y += pas) { c.beginPath(); c.moveTo(x0, y); c.lineTo(x0 + w, y); c.stroke(); }
    else for (let x = x0 + pas; x < x0 + w; x += pas) { c.beginPath(); c.moveTo(x, y0); c.lineTo(x, y0 + hh); c.stroke(); }
    c.restore();
    c.strokeStyle = rgba(P.encre, 0.35); c.lineWidth = 0.7;
    c.beginPath(); c.moveTo(tl[0], tl[1]); c.lineTo(a[0], a[1]); c.lineTo(bl[0], bl[1]); c.moveTo(tr[0], tr[1]); c.lineTo(b[0], b[1]); c.lineTo(br[0], br[1]); c.stroke();
    c.strokeStyle = P.faitage; c.lineWidth = 1.5; c.beginPath(); c.moveTo(a[0], a[1]); c.lineTo(b[0], b[1]); c.stroke();
    c.strokeStyle = rgba(P.encre, 0.4); c.lineWidth = 0.8; poly(c, [tl, tr, br, bl]); c.stroke();
    if (R() < 0.5) { const cx = a[0] + (b[0] - a[0]) * 0.7 + 2, cy = a[1] - 3; c.fillStyle = P.murSombre; c.fillRect(cx, cy, 3, 3); c.fillStyle = rgba(P.encre, 0.4); c.fillRect(cx + 0.6, cy + 0.6, 1.8, 1.8); }
  }

  // Rempart : bloc de pierre taillée, joints, et merlons du côté de la ville.
  function rempart(c, x, y, P, R, interieur) {
    const g = c.createLinearGradient(x, y, x + T, y + T);
    g.addColorStop(0, mix(P.mur, '#ffffff', 0.25)); g.addColorStop(1, P.murSombre);
    c.fillStyle = g; c.fillRect(x, y, T, T);
    c.strokeStyle = rgba(P.encre, 0.22); c.lineWidth = 0.7;
    c.beginPath(); c.moveTo(x, y + T / 2); c.lineTo(x + T, y + T / 2); c.moveTo(x + (R() < 0.5 ? T * 0.35 : T * 0.65), y); c.lineTo(x + (R() < 0.5 ? T * 0.35 : T * 0.65), y + T / 2); c.moveTo(x + T * 0.5, y + T / 2); c.lineTo(x + T * 0.5, y + T); c.stroke();
    if (interieur) {
      c.fillStyle = mix(P.mur, '#ffffff', 0.35);
      const [dx, dy] = interieur, m = T * 0.3;
      const mx = dx > 0 ? x + T - m : dx < 0 ? x : x + (T - m) / 2, my = dy > 0 ? y + T - m : dy < 0 ? y : y + (T - m) / 2;
      c.fillRect(mx, my, m, m);
      c.fillStyle = rgba(P.encre, 0.25); c.fillRect(mx + m * 0.15, my + m, m, 1.2);
    }
  }

  function lanterne(c, x, y, P) {
    const g = c.createRadialGradient(x, y, 0, x, y, T * 1.3);
    g.addColorStop(0, rgba(P.lueur, 0.6)); g.addColorStop(0.4, rgba(P.lueur, 0.22)); g.addColorStop(1, rgba(P.lueur, 0));
    c.fillStyle = g; c.fillRect(x - T * 1.3, y - T * 1.3, T * 2.6, T * 2.6);
    c.fillStyle = rgba(P.encre, 0.35); c.beginPath(); c.ellipse(x + 1.5, y + 2, 2.8, 1.6, 0, 0, Math.PI * 2); c.fill();
    c.fillStyle = P.lanterne; c.beginPath(); c.arc(x, y, T * 0.17, 0, Math.PI * 2); c.fill();
    c.fillStyle = '#fff6d6'; c.beginPath(); c.arc(x - 0.6, y - 0.6, T * 0.07, 0, Math.PI * 2); c.fill();
    c.strokeStyle = rgba(P.encre, 0.55); c.lineWidth = 0.8; c.beginPath(); c.arc(x, y, T * 0.17, 0, Math.PI * 2); c.stroke();
  }

  function relais(c, x, y, P) {
    c.fillStyle = rgba(P.encre, 0.18); c.beginPath(); c.arc(x + 1.5, y + 2, T * 0.98, 0, Math.PI * 2); c.fill();
    c.fillStyle = P.dalle; c.beginPath(); c.arc(x, y, T * 0.98, 0, Math.PI * 2); c.fill();
    c.strokeStyle = P.dalleJoint; c.lineWidth = 0.8; c.stroke();
    c.beginPath(); c.arc(x, y, T * 0.5, 0, Math.PI * 2); c.stroke();
    for (let i = 0; i < 8; i++) { const a = (i / 8) * Math.PI * 2; c.beginPath(); c.moveTo(x + Math.cos(a) * T * 0.5, y + Math.sin(a) * T * 0.5); c.lineTo(x + Math.cos(a) * T * 0.98, y + Math.sin(a) * T * 0.98); c.stroke(); }
    const g = c.createRadialGradient(x, y, 0, x, y, T);
    g.addColorStop(0, rgba(P.cristal, 0.55)); g.addColorStop(1, rgba(P.cristal, 0));
    c.fillStyle = g; c.fillRect(x - T, y - T, T * 2, T * 2);
    c.fillStyle = P.or; poly(c, [[x, y - T * 0.42], [x + T * 0.26, y], [x, y + T * 0.42], [x - T * 0.26, y]]); c.fill();
    c.fillStyle = P.cristal; poly(c, [[x, y - T * 0.34], [x + T * 0.19, y], [x, y + T * 0.34], [x - T * 0.19, y]]); c.fill();
    c.fillStyle = P.cristalClair; poly(c, [[x, y - T * 0.34], [x - T * 0.19, y], [x, y]]); c.fill();
  }

  function porte(c, x, y, P) {
    c.fillStyle = rgba(P.encre, 0.3); c.beginPath(); c.ellipse(x + 2, y + 2.5, T * 0.62, T * 0.5, 0, 0, Math.PI * 2); c.fill();
    const g = c.createLinearGradient(x - T * 0.6, y - T * 0.6, x + T * 0.6, y + T * 0.6);
    g.addColorStop(0, P.rocheClaire); g.addColorStop(1, P.rocheSombre);
    c.fillStyle = g; c.beginPath(); c.ellipse(x, y, T * 0.62, T * 0.5, 0, 0, Math.PI * 2); c.fill();
    c.strokeStyle = rgba(P.encre, 0.45); c.lineWidth = 0.8; c.stroke();
    const v = c.createLinearGradient(0, y - T * 0.3, 0, y + T * 0.4);
    v.addColorStop(0, '#05070d'); v.addColorStop(1, '#2a1d4a');
    c.fillStyle = v; c.beginPath(); c.ellipse(x, y + T * 0.06, T * 0.36, T * 0.3, 0, 0, Math.PI * 2); c.fill();
    c.fillStyle = P.or; poly(c, [[x, y - T * 0.56], [x + T * 0.12, y - T * 0.44], [x, y - T * 0.32], [x - T * 0.12, y - T * 0.44]]); c.fill();
  }

  function noeud(c, x, y, res, P, R) {
    const kind = res && res.node ? res.node.kind : 'plante';
    if (kind === 'bois') {
      c.fillStyle = rgba(P.encre, 0.25); c.beginPath(); c.ellipse(x + 1.5, y + 2, T * 0.42, T * 0.28, 0, 0, Math.PI * 2); c.fill();
      for (const [dx, dy] of [[-0.18, 0.08], [0.18, 0.08], [0, -0.14]]) {
        const cx = x + dx * T, cy = y + dy * T;
        c.fillStyle = P.lave ? '#5a463a' : '#8a6444'; c.beginPath(); c.arc(cx, cy, T * 0.17, 0, Math.PI * 2); c.fill();
        c.fillStyle = P.lave ? '#a08066' : '#d8b88a'; c.beginPath(); c.arc(cx, cy, T * 0.11, 0, Math.PI * 2); c.fill();
        c.strokeStyle = rgba('#7a5a3e', 0.7); c.lineWidth = 0.6; c.beginPath(); c.arc(cx, cy, T * 0.05, 0, Math.PI * 2); c.stroke();
      }
    } else if (kind === 'pierre') {
      if (P.lave) { for (const [dx, dy, r] of [[-0.15, 0.05, 0.22], [0.16, -0.06, 0.2]]) basalte(c, x + dx * T, y + dy * T, r * T, P, R); }
      else for (const [dx, dy, r] of [[-0.16, 0.08, 0.2], [0.15, 0.1, 0.17], [0, -0.13, 0.19]]) rocher(c, x + dx * T, y + dy * T, r * T, P, R);
    } else if (P.lave) {
      // Lichen de scorie : une plaque rousse et verte, granuleuse.
      c.fillStyle = rgba('#c7742a', 0.75); c.beginPath(); c.ellipse(x, y, T * 0.42, T * 0.3, R(), 0, Math.PI * 2); c.fill();
      c.fillStyle = rgba('#8a9a3a', 0.7); c.beginPath(); c.ellipse(x - T * 0.1, y - T * 0.05, T * 0.22, T * 0.15, R(), 0, Math.PI * 2); c.fill();
      c.fillStyle = rgba('#ffd27a', 0.8); for (let i = 0; i < 5; i++) { c.beginPath(); c.arc(x + (R() - 0.5) * T * 0.6, y + (R() - 0.5) * T * 0.4, 0.8, 0, Math.PI * 2); c.fill(); }
    } else {
      // Herbe de veille : une touffe claire et ses clochettes bleues.
      c.fillStyle = rgba(P.herbeOmbre, 0.35); c.beginPath(); c.ellipse(x + 1.5, y + 2, T * 0.4, T * 0.26, 0, 0, Math.PI * 2); c.fill();
      for (let i = 0; i < 7; i++) { const a = (i / 7) * Math.PI * 2; c.fillStyle = i % 2 ? '#7fbf6a' : '#a6d98a'; c.beginPath(); c.ellipse(x + Math.cos(a) * T * 0.18, y + Math.sin(a) * T * 0.14, T * 0.18, T * 0.08, a, 0, Math.PI * 2); c.fill(); }
      c.fillStyle = '#cfe4ff'; for (let i = 0; i < 4; i++) { c.beginPath(); c.arc(x + (R() - 0.5) * T * 0.5, y + (R() - 0.5) * T * 0.4, 1.3, 0, Math.PI * 2); c.fill(); }
    }
  }

  // ----- La peinture d'une carte -----

  function peindre(def, zone) {
    const N = def.layout.length, S = N * T;
    const P = palette(zone), seed = hashStr(def.id), R = rng(seed);
    const kAt = (x, y) => def.layout[Math.max(0, Math.min(N - 1, y))][Math.max(0, Math.min(N - 1, x))];
    const ty = (x, y) => TYPE[kAt(x, y)] || 'sol';
    const is = t => (x, y) => ty(x, y) === t;
    const tiles = t => { const l = []; for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) if (ty(x, y) === t) l.push([x, y]); return l; };
    const out = canvas(S, S), c = out.getContext('2d');
    c.lineCap = 'round'; c.lineJoin = 'round';

    // 1. Le sol : taches de couleur, coups de pinceau, grain.
    champ(c, S, P.herbe, seed);
    const marche = (x, y) => ty(x, y) === 'sol' || kAt(x, y) === ',';
    for (let i = 0; i < 1100; i++) {
      const px = R() * S, py = R() * S;
      if (!marche(Math.floor(px / T), Math.floor(py / T))) continue;
      const base = P.herbe[Math.floor(R() * P.herbe.length)], clair = R() < 0.5;
      c.strokeStyle = rgba(clair ? mix(base, '#ffffff', 0.2) : mix(base, P.herbeOmbre, 0.35), 0.36);
      c.lineWidth = 1.1 + R() * 1.3;
      const a = -0.75 + (R() - 0.5) * 0.9, l = 2.5 + R() * 4.5;
      c.beginPath(); c.moveTo(px, py); c.lineTo(px + Math.cos(a) * l, py + Math.sin(a) * l); c.stroke();
    }
    grain(c, S, 0.42, 'soft-light');

    // 2. Les variations du sol (« , ») : dallage en ville, gravier au pied des rochers, herbe
    // fleurie à l'orée des arbres, sinon terre battue ; les sorties sont des chemins.
    const autour = (x, y, t) => { for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) if ((dx || dy) && ty(x + dx, y + dy) === t) return true; return false; };
    const variante = (x, y) => {
      const k = kAt(x, y);
      if ('nsew'.includes(k)) return P.ville ? 'dalle' : 'chemin';
      if (P.ville && 'ZD'.includes(k)) return 'dalle';
      if (k !== ',') return null;
      if (P.ville) return 'dalle';
      if (autour(x, y, 'roc') || autour(x, y, 'vide')) return 'gravier';
      if (autour(x, y, 'arbre')) return 'fleuri';
      return 'chemin';
    };
    const est = v => (x, y) => variante(Math.max(0, Math.min(N - 1, x)), Math.max(0, Math.min(N - 1, y))) === v;
    const cases = v => { const l = []; for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) if (variante(x, y) === v) l.push([x, y]); return l; };
    const terre = (g, col) => { g.fillStyle = col; g.fillRect(0, 0, S, S); grain(g, S, 0.5, 'soft-light'); const l = g.createLinearGradient(0, 0, S, S); l.addColorStop(0, rgba(P.cheminClair, 0.3)); l.addColorStop(1, rgba(P.cheminClair, 0)); g.fillStyle = l; g.fillRect(0, 0, S, S); };
    if (cases('fleuri').length) {
      calque(c, S, masque(N, est('fleuri'), 0.7, 2), P.herbeOmbre, 0.26);
      for (const [x, y] of cases('fleuri')) for (let i = 0; i < 5; i++) {
        const fx = (x + 0.1 + R() * 0.8) * T, fy = (y + 0.1 + R() * 0.8) * T, col = P.fleurs[Math.floor(R() * P.fleurs.length)];
        c.fillStyle = col; c.beginPath(); c.arc(fx, fy, 1.1 + R() * 0.6, 0, Math.PI * 2); c.fill();
      }
    }
    if (cases('gravier').length) {
      calque(c, S, masque(N, est('gravier'), 0.66, 2), g => terre(g, mix(P.caillou, P.chemin, 0.55)), 0.8);
      for (const [x, y] of cases('gravier')) for (let i = 0; i < 4; i++) {
        const sx = (x + 0.1 + R() * 0.8) * T, sy = (y + 0.1 + R() * 0.8) * T, sr = 0.8 + R() * 1.3;
        c.fillStyle = rgba(P.encre, 0.18); c.beginPath(); c.ellipse(sx + 0.6, sy + 0.8, sr, sr * 0.75, 0, 0, Math.PI * 2); c.fill();
        c.fillStyle = R() < 0.5 ? P.caillou : mix(P.caillou, '#ffffff', 0.3); c.beginPath(); c.ellipse(sx, sy, sr, sr * 0.75, R(), 0, Math.PI * 2); c.fill();
      }
    }
    if (cases('chemin').length) {
      calque(c, S, masque(N, est('chemin'), 0.72, 2), P.cheminBord, 0.45);
      calque(c, S, masque(N, est('chemin'), 0.56, 1), g => terre(g, P.chemin));
    }
    if (cases('dalle').length) {
      calque(c, S, masque(N, est('dalle'), 0.74, 2), P.dalleJoint, 0.45);
      calque(c, S, masque(N, est('dalle'), 0.6, 1), g => {
        g.fillStyle = P.dalle; g.fillRect(0, 0, S, S);
        grain(g, S, 0.5, 'soft-light');
        // Dalles en quinconce, joints fins, quelques dalles plus claires.
        g.strokeStyle = rgba(P.dalleJoint, 0.55); g.lineWidth = 0.7;
        const d = T / 2;
        for (let y = 0; y < S; y += d) { g.beginPath(); g.moveTo(0, y); g.lineTo(S, y); g.stroke(); for (let x = ((y / d) % 2) * (d * 0.7); x < S; x += d * 1.4) { g.beginPath(); g.moveTo(x, y); g.lineTo(x, y + d); g.stroke(); } }
        g.fillStyle = 'rgba(255,255,255,0.14)';
        for (let i = 0; i < 90; i++) g.fillRect(Math.floor((R() * S) / 8) * 8 + 1, Math.floor((R() * S) / 8) * 8 + 1, 6, 3);
      });
    }
    // Les sentiers, d'une sortie à l'autre par le cœur de la carte.
    const tr = sentiers(N, kAt, ty, R);
    if (tr.lignes.length) {
      calque(c, S, masqueTrace(S, tr.lignes, T * 0.86, 2), P.ville ? P.dalleJoint : P.cheminBord, 0.42);
      calque(c, S, masqueTrace(S, tr.lignes, T * 0.62, 1), g => terre(g, P.ville ? P.dalle : P.chemin));
      calque(c, S, masqueTrace(S, tr.lignes, T * 0.18, 1), P.cheminClair, 0.3);
    }

    // Kaldum : la scorie se fend ; près de la lave, les fentes rougeoient.
    if (P.lave) {
      for (let i = 0; i < 7; i++) {
        let x = R() * S, y = R() * S, a = R() * Math.PI * 2;
        const chaud = P.braises || P.vapeur ? R() < 0.6 : R() < 0.15, pts = [[x, y]];
        for (let k = 0; k < 6; k++) { a += (R() - 0.5) * 1.2; x += Math.cos(a) * (4 + R() * 6); y += Math.sin(a) * (4 + R() * 6); pts.push([x, y]); }
        c.strokeStyle = rgba(P.herbeOmbre, 0.55); c.lineWidth = 1.1; c.beginPath(); pts.forEach((p, j) => (j ? c.lineTo(p[0], p[1]) : c.moveTo(p[0], p[1]))); c.stroke();
        if (chaud) { c.save(); c.globalCompositeOperation = 'lighter'; c.strokeStyle = rgba(P.lanterne, 0.5); c.lineWidth = 0.8; c.stroke(); c.restore(); }
      }
    }

    // Touffes, fleurs, cailloux et buissons sur l'herbe, hors des sentiers.
    const buissons = [];
    for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
      const k = kAt(x, y);
      if (ty(x, y) !== 'sol' || 'PZDLG'.includes(k) || tr.cases.has(x + ',' + y)) continue;
      const cx = (x + 0.5) * T, cy = (y + 0.5) * T;
      if (R() < 0.6) {
        c.lineWidth = 0.9;
        for (let i = 0; i < 3; i++) {
          const gx = cx + (R() - 0.5) * T * 0.9, gy = cy + (R() - 0.5) * T * 0.9, hh = 2 + R() * 2.5;
          c.strokeStyle = rgba(P.touffe, 0.72); c.beginPath(); c.moveTo(gx, gy); c.lineTo(gx - 1, gy - hh); c.moveTo(gx, gy); c.lineTo(gx + 1.2, gy - hh * 0.8); c.stroke();
          c.strokeStyle = rgba(P.touffeClaire, 0.55); c.beginPath(); c.moveTo(gx + 0.5, gy - 0.5); c.lineTo(gx + 0.2, gy - hh * 0.9); c.stroke();
        }
      }
      if (R() < P.tauxFleurs) {
        const col = P.fleurs[Math.floor(R() * P.fleurs.length)];
        for (let i = 0; i < 5; i++) { const fx = cx + (R() - 0.5) * T * 0.8, fy = cy + (R() - 0.5) * T * 0.8; c.fillStyle = col; c.beginPath(); c.arc(fx, fy, 1.3, 0, Math.PI * 2); c.fill(); c.fillStyle = 'rgba(255,255,255,0.7)'; c.fillRect(fx - 0.3, fy - 0.3, 0.6, 0.6); }
      }
      if (R() < P.tauxCailloux) {
        const sx = cx + (R() - 0.5) * T * 0.7, sy = cy + (R() - 0.5) * T * 0.7, sr = 1.4 + R() * 1.6;
        c.fillStyle = rgba(P.encre, 0.2); c.beginPath(); c.ellipse(sx + 0.8, sy + 1, sr, sr * 0.7, 0, 0, Math.PI * 2); c.fill();
        c.fillStyle = P.caillou; c.beginPath(); c.ellipse(sx, sy, sr, sr * 0.7, R(), 0, Math.PI * 2); c.fill();
        c.fillStyle = 'rgba(255,255,255,0.35)'; c.beginPath(); c.arc(sx - sr * 0.3, sy - sr * 0.25, sr * 0.35, 0, Math.PI * 2); c.fill();
      }
      const proche = [[0, 1], [1, 0], [0, -1], [-1, 0]].some(([dx, dy]) => 'PZDG'.includes(kAt(x + dx, y + dy)));
      if (!proche && R() < P.tauxBuissons) buissons.push({ x: cx + (R() - 0.5) * T * 0.4, y: cy + (R() - 0.5) * T * 0.4, r: T * (0.3 + R() * 0.12) });
    }

    // 3. Le vide entre les îles : une lèvre de roche claire, le ciel profond, des étoiles.
    if (tiles('vide').length) {
      const vide = is('vide');
      calque(c, S, masque(N, vide, 0.86, 1), P.videBord, 0.95);
      calque(c, S, masque(N, vide, 0.66, 1), g => {
        const gr = g.createLinearGradient(0, 0, 0, S); gr.addColorStop(0, P.vide); gr.addColorStop(1, P.videProfond);
        g.fillStyle = gr; g.fillRect(0, 0, S, S);
        for (let i = 0; i < 70; i++) { g.fillStyle = rgba(P.etoile, 0.4 + R() * 0.5); g.beginPath(); g.arc(R() * S, R() * S, 0.4 + R() * 0.8, 0, Math.PI * 2); g.fill(); }
      });
      // L'ombre de la falaise tombe dans le vide, au nord des trous.
      calque(c, S, masque(N, vide, 0.66, 1), g => { g.fillStyle = 'rgba(0,0,0,0.45)'; g.fillRect(0, 0, S, S); }, 0.6, 0, -T * 0.25);
    }

    // 4. L'eau (ou la lave) : écume claire, eau peu profonde, fond plus sombre, reflets.
    if (tiles('eau').length) {
      const eau = is('eau');
      const profond = (x, y) => eau(x, y) && eau(x + 1, y) && eau(x - 1, y) && eau(x, y + 1) && eau(x, y - 1);
      calque(c, S, masque(N, eau, 0.82, 1), P.ecume, 0.9);
      calque(c, S, masque(N, eau, 0.66, 1), g => {
        const gr = g.createLinearGradient(0, 0, S, S); gr.addColorStop(0, P.eau); gr.addColorStop(1, mix(P.eau, P.eauProfonde, 0.4));
        g.fillStyle = gr; g.fillRect(0, 0, S, S); grain(g, S, 0.35, 'soft-light');
      });
      calque(c, S, masque(N, profond, 0.62, 2), P.eauProfonde, 0.6);
      for (const [x, y] of tiles('eau')) {
        const cx = (x + 0.5) * T, cy = (y + 0.5) * T;
        if (P.lave) {
          c.save(); c.globalCompositeOperation = 'lighter';
          c.strokeStyle = rgba(P.eauClaire, 0.55); c.lineWidth = 1.1;
          c.beginPath(); c.moveTo(cx - T * 0.4, cy + (R() - 0.5) * T * 0.4); c.lineTo(cx - T * 0.05, cy + (R() - 0.5) * T * 0.5); c.lineTo(cx + T * 0.4, cy + (R() - 0.5) * T * 0.4); c.stroke();
          c.restore();
        } else if (R() < 0.6) {
          c.strokeStyle = rgba(P.eauClaire, 0.65); c.lineWidth = 0.9;
          const ry = cy + (R() - 0.5) * T * 0.5;
          c.beginPath(); c.moveTo(cx - T * 0.3, ry); c.quadraticCurveTo(cx, ry - 2, cx + T * 0.3, ry); c.stroke();
        }
      }
      if (P.lave) {
        // La lave rougeoie sur ses berges.
        c.save(); c.globalCompositeOperation = 'lighter';
        for (const [x, y] of tiles('eau')) { const cx = (x + 0.5) * T, cy = (y + 0.5) * T, g = c.createRadialGradient(cx, cy, 0, cx, cy, T * 1.2); g.addColorStop(0, rgba(P.lanterne, 0.16)); g.addColorStop(1, rgba(P.lanterne, 0)); c.fillStyle = g; c.fillRect(cx - T * 1.2, cy - T * 1.2, T * 2.4, T * 2.4); }
        c.restore();
      }
    }

    // 5. Ombre de contact au pied des murs et des rochers (occlusion ambiante), et des arbres.
    const roc = is('roc');
    if (tiles('roc').length) calque(c, S, masque(N, roc, 1.0, 2), P.herbeOmbre, 0.42, T * 0.12, T * 0.18);

    // 6. Murs, maisons, remparts ou rochers.
    if (tiles('roc').length) {
      if (P.ville) {
        // Composantes de murs : celles qui touchent le bord sont des remparts, les autres des maisons.
        const vu = new Set();
        for (const [sx, sy] of tiles('roc')) {
          if (vu.has(sx + ',' + sy)) continue;
          const comp = [], pile = [[sx, sy]]; vu.add(sx + ',' + sy);
          while (pile.length) { const [x, y] = pile.pop(); comp.push([x, y]); for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const nx = x + dx, ny = y + dy, k = nx + ',' + ny; if (nx >= 0 && ny >= 0 && nx < N && ny < N && !vu.has(k) && roc(nx, ny)) { vu.add(k); pile.push([nx, ny]); } } }
          const bord = comp.some(([x, y]) => x === 0 || y === 0 || x === N - 1 || y === N - 1);
          if (bord) {
            for (const [x, y] of comp) {
              const inner = [[1, 0], [-1, 0], [0, 1], [0, -1]].find(([dx, dy]) => { const nx = x + dx, ny = y + dy; return nx > 0 && ny > 0 && nx < N - 1 && ny < N - 1 && !roc(nx, ny) && (x + y) % 2 === 0; });
              rempart(c, x * T, y * T, P, R, inner || null);
            }
          } else {
            // Une maison par rangée de la composante : des toits qui se touchent comme un pâté.
            const rows = new Map();
            for (const [x, y] of comp) (rows.get(y) || rows.set(y, []).get(y)).push(x);
            for (const [y, xs] of [...rows].sort((a, b) => a[0] - b[0])) {
              xs.sort((a, b) => a - b);
              let s0 = xs[0], prev = xs[0];
              const flush = (a, b) => maison(c, a * T + 0.5, y * T + 0.5, (b - a + 1) * T - 1, T - 1, P, R);
              for (let i = 1; i <= xs.length; i++) { if (i < xs.length && xs[i] === prev + 1) { prev = xs[i]; continue; } flush(s0, prev); if (i < xs.length) { s0 = prev = xs[i]; } }
            }
          }
        }
      } else {
        calque(c, S, masque(N, roc, 0.6, 1), g => { g.fillStyle = mix(P.rocheSombre, P.roche, 0.35); g.fillRect(0, 0, S, S); grain(g, S, 0.6, 'overlay'); });
        const list = tiles('roc').sort((a, b) => a[1] - b[1] || a[0] - b[0]);
        for (const [x, y] of list) {
          const cx = (x + 0.5) * T, cy = (y + 0.5) * T;
          if (P.lave) basalte(c, cx + (R() - 0.5) * 2, cy + (R() - 0.5) * 2, T * (0.5 + R() * 0.12), P, R);
          else {
            rocher(c, cx + (R() - 0.5) * 3, cy + (R() - 0.5) * 3, T * (0.48 + R() * 0.14), P, R);
            if (R() < 0.45) rocher(c, cx + (R() - 0.5) * T * 0.6, cy + (R() - 0.5) * T * 0.6, T * (0.22 + R() * 0.1), P, R);
          }
          if (P.grotte && R() < 0.12) { c.fillStyle = rgba(P.cristal, 0.85); c.beginPath(); c.arc(cx + (R() - 0.5) * T * 0.6, cy + (R() - 0.5) * T * 0.6, 1, 0, Math.PI * 2); c.fill(); }
        }
      }
    }

    // 7. Arbres : ombres portées floues, puis les couronnes, du nord au sud.
    const arbres = tiles('arbre').map(([x, y]) => ({ x: (x + 0.5 + (R() - 0.5) * 0.3) * T, y: (y + 0.5 + (R() - 0.5) * 0.3) * T, r: T * (0.66 + R() * 0.2) })).concat(buissons);
    if (arbres.length) {
      const o = travail('ombres', S), g = o.getContext('2d');
      g.setTransform(1, 0, 0, 1, 0, 0); g.clearRect(0, 0, S, S); g.fillStyle = '#000';
      for (const a of arbres) { g.beginPath(); g.ellipse(a.x + a.r * 0.4, a.y + a.r * 0.5, a.r * 1.02, a.r * 0.88, 0, 0, Math.PI * 2); g.fill(); }
      const f = travail('flouOmbres', S / 4), gf = f.getContext('2d');
      gf.clearRect(0, 0, f.width, f.height); gf.drawImage(o, 0, 0, f.width, f.height);
      g.clearRect(0, 0, S, S); g.imageSmoothingEnabled = true; g.drawImage(f, 0, 0, S, S);
      calque(c, S, o, P.herbeOmbre, 0.5);
      arbres.sort((a, b) => a.y - b.y || a.x - b.x);
      for (const a of arbres) couronne(c, a.x, a.y, a.r, P, R);
    }

    // 8. Ce qui est posé au sol : lanternes, relais, porte, nœuds de récolte.
    let ni = 0;
    for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
      const k = kAt(x, y), cx = (x + 0.5) * T, cy = (y + 0.5) * T;
      if (k === 'L') lanterne(c, cx, cy, P);
      else if (k === 'Z') relais(c, cx, cy, P);
      else if (k === 'D') porte(c, cx, cy, P);
      else if (k === 'G') { const id = (def.nodes || [])[ni++]; noeud(c, cx, cy, ((DATA.content && DATA.content.resources) || []).find(r => r.id === id), P, R); }
    }

    // 9. Ce qui fait la zone : les fils des Toiles, les vapeurs, les braises.
    if (P.toiles) {
      c.strokeStyle = 'rgba(244,240,250,0.5)'; c.lineWidth = 0.6;
      for (let i = 0; i < arbres.length; i++) {
        const a = arbres[i], b = arbres.find(o => o !== a && Math.hypot(o.x - a.x, o.y - a.y) < T * 2.2 && R() < 0.3);
        if (b) { c.beginPath(); c.moveTo(a.x, a.y); c.quadraticCurveTo((a.x + b.x) / 2 + 3, (a.y + b.y) / 2 + 4, b.x, b.y); c.stroke(); }
      }
      const sols = tiles('sol');
      for (let i = 0; i < 3 && sols.length; i++) {
        const [x, y] = sols[Math.floor(R() * sols.length)], cx = (x + 0.5) * T, cy = (y + 0.5) * T, r = T * (0.6 + R() * 0.3);
        c.strokeStyle = 'rgba(248,244,255,0.55)'; c.lineWidth = 0.55;
        for (let k = 0; k < 8; k++) { const a = (k / 8) * Math.PI * 2; c.beginPath(); c.moveTo(cx, cy); c.lineTo(cx + Math.cos(a) * r, cy + Math.sin(a) * r); c.stroke(); }
        for (let ring = 1; ring <= 3; ring++) { c.beginPath(); for (let k = 0; k <= 8; k++) { const a = (k / 8) * Math.PI * 2, rr = (r * ring) / 3.2; c.lineTo(cx + Math.cos(a) * rr, cy + Math.sin(a) * rr); } c.stroke(); }
      }
    }
    if (P.vapeur || P.braises) {
      const sources = tiles('eau').concat(tiles('vide'));
      for (let i = 0; i < Math.min(8, sources.length + 3); i++) {
        const [x, y] = sources.length ? sources[Math.floor(R() * sources.length)] : [Math.floor(R() * N), Math.floor(R() * N)];
        const cx = (x + 0.5 + (R() - 0.5) * 1.5) * T, cy = (y + 0.5 + (R() - 0.5) * 1.5) * T;
        if (P.vapeur) { const g = c.createRadialGradient(cx, cy, 0, cx, cy, T * 1.1); g.addColorStop(0, 'rgba(255,250,245,0.45)'); g.addColorStop(1, 'rgba(255,250,245,0)'); c.fillStyle = g; c.fillRect(cx - T * 1.1, cy - T * 1.1, T * 2.2, T * 2.2); }
        else for (let k = 0; k < 4; k++) { c.fillStyle = rgba(k % 2 ? P.lanterne : P.eauClaire, 0.85); c.beginPath(); c.arc(cx + (R() - 0.5) * T, cy + (R() - 0.5) * T, 0.8 + R() * 0.6, 0, Math.PI * 2); c.fill(); }
      }
    }

    // 10. Un dernier grain, pour l'unité de la touche.
    grain(c, S, 0.16, 'overlay');
    return out;
  }

  // ----- Cache -----

  const zoneOf = id => (typeof World === 'function' ? World.zoneOf(id) : null);
  const defOf = id => (typeof World === 'function' ? World.mapDef(id) : null);
  function carte(id) {
    let cv = cartes.get(id);
    if (!cv) { const d = defOf(id); if (!d) return null; cv = peindre(d, zoneOf(id)); cartes.set(id, cv); }
    return cv;
  }
  const estPeinte = id => cartes.has(id);

  // La carte inexplorée : décolorée, voilée de brume (les nuages viennent par-dessus).
  function brume(id) {
    let cv = brumes.get(id);
    if (cv) return cv;
    const src = carte(id);
    if (!src) return null;
    const P = palette(zoneOf(id));
    cv = canvas(src.width, src.height);
    const c = cv.getContext('2d');
    c.drawImage(src, 0, 0);
    c.globalCompositeOperation = 'saturation'; c.fillStyle = '#808080'; c.fillRect(0, 0, cv.width, cv.height);
    c.globalCompositeOperation = 'source-over'; c.fillStyle = rgba(P.brume, 0.62); c.fillRect(0, 0, cv.width, cv.height);
    brumes.set(id, cv);
    return cv;
  }

  // Couleur moyenne d'une zone, pour une case pas encore peinte.
  const couleurZone = zone => { const P = palette(zone); return mix(P.herbe[0], P.herbe[2], 0.4); };

  // ----- Nuages peints : des boules douces, une ombre bleutée dessous -----
  function nuage(i) {
    const key = 'nuage' + (i % 3);
    if (arts.has(key)) return arts.get(key);
    const W = 256, H = 160, cv = canvas(W, H), c = cv.getContext('2d'), R = rng(77 + (i % 3) * 13);
    const boules = [];
    for (let k = 0; k < 6; k++) boules.push([40 + k * 35 + (R() - 0.5) * 16, 98 + (R() - 0.5) * 12, 26 + R() * 12]);
    for (let k = 0; k < 4; k++) boules.push([70 + k * 38 + (R() - 0.5) * 20, 66 + (R() - 0.5) * 16, 30 + R() * 16]);
    const boule = (x, y, r, col, a) => { const g = c.createRadialGradient(x - r * 0.25, y - r * 0.3, r * 0.1, x, y, r); g.addColorStop(0, rgba(col, a)); g.addColorStop(0.6, rgba(col, a * 0.85)); g.addColorStop(1, rgba(col, 0)); c.fillStyle = g; c.beginPath(); c.arc(x, y, r, 0, Math.PI * 2); c.fill(); };
    for (const [x, y, r] of boules) boule(x + 4, y + 10, r, '#9fb0cc', 0.55);
    for (const [x, y, r] of boules) boule(x, y, r, '#ffffff', 0.95);
    for (const [x, y, r] of boules.slice(6)) boule(x - r * 0.2, y - r * 0.25, r * 0.55, '#ffffff', 0.8);
    arts.set(key, cv);
    return cv;
  }

  // ----- Pastilles : un disque coloré à liseré clair, un pictogramme -----
  const PASTILLES = {
    relais: ['#6fd8f2', '#1f97c4', '#0d5a80'],
    donjon: ['#b996ff', '#7a4fd0', '#43258a'],
    artisan: ['#f3aa72', '#c06a34', '#773916'],
    marchand: ['#8ad884', '#3f9a4a', '#215a29'],
    offre: ['#ffe596', '#f2b134', '#b0700e'],
    rendre: ['#ffe596', '#f2b134', '#b0700e'],
    verrou: ['#9a90b8', '#5a4f7a', '#2e2744'],
  };
  function picto(c, kind, sub, x, y, s) {
    const blanc = '#ffffff', encre = '#3a2508';
    c.save(); c.translate(x, y); c.lineCap = 'round'; c.lineJoin = 'round';
    if (kind === 'relais') {
      c.fillStyle = blanc; poly(c, [[0, -s], [s * 0.62, 0], [0, s], [-s * 0.62, 0]]); c.fill();
      c.fillStyle = '#9fe6ff'; poly(c, [[0, -s], [s * 0.62, 0], [0, 0]]); c.fill();
      c.fillStyle = '#c9f2ff'; poly(c, [[0, 0], [-s * 0.62, 0], [0, s]]); c.fill();
    } else if (kind === 'donjon') {
      c.fillStyle = blanc; c.beginPath(); c.moveTo(-s * 0.8, s * 0.85); c.lineTo(-s * 0.8, -s * 0.05); c.arc(0, -s * 0.05, s * 0.8, Math.PI, 0); c.lineTo(s * 0.8, s * 0.85); c.closePath(); c.fill();
      c.fillStyle = '#3b2370'; c.beginPath(); c.moveTo(-s * 0.36, s * 0.85); c.lineTo(-s * 0.36, s * 0.15); c.arc(0, s * 0.15, s * 0.36, Math.PI, 0); c.lineTo(s * 0.36, s * 0.85); c.closePath(); c.fill();
    } else if (kind === 'marchand') {
      c.fillStyle = blanc; c.beginPath(); c.moveTo(-s * 0.25, -s * 0.55); c.lineTo(s * 0.25, -s * 0.55); c.lineTo(s * 0.12, -s * 0.3); c.bezierCurveTo(s * 0.95, -s * 0.1, s * 0.95, s * 0.9, 0, s * 0.9); c.bezierCurveTo(-s * 0.95, s * 0.9, -s * 0.95, -s * 0.1, -s * 0.12, -s * 0.3); c.closePath(); c.fill();
      c.strokeStyle = '#215a29'; c.lineWidth = s * 0.13; c.beginPath(); c.moveTo(-s * 0.22, -s * 0.32); c.lineTo(s * 0.22, -s * 0.32); c.stroke();
      c.fillStyle = '#e2b13c'; c.beginPath(); c.arc(0, s * 0.35, s * 0.26, 0, Math.PI * 2); c.fill();
    } else if (kind === 'artisan') {
      c.fillStyle = blanc; c.strokeStyle = blanc;
      if (sub === 'tailleur') {
        c.lineWidth = s * 0.16;
        c.beginPath(); c.arc(-s * 0.42, s * 0.5, s * 0.26, 0, Math.PI * 2); c.stroke();
        c.beginPath(); c.arc(s * 0.42, s * 0.5, s * 0.26, 0, Math.PI * 2); c.stroke();
        c.beginPath(); c.moveTo(-s * 0.28, s * 0.28); c.lineTo(s * 0.5, -s * 0.85); c.moveTo(s * 0.28, s * 0.28); c.lineTo(-s * 0.5, -s * 0.85); c.stroke();
      } else if (sub === 'cordonnier') {
        c.beginPath(); c.moveTo(-s * 0.45, -s * 0.9); c.lineTo(s * 0.15, -s * 0.9); c.lineTo(s * 0.15, s * 0.1); c.lineTo(s * 0.9, s * 0.35); c.lineTo(s * 0.9, s * 0.8); c.lineTo(-s * 0.55, s * 0.8); c.closePath(); c.fill();
      } else if (sub === 'bijoutier') {
        c.lineWidth = s * 0.2; c.beginPath(); c.arc(0, s * 0.25, s * 0.55, 0, Math.PI * 2); c.stroke();
        c.fillStyle = '#9fe6ff'; poly(c, [[0, -s * 0.95], [s * 0.36, -s * 0.5], [0, -s * 0.2], [-s * 0.36, -s * 0.5]]); c.fill();
      } else if (sub === 'alchimiste') {
        c.beginPath(); c.moveTo(-s * 0.2, -s * 0.9); c.lineTo(s * 0.2, -s * 0.9); c.lineTo(s * 0.2, -s * 0.25); c.arc(0, s * 0.3, s * 0.62, -Math.PI * 0.32, Math.PI * 1.32); c.closePath(); c.fill();
        c.fillStyle = '#7bd389'; c.beginPath(); c.arc(0, s * 0.38, s * 0.42, 0.1, Math.PI - 0.1); c.closePath(); c.fill();
      } else {
        // Forgeron, et tout autre atelier : marteau.
        c.save(); c.rotate(-0.6);
        c.fillRect(-s * 0.12, -s * 0.2, s * 0.24, s * 1.2);
        c.fillRect(-s * 0.62, -s * 0.72, s * 1.24, s * 0.55);
        c.restore();
      }
    } else if (kind === 'offre' || kind === 'rendre') {
      c.fillStyle = encre;
      if (kind === 'offre') { c.beginPath(); c.moveTo(-s * 0.2, -s * 0.85); c.lineTo(s * 0.2, -s * 0.85); c.lineTo(s * 0.12, s * 0.3); c.lineTo(-s * 0.12, s * 0.3); c.closePath(); c.fill(); }
      else { c.strokeStyle = encre; c.lineWidth = s * 0.3; c.beginPath(); c.arc(0, -s * 0.38, s * 0.42, Math.PI * 1.05, Math.PI * 0.45); c.lineTo(0, s * 0.3); c.stroke(); }
      c.beginPath(); c.arc(0, s * 0.68, s * 0.18, 0, Math.PI * 2); c.fill();
    } else if (kind === 'verrou') {
      c.strokeStyle = blanc; c.lineWidth = s * 0.2; c.beginPath(); c.arc(0, -s * 0.2, s * 0.42, Math.PI, 0); c.stroke();
      c.fillStyle = blanc; c.fillRect(-s * 0.65, -s * 0.2, s * 1.3, s * 1.05);
      c.fillStyle = '#5a4f7a'; c.beginPath(); c.arc(0, s * 0.25, s * 0.15, 0, Math.PI * 2); c.fill();
    }
    c.restore();
  }

  // `px` : diamètre du disque en pixels ; la marge porte l'ombre. Renvoie le canvas et son ancre.
  function pastille(kind, px, sub) {
    px = Math.max(8, Math.round(px / 2) * 2);
    const key = 'p:' + kind + ':' + (sub || '') + ':' + px;
    if (arts.has(key)) return arts.get(key);
    const m = Math.ceil(px * 0.2), W = px + 2 * m, cv = canvas(W, W + Math.ceil(px * 0.08)), c = cv.getContext('2d');
    const x = W / 2, y = m + px / 2, R = px / 2, col = PASTILLES[kind] || PASTILLES.verrou;
    const o = c.createRadialGradient(x, y + R * 0.3, R * 0.6, x, y + R * 0.3, R * 1.22);
    o.addColorStop(0, 'rgba(10,8,6,0.45)'); o.addColorStop(1, 'rgba(10,8,6,0)');
    c.fillStyle = o; c.beginPath(); c.arc(x, y + R * 0.3, R * 1.22, 0, Math.PI * 2); c.fill();
    const ring = c.createLinearGradient(x, y - R, x, y + R);
    ring.addColorStop(0, '#ffffff'); ring.addColorStop(1, '#c9c1b2');
    c.fillStyle = ring; c.beginPath(); c.arc(x, y, R, 0, Math.PI * 2); c.fill();
    const d = c.createRadialGradient(x - R * 0.3, y - R * 0.38, R * 0.08, x, y, R * 0.86);
    d.addColorStop(0, col[0]); d.addColorStop(0.55, col[1]); d.addColorStop(1, col[2]);
    c.fillStyle = d; c.beginPath(); c.arc(x, y, R * 0.84, 0, Math.PI * 2); c.fill();
    c.fillStyle = 'rgba(255,255,255,0.26)'; c.beginPath(); c.ellipse(x, y - R * 0.42, R * 0.56, R * 0.3, 0, 0, Math.PI * 2); c.fill();
    picto(c, kind, sub, x, y + R * 0.04, R * 0.48);
    const art = { canvas: cv, ax: x, ay: y, r: R };
    arts.set(key, art);
    return art;
  }

  // ----- Épingles en goutte : bleue à étoile (toi), verte (quête), braise à drapeau (le tien) -----
  const EPINGLES = { toi: ['#86c9ff', '#2a86e0', '#124c94'], quete: ['#aef08a', '#4cb43e', '#256a1f'], drapeau: ['#ffa587', '#e0533a', '#8a2715'] };
  function epingle(kind, px) {
    px = Math.max(12, Math.round(px / 2) * 2);
    const key = 'e:' + kind + ':' + px;
    if (arts.has(key)) return arts.get(key);
    const W = px + 4, H = Math.round(px * 1.42) + 4, cv = canvas(W, H), c = cv.getContext('2d'), col = EPINGLES[kind] || EPINGLES.quete;
    const x = W / 2, R = px * 0.42, y = 2 + px * 0.46, tip = H - 2;
    const forme = () => { c.beginPath(); c.moveTo(x, tip); c.bezierCurveTo(x - R * 0.28, tip - R * 0.8, x - R, y + R * 0.75, x - R, y); c.arc(x, y, R, Math.PI, 0); c.bezierCurveTo(x + R, y + R * 0.75, x + R * 0.28, tip - R * 0.8, x, tip); c.closePath(); };
    const g = c.createRadialGradient(x - R * 0.35, y - R * 0.4, R * 0.1, x, y + R * 0.4, R * 1.7);
    g.addColorStop(0, col[0]); g.addColorStop(0.5, col[1]); g.addColorStop(1, col[2]);
    forme(); c.fillStyle = g; c.fill();
    c.strokeStyle = 'rgba(255,255,255,0.92)'; c.lineWidth = Math.max(1.5, px * 0.055); c.stroke();
    c.fillStyle = 'rgba(255,255,255,0.3)'; c.beginPath(); c.ellipse(x - R * 0.28, y - R * 0.45, R * 0.42, R * 0.24, -0.5, 0, Math.PI * 2); c.fill();
    if (kind === 'toi') {
      const s = R * 0.62;
      c.fillStyle = 'rgba(10,30,70,0.35)'; c.beginPath();
      for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + (i * Math.PI) / 5, r = i % 2 ? s * 0.45 : s; c.lineTo(x + Math.cos(a) * r + 0.8, y + Math.sin(a) * r + 1.2); }
      c.closePath(); c.fill();
      c.fillStyle = '#fff8d6'; c.beginPath();
      for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + (i * Math.PI) / 5, r = i % 2 ? s * 0.45 : s; c.lineTo(x + Math.cos(a) * r, y + Math.sin(a) * r); }
      c.closePath(); c.fill();
    } else if (kind === 'drapeau') {
      c.strokeStyle = '#ffffff'; c.lineWidth = Math.max(1.2, R * 0.13);
      c.beginPath(); c.moveTo(x - R * 0.3, y + R * 0.55); c.lineTo(x - R * 0.3, y - R * 0.6); c.stroke();
      c.fillStyle = '#ffffff'; c.beginPath(); c.moveTo(x - R * 0.3, y - R * 0.6); c.quadraticCurveTo(x + R * 0.05, y - R * 0.75, x + R * 0.5, y - R * 0.5); c.lineTo(x + R * 0.5, y - R * 0.02); c.quadraticCurveTo(x + R * 0.05, y - R * 0.25, x - R * 0.3, y - R * 0.1); c.closePath(); c.fill();
    } else {
      c.fillStyle = '#ffffff'; c.beginPath(); c.arc(x, y, R * 0.34, 0, Math.PI * 2); c.fill();
    }
    const art = { canvas: cv, ax: x, ay: tip, r: R, hx: x, hy: y };
    arts.set(key, art);
    return art;
  }

  function vider() { cartes.clear(); brumes.clear(); }

  // Une image (data URL) d'une pastille ou d'une épingle, pour la légende en HTML.
  const urls = new Map();
  function url(kind, sub) {
    const k = kind + ':' + (sub || '');
    if (!urls.has(k)) { const a = EPINGLES[kind] ? epingle(kind, 40) : pastille(kind, 40, sub); urls.set(k, a.canvas.toDataURL('image/png')); }
    return urls.get(k);
  }

  return { T, palette, hauteur, carte, estPeinte, brume, couleurZone, nuage, pastille, epingle, url, vider, PASTILLES };
})();
