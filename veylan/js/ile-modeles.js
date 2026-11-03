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
// cuit le tout par tuile et par atlas (cinq atlas : le kit et les Murets, les Mailles, les Sources, le
// Bois Cousu, l'Amarre ; les bords dans leurs cases libres). Les atlas et les sols sont précuits en
// ETC2 (tools/meshy/atlas-etc.py) : le GPU qui les lit (les téléphones) les reçoit compressés.
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
    VENT.value = t;
    if (ileSol && ileSol.renderer && ileSol.renderer.domElement) FUMEE.hauteur.value = ileSol.renderer.domElement.height || 800;
    // La part de nuit pour le sol : celle de l'heure (le style Lisière), toute (la nuit simple), aucune.
    const N = ileSol && ileSol.nuit;
    NUIT_SOL.value = N ? (N.amb ? N.amb.nuit : 1) : 0;
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
  // tente du Fil, le feu de camp, l'anneau du fil d'or). Les bords de l'île (`br-*-semis.glb` : le bloc de
  // falaise à racines, les cristaux pendus, l'îlot flottant, le pont de cordes) dans les cases restées
  // libres des atlas 0, 2 et 4.
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
    'br-racines': { case: [1280, 512, 256] }, 'br-cristaux': { case: [1792, 768, 256] },
    'br-ilot': { atlas: 2, case: [768, 768, 256] }, 'br-pont': { atlas: 4, case: [768, 256, 256] },
    // La végétation dense (3.34, tools/meshy/biomes/vegetation) : le sixième atlas (1024 x 1024 ; la
    // moitié basse libre pour les constructions).
    'jt-vert': { atlas: 5, case: [0, 0, 256] }, 'jt-ambre': { atlas: 5, case: [256, 0, 256] }, 'jt-rouille': { atlas: 5, case: [512, 0, 256] },
    'v-buisson': { atlas: 5, case: [768, 0, 256] }, 'v-fleurs-blanc': { atlas: 5, case: [0, 256, 256] }, 'v-fleurs-lavande': { atlas: 5, case: [256, 256, 256] },
    'v-rochers': { atlas: 5, case: [512, 256, 256] }, 'v-amanites': { atlas: 5, case: [768, 256, 256] }, 'v-pierre': { atlas: 5, case: [0, 512, 256] },
    // Les parcelles cultivées (phase D, tools/meshy/biomes/champs) : le rang de choux, les courges, l'épouvantail
    // cousu de fil d'or, les gerbes de blé, la brouette.
    'ch-choux': { atlas: 5, case: [256, 512, 256] }, 'ch-courges': { atlas: 5, case: [512, 512, 256] }, 'ch-epouvantail': { atlas: 5, case: [768, 512, 256] },
    'ch-gerbes': { atlas: 5, case: [0, 768, 256] }, 'ch-brouette': { atlas: 5, case: [256, 768, 256] },
  };
  const ATLAS = [[2048, 1024], [1024, 1024], [1024, 1024], [1024, 512], [1024, 512], [1024, 1024]];
  // Le modèle d'une instance : `teinte` (linéaire, celle du GLB ou du style) et un hasard fixe (0 à 1)
  // ; null garde l'instance telle qu'exportée. Un feuillage chaud (l'automne des Mailles au style
  // Lisière, les jaunes de l'export) prend l'arbre d'automne. `absolu` : la hauteur en u (sinon celle
  // de la forme remplacée, fois `facteur`).
  // `x`, `z` : la place de l'instance. Les fleurs et les galets ne changent que dans les Quatre Sources :
  // une fleur prend la couleur de la source la plus proche (au Rond des Quatre, l'une des quatre), un
  // galet devient une dalle.
  const SOURCES = [['eau', 160, 148], ['feu', 130, 125], ['terre', 140, 166], ['air', 105, 120], [null, 92, 164]];
  // Le plateau qu'on habille (poses, cartes, sol : leur T) : les lieux ci-dessous sont ceux d'Ervane et
  // ne valent qu'à Ervane ; ailleurs (Orsane en 3D, docs/ORSANE-3D.md), la zone du point décide.
  let ICI = null;
  const ici = T => { if (T) ICI = T; return ICI; };
  const ervane = () => !ICI || ICI.id === 'ervane';
  const zoneIci = (x, z) => (ICI && typeof ICI.zoneA === 'function' ? ICI.zoneA(x, z) : null);
  const dansSources = (x, z) => ervane() && x >= 70 && x <= 170 && z >= 92 && z <= 190;
  // Les Murets : le plateau au nord-est, au-dessus du village.
  const dansMurets = (x, z) => ervane() && x > 110 && z < 80;
  // Le Bois Cousu : le nord-ouest, à l'ouest du ravin du Ru Clair (qui descend de (146, 52) à (121, 2)) ;
  // plus au sud, jusqu'à la Lisière Cousue (sa cabane, (118,5 ; 60,5)).
  const dansBois = (x, z) => (ervane() ? z < 95 && (z > 55 ? x <= 125 : x < 120 + z * 0.45) : zoneIci(x, z) === 'orsane_toiles');
  // L'Amarre : la pointe sud-ouest, à l'ouest de la haie des Bornes (x = 80).
  const dansAmarre = (x, z) => (ervane() ? z >= 95 && x < 80 : /^orsane_(sentiers|eboulis|toiles)$/.test(zoneIci(x, z) || ''));
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
    // Le bâtiment d'un service de la Cité des Cimes : plus haut (`hauteur`), étiré à sa façade.
    maison: { modele: o => (ervane() && dansBois(o.u, o.v) ? 'b-cabane' : 'm-maison'), taille: o => ({ l: (o.taille || [6, 5])[0], p: (o.taille || [6, 5])[1], h: o.hauteur || 6 }), etire: o => !!o.service, angle: o => -(o.rot || 0) },
    arbre_bobine: { modele: 'b-bobine', taille: () => ({ l: 9, p: 9, h: 18 }) },
    pieu: { modele: 'b-pieux', taille: () => ({ l: 2.6, p: 2.6, h: 2 }) },
    comptoir: { modele: 'm-etal', taille: o => ({ l: (o.taille || [5, 2])[0], p: (o.taille || [5, 2])[1], h: 3.6 }), angle: o => -(o.rot || 0) },
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
    ratelier: { modele: 'm-armes', taille: () => ({ l: 4, p: 2.2, h: 1.9 }), angle: o => -(o.rot || 0) },
    tour: { modele: 'm-tour', taille: o => ({ l: (o.taille || [6, 6])[0], p: (o.taille || [6, 6])[1], h: 7 }) },
    longue_vue: { modele: 'm-belvedere', taille: () => ({ l: 3, p: 2.2, h: 2.4 }) },
    tonneau: { modele: 'm-tonneaux', taille: () => ({ l: 2.2, p: 2.2, h: 1.6 }) },
    puits_sec: { modele: 'mu-puits', taille: () => ({ l: 2.6, p: 2.6, h: 3.2 }) },
    // Les Murets : les maisons sans toit du hameau (la porte du côté de la brèche de l'empreinte, d'où
    // l'angle du monde du code), le four, le terrier (sa jupe plate enfoncée).
    ruine: { modele: o => (dansMurets(o.u, o.v) ? 'mu-ruine' : ervane() && dansAmarre(o.u, o.v) ? 'a-mur' : null), taille: o => ({ l: (o.taille || [6, 5])[0], p: (o.taille || [6, 5])[1], h: 4.5 }), angle: o => -(o.rot || 0),
      murs: o => ervane() && dansAmarre(o.u, o.v) },
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
    ici(T);
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
        const kx = d.etire && d.etire(o) ? Math.max(1, t.l / (M.largeur * k)) : 1;
        out.push(Object.assign({ nom, x: u, y: (Number.isFinite(y) ? y - 0.05 : 0) - enf, z: v, a: d.copies ? -(o.rot || 0) : a, k }, kx > 1.02 ? { kx } : {}));
      }
    }
    posesLignes(S, T, hauteur, out);
    posesBords(S, T, hauteur, out);
    posesDenses(S, T, hauteur, out);
    posesParcelles(S, T, hauteur, out);
    posesObstacles(S, T, hauteur, out);
    return out;
  }

  // ----- Les obstacles des aires de combat (docs/ILE-TECHNIQUE.md, 5.2 et 5.4) -----
  // Les plans cuits (tools/cuire-aires.js) posent des pierres (#) et des troncs (T) que le terrain n'a
  // pas. Le décor dessiné par le code les portait (IleDecor.obstaclesAires), mais le monde modelé le
  // retire (IleGlb.poser) : en combat, les cases bloquées n'avaient plus rien dessus (revue du
  // fondateur). Ici, le même obstacle avec le kit Meshy, posé au centre de sa case, choisi par le style
  // de l'aire : les pierres, un rocher pâle ; les murets, un bout de muret dans le sens de ses voisins ;
  // les bornes, la borne à runes ; les troncs, une souche ; les racines, le tronc couché. Un obstacle
  // que le terrain porte déjà (muret, haie, objet posé) n'est pas redoublé ; chaque case une fois (les
  // aires se recouvrent). L'objet tient dans sa case (au plus 1 u de large) : la case reste lisible.
  // Les modèles les plus légers du kit (le semis est fusionné par tuile : chaque obstacle emporte ses
  // sommets ; environ 550 obstacles sur Ervane) : les rochers moussus (400 sommets), la souche (768).
  const OBSTACLES = {
    '#': { pierres: ['rocher2', 1.15], murets: ['mu-muret', 1.0], bornes: ['a-borne', 1.7], libre: ['rocher2', 1.1], defaut: ['rocher2', 1.2] },
    T: { troncs: ['souche', 1.25], racines: ['souche', 1.15], defaut: ['souche', 1.2] },
  };
  function posesObstacles(S, T, hauteur, out) {
    const N = 15, vus = new Set(), est = new Map();
    for (const a of (T && T.aires) || []) {
      if (!a.layout) continue;
      for (let cy = 0; cy < N; cy++) for (let cx = 0; cx < N; cx++) { const c = a.layout[cy][cx]; if (c === '#' || c === 'T') est.set((a.x + cx) + ',' + (a.y + cy), c); }
    }
    for (const a of (T && T.aires) || []) {
      if (!a.layout) continue;
      for (let cy = 0; cy < N; cy++) for (let cx = 0; cx < N; cx++) {
        const c = a.layout[cy][cx];
        if (c !== '#' && c !== 'T') continue;
        const X = a.x + cx, Y = a.y + cy, cle = X + ',' + Y;
        if (vus.has(cle)) continue;
        vus.add(cle);
        if (typeof IleTerrain === 'object' && IleTerrain.caseAire && IleTerrain.caseAire(T, X, Y).c !== '.') continue;
        const table = OBSTACLES[c], choix = table[a.style] || table.defaut, nom = choix[0], M = S.modeles[nom];
        if (!M) continue;
        const u = X + 0.5, v = Y + 0.5, y = hauteur(u, v);
        if (!Number.isFinite(y)) continue;
        const r1 = hacheEntier(X, Y, 909), r2 = hacheEntier(X, Y, 910), r3 = hacheEntier(X, Y, 911);
        const h = choix[1] * (0.9 + 0.2 * r3);
        const k = Math.min(h / M.hauteur, 1.0 / Math.max(0.01, Math.max(M.largeur, M.profondeur)));
        let angle = r1 * Math.PI * 2, kx;
        if (nom === 'mu-muret') {
          // Le bout de muret suit ses voisins (la ligne du style `murets`), et remplit sa case.
          const hor = est.get((X - 1) + ',' + Y) === '#' || est.get((X + 1) + ',' + Y) === '#';
          const vert = est.get(X + ',' + (Y - 1)) === '#' || est.get(X + ',' + (Y + 1)) === '#';
          angle = hor || !vert ? 0 : Math.PI / 2;
          kx = 1.02 / (M.largeur * k);
        }
        out.push(Object.assign({ nom, x: u + (r1 - 0.5) * 0.1, y: y - 0.04, z: v + (r2 - 0.5) * 0.1, a: angle, k }, kx && kx > 1.02 ? { kx } : {}));
      }
    }
  }

  // ----- Les parcelles cultivées (phase D, docs/REFERENCE-OPEN-WORLD.md) -----
  // Une parcelle (T.objets, sorte `parcelle`) : la terre labourée en sillons le long de son grand côté
  // (le shader du sol, solParcelles), close de barrières de bois (la barrière des Sources, des
  // segments de 3 u environ). Les rangs suivent le dessus des sillons (un pas de `sillon` u en
  // travers). Le potager : des rangs de choux, un rang de courges, un épouvantail au milieu ; le blé et
  // le lin : des cartes serrées (IleModeles.cartes) ; le blé a son bout moissonné (deux gerbes, une
  // brouette), le lin son épouvantail. Une graine fixe par parcelle.
  const CULTURES = {
    potager: { sillon: 1.1 },
    ble: { sillon: 0.6, carte: 'ble', hauteurs: [0.85, 1.1], pas: 0.4, moisson: 0.22 },
    lin: { sillon: 0.62, carte: 'lin', hauteurs: [0.7, 0.92], pas: 0.34, fond: 'herbe', partFond: 0.5 },
  };
  const MARGE_PARCELLE = 0.55;
  const parcelles = T => ((T && T.objets) || []).filter(o => o.sorte === 'parcelle' && CULTURES[o.culture]);
  // Le repère d'une parcelle : du local (x le long de `rot`, y en travers) au monde.
  function repere(o) {
    const r = o.rot || 0, c = Math.cos(r), s = Math.sin(r), [L, P] = o.taille || [8, 6];
    return { L, P, r, c, s, monde: (x, y) => [o.u + x * c - y * s, o.v + x * s + y * c] };
  }
  // Les rangs d'une parcelle : les ordonnées (en travers) du dessus des sillons, dans la marge.
  function rangs(o) {
    const { P } = repere(o), d = CULTURES[o.culture].sillon, out = [];
    for (let k = -Math.floor((P / 2 - MARGE_PARCELLE) / d); k * d <= P / 2 - MARGE_PARCELLE + 1e-6; k++) out.push(k * d);
    return out;
  }
  function posesParcelles(S, T, hauteur, out) {
    const poser = (nom, x, z, a, h, kx) => {
      const M = S.modeles[nom], y = hauteur(x, z);
      if (!M || !Number.isFinite(y)) return;
      const k = h / M.hauteur;
      out.push(Object.assign({ nom, x, y: y - 0.04 * h, z, a, k }, kx ? { kx } : {}));
    };
    for (const o of parcelles(T)) {
      const R = repere(o), { L, P } = R, C = CULTURES[o.culture];
      const B = S.modeles['s-barriere'];
      // La barrière : chaque côté en segments égaux (les poteaux des bouts se rejoignent aux coins).
      if (B) for (const [x0, y0, x1, y1] of [[-L / 2, -P / 2, L / 2, -P / 2], [L / 2, -P / 2, L / 2, P / 2], [L / 2, P / 2, -L / 2, P / 2], [-L / 2, P / 2, -L / 2, -P / 2]]) {
        const lg = Math.hypot(x1 - x0, y1 - y0), n = Math.max(1, Math.round(lg / 3)), h = 1.05, k = h / B.hauteur;
        for (let q = 0; q < n; q++) {
          const [ax, az] = R.monde(x0 + (x1 - x0) * q / n, y0 + (y1 - y0) * q / n), [bx, bz] = R.monde(x0 + (x1 - x0) * (q + 1) / n, y0 + (y1 - y0) * (q + 1) / n);
          poser('s-barriere', (ax + bx) / 2, (az + bz) / 2, Math.atan2(-(bz - az), bx - ax), h, Math.hypot(bx - ax, bz - az) * 1.02 / (B.largeur * k));
        }
      }
      const ys = rangs(o), xMax = L / 2 - MARGE_PARCELLE;
      if (o.culture === 'potager') {
        // Les choux : des rangs de trois (le modèle est long en z : un quart de tour l'aligne sur le
        // sillon) ; le rang du milieu laisse la place de l'épouvantail ; le dernier rang, des courges.
        ys.forEach((y, i) => {
          const dernier = i === ys.length - 1, milieu = i === Math.floor(ys.length / 2);
          const lg = dernier ? 1.6 : 1.75, n = Math.max(1, Math.floor((2 * xMax + 0.3) / (lg + 0.3)));
          for (let q = 0; q < n; q++) {
            const x = -xMax + lg / 2 + q * (2 * xMax - lg) / Math.max(1, n - 1);
            if (milieu && Math.abs(x) < 1.2) continue;
            const hz = hacheSimple(o.u + x, o.v + y), [u, v] = R.monde(x + (hz - 0.5) * 0.2, y);
            if (dernier) poser('ch-courges', u, v, -R.r + hz * 6.28, 0.62 + hz * 0.12);
            else poser('ch-choux', u, v, -R.r + Math.PI / 2 + (hz > 0.5 ? Math.PI : 0), 0.34 + hz * 0.06);
          }
          if (milieu) { const [u, v] = R.monde(0, y); poser('ch-epouvantail', u, v, -R.r + 0.4, 2.0); }
        });
      } else if (o.culture === 'ble') {
        // Le bout moissonné (du côté +x) : deux gerbes debout, la brouette.
        const xm = xMax - L * C.moisson;
        const [u1, v1] = R.monde((xm + xMax) / 2, -P / 4), [u2, v2] = R.monde((xm + xMax) / 2 + 0.2, P / 5);
        poser('ch-gerbes', u1, v1, -R.r + 0.7, 1.45);
        poser('ch-gerbes', u2, v2, -R.r + 2.3, 1.3);
        const [u3, v3] = R.monde(xMax - 0.4, P / 2 - MARGE_PARCELLE - 0.5);
        poser('ch-brouette', u3, v3, -R.r + Math.PI / 2 + 0.35, 0.95);
      } else if (o.culture === 'lin') {
        const [u, v] = R.monde(L * 0.18, ys[Math.floor(ys.length / 2)]);
        poser('ch-epouvantail', u, v, -R.r - 0.5, 2.0);
      }
    }
  }
  // Les cartes des cultures (le blé, le lin) : serrées le long des rangs, un peu de jeu ; pas sur le
  // bout moissonné ni au pied de l'épouvantail. Le lin pousse dans ses feuilles (`fond` : une carte
  // d'herbe sur deux, plus basse) : ses fleurs seules, fines, se lisaient de loin comme du gravier.
  function cartesParcelles(T) {
    const out = [];
    for (const o of parcelles(T)) {
      const C = CULTURES[o.culture];
      if (!C.carte) continue;
      const R = repere(o), xMax = R.L / 2 - MARGE_PARCELLE, x1 = xMax - (C.moisson ? R.L * C.moisson + 0.4 : 0);
      const ys = rangs(o), yE = ys[Math.floor(ys.length / 2)];
      ys.forEach(y => {
        for (let x = -xMax; x <= x1; x += C.pas) {
          const r1 = hacheSimple(o.u + x * 1.7, o.v + y * 2.3), r2 = hacheSimple(o.v + x * 0.9, o.u - y * 1.3);
          if (C.carte === 'lin' && Math.abs(y - yE) < 0.01 && Math.abs(x - R.L * 0.18) < 0.6) continue;
          const [u, v] = R.monde(x + (r1 - 0.5) * C.pas * 0.6, y + (r2 - 0.5) * 0.12), fond = C.fond && hacheSimple(u * 3.1, v * 1.7) < C.partFond;
          out.push({ genre: fond ? C.fond : C.carte, u, v, h: (C.hauteurs[0] + (C.hauteurs[1] - C.hauteurs[0]) * r2) * (fond ? 0.8 : 1), r: r1 });
        }
      });
    }
    return out;
  }

  // ----- Le semis dense (3.34, docs/REFERENCE-OPEN-WORLD.md) -----
  // À la manière de « Dofus Open World » : beaucoup de petites choses, en grappes. Les jeunes arbres
  // fins, les buissons, les arbustes fleuris, les rochers pâles, les amanites et les pierres plates sont
  // des modèles Meshy cuits par tuile (le sixième atlas) ; les touffes d'herbe haute, d'herbe dorée et
  // les bouquets de fleurs sont des cartes croisées (IleModeles.cartes). Rien de tout cela ne bloque le
  // pas ni ne compte en combat : pas sur les sentiers, les places, les aires de combat, l'eau, les
  // objets posés, ni près des PNJ, des relais et des portes. Une graine fixe : la même île à chaque
  // partie. Par zone : [genre, densité par u², hauteurs, variantes].
  const DENSE = {
    ervane_mailles: [['arbre', 0.03, [3.0, 4.2], ['jt-ambre', 'jt-ambre', 'jt-vert']], ['buisson', 0.02, [0.9, 1.3], ['v-buisson']],
      ['arbuste', 0.02, [0.55, 0.8], ['v-fleurs-blanc', 'v-fleurs-lavande']], ['rocher', 0.004, [0.7, 1.0], ['v-rochers']]],
    ervane_sources: [['arbre', 0.025, [3.0, 4.4], ['jt-vert', 'jt-vert', 'jt-ambre']], ['buisson', 0.018, [0.9, 1.4], ['v-buisson']],
      ['arbuste', 0.014, [0.55, 0.8], ['v-fleurs-blanc']], ['rocher', 0.006, [0.8, 1.2], ['v-rochers']], ['amanite', 0.004, [0.45, 0.6], ['v-amanites']]],
    ervane_murets: [['arbre', 0.018, [2.8, 4.0], ['jt-rouille', 'jt-rouille', 'jt-ambre']], ['buisson', 0.014, [0.9, 1.3], ['v-buisson']],
      ['arbuste', 0.01, [0.55, 0.75], ['v-fleurs-lavande']], ['rocher', 0.012, [0.8, 1.3], ['v-rochers']]],
    ervane_amarre: [['arbre', 0.008, [2.8, 3.8], ['jt-rouille']], ['buisson', 0.01, [0.8, 1.2], ['v-buisson']], ['rocher', 0.012, [0.8, 1.3], ['v-rochers']]],
    ervane_bois: [['amanite', 0.025, [0.45, 0.65], ['v-amanites']], ['buisson', 0.006, [0.9, 1.2], ['v-buisson']]],
    // Orsane en 3D : la Cité (peu d'arbres, des arbustes fleuris), les prés des Clairières (comme les
    // Sources), les Sentiers et les Éboulis (des rochers, l'arbre rouille), la forêt morte des Toiles.
    // Orsane a trois fois la surface d'Ervane, et tout son semis est cuit en mémoire : des densités
    // plus basses, et les variantes légères (le jeune arbre ambre, 1 140 sommets, plutôt que le vert,
    // 2 051 ; l'arbuste blanc, 1 131, plutôt que la lavande, 2 542).
    // La Cité : pas de jeunes arbres dans les rues ; des buissons et des arbustes fleuris dans les jardins.
    orsane_cimes: [['buisson', 0.005, [0.9, 1.2], ['v-buisson']], ['arbuste', 0.006, [0.55, 0.75], ['v-fleurs-blanc', 'v-fleurs-lavande']]],
    orsane_clairieres: [['arbre', 0.009, [3.0, 4.4], ['jt-ambre', 'jt-ambre', 'jt-vert']], ['buisson', 0.008, [0.9, 1.4], ['v-buisson']],
      ['arbuste', 0.006, [0.55, 0.8], ['v-fleurs-blanc', 'v-fleurs-blanc', 'v-fleurs-lavande']], ['rocher', 0.003, [0.8, 1.2], ['v-rochers']], ['amanite', 0.002, [0.45, 0.6], ['v-amanites']]],
    orsane_sentiers: [['arbre', 0.004, [2.8, 4.0], ['jt-ambre', 'jt-rouille']], ['buisson', 0.006, [0.9, 1.3], ['v-buisson']], ['rocher', 0.008, [0.8, 1.3], ['v-rochers']]],
    orsane_toiles: [['amanite', 0.008, [0.45, 0.65], ['v-amanites']], ['buisson', 0.004, [0.9, 1.2], ['v-buisson']], ['rocher', 0.003, [0.8, 1.1], ['v-rochers']]],
    orsane_eboulis: [['arbre', 0.002, [2.8, 3.8], ['jt-rouille']], ['buisson', 0.004, [0.8, 1.2], ['v-buisson']], ['rocher', 0.011, [0.8, 1.4], ['v-rochers']]],
  };
  // Les cartes : [genre, densité par u², hauteurs, carte] ; les sols où elles poussent (T.sol : 0 l'herbe,
  // 1 la lande, 2 la terre, 3 le calcaire, 4 la roche, 5 le sous-bois).
  const CARTES_DENSES = {
    ervane_mailles: [['herbe', 0.5, [0.7, 1.05], 0], ['fleurs', 0.05, [0.45, 0.6], 2]],
    ervane_sources: [['herbe', 0.7, [0.75, 1.15], 0], ['fleurs', 0.07, [0.45, 0.62], 2]],
    ervane_murets: [['doree', 0.55, [0.75, 1.1], 1], ['herbe', 0.15, [0.7, 1.0], 0]],
    ervane_amarre: [['doree', 0.3, [0.7, 1.0], 1], ['herbe', 0.12, [0.7, 1.0], 0]],
    ervane_bois: [['herbe', 0.3, [0.7, 1.05], 0]],
    orsane_cimes: [['herbe', 0.25, [0.7, 1.0], 0], ['fleurs', 0.04, [0.45, 0.6], 2]],
    orsane_clairieres: [['herbe', 0.5, [0.75, 1.15], 0], ['fleurs', 0.05, [0.45, 0.62], 2]],
    orsane_sentiers: [['doree', 0.35, [0.75, 1.1], 1], ['herbe', 0.12, [0.7, 1.0], 0]],
    orsane_toiles: [['herbe', 0.2, [0.7, 1.0], 0]],
    orsane_eboulis: [['doree', 0.25, [0.7, 1.0], 1], ['herbe', 0.08, [0.7, 1.0], 0]],
  };
  const SOLS_CARTES = { herbe: [0, 1, 5], doree: [1, 0, 2], fleurs: [0, 5] };
  // Un bruit de valeurs doux (pour les grappes), déterministe.
  function hacheEntier(a, b, c) { let h = (a * 374761393 + b * 668265263 + c * 2147483647) | 0; h = Math.imul(h ^ (h >>> 13), 1274126177); return ((h ^ (h >>> 16)) >>> 0) / 4294967296; }
  function bruitValeur(x, y, graine) {
    const x0 = Math.floor(x), y0 = Math.floor(y), fx = x - x0, fy = y - y0, sx = fx * fx * (3 - 2 * fx), sy = fy * fy * (3 - 2 * fy);
    const a = hacheEntier(x0, y0, graine), b = hacheEntier(x0 + 1, y0, graine), c = hacheEntier(x0, y0 + 1, graine), d = hacheEntier(x0 + 1, y0 + 1, graine);
    return (a * (1 - sx) + b * sx) * (1 - sy) + (c * (1 - sx) + d * sx) * sy;
  }
  // Les cases libres du plateau pour le semis dense (une grille de 0,5 u, comme videF) : 1 libre ; et
  // une marge plus large (2) pour les modèles. Calculée une fois par plateau.
  function libresDenses(T) {
    if (T._libresDenses) return T._libresDenses;
    const FX = T.FX, FY = T.FY, L = new Uint8Array(FX * FY);
    for (let i = 0; i < FX * FY; i++) L[i] = T.videF && T.videF[i] ? 0 : 2;
    const marquer = (u, v, r, val) => {
      const i0 = Math.max(0, Math.floor((u - r) * 2)), i1 = Math.min(FX - 1, Math.ceil((u + r) * 2)), j0 = Math.max(0, Math.floor((v - r) * 2)), j1 = Math.min(FY - 1, Math.ceil((v + r) * 2));
      for (let j = j0; j <= j1; j++) for (let i = i0; i <= i1; i++) { const x = 0.25 + i * 0.5 - u, y = 0.25 + j * 0.5 - v; if (x * x + y * y <= r * r) L[j * FX + i] = Math.min(L[j * FX + i], val); }
    };
    // Un rectangle tourné d'empreinte (demi-côtés l, p ; cos, sin), élargi de m.
    const marquerRect = (f, m) => {
      const R = Math.hypot(f.l, f.p) + m;
      const i0 = Math.max(0, Math.floor((f.u - R) * 2)), i1 = Math.min(FX - 1, Math.ceil((f.u + R) * 2)), j0 = Math.max(0, Math.floor((f.v - R) * 2)), j1 = Math.min(FY - 1, Math.ceil((f.v + R) * 2));
      for (let j = j0; j <= j1; j++) for (let i = i0; i <= i1; i++) {
        const x = 0.25 + i * 0.5 - f.u, y = 0.25 + j * 0.5 - f.v, a = x * f.c + y * f.s, b = -x * f.s + y * f.c;
        if (Math.abs(a) < f.l + m && Math.abs(b) < f.p + m) L[j * FX + i] = 0;
      }
    };
    // Le bord du vide : une marge d'un u.
    for (let j = 0; j < FY; j++) for (let i = 0; i < FX; i++) if (T.videF && T.videF[j * FX + i]) marquer(0.25 + i * 0.5, 0.25 + j * 0.5, 1, 0);
    for (const a of T.aires || []) for (let j = Math.max(0, (a.y - 1.5) * 2 | 0); j < Math.min(FY, (a.y + 16.5) * 2); j++) for (let i = Math.max(0, (a.x - 1.5) * 2 | 0); i < Math.min(FX, (a.x + 16.5) * 2); i++) L[j * FX + i] = 0;
    for (const p of T.places || []) marquer(p.centre[0], p.centre[1], p.rayon + 0.6, 0);
    for (const o of T.objets || []) for (const f of o.empreinte || []) {
      if (f.rect && o.sorte === 'parcelle') marquerRect(f, 0.9);
      else if (f.rect) marquer(f.u, f.v, Math.hypot(f.l, f.p) + 1.2, 0);
      else if (f.anneau) marquer(f.u, f.v, f.r2 + 1, 0);
      else marquer(f.u, f.v, (f.r || 1) + 1, 0);
    }
    for (const l of [T.pnjs, T.relais, T.portes, T.noeuds]) for (const p of l || []) marquer(p.u, p.v, 3, 0);
    for (const d of T.decor || []) if (d.rayon > 0.6) marquer(d.u, d.v, d.rayon + 0.8, 1);
    const W = T.W, H = T.H;
    for (let j = 0; j < FY; j++) for (let i = 0; i < FX; i++) {
      const u = Math.min(W - 1, Math.round(0.25 + i * 0.5)), v = Math.min(H - 1, Math.round(0.25 + j * 0.5)), k = v * W + u;
      const ds = T.distSentier ? T.distSentier[k] : 99, eau = T.eau && T.eau[k] === T.eau[k];
      if (eau || ds < 0.3) L[j * FX + i] = 0;
      else if (ds < 1.6 || (T.pente && T.pente[k] > 0.55)) L[j * FX + i] = Math.min(L[j * FX + i], 1);
    }
    return (T._libresDenses = L);
  }
  // Les points du semis dense d'une table de règles : { genre, u, v, h, variante, r (un hasard) }.
  function semerDense(T, regles, pas, marge, graine) {
    const out = [], L = libresDenses(T), FX = T.FX, W = T.W, H = T.H;
    for (let gv = 0; gv * pas < H; gv++) for (let gu = 0; gu * pas < W; gu++) {
      const r1 = hacheEntier(gu, gv, graine), r2 = hacheEntier(gu, gv, graine + 1), r3 = hacheEntier(gu, gv, graine + 2), r4 = hacheEntier(gu, gv, graine + 3);
      const u = (gu + r1) * pas, v = (gv + r2) * pas;
      const iu = Math.min(W - 1, Math.round(u)), iv = Math.min(H - 1, Math.round(v)), k = iv * W + iu;
      const zone = T.regionsZone && T.region ? T.regionsZone[T.region[k]] : null, rg = regles[zone];
      if (!rg) continue;
      const c = L[Math.floor(v * 2) * FX + Math.floor(u * 2)];
      if (!(c >= marge)) continue;
      // Les grappes : deux octaves de bruit ; la densité s'y concentre (des bosquets et des clairières).
      const g = bruitValeur(u / 9, v / 9, graine) * 0.7 + bruitValeur(u / 3.5, v / 3.5, graine + 7) * 0.3;
      // Un fond partout, des grappes au bruit, et le double le long des sentiers et des pentes (la case 1).
      const amas = (0.3 + Math.max(0, (g - 0.4) * 2.4)) * (c === 1 && marge < 2 ? 1.8 : 1);
      let acc = 0;
      for (const regle of rg) {
        const [genre, densite, haut] = regle;
        if (regle.sols && !regle.sols.includes(T.sol ? T.sol[k] : 0)) { continue; }
        acc += densite * pas * pas * amas;
        if (r3 < acc) {
          out.push({ genre, u, v, h: haut[0] + (haut[1] - haut[0]) * r4, regle, r: hacheEntier(gu, gv, graine + 4) });
          break;
        }
      }
    }
    return out;
  }
  function posesDenses(S, T, hauteur, out) {
    if (!T || !T.FX) return;
    for (const p of semerDense(T, DENSE, 2.2, 2, 4242)) {
      const variantes = p.regle[3], nom = variantes[Math.floor(p.r * variantes.length) % variantes.length], M = S.modeles[nom];
      if (!M) continue;
      const y = hauteur(p.u, p.v);
      if (!Number.isFinite(y)) continue;
      const k = p.h / M.hauteur;
      out.push({ nom, x: p.u, y: y - 0.05 * p.h, z: p.v, a: p.r * Math.PI * 2 * 7.3, k });
    }
  }

  // Les bords de l'île : le long du contour et des lèvres de l'Échancrure, un pas sur deux un bloc de
  // falaise à racines (sa face vers le vide, son dessus au ras du sol), l'autre des cristaux pendus tête
  // en bas sous le rebord ; rien près des ponts, de la Nacelle, de la chute ni des belvédères. Autour,
  // dans le vide, des îlots flottants. Le Pont de cordes : des segments du pont à lanternes le long de
  // son tablier qui ploie (le dessus des planches à la hauteur où l'on marche).
  const BORDS = {
    pas: 20, racines: 6.5, cristaux: 2.4,
    loin: [[20, 77], [20, 107], [134, 18.5], [118, 21.5], [12, 158], [8, 150], [121, 2], [92, 172], [167.5, 93.5]],
    // Les îlots : à 20-30 u du bord, à peu près à hauteur de l'île (dans la brume au-delà).
    ilots: [[60, -20, 2, 8], [150, -24, 6, 9], [215, -16, -2, 7], [-22, 58, 4, 8], [-20, 140, -4, 7], [258, 70, 3, 8], [258, 150, -5, 9], [120, 194, -3, 8], [40, 192, 4, 7]],
    pont: { hauteur: 1.4, tablier: 0.2 },
  };
  // Orsane en 3D : rien près des escaliers de la Cité et du Pont du Vide ; ses îlots, autour du continent.
  const BORDS_ORSANE = { loin: [[220, 141], [289, 92], [372, 56], [404, 56], [388, 40]], ilots: [[-24, 150, 3, 9], [462, 130, -2, 8], [230, 352, -4, 9], [110, -26, 4, 7], [400, -24, 2, 8], [470, 280, 0, 7], [-20, 270, -3, 8]] };
  function posesBords(S, T, hauteur, out) {
    const ICIB = T && T.id && T.id !== 'ervane' ? Object.assign({}, BORDS, T.id === 'orsane' ? BORDS_ORSANE : { loin: [], ilots: [] }) : BORDS;
    const R = S.modeles['br-racines'], C = S.modeles['br-cristaux'], I = S.modeles['br-ilot'], P = S.modeles['br-pont'];
    if (!T || typeof T.videA !== 'function') return;
    let pair = 0;
    for (const c of [T.contour, T.echancrure]) {
      if (!R || !C || !c || c.length < 3) continue;
      const n = c.length;
      let reste = 0;
      for (let i = 0; i < n; i++) {
        const a = c[i], b = c[(i + 1) % n], dx = b[0] - a[0], dz = b[1] - a[1], L = Math.hypot(dx, dz);
        if (!(L > 0)) continue;
        for (let s = reste; s < L; s += BORDS.pas) {
          const x = a[0] + dx * s / L, z = a[1] + dz * s / L;
          let nx = -dz / L, nz = dx / L;
          if (!T.videA(x + nx * 3, z + nz * 3)) { nx = -nx; nz = -nz; }
          if (!T.videA(x + nx * 3, z + nz * 3) || T.videA(x - nx * 3, z - nz * 3)) continue;
          if (ICIB.loin.some(([u, v]) => Math.hypot(u - x, v - z) < 8)) continue;
          const y = hauteur(x - nx * 1.5, z - nz * 1.5);
          if (!Number.isFinite(y)) continue;
          if (pair++ % 2 === 0) {
            const k = BORDS.racines / R.hauteur;
            out.push({ nom: 'br-racines', x: x + nx * R.profondeur * k * 0.2, y: y - R.hauteur * k + 0.15, z: z + nz * R.profondeur * k * 0.2, a: Math.atan2(nx, nz), k });
          } else {
            const k = BORDS.cristaux / C.hauteur;
            out.push({ nom: 'br-cristaux', x: x + nx * 0.8, y: y - 0.35, z: z + nz * 0.8, a: hacheSimple(x, z) * Math.PI * 2, k, ky: -1 });
          }
        }
        reste = ((reste - L) % BORDS.pas + BORDS.pas) % BORDS.pas;
      }
    }
    if (I) for (const [x, z, y, h] of ICIB.ilots) out.push({ nom: 'br-ilot', x, y, z, a: hacheSimple(x, z) * Math.PI * 2, k: h / I.hauteur });
    // Le Pont de cordes (au-dessus du vide) ; la passerelle de planches du ravin garde sa forme.
    if (P) for (const p of (T.ponts || []).filter(q => q.matiere === 'corde')) {
      const cum = [0];
      for (let i = 1; i < p.pts.length; i++) cum.push(cum[i - 1] + Math.hypot(p.pts[i][0] - p.pts[i - 1][0], p.pts[i][1] - p.pts[i - 1][1]));
      const L = cum[cum.length - 1], k = BORDS.pont.hauteur / P.hauteur, nb = Math.max(1, Math.round(L / (P.largeur * k))), e = L / nb;
      const point = s => {
        let i = 1;
        while (i < cum.length - 1 && cum[i] < s) i++;
        const t = (s - cum[i - 1]) / ((cum[i] - cum[i - 1]) || 1), a = p.pts[i - 1], b = p.pts[i];
        return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];
      };
      const tablier = s => { const t = s / L; return p.ha + (p.hb - p.ha) * t - p.fleche * 4 * t * (1 - t); };
      for (let q = 0; q < nb; q++) {
        const [x0, z0] = point(q * e), [x1, z1] = point((q + 1) * e), [x, z] = point((q + 0.5) * e);
        out.push({ nom: 'br-pont', x, y: tablier((q + 0.5) * e) - BORDS.pont.tablier * P.hauteur * k, z, a: Math.atan2(-(z1 - z0), x1 - x0), k, kx: Math.hypot(x1 - x0, z1 - z0) * 1.02 / (P.largeur * k) });
      }
    }
  }
  // Un hasard fixe de 0 à 1 d'après la place.
  function hacheSimple(x, z) { const s = Math.sin(x * 12.9898 + z * 78.233) * 43758.5453; return s - Math.floor(s); }

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

  // ----- Les cartes du semis dense (3.34) -----
  // Les touffes d'herbe haute, d'herbe dorée et les bouquets de fleurs : deux cartes croisées chacune,
  // détourées dans la planche de la végétation ; le lin et le blé des parcelles, dans celle des champs
  // (assets/decor/cartes.png, 1024 x 512, deux lignes de quatre cases de 256), réunies par grande tuile
  // (120 u : peu d'appels de dessin), qui ondulent au vent par le haut.
  const CASES_CARTES = { herbe: 0, doree: 1, fleurs: 2, lin: 3, ble: 4 };
  const VENT = { value: 0 };
  async function cartes(THREE, ile) {
    const T = ile && ile.T;
    ici(T);
    if (!T || !T.FX || !ile.monde) return null;
    for (const rg of Object.values(CARTES_DENSES)) for (const r of rg) r.sols = SOLS_CARTES[r[0]];
    const pts = semerDense(T, CARTES_DENSES, 0.9, 1, 777).concat(cartesParcelles(T));
    if (!pts.length) return null;
    const tex = await new Promise((ok, ko) => new THREE.TextureLoader().load(source('assets/decor/cartes.png'), ok, undefined, ko));
    tex.encoding = THREE.sRGBEncoding;
    tex.anisotropy = 2;
    const mat = new THREE.MeshLambertMaterial({ map: tex, alphaTest: 0.5, side: THREE.DoubleSide, vertexColors: true, fog: true });
    mat.name = 'semis_cartes';
    mat.onBeforeCompile = sh => {
      sh.uniforms.tempsVent = VENT;
      sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nattribute float vent; uniform float tempsVent;')
        .replace('#include <begin_vertex>', `#include <begin_vertex>
          float phV = tempsVent * 1.7 + position.x * 0.55 + position.z * 0.43;
          transformed.x += sin(phV) * 0.07 * vent;
          transformed.z += cos(phV * 0.83) * 0.05 * vent;`);
    };
    mat.customProgramCacheKey = () => 'semis-cartes';
    const GRAND = 120, groupes = new Map();
    for (const p of pts) {
      const y = ile.hauteur(p.u, p.v);
      if (!Number.isFinite(y)) continue;
      const k = Math.floor(p.u / GRAND) + ':' + Math.floor(p.v / GRAND);
      if (!groupes.has(k)) groupes.set(k, []);
      groupes.get(k).push({ p, y });
    }
    const meshes = [];
    let octets = 0, n = 0;
    for (const [k, liste] of groupes) {
      const nv = liste.length * 8, P = new Float32Array(nv * 3), U = new Uint16Array(nv * 2), C = new Uint8Array(nv * 4), N = new Int8Array(nv * 4), V = new Uint8Array(nv);
      const I = nv > 65535 ? new Uint32Array(liste.length * 12) : new Uint16Array(liste.length * 12);
      liste.forEach(({ p, y }, q) => {
        const c = CASES_CARTES[p.genre] || 0, h = p.h, w = h * 1.15, a = p.r * Math.PI * 2, teinte = Math.round(205 + p.r * 50);
        const u0 = ((c % 4) * 256 + 3) / 1024, u1 = ((c % 4 + 1) * 256 - 3) / 1024, ligne = Math.floor(c / 4);
        const vHaut = 1 - ligne * 0.5 - 0.005, vBas = 0.5 - ligne * 0.5 + 0.005;
        for (let f = 0; f < 2; f++) {
          const ca = Math.cos(a + f * Math.PI / 2) * w / 2, sa = Math.sin(a + f * Math.PI / 2) * w / 2, b = q * 8 + f * 4;
          const coins = [[-ca, -0.04, -sa, u0, 0, 0], [ca, -0.04, sa, u1, 0, 0], [ca, h, sa, u1, 1, 1], [-ca, h, -sa, u0, 1, 1]];
          coins.forEach(([dx, dy, dz, uu, vv, ve], i) => {
            const j = b + i;
            P[j * 3] = p.u + dx; P[j * 3 + 1] = y + dy; P[j * 3 + 2] = p.v + dz;
            U[j * 2] = Math.round(uu * 65535); U[j * 2 + 1] = Math.round((vv ? vHaut : vBas) * 65535);
            C[j * 4] = C[j * 4 + 1] = C[j * 4 + 2] = teinte; C[j * 4 + 3] = 255;
            N[j * 4 + 1] = 127;
            V[j] = ve * 255;
          });
          const t = q * 12 + f * 6;
          I[t] = b; I[t + 1] = b + 1; I[t + 2] = b + 2; I[t + 3] = b; I[t + 4] = b + 2; I[t + 5] = b + 3;
        }
      });
      const g = new THREE.BufferGeometry();
      g.setAttribute('position', new THREE.BufferAttribute(P, 3));
      g.setAttribute('normal', new THREE.BufferAttribute(N, 4, true));
      g.setAttribute('uv', new THREE.BufferAttribute(U, 2, true));
      g.setAttribute('color', new THREE.BufferAttribute(C, 4, true));
      g.setAttribute('vent', new THREE.BufferAttribute(V, 1, true));
      g.setIndex(new THREE.BufferAttribute(I, 1));
      g.computeBoundingSphere();
      const o = new THREE.Mesh(g, mat);
      o.matrixAutoUpdate = false;
      o.name = 'semis cartes ' + k;
      ile.monde.add(o);
      meshes.push(o);
      for (const at of Object.values(g.attributes)) octets += at.array.byteLength;
      octets += I.byteLength;
      n += liste.length;
    }
    console.log(`Ervane : semis dense, ${n} touffes et bouquets en ${meshes.length} maillages`);
    return { meshes, mat, n, octetsGeo: octets, octetsTex: 1024 * 512 * 4 * 4 / 3 };
  }

  // ----- La fumée des cheminées et des feux de camp (3.36) -----
  // Des points qui montent en s'élargissant et s'effacent, animés par le GPU seul (une phase par point,
  // le temps du vent) : un appel de dessin pour toute l'île. Au-dessus du toit des maisons (à la hauteur
  // de leur modèle posé) et des feux de camp ; gris-bleu le jour, plus sombre la nuit.
  const FUMEE = { hauteur: { value: 800 } };
  function fumees(THREE, ile, S) {
    const T = ile && ile.T;
    if (!T || !ile.monde) return null;
    const sources = [];
    for (const o of T.objets || []) {
      const y0 = ile.hauteur(o.u, o.v);
      if (!Number.isFinite(y0)) continue;
      if (o.sorte === 'maison') {
        const d = OBJETS.maison, nom = d.modele(o, T), M = S && S.modeles[nom], t = d.taille(o);
        const k = M ? Math.min(t.l / M.largeur, t.p / M.profondeur, t.h / M.hauteur) : 1, h = M ? M.hauteur * k : 4.5;
        const r = o.rot || 0, dx = t.l * 0.22;
        sources.push([o.u + Math.cos(r) * dx, y0 + h * 0.92, o.v + Math.sin(r) * dx, 1]);
      } else if (o.sorte === 'feu') sources.push([o.u, y0 + 0.7, o.v, 1.4]);
    }
    if (!sources.length) return null;
    const PAR = 14, n = sources.length * PAR, P = new Float32Array(n * 3), A = new Float32Array(n * 2);
    sources.forEach(([x, y, z, k], i) => {
      for (let j = 0; j < PAR; j++) {
        const q = i * PAR + j;
        P[q * 3] = x; P[q * 3 + 1] = y; P[q * 3 + 2] = z;
        A[q * 2] = j / PAR + hacheEntier(i, j, 31) * 0.05;
        A[q * 2 + 1] = k * (0.8 + hacheEntier(i, j, 37) * 0.4);
      }
    });
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(P, 3));
    g.setAttribute('fumee', new THREE.BufferAttribute(A, 2));
    const mat = new THREE.ShaderMaterial({
      transparent: true, depthWrite: false,
      uniforms: { temps: VENT, hauteurVue: FUMEE.hauteur, nuit: NUIT_SOL },
      vertexShader: `
        attribute vec2 fumee; uniform float temps; uniform float hauteurVue; varying float vA;
        void main() {
          float t = fract(temps * 0.11 * (0.85 + fumee.y * 0.15) + fumee.x);
          vec3 p = position;
          p.y += t * 4.2 * fumee.y;
          p.x += t * t * 1.6 + sin(temps * 0.9 + fumee.x * 9.0) * 0.25 * t;
          p.z += t * t * 0.7 + cos(temps * 0.7 + fumee.x * 7.0) * 0.2 * t;
          vec4 mv = modelViewMatrix * vec4(p, 1.0);
          gl_Position = projectionMatrix * mv;
          float taille = mix(0.7, 3.2, t) * fumee.y;
          gl_PointSize = taille * projectionMatrix[1][1] * hauteurVue * 0.5 / max(-mv.z, 0.5);
          vA = smoothstep(0.0, 0.12, t) * (1.0 - t) * (1.0 - smoothstep(40.0, 80.0, -mv.z));
        }`,
      fragmentShader: `
        uniform float nuit; varying float vA;
        void main() {
          vec2 c = gl_PointCoord - 0.5;
          float d = length(c);
          float a = (1.0 - smoothstep(0.12, 0.5, d)) * vA * 0.75;
          if (a < 0.01) discard;
          gl_FragColor = vec4(mix(vec3(0.62, 0.64, 0.7), vec3(0.3, 0.33, 0.42), nuit), a);
        }`,
    });
    mat.name = 'semis_fumees';
    const o = new THREE.Points(g, mat);
    o.name = 'semis fumees';
    o.frustumCulled = false;
    o.renderOrder = 4;
    ile.monde.add(o);
    console.log(`Ervane : fumée sur ${sources.length} toits et feux`);
    return { o, n: sources.length };
  }

  // ----- Les textures précuites en ETC2 (tools/meshy/atlas-etc.py, 3.32) -----
  // Les cinq atlas du semis et les sols, compressés une fois pour toutes (4 bits par pixel au lieu de
  // 32, mipmaps comprises) : le GPU les lit tels quels quand il connaît ETC2 (les téléphones :
  // WEBGL_compressed_texture_etc). Sinon, les atlas sont peints dans des toiles comme avant.
  function etcLu(renderer) {
    try { return !!(renderer && renderer.extensions && renderer.extensions.has('WEBGL_compressed_texture_etc')); } catch (e) { return false; }
  }
  // Un fichier KTX 1.1 en ETC2 RGB : une CompressedTexture avec toute sa chaîne de mipmaps, et ses
  // octets sur le GPU. `srgb` : le GPU la ramène en lumière linéaire (les atlas) ; sans, le shader le
  // fait lui-même (les sols, comme leurs JPEG).
  async function lireKtx(THREE, url, srgb = true) {
    const buf = await IleGlb.octets(url), dv = new DataView(buf), u8 = new Uint8Array(buf, 0, Math.min(12, buf.byteLength));
    const id = [0xAB, 0x4B, 0x54, 0x58, 0x20, 0x31, 0x31, 0xBB, 0x0D, 0x0A, 0x1A, 0x0A];
    if (buf.byteLength < 64 || id.some((v, i) => u8[i] !== v) || dv.getUint32(12, true) !== 0x04030201) throw new Error(url + ' : pas un KTX 1.1');
    const l = dv.getUint32(36, true), h = dv.getUint32(40, true), n = Math.max(1, dv.getUint32(56, true));
    const mipmaps = [];
    let o = 64 + dv.getUint32(60, true), octets = 0;
    for (let i = 0, ml = l, mh = h; i < n; i++, ml = Math.max(1, ml >> 1), mh = Math.max(1, mh >> 1)) {
      const t = dv.getUint32(o, true);
      if (o + 4 + t > buf.byteLength || t !== Math.ceil(ml / 4) * Math.ceil(mh / 4) * 8) throw new Error(url + ' : niveau ' + i + ' tronqué');
      mipmaps.push({ data: new Uint8Array(buf, o + 4, t), width: ml, height: mh });
      octets += t;
      o += 4 + t + ((4 - t % 4) % 4);
    }
    const tex = new THREE.CompressedTexture(mipmaps, l, h, THREE.RGB_ETC2_Format, THREE.UnsignedByteType);
    tex.minFilter = THREE.LinearMipmapLinearFilter;
    tex.magFilter = THREE.LinearFilter;
    tex.generateMipmaps = false;
    tex.encoding = srgb ? THREE.sRGBEncoding : THREE.LinearEncoding;
    tex.needsUpdate = true;
    return { tex, octets };
  }
  // Les atlas précuits, si leur disposition (assets/decor/atlas/semis.json) est celle de SEMIS et
  // ATLAS ; sinon null (une cuisson oubliée retombe sur les toiles, sans erreur). Les fichiers sont lus
  // comme les GLB (IleGlb.octets : fetch, ou XMLHttpRequest en local).
  async function atlasEtc(THREE) {
    const d = JSON.parse(new TextDecoder().decode(await IleGlb.octets(source('assets/decor/atlas/semis.json')))), cases = d.cases || {};
    const memes = JSON.stringify(d.atlas) === JSON.stringify(ATLAS) && Object.keys(cases).length === Object.keys(SEMIS).length
      && Object.entries(SEMIS).every(([nom, s]) => { const c = cases[nom]; return c && c[0] === (s.atlas || 0) && c.slice(1, 4).join() === s.case.join(); });
    if (!memes) { console.warn('Ervane : atlas ETC2 périmés (tools/meshy/atlas-etc.py), toiles peintes'); return null; }
    const tx = await Promise.all(ATLAS.map((_, k) => lireKtx(THREE, source('assets/decor/atlas/semis-' + k + '.ktx'))));
    if (tx.some((t, k) => t.tex.image.width !== ATLAS[k][0] || t.tex.image.height !== ATLAS[k][1])) return null;
    return tx;
  }

  // Les modèles du semis : leur géométrie (tableaux bruts, UV ramenées dans leur case de l'atlas,
  // hauteur) et une matière partagée (l'atlas). Rend { modeles, mat, formes, genres, octets, etc }.
  // `renderer` : pour savoir si le GPU lit les atlas précuits en ETC2.
  async function chargerSemis(THREE, renderer) {
    let etc = null;
    if (etcLu(renderer)) { try { etc = await atlasEtc(THREE); } catch (e) { console.warn('Ervane : atlas ETC2 illisibles, toiles peintes', e); etc = null; } }
    const toiles = etc ? null : ATLAS.map(([l, h]) => { const c = document.createElement('canvas'); c.width = l; c.height = h; const x = c.getContext('2d'); x.fillStyle = '#3a4a3a'; x.fillRect(0, 0, l, h); return { c, x, l, h }; });
    const modeles = {};
    let geo = 0;
    await Promise.all(Object.entries(SEMIS).map(async ([nom, d]) => {
      const { json: G, bin } = await IleGlb.lire(source('assets/decor/' + nom + '-semis.glb'));
      const prim = G.meshes[0].primitives[0], at = prim.attributes;
      const pos = accesseur(G, bin, at.POSITION).array, nrm = accesseur(G, bin, at.NORMAL).array, uv0 = accesseur(G, bin, at.TEXCOORD_0).array;
      const idx = accesseur(G, bin, prim.indices).array;
      const [al, ah] = ATLAS[d.atlas || 0], [x0, y0, c] = d.case, uv = new Float32Array(uv0.length);
      // Un pixel de marge dans la case : les voisines ne bavent pas au bord des îlots d'UV.
      for (let i = 0; i < uv0.length; i += 2) {
        uv[i] = (x0 + 1 + Math.min(1, Math.max(0, uv0[i])) * (c - 2)) / al;
        uv[i + 1] = (y0 + 1 + Math.min(1, Math.max(0, uv0[i + 1])) * (c - 2)) / ah;
      }
      let h = 0, lx = 0, lz = 0;
      for (let i = 0; i < pos.length; i += 3) { h = Math.max(h, pos[i + 1]); lx = Math.max(lx, Math.abs(pos[i])); lz = Math.max(lz, Math.abs(pos[i + 2])); }
      // Sans atlas précuits : l'image du modèle peinte dans sa case (puis rendue à la mémoire).
      if (toiles) {
        const m = (G.materials || [])[0] || {}, pbr = m.pbrMetallicRoughness || {};
        const img = pbr.baseColorTexture ? await imageDe(G, bin, pbr.baseColorTexture.index) : null;
        if (img) { toiles[d.atlas || 0].x.drawImage(img, x0, y0, c, c); if (typeof img.close === 'function') img.close(); }
      }
      modeles[nom] = { pos, nrm, uv, idx, atlas: d.atlas || 0, hauteur: h || 1, largeur: 2 * lx || 1, profondeur: 2 * lz || 1, n: pos.length / 3 };
      geo += pos.byteLength + nrm.byteLength + uv.byteLength + idx.byteLength;
    }));
    const mats = ATLAS.map((_, k) => {
      const tex = etc ? etc[k].tex : new THREE.CanvasTexture(toiles[k].c);
      tex.flipY = false;
      tex.encoding = THREE.sRGBEncoding;
      tex.anisotropy = 2;
      const mat = new THREE.MeshLambertMaterial({ map: tex, side: THREE.DoubleSide, fog: true });
      mat.name = 'semis_meshy_' + k;
      return mat;
    });
    const tex = etc ? etc.reduce((a, t) => a + t.octets, 0) : ATLAS.reduce((a, [l, h]) => a + l * h * 4 * 4 / 3, 0);
    return { modeles, mat: mats[0], mats, formes: FORMES, genres: GENRES, etc: !!etc, octets: { tex, geo } };
  }

  // ----- Les sols (assets/decor/sols/jeu-*.jpg, 3.32 et 3.33) -----
  // Le sol du monde modelé part de ses couleurs de sommets (la teinte de chaque lieu), dont on tire
  // quatre classes : l'herbe (le vert ; sombre, la litière de forêt), les dalles (le clair des places),
  // la terre (le brun) et la roche (le gris). À la manière de « Dofus OpenWorld » (3.33), les classes
  // ont des bords nets et ondulés (un bruit déplace leur seuil), la couleur du lieu suit ces bords,
  // le village est un patchwork de dalles et d'herbe, les champs ont leurs plaques de terre, l'herbe
  // est propre (le grain de sa texture en luminosité seule, adouci), de grandes nappes plus claires ou
  // plus sombres passent comme des ombres de nuages. Les dalles (tools/sols/dalles.py) ont leur propre
  // couleur, à la luminosité du lieu, assombries là où l'herbe les borde.
  // `pas` : la largeur d'une répétition, en u.
  // `moyenne` : la couleur moyenne linéaire de la texture (calculée une fois, à la fabrication).
  const SOLS = {
    herbe: { pas: 6, moyenne: [0.0515, 0.1509, 0.044] }, foret: { pas: 6, moyenne: [0.0364, 0.0587, 0.0354] },
    chemin: { pas: 5, moyenne: [0.3171, 0.1229, 0.0346] }, roche: { pas: 7, moyenne: [0.0433, 0.0812, 0.0947] },
    dalles: { pas: 5, moyenne: [0.3113, 0.4039, 0.4353] }, paves: { pas: 3.5, moyenne: [0.1125, 0.0842, 0.0537] },
  };
  // Les couleurs types des classes (la moyenne des sommets de chaque classe dans le GLB, linéaire) :
  // une classe gagnée ou perdue par un bord net apporte ou retire la sienne.
  const TYPES_SOL = { vert: [0.1133, 0.2848, 0.11], dalles: [0.7406, 0.7182, 0.6209], terre: [0.3876, 0.3046, 0.1296], roche: [0.3487, 0.3233, 0.3142] };
  // Les villages (u, v, rayon, force) : des plaques de dalles dans l'herbe. Les Mailles et le Hameau Vide.
  const VILLAGES = [[210, 104, 36, 1], [175, 28, 14, 0.7]];
  // Par plateau : la zone du village (des plaques de dalles dans l'herbe) et ses centres.
  const VILLAGES_PLATEAU = { ervane: { zone: 'ervane_mailles', centres: VILLAGES }, orsane: { zone: 'orsane_cimes', centres: [[222, 92, 62, 1]] } };
  // `etc` : le GPU lit ETC2, le sol précuit (jeu-<nom>.ktx, retourné comme flipY) d'abord.
  async function texSol(THREE, nom, etc) {
    const m = SOLS[nom].moyenne, moyenne = new THREE.Vector3(m[0], m[1], m[2]);
    if (etc) {
      try {
        const { tex: t, octets } = await lireKtx(THREE, source('assets/decor/sols/jeu-' + nom + '.ktx'), false);
        t.wrapS = t.wrapT = THREE.RepeatWrapping;
        t.anisotropy = 4;
        return { t, moyenne, octets };
      } catch (e) { console.warn('Ervane : sol ETC2 ' + nom + ' illisible', e); }
    }
    return new Promise((ok, ko) => {
      new THREE.TextureLoader().load(source('assets/decor/sols/jeu-' + nom + '.jpg'), t => {
        t.wrapS = t.wrapT = THREE.RepeatWrapping;
        t.anisotropy = 4;
        ok({ t, moyenne, octets: t.image.width * t.image.height * 4 * 4 / 3 });
      }, undefined, ko);
    });
  }
  // Le bruit du sol : une texture de valeurs raccordable (256 x 256, faite ici, sans fichier), quatre
  // fréquences dans ses quatre canaux ; le jeu la répète tous les 40 u : r les nappes (10 u), a les
  // plaques (5 u), g et b les bords (2,5 et 1,25 u). Une graine fixe : le même sol à chaque partie.
  function bruitSol(THREE) {
    const n = 256, data = new Uint8Array(n * n * 4);
    let graine = 0x5e17a9;
    const hasard = () => { graine = (graine + 0x6D2B79F5) | 0; let t = Math.imul(graine ^ (graine >>> 15), 1 | graine); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
    const canal = (k, cellules) => {
      const g = new Float32Array(cellules * cellules);
      for (let i = 0; i < g.length; i++) g[i] = hasard();
      const lisse = t => t * t * (3 - 2 * t);
      for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) {
        const fx = x / n * cellules, fy = y / n * cellules, x0 = Math.floor(fx), y0 = Math.floor(fy);
        const tx = lisse(fx - x0), ty = lisse(fy - y0), x1 = (x0 + 1) % cellules, y1 = (y0 + 1) % cellules;
        const a = g[y0 * cellules + x0] * (1 - tx) + g[y0 * cellules + x1] * tx, b = g[y1 * cellules + x0] * (1 - tx) + g[y1 * cellules + x1] * tx;
        data[(y * n + x) * 4 + k] = Math.round((a * (1 - ty) + b * ty) * 255);
      }
    };
    canal(0, 4); canal(1, 16); canal(2, 32); canal(3, 8);
    const t = new THREE.DataTexture(data, n, n, THREE.RGBAFormat, THREE.UnsignedByteType);
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.magFilter = THREE.LinearFilter;
    t.minFilter = THREE.LinearMipmapLinearFilter;
    t.generateMipmaps = true;
    t.needsUpdate = true;
    return { t, octets: n * n * 4 * 4 / 3 };
  }
  // La carte des matières (3.33) : un texel par u sur toute l'île, faite ici d'après le plateau (T,
  // js/ile-terrain.js) : r les sentiers (les pavés de chemin), g les ruelles et les places de pierre (les
  // dalles), b le village (des plaques de dalles dans l'herbe), a les places de terre. Des distances,
  // en douceur : le shader en tire des bords nets au bruit.
  function carteSol(THREE, T) {
    const VIL = VILLAGES_PLATEAU[T.id] || { zone: null, centres: [] };
    const W = T.W, H = T.H, data = new Uint8Array(W * H * 4);
    const pres = (u, v, pts, demi) => {
      let m = Infinity;
      for (let k = 0; k + 1 < pts.length; k++) {
        const ax = pts[k][0], ay = pts[k][1], sx = pts[k + 1][0] - ax, sy = pts[k + 1][1] - ay, l2 = sx * sx + sy * sy;
        const t = l2 > 0 ? Math.max(0, Math.min(1, ((u - ax) * sx + (v - ay) * sy) / l2)) : 0;
        m = Math.min(m, Math.hypot(ax + sx * t - u, ay + sy * t - v));
      }
      return m - demi;
    };
    const val = d => Math.round(255 * Math.max(0, Math.min(1, 0.5 - d / 2.4)));
    const lignes = T.lignes || [], places = T.places || [];
    const sentiers = lignes.filter(l => l.sorte === 'sentier' && l.pts), ruelles = lignes.filter(l => l.sorte === 'ruelle' && l.pts);
    const vil = new Float32Array(W * H);
    for (let v = 0; v < H; v++) for (let u = 0; u < W; u++) {
      const i = v * W + u;
      let dS = 9, dR = 9, dT = 9;
      for (const l of sentiers) dS = Math.min(dS, pres(u, v, l.pts, l.demi));
      for (const l of ruelles) dR = Math.min(dR, pres(u, v, l.pts, l.demi));
      for (const p of places) {
        const d = Math.hypot(u - p.centre[0], v - p.centre[1]) - p.rayon;
        if (p.sol === 'terre') dT = Math.min(dT, d); else if (p.sol === 'calcaire') dR = Math.min(dR, d);
      }
      data[i * 4] = val(dS); data[i * 4 + 1] = val(dR); data[i * 4 + 3] = val(dT);
      const z = T.regionsZone && T.region ? T.regionsZone[T.region[i]] : null;
      vil[i] = z === VIL.zone ? 1 : 0;
      for (const V of VIL.centres) { const d = Math.hypot(u - V[0], v - V[1]); if (d < V[2]) vil[i] = Math.max(vil[i], V[3] * Math.min(1, (V[2] - d) / (V[2] * 0.3))); }
    }
    // Le village en douceur (deux passes de flou de 3 u) : les plaques s'éclaircissent vers ses bords.
    const flou = (src) => { const out = new Float32Array(W * H); for (let v = 0; v < H; v++) for (let u = 0; u < W; u++) { let s = 0, n = 0; for (let dv = -3; dv <= 3; dv++) for (let du = -3; du <= 3; du++) { const x = u + du, y = v + dv; if (x < 0 || y < 0 || x >= W || y >= H) continue; s += src[y * W + x]; n++; } out[v * W + u] = s / n; } return out; };
    const vf = flou(flou(vil));
    for (let i = 0; i < W * H; i++) data[i * 4 + 2] = Math.round(255 * vf[i]);
    const t = new THREE.DataTexture(data, W, H, THREE.RGBAFormat, THREE.UnsignedByteType);
    t.magFilter = t.minFilter = THREE.LinearFilter;
    t.generateMipmaps = false;
    t.needsUpdate = true;
    return { t, octets: W * H * 4, W, H };
  }
  // Les flaques de lumière de la nuit (3.35) : les lanternes, les feux, la Braise, le tour des maisons
  // et des tentes, les relais ; [u, v, rayon, genre] : 1 une lumière ambrée, 0 le cyan du fil, 2 + r un
  // anneau ambré qui part du pied des murs (r : le rayon du mur). Vingt-quatre au plus.
  const MAX_LUMIERES = 24;
  function lumieresSol(T) {
    const out = [];
    for (const o of (T && T.objets) || []) {
      // Les maisons et les tentes : la lumière des fenêtres et des portes déborde autour d'elles.
      const t = o.taille || [4, 4], tour = Math.max(t[0], t[1]) / 2;
      if (o.sorte === 'lanterne') out.push([o.u, o.v, 5.5, 1]);
      else if (o.sorte === 'feu') out.push([o.u, o.v, 7, 1]);
      else if (o.sorte === 'source' && o.element === 'feu') out.push([o.u, o.v, 5, 1]);
      else if (o.sorte === 'maison') out.push([o.u, o.v, tour + 3.5, 2 + tour * 0.8]);
      else if (o.sorte === 'tente') out.push([o.u, o.v, tour + 2.8, 2 + tour * 0.7]);
    }
    for (const r of (T && T.relais) || []) out.push([r.u, r.v, 6.5, 0]);
    return out.slice(0, MAX_LUMIERES);
  }
  const NUIT_SOL = { value: 0 };
  let ileSol = null;
  // Les places de pierre en cercles de pavés (3.33) : centre, rayon ; huit au plus.
  const MAX_PLACES = 8;
  // Les parcelles cultivées (phase D) : deux vec4 chacune, [u, v, cos, sin] et [demi-longueur,
  // demi-largeur, pas des sillons, 0] ; six au plus. La terre labourée, en lumière linéaire.
  const MAX_PARCELLES = 6;
  const TERRE_LABOUREE = [0.3, 0.175, 0.08];
  const v3 = c => `vec3(${c.map(x => x.toFixed(4)).join(', ')})`;
  const GLSL_SOL = `
    {
      vec3 cs = vColor.rgb;
      float lumS = dot(cs, vec3(0.3, 0.59, 0.11));
      vec2 q = vMonde.xz;
      vec4 bz = texture2D(solBruit, q / 40.0);
      float ond = bz.g * 0.6 + bz.b * 0.4;
      // Les classes douces (la couleur du lieu), puis nettes : leur seuil déplacé par le bruit.
      float cV = smoothstep(0.0, 0.06, cs.g - max(cs.r, cs.b));
      float cP = smoothstep(0.42, 0.55, lumS);
      float cB = smoothstep(0.02, 0.12, cs.r - cs.b);
      float tFor = 1.0 - smoothstep(0.13, 0.24, lumS);
      float sV = cV, sP = cP * (1.0 - cV), sB = cB * (1.0 - cV) * (1.0 - cP);
      float sG = max(0.0, 1.0 - sV - sP - sB);
      #define NET(x, d) smoothstep(0.46, 0.54, (x) + ((d) - 0.5) * 0.7)
      float nV = NET(cV, ond), nP = NET(cP, 1.0 - ond), nB = NET(cB, bz.b);
      // La carte des matières : r les sentiers, g les ruelles et les places de pierre, b le village, a
      // les places de terre (un texel par u).
      vec4 cm = texture2D(solCarte, (q + 0.5) / solCarteTaille);
      float vil = cm.b;
      float nSe = NET(cm.r, ond * 0.45 + bz.b * 0.55), nR = NET(cm.g, 1.0 - ond), nT = NET(cm.a, ond);
      nP = max(nP, nR);
      nB = max(nB, max(nT, nSe));
      // Les villages : des plaques de dalles dans l'herbe ; ailleurs, hors des bois, des plaques de terre.
      float vPl = bz.a * 0.75 + bz.r * 0.25 + (ond - 0.5) * 0.14;
      float plaque = smoothstep(0.575, 0.605, vPl) * vil;
      float terre = smoothstep(0.69, 0.72, bz.r * 0.6 + bz.a * 0.4 + (ond - 0.5) * 0.12) * (1.0 - tFor) * (1.0 - vil);
      nV *= 1.0 - max(max(nR, nSe), nT);
      float dP = nV * plaque, dB = nV * terre * (1.0 - plaque);
      float wV = nV - dP - dB;
      float wP = nP * (1.0 - nV) + dP;
      float wB = nB * (1.0 - nV) * (1.0 - nP) + dB;
      // Des îlots d'herbe dans la terre, hors des sentiers et des places.
      float ilot = smoothstep(0.60, 0.63, bz.a * 0.55 + bz.g * 0.45 + (bz.b - 0.5) * 0.1) * (1.0 - nSe) * (1.0 - nT);
      float dV = (wB - dB) * ilot;
      wB -= dV; wV += dV;
      float wG = max(0.0, 1.0 - wV - wP - wB);
      // La couleur du lieu suit les bords nets.
      vec3 c = max(cs + (wV - sV) * ${v3(TYPES_SOL.vert)} + (wP - sP) * ${v3(TYPES_SOL.dalles)} + (wB - sB) * ${v3(TYPES_SOL.terre)} + (wG - sG) * ${v3(TYPES_SOL.roche)}, vec3(0.0));
      float lumC = dot(c, vec3(0.3, 0.59, 0.11));
      #define TEX(s, p) pow(texture2D(s, q / p).rgb, vec3(2.2))
      #define LUM(v) dot(v, vec3(0.3, 0.59, 0.11))
      // L'herbe peinte (tools/sols/meshy_sol.py) : son grain, ses reflets jaune-vert et ses creux bleu-vert à
      // moitié ; la litière de forêt en luminosité seule.
      vec3 tH = TEX(solHerbe, ${SOLS.herbe.pas.toFixed(1)});
      vec3 gH = mix(vec3(LUM(tH) / LUM(moyHerbe)), tH / max(moyHerbe, vec3(0.02)), 0.5);
      vec3 gV = mix(gH, vec3(LUM(TEX(solForet, ${SOLS.foret.pas.toFixed(1)})) / LUM(moyForet)), tFor);
      gV = 1.0 + (clamp(gV, 0.0, 2.5) - 1.0) * 0.6;
      vec3 tC = TEX(solChemin, ${SOLS.chemin.pas.toFixed(1)});
      vec3 gB = clamp(mix(vec3(LUM(tC) / LUM(moyChemin)), tC / max(moyChemin, vec3(0.02)), 0.3), 0.0, 2.5);
      // Les sentiers pavés : les pavés de chemin, leur couleur à la luminosité du lieu.
      vec3 pave = TEX(solPaves, ${SOLS.paves.pas.toFixed(1)}) / LUM(moyPaves);
      vec3 tR = TEX(solRoche, ${SOLS.roche.pas.toFixed(1)});
      vec3 gG = clamp(mix(vec3(LUM(tR) / LUM(moyRoche)), tR / max(moyRoche, vec3(0.02)), 0.3), 0.0, 2.5);
      gB = mix(vec3(1.0), gB, 0.75); gG = mix(vec3(1.0), gG, 0.75);
      // Les dalles : leur couleur, à la luminosité du lieu ; l'herbe qui les borde les assombrit.
      // Les places de pierre : des cercles de pavés autour du centre, un liseré clair au bord.
      vec2 qd = q;
      float anneau = 0.0;
      for (int i = 0; i < ${MAX_PLACES}; i++) {
        vec3 P = solPlaces[i];
        if (P.z <= 0.0) continue;
        vec2 e = q - P.xy;
        float d = length(e);
        if (d < P.z + 0.6) {
          float a = atan(e.y, e.x);
          qd = vec2(a * max(d, 0.5) * 1.15, d * 1.6) * ${SOLS.dalles.pas.toFixed(1)} / 2.4;
          anneau = smoothstep(P.z - 1.1, P.z - 0.7, d) * (1.0 - smoothstep(P.z - 0.35, P.z, d));
        }
      }
      vec3 dalle = pow(texture2D(solDalles, qd / ${SOLS.dalles.pas.toFixed(1)}).rgb, vec3(2.2)) / LUM(moyDalles) * lumC * 0.82;
      dalle *= 1.0 + 0.35 * anneau;
      float fP = smoothstep(0.5, 0.7, cP + (0.5 - ond) * 0.7) * (1.0 - nV) + nV * smoothstep(0.605, 0.66, vPl) * vil;
      dalle *= 1.0 - 0.28 * clamp(1.0 - fP / max(wP, 0.001), 0.0, 1.0);
      float wS = wB * nSe;
      vec3 col = c * (wV * gV + (wB - wS) * gB + wG * gG) + wP * dalle + wS * pave * lumC * 0.95;
      // Les parcelles cultivées : la terre labourée en sillons le long du grand côté (le dessus plus
      // clair, le creux sombre), un bord tassé sans sillons, une lisière nette un peu ondulée.
      for (int i = 0; i < ${MAX_PARCELLES}; i++) {
        vec4 PA = solParcelles[i * 2], PB = solParcelles[i * 2 + 1];
        if (PB.x <= 0.0) continue;
        vec2 e = q - PA.xy, lp = vec2(dot(e, PA.zw), dot(e, vec2(-PA.w, PA.z)));
        float dB = min(PB.x - abs(lp.x), PB.y - abs(lp.y));
        if (dB < -0.4) continue;
        float mP = smoothstep(-0.14, 0.06, dB + (ond - 0.5) * 0.2);
        float sil = 0.5 + 0.5 * cos(lp.y * 6.2832 / PB.z);
        sil = mix(sil, 0.62, smoothstep(0.5, 0.2, dB));
        vec3 lab = ${v3(TERRE_LABOUREE)} * gB * mix(0.42, 1.0, sil * sil) * (0.9 + 0.2 * bz.g);
        col = mix(col, lab, mP);
      }
      // Les grandes nappes (pas sur les dalles).
      col *= mix(1.0, 0.86 + 0.26 * bz.r, 0.85 * (1.0 - wP));
      // Les ombres des nuages qui passent, le jour (3.35) : un bruit lent qui glisse avec le vent.
      float nuage = texture2D(solBruit, (q + solTemps * vec2(1.1, 0.45)) / 150.0).r;
      col *= 1.0 - 0.2 * smoothstep(0.52, 0.72, nuage) * (1.0 - solNuit);
      // Les pentes raides : la roche, projetée de côté (sur le plan le plus face à la pente).
      vec3 nS = normalize(vNormaleMonde);
      vec2 qc = abs(nS.x) > abs(nS.z) ? vMonde.zy : vMonde.xy;
      vec3 tRs = pow(texture2D(solRoche, qc / ${SOLS.roche.pas.toFixed(1)}).rgb, vec3(2.2));
      vec3 gRs = mix(vec3(1.0), clamp(mix(vec3(LUM(tRs) / LUM(moyRoche)), tRs / max(moyRoche, vec3(0.02)), 0.3), 0.0, 2.5), 0.75);
      col = mix(cs * gRs, col, smoothstep(0.5, 0.78, abs(nS.y)));
      diffuseColor.rgb = diffuse * col;
    }`;
  // Les flaques de lumière chaude de la nuit (3.35), comme celles de la référence : une lumière propre au
  // sol (émise), qui suit la couleur du sol éclairé ; les feux vacillent.
  const GLSL_LUMIERES = `
    if (solNuit > 0.01) {
      vec2 qL = vMonde.xz;
      vec3 L = vec3(0.0);
      for (int i = 0; i < ${MAX_LUMIERES}; i++) {
        vec4 P = solLumieres[i];
        if (P.z <= 0.0) continue;
        float d = distance(qL, P.xy);
        if (d > P.z) continue;
        float chaud = min(P.w, 1.0), f;
        if (P.w >= 2.0) { float r0 = P.w - 2.0; f = d < r0 ? 1.0 : 1.0 - (d - r0) / max(P.z - r0, 0.5); }
        else f = 1.0 - d / P.z;
        f = pow(max(f, 0.0), 1.6) * (0.92 + 0.08 * sin(solTemps * 7.0 + P.x * 3.1) * chaud);
        L += mix(vec3(0.35, 0.85, 1.0), vec3(1.0, 0.5, 0.16), chaud) * f;
      }
      totalEmissiveRadiance += L * (0.3 + 0.7 * diffuseColor.rgb) * 3.0 * solNuit;
    }`;
  // Habille la matière du sol du monde modelé (après IleSol.grille, qui déclare vMonde). Rend les
  // octets des textures, ou 0.
  async function habillerSol(THREE, ile) {
    if (!ile || !ile.monde) return 0;
    const mats = new Set();
    for (const o of ile.monde.children) if (/^mo_sol/.test(o.name) && o.material && o.material.vertexColors) mats.add(o.material);
    if (!mats.size) return 0;
    const noms = ['herbe', 'foret', 'chemin', 'roche', 'dalles', 'paves'], tx = {};
    const etc = etcLu(ile.renderer);
    await Promise.all(noms.map(async n => { tx[n] = await texSol(THREE, n, etc); }));
    ile.solsEtc = noms.filter(n => tx[n].t.isCompressedTexture).length;
    const uniforms = {}, cap = n => n[0].toUpperCase() + n.slice(1);
    for (const n of noms) { uniforms['sol' + cap(n)] = { value: tx[n].t }; uniforms['moy' + cap(n)] = { value: tx[n].moyenne }; }
    const bz = bruitSol(THREE), carte = ile.T ? carteSol(THREE, ile.T) : null;
    uniforms.solBruit = { value: bz.t };
    uniforms.solCarte = { value: carte ? carte.t : bz.t };
    uniforms.solCarteTaille = { value: new THREE.Vector2(carte ? carte.W : 1, carte ? carte.H : 1) };
    // Les places de pierre (calcaire) assez grandes pour des cercles : centre et rayon.
    const pl = ((ile.T && ile.T.places) || []).filter(p => (p.sol || 'calcaire') === 'calcaire' && p.rayon >= 5).slice(0, MAX_PLACES);
    uniforms.solPlaces = { value: Array.from({ length: MAX_PLACES }, (_, i) => pl[i] ? new THREE.Vector3(pl[i].centre[0], pl[i].centre[1], pl[i].rayon) : new THREE.Vector3(0, 0, 0)) };
    const pc = ((ile.T && ile.T.objets) || []).filter(o => o.sorte === 'parcelle' && CULTURES[o.culture]).slice(0, MAX_PARCELLES);
    uniforms.solParcelles = { value: Array.from({ length: MAX_PARCELLES * 2 }, (_, i) => {
      const o = pc[i >> 1];
      if (!o) return new THREE.Vector4(0, 0, 0, 0);
      const t = o.taille || [8, 6];
      return i % 2 === 0 ? new THREE.Vector4(o.u, o.v, Math.cos(o.rot || 0), Math.sin(o.rot || 0)) : new THREE.Vector4(t[0] / 2, t[1] / 2, CULTURES[o.culture].sillon, 0);
    }) };
    const lum = lumieresSol(ile.T);
    uniforms.solLumieres = { value: Array.from({ length: MAX_LUMIERES }, (_, i) => lum[i] ? new THREE.Vector4(lum[i][0], lum[i][1], lum[i][2], lum[i][3]) : new THREE.Vector4(0, 0, 0, 0)) };
    uniforms.solNuit = NUIT_SOL;
    uniforms.solTemps = VENT;
    ileSol = ile;
    const decl = noms.map(n => `uniform sampler2D sol${cap(n)}; uniform vec3 moy${cap(n)};`).join('\n') + `\nuniform sampler2D solBruit; uniform sampler2D solCarte; uniform vec2 solCarteTaille; uniform vec3 solPlaces[${MAX_PLACES}]; uniform vec4 solParcelles[${MAX_PARCELLES * 2}]; uniform vec4 solLumieres[${MAX_LUMIERES}]; uniform float solNuit; uniform float solTemps;`;
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
          .replace('#include <color_fragment>', '#include <color_fragment>\n' + GLSL_SOL)
          .replace('#include <emissivemap_fragment>', '#include <emissivemap_fragment>\n' + GLSL_LUMIERES);
      };
      m.customProgramCacheKey = () => 'sol-meshy-4/' + (cle ? cle.call(m) : '');
      m.needsUpdate = true;
    }
    ile.solCarte = !!carte;
    return noms.reduce((a, n) => a + tx[n].octets, 0) + bz.octets + (carte ? carte.octets : 0);
  }

  return { FICHIERS, DIAMETRE_RELAIS, FORMES, SEMIS, ATLAS, OBJETS, SOLS, VILLAGES, DENSE, CARTES_DENSES, OBSTACLES, cartes, fumees, lumieresSol, charger, chargerSemis, poses, posesObstacles, places, poser, animer, habillerSol };
})();
if (typeof module !== 'undefined' && module.exports) module.exports = IleModeles;
