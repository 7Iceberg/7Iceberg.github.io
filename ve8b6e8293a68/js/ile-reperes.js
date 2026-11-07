const IleReperes = (() => {
  const PROCHE = 55, PORTEE = 420;
  const BRUME_MAX = 0.62, PIED = [0.06, 0.4];
  const TYPES = { 5121: Uint8Array, 5123: Uint16Array, 5125: Uint32Array, 5126: Float32Array };
  const N = { SCALAR: 1, VEC2: 2, VEC3: 3, VEC4: 4 };
  const accesseur = (G, bin, i) => { const a = G.accessors[i], bv = G.bufferViews[a.bufferView]; return new TYPES[a.componentType](bin, (bv.byteOffset || 0) + (a.byteOffset || 0), a.count * N[a.type]); };

  const donnees = () => (typeof DATA === 'object' && DATA && DATA.ile && DATA.ile.reperes) || null;
  function liste(id) {
    const R = donnees();
    if (!R || !Array.isArray(R[id])) return [];
    return R[id].filter(r => R.modeles && R.modeles[r.modele]).map(r => Object.assign({}, r, { def: R.modeles[r.modele] }));
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

  function texture(THREE, G, bin, compte) {
    const pbr = ((G.materials || [])[0] || {}).pbrMetallicRoughness || {}, t = pbr.baseColorTexture && (G.textures || [])[pbr.baseColorTexture.index];
    const im = t && (G.images || [])[t.source];
    if (!im || im.bufferView == null || typeof Blob === 'undefined' || !URL.createObjectURL) return null;
    const bv = G.bufferViews[im.bufferView], u8 = new Uint8Array(bin, bv.byteOffset || 0, bv.byteLength);
    const url = URL.createObjectURL(new Blob([u8], { type: im.mimeType || 'image/jpeg' }));
    const d = dims(u8);
    compte.tex += d[0] * d[1] * 4 * 4 / 3;
    const tex = new THREE.TextureLoader().load(url, () => URL.revokeObjectURL(url));
    tex.flipY = false;
    tex.encoding = THREE.sRGBEncoding;
    return tex;
  }

  function geometrie(THREE, G, bin, lumieres, compte) {
    const prim = G.meshes[0].primitives[0], at = prim.attributes, geo = new THREE.BufferGeometry();
    const pos = accesseur(G, bin, at.POSITION);
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    if (at.NORMAL != null) geo.setAttribute('normal', new THREE.BufferAttribute(accesseur(G, bin, at.NORMAL), 3));
    if (at.TEXCOORD_0 != null) geo.setAttribute('uv', new THREE.BufferAttribute(accesseur(G, bin, at.TEXCOORD_0), 2));
    if (prim.indices != null) geo.setIndex(new THREE.BufferAttribute(accesseur(G, bin, prim.indices), 1));
    else geo.computeVertexNormals();
    let haut = 0;
    for (let i = 1; i < pos.length; i += 3) haut = Math.max(haut, pos[i]);
    const n = pos.length / 3, lueur = new Float32Array(n * 3), c = new THREE.Color();
    for (const L of lumieres || []) {
      c.set(L[4] || '#ffd27a').convertSRGBToLinear();
      const k = haut / 1.9, x = L[0] * k, y = L[1] * k, z = L[2] * k, r = L[3] * k;
      for (let i = 0; i < n; i++) {
        const d = Math.hypot(pos[i * 3] - x, pos[i * 3 + 1] - y, pos[i * 3 + 2] - z);
        if (d >= r) continue;
        const t = 1 - d / r, w = t * t * (3 - 2 * t);
        lueur[i * 3] = Math.max(lueur[i * 3], c.r * w); lueur[i * 3 + 1] = Math.max(lueur[i * 3 + 1], c.g * w); lueur[i * 3 + 2] = Math.max(lueur[i * 3 + 2], c.b * w);
      }
    }
    geo.setAttribute('lueur', new THREE.BufferAttribute(lueur, 3));
    geo.computeBoundingSphere();
    for (const a of Object.values(geo.attributes)) compte.geo += a.array.byteLength;
    if (geo.index) compte.geo += geo.index.array.byteLength;
    return { geo, haut, triangles: (geo.index ? geo.index.count : n) / 3 };
  }

  function materiau(THREE, map, haut, uLueur) {
    const m = new THREE.MeshLambertMaterial({ map, fog: true });
    const uHaut = { value: 1 / Math.max(0.01, haut) };
    m.onBeforeCompile = sh => {
      sh.uniforms.uLueur = uLueur; sh.uniforms.uInvHaut = uHaut;
      sh.vertexShader = 'attribute vec3 lueur;\nvarying vec3 vLueur;\nvarying float vHautRel;\nuniform float uInvHaut;\n' + sh.vertexShader.replace('#include <begin_vertex>', '#include <begin_vertex>\n  vLueur = lueur;\n  vHautRel = position.y * uInvHaut;');
      sh.fragmentShader = 'varying vec3 vLueur;\nvarying float vHautRel;\nuniform float uLueur;\n' + sh.fragmentShader
        .replace('#include <emissivemap_fragment>', '#include <emissivemap_fragment>\n  totalEmissiveRadiance += vLueur * uLueur;')
        .replace('#include <fog_fragment>', `#ifdef USE_FOG
  #ifdef FOG_EXP2
    float fogFactor = 1.0 - exp( - fogDensity * fogDensity * vFogDepth * vFogDepth );
  #else
    float fogFactor = smoothstep( fogNear, fogFar, vFogDepth );
  #endif
  float plafond = mix( 1.0, ${BRUME_MAX.toFixed(3)}, smoothstep( ${PIED[0].toFixed(3)}, ${PIED[1].toFixed(3)}, vHautRel ) );
  gl_FragColor.rgb = mix( gl_FragColor.rgb, fogColor, min( fogFactor, plafond ) );
#endif`);
    };
    m.customProgramCacheKey = () => 'repere';
    m.name = 'repere';
    return m;
  }

  let texHalo = null;
  function halo(THREE) {
    if (!texHalo) {
      const c = document.createElement('canvas'); c.width = c.height = 64;
      const g = c.getContext('2d'), d = g.createRadialGradient(32, 32, 0, 32, 32, 32);
      d.addColorStop(0, 'rgba(255,240,200,1)'); d.addColorStop(0.25, 'rgba(255,200,120,0.55)'); d.addColorStop(1, 'rgba(255,170,80,0)');
      g.fillStyle = d; g.fillRect(0, 0, 64, 64);
      texHalo = new THREE.CanvasTexture(c);
    }
    return new THREE.SpriteMaterial({ map: texHalo, blending: THREE.AdditiveBlending, depthWrite: false, transparent: true, fog: false, opacity: 0.5 });
  }

  function pied(ile, r) {
    let h = Infinity;
    const c = Math.cos(r.rot || 0), s = Math.sin(r.rot || 0);
    for (const f of r.def.empreinte || []) for (const a of [-0.5, 0, 0.5]) for (const b of [-0.5, 0, 0.5]) {
      const x = f[0] + a * f[2], y = f[1] + b * f[3], u = r.u + x * c - y * s, v = r.v + x * s + y * c;
      const y0 = ile.hauteur(u, v);
      if (Number.isFinite(y0)) h = Math.min(h, y0);
    }
    return Number.isFinite(h) ? h - 0.25 : 0;
  }

  async function poser(THREE, ile) {
    const lst = ile && ile.T ? liste(ile.T.id) : [];
    if (!lst.length || typeof IleGlb !== 'object') return null;
    const uLueur = { value: 0.5 }, compte = { geo: 0, tex: 0 }, loins = {};
    const chargerLoin = async nom => {
      if (loins[nom]) return loins[nom];
      const { json: G, bin } = await IleGlb.lire(IleGlb.source(`assets/modeles/repere-${nom}-loin.glb`));
      const g = geometrie(THREE, G, bin, donnees().modeles[nom].lumieres, compte);
      return (loins[nom] = Object.assign(g, { mat: materiau(THREE, texture(THREE, G, bin, compte), g.haut, uLueur) }));
    };
    const groupe = new THREE.Group();
    groupe.name = 'reperes';
    const reperes = [];
    for (const r of lst) {
      let M;
      try { M = await chargerLoin(r.modele); } catch (e) { console.warn('Repère indisponible : ' + r.modele, e); continue; }
      const y = pied(ile, r);
      const loin = placer(THREE, new THREE.Mesh(M.geo, M.mat), r, y, M.haut);
      loin.name = `repere ${r.modele} loin`;
      groupe.add(loin);
      let sp = null;
      if (r.def.halo) {
        const h = r.def.halo, k = r.def.hauteur / 1.9, c = Math.cos(r.rot || 0), s = Math.sin(r.rot || 0);
        sp = new THREE.Sprite(halo(THREE));
        sp.name = `repere ${r.modele} halo`;
        sp.position.set(r.u + h[0] * k * c - h[2] * k * s, y + h[1] * k, r.v + h[0] * k * s + h[2] * k * c);
        sp.scale.setScalar(h[3]);
        sp.renderOrder = 4;
        sp.visible = false;
        groupe.add(sp);
      }
      reperes.push({ modele: r.modele, nom: r.def.nom, u: r.u, v: r.v, rot: r.rot || 0, y, hauteur: r.def.hauteur, lumieres: r.def.lumieres, loin, halo: sp, proche: null, etatProche: 'absent', octets: null, triangles: { loin: M.triangles } });
    }
    if (!reperes.length) return null;
    ile.scene.add(groupe);
    ile.octetsGeo = (ile.octetsGeo || 0) + compte.geo;
    ile.octetsTex = (ile.octetsTex || 0) + compte.tex;
    console.log(`Ervane : ${reperes.length} repères géants posés (${reperes.map(r => r.modele).join(', ')})`);
    return { reperes, groupe, uLueur, compte, ile, THREE, enCharge: 0 };
  }

  function placer(THREE, o, r, y, haut) {
    o.position.set(r.u, y, r.v);
    o.rotation.y = -(r.rot || 0);
    o.scale.setScalar(r.hauteur != null ? r.hauteur / haut : r.def.hauteur / haut);
    o.visible = false;
    o.updateMatrix(); o.matrixAutoUpdate = false;
    return o;
  }

  async function chargerProche(etat, r) {
    const { THREE, ile } = etat;
    r.etatProche = 'charge'; etat.enCharge++;
    try {
      const { json: G, bin } = await IleGlb.lire(IleGlb.source(`assets/modeles/repere-${r.modele}.glb`));
      const compte = { geo: 0, tex: 0 }, g = geometrie(THREE, G, bin, r.lumieres, compte);
      const mat = materiau(THREE, texture(THREE, G, bin, compte), g.haut, etat.uLueur);
      const o = placer(THREE, new THREE.Mesh(g.geo, mat), r, r.y, g.haut);
      o.name = `repere ${r.modele} proche`;
      if (ile.reperesGeants !== etat || !ile.scene) { rendre(o); return; }
      etat.groupe.add(o);
      r.proche = o; r.octets = compte; r.triangles.proche = g.triangles; r.etatProche = 'pret';
      ile.octetsGeo += compte.geo; ile.octetsTex += compte.tex;
    } catch (e) {
      console.warn('Repère proche indisponible : ' + r.modele, e);
      r.etatProche = 'echec';
    } finally { etat.enCharge--; }
  }
  function rendre(o) {
    o.geometry.dispose();
    if (o.material.map) o.material.map.dispose();
    o.material.dispose();
  }
  function libererProche(etat, r) {
    const o = r.proche;
    if (!o) return;
    etat.groupe.remove(o); rendre(o);
    etat.ile.octetsGeo -= r.octets.geo; etat.ile.octetsTex -= r.octets.tex;
    r.proche = null; r.octets = null; r.etatProche = 'absent';
  }

  function voir(etat, c, o) {
    if (!etat) return;
    const tact = !!(o && o.tact), vol = !!(o && o.vol), nuit = (o && o.nuit) || 0, t = (o && o.t) || 0;
    etat.uLueur.value = (0.45 + 1.15 * nuit) * (1 + 0.06 * Math.sin(t * 2.3));
    for (const r of etat.reperes) {
      const d = Math.hypot(r.u - c.x, r.v - c.y), vu = d < PORTEE && !tact;
      const veut = !vol && d < PROCHE;
      if (veut && r.etatProche === 'absent' && !etat.enCharge) chargerProche(etat, r);
      else if (d > PROCHE + 30 && r.etatProche === 'pret') libererProche(etat, r);
      const proche = veut && r.etatProche === 'pret';
      if (r.proche) r.proche.visible = vu && proche;
      r.loin.visible = vu && !proche;
      if (r.halo) { r.halo.visible = vu; r.halo.material.opacity = 0.25 + 0.6 * nuit; }
    }
  }

  return { poser, voir, liste, PROCHE, PORTEE };
})();
