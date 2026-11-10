const IleModeles = (() => {
  const FICHIERS = { relais: 'assets/modeles/relais.glb' };
  const DIAMETRE_RELAIS = 3.6;

  function source(chemin) {
    try {
      const ref = document.querySelector('script[src*="ile-modeles.js"]') || document.querySelector('script[src*="ile-charge.js"]');
      if (ref && ref.src) { const u = new URL(ref.src); return new URL('../' + chemin, u).href + u.search; }
    } catch (e) {   }
    return chemin;
  }

  const TYPES = { 5121: Uint8Array, 5123: Uint16Array, 5125: Uint32Array, 5126: Float32Array };
  const N = { SCALAR: 1, VEC2: 2, VEC3: 3, VEC4: 4 };
  function accesseur(G, bin, idx) {
    const a = G.accessors[idx], bv = G.bufferViews[a.bufferView], n = N[a.type];
    return { array: new TYPES[a.componentType](bin, (bv.byteOffset || 0) + (a.byteOffset || 0), a.count * n), n };
  }

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

  function places(T) {
    return ((T && T.relais) || []).map(r => ({ u: r.u, v: r.v, rot: 0, carte: r.carte }));
  }

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
      const r = new THREE.Mesh(fil.geo, fil.mat);
      r.name = 'relais_fil'; r.scale.setScalar(1 / k); r.renderOrder = 3;
      if (morceaux.portail) r.position.copy(morceaux.portail.position);
      groupe.add(r);
      morceaux.fil = r;
      ile.monde.add(groupe);
      relais.push({ groupe, morceaux, phase: (l.u * 0.37 + l.v * 0.11) % (Math.PI * 2) });
    }
    ile.octetsGeo = (ile.octetsGeo || 0) + modele.octets.geo;
    ile.octetsTex = (ile.octetsTex || 0) + modele.octets.tex;
    console.log(`Ervane : ${relais.length} relais de l'Aube posés (${modele.triangles} triangles chacun, ${Math.round((modele.octets.geo + modele.octets.tex) / 1e5) / 10} Mo)`);
    return { relais, mat: modele.mat, triangles: modele.triangles };
  }

  function animer(etat, t) {
    VENT.value = t;
    if (ileSol && ileSol.renderer && ileSol.renderer.domElement) FUMEE.hauteur.value = ileSol.renderer.domElement.height || 800;
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

  const FORMES = {
    base_arbre_large_0: 'feuillu', base_arbre_large_1: 'feuillu', base_arbre_rond_0: 'feuillu', base_arbre_rond_1: 'feuillu',
    base_arbre_haut_0: 'haut', base_arbre_haut_1: 'haut', base_arbre_pin_0: 'conifere', base_arbre_pin_1: 'conifere',
    base_arbre_tordu_0: 'tordu', base_arbre_mort_0: 'mort', base_rocher_0: 'rocher', base_buisson_0: 'buisson', base_buisson_1: 'buisson',
    base_fougere_0: 'fougere', base_fleurs_0: 'fleurs', base_galet_0: 'galet', base_borne_0: 'borne',
    base_bruyere_0: 'bruyere', base_bruyere_1: 'bruyere',
  };
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
    'jt-vert': { atlas: 5, case: [0, 0, 256] }, 'jt-ambre': { atlas: 5, case: [256, 0, 256] }, 'jt-rouille': { atlas: 5, case: [512, 0, 256] },
    'v-buisson': { atlas: 5, case: [768, 0, 256] }, 'v-fleurs-blanc': { atlas: 5, case: [0, 256, 256] }, 'v-fleurs-lavande': { atlas: 5, case: [256, 256, 256] },
    'v-rochers': { atlas: 5, case: [512, 256, 256] }, 'v-amanites': { atlas: 5, case: [768, 256, 256] }, 'v-pierre': { atlas: 5, case: [0, 512, 256] },
    'ch-choux': { atlas: 5, case: [256, 512, 256] }, 'ch-courges': { atlas: 5, case: [512, 512, 256] }, 'ch-epouvantail': { atlas: 5, case: [768, 512, 256] },
    'ch-gerbes': { atlas: 5, case: [0, 768, 256] }, 'ch-brouette': { atlas: 5, case: [256, 768, 256] },
    'o-maison': { atlas: 6, case: [0, 0, 512] }, 'o-service': { atlas: 6, case: [512, 0, 512] },
    'k-maison': { atlas: 6, case: [0, 512, 512] }, 'k-atelier': { atlas: 6, case: [512, 512, 512] },
    'o-maison2': { atlas: 7, case: [0, 0, 512] }, 'o-tourelle': { atlas: 7, case: [512, 0, 512] },
    'k-maison2': { atlas: 7, case: [0, 512, 512] },
    'o-lanterne': { atlas: 7, case: [512, 512, 256] }, 'k-lanterne': { atlas: 7, case: [768, 512, 256] },
    'o-statue': { atlas: 7, case: [512, 768, 256] },
    'k-porte': { atlas: 8, case: [0, 0, 512] }, 'k-mine': { atlas: 8, case: [512, 0, 512] },
    'o-etal': { atlas: 8, case: [0, 512, 256] }, 'k-etal': { atlas: 8, case: [256, 512, 256] },
    'k-tente': { atlas: 8, case: [512, 512, 256] }, 'k-brasero': { atlas: 8, case: [768, 512, 256] },
    'at-enclume': { atlas: 8, case: [0, 768, 256] }, 'at-alambic': { atlas: 8, case: [256, 768, 256] },
    'at-etabli': { atlas: 8, case: [512, 768, 256] }, 'at-metier': { atlas: 8, case: [768, 768, 256] },
    'o-tour': { atlas: 9, case: [0, 0, 512] }, 'k-tour': { atlas: 9, case: [512, 0, 512] },
    'at-mannequin': { atlas: 9, case: [0, 512, 256] }, 'at-forge': { atlas: 9, case: [256, 512, 256] },
    'o-roche': { atlas: 9, case: [512, 512, 256] }, 'o-buisson': { atlas: 9, case: [768, 512, 256] },
    'k-roche': { atlas: 9, case: [0, 768, 256] }, 'k-souche': { atlas: 9, case: [256, 768, 256] },
    'k-arbre': { atlas: 9, case: [512, 768, 256] }, 'k-buisson': { atlas: 9, case: [768, 768, 256] },
    'k-cristaux': { atlas: 7, case: [768, 768, 256] }, 'k-fumerolle': { atlas: 10, case: [0, 0, 256] },
  };
  const ATLAS = [[2048, 1024], [1024, 1024], [1024, 1024], [1024, 512], [1024, 512], [1024, 1024], [1024, 1024], [1024, 1024], [1024, 1024], [1024, 1024], [512, 256]];
  const SOURCES = [['eau', 160, 148], ['feu', 130, 125], ['terre', 140, 166], ['air', 105, 120], [null, 92, 164]];
  let ICI = null;
  const ici = T => { if (T) ICI = T; return ICI; };
  const ervane = () => !ICI || ICI.id === 'ervane';
  const zoneIci = (x, z) => (ICI && typeof ICI.zoneA === 'function' ? ICI.zoneA(x, z) : null);
  const dansSources = (x, z) => ervane() && x >= 70 && x <= 170 && z >= 92 && z <= 190;
  const dansMurets = (x, z) => ervane() && x > 110 && z < 80;
  const dansBois = (x, z) => (ervane() ? z < 95 && (z > 55 ? x <= 125 : x < 120 + z * 0.45) : zoneIci(x, z) === 'orsane_toiles');
  const dansAmarre = (x, z) => (ervane() ? z >= 95 && x < 80 : /^orsane_(sentiers|eboulis|toiles)$/.test(zoneIci(x, z) || ''));
  const elementA = (x, z, h) => {
    let m = null, d = 1e9;
    for (const s of SOURCES) { const e = Math.hypot(x - s[1], z - s[2]); if (e < d) { d = e; m = s[0]; } }
    return m || ['eau', 'feu', 'terre', 'air'][Math.floor(h * 4) % 4];
  };
  const chaud = t => !!t && t[0] > t[1] * 0.8;
  const sombre = t => !!t && t[1] < 0.2 && t[0] < 0.1;
  const volcan = () => !!(ICI && ICI.id === 'kaldum');
  const montagne = (x, z) => !!(ICI && ICI.id === 'orsane' && typeof ICI.zoneA === 'function' && /^orsane_(sentiers|eboulis)$/.test(ICI.zoneA(x, z) || ''));
  const GENRES = {
    feuillu: { modele: (t, h, x, z) => (volcan() ? 'k-arbre' : dansBois(x, z) ? 'b-arbre' : chaud(t) || h < 0.2 ? 'arbre3' : 'arbre'), facteur: 1.05 },
    haut: { modele: (t, h, x, z) => (volcan() ? 'k-arbre' : dansBois(x, z) ? 'b-arbre' : 'arbre2'), facteur: 1.0 },
    conifere: { modele: () => (volcan() ? 'k-arbre' : 'arbre2'), facteur: 1.0 },
    tordu: { modele: (t, h, x, z) => (volcan() ? 'k-arbre' : dansAmarre(x, z) ? 'a-pin' : chaud(t) ? 'arbre3' : 'arbre'), facteur: 0.75 },
    borne: { modele: () => 'a-borne', facteur: 1.05 },
    mort: { modele: (t, h) => (volcan() ? (h < 0.5 ? 'k-souche' : 'k-arbre') : h < 0.5 ? 'souche' : 'tronc'), absolu: { souche: 1.0, tronc: 0.9 } },
    rocher: { modele: (t, h, x, z) => (volcan() ? (h < 0.08 ? 'k-cristaux' : 'k-roche') : dansBois(x, z) ? 'b-rocher' : h < 0.12 ? 'roc' : h < 0.26 ? 'cristal' : montagne(x, z) ? 'o-roche' : 'rocher2'), facteur: 1.25, absolu: { roc: 2.6, cristal: 1.3, 'b-rocher': 1.9 } },
    buisson: { modele: (t, h, x, z) => (volcan() ? 'k-buisson' : dansBois(x, z) && h < 0.3 ? 'b-champignons' : dansBois(x, z) && h < 0.45 ? 'b-tronc' : sombre(t) && h < 0.22 ? 'champignons' : montagne(x, z) ? 'o-buisson' : 'buisson'), facteur: 1.15, absolu: { champignons: 1.1, 'b-champignons': 1.3, 'b-tronc': 0.9 } },
    bruyere: { modele: (t, h, x, z) => (montagne(x, z) ? 'o-buisson' : volcan() ? 'k-buisson' : null), facteur: 1.15 },
    fougere: { modele: (t, h, x, z) => (dansBois(x, z) ? (h < 0.3 ? 'b-fougere' : null) : h < 0.18 ? 'fougeres' : null), absolu: { fougeres: 1.1, 'b-fougere': 1.2 } },
    fleurs: { modele: (t, h, x, z) => (dansSources(x, z) ? 's-fleurs-' + elementA(x, z, h) : null), absolu: { 's-fleurs-eau': 0.75, 's-fleurs-feu': 0.75, 's-fleurs-terre': 0.65, 's-fleurs-air': 0.75 } },
    galet: { modele: (t, h, x, z) => (dansSources(x, z) ? 's-dalle' : null), absolu: { 's-dalle': 0.22 } },
  };
  const varianteMaison = (o, liste) => liste[Math.floor(hacheEntier(Math.round(o.u * 4), Math.round(o.v * 4), 53) * liste.length) % liste.length];
  const OBJETS = {
    maison: { modele: o => (ICI && ICI.id === 'kaldum' ? (o.service ? 'k-atelier' : varianteMaison(o, ['k-maison', 'k-maison', 'k-maison2'])) : !ervane() ? (o.service ? 'o-service' : varianteMaison(o, ['o-maison', 'o-maison2', 'o-tourelle'])) : dansBois(o.u, o.v) ? 'b-cabane' : 'm-maison'), taille: o => { const k = ervane() ? 1 : 1.15; return { l: (o.taille || [6, 5])[0] * k, p: (o.taille || [6, 5])[1] * k, h: (o.hauteur || 6) * k }; }, etire: o => !!o.service, angle: o => -(o.rot || 0) },
    arbre_bobine: { modele: 'b-bobine', taille: () => ({ l: 9, p: 9, h: 18 }) },
    pieu: { modele: 'b-pieux', taille: () => ({ l: 2.6, p: 2.6, h: 2 }) },
    comptoir: { modele: () => (ICI && ICI.id === 'kaldum' ? 'k-etal' : !ervane() ? 'o-etal' : 'm-etal'), taille: o => ({ l: (o.taille || [5, 2])[0], p: (o.taille || [5, 2])[1], h: 3.6 }), angle: o => -(o.rot || 0) },
    lanterne: { modele: () => (ICI && ICI.id === 'kaldum' ? 'k-lanterne' : !ervane() ? 'o-lanterne' : 'm-lanterne'), taille: () => ({ l: 9, p: 9, h: ervane() ? 2.6 : 3 }) },
    pierre_levee: { modele: o => (o.element ? 's-pierre-' + o.element : 'm-pierre'), taille: o => ({ l: 9, p: 9, h: o.element ? 2.6 : 2.4 }) },
    cairn: { modele: o => (dansMurets(o.u, o.v) ? 'mu-cairn' : 's-cairn'), taille: o => ({ l: 9, p: 9, h: (o.hauteur || 2) * 1.05 }) },
    source: { modele: o => ({ feu: 's-braise', eau: 's-claire', terre: 's-mousse' })[o.element],
      taille: o => (o.element === 'eau' ? { l: 4.6, p: 4.6, h: 9 } : o.element === 'terre' ? { l: 3.2, p: 3.2, h: 2.4 } : { l: 3.2, p: 3.2, h: 2.2 }),
      enfonce: o => (o.element === 'terre' ? 0.14 : o.element === 'eau' ? 0.12 : 0) },
    ponton: { modele: 's-passerelle', taille: () => ({ l: 4.2, p: 4.2, h: 9 }) },
    rambarde: { modele: (o, T) => (T.objets.some(x => x.sorte === 'longue_vue' && Math.hypot(x.u - o.u, x.v - o.v) < 2) ? null : 's-barriere'),
      taille: () => ({ l: 3, p: 3, h: 1.35 }), copies: [-1.5, 1.5] },
    ratelier: { modele: 'm-armes', taille: () => ({ l: 4, p: 2.2, h: 1.9 }), angle: o => -(o.rot || 0) },
    tour: { modele: (o, T) => (T && T.id === 'kaldum' ? 'k-tour' : !ervane() ? 'o-tour' : 'm-tour'), taille: o => (ervane() ? { l: (o.taille || [6, 6])[0], p: (o.taille || [6, 6])[1], h: 7 } : { l: (o.taille || [5, 5])[0] * 1.15, p: (o.taille || [5, 5])[1] * 1.15, h: 11 }), angle: o => -(o.rot || 0) },
    porte_de_forge: { modele: 'k-porte', taille: () => ({ l: 6.8, p: 5, h: 5 }), angle: o => -(o.rot || 0), decalage: [0, -1] },
    bouche_de_mine: { modele: 'k-mine', taille: () => ({ l: 6.6, p: 6, h: 4.2 }), angle: o => -(o.rot || 0), decalage: [0, -0.8] },
    statue: { modele: () => (!ervane() ? 'o-statue' : null), taille: () => ({ l: 1.4, p: 1.4, h: 2 }), angle: o => -(o.rot || 0), enfonce: () => -0.27 },
    longue_vue: { modele: 'm-belvedere', taille: () => ({ l: 3, p: 2.2, h: 2.4 }) },
    tonneau: { modele: 'm-tonneaux', taille: () => ({ l: 2.2, p: 2.2, h: 1.6 }) },
    puits_sec: { modele: 'mu-puits', taille: () => ({ l: 2.6, p: 2.6, h: 3.2 }) },
    ruine: { modele: o => (dansMurets(o.u, o.v) ? 'mu-ruine' : ervane() && dansAmarre(o.u, o.v) ? 'a-mur' : null), taille: o => ({ l: (o.taille || [6, 5])[0], p: (o.taille || [6, 5])[1], h: 4.5 }), angle: o => -(o.rot || 0),
      murs: o => ervane() && dansAmarre(o.u, o.v) },
    four: { modele: (o, T) => (!ervane() && ((T && T.objets) || []).some(x => x.sorte === 'enclume' && Math.hypot(x.u - o.u, x.v - o.v) < 9) ? 'at-forge' : 'mu-four'), taille: () => ({ l: 2.6, p: 2.6, h: 3 }), angle: o => -(o.rot || 0) },
    mannequin: { modele: () => (!ervane() ? 'at-mannequin' : null), taille: () => ({ l: 1.4, p: 1.2, h: 2.1 }), angle: o => -(o.rot || 0) },
    terrier: { modele: 'mu-terrier', taille: () => ({ l: 3.6, p: 3.6, h: 9 }), enfonce: () => 0.12, angle: o => -(o.rot || 0) },
    arche_brisee: { modele: o => (dansAmarre(o.u, o.v) ? 'a-arcade' : null), taille: () => ({ l: 4.6, p: 4.6, h: 3.6 }), angle: o => -(o.rot || 0) },
    tente: { modele: () => (ICI && ICI.id === 'kaldum' ? 'k-tente' : 'a-tente'), taille: o => ({ l: (o.taille || [3, 3])[0] + 0.4, p: (o.taille || [3, 3])[1] + 0.4, h: 3 }), angle: o => -(o.rot || 0) },
    feu: { modele: () => (ICI && ICI.id === 'kaldum' ? 'k-brasero' : 'a-feu'), taille: () => (ICI && ICI.id === 'kaldum' ? { l: 1.8, p: 1.8, h: 2.2 } : { l: 2.2, p: 2.2, h: 9 }) },
    enclume: { modele: () => (!ervane() ? 'at-enclume' : null), taille: () => ({ l: 1.5, p: 1.5, h: 1.45 }), angle: o => -(o.rot || 0) },
    alambic: { modele: () => (!ervane() ? 'at-alambic' : null), taille: () => ({ l: 2.25, p: 1.75, h: 2.1 }), angle: o => -(o.rot || 0) },
    etabli: { modele: () => (!ervane() ? 'at-etabli' : null), taille: () => ({ l: 2.6, p: 1.5, h: 1.9 }), angle: o => -(o.rot || 0) },
    metier_tisser: { modele: () => (!ervane() ? 'at-metier' : null), taille: () => ({ l: 2.4, p: 2, h: 2.4 }), angle: o => -(o.rot || 0) },
    plateforme: { modele: 'a-ancre', taille: () => ({ l: 1.8, p: 1.8, h: 1.4 }), decalage: [1, -3] },
  };
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
      if (d.murs && d.murs(o)) {
        const [l, p] = o.taille || [6, 5], r = o.rot || 0, c = Math.cos(r), s = Math.sin(r), km = 3.4 / M.hauteur;
        for (const [lx, lz, da, long] of [[0, p / 2, 0, l], [0, -p / 2, Math.PI, l], [l / 2, 0, Math.PI / 2, p], [-l / 2, 0, -Math.PI / 2, p]]) {
          const u = o.u + lx * c - lz * s, v = o.v + lx * s + lz * c, y = hauteur(u, v);
          out.push({ nom, x: u, y: (Number.isFinite(y) ? y - 0.1 : 0), z: v, a: -r + da, k: km, kx: (long + 0.5) / (M.largeur * km) });
        }
        continue;
      }
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
        if (c === '#' && typeof IleDecor === 'object' && IleDecor.caseBloc && IleDecor.caseBloc(T, a, X, Y)) continue;
        const table = OBSTACLES[c], choix = table[a.style] || table.defaut;
        const nom = choix[0] === 'rocher2' && volcan() && S.modeles['k-roche'] ? 'k-roche' : choix[0] === 'souche' && volcan() && S.modeles['k-souche'] ? 'k-souche'
          : choix[0] === 'rocher2' && montagne(X + 0.5, Y + 0.5) && S.modeles['o-roche'] ? 'o-roche' : choix[0], M = S.modeles[nom];
        if (!M) continue;
        const u = X + 0.5, v = Y + 0.5, y = hauteur(u, v);
        if (!Number.isFinite(y)) continue;
        const r1 = hacheEntier(X, Y, 909), r2 = hacheEntier(X, Y, 910), r3 = hacheEntier(X, Y, 911);
        const h = choix[1] * (0.9 + 0.2 * r3);
        const k = Math.min(h / M.hauteur, 1.0 / Math.max(0.01, Math.max(M.largeur, M.profondeur)));
        let angle = r1 * Math.PI * 2, kx;
        if (nom === 'mu-muret') {
          const hor = est.get((X - 1) + ',' + Y) === '#' || est.get((X + 1) + ',' + Y) === '#';
          const vert = est.get(X + ',' + (Y - 1)) === '#' || est.get(X + ',' + (Y + 1)) === '#';
          angle = hor || !vert ? 0 : Math.PI / 2;
          kx = 1.02 / (M.largeur * k);
        }
        out.push(Object.assign({ nom, x: u + (r1 - 0.5) * 0.1, y: y - 0.04, z: v + (r2 - 0.5) * 0.1, a: angle, k }, kx && kx > 1.02 ? { kx } : {}));
      }
    }
  }

  const CULTURES = {
    potager: { sillon: 1.1 },
    ble: { sillon: 0.6, carte: 'ble', hauteurs: [0.85, 1.1], pas: 0.4, moisson: 0.22 },
    lin: { sillon: 0.62, carte: 'lin', hauteurs: [0.7, 0.92], pas: 0.34, fond: 'herbe', partFond: 0.5 },
  };
  const MARGE_PARCELLE = 0.55;
  const parcelles = T => ((T && T.objets) || []).filter(o => o.sorte === 'parcelle' && CULTURES[o.culture]);
  function repere(o) {
    const r = o.rot || 0, c = Math.cos(r), s = Math.sin(r), [L, P] = o.taille || [8, 6];
    return { L, P, r, c, s, monde: (x, y) => [o.u + x * c - y * s, o.v + x * s + y * c] };
  }
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
      if (B) for (const [x0, y0, x1, y1] of [[-L / 2, -P / 2, L / 2, -P / 2], [L / 2, -P / 2, L / 2, P / 2], [L / 2, P / 2, -L / 2, P / 2], [-L / 2, P / 2, -L / 2, -P / 2]]) {
        const lg = Math.hypot(x1 - x0, y1 - y0), n = Math.max(1, Math.round(lg / 3)), h = 1.05, k = h / B.hauteur;
        for (let q = 0; q < n; q++) {
          const [ax, az] = R.monde(x0 + (x1 - x0) * q / n, y0 + (y1 - y0) * q / n), [bx, bz] = R.monde(x0 + (x1 - x0) * (q + 1) / n, y0 + (y1 - y0) * (q + 1) / n);
          poser('s-barriere', (ax + bx) / 2, (az + bz) / 2, Math.atan2(-(bz - az), bx - ax), h, Math.hypot(bx - ax, bz - az) * 1.02 / (B.largeur * k));
        }
      }
      const ys = rangs(o), xMax = L / 2 - MARGE_PARCELLE;
      if (o.culture === 'potager') {
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

  const DENSE = {
    ervane_mailles: [['arbre', 0.03, [3.0, 4.2], ['jt-ambre', 'jt-ambre', 'jt-vert']], ['buisson', 0.02, [0.9, 1.3], ['v-buisson']],
      ['arbuste', 0.02, [0.55, 0.8], ['v-fleurs-blanc', 'v-fleurs-lavande']], ['rocher', 0.004, [0.7, 1.0], ['v-rochers']]],
    ervane_sources: [['arbre', 0.025, [3.0, 4.4], ['jt-vert', 'jt-vert', 'jt-ambre']], ['buisson', 0.018, [0.9, 1.4], ['v-buisson']],
      ['arbuste', 0.014, [0.55, 0.8], ['v-fleurs-blanc']], ['rocher', 0.006, [0.8, 1.2], ['v-rochers']], ['amanite', 0.004, [0.45, 0.6], ['v-amanites']]],
    ervane_murets: [['arbre', 0.018, [2.8, 4.0], ['jt-rouille', 'jt-rouille', 'jt-ambre']], ['buisson', 0.014, [0.9, 1.3], ['v-buisson']],
      ['arbuste', 0.01, [0.55, 0.75], ['v-fleurs-lavande']], ['rocher', 0.012, [0.8, 1.3], ['v-rochers']]],
    ervane_amarre: [['arbre', 0.008, [2.8, 3.8], ['jt-rouille']], ['buisson', 0.01, [0.8, 1.2], ['v-buisson']], ['rocher', 0.012, [0.8, 1.3], ['v-rochers']]],
    ervane_bois: [['amanite', 0.025, [0.45, 0.65], ['v-amanites']], ['buisson', 0.006, [0.9, 1.2], ['v-buisson']]],
    orsane_cimes: [['buisson', 0.005, [0.9, 1.2], ['v-buisson']], ['arbuste', 0.006, [0.55, 0.75], ['v-fleurs-blanc', 'v-fleurs-lavande']]],
    orsane_clairieres: [['arbre', 0.009, [3.0, 4.4], ['jt-ambre', 'jt-ambre', 'jt-vert']], ['buisson', 0.008, [0.9, 1.4], ['v-buisson']],
      ['arbuste', 0.006, [0.55, 0.8], ['v-fleurs-blanc', 'v-fleurs-blanc', 'v-fleurs-lavande']], ['rocher', 0.003, [0.8, 1.2], ['v-rochers']], ['amanite', 0.002, [0.45, 0.6], ['v-amanites']]],
    orsane_sentiers: [['arbre', 0.004, [2.8, 4.0], ['jt-ambre', 'jt-rouille']], ['buisson', 0.006, [0.8, 1.2], ['o-buisson']], ['rocher', 0.008, [0.8, 1.3], ['o-roche']]],
    orsane_toiles: [['amanite', 0.008, [0.45, 0.65], ['v-amanites']], ['buisson', 0.004, [0.9, 1.2], ['v-buisson']], ['rocher', 0.003, [0.8, 1.1], ['v-rochers']]],
    orsane_eboulis: [['arbre', 0.002, [2.8, 3.8], ['jt-rouille']], ['buisson', 0.004, [0.7, 1.1], ['o-buisson']], ['rocher', 0.011, [0.8, 1.4], ['o-roche']], ['rocher', 0.0025, [1.8, 2.9], ['o-roche']]],
    kaldum_ville: [['buisson', 0.003, [0.8, 1.1], ['k-buisson']], ['rocher', 0.002, [0.7, 1.0], ['k-roche']]],
    kaldum_galeries: [['arbre', 0.0015, [2.6, 3.6], ['k-arbre']], ['rocher', 0.012, [0.8, 1.5], ['k-roche']], ['souche', 0.002, [0.6, 0.9], ['k-souche']]],
    kaldum_vapeurs: [['rocher', 0.008, [0.8, 1.3], ['k-roche']], ['buisson', 0.002, [0.8, 1.1], ['k-buisson']], ['fumerolle', 0.0012, [1.1, 1.7], ['k-fumerolle']]],
    kaldum_fonderie: [['arbre', 0.002, [2.6, 3.6], ['k-arbre']], ['rocher', 0.009, [0.8, 1.4], ['k-roche']], ['cristaux', 0.002, [0.7, 1.1], ['k-cristaux']], ['souche', 0.0015, [0.6, 0.9], ['k-souche']]],
  };
  const CARTES_DENSES = {
    ervane_mailles: [['herbe', 0.3, [0.7, 1.05], 0], ['herbe_sombre', 0.2, [0.85, 1.2]], ['fleurs', 0.05, [0.45, 0.6], 2], ['fleurs_roses', 0.012, [0.8, 1.1]], ['fleurs_creme', 0.012, [0.8, 1.1]], ['jonquilles', 0.015, [0.7, 0.95]]],
    ervane_sources: [['herbe', 0.4, [0.75, 1.15], 0], ['herbe_sombre', 0.3, [0.9, 1.25]], ['fleurs', 0.07, [0.45, 0.62], 2], ['herbe_fine', 0.12, [1.0, 1.4]], ['jonquilles', 0.03, [0.7, 0.95]]],
    ervane_murets: [['doree', 0.55, [0.75, 1.1], 1], ['herbe', 0.15, [0.7, 1.0], 0], ['lavande', 0.08, [0.8, 1.1]], ['succulente', 0.012, [0.75, 1.05]]],
    ervane_amarre: [['doree', 0.3, [0.7, 1.0], 1], ['herbe', 0.12, [0.7, 1.0], 0], ['herbe_fine', 0.08, [1.0, 1.35]], ['marine', 0.02, [0.75, 1.05]]],
    ervane_bois: [['herbe', 0.3, [0.7, 1.05], 0], ['herbe_sombre', 0.35, [0.85, 1.25]], ['spore', 0.01, [1.0, 1.4]]],
    orsane_cimes: [['herbe', 0.15, [0.7, 1.0], 0], ['herbe_sombre', 0.1, [0.85, 1.2]], ['fleurs', 0.04, [0.45, 0.6], 2], ['lavande', 0.03, [0.8, 1.1]]],
    orsane_clairieres: [['herbe', 0.3, [0.75, 1.15], 0], ['herbe_sombre', 0.2, [0.9, 1.25]], ['fleurs', 0.05, [0.45, 0.62], 2], ['jonquilles', 0.02, [0.7, 0.95]], ['fleurs_roses', 0.008, [0.8, 1.1]], ['herbe_fine', 0.05, [1.0, 1.4]]],
    orsane_sentiers: [['doree', 0.35, [0.75, 1.1], 1], ['herbe', 0.12, [0.7, 1.0], 0], ['herbe_fine', 0.05, [1.0, 1.35]]],
    orsane_toiles: [['herbe', 0.2, [0.7, 1.0], 0], ['herbe_sombre', 0.25, [0.85, 1.25]], ['spore', 0.008, [1.0, 1.4]]],
    orsane_eboulis: [['doree', 0.25, [0.7, 1.0], 1], ['herbe', 0.08, [0.7, 1.0], 0], ['succulente', 0.02, [0.75, 1.05]]],
    kaldum_ville: [['herbe', 0.12, [0.7, 1.0], 0]],
    kaldum_galeries: [['doree', 0.12, [0.7, 1.0], 1], ['herbe', 0.05, [0.7, 0.95], 0]],
    kaldum_vapeurs: [['doree', 0.2, [0.7, 1.05], 1], ['herbe', 0.06, [0.7, 1.0], 0], ['succulente', 0.008, [0.75, 1.05]]],
    kaldum_fonderie: [['doree', 0.1, [0.7, 1.0], 1]],
  };
  const SOLS_CARTES = {
    herbe: [0, 1, 5], doree: [1, 0, 2], fleurs: [0, 5],
    herbe_sombre: [5, 0, 1], herbe_fine: [0, 1, 5], lavande: [1, 0], jonquilles: [0, 5], fleurs_roses: [0], fleurs_creme: [0],
    spore: [5, 0], marine: [2, 3, 0, 1], succulente: [3, 4, 2, 1],
  };
  function hacheEntier(a, b, c) { let h = (a * 374761393 + b * 668265263 + c * 2147483647) | 0; h = Math.imul(h ^ (h >>> 13), 1274126177); return ((h ^ (h >>> 16)) >>> 0) / 4294967296; }
  function bruitValeur(x, y, graine) {
    const x0 = Math.floor(x), y0 = Math.floor(y), fx = x - x0, fy = y - y0, sx = fx * fx * (3 - 2 * fx), sy = fy * fy * (3 - 2 * fy);
    const a = hacheEntier(x0, y0, graine), b = hacheEntier(x0 + 1, y0, graine), c = hacheEntier(x0, y0 + 1, graine), d = hacheEntier(x0 + 1, y0 + 1, graine);
    return (a * (1 - sx) + b * sx) * (1 - sy) + (c * (1 - sx) + d * sx) * sy;
  }
  function libresDenses(T) {
    if (T._libresDenses) return T._libresDenses;
    const FX = T.FX, FY = T.FY, L = new Uint8Array(FX * FY);
    for (let i = 0; i < FX * FY; i++) L[i] = T.videF && T.videF[i] ? 0 : 2;
    const marquer = (u, v, r, val) => {
      const i0 = Math.max(0, Math.floor((u - r) * 2)), i1 = Math.min(FX - 1, Math.ceil((u + r) * 2)), j0 = Math.max(0, Math.floor((v - r) * 2)), j1 = Math.min(FY - 1, Math.ceil((v + r) * 2));
      for (let j = j0; j <= j1; j++) for (let i = i0; i <= i1; i++) { const x = 0.25 + i * 0.5 - u, y = 0.25 + j * 0.5 - v; if (x * x + y * y <= r * r) L[j * FX + i] = Math.min(L[j * FX + i], val); }
    };
    const marquerRect = (f, m) => {
      const R = Math.hypot(f.l, f.p) + m;
      const i0 = Math.max(0, Math.floor((f.u - R) * 2)), i1 = Math.min(FX - 1, Math.ceil((f.u + R) * 2)), j0 = Math.max(0, Math.floor((f.v - R) * 2)), j1 = Math.min(FY - 1, Math.ceil((f.v + R) * 2));
      for (let j = j0; j <= j1; j++) for (let i = i0; i <= i1; i++) {
        const x = 0.25 + i * 0.5 - f.u, y = 0.25 + j * 0.5 - f.v, a = x * f.c + y * f.s, b = -x * f.s + y * f.c;
        if (Math.abs(a) < f.l + m && Math.abs(b) < f.p + m) L[j * FX + i] = 0;
      }
    };
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
      const g = bruitValeur(u / 9, v / 9, graine) * 0.7 + bruitValeur(u / 3.5, v / 3.5, graine + 7) * 0.3;
      const amas = (0.3 + Math.max(0, (g - 0.4) * 2.4)) * (c === 1 && marge < 2 ? 1.8 : 1);
      let acc = 0;
      const fs = T.facteurSemis > 0 ? T.facteurSemis : 1;
      for (const regle of rg) {
        const [genre, densite, haut] = regle;
        if (regle.sols && !regle.sols.includes(T.sol ? T.sol[k] : 0)) { continue; }
        acc += densite * pas * pas * amas * fs;
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

  const BORDS = {
    pas: 20, racines: 6.5, cristaux: 2.4,
    loin: [[20, 77], [20, 107], [134, 18.5], [118, 21.5], [12, 158], [8, 150], [121, 2], [92, 172], [167.5, 93.5]],
    ilots: [[60, -20, 2, 8], [150, -24, 6, 9], [215, -16, -2, 7], [-22, 58, 4, 8], [-20, 140, -4, 7], [258, 70, 3, 8], [258, 150, -5, 9], [120, 194, -3, 8], [40, 192, 4, 7]],
    pont: { hauteur: 1.4, tablier: 0.2 },
  };
  const BORDS_ORSANE = { loin: [[220, 141], [289, 92], [372, 56], [404, 56], [388, 40]], ilots: [[-24, 150, 3, 9], [462, 130, -2, 8], [230, 352, -4, 9], [110, -26, 4, 7], [400, -24, 2, 8], [470, 280, 0, 7], [-20, 270, -3, 8]] };
  const BORDS_KALDUM = { loin: [[54, 102], [224, 274], [236, 272], [397, 104], [397, 112]], ilots: [[0, 172, 2, 8], [424, 150, -3, 9], [150, 270, 4, 8], [300, 8, -2, 7], [30, 268, 3, 7]] };
  function posesBords(S, T, hauteur, out) {
    const ICIB = T && T.id && T.id !== 'ervane' ? Object.assign({}, BORDS, T.id === 'orsane' ? BORDS_ORSANE : T.id === 'kaldum' ? BORDS_KALDUM : { loin: [], ilots: [] }) : BORDS;
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
  function hacheSimple(x, z) { const s = Math.sin(x * 12.9898 + z * 78.233) * 43758.5453; return s - Math.floor(s); }

  const LIGNES = {
    muret: { modele: 'mu-muret', hauteur: l => (l.hauteur || 1) * 1.1, si: l => l.id !== 'muret_des_mailles' },
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
          const a = Math.atan2(-(z1 - z0), x1 - x0) + (d.retourne && q === 0 ? Math.PI : 0);
          out.push({ nom: d.modele, x, y: (Number.isFinite(y) ? y - 0.08 : 0), z, a, k, kx: Math.hypot(x1 - x0, z1 - z0) * 1.04 / (M.largeur * k) });
        }
      }
    }
  }

  function imageDe(G, bin, idx) {
    const t = (G.textures || [])[idx], im = t && (G.images || [])[t.source];
    if (!im || im.bufferView == null) return Promise.resolve(null);
    const bv = G.bufferViews[im.bufferView];
    const blob = new Blob([new Uint8Array(bin, bv.byteOffset || 0, bv.byteLength)], { type: im.mimeType || 'image/jpeg' });
    if (typeof createImageBitmap === 'function') return createImageBitmap(blob);
    return new Promise((ok, ko) => { const i = new Image(), u = URL.createObjectURL(blob); i.onload = () => { URL.revokeObjectURL(u); ok(i); }; i.onerror = ko; i.src = u; });
  }

  const CASES_CARTES = {
    herbe: 0, doree: 1, fleurs: 2, lin: 3, ble: 4,
    herbe_sombre: 5, herbe_fine: 6, lavande: 7, jonquilles: 8, fleurs_roses: 9, fleurs_creme: 10, spore: 11, marine: 12, succulente: 13, lotus: 14,
  };
  const LIGNES_CARTES = 4;
  const ZONES_NENUPHARS = { ervane_sources: 0.35, ervane_bois: 0.2, ervane_amarre: 0.2, orsane_clairieres: 0.2 };
  function nenuphars(T) {
    const out = [];
    if (!T || !T.eauA || !T.zoneA) return out;
    const pas = 1.3;
    for (let gv = 0; gv * pas < T.H; gv++) for (let gu = 0; gu * pas < T.W; gu++) {
      const u = (gu + hacheEntier(gu, gv, 5101)) * pas, v = (gv + hacheEntier(gu, gv, 5102)) * pas;
      const part = ZONES_NENUPHARS[T.zoneA(u, v)];
      if (!part) continue;
      const e = T.eauA(u, v), p = T.profondeurA(u, v);
      if (e == null || !(p > 0.15 && p < 1.4)) continue;
      if ([[0.45, 0], [-0.45, 0], [0, 0.45], [0, -0.45]].some(([du, dv]) => !(T.profondeurA(u + du, v + dv) > 0.05))) continue;
      const g = bruitValeur(u / 6, v / 6, 5103);
      if (hacheEntier(gu, gv, 5104) > part * (0.3 + Math.max(0, (g - 0.35) * 3))) continue;
      out.push({ genre: 'lotus', u, v, y: e + 0.015, h: 0.85 + hacheEntier(gu, gv, 5105) * 0.6, r: hacheEntier(gu, gv, 5106), plat: true });
    }
    return out;
  }
  const VENT = { value: 0 };
  async function cartes(THREE, ile) {
    const T = ile && ile.T;
    ici(T);
    if (!T || !T.FX || !ile.monde) return null;
    for (const rg of Object.values(CARTES_DENSES)) for (const r of rg) r.sols = SOLS_CARTES[r[0]];
    const pts = semerDense(T, CARTES_DENSES, 0.9, 1, 777).concat(cartesParcelles(T), nenuphars(T));
    if (!pts.length) return null;
    const tel = !!ile.telephone;
    const tex = await new Promise((ok, ko) => new THREE.TextureLoader().load(source(tel ? 'assets/decor/cartes-tel.png' : 'assets/decor/cartes.png'), ok, undefined, ko));
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
      const y = p.plat ? p.y : ile.hauteur(p.u, p.v);
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
        const u0 = ((c % 4) * 256 + 3) / 1024, u1 = ((c % 4 + 1) * 256 - 3) / 1024, ligne = Math.floor(c / 4), dl = 1 / LIGNES_CARTES;
        const vHaut = 1 - ligne * dl - 0.0025, vBas = 1 - (ligne + 1) * dl + 0.0025;
        for (let f = 0; f < 2; f++) {
          const ca = Math.cos(a + f * Math.PI / 2) * w / 2, sa = Math.sin(a + f * Math.PI / 2) * w / 2, b = q * 8 + f * 4;
          const r2 = h / 2, ex = Math.cos(a) * r2, ez = Math.sin(a) * r2;
          const coins = p.plat
            ? (f ? [[0, 0, 0, u0, 0, 0], [0, 0, 0, u0, 0, 0], [0, 0, 0, u0, 0, 0], [0, 0, 0, u0, 0, 0]]
              : [[-ex - ez, 0, -ez + ex, u0, 0, 0], [ex - ez, 0, ez + ex, u1, 0, 0], [ex + ez, 0, ez - ex, u1, 1, 0], [-ex + ez, 0, -ez - ex, u0, 1, 0]])
            : [[-ca, -0.04, -sa, u0, 0, 0], [ca, -0.04, sa, u1, 0, 0], [ca, h, sa, u1, 1, 1], [-ca, h, -sa, u0, 1, 1]];
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
    return { meshes, mat, n, octetsGeo: octets, octetsTex: (tel ? 512 * 512 : 1024 * 1024) * 4 * 4 / 3 };
  }

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
        const k = M ? Math.min(t.l / M.largeur, t.p / M.profondeur, t.h / M.hauteur) : 1, h = M ? M.hauteur * k : (o.hauteur || (o.service ? 5.4 : 4.8)) + 0.6;
        const r = o.rot || 0, dx = M ? t.l * 0.22 : t.l / 2 - 0.9;
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

  function etcLu(renderer) {
    try { return !!(renderer && renderer.extensions && renderer.extensions.has('WEBGL_compressed_texture_etc')); } catch (e) { return false; }
  }
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
  async function atlasEtc(THREE) {
    const d = JSON.parse(new TextDecoder().decode(await IleGlb.octets(source('assets/decor/atlas/semis.json')))), cases = d.cases || {};
    const memes = JSON.stringify(d.atlas) === JSON.stringify(ATLAS) && Object.keys(cases).length === Object.keys(SEMIS).length
      && Object.entries(SEMIS).every(([nom, s]) => { const c = cases[nom]; return c && c[0] === (s.atlas || 0) && c.slice(1, 4).join() === s.case.join(); });
    if (!memes) { console.warn('Ervane : atlas ETC2 périmés (tools/meshy/atlas-etc.py), toiles peintes'); return null; }
    const tx = await Promise.all(ATLAS.map((_, k) => lireKtx(THREE, source('assets/decor/atlas/semis-' + k + '.ktx'))));
    if (tx.some((t, k) => t.tex.image.width !== ATLAS[k][0] || t.tex.image.height !== ATLAS[k][1])) return null;
    return tx;
  }

  async function chargerSemis(THREE, renderer) {
    let etc = null;
    if (etcLu(renderer)) { try { etc = await atlasEtc(THREE); } catch (e) { console.warn('Ervane : atlas ETC2 illisibles, toiles peintes', e); etc = null; } }
    const toiles = etc ? null : ATLAS.map(([l, h]) => { const c = document.createElement('canvas'); c.width = l; c.height = h; const x = c.getContext('2d'); x.fillStyle = '#3a4a3a'; x.fillRect(0, 0, l, h); return { c, x, l, h }; });
    const modeles = {}, manquants = [];
    let geo = 0;
    await Promise.all(Object.entries(SEMIS).map(async ([nom, d]) => {
      let G, bin;
      try { ({ json: G, bin } = await IleGlb.lire(source('assets/decor/' + nom + '-semis.glb'))); } catch (e) { manquants.push(nom); return; }
      const prim = G.meshes[0].primitives[0], at = prim.attributes;
      const pos = accesseur(G, bin, at.POSITION).array, nrm = accesseur(G, bin, at.NORMAL).array, uv0 = accesseur(G, bin, at.TEXCOORD_0).array;
      const idx = accesseur(G, bin, prim.indices).array;
      const [al, ah] = ATLAS[d.atlas || 0], [x0, y0, c] = d.case, uv = new Float32Array(uv0.length);
      for (let i = 0; i < uv0.length; i += 2) {
        uv[i] = (x0 + 1 + Math.min(1, Math.max(0, uv0[i])) * (c - 2)) / al;
        uv[i + 1] = (y0 + 1 + Math.min(1, Math.max(0, uv0[i + 1])) * (c - 2)) / ah;
      }
      let h = 0, lx = 0, lz = 0;
      for (let i = 0; i < pos.length; i += 3) { h = Math.max(h, pos[i + 1]); lx = Math.max(lx, Math.abs(pos[i])); lz = Math.max(lz, Math.abs(pos[i + 2])); }
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
    if (!Object.keys(modeles).length) throw new Error('aucun modèle du semis n\'a pu être lu');
    if (manquants.length) console.warn('Ervane : ' + manquants.length + ' modèle(s) du semis absent(s), le reste est semé : ' + manquants.join(', '));
    return { modeles, manquants, mat: mats[0], mats, formes: FORMES, genres: GENRES, etc: !!etc, octets: { tex, geo }, sombre: (x, z) => dansBois(x, z) };
  }

  const SOLS = {
    herbe: { pas: 6, moyenne: [0.2304, 0.6006, 0.0767] }, foret: { pas: 6, moyenne: [0.0543, 0.0648, 0.0175] },
    chemin: { pas: 5, moyenne: [0.5536, 0.3036, 0.1161] }, roche: { pas: 7, moyenne: [0.2214, 0.1974, 0.1531] },
    dalles: { pas: 9, moyenne: [0.5818, 0.4363, 0.2154] }, paves: { pas: 4.5, moyenne: [0.4429, 0.4041, 0.2351] },
    'z-mailles': { pas: 6, moyenne: [0.2104, 0.3778, 0.0569] }, 'z-sources': { pas: 6, moyenne: [0.1894, 0.5814, 0.3006] },
    'z-murets': { pas: 6, moyenne: [0.5452, 0.2876, 0.0531] }, 'z-bois': { pas: 6, moyenne: [0.0902, 0.0737, 0.0114] },
    'z-amarre': { pas: 6, moyenne: [0.2012, 0.2542, 0.1946] },
    'z-cimes': { pas: 6, moyenne: [0.1565, 0.5358, 0.0545] },
    'z-clairieres': { pas: 6, moyenne: [0.3115, 0.3306, 0.1033] },
    'z-eboulis': { pas: 6, moyenne: [0.3976, 0.3374, 0.2523] },
    'z-kville': { pas: 6, moyenne: [0.0273, 0.0219, 0.0171] },
    'z-vapeurs': { pas: 6, moyenne: [0.7927, 0.6418, 0.3381] },
    'z-sentiers': { pas: 6, moyenne: [0.4198, 0.2737, 0.0558] },
    'z-toiles': { pas: 6, moyenne: [0.0533, 0.07, 0.1249] },
    'z-galeries': { pas: 6, moyenne: [0.0743, 0.0398, 0.022] },
    'z-fonderie': { pas: 6, moyenne: [0.0368, 0.0202, 0.0214] },
    'm-mur-cimes': { pas: 3.2, rapport: 0.737, moyenne: [0.7504, 0.589, 0.3993] }, 'm-toit-ardoise': { pas: 4.2, rapport: 0.777, moyenne: [0.0606, 0.1209, 0.1511] },
    'm-mur-basalte': { pas: 5.4, rapport: 0.758, moyenne: [0.0555, 0.0454, 0.0393] }, 'm-bois-planches': { pas: 2.6, rapport: 0.792, moyenne: [0.3475, 0.1346, 0.0363] },
  };
  const ZONES_SOL = {
    ervane_mailles: 'z-mailles', ervane_sources: 'z-sources', ervane_murets: 'z-murets', ervane_bois: 'z-bois', ervane_amarre: 'z-amarre',
    orsane_cimes: 'z-cimes', orsane_clairieres: 'z-clairieres', orsane_sentiers: 'z-sentiers', orsane_toiles: 'z-toiles', orsane_eboulis: 'z-eboulis',
    kaldum_ville: 'z-kville', kaldum_galeries: 'z-galeries', kaldum_vapeurs: 'z-vapeurs', kaldum_fonderie: 'z-fonderie',
  };
  const NZ = 5;
  function carteZones(THREE, T, zones) {
    const W = T.W, H = T.H, n = Math.min(zones.length, NZ), k = new Float32Array(W * H * 4);
    for (let v = 0; v < H; v++) for (let u = 0; u < W; u++) {
      const z = zones.indexOf(T.zoneA(u + 0.5, v + 0.5));
      if (z >= 0 && z < 4 && z < n) k[(v * W + u) * 4 + z] = 1;
    }
    const flou = (src, horiz) => {
      const out = new Float32Array(src.length), r = 2;
      for (let v = 0; v < H; v++) for (let u = 0; u < W; u++) for (let c = 0; c < 4; c++) {
        let a = 0, m = 0;
        for (let d = -r; d <= r; d++) { const x = horiz ? u + d : u, y = horiz ? v : v + d; if (x < 0 || y < 0 || x >= W || y >= H) continue; a += src[(y * W + x) * 4 + c]; m++; }
        out[(v * W + u) * 4 + c] = a / m;
      }
      return out;
    };
    let f = k;
    for (let p = 0; p < 2; p++) f = flou(flou(f, true), false);
    const data = new Uint8Array(W * H * 4);
    for (let i = 0; i < data.length; i++) data[i] = Math.round(f[i] * 255);
    const t = new THREE.DataTexture(data, W, H, THREE.RGBAFormat, THREE.UnsignedByteType);
    t.magFilter = t.minFilter = THREE.LinearFilter; t.generateMipmaps = false; t.needsUpdate = true;
    return { t, octets: data.length };
  }
  const TYPES_SOL = { vert: [0.1133, 0.2848, 0.11], dalles: [0.7406, 0.7182, 0.6209], terre: [0.3876, 0.3046, 0.1296], roche: [0.3487, 0.3233, 0.3142] };
  const teinteDalles = hex => {
    if (typeof hex !== 'string' || !/^#[0-9a-f]{6}$/i.test(hex)) return [1, 1, 1];
    const c = [1, 3, 5].map(i => Math.pow(parseInt(hex.slice(i, i + 2), 16) / 255, 2.2));
    const l = c[0] * 0.3 + c[1] * 0.59 + c[2] * 0.11;
    return l > 0.001 ? c.map(x => Math.round(x / l * 1e4) / 1e4) : [1, 1, 1];
  };
  const VILLAGES = [[210, 104, 36, 1], [175, 28, 14, 0.7]];
  const VILLAGES_PLATEAU = { ervane: { zone: 'ervane_mailles', centres: VILLAGES }, orsane: { zone: 'orsane_cimes', centres: [[222, 92, 62, 1]] }, kaldum: { zone: 'kaldum_ville', centres: [[190, 96, 52, 1]] } };
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
    const val = d => Math.round(255 * Math.max(0, Math.min(1, 0.5 - d / 3.2)));
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
      const eau = T.eau && T.eau[i] === T.eau[i];
      data[i * 4] = eau ? 0 : val(dS); data[i * 4 + 1] = eau ? 0 : val(dR); data[i * 4 + 3] = eau ? 0 : val(dT);
      const z = T.regionsZone && T.region ? T.regionsZone[T.region[i]] : null;
      vil[i] = z === VIL.zone ? 1 : 0;
      for (const V of VIL.centres) { const d = Math.hypot(u - V[0], v - V[1]); if (d < V[2]) vil[i] = Math.max(vil[i], V[3] * Math.min(1, (V[2] - d) / (V[2] * 0.3))); }
    }
    const flou = (src) => { const out = new Float32Array(W * H); for (let v = 0; v < H; v++) for (let u = 0; u < W; u++) { let s = 0, n = 0; for (let dv = -3; dv <= 3; dv++) for (let du = -3; du <= 3; du++) { const x = u + du, y = v + dv; if (x < 0 || y < 0 || x >= W || y >= H) continue; s += src[y * W + x]; n++; } out[v * W + u] = s / n; } return out; };
    const vf = flou(flou(vil));
    for (let i = 0; i < W * H; i++) data[i * 4 + 2] = Math.round(255 * vf[i]);
    const t = new THREE.DataTexture(data, W, H, THREE.RGBAFormat, THREE.UnsignedByteType);
    t.magFilter = t.minFilter = THREE.LinearFilter;
    t.generateMipmaps = false;
    t.needsUpdate = true;
    return { t, octets: W * H * 4, W, H };
  }
  const MAX_LUMIERES = 24;
  function lumieresSol(T) {
    const out = [];
    for (const o of (T && T.objets) || []) {
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
  const SOIR_SOL = { value: 0 };
  let ileSol = null;
  const MAX_PLACES = 8;
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
      // L'épaule du sentier : de la terre battue (la texture du chemin) sur 1,3 u, bord ondulé.
      float nEp = smoothstep(0.06, 0.19, cm.r + (ond - 0.5) * 0.06) * (1.0 - nSe);
      nP = max(nP, nR);
      nB = max(nB, max(nT, max(nSe, nEp)));
      // Les villages : des plaques de dalles dans l'herbe ; ailleurs, hors des bois, des plaques de terre.
      float vPl = bz.a * 0.75 + bz.r * 0.25 + (ond - 0.5) * 0.14;
      float plaque = smoothstep(0.575, 0.605, vPl) * vil;
      float terre = smoothstep(0.69, 0.72, bz.r * 0.6 + bz.a * 0.4 + (ond - 0.5) * 0.12) * (1.0 - tFor) * (1.0 - vil);
      nV *= 1.0 - max(max(max(nR, nSe), nT), nEp);
      float dP = nV * plaque, dB = nV * terre * (1.0 - plaque);
      float wV = nV - dP - dB;
      float wP = nP * (1.0 - nV) + dP;
      float wB = nB * (1.0 - nV) * (1.0 - nP) + dB;
      // Des îlots d'herbe dans la terre, hors des sentiers et des places.
      float ilot = smoothstep(0.60, 0.63, bz.a * 0.55 + bz.g * 0.45 + (bz.b - 0.5) * 0.1) * (1.0 - nSe) * (1.0 - nT);
      float dV = (wB - dB) * ilot;
      wB -= dV; wV += dV;
      float wG = max(0.0, 1.0 - wV - wP - wB);
      // La couleur du lieu suit les bords nets : la part de classe perdue retire autant de la couleur
      // du lieu, la part gagnée apporte la couleur type de sa classe (l'herbe et la terre mises à la
      // luminosité du lieu, k : 1 pour l'herbe d'Ervane ; l'herbe gagnée à moitié). Ajouter et
      // retrancher les couleurs types telles quelles noircissait une épaule de terre sur la roche
      // (toute la roche retirée) et cernait l'herbe sombre des Toiles d'un liseré vif. La classe
      // résiduelle (roche, le reste des classes douces) ne retire rien quand elle s'efface.
      float k = clamp(lumS / 0.214, 0.45, 1.3);
      float gainV = max(wV - sV, 0.0) * 0.5, gainP = max(wP - sP, 0.0), gainB = max(wB - sB, 0.0), gainG = max(wG - sG, 0.0);
      float perdu = clamp(max(sV - wV, 0.0) + max(sP - wP, 0.0) + max(sB - wB, 0.0), 0.0, 1.0);
      vec3 c = cs * (1.0 - perdu) + gainV * ${v3(TYPES_SOL.vert)} * k + gainP * ${v3(TYPES_SOL.dalles)} * solGainDalles + gainB * ${v3(TYPES_SOL.terre)} * k + gainG * ${v3(TYPES_SOL.roche)};
      float lumC = dot(c, vec3(0.3, 0.59, 0.11));
      #define TEX(s, p) pow(texture2D(s, q / p).rgb, vec3(2.2))
      #define LUM(v) dot(v, vec3(0.3, 0.59, 0.11))
      // L'herbe peinte (tools/sols/meshy_sol.py) : son grain, ses reflets jaune-vert et ses creux bleu-vert à
      // moitié ; la litière de forêt en luminosité seule.
      // L'herbe de la zone (3.46) : la texture de chaque zone, mêlée par la carte des zones.
      vec4 zw = texture2D(solZones, (q + 0.5) / solCarteTaille);
      float z4 = max(0.0, 1.0 - zw.r - zw.g - zw.b - zw.a);
      vec3 gH = vec3(0.0), aZ = vec3(0.0);
      float fZ = 0.0;
      // gH : le grain (comme avant) ; aZ : la couleur propre de la texture, à luminosité 1 ; fZ : la
      // force de la zone (0 pour une zone sans sol propre : son herbe reste celle d'avant).
      // Sans répétition visible (3.58) : l'herbe tirée deux fois, à 6 u et à 7,7 u tournée de 37° et
      // décalée, mêlée par un bruit d'une douzaine d'u (une nappe sur l'autre) ; les traits et les fleurs de l'image
      // ne s'alignent plus en rangées tous les 6 u.
      vec2 qZa = q / 6.0, qZb = mat2(0.8, -0.6, 0.6, 0.8) * q / 7.7 + vec2(0.37, 0.71);
      vec4 bzM = texture2D(solBruit, q / 13.0 + vec2(0.53, 0.29));
      float mZ = smoothstep(0.32, 0.68, bzM.a * 0.6 + bzM.g * 0.4);
      #define TEXZ(s) pow(mix(texture2D(s, qZa).rgb, texture2D(s, qZb).rgb, mZ), vec3(2.2))
      #define GZ(s, m, f) { vec3 tz = TEXZ(s); gH += mix(vec3(LUM(tz) / LUM(m)), tz / max(m, vec3(0.02)), 0.5) * w; aZ += tz / max(LUM(m), 0.01) * w * f; fZ += w * f; }
      { float w = zw.r; if (w > 0.002) GZ(solZ0, moyZ0, solForceZ[0]) }
      { float w = zw.g; if (w > 0.002) GZ(solZ1, moyZ1, solForceZ[1]) }
      { float w = zw.b; if (w > 0.002) GZ(solZ2, moyZ2, solForceZ[2]) }
      { float w = zw.a; if (w > 0.002) GZ(solZ3, moyZ3, solForceZ[3]) }
      { float w = z4; if (w > 0.002) GZ(solZ4, moyZ4, solForceZ[4]) }
      aZ /= max(fZ, 0.001);
      // Des nappes de teinte sur une vingtaine d'u : l'herbe tire tantôt vers le jaune-vert, tantôt
      // vers le bleu-vert (environ 10 %), comme une prairie au soleil (3.58).
      vec4 bzL = texture2D(solBruit, q / 19.0 + vec2(0.31, 0.17));
      aZ *= mix(vec3(1.1, 1.06, 0.84), vec3(0.92, 0.98, 1.08), smoothstep(0.25, 0.75, bzL.g));
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
          // Le pavage irrégulier (3.43) se pose à plat : enroulé autour du centre, il tournait en
          // tourbillon vers le relais et s'étirait au bord. La place garde son liseré clair.
          anneau = smoothstep(P.z - 1.1, P.z - 0.7, d) * (1.0 - smoothstep(P.z - 0.35, P.z, d));
        }
      }
      // Les dalles gardent 40 % de leur propre couleur (le miel des dalles peintes) ; le reste suit la
      // teinte des dalles du plateau.
      vec3 tD = pow(texture2D(solDalles, qd / ${SOLS.dalles.pas.toFixed(1)}).rgb, vec3(2.2));
      vec3 dalle = mix(vec3(LUM(tD)), tD, 0.4) / LUM(moyDalles) * lumC * 0.82 * solTeinteDalles;
      dalle *= 1.0 + 0.35 * anneau;
      float fP = smoothstep(0.5, 0.7, cP + (0.5 - ond) * 0.7) * (1.0 - nV) + nV * smoothstep(0.605, 0.66, vPl) * vil;
      dalle *= 1.0 - 0.28 * clamp(1.0 - fP / max(wP, 0.001), 0.0, 1.0);
      float wS = wB * nSe;
      // Le sol naturel de chaque zone prend la couleur peinte de sa texture (à la luminosité du lieu),
      // pas seulement son grain : l'herbe (65 %), la terre nue hors des sentiers et des places (55 %),
      // la roche à plat (45 %). Chaque zone a sa teinte ; les sentiers, les dalles,
      // les pavés et les pentes gardent les leurs.
      vec3 nat = aZ * lumC * 1.05;
      float natB = max(0.0, (wB - wS) * (1.0 - max(nEp, nT)));
      vec3 col = wV * mix(c * gV, nat, 0.65 * fZ) + natB * mix(c * gB, nat, 0.55 * fZ) + c * ((wB - wS - natB) * gB)
        + wG * mix(c * gG, nat, 0.45 * fZ) + wP * dalle + wS * pave * lumC * 0.95;
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
      // Les ombres de contact du décor (3.48) : sous les arbres, au pied des maisons, des rochers et
      // des murets, portées vers l'est ; plus douces la nuit, où la lune les efface.
      col *= 1.0 - solOmbreForce * texture2D(solOmbres, vMonde.xz / solOmbresTaille).r * (1.0 - 0.6 * solNuit);
      // Les pentes raides : la roche, projetée de côté (sur le plan le plus face à la pente).
      vec3 nS = normalize(vNormaleMonde);
      vec2 qc = abs(nS.x) > abs(nS.z) ? vMonde.zy : vMonde.xy;
      vec3 tRs = pow(texture2D(solRoche, qc / ${SOLS.roche.pas.toFixed(1)}).rgb, vec3(2.2));
      vec3 gRs = mix(vec3(1.0), clamp(mix(vec3(LUM(tRs) / LUM(moyRoche)), tRs / max(moyRoche, vec3(0.02)), 0.3), 0.0, 2.5), 0.75);
      col = mix(cs * gRs, col, smoothstep(0.5, 0.78, abs(nS.y)));
      // L'ambiance du soir (3.62) : l'herbe plus franche et plus profonde, tirée du vert pâle vers un
      // vert-jaune (moins de bleu) ; ce qui n'est pas vert (chemins, dalles, roche, terre) ne bouge pas.
      if (solSoir > 0.0) {
        float lv = LUM(col), part = smoothstep(0.0, 0.06, col.g - max(col.r, col.b) * 0.9);
        vec3 vert = max(mix(vec3(lv), col, 1.35), 0.0) * vec3(0.8, 1.0, 0.8) * 0.8;
        col = mix(col, vert, part * solSoir);
      }
      diffuseColor.rgb = diffuse * col;
    }`;
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
  async function habillerSol(THREE, ile) {
    if (!ile || !ile.monde) return 0;
    const mats = new Set();
    for (const o of ile.monde.children) if (/^mo_sol/.test(o.name) && o.material && o.material.vertexColors) mats.add(o.material);
    if (!mats.size) return 0;
    const noms = ['foret', 'chemin', 'roche', 'dalles', 'paves'], tx = {};
    const etc = etcLu(ile.renderer);
    const zones = ile.T ? [...new Set(ile.T.regionsZone || [])].filter(Boolean).slice(0, NZ) : [];
    const solsZ = Array.from({ length: NZ }, (_, i) => ZONES_SOL[zones[i]] || 'herbe');
    const aCharger = [...new Set(noms.concat(solsZ))];
    await Promise.all(aCharger.map(async n => { tx[n] = await texSol(THREE, n, etc); }));
    ile.solsEtc = aCharger.filter(n => tx[n].t.isCompressedTexture).length;
    ile.solsCharges = aCharger.length;
    const uniforms = {}, cap = n => n[0].toUpperCase() + n.slice(1);
    for (const n of noms) { uniforms['sol' + cap(n)] = { value: tx[n].t }; uniforms['moy' + cap(n)] = { value: tx[n].moyenne }; }
    solsZ.forEach((n, i) => { uniforms['solZ' + i] = { value: tx[n].t }; uniforms['moyZ' + i] = { value: tx[n].moyenne }; });
    uniforms.solForceZ = { value: solsZ.map(n => (n === 'herbe' ? 0 : 1)) };
    const cz = ile.T && zones.length ? carteZones(THREE, ile.T, zones) : null;
    uniforms.solZones = { value: cz ? cz.t : bruitSolZones(THREE) };
    ile.solsZones = solsZ.slice(0, Math.max(zones.length, 1));
    const bz = bruitSol(THREE), carte = ile.T ? carteSol(THREE, ile.T) : null;
    uniforms.solBruit = { value: bz.t };
    uniforms.solCarte = { value: carte ? carte.t : bz.t };
    uniforms.solCarteTaille = { value: new THREE.Vector2(carte ? carte.W : 1, carte ? carte.H : 1) };
    const om = ile.T && typeof ile.peindreOmbresDecor === 'function' ? carteOmbres(THREE, ile) : null;
    uniforms.solOmbres = { value: om ? om.t : sansOmbre(THREE) };
    uniforms.solOmbresTaille = { value: new THREE.Vector2(om ? om.L : 1, om ? om.P : 1) };
    uniforms.solOmbreForce = { value: om ? OMBRE_SOL : 0 };
    ile.solOmbres = om ? { W: om.W, H: om.H, moyenne: om.moyenne, force: uniforms.solOmbreForce } : null;
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
    uniforms.solSoir = SOIR_SOL;
    uniforms.solTemps = VENT;
    const teinte = teinteDalles(ile.def && ile.def.rendu && ile.def.rendu.dalles);
    uniforms.solTeinteDalles = { value: new THREE.Vector3(teinte[0], teinte[1], teinte[2]) };
    ile.solTeinteDalles = teinte;
    const gainD = ile.def && ile.def.rendu && Number.isFinite(ile.def.rendu.dallesGain) ? Math.max(0, Math.min(1, ile.def.rendu.dallesGain)) : 1;
    uniforms.solGainDalles = { value: gainD };
    ileSol = ile;
    const decl = noms.map(n => `uniform sampler2D sol${cap(n)}; uniform vec3 moy${cap(n)};`).join('\n') + Array.from({ length: NZ }, (_, i) => `\nuniform sampler2D solZ${i}; uniform vec3 moyZ${i};`).join('') + `\nuniform float solForceZ[${NZ}]; uniform sampler2D solZones; uniform sampler2D solBruit; uniform sampler2D solCarte; uniform vec2 solCarteTaille; uniform vec3 solPlaces[${MAX_PLACES}]; uniform vec4 solParcelles[${MAX_PARCELLES * 2}]; uniform vec4 solLumieres[${MAX_LUMIERES}]; uniform float solNuit; uniform float solTemps; uniform vec3 solTeinteDalles; uniform float solGainDalles; uniform sampler2D solOmbres; uniform vec2 solOmbresTaille; uniform float solOmbreForce; uniform float solSoir;`;
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
      m.customProgramCacheKey = () => 'sol-meshy-14/' + (cle ? cle.call(m) : '');
      m.needsUpdate = true;
    }
    ile.solCarte = !!carte;
    ile.solCarteTex = carte ? carte.t : null;
    return aCharger.reduce((a, n) => a + tx[n].octets, 0) + bz.octets + (carte ? carte.octets : 0) + (cz ? cz.octets : 0) + (om ? om.octets : 0);
  }
  const OMBRE_SOL = 0.6;
  function carteOmbres(THREE, ile) {
    const T = ile.T, k = 2, W = Math.round(T.largeur * k), H = Math.round(T.hauteur * k);
    const a = ile.peindreOmbresDecor(T);
    if (!a || a.length !== W * H) return null;
    let s = 0; for (let i = 0; i < a.length; i++) s += a[i];
    const d = new Uint8Array(W * H * 4);
    for (let i = 0; i < a.length; i++) d[i * 4] = a[i];
    const t = new THREE.DataTexture(d, W, H, THREE.RGBAFormat, THREE.UnsignedByteType);
    t.magFilter = t.minFilter = THREE.LinearFilter;
    t.generateMipmaps = false;
    t.needsUpdate = true;
    return { t, W, H, L: T.largeur, P: T.hauteur, octets: W * H * 4, moyenne: s / a.length / 255 };
  }
  function sansOmbre(THREE) {
    const t = new THREE.DataTexture(new Uint8Array([0, 0, 0, 0]), 1, 1, THREE.RGBAFormat, THREE.UnsignedByteType);
    t.needsUpdate = true;
    return t;
  }
  const MURS = {
    defaut: [
      { cle: '#f0ead9', tex: 'm-mur-cimes', couleur: 0.8 },
      { cle: '#4b5668', tex: 'm-toit-ardoise', couleur: 0.5 },
      { cle: '#8f6f4d', tex: 'm-bois-planches', couleur: 0.35 },
    ],
    kaldum: [
      { cle: '#6e625a', tex: 'm-mur-basalte', couleur: 0.6 },
      { cle: '#3a3230', tex: 'm-toit-ardoise', couleur: 0 },
      { cle: '#8f6f4d', tex: 'm-bois-planches', couleur: 0.35 },
    ],
  };
  const NM = 3;
  const GLSL_MURS = `
    {
      vec3 kc = vColor.rgb;
      vec3 nM = normalize(vNormaleMur);
      // Le plan de la projection : de dessus pour les faces plates, sinon le plan vertical le plus
      // face à la normale (les rangs restent horizontaux, sur les toits aussi).
      vec2 qM = nM.y > 0.86 ? vMur.xz : (abs(nM.x) > abs(nM.z) ? vec2(vMur.z, vMur.y) : vec2(vMur.x, vMur.y));
      #define MUR(i, tx) { float w = 1.0 - smoothstep(0.003, 0.009, distance(kc, murCle[i])); if (w > 0.0) { vec4 P = murPas[i]; vec3 t = pow(texture2D(tx, vec2(qM.x / P.x, qM.y / (P.x * P.y))).rgb, vec3(2.2)); float l = dot(t, vec3(0.3, 0.55, 0.15)) / max(dot(murMoy[i], vec3(0.3, 0.55, 0.15)), 0.01); vec3 tc = t / max(dot(murMoy[i], vec3(0.3, 0.55, 0.15)), 0.01); diffuseColor.rgb = mix(diffuseColor.rgb, diffuseColor.rgb * mix(vec3(l), tc, murCouleur[i]), w * murForce); } }
      MUR(0, murTex0) MUR(1, murTex1) MUR(2, murTex2)
    }`;
  async function habillerMurs(THREE, ile) {
    if (!ile || !ile.monde || !ile.T) return 0;
    const mats = new Set();
    ile.monde.traverse(o => { if (o.isMesh && o.material && o.material.vertexColors && o.material.name === 'mo_objets_cuits') mats.add(o.material); });
    if (!mats.size) return 0;
    const liste = (MURS[ile.T.id] || MURS.defaut).slice(0, NM);
    const etc = etcLu(ile.renderer), tx = {};
    const noms = [...new Set(liste.map(m => m.tex))];
    await Promise.all(noms.map(async n => { tx[n] = await texSol(THREE, n, etc); }));
    const lin = h => [1, 3, 5].map(i => { const v = parseInt(h.slice(i, i + 2), 16) / 255; return v <= 0.04045 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); });
    const uniforms = {
      murCle: { value: liste.map(m => new THREE.Vector3(...lin(m.cle))) },
      murPas: { value: liste.map(m => new THREE.Vector4(SOLS[m.tex].pas, SOLS[m.tex].rapport || 1, 0, 0)) },
      murMoy: { value: liste.map(m => tx[m.tex].moyenne) },
      murCouleur: { value: liste.map(m => m.couleur) },
      murForce: { value: 1 },
    };
    liste.forEach((m, i) => { uniforms['murTex' + i] = { value: tx[m.tex].t }; });
    const decl = `uniform vec3 murCle[${NM}]; uniform vec4 murPas[${NM}]; uniform vec3 murMoy[${NM}]; uniform float murCouleur[${NM}]; uniform float murForce; uniform sampler2D murTex0; uniform sampler2D murTex1; uniform sampler2D murTex2;`;
    for (const m of mats) {
      const prec = m.onBeforeCompile, cle = Object.prototype.hasOwnProperty.call(m, 'customProgramCacheKey') ? m.customProgramCacheKey : null;
      m.onBeforeCompile = (sh, r) => {
        if (prec) prec(sh, r);
        Object.assign(sh.uniforms, uniforms);
        sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nvarying vec3 vMur; varying vec3 vNormaleMur;')
          .replace('#include <project_vertex>', '#include <project_vertex>\nvMur = (modelMatrix * vec4(transformed, 1.0)).xyz; vNormaleMur = mat3(modelMatrix) * objectNormal;');
        sh.fragmentShader = sh.fragmentShader.replace('#include <common>', '#include <common>\nvarying vec3 vMur; varying vec3 vNormaleMur;\n' + decl)
          .replace('#include <color_fragment>', '#include <color_fragment>\n' + GLSL_MURS);
      };
      m.customProgramCacheKey = () => 'murs-meshy-2/' + (cle ? cle.call(m) : '');
      m.needsUpdate = true;
    }
    ile.murs = { matieres: liste.map(m => m.tex), force: uniforms.murForce, etc: noms.filter(n => tx[n].t.isCompressedTexture).length };
    return noms.reduce((a, n) => a + tx[n].octets, 0);
  }
  function bruitSolZones(THREE) {
    const t = new THREE.DataTexture(new Uint8Array([255, 0, 0, 0]), 1, 1, THREE.RGBAFormat, THREE.UnsignedByteType);
    t.needsUpdate = true;
    return t;
  }

  return { FICHIERS, DIAMETRE_RELAIS, FORMES, SEMIS, ATLAS, OBJETS, SOLS, VILLAGES, DENSE, CARTES_DENSES, OBSTACLES, cartes, fumees, lumieresSol, charger, chargerSemis, poses, posesObstacles, places, poser, animer, habillerSol, habillerMurs, SOIR_SOL };
})();
if (typeof module !== 'undefined' && module.exports) module.exports = IleModeles;
