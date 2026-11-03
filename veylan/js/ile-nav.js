const Navigation = (() => {
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
      this.bloc = new Uint8Array(this.N);
      this.ouvert = new Uint8Array(this.N);
      this.dyn = new Uint16Array(this.N);
      this.barr = new Uint8Array(this.N);
      this.barrieres = [];
      this.disques = new Map();
      this.comp = new Int32Array(this.N);
      this.ign = new Uint32Array(this.N);
      this.ignG = 0;
      this.espaces = [new NavEspace(this.N), new NavEspace(this.N)];
      this.grossier = null;
      this.construire(opts.aires);
    }

    static get MAX() { return 120000; }
    static get LOIN() { return 60; }
    static get RELANCE() { return 4000; }

    static maintenant() { return typeof performance === 'object' && performance && typeof performance.now === 'function' ? performance.now() : Date.now(); }


    construire(airesPlans) {
      const T = this.T, { nx, ny, pas } = this, bloc = this.bloc;
      for (let j = 0; j < ny; j++) for (let i = 0; i < nx; i++) {
        const u = (i + 0.5) * pas, v = (j + 0.5) * pas, k = j * nx + i;
        if (T.pontA(u, v) >= 0) continue;
        if (T.videA(u, v) || T.profondeurA(u, v) > 0.6 || (!T.passageA(u, v) && T.penteA(u, v) > 0.84)) bloc[k] = 1;
      }
      for (const e of T.decor) if (e.bloque > 0) this.disque(e.u, e.v, e.bloque, k => { bloc[k] = 1; });
      for (const o of T.objets) for (const f of o.empreinte) this.forme(f, k => { bloc[k] = 1; });
      for (const p of T.pnjs) this.disque(p.u, p.v, 0.45, k => { bloc[k] = 1; });
      for (const l of T.lignes) {
        if (l.sorte !== 'muret' && l.sorte !== 'haie') continue;
        const ouvertes = (l.breches || []).concat((l.barrieres || []).map(b => b.plage));
        this.prochesLigne(l.pts, l.demi, (k, d, s) => { if (!ouvertes.some(p => s >= p[0] && s <= p[1])) bloc[k] = 1; });
        for (const b of l.barrieres || []) {
          const n = this.barrieres.push({ id: b.id, ligne: l.id, quete: b.quete, ouverte: false });
          this.prochesLigne(l.pts, l.demi + pas, (k, d, s) => { if (s >= b.plage[0] - pas && s <= b.plage[1] + pas) this.barr[k] = n; });
        }
      }
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
      const terrainSeul = (X, Y) => typeof IleTerrain === 'object' && IleTerrain.caseAire ? IleTerrain.caseAire(T, X, Y).c !== '.' : false;
      for (const a of airesPlans || T.aires) {
        if (!a.layout) continue;
        for (let cy = 0; cy < 15; cy++) for (let cx = 0; cx < 15; cx++) if ('#T'.includes(a.layout[cy][cx]) && !(a.layout[cy][cx] === '#' && terrainSeul(a.x + cx, a.y + cy))) {
          const i0 = Math.round((a.x + cx) / pas), j0 = Math.round((a.y + cy) / pas), n = Math.round(1 / pas);
          for (let j = j0; j < j0 + n; j++) for (let i = i0; i < i0 + n; i++) if (i >= 0 && j >= 0 && i < nx && j < ny) bloc[j * nx + i] = 1;
        }
      }
      for (let j = 1; j < ny - 1; j++) for (let i = 1; i < nx - 1; i++) {
        const k = j * nx + i;
        this.ouvert[k] = !bloc[k] && !bloc[k - 1] && !bloc[k + 1] && !bloc[k - nx] && !bloc[k + nx] ? 1 : 0;
      }
      this.composantes();
      this.preparerGrossier();
    }

    disque(cu, cv, r, fn) {
      const { nx, ny, pas } = this;
      const i0 = max(0, ceil((cu - r) / pas - 0.5)), i1 = min(nx - 1, floor((cu + r) / pas - 0.5));
      const j0 = max(0, ceil((cv - r) / pas - 0.5)), j1 = min(ny - 1, floor((cv + r) / pas - 0.5));
      for (let j = j0; j <= j1; j++) for (let i = i0; i <= i1; i++) {
        const dx = (i + 0.5) * pas - cu, dy = (j + 0.5) * pas - cv;
        if (dx * dx + dy * dy <= r * r) fn(j * nx + i);
      }
    }

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


    caseDe(u, v) {
      const i = floor(u / this.pas), j = floor(v / this.pas);
      return i < 0 || j < 0 || i >= this.nx || j >= this.ny ? -1 : j * this.nx + i;
    }
    centre(k) { return [(k % this.nx + 0.5) * this.pas, (((k / this.nx) | 0) + 0.5) * this.pas]; }
    passe(k) { return k >= 0 && this.ouvertStatique(k) && (!this.dyn[k] || (this.ign[k] === this.ignG && this.dyn[k] === 1)); }
    libre(u, v) { this.ignG++; return this.passe(this.caseDe(u, v)); }
    composanteA(u, v) { const k = this.caseDe(u, v); return k < 0 ? -1 : this.comp[k]; }

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

    voit(a, b) { this.ignG++; return this.voitSans(a, b); }
    voitSans(a, b) {
      const ax = a.x != null ? a.x : a[0], ay = a.y != null ? a.y : a[1], bx = b.x != null ? b.x : b[0], by = b.y != null ? b.y : b[1];
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


    chercher(a, b, opts) { return new NavRecherche(this, this.espaces[0], a, b, opts || {}); }
    chemin(a, b, opts) {
      const r = new NavRecherche(this, this.espaces[1], a, b, opts || {});
      return r.avancer(INF) === 'trouve' ? r.resultat : null;
    }


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
      for (let j = 0; j < ny; j++) for (let i = 0; i < nx; i++) {
        const k = j * nx + i, a = noeud[k];
        if (a < 0) continue;
        if ((i % K) === K - 1 && i + 1 < nx && noeud[k + 1] >= 0) lier(a, noeud[k + 1]);
        if ((j % K) === K - 1 && j + 1 < ny && noeud[k + nx] >= 0) lier(a, noeud[k + nx]);
      }
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

    marquerIgnore(id) {
      this.ignG++;
      if (id == null) return;
      for (const k of this.disques.get(id) || []) this.ign[k] = this.ignG;
    }
  }

  class NavEspace {
    constructor(N) {
      this.g = new Float32Array(N);
      this.etat = new Uint32Array(N);
      this.parent = new Int32Array(N);
      this.tas = new Int32Array(4096);
      this.prio = new Float32Array(4096);
      this.n = 0;
      this.G = 0;
      this.proprio = null;
      this.hg = null;
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
      this.ms = 0;
      this.guidee = false;
      this.demarrer();
    }

    demarrer() {
      const nav = this.nav, esp = this.esp;
      esp.proprio = this;
      esp.G++;
      esp.vider();
      this.explores = 0;
      this.marquer();
      let s = nav.caseDe(this.a.x, this.a.y);
      this.departExact = nav.passe(s);
      if (!this.departExact) { const p = nav.plusProche(this.a.x, this.a.y, 1.5); s = p ? nav.caseDe(p[0], p[1]) : -1; }
      if (s < 0) { this.etat = 'echec'; return; }
      let t = nav.caseDe(this.b.x, this.b.y);
      this.arriveeExacte = t >= 0 && nav.passe(t) && nav.comp[t] === nav.comp[s];
      if (!this.arriveeExacte) {
        const p = nav.plusProche(this.b.x, this.b.y, 12, { comp: nav.comp[s] }) || nav.plusProche(this.b.x, this.b.y, 12);
        t = p ? nav.caseDe(p[0], p[1]) : t;
      }
      this.s = s; this.t = t < 0 ? s : t;
      this.tx = this.t % nav.nx; this.ty = (this.t / nav.nx) | 0;
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

    h(k) {
      const nx = this.nav.nx, dx = abs(k % nx - this.tx), dy = abs(((k / nx) | 0) - this.ty);
      const o = dx + dy + (SQRT2 - 2) * (dx < dy ? dx : dy);
      if (!this.hg) return o;
      const n = this.noeud[k], d = n >= 0 ? this.hg[n] * 1.1 : -1;
      return d > o && d < INF ? d : o;
    }

    marquer() { this.nav.marquerIgnore(this.ignorer); this.ignG = this.nav.ignG; }

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
          if (d >= 4 && (!nav.passe(i + dx) || !nav.passe(j - dx))) continue;
          const ng = g[i] + C[d];
          if (etat[j] === G2 + 1 || (etat[j] === G2 && ng >= g[j])) continue;
          g[j] = ng; parent[j] = i; etat[j] = G2;
          esp.pousser(j, ng + this.h(j));
        }
      }
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

    lisser(fil) {
      const nav = this.nav, n = fil.length, out = [{ x: fil[0][0], y: fil[0][1] }];
      if (n < 2) return out;
      const P = k => fil[k < 0 ? 0 : k > n - 1 ? n - 1 : k];
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
