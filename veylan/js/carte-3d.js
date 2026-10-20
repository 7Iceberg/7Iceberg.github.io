// Vue 3D de la carte du monde : le continent flottant dans le ciel, comme l'est Veylan. Three.js
// (vendor/three.min.js, r149) n'est chargé qu'à la première ouverture (js/hud-carte.js).
//
// Chaque région ouverte est une île : un terrain dont le dessus porte la peinture des cartes (la
// même qu'en 2D, js/carte-peinture.js, réunie en une texture par région), une hauteur par zone,
// une côte au tracé irrégulier, des falaises striées et un dessous qui s'effile. L'eau est un peu
// plus bas, translucide (la lave luit). Arbres, rochers, murs et maisons en instances, d'après le
// plan des cartes. Soleil chaud et lumière du ciel, nuages qui dérivent, brume peinte sur ce qui
// n'est pas exploré, régions à venir au loin, voilées, avec un cadenas et leurs niveaux.
// Pastilles et épingles en sprites (les mêmes images qu'en 2D). Contrôle d'orbite maison, choix
// d'une carte au toucher (rayon), bulles au survol. Rendu à la demande ; tout est libéré à la
// fermeture.
class Carte3D {
  // WebGL est-il là ? On le vérifie une fois, sur un canvas jeté aussitôt (contexte libéré).
  static disponible() {
    if (Carte3D._dispo != null) return Carte3D._dispo;
    let ok = false;
    try {
      const c = document.createElement('canvas');
      const gl = c.getContext('webgl2') || c.getContext('webgl');
      ok = !!gl;
      if (gl) { const ext = gl.getExtension('WEBGL_lose_context'); if (ext) ext.loseContext(); }
    } catch (e) { ok = false; }
    return (Carte3D._dispo = ok && !!window.THREE);
  }

  constructor(hud) {
    this.hud = hud;
    this.pret = false;
    this.mort = false;
    this.dom = document.createElement('div');
    this.dom.className = 'vy-carte__3d';
    this.dom.innerHTML = '<span class="vy-carte__boussole" aria-hidden="true"><b>N</b></span>';
    this.boussole = this.dom.firstChild;
    const mm = q => (window.matchMedia ? window.matchMedia(q).matches : false);
    this.telephone = mm('(pointer: coarse)') || window.innerWidth <= 720;
    this.mouvement = !mm('(prefers-reduced-motion: reduce)');
    this.textures = [];
    this.ecouteurs = [];
    this.raf = 0; this.minuterie = 0;
    this.dernier = 0; this.actif = 0;
    this.temps = [];
    this.iles = new Map();
    Carte3D.vivantes = (Carte3D.vivantes || 0) + 1;
  }

  // ----- Construction, par étapes (une image entre chaque, pour ne pas figer l'écran) -----

