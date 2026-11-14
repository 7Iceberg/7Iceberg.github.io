const IlePeauPieces = (() => {
  const DEG = Math.PI / 180;
  const ENCRE = '#2a161b', TRAIT = 0.003;
  const APLAT = 0.62;
  const IRIS = { dessin: null, ambre: '#c98a2b', noisette: '#8a5a2b', vert: '#5f8f4a', bleu: '#4f7fb8', gris: '#8f9aa6' };
  const LISSE = { tours: 16, force: 0.6, regonfle: 0.62, x: [0.07, 0.098], y: [1.425, 1.447, 1.635, 1.675], z: [0.045, 0.085], nez: { y: 1.5, garde: 0.6, rx: 0.02, ry: 0.028 } };
  const RENDU = { actif: true, lisses: true, ombre: true, contour: 'bois' };
  const COU = { y: 1.42, nuque: { y: 1.5, z: -0.045 } };
  const OS_TETE = ['Head', 'head_end', 'headfront'];
  const TYPES = { 5121: Uint8Array, 5123: Uint16Array, 5125: Uint32Array, 5126: Float32Array }, NB = { SCALAR: 1, VEC2: 2, VEC3: 3, VEC4: 4 };

  function souder(geo) {
    if (geo.userData.soudure) return geo.userData.soudure;
    const P = geo.attributes.position, I = geo.index.array, cles = new Map(), g = new Int32Array(P.count); let n = 0;
    for (let i = 0; i < P.count; i++) { const k = Math.round(P.getX(i) * 2e4) + ',' + Math.round(P.getY(i) * 2e4) + ',' + Math.round(P.getZ(i) * 2e4); let j = cles.get(k); if (j == null) { j = n++; cles.set(k, j); } g[i] = j; }
    const voisins = Array.from({ length: n }, () => new Set()), faces = Array.from({ length: n }, () => []);
    for (let t = 0; t < I.length; t += 3) { const a = g[I[t]], b = g[I[t + 1]], c = g[I[t + 2]]; voisins[a].add(b).add(c); voisins[b].add(a).add(c); voisins[c].add(a).add(b); faces[a].push(t); faces[b].push(t); faces[c].push(t); }
    return (geo.userData.soudure = { g, n, voisins, faces });
  }
  function normalesLisses(THREE, geo, P = geo.attributes.position, angle = 62) {
    const S = souder(geo), I = geo.index.array, nf = new Float32Array(I.length), a = new THREE.Vector3(), b = new THREE.Vector3(), c = new THREE.Vector3();
    for (let t = 0; t < I.length; t += 3) { a.fromBufferAttribute(P, I[t]); b.fromBufferAttribute(P, I[t + 1]).sub(a); c.fromBufferAttribute(P, I[t + 2]).sub(a); b.cross(c); nf[t] = b.x; nf[t + 1] = b.y; nf[t + 2] = b.z; }
    const ref = new Float32Array(P.count * 3);
    for (let t = 0; t < I.length; t += 3) for (let k = 0; k < 3; k++) { const i = I[t + k] * 3; ref[i] += nf[t]; ref[i + 1] += nf[t + 1]; ref[i + 2] += nf[t + 2]; }
    const out = new Float32Array(P.count * 3), cs = Math.cos(angle * DEG);
    for (let i = 0; i < P.count; i++) {
      const rx = ref[i * 3], ry = ref[i * 3 + 1], rz = ref[i * 3 + 2], rl = Math.hypot(rx, ry, rz) || 1; let x = 0, y = 0, z = 0;
      for (const t of S.faces[S.g[i]]) { const l = Math.hypot(nf[t], nf[t + 1], nf[t + 2]) || 1; if ((nf[t] * rx + nf[t + 1] * ry + nf[t + 2] * rz) / (l * rl) >= cs) { x += nf[t]; y += nf[t + 1]; z += nf[t + 2]; } }
      const l = Math.hypot(x, y, z) || 1; out[i * 3] = x / l; out[i * 3 + 1] = y / l; out[i * 3 + 2] = z / l;
    }
    return new THREE.BufferAttribute(out, 3);
  }
  function lisserVisage(THREE, geo, Mp, R = LISSE) {
    const S = souder(geo), P = geo.attributes.position, inv = new THREE.Matrix4().copy(Mp).invert(), v = new THREE.Vector3();
    const pos = new Float32Array(S.n * 3), w = new Float32Array(S.n), vu = new Uint8Array(S.n), pas = (a, b, x) => { const t = Math.max(0, Math.min(1, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
    for (let i = 0; i < P.count; i++) { const j = S.g[i]; if (vu[j]) continue; vu[j] = 1; v.fromBufferAttribute(P, i).applyMatrix4(Mp); pos[j * 3] = v.x; pos[j * 3 + 1] = v.y; pos[j * 3 + 2] = v.z;
      w[j] = (1 - pas(R.x[0], R.x[1], Math.abs(v.x))) * pas(R.y[0], R.y[1], v.y) * (1 - pas(R.y[2], R.y[3], v.y)) * pas(R.z[0], R.z[1], v.z);
      if (R.nez) w[j] *= 1 - R.nez.garde * Math.exp(-((v.x / R.nez.rx) ** 2 + ((v.y - R.nez.y) / R.nez.ry) ** 2)); }
    const tmp = new Float32Array(S.n * 3);
    for (let it = 0; it < R.tours * 2; it++) {
      const sens = it % 2 ? -(R.regonfle || 0) : R.force;
      if (!sens) continue;
      for (let j = 0; j < S.n; j++) { if (w[j] < 0.01) { tmp[j * 3] = pos[j * 3]; tmp[j * 3 + 1] = pos[j * 3 + 1]; tmp[j * 3 + 2] = pos[j * 3 + 2]; continue; }
        let x = 0, y = 0, z = 0, n = 0; for (const k of S.voisins[j]) { x += pos[k * 3]; y += pos[k * 3 + 1]; z += pos[k * 3 + 2]; n++; }
        const f = sens * w[j]; tmp[j * 3] = pos[j * 3] + f * (x / n - pos[j * 3]); tmp[j * 3 + 1] = pos[j * 3 + 1] + f * (y / n - pos[j * 3 + 1]); tmp[j * 3 + 2] = pos[j * 3 + 2] + f * (z / n - pos[j * 3 + 2]); }
      pos.set(tmp);
    }
    const out = new Float32Array(P.count * 3);
    for (let i = 0; i < P.count; i++) { const j = S.g[i]; v.set(pos[j * 3], pos[j * 3 + 1], pos[j * 3 + 2]).applyMatrix4(inv); out[i * 3] = v.x; out[i * 3 + 1] = v.y; out[i * 3 + 2] = v.z; }
    const g2 = new THREE.BufferGeometry(); g2.setAttribute('position', new THREE.BufferAttribute(out, 3)); g2.setAttribute('uv', geo.attributes.uv); g2.setIndex(geo.index);
    g2.userData.soudure = S; g2.setAttribute('normal', normalesLisses(THREE, g2));
    return g2;
  }
  function projeterVisage(V, src) {
    const uv = new Float32Array(src.n * 2), garde = new Uint8Array(src.n), p = [0, 0, 0];
    for (let i = 0; i < src.n; i++) {
      src.pos(i, p);
      const r = V.r || 0.1, u = r * Math.atan2(p[0] - V.cx, p[2] - (V.cz || 0)) / V.l + 0.5, v = (p[1] - V.cy) / V.h + 0.5;
      uv[i * 2] = u; uv[i * 2 + 1] = v;
      garde[i] = src.garde(i) && src.nz(i) > -0.35 && u > -0.05 && u < 1.05 && v > -0.05 && v < 1.05 && p[2] > (V.cz || 0) - 0.03 ? 1 : 0;
    }
    const I = src.index, idx = [];
    for (let t = 0; t < I.length; t += 3) if (garde[I[t]] && garde[I[t + 1]] && garde[I[t + 2]]) idx.push(I[t], I[t + 1], I[t + 2]);
    return { uv, idx };
  }
  const _rampes = new WeakMap();
  function rampe(THREE) {
    if (_rampes.has(THREE)) return _rampes.get(THREE);
    let r;
    if (typeof Ile3D === 'function' && typeof Ile3D.rampe === 'function') r = Ile3D.rampe(THREE);
    else {
      const N = 128, d = new Uint8Array(N * 4);
      for (let i = 0; i < N; i++) { const t = i / (N - 1), s = Math.max(0, Math.min(1, (t - 0.4) / 0.22)), v = Math.round(255 * (0.42 + 0.58 * s * s * (3 - 2 * s))); d[i * 4] = d[i * 4 + 1] = d[i * 4 + 2] = v; d[i * 4 + 3] = 255; }
      r = new THREE.DataTexture(d, N, 1, THREE.RGBAFormat); r.minFilter = r.magFilter = THREE.LinearFilter; r.generateMipmaps = false; r.needsUpdate = true;
    }
    _rampes.set(THREE, r);
    return r;
  }

  class Compose {
    constructor(THREE, M, ex, C, opts) {
      this.THREE = THREE; this.M = M; this.ex = ex; this.C = C;
      this.opts = Object.assign({ textureMax: 1024, adresse: x => x, lire: c => IlePeau.lire(c) }, opts);
      this.rendu = Object.assign({}, RENDU, C.rendu, this.opts.rendu);
      this.lisse = C.lisse !== false;
      this.clarteK = C.clarte || 1;
      this.pieces = { tete: null, coiffure: null, bois: null };
      this.visage = null; this.corps = null; this.choix = null;
      this.lues = new Map(); this.images = new Map(); this.corrigees = new Map();
      this.octets = 0; this.triangles = 0; this.appels = 0;
    }
    lin(c) { return new this.THREE.Color(c).convertSRGBToLinear(); }
    matiere(map, opts) {
      const THREE = this.THREE, R = this.rendu;
      return R.actif && R.ombre ? new THREE.MeshToonMaterial(Object.assign({ map, gradientMap: rampe(THREE) }, opts)) : new THREE.MeshLambertMaterial(Object.assign({ map }, opts));
    }
    matiereContour(epaisseur) {
      const m = new this.THREE.MeshBasicMaterial({ color: this.lin(ENCRE), side: this.THREE.BackSide });
      m.onBeforeCompile = sh => { sh.uniforms.uTrait = { value: epaisseur }; sh.vertexShader = 'uniform float uTrait;\n' + sh.vertexShader.replace('#include <begin_vertex>', '#include <begin_vertex>\n  transformed += normalize(normal) * uTrait;'); };
      m.customProgramCacheKey = () => 'contour-encre';
      return m;
    }
    image(url) {
      if (!this.images.has(url)) this.images.set(url, new Promise((ok, ko) => { const i = new Image(); i.onload = () => ok(i); i.onerror = () => ko(new Error('image du visage introuvable : ' + url)); i.src = this.opts.adresse(url); }));
      return this.images.get(url);
    }

    poidsTete() {
      const g = this.ex.mesh.geometry, sk = this.ex.mesh.skeleton, SI = g.attributes.skinIndex, SW = g.attributes.skinWeight;
      const tete = OS_TETE.map(n => sk.bones.findIndex(b => b.name === n));
      return i => { let w = 0; for (let k = 0; k < 4; k++) if (tete.includes(SI.array[i * 4 + k])) w += SW.array[i * 4 + k]; return w; };
    }
    cacherTete(on) {
      const g = this.ex.mesh.geometry, D = this.corps, K = this.C.cou || COU;
      if (!D.indexComplet) D.indexComplet = g.index;
      if (!on) { g.setIndex(D.indexComplet); return 0; }
      if (!D.indexSansTete) {
        const w = this.poidsTete(), P = g.attributes.position, I = D.indexComplet.array, garde = [];
        const dans = i => w(i) > 0.5 && P.getY(i) > K.y && !(K.nuque && P.getY(i) < K.nuque.y && P.getZ(i) < K.nuque.z);
        for (let t = 0; t < I.length; t += 3) if (!(dans(I[t]) && dans(I[t + 1]) && dans(I[t + 2]))) garde.push(I[t], I[t + 1], I[t + 2]);
        D.indexSansTete = new this.THREE.BufferAttribute(new Uint32Array(garde), 1);
      }
      g.setIndex(D.indexSansTete);
      return (D.indexComplet.count - D.indexSansTete.count) / 3;
    }
    accrocher(piece, os = 'Head') {
      const sk = this.ex.mesh.skeleton, i = sk.bones.findIndex(b => b.name === os);
      piece.matrixAutoUpdate = false; piece.matrix.copy(sk.boneInverses[i]).multiply(this.ex.mesh.bindMatrix); piece.frustumCulled = false;
      sk.bones[i].add(piece); return piece;
    }

    rendreCorps() {
      const THREE = this.THREE, m = this.ex.mesh, g = m.geometry, R = this.rendu;
      const D = this.corps || (this.corps = { mat0: m.material, c0: m.material.color.clone(), n0: g.attributes.normal });
      if (D.contour) { D.contour.parent.remove(D.contour); D.contour.material.dispose(); D.contour = null; }
      if (!R.actif) { m.material = D.mat0; g.setAttribute('normal', D.n0); return; }
      D.toon = D.toon || new THREE.MeshToonMaterial({ map: D.mat0.map, gradientMap: rampe(THREE) });
      D.lisses = D.lisses || normalesLisses(THREE, g);
      m.material = R.ombre ? D.toon : D.mat0; g.setAttribute('normal', R.lisses ? D.lisses : D.n0);
      if (R.contour !== true) return;
      const c = new THREE.SkinnedMesh(g, this.matiereContour(TRAIT)); c.name = 'contour corps'; c.frustumCulled = false;
      c.position.copy(m.position); c.quaternion.copy(m.quaternion); c.scale.copy(m.scale); m.parent.add(c); c.bind(m.skeleton, m.bindMatrix); D.contour = c;
    }

    lirePiece(chemin) {
      if (!this.lues.has(chemin)) this.lues.set(chemin, (async () => {
        const THREE = this.THREE, { json: G, bin } = await this.opts.lire(chemin), prim = G.meshes[0].primitives[0];
        const acc = i => {
          const a = G.accessors[i], bv = G.bufferViews[a.bufferView], T = TYPES[a.componentType], n = NB[a.type], o = (bv.byteOffset || 0) + (a.byteOffset || 0), pas = bv.byteStride || 0;
          let out;
          if (!pas || pas === n * T.BYTES_PER_ELEMENT) out = new T(bin.slice(o, o + a.count * n * T.BYTES_PER_ELEMENT));
          else { out = new T(a.count * n); for (let k = 0; k < a.count; k++) out.set(new T(bin.slice(o + k * pas, o + k * pas + n * T.BYTES_PER_ELEMENT)), k * n); }
          this.octets += out.byteLength;
          return out;
        };
        const geo = new THREE.BufferGeometry();
        geo.setAttribute('position', new THREE.BufferAttribute(acc(prim.attributes.POSITION), 3));
        geo.setAttribute('normal', new THREE.BufferAttribute(acc(prim.attributes.NORMAL), 3));
        geo.setAttribute('uv', new THREE.BufferAttribute(acc(prim.attributes.TEXCOORD_0), 2));
        geo.setIndex(new THREE.BufferAttribute(acc(prim.indices), 1));
        const im = G.images[G.textures[G.materials[prim.material].pbrMetallicRoughness.baseColorTexture.index].source], bv = G.bufferViews[im.bufferView];
        const brut = await createImageBitmap(new Blob([bin.slice(bv.byteOffset || 0, (bv.byteOffset || 0) + bv.byteLength)], { type: im.mimeType || 'image/png' }));
        const k = Math.min(1, (this.opts.textureMax || Infinity) / Math.max(brut.width, brut.height));
        let img = brut;
        if (k < 1) { img = document.createElement('canvas'); img.width = Math.round(brut.width * k); img.height = Math.round(brut.height * k); img.getContext('2d').drawImage(brut, 0, 0, img.width, img.height); if (brut.close) brut.close(); }
        const tex = new THREE.Texture(img); tex.flipY = false; tex.encoding = THREE.sRGBEncoding; tex.needsUpdate = true;
        this.octets += Math.round(img.width * img.height * 4 * 4 / 3);
        return { geo, tex, img, triangles: geo.index.count / 3, nLisses: null };
      })());
      return this.lues.get(chemin);
    }
    texCorrigee(d, lue) {
      const cle = d.fichier + '|' + d.couleurs.join(',');
      if (this.corrigees.has(cle)) return this.corrigees.get(cle);
      const THREE = this.THREE, im = lue.img, c = document.createElement('canvas'); c.width = im.width; c.height = im.height;
      const x = c.getContext('2d'); x.drawImage(im, 0, 0);
      const D = x.getImageData(0, 0, c.width, c.height), p = D.data, K = d.couleurs;
      for (let i = 0; i < p.length; i += 4) { const r = p[i], g = p[i + 1], b = p[i + 2];
        p[i] = Math.max(0, Math.min(255, K[0] * r + K[1] * g + K[2] * b)); p[i + 1] = Math.max(0, Math.min(255, K[3] * r + K[4] * g + K[5] * b)); p[i + 2] = Math.max(0, Math.min(255, K[6] * r + K[7] * g + K[8] * b)); }
      x.putImageData(D, 0, 0);
      const t = new THREE.CanvasTexture(c); t.flipY = false; t.encoding = THREE.sRGBEncoding; t.needsUpdate = true;
      lue.tex.dispose();
      this.corrigees.set(cle, t);
      return t;
    }
    pose(d, miroir) {
      const THREE = this.THREE, s = miroir ? -1 : 1;
      return new THREE.Matrix4().compose(new THREE.Vector3(s * d.pos[0], d.pos[1], d.pos[2]),
        new THREE.Quaternion().setFromEuler(new THREE.Euler(d.rot[0] * DEG, s * d.rot[1] * DEG, s * d.rot[2] * DEG, 'YXZ')), new THREE.Vector3(s * d.k, d.k, d.k));
    }
    async poserPiece(d, miroir) {
      const THREE = this.THREE, R = this.rendu, lue = await this.lirePiece(d.fichier), geo = lue.geo, tex = d.couleurs ? this.texCorrigee(d, lue) : lue.tex;
      const Mp = this.pose(d, miroir);
      let index = geo.index;
      if (d.coupe != null) {
        const P = geo.attributes.position, I = geo.index.array, v = new THREE.Vector3(), haut = new Uint8Array(P.count), idx = [];
        for (let i = 0; i < P.count; i++) haut[i] = v.fromBufferAttribute(P, i).applyMatrix4(Mp).y >= d.coupe ? 1 : 0;
        for (let t = 0; t < I.length; t += 3) if (haut[I[t]] && haut[I[t + 1]] && haut[I[t + 2]]) idx.push(I[t], I[t + 1], I[t + 2]);
        index = new THREE.BufferAttribute(new Uint32Array(idx), 1);
      }
      let g;
      if (d.lissable && this.lisse) { g = lisserVisage(THREE, geo, Mp, d.lisse || this.C.lisseZone || LISSE); g.setIndex(index); }
      else {
        g = new THREE.BufferGeometry(); g.setAttribute('position', geo.attributes.position); g.setAttribute('uv', geo.attributes.uv); g.setIndex(index);
        g.setAttribute('normal', R.actif && R.lisses ? (lue.nLisses || (lue.nLisses = normalesLisses(THREE, geo))) : geo.attributes.normal);
      }
      const m = new THREE.Mesh(g, this.matiere(tex)); m.name = 'piece ' + d.fichier.split('/').pop();
      this.accrocher(m); m.userData.pose = Mp; m.userData.d = d; m.userData.miroir = !!miroir; m.matrix.multiply(Mp);
      if (R.actif && (R.contour === true || (R.contour === 'bois' && d.genre === 'bois'))) { const c = new THREE.Mesh(g, this.matiereContour(TRAIT / d.k)); c.name = 'contour'; c.frustumCulled = false; m.add(c); }
      return m;
    }
    oter(m) {
      if (!m) return;
      for (const x of [].concat(m)) { if (x.parent) x.parent.remove(x); x.traverse(o => { if (o.material) o.material.dispose(); }); if (x.geometry) x.geometry.dispose(); if (x.userData.geoVisage) x.userData.geoVisage.dispose(); }
    }

    visageSurCorps(V, mat) {
      const THREE = this.THREE, D = this.corps, m = this.ex.mesh, g = m.geometry, P = g.attributes.position, N = D.n0, w = this.poidsTete();
      if (!D.geoVisage) {
        const { uv, idx } = projeterVisage(V, { n: P.count, pos: (i, p) => { p[0] = P.getX(i); p[1] = P.getY(i); p[2] = P.getZ(i); }, nz: i => N.getZ(i), garde: i => w(i) > 0.3, index: (D.indexComplet || g.index).array });
        const g2 = new THREE.BufferGeometry();
        for (const a of ['position', 'normal', 'skinIndex', 'skinWeight']) g2.setAttribute(a, g.attributes[a]);
        g2.setAttribute('uv', new THREE.BufferAttribute(uv, 2)); g2.setIndex(idx); D.geoVisage = g2;
      }
      const dm = new THREE.SkinnedMesh(D.geoVisage, mat);
      dm.position.copy(m.position); dm.quaternion.copy(m.quaternion); dm.scale.copy(m.scale);
      m.parent.add(dm); dm.bind(m.skeleton, m.bindMatrix); return dm;
    }
    visageSurPiece(V, mat, piece) {
      const THREE = this.THREE, g = piece.geometry, P = g.attributes.position, N = g.attributes.normal, Mp = piece.userData.pose, v = new THREE.Vector3(), nm = new THREE.Matrix3().getNormalMatrix(Mp);
      if (!piece.userData.geoVisage) {
        const { uv, idx } = projeterVisage(V, { n: P.count, pos: (i, p) => { v.fromBufferAttribute(P, i).applyMatrix4(Mp); p[0] = v.x; p[1] = v.y; p[2] = v.z; },
          nz: i => v.fromBufferAttribute(N, i).applyMatrix3(nm).normalize().z, garde: () => true, index: g.index.array });
        const g2 = new THREE.BufferGeometry(); g2.setAttribute('position', P); g2.setAttribute('normal', N);
        g2.setAttribute('uv', new THREE.BufferAttribute(uv, 2)); g2.setIndex(idx); piece.userData.geoVisage = g2;
      }
      const dm = new THREE.Mesh(piece.userData.geoVisage, mat); piece.add(dm); return dm;
    }
    oterVisage() {
      const v = this.visage;
      if (!v) return;
      if (v.parent) v.parent.remove(v);
      if (v.material.map) v.material.map.dispose();
      v.material.dispose(); this.visage = null;
    }
    async poserVisage(kv, km, iris) {
      const THREE = this.THREE, C = this.C;
      this.oterVisage();
      if (this.choix) Object.assign(this.choix, { visage: kv, marque: km, iris });
      const piece = this.pieces.tete;
      if (!(kv >= 0) || !C.visages || !C.visages[kv]) { this.bilan(); return 0; }
      const V = C.visages[kv], [iv, iy, imq] = await Promise.all([this.image(V.image), iris && IRIS[iris] && V.yeux ? this.image(V.yeux) : null, km >= 0 && C.marques && C.marques[km] ? this.image(C.marques[km].image) : null]);
      const cv = document.createElement('canvas'); cv.width = iv.width; cv.height = iv.height;
      const x = cv.getContext('2d'); x.drawImage(iv, 0, 0);
      if (iy) {
        const d = x.getImageData(0, 0, cv.width, cv.height), c2 = document.createElement('canvas'); c2.width = cv.width; c2.height = cv.height;
        const x2 = c2.getContext('2d'); x2.drawImage(iy, 0, 0); const mq = x2.getImageData(0, 0, cv.width, cv.height).data;
        const t = new THREE.Color(IRIS[iris]), D = d.data;
        for (let i = 0; i < D.length; i += 4) {
          const k = mq[i] / 255; if (k < 0.02) continue;
          const l = (0.3 * D[i] + 0.59 * D[i + 1] + 0.11 * D[i + 2]) / 255, f = l > 0.8 ? 1 : l * 1.9;
          D[i] += (Math.min(255, t.r * 255 * f) - D[i]) * k; D[i + 1] += (Math.min(255, t.g * 255 * f) - D[i + 1]) * k; D[i + 2] += (Math.min(255, t.b * 255 * f) - D[i + 2]) * k;
        }
        x.putImageData(d, 0, 0);
      }
      if (imq) x.drawImage(imq, 0, 0);
      const tex = new THREE.CanvasTexture(cv); tex.encoding = THREE.sRGBEncoding; tex.wrapS = tex.wrapT = THREE.ClampToEdgeWrapping;
      const mat = this.matiere(tex, { transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -4 });
      mat.userData.transparent = true;
      const dm = piece ? this.visageSurPiece(C.pieces.tete.cadre, mat, piece) : this.visageSurCorps(C.cadre, mat);
      dm.name = 'visage'; dm.frustumCulled = false; dm.renderOrder = 2; this.visage = dm;
      this.bilan();
      return dm.geometry.index.count / 3;
    }

    async composer(choix) {
      const C = this.C, P = C.pieces, E = this.pieces;
      const ch = this.choix = Object.assign({ tete: P && P.tete ? 'piece' : 'corps', coiffure: -1, bois: -1, visage: -1, marque: -1, iris: 'dessin', cheveux: null }, choix);
      this.oterVisage();
      this.oter(E.tete); this.oter(E.coiffure); this.oter(E.bois); E.tete = E.coiffure = E.bois = null;
      if (this.corps && this.corps.geoVisage) { this.corps.geoVisage.dispose(); this.corps.geoVisage = null; }
      const enPiece = !!(P && P.tete) && ch.tete === 'piece';
      this.rendreCorps();
      this.cacherTete(enPiece);
      if (enPiece) E.tete = await this.poserPiece(P.tete);
      if (P && ch.coiffure >= 0 && P.coiffures && P.coiffures[ch.coiffure]) E.coiffure = await this.poserPiece(P.coiffures[ch.coiffure]);
      if (P && ch.bois >= 0 && P.bois && P.bois[ch.bois]) { const d = P.bois[ch.bois]; E.bois = d.miroir ? [await this.poserPiece(d), await this.poserPiece(d, true)] : await this.poserPiece(d); }
      this.teindre(ch.cheveux);
      await this.poserVisage(ch.visage, ch.marque, ch.iris);
      return this;
    }
    teindre(hex) {
      const E = this.pieces;
      if (this.choix) this.choix.cheveux = hex || null;
      if (E.coiffure) {
        if (hex) { const c = this.lin(hex), b = this.lin(E.coiffure.userData.d.base || '#fdedcd'); E.coiffure.userData.teinte = new this.THREE.Color(c.r / b.r, c.g / b.g, c.b / b.b); }
        else E.coiffure.userData.teinte = null;
      }
      this.couleurs();
    }
    clarte(k) { this.clarteK = k; this.couleurs(); }
    couleurs() {
      const R = this.rendu, K = this.clarteK, k = K * (R.actif && R.ombre ? APLAT : 1), D = this.corps, E = this.pieces;
      if (D) { D.mat0.color.copy(D.c0).multiplyScalar(K); if (D.toon) D.toon.color.copy(D.c0).multiplyScalar(K * APLAT); }
      for (const m of [].concat(E.tete || [], E.bois || [])) { const t = m.userData.d.teinte || [1, 1, 1]; m.material.color.setRGB(t[0] * k, t[1] * k, t[2] * k); }
      if (E.coiffure) { const t = E.coiffure.userData.teinte; if (t) E.coiffure.material.color.copy(t).multiplyScalar(k); else E.coiffure.material.color.setScalar(k); }
      if (this.visage) this.visage.material.color.setScalar(k);
    }
    bilan() {
      const ex = this.ex, E = this.pieces, D = this.corps, mats = [ex.mesh.material], contours = [];
      let tri = ex.mesh.geometry.index.count / 3, appels = 1;
      for (const m of [].concat(E.tete || [], E.coiffure || [], E.bois || [])) {
        mats.push(m.material); tri += m.geometry.index.count / 3; appels++;
        for (const c of m.children) if (c.name === 'contour') { contours.push(c); tri += c.geometry.index.count / 3; appels++; }
      }
      if (D && D.contour) { contours.push(D.contour); tri += D.contour.geometry.index.count / 3; appels++; }
      if (this.visage) { mats.push(this.visage.material); tri += this.visage.geometry.index.count / 3; appels++; }
      ex.mats = mats; ex.contours = contours;
      ex.alpha = NaN; ex.flash = null;
      this.triangles = Math.round(tri); this.appels = appels;
      this.couleurs();
    }
    liberer() {
      const E = this.pieces, D = this.corps, ex = this.ex;
      this.oterVisage();
      this.oter(E.tete); this.oter(E.coiffure); this.oter(E.bois); E.tete = E.coiffure = E.bois = null;
      for (const p of this.lues.values()) p.then(l => { l.geo.dispose(); l.tex.dispose(); if (l.img && l.img.close) l.img.close(); }).catch(() => {});
      for (const t of this.corrigees.values()) t.dispose();
      this.lues.clear(); this.corrigees.clear(); this.images.clear();
      if (D) {
        if (D.contour) { if (D.contour.parent) D.contour.parent.remove(D.contour); D.contour.material.dispose(); }
        if (D.geoVisage) D.geoVisage.dispose();
        const g = ex.mesh.geometry;
        if (D.indexComplet) g.setIndex(D.indexComplet);
        g.setAttribute('normal', D.n0);
        ex.mesh.material = D.mat0;
        if (D.toon) D.toon.dispose();
        this.corps = null;
      }
      ex.mats = [ex.mat]; ex.contours = null;
    }
  }

  function choix(C, perso, recherche) {
    const ch = Object.assign({ tete: 'piece', coiffure: -1, bois: -1, visage: -1, marque: -1, iris: 'dessin', cheveux: null }, C.defaut);
    if (C.cheveuxDuPerso) try {
      const look = perso && (typeof perso.lookAffiche === 'function' ? perso.lookAffiche().look : perso.look);
      const c = look && look.couleurs && look.couleurs[1];
      if (typeof c === 'string' && /^#[0-9a-f]{6}$/i.test(c)) ch.cheveux = c;
    } catch (e) {   }
    let q = null;
    try { q = new URLSearchParams(recherche != null ? recherche : location.search); } catch (e) { q = null; }
    if (q) {
      const rang = (nom, liste, de) => { const v = q.get(nom); if (v == null || v === '' || !Number.isFinite(+v)) return null; const k = Math.round(+v) - de; return k < 0 ? -1 : liste && k < liste.length ? k : null; };
      const P = C.pieces || {};
      let v;
      if ((v = rang('perso_coiffure', P.coiffures, 0)) != null) ch.coiffure = v;
      if ((v = rang('perso_bois', P.bois, 0)) != null) ch.bois = v;
      if ((v = rang('perso_visage', C.visages, 1)) != null) ch.visage = v;
      if ((v = rang('perso_marque', C.marques, 1)) != null) ch.marque = v;
      if (q.get('perso_iris') && q.get('perso_iris') in IRIS) ch.iris = q.get('perso_iris');
      if (/^[0-9a-f]{6}$/i.test(q.get('perso_cheveux') || '')) ch.cheveux = '#' + q.get('perso_cheveux');
    }
    return ch;
  }

  return { creer: (THREE, M, ex, C, opts) => new Compose(THREE, M, ex, C, opts), choix, Compose, IRIS, LISSE, RENDU, APLAT, ENCRE, TRAIT, souder, normalesLisses, lisserVisage, projeterVisage, rampe };
})();
if (typeof module !== 'undefined' && module.exports) module.exports = IlePeauPieces;
