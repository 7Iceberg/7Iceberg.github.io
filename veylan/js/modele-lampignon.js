// Le Lampignon modelé par le code (docs/ILE-TECHNIQUE.md, 3.14) : le champignon des Murets, à la
// coiffe tachée de lueurs, aux lamelles cyan et à l'œil de verre, écrit pièce par pièce d'après
// sa planche (le même procédé que le Glym, js/modele-glym.js) : des cotes, des tours (lathe), des
// ellipsoïdes, des textures peintes par le code, des lueurs à part et un cerne en coque retournée,
// pour le trait encré de la planche.
//
// Cinq maillages, cinq appels : le corps (coiffe, tronc, bras, pieds, monture de l'œil, en ombrage
// à trois tons et couleurs de sommets), le cerne, les lamelles, les lueurs (taches de la coiffe,
// verre et anneau de l'œil) et le halo de l'œil, additif. Dans le jeu, une troupe instanciée
// (Troupe) que le parc des Glyms modelés (ModeleGlym.Parc) pose avec les autres ; sur la planche,
// un THREE.Group (construire).
//
// Repère : y en haut, la face vers +z (l'œil), les pieds sur y = 0 ; unités de la planche.
const ModeleLampignon = (() => {
  const TAU = Math.PI * 2;

  const COTES = {
    hauteur: 25.3, emprise: 24,
    // Les cotes sont relevées sur la fiche, pixel par pixel (la vue de dos pour la coiffe, qui n'y
    // est pas penchée vers nous ; la vue de face pour le corps, les bras, les jambes et l'œil) ; les
    // profils donnent l'inclinaison. La coiffe dans son repère (le bord à y = 0), du bord vers le
    // sommet (un tour de Three tourne ses faces vers l'extérieur quand y monte) : le bord épais et
    // roulé qui s'évase, un sommet large et rond qui se détache (le disque clair de la vue de dessus),
    // aussi haute que son rayon.
    coiffe: [[10.0, 0], [10.75, 0.45], [11.0, 1.2], [11.0, 1.6], [10.7, 2.4], [10.1, 3.1], [9.4, 3.8], [8.6, 4.6], [7.85, 5.5], [7.25, 6.4], [6.8, 7.3], [6.35, 8.1], [5.95, 8.9], [5.45, 9.7], [4.85, 10.5], [4.0, 11.3], [2.9, 11.85], [1.6, 12.25], [0, 12.5]],
    // Vue de dessus, la coiffe s'allonge un peu d'avant en arrière et se resserre vers l'arrière (l'œuf
    // de la fiche, le gros bout devant) : `oeuf`, le resserrement au bord de derrière.
    allonge: 1.07, oeuf: 0.28,
    // Son dessous, peu creusé : les lamelles rayonnent du tronc au bord.
    dessous: [[10.0, 0], [8.6, 0.8], [7.2, 1.4], [5.8, 1.85], [4.5, 2.2], [3.6, 2.4]],
    // La pose de la coiffe : hauteur du bord, avancée, inclinaison (vers l'arrière : le bord de devant
    // se relève, comme sur les profils).
    pose: { y: 13.0, z: 0.5, inclinaison: -0.27 },
    // Le tronc, des jambes au dessous de la coiffe : un sac à peine plus large en bas, presque rond.
    tronc: [[0, 2.2], [2.4, 2.3], [4.4, 2.9], [5.4, 4.0], [5.85, 5.6], [5.85, 7.4], [5.6, 9.2], [5.25, 11.0], [4.95, 12.6], [4.6, 14.0], [4.2, 15.4], [3.4, 16.4], [0, 16.9]],
    aplati: 0.95,
    // L'œil, au ras du bord de la coiffe : une monture d'ardoise épaisse, un verre bleu-vert sombre
    // et bombé, un anneau cyan fin, un cœur bleu-vert ; il sort du tronc (saillie).
    oeil: { y: 11.0, monture: 3.45, epaisseur: 0.68, verre: 7.0, anneau: 1.8, trait: 0.36, saillie: 1.1 },
    // Les bras : de longues pattes molles qui tombent en s'écartant ; les jambes : deux moignons.
    bras: { x: 7.0, y: 7.6, z: 0.2, rayons: [1.4, 3.9, 1.35], angle: 0.62, epaule: [5.0, 10.6, 0.2] },
    pieds: { x: 2.6, z: 0.3, rayons: [1.65, 1.5, 1.8] },
    // Les taches de lueur de la coiffe (repère de la coiffe) : angle autour (0 la face), hauteur, taille.
    taches: [[-0.55, 10.4, 1.4], [1.25, 7.5, 0.75], [2.35, 9.3, 0.6], [2.8, 7.7, 0.45], [-1.9, 5.9, 0.8], [3.5, 10.0, 1.05], [-2.8, 8.0, 0.55]],
    // Les reflets peints de la coiffe (petits éclats ; le grand reflet vient de la lumière, matierePeinte).
    reflets: [[-1.15, 8.4, 0.75, 0.32], [-0.75, 10.0, 0.5, 0.24]],
    // Le trait : franc, brun très sombre, comme l'encrage de la fiche.
    cerne: 0.3,
  };
  const NIVEAUX = {
    planche: { tour: 64, pas: 6, sphere: [28, 18], tore: [14, 40], tex: 512 },
    bureau: { tour: 28, pas: 3, sphere: [14, 9], tore: [7, 22], tex: 512 },
    telephone: { tour: 14, pas: 2, sphere: [8, 6], tore: [5, 14], tex: 256 },
  };
  const COULEURS = {
    coiffeHaut: '#a29a7b', coiffeBas: '#7f785e', bord: '#565040', tronc: '#9a9177', troncBas: '#6f6853', pied: '#7d7660',
    monture: '#222d30', montureClair: '#3c4a4c', verre: '#0f3138', verreCoeur: '#2a717a', pupille: '#215e66',
    anneau: '#38e6f5', anneauCoeur: '#8ff5ff', lueur: '#8fe4ea', lueurCoeur: '#e4fbfa', cerne: '#2c2117',
    lamelleFond: '#56706b', lamelleBord: '#2f3d3b',
  };

  // ----- Les courbes -----

  // Une polyligne lissée (Catmull-Rom uniforme), `n` points par segment.
  function lisser(pts, n) {
    const out = [], P = [pts[0]].concat(pts, [pts[pts.length - 1]]);
    for (let i = 1; i < P.length - 2; i++) {
      for (let k = 0; k < n; k++) {
        const t = k / n, t2 = t * t, t3 = t2 * t;
        const f = (a, b, c, d) => 0.5 * ((2 * b) + (-a + c) * t + (2 * a - 5 * b + 4 * c - d) * t2 + (-a + 3 * b - 3 * c + d) * t3);
        out.push([f(P[i - 1][0], P[i][0], P[i + 1][0], P[i + 2][0]), f(P[i - 1][1], P[i][1], P[i + 1][1], P[i + 2][1])]);
      }
    }
    out.push(pts[pts.length - 1].slice());
    return out;
  }
  // Le point du profil de la coiffe à une hauteur donnée (sur le dessus) : rayon et normale du profil.
  function surCoiffe(y) {
    const P = lisser(COTES.coiffe, 8).reverse();
    for (let i = 0; i < P.length - 1; i++) {
      const a = P[i], b = P[i + 1];
      if ((y <= a[1] && y >= b[1]) || i === P.length - 2) {
        const f = (a[1] - y) / ((a[1] - b[1]) || 1), r = a[0] + (b[0] - a[0]) * f;
        const dr = b[0] - a[0], dy = b[1] - a[1], l = Math.hypot(dr, dy) || 1;
        return { r, nr: -dy / l, ny: dr / l };
      }
    }
    return { r: 0, nr: 0, ny: 1 };
  }

  // ----- Un assembleur de géométries (positions, normales, uv, couleurs, index) -----

  // `partie` : la pièce animée à laquelle appartiennent les sommets ajoutés ensuite (coiffe, bras,
  // bâton : voir les gestes), rangée dans l'attribut aPartie.
  function Brut() { return { p: [], n: [], uv: [], c: [], idx: [], pa: [], partie: 0 }; }
  // Ajoute une géométrie THREE à `b`, transformée par la matrice `m`, avec une couleur par sommet
  // (une fonction de la position locale, ou une couleur) et ses uv (remappés) ou un uv fixe.
  function ajouter(THREE, b, geo, m, couleur, uv) {
    const pos = geo.attributes.position, nor = geo.attributes.normal, uvs = geo.attributes.uv;
    const base = b.p.length / 3, v = new THREE.Vector3(), nm = new THREE.Matrix3().getNormalMatrix(m);
    for (let i = 0; i < pos.count; i++) {
      v.fromBufferAttribute(pos, i);
      const loc = v.clone();
      v.applyMatrix4(m); b.p.push(v.x, v.y, v.z);
      v.fromBufferAttribute(nor, i).applyMatrix3(nm).normalize(); b.n.push(v.x, v.y, v.z);
      if (typeof uv === 'function') { const q = uv(uvs.getX(i), uvs.getY(i)); b.uv.push(q[0], q[1]); } else b.uv.push(uv[0], uv[1]);
      const c = typeof couleur === 'function' ? couleur(loc, i) : couleur;
      b.c.push(c.r, c.g, c.b);
      if (b.pa) b.pa.push(b.partie || 0);
    }
    if (geo.index) for (let i = 0; i < geo.index.count; i++) b.idx.push(base + geo.index.getX(i));
    else for (let i = 0; i < pos.count; i++) b.idx.push(base + i);
    geo.dispose();
  }
  function enGeo(THREE, b) {
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(b.p, 3));
    g.setAttribute('normal', new THREE.Float32BufferAttribute(b.n, 3));
    g.setAttribute('uv', new THREE.Float32BufferAttribute(b.uv, 2));
    g.setAttribute('color', new THREE.Float32BufferAttribute(b.c, 3));
    if (b.pa && b.pa.length === b.p.length / 3) g.setAttribute('aPartie', new THREE.Float32BufferAttribute(b.pa, 1));
    g.setIndex(b.idx);
    g.computeBoundingSphere();
    return g;
  }
  // Le cerne : la coque gonflée le long des normales (dessinée sur l'envers).
  function coque(THREE, b, e) {
    const o = { p: b.p.slice(), n: b.n.slice(), uv: b.uv.slice(), c: b.c.slice(), idx: b.idx.slice(), pa: b.pa ? b.pa.slice() : null };
    for (let i = 0; i < o.p.length; i += 3) { o.p[i] += o.n[i] * e; o.p[i + 1] += o.n[i + 1] * e; o.p[i + 2] += o.n[i + 2] * e; }
    return enGeo(THREE, o);
  }

  // Un tube de rayon variable le long d'une courbe, entre t0 et t1 (repères par transport parallèle).
  function tube(THREE, courbe, t0, t1, n, rad, rayon) {
    const p = [], nn = [], uv = [], idx = [];
    const P = new THREE.Vector3(), T = new THREE.Vector3(), N = new THREE.Vector3(), B = new THREE.Vector3(), D = new THREE.Vector3();
    for (let i = 0; i <= n; i++) {
      const f = i / n, t = t0 + (t1 - t0) * f;
      courbe.getPointAt(t, P);
      const Tn = courbe.getTangentAt(t, new THREE.Vector3());
      if (i === 0) { N.set(0, 0, 1); if (Math.abs(Tn.z) > 0.9) N.set(1, 0, 0); }
      else { N.addScaledVector(Tn, -N.dot(Tn)); }
      N.addScaledVector(Tn, -N.dot(Tn)).normalize();
      T.copy(Tn); B.crossVectors(T, N).normalize();
      const r = rayon(t, f);
      for (let j = 0; j <= rad; j++) {
        const v = j / rad * TAU, s = Math.sin(v), c = -Math.cos(v);
        D.set(c * N.x + s * B.x, c * N.y + s * B.y, c * N.z + s * B.z).normalize();
        p.push(P.x + r * D.x, P.y + r * D.y, P.z + r * D.z); nn.push(D.x, D.y, D.z); uv.push(f, j / rad);
      }
    }
    for (let i = 1; i <= n; i++) for (let j = 1; j <= rad; j++) {
      const a = (rad + 1) * (i - 1) + (j - 1), b = (rad + 1) * i + (j - 1), c = (rad + 1) * i + j, d = (rad + 1) * (i - 1) + j;
      idx.push(a, b, d, b, c, d);
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(p, 3));
    g.setAttribute('normal', new THREE.Float32BufferAttribute(nn, 3));
    g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
    g.setIndex(idx);
    return g;
  }

  // L'occlusion ambiante, cuite dans les couleurs des sommets : chaque sommet s'assombrit selon les
  // surfaces proches qui lui font face (sous la coiffe, entre les bras et le corps, au pied des
  // jambes). Les occultants sont un échantillon des sommets des `sources` (rangés dans une grille
  // pour aller vite) ; un voisin compte s'il est devant le sommet (dans le demi-espace de sa normale)
  // et près de lui. `force` règle l'assombrissement, `teinte` la couleur de l'ombre.
  function occlusion(cible, sources, o) {
    const R = o.rayon, R2 = R * R, force = o.force, tot = sources.reduce((a, b) => a + b.p.length / 3, 0);
    const pas = Math.max(1, Math.round(tot / (o.echantillons || 3000)));
    const pts = [];
    for (const b of sources) for (let i = 0; i < b.p.length / 3; i += pas) pts.push(b.p[3 * i], b.p[3 * i + 1], b.p[3 * i + 2]);
    const cle = (x, y, z) => x + ',' + y + ',' + z, grille = new Map();
    for (let j = 0; j < pts.length; j += 3) {
      const k = cle(Math.floor(pts[j] / R), Math.floor(pts[j + 1] / R), Math.floor(pts[j + 2] / R));
      let l = grille.get(k); if (!l) grille.set(k, l = []); l.push(j);
    }
    const [tr, tg, tb] = o.teinte || [0.32, 0.26, 0.2];
    for (let i = 0; i < cible.p.length / 3; i++) {
      const px = cible.p[3 * i], py = cible.p[3 * i + 1], pz = cible.p[3 * i + 2];
      const nx = cible.n[3 * i], ny = cible.n[3 * i + 1], nz = cible.n[3 * i + 2];
      const cx = Math.floor(px / R), cy = Math.floor(py / R), cz = Math.floor(pz / R);
      let occ = 0;
      for (let a = -1; a <= 1; a++) for (let b2 = -1; b2 <= 1; b2++) for (let c = -1; c <= 1; c++) {
        const l = grille.get(cle(cx + a, cy + b2, cz + c));
        if (!l) continue;
        for (const j of l) {
          const dx = pts[j] - px, dy = pts[j + 1] - py, dz = pts[j + 2] - pz, d2 = dx * dx + dy * dy + dz * dz;
          if (d2 < 1e-4 || d2 > R2) continue;
          const d = Math.sqrt(d2), cs = (dx * nx + dy * ny + dz * nz) / d;
          if (cs > 0.25) occ += (cs - 0.25) * (1 - d / R);
        }
      }
      const ao = Math.exp(-occ * force * pas);
      cible.c[3 * i] *= ao + (1 - ao) * tr; cible.c[3 * i + 1] *= ao + (1 - ao) * tg; cible.c[3 * i + 2] *= ao + (1 - ao) * tb;
    }
  }
  // La matière peinte : un ombrage doux (une rampe fondue au lieu de trois tons tranchés) et un liseré
  // de lumière sur les bords (le contre-jour des illustrations), ajouté au nuanceur à trois tons.
  // `o.rampe` : d'autres tons (gris de 0 à 255, de l'ombre à la lumière) ; `o.brillant` : [force,
  // exposant], un reflet franc de la première lumière directionnelle (le vernis de la fiche).
  function matierePeinte(THREE, params, lisere, o) {
    const tons = (o && o.rampe) || [150, 186, 222, 246, 255];
    const rampe = new Uint8Array(tons.length * 4);
    tons.forEach((v, i) => rampe.set([v, v, v, 255], i * 4));
    const grad = new THREE.DataTexture(rampe, tons.length, 1, THREE.RGBAFormat);
    grad.minFilter = grad.magFilter = THREE.LinearFilter; grad.needsUpdate = true;
    const m = new THREE.MeshToonMaterial(Object.assign({ gradientMap: grad }, params));
    const l = lisere || [1, 0.94, 0.82, 0.32], br = (o && o.brillant) || [0, 1];
    m.onBeforeCompile = sh => {
      sh.uniforms.uLisere = { value: new THREE.Vector4(...l) };
      sh.uniforms.uBrillant = { value: new THREE.Vector2(...br) };
      sh.fragmentShader = 'uniform vec4 uLisere;\nuniform vec2 uBrillant;\n' + sh.fragmentShader.replace('#include <output_fragment>',
        'outgoingLight += uLisere.rgb * uLisere.a * pow(1.0 - clamp(dot(normal, normalize(vViewPosition)), 0.0, 1.0), 2.6) * (0.55 + 0.45 * clamp(normal.y + 0.4, 0.0, 1.0));\n' +
        '#if NUM_DIR_LIGHTS > 0\nif (uBrillant.x > 0.0) { vec3 hb = normalize(directionalLights[0].direction + normalize(vViewPosition)); float sb = pow(max(dot(normal, hb), 0.0), uBrillant.y); outgoingLight += directionalLights[0].color * uBrillant.x * smoothstep(0.3, 0.85, sb) * diffuseColor.r; }\n#endif\n' +
        '#include <output_fragment>');
    };
    m.userData.rampe = grad;
    return m;
  }

  // ----- Les gestes (sort, saut, placement, coup reçu, poussée) -----
  // Chaque modèle écrit sa fonction GLSL `geste(partie, g, R, O, Rc, T, S)` : pour le geste g (x :
  // le genre, y : l'avancement de 0 à 1), le mouvement de la pièce (p devient R p + O ; gPivot donne
  // une rotation autour d'un pivot), puis la rotation Rc, l'écrasement S (largeur, hauteur) et le
  // déplacement T du corps entier (repère du modèle, les pieds à l'origine). Le nuanceur l'applique
  // aux sommets et aux normales ; en jeu, le geste est un attribut d'instance (aGeste), sur la
  // planche un uniforme (uGeste).
  const GESTES = { aucun: 0, sort: 1, saut: 2, placement: 3, coup: 4, pousse: 5 };
  const GLSL_GESTES = `
attribute float aPartie;
#ifdef USE_INSTANCING
attribute vec4 aGeste;
#define GESTE aGeste
#else
uniform vec4 uGeste;
#define GESTE uGeste
#endif
mat3 gRotX(float a) { float c = cos(a), s = sin(a); return mat3(1.0, 0.0, 0.0, 0.0, c, s, 0.0, -s, c); }
mat3 gRotY(float a) { float c = cos(a), s = sin(a); return mat3(c, 0.0, -s, 0.0, 1.0, 0.0, s, 0.0, c); }
mat3 gRotZ(float a) { float c = cos(a), s = sin(a); return mat3(c, s, 0.0, -s, c, 0.0, 0.0, 0.0, 1.0); }
// Une bosse de 0 à 1 puis 0 entre a et b ; une montée douce de 0 à 1 entre a et b ; un ressort amorti.
float gBosse(float t, float a, float b) { float u = clamp((t - a) / (b - a), 0.0, 1.0); return sin(u * 3.14159265); }
float gMonte(float t, float a, float b) { return smoothstep(a, b, t); }
float gRessort(float t, float a, float f, float k) { float u = max(0.0, t - a); return step(a, t) * sin(u * f) * exp(-u * k); }
// Une pièce qui tourne de r autour du pivot p.
void gPivot(mat3 r, vec3 p, out mat3 R, out vec3 O) { R = r; O = p - r * p; }
// Vrai (1) pour la pièce n.
float gEst(float partie, float n) { return 1.0 - step(0.5, abs(partie - n)); }
`;
  // Rend un matériau animable : la fonction du modèle (`nom`, pour le cache des programmes),
  // appliquée aux positions et aux normales.
  function animable(m, glsl, nom) {
    const avant = m.onBeforeCompile;
    m.onBeforeCompile = (sh, r) => {
      if (avant) avant(sh, r);
      sh.uniforms.uGeste = m.userData.uGeste || (m.userData.uGeste = { value: [0, 0, 0, 0] });
      sh.vertexShader = sh.vertexShader
        .replace('#include <common>', '#include <common>\n' + GLSL_GESTES + glsl + `
vec3 gestePosition(vec3 p) { mat3 R, Rc; vec3 O, T; vec2 S; geste(aPartie, GESTE, R, O, Rc, T, S); return Rc * ((R * p + O) * vec3(S.x, S.y, S.x)) + T; }
vec3 gesteNormale(vec3 n) { mat3 R, Rc; vec3 O, T; vec2 S; geste(aPartie, GESTE, R, O, Rc, T, S); return Rc * ((R * n) / vec3(S.x, S.y, S.x)); }
`)
        .replace('#include <beginnormal_vertex>', '#include <beginnormal_vertex>\nobjectNormal = gesteNormale(objectNormal);')
        .replace('#include <begin_vertex>', '#include <begin_vertex>\ntransformed = gestePosition(transformed);');
    };
    m.customProgramCacheKey = () => 'geste|' + nom + '|' + m.type + '|' + (avant ? 'p' : '');
    m.userData.uGeste = m.userData.uGeste || { value: [0, 0, 0, 0] };
    return m;
  }
  // Pose le geste d'un groupe de la planche : tous ses matériaux (le genre, l'avancement).
  function poserGeste(M, genre, t) {
    for (const m of Object.values(M)) if (m && m.userData && m.userData.uGeste) { const v = m.userData.uGeste.value; v[0] = genre; v[1] = t; }
  }
  // En jeu : un attribut d'instance pour le geste de chaque monstre, et des copies des géométries
  // (les attributs partagés, les géométries gardées en cache pour les autres troupes) qui le portent.
  function gesteInstance(THREE, MAX) { const a = new THREE.InstancedBufferAttribute(new Float32Array(MAX * 4), 4); a.setUsage(THREE.DynamicDrawUsage); return a; }
  function avecGeste(THREE, geo, a) {
    const g = new THREE.BufferGeometry();
    for (const k of Object.keys(geo.attributes)) g.setAttribute(k, geo.attributes[k]);
    if (geo.index) g.setIndex(geo.index);
    g.boundingSphere = geo.boundingSphere;
    g.setAttribute('aGeste', a);
    return g;
  }
  // Une pièce sans attribut aPartie (le halo) : toute sur la pièce n.
  function partieFixe(THREE, geo, n) { geo.setAttribute('aPartie', new THREE.Float32BufferAttribute(new Float32Array(geo.attributes.position.count).fill(n), 1)); }

  // ----- Les textures peintes -----

  // L'atlas du corps (multiplie les couleurs des sommets) : à gauche les rides du tronc, à droite
  // les détails de la coiffe ; un bord blanc pour les pièces lisses.
  const cacheTex = new Map();
  function textures(THREE, niv) {
    const N = NIVEAUX[niv], cle = N.tex;
    const c0 = cacheTex.get(cle);
    if (c0 && c0.THREE === THREE) return c0;
    const W = N.tex * 2, H = N.tex, k = N.tex / 512;
    const cv = document.createElement('canvas'); cv.width = W; cv.height = H;
    const g = cv.getContext('2d');
    g.fillStyle = '#fff'; g.fillRect(0, 0, W, H);
    let s = 41;
    const h = () => { s = (s * 16807) % 2147483647; return (s - 1) / 2147483646; };
    // Le tronc (moitié gauche) : une peau mate marbrée de taches douces, et les rides de la fiche,
    // des plis encrés qui montent du pied en serpentant et se ramifient (un trait sombre, un liseré
    // clair à côté).
    // La bande du tronc dans l'atlas (ses uv : 0,012 + u × 0,466) : ce qui y est peint fait le tour
    // exactement (repeint décalé d'une largeur de bande), le devant du tronc en x0T.
    const x0T = W * 0.012, xT = W * 0.466;
    // Une tache douce dans une bande [x0, x0 + l] qui fait le tour (repeinte décalée d'une largeur
    // de bande de part et d'autre, coupée à la bande) : pas de couture.
    const tacheRaccord = (x, y, r, c0, c1, x0, l) => {
      g.save(); g.beginPath(); g.rect(x0, 0, l, H); g.clip();
      for (const dx of [-l, 0, l]) { const rg = g.createRadialGradient(x + dx, y, 0, x + dx, y, r); rg.addColorStop(0, c0); rg.addColorStop(1, c1); g.fillStyle = rg; g.fillRect(x + dx - r, y - r, 2 * r, 2 * r); }
      g.restore();
    };
    for (let i = 0; i < 34; i++) {
      const x = h() * xT, y = H * (0.25 + h() * 0.75), r = (14 + h() * 34) * k, clair = h() < 0.4;
      const a = 0.05 + h() * 0.06;
      tacheRaccord(x0T + x, y, r, clair ? `rgba(255, 248, 228, ${a})` : `rgba(96, 80, 56, ${a})`, clair ? 'rgba(255, 248, 228, 0)' : 'rgba(96, 80, 56, 0)', x0T, xT);
    }
    // Une ride : un trait qui monte en ondulant, plus fin au bout, avec une ou deux branches.
    g.lineCap = 'round'; g.lineJoin = 'round';
    const ride = (x0, y0, long, ep, branche) => {
      const pts = [[x0, y0]];
      let x = x0, ang = (h() - 0.5) * 0.5;
      for (let j = 1; j <= 9; j++) { ang += (h() - 0.5) * 0.7; ang = Math.max(-0.7, Math.min(0.7, ang)); x += Math.sin(ang) * long / 9; pts.push([x, y0 - long * j / 9]); }
      for (const [dx, dy, c, e] of [[1.6 * k, 0.6 * k, 'rgba(255, 246, 222, 0.35)', ep * 0.8], [0, 0, 'rgba(62, 46, 30, 0.8)', ep]]) {
        for (const ox of [-xT, 0, xT]) {
          for (let j = 1; j < pts.length; j++) {
            g.strokeStyle = c; g.lineWidth = e * (1 - j / pts.length * 0.75);
            g.beginPath(); g.moveTo(pts[j - 1][0] + dx + ox, pts[j - 1][1] + dy); g.lineTo(pts[j][0] + dx + ox, pts[j][1] + dy); g.stroke();
          }
        }
      }
      if (branche) { const j = 3 + Math.floor(h() * 4), p = pts[j]; ride(p[0], p[1], long * 0.35, ep * 0.7, false); }
    };
    g.save(); g.beginPath(); g.rect(x0T, 0, xT, H); g.clip();
    // (Le bas du tronc en haut de l'image : les rides descendent du col, sur le dos et les flancs,
    // le devant gardé pour l'œil.)
    for (let i = 0; i < 9; i++) ride(x0T + (0.16 + (i + h() * 0.6) / 9 * 0.68) * xT, H * (0.97 - h() * 0.12), H * (0.3 + h() * 0.35), (4.2 + h() * 2.0) * k, h() < 0.6);
    // Le pli sous l'œil, de face (le sourire de la fiche) : un arc encré qui remonte aux deux bouts.
    for (const ox of [0, xT]) {
      const x = x0T + ox, y = H * 0.4, dx = xT * 0.075;
      g.strokeStyle = 'rgba(255, 246, 222, 0.35)'; g.lineWidth = 4 * k;
      g.beginPath(); g.moveTo(x - dx, y + 9 * k); g.quadraticCurveTo(x, y - 9 * k, x + dx, y + 9 * k); g.stroke();
      g.strokeStyle = 'rgba(62, 46, 30, 0.85)'; g.lineWidth = 5 * k;
      g.beginPath(); g.moveTo(x - dx, y + 7 * k); g.quadraticCurveTo(x, y - 11 * k, x + dx, y + 7 * k); g.stroke();
    }
    g.restore();
    // La coiffe (moitié droite) : une marbrure fondue, un voile clair au sommet, un bord plus sombre,
    // et les deux petites rides de la fiche près du sommet.
    const xC = W * 0.512, wC = W * 0.446;
    for (let i = 0; i < 46; i++) {
      const x = xC + h() * wC, y = H * (0.15 + h() * 0.8), r = (10 + h() * 30) * k, clair = h() < 0.45;
      const a = 0.04 + h() * 0.06;
      tacheRaccord(x, y, r, clair ? `rgba(255, 250, 235, ${a})` : `rgba(110, 92, 64, ${a})`, clair ? 'rgba(255, 250, 235, 0)' : 'rgba(110, 92, 64, 0)', xC, wC);
    }
    const grd = g.createLinearGradient(0, 0, 0, H);
    // Le sommet plus clair, arrêté net (le disque de la « coiffe supérieure » de la fiche), le bord
    // juste en dessous un peu plus sombre.
    grd.addColorStop(0, 'rgba(255, 252, 240, 0.42)'); grd.addColorStop(0.33, 'rgba(255, 252, 240, 0.3)'); grd.addColorStop(0.385, 'rgba(255, 252, 240, 0)');
    grd.addColorStop(0.41, 'rgba(90, 76, 52, 0.12)'); grd.addColorStop(0.8, 'rgba(90, 76, 52, 0)'); grd.addColorStop(1, 'rgba(80, 66, 44, 0.38)');
    g.fillStyle = grd; g.fillRect(xC, 0, wC, H);
    g.strokeStyle = 'rgba(70, 52, 34, 0.7)'; g.lineWidth = 3 * k;
    for (const [u, v, l] of [[0.06, 0.2, 1], [0.1, 0.27, 0.7]]) {
      const x = xC + u * wC, y = v * H;
      g.beginPath(); g.moveTo(x - 9 * k * l, y - 5 * k); g.quadraticCurveTo(x, y + 6 * k * l, x + 9 * k * l, y - 4 * k); g.stroke();
    }
    const corps = new THREE.CanvasTexture(cv);
    corps.wrapS = corps.wrapT = THREE.ClampToEdgeWrapping; corps.anisotropy = 4;
    if ('encoding' in corps) corps.encoding = THREE.sRGBEncoding;
    // Les lamelles : des nervures cyan qui luisent sur un fond ardoise, courbes comme sur la fiche,
    // du bord (bas de l'image) au tronc (haut), une sur deux plus courte.
    const LW = N.tex, LH = Math.max(64, N.tex / 4);
    const lv = document.createElement('canvas'); lv.width = LW; lv.height = LH;
    const lg = lv.getContext('2d');
    const fond = lg.createLinearGradient(0, 0, 0, LH);
    fond.addColorStop(0, COULEURS.lamelleBord); fond.addColorStop(0.6, COULEURS.lamelleFond); fond.addColorStop(1, '#6b8580');
    lg.fillStyle = fond; lg.fillRect(0, 0, LW, LH);
    const NL = 30;
    lg.lineCap = 'round';
    for (const passe of [0, 1]) {
      for (let i = 0; i < NL; i++) {
        const court = i % 2 ? 0.42 : 0.08, b = LW / NL * 0.55 * (i % 3 ? 1 : -1);
        for (const ox of [-LW, 0, LW]) {
          const x = (i + 0.5) / NL * LW + ox;
          const gl = lg.createLinearGradient(0, LH * court, 0, LH);
          gl.addColorStop(0, 'rgba(120, 220, 228, 0)'); gl.addColorStop(0.35, 'rgba(120, 220, 228, 0.6)'); gl.addColorStop(1, 'rgba(200, 248, 250, 0.95)');
          lg.strokeStyle = gl;
          lg.shadowColor = passe ? 'rgba(0, 0, 0, 0)' : 'rgba(110, 230, 240, 0.7)'; lg.shadowBlur = passe ? 0 : LW / NL * 0.6;
          lg.lineWidth = Math.max(1.5, LW / NL * (passe ? 0.2 : 0.36));
          lg.beginPath(); lg.moveTo(x, LH * court); lg.bezierCurveTo(x + b, LH * (court + 0.3), x - b * 0.6, LH * 0.7, x + b * 0.3, LH * 0.96); lg.stroke();
        }
      }
    }
    lg.shadowBlur = 0;
    const lamelles = new THREE.CanvasTexture(lv);
    lamelles.wrapS = THREE.RepeatWrapping; lamelles.wrapT = THREE.ClampToEdgeWrapping; lamelles.anisotropy = 4;
    if ('encoding' in lamelles) lamelles.encoding = THREE.sRGBEncoding;
    // Les lueurs additives (128 × 64) : à gauche l'anneau de lumière autour de l'anneau de l'œil (le
    // verre laissé sombre au milieu), à droite le rayonnement doux d'une tache de la coiffe.
    const hv = document.createElement('canvas'); hv.width = 128; hv.height = 64;
    const hg = hv.getContext('2d');
    const rg = hg.createRadialGradient(32, 32, 0, 32, 32, 32);
    rg.addColorStop(0, 'rgba(79, 240, 255, 0)'); rg.addColorStop(0.24, 'rgba(79, 240, 255, 0)'); rg.addColorStop(0.33, 'rgba(90, 235, 250, 0.75)');
    rg.addColorStop(0.42, 'rgba(79, 240, 255, 0.12)'); rg.addColorStop(0.6, 'rgba(79, 240, 255, 0)');
    hg.fillStyle = rg; hg.fillRect(0, 0, 64, 64);
    const rt = hg.createRadialGradient(96, 32, 0, 96, 32, 31);
    rt.addColorStop(0, 'rgba(170, 245, 250, 0.6)'); rt.addColorStop(0.3, 'rgba(110, 225, 235, 0.28)'); rt.addColorStop(1, 'rgba(110, 225, 235, 0)');
    hg.fillStyle = rt; hg.fillRect(64, 0, 64, 64);
    const halo = new THREE.CanvasTexture(hv);
    const res = { THREE, corps, lamelles, halo, octets: (W * H + LW * LH + 128 * 64) * 4 * 1.33 };
    cacheTex.set(cle, res);
    return res;
  }

  // ----- Les géométries -----

  const cacheGeo = new Map();
  function geometries(THREE, niv) {
    const c0 = cacheGeo.get(niv);
    if (c0 && c0.THREE === THREE) return c0;
    const N = NIVEAUX[niv], C = COTES, K = COULEURS;
    const col = h => new THREE.Color(h);
    const mix = (a, b, t) => col(a).lerp(col(b), Math.max(0, Math.min(1, t)));
    const M = new THREE.Matrix4(), ident = () => M.identity();
    const V2 = pts => pts.map(([r, y]) => new THREE.Vector2(Math.max(0.0001, r), y));
    const corps = Brut(), lueurs = Brut(), lames = Brut();
    const UV_BLANC = [0.985, 0.5];

    // Le tronc (uv dans la moitié gauche de l'atlas), un peu aplati d'avant en arrière.
    const tronc = new THREE.LatheGeometry(V2(lisser(C.tronc, N.pas)), N.tour);
    ajouter(THREE, corps, tronc, new THREE.Matrix4().makeScale(1, 1, C.aplati), p => mix(K.troncBas, K.tronc, (p.y - 1) / 9), (u, v) => [0.012 + u * 0.466, 1 - v]);
    // La coiffe : le dessus (moitié droite de l'atlas) puis le bord roulé.
    const Pz = C.pose, MC = new THREE.Matrix4().makeScale(1, 1, C.allonge).premultiply(new THREE.Matrix4().makeRotationX(Pz.inclinaison)).premultiply(new THREE.Matrix4().makeTranslation(0, Pz.y, Pz.z));
    const surC = m => m.clone().premultiply(MC);
    // L'œuf : vers l'arrière (z < 0, repère de la coiffe), la largeur se resserre ; la normale suit.
    const kOeuf = z => 1 - C.oeuf * Math.max(0, -z) / C.coiffe[2][0];
    const oeuf = geo => {
      const P = geo.attributes.position, Nn = geo.attributes.normal, v = new THREE.Vector3();
      for (let i = 0; i < P.count; i++) {
        const k = kOeuf(P.getZ(i));
        P.setX(i, P.getX(i) * k);
        v.fromBufferAttribute(Nn, i); v.x /= k; v.normalize(); Nn.setXYZ(i, v.x, v.y, v.z);
      }
      return geo;
    };
    const surOeuf = p => { p.x *= kOeuf(p.z); return p; };
    const coiffe = oeuf(new THREE.LatheGeometry(V2(lisser(C.coiffe, N.pas)), N.tour));
    corps.partie = 1;
    ajouter(THREE, corps, coiffe, MC, p => (p.y < 1.4 ? mix(K.bord, K.coiffeBas, (p.y + 0.4) / 1.8) : mix(K.coiffeBas, K.coiffeHaut, (p.y - 1.4) / 11)), (u, v) => [0.512 + u * 0.446, v]);
    // Les bras : deux ellipsoïdes qui pendent, écartés du tronc.
    for (const sg of [-1, 1]) {
      const B = C.bras, sp = new THREE.SphereGeometry(1, N.sphere[0], N.sphere[1]);
      corps.partie = sg < 0 ? 2 : 3;
      const m = new THREE.Matrix4().compose(new THREE.Vector3(sg * B.x, B.y, B.z), new THREE.Quaternion().setFromEuler(new THREE.Euler(0.1, 0, sg * B.angle)), new THREE.Vector3(...B.rayons));
      ajouter(THREE, corps, sp, m, p => mix(K.troncBas, K.tronc, (p.y + 1) / 2), UV_BLANC);
    }
    // Les pieds : deux galets posés, tournés vers l'avant.
    corps.partie = 4;
    for (const sg of [-1, 1]) {
      const P = C.pieds, sp = new THREE.SphereGeometry(1, N.sphere[0], N.sphere[1]);
      const m = new THREE.Matrix4().compose(new THREE.Vector3(sg * P.x, P.rayons[1], P.z), new THREE.Quaternion().setFromEuler(new THREE.Euler(0, sg * 0.1, -sg * 0.08)), new THREE.Vector3(...P.rayons));
      ajouter(THREE, corps, sp, m, p => mix(K.troncBas, K.pied, (p.y + 1) / 2), UV_BLANC);
    }
    // L'œil : la monture (un tore épais), posée sur la face du tronc, un peu en saillie.
    const O = C.oeil;
    const zFace = (() => { const P = lisser(C.tronc, 6); let r = 6; for (let i = 0; i < P.length - 1; i++) if (O.y >= P[i][1] && O.y <= P[i + 1][1]) { const f = (O.y - P[i][1]) / (P[i + 1][1] - P[i][1]); r = P[i][0] + (P[i + 1][0] - P[i][0]) * f; } return r * C.aplati; })();
    const zOeil = zFace - 0.35 + O.saillie;
    corps.partie = 0;
    const monture = new THREE.TorusGeometry(O.monture, O.epaisseur, N.tore[0], N.tore[1]);
    ajouter(THREE, corps, monture, new THREE.Matrix4().makeTranslation(0, O.y, zOeil), p => mix(K.monture, K.montureClair, (p.y + O.monture) / (2 * O.monture) * (p.z > 0 ? 1 : 0.4)), UV_BLANC);
    // Un fond pour boucher la monture derrière le verre.
    const fondOeil = new THREE.CircleGeometry(O.monture + 0.1, N.tore[1]);
    ajouter(THREE, corps, fondOeil, new THREE.Matrix4().makeTranslation(0, O.y, zOeil - 0.08), col(K.monture), UV_BLANC);
    const nCorps = corps.idx.length;

    // Les lueurs (sans ombrage) : le verre bombé, l'anneau, le reflet, les taches de la coiffe.
    const rVerre = O.monture - O.epaisseur * 0.4, ouv = Math.asin(rVerre / O.verre);
    const verre = new THREE.SphereGeometry(O.verre, N.sphere[0], Math.max(4, Math.round(N.sphere[1] * 0.7)), 0, TAU, 0, ouv);
    ajouter(THREE, lueurs, verre, new THREE.Matrix4().makeRotationX(Math.PI / 2).premultiply(new THREE.Matrix4().makeTranslation(0, O.y, zOeil - O.verre * Math.cos(ouv))), p => mix(K.verreCoeur, K.verre, Math.pow(Math.hypot(p.x, p.z) / rVerre, 1.6)), UV_BLANC);
    const zVerre = zOeil + O.verre * (1 - Math.cos(ouv));
    const anneau = new THREE.TorusGeometry(O.anneau, O.trait, N.tore[0], N.tore[1]);
    ajouter(THREE, lueurs, anneau, new THREE.Matrix4().makeTranslation(0, O.y, zVerre - O.verre + Math.sqrt(O.verre * O.verre - O.anneau * O.anneau) + 0.02), p => mix(K.anneauCoeur, K.anneau, Math.abs(Math.hypot(p.x, p.y) - O.anneau) / O.trait), UV_BLANC);
    const pupille = new THREE.CircleGeometry(O.anneau * 0.55, N.tore[1]);
    ajouter(THREE, lueurs, pupille, new THREE.Matrix4().makeTranslation(0, O.y, zVerre - 0.05), p => mix('#2a6f77', K.pupille, Math.hypot(p.x, p.y) / (O.anneau * 0.55)), UV_BLANC);
    const reflet = new THREE.CircleGeometry(0.34, 12);
    ajouter(THREE, lueurs, reflet, new THREE.Matrix4().compose(new THREE.Vector3(-1.05, O.y + 1.25, zVerre - 0.02), new THREE.Quaternion(), new THREE.Vector3(1.3, 0.85, 1)), col('#f2fdff'), UV_BLANC);
    // Les taches de la coiffe : des ellipses posées sur la surface, le cœur plus clair.
    lueurs.partie = 1;
    for (const [th, y, t] of C.taches) {
      const S = surCoiffe(y), sn = Math.sin(th), cs = Math.cos(th);
      const n = new THREE.Vector3(S.nr * sn, S.ny, S.nr * cs).normalize();
      const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 0, 1), n);
      const disque = new THREE.CircleGeometry(1, 16);
      const m = new THREE.Matrix4().compose(surOeuf(new THREE.Vector3(S.r * sn, y, S.r * cs)).addScaledVector(n, 0.06), q, new THREE.Vector3(t * 1.25, t, 1));
      ajouter(THREE, lueurs, disque, surC(m), p => mix(K.lueurCoeur, K.lueur, Math.hypot(p.x, p.y) * 1.3), UV_BLANC);
    }
    // Les reflets de la coiffe : de longues taches claires, couchées le long de la pente.
    for (const [th, y, lg, la] of C.reflets) {
      const S = surCoiffe(y), sn = Math.sin(th), cs = Math.cos(th);
      const n = new THREE.Vector3(S.nr * sn, S.ny, S.nr * cs).normalize();
      const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 0, 1), n);
      const tq = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 0, 1), 0.5);
      const disque = new THREE.CircleGeometry(1, 14);
      const m = new THREE.Matrix4().compose(surOeuf(new THREE.Vector3(S.r * sn, y, S.r * cs)).addScaledVector(n, 0.05), q.multiply(tq), new THREE.Vector3(lg, la, 1));
      ajouter(THREE, lueurs, disque, surC(m), p => mix('#f4f1e4', '#c9c2a8', Math.hypot(p.x, p.y) * 1.1), UV_BLANC);
    }
    // Les lamelles : le dessous de la coiffe, du bord au tronc.
    const dessous = oeuf(new THREE.LatheGeometry(V2(lisser(C.dessous, Math.max(1, N.pas - 1))), N.tour));
    lames.partie = 1;
    ajouter(THREE, lames, dessous, MC, col('#ffffff'), (u, v) => [u * 3, 1 - v]);

    // Les lueurs additives : l'anneau autour de l'œil, un disque face à l'avant juste devant le
    // verre (moitié gauche de leur image), et le rayonnement de chaque tache de la coiffe, un carré
    // couché sur la coiffe un peu au-dessus d'elle (moitié droite).
    const hp = [], huv = [], hpa = [], hidx = [];
    const carre = (m, u0, partie) => {
      const b0 = hp.length / 3, v = new THREE.Vector3();
      for (const [sx, sy] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) { v.set(sx, sy, 0).applyMatrix4(m); hp.push(v.x, v.y, v.z); huv.push(u0 + (sx + 1) / 4, (sy + 1) / 2); hpa.push(partie); }
      hidx.push(b0, b0 + 1, b0 + 2, b0, b0 + 2, b0 + 3);
    };
    carre(new THREE.Matrix4().compose(new THREE.Vector3(0, O.y, zVerre + 0.2), new THREE.Quaternion(), new THREE.Vector3(O.anneau / 0.33, O.anneau / 0.33, 1)), 0, 0);
    for (const [th, y, t] of C.taches) {
      const S = surCoiffe(y), sn = Math.sin(th), cs = Math.cos(th);
      const n = new THREE.Vector3(S.nr * sn, S.ny, S.nr * cs).normalize();
      const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 0, 1), n);
      carre(surC(new THREE.Matrix4().compose(surOeuf(new THREE.Vector3(S.r * sn, y, S.r * cs)).addScaledVector(n, 0.25), q, new THREE.Vector3(t * 2.3, t * 2.1, 1))), 0.5, 1);
    }
    const halo = new THREE.BufferGeometry();
    halo.setAttribute('position', new THREE.Float32BufferAttribute(hp, 3));
    halo.setAttribute('uv', new THREE.Float32BufferAttribute(huv, 2));
    halo.setAttribute('aPartie', new THREE.Float32BufferAttribute(hpa, 1));
    halo.setIndex(hidx);
    halo.computeBoundingSphere();

    // L'occlusion : le haut du tronc sous la coiffe, les flancs derrière les bras, le bas autour des
    // pieds, le fond des lamelles près du tronc.
    occlusion(corps, [corps, lames], { rayon: 5.5, force: 0.09 });
    occlusion(lames, [corps], { rayon: 5, force: 0.08, teinte: [0.3, 0.3, 0.32] });

    const G = {
      THREE,
      corps: enGeo(THREE, corps), cerne: coque(THREE, corps, C.cerne), lueurs: enGeo(THREE, lueurs), lamelles: enGeo(THREE, lames), halo,
      triangles: (nCorps * 2 + lueurs.idx.length + lames.idx.length + hidx.length) / 3,
    };
    cacheGeo.set(niv, G);
    return G;
  }

  // ----- Les matières -----

  function matieres(THREE, niv) {
    const T = textures(THREE, niv);
    // La matière peinte (ombrage doux et liseré de lumière), un cerne fin et brun.
    // Des tons francs comme la fiche (ombre, demi-teinte, lumière, fondus sur un pas) et un vernis.
    const corps = matierePeinte(THREE, { color: 0xffffff, vertexColors: true, map: T.corps }, [1, 0.95, 0.84, 0.38],
      { rampe: [138, 138, 138, 140, 176, 206, 210, 212, 238, 250, 252, 255, 255], brillant: [0.22, 46] });
    const grad = corps.userData.rampe;
    const M = {
      corps,
      cerne: new THREE.MeshBasicMaterial({ color: new THREE.Color(COULEURS.cerne), side: THREE.BackSide }),
      lueurs: new THREE.MeshBasicMaterial({ color: 0xffffff, vertexColors: true }),
      lamelles: new THREE.MeshBasicMaterial({ color: 0xffffff, map: T.lamelles, side: THREE.DoubleSide }),
      halo: new THREE.MeshBasicMaterial({ map: T.halo, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, color: new THREE.Color(0.85, 0.85, 0.85) }),
    };
    for (const k of ['corps', 'cerne', 'lueurs', 'lamelles', 'halo']) animable(M[k], GLSL, 'lampignon');
    M.grad = grad;
    return { M, T };
  }
  // Le souffle de l'œil : l'anneau et le halo pulsent doucement (une valeur pour tous).
  function pouls(M, t) {
    const p = 0.82 + 0.18 * Math.sin(t * 1.9) + 0.06 * Math.sin(t * 5.3);
    M.halo.color.setScalar(0.5 * p);
    M.lueurs.color.setScalar(0.9 + 0.1 * p);
  }
  // Le dandinement : un léger tassement et un balancement d'un pied sur l'autre.
  function dandine(t) {
    const b = Math.sin(t * 2.3);
    return { sx: 1 + 0.018 * b, sy: 1 - 0.03 * b, rz: 0.045 * Math.sin(t * 1.15), dy: 0 };
  }

  // ----- Les gestes du Lampignon -----
  // Les pièces : 0 le tronc et l'œil, 1 la coiffe (taches, reflets, lamelles), 2 et 3 les bras
  // gauche et droit, 4 les pieds. La coiffe tourne autour de son attache sur le tronc, les bras
  // autour de l'épaule ; le corps entier se penche sur ses pieds, s'écrase, avance et saute.
  //  - Sort (la Bouffée de spores, 650 ms) : il se tasse et se penche en arrière, les bras levés,
  //    puis se jette en avant d'un coup de coiffe (lâcher des spores à 42 %), la coiffe en retard qui
  //    fouette et tremble, et revient.
  //  - Saut (un pas de combat) : il s'écrase, décolle, la coiffe traîne, retombe et s'écrase.
  //  - Placement (720 ms) : il tombe du ciel, s'écrase en touchant le sol, rebondit une fois, la
  //    coiffe ballotte.
  //  - Coup reçu (250 ms) : recul, tassement, la coiffe tremble. Poussée (320 ms) : renversé en
  //    arrière, les bras qui battent.
  const DUREES = { sort: 650, lacher: 0.42, placement: 720, coup: 250, pousse: 320 };
  const GLSL = `
void geste(float partie, vec4 g, out mat3 R, out vec3 O, out mat3 Rc, out vec3 T, out vec2 S) {
  R = mat3(1.0); O = vec3(0.0); Rc = mat3(1.0); T = vec3(0.0); S = vec2(1.0);
  float genre = floor(g.x + 0.5), t = clamp(g.y, 0.0, 1.0);
  if (genre < 0.5) return;
  float coiffe = gEst(partie, 1.0), brasG = gEst(partie, 2.0), brasD = gEst(partie, 3.0);
  float sg = brasD - brasG, bras = brasD + brasG;
  // penche (vers l'avant), ecrase (tassé si positif), haut, avance ; rc la coiffe (vers l'avant),
  // ra les bras levés (vers l'extérieur), rf les bras vers l'avant.
  float penche = 0.0, ecrase = 0.0, haut = 0.0, avance = 0.0, rc = 0.0, ra = 0.0, rf = 0.0;
  if (genre < 1.5) {
    float a = gMonte(t, 0.0, 0.34) * (1.0 - gMonte(t, 0.34, 0.44));
    float b = gMonte(t, 0.33, 0.44) * (1.0 - gMonte(t, 0.56, 1.0));
    penche = -0.22 * a + 0.28 * b;
    ecrase = 0.13 * a - 0.08 * b + 0.06 * gBosse(t, 0.44, 0.6);
    avance = 3.2 * b;
    rc = -0.3 * a + 0.1 * b + 0.22 * gRessort(t, 0.44, 30.0, 7.0);
    ra = 0.95 * a + 0.35 * b;
    rf = -0.4 * a + 1.25 * b;
  } else if (genre < 2.5) {
    ecrase = 0.14 * gBosse(t, 0.0, 0.22) + 0.15 * gBosse(t, 0.8, 1.0) - 0.09 * gBosse(t, 0.18, 0.82);
    haut = 4.6 * gBosse(t, 0.14, 0.86);
    penche = 0.12 * gBosse(t, 0.1, 0.9);
    rc = -0.26 * gBosse(t, 0.12, 0.6) + 0.18 * gBosse(t, 0.6, 1.0);
    ra = 0.75 * gBosse(t, 0.1, 0.9);
  } else if (genre < 3.5) {
    float u = clamp(t / 0.45, 0.0, 1.0);
    haut = (t < 0.45 ? 26.0 * (1.0 - u * u) : 0.0) + 3.0 * gBosse(t, 0.62, 0.86);
    ecrase = 0.28 * gBosse(t, 0.43, 0.66) + 0.08 * gBosse(t, 0.86, 1.0) - 0.12 * (1.0 - step(0.45, t)) * u;
    rc = 0.32 * gRessort(t, 0.45, 26.0, 5.5) - 0.2 * (1.0 - step(0.45, t));
    ra = 1.1 * (1.0 - gMonte(t, 0.4, 0.55)) + 0.5 * gBosse(t, 0.6, 0.9);
    penche = 0.06 * gRessort(t, 0.45, 20.0, 6.0);
  } else if (genre < 4.5) {
    penche = -0.3 * gBosse(t, 0.0, 0.6) + 0.08 * gBosse(t, 0.6, 1.0);
    avance = -1.6 * gBosse(t, 0.0, 0.7);
    ecrase = 0.1 * gBosse(t, 0.0, 0.4);
    rc = 0.34 * gRessort(t, 0.0, 22.0, 5.0);
    ra = 0.6 * gBosse(t, 0.0, 0.7);
  } else {
    penche = -0.42 * gBosse(t, 0.0, 0.8);
    ecrase = -0.05 * gBosse(t, 0.0, 0.5);
    rc = -0.35 * gBosse(t, 0.0, 0.7) + 0.2 * gRessort(t, 0.7, 24.0, 6.0);
    ra = 0.9 * gBosse(t, 0.0, 0.85) + 0.25 * sin(t * 30.0) * (1.0 - t);
    rf = 0.6 * gBosse(t, 0.0, 0.8);
  }
  Rc = gRotX(penche);
  T = vec3(0.0, haut, avance);
  S = vec2(1.0 + ecrase * 0.65, 1.0 - ecrase);
  if (coiffe > 0.5) gPivot(gRotX(rc), vec3(0.0, 14.5, 1.0), R, O);
  else if (bras > 0.5) gPivot(gRotZ(sg * ra) * gRotX(-rf), vec3(sg * 5.0, 10.6, 0.2), R, O);
}
`;

  // ----- La planche : un THREE.Group -----
  function construire(THREE, opts) {
    const o = opts || {};
    const niv = o.niveau || 'planche';
    const G = geometries(THREE, niv), { M } = matieres(THREE, niv);
    const groupe = new THREE.Group(), corps = new THREE.Group();
    groupe.name = 'Lampignon';
    const piece = (geo, mat, ordre) => { const m = new THREE.Mesh(geo, mat); m.renderOrder = ordre; corps.add(m); return m; };
    piece(G.cerne, M.cerne, 0); piece(G.corps, M.corps, 1); piece(G.lamelles, M.lamelles, 1); piece(G.lueurs, M.lueurs, 2);
    if (o.halo !== false) piece(G.halo, M.halo, 3);
    groupe.add(corps);
    groupe.userData = {
      matieres: M, niveau: niv,
      // Un geste (GESTES : le genre ; t de 0 à 1), ou aucun (genre 0).
      geste(genre, t) { poserGeste(M, typeof genre === 'string' ? GESTES[genre] || 0 : genre, t || 0); },
      animer(t, etat) {
        const e = etat || {};
        pouls(M, t);
        if (e.fixe) { corps.scale.set(1, 1, 1); corps.rotation.z = 0; return; }
        const d = dandine(t);
        corps.scale.set(d.sx, d.sy, d.sx); corps.rotation.z = d.rz;
      },
      liberer() { for (const m of Object.values(M)) m.dispose(); },
    };
    return groupe;
  }

  // ----- Le jeu : une troupe instanciée, posée par ModeleGlym.Parc -----
  class Troupe {
    constructor(THREE, opts) {
      const MAX = opts.max || 24, niv = opts.niveau;
      const G = geometries(THREE, niv), { M, T } = matieres(THREE, niv);
      this.M = M; this.octets = T.octets; this.cotes = COTES; this.hauteurJeu = 1.4;
      this.matrice = new THREE.InstancedBufferAttribute(new Float32Array(MAX * 16), 16);
      this.couleur = new THREE.InstancedBufferAttribute(new Float32Array(MAX * 3).fill(1), 3);
      // Le parc écrit le temps et l'état de chaque instance : gardés ici, lus par etat().
      this.aTemps = new THREE.InstancedBufferAttribute(new Float32Array(MAX), 1);
      this.aEtat = new THREE.InstancedBufferAttribute(new Float32Array(MAX * 4), 4);
      for (const a of [this.matrice, this.couleur]) a.setUsage(THREE.DynamicDrawUsage);
      // Le geste de chaque instance (le genre, l'avancement), écrit par le parc.
      this.aGeste = gesteInstance(THREE, MAX); this.codes = GESTES; this.durees = DUREES;
      this.geos = [];
      const maillage = (geo0, mat, ordre, teinte) => {
        const geo = avecGeste(THREE, geo0, this.aGeste); this.geos.push(geo);
        const m = new THREE.InstancedMesh(geo, mat, MAX);
        m.instanceMatrix = this.matrice; if (teinte) m.instanceColor = this.couleur;
        m.count = 0; m.frustumCulled = false; m.renderOrder = ordre;
        return m;
      };
      this.groupe = new THREE.Group();
      this.parts = [maillage(G.cerne, M.cerne, 7.9), maillage(G.corps, M.corps, 8, true), maillage(G.lamelles, M.lamelles, 8), maillage(G.lueurs, M.lueurs, 8.05)];
      if (opts.halo) this.parts.push(maillage(G.halo, M.halo, 8.4));
      this.groupe.add(...this.parts);
      this.n = 0;
      this.triangles = G.triangles;
    }
    // Le dandinement d'une instance (le parc l'applique à sa matrice).
    deformer(t) { return dandine(t); }
    // Le coup reçu : le corps s'éclaircit un instant.
    teinter(i, flash) { const k = 1 + flash * 1.1; this.couleur.array.set([k, k, k], i * 3); }
    debut(t) { pouls(this.M, t); }
    fin() { this.couleur.needsUpdate = this.aGeste.needsUpdate = true; }
  }

  // Les outils d'assemblage, partagés avec les autres modèles écrits par le code
  // (js/modele-lampignard.js).
  const outils = { Brut, ajouter, enGeo, coque, lisser, tube, dandine, occlusion, matierePeinte, animable, poserGeste, gesteInstance, avecGeste, partieFixe, GESTES };
  return { COTES, NIVEAUX, COULEURS, GESTES, DUREES, construire, geometries, Troupe, outils };
})();