  async construire(etape) {
    const THREE = window.THREE;
    // Les couleurs données en hexadécimal sont en sRGB : Three.js les passe en linéaire.
    if (THREE.ColorManagement) THREE.ColorManagement.legacyMode = false;
    const image = () => new Promise(r => requestAnimationFrame(() => r()));
    // Fond transparent : le ciel est un dégradé CSS derrière le canvas (aucun quad de fond à rendre).
    const r = this.renderer = new THREE.WebGLRenderer({ antialias: !this.telephone, alpha: true, powerPreference: 'high-performance' });
    r.setClearColor(0x000000, 0);
    r.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));
    r.outputEncoding = THREE.sRGBEncoding;
    r.shadowMap.enabled = !this.telephone;
    r.shadowMap.type = THREE.PCFSoftShadowMap;
    this.dom.appendChild(r.domElement);
    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(38, 1, 0.05, 260);
    this.raycaster = new THREE.Raycaster();

    // Les peintures des cartes, quelques-unes par image.
    const A = Atlas.get();
    const ids = [...A.coords.keys()];
    let fait = 0;
    for (const id of ids) {
      if (this.mort) return;
      if (!CartePeinture.estPeinte(id)) { CartePeinture.carte(id); fait++; }
      if (fait >= 4) { fait = 0; etape(`Peinture des cartes (${ids.indexOf(id) + 1} / ${ids.length})`); await image(); }
    }
    if (this.mort) return;
    etape('Relief des îles'); await image();
    this.ciel();
    const D = this.hud.donneesCarte();
    this.vus = new Set(D.seen);
    for (const reg of Atlas.regions().filter(x => x.open)) { if (this.mort) return; this.ile(reg.id, D); await image(); }
    if (this.mort) return;
    etape('Arbres, rochers et maisons'); await image();
    this.decor();
    this.ponts();
    this.lointain();
    this.nuages(D);
    this.majReperes(true);
    this.ecouter();
    this.taille();
    this.centrer(true);
    this.pret = true;
    this.demander();
  }

  // Ciel : le dégradé de crépuscule est en CSS (css/fenetres.css) ; ici, la brume qui voile le
  // lointain, le soleil et la lumière du ciel.
  ciel() {
    const THREE = window.THREE;
    this.scene.fog = new THREE.Fog(0xb7b5cb, 18, 80);
    this.scene.add(new THREE.HemisphereLight(0xe6efff, 0x5e4c3e, 0.82));
    const soleil = this.soleil = new THREE.DirectionalLight(0xffe2b8, 0.95);
    soleil.position.set(-7, 13, 5);
    if (this.renderer.shadowMap.enabled) {
      soleil.castShadow = true;
      soleil.shadow.mapSize.set(2048, 2048);
      soleil.shadow.bias = -0.0006; soleil.shadow.normalBias = 0.02;
    }
    this.scene.add(soleil, soleil.target);
  }

  // ----- Les îles -----

  // Une île par région : le terrain (texture peinte), le dessous et les falaises, l'eau.
  ile(regId, D) {
    const THREE = window.THREE, K = 15, M = 1;
    const A = D.A, ix = D.ix;
    const cells = [...A.coords].map(([id, [x, y]]) => ({ id, x, y, e: ix.map.get(id) })).filter(c => c.e.zone.region === regId);
    if (!cells.length) return;
    const xs = cells.map(c => c.x), ys = cells.map(c => c.y);
    const cx0 = Math.min(...xs) - M, cy0 = Math.min(...ys) - M, CW = Math.max(...xs) - cx0 + 1 + M, CH = Math.max(...ys) - cy0 + 1 + M;
    const TW = CW * K, TH = CH * K, VW = TW + 1, VH = TH + 1;
    const occ = new Float32Array(TW * TH), autre = new Float32Array(TW * TH), hz = new Float32Array(TW * TH).fill(NaN), eau = new Uint8Array(TW * TH), lave = new Uint8Array(TW * TH);
    const H3 = z => CartePeinture.hauteur(z) * 0.09;
    for (const c of cells) {
      const ox = (c.x - cx0) * K, oy = (c.y - cy0) * K, h = H3(c.e.zone), P = CartePeinture.palette(c.e.zone);
      c.e.def.layout.forEach((row, ty) => { for (let tx = 0; tx < K; tx++) { const t = (oy + ty) * TW + ox + tx, k = row[tx]; hz[t] = h; if (k !== 'o') occ[t] = 1; if (k === '~') { eau[t] = 1; if (P.lave) lave[t] = 1; } } });
    }
    for (const [id, [x, y]] of A.coords) {
      if (ix.map.get(id).zone.region === regId || x < cx0 || y < cy0 || x >= cx0 + CW || y >= cy0 + CH) continue;
      for (let ty = 0; ty < K; ty++) for (let tx = 0; tx < K; tx++) autre[((y - cy0) * K + ty) * TW + (x - cx0) * K + tx] = 1;
    }
    const T = (a, i, j) => a[Math.max(0, Math.min(TH - 1, j)) * TW + Math.max(0, Math.min(TW - 1, i))];
    // Champ de terre aux sommets : moyenne des cases voisines, adoucie, bousculée par un bruit
    // près de la côte ; les autres régions repoussent la côte (un bras de ciel entre les îles).
    const f = new Float32Array(VW * VH), fa = new Float32Array(VW * VH);
    for (let j = 0; j < VH; j++) for (let i = 0; i < VW; i++) {
      const v = j * VW + i;
      f[v] = (T(occ, i - 1, j - 1) + T(occ, i, j - 1) + T(occ, i - 1, j) + T(occ, i, j)) / 4;
      fa[v] = (T(autre, i - 1, j - 1) + T(autre, i, j - 1) + T(autre, i - 1, j) + T(autre, i, j)) / 4;
    }
    Carte3D.flou(f, VW, VH, 3); Carte3D.flou(fa, VW, VH, 4);
    const graine = regId.length * 17;
    for (let j = 0; j < VH; j++) for (let i = 0; i < VW; i++) {
      const v = j * VW + i, b = f[v];
      f[v] = b + (Carte3D.bruit(i / K * 2.3, j / K * 2.3, graine) - 0.5) * 0.62 * Math.min(1, 4 * b * (1 - b)) - fa[v] * 0.7;
    }
    // Hauteurs : celle de la zone, propagée au-delà des cartes, adoucie (des pentes entre les
    // plateaux), creusée sous l'eau, à peine bosselée.
    const file = [];
    for (let t = 0; t < hz.length; t++) if (!isNaN(hz[t])) file.push(t);
    for (let q = 0; q < file.length; q++) {
      const t = file[q], i = t % TW, j = (t / TW) | 0;
      for (const [di, dj] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const ni = i + di, nj = j + dj; if (ni < 0 || nj < 0 || ni >= TW || nj >= TH) continue; const n = nj * TW + ni; if (isNaN(hz[n])) { hz[n] = hz[t]; file.push(n); } }
    }
    const hv = new Float32Array(VW * VH);
    for (let j = 0; j < VH; j++) for (let i = 0; i < VW; i++) hv[j * VW + i] = (T(hz, i - 1, j - 1) + T(hz, i, j - 1) + T(hz, i - 1, j) + T(hz, i, j)) / 4;
    Carte3D.flou(hv, VW, VH, 5);
    for (let j = 0; j < VH; j++) for (let i = 0; i < VW; i++) {
      const v = j * VW + i, n = T(eau, i - 1, j - 1) + T(eau, i, j - 1) + T(eau, i - 1, j) + T(eau, i, j);
      hv[v] += (n === 4 ? -0.05 : n ? -0.024 : 0) + (Carte3D.bruit(i / 4, j / 4, graine + 5) - 0.5) * 0.012;
    }
    const X = i => cx0 - 0.5 + i / K, Z = j => cy0 - 0.5 + j / K;
    const data = { regId, cx0, cy0, CW, CH, K, TW, TH, VW, VH, hv, f, X, Z };
    this.iles.set(regId, data);

    // La texture : les peintures des cartes de la région, sur un fond de roche claire.
    const maxTex = this.renderer.capabilities.maxTextureSize || 2048;
    const px = Math.max(64, Math.min(this.telephone ? 128 : 192, Math.floor(Math.min(maxTex, 4096) / Math.max(CW, CH))));
    const atlas = document.createElement('canvas'); atlas.width = CW * px; atlas.height = CH * px;
    const g = atlas.getContext('2d');
    const P0 = CartePeinture.palette(cells[0].e.zone);
    g.fillStyle = P0.roche; g.fillRect(0, 0, atlas.width, atlas.height);
    g.imageSmoothingEnabled = true; g.imageSmoothingQuality = 'high';
    data.px = px; data.atlas = atlas; data.cellules = cells;
    for (const c of cells) this.peindreCase(data, c.id, this.vus.has(c.id));
    const tex = data.tex = new THREE.CanvasTexture(atlas);
    tex.encoding = THREE.sRGBEncoding;
    tex.anisotropy = Math.min(8, this.renderer.capabilities.getMaxAnisotropy());
    this.textures.push(tex);

    // Triangulation : carrés de la grille, et carrés de côte découpés (marching squares).
    const pos = [], uv = [], idx = [], dist0 = [], cote = [];
    const vid = new Int32Array(VW * VH).fill(-1);
    const sommet = v => { if (vid[v] < 0) { vid[v] = pos.length / 3; const i = v % VW, j = (v / VW) | 0; pos.push(X(i), hv[v], Z(j)); uv.push(i / TW, 1 - j / TH); dist0.push(v); } return vid[v]; };
    const aretes = new Map();
    const pointArete = (a, b) => {
      const k = a < b ? a + ':' + b : b + ':' + a;
      if (aretes.has(k)) return aretes.get(k);
      const t = Math.max(0, Math.min(1, (0.5 - f[a]) / (f[b] - f[a])));
      const ia = a % VW, ja = (a / VW) | 0, ib = b % VW, jb = (b / VW) | 0, i = ia + (ib - ia) * t, j = ja + (jb - ja) * t;
      const n = pos.length / 3;
      pos.push(X(i), hv[a] + (hv[b] - hv[a]) * t, Z(j)); uv.push(i / TW, 1 - j / TH); dist0.push(-1);
      aretes.set(k, n);
      return n;
    };
    for (let j = 0; j < TH; j++) for (let i = 0; i < TW; i++) {
      const q = [j * VW + i, j * VW + i + 1, (j + 1) * VW + i + 1, (j + 1) * VW + i];
      const l = q.map(v => f[v] > 0.5);
      if (!l[0] && !l[1] && !l[2] && !l[3]) continue;
      if (l[0] && l[1] && l[2] && l[3]) { const a = sommet(q[0]), b = sommet(q[1]), c = sommet(q[2]), d = sommet(q[3]); idx.push(a, d, b, b, d, c); continue; }
      const pg = [];
      for (let k = 0; k < 4; k++) { if (l[k]) pg.push({ n: sommet(q[k]), c: false }); if (l[k] !== l[(k + 1) % 4]) pg.push({ n: pointArete(q[k], q[(k + 1) % 4]), c: true }); }
      for (let k = 1; k < pg.length - 1; k++) idx.push(pg[0].n, pg[k + 1].n, pg[k].n);
      for (let k = 0; k < pg.length; k++) { const a = pg[k], b = pg[(k + 1) % pg.length]; if (a.c && b.c) cote.push([a.n, b.n]); }
    }
    const dessus = new THREE.BufferGeometry();
    dessus.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    dessus.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
    dessus.setIndex(idx);
    dessus.computeVertexNormals();
    const mDessus = new THREE.Mesh(dessus, new THREE.MeshLambertMaterial({ map: tex }));
    mDessus.receiveShadow = this.renderer.shadowMap.enabled;
    mDessus.userData.ile = regId;
    this.scene.add(mDessus);
    data.dessus = mDessus;

    // Distance à la côte de chaque sommet (en cases du plan), pour l'effilement du dessous.
    const dist = new Float32Array(VW * VH).fill(1e9), fileD = [];
    for (let v = 0; v < VW * VH; v++) if (f[v] <= 0.5) { dist[v] = 0; fileD.push(v); }
    for (let q = 0; q < fileD.length; q++) {
      const v = fileD[q], i = v % VW, j = (v / VW) | 0;
      for (const [di, dj, w] of [[1, 0, 1], [-1, 0, 1], [0, 1, 1], [0, -1, 1], [1, 1, 1.41], [-1, 1, 1.41], [1, -1, 1.41], [-1, -1, 1.41]]) {
        const ni = i + di, nj = j + dj; if (ni < 0 || nj < 0 || ni >= VW || nj >= VH) continue;
        const n = nj * VW + ni; if (dist[v] + w < dist[n]) { dist[n] = dist[v] + w; fileD.push(n); }
      }
    }
    // Le dessous : chaque sommet du dessus, descendu d'autant plus qu'il est loin de la côte.
    const n3 = pos.length / 3, sous = new Float32Array(pos.length);
    const bande = (x, z) => 0.12 + 0.07 * Carte3D.bruit(x * 3.1, z * 3.1, graine + 9);
    for (let k = 0; k < n3; k++) {
      const x = pos[k * 3], y = pos[k * 3 + 1], z = pos[k * 3 + 2], v = dist0[k];
      const dc = v < 0 ? 0 : dist[v] / K;
      const creux = dc <= 0 ? 0 : 0.1 + 2.3 * Math.pow(dc, 0.78) * (0.8 + 0.4 * Carte3D.bruit(x * 0.7, z * 0.7, graine + 11)) + (Carte3D.bruit(x * 2.6, z * 2.6, graine + 13) - 0.5) * 0.35 * Math.min(1, dc * 2);
      const j = Math.min(1, dc * 3) * 0.07;
      sous[k * 3] = x + (Carte3D.bruit(x * 5, z * 5, graine + 15) - 0.5) * j;
      sous[k * 3 + 1] = y - bande(x, z) - creux;
      sous[k * 3 + 2] = z + (Carte3D.bruit(x * 5, z * 5, graine + 17) - 0.5) * j;
    }
    // Falaises (bande de côte) et dessous, en triangles à plat : de la roche taillée, striée.
    const rp = [], rc = [];
    const strate = Carte3D.strates(regId);
    const col = (x, y, z, haut) => {
      const s = strate(haut - y + (Carte3D.bruit(x * 1.7, z * 1.7, graine + 21) - 0.5) * 0.3);
      rc.push(s[0], s[1], s[2]);
    };
    const tri = (a, b, c) => { for (const p of [a, b, c]) { rp.push(p[0], p[1], p[2]); col(p[0], p[1], p[2], p[3]); } };
    const P = k => [pos[k * 3], pos[k * 3 + 1], pos[k * 3 + 2], pos[k * 3 + 1]];
    const S = k => [sous[k * 3], sous[k * 3 + 1], sous[k * 3 + 2], pos[k * 3 + 1]];
    for (let t = 0; t < idx.length; t += 3) tri(S(idx[t]), S(idx[t + 1]), S(idx[t + 2]));
    for (const [a, b] of cote) { tri(P(a), S(a), P(b)); tri(P(b), S(a), S(b)); }
    const roche = new THREE.BufferGeometry();
    roche.setAttribute('position', new THREE.Float32BufferAttribute(rp, 3));
    roche.setAttribute('color', new THREE.Float32BufferAttribute(rc, 3));
    roche.computeVertexNormals();
    const mRoche = new THREE.Mesh(roche, new THREE.MeshLambertMaterial({ vertexColors: true, flatShading: true, side: THREE.DoubleSide }));
    mRoche.castShadow = false;
    this.scene.add(mRoche);

    // L'eau : un plan par case d'eau, juste sous le bord ; la lave luit sans lumière.
    const pe = [], pl = [];
    for (let j = 0; j < TH; j++) for (let i = 0; i < TW; i++) {
      const t = j * TW + i;
      if (!eau[t]) continue;
      const vc = (f[j * VW + i] + f[j * VW + i + 1] + f[(j + 1) * VW + i] + f[(j + 1) * VW + i + 1]) / 4;
      if (vc <= 0.5) continue;
      const y = hz[t] - 0.014, x0 = X(i), x1 = X(i + 1), z0 = Z(j), z1 = Z(j + 1);
      (lave[t] ? pl : pe).push(x0, y, z0, x0, y, z1, x1, y, z0, x1, y, z0, x0, y, z1, x1, y, z1);
    }
    const plan = (arr, mat) => { if (!arr.length) return; const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.Float32BufferAttribute(arr, 3)); geo.computeVertexNormals(); const m = new THREE.Mesh(geo, mat); m.renderOrder = 2; this.scene.add(m); };
    plan(pe, new THREE.MeshLambertMaterial({ color: 0x6cb6e6, transparent: true, opacity: 0.62, depthWrite: false }));
    plan(pl, new THREE.MeshBasicMaterial({ color: 0xff7a2a, transparent: true, opacity: 0.9, depthWrite: false }));
  }

  // Une carte dans la texture de son île : peinte si explorée, voilée sinon.
  peindreCase(data, id, vue) {
    const p = Atlas.coordsOf(id), g = data.atlas.getContext('2d');
    const img = vue ? CartePeinture.carte(id) : CartePeinture.brume(id);
    if (img) g.drawImage(img, (p[0] - data.cx0) * data.px, (p[1] - data.cy0) * data.px, data.px, data.px);
  }

  // La hauteur du terrain sous un point du monde (0 hors des îles).
  hauteur(x, z) {
    const id = Atlas.at(Math.round(x), Math.round(z));
    const e = id && Atlas.index().map.get(id), d = e && this.iles.get(e.zone.region);
    if (!d) return 0;
    const i = (x - (d.cx0 - 0.5)) * d.K, j = (z - (d.cy0 - 0.5)) * d.K;
    const i0 = Math.max(0, Math.min(d.VW - 2, Math.floor(i))), j0 = Math.max(0, Math.min(d.VH - 2, Math.floor(j))), fi = Math.min(1, Math.max(0, i - i0)), fj = Math.min(1, Math.max(0, j - j0));
    const h = (a, b) => d.hv[(j0 + b) * d.VW + i0 + a];
    return (h(0, 0) * (1 - fi) + h(1, 0) * fi) * (1 - fj) + (h(0, 1) * (1 - fi) + h(1, 1) * fi) * fj;
  }

  // ----- Décor : arbres, rochers, colonnes de basalte, remparts et maisons, lanternes, relais -----

  decor() {
    const THREE = window.THREE, K = 15;
    const A = Atlas.get(), ix = Atlas.index();
    const listes = { couronne: [], tronc: [], rocher: [], basalte: [], mur: [], toit: [], lanterne: [], cristal: [] };
    const c3 = h => new THREE.Color(h);
    for (const [id, [mx, my]] of A.coords) {
      const e = ix.map.get(id), P = CartePeinture.palette(e.zone), d = this.iles.get(e.zone.region);
      if (!d) continue;
      const lay = e.def.layout, N = lay.length, R = Carte3D.hasard(id);
      const terre = (tx, ty) => { const i = (mx - d.cx0) * K + tx, j = (my - d.cy0) * K + ty; return (d.f[j * d.VW + i] + d.f[j * d.VW + i + 1] + d.f[(j + 1) * d.VW + i] + d.f[(j + 1) * d.VW + i + 1]) / 4 > 0.55; };
      const ville = !!P.ville;
      // Murs de ville : ceux qui touchent le bord sont des remparts, les autres des maisons.
      const rempart = new Set();
      if (ville) {
        const vu = new Set();
        for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
          if (lay[y][x] !== '#' || vu.has(x + ',' + y)) continue;
          const comp = [], pile = [[x, y]]; vu.add(x + ',' + y);
          while (pile.length) { const [a, b] = pile.pop(); comp.push([a, b]); for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const na = a + dx, nb = b + dy, k = na + ',' + nb; if (na >= 0 && nb >= 0 && na < N && nb < N && !vu.has(k) && lay[nb][na] === '#') { vu.add(k); pile.push([na, nb]); } } }
          if (comp.some(([a, b]) => a === 0 || b === 0 || a === N - 1 || b === N - 1)) for (const [a, b] of comp) rempart.add(a + ',' + b);
        }
      }
      for (let ty = 0; ty < N; ty++) for (let tx = 0; tx < N; tx++) {
        const k = lay[ty][tx];
        if (!'#TLZ'.includes(k) || !terre(tx, ty)) continue;
        const [wx, wz] = Atlas.tileToWorld(id, tx, ty), h = this.hauteur(wx, wz);
        if (k === 'T') {
          const r = (0.028 + R() * 0.014) * (P.mort ? 0.8 : 1), jx = (R() - 0.5) * 0.02, jz = (R() - 0.5) * 0.02;
          listes.couronne.push({ p: [wx + jx, h + 0.05 + r * 0.5, wz + jz], s: [r, r * (0.9 + R() * 0.3), r], rot: R() * 6, c: c3(P.feuillage).lerp(c3(R() < 0.5 ? P.feuillageClair : P.feuillageSombre), 0.3 * R()) });
          listes.tronc.push({ p: [wx + jx, h + 0.025, wz + jz], s: [1, 1, 1], rot: 0, c: c3(P.tronc) });
        } else if (k === '#') {
          if (ville && rempart.has(tx + ',' + ty)) listes.mur.push({ p: [wx, h + 0.03, wz], s: [1 / K, 0.06, 1 / K], rot: 0, c: c3(P.mur).lerp(c3(P.murSombre), R() * 0.3) });
          else if (ville) {
            listes.mur.push({ p: [wx, h + 0.02, wz], s: [0.85 / K, 0.04, 0.85 / K], rot: 0, c: c3(P.mur) });
            listes.toit.push({ p: [wx, h + 0.04 + 0.018, wz], s: [0.62 / K, 0.036, 0.62 / K], rot: Math.PI / 4, c: c3(P.toit).lerp(c3(P.toitClair), R() * 0.4) });
          } else if (P.lave) listes.basalte.push({ p: [wx, h + 0.02, wz], s: [0.028 + R() * 0.008, 0.04 + R() * 0.06, 0.028 + R() * 0.008], rot: R() * 6, c: c3(P.roche).lerp(c3(P.rocheSombre), R() * 0.6) });
          else listes.rocher.push({ p: [wx, h + 0.012, wz], s: [0.03 + R() * 0.012, 0.02 + R() * 0.018, 0.03 + R() * 0.012], rot: R() * 6, c: c3(P.roche).lerp(c3(R() < 0.5 ? P.rocheClaire : P.rocheSombre), R() * 0.5) });
        } else if (k === 'L') listes.lanterne.push({ p: [wx, h + 0.045, wz], s: [1, 1, 1], rot: 0, c: c3(P.lueur) });
        else if (k === 'Z') listes.cristal.push({ p: [wx, h + 0.09, wz], s: [1, 1.6, 1], rot: 0, c: c3(P.cristal) });
      }
    }
    const ombre = this.renderer.shadowMap.enabled;
    const lambert = () => new THREE.MeshLambertMaterial({ flatShading: true });
    const instances = (geo, mat, l, porte) => {
      if (!l.length) { geo.dispose(); mat.dispose(); return; }
      const m = new THREE.InstancedMesh(geo, mat, l.length), o = new THREE.Object3D();
      l.forEach((it, i) => { o.position.set(it.p[0], it.p[1], it.p[2]); o.rotation.set(0, it.rot, 0); o.scale.set(it.s[0], it.s[1], it.s[2]); o.updateMatrix(); m.setMatrixAt(i, o.matrix); m.setColorAt(i, it.c); });
      m.instanceMatrix.needsUpdate = true; if (m.instanceColor) m.instanceColor.needsUpdate = true;
      m.castShadow = ombre && porte; m.receiveShadow = false;
      this.scene.add(m);
      return m;
    };
    instances(new THREE.IcosahedronGeometry(1, 0), lambert(), listes.couronne, true);
    instances(new THREE.CylinderGeometry(0.006, 0.009, 0.05, 5), lambert(), listes.tronc, true);
    instances(new THREE.DodecahedronGeometry(1, 0), lambert(), listes.rocher, true);
    instances(new THREE.CylinderGeometry(1, 1.08, 1, 6), lambert(), listes.basalte, true);
    instances(new THREE.BoxGeometry(1, 1, 1), lambert(), listes.mur, true);
    instances(new THREE.ConeGeometry(1, 1, 4), lambert(), listes.toit, true);
    instances(new THREE.SphereGeometry(0.011, 6, 4), new THREE.MeshBasicMaterial(), listes.lanterne, false);
    instances(new THREE.OctahedronGeometry(0.022, 0), new THREE.MeshBasicMaterial(), listes.cristal, false);
  }

  // Une passerelle de bois entre deux îles, là où une sortie relie deux régions.
  ponts() {
    const THREE = window.THREE, ix = Atlas.index();
    const mat = new THREE.MeshLambertMaterial({ color: 0x8a6444 }), corde = new THREE.MeshLambertMaterial({ color: 0xd8c39a });
    for (const [id, e] of ix.map) for (const dir of ['e', 's']) {
      const t = e.def.exits && e.def.exits[dir], et = t && ix.map.get(t);
      if (!et || et.zone.region === e.zone.region) continue;
      const sp = []; e.def.layout.forEach((row, y) => { for (let x = 0; x < row.length; x++) if (row[x] === dir) sp.push([x, y]); });
      if (!sp.length) continue;
      const [tx, ty] = sp[Math.floor(sp.length / 2)];
      const [ax, az] = Atlas.tileToWorld(id, tx, ty), d = Atlas.STEP[dir];
      const a = [ax - d[0] * 0.25, az - d[1] * 0.25], b = [ax + d[0] * 0.45, az + d[1] * 0.45];
      const ha = this.hauteur(a[0], a[1]), hb = this.hauteur(b[0], b[1]) || ha;
      const len = Math.hypot(b[0] - a[0], b[1] - a[1]);
      const g = new THREE.BoxGeometry(len, 0.012, 0.075);
      const m = new THREE.Mesh(g, mat);
      m.position.set((a[0] + b[0]) / 2, (ha + hb) / 2 + 0.006, (a[1] + b[1]) / 2);
      m.rotation.set(0, -Math.atan2(b[1] - a[1], b[0] - a[0]), Math.atan2(hb - ha, len));
      this.scene.add(m);
      for (const side of [-1, 1]) {
        const r = new THREE.Mesh(new THREE.BoxGeometry(len, 0.004, 0.004), corde);
        r.position.copy(m.position); r.rotation.copy(m.rotation);
        r.translateZ(side * 0.036); r.translateY(0.03);
        this.scene.add(r);
      }
    }
  }

  // ----- Le lointain : les régions à venir, îles voilées, cadenas et niveaux -----

  lointain() {
    const THREE = window.THREE;
    const regs = Atlas.regions(), A = Atlas.get(), ix = Atlas.index();
    const centre = id => { const l = [...A.coords].filter(([m]) => ix.map.get(m).zone.region === id).map(([, p]) => p); return l.length ? [l.reduce((s, p) => s + p[0], 0) / l.length, l.reduce((s, p) => s + p[1], 0) / l.length] : null; };
    const ouvertes = regs.filter(r => r.open && centre(r.id));
    if (!ouvertes.length) return;
    // Du continent de l'onglet « Monde » au monde 3D : une similitude calée sur deux îles ouvertes.
    const a0 = ouvertes[0], c0 = centre(a0.id);
    let s = 0.42, ang = 0;
    if (ouvertes[1]) {
      const a1 = ouvertes[1], c1 = centre(a1.id), va = [a1.at[0] - a0.at[0], a1.at[1] - a0.at[1]], vb = [c1[0] - c0[0], c1[1] - c0[1]];
      s = Math.hypot(vb[0], vb[1]) / Math.hypot(va[0], va[1]); ang = Math.atan2(vb[1], vb[0]) - Math.atan2(va[1], va[0]);
    }
    const versMonde = p => { const dx = p[0] - a0.at[0], dy = p[1] - a0.at[1]; return [c0[0] + s * (dx * Math.cos(ang) - dy * Math.sin(ang)), c0[1] + s * (dx * Math.sin(ang) + dy * Math.cos(ang))]; };
    // Le centre des îles ouvertes : les régions à venir sont repoussées au loin, dans la brume.
    const cs = ouvertes.map(r => centre(r.id)), cm = [cs.reduce((a, c) => a + c[0], 0) / cs.length, cs.reduce((a, c) => a + c[1], 0) / cs.length];
    const brume = new THREE.Color(0xb7b5cb);
    for (const r of regs) {
      if (r.open) {
        const c = centre(r.id); if (!c) continue;
        let hmax = 0; for (const [m] of A.coords) if (ix.map.get(m).zone.region === r.id) hmax = Math.max(hmax, CartePeinture.hauteur(ix.map.get(m).zone) * 0.09);
        this.etiquette(DATA.regions[r.id] || r.name, `niv. ${r.level[0]} à ${r.level[1]}`, [c[0], hmax + 1.25, c[1]], 2.6, '#ffe7a3');
        continue;
      }
      const p = versMonde(r.at), x = cm[0] + (p[0] - cm[0]) * 2.1, z = cm[1] + (p[1] - cm[1]) * 2.1, R = r.r * s * 0.5, y = -2.6;
      (this.loin = this.loin || []).push([x, z]);
      const col = new THREE.Color(Carte3D.ROCHE[r.id] || '#9fa7b8').lerp(brume, 0.45);
      const haut = new THREE.CylinderGeometry(R, R * 0.94, 0.3, 14, 1);
      const bas = new THREE.ConeGeometry(R * 0.94, R * 1.9, 14, 3);
      for (const geo of [haut, bas]) {
        const p = geo.attributes.position;
        for (let i = 0; i < p.count; i++) { const k = 0.86 + 0.28 * Carte3D.bruit(p.getX(i) * 0.8 + x, p.getZ(i) * 0.8 + z, 3); p.setX(i, p.getX(i) * k); p.setZ(i, p.getZ(i) * k); if (geo === bas) p.setY(i, p.getY(i) + (Carte3D.bruit(p.getX(i), p.getZ(i), 4) - 0.5) * 0.4); }
        geo.computeVertexNormals();
      }
      const mh = new THREE.Mesh(haut, new THREE.MeshLambertMaterial({ color: col.clone().lerp(new THREE.Color(0xe2dccf), 0.3), flatShading: true }));
      const mb = new THREE.Mesh(bas, new THREE.MeshLambertMaterial({ color: col.clone().multiplyScalar(0.72), flatShading: true }));
      mh.position.set(x, y, z); mb.position.set(x, y - 0.15 - R * 0.95, z); mb.rotation.x = Math.PI;
      this.scene.add(mh, mb);
      this.sprite(CartePeinture.pastille('verrou', 96).canvas, [x, y + 1.1, z], 1.25, { center: [0.5, 0.5], fog: false });
      this.etiquette(DATA.regions[r.id] || r.name, `niv. ${r.level[0]} à ${r.level[1]}, à venir`, [x, y + 2.5, z], 6.5, Carte3D.LANTERNE[r.id] || '#d6c8ff', false);
    }
  }

  // Une étiquette (nom et ligne de niveaux), en sprite.
  etiquette(nom, sous, at, larg, couleur, brume) {
    const cv = document.createElement('canvas'); cv.width = 640; cv.height = 160;
    const g = cv.getContext('2d'), T = this.hud.carteT || this.hud.themeCarte();
    g.textAlign = 'center'; g.textBaseline = 'middle';
    g.shadowColor = 'rgba(20,24,44,0.85)'; g.shadowBlur = 10; g.shadowOffsetY = 2;
    g.font = `700 54px ${T.titre}`; g.fillStyle = '#ffffff'; g.fillText(nom, 320, 62);
    g.font = `600 30px ${T.ui}`; g.fillStyle = couleur; g.fillText(sous, 320, 116);
    return this.sprite(cv, at, larg, { center: [0.5, 0.5], fog: brume !== false });
  }

  sprite(canvas, at, larg, opts) {
    const THREE = window.THREE;
    opts = opts || {};
    const tex = new THREE.CanvasTexture(canvas); tex.encoding = THREE.sRGBEncoding;
    this.textures.push(tex);
    const mat = new THREE.SpriteMaterial({ map: tex, transparent: true, depthWrite: false, depthTest: !opts.toujours, fog: opts.fog !== false && !opts.toujours });
    const s = new THREE.Sprite(mat);
    s.position.set(at[0], at[1], at[2]);
    s.scale.set(larg, larg * canvas.height / canvas.width, 1);
    if (opts.center) s.center.set(opts.center[0], opts.center[1]);
    s.userData.larg = larg;
    if (opts.toujours) s.renderOrder = 10;
    this.scene.add(s);
    return s;
  }

  // ----- Nuages : ceux qui dérivent entre les îles, et la brume sur ce qui n'est pas exploré -----

  nuages(D) {
    const THREE = window.THREE;
    this.texNuages = [0, 1, 2].map(i => { const t = new THREE.CanvasTexture(CartePeinture.nuage(i)); t.encoding = THREE.sRGBEncoding; this.textures.push(t); return t; });
    const b = D.A.bounds, R = Carte3D.hasard('nuages');
    this.derive = [];
    for (let i = 0; i < 18; i++) {
      const haut = i % 4 === 0;
      const m = new THREE.SpriteMaterial({ map: this.texNuages[i % 3], transparent: true, depthWrite: false, opacity: haut ? 0.55 : 0.8 + R() * 0.15 });
      const s = new THREE.Sprite(m), w = haut ? 2.4 + R() * 2 : 3 + R() * 3.5;
      s.scale.set(w, w * 0.62, 1);
      s.position.set(b.minX - 5 + R() * (b.maxX - b.minX + 10), haut ? 1.4 + R() * 0.8 : -3.6 + R() * 2.8, b.minY - 5 + R() * (b.maxY - b.minY + 10));
      s.userData.vitesse = 0.08 + R() * 0.12;
      this.scene.add(s); this.derive.push(s);
    }
    this.borne = { x0: b.minX - 7, x1: b.maxX + 7 };
    this.brume = new Map();
    for (const [id, [x, y]] of D.A.coords) if (!D.seen.has(id)) this.ajouterBrume(id, x, y);
  }

  ajouterBrume(id, x, y) {
    const THREE = window.THREE, R = Carte3D.hasard(id + 'b');
    const m = new THREE.SpriteMaterial({ map: this.texNuages[Math.floor(R() * 3)], transparent: true, depthWrite: false, opacity: 0.93 });
    const s = new THREE.Sprite(m);
    s.scale.set(1.55, 0.98, 1);
    s.position.set(x + (R() - 0.5) * 0.2, this.hauteur(x, y) + 0.26, y + (R() - 0.5) * 0.2);
    this.scene.add(s);
    this.brume.set(id, s);
  }

  // Une carte vient d'être explorée : sa peinture remplace la brume.
  majExploration() {
    const D = this.hud.donneesCarte();
    for (const id of D.seen) {
      if (this.vus.has(id)) continue;
      this.vus.add(id);
      const e = D.ix.map.get(id), data = e && this.iles.get(e.zone.region);
      if (data) { this.peindreCase(data, id, true); data.tex.needsUpdate = true; }
      const s = this.brume && this.brume.get(id);
      if (s) { this.scene.remove(s); s.material.dispose(); this.brume.delete(id); }
    }
  }

  // ----- Pastilles et épingles : des sprites, les mêmes images qu'en 2D -----

  majReperes(force) {
    if (!this.scene || this.mort) return;
    const THREE = window.THREE, hud = this.hud, D = hud.donneesCarte(), w = hud.world;
    const sig = [w.mapId, w.player.x, w.player.y, D.seen.size, [...D.relays].join(), JSON.stringify(hud.carte.drapeau), D.marks.pins.map(p => p.quest.id + p.map + p.x + p.y).join(), [...D.marks.giveNpc.keys()].join(), [...D.marks.turnInNpc.keys()].join(), hud.carte.sel].join('|');
    if (!force && sig === this.sigReperes) return;
    this.sigReperes = sig;
    if (this.vus && D.seen.size !== this.vus.size) this.majExploration();
    for (const s of this.reperes || []) { this.scene.remove(s); s.material.dispose(); }
    for (const t of this.texReperes || []) t.dispose();
    this.reperes = []; this.texReperes = [];
    const cache = new Map();
    const texture = (cle, canvas) => { if (!cache.has(cle)) { const t = new THREE.CanvasTexture(canvas); t.encoding = THREE.sRGBEncoding; cache.set(cle, t); this.texReperes.push(t); } return cache.get(cle); };
    const ajoute = (tex, canvas, at, larg, center, item, groupe) => {
      const m = new THREE.SpriteMaterial({ map: tex, transparent: true, depthTest: false, depthWrite: false });
      const s = new THREE.Sprite(m);
      s.position.set(at[0], at[1], at[2]); s.center.set(center[0], center[1]);
      s.scale.set(larg, larg * canvas.height / canvas.width, 1);
      s.userData = { larg, item, groupe, base: at[1] };
      s.renderOrder = 20;
      this.scene.add(s); this.reperes.push(s);
      return s;
    };
    // Pastilles, une par repère (vue proche), ou une par carte avec leur nombre (vue lointaine).
    const items = hud.reperesMonde(D);
    const parCarte = new Map();
    for (const it of items) {
      const art = CartePeinture.pastille(it.kind, 96, it.sub), h = this.hauteur(it.at[0], it.at[1]);
      ajoute(texture('p' + it.kind + it.sub, art.canvas), art.canvas, [it.at[0], h + 0.13, it.at[1]], 0.2, [0.5, 1 - art.ay / art.canvas.height], it, 'proche');
      (parCarte.get(it.map) || parCarte.set(it.map, []).get(it.map)).push(it);
    }
    const PRIO = { rendre: 6, offre: 5, relais: 4, donjon: 3, artisan: 2, marchand: 1 };
    for (const [id, l] of parCarte) {
      l.sort((a, b) => PRIO[b.kind] - PRIO[a.kind]);
      const p = Atlas.coordsOf(id), art = Carte3D.compte(l[0], l.length), h = this.hauteur(p[0], p[1]);
      ajoute(texture('g' + l[0].kind + l[0].sub + l.length, art.canvas), art.canvas, [p[0], h + 0.32, p[1]], 0.36, [0.5, 1 - art.ay / art.canvas.height], Object.assign({}, l[0], { groupe: l.length > 1 ? l : null }), 'loin');
    }
    // Épingles : la pointe au sol ; la tienne flotte doucement.
    for (const pin of hud.epinglesMonde(D)) {
      const art = CartePeinture.epingle(pin.kind, 128), h = this.hauteur(pin.at[0], pin.at[1]);
      const s = ajoute(texture('e' + pin.kind, art.canvas), art.canvas, [pin.at[0], h, pin.at[1]], pin.kind === 'toi' ? 0.26 : 0.2, [0.5, 1 - art.ay / art.canvas.height], pin, 'epingle');
      s.renderOrder = pin.kind === 'toi' ? 23 : 22;
      if (pin.kind === 'toi') this.toi = s;
    }
    this.majSelection();
    this.demander();
  }

  // Le contour d'or de la carte choisie, qui suit le relief.
  majSelection() {
    const THREE = window.THREE, id = this.hud.carte.sel;
    if (this.selection) { this.scene.remove(this.selection); this.selection.geometry.dispose(); this.selection.material.dispose(); this.selection = null; }
    const p = id && Atlas.coordsOf(id);
    if (!p) return;
    const pts = [], n = 15;
    const coins = [[-0.5, -0.5], [0.5, -0.5], [0.5, 0.5], [-0.5, 0.5], [-0.5, -0.5]];
    for (let k = 0; k < 4; k++) for (let i = 0; i < n; i++) { const t = i / n, x = p[0] + coins[k][0] + (coins[k + 1][0] - coins[k][0]) * t, z = p[1] + coins[k][1] + (coins[k + 1][1] - coins[k][1]) * t; pts.push(new THREE.Vector3(x, this.hauteur(Math.min(p[0] + 0.49, Math.max(p[0] - 0.49, x)), Math.min(p[1] + 0.49, Math.max(p[1] - 0.49, z))) + 0.012, z)); }
    pts.push(pts[0].clone());
    const geo = new THREE.BufferGeometry().setFromPoints(pts);
    this.selection = new THREE.Line(geo, new THREE.LineBasicMaterial({ color: 0xffe7a3, transparent: true, opacity: 0.95, depthTest: false }));
    this.selection.renderOrder = 15;
    this.scene.add(this.selection);
  }

  // ----- Caméra : orbite autour d'une cible, amortie ; jamais sous les îles -----

  centrer(net) {
    // Première vue : tout le continent ouvert, nord en haut, vu de trois quarts depuis le sud,
    // comme une carte qu'on pose sur la table. Ensuite, « centrer » revient sur toi.
    if (!this.but) {
      // La région où l'on se trouve, cadrée en entier selon la forme de la fenêtre.
      const ici = this.hud.donneesCarte().here, zone = ici && World.zoneOf(ici);
      const ids = zone ? DATA.content.zones.filter(z => z.region === zone.region).flatMap(z => z.maps.map(m => m.id)) : [];
      const pts = ids.map(id => Atlas.coordsOf(id)).filter(Boolean);
      const b = pts.length ? { minX: Math.min(...pts.map(p => p[0])), maxX: Math.max(...pts.map(p => p[0])), minY: Math.min(...pts.map(p => p[1])), maxY: Math.max(...pts.map(p => p[1])) } : Atlas.get().bounds;
      const w = b.maxX - b.minX + 1, h = b.maxY - b.minY + 1, phi = 0.92;
      const t = Math.tan(this.camera.fov * Math.PI / 360), asp = this.camera.aspect || 1;
      const dist = Math.max(6, Math.min(30, Math.max((w / 2 + 0.8) / (t * asp), (h * Math.cos(phi) / 2 + 1.2) / t)));
      this.but = { x: (b.minX + b.maxX) / 2, z: (b.minY + b.maxY) / 2 + 0.6, theta: 0, phi, dist };
    } else {
      const D = this.hud.donneesCarte();
      const pin = this.hud.epinglesMonde(D).find(p => p.kind === 'toi');
      const at = pin ? pin.at : [0, 0];
      this.but = { x: at[0], z: at[1], theta: this.but.theta, phi: 1.02, dist: this.telephone ? 14 : 12.5 };
    }
    if (net || !this.cam) this.cam = Object.assign({}, this.but);
    this.reveil();
  }

  tourner(sens) { this.but.theta += sens * Math.PI / 2; this.reveil(); }
  zoom(f) { this.but.dist = Math.max(1.3, Math.min(32, this.but.dist / f)); this.reveil(); }

  borner() {
    const b = Atlas.get().bounds, u = this.but;
    u.phi = Math.max(0.3, Math.min(1.16, u.phi));
    u.dist = Math.max(1.3, Math.min(32, u.dist));
    u.x = Math.max(b.minX - 3, Math.min(b.maxX + 3, u.x));
    u.z = Math.max(b.minY - 3, Math.min(b.maxY + 3, u.z));
  }

  // Applique l'amortissement : vrai tant que la caméra n'a pas rejoint son but.
  amortir(dt) {
    this.borner();
    const k = 1 - Math.exp(-dt * 11), c = this.cam, u = this.but;
    let bouge = false;
    for (const p of ['x', 'z', 'theta', 'phi', 'dist']) { const d = u[p] - c[p]; if (Math.abs(d) > 1e-4) { c[p] += d * k; bouge = true; } else c[p] = u[p]; }
    const ty = this.hauteur(c.x, c.z) * 0.6;
    const cam = this.camera, sp = Math.sin(c.phi);
    cam.position.set(c.x + c.dist * sp * Math.sin(c.theta), ty + c.dist * Math.cos(c.phi), c.z + c.dist * sp * Math.cos(c.theta));
    if (cam.position.y < ty + 0.6) cam.position.y = ty + 0.6;
    cam.lookAt(c.x, ty, c.z);
    // Le soleil suit la vue : ses ombres couvrent ce qu'on regarde.
    if (this.soleil) {
      this.soleil.position.set(c.x - 7, 13, c.z + 5); this.soleil.target.position.set(c.x, 0, c.z); this.soleil.target.updateMatrixWorld();
      const sc = this.soleil.shadow.camera, e = Math.min(14, 2 + c.dist * 1.1);
      if (sc.right !== e) { sc.left = -e; sc.right = e; sc.top = e; sc.bottom = -e; sc.near = 1; sc.far = 40; sc.updateProjectionMatrix(); }
    }
    return bouge;
  }

  // ----- Boucle : on ne dessine que si quelque chose change -----

  reveil() { this.actif = performance.now(); this.demander(); }

  demander() {
    if (this.mort || this.raf || !this.renderer) return;
    if (this.minuterie) { clearTimeout(this.minuterie); this.minuterie = 0; }
    this.raf = requestAnimationFrame(t => this.image(t));
  }

  image(t) {
    this.raf = 0;
    if (this.mort || !this.pret || !this.dom.isConnected) return;
    const dt = Math.min(0.1, this.dernier ? (t - this.dernier) / 1000 : 0.016);
    this.dernier = t;
    const bouge = this.amortir(dt);
    // Animations douces, une douzaine de secondes après la dernière interaction : ton épingle
    // flotte, les nuages dérivent. Au-delà, plus rien ne bouge et plus rien n'est dessiné.
    const vivant = this.mouvement && performance.now() - this.actif < 12000;
    if (vivant) {
      const s = t / 1000;
      if (this.toi) this.toi.position.y = this.toi.userData.base + 0.03 + Math.sin(s * 2.4) * 0.02;
      for (const n of this.derive || []) { n.position.x += n.userData.vitesse * dt; if (n.position.x > this.borne.x1) n.position.x = this.borne.x0; }
    }
    this.echelles();
    // La boussole : le nord de la carte (les y décroissants) vu depuis la caméra.
    const nord = Math.round(this.cam.theta * 180 / Math.PI);
    if (this.boussoleA !== nord) { this.boussoleA = nord; this.boussole.style.transform = `rotate(${nord}deg)`; }
    const t0 = performance.now();
    this.renderer.render(this.scene, this.camera);
    this.temps.push(performance.now() - t0);
    if (this.temps.length > 120) this.temps.shift();
    if (bouge || this.glisse) this.demander();
    else if (vivant) this.minuterie = setTimeout(() => { this.minuterie = 0; this.demander(); }, 45);
  }

  // Les repères gardent une taille lisible à toute distance ; les groupes remplacent les
  // pastilles quand on s'éloigne.
  echelles() {
    const d = this.cam.dist, k = Math.max(0.6, Math.min(2.6, d / 6)), loin = d > 8.5;
    for (const s of this.reperes || []) {
      const u = s.userData, w = u.larg * (u.groupe === 'loin' ? Math.max(1, k * 0.8) : k);
      s.scale.set(w, w * s.material.map.image.height / s.material.map.image.width, 1);
      s.visible = u.groupe === 'epingle' || (u.groupe === 'loin') === loin;
    }
  }

  taille() {
    if (!this.renderer) return;
    const w = this.dom.clientWidth, h = this.dom.clientHeight;
    if (!w || !h) return;
    this.renderer.setSize(w, h, false);
    this.camera.aspect = w / h; this.camera.updateProjectionMatrix();
    this.demander();
  }

  // ----- Entrées : souris, toucher, molette -----

  ecouter() {
    const el = this.renderer.domElement, dom = this.dom;
    const on = (cible, type, fn, o) => { cible.addEventListener(type, fn, o); this.ecouteurs.push([cible, type, fn, o]); };
    const pts = new Map();
    let geste = null, appui = 0;
    const pos = e => { const r = el.getBoundingClientRect(); return [e.clientX - r.left, e.clientY - r.top]; };
    const finAppui = () => { if (appui) { clearTimeout(appui); appui = 0; } };
    on(el, 'pointerdown', e => {
      try { el.setPointerCapture(e.pointerId); } catch (x) { /* rien */ }
      this.hud.carte.pointeur = e.pointerType;
      pts.set(e.pointerId, pos(e));
      this.reveil();
      if (pts.size === 1) {
        geste = { p: pos(e), t: performance.now(), bouge: false, bouton: e.button, fait: false, pan: e.button === 2 || e.button === 1 || e.shiftKey };
        if (e.pointerType !== 'mouse') appui = setTimeout(() => { appui = 0; if (geste && !geste.bouge && pts.size === 1) { geste.fait = true; this.drapeauEcran(geste.p); } }, 560);
      } else if (pts.size === 2) { finAppui(); const [a, b] = [...pts.values()]; geste = { deux: true, d: Math.hypot(a[0] - b[0], a[1] - b[1]) || 1, dist: this.but.dist, mid: [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2], bouge: true }; }
    });
    on(el, 'pointermove', e => {
      const p = pos(e);
      if (!pts.has(e.pointerId)) { if (e.pointerType === 'mouse') this.survol(p); return; }
      const avant = pts.get(e.pointerId);
      pts.set(e.pointerId, p);
      if (!geste) return;
      if (geste.deux && pts.size >= 2) {
        const [a, b] = [...pts.values()], d = Math.hypot(a[0] - b[0], a[1] - b[1]), mid = [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
        this.but.dist = geste.dist * geste.d / d;
        this.panoramique(mid[0] - geste.mid[0], mid[1] - geste.mid[1]);
        geste.mid = mid; this.reveil();
        return;
      }
      if (!geste.bouge && Math.hypot(p[0] - geste.p[0], p[1] - geste.p[1]) > 6) { geste.bouge = true; finAppui(); dom.classList.add('glisse'); this.hud.cacherBulle(); this.glisse = true; }
      if (!geste.bouge) return;
      const dx = p[0] - avant[0], dy = p[1] - avant[1];
      if (geste.pan) this.panoramique(dx, dy);
      else { this.but.theta -= dx * 0.008; this.but.phi -= dy * 0.006; }
      this.reveil();
    });
    const fin = e => {
      finAppui();
      if (!pts.has(e.pointerId)) return;
      pts.delete(e.pointerId);
      if (geste && !geste.deux && !geste.bouge && !geste.fait && e.type === 'pointerup' && geste.bouton === 0) this.toucher(pos(e), e.pointerType);
      // Clic droit sans glisser : le drapeau (glisser du bouton droit déplace la vue).
      if (geste && !geste.deux && !geste.bouge && e.type === 'pointerup' && geste.bouton === 2) this.drapeauEcran(pos(e));
      if (!pts.size) { geste = null; dom.classList.remove('glisse'); this.glisse = false; this.reveil(); }
      else if (geste && geste.deux) geste = null;
    };
    on(el, 'pointerup', fin);
    on(el, 'pointercancel', fin);
    on(el, 'pointerleave', e => { if (e.pointerType === 'mouse') this.hud.cacherBulle(); });
    on(el, 'contextmenu', e => { e.preventDefault(); });
    on(el, 'wheel', e => { e.preventDefault(); this.but.dist *= Math.exp(e.deltaY * 0.0013); this.reveil(); }, { passive: false });
    if (typeof ResizeObserver === 'function') { this.ro = new ResizeObserver(() => this.taille()); this.ro.observe(dom); }
  }

  // Déplace la cible dans le plan du sol, selon l'orientation de la caméra.
  panoramique(dx, dy) {
    const k = this.but.dist * 0.0021 * (this.telephone ? 1.3 : 1), th = this.cam.theta;
    this.but.x -= (dx * Math.cos(th) + dy * Math.sin(th)) * k;
    this.but.z -= (-dx * Math.sin(th) + dy * Math.cos(th)) * k;
  }

  // Le rayon sous un point de l'écran : un repère d'abord, sinon le dessus des îles.
  viser(p) {
    const THREE = window.THREE, el = this.renderer.domElement;
    const ndc = new THREE.Vector2((p[0] / el.clientWidth) * 2 - 1, -(p[1] / el.clientHeight) * 2 + 1);
    this.raycaster.setFromCamera(ndc, this.camera);
    this.raycaster.camera = this.camera;
    const vis = (this.reperes || []).filter(s => s.visible);
    const hr = this.raycaster.intersectObjects(vis, false);
    if (hr.length) {
      // Une pastille de sprite est ronde : on garde le premier impact dans le disque.
      const s = hr.sort((a, b) => b.object.renderOrder - a.object.renderOrder)[0].object;
      return { item: s.userData.item };
    }
    const tops = [...this.iles.values()].map(d => d.dessus).filter(Boolean);
    const h = this.raycaster.intersectObjects(tops, false)[0];
    if (!h) return null;
    const x = Math.round(h.point.x), y = Math.round(h.point.z);
    return { id: Atlas.at(x, y), x, y, point: h.point };
  }

  survol(p) {
    if (this.survolRaf) { this.survolP = p; return; }
    this.survolP = p;
    this.survolRaf = requestAnimationFrame(() => {
      this.survolRaf = 0;
      if (this.mort) return;
      const v = this.viser(this.survolP);
      if (!v) { this.hud.cacherBulle(); return; }
      const html = v.item ? this.hud.bulleRepere(v.item.groupe && v.item.groupe.length ? Object.assign({}, v.item, { groupe: v.item.groupe }) : v.item) : this.hud.bulleCase(v);
      this.hud.montrerBulle(html, this.survolP[0], this.survolP[1]);
    });
  }

  toucher(p, type) {
    const v = this.viser(p);
    if (!v) return;
    if (v.item && v.item.kind === 'drapeau') { this.hud.poserDrapeau(null); return; }
    const tactile = type && type !== 'mouse';
    if (v.item) {
      const c = v.item.map && Atlas.coordsOf(v.item.map);
      this.hud.choisirCarte(v.item.map || null, c ? c[0] : 0, c ? c[1] : 0, this.hud.bulleRepere(v.item), tactile);
    } else this.hud.choisirCarte(v.id, v.x, v.y, this.hud.bulleCase(v), tactile);
    this.majReperes();
  }

  drapeauEcran(p) {
    const v = this.viser(p);
    if (v && v.item && v.item.kind === 'drapeau') { this.hud.poserDrapeau(null); return; }
    if (v && v.point) this.hud.poserDrapeau([Math.round(v.point.x * 100) / 100, Math.round(v.point.z * 100) / 100]);
  }

  // Le point de l'écran d'une case du monde (pour une bulle, et pour les tests).
  ecran(x, y) {
    if (!this.camera) return null;
    const THREE = window.THREE, el = this.renderer.domElement;
    this.camera.updateMatrixWorld();
    const v = new THREE.Vector3(x, this.hauteur(x, y), y).project(this.camera);
    if (v.z > 1) return null;
    return [(v.x + 1) / 2 * el.clientWidth, (1 - v.y) / 2 * el.clientHeight];
  }

  // Temps moyen d'un rendu, en millisecondes (les dernières images).
  mesure() {
    const l = this.temps.slice(-60);
    return { rendu: l.length ? Math.round(l.reduce((a, b) => a + b, 0) / l.length * 10) / 10 : null, images: l.length, memoire: this.renderer ? Object.assign({}, this.renderer.info.memory) : null, triangles: this.renderer ? this.renderer.info.render.triangles : null, appels: this.renderer ? this.renderer.info.render.calls : null };
  }

  // ----- Tout rendre : géométries, matériaux, textures, contexte -----

  dispose() {
    if (this.mort) return;
    this.mort = true;
    Carte3D.vivantes = Math.max(0, (Carte3D.vivantes || 1) - 1);
    if (this.raf) cancelAnimationFrame(this.raf);
    if (this.survolRaf) cancelAnimationFrame(this.survolRaf);
    if (this.minuterie) clearTimeout(this.minuterie);
    this.raf = this.minuterie = this.survolRaf = 0;
    if (this.ro) this.ro.disconnect();
    for (const [cible, type, fn, o] of this.ecouteurs) cible.removeEventListener(type, fn, o);
    this.ecouteurs = [];
    if (this.scene) {
      this.scene.traverse(o => {
        if (o.geometry) o.geometry.dispose();
        if (o.material) for (const m of [].concat(o.material)) { if (m.map) m.map.dispose(); m.dispose(); }
        if (o.isLight && o.shadow && o.shadow.dispose) o.shadow.dispose();
        if (o.dispose && o.isInstancedMesh) o.dispose();
      });
      this.scene.clear();
    }
    for (const t of this.textures.concat(this.texReperes || [])) t.dispose();
    this.textures = []; this.texReperes = []; this.reperes = []; this.derive = []; this.iles.clear();
    if (this.renderer) {
      this.renderer.renderLists.dispose();
      this.renderer.dispose();
      this.memoireFin = Object.assign({}, this.renderer.info.memory);
      this.renderer.forceContextLoss();
      this.renderer.domElement.remove();
    }
    this.dom.remove();
    this.dom.innerHTML = '';
    this.hud.cacherBulle();
    this.scene = null; this.camera = null; this.toi = null; this.selection = null;
  }

  // ----- Outils -----

  // Bruit de valeur lissé, déterministe.
  static bruit(x, y, s) {
    const h = (a, b) => { let n = (Math.imul(a, 374761393) + Math.imul(b, 668265263) + Math.imul(s | 0, 974634211)) | 0; n = Math.imul(n ^ (n >>> 13), 1274126177); return ((n ^ (n >>> 16)) >>> 0) / 4294967296; };
    const xi = Math.floor(x), yi = Math.floor(y), fx = x - xi, fy = y - yi, u = fx * fx * (3 - 2 * fx), v = fy * fy * (3 - 2 * fy);
    const a = h(xi, yi), b = h(xi + 1, yi), c = h(xi, yi + 1), d = h(xi + 1, yi + 1);
    return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
  }

  static hasard(cle) { let seed = 0; for (let i = 0; i < cle.length; i++) seed = Math.imul(seed ^ cle.charCodeAt(i), 16777619) >>> 0; return () => { seed = (seed + 0x6d2b79f5) | 0; let t = Math.imul(seed ^ (seed >>> 15), 1 | seed); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }

  // Flou en boîte 3 x 3, `n` passes, sur une grille.
  static flou(a, W, H, n) {
    const b = new Float32Array(a.length);
    for (let p = 0; p < n; p++) {
      for (let j = 0; j < H; j++) for (let i = 0; i < W; i++) {
        let s = 0, c = 0;
        for (let dj = -1; dj <= 1; dj++) { const y = j + dj; if (y < 0 || y >= H) continue; for (let di = -1; di <= 1; di++) { const x = i + di; if (x < 0 || x >= W) continue; s += a[y * W + x]; c++; } }
        b[j * W + i] = s / c;
      }
      a.set(b);
    }
  }

  // Les strates de la roche d'une région, de la lèvre au fond : une fonction profondeur → couleur.
  static strates(regId) {
    const THREE = window.THREE;
    const pal = (Carte3D.STRATES[regId] || Carte3D.STRATES.orsane).map(h => new THREE.Color(h));
    return d => {
      const t = Math.max(0, Math.min(0.999, d / 3.2)) * (pal.length - 1), i = Math.floor(t), f = t - i;
      const bande = (Math.sin(d * 19) > 0.72) ? 0.86 : 1;
      const a = pal[i], b = pal[Math.min(pal.length - 1, i + 1)];
      return [(a.r + (b.r - a.r) * f) * bande, (a.g + (b.g - a.g) * f) * bande, (a.b + (b.b - a.b) * f) * bande];
    };
  }

  // Une pastille de groupe : la pastille du premier repère et le nombre de repères.
  static compte(item, n) {
    const art = CartePeinture.pastille(item.kind, 112, item.sub);
    if (n < 2) return art;
    const cle = 'compte' + item.kind + item.sub + n;
    Carte3D.comptes = Carte3D.comptes || new Map();
    if (Carte3D.comptes.has(cle)) return Carte3D.comptes.get(cle);
    const cv = document.createElement('canvas'); cv.width = art.canvas.width; cv.height = art.canvas.height;
    const g = cv.getContext('2d');
    g.drawImage(art.canvas, 0, 0);
    const bx = art.ax + art.r * 0.75, by = art.ay - art.r * 0.75, br = art.r * 0.42;
    g.fillStyle = '#1d1712'; g.beginPath(); g.arc(bx, by, br, 0, Math.PI * 2); g.fill();
    g.strokeStyle = 'rgba(255,255,255,0.9)'; g.lineWidth = 3; g.stroke();
    g.fillStyle = '#fff'; g.font = `700 ${Math.round(br * 1.25)}px sans-serif`; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(String(n), bx, by + 1);
    const out = { canvas: cv, ax: art.ax, ay: art.ay, r: art.r };
    Carte3D.comptes.set(cle, out);
    return out;
  }
}

// Strates de falaise par région (docs/DIRECTION-ARTISTIQUE.md) : calcaire d'Orsane, basalte de Kaldum.
Carte3D.STRATES = {
  orsane: ['#ece6d8', '#d3cfc6', '#b4b4bd', '#9198ab', '#6c7390', '#4a5170', '#3b4260'],
  kaldum: ['#ab998c', '#8f7d70', '#76655a', '#5d4d45', '#4a3c36', '#3e3230', '#241a18'],
};
Carte3D.ROCHE = { thessa: '#b9c7b4', lisiere: '#b5aeb4', basvoiles: '#4a3b5c', voile: '#3a3550' };
Carte3D.LANTERNE = { thessa: '#9ff0e6', lisiere: '#f0d6ff', basvoiles: '#ff7db0', voile: '#d6c8ff' };
