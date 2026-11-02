// Les modèles Meshy posés sur le monde modelé (docs/ILE-TECHNIQUE.md, 3.31 et 3.32).
//
// Le Relais du Fil (le « zaap » de Veylan) : assets/modeles/relais.glb, fait par Meshy à la manière de
// l'« Azure Crystal Sanctum » (concept dessiné, forme en Smart Topology, texture par Meshy 7 ;
// tools/meshy/relais.py). Le GLB porte trois parties, un noeud chacune : le socle de pierre blanche
// cousu de fil d'or (fixe), les trois cristaux (qui luisent et battent), le portail tissé (qui tourne
// lentement). Le fil d'or qui monte du portail est un rayon de lumière dessiné ici. Chaque relais du
// plateau (T.relais) reçoit le modèle à son point ; les relais sont des enfants du monde modelé (la vue
// tactique les cache, la carte de l'île les montre) ; le point qu'on touche ne change pas.
//
// Le semis (chargerSemis) : le kit de décor Meshy (assets/decor, versions « -semis » allégées, de
// 150 à 1 500 triangles). Les arbres, rochers, buissons, arbres morts et une part des fougères
// remplacent les formes de base du monde modelé à la même place ; des champignons, des cristaux, des
// flèches de roche, des souches et des troncs couchés en prennent une part. Les maisons, l'étal, le
// puits sec, les arches brisées, les lanternes, les pierres levées, la tour, le râtelier, le belvédère
// et les tonneaux remplacent les objets posés (poses) ; ceux des Mailles viennent de leur biome. IleGlb
// cuit le tout par tuile et par atlas (deux atlas : le kit, les Mailles) : un ou deux appels par tuile.
//
// Repère : X = u, Y = h, Z = v ; le modèle est posé sur le sol, centré, 1,9 de haut.
const IleModeles = (() => {
  const FICHIERS = { relais: 'assets/modeles/relais.glb' };
  // Le diamètre du socle du relais dans le monde (u) ; ses cristaux montent à un peu plus de 2 u.
  const DIAMETRE_RELAIS = 3.6;

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
      geo.userData.place = n.translation || [0, 0, 0];
      parties[n.name || G.meshes[n.mesh].name] = geo;
      triangles += (geo.index ? geo.index.count : p.array.length / 3) / 3;
    }
    return { parties, mat, triangles: Math.round(triangles), octets: compte };
  }

  // Où poser les relais d'un plateau : au point de chaque relais.
  function places(T) {
    return ((T && T.relais) || []).map(r => ({ u: r.u, v: r.v, rot: 0, carte: r.carte }));
  }

  // Le rayon du fil d'or qui monte du portail : un cylindre fin, additif, qui s'efface en montant.
  function rayon(THREE) {
    const h = 34, geo = new THREE.CylinderGeometry(0.035, 0.035, h, 6, 8, true);
    geo.translate(0, h / 2, 0);
    const pos = geo.getAttribute('position'), col = new Float32Array(pos.count * 4);
    for (let i = 0; i < pos.count; i++) { const t = pos.getY(i) / h; col.set([1, 0.82, 0.45, Math.pow(1 - t, 1.6) * 0.9], i * 4); }
    geo.setAttribute('color', new THREE.BufferAttribute(col, 4));
    const mat = new THREE.MeshBasicMaterial({ vertexColors: true, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, fog: false });
    mat.name = 'relais_rayon';
    return { geo, mat };
  }

  // Pose les relais sur le monde modelé de l'île (ile.monde) ; rend l'état animé, ou null.
  async function poser(THREE, ile) {
    if (!ile || !ile.monde || !ile.T) return null;
    const lieux = places(ile.T);
    if (!lieux.length) return null;
    const modele = await charger(THREE, 'relais');
    const bb = new THREE.Box3();
    for (const g of Object.values(modele.parties)) { g.computeBoundingBox(); const b = g.boundingBox.clone(), t = g.userData.place; b.min.x += t[0]; b.max.x += t[0]; b.min.z += t[2]; b.max.z += t[2]; bb.union(b); }
    const k = DIAMETRE_RELAIS / Math.max(0.01, bb.max.x - bb.min.x, bb.max.z - bb.min.z);
    const fil = rayon(THREE);
    const relais = [];
    for (const l of lieux) {
      const groupe = new THREE.Group();
      groupe.name = 'modele relais ' + l.carte;
      const y = ile.hauteur(l.u, l.v);
      groupe.position.set(l.u, (Number.isFinite(y) ? y : 0) - 0.12, l.v);
      groupe.rotation.y = -l.rot;
      groupe.scale.setScalar(k);
      const morceaux = {};
      for (const [nom, geo] of Object.entries(modele.parties)) {
        const o = new THREE.Mesh(geo, modele.mat), t = geo.userData.place;
        o.position.set(t[0], t[1], t[2]);
        o.name = 'relais_' + nom;
        groupe.add(o);
        morceaux[nom] = o;
      }
      // Le fil d'or, au centre du portail, à l'échelle du monde (le groupe est mis à l'échelle).
      const r = new THREE.Mesh(fil.geo, fil.mat);
      r.name = 'relais_fil'; r.scale.setScalar(1 / k); r.renderOrder = 3;
      if (morceaux.portail) r.position.copy(morceaux.portail.position);
      groupe.add(r);
      morceaux.fil = r;
      ile.monde.add(groupe);
      relais.push({ groupe, morceaux, phase: (l.u * 0.37 + l.v * 0.11) % (Math.PI * 2) });
    }
    // La mémoire de la scène (Ile3D.stats) : la géométrie et les textures, une fois (partagées).
    ile.octetsGeo = (ile.octetsGeo || 0) + modele.octets.geo;
    ile.octetsTex = (ile.octetsTex || 0) + modele.octets.tex;
    console.log(`Ervane : ${relais.length} relais du Fil posés (${modele.triangles} triangles chacun, ${Math.round((modele.octets.geo + modele.octets.tex) / 1e5) / 10} Mo)`);
    return { relais, mat: modele.mat, triangles: modele.triangles };
  }

  // Chaque image : le portail tissé tourne, les cristaux luisent et battent, le fil d'or palpite.
  // `t` en secondes.
  function animer(etat, t) {
    if (!etat) return;
    for (const r of etat.relais) {
      if (!r.groupe.visible) continue;
      const a = t + r.phase, m = r.morceaux;
      if (m.portail) m.portail.rotation.y = a * 0.3;
      if (m.fil) m.fil.scale.x = m.fil.scale.z = (1 + 0.35 * Math.sin(a * 3.1)) / r.groupe.scale.x;
    }
    if (etat.mat) etat.mat.emissiveIntensity = 0.8 + 0.3 * Math.sin(t * 2.1);
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
  // Les modèles, leur atlas et leur case dans l'atlas : [x, y, côté] en pixels. Atlas 0 (2048 x 1024) :
  // le kit de décor de toute l'île ; atlas 1 (1024 x 1024) : les objets des Mailles (le biome du
  // village, tools/meshy/biomes), fichiers `m-*-semis.glb` ; atlas 2 (1024 x 512) : ceux des Quatre
  // Sources, `s-*-semis.glb` (les quatre pierres levées des éléments, la Braise, le cairn percé ; deux
  // cases libres pour la suite du biome).
  const SEMIS = {
    arbre: { case: [0, 0, 512] }, arbre3: { case: [512, 0, 512] }, arbre2: { case: [0, 512, 512] },
    rocher2: { case: [512, 512, 256] }, buisson: { case: [768, 512, 256] }, roc: { case: [512, 768, 256] }, cristal: { case: [768, 768, 256] },
    puits: { case: [1024, 512, 256] }, ruine: { case: [1280, 512, 256] }, champignons: { case: [1792, 512, 256] },
    souche: { case: [1024, 768, 256] }, tronc: { case: [1280, 768, 256] }, fougeres: { case: [1536, 768, 256] },
    'm-maison': { atlas: 1, case: [0, 0, 512] }, 'm-etal': { atlas: 1, case: [512, 0, 512] },
    'm-tour': { atlas: 1, case: [0, 512, 256] }, 'm-armes': { atlas: 1, case: [256, 512, 256] }, 'm-belvedere': { atlas: 1, case: [512, 512, 256] },
    'm-tonneaux': { atlas: 1, case: [768, 512, 256] }, 'm-lanterne': { atlas: 1, case: [0, 768, 256] }, 'm-pierre': { atlas: 1, case: [256, 768, 256] },
    's-braise': { atlas: 2, case: [0, 0, 256] }, 's-cairn': { atlas: 2, case: [256, 0, 256] },
    's-pierre-eau': { atlas: 2, case: [512, 0, 256] }, 's-pierre-feu': { atlas: 2, case: [768, 0, 256] },
    's-pierre-terre': { atlas: 2, case: [0, 256, 256] }, 's-pierre-air': { atlas: 2, case: [256, 256, 256] },
  };
  const ATLAS = [[2048, 1024], [1024, 1024], [1024, 512]];
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
  // Les objets posés (T.objets) remplacés par un modèle : le modèle (ou la fonction qui le choisit
  // d'après l'objet), sa taille (largeur au sol ou hauteur, en u, au plus) et le quart de tour qui
  // aligne son grand côté. tools/meshy/retirer-objets.py a retiré leur forme de l'export.
  const OBJETS = {
    maison: { modele: 'm-maison', taille: o => ({ l: (o.taille || [6, 5])[0], p: (o.taille || [6, 5])[1], h: 6 }) },
    comptoir: { modele: 'm-etal', taille: o => ({ l: (o.taille || [5, 2])[0], p: (o.taille || [5, 2])[1], h: 3.6 }) },
    lanterne: { modele: 'm-lanterne', taille: () => ({ l: 9, p: 9, h: 2.6 }) },
    // Une pierre levée des Mailles, ou l'une des quatre du Rond des Quatre, teintée par son élément.
    pierre_levee: { modele: o => (o.element ? 's-pierre-' + o.element : 'm-pierre'), taille: o => ({ l: 9, p: 9, h: o.element ? 2.6 : 2.4 }) },
    cairn: { modele: 's-cairn', taille: o => ({ l: 9, p: 9, h: (o.hauteur || 2) * 1.05 }) },
    source: { modele: o => ({ feu: 's-braise' })[o.element], taille: () => ({ l: 3.2, p: 3.2, h: 2.2 }) },
    ratelier: { modele: 'm-armes', taille: () => ({ l: 4, p: 2.2, h: 1.9 }) },
    tour: { modele: 'm-tour', taille: o => ({ l: (o.taille || [6, 6])[0], p: (o.taille || [6, 6])[1], h: 7 }) },
    longue_vue: { modele: 'm-belvedere', taille: () => ({ l: 3, p: 2.2, h: 2.4 }) },
    tonneau: { modele: 'm-tonneaux', taille: () => ({ l: 2.2, p: 2.2, h: 1.6 }) },
    puits_sec: { modele: 'puits', taille: () => ({ l: 2.8, p: 2.8, h: 3.2 }) },
    arche_brisee: { modele: 'ruine', taille: () => ({ l: 4, p: 4, h: 3.2 }) },
  };
  // Les poses des objets d'un plateau : { nom, x, y, z, a (angle autour de Y), k (échelle) }, pour la
  // cuisson du semis (IleGlb.construire). `S.modeles` donne la taille de chaque modèle.
  function poses(S, T, hauteur) {
    const out = [];
    for (const o of (T && T.objets) || []) {
      const d = OBJETS[o.sorte], nom = d && (typeof d.modele === 'function' ? d.modele(o) : d.modele), M = nom && S.modeles[nom];
      if (!M) continue;
      const t = d.taille(o), y = hauteur(o.u, o.v);
      const k = Math.min(t.l / M.largeur, t.p / M.profondeur, t.h / M.hauteur);
      let a = o.rot || 0;
      if (o.sorte === 'longue_vue') { const r = T.objets.find(x => x.sorte === 'rambarde' && Math.hypot(x.u - o.u, x.v - o.v) < 2); if (r) a = r.rot || 0; }
      out.push({ nom, x: o.u, y: Number.isFinite(y) ? y - 0.05 : 0, z: o.v, a, k });
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
    const toiles = ATLAS.map(([l, h]) => { const c = document.createElement('canvas'); c.width = l; c.height = h; const x = c.getContext('2d'); x.fillStyle = '#3a4a3a'; x.fillRect(0, 0, l, h); return { c, x, l, h }; });
    const modeles = {};
    let geo = 0;
    await Promise.all(Object.entries(SEMIS).map(async ([nom, d]) => {
      const { json: G, bin } = await IleGlb.lire(source('assets/decor/' + nom + '-semis.glb'));
      const prim = G.meshes[0].primitives[0], at = prim.attributes;
      const pos = accesseur(G, bin, at.POSITION).array, nrm = accesseur(G, bin, at.NORMAL).array, uv0 = accesseur(G, bin, at.TEXCOORD_0).array;
      const idx = accesseur(G, bin, prim.indices).array;
      const t = toiles[d.atlas || 0], [x0, y0, c] = d.case, uv = new Float32Array(uv0.length);
      // Un pixel de marge dans la case : les voisines ne bavent pas au bord des îlots d'UV.
      for (let i = 0; i < uv0.length; i += 2) {
        uv[i] = (x0 + 1 + Math.min(1, Math.max(0, uv0[i])) * (c - 2)) / t.l;
        uv[i + 1] = (y0 + 1 + Math.min(1, Math.max(0, uv0[i + 1])) * (c - 2)) / t.h;
      }
      let h = 0, lx = 0, lz = 0;
      for (let i = 0; i < pos.length; i += 3) { h = Math.max(h, pos[i + 1]); lx = Math.max(lx, Math.abs(pos[i])); lz = Math.max(lz, Math.abs(pos[i + 2])); }
      const m = (G.materials || [])[0] || {}, pbr = m.pbrMetallicRoughness || {};
      const img = pbr.baseColorTexture ? await imageDe(G, bin, pbr.baseColorTexture.index) : null;
      if (img) t.x.drawImage(img, x0, y0, c, c);
      modeles[nom] = { pos, nrm, uv, idx, atlas: d.atlas || 0, hauteur: h || 1, largeur: 2 * lx || 1, profondeur: 2 * lz || 1, n: pos.length / 3 };
      geo += pos.byteLength + nrm.byteLength + uv.byteLength + idx.byteLength;
    }));
    const mats = toiles.map((t, k) => {
      const tex = new THREE.CanvasTexture(t.c);
      tex.flipY = false;
      tex.encoding = THREE.sRGBEncoding;
      tex.anisotropy = 2;
      const mat = new THREE.MeshLambertMaterial({ map: tex, side: THREE.DoubleSide, fog: true });
      mat.name = 'semis_meshy_' + k;
      return mat;
    });
    return { modeles, mat: mats[0], mats, formes: FORMES, genres: GENRES, octets: { tex: toiles.reduce((a, t) => a + t.l * t.h * 4 * 4 / 3, 0), geo } };
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

  return { FICHIERS, DIAMETRE_RELAIS, FORMES, SEMIS, OBJETS, SOLS, charger, chargerSemis, poses, places, poser, animer, habillerSol };
})();
if (typeof module !== 'undefined' && module.exports) module.exports = IleModeles;
