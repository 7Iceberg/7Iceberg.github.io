const IlePeau = (() => {
  const PEAUX = {
    filin: { fichier: 'assets/peaux/filin.glb', hauteur: 1.25, ombre: 0.75, teinte: '#e6e6e6',
      clips: { repos: 'Idle', marche: { nom: 'Slow_Orc_Walk', vitesse: 0.42 }, sort: { nom: 'Attack', de: 0.25, a: 1.45 }, coup: { nom: 'Hit_Reaction', de: 0.02, a: 0.62 } },
      durees: { placement: 0, sort: 780, lacher: 0.55, pousse: 90, saut: 140 } },
    nerith: { fichier: 'assets/peaux/nerith.glb', hauteur: 2.0, ombre: 0.9,
      arme: { fichier: 'assets/peaux/nerith-ancre.glb', os: 'RightHand', position: [0, 0.32, 0], rotation: [1, 0, 0, 0], echelle: 0.75 },
      clips: { repos: 'Idle', marche: { nom: 'Sneaky_Walk', vitesse: 0.5 }, course: { nom: 'RunFast', vitesse: 3.2 }, sort: { nom: 'Weapon_Combo', de: 0.05, a: 1.05 }, coup: { nom: 'Hit_Reaction', de: 0.02, a: 0.62 }, victoire: 'victory' },
      durees: { placement: 0, sort: 620, lacher: 0.5, pousse: 90, saut: 140 } },
    lampignard: { fichier: 'assets/peaux/lampignard.glb', hauteur: 2.3, ombre: 1.0,
      clips: { repos: 'Idle', marche: { nom: 'Slow_Orc_Walk', vitesse: 0.42 }, sort: { nom: 'Heavy_Hammer_Swing', de: 0.1, a: 1.6 }, coup: { nom: 'Hit_Reaction', de: 0.02, a: 0.62 }, victoire: 'victory' },
      durees: { placement: 0, sort: 900, lacher: 0.6, pousse: 90, saut: 140 } },
  };
  const MONSTRES = ['filin', 'lampignard'];
  const TAU_CAP = 0.08, TAU_MARCHE = 0.12, TAU_GESTE = 0.08;

  function base() {
    try {
      const ref = document.querySelector('script[src*="ile-charge.js"]') || document.querySelector('script[src*="ile-3d.js"]');
      if (ref && ref.src) { const u = new URL(ref.src); return { href: new URL('../', u).href, search: u.search }; }
    } catch (e) {   }
    return null;
  }
  function adresse(chemin) {
    const b = base();
    return b ? new URL(chemin, b.href).href + b.search : chemin;
  }
  function octets(url) {
    if (!/^file:/.test(url)) return fetch(url).then(r => { if (!r.ok) throw new Error('GLB de la peau introuvable : ' + r.status); return r.arrayBuffer(); });
    return new Promise((ok, ko) => {
      const x = new XMLHttpRequest();
      x.open('GET', url, true); x.responseType = 'arraybuffer';
      x.onload = () => (x.response && x.response.byteLength ? ok(x.response) : ko(new Error('GLB de la peau vide : ' + x.status)));
      x.onerror = () => ko(new Error('GLB de la peau refusé (file:) : ' + url));
      x.send();
    });
  }
  const LUS = new Map();
  function lire(chemin) {
    if (typeof IleGlb !== 'object') return Promise.reject(new Error('IleGlb absent'));
    const url = adresse(chemin);
    if (!LUS.has(url)) LUS.set(url, octets(url).then(b => IleGlb.analyser(b)).catch(e => { LUS.delete(url); throw e; }));
    return LUS.get(url);
  }
  const TYPES = { 5120: Int8Array, 5121: Uint8Array, 5122: Int16Array, 5123: Uint16Array, 5125: Uint32Array, 5126: Float32Array };
  const N = { SCALAR: 1, VEC2: 2, VEC3: 3, VEC4: 4, MAT4: 16 };
  function accesseur(G, bin, idx) {
    const a = G.accessors[idx], bv = G.bufferViews[a.bufferView];
    const Comp = TYPES[a.componentType], n = N[a.type], off = (bv.byteOffset || 0) + (a.byteOffset || 0), elt = Comp.BYTES_PER_ELEMENT, stride = bv.byteStride || 0;
    let out;
    if (!stride || stride === n * elt) out = new Comp(bin, off, a.count * n);
    else { out = new Comp(a.count * n); for (let i = 0; i < a.count; i++) out.set(new Comp(bin, off + i * stride, n), i * n); }
    return { array: out, n, normalized: !!a.normalized };
  }
  function dimsImage(u8) {
    if (u8.length > 24 && u8[0] === 0x89 && u8[1] === 0x50) { const v = new DataView(u8.buffer, u8.byteOffset, u8.byteLength); return [v.getUint32(16), v.getUint32(20)]; }
    if (u8.length > 4 && u8[0] === 0xff && u8[1] === 0xd8) {
      let i = 2;
      while (i + 9 < u8.length && u8[i] === 0xff) { const m = u8[i + 1]; if (m >= 0xc0 && m <= 0xc3) return [(u8[i + 7] << 8) | u8[i + 8], (u8[i + 5] << 8) | u8[i + 6]]; i += 2 + ((u8[i + 2] << 8) | u8[i + 3]); }
    }
    return [1024, 1024];
  }
  function matiere(THREE, G, bin, idx, compte) {
    const m = (G.materials || [])[idx] || {}, pbr = m.pbrMetallicRoughness || {}, baseC = pbr.baseColorFactor || [1, 1, 1, 1];
    let tex = null;
    const t = pbr.baseColorTexture && (G.textures || [])[pbr.baseColorTexture.index], im = t && G.images && G.images[t.source];
    if (im && im.bufferView != null && typeof Blob !== 'undefined' && URL.createObjectURL) {
      const bv = G.bufferViews[im.bufferView], u8 = new Uint8Array(bin, bv.byteOffset || 0, bv.byteLength), d = dimsImage(u8);
      compte.octets += d[0] * d[1] * 4;
      const url = URL.createObjectURL(new Blob([u8], { type: im.mimeType || 'image/jpeg' }));
      tex = new THREE.TextureLoader().load(url, () => URL.revokeObjectURL(url));
      tex.flipY = false;
      if (THREE.sRGBEncoding != null) tex.encoding = THREE.sRGBEncoding;
    }
    const mat = new THREE.MeshLambertMaterial({ color: new THREE.Color(baseC[0], baseC[1], baseC[2]), map: tex, emissive: new THREE.Color(0, 0, 0), side: m.doubleSided ? THREE.DoubleSide : THREE.FrontSide, fog: true });
    mat.name = m.name || 'peau';
    return { mat, tex };
  }
  function geometrie(THREE, G, bin, prim, compte) {
    const geo = new THREE.BufferGeometry(), at = prim.attributes || {};
    const pose = (nom, idx) => { if (idx == null) return; const a = accesseur(G, bin, idx); geo.setAttribute(nom, new THREE.BufferAttribute(a.array, a.n, a.normalized)); compte.octets += a.array.byteLength; };
    pose('position', at.POSITION); pose('normal', at.NORMAL); pose('uv', at.TEXCOORD_0); pose('skinIndex', at.JOINTS_0); pose('skinWeight', at.WEIGHTS_0);
    if (prim.indices != null) { const a = accesseur(G, bin, prim.indices); geo.setIndex(new THREE.BufferAttribute(a.array, 1)); compte.octets += a.array.byteLength; }
    if (!geo.getAttribute('normal')) geo.computeVertexNormals();
    geo.computeBoundingBox();
    return geo;
  }
  function clips(G, bin) {
    const out = {};
    for (const a of G.animations || []) {
      const pistes = []; let duree = 0;
      for (const ch of a.channels) {
        const chemin = ch.target && ch.target.path;
        if (chemin !== 'translation' && chemin !== 'rotation') continue;
        const s = a.samplers[ch.sampler], t = accesseur(G, bin, s.input).array, v = accesseur(G, bin, s.output);
        duree = Math.max(duree, t[t.length - 1]);
        pistes.push({ noeud: ch.target.node, rot: chemin === 'rotation', t, v: v.array, pas: s.interpolation === 'STEP' });
      }
      out[a.name] = { nom: a.name, duree: Math.max(0.001, duree), pistes };
    }
    return out;
  }

  class Modele {
    constructor(THREE, glb, P, compte) {
      const { json: G, bin } = glb;
      this.THREE = THREE; this.G = G; this.P = P;
      this.clips = clips(G, bin);
      const articulations = new Set();
      for (const s of G.skins || []) for (const j of s.joints) articulations.add(j);
      this.articulations = articulations;
      this.noeudMesh = G.nodes.findIndex(n => n.mesh != null);
      const mesh = this.noeudMesh >= 0 ? G.meshes[G.nodes[this.noeudMesh].mesh] : null;
      const prim = mesh && mesh.primitives[0];
      if (!prim) throw new Error('peau sans maillage');
      this.geo = geometrie(THREE, G, bin, prim, compte);
      const { mat, tex } = matiere(THREE, G, bin, prim.material, compte);
      this.mat = mat; this.tex = tex;
      this.skin = G.nodes[this.noeudMesh].skin;
      this.inv = this.skin != null && G.skins[this.skin].inverseBindMatrices != null ? accesseur(G, bin, G.skins[this.skin].inverseBindMatrices).array : null;
      this.triangles = Math.round((this.geo.index ? this.geo.index.count : this.geo.getAttribute('position').count) / 3);
      this.repos = G.nodes.map(n => ({ p: n.translation ? n.translation.slice() : [0, 0, 0], q: n.rotation ? n.rotation.slice() : [0, 0, 0, 1], s: n.scale ? n.scale.slice() : [1, 1, 1] }));
      const ex = this.exemplaire(); ex.racine.updateMatrixWorld(true);
      const v = new THREE.Vector3(), pos = this.geo.getAttribute('position'), n = pos.count, pas = Math.max(1, Math.floor(n / 600));
      let bas = Infinity, haut = -Infinity;
      if (ex.mesh.isSkinnedMesh && ex.mesh.boneTransform && ex.mesh.skeleton) {
        ex.mesh.skeleton.update();
        for (let i = 0; i < n; i += pas) { v.fromBufferAttribute(pos, i); ex.mesh.boneTransform(i, v); v.applyMatrix4(ex.mesh.matrixWorld); if (v.y < bas) bas = v.y; if (v.y > haut) haut = v.y; }
      }
      if (!(haut > bas)) { const bb = this.geo.boundingBox; v.set(0, bb.min.y, 0).applyMatrix4(ex.mesh.matrixWorld); bas = v.y; v.set(0, bb.max.y, 0).applyMatrix4(ex.mesh.matrixWorld); haut = v.y; }
      this.brut = { bas, haut, hauteur: Math.max(0.01, haut - bas) };
      this.k = P.hauteur / this.brut.hauteur;
      this.demiTour = Modele.sens(ex) < 0 ? Math.PI : 0;
      this.libre = [ex];
      this.exemplaires = [ex];
      this.arme = null;
    }
    static sens(ex) {
      const os = n => ex.objets.find(o => o.name === n), p = o => { const v = new ex.racine.position.constructor(); o.getWorldPosition(v); return v; };
      for (const [a, b] of [['LeftFoot', 'LeftToeBase'], ['RightFoot', 'RightToeBase'], ['Head', 'headfront']]) {
        const oa = os(a), ob = os(b);
        if (!oa || !ob) continue;
        const dz = p(ob).z - p(oa).z;
        if (Math.abs(dz) > 1e-4) return dz > 0 ? 1 : -1;
      }
      return -1;
    }
    exemplaire() {
      const THREE = this.THREE, G = this.G;
      const objets = G.nodes.map((n, i) => {
        const o = this.articulations.has(i) ? new THREE.Bone() : new THREE.Group();
        o.name = n.name || ('noeud_' + i);
        const r = this.repos[i];
        o.position.fromArray(r.p); o.quaternion.fromArray(r.q); o.scale.fromArray(r.s);
        return o;
      });
      G.nodes.forEach((n, i) => { for (const c of n.children || []) objets[i].add(objets[c]); });
      const racine = new THREE.Group();
      racine.name = 'peau ' + (this.P.nom || '');
      for (const i of G.scenes[G.scene || 0].nodes || []) racine.add(objets[i]);
      const mat = this.mat.clone();
      let mesh;
      if (this.skin != null) {
        const sk = G.skins[this.skin], os = sk.joints.map(j => objets[j]);
        const mats = os.map((_, k) => { const m = new THREE.Matrix4(); if (this.inv) m.fromArray(this.inv, k * 16); return m; });
        mesh = new THREE.SkinnedMesh(this.geo, mat);
        objets[this.noeudMesh].add(mesh);
        racine.updateMatrixWorld(true);
        mesh.bind(new THREE.Skeleton(os, mats), new THREE.Matrix4());
      } else { mesh = new THREE.Mesh(this.geo, mat); objets[this.noeudMesh].add(mesh); }
      mesh.frustumCulled = false;
      const ex = { racine, objets, mesh, mat, pos: new Float32Array(objets.length * 3), rot: new Float32Array(objets.length * 4), cap: null, prec: null, kMarche: 0, kGeste: 0, phase: 0, tMarche: 0, vu: 0, tPrec: null, flash: false, alpha: 1, vitesse: 0, hsh: 0, arme: null };
      if (this.arme) this.armer(ex);
      return ex;
    }
    armer(ex) {
      const A = this.arme, o = ex.objets.find(x => x.name === A.os);
      if (!o || ex.arme) return;
      const m = new this.THREE.Mesh(A.geo, A.mat);
      ex.racine.updateMatrixWorld(true);
      const s = new this.THREE.Vector3(); o.getWorldScale(s);
      const f = 1 / ((s.x / (ex.racine.scale.x || 1)) || 1);
      m.position.fromArray(A.position).multiplyScalar(f); m.quaternion.fromArray(A.rotation); m.scale.setScalar(A.echelle * f);
      m.frustumCulled = false;
      o.add(m); ex.arme = m;
    }
    prendre() {
      const ex = this.libre.pop() || this.exemplaire();
      if (!this.exemplaires.includes(ex)) this.exemplaires.push(ex);
      ex.prec = null; ex.cap = null; ex.kMarche = 0; ex.kGeste = 0; ex.tPrec = null; ex.vitesse = 0;
      return ex;
    }
    rendre(ex) { ex.racine.visible = false; if (!this.libre.includes(ex)) this.libre.push(ex); }

    reposer(ex) {
      for (let i = 0; i < this.repos.length; i++) { const r = this.repos[i]; ex.pos.set(r.p, i * 3); ex.rot.set(r.q, i * 4); }
    }
    meler(ex, clip, tt, poids, boucle) {
      if (!clip || poids <= 0) return;
      const d = clip.duree;
      let u = boucle ? tt % d : Math.max(0, Math.min(d, tt));
      if (u < 0) u += d;
      for (const pz of clip.pistes) {
        const t = pz.t, n = t.length;
        let i = 0;
        if (n > 1) {
          let lo = 0, hi = n - 1;
          while (hi - lo > 1) { const mid = (lo + hi) >> 1; if (t[mid] <= u) lo = mid; else hi = mid; }
          i = lo;
        }
        const i2 = Math.min(n - 1, i + 1), f = pz.pas || i2 === i ? 0 : Math.max(0, Math.min(1, (u - t[i]) / ((t[i2] - t[i]) || 1)));
        const v = pz.v;
        if (pz.rot) {
          let ax = v[i * 4], ay = v[i * 4 + 1], az = v[i * 4 + 2], aw = v[i * 4 + 3];
          if (f > 0) {
            let bx = v[i2 * 4], by = v[i2 * 4 + 1], bz = v[i2 * 4 + 2], bw = v[i2 * 4 + 3];
            if (ax * bx + ay * by + az * bz + aw * bw < 0) { bx = -bx; by = -by; bz = -bz; bw = -bw; }
            ax += (bx - ax) * f; ay += (by - ay) * f; az += (bz - az) * f; aw += (bw - aw) * f;
          }
          const o = pz.noeud * 4, R = ex.rot;
          if (poids >= 1) { R[o] = ax; R[o + 1] = ay; R[o + 2] = az; R[o + 3] = aw; } else {
            let cx = R[o], cy = R[o + 1], cz = R[o + 2], cw = R[o + 3];
            if (cx * ax + cy * ay + cz * az + cw * aw < 0) { ax = -ax; ay = -ay; az = -az; aw = -aw; }
            R[o] = cx + (ax - cx) * poids; R[o + 1] = cy + (ay - cy) * poids; R[o + 2] = cz + (az - cz) * poids; R[o + 3] = cw + (aw - cw) * poids;
          }
          const nn = Math.hypot(R[o], R[o + 1], R[o + 2], R[o + 3]) || 1;
          R[o] /= nn; R[o + 1] /= nn; R[o + 2] /= nn; R[o + 3] /= nn;
        } else {
          let x = v[i * 3], y = v[i * 3 + 1], z = v[i * 3 + 2];
          if (f > 0) { x += (v[i2 * 3] - x) * f; y += (v[i2 * 3 + 1] - y) * f; z += (v[i2 * 3 + 2] - z) * f; }
          const o = pz.noeud * 3, Pp = ex.pos, r = this.repos[pz.noeud].p;
          if (this.articulations.has(pz.noeud) && this.G.nodes[pz.noeud].name === 'Hips') { x = r[0]; z = r[2]; }
          Pp[o] += (x - Pp[o]) * poids; Pp[o + 1] += (y - Pp[o + 1]) * poids; Pp[o + 2] += (z - Pp[o + 2]) * poids;
        }
      }
    }
    appliquer(ex) {
      const objets = ex.objets, Pp = ex.pos, R = ex.rot;
      for (let i = 0; i < objets.length; i++) {
        if (!this.articulations.has(i)) continue;
        const o = objets[i];
        o.position.set(Pp[i * 3], Pp[i * 3 + 1], Pp[i * 3 + 2]);
        o.quaternion.set(R[i * 4], R[i * 4 + 1], R[i * 4 + 2], R[i * 4 + 3]);
      }
    }
    clip(role) { const c = this.P.clips[role]; const nom = c && (typeof c === 'string' ? c : c.nom); return nom ? this.clips[nom] || null : null; }

    poser(ex, x, y, z, cap, now, bouge, vitesse, geste, flash, alpha, k) {
      const r = ex.racine, t = now / 1000;
      const dt = ex.tPrec == null ? 0 : Math.min(0.1, Math.max(0, t - ex.tPrec));
      ex.tPrec = t;
      r.visible = true;
      const kk = k * this.k;
      if (r.scale.x !== kk) r.scale.set(kk, kk, kk);
      r.position.set(x, y - this.brut.bas * kk, z);
      if (cap != null) {
        if (ex.cap == null) ex.cap = cap;
        let d = cap - ex.cap; d = Math.atan2(Math.sin(d), Math.cos(d));
        ex.cap += d * (dt > 0 ? 1 - Math.exp(-dt / TAU_CAP) : 1);
        r.rotation.y = ex.cap + this.demiTour;
      }
      const P = this.P.clips;
      const marche = bouge && vitesse > 0.05;
      const vise = marche ? 1 : 0;
      ex.kMarche += (vise - ex.kMarche) * (dt > 0 ? 1 - Math.exp(-dt / TAU_MARCHE) : 1);
      const cRepos = this.clip('repos');
      const cPas = P.marche ? this.clips[P.marche.nom] || null : null, cCourse = P.course ? this.clips[P.course.nom] || null : null;
      const u = Math.max(0, Math.min(1, ((vitesse || 0) - 1.8) / 1.2));
      const wCourse = cCourse ? (cPas ? u * u * (3 - 2 * u) : 1) : 0;
      const taux = c => { const vnat = (c.vitesse || 1) * kk; return Math.max(0.5, Math.min(2.4, (vitesse || vnat) / (vnat || 1))); };
      if (ex.kMarche > 0.01) {
        if (cPas) ex.tMarche += dt * taux(P.marche);
        if (cCourse) ex.tCourse = (ex.tCourse || 0) + dt * taux(P.course);
      }
      const kM = Math.min(1, ex.kMarche), avecPas = !!cPas && wCourse < 0.999;
      this.reposer(ex);
      if (cRepos) this.meler(ex, cRepos, t + ex.hsh, 1, true);
      if (avecPas) this.meler(ex, cPas, ex.tMarche, kM, true);
      if (cCourse && wCourse > 0.001) this.meler(ex, cCourse, ex.tCourse || 0, avecPas ? wCourse : kM, true);
      const g = geste && (geste.type === 'sort' || geste.type === 'coup') ? geste : null;
      const cG = g ? this.P.clips[g.type] : null, clipG = cG ? this.clips[cG.nom] : null;
      ex.kGeste += ((clipG ? 1 : 0) - ex.kGeste) * (dt > 0 ? 1 - Math.exp(-dt / TAU_GESTE) : 1);
      if (clipG) { ex.gesteT = cG.de + Math.max(0, Math.min(1, g.t || 0)) * (cG.a - cG.de); ex.clipG = clipG; }
      if (ex.clipG && ex.kGeste > 0.01) this.meler(ex, ex.clipG, ex.gesteT || 0, Math.min(1, ex.kGeste), false);
      this.appliquer(ex);
      if (geste && (geste.type === 'saut' || geste.type === 'pousse')) r.position.y += Math.sin(Math.max(0, Math.min(1, geste.t || 0)) * Math.PI) * (geste.type === 'saut' ? 0.1 : 0.04);
      if (!!flash !== ex.flash) { ex.flash = !!flash; ex.mat.emissive.setRGB(flash ? 0.55 : 0, flash ? 0.18 : 0, flash ? 0.12 : 0); }
      const a = alpha == null ? 1 : Math.max(0, Math.min(1, alpha));
      if (a !== ex.alpha) { ex.alpha = a; ex.mat.transparent = a < 1; ex.mat.opacity = a; ex.mat.needsUpdate = false; }
    }
    liberer() {
      for (const ex of this.exemplaires) { if (ex.mat.dispose) ex.mat.dispose(); const p = ex.racine.parent; if (p) p.remove(ex.racine); }
      if (this.geo.dispose) this.geo.dispose();
      if (this.mat.dispose) this.mat.dispose();
      if (this.tex && this.tex.dispose) this.tex.dispose();
      if (this.arme) { if (this.arme.geo.dispose) this.arme.geo.dispose(); if (this.arme.mat.dispose) this.arme.mat.dispose(); if (this.arme.tex && this.arme.tex.dispose) this.arme.tex.dispose(); }
      this.exemplaires = []; this.libre = [];
    }
  }

  async function charger(THREE, nom) {
    const P = Object.assign({ nom }, PEAUX[nom]);
    const compte = { octets: 0 };
    const glb = await lire(P.fichier);
    const M = new Modele(THREE, glb, P, compte);
    if (P.arme) {
      try {
        const a = await lire(P.arme.fichier), G = a.json, prim = G.meshes[0].primitives[0];
        const geo = geometrie(THREE, G, a.bin, prim, compte), { mat, tex } = matiere(THREE, G, a.bin, prim.material, compte);
        M.arme = Object.assign({ geo, mat, tex }, P.arme);
        M.triangles += Math.round((geo.index ? geo.index.count : geo.getAttribute('position').count) / 3);
        for (const ex of M.exemplaires) M.armer(ex);
      } catch (e) { console.warn('Peau : arme indisponible', e); }
    }
    M.octets = compte.octets;
    console.log(`Peau : ${nom}, ${M.triangles} triangles, ${Object.keys(M.clips).length} clips, ${Math.round(M.brut.hauteur * 100) / 100} de haut`);
    return M;
  }

  class Parc {
    constructor(THREE, modeles, opts) {
      this.THREE = THREE; this.modeles = modeles; this.opts = opts || {};
      this.groupe = new THREE.Group(); this.groupe.name = 'peaux';
      this.etats = new Map();
      this.now = 0; this.n = 0;
      this._pv = new THREE.Matrix4(); this._ch = new THREE.Frustum(); this._sp = new THREE.Sphere();
    }
    prend(id) { return !!this.modeles[id]; }
    durees(id) { return this.modeles[id] ? this.modeles[id].P.durees : null; }
    emprise(s) { const M = this.modeles[s.modele]; return M ? (s.scale || 1) * M.P.ombre * 1.6 : 1; }
    debut(now, camera) {
      this.now = now; this.n = 0; this.camera = camera;
      for (const e of this.etats.values()) e.pose = false;
      camera.updateMatrixWorld();
      this._ch.setFromProjectionMatrix(this._pv.multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse));
    }
    poser(s) {
      const M = this.modeles[s.modele];
      if (!M) return false;
      if (s.alpha != null && s.alpha < 0.05) return true;
      const H = (s.scale || 1) * M.P.hauteur;
      this._sp.center.set(s.x, s.h + H * 0.5, s.y); this._sp.radius = H;
      if (!this._ch.intersectsSphere(this._sp)) return true;
      const cle = s.modeleCle || (s.modele + '|' + this.n);
      let e = this.etats.get(cle);
      if (!e) {
        const ex = M.prendre();
        let hsh = 0; for (let k = 0; k < cle.length; k++) hsh = (hsh * 31 + cle.charCodeAt(k)) | 0;
        ex.hsh = (hsh >>> 0) % 1000 / 250;
        if (!ex.racine.parent) this.groupe.add(ex.racine);
        e = { ex, M, prec: null, pose: false, vu: 0 };
        this.etats.set(cle, e);
      }
      const ex = e.ex;
      e.pose = true; e.vu = this.now; this.n++;
      const prec = e.prec || (e.prec = { x: s.x, y: s.y, t: this.now });
      const dx = s.x - prec.x, dy = s.y - prec.y, dist = Math.hypot(dx, dy), dtp = Math.max(1e-3, (this.now - prec.t) / 1000);
      const deplace = dist > 0.004 && dist < 3;
      const v = deplace ? Math.min(8, dist / dtp) : 0;
      ex.vitesse += (v - ex.vitesse) * Math.min(1, dtp / 0.12);
      let cap = null;
      if (deplace) cap = Math.atan2(dx, dy);
      else if (s.vers && Math.hypot(s.vers.u - s.x, s.vers.v - s.y) > 0.05) cap = Math.atan2(s.vers.u - s.x, s.vers.v - s.y);
      else if (ex.cap == null || s.combat) { const c = this.camera.position; cap = Math.atan2(c.x - s.x, c.z - s.y) + (s.combat ? 0 : (typeof s.facing === 'number' ? Math.sign(s.facing) : 1) * 0.3); }
      prec.x = s.x; prec.y = s.y; prec.t = this.now;
      M.poser(ex, s.x, s.h, s.y, cap, this.now, ex.vitesse > 0.15, ex.vitesse, s.geste || null, !!s.flash, s.alpha, s.scale || 1);
      return true;
    }
    fin() {
      for (const [k, e] of this.etats) {
        if (!e.pose) { e.ex.racine.visible = false; }
        if (this.now - e.vu > 5000) { e.M.rendre(e.ex); this.etats.delete(k); }
      }
    }
    stats() {
      let tri = 0;
      for (const e of this.etats.values()) if (e.pose) tri += e.M.triangles;
      return { peaux: this.n, appels: this.n * 2, triangles: tri };
    }
    octets() { let o = 0; for (const M of Object.values(this.modeles)) o += M.octets || 0; return o; }
    liberer() { for (const M of Object.values(this.modeles)) M.liberer(); this.modeles = {}; this.etats.clear(); }
  }
  async function parc(THREE, opts) {
    const modeles = {};
    for (const id of (opts && opts.ids) || MONSTRES) {
      try { modeles[id] = await charger(THREE, id); } catch (e) { console.warn('Peau du monstre ' + id + ' indisponible : ' + e.message); }
    }
    return Object.keys(modeles).length ? new Parc(THREE, modeles, opts) : null;
  }
  function composer(parcs) {
    const liste = parcs.filter(Boolean);
    if (liste.length === 1) return liste[0];
    const de = id => liste.find(p => p.prend(id)) || null;
    return {
      parcs: liste,
      prend: id => liste.some(p => p.prend(id)),
      durees: id => { const p = de(id); return p ? p.durees(id) : null; },
      emprise: s => { const p = de(s.modele); return p ? p.emprise(s) : 1; },
      debut: (now, camera) => { for (const p of liste) p.debut(now, camera); },
      poser: s => { const p = de(s.modele); return p ? p.poser(s) : false; },
      fin: () => { for (const p of liste) p.fin(); },
      stats: () => { const out = { glyms: 0, appels: 0, triangles: 0, peaux: 0 }; for (const p of liste) { const s = p.stats() || {}; out.glyms += s.glyms || 0; out.peaux += s.peaux || 0; out.appels += s.appels || 0; out.triangles += s.triangles || 0; } out.parGlym = out.glyms ? Math.round(out.triangles / out.glyms) : 0; return out; },
      octets: () => liste.reduce((o, p) => o + (p.octets ? p.octets() : 0), 0),
      liberer: () => { for (const p of liste) p.liberer(); },
    };
  }

  let ECHELLE = 1;
  try { const q = parseFloat(new URLSearchParams(location.search).get('heros_echelle')); if (Number.isFinite(q) && q > 0.3 && q < 3) ECHELLE = q; } catch (e) {   }
  async function chargerHeros(THREE, classe) {
    const M = await charger(THREE, classe);
    const ex = M.prendre();
    ex.racine.visible = false;
    const h = { classe, M, ex, racine: ex.racine, appels: M.arme ? 2 : 1, triangles: M.triangles, os: new Map(ex.objets.filter(o => o.isBone).map(o => [o.name, o])), octets: M.octets, peau: true };
    h.porteur = (THREE2, parent) => porteur(THREE2 || THREE, h, parent);
    console.log(`Héros à peau : ${classe}, ${h.appels} appels, ${h.triangles} triangles, ${h.os.size} os`);
    return h;
  }
  function porteur(THREE, h, parent) {
    if (parent && !h.racine.parent) parent.add(h.racine);
    const P = { h, prec: null, cap: null, now: 0, pose: false, force: null, racine: h.racine };
    P.debut = now => { P.now = now; P.pose = false; };
    P.poser = s => {
      const ex = h.ex, M = h.M, alpha = s.alpha == null ? 1 : s.alpha;
      const prec = P.prec || (P.prec = { x: s.x, y: s.y, t: P.now });
      const dx = s.x - prec.x, dy = s.y - prec.y, dist = Math.hypot(dx, dy), dtp = Math.max(1e-3, (P.now - prec.t) / 1000);
      const deplace = dist > 0.004 && dist < 3;
      const v = deplace ? Math.min(9, dist / dtp) : 0;
      ex.vitesse += (v - ex.vitesse) * Math.min(1, dtp / 0.12);
      if (deplace) P.cap = Math.atan2(dx, dy);
      else if (s.vers && (Math.abs(s.vers.u - s.x) > 0.01 || Math.abs(s.vers.v - s.y) > 0.01)) P.cap = Math.atan2(s.vers.u - s.x, s.vers.v - s.y);
      prec.x = s.x; prec.y = s.y; prec.t = P.now;
      P.pose = true;
      if (alpha < 0.3) { ex.racine.visible = false; return true; }
      const F = P.force;
      const bouge = s.bouge != null ? !!s.bouge : deplace;
      M.poser(ex, s.x, s.h, s.y, F && F.cap != null ? F.cap : P.cap, P.now, bouge, bouge ? Math.max(ex.vitesse, 1.5) : ex.vitesse, F || s.geste || null, !!s.flash, alpha, (s.scale || 1) * ECHELLE);
      return true;
    };
    P.emprise = s => (s.scale || 1) * ECHELLE * h.M.P.ombre * 1.6;
    P.fin = () => { if (!P.pose) h.racine.visible = false; };
    P.durees = () => h.M.P.durees;
    P.octets = () => h.octets || 0;
    P.liberer = () => h.M.liberer();
    return P;
  }

  return { PEAUX, MONSTRES, lire, charger, parc, composer, chargerHeros, porteur, Modele, Parc, get ECHELLE() { return ECHELLE; }, set ECHELLE(v) { ECHELLE = v; } };
})();
if (typeof module !== 'undefined' && module.exports) module.exports = IlePeau;
