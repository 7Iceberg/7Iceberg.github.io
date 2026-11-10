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
    glym_aer: { fichier: 'assets/peaux/glym_aer.glb', hauteur: 1.2, ombre: 0.44, sens: 1, gabarit: 'libre', rendus: { '*': 'ventTexture' }, coeurVent: [0, 0.64],
      aura: { style: 'vent', couleur: [0.78, 0.9, 1], force: 0.45, rayon: 1.15, hauteur: 0.5, feuilles: 16 },
      clips: { repos: 'Repos', marche: { nom: 'Marche', vitesse: 0.6 }, sort: { nom: 'Sort', de: 0, a: 1.4 }, coup: { nom: 'Coup', de: 0, a: 0.55 }, mort: { nom: 'Mort', de: 0, a: 1.8 }, victoire: 'Victoire', placement: { nom: 'Apparition', de: 0, a: 1.3 } },
      durees: { placement: 1100, sort: 950, lacher: 0.4, pousse: 90, saut: 140, mort: 1500 } },
    glym_ignis: { fichier: 'assets/peaux/glym_ignis.glb', hauteur: 1.2, ombre: 0.46, sens: 1, gabarit: 'libre', rendus: { '*': 'feuTexture' }, oeilFeu: [0.011, -0.134, 0.261, 0.098],
      aura: { couleur: [1, 0.36, 0.05], force: 0.4, rayon: 1.2, hauteur: 0.4, couronne: false },
      clips: { repos: 'Repos', marche: { nom: 'Marche', vitesse: 0.55 }, sort: { nom: 'Sort', de: 0, a: 1.4 }, coup: { nom: 'Coup', de: 0, a: 0.55 }, mort: { nom: 'Mort', de: 0, a: 1.8 }, victoire: 'Victoire', placement: { nom: 'Apparition', de: 0, a: 1.2 } },
      durees: { placement: 1000, sort: 950, lacher: 0.4, pousse: 90, saut: 140, mort: 1500 } },
    glym_terra: { fichier: 'assets/peaux/glym_terra.glb', hauteur: 1.2, ombre: 0.5, sens: 1, gabarit: 'libre', rendus: { Oeil: 'oeilLueur' },
      aura: { couleur: [0.62, 0.85, 0.3], force: 0.3, rayon: 1.05, hauteur: 0.3, couronne: false },
      clips: { repos: 'Repos', marche: { nom: 'Marche', vitesse: 0.5 }, sort: { nom: 'Sort', de: 0, a: 1.4 }, coup: { nom: 'Coup', de: 0, a: 0.55 }, mort: { nom: 'Mort', de: 0, a: 1.8 }, victoire: 'Victoire', placement: { nom: 'Apparition', de: 0, a: 1.3 } },
      durees: { placement: 1100, sort: 950, lacher: 0.45, pousse: 90, saut: 140, mort: 1500 } },
    glym_aqua: { fichier: 'assets/peaux/glym_aqua.glb', hauteur: 1.6, ombre: 0.5, sens: 1, gabarit: 'libre', rendus: { '*': 'eauVivante' }, cascade: [0.27, 0.66, -0.1, 0.95],
      aura: { couleur: [0.3, 0.75, 1], force: 0.32, rayon: 1.05, hauteur: 0.3, couronne: false },
      clips: { repos: 'Repos', marche: { nom: 'Marche', vitesse: 0.6 }, sort: { nom: 'Sort', de: 0, a: 1.4 }, coup: { nom: 'Coup', de: 0, a: 0.55 }, mort: { nom: 'Mort', de: 0, a: 1.8 }, victoire: 'Victoire', placement: { nom: 'Apparition', de: 0, a: 1.3 } },
      durees: { placement: 1100, sort: 950, lacher: 0.4, pousse: 90, saut: 140, mort: 1500 } },
    chateigne: { fichier: 'assets/peaux/chateigne.glb', hauteur: 1.0, ombre: 0.55, sens: 1, gabarit: 'libre',
      aura: { couleur: [0.85, 0.5, 0.2], force: 0.25, rayon: 1.0, hauteur: 0.3, couronne: false },
      clips: { repos: 'Repos', marche: { nom: 'Marche', vitesse: 0.9 }, sort: { nom: 'Sort', de: 0, a: 1.3 }, coup: { nom: 'Coup', de: 0, a: 0.55 }, mort: { nom: 'Mort', de: 0, a: 1.8 }, victoire: 'Victoire', placement: { nom: 'Apparition', de: 0, a: 1.2 } },
      durees: { placement: 1000, sort: 950, lacher: 0.4, pousse: 90, saut: 140, mort: 1500 } },
    grillon_ruche: { fichier: 'assets/peaux/grillon_ruche.glb', hauteur: 0.9, ombre: 0.6, sens: 1, gabarit: 'libre',
      aura: { couleur: [1, 0.78, 0.25], force: 0.25, rayon: 1.0, hauteur: 0.3, couronne: false },
      clips: { repos: 'Repos', marche: { nom: 'Marche', vitesse: 0.9 }, sort: { nom: 'Sort', de: 0, a: 1.3 }, coup: { nom: 'Coup', de: 0, a: 0.55 }, mort: { nom: 'Mort', de: 0, a: 1.8 }, victoire: 'Victoire', placement: { nom: 'Apparition', de: 0, a: 1.3 } },
      durees: { placement: 1100, sort: 950, lacher: 0.42, pousse: 90, saut: 140, mort: 1500 } },
    scarabee_ruche: { fichier: 'assets/peaux/scarabee_ruche.glb', hauteur: 1.0, ombre: 0.62, sens: 1, gabarit: 'libre',
      aura: { couleur: [1, 0.8, 0.35], force: 0.25, rayon: 1.0, hauteur: 0.3, couronne: false },
      clips: { repos: 'Repos', marche: { nom: 'Marche', vitesse: 0.8 }, sort: { nom: 'Sort', de: 0, a: 1.3 }, coup: { nom: 'Coup', de: 0, a: 0.55 }, mort: { nom: 'Mort', de: 0, a: 1.8 }, victoire: 'Victoire', placement: { nom: 'Apparition', de: 0, a: 1.3 } },
      durees: { placement: 1100, sort: 950, lacher: 0.42, pousse: 90, saut: 140, mort: 1500 } },
    mante_chene: { fichier: 'assets/peaux/mante_chene.glb', hauteur: 1.3, ombre: 0.6, sens: 1, gabarit: 'libre', rendus: { '*': 'lucioleTexture' },
      aura: { couleur: [0.45, 0.9, 0.6], force: 0.25, rayon: 1.0, hauteur: 0.3, couronne: false },
      clips: { repos: 'Repos', marche: { nom: 'Marche', vitesse: 0.6 }, sort: { nom: 'Sort', de: 0, a: 1.3 }, coup: { nom: 'Coup', de: 0, a: 0.55 }, mort: { nom: 'Mort', de: 0, a: 1.8 }, victoire: 'Victoire', placement: { nom: 'Apparition', de: 0, a: 1.3 } },
      durees: { placement: 1100, sort: 950, lacher: 0.35, pousse: 90, saut: 140, mort: 1500 } },
  };
  const MONSTRES = ['filin', 'lampignard', 'glym_aer', 'glym_ignis', 'glym_terra', 'glym_aqua', 'chateigne', 'grillon_ruche', 'scarabee_ruche', 'mante_chene'];
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
    if (!/^file:/.test(url) && typeof IleGlb === 'object' && typeof IleGlb.octets === 'function') return IleGlb.octets(url);
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
  let TEXTURE_MAX = Infinity;
  function matiere(THREE, G, bin, idx, compte) {
    const m = (G.materials || [])[idx] || {}, pbr = m.pbrMetallicRoughness || {}, baseC = pbr.baseColorFactor || [1, 1, 1, 1];
    let tex = null;
    const t = pbr.baseColorTexture && (G.textures || [])[pbr.baseColorTexture.index], im = t && G.images && G.images[t.source];
    if (im && im.bufferView != null && typeof Blob !== 'undefined' && URL.createObjectURL) {
      const bv = G.bufferViews[im.bufferView], u8 = new Uint8Array(bin, bv.byteOffset || 0, bv.byteLength), d = dimsImage(u8);
      const k = Math.min(1, TEXTURE_MAX / Math.max(d[0], d[1]));
      compte.octets += Math.round(d[0] * k) * Math.round(d[1] * k) * 4 * 4 / 3;
      const url = URL.createObjectURL(new Blob([u8], { type: im.mimeType || 'image/jpeg' }));
      if (k < 1 && typeof document === 'object') {
        tex = new THREE.Texture();
        const img = new Image();
        img.onload = () => {
          const cv = document.createElement('canvas'); cv.width = Math.round(d[0] * k); cv.height = Math.round(d[1] * k);
          cv.getContext('2d').drawImage(img, 0, 0, cv.width, cv.height);
          tex.image = cv; tex.needsUpdate = true; URL.revokeObjectURL(url);
        };
        img.src = url;
      } else tex = new THREE.TextureLoader().load(url, () => URL.revokeObjectURL(url));
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
        if (chemin !== 'translation' && chemin !== 'rotation' && chemin !== 'scale') continue;
        const s = a.samplers[ch.sampler], t = accesseur(G, bin, s.input).array, v = accesseur(G, bin, s.output);
        duree = Math.max(duree, t[t.length - 1]);
        if (chemin === 'scale' && v.array.every(x => Math.abs(x - 1) < 1e-4)) continue;
        pistes.push({ noeud: ch.target.node, rot: chemin === 'rotation', sca: chemin === 'scale', t, v: v.array, pas: s.interpolation === 'STEP' });
      }
      out[a.name] = { nom: a.name, duree: Math.max(0.001, duree), pistes };
    }
    return out;
  }

  function matiereLibre(THREE, G, idx, couleurs) {
    const m = (G.materials || [])[idx] || {}, pbr = m.pbrMetallicRoughness || {}, c = pbr.baseColorFactor || [1, 1, 1, 1];
    const r = pbr.roughnessFactor == null ? 1 : pbr.roughnessFactor, e = m.emissiveFactor || [0, 0, 0];
    const alpha = c[3] == null ? 1 : c[3], transparent = m.alphaMode === 'BLEND' || alpha < 0.999;
    const brillance = Math.max(2, Math.min(120, 2 / Math.max(0.02, Math.pow(r, 4)) - 2));
    const reflet = Math.max(0.02, 0.5 * (1 - r) * (1 - r));
    const mat = new THREE.MeshPhongMaterial({
      color: new THREE.Color(c[0], c[1], c[2]), opacity: alpha, transparent, depthWrite: !transparent, vertexColors: !!couleurs,
      emissive: new THREE.Color(e[0], e[1], e[2]), specular: new THREE.Color(reflet, reflet, reflet), shininess: brillance,
      side: m.doubleSided ? THREE.DoubleSide : THREE.FrontSide, fog: true,
    });
    mat.name = m.name || 'piece';
    mat.userData.emission = [e[0], e[1], e[2]]; mat.userData.opacite = alpha; mat.userData.transparent = transparent;
    mat.userData.fresnel = transparent;
    fresnel(mat);
    return mat;
  }
  function fresnel(mat) {
    if (!mat.userData.fresnel) return mat;
    mat.onBeforeCompile = sh => {
      sh.fragmentShader = sh.fragmentShader.replace('#include <output_fragment>', `
        float fresnelV = pow(1.0 - abs(dot(normalize(normal), normalize(vViewPosition))), 2.5);
        diffuseColor.a = mix(diffuseColor.a, 1.0, fresnelV * 0.55);
        outgoingLight += vec3(fresnelV * 0.16);
        #include <output_fragment>`);
    };
    mat.customProgramCacheKey = () => 'peau-fresnel';
    return mat;
  }

  const RENDUS = {
    ventTexture(material, M) {
      if (material.userData.ventTexture || !material.map) return;
      material.userData.ventTexture = true;
      material.userData.temps = { value: 0 }; material.userData.liquide = { value: 0 }; material.userData.bouillon = { value: 1 };
      const b = M && M.boiteRepos ? M.boiteRepos : { bas: -1, haut: 1 }, c = (M && M.P && M.P.coeurVent) || [0, 0.62];
      const cy = b.bas + c[1] * (b.haut - b.bas), Hm = b.haut - b.bas;
      const original = material.onBeforeCompile, U = material.userData;
      material.onBeforeCompile = function (shader, renderer) {
        if (original) original.call(this, shader, renderer);
        shader.uniforms.uTemps = U.temps; shader.uniforms.uTempete = U.liquide; shader.uniforms.uRafale = U.bouillon;
        shader.vertexShader = 'uniform float uTemps;\nuniform float uTempete;\nuniform float uRafale;\nvarying vec3 vPosRepos;\n' + shader.vertexShader
          .replace('#include <begin_vertex>', '#include <begin_vertex>\n  vPosRepos = position;')
          .replace('#include <skinning_vertex>', `#include <skinning_vertex>
  {
    vec3 pr = vPosRepos;
    float loin = clamp(length(vec2(pr.x - (${c[0].toFixed(4)}), pr.y - (${cy.toFixed(4)}))) / ${(0.5 * Hm).toFixed(4)}, 0.0, 1.0);
    float rafale = 0.6 + 0.4 * sin(uTemps * 1.7 + pr.y * 3.0);
    float k = (0.35 + 0.35 * uRafale + uTempete) * loin * rafale;
    transformed += normalize(objectNormal) * k * ${(0.006 * Hm).toFixed(5)} * sin(uTemps * 23.0 + pr.x * 41.0 + pr.y * 37.0 + pr.z * 29.0);
    transformed.x += k * ${(0.004 * Hm).toFixed(5)} * sin(uTemps * 11.0 + pr.y * 13.0);
  }`);
        shader.fragmentShader = 'uniform float uTemps;\nuniform float uTempete;\nuniform float uRafale;\nvarying vec3 vPosRepos;\n' + shader.fragmentShader.replace('#include <emissivemap_fragment>', `#include <emissivemap_fragment>
  vec2 q = vec2(vPosRepos.x - (${c[0].toFixed(4)}), vPosRepos.y - (${cy.toFixed(4)})) / ${(0.5 * Hm).toFixed(4)};
  float a = atan(q.y, q.x), r = length(q);
  float trainee = pow(0.5 + 0.5 * sin(a * 2.0 + r * 6.0 - uTemps * (3.0 + 2.0 * uTempete)), 10.0) * smoothstep(0.25, 0.6, r);
  float vert = smoothstep(0.02, 0.12, diffuseColor.g - max(diffuseColor.r, diffuseColor.b));
  totalEmissiveRadiance += vec3(0.85, 0.95, 1.0) * trainee * (0.18 + 0.2 * uRafale) + diffuseColor.rgb * vert * 0.12 * (0.5 + 0.5 * sin(uTemps * 5.0 + a * 3.0));`);
      };
      material.customProgramCacheKey = () => 'peau-vent-texture';
      material.needsUpdate = true;
    },
    feuTexture(material, M) {
      if (material.userData.feuTexture || !material.map) return;
      material.userData.feuTexture = true;
      material.userData.temps = { value: 0 }; material.userData.liquide = { value: 0 }; material.userData.bouillon = { value: 1 };
      const b = M && M.boiteRepos ? M.boiteRepos : { bas: -1, haut: 1 }, Hm = b.haut - b.bas;
      const oe = (M && M.P && M.P.oeilFeu) || [0, 0, 0, 0], f = x => (+x).toFixed(4);
      const masque = `float feuMasque(vec3 c) {
  float mx = max(c.r, max(c.g, c.b)), mn = min(c.r, min(c.g, c.b)), sat = (mx - mn) / (mx + 1e-4);
  return smoothstep(0.62, 0.8, c.r) * smoothstep(0.22, 0.36, c.g) * (1.0 - smoothstep(0.42, 0.55, c.b)) * smoothstep(0.38, 0.5, sat);
}
float feuOeil(vec3 p) { return (1.0 - smoothstep(${f(oe[3] * 0.8)}, ${f(oe[3] * 1.15)}, length(p.xy - vec2(${f(oe[0])}, ${f(oe[1])})))) * step(${f(oe[2] - oe[3])}, p.z); }
float feuHash(vec3 p) { p = fract(p * 0.3183099 + 0.1); p *= 17.0; return fract(p.x * p.y * p.z * (p.x + p.y + p.z)); }
float feuBruit(vec3 x) {
  vec3 i = floor(x), g = fract(x); g = g * g * (3.0 - 2.0 * g);
  return mix(mix(mix(feuHash(i), feuHash(i + vec3(1.0, 0.0, 0.0)), g.x), mix(feuHash(i + vec3(0.0, 1.0, 0.0)), feuHash(i + vec3(1.0, 1.0, 0.0)), g.x), g.y),
             mix(mix(feuHash(i + vec3(0.0, 0.0, 1.0)), feuHash(i + vec3(1.0, 0.0, 1.0)), g.x), mix(feuHash(i + vec3(0.0, 1.0, 1.0)), feuHash(i + vec3(1.0, 1.0, 1.0)), g.x), g.y), g.z);
}
// La chaleur qui monte : un bruit en trois octaves qui défile vers le haut, de plus en plus vite.
float feuFlux(vec3 p, float t) {
  vec3 q = p * ${f(17 / Hm)}; q.y -= t * 3.2;
  return 0.55 * feuBruit(q) + 0.3 * feuBruit(q * 2.1 + vec3(0.0, -t * 2.6, 0.0)) + 0.15 * feuBruit(q * 4.3 + vec3(0.0, -t * 4.5, 0.0));
}
`;
      const original = material.onBeforeCompile, U = material.userData;
      material.onBeforeCompile = function (shader, renderer) {
        if (original) original.call(this, shader, renderer);
        shader.uniforms.uTemps = U.temps; shader.uniforms.uChaleur = U.liquide; shader.uniforms.uCrepite = U.bouillon;
        shader.vertexShader = 'uniform float uTemps;\nuniform float uChaleur;\nuniform sampler2D map;\nvarying vec3 vPosRepos;\nvarying float vFeu;\n' + masque + shader.vertexShader
          .replace('#include <begin_vertex>', '#include <begin_vertex>\n  vPosRepos = position;')
          .replace('#include <skinning_vertex>', `#include <skinning_vertex>
  {
    vec3 pr = vPosRepos;
    // (Les flammes bougent par leurs os, les langues de feu : aucun sommet n'est déplacé selon la texture,
    // qui, lue aux coutures, ouvrirait des fentes.)
    vFeu = feuMasque(texture2D(map, uv).rgb) * (1.0 - feuOeil(pr));
  }`);
        shader.fragmentShader = 'uniform float uTemps;\nuniform float uChaleur;\nuniform float uCrepite;\nvarying vec3 vPosRepos;\nvarying float vFeu;\n' + masque + shader.fragmentShader
          .replace('#include <map_fragment>', `#ifdef USE_MAP
  vec4 feuBase = texture2D(map, vUv);
  float feuM = max(feuMasque(feuBase.rgb), vFeu) * (1.0 - feuOeil(vPosRepos));
  vec2 danse = feuM > 0.01 ? (vec2(feuFlux(vPosRepos + vec3(3.1, 0.0, 0.0), uTemps), feuFlux(vPosRepos + vec3(0.0, 0.0, 5.7), uTemps)) - 0.5) * 0.004 * min(1.6, 1.0 + 0.5 * uChaleur) * feuM : vec2(0.0);
  vec4 feuDecale = texture2D(map, vUv + danse);
  vec4 sampledDiffuseColor = feuM > 0.01 ? mix(feuBase, feuDecale, feuM * feuMasque(feuDecale.rgb)) : feuBase;
  diffuseColor *= sampledDiffuseColor;
#endif`)
          .replace('#include <emissivemap_fragment>', `#include <emissivemap_fragment>
  {
    float feuF = max(feuMasque(diffuseColor.rgb), vFeu) * (1.0 - feuOeil(vPosRepos));
    float eclat = pow(0.5 + 0.5 * sin(vPosRepos.x * 61.0 + vPosRepos.y * 57.0 + uTemps * 8.0) * sin(vPosRepos.z * 53.0 - uTemps * 6.5), 7.0);
    // Le feu vivant : la chaleur qui monte (feuFlux) allume la flamme par vagues ; là où elle est forte, le
    // feu passe au jaune puis au blanc, là où elle faiblit il retombe au rouge sombre ; le coeur jaune de la
    // texture pulse plus fort. (La lueur suit le crépitement : à la mort, il tombe, le feu s'éteint.)
    if (feuF > 0.01) {
      float fl = feuFlux(vPosRepos, uTemps);
      vec3 rampe = mix(vec3(0.75, 0.1, 0.02), vec3(1.0, 0.48, 0.05), smoothstep(0.25, 0.55, fl));
      rampe = mix(rampe, vec3(1.0, 0.9, 0.55), smoothstep(0.62, 0.85, fl));
      float coeur = smoothstep(0.45, 0.75, diffuseColor.g);
      float vit = min(1.0, 0.2 + uCrepite) * (1.0 + 0.6 * uChaleur);
      totalEmissiveRadiance += feuF * vit * (diffuseColor.rgb * (0.45 + 0.5 * fl) + rampe * (0.2 + 0.7 * fl * fl) + vec3(1.0, 0.95, 0.75) * coeur * 0.4 * fl);
      diffuseColor.rgb *= 1.0 - 0.35 * feuF * (1.0 - fl);
    }
    float oeilF = feuOeil(vPosRepos) * smoothstep(0.35, 0.6, diffuseColor.r);
    totalEmissiveRadiance += diffuseColor.rgb * oeilF * (0.55 + 0.25 * sin(uTemps * 2.4) + 0.3 * uChaleur);
    // Les braises dans le bois : près du feu, de petits points qui rougeoient.
    float pres = smoothstep(0.0, 0.35, (vPosRepos.y - (${f(b.bas + 0.45 * Hm)})) / ${f(0.55 * Hm)}) * (1.0 - feuF);
    totalEmissiveRadiance += vec3(1.0, 0.32, 0.05) * pres * eclat * 0.35 * uCrepite;
  }`);
      };
      material.customProgramCacheKey = () => 'peau-feu-texture';
      material.needsUpdate = true;
    },
    oeilLueur(material) {
      if (material.userData.oeilLueur || !material.vertexColors) return;
      material.userData.oeilLueur = true;
      material.userData.temps = { value: 0 }; material.userData.bouillon = { value: 1 };
      const original = material.onBeforeCompile, U = material.userData;
      material.onBeforeCompile = function (shader, renderer) {
        if (original) original.call(this, shader, renderer);
        shader.uniforms.uTemps = U.temps; shader.uniforms.uLueur = U.bouillon;
        shader.fragmentShader = 'uniform float uTemps;\nuniform float uLueur;\n' + shader.fragmentShader.replace('#include <emissivemap_fragment>', `#include <emissivemap_fragment>
  totalEmissiveRadiance += vColor.rgb * uLueur * (0.32 + 0.08 * sin(uTemps * 2.1));`);
      };
      material.customProgramCacheKey = () => 'peau-oeil-lueur';
      material.needsUpdate = true;
    },
    lucioleTexture(material) {
      if (material.userData.lucioleTexture || !material.map) return;
      material.userData.lucioleTexture = true;
      material.userData.temps = { value: 0 }; material.userData.bouillon = { value: 1 };
      const original = material.onBeforeCompile, U = material.userData;
      material.onBeforeCompile = function (shader, renderer) {
        if (original) original.call(this, shader, renderer);
        shader.uniforms.uTemps = U.temps; shader.uniforms.uLueur = U.bouillon;
        shader.fragmentShader = 'uniform float uTemps;\nuniform float uLueur;\n' + shader.fragmentShader.replace('#include <emissivemap_fragment>', `#include <emissivemap_fragment>
  {
    vec3 c = diffuseColor.rgb;
    float l = smoothstep(0.35, 0.5, c.g) * smoothstep(0.3, 0.45, c.b) * (1.0 - smoothstep(0.35, 0.5, c.r)) * smoothstep(0.08, 0.18, c.g - c.r);
    totalEmissiveRadiance += c * l * uLueur * (0.55 + 0.25 * sin(uTemps * 2.6));
  }`);
      };
      material.customProgramCacheKey = () => 'peau-luciole-texture';
      material.needsUpdate = true;
    },
    eauVivante(material, M) {
      if (material.userData.eauVivante || !material.map) return;
      material.userData.eauVivante = true;
      material.userData.temps = { value: 0 }; material.userData.liquide = { value: 0 }; material.userData.bouillon = { value: 1 };
      const b = M && M.boiteRepos ? M.boiteRepos : { bas: -1, haut: 1 }, Hm = b.haut - b.bas;
      const cas = (M && M.P && M.P.cascade) || [0, 0, 0, 0], f = x => (+x).toFixed(4);
      const fonctions = `float eauMasque(vec3 c) {
  float mx = max(c.r, max(c.g, c.b)), mn = min(c.r, min(c.g, c.b));
  return smoothstep(0.42, 0.6, c.b) * smoothstep(0.38, 0.55, c.g) * (1.0 - smoothstep(0.82, 0.95, c.r / max(c.b, 0.01))) * smoothstep(0.08, 0.2, mx - mn + 0.15 * step(0.85, mn));
}
float eauCascade(vec3 p) { return smoothstep(${f(cas[0])}, ${f(cas[0] + 0.03)}, p.x) * (1.0 - smoothstep(${f(cas[1] - 0.03)}, ${f(cas[1])}, p.x)) * smoothstep(${f(cas[2])}, ${f(cas[2] + 0.05)}, p.y) * (1.0 - smoothstep(${f(cas[3] - 0.05)}, ${f(cas[3])}, p.y)); }
float eauHash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float eauBruit(vec2 x) { vec2 i = floor(x), g = fract(x); g = g * g * (3.0 - 2.0 * g); return mix(mix(eauHash(i), eauHash(i + vec2(1.0, 0.0)), g.x), mix(eauHash(i + vec2(0.0, 1.0)), eauHash(i + vec2(1.0, 1.0)), g.x), g.y); }
`;
      const original = material.onBeforeCompile, U = material.userData;
      material.onBeforeCompile = function (shader, renderer) {
        if (original) original.call(this, shader, renderer);
        shader.uniforms.uTemps = U.temps; shader.uniforms.uLiquide = U.liquide; shader.uniforms.uCourant = U.bouillon;
        shader.vertexShader = 'uniform float uTemps;\nuniform float uLiquide;\nuniform sampler2D map;\nvarying vec3 vPosRepos;\nvarying float vEau;\n' + fonctions + shader.vertexShader
          .replace('#include <begin_vertex>', '#include <begin_vertex>\n  vPosRepos = position;')
          .replace('#include <skinning_vertex>', `#include <skinning_vertex>
  {
    vec3 pr = vPosRepos;
    // (Aucun sommet n'est déplacé selon la texture : aux coutures, deux sommets au même endroit la lisent
    // différemment et s'écarteraient, des fentes qui scintillent. La gelée bouge par ses os.)
    vEau = eauMasque(texture2D(map, uv).rgb) * (1.0 - eauCascade(pr));
  }`);
        shader.fragmentShader = 'uniform float uTemps;\nuniform float uLiquide;\nuniform float uCourant;\nvarying vec3 vPosRepos;\nvarying float vEau;\n' + fonctions + shader.fragmentShader
          .replace('#include <map_fragment>', `#ifdef USE_MAP
  vec4 eauBase = texture2D(map, vUv);
  float eauM = max(eauMasque(eauBase.rgb), vEau);
  vec2 coule = vec2(sin(vPosRepos.y * 23.0 - uTemps * 2.3 + vPosRepos.x * 9.0) + 0.6 * sin(vPosRepos.x * 31.0 + uTemps * 3.1),
                    cos(vPosRepos.x * 19.0 + uTemps * 1.9 + vPosRepos.z * 13.0) + 0.6 * sin(vPosRepos.y * 37.0 - uTemps * 2.7)) * 0.0012 * min(1.6, 0.7 + 0.6 * uLiquide + 0.2 * max(0.0, uCourant - 1.0)) * eauM;
  // (Un décalage de moins de deux millièmes de la texture, et seulement si le point décalé est encore de
  // l'eau : jamais au-delà d'une couture, ni dans une liane voisine.)
  vec4 eauDecale = texture2D(map, vUv + coule);
  vec4 sampledDiffuseColor = eauM > 0.01 ? mix(eauBase, eauDecale, eauM * eauMasque(eauDecale.rgb)) : eauBase;
  diffuseColor *= sampledDiffuseColor;
#endif`)
          .replace('#include <emissivemap_fragment>', `#include <emissivemap_fragment>
  {
    float eauF = max(eauMasque(diffuseColor.rgb), vEau);
    float cascF = eauCascade(vPosRepos) * eauMasque(diffuseColor.rgb);
    if (eauF + cascF > 0.01) {
      float eauA = 0.5 + 0.5 * sin(vPosRepos.x * 14.0 + vPosRepos.y * 9.0 - uTemps * (2.6 + 2.0 * uLiquide));
      float eauB = 0.5 + 0.5 * sin(vPosRepos.x * -8.0 + vPosRepos.y * 16.0 - uTemps * (1.7 + 1.5 * uLiquide) + 1.3);
      vec2 cq = vPosRepos.xy * 24.0;
      float caust = pow(abs(sin(cq.x + sin(cq.y * 0.8 + uTemps * 1.6) * 1.3 + uTemps * 0.9) * sin(cq.y + sin(cq.x * 0.7 - uTemps * 1.3) * 1.3 - uTemps * 0.7)), 5.0);
      float scint = pow(0.5 + 0.5 * sin(vPosRepos.x * 61.0 + vPosRepos.y * 53.0 + uTemps * 7.0) * sin(vPosRepos.z * 57.0 - uTemps * 5.0), 6.0);
      totalEmissiveRadiance += eauF * (diffuseColor.rgb * (0.18 + 0.3 * pow(eauA * eauB, 3.0) + 0.25 * scint * uCourant + 0.12 * uLiquide) + vec3(0.6, 0.9, 1.0) * caust * 0.18);
      // La cascade : des filets étirés en hauteur, qui descendent vite.
      float fil = eauBruit(vec2(vPosRepos.x * 70.0 + vPosRepos.z * 40.0, vPosRepos.y * 5.0 + uTemps * (3.5 + 1.5 * uCourant)));
      float fil2 = eauBruit(vec2(vPosRepos.x * 140.0, vPosRepos.y * 9.0 + uTemps * (5.0 + 2.0 * uCourant)));
      totalEmissiveRadiance += cascF * vec3(0.8, 0.96, 1.0) * (0.15 + 0.6 * pow(fil, 3.0) + 0.4 * pow(fil2, 4.0));
    }
  }`);
      };
      material.customProgramCacheKey = () => 'peau-eau-vivante';
      material.needsUpdate = true;
    },
    eauTexture(material, M) {
      if (material.userData.eauTexture || !material.map) return;
      material.userData.eauTexture = true;
      material.userData.temps = { value: 0 }; material.userData.liquide = { value: 0 }; material.userData.bouillon = { value: 1 };
      const b = M && M.boiteRepos ? M.boiteRepos : { bas: -1, haut: 1 }, z = (M && M.P && M.P.zoneLiquide) || 0.5;
      const y0 = b.bas + z * (b.haut - b.bas), dy = Math.max(0.01, (b.haut - b.bas) * (1 - z));
      const original = material.onBeforeCompile, U = material.userData;
      material.onBeforeCompile = function (shader, renderer) {
        if (original) original.call(this, shader, renderer);
        shader.uniforms.uTemps = U.temps; shader.uniforms.uLiquide = U.liquide; shader.uniforms.uBouillon = U.bouillon;
        shader.vertexShader = 'uniform float uTemps;\nuniform float uLiquide;\nvarying vec3 vPosRepos;\n' + shader.vertexShader
          .replace('#include <begin_vertex>', '#include <begin_vertex>\n  vPosRepos = position;')
          .replace('#include <skinning_vertex>', `#include <skinning_vertex>
  {
    vec3 pr = vPosRepos;
    float haut = clamp((pr.y - (${y0.toFixed(4)})) / ${dy.toFixed(4)}, 0.0, 1.0);
    float ondA = sin(pr.y * 26.0 - uTemps * 9.0 + pr.x * 11.0), ondB = sin(pr.x * 21.0 + uTemps * 6.5 + pr.z * 15.0);
    // L'eau de la tête frémit toujours un peu (0,25), beaucoup quand elle devient liquide.
    float L = 0.25 + uLiquide;
    transformed += normalize(objectNormal) * L * 0.012 * (ondA + 0.7 * ondB) * haut;
    transformed.x += uLiquide * 0.035 * haut * sin(pr.y * 9.0 - uTemps * 5.0);
    transformed.y -= uLiquide * 0.05 * haut * haut;
  }`);
        shader.fragmentShader = 'uniform float uTemps;\nuniform float uLiquide;\nuniform float uBouillon;\nvarying vec3 vPosRepos;\n' + shader.fragmentShader
          .replace('#include <map_fragment>', `#ifdef USE_MAP
  float zoneEau = clamp((vPosRepos.y - (${y0.toFixed(4)})) / ${dy.toFixed(4)} * 1.5, 0.0, 1.0);
  float flux = (0.55 + 0.9 * uLiquide + 0.25 * (uBouillon - 1.0)) * zoneEau;
  vec2 coule = vec2(sin(vPosRepos.y * 23.0 - uTemps * 2.3 + vPosRepos.x * 9.0) + 0.6 * sin(vPosRepos.x * 31.0 + uTemps * 3.1),
                    cos(vPosRepos.x * 19.0 + uTemps * 1.9 + vPosRepos.z * 13.0) + 0.6 * sin(vPosRepos.y * 37.0 - uTemps * 2.7)) * 0.0028 * flux;
  vec4 sampledDiffuseColor = texture2D(map, vUv + coule);
  diffuseColor *= sampledDiffuseColor;
#endif`)
          .replace('#include <emissivemap_fragment>', `#include <emissivemap_fragment>
  float lum = dot(diffuseColor.rgb, vec3(0.299, 0.587, 0.114));
  float ecume = smoothstep(0.62, 0.82, lum);
  float clair = smoothstep(0.42, 0.7, lum) * (1.0 - ecume);
  float eauA = 0.5 + 0.5 * sin(vPosRepos.x * 14.0 + vPosRepos.y * 9.0 - uTemps * (2.6 + 3.0 * uLiquide));
  float eauB = 0.5 + 0.5 * sin(vPosRepos.x * -8.0 + vPosRepos.y * 16.0 - uTemps * (1.7 + 2.0 * uLiquide) + 1.3);
  float reflets = pow(eauA * eauB, 3.0);
  float scint = pow(0.5 + 0.5 * sin(vPosRepos.x * 61.0 + vPosRepos.y * 53.0 + uTemps * 7.0) * sin(vPosRepos.z * 57.0 - uTemps * 5.0), 6.0);
  // Les caustiques : un réseau de lumière ondulante, comme au fond d'une piscine, sur l'eau de la tête.
  vec2 cq = vPosRepos.xy * 22.0;
  float caust = pow(abs(sin(cq.x + sin(cq.y * 0.8 + uTemps * 1.6) * 1.3 + uTemps * 0.9) * sin(cq.y + sin(cq.x * 0.7 - uTemps * 1.3) * 1.3 - uTemps * 0.7)), 5.0);
  float zoneT = clamp((vPosRepos.y - (${y0.toFixed(4)})) / ${dy.toFixed(4)} * 1.5, 0.0, 1.0);
  totalEmissiveRadiance += diffuseColor.rgb * (0.35 * reflets + 0.45 * clair * (0.5 + 0.5 * eauA) + ecume * uBouillon * (0.12 + 0.4 * scint) + 0.15 * uLiquide) + vec3(0.55, 0.85, 1.0) * caust * 0.22 * zoneT * (1.0 - ecume);`);
      };
      material.customProgramCacheKey = () => 'peau-eau-texture-liquide';
      material.needsUpdate = true;
    },
    aqua(material) { RENDUS.reflets(material, [0.10, 0.58, 0.78], [0.82, 0.95, 1.0], [0.90, 0.95, 1.0]); },
    feu(material) { RENDUS.reflets(material, [0.85, 0.32, 0.06], [1.0, 0.9, 0.75], [1.0, 0.92, 0.85]); },
    reflets(material, lisere, reflet, speculaire) {
      if (material.userData.aquaReflets) return;
      material.userData.aquaReflets = true;
      material.shininess = 480;
      material.specular.setRGB(speculaire[0], speculaire[1], speculaire[2]);
      const v3 = c => `vec3(${c.map(x => x.toFixed(3)).join(', ')})`;
      const original = material.onBeforeCompile;
      material.onBeforeCompile = function (shader, renderer) {
        original.call(this, shader, renderer);
        shader.fragmentShader = shader.fragmentShader.replace(
          'outgoingLight += vec3(fresnelV * 0.16);',
          `outgoingLight += vec3(fresnelV * 0.16);
          float aquaEdge = pow(1.0 - abs(dot(normalize(normal), normalize(vViewPosition))), 5.0);
          outgoingLight += ${v3(lisere)} * aquaEdge * 0.75;
          vec3 aquaReflection = reflect(-normalize(vViewPosition), normalize(normal));
          float aquaSpot = smoothstep(0.975, 0.995, dot(aquaReflection, normalize(vec3(-0.65, 0.78, 0.22))));
          outgoingLight += ${v3(reflet)} * aquaSpot * 1.7;
          diffuseColor.a = max(diffuseColor.a, aquaSpot * 0.94);`);
      };
      const cleProg = 'reflets-' + lisere.join(',');
      material.customProgramCacheKey = () => cleProg;
      material.needsUpdate = true;
    },
    braise(material) {
      if (material.userData.braise || !material.vertexColors) return;
      material.userData.braise = true;
      material.userData.temps = { value: 0 };
      material.userData.liquide = { value: 0 };
      material.userData.bouillon = { value: 1 };
      const original = material.onBeforeCompile, temps = material.userData.temps, chaleur = material.userData.liquide, crepite = material.userData.bouillon;
      material.onBeforeCompile = function (shader, renderer) {
        if (original) original.call(this, shader, renderer);
        shader.uniforms.uTemps = temps;
        shader.uniforms.uChaleur = chaleur;
        shader.uniforms.uCrepite = crepite;
        shader.vertexShader = 'uniform float uTemps;\nuniform float uChaleur;\nvarying vec3 vPosRepos;\n' + shader.vertexShader
          .replace('#include <begin_vertex>', '#include <begin_vertex>\n  vPosRepos = position;')
          .replace('#include <skinning_vertex>', `#include <skinning_vertex>
  if (uChaleur > 0.001) {
    vec3 pr = vPosRepos;
    float haut = clamp((pr.y - 0.6) / 0.8, 0.0, 1.0);
    transformed.x += uChaleur * 0.03 * haut * sin(pr.y * 28.0 - uTemps * 12.0);
    transformed.z += uChaleur * 0.02 * haut * cos(pr.y * 23.0 - uTemps * 10.0);
    transformed.y += uChaleur * 0.04 * haut * haut * (0.6 + 0.4 * sin(uTemps * 9.0 + pr.x * 20.0));
  }`);
        shader.fragmentShader = 'uniform float uTemps;\nuniform float uChaleur;\nuniform float uCrepite;\nvarying vec3 vPosRepos;\n' + shader.fragmentShader.replace('#include <emissivemap_fragment>', `#include <emissivemap_fragment>
  float braiseA = 0.5 + 0.5 * sin(vPosRepos.y * 30.0 - uTemps * (7.0 + 6.0 * uChaleur) + vPosRepos.x * 12.0);
  float braiseB = 0.5 + 0.5 * sin(vPosRepos.x * 21.0 + uTemps * 4.3);
  float eclat = pow(0.5 + 0.5 * sin(vPosRepos.x * 57.0 + vPosRepos.y * 61.0 + uTemps * 9.0) * sin(vPosRepos.z * 53.0 - uTemps * 7.0), 8.0);
  totalEmissiveRadiance += diffuseColor.rgb * (0.25 * uChaleur + 0.5 * eclat * uCrepite);
  // (La couleur réelle de la surface, la matière par les sommets : l'orange et le jaune du feu, saturés.)
  totalEmissiveRadiance += diffuseColor.rgb * (0.85 + 0.6 * braiseA * braiseB);`);
      };
      material.customProgramCacheKey = () => 'peau-braise';
      material.needsUpdate = true;
    },
    lueur(material) {
      if (material.userData.lueur || !material.vertexColors) return;
      material.userData.lueur = true;
      material.userData.temps = { value: 0 };
      material.userData.liquide = { value: 0 };
      material.userData.bouillon = { value: 1 };
      const original = material.onBeforeCompile, temps = material.userData.temps, liquide = material.userData.liquide, bouillon = material.userData.bouillon;
      const P = material.userData.piedLiquide || [0.6, 0.75];
      material.onBeforeCompile = function (shader, renderer) {
        if (original) original.call(this, shader, renderer);
        shader.uniforms.uTemps = temps;
        shader.uniforms.uLiquide = liquide;
        shader.uniforms.uBouillon = bouillon;
        shader.vertexShader = 'uniform float uTemps;\nuniform float uLiquide;\nuniform float uBouillon;\nvarying vec3 vPosRepos;\n' + shader.vertexShader
          .replace('#include <begin_vertex>', '#include <begin_vertex>\n  vPosRepos = position;')
          .replace('#include <skinning_vertex>', `#include <skinning_vertex>
  if (uLiquide > 0.001) {
    vec3 pr = vPosRepos;
    float haut = clamp((pr.y - ${P[0].toFixed(3)}) / ${P[1].toFixed(3)}, 0.0, 1.0);
    float ondA = sin(pr.y * 26.0 - uTemps * 9.0 + pr.x * 11.0);
    float ondB = sin(pr.x * 21.0 + uTemps * 6.5 + pr.z * 15.0);
    transformed += normalize(objectNormal) * uLiquide * 0.026 * (ondA + 0.7 * ondB) * (0.4 + 0.6 * haut);
    transformed.x += uLiquide * 0.05 * haut * sin(pr.y * 9.0 - uTemps * 5.0);
    transformed.z += uLiquide * 0.025 * haut * cos(pr.y * 8.0 - uTemps * 4.2);
    transformed.y -= uLiquide * 0.09 * haut * haut;
  }
  float ecumeV = smoothstep(0.45, 0.72, color.r);
  if (ecumeV > 0.001 && uBouillon > 0.001) {
    vec3 pb = vPosRepos;
    float bul = sin(pb.x * 47.0 + uTemps * 6.1) * sin(pb.y * 43.0 - uTemps * 5.3) * sin(pb.z * 39.0 + uTemps * 4.7);
    float hou = sin(pb.x * 23.0 + pb.y * 19.0 - uTemps * 3.4);
    transformed += normalize(objectNormal) * ecumeV * uBouillon * (0.008 * bul + 0.004 * hou + 0.003);
  }`);
        shader.fragmentShader = 'uniform float uTemps;\nuniform float uLiquide;\nuniform float uBouillon;\nvarying vec3 vPosRepos;\n' + shader.fragmentShader.replace('#include <emissivemap_fragment>', `#include <emissivemap_fragment>
  float eauA = 0.5 + 0.5 * sin(vPosRepos.x * 14.0 + vPosRepos.y * 9.0 - uTemps * (2.6 + 3.0 * uLiquide));
  float eauB = 0.5 + 0.5 * sin(vPosRepos.x * -8.0 + vPosRepos.y * 16.0 - uTemps * (1.7 + 2.0 * uLiquide) + 1.3);
  totalEmissiveRadiance += vColor.rgb * (0.42 + 0.6 * pow(eauA * eauB, 3.0) + 0.22 * uLiquide);
  float ecumeF = smoothstep(0.45, 0.72, vColor.r);
  float scint = pow(0.5 + 0.5 * sin(vPosRepos.x * 61.0 + vPosRepos.y * 53.0 + uTemps * 7.0) * sin(vPosRepos.z * 57.0 - uTemps * 5.0), 6.0);
  totalEmissiveRadiance += vColor.rgb * ecumeF * uBouillon * (0.1 + 0.35 * scint);`);
      };
      material.customProgramCacheKey = () => 'peau-lueur';
      material.needsUpdate = true;
    },
  };

  const VS_AURA = `varying vec2 vUv;
void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`;
  const FS_HALO = `uniform float uTemps; uniform float uForce; uniform vec3 uCouleur; varying vec2 vUv;
void main() {
  vec2 p = vUv * 2.0 - 1.0; float r = length(p); if (r > 1.0) discard;
  float a = atan(p.y, p.x);
  float doux = 1.0 - smoothstep(0.2, 1.0, r);
  float bord = smoothstep(0.45, 0.8, r) * (1.0 - smoothstep(0.8, 1.0, r));
  float langues = pow(0.5 + 0.5 * sin(a * 7.0 + uTemps * 2.3 + sin(a * 3.0 - uTemps * 1.7) * 1.5), 3.0);
  float braise = 0.75 + 0.25 * sin(uTemps * 6.3 + a * 2.0) * sin(uTemps * 4.1 - r * 6.0);
  float i = (0.35 * doux + 0.7 * bord * langues) * braise * uForce;
  vec3 c = mix(uCouleur, vec3(1.0, 0.7, 0.3), doux * 0.25);
  gl_FragColor = vec4(c * i, 1.0);
}`;
  const FS_COURONNE = `uniform float uTemps; uniform float uForce; uniform vec3 uCouleur; varying vec2 vUv;
void main() {
  float a = vUv.x * 6.2831853, y = vUv.y;
  float s = 0.5 + 0.5 * sin(a * 9.0 + uTemps * 2.1 + sin(uTemps * 1.3 + a * 4.0) * 1.2);
  float vacille = 0.75 + 0.25 * sin(uTemps * 7.0 + a * 5.0);
  float h = (0.25 + 0.7 * s) * vacille;
  float langue = 1.0 - smoothstep(h - 0.3, h, y);
  float i = langue * (1.0 - y) * (1.0 - y) * uForce;
  if (i < 0.003) discard;
  vec3 c = mix(vec3(1.0, 0.85, 0.4), uCouleur, smoothstep(0.0, 0.7, y));
  gl_FragColor = vec4(c * i, 1.0);
}`;
  const FS_HALO_EAU = `uniform float uTemps; uniform float uForce; uniform vec3 uCouleur; varying vec2 vUv;
void main() {
  vec2 p = vUv * 2.0 - 1.0; float r = length(p); if (r > 1.0) discard;
  float doux = 1.0 - smoothstep(0.2, 1.0, r);
  float onde = pow(0.5 + 0.5 * sin(r * 22.0 - uTemps * 3.0), 6.0) * smoothstep(0.25, 0.6, r) * (1.0 - smoothstep(0.75, 1.0, r));
  float i = (0.55 * doux + 0.8 * onde) * (0.85 + 0.15 * sin(uTemps * 2.0)) * uForce;
  // (Une teinte posée sur le sol, en mélange normal : le sol prend du bleu au lieu d'être seulement éclairci.)
  vec3 c = mix(uCouleur, vec3(0.55, 0.85, 1.0), onde * 0.5);
  gl_FragColor = vec4(c, clamp(i * 1.6, 0.0, 0.85));
}`;
  const fsBulles = n => `uniform float uTemps; uniform float uForce; uniform vec3 uCouleur; varying vec2 vUv;
void main() {
  vec2 g = vec2(vUv.x * ${n.toFixed(1)}, vUv.y * 1.5 - uTemps * 0.45);
  vec2 cell = floor(g), f = fract(g) - 0.5;
  float h = fract(sin(dot(cell, vec2(12.9898, 78.233))) * 43758.5453);
  f += vec2(h - 0.5, fract(h * 7.3) - 0.5) * 0.35;
  float rad = 0.14 + 0.16 * fract(h * 13.1), d = length(f);
  float bulle = smoothstep(rad, rad - 0.05, d) * (0.3 + 0.7 * smoothstep(rad - 0.12, rad - 0.03, d));
  float reflet = smoothstep(0.07, 0.0, length(f + vec2(rad * 0.35, -rad * 0.35)));
  float i = (bulle + 0.8 * reflet * step(d, rad)) * step(0.5, h) * (1.0 - vUv.y) * uForce * 1.7;
  if (i < 0.003) discard;
  vec3 c = mix(vec3(0.8, 0.97, 1.0), uCouleur, vUv.y);
  gl_FragColor = vec4(c * i, 1.0);
}`;
  const FS_HALO_VENT = `uniform float uTemps; uniform float uForce; uniform vec3 uCouleur; varying vec2 vUv;
void main() {
  vec2 p = vUv * 2.0 - 1.0; float r = length(p); if (r > 1.0) discard;
  float a = atan(p.y, p.x);
  float spirale = pow(0.5 + 0.5 * sin(a * 3.0 + r * 9.0 - uTemps * 4.0), 6.0) * smoothstep(0.2, 0.5, r) * (1.0 - smoothstep(0.75, 1.0, r));
  float doux = 1.0 - smoothstep(0.1, 0.9, r);
  float i = (0.25 * doux + 0.9 * spirale) * uForce;
  gl_FragColor = vec4(mix(uCouleur, vec3(1.0), 0.4), clamp(i * 1.3, 0.0, 0.7));
}`;
  const FS_RUBAN = `uniform float uTemps; uniform float uForce; uniform vec3 uCouleur; varying vec2 vUv;
void main() {
  // vUv.x : le long du ruban ; vUv.y : sa largeur. Des traînées qui défilent, un bord doux.
  float bord = smoothstep(0.0, 0.35, vUv.y) * smoothstep(1.0, 0.65, vUv.y);
  float trainee = pow(0.5 + 0.5 * sin(vUv.x * 18.0 - uTemps * 6.0), 3.0) * (0.4 + 0.6 * sin(vUv.x * 3.14159));
  float i = bord * trainee * uForce;
  if (i < 0.004) discard;
  gl_FragColor = vec4(mix(uCouleur, vec3(1.0), 0.55), clamp(i * 1.6, 0.0, 0.75));
}`;
  function aura(THREE, A, rayon, sol) {
    const uni = () => ({ uTemps: { value: 0 }, uForce: { value: 0 }, uCouleur: { value: new THREE.Color().fromArray(A.couleur || [1, 0.42, 0.08]) } });
    const mat = (fs, normal) => new THREE.ShaderMaterial({ uniforms: uni(), vertexShader: VS_AURA, fragmentShader: fs, transparent: true, depthWrite: false, blending: normal ? THREE.NormalBlending : THREE.AdditiveBlending, side: THREE.DoubleSide });
    const R = rayon * (A.rayon || 1.2), H = rayon * (A.hauteur || 0.32);
    const eau = A.style === 'eau', vent = A.style === 'vent';
    const halo = new THREE.Mesh(new THREE.PlaneGeometry(2 * R, 2 * R), mat(eau ? FS_HALO_EAU : vent ? FS_HALO_VENT : FS_HALO, eau || vent));
    halo.rotation.x = -Math.PI / 2; halo.position.y = sol + 0.01 * rayon;
    const groupe = new THREE.Group(); groupe.name = 'aura';
    halo.frustumCulled = false; halo.renderOrder = 2; groupe.add(halo);
    const out = { groupe, mats: [halo.material], force: A.force == null ? 0.35 : A.force, R, H, sol };
    if (vent) {
      const ruban = (tours, haut, r0, r1) => {
        const n = 90, pos = [], uv = [], idx = [];
        for (let k = 0; k <= n; k++) {
          const u = k / n, a = u * tours * Math.PI * 2, r = r0 + (r1 - r0) * u, y = u * haut, l = 0.06 * R + 0.04 * R * Math.sin(Math.PI * u);
          for (const s of [-1, 1]) { pos.push(Math.cos(a) * r, y + s * l, Math.sin(a) * r); uv.push(u, s < 0 ? 0 : 1); }
          if (k < n) { const i = k * 2; idx.push(i, i + 1, i + 2, i + 1, i + 3, i + 2); }
        }
        const geo = new THREE.BufferGeometry();
        geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); geo.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); geo.setIndex(idx);
        return geo;
      };
      out.rubans = [];
      [[1.6, 2.6, 0.95, 0.55, 0.15, 0], [1.3, 2.2, 0.8, 0.6, -0.2, 2.1], [1.9, 3.0, 1.05, 0.45, 0.1, 4.2]].forEach(([tours, haut, r0, r1, pente, depart], k) => {
        const m = new THREE.Mesh(ruban(tours, H * haut, R * r0, R * r1), mat(FS_RUBAN, true));
        m.position.y = sol + 0.02 * rayon; m.rotation.set(pente, depart, pente * 0.5);
        m.frustumCulled = false; m.renderOrder = 3; groupe.add(m); out.mats.push(m.material); out.rubans.push({ m, vit: 1.2 + 0.4 * k, depart });
      });
      const N = A.feuilles || 16;
      const gf = new THREE.BufferGeometry();
      gf.setAttribute('position', new THREE.Float32BufferAttribute([0, -1, 0, 0.45, 0, 0.08, 0, 1, 0, -0.45, 0, 0.08], 3));
      gf.setAttribute('color', new THREE.Float32BufferAttribute([0.25, 0.55, 0.15, 0.45, 0.8, 0.25, 0.35, 0.7, 0.2, 0.3, 0.6, 0.18], 3));
      gf.setIndex([0, 1, 2, 0, 2, 3]); gf.computeVertexNormals();
      const mfe = new THREE.MeshLambertMaterial({ vertexColors: true, side: THREE.DoubleSide });
      const feuilles = new THREE.InstancedMesh(gf, mfe, N);
      const mca = new THREE.MeshLambertMaterial({ color: new THREE.Color(0.5, 0.47, 0.42), flatShading: true });
      const cailloux = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(1, 0), mca, Math.max(3, Math.round(N / 3)));
      for (const im of [feuilles, cailloux]) { im.instanceMatrix.setUsage(THREE.DynamicDrawUsage); im.frustumCulled = false; groupe.add(im); }
      out.feuilles = { feuilles, cailloux, N, Nc: cailloux.count, graines: Array.from({ length: N + cailloux.count }, (_, k) => ((k * 0.61803) % 1)), m: new THREE.Matrix4(), q: new THREE.Quaternion(), v: new THREE.Vector3(), e: new THREE.Vector3(), r: new THREE.Euler() };
    } else if (!eau && !A.flammes && A.couronne !== false) {
      const couronne = new THREE.Mesh(new THREE.CylinderGeometry(R * 0.82, R * 0.9, H, 48, 1, true), mat(FS_COURONNE));
      couronne.position.y = sol + H / 2; couronne.frustumCulled = false; couronne.renderOrder = 2;
      groupe.add(couronne); out.mats.push(couronne.material);
    } else if (!eau) {
      const N = A.flammes;
      const prof = [];
      for (let k = 0; k <= 10; k++) { const y = k / 10; prof.push(new THREE.Vector2(Math.max(0.001, 0.42 * Math.sin(Math.PI * Math.pow(y, 0.6)) * Math.pow(1 - y, 0.45)), y)); }
      const geo = new THREE.LatheGeometry(prof, 10);
      const pos = geo.getAttribute('position'), col = new Float32Array(pos.count * 3);
      for (let k = 0; k < pos.count; k++) {
        const y = pos.getY(k);
        const c = y < 0.3 ? [1, 0.82 - 0.6 * y, 0.25 - 0.6 * y] : [1, Math.max(0.1, 0.64 - 0.8 * (y - 0.3)), Math.max(0.02, 0.07 - 0.1 * (y - 0.3))];
        col.set(c.map(x => Math.max(0, Math.min(1, x))), k * 3);
      }
      geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
      const mf = new THREE.MeshBasicMaterial({ vertexColors: true, transparent: true, opacity: 0.85, depthWrite: false, side: THREE.DoubleSide });
      const flammes = new THREE.InstancedMesh(geo, mf, N);
      flammes.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
      flammes.frustumCulled = false; flammes.renderOrder = 3;
      groupe.add(flammes);
      out.flammes = { mesh: flammes, N, mat: mf, graines: Array.from({ length: N }, (_, k) => ((k * 0.61803) % 1)), m: new THREE.Matrix4(), q: new THREE.Quaternion(), v: new THREE.Vector3(), e: new THREE.Vector3(), r: new THREE.Euler() };
    } else {
      const N = A.bulles || 14;
      const c = A.couleur || [0.15, 0.68, 1];
      const mb = new THREE.MeshPhongMaterial({ color: new THREE.Color(c[0] * 0.6, c[1] * 0.75, c[2]), emissive: new THREE.Color(c[0] * 0.2, c[1] * 0.35, c[2] * 0.55), specular: new THREE.Color(0.9, 0.97, 1), shininess: 90, transparent: true, opacity: 0.42, depthWrite: false });
      mb.userData.fresnel = true; fresnel(mb);
      const bulles = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(1, 2), mb, N);
      bulles.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
      bulles.frustumCulled = false; bulles.renderOrder = 3;
      groupe.add(bulles);
      out.bulles = { mesh: bulles, N, graines: Array.from({ length: N }, (_, k) => ((k * 0.61803) % 1)), m: new THREE.Matrix4(), q: new THREE.Quaternion(), v: new THREE.Vector3(), e: new THREE.Vector3() };
    }
    return out;
  }
  function poserVent(au, t, f) {
    const k = Math.max(0, Math.min(1.6, f / (au.force || 0.35)));
    for (const r of au.rubans || []) { r.m.rotation.y = r.depart + t * r.vit * (0.6 + 0.6 * k); r.m.scale.setScalar(0.9 + 0.1 * Math.sin(t * 2 + r.depart) + 0.15 * Math.max(0, k - 1)); }
    const F = au.feuilles, R = au.R, H = au.H;
    if (!F) return;
    for (let i = 0; i < F.N + F.Nc; i++) {
      const caillou = i >= F.N, g = F.graines[i], vie = (t * (0.18 + 0.1 * ((g * 7) % 1)) * (0.7 + 0.5 * k) + g * 3.1) % 1;
      const an = g * Math.PI * 2 + t * (1.4 + 0.8 * ((g * 11) % 1)) * (0.7 + 0.5 * k), rr = R * (0.55 + 0.4 * ((g * 13) % 1)) * (1 - 0.35 * vie);
      const y = au.sol + vie * H * 3.2, s = (caillou ? 0.035 : 0.07) * R * (0.7 + 0.6 * ((g * 17) % 1)) * Math.min(1, vie / 0.08) * Math.min(1, (1 - vie) / 0.12) * Math.min(1, k);
      F.v.set(Math.cos(an) * rr, y, Math.sin(an) * rr);
      F.r.set(t * 3 + g * 20, t * 2.3 + g * 9, t * 4.1 + g * 13); F.q.setFromEuler(F.r);
      F.e.setScalar(Math.max(1e-4, s));
      F.m.compose(F.v, F.q, F.e);
      (caillou ? F.cailloux : F.feuilles).setMatrixAt(caillou ? i - F.N : i, F.m);
    }
    F.feuilles.instanceMatrix.needsUpdate = true; F.cailloux.instanceMatrix.needsUpdate = true;
  }
  function poserFlammes(au, t, f) {
    const F = au.flammes, R = au.R, H = au.H, k = Math.max(0, Math.min(1.6, f / (au.force || 0.35)));
    F.mat.opacity = 0.85 * Math.min(1, k);
    for (let i = 0; i < F.N; i++) {
      const g = F.graines[i], vie = (t * (0.55 + 0.25 * ((g * 7) % 1)) + g * 2.9) % 1;
      const an = g * Math.PI * 2 + Math.floor(t * (0.55 + 0.25 * ((g * 7) % 1)) + g * 2.9) * 1.7, rr = R * (0.62 + 0.3 * ((g * 13) % 1));
      const cloche = Math.sin(Math.PI * vie), vac = 1 + 0.18 * Math.sin(t * 17 + g * 40) + 0.1 * Math.sin(t * 29 + g * 13);
      const h = H * (0.9 + 0.8 * ((g * 17) % 1)) * cloche * vac * k, w = R * (0.1 + 0.05 * ((g * 23) % 1)) * (0.6 + 0.4 * cloche) * Math.min(1, k);
      F.v.set(Math.cos(an) * rr, au.sol, Math.sin(an) * rr);
      F.r.set(0.25 * Math.sin(t * 5 + g * 9) * cloche, g * 6.28, 0.25 * Math.sin(t * 4.3 + g * 17) * cloche);
      F.q.setFromEuler(F.r);
      F.e.set(Math.max(1e-4, w), Math.max(1e-4, h), Math.max(1e-4, w));
      F.m.compose(F.v, F.q, F.e);
      F.mesh.setMatrixAt(i, F.m);
    }
    F.mesh.instanceMatrix.needsUpdate = true;
  }
  function poserBulles(au, t, f) {
    const B = au.bulles, R = au.R, H = au.H, k = Math.max(0, Math.min(1.5, f / (au.force || 0.35)));
    for (let i = 0; i < B.N; i++) {
      const g = B.graines[i], vie = (t * (0.32 + 0.12 * ((g * 7) % 1)) + g * 3.7) % 1;
      const an = g * Math.PI * 2 + t * 0.25 + Math.sin(t * 0.7 + g * 9) * 0.3, rr = R * (0.55 + 0.38 * ((g * 13) % 1));
      const y = au.sol + vie * H * 2.2, ond = Math.sin(t * 3.1 + g * 11) * 0.04 * R;
      const taille = R * (0.05 + 0.06 * ((g * 17) % 1)) * (0.55 + 0.6 * vie) * Math.min(1, vie / 0.1) * (vie > 0.88 ? Math.max(0, (1 - vie) / 0.12) : 1) * Math.min(1, k);
      B.v.set(Math.cos(an) * rr + ond, y, Math.sin(an) * rr + ond * 0.6);
      B.e.setScalar(Math.max(1e-4, taille));
      B.m.compose(B.v, B.q, B.e);
      B.mesh.setMatrixAt(i, B.m);
    }
    B.mesh.instanceMatrix.needsUpdate = true;
  }

  class Modele {
    constructor(THREE, glb, P, compte) {
      const { json: G, bin } = glb;
      this.THREE = THREE; this.G = G; this.P = P;
      this.clips = clips(G, bin);
      const articulations = new Set();
      for (const s of G.skins || []) for (const j of s.joints) articulations.add(j);
      this.articulations = articulations;
      this.animes = new Set(articulations);
      for (const c of Object.values(this.clips)) for (const pz of c.pistes) this.animes.add(pz.noeud);
      this.repos = G.nodes.map(n => ({ p: n.translation ? n.translation.slice() : [0, 0, 0], q: n.rotation ? n.rotation.slice() : [0, 0, 0, 1], s: n.scale ? n.scale.slice() : [1, 1, 1] }));
      const maillages = G.nodes.map((n, i) => (n.mesh != null ? i : -1)).filter(i => i >= 0);
      if (!maillages.length) throw new Error('peau sans maillage');
      this.multi = P.gabarit === 'libre' || maillages.length > 1;
      if (this.multi) this.construireLibre(THREE, G, bin, maillages, compte);
      else {
      this.noeudMesh = maillages[0];
      const prim = G.meshes[G.nodes[this.noeudMesh].mesh].primitives[0];
      if (!prim) throw new Error('peau sans maillage');
      this.geo = geometrie(THREE, G, bin, prim, compte);
      const { mat, tex } = matiere(THREE, G, bin, prim.material, compte);
      this.mat = mat; this.tex = tex;
      this.skin = G.nodes[this.noeudMesh].skin;
      this.inv = this.skin != null && G.skins[this.skin].inverseBindMatrices != null ? accesseur(G, bin, G.skins[this.skin].inverseBindMatrices).array : null;
      this.triangles = Math.round((this.geo.index ? this.geo.index.count : this.geo.getAttribute('position').count) / 3);
      }
      this.appels = this.multi ? this.parts.length + 1 : 2;
      this.noeudLiquide = G.nodes.findIndex(n => n.name === 'liquide');
      this.noeudBouillon = G.nodes.findIndex(n => n.name === 'bouillon');
      const ex = this.exemplaire(); ex.racine.updateMatrixWorld(true);
      const v = new THREE.Vector3(), pos = this.multi ? null : this.geo.getAttribute('position'), n = pos ? pos.count : 0, pas = Math.max(1, Math.floor(n / 600));
      let bas = Infinity, haut = -Infinity;
      if (this.multi) { bas = this.boiteRepos.bas; haut = this.boiteRepos.haut; } else if (ex.mesh.isSkinnedMesh && ex.mesh.boneTransform && ex.mesh.skeleton) {
        ex.mesh.skeleton.update();
        for (let i = 0; i < n; i += pas) { v.fromBufferAttribute(pos, i); ex.mesh.boneTransform(i, v); v.applyMatrix4(ex.mesh.matrixWorld); if (v.y < bas) bas = v.y; if (v.y > haut) haut = v.y; }
      }
      if (!(haut > bas) && !this.multi) { const bb = this.geo.boundingBox; v.set(0, bb.min.y, 0).applyMatrix4(ex.mesh.matrixWorld); bas = v.y; v.set(0, bb.max.y, 0).applyMatrix4(ex.mesh.matrixWorld); haut = v.y; }
      this.brut = { bas, haut, hauteur: Math.max(0.01, haut - bas) };
      this.k = P.hauteur / this.brut.hauteur;
      this.demiTour = (P.sens ? P.sens : Modele.sens(ex)) < 0 ? Math.PI : 0;
      this.libre = [ex];
      this.exemplaires = [ex];
      this.arme = null;
    }
    construireLibre(THREE, G, bin, maillages, compte) {
      const loc = G.nodes.map((n, i) => {
        const r = this.repos[i], M = new THREE.Matrix4();
        if (n.matrix) return M.fromArray(n.matrix);
        return M.compose(new THREE.Vector3().fromArray(r.p), new THREE.Quaternion().fromArray(r.q), new THREE.Vector3().fromArray(r.s));
      });
      const monde = new Array(G.nodes.length);
      const descendre = (i, M) => { monde[i] = M.clone().multiply(loc[i]); for (const c of G.nodes[i].children || []) descendre(c, monde[i]); };
      for (const i of G.scenes[G.scene || 0].nodes || []) descendre(i, new THREE.Matrix4());
      const ibm = new Map();
      for (const sk of G.skins || []) {
        const A = sk.inverseBindMatrices != null ? accesseur(G, bin, sk.inverseBindMatrices).array : null;
        sk.joints.forEach((j, k) => { if (!ibm.has(j)) ibm.set(j, A ? new THREE.Matrix4().fromArray(A, k * 16) : monde[j].clone().invert()); });
      }
      const os = [], osDe = new Map(), inverses = [];
      const osDu = i => {
        if (!osDe.has(i)) { osDe.set(i, os.length); os.push(i); inverses.push(ibm.get(i) || (monde[i] ? monde[i].clone().invert() : new THREE.Matrix4())); }
        return osDe.get(i);
      };
      const seaux = new Map(), v = new THREE.Vector3(), nm = new THREE.Matrix3();
      let bas = Infinity, haut = -Infinity, rayon = 0;
      const norme = a => (a.normalized ? (a.array instanceof Uint8Array ? 255 : a.array instanceof Uint16Array ? 65535 : 1) : 1);
      for (const i of maillages) {
        if (!monde[i]) continue;
        const n = G.nodes[i], sk = n.skin != null ? G.skins[n.skin] : null;
        for (const prim of G.meshes[n.mesh].primitives) {
          if (prim.mode != null && prim.mode !== 4) continue;
          const at = prim.attributes, P = accesseur(G, bin, at.POSITION).array, nv = P.length / 3;
          const Nn = at.NORMAL != null ? accesseur(G, bin, at.NORMAL).array : null;
          const Ca = at.COLOR_0 != null ? accesseur(G, bin, at.COLOR_0) : null;
          const Ua = at.TEXCOORD_0 != null ? accesseur(G, bin, at.TEXCOORD_0) : null;
          const uv = Ua ? Float32Array.from(Ua.array, x => x / norme(Ua)) : null;
          const pos = new Float32Array(nv * 3), nor = Nn ? new Float32Array(nv * 3) : null, col = new Float32Array(nv * 4).fill(1);
          const ji = new Uint16Array(nv * 4), jw = new Float32Array(nv * 4);
          if (sk) {
            const Ja = accesseur(G, bin, at.JOINTS_0), Wa = accesseur(G, bin, at.WEIGHTS_0), kw = norme(Wa);
            for (let k = 0; k < nv * 4; k++) { ji[k] = osDu(sk.joints[Ja.array[k]]); jw[k] = Wa.array[k] / kw; }
            pos.set(P); if (nor) nor.set(Nn);
          } else {
            const b = osDu(i), M = new THREE.Matrix4().copy(inverses[b]).invert();
            nm.getNormalMatrix(M);
            for (let k = 0; k < nv; k++) {
              v.fromArray(P, k * 3).applyMatrix4(M); v.toArray(pos, k * 3);
              if (nor) { v.fromArray(Nn, k * 3).applyMatrix3(nm).normalize(); v.toArray(nor, k * 3); }
              ji[k * 4] = b; jw[k * 4] = 1;
            }
          }
          for (let k = 0; k < nv; k++) { const y = pos[k * 3 + 1]; if (y < bas) bas = y; if (y > haut) haut = y; const rr = Math.hypot(pos[k * 3], pos[k * 3 + 2]); if (rr > rayon) rayon = rr; }
          if (Ca) { const kc = norme(Ca); for (let k = 0; k < nv; k++) for (let c = 0; c < Ca.n; c++) col[k * 4 + c] = Ca.array[k * Ca.n + c] / kc; }
          const idx = prim.indices != null ? accesseur(G, bin, prim.indices).array : Uint32Array.from({ length: nv }, (_, k) => k);
          const cle = prim.material == null ? -1 : prim.material;
          if (!seaux.has(cle)) seaux.set(cle, { morceaux: [], nv: 0, ni: 0, couleurs: false, normales: true, uv: true });
          const S = seaux.get(cle);
          S.morceaux.push({ pos, nor, col, uv, ji, jw, idx }); S.nv += nv; S.ni += idx.length; S.couleurs = S.couleurs || !!Ca; S.normales = S.normales && !!nor; S.uv = S.uv && !!uv;
        }
      }
      this.parts = [];
      let tri = 0;
      for (const [cle, S] of seaux) {
        const pos = new Float32Array(S.nv * 3), nor = S.normales ? new Float32Array(S.nv * 3) : null, col = S.couleurs ? new Float32Array(S.nv * 4) : null;
        const ji = new Uint16Array(S.nv * 4), jw = new Float32Array(S.nv * 4), idx = S.nv > 65535 ? new Uint32Array(S.ni) : new Uint16Array(S.ni);
        const uv = S.uv ? new Float32Array(S.nv * 2) : null;
        let ov = 0, oi = 0;
        for (const m of S.morceaux) {
          const nv = m.pos.length / 3;
          pos.set(m.pos, ov * 3); if (nor) nor.set(m.nor, ov * 3); if (col) col.set(m.col, ov * 4); if (uv) uv.set(m.uv, ov * 2); ji.set(m.ji, ov * 4); jw.set(m.jw, ov * 4);
          for (let k = 0; k < m.idx.length; k++) idx[oi + k] = m.idx[k] + ov;
          ov += nv; oi += m.idx.length;
        }
        const geo = new THREE.BufferGeometry();
        geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
        if (nor) geo.setAttribute('normal', new THREE.BufferAttribute(nor, 3));
        if (col) geo.setAttribute('color', new THREE.BufferAttribute(col, 4));
        if (uv) geo.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
        geo.setAttribute('skinIndex', new THREE.BufferAttribute(ji, 4));
        geo.setAttribute('skinWeight', new THREE.BufferAttribute(jw, 4));
        geo.setIndex(new THREE.BufferAttribute(idx, 1));
        if (!nor) geo.computeVertexNormals();
        geo.computeBoundingBox();
        for (const a of [pos, nor, col, uv, ji, jw, idx]) if (a) compte.octets += a.byteLength;
        const mat = matiereLibre(THREE, G, cle, S.couleurs);
        if (uv) {
          const t0 = matiere(THREE, G, bin, cle, compte);
          if (t0.tex) { mat.map = t0.tex; mat.color.setRGB(1, 1, 1).multiply(t0.mat.color); mat.needsUpdate = true; this.textures = (this.textures || []).concat(t0.tex); }
          if (t0.mat.dispose) t0.mat.dispose();
        }
        this.parts.push({ geo, mat });
        tri += idx.length / 3;
      }
      this.parts.sort((a, b) => (a.mat.transparent ? 1 : 0) - (b.mat.transparent ? 1 : 0));
      this.os = os; this.inverses = inverses; this.boiteRepos = { bas, haut, rayon };
      this.triangles = Math.round(tri);
      this.geo = this.parts[0].geo; this.mat = this.parts[0].mat; this.tex = null;
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
      const estOs = this.multi ? new Set(this.os) : this.articulations;
      const objets = G.nodes.map((n, i) => {
        const o = estOs.has(i) ? new THREE.Bone() : new THREE.Group();
        o.name = n.name || ('noeud_' + i);
        const r = this.repos[i];
        o.position.fromArray(r.p); o.quaternion.fromArray(r.q); o.scale.fromArray(r.s);
        return o;
      });
      G.nodes.forEach((n, i) => { for (const c of n.children || []) objets[i].add(objets[c]); });
      const racine = new THREE.Group();
      racine.name = 'peau ' + (this.P.nom || '');
      for (const i of G.scenes[G.scene || 0].nodes || []) racine.add(objets[i]);
      if (this.multi) {
        const squelette = new THREE.Skeleton(this.os.map(i => objets[i]), this.inverses.map(m => m.clone()));
        const meshes = this.parts.map((pt, k) => {
          const m = new THREE.SkinnedMesh(pt.geo, fresnel(pt.mat.clone()));
          const rendu = this.P.rendus && RENDUS[this.P.rendus[pt.mat.name] || this.P.rendus['*']];
          if (rendu) rendu(m.material, this);
          m.mat0 = pt.mat; m.renderOrder = pt.mat.transparent ? 1 : 0; m.frustumCulled = false;
          racine.add(m); m.bind(squelette, new THREE.Matrix4());
          m.name = 'peau ' + (this.P.nom || '') + ' ' + k;
          return m;
        });
        const mats = meshes.map(m => m.material);
        const au = this.P.aura && typeof document === 'object' ? aura(THREE, this.P.aura, Math.min(this.boiteRepos.rayon, 0.55 * (this.boiteRepos.haut - this.boiteRepos.bas)), this.boiteRepos.bas) : null;
        if (au) racine.add(au.groupe);
        return { aura: au, racine, objets, mesh: meshes[0], meshes, mat: mats[0], mats, pos: new Float32Array(objets.length * 3), rot: new Float32Array(objets.length * 4), sca: new Float32Array(objets.length * 3), cap: null, prec: null, kMarche: 0, kGeste: 0, phase: 0, tMarche: 0, vu: 0, tPrec: null, flash: false, alpha: 1, vitesse: 0, hsh: 0, arme: null };
      }
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
      const ex = { racine, objets, mesh, mat, mats: [mat], pos: new Float32Array(objets.length * 3), rot: new Float32Array(objets.length * 4), sca: new Float32Array(objets.length * 3), cap: null, prec: null, kMarche: 0, kGeste: 0, phase: 0, tMarche: 0, vu: 0, tPrec: null, flash: false, alpha: 1, vitesse: 0, hsh: 0, arme: null };
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
      for (let i = 0; i < this.repos.length; i++) { const r = this.repos[i]; ex.pos.set(r.p, i * 3); ex.rot.set(r.q, i * 4); ex.sca.set(r.s, i * 3); }
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
        } else if (pz.sca) {
          let x = v[i * 3], y = v[i * 3 + 1], z = v[i * 3 + 2];
          if (f > 0) { x += (v[i2 * 3] - x) * f; y += (v[i2 * 3 + 1] - y) * f; z += (v[i2 * 3 + 2] - z) * f; }
          const o = pz.noeud * 3, S = ex.sca;
          S[o] += (x - S[o]) * poids; S[o + 1] += (y - S[o + 1]) * poids; S[o + 2] += (z - S[o + 2]) * poids;
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
      const objets = ex.objets, Pp = ex.pos, R = ex.rot, S = ex.sca;
      for (const i of this.animes) {
        const o = objets[i];
        o.position.set(Pp[i * 3], Pp[i * 3 + 1], Pp[i * 3 + 2]);
        o.quaternion.set(R[i * 4], R[i * 4 + 1], R[i * 4 + 2], R[i * 4 + 3]);
        o.scale.set(S[i * 3], S[i * 3 + 1], S[i * 3 + 2]);
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
      const g = geste && (geste.type === 'sort' || geste.type === 'coup' || geste.type === 'mort' || (geste.type === 'placement' && this.P.clips.placement)) ? geste : null;
      if (g && g.type === 'placement' && ex.gestePrec !== 'placement') ex.kGeste = 1;
      ex.gestePrec = g ? g.type : null;
      const cG = g ? this.P.clips[g.type] : null, clipG = cG ? this.clips[cG.nom] : null;
      ex.kGeste += ((clipG ? 1 : 0) - ex.kGeste) * (dt > 0 ? 1 - Math.exp(-dt / TAU_GESTE) : 1);
      if (clipG) { ex.gesteT = cG.de + Math.max(0, Math.min(1, g.t || 0)) * (cG.a - cG.de); ex.clipG = clipG; }
      if (ex.clipG && ex.kGeste > 0.01) this.meler(ex, ex.clipG, ex.gesteT || 0, Math.min(1, ex.kGeste), false);
      this.appliquer(ex);
      if (geste && (geste.type === 'saut' || geste.type === 'pousse')) r.position.y += Math.sin(Math.max(0, Math.min(1, geste.t || 0)) * Math.PI) * (geste.type === 'saut' ? 0.1 : 0.04);
      if (ex.aura) {
        const gt = geste && typeof geste.t === 'number' ? Math.max(0, Math.min(1, geste.t)) : 0;
        let f = ex.aura.force * (alpha == null ? 1 : Math.max(0, Math.min(1, alpha)));
        if (geste && geste.type === 'placement') f *= Math.min(1, gt / 0.6);
        if (geste && geste.type === 'mort') f *= Math.max(0, 1 - gt / 0.7);
        if (geste && geste.type === 'sort') f *= 1 + 1.2 * Math.sin(Math.PI * gt);
        for (const m of ex.aura.mats) { m.uniforms.uTemps.value = t; m.uniforms.uForce.value = f; }
        if (ex.aura.bulles) poserBulles(ex.aura, t, f);
        if (ex.aura.flammes) poserFlammes(ex.aura, t, f);
        if (ex.aura.rubans || ex.aura.feuilles) poserVent(ex.aura, t, f);
      }
      const L = this.noeudLiquide >= 0 ? Math.max(0, Math.min(1.5, ex.sca[this.noeudLiquide * 3] - 1)) : 0;
      const Bo = this.noeudBouillon >= 0 ? Math.max(0, Math.min(3, ex.sca[this.noeudBouillon * 3])) : 1;
      if (ex.mats) for (const m of ex.mats) { if (m.userData.temps) m.userData.temps.value = t; if (m.userData.liquide) m.userData.liquide.value = L; if (m.userData.bouillon) m.userData.bouillon.value = Bo; }
      if (!!flash !== ex.flash) {
        ex.flash = !!flash;
        for (const m of ex.mats) {
          const e0 = m.userData.emission;
          if (e0) m.emissive.setRGB(e0[0] + (flash ? 0.55 : 0), e0[1] + (flash ? 0.18 : 0), e0[2] + (flash ? 0.12 : 0));
          else m.emissive.setRGB(flash ? 0.55 : 0, flash ? 0.18 : 0, flash ? 0.12 : 0);
        }
      }
      const a = alpha == null ? 1 : Math.max(0, Math.min(1, alpha));
      if (a !== ex.alpha) {
        ex.alpha = a;
        for (const m of ex.mats) {
          const o0 = m.userData.opacite == null ? 1 : m.userData.opacite, t0 = !!m.userData.transparent;
          if ((t0 || a < 1) !== m.transparent) m.needsUpdate = true;
          m.transparent = t0 || a < 1; m.opacity = o0 * a;
        }
      }
    }
    liberer() {
      for (const ex of this.exemplaires) { for (const m of ex.mats) if (m.dispose) m.dispose(); if (ex.aura) ex.aura.groupe.traverse(o => { if (o.geometry) o.geometry.dispose(); if (o.material) o.material.dispose(); }); const p = ex.racine.parent; if (p) p.remove(ex.racine); }
      for (const pt of this.multi ? this.parts : [{ geo: this.geo, mat: this.mat }]) { if (pt.geo.dispose) pt.geo.dispose(); if (pt.mat.dispose) pt.mat.dispose(); }
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
    console.log(`Peau : ${nom}, ${M.triangles} triangles, ${M.appels} appels, ${Object.keys(M.clips).length} clips, ${Math.round(M.brut.hauteur * 100) / 100} de haut`);
    return M;
  }

  class Parc {
    constructor(THREE, modeles, opts, attente) {
      this.THREE = THREE; this.modeles = modeles; this.opts = opts || {};
      this.attente = new Set(attente || []); this.charges = new Map(); this.vusDe = new Map();
      this.groupe = new THREE.Group(); this.groupe.name = 'peaux';
      this.etats = new Map();
      this.now = 0; this.n = 0;
      this._pv = new THREE.Matrix4(); this._ch = new THREE.Frustum(); this._sp = new THREE.Sphere();
    }
    prend(id) { return !!this.modeles[id] || this.attente.has(id); }
    reglages(id) { return this.modeles[id] ? this.modeles[id].P : this.attente.has(id) ? PEAUX[id] : null; }
    durees(id) { const P = this.reglages(id); return P ? P.durees : null; }
    hauteur(id) { const P = this.reglages(id); return P ? P.hauteur : null; }
    emprise(s) { const P = this.reglages(s.modele); return P ? (s.scale || 1) * P.ombre * 1.6 : 1; }
    appeler(id) {
      if (this.charges.has(id)) return;
      this.charges.set(id, charger(this.THREE, id).then(M => { if (this.attente.has(id)) { this.modeles[id] = M; this.attente.delete(id); } else M.liberer(); this.charges.delete(id); })
        .catch(e => { console.warn('Peau du monstre ' + id + ' indisponible : ' + e.message); this.attente.delete(id); this.charges.delete(id); }));
    }
    debut(now, camera) {
      this.now = now; this.n = 0; this.camera = camera;
      for (const e of this.etats.values()) e.pose = false;
      camera.updateMatrixWorld();
      this._ch.setFromProjectionMatrix(this._pv.multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse));
    }
    poser(s) {
      const M = this.modeles[s.modele];
      if (!M) {
        const P = this.attente.has(s.modele) ? PEAUX[s.modele] : null;
        if (P && (s.alpha == null || s.alpha >= 0.05)) { const H = (s.scale || 1) * P.hauteur; this._sp.center.set(s.x, s.h + H * 0.5, s.y); this._sp.radius = H; if (this._ch.intersectsSphere(this._sp)) this.appeler(s.modele); }
        return false;
      }
      this.vusDe.set(s.modele, this.now);
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
      for (const id of this.opts.aLaDemande || []) {
        const M = this.modeles[id];
        if (!M || this.now - (this.vusDe.get(id) || this.now) < 30000) continue;
        if ([...this.etats.values()].some(e => e.M === M)) continue;
        M.liberer(); delete this.modeles[id]; this.attente.add(id); this.vusDe.delete(id);
      }
    }
    stats() {
      let tri = 0;
      let appels = 0;
      for (const e of this.etats.values()) if (e.pose) { tri += e.M.triangles; appels += e.M.appels || 2; }
      return { peaux: this.n, appels, triangles: tri };
    }
    octets() { let o = 0; for (const M of Object.values(this.modeles)) o += M.octets || 0; return o; }
    liberer() { for (const M of Object.values(this.modeles)) M.liberer(); this.modeles = {}; this.etats.clear(); this.attente.clear(); }
  }
  async function parc(THREE, opts) {
    if (opts && opts.telephone) TEXTURE_MAX = 768;
    const modeles = {}, ids = (opts && opts.ids) || MONSTRES;
    const aLaDemande = opts && opts.telephone ? ids.filter(id => PEAUX[id] && PEAUX[id].gabarit === 'libre') : [];
    for (const id of ids) {
      if (aLaDemande.includes(id)) continue;
      try { modeles[id] = await charger(THREE, id); } catch (e) { console.warn('Peau du monstre ' + id + ' indisponible : ' + e.message); }
    }
    return Object.keys(modeles).length || aLaDemande.length ? new Parc(THREE, modeles, Object.assign({}, opts, { aLaDemande }), aLaDemande) : null;
  }
  function composer(parcs) {
    const liste = parcs.filter(Boolean);
    if (liste.length === 1) return liste[0];
    const de = id => liste.find(p => p.prend(id)) || null;
    return {
      parcs: liste,
      prend: id => liste.some(p => p.prend(id)),
      durees: id => { const p = de(id); return p ? p.durees(id) : null; },
      hauteur: id => { const p = de(id); return p && typeof p.hauteur === 'function' ? p.hauteur(id) : null; },
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

  return { PEAUX, MONSTRES, RENDUS, lire, charger, parc, composer, chargerHeros, porteur, Modele, Parc, get ECHELLE() { return ECHELLE; }, set ECHELLE(v) { ECHELLE = v; } };
})();
if (typeof module !== 'undefined' && module.exports) module.exports = IlePeau;
