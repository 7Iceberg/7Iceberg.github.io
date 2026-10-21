// Le terrain d'un plateau continu (docs/ILE-TECHNIQUE.md, 2.2 à 2.7 et 2.12) : bord bruité, base
// des régions, relief, lignes (sentiers, ruelles, escarpements, escaliers, ravins, rus, murets,
// haies, ponts, gués), places, eaux, trous, lèvre, matières de sol, objets posés et semis du décor.
// Sans DOM : il se charge sous Node (tests, outils, validateur) comme dans le navigateur.
//
// Déterministe sur tous les moteurs JavaScript : aucune fonction transcendante (Math.sin, cos,
// atan2, exp, log, pow, hypot), dont les derniers bits diffèrent d'un moteur à l'autre. Le bruit
// est un hachage entier (Math.imul, décalages) interpolé par des polynômes ; les courbes sont des
// polynômes (Catmull-Rom) ; Math.sqrt, arrondie exactement par la norme, est permise. Les sinus,
// cosinus et arcs tangentes dont on a besoin (empreintes tournées, cap) sont des polynômes
// (IleTerrain.M). Tout le hasard vient de la graine du plateau, jamais de Math.random ni de l'heure.
//
// Repère : u d'ouest en est, v du nord au sud, en unités (1 u = 1 case de combat) ; la grille des
// hauteurs a un échantillon par u entier (241 × 181 pour une île de 240 × 180), la grille fine
// (masque du vide, ponts, passages) une case par demi-unité, centrée en (i + 0,5) × 0,5.
const IleTerrain = (() => {
  // Les fonctions de Math liées une fois : sous Node, dans un contexte vm, chaque lecture d'une
  // globale passe par un intercepteur et coûte cher dans les boucles.
  const { imul, floor, ceil, round, sqrt, abs, min, max, SQRT2 } = Math;

  // ----- Arithmétique déterministe -----

  // Hachage entier de trois entiers, rendu dans [0, 1).
  function hache(x, y, s) {
    let h = (imul(x | 0, 374761393) + imul(y | 0, 668265263) + imul(s | 0, 974634211)) | 0;
    h = imul(h ^ (h >>> 13), 1274126177);
    return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
  }
  const doux = t => t * t * (3 - 2 * t);
  const borne = (x, a, b) => (x < a ? a : x > b ? b : x);
  const fondu = (x, a, b) => doux(borne((x - a) / (b - a), 0, 1));

  // Bruit de valeur sur un treillis entier, interpolé en douceur.
  function bruit(x, y, s) {
    const xi = floor(x), yi = floor(y);
    const u = doux(x - xi), v = doux(y - yi);
    const a = hache(xi, yi, s), b = hache(xi + 1, yi, s), c = hache(xi, yi + 1, s), d = hache(xi + 1, yi + 1, s);
    return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
  }
  // Somme d'octaves (fréquences doublées, amplitudes divisées par deux : produits exacts).
  function fbm(x, y, s, oct) {
    let v = 0, a = 0.5, f = 1, n = 0;
    for (let k = 0; k < oct; k++) { v += a * bruit(x * f, y * f, s + k * 31); n += a; a *= 0.5; f *= 2; }
    return v / n;
  }
  // Bruit à une dimension (le long d'un contour).
  function bruit1(x, s) {
    const xi = floor(x), t = doux(x - xi);
    const a = hache(xi, 0, s), b = hache(xi + 1, 0, s);
    return a + (b - a) * t;
  }

  // Empreinte d'une chaîne (identifiants, clés de graine).
  function cle(str) {
    let h = 2166136261 | 0;
    for (let i = 0; i < str.length; i++) h = imul(h ^ str.charCodeAt(i), 16777619);
    return h >>> 0;
  }
  // Générateur à graine (mulberry32), un par usage et par élément.
  function hasard(graine) {
    let a = graine >>> 0;
    return () => {
      a = (a + 0x6D2B79F5) | 0;
      let t = imul(a ^ (a >>> 15), 1 | a);
      t = (t + imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  const graineDe = (g, nom) => (imul(g | 0, 2654435761) ^ cle(nom)) >>> 0;

  // Sinus, cosinus et arc tangente polynomiaux : erreur sous 1e-8, mêmes bits partout.
  const PI = Math.PI, DPI = 2 * Math.PI, MPI = Math.PI / 2;
  function sin(x) {
    x -= DPI * round(x / DPI);
    if (x > MPI) x = PI - x; else if (x < -MPI) x = -PI - x;
    const x2 = x * x;
    return x * (1 + x2 * (-1 / 6 + x2 * (1 / 120 + x2 * (-1 / 5040 + x2 * (1 / 362880 + x2 * (-1 / 39916800 + x2 / 6227020800))))));
  }
  const cos = x => sin(x + MPI);
  function atan(t) {
    // atan(t) = 2 atan(r), r = t / (1 + racine(1 + t²)), |r| < 0,42 : la série converge vite.
    const r = t / (1 + sqrt(1 + t * t)), r2 = r * r;
    let s = 0, p = r;
    for (let k = 0; k < 12; k++) { s += (k & 1 ? -p : p) / (2 * k + 1); p *= r2; }
    return 2 * s;
  }
  function atan2(y, x) {
    if (x === 0 && y === 0) return 0;
    if (abs(x) >= abs(y)) { const a = atan(y / x); return x > 0 ? a : (y >= 0 ? a + PI : a - PI); }
    const a = atan(x / y);
    return y > 0 ? MPI - a : -MPI - a;
  }
  const quantifier = h => round(h * 256) / 256;

  // ----- Géométrie -----

  // Point dans un polygone (règle pair-impair).
  function dansPoly(poly, x, y) {
    let c = false;
    for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
      const xi = poly[i][0], yi = poly[i][1], xj = poly[j][0], yj = poly[j][1];
      if ((yi > y) !== (yj > y) && x < (xj - xi) * (y - yi) / (yj - yi) + xi) c = !c;
    }
    return c;
  }

  // Remplit un polygone sur une grille régulière : pour chaque ligne j (y = y0 + j·dy), les cases i
  // (x = x0 + i·dx) à l'intérieur reçoivent fn(index). Balayage par lignes, règle pair-impair, avec
  // la même convention que dansPoly : un point posé sur une arête commune à deux contours
  // appartient à un seul des deux (bord gauche et bord haut compris, bord droit et bas exclus).
  function remplir(poly, nx, ny, x0, dx, y0, dy, fn) {
    const n = poly.length, xs = [];
    let ymin = Infinity, ymax = -Infinity;
    for (const p of poly) { if (p[1] < ymin) ymin = p[1]; if (p[1] > ymax) ymax = p[1]; }
    const j0 = max(0, ceil((ymin - y0) / dy)), j1 = min(ny - 1, floor((ymax - y0) / dy));
    for (let j = j0; j <= j1; j++) {
      const y = y0 + j * dy;
      xs.length = 0;
      for (let a = 0, b = n - 1; a < n; b = a++) {
        const ya = poly[a][1], yb = poly[b][1];
        if ((ya > y) !== (yb > y)) xs.push(poly[a][0] + (y - ya) * (poly[b][0] - poly[a][0]) / (yb - ya));
      }
      xs.sort((p, q) => p - q);
      for (let k = 0; k + 1 < xs.length; k += 2) {
        const i0 = max(0, ceil((xs[k] - x0) / dx)), i1 = min(nx - 1, floor((xs[k + 1] - x0) / dx));
        for (let i = i0; i <= i1; i++) {
          const x = x0 + i * dx;
          if (x >= xs[k] && x < xs[k + 1]) fn(j * nx + i);
        }
      }
    }
  }

  // Une courbe de Catmull-Rom (uniforme) qui passe par les points, échantillonnée environ tous les
  // `pas` u. Une courbe fermée reboucle.
  function courbe(points, pas, ferme) {
    const n = points.length;
    if (n < 2) return points.map(p => [p[0], p[1]]);
    const P = k => (ferme ? points[((k % n) + n) % n] : points[borne(k, 0, n - 1)]);
    const out = [];
    const segs = ferme ? n : n - 1;
    for (let k = 0; k < segs; k++) {
      const p0 = P(k - 1), p1 = P(k), p2 = P(k + 1), p3 = P(k + 2);
      const dxs = p2[0] - p1[0], dys = p2[1] - p1[1];
      const m = max(1, ceil(sqrt(dxs * dxs + dys * dys) / pas));
      for (let q = 0; q < m; q++) {
        const t = q / m, t2 = t * t, t3 = t2 * t;
        const c = (a, b, c2, d) => 0.5 * (2 * b + (-a + c2) * t + (2 * a - 5 * b + 4 * c2 - d) * t2 + (-a + 3 * b - 3 * c2 + d) * t3);
        out.push([c(p0[0], p1[0], p2[0], p3[0]), c(p0[1], p1[1], p2[1], p3[1])]);
      }
    }
    if (!ferme) out.push([points[n - 1][0], points[n - 1][1]]);
    return out;
  }

  // Longueurs cumulées d'une polyligne.
  function cumul(pts) {
    const c = new Float64Array(pts.length);
    for (let k = 1; k < pts.length; k++) { const dx = pts[k][0] - pts[k - 1][0], dy = pts[k][1] - pts[k - 1][1]; c[k] = c[k - 1] + sqrt(dx * dx + dy * dy); }
    return c;
  }
  // Le point d'une polyligne à l'abscisse s.
  function pointA(pts, cum, s) {
    const n = pts.length;
    if (s <= 0) return pts[0];
    if (s >= cum[n - 1]) return pts[n - 1];
    let a = 0, b = n - 1;
    while (b - a > 1) { const m = (a + b) >> 1; if (cum[m] <= s) a = m; else b = m; }
    const L = cum[b] - cum[a], t = L > 0 ? (s - cum[a]) / L : 0;
    return [pts[a][0] + (pts[b][0] - pts[a][0]) * t, pts[a][1] + (pts[b][1] - pts[a][1]) * t];
  }
  // Distance d'un point à une polyligne et abscisse du point le plus proche.
  function projeter(pts, cum, x, y) {
    let best = Infinity, sb = 0;
    for (let k = 0; k + 1 < pts.length; k++) {
      const ax = pts[k][0], ay = pts[k][1], bx = pts[k + 1][0], by = pts[k + 1][1];
      const dx = bx - ax, dy = by - ay, l2 = dx * dx + dy * dy;
      let t = l2 > 0 ? ((x - ax) * dx + (y - ay) * dy) / l2 : 0;
      t = borne(t, 0, 1);
      const px = ax + dx * t - x, py = ay + dy * t - y, d2 = px * px + py * py;
      if (d2 < best) { best = d2; sb = cum[k] + (cum[k + 1] - cum[k]) * t; }
    }
    return { d: sqrt(best), s: sb };
  }

  // Les cases d'une grille régulière à moins de `rayon` d'une polyligne : fn(index, distance,
  // abscisse), chaque case une fois, dans l'ordre des index.
  function prochesLigne(pts, cum, rayon, nx, ny, x0, dx, y0, dy, fn) {
    const best = new Map();
    for (let k = 0; k + 1 < pts.length; k++) {
      const ax = pts[k][0], ay = pts[k][1], bx = pts[k + 1][0], by = pts[k + 1][1];
      const sx = bx - ax, sy = by - ay, l2 = sx * sx + sy * sy;
      const i0 = max(0, ceil((min(ax, bx) - rayon - x0) / dx)), i1 = min(nx - 1, floor((max(ax, bx) + rayon - x0) / dx));
      const j0 = max(0, ceil((min(ay, by) - rayon - y0) / dy)), j1 = min(ny - 1, floor((max(ay, by) + rayon - y0) / dy));
      for (let j = j0; j <= j1; j++) for (let i = i0; i <= i1; i++) {
        const x = x0 + i * dx, y = y0 + j * dy;
        let t = l2 > 0 ? ((x - ax) * sx + (y - ay) * sy) / l2 : 0;
        t = borne(t, 0, 1);
        const px = ax + sx * t - x, py = ay + sy * t - y, d2 = px * px + py * py;
        if (d2 > rayon * rayon) continue;
        const idx = j * nx + i, cur = best.get(idx);
        if (!cur || d2 < cur[0]) best.set(idx, [d2, cum[k] + (cum[k + 1] - cum[k]) * t]);
      }
    }
    const ids = [...best.keys()].sort((a, b) => a - b);
    for (const idx of ids) { const e = best.get(idx); fn(idx, sqrt(e[0]), e[1]); }
  }

  // Un contour bruité le long de son abscisse curviligne : des points tous les `pas` u, déplacés
  // le long de la normale d'au plus `ampl` u (deux octaves de bruit, longueurs 7 u et 2,3 u).
  function contourBruite(poly, ampl, graine, pas) {
    const pts = [];
    const n = poly.length;
    for (let k = 0; k < n; k++) {
      const a = poly[k], b = poly[(k + 1) % n];
      const dx = b[0] - a[0], dy = b[1] - a[1], L = sqrt(dx * dx + dy * dy);
      const m = max(1, ceil(L / pas));
      for (let q = 0; q < m; q++) pts.push([a[0] + dx * q / m, a[1] + dy * q / m]);
    }
    if (!ampl) return pts;
    const N = pts.length, out = new Array(N);
    let s = 0;
    for (let k = 0; k < N; k++) {
      const p = pts[(k + N - 1) % N], q = pts[(k + 1) % N];
      if (k) { const dx = pts[k][0] - pts[k - 1][0], dy = pts[k][1] - pts[k - 1][1]; s += sqrt(dx * dx + dy * dy); }
      const tx = q[0] - p[0], ty = q[1] - p[1], tl = sqrt(tx * tx + ty * ty) || 1;
      const b = 0.65 * bruit1(s / 7, graine) + 0.35 * bruit1(s / 2.3, graine + 7);
      const off = ampl * (2 * b - 1);
      out[k] = [pts[k][0] + (ty / tl) * off, pts[k][1] - (tx / tl) * off];
    }
    return out;
  }

  // ----- Les sortes du décor posé : empreinte (ce que la navigation bloque) -----
  // Formes locales, avant rotation : cercle { x, y, r }, rectangle { x, y, l, p } (longueur le long
  // de la rotation, profondeur en travers), anneau { r1, r2 }.
  const EMPREINTES = {
    metier: o => [{ rect: true, x: 0, y: 0, l: 5, p: 1.4 }],
    relais: o => [{ rect: true, x: 0, y: 0, l: 3, p: 1 }],
    maison: o => { const t = o.taille || [6, 5]; return [{ rect: true, x: 0, y: 0, l: t[0], p: t[1] }]; },
    comptoir: o => { const t = o.taille || [5, 2]; return [{ rect: true, x: 0, y: 0, l: t[0], p: t[1] }]; },
    tour: o => { const t = o.taille || [5, 5]; return [{ x: 0, y: 0, r: t[0] / 2 }]; },
    // Une ruine : quatre murs sans toit, une ouverture au milieu du mur sud (dans son repère).
    ruine: o => {
      const t = o.taille || [6, 5], l = t[0] / 2, p = t[1] / 2, e = 0.6, g = min(1.8, t[0] * 0.35);
      return [
        { rect: true, x: 0, y: -p, l: t[0], p: e }, { rect: true, x: -l, y: 0, l: e, p: t[1] }, { rect: true, x: l, y: 0, l: e, p: t[1] },
        { rect: true, x: -(l + g) / 2, y: p, l: l - g, p: e }, { rect: true, x: (l + g) / 2, y: p, l: l - g, p: e },
      ];
    },
    tente: o => { const t = o.taille || [3, 3]; return [{ rect: true, x: 0, y: 0, l: t[0], p: t[1] }]; },
    pierre_levee: o => [{ x: 0, y: 0, r: 0.55 }],
    borne: o => [{ x: 0, y: 0, r: 0.45 }],
    arche_brisee: o => [{ x: -1.6, y: 0, r: 0.6 }, { x: 1.6, y: 0, r: 0.6 }],
    arche: o => [{ x: -2.0, y: 0, r: 0.55 }, { x: 2.0, y: 0, r: 0.55 }],
    cairn: o => [{ x: 0, y: 0, r: 0.4 + 0.3 * (o.hauteur || 2) }],
    arbre_bobine: o => [{ x: 0, y: 0, r: 2.4 }],
    margelle: o => [{ anneau: true, r1: o.rayon || 8, r2: (o.rayon || 8) + (o.largeur || 1.2) }],
    treuil: o => [{ x: 0, y: 0, r: 0.8 }],
    nacelle: o => [{ x: 0, y: 0, r: 1.2 }],
    panneau: o => [{ x: 0, y: 0, r: 0.3 }],
    lanterne: o => [{ x: 0, y: 0, r: 0.25 }],
    longue_vue: o => [{ x: 0, y: 0, r: 0.3 }],
    feu: o => [{ x: 0, y: 0, r: 0.6 }],
    four: o => [{ x: 0, y: 0, r: 1.0 }],
    puits_sec: o => [{ x: 0, y: 0, r: 1.0 }],
    poteau: o => [{ x: 0, y: 0, r: 0.3 }],
    pieu: o => [{ x: 0, y: 0, r: 0.25 }],
    ratelier: o => [{ rect: true, x: 0, y: 0, l: 2.4, p: 0.6 }],
    // Le petit mobilier du village (revue finale) : un tonneau, une barrière (`longueur`, 3 u par
    // défaut), une corde à linge dont seuls les deux piquets bloquent (`longueur`, 4 u).
    tonneau: o => [{ x: 0, y: 0, r: 0.45 }],
    barriere: o => [{ rect: true, x: 0, y: 0, l: o.longueur || 3, p: 0.3 }],
    linge: o => { const l = (o.longueur || 4) / 2; return [{ x: -l, y: 0, r: 0.2 }, { x: l, y: 0, r: 0.2 }]; },
    // Sans empreinte : ce qu'on voit sans jamais buter dedans.
    fil_d_or: () => [], plateforme: () => [], cerf_volant: () => [], rambarde: () => [], auvent: () => [],
  };

  // Les familles du semis : ce qu'elles bloquent (rayon de tronc ou fraction du rayon) et ce
  // qu'elles deviennent dans une aire cuite (`combat`).
  const FAMILLES = {
    arbre: { bloque: 0.45, combat: 'T', espace: 0.8 },
    pin_tordu: { bloque: 0.4, combat: 'T', espace: 0.8 },
    rocher: { bloqueFraction: 0.7, combat: '#', espace: 0.9 },
    borne: { bloque: 0.45, combat: '#', espace: 1 },
    buisson: { bloque: 0, combat: null, espace: 0.7 },
    galet: { bloque: 0, combat: null, espace: 0.5, petit: true },
    herbe: { bloque: 0, combat: null, espace: 0.4, petit: true },
    fleurs: { bloque: 0, combat: null, espace: 0.5, petit: true },
    fougere: { bloque: 0, combat: null, espace: 0.6, petit: true },
    roseau: { bloque: 0, combat: null, espace: 0.4, petit: true },
    // La bruyère de la lande et des ruines (coussins bas, sans effet de jeu) ; l'arbre mort (un tronc
    // nu, bloqué sur 0,3 u, un T dans une aire cuite), pour le Haut des Murets et l'Amarre.
    bruyere: { bloque: 0, combat: null, espace: 0.6, petit: true },
    arbre_mort: { bloque: 0.3, combat: 'T', espace: 0.9 },
    fil: { bloque: 0, combat: null, fil: true },
  };

  // Matières de sol (docs/ILE-TECHNIQUE.md, 2.4) et sol par défaut des régions.
  const MATIERES = ['herbe', 'lande', 'terre', 'calcaire', 'roche', 'sous_bois'];
  const M_ = { herbe: 0, lande: 1, terre: 2, calcaire: 3, roche: 4, sous_bois: 5 };
  const SOL_REGION = { pre: M_.herbe, calcaire: M_.herbe, lande: M_.lande, sous_bois: M_.sous_bois, ruines: M_.calcaire };

  const SORTES_LIGNES = ['ruelle', 'sentier', 'escarpement', 'escalier', 'ravin', 'ru', 'muret', 'haie', 'pont', 'gue'];

  // Les cartes (sous-zones) d'un plateau, avec l'identifiant de leur zone.
  function cartesDe(id) {
    const out = [];
    const zones = (typeof DATA !== 'undefined' && DATA.content && DATA.content.zones) || [];
    for (const z of zones) for (const m of z.maps || []) if (m.plateau === id) out.push(Object.assign({}, m, { zone: z.id }));
    return out;
  }

  // Un paramètre d'abscisse sur une ligne : `t` de 0 à 1, ou `point: [u, v]` (le point le plus proche).
  function abscisse(desc, pts, cum) {
    if (desc && Array.isArray(desc.point)) return projeter(pts, cum, desc.point[0], desc.point[1]).s;
    const t = desc && typeof desc.t === 'number' ? desc.t : 0.5;
    return borne(t, 0, 1) * cum[cum.length - 1];
  }
  // Les plages ouvertes d'un muret (brèches) ou d'une haie (barrières), en abscisses [s0, s1].
  function plages(liste, pts, cum) {
    const L = cum[cum.length - 1];
    return (liste || []).map(b => {
      if (Array.isArray(b)) return [borne(b[0], 0, 1) * L, borne(b[1], 0, 1) * L];
      const s = abscisse(b, pts, cum), l = (b.largeur || 2.5) / 2;
      return [s - l, s + l];
    });
  }

  // ======================================================================
  // La construction
  // ======================================================================

  function construire(def, cartes) {
    cartes = cartes || cartesDe(def.id);
    const L = def.taille[0], Hh = def.taille[1];
    const W = L + 1, H = Hh + 1, N = W * H;
    const FX = round(L * 2), FY = round(Hh * 2), FN = FX * FY;   // grille fine (0,5 u)
    const G = def.graine | 0;
    const idx = (u, v) => v * W + u;

    // ----- Les lignes : courbes lissées, longueurs, paramètres -----
    // Les rus se déclarent avec les eaux (2.6) ou avec les lignes (2.5) : ce sont des lignes.
    const sourcesLignes = (def.lignes || []).concat((def.eaux || []).filter(e => e.sorte === 'ru'));
    const lignes = sourcesLignes.map((l, k) => {
      const brut = l.points.map(p => [p[0], p[1]]);
      const lisse = l.lisse != null ? !!l.lisse : l.sorte !== 'escarpement';
      const pts = lisse ? courbe(brut, 0.5, false) : brut;
      const cum = cumul(pts);
      return Object.assign({}, l, { id: l.id || `${l.sorte}_${k}`, index: k, pts, cum, longueur: cum[cum.length - 1], demi: (l.largeur || defLargeur(l.sorte)) / 2 });
    });
    function defLargeur(s) { return { ruelle: 3.5, sentier: 2, escarpement: 2, escalier: 3, ravin: 8, ru: 1.5, muret: 0.8, haie: 0.8, pont: 2.4, gue: 3 }[s] || 2; }
    const parSorte = s => lignes.filter(l => l.sorte === s);

    // ----- 1. Le bord -----
    const contour = contourBruite(def.bord.contour, def.bord.bruit || 0, graineDe(G, 'bord'), 1);
    const baie = def.echancrure ? contourBruite(def.echancrure.contour, def.bord.bruit || 0, graineDe(G, 'baie'), 1) : null;
    const trous = (def.trous || []).map(t => ({ id: t.id, centre: t.centre, rayon: t.rayon, margelle: t.margelle || 0 }));
    const dansTrou = (u, v) => trous.some(t => { const dx = u - t.centre[0], dy = v - t.centre[1]; return dx * dx + dy * dy < t.rayon * t.rayon; });
    // Le vide au treillis (1 u) et sur la grille fine (0,5 u).
    const vide = new Uint8Array(N).fill(1), videF = new Uint8Array(FN).fill(1);
    remplir(contour, W, H, 0, 1, 0, 1, i => { vide[i] = 0; });
    remplir(contour, FX, FY, 0.25, 0.5, 0.25, 0.5, i => { videF[i] = 0; });
    if (baie) {
      remplir(baie, W, H, 0, 1, 0, 1, i => { vide[i] = 1; });
      remplir(baie, FX, FY, 0.25, 0.5, 0.25, 0.5, i => { videF[i] = 1; });
    }
    for (let v = 0; v < H; v++) for (let u = 0; u < W; u++) if (!vide[idx(u, v)] && dansTrou(u, v)) vide[idx(u, v)] = 1;
    for (let j = 0; j < FY; j++) for (let i = 0; i < FX; i++) if (!videF[j * FX + i] && dansTrou(0.25 + i * 0.5, 0.25 + j * 0.5)) videF[j * FX + i] = 1;

    // ----- 2. Régions et sous-zones -----
    // La région d'un échantillon : la première dont le contour le contient ; à défaut la plus proche.
    const regions = def.regions || [];
    const region = new Uint8Array(N).fill(255);
    regions.forEach((r, k) => { if (r.contour) remplir(r.contour, W, H, 0, 1, 0, 1, i => { if (region[i] === 255) region[i] = k; }); });
    plusProcheEtiquette(region, W, H, 255);
    // La sous-zone : parmi les cartes de la zone de sa région, la première dont le contour le contient.
    const secteurs = cartes.map(c => c.id);
    const zoneDeCarte = cartes.map(c => c.zone);
    const secteur = new Uint8Array(N).fill(255);
    cartes.forEach((c, k) => {
      if (!Array.isArray(c.contour)) return;
      remplir(c.contour, W, H, 0, 1, 0, 1, i => { if (secteur[i] === 255 && regions[region[i]] && regions[region[i]].zone === c.zone) secteur[i] = k; });
    });
    plusProcheEtiquette(secteur, W, H, 255);

    // ----- Les escarpements : distance au tracé brut -----
    const dEsc = new Float32Array(N).fill(1e9);
    for (const l of parSorte('escarpement')) prochesLigne(l.pts, l.cum, 8, W, H, 0, 1, 0, 1, (i, d) => { if (d < dEsc[i]) dEsc[i] = d; });

    // La base : hauteur brute de la région, deux flous de boîte, et la hauteur brute près d'un
    // escarpement (fondue de 2 à 6 u) pour que la marche reste franche.
    const brute = new Float32Array(N), reliefBrut = new Float32Array(N);
    for (let i = 0; i < N; i++) { const r = regions[region[i]] || {}; brute[i] = r.hauteur || 0; reliefBrut[i] = r.relief || 0; }
    const rf = max(1, round((def.fondu || 8) / 2));
    const floue = flouBoite(flouBoite(brute, W, H, rf), W, H, rf);
    const amplitude = flouBoite(flouBoite(reliefBrut, W, H, rf), W, H, rf);
    const h = new Float64Array(N);
    for (let i = 0; i < N; i++) { const w = fondu(dEsc[i], 2, 6); h[i] = brute[i] + (floue[i] - brute[i]) * w; }

    // ----- Géométrie des lignes sur le treillis (distance, abscisse), gardée pour la suite -----
    const prochesT = new Map();   // ligne.index -> [[i, d, s], ...]
    const relever = (l, rayon) => { const a = []; prochesLigne(l.pts, l.cum, rayon, W, H, 0, 1, 0, 1, (i, d, s) => a.push([i, d, s])); prochesT.set(l.index, a); return a; };

    // ----- 3. Le relief -----
    // Effacé sur les sentiers, ruelles, places et ponts ; à 30 % dans les aires.
    const attenue = new Float32Array(N).fill(1);
    for (const l of lignes) if (l.sorte === 'sentier' || l.sorte === 'ruelle' || l.sorte === 'pont' || l.sorte === 'escalier' || l.sorte === 'gue') {
      for (const [i, d] of relever(l, l.demi + 3)) { const a = fondu(d, l.demi, l.demi + 3); if (a < attenue[i]) attenue[i] = a; }
    }
    const places = (def.places || []).map(p => Object.assign({}, p));
    for (const p of places) eachDisque(p.centre[0], p.centre[1], p.rayon + 3, W, H, (i, d) => { const a = fondu(d, p.rayon, p.rayon + 3); if (a < attenue[i]) attenue[i] = a; });
    const aires = [];
    for (const c of cartes) (c.groups || []).forEach((g, k) => { if (g.aire) aires.push({ carte: c.id, index: k, x: g.aire.x, y: g.aire.y, errance: g.aire.errance || 5, style: g.aire.style || 'libre', layout: g.aire.layout || null }); });
    for (const a of aires) for (let v = max(0, a.y - 2); v <= min(H - 1, a.y + 17); v++) for (let u = max(0, a.x - 2); u <= min(W - 1, a.x + 17); u++) {
      const du = max(a.x - u, 0, u - (a.x + 15)), dv = max(a.y - v, 0, v - (a.y + 15));
      const f = 0.3 + 0.7 * fondu(max(du, dv), 0, 2);
      const i = idx(u, v);
      if (f < attenue[i]) attenue[i] = f;
    }
    const gR = graineDe(G, 'relief'), gR2 = graineDe(G, 'relief_fin');
    for (let v = 0; v < H; v++) for (let u = 0; u < W; u++) {
      const i = idx(u, v);
      const n = (fbm(u / 15, v / 15, gR, 4) - 0.5) * 2 + 0.25 * (fbm(u / 5, v / 5, gR2, 2) - 0.5) * 2;
      h[i] += amplitude[i] * n * attenue[i];
    }
    // Les terrasses : la hauteur d'une région à terrasses est quantifiée au pas, chaque marche
    // montant sur le haut `fondu` u de son pas (en hauteur). Pas de marche dans une aire de
    // combat, ni sur un sentier ou une place : là où le relief s'efface, les terrasses aussi.
    regions.forEach((r, k) => {
      if (!r.terrasses) return;
      const pas = r.terrasses.pas || 2, phi = borne((r.terrasses.fondu || 0.4) / pas, 0.05, 1);
      for (let i = 0; i < N; i++) if (region[i] === k) {
        const q = h[i] / pas, n = floor(q), t = q - n;
        const s = t < 1 - phi ? 0 : doux((t - (1 - phi)) / phi);
        const w = borne((attenue[i] - 0.3) / 0.7, 0, 1);
        h[i] += (pas * (n + s) - h[i]) * w;
      }
    });

    // ----- 4. Les lignes -----
    const hA = (u, v) => bilin(h, W, H, u, v);
    // Ravins : un U de `profondeur`, berges de 3 u.
    for (const l of parSorte('ravin')) {
      const prof = l.profondeur || 6, fond = max(0.5, l.demi - (l.berge || 3));
      for (const [i, d] of relever(l, l.demi)) h[i] -= prof * (1 - fondu(d, fond, l.demi));
    }
    // Sentiers et ruelles : la largeur aplanie vers la hauteur de la ligne médiane, lissée le long
    // du tracé (moyenne glissante de 9 points espacés de 1 u), puis bornée en pente (0,6) pour
    // rester praticable ; creusée de 0,1 u ; fondue sur 1,5 u au-delà de la demi-largeur.
    for (const l of lignes.filter(x => x.sorte === 'sentier' || x.sorte === 'ruelle')) {
      const prof = profilLigne(l, hA, 9, l.pente || 0.6);
      const creux = l.sorte === 'sentier' ? 0.1 : 0.05;
      for (const [i, d, s] of relever(l, l.demi + 1.5)) {
        const w = 1 - fondu(d, l.demi, l.demi + 1.5);
        h[i] += (prof(s) - creux - h[i]) * w;
      }
    }
    // Escaliers : une pente régulière de leur premier à leur dernier point.
    for (const l of parSorte('escalier')) {
      const a = l.pts[0], b = l.pts[l.pts.length - 1];
      const ha = l.hauts ? l.hauts[0] : hA(a[0], a[1]), hb = l.hauts ? l.hauts[1] : hA(b[0], b[1]);
      l.hauts = [ha, hb];
      for (const [i, d, s] of relever(l, l.demi + 0.75)) {
        const w = 1 - fondu(d, l.demi, l.demi + 0.75);
        h[i] += (ha + (hb - ha) * (s / l.longueur) - h[i]) * w;
      }
    }
    // Haies : le fossé, si la haie en a un ; une barrière ou une brèche le franchit de plain-pied.
    for (const l of parSorte('haie')) if (l.fosse) {
      const p = typeof l.fosse === 'number' ? l.fosse : 0.6;
      const ouvertures = plages((l.breches || []).concat(l.barrieres || []), l.pts, l.cum);
      for (const [i, d, s] of relever(l, 1.6)) {
        let w = 1;
        for (const o of ouvertures) w = min(w, fondu(max(o[0] - s, s - o[1]), 0, 1.5));
        h[i] -= p * (1 - fondu(d, 0.4, 1.6)) * w;
      }
    }

    // ----- 5. Les places -----
    for (const p of places) {
      const cible = p.hauteur != null ? p.hauteur : hA(p.centre[0], p.centre[1]);
      p.hauteurEffective = cible;
      eachDisque(p.centre[0], p.centre[1], p.rayon + 3, W, H, (i, d) => { const w = 1 - fondu(d, p.rayon, p.rayon + 3); h[i] += (cible - h[i]) * w; });
    }

    // ----- 6. Les eaux -----
    const eau = new Float64Array(N).fill(NaN);
    const poserEau = (i, niv) => { if (h[i] < niv - 0.005 && !(eau[i] >= niv)) eau[i] = niv; };
    // Rus : une rigole sous une surface qui ne remonte jamais le long du tracé.
    for (const l of parSorte('ru')) {
      const prof = l.profondeur || 0.5;
      const surf = profilLigne(l, hA, 9, null, true);
      l.surface = surf;
      for (const [i, d, s] of relever(l, l.demi + 0.6)) {
        const ws = surf(s);
        const t = 1 - fondu(d, 0, l.demi);
        const fondRigole = ws - prof * t;
        if (h[i] > fondRigole) h[i] = fondRigole + (h[i] - fondRigole) * fondu(d, l.demi, l.demi + 0.6);
        if (d <= l.demi + 0.3) poserEau(i, ws);
      }
    }
    const eaux = (def.eaux || []).filter(e => e.sorte !== 'ru').map(e => Object.assign({}, e));
    // Bassins : une cuvette sous le niveau, une berge douce autour.
    for (const e of eaux) if (e.sorte === 'bassin') {
      const niv = e.niveau != null ? e.niveau : hA(e.centre[0], e.centre[1]) - (e.marge != null ? e.marge : 0.6);
      e.niveauEffectif = niv;
      const prof = e.profondeur || 1.2;
      eachDisque(e.centre[0], e.centre[1], e.rayon + 4, W, H, (i, d) => {
        const t = d / e.rayon;
        const cible = d <= e.rayon ? niv - prof * (1 - t * t) : niv + (d - e.rayon) * 0.45;
        if (h[i] > cible) h[i] = cible;
        if (d <= e.rayon + 0.5) poserEau(i, niv);
      });
    }
    // Gués : de berge à berge, un fond relevé sous 0,4 u d'eau et des rampes de pente 0,6.
    for (const l of parSorte('gue')) {
      const a = l.pts[0], b = l.pts[l.pts.length - 1];
      const ha = hA(a[0], a[1]), hb = hA(b[0], b[1]);
      let niv = -Infinity;
      const proches = relever(l, l.demi + 1);
      for (const [i, d] of proches) if (d <= l.demi && eau[i] === eau[i] && eau[i] > niv) niv = eau[i];
      const fond = niv > -Infinity ? niv - (l.fond != null ? l.fond : 0.4) : min(ha, hb);
      const Lg = l.longueur, lim = 0.6;
      const prof = s => max(fond, ha - lim * s, hb - lim * (Lg - s));
      l.fondGue = fond;
      for (const [i, d, s] of proches) {
        const w = 1 - fondu(d, l.demi, l.demi + 1);
        h[i] += (prof(s) - h[i]) * w;
      }
    }
    // Les eaux du treillis suivent le sol corrigé : plus d'eau là où il dépasse la surface.
    for (let i = 0; i < N; i++) if (eau[i] === eau[i] && !(h[i] < eau[i] - 0.005)) eau[i] = NaN;

    // ----- 7. Les trous : le vide (déjà dans les masques) -----

    // ----- 8. La lèvre : un léger bourrelet près du bord -----
    const levre = def.bord.levre || 0;
    if (levre) {
      const dv = distanceAuVide(vide, W, H, 3);
      for (let i = 0; i < N; i++) if (!vide[i] && dv[i] < 2.5) h[i] += levre * doux(1 - dv[i] / 2.5);
    }

    // ----- 9. Quantification au 1/256 u -----
    const haut = new Float32Array(N), eauQ = new Float32Array(N);
    for (let i = 0; i < N; i++) { haut[i] = quantifier(h[i]); eauQ[i] = eau[i] === eau[i] ? quantifier(eau[i]) : NaN; }

    // ----- Ponts : tablier et hauteur de marche -----
    const ponts = parSorte('pont').map(l => {
      const a = l.pts[0], b = l.pts[l.pts.length - 1];
      const ha = bilin(haut, W, H, a[0], a[1]), hb = bilin(haut, W, H, b[0], b[1]);
      const fleche = l.fleche != null ? l.fleche : (l.matiere === 'corde' ? l.longueur * 0.04 : 0);
      return { id: l.id, ligne: l.index, pts: l.pts, cum: l.cum, longueur: l.longueur, demi: l.demi, ha, hb, fleche, matiere: l.matiere || 'planches', au_dessus: l.au_dessus || 'ravin' };
    });
    const tablier = (p, s) => { const t = s / p.longueur; return p.ha + (p.hb - p.ha) * t - p.fleche * 4 * t * (1 - t); };
    const pontF = new Int8Array(FN).fill(-1);
    ponts.forEach((p, k) => prochesLigne(p.pts, p.cum, p.demi, FX, FY, 0.25, 0.5, 0.25, 0.5, i => { pontF[i] = k; }));

    // ----- Passages : escaliers et gués (la pente n'y bloque pas) -----
    const passageF = new Uint8Array(FN);
    for (const l of lignes) if (l.sorte === 'escalier' || l.sorte === 'gue') prochesLigne(l.pts, l.cum, max(0.5, l.demi - 0.3), FX, FY, 0.25, 0.5, 0.25, 0.5, i => { passageF[i] = 1; });

    // ----- Matières de sol, distance aux sentiers, pente -----
    const pente = new Float32Array(N);
    for (let v = 0; v < H; v++) for (let u = 0; u < W; u++) {
      const gx = (haut[idx(min(W - 1, u + 1), v)] - haut[idx(max(0, u - 1), v)]) / ((min(W - 1, u + 1) - max(0, u - 1)) || 1);
      const gy = (haut[idx(u, min(H - 1, v + 1))] - haut[idx(u, max(0, v - 1))]) / ((min(H - 1, v + 1) - max(0, v - 1)) || 1);
      pente[idx(u, v)] = sqrt(gx * gx + gy * gy);
    }
    const distSentier = new Float32Array(N).fill(99);
    for (const l of lignes) if (l.sorte === 'sentier' || l.sorte === 'ruelle') prochesLigne(l.pts, l.cum, l.demi + 12, W, H, 0, 1, 0, 1, (i, d) => { const e = max(0, d - l.demi); if (e < distSentier[i]) distSentier[i] = e; });
    const sol = new Uint8Array(N);
    for (let i = 0; i < N; i++) { const r = regions[region[i]]; sol[i] = r ? (SOL_REGION[r.sol] != null ? SOL_REGION[r.sol] : M_.herbe) : M_.herbe; }
    for (const l of lignes) {
      if (l.sorte === 'sentier') for (const [i, d] of prochesT.get(l.index) || []) { if (d <= l.demi) sol[i] = M_.terre; }
      if (l.sorte === 'ruelle' || l.sorte === 'escalier') for (const [i, d] of prochesT.get(l.index) || []) { if (d <= l.demi) sol[i] = M_.calcaire; }
    }
    for (const p of places) if ((p.sol || 'calcaire') === 'calcaire' || p.sol === 'terre') eachDisque(p.centre[0], p.centre[1], p.rayon, W, H, i => { sol[i] = p.sol === 'terre' ? M_.terre : M_.calcaire; });
    for (let i = 0; i < N; i++) {
      if (pente[i] > 0.577 || dEsc[i] < 1.5) sol[i] = M_.roche;
      else if (eauQ[i] === eauQ[i]) sol[i] = M_.terre;
    }

    // ----- Objets posés : empreintes tournées -----
    const objets = (def.objets || []).map((o, k) => {
      const c = cos(o.rot || 0), s = sin(o.rot || 0);
      const formes = (EMPREINTES[o.sorte] || (() => []))(o).map(f => {
        if (f.anneau) return { anneau: true, u: o.u, v: o.v, r1: f.r1, r2: f.r2 };
        const u = o.u + f.x * c - f.y * s, v = o.v + f.x * s + f.y * c;
        if (f.rect) return { rect: true, u, v, l: f.l / 2, p: f.p / 2, c, s };
        return { u, v, r: f.r };
      });
      return Object.assign({}, o, { index: k, graine: graineDe(G, `objet_${k}`), empreinte: formes });
    });

    // ----- Les points qui comptent (pour les exclusions du semis et la navigation) -----
    const pnjs = [], noeuds = [], relais = [], portes = [];
    for (const c of cartes) {
      for (const n of c.npcs || []) if (n && typeof n === 'object') pnjs.push({ id: n.id, u: n.u, v: n.v, carte: c.id });
      (c.nodes || []).forEach((n, k) => { if (n && typeof n === 'object') noeuds.push({ resource: n.resource, u: n.u, v: n.v, carte: c.id, idx: k }); });
      if (c.relay && typeof c.relay === 'object') relais.push({ u: c.relay.u, v: c.relay.v, carte: c.id });
      if (c.porte && typeof c.porte === 'object') portes.push({ u: c.porte.u, v: c.porte.v, carte: c.id, dungeon: c.dungeon || null });
    }
    const panneaux = objets.filter(o => o.sorte === 'panneau');
    const lieux = def.lieux || {};

    // ----- Le semis du décor -----
    const decor = semer({ def, G, W, H, N, region, regions, vide, videF, FX, FY, haut, eauQ, pente, distSentier, dEsc, places, aires, objets, pnjs, noeuds, relais, portes, panneaux, lieux, passageF, eaux });

    // Murets et haies : les bouts tracés dans le vide (une haie qui sert aussi de frontière de
    // région part de la baie et sort sous l'île) sont retirés, à un échantillon près pour que la
    // haie touche encore le bord. Le vide bloque déjà la navigation : rien ne flotte dans les nuages.
    const surTerre = p => { const i = floor(p[0] * 2), j = floor(p[1] * 2); return i >= 0 && j >= 0 && i < FX && j < FY && !videF[j * FX + i]; };
    for (const l of lignes) {
      if (l.sorte !== 'muret' && l.sorte !== 'haie') continue;
      let a = 0, b = l.pts.length - 1;
      while (a < b && !surTerre(l.pts[a])) a++;
      while (b > a && !surTerre(l.pts[b])) b--;
      if (a > b - 1) continue;
      a = max(0, a - 1); b = min(l.pts.length - 1, b + 1);
      if (a === 0 && b === l.pts.length - 1) continue;
      l.pts = l.pts.slice(a, b + 1);
      l.cum = cumul(l.pts);
      l.longueur = l.cum[l.cum.length - 1];
    }

    const T = {
      id: def.id, largeur: L, hauteur: Hh, W, H, FX, FY, graine: G,
      haut, eau: eauQ, vide, videF, region, secteur, sol, pente, distSentier, pontF, passageF,
      secteurs, zoneDeCarte, regionsZone: regions.map(r => r.zone),
      contour, echancrure: baie, trous,
      lignes: lignes.map(l => ({ id: l.id, sorte: l.sorte, index: l.index, points: l.points, pts: l.pts, longueur: l.longueur, demi: l.demi, largeur: l.demi * 2,
        hauteur: l.hauteur, breches: l.sorte === 'muret' || l.sorte === 'haie' ? plages(l.breches, l.pts, l.cum) : null,
        barrieres: l.sorte === 'haie' ? (l.barrieres || []).map((b, k) => ({ index: k, id: b.id || `${l.id}_${k}`, plage: plages([b], l.pts, l.cum)[0], centre: pointA(l.pts, l.cum, abscisse(b, l.pts, l.cum)), quete: b.quete || null, largeur: b.largeur || 2.5 })) : null,
        matiere: l.matiere, au_dessus: l.au_dessus, profondeur: l.profondeur, hauts: l.hauts || null, fond: l.fondGue != null ? l.fondGue : null })),
      ponts: ponts.map(p => ({ id: p.id, ligne: p.ligne, pts: p.pts, longueur: p.longueur, demi: p.demi, ha: p.ha, hb: p.hb, fleche: p.fleche, matiere: p.matiere, au_dessus: p.au_dessus })),
      places: places.map(p => ({ id: p.id, centre: p.centre, rayon: p.rayon, hauteur: quantifier(p.hauteurEffective), sol: p.sol || 'calcaire' })),
      eaux: eaux.map(e => Object.assign({}, e, e.niveauEffectif != null ? { niveau: quantifier(e.niveauEffectif) } : {})),
      objets, decor, aires, pnjs, noeuds, relais, portes, lieux,
      accents: def.accents || [],
    };
    return munir(T);
  }

  // Chaque échantillon sans étiquette prend celle du plus proche qui en a une (parcours en largeur).
  function plusProcheEtiquette(lab, W, H, rien) {
    const N = W * H, file = new Int32Array(N);
    let a = 0, b = 0;
    for (let i = 0; i < N; i++) if (lab[i] !== rien) file[b++] = i;
    if (!b) return;
    while (a < b) {
      const i = file[a++], u = i % W, v = (i / W) | 0;
      if (u > 0 && lab[i - 1] === rien) { lab[i - 1] = lab[i]; file[b++] = i - 1; }
      if (u < W - 1 && lab[i + 1] === rien) { lab[i + 1] = lab[i]; file[b++] = i + 1; }
      if (v > 0 && lab[i - W] === rien) { lab[i - W] = lab[i]; file[b++] = i - W; }
      if (v < H - 1 && lab[i + W] === rien) { lab[i + W] = lab[i]; file[b++] = i + W; }
    }
  }

  // Flou de boîte séparable de rayon r (bords répétés).
  function flouBoite(src, W, H, r) {
    const tmp = new Float64Array(W * H), out = new Float64Array(W * H), n = 2 * r + 1;
    for (let v = 0; v < H; v++) {
      let s = 0;
      for (let k = -r; k <= r; k++) s += src[v * W + borne(k, 0, W - 1)];
      for (let u = 0; u < W; u++) { tmp[v * W + u] = s / n; s += src[v * W + borne(u + r + 1, 0, W - 1)] - src[v * W + borne(u - r, 0, W - 1)]; }
    }
    for (let u = 0; u < W; u++) {
      let s = 0;
      for (let k = -r; k <= r; k++) s += tmp[borne(k, 0, H - 1) * W + u];
      for (let v = 0; v < H; v++) { out[v * W + u] = s / n; s += tmp[borne(v + r + 1, 0, H - 1) * W + u] - tmp[borne(v - r, 0, H - 1) * W + u]; }
    }
    return out;
  }

  // Distance (approchée, chanfrein 1 et 1,4142) au vide le plus proche, bornée à `max`.
  function distanceAuVide(vide, W, H, plafond) {
    const N = W * H, d = new Float32Array(N);
    for (let i = 0; i < N; i++) d[i] = vide[i] ? 0 : plafond;
    const R2 = SQRT2;
    for (let v = 0; v < H; v++) for (let u = 0; u < W; u++) {
      const i = v * W + u; let x = d[i];
      if (u > 0) x = min(x, d[i - 1] + 1);
      if (v > 0) { x = min(x, d[i - W] + 1); if (u > 0) x = min(x, d[i - W - 1] + R2); if (u < W - 1) x = min(x, d[i - W + 1] + R2); }
      d[i] = x;
    }
    for (let v = H - 1; v >= 0; v--) for (let u = W - 1; u >= 0; u--) {
      const i = v * W + u; let x = d[i];
      if (u < W - 1) x = min(x, d[i + 1] + 1);
      if (v < H - 1) { x = min(x, d[i + W] + 1); if (u < W - 1) x = min(x, d[i + W + 1] + R2); if (u > 0) x = min(x, d[i + W - 1] + R2); }
      d[i] = x;
    }
    return d;
  }

  // Les échantillons du treillis dans un disque : fn(index, distance).
  function eachDisque(cu, cv, r, W, H, fn) {
    for (let v = max(0, ceil(cv - r)); v <= min(H - 1, floor(cv + r)); v++) for (let u = max(0, ceil(cu - r)); u <= min(W - 1, floor(cu + r)); u++) {
      const dx = u - cu, dy = v - cv, d2 = dx * dx + dy * dy;
      if (d2 <= r * r) fn(v * W + u, sqrt(d2));
    }
  }

  // Lecture bilinéaire d'une grille au treillis.
  function bilin(g, W, H, u, v) {
    u = borne(u, 0, W - 1); v = borne(v, 0, H - 1);
    const u0 = min(W - 2, floor(u)), v0 = min(H - 2, floor(v));
    const fu = u - u0, fv = v - v0, i = v0 * W + u0;
    const a = g[i], b = g[i + 1], c = g[i + W], d = g[i + W + 1];
    return a + (b - a) * fu + (c - a) * fv + (a - b - c + d) * fu * fv;
  }

  // Le profil d'une ligne : la hauteur du sol tous les 1 u le long du tracé, moyenne glissante de
  // `fenetre` points, puis pente bornée (`pente` par u) ou surface qui ne remonte jamais
  // (`descend`). Rend s -> hauteur.
  function profilLigne(l, hA, fenetre, pente, descend) {
    const n = max(2, ceil(l.longueur) + 1), pas = l.longueur / (n - 1);
    const g = new Float64Array(n);
    for (let k = 0; k < n; k++) { const p = pointA(l.pts, l.cum, k * pas); g[k] = hA(p[0], p[1]); }
    const m = new Float64Array(n), r = (fenetre - 1) >> 1;
    for (let k = 0; k < n; k++) { let s = 0, c = 0; for (let q = k - r; q <= k + r; q++) { const qq = borne(q, 0, n - 1); s += g[qq]; c++; } m[k] = s / c; }
    if (pente) {
      const lim = pente * pas;
      for (let k = 1; k < n; k++) m[k] = borne(m[k], m[k - 1] - lim, m[k - 1] + lim);
      for (let k = n - 2; k >= 0; k--) m[k] = borne(m[k], m[k + 1] - lim, m[k + 1] + lim);
    }
    if (descend) for (let k = 1; k < n; k++) if (m[k] > m[k - 1]) m[k] = m[k - 1];
    return s => { const x = borne(s / pas, 0, n - 1), k = min(n - 2, floor(x)), t = x - k; return m[k] + (m[k + 1] - m[k]) * t; };
  }

  // ----- Le semis : placement par rejet sur une table de hachage spatiale -----
  function semer(E) {
    const { def, G, W, H, region, regions, vide, videF, FX, FY, haut, eauQ, pente, distSentier, dEsc, places, aires, objets, pnjs, noeuds, relais, portes, panneaux, lieux, passageF } = E;
    const out = [];
    const CASE = 2, CW = ceil(W / CASE), CH = ceil(H / CASE);
    const table = new Map();
    const ranger = (k, e) => { const c = floor(e.v / CASE) * CW + floor(e.u / CASE); const l = table.get(c); if (l) l.push(k); else table.set(c, [k]); };
    const voisins = (u, v, r, fn) => {
      const c0 = max(0, floor((u - r) / CASE)), c1 = min(CW - 1, floor((u + r) / CASE));
      const r0 = max(0, floor((v - r) / CASE)), r1 = min(CH - 1, floor((v + r) / CASE));
      for (let y = r0; y <= r1; y++) for (let x = c0; x <= c1; x++) { const l = table.get(y * CW + x); if (l) for (const k of l) if (fn(out[k])) return true; }
      return false;
    };
    const libreFin = (u, v) => { const i = floor(u * 2), j = floor(v * 2); return i >= 0 && j >= 0 && i < FX && j < FY && !videF[j * FX + i]; };
    const pres = (u, v, liste, r) => liste.some(p => { const dx = u - p.u, dy = v - p.v; return dx * dx + dy * dy < r * r; });
    const lieuxPts = Object.values(lieux).map(p => ({ u: p[0], v: p[1] }));
    const dansObjet = (u, v, m) => objets.some(o => o.empreinte.some(f => {
      if (f.anneau) { const dx = u - f.u, dy = v - f.v, d = sqrt(dx * dx + dy * dy); return d > f.r1 - m && d < f.r2 + m; }
      if (f.rect) { const dx = u - f.u, dy = v - f.v, a = dx * f.c + dy * f.s, b = -dx * f.s + dy * f.c; return abs(a) < f.l + m && abs(b) < f.p + m; }
      const dx = u - f.u, dy = v - f.v; return dx * dx + dy * dy < (f.r + m) * (f.r + m);
    }));
    const dansAire = (u, v) => aires.some(a => u > a.x - 1 && u < a.x + 16 && v > a.y - 1 && v < a.y + 16);
    const dansPlace = (u, v) => places.some(p => { const dx = u - p.centre[0], dy = v - p.centre[1]; return dx * dx + dy * dy < p.rayon * p.rayon; });
    const surPassage = (u, v) => { for (let dj = -2; dj <= 2; dj++) for (let di = -2; di <= 2; di++) { const i = floor(u * 2) + di, j = floor(v * 2) + dj; if (i >= 0 && j >= 0 && i < FX && j < FY && passageF[j * FX + i]) return true; } return false; };
    const eauPres = (u, v, r) => { for (let y = max(0, floor(v - r)); y <= min(H - 1, ceil(v + r)); y++) for (let x = max(0, floor(u - r)); x <= min(W - 1, ceil(u + r)); x++) if (eauQ[y * W + x] === eauQ[y * W + x]) return true; return false; };
    const at = (g, u, v) => g[min(H - 1, round(v)) * W + min(W - 1, round(u))];

    regions.forEach((r, k) => {
      // Aire de la région (en u²) et boîte englobante.
      let aire = 0, u0 = W, u1 = 0, v0 = H, v1 = 0;
      for (let v = 0; v < H; v++) for (let u = 0; u < W; u++) { const i = v * W + u; if (region[i] === k && !vide[i]) { aire++; if (u < u0) u0 = u; if (u > u1) u1 = u; if (v < v0) v0 = v; if (v > v1) v1 = v; } }
      if (!aire) return;
      const arbres = [];
      (r.semis || []).forEach((f, q) => {
        const fam = FAMILLES[f.sorte];
        if (!fam) return;
        const rnd = hasard(graineDe(G, `semis_${k}_${q}_${f.sorte}`));
        if (fam.fil) {
          // Les fils du Bois Cousu : entre deux troncs voisins, au-dessus de 2,5 u.
          const n = round((f.densite || 0) * aire / 100);
          let essais = 0, faits = 0;
          while (faits < n && essais < n * 20 && arbres.length > 1) {
            essais++;
            const a = out[arbres[floor(rnd() * arbres.length)]];
            let best = null, bd = Infinity;
            for (const j of arbres) { const b = out[j]; if (b === a) continue; const dx = b.u - a.u, dy = b.v - a.v, d = sqrt(dx * dx + dy * dy); if (d >= 3 && d <= 8 && d < bd && rnd() < 0.7) { bd = d; best = b; } }
            if (!best) continue;
            out.push({ sorte: 'fil', u: (a.u + best.u) / 2, v: (a.v + best.v) / 2, de: [a.u, a.v], a: [best.u, best.v], hauteur: 2.6 + rnd() * 3, rot: 0, echelle: 1, rayon: 0, bloque: 0, combat: null, teinte: 0, graine: floor(rnd() * 1e9) });
            faits++;
          }
          return;
        }
        const n = round((f.densite || 0) * aire / 100);
        const [rmin, rmax] = f.rayon || [0.4, 0.8];
        const formes = f.formes || null;
        const gB = graineDe(G, `bosquets_${k}_${q}`);
        let poses = 0, essais = 0;
        while (poses < n && essais < n * 40 + 200) {
          essais++;
          const u = u0 + rnd() * (u1 - u0), v = v0 + rnd() * (v1 - v0);
          const ru = rmin + rnd() * (rmax - rmin);
          const rot = rnd() * DPI, ech = 0.85 + rnd() * 0.3, teinte = rnd(), g2 = floor(rnd() * 1e9), fo = formes ? formes[floor(rnd() * formes.length)] : null;
          // Des bosquets et des clairières : la densité suit un bruit doux.
          const b = fbm(u / 18, v / 18, gB, 2);
          if (rnd() > borne((b - 0.25) * 2.2, f.uniforme ? 1 : 0.08, 1)) continue;
          if (region[round(v) * W + round(u)] !== k || !libreFin(u, v)) continue;
          const bloque = fam.bloque || (fam.bloqueFraction ? fam.bloqueFraction * ru : 0);
          const marge = fam.petit ? 0.3 : 1;
          if (at(distSentier, u, v) < marge || dansPlace(u, v) || eauPres(u, v, fam.petit ? 0.5 : 1.2)) continue;
          if (!fam.petit && at(pente, u, v) > 0.84) continue;
          if (at(dEsc, u, v) < 2.5 || surPassage(u, v) || dansAire(u, v) || dansObjet(u, v, 0.5)) continue;
          if (pres(u, v, lieuxPts, 3) || pres(u, v, pnjs, 2.5) || pres(u, v, noeuds, 2) || pres(u, v, relais, 4) || pres(u, v, portes, 4) || pres(u, v, panneaux, 4)) continue;
          const esp = (fam.espace || 0.8) * ru;
          if (voisins(u, v, esp + 2.5, e => { if (e.sorte === 'fil') return false; const dx = e.u - u, dy = e.v - v, lim = max(esp, (FAMILLES[e.sorte].espace || 0.8) * e.rayon) + (FAMILLES[e.sorte].petit || fam.petit ? 0 : 0.4); return dx * dx + dy * dy < lim * lim; })) continue;
          const e = { sorte: f.sorte, u, v, rot, echelle: ech, rayon: ru, bloque, combat: fam.combat, teinte, graine: g2 };
          if (fo) e.forme = fo;
          out.push(e);
          ranger(out.length - 1, e);
          if (f.sorte === 'arbre' || f.sorte === 'pin_tordu') arbres.push(out.length - 1);
          poses++;
        }
      });
    });
    // Ordre stable et coordonnées quantifiées (mêmes bits partout).
    for (const e of out) { e.u = quantifier(e.u); e.v = quantifier(e.v); e.rayon = quantifier(e.rayon); e.bloque = quantifier(e.bloque); }
    return out;
  }

  // ======================================================================
  // Le terrain construit : lectures
  // ======================================================================

  function munir(T) {
    const { W, H, FX, FY } = T;
    const fin = (u, v) => { const i = floor(u * 2), j = floor(v * 2); return i < 0 || j < 0 || i >= FX || j >= FY ? -1 : j * FX + i; };
    const pres = (u, v) => min(H - 1, max(0, round(v))) * W + min(W - 1, max(0, round(u)));
    T.dans = (u, v) => Number.isFinite(u) && Number.isFinite(v) && u >= 0 && v >= 0 && u <= T.largeur && v <= T.hauteur;
    T.videA = (u, v) => { const f = fin(u, v); return f < 0 || !!T.videF[f]; };
    T.solBrutA = (u, v) => bilin(T.haut, W, H, u, v);
    T.hauteurA = (u, v) => (T.videA(u, v) ? NaN : bilin(T.haut, W, H, u, v));
    T.pontA = (u, v) => { const f = fin(u, v); return f < 0 ? -1 : T.pontF[f]; };
    T.tablierA = (k, u, v) => {
      const p = T.ponts[k];
      if (!p.cum) p.cum = cumul(p.pts);
      const s = projeter(p.pts, p.cum, u, v).s, t = s / p.longueur;
      return p.ha + (p.hb - p.ha) * t - p.fleche * 4 * t * (1 - t);
    };
    T.marcheA = (u, v) => { const k = T.pontA(u, v); return k >= 0 ? T.tablierA(k, u, v) : T.hauteurA(u, v); };
    T.passageA = (u, v) => { const f = fin(u, v); return f >= 0 && !!T.passageF[f]; };
    T.penteA = (u, v) => {
      const gx = bilin(T.haut, W, H, u + 0.5, v) - bilin(T.haut, W, H, u - 0.5, v);
      const gy = bilin(T.haut, W, H, u, v + 0.5) - bilin(T.haut, W, H, u, v - 0.5);
      return sqrt(gx * gx + gy * gy);
    };
    T.normaleA = (u, v) => {
      const gx = bilin(T.haut, W, H, u + 0.5, v) - bilin(T.haut, W, H, u - 0.5, v);
      const gy = bilin(T.haut, W, H, u, v + 0.5) - bilin(T.haut, W, H, u, v - 0.5);
      const n = sqrt(gx * gx + 1 + gy * gy);
      return [-gx / n, 1 / n, -gy / n];
    };
    // Le niveau de l'eau (moyenne des coins mouillés), ou null.
    T.eauA = (u, v) => {
      u = borne(u, 0, W - 1); v = borne(v, 0, H - 1);
      const u0 = min(W - 2, floor(u)), v0 = min(H - 2, floor(v)), i = v0 * W + u0;
      let s = 0, c = 0;
      for (const k of [i, i + 1, i + W, i + W + 1]) { const e = T.eau[k]; if (e === e) { s += e; c++; } }
      return c ? s / c : null;
    };
    T.profondeurA = (u, v) => { const e = T.eauA(u, v); return e == null ? 0 : max(0, e - bilin(T.haut, W, H, u, v)); };
    T.regionA = (u, v) => T.region[pres(u, v)];
    T.solA = (u, v) => MATIERES[T.sol[pres(u, v)]];
    T.secteurIndexA = (u, v) => { const s = T.secteur[pres(u, v)]; return s === 255 ? -1 : s; };
    T.secteurA = (u, v) => { const s = T.secteurIndexA(u, v); return s < 0 ? null : T.secteurs[s]; };
    T.zoneA = (u, v) => T.regionsZone[T.region[pres(u, v)]] || null;
    T.signature = () => signature(T);
    T.exporter = () => exporter(T);
    return T;
  }

  // Empreinte des grilles et du décor : même île, même empreinte, sous Node comme partout.
  function signature(T) {
    let h1 = 0x9e3779b9 | 0, h2 = 0x85ebca6b | 0;
    const mel = x => { x |= 0; h1 = imul(h1 ^ x, 2654435761); h2 = imul(h2 ^ x, 1597334677); h1 = (h1 << 13) | (h1 >>> 19); };
    for (let i = 0; i < T.haut.length; i++) { mel(round(T.haut[i] * 256)); const e = T.eau[i]; mel(e === e ? round(e * 256) : -99999); mel(T.region[i] | (T.secteur[i] << 8) | (T.sol[i] << 16) | (T.vide[i] << 24)); }
    for (let i = 0; i < T.videF.length; i++) mel(T.videF[i] | ((T.pontF[i] + 1) << 1) | (T.passageF[i] << 9));
    for (const e of T.decor) { mel(cle(e.sorte)); mel(round(e.u * 256)); mel(round(e.v * 256)); mel(round(e.rayon * 256)); mel(round(e.bloque * 256)); mel(e.graine | 0); }
    for (const o of T.objets) for (const f of o.empreinte) { mel(cle(o.sorte)); mel(round(f.u * 256)); mel(round(f.v * 256)); }
    const a = (h1 >>> 0).toString(16).padStart(8, '0'), b = (h2 >>> 0).toString(16).padStart(8, '0');
    return a + b + '-' + T.decor.length;
  }

  // ======================================================================
  // Les aires de combat (docs/ILE-TECHNIQUE.md, 2.10 et 5.2)
  // ======================================================================

  // Les lignes qui comptent pour une case de combat (escarpements, murets, haies), gardées sur le
  // terrain avec leur boîte : l'outil de cuisson, le validateur et le rendu les relisent souvent.
  function lignesAires(T) {
    if (T._lignesAires) return T._lignesAires;
    const out = [];
    for (const l of T.lignes || []) {
      if (l.sorte !== 'escarpement' && l.sorte !== 'muret' && l.sorte !== 'haie') continue;
      const pts = l.pts, cum = cumul(pts);
      let u0 = Infinity, v0 = Infinity, u1 = -Infinity, v1 = -Infinity;
      for (const p of pts) { if (p[0] < u0) u0 = p[0]; if (p[0] > u1) u1 = p[0]; if (p[1] < v0) v0 = p[1]; if (p[1] > v1) v1 = p[1]; }
      // Les murets et les haies sont ouverts à leurs brèches ; une barrière, fermée ou non, reste une
      // haie pour un plan de combat (il ne change pas avec les quêtes).
      const ouvertes = l.sorte === 'escarpement' ? [] : (l.breches || []);
      out.push({ sorte: l.sorte, pts, cum, demi: l.demi, ouvertes, boite: [u0 - 3, v0 - 3, u1 + 3, v1 + 3] });
    }
    Object.defineProperty(T, '_lignesAires', { value: out, enumerable: false });
    return out;
  }

  // Les faces des escarpements, échantillonnées le long du tracé lissé (Catmull-Rom tous les 0,5 u) :
  // pour chaque échantillon, la normale, le côté haut, les hauteurs de part et d'autre (à 2,5 u) et si
  // la face est vraie (plus de 1,2 u de marche, hors du vide). Le rendu (js/ile-sol.js) dessine la
  // face et y ramène les sommets du treillis ; la navigation (js/ile-nav.js) ferme la bande qu'elle
  // couvre, du haut comme du bas, pour que le Veilleur ne marche jamais dans le mur dessiné. Gardé
  // sur le terrain, calculé une fois.
  function facesEscarpements(T) {
    if (T._facesEscarpements) return T._facesEscarpements;
    const out = [];
    const H = (u, v) => bilin(T.haut, T.W, T.H, u, v);
    for (const l of T.lignes || []) {
      if (l.sorte !== 'escarpement') continue;
      const pts = courbe(l.points, 0.5, false);
      const cum = cumul(pts);
      const ech = pts.map((p, k) => {
        const a = pts[max(0, k - 1)], b = pts[min(pts.length - 1, k + 1)];
        let tx = b[0] - a[0], ty = b[1] - a[1];
        const n = sqrt(tx * tx + ty * ty) || 1;
        tx /= n; ty /= n;
        const nx = -ty, ny = tx;
        const hP = H(p[0] + nx * 2.5, p[1] + ny * 2.5), hM = H(p[0] - nx * 2.5, p[1] - ny * 2.5);
        const cote = hP >= hM ? 1 : -1;
        return { u: p[0], v: p[1], nx, ny, cote, haut: max(hP, hM), bas: min(hP, hM), vrai: abs(hP - hM) > 1.2 && !T.videA(p[0], p[1]) };
      });
      out.push({ id: l.id, pts, cum, ech });
    }
    Object.defineProperty(T, '_facesEscarpements', { value: out, enumerable: false });
    return out;
  }

  // Ce que le terrain impose à une case de combat, le carré [X, X + 1] × [Y, Y + 1] (X et Y
  // entiers, en u) : 'o' (le vide, l'Échancrure, un trou, un pont, un escarpement, une pente de plus
  // de 40° au centre ou près d'un coin), '~' (plus de 0,3 u d'eau au centre), '#' (un muret, une
  // haie ou un objet posé passe sur le centre), sinon '.' (du sol). L'outil de cuisson, le
  // validateur, les tests et le rendu (qui ne redessine pas un muret déjà dessiné) la partagent.
  // Rend { c, pourquoi }.
  function caseAire(T, X, Y) {
    const cu = X + 0.5, cv = Y + 0.5;
    const ech = [[cu, cv], [X + 0.12, Y + 0.12], [X + 0.88, Y + 0.12], [X + 0.12, Y + 0.88], [X + 0.88, Y + 0.88]];
    for (const [u, v] of ech) if (!T.dans(u, v) || T.videA(u, v)) return { c: 'o', pourquoi: 'vide' };
    if (T.pontA(cu, cv) >= 0) return { c: 'o', pourquoi: 'pont' };
    for (const [u, v] of ech) if (T.penteA(u, v) > 0.84) return { c: 'o', pourquoi: 'pente' };
    const lignes = lignesAires(T);
    for (const l of lignes) {
      const b = l.boite;
      if (cu < b[0] || cu > b[2] || cv < b[1] || cv > b[3]) continue;
      const pr = projeter(l.pts, l.cum, cu, cv);
      if (l.sorte === 'escarpement') { if (pr.d <= l.demi + 0.3) return { c: 'o', pourquoi: 'escarpement' }; continue; }
      if (pr.d <= l.demi + 0.35 && !l.ouvertes.some(o => pr.s >= o[0] && pr.s <= o[1])) return { c: '#', pourquoi: l.sorte };
    }
    for (const o of T.objets || []) for (const f of o.empreinte || []) {
      const dx = cu - f.u, dy = cv - f.v;
      if (f.anneau) { const d = sqrt(dx * dx + dy * dy); if (d > f.r1 - 0.15 && d < f.r2 + 0.15) return { c: '#', pourquoi: 'objet' }; continue; }
      if (f.rect) { const a = dx * f.c + dy * f.s, bb = -dx * f.s + dy * f.c; if (abs(a) < f.l + 0.15 && abs(bb) < f.p + 0.15) return { c: '#', pourquoi: 'objet' }; continue; }
      if (dx * dx + dy * dy < (f.r + 0.15) * (f.r + 0.15)) return { c: '#', pourquoi: 'objet' };
    }
    if (T.profondeurA(cu, cv) > 0.3) return { c: '~', pourquoi: 'eau' };
    return { c: '.', pourquoi: null };
  }

  // Pour un cache (IndexedDB) : les données sans les fonctions ; importer() les rend lisibles.
  function exporter(T) {
    const o = {};
    for (const k of Object.keys(T)) if (typeof T[k] !== 'function') o[k] = T[k];
    return o;
  }
  const importer = o => munir(Object.assign({}, o));

  return {
    construire, importer, cartesDe, dansPoly, courbe, cumul, projeter, pointA, bilin, caseAire, facesEscarpements, MATIERES, EMPREINTES, FAMILLES, SORTES_LIGNES,
    M: { sin, cos, atan2, hache, bruit, fbm, hasard, cle, graineDe, quantifier },
  };
})();
