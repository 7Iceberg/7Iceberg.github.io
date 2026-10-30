// L'aperçu de nuit de l'île d'Ervane (docs/ILE-TECHNIQUE.md, 3.24) : une ambiance faite par le code
// seul (ciel étoilé, lune, brume bleu nuit, clé froide de la lune, flaque de lumière dorée qui suit
// le Veilleur, lucioles, lanternes et fenêtres plus vives) et un décor plus dense au village (les
// Mailles) et dans le Bois Cousu, fait de modèles libres (Kenney, CC0 : assets/libres/LICENSE)
// recolorés à la palette de l'île, et de pièces du code (buissons, courges, fanions).
//
// Chargé à la demande (IleCharge.nuit) quand l'adresse porte ?ambiance=nuit ou que la copie de
// l'aperçu pose DATA.ile.ambiance = 'nuit' (tools/make-online.sh --nuit) ; sinon jamais, et le jeu ne
// change pas. Rien ici ne touche au moteur : la navigation, la grille de marche, les aires de combat
// et le semis restent ceux du jour. Le décor ajouté entre dans les morceaux fusionnés du décor
// (IleDecor.construire, `ajouts`) : pas d'appel de dessin de plus ; il ne pose rien qui bloque, sauf
// là où la navigation est déjà fermée (les grands sapins), et rien sur les sentiers, les places et
// les aires. Les touffes d'herbe des modèles suivent la mécanique de l'herbe proche (Ile3D.semisProche).
//
// Repère : X = u, Y = h, Z = v (comme js/ile-decor.js). Three.js est chargé avant.
const IleNuit = (() => {
  const M = () => IleTerrain.M;
  const clamp = (x, a, b) => (x < a ? a : x > b ? b : x);

  // ----- Les modèles libres (assets/libres/modeles-libres.js), décodés une fois -----

  // Les classes de couleur des modèles de Kenney (sRGB 0 à 255, la couleur d'une face) : on sépare
  // un modèle en parties pour les recolorer chacune à la palette de l'île.
  const CLASSES = {
    vert: (r, g, b) => g > r + 25 && g >= b - 12,
    rouge: (r, g, b) => r > 180 && r > g * 1.45 && r > b * 1.45,
    or: (r, g, b) => r > 225 && g >= 155 && b < 120,
    violet: (r, g, b) => b > r + 20 && b > g + 20,
  };
  const decodes = new Map();
  function octets(s) {
    const bin = atob(s), u8 = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) u8[i] = bin.charCodeAt(i);
    return u8;
  }
  // Un modèle brut : positions, normales, couleurs sRGB, indices.
  function brut(nom) {
    if (decodes.has(nom)) return decodes.get(nom);
    const D = typeof window !== 'undefined' && window.MODELES_LIBRES && window.MODELES_LIBRES[nom];
    if (!D) { decodes.set(nom, null); return null; }
    const p = octets(D.p), n = octets(D.n), c = octets(D.c), i = octets(D.i);
    const P16 = new Uint16Array(p.buffer), N8 = new Int8Array(n.buffer), I16 = new Uint16Array(i.buffer);
    const nv = D.sommets, pos = new Float32Array(nv * 3), nor = new Float32Array(nv * 3);
    for (let k = 0; k < nv * 3; k++) {
      const a = k % 3;
      pos[k] = D.min[a] + P16[k] / 65535 * (D.max[a] - D.min[a]);
      nor[k] = N8[k] / 127;
    }
    const r = { pos, nor, col: c, idx: I16, min: D.min, max: D.max };
    decodes.set(nom, r);
    return r;
  }
  // Une partie d'un modèle (`partie` : une classe, 'reste:a,b' pour ce qui n'est dans aucune, ou 'tout') en
  // BufferGeometry : la base au sol (y = 0), des coordonnées de texture planes (la trame des
  // frondaisons), et en couleur des sommets la luminance relative de chaque face (le modelé à
  // facettes du modèle reste ; la teinte vient de la palette de l'île, par la pièce).
  const geos = new Map();
  function modele(THREE, nom, partie) {
    const cle = nom + '|' + partie;
    if (geos.has(cle)) return geos.get(cle);
    const B = brut(nom);
    if (!B) { geos.set(cle, null); return null; }
    const [genre, liste] = partie === 'tout' ? ['tout', []] : partie.startsWith('reste:') ? ['reste', partie.slice(6).split(',')] : ['classe', [partie]];
    const garde = (r, g, b) => (genre === 'tout' ? true : genre === 'reste' ? !liste.some(k => CLASSES[k](r, g, b)) : CLASSES[liste[0]](r, g, b));
    const lum = k => 0.2126 * B.col[k * 3] + 0.7152 * B.col[k * 3 + 1] + 0.0722 * B.col[k * 3 + 2];
    const tris = [];
    let somme = 0, nb = 0;
    for (let t = 0; t < B.idx.length; t += 3) {
      const a = B.idx[t];
      if (!garde(B.col[a * 3], B.col[a * 3 + 1], B.col[a * 3 + 2])) continue;
      tris.push(t);
      for (let q = 0; q < 3; q++) { somme += lum(B.idx[t + q]); nb++; }
    }
    if (!tris.length) { geos.set(cle, null); return null; }
    const moy = somme / nb || 1;
    const carte = new Map(), pos = [], nor = [], col = [], uv = [], idx = [];
    for (const t of tris) for (let q = 0; q < 3; q++) {
      const s = B.idx[t + q];
      if (!carte.has(s)) {
        carte.set(s, pos.length / 3);
        const x = B.pos[s * 3], y = B.pos[s * 3 + 1] - B.min[1], z = B.pos[s * 3 + 2];
        pos.push(x, y, z);
        nor.push(B.nor[s * 3], B.nor[s * 3 + 1], B.nor[s * 3 + 2]);
        const k = clamp(lum(s) / moy, 0.6, 1.4);
        col.push(k, k, k);
        uv.push((x + z * 0.7) * 1.6, y * 1.6);
      }
      idx.push(carte.get(s));
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    g.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3));
    g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
    g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
    g.setIndex(idx);
    g.computeBoundingBox();
    geos.set(cle, g);
    return g;
  }
  // La hauteur d'un modèle (pour le mettre à l'échelle voulue).
  const hauteurModele = nom => { const B = brut(nom); return B ? B.max[1] - B.min[1] : 1; };

  // Une courge, faite par le code : dix côtes, aplatie (80 triangles). Sa base à y = 0.
  let geoCourge = null;
  function courge(THREE) {
    if (geoCourge) return geoCourge;
    const g = new THREE.SphereGeometry(1, 10, 5), P = g.attributes.position;
    for (let i = 0; i < P.count; i++) {
      const x = P.getX(i), y = P.getY(i), z = P.getZ(i), a = Math.atan2(z, x);
      const cote = 1 - 0.13 * Math.pow(Math.abs(Math.cos(a * 5)), 0.6);
      P.setXYZ(i, x * cote, (y * 0.68 + 0.68) * (y < -0.7 ? 0.92 : 1), z * cote);
    }
    g.computeVertexNormals();
    g.computeBoundingBox();
    geoCourge = g;
    return g;
  }

  // ----- Le ciel : un dégradé bleu nuit, une lune, des étoiles peintes sur une petite toile -----

  let urlEtoiles = null;
  function etoiles() {
    if (urlEtoiles) return urlEtoiles;
    try {
      const S = 512, c = document.createElement('canvas'); c.width = S; c.height = S;
      const g = c.getContext('2d'), R = M().hasard(M().cle('etoiles'));
      for (let k = 0; k < 260; k++) {
        const x = R() * S, y = R() * S, r = R() < 0.1 ? 1.4 + R() * 0.8 : 0.55 + R() * 0.7, a = 0.5 + R() * 0.5;
        const teinte = R() < 0.2 ? '255,236,200' : R() < 0.3 ? '200,220,255' : '240,244,255';
        if (r > 1.2) { const q = g.createRadialGradient(x, y, 0, x, y, r * 3.2); q.addColorStop(0, `rgba(${teinte},${a * 0.5})`); q.addColorStop(1, `rgba(${teinte},0)`); g.fillStyle = q; g.beginPath(); g.arc(x, y, r * 3.2, 0, 6.29); g.fill(); }
        g.fillStyle = `rgba(${teinte},${a})`;
        g.beginPath(); g.arc(x, y, r, 0, 6.29); g.fill();
      }
      urlEtoiles = c.toDataURL('image/png');
      c.width = 0; c.height = 0;
    } catch (e) { urlEtoiles = ''; }
    return urlEtoiles;
  }

  // La sprite d'une luciole est calculée dans le fragment (un disque doux) : pas de texture.
  const VS_LUCIOLE = `
attribute float phase;
uniform float temps; uniform float echelle; uniform float ortho; uniform float taille;
varying float vA; varying float vT;
void main() {
  vec4 mv = modelViewMatrix * vec4(position, 1.0);
  gl_Position = projectionMatrix * mv;
  float clignote = pow(max(0.0, sin(temps * (1.3 + fract(phase * 7.1) * 1.4) + phase * 6.283)), 3.0);
  vA = 0.18 + 0.82 * clignote;
  vT = fract(phase * 3.7);
  float px = ortho > 0.5 ? taille * echelle : taille * echelle / max(1.0, -mv.z);
  gl_PointSize = clamp(px * (0.75 + 0.5 * clignote), 3.0, 30.0);
}`;
  const FS_LUCIOLE = `
uniform vec3 c1; uniform vec3 c2;
varying float vA; varying float vT;
void main() {
  float d = length(gl_PointCoord - 0.5) * 2.0;
  if (d > 1.0) discard;
  float coeur = pow(1.0 - d, 5.0), halo = (1.0 - d) * (1.0 - d) * 0.6;
  vec3 c = mix(c1, c2, vT);
  float a = (coeur * 1.4 + halo) * vA;
  gl_FragColor = vec4(c * a, a);
}`;

  // ======================================================================

  class Nuit {
    constructor(THREE, ile) {
      this.THREE = THREE;
      this.ile = ile;
      this.qualite = ile.qualite;
      this.telephone = !!ile.telephone;
      this.c = h => new THREE.Color(h);
      this.compte = { arbres: 0, sapins: 0, buissons: 0, courges: 0, fanions: 0, touffes: 0, halos: 0 };
    }

    // ----- Le décor ajouté (dans IleDecor.construire) -----
    // `A` : les outils de la construction (L, seau, piece, sol, solPlat, palette, zone, G, matrice,
    // coul, melange, fois). Rend rien : les pièces partent dans les morceaux.
    ajouts(A) {
      const THREE = this.THREE, ile = this.ile, T = ile.T, nav = ile.world && ile.world.plateau && ile.world.plateau.nav;
      const { L, seau, piece, sol, solPlat, palette, zone, G, matrice, coul, melange, fois } = A;
      const R = M().hasard(M().cle('nuit-decor'));
      const tel = this.telephone, q = this.qualite;
      // La densité suit la qualité (le budget du téléphone, 3.9).
      const dens = q === 'haute' ? 1 : q === 'basse' ? 0.4 : tel ? 0.5 : 0.8;
      // Les modèles de Kenney coûtent leurs triangles (un sapin : 330) : au téléphone, moins de sapins
      // et de bosquets, autant de buissons et de fougères (le budget de 3.9).
      const kArbres = tel ? 0.6 : 1;

      // Les lanternes, les feux, les fenêtres et les cristaux luisent plus fort la nuit.
      for (const h of G.halos) {
        const chaud = /^#ff[9a-f]|^#ffc|^#ffd|^#f[0-9a-f]c/i.test(h.couleur);
        h.opacite = Math.min(1, (h.opacite == null ? 0.6 : h.opacite) * (chaud ? 1.3 : 1.12));
        h.taille *= chaud ? 1.35 : 1.15;
      }

      // ----- Les règles de pose : rien sur les sentiers, les places, les aires, l'eau, le vide -----
      const W = T.W, H = T.H;
      const dSentier = (u, v) => T.distSentier[clamp(Math.round(v), 0, H - 1) * W + clamp(Math.round(u), 0, W - 1)];
      const aires = T.aires || [];
      const dansAire = (u, v, m) => aires.some(a => u > a.x - m && u < a.x + 15 + m && v > a.y - m && v < a.y + 15 + m);
      const surPlace = (u, v, m) => (T.places || []).some(p => Math.hypot(p.centre[0] - u, p.centre[1] - v) < p.rayon + m);
      const rObj = o => (o.taille ? Math.hypot(o.taille[0], o.taille[1]) / 2 : o.sorte === 'metier' ? 4 : o.sorte === 'arbre_bobine' ? 4 : o.longueur ? o.longueur / 2 : 1.2);
      const presObjet = (u, v, m) => T.objets.some(o => Math.hypot(o.u - u, o.v - v) < rObj(o) + m);
      const presPoint = (u, v, m) => T.pnjs.some(p => Math.hypot(p.u - u, p.v - v) < m) || T.noeuds.some(n => Math.hypot(n.u - u, n.v - v) < m * 0.8)
        || T.relais.some(r => Math.hypot(r.u - u, r.v - v) < m + 2) || T.portes.some(r => Math.hypot(r.u - u, r.v - v) < m + 2)
        || Object.values(T.lieux || {}).some(l => Array.isArray(l) && Math.hypot(l[0] - u, l[1] - v) < m + 1);
      // Le décor du semis, rangé par cases de 4 u : on garde l'espace de chaque pièce.
      const grille = new Map(), CEL = 4;
      const ranger = (u, v, r, sorte) => { const k = Math.floor(u / CEL) + ',' + Math.floor(v / CEL); let l = grille.get(k); if (!l) grille.set(k, l = []); l.push({ u, v, r, sorte }); };
      for (const e of T.decor) if (!['herbe', 'fleurs', 'galet', 'fil'].includes(e.sorte)) ranger(e.u, e.v, e.sorte === 'arbre' ? Math.max(0.5, e.rayon * 0.35) : e.rayon * 0.8, e.sorte);
      const voisins = (u, v, r) => {
        const out = [];
        for (let j = Math.floor((v - r - 3) / CEL); j <= Math.floor((v + r + 3) / CEL); j++) for (let i = Math.floor((u - r - 3) / CEL); i <= Math.floor((u + r + 3) / CEL); i++) { const l = grille.get(i + ',' + j); if (l) for (const e of l) out.push(e); }
        return out;
      };
      const espace = (u, v, r) => voisins(u, v, r).every(e => Math.hypot(e.u - u, e.v - v) >= (e.r + r) * 0.85);
      const ouvert = (u, v) => { if (!nav) return true; const c = nav.caseDe(u, v); return c >= 0 && nav.ouvertStatique(c); };
      // Fermé sur tout un disque : la navigation n'y passe déjà pas.
      const ferme = (u, v, r) => { for (let a = 0; a < 8; a++) for (const d of [0, r * 0.5, r]) if (ouvert(u + Math.cos(a * 0.785) * d, v + Math.sin(a * 0.785) * d)) return false; return true; };
      const plat = (u, v, r) => {
        const h0 = T.hauteurA(u, v);
        if (!Number.isFinite(h0)) return false;
        for (let a = 0; a < 4; a++) { const h = T.hauteurA(u + Math.cos(a * 1.57) * r, v + Math.sin(a * 1.57) * r); if (!Number.isFinite(h) || Math.abs(h - h0) > 0.55) return false; }
        return true;
      };
      const terre = (u, v) => T.dans(u, v) && !T.videA(u, v) && T.profondeurA(u, v) < 0.02 && T.pontA(u, v) < 0;
      const posable = (u, v, r, marge) => terre(u, v) && plat(u, v, r) && !dansAire(u, v, 1.5) && !surPlace(u, v, 0.8) && dSentier(u, v) >= marge && !presObjet(u, v, r + 0.6) && !presPoint(u, v, 1.6) && espace(u, v, r);

      const TRONC = coul('#4a3a30'), TRONC_CLAIR = coul('#6a4e3a');
      // Un sapin des modèles libres (le sapin de Kenney) : le tronc au bois de l'île, la frondaison à
      // la palette de la zone, dégradée comme les houppiers de l'île (sombre dessous, claire dessus).
      const sapin = (u, v, hauteur, opts) => {
        const y = sol(u, v);
        if (!Number.isFinite(y)) return false;
        const k = hauteur / hauteurModele('sapin'), s = seau(u, v), pal = palette(u, v);
        const f = (pal.feuillages || ['#2f5e4e', '#3d7060']).map(coul), t = R();
        const c = fois(melange(melange(f[0], f[1] || f[0], t), coul('#2f6a42'), 0.3), 0.95 + R() * 0.15);
        const rot = R() * 6.283, m = matrice(u, y - 0.05, v, (R() - 0.5) * 0.06, rot, (R() - 0.5) * 0.06, k * (0.9 + R() * 0.2), k, k * (0.9 + R() * 0.2));
        const gF = modele(THREE, 'sapin', 'vert'), gT = modele(THREE, 'sapin', 'reste:vert');
        if (gF) piece(s, 'fronde', gF, m, { c, fronde: true, grain: 0.1, uvk: 1 / Math.max(0.6, k * 0.6), canopee: [y + hauteur * 0.1, y + hauteur] });
        if (gT) piece(s, 'acc', gT, m, { c: fois(opts && opts.clair ? TRONC_CLAIR : TRONC, 1.1), grain: 0.06 });
        const lr = hauteur * 0.18;
        piece(s, 'sil', L.cone(5), matrice(u, y + hauteur * 0.12, v, 0, 0, 0, lr, hauteur * 0.88, lr), { c: fois(c, 0.9) });
        ranger(u, v, Math.max(0.4, hauteur * 0.12), 'sapin');
        this.compte.sapins++;
        return true;
      };
      // Un bosquet des modèles libres (trois ou quatre petits arbres serrés) : grand là où l'on ne
      // passe pas, petit (une touffe de jeunes pousses, qu'on traverse comme un buisson) ailleurs.
      const bosquet = (u, v, taille) => {
        const y = sol(u, v);
        if (!Number.isFinite(y)) return false;
        const nom = R() < 0.6 ? 'bosquet_haut' : 'bosquet', k = taille, s = seau(u, v), pal = palette(u, v);
        const f = (pal.feuillages || ['#2f5e4e', '#3d7060']).map(coul);
        const c = melange(f[0], f[1] || f[0], R());
        const m = matrice(u, y - 0.12, v, 0, R() * 6.283, 0, k, k * (0.9 + R() * 0.3), k);
        const gF = modele(THREE, nom, 'vert'), gT = modele(THREE, nom, 'reste:vert');
        const h = hauteurModele(nom) * k;
        if (gF) piece(s, 'fronde', gF, m, { c, fronde: true, grain: 0.1, uvk: 1 / Math.max(0.6, k * 0.6), canopee: [y, y + h] });
        if (gT) piece(s, 'acc', gT, m, { c: TRONC, grain: 0.06 });
        piece(s, 'sil', L.lobes[Math.floor(R() * 8)], matrice(u, y + h * 0.45, v, 0, 0, 0, k * 0.45, h * 0.5, k * 0.45), { c, fronde: true });
        ranger(u, v, k * 0.4, 'bosquet');
        this.compte.arbres++;
        return true;
      };
      // Un buisson de l'île (deux lobes, comme le semis), qu'on traverse comme les autres.
      const buisson = (u, v, r) => {
        const y = sol(u, v), s = seau(u, v), pal = palette(u, v);
        const f = (pal.feuillages || ['#5f8f4f']).map(coul);
        // Un vert plus jaune que la frondaison de la zone : sous la lune bleue, il reste vert.
        const c = melange(melange(f[0], f[1] || f[0], R()), coul(R() < 0.5 ? '#4f8a3e' : '#5f9444'), 0.45);
        piece(s, 'fronde', L.lobes[Math.floor(R() * 8)], matrice(u, y + r * 0.4, v, 0, R() * 6, 0, r * 1.15, r * 0.95, r * 1.15), { c, fronde: true, grain: 0.12 });
        if (r > 0.5 && !tel) piece(s, 'fronde', L.lobes[Math.floor(R() * 8)], matrice(u + r * 0.55, y + r * 0.3, v + r * 0.35, 0, 0, 0, r * 0.7, r * 0.6, r * 0.7), { c: melange(c, f[1] || c, 0.5), fronde: true });
        ranger(u, v, r, 'buisson');
        this.compte.buissons++;
      };
      // Une fougère (le semis du Bois), six feuilles.
      const fougere = (u, v, r) => {
        const y = sol(u, v), s = seau(u, v), pal = palette(u, v);
        const c = melange(coul('#3f7a52'), coul((pal.feuillages || ['#3d7060'])[0]), 0.4);
        const n = tel ? 5 : 6, a0 = R() * 6.28;
        for (let k = 0; k < n; k++) piece(s, 'fronde', L.feuille, matrice(u, y + 0.02, v, -0.9 - R() * 0.4, a0 + k / n * 6.283, 0, r, r, r), { c: fois(c, 0.85 + R() * 0.3), bas: 0.6, haut: 1.15 });
        ranger(u, v, r * 0.7, 'fougere');
      };
      // Une courge (le potager des Mailles), orange ou paille, parfois deux.
      const COURGES = ['#d9782b', '#e08a2e', '#c9652a', '#e2a14a', '#cf8a3c'].map(coul);
      const uneCourge = (u, v, r) => {
        const y = sol(u, v);
        if (!Number.isFinite(y)) return;
        const s = seau(u, v);
        piece(s, 'acc', courge(THREE), matrice(u, y - r * 0.08, v, 0, R() * 6.28, 0, r, r * (0.8 + R() * 0.25), r), { c: fois(COURGES[Math.floor(R() * COURGES.length)], 0.92 + R() * 0.16), bas: 0.72, haut: 1.06, grain: 0.06 });
        piece(s, 'acc', L.cyl(5), matrice(u, y + r * 1.25, v, (R() - 0.5) * 0.5, 0, (R() - 0.5) * 0.5, r * 0.12, r * 0.45, r * 0.12), { c: coul('#5a6a3a') });
        // Une feuille à côté, une fois sur trois.
        if (R() < 0.35) piece(s, 'fronde', L.lobes[Math.floor(R() * 8)], matrice(u + r * 0.9, y + 0.05, v - r * 0.4, 0, R() * 6, 0, r * 0.8, r * 0.22, r * 0.6), { c: coul('#4f7a3a'), fronde: true });
        ranger(u, v, r, 'courge');
        this.compte.courges++;
      };
      // Un fanion (le drapeau des modèles libres) : la hampe de bois, l'étoffe d'une des toiles des Mailles.
      const TOILES = ['#c9584a', '#3f6f9a', '#e0a63a', '#8a4a3a', '#5f8a52'].map(coul);
      const fanion = (u, v, y, rot, hauteur, k) => {
        const s = seau(u, v), e = hauteur / hauteurModele('fanion');
        const m = matrice(u, y, v, 0, rot, 0, e, e, e);
        const gV = modele(THREE, 'fanion', 'violet'), gB = modele(THREE, 'fanion', 'reste:violet');
        if (gV) piece(s, 'acc', gV, m, { c: fois(TOILES[k % TOILES.length], 1.05), grain: 0.04 });
        if (gB) piece(s, 'acc', gB, m, { c: coul('#5a4636') });
        this.compte.fanions++;
      };

      // ----- Le Bois Cousu : un sous-bois serré -----
      const arbresBois = T.decor.filter(e => e.sorte === 'arbre' && zone(e.u, e.v) === 'ervane_bois');
      // De jeunes sapins au pied des grands arbres (où l'on ne passe guère : le tronc est là).
      for (const e of arbresBois) {
        if (R() > (0.42 * dens + 0.05) * kArbres) continue;
        const a = R() * 6.283, d = 0.95 + R() * 0.5, u = e.u + Math.cos(a) * d, v = e.v + Math.sin(a) * d;
        if (!terre(u, v) || dansAire(u, v, 1) || dSentier(u, v) < 1.2 || presPoint(u, v, 1.4) || !plat(u, v, 0.3)) continue;
        sapin(u, v, 1.6 + R() * 1.4);
      }
      // Le reste du sous-bois, sur une grille tirée au hasard : jeunes sapins, buissons, fougères,
      // loin des sentiers (2 u au moins) ; là où la navigation est fermée, des bosquets.
      const pas = 2.4 / Math.sqrt(dens);
      for (let v = pas / 2; v < T.hauteur; v += pas) for (let u = pas / 2; u < T.largeur; u += pas) {
        const x = u + (R() - 0.5) * pas, z = v + (R() - 0.5) * pas, t = R();
        const zn = zone(x, z);
        if (zn !== 'ervane_bois' && zn !== 'ervane_mailles') continue;
        if (!terre(x, z)) continue;
        if (ferme(x, z, 0.6) && !dansAire(x, z, 1.5) && !presObjet(x, z, 1.2) && plat(x, z, 0.5) && espace(x, z, 0.6)) {
          if (zn === 'ervane_bois' ? t < 0.75 : t < 0.5) { if (R() < 0.5) bosquet(x, z, 2.2 + R() * 1.4); else sapin(x, z, 3.6 + R() * 2.4); }
          continue;
        }
        if (zn === 'ervane_mailles') {
          // Le village : des buissons, quelques jeunes sapins et des carrés de courges dans l'herbe,
          // loin des ruelles et de la place.
          const marge = 1.8 + R();
          if (t < 0.08) { if (posable(x, z, 0.45, marge + 1)) sapin(x, z, 1.5 + R() * 1.3, { clair: true }); }
          else if (t < 0.34) { const r = 0.4 + R() * 0.3; if (posable(x, z, r, marge)) buisson(x, z, r); }
          else if (t < 0.34 + 0.12 * dens && posable(x, z, 0.6, marge)) { const nb = 2 + Math.floor(R() * 2 * dens + 0.5); for (let q = 0; q < nb; q++) { const a = R() * 6.283, d = q ? 0.55 + R() * 0.5 : 0; const cx = x + Math.cos(a) * d, cz = z + Math.sin(a) * d; if (terre(cx, cz) && dSentier(cx, cz) >= marge - 0.6) uneCourge(cx, cz, 0.24 + R() * 0.18); } }
          continue;
        }
        const marge = 2 + R() * 1.5;
        if (t < 0.22 * kArbres) { if (posable(x, z, 0.45, marge + 0.5)) sapin(x, z, 1.4 + R() * 1.2); }
        else if (t < 0.22) { const r = 0.45 + R() * 0.3; if (posable(x, z, r, marge)) buisson(x, z, r); }
        else if (t < 0.32 && !tel) { if (posable(x, z, 0.6, marge + 0.5)) bosquet(x, z, 1.3 + R() * 0.6); }
        else if (t < 0.32) { const r = 0.4 + R() * 0.3; if (posable(x, z, r * 0.7, marge - 0.5)) fougere(x, z, r + 0.15); }
        else if (t < 0.6) { const r = 0.45 + R() * 0.35; if (posable(x, z, r, marge)) buisson(x, z, r); }
        else if (t < 0.85) { const r = 0.5 + R() * 0.35; if (posable(x, z, r * 0.7, marge - 0.5)) fougere(x, z, r); }
      }

      // ----- Les Mailles : potagers, fanions, bannières, fenêtres -----
      let k = 0;
      for (const o of T.objets) {
        if (zone(o.u, o.v) !== 'ervane_mailles') continue;
        const loc = (lx, lz) => { const c = Math.cos(o.rot || 0), s = Math.sin(o.rot || 0); return [o.u + lx * c - lz * s, o.v + lx * s + lz * c]; };
        const r3 = -(o.rot || 0);
        if (o.sorte === 'maison') {
          const t = o.taille || [6, 5], hm = 2.5 + (o.index % 3) * 0.25, y = solPlat(o.u, o.v);
          const larg = t[1] / 2 + 0.5, haut = larg * 0.55;
          // Un fanion au bout du faîte, côté caméra ; un second sur les grandes maisons.
          for (const cote of t[0] >= 6 ? [1, -1] : [1]) {
            const [px, pz] = loc(cote * (t[0] / 2 + 0.35), 0);
            fanion(px, pz, y + hm + haut - 0.1, r3 + (cote > 0 ? 0 : Math.PI), 1.5, k++);
          }
          // La fenêtre luit dans la nuit : un halo devant elle, un autre sur le pignon.
          { const [px, pz] = loc(t[0] * 0.22, t[1] / 2 + 0.25); G.halos.push({ x: px, y: y + 1.0, z: pz, couleur: '#ffc46b', taille: 2.6, opacite: 0.55 }); this.compte.halos++; }
          { const [px, pz] = loc(t[0] / 2 + 0.25, 0); G.halos.push({ x: px, y: y + 1.0, z: pz, couleur: '#ffb85a', taille: 2.1, opacite: 0.45 }); this.compte.halos++; }
          // Le potager, du côté de la caméra : des courges au coin de la façade (loin de la porte, du
          // tonneau et de la jardinière) et le long du pignon est, quelques buissons au pied.
          const n = Math.round((4 + R() * 3) * Math.max(0.6, dens));
          for (let q = 0; q < n; q++) {
            const cote = R() < 0.45 ? 'coin' : 'pignon';
            const [px, pz] = cote === 'coin' ? loc(t[0] * (0.36 + R() * 0.16), t[1] / 2 + 0.55 + R() * 0.8) : loc(t[0] / 2 + 0.55 + R() * 0.75, (R() - 0.3) * (t[1] - 0.8));
            if (!terre(px, pz) || dSentier(px, pz) < 0.6 || surPlace(px, pz, 0.3) || dansAire(px, pz, 1) || presPoint(px, pz, 1.2)) continue;
            if (T.objets.some(b => b !== o && Math.hypot(b.u - px, b.v - pz) < rObj(b) + 0.4)) continue;
            if (R() < 0.7) uneCourge(px, pz, 0.26 + R() * 0.2); else buisson(px, pz, 0.35 + R() * 0.2);
          }
        }
      }
      // Des fanions sur de hautes hampes autour de la place du Métier : là où un sentier entre, on
      // n'en pose pas.
      for (const p of T.places || []) {
        if (zone(p.centre[0], p.centre[1]) !== 'ervane_mailles') continue;
        const n = Math.max(6, Math.round(p.rayon * 0.7));
        for (let i = 0; i < n; i++) {
          const a = i / n * 6.283 + 0.2, rr = p.rayon - 0.4, u = p.centre[0] + Math.cos(a) * rr, v = p.centre[1] + Math.sin(a) * rr;
          const dehors = [p.centre[0] + Math.cos(a) * (p.rayon + 1.6), p.centre[1] + Math.sin(a) * (p.rayon + 1.6)];
          if (!terre(u, v) || dSentier(dehors[0], dehors[1]) < 1 || presObjet(u, v, 0.8) || presPoint(u, v, 1.5) || dansAire(u, v, 1)) continue;
          fanion(u, v, solPlat(u, v) - 0.05, -a, 3.0, i);
        }
      }
      // Les touffes d'herbe des modèles libres : sur l'herbe du village et le sous-bois, hors des
      // sentiers, rangées pour l'herbe proche (Ile3D.semisProche).
      const mats = [], cols = [];
      const m4 = new THREE.Matrix4(), qu = new THREE.Quaternion(), eu = new THREE.Euler(0, 0, 0, 'YXZ'), po = new THREE.Vector3(), sc = new THREE.Vector3(), C = new THREE.Color(), C2 = new THREE.Color();
      const pasT = (tel ? 1.25 : q === 'haute' ? 0.9 : 1.05);
      for (let v = pasT / 2; v < T.hauteur; v += pasT) for (let u = pasT / 2; u < T.largeur; u += pasT) {
        const x = u + (R() - 0.5) * pasT, z = v + (R() - 0.5) * pasT, t = R();
        const zn = zone(x, z);
        if (zn !== 'ervane_bois' && zn !== 'ervane_mailles') continue;
        const amas = M().fbm(x / 6, z / 6, 4411, 2);
        if (t > (zn === 'ervane_bois' ? 0.55 : 0.4) * clamp((amas - 0.3) / 0.3, 0, 1)) continue;
        if (!terre(x, z) || dSentier(x, z) < 0.5 || surPlace(x, z, 0.2) || dansAire(x, z, 0.5) || presObjet(x, z, 0.3)) continue;
        const y = T.marcheA(x, z);
        if (!Number.isFinite(y)) continue;
        const pal = palette(x, z), ph = pal.herbe || ['#6a9664'];
        C.set(ph[R() < 0.5 || !ph[1] ? 0 : 1]); C2.set(pal.herbeClaire || '#b7d08a'); C.lerp(C2, 0.15 + R() * 0.25);
        const s = (zn === 'ervane_bois' ? 1.5 : 1.25) * (0.75 + R() * 0.6);
        eu.set(0, R() * 6.28, 0, 'YXZ'); qu.setFromEuler(eu);
        m4.compose(po.set(x, y - 0.02, z), qu, sc.set(s, s * (0.8 + R() * 0.5), s));
        for (let e = 0; e < 16; e++) mats.push(m4.elements[e]);
        const f = 0.8 + R() * 0.3;
        cols.push(C.r * f, C.g * f, C.b * f);
      }
      this.touffes = { mats, cols };
      this.compte.touffes = cols.length / 3;
    }

    // La touffe des modèles libres, en une géométrie (la teinte vient de l'instance) ; et l'herbe
    // proche qui la porte, refaite autour du point visé comme l'herbe de l'île.
    preparerTouffes(rampe) {
      const THREE = this.THREE, ile = this.ile;
      const g = modele(THREE, 'touffe', 'tout');
      if (!g || !this.touffes || !this.touffes.cols.length) return null;
      // Le vent de l'herbe (Ile3D.matHerbe) suit la hauteur locale : la touffe est mise à la taille
      // d'une touffe de l'île (0,5 u) avant l'instance.
      const max = this.telephone ? 120 : this.qualite === 'haute' ? 600 : 400;
      const H = ile.semisProche(THREE, g, ile.matHerbe(THREE, rampe), this.touffes.mats, this.touffes.cols, max);
      this.touffes = null;
      return H;
    }

    // ----- Les lumières, la brume, le ciel, les eaux -----

    // `L` : les lumières du jour (Ile3D.lumieres). La lune remplace le soleil : froide, plus basse,
    // au même azimut (les ombres cuites restent justes) ; l'hémisphère s'éteint presque ; le
    // contre-jour bleu détache les silhouettes ; la lumière ponctuelle devient la flaque dorée du
    // Veilleur ; en qualité haute, une seconde lumière va à la lanterne la plus proche.
    lumieres(scene, L) {
      const THREE = this.THREE;
      L.hemi.color.set('#3a4f8e'); L.hemi.groundColor.set('#121220'); L.hemi.intensity = 0.3;
      L.cle.color.set('#9cb4ff'); L.cle.intensity = 0.5;
      L.chaud.color.set('#ff9f5a'); L.chaud.intensity = 0.04;
      L.contre.color.set('#8aa8ff'); L.contre.intensity = 0.55;
      L.ponctuelle.color.set('#ffbf3f'); L.ponctuelle.distance = 10.5; L.ponctuelle.decay = 1.5;
      this.flaque = L.ponctuelle;
      if (this.qualite === 'haute') {
        this.lanterne = new THREE.PointLight(new THREE.Color('#ffb347'), 0, 9, 1.6);
        scene.add(this.lanterne);
      }
    }
    // La couleur de la brume d'une région, la nuit : un bleu nuit, à peine teinté par la région.
    brume(couleurRegion) {
      const c = this.c('#101a35');
      return c.lerp(this.c(couleurRegion), 0.1);
    }
    // Le ciel derrière la toile : la lune en haut à gauche (d'où vient sa lumière), les étoiles, le
    // dégradé du zénith à l'horizon brumeux.
    ciel(brumeSRGB) {
      const h = '#' + brumeSRGB.getHexString();
      const url = etoiles();
      const lune = 'radial-gradient(circle at 16% 13%, rgba(246,248,255,0.95) 0, rgba(232,238,255,0.92) 1.6%, rgba(170,190,255,0.3) 2.6%, rgba(120,150,255,0.1) 6%, rgba(0,0,0,0) 13%)';
      return `${lune}, ${url ? `url(${url}) 0 0 / 512px 512px repeat, ` : ''}linear-gradient(180deg, #060b1e 0%, #0c1636 38%, ${h} 100%)`;
    }
    // Les matériaux qui ne voient pas les lumières (l'eau, la chute, les nuages, les figures) prennent
    // la nuit eux-mêmes ; la lueur du sol (flaques des lanternes, fentes, fil d'or) monte.
    materiaux() {
      const ile = this.ile, THREE = this.THREE;
      if (ile.mats && ile.mats.uSol) ile.mats.uSol.forceLueur.value = 1.7;
      // La flaque dorée peinte au sol, autour du Veilleur : elle s'ajoute à la lumière ponctuelle (qui
      // éclaire aussi le décor proche) et reste dorée sur le calcaire clair comme sur la mousse.
      this.uFlaque = { value: new THREE.Vector4(0, 0, 0, 6.5) };
      this.uFlaqueCouleur = { value: new THREE.Color('#ffb43c') };
      if (ile.mats) for (const m of [ile.mats.sol, ile.mats.solBord]) this.flaqueSol(m);
      const e = ile.matEauRef;
      if (e) { e.uniforms.profonde.value.set('#0b1d33'); e.uniforms.claire.value.set('#1f4a66'); e.uniforms.ecume.value.set('#a8bee0'); }
      if (ile.matChute) ile.matChute.color.set('#5d7396');
      // La mer de nuages s'éclaircit en voile : sous l'île et autour d'elle, on voit le ciel étoilé
      // (l'île flotte dans la nuit).
      for (const b of ile.bancs || []) { b.material.color.setRGB(0.2, 0.25, 0.42); b.material.opacity *= 0.42; }
      if (ile.bouffees) {
        const a = ile.bouffees.attributes.teinte;
        for (let i = 0; i < a.count; i++) a.setXYZW(i, a.getX(i) * 0.26, a.getY(i) * 0.3, a.getZ(i) * 0.46, a.getW(i) * 0.6);
        a.needsUpdate = true;
      }
      if (ile.uBrumeBas) ile.uBrumeBas.value.set('#101a33');
      // Le liseré de lune : les bords des frondaisons et des rochers prennent un reflet bleu (les
      // silhouettes se détachent du sous-bois sombre ; pas les murs, que le reflet blanchirait) ; les
      // frondaisons perdent un peu de leur bleu pour rester vertes sous la lune.
      if (ile.mats) {
        for (const nom of ['fronde', 'roche']) this.lisere(ile.mats[nom], nom);
        if (ile.mats.fronde) ile.mats.fronde.color.setRGB(0.8, 0.9, 0.72);
      }
      // Les figures ne sont pas éclairées : un voile froid, léger (elles restent lisibles).
      if (ile.figures && ile.figures.mat && ile.figures.mat.uniforms.lumiereFig) ile.figures.mat.uniforms.lumiereFig.value.setRGB(0.8, 0.84, 0.98);
      void THREE;
    }

    // Un liseré de lune sur un matériau en aplats (MeshToonMaterial) : une lumière émise sur les faces
    // vues de biais, de la couleur de la face, posée après les autres retouches du matériau.
    lisere(m, nom) {
      if (!m) return;
      const THREE = this.THREE, prec = m.onBeforeCompile, cle = m.customProgramCacheKey;
      const u = this.uLisere || (this.uLisere = { value: new THREE.Color(0.32, 0.42, 0.85) });
      m.onBeforeCompile = (sh, r) => {
        if (prec) prec(sh, r);
        sh.uniforms.lisereNuit = u;
        sh.fragmentShader = sh.fragmentShader.replace('#include <common>', '#include <common>\nuniform vec3 lisereNuit;')
          .replace('#include <emissivemap_fragment>', `#include <emissivemap_fragment>
  {
    vec3 vueN = isOrthographic ? vec3(0.0, 0.0, 1.0) : normalize(vViewPosition);
    float bord = 1.0 - clamp(dot(normal, vueN), 0.0, 1.0);
    totalEmissiveRadiance += lisereNuit * diffuseColor.rgb * pow(bord, 2.6);
  }`);
      };
      m.customProgramCacheKey = () => (cle ? cle.call(m) : nom) + '-nuit';
      m.needsUpdate = true;
    }

    // La flaque sur le matériau du sol (js/ile-sol.js : il porte déjà `vMonde`, le point du monde).
    flaqueSol(m) {
      if (!m) return;
      const prec = m.onBeforeCompile, cle = m.customProgramCacheKey, U = this.uFlaque, C = this.uFlaqueCouleur;
      m.onBeforeCompile = (sh, r) => {
        if (prec) prec(sh, r);
        sh.uniforms.flaqueNuit = U; sh.uniforms.flaqueCouleur = C;
        sh.fragmentShader = sh.fragmentShader.replace('#include <common>', '#include <common>\nuniform vec4 flaqueNuit; uniform vec3 flaqueCouleur;')
          .replace('#include <emissivemap_fragment>', `#include <emissivemap_fragment>
  {
    float dF = length(vMonde.xz - flaqueNuit.xz);
    float f = 1.0 - smoothstep(0.0, flaqueNuit.w, dF);
    totalEmissiveRadiance += flaqueCouleur * (0.18 + 0.82 * diffuseColor.rgb) * f * f * 0.55 * step(abs(vMonde.y - flaqueNuit.y), 3.0);
  }`);
      };
      m.customProgramCacheKey = () => (cle ? cle.call(m) : 'sol') + '-nuit';
      m.needsUpdate = true;
    }

    // ----- Les lucioles -----
    // Des points en mélange additif, un disque doux calculé dans le fragment, qui dérivent et
    // clignotent ; seulement autour du point visé (une boîte qui le suit : une luciole sortie d'un
    // côté revient de l'autre). Environ 120 en qualité moyenne.
    lucioles(scene) {
      const THREE = this.THREE;
      const n = this.qualite === 'haute' ? 220 : this.qualite === 'basse' ? 50 : 120;
      const geo = new THREE.BufferGeometry();
      const pos = new Float32Array(n * 3), phase = new Float32Array(n);
      const R = M().hasard(M().cle('lucioles'));
      this.lu = { n, foyer: new Float32Array(n * 3), vit: new Float32Array(n * 3), centre: null, R };
      for (let i = 0; i < n; i++) { phase[i] = R(); this.lu.vit[i * 3] = 0.25 + R() * 0.5; this.lu.vit[i * 3 + 1] = 0.2 + R() * 0.4; this.lu.vit[i * 3 + 2] = R() * 6.283; }
      geo.setAttribute('position', new THREE.BufferAttribute(pos, 3).setUsage(THREE.DynamicDrawUsage));
      geo.setAttribute('phase', new THREE.BufferAttribute(phase, 1));
      const mat = new THREE.ShaderMaterial({
        uniforms: { temps: { value: 0 }, echelle: { value: 400 }, ortho: { value: 0 }, taille: { value: 0.7 }, c1: { value: new THREE.Color('#e2ff86') }, c2: { value: new THREE.Color('#ffe08a') } },
        vertexShader: VS_LUCIOLE, fragmentShader: FS_LUCIOLE,
        transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
      });
      const pts = new THREE.Points(geo, mat);
      pts.frustumCulled = false;
      pts.renderOrder = 9;
      scene.add(pts);
      this.points = pts;
      return pts;
    }
    // Une luciole reprend place dans la boîte autour de (cx, cz).
    reposer(i, cx, cz, rayon, partout) {
      const L = this.lu, R = L.R, T = this.ile.T;
      let x, z;
      if (partout) { x = cx + (R() * 2 - 1) * rayon; z = cz + (R() * 2 - 1) * rayon; }
      else {
        x = L.foyer[i * 3]; z = L.foyer[i * 3 + 2];
        if (x < cx - rayon) x += 2 * rayon; else if (x > cx + rayon) x -= 2 * rayon;
        if (z < cz - rayon) z += 2 * rayon; else if (z > cz + rayon) z -= 2 * rayon;
      }
      const h = T ? T.marcheA(x, z) : 0;
      L.foyer[i * 3] = x; L.foyer[i * 3 + 2] = z;
      // Au-dessus du vide ou de l'eau profonde : la luciole dort (sous l'île, hors de vue).
      L.foyer[i * 3 + 1] = Number.isFinite(h) && (!T || T.profondeurA(x, z) < 0.6) ? h + 0.35 + R() * 1.9 : -9999;
    }

    // ----- Chaque image -----
    // La flaque dorée suit le Veilleur (au-dessus de sa tête), la lanterne proche a sa lumière en
    // qualité haute, les lucioles dérivent ; dans la vue tactique, elles se taisent.
    maj(now, temps, joueur, hj, cam, tact) {
      const ile = this.ile;
      if (this.flaque) {
        const respire = 0.94 + 0.06 * Math.sin(temps * 1.7);
        this.flaque.position.set(joueur.x, hj + 2.6, joueur.y);
        if (this.uFlaque) this.uFlaque.value.set(joueur.x, hj, joueur.y, (ile.enArene ? 4.5 : 6.5) * (0.97 + 0.03 * Math.sin(temps * 1.7)));
        this.flaque.intensity = (ile.enArene ? 1.7 : 2.2) * respire;
      }
      if (this.lanterne) {
        let best = null, bd = 16 * 16;
        for (const l of ile.lanternes || []) { const d = (l.x - joueur.x) ** 2 + (l.z - joueur.y) ** 2; if (d > 4 && d < bd) { bd = d; best = l; } }
        if (best) { this.lanterne.position.set(best.x, best.y + 0.3, best.z); this.lanterne.intensity = 1.6 * (0.85 + 0.15 * Math.sin(temps * 9 + best.x)); }
        else this.lanterne.intensity = 0;
      }
      const P = this.points;
      if (!P) return;
      P.visible = !tact;
      if (tact) return;
      const L = this.lu, c = cam.vise, rayon = Math.min(this.telephone ? 18 : 24, cam.champ * 0.7 + 4);
      if (!L.centre || Math.abs(L.rayon - rayon) > 2) { for (let i = 0; i < L.n; i++) this.reposer(i, c.x, c.y, rayon, true); L.rayon = rayon; }
      L.centre = [c.x, c.y];
      const a = P.geometry.attributes.position, A = a.array;
      for (let i = 0; i < L.n; i++) {
        const fx = L.foyer[i * 3], fz = L.foyer[i * 3 + 2];
        if (fx < c.x - rayon || fx > c.x + rayon || fz < c.y - rayon || fz > c.y + rayon) this.reposer(i, c.x, c.y, rayon, false);
        const v1 = L.vit[i * 3], v2 = L.vit[i * 3 + 1], ph = L.vit[i * 3 + 2];
        A[i * 3] = L.foyer[i * 3] + Math.sin(temps * v1 + ph) * 1.1 + Math.sin(temps * v2 * 2.3 + ph * 2) * 0.3;
        A[i * 3 + 1] = L.foyer[i * 3 + 1] + Math.sin(temps * v2 * 1.7 + ph * 3) * 0.35;
        A[i * 3 + 2] = L.foyer[i * 3 + 2] + Math.cos(temps * v2 + ph) * 1.1;
      }
      a.needsUpdate = true;
      const u = P.material.uniforms, cc = cam.courante, hpx = (ile.renderer ? ile.renderer.getDrawingBufferSize(this._taille || (this._taille = new this.THREE.Vector2())).y : 800);
      u.temps.value = temps;
      if (cc.isOrthographicCamera) { u.ortho.value = 1; u.echelle.value = hpx / ((cc.top - cc.bottom) / (cc.zoom || 1)); }
      else { u.ortho.value = 0; u.echelle.value = hpx / (2 * Math.tan(cc.fov * Math.PI / 360)); }
      void now;
    }
  }

  return { Nuit, modele, courge, etoiles, CLASSES };
})();
