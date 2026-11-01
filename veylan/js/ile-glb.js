// Le monde d'Ervane modelé dans Blender (tools/blender/monde/ervane.py, exporté en GLB dans
// assets/monde/ervane.glb), posé dans le jeu à la place du sol et du décor dessinés par le code :
// derrière l'interrupteur ?monde=glb (ou DATA.ile.monde = 'glb'). Le GLB est exporté en Y vers le
// haut : son repère est celui de la scène (X = u, Y = h, Z = v), rien à tourner.
//
// Un lecteur de GLB minimal, pour nos propres fichiers (ni textures, ni peaux, ni animations) : les
// noeuds et leurs matrices, les maillages (position, normale, couleur de sommet, indices), les
// matières (couleur de base, émission, transparence de l'eau). Les noeuds qui partagent un maillage
// (le semis : herbes, fleurs, arbres...) deviennent une InstancedMesh : un appel de dessin par
// forme. Le terrain, la navigation, les combats, les figures ne changent pas : le GLB vient du même
// terrain que le jeu, à la même place.
const IleGlb = (() => {
  // assets/monde/ervane.glb à côté des scripts, en local comme en ligne.
  function source() {
    let src = 'assets/monde/ervane.glb';
    try {
      const ref = document.querySelector('script[src*="ile-charge.js"]') || document.querySelector('script[src*="ile-3d.js"]');
      if (ref && ref.src) src = new URL('../assets/monde/ervane.glb', ref.src).href;
    } catch (e) { /* chemin relatif */ }
    return src;
  }

  // Le fichier, par fetch ; en local (file:), par XMLHttpRequest, que fetch refuse.
  function octets(url) {
    if (!/^file:/.test(url)) return fetch(url).then(r => { if (!r.ok) throw new Error('GLB introuvable : ' + r.status); return r.arrayBuffer(); });
    return new Promise((ok, ko) => {
      const x = new XMLHttpRequest();
      x.open('GET', url, true);
      x.responseType = 'arraybuffer';
      x.onload = () => (x.response && x.response.byteLength ? ok(x.response) : ko(new Error('GLB vide ou refusé : ' + x.status)));
      x.onerror = () => ko(new Error('GLB refusé (file:) : ' + url));
      x.send();
    });
  }

  async function lire(url) {
    return analyser(await octets(url));
  }

  // Les deux morceaux d'un GLB : le JSON et le binaire.
  function analyser(buf) {
    const dv = new DataView(buf);
    if (dv.getUint32(0, true) !== 0x46546C67) throw new Error('pas un GLB');
    let off = 12, json = null, bin = null;
    while (off + 8 <= buf.byteLength) {
      const len = dv.getUint32(off, true), type = dv.getUint32(off + 4, true);
      const data = buf.slice(off + 8, off + 8 + len);
      if (type === 0x4E4F534A) json = JSON.parse(new TextDecoder().decode(data));
      else if (type === 0x004E4942) bin = data;
      off += 8 + len;
    }
    if (!json || !bin) throw new Error('GLB incomplet');
    return { json, bin };
  }

  const TYPES = { 5120: Int8Array, 5121: Uint8Array, 5122: Int16Array, 5123: Uint16Array, 5125: Uint32Array, 5126: Float32Array };
  const N = { SCALAR: 1, VEC2: 2, VEC3: 3, VEC4: 4, MAT4: 16 };

  // Un accesseur : un tableau typé contigu (les vues entrelacées sont recopiées).
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

  function geometrie(THREE, G, bin, prim) {
    const geo = new THREE.BufferGeometry();
    const at = prim.attributes || {};
    if (at.POSITION == null) return null;
    const p = accesseur(G, bin, at.POSITION);
    geo.setAttribute('position', new THREE.BufferAttribute(p.array, p.n));
    if (at.NORMAL != null) { const a = accesseur(G, bin, at.NORMAL); geo.setAttribute('normal', new THREE.BufferAttribute(a.array, a.n)); }
    if (at.COLOR_0 != null) { const a = accesseur(G, bin, at.COLOR_0); geo.setAttribute('color', new THREE.BufferAttribute(a.array, a.n, a.normalized)); }
    if (prim.indices != null) { const a = accesseur(G, bin, prim.indices); geo.setIndex(new THREE.BufferAttribute(a.array, 1)); }
    if (at.NORMAL == null) geo.computeVertexNormals();
    geo.computeBoundingSphere();
    return geo;
  }

  // Une matière de Three pour une matière du GLB : Lambert (la lumière du jeu), la couleur de base
  // (linéaire, telle quelle), l'émission, les couleurs par sommet du sol, l'eau et la glace
  // translucides, la toile et les feuillages sur les deux faces.
  function matiere(THREE, G, idx, aCouleurs, cache, teinte) {
    const cle = idx + ':' + (aCouleurs ? 'c' : 'u') + (teinte ? 't' : '');
    if (cache.has(cle)) return cache.get(cle);
    const m = (G.materials || [])[idx] || {};
    const pbr = m.pbrMetallicRoughness || {};
    // Les matières dont la couleur vient d'un noeud (le feuillage teinté par objet, l'herbe, les
    // fleurs) n'ont pas de facteur dans le GLB : leur couleur de base, par nom (sRGB vers linéaire) ;
    // quand la teinte vient de l'instance (le GLB du jeu), la matière reste blanche.
    const lin = h => [1, 3, 5].map(i => { const v = parseInt(h.slice(i, i + 2), 16) / 255; return v <= 0.04045 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); }).concat([1]);
    const DEFAUT = { mo_feuillage: '#5f9a56', mo_herbe: '#7fb06a', mo_fleur: '#e0c8e8', mo_bruyere: '#8a6f8a', mo_nuages: '#f4f6fb', mo_toile: '#ece6d6', mo_sol: '#d9d9d9', mo_objets_cuits: '#ffffff' };
    const base = teinte ? [1, 1, 1, 1] : (pbr.baseColorFactor || (DEFAUT[m.name] ? lin(DEFAUT[m.name]) : [0.8, 0.8, 0.8, 1]));
    const em = m.emissiveFactor || [0, 0, 0];
    const force = Math.min(3, ((m.extensions || {}).KHR_materials_emissive_strength || {}).emissiveStrength || 1);
    const nom = m.name || '';
    const eau = /eau|glace|chute|cristal|brume/.test(nom);
    const mat = new THREE.MeshLambertMaterial({
      color: new THREE.Color(base[0], base[1], base[2]),
      emissive: new THREE.Color(em[0] * force, em[1] * force, em[2] * force),
      vertexColors: !!aCouleurs,
      transparent: eau || base[3] < 1,
      opacity: eau ? 0.72 : base[3],
      side: /toile|feuillage|fougere|herbe|roseau|fleur|chute/.test(nom) ? THREE.DoubleSide : THREE.FrontSide,
      fog: true,
    });
    if (/brume/.test(nom)) mat.visible = false;
    mat.name = nom;
    cache.set(cle, mat);
    return mat;
  }

  // Les matrices du monde de chaque noeud, par maillage : { indexMaillage: [Matrix4, ...] } ; la
  // teinte d'une instance (extras.teinte, linéaire) est accrochée à sa matrice.
  function instances(THREE, G) {
    const par = new Map();
    const visiter = (idx, parent) => {
      const n = G.nodes[idx];
      const m = new THREE.Matrix4();
      if (n.matrix) m.fromArray(n.matrix);
      else {
        const t = n.translation || [0, 0, 0], r = n.rotation || [0, 0, 0, 1], s = n.scale || [1, 1, 1];
        m.compose(new THREE.Vector3(t[0], t[1], t[2]), new THREE.Quaternion(r[0], r[1], r[2], r[3]), new THREE.Vector3(s[0], s[1], s[2]));
      }
      m.premultiply(parent);
      if (n.mesh != null) {
        if (!par.has(n.mesh)) par.set(n.mesh, []);
        const te = n.extras && n.extras.teinte;
        if (te && te.length >= 3) m.teinte = te;
        par.get(n.mesh).push(m);
      }
      for (const c of n.children || []) visiter(c, m);
    };
    const scene = G.scenes[G.scene || 0];
    for (const idx of scene.nodes || []) visiter(idx, new THREE.Matrix4());
    return par;
  }

  // La découpe par tuile (u, v en unités du jeu) : Three.js ne dessine que ce qui entre dans le
  // champ, tuile par tuile ; sans elle, une InstancedMesh (jamais écartée dans Three r149) et un
  // grand maillage (sa sphère couvre l'île) sont dessinés en entier à chaque image.
  const TUILE = 60;
  const tuileDe = (x, z) => Math.floor(x / TUILE) + ':' + Math.floor(z / TUILE);

  // Un grand maillage découpé par tuile : un index par tuile (les attributs partagés), la sphère
  // englobante de chaque tuile calculée sur ses propres sommets (computeBoundingSphere prendrait
  // tout l'attribut de position).
  function parTuiles(THREE, geo, seuil) {
    const idx = geo.index, pos = geo.getAttribute('position');
    const nTri = Math.floor((idx ? idx.count : pos.count) / 3);
    if (nTri < seuil) return [geo];
    const tuiles = new Map();
    for (let t = 0; t < nTri; t++) {
      const a = idx ? idx.array[3 * t] : 3 * t, b = idx ? idx.array[3 * t + 1] : 3 * t + 1, c = idx ? idx.array[3 * t + 2] : 3 * t + 2;
      const k = tuileDe((pos.getX(a) + pos.getX(b) + pos.getX(c)) / 3, (pos.getZ(a) + pos.getZ(b) + pos.getZ(c)) / 3);
      if (!tuiles.has(k)) tuiles.set(k, []);
      tuiles.get(k).push(a, b, c);
    }
    const out = [];
    for (const ind of tuiles.values()) {
      const g = new THREE.BufferGeometry();
      for (const n of ['position', 'normal', 'color']) if (geo.getAttribute(n)) g.setAttribute(n, geo.getAttribute(n));
      g.setIndex(new THREE.BufferAttribute(pos.count > 65535 ? new Uint32Array(ind) : new Uint16Array(ind), 1));
      let x0 = Infinity, y0 = Infinity, z0 = Infinity, x1 = -Infinity, y1 = -Infinity, z1 = -Infinity;
      for (const i of ind) { const x = pos.getX(i), y = pos.getY(i), z = pos.getZ(i); if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; if (z < z0) z0 = z; if (z > z1) z1 = z; }
      const cx = (x0 + x1) / 2, cy = (y0 + y1) / 2, cz = (z0 + z1) / 2;
      let r2 = 0;
      for (const i of ind) { const dx = pos.getX(i) - cx, dy = pos.getY(i) - cy, dz = pos.getZ(i) - cz; const d = dx * dx + dy * dy + dz * dz; if (d > r2) r2 = d; }
      g.boundingSphere = new THREE.Sphere(new THREE.Vector3(cx, cy, cz), Math.sqrt(r2));
      out.push(g);
    }
    return out;
  }

  // Les instances d'une forme groupées par tuile : une InstancedMesh par tuile, écartée du champ
  // par sa propre sphère (le centre des instances, le rayon jusqu'à la plus lointaine plus la forme
  // à son échelle), portée par une copie de la géométrie (Three lit la sphère de la géométrie).
  function instancesParTuiles(THREE, geo, mat, mats, teintable, nom) {
    const groupes = new Map();
    for (const m of mats) { const k = tuileDe(m.elements[12], m.elements[14]); if (!groupes.has(k)) groupes.set(k, []); groupes.get(k).push(m); }
    const rBase = (geo.boundingSphere && geo.boundingSphere.radius) || 1;
    const out = [];
    for (const liste of groupes.values()) {
      let cx = 0, cy = 0, cz = 0;
      for (const m of liste) { cx += m.elements[12]; cy += m.elements[13]; cz += m.elements[14]; }
      cx /= liste.length; cy /= liste.length; cz /= liste.length;
      let r = 0;
      for (const m of liste) {
        const e = m.elements;
        const ech = Math.sqrt(Math.max(e[0] * e[0] + e[1] * e[1] + e[2] * e[2], e[4] * e[4] + e[5] * e[5] + e[6] * e[6], e[8] * e[8] + e[9] * e[9] + e[10] * e[10]));
        const dx = e[12] - cx, dy = e[13] - cy, dz = e[14] - cz;
        r = Math.max(r, Math.sqrt(dx * dx + dy * dy + dz * dz) + rBase * ech);
      }
      const g = groupes.size > 1 ? geo.clone() : geo;
      g.boundingSphere = new THREE.Sphere(new THREE.Vector3(cx, cy, cz), r);
      const o = new THREE.InstancedMesh(g, mat, liste.length);
      liste.forEach((m, k) => o.setMatrixAt(k, m));
      o.instanceMatrix.needsUpdate = true;
      if (teintable) {
        // La couleur d'instance multiplie la matière (blanche pour le semis teinté).
        const c = new THREE.Color();
        liste.forEach((m, k) => { const t = m.teinte || [1, 1, 1]; c.setRGB(t[0], t[1], t[2]); o.setColorAt(k, c); });
        if (o.instanceColor) o.instanceColor.needsUpdate = true;
      }
      o.frustumCulled = true;
      o.name = nom + ' x' + liste.length;
      out.push(o);
    }
    return out;
  }

  // Le semis fusionné par tuile : chaque instance d'une forme est cuite (ses sommets transformés par
  // sa matrice, ses normales par la rotation, sa teinte ou la couleur de sa matière en couleur par
  // sommet) dans le maillage de sa tuile et de son genre (feuillage à deux faces, ou le reste) : un
  // appel de dessin par tuile et par genre au lieu d'un par forme (une InstancedMesh par forme et
  // par tuile faisait 77 appels par image ; les formes du semis sont petites, la copie coûte peu).
  function fusionner(THREE, G, prim, geo, mats, teintable, nomMat, fusion) {
    const pos = geo.getAttribute('position'), nrm = geo.getAttribute('normal'), col = geo.getAttribute('color'), idx = geo.index;
    const m = (G.materials || [])[prim.material] || {};
    const pbr = m.pbrMetallicRoughness || {};
    const lin = h => [1, 3, 5].map(i => { const v = parseInt(h.slice(i, i + 2), 16) / 255; return v <= 0.04045 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); });
    const DEFAUT = { mo_feuillage: '#5f9a56', mo_herbe: '#7fb06a', mo_fleur: '#e0c8e8', mo_bruyere: '#8a6f8a', mo_toile: '#ece6d6' };
    const base = teintable ? [1, 1, 1] : (pbr.baseColorFactor ? pbr.baseColorFactor.slice(0, 3) : (DEFAUT[nomMat] ? lin(DEFAUT[nomMat]) : [0.8, 0.8, 0.8]));
    const genre = /toile|feuillage|fougere|herbe|roseau|fleur/.test(nomMat) ? 'double' : 'simple';
    const n = pos.count;
    for (const mat of mats) {
      const e = mat.elements;
      const k = tuileDe(e[12], e[14]) + '|' + genre;
      let f = fusion.get(k);
      if (!f) { f = { genre, pos: [], nrm: [], col: [], idx: [], nVert: 0 }; fusion.set(k, f); }
      const t = teintable && mat.teinte ? mat.teinte : base;
      const d = f.nVert;
      for (let i = 0; i < n; i++) {
        const x = pos.getX(i), y = pos.getY(i), z = pos.getZ(i);
        f.pos.push(e[0] * x + e[4] * y + e[8] * z + e[12], e[1] * x + e[5] * y + e[9] * z + e[13], e[2] * x + e[6] * y + e[10] * z + e[14]);
        if (nrm) {
          const a = nrm.getX(i), b = nrm.getY(i), c = nrm.getZ(i);
          let nx = e[0] * a + e[4] * b + e[8] * c, ny = e[1] * a + e[5] * b + e[9] * c, nz = e[2] * a + e[6] * b + e[10] * c;
          const l = Math.hypot(nx, ny, nz) || 1;
          f.nrm.push(nx / l, ny / l, nz / l);
        } else f.nrm.push(0, 1, 0);
        if (col) f.col.push(t[0] * col.getX(i), t[1] * col.getY(i), t[2] * col.getZ(i));
        else f.col.push(t[0], t[1], t[2]);
      }
      if (idx) for (let i = 0; i < idx.count; i++) f.idx.push(d + idx.array[i]);
      else for (let i = 0; i < n; i++) f.idx.push(d + i);
      f.nVert += n;
    }
  }

  // Les maillages du semis fusionné, un par tuile et par genre, avec leur sphère.
  function maillagesFusionnes(THREE, fusion) {
    const out = [];
    for (const [k, f] of fusion) {
      const g = new THREE.BufferGeometry();
      g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(f.pos), 3));
      g.setAttribute('normal', new THREE.BufferAttribute(new Float32Array(f.nrm), 3));
      g.setAttribute('color', new THREE.BufferAttribute(new Float32Array(f.col), 3));
      g.setIndex(new THREE.BufferAttribute(f.nVert > 65535 ? new Uint32Array(f.idx) : new Uint16Array(f.idx), 1));
      g.computeBoundingSphere();
      const mat = new THREE.MeshLambertMaterial({ color: new THREE.Color(1, 1, 1), vertexColors: true, side: f.genre === 'double' ? THREE.DoubleSide : THREE.FrontSide, fog: true });
      mat.name = 'semis_' + f.genre;
      const o = new THREE.Mesh(g, mat);
      o.name = 'semis ' + k;
      out.push(o);
    }
    return out;
  }

  // Le groupe de Three du GLB : les grands maillages uniques en Mesh par tuile, le semis fusionné
  // par tuile et par genre, les formes qui émettent (les lucioles) en InstancedMesh par tuile.
  // `opts.teinte(u, v, nomMaillage, teinte)` : un style peut reteindre une instance avant la cuisson
  // des couleurs (le feuillage d'automne des Mailles du style Lisière, 3.25) ; rend la nouvelle
  // teinte (linéaire) ou null.
  function construire(THREE, glb, opts) {
    const { json: G, bin } = glb;
    const groupe = new THREE.Group();
    groupe.name = 'mo_monde';
    const cache = new Map();
    const fusion = new Map();
    let appels = 0, triangles = 0;
    for (const [mi, mats] of instances(THREE, G)) {
      const mesh = G.meshes[mi];
      if (opts && opts.teinte) for (const m of mats) { const t = m.teinte ? opts.teinte(m.elements[12], m.elements[14], mesh.name || '', m.teinte) : null; if (t) m.teinte = t; }
      for (const prim of mesh.primitives || []) {
        const geo = geometrie(THREE, G, bin, prim);
        if (!geo) continue;
        // Une matière du semis (feuillage, herbe, fleur, bruyère) prend la teinte de l'instance
        // (extras.teinte) sur une base blanche ; les autres (le tronc) gardent leur couleur.
        const nomMat = ((G.materials || [])[prim.material] || {}).name || '';
        const teintable = mats.some(m => m.teinte) && /feuillage|herbe|fleur|bruyere/.test(nomMat);
        const mat = matiere(THREE, G, prim.material, !!geo.getAttribute('color'), cache, teintable);
        const nTri = (geo.index ? geo.index.count : geo.getAttribute('position').count) / 3;
        const nom = mesh.name || ('maillage_' + mi);
        if (mats.length === 1 && !teintable) {
          // Un maillage unique posé par sa matrice ; les grands (plus de 2 000 triangles) par tuile.
          // Les sommets sont lus dans le repère du maillage : la découpe vaut pour une matrice
          // identité ou une translation (le cas de nos exports) ; sinon, le maillage entier.
          const e = mats[0].elements;
          const simple = Math.abs(e[0] - 1) < 1e-6 && Math.abs(e[5] - 1) < 1e-6 && Math.abs(e[10] - 1) < 1e-6 && Math.abs(e[1]) + Math.abs(e[2]) + Math.abs(e[4]) + Math.abs(e[6]) + Math.abs(e[8]) + Math.abs(e[9]) < 1e-6;
          const morceaux = simple ? parTuiles(THREE, geo, 2000) : [geo];
          morceaux.forEach((g, k) => {
            const o = new THREE.Mesh(g, mat);
            o.matrixAutoUpdate = false;
            o.matrix.copy(mats[0]);
            o.name = morceaux.length > 1 ? `${nom} t${k}` : nom;
            groupe.add(o);
            appels++;
          });
          triangles += nTri;
        } else {
          const em = ((G.materials || [])[prim.material] || {}).emissiveFactor;
          if (em && (em[0] + em[1] + em[2]) > 0) {
            for (const o of instancesParTuiles(THREE, geo, mat, mats, teintable, nom)) { groupe.add(o); appels++; }
          } else fusionner(THREE, G, prim, geo, mats, teintable, nomMat, fusion);
          triangles += nTri * mats.length;
        }
      }
    }
    for (const o of maillagesFusionnes(THREE, fusion)) { groupe.add(o); appels++; }
    groupe.userData.appels = appels;
    groupe.userData.triangles = Math.round(triangles);
    return groupe;
  }

  // Pose le monde modelé dans la scène de l'île et retire le sol, le décor, l'eau, les falaises et
  // le dessous dessinés par le code (la boucle d'images ne touche plus qu'à des objets hors scène).
  async function poser(THREE, ile, scene, url) {
    const glb = await lire(url || source());
    const groupe = construire(THREE, glb, { teinte: ile.nuit && typeof ile.nuit.teinteGlb === 'function' ? (u, v, nom, t) => ile.nuit.teinteGlb(u, v, nom, t) : null });
    const retirer = o => { if (o && o.parent) o.parent.remove(o); };
    for (const t of ile.tuilesSol || []) { retirer(t.proche); retirer(t.loin); }
    for (const t of ile.tuilesDecor || []) { retirer(t.groupe); retirer(t.sil); }
    for (const H of [ile.herbe, ile.fleurs]) if (H && H.mesh) retirer(H.mesh);
    retirer(ile.eau);
    for (const m of ile.decorFixe || []) retirer(m);
    retirer(ile.meshEscarpement); retirer(ile.meshFalaise); retirer(ile.meshChute);
    scene.add(groupe);
    ile.monde = groupe;
    console.log(`Ervane : monde modelé posé, ${groupe.userData.appels} appels, ${groupe.userData.triangles} triangles`);
    return groupe;
  }

  // La vue tactique du combat (ile-3d.js) : le semis, l'eau, les objets posés, les fils et les
  // agrafes se cachent (comme le décor dessiné par le code) ; le sol, la falaise et les lignes
  // (murets, haies, sentiers) restent, le damier des cases se dessine par-dessus.
  function tactique(groupe, on) {
    if (!groupe) return;
    for (const o of groupe.children) o.visible = !on || /^mo_(sol|falaise|lignes)/.test(o.name);
  }

  // Le sol mouillé du style Lisière (3.25) : le sol et les lignes du monde modelé assombris d'un
  // facteur f (1 : sec) ; les matières sont partagées entre les tuiles, chacune n'est touchée qu'une
  // fois, sa couleur sèche gardée.
  function mouiller(groupe, f) {
    if (!groupe) return;
    const vues = new Set();
    for (const o of groupe.children) {
      if (!/^mo_(sol|lignes)/.test(o.name) || !o.material || !o.material.color || vues.has(o.material)) continue;
      vues.add(o.material);
      const m = o.material;
      if (!m.userData.couleurSeche) m.userData.couleurSeche = m.color.clone();
      m.color.copy(m.userData.couleurSeche).multiplyScalar(f);
    }
  }

  // Les portées depuis le point visé c = {x, y} (en u) : les tuiles dont la sphère est tout entière
  // au-delà ne se dessinent plus. `p.sol` pour le sol (la brume du style Lisière l'a pris au-delà de
  // `solMax`), `p.semis` pour le semis fusionné (la portée des silhouettes du décor dessiné par le
  // code), `p.reste` pour les objets, les lignes, l'eau, les agrafes et les fils ; Infinity rend tout.
  // La caméra basse du style Lisière voit loin : sans ces portées, elle dessinait tout le GLB dans
  // la brume.
  function portee(groupe, c, p) {
    if (!groupe) return;
    for (const o of groupe.children) {
      const s = o.geometry && o.geometry.boundingSphere;
      if (!s) continue;
      // La falaise : une fois et demie la portée du sol (la brume l'a prise bien avant).
      const max = /^mo_sol/.test(o.name) ? p.sol : /^semis /.test(o.name) ? p.semis : /^mo_falaise/.test(o.name) ? (Number.isFinite(p.sol) ? p.sol * 1.5 : Infinity) : p.reste;
      o.visible = !Number.isFinite(max) || Math.hypot(s.center.x - c.x, s.center.z - c.y) - s.radius < max;
    }
  }

  return { source, lire, analyser, construire, poser, parTuiles, tactique, mouiller, portee, TUILE };
})();
if (typeof module !== 'undefined' && module.exports) module.exports = IleGlb;
