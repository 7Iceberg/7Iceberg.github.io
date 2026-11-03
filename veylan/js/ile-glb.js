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
  // Le monde d'un plateau (`rendu.monde` de sa définition, assets/monde/ervane.glb pour Ervane) à
  // côté des scripts, en local comme en ligne ; l'empreinte de version du script (?v=..., posée par
  // tools/make-online.sh) suit le fichier : un cache ne sert plus un vieux monde.
  function source(fichier) {
    let src = fichier || 'assets/monde/ervane.glb';
    try {
      const ref = document.querySelector('script[src*="ile-charge.js"]') || document.querySelector('script[src*="ile-3d.js"]');
      if (ref && ref.src) { const u = new URL(ref.src); src = new URL('../' + src, u).href + u.search; }
    } catch (e) { /* chemin relatif */ }
    return src;
  }

  // Le fichier, par fetch ; en local (file:), par XMLHttpRequest, que fetch refuse. Aussi pour les
  // textures précuites (IleModeles.lireKtx).
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

  // Les attributs compacts (la passe de mémoire, 3.32) : les normales sur un octet par composante,
  // les couleurs sur deux (sans palier visible dans les ombres, en lumière linéaire), tous normalisés
  // (Three les ramène à leurs valeurs, getX compris) et sur quatre composantes : un pas de 4 ou 8
  // octets, que Metal (Safari) prend tel quel. 4 octets par sommet au lieu de 12 pour une normale,
  // 8 au lieu de 12 pour une couleur.
  function normalesCompactes(THREE, a, k = 3) {
    const n = Math.floor(a.length / k), N = new Int8Array(n * 4);
    for (let i = 0; i < n; i++) {
      const x = a[i * k], y = a[i * k + 1], z = a[i * k + 2], l = Math.hypot(x, y, z) || 1;
      N[i * 4] = Math.round(x / l * 127); N[i * 4 + 1] = Math.round(y / l * 127); N[i * 4 + 2] = Math.round(z / l * 127);
    }
    return new THREE.BufferAttribute(N, 4, true);
  }
  // Les couleurs entre 0 et 1 seulement (sinon null : l'attribut reste tel quel).
  function couleursCompactes(THREE, a, k = 3) {
    const n = Math.floor(a.length / k), C = new Uint16Array(n * 4);
    for (let i = 0; i < n * k; i++) if (!(a[i] >= 0 && a[i] <= 1.0001)) return null;
    for (let i = 0; i < n; i++) {
      for (let c = 0; c < 3; c++) C[i * 4 + c] = Math.round(Math.min(1, a[i * k + c]) * 65535);
      C[i * 4 + 3] = k === 4 ? Math.round(Math.min(1, a[i * k + 3]) * 65535) : 65535;
    }
    return new THREE.BufferAttribute(C, 4, true);
  }
  function compacter(THREE, geo) {
    const nrm = geo.getAttribute('normal'), col = geo.getAttribute('color');
    if (nrm && nrm.array instanceof Float32Array && (nrm.itemSize === 3 || nrm.itemSize === 4)) geo.setAttribute('normal', normalesCompactes(THREE, nrm.array, nrm.itemSize));
    if (col && col.array instanceof Float32Array && (col.itemSize === 3 || col.itemSize === 4)) { const c = couleursCompactes(THREE, col.array, col.itemSize); if (c) geo.setAttribute('color', c); }
    return geo;
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
    return compacter(THREE, geo);
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
      g.setAttribute('normal', normalesCompactes(THREE, f.nrm));
      g.setAttribute('color', couleursCompactes(THREE, f.col) || new THREE.BufferAttribute(new Float32Array(f.col), 3));
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

  // Le semis Meshy (js/ile-modeles.js, 3.32) : chaque instance d'une forme de base remplacée devient
  // le modèle choisi pour elle (selon son genre, sa teinte et un hasard fixe tiré de sa place),
  // tourné au hasard, à la hauteur de la forme, un peu enfoncé (pas de jour sous le pied sur une
  // pente), cuit dans le maillage de sa tuile : positions, normales, UV de l'atlas. Rend le nombre de
  // triangles posés (0 : la forme reste telle qu'exportée).
  const hache = (x, z, k) => { const v = Math.sin(x * 12.9898 + z * 78.233 + k * 37.719) * 43758.5453; return v - Math.floor(v); };
  // Cuit un modèle dans le maillage de sa tuile : ses sommets tournés de `a` autour de Y, mis à
  // l'échelle `k`, enfoncés de `enf`, puis portés par la matrice `e` (colonnes, comme Matrix4).
  // `kx` : un étirement le long de l'axe x du modèle (les segments d'un muret ajustés à leur tronçon) ;
  // `ky` = -1 retourne le modèle tête en bas (les cristaux pendus sous le rebord de l'île).
  function cuire(fusionS, M, e, a, k, enf, kx = 1, ky = 1) {
    const ca = Math.cos(a), sa = Math.sin(a), cle = tuileDe(e[12], e[14]) + '|' + (M.atlas || 0);
    let f = fusionS.get(cle);
    if (!f) { f = { pos: [], nrm: [], uv: [], idx: [], n: 0, bornes: [], atlas: M.atlas || 0 }; fusionS.set(cle, f); }
    const P = M.pos, N = M.nrm, U = M.uv, d = f.n;
    f.bornes.push([d, f.idx.length]);
    for (let i = 0; i < M.n; i++) {
      const px = P[i * 3] * kx, py = P[i * 3 + 1], pz = P[i * 3 + 2];
      const lx = k * (ca * px + sa * pz), ly = k * py * ky + enf, lz = k * (-sa * px + ca * pz);
      f.pos.push(e[0] * lx + e[4] * ly + e[8] * lz + e[12], e[1] * lx + e[5] * ly + e[9] * lz + e[13], e[2] * lx + e[6] * ly + e[10] * lz + e[14]);
      const qx = ca * N[i * 3] + sa * N[i * 3 + 2], qy = N[i * 3 + 1] * ky, qz = -sa * N[i * 3] + ca * N[i * 3 + 2];
      const nx = e[0] * qx + e[4] * qy + e[8] * qz, ny = e[1] * qx + e[5] * qy + e[9] * qz, nz = e[2] * qx + e[6] * qy + e[10] * qz;
      const l = Math.hypot(nx, ny, nz) || 1;
      f.nrm.push(nx / l, ny / l, nz / l);
      f.uv.push(U[i * 2], U[i * 2 + 1]);
    }
    for (let i = 0; i < M.idx.length; i++) f.idx.push(d + M.idx[i]);
    f.n += M.n;
    return M.idx.length / 3;
  }

  // Les instances d'une forme remplacée : rend { tri, restes } (les instances gardées telles
  // qu'exportées, quand le genre en laisse).
  function semerMeshy(G, mesh, mats, S, genre, fusionS) {
    const g = S.genres[genre], restes = [];
    if (!g) return { tri: 0, restes: mats };
    let haut = 0;
    for (const p of mesh.primitives || []) { const a = G.accessors[p.attributes.POSITION]; if (a && a.max) haut = Math.max(haut, a.max[1]); }
    if (!(haut > 0)) return { tri: 0, restes: mats };
    let tri = 0;
    for (const m of mats) {
      const e = m.elements, x = e[12], z = e[14];
      const nom = g.modele(m.teinte, hache(x, z, 1), x, z), M = nom && S.modeles[nom];
      if (!M) { restes.push(m); continue; }
      // La hauteur voulue : en u (`absolu`, l'échelle de l'instance défaite) ou celle de la forme.
      const sy = Math.hypot(e[4], e[5], e[6]) || 1, abs = g.absolu && g.absolu[nom];
      const k = abs ? abs / (M.hauteur * sy) : haut / M.hauteur * (g.facteur || 1);
      tri += cuire(fusionS, M, e, hache(x, z, 2) * Math.PI * 2, k, -0.06 * (abs ? abs / sy : haut));
    }
    return { tri, restes };
  }

  // Les objets posés (IleModeles.poses) : { nom, x, y, z, a, k }.
  function poserMeshy(S, fusionS, compte) {
    let tri = 0;
    const e = [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1];
    for (const p of S.poses || []) {
      const M = S.modeles[p.nom];
      if (!M) continue;
      e[12] = p.x; e[13] = p.y; e[14] = p.z;
      tri += cuire(fusionS, M, e, p.a, p.k, 0, p.kx || 1, p.ky || 1);
      if (compte) compte[p.nom] = (compte[p.nom] || 0) + 1;
    }
    return tri;
  }

  // Les maillages du semis Meshy, un ou plusieurs par tuile (65 535 sommets au plus : des index sur
  // 16 bits), avec la matière de l'atlas ; nommés « semis » (la portée du semis, la carte de l'île qui
  // les réunit d'en haut, la vue tactique qui les cache). Les sommets sont compacts : les positions
  // sur deux octets par composante autour du centre du morceau (sa matrice les remet à l'échelle :
  // un millième d'unité près), les normales sur un octet, les UV de l'atlas sur deux (un trentième de
  // pixel), 16 octets par sommet au lieu de 32.
  function maillagesMeshy(THREE, fusionS, mats) {
    const out = [];
    for (const [k, f] of fusionS) {
      // Un morceau réunit des instances entières (leurs triangles ne touchent que leurs sommets).
      const morceaux = [], b = f.bornes.concat([[f.n, f.idx.length]]);
      let v0 = 0, i0 = 0;
      for (let q = 1; q < b.length; q++) {
        if (b[q][0] - v0 > 65535 && b[q - 1][0] > v0) { morceaux.push([v0, b[q - 1][0], i0, b[q - 1][1]]); v0 = b[q - 1][0]; i0 = b[q - 1][1]; }
      }
      morceaux.push([v0, f.n, i0, f.idx.length]);
      morceaux.forEach(([v0, v1, i0, i1], q) => {
        const geo = new THREE.BufferGeometry(), n = v1 - v0;
        let x0 = Infinity, y0 = Infinity, z0 = Infinity, x1 = -Infinity, y1 = -Infinity, z1 = -Infinity;
        for (let i = v0 * 3; i < v1 * 3; i += 3) {
          const x = f.pos[i], y = f.pos[i + 1], z = f.pos[i + 2];
          if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; if (z < z0) z0 = z; if (z > z1) z1 = z;
        }
        const cx = (x0 + x1) / 2, cy = (y0 + y1) / 2, cz = (z0 + z1) / 2, ech = Math.max(1e-3, (x1 - x0) / 2, (y1 - y0) / 2, (z1 - z0) / 2);
        const P = new Int16Array(n * 4);
        for (let i = 0; i < n; i++) {
          const j = (v0 + i) * 3;
          P[i * 4] = Math.round((f.pos[j] - cx) / ech * 32767); P[i * 4 + 1] = Math.round((f.pos[j + 1] - cy) / ech * 32767); P[i * 4 + 2] = Math.round((f.pos[j + 2] - cz) / ech * 32767);
        }
        geo.setAttribute('position', new THREE.BufferAttribute(P, 4, true));
        geo.setAttribute('normal', normalesCompactes(THREE, f.nrm.slice(v0 * 3, v1 * 3)));
        const U = new Uint16Array(n * 2);
        for (let i = 0; i < n * 2; i++) U[i] = Math.round(Math.min(1, Math.max(0, f.uv[v0 * 2 + i])) * 65535);
        geo.setAttribute('uv', new THREE.BufferAttribute(U, 2, true));
        const I = new Uint16Array(i1 - i0);
        for (let i = i0; i < i1; i++) I[i - i0] = f.idx[i] - v0;
        geo.setIndex(new THREE.BufferAttribute(I, 1));
        geo.computeBoundingSphere();
        const o = new THREE.Mesh(geo, mats[f.atlas] || mats[0]);
        o.matrixAutoUpdate = false;
        o.matrix.makeScale(ech, ech, ech).setPosition(cx, cy, cz);
        o.matrixWorldNeedsUpdate = true;
        o.name = 'semis meshy ' + k + (q ? ' ' + q : '');
        out.push(o);
      });
    }
    return out;
  }

  // Le groupe de Three du GLB : les grands maillages uniques en Mesh par tuile, le semis fusionné
  // par tuile et par genre, les formes qui émettent (les lucioles) en InstancedMesh par tuile.
  // `opts.teinte(u, v, nomMaillage, teinte)` : un style peut reteindre une instance avant la cuisson
  // des couleurs (le feuillage d'automne des Mailles du style Lisière, 3.25) ; rend la nouvelle
  // teinte (linéaire) ou null. `opts.cacher(u, v)` : vrai là où une instance du semis de l'export
  // (`base_*`) n'a plus sa place (sous une parcelle posée après l'export, T.closA).
  function construire(THREE, glb, opts) {
    const { json: G, bin } = glb;
    const groupe = new THREE.Group();
    groupe.name = 'mo_monde';
    const cache = new Map();
    const fusion = new Map(), fusionS = new Map();
    let appels = 0, triangles = 0, caches = 0;
    for (const [mi, matsTous] of instances(THREE, G)) {
      const mesh = G.meshes[mi];
      let mats = matsTous;
      if (opts && opts.cacher && /^base_/.test(mesh.name || '')) {
        const n0 = mats.length;
        mats = mats.filter(m => !opts.cacher(m.elements[12], m.elements[14]));
        caches += n0 - mats.length;
        if (!mats.length) continue;
      }
      if (opts && opts.teinte) for (const m of mats) { const t = m.teinte ? opts.teinte(m.elements[12], m.elements[14], mesh.name || '', m.teinte) : null; if (t) m.teinte = t; }
      // Le semis Meshy (opts.semis, js/ile-modeles.js) : la forme remplacée par son modèle.
      const genre = opts && opts.semis && opts.semis.formes[mesh.name];
      if (genre) {
        const r = semerMeshy(G, mesh, mats, opts.semis, genre, fusionS);
        triangles += r.tri;
        if (!r.restes.length) continue;
        mats = r.restes;
      }
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
    if (opts && opts.semis) {
      const poses = {};
      triangles += poserMeshy(opts.semis, fusionS, poses);
      let octets = 0;
      for (const o of maillagesMeshy(THREE, fusionS, opts.semis.mats || [opts.semis.mat])) {
        groupe.add(o); appels++;
        for (const a of Object.values(o.geometry.attributes)) octets += a.array.byteLength;
        octets += o.geometry.index.array.byteLength;
      }
      groupe.userData.semisMeshy = { tuiles: new Set([...fusionS.keys()].map(k => k.split('|')[0])).size, maillages: fusionS.size, octets, poses };
    }
    groupe.userData.appels = appels;
    groupe.userData.triangles = Math.round(triangles);
    groupe.userData.caches = caches;
    return groupe;
  }

  // Pose le monde modelé dans la scène de l'île et retire le sol, le décor, l'eau, les falaises et
  // le dessous dessinés par le code (la boucle d'images ne touche plus qu'à des objets hors scène).
  // `opts.semis` : le semis Meshy (IleModeles.chargerSemis), qui remplace les arbres, rochers et
  // buissons de l'export.
  async function poser(THREE, ile, scene, url, opts) {
    const src = url || source();
    const glb = await lire(src);
    const semis = opts && opts.semis;
    const T = ile.T, cacher = T && typeof T.closA === 'function' ? (u, v) => T.closA(u, v) : null;
    const groupe = construire(THREE, glb, { semis, cacher, teinte: ile.nuit && typeof ile.nuit.teinteGlb === 'function' ? (u, v, nom, t) => ile.nuit.teinteGlb(u, v, nom, t) : null });
    groupe.userData.source = src;
    // La mémoire de la scène (Ile3D.stats) : le semis Meshy cuit et son atlas.
    if (semis && groupe.userData.semisMeshy) { ile.octetsGeo = (ile.octetsGeo || 0) + groupe.userData.semisMeshy.octets; ile.octetsTex = (ile.octetsTex || 0) + semis.octets.tex; }
    // Et le reste du monde modelé (le sol, les objets, les lignes, les agrafes, les fils, le semis de
    // l'export), compté depuis la passe de mémoire (3.32) : une fois par tampon, les tuiles d'un même
    // maillage partageant leurs attributs.
    {
      const vus = new Set();
      let n = 0;
      const compter = a => { if (a && a.array && !vus.has(a.array)) { vus.add(a.array); n += a.array.byteLength; } };
      groupe.traverse(o => {
        if (!o.geometry || /^semis meshy /.test(o.name)) return;
        for (const a of Object.values(o.geometry.attributes)) compter(a);
        compter(o.geometry.index);
        if (o.isInstancedMesh) { compter(o.instanceMatrix); compter(o.instanceColor); }
      });
      groupe.userData.octetsMonde = n;
      ile.octetsGeo = (ile.octetsGeo || 0) + n;
    }
    const retirer = o => { if (o && o.parent) o.parent.remove(o); };
    for (const t of ile.tuilesSol || []) { retirer(t.proche); retirer(t.loin); }
    for (const t of ile.tuilesDecor || []) { retirer(t.groupe); retirer(t.sil); }
    for (const H of [ile.herbe, ile.fleurs]) if (H && H.mesh) retirer(H.mesh);
    retirer(ile.eau);
    for (const m of ile.decorFixe || []) retirer(m);
    retirer(ile.meshEscarpement); retirer(ile.meshFalaise); retirer(ile.meshChute);
    // Le sol, le décor, l'eau, la falaise et le dessous dessinés par le code ne servent plus : leurs
    // tampons quittent la carte graphique et leur poids sort de la mémoire de la scène (Ile3D.stats),
    // qui les avait comptés (Ile3D.construire). La chute et les herbes, non comptées, restent telles.
    if (typeof Ile3D === 'function' && Ile3D.octetsGeo) {
      const geos = new Set();
      const prendre = o => { if (o) o.traverse(x => { if (x.geometry) geos.add(x.geometry); }); };
      for (const t of ile.tuilesSol || []) { prendre(t.proche); prendre(t.loin); }
      for (const t of ile.tuilesDecor || []) { prendre(t.groupe); prendre(t.sil); }
      prendre(ile.eau);
      for (const m of ile.decorFixe || []) prendre(m);
      let libere = 0;
      for (const g of geos) { libere += Ile3D.octetsGeo(g); g.dispose(); }
      ile.octetsGeo = Math.max(0, (ile.octetsGeo || 0) - libere);
      groupe.userData.libere = libere;
      // Leurs textures aussi (la passe de mémoire, 3.32) : celles du sol peint (les matières, les
      // cartes de poids, la teinte, le grain), de l'eau, de la falaise, des rochers et des feuillages du
      // code. Aucune matière de la scène ne s'en sert plus ; les salles du Puits font les leurs, la
      // lueur (les combats), les nuages, les bancs et le halo restent. Les uniformes qui les tenaient
      // sont vidés, pour que la mémoire du navigateur les rende aussi.
      // Le poids, compté comme à leur création (Ile3D.construire) : les toiles avec leurs mipmaps, les
      // cartes de données selon les leurs.
      const tex = ile.tex || {}, toiles = ['eau', 'touchesLin', 'falaise', 'touches', 'feuilles'], libres = new Set();
      let libereTex = 0;
      for (const k of ['matieres', 'poids1', 'poids2', 'teinte', 'grain', ...toiles]) {
        const t = tex[k];
        if (!t || !t.isTexture) continue;
        const im = t.image || {};
        libereTex += (im.width || 0) * (im.height || 0) * (im.depth || 1) * 4 * (toiles.includes(k) || t.generateMipmaps ? 1.33 : 1);
        t.dispose();
        libres.add(t);
        tex[k] = null;
      }
      const vider = m => {
        if (!m) return;
        for (const c of ['map', 'emissiveMap', 'alphaMap']) if (libres.has(m[c])) m[c] = null;
        if (m.uniforms) for (const u of Object.values(m.uniforms)) if (u && libres.has(u.value)) u.value = null;
      };
      for (const m of Object.values(ile.mats || {})) if (m && m.isMaterial) vider(m);
      if (ile.mats && ile.mats.uSol) for (const u of Object.values(ile.mats.uSol)) if (u && libres.has(u.value)) u.value = null;
      if (ile.eau) ile.eau.traverse(o => { if (o.material) [].concat(o.material).forEach(vider); });
      ile.octetsTex = Math.max(0, (ile.octetsTex || 0) - libereTex);
      groupe.userData.libereTex = libereTex;
    }
    scene.add(groupe);
    ile.monde = groupe;
    // La grille du combat (5.4) sur le sol, les pavés et les lignes (sentiers, murets, haies) du
    // monde modelé : les cases de l'aire se dessinent dans la matière, avec les uniformes du sol de
    // l'île (IleSol.grille). Les lignes partagent la matière cuite des objets : elles en reçoivent
    // une copie, les objets restent sans grille (revue : un sentier couvrait les cases de départ).
    if (typeof IleSol === 'object' && IleSol.grille && ile.mats && ile.mats.uSol) {
      const vues = new Map();
      for (const o of groupe.children) {
        if (!o.material || !/^mo_(sol|lignes)/.test(o.name)) continue;
        const lignes = /^mo_lignes/.test(o.name);
        if (!vues.has(o.material)) {
          const m = lignes ? o.material.clone() : o.material;
          if (lignes) m.name = o.material.name + '_lignes';
          vues.set(o.material, IleSol.grille(m, ile.mats.uSol));
        }
        o.material = vues.get(o.material);
      }
    }
    console.log(`Ervane : monde modelé posé, ${groupe.userData.appels} appels, ${groupe.userData.triangles} triangles` + (groupe.userData.semisMeshy ? `, semis Meshy sur ${groupe.userData.semisMeshy.tuiles} tuiles` : ''));
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
      const s0 = o.geometry && o.geometry.boundingSphere;
      if (!s0) continue;
      // La sphère dans le repère du monde (le semis Meshy est mis à l'échelle par sa matrice),
      // calculée une fois : ces maillages ne bougent pas.
      let s = o.userData.sphereMonde;
      if (!s) { s = o.userData.sphereMonde = s0.clone().applyMatrix4(o.matrix); }
      // La falaise : une fois et demie la portée du sol (la brume l'a prise bien avant).
      const max = /^mo_sol/.test(o.name) ? p.sol : /^semis /.test(o.name) ? p.semis : /^mo_falaise/.test(o.name) ? (Number.isFinite(p.sol) ? p.sol * 1.5 : Infinity) : p.reste;
      o.visible = !Number.isFinite(max) || Math.hypot(s.center.x - c.x, s.center.z - c.y) - s.radius < max;
    }
  }

  return { source, octets, lire, analyser, construire, poser, parTuiles, tactique, mouiller, portee, TUILE };
})();
if (typeof module !== 'undefined' && module.exports) module.exports = IleGlb;
