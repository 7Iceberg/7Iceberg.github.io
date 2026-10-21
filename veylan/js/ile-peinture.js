// Les peintres de l'île d'Ervane (docs/ILE-TECHNIQUE.md, 2.4 et 3.4 à 3.6), sur des toiles 2D, sans
// Three.js : les six matières du sol (herbe, lande, terre, calcaire, roche, sous-bois), qui se
// répètent tous les 4 u ; les cartes de toute l'île à 2 texels par u (poids des matières, ombres
// cuites, bord de l'île) ; la teinte de toute l'île (couleurs des zones, accents des sources) ; la
// lueur (flaques des lanternes, fil d'or, fentes) ; la profondeur de l'eau ; la falaise ; les
// touches des frondaisons et des pierres ; les nuages ; le halo ; la chute d'eau ; le grain.
//
// Le style est celui du prototype de l'arène (grandes taches de teinte, touches, brins, cailloux,
// coups de brosse), sourd partout, saturé aux lanternes. La lumière froide vient du haut à gauche
// de l'écran, c'est-à-dire de l'ouest (azimut de la caméra à 45°) : les ombres tombent vers l'est.
// Le rendu peut tout se permettre ici (il ne décide de rien) ; le hasard vient pourtant de graines,
// pour que l'île soit la même à chaque chargement.
// La fabrique est nommée : son texte entier sert d'empreinte au cache des peintures (js/ile-3d.js).
function fabriqueIlePeinture() {
  const M = () => IleTerrain.M;
  const toile = (w, h) => { const c = document.createElement('canvas'); c.width = Math.max(1, Math.round(w)); c.height = Math.max(1, Math.round(h)); return c; };
  const rgbDe = h => { const n = parseInt(h.slice(1), 16); return [n >> 16, (n >> 8) & 255, n & 255]; };
  const hexDe = (r, g, b) => '#' + [r, g, b].map(v => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0')).join('');
  const mix = (a, b, t) => { const A = rgbDe(a), B = rgbDe(b); return hexDe(A[0] + (B[0] - A[0]) * t, A[1] + (B[1] - A[1]) * t, A[2] + (B[2] - A[2]) * t); };
  const rgba = (h, a) => { const [r, g, b] = rgbDe(h); return `rgba(${r},${g},${b},${a})`; };
  const clamp = (x, a, b) => (x < a ? a : x > b ? b : x);
  const lisse = (a, b, x) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };

  // La direction de la lumière (horizontale, vers la lumière) et son élévation : de l'ouest, un peu
  // du nord, à 50°.
  const LUMIERE = (() => { const x = -0.92, y = -0.38, n = Math.sqrt(x * x + y * y); return { x: x / n, y: y / n, pente: Math.tan(50 * Math.PI / 180) }; })();

  // ----- Outils de peinture répétable (les bords se raccordent) -----

  function peintre(S, graine) {
    const c = toile(S, S), g = c.getContext('2d'), R = M().hasard(graine);
    const tache = (x, y, rx, ry, rot, col, a) => {
      g.globalAlpha = a; g.fillStyle = col;
      const m = Math.max(rx, ry);
      for (const dx of [-S, 0, S]) for (const dy of [-S, 0, S]) {
        const px = x + dx, py = y + dy;
        if (px + m < 0 || px - m > S || py + m < 0 || py - m > S) continue;
        g.beginPath(); g.ellipse(px, py, rx, ry, rot, 0, Math.PI * 2); g.fill();
      }
    };
    const trait = (x, y, l, a, w, col, al) => {
      g.globalAlpha = al; g.strokeStyle = col; g.lineWidth = w; g.lineCap = 'round';
      const ex = Math.cos(a) * l, ey = Math.sin(a) * l;
      for (const dx of [-S, 0, S]) for (const dy of [-S, 0, S]) {
        const px = x + dx, py = y + dy;
        if (px + l < 0 || px - l > S || py + l < 0 || py - l > S) continue;
        g.beginPath(); g.moveTo(px, py); g.lineTo(px + ex, py + ey); g.stroke();
      }
    };
    return { c, g, R, tache, trait, S };
  }

  // Un bruit de valeur répétable sur la toile (période S), pour moduler les taches.
  function bruitRep(x, y, n, s) {
    const xi = Math.floor(x), yi = Math.floor(y), fx = x - xi, fy = y - yi;
    const u = fx * fx * (3 - 2 * fx), v = fy * fy * (3 - 2 * fy);
    const h = (i, j) => M().hache(((i % n) + n) % n, ((j % n) + n) % n, s);
    const a = h(xi, yi), b = h(xi + 1, yi), c = h(xi, yi + 1), d = h(xi + 1, yi + 1);
    return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
  }

  // ======================================================================
  // Les six matières (512 px au téléphone, 1 024 en qualité haute), pour 4 u de côté
  // ======================================================================

  const MATIERES = ['herbe', 'lande', 'terre', 'calcaire', 'roche', 'sous_bois'];

  function matiere(nom, S) {
    const k = S / 512;    // les tailles sont données pour 512 px
    const P = peintre(S, M().cle('matiere_' + nom));
    const { g, R, tache, trait } = P;
    const fond = (col, pal, n, rmin, rmax, a) => {
      g.globalAlpha = 1; g.fillStyle = col; g.fillRect(0, 0, S, S);
      for (let i = 0; i < n; i++) tache(R() * S, R() * S, (rmin + R() * (rmax - rmin)) * k, (rmin + R() * (rmax - rmin)) * k * (0.6 + R() * 0.4), R() * 3.14, pal[Math.floor(R() * pal.length)], a);
    };
    if (nom === 'herbe') {
      const pal = ['#4f8a44', '#6aa04e', '#5b9448', '#7cae56', '#467d3e', '#6da350', '#86b65c'];
      fond('#5e9649', pal, 240, 26, 80, 0.24);
      for (let i = 0; i < 4200; i++) tache(R() * S, R() * S, (3 + R() * 6) * k, (1.6 + R() * 2.4) * k, R() * 3.14, pal[Math.floor(R() * pal.length)], 0.34);
      // Les brins, couchés par le vent d'ouest : jaune-vert au soleil, vert profond à l'ombre.
      for (let i = 0; i < 3000; i++) { const clair = R() < 0.55; trait(R() * S, R() * S, (7 + R() * 9) * k, -1.15 + (R() - 0.5) * 0.7, (1.1 + R() * 0.8) * k, clair ? '#bcd877' : '#2c5a31', clair ? 0.3 : 0.28); }
      // Trèfles, mousse, et quelques fleurs minuscules.
      for (let i = 0; i < 260; i++) tache(R() * S, R() * S, (1.3 + R()) * k, (1 + R()) * k, 0, R() < 0.5 ? '#a3c96a' : '#3e6c3a', 0.5);
      for (let i = 0; i < 70; i++) tache(R() * S, R() * S, 1.3 * k, 1.2 * k, 0, ['#f6f1e2', '#f4d66e', '#eab9d9', '#bcd6ff'][Math.floor(R() * 4)], 0.85);
    } else if (nom === 'lande') {
      const pal = ['#b29752', '#a08646', '#c3a864', '#8f7b41', '#ab934f', '#8c8f4c'];
      fond('#a98f4c', pal, 220, 26, 80, 0.26);
      for (let i = 0; i < 3200; i++) tache(R() * S, R() * S, (3 + R() * 6) * k, (1.5 + R() * 2.2) * k, R() * 3.14, pal[Math.floor(R() * pal.length)], 0.34);
      // Des plaques d'herbe encore verte, à l'abri.
      for (let i = 0; i < 40; i++) { const x = R() * S, y = R() * S; for (let j = 0; j < 9; j++) tache(x + (R() - 0.5) * 40 * k, y + (R() - 0.5) * 26 * k, (4 + R() * 6) * k, (2.5 + R() * 3) * k, R() * 3, R() < 0.5 ? '#7f9545' : '#93a352', 0.35); }
      // Bruyère : des touffes mauves, en grappes.
      for (let i = 0; i < 95; i++) {
        const x = R() * S, y = R() * S, n = 7 + Math.floor(R() * 12);
        for (let j = 0; j < n; j++) tache(x + (R() - 0.5) * 34 * k, y + (R() - 0.5) * 22 * k, (2 + R() * 2.6) * k, (1.6 + R() * 1.8) * k, R() * 3, R() < 0.5 ? '#8f6a8e' : (R() < 0.5 ? '#ad86aa' : '#6b4f6a'), 0.62);
      }
      for (let i = 0; i < 2600; i++) { const clair = R() < 0.6; trait(R() * S, R() * S, (6 + R() * 10) * k, -1.05 + (R() - 0.5) * 0.9, (1 + R() * 0.7) * k, clair ? '#ecd68c' : '#62532c', clair ? 0.32 : 0.26); }
      for (let i = 0; i < 160; i++) { const x = R() * S, y = R() * S, r = (2 + R() * 3) * k; tache(x + r * 0.3, y + r * 0.3, r, r * 0.75, 0, '#5c4f36', 0.4); tache(x, y, r, r * 0.75, 0, R() < 0.5 ? '#c4baa4' : '#a89d86', 0.85); }
    } else if (nom === 'terre') {
      const pal = ['#9c8160', '#b49874', '#8a7154', '#c2a882', '#a48a66'];
      fond('#a68b66', pal, 200, 24, 70, 0.26);
      for (let i = 0; i < 2600; i++) tache(R() * S, R() * S, (3 + R() * 7) * k, (2 + R() * 3) * k, R() * 3.14, pal[Math.floor(R() * pal.length)], 0.3);
      // Traces de pas et d'usure : des traits longs et doux, plutôt dans un sens.
      for (let i = 0; i < 260; i++) trait(R() * S, R() * S, (18 + R() * 40) * k, 0.6 + (R() - 0.5) * 0.4, (2 + R() * 3) * k, R() < 0.5 ? '#c9b08a' : '#7f6a50', 0.16);
      // Cailloux : une ombre, une pierre, un éclat de lumière.
      for (let i = 0; i < 520; i++) {
        const x = R() * S, y = R() * S, r = (1.6 + R() * 3.4) * k, col = R() < 0.5 ? '#cbbfa4' : (R() < 0.5 ? '#9a8e78' : '#b5a88e');
        tache(x + r * 0.35, y + r * 0.35, r, r * 0.8, 0, '#5a4a38', 0.45);
        tache(x, y, r, r * 0.8, R() * 3, col, 0.95);
        tache(x - r * 0.3, y - r * 0.3, r * 0.4, r * 0.3, 0, '#f0e6d0', 0.5);
      }
      for (let i = 0; i < 3000; i++) tache(R() * S, R() * S, (0.6 + R() * 0.8) * k, (0.6 + R() * 0.6) * k, 0, R() < 0.5 ? '#6e5a44' : '#d2bd96', 0.4);
    } else if (nom === 'calcaire') {
      // Des dalles irrégulières : un pavage de Voronoï répétable (une graine par case d'une grille
      // de 5 × 5, on ne regarde que les cases voisines), joints sombres, mousse dans les joints.
      const n = 5, cell = S / n, seeds = [];
      for (let j = 0; j < n; j++) for (let i = 0; i < n; i++) seeds.push([(i + 0.18 + R() * 0.64) * cell, (j + 0.18 + R() * 0.64) * cell, R()]);
      const img = g.createImageData(S, S), d = img.data;
      const cols = ['#c9c1ae', '#d1cab8', '#beb6a3', '#c6bfad', '#b6ae9b', '#d5cebd'].map(rgbDe);
      const mousseJ = rgbDe('#6e7a52');
      for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) {
        const ci = Math.floor(x / cell), cj = Math.floor(y / cell);
        let d1 = 1e9, d2 = 1e9, best = 0;
        for (let dj = -1; dj <= 1; dj++) for (let di = -1; di <= 1; di++) {
          const ii = ci + di, jj = cj + dj, si = ((ii % n) + n) % n, sj = ((jj % n) + n) % n;
          const sd = seeds[sj * n + si], sx = sd[0] + (ii - si) * cell, sy = sd[1] + (jj - sj) * cell;
          const dd = (x - sx) * (x - sx) + (y - sy) * (y - sy);
          if (dd < d1) { d2 = d1; d1 = dd; best = sj * n + si; } else if (dd < d2) d2 = dd;
        }
        const joint = Math.sqrt(d2) - Math.sqrt(d1);
        const c = cols[Math.floor(seeds[best][2] * cols.length)];
        const gr = 0.92 + 0.12 * bruitRep(x / 24, y / 24, S / 24, 5);
        // Le joint : plus sombre et moussu au creux, fondu sur ses bords (pas un trait de dessin).
        const j = joint < 2.2 * k ? 0.74 : joint < 4.6 * k ? 0.74 + 0.26 * (joint - 2.2 * k) / (2.4 * k) : 1;
        const mj = joint < 2.2 * k ? 0.45 : joint < 3.4 * k ? 0.45 * (1 - (joint - 2.2 * k) / (1.2 * k)) : 0;
        const o = (y * S + x) * 4;
        for (let q = 0; q < 3; q++) d[o + q] = (c[q] * gr * j) * (1 - mj) + mousseJ[q] * mj;
        d[o + 3] = 255;
      }
      g.putImageData(img, 0, 0);
      for (let i = 0; i < 900; i++) tache(R() * S, R() * S, (2 + R() * 5) * k, (1.5 + R() * 3) * k, R() * 3, R() < 0.5 ? '#e6e0d2' : '#a39b88', 0.18);
      // Fissures fines, lichens jaunes et gris, mousse dans les creux.
      for (let i = 0; i < 90; i++) trait(R() * S, R() * S, (8 + R() * 20) * k, R() * 6.28, 1.1 * k, '#857c6c', 0.3);
      for (let i = 0; i < 160; i++) tache(R() * S, R() * S, (1.5 + R() * 3) * k, (1.2 + R() * 2) * k, R() * 3, R() < 0.5 ? '#c4b46a' : '#9da08a', 0.35);
      for (let i = 0; i < 420; i++) tache(R() * S, R() * S, (1.5 + R() * 2.5) * k, (1 + R() * 1.6) * k, R() * 3, R() < 0.6 ? '#7c9a5c' : '#9bb174', 0.45);
    } else if (nom === 'roche') {
      const pal = ['#8e877d', '#a0998e', '#7b756c', '#aba497', '#6e6961'];
      fond('#8b847a', pal, 160, 30, 90, 0.25);
      // Strates : des bandes presque horizontales, ondulées.
      for (let y = 0; y < S; y += (10 + R() * 26) * k) {
        const h = (6 + R() * 18) * k, col = pal[Math.floor(R() * pal.length)];
        g.globalAlpha = 0.35; g.fillStyle = col;
        g.beginPath();
        for (let x = 0; x <= S; x += 16) g.lineTo(x, y + (bruitRep(x / 64, y / 50, S / 64, 3) - 0.5) * 18 * k);
        for (let x = S; x >= 0; x -= 16) g.lineTo(x, y + h + (bruitRep(x / 50, y / 40 + 3, S / 50, 4) - 0.5) * 18 * k);
        g.closePath(); g.fill();
      }
      for (let i = 0; i < 70; i++) { const x = R() * S, y = R() * S; trait(x, y, (12 + R() * 40) * k, 1.2 + (R() - 0.5) * 1.4, 2 * k, '#443f39', 0.5); }
      for (let i = 0; i < 1800; i++) tache(R() * S, R() * S, (1 + R() * 3) * k, (1 + R() * 2) * k, R() * 3, R() < 0.5 ? '#cfc8bb' : '#5e5850', 0.3);
      for (let i = 0; i < 120; i++) { const x = R() * S, y = R() * S; for (let j = 0; j < 5; j++) tache(x + (R() - 0.5) * 14 * k, y + (R() - 0.5) * 10 * k, (2 + R() * 3) * k, (1.5 + R() * 2) * k, R() * 3, R() < 0.5 ? '#a9b27c' : '#8f9b68', 0.5); }
    } else if (nom === 'sous_bois') {
      const pal = ['#3d5a3c', '#486a43', '#34503a', '#53774a', '#2f4934'];
      fond('#3e5b3c', pal, 220, 24, 80, 0.28);
      for (let i = 0; i < 2600; i++) tache(R() * S, R() * S, (3 + R() * 7) * k, (2 + R() * 3) * k, R() * 3.14, pal[Math.floor(R() * pal.length)], 0.34);
      // Mousse claire, aiguilles, feuilles mortes, brindilles.
      for (let i = 0; i < 130; i++) { const x = R() * S, y = R() * S; for (let j = 0; j < 8; j++) tache(x + (R() - 0.5) * 30 * k, y + (R() - 0.5) * 22 * k, (3 + R() * 5) * k, (2 + R() * 3) * k, R() * 3, R() < 0.5 ? '#628e4e' : '#74a052', 0.42); }
      for (let i = 0; i < 2600; i++) trait(R() * S, R() * S, (4 + R() * 6) * k, R() * 6.28, 0.9 * k, R() < 0.5 ? '#7a6644' : '#5e5036', 0.45);
      for (let i = 0; i < 520; i++) tache(R() * S, R() * S, (2.2 + R() * 2.4) * k, (1.2 + R()) * k, R() * 3.14, R() < 0.5 ? '#9a6a3a' : (R() < 0.5 ? '#7d5a32' : '#b07c44'), 0.6);
      for (let i = 0; i < 90; i++) trait(R() * S, R() * S, (10 + R() * 18) * k, R() * 6.28, 1.6 * k, '#4a3a28', 0.55);
    }
    g.globalAlpha = 1;
    // Le grain de la brosse : de longs traits presque transparents, dans le sens de la lumière.
    for (let i = 0; i < 700; i++) trait(R() * S, R() * S, (20 + R() * 40) * k, -0.55 + (R() - 0.5) * 0.4, 1.2 * k, R() < 0.5 ? '#ffffff' : '#000000', 0.035);
    g.globalAlpha = 1;
    return P.c;
  }

  function matieres(S) { return MATIERES.map(n => matiere(n, S)); }

  // La couleur moyenne de chaque matière (pour la vue lointaine et la vue d'ensemble).
  function moyennes(toiles) {
    return toiles.map(c => {
      const s = toile(8, 8), g = s.getContext('2d');
      g.drawImage(c, 0, 0, 8, 8);
      const d = g.getImageData(0, 0, 8, 8).data;
      let r = 0, gg = 0, b = 0;
      for (let i = 0; i < 64; i++) { r += d[i * 4]; gg += d[i * 4 + 1]; b += d[i * 4 + 2]; }
      return [r / 64 / 255, gg / 64 / 255, b / 64 / 255];
    });
  }

  // ======================================================================
  // Les cartes de toute l'île, 2 texels par u
  // ======================================================================

  // Distance de chaque texel (centre en ((i + 0,5) / k, (j + 0,5) / k)) à une polyligne, moins
  // `decale` (la demi-largeur d'un sentier : 0 sur son bord), dans une bande de `rayon` u ; garde
  // le minimum dans `dist`.
  function distances(dist, W, H, k, pts, rayon, decale) {
    decale = decale || 0;
    for (let s = 0; s + 1 < pts.length; s++) {
      const ax = pts[s][0], ay = pts[s][1], bx = pts[s + 1][0], by = pts[s + 1][1];
      const sx = bx - ax, sy = by - ay, l2 = sx * sx + sy * sy;
      const i0 = Math.max(0, Math.floor((Math.min(ax, bx) - rayon) * k)), i1 = Math.min(W - 1, Math.ceil((Math.max(ax, bx) + rayon) * k));
      const j0 = Math.max(0, Math.floor((Math.min(ay, by) - rayon) * k)), j1 = Math.min(H - 1, Math.ceil((Math.max(ay, by) + rayon) * k));
      for (let j = j0; j <= j1; j++) for (let i = i0; i <= i1; i++) {
        const x = (i + 0.5) / k, y = (j + 0.5) / k;
        let t = l2 > 0 ? ((x - ax) * sx + (y - ay) * sy) / l2 : 0;
        t = t < 0 ? 0 : t > 1 ? 1 : t;
        const px = ax + sx * t - x, py = ay + sy * t - y, d = Math.sqrt(px * px + py * py) - decale;
        const o = j * W + i;
        if (d < dist[o]) dist[o] = d;
      }
    }
  }

  // Bilinéaire sur la grille du treillis (un échantillon par u).
  const bil = (T, g, u, v) => IleTerrain.bilin(g, T.W, T.H, u, v);

  // Les ombres du terrain sur lui-même, vers la lumière, au treillis : 1 en pleine lumière.
  function ombresTerrain(T) {
    const { W, H, haut, vide } = T, out = new Float32Array(W * H).fill(1);
    const L = LUMIERE;
    for (let v = 0; v < H; v++) for (let u = 0; u < W; u++) {
      const i = v * W + u;
      if (vide[i]) continue;
      const h0 = haut[i];
      let ombre = 0;
      for (let s = 1; s <= 24; s += 1) {
        const x = u + L.x * s, y = v + L.y * s;
        if (x < 0 || y < 0 || x > W - 1 || y > H - 1) break;
        const h = bil(T, haut, x, y), haut2 = h0 + s * L.pente;
        if (h > haut2 + 0.15) { ombre = Math.max(ombre, Math.min(1, (h - haut2) / 1.2)); if (ombre >= 1) break; }
      }
      out[i] = 1 - 0.5 * ombre;
    }
    return out;
  }

  // Poids des matières (deux images RGBA de 480 × 360) :
  //   poids1 = herbe, lande, terre, calcaire ; poids2 = roche, sous-bois, ombre (255 : aucune),
  //   bord (128 : le bord de l'île ; plus clair dedans, plus sombre dans le vide, 60 par u).
  // `objets` : les ombres de contact du décor, peintes par l'appelant sur une toile de même taille.
  function cartes(T, ombreDecor) {
    const k = 2, W = Math.round(T.largeur * k), H = Math.round(T.hauteur * k), N = W * H;
    const p1 = new Uint8Array(N * 4), p2 = new Uint8Array(N * 4);
    const regions = T.regionsZone;
    const REG = { ervane_mailles: 0, ervane_sources: 0, ervane_murets: 1, ervane_bois: 5, ervane_amarre: 3 };
    // Les distances aux lignes, au texel ; celles des sentiers et des ruelles comptées depuis leur
    // bord (moins la demi-largeur).
    const big = () => new Float32Array(N).fill(99);
    const dSentier = big(), dRuelle = big(), dEsc = big(), dHaie = big(), dMuret = big();
    for (const l of T.lignes) {
      if (l.sorte === 'sentier') distances(dSentier, W, H, k, l.pts, l.demi + 2, l.demi);
      else if (l.sorte === 'ruelle' || l.sorte === 'escalier') distances(dRuelle, W, H, k, l.pts, l.demi + 2, l.demi);
      else if (l.sorte === 'escarpement') distances(dEsc, W, H, k, l.pts, 2.5);
      else if (l.sorte === 'haie') distances(dHaie, W, H, k, l.pts, 3);
      else if (l.sorte === 'muret') distances(dMuret, W, H, k, l.pts, 2);
    }
    const ombreT = ombresTerrain(T);
    const gB = M().graineDe(T.graine, 'peinture_bords');
    const w = new Float32Array(6);
    for (let j = 0; j < H; j++) for (let i = 0; i < W; i++) {
      const o = j * W + i, u = (i + 0.5) / k, v = (j + 0.5) / k;
      w.fill(0);
      // La matière de la région, fondue avec celles des voisines sur 1 u (bilinéaire du treillis).
      const u0 = Math.min(T.W - 2, Math.floor(u)), v0 = Math.min(T.H - 2, Math.floor(v)), fu = u - u0, fv = v - v0;
      for (const [du, dv, f] of [[0, 0, (1 - fu) * (1 - fv)], [1, 0, fu * (1 - fv)], [0, 1, (1 - fu) * fv], [1, 1, fu * fv]]) {
        const r = T.region[(v0 + dv) * T.W + u0 + du];
        const m = REG[regions[r]];
        w[m == null ? 0 : m] += f;
      }
      const n1 = M().fbm(u / 9, v / 9, gB, 3), n2 = M().fbm(u / 3.5, v / 3.5, gB + 9, 2);
      // Des mélanges dans chaque région : herbe dans la lande, herbe et terre entre les dalles de
      // l'Amarre, terre au bord de l'eau.
      if (w[1] > 0) { const a = w[1] * lisse(0.55, 0.72, n1) * 0.8; w[1] -= a; w[0] += a; }
      if (w[3] > 0) { const a = w[3] * lisse(0.5, 0.66, n1) * 0.85; w[3] -= a; w[0] += a; const b = w[3] * lisse(0.62, 0.75, n2) * 0.5; w[3] -= b; w[2] += b; }
      if (w[5] > 0) { const a = w[5] * lisse(0.64, 0.8, n1) * 0.6; w[5] -= a; w[0] += a; }
      const jitter = (n2 - 0.5) * 0.6;
      // Les pentes : roche.
      const pente = T.penteA(u, v);
      const roche = lisse(0.62, 1.0, pente + jitter * 0.2);
      // Les sentiers (terre battue) et les ruelles (pavés), bords bruités.
      const sen = 1 - lisse(-0.35, 0.45, dSentier[o] + jitter);
      const rue = 1 - lisse(-0.2, 0.3, dRuelle[o] + jitter * 0.3);
      // Les places.
      let place = 0, placeM = 3;
      for (const p of T.places) {
        const dx = u - p.centre[0], dy = v - p.centre[1], d = Math.sqrt(dx * dx + dy * dy);
        const f = 1 - lisse(p.rayon - 0.6, p.rayon + 0.5, d + jitter * 0.6);
        if (f > place) { place = f; placeM = p.sol === 'terre' ? 2 : p.sol === 'herbe' ? 0 : 3; }
      }
      // L'eau : le lit et les berges en terre.
      const prof = T.profondeurA(u, v);
      const eau = lisse(0.02, 0.25, prof);
      const fosse = 1 - lisse(0.5, 1.6, dHaie[o]);
      const pied = 1 - lisse(0.4, 1.2, dMuret[o]);
      const esc = 1 - lisse(0.25, 0.8, dEsc[o]);
      // Le reste de la région se partage ce que les lignes laissent.
      const appliquer = (m, a) => { if (a <= 0) return; for (let q = 0; q < 6; q++) w[q] *= 1 - a; w[m] += a; };
      appliquer(2, eau * 0.9);
      appliquer(2, fosse * 0.55);
      appliquer(2, pied * 0.35);
      appliquer(placeM, place);
      appliquer(2, sen);
      appliquer(3, rue);
      appliquer(4, Math.max(roche, esc));
      let s = 0;
      for (let q = 0; q < 6; q++) s += w[q];
      s = s || 1;
      p1[o * 4] = Math.round(w[0] / s * 255); p1[o * 4 + 1] = Math.round(w[1] / s * 255); p1[o * 4 + 2] = Math.round(w[2] / s * 255); p1[o * 4 + 3] = Math.round(w[3] / s * 255);
      p2[o * 4] = Math.round(w[4] / s * 255); p2[o * 4 + 1] = Math.round(w[5] / s * 255);
      // L'ombre : celle du terrain, celle du décor, et l'usure plus sombre au bord des sentiers.
      let om = bil(T, ombreT, u, v);
      if (ombreDecor) om *= 1 - ombreDecor[o] / 255 * 0.7;
      const bordSentier = sen > 0.05 && sen < 0.6 ? 0.06 : 0;
      p2[o * 4 + 2] = Math.round(clamp(om - bordSentier, 0, 1) * 255);
      p2[o * 4 + 3] = 128;
    }
    bords(T, p2, W, H, k);
    return { poids1: p1, poids2: p2, w: W, h: H, k };
  }

  // Le bord de l'île (contour, Échancrure, puits) en champ de distance signé dans le canal A :
  // 128 au bord, +60 par u à l'intérieur, -60 par u dans le vide, borné à ±2 u. Le shader du sol
  // le lit en bilinéaire et coupe à 128 : le bord suit le contour bruité, pas la grille.
  function bords(T, p2, W, H, k) {
    const N = W * H, d = new Float32Array(N).fill(2.1);
    const boucle = pts => pts.concat([pts[0]]);
    distances(d, W, H, k, boucle(T.contour), 2.2);
    if (T.echancrure) distances(d, W, H, k, boucle(T.echancrure), 2.2);
    for (const t of T.trous) {
      const cx = t.centre[0], cy = t.centre[1], r = t.rayon;
      for (let j = Math.max(0, Math.floor((cy - r - 2.5) * k)); j <= Math.min(H - 1, Math.ceil((cy + r + 2.5) * k)); j++)
        for (let i = Math.max(0, Math.floor((cx - r - 2.5) * k)); i <= Math.min(W - 1, Math.ceil((cx + r + 2.5) * k)); i++) {
          const x = (i + 0.5) / k, y = (j + 0.5) / k, dd = Math.abs(Math.sqrt((x - cx) * (x - cx) + (y - cy) * (y - cy)) - r);
          if (dd < d[j * W + i]) d[j * W + i] = dd;
        }
    }
    for (let o = 0; o < N; o++) {
      const dedans = !T.videF[o];
      const s = clamp(dedans ? d[o] : -d[o], -2, 2);
      p2[o * 4 + 3] = Math.round(128 + s * 60);
    }
  }

  // ======================================================================
  // La teinte de toute l'île (720 × 540, 3 px par u) : multiplie les matières (128 vaut 1)
  // ======================================================================

  const TEINTES = {
    ervane_mailles: [1.03, 1.0, 0.92],
    ervane_sources: [0.96, 1.08, 0.94],
    ervane_murets: [1.08, 1.0, 0.82],
    ervane_bois: [0.8, 0.93, 0.84],
    ervane_amarre: [0.93, 0.93, 1.0],
  };
  const ACCENTS = { braise: [1.38, 0.78, 0.55], mousse: [0.8, 1.3, 0.66], herbe_blanche: [1.25, 1.22, 1.1] };

  function teinte(T, def) {
    const k = 3, W = Math.round(T.largeur * k), H = Math.round(T.hauteur * k);
    // La teinte des régions, au treillis, floutée sur 3 u : les zones se fondent les unes dans les autres.
    const NW = T.W, NH = T.H;
    const tr = [new Float32Array(NW * NH), new Float32Array(NW * NH), new Float32Array(NW * NH)];
    for (let i = 0; i < NW * NH; i++) { const t = TEINTES[T.regionsZone[T.region[i]]] || [1, 1, 1]; tr[0][i] = t[0]; tr[1][i] = t[1]; tr[2][i] = t[2]; }
    const flou = (a, r) => {
      const tmp = new Float32Array(NW * NH), out = new Float32Array(NW * NH), n = 2 * r + 1;
      for (let v = 0; v < NH; v++) { let s = 0; for (let q = -r; q <= r; q++) s += a[v * NW + clamp(q, 0, NW - 1)]; for (let u = 0; u < NW; u++) { tmp[v * NW + u] = s / n; s += a[v * NW + clamp(u + r + 1, 0, NW - 1)] - a[v * NW + clamp(u - r, 0, NW - 1)]; } }
      for (let u = 0; u < NW; u++) { let s = 0; for (let q = -r; q <= r; q++) s += tmp[clamp(q, 0, NH - 1) * NW + u]; for (let v = 0; v < NH; v++) { out[v * NW + u] = s / n; s += tmp[clamp(v + r + 1, 0, NH - 1) * NW + u] - tmp[clamp(v - r, 0, NH - 1) * NW + u]; } }
      return out;
    };
    for (let q = 0; q < 3; q++) tr[q] = flou(flou(tr[q], 2), 2);
    const c = toile(W, H), g = c.getContext('2d'), img = g.createImageData(W, H), d = img.data;
    const gN = M().graineDe(T.graine, 'teinte');
    const accents = (def.accents || []).map(a => ({ x: a.centre[0], y: a.centre[1], r: a.rayon, t: ACCENTS[a.sol] || [1, 1, 1] }));
    for (let j = 0; j < H; j++) for (let i = 0; i < W; i++) {
      const u = (i + 0.5) / k, v = (j + 0.5) / k;
      let r = IleTerrain.bilin(tr[0], NW, NH, u, v), gg = IleTerrain.bilin(tr[1], NW, NH, u, v), b = IleTerrain.bilin(tr[2], NW, NH, u, v);
      // De grandes taches de valeur, plus claires et plus sombres, comme une peinture.
      const n = M().fbm(u / 14, v / 14, gN, 3), n2 = M().fbm(u / 4.5, v / 4.5, gN + 5, 2);
      const val = 0.86 + 0.28 * n + 0.08 * (n2 - 0.5);
      // Un peu de chaud et de froid dans les taches.
      const chaud = (M().fbm(u / 22, v / 22, gN + 11, 2) - 0.5) * 0.2;
      r *= val * (1 + chaud); gg *= val; b *= val * (1 - chaud);
      for (const a of accents) {
        const dx = u - a.x, dy = v - a.y, dd = Math.sqrt(dx * dx + dy * dy);
        const f = (1 - lisse(a.r * 0.35, a.r * 1.25, dd + (n2 - 0.5) * 2.5)) * 0.85;
        if (f > 0) { r *= 1 + (a.t[0] - 1) * f; gg *= 1 + (a.t[1] - 1) * f; b *= 1 + (a.t[2] - 1) * f; }
      }
      const o = (j * W + i) * 4;
      d[o] = clamp(r * 128, 0, 255); d[o + 1] = clamp(gg * 128, 0, 255); d[o + 2] = clamp(b * 128, 0, 255); d[o + 3] = 255;
    }
    g.putImageData(img, 0, 0);
    // La Source Claire : un vert plus frais tout autour ; le Rond des Quatre : quatre quartiers
    // teintés à peine, un par élément.
    const X = u => u * k, Y = v => v * k;
    const flaque = (u, v, r, col, a) => { const q = g.createRadialGradient(X(u), Y(v), 0, X(u), Y(v), r * k); q.addColorStop(0, rgba(col, a)); q.addColorStop(1, rgba(col, 0)); g.fillStyle = q; g.globalAlpha = 1; g.beginPath(); g.arc(X(u), Y(v), r * k, 0, 6.29); g.fill(); };
    g.globalCompositeOperation = 'source-over';
    flaque(160, 148, 9, '#7ac0a8', 0.22);
    const rond = (T.places || []).find(p => p.id === 'rond_des_quatre');
    if (rond) {
      const els = [['#c06a4a', -2.36], ['#5aa0b0', -0.79], ['#a8a0d8', 0.79], ['#8aaa50', 2.36]];
      for (const [col, a] of els) flaque(rond.centre[0] + Math.cos(a) * 3, rond.centre[1] + Math.sin(a) * 3, 4, col, 0.2);
    }
    return c;
  }

  // ======================================================================
  // La lueur (480 × 360) : ce qui luit au sol, en addition
  // ======================================================================

  function lueur(T) {
    const k = 2, W = Math.round(T.largeur * k), H = Math.round(T.hauteur * k);
    const c = toile(W, H), g = c.getContext('2d'), R = M().hasard(M().graineDe(T.graine, 'lueur'));
    g.fillStyle = '#000000'; g.fillRect(0, 0, W, H);
    const X = u => u * k, Y = v => v * k;
    const flaque = (u, v, r, col, a) => { const q = g.createRadialGradient(X(u), Y(v), 0, X(u), Y(v), r * k); q.addColorStop(0, rgba(col, a)); q.addColorStop(0.45, rgba(col, a * 0.42)); q.addColorStop(1, rgba(col, 0)); g.fillStyle = q; g.globalCompositeOperation = 'lighter'; g.beginPath(); g.arc(X(u), Y(v), r * k, 0, 6.29); g.fill(); };
    for (const o of T.objets) {
      if (o.sorte === 'lanterne') flaque(o.u, o.v, 3.4, '#ffaa44', 0.42);
      else if (o.sorte === 'feu') flaque(o.u, o.v, 4.2, '#ff8a2a', 0.5);
      else if (o.sorte === 'metier') flaque(o.u, o.v, 7, '#ffc65a', 0.28);
      else if (o.sorte === 'relais') flaque(o.u, o.v, 4, '#5ad8ff', 0.3);
      else if (o.sorte === 'fil_d_or') flaque(o.u, o.v, 5, '#ffcf5a', 0.25);
      else if (o.sorte === 'tente') flaque(o.u, o.v, 2.6, '#ffaa44', 0.16);
    }
    for (const r of T.relais) flaque(r.u, r.v, 3.5, '#6fe0ff', 0.22);
    for (const p of T.portes) flaque(p.u, p.v, 3, '#b06cff', 0.3);
    for (const t of T.trous) flaque(t.centre[0], t.centre[1], t.rayon + 3, '#9a5ad8', 0.22);
    // Les fentes de la Source de Braise : des traits orangés qui fument.
    const braise = (T.accents || []).find(a => a.sol === 'braise');
    if (braise) {
      g.globalCompositeOperation = 'lighter';
      for (let i = 0; i < 16; i++) {
        let u = braise.centre[0] + (R() - 0.5) * braise.rayon * 1.6, v = braise.centre[1] + (R() - 0.5) * braise.rayon * 1.6, a = R() * 6.28;
        g.strokeStyle = 'rgba(255,120,40,0.9)'; g.lineWidth = 0.45 * k; g.beginPath(); g.moveTo(X(u), Y(v));
        for (let s = 0; s < 2 + R() * 3; s += 0.4) { a += (R() - 0.5) * 1.1; u += Math.cos(a) * 0.4; v += Math.sin(a) * 0.4; g.lineTo(X(u), Y(v)); }
        g.stroke();
      }
      flaque(braise.centre[0], braise.centre[1], braise.rayon * 0.9, '#ff6a2a', 0.28);
    }
    g.globalCompositeOperation = 'source-over';
    return c;
  }

  // ======================================================================
  // La profondeur de l'eau (480 × 360) : R la profondeur (1,2 u = 255), G un bruit d'écume
  // ======================================================================

  function profondeurEau(T) {
    const k = 2, W = Math.round(T.largeur * k), H = Math.round(T.hauteur * k), out = new Uint8Array(W * H * 4);
    const gN = M().graineDe(T.graine, 'ecume');
    for (let j = 0; j < H; j++) for (let i = 0; i < W; i++) {
      const u = (i + 0.5) / k, v = (j + 0.5) / k, o = (j * W + i) * 4;
      const e = T.eauA(u, v);
      let p = 0;
      if (e != null) p = clamp((e - T.solBrutA(u, v)) / 1.2, 0, 1);
      out[o] = Math.round(p * 255);
      out[o + 1] = Math.round(clamp(M().fbm(u / 1.5, v / 1.5, gN, 3), 0, 1) * 255);
      out[o + 2] = 0; out[o + 3] = 255;
    }
    return { data: out, w: W, h: H };
  }

  // ======================================================================
  // Textures du décor
  // ======================================================================

  // Une bande de strate ondulée, répétable en largeur, sur une toile de largeur W.
  function strate(g, W, y, h, col, a, graine) {
    g.globalAlpha = a; g.fillStyle = col;
    for (const dx of [-W, 0, W]) {
      g.beginPath(); g.moveTo(dx, y);
      for (let x = 0; x <= W; x += 16) g.lineTo(dx + x, y + (bruitRep(x / 60, y / 30, W / 60, graine) - 0.5) * 14);
      for (let x = W; x >= 0; x -= 16) g.lineTo(dx + x, y + h + (bruitRep(x / 50, y / 25 + 2, W / 50, graine + 1) - 0.5) * 14);
      g.closePath(); g.fill();
    }
  }

  // La falaise et les faces des escarpements (répétable en largeur, une fois sur la hauteur). Revue
  // finale : plus du bois strié sous un liseré de caoutchouc. Le calcaire et la terre de l'Amarre en
  // strates irrégulières (épaisseurs et teintes variées, bords ondulés), des cailloux pris dans la
  // roche (ombre dessous, éclat dessus), des fissures courtes dans tous les sens, des racines qui
  // descendent de la lèvre ; en haut, une crête d'herbe dentelée (touffes de hauteurs inégales,
  // trouées) et quelques pierres de bord, pas une bande continue.
  function falaise() {
    const W = 512, H = 512, c = toile(W, H), g = c.getContext('2d'), R = M().hasard(31);
    g.fillStyle = '#9a8c7a'; g.fillRect(0, 0, W, H);
    const cols = ['#8a7d6b', '#b5a68f', '#c6b8a1', '#7a6f61', '#a89985', '#d0c4ab', '#948874', '#bfae95'];
    for (let y = 26; y < H; y += 4 + R() * 26) strate(g, W, y, 6 + R() * 34, cols[Math.floor(R() * cols.length)], 0.5 + R() * 0.4, 4 + Math.floor(R() * 40));
    // Des plaques de terre plus sombre, par endroits.
    for (let i = 0; i < 40; i++) { g.globalAlpha = 0.22; g.fillStyle = R() < 0.5 ? '#6e5a48' : '#5e5244'; g.beginPath(); g.ellipse(R() * W, 60 + R() * (H - 60), 30 + R() * 60, 8 + R() * 18, (R() - 0.5) * 0.4, 0, 6.29); g.fill(); }
    // Les cailloux pris dans la roche : une ombre, la pierre, un éclat.
    for (let i = 0; i < 150; i++) {
      const x = R() * W, y = 50 + R() * (H - 60), r = 3 + R() * 9, col = R() < 0.5 ? '#d7cdb8' : (R() < 0.5 ? '#a99d8b' : '#c2b6a0');
      g.globalAlpha = 0.45; g.fillStyle = '#4e4238'; g.beginPath(); g.ellipse(x + r * 0.3, y + r * 0.45, r, r * 0.7, R() * 3, 0, 6.29); g.fill();
      g.globalAlpha = 0.95; g.fillStyle = col; g.beginPath(); g.ellipse(x, y, r, r * 0.7, R() * 3, 0, 6.29); g.fill();
      g.globalAlpha = 0.5; g.fillStyle = '#f1e9d8'; g.beginPath(); g.ellipse(x - r * 0.3, y - r * 0.3, r * 0.4, r * 0.25, 0, 0, 6.29); g.fill();
    }
    // Les fissures : courtes, brisées, dans tous les sens.
    g.lineCap = 'round';
    for (let i = 0; i < 34; i++) {
      let x = R() * W, y = 50 + R() * (H - 50);
      g.globalAlpha = 0.55 + R() * 0.3; g.strokeStyle = '#4a3f36'; g.lineWidth = 1.5 + R() * 2;
      g.beginPath(); g.moveTo(x, y);
      for (let k = 0; k < 3; k++) { x += (R() - 0.5) * 40; y += 6 + R() * 26; g.lineTo(x, y); }
      g.stroke();
    }
    // Les racines : brunes, qui descendent de la lèvre, parfois fourchues.
    for (let i = 0; i < 14; i++) {
      let x = R() * W, y = 24;
      g.globalAlpha = 0.85; g.strokeStyle = R() < 0.5 ? '#5a4634' : '#6c5440'; g.lineWidth = 2 + R() * 2.5;
      g.beginPath(); g.moveTo(x, y);
      for (let k = 0; k < 4; k++) { x += (R() - 0.5) * 30; y += 30 + R() * 50; g.lineTo(x, y); }
      g.stroke();
    }
    const grd = g.createLinearGradient(0, 0, 0, H); grd.addColorStop(0, 'rgba(0,0,0,0)'); grd.addColorStop(1, 'rgba(46,38,44,0.42)'); g.globalAlpha = 1; g.fillStyle = grd; g.fillRect(0, 0, W, H);
    // La crête d'herbe : une bande fine et ondulée, puis des touffes dentelées de hauteurs inégales,
    // trouées, et des pierres de bord.
    strate(g, W, -8, 16, '#6f9a5c', 0.95, 60);
    for (let x = -6; x < W + 6; x += 5 + R() * 5) {
      const h = 10 + bruitRep(x / 40, 1, W / 40, 61) * 46 * (R() < 0.12 ? 0.3 : 1), w = 4 + R() * 6, col = R() < 0.5 ? '#6f9a5c' : (R() < 0.5 ? '#8db86a' : '#5a8450');
      g.globalAlpha = 0.9; g.fillStyle = col;
      for (const dx of [-W, 0, W]) { g.beginPath(); g.moveTo(dx + x - w, 6); g.lineTo(dx + x + (R() - 0.5) * 6, 6 + h); g.lineTo(dx + x + w, 6); g.closePath(); g.fill(); }
    }
    for (let i = 0; i < 22; i++) { const x = R() * W, r = 4 + R() * 6; g.globalAlpha = 0.9; g.fillStyle = R() < 0.5 ? '#bdb09a' : '#a79b86'; g.beginPath(); g.ellipse(x, 10 + R() * 12, r, r * 0.65, R() * 3, 0, 6.29); g.fill(); g.globalAlpha = 0.5; g.fillStyle = '#f1e9d8'; g.beginPath(); g.ellipse(x - r * 0.3, 8 + R() * 10, r * 0.35, r * 0.2, 0, 0, 6.29); g.fill(); }
    g.globalAlpha = 1;
    return c;
  }

  // La paroi d'une salle du Puits (js/ile-salle.js) : le calcaire de l'Amarre en cinq strates
  // irrégulières sur la hauteur, joints sombres, lichens pâles, quelques fissures ; répétable dans
  // les deux sens (les blocs des murs répètent la toile).
  function paroi() {
    const W = 512, H = 512, c = toile(W, H), g = c.getContext('2d'), R = M().hasard(37);
    g.fillStyle = '#6e6572'; g.fillRect(0, 0, W, H);
    const cols = ['#776e7a', '#8a8089', '#655c6a', '#948a93', '#7d7382', '#5e5663'];
    const N = 5;
    for (let k = 0; k < N; k++) {
      const y = k * H / N, h = H / N;
      strate(g, W, y - 4, h + 8, cols[k % cols.length], 0.9, 70 + k);
      // Le joint sombre sous chaque strate.
      g.globalAlpha = 0.6; g.strokeStyle = '#2d2733'; g.lineWidth = 3; g.lineCap = 'round';
      for (const dx of [-W, 0, W]) { g.beginPath(); for (let x = 0; x <= W; x += 12) g.lineTo(dx + x, y + h - 2 + (bruitRep(x / 40, k, W / 40, 80 + k) - 0.5) * 8); g.stroke(); }
    }
    for (let i = 0; i < 160; i++) { g.globalAlpha = 0.18; g.fillStyle = R() < 0.5 ? '#c9c0c8' : '#3d3542'; g.beginPath(); g.ellipse(R() * W, R() * H, 6 + R() * 30, 3 + R() * 7, (R() - 0.5) * 0.4, 0, 6.29); g.fill(); }
    // Les lichens pâles et verdâtres.
    for (let i = 0; i < 90; i++) { const x = R() * W, y = R() * H; for (let j = 0; j < 4; j++) { g.globalAlpha = 0.35; g.fillStyle = R() < 0.5 ? '#a8ad8a' : '#8f9a9a'; g.beginPath(); g.ellipse(x + (R() - 0.5) * 16, y + (R() - 0.5) * 12, 2 + R() * 4, 1.5 + R() * 3, R() * 3, 0, 6.29); g.fill(); } }
    g.lineCap = 'round';
    for (let i = 0; i < 22; i++) { let x = R() * W, y = R() * H; g.globalAlpha = 0.6; g.strokeStyle = '#2a2430'; g.lineWidth = 1.5 + R() * 1.5; g.beginPath(); g.moveTo(x, y); for (let k = 0; k < 3; k++) { x += (R() - 0.5) * 30; y += 8 + R() * 22; g.lineTo(x, y); } g.stroke(); }
    g.globalAlpha = 1;
    return c;
  }

  // Les touches : une trame de taches claires et sombres, répétable, pour frondaisons et pierres.
  function touches(graine, douceur) {
    const S = 256, P = peintre(S, graine);
    P.g.fillStyle = '#9a9a9a'; P.g.fillRect(0, 0, S, S);
    for (let i = 0; i < 520; i++) {
      const r = 8 + P.R() * 18, v = P.R() < 0.5 ? 120 + P.R() * 40 : 150 + P.R() * 70;
      P.tache(P.R() * S, P.R() * S, r, r * 0.6, P.R() * 3.14, hexDe(v, v, v), douceur);
    }
    P.g.globalAlpha = 1;
    return P.c;
  }

  // La trame du détail des frondaisons et des pierres : des taches claires et sombres autour d'un gris
  // très clair, pour moduler la couleur des sommets sans l'éteindre (en linéaire, environ 0,75 en
  // moyenne). Les touches ci-dessus, centrées sur le gris moyen, servent au bruit du sol et de l'eau.
  function trame(graine, douceur) {
    const S = 256, P = peintre(S, graine);
    P.g.fillStyle = '#e6e6e6'; P.g.fillRect(0, 0, S, S);
    for (let i = 0; i < 560; i++) {
      const r = 7 + P.R() * 18, v = P.R() < 0.45 ? 176 + P.R() * 36 : 224 + P.R() * 31;
      P.tache(P.R() * S, P.R() * S, r, r * 0.6, P.R() * 3.14, hexDe(v, v, v), douceur);
    }
    P.g.globalAlpha = 1;
    return P.c;
  }

  // Les nuages : un banc étiré, aux bords diffus, plus clair dessus et gris dessous.
  function nuage(graine) {
    const W = 512, H = 192, c = toile(W, H), g = c.getContext('2d'), R = M().hasard(graine);
    const boule = (x, y, rx, ry, col, a) => { g.save(); g.translate(x, y); g.scale(rx, ry); const q = g.createRadialGradient(0, 0, 0, 0, 0, 1); q.addColorStop(0, rgba(col, a)); q.addColorStop(0.3, rgba(col, a * 0.85)); q.addColorStop(0.65, rgba(col, a * 0.35)); q.addColorStop(1, rgba(col, 0)); g.fillStyle = q; g.beginPath(); g.arc(0, 0, 1, 0, 6.29); g.fill(); g.restore(); };
    const boules = [], n = 22 + Math.floor(R() * 10);
    for (let i = 0; i < n; i++) { const t = i / (n - 1), r = (13 + R() * 20) * (0.5 + 0.9 * Math.sin(t * Math.PI)); boules.push([40 + t * (W - 80) + (R() - 0.5) * 40, H * 0.55 - r * 0.3 + (R() - 0.5) * 34, r]); }
    for (const [x, y, r] of boules) boule(x + 6, y + r * 0.5, r * 2.6, r * 1.1, '#5d6378', 0.45);
    for (const [x, y, r] of boules) boule(x, y, r * 2.4, r, '#b3b9c6', 0.7);
    for (const [x, y, r] of boules) if (R() < 0.6) boule(x - r * 0.4, y - r * 0.45, r * 1.4, r * 0.55, '#e2e5ec', 0.45);
    g.globalCompositeOperation = 'destination-in';
    const gx = g.createLinearGradient(0, 0, W, 0); gx.addColorStop(0, 'rgba(0,0,0,0)'); gx.addColorStop(0.18, 'rgba(0,0,0,1)'); gx.addColorStop(0.82, 'rgba(0,0,0,1)'); gx.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = gx; g.fillRect(0, 0, W, H);
    const gy = g.createLinearGradient(0, 0, 0, H); gy.addColorStop(0, 'rgba(0,0,0,0)'); gy.addColorStop(0.25, 'rgba(0,0,0,1)'); gy.addColorStop(0.8, 'rgba(0,0,0,1)'); gy.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = gy; g.fillRect(0, 0, W, H);
    g.globalCompositeOperation = 'source-over';
    return c;
  }

  // Un banc de nuages répétable, vu d'au-dessus : la mer de nuages sous l'île.
  function bancNuages(taille) {
    const S = taille || 1024, c = toile(S, S), g = c.getContext('2d'), R = M().hasard(321);
    const boule = (x, y, r, col, a) => { for (const dx of [-S, 0, S]) for (const dy of [-S, 0, S]) { g.save(); g.translate(x + dx, y + dy); g.scale(r * 1.9, r * 0.85); const q = g.createRadialGradient(0, 0, 0, 0, 0, 1); q.addColorStop(0, rgba(col, a)); q.addColorStop(0.4, rgba(col, a * 0.7)); q.addColorStop(1, rgba(col, 0)); g.fillStyle = q; g.beginPath(); g.arc(0, 0, 1, 0, 6.29); g.fill(); g.restore(); } };
    const boules = [];
    for (let i = 0; i < 150; i++) { const n = M().fbm(i * 0.37, i * 0.11, 9, 2); if (n < 0.42) continue; boules.push([R() * S, R() * S, (40 + R() * 95) * S / 1024]); }
    for (const [x, y, r] of boules) boule(x + 14 * S / 1024, y + 34 * S / 1024, r * 1.15, '#48506a', 0.7);
    for (const [x, y, r] of boules) boule(x, y, r, '#b0b7c6', 0.85);
    for (const [x, y, r] of boules) if (R() < 0.6) boule(x - r * 0.25, y - r * 0.3, r * 0.5, '#e6e9ef', 0.6);
    return c;
  }

  // Le halo d'une lanterne : très fondu, pas de bord visible, même en addition.
  function halo() {
    const S = 128, c = toile(S, S), g = c.getContext('2d');
    const q = g.createRadialGradient(S / 2, S / 2, 0, S / 2, S / 2, S / 2);
    q.addColorStop(0, 'rgba(255,255,255,1)'); q.addColorStop(0.1, 'rgba(255,255,255,0.72)'); q.addColorStop(0.32, 'rgba(255,255,255,0.26)');
    q.addColorStop(0.62, 'rgba(255,255,255,0.07)'); q.addColorStop(0.85, 'rgba(255,255,255,0.015)'); q.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = q; g.fillRect(0, 0, S, S);
    return c;
  }

  // L'ombre au sol d'une figure : un disque flou.
  function ombre() {
    const S = 64, c = toile(S, S), g = c.getContext('2d');
    const q = g.createRadialGradient(S / 2, S / 2, 0, S / 2, S / 2, S / 2);
    q.addColorStop(0, 'rgba(0,0,0,0.85)'); q.addColorStop(0.45, 'rgba(0,0,0,0.6)'); q.addColorStop(0.75, 'rgba(0,0,0,0.22)'); q.addColorStop(1, 'rgba(0,0,0,0)');
    g.fillStyle = q; g.fillRect(0, 0, S, S);
    return c;
  }

  // La chute d'eau : un voile bleuté, des traits d'écume, répétables en hauteur.
  function chute() {
    const W = 128, H = 512, c = toile(W, H), g = c.getContext('2d'), R = M().hasard(9);
    g.fillStyle = 'rgba(176,206,228,0.38)'; g.fillRect(0, 0, W, H);
    const traits = (n, col, amin, amax, wmax) => {
      for (let i = 0; i < n; i++) {
        const x = R() * W, y = R() * H, w = 1 + R() * wmax, h = 30 + R() * 130, a = amin + R() * (amax - amin);
        for (const dy of [0, -H, H]) { const q = g.createLinearGradient(0, y + dy, 0, y + dy + h); q.addColorStop(0, rgba(col, 0)); q.addColorStop(0.5, rgba(col, a)); q.addColorStop(1, rgba(col, 0)); g.fillStyle = q; g.fillRect(x, y + dy, w, h); }
      }
    };
    traits(320, '#6f9ab8', 0.35, 0.7, 5);
    traits(700, '#f4fbff', 0.45, 0.95, 4);
    return c;
  }

  // Le grain de papier, posé en surimpression CSS sur la scène 3D.
  function grain() {
    const S = 192, c = toile(S, S), g = c.getContext('2d'), img = g.createImageData(S, S), d = img.data, R = M().hasard(77);
    for (let i = 0; i < S * S; i++) { const v = 110 + R() * 70; d[i * 4] = d[i * 4 + 1] = d[i * 4 + 2] = v; d[i * 4 + 3] = 255; }
    g.putImageData(img, 0, 0);
    return c;
  }

  // La vue d'ensemble de l'île (1 px par u par défaut) : la teinte posée sur la couleur moyenne des
  // matières, le vide transparent. Elle sert à la carte du monde ; la mini-carte suivra (étape c).
  const vues = new Map();
  const oublierVues = () => vues.clear();
  function vueEnsemble(T, k) {
    k = k || 1;
    const cle = T.id + '|' + k;
    if (vues.has(cle)) return vues.get(cle);
    const W = Math.round(T.largeur * k), H = Math.round(T.hauteur * k), c = toile(W, H), g = c.getContext('2d'), img = g.createImageData(W, H), d = img.data;
    const MOY = { herbe: [0.42, 0.6, 0.35], lande: [0.65, 0.57, 0.36], terre: [0.65, 0.55, 0.41], calcaire: [0.84, 0.81, 0.75], roche: [0.54, 0.56, 0.61], sous_bois: [0.24, 0.35, 0.28] };
    // La couleur de chaque u (matière, teinte de la zone, ombre de la pente), puis une interpolation
    // bilinéaire entre les quatre u voisins de chaque pixel (revue finale : à 2 ou 4 px par u, les
    // u se voyaient en blocs sur les cases de l'onglet Cartes) ; le vide ne pèse rien.
    const WC = T.W, HC = T.H, cols = new Float32Array(WC * HC * 3), plein = new Uint8Array(WC * HC);
    for (let j = 0; j < HC; j++) for (let i = 0; i < WC; i++) {
      const q = j * WC + i;
      if (T.vide[q]) continue;
      plein[q] = 1;
      const m = MOY[T.solA(i, j)] || MOY.herbe, t = TEINTES[T.zoneA(i, j)] || [1, 1, 1];
      const ombre = 0.85 + 0.15 * clamp(1 - T.penteA(i, j), 0, 1);
      cols[q * 3] = m[0] * t[0] * 255 * ombre; cols[q * 3 + 1] = m[1] * t[1] * 255 * ombre; cols[q * 3 + 2] = m[2] * t[2] * 255 * ombre;
    }
    for (let j = 0; j < H; j++) for (let i = 0; i < W; i++) {
      const u = (i + 0.5) / k, v = (j + 0.5) / k, o = (j * W + i) * 4;
      if (T.videA(u, v)) { d[o + 3] = 0; continue; }
      if (T.profondeurA(u, v) > 0.15) { d[o] = 70; d[o + 1] = 140; d[o + 2] = 160; d[o + 3] = 255; continue; }
      const i0 = Math.min(WC - 1, Math.max(0, Math.floor(u))), j0 = Math.min(HC - 1, Math.max(0, Math.floor(v)));
      const i1 = Math.min(WC - 1, i0 + 1), j1 = Math.min(HC - 1, j0 + 1), fu = clamp(u - i0, 0, 1), fv = clamp(v - j0, 0, 1);
      let r = 0, gg = 0, b = 0, p = 0;
      const prendre = (ii, jj, w) => { const q = jj * WC + ii; if (!plein[q] || w <= 0) return; r += cols[q * 3] * w; gg += cols[q * 3 + 1] * w; b += cols[q * 3 + 2] * w; p += w; };
      prendre(i0, j0, (1 - fu) * (1 - fv)); prendre(i1, j0, fu * (1 - fv)); prendre(i0, j1, (1 - fu) * fv); prendre(i1, j1, fu * fv);
      if (!p) { const q = j0 * WC + i0; r = cols[q * 3]; gg = cols[q * 3 + 1]; b = cols[q * 3 + 2]; p = 1; }
      d[o] = clamp(r / p, 0, 255); d[o + 1] = clamp(gg / p, 0, 255); d[o + 2] = clamp(b / p, 0, 255); d[o + 3] = 255;
    }
    g.putImageData(img, 0, 0);
    vues.set(cle, c);
    return c;
  }

  return { MATIERES, LUMIERE, toile, mix, rgba, rgbDe, hexDe, matiere, matieres, moyennes, cartes, teinte, lueur, profondeurEau, falaise, paroi, touches, trame, nuage, bancNuages, halo, ombre, chute, grain, vueEnsemble, oublierVues, distances, TEINTES };
}
const IlePeinture = fabriqueIlePeinture();
