// Le décor de l'île d'Ervane en 3D (docs/ILE-TECHNIQUE.md, 3.5 et 3.6) : ce qui est posé (le Métier,
// les maisons de toile cousues des Mailles, les ruines des Murets, l'Arbre-Bobine, la margelle du
// Puits, la Nacelle...), le semis (arbres en lobes, buissons, rochers, fougères, fleurs, herbes en
// instances, fils blancs du Bois Cousu), les lignes (murets de pierre sèche, haies, ponts, escaliers,
// gués), l'eau, les faces des escarpements, la falaise du bord de l'île et son dessous, le fil d'or
// de l'amarre et le fil du Métier, la chute du Ru, la mer de nuages.
//
// Tout est fusionné par morceau de 60 × 60 u et par matière (roche, frondaison, accessoires,
// lueur) : quatre ou cinq appels de dessin par morceau, des herbes en une InstancedMesh par
// morceau, et une silhouette par morceau (un seul matériau) pour le lointain. Les formes de base (lobes, galets)
// sont déformées une fois et réutilisées par leurs matrices.
//
// Repère : X = u, Y = h, Z = v. Three.js est chargé avant l'appel.
const IleDecor = (() => {
  const M = () => IleTerrain.M;
  // Le décor est fusionné par morceaux de 60 × 60 u (deux tuiles de relief de côté) : moins
  // d'appels de dessin (3.9), l'élimination hors champ reste assez fine pour la vue d'exploration.
  const TUILE = 60;
  const clamp = (x, a, b) => (x < a ? a : x > b ? b : x);
  const lisse = (a, b, x) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };

  // ----- Couleurs (linéaires, pour les sommets) -----
  let THREE = null;
  const coul = h => { const c = new THREE.Color(h); return [c.r, c.g, c.b]; };
  const melange = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
  const fois = (a, k) => [a[0] * k, a[1] * k, a[2] * k];

  // Bruit 3D de valeur (hachage entier), pour déformer les formes.
  function bruit3(x, y, z, s) {
    const h = M().hache;
    const xi = Math.floor(x), yi = Math.floor(y), zi = Math.floor(z);
    const fx = x - xi, fy = y - yi, fz = z - zi;
    const u = fx * fx * (3 - 2 * fx), v = fy * fy * (3 - 2 * fy), w = fz * fz * (3 - 2 * fz);
    const H = (a, b, c) => h(a, b, c * 7919 + s);
    const l = (a, b, t) => a + (b - a) * t;
    const c00 = l(H(xi, yi, zi), H(xi + 1, yi, zi), u), c10 = l(H(xi, yi + 1, zi), H(xi + 1, yi + 1, zi), u);
    const c01 = l(H(xi, yi, zi + 1), H(xi + 1, yi, zi + 1), u), c11 = l(H(xi, yi + 1, zi + 1), H(xi + 1, yi + 1, zi + 1), u);
    return l(l(c00, c10, v), l(c01, c11, v), w);
  }

  // ----- La bibliothèque des formes de base -----

  let LIB = null;
  function bibliotheque(telephone) {
    if (LIB && LIB.telephone === telephone) return LIB;
    const L = { telephone };
    // Lobes de frondaison : sphères déformées, ventre aplati (huit variantes).
    const [sw, sh] = telephone ? [7, 5] : [9, 7];
    L.lobes = [];
    for (let k = 0; k < 8; k++) {
      const g = new THREE.SphereGeometry(1, sw, sh), P = g.attributes.position, s = k * 0.53 + 0.2;
      for (let i = 0; i < P.count; i++) {
        const x = P.getX(i), y = P.getY(i), z = P.getZ(i);
        const n = bruit3(x * 1.3 + s, y * 1.3, z * 1.3 + s, 40 + k);
        const d = 1 + 0.22 * (n - 0.5) * 2;
        let yy = y * d; if (yy < -0.3) yy = -0.3 + (yy + 0.3) * 0.35;
        P.setXYZ(i, x * d, yy, z * d);
      }
      g.computeVertexNormals();
      g.computeBoundingBox();
      L.lobes.push(g);
    }
    // Galets : icosaèdres déformés, à facettes (huit variantes, deux finesses).
    const galet = (k, detail, rug) => {
      let g = new THREE.IcosahedronGeometry(1, detail);
      const P = g.attributes.position, s = k * 0.37 + 1.1;
      for (let i = 0; i < P.count; i++) {
        const x = P.getX(i), y = P.getY(i), z = P.getZ(i);
        const n = bruit3(x * 1.2 + s, y * 1.2 + s * 0.3, z * 1.2, 90 + k);
        const d = 1 + rug * (n - 0.5) * 2;
        P.setXYZ(i, x * d, y * d, z * d);
      }
      if (g.index) g = g.toNonIndexed();
      g.computeVertexNormals();
      g.computeBoundingBox();
      return g;
    };
    L.galets = []; L.cailloux = []; L.blocs = [];
    for (let k = 0; k < 8; k++) { L.galets.push(galet(k, 1, 0.22)); L.cailloux.push(galet(k + 8, 0, 0.2)); L.blocs.push(galet(k + 16, 1, 0.1)); }
    // Pierres taillées des murets, des ruines et de la margelle : des pavés aux coins déplacés (12
    // triangles à facettes), assez pour de la pierre sèche vue de haut.
    L.pierres = [];
    for (let k = 0; k < 8; k++) {
      let g = new THREE.BoxGeometry(1, 1, 1);
      const P = g.attributes.position;
      for (let i = 0; i < P.count; i++) {
        const x = P.getX(i), y = P.getY(i), z = P.getZ(i);
        const sx = Math.sign(x), sy = Math.sign(y), sz = Math.sign(z);
        const h = (a, b) => M().hache(k * 13 + (sx + 2) * 3 + (sz + 2), (sy + 2) * 5 + a, 300 + b) - 0.5;
        P.setXYZ(i, x + h(1, 1) * 0.22, y + h(2, 2) * (sy > 0 ? 0.3 : 0.1), z + h(3, 3) * 0.22);
      }
      g = g.toNonIndexed();
      g.computeVertexNormals();
      g.translate(0, 0.5, 0);
      g.computeBoundingBox();
      L.pierres.push(g);
    }
    const fermer = g => { g.computeBoundingBox(); return g; };
    // Cylindres et cônes, la base à y = 0.
    L.cyl = n => L['cyl' + n] || (L['cyl' + n] = fermer(new THREE.CylinderGeometry(1, 1, 1, n, 1).translate(0, 0.5, 0)));
    L.tronc = n => L['tronc' + n] || (L['tronc' + n] = fermer(new THREE.CylinderGeometry(0.6, 1, 1, n, 2).translate(0, 0.5, 0)));
    L.cone = n => L['cone' + n] || (L['cone' + n] = fermer(new THREE.ConeGeometry(1, 1, n, 1).translate(0, 0.5, 0)));
    L.boite = fermer(new THREE.BoxGeometry(1, 1, 1).translate(0, 0.5, 0));
    L.boiteC = fermer(new THREE.BoxGeometry(1, 1, 1));
    L.tore = (n, arc) => L['tore' + n + (arc || '')] || (L['tore' + n + (arc || '')] = fermer(new THREE.TorusGeometry(1, 0.12, 5, n, arc || Math.PI * 2)));
    L.disque = n => L['disque' + n] || (L['disque' + n] = fermer(new THREE.CylinderGeometry(1, 1, 0.1, n, 1)));
    L.octa = fermer(new THREE.OctahedronGeometry(1));
    L.sphere = fermer(new THREE.SphereGeometry(1, 8, 6));
    // Un quad vertical (toile, panneau), centré en bas.
    L.quad = fermer(new THREE.PlaneGeometry(1, 1).translate(0, 0.5, 0));
    // Une feuille de fougère : un losange allongé, un peu courbé.
    L.feuille = (() => {
      const g = new THREE.BufferGeometry();
      const p = [0, 0, 0, 0.18, 0.12, 0.35, 0, 0.2, 1, -0.18, 0.12, 0.35];
      g.setAttribute('position', new THREE.Float32BufferAttribute(p, 3));
      g.setAttribute('uv', new THREE.Float32BufferAttribute([0.5, 0, 1, 0.4, 0.5, 1, 0, 0.4], 2));
      g.setIndex([0, 1, 2, 0, 2, 3, 0, 2, 1, 0, 3, 2]);
      g.computeVertexNormals();
      return fermer(g);
    })();
    // Une touffe d'herbe : cinq lames en éventail (opaques : pas de discard, 3.5).
    L.touffe = (() => {
      const g = new THREE.BufferGeometry(), p = [], c = [], idx = [];
      const n = telephone ? 4 : 6;
      for (let k = 0; k < n; k++) {
        const a = k / n * Math.PI * 2 + 0.3, r = 0.05, h = 0.42 + (k % 3) * 0.12, lean = 0.16 + (k % 2) * 0.08;
        const ca = Math.cos(a), sa = Math.sin(a), b = p.length / 3;
        p.push(ca * r - sa * 0.05, 0, sa * r + ca * 0.05, ca * r + sa * 0.05, 0, sa * r - ca * 0.05, ca * (r + lean), h, sa * (r + lean));
        c.push(0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 1.0, 1.0, 1.0);
        idx.push(b, b + 1, b + 2, b, b + 2, b + 1);
      }
      g.setAttribute('position', new THREE.Float32BufferAttribute(p, 3));
      g.setAttribute('color', new THREE.Float32BufferAttribute(c, 3));
      g.setIndex(idx);
      g.computeVertexNormals();
      const N = g.attributes.normal;
      for (let i = 0; i < N.count; i++) N.setXYZ(i, N.getX(i) * 0.3, 0.95, N.getZ(i) * 0.3);
      return fermer(g);
    })();
    LIB = L;
    return L;
  }

  // ----- La fusion : des pièces (forme, matrice, couleur) en une seule géométrie indexée -----
  // Couleur d'une pièce : `c` [r, g, b] linéaire ; `bas`/`haut` : un dégradé vertical sur la forme ;
  // `fronde` : le dégradé des frondaisons du prototype (sombre et bleuté dessous, clair dessus) ;
  // `mousse` : une couleur qui gagne les faces tournées vers le ciel ; `grain` : un peu de hasard.

  const _v = () => new THREE.Vector3(), _m3 = () => new THREE.Matrix3();
  function fusion(items) {
    if (!items.length) return null;
    let nv = 0, ni = 0;
    for (const it of items) { nv += it.geo.attributes.position.count; ni += it.geo.index ? it.geo.index.count : it.geo.attributes.position.count; }
    const pos = new Float32Array(nv * 3), nor = new Float32Array(nv * 3), uv = new Float32Array(nv * 2), col = new Float32Array(nv * 3);
    const idx = nv > 65535 ? new Uint32Array(ni) : new Uint16Array(ni);
    let ov = 0, oi = 0;
    const v = _v(), n = _v(), nm = _m3();
    const SOMBRE = coul('#1f3448'), CLAIR = coul('#f0f4d8');
    for (const it of items) {
      const g = it.geo, P = g.attributes.position, N = g.attributes.normal, U = g.attributes.uv, C = g.attributes.color;
      nm.getNormalMatrix(it.m);
      const bb = g.boundingBox, y0 = bb.min.y, y1 = bb.max.y, dy = (y1 - y0) || 1;
      const base = it.c || [0.7, 0.7, 0.7];
      const h = M().hache(it.cle || ov, 7, 3) - 0.5;
      const varie = 1 + (it.grain == null ? 0.08 : it.grain) * h * 2;
      for (let i = 0; i < P.count; i++) {
        v.fromBufferAttribute(P, i);
        let yl = (v.y - y0) / dy;
        v.applyMatrix4(it.m);
        // Un houppier fait de plusieurs lobes s'ombre comme un seul volume : la hauteur dans le
        // houppier entier, pas dans le lobe.
        if (it.canopee) yl = clamp((v.y - it.canopee[0]) / (it.canopee[1] - it.canopee[0]), 0, 1);
        const o = (ov + i) * 3;
        pos[o] = v.x; pos[o + 1] = v.y; pos[o + 2] = v.z;
        if (N) { n.fromBufferAttribute(N, i).applyMatrix3(nm).normalize(); nor[o] = n.x; nor[o + 1] = n.y; nor[o + 2] = n.z; } else { nor[o + 1] = 1; }
        if (U) { uv[(ov + i) * 2] = U.getX(i) * (it.uvk || 1); uv[(ov + i) * 2 + 1] = U.getY(i) * (it.uvk || 1); }
        let r = base[0], gg = base[1], b = base[2];
        if (it.fronde) {
          const k = 0.62 + 0.66 * yl;
          r *= k; gg *= k; b *= k;
          const s = (1 - yl) * 0.32, cl = yl * yl * 0.12;
          r += (SOMBRE[0] - r) * s; gg += (SOMBRE[1] - gg) * s; b += (SOMBRE[2] - b) * s;
          r += (CLAIR[0] - r) * cl; gg += (CLAIR[1] - gg) * cl; b += (CLAIR[2] - b) * cl;
        } else if (it.bas != null || it.haut != null) {
          const k = (it.bas == null ? 1 : it.bas) + ((it.haut == null ? 1 : it.haut) - (it.bas == null ? 1 : it.bas)) * yl;
          r *= k; gg *= k; b *= k;
        }
        if (it.mousse && N) {
          const f = clamp((n.y - 0.45) / 0.45, 0, 1) * (it.mousseHaut == null ? yl : 1) * 0.9;
          r += (it.mousse[0] - r) * f; gg += (it.mousse[1] - gg) * f; b += (it.mousse[2] - b) * f;
        }
        if (C) { r *= C.getX(i); gg *= C.getY(i); b *= C.getZ(i); }
        col[o] = r * varie; col[o + 1] = gg * varie; col[o + 2] = b * varie;
      }
      if (g.index) { const I = g.index.array; for (let k = 0; k < I.length; k++) idx[oi + k] = I[k] + ov; oi += I.length; }
      else { for (let k = 0; k < P.count; k++) idx[oi + k] = ov + k; oi += P.count; }
      ov += P.count;
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    geo.setAttribute('normal', new THREE.BufferAttribute(nor, 3));
    geo.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
    geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
    geo.setIndex(new THREE.BufferAttribute(idx, 1));
    geo.computeBoundingSphere();
    return geo;
  }

  // Une matrice : position, rotations (x, y, z), échelles. L'ordre YXZ : la forme penche d'abord
  // dans son propre repère (x, puis z), puis tourne autour de la verticale (le cap) ; un pan de toit
  // incliné le long du faîte reste incliné quand la maison tourne.
  const _mat = { q: null, e: null, p: null, s: null };
  function matrice(x, y, z, rx, ry, rz, sx, sy, sz) {
    if (!_mat.q) { _mat.q = new THREE.Quaternion(); _mat.e = new THREE.Euler(0, 0, 0, 'YXZ'); _mat.p = new THREE.Vector3(); _mat.s = new THREE.Vector3(); }
    _mat.e.set(rx || 0, ry || 0, rz || 0, 'YXZ');
    _mat.q.setFromEuler(_mat.e);
    _mat.p.set(x, y, z);
    _mat.s.set(sx == null ? 1 : sx, sy == null ? (sx == null ? 1 : sx) : sy, sz == null ? (sx == null ? 1 : sx) : sz);
    return new THREE.Matrix4().compose(_mat.p, _mat.q, _mat.s);
  }
  // Un segment de A à B (une poutre, un fil, une corde) : la forme unité, base en y = 0, alignée.
  function entre(ax, ay, az, bx, by, bz, ep) {
    const d = new THREE.Vector3(bx - ax, by - ay, bz - az), L = d.length() || 1e-3;
    const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), d.normalize());
    return new THREE.Matrix4().compose(new THREE.Vector3(ax, ay, az), q, new THREE.Vector3(ep, L, ep));
  }

  // ======================================================================
  // La construction : tout le décor d'un plateau
  // ======================================================================

  // `ctx` : { T, def, telephone, qualite }. Rend { tuiles: [{ tx, ty, cle, geos: { roche, fronde,
  // acc, lueur }, silhouette, herbes: { matrices, couleurs }, centre }], global: { ... }, halos,
  // lanternes, cibles }.
  function construire(three, ctx) {
    THREE = three;
    const { T, def } = ctx;
    const L = bibliotheque(!!ctx.telephone);
    const nx = Math.ceil(T.largeur / TUILE), ny = Math.ceil(T.hauteur / TUILE);
    const seaux = new Map();
    const seau = (u, v) => {
      const tx = clamp(Math.floor(u / TUILE), 0, nx - 1), ty = clamp(Math.floor(v / TUILE), 0, ny - 1), k = ty * nx + tx;
      let s = seaux.get(k);
      if (!s) { s = { tx, ty, roche: [], fronde: [], acc: [], lueur: [], sil: [], herbes: [] }; seaux.set(k, s); }
      return s;
    };
    const G = { lueur: [], halos: [], lanternes: [], cibles: [], feux: [] };
    const sol = (u, v) => { const h = T.marcheA(u, v); return Number.isFinite(h) ? h : T.solBrutA(u, v); };
    const solPlat = (u, v) => { const h = T.hauteurA(u, v); return Number.isFinite(h) ? h : T.solBrutA(u, v); };
    const palettes = (def.regions || []).map(r => r.palette || {});
    const palette = (u, v) => palettes[T.regionA(u, v)] || palettes[0] || {};
    const zone = (u, v) => T.zoneA(u, v);
    let cle = 1;
    const piece = (s, quoi, geo, m, opts) => { s[quoi].push(Object.assign({ geo, m, cle: cle++ }, opts)); };

    semis(ctx, L, seau, piece, sol, palette, zone, G);
    accents(ctx, L, seau, piece, sol, G);
    objets(ctx, L, seau, piece, sol, solPlat, palette, G);
    lignes(ctx, L, seau, piece, sol, palette, G);
    obstaclesAires(ctx, L, seau, piece, sol, palette);

    const tuiles = [];
    for (const s of seaux.values()) {
      const t = { tx: s.tx, ty: s.ty, centre: [s.tx * TUILE + TUILE / 2, s.ty * TUILE + TUILE / 2], geos: {}, silhouette: null, herbes: s.herbes };
      for (const q of ['roche', 'fronde', 'acc', 'lueur']) t.geos[q] = fusion(s[q]);
      t.silhouette = fusion(s.sil);
      tuiles.push(t);
    }
    return { tuiles, global: G.lueur, puits: G.puits || null, halos: G.halos, lanternes: G.lanternes, cibles: G.cibles, feux: G.feux };
  }

  // ----- Le semis : arbres, buissons, rochers, fougères, fleurs, herbes, fils -----

  function semis(ctx, L, seau, piece, sol, palette, zone, G) {
    const { T } = ctx;
    const TRONC = coul('#6a4e3a'), TRONC_BOIS = coul('#4a3a30');
    const arbres = new Map();
    for (const e of T.decor) {
      const s = seau(e.u, e.v), z = zone(e.u, e.v), pal = palette(e.u, e.v);
      const R = M().hasard(e.graine >>> 0);
      const y = sol(e.u, e.v);
      if (!Number.isFinite(y)) continue;
      const feuillages = (pal.feuillages || ['#6aa86a', '#8dbb6a']).map(coul);
      const teinte = melange(feuillages[0], feuillages[1] || feuillages[0], e.teinte || 0);
      if (e.sorte === 'arbre') {
        const bois = z === 'ervane_bois', r = e.rayon * (bois ? 1.25 : 1.05) * (e.echelle || 1);
        const forme = e.forme || 'rond';
        const hT = bois ? 2.6 + r * 1.35 : 0.9 + r * 0.8;
        const rt = Math.min(bois ? 0.55 : 0.4, r * (bois ? 0.3 : 0.2));
        piece(s, 'acc', L.tronc(6), matrice(e.u, y - 0.2, e.v, (R() - 0.5) * 0.06, R() * 3, (R() - 0.5) * 0.06, rt, hT + r * 0.6, rt), { c: fois(bois ? TRONC_BOIS : TRONC, 0.8 + R() * 0.3), bas: 0.7, haut: 1.05 });
        // Racines en éventail au pied des grands arbres du Bois.
        if (bois && r > 1) for (let k = 0; k < 2; k++) { const a = R() * 6.28; piece(s, 'acc', L.cone(4), matrice(e.u + Math.cos(a) * rt * 0.8, y - 0.15, e.v + Math.sin(a) * rt * 0.8, Math.sin(a) * 1.2, 0, -Math.cos(a) * 1.2, rt * 0.35, rt * 1.6, rt * 0.35), { c: fois(TRONC_BOIS, 0.75) }); }
        const cy0 = y + hT + r * 0.75;
        const lobes = [];
        if (forme === 'pin') { for (let k = 0; k < 3; k++) { const f = 1 - k * 0.27; lobes.push([r * f, 0, r * 0.62 * k, 0, 1.05, 0.72, 1.05]); } }
        else if (forme === 'large') { lobes.push([r, 0, 0, 0, 1.3, 0.72, 1.3]); for (let k = 1; k < 3; k++) { const an = e.graine * 0.7 + k * 2.3; lobes.push([r * 0.62, Math.cos(an) * r * 0.75, r * 0.28, Math.sin(an) * r * 0.75, 1.1, 0.8, 1.1]); } }
        else if (forme === 'haut') { lobes.push([r, 0, r * 0.25, 0, 0.74, 1.45, 0.74]); lobes.push([r * 0.6, (R() - 0.5) * r, r * 0.9, (R() - 0.5) * r, 0.8, 1.1, 0.8]); }
        else {
          // Un houppier en cumulus : un cœur, une couronne de lobes autour et un peu au-dessus, un
          // sommet ; la silhouette se découpe en bosses, comme un arbre peint.
          lobes.push([r * 0.9, 0, 0, 0, 1.05, 0.88, 1.05]);
          const nb = ctx.telephone ? 4 : 5, a0 = R() * 6.28;
          for (let k = 0; k < nb; k++) {
            const an = a0 + k / nb * 6.283 + (R() - 0.5) * 0.7, d = r * (0.55 + R() * 0.22), lr = r * (0.48 + R() * 0.18);
            lobes.push([lr, Math.cos(an) * d, -r * 0.12 + R() * r * 0.32, Math.sin(an) * d, 1, 0.9, 1]);
          }
          lobes.push([r * 0.58, (R() - 0.5) * r * 0.35, r * 0.52, (R() - 0.5) * r * 0.35, 1, 0.9, 1]);
        }
        // Le dégradé de tout le houppier : sombre et bleuté dessous, clair et chaud dessus.
        const bas = cy0 - r * 0.85, haut = cy0 + r * 1.05;
        const clair = melange(feuillages[1] || teinte, coul('#e8f0a0'), 0.18);
        lobes.forEach(([lr, dx, dy, dz, sx, sy, sz], k) => {
          const hr = clamp((dy + r * 0.2) / (r * 0.8), 0, 1);
          const c = melange(k ? melange(teinte, feuillages[(k + 1) % feuillages.length], 0.3) : teinte, clair, hr * 0.35);
          piece(s, 'fronde', L.lobes[(e.graine + k) % 8], matrice(e.u + dx, cy0 + dy, e.v + dz, 0, R() * 3, 0, lr * sx, lr * sy, lr * sz), { c, fronde: true, grain: 0.1, canopee: [bas, haut] });
        });
        piece(s, 'sil', L.lobes[e.graine % 8], matrice(e.u, cy0, e.v, 0, 0, 0, r * 1.15, r * 1.1, r * 1.15), { c: teinte, fronde: true });
        piece(s, 'sil', L.cyl(5), matrice(e.u, y, e.v, 0, 0, 0, rt, hT, rt), { c: fois(TRONC_BOIS, 0.8) });
        arbres.set(`${e.u},${e.v}`, { y: cy0, r, hT, y0: y });
      } else if (e.sorte === 'pin_tordu') {
        // Un tronc plié par le vent d'ouest, des étages de frondaison sombre couchés vers l'est.
        const r = e.rayon * (e.echelle || 1), h1 = 1.4 + r * 0.6, pench = 0.35 + R() * 0.25;
        const x1 = e.u + Math.sin(pench) * h1, y1 = y + Math.cos(pench) * h1;
        piece(s, 'acc', L.tronc(5), matrice(e.u, y - 0.15, e.v, 0, 0, -pench, 0.22, h1 + 0.2, 0.22), { c: coul('#5a4636'), bas: 0.7, haut: 1 });
        piece(s, 'acc', L.tronc(5), matrice(x1, y1, e.v, 0, 0, -pench * 2.2, 0.15, r * 0.9, 0.15), { c: coul('#5a4636') });
        const verts = ['#3f5a44', '#4a644a', '#566e4e'].map(coul);
        for (let k = 0; k < 3; k++) piece(s, 'fronde', L.lobes[(e.graine + k) % 8], matrice(x1 + 0.4 + k * 0.35, y1 + 0.3 + k * 0.45, e.v + (R() - 0.5) * 0.6, 0, R() * 3, 0, r * (1.1 - k * 0.22), r * 0.32, r * (0.8 - k * 0.15)), { c: verts[k], fronde: true });
        piece(s, 'sil', L.lobes[e.graine % 8], matrice(x1 + 0.6, y1 + 0.6, e.v, 0, 0, 0, r, r * 0.45, r * 0.8), { c: verts[0], fronde: true });
      } else if (e.sorte === 'buisson') {
        const r = e.rayon * (e.echelle || 1), cy = y + r * 0.42;
        const c = melange(teinte, coul(pal.herbeClaire || '#b7d08a'), 0.18);
        piece(s, 'fronde', L.lobes[e.graine % 8], matrice(e.u, cy, e.v, 0, e.rot || 0, 0, r * 1.15, r * 0.95, r * 1.15), { c, fronde: true, grain: 0.12 });
        if (r > 0.6) piece(s, 'fronde', L.lobes[(e.graine + 3) % 8], matrice(e.u + r * 0.6, cy - r * 0.1, e.v + r * 0.3, 0, 0, 0, r * 0.7, r * 0.6, r * 0.7), { c: melange(c, feuillages[1] || c, 0.4), fronde: true });
      } else if (e.sorte === 'rocher' || e.sorte === 'borne') {
        const r = e.rayon * (e.echelle || 1);
        const roche = coul(pal.roche || '#c9c3b2');
        const mousse = z === 'ervane_bois' || z === 'ervane_sources' ? coul('#6f9a5c') : z === 'ervane_murets' ? coul('#a9a46a') : null;
        if (e.sorte === 'borne') {
          const h = 1.1 + R() * 0.6;
          piece(s, 'roche', L.blocs[e.graine % 8], matrice(e.u, y + h * 0.42, e.v, (R() - 0.5) * 0.12, e.rot || 0, (R() - 0.5) * 0.12, r * 0.85, h * 0.62, r * 0.75), { c: fois(roche, 0.95), bas: 0.72, haut: 1.08, mousse: coul('#8a9a6a') });
        } else {
          const ey = 0.55 + R() * 0.35;
          piece(s, 'roche', (r >= 1 && !ctx.telephone ? L.galets : L.cailloux)[e.graine % 8], matrice(e.u, y + r * ey * 0.35, e.v, 0, e.rot || 0, 0, r, r * ey, r * (0.8 + R() * 0.3)), { c: fois(roche, 0.85), bas: 0.72, haut: 1.06, mousse });
        }
        piece(s, 'sil', L.cailloux[e.graine % 8], matrice(e.u, y + r * 0.2, e.v, 0, 0, 0, r, r * 0.6, r), { c: fois(roche, 0.8) });
      } else if (e.sorte === 'galet') {
        const r = e.rayon * (e.echelle || 1);
        piece(s, 'roche', L.cailloux[e.graine % 8], matrice(e.u, y + r * 0.25, e.v, 0, e.rot || 0, 0, r, r * 0.6, r * 0.85), { c: fois(coul(pal.roche || '#a7a3a6'), 0.9), bas: 0.75, haut: 1.05 });
      } else if (e.sorte === 'fougere') {
        const r = e.rayon * (e.echelle || 1) * 1.1, n = 6;
        const c = melange(coul('#3f7a52'), teinte, 0.4);
        for (let k = 0; k < n; k++) {
          const a = (e.rot || 0) + k / n * 6.283;
          piece(s, 'fronde', L.feuille, matrice(e.u, y + 0.02, e.v, -0.9 - R() * 0.4, a, 0, r * 0.9, r * 0.9, r * 0.9), { c: fois(c, 0.85 + R() * 0.3), bas: 0.6, haut: 1.15 });
        }
      } else if (e.sorte === 'fleurs') {
        const z2 = zone(e.u, e.v);
        const cols = z2 === 'ervane_sources' ? ['#ffb347', '#a6f0e4', '#dcd6ff', '#c9f06a', '#fff6dc'] : ['#fff6dc', '#f6d36b', '#eab8dc', '#bcd8ff', '#ff9a6a'];
        const n = (ctx.telephone ? 2 : 3) + Math.floor(R() * 3);
        for (let k = 0; k < n; k++) {
          const a = R() * 6.28, d = R() * e.rayon, fx = e.u + Math.cos(a) * d, fz = e.v + Math.sin(a) * d, fy = sol(fx, fz);
          const c = coul(cols[Math.floor(R() * cols.length)]);
          // Une corolle posée dans l'herbe (la tige ne se verrait pas d'en haut).
          piece(s, 'lueur', L.octa, matrice(fx, fy + 0.16, fz, 0, a, 0, 0.1, 0.06, 0.1), { c: fois(c, 0.9) });
        }
      } else if (e.sorte === 'herbe') {
        const c = melange(coul((pal.herbe || ['#6a9664'])[0]), coul(pal.herbeClaire || '#b7d08a'), 0.1 + (e.teinte || 0) * 0.25);
        // Une touffe d'herbe : une instance (la matrice, la couleur).
        for (let k = 0; k < 2; k++) {
          const a = R() * 6.28, d = R() * 0.6, hx = e.u + Math.cos(a) * d, hz = e.v + Math.sin(a) * d, hy = sol(hx, hz);
          const k2 = (0.75 + R() * 0.6) * (e.rayon / 0.3);
          s.herbes.push({ m: matrice(hx, hy - 0.03, hz, 0, R() * 6.28, 0, k2, k2 * (0.8 + R() * 0.5), k2), c: fois(c, 0.85 + R() * 0.3) });
        }
      } else if (e.sorte === 'bruyere') {
        // La bruyère : deux coussins bas, brun-violet, piqués de petites fleurs.
        const r = e.rayon * (e.echelle || 1);
        const base = melange(coul('#7a6a5a'), coul('#8d6f9a'), 0.3 + (e.teinte || 0) * 0.5);
        piece(s, 'fronde', L.lobes[e.graine % 8], matrice(e.u, y + r * 0.28, e.v, 0, e.rot || 0, 0, r * 1.3, r * 0.55, r * 1.1), { c: base, fronde: true, grain: 0.12 });
        piece(s, 'fronde', L.lobes[(e.graine + 5) % 8], matrice(e.u + r * 0.7, y + r * 0.22, e.v - r * 0.3, 0, (e.rot || 0) + 1.3, 0, r * 0.9, r * 0.45, r * 0.8), { c: melange(base, coul('#a9a46a'), 0.35), fronde: true });
        const n = ctx.telephone ? 2 : 4;
        for (let k = 0; k < n; k++) {
          const a = R() * 6.28, d = R() * r * 0.9;
          piece(s, 'lueur', L.octa, matrice(e.u + Math.cos(a) * d, y + r * 0.5 + 0.08, e.v + Math.sin(a) * d, 0, a, 0, 0.07, 0.05, 0.07), { c: coul(k % 2 ? '#d9a0e8' : '#f0cde0') });
        }
      } else if (e.sorte === 'arbre_mort') {
        // Un arbre mort : un tronc gris, deux ou trois branches nues, pas de houppier.
        const r = e.rayon * (e.echelle || 1), h = 2.2 + r * 1.2, rt = 0.14 + r * 0.08;
        const gris = fois(coul('#6f665c'), 0.85 + R() * 0.3);
        piece(s, 'acc', L.tronc(5), matrice(e.u, y - 0.2, e.v, (R() - 0.5) * 0.1, R() * 3, (R() - 0.5) * 0.1, rt, h + 0.2, rt), { c: gris, bas: 0.7, haut: 1.05 });
        const nb = 2 + (e.graine % 2);
        for (let k = 0; k < nb; k++) {
          const a = (e.rot || 0) + k * 2.1 + R() * 0.6, hb = h * (0.5 + k * 0.18), lb = 0.8 + r * 0.6;
          piece(s, 'acc', L.cone(4), matrice(e.u + Math.cos(a) * 0.1, y + hb, e.v + Math.sin(a) * 0.1, Math.sin(a) * 0.95, 0, -Math.cos(a) * 0.95, rt * 0.6, lb, rt * 0.6), { c: gris });
        }
        piece(s, 'sil', L.cyl(5), matrice(e.u, y, e.v, 0, 0, 0, rt, h, rt), { c: gris });
      }
    }
    // Les fils blancs du Bois Cousu : tendus entre deux troncs voisins, au-dessus de 2,5 u.
    for (const e of T.decor) {
      if (e.sorte !== 'fil') continue;
      const A = arbres.get(`${e.de[0]},${e.de[1]}`), B = arbres.get(`${e.a[0]},${e.a[1]}`);
      const ya = A ? A.y0 + Math.min(e.hauteur, A.hT + 0.5) : sol(e.de[0], e.de[1]) + e.hauteur;
      const yb = B ? B.y0 + Math.min(e.hauteur + 0.4, B.hT + 0.6) : sol(e.a[0], e.a[1]) + e.hauteur;
      const s = seau(e.u, e.v), n = 7;
      const dx = e.a[0] - e.de[0], dz = e.a[1] - e.de[1], Lg = Math.sqrt(dx * dx + dz * dz);
      let prec = null;
      for (let k = 0; k <= n; k++) {
        const t = k / n, x = e.de[0] + dx * t, z = e.de[1] + dz * t, y = ya + (yb - ya) * t - Math.sin(t * Math.PI) * Lg * 0.08;
        if (prec) piece(s, 'lueur', L.cyl(3), entre(prec[0], prec[1], prec[2], x, y, z, 0.065), { c: coul('#eef4f6') });
        prec = [x, y, z];
      }
    }
  }

  // ----- Les accents des sources (docs/ILE-DE-DEPART.md, zone 1) -----
  // La Source de Braise : des pierres rouge sombre veinées d'orange autour des fentes qui fument ;
  // la Source de Mousse : des tertres couverts d'une mousse épaisse (les cairns de la Source du
  // Vent sont posés par le contenu).
  function accents(ctx, L, seau, piece, sol, G) {
    const { T } = ctx;
    for (const a of T.accents || []) {
      const R = M().hasard(M().cle('accent_' + a.sol));
      const [cu, cv] = a.centre;
      if (a.sol === 'braise') {
        for (let k = 0; k < 14; k++) {
          const an = R() * 6.283, d = a.rayon * (0.35 + R() * 0.75), x = cu + Math.cos(an) * d, z = cv + Math.sin(an) * d, y = sol(x, z);
          if (!Number.isFinite(y) || T.videA(x, z) || T.profondeurA(x, z) > 0.01) continue;
          const r = 0.35 + R() * 0.6;
          piece(seau(x, z), 'roche', L.cailloux[k % 8], matrice(x, y + r * 0.12, z, 0, R() * 6, 0, r, r * (0.5 + R() * 0.3), r * 0.85), { c: coul(R() < 0.5 ? '#4e241e' : '#5e2c22'), bas: 0.65, haut: 1.05, mousse: coul('#a8602e') });
          if (k % 3 === 0) G.halos.push({ x, y: y + 0.2, z, couleur: '#ff7a3a', taille: 1.6, opacite: 0.35 });
        }
      } else if (a.sol === 'mousse') {
        for (let k = 0; k < 10; k++) {
          const an = R() * 6.283, d = a.rayon * (0.2 + R() * 0.8), x = cu + Math.cos(an) * d, z = cv + Math.sin(an) * d, y = sol(x, z);
          if (!Number.isFinite(y) || T.videA(x, z) || T.profondeurA(x, z) > 0.01) continue;
          const r = 0.8 + R() * 1.1;
          piece(seau(x, z), 'fronde', L.lobes[k % 8], matrice(x, y - r * 0.25, z, 0, R() * 6, 0, r * 1.3, r * 0.55, r * 1.1), { c: coul(R() < 0.5 ? '#4f8a3a' : '#5f9a42'), fronde: true, grain: 0.12 });
        }
      }
    }
  }

  // ----- Les objets posés -----

  function objets(ctx, L, seau, piece, sol, solPlat, palette, G) {
    const { T, def } = ctx;
    const C = {
      bois: coul('#6a4e3a'), boisClair: coul('#8a6a4a'), boisSombre: coul('#4a3828'),
      calcaire: coul('#e4ddcd'), calcaireOmbre: coul('#b9b1a0'), pierre: coul('#b8b2a2'), pierreSombre: coul('#8f8a80'),
      or: coul('#e0a63a'), orVif: coul('#ffcf5a'), lanterne: coul('#ffd27a'), cristal: coul('#8fe9ff'),
      toiles: ['#e4dac4', '#c9a865', '#b8876a', '#8a9cb2', '#d8cdb5', '#a9826a'].map(coul),
      gris: coul('#a7a3a6'), ardoise: coul('#5a6278'), braise: coul('#ff8a3a'), violet: coul('#c9a0ff'),
    };
    const rot = o => -(o.rot || 0);   // les rotations du contenu tournent (u, v) ; Three tourne autour de Y
    const ajouter = (o, quoi, geo, m, opts) => piece(seau(o.u, o.v), quoi, geo, m, opts);
    // Un point local (lx le long de la rotation, lz en travers) de l'objet, en coordonnées du monde.
    const local = (o, lx, lz) => { const c = Math.cos(o.rot || 0), s = Math.sin(o.rot || 0); return [o.u + lx * c - lz * s, o.v + lx * s + lz * c]; };
    const lanterne = (u, v, y, h, seauDe, forte) => {
      const s = seauDe;
      piece(s, 'acc', L.cyl(5), matrice(u, y, v, 0, 0, 0, 0.08, h, 0.08), { c: C.boisSombre });
      piece(s, 'acc', L.cone(4), matrice(u, y + h + 0.2, v, 0, 0.78, 0, 0.32, 0.26, 0.32), { c: coul('#4a3a2a') });
      piece(s, 'lueur', L.boiteC, matrice(u, y + h, v, 0, 0.78, 0, 0.3, 0.38, 0.3), { c: C.lanterne });
      G.halos.push({ x: u, y: y + h, z: v, couleur: '#ffb347', taille: forte ? 4.6 : 3.4, opacite: 0.75 });
      G.lanternes.push({ x: u, y: y + h, z: v });
    };
    // La Nacelle pend au bout de sa plateforme, au-dessus du vide : sa hauteur est celle du plancher.
    const plateforme = T.objets.find(o => o.sorte === 'plateforme');
    const yNacelle = plateforme ? solPlat(plateforme.u, plateforme.v) - 0.9 : 3;
    for (const o of T.objets) {
      const y = solPlat(o.u, o.v);
      if (!Number.isFinite(y)) continue;
      const r = rot(o), s = seau(o.u, o.v);
      switch (o.sorte) {
        case 'metier': {
          // Le Métier : un grand cadre de bois sur une estrade de calcaire, le fil d'or qui arrive du ciel.
          ajouter(o, 'acc', L.cyl(16), matrice(o.u, y - 0.4, o.v, 0, 0, 0, 3.4, 0.7, 2.4), { c: C.calcaire, bas: 0.8, haut: 1 });
          ajouter(o, 'acc', L.cyl(16), matrice(o.u, y - 0.2, o.v, 0, 0, 0, 2.9, 0.7, 1.9), { c: C.calcaireOmbre });
          for (const k of [-1, 1]) {
            const [px, pz] = local(o, k * 2.3, 0);
            ajouter(o, 'acc', L.boite, matrice(px, y + 0.3, pz, 0, r, 0, 0.42, 6.4, 0.42), { c: C.bois, bas: 0.8, haut: 1.1 });
            ajouter(o, 'acc', L.boite, matrice(px, y + 0.3, pz, 0, r, 0, 0.7, 0.5, 0.7), { c: C.boisSombre });
          }
          for (const hh of [6.5, 2.0]) { const [px, pz] = local(o, 0, 0); ajouter(o, 'acc', L.boiteC, matrice(px, y + hh, pz, 0, r, 0, 5.6, 0.36, 0.36), { c: C.boisClair }); }
          // La chaîne du métier : des fils d'or tendus dans le cadre.
          for (let k = -4; k <= 4; k++) { const [px, pz] = local(o, k * 0.45, 0); ajouter(o, 'lueur', L.cyl(3), matrice(px, y + 2.1, pz, 0, 0, 0, 0.03, 4.3, 0.03), { c: C.orVif }); }
          // La toile en cours de tissage, en bas du cadre : des bandes de couleur, le fil d'or au milieu.
          const bandes = ['#7a4a3a', '#c9584a', '#e0a63a', '#3f6f9a', '#e8e0cc', '#5f8a52'];
          bandes.forEach((col, q) => { const [px, pz] = local(o, 0, 0.02); ajouter(o, 'acc', L.boiteC, matrice(px, y + 2.35 + q * 0.27, pz, 0, r, 0, 3.9, 0.27, 0.07), { c: coul(col), grain: 0.06 }); });
          { const [px, pz] = local(o, 0, 0.06); ajouter(o, 'lueur', L.boiteC, matrice(px, y + 2.35 + 3 * 0.27, pz, 0, r, 0, 3.9, 0.06, 0.03), { c: C.orVif }); }
          // Le fil d'or descend du ciel jusqu'au haut du cadre, où il se noue.
          G.lueur.push({ geo: L.cyl(6), m: matrice(o.u, y + 6.6, o.v, 0, 0, 0, 0.09, 80, 0.09), c: C.orVif });
          G.lueur.push({ geo: L.sphere, m: matrice(o.u, y + 6.75, o.v, 0, 0, 0, 0.26, 0.26, 0.26), c: C.orVif });
          G.halos.push({ x: o.u, y: y + 6.7, z: o.v, couleur: '#ffc65a', taille: 6, opacite: 0.6 });
          G.lanternes.push({ x: o.u, y: y + 4, z: o.v });
          // Des fils d'or tendus du haut du cadre aux pierres levées de la place, perlés de petites
          // lueurs : le Relais coud la place.
          for (const pl of T.objets) {
            if (pl.sorte !== 'pierre_levee' || pl.element || Math.hypot(pl.u - o.u, pl.v - o.v) > 14) continue;
            const yp = solPlat(pl.u, pl.v) + 2.0, cote = (pl.u - o.u) * Math.cos(o.rot || 0) + (pl.v - o.v) * Math.sin(o.rot || 0) > 0 ? 1 : -1;
            const [ax, az] = local(o, cote * 2.3, 0), ay = y + 6.4;
            const n = 10, L2 = Math.hypot(pl.u - ax, pl.v - az);
            let prec = null;
            for (let q = 0; q <= n; q++) {
              const t = q / n, x = ax + (pl.u - ax) * t, z = az + (pl.v - az) * t, yy = ay + (yp - ay) * t - Math.sin(t * Math.PI) * L2 * 0.12;
              if (prec) G.lueur.push({ geo: L.cyl(3), m: entre(prec[0], prec[1], prec[2], x, yy, z, 0.03), c: C.or });
              if (q === 3 || q === 7) { G.lueur.push({ geo: L.octa, m: matrice(x, yy - 0.12, z, 0, q, 0, 0.11, 0.16, 0.11), c: C.lanterne }); G.halos.push({ x, y: yy - 0.12, z, couleur: '#ffcf7a', taille: 1.3, opacite: 0.55 }); }
              prec = [x, yy, z];
            }
          }
          break;
        }
        case 'relais': {
          ajouter(o, 'acc', L.cyl(8), matrice(o.u, y - 0.2, o.v, 0, r, 0, 1.3, 0.7, 1.3), { c: C.pierre, bas: 0.8, haut: 1 });
          ajouter(o, 'acc', L.cyl(6), matrice(o.u, y + 0.4, o.v, 0, r, 0, 0.55, 1.4, 0.55), { c: C.pierre, bas: 0.85, haut: 1.05 });
          ajouter(o, 'lueur', L.octa, matrice(o.u, y + 2.6, o.v, 0, 0.4, 0, 0.45, 0.95, 0.45), { c: C.cristal });
          G.halos.push({ x: o.u, y: y + 2.6, z: o.v, couleur: '#5ad8ff', taille: 4.5, opacite: 0.6 });
          break;
        }
        case 'maison': {
          const t = o.taille || [6, 5], hm = 2.5 + (o.index % 3) * 0.25;
          const mur = melange(C.calcaire, C.pierre, 0.25 + (o.index % 4) * 0.1);
          ajouter(o, 'acc', L.boite, matrice(o.u, y - 0.4, o.v, 0, r, 0, t[0], hm + 0.4, t[1]), { c: mur, bas: 0.78, haut: 1.04, grain: 0.04 });
          // Soubassement de pierre plus sombre.
          ajouter(o, 'acc', L.boite, matrice(o.u, y - 0.4, o.v, 0, r, 0, t[0] + 0.25, 0.85, t[1] + 0.25), { c: C.pierreSombre });
          // Le toit de toile tendue : deux pans qui débordent, un faîte de bois, des points de couture.
          const toile = C.toiles[o.index % C.toiles.length];
          const pente = 0.55, larg = t[1] / 2 + 0.5, haut = larg * pente;
          for (const k of [-1, 1]) {
            const [px, pz] = local(o, 0, k * larg / 2);
            ajouter(o, 'acc', L.boiteC, matrice(px, y + hm + haut / 2, pz, k * Math.atan(pente), r, 0, t[0] + 0.9, 0.1, Math.sqrt(larg * larg + haut * haut)), { c: toile, grain: 0.05 });
          }
          ajouter(o, 'acc', L.boiteC, matrice(o.u, y + hm + haut + 0.06, o.v, 0, r, 0, t[0] + 1.1, 0.2, 0.2), { c: C.boisSombre });
          // Les pignons, triangles de pierre sous le toit.
          for (const k of [-1, 1]) {
            const [px, pz] = local(o, k * t[0] / 2, 0);
            ajouter(o, 'acc', L.cone(3), matrice(px, y + hm - 0.02, pz, 0, r + Math.PI / 2, 0, larg * 0.98, haut, 0.12), { c: mur });
          }
          // Les gros points de fil qui cousent la toile aux murs, le long des deux bords.
          for (const k of [-1, 1]) for (let q = 0; q < 5; q++) {
            const [px, pz] = local(o, (q / 4 - 0.5) * (t[0] - 0.6), k * (t[1] / 2 + 0.05));
            ajouter(o, 'acc', L.tore(8, Math.PI), matrice(px, y + hm - 0.05, pz, 0, r + (k > 0 ? 0 : Math.PI), Math.PI / 2, 0.22, 0.22, 0.22), { c: C.or });
          }
          // La porte, et une fenêtre éclairée du côté de la caméra (sud-est).
          { const [px, pz] = local(o, -t[0] * 0.18, t[1] / 2 + 0.02); ajouter(o, 'acc', L.boite, matrice(px, y, pz, 0, r, 0, 1.0, 1.75, 0.08), { c: coul('#4a3626') }); }
          { const [px, pz] = local(o, t[0] * 0.22, t[1] / 2 + 0.03); ajouter(o, 'lueur', L.boite, matrice(px, y + 1.0, pz, 0, r, 0, 0.75, 0.6, 0.06), { c: coul('#f5c56a') }); }
          // Sous la fenêtre, une jardinière de fleurs ; près de la porte, un tonneau cerclé.
          { const [px, pz] = local(o, t[0] * 0.22, t[1] / 2 + 0.22); ajouter(o, 'acc', L.boite, matrice(px, y + 0.62, pz, 0, r, 0, 0.95, 0.24, 0.32), { c: C.bois });
            const fl = ['#e8607a', '#f4d36b', '#f6f1e2', '#c98be0'];
            for (let q = 0; q < 5; q++) { const [fx, fz] = local(o, t[0] * 0.22 + (q / 4 - 0.5) * 0.8, t[1] / 2 + 0.22 + ((q % 2) - 0.5) * 0.12); ajouter(o, 'fronde', L.lobes[q % 8], matrice(fx, y + 0.9, fz, 0, q, 0, 0.16, 0.13, 0.16), { c: coul(q % 2 ? '#4f8a44' : '#5e9a4c') }); ajouter(o, 'lueur', L.octa, matrice(fx, y + 1.0, fz, 0, q, 0, 0.08, 0.06, 0.08), { c: fois(coul(fl[(o.index + q) % fl.length]), 0.85) }); } }
          { const [px, pz] = local(o, -t[0] * 0.18 - 0.95, t[1] / 2 + 0.45); ajouter(o, 'acc', L.cyl(8), matrice(px, y - 0.05, pz, 0, 0, 0, 0.36, 0.85, 0.36), { c: C.boisClair, bas: 0.75, haut: 1.05 });
            for (const hh of [0.18, 0.62]) ajouter(o, 'acc', L.cyl(8), matrice(px, y + hh, pz, 0, 0, 0, 0.38, 0.07, 0.38), { c: coul('#5a5048') }); }
          { const [px, pz] = local(o, t[0] / 2 + 0.03, 0); ajouter(o, 'lueur', L.boite, matrice(px, y + 1.0, pz, 0, r + Math.PI / 2, 0, 0.7, 0.55, 0.06), { c: coul('#e8b45a') }); }
          piece(s, 'sil', L.boite, matrice(o.u, y, o.v, 0, r, 0, t[0], hm + haut, t[1]), { c: mur });
          G.cibles.push({ type: 'decor', x: o.u, y: o.v, h: hm + haut, r: Math.max(t[0], t[1]) / 2 });
          break;
        }
        case 'comptoir': {
          const t = o.taille || [5, 2];
          ajouter(o, 'acc', L.boite, matrice(o.u, y, o.v, 0, r, 0, t[0], 1.1, t[1]), { c: C.boisClair, bas: 0.75, haut: 1.05 });
          ajouter(o, 'acc', L.boite, matrice(o.u, y + 1.1, o.v, 0, r, 0, t[0] + 0.2, 0.12, t[1] + 0.2), { c: C.bois });
          // Des marchandises : pains, jarres, une étoffe.
          for (let q = 0; q < 5; q++) { const [px, pz] = local(o, (q / 4 - 0.5) * (t[0] - 1), 0); ajouter(o, 'acc', q % 2 ? L.sphere : L.cyl(6), matrice(px, y + 1.22, pz, 0, 0, 0, 0.22, q % 2 ? 0.18 : 0.4, 0.22), { c: coul(q % 2 ? '#c9934a' : '#7a8fa0') }); }
          break;
        }
        case 'auvent': {
          // Une toile sur quatre poteaux, au-dessus du comptoir.
          const t = [6, 3.2];
          for (const [a, b] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) { const [px, pz] = local(o, a * t[0] / 2, b * t[1] / 2); ajouter(o, 'acc', L.cyl(5), matrice(px, y, pz, 0, 0, 0, 0.09, b < 0 ? 3.1 : 2.6, 0.09), { c: C.bois }); }
          ajouter(o, 'acc', L.boiteC, matrice(o.u, y + 2.85, o.v, 0.16, r, 0, t[0] + 0.6, 0.08, t[1] + 0.5), { c: C.toiles[1] });
          break;
        }
        case 'tour': {
          const t = o.taille || [5, 5], rr = t[0] / 2, hm = 5.2;
          ajouter(o, 'acc', L.cyl(12), matrice(o.u, y - 0.4, o.v, 0, 0, 0, rr, hm + 0.4, rr), { c: C.calcaire, bas: 0.76, haut: 1.04 });
          ajouter(o, 'acc', L.cyl(12), matrice(o.u, y - 0.4, o.v, 0, 0, 0, rr + 0.18, 0.9, rr + 0.18), { c: C.pierreSombre });
          ajouter(o, 'acc', L.cone(12), matrice(o.u, y + hm, o.v, 0, 0, 0, rr + 0.6, 2.8, rr + 0.6), { c: C.ardoise, bas: 0.85, haut: 1.15 });
          ajouter(o, 'lueur', L.sphere, matrice(o.u, y + hm + 2.9, o.v, 0, 0, 0, 0.18, 0.18, 0.18), { c: C.orVif });
          for (let q = 0; q < 6; q++) { const a = q / 6 * 6.283 + 0.4; ajouter(o, 'lueur', L.boite, matrice(o.u + Math.cos(a) * (rr + 0.02), y + 2.6, o.v + Math.sin(a) * (rr + 0.02), 0, -a + Math.PI / 2, 0, 0.5, 0.7, 0.05), { c: coul('#f0be62') }); }
          ajouter(o, 'acc', L.tore(20), matrice(o.u, y + hm - 0.3, o.v, Math.PI / 2, 0, 0, rr + 0.08, rr + 0.08, 0.6), { c: C.or });
          piece(s, 'sil', L.cyl(8), matrice(o.u, y, o.v, 0, 0, 0, rr, hm + 2.5, rr), { c: C.calcaire });
          break;
        }
        case 'pierre_levee': {
          const el = { feu: '#c06a4a', eau: '#4f8f9a', air: '#9a9ec4', terre: '#7a8a50' }[o.element];
          const c = el ? melange(coul(el), C.pierre, 0.35) : C.pierre;
          const h = el ? 2.6 : 2.2;
          ajouter(o, 'roche', L.blocs[o.index % 8], matrice(o.u, y + h * 0.45, o.v, (o.index % 3 - 1) * 0.05, o.index * 1.3, 0, 0.5, h * 0.55, 0.42), { c, bas: 0.7, haut: 1.08, mousse: coul('#7a9a5a') });
          if (el) { ajouter(o, 'lueur', L.octa, matrice(o.u, y + h * 0.7, o.v, 0, 0, 0, 0.12, 0.2, 0.12), { c: coul({ feu: '#ffb347', eau: '#a6f0e4', air: '#dcd6ff', terre: '#c9f06a' }[o.element]) }); G.halos.push({ x: o.u, y: y + h * 0.7, z: o.v, couleur: { feu: '#ffb347', eau: '#a6f0e4', air: '#dcd6ff', terre: '#c9f06a' }[o.element], taille: 2.2, opacite: 0.6 }); }
          break;
        }
        case 'poteau': {
          ajouter(o, 'acc', L.cyl(6), matrice(o.u, y, o.v, 0, 0, 0, 0.16, 1.9, 0.16), { c: C.bois });
          ajouter(o, 'acc', L.cyl(6), matrice(o.u, y + 1.1, o.v, 0, 0, 0.0, 0.32, 0.75, 0.32), { c: coul('#c9b276') });
          ajouter(o, 'acc', L.boiteC, matrice(o.u, y + 1.5, o.v, 0, o.index, 0, 1.2, 0.12, 0.12), { c: C.bois });
          break;
        }
        case 'tonneau': {
          // Un tonneau cerclé, debout.
          ajouter(o, 'acc', L.cyl(8), matrice(o.u, y - 0.05, o.v, 0, r, 0, 0.42, 0.95, 0.42), { c: C.boisClair, bas: 0.75, haut: 1.05, grain: 0.05 });
          for (const hh of [0.2, 0.68]) ajouter(o, 'acc', L.cyl(8), matrice(o.u, y + hh, o.v, 0, r, 0, 0.44, 0.07, 0.44), { c: coul('#5a5048') });
          ajouter(o, 'acc', L.cyl(8), matrice(o.u, y + 0.88, o.v, 0, r, 0, 0.36, 0.05, 0.36), { c: C.boisSombre });
          piece(s, 'sil', L.cyl(6), matrice(o.u, y, o.v, 0, 0, 0, 0.42, 0.9, 0.42), { c: C.boisClair });
          break;
        }
        case 'barriere': {
          // Une barrière de bois : des piquets, deux lisses.
          const lg = o.longueur || 3, n = Math.max(2, Math.round(lg / 1.5));
          for (let q = 0; q <= n; q++) { const [px, pz] = local(o, (q / n - 0.5) * lg, 0); ajouter(o, 'acc', L.boite, matrice(px, (solPlat(px, pz) || y) - 0.05, pz, 0, r, 0, 0.14, 1.05, 0.14), { c: C.bois }); }
          for (const hh of [0.5, 0.9]) { const [ax, az] = local(o, -lg / 2, 0), [bx, bz] = local(o, lg / 2, 0); ajouter(o, 'acc', L.cyl(4), entre(ax, y + hh, az, bx, y + hh, bz, 0.06), { c: C.boisClair }); }
          break;
        }
        case 'linge': {
          // Une corde à linge entre deux piquets, des pièces de toile qui pendent.
          const lg = o.longueur || 4;
          const [ax, az] = local(o, -lg / 2, 0), [bx, bz] = local(o, lg / 2, 0);
          for (const [px, pz] of [[ax, az], [bx, bz]]) ajouter(o, 'acc', L.cyl(5), matrice(px, (solPlat(px, pz) || y) - 0.05, pz, 0, 0, 0, 0.07, 1.75, 0.07), { c: C.boisSombre });
          ajouter(o, 'acc', L.cyl(4), entre(ax, y + 1.68, az, bx, y + 1.68, bz, 0.025), { c: coul('#d8d0c0') });
          const n = Math.max(2, Math.round(lg / 1.1));
          for (let q = 0; q < n; q++) {
            const [px, pz] = local(o, (q / (n - 1) - 0.5) * lg * 0.72, 0);
            const w = 0.55 + (q % 2) * 0.2, h = 0.6 + ((q + 1) % 3) * 0.15;
            ajouter(o, 'acc', L.boiteC, matrice(px, y + 1.66 - h / 2, pz, 0, r, 0, w, h, 0.04), { c: C.toiles[(o.index + q) % C.toiles.length], grain: 0.06 });
          }
          break;
        }
        case 'ratelier': {
          for (const k of [-1, 1]) { const [px, pz] = local(o, k * 1.1, 0); ajouter(o, 'acc', L.boite, matrice(px, y, pz, 0, r, 0, 0.14, 1.3, 0.3), { c: C.bois }); }
          { const [px, pz] = local(o, 0, 0); ajouter(o, 'acc', L.boiteC, matrice(px, y + 1.15, pz, 0, r, 0, 2.4, 0.1, 0.12), { c: C.bois }); }
          for (let q = 0; q < 5; q++) { const [px, pz] = local(o, (q / 4 - 0.5) * 1.8, 0.05); ajouter(o, 'acc', L.cyl(4), matrice(px, y + 0.05, pz, 0.12, 0, 0, 0.04, 1.4, 0.04), { c: q % 2 ? coul('#9aa0aa') : C.boisClair }); }
          break;
        }
        case 'cerf_volant': {
          // Le cerf-volant de Mibbe, accroché au faîte de sa maison.
          const yy = y + 4.6;
          ajouter(o, 'acc', L.octa, matrice(o.u + 1.2, yy + 0.8, o.v - 0.4, 0.2, 0.6, 0.3, 0.55, 0.75, 0.05), { c: coul('#e0603a') });
          for (let q = 0; q < 6; q++) ajouter(o, 'acc', L.boiteC, matrice(o.u + 1.0 - q * 0.25, yy + 0.2 - q * 0.22, o.v - 0.3 + (q % 2) * 0.15, 0, 0, q * 0.4, 0.14, 0.06, 0.06), { c: coul(q % 2 ? '#ffd166' : '#4a90ff') });
          break;
        }
        case 'longue_vue': {
          for (let q = 0; q < 3; q++) { const a = q / 3 * 6.283; ajouter(o, 'acc', L.cyl(4), matrice(o.u + Math.cos(a) * 0.3, y, o.v + Math.sin(a) * 0.3, Math.sin(a) * 0.25, 0, -Math.cos(a) * 0.25, 0.03, 1.15, 0.03), { c: C.boisSombre }); }
          ajouter(o, 'acc', L.cyl(8), matrice(o.u, y + 1.15, o.v, 0, 0, 1.25, 0.09, 1.1, 0.09), { c: coul('#c9a04a') });
          break;
        }
        case 'rambarde': {
          const n = 6;
          for (let q = 0; q <= n; q++) { const [px, pz] = local(o, (q / n - 0.5) * 6, 0); ajouter(o, 'acc', L.cyl(4), matrice(px, solPlat(px, pz) || y, pz, 0, 0, 0, 0.07, 1.0, 0.07), { c: C.bois }); }
          for (const hh of [0.95, 0.5]) { const [ax, az] = local(o, -3, 0), [bx, bz] = local(o, 3, 0); ajouter(o, 'acc', L.cyl(4), entre(ax, y + hh, az, bx, y + hh, bz, 0.05), { c: C.boisClair }); }
          break;
        }
        case 'arche': {
          // La Porte des Sources : deux piliers de calcaire et un arc, dans le muret.
          for (const k of [-1, 1]) { const [px, pz] = local(o, k * 2.0, 0); ajouter(o, 'acc', L.boite, matrice(px, y - 0.3, pz, 0, r, 0, 0.75, 3.6, 0.75), { c: C.calcaire, bas: 0.8, haut: 1.05 }); }
          ajouter(o, 'acc', L.tore(14, Math.PI), matrice(o.u, y + 3.2, o.v, 0, r, 0, 2.0, 2.0, 2.6), { c: C.calcaire });
          ajouter(o, 'lueur', L.sphere, matrice(o.u, y + 5.25, o.v, 0, 0, 0, 0.16, 0.16, 0.16), { c: C.orVif });
          break;
        }
        case 'lanterne': lanterne(o.u, o.v, y, 2.3, s, true); break;
        case 'panneau': {
          ajouter(o, 'acc', L.cyl(5), matrice(o.u, y, o.v, 0, 0, 0, 0.07, 1.5, 0.07), { c: C.boisSombre });
          ajouter(o, 'acc', L.boiteC, matrice(o.u, y + 1.3, o.v, 0, r - 0.6, 0, 1.0, 0.45, 0.07), { c: C.boisClair });
          ajouter(o, 'acc', L.boiteC, matrice(o.u, y + 1.3, o.v, 0, r - 0.6, 0, 0.8, 0.06, 0.08), { c: C.boisSombre });
          G.cibles.push({ type: 'panneau', ref: o.texte || '', x: o.u, y: o.v, h: 1.6, r: 0.6 });
          break;
        }
        case 'tente': {
          const t = o.taille || [3, 3];
          // La toile, sourde, plus sombre au pied ; une bande de couleur cousue à mi-hauteur ; le mât qui
          // dépasse ; deux haubans tendus jusqu'à des piquets.
          const toile = fois(C.toiles[(o.index + 2) % C.toiles.length], 0.82);
          ajouter(o, 'acc', L.cone(4), matrice(o.u, y - 0.1, o.v, 0, r + 0.78, 0, t[0] * 0.72, 2.4, t[1] * 0.72), { c: toile, bas: 0.62, haut: 1.0, grain: 0.05 });
          ajouter(o, 'acc', L.cone(4), matrice(o.u, y + 0.55, o.v, 0, r + 0.78, 0, t[0] * 0.53, 0.14, t[1] * 0.53), { c: fois(coul(['#8a4a3a', '#3f5f7a', '#6a7a3a'][o.index % 3]), 0.9) });
          ajouter(o, 'acc', L.cyl(4), matrice(o.u, y + 2.2, o.v, 0, 0, 0, 0.05, 0.5, 0.05), { c: C.bois });
          for (const k of [-1, 1]) { const [px, pz] = local(o, k * (t[0] * 0.72 + 1.1), 0); ajouter(o, 'acc', L.cyl(3), entre(o.u, y + 2.25, o.v, px, y + 0.05, pz, 0.025), { c: coul('#c9b48a') }); ajouter(o, 'acc', L.cyl(4), matrice(px, y - 0.1, pz, 0, 0, 0.2 * k, 0.05, 0.45, 0.05), { c: C.boisSombre }); }
          { const [px, pz] = local(o, 0, t[1] * 0.35); ajouter(o, 'acc', L.cone(3), matrice(px, y - 0.05, pz, 0, r, 0, 0.55, 1.2, 0.3), { c: coul('#3a2a20') }); }
          break;
        }
        case 'feu': {
          for (let q = 0; q < 7; q++) { const a = q / 7 * 6.283; ajouter(o, 'roche', L.cailloux[q % 8], matrice(o.u + Math.cos(a) * 0.55, y + 0.08, o.v + Math.sin(a) * 0.55, 0, a, 0, 0.2, 0.15, 0.2), { c: C.pierreSombre }); }
          // Trois bûches croisées, couchées au centre du foyer.
          for (let q = 0; q < 3; q++) { const a = q * 1.05, dx = Math.cos(a) * 0.42, dz = Math.sin(a) * 0.42; ajouter(o, 'acc', L.cyl(5), entre(o.u - dx, y + 0.12, o.v - dz, o.u + dx, y + 0.2, o.v + dz, 0.07), { c: C.boisSombre }); }
          ajouter(o, 'lueur', L.cone(5), matrice(o.u, y + 0.15, o.v, 0, 0, 0, 0.3, 0.75, 0.3), { c: C.braise });
          ajouter(o, 'lueur', L.cone(5), matrice(o.u, y + 0.15, o.v, 0, 0.5, 0, 0.16, 1.0, 0.16), { c: coul('#ffe08a') });
          G.halos.push({ x: o.u, y: y + 0.6, z: o.v, couleur: '#ff9a3a', taille: 4.2, opacite: 0.8 });
          G.lanternes.push({ x: o.u, y: y + 0.8, z: o.v });
          G.feux.push({ x: o.u, y: y + 0.6, z: o.v });
          break;
        }
        case 'ruine': {
          // Quatre murs sans toit, de hauteurs inégales, en pierres sèches ; une ouverture au sud.
          for (const f of o.empreinte) {
            if (!f.rect) continue;
            const long = Math.max(f.l, f.p) * 2, ep = Math.min(f.l, f.p) * 2, axe = f.l >= f.p;
            const ang = Math.atan2(f.s, f.c) + (axe ? 0 : Math.PI / 2);
            const n = Math.max(2, Math.round(long / 0.7));
            for (let q = 0; q < n; q++) {
              const t = (q + 0.5) / n - 0.5, px = f.u + Math.cos(ang) * t * long, pz = f.v + Math.sin(ang) * t * long;
              const py = solPlat(px, pz) || y;
              const hcol = 0.8 + 1.6 * M().hache(q, o.index, 5) * (0.6 + 0.4 * Math.cos(t * 3));
              for (let rang = 0; rang < Math.ceil(hcol / 0.45); rang++) {
                const sz = 0.38 + M().hache(q, rang, o.index) * 0.12;
                ajouter(o, 'roche', L.pierres[(q + rang) % 8], matrice(px + (M().hache(rang, q, 2) - 0.5) * 0.12, py - 0.05 + rang * 0.42, pz, 0, -ang, 0, sz * 1.7, 0.44, Math.max(0.55, ep)), { c: fois(C.pierre, 0.82 + M().hache(q, rang, 9) * 0.25), bas: 0.85, haut: 1.05, mousse: coul('#8f9a62') });
              }
            }
          }
          break;
        }
        case 'four': {
          ajouter(o, 'roche', L.lobes[o.index % 8], matrice(o.u, y + 0.1, o.v, 0, 0, 0, 1.0, 0.95, 1.0), { c: C.pierre, bas: 0.75, haut: 1.0 });
          ajouter(o, 'acc', L.boite, matrice(o.u + 0.85, y, o.v + 0.35, 0, -0.4, 0, 0.5, 0.6, 0.1), { c: coul('#2a221c') });
          break;
        }
        case 'puits_sec': {
          ajouter(o, 'roche', L.cyl(10), matrice(o.u, y - 0.2, o.v, 0, 0, 0, 0.95, 1.0, 0.95), { c: C.pierre, bas: 0.8, haut: 1.0 });
          ajouter(o, 'acc', L.disque(10), matrice(o.u, y + 0.75, o.v, 0, 0, 0, 0.72, 1, 0.72), { c: coul('#1a1814') });
          for (const k of [-1, 1]) ajouter(o, 'acc', L.cyl(4), matrice(o.u + k * 0.85, y + 0.5, o.v, 0, 0, 0, 0.07, 1.4, 0.07), { c: C.bois });
          ajouter(o, 'acc', L.cyl(5), matrice(o.u - 0.9, y + 1.8, o.v, 0, 0, Math.PI / 2, 0.06, 1.8, 0.06), { c: C.bois });
          break;
        }
        case 'cairn': {
          // Un tas de pierres, de plus en plus petites ; percé (les cairns des Sources sifflent).
          const h = o.hauteur || 2, n = Math.max(3, Math.round(h / 0.45));
          let yy = y - 0.1;
          for (let q = 0; q < n; q++) {
            const t = q / n, rr = (0.55 + 0.25 * h / 4) * (1 - t * 0.55);
            ajouter(o, 'roche', L.cailloux[(o.index + q) % 8], matrice(o.u + (M().hache(q, o.index, 1) - 0.5) * 0.15, yy + rr * 0.4, o.v + (M().hache(o.index, q, 1) - 0.5) * 0.15, 0, q * 1.7, 0, rr, rr * 0.55, rr * 0.9), { c: fois(C.pierre, 0.85 + M().hache(q, o.index, 3) * 0.2), bas: 0.8, haut: 1.05, mousse: coul('#9aa06a') });
            yy += rr * 0.8;
          }
          if (h >= 3) G.halos.push({ x: o.u, y: yy + 0.3, z: o.v, couleur: '#fff0c0', taille: 2.4, opacite: 0.35 });
          break;
        }
        case 'arbre_bobine': {
          // L'Arbre-Bobine : un tronc énorme enroulé de fil comme une bobine, une frondaison immense.
          const hT = 9;
          ajouter(o, 'acc', L.tronc(10), matrice(o.u, y - 0.4, o.v, 0, 0, 0, 2.1, hT + 1, 2.1), { c: coul('#4a3a30'), bas: 0.7, haut: 1.0 });
          for (let q = 0; q < 16; q++) ajouter(o, 'acc', L.tore(16), matrice(o.u, y + 1.4 + q * 0.32, o.v, Math.PI / 2, 0, 0, 1.92 - q * 0.012, 1.92 - q * 0.012, 2.4), { c: q % 2 ? coul('#e8d9a8') : coul('#d9c690') });
          for (let q = 0; q < 6; q++) { const a = q / 6 * 6.283; ajouter(o, 'acc', L.cone(5), matrice(o.u + Math.cos(a) * 1.7, y - 0.2, o.v + Math.sin(a) * 1.7, Math.sin(a) * 1.0, 0, -Math.cos(a) * 1.0, 0.6, 2.4, 0.6), { c: coul('#3e3028') }); }
          const verts = ['#2f5e4e', '#3d7060', '#356a52', '#4a7a62'].map(coul);
          for (let q = 0; q < 7; q++) {
            const a = q / 7 * 6.283, d = q ? 3.2 : 0, rr = q ? 3.0 : 4.4;
            ajouter(o, 'fronde', L.lobes[q % 8], matrice(o.u + Math.cos(a) * d, y + hT + 2 + (q ? 0.5 : 2), o.v + Math.sin(a) * d, 0, a, 0, rr, rr * 0.85, rr), { c: verts[q % 4], fronde: true });
          }
          piece(s, 'sil', L.lobes[2], matrice(o.u, y + hT + 3, o.v, 0, 0, 0, 6, 4.5, 6), { c: verts[0], fronde: true });
          for (let q = 0; q < 10; q++) { const a = q * 0.9; G.halos.push({ x: o.u + Math.cos(a) * 4.5, y: y + 3 + (q % 4) * 1.6, z: o.v + Math.sin(a) * 4.5, couleur: '#cfe8ff', taille: 0.9, opacite: 0.55 }); }
          break;
        }
        case 'pieu': ajouter(o, 'acc', L.cone(5), matrice(o.u, y - 0.2, o.v, 0, 0, 0.1, 0.18, 1.8, 0.18), { c: C.bois }); break;
        case 'arche_brisee': {
          for (const k of [-1, 1]) {
            const [px, pz] = local(o, k * 1.6, 0), py = solPlat(px, pz) || y, h = k < 0 ? 4.2 : 2.6;
            ajouter(o, 'roche', L.cyl(8), matrice(px, py - 0.2, pz, 0, 0, 0, 0.55, h + 0.2, 0.55), { c: C.gris, bas: 0.8, haut: 1.05, mousse: coul('#7a8a62'), mousseHaut: true });
            ajouter(o, 'roche', L.cyl(8), matrice(px, py - 0.2, pz, 0, 0, 0, 0.72, 0.45, 0.72), { c: fois(C.gris, 0.85) });
          }
          { const [px, pz] = local(o, -0.6, 0); ajouter(o, 'roche', L.boiteC, matrice(px, y + 4.2, pz, 0, r, 0.22, 3.0, 0.55, 0.8), { c: C.gris, bas: 0.85, haut: 1.05 }); }
          { const [px, pz] = local(o, 2.6, 0.8); ajouter(o, 'roche', L.blocs[o.index % 8], matrice(px, (solPlat(px, pz) || y) + 0.25, pz, 0.3, r + 0.6, 0.2, 0.9, 0.35, 0.5), { c: C.gris }); }
          break;
        }
        case 'margelle': {
          // La margelle du Puits : un anneau de pierres taillées, le puits noir dedans, des fils d'or
          // effilochés qui en remontent, une lueur violette.
          // Les pierres se touchent (54 u de tour, 52 pierres de 1,4 u) : plus de trous entre elles.
          const rr = o.rayon || 8, lg = o.largeur || 1.2, n = 52;
          for (let q = 0; q < n; q++) {
            const a = q / n * 6.283, cx = o.u + Math.cos(a) * (rr + lg / 2), cz = o.v + Math.sin(a) * (rr + lg / 2), py = solPlat(cx, cz);
            ajouter(o, 'roche', L.pierres[q % 8], matrice(cx, (Number.isFinite(py) ? py : y) - 0.1, cz, 0, -a, 0, 1.4, 0.7 + M().hache(q, 5, 2) * 0.2, lg * 1.05), { c: fois(C.calcaire, 0.82 + M().hache(q, 3, 1) * 0.15), bas: 0.8, haut: 1.05 });
          }
          // Le puits : la paroi et le fond sont faits par le rendu (Ile3D.puits) ; d'ici, les fils d'or
          // effilochés qui remontent (fins, à huit faces) et la lueur violette qui monte du fond en
          // trois halos, plus un halo d'or au bout de chaque fil.
          const ny = Number.isFinite(y) ? y : 2;
          G.puits = { x: o.u, z: o.v, r: rr, y: ny };
          for (let q = 0; q < 3; q++) {
            const a = 0.7 + q * 0.6, x1 = o.u + Math.cos(a) * 0.5, z1 = o.v + Math.sin(a) * 0.5;
            G.lueur.push({ geo: L.cyl(8), m: entre(o.u + Math.cos(a) * 1.4, ny - 24, o.v + Math.sin(a) * 1.4, x1, ny - 1.2 - q * 0.8, z1, 0.05), c: q % 2 ? C.orVif : C.violet });
            G.halos.push({ x: x1, y: ny - 1.2 - q * 0.8, z: z1, couleur: q % 2 ? '#ffcf5a' : '#c9a0ff', taille: 1.8, opacite: 0.55 });
          }
          G.halos.push({ x: o.u, y: ny - 2, z: o.v, couleur: '#a66cff', taille: 12, opacite: 0.35 });
          G.halos.push({ x: o.u, y: ny - 7, z: o.v, couleur: '#8a5ad8', taille: 10, opacite: 0.35 });
          G.halos.push({ x: o.u, y: ny - 14, z: o.v, couleur: '#6a3ab8', taille: 9, opacite: 0.4 });
          break;
        }
        case 'treuil': {
          for (const k of [-1, 1]) ajouter(o, 'acc', L.boite, matrice(o.u + k * 0.75, y, o.v, 0, 0.4, 0, 0.18, 1.7, 0.18), { c: C.bois });
          ajouter(o, 'acc', L.cyl(10), matrice(o.u - 0.8, y + 1.3, o.v, 0, 0.4, Math.PI / 2, 0.32, 1.6, 0.32), { c: C.boisClair });
          ajouter(o, 'acc', L.cyl(8), matrice(o.u - 0.8, y + 1.3, o.v, 0, 0.4, Math.PI / 2, 0.36, 0.9, 0.36), { c: coul('#c9b06a') });
          G.cibles.push({ type: 'decor', x: o.u, y: o.v, h: 1.8, r: 0.8 });
          break;
        }
        case 'plateforme': {
          for (let q = -3; q <= 3; q++) { const [px, pz] = local(o, q * 0.62, 0); ajouter(o, 'acc', L.boiteC, matrice(px, y + 0.05, pz, 0, r, 0, 0.56, 0.14, 4.6), { c: fois(C.boisClair, 0.85 + (q & 1) * 0.12) }); }
          for (const [a, b] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) { const [px, pz] = local(o, a * 2.1, b * 2.2); ajouter(o, 'acc', L.cyl(5), matrice(px, y - 1.5, pz, 0, 0, 0, 0.14, 2.9, 0.14), { c: C.bois }); }
          break;
        }
        case 'nacelle': {
          // La Nacelle : une corbeille de bois pendue à une potence au bout de la plateforme, au-dessus
          // du vide ; le fil d'or part de son fond et descend dans les nuages, vers Orsane.
          const ny = yNacelle;
          ajouter(o, 'acc', L.cyl(10), matrice(o.u, ny + 0.2, o.v, 0, 0, 0, 1.15, 1.1, 1.15), { c: C.boisClair, bas: 0.75, haut: 1.05 });
          ajouter(o, 'acc', L.tore(14), matrice(o.u, ny + 1.3, o.v, Math.PI / 2, 0, 0, 1.15, 1.15, 0.8), { c: C.bois });
          for (let q = 0; q < 4; q++) { const a = q / 4 * 6.283 + 0.4; ajouter(o, 'acc', L.cyl(3), entre(o.u + Math.cos(a) * 1.1, ny + 1.3, o.v + Math.sin(a) * 1.1, o.u, ny + 4.2, o.v, 0.03), { c: coul('#c9a46a') }); }
          ajouter(o, 'acc', L.tore(10), matrice(o.u, ny + 4.2, o.v, Math.PI / 2, 0, 0, 0.25, 0.25, 0.8), { c: C.bois });
          if (plateforme) {
            // La potence : un mât planté au bord de la plateforme, un bras jusqu'au-dessus de la corbeille.
            const dx = o.u - plateforme.u, dz = o.v - plateforme.v, dl = Math.hypot(dx, dz) || 1;
            const mx = plateforme.u + dx / dl * 2.2, mz = plateforme.v + dz / dl * 2.2, my = solPlat(plateforme.u, plateforme.v);
            ajouter(o, 'acc', L.cyl(6), matrice(mx, my - 0.3, mz, 0, 0, 0, 0.16, ny + 5.4 - my, 0.16), { c: C.bois, bas: 0.8, haut: 1.05 });
            ajouter(o, 'acc', L.cyl(5), entre(mx, ny + 5.0, mz, o.u, ny + 5.0, o.v, 0.12), { c: C.boisClair });
            ajouter(o, 'acc', L.cyl(5), entre(mx, ny + 3.6, mz, mx + (o.u - mx) * 0.45, ny + 5.0, mz + (o.v - mz) * 0.45, 0.08), { c: C.bois });
            ajouter(o, 'acc', L.cyl(3), entre(o.u, ny + 5.0, o.v, o.u, ny + 4.3, o.v, 0.04), { c: coul('#c9a46a') });
          }
          G.lueur.push({ geo: L.cyl(6), m: entre(o.u, ny - 0.3, o.v, o.u - 3, -150, o.v + 2, 0.09), c: C.orVif });
          G.halos.push({ x: o.u, y: ny - 0.6, z: o.v, couleur: '#ffcf5a', taille: 3, opacite: 0.5 });
          break;
        }
        case 'fil_d_or': {
          // Le fil d'or de l'amarre : il sort du dessous de la pointe sud-ouest et descend dans les
          // nuages vers Orsane ; un second brin monte jusqu'à la Nacelle.
          G.lueur.push({ geo: L.cyl(8), m: entre(o.u - 6, -160, o.v + 4, o.u, -3, o.v, 0.35), c: C.orVif });
          for (let q = 0; q < 6; q++) G.halos.push({ x: o.u - q * 1.0, y: -6 - q * 22, z: o.v + q * 0.7, couleur: '#ffc65a', taille: 7 - q * 0.5, opacite: 0.5 - q * 0.05 });
          break;
        }
        default: break;
      }
    }
    // Des lanternes de plus le long des ruelles et des places : le village est éclairé en permanence.
    for (const l of T.lignes) {
      if (l.sorte !== 'ruelle') continue;
      const pas = 9;
      for (let d = 4; d < l.longueur - 2; d += pas) {
        const p = IleTerrain.pointA(l.pts, IleTerrain.cumul(l.pts), d), q = IleTerrain.pointA(l.pts, IleTerrain.cumul(l.pts), d + 0.5);
        const tx = q[0] - p[0], tz = q[1] - p[1], n = Math.sqrt(tx * tx + tz * tz) || 1;
        const u = p[0] - tz / n * (l.demi + 0.5), v = p[1] + tx / n * (l.demi + 0.5), y = solPlat(u, v);
        if (!Number.isFinite(y) || T.objets.some(o => (o.u - u) ** 2 + (o.v - v) ** 2 < 6)) continue;
        lanterne(u, v, y, 2.1, seau(u, v), false);
      }
    }
    for (const r of T.relais) if (!T.objets.some(o => o.sorte === 'metier' && Math.hypot(o.u - r.u, o.v - r.v) < 6) && !T.objets.some(o => o.sorte === 'relais' && Math.hypot(o.u - r.u, o.v - r.v) < 4)) {
      const y = solPlat(r.u, r.v), s = seau(r.u, r.v);
      piece(s, 'acc', L.cyl(8), matrice(r.u, y - 0.2, r.v, 0, 0, 0, 1.1, 0.6, 1.1), { c: C.pierre });
      piece(s, 'lueur', L.octa, matrice(r.u, y + 2.2, r.v, 0, 0.4, 0, 0.4, 0.85, 0.4), { c: C.cristal });
      G.halos.push({ x: r.u, y: y + 2.2, z: r.v, couleur: '#5ad8ff', taille: 4, opacite: 0.6 });
    }
    // Le relais des Mailles : un cristal au-dessus du Métier.
    for (const r of T.relais) G.cibles.push({ type: 'relais', ref: r.carte, x: r.u, y: r.v, h: 3, r: 1.4 });
    for (const p of T.portes) G.cibles.push({ type: 'porte', ref: p.carte, x: p.u, y: p.v, h: 2.4, r: 1.2 });
  }

  // ----- Les lignes : murets, haies, ponts, escaliers, gués, berges -----

  function lignes(ctx, L, seau, piece, sol, palette, G) {
    const { T } = ctx;
    const pierre = coul('#bdb5a2'), pierreMurets = coul('#c2b89e'), bois = coul('#6a4e3a'), boisClair = coul('#8a6a4a');
    const dansPlage = (plages, s) => (plages || []).some(p => s >= p[0] && s <= p[1]);
    for (const l of T.lignes) {
      const cum = IleTerrain.cumul(l.pts), Lg = cum[cum.length - 1];
      const at = d => IleTerrain.pointA(l.pts, cum, d);
      const dir = d => { const a = at(Math.max(0, d - 0.3)), b = at(Math.min(Lg, d + 0.3)); return Math.atan2(b[1] - a[1], b[0] - a[0]); };
      if (l.sorte === 'muret') {
        // Pierre sèche : deux rangs de blocs, la mousse sur le dessus, ouvert aux brèches.
        const pas = 0.62, c0 = l.id === 'muret_des_mailles' ? coul('#e2dac8') : pierreMurets;
        for (let d = 0.3; d < Lg; d += pas) {
          if (dansPlage(l.breches, d)) continue;
          const p = at(d), y = sol(p[0], p[1]);
          if (!Number.isFinite(y) || T.videA(p[0], p[1])) continue;
          const a = dir(d), s = seau(p[0], p[1]), hh = (l.hauteur || 1);
          for (let rang = 0; rang < 2; rang++) {
            const k = M().hache(Math.round(d * 10), rang, 4);
            piece(s, 'roche', L.pierres[(Math.round(d * 7) + rang) % 8], matrice(p[0], y - 0.08 + rang * hh * 0.42, p[1], 0, -a + (k - 0.5) * 0.2, 0, 0.66 + k * 0.14, 0.44 * hh, 0.8), { c: fois(c0, 0.8 + k * 0.22), bas: 0.8, haut: 1.05, mousse: coul('#8f9a62') });
          }
          if (Math.round(d / pas) % 6 === 0) piece(s, 'sil', L.boite, matrice(p[0], y, p[1], 0, -a, 0, pas * 6, hh, 0.7), { c: c0 });
        }
      } else if (l.sorte === 'haie') {
        // Une haie épaisse : des lobes de feuillage serrés, plus sombres au pied ; les barrières de bois.
        const barr = (l.barrieres || []).map(b => b.plage);
        for (let d = 0.4; d < Lg; d += 0.85) {
          const p = at(d), y = sol(p[0], p[1]);
          if (!Number.isFinite(y) || T.videA(p[0], p[1]) || dansPlage(l.breches, d) || dansPlage(barr, d)) continue;
          const s = seau(p[0], p[1]), pal = palette(p[0], p[1]);
          const f = (pal.feuillages || ['#5f8f4f']).map(coul);
          const k = M().hache(Math.round(d * 10), 3, 9), hh = (l.hauteur || 1.3);
          piece(s, 'fronde', L.lobes[Math.round(d * 3) % 8], matrice(p[0], y + hh * 0.45, p[1], 0, d, 0, 0.75 + k * 0.2, hh * 0.62, 0.7 + k * 0.15), { c: fois(melange(f[0], f[1] || f[0], k), 0.78), fronde: true });
          if (Math.round(d / 0.85) % 5 === 0) piece(s, 'sil', L.lobes[1], matrice(p[0], y + hh * 0.45, p[1], 0, 0, 0, 2.2, hh * 0.6, 0.9), { c: f[0], fronde: true });
        }
        for (const b of l.barrieres || []) {
          const d0 = b.plage[0], d1 = b.plage[1], dm = (d0 + d1) / 2, p = at(dm), y = sol(p[0], p[1]), a = dir(dm), s = seau(p[0], p[1]);
          const w = d1 - d0;
          for (const k of [-1, 1]) { const q = at(dm + k * w / 2); piece(s, 'acc', L.cyl(5), matrice(q[0], sol(q[0], q[1]) - 0.2, q[1], 0, 0, 0, 0.13, 1.7, 0.13), { c: bois }); }
          for (const hh of [0.45, 0.9, 1.3]) piece(s, 'acc', L.boiteC, matrice(p[0], y + hh, p[1], 0, -a, 0, w, 0.13, 0.08), { c: boisClair });
          piece(s, 'acc', L.boiteC, matrice(p[0], y + 0.88, p[1], 0, -a, Math.atan2(0.85, w), Math.sqrt(w * w + 0.7), 0.1, 0.07), { c: boisClair });
          G.cibles.push({ type: 'decor', x: p[0], y: p[1], h: 1.5, r: 1.2 });
        }
      } else if (l.sorte === 'pont') {
        const pont = T.ponts.find(p => p.id === l.id);
        if (!pont) continue;
        const corde = pont.matiere === 'corde';
        const pcum = IleTerrain.cumul(pont.pts), PL = pcum[pcum.length - 1];
        const tab = d => { const t = d / PL; return pont.ha + (pont.hb - pont.ha) * t - pont.fleche * 4 * t * (1 - t); };
        const pAt = d => IleTerrain.pointA(pont.pts, pcum, d);
        const pDir = d => { const a = pAt(Math.max(0, d - 0.3)), b = pAt(Math.min(PL, d + 0.3)); return Math.atan2(b[1] - a[1], b[0] - a[0]); };
        const pas = corde ? 0.42 : 0.5;
        let prec = null;
        for (let d = 0; d <= PL + 1e-6; d += pas) {
          const p = pAt(d), y = tab(d), a = pDir(d), s = seau(p[0], p[1]);
          piece(s, 'acc', L.boiteC, matrice(p[0], y - 0.07, p[1], 0, -a, (M().hache(Math.round(d * 10), 1, 1) - 0.5) * 0.06, 0.34, 0.12, pont.demi * 2 + 0.2), { c: fois(boisClair, 0.8 + M().hache(Math.round(d * 10), 2, 2) * 0.3) });
          // Les rambardes : des cordes (pont de cordes) ou des lisses (passerelle), tendues entre poteaux.
          const nx = -Math.sin(a), nz = Math.cos(a);
          for (const k of [-1, 1]) {
            const px = p[0] + nx * k * (pont.demi + 0.05), pz = p[1] + nz * k * (pont.demi + 0.05);
            if (prec) piece(s, 'acc', L.cyl(4), entre(prec[k > 0 ? 0 : 1][0], prec[k > 0 ? 0 : 1][1], prec[k > 0 ? 0 : 1][2], px, y + 1.0, pz, corde ? 0.035 : 0.05), { c: corde ? coul('#c9a46a') : bois });
            if (Math.round(d / pas) % (corde ? 5 : 4) === 0) piece(s, 'acc', L.cyl(4), matrice(px, y - (corde ? 0.1 : 0.3), pz, 0, 0, 0, 0.06, corde ? 1.15 : 1.35, 0.06), { c: bois });
          }
          prec = [[p[0] + nx * (pont.demi + 0.05), y + 1.0, p[1] + nz * (pont.demi + 0.05)], [p[0] - nx * (pont.demi + 0.05), y + 1.0, p[1] - nz * (pont.demi + 0.05)]];
        }
        // Les pieux aux deux bouts.
        for (const d of [0, PL]) { const p = pAt(d), a = pDir(d), s = seau(p[0], p[1]); for (const k of [-1, 1]) piece(s, 'acc', L.cyl(6), matrice(p[0] - Math.sin(a) * k * (pont.demi + 0.25), tab(d) - 1.2, p[1] + Math.cos(a) * k * (pont.demi + 0.25), 0, 0, 0, 0.16, 2.8, 0.16), { c: fois(bois, 0.85) }); }
      } else if (l.sorte === 'escalier') {
        // Des marches de calcaire taillées, de la première hauteur à la dernière.
        const n = l.marches || Math.round(Lg / 0.55);
        const [h0, h1] = l.hauts || [sol(l.pts[0][0], l.pts[0][1]), sol(l.pts[l.pts.length - 1][0], l.pts[l.pts.length - 1][1])];
        for (let q = 0; q < n; q++) {
          const d = (q + 0.5) / n * Lg, p = at(d), a = dir(d), y = h0 + (h1 - h0) * (q + 1) / n, s = seau(p[0], p[1]);
          piece(s, 'acc', L.boite, matrice(p[0], y - 0.9, p[1], 0, -a, 0, Lg / n + 0.04, 0.9, l.largeur + 0.2), { c: fois(coul('#c9c0ae'), 0.84 + (q % 2) * 0.08), bas: 0.68, haut: 1.0 });
        }
        for (const k of [-1, 1]) for (let q = 0; q <= n; q += 2) {
          const d = q / n * Lg, p = at(d), a = dir(d), y = h0 + (h1 - h0) * q / n, s = seau(p[0], p[1]);
          piece(s, 'roche', L.pierres[q % 8], matrice(p[0] - Math.sin(a) * k * (l.largeur / 2 + 0.35), y - 0.3, p[1] + Math.cos(a) * k * (l.largeur / 2 + 0.35), 0, -a, 0, 0.85, 0.9, 0.65), { c: pierre, bas: 0.8, haut: 1.05 });
        }
      } else if (l.sorte === 'gue') {
        // Des pierres plates pour traverser.
        for (let d = 0.6; d < Lg; d += 0.9) {
          const p = at(d), y = T.solBrutA(p[0], p[1]), e = T.eauA(p[0], p[1]), s = seau(p[0], p[1]);
          const top = e != null ? Math.max(y + 0.15, e + 0.06) : y + 0.12;
          for (const k of [-0.6, 0.6]) {
            const a = dir(d), px = p[0] - Math.sin(a) * k * (l.largeur / 3), pz = p[1] + Math.cos(a) * k * (l.largeur / 3);
            piece(s, 'roche', L.cailloux[Math.round(d * 5 + k * 3 + 8) % 8], matrice(px, top - 0.18, pz, 0, d, 0, 0.42, 0.22, 0.36), { c: coul('#b8b0a0'), bas: 0.8, haut: 1.1, mousse: coul('#7a9a62') });
          }
        }
      } else if (l.sorte === 'ravin' || l.sorte === 'ru') {
        // Des galets le long des berges.
        const graine = M().cle(l.id);
        const R = M().hasard(graine);
        for (let d = 1; d < Lg; d += l.sorte === 'ravin' ? 1.4 : 2.6) {
          if (R() < 0.35) continue;
          const p = at(d), a = dir(d), k = R() < 0.5 ? -1 : 1, off = l.sorte === 'ravin' ? 1.2 + R() * 1.6 : l.demi + 0.3 + R() * 0.4;
          const px = p[0] - Math.sin(a) * k * off, pz = p[1] + Math.cos(a) * k * off, y = sol(px, pz);
          if (!Number.isFinite(y) || T.videA(px, pz)) continue;
          const r = 0.2 + R() * (l.sorte === 'ravin' ? 0.5 : 0.25);
          piece(seau(px, pz), 'roche', L.cailloux[Math.floor(R() * 8)], matrice(px, y + r * 0.15, pz, 0, R() * 6, 0, r, r * 0.55, r * 0.8), { c: coul('#9f9a8e'), bas: 0.8, haut: 1.08, mousse: coul('#6f9a5c') });
        }
      }
    }
  }

  // ----- Les obstacles des aires de combat (docs/ILE-TECHNIQUE.md, 5.2 et 5.4) -----
  // Les plans cuits posent des pierres (#) et des troncs (T) que le terrain n'a pas : ils sont
  // dessinés ici une fois, pour l'exploration (la navigation les contourne) comme pour le combat.
  // Un # que le terrain porte déjà (muret, haie, objet posé) n'est pas redessiné. Les virgules (,)
  // sont des fleurs ou du gravier. Les aires se recouvrent : chaque case n'est posée qu'une fois.
  function obstaclesAires(ctx, L, seau, piece, sol, palette) {
    const { T } = ctx;
    const N = 15, cases = new Map();
    const STYLE_DIESE = { pierres: 1, murets: 1, bornes: 1, libre: 1 };
    for (const a of T.aires || []) {
      if (!a.layout) continue;
      for (let cy = 0; cy < N; cy++) for (let cx = 0; cx < N; cx++) {
        const c = a.layout[cy][cx];
        if (c !== '#' && c !== 'T' && c !== ',') continue;
        const X = a.x + cx, Y = a.y + cy, k = X + ',' + Y;
        const e = cases.get(k);
        if (!e) cases.set(k, { X, Y, c, style: c === '#' && STYLE_DIESE[a.style] ? a.style : null });
        else if (c === '#' && !e.style && STYLE_DIESE[a.style]) e.style = a.style;
      }
    }
    const est = (X, Y, c) => { const e = cases.get(X + ',' + Y); return !!e && e.c === c; };
    const TRONC = coul('#5a4636'), TRONC_BOIS = coul('#4a3a30'), MOUSSE = coul('#6f9a5c');
    for (const e of cases.values()) {
      if (e.c !== ',' && IleTerrain.caseAire(T, e.X, e.Y).c !== '.') continue;
      const u = e.X + 0.5, v = e.Y + 0.5, y = sol(u, v);
      if (!Number.isFinite(y)) continue;
      const s = seau(u, v), pal = palette(u, v), z = T.zoneA(u, v);
      const R = M().hasard(M().hache(e.X, e.Y, 4242) * 4294967296 >>> 0);
      const roche = coul(pal.roche || '#c9c3b2');
      if (e.c === 'T') {
        // Une souche, ses racines et un coussin de mousse : un tronc mort que la vue ne traverse pas.
        const bois = z === 'ervane_bois', r = 0.3 + R() * 0.1, h = 0.95 + R() * 0.55;
        const c0 = fois(bois ? TRONC_BOIS : TRONC, 0.85 + R() * 0.25);
        piece(s, 'acc', L.tronc(7), matrice(u + (R() - 0.5) * 0.12, y - 0.15, v + (R() - 0.5) * 0.12, (R() - 0.5) * 0.08, R() * 6.28, (R() - 0.5) * 0.08, r, h, r), { c: c0, bas: 0.68, haut: 1.08 });
        for (let q = 0; q < 3; q++) {
          const a = R() * 6.283;
          piece(s, 'acc', L.cone(4), matrice(u + Math.cos(a) * r * 0.75, y - 0.12, v + Math.sin(a) * r * 0.75, Math.sin(a) * 1.25, 0, -Math.cos(a) * 1.25, 0.11, 0.42 + R() * 0.2, 0.11), { c: fois(c0, 0.82) });
        }
        // Le haut : une tranche de bois claire (la souche se lit comme un tronc coupé, pas comme un
        // anneau sombre), puis un coussin de mousse sur un bord ; dans `acc`, tramés en combat là où
        // ils couvrent une case (Ile3D.fonduHouppiers), pas dans `fronde`, qui s'efface en entier.
        piece(s, 'acc', L.cyl(7), matrice(u, y - 0.15 + h - 0.06, v, 0, R() * 6.28, 0, r * 0.64, 0.08, r * 0.64), { c: fois(coul('#d9b98a'), 0.9 + R() * 0.2) });
        { const a = R() * 6.283; piece(s, 'acc', L.lobes[Math.floor(R() * 8)], matrice(u + Math.cos(a) * r * 0.45, y - 0.15 + h - 0.1, v + Math.sin(a) * r * 0.45, 0, R() * 3, 0, r * 0.62, 0.16, r * 0.62), { c: bois ? coul('#4f7a46') : MOUSSE, grain: 0.1 }); }
        piece(s, 'sil', L.cyl(5), matrice(u, y, v, 0, 0, 0, r, h, r), { c: c0 });
      } else if (e.c === '#') {
        if (e.style === 'murets') {
          // Un bout de muret de pierre sèche, dans le sens de ses voisins.
          const hor = est(e.X - 1, e.Y, '#') || est(e.X + 1, e.Y, '#');
          const vert = est(e.X, e.Y - 1, '#') || est(e.X, e.Y + 1, '#');
          const a = hor || !vert ? 0 : Math.PI / 2;
          for (let rang = 0; rang < 2; rang++) for (let q = 0; q < 2; q++) {
            const k = R(), off = (q - 0.5) * 0.5;
            piece(s, 'roche', L.pierres[Math.floor(R() * 8)], matrice(u + Math.cos(a) * off, y - 0.08 + rang * 0.4, v + Math.sin(a) * off, 0, -a + (k - 0.5) * 0.2, 0, 0.56 + k * 0.12, 0.44, 0.78), { c: fois(coul('#c2b89e'), 0.8 + k * 0.22), bas: 0.8, haut: 1.05, mousse: coul('#8f9a62') });
          }
          piece(s, 'sil', L.boite, matrice(u, y, v, 0, -a, 0, 1, 0.9, 0.7), { c: coul('#c2b89e') });
        } else if (e.style === 'bornes') {
          // Une borne levée, plus haute qu'un Veilleur à genoux.
          const r = 0.4 + R() * 0.06, h = 1.35 + R() * 0.45;
          piece(s, 'roche', L.blocs[Math.floor(R() * 8)], matrice(u, y + h * 0.42, v, (R() - 0.5) * 0.1, R() * 6.28, (R() - 0.5) * 0.1, r * 0.95, h * 0.62, r * 0.82), { c: fois(roche, 0.95), bas: 0.72, haut: 1.08, mousse: coul('#8a9a6a') });
          piece(s, 'sil', L.cailloux[0], matrice(u, y + 0.3, v, 0, 0, 0, r, h * 0.5, r), { c: fois(roche, 0.8) });
        } else {
          // Un rocher (ou deux) qui tient la case.
          const r = 0.46 + R() * 0.1, ey = 0.7 + R() * 0.25;
          const mousse = z === 'ervane_bois' || z === 'ervane_sources' ? MOUSSE : z === 'ervane_murets' ? coul('#a9a46a') : null;
          piece(s, 'roche', (ctx.telephone ? L.cailloux : L.galets)[Math.floor(R() * 8)], matrice(u, y + r * ey * 0.3, v, 0, R() * 6.28, 0, r, r * ey * 1.15, r * (0.85 + R() * 0.2)), { c: fois(roche, 0.85), bas: 0.72, haut: 1.06, mousse });
          if (R() < 0.5) { const a = R() * 6.28; piece(s, 'roche', L.cailloux[Math.floor(R() * 8)], matrice(u + Math.cos(a) * 0.32, y + 0.05, v + Math.sin(a) * 0.32, 0, a, 0, 0.2, 0.15, 0.17), { c: fois(roche, 0.8), bas: 0.75, haut: 1.05 }); }
          piece(s, 'sil', L.cailloux[1], matrice(u, y + 0.2, v, 0, 0, 0, r, r * 0.7, r), { c: fois(roche, 0.8) });
        }
      } else {
        // Une case fleurie (Sources, Mailles, Bois) ou caillouteuse (Murets, Amarre).
        const fleurie = z === 'ervane_sources' || z === 'ervane_mailles' || z === 'ervane_bois';
        const cols = z === 'ervane_sources' ? ['#ffb347', '#a6f0e4', '#dcd6ff', '#c9f06a'] : z === 'ervane_bois' ? ['#e8f0ff', '#bcd8ff', '#f6f1e2'] : ['#fff6dc', '#f6d36b', '#eab8dc', '#bcd8ff'];
        const n = fleurie ? 4 + Math.floor(R() * 3) : 3 + Math.floor(R() * 3);
        for (let q = 0; q < n; q++) {
          const fx = u + (R() - 0.5) * 0.8, fz = v + (R() - 0.5) * 0.8, fy = sol(fx, fz);
          if (!Number.isFinite(fy)) continue;
          if (fleurie) piece(s, 'lueur', L.octa, matrice(fx, fy + 0.13, fz, 0, R() * 6.28, 0, 0.09, 0.055, 0.09), { c: fois(coul(cols[Math.floor(R() * cols.length)]), 0.9) });
          else { const r = 0.07 + R() * 0.08; piece(s, 'roche', L.cailloux[Math.floor(R() * 8)], matrice(fx, fy + r * 0.2, fz, 0, R() * 6.28, 0, r, r * 0.6, r * 0.85), { c: fois(coul('#b4ad9e'), 0.85 + R() * 0.2), bas: 0.8, haut: 1.05 }); }
        }
      }
    }
  }

  // Les cases d'obstacle des aires que le terrain n'a pas (pour les ombres peintes) : [{ X, Y, c }].
  function obstaclesDesAires(T) {
    const N = 15, vus = new Set(), out = [];
    for (const a of T.aires || []) {
      if (!a.layout) continue;
      for (let cy = 0; cy < N; cy++) for (let cx = 0; cx < N; cx++) {
        const c = a.layout[cy][cx];
        if (c !== '#' && c !== 'T') continue;
        const X = a.x + cx, Y = a.y + cy, k = X + ',' + Y;
        if (vus.has(k)) continue;
        vus.add(k);
        if (IleTerrain.caseAire(T, X, Y).c === '.') out.push({ X, Y, c });
      }
    }
    return out;
  }

  // ======================================================================
  // Les grandes pièces : eau, falaises, dessous de l'île, escarpements, chute, nuages
  // ======================================================================

  // L'eau : un quad par case du treillis mouillée, au niveau de l'eau (celui des coins mouillés),
  // débordant d'une demi-case pour que la rive se fonde par la profondeur.
  function eau(T) {
    const pos = [], idx = [];
    const { W, H } = T;
    // Le niveau de l'eau d'un sommet du treillis, ou celui de son voisin mouillé le plus proche (la
    // nappe déborde d'une case autour de l'eau ; le shader coupe à la rive d'après la profondeur).
    const niveau = (u, v) => {
      if (u < 0 || v < 0 || u >= W || v >= H) return NaN;
      const e = T.eau[v * W + u];
      if (e === e) return e;
      let s = 0, n = 0;
      for (let dv = -1; dv <= 1; dv++) for (let du = -1; du <= 1; du++) {
        const x = u + du, y = v + dv;
        if (x < 0 || y < 0 || x >= W || y >= H) continue;
        const f = T.eau[y * W + x];
        if (f === f) { s += f; n++; }
      }
      return n ? s / n : NaN;
    };
    for (let v = 0; v < H - 1; v++) for (let u = 0; u < W - 1; u++) {
      // Rien dans le vide : le Ru Clair est tracé jusqu'au large, son eau s'arrête au bord (le
      // matériau coupe le reste au contour, comme le sol).
      const i0 = v * W + u;
      if (T.vide[i0] && T.vide[i0 + 1] && T.vide[i0 + W] && T.vide[i0 + W + 1]) continue;
      const niv = [niveau(u, v), niveau(u + 1, v), niveau(u, v + 1), niveau(u + 1, v + 1)];
      let s = 0, n = 0;
      for (const e of niv) if (e === e) { s += e; n++; }
      if (!n) continue;
      const moy = s / n;
      const b = pos.length / 3;
      const h = k => (niv[k] === niv[k] ? niv[k] : moy);
      pos.push(u, h(0), v, u + 1, h(1), v, u, h(2), v + 1, u + 1, h(3), v + 1);
      idx.push(b, b + 2, b + 1, b + 1, b + 2, b + 3);
    }
    if (!idx.length) return null;
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    geo.setIndex(idx);
    geo.computeBoundingSphere();
    return geo;
  }

  // Les faces des escarpements (IleSol.falaises) : un ruban de strates de la hauteur du plateau à
  // sous le pied, gonflé de rochers vers le bas ; la mousse déborde de la lèvre (texture).
  function escarpements(faces) {
    const pos = [], uv = [], col = [], idx = [];
    const K = 7;
    for (const f of faces) {
      const E = f.ech, base = pos.length / 3;
      let s = 0;
      for (let k = 0; k < E.length; k++) {
        const e = E[k];
        if (k) s += Math.hypot(E[k].u - E[k - 1].u, E[k].v - E[k - 1].v);
        const vers = e.cote;            // vers le haut ; la face regarde vers le bas
        const nx = -e.nx * vers, nz = -e.ny * vers;
        const haut = e.vrai ? e.haut + 0.08 : e.bas + 0.05, bas = e.bas - 0.7;
        for (let j = 0; j < K; j++) {
          const t = j / (K - 1);
          const bosse = j === 0 ? -0.08 : j === K - 1 ? 0.55 : 0.15 + 0.55 * M().bruit(s / 2.6, t * 2.5, 71) * Math.sin(t * Math.PI);
          const x = e.u + nx * bosse, z = e.v + nz * bosse, y = haut + (bas - haut) * (t * t * (3 - 2 * t) * 0.6 + t * 0.4);
          pos.push(x, y, z);
          // La texture couvre la face de haut en bas une seule fois (la mousse de la lèvre en haut).
          uv.push(s / 9, t);
          const ombre = 1 - t * 0.35;
          col.push(ombre, ombre, ombre);
        }
      }
      for (let k = 0; k + 1 < E.length; k++) {
        if (!E[k].vrai && !E[k + 1].vrai) continue;
        for (let j = 0; j + 1 < K; j++) {
          const a = base + k * K + j, b = base + (k + 1) * K + j;
          // La face regarde vers le bas du relief : (a, b, a + 1) a pour normale l'opposée de la
          // normale gauche du tracé, qui regarde le côté bas quand le haut est à gauche (cote > 0).
          if (E[k].cote > 0) idx.push(a, b, a + 1, b, b + 1, a + 1); else idx.push(a, a + 1, b, b, a + 1, b + 1);
        }
      }
    }
    if (!idx.length) return null;
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    geo.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
    geo.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
    geo.setIndex(idx);
    geo.computeVertexNormals();
    geo.computeBoundingSphere();
    return geo;
  }

  // Une polyligne (fermée ou non) rééchantillonnée à pas régulier le long de sa longueur.
  function reechantillonner(pts, pas, ferme) {
    const n = pts.length;
    if (n < 2) return pts.slice();
    const seg = [];
    let total = 0;
    const m = ferme ? n : n - 1;
    for (let i = 0; i < m; i++) { const a = pts[i], b = pts[(i + 1) % n], l = Math.hypot(b[0] - a[0], b[1] - a[1]); seg.push(l); total += l; }
    const k = Math.max(ferme ? 3 : 2, Math.round(total / pas));
    const out = [], d = total / (ferme ? k : k - 1);
    let i = 0, acc = 0;
    for (let q = 0; q < k; q++) {
      const cible = q * d;
      while (i < m - 1 && acc + seg[i] < cible) { acc += seg[i]; i++; }
      const t = seg[i] ? Math.min(1, Math.max(0, (cible - acc) / seg[i])) : 0, a = pts[i], b = pts[(i + 1) % n];
      out.push([a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t]);
    }
    return out;
  }

  // La falaise du bord de l'île : un ruban autour du contour (et de l'Échancrure), de la lèvre
  // jusqu'à 30 u sous l'île, bruité, qui rentre vers le cône ; le cône du dessous, cousu, qui se
  // fond dans la brume ; des rochers suspendus. `telephone` : 220 colonnes au lieu de 320.
  const PROFIL = [[0.05, 0], [0.35, -0.9], [0.55, -2.6], [0.2, -5.5], [-0.8, -9.5], [-2.8, -14], [-6, -20], [-11, -27], [-17, -34]];
  function falaiseBord(T, telephone) {
    const pos = [], uv = [], col = [], idx = [];
    const H = (u, v) => { const h = T.hauteurA(u, v); return Number.isFinite(h) ? h : T.solBrutA(u, v); };
    const contours = [{ pts: T.contour, sens: 1 }];
    if (T.echancrure) contours.push({ pts: T.echancrure, sens: -1 });
    const suspendus = [];
    for (const c of contours) {
      // Le contour, rééchantillonné à pas régulier (2 u au téléphone, 1,4 u ailleurs).
      const brut = c.pts;
      const lisse0 = reechantillonner(brut, telephone ? 2 : 1.4, true);
      // Ne garder que la partie qui borde la terre (l'Échancrure déborde hors de l'île à l'ouest).
      const N = lisse0.length, K = PROFIL.length;
      // L'orientation : la normale extérieure pointe vers le vide. On la vérifie sur le terrain
      // (un vote le long du contour) plutôt que par le sens du tracé, qui diffère entre le contour
      // de l'île et l'Échancrure.
      let vote = 0;
      for (let i = 0; i < N; i += 3) {
        const a = lisse0[(i - 1 + N) % N], b = lisse0[(i + 1) % N], p = lisse0[i];
        let tx = b[0] - a[0], tz = b[1] - a[1];
        const tl = Math.sqrt(tx * tx + tz * tz) || 1; tx /= tl; tz /= tl;
        const dehors = T.videA(p[0] + tz * 2, p[1] - tx * 2), dedans = T.videA(p[0] - tz * 2, p[1] + tx * 2);
        if (dehors && !dedans) vote++; else if (dedans && !dehors) vote--;
      }
      const sensExt = vote >= 0 ? 1 : -1;
      const base = pos.length / 3;
      let s = 0;
      const garde = [];
      for (let i = 0; i <= N; i++) {
        const p = lisse0[i % N], a = lisse0[(i - 1 + N) % N], b = lisse0[(i + 1) % N];
        if (i) s += Math.hypot(p[0] - lisse0[(i - 1) % N][0], p[1] - lisse0[(i - 1) % N][1]);
        let tx = b[0] - a[0], tz = b[1] - a[1];
        const tl = Math.sqrt(tx * tx + tz * tz) || 1; tx /= tl; tz /= tl;
        // Normale extérieure (vers le vide).
        const nx = tz * sensExt, nz = -tx * sensExt;
        // Le haut : la hauteur du sol un peu à l'intérieur.
        const top = H(p[0] - nx * 0.6, p[1] - nz * 0.6);
        const surTerre = !T.videA(p[0] - nx * 0.9, p[1] - nz * 0.9) && p[0] > -1 && p[0] < T.largeur + 1;
        garde.push(surTerre);
        for (let j = 0; j < K; j++) {
          const [dr, y0] = PROFIL[j];
          const br = (M().fbm(s / 9 + j * 0.37, j * 0.9, 51, 3) - 0.5) * (j < 2 ? 0.8 : 4.2);
          const x = p[0] + nx * (dr + br), z = p[1] + nz * (dr + br);
          const y = j === 0 ? top + 0.02 : top * Math.max(0, 1 - j / 3) + y0 + (M().fbm(s / 7, j + 3, 52, 2) - 0.5) * 2.5;
          pos.push(x, y, z);
          uv.push(s / 11, Math.min(1, (top - y) / 30 + 0.01));
          const val = 1 - (j / (K - 1)) * 0.45;
          col.push(val, val, val);
        }
        // Un bloc pris dans la paroi (son centre en deçà de la face, qui bombe de 1,8 u à cette
        // profondeur) : il dépasse de la roche au lieu de flotter à côté.
        if (surTerre && i % 9 === 4 && (M().hache(i, c.sens + 3, 8) < 0.55)) suspendus.push({ x: p[0] - nx * 0.8, z: p[1] - nz * 0.8, y: top - 11 - M().hache(i, 2, 9) * 12, r: 1.3 + M().hache(i, 5, 9) * 1.6, k: i });
      }
      for (let i = 0; i < N; i++) {
        if (!garde[i] && !garde[i + 1]) continue;
        for (let j = 0; j + 1 < K; j++) {
          const a = base + i * K + j, b = base + (i + 1) * K + j;
          // La face regarde le vide : (a, b, a + 1) a pour normale (tz, -tx), la normale brute.
          if (sensExt > 0) idx.push(a, b, a + 1, b, b + 1, a + 1); else idx.push(a, a + 1, b, b, a + 1, b + 1);
        }
      }
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    geo.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
    geo.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
    geo.setIndex(idx);
    geo.computeVertexNormals();
    geo.computeBoundingSphere();
    return { geo, suspendus };
  }

  // Le dessous de l'île : un cône de roche en anneaux qui part du pied de la falaise du bord, rentre
  // vers le centre et descend jusqu'à 70 u sous l'île, bosselé ; il se fond dans la brume de hauteur
  // (le matériau s'en charge). Des rochers suspendus, des racines qui pendent du bord, de grands
  // points de couture d'or. Quelques milliers de triangles : on ne le voit qu'au bord.
  function dessous(T, L, suspendus, telephone) {
    const acc = [], lueur = [], roches = [];
    const R = M().hasard(M().cle('dessous'));
    const pierre = coul('#7d8290');
    const pts = reechantillonner(T.contour, telephone ? 4 : 3, true);
    const N = pts.length;
    let cx = 0, cz = 0;
    for (const p of pts) { cx += p[0]; cz += p[1]; }
    cx /= N; cz /= N;
    // Les anneaux : la part du chemin vers le centre, la profondeur.
    const ANNEAUX = [[0.0, -26], [0.1, -33], [0.22, -40], [0.38, -48], [0.56, -56], [0.74, -63], [0.9, -70], [1.0, -74]];
    const pos = [], col = [], uv = [], idx = [];
    for (let j = 0; j < ANNEAUX.length; j++) {
      const [t, y0] = ANNEAUX[j];
      for (let i = 0; i <= N; i++) {
        const p = pts[i % N];
        const bosse = j && j < ANNEAUX.length - 1 ? (M().fbm(i / 7, j * 0.8, 61, 3) - 0.5) * 0.12 : 0;
        const tt = Math.min(1, t + bosse);
        const x = p[0] + (cx - p[0]) * tt, z = p[1] + (cz - p[1]) * tt;
        const y = y0 + (j ? (M().fbm(i / 5, j + 0.5, 62, 3) - 0.5) * 7 : 0);
        pos.push(x, y, z);
        uv.push(i / 6, -y / 9);
        const v = 0.95 - j * 0.07;
        col.push(v, v, v);
      }
    }
    const L1 = N + 1;
    for (let j = 0; j + 1 < ANNEAUX.length; j++) for (let i = 0; i < N; i++) {
      const a = j * L1 + i, b = a + 1, c = a + L1, d = c + 1;
      idx.push(a, b, c, b, d, c);
    }
    const cone = new THREE.BufferGeometry();
    cone.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    cone.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
    cone.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
    cone.setIndex(idx);
    cone.computeVertexNormals();
    // L'ordre des sommets dépend du sens du contour : la normale doit regarder vers l'extérieur.
    {
      const P = cone.attributes.position, Nn = cone.attributes.normal, k = L1 * 2 + 3;
      const ox = P.getX(k) - cx, oz = P.getZ(k) - cz;
      if (Nn.getX(k) * ox + Nn.getZ(k) * oz < 0) { for (let q = 0; q < idx.length; q += 3) { const t2 = idx[q + 1]; idx[q + 1] = idx[q + 2]; idx[q + 2] = t2; } cone.setIndex(idx); cone.computeVertexNormals(); }
    }
    cone.computeBoundingBox();
    // Le cône et les rochers pris dans la falaise (les cailloux à facettes, assez vus de loin) : une
    // géométrie. Revue finale : plus de rocher qui flotte à côté de la falaise, plus de grands points
    // de couture d'or (des arcs sans ancre à l'écran) ; les racines qui pendent restent, sous la lèvre.
    roches.push({ geo: cone, m: new THREE.Matrix4(), c: [1, 1, 1], grain: 0 });
    for (const s of suspendus) roches.push({ geo: L.cailloux[s.k % 8], m: matrice(s.x, s.y, s.z, 0, s.k, 0, s.r, s.r * 1.2, s.r), c: fois(pierre, 0.8), bas: 0.6, haut: 1.05 });
    for (let i = 0; i < N; i += 2) {
      const p = pts[i];
      if (R() < 0.6) continue;
      const lg = 4 + R() * 7;
      const a = Math.atan2(p[1] - cz, p[0] - cx);
      acc.push({ geo: L.cone(4), m: matrice(p[0] - Math.cos(a) * 1.6, -2.5, p[1] - Math.sin(a) * 1.6, Math.PI, R() * 6, (R() - 0.5) * 0.3, 0.2, lg, 0.2), c: coul('#4a3a30') });
    }
    const out = { roche: fusion(roches), acc: fusion(acc), lueur: fusion(lueur) };
    cone.dispose();
    return out;
  }

  // Le point d'où part la chute : le dernier point du ru sur la terre ferme avant le vide, à partir
  // du point déclaré s'il est dans le vide (le tracé du Ru Clair file 24 u au large). Le ru est la
  // ligne de cette sorte la plus proche du point.
  function departChute(T, point) {
    if (!point || !T.videA(point[0], point[1])) return point;
    let ru = null, bd = Infinity;
    for (const l of T.lignes) {
      if (l.sorte !== 'ru') continue;
      const pr = IleTerrain.projeter(l.pts, IleTerrain.cumul(l.pts), point[0], point[1]);
      if (pr.d < bd) { bd = pr.d; ru = l; }
    }
    if (!ru) return point;
    const cum = IleTerrain.cumul(ru.pts), L = cum[cum.length - 1];
    // Le long du tracé, par pas de 0,5 u, en partant du point déclaré vers l'amont : le premier point
    // de terre ferme.
    const s0 = IleTerrain.projeter(ru.pts, cum, point[0], point[1]).s;
    for (let s = s0; s >= 0; s -= 0.5) { const q = IleTerrain.pointA(ru.pts, cum, s); if (!T.videA(q[0], q[1])) return q; }
    for (let s = s0; s <= L; s += 0.5) { const q = IleTerrain.pointA(ru.pts, cum, s); if (!T.videA(q[0], q[1])) return q; }
    return point;
  }

  // Des bouffées de nuages posées sous le bord de l'île et dans l'Échancrure (revue finale : le vide
  // se lisait comme une plaque) : à 5 à 14 u au large de la lèvre, 10 à 20 u sous elle, 14 à 30 u
  // de large ; tirées d'une graine, les mêmes à chaque chargement.
  function bouffeesBord(T, n) {
    const out = [], R = M().hasard(M().cle('bouffees_bord'));
    const contours = [T.contour];
    if (T.echancrure) contours.push(T.echancrure);
    const H = (u, v) => { const h = T.hauteurA(u, v); return Number.isFinite(h) ? h : T.solBrutA(u, v); };
    let essais = 0;
    while (out.length < n && essais < n * 40) {
      essais++;
      const pts = contours[Math.floor(R() * contours.length)], i = Math.floor(R() * pts.length);
      const p = pts[i], a = pts[(i + pts.length - 1) % pts.length], b = pts[(i + 1) % pts.length];
      let tx = b[0] - a[0], tz = b[1] - a[1];
      const tl = Math.sqrt(tx * tx + tz * tz) || 1; tx /= tl; tz /= tl;
      // Vers le vide : la normale qui tombe sur une case vide à 3 u.
      let nx = tz, nz = -tx;
      if (!T.videA(p[0] + nx * 3, p[1] + nz * 3)) { nx = -nx; nz = -nz; }
      if (!T.videA(p[0] + nx * 3, p[1] + nz * 3)) continue;
      const d = 5 + R() * 9, x = p[0] + nx * d, z = p[1] + nz * d;
      if (!T.videA(x, z) || out.some(o => Math.hypot(o.x - x, o.z - z) < 12)) continue;
      out.push({ x, z, y: H(p[0] - nx, p[1] - nz) - 10 - R() * 10, taille: 14 + R() * 16 });
    }
    return out;
  }

  // La chute du Ru Clair : là où il quitte le bord nord, un voile qui tombe dans les nuages.
  function chute(T, point) {
    if (!point) return null;
    const [u, v] = point, pos = [], uv = [], idx = [];
    const top = (() => { for (let d = 0; d < 6; d += 0.5) { const e = T.eauA(u, v + d); if (e != null) return e; } return T.solBrutA(u, v + 2); })();
    const lignes = 16, cols = 5, larg = 2.2;
    for (let j = 0; j <= lignes; j++) {
      const t = j / lignes, y = top + 0.1 - t * 40, avance = -0.3 - 2.2 * Math.sqrt(t) - t * 3;
      for (let i = 0; i <= cols; i++) {
        const s = i / cols - 0.5;
        pos.push(u + s * larg * (1 + t * 0.8), y, v + avance + Math.sin(s * 3 + t * 4) * 0.2);
        uv.push(i / cols, t * 1.7);
      }
    }
    for (let j = 0; j < lignes; j++) for (let i = 0; i < cols; i++) { const A = j * (cols + 1) + i, B = A + 1, C2 = A + cols + 1, D = C2 + 1; idx.push(A, C2, B, B, C2, D); }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    geo.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
    geo.setIndex(idx);
    geo.computeBoundingSphere();
    return geo;
  }

  return { TUILE, bibliotheque, fusion, matrice, entre, construire, obstaclesDesAires, eau, escarpements, falaiseBord, dessous, chute, departChute, bouffeesBord, coul: h => coul(h), init(three) { THREE = three; } };
})();
