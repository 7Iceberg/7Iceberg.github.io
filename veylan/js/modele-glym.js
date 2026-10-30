// Le Glym modelé par le code (docs/ILE-TECHNIQUE.md, 3.13) : la méthode d'une ressource FiveM que
// le fondateur a envoyée, appliquée au Glym Aqua d'Ervane. Chaque pièce du modèle est construite par
// un script à partir de cotes précises (relevées sur la fiche, docs/ILE-TECHNIQUE.md 3.20 : 21 de
// large au dôme, une emprise de 21,5 vue de dessus, une cloche de 22,75 de haut sur une collerette à
// huit lobes), les textures sont peintes par le code, ce qui brille vit dans des calques à part
// (les runes émissives, puis un halo additif), une version de secours existe sans halo, et les
// variantes (les « habits » : Aqua, Ignis, Aer, Terra) ne changent que la palette et
// les runes peintes, jamais la géométrie.
//
// Les pièces, en unités de la planche (le sol en y = 0, la face vers +z) :
//   - le corps : un tour (lathe) écrit à la main, profil de Catmull-Rom rééchantillonné à pas
//     constant le long de l'arc (la coordonnée v de la texture suit l'arc), le dôme et sa lèvre
//     rentrée, la taille, le ventre concave dessous ;
//   - la jupe : une nappe polaire r(θ), une collerette à huit lobes qui s'évase jusqu'au sol ;
//   - la goutte posée à côté ; ces trois pièces forment une seule géométrie (un seul appel) ;
//   - le cœur : un ellipsoïde plus sombre, vu à travers la gelée ;
//   - les yeux : deux sphères aplaties, noires et brillantes, et leurs reflets (des disques posés).
// Les matières : des ShaderMaterial légères, sans lumière de la scène (une lumière fixe dans le
// repère de la vue, celle de l'île, en haut à gauche) : la gelée (fresnel, corps translucide, cœur
// visible, deux brillances), les runes dans la gelée (un calque émissif lu dans deux cartes : une
// équirectangulaire pour le dôme et la jupe, une polaire pour le sommet), le halo (une coque un peu
// plus large, en mélange additif, lisant le flou des runes). L'animation (rebond, écrasement et
// étirement, houle des lobes, pouls des runes, clignement) est dans le nuanceur des sommets : un
// temps et un état par Glym, en uniformes (ModeleGlym.construire, la planche) ou en attributs
// d'instance (ModeleGlym.Parc, le jeu : tous les Glyms d'un habit en quatre ou cinq appels).
//
// Interrupteur du jeu : ?glym=modele (le Glym Aqua seul), ?glym=tous (les quatre Glyms), ou
// DATA.ile.modeleGlym (true ou 'tous') posé par une copie d'aperçu ; lu par Ile3D.modeleGlym(),
// qui ne charge ce fichier que s'il est allumé.
const ModeleGlym = (() => {
  const TAU = Math.PI * 2;

  // ----- Les cotes (la planche) -----

  const COTES = {
    // Relevées sur la fiche (tools/mesurer-fiche.py, vue de face : 258 px pour 22,75 unités).
    hauteur: 22.75, largeurDome: 21, emprise: 21.5, bordDome: 6.3,
    // Le profil du corps (rayon, hauteur), du milieu du ventre (dessous) au sommet : le ventre
    // concave, le bord du dôme qui rentre sur la jupe (vers y = 6,3), une cloche plus large en bas
    // qu'en haut (21 de large vers y = 11), au sommet large et rond.
    profil: [
      [0, 5.3], [3.0, 5.25], [5.4, 5.4], [6.6, 5.75], [7.3, 6.3], [8.2, 6.85], [9.1, 7.7], [9.75, 8.6], [10.2, 9.6],
      [10.45, 10.8], [10.5, 12.0], [10.3, 13.6], [9.9, 15.1], [9.1, 16.9], [7.85, 18.8], [5.8, 20.9], [3.4, 22.1], [0, 22.75],
    ],
    // La jupe : une collerette de huit lobes pointus sous le dôme, étroite en haut (12,8 de large,
    // sous la lèvre du dôme), qui descend en s'évasant jusqu'au sol (6 de haut, 15,2 de large aux
    // creux, 17,4 aux lobes, en vagues douces vues de dessous ; le haut reste lisse).
    jupe: { lobes: 8, rCreux: 7.6, rLobe: 8.7, finesse: 1.1 },
    coeur: { centre: [0, 6.6, 0.2], rayons: [6.8, 1.4, 6.3] },
    // Les yeux : deux grosses perles noires et brillantes, le grand reflet en haut à droite.
    yeux: { y: 12.7, ecart: 4.6, rayons: [2.55, 2.75, 1.6], enfonce: 0.25, reflets: [[0.45, 1.0, 0.95], [0.95, -1.15, 0.3]] },
    goutte: { angle: 0.95, distance: 10.2 },
    // Le sommet en carte polaire : jusqu'à rA pleinement, fondu jusqu'à rB, carte de rayon rP.
    polaire: { rA: 5.5, rB: 6.5, rP: 7.6 },
  };

  // Les niveaux de détail : la planche, le jeu au bureau, le jeu au téléphone ; `coque`, la coque
  // grossière du halo (un flou n'a pas besoin de détail), que le bureau et le téléphone empruntent.
  const NIVEAUX = {
    planche: { tour: 96, arc: 96, jupe: 224, jupeArc: 44, coeur: [48, 32], oeil: [40, 28], reflet: 24, goutte: [24, 16], carte: 1024, polaire: 512, dos: true, halo: 'planche' },
    bureau: { tour: 40, arc: 40, jupe: 98, jupeArc: 18, coeur: [24, 14], oeil: [20, 14], reflet: 14, goutte: [10, 7], carte: 1024, polaire: 512, dos: true, halo: 'telephone' },
    telephone: { tour: 24, arc: 24, jupe: 56, jupeArc: 11, coeur: [14, 8], oeil: [12, 8], reflet: 8, goutte: [8, 5], carte: 512, polaire: 256, dos: false, halo: 'coque' },
    coque: { tour: 18, arc: 18, jupe: 42, jupeArc: 8, coeur: [6, 4], oeil: [6, 4], reflet: 4, goutte: [6, 4], carte: 512, polaire: 256, dos: false, halo: 'coque' },
  };

  // Les habits : la palette (sRGB) et le jeu de runes. La géométrie est la même pour tous.
  const HABITS = {
    aqua: { nom: 'Aqua', haut: '#cfe1eb', bas: '#93b3c6', sombre: '#56778e', bord: '#f0f7fb', coeur: '#4f7189', rune: '#5ff2ff', runeBord: '#2a8fb5', halo: '#3fdcff', runes: 'aqua' },
    // (Les trois autres suivent la gelée de l'Aqua de la fiche : translucide, peu saturée.)
    ignis: { nom: 'Ignis', haut: '#f6d4c0', bas: '#de9a7a', sombre: '#9e573b', bord: '#fff4ec', coeur: '#ad5639', rune: '#ffcf6a', runeBord: '#a83a12', halo: '#ff9a3c', runes: 'ignis' },
    aer: { nom: 'Aer', haut: '#e9f5ed', bas: '#b3d5c0', sombre: '#6a957c', bord: '#ffffff', coeur: '#82b396', rune: '#38eea2', runeBord: '#1f6a47', halo: '#9dffd0', runes: 'aer' },
    terra: { nom: 'Terra', haut: '#ecdab6', bas: '#c3a174', sombre: '#7a5935', bord: '#fff4de', coeur: '#8b6638', rune: '#ffd979', runeBord: '#6a4418', halo: '#ffc85a', runes: 'terra' },
  };

  // ----- Les courbes -----

  // Catmull-Rom centripète par les points donnés (les extrémités doublées par des points fantômes
  // fournis), `n` échantillons par segment.
  function catmull(pts, n) {
    const out = [];
    const d = (a, b) => Math.pow(Math.hypot(b[0] - a[0], b[1] - a[1]), 0.5) || 1e-4;
    for (let i = 1; i < pts.length - 2; i++) {
      const p0 = pts[i - 1], p1 = pts[i], p2 = pts[i + 1], p3 = pts[i + 2];
      const t0 = 0, t1 = t0 + d(p0, p1), t2 = t1 + d(p1, p2), t3 = t2 + d(p2, p3);
      for (let k = 0; k < n; k++) {
        const t = t1 + (t2 - t1) * k / n;
        const L = (a, b, ta, tb) => [a[0] * (tb - t) / (tb - ta) + b[0] * (t - ta) / (tb - ta), a[1] * (tb - t) / (tb - ta) + b[1] * (t - ta) / (tb - ta)];
        const A1 = L(p0, p1, t0, t1), A2 = L(p1, p2, t1, t2), A3 = L(p2, p3, t2, t3);
        const B1 = L(A1, A2, t0, t2), B2 = L(A2, A3, t1, t3);
        out.push(L(B1, B2, t1, t2));
      }
    }
    out.push(pts[pts.length - 2].slice());
    return out;
  }
  // `n` points à pas constant le long d'une polyligne ; rend aussi la longueur.
  function reechantillonner(pts, n) {
    const cum = [0];
    for (let i = 1; i < pts.length; i++) cum.push(cum[i - 1] + Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]));
    const L = cum[cum.length - 1], out = [];
    let j = 0;
    for (let k = 0; k < n; k++) {
      const s = L * k / (n - 1);
      while (j < pts.length - 2 && cum[j + 1] < s) j++;
      const f = (s - cum[j]) / ((cum[j + 1] - cum[j]) || 1);
      out.push([pts[j][0] + (pts[j + 1][0] - pts[j][0]) * f, pts[j][1] + (pts[j + 1][1] - pts[j][1]) * f]);
    }
    return { pts: out, L };
  }
  const lisse = (a, b, x) => { const t = Math.max(0, Math.min(1, (x - a) / (b - a))); return t * t * (3 - 2 * t); };

  // Le profil du corps, à `n` points par l'arc : les points, la longueur, les normales du profil,
  // et des lectures (rayon à l'abscisse s, s à une hauteur ou à un rayon du haut du dôme).
  function profilCorps(n) {
    const P = COTES.profil;
    const fantomes = [[-P[1][0], P[1][1]]].concat(P, [[-P[P.length - 2][0], P[P.length - 2][1]]]);
    const r = reechantillonner(catmull(fantomes, 24), n);
    const pts = r.pts;
    pts[0][0] = 0; pts[n - 1][0] = 0;
    const nr = [];
    for (let j = 0; j < n; j++) {
      const a = pts[Math.max(0, j - 1)], b = pts[Math.min(n - 1, j + 1)];
      let dr = b[0] - a[0], dy = b[1] - a[1];
      if (j === 0 || j === n - 1) { dr = j === 0 ? 1 : -1; dy = 0; }
      const l = Math.hypot(dr, dy) || 1;
      nr.push([dy / l, -dr / l]);
    }
    const L = r.L;
    const lire = (s, k) => { const f = Math.max(0, Math.min(n - 1, s / L * (n - 1))), i = Math.min(n - 2, Math.floor(f)), t = f - i; return pts[i][k] + (pts[i + 1][k] - pts[i][k]) * t; };
    // Le haut du dôme (au-dessus de la plus grande largeur) : y croît et r décroît avec s.
    let jMax = 0;
    for (let j = 0; j < n; j++) if (pts[j][1] > 8 && pts[j][0] > pts[jMax][0]) jMax = j;
    const sDe = (k, x, croissant) => {
      for (let j = jMax; j < n - 1; j++) {
        const a = pts[j][k], b = pts[j + 1][k];
        if ((croissant && x >= a && x <= b) || (!croissant && x <= a && x >= b)) return (j + (x - a) / ((b - a) || 1)) / (n - 1) * L;
      }
      return croissant ? (x < pts[jMax][k] ? jMax / (n - 1) * L : L) : (x > pts[jMax][k] ? jMax / (n - 1) * L : L);
    };
    return { pts, nr, L, rayon: s => lire(s, 0), y: s => lire(s, 1), sDeY: y => sDe(1, y, true), sDeR: x => sDe(0, x, false) };
  }

  // Le facteur de lobe de la jupe à l'angle θ (1 au milieu d'un lobe, 0 au creux), et le rayon du bord.
  function lobe(th) {
    const J = COTES.jupe, c = Math.cos(J.lobes * th / 2);
    return Math.pow(Math.sqrt(c * c + 0.0025), J.finesse);
  }
  const rayonJupe = th => COTES.jupe.rCreux + (COTES.jupe.rLobe - COTES.jupe.rCreux) * lobe(th);
  // Le profil fermé de la jupe (rayon, hauteur) pour un facteur de lobe `e` et un rayon de bord R :
  // l'attache dans le corps, le dessus, la boucle retroussée, le contact au sol, le dessous qui
  // remonte en anneau sous le ventre.
  function profilJupe(e, R, n) {
    const P = [
      [5.9, 6.5], [6.35, 5.9], [6.9, 4.6], [7.4 + 0.35 * (R - 7.4), 3.2 + 0.15 * e], [R - 0.45, 1.75 + 0.45 * e], [R + 0.15 + 0.3 * e, 0.85 + 0.55 * e],
      [R - 0.05, 0.22 + 0.2 * e], [R - 0.9, 0.04], [R - 2.6, 0.03], [5.0, 0.7], [4.2, 1.8],
    ];
    const z = P.length - 1;
    const f0 = [2 * P[0][0] - P[1][0], 2 * P[0][1] - P[1][1]], f1 = [2 * P[z][0] - P[z - 1][0], 2 * P[z][1] - P[z - 1][1]];
    return reechantillonner(catmull([f0].concat(P, [f1]), 16), n);
  }

  // ----- Les géométries -----

  // Une géométrie de travail : positions, normales, uv, pièce (sombre, jupe, goutte), index.
  function Brut() { return { p: [], n: [], uv: [], pc: [], idx: [] }; }
  // Remet chaque triangle dans le sens de ses normales (face avant vers l'extérieur).
  function orienter(b) {
    const P = b.p, N = b.n, I = b.idx;
    for (let k = 0; k < I.length; k += 3) {
      const a = I[k] * 3, c = I[k + 1] * 3, d = I[k + 2] * 3;
      const ux = P[c] - P[a], uy = P[c + 1] - P[a + 1], uz = P[c + 2] - P[a + 2];
      const vx = P[d] - P[a], vy = P[d + 1] - P[a + 1], vz = P[d + 2] - P[a + 2];
      const cx = uy * vz - uz * vy, cy = uz * vx - ux * vz, cz = ux * vy - uy * vx;
      const s = cx * (N[a] + N[c] + N[d]) + cy * (N[a + 1] + N[c + 1] + N[d + 1]) + cz * (N[a + 2] + N[c + 2] + N[d + 2]);
      if (s < 0) { const t = I[k + 1]; I[k + 1] = I[k + 2]; I[k + 2] = t; }
    }
    return b;
  }
  // Une grille (colonnes × lignes) en triangles.
  function grille(b, base, cols, rangs) {
    for (let i = 0; i < cols - 1; i++) for (let j = 0; j < rangs - 1; j++) {
      const a = base + i * rangs + j, c = a + rangs;
      b.idx.push(a, c, a + 1, c, c + 1, a + 1);
    }
  }
  function enGeo(THREE, b, attrs) {
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(b.p, 3));
    g.setAttribute('normal', new THREE.Float32BufferAttribute(b.n, 3));
    if (b.uv.length) g.setAttribute('uv', new THREE.Float32BufferAttribute(b.uv, 2));
    if (b.pc.length) g.setAttribute('aPiece', new THREE.Float32BufferAttribute(b.pc, 3));
    for (const [k, v] of Object.entries(attrs || {})) g.setAttribute(k, new THREE.Float32BufferAttribute(v.data, v.n));
    g.setIndex(b.idx);
    g.computeBoundingSphere();
    return g;
  }
  const sombreDe = ny => lisse(-0.15, -0.75, ny);

  // Le corps : le tour du dôme (uv : u autour, face en 0,5 ; v de 0,25 à 1 le long de l'arc), la
  // jupe (v de 0 à 0,24 le long de son profil), la goutte (sans runes).
  function construireCorps(niv) {
    const N = NIVEAUX[niv], b = Brut();
    const pr = profilCorps(N.arc);
    // Le dôme.
    for (let i = 0; i <= N.tour; i++) {
      const th = -Math.PI + TAU * i / N.tour, sn = Math.sin(th), cs = Math.cos(th);
      for (let j = 0; j < N.arc; j++) {
        const [r, y] = pr.pts[j], [a, ny] = pr.nr[j];
        b.p.push(r * sn, y, r * cs); b.n.push(a * sn, ny, a * cs);
        b.uv.push(i / N.tour, 0.25 + 0.75 * j / (N.arc - 1));
        b.pc.push(sombreDe(ny) * lisse(5, 2, y), 0, 0);
      }
    }
    grille(b, 0, N.tour + 1, N.arc);
    // La jupe : chaque colonne a son profil (son lobe), rééchantillonné à pas constant.
    const base = b.p.length / 3, M = N.jupeArc, cols = [];
    for (let i = 0; i <= N.jupe; i++) {
      const th = -Math.PI + TAU * i / N.jupe;
      cols.push(profilJupe(lobe(th), rayonJupe(th), M).pts);
    }
    for (let i = 0; i <= N.jupe; i++) {
      const th = -Math.PI + TAU * i / N.jupe, sn = Math.sin(th), cs = Math.cos(th);
      const ip = (i - 1 + N.jupe) % N.jupe, is = (i + 1) % N.jupe, dth = TAU / N.jupe * 2;
      for (let j = 0; j < M; j++) {
        const [r, y] = cols[i][j];
        const P = (k, jj) => { const th2 = -Math.PI + TAU * k / N.jupe, q = cols[k][jj]; return [q[0] * Math.sin(th2), q[1], q[0] * Math.cos(th2)]; };
        // Tangentes par différences : le long du profil (t), autour (θ) ; n = t × θ.
        const a = P(i, Math.min(M - 1, j + 1)), c = P(i, Math.max(0, j - 1));
        const tt = [a[0] - c[0], a[1] - c[1], a[2] - c[2]];
        const e = P(is, j), f = P(ip, j);
        let tq = [e[0] - f[0], e[1] - f[1], e[2] - f[2]];
        if (Math.hypot(...tq) < 1e-6) tq = [cs * dth, 0, -sn * dth];
        let nx = tt[1] * tq[2] - tt[2] * tq[1], ny = tt[2] * tq[0] - tt[0] * tq[2], nz = tt[0] * tq[1] - tt[1] * tq[0];
        const l = Math.hypot(nx, ny, nz) || 1; nx /= l; ny /= l; nz /= l;
        b.p.push(r * sn, y, r * cs); b.n.push(nx, ny, nz);
        b.uv.push(i / N.jupe, 0.24 * j / (M - 1));
        b.pc.push(sombreDe(ny), lisse(6.6, 9.0, r), 0);
      }
    }
    grille(b, base, N.jupe + 1, M);
    // La goutte : un petit tour, posé au sol à côté de la jupe.
    const g0 = b.p.length / 3, G = COTES.goutte, [gt, ga] = N.goutte;
    const gx = Math.sin(G.angle) * G.distance, gz = Math.cos(G.angle) * G.distance;
    const gp = reechantillonner(catmull([[-0.6, 0.06], [0, 0.02], [0.6, 0.06], [0.98, 0.32], [1.05, 0.72], [0.82, 1.18], [0.42, 1.62], [0.1, 1.98], [0, 2.08], [-0.1, 1.98]], 8), ga + 1).pts;
    gp[0][0] = 0; gp[ga][0] = 0;
    for (let i = 0; i <= gt; i++) {
      const th = TAU * i / gt, sn = Math.sin(th), cs = Math.cos(th);
      for (let j = 0; j <= ga; j++) {
        const [r, y] = gp[j], q = gp[Math.max(0, j - 1)], s = gp[Math.min(ga, j + 1)];
        let dr = s[0] - q[0], dy = s[1] - q[1];
        if (j === 0) { dr = 1; dy = 0; } else if (j === ga) { dr = -1; dy = 0; }
        const l = Math.hypot(dr, dy) || 1;
        b.p.push(gx + r * sn, y, gz + r * cs); b.n.push(dy / l * sn, -dr / l, dy / l * cs);
        b.uv.push(0.5, 0.995); b.pc.push(0, 0, 1);
      }
    }
    grille(b, g0, gt + 1, ga + 1);
    const nDome = (N.tour) * (N.arc - 1) * 6;
    return { brut: orienter(b), profil: pr, nDome };
  }

  // Un ellipsoïde (le cœur, un œil) : positions, normales vraies, dans un repère donné.
  function ellipsoide(b, c, ax, ay, az, repere, seg, rangs, extra) {
    const base = b.p.length / 3;
    const [X, Y, Z] = repere;
    for (let i = 0; i <= seg; i++) {
      const ph = TAU * i / seg;
      for (let j = 0; j <= rangs; j++) {
        const tt = Math.PI * j / rangs, sx = Math.sin(tt) * Math.sin(ph), sy = Math.cos(tt), sz = Math.sin(tt) * Math.cos(ph);
        const lx = sx * ax, ly = sy * ay, lz = sz * az;
        let nx = sx / ax, ny = sy / ay, nz = sz / az; const l = Math.hypot(nx, ny, nz) || 1; nx /= l; ny /= l; nz /= l;
        b.p.push(c[0] + X[0] * lx + Y[0] * ly + Z[0] * lz, c[1] + X[1] * lx + Y[1] * ly + Z[1] * lz, c[2] + X[2] * lx + Y[2] * ly + Z[2] * lz);
        b.n.push(X[0] * nx + Y[0] * ny + Z[0] * nz, X[1] * nx + Y[1] * ny + Z[1] * nz, X[2] * nx + Y[2] * ny + Z[2] * nz);
        if (extra) extra(lx, ly, lz);
      }
    }
    grille(b, base, seg + 1, rangs + 1);
  }

  function construireCoeur(niv) {
    const N = NIVEAUX[niv], b = Brut(), C = COTES.coeur;
    ellipsoide(b, C.centre, C.rayons[0], C.rayons[1], C.rayons[2], [[1, 0, 0], [0, 1, 0], [0, 0, 1]], N.coeur[0], N.coeur[1]);
    for (let k = 0; k < b.p.length / 3; k++) b.pc.push(0, 0, 0);
    return orienter(b);
  }

  // Les yeux : posés sur le devant du dôme, bas, écartés ; un repère par œil (z : la normale du
  // dôme, x : vers la droite de qui regarde) ; les reflets (un grand en haut, un petit en bas à
  // droite) sont des disques collés à la surface de l'œil. aOeil : (x, y, z locaux, reflet).
  function construireYeux(niv, pr) {
    const N = NIVEAUX[niv], b = Brut(), Y = COTES.yeux, oeil = [];
    const s = pr.sDeY(Y.y), r = pr.rayon(s), j = Math.round(s / pr.L * (pr.pts.length - 1)), [nr, ny] = pr.nr[j];
    for (const sg of [-1, 1]) {
      const th = sg * Math.asin(Y.ecart / r), sn = Math.sin(th), cs = Math.cos(th);
      const Z = [nr * sn, ny, nr * cs], X = [cs, 0, -sn];
      const Yv = [Z[1] * X[2] - Z[2] * X[1], Z[2] * X[0] - Z[0] * X[2], Z[0] * X[1] - Z[1] * X[0]];
      const c = [r * sn - Z[0] * Y.enfonce, Y.y - Z[1] * Y.enfonce, r * cs - Z[2] * Y.enfonce];
      const [ax, ay, az] = Y.rayons;
      ellipsoide(b, c, ax, ay, az, [X, Yv, Z], N.oeil[0], N.oeil[1], (lx, ly, lz) => oeil.push(lx / ax, ly / ay, lz / az, 0));
      for (const [ux, uy, ur] of Y.reflets) {
        const base = b.p.length / 3, k = N.reflet;
        const zl = q => az * Math.sqrt(Math.max(0, 1 - (q[0] / ax) ** 2 - (q[1] / ay) ** 2)) + 0.14;
        const pts = [[ux * 1, uy * 1]];
        for (let i = 0; i < k; i++) { const a = TAU * i / k; pts.push([ux + Math.cos(a) * ur, uy + Math.sin(a) * ur * 1.08]); }
        for (const q of pts) {
          const lz = zl(q);
          b.p.push(c[0] + X[0] * q[0] + Yv[0] * q[1] + Z[0] * lz, c[1] + X[1] * q[0] + Yv[1] * q[1] + Z[1] * lz, c[2] + X[2] * q[0] + Yv[2] * q[1] + Z[2] * lz);
          b.n.push(Z[0], Z[1], Z[2]);
          oeil.push(q[0] / ax, q[1] / ay, lz / az, 1);
        }
        for (let i = 0; i < k; i++) b.idx.push(base, base + 1 + i, base + 1 + (i + 1) % k);
      }
    }
    for (let k = 0; k < b.p.length / 3; k++) b.pc.push(0, 0, 0);
    orienter(b);
    return { brut: b, oeil };
  }

  // Les géométries d'un niveau, partagées par tous les habits (gardées par THREE et par niveau).
  const cacheGeo = new Map();
  function geometries(THREE, niv) {
    const cle = niv;
    let G = cacheGeo.get(cle);
    if (G && G.THREE === THREE) return G;
    const corps = construireCorps(niv);
    const yeux = construireYeux(niv, corps.profil);
    G = {
      THREE, profil: corps.profil, nDome: corps.nDome,
      corps: enGeo(THREE, corps.brut),
      coeur: enGeo(THREE, construireCoeur(niv)),
      yeux: enGeo(THREE, yeux.brut, { aOeil: { data: yeux.oeil, n: 4 } }),
    };
    cacheGeo.set(cle, G);
    return G;
  }

  // ----- Les runes, peintes par le code -----
  //
  // Une rune est un trait (une polyligne) posé sur la surface en coordonnées (θ, s) : θ l'angle
  // autour (0 : la face), s l'abscisse le long du profil du dôme ; ou (θ, t) sur la jupe. Les
  // glyphes sont dessinés dans un repère local en unités de la planche (u à droite, v en haut),
  // posé sur la surface (u / rayon en θ, v en s) : ils épousent la courbure. Le même trait est
  // pixellisé dans les deux cartes (l'équirectangulaire et la polaire) : le fondu entre elles, au
  // sommet, ne montre pas de couture. Trois couches par carte : R le trait net, G son flou (le
  // halo), B un contour un peu plus large (la lisibilité sur la gelée claire).

  const arcL = (cx, cy, r, a0, a1, n) => { const o = []; n = n || Math.max(6, Math.ceil(Math.abs(a1 - a0) * r * 6)); for (let i = 0; i <= n; i++) { const a = a0 + (a1 - a0) * i / n; o.push([cx + Math.cos(a) * r, cy + Math.sin(a) * r]); } return o; };
  const segL = (x0, y0, x1, y1, n) => { const o = []; n = n || 8; for (let i = 0; i <= n; i++) o.push([x0 + (x1 - x0) * i / n, y0 + (y1 - y0) * i / n]); return o; };
  const quadL = (a, c, d, n) => { const o = []; n = n || 16; for (let i = 0; i <= n; i++) { const t = i / n, u = 1 - t; o.push([u * u * a[0] + 2 * u * t * c[0] + t * t * d[0], u * u * a[1] + 2 * u * t * c[1] + t * t * d[1]]); } return o; };
  const T = (pts, w) => ({ pts, w: w || 1 });
  const O = (cx, cy, r, w) => ({ pts: arcL(cx, cy, r, 0, TAU, Math.max(18, Math.ceil(r * 14))), w: w || 1, ferme: true });
  const spirale = (r, tours, w) => { const o = []; const n = 60; for (let i = 0; i <= n; i++) { const t = i / n, a = t * tours * TAU; o.push([Math.cos(a) * r * (0.15 + 0.85 * t), Math.sin(a) * r * (0.15 + 0.85 * t)]); } return T(o, w); };

  // Les glyphes de chaque élément (environ 3 de haut).
  const GLYPHES = {
    aqua: [
      // La fourche (Y) : une tige, deux branches qui s'ouvrent, un point.
      () => [T(segL(0, -1.5, 0, -0.15)), T(quadL([0, -0.15], [-0.1, 0.8], [-1.0, 1.35])), T(quadL([0, -0.15], [0.1, 0.8], [1.0, 1.35])), O(0, 0.75, 0.16, 0.8)],
      // L'arc : deux arcs emboîtés au-dessus d'une courte tige.
      () => [T(arcL(0, -0.2, 1.15, 0.25, Math.PI - 0.25)), T(arcL(0, -0.2, 0.6, 0.35, Math.PI - 0.35)), T(segL(0, -0.2, 0, -1.4))],
      // La branche : une tige en S, deux rameaux alternés.
      () => [T(quadL([0.1, -1.5], [-0.35, 0], [0.05, 1.5])), T(quadL([-0.08, 0.35], [0.5, 0.45], [0.85, 1.1])), T(quadL([-0.12, -0.45], [-0.55, -0.3], [-0.85, 0.25]))],
      // Le trident : une tige, trois dents, les deux du dehors s'écartent.
      () => [T(segL(0, -1.5, 0, 1.3)), T(quadL([0, -0.2], [-0.95, -0.15], [-0.9, 1.0])), T(quadL([0, -0.2], [0.95, -0.15], [0.9, 1.0]))],
      // La goutte : un contour d'eau et son point.
      () => [T(quadL([0, 1.4], [-1.3, -0.5], [0, -1.1]).concat(quadL([0, -1.1], [1.3, -0.5], [0, 1.4]).slice(1))), O(0, -0.35, 0.22, 0.8)],
      // La vague : deux ondes posées l'une sur l'autre.
      () => [T(quadL([-1.2, 0.4], [-0.6, 1.2], [0, 0.4]).concat(quadL([0, 0.4], [0.6, -0.4], [1.2, 0.4]).slice(1))), T(quadL([-1.0, -0.6], [-0.5, 0.1], [0, -0.6]).concat(quadL([0, -0.6], [0.5, -1.3], [1.0, -0.6]).slice(1)))],
    ],
    ignis: [
      () => [T(quadL([0, 1.5], [-1.1, 0.2], [-0.2, -1.4])), T(quadL([0, 1.5], [1.1, 0.2], [0.2, -1.4])), T(quadL([0, 0.6], [-0.4, -0.2], [0, -0.9]))],
      () => [T(segL(-1, -0.2, 0, 0.8, 4).concat(segL(0, 0.8, 1, -0.2, 4).slice(1))), T(segL(-1, -1.0, 0, 0.0, 4).concat(segL(0, 0.0, 1, -1.0, 4).slice(1)))],
      () => [T(segL(0, 1.3, 0.9, 0, 4).concat(segL(0.9, 0, 0, -1.3, 4).slice(1), segL(0, -1.3, -0.9, 0, 4).slice(1), segL(-0.9, 0, 0, 1.3, 4).slice(1))), O(0, 0, 0.2, 0.8)],
      () => [T([[-0.5, 1.5], [0.4, 0.4], [-0.4, 0.1], [0.5, -1.0], [0.1, -1.5]])],
      () => [O(0, 0, 0.6), T(segL(0, 0.9, 0, 1.5)), T(segL(0.8, 0.5, 1.25, 0.85)), T(segL(-0.8, 0.5, -1.25, 0.85)), T(segL(0, -0.9, 0, -1.4))],
      () => [T(quadL([-0.9, -1.3], [-0.6, 0.6], [0, 1.5])), T(quadL([0.9, -1.3], [0.6, 0.6], [0, 1.5])), T(segL(-0.9, -1.3, 0.9, -1.3))],
    ],
    aer: [
      () => [spirale(1.3, 1.6)],
      () => [T(arcL(-0.4, 0, 0.9, -1.2, 2.6)), T(quadL([-0.95, 0.7], [0.4, 1.6], [1.2, 0.5]))],
      () => [T(quadL([0, -1.5], [0.5, 0], [0, 1.5])), T(quadL([0.15, -0.6], [0.8, -0.5], [1.0, 0.0])), T(quadL([0.2, 0.2], [0.9, 0.3], [1.05, 0.8])), T(quadL([0.1, -0.2], [-0.6, -0.1], [-0.9, 0.4]))],
      () => [T(quadL([-1.2, 0.9], [0, 1.5], [1.2, 0.9])), T(quadL([-1.2, 0], [0, 0.6], [1.2, 0])), T(quadL([-1.2, -0.9], [0, -0.3], [1.2, -0.9]))],
      () => [spirale(0.8, 1.2), T(arcL(0, 0, 1.3, 0.4, 2.8))],
      () => [T(quadL([-1.3, -0.6], [0, 1.6], [1.3, -0.6])), T(quadL([-0.6, -0.4], [0, 0.6], [0.6, -0.4]))],
    ],
    terra: [
      () => [T(segL(-1, -1, 1, -1, 4).concat(segL(1, -1, 1, 1, 4).slice(1), segL(1, 1, -1, 1, 4).slice(1), segL(-1, 1, -1, -1, 4).slice(1))), O(0, 0, 0.25, 0.8)],
      () => [T(segL(-1.2, 0.8, 1.2, 0.8)), T(segL(-0.9, 0, 0.9, 0)), T(segL(-1.2, -0.8, 1.2, -0.8))],
      () => [T(segL(-1.2, -1.1, 0, 1.3, 4).concat(segL(0, 1.3, 1.2, -1.1, 4).slice(1), segL(1.2, -1.1, -1.2, -1.1, 4).slice(1)))],
      () => [T(segL(0, 1.5, 0, -0.6)), T(quadL([0, -0.6], [-0.2, -1.2], [-0.9, -1.4])), T(quadL([0, -0.6], [0.2, -1.2], [0.9, -1.4])), T(segL(0, 0.4, 0.7, 0.9))],
      () => [T(arcL(0, 0, 1.1, 0, TAU, 6))],
      () => [T(segL(-1.1, 0.2, 0, 1.2, 3).concat(segL(0, 1.2, 1.1, 0.2, 3).slice(1))), T(segL(-1.1, -0.6, 1.1, -0.6)), T(segL(0, -0.6, 0, -1.4))],
    ],
  };
  // Les deux petits glyphes de la jupe, alternés d'un lobe à l'autre (une spirale, un triangle pour Aqua).
  const GLYPHES_JUPE = {
    aqua: [() => [spirale(0.75, 1.75, 0.9)], () => [T(segL(-0.75, -0.6, 0, 0.75, 3).concat(segL(0, 0.75, 0.75, -0.6, 3).slice(1), segL(0.75, -0.6, -0.75, -0.6, 3).slice(1)), 0.9)]],
    ignis: [() => GLYPHES.ignis[0]().map(t => ({ pts: t.pts.map(([x, y]) => [x * 0.55, y * 0.55]), w: 0.9 })), () => [T(segL(-0.75, -0.6, 0, 0.75, 3).concat(segL(0, 0.75, 0.75, -0.6, 3).slice(1), segL(0.75, -0.6, -0.75, -0.6, 3).slice(1)), 0.9)]],
    aer: [() => [spirale(0.75, 1.75, 0.9)], () => [T(arcL(-0.2, 0, 0.6, -1.2, 2.6), 0.9)]],
    terra: [() => [T(segL(-0.6, -0.6, 0.6, -0.6, 3).concat(segL(0.6, -0.6, 0.6, 0.6, 3).slice(1), segL(0.6, 0.6, -0.6, 0.6, 3).slice(1), segL(-0.6, 0.6, -0.6, -0.6, 3).slice(1)), 0.9)], () => [T(segL(-0.75, -0.6, 0, 0.75, 3).concat(segL(0, 0.75, 0.75, -0.6, 3).slice(1), segL(0.75, -0.6, -0.75, -0.6, 3).slice(1)), 0.9)]],
  };

  // Une suite pseudo-aléatoire fixe (les runes d'un habit sont toujours les mêmes).
  function graine(n) { let s = n >>> 0; return () => { s = (s + 0x6d2b79f5) >>> 0; let t = s; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }

  // Le plan des runes d'un habit : la liste des traits en coordonnées de surface.
  // Trait : { zone: 'dome' | 'jupe', pts: [[θ, s ou t]], w (largeur), ferme, kv (jupe) }.
  function planRunes(cle, pr) {
    const G = GLYPHES[cle], GJ = GLYPHES_JUPE[cle], traits = [], hasard = graine(cle.length * 977 + cle.charCodeAt(0));
    // Le trait : épais et net, comme sur la fiche (l'Aqua plus encore, ses glyphes sont peu nombreux).
    const LARGEUR = cle === 'aqua' ? 0.26 : 0.21;
    // Un glyphe local posé sur le dôme en (θ0, s0), tourné de `rot`, à l'échelle `k`.
    const poser = (glyphe, th0, s0, k, rot) => {
      const c = Math.cos(rot || 0), sn = Math.sin(rot || 0);
      for (const t of glyphe) traits.push({
        zone: 'dome', ferme: !!t.ferme, w: LARGEUR * t.w * Math.sqrt(k),
        pts: t.pts.map(([u0, v0]) => { const u = (u0 * c - v0 * sn) * k, v = (u0 * sn + v0 * c) * k, s = s0 + v; return [th0 + u / Math.max(1.5, pr.rayon(s)), s]; }),
      });
    };
    // Un motif du plan du sommet (x à droite, z vers la face, vu de dessus) ramené sur le dôme.
    const sommet = (pts, w, ferme) => traits.push({ zone: 'dome', ferme: !!ferme, w: LARGEUR * (w || 1), pts: pts.map(([x, z]) => [Math.atan2(x, z), pr.sDeR(Math.hypot(x, z))]) });
    const anneau = (r, w) => sommet(arcL(0, 0, r, 0, TAU, Math.ceil(r * 16)).map(([a, b]) => [a, b]), w, true);

    // L'Aqua de la fiche : de grands traits calligraphiques posés à la main (arcs, fourches, crocs),
    // qui suivent le dôme ; les autres habits gardent leurs rangs de glyphes.
    if (cle === 'aqua') {
      const arcF = () => [T(quadL([-1.45, -0.55], [0, 1.75], [1.45, -0.55], 20)), T(quadL([1.45, -0.55], [1.6, -1.05], [1.15, -1.4], 8), 0.8), T(quadL([0, 0.6], [-0.15, -0.2], [0.05, -0.9], 10), 0.85)];
      const fourche = () => [T(quadL([0.05, -1.5], [-0.12, -0.6], [0, 0.05], 10)), T(quadL([0, 0.05], [-0.25, 0.85], [-1.0, 1.45], 12)), T(quadL([0, 0.05], [0.35, 0.95], [0.95, 1.5], 12)), T(quadL([-0.45, 0.75], [-0.85, 0.55], [-1.1, 0.75], 6), 0.7)];
      const croc = () => [T(quadL([-0.35, 1.45], [1.25, 0.75], [0.15, -0.15], 14)), T(quadL([0.15, -0.15], [-0.95, -0.85], [0.45, -1.45], 14))];
      const arche = () => [T(quadL([-0.95, -1.35], [-1.1, 1.75], [0.85, 0.35], 16)), T(quadL([0.85, 0.35], [1.05, -0.25], [0.8, -1.35], 10))];
      const lambda = () => [T(quadL([-1.0, -1.45], [-0.1, 0.0], [0.45, 1.45], 14)), T(quadL([-0.15, 0.3], [0.45, -0.4], [0.95, -1.45], 12))];
      const onde = () => [T(quadL([-1.5, 0], [-0.75, 0.9], [0, 0], 10).concat(quadL([0, 0], [0.75, -0.9], [1.5, 0], 10).slice(1)))];
      const PLAN = [
        [arcF, 0, 18.4, 1.75, 0], [fourche, -0.86, 16.9, 1.35, 0.2], [croc, 0.88, 17.0, 1.3, -0.14],
        [arche, -1.3, 11.8, 1.35, 0.08], [lambda, 1.32, 12.0, 1.35, -0.1], [onde, -0.85, 8.4, 0.9, 0.08], [onde, 0.9, 8.3, 0.85, -0.08],
        [fourche, -1.95, 17.0, 1.3, 0.22], [arche, 2.0, 17.2, 1.3, -0.15], [croc, -2.45, 11.8, 1.25, 0.1], [fourche, 2.5, 11.6, 1.25, -0.12],
        [lambda, -2.85, 17.8, 1.05, 0.2], [croc, 2.88, 18.0, 1.05, -0.2], [onde, -1.85, 8.2, 0.9, 0], [onde, 1.9, 8.3, 0.9, 0],
      ];

      for (const [g, th, y, k, rot] of PLAN) poser(g(), th, pr.sDeY(y), k, rot);
    }
    // Le devant et les côtés : trois rangs, plus serrés en haut ; rien sur les yeux ni sur le dos.
    const Y = COTES.yeux, sY = pr.sDeY(Y.y), aY = Math.asin(Y.ecart / pr.rayon(sY)), yDos = 13.4;
    const rangs = [[19.6, Math.PI / 8, 1.05, 1.0], [15.6, 0, 1.3, 1.0], [11.6, Math.PI / 8, 1.3, 1.0], [8.2, 0, 1.0, 0.8]];
    let n = 0;
    for (const [y, dec, k0, dens] of cle === 'aqua' ? [] : rangs) {
      const s = pr.sDeY(y), r = pr.rayon(s), pas = Math.PI / 4;
      for (let th = -Math.PI + pas / 2 + dec; th < Math.PI; th += pas) {
        const a = Math.atan2(Math.sin(th), Math.cos(th));
        if (Math.hypot((Math.PI - Math.abs(a)) * r, y - yDos) < 7.4) continue;          // le mandala du dos
        if (Math.hypot((Math.abs(a) - aY) * r, y - Y.y) < Y.rayons[1] + 1.5) continue;  // les yeux
        if (y < 15 && Math.abs(a) < 0.9) continue;                                     // le bas du devant reste clair
        if (hasard() > dens) continue;
        const g = G[(n++ * 5 + Math.floor(hasard() * 3)) % G.length];
        poser(g(), a + (hasard() - 0.5) * 0.12, s + (hasard() - 0.5) * 0.6, k0 * (0.85 + hasard() * 0.25) * Math.min(1, r / 8.6), (hasard() - 0.5) * 0.35);
      }
    }
    // Le dos : un mandala de cercles concentriques, un petit anneau au centre, des traits rayonnants
    // courts et des arcs autour.
    {
      const s0 = pr.sDeY(yDos), dos = (pts, w, ferme) => poser([{ pts, w, ferme }], Math.PI, s0, 1, 0);
      dos(arcL(0, 0, 0.75, 0, TAU, 24), 0.9, true);
      dos(arcL(0, 0, 2.45, 0, TAU, 48), 1.0, true);
      dos(arcL(0, 0, 3.7, 0, TAU, 64), 0.85, true);
      for (let i = 0; i < 12; i++) { const a = i * TAU / 12; dos(segL(Math.cos(a) * 1.15, Math.sin(a) * 1.15, Math.cos(a) * 2.05, Math.sin(a) * 2.05, 4), 0.8); }
      for (let i = 0; i < 8; i++) { const a = i * TAU / 8 + 0.2; dos(arcL(0, 0, 4.4, a, a + 0.42, 10), 0.9); dos([[Math.cos(a + 0.6) * 4.45, Math.sin(a + 0.6) * 4.45], [Math.cos(a + 0.6) * 4.75, Math.sin(a + 0.6) * 4.75]], 0.9); }
      for (let i = 0; i < 6; i++) { const a = i * TAU / 6 + 0.26; dos(arcL(Math.cos(a) * 3.08, Math.sin(a) * 3.08, 0.22, 0, TAU, 10), 0.6, true); }
    }
    // Le sommet : deux anneaux, de petits glyphes entre eux, un anneau au centre, puis des lignes
    // qui descendent le dôme en se ramifiant.
    anneau(0.95, 0.9);
    anneau(2.5, 1.0);
    anneau(4.35, 1.05);
    for (let i = 0; i < 8; i++) {
      const a = i * TAU / 8, cx = Math.sin(a) * 3.42, cz = Math.cos(a) * 3.42;
      const g = G[i % G.length]().map(t => ({ pts: t.pts.map(([u, v]) => { const k = 0.34, x = u * k, z = -v * k; return [cx + x * Math.cos(a) + z * Math.sin(a), cz - x * Math.sin(a) + z * Math.cos(a)]; }), w: 0.75, ferme: t.ferme }));
      for (const t of g) sommet(t.pts, t.w, t.ferme);
    }
    for (let i = 0; i < 8; i++) {
      // (L'Aqua n'en garde que quatre, sur les côtés et au dos : la fiche montre peu de traits, larges.)
      if (cle === 'aqua' && i % 2 === 0) continue;
      const a = i * TAU / 8, sH = pr.sDeR(4.35), long = (cle === 'aqua' ? [1.6, 4.2, 6.2, 8.0, 3.2, 8.0, 6.2, 4.2] : [4.2, 8.0, 6.2, 8.0, 3.2, 8.0, 6.2, 8.0])[i];
      const pts = [];
      for (let k = 0; k <= 30; k++) { const s = sH - long * k / 30; pts.push([a + 0.06 * Math.sin(k * 0.35 + i), s]); }
      traits.push({ zone: 'dome', w: LARGEUR * 0.95, pts });
      // Deux rameaux et un bout fourchu.
      for (const [f, sg] of [[0.35, 1], [0.62, -1]]) {
        const s = sH - long * f, r = pr.rayon(s);
        traits.push({ zone: 'dome', w: LARGEUR * 0.75, pts: quadL([0, 0], [sg * 0.7, -0.2], [sg * 1.2, -1.1], 10).map(([u, v]) => [a + 0.06 * Math.sin(f * 30 * 0.35 + i) + u / r, s + v]) });
      }
      const sb = sH - long, rb = pr.rayon(sb);
      for (const sg of [-1, 1]) traits.push({ zone: 'dome', w: LARGEUR * 0.75, pts: quadL([0, 0], [sg * 0.1, -0.5], [sg * 0.6, -0.9], 8).map(([u, v]) => [a + 0.06 * Math.sin(30 * 0.35 + i) + u / rb, sb + v]) });
    }
    // La jupe : un petit glyphe par lobe, sur le dessus, près du bord.
    {
      const P = profilJupe(1, COTES.jupe.rLobe, 200), Lj = P.L, t0 = 0.27, ro = P.pts[Math.round(t0 * 199)][0];
      for (let k = 0; k < COTES.jupe.lobes; k++) {
        const a = Math.atan2(Math.sin(k * TAU / COTES.jupe.lobes), Math.cos(k * TAU / COTES.jupe.lobes));
        for (const t of GJ[k % 2]()) traits.push({ zone: 'jupe', ferme: !!t.ferme, w: LARGEUR * 0.85 * t.w, kv: Lj, kh: ro, pts: t.pts.map(([u, v]) => [a + u / ro, t0 - v / Lj]) });
      }
    }
    return traits;
  }

  // Pixellise les traits dans une carte : `proj(a, b)` rend [x, y] en pixels ; la largeur est
  // appliquée dans le repère de la surface (mesure horizontale kh, verticale kv).
  function pixelliser(g, traits, proj, mesure, copies) {
    g.fillStyle = '#fff';
    for (const t of traits) {
      const P = t.pts, n = P.length;
      if (n < 2) continue;
      const gauche = [], droite = [];
      for (let i = 0; i < n; i++) {
        const a = P[Math.max(0, i - 1)], c = P[Math.min(n - 1, i + 1)];
        const [kh, kv] = mesure(t, P[i]);
        let tx = (c[0] - a[0]) * kh, ty = (c[1] - a[1]) * kv;
        if (t.ferme && (i === 0 || i === n - 1)) { const a2 = P[n - 2], c2 = P[1]; tx = (c2[0] - a2[0]) * kh; ty = (c2[1] - a2[1]) * kv; }
        const l = Math.hypot(tx, ty) || 1;
        const nx = -ty / l, ny = tx / l;
        const f = i / (n - 1);
        // Un trait de plume : plein au milieu, effilé aux bouts (les cercles gardent un souffle).
        const k = t.ferme ? 0.85 + 0.15 * Math.sin(f * TAU * 2 + 0.7) : 0.3 + 0.7 * Math.pow(Math.sin(Math.PI * Math.min(1, Math.max(0, f * 1.04 - 0.02))), 0.55);
        const hw = t.w * 0.5 * k;
        gauche.push([P[i][0] + nx * hw / kh, P[i][1] + ny * hw / kv]);
        droite.push([P[i][0] - nx * hw / kh, P[i][1] - ny * hw / kv]);
      }
      const poly = gauche.concat(droite.reverse()).map(q => proj(t, q));
      if (poly.some(q => !isFinite(q[0]) || !isFinite(q[1]))) continue;
      for (const dx of copies(poly)) {
        g.beginPath();
        g.moveTo(poly[0][0] + dx, poly[0][1]);
        for (let i = 1; i < poly.length; i++) g.lineTo(poly[i][0] + dx, poly[i][1]);
        g.closePath();
        g.fill();
      }
    }
  }

  // Flou en boîte, trois passes séparables (presque gaussien) ; `boucle` : x se referme (la couture).
  function flou(src, W, H, r, boucle) {
    let a = Float32Array.from(src), b = new Float32Array(W * H);
    const passe = (inp, out, horiz) => {
      const n = horiz ? W : H, m = horiz ? H : W, d = 2 * r + 1;
      for (let q = 0; q < m; q++) {
        let somme = 0;
        const at = i => { if (boucle && horiz) i = ((i % n) + n) % n; else i = Math.max(0, Math.min(n - 1, i)); return horiz ? inp[q * W + i] : inp[i * W + q]; };
        for (let i = -r; i <= r; i++) somme += at(i);
        for (let i = 0; i < n; i++) {
          if (horiz) out[q * W + i] = somme / d; else out[i * W + q] = somme / d;
          somme += at(i + r + 1) - at(i - r);
        }
      }
    };
    for (let k = 0; k < 3; k++) { passe(a, b, true); passe(b, a, false); }
    return a;
  }

  // Les deux cartes d'un habit (une DataTexture chacune : R trait, G halo, B contour).
  const cacheTex = new Map();
  function cartesRunes(THREE, habit, niv) {
    const N = NIVEAUX[niv], cle = habit.runes + '|' + N.carte;
    const c0 = cacheTex.get(cle);
    if (c0 && c0.THREE === THREE) return c0;
    const pr = geometries(THREE, niv).profil;
    const traits = planRunes(habit.runes, pr);
    const W = N.carte, H = N.carte, PW = N.polaire, C = COTES.polaire;
    const pxU = W / 1024;
    const toile = (w, h) => { const c = document.createElement('canvas'); c.width = w; c.height = h; const g = c.getContext('2d'); g.fillStyle = '#000'; g.fillRect(0, 0, w, h); return { c, g }; };
    // L'équirectangulaire : x = (0,5 + θ / 2π) W ; le dôme sur les trois quarts du haut (v de 0,25 à 1),
    // la jupe en bas (v de 0 à 0,24). La ligne 0 de la toile est le haut de l'image (v = 1).
    const E = toile(W, H);
    const projE = (t, [a, b]) => [(0.5 + a / TAU) * W, t.zone === 'jupe' ? (1 - 0.24 * b) * H : (1 - (0.25 + 0.75 * b / pr.L)) * H];
    const mesure = (t, [, b]) => t.zone === 'jupe' ? [t.kh, t.kv] : [Math.max(1.5, pr.rayon(b)), 1];
    const copiesE = poly => { let x0 = Infinity, x1 = -Infinity; for (const q of poly) { x0 = Math.min(x0, q[0]); x1 = Math.max(x1, q[0]); } const o = [0]; if (x0 < 0) o.push(W); if (x1 > W) o.push(-W); return o; };
    // Les traits dont tous les points sont au sommet ne vont pas dans l'équirectangulaire (le pôle).
    pixelliser(E.g, traits.filter(t => t.zone === 'jupe' || t.pts.some(([, b]) => pr.rayon(b) > C.rA - 1.2)), projE, mesure, copiesE);
    // La polaire : le sommet vu de dessus, x = 0,5 + x / 2rP, ligne = 0,5 + z / 2rP (la face en bas).
    const Pz = toile(PW, PW);
    const projP = (t, [a, b]) => { const r = pr.rayon(b); return [(0.5 + r * Math.sin(a) / (2 * C.rP)) * PW, (0.5 + r * Math.cos(a) / (2 * C.rP)) * PW]; };
    pixelliser(Pz.g, traits.filter(t => t.zone === 'dome' && t.pts.some(([, b]) => pr.y(b) > 15 && pr.rayon(b) < C.rP + 0.5)), projP, mesure, () => [0]);
    const emballer = (cv, w, h, boucle, rHalo, rBord) => {
      const img = cv.getContext('2d').getImageData(0, 0, w, h).data;
      const R = new Float32Array(w * h);
      for (let i = 0; i < w * h; i++) R[i] = img[i * 4] / 255;
      const Gf = flou(R, w, h, Math.max(1, Math.round(rHalo)), boucle), Bf = flou(R, w, h, Math.max(1, Math.round(rBord)), boucle);
      const data = new Uint8Array(w * h * 4);
      for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
        const s = y * w + x, d = ((h - 1 - y) * w + x) * 4;
        data[d] = Math.round(R[s] * 255);
        data[d + 1] = Math.round(Math.min(1, Gf[s] * 1.6) * 255);
        data[d + 2] = Math.round(Math.min(1, Bf[s] * 1.4) * 255);
        data[d + 3] = 255;
      }
      const tex = new THREE.DataTexture(data, w, h, THREE.RGBAFormat);
      tex.generateMipmaps = true; tex.minFilter = THREE.LinearMipmapLinearFilter; tex.magFilter = THREE.LinearFilter;
      tex.wrapS = boucle ? THREE.RepeatWrapping : THREE.ClampToEdgeWrapping; tex.wrapT = THREE.ClampToEdgeWrapping;
      tex.anisotropy = 4; tex.needsUpdate = true;
      return tex;
    };
    const res = {
      THREE,
      equi: emballer(E.c, W, H, true, 2.6 * pxU, 1.4 * pxU),
      polaire: emballer(Pz.c, PW, PW, false, 3.4 * PW / 512, 1.8 * PW / 512),
      toiles: { equi: E.c, polaire: Pz.c },
      octets: (W * H + PW * PW) * 4 * 1.33,
    };
    cacheTex.set(cle, res);
    return res;
  }

  // ----- Les nuanceurs -----

  const COMMUN_VS = `
#ifdef USE_INSTANCING
attribute float aTemps;
attribute vec4 aEtat;
#define T_GLYM aTemps
#define E_GLYM aEtat
#else
uniform float uTemps;
uniform vec4 uEtat;
#define T_GLYM uTemps
#define E_GLYM uEtat
#endif
uniform vec4 uAnim;
varying vec4 vEtat;
varying float vT;
// Le rebond (étiré, écrasé, la gelée en retard vers le haut), le corps qui se soulève sur sa
// jupe posée, la houle des lobes, le souffle de la goutte. p en unités de la planche.
vec3 deformer(vec3 p, vec3 piece) {
  float t = T_GLYM;
  float w = smoothstep(1.0, 11.0, p.y) * (1.0 - piece.z);
  float b = sin(t * 2.4 - p.y * 0.055);
  float a = uAnim.x * b * w;
  p.y += p.y * a + uAnim.y * (0.5 + 0.5 * sin(t * 2.4 - 0.9)) * w;
  p.xz *= 1.0 - 0.55 * a;
  float th = atan(p.x, p.z);
  p.y += piece.y * uAnim.z * sin(t * 1.9 + th * 3.0);
  p.xz *= 1.0 + piece.y * 0.026 * sin(t * 1.3 + th * uAnim.w + 1.3);
  p.y *= 1.0 + piece.z * 0.09 * sin(t * 3.3 + 0.7);
  return p;
}
vec4 placer(vec3 p) {
#ifdef USE_INSTANCING
  return modelViewMatrix * instanceMatrix * vec4(p, 1.0);
#else
  return modelViewMatrix * vec4(p, 1.0);
#endif
}
vec3 tourner(vec3 n) {
#ifdef USE_INSTANCING
  return normalize(normalMatrix * (mat3(instanceMatrix) * n));
#else
  return normalize(normalMatrix * n);
#endif
}
`;
  // La transparence des pièces pleines (un fondu, rare) : une trame, pas de tri.
  const TRAME = `
float trame() { return fract(sin(dot(floor(gl_FragCoord.xy), vec2(12.9898, 78.233))) * 43758.5453); }
`;
  const RUNES_FS = `
uniform sampler2D tEqui;
uniform sampler2D tPolaire;
uniform vec4 uPolaire;
varying vec3 vP;
varying vec2 vUv;
vec3 masques() {
  vec2 up = vec2(0.5 + vP.x / (2.0 * uPolaire.z), 0.5 - vP.z / (2.0 * uPolaire.z));
  float wp = step(uPolaire.w, vP.y) * (1.0 - smoothstep(uPolaire.x, uPolaire.y, length(vP.xz)));
  return mix(texture2D(tEqui, vUv).rgb, texture2D(tPolaire, up).rgb, wp);
}
float pouls() { return 0.8 + 0.2 * sin(vT * 1.7) + 0.14 * sin(vT * 2.6 - vP.y * 0.32); }
`;
  const GELEE_VS = COMMUN_VS + `
attribute vec3 aPiece;
uniform float uGonfle;
varying vec3 vN;
varying vec3 vVue;
varying vec3 vP;
varying vec3 vPiece;
varying vec2 vUv;
#include <common>
#include <fog_pars_vertex>
void main() {
  vP = position; vPiece = aPiece; vUv = uv; vEtat = E_GLYM; vT = T_GLYM;
  vec4 mvPosition = placer(deformer(position + normal * uGonfle, aPiece));
  vN = tourner(normal);
  vVue = mvPosition.xyz;
  gl_Position = projectionMatrix * mvPosition;
  #include <fog_vertex>
}`;
  const GELEE_FS = `
uniform vec3 cHaut;
uniform vec3 cBas;
uniform vec3 cSombre;
uniform vec3 cBord;
uniform vec3 cRune;
uniform vec3 cRuneBord;
uniform vec3 cHalo;
uniform vec4 uGelee;
uniform float uFace;
varying vec3 vN;
varying vec3 vVue;
varying vec3 vPiece;
varying vec4 vEtat;
varying float vT;
#include <common>
#include <fog_pars_fragment>
` + RUNES_FS + `
void main() {
  vec3 n = normalize(vN) * uFace;
  vec3 v = normalize(-vVue);
  float ndv = clamp(dot(n, v), 0.0, 1.0);
  float fr = pow(1.0 - ndv, 2.3);
  vec3 base = mix(cBas, cHaut, smoothstep(4.0, 24.0, vP.y));
  base = mix(base, cSombre, vPiece.x * 0.8);
  vec3 L = normalize(vec3(-0.42, 0.72, 0.55));
  float d = dot(n, L) * 0.5 + 0.5;
  vec3 col = base * (0.56 + 0.5 * d);
  col += cBord * fr * 0.3;
  // Le liseré sombre de la silhouette (la fiche est cernée d'un trait bleu ardoise).
  col = mix(col, cSombre * 0.55, smoothstep(0.22, 0.04, ndv) * 0.95 * uGelee.w);
  vec3 H = normalize(L + v);
  float nh = max(dot(n, H), 0.0);
  float sp = pow(nh, 90.0) * 1.1 + pow(nh, 16.0) * 0.14;
  vec3 L2 = normalize(vec3(0.75, 0.25, 0.35));
  sp += pow(max(dot(n, normalize(L2 + v)), 0.0), 48.0) * 0.3;
  sp *= uGelee.z;
  col += vec3(sp);
  float a = mix(uGelee.x, uGelee.y, fr) + sp * 0.5;
  vec3 m = masques();
  float p = pouls();
  float kr = uGelee.w * vEtat.w;
  col = mix(col, cRuneBord, m.b * 0.22 * uGelee.w);
  a = max(a, m.b * 0.6 * uGelee.w);
  vec3 em = cRune * (0.92 + 0.28 * p) + vec3(0.35) * m.r * m.r * m.r * p;
  col = mix(col, em, m.r * min(1.0, kr)) + cHalo * m.g * 0.1 * p * kr;
  a = max(a, m.r * min(1.0, uGelee.w));
  col = mix(col, vec3(1.0), vEtat.y);
  gl_FragColor = vec4(col, clamp(a, 0.0, 1.0) * vEtat.x);
  #include <encodings_fragment>
  #include <fog_fragment>
}`;
  const HALO_FS = `
uniform vec3 cHalo;
uniform vec4 uHalo;
varying vec3 vN;
varying vec3 vVue;
varying vec3 vPiece;
varying vec4 vEtat;
varying float vT;
#include <common>
#include <fog_pars_fragment>
` + RUNES_FS + `
void main() {
  vec3 n = normalize(vN);
  vec3 v = normalize(-vVue);
  float ndv = clamp(dot(n, v), 0.0, 1.0);
  vec3 m = masques();
  float p = pouls();
  vec3 col = cHalo * (m.g * uHalo.x * p * smoothstep(0.0, 0.35, ndv) + pow(1.0 - ndv, 3.0) * uHalo.y * (1.0 - vPiece.z));
  col *= vEtat.x * vEtat.w;
  #ifdef USE_FOG
    #ifdef FOG_EXP2
    float ff = 1.0 - exp(-fogDensity * fogDensity * vFogDepth * vFogDepth);
    #else
    float ff = smoothstep(fogNear, fogFar, vFogDepth);
    #endif
    col *= 1.0 - ff;
  #endif
  gl_FragColor = vec4(col, 1.0);
  #include <encodings_fragment>
}`;
  const COEUR_VS = COMMUN_VS + `
attribute vec3 aPiece;
varying vec3 vN;
varying vec3 vVue;
varying vec3 vP;
#include <common>
#include <fog_pars_vertex>
void main() {
  vP = position; vEtat = E_GLYM; vT = T_GLYM;
  vec4 mvPosition = placer(deformer(position, aPiece));
  vN = tourner(normal);
  vVue = mvPosition.xyz;
  gl_Position = projectionMatrix * mvPosition;
  #include <fog_vertex>
}`;
  const COEUR_FS = `
uniform vec3 cCoeur;
uniform vec3 cHalo;
varying vec3 vN;
varying vec3 vVue;
varying vec3 vP;
varying vec4 vEtat;
varying float vT;
#include <common>
#include <fog_pars_fragment>
` + TRAME + `
void main() {
  vec3 n = normalize(vN);
  vec3 v = normalize(-vVue);
  float ndv = clamp(dot(n, v), 0.0, 1.0);
  float d = dot(n, normalize(vec3(-0.42, 0.72, 0.55))) * 0.5 + 0.5;
  vec3 col = cCoeur * (0.7 + 0.35 * d) + cHalo * (0.03 + 0.025 * sin(vT * 1.7));
  col = mix(col, vec3(1.0), vEtat.y);
  // Un ventre sans bord net : opaque au milieu, fondu vers sa silhouette.
  gl_FragColor = vec4(col, smoothstep(0.0, 0.22, ndv) * vEtat.x);
  #include <encodings_fragment>
  #include <fog_fragment>
}`;
  const YEUX_VS = COMMUN_VS + `
attribute vec4 aOeil;
uniform float uYeuxY;
varying vec3 vN;
varying vec3 vVue;
varying vec4 vOeil;
#include <common>
#include <fog_pars_vertex>
void main() {
  vOeil = aOeil; vEtat = E_GLYM; vT = T_GLYM;
  vec3 p = position;
  p.y = uYeuxY + (p.y - uYeuxY) * (1.0 - 0.9 * E_GLYM.z);
  vec4 mvPosition = placer(deformer(p, vec3(0.0)));
  vN = tourner(normal);
  vVue = mvPosition.xyz;
  gl_Position = projectionMatrix * mvPosition;
  #include <fog_vertex>
}`;
  const YEUX_FS = `
uniform vec3 cBord;
varying vec3 vN;
varying vec3 vVue;
varying vec4 vOeil;
varying vec4 vEtat;
varying float vT;
#include <common>
#include <fog_pars_fragment>
` + TRAME + `
void main() {
  if (vEtat.x < 0.995 && trame() > vEtat.x) discard;
  vec3 col;
  if (vOeil.w > 0.5) col = vec3(0.97, 0.99, 1.0);
  else {
    vec3 n = normalize(vN);
    vec3 v = normalize(-vVue);
    float fr = pow(1.0 - clamp(dot(n, v), 0.0, 1.0), 2.5);
    vec3 L = normalize(vec3(-0.42, 0.72, 0.55));
    float sp = pow(max(dot(n, normalize(L + v)), 0.0), 60.0);
    // Un noir bleuté de perle, une lueur bleu-vert qui remonte du bas (la gelée vue à travers).
    col = vec3(0.025, 0.045, 0.07);
    col += vec3(0.1, 0.24, 0.3) * smoothstep(0.1, -0.95, vOeil.y);
    col += cBord * fr * 0.22 + vec3(sp * 0.5);
  }
  col = mix(col, vec3(1.0), vEtat.y * 0.6);
  gl_FragColor = vec4(col, 1.0);
  #include <encodings_fragment>
  #include <fog_fragment>
}`;

  // ----- Les matières d'un habit -----

  // Les matières sont créées par Glym (planche : leurs uniformes portent le temps et l'état) ou
  // une fois par habit (jeu : le temps et l'état sont des attributs d'instance).
  function matieres(THREE, habit, niv, opts) {
    const o = opts || {};
    const tex = cartesRunes(THREE, habit, niv);
    const col = h => new THREE.Color(h);
    const P = COTES.polaire;
    const yPol = geometries(THREE, niv).profil.y(geometries(THREE, niv).profil.sDeR(P.rB + 0.6));
    const communs = () => ({ uTemps: { value: 0 }, uEtat: { value: new THREE.Vector4(1, 0, 0, 1) }, uAnim: { value: new THREE.Vector4(o.etire != null ? o.etire : 0.022, 0.3, 0.32, 2) } });
    const runes = () => ({ tEqui: { value: tex.equi }, tPolaire: { value: tex.polaire }, uPolaire: { value: new THREE.Vector4(P.rA, P.rB, P.rP, yPol) } });
    const fog = () => THREE.UniformsUtils.clone(THREE.UniformsLib.fog);
    const palette = () => ({ cHaut: { value: col(habit.haut) }, cBas: { value: col(habit.bas) }, cSombre: { value: col(habit.sombre) }, cBord: { value: col(habit.bord) }, cRune: { value: col(habit.rune) }, cRuneBord: { value: col(habit.runeBord) }, cHalo: { value: col(habit.halo) }, cCoeur: { value: col(habit.coeur) } });
    const gelee = (face, ae) => new THREE.ShaderMaterial({
      uniforms: Object.assign(fog(), communs(), runes(), palette(), { uGelee: { value: new THREE.Vector4(ae[0], ae[1], ae[2], ae[3]) }, uFace: { value: face }, uGonfle: { value: 0 } }),
      vertexShader: GELEE_VS, fragmentShader: GELEE_FS, transparent: true, depthWrite: true, fog: true,
      side: face > 0 ? THREE.FrontSide : THREE.BackSide,
    });
    const M = {
      dos: gelee(-1, [0.16, 0.4, 0.35, 0.28]),
      gelee: gelee(1, [o.alpha != null ? o.alpha : 0.74, 0.97, 1, 1]),
      halo: new THREE.ShaderMaterial({
        uniforms: Object.assign(fog(), communs(), runes(), palette(), { uHalo: { value: new THREE.Vector4(o.halo != null ? o.halo : 0.2, 0.02, 0, 0) }, uGonfle: { value: 0.3 } }),
        vertexShader: GELEE_VS, fragmentShader: HALO_FS, transparent: true, depthWrite: false, fog: true,
        // Additif sur la couleur, l'alpha de la toile gardé (la toile de l'île est transparente sur le ciel).
        blending: THREE.CustomBlending, blendEquation: THREE.AddEquation, blendSrc: THREE.SrcAlphaFactor, blendDst: THREE.OneFactor, blendSrcAlpha: THREE.ZeroFactor, blendDstAlpha: THREE.OneFactor,
      }),
      coeur: new THREE.ShaderMaterial({ uniforms: Object.assign(fog(), communs(), palette()), vertexShader: COEUR_VS, fragmentShader: COEUR_FS, fog: true, transparent: true, depthWrite: false }),
      yeux: new THREE.ShaderMaterial({ uniforms: Object.assign(fog(), communs(), palette(), { uYeuxY: { value: COTES.yeux.y } }), vertexShader: YEUX_VS, fragmentShader: YEUX_FS, fog: true }),
    };
    M.dos.depthWrite = false;
    return { M, tex };
  }

  // Le clignement : fermé pendant 140 ms toutes les 2,5 à 6 s (parfois deux fois de suite).
  function cligneur(graineN) {
    const h = graine(graineN);
    let prochain = 1.2 + h() * 3, double = false;
    return t => {
      if (t > prochain + 0.14) { prochain = t + (double ? 0.18 : 2.5 + h() * 3.5); double = !double && h() < 0.25; }
      const d = t - prochain;
      return d < 0 || d > 0.14 ? 0 : Math.sin(d / 0.14 * Math.PI);
    };
  }

  // ----- Un Glym : un THREE.Group (la planche, les aperçus) -----
  // opts : { habit: 'aqua' | objet, niveau: 'planche' | 'bureau' | 'telephone', halo: bool (sans :
  // la version de secours), echelle, graine }.
  function construire(THREE, opts) {
    const o = opts || {};
    const niv = o.niveau || 'planche', N = NIVEAUX[niv];
    const habit = typeof o.habit === 'object' ? o.habit : HABITS[o.habit || 'aqua'];
    const G = geometries(THREE, niv);
    const { M } = matieres(THREE, habit, niv, o);
    const groupe = new THREE.Group();
    groupe.name = 'Glym ' + habit.nom;
    // L'ordre du dessin : les yeux (pleins), l'envers de la gelée, le cœur (vu à travers elle, devant
    // son envers), la gelée, le halo.
    const piece = (nom, geo, mat, ordre) => { const m = new THREE.Mesh(geo, mat); m.name = nom; m.renderOrder = ordre; groupe.add(m); return m; };
    piece('coeur', G.coeur, M.coeur, 1.5);
    piece('yeux', G.yeux, M.yeux, 0);
    if (N.dos) piece('dos', G.corps, M.dos, 1);
    piece('gelee', G.corps, M.gelee, 2);
    const avecHalo = o.halo !== false;
    if (avecHalo) piece('halo', geometries(THREE, N.halo).corps, M.halo, 3);
    else M.halo.dispose();
    groupe.scale.setScalar(o.echelle || 1);
    const cligne = cligneur(o.graine || 7);
    const mats = Object.values(M);
    groupe.userData = {
      habit, niveau: niv, halo: avecHalo, matieres: M,
      // Le temps en secondes ; etat : { alpha, flash, runes (intensité), cligne (forcé) }.
      animer(t, etat) {
        const e = etat || {};
        const c = e.cligne != null ? e.cligne : cligne(t);
        for (const m of mats) { m.uniforms.uTemps.value = t; m.uniforms.uEtat.value.set(e.alpha != null ? e.alpha : 1, e.flash || 0, c, e.runes != null ? e.runes : 1); }
      },
      liberer() { for (const m of mats) m.dispose(); },
    };
    groupe.userData.animer(0);
    return groupe;
  }

  // Ce qu'un objet dessine : triangles et appels (un maillage instancié compte pour un appel).
  function compter(obj) {
    let triangles = 0, appels = 0;
    obj.traverse(m => {
      if (!m.isMesh || !m.visible) return;
      const g = m.geometry, n = g.index ? g.index.count : g.attributes.position.count;
      const k = m.isInstancedMesh ? m.count : 1;
      if (!k) return;
      triangles += n / 3 * k; appels += 1;
    });
    return { triangles: Math.round(triangles), appels };
  }

  // ----- Le jeu : un parc de Glyms instanciés -----
  // Une troupe par habit : cinq InstancedMesh (cœur, yeux, dos au bureau, gelée, halo) qui partagent
  // une matrice et deux attributs d'instance (le temps, l'état) ; triés de l'arrière vers l'avant
  // chaque image (dans l'ordre où IleFigures les pose). `prend(id)` dit si un monstre a son modèle.
  const MAX = 24;
  class Troupe {
    constructor(THREE, habit, opts) {
      this.THREE = THREE;
      const niv = this.niveau = opts.niveau, N = NIVEAUX[niv];
      const G = geometries(THREE, niv);
      const { M, tex } = matieres(THREE, habit, niv, {});
      this.M = M; this.octets = tex.octets;
      this.matrice = new THREE.InstancedBufferAttribute(new Float32Array(MAX * 16), 16);
      this.aTemps = new THREE.InstancedBufferAttribute(new Float32Array(MAX), 1);
      this.aEtat = new THREE.InstancedBufferAttribute(new Float32Array(MAX * 4), 4);
      for (const a of [this.matrice, this.aTemps, this.aEtat]) a.setUsage(THREE.DynamicDrawUsage);
      const inst = geo => {
        const g = new THREE.BufferGeometry();
        for (const [k, v] of Object.entries(geo.attributes)) g.setAttribute(k, v);
        g.setIndex(geo.index);
        g.setAttribute('aTemps', this.aTemps); g.setAttribute('aEtat', this.aEtat);
        return g;
      };
      this.geos = [];
      const maillage = (geo, mat, ordre) => {
        const g = inst(geo); this.geos.push(g);
        const m = new THREE.InstancedMesh(g, mat, MAX);
        m.instanceMatrix = this.matrice; m.count = 0; m.frustumCulled = false; m.renderOrder = ordre;
        return m;
      };
      this.groupe = new THREE.Group();
      this.parts = [maillage(G.coeur, M.coeur, 8.15), maillage(G.yeux, M.yeux, 8)];
      if (N.dos && opts.dos) this.parts.push(maillage(G.corps, M.dos, 8.1));
      this.parts.push(maillage(G.corps, M.gelee, 8.2));
      if (opts.halo) this.parts.push(maillage(geometries(THREE, N.halo).corps, M.halo, 8.3));
      this.groupe.add(...this.parts);
      this.n = 0;
    }
  }

  class Parc {
    // opts : { telephone, qualite ('haute' | 'moyenne' | 'basse'), mode ('modele' | 'tous'), hauteur (u) }.
    constructor(THREE, opts) {
      const o = opts || {};
      this.THREE = THREE;
      this.niveau = o.telephone ? 'telephone' : 'bureau';
      this.halo = o.qualite !== 'basse';
      this.dos = !o.telephone && o.qualite === 'haute';
      this.hauteur = o.hauteur || 1.2;
      this.ids = o.mode === 'tous' ? { glym_aqua: 'aqua', glym_ignis: 'ignis', glym_aer: 'aer', glym_terra: 'terra' } : { glym_aqua: 'aqua' };
      // Les autres monstres modelés par le code, chargés à côté (js/modele-lampignon.js,
      // js/modele-lampignard.js).
      if (typeof ModeleLampignon === 'object') this.ids.lampignon = 'lampignon';
      if (typeof ModeleLampignard === 'object') this.ids.lampignard = 'lampignard';
      this.troupes = {};
      this.etats = new Map();
      this.groupe = new THREE.Group();
      this.groupe.name = 'Glyms modelés';
      this._m = new THREE.Matrix4(); this._q = new THREE.Quaternion(); this._q2 = new THREE.Quaternion(); this._v = new THREE.Vector3(); this._s = new THREE.Vector3(); this._n = new THREE.Vector3(); this._up = new THREE.Vector3(0, 1, 0);
    }
    prend(id) { return !!this.ids[id]; }
    // Le rayon au sol (u) d'un monstre posé : la moitié de l'emprise vue de dessus.
    emprise(s) { const T = this.troupe(s.modele), C = T.cotes || COTES; return (s.scale || 1) * (T.hauteurJeu || this.hauteur) / C.hauteur * C.emprise / 2; }
    troupe(id) {
      const h = this.ids[id];
      if (!this.troupes[h]) {
        const Famille = { lampignon: typeof ModeleLampignon === 'object' && ModeleLampignon, lampignard: typeof ModeleLampignard === 'object' && ModeleLampignard }[h];
        this.troupes[h] = Famille ? new Famille.Troupe(this.THREE, { niveau: this.niveau, halo: this.halo, max: MAX }) : new Troupe(this.THREE, HABITS[h], { niveau: this.niveau, halo: this.halo, dos: this.dos });
        this.groupe.add(this.troupes[h].groupe);
      }
      return this.troupes[h];
    }
    debut(now, camera) {
      this.now = now; this.t = (now / 1000) % 3600; this.camera = camera;
      for (const T of Object.values(this.troupes)) { T.n = 0; if (T.debut) T.debut(this.t); }
      // Le champ de la caméra : un Glym qui en sort n'est pas dessiné (les instances ne sont pas
      // coupées par Three, frustumCulled étant faux).
      camera.updateMatrixWorld();
      this._pv = this._pv || new this.THREE.Matrix4();
      this._ch = this._ch || new this.THREE.Frustum();
      this._sp = this._sp || new this.THREE.Sphere();
      this._ch.setFromProjectionMatrix(this._pv.multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse));
    }
    // Les durées des gestes d'un monstre modelé qui en a (js/modele-lampignon.js : sort, lacher,
    // placement, coup, pousse, en ms ; lacher en fraction du sort), sinon null.
    durees(id) { return this.ids[id] ? this.troupe(id).durees || null : null; }
    // Un monstre (un sprite d'IleFigures : x, y, h, scale, facing, alpha, flash, bob, normale, combat,
    // modele, modeleCle ; geste { type, t } et vers { u, v }, le point qu'il regarde pendant un geste).
    // Rend vrai si le monstre est pris en charge (posé, ou hors du champ) : son panneau reste vide.
    poser(s) {
      const T = this.troupe(s.modele);
      if (T.n >= MAX) return false;
      // Effacé (une téléportation, l'attente de son arrivée) : un modèle ne s'efface pas, il disparaît.
      if (T.aGeste && s.alpha != null && s.alpha < 0.05) return true;
      const C = T.cotes || COTES, H = T.hauteurJeu || this.hauteur;
      const ech = (s.scale || 1) * H;
      this._sp.center.set(s.x, s.h + ech * 0.5, s.y); this._sp.radius = ech;
      if (!this._ch.intersectsSphere(this._sp)) return true;
      const i = T.n++;
      const cle = s.modeleCle || (s.modele + '|' + i);
      let e = this.etats.get(cle);
      if (!e) {
        let hsh = 0; for (let k = 0; k < cle.length; k++) hsh = (hsh * 31 + cle.charCodeAt(k)) | 0;
        e = { yaw: null, phase: (hsh >>> 0) % 1000 / 1000 * 6.283, cligne: cligneur(hsh), vu: 0 };
        this.etats.set(cle, e);
      }
      const dt = e.vu ? Math.min(0.1, Math.max(0, (this.now - e.vu) / 1000)) : 1;
      e.vu = this.now;
      const cam = this.camera.position;
      // Face à la caméra, un peu tourné vers sa marche (le sens du regard du panneau) ; pendant un
      // geste qui vise (un sort, un pas), tourné vers sa cible, plus vite.
      const vise = s.vers && Math.hypot(s.vers.u - s.x, s.vers.v - s.y) > 0.05;
      let yaw = vise ? Math.atan2(s.vers.u - s.x, s.vers.v - s.y) : Math.atan2(cam.x - s.x, cam.z - s.y) + (s.combat ? 0 : (typeof s.facing === 'number' ? Math.sign(s.facing) : 1) * 0.32);
      if (e.yaw == null) e.yaw = yaw;
      let d = yaw - e.yaw; d = Math.atan2(Math.sin(d), Math.cos(d));
      e.yaw += d * (1 - Math.exp(-dt * (vise ? 16 : 6)));
      const nrm = s.normale || [0, 1, 0];
      this._n.set(nrm[0] * 0.5, 1, nrm[2] * 0.5).normalize();
      this._q.setFromUnitVectors(this._up, this._n);
      this._q2.setFromAxisAngle(this._up, e.yaw);
      this._q.multiply(this._q2);
      const k = (s.scale || 1) * H / C.hauteur;
      // Le petit saut du panneau ; un modèle qui a ses gestes saute par le sien.
      const geste = T.aGeste && s.geste && T.codes[s.geste.type] ? s.geste : null;
      const lift = geste ? 0 : (s.bob || 0) / 42;
      const t = this.t + e.phase;
      // Un modèle sans nuanceur d'animation (le Lampignon) se dandine par sa matrice.
      const df = T.deformer ? T.deformer(t) : null;
      if (df) { this._q2.setFromAxisAngle(this._fz || (this._fz = new this.THREE.Vector3(0, 0, 1)), df.rz); this._q.multiply(this._q2); }
      this._m.compose(this._v.set(s.x, s.h + Math.max(0, lift) - 0.02, s.y), this._q, df ? this._s.set(k * df.sx, k * df.sy, k * df.sx) : this._s.set(k, k, k));
      this._m.toArray(T.matrice.array, i * 16);
      if (T.teinter) T.teinter(i, s.flash ? 0.8 : 0);
      T.aTemps.array[i] = t;
      T.aEtat.array.set([s.alpha == null ? 1 : s.alpha, s.flash ? 0.8 : 0, e.cligne(t), 1], i * 4);
      if (T.aGeste) T.aGeste.array.set(geste ? [T.codes[geste.type], Math.max(0, Math.min(1, geste.t)), 0, 0] : [0, 0, 0, 0], i * 4);
      return true;
    }
    fin() {
      for (const T of Object.values(this.troupes)) {
        for (const m of T.parts) m.count = T.n;
        T.matrice.needsUpdate = T.aTemps.needsUpdate = T.aEtat.needsUpdate = true;
        if (T.fin) T.fin();
      }
      if (this.etats.size > 64) for (const [k, e] of this.etats) if (this.now - e.vu > 5000) this.etats.delete(k);
    }
    stats() {
      const c = compter(this.groupe);
      let n = 0; for (const T of Object.values(this.troupes)) n += T.n;
      return { niveau: this.niveau, halo: this.halo, dos: this.dos, glyms: n, appels: c.appels, triangles: c.triangles, parGlym: n ? Math.round(c.triangles / n) : 0 };
    }
    octets() { let o = 0; for (const T of Object.values(this.troupes)) o += T.octets; return o; }
    liberer() {
      for (const T of Object.values(this.troupes)) { for (const g of T.geos) g.dispose(); for (const m of Object.values(T.M)) if (m && m.dispose) m.dispose(); }
      this.troupes = {}; this.etats.clear();
    }
  }

  return { COTES, NIVEAUX, HABITS, construire, compter, cartesRunes, geometries, Parc };
})();
