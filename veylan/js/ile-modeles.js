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

  return { FICHIERS, HAUTEUR_RELAIS, charger, places, poser, animer };
})();
if (typeof module !== 'undefined' && module.exports) module.exports = IleModeles;
