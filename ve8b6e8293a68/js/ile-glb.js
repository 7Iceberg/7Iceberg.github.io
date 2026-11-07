const IleGlb = (() => {
  function source(fichier) {
    let src = fichier || 'assets/monde/ervane.glb';
    try {
      const ref = document.querySelector('script[src*="ile-charge.js"]') || document.querySelector('script[src*="ile-3d.js"]');
      if (ref && ref.src) { const u = new URL(ref.src); src = new URL('../' + src, u).href + u.search; }
    } catch (e) {   }
    return src;
  }

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

  function normalesCompactes(THREE, a, k = 3) {
    const n = Math.floor(a.length / k), N = new Int8Array(n * 4);
    for (let i = 0; i < n; i++) {
      const x = a[i * k], y = a[i * k + 1], z = a[i * k + 2], l = Math.hypot(x, y, z) || 1;
      N[i * 4] = Math.round(x / l * 127); N[i * 4 + 1] = Math.round(y / l * 127); N[i * 4 + 2] = Math.round(z / l * 127);
    }
    return new THREE.BufferAttribute(N, 4, true);
  }
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

  function matiere(THREE, G, idx, aCouleurs, cache, teinte) {
    const cle = idx + ':' + (aCouleurs ? 'c' : 'u') + (teinte ? 't' : '');
    if (cache.has(cle)) return cache.get(cle);
    const m = (G.materials || [])[idx] || {};
    const pbr = m.pbrMetallicRoughness || {};
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

  const TUILE = 60;
  const tuileDe = (x, z) => Math.floor(x / TUILE) + ':' + Math.floor(z / TUILE);

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

  function maillagesFusionnes(THREE, fusion, ronds) {
    const out = [];
    let matRond = null;
    for (const [k, f] of fusion) {
      const g = new THREE.BufferGeometry();
      g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(f.pos), 3));
      g.setAttribute('normal', normalesCompactes(THREE, f.nrm));
      g.setAttribute('color', couleursCompactes(THREE, f.col) || new THREE.BufferAttribute(new Float32Array(f.col), 3));
      g.setIndex(new THREE.BufferAttribute(f.nVert > 65535 ? new Uint32Array(f.idx) : new Uint16Array(f.idx), 1));
      g.computeBoundingSphere();
      let mat;
      if (f.genre === 'rond') mat = matRond || (matRond = matiereRonde(THREE, ronds && ronds.cfg));
      else {
        mat = new THREE.MeshLambertMaterial({ color: new THREE.Color(1, 1, 1), vertexColors: true, side: f.genre === 'double' ? THREE.DoubleSide : THREE.FrontSide, fog: true });
        mat.name = 'semis_' + f.genre;
      }
      const o = new THREE.Mesh(g, mat);
      o.name = 'semis ' + k;
      out.push(o);
    }
    return out;
  }

  const hache = (x, z, k) => { const v = Math.sin(x * 12.9898 + z * 78.233 + k * 37.719) * 43758.5453; return v - Math.floor(v); };
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

  const SPHERES = [];
  function sphere(det) {
    if (SPHERES[det]) return SPHERES[det];
    const t = (1 + Math.sqrt(5)) / 2, V = [];
    const ajouter = (x, y, z) => { const l = Math.hypot(x, y, z); V.push([x / l, y / l, z / l]); return V.length - 1; };
    for (const p of [[-1, t, 0], [1, t, 0], [-1, -t, 0], [1, -t, 0], [0, -1, t], [0, 1, t], [0, -1, -t], [0, 1, -t], [t, 0, -1], [t, 0, 1], [-t, 0, -1], [-t, 0, 1]]) ajouter(p[0], p[1], p[2]);
    let F = [[0, 11, 5], [0, 5, 1], [0, 1, 7], [0, 7, 10], [0, 10, 11], [1, 5, 9], [5, 11, 4], [11, 10, 2], [10, 7, 6], [7, 1, 8], [3, 9, 4], [3, 4, 2], [3, 2, 6], [3, 6, 8], [3, 8, 9], [4, 9, 5], [2, 4, 11], [6, 2, 10], [8, 6, 7], [9, 8, 1]];
    for (let d = 0; d < det; d++) {
      const mil = new Map(), suite = [];
      const m = (a, b) => { const k = a < b ? a * 65536 + b : b * 65536 + a; if (!mil.has(k)) mil.set(k, ajouter((V[a][0] + V[b][0]) / 2, (V[a][1] + V[b][1]) / 2, (V[a][2] + V[b][2]) / 2)); return mil.get(k); };
      for (const [a, b, c] of F) { const ab = m(a, b), bc = m(b, c), ca = m(c, a); suite.push([a, ab, ca], [b, bc, ab], [c, ca, bc], [ab, bc, ca]); }
      F = suite;
    }
    return (SPHERES[det] = { V, F });
  }
  const linHex = h => [1, 3, 5].map(i => { const v = parseInt(h.slice(i, i + 2), 16) / 255; return v <= 0.04045 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); });
  const FORMES_RONDES = {
    large: { tronc: [0.34, 0.06, 0.034], coeurs: [[0.56, 0.28]], autour: [4, 5], loin: [0.17, 0.25], bas: [0.42, 0.58], rayon: [0.17, 0.22], sommet: [0.78, 0.18], ecrase: 0.86 },
    haut: { tronc: [0.42, 0.05, 0.03], coeurs: [[0.5, 0.21], [0.68, 0.18]], autour: [3, 3], loin: [0.1, 0.15], bas: [0.44, 0.7], rayon: [0.12, 0.15], sommet: [0.84, 0.13], ecrase: 0.94 },
    petit: { tronc: [0.3, 0.055, 0.034], coeurs: [[0.54, 0.28]], autour: [3, 3], loin: [0.15, 0.2], bas: [0.44, 0.58], rayon: [0.15, 0.19], sommet: [0.76, 0.16], ecrase: 0.86 },
    lisiere: { tronc: [0.26, 0.05, 0.03], coeurs: [[0.52, 0.3]], autour: [3, 4], loin: [0.2, 0.28], bas: [0.4, 0.54], rayon: [0.2, 0.25], sommet: [0.76, 0.19], ecrase: 0.84 },
    bosquet: { tronc: [0.24, 0.05, 0.03], coeurs: [[0.52, 0.32]], autour: [2, 2], loin: [0.2, 0.26], bas: [0.42, 0.52], rayon: [0.2, 0.25], sommet: [0.76, 0.2], ecrase: 0.84 },
    rocher: { tronc: [0.02, 0.02, 0.02], coeurs: [[0.32, 0.36]], autour: [3, 4], loin: [0.24, 0.34], bas: [0.18, 0.3], rayon: [0.18, 0.26], sommet: [0.56, 0.22], ecrase: 0.7 },
  };
  function arbreRond(forme, graine, cfg, det, detCoeur) {
    let s = (graine * 7919 + 104729) % 233280;
    const r = () => { s = (s * 9301 + 49297) % 233280; return s / 233280; };
    const F = FORMES_RONDES[forme], boules = [];
    for (const [y, rb] of F.coeurs) boules.push({ c: [(r() - 0.5) * 0.04, y, (r() - 0.5) * 0.04], r: rb * (0.95 + r() * 0.1), det: detCoeur });
    const n = F.autour[0] + Math.floor(r() * (F.autour[1] - F.autour[0] + 1)), a0 = r() * Math.PI * 2;
    for (let i = 0; i < n; i++) {
      const a = a0 + (i + (r() - 0.5) * 0.45) * Math.PI * 2 / n, d = F.loin[0] + r() * (F.loin[1] - F.loin[0]);
      boules.push({ c: [Math.cos(a) * d, F.bas[0] + r() * (F.bas[1] - F.bas[0]), Math.sin(a) * d], r: F.rayon[0] + r() * (F.rayon[1] - F.rayon[0]), det });
    }
    boules.push({ c: [(r() - 0.5) * 0.08, F.sommet[0], (r() - 0.5) * 0.08], r: F.sommet[1], det });
    let cy = 0, w = 0;
    for (const b of boules) { const v = b.r * b.r * b.r; cy += b.c[1] * v; w += v; }
    cy /= w;
    let RC = 0, y0 = Infinity, y1 = -Infinity;
    for (const b of boules) { RC = Math.max(RC, Math.hypot(b.c[0], b.c[1] - cy, b.c[2]) + b.r); y0 = Math.min(y0, b.c[1] - b.r * F.ecrase); y1 = Math.max(y1, b.c[1] + b.r * F.ecrase); }
    const P = cfg.palettes, pal = [P.vert.map(linHex), P.automne.map(linHex)], tr = cfg.tronc.map(linHex);
    const pos = [], nrm = [], col = [[], []], idx = [];
    const lisse = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
    const [th, r0, r1] = F.tronc, pans = 6;
    for (let i = 0; i <= pans; i++) {
      const a = i / pans * Math.PI * 2, ca = Math.cos(a), sa = Math.sin(a);
      for (const [y, rr, t] of [[-0.05, r0 * 1.25, 0], [th, r1, 1]]) {
        pos.push(ca * rr, y, sa * rr); nrm.push(ca, 0.25, sa);
        for (let p = 0; p < 2; p++) for (let c = 0; c < 3; c++) col[p].push(tr[0][c] + (tr[1][c] - tr[0][c]) * t);
      }
    }
    for (let i = 0; i < pans; i++) { const a = i * 2; idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2); }
    const E = cfg.masse, bosse = cfg.bosse;
    boules.forEach((b, q) => {
      const S = sphere(b.det), d = pos.length / 3, teint = 1 + (r() - 0.5) * cfg.ecart;
      for (const u of S.V) {
        const h = Math.sin(u[0] * 41.3 + u[1] * 17.9 + u[2] * 29.7 + q * 7.1) * 43758.5453;
        const k = 1 + bosse * ((h - Math.floor(h)) - 0.5);
        const x = b.c[0] + u[0] * b.r * k, y = b.c[1] + u[1] * b.r * k * F.ecrase, z = b.c[2] + u[2] * b.r * k;
        pos.push(x, y, z);
        let ox = x, oy = (y - cy) * 1.1, oz = z;
        const lo = Math.hypot(ox, oy, oz) || 1, bx = u[0], by = u[1] / F.ecrase, bz = u[2], lb = Math.hypot(bx, by, bz);
        let nx = bx / lb * (1 - E) + ox / lo * E, ny = by / lb * (1 - E) + oy / lo * E, nz = bz / lb * (1 - E) + oz / lo * E;
        const ln = Math.hypot(nx, ny, nz) || 1;
        nx /= ln; ny /= ln; nz /= ln;
        nrm.push(nx, ny, nz);
        const haut = (y - y0) / (y1 - y0), dehors = Math.hypot(x, y - cy, z) / RC;
        const t = Math.min(1, Math.max(0, 0.42 + 0.5 * ny + 0.3 * (haut - 0.5)));
        let ao = cfg.coeur + (1 - cfg.coeur) * lisse(0.3, 0.92, dehors);
        for (let o = 0; o < boules.length; o++) {
          if (o === q) continue;
          const v = boules[o], dd = Math.hypot(x - v.c[0], (y - v.c[1]) / F.ecrase, z - v.c[2]) / v.r;
          if (dd < 1.4) ao *= cfg.pli + (1 - cfg.pli) * lisse(1.0, 1.4, dd);
        }
        for (let p = 0; p < 2; p++) {
          const [o, m, l] = pal[p];
          for (let c = 0; c < 3; c++) col[p].push((t < 0.5 ? o[c] + (m[c] - o[c]) * t * 2 : m[c] + (l[c] - m[c]) * (t - 0.5) * 2) * ao * teint);
        }
      }
      for (const f of S.F) idx.push(d + f[0], d + f[1], d + f[2]);
    });
    let hauteur = 0;
    for (let i = 1; i < pos.length; i += 3) hauteur = Math.max(hauteur, pos[i]);
    return { pos, nrm, col: col[0], colA: col[1], idx, n: pos.length / 3, hauteur };
  }
  function preparerRonds(cfg) {
    const modeles = {};
    for (const f of Object.keys(FORMES_RONDES)) {
      modeles[f] = [];
      for (let v = 0; v < cfg.variantes; v++) modeles[f].push(arbreRond(f, v + 1 + f.length * 31, cfg, cfg.detail, cfg.detailCoeur));
    }
    return { cfg, modeles };
  }
  function cuireRond(fusion, M, e, a, k, enf, automne, cleForcee) {
    const ca = Math.cos(a), sa = Math.sin(a), cle = cleForcee != null ? cleForcee : tuileDe(e[12], e[14]) + '|rond';
    let f = fusion.get(cle);
    if (!f) { f = { genre: 'rond', pos: [], nrm: [], col: [], idx: [], nVert: 0 }; fusion.set(cle, f); }
    const P = M.pos, N = M.nrm, C = automne ? M.colA : M.col, d = f.nVert;
    for (let i = 0; i < M.n; i++) {
      const px = P[i * 3], py = P[i * 3 + 1], pz = P[i * 3 + 2];
      const lx = k * (ca * px + sa * pz), ly = k * py + enf, lz = k * (-sa * px + ca * pz);
      f.pos.push(e[0] * lx + e[4] * ly + e[8] * lz + e[12], e[1] * lx + e[5] * ly + e[9] * lz + e[13], e[2] * lx + e[6] * ly + e[10] * lz + e[14]);
      const qx = ca * N[i * 3] + sa * N[i * 3 + 2], qy = N[i * 3 + 1], qz = -sa * N[i * 3] + ca * N[i * 3 + 2];
      const nx = e[0] * qx + e[4] * qy + e[8] * qz, ny = e[1] * qx + e[5] * qy + e[9] * qz, nz = e[2] * qx + e[6] * qy + e[10] * qz;
      const l = Math.hypot(nx, ny, nz) || 1;
      f.nrm.push(nx / l, ny / l, nz / l);
      f.col.push(Math.min(1, C[i * 3]), Math.min(1, C[i * 3 + 1]), Math.min(1, C[i * 3 + 2]));
    }
    for (let i = 0; i < M.idx.length; i++) f.idx.push(d + M.idx[i]);
    f.nVert += M.n;
    return M.idx.length / 3;
  }

  const GLSL_BRUIT_R = `
float hashR(vec3 p) { p = fract(p * 0.3183099 + 0.1); p *= 17.0; return fract(p.x * p.y * p.z * (p.x + p.y + p.z)); }
float bruitR(vec3 x) {
  vec3 i = floor(x), f = fract(x); f = f * f * (3.0 - 2.0 * f);
  return mix(mix(mix(hashR(i), hashR(i + vec3(1.0, 0.0, 0.0)), f.x), mix(hashR(i + vec3(0.0, 1.0, 0.0)), hashR(i + vec3(1.0, 1.0, 0.0)), f.x), f.y),
             mix(mix(hashR(i + vec3(0.0, 0.0, 1.0)), hashR(i + vec3(1.0, 0.0, 1.0)), f.x), mix(hashR(i + vec3(0.0, 1.0, 1.0)), hashR(i + vec3(1.0, 1.0, 1.0)), f.x), f.y), f.z);
}
`;
  function matiereRonde(THREE, cfg) {
    const F = (cfg && cfg.feuilles) || { frequence: 1.8, relief: 0.5, sombre: 0.78 };
    const mat = new THREE.MeshLambertMaterial({ color: new THREE.Color(1, 1, 1), vertexColors: true, fog: true });
    mat.name = 'semis_rond';
    mat.onBeforeCompile = sh => {
      sh.uniforms.uFeuilles = { value: new THREE.Vector3(F.frequence, F.relief, F.sombre) };
      sh.vertexShader = 'varying vec3 vPosR;\n' + sh.vertexShader.replace('#include <begin_vertex>', '#include <begin_vertex>\n  vPosR = position;');
      sh.fragmentShader = 'uniform vec3 uFeuilles;\nvarying vec3 vPosR;\n' + GLSL_BRUIT_R + sh.fragmentShader
        .replace('#include <color_fragment>', '#include <color_fragment>\n  float feR = bruitR(vPosR * uFeuilles.x) * 0.6 + bruitR(vPosR * uFeuilles.x * 2.3 + 7.1) * 0.4;\n  diffuseColor.rgb *= mix(uFeuilles.z, 1.0, smoothstep(0.28, 0.62, feR));')
        .replace('#include <normal_fragment_begin>', '#include <normal_fragment_begin>\n  vec3 qR = vPosR * uFeuilles.x * 1.3;\n  normal = normalize(normal + (vec3(bruitR(qR + 3.1), bruitR(qR + 11.7), bruitR(qR + 23.3)) - 0.5) * uFeuilles.y);');
    };
    mat.customProgramCacheKey = () => 'semis-rond-1';
    return mat;
  }

  const lisse01 = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
  const h2 = (x, z) => { const v = Math.sin(x * 127.1 + z * 311.7) * 43758.5453; return v - Math.floor(v); };
  function bruit2(x, z) {
    const xi = Math.floor(x), zi = Math.floor(z), fx = x - xi, fz = z - zi, ux = fx * fx * (3 - 2 * fx), uz = fz * fz * (3 - 2 * fz);
    const a = h2(xi, zi), b = h2(xi + 1, zi), c = h2(xi, zi + 1), d = h2(xi + 1, zi + 1);
    return a + (b - a) * ux + (c - a) * uz + (a - b - c + d) * ux * uz;
  }
  const fbm2 = (x, z) => bruit2(x, z) * 0.55 + bruit2(x * 2.03 + 17.1, z * 2.03 + 3.7) * 0.3 + bruit2(x * 4.1 + 9.3, z * 4.1 + 21.5) * 0.15;
  const melange = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
  function espacer(pts, pas) {
    const out = [pts[0]];
    let acc = 0;
    for (let i = 1; i < pts.length; i++) {
      const a = pts[i - 1], b = pts[i];
      acc += Math.hypot(b[0] - a[0], b[1] - a[1]);
      if (acc >= pas) { out.push(b); acc = 0; }
    }
    return out;
  }
  const FOG_PLAFOND = `#ifdef USE_FOG
  #ifdef FOG_EXP2
    float fogFactor = 1.0 - exp( - fogDensity * fogDensity * vFogDepth * vFogDepth );
  #else
    float fogFactor = smoothstep( fogNear, fogFar, vFogDepth );
  #endif
  gl_FragColor.rgb = mix( gl_FragColor.rgb, fogColor, min( fogFactor, uBrumeMax ) );
#endif`;
  function plafonnerBrume(mat, max, cle) {
    const avant = mat.onBeforeCompile;
    mat.onBeforeCompile = (sh, r) => {
      if (avant) avant(sh, r);
      sh.uniforms.uBrumeMax = { value: max };
      sh.fragmentShader = 'uniform float uBrumeMax;\n' + sh.fragmentShader.replace('#include <fog_fragment>', FOG_PLAFOND);
    };
    mat.customProgramCacheKey = () => cle;
    return mat;
  }
  function lointain(THREE, ile, cfg, cfgArbres) {
    const T = ile.T;
    if (!T || !Array.isArray(T.contour) || T.contour.length < 8 || typeof T.videA !== 'function') return null;
    const tel = !!ile.telephone, pas = tel ? cfg.pasTel : cfg.pas;
    const P = espacer(T.contour, pas), N = P.length;
    if (N < 8) return null;
    const H = (u, v) => { const h = T.hauteurA(u, v); return Number.isFinite(h) ? h : NaN; };
    const tan = i => { const a = P[(i - 1 + N) % N], b = P[(i + 1) % N]; const tx = b[0] - a[0], tz = b[1] - a[1], l = Math.hypot(tx, tz) || 1; return [tx / l, tz / l]; };
    let vote = 0;
    for (let i = 0; i < N; i++) {
      const [tx, tz] = tan(i), p = P[i];
      const de = T.videA(p[0] + tz * 2.5, p[1] - tx * 2.5), dd = T.videA(p[0] - tz * 2.5, p[1] + tx * 2.5);
      if (de && !dd) vote++; else if (dd && !de) vote--;
    }
    const sens = vote >= 0 ? 1 : -1;
    const n0 = P.map((p, i) => { const [tx, tz] = tan(i); return [tz * sens, -tx * sens]; });
    const lisseN = w => {
      if (w < 1) return n0;
      const out = [];
      for (let i = 0; i < N; i++) {
        let x = 0, z = 0;
        for (let j = -w; j <= w; j++) { const q = n0[((i + j) % N + N) % N]; x += q[0]; z += q[1]; }
        const l = Math.hypot(x, z) || 1;
        out.push([x / l, z / l]);
      }
      return out;
    };
    const hE = P.map((p, i) => { for (const r of [2.5, 4, 6, 9]) { const h = H(p[0] - n0[i][0] * r, p[1] - n0[i][1] * r); if (Number.isFinite(h)) return h; } return NaN; });
    let hm = 0, nh = 0;
    for (const h of hE) if (Number.isFinite(h)) { hm += h; nh++; }
    hm = nh ? hm / nh : 0;
    for (let i = 0; i < N; i++) if (!Number.isFinite(hE[i])) hE[i] = hm;
    const hL = hE.map((_, i) => (hE[(i - 2 + N) % N] + 2 * hE[(i - 1 + N) % N] + 3 * hE[i] + 2 * hE[(i + 1) % N] + hE[(i + 2) % N]) / 9);
    let cx = 0, cz = 0;
    for (const p of P) { cx += p[0]; cz += p[1]; }
    cx /= N; cz /= N;
    const haut = (d, i, x, z) => {
      if (d <= 0) return hL[i] - cfg.sousBord;
      const base = hm - cfg.creux;
      const coll = (fbm2(x / cfg.colline, z / cfg.colline) - 0.5) * 2 * cfg.collines * lisse01(6, 60, d);
      const a = Math.atan2(z - cz, x - cx);
      const crete = 1 - Math.abs(2 * fbm2(Math.cos(a) * 3.2 + 50, Math.sin(a) * 3.2 + 50) - 1);
      let mont = cfg.montagnes * (0.2 + 0.8 * Math.pow(crete, 1.7)) * (0.55 + 0.45 * fbm2(x / 90, z / 90)) * lisse01(cfg.pied[0], cfg.pied[1], d);
      for (const V of voisins) if (V.montagnes != null) mont *= 1 + (V.montagnes - 1) * poidsVoisin(V, a, d);
      return hL[i] + (base - hL[i]) * lisse01(0, cfg.descente, d) - cfg.levre * (1 - lisse01(0, 8, d)) + coll + mont;
    };
    const pal = {};
    for (const k of Object.keys(cfg.couleurs)) pal[k] = [].concat(cfg.couleurs[k]).map(linHex);
    const voisins = (cfg.pays || []).map(V => Object.assign({ ouverture: 50, depuis: 110, force: 0.85 }, V, { pal: Object.fromEntries(Object.entries(V.couleurs || {}).map(([k, v]) => [k, [].concat(v).map(linHex)])) }));
    const poidsVoisin = (V, a, d) => { const da = Math.abs(((a * 180 / Math.PI - V.az) % 360 + 540) % 360 - 180); return (1 - lisse01(V.ouverture * 0.45, V.ouverture, da)) * lisse01(V.depuis, V.depuis + 160, d) * V.force; };
    const E = cfg.etalonnage, cT = new THREE.Color(), hsl = {};
    const etalonne = hex => {
      cT.set(hex).getHSL(hsl);
      let { h, s: sa, l } = hsl;
      if (E && h > E.vert[0] && h < E.vert[1] && sa > 0.16 && l < 0.72) { h += (E.vertTeinte - h) * E.vertVers; sa = Math.min(1, sa * E.vertSat + 0.04); l *= E.vertLum; }
      cT.setHSL(h, sa, l).convertSRGBToLinear();
      return [cT.r, cT.g, cT.b];
    };
    const regions = (ile.def && ile.def.regions) || [], parRegion = new Map();
    const presA = i => {
      const u = Math.floor(P[i][0] - n0[i][0] * 4), v = Math.floor(P[i][1] - n0[i][1] * 4);
      const k = T.region && u >= 0 && v >= 0 && u < T.W && v < T.H ? T.region[v * T.W + u] : 255, R = regions[k];
      if (!R || !R.palette || !R.palette.herbe) return null;
      if (!parRegion.has(k)) { const a = etalonne(R.palette.herbe[0]), b = etalonne(R.palette.herbe[1]); parRegion.set(k, melange(a, b, 0.5).map(x => x * cfg.presBord)); }
      return parRegion.get(k);
    };
    const pres0 = P.map((_, i) => presA(i));
    const presL = P.map((_, i) => {
      let r = 0, g = 0, b = 0, n = 0;
      for (let j = -4; j <= 4; j++) { const c = pres0[((i + j) % N + N) % N]; if (c) { r += c[0]; g += c[1]; b += c[2]; n++; } }
      return n ? [r / n, g / n, b / n] : melange(pal.pres[0], pal.pres[1], 0.5);
    });
    const boisA = (x, z) => fbm2(x / 55 + 11, z / 55 + 5);
    const couleur = (d, x, z, h, i) => {
      let c = melange(pal.pres[0], pal.pres[1], fbm2(x / 30, z / 30));
      c = melange(c, presL[i], 1 - lisse01(8, 90, d));
      if (d > 36 && bruit2(x / 85 + 3.3, z / 85 + 7.7) > cfg.champs) {
        const k = Math.floor(h2(Math.floor(x / 26), Math.floor(z / 19)) * pal.champs.length) % pal.champs.length;
        c = melange(c, pal.champs[k], lisse01(36, 70, d));
      }
      c = melange(c, pal.foret[0], lisse01(cfg.bois - 0.05, cfg.bois + 0.05, boisA(x, z)) * lisse01(16, 40, d));
      const rel = h - hm;
      c = melange(c, pal.roche[0], lisse01(cfg.roche[0], cfg.roche[1], rel));
      c = melange(c, pal.neige[0], lisse01(cfg.neige[0], cfg.neige[1], rel));
      if (voisins.length) {
        const a = Math.atan2(z - cz, x - cx);
        for (const V of voisins) {
          const w = poidsVoisin(V, a, d);
          if (!(w > 0.001)) continue;
          const P2 = V.pal;
          let cv = P2.pres ? melange(P2.pres[0], P2.pres[P2.pres.length - 1], fbm2(x / 34 + 3, z / 34 + 9)) : c;
          if (P2.roche) cv = melange(cv, P2.roche[0], lisse01(cfg.roche[0] * 0.6, cfg.roche[1] * 0.8, rel));
          if (P2.neige) cv = melange(cv, P2.neige[0], lisse01(cfg.neige[0] * 0.5, cfg.neige[1] * 0.7, rel));
          c = melange(c, cv, w);
        }
      }
      return c;
    };
    const D = cfg.anneaux, K = D.length, nks = D.map(d => lisseN(Math.min(Math.floor(N / 3), Math.round(Math.max(0, d) * cfg.lissage / pas))));
    const posA = (k, i, d) => {
      const p = P[i], n = nks[k][i];
      let x = p[0] + n[0] * d, z = p[1] + n[1] * d;
      const r = lisse01(cfg.rond[0], cfg.rond[1], d);
      if (r > 0) { const vx = p[0] - cx, vz = p[1] - cz, l = Math.hypot(vx, vz) || 1; x += (cx + vx / l * (l + d) - x) * r; z += (cz + vz / l * (l + d) - z) * r; }
      return [x, z];
    };
    const pos = new Float32Array(N * K * 3), col = new Float32Array(N * K * 3);
    for (let k = 0; k < K; k++) for (let i = 0; i < N; i++) {
      const [x, z] = posA(k, i, D[k]), h = haut(D[k], i, x, z), o = (k * N + i) * 3, c = couleur(D[k], x, z, h, i);
      pos[o] = x; pos[o + 1] = h; pos[o + 2] = z;
      col[o] = Math.min(1, c[0]); col[o + 1] = Math.min(1, c[1]); col[o + 2] = Math.min(1, c[2]);
    }
    const idx = [];
    for (let k = 0; k < K - 1; k++) for (let i = 0; i < N; i++) {
      const a = k * N + i, b = k * N + (i + 1) % N, c = (k + 1) * N + i, e = (k + 1) * N + (i + 1) % N;
      idx.push(a, c, b, b, c, e);
    }
    let ny = 0;
    for (let t = 0; t < Math.min(idx.length, 3 * 400); t += 3) {
      const A = idx[t] * 3, B = idx[t + 1] * 3, Cc = idx[t + 2] * 3;
      const ux = pos[B] - pos[A], uz = pos[B + 2] - pos[A + 2], vx = pos[Cc] - pos[A], vz = pos[Cc + 2] - pos[A + 2];
      ny += uz * vx - ux * vz;
    }
    if (ny < 0) for (let t = 0; t < idx.length; t += 3) { const q = idx[t + 1]; idx[t + 1] = idx[t + 2]; idx[t + 2] = q; }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
    geo.setIndex(new THREE.BufferAttribute(N * K > 65535 ? new Uint32Array(idx) : new Uint16Array(idx), 1));
    geo.computeVertexNormals();
    geo.computeBoundingSphere();
    const matTerre = new THREE.MeshLambertMaterial({ color: new THREE.Color(1, 1, 1), vertexColors: true, fog: true });
    matTerre.onBeforeCompile = sh => {
      sh.vertexShader = 'varying vec3 vPosR;\n' + sh.vertexShader.replace('#include <begin_vertex>', '#include <begin_vertex>\n  vPosR = position;');
      sh.fragmentShader = 'varying vec3 vPosR;\n' + GLSL_BRUIT_R + sh.fragmentShader.replace('#include <color_fragment>', '#include <color_fragment>\n  diffuseColor.rgb *= 1.0 + (bruitR(vPosR * 0.55) - 0.5) * ' + cfg.grain.toFixed(3) + ' + (bruitR(vPosR * 2.1 + 5.0) - 0.5) * ' + (cfg.grain * 0.6).toFixed(3) + ';');
    };
    plafonnerBrume(matTerre, cfg.brumeMax, 'lointain-terre-2');
    matTerre.name = 'lointain_terre';
    const groupe = new THREE.Group();
    groupe.name = 'lointain';
    const terre = new THREE.Mesh(geo, matTerre);
    terre.name = 'lointain terre';
    terre.matrixAutoUpdate = false;
    groupe.add(terre);
    let triangles = idx.length / 3, octets = pos.byteLength + col.byteLength * 2 + geo.index.array.byteLength;
    const L = cfg.lisiere, sorties = (ile.world && ile.world.plateau && ile.world.plateau.sorties) || [];
    const libre = (x, z) => T.videA(x, z) && !sorties.some(s => Math.hypot(s.x - x, s.y - z) < L.trou);
    const places = [];
    const pasL = tel ? L.pasTel : L.pas, n3 = lisseN(3), forme = cfg.forme || null;
    let acc = 0;
    for (let i = 0; i < N; i++) {
      acc += pas;
      if (acc < pasL) continue;
      acc = h2(i, 0.7) * pasL * 0.5;
      L.rangs.forEach(([d0, d1, f], q) => {
        if (h2(i * 0.37, q + 2.9) < L.trous) return;
        const [tx, tz] = tan(i), gl = (h2(i * 5.3, q + 1.1) - 0.5) * pasL * 0.7;
        const d = d0 + (d1 - d0) * h2(i * 1.7, q * 13.1), x = P[i][0] + n3[i][0] * d + tx * gl, z = P[i][1] + n3[i][1] * d + tz * gl;
        if (!libre(x, z)) return;
        places.push({ x, z, h: haut(d, i, x, z), taille: L.taille[0] + (L.taille[1] - L.taille[0]) * h2(i * 3.1, q + 5.2), forme: forme || f, g: i * 7 + q, loin: q > 0 });
      });
    }
    if (Array.isArray(T.echancrure) && T.echancrure.length > 3) {
      const B = espacer(T.echancrure, pas), nB = B.length;
      const dedans = (x, z) => { let c = false; for (let i = 0, j = nB - 1; i < nB; j = i++) { const a = B[i], b = B[j]; if ((a[1] > z) !== (b[1] > z) && x < (b[0] - a[0]) * (z - a[1]) / (b[1] - a[1]) + a[0]) c = !c; } return c; };
      const hA = (x, z) => { let sh = 0, n = 0; for (let r = 4; r <= 12 && !n; r += 4) for (let a = 0; a < 12; a++) { const h = H(x + Math.cos(a * Math.PI / 6) * r, z + Math.sin(a * Math.PI / 6) * r); if (Number.isFinite(h)) { sh += h; n++; } } return n ? sh / n : hm; };
      const tri = THREE.ShapeUtils.triangulateShape(B.map(p => new THREE.Vector2(p[0], p[1])), []);
      if (tri.length) {
        const pB = new Float32Array(nB * 3), cB = new Float32Array(nB * 3), iB = [];
        B.forEach((p, k) => { const h = hA(p[0], p[1]) - cfg.levre - 0.4, c = melange(presL[0], pal.foret[0], 0.45); pB.set([p[0], h, p[1]], k * 3); cB.set(c, k * 3); });
        for (const t of tri) iB.push(t[0], t[1], t[2]);
        const A0 = iB[0] * 3, A1 = iB[1] * 3, A2 = iB[2] * 3;
        if ((pB[A1 + 2] - pB[A0 + 2]) * (pB[A2] - pB[A0]) - (pB[A1] - pB[A0]) * (pB[A2 + 2] - pB[A0 + 2]) < 0) for (let t = 0; t < iB.length; t += 3) { const q = iB[t + 1]; iB[t + 1] = iB[t + 2]; iB[t + 2] = q; }
        const gB = new THREE.BufferGeometry();
        gB.setAttribute('position', new THREE.BufferAttribute(pB, 3));
        gB.setAttribute('color', new THREE.BufferAttribute(cB, 3));
        gB.setIndex(iB);
        gB.computeVertexNormals();
        gB.computeBoundingSphere();
        const baie = new THREE.Mesh(gB, matTerre);
        baie.name = 'lointain baie';
        baie.matrixAutoUpdate = false;
        groupe.add(baie);
        triangles += iB.length / 3; octets += pB.byteLength * 2 + iB.length * 4;
        let x0 = Infinity, z0 = Infinity, x1 = -Infinity, z1 = -Infinity;
        for (const p of B) { x0 = Math.min(x0, p[0]); z0 = Math.min(z0, p[1]); x1 = Math.max(x1, p[0]); z1 = Math.max(z1, p[1]); }
        const pasB = tel ? 9 : 7;
        for (let z = z0 + pasB / 2; z < z1; z += pasB) for (let x = x0 + pasB / 2; x < x1; x += pasB) {
          const jx = x + (h2(x, z) - 0.5) * pasB * 0.6, jz = z + (h2(z, x) - 0.5) * pasB * 0.6;
          if (!dedans(jx, jz) || !libre(jx, jz)) continue;
          places.push({ x: jx, z: jz, h: hA(jx, jz) - cfg.levre - 0.4, taille: L.taille[0] + (L.taille[1] - L.taille[0]) * h2(jx * 0.3, jz), forme: forme || 'lisiere', g: 3000 + places.length });
        }
      }
    }
    const nB = tel ? cfg.bosquetsTel : cfg.bosquets;
    for (let t = 0, essais = 0; t < nB && essais < nB * 12; essais++) {
      const i = Math.floor(h2(essais * 1.13, 7.7) * N) % N, d = 22 + Math.pow(h2(essais * 2.71, 3.3), 1.6) * 238;
      let k = 0;
      while (k < K - 2 && D[k + 1] < d) k++;
      const [x, z] = posA(k, i, d);
      if (boisA(x, z) < cfg.bois + 0.02 || !libre(x, z)) continue;
      places.push({ x, z, h: haut(d, i, x, z), taille: L.taille[0] * 1.1 + (L.taille[1] - L.taille[0]) * h2(essais, 9.9), forme: forme || 'bosquet', g: 1000 + essais, loin: true });
      t++;
    }
    const ca = Object.assign({}, cfgArbres, cfg.arbres ? { palettes: Object.assign({}, cfgArbres.palettes, cfg.arbres) } : {});
    const modeles = {}, variante = (f, loin) => {
      const cle = f + (loin ? '-loin' : '');
      if (!modeles[cle]) {
        modeles[cle] = [];
        for (let v = 0; v < 3; v++) modeles[cle].push(arbreRond(f, 500 + v * 17 + f.length, ca, loin ? cfg.detailLoin : cfg.detail, loin ? cfg.detailLoin : cfg.detailCoeur));
      }
      return modeles[cle];
    };
    const secteurs = new Map(), NS = 16;
    for (const p of places) {
      const V = variante(p.forme, p.loin), M = V[Math.floor(h2(p.g, 1.3) * V.length) % V.length];
      const s = Math.floor(((Math.atan2(p.z - cz, p.x - cx) / (Math.PI * 2)) + 1) * NS) % NS;
      const e = [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, p.x, p.h - 0.3, p.z, 1];
      triangles += cuireRond(secteurs, M, e, h2(p.g, 4.4) * Math.PI * 2, p.taille / M.hauteur, 0, false, s);
    }
    const matArbres = plafonnerBrume(matiereRonde(THREE, ca), cfg.brumeMax, 'lointain-arbres-2');
    matArbres.name = 'lointain_arbres';
    const coupe = { cam: { value: new THREE.Vector3(0, -1e4, 0) }, cible: { value: new THREE.Vector3(0, -1e4, 1) }, rayon: { value: 0 } };
    const avantR = matArbres.onBeforeCompile;
    matArbres.onBeforeCompile = (sh, r) => {
      avantR(sh, r);
      sh.uniforms.uCoupeCam = coupe.cam; sh.uniforms.uCoupeCible = coupe.cible; sh.uniforms.uCoupeRayon = coupe.rayon;
      sh.fragmentShader = 'uniform vec3 uCoupeCam, uCoupeCible;\nuniform float uCoupeRayon;\n' + sh.fragmentShader.replace('#include <clipping_planes_fragment>', `#include <clipping_planes_fragment>
  if (uCoupeRayon > 0.0) {
    vec3 ab = uCoupeCible - uCoupeCam;
    float tC = clamp(dot(vPosR - uCoupeCam, ab) / max(dot(ab, ab), 1e-4), 0.0, 1.0);
    float k = 1.0 - smoothstep(uCoupeRayon * 0.75, uCoupeRayon, length(vPosR - (uCoupeCam + ab * tC)));
    vec2 fc = floor(gl_FragCoord.xy);
    float trame = fract(fc.x * 0.5 + fc.y * 0.25) + fract(fc.y * 0.5) * 0.125;
    if (tC < 0.985 && k > 0.0 && (k > 0.97 || trame < k)) discard;
  }`);
    };
    matArbres.userData.coupe = coupe;
    for (const [k, f] of secteurs) {
      const g = new THREE.BufferGeometry();
      g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(f.pos), 3));
      g.setAttribute('normal', normalesCompactes(THREE, f.nrm));
      g.setAttribute('color', couleursCompactes(THREE, f.col) || new THREE.BufferAttribute(new Float32Array(f.col), 3));
      g.setIndex(new THREE.BufferAttribute(f.nVert > 65535 ? new Uint32Array(f.idx) : new Uint16Array(f.idx), 1));
      g.computeBoundingSphere();
      const o = new THREE.Mesh(g, matArbres);
      o.name = 'lointain arbres ' + k;
      o.matrixAutoUpdate = false;
      groupe.add(o);
      octets += f.pos.length * 4 + f.nVert * 12 + f.idx.length * (f.nVert > 65535 ? 4 : 2);
    }
    return { groupe, triangles: Math.round(triangles), octets, arbres: places.length, anneaux: K, points: N, hm, loin: cfg.loin, coupe: matArbres.userData.coupe };
  }

  function semerMeshy(G, mesh, mats, S, genre, fusionS, facteur, ronds, fusion) {
    const g = S.genres[genre], restes = [];
    if (!g) return { tri: 0, restes: mats };
    const forme = ronds && ronds.cfg.formes[genre];
    let haut = 0;
    for (const p of mesh.primitives || []) { const a = G.accessors[p.attributes.POSITION]; if (a && a.max) haut = Math.max(haut, a.max[1]); }
    if (!(haut > 0)) return { tri: 0, restes: mats };
    let tri = 0;
    for (const m of mats) {
      const e = m.elements, x = e[12], z = e[14];
      const nom = g.modele(m.teinte, hache(x, z, 1), x, z), M = nom && S.modeles[nom];
      if (!M) { restes.push(m); continue; }
      if (facteur < 1 && hache(x, z, 3) >= facteur) continue;
      if (forme && /^arbre[23]?$/.test(nom) && !(S.sombre && S.sombre(x, z))) {
        const V = ronds.modeles[forme], R = V[Math.floor(hache(x, z, 4) * V.length) % V.length];
        tri += cuireRond(fusion, R, e, hache(x, z, 2) * Math.PI * 2, haut / R.hauteur * (ronds.cfg.facteur[genre] || 1), -0.06 * haut, nom === 'arbre3');
        ronds.poses = (ronds.poses || 0) + 1;
        continue;
      }
      const sy = Math.hypot(e[4], e[5], e[6]) || 1, abs = g.absolu && g.absolu[nom];
      const k = abs ? abs / (M.hauteur * sy) : haut / M.hauteur * (g.facteur || 1);
      tri += cuire(fusionS, M, e, hache(x, z, 2) * Math.PI * 2, k, -0.06 * (abs ? abs / sy : haut));
    }
    return { tri, restes };
  }

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

  function maillagesMeshy(THREE, fusionS, mats) {
    const out = [];
    for (const [k, f] of fusionS) {
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

  function construire(THREE, glb, opts) {
    const { json: G, bin } = glb;
    const groupe = new THREE.Group();
    groupe.name = 'mo_monde';
    const cache = new Map();
    const fusion = new Map(), fusionS = new Map();
    const ronds = opts && opts.semis && opts.arbres ? preparerRonds(opts.arbres) : null;
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
      const genre = opts && opts.semis && opts.semis.formes[mesh.name];
      if (genre) {
        const r = semerMeshy(G, mesh, mats, opts.semis, genre, fusionS, opts.facteurSemis > 0 ? opts.facteurSemis : 1, ronds, fusion);
        triangles += r.tri;
        if (!r.restes.length) continue;
        mats = r.restes;
      }
      for (const prim of mesh.primitives || []) {
        const geo = geometrie(THREE, G, bin, prim);
        if (!geo) continue;
        const nomMat = ((G.materials || [])[prim.material] || {}).name || '';
        const teintable = mats.some(m => m.teinte) && /feuillage|herbe|fleur|bruyere/.test(nomMat);
        const mat = matiere(THREE, G, prim.material, !!geo.getAttribute('color'), cache, teintable);
        const nTri = (geo.index ? geo.index.count : geo.getAttribute('position').count) / 3;
        const nom = mesh.name || ('maillage_' + mi);
        if (mats.length === 1 && !teintable) {
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
    for (const o of maillagesFusionnes(THREE, fusion, ronds)) { groupe.add(o); appels++; }
    if (opts && opts.semis) {
      const poses = {};
      triangles += poserMeshy(opts.semis, fusionS, poses);
      let octets = 0;
      for (const o of maillagesMeshy(THREE, fusionS, opts.semis.mats || [opts.semis.mat])) {
        groupe.add(o); appels++;
        for (const a of Object.values(o.geometry.attributes)) octets += a.array.byteLength;
        octets += o.geometry.index.array.byteLength;
      }
      groupe.userData.semisMeshy = { tuiles: new Set([...fusionS.keys()].map(k => k.split('|')[0])).size, maillages: fusionS.size, octets, poses, ronds: ronds ? ronds.poses || 0 : 0 };
    }
    groupe.userData.appels = appels;
    groupe.userData.triangles = Math.round(triangles);
    groupe.userData.caches = caches;
    return groupe;
  }

  async function poser(THREE, ile, scene, url, opts) {
    const src = url || source();
    const glb = await lire(src);
    const semis = opts && opts.semis;
    const T = ile.T, cacher = T && typeof T.closA === 'function' ? (u, v) => T.closA(u, v) : null;
    const groupe = construire(THREE, glb, { semis, arbres: opts && opts.arbres, cacher, facteurSemis: T && T.facteurSemis > 0 ? T.facteurSemis : 1, teinte: ile.nuit && typeof ile.nuit.teinteGlb === 'function' ? (u, v, nom, t) => ile.nuit.teinteGlb(u, v, nom, t) : null });
    groupe.userData.source = src;
    for (const o of [...groupe.children]) if (/^mo_eau/.test(o.name)) { groupe.remove(o); if (o.geometry) o.geometry.dispose(); }
    for (const o of [...groupe.children]) if (/^mo_falaise/.test(o.name)) { groupe.remove(o); if (o.geometry) o.geometry.dispose(); }
    const gardes = new Set([ile.meshFalaise, ...(ile.meshDessous || [])].filter(Boolean));
    if (semis && groupe.userData.semisMeshy) { ile.octetsGeo = (ile.octetsGeo || 0) + groupe.userData.semisMeshy.octets; ile.octetsTex = (ile.octetsTex || 0) + semis.octets.tex; }
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
    for (const m of ile.decorFixe || []) if (!gardes.has(m)) retirer(m);
    retirer(ile.meshEscarpement); retirer(ile.meshChute);
    if (typeof Ile3D === 'function' && Ile3D.octetsGeo) {
      const geos = new Set();
      const prendre = o => { if (o) o.traverse(x => { if (x.geometry) geos.add(x.geometry); }); };
      for (const t of ile.tuilesSol || []) { prendre(t.proche); prendre(t.loin); }
      for (const t of ile.tuilesDecor || []) { prendre(t.groupe); prendre(t.sil); }
      for (const m of ile.decorFixe || []) if (!gardes.has(m)) prendre(m);
      let libere = 0;
      for (const g of geos) { libere += Ile3D.octetsGeo(g); g.dispose(); }
      ile.octetsGeo = Math.max(0, (ile.octetsGeo || 0) - libere);
      groupe.userData.libere = libere;
      const tex = ile.tex || {}, toiles = ['touches', 'feuilles', 'lueur'], libres = new Set();
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
      if (ile.matEauRef && ile.matEauRef.uniforms.bord && !ile.matEauRef.uniforms.bord.value) {
        const blanc = new THREE.DataTexture(new Uint8Array([255, 255, 255, 255]), 1, 1, THREE.RGBAFormat, THREE.UnsignedByteType);
        blanc.needsUpdate = true;
        ile.matEauRef.uniforms.bord.value = blanc;
      }
      ile.octetsTex = Math.max(0, (ile.octetsTex || 0) - libereTex);
      groupe.userData.libereTex = libereTex;
    }
    scene.add(groupe);
    ile.monde = groupe;
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

  function tactique(groupe, on) {
    if (!groupe) return;
    for (const o of groupe.children) o.visible = !on || /^mo_(sol|falaise|lignes)/.test(o.name);
  }

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

  function portee(groupe, c, p) {
    if (!groupe) return;
    for (const o of groupe.children) {
      const s0 = o.geometry && o.geometry.boundingSphere;
      if (!s0) continue;
      let s = o.userData.sphereMonde;
      if (!s) { s = o.userData.sphereMonde = s0.clone().applyMatrix4(o.matrix); }
      const max = /^mo_sol/.test(o.name) ? p.sol : /^semis /.test(o.name) ? p.semis : /^mo_falaise/.test(o.name) ? (Number.isFinite(p.sol) ? p.sol * 1.5 : Infinity) : p.reste;
      o.visible = !Number.isFinite(max) || Math.hypot(s.center.x - c.x, s.center.z - c.y) - s.radius < max;
    }
  }

  return { source, octets, lire, analyser, construire, poser, parTuiles, tactique, mouiller, portee, arbreRond, lointain, TUILE };
})();
if (typeof module !== 'undefined' && module.exports) module.exports = IleGlb;
