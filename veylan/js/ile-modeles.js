// Les modèles Meshy posés sur le monde modelé (docs/ILE-TECHNIQUE.md, 3.31) : pour commencer, le
// Relais du Fil (le « zaap » de Veylan), d'après le cristal céleste modelé par le fondateur
// (assets/modeles/relais.glb, préparé par tools/meshy/relais.py).
//
// Le GLB porte quatre parties, un noeud chacune : le socle et ses montants (fixes), le coeur (le
// grand cristal, qui flotte et tourne lentement), les anneaux (qui tournent dans l'autre sens) et les
// éclats (qui gravitent). Une seule matière : la couleur, et une texture d'émission (les cristaux
// bleus luisent, et battent doucement).
//
// Chaque relais du plateau (T.relais) reçoit le modèle : à la place de la pierre 'relais' des objets
// quand elle est tout près (l'Amarre), sinon au point du relais lui-même (les Mailles, devant le
// Métier). Les relais sont des enfants du monde modelé : la vue tactique du combat les cache avec le
// décor (IleGlb.tactique), la carte de l'île les montre (ce ne sont pas des maillages du monde à
// réunir). Le point qu'on touche ne change pas (les cibles du décor, ile-decor.js).
//
// Le semis (chargerSemis) : le kit de décor Meshy (assets/decor, versions « -semis » allégées, de
// 150 à 1 500 triangles). Les arbres, rochers, buissons, arbres morts et une part des fougères
// remplacent les formes de base du monde modelé à la même place ; des champignons, des cristaux, des
// flèches de roche, des souches et des troncs couchés en prennent une part. Les maisons, l'étal, le
// puits sec, les arches brisées et les lanternes remplacent les objets posés (poses). IleGlb.construire
// cuit le tout par tuile dans un seul maillage, avec une seule texture (un atlas de seize modèles) :
// un appel de dessin par tuile.
//
// Repère : X = u, Y = h, Z = v ; le modèle est posé sur le sol, centré, 1,9 de haut.
const IleModeles = (() => {
  const FICHIERS = { relais: 'assets/modeles/relais.glb' };
  // La hauteur du relais dans le monde (u) : un peu plus de deux fois le Veilleur.
  const HAUTEUR_RELAIS = 3.4;

  // Le fichier à côté des scripts, en local comme en ligne (comme IleGlb.source).
  function source(chemin) {
    try {
      const ref = document.querySelector('script[src*="ile-modeles.js"]') || document.querySelector('script[src*="ile-charge.js"]');
      if (ref && ref.src) { const u = new URL(ref.src); return new URL('../' + chemin, u).href + u.search; }
    } catch (e) { /* chemin relatif */ }
    return chemin;
  }

  const TYPES = { 5121: Uint8Array, 5123: Uint16Array, 5125: Uint32Array, 5126: Float32Array };
  const N = { SCALAR: 1, VEC2: 2, VEC3: 3, VEC4: 4 };
  // Un accesseur contigu (nos fichiers n'entrelacent pas leurs vues).
  function accesseur(G, bin, idx) {
    const a = G.accessors[idx], bv = G.bufferViews[a.bufferView], n = N[a.type];
    return { array: new TYPES[a.componentType](bin, (bv.byteOffset || 0) + (a.byteOffset || 0), a.count * n), n };
  }

  // Les dimensions d'une image JPEG (son marqueur SOF) ou PNG (IHDR), pour compter ses octets
  // décodés (avec les mipmaps, un tiers de plus) dans la mémoire de la scène (Ile3D.stats).
  function dims(u8) {
    if (u8[0] === 0x89 && u8[1] === 0x50) return [(u8[16] << 24 | u8[17] << 16 | u8[18] << 8 | u8[19]) >>> 0, (u8[20] << 24 | u8[21] << 16 | u8[22] << 8 | u8[23]) >>> 0];
    for (let i = 2; i + 9 < u8.length;) {
      if (u8[i] !== 0xFF) { i++; continue; }
      const m = u8[i + 1], l = u8[i + 2] << 8 | u8[i + 3];
      if (m >= 0xC0 && m <= 0xC3) return [u8[i + 7] << 8 | u8[i + 8], u8[i + 5] << 8 | u8[i + 6]];
      i += 2 + l;
    }
    return [0, 0];
  }

  // Une texture incluse dans le GLB, lue par le navigateur (comme IleHeros).
  function texture(THREE, G, bin, idx, compte) {
    const t = (G.textures || [])[idx], im = t && (G.images || [])[t.source];
    if (!im || im.bufferView == null || typeof Blob === 'undefined' || !URL.createObjectURL) return null;
    const bv = G.bufferViews[im.bufferView], u8 = new Uint8Array(bin, bv.byteOffset || 0, bv.byteLength);
    const d = dims(u8);
    if (compte) compte.tex += d[0] * d[1] * 4 * 4 / 3;
    const url = URL.createObjectURL(new Blob([u8], { type: im.mimeType || 'image/jpeg' }));
    const tex = new THREE.TextureLoader().load(url, () => URL.revokeObjectURL(url));
    tex.flipY = false;
    tex.encoding = THREE.sRGBEncoding;
    return tex;
  }

  // Les parties d'un modèle : { nom: BufferGeometry }, et sa matière (Lambert : la lumière du jeu).
  async function charger(THREE, nom) {
    const { json: G, bin } = await IleGlb.lire(source(FICHIERS[nom]));
    const m = (G.materials || [])[0] || {}, pbr = m.pbrMetallicRoughness || {}, compte = { tex: 0, geo: 0 };
    const mat = new THREE.MeshLambertMaterial({
      map: pbr.baseColorTexture ? texture(THREE, G, bin, pbr.baseColorTexture.index, compte) : null,
      emissiveMap: m.emissiveTexture ? texture(THREE, G, bin, m.emissiveTexture.index, compte) : null,
      emissive: new THREE.Color(m.emissiveTexture ? 0xffffff : 0x000000),
      side: m.doubleSided ? THREE.DoubleSide : THREE.FrontSide,
      fog: true,
    });
    mat.name = 'modele_' + nom;
    const parties = {};
    let triangles = 0;
    for (const n of G.nodes || []) {
      if (n.mesh == null) continue;
      const prim = G.meshes[n.mesh].primitives[0], at = prim.attributes, geo = new THREE.BufferGeometry();
      const p = accesseur(G, bin, at.POSITION);
      geo.setAttribute('position', new THREE.BufferAttribute(p.array, 3));
      if (at.NORMAL != null) geo.setAttribute('normal', new THREE.BufferAttribute(accesseur(G, bin, at.NORMAL).array, 3));
      if (at.TEXCOORD_0 != null) geo.setAttribute('uv', new THREE.BufferAttribute(accesseur(G, bin, at.TEXCOORD_0).array, 2));
      if (prim.indices != null) geo.setIndex(new THREE.BufferAttribute(accesseur(G, bin, prim.indices).array, 1));
      geo.computeBoundingSphere();
      for (const a of Object.values(geo.attributes)) compte.geo += a.array.byteLength;
      if (geo.index) compte.geo += geo.index.array.byteLength;
      parties[n.name || G.meshes[n.mesh].name] = geo;
      triangles += (geo.index ? geo.index.count : p.array.length / 3) / 3;
    }
    return { parties, mat, triangles: Math.round(triangles), octets: compte };
  }

  // Où poser les relais d'un plateau : la pierre 'relais' toute proche (sa place et son orientation),
  // sinon le point du relais.
  function places(T) {
    const out = [];
    for (const r of (T && T.relais) || []) {
      const pierre = (T.objets || []).find(o => o.sorte === 'relais' && Math.hypot(o.u - r.u, o.v - r.v) < 4);
      out.push(pierre ? { u: pierre.u, v: pierre.v, rot: pierre.rot || 0, carte: r.carte } : { u: r.u, v: r.v, rot: 0, carte: r.carte });
    }
    return out;
  }

  // Pose les relais sur le monde modelé de l'île (ile.monde) ; rend l'état animé, ou null.
  async function poser(THREE, ile) {
    if (!ile || !ile.monde || !ile.T) return null;
    const lieux = places(ile.T);
    if (!lieux.length) return null;
    const modele = await charger(THREE, 'relais');
    const bb = new THREE.Box3();
    for (const g of Object.values(modele.parties)) { g.computeBoundingBox(); bb.union(g.boundingBox); }
    const k = HAUTEUR_RELAIS / Math.max(0.01, bb.max.y - bb.min.y);
    const relais = [];
    for (const l of lieux) {
      const groupe = new THREE.Group();
      groupe.name = 'modele relais ' + l.carte;
      const y = ile.hauteur(l.u, l.v);
      groupe.position.set(l.u, (Number.isFinite(y) ? y : 0) - 0.05, l.v);
      groupe.rotation.y = -l.rot;
      groupe.scale.setScalar(k);
      const morceaux = {};
      for (const [nom, geo] of Object.entries(modele.parties)) {
        const o = new THREE.Mesh(geo, modele.mat);
        o.name = 'relais_' + nom;
        groupe.add(o);
        morceaux[nom] = o;
      }
      ile.monde.add(groupe);
      relais.push({ groupe, morceaux, phase: (l.u * 0.37 + l.v * 0.11) % (Math.PI * 2) });
    }
    // La mémoire de la scène (Ile3D.stats) : la géométrie et les textures, une fois (partagées).
    ile.octetsGeo = (ile.octetsGeo || 0) + modele.octets.geo;
    ile.octetsTex = (ile.octetsTex || 0) + modele.octets.tex;
    console.log(`Ervane : ${relais.length} relais du Fil posés (${modele.triangles} triangles chacun, ${Math.round((modele.octets.geo + modele.octets.tex) / 1e5) / 10} Mo)`);
    return { relais, mat: modele.mat, triangles: modele.triangles };
  }

  // Chaque image : le coeur flotte et tourne, les anneaux tournent à l'envers, les éclats gravitent,
  // la lueur bat. `t` en secondes.
  function animer(etat, t) {
    if (!etat) return;
    for (const r of etat.relais) {
      if (!r.groupe.visible) continue;
      const a = t + r.phase, m = r.morceaux;
      if (m.coeur) { m.coeur.position.y = 0.035 * Math.sin(a * 1.3); m.coeur.rotation.y = a * 0.25; }
      if (m.anneaux) m.anneaux.rotation.y = -a * 0.35;
      if (m.eclats) { m.eclats.rotation.y = a * 0.18; m.eclats.position.y = 0.02 * Math.sin(a * 0.9 + 1); }
    }
    if (etat.mat) etat.mat.emissiveIntensity = 0.85 + 0.25 * Math.sin(t * 2.1);
  }

  // ----- Le semis : arbres, rochers, buissons (assets/decor/*-semis.glb) -----
  // Les formes de base du monde modelé et le genre de modèle Meshy qui les remplace, à la même place
  // (IleGlb.construire). Un genre peut garder une partie des instances telles qu'exportées.
  const FORMES = {
    base_arbre_large_0: 'feuillu', base_arbre_large_1: 'feuillu', base_arbre_rond_0: 'feuillu', base_arbre_rond_1: 'feuillu',
    base_arbre_haut_0: 'conifere', base_arbre_haut_1: 'conifere', base_arbre_pin_0: 'conifere', base_arbre_pin_1: 'conifere',
    base_arbre_tordu_0: 'tordu', base_arbre_mort_0: 'mort', base_rocher_0: 'rocher', base_buisson_0: 'buisson', base_buisson_1: 'buisson',
    base_fougere_0: 'fougere',
  };
  // Les modèles et leur case dans l'atlas (2048 x 1024) : [x, y, côté] en pixels.
  const SEMIS = {
    arbre: { case: [0, 0, 512] }, arbre3: { case: [512, 0, 512] }, arbre2: { case: [0, 512, 512] },
    rocher2: { case: [512, 512, 256] }, buisson: { case: [768, 512, 256] }, roc: { case: [512, 768, 256] }, cristal: { case: [768, 768, 256] },
    maison: { case: [1024, 0, 512] }, etal: { case: [1536, 0, 512] },
    puits: { case: [1024, 512, 256] }, ruine: { case: [1280, 512, 256] }, lanterne: { case: [1536, 512, 256] }, champignons: { case: [1792, 512, 256] },
    souche: { case: [1024, 768, 256] }, tronc: { case: [1280, 768, 256] }, fougeres: { case: [1536, 768, 256] },
  };
  const ATLAS_L = 2048, ATLAS_H = 1024;
  // Le modèle d'une instance : `teinte` (linéaire, celle du GLB ou du style) et un hasard fixe (0 à 1)
  // ; null garde l'instance telle qu'exportée. Un feuillage chaud (l'automne des Mailles au style
  // Lisière, les jaunes de l'export) prend l'arbre d'automne. `absolu` : la hauteur en u (sinon celle
  // de la forme remplacée, fois `facteur`).
  const chaud = t => !!t && t[0] > t[1] * 0.8;
  const sombre = t => !!t && t[1] < 0.2 && t[0] < 0.1;   // le vert profond des sous-bois
  const GENRES = {
    feuillu: { modele: (t, h) => (chaud(t) || h < 0.2 ? 'arbre3' : 'arbre'), facteur: 1.05 },
    conifere: { modele: () => 'arbre2', facteur: 1.0 },
    tordu: { modele: (t) => (chaud(t) ? 'arbre3' : 'arbre'), facteur: 1.0 },
    mort: { modele: (t, h) => (h < 0.5 ? 'souche' : 'tronc'), absolu: { souche: 1.0, tronc: 0.9 } },
    rocher: { modele: (t, h) => (h < 0.12 ? 'roc' : h < 0.26 ? 'cristal' : 'rocher2'), facteur: 1.25, absolu: { roc: 2.6, cristal: 1.3 } },
    buisson: { modele: (t, h) => (sombre(t) && h < 0.22 ? 'champignons' : 'buisson'), facteur: 1.15, absolu: { champignons: 1.1 } },
    fougere: { modele: (t, h) => (h < 0.18 ? 'fougeres' : null), absolu: { fougeres: 1.1 } },
  };
  // Les objets posés (T.objets) remplacés par un modèle : le modèle, sa taille (largeur au sol ou
  // hauteur, en u, au plus) et le quart de tour qui aligne son grand côté. tools/meshy/retirer-objets.py
  // a retiré leur forme de l'export.
  const OBJETS = {
    maison: { modele: 'maison', taille: o => ({ l: (o.taille || [6, 5])[0], p: (o.taille || [6, 5])[1], h: 6 }) },
    comptoir: { modele: 'etal', taille: o => ({ l: (o.taille || [5, 2])[0], p: (o.taille || [5, 2])[1], h: 3.6 }) },
    puits_sec: { modele: 'puits', taille: () => ({ l: 2.8, p: 2.8, h: 3.2 }) },
    arche_brisee: { modele: 'ruine', taille: () => ({ l: 4, p: 4, h: 3.2 }) },
    lanterne: { modele: 'lanterne', taille: () => ({ l: 9, p: 9, h: 2.6 }) },
  };
  // Les poses des objets d'un plateau : { nom, x, y, z, a (angle autour de Y), k (échelle) }, pour la
  // cuisson du semis (IleGlb.construire). `S.modeles` donne la taille de chaque modèle.
  function poses(S, T, hauteur) {
    const out = [];
    for (const o of (T && T.objets) || []) {
      const d = OBJETS[o.sorte], M = d && S.modeles[d.modele];
      if (!M) continue;
      const t = d.taille(o), y = hauteur(o.u, o.v);
      const k = Math.min(t.l / M.largeur, t.p / M.profondeur, t.h / M.hauteur);
      out.push({ nom: d.modele, x: o.u, y: Number.isFinite(y) ? y - 0.05 : 0, z: o.v, a: o.rot || 0, k });
    }
    return out;
  }

  // Une image du GLB en ImageBitmap (ou Image), pour la peindre dans l'atlas.
  function imageDe(G, bin, idx) {
    const t = (G.textures || [])[idx], im = t && (G.images || [])[t.source];
    if (!im || im.bufferView == null) return Promise.resolve(null);
    const bv = G.bufferViews[im.bufferView];
    const blob = new Blob([new Uint8Array(bin, bv.byteOffset || 0, bv.byteLength)], { type: im.mimeType || 'image/jpeg' });
    if (typeof createImageBitmap === 'function') return createImageBitmap(blob);
    return new Promise((ok, ko) => { const i = new Image(), u = URL.createObjectURL(blob); i.onload = () => { URL.revokeObjectURL(u); ok(i); }; i.onerror = ko; i.src = u; });
  }

  // Les modèles du semis : leur géométrie (tableaux bruts, UV ramenées dans leur case de l'atlas,
  // hauteur) et une matière partagée (l'atlas). Rend { modeles, mat, formes, genres, octets }.
  async function chargerSemis(THREE) {
    const toile = document.createElement('canvas');
    toile.width = ATLAS_L; toile.height = ATLAS_H;
    const cx = toile.getContext('2d');
    cx.fillStyle = '#3a4a3a'; cx.fillRect(0, 0, ATLAS_L, ATLAS_H);
    const modeles = {};
    let geo = 0;
    await Promise.all(Object.entries(SEMIS).map(async ([nom, d]) => {
      const { json: G, bin } = await IleGlb.lire(source('assets/decor/' + nom + '-semis.glb'));
      const prim = G.meshes[0].primitives[0], at = prim.attributes;
      const pos = accesseur(G, bin, at.POSITION).array, nrm = accesseur(G, bin, at.NORMAL).array, uv0 = accesseur(G, bin, at.TEXCOORD_0).array;
      const idx = accesseur(G, bin, prim.indices).array;
      const [x0, y0, c] = d.case, uv = new Float32Array(uv0.length);
      // Un pixel de marge dans la case : les voisines ne bavent pas au bord des îlots d'UV.
      for (let i = 0; i < uv0.length; i += 2) {
        uv[i] = (x0 + 1 + Math.min(1, Math.max(0, uv0[i])) * (c - 2)) / ATLAS_L;
        uv[i + 1] = (y0 + 1 + Math.min(1, Math.max(0, uv0[i + 1])) * (c - 2)) / ATLAS_H;
      }
      let h = 0, lx = 0, lz = 0;
      for (let i = 0; i < pos.length; i += 3) { h = Math.max(h, pos[i + 1]); lx = Math.max(lx, Math.abs(pos[i])); lz = Math.max(lz, Math.abs(pos[i + 2])); }
      const m = (G.materials || [])[0] || {}, pbr = m.pbrMetallicRoughness || {};
      const img = pbr.baseColorTexture ? await imageDe(G, bin, pbr.baseColorTexture.index) : null;
      if (img) cx.drawImage(img, x0, y0, c, c);
      modeles[nom] = { pos, nrm, uv, idx, hauteur: h || 1, largeur: 2 * lx || 1, profondeur: 2 * lz || 1, n: pos.length / 3 };
      geo += pos.byteLength + nrm.byteLength + uv.byteLength + idx.byteLength;
    }));
    const tex = new THREE.CanvasTexture(toile);
    tex.flipY = false;
    tex.encoding = THREE.sRGBEncoding;
    tex.anisotropy = 2;
    const mat = new THREE.MeshLambertMaterial({ map: tex, side: THREE.DoubleSide, fog: true });
    mat.name = 'semis_meshy';
    return { modeles, mat, formes: FORMES, genres: GENRES, octets: { tex: ATLAS_L * ATLAS_H * 4 * 4 / 3, geo } };
  }

  // ----- Les sols (assets/decor/sols/jeu-*.jpg, 3.32) -----
  // Le sol du monde modelé garde ses couleurs de sommets (la teinte de chaque lieu) ; une texture de
  // Meshy y met son grain, choisie d'après cette couleur : le vert clair prend l'herbe, le vert sombre
  // la litière de forêt, le brun le chemin, le gris la roche, le beige clair les pavés. Le grain est
  // la texture divisée par sa couleur moyenne : il module la couleur du lieu sans la changer.
  // `pas` : la largeur d'une répétition, en u.
  // `moyenne` : la couleur moyenne linéaire de la texture (calculée une fois, à la fabrication).
  const SOLS = {
    herbe: { pas: 7, moyenne: [0.0241, 0.0736, 0.0405] }, foret: { pas: 6, moyenne: [0.0364, 0.0587, 0.0354] },
    chemin: { pas: 5, moyenne: [0.1004, 0.0673, 0.0347] }, roche: { pas: 7, moyenne: [0.0433, 0.0812, 0.0947] },
    paves: { pas: 3.2, moyenne: [0.0276, 0.0539, 0.0765] },
  };
  const FORCE_SOL = 0.7;
  function texSol(THREE, nom) {
    return new Promise((ok, ko) => {
      new THREE.TextureLoader().load(source('assets/decor/sols/jeu-' + nom + '.jpg'), t => {
        t.wrapS = t.wrapT = THREE.RepeatWrapping;
        t.anisotropy = 4;
        const m = SOLS[nom].moyenne;
        ok({ t, moyenne: new THREE.Vector3(m[0], m[1], m[2]), octets: t.image.width * t.image.height * 4 * 4 / 3 });
      }, undefined, ko);
    });
  }
  const GLSL_SOL = `
    {
      vec3 cs = vColor.rgb;
      float lumS = dot(cs, vec3(0.3, 0.59, 0.11));
      float wVert = smoothstep(0.0, 0.06, cs.g - max(cs.r, cs.b));
      float wPave = smoothstep(0.42, 0.55, lumS) * (1.0 - wVert);
      float wBrun = smoothstep(0.02, 0.12, cs.r - cs.b) * (1.0 - wVert) * (1.0 - wPave);
      float wGris = max(0.0, 1.0 - wVert - wPave - wBrun);
      float tFor = 1.0 - smoothstep(0.13, 0.24, lumS);
      vec2 q = vMonde.xz;
      #define GRAIN(s, m, p) (pow(texture2D(s, q / p).rgb, vec3(2.2)) / max(m, vec3(0.02)))
      vec3 g = wVert * mix(GRAIN(solHerbe, moyHerbe, ${SOLS.herbe.pas.toFixed(1)}), GRAIN(solForet, moyForet, ${SOLS.foret.pas.toFixed(1)}), tFor)
             + wBrun * GRAIN(solChemin, moyChemin, ${SOLS.chemin.pas.toFixed(1)})
             + wPave * GRAIN(solPaves, moyPaves, ${SOLS.paves.pas.toFixed(1)})
             + wGris * GRAIN(solRoche, moyRoche, ${SOLS.roche.pas.toFixed(1)});
      // Les pentes raides : la roche, projetée de côté (sur le plan le plus face à la pente), sans
      // les stries d'une texture tirée à la verticale.
      vec3 nS = normalize(vNormaleMonde);
      vec2 qc = abs(nS.x) > abs(nS.z) ? vMonde.zy : vMonde.xy;
      vec3 gR = pow(texture2D(solRoche, qc / ${SOLS.roche.pas.toFixed(1)}).rgb, vec3(2.2)) / max(moyRoche, vec3(0.02));
      g = mix(gR, g, smoothstep(0.5, 0.78, abs(nS.y)));
      diffuseColor.rgb *= mix(vec3(1.0), clamp(g, 0.0, 2.5), ${FORCE_SOL.toFixed(2)});
    }`;
  // Habille la matière du sol du monde modelé (après IleSol.grille, qui déclare vMonde). Rend les
  // octets des textures, ou 0.
  async function habillerSol(THREE, ile) {
    if (!ile || !ile.monde) return 0;
    const mats = new Set();
    for (const o of ile.monde.children) if (/^mo_sol/.test(o.name) && o.material && o.material.vertexColors) mats.add(o.material);
    if (!mats.size) return 0;
    const noms = ['herbe', 'foret', 'chemin', 'roche', 'paves'], tx = {};
    await Promise.all(noms.map(async n => { tx[n] = await texSol(THREE, n); }));
    const uniforms = {}, cap = n => n[0].toUpperCase() + n.slice(1);
    for (const n of noms) { uniforms['sol' + cap(n)] = { value: tx[n].t }; uniforms['moy' + cap(n)] = { value: tx[n].moyenne }; }
    const decl = noms.map(n => `uniform sampler2D sol${cap(n)}; uniform vec3 moy${cap(n)};`).join('\n');
    for (const m of mats) {
      const prec = m.onBeforeCompile, cle = Object.prototype.hasOwnProperty.call(m, 'customProgramCacheKey') ? m.customProgramCacheKey : null;
      m.onBeforeCompile = (sh, r) => {
        if (prec) prec(sh, r);
        Object.assign(sh.uniforms, uniforms);
        if (!/varying vec3 vMonde;/.test(sh.fragmentShader)) {
          sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nvarying vec3 vMonde;')
            .replace('#include <project_vertex>', '#include <project_vertex>\nvMonde = (modelMatrix * vec4(transformed, 1.0)).xyz;');
          sh.fragmentShader = sh.fragmentShader.replace('#include <common>', '#include <common>\nvarying vec3 vMonde;');
        }
        sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nvarying vec3 vNormaleMonde;')
          .replace('#include <project_vertex>', '#include <project_vertex>\nvNormaleMonde = mat3(modelMatrix) * objectNormal;');
        sh.fragmentShader = sh.fragmentShader.replace('#include <common>', '#include <common>\nvarying vec3 vNormaleMonde;\n' + decl)
          .replace('#include <color_fragment>', '#include <color_fragment>\n' + GLSL_SOL);
      };
      m.customProgramCacheKey = () => 'sol-meshy/' + (cle ? cle.call(m) : '');
      m.needsUpdate = true;
    }
    return noms.reduce((a, n) => a + tx[n].octets, 0);
  }

  return { FICHIERS, HAUTEUR_RELAIS, FORMES, SEMIS, OBJETS, SOLS, charger, chargerSemis, poses, places, poser, animer, habillerSol };
})();
if (typeof module !== 'undefined' && module.exports) module.exports = IleModeles;
