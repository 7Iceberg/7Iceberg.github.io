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
    base_arbre_haut_0: 'haut', base_arbre_haut_1: 'haut', base_arbre_pin_0: 'conifere', base_arbre_pin_1: 'conifere',
    base_arbre_tordu_0: 'tordu', base_arbre_mort_0: 'mort', base_rocher_0: 'rocher', base_buisson_0: 'buisson', base_buisson_1: 'buisson',
    base_fougere_0: 'fougere', base_fleurs_0: 'fleurs', base_galet_0: 'galet', base_borne_0: 'borne',
  };
  // Les modèles, leur atlas et leur case dans l'atlas : [x, y, côté] en pixels. Atlas 0 (2048 x 1024) :
  // le kit de décor de toute l'île, et dans sa moitié haute de droite (1024 x 512) les objets des Murets
  // (`mu-*-semis.glb` : le muret, la haie, la maison sans toit, le four, le puits à runes, le grand
  // cairn, le terrier ; une case libre) ; atlas 1 (1024 x 1024) : les objets des Mailles (le biome du
  // village, tools/meshy/biomes), fichiers `m-*-semis.glb` ; atlas 2 (1024 x 1024) : ceux des Quatre
  // Sources, `s-*-semis.glb` (les quatre pierres levées des éléments, la Braise, le cairn percé, la
  // source claire, le tertre de mousse, le ponton, la barrière, la dalle, les fleurs des quatre couleurs) ;
  // atlas 3 (1024 x 512) : ceux du Bois Cousu, `b-*-semis.glb` (l'arbre sombre cousu de fils, l'Arbre-
  // Bobine, la cabane, le rocher à racines, les champignons lumineux ; les fougères, le tronc couché et
  // les pieux de la Tête du Pont dans les cases libres de l'atlas du kit) ; atlas 4 (1024 x 512) : ceux de
  // l'Amarre, `a-*-semis.glb` (l'arcade brisée, le mur d'avant-poste, la borne à runes, le pin tordu, la
  // tente du Fil, le feu de camp, l'anneau du fil d'or).
  const SEMIS = {
    arbre: { case: [0, 0, 512] }, arbre3: { case: [512, 0, 512] }, arbre2: { case: [0, 512, 512] },
    rocher2: { case: [512, 512, 256] }, buisson: { case: [768, 512, 256] }, roc: { case: [512, 768, 256] }, cristal: { case: [768, 768, 256] },
 champignons: { case: [1792, 512, 256] },
    souche: { case: [1024, 768, 256] }, tronc: { case: [1280, 768, 256] }, fougeres: { case: [1536, 768, 256] },
    'm-maison': { atlas: 1, case: [0, 0, 512] }, 'm-etal': { atlas: 1, case: [512, 0, 512] },
    'm-tour': { atlas: 1, case: [0, 512, 256] }, 'm-armes': { atlas: 1, case: [256, 512, 256] }, 'm-belvedere': { atlas: 1, case: [512, 512, 256] },
    'm-tonneaux': { atlas: 1, case: [768, 512, 256] }, 'm-lanterne': { atlas: 1, case: [0, 768, 256] }, 'm-pierre': { atlas: 1, case: [256, 768, 256] },
    's-braise': { atlas: 2, case: [0, 0, 256] }, 's-cairn': { atlas: 2, case: [256, 0, 256] },
    's-pierre-eau': { atlas: 2, case: [512, 0, 256] }, 's-pierre-feu': { atlas: 2, case: [768, 0, 256] },
    's-pierre-terre': { atlas: 2, case: [0, 256, 256] }, 's-pierre-air': { atlas: 2, case: [256, 256, 256] },
    's-claire': { atlas: 2, case: [512, 256, 256] }, 's-mousse': { atlas: 2, case: [768, 256, 256] },
    's-passerelle': { atlas: 2, case: [0, 512, 256] }, 's-barriere': { atlas: 2, case: [256, 512, 256] },
    's-dalle': { atlas: 2, case: [512, 512, 256] }, 's-fleurs-eau': { atlas: 2, case: [768, 512, 256] },
    's-fleurs-feu': { atlas: 2, case: [0, 768, 256] }, 's-fleurs-terre': { atlas: 2, case: [256, 768, 256] },
    's-fleurs-air': { atlas: 2, case: [512, 768, 256] },
    'mu-muret': { case: [1024, 0, 256] }, 'mu-haie': { case: [1280, 0, 256] }, 'mu-ruine': { case: [1536, 0, 256] },
    'mu-four': { case: [1792, 0, 256] }, 'mu-puits': { case: [1024, 256, 256] }, 'mu-cairn': { case: [1280, 256, 256] },
    'mu-terrier': { case: [1792, 256, 256] },
    'b-fougere': { case: [1536, 256, 256] }, 'b-tronc': { case: [1024, 512, 256] }, 'b-pieux': { case: [1536, 512, 256] },
    'b-arbre': { atlas: 3, case: [0, 0, 512] }, 'b-bobine': { atlas: 3, case: [512, 0, 256] }, 'b-cabane': { atlas: 3, case: [768, 0, 256] },
    'b-rocher': { atlas: 3, case: [512, 256, 256] }, 'b-champignons': { atlas: 3, case: [768, 256, 256] },
    'a-arcade': { atlas: 4, case: [0, 0, 256] }, 'a-mur': { atlas: 4, case: [256, 0, 256] }, 'a-borne': { atlas: 4, case: [512, 0, 256] },
    'a-pin': { atlas: 4, case: [768, 0, 256] }, 'a-tente': { atlas: 4, case: [0, 256, 256] }, 'a-feu': { atlas: 4, case: [256, 256, 256] },
    'a-ancre': { atlas: 4, case: [512, 256, 256] },
  };
  const ATLAS = [[2048, 1024], [1024, 1024], [1024, 1024], [1024, 512], [1024, 512]];
  // Le modèle d'une instance : `teinte` (linéaire, celle du GLB ou du style) et un hasard fixe (0 à 1)
  // ; null garde l'instance telle qu'exportée. Un feuillage chaud (l'automne des Mailles au style
  // Lisière, les jaunes de l'export) prend l'arbre d'automne. `absolu` : la hauteur en u (sinon celle
  // de la forme remplacée, fois `facteur`).
  // `x`, `z` : la place de l'instance. Les fleurs et les galets ne changent que dans les Quatre Sources :
  // une fleur prend la couleur de la source la plus proche (au Rond des Quatre, l'une des quatre), un
  // galet devient une dalle.
  const SOURCES = [['eau', 160, 148], ['feu', 130, 125], ['terre', 140, 166], ['air', 105, 120], [null, 92, 164]];
  const dansSources = (x, z) => x >= 70 && x <= 170 && z >= 92 && z <= 190;
  // Les Murets : le plateau au nord-est, au-dessus du village.
  const dansMurets = (x, z) => x > 110 && z < 80;
  // Le Bois Cousu : le nord-ouest, à l'ouest du ravin du Ru Clair (qui descend de (146, 52) à (121, 2)) ;
  // plus au sud, jusqu'à la Lisière Cousue (sa cabane, (118,5 ; 60,5)).
  const dansBois = (x, z) => z < 95 && (z > 55 ? x <= 125 : x < 120 + z * 0.45);
  // L'Amarre : la pointe sud-ouest, à l'ouest de la haie des Bornes (x = 80).
  const dansAmarre = (x, z) => z >= 95 && x < 80;
  const elementA = (x, z, h) => {
    let m = null, d = 1e9;
    for (const s of SOURCES) { const e = Math.hypot(x - s[1], z - s[2]); if (e < d) { d = e; m = s[0]; } }
    return m || ['eau', 'feu', 'terre', 'air'][Math.floor(h * 4) % 4];
  };
  const chaud = t => !!t && t[0] > t[1] * 0.8;
  const sombre = t => !!t && t[1] < 0.2 && t[0] < 0.1;   // le vert profond des sous-bois
  const GENRES = {
    // Au Bois Cousu, les feuillus et les grands arbres deviennent l'arbre sombre cousu de fils ; les pins
    // restent.
    feuillu: { modele: (t, h, x, z) => (dansBois(x, z) ? 'b-arbre' : chaud(t) || h < 0.2 ? 'arbre3' : 'arbre'), facteur: 1.05 },
    haut: { modele: (t, h, x, z) => (dansBois(x, z) ? 'b-arbre' : 'arbre2'), facteur: 1.0 },
    conifere: { modele: () => 'arbre2', facteur: 1.0 },
    // À l'Amarre, le pin tordu par le vent ; ses bornes, la borne à runes violettes.
    tordu: { modele: (t, h, x, z) => (dansAmarre(x, z) ? 'a-pin' : chaud(t) ? 'arbre3' : 'arbre'), facteur: 0.75 },
    borne: { modele: () => 'a-borne', facteur: 1.05 },
    mort: { modele: (t, h) => (h < 0.5 ? 'souche' : 'tronc'), absolu: { souche: 1.0, tronc: 0.9 } },
    // Au Bois Cousu : le rocher à racines, les champignons lumineux et le tronc couché parmi les
    // buissons, ses fougères.
    rocher: { modele: (t, h, x, z) => (dansBois(x, z) ? 'b-rocher' : h < 0.12 ? 'roc' : h < 0.26 ? 'cristal' : 'rocher2'), facteur: 1.25, absolu: { roc: 2.6, cristal: 1.3, 'b-rocher': 1.9 } },
    buisson: { modele: (t, h, x, z) => (dansBois(x, z) && h < 0.3 ? 'b-champignons' : dansBois(x, z) && h < 0.45 ? 'b-tronc' : sombre(t) && h < 0.22 ? 'champignons' : 'buisson'), facteur: 1.15, absolu: { champignons: 1.1, 'b-champignons': 1.3, 'b-tronc': 0.9 } },
    fougere: { modele: (t, h, x, z) => (dansBois(x, z) ? (h < 0.3 ? 'b-fougere' : null) : h < 0.18 ? 'fougeres' : null), absolu: { fougeres: 1.1, 'b-fougere': 1.2 } },
    fleurs: { modele: (t, h, x, z) => (dansSources(x, z) ? 's-fleurs-' + elementA(x, z, h) : null), absolu: { 's-fleurs-eau': 0.75, 's-fleurs-feu': 0.75, 's-fleurs-terre': 0.65, 's-fleurs-air': 0.75 } },
    galet: { modele: (t, h, x, z) => (dansSources(x, z) ? 's-dalle' : null), absolu: { 's-dalle': 0.22 } },
  };
  // Les objets posés (T.objets) remplacés par un modèle : le modèle (ou la fonction qui le choisit
  // d'après l'objet), sa taille (largeur au sol ou hauteur, en u, au plus) et le quart de tour qui
  // aligne son grand côté. tools/meshy/retirer-objets.py a retiré leur forme de l'export.
  const OBJETS = {
    // La maison du Bois Cousu est sa cabane de bois sombre au toit de mousse ; les autres, celles des Mailles.
    maison: { modele: o => (dansBois(o.u, o.v) ? 'b-cabane' : 'm-maison'), taille: o => ({ l: (o.taille || [6, 5])[0], p: (o.taille || [6, 5])[1], h: 6 }) },
    arbre_bobine: { modele: 'b-bobine', taille: () => ({ l: 9, p: 9, h: 18 }) },
    pieu: { modele: 'b-pieux', taille: () => ({ l: 2.6, p: 2.6, h: 2 }) },
    comptoir: { modele: 'm-etal', taille: o => ({ l: (o.taille || [5, 2])[0], p: (o.taille || [5, 2])[1], h: 3.6 }) },
    lanterne: { modele: 'm-lanterne', taille: () => ({ l: 9, p: 9, h: 2.6 }) },
    // Une pierre levée des Mailles, ou l'une des quatre du Rond des Quatre, teintée par son élément.
    pierre_levee: { modele: o => (o.element ? 's-pierre-' + o.element : 'm-pierre'), taille: o => ({ l: 9, p: 9, h: o.element ? 2.6 : 2.4 }) },
    cairn: { modele: o => (dansMurets(o.u, o.v) ? 'mu-cairn' : 's-cairn'), taille: o => ({ l: 9, p: 9, h: (o.hauteur || 2) * 1.05 }) },
    // Les sources marquées d'un objet : la Braise (ses roches), la Claire (la vasque où l'eau jaillit),
    // la Mousse (le tertre, sa jupe enfoncée dans le sol).
    source: { modele: o => ({ feu: 's-braise', eau: 's-claire', terre: 's-mousse' })[o.element],
      taille: o => (o.element === 'eau' ? { l: 4.6, p: 4.6, h: 9 } : o.element === 'terre' ? { l: 3.2, p: 3.2, h: 2.4 } : { l: 3.2, p: 3.2, h: 2.2 }),
      enfonce: o => (o.element === 'terre' ? 0.14 : o.element === 'eau' ? 0.12 : 0) },
    ponton: { modele: 's-passerelle', taille: () => ({ l: 4.2, p: 4.2, h: 9 }) },
    // La rambarde du Rond des Quatre (celle du belvédère vient avec son modèle) : deux barrières de
    // bois bout à bout, le long de son axe.
    rambarde: { modele: (o, T) => (T.objets.some(x => x.sorte === 'longue_vue' && Math.hypot(x.u - o.u, x.v - o.v) < 2) ? null : 's-barriere'),
      taille: () => ({ l: 3, p: 3, h: 1.35 }), copies: [-1.5, 1.5] },
    ratelier: { modele: 'm-armes', taille: () => ({ l: 4, p: 2.2, h: 1.9 }) },
    tour: { modele: 'm-tour', taille: o => ({ l: (o.taille || [6, 6])[0], p: (o.taille || [6, 6])[1], h: 7 }) },
    longue_vue: { modele: 'm-belvedere', taille: () => ({ l: 3, p: 2.2, h: 2.4 }) },
    tonneau: { modele: 'm-tonneaux', taille: () => ({ l: 2.2, p: 2.2, h: 1.6 }) },
    puits_sec: { modele: 'mu-puits', taille: () => ({ l: 2.6, p: 2.6, h: 3.2 }) },
    // Les Murets : les maisons sans toit du hameau (la porte du côté de la brèche de l'empreinte, d'où
    // l'angle du monde du code), le four, le terrier (sa jupe plate enfoncée).
    ruine: { modele: o => (dansMurets(o.u, o.v) ? 'mu-ruine' : dansAmarre(o.u, o.v) ? 'a-mur' : null), taille: o => ({ l: (o.taille || [6, 5])[0], p: (o.taille || [6, 5])[1], h: 4.5 }), angle: o => -(o.rot || 0),
      murs: o => dansAmarre(o.u, o.v) },
    four: { modele: 'mu-four', taille: () => ({ l: 2.6, p: 2.6, h: 3 }) },
    terrier: { modele: 'mu-terrier', taille: () => ({ l: 3.6, p: 3.6, h: 9 }), enfonce: () => 0.12, angle: o => -(o.rot || 0) },
    // L'Amarre : l'arcade brisée de calcaire (le long de l'axe de ses deux piliers), la ruine de
    // l'avant-poste en quatre murs (la porte du côté de la brèche), les tentes du Fil (celle des Murets
    // aussi), les feux de camp, et l'anneau du fil d'or près de la plateforme de la Nacelle (le pied du
    // fil est dans une aire).
    arche_brisee: { modele: o => (dansAmarre(o.u, o.v) ? 'a-arcade' : null), taille: () => ({ l: 4.6, p: 4.6, h: 3.6 }), angle: o => -(o.rot || 0) },
    tente: { modele: 'a-tente', taille: o => ({ l: (o.taille || [3, 3])[0] + 0.4, p: (o.taille || [3, 3])[1] + 0.4, h: 3 }), angle: o => -(o.rot || 0) },
    // Le cercle de pierres et les bûches ; la flamme reste celle de l'export (sa boule lumineuse).
    feu: { modele: 'a-feu', taille: () => ({ l: 2.2, p: 2.2, h: 9 }) },
    plateforme: { modele: 'a-ancre', taille: () => ({ l: 1.8, p: 1.8, h: 1.4 }), decalage: [1, -3] },
  };
  // Les poses des objets d'un plateau : { nom, x, y, z, a (angle autour de Y), k (échelle) }, pour la
  // cuisson du semis (IleGlb.construire). `S.modeles` donne la taille de chaque modèle.
  function poses(S, T, hauteur) {
    const out = [];
    for (const o of (T && T.objets) || []) {
      const d = OBJETS[o.sorte], nom = d && (typeof d.modele === 'function' ? d.modele(o, T) : d.modele), M = nom && S.modeles[nom];
      if (!M) continue;
      const t = d.taille(o);
      const k = Math.min(t.l / M.largeur, t.p / M.profondeur, t.h / M.hauteur);
      const enf = d.enfonce ? d.enfonce(o) * M.hauteur * k : 0;
      let a = d.angle ? d.angle(o) : o.rot || 0;
      if (o.sorte === 'longue_vue') { const r = T.objets.find(x => x.sorte === 'rambarde' && Math.hypot(x.u - o.u, x.v - o.v) < 2); if (r) a = r.rot || 0; }
      // Une ruine en quatre murs (l'Amarre) : chacun face au dehors, étiré à son côté, le mur de devant
      // (la brèche de l'empreinte, js/ile-terrain.js) du côté +p.
      if (d.murs && d.murs(o)) {
        const [l, p] = o.taille || [6, 5], r = o.rot || 0, c = Math.cos(r), s = Math.sin(r), km = 3.4 / M.hauteur;
        for (const [lx, lz, da, long] of [[0, p / 2, 0, l], [0, -p / 2, Math.PI, l], [l / 2, 0, Math.PI / 2, p], [-l / 2, 0, -Math.PI / 2, p]]) {
          const u = o.u + lx * c - lz * s, v = o.v + lx * s + lz * c, y = hauteur(u, v);
          out.push({ nom, x: u, y: (Number.isFinite(y) ? y - 0.1 : 0), z: v, a: -r + da, k: km, kx: (long + 0.5) / (M.largeur * km) });
        }
        continue;
      }
      // Des copies le long de l'axe de l'objet (celui du monde du code, js/ile-decor.js : cos, sin).
      const dec = d.decalage || [0, 0];
      for (const dx0 of d.copies || [0]) {
        const dx = dx0 + dec[0];
        const u = o.u + dx * Math.cos(o.rot || 0) - dec[1] * Math.sin(o.rot || 0), v = o.v + dx * Math.sin(o.rot || 0) + dec[1] * Math.cos(o.rot || 0), y = hauteur(u, v);
        out.push({ nom, x: u, y: (Number.isFinite(y) ? y - 0.05 : 0) - enf, z: v, a: d.copies ? -(o.rot || 0) : a, k });
      }
    }
    posesLignes(S, T, hauteur, out);
    return out;
  }

  // Les murets et les haies (T.lignes) : des segments du modèle bout à bout le long du tracé, sauf dans
  // les brèches et les barrières. Le muret du village (pierre blanche) garde sa forme de l'export.
  const LIGNES = {
    muret: { modele: 'mu-muret', hauteur: l => (l.hauteur || 1) * 1.1, si: l => l.id !== 'muret_des_mailles' },
    // La haie de Meshy, coupée de son retour en angle, a un bout ouvert (vers -x) : le premier segment
    // d'un tronçon est retourné, son bout fermé du côté de la brèche.
    haie: { modele: 'mu-haie', hauteur: l => (l.hauteur || 1.2) * 1.05, retourne: true },
  };
  function posesLignes(S, T, hauteur, out) {
    for (const l of (T && T.lignes) || []) {
      const d = LIGNES[l.sorte], M = d && (!d.si || d.si(l)) && S.modeles[d.modele];
      if (!M || !l.pts || l.pts.length < 2) continue;
      const cum = [0];
      for (let i = 1; i < l.pts.length; i++) cum.push(cum[i - 1] + Math.hypot(l.pts[i][0] - l.pts[i - 1][0], l.pts[i][1] - l.pts[i - 1][1]));
      const L = cum[cum.length - 1], k = d.hauteur(l) / M.hauteur, pas = M.largeur * k;
      const trous = (l.breches || []).concat((l.barrieres || []).map(b => b.plage)).filter(Boolean);
      const point = s => {
        let i = 1;
        while (i < cum.length - 1 && cum[i] < s) i++;
        const t = (s - cum[i - 1]) / ((cum[i] - cum[i - 1]) || 1), a = l.pts[i - 1], b = l.pts[i];
        return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];
      };
      // Les tronçons pleins entre les trous, chacun rempli de segments égaux.
      const bornes = [0];
      for (const [a, b] of trous.slice().sort((x, y) => x[0] - y[0])) bornes.push(Math.max(0, a), Math.min(L, b));
      bornes.push(L);
      for (let j = 0; j + 1 < bornes.length; j += 2) {
        const s0 = bornes[j], s1 = bornes[j + 1];
        if (s1 - s0 < 0.8) continue;
        const n = Math.max(1, Math.round((s1 - s0) / pas)), e = (s1 - s0) / n;
        for (let q = 0; q < n; q++) {
          const [x0, z0] = point(s0 + q * e), [x1, z1] = point(s0 + (q + 1) * e), [x, z] = point(s0 + (q + 0.5) * e);
          const y = hauteur(x, z);
          // L'échelle donne la hauteur ; `kx` ajuste la longueur au tronçon (un peu plus, pour joindre).
          const a = Math.atan2(-(z1 - z0), x1 - x0) + (d.retourne && q === 0 ? Math.PI : 0);
          out.push({ nom: d.modele, x, y: (Number.isFinite(y) ? y - 0.08 : 0), z, a, k, kx: Math.hypot(x1 - x0, z1 - z0) * 1.04 / (M.largeur * k) });
        }
      }
    }
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
