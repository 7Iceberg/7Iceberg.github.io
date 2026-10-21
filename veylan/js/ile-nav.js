// La navigation libre sur un plateau (docs/ILE-TECHNIQUE.md, 4.1 et 4.2) : une grille de 0,5 u
// tirée du terrain (js/ile-terrain.js), érodée du rayon d'un Veilleur, des couches dynamiques
// (disques des groupes, barrières), un A* à huit voisins découpé par images, le tirage du fil et
// un lissage de Catmull-Rom vérifié. Sans DOM, déterministe : aucune fonction transcendante, des
// tableaux typés réutilisés d'une recherche à l'autre, et un découpage compté en cases explorées,
// jamais en millisecondes (le résultat et l'image où il tombe ne dépendent pas de la machine).
// Les longs trajets (plus de 30 u à vol d'oiseau, ou un détour qui dépasse 4 000 cases) sont guidés
// par un étage grossier : les distances à la cible sur une grille de 2 u.
//
//   const N = new Navigation(T, { pas: 0.5, rayon: 0.35 });
//   N.libre(u, v)                       praticable pour le centre d'un Veilleur
//   N.plusProche(u, v, max)             [u, v] de la case praticable la plus proche, ou null
//   N.chercher(a, b, { max, ignorer })  une recherche découpable : .avancer(budgetCases) explore
//                                       au plus ce nombre de cases et rend 'en_calcul' | 'trouve'
//                                       | 'echec', puis .resultat ; .ms : le temps passé (mesure)
//   N.chemin(a, b, { max, ignorer })    la même, d'un coup : { points, partiel, cout } ou null
//   N.voit(a, b)                        ligne de vue sur la grille érodée
//   N.poser(id, u, v, r), N.retirer(id) couche des groupes
//   N.barriere(id, ouverte)             couche des barrières
// Les points sont des objets { x, y } (x = u, y = v) ou des couples [u, v].
const Navigation = (() => {
  // Les fonctions de Math liées une fois (sous Node, une globale lue dans un contexte vm coûte cher).
  const { floor, ceil, sqrt, abs, min, max, SQRT2 } = Math;
  const INF = Infinity;

  class Navigation {
    constructor(T, opts) {
      opts = opts || {};
      this.T = T;
      this.pas = opts.pas || 0.5;
      this.rayon = opts.rayon != null ? opts.rayon : 0.35;
      this.nx = Math.round(T.largeur / this.pas);
      this.ny = Math.round(T.hauteur / this.pas);
      this.N = this.nx * this.ny;
      this.bloc = new Uint8Array(this.N);     // statique, avant érosion
      this.ouvert = new Uint8Array(this.N);   // statique, érodé
      this.dyn = new Uint16Array(this.N);     // disques des groupes : un compte par case
      this.barr = new Uint8Array(this.N);     // barrière (indice + 1) qui bouche la case, fermée
      this.barrieres = [];                    // [{ id, ligne, quete, ouverte }]
      this.disques = new Map();               // id -> indices de cases
      this.comp = new Int32Array(this.N);     // composantes connexes (statique et barrières)
      this.ign = new Uint32Array(this.N);     // marques des cases à ignorer (disque d'un groupe)
      this.ignG = 0;
      this.espaces = [new NavEspace(this.N), new NavEspace(this.N)];   // découpé, d'un coup
      this.grossier = null;                   // l'étage grossier (refait après une barrière)
      this.construire(opts.aires);
    }

    // Cases explorées au plus par une recherche du Veilleur : de quoi contourner le ravin ou
    // l'escarpement d'un bout à l'autre de l'île (docs/ILE-TECHNIQUE.md, 4.2).
    static get MAX() { return 120000; }
    // Au-delà de cette distance à vol d'oiseau (en cases de 0,5 u), l'étage grossier guide l'A*
    // dès le départ ; une recherche plus courte qui a déjà exploré RELANCE cases sans aboutir (une
    // haie fermée entre deux points voisins) repart guidée par lui.
    static get LOIN() { return 60; }
    static get RELANCE() { return 4000; }

    static maintenant() { return typeof performance === 'object' && performance && typeof performance.now === 'function' ? performance.now() : Date.now(); }

    // ----- Construction de la grille -----

    construire(airesPlans) {
      const T = this.T, { nx, ny, pas } = this, bloc = this.bloc;
      // Le sol : le vide, l'eau de plus de 0,6 u, les pentes de plus de 40° (sauf escaliers et gués) ;
      // le tablier d'un pont est toujours praticable.
      for (let j = 0; j < ny; j++) for (let i = 0; i < nx; i++) {
        const u = (i + 0.5) * pas, v = (j + 0.5) * pas, k = j * nx + i;
        if (T.pontA(u, v) >= 0) continue;
        if (T.videA(u, v) || T.profondeurA(u, v) > 0.6 || (!T.passageA(u, v) && T.penteA(u, v) > 0.84)) bloc[k] = 1;
      }
      // Les empreintes : décor, objets posés, PNJ.
      for (const e of T.decor) if (e.bloque > 0) this.disque(e.u, e.v, e.bloque, k => { bloc[k] = 1; });
      for (const o of T.objets) for (const f of o.empreinte) this.forme(f, k => { bloc[k] = 1; });
      for (const p of T.pnjs) this.disque(p.u, p.v, 0.45, k => { bloc[k] = 1; });
      // Murets et haies : 0,8 u d'épaisseur, sauf les brèches ; les barrières vont dans leur couche.
      for (const l of T.lignes) {
        if (l.sorte !== 'muret' && l.sorte !== 'haie') continue;
        const ouvertes = (l.breches || []).concat((l.barrieres || []).map(b => b.plage));
        this.prochesLigne(l.pts, l.demi, (k, d, s) => { if (!ouvertes.some(p => s >= p[0] && s <= p[1])) bloc[k] = 1; });
        for (const b of l.barrieres || []) {
          const n = this.barrieres.push({ id: b.id, ligne: l.id, quete: b.quete, ouverte: false });
          this.prochesLigne(l.pts, l.demi + pas, (k, d, s) => { if (s >= b.plage[0] - pas && s <= b.plage[1] + pas) this.barr[k] = n; });
        }
      }
      // Les faces des escarpements (IleTerrain.facesEscarpements, dessinées par js/ile-sol.js sur le
      // tracé lissé, qui s'écarte du tracé brut des hauteurs aux coins) : la bande qu'elles couvrent est
      // fermée, 1,7 u du côté bas (la face bombe de 0,55 u, les sommets du treillis y sont ramenés
      // jusqu'à 1,6 u) et 0,8 u du côté haut (la lèvre), sauf aux passages (escaliers). Sans cela, le
      // Veilleur marchait dans le mur dessiné (revue finale, Porte des Sources).
      if (typeof IleTerrain === 'object' && IleTerrain.facesEscarpements) for (const f of IleTerrain.facesEscarpements(T)) {
        const E = f.ech, Lg = f.cum[f.cum.length - 1] || 1e-6;
        this.prochesLigne(f.pts, 1.7, (k, d, s) => {
          const e = E[min(E.length - 1, max(0, Math.round(s / Lg * (E.length - 1))))];
          if (!e.vrai) return;
          const x = (k % nx + 0.5) * pas, y = (((k / nx) | 0) + 0.5) * pas;
          if (T.passageA(x, y)) return;
          const enHaut = ((x - e.u) * e.nx + (y - e.v) * e.ny) * e.cote > 0;
          if (enHaut ? d < 0.8 : d < 1.7) bloc[k] = 1;
        });
      }
      // Les aires cuites (étape b) : les obstacles que leur style pose (un `T`, un `#` sur du sol)
      // bloquent la navigation, case entière. Ce que le terrain impose (le vide, l'eau, un muret, un
      // objet : IleTerrain.caseAire) y est déjà, à sa juste mesure : un pont, un gué ou une brèche
      // qui toucherait une aire reste praticable.
      const terrainSeul = (X, Y) => typeof IleTerrain === 'object' && IleTerrain.caseAire ? IleTerrain.caseAire(T, X, Y).c !== '.' : false;
      for (const a of airesPlans || T.aires) {
        if (!a.layout) continue;
        for (let cy = 0; cy < 15; cy++) for (let cx = 0; cx < 15; cx++) if ('#T'.includes(a.layout[cy][cx]) && !(a.layout[cy][cx] === '#' && terrainSeul(a.x + cx, a.y + cy))) {
          const i0 = Math.round((a.x + cx) / pas), j0 = Math.round((a.y + cy) / pas), n = Math.round(1 / pas);
          for (let j = j0; j < j0 + n; j++) for (let i = i0; i < i0 + n; i++) if (i >= 0 && j >= 0 && i < nx && j < ny) bloc[j * nx + i] = 1;
        }
      }
      // Érosion par le rayon d'un Veilleur : une case est ouverte si elle et ses quatre voisines sont
      // libres. Les bords de la grille sont fermés.
      for (let j = 1; j < ny - 1; j++) for (let i = 1; i < nx - 1; i++) {
        const k = j * nx + i;
        this.ouvert[k] = !bloc[k] && !bloc[k - 1] && !bloc[k + 1] && !bloc[k - nx] && !bloc[k + nx] ? 1 : 0;
      }
      this.composantes();
      this.preparerGrossier();
    }

    // Les cases dont le centre est dans un disque.
    disque(cu, cv, r, fn) {
      const { nx, ny, pas } = this;
      const i0 = max(0, ceil((cu - r) / pas - 0.5)), i1 = min(nx - 1, floor((cu + r) / pas - 0.5));
      const j0 = max(0, ceil((cv - r) / pas - 0.5)), j1 = min(ny - 1, floor((cv + r) / pas - 0.5));
      for (let j = j0; j <= j1; j++) for (let i = i0; i <= i1; i++) {
        const dx = (i + 0.5) * pas - cu, dy = (j + 0.5) * pas - cv;
        if (dx * dx + dy * dy <= r * r) fn(j * nx + i);
      }
    }

    // Les cases dans une forme d'empreinte (cercle, rectangle tourné, anneau).
    forme(f, fn) {
      const { nx, ny, pas } = this;
      if (f.anneau) return this.disque(f.u, f.v, f.r2, k => { const i = k % nx, j = (k / nx) | 0, dx = (i + 0.5) * pas - f.u, dy = (j + 0.5) * pas - f.v; if (dx * dx + dy * dy >= f.r1 * f.r1) fn(k); });
      if (!f.rect) return this.disque(f.u, f.v, f.r, fn);
      const R = abs(f.l * f.c) + abs(f.p * f.s) + 0.01, Q = abs(f.l * f.s) + abs(f.p * f.c) + 0.01;
      const i0 = max(0, ceil((f.u - R) / pas - 0.5)), i1 = min(nx - 1, floor((f.u + R) / pas - 0.5));
      const j0 = max(0, ceil((f.v - Q) / pas - 0.5)), j1 = min(ny - 1, floor((f.v + Q) / pas - 0.5));
      for (let j = j0; j <= j1; j++) for (let i = i0; i <= i1; i++) {
        const dx = (i + 0.5) * pas - f.u, dy = (j + 0.5) * pas - f.v;
        const a = dx * f.c + dy * f.s, b = -dx * f.s + dy * f.c;
        if (a >= -f.l && a <= f.l && b >= -f.p && b <= f.p) fn(j * nx + i);
      }
    }

    // Les cases à moins de `rayon` d'une polyligne : fn(case, distance, abscisse).
    prochesLigne(pts, rayon, fn) {
      const { nx, ny, pas } = this;
      const cum = [0];
      for (let k = 1; k < pts.length; k++) { const dx = pts[k][0] - pts[k - 1][0], dy = pts[k][1] - pts[k - 1][1]; cum.push(cum[k - 1] + sqrt(dx * dx + dy * dy)); }
      const best = new Map();
      for (let k = 0; k + 1 < pts.length; k++) {
        const ax = pts[k][0], ay = pts[k][1], bx = pts[k + 1][0], by = pts[k + 1][1];
        const sx = bx - ax, sy = by - ay, l2 = sx * sx + sy * sy;
        const i0 = max(0, ceil((min(ax, bx) - rayon) / pas - 0.5)), i1 = min(nx - 1, floor((max(ax, bx) + rayon) / pas - 0.5));
        const j0 = max(0, ceil((min(ay, by) - rayon) / pas - 0.5)), j1 = min(ny - 1, floor((max(ay, by) + rayon) / pas - 0.5));
        for (let j = j0; j <= j1; j++) for (let i = i0; i <= i1; i++) {
          const x = (i + 0.5) * pas, y = (j + 0.5) * pas;
          let t = l2 > 0 ? ((x - ax) * sx + (y - ay) * sy) / l2 : 0;
          t = t < 0 ? 0 : t > 1 ? 1 : t;
          const px = ax + sx * t - x, py = ay + sy * t - y, d2 = px * px + py * py;
          if (d2 > rayon * rayon) continue;
          const c = j * nx + i, cur = best.get(c);
          if (!cur || d2 < cur[0]) best.set(c, [d2, cum[k] + (cum[k + 1] - cum[k]) * t]);
        }
      }
      for (const c of [...best.keys()].sort((a, b) => a - b)) { const e = best.get(c); fn(c, sqrt(e[0]), e[1]); }
    }

    // Composantes connexes de la grille statique, barrières comprises (les groupes n'y comptent pas).
    composantes() {
      const { nx, N } = this, comp = this.comp, file = new Int32Array(N);
      comp.fill(-1);
      let n = 0;
      for (let s = 0; s < N; s++) {
        if (comp[s] !== -1 || !this.ouvertStatique(s)) continue;
        let a = 0, b = 0;
        file[b++] = s; comp[s] = n;
        while (a < b) {
          const k = file[a++];
          for (const q of [k - 1, k + 1, k - nx, k + nx]) if (q >= 0 && q < N && comp[q] === -1 && this.ouvertStatique(q)) { comp[q] = n; file[b++] = q; }
        }
        n++;
      }
      this.nbComposantes = n;
    }

    ouvertStatique(k) {
      if (!this.ouvert[k]) return false;
      const b = this.barr[k];
      return !b || this.barrieres[b - 1].ouverte;
    }

    // ----- Lectures -----

    caseDe(u, v) {
      const i = floor(u / this.pas), j = floor(v / this.pas);
      return i < 0 || j < 0 || i >= this.nx || j >= this.ny ? -1 : j * this.nx + i;
    }
    centre(k) { return [(k % this.nx + 0.5) * this.pas, (((k / this.nx) | 0) + 0.5) * this.pas]; }
    passe(k) { return k >= 0 && this.ouvertStatique(k) && (!this.dyn[k] || (this.ign[k] === this.ignG && this.dyn[k] === 1)); }
    libre(u, v) { this.ignG++; return this.passe(this.caseDe(u, v)); }
    composanteA(u, v) { const k = this.caseDe(u, v); return k < 0 ? -1 : this.comp[k]; }

    // La case praticable la plus proche d'un point, à `max` u au plus : [u, v] de son centre, ou
    // null. `opts.comp` restreint à une composante ; `opts.statique` ignore les groupes.
    plusProche(u, v, rayonMax, opts) {
      opts = opts || {};
      if (!Number.isFinite(u) || !Number.isFinite(v)) return null;
      const max2 = rayonMax == null ? 12 : rayonMax;
      const { nx, ny, pas } = this;
      const ci = floor(u / pas), cj = floor(v / pas), R = ceil(max2 / pas) + 1;
      let best = -1, bd = INF;
      for (let j = max(0, cj - R); j <= min(ny - 1, cj + R); j++) for (let i = max(0, ci - R); i <= min(nx - 1, ci + R); i++) {
        const k = j * nx + i;
        if (opts.statique ? !this.ouvertStatique(k) : !this.passe(k)) continue;
        if (opts.comp != null && this.comp[k] !== opts.comp) continue;
        const dx = (i + 0.5) * pas - u, dy = (j + 0.5) * pas - v, d2 = dx * dx + dy * dy;
        if (d2 <= max2 * max2 && d2 < bd) { bd = d2; best = k; }
      }
      return best < 0 ? null : this.centre(best);
    }

    // Ligne de vue sur la grille érodée, par pas d'un quart de case.
    voit(a, b) { this.ignG++; return this.voitSans(a, b); }
    voitSans(a, b) {
      const ax = a.x != null ? a.x : a[0], ay = a.y != null ? a.y : a[1], bx = b.x != null ? b.x : b[0], by = b.y != null ? b.y : b[1];
      // Parcours exact des cases que traverse le segment (Amanatides et Woo) ; un passage par un
      // coin touche aussi les deux cases qui le bordent.
      const pas = this.pas, nx = this.nx, ny = this.ny;
      let i = floor(ax / pas), j = floor(ay / pas);
      const i1 = floor(bx / pas), j1 = floor(by / pas);
      const ok = (ci, cj) => ci >= 0 && cj >= 0 && ci < nx && cj < ny && this.passe(cj * nx + ci);
      if (!ok(i, j)) return false;
      const dx = bx - ax, dy = by - ay;
      const sx = dx > 0 ? 1 : dx < 0 ? -1 : 0, sy = dy > 0 ? 1 : dy < 0 ? -1 : 0;
      const adx = abs(dx), ady = abs(dy);
      let tx = sx ? (sx > 0 ? (i + 1) * pas - ax : ax - i * pas) / adx : INF;
      let ty = sy ? (sy > 0 ? (j + 1) * pas - ay : ay - j * pas) / ady : INF;
      const ddx = sx ? pas / adx : INF, ddy = sy ? pas / ady : INF;
      const eps = 1e-9;
      for (let garde = 0; (i !== i1 || j !== j1) && garde < 100000; garde++) {
        if (tx > 1 + eps && ty > 1 + eps) break;
        if (tx < ty - eps) { i += sx; tx += ddx; }
        else if (ty < tx - eps) { j += sy; ty += ddy; }
        else {
          if (!ok(i + sx, j) || !ok(i, j + sy)) return false;
          i += sx; j += sy; tx += ddx; ty += ddy;
        }
        if (!ok(i, j)) return false;
      }
      return true;
    }

    // ----- Couches dynamiques -----

    poser(id, u, v, r) {
      this.retirer(id);
      const liste = [];
      this.disque(u, v, (r == null ? 0.8 : r) + this.rayon, k => { this.dyn[k]++; liste.push(k); });
      this.disques.set(id, liste);
    }
    retirer(id) {
      const liste = this.disques.get(id);
      if (!liste) return;
      for (const k of liste) if (this.dyn[k]) this.dyn[k]--;
      this.disques.delete(id);
    }
    vider() { this.dyn.fill(0); this.disques.clear(); }
    barriere(id, ouverte) {
      const b = this.barrieres.find(x => x.id === id);
      if (!b || b.ouverte === !!ouverte) return false;
      b.ouverte = !!ouverte;
      this.composantes();
      this.grossier = null;
      return true;
    }

    // ----- Recherches -----

    chercher(a, b, opts) { return new NavRecherche(this, this.espaces[0], a, b, opts || {}); }
    chemin(a, b, opts) {
      const r = new NavRecherche(this, this.espaces[1], a, b, opts || {});
      return r.avancer(INF) === 'trouve' ? r.resultat : null;
    }

    // ----- L'étage grossier -----

    // Des blocs de 2 u (4 × 4 cases fines). Chaque morceau d'un seul tenant des cases ouvertes d'un
    // bloc est un nœud (une haie qui coupe un bloc en fait deux nœuds : le graphe ne la traverse
    // pas). Deux nœuds de blocs voisins sont reliés si deux de leurs cases se touchent par un bord ;
    // deux nœuds de blocs en diagonale, si un nœud d'un bloc d'angle les relie. Le coût d'un lien est
    // la distance entre les centres des nœuds. Tout chemin fin a son image dans ce graphe, à peine
    // plus longue ou plus courte : la distance grossière guide l'A* (voir h).
    preparerGrossier() {
      if (this.grossier) return this.grossier;
      const K = 4, { nx, ny, N } = this, gx = ceil(nx / K), gy = ceil(ny / K);
      const noeud = new Int32Array(N).fill(-1);
      const cx = [], cy = [], bloc = [], pile = [];
      for (let bj = 0; bj < gy; bj++) for (let bi = 0; bi < gx; bi++) {
        const i0 = bi * K, j0 = bj * K, i1 = min(nx, i0 + K), j1 = min(ny, j0 + K);
        for (let j = j0; j < j1; j++) for (let i = i0; i < i1; i++) {
          const k0 = j * nx + i;
          if (noeud[k0] !== -1 || !this.ouvertStatique(k0)) continue;
          const n = cx.length;
          let su = 0, sv = 0, m = 0;
          noeud[k0] = n; pile.push(k0);
          while (pile.length) {
            const k = pile.pop(), ki = k % nx, kj = (k / nx) | 0;
            su += ki; sv += kj; m++;
            if (ki + 1 < i1 && noeud[k + 1] === -1 && this.ouvertStatique(k + 1)) { noeud[k + 1] = n; pile.push(k + 1); }
            if (ki > i0 && noeud[k - 1] === -1 && this.ouvertStatique(k - 1)) { noeud[k - 1] = n; pile.push(k - 1); }
            if (kj + 1 < j1 && noeud[k + nx] === -1 && this.ouvertStatique(k + nx)) { noeud[k + nx] = n; pile.push(k + nx); }
            if (kj > j0 && noeud[k - nx] === -1 && this.ouvertStatique(k - nx)) { noeud[k - nx] = n; pile.push(k - nx); }
          }
          cx.push(su / m); cy.push(sv / m); bloc.push(bj * gx + bi);
        }
      }
      const NN = cx.length, voisins = [];
      for (let n = 0; n < NN; n++) voisins.push([]);
      const lier = (a, b) => { if (a !== b && !voisins[a].includes(b)) { voisins[a].push(b); voisins[b].push(a); } };
      // Liens orthogonaux : deux cases ouvertes de part et d'autre d'un bord de bloc.
      for (let j = 0; j < ny; j++) for (let i = 0; i < nx; i++) {
        const k = j * nx + i, a = noeud[k];
        if (a < 0) continue;
        if ((i % K) === K - 1 && i + 1 < nx && noeud[k + 1] >= 0) lier(a, noeud[k + 1]);
        if ((j % K) === K - 1 && j + 1 < ny && noeud[k + nx] >= 0) lier(a, noeud[k + nx]);
      }
      // Liens diagonaux : par un nœud d'un bloc d'angle.
      const diag = [];
      for (let a = 0; a < NN; a++) {
        const ba = bloc[a], ai = ba % gx, aj = (ba / gx) | 0;
        for (const b of voisins[a]) for (const d of voisins[b]) {
          if (d <= a) continue;
          const bd = bloc[d], di = bd % gx, dj = (bd / gx) | 0;
          if (abs(di - ai) === 1 && abs(dj - aj) === 1) diag.push(a, d);
        }
      }
      for (let q = 0; q < diag.length; q += 2) lier(diag[q], diag[q + 1]);
      // En tableaux plats : début des voisins de chaque nœud, voisins, coûts (en cases fines).
      const deb = new Int32Array(NN + 1);
      for (let n = 0; n < NN; n++) deb[n + 1] = deb[n] + voisins[n].length;
      const vois = new Int32Array(deb[NN]), couts = new Float32Array(deb[NN]);
      for (let n = 0; n < NN; n++) voisins[n].forEach((b, q) => {
        const dx = cx[b] - cx[n], dy = cy[b] - cy[n];
        vois[deb[n] + q] = b; couts[deb[n] + q] = sqrt(dx * dx + dy * dy);
      });
      this.grossier = { K, NN, noeud, deb, vois, couts, esp: new NavEspace(NN) };
      return this.grossier;
    }

    // Les distances grossières (en cases fines) de chaque nœud à celui de la case fine t, écrites
    // dans d ; Infinity hors d'atteinte. Rend d, ou null si t n'est pas une case ouverte.
    distancesGrossieres(t, d) {
      const Gr = this.preparerGrossier(), { noeud, deb, vois, couts } = Gr, E = Gr.esp;
      const src = t >= 0 ? noeud[t] : -1;
      if (src < 0) return null;
      d.fill(INF);
      E.G++; E.vider();
      const G2 = 2 * E.G, etat = E.etat;
      d[src] = 0; etat[src] = G2; E.pousser(src, 0);
      while (E.n) {
        const c = E.tirer();
        if (etat[c] === G2 + 1) continue;
        etat[c] = G2 + 1;
        const dc = d[c];
        for (let q = deb[c]; q < deb[c + 1]; q++) {
          const j = vois[q], nd = dc + couts[q];
          if (etat[j] === G2 + 1 || (etat[j] === G2 && nd >= d[j])) continue;
          d[j] = nd; etat[j] = G2; E.pousser(j, nd);
        }
      }
      return d;
    }

    // Marque les cases du disque à ignorer (le groupe qui cherche son propre chemin) d'une valeur
    // neuve : le compteur ne recule jamais, une marque ancienne ne vaut plus rien.
    marquerIgnore(id) {
      this.ignG++;
      if (id == null) return;
      for (const k of this.disques.get(id) || []) this.ign[k] = this.ignG;
    }
  }

  // Un espace de travail de l'A* : tableaux typés réutilisés, remis à zéro par un compteur.
  class NavEspace {
    constructor(N) {
      this.g = new Float32Array(N);
      this.etat = new Uint32Array(N);    // 2G + 0 : vue ; 2G + 1 : fermée
      this.parent = new Int32Array(N);
      this.tas = new Int32Array(4096);
      this.prio = new Float32Array(4096);
      this.n = 0;
      this.G = 0;
      this.proprio = null;
      this.hg = null;                    // les distances grossières de la recherche propriétaire
    }
    vider() { this.n = 0; }
    pousser(i, f) {
      if (this.n >= this.tas.length) {
        const t = new Int32Array(this.tas.length * 2), p = new Float32Array(this.tas.length * 2);
        t.set(this.tas); p.set(this.prio); this.tas = t; this.prio = p;
      }
      const tas = this.tas, prio = this.prio;
      let k = this.n++;
      while (k > 0) { const q = (k - 1) >> 1; if (prio[q] <= f) break; tas[k] = tas[q]; prio[k] = prio[q]; k = q; }
      tas[k] = i; prio[k] = f;
    }
    tirer() {
      const tas = this.tas, prio = this.prio, top = tas[0];
      const n = --this.n, li = tas[n], lf = prio[n];
      let k = 0;
      for (;;) {
        let c = 2 * k + 1;
        if (c >= n) break;
        if (c + 1 < n && prio[c + 1] < prio[c]) c++;
        if (prio[c] >= lf) break;
        tas[k] = tas[c]; prio[k] = prio[c]; k = c;
      }
      tas[k] = li; prio[k] = lf;
      return top;
    }
  }

  // Une recherche A* à huit voisins, sans couper les coins, heuristique octile, découpable.
  class NavRecherche {
    constructor(nav, esp, a, b, opts) {
      this.nav = nav; this.esp = esp;
      this.a = { x: a.x != null ? a.x : a[0], y: a.y != null ? a.y : a[1] };
      this.b = { x: b.x != null ? b.x : b[0], y: b.y != null ? b.y : b[1] };
      this.max = opts.max || Navigation.MAX;
      this.ignorer = opts.ignorer != null ? opts.ignorer : null;
      this.etat = 'en_calcul';
      this.resultat = null;
      this.explores = 0;
      this.ms = 0;                       // temps passé, pour la mesure seulement
      this.guidee = false;               // relancée avec l'étage grossier
      this.demarrer();
    }

    demarrer() {
      const nav = this.nav, esp = this.esp;
      esp.proprio = this;
      esp.G++;
      esp.vider();
      this.explores = 0;
      this.marquer();
      // Départ : la case du point, ou la plus proche praticable à 1,5 u.
      let s = nav.caseDe(this.a.x, this.a.y);
      this.departExact = nav.passe(s);
      if (!this.departExact) { const p = nav.plusProche(this.a.x, this.a.y, 1.5); s = p ? nav.caseDe(p[0], p[1]) : -1; }
      if (s < 0) { this.etat = 'echec'; return; }
      // Arrivée : la case du point, ou la plus proche praticable dans la composante du départ.
      let t = nav.caseDe(this.b.x, this.b.y);
      this.arriveeExacte = t >= 0 && nav.passe(t) && nav.comp[t] === nav.comp[s];
      if (!this.arriveeExacte) {
        const p = nav.plusProche(this.b.x, this.b.y, 12, { comp: nav.comp[s] }) || nav.plusProche(this.b.x, this.b.y, 12);
        t = p ? nav.caseDe(p[0], p[1]) : t;
      }
      this.s = s; this.t = t < 0 ? s : t;
      this.tx = this.t % nav.nx; this.ty = (this.t / nav.nx) | 0;
      // Un long trajet : les distances grossières à la cible guident l'heuristique.
      this.hg = null;
      if (this.guidee || this.h(s) > Navigation.LOIN) {
        const Gr = nav.preparerGrossier();
        if (!esp.hg || esp.hg.length !== Gr.NN) esp.hg = new Float32Array(Gr.NN);
        this.hg = nav.distancesGrossieres(this.t, esp.hg);
        this.noeud = Gr.noeud;
      }
      esp.g[s] = 0; esp.etat[s] = 2 * esp.G; esp.parent[s] = -1;
      esp.pousser(s, this.h(s));
      this.meilleur = s; this.hMin = this.h(s); this.gMeilleur = 0;
    }

    // Heuristique octile ; sur un long trajet, la distance grossière du nœud de la case, pondérée
    // de 1,1, si elle est plus grande. Sans poids, l'A* explorait une bande de 20 cases de part et
    // d'autre du chemin (la distance grossière sous-estime la vraie de 4 à 7 %) ; avec, le chemin
    // reste à 10 % au plus du plus court, 1 à 2 % après le tirage du fil, et 4 à 8 fois moins de
    // cases sont explorées.
    h(k) {
      const nx = this.nav.nx, dx = abs(k % nx - this.tx), dy = abs(((k / nx) | 0) - this.ty);
      const o = dx + dy + (SQRT2 - 2) * (dx < dy ? dx : dy);
      if (!this.hg) return o;
      const n = this.noeud[k], d = n >= 0 ? this.hg[n] * 1.1 : -1;
      return d > o && d < INF ? d : o;
    }

    // Les cases du disque à ignorer, marquées d'une valeur neuve (à chaque reprise : entre deux
    // images, d'autres recherches ont pu marquer d'autres disques).
    marquer() { this.nav.marquerIgnore(this.ignorer); this.ignG = this.nav.ignG; }

    // Explore au plus `budget` cases (Infinity : jusqu'au bout). Le découpage ne dépend que des
    // données : la même recherche finit à la même reprise sur toutes les machines.
    avancer(budget) {
      if (this.etat !== 'en_calcul') return this.etat;
      const t0 = Navigation.maintenant();
      const r = this.explorer(budget == null ? INF : budget);
      this.ms += Navigation.maintenant() - t0;
      return r;
    }

    explorer(budget) {
      const nav = this.nav, esp = this.esp, nx = nav.nx, N = nav.N;
      if (esp.proprio !== this) this.demarrer();
      if (this.etat !== 'en_calcul') return this.etat;
      this.marquer();
      const G2 = 2 * esp.G, g = esp.g, etat = esp.etat, parent = esp.parent;
      const D = [1, -1, nx, -nx, nx + 1, nx - 1, -nx + 1, -nx - 1];
      const C = [1, 1, 1, 1, SQRT2, SQRT2, SQRT2, SQRT2];
      let faites = 0;
      while (esp.n) {
        if (faites >= budget) return 'en_calcul';
        const i = esp.tirer();
        if (etat[i] === G2 + 1) continue;
        etat[i] = G2 + 1;
        if (i === this.t) return this.finir(i, false);
        faites++;
        if (++this.explores > this.max) break;
        if (!this.hg && this.explores === Navigation.RELANCE && this.max > Navigation.RELANCE) {
          // Les cases déjà explorées restent comptées (mesure et plafond).
          this.guidee = true;
          this.demarrer();
          this.explores = Navigation.RELANCE;
          return this.explorer(budget - faites);
        }
        const hi = this.h(i);
        if (hi < this.hMin || (hi === this.hMin && g[i] < this.gMeilleur)) { this.hMin = hi; this.meilleur = i; this.gMeilleur = g[i]; }
        const x = i % nx;
        for (let d = 0; d < 8; d++) {
          const dx = d === 0 || d === 4 || d === 6 ? 1 : d === 1 || d === 5 || d === 7 ? -1 : 0;
          if ((dx === 1 && x === nx - 1) || (dx === -1 && x === 0)) continue;
          const j = i + D[d];
          if (j < 0 || j >= N || !nav.passe(j)) continue;
          // Pas de coin coupé : un pas en diagonale demande les deux cases orthogonales.
          if (d >= 4 && (!nav.passe(i + dx) || !nav.passe(j - dx))) continue;
          // Une case fermée ne se rouvre pas : l'heuristique est cohérente (à l'arrondi près des
          // flottants de 32 bits, qui faisait sinon réexplorer des milliers de cases).
          const ng = g[i] + C[d];
          if (etat[j] === G2 + 1 || (etat[j] === G2 && ng >= g[j])) continue;
          g[j] = ng; parent[j] = i; etat[j] = G2;
          esp.pousser(j, ng + this.h(j));
        }
      }
      // Pas de chemin entier : la case explorée la plus proche de la cible (chemin partiel).
      if (this.meilleur === this.s) { this.etat = 'echec'; return this.etat; }
      return this.finir(this.meilleur, true);
    }

    finir(c, partiel) {
      const nav = this.nav, esp = this.esp;
      const cases = [];
      for (let k = c; k !== -1; k = esp.parent[k]) cases.push(k);
      cases.reverse();
      const pts = cases.map(k => nav.centre(k));
      if (this.departExact) pts[0] = [this.a.x, this.a.y];
      if (!partiel && this.arriveeExacte) pts[pts.length - 1] = [this.b.x, this.b.y];
      const fil = this.tirerFil(pts);
      const points = this.lisser(fil);
      this.resultat = { points, partiel, cout: esp.g[c] * nav.pas, explores: this.explores, grossier: !!this.hg, fil: fil.map(p => ({ x: p[0], y: p[1] })) };
      this.etat = 'trouve';
      return this.etat;
    }

    // Tirage du fil : de chaque point, le plus lointain qu'on voit (à 32 u au plus devant).
    tirerFil(pts) {
      const nav = this.nav, out = [pts[0]], K = 64;
      let i = 0;
      while (i < pts.length - 1) {
        let j = min(pts.length - 1, i + K);
        while (j > i + 1 && !nav.voitSans(pts[i], pts[j])) j--;
        out.push(pts[j]);
        i = j;
      }
      return out;
    }

    // Lissage de Catmull-Rom (centripète : la courbe ne dépasse pas les coins et ne boucle pas)
    // tous les 0,5 u ; un morceau qui toucherait une case fermée fait garder le segment droit.
    lisser(fil) {
      const nav = this.nav, n = fil.length, out = [{ x: fil[0][0], y: fil[0][1] }];
      if (n < 2) return out;
      const P = k => fil[k < 0 ? 0 : k > n - 1 ? n - 1 : k];
      // Intervalle de nœuds : racine de la distance (au moins un millième, pour les points doublés).
      const pasNoeud = (a, b) => max(1e-3, sqrt(sqrt((b[0] - a[0]) * (b[0] - a[0]) + (b[1] - a[1]) * (b[1] - a[1]))));
      for (let k = 0; k < n - 1; k++) {
        const p0 = P(k - 1), p1 = P(k), p2 = P(k + 1), p3 = P(k + 2);
        const dx = p2[0] - p1[0], dy = p2[1] - p1[1], L = sqrt(dx * dx + dy * dy);
        const m = max(1, ceil(L / 0.5));
        const t0 = 0, t1 = t0 + pasNoeud(p0, p1), t2 = t1 + pasNoeud(p1, p2), t3 = t2 + pasNoeud(p2, p3);
        const courbe = [];
        let ok = true, prec = p1;
        for (let q = 1; q <= m; q++) {
          let x, y;
          if (q === m) { x = p2[0]; y = p2[1]; }
          else {
            const t = t1 + (t2 - t1) * q / m;
            const lerp = (a, b, ta, tb) => { const f = (t - ta) / (tb - ta); return [a[0] + (b[0] - a[0]) * f, a[1] + (b[1] - a[1]) * f]; };
            const A1 = lerp(p0, p1, t0, t1), A2 = lerp(p1, p2, t1, t2), A3 = lerp(p2, p3, t2, t3);
            const B1 = lerp(A1, A2, t0, t2), B2 = lerp(A2, A3, t1, t3);
            const C = lerp(B1, B2, t1, t2);
            x = C[0]; y = C[1];
          }
          if (!nav.voitSans(prec, [x, y])) { ok = false; break; }
          courbe.push({ x, y });
          prec = [x, y];
        }
        if (ok) for (const p of courbe) out.push(p);
        else out.push({ x: p2[0], y: p2[1] });
        out[out.length - 1] = { x: p2[0], y: p2[1] };
      }
      return out;
    }
  }

  return Navigation;
})();
