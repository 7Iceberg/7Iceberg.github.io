// Les héros modelés dans Blender (tools/blender/lyssar.py, exportés en GLB allégés par --jeu dans
// assets/heros/), posés dans le jeu à la place du panneau peint du Veilleur (3.7) quand le monde
// modelé est allumé (3.26) : derrière ?heros=lyssar (forcé) ou, avec ?monde=glb, pour la classe
// du personnage qui a son modèle (FICHIERS) ; ?heros=0 l'éteint.
//
// Un lecteur de GLB à peau, pour nos propres fichiers : les noeuds et leurs os, les maillages
// (position, normale, UV, indices de joints et poids), les matières (couleur de base, texture de
// base incluse dans le GLB, émission), le squelette (les matrices de liaison inverses). Les
// animations ne sont pas lues : la marche et les gestes sont procéduraux, sur les os de MakeHuman
// (les cuisses, les jambes, les bras balancent ; le corps respire à l'arrêt ; en combat, le tir à
// l'arbalète, le coup reçu, la poussée, le pas). Le repère du GLB est celui de la scène (X = u,
// Y = h, Z = v) ; le modèle regarde vers +Z au repos.
//
// Le porteur (`porteur`) est ce que les figures (js/ile-figures.js) appellent pour la figure marquée
// `heros` (le Veilleur sur l'île, le joueur en combat, dans une salle) : le modèle est posé à la
// place du panneau, son cap suit la marche ou la cible, ses gestes suivent le combat ; l'ombre, la
// sélection, les anneaux et la barre de vie restent ceux du panneau.
const IleHeros = (() => {
  const FICHIERS = { lyssar: 'assets/heros/lyssar.glb' };
  // L'arme tenue : le noeud du GLB qui la porte (un enfant du poignet droit), son avant et son
  // travers dans son propre repère (mesurés sur le GLB par les axes principaux de ses sommets :
  // l'arbalète est bâtie le long de +Z, ses arcs en X ; au repos elle pend le long de l'avant-bras,
  // l'arc passé la main). `dessus` : +1 ou -1, le côté de l'arme qui est en haut quand elle vise.
  const ARMES = { lyssar: { noeud: 'av_arbalete', avant: { x: -0.136, y: 0.011, z: 0.991 }, travers: { x: 0.991, y: 0.001, z: 0.131 }, dessus: 1 } };
  // La visée : la direction du bras droit (le repère du modèle, +Z devant), celles du bras et de
  // l'avant-bras gauches (l'orbe levé devant).
  const VISEE = { bras: { x: -0.18, y: -0.4, z: 0.9 }, brasG: { x: 0.4, y: -0.55, z: 0.73 }, avantG: { x: 0.1, y: 0.3, z: 0.95 } };
  // Les durées des gestes du héros en combat (ms), lues par l'arène (js/ile-arene.js) comme celles
  // des monstres modelés : le tir (le trait part au lâcher), la poussée, le pas ; pas d'entrée.
  const DUREES = { placement: 0, sort: 520, lacher: 0.45, pousse: 90, saut: 140 };

  // L'adresse d'un fichier de héros, à côté des scripts, en local comme en ligne.
  function source(classe) {
    let src = FICHIERS[classe];
    if (!src) return null;
    try {
      const ref = document.querySelector('script[src*="ile-charge.js"]') || document.querySelector('script[src*="ile-3d.js"]');
      if (ref && ref.src) { const u = new URL(ref.src); src = new URL('../' + src, u).href + u.search; }
    } catch (e) { /* chemin relatif */ }
    return src;
  }

  function octets(url) {
    if (!/^file:/.test(url)) return fetch(url).then(r => { if (!r.ok) throw new Error('GLB du héros introuvable : ' + r.status); return r.arrayBuffer(); });
    return new Promise((ok, ko) => {
      const x = new XMLHttpRequest();
      x.open('GET', url, true);
      x.responseType = 'arraybuffer';
      x.onload = () => (x.response && x.response.byteLength ? ok(x.response) : ko(new Error('GLB du héros vide ou refusé : ' + x.status)));
      x.onerror = () => ko(new Error('GLB du héros refusé (file:) : ' + url));
      x.send();
    });
  }

  const TYPES = { 5120: Int8Array, 5121: Uint8Array, 5122: Int16Array, 5123: Uint16Array, 5125: Uint32Array, 5126: Float32Array };
  const N = { SCALAR: 1, VEC2: 2, VEC3: 3, VEC4: 4, MAT4: 16 };

  function accesseur(G, bin, idx) {
    const a = G.accessors[idx], bv = G.bufferViews[a.bufferView];
    const Comp = TYPES[a.componentType], n = N[a.type];
    const off = (bv.byteOffset || 0) + (a.byteOffset || 0);
    const elt = Comp.BYTES_PER_ELEMENT, stride = bv.byteStride || 0;
    let out;
    if (!stride || stride === n * elt) out = new Comp(bin, off, a.count * n);
    else {
      out = new Comp(a.count * n);
      for (let i = 0; i < a.count; i++) out.set(new Comp(bin, off + i * stride, n), i * n);
    }
    return { array: out, n, normalized: !!a.normalized };
  }

  // Les dimensions d'une image PNG (son en-tête IHDR), pour compter ses octets décodés sans
  // l'attendre ; 1 024 de côté si ce n'est pas un PNG.
  function dimsImage(u8) {
    if (u8.length > 24 && u8[0] === 0x89 && u8[1] === 0x50 && u8[2] === 0x4e && u8[3] === 0x47) {
      const v = new DataView(u8.buffer, u8.byteOffset, u8.byteLength);
      return [v.getUint32(16), v.getUint32(20)];
    }
    return [1024, 1024];
  }

  // Une texture incluse dans le GLB (une image PNG ou JPEG du tampon binaire), lue par le navigateur.
  function texture(THREE, G, bin, idx, cache, compte) {
    if (cache.has('t' + idx)) return cache.get('t' + idx);
    const t = (G.textures || [])[idx];
    const im = t && G.images && G.images[t.source];
    if (!im || im.bufferView == null || typeof Blob === 'undefined' || typeof URL === 'undefined' || !URL.createObjectURL) return null;
    const bv = G.bufferViews[im.bufferView];
    const u8 = new Uint8Array(bin, bv.byteOffset || 0, bv.byteLength);
    const d = dimsImage(u8);
    if (compte) compte.octets += d[0] * d[1] * 4;
    const url = URL.createObjectURL(new Blob([u8], { type: im.mimeType || 'image/png' }));
    const tex = new THREE.TextureLoader().load(url, () => URL.revokeObjectURL(url));
    tex.flipY = false;
    tex.encoding = THREE.sRGBEncoding;
    cache.set('t' + idx, tex);
    return tex;
  }

  // Une matière de Three pour une matière du GLB : Lambert (la lumière du jeu), la couleur de base,
  // sa texture s'il y en a une, l'émission ; les cheveux, les tissus et les cils sur les deux faces.
  function materiau(THREE, G, bin, idx, cache, compte) {
    if (cache.has('m' + idx)) return cache.get('m' + idx);
    const m = (G.materials || [])[idx] || {};
    const pbr = m.pbrMetallicRoughness || {};
    const base = pbr.baseColorFactor || [1, 1, 1, 1];
    const em = m.emissiveFactor || [0, 0, 0];
    const force = Math.min(3, ((m.extensions || {}).KHR_materials_emissive_strength || {}).emissiveStrength || 1);
    const nom = m.name || '';
    const tex = pbr.baseColorTexture ? texture(THREE, G, bin, pbr.baseColorTexture.index, cache, compte) : null;
    const mat = new THREE.MeshLambertMaterial({
      color: new THREE.Color(base[0], base[1], base[2]),
      map: tex || null,
      emissive: new THREE.Color(em[0] * force, em[1] * force, em[2] * force),
      transparent: base[3] < 1 || m.alphaMode === 'BLEND',
      opacity: base[3],
      side: /cheveux|meche|foulard|cils|tissu|cape|pan|brin/.test(nom) || m.doubleSided ? THREE.DoubleSide : THREE.FrontSide,
      fog: true,
    });
    mat.name = nom;
    // L'émission de repos, pour l'éclair du coup reçu (le panneau blanchit ; le modèle rougit).
    mat.emissionBase = { r: em[0] * force, g: em[1] * force, b: em[2] * force };
    cache.set('m' + idx, mat);
    return mat;
  }

  function geometrie(THREE, G, bin, prim) {
    const geo = new THREE.BufferGeometry();
    const at = prim.attributes || {};
    if (at.POSITION == null) return null;
    const p = accesseur(G, bin, at.POSITION);
    geo.setAttribute('position', new THREE.BufferAttribute(p.array, p.n));
    if (at.NORMAL != null) { const a = accesseur(G, bin, at.NORMAL); geo.setAttribute('normal', new THREE.BufferAttribute(a.array, a.n)); }
    if (at.TEXCOORD_0 != null) { const a = accesseur(G, bin, at.TEXCOORD_0); geo.setAttribute('uv', new THREE.BufferAttribute(a.array, a.n, a.normalized)); }
    if (at.JOINTS_0 != null) { const a = accesseur(G, bin, at.JOINTS_0); geo.setAttribute('skinIndex', new THREE.BufferAttribute(a.array, a.n)); }
    if (at.WEIGHTS_0 != null) { const a = accesseur(G, bin, at.WEIGHTS_0); geo.setAttribute('skinWeight', new THREE.BufferAttribute(a.array, a.n, a.normalized)); }
    if (prim.indices != null) { const a = accesseur(G, bin, prim.indices); geo.setIndex(new THREE.BufferAttribute(a.array, 1)); }
    if (at.NORMAL == null) geo.computeVertexNormals();
    geo.computeBoundingSphere();
    return geo;
  }

  // Plusieurs géométries (mêmes attributs) réunies en une : les attributs mis bout à bout, l'index
  // décalé.
  function reunir(THREE, geos) {
    // Les attributs que toutes ont (une pièce sans UV n'en impose pas aux autres).
    const noms = Object.keys(geos[0].attributes).filter(nom => geos.every(x => x.getAttribute(nom)));
    const g = new THREE.BufferGeometry();
    for (const nom of noms) {
      const a0 = geos[0].getAttribute(nom);
      const n = geos.reduce((s, x) => s + x.getAttribute(nom).count, 0);
      const Comp = a0.array.constructor;
      const arr = new Comp(n * a0.itemSize);
      let d = 0;
      for (const x of geos) { const a = x.getAttribute(nom); arr.set(a.array.subarray ? a.array.subarray(0, a.count * a.itemSize) : a.array, d); d += a.count * a.itemSize; }
      g.setAttribute(nom, new THREE.BufferAttribute(arr, a0.itemSize, a0.normalized));
    }
    const nTot = geos.reduce((s, x) => s + x.getAttribute('position').count, 0);
    const ind = [];
    let base = 0;
    for (const x of geos) {
      const n = x.getAttribute('position').count;
      if (x.index) for (let i = 0; i < x.index.count; i++) ind.push(base + x.index.array[i]);
      else for (let i = 0; i < n; i++) ind.push(base + i);
      base += n;
    }
    g.setIndex(new THREE.BufferAttribute(nTot > 65535 ? new Uint32Array(ind) : new Uint16Array(ind), 1));
    g.computeBoundingSphere();
    return g;
  }

  const octetsGeo = geo => Object.values(geo.attributes).reduce((s, a) => s + (a.array ? a.array.byteLength : 0), 0) + (geo.index && geo.index.array ? geo.index.array.byteLength : 0);

  // Le héros : un groupe (racine) qui porte les os et les maillages à peau du GLB, lié à son
  // squelette ; les os par nom (sans le préfixe du modèle), leur rotation de repos et leurs repères
  // pour la marche et les gestes ; l'arme tenue (`arme`) si le modèle en a une.
  function construire(THREE, glb, arme) {
    const { json: G, bin } = glb;
    const cache = new Map();
    const compte = { octets: 0 };
    const articulations = new Set();
    for (const s of G.skins || []) for (const j of s.joints) articulations.add(j);
    const objets = G.nodes.map((n, i) => {
      const o = articulations.has(i) ? new THREE.Bone() : new THREE.Group();
      o.name = n.name || ('noeud_' + i);
      if (n.matrix) { const m = new THREE.Matrix4().fromArray(n.matrix); m.decompose(o.position, o.quaternion, o.scale); } else {
        if (n.translation) o.position.fromArray(n.translation);
        if (n.rotation) o.quaternion.fromArray(n.rotation);
        if (n.scale) o.scale.fromArray(n.scale);
      }
      return o;
    });
    G.nodes.forEach((n, i) => { for (const c of n.children || []) objets[i].add(objets[c]); });
    const racine = new THREE.Group();
    racine.name = 'heros';
    for (const i of G.scenes[G.scene || 0].nodes || []) racine.add(objets[i]);
    racine.updateMatrixWorld(true);
    const squelettes = (G.skins || []).map(s => {
      const os = s.joints.map(j => objets[j]);
      const inv = s.inverseBindMatrices != null ? accesseur(G, bin, s.inverseBindMatrices).array : null;
      const mats = os.map((_, k) => { const m = new THREE.Matrix4(); if (inv) m.fromArray(inv, k * 16); return m; });
      return new THREE.Skeleton(os, mats);
    });
    let triangles = 0, appels = 0;
    const geometries = [];
    // Les primitives à peau d'une même peau sont réunies en un seul SkinnedMesh par matière (les
    // pièces de la tenue sont nombreuses et petites : un appel par matière, pas par pièce), et les
    // matières unies (sans texture, sans émission, opaques) en un seul, leur couleur cuite par
    // sommet : le héros coûte une poignée d'appels (3.28). Les noeuds qui portent ces primitives ont
    // tous la transformation de leur armature.
    const paquets = new Map();
    const unie = idx => {
      const m = (G.materials || [])[idx] || {}, pbr = m.pbrMetallicRoughness || {}, base = pbr.baseColorFactor || [1, 1, 1, 1], em = m.emissiveFactor || [0, 0, 0];
      return !pbr.baseColorTexture && !(em[0] || em[1] || em[2]) && base[3] >= 1 && m.alphaMode !== 'BLEND';
    };
    G.nodes.forEach((n, i) => {
      if (n.mesh == null) return;
      const mesh = G.meshes[n.mesh];
      for (const prim of mesh.primitives || []) {
        const geo = geometrie(THREE, G, bin, prim);
        if (!geo) continue;
        triangles += (geo.index ? geo.index.count : geo.getAttribute('position').count) / 3;
        if (n.skin != null && geo.getAttribute('skinIndex')) {
          const u = unie(prim.material);
          const k = n.skin + ':' + (u ? 'unies' : prim.material);
          if (!paquets.has(k)) paquets.set(k, { skin: n.skin, material: u ? null : prim.material, noeud: i, geos: [], noms: [], materiaux: [] });
          paquets.get(k).geos.push(geo);
          paquets.get(k).noms.push(mesh.name || ('maillage_' + n.mesh));
          paquets.get(k).materiaux.push(prim.material);
        } else {
          // Les pièces fixes (l'arbalète, l'orbe) : celles d'un même noeud aux matières unies
          // réunies en un seul maillage, comme les pièces à peau.
          const u = unie(prim.material);
          const k = 'fixe:' + i + ':' + (u ? 'unies' : prim.material);
          if (!paquets.has(k)) paquets.set(k, { skin: null, material: u ? null : prim.material, noeud: i, geos: [], noms: [], materiaux: [] });
          paquets.get(k).geos.push(geo);
          paquets.get(k).noms.push(mesh.name || ('maillage_' + n.mesh));
          paquets.get(k).materiaux.push(prim.material);
        }
      }
    });
    for (const pq of paquets.values()) {
      let mat;
      if (pq.material == null) {
        // Les matières unies : la couleur de base de chacune écrite par sommet, une seule matière
        // Lambert à couleurs par sommet, sur les deux faces si l'une l'était.
        for (let q = 0; q < pq.geos.length; q++) {
          const g = pq.geos[q], n = g.getAttribute('position').count;
          const m = (G.materials || [])[pq.materiaux[q]] || {}, base = (m.pbrMetallicRoughness || {}).baseColorFactor || [1, 1, 1, 1];
          const col = new Float32Array(n * 3);
          for (let v = 0; v < n; v++) { col[v * 3] = base[0]; col[v * 3 + 1] = base[1]; col[v * 3 + 2] = base[2]; }
          g.setAttribute('color', new THREE.BufferAttribute(col, 3));
        }
        const noms = pq.materiaux.map(idx => ((G.materials || [])[idx] || {}).name || '');
        const deuxFaces = noms.some(nom => /cheveux|meche|foulard|cils|tissu|cape|pan|brin/.test(nom)) || pq.materiaux.some(idx => ((G.materials || [])[idx] || {}).doubleSided);
        mat = cache.get('unies') || new THREE.MeshLambertMaterial({ color: new THREE.Color(1, 1, 1), vertexColors: true, emissive: new THREE.Color(0, 0, 0), side: deuxFaces ? THREE.DoubleSide : THREE.FrontSide, fog: true });
        mat.name = 'unies'; mat.emissionBase = { r: 0, g: 0, b: 0 };
        cache.set('unies', mat);
      } else mat = materiau(THREE, G, bin, pq.material, cache, compte);
      const geo = pq.geos.length === 1 ? pq.geos[0] : reunir(THREE, pq.geos);
      const o = pq.skin == null ? new THREE.Mesh(geo, mat) : new THREE.SkinnedMesh(geo, mat);
      objets[pq.noeud].add(o);
      if (pq.skin != null) { o.updateMatrixWorld(true); o.bind(squelettes[pq.skin], o.matrixWorld); }
      o.name = pq.noms.length === 1 ? pq.noms[0] : pq.noms[0] + ' +' + (pq.noms.length - 1);
      o.frustumCulled = false;
      geometries.push(geo);
      appels++;
    }
    const os = new Map();
    for (const o of objets) if (o.isBone) os.set(o.name.replace(/^[a-z]{2}_/, ''), o);
    const repos = new Map();
    for (const [nom, o] of os) repos.set(nom, o.quaternion.clone());
    const materiaux = [...cache.entries()].filter(([k]) => k[0] === 'm' || k === 'unies').map(([, m]) => m);
    const textures = [...cache.entries()].filter(([k]) => k[0] === 't').map(([, t]) => t);
    for (const g of geometries) compte.octets += octetsGeo(g);
    const h = { racine, os, repos, triangles: Math.round(triangles), appels, cache, materiaux, textures, geometries, octets: compte.octets, arme: null, flash: false };
    reperer(h);
    if (arme) {
      const idx = G.nodes.findIndex(n => n.name === arme.noeud);
      if (idx >= 0) h.arme = Object.assign({ monde: h.qMonde(objets[idx]) }, arme);
    }
    return h;
  }

  // Les GLB lus, par adresse : une salle du Puits ou un retour sur l'île reconstruisent le héros
  // sans relire le fichier.
  const LUS = new Map();
  function lire(url) {
    if (typeof IleGlb !== 'object') return Promise.reject(new Error('IleGlb absent'));
    if (!LUS.has(url)) LUS.set(url, octets(url).then(b => IleGlb.analyser(b)).catch(e => { LUS.delete(url); throw e; }));
    return LUS.get(url);
  }

  // ----- Une petite algèbre des quaternions {x, y, z, w} et des vecteurs {x, y, z} -----
  // Sans dépendre de Three (le Three factice des tests n'a que le minimum).
  const IDENT = { x: 0, y: 0, z: 0, w: 1 };
  const qMul = (a, b) => ({ x: a.x * b.w + a.w * b.x + a.y * b.z - a.z * b.y, y: a.y * b.w + a.w * b.y + a.z * b.x - a.x * b.z, z: a.z * b.w + a.w * b.z + a.x * b.y - a.y * b.x, w: a.w * b.w - a.x * b.x - a.y * b.y - a.z * b.z });
  const qInv = q => ({ x: -q.x, y: -q.y, z: -q.z, w: q.w });
  const qAxe = (a, t) => { const s = Math.sin(t / 2); return { x: a.x * s, y: a.y * s, z: a.z * s, w: Math.cos(t / 2) }; };
  // v tourné par q.
  const qVec = (q, v) => {
    const ix = q.w * v.x + q.y * v.z - q.z * v.y, iy = q.w * v.y + q.z * v.x - q.x * v.z, iz = q.w * v.z + q.x * v.y - q.y * v.x, iw = -q.x * v.x - q.y * v.y - q.z * v.z;
    return { x: ix * q.w + iw * -q.x + iy * -q.z - iz * -q.y, y: iy * q.w + iw * -q.y + iz * -q.x - ix * -q.z, z: iz * q.w + iw * -q.z + ix * -q.y - iy * -q.x };
  };
  const vCroix = (a, b) => ({ x: a.y * b.z - a.z * b.y, y: a.z * b.x - a.x * b.z, z: a.x * b.y - a.y * b.x });
  const vDot = (a, b) => a.x * b.x + a.y * b.y + a.z * b.z;
  const vNorm = v => { const n = Math.hypot(v.x, v.y, v.z) || 1; return { x: v.x / n, y: v.y / n, z: v.z / n }; };
  // La rotation qui amène l'unitaire a sur l'unitaire b (la plus courte).
  function qEntre(a, b) {
    const d = vDot(a, b);
    if (d < -0.9999) { const ax = Math.abs(a.x) > 0.9 ? { x: 0, y: 1, z: 0 } : { x: 1, y: 0, z: 0 }; return qAxe(vNorm(vCroix(a, ax)), Math.PI); }
    const c = vCroix(a, b), q = { x: c.x, y: c.y, z: c.z, w: 1 + d }, n = Math.hypot(q.x, q.y, q.z, q.w);
    return { x: q.x / n, y: q.y / n, z: q.z / n, w: q.w / n };
  }
  // Le quaternion d'un repère orthonormé (ses trois colonnes a, b, c).
  function qRepere(a, b, c) {
    const m00 = a.x, m10 = a.y, m20 = a.z, m01 = b.x, m11 = b.y, m21 = b.z, m02 = c.x, m12 = c.y, m22 = c.z;
    const tr = m00 + m11 + m22;
    let x, y, z, w;
    if (tr > 0) { const s = 0.5 / Math.sqrt(tr + 1); w = 0.25 / s; x = (m21 - m12) * s; y = (m02 - m20) * s; z = (m10 - m01) * s; }
    else if (m00 > m11 && m00 > m22) { const s = 2 * Math.sqrt(1 + m00 - m11 - m22); w = (m21 - m12) / s; x = 0.25 * s; y = (m01 + m10) / s; z = (m02 + m20) / s; }
    else if (m11 > m22) { const s = 2 * Math.sqrt(1 + m11 - m00 - m22); w = (m02 - m20) / s; x = (m01 + m10) / s; y = 0.25 * s; z = (m12 + m21) / s; }
    else { const s = 2 * Math.sqrt(1 + m22 - m00 - m11); w = (m10 - m01) / s; x = (m02 + m20) / s; y = (m12 + m21) / s; z = 0.25 * s; }
    return { x, y, z, w };
  }
  // Le glissement de a vers b (t de 0 à 1), par le court chemin.
  function qGlisse(a, b, t) {
    if (t <= 0) return a;
    if (t >= 1) return b;
    let d = a.x * b.x + a.y * b.y + a.z * b.z + a.w * b.w, bx = b.x, by = b.y, bz = b.z, bw = b.w;
    if (d < 0) { d = -d; bx = -bx; by = -by; bz = -bz; bw = -bw; }
    let ka = 1 - t, kb = t;
    if (d < 0.9995) { const th = Math.acos(Math.min(1, d)), s = Math.sin(th); ka = Math.sin((1 - t) * th) / s; kb = Math.sin(t * th) / s; }
    const q = { x: a.x * ka + bx * kb, y: a.y * ka + by * kb, z: a.z * ka + bz * kb, w: a.w * ka + bw * kb };
    const n = Math.hypot(q.x, q.y, q.z, q.w) || 1;
    return { x: q.x / n, y: q.y / n, z: q.z / n, w: q.w / n };
  }

  // ----- La marche et les gestes, sur les os de MakeHuman -----
  // Les os par rôle (MakeHuman : upperleg01.L, lowerleg01.L, upperarm01.L, lowerarm01.L, spine02,
  // head ; à défaut, le premier os dont le nom commence ainsi).
  const ROLES = { cuisseG: 'upperleg01.L', cuisseD: 'upperleg01.R', jambeG: 'lowerleg01.L', jambeD: 'lowerleg01.R',
                  brasG: 'upperarm01.L', brasD: 'upperarm01.R', avantG: 'lowerarm01.L', avantD: 'lowerarm01.R', buste: 'spine02', bassin: 'spine05', tete: 'head' };

  // Les repères des os, au repos (le modèle droit, tourné vers +Z) : la rotation du monde de l'os et
  // de son parent (le repère du modèle), la direction de l'os (son Y), et l'axe local de sa flexion :
  // tourner autour de lui d'un angle positif porte l'extrémité de l'os vers l'avant (+Z) ; c'est
  // l'axe latéral, quel que soit le roulis que MakeHuman a donné à l'os.
  function reperer(h) {
    const cache = new Map();
    const qMonde = o => {
      if (!o || o === h.racine) return IDENT;
      let q = cache.get(o);
      if (!q) { q = qMul(qMonde(o.parent), o.quaternion); cache.set(o, q); }
      return q;
    };
    h.qMonde = qMonde;
    h.reperes = new Map();
    const Z = { x: 0, y: 0, z: 1 };
    for (const [nom, o] of h.os) {
      const monde = qMonde(o), parent = qMonde(o.parent);
      const dir = qVec(monde, { x: 0, y: 1, z: 0 });
      let axe = vCroix(dir, Z);
      if (Math.hypot(axe.x, axe.y, axe.z) < 1e-3) axe = { x: -1, y: 0, z: 0 };
      axe = qVec(qInv(monde), vNorm(axe));
      h.reperes.set(o, { nom, dir, axe, monde, parent, parentInv: qInv(parent), repos: h.repos.get(nom) });
    }
  }

  function osDe(h, nom) {
    if (h.os.has(nom)) return h.os.get(nom);
    for (const [k, o] of h.os) if (k.startsWith(nom)) return o;
    return null;
  }

  // La rotation locale d'un os plié de `angle` autour de son axe de flexion (positif : vers l'avant).
  function qFlex(h, o, angle) { const R = h.reperes.get(o); return qMul(R.repos, qAxe(R.axe, angle)); }
  // La rotation locale d'un os plié de `angle` et tordu de `torsion` autour de son propre axe (son Y :
  // la direction de l'os ; positif : le côté gauche du modèle part vers l'arrière).
  const AXE_OS = { x: 0, y: 1, z: 0 };
  function qFlexTord(h, o, angle, torsion) { const R = h.reperes.get(o); return qMul(qMul(R.repos, qAxe(R.axe, angle)), qAxe(AXE_OS, torsion)); }
  // La rotation locale d'un os pour une rotation `qd` du monde appliquée à sa pose de repos, son
  // parent tourné `parent` dans le monde (sa rotation de repos si rien n'est donné) ; et la rotation
  // du monde qui en résulte (pour les enfants).
  function localeDe(R, qd, parent) {
    const monde = qMul(qd, R.monde);
    return { locale: qMul(parent ? qInv(parent) : R.parentInv, monde), monde };
  }
  // Un bras : l'os du bras tourné vers `dirBras`, l'avant-bras vers `dirAvant` (le repère du modèle),
  // au plus court depuis le repos.
  function orienter(h, bras, dirBras, avant, dirAvant) {
    const Rb = h.reperes.get(bras), Ra = h.reperes.get(avant);
    const B = localeDe(Rb, qEntre(Rb.dir, vNorm(dirBras)));
    const A = localeDe(Ra, qEntre(Ra.dir, vNorm(dirAvant)), B.monde);
    return { bras: B.locale, avant: A.locale };
  }
  // La visée : l'arme tournée vers `d` (unitaire, le repère du modèle), ses arcs à l'horizontale ;
  // l'avant-bras, la main et l'arme suivent d'un bloc, la prise de repos gardée ; le bras vers
  // `dirBras`. Rend les rotations locales du bras et de l'avant-bras droits.
  function viser(h, d, dirBras) {
    const A = h.arme, Rb = h.reperes.get(osDe(h, ROLES.brasD)), Ra = h.reperes.get(osDe(h, ROLES.avantD));
    const f0 = vNorm(qVec(A.monde, A.avant));
    let l0 = qVec(A.monde, A.travers);
    const k0 = vDot(l0, f0);
    l0 = vNorm({ x: l0.x - k0 * f0.x, y: l0.y - k0 * f0.y, z: l0.z - k0 * f0.z });
    let lat = vNorm(vCroix({ x: 0, y: 1, z: 0 }, d));
    lat = { x: lat.x * A.dessus, y: lat.y * A.dessus, z: lat.z * A.dessus };
    const qd = qMul(qRepere(d, lat, vCroix(d, lat)), qInv(qRepere(f0, l0, vCroix(f0, l0))));
    const B = localeDe(Rb, qEntre(Rb.dir, vNorm(dirBras)));
    const Av = localeDe(Ra, qd, B.monde);
    return { bras: B.locale, avant: Av.locale };
  }

  const lisse = u => { u = Math.max(0, Math.min(1, u)); return u * u * (3 - 2 * u); };
  const melange = (h, pose, o, q, e) => { if (!o) return; const R = h.reperes.get(o); pose.set(o, e >= 1 ? q : qGlisse(pose.get(o) || R.repos, q, e)); };

  // Un geste par-dessus la pose du moment (t de 0 à 1 sur sa durée) : le tir (la visée montée en
  // 0,3, le lâcher à 0,45 avec un recul, la descente de 0,65 à 1), le coup reçu (le buste et la tête
  // partent en arrière), la poussée (le buste en arrière), le pas (un petit bond). Rend la hausse du
  // corps.
  function gesteSur(h, pose, g) {
    const u = Math.max(0, Math.min(1, g.t || 0)), os = n => osDe(h, n);
    if (g.type === 'sort') {
      const e = lisse(u / 0.3) * (1 - lisse((u - 0.65) / 0.35));
      const recul = u > 0.45 && u < 0.75 ? Math.sin((u - 0.45) / 0.3 * Math.PI) : 0;
      const d = vNorm({ x: 0, y: -0.04 + 0.22 * recul, z: 1 });
      if (h.arme) {
        const V = viser(h, d, VISEE.bras);
        melange(h, pose, os(ROLES.brasD), V.bras, e); melange(h, pose, os(ROLES.avantD), V.avant, e);
      } else {
        const V = orienter(h, os(ROLES.brasD), { x: -0.15, y: 0.05 + 0.2 * recul, z: 1 }, os(ROLES.avantD), d);
        melange(h, pose, os(ROLES.brasD), V.bras, e); melange(h, pose, os(ROLES.avantD), V.avant, e);
      }
      const G = orienter(h, os(ROLES.brasG), VISEE.brasG, os(ROLES.avantG), VISEE.avantG);
      melange(h, pose, os(ROLES.brasG), G.bras, e); melange(h, pose, os(ROLES.avantG), G.avant, e);
      melange(h, pose, os(ROLES.buste), qFlex(h, os(ROLES.buste), 0.07 - 0.12 * recul), e);
      melange(h, pose, os(ROLES.tete), qFlex(h, os(ROLES.tete), 0.05 * recul), e);
      return 0;
    }
    if (g.type === 'coup') {
      const b = Math.sin(u * Math.PI);
      melange(h, pose, os(ROLES.buste), qFlex(h, os(ROLES.buste), -0.14 * b), 1);
      melange(h, pose, os(ROLES.tete), qFlex(h, os(ROLES.tete), -0.2 * b), 1);
      return 0;
    }
    if (g.type === 'pousse') {
      const b = Math.sin(u * Math.PI);
      melange(h, pose, os(ROLES.buste), qFlex(h, os(ROLES.buste), -0.3 * b), 1);
      melange(h, pose, os(ROLES.tete), qFlex(h, os(ROLES.tete), -0.15 * b), 1);
      melange(h, pose, os(ROLES.brasG), qFlex(h, os(ROLES.brasG), 0.5 * b), 1);
      melange(h, pose, os(ROLES.brasD), qFlex(h, os(ROLES.brasD), 0.5 * b), 1);
      return 0;
    }
    if (g.type === 'saut') return Math.sin(u * Math.PI) * 0.06;
    return 0;
  }

  // La pose du moment : la marche quand le héros bouge, la respiration à l'arrêt, le passage de
  // l'une à l'autre en douceur ; puis le geste du combat s'il y en a un. La phase de la marche suit
  // la distance parcourue (`h.phase`, avancée par `poser`), pas le temps : les pieds ne glissent
  // pas, l'arrêt fige la foulée avant le retour au repos. La part de course (`kc`, au-delà de
  // 4,8 u/s) allonge la foulée, plie les genoux et les coudes, penche le buste. Les hanches
  // suivent la jambe avancée, les épaules la contrarient, la tête garde le cap. Chaque os tourne
  // autour de son axe de flexion (positif : vers l'avant) à partir de sa rotation de repos.
  function animer(THREE, h, t, bouge, geste) {
    h.kMarche = h.kMarche === undefined ? (bouge ? 1 : 0) : h.kMarche + ((bouge ? 1 : 0) - h.kMarche) * 0.15;
    const k = h.kMarche, w = h.phase || 0;
    const kc = k * Math.max(0, Math.min(1, ((h.vitesse || 0) - 4.8) / 2.2));
    const A = (0.55 + 0.25 * kc) * k, B = (0.4 + 0.5 * kc) * k, C = (0.35 + 0.3 * kc) * k;
    const s = Math.sin(w), c = Math.cos(w);
    const resp = (1 - k) * Math.sin(t * 2 * Math.PI / 4) * 0.025;
    const coude = 0.08 + 0.42 * k + 0.5 * kc;
    const pose = new Map();
    const flex = (nom, a, tord) => { const o = osDe(h, nom); if (o) pose.set(o, tord ? qFlexTord(h, o, a, tord) : qFlex(h, o, a)); };
    flex(ROLES.cuisseG, A * s);
    flex(ROLES.cuisseD, -A * s);
    // Le genou plie vers l'arrière, plus en course.
    flex(ROLES.jambeG, -Math.max(0, -B * c) - 0.05 * k - 0.25 * kc);
    flex(ROLES.jambeD, -Math.max(0, B * c) - 0.05 * k - 0.25 * kc);
    flex(ROLES.brasG, -C * s + resp);
    flex(ROLES.brasD, C * s + resp);
    flex(ROLES.avantG, coude + Math.max(0, -0.2 * k * s));
    flex(ROLES.avantD, coude + Math.max(0, 0.2 * k * s));
    // Les hanches tournent avec la jambe avancée (le côté gauche vers l'avant : torsion négative),
    // les épaules à l'inverse, la tête compense pour regarder devant.
    flex(ROLES.bassin, 0, -0.07 * k * s);
    flex(ROLES.buste, 0.04 * k * Math.sin(2 * w) + resp * 0.5 + 0.12 * kc, 0.14 * k * s);
    flex(ROLES.tete, -0.03 * k * Math.sin(2 * w) - 0.06 * kc, -0.07 * k * s);
    let hausse = Math.abs(s) * (0.03 + 0.03 * kc) * k;
    if (geste) hausse += gesteSur(h, pose, geste);
    for (const [o, q] of pose) { o.quaternion.x = q.x; o.quaternion.y = q.y; o.quaternion.z = q.z; o.quaternion.w = q.w; }
    h.racine.position.y = h.sol + hausse;
  }

  // L'éclair du coup reçu : les matières rougissent un instant.
  function eclairer(h, flash) {
    if (!!flash === !!h.flash) return;
    h.flash = !!flash;
    for (const m of h.materiaux) {
      const b = m.emissionBase || { r: 0, g: 0, b: 0 };
      if (!m.emissive) continue;
      m.emissive.r = b.r + (flash ? 0.55 : 0); m.emissive.g = b.g + (flash ? 0.18 : 0); m.emissive.b = b.b + (flash ? 0.12 : 0);
    }
  }

  // Pose le héros au sol en (x, h, z) (le repère de la scène), le cap (radians, 0 : vers +Z) suivi
  // en douceur (une constante de temps de 70 ms, quel que soit le rythme des images) ; sa marche
  // s'il bouge (la phase avancée de la distance parcourue depuis la pose précédente : une foulée
  // complète, deux pas, vaut 1,4 u plus 0,2 u par u/s de vitesse, à l'échelle du modèle), son geste
  // s'il en a un, l'éclair du coup reçu.
  function poser(THREE, h, x, y, z, cap, t, bouge, geste, flash) {
    const r = h.racine;
    const dt = h.tPrec == null ? 0 : Math.min(0.1, Math.max(0, t - h.tPrec));
    h.tPrec = t;
    const dist = r.visible && h.sol != null ? Math.hypot(x - r.position.x, z - r.position.z) : 0;
    r.visible = true;
    r.position.x = x; r.position.z = z; h.sol = y;
    // Un saut de 3 u ou plus n'est pas une marche (le modèle replacé, le combat qui commence).
    const v = dt > 0 && dist > 0 && dist < 3 ? dist / dt : 0;
    h.vitesse = h.vitesse == null ? v : h.vitesse + (v - h.vitesse) * (dt > 0 ? Math.min(1, dt / 0.12) : 0);
    if (bouge && dist > 0 && dist < 3) {
      const foulee = (1.4 + 0.2 * Math.min(h.vitesse, 8)) * (r.scale.x || 1);
      h.phase = ((h.phase || 0) + 2 * Math.PI * dist / foulee) % (2 * Math.PI);
    }
    if (cap !== null && cap !== undefined) {
      let d = cap - r.rotation.y;
      d = Math.atan2(Math.sin(d), Math.cos(d));
      r.rotation.y += d * (dt > 0 ? 1 - Math.exp(-dt / 0.07) : 1);
    }
    animer(THREE, h, t, bouge, geste || null);
    eclairer(h, flash);
    if (h.ombre) { h.ombre.position.set(x, y + 0.03, z); h.ombre.visible = true; }
  }

  function cacher(h) {
    if (!h) return;
    h.racine.visible = false;
    if (h.ombre) h.ombre.visible = false;
  }

  // Rend les géométries, les matières et les textures du héros, et le retire de son parent.
  function liberer(h) {
    if (!h) return;
    for (const g of h.geometries || []) if (g.dispose) g.dispose();
    for (const m of h.materiaux || []) if (m.dispose) m.dispose();
    for (const t of h.textures || []) if (t && t.dispose) t.dispose();
    const p = h.racine.parent;
    if (p && typeof p.remove === 'function') p.remove(h.racine);
  }

  // Charge le héros d'une classe : le GLB lu (une fois) et construit ; ajouté à `parent` s'il est
  // donné (sinon le porteur le prendra), caché.
  async function charger(THREE, parent, classe, url) {
    const glb = await lire(url || source(classe));
    const h = construire(THREE, glb, ARMES[classe] || null);
    h.classe = classe;
    h.sol = 0;
    if (parent) parent.add(h.racine);
    cacher(h);
    console.log(`Héros : ${classe} posé, ${h.appels} appels, ${h.triangles} triangles, ${h.os.size} os`);
    return h;
  }

  // Le porteur du héros pour les figures (js/ile-figures.js, `Figures.heros`), à la manière du parc
  // des monstres modelés : `debut(now)` à chaque image, `poser(s)` pour la figure marquée `heros`
  // (rend vrai : son panneau est vide), `emprise(s)` pour son ombre, `fin()` cache le modèle si
  // aucune figure ne l'a posé (le Veilleur mort, hors champ, ou le panneau repris). Le cap suit le
  // déplacement de la figure, sinon sa cible (`s.vers`, le repère de la scène) ; `s.bouge` dit la
  // marche (sinon le déplacement la dit) ; `s.geste` ({ type, t }) et `s.flash` viennent du combat ;
  // `force` ({ type, t, cap }) impose un geste et un cap (les captures d'atelier).
  // L'échelle du héros dans le monde (ECHELLE : 1 serait le modèle à sa taille de 1,75 u ; 1,15 le
  // porte à 2 u, la hauteur des panneaux peints des PNJ et de l'ancienne figure du Veilleur, pour
  // qu'il tienne sa place devant les portes et les bannières) ; ?heros_echelle=1.3 en essaie une autre.
  let ECHELLE = 1.15;
  try { const q = parseFloat(new URLSearchParams(location.search).get('heros_echelle')); if (Number.isFinite(q) && q > 0.3 && q < 3) ECHELLE = q; } catch (e) { /* rien */ }
  function porteur(THREE, h, parent) {
    if (parent) parent.add(h.racine);
    const P = { h, prec: null, cap: null, now: 0, pose: false, force: null };
    P.debut = now => { P.now = now; P.pose = false; };
    P.poser = s => {
      const alpha = s.alpha == null ? 1 : s.alpha, k = (s.scale || 1) * ECHELLE;
      if (h.racine.scale.x !== k) h.racine.scale.set(k, k, k);
      const prec = P.prec || (P.prec = { x: s.x, y: s.y });
      const dx = s.x - prec.x, dy = s.y - prec.y, deplace = Math.hypot(dx, dy) > 0.004;
      if (deplace) P.cap = Math.atan2(dx, dy);
      else if (s.vers && (Math.abs(s.vers.u - s.x) > 0.01 || Math.abs(s.vers.v - s.y) > 0.01)) P.cap = Math.atan2(s.vers.u - s.x, s.vers.v - s.y);
      prec.x = s.x; prec.y = s.y;
      P.pose = true;
      if (alpha < 0.3) { cacher(h); return true; }
      const F = P.force;
      poser(THREE, h, s.x, s.h, s.y, F && F.cap != null ? F.cap : P.cap, P.now / 1000, s.bouge != null ? !!s.bouge : deplace, F || s.geste || null, !!s.flash);
      return true;
    };
    P.emprise = s => 1.35 * (s.scale || 1) * ECHELLE;
    P.fin = () => { if (!P.pose) cacher(h); };
    P.octets = () => h.octets || 0;
    P.liberer = () => liberer(h);
    return P;
  }

  return { FICHIERS, ARMES, VISEE, DUREES, ROLES, source, lire, construire, charger, poser, cacher, animer, liberer, porteur, viser, orienter, qFlex, get ECHELLE() { return ECHELLE; }, set ECHELLE(v) { ECHELLE = v; } };
})();
if (typeof module !== 'undefined' && module.exports) module.exports = IleHeros;
