class Ile3D {
  static disponible() { return typeof IleCharge === 'object' && IleCharge.webgl(); }

  static ambiance() {
    let q = null, qo = null;
    try { const p = new URLSearchParams(location.search); q = p.get('ambiance'); qo = p.get('ombres'); } catch (e) {   }
    const d = typeof DATA === 'object' && DATA && DATA.ile ? DATA.ile : {};
    const nom = q != null ? q : d.ambiance || '';
    let qb = null, qa = null, ql = null, qz = null;
    try { const p = new URLSearchParams(location.search); qb = p.get('bordures'); qa = p.get('arbres'); ql = p.get('lointain'); qz = p.get('zones'); } catch (e) {   }
    return { soir: nom === 'soir', ombres: qo !== '0', bordures: qb !== '0', arbres: qa !== '0', lointain: ql !== '0', zones: qz !== '0' };
  }

  static qualiteParDefaut() {
    let q = null;
    try { q = new URLSearchParams(location.search).get('quality'); } catch (e) {   }
    if (q === 'haute' || q === 'moyenne' || q === 'basse') return { q, force: true };
    const coarse = typeof matchMedia === 'function' && matchMedia('(pointer: coarse)').matches;
    const coeurs = (typeof navigator !== 'undefined' && navigator.hardwareConcurrency) || 4;
    if (typeof IleCharge === 'object' && IleCharge.faible && IleCharge.faible()) return { q: 'basse', force: false };
    return { q: coarse ? 'moyenne' : coeurs >= 4 ? 'haute' : 'moyenne', force: false };
  }

  constructor(opts) {
    this.stage = opts.stage;
    this.board = opts.board;
    this.combat = opts.combat;
    this.painter = opts.painter;
    this.highlights = opts.highlights;
    this.sceneAiguillage = opts.scene;
    this.world = null;
    this.onTick = null;
    this.guideCue = null;
    this.tactique = false;
    this.actif = false;
    this.pret = false;
    this.plateauId = null;
    const q = Ile3D.qualiteParDefaut();
    this.qualite = q.q;
    this.qualiteForcee = q.force;
    this.telephone = CameraIle.telephone();
    this.ambianceVoulue = Ile3D.ambiance();
    this.soir = this.ambianceVoulue.soir;
    this.chargement = {};
    this.octetsTex = 0;
    this.octetsGeo = 0;
    this.compteur = { images: 0, lentes: 0 };
    this.temps = 0;
    this.dernier = 0;
    this.marques = {};
    this.directions = new Map();
    this.carteIle = null;
    this.hote = null;
    this.photo = null;
    this._boucle = now => this.boucle(now);
    const cb = this.combat;
    if (cb && typeof cb.on === 'function') {
      const ici = () => this.actif && this.pret && !!this.arene && this.arene.ouverte;
      cb.on('animMove', d => (ici() ? this.arene.animMove(d) : Promise.resolve()));
      cb.on('animCast', d => (ici() ? this.arene.animCast(d) : Promise.resolve()));
      cb.on('animTrap', d => (ici() ? this.arene.animTrap(d) : Promise.resolve()));
      cb.on('fx', d => { if (ici()) this.arene.fx(d); });
      cb.on('float', d => { if (ici()) this.arene.float(d); });
    }
  }


  creerRendu() {
    if (this.renderer) return;
    const THREE = window.THREE;
    if (THREE.ColorManagement) THREE.ColorManagement.legacyMode = false;
    const cv = this.canvas = document.createElement('canvas');
    cv.className = 'board-repli board-3d';
    cv.setAttribute('aria-hidden', 'true');
    cv.style.opacity = '0';
    this.stage.insertBefore(cv, this.board);
    const voiles = this.voiles = document.createElement('div');
    voiles.className = 'ile-voiles';
    voiles.setAttribute('aria-hidden', 'true');
    voiles.innerHTML = '<div class="ile-voiles__glacis"></div><div class="ile-voiles__vignette"></div><div class="ile-voiles__zone ile-voiles__zone--lavis"></div><div class="ile-voiles__zone ile-voiles__zone--bord"></div><div class="ile-voiles__soir ile-voiles__soir--glacis"></div><div class="ile-voiles__soir ile-voiles__soir--vignette"></div><div class="ile-voiles__grain"></div>';
    this.stage.insertBefore(voiles, this.board);
    const r = this.renderer = new THREE.WebGLRenderer({ canvas: cv, antialias: this.qualite === 'haute', alpha: true, powerPreference: 'high-performance', preserveDrawingBuffer: !!this.capture });
    r.outputEncoding = THREE.sRGBEncoding;
    r.setClearColor(0x000000, 0);
    r.info.autoReset = false;
    this.webgl2 = !!r.capabilities.isWebGL2;
    this.appliquerDensite();
    cv.addEventListener('webglcontextlost', e => { e.preventDefault(); if (cv === this.canvas) this.surPerte(); }, false);
    cv.addEventListener('webglcontextrestored', () => { if (cv === this.canvas) this.surRetour(); }, false);
    const taille = this._taille = () => this.redimensionner();
    if (typeof ResizeObserver === 'function') { this.ro = new ResizeObserver(taille); this.ro.observe(this.stage); }
    addEventListener('resize', taille);
    try { const g = IlePeinture.grain(); voiles.querySelector('.ile-voiles__grain').style.backgroundImage = `url(${g.toDataURL()})`; } catch (e) {   }
  }

  appliquerDensite() {
    const dpr = (typeof devicePixelRatio === 'number' && devicePixelRatio) || 1;
    const max = this.qualite === 'haute' ? 2 : this.qualite === 'moyenne' ? 1.5 : 1;
    this.densite = Math.min(dpr, max);
    if (this.renderer) this.renderer.setPixelRatio(this.densite);
    this.redimensionner();
  }

  redimensionner() {
    if (!this.renderer || !this.stage) return;
    const el = this.hote || this.stage;
    const w = el.clientWidth, h = el.clientHeight;
    if (!w || !h) return;
    this.renderer.setSize(w, h, false);
    if (this.camera) this.camera.setViewport(w, h);
    if (this.figures) this.figures.matT.uniforms.vue.value.set(w, h);
    if (this.actif && this.dessinEndormi && this.pret) this.image(performance.now());
  }


  static modeleGlym() {
    let q = null;
    try { q = new URLSearchParams(location.search).get('glym'); } catch (e) {   }
    if (q === 'modele' || q === 'tous') return q;
    if (q === '0') return null;
    const d = typeof DATA === 'object' && DATA && DATA.ile && DATA.ile.modeleGlym;
    return d === 'tous' ? 'tous' : d ? 'modele' : null;
  }

  async modelesGlym(THREE, scene) {
    const mode = Ile3D.modeleGlym();
    if (!mode) return;
    try {
      const enCours = Ile3D._scriptsModeles || (Ile3D._scriptsModeles = new Map());
      const charger = (fichier, present) => {
        if (present()) return Promise.resolve();
        if (enCours.has(fichier)) return enCours.get(fichier);
        const p = new Promise((ok, ko) => {
          let src = 'js/' + fichier;
          try { const ref = document.querySelector('script[src*="ile-3d.js"]'); if (ref && ref.src) src = new URL(fichier, ref.src).href; } catch (e) {   }
          const el = document.createElement('script');
          el.src = src; el.async = true;
          el.onload = () => ok();
          el.onerror = () => { enCours.delete(fichier); ko(new Error('js/' + fichier + ' introuvable')); };
          document.head.appendChild(el);
        });
        enCours.set(fichier, p);
        return p;
      };
      await charger('modele-glym.js', () => typeof ModeleGlym === 'object');
      if (typeof ModeleGlym !== 'object') throw new Error('ModeleGlym absent');
      await charger('modele-lampignon.js', () => typeof ModeleLampignon === 'object').catch(e => console.warn('Lampignon modelé : ' + e.message));
      if (typeof ModeleLampignon === 'object') await charger('modele-lampignard.js', () => typeof ModeleLampignard === 'object').catch(e => console.warn('Lampignard modelé : ' + e.message));
      const parc = new ModeleGlym.Parc(THREE, { telephone: this.telephone, qualite: this.qualite, mode });
      scene.add(parc.groupe);
      let peaux = null;
      if (this.qualite !== 'basse') try {
        await IleCharge.peauScript();
        if (typeof IlePeau === 'object') peaux = await IlePeau.parc(THREE, { telephone: this.telephone, qualite: this.qualite, ids: Ile3D.peauxDu(this.world && this.world.plateau && this.world.plateau.id, IlePeau.MONSTRES) });
      } catch (e) { console.warn('Peaux Meshy : ' + e.message); }
      if (peaux) scene.add(peaux.groupe);
      this.figures.modeles = peaux ? IlePeau.composer([peaux, parc]) : parc;
    } catch (e) { console.warn('Glym modelé : ' + e.message); }
  }

  async chargerHeros(THREE, etape) {
    this.heros = null;
    const classeHeros = IleCharge.heros ? IleCharge.heros() : null;
    if (!classeHeros) return false;
    const classe = classeHeros === 'auto' ? (this.world && this.world.ch && this.world.ch.classId) : classeHeros;
    if (!classe) return false;
    etape('Le héros modelé');
    try {
      if (this.qualite !== 'basse') await IleCharge.peauScript();
      if (this.qualite !== 'basse' && typeof IlePeau === 'object' && IlePeau.PEAUX[classe]) this.heros = await IlePeau.chargerHeros(THREE, classe);
      else {
        await IleCharge.herosScript();
        if (typeof IleHeros === 'object' && IleHeros.FICHIERS[classe]) this.heros = await IleHeros.charger(THREE, null, classe);
      }
    } catch (e) { console.warn('Ervane : héros modelé indisponible', e); this.heros = null; }
    return true;
  }
  porterHeros(THREE) {
    if (!this.heros || !this.figures) return;
    if (this.heros.porteur) this.figures.heros = this.heros.porteur(THREE, this.figures.groupe);
    else if (typeof IleHeros === 'object') this.figures.heros = IleHeros.porteur(THREE, this.heros, this.figures.groupe);
  }


  async preparer(world, etape) {
    const THREE = window.THREE;
    this.world = world;
    const plateau = world.plateau;
    if (!plateau && typeof Ile === 'object' && Ile.donjon3D(world.mapId)) return this.preparerSalle(world, etape);
    if (!plateau) throw new Error('pas de plateau');
    if (this.renderer && (this.contextePerdu || this.renderer.getContext().isContextLost())) this.liberer(true);
    this.creerRendu();
    if (this.pret && this.plateauId === plateau.id) { this.sauter(); return; }
    if (this.pret) this.liberer();
    IleDecor.init(THREE);
    this.nuit = null;
    const rendu = Ile3D.renduDe(plateau.def);
    if (rendu.style === 'lisiere' && IleCharge.style && IleCharge.style() === 'lisiere') {
      try { await IleCharge.lisiere(); if (typeof IleLisiere === 'object') this.nuit = new IleLisiere.Lisiere(THREE, this); } catch (e) { console.warn('Ervane : style Lisière indisponible', e); this.nuit = null; }
    }
    if (!this.nuit && rendu.nuit && IleCharge.ambiance && IleCharge.ambiance() === 'nuit') {
      try { await IleCharge.nuit(); if (typeof IleNuit === 'object') this.nuit = new IleNuit.Nuit(THREE, this); } catch (e) { console.warn('Ervane : aperçu de nuit indisponible', e); this.nuit = null; }
    }
    if (this.voiles) {
      this.voiles.classList.toggle('nuit', !!this.nuit && this.nuit.style !== 'lisiere');
      this.voiles.classList.toggle('lisiere', !!this.nuit && this.nuit.style === 'lisiere');
    }
    const T = this.T = plateau.terrain, def = this.def = plateau.def;
    const temps = this.chargement = { debut: performance.now() };
    let t0 = performance.now();
    const fini = nom => { const t = performance.now(); temps[nom] = Math.round(t - t0); t0 = t; };
    const pause = () => new Promise(ok => { let fait = false; const f = () => { if (!fait) { fait = true; ok(); } }; requestAnimationFrame(f); setTimeout(f, 60); });
    this.octetsTex = 0; this.octetsGeo = 0;
    const tex = this.tex = {};
    const scene = this.scene = new THREE.Scene();

    const S = this.qualite === 'haute' ? 1024 : 512;
    const prefixe = `ile|${plateau.id}|${S}|`;
    const cleCache = prefixe + T.signature() + '|' + Ile3D.empreintePeinture(def);
    const K = await IleCharge.cache.lire(cleCache);
    const garde = { toiles: {}, donnees: {} };
    let neuf = false;
    this.chargement.cache = !!K;
    const toile = (nom, peindre) => {
      const e = K && K.toiles && K.toiles[nom];
      if (e) {
        const c = document.createElement('canvas'); c.width = e.w; c.height = e.h;
        c.getContext('2d').putImageData(new ImageData(e.data, e.w, e.h), 0, 0);
        garde.toiles[nom] = e;
        return c;
      }
      const c = peindre();
      garde.toiles[nom] = { w: c.width, h: c.height, data: c.getContext('2d').getImageData(0, 0, c.width, c.height).data };
      neuf = true;
      return c;
    };
    const calcul = (nom, faire, valide) => {
      const e = K && K.donnees && K.donnees[nom];
      const v = e && (!valide || valide(e)) ? e : (neuf = true, faire());
      garde.donnees[nom] = v;
      return v;
    };

    etape('Les matières du sol');
    await pause();
    const MAT = calcul('matieres', () => {
      const toiles = IlePeinture.matieres(S);
      const r = { n: toiles.length, moy: IlePeinture.moyennes(toiles), data: null };
      if (this.webgl2) {
        r.data = new Uint8Array(S * S * 4 * toiles.length);
        toiles.forEach((c, k) => r.data.set(c.getContext('2d').getImageData(0, 0, S, S).data, k * S * S * 4));
      }
      for (const c of toiles) { c.width = 0; c.height = 0; }
      return r;
    }, e => !this.webgl2 || !!e.data);
    if (this.webgl2) {
      const t = new THREE.DataArrayTexture(MAT.data, S, S, MAT.n);
      t.format = THREE.RGBAFormat; t.type = THREE.UnsignedByteType;
      t.wrapS = t.wrapT = THREE.RepeatWrapping;
      t.minFilter = THREE.LinearMipmapLinearFilter; t.magFilter = THREE.LinearFilter;
      t.generateMipmaps = true;
      t.encoding = THREE.sRGBEncoding;
      t.anisotropy = Math.min(4, this.renderer.capabilities.getMaxAnisotropy());
      t.needsUpdate = true;
      tex.matieres = t;
      this.octetsTex += S * S * 4 * MAT.n * 1.33;
    } else tex.matieres = null;
    const lin = v => (v <= 0.04045 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4));
    this.moyennes = MAT.moy.map(c => c.map(lin));
    fini('matieres');

    etape('Les cartes de l\'île');
    await pause();
    const cartes = calcul('cartes', () => IlePeinture.cartes(T, this.peindreOmbresDecor(T)));
    const pot = (w, h) => (w & (w - 1)) === 0 && (h & (h - 1)) === 0;
    const donnee = (data, w, h, opts) => {
      const t = new THREE.DataTexture(data, w, h, THREE.RGBAFormat, THREE.UnsignedByteType);
      const mip = !!(opts && opts.mip) && (this.webgl2 || pot(w, h));
      t.flipY = false;
      t.minFilter = mip ? THREE.LinearMipmapLinearFilter : THREE.LinearFilter; t.magFilter = THREE.LinearFilter;
      t.generateMipmaps = mip;
      t.wrapS = t.wrapT = THREE.ClampToEdgeWrapping;
      t.needsUpdate = true;
      this.octetsTex += w * h * 4 * (mip ? 1.33 : 1);
      return t;
    };
    tex.poids1 = donnee(cartes.poids1, cartes.w, cartes.h, { mip: true });
    tex.poids2 = donnee(cartes.poids2, cartes.w, cartes.h, { mip: true });
    const toileTex = (c, srgb, rep) => this.textureToile(c, srgb, rep);
    tex.teinte = toileTex(toile('teinte', () => IlePeinture.teinte(T, def)), false);
    tex.lueur = toileTex(toile('lueur', () => IlePeinture.lueur(T)), true);
    const eauP = calcul('eau', () => IlePeinture.profondeurEau(T));
    tex.eau = donnee(eauP.data, eauP.w, eauP.h);
    tex.grain = toileTex(toile('grain', () => IlePeinture.touches(13, 0.5)), false, true);
    tex.touches = toileTex(toile('touches', () => IlePeinture.trame(8, 0.35)), true, true);
    tex.feuilles = toileTex(toile('feuilles', () => IlePeinture.trame(9, 0.7)), true, true);
    tex.falaise = toileTex(toile('falaise', () => IlePeinture.falaise()), true, true);
    tex.falaise.wrapT = THREE.ClampToEdgeWrapping;
    tex.banc = toileTex(toile('banc', () => IlePeinture.bancNuages(this.qualite === 'haute' ? 1024 : 512)), true, true);
    tex.nuages = [1, 2, 3].map(g => toileTex(toile('nuage' + g, () => IlePeinture.nuage(g)), true));
    tex.halo = toileTex(toile('halo', () => IlePeinture.halo()), true);
    tex.chute = toileTex(toile('chute', () => IlePeinture.chute()), true, true);
    tex.touchesLin = toileTex(toile('touchesLin', () => IlePeinture.touches(8, 0.35)), false, true);
    fini('cartes');

    const rampe = this.rampe = Ile3D.rampe(THREE);
    const toon = o => new THREE.MeshToonMaterial(Object.assign({ gradientMap: rampe }, o));
    const brume = (m, haut, bas, couleur) => {
      const prec = m.onBeforeCompile;
      m.onBeforeCompile = (sh, r) => {
        if (prec) prec(sh, r);
        sh.uniforms.brumeY = { value: new THREE.Vector2(haut, bas) };
        sh.uniforms.brumeCouleur = this.uBrumeBas;
        sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nvarying float vBrumeY;').replace('#include <fog_vertex>', '#include <fog_vertex>\nvBrumeY = (modelMatrix * vec4(transformed, 1.0)).y;');
        sh.fragmentShader = sh.fragmentShader.replace('#include <common>', '#include <common>\nvarying float vBrumeY; uniform vec2 brumeY; uniform vec3 brumeCouleur;').replace('#include <fog_fragment>', '#include <fog_fragment>\ngl_FragColor.rgb = mix(gl_FragColor.rgb, brumeCouleur, smoothstep(brumeY.x, brumeY.y, vBrumeY));');
      };
      m.customProgramCacheKey = () => 'brume' + haut + '/' + bas + (m.name || '');
    };
    this.uBrumeBas = { value: new THREE.Color('#7d8aa6') };
    const sol = IleSol.materiaux(THREE, tex, this.moyennes, rampe, T);
    tex.feuilles.repeat.set(1, 1);
    const mats = this.mats = {
      sol: sol.interieur, solBord: sol.bord, uSol: sol.uniforms,
      roche: toon({ vertexColors: true, map: tex.touches }),
      fronde: toon({ vertexColors: true, map: tex.feuilles }),
      acc: toon({ vertexColors: true, side: THREE.DoubleSide }),
      lueur: new THREE.MeshBasicMaterial({ vertexColors: true }),
      silhouette: toon({ vertexColors: true }),
      falaise: toon({ map: tex.falaise, vertexColors: true }),
      escarpement: toon({ map: tex.falaise, vertexColors: true }),
      dessous: toon({ vertexColors: true, map: tex.touches }),
      dessousAcc: toon({ vertexColors: true }),
      dessousLueur: new THREE.MeshBasicMaterial({ vertexColors: true }),
    };
    mats.falaise.name = 'falaise'; mats.dessous.name = 'dessous'; mats.dessousAcc.name = 'dessousAcc'; mats.dessousLueur.name = 'dessousLueur';
    this.fonduHouppiers(THREE, mats.fronde, 'fronde');
    this.fonduHouppiers(THREE, mats.acc, 'acc');
    this.fonduHouppiers(THREE, mats.roche, 'roche');
    this.fonduHouppiers(THREE, mats.lueur, 'lueur');
    this.clipAire(THREE, mats.dessousLueur);
    brume(mats.falaise, -4, -30, '#7d8aa6');
    brume(mats.dessous, -14, -60, '#7d8aa6');
    brume(mats.dessousAcc, -8, -40, '#7d8aa6');
    brume(mats.dessousLueur, -10, -60, '#7d8aa6');
    this.lumieres(scene);
    scene.fog = this.nuit && this.nuit.brouillard ? this.nuit.brouillard() : new THREE.Fog(this.nuit ? this.nuit.brume('#a9c3d6') : new THREE.Color('#a9c3d6'), 60, 150);
    this.brumeVoulue = scene.fog.color.clone();
    fini('materiaux');

    etape('Le relief');
    await pause();
    const prepSol = IleSol.preparer(T);
    this.prepSol = prepSol;
    const tuiles = IleSol.tuiles(THREE, T, prepSol.prep);
    this.tuilesSol = tuiles.map(t => {
      const proche = new THREE.Mesh(t.proche, [mats.sol, mats.solBord]);
      const loin = t.loin ? new THREE.Mesh(t.loin, [mats.sol, mats.solBord]) : null;
      proche.matrixAutoUpdate = false; if (loin) { loin.matrixAutoUpdate = false; loin.visible = false; }
      scene.add(proche); if (loin) scene.add(loin);
      this.octetsGeo += Ile3D.octetsGeo(t.proche) + (t.loin ? Ile3D.octetsGeo(t.loin) : 0);
      return { tx: t.tx, ty: t.ty, centre: t.centre, proche, loin };
    });
    const fixe = this.decorFixe = [];
    const esc = IleDecor.escarpements(prepSol.faces);
    if (esc) { const m = new THREE.Mesh(esc, mats.escarpement); m.matrixAutoUpdate = false; scene.add(m); fixe.push(m); this.meshEscarpement = m; this.octetsGeo += Ile3D.octetsGeo(esc); }
    fini('sol');

    etape('Le décor');
    await pause();
    const D = this.decor = IleDecor.construire(THREE, { T, def: this.nuit && this.nuit.defDecor ? this.nuit.defDecor(def) : def, telephone: this.telephone, qualite: this.qualite, ajouts: this.nuit ? A => this.nuit.ajouts(A) : null });
    const L = IleDecor.bibliotheque(this.telephone);
    this.tuilesDecor = D.tuiles.map(t => {
      const g = new THREE.Group();
      const ajout = (geo, mat) => { if (!geo) return null; const m = new THREE.Mesh(geo, mat); m.matrixAutoUpdate = false; g.add(m); this.octetsGeo += Ile3D.octetsGeo(geo); return m; };
      ajout(t.geos.roche, mats.roche); ajout(t.geos.fronde, mats.fronde); ajout(t.geos.acc, mats.acc); ajout(t.geos.lueur, mats.lueur);
      const sil = t.silhouette ? new THREE.Mesh(t.silhouette, mats.silhouette) : null;
      if (sil) { sil.matrixAutoUpdate = false; sil.visible = false; scene.add(sil); this.octetsGeo += Ile3D.octetsGeo(t.silhouette); }
      scene.add(g);
      return { tx: t.tx, ty: t.ty, centre: t.centre, groupe: g, sil };
    });
    this.preparerHerbe(THREE, D, cartes, L, rampe);
    this.touffesNuit = this.nuit ? this.nuit.preparerTouffes(rampe) : null;
    fini('decor');

    etape('Les eaux et les nuages');
    await pause();
    const geoEau = IleDecor.eau(T);
    if (geoEau) { this.eau = new THREE.Mesh(geoEau, this.matEau(THREE)); this.eau.renderOrder = 2; this.eau.matrixAutoUpdate = false; scene.add(this.eau); this.octetsGeo += Ile3D.octetsGeo(geoEau); }
    const cxT = T.largeur / 2, czT = T.hauteur / 2;
    const parSecteurs = (geo, mat, nb) => {
      const g = new THREE.Group();
      for (const part of IleDecor.decouperParSecteur(geo, nb, cxT, czT)) { const m = new THREE.Mesh(part, mat); m.matrixAutoUpdate = false; g.add(m); }
      g.matrixAutoUpdate = false; scene.add(g); fixe.push(g); this.octetsGeo += Ile3D.octetsGeo(geo);
      return g;
    };
    const fb = IleDecor.falaiseBord(T, this.telephone);
    const avecMonde = !!(rendu.monde && IleCharge.monde && IleCharge.monde() === 'glb');
    this.meshFalaise = parSecteurs(fb.geo, mats.falaise, this.qualite === 'basse' || !avecMonde ? 1 : 24);
    const ds = IleDecor.dessous(T, L, fb.suspendus, this.telephone);
    this.meshDessous = [];
    if (ds.roche) this.meshDessous.push(parSecteurs(ds.roche, mats.dessous, 1));
    for (const [k, mat] of [['acc', mats.dessousAcc], ['lueur', mats.dessousLueur]]) if (ds[k]) { const m = new THREE.Mesh(ds[k], mat); m.matrixAutoUpdate = false; scene.add(m); fixe.push(m); this.meshDessous.push(m); this.octetsGeo += Ile3D.octetsGeo(ds[k]); }
    const fils = IleDecor.fusion((this.decorGlobal = this.decorGlobalItems(D)).lueur);
    if (fils) { const m = new THREE.Mesh(fils, mats.dessousLueur); m.matrixAutoUpdate = false; scene.add(m); fixe.push(m); this.octetsGeo += Ile3D.octetsGeo(fils); }
    if (D.puits) this.puits(THREE, scene, D.puits);
    const ch = (def.eaux || []).find(e => e.sorte === 'chute');
    const geoChute = ch && IleDecor.chute(T, IleDecor.departChute(T, ch.point));
    if (geoChute) {
      const m = new THREE.MeshBasicMaterial({ map: tex.chute, transparent: true, depthWrite: false, side: THREE.DoubleSide, color: new THREE.Color('#e4f0f7'), opacity: 0.88, fog: true });
      this.matChute = m;
      const mesh = new THREE.Mesh(geoChute, m); mesh.renderOrder = 3; scene.add(mesh); fixe.push(mesh);
      this.meshChute = mesh;
    }
    this.nuages(THREE, scene);
    this.halos(THREE, scene, D.halos);
    this.lanternes = D.lanternes;
    this.cibles = D.cibles;
    fini('eaux');
    if (rendu.monde && IleCharge.monde && IleCharge.monde() === 'glb') {
      etape('Le monde modelé');
      await pause();
      let semis = null;
      this.T.facteurSemis = this.telephone && this.T.largeur > 300 ? 0.72 : 1;
      if (rendu.modeles && IleCharge.modeles && IleCharge.modeles()) {
        try { await IleCharge.modelesScript(); if (typeof IleModeles === 'object') { semis = await IleModeles.chargerSemis(THREE, this.renderer); semis.poses = IleModeles.poses(semis, this.T, (u, v) => this.hauteur(u, v)); } } catch (e) { console.warn('Ervane : semis Meshy indisponible', e); semis = null; }
      }
      const A = Ile3D.SOIR.arbres, arbres = this.soir && this.ambianceVoulue.arbres ? Object.assign({}, A, { detailCoeur: this.telephone ? A.detailCoeurTel : A.detailCoeur }) : null;
      try { await IleCharge.glb(); if (typeof IleGlb === 'object') await IleGlb.poser(THREE, this, scene, IleGlb.source(rendu.monde), { semis, arbres }); } catch (e) { console.warn('Ervane : monde modelé indisponible', e); }
      this.semisMeshy = !!(semis && this.monde && this.monde.userData.semisMeshy);
      const LC = this.soir && this.ambianceVoulue.lointain && this.monde ? Ile3D.SOIR.lointain[plateau.id] : null;
      if (LC && IleGlb.lointain) { try { this.poserLointain(THREE, scene, LC); } catch (e) { console.warn('Ervane : décor lointain indisponible', e); } }
      if (semis && this.monde) { try { this.octetsTex += await IleModeles.habillerSol(THREE, this); } catch (e) { console.warn('Ervane : sols Meshy indisponibles', e); } }
      if (semis && this.monde && IleModeles.habillerMurs) { try { this.octetsTex += await IleModeles.habillerMurs(THREE, this); } catch (e) { console.warn('Ervane : murs Meshy indisponibles', e); } }
      if (semis && this.monde && IleModeles.cartes) { try { const c = await IleModeles.cartes(THREE, this); if (c) { this.cartesDenses = c; this.octetsGeo += c.octetsGeo; this.octetsTex += c.octetsTex; } } catch (e) { console.warn('Ervane : semis dense indisponible', e); } }
      if (semis && this.monde && IleModeles.fumees) { try { this.fumees = IleModeles.fumees(THREE, this, semis); } catch (e) { console.warn('Ervane : fumée indisponible', e); } }
    }
    if (this.monde && rendu.modeles && IleCharge.modeles && IleCharge.modeles()) {
      try { await IleCharge.modelesScript(); if (typeof IleModeles === 'object') this.modeles = await IleModeles.poser(THREE, this); } catch (e) { console.warn('Ervane : modèles Meshy indisponibles', e); }
    }
    this.reperesGeants = null;
    if (IleCharge.reperes && IleCharge.reperes() && ((DATA.ile.reperes || {})[plateau.id] || []).length) {
      try { await IleCharge.reperesScript(); if (typeof IleReperes === 'object') this.reperesGeants = await IleReperes.poser(THREE, this); } catch (e) { console.warn('Ervane : repères géants indisponibles', e); }
    }
    if (await this.chargerHeros(THREE, etape)) fini('heros');

    etape('Les Veilleurs et les monstres');
    await pause();
    this.figures = new IleFigures.Figures(THREE, { painter: this.painter, telephone: this.telephone, scene });
    scene.add(this.figures.groupe);
    this.porterHeros(THREE);
    await this.modelesGlym(THREE, scene);
    this.arene = new IleArene.Arene(THREE, this);
    if (this.uFondu) this.uFondu.cases.value = this.arene.texCases;
    scene.add(this.arene.groupe);
    mats.uSol.etatCases.value = this.arene.texCases;
    this.marques3D(THREE, scene);
    if (this.nuit) { this.nuit.materiaux(); this.nuit.lucioles(scene); if (this.nuit.ciel3D) this.nuit.ciel3D(scene); }
    const bloque = (x, y) => { const P = this.world && this.world.plateau; return !!(P && P.nav && typeof P.nav.libre === 'function' && !P.nav.libre(x, y) && T.eauA(x, y) == null && !(T.videA && T.videA(x, y))); };
    const style0 = this.nuit && this.nuit.styleCamera ? this.nuit.styleCamera() : null;
    const style = this.soir ? Object.assign({}, style0 || {}, Ile3D.SOIR.camera) : style0;
    const cam = this.camera = new CameraIle({ el: this.board, def, terrain: T, bloque, style });
    if (this.lointain) cam.loinMin = this.lointain.loin;
    this.redimensionner();
    const p = world.player;
    cam.sauter(p.rx, p.ry, this.hauteur(p.rx, p.ry));
    this.figures.maj(this.sprites(performance.now()), cam, performance.now());
    this.vus = new WeakSet(); this.caches = new Map();
    fini('figures');

    etape('La lumière');
    await pause();
    for (const t of Object.values(tex)) { if (Array.isArray(t)) t.forEach(x => this.renderer.initTexture(x)); else if (t && t.isTexture) this.renderer.initTexture(t); }
    fini('envoi');
    await pause();
    this.renderer.compile(scene, cam.cam);
    fini('compilation');
    this.plateauId = plateau.id;
    this.pret = true;
    this.image(performance.now());
    fini('image');
    temps.total = Math.round(performance.now() - temps.debut);
    if (neuf) IleCharge.cache.ecrire(cleCache, garde, prefixe).then(ok => { this.chargement.cacheEcrit = ok; });
  }

  textureToile(c, srgb, rep) {
    const THREE = window.THREE;
    const pot = (w, h) => (w & (w - 1)) === 0 && (h & (h - 1)) === 0;
    const t = new THREE.CanvasTexture(c);
    t.flipY = false;
    if (srgb) t.encoding = THREE.sRGBEncoding;
    if (rep) t.wrapS = t.wrapT = THREE.RepeatWrapping;
    else if (!this.webgl2 && !pot(c.width, c.height)) { t.generateMipmaps = false; t.minFilter = THREE.LinearFilter; }
    this.octetsTex += c.width * c.height * 4 * 1.33;
    return t;
  }

  static rampe(THREE) {
    const N = 128, d = new Uint8Array(N * 4);
    for (let i = 0; i < N; i++) { const t = i / (N - 1), s = Math.max(0, Math.min(1, (t - 0.4) / 0.22)), v = Math.round(255 * (0.42 + 0.58 * s * s * (3 - 2 * s))); d[i * 4] = d[i * 4 + 1] = d[i * 4 + 2] = v; d[i * 4 + 3] = 255; }
    const t = new THREE.DataTexture(d, N, 1, THREE.RGBAFormat); t.minFilter = t.magFilter = THREE.LinearFilter; t.generateMipmaps = false; t.needsUpdate = true;
    return t;
  }


  async preparerSalle(world, etape) {
    const THREE = window.THREE;
    this.world = world;
    const mapId = world.mapId, mdef = world.mapDef || {};
    const ddef = World.dungeonDef(mdef.dungeonId) || {}, index = mdef.roomIndex || 0;
    const layout = (ddef.rooms && ddef.rooms[index] && ddef.rooms[index].layout) || mdef.layout;
    if (!Array.isArray(layout) || layout.length !== 15) throw new Error('pas de plan de salle');
    if (this.renderer && (this.contextePerdu || this.renderer.getContext().isContextLost())) this.liberer(true);
    this.creerRendu();
    if (this.pret) this.liberer();
    IleDecor.init(THREE);
    const temps = this.chargement = { debut: performance.now(), cache: false };
    const pause = () => new Promise(ok => { let fait = false; const f = () => { if (!fait) { fait = true; ok(); } }; requestAnimationFrame(f); setTimeout(f, 60); });
    this.octetsTex = 0; this.octetsGeo = 0;
    etape('La salle');
    await pause();
    const style = Object.assign({ sol: 'dalles_amarre', paroi: 'roche_grise', lumiere: '#f2c14e', brume: '#2a2238' }, ddef.salles3d || {});
    const tex = this.tex = {};
    tex.touches = this.textureToile(IlePeinture.trame(8, 0.35), true, true);
    tex.halo = this.textureToile(IlePeinture.halo(), true);
    tex.paroi = this.textureToile(IlePeinture.paroi((IleSalle.PAROIS[style.paroi] || {}).genre), true, true);
    tex.nuages = [1, 2, 3].map(g => this.textureToile(IlePeinture.nuage(g), true));
    tex.sol = this.textureToile(IleSalle.peindreSol(layout, style, this.qualite === 'haute' ? 1024 : 512), true, false);
    const rampe = this.rampe = Ile3D.rampe(THREE);
    const scene = this.scene = new THREE.Scene();
    const sol = IleSol.materiauSalle(THREE, tex.sol, rampe);
    const toon = o => new THREE.MeshToonMaterial(Object.assign({ gradientMap: rampe }, o));
    const mats = this.mats = { sol: sol.sol, uSol: sol.uniforms, roche: toon({ vertexColors: true, map: tex.paroi }), lueur: new THREE.MeshBasicMaterial({ vertexColors: true }) };
    this.fonduHouppiers(THREE, mats.roche, 'roche');
    const S = IleSalle.construire(THREE, { layout, style, index, accessoires: (style.accessoires || []).filter(a => a && a.salle === index), telephone: this.telephone, mats });
    scene.add(S.groupe);
    for (const g of Object.values(S.geos)) if (g) this.octetsGeo += Ile3D.octetsGeo(g);
    this.lumieresSalle(scene, style, S.lanternes);
    this.decorFixe = [];
    this.halos(THREE, scene, S.halos);
    this.brumeSalle(THREE, scene, S.brume || [], style);
    this.lanternes = S.lanternes;
    this.cibles = [];
    const brume = new THREE.Color(style.brume).multiplyScalar(0.45);
    scene.fog = new THREE.Fog(brume, 112, 148);
    this.brumeVoulue = brume.clone();
    this.brumeCle = null; this.cielHex = null;
    {
      const s = k => '#' + brume.clone().multiplyScalar(k).convertLinearToSRGB().getHexString();
      this.canvas.style.background = `radial-gradient(ellipse at 50% 44%, ${s(1.05)} 0%, ${s(0.55)} 48%, ${s(0.22)} 100%)`;
    }
    this.uBrumeBas = this.uBrumeBas || { value: new THREE.Color(style.brume) };
    etape('Les Veilleurs et les monstres');
    await pause();
    this.figures = new IleFigures.Figures(THREE, { painter: this.painter, telephone: this.telephone, scene });
    scene.add(this.figures.groupe);
    await this.chargerHeros(THREE, etape);
    this.porterHeros(THREE);
    this.arene = new IleArene.Arene(THREE, this);
    if (this.uFondu) this.uFondu.cases.value = this.arene.texCases;
    scene.add(this.arene.groupe);
    mats.uSol.etatCases.value = this.arene.texCases;
    this.marques3D(THREE, scene);
    this.salle = { id: mapId, map: world.map, aire: S.aire, style, index };
    this.effacerZone();
    this.T = null; this.def = null; this.plateauId = null;
    const cam = this.camera = new CameraIle({ el: this.board, def: { taille: [15, 15], camera: { champ: [10, 30], champDefaut: [18, 22] } }, terrain: null });
    this.redimensionner();
    this.sauter();
    this.figures.maj(this.sprites(performance.now()), cam, performance.now());
    etape('La lumière');
    await pause();
    for (const t of Object.values(tex)) if (t && t.isTexture) this.renderer.initTexture(t);
    this.renderer.compile(scene, cam.courante);
    this.pret = true;
    this.image(performance.now());
    temps.total = Math.round(performance.now() - temps.debut);
  }

  lumieresSalle(scene, style, lanternes) {
    const THREE = window.THREE;
    const hemi = new THREE.HemisphereLight(new THREE.Color('#5d5a80'), new THREE.Color('#1c1826'), 0.55);
    const cle = new THREE.DirectionalLight(new THREE.Color('#cfc6e4'), 0.38); cle.position.set(-30, 60, -20);
    const contre = new THREE.DirectionalLight(new THREE.Color(style.lumiere), 0.14); contre.position.set(40, 30, 50);
    this.ponctuelle = new THREE.PointLight(new THREE.Color(style.lumiere), 0, 13, 1.6);
    scene.add(hemi, cle, contre, this.ponctuelle);
    this.ombres = null;
    for (const l of (lanternes || []).slice(0, 4)) {
      const p = new THREE.PointLight(new THREE.Color(style.lumiere), 1.1, 8.5, 1.5);
      p.position.set(l.x, l.y + 0.3, l.z);
      scene.add(p);
    }
  }

  brumeSalle(THREE, scene, liste, style) {
    const n = liste.length;
    if (!n) return;
    const pages = this.tex.nuages, pw = pages[0].image.width, ph = pages[0].image.height;
    const at = document.createElement('canvas'); at.width = pw * pages.length; at.height = ph;
    pages.forEach((t, k) => at.getContext('2d').drawImage(t.image, k * pw, 0));
    const texB = new THREE.CanvasTexture(at); texB.encoding = THREE.sRGBEncoding; texB.flipY = false;
    this.tex.bouffees = texB;
    this.octetsTex += at.width * at.height * 4 * 1.33;
    const geo = new THREE.InstancedBufferGeometry();
    const q = new THREE.PlaneGeometry(1, 1);
    geo.index = q.index; geo.attributes.position = q.attributes.position; geo.attributes.uv = q.attributes.uv;
    const centre = new Float32Array(n * 3), forme = new Float32Array(n * 3), teinte = new Float32Array(n * 4);
    const c = new THREE.Color(style.brume).multiplyScalar(1.6);
    liste.forEach((b, i) => { centre.set([b.x, b.y, b.z], i * 3); forme.set([b.taille * 1.35, b.taille * 0.42, i % pages.length], i * 3); teinte.set([c.r, c.g, c.b, 0.22 + (i % 3) * 0.05], i * 4); });
    geo.setAttribute('centre', new THREE.InstancedBufferAttribute(centre, 3));
    geo.setAttribute('forme', new THREE.InstancedBufferAttribute(forme, 3));
    geo.setAttribute('teinte', new THREE.InstancedBufferAttribute(teinte, 4));
    geo.instanceCount = n;
    const m = new THREE.ShaderMaterial({
      uniforms: { carte: { value: texB }, pages: { value: pages.length } },
      vertexShader: `attribute vec3 centre; attribute vec3 forme; attribute vec4 teinte; uniform float pages;
varying vec2 vUv; varying vec4 vTeinte;
void main() { vec4 mvPosition = modelViewMatrix * vec4(centre, 1.0); mvPosition.xy += position.xy * forme.xy; gl_Position = projectionMatrix * mvPosition; vUv = vec2((forme.z + uv.x) / pages, 1.0 - uv.y); vTeinte = teinte; }`,
      fragmentShader: `uniform sampler2D carte; varying vec2 vUv; varying vec4 vTeinte;
#include <common>
void main() { vec4 t = texture2D(carte, vUv); gl_FragColor = vec4(t.rgb * vTeinte.rgb, t.a * vTeinte.a);
  #include <encodings_fragment>
}`,
      transparent: true, depthWrite: false,
    });
    const mesh = new THREE.Mesh(geo, m); mesh.frustumCulled = false; mesh.renderOrder = 4;
    scene.add(mesh);
    if (this.decorFixe) this.decorFixe.push(mesh);
  }

  imageSalle(now) {
    const w = this.world, p = w.player, cam = this.camera;
    const t0 = performance.now();
    const dt = this.tempsPrec ? Math.min(0.1, (now - this.tempsPrec) / 1000) : 0.016;
    this.tempsPrec = now;
    this.temps += dt;
    this.majArene(now);
    const q = this.versScene(p.rx, p.ry);
    cam.update(now, { x: q.u, y: q.v, h: 0 }, p.moving);
    const A = this.arene;
    if (this.uFondu) {
      const cd = cam.cadre;
      this.uFondu.b.value.set(0, -1000, 0);
      if (A && A.etat && cd) {
        this.uFondu.aire.value.set(-0.3, -0.3, 19, 19);
        this.uFondu.dir.value.set(cd.dir[0], cd.dir[1], cd.dir[2]);
        this.uFondu.h.value = 0;
        this.uFondu.orig.value.set(0, 0);
        this.uFondu.cases.value = A.texCases;
      } else this.uFondu.aire.value.set(0, 0, -1, -1);
    }
    const extras = A && A.etat ? A.majEffets(now, dt) : null;
    this.figures.maj(this.sprites(now), cam, now, extras);
    this.majMarques(now, 0);
    if (this.matHalos) this.matHalos.uniforms.temps.value = this.temps;
    const vis = this.enArene ? this.cibleFondu() : q;
    let best = null, bd = 12 * 12;
    for (const l of this.lanternes || []) { const d = (l.x - vis.u) ** 2 + (l.z - vis.v) ** 2; if (d < bd) { bd = d; best = l; } }
    if (best) { this.ponctuelle.position.set(best.x, best.y + 0.2, best.z); this.ponctuelle.intensity = 2.4 * (0.86 + 0.14 * Math.sin(this.temps * 8 + best.x)); }
    else this.ponctuelle.intensity = 0;
    const r = this.renderer;
    r.info.reset();
    r.render(this.scene, cam.courante);
    this.derniereInfo = { appels: r.info.render.calls, triangles: r.info.render.triangles, points: r.info.render.points, lignes: r.info.render.lines };
    this.compteur.images++;
    this.msScript = (this.msScript || 0) * 0.9 + (performance.now() - t0) * 0.1;
    cam.flush();
  }

  static peauxDu(id, ids) {
    const zones = typeof DATA === 'object' && DATA.content && DATA.content.zones;
    if (!id || !zones) return ids;
    const texte = [];
    for (const z of zones) for (const m of z.maps || []) if (m.plateau === id) texte.push(JSON.stringify(m));
    const tout = texte.join('');
    return ids.filter(n => tout.includes('"' + n + '"'));
  }
  static renduDe(def) { const r = def && def.rendu; return r && typeof r === 'object' ? r : {}; }

  static empreintePeinture(def) {
    const M = IleTerrain.M;
    if (!Ile3D._codePeinture) {
      const outils = Object.values(M).filter(f => typeof f === 'function').map(String).join('|');
      const fab = typeof fabriqueIlePeinture === 'function' ? String(fabriqueIlePeinture) : Object.values(IlePeinture).map(String).join('|');
      Ile3D._codePeinture = M.cle(fab + '|' + outils + '|' + String(Ile3D.prototype.peindreOmbresDecor)).toString(16);
    }
    const plans = [];
    for (const c of IleTerrain.cartesDe(def.id)) for (const g of c.groups || []) if (g.aire && g.aire.layout) plans.push(g.aire.x + ',' + g.aire.y + ':' + g.aire.layout.join(''));
    return Ile3D._codePeinture + '-' + M.cle(JSON.stringify({ r: def.regions || null, s: def.sols || null, e: def.eaux || null, a: def.accents || null, l: def.lieux || null, p: plans })).toString(16);
  }

  peindreOmbresDecor(T) {
    const k = 2, W = Math.round(T.largeur * k), H = Math.round(T.hauteur * k);
    const c = document.createElement('canvas'); c.width = W; c.height = H;
    const g = c.getContext('2d');
    const L = IlePeinture.LUMIERE;
    const tache = (u, v, rx, ry, a) => {
      const q = g.createRadialGradient(u * k, v * k, 0, u * k, v * k, Math.max(rx, ry) * k);
      q.addColorStop(0, `rgba(255,255,255,${a})`); q.addColorStop(0.55, `rgba(255,255,255,${a * 0.6})`); q.addColorStop(1, 'rgba(255,255,255,0)');
      g.fillStyle = q; g.save(); g.translate(u * k, v * k); g.scale(1, ry / rx); g.translate(-u * k, -v * k);
      g.beginPath(); g.arc(u * k, v * k, rx * k, 0, 6.29); g.fill(); g.restore();
    };
    for (const e of T.decor) {
      if (e.sorte === 'arbre') { const r = e.rayon * 1.25, d = 1.8 + r * 0.9; tache(e.u - L.x * d, e.v - L.y * d, r * 1.35, r * 1.1, 0.8); tache(e.u + 0.2, e.v + 0.1, 1.0, 0.85, 0.7); }
      else if (e.sorte === 'pin_tordu') tache(e.u + 1.4, e.v + 0.4, e.rayon * 1.2, e.rayon * 0.9, 0.65);
      else if (e.sorte === 'buisson') tache(e.u + 0.4, e.v + 0.18, e.rayon * 1.35, e.rayon * 1.05, 0.6);
      else if (e.sorte === 'rocher' || e.sorte === 'borne') tache(e.u + e.rayon * 0.55, e.v + e.rayon * 0.22, e.rayon * 1.3, e.rayon * 1.05, 0.6);
    }
    for (const o of T.objets) {
      for (const f of o.empreinte) {
        if (f.anneau) continue;
        if (f.rect) tache(f.u + 0.9, f.v + 0.35, Math.max(f.l, f.p) + 0.8, Math.min(f.l, f.p) + 0.8, 0.5);
        else tache(f.u + 0.4, f.v + 0.15, f.r + 0.4, f.r + 0.3, 0.45);
      }
    }
    for (const o of IleDecor.obstaclesDesAires(T)) tache(o.X + 0.5 + 0.35, o.Y + 0.5 + 0.15, 0.75, 0.6, 0.55);
    for (const l of T.lignes) if (l.sorte === 'muret' || l.sorte === 'haie') {
      g.strokeStyle = 'rgba(255,255,255,0.4)'; g.lineWidth = (l.sorte === 'haie' ? 1.8 : 1.1) * k; g.lineCap = 'round';
      g.beginPath(); l.pts.forEach((p, i) => (i ? g.lineTo((p[0] + 0.5) * k, (p[1] + 0.2) * k) : g.moveTo((p[0] + 0.5) * k, (p[1] + 0.2) * k))); g.stroke();
    }
    const d = g.getImageData(0, 0, W, H).data, out = new Uint8Array(W * H);
    for (let i = 0; i < W * H; i++) out[i] = d[i * 4 + 3];
    c.width = 0; c.height = 0;
    return out;
  }

  decorGlobalItems(D) { return { lueur: (D.global || []).slice() }; }

  lumieres(scene) {
    const THREE = window.THREE;
    const hemi = new THREE.HemisphereLight(new THREE.Color('#c6d4ef'), new THREE.Color('#544b3c'), 0.62);
    const L = IlePeinture.LUMIERE, el = 50 * Math.PI / 180;
    const cle = new THREE.DirectionalLight(new THREE.Color('#fff2df'), 1.28);
    cle.position.set(L.x * Math.cos(el) * 100, Math.sin(el) * 100, L.y * Math.cos(el) * 100);
    const chaud = new THREE.DirectionalLight(new THREE.Color('#ffd2a0'), 0.22); chaud.position.set(60, 35, 70);
    const contre = new THREE.DirectionalLight(new THREE.Color('#9fb4ff'), 0.14); contre.position.set(10, 30, -90);
    this.ponctuelle = new THREE.PointLight(new THREE.Color('#ffb347'), 0, 13, 2);
    scene.add(hemi, cle, chaud, contre, this.ponctuelle);
    this.lum = { hemi, cle, chaud, contre, ponctuelle: this.ponctuelle };
    this.ombres = null;
    if (this.soir) this.lumieresSoir(scene);
    if (this.nuit) this.nuit.lumieres(scene, this.lum);
  }

  lumieresSoir(scene) {
    const THREE = window.THREE, S = Ile3D.SOIR, L = this.lum, el = S.elevation * Math.PI / 180;
    let tour = this.qualite === 'haute' && this.ambianceVoulue.ombres ? S.tour : 0;
    try { const q = new URLSearchParams(location.search).get('soleil'); if (q != null && Number.isFinite(+q)) tour = +q; } catch (e) {   }
    const L0 = IlePeinture.LUMIERE, a = tour * Math.PI / 180, Lp = { x: L0.x * Math.cos(a) - L0.y * Math.sin(a), y: L0.x * Math.sin(a) + L0.y * Math.cos(a) };
    L.hemi.color.set(S.lum.hemi[0]); L.hemi.groundColor.set(S.lum.hemi[1]); L.hemi.intensity = S.lum.hemi[2];
    for (const k of ['cle', 'chaud', 'contre']) { L[k].color.set(S.lum[k][0]); L[k].intensity = S.lum[k][1]; }
    this.dirSoleil = new THREE.Vector3(Lp.x * Math.cos(el), Math.sin(el), Lp.y * Math.cos(el)).normalize();
    L.cle.position.copy(this.dirSoleil).multiplyScalar(100);
    const r = this.renderer;
    if (this.qualite !== 'haute' || !this.ambianceVoulue.ombres || !r) return;
    r.shadowMap.enabled = true;
    r.shadowMap.type = THREE.PCFSoftShadowMap;
    const O = S.ombre, sh = L.cle.shadow, oc = sh.camera;
    L.cle.castShadow = true;
    sh.mapSize.set(O.taille, O.taille);
    sh.bias = O.biais; sh.normalBias = O.biaisNormal;
    oc.left = -O.demi; oc.right = O.demi; oc.top = O.demi; oc.bottom = -O.demi; oc.near = 1; oc.far = 240;
    oc.updateProjectionMatrix();
    scene.add(L.cle.target);
    this.ombres = { marque: false, centre: new THREE.Vector3(), texel: 2 * O.demi / O.taille, compte: 0 };
  }

  marquerOmbres() {
    const O = this.ombres;
    if (!O || O.marque || !this.monde) return;
    O.marque = true;
    const mats = new Set();
    this.monde.traverse(o => {
      if (!o.isMesh) return;
      const nom = o.name || '', m = o.material;
      if (/nuage|eau|luciole|brume/.test(nom) || (m && m.emissive && m.emissive.r + m.emissive.g + m.emissive.b > 0.6)) return;
      o.castShadow = true; o.receiveShadow = true;
      [].concat(m || []).forEach(x => mats.add(x));
    });
    for (const m of [this.meshFalaise, ...(this.meshDessous || [])]) if (m && m.isMesh) { m.receiveShadow = true; [].concat(m.material || []).forEach(x => mats.add(x)); }
    for (const m of mats) if (m) m.needsUpdate = true;
    O.compte = mats.size;
  }

  etalonner() {
    const THREE = window.THREE, E = Ile3D.SOIR.etalonnage, vus = new Set(), c = new THREE.Color(), hsl = {};
    this.monde.userData.etalonne = true;
    if (typeof IleModeles === 'object' && IleModeles.SOIR_SOL) IleModeles.SOIR_SOL.value = 1;
    let n = 0;
    this.monde.traverse(o => {
      const a = o.isMesh && o.geometry && o.geometry.getAttribute('color');
      if (!a || vus.has(a.array) || /nuage|eau|luciole|brume/.test(o.name || '') || (o.material && o.material.name === 'semis_rond')) return;
      vus.add(a.array);
      const A = a.array, k = a.itemSize, q = a.normalized ? (A instanceof Uint8Array ? 255 : A instanceof Uint16Array ? 65535 : 1) : 1;
      for (let i = 0; i < a.count; i++) {
        const j = i * k;
        c.setRGB(A[j] / q, A[j + 1] / q, A[j + 2] / q).convertLinearToSRGB().getHSL(hsl);
        let { h, s: sa, l } = hsl;
        if (h > E.vert[0] && h < E.vert[1] && sa > 0.16 && l < 0.72) {
          h += (E.vertTeinte - h) * E.vertVers; sa = Math.min(1, sa * E.vertSat + 0.04); l *= E.vertLum;
        } else if ((h > 0.62 || h < 0.03) && sa < 0.3) {
          h = E.pierreTeinte; sa = sa * 0.8 + E.pierreSat; l = Math.min(1, l * E.pierreLum);
        } else if (h >= 0.03 && h <= E.vert[0] && l > 0.35) {
          sa = Math.min(1, sa * E.terreSat); l = Math.min(1, l * E.terreLum);
        } else continue;
        c.setHSL(h, sa, l).convertSRGBToLinear();
        A[j] = c.r * q; A[j + 1] = c.g * q; A[j + 2] = c.b * q;
      }
      a.needsUpdate = true; n++;
    });
    this.monde.userData.etalonnes = n;
  }

  preparerBordures() {
    const THREE = window.THREE, T = this.T, tel = this.telephone, B = Ile3D.SOIR.bordures;
    if (!T || this.bordures || this.qualite === 'basse' || !this.ambianceVoulue.bordures) return;
    const IM = IleTerrain.M, R = IM.hasard(IM.cle('bordures-soir')), nav = this.world && this.world.plateau && this.world.plateau.nav;
    const mats = [], cols = [], m4 = new THREE.Matrix4(), qu = new THREE.Quaternion(), eu = new THREE.Euler(0, 0, 0, 'YXZ'), po = new THREE.Vector3(), sc = new THREE.Vector3();
    const W = T.W, H = T.H, dS = (u, v) => { const i = Math.round(v), j = Math.round(u); return i < 0 || j < 0 || i >= H || j >= W ? 0 : T.distSentier[i * W + j]; };
    const places = T.places || [];
    const libre = (u, v) => !places.some(p => Math.hypot(p.centre[0] - u, p.centre[1] - v) < p.rayon + 0.6);
    let n = 0, sorte = 'chemins';
    const compte = { chemins: 0, pieds: 0 };
    const poser = (x, z, pied) => {
      if (!libre(x, z) || (T.dans && !T.dans(x, z)) || (T.videA && T.videA(x, z))) return;
      if (nav && !pied) { const c = nav.caseDe(x, z); if (c < 0 || !nav.ouvertStatique(c)) return; }
      const y = T.marcheA(x, z);
      if (!Number.isFinite(y) || T.profondeurA(x, z) > 0.01) return;
      const s = (B.taille[0] + R() * (B.taille[1] - B.taille[0])) * (pied ? B.pied : 1);
      eu.set((R() - 0.5) * 0.14, R() * 6.28, (R() - 0.5) * 0.14, 'YXZ'); qu.setFromEuler(eu);
      m4.compose(po.set(x, y - 0.05, z), qu, sc.set(s * (0.9 + R() * 0.35), s * (0.75 + R() * 0.45) * (pied ? 1.25 : 1), s * (0.9 + R() * 0.35)));
      for (let q = 0; q < 16; q++) mats.push(m4.elements[q]);
      const f = (pied ? 0.8 : 0.9) + R() * 0.18;
      cols.push(f * (0.96 + R() * 0.06), f, f * (0.9 + R() * 0.12));
      n++; compte[sorte]++;
    };
    const pas = tel ? B.pasTel : B.pas;
    const longer = (pts, marge, ecart, pied, garder) => {
      for (let k = 1; k < pts.length; k++) {
        const [x0, z0] = pts[k - 1], [x1, z1] = pts[k], dx = x1 - x0, dz = z1 - z0, L = Math.hypot(dx, dz);
        if (L < 1e-6) continue;
        const tx = dx / L, tz = dz / L, nx = -tz, nz = tx;
        for (let d = R() * pas; d < L; d += pas * (0.65 + R() * 0.7)) {
          const bx = x0 + tx * d, bz = z0 + tz * d;
          for (const cote of [-1, 1]) {
            if (R() < (pied ? B.trouPied : B.trou)) continue;
            const o = marge + R() * ecart, x = bx + nx * o * cote + (R() - 0.5) * 0.2, z = bz + nz * o * cote + (R() - 0.5) * 0.2;
            if (garder && !garder(x, z)) continue;
            poser(x, z, pied);
            if (!pied && R() < B.grappe) { const o2 = o + 0.35 + R() * 0.45; const x2 = bx + nx * o2 * cote + (R() - 0.5) * 0.3, z2 = bz + nz * o2 * cote + (R() - 0.5) * 0.3; if (!garder || garder(x2, z2)) poser(x2, z2, false); }
          }
        }
      }
    };
    const carte = this.solCarteTex && this.solCarteTex.image && this.solCarteTex.image.data;
    if (carte) {
      const CW = this.solCarteTex.image.width, CH = this.solCarteTex.image.height, D = carte;
      const lire = (u, v) => { const i = Math.floor(u), j = Math.floor(v); if (i < 0 || j < 0 || i >= CW || j >= CH) return 0; const o = (j * CW + i) * 4; return Math.max(D[o], D[o + 1], D[o + 3]) / 255; };
      const lisse = (u, v) => { const x = u - 0.5, y = v - 0.5, i = Math.floor(x), j = Math.floor(y), fx = x - i, fy = y - j; return (lire(i, j) * (1 - fx) + lire(i + 1, j) * fx) * (1 - fy) + (lire(i, j + 1) * (1 - fx) + lire(i + 1, j + 1) * fx) * fy; };
      const pc = tel ? B.pasCarteTel : B.pasCarte;
      for (let v = pc / 2; v < T.hauteur; v += pc) for (let u = pc / 2; u < T.largeur; u += pc) {
        const x = u + (R() - 0.5) * pc, z = v + (R() - 0.5) * pc, q = lisse(x, z);
        if (q <= B.bande[0] || q >= B.bande[1]) continue;
        const amas = IM.fbm(x / 6, z / 6, 4471, 2);
        if (R() > B.densite * (0.35 + 1.3 * Math.max(0, Math.min(1, (amas - 0.3) / 0.4)))) continue;
        poser(x, z, false);
      }
    } else {
      for (const l of T.lignes || []) if (l.sorte === 'sentier' || l.sorte === 'ruelle') longer(l.pts, l.demi + B.epaule, 0.6, false, (x, z) => dS(x, z) >= B.epaule - 0.2);
    }
    sorte = 'pieds';
    for (const l of T.lignes || []) if (l.sorte === 'muret' || l.sorte === 'haie') longer(l.pts, l.demi + 0.08, 0.3, true, null);
    sorte = 'pieds';
    for (const o of T.objets || []) {
      if (o.sorte !== 'barriere' && o.sorte !== 'parcelle') continue;
      for (const f of o.empreinte || []) {
        if (!f.rect) continue;
        const coin = (a, b) => [f.u + a * f.c - b * f.s, f.v + a * f.s + b * f.c];
        if (o.sorte === 'barriere') longer([coin(-f.l, 0), coin(f.l, 0)], f.p + 0.08, 0.3, true, null);
        else { const m = 0.25, A = coin(-f.l - m, -f.p - m), Bq = coin(f.l + m, -f.p - m), Cq = coin(f.l + m, f.p + m), D = coin(-f.l - m, f.p + m); longer([A, Bq, Cq, D, A], 0.02, 0.25, true, null); }
      }
    }
    if (!n) return;
    this.bordures = this.semisProche(THREE, this.geoTouffeTrapue(THREE, tel), this.matBordures(THREE), mats, cols, tel ? B.maxTel : B.max);
    this.bordures.mesh.name = 'bordures';
    this.bordures.mesh.receiveShadow = !!this.ombres;
    this.bordures.candidates = n;
    this.bordures.compte = compte;
  }

  geoTouffeTrapue(THREE, tel) {
    const B = Ile3D.SOIR.bordures, lin = h => new THREE.Color(h).convertSRGBToLinear();
    const cBord = lin(B.couleurs[0]), cMi = lin(B.couleurs[1]), cHaut = lin(B.couleurs[2]);
    const p = [], c = [], nrm = [], idx = [], seg = tel ? 6 : 9;
    const sommet = (x, y, z, col, nx, ny, nz) => { const l = Math.hypot(nx, ny, nz) || 1; p.push(x, y, z); c.push(col.r, col.g, col.b); nrm.push(nx / l, ny / l, nz / l); return p.length / 3 - 1; };
    const haut = sommet(0, 0.34, 0, cHaut, 0, 1, 0), r1 = [], r2 = [];
    for (let k = 0; k < seg; k++) {
      const a = k / seg * Math.PI * 2, ca = Math.cos(a), sa = Math.sin(a), ab = (k + 0.5) / seg * Math.PI * 2;
      r1.push(sommet(ca * 0.2, 0.25, sa * 0.2, cMi, ca * 0.5, 1, sa * 0.5));
      r2.push(sommet(ca * 0.3, 0.05, sa * 0.3, cBord, ca, 0.55, sa));
      r2.push(sommet(Math.cos(ab) * 0.42, 0.09, Math.sin(ab) * 0.42, cBord, Math.cos(ab), 0.6, Math.sin(ab)));
    }
    for (let k = 0; k < seg; k++) {
      const k1 = (k + 1) % seg, a = r2[2 * k], pt = r2[2 * k + 1], b = r2[2 * k1];
      idx.push(haut, r1[k], r1[k1]);
      idx.push(r1[k], a, pt, r1[k], pt, r1[k1], r1[k1], pt, b);
    }
    for (let k = 0; k < 3; k++) {
      const a = k / 3 * Math.PI * 2 + 0.5, ca = Math.cos(a), sa = Math.sin(a), w = 0.07;
      const b0 = sommet(ca * 0.08 - sa * w, 0.22, sa * 0.08 + ca * w, cMi, ca * 0.3, 1, sa * 0.3);
      const b1 = sommet(ca * 0.08 + sa * w, 0.22, sa * 0.08 - ca * w, cMi, ca * 0.3, 1, sa * 0.3);
      const t = sommet(ca * 0.26, 0.4 + (k % 2) * 0.05, sa * 0.26, cHaut, ca * 0.3, 1, sa * 0.3);
      idx.push(b0, b1, t);
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(p, 3));
    g.setAttribute('normal', new THREE.Float32BufferAttribute(nrm, 3));
    g.setAttribute('color', new THREE.Float32BufferAttribute(c, 3));
    g.setIndex(idx);
    g.computeBoundingSphere();
    return g;
  }

  matBordures(THREE) {
    const m = new THREE.MeshLambertMaterial({ vertexColors: true, side: THREE.DoubleSide });
    this.ventHerbe(THREE, m);
    const vent = m.onBeforeCompile;
    m.onBeforeCompile = (sh, r) => {
      vent(sh, r);
      sh.fragmentShader = sh.fragmentShader.replace('#include <normal_fragment_begin>', THREE.ShaderChunk.normal_fragment_begin.replace('gl_FrontFacing ? 1.0 : - 1.0', '1.0'));
    };
    m.customProgramCacheKey = () => 'ile-bordures';
    return m;
  }

  prechauffer(camera) {
    const THREE = window.THREE, R = this.renderer, scene = this.scene;
    if (!this.monde || !THREE || !camera || !R) return;
    this.prechauffe = true;
    const t0 = performance.now(), etats = [];
    scene.traverse(o => {
      for (const m of [].concat(o.material || [])) {
        if (!m) continue;
        for (const k of ['map', 'emissiveMap', 'alphaMap', 'normalMap', 'bumpMap', 'aoMap', 'lightMap']) if (m[k] && m[k].isTexture && m[k].image) R.initTexture(m[k]);
        if (m.uniforms) for (const u of Object.values(m.uniforms)) if (u && u.value && u.value.isTexture && u.value.image) R.initTexture(u.value);
      }
    });
    const pris = [], mo = this.figures && this.figures.modeles;
    for (const p of (mo && (mo.parcs || [mo])) || []) {
      if (p && typeof p.troupe === 'function' && p.ids) for (const id of Object.keys(p.ids)) p.troupe(id);
      if (!p || !p.modeles || !p.groupe) continue;
      for (const M of Object.values(p.modeles)) {
        if (!M || typeof M.prendre !== 'function' || typeof M.rendre !== 'function') continue;
        const ex = M.prendre();
        if (!ex || !ex.racine) continue;
        if (!ex.racine.parent) p.groupe.add(ex.racine);
        ex.racine.visible = true;
        pris.push([M, ex]);
      }
    }
    scene.traverse(o => { if (o.isMesh || o.isPoints || o.isLine || o.isSprite) { etats.push([o, o.visible, o.frustumCulled]); o.visible = true; o.frustumCulled = false; } });
    const rt = new THREE.WebGLRenderTarget(1, 1), avant = R.getRenderTarget();
    try { R.setRenderTarget(rt); R.render(scene, camera); } finally {
      R.setRenderTarget(avant); rt.dispose();
      for (const [o, v, f] of etats) { o.visible = v; o.frustumCulled = f; }
      for (const [M, ex] of pris) M.rendre(ex);
    }
    this.msPrechauffage = Math.round(performance.now() - t0);
  }

  suivreOmbres(cam) {
    const O = this.ombres, L = this.lum;
    if (!O || !L) return;
    this.marquerOmbres();
    const c = cam.cible || { x: 0, y: 0, h: 0 }, cc = cam.courante, S = Ile3D.SOIR.ombre;
    let fx = 0, fz = 0;
    if (cc && !cc.isOrthographicCamera) { const d = cc.getWorldDirection(this._dirOmbre || (this._dirOmbre = new window.THREE.Vector3())); const l = Math.hypot(d.x, d.z) || 1; fx = d.x / l; fz = d.z / l; }
    const av = S.demi * S.avance, t = O.texel * 4;
    O.centre.set(Math.round((c.x + fx * av) / t) * t, c.h || 0, Math.round((c.y + fz * av) / t) * t);
    L.cle.target.position.copy(O.centre); L.cle.target.updateMatrixWorld();
    L.cle.position.copy(this.dirSoleil).multiplyScalar(120).add(O.centre);
  }

  uniformesFondu(THREE) {
    if (!this.uFondu) this.uFondu = { a: { value: new THREE.Vector3() }, b: { value: new THREE.Vector3(0, -1000, 0) }, aire: { value: new THREE.Vector4(0, 0, -1, -1) }, dir: { value: new THREE.Vector3(0, 1, 0) }, h: { value: 0 }, orig: { value: new THREE.Vector2(0, 0) }, cases: { value: null } };
    return this.uFondu;
  }
  fonduHouppiers(THREE, m, nom) {
    const cylindre = nom === 'fronde', obstacle = nom === 'roche' || nom === 'acc';
    const U = this.uniformesFondu(THREE);
    const prec = m.onBeforeCompile;
    m.onBeforeCompile = (sh, r) => {
      if (prec) prec(sh, r);
      sh.uniforms.fonduA = U.a; sh.uniforms.fonduB = U.b; sh.uniforms.fonduAire = U.aire; sh.uniforms.fonduDir = U.dir; sh.uniforms.fonduH = U.h;
      sh.uniforms.fonduOrig = U.orig; sh.uniforms.fonduCases = U.cases;
      sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nvarying vec3 vMondeF;')
        .replace('#include <project_vertex>', '#include <project_vertex>\nvMondeF = (modelMatrix * vec4(transformed, 1.0)).xyz;');
      sh.fragmentShader = sh.fragmentShader.replace('#include <common>', `#include <common>
varying vec3 vMondeF; uniform vec3 fonduA; uniform vec3 fonduB; uniform vec4 fonduAire; uniform vec3 fonduDir; uniform float fonduH;
uniform vec2 fonduOrig; uniform sampler2D fonduCases;
float bayer2(vec2 a) { a = floor(a); return fract(dot(a, vec2(0.5, a.y * 0.75))); }
float bayer4(vec2 a) { return bayer2(0.5 * a) * 0.25 + bayer2(a); }
float bayer8(vec2 a) { return bayer4(0.5 * a) * 0.25 + bayer2(a); }
bool dansAire(vec2 c) { return c.x >= 0.0 && c.x < 15.0 && c.y >= 0.0 && c.y < 15.0; }`)
        .replace('#include <clipping_planes_fragment>', `#include <clipping_planes_fragment>
  {
    float f = 0.0;
    ${cylindre ? `vec3 ab = fonduB - fonduA;
    float tt = clamp(dot(vMondeF - fonduA, ab) / max(dot(ab, ab), 1e-4), 0.0, 1.0);
    float dd = length(vMondeF - (fonduA + ab * tt));
    f = (1.0 - smoothstep(1.8, 3.2, dd)) * smoothstep(fonduB.y + 0.6, fonduB.y + 1.8, vMondeF.y);` : ''}
    if (fonduAire.z > fonduAire.x) {
      vec2 cp = floor(vMondeF.xz - fonduOrig);
      if (${obstacle ? 'dansAire(cp)' : 'false'}) {
        // Un obstacle de l'aire : la case de sol qu'il cache, au relief de l'aire.
        float hq = fonduH, genre = 1.0;
        vec2 cq = cp;
        for (int i = 0; i < 3; i++) {
          float ta = (vMondeF.y - hq) / max(fonduDir.y, 0.05);
          cq = floor(vMondeF.xz - fonduDir.xz * ta - fonduOrig);
          if (!dansAire(cq)) break;
          vec4 g = texture2D(fonduCases, vec2((cq.x * 4.0 + 2.5) / 64.0, (cq.y + 0.5) / 16.0));
          hq = fonduH + (g.b * 255.0 - 128.0) / 32.0;
          genre = g.r * 255.0;
        }
        if (dansAire(cq) && (cq.x != cp.x || cq.y != cp.y) && genre < 0.5) f = max(f, 0.8);
      } else {
        float ta = (vMondeF.y - fonduH) / max(fonduDir.y, 0.05);
        vec2 qa = vMondeF.xz - fonduDir.xz * ta;
        if (ta > 0.35 && qa.x > fonduAire.x && qa.x < fonduAire.z && qa.y > fonduAire.y && qa.y < fonduAire.w) f = max(f, 1.3);
      }
    }
    if (f > 0.0 && bayer8(gl_FragCoord.xy) < f * 0.8) discard;
  }`);
    };
    m.customProgramCacheKey = () => 'ile-fondu-' + nom;
  }

  clipAire(THREE, m) {
    const U = this.uniformesFondu(THREE);
    const prec = m.onBeforeCompile;
    m.onBeforeCompile = (sh, r) => {
      if (prec) prec(sh, r);
      sh.uniforms.fonduAire = U.aire;
      sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nvarying vec3 vMondeC;')
        .replace('#include <project_vertex>', '#include <project_vertex>\nvMondeC = (modelMatrix * vec4(transformed, 1.0)).xyz;');
      sh.fragmentShader = sh.fragmentShader.replace('#include <common>', '#include <common>\nvarying vec3 vMondeC; uniform vec4 fonduAire;')
        .replace('#include <clipping_planes_fragment>', `#include <clipping_planes_fragment>
  if (fonduAire.z > fonduAire.x && (vMondeC.x < fonduAire.x - 4.0 || vMondeC.x > fonduAire.z + 4.0 || vMondeC.z < fonduAire.y - 4.0 || vMondeC.z > fonduAire.w + 4.0)) discard;`);
    };
    m.customProgramCacheKey = () => 'ile-clip-' + (m.name || '');
  }

  matHerbe(THREE, rampe) {
    if (this._matHerbe) return this._matHerbe;
    const m = new THREE.MeshToonMaterial({ gradientMap: rampe, vertexColors: true });
    this.ventHerbe(THREE, m);
    m.customProgramCacheKey = () => 'ile-herbe';
    this._matHerbe = m;
    return m;
  }
  ventHerbe(THREE, m) {
    if (!this.uHerbe) this.uHerbe = { temps: { value: 0 }, joueur: { value: new THREE.Vector3() } };
    m.onBeforeCompile = sh => {
      Object.assign(sh.uniforms, this.uHerbe);
      sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nuniform float temps; uniform vec3 joueur;')
        .replace('#include <begin_vertex>', `#include <begin_vertex>
  #ifdef USE_INSTANCING
  vec3 baseH = (modelMatrix * instanceMatrix * vec4(0.0, 0.0, 0.0, 1.0)).xyz;
  float hh = max(0.0, position.y);
  float vent = sin(temps * 1.7 + baseH.x * 0.37 + baseH.z * 0.29) * 0.08 + sin(temps * 3.1 + baseH.x) * 0.03;
  transformed.x += vent * hh * 2.0;
  vec2 ecart = baseH.xz - joueur.xz;
  float de = length(ecart);
  float pousse = (1.0 - smoothstep(0.4, 1.3, de)) * hh * 0.9;
  // L'écart ramené dans le repère de la touffe (rotation autour de la verticale, échelle égale en
  // x et z) : la transposée suffit, sans inverse() (absent de WebGL 1).
  mat3 mi = mat3(modelMatrix * instanceMatrix);
  vec3 e3 = vec3(ecart.x, 0.0, ecart.y);
  vec2 dirL = vec2(dot(mi[0], e3), dot(mi[2], e3));
  transformed.xz += normalize(dirL + vec2(1e-4)) * pousse;
  transformed.y -= pousse * 0.4;
  #endif`);
    };
  }

  preparerHerbe(THREE, D, cartes, L, rampe) {
    const T = this.T, def = this.def, tel = this.telephone;
    const pas = this.qualite === 'haute' ? 1.0 : this.qualite === 'basse' ? 1.7 : tel ? 1.45 : 1.2;
    const k = cartes.k, W = cartes.w, Hc = cartes.h, P1 = cartes.poids1, P2 = cartes.poids2;
    const palettes = (def.regions || []).map(r => r.palette || {});
    const nav = this.world && this.world.plateau && this.world.plateau.nav;
    const IM = IleTerrain.M, R = IM.hasard(IM.cle('herbe-proche'));
    const mats = [], cols = [];
    for (const t of D.tuiles) for (const h of t.herbes) { for (let q = 0; q < 16; q++) mats.push(h.m.elements[q]); cols.push(h.c[0], h.c[1], h.c[2]); }
    const m4 = new THREE.Matrix4(), qu = new THREE.Quaternion(), eu = new THREE.Euler(0, 0, 0, 'YXZ'), po = new THREE.Vector3(), sc = new THREE.Vector3();
    const C = new THREE.Color(), C2 = new THREE.Color();
    for (let v = pas / 2; v < T.hauteur; v += pas) for (let u = pas / 2; u < T.largeur; u += pas) {
      const x = u + (R() - 0.5) * pas * 0.9, z = v + (R() - 0.5) * pas * 0.9, tirage = R();
      const i = Math.floor(x * k), j = Math.floor(z * k);
      if (i < 0 || j < 0 || i >= W || j >= Hc) continue;
      const o = (j * W + i) * 4;
      const herbe = P1[o] / 255, lande = P1[o + 1] / 255, sousBois = P2[o + 1] / 255, vert = herbe + lande + sousBois;
      const amas = IM.fbm(x / 7, z / 7, 991, 2), dense = Math.max(0, Math.min(1, (amas - 0.32) / 0.36));
      if (vert < 0.6 || tirage > (vert - 0.45) * 1.6 * (0.18 + 1.5 * dense)) continue;
      const y = T.marcheA(x, z);
      if (!Number.isFinite(y) || T.profondeurA(x, z) > 0.01) continue;
      if (nav) { const c = nav.caseDe(x, z); if (c < 0 || !nav.ouvertStatique(c)) continue; }
      const pal = palettes[T.regionA(x, z)] || {}, ph = pal.herbe || ['#6a9664'];
      C.set(ph[R() < 0.5 || !ph[1] ? 0 : 1]);
      C2.set(pal.herbeClaire || '#b7d08a');
      C.lerp(C2, R() * (lande > herbe ? 0.5 : 0.22));
      const f = 0.78 + R() * 0.32, s = 0.7 + R() * 0.6;
      eu.set((R() - 0.5) * 0.15, R() * 6.28, (R() - 0.5) * 0.15, 'YXZ'); qu.setFromEuler(eu);
      m4.compose(po.set(x, y - 0.03, z), qu, sc.set(s, s * (0.8 + R() * 0.5) * (lande > herbe ? 1.3 : 1), s));
      for (let q = 0; q < 16; q++) mats.push(m4.elements[q]);
      cols.push(C.r * f, C.g * f, C.b * f);
    }
    const max = tel ? 1300 : this.qualite === 'haute' ? 4200 : 3200;
    this.herbe = this.semisProche(THREE, L.touffe, this.matHerbe(THREE, rampe), mats, cols, max);
    const fm = [], fc = [], pasF = tel ? 2.3 : 1.7;
    const COULEURS = {
      ervane_sources: ['#ffb347', '#a6f0e4', '#dcd6ff', '#c9f06a', '#fff6dc', '#ff8a6a'],
      ervane_mailles: ['#fff6dc', '#f6d36b', '#eab8dc', '#bcd8ff', '#ff9a8a'],
      ervane_murets: ['#b88ad0', '#9a6ab8', '#f2d36b', '#e8d8a0'],
      ervane_bois: ['#e8f0ff', '#bcd8ff', '#f6f1e2'],
      ervane_amarre: ['#f2d36b', '#c9a0ff', '#e8e0cc'],
    };
    const RARETE = { ervane_sources: 1, ervane_mailles: 0.7, ervane_murets: 0.6, ervane_bois: 0.25, ervane_amarre: 0.35 };
    for (let v = pasF / 2; v < T.hauteur; v += pasF) for (let u = pasF / 2; u < T.largeur; u += pasF) {
      const x = u + (R() - 0.5) * pasF, z = v + (R() - 0.5) * pasF, tirage = R();
      const i = Math.floor(x * k), j = Math.floor(z * k);
      if (i < 0 || j < 0 || i >= W || j >= Hc) continue;
      const o = (j * W + i) * 4, herbe = P1[o] / 255 + P1[o + 1] / 255 * 0.6;
      const zone = T.zoneA(x, z), rare = RARETE[zone] || 0.4;
      const pre = Math.max(0, Math.min(1, (IM.fbm(x / 9, z / 9, 1771, 2) - 0.45) / 0.25));
      if (herbe < 0.7 || tirage > pre * rare * 0.9) continue;
      if (!Number.isFinite(T.marcheA(x, z)) || T.profondeurA(x, z) > 0.01) continue;
      if (nav) { const c = nav.caseDe(x, z); if (c < 0 || !nav.ouvertStatique(c)) continue; }
      const cs = COULEURS[zone] || COULEURS.ervane_mailles, col = cs[Math.floor(R() * cs.length)];
      for (let b = 0; b < 3; b++) {
        const fx = x + (R() - 0.5) * 0.7, fz = z + (R() - 0.5) * 0.7, fy = T.marcheA(fx, fz);
        if (!Number.isFinite(fy)) continue;
        const sz = 0.08 + R() * 0.05;
        eu.set(0, R() * 6.28, 0, 'YXZ'); qu.setFromEuler(eu);
        m4.compose(po.set(fx, fy + 0.12 + R() * 0.12, fz), qu, sc.set(sz, sz * 0.7, sz));
        for (let q = 0; q < 16; q++) fm.push(m4.elements[q]);
        C.set(col); const f = 0.85 + R() * 0.2;
        fc.push(C.r * f, C.g * f, C.b * f);
      }
    }
    const matF = new THREE.MeshToonMaterial({ gradientMap: rampe, emissive: new THREE.Color('#2a2418') });
    this.fleurs = this.semisProche(THREE, L.octa, matF, fm, fc, tel ? 520 : 1800);
  }

  semisProche(THREE, geo, mat, mats, cols, max) {
    const T = this.T, n = cols.length / 3, CEL = 8, NX = Math.ceil(T.largeur / CEL) + 1, NZ = Math.ceil(T.hauteur / CEL) + 1;
    const M = new Float32Array(mats), Cc = new Float32Array(cols);
    const cel = new Int32Array(n), compte = new Int32Array(NX * NZ + 1);
    for (let i = 0; i < n; i++) { const cx = Math.max(0, Math.min(NX - 1, Math.floor(M[i * 16 + 12] / CEL))), cz = Math.max(0, Math.min(NZ - 1, Math.floor(M[i * 16 + 14] / CEL))); cel[i] = cz * NX + cx; compte[cel[i] + 1]++; }
    for (let c = 0; c < NX * NZ; c++) compte[c + 1] += compte[c];
    const ordre = new Int32Array(n), pos = compte.slice(0, NX * NZ);
    for (let i = 0; i < n; i++) ordre[pos[cel[i]]++] = i;
    const mesh = new THREE.InstancedMesh(geo, mat, max);
    mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    mesh.setColorAt(0, new THREE.Color(1, 1, 1));
    mesh.instanceColor.setUsage(THREE.DynamicDrawUsage);
    mesh.count = 0;
    mesh.frustumCulled = false;
    this.scene.add(mesh);
    this.octetsGeo += M.byteLength + Cc.byteLength + max * 76;
    return { mesh, M, C: Cc, n, CEL, NX, NZ, debut: compte, ordre, max, centre: null, rayon: 0 };
  }

  majHerbe(x, y) {
    const r0 = Math.min(this.telephone ? 20 : 30, this.camera.champ * (this.telephone ? 0.72 : 0.85));
    const rayon = this.qualite === 'basse' ? r0 * 0.75 : r0;
    for (const H of [this.herbe, this.fleurs, this.touffesNuit, this.bordures]) if (H) this.majSemis(H, x, y, rayon);
  }

  majSemis(H, x, y, rayon) {
    if (H.centre && Math.hypot(x - H.centre[0], y - H.centre[1]) < 3 && Math.abs(rayon - H.rayon) < 1.5) return;
    H.centre = [x, y]; H.rayon = rayon;
    const dst = H.mesh.instanceMatrix.array, dc = H.mesh.instanceColor.array;
    const c0 = Math.max(0, Math.floor((x - rayon) / H.CEL)), c1 = Math.min(H.NX - 1, Math.floor((x + rayon) / H.CEL));
    const r0 = Math.max(0, Math.floor((y - rayon) / H.CEL)), r1 = Math.min(H.NZ - 1, Math.floor((y + rayon) / H.CEL));
    let n = 0;
    for (let cz = r0; cz <= r1 && n < H.max; cz++) for (let cx = c0; cx <= c1 && n < H.max; cx++) {
      const c = cz * H.NX + cx;
      for (let q = H.debut[c]; q < H.debut[c + 1] && n < H.max; q++) {
        const i = H.ordre[q], o = i * 16, dx = H.M[o + 12] - x, dz = H.M[o + 14] - y, d = Math.sqrt(dx * dx + dz * dz);
        if (d > rayon) continue;
        const f = d < rayon * 0.72 ? 1 : 1 - (d - rayon * 0.72) / (rayon * 0.28);
        const b = n * 16;
        for (let e = 0; e < 16; e++) dst[b + e] = H.M[o + e];
        if (f < 1) for (const e of [0, 1, 2, 4, 5, 6, 8, 9, 10]) dst[b + e] *= f;
        dc[n * 3] = H.C[i * 3]; dc[n * 3 + 1] = H.C[i * 3 + 1]; dc[n * 3 + 2] = H.C[i * 3 + 2];
        n++;
      }
    }
    H.mesh.count = n;
    H.mesh.instanceMatrix.needsUpdate = true;
    H.mesh.instanceColor.needsUpdate = true;
  }

  matEau(THREE) {
    const couleursEau = Ile3D.renduDe(this.def).eau || {};
    const m = new THREE.ShaderMaterial({
      uniforms: THREE.UniformsUtils.merge([THREE.UniformsLib.fog, {
        temps: { value: 0 }, plan: { value: this.tex.eau }, touches: { value: this.tex.touchesLin }, bord: { value: this.tex.poids2 }, tailleIle: { value: new THREE.Vector2(this.T.largeur, this.T.hauteur) },
        profonde: { value: new THREE.Color(couleursEau.profonde || '#24566a') }, claire: { value: new THREE.Color(couleursEau.claire || '#4f9c9e') }, ecume: { value: new THREE.Color(couleursEau.ecume || '#eef8f4') }, anime: { value: this.qualite === 'basse' ? 0 : 1 },
      }]),
      vertexShader: `#include <common>
#include <fog_pars_vertex>
varying vec3 vPos;
void main() { vPos = (modelMatrix * vec4(position, 1.0)).xyz; vec4 mvPosition = modelViewMatrix * vec4(position, 1.0); gl_Position = projectionMatrix * mvPosition;
#include <fog_vertex>
}`,
      fragmentShader: `#include <common>
#include <fog_pars_fragment>
uniform float temps; uniform float anime; uniform sampler2D plan; uniform sampler2D touches; uniform sampler2D bord; uniform vec2 tailleIle; uniform vec3 profonde; uniform vec3 claire; uniform vec3 ecume;
varying vec3 vPos;
void main() {
  vec2 p = texture2D(plan, vPos.xz / tailleIle).rg; float prof = p.r;
  if (prof <= 0.004) discard;
  // Coupée au contour de l'île, comme le sol (le champ de distance du bord, 2.4).
  if (texture2D(bord, vPos.xz / tailleIle).a < 0.502) discard;
  float t = temps * anime;
  float t1 = texture2D(touches, vPos.xz * 0.16 + vec2(t * 0.014, t * 0.009)).r;
  float t2 = texture2D(touches, vPos.xz * 0.11 - vec2(t * 0.011, -t * 0.007) + 0.37).r;
  float ondes = (t1 + t2) * 0.5;
  float bandes = smoothstep(0.57, 0.64, ondes);
  // Peu profonde, l'eau laisse voir son lit ; profonde, elle devient bleu-vert sombre. L'écume ne
  // borde que la rive même (un liseré), jamais tout un ruisseau peu profond.
  vec3 col = mix(claire, profonde, smoothstep(0.03, 0.6, prof));
  col = mix(col, claire * 1.15, bandes * 0.35);
  float bord = 1.0 - smoothstep(0.0, 0.05 + 0.03 * p.g, prof);
  float ec = bord * smoothstep(0.45, 0.62, texture2D(touches, vPos.xz * 0.35 + vec2(t * 0.025, 0.0)).r + bord * 0.25);
  col = mix(col, ecume, ec * 0.55);
  col += vec3(0.2, 0.26, 0.28) * smoothstep(0.68, 0.78, ondes) * 0.5;
  float alpha = mix(0.3, 0.9, smoothstep(0.02, 0.4, prof));
  alpha = max(alpha, ec * 0.6);
  gl_FragColor = vec4(col, alpha);
  #include <encodings_fragment>
  #include <fog_fragment>
}`,
      transparent: true, depthWrite: false, fog: true,
    });
    m.uniforms.plan.value = this.tex.eau;
    m.uniforms.touches.value = this.tex.touchesLin;
    m.uniforms.bord.value = this.tex.poids2;
    this.matEauRef = m;
    return m;
  }

  puits(THREE, scene, p) {
    const geo = new THREE.CylinderGeometry(p.r, p.r * 0.86, 26, 48, 6, true).translate(0, -13, 0);
    const uv = geo.attributes.uv;
    for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * 6, (1 - uv.getY(i)) * 0.95);
    const m = new THREE.MeshToonMaterial({ map: this.tex.falaise, gradientMap: this.rampe, side: THREE.BackSide, color: new THREE.Color('#a79aa6'), fog: true });
    m.onBeforeCompile = sh => {
      sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nvarying float vY;').replace('#include <fog_vertex>', '#include <fog_vertex>\nvY = position.y;');
      sh.fragmentShader = sh.fragmentShader.replace('#include <common>', '#include <common>\nvarying float vY;').replace('#include <fog_fragment>', 'gl_FragColor.rgb *= 0.22 + 0.78 * smoothstep(-9.0, -0.5, vY);\ngl_FragColor.rgb = mix(gl_FragColor.rgb, vec3(0.11, 0.06, 0.17), smoothstep(-6.0, -20.0, vY));\n#include <fog_fragment>');
    };
    m.customProgramCacheKey = () => 'ile-puits';
    const mesh = new THREE.Mesh(geo, m);
    mesh.position.set(p.x, p.y + 0.1, p.z);
    scene.add(mesh);
    if (this.decorFixe) this.decorFixe.push(mesh);
    const fond = new THREE.CircleGeometry(p.r * 0.9, 40);
    const col = new Float32Array(fond.attributes.position.count * 3);
    const c0 = new THREE.Color('#3a2454'), c1 = new THREE.Color('#120c1a');
    for (let i = 0; i < fond.attributes.position.count; i++) { const c = i === 0 ? c0 : c1; col[i * 3] = c.r; col[i * 3 + 1] = c.g; col[i * 3 + 2] = c.b; }
    fond.setAttribute('color', new THREE.BufferAttribute(col, 3));
    fond.rotateX(-Math.PI / 2);
    const fm = new THREE.Mesh(fond, new THREE.MeshBasicMaterial({ vertexColors: true, fog: true }));
    fm.position.set(p.x, p.y - 25.8, p.z);
    scene.add(fm);
    if (this.decorFixe) this.decorFixe.push(fm);
    this.octetsGeo += Ile3D.octetsGeo(geo) + Ile3D.octetsGeo(fond);
  }

  nuages(THREE, scene) {
    const R = IleTerrain.M.hasard(123), T = this.T;
    const cx = T.largeur / 2, cz = T.hauteur / 2;
    this.bancs = [];
    let bancs = this.qualite === 'basse' ? [[-30, 8, '#aab3c6', 0.9]] : [[-46, 13, '#8e98b0', 0.95], [-34, 10, '#a7b0c4', 0.78], [-24, 7, '#c3cad8', 0.62]];
    const MS = this.soir && Ile3D.SOIR.mer;
    if (MS) bancs = bancs.map((b, k) => [b[0], b[1], MS.bancs[Math.min(MS.bancs.length - 1, bancs.length === 1 ? 1 : k)], b[3]]);
    const sombre = new THREE.Color(MS ? MS.sombre : '#4f5a78'), cTmp = new THREE.Color();
    for (const [y, rep, teinte, op] of bancs) {
      const t = this.tex.banc.clone(); t.needsUpdate = true; t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(rep * 2, rep * 2); t.offset.set(R(), R());
      const g = new THREE.PlaneGeometry(1400, 1400, 28, 28), P = g.attributes.position, col = new Float32Array(P.count * 3);
      for (let i = 0; i < P.count; i++) {
        const d = Math.hypot(P.getX(i), -P.getY(i) * 0.8);
        const f = Math.max(0, Math.min(1, (d - 30) / 150));
        cTmp.set(teinte).lerp(sombre, (1 - f) * 0.55);
        col[i * 3] = cTmp.r; col[i * 3 + 1] = cTmp.g; col[i * 3 + 2] = cTmp.b;
      }
      g.setAttribute('color', new THREE.BufferAttribute(col, 3));
      const m = new THREE.Mesh(g, new THREE.MeshBasicMaterial({ map: t, vertexColors: true, transparent: true, depthWrite: false, opacity: op, fog: false }));
      m.rotation.x = -Math.PI / 2; m.position.set(cx, y, cz); m.renderOrder = -2; m.userData.vit = 0.0012 + R() * 0.0012;
      scene.add(m); this.bancs.push(m); if (this.decorFixe) this.decorFixe.push(m);
    }
    const nLarge = this.qualite === 'basse' ? 8 : this.telephone ? 16 : 26;
    const posees = IleDecor.bouffeesBord(T, this.qualite === 'basse' ? 10 : this.telephone ? 18 : 30);
    const n = nLarge + posees.length;
    const pages = this.tex.nuages, pw = pages[0].image.width, ph = pages[0].image.height;
    const at = document.createElement('canvas'); at.width = pw * pages.length; at.height = ph;
    pages.forEach((t, k) => at.getContext('2d').drawImage(t.image, k * pw, 0));
    const texB = new THREE.CanvasTexture(at); texB.encoding = THREE.sRGBEncoding; texB.flipY = false;
    this.tex.bouffees = texB;
    this.octetsTex += at.width * at.height * 4 * 1.33;
    const geo = new THREE.InstancedBufferGeometry();
    const q = new THREE.PlaneGeometry(1, 1);
    geo.index = q.index; geo.attributes.position = q.attributes.position; geo.attributes.uv = q.attributes.uv;
    const orbite = new Float32Array(n * 4), forme = new Float32Array(n * 3), teinte = new Float32Array(n * 4);
    const c = new THREE.Color();
    for (let i = 0; i < nLarge; i++) {
      const a = R() * Math.PI * 2, d = 130 + R() * 70, taille = 40 + R() * 60;
      orbite.set([a, d, -22 + R() * 14, (R() - 0.5) * 0.3], i * 4);
      forme.set([taille * 1.35, taille * 0.42, i % pages.length], i * 3);
      c.set(R() < 0.5 ? '#c4cad6' : '#aab1c1');
      teinte.set([c.r, c.g, c.b, 0.55 + R() * 0.25], i * 4);
    }
    posees.forEach((b, k) => {
      const i = nLarge + k, dx = b.x - cx, dz = (b.z - cz) / 0.8;
      orbite.set([Math.atan2(dz, dx), Math.hypot(dx, dz), b.y, 0], i * 4);
      forme.set([b.taille * 1.3, b.taille * 0.42, i % pages.length], i * 3);
      c.set(k % 2 ? '#c9ced8' : '#b3bac8');
      teinte.set([c.r, c.g, c.b, 0.5 + R() * 0.2], i * 4);
    });
    geo.setAttribute('orbite', new THREE.InstancedBufferAttribute(orbite, 4));
    geo.setAttribute('forme', new THREE.InstancedBufferAttribute(forme, 3));
    geo.setAttribute('teinte', new THREE.InstancedBufferAttribute(teinte, 4));
    geo.instanceCount = n;
    const m = new THREE.ShaderMaterial({
      uniforms: THREE.UniformsUtils.merge([THREE.UniformsLib.fog, { carte: { value: texB }, temps: { value: 0 }, centreIle: { value: new THREE.Vector2(cx, cz) }, pages: { value: pages.length } }]),
      vertexShader: `attribute vec4 orbite; attribute vec3 forme; attribute vec4 teinte; uniform float temps; uniform vec2 centreIle; uniform float pages;
varying vec2 vUv; varying vec4 vTeinte;
#include <fog_pars_vertex>
void main() {
  float a = orbite.x + temps * 0.004 * orbite.w;
  vec3 c = vec3(centreIle.x + cos(a) * orbite.y, orbite.z, centreIle.y + sin(a) * orbite.y * 0.8);
  vec4 mvPosition = modelViewMatrix * vec4(c, 1.0);
  mvPosition.xy += position.xy * forme.xy;
  gl_Position = projectionMatrix * mvPosition;
  vUv = vec2((forme.z + uv.x) / pages, 1.0 - uv.y);
  vTeinte = teinte;
  #include <fog_vertex>
}`,
      fragmentShader: `uniform sampler2D carte; varying vec2 vUv; varying vec4 vTeinte;
#include <common>
#include <fog_pars_fragment>
void main() { vec4 t = texture2D(carte, vUv); gl_FragColor = vec4(t.rgb * vTeinte.rgb, t.a * vTeinte.a);
  #include <encodings_fragment>
  #include <fog_fragment>
}`,
      transparent: true, depthWrite: false, fog: true,
    });
    m.uniforms.carte.value = texB;
    this.matBouffees = m;
    this.bouffees = geo;
    const mesh = new THREE.Mesh(geo, m); mesh.frustumCulled = false; mesh.renderOrder = -1;
    scene.add(mesh);
    this.meshBouffees = mesh;
    if (this.decorFixe) this.decorFixe.push(mesh);
  }

  static clavier() {
    if (Ile3D._clavier) return Ile3D._clavier;
    const K = Ile3D._clavier = new Set();
    if (typeof addEventListener !== 'function') return K;
    const M = new Set(['KeyW', 'KeyA', 'KeyS', 'KeyD', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'ShiftLeft', 'ShiftRight']);
    const saisie = t => !!t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.tagName === 'SELECT' || t.isContentEditable);
    addEventListener('keydown', e => {
      if (!M.has(e.code) || e.ctrlKey || e.metaKey || e.altKey || saisie(e.target)) return;
      K.add(e.code);
      if (e.code.startsWith('Arrow')) e.preventDefault();
    });
    addEventListener('keyup', e => K.delete(e.code));
    addEventListener('blur', () => K.clear());
    return K;
  }
  marcheClavier(dt) {
    const w = this.world, P = w && w.plateau, cam = this.camera, K = Ile3D.clavier();
    if (!P || typeof P.pasClavier !== 'function' || !cam) return;
    let f = 0, t = 0;
    if (w.state === 'explore' && !this.salle && !this.enArene && cam.mode === 'exploration' && !cam.trans) {
      if (K.has('KeyW') || K.has('ArrowUp')) f++;
      if (K.has('KeyS') || K.has('ArrowDown')) f--;
      if (K.has('KeyA') || K.has('ArrowLeft')) t++;
      if (K.has('KeyD') || K.has('ArrowRight')) t--;
    }
    if (t && typeof cam.orbiter === 'function') cam.orbiter(t * Ile3D.TOUR_CLAVIER * Math.min(dt, 0.1) / CameraIle.ORBITE.tour, 0);
    if (!f) { P.pasClavier(null, dt); return; }
    const az = cam.azimut;
    P.pasClavier({ x: -Math.sin(az) * f, y: -Math.cos(az) * f }, dt, K.has('ShiftLeft') || K.has('ShiftRight'));
  }

  percerLointain(cam) {
    const C = this.lointain.coupe, cc = cam.courante, a = cam.mode === 'combat' && cam.aire;
    if (!cc) return;
    C.cam.value.copy(cc.position);
    if (a) { C.cible.value.set(a.x0 + a.w / 2, (a.hMoy || 0) + 1, a.y0 + a.h / 2); C.rayon.value = Ile3D.SOIR.lointain.commun.percee[1]; }
    else { const c = cam.cible; C.cible.value.set(c.x, (c.h || 0) + 1, c.y); C.rayon.value = Ile3D.SOIR.lointain.commun.percee[0]; }
  }

  ambianceZone(dt, cam, tact, vol) {
    const THREE = window.THREE, Z = Ile3D.SOIR.zones, L = this.lum;
    if (!this.soir || !this.ambianceVoulue.zones || !Z || !this.T || !this.def || !L) return;
    const c = cam.vise || cam.cible;
    if (!c) return;
    const k = this.T.regionA(c.x, c.y), reg = (this.def.regions || [])[k], id = reg && reg.zone;
    let za = this.zoneAmb;
    if (!za) {
      za = this.zoneAmb = { id: null, cible: null, etat: null, base: null, ecrit: null, css: {}, c: new THREE.Color(), changements: 0 };
    }
    if (id && id !== za.id) {
      za.id = id; za.changements++;
      za.cible = Ile3D.vecteurZone(THREE, Z[id] || Z.neutre);
      if (!za.etat) za.etat = za.cible.slice();
    }
    if (!za.etat) return;
    const a = 1 - Math.exp(-Math.max(0, dt) / Ile3D.ZONE_FONDU), E = za.etat, C = za.cible;
    for (let i = 0; i < E.length; i++) E[i] += (C[i] - E[i]) * a;
    const lum = [L.cle, L.hemi], ecrit = za.ecrit;
    const inchange = ecrit && lum.every((l, i) => l.intensity === ecrit[i][0] && l.color.r === ecrit[i][1] && l.color.g === ecrit[i][2]) && L.hemi.groundColor.r === ecrit[2];
    if (inchange && za.base) {
      lum.forEach((l, i) => { const b = za.base[i]; l.intensity = b[0]; l.color.setRGB(b[1], b[2], b[3]); });
      L.hemi.groundColor.setRGB(za.base[2][0], za.base[2][1], za.base[2][2]);
    } else {
      za.base = [...lum.map(l => [l.intensity, l.color.r, l.color.g, l.color.b]), [L.hemi.groundColor.r, L.hemi.groundColor.g, L.hemi.groundColor.b]];
    }
    const A = this.nuit && this.nuit.amb, jour = A ? A.jour : 1, col = za.c;
    L.cle.color.lerp(col.setRGB(E[0], E[1], E[2]), E[3] * jour); L.cle.intensity *= 1 + (E[4] - 1) * jour;
    L.hemi.color.lerp(col.setRGB(E[5], E[6], E[7]), E[8] * jour); L.hemi.intensity *= 1 + (E[9] - 1) * jour;
    L.hemi.groundColor.lerp(col.setRGB(E[10], E[11], E[12]), E[13] * jour);
    za.ecrit = [...lum.map(l => [l.intensity, l.color.r, l.color.g]), L.hemi.groundColor.r];
    za.brume = za.brume || new THREE.Color();
    za.brume.setRGB(E[14], E[15], E[16]); za.brumeK = E[17] * (0.4 + 0.6 * jour); za.brumeF = 1 + (E[18] - 1) * (0.5 + 0.5 * jour);
    const v = this.voiles;
    if (!v) return;
    const doux = (tact ? 0.25 : cam.enCombat ? 0.6 : 1) * (1 - (vol ? vol.progres : 0)) * (0.45 + 0.55 * jour);
    const hexa = (r, g, b) => '#' + col.setRGB(r, g, b).convertLinearToSRGB().getHexString();
    const couches = za.couches || (za.couches = [v.querySelector('.ile-voiles__zone--lavis'), v.querySelector('.ile-voiles__zone--bord')]);
    const valeurs = [[hexa(E[19], E[20], E[21]), E[22] * doux, '--zone-lavis'], [hexa(E[23], E[24], E[25]), E[26] * doux, '--zone-bord']];
    valeurs.forEach(([hex, op, nom], i) => {
      const el = couches[i], css = za.css[i] || (za.css[i] = {});
      if (!el) return;
      if (css.hex !== hex) { css.hex = hex; v.style.setProperty(nom, hex); }
      const o = Math.round(op * 200) / 200;
      if (css.op !== o) { css.op = o; el.style.opacity = String(o); el.style.visibility = o > 0.004 ? 'visible' : 'hidden'; }
    });
  }

  effacerZone() {
    const za = this.zoneAmb, L = this.lum;
    if (za && za.couches) for (const el of za.couches) if (el) { el.style.opacity = '0'; el.style.visibility = 'hidden'; }
    if (za && za.base && L && L.cle && L.hemi) {
      [L.cle, L.hemi].forEach((l, i) => { const b = za.base[i]; l.intensity = b[0]; l.color.setRGB(b[1], b[2], b[3]); });
      L.hemi.groundColor.setRGB(za.base[2][0], za.base[2][1], za.base[2][2]);
    }
    this.zoneAmb = null;
  }

  poserLointain(THREE, scene, LC) {
    const cfg = Object.assign({ etalonnage: Ile3D.SOIR.etalonnage }, Ile3D.SOIR.lointain.commun, LC);
    const r = IleGlb.lointain(THREE, this, cfg, Ile3D.SOIR.arbres);
    if (!r) return;
    scene.add(r.groupe);
    this.lointain = r;
    this.octetsGeo += r.octets;
    const retirer = o => { if (o && o.parent) o.parent.remove(o); };
    retirer(this.meshFalaise);
    for (const m of this.meshDessous || []) retirer(m);
    for (const b of this.bancs || []) retirer(b);
    retirer(this.meshBouffees);
    this.meshFalaise = null; this.meshDessous = []; this.bancs = [];
  }

  halos(THREE, scene, liste) {
    const n = liste.length;
    if (!n) return;
    const geo = new THREE.InstancedBufferGeometry();
    const q = new THREE.PlaneGeometry(1, 1);
    geo.index = q.index; geo.attributes.position = q.attributes.position; geo.attributes.uv = q.attributes.uv;
    const pos = new Float32Array(n * 3), col = new Float32Array(n * 4), op = new Float32Array(n * 2);
    const c = new THREE.Color();
    liste.forEach((h, i) => { pos.set([h.x, h.y, h.z], i * 3); c.set(h.couleur); col.set([c.r, c.g, c.b, h.taille], i * 4); op[i * 2] = h.opacite == null ? 0.6 : h.opacite; op[i * 2 + 1] = (i * 37 % 100) * 0.0628; });
    geo.setAttribute('centre', new THREE.InstancedBufferAttribute(pos, 3));
    geo.setAttribute('couleur', new THREE.InstancedBufferAttribute(col, 4));
    geo.setAttribute('opacite', new THREE.InstancedBufferAttribute(op, 2));
    geo.instanceCount = n;
    const m = new THREE.ShaderMaterial({
      uniforms: THREE.UniformsUtils.merge([THREE.UniformsLib.fog, { carte: { value: this.tex.halo }, temps: { value: 0 } }]),
      vertexShader: `attribute vec3 centre; attribute vec4 couleur; attribute vec2 opacite; uniform float temps;
varying vec2 vUv; varying vec3 vCol; varying float vA;
#include <fog_pars_vertex>
void main() { vec4 mvPosition = modelViewMatrix * vec4(centre, 1.0); mvPosition.xy += position.xy * couleur.w; gl_Position = projectionMatrix * mvPosition; vUv = uv; vCol = couleur.rgb;
  vA = opacite.x * (0.88 + 0.12 * sin(temps * 5.3 + opacite.y));
#include <fog_vertex>
}`,
      fragmentShader: `uniform sampler2D carte; varying vec2 vUv; varying vec3 vCol; varying float vA;
#include <common>
#include <fog_pars_fragment>
void main() { float a = texture2D(carte, vUv).a * vA;
  // L'alpha suit la lueur : en mélange additif (SRC_ALPHA, ONE), la couleur ajoutée est la même,
  // mais au-dessus du vide de la toile (transparente sur le fond CSS), les coins du panneau ne
  // deviennent plus des pixels opaques et sombres (le halo du fil d'or, au-dessus du mur d'une salle).
  gl_FragColor = vec4(vCol, a);
#include <fog_fragment>
}`,
      transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, fog: true,
    });
    m.uniforms.carte.value = this.tex.halo;
    this.matHalos = m;
    const mesh = new THREE.Mesh(geo, m); mesh.frustumCulled = false; mesh.renderOrder = 8;
    scene.add(mesh);
    if (this.decorFixe) this.decorFixe.push(mesh);
  }

  marques3D(THREE, scene) {
    const anneau = new THREE.RingGeometry(0.55, 0.78, 32).rotateX(-Math.PI / 2);
    const mk = (couleur, op) => new THREE.MeshBasicMaterial({ color: new THREE.Color(couleur), transparent: true, opacity: op, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -3, polygonOffsetUnits: -6, fog: false });
    this.marque = new THREE.Mesh(anneau, mk('#ffe9a8', 0.9)); this.marque.visible = false; this.marque.renderOrder = 6;
    this.survol = new THREE.Mesh(anneau, mk('#8fe9ff', 0.75)); this.survol.visible = false; this.survol.renderOrder = 6;
    this.repere = new THREE.Mesh(new THREE.RingGeometry(0.7, 1.0, 40).rotateX(-Math.PI / 2), mk('#00c2ff', 0.8)); this.repere.visible = false; this.repere.renderOrder = 6;
    const pt = new THREE.CircleGeometry(0.09, 8).rotateX(-Math.PI / 2);
    this.points = new THREE.InstancedMesh(pt, mk('#ffffff', 0.75), 48); this.points.count = 0; this.points.frustumCulled = false; this.points.renderOrder = 6;
    this.traces = new THREE.InstancedMesh(new THREE.RingGeometry(0.2, 0.36, 16).rotateX(-Math.PI / 2), mk('#00c2ff', 0.92), 48); this.traces.count = 0; this.traces.frustumCulled = false; this.traces.renderOrder = 6;
    scene.add(this.marque, this.survol, this.repere, this.points, this.traces);
  }

  static octetsGeo(g) {
    let n = 0;
    for (const k in g.attributes) n += g.attributes[k].array.byteLength;
    if (g.index) n += g.index.array.byteLength;
    return n;
  }


  activer() {
    if (!this.pret) return;
    this.actif = true;
    this.canvas.style.opacity = '1';
    this.voiles.classList.add('on');
    this.camera.muette = false;
    this.redimensionner();
    this.sauter();
    this.dernier = 0;
    cancelAnimationFrame(this.raf);
    this.raf = requestAnimationFrame(this._boucle);
  }

  desactiver() {
    const carte = this.carteOuverte;
    this.actif = false;
    if (carte) this.fermerCarte(true, 'desactive');
    cancelAnimationFrame(this.raf);
    if (this.arene) this.arene.finirAnimations();
    if (this.canvas) this.canvas.style.opacity = '0';
    if (this.voiles) this.voiles.classList.remove('on');
    if (this.camera) this.camera.muette = true;
  }

  liberer(total) {
    this.desactiver();
    const rendre = t => { if (t && t.isTexture) t.dispose(); };
    if (this.scene) {
      this.scene.traverse(o => {
        if (o.geometry) o.geometry.dispose();
        const mats = Array.isArray(o.material) ? o.material : o.material ? [o.material] : [];
        for (const m of mats) {
          rendre(m.map);
          if (m.uniforms) for (const u of Object.values(m.uniforms)) rendre(u && u.value);
          m.dispose();
        }
      });
    }
    for (const t of Object.values(this.tex || {})) { if (Array.isArray(t)) t.forEach(rendre); else rendre(t); }
    if (this.figures) this.figures.liberer();
    if (this.carteIle) { this.carteIle.liberer(); this.carteIle = null; }
    this.modeles = null;
    this.reperesGeants = null;
    this.heros = null;
    if (this.arene) { this.arene.liberer(); this.arene = null; }
    if (this.rampe) this.rampe.dispose();
    if (this.mats) for (const m of Object.values(this.mats)) if (m && m.isMaterial) m.dispose();
    this._matHerbe = null; this.herbe = null; this.fleurs = null; this.touffesNuit = null; this.bordures = null; this.nuit = null; this.lum = null;
    this.scene = null; this.figures = null; this.tex = {}; this.pret = false; this.plateauId = null;
    this.tuilesSol = []; this.tuilesDecor = [];
    this.decor = null; this.prepSol = null; this.T = null; this.def = null; this.cibles = null; this.lanternes = null;
    this.bancs = null; this.eau = null; this.bouffees = null; this.decorGlobal = null; this.moyennes = null; this.rampe = null; this.mats = null;
    this.matEauRef = null; this.matChute = null; this.matHalos = null; this.matBouffees = null;
    this.uFondu = null; this.uHerbe = null; this.ponctuelle = null; this.decorFixe = null;
    this.meshEscarpement = null; this.meshFalaise = null; this.meshDessous = null; this.meshChute = null;
    this.marque = null; this.survol = null; this.repere = null; this.points = null; this.traces = null;
    this.salle = null;
    this.effacerZone();
    this.directions.clear();
    if (this.camera) this.camera.terrain = null;
    this.marques = {}; this.marquesA = 0; this.brumeCle = null; this.cielHex = null;
    this.vus = null; this.caches = null;
    if (total && this.renderer) {
      this.renderer.dispose();
      if (!this.renderer.getContext().isContextLost()) this.renderer.forceContextLoss();
      if (this.canvas) this.canvas.remove();
      if (this.voiles) this.voiles.remove();
      if (this.ro) this.ro.disconnect();
      if (this._taille) removeEventListener('resize', this._taille);
      this.ro = null; this._taille = null;
      this.renderer = null; this.canvas = null; this.voiles = null;
      this.contextePerdu = false;
    }
  }

  surPerte() {
    const sc = this.sceneAiguillage;
    const enJeu = this.actif || !!(sc && (sc.en3D || sc.voulu));
    this.desactiver();
    this.pret = false;
    this.contextePerdu = true;
    clearTimeout(this.minuteriePerte);
    if (!enJeu || !sc) return;
    sc.perte();
    this.minuteriePerte = setTimeout(() => { if (sc.en3D || sc.voulu) sc.repli(); }, 5000);
  }
  surRetour() {
    clearTimeout(this.minuteriePerte);
    this.contextePerdu = false;
    try { this.liberer(); } catch (e) {   }
    const sc = this.sceneAiguillage;
    if (sc) sc.retour();
  }


  hauteur(x, y) {
    const T = this.T;
    if (!T) return 0;
    const h = T.marcheA(x, y);
    return Number.isFinite(h) ? h : T.solBrutA(x, y);
  }
  normale(x, y) { return this.T ? this.T.normaleA(x, y) : [0, 1, 0]; }
  get enArene() { return !!(this.arene && this.arene.ouverte); }
  versScene(x, y) { return this.enArene ? this.arene.versMonde(x, y) : this.salle ? { u: x + 0.5, v: y + 0.5 } : { u: x, v: y }; }
  cellToScreen(x, y) { return { x, y }; }
  worldToClient(x, y) {
    if (!this.camera) return { x: 0, y: 0 };
    const p = this.versScene(x, y);
    return this.camera.worldToClient(p.u, this.hauteur(p.u, p.v), p.v);
  }
  echelleFigure(x, y) {
    if (!this.camera) return 1;
    const p = this.versScene(x, y);
    return this.camera.pixelsParU(p.u, this.hauteur(p.u, p.v), p.v, true) * IleFigures.PX;
  }
  sauter() {
    if (!this.camera || !this.world) return;
    if (this.salle) { const q = this.versScene(this.world.player.rx, this.world.player.ry); this.camera.joueur = { x: q.u, y: q.v, h: 0 }; this.camera.entrerCombat(this.salle.aire, true); return; }
    const p = this.world.player;
    this.camera.sauter(p.rx, p.ry, this.hauteur(p.rx, p.ry));
  }

  screenToCell(cx, cy) {
    if (!this.camera || !this.figures || this.camera.mode === 'carte') return null;
    const cam = this.camera, s = cam.clientToScreen(cx, cy);
    const doigt = typeof matchMedia === 'function' && matchMedia('(pointer: coarse)').matches;
    if (this.enArene) {
      const sol = this.rayonSol(s.x, s.y) || cam.ecranVersPlan(s.x, s.y);
      const c = this.arene.caseSous(sol.x, sol.y);
      return this.combat && this.combat.map && Grid.inBounds(this.combat.map, c.x, c.y) ? c : null;
    }
    if (this.salle) {
      const sol = cam.ecranVersPlan(s.x, s.y, 0);
      const c = { x: Math.floor(sol.x), y: Math.floor(sol.y) };
      return this.salle.map && Grid.inBounds(this.salle.map, c.x, c.y) ? c : null;
    }
    const rects = this.figures.rects.slice().sort((a, b) => a.z - b.z);
    for (const r of rects) {
      if (!r.s.cible) continue;
      const w = Math.max(doigt ? 44 : 20, r.w * 0.5), h = Math.max(doigt ? 44 : 24, r.h * 0.8);
      const x0 = r.x - w / 2, y0 = r.y - h * 0.95, y1 = r.y + Math.max(6, h * 0.12);
      if (s.x >= x0 && s.x <= x0 + w && s.y >= y0 && s.y <= y1) return { x: r.s.cible.ref.x, y: r.s.cible.ref.y, cible: r.s.cible };
    }
    for (const c of this.cibles || []) {
      if (c.type === 'decor') continue;
      const h0 = this.hauteur(c.x, c.y), a = cam.versEcran(c.x, h0, c.y), b = cam.versEcran(c.x, h0 + c.h, c.y);
      if (!a.devant) continue;
      const ppu = cam.pixelsParU(c.x, h0, c.y), rr = Math.max(doigt ? 24 : 12, c.r * ppu);
      const t = Math.max(0, Math.min(1, ((s.x - a.x) * (b.x - a.x) + (s.y - a.y) * (b.y - a.y)) / (((b.x - a.x) ** 2 + (b.y - a.y) ** 2) || 1)));
      const px = a.x + (b.x - a.x) * t, py = a.y + (b.y - a.y) * t;
      if ((s.x - px) ** 2 + (s.y - py) ** 2 <= rr * rr) return { x: c.x, y: c.y, cible: { type: c.type, ref: c.ref != null ? c.ref : c } };
    }
    const sol = this.rayonSol(s.x, s.y);
    if (sol) return { x: sol.x, y: sol.y, cible: null };
    const q = cam.ecranVersPlan(s.x, s.y);
    return { x: Math.max(0, Math.min(this.T.largeur, q.x)), y: Math.max(0, Math.min(this.T.hauteur, q.y)), cible: null };
  }

  rayonSol(sx, sy) {
    const T = this.T;
    if (!T) return null;
    const ray = this.camera.rayon(sx, sy);
    const o = ray.origin, d = ray.direction;
    if (d.y >= -1e-4) return null;
    let t = Math.max(0, (20 - o.y) / d.y);
    const tFin = (-12 - o.y) / d.y;
    const hor = Math.sqrt(d.x * d.x + d.z * d.z) || 1e-6;
    const pas = 0.5 / Math.max(0.2, hor);
    let prec = null;
    const sous = tt => { const x = o.x + d.x * tt, z = o.z + d.z * tt, y = o.y + d.y * tt; const h = T.marcheA(x, z); return Number.isFinite(h) ? y - h : null; };
    for (; t <= tFin; t += pas) {
      const e = sous(t);
      if (e == null) { prec = null; continue; }
      if (e <= 0) {
        let a = prec != null ? t - pas : t, b = t;
        if (prec == null) return { x: o.x + d.x * t, y: o.z + d.z * t };
        for (let k = 0; k < 12; k++) { const m = (a + b) / 2, em = sous(m); if (em == null || em <= 0) b = m; else a = m; }
        return { x: o.x + d.x * b, y: o.z + d.z * b };
      }
      prec = e;
    }
    return null;
  }


  boucle(now) {
    if (!this.actif) return;
    this.raf = requestAnimationFrame(this._boucle);
    if (this.arene) this.arene.avancer(now);
    if (this.enPause) return;
    const dtReel = this.dernier ? now - this.dernier : 16;
    this.dernier = now;
    if (this.dessinEndormi) { if (this.onTick) this.onTick(now); return; }
    this.surveillerCadence(dtReel);
    if (this.onTick) this.onTick(now);
    this.image(now);
  }

  endormirDessin(oui) {
    oui = !!oui;
    if (oui === !!this.dessinEndormi) return;
    this.dessinEndormi = oui;
    this.dernier = 0;
    if (!oui && this.actif && this.pret) this.image(performance.now());
  }

  surveillerCadence(dt) {
    if (this.qualiteForcee || dt > 250 || this.qualite === 'basse') return;
    this.cadence = this.cadence ? this.cadence * 0.95 + dt * 0.05 : dt;
    this.msLentes = this.cadence > 34 ? (this.msLentes || 0) + dt : 0;
    if (this.msLentes >= 3000) {
      this.msLentes = 0;
      this.descendreQualite(this.qualite === 'haute' ? 'moyenne' : 'basse');
      console.info('Ervane : rendu passé en qualité ' + this.qualite + ' (' + Math.round(1000 / this.cadence) + ' images par seconde).');
    }
  }

  descendreQualite(q) {
    this.qualite = q;
    this.appliquerDensite();
    if (this.matEauRef) this.matEauRef.uniforms.anime.value = q === 'basse' ? 0 : 1;
    if (this.bouffees) this.bouffees.instanceCount = Math.min(this.bouffees.instanceCount, q === 'basse' ? 18 : this.telephone ? 34 : 56);
    for (const H of [this.herbe, this.fleurs, this.touffesNuit, this.bordures]) if (H) H.centre = null;
  }

  image(now) {
    if (!this.pret || !this.renderer) return;
    if (this.salle) return this.imageSalle(now);
    const THREE = window.THREE, w = this.world, p = w.player, cam = this.camera;
    const t0 = performance.now();
    const dt = this.tempsPrec ? Math.min(0.1, Math.max(0, (now - this.tempsPrec) / 1000)) : 0.016;
    this.tempsPrec = now;
    this.temps += dt;
    this.marcheClavier(dt);
    const hp = this.hauteur(p.rx, p.ry);
    this.majArene(now);
    cam.update(now, { x: p.rx, y: p.ry, h: hp }, p.moving);
    const c = cam.vise;
    const A = this.arene, tact = this.enArene && this.tactique;
    if (this.modeles && typeof IleModeles === 'object') IleModeles.animer(this.modeles, this.temps);
    const vol = cam.survolCarte ? cam.survolCarte() : null, K = this.carteIle;
    const lodPret = !!(vol && K && K.avancerLod());
    const survol = !!(vol && lodPret && vol.largeur > K.seuilProche());
    const champ = vol ? vol.largeur : cam.champ;
    const pres = champ * (this.qualite === 'haute' ? 1.6 : this.qualite === 'basse' ? 0.9 : 1.15) + 6;
    const distTuile = t => Math.hypot(Math.max(0, Math.abs(t.centre[0] - c.x) - 15), Math.max(0, Math.abs(t.centre[1] - c.y) - 15));
    const solMax = this.nuit && this.nuit.solMax && !this.enArene && !vol ? this.nuit.solMax : Infinity;
    for (const t of this.tuilesSol) {
      const d = distTuile(t), proche = !t.loin || d < pres;
      t.proche.visible = proche && d < solMax;
      if (t.loin) t.loin.visible = !proche && d < solMax;
    }
    const kNuit = this.nuit ? (this.nuit.kDetail || (this.telephone ? 0.8 : 0.85)) : 1;
    let rDet = (this.qualite === 'haute' ? 60 : this.qualite === 'basse' ? 30 : 45) * kNuit, rSil = (this.qualite === 'haute' ? 120 : 80) * (this.nuit ? (this.nuit.kSil || 0.72) : 1);
    const ri = !vol && cam.partIso ? cam.partIso() : 0;
    if (ri > 0) { rDet += (Math.min(rDet, champ * 0.75 + 8) - rDet) * ri; rSil += (Math.min(rSil, champ * 0.6 + 10) - rSil) * ri; }
    const demi = IleDecor.TUILE / 2;
    const distMorceau = t => Math.hypot(Math.max(0, Math.abs(t.centre[0] - c.x) - demi), Math.max(0, Math.abs(t.centre[1] - c.y) - demi));
    const reste = Math.max(rSil, 60) + (Math.min(Math.max(rSil, 60), champ * 0.9 + 20) - Math.max(rSil, 60)) * ri;
    const solVu = Number.isFinite(solMax) ? solMax + (Math.min(solMax, champ * 0.9 + 14) - solMax) * ri : solMax;
    if (this.monde && typeof IleGlb === 'object' && IleGlb.portee && !tact) IleGlb.portee(this.monde, c, { sol: solVu, semis: rSil, reste });
    if (this.reperesGeants && typeof IleReperes === 'object') IleReperes.voir(this.reperesGeants, c, { tact, vol: !!vol, nuit: this.nuit ? (this.nuit.amb ? this.nuit.amb.nuit : 1) : 0, t: this.temps });
    for (const t of this.tuilesDecor) {
      const d = distMorceau(t);
      t.groupe.visible = d < rDet && !tact;
      if (t.sil) t.sil.visible = d >= rDet && d < rSil && !tact;
    }
    for (const H of [this.herbe, this.fleurs, this.touffesNuit, this.bordures]) if (H) H.mesh.visible = !tact;
    if (this.touffesNuit) this.touffesNuit.mesh.visible = !tact && !(A && A.etat && A.etat !== 'apercu');
    if (this.bordures) this.bordures.mesh.visible = !tact && !(A && A.etat && A.etat !== 'apercu');
    if (this.eau) this.eau.visible = !tact;
    for (const m of this.decorFixe || []) m.visible = !tact;
    if (this.meshFalaise && this.meshFalaise.children && !tact) {
      const pf = Math.max(rSil, 60) * 1.5;
      let un = false;
      for (const m of this.meshFalaise.children) { const s = m.geometry.boundingSphere; const v = !!s && Math.hypot(s.center.x - c.x, s.center.z - c.y) - s.radius < pf; m.visible = v; if (v) un = true; }
      for (const m of this.meshDessous || []) m.visible = un;
    }
    if (this.monde && typeof IleGlb === 'object' && IleGlb.tactique && this.mondeTactique !== tact) { IleGlb.tactique(this.monde, tact); this.mondeTactique = tact; }
    if (this.meshChute) this.meshChute.visible = !tact && !(A && A.etat && A.etat !== 'apercu');
    if (K && K.lod) K.survolLod(survol);
    if (survol) for (const H of [this.herbe, this.fleurs, this.touffesNuit, this.bordures]) if (H) H.mesh.visible = false;
    if (this.uHerbe) { this.uHerbe.temps.value = this.temps; this.uHerbe.joueur.value.set(p.rx, hp, p.ry); }
    if (this.uFondu) {
      const vis = this.enArene ? this.cibleFondu() : { u: p.rx, v: p.ry };
      this.uFondu.a.value.copy(cam.courante.position);
      this.uFondu.b.value.set(vis.u, this.hauteur(vis.u, vis.v) + 0.9, vis.v);
      if (vol) { this.uFondu.a.value.set(-9999, -9999, -9999); this.uFondu.b.value.set(-9999, -9999, -9999); }
      const cd = cam.cadre;
      if (A && A.etat && cd) {
        this.uFondu.aire.value.set(A.x0 - 0.3, A.y0 - 0.3, A.x0 + 19, A.y0 + 19);
        this.uFondu.dir.value.set(cd.dir[0], cd.dir[1], cd.dir[2]);
        this.uFondu.h.value = cd.h;
        this.uFondu.orig.value.set(A.x0, A.y0);
        this.uFondu.cases.value = A.texCases;
      } else this.uFondu.aire.value.set(0, 0, -1, -1);
    }
    this.majHerbe(c.x, c.y);
    this.mesurerHUD(now);
    const extras = A && A.etat ? A.majEffets(now, dt) : null;
    this.figures.maj(this.sprites(now), cam, now, extras);
    this.majMarques(now, hp);
    if (K) K.maj(now, vol);
    if (this.matEauRef) this.matEauRef.uniforms.temps.value = this.temps;
    if (this.matChute) this.matChute.map.offset.y = -this.temps * 0.32;
    if (this.matHalos) this.matHalos.uniforms.temps.value = this.temps;
    for (const b of this.bancs || []) b.material.map.offset.x += dt * b.userData.vit;
    if (this.matBouffees) this.matBouffees.uniforms.temps.value = this.temps;
    this.majBrume(dt);
    let best = null, bd = 14 * 14;
    for (const l of this.lanternes || []) { const d = (l.x - p.rx) ** 2 + (l.z - p.ry) ** 2; if (d < bd) { bd = d; best = l; } }
    if (best) { this.ponctuelle.position.set(best.x, best.y + 0.3, best.z); this.ponctuelle.intensity = 1.6 * (0.85 + 0.15 * Math.sin(this.temps * 9 + best.x)); }
    else this.ponctuelle.intensity = 0;
    if (this.nuit) {
      const e = this.enArene && this.combat && this.combat.player, q = e ? A.versMonde(e.rx, e.ry) : { u: p.rx, v: p.ry };
      this.nuit.maj(now, this.temps, { x: q.u, y: q.v }, this.hauteur(q.u, q.v), cam, tact || !!vol);
    }
    this.ambianceZone(dt, cam, tact, vol);
    if (this.soir && this.monde && !this.monde.userData.etalonne) { this.etalonner(); this.preparerBordures(); }
    if (this.ombres) this.suivreOmbres(cam);
    if (!this.prechauffe) this.prechauffer(cam.courante);
    if (this.lointain && this.lointain.coupe) this.percerLointain(cam);
    const r = this.renderer;
    r.info.reset();
    r.render(this.scene, cam.courante);
    this.derniereInfo = { appels: r.info.render.calls, triangles: r.info.render.triangles, points: r.info.render.points, lignes: r.info.render.lines };
    this.compteur.images++;
    this.msScript = (this.msScript || 0) * 0.9 + (performance.now() - t0) * 0.1;
    cam.flush();
  }

  mesurerHUD(now) {
    if (this._hudA && now - this._hudA < 250 && now >= this._hudA) return;
    this._hudA = now;
    if (typeof document === 'undefined' || !this.stage || !this.figures) return;
    const st = this.stage.getBoundingClientRect(), zones = [];
    for (const sel of ['#player-bar', '#menus', '#map-name', '#lieu', '#carte-info', '#bas-centre', '#minicarte', '#vue', '#tracker', '.vy-barre-tour', '.vy-ruban:not(.hidden)', '.vy-rappel:not(.hidden)']) {
      for (const el of document.querySelectorAll(sel)) {
        if (!el.offsetWidth || !el.offsetHeight) continue;
        const r = el.getBoundingClientRect();
        if (r.width < 4 || r.height < 4) continue;
        zones.push({ x0: r.left - st.left - 2, y0: r.top - st.top - 2, x1: r.right - st.left + 2, y1: r.bottom - st.top + 2 });
      }
    }
    this.figures.zonesHUD = zones;
  }

  majArene(now) {
    const A = this.arene, cam = this.camera, w = this.world, cb = this.combat;
    if (!A || !cam) return;
    const an = w && w.showCombat && cb && cb.map && cb.map.ancre;
    const ici = !!(an && (this.salle ? an.salle === this.salle.id : an.plateau === this.plateauId));
    if (ici && !A.ouverte) {
      if (this.carteOuverte) this.fermerCarte(true, 'combat');
      const aire = A.ouvrir(cb.map);
      this.mats.uSol.aireO.value.set(aire.x0, aire.y0);
      cam.entrerCombat(aire, !!this.salle);
    } else if (!ici && A.ouverte) {
      A.fermer();
      if (!this.salle) cam.sortirCombat();
    }
    if (A.etat === 'fermeture' && !cam.trans) A.eteindre();
    const ap = !ici && w && w.state === 'explore' ? w.apercuTerrain : null;
    const voulu = !!(ap && ap.map && ap.map.ancre && !this.salle && ap.map.ancre.plateau === this.plateauId && A.apercu(ap.map, ap.disposition));
    if (voulu) this.mats.uSol.aireO.value.set(A.x0, A.y0);
    const dtA = this._tApercu != null && now > this._tApercu ? Math.min(0.1, (now - this._tApercu) / 1000) : 0;
    this._tApercu = now;
    this.apercuK = Math.max(0, Math.min(1, (this.apercuK || 0) + (voulu ? 1 : -1) * dtA / 0.15));
    if (!voulu && A.etat === 'apercu' && this.apercuK <= 0) A.finApercu();
    cam.setTactique(ici && this.tactique);
    if (ici && (!this._coinA || now - this._coinA > 250 || now < this._coinA)) {
      this._coinA = now;
      const tb = typeof document !== 'undefined' ? document.querySelector('.vy-barre-tour') : null;
      let coin = null;
      if (tb && tb.offsetWidth > 0 && this.stage) {
        const r = tb.getBoundingClientRect(), st = this.stage.getBoundingClientRect();
        if (r.left > st.left + st.width * 0.4 && r.top > st.top + st.height * 0.4 && r.top < st.bottom) coin = { w: st.right - r.left, h: st.bottom - r.top };
      }
      cam.setCoin(coin);
    }
    if (ici) {
      const ac = cb.actor && cb.actor.alive ? cb.actor : cb.player;
      if (ac) { const q = A.versMonde(ac.rx, ac.ry); cam.suivreCombat(ac.id, q.u, this.hauteur(q.u, q.v), q.v); }
      A.majCases(this.highlights, cb);
    }
    const u = this.mats.uSol;
    u.aireOn.value = A.etat === 'apercu' ? this.apercuK : A.etat ? Math.max(0, Math.min(1, cam.fondu)) : 0;
    u.tempsSol.value = now / 1000;
    u.tactiqueSol.value = ici && this.tactique ? 1 : 0;
    if (u.grilleSol) u.grilleSol.value = typeof UI === 'function' && UI.reglage && !UI.reglage('grille') ? 0 : 1;
    if (A.etat) {
      const el = cam.enCombat && !cam.trans && cam.cadre ? cam.cadre.el : (cam.dernierEtat ? cam.dernierEtat.el : cam.elevation());
      const se = Math.sin(el), f = se / (0.7071 * Math.sqrt(1 + se * se));
      const v = cam.vise, ppu = cam.pixelsParU(v.x, v.h, v.y);
      u.traitU.value = 1 / Math.max(1e-3, ppu * f);
    }
  }

  cibleFondu() {
    const cb = this.combat, A = this.arene;
    const e = cb.actor && cb.actor.alive ? cb.actor : cb.player;
    return e ? A.versMonde(e.rx, e.ry) : { u: A.x0 + 7.5, v: A.y0 + 7.5 };
  }

  majBrume(dt) {
    const THREE = window.THREE, c = this.camera.vise;
    const k = this.T.regionA(c.x, c.y), reg = (this.def.regions || [])[k];
    const col = (reg && reg.palette && reg.palette.brume) || '#a9c3d6';
    if (this.brumeCle !== col) {
      this.brumeCle = col; this.brumeVoulue = this.nuit ? this.nuit.brume(col) : new THREE.Color(col);
      if (this.soir && !this.nuit) this.brumeVoulue.lerp(new THREE.Color(Ile3D.SOIR.horizon), Ile3D.SOIR.horizonK);
    }
    const f = this.scene.fog;
    const a = 1 - Math.exp(-dt * 2.2);
    const za = this.zoneAmb && this.zoneAmb.brume ? this.zoneAmb : null;
    f.color.lerp(za ? (this._brumeZ || (this._brumeZ = new THREE.Color())).copy(this.brumeVoulue).lerp(za.brume, za.brumeK) : this.brumeVoulue, a);
    const d = this.camera.distance(), fc = this.camera.fondu || 0;
    const ks = this.soir && !this.nuit ? Ile3D.SOIR.recul : 1;
    const kp = (this.nuit ? 0.92 : 1.1) * ks, kl = (this.nuit ? 2.0 : 2.7) * ks;
    if (f.isFogExp2) f.density = (this.nuit.densite || 0.016) * (1 - fc) + 0.0035 * fc;
    else { f.near = d * kp * (1 - fc) + (d + 30) * fc; f.far = d * kl * (1 - fc) + (d + 120) * fc; }
    if (za && za.brumeF !== 1) {
      const fz = 1 + (za.brumeF - 1) * (1 - fc);
      if (f.isFogExp2) f.density *= fz; else { f.near /= fz; f.far /= fz; }
    }
    const ri = this.camera.partIso ? this.camera.partIso() : 0;
    if (ri > 0 && f.isFogExp2) f.density = f.density * (1 - ri) + Math.min(f.density, 0.26 / d) * ri;
    const vol = this.camera.survolCarte ? this.camera.survolCarte() : null;
    if (vol) {
      const k = vol.progres;
      if (f.isFogExp2) f.density = f.density * (1 - k) + Math.min(f.density, 0.26 / d) * k;
      else { f.near = f.near * (1 - k) + d * 1.6 * k; f.far = f.far * (1 - k) + d * 4.5 * k; }
    }
    const tact = this.enArene && this.tactique;
    const hex = tact ? 'tactique' : '#' + f.color.getHexString();
    if (hex !== this.cielHex && tact) {
      this.cielHex = hex;
      this.canvas.style.background = '#070b14';
    } else if (hex !== this.cielHex) {
      this.cielHex = hex;
      const cl = new THREE.Color().copy(f.color).convertLinearToSRGB();
      const haut = '#' + cl.clone().lerp(new THREE.Color(1, 1, 1), 0.12).getHexString(), bas = '#' + cl.clone().multiplyScalar(0.62).getHexString();
      this.canvas.style.background = this.nuit ? this.nuit.ciel(cl) : `linear-gradient(180deg, ${haut} 0%, #${cl.getHexString()} 45%, ${bas} 100%)`;
      this.uBrumeBas.value.copy(f.color).multiplyScalar(0.85);
    }
  }

  sprites(now) {
    const w = this.world, out = [];
    const ch = w.ch, cls = DATA.classes[ch.classId], p = w.player;
    const c = this.camera ? this.camera.vise : { x: p.rx, y: p.ry };
    const vol = this.camera && this.camera.survolCarte ? this.camera.survolCarte() : null;
    if (vol && vol.largeur > (typeof IleCarte === 'object' ? IleCarte.FIGURES_MAX : 60)) return out;
    const rayon = vol ? vol.largeur * 0.8 + 12 : (this.camera ? this.camera.champ : 30) * 1.4 + 12;
    const A = this.arene, enCombat = this.enArene;
    if (enCombat) return A.sprites(this.combat, now, this.figures, this.telephone);
    const loin = (x, y) => Math.abs(x - c.x) > rayon || Math.abs(y - c.y) > rayon;
    const H = (x, y) => this.hauteur(x, y);
    const N = (x, y) => this.normale(x, y);
    const salle = !!this.salle;
    const pos = (x, y) => (salle ? [x + 0.5, y + 0.5] : [x, y]);
    const fig = this.figures;
    const [px, py] = pos(p.rx, p.ry);
    const ap = ch.lookAffiche();
    const veilleur = { kind: 'entity', shape: 'player', color: cls.color, glyph: cls.glyph, name: ch.name, team: 'player', facing: p.facing, look: ap.look, auraCos: this.qualite === 'basse' ? null : ap.auraCos, lueur: ap.lueur, gender: ch.gender, scale: 1, x: px, y: py, h: H(px, py), normale: N(px, py), bob: p.moving ? Math.abs(Math.sin(now / 70)) * 3 : Math.sin(now / 900) * 0.8, joueur: true };
    veilleur.cle = fig.cleFigure(veilleur); veilleur.peindre = fig.peindreFigure(veilleur);
    if (fig.heros) { veilleur.heros = true; veilleur.bouge = !!p.moving; }
    out.push(veilleur);
    if (typeof Compagnons !== 'undefined') Compagnons.figures3D(w, out, veilleur, now, { pos, H, N, fig });
    for (const g of w.groups) {
      const [gx, gy] = pos(g.rx, g.ry);
      let fondu = 1;
      if (g.naissance != null && this.vus && !salle) {
        if (!this.vus.has(g)) { this.vus.add(g); if (this.camera && this.camera.dansChamp(gx, gy, 4)) this.caches.set(g, null); }
        const c = this.caches.get(g);
        if (c === null) {
          if (this.camera && this.camera.dansChamp(gx, gy, 2) && Math.hypot(gx - p.rx, gy - p.ry) > 12) continue;
          this.caches.set(g, now);
        }
        if (c != null) { fondu = Math.min(1, (now - c) / 600); if (fondu >= 1) this.caches.delete(g); }
      }
      if (loin(gx, gy)) continue;
      const membres = fig.membres(salle ? Object.assign({}, g, { rx: gx, ry: gy }) : g, now);
      const prec = this.directions.get(g) || { x: g.rx, y: g.ry, f: 1 };
      const sx = (g.rx - prec.x) - (g.ry - prec.y);
      if (Math.abs(sx) > 0.02) prec.f = sx > 0 ? 1 : -1;
      prec.x = g.rx; prec.y = g.ry; this.directions.set(g, prec);
      g.monsters.slice(0, 4).forEach((m, k) => {
        const def = DATA.monsters[m.id];
        if (!def) return;
        const [x, y] = membres[k];
        const s = { kind: 'entity', shape: def.shape, color: def.color, glyph: null, team: 'monster', motif: Renderer.motifOf(m.id), noyau: def.noyau || null, scale: def.boss || def.recherche ? 1.3 : this.telephone ? 1.2 : 0.95, facing: prec.f, x, y, h: H(x, y), normale: N(x, y), bob: Math.sin(now / 500 + g.idx + k) * 1.5, alpha: fondu, cible: { type: 'groupe', ref: g } };
        if (k === 0 && !vol) { s.label = `${g.alerte != null ? '! ' : ''}${def.recherche ? 'Recherché : ' : ''}${def.boss ? def.name.split(',')[0] : def.name} niv. ${g.level}`; s.labelSorte = 'ennemi'; if (g.monsters.length > 1) s.badge = `×${g.monsters.length}`; }
        if (fig.modeles && fig.modeles.prend(m.id)) { s.modele = m.id; s.modeleCle = `${g.nid || g.idx}|${k}`; }
        s.cle = fig.cleFigure(s); s.peindre = fig.peindreFigure(s);
        out.push(s);
      });
    }
    if (!this.marquesA || now - this.marquesA > 500) {
      this.marquesA = now; this.marques = {};
      for (const n of w.npcs) this.marques[n.id] = Quests.available(ch, n.id).length ? '!' : (Quests.readyFor(ch, n.id).length ? '?' : null);
    }
    for (const n of w.npcs) {
      const [nx, ny] = pos(n.x, n.y);
      if (loin(nx, ny)) continue;
      const s = { kind: 'npc', look: n.def.look || 'marcheur', x: nx, y: ny, h: H(nx, ny), normale: N(nx, ny), label: vol ? null : n.def.name, labelSorte: 'nom', quest: vol ? null : this.marques[n.id], bob: 0, cible: { type: 'pnj', ref: n } };
      s.cle = fig.cleFigure(s); s.peindre = fig.peindreFigure(s);
      out.push(s);
    }
    for (const n of w.nodes) {
      const [nx, ny] = pos(n.x, n.y);
      if (loin(nx, ny)) continue;
      const def = Items.get(n.resource), kind = def && def.node ? def.node.kind : 'plante';
      const s = { kind: 'node', resource: n.resource, nodeKind: kind, x: nx, y: ny, h: H(nx, ny), normale: N(nx, ny), alpha: n.ready ? 1 : 0.4, scale: 0.9, cible: { type: 'noeud', ref: n } };
      s.cle = fig.cleFigure(s); s.peindre = fig.peindreFigure(s);
      out.push(s);
    }
    return out;
  }

  majMarques(now, hp) {
    const w = this.world, P = w.plateau, p = w.player, enCombat = this.enArene;
    const m = !enCombat && P && P.marque;
    this.marque.visible = !!m;
    if (m) {
      const k = 1 + 0.12 * Math.sin(now / 160);
      this.marque.position.set(m.x, this.hauteur(m.x, m.y) + 0.06, m.y);
      this.marque.scale.set(k, 1, k);
    }
    const ch = p.chemin;
    let n = 0;
    if (!enCombat && ch && ch.pts && ch.pts.length > 1) {
      const THREE = window.THREE, mat = new THREE.Matrix4();
      for (let s = ch.s + 1.2; s < ch.longueur - 0.6 && n < 48; s += 1.2) {
        const q = P.pointACopie(ch, s);
        mat.makeTranslation(q.x, this.hauteur(q.x, q.y) + 0.05, q.y);
        this.points.setMatrixAt(n++, mat);
      }
      this.points.instanceMatrix.needsUpdate = true;
    }
    this.points.count = n;
    const hv = !enCombat && this.highlights && this.highlights.hover;
    this.survol.visible = !!(hv && Number.isFinite(hv.x) && hv.cible);
    if (this.survol.visible) { this.survol.position.set(hv.x, this.hauteur(hv.x, hv.y) + 0.05, hv.y); }
    const cue = this.guideCue;
    const o = cue && (cue.group || cue.entity || cue.cell || cue.point);
    this.repere.visible = !!o;
    let nt = 0;
    const tr = !enCombat && cue && Array.isArray(cue.chemin) ? cue.chemin : null;
    if (tr && tr.length) {
      const THREE = window.THREE, mat = new THREE.Matrix4(), k = 1 + 0.1 * Math.sin(now / 300);
      for (const q of tr) { if (nt >= 48) break; mat.makeScale(k, 1, k).setPosition(q.x, this.hauteur(q.x, q.y) + 0.05, q.y); this.traces.setMatrixAt(nt++, mat); }
      this.traces.instanceMatrix.needsUpdate = true;
    }
    this.traces.count = nt;
    if (o) {
      let x = o.rx != null ? o.rx : o.x != null ? o.x : o.u, y = o.ry != null ? o.ry : o.y != null ? o.y : o.v;
      if ((enCombat && !cue.group && !cue.point) || (this.salle && !cue.point)) { const q = this.versScene(x, y); x = q.u; y = q.v; }
      const k = 1 + 0.18 * Math.sin(now / 280);
      this.repere.position.set(x, this.hauteur(x, y) + 0.07, y);
      this.repere.scale.set(k, 1, k);
    }
    void hp;
  }


  carteDisponible() {
    const w = this.world, cam = this.camera;
    return !!(typeof IleCarte === 'object' && this.actif && this.pret && cam && this.canvas && !this.salle && w && w.plateau && !w.showCombat && !this.enArene && !cam.trans && (cam.mode === 'exploration' || cam.mode === 'carte'));
  }
  get carteOuverte() { return !!(this.carteIle && this.carteIle.ouverte); }

  ouvrirCarte(hote, opts) {
    opts = opts || {};
    if (this.carteOuverte) {
      if (hote && hote !== this.hote) { this.deplacerToile(hote); this.redimensionner(); }
      Object.assign(this.carteIle.opts, opts);
      return true;
    }
    if (!hote || !this.carteDisponible()) return false;
    if (!this.carteIle) this.carteIle = new IleCarte.Carte(window.THREE, this);
    if (opts.photo !== false) this.prendrePhoto();
    const T = this.T, def = this.def || {}, contour = def.bord && def.bord.contour;
    let bornes = null;
    if (contour && contour.length) {
      const xs = contour.map(q => q[0]), ys = contour.map(q => q[1]);
      bornes = { x0: Math.max(0, Math.min(...xs)), y0: Math.max(0, Math.min(...ys)), x1: Math.min(T ? T.largeur : 240, Math.max(...xs)), y1: Math.min(T ? T.hauteur : 180, Math.max(...ys)) };
    }
    if (!this.camera.entrerCarte({ el: hote, contour, bornes, immediat: !!opts.immediat })) { this.retirerPhoto(); return false; }
    this.carteIle.ouvrir(opts);
    this.deplacerToile(hote);
    this.redimensionner();
    return true;
  }

  fermerCarte(immediat, raison) {
    const K = this.carteIle;
    if (!K || !K.ouverte) return;
    const avertir = raison && K.opts && K.opts.surFermeture;
    K.fermer();
    if (this.camera) this.camera.sortirCarte(immediat);
    this.retirerPhoto();
    this.deplacerToile(null);
    this.redimensionner();
    if (avertir) { try { avertir(raison); } catch (e) { console.error(e); } }
  }

  deplacerToile(hote) {
    const cv = this.canvas;
    if (!cv) return;
    if (hote) { if (cv.parentNode !== hote) hote.appendChild(cv); cv.classList.add('ile-carte-toile'); }
    else { if (cv.parentNode !== this.stage) this.stage.insertBefore(cv, this.voiles || this.board); cv.classList.remove('ile-carte-toile'); }
    if (this.ro) { if (this.hote && this.hote !== hote) this.ro.unobserve(this.hote); if (hote && hote !== this.hote) this.ro.observe(hote); }
    this.hote = hote || null;
  }

  prendrePhoto() {
    const cv = this.canvas, st = this.stage;
    if (!cv || !st || !this.pret) return;
    this.image(performance.now());
    const w = Math.max(1, st.clientWidth), h = Math.max(1, st.clientHeight);
    const ph = this.photo || (this.photo = document.createElement('canvas'));
    ph.className = 'board-repli ile-photo';
    ph.setAttribute('aria-hidden', 'true');
    ph.width = w; ph.height = h;
    try { ph.getContext('2d').drawImage(cv, 0, 0, w, h); } catch (e) {   }
    ph.style.background = cv.style.background;
    st.insertBefore(ph, this.voiles || this.board);
  }
  retirerPhoto() { if (this.photo) { this.photo.remove(); this.photo.width = 0; this.photo.height = 0; this.photo = null; } }


  avancer(ms) {
    const w = this.world;
    if (!w || !this.pret) return;
    const pas = 1 / 30, n = Math.max(1, Math.round(ms / 1000 / pas));
    let t = Math.max(performance.now(), this.horlogeTest || 0);
    for (let i = 0; i < n; i++) {
      this.marcheClavier(pas);
      w.update(pas);
      t += pas * 1000;
      const p = w.player, q = this.versScene(p.rx, p.ry);
      if (this.camera) this.camera.update(t, { x: q.u, y: q.v, h: this.hauteur(q.u, q.v) }, p.moving);
    }
    this.horlogeTest = t;
    this.tempsPrec = 0;
    if (this.arene) this.arene.avancer(performance.now());
    this.image(t);
  }

  stats() {
    const r = this.renderer;
    const tex = this.octetsTex + (this.figures ? this.figures.octets() : 0) + (this.carteIle ? this.carteIle.octets() : 0);
    let pixi = 0;
    const cases = this.sceneAiguillage && this.sceneAiguillage.cases;
    if (cases && cases.sprTex) for (const t of cases.sprTex.values()) pixi += (t.width || 0) * (t.height || 0) * 4;
    if (cases && cases.textures) for (const t of cases.textures.values()) pixi += ((t.texture && t.texture.width) || 0) * ((t.texture && t.texture.height) || 0) * 4;
    const toile = this.canvas ? this.canvas.width * this.canvas.height * 4 * 2 : 0;
    return {
      qualite: this.qualite, webgl2: !!this.webgl2, densite: this.densite,
      appels: this.derniereInfo ? this.derniereInfo.appels : null, triangles: this.derniereInfo ? this.derniereInfo.triangles : null,
      geometries: r ? r.info.memory.geometries : 0, textures: r ? r.info.memory.textures : 0,
      octets: { textures: Math.round(tex), geometries: this.octetsGeo, pixi, toile, total: Math.round(tex + this.octetsGeo + pixi + toile) },
      chargement: Object.assign({}, this.chargement), msScript: this.msScript, images: this.compteur.images,
      champ: this.camera ? this.camera.champ : null,
      glyms: this.figures && this.figures.modeles ? this.figures.modeles.stats() : null,
      nuit: this.nuit ? Object.assign({ lucioles: this.nuit.lu ? this.nuit.lu.n : 0 }, this.nuit.compte) : null,
    };
  }
}

Ile3D.vecteurZone = (THREE, z) => {
  const N = Ile3D.SOIR.zones.neutre, v = [], c = new THREE.Color();
  const pris = (cle, i, d) => (z && z[cle] && z[cle][i] != null ? z[cle][i] : N[cle][i] != null ? N[cle][i] : d);
  const coul = cle => { c.set(pris(cle, 0, '#ffffff')); v.push(c.r, c.g, c.b); };
  coul('cle'); v.push(pris('cle', 1, 0), pris('cle', 2, 1));
  coul('hemi'); v.push(pris('hemi', 1, 0), pris('hemi', 2, 1));
  coul('sol'); v.push(pris('sol', 1, 0));
  coul('brume'); v.push(pris('brume', 1, 0), pris('brume', 2, 1));
  coul('lavis'); v.push(pris('lavis', 1, 0));
  coul('bord'); v.push(pris('bord', 1, 0));
  return v;
};
Ile3D.ZONE_FONDU = 1.1;
Ile3D.TOUR_CLAVIER = 1.5;

Ile3D.SOIR = {
  lum: { hemi: ['#a9bde6', '#5c4630', 0.56], cle: ['#ffd9a6', 1.8], chaud: ['#ffb070', 0.16], contre: ['#90a8ff', 0.2] },
  elevation: 34, tour: -150, brume: 0.5, recul: 1.45, horizon: '#f2d6b4', horizonK: 0.35, zenith: '#3f78cc', zenithK: 0.25,
  ombre: { taille: 2048, demi: 34, avance: 0.45, biais: -0.0006, biaisNormal: 0.06 },
  bordures: { pasCarte: 0.45, pasCarteTel: 0.62, bande: [0.05, 0.18], densite: 0.62, pas: 0.5, pasTel: 0.7, epaule: 1.15, trou: 0.2, trouPied: 0.1, grappe: 0.5, taille: [0.85, 1.2], pied: 1.25, max: 3200, maxTel: 900, couleurs: ['#3b7a30', '#5a9a3a', '#93c257'] },
  lointain: {
    commun: {
      pas: 3, pasTel: 4.5, anneaux: [-6, 0.6, 3, 6, 10, 15, 22, 31, 43, 58, 78, 104, 138, 182, 240, 320, 420, 540, 680, 850],
      lissage: 0.7, rond: [40, 240], sousBord: 1.4, levre: 0.35, creux: 3, descente: 70, collines: 5, colline: 60,
      montagnes: 120, pied: [300, 640], champs: 0.56, bois: 0.6, roche: [28, 75], neige: [96, 128], brumeMax: 0.8, loin: 1800,
      lisiere: { pas: 8, pasTel: 11, rangs: [[3.5, 7, 'lisiere'], [10, 17, 'bosquet']], taille: [10, 15], trou: 14, trous: 0.12 },
      bosquets: 120, bosquetsTel: 60, detail: 1, detailCoeur: 1, detailLoin: 0, presBord: 0.92, grain: 0.22,
      percee: [8, 13],
    },
    orsane: { couleurs: { pres: ['#4c7c33', '#66913f'], champs: ['#9a9844', '#b6a351', '#7d983d', '#a2884a'], foret: ['#1d3c20'], roche: ['#7b8090'], neige: ['#e6ebf2'] } },
    kaldum: {
      couleurs: { pres: ['#4a433f', '#5b514a'], champs: ['#3d3431', '#68483a', '#544538'], foret: ['#29231f'], roche: ['#35323b'], neige: ['#7a3424'] },
      arbres: { vert: ['#1c1816', '#3d3530', '#6c5f54'], automne: ['#1c1816', '#3d3530', '#6c5f54'] }, forme: 'rocher', montagnes: 150,
    },
  },
  mer: { abime: '#7a78ab', haut: '#f1c7a6', force: 1, bancs: ['#7b74a0', '#b08fa6', '#e2b393'], sombre: '#3d3e68' },
  camera: { proche: { elevation: 10, leve: 2.4 }, champMin: 13 },
  arbres: {
    formes: { feuillu: 'large', haut: 'haut', conifere: 'haut', tordu: 'petit' },
    facteur: { feuillu: 1.05, haut: 1.0, conifere: 1.0, tordu: 0.8 },
    variantes: 4, detail: 1, detailCoeur: 2, detailCoeurTel: 1,
    palettes: { vert: ['#091a0f', '#1b4020', '#527e2c'], automne: ['#2a1409', '#723914', '#bf862c'] },
    tronc: ['#5a4232', '#2a1d16'],
    masse: 0.62, bosse: 0.2, ecart: 0.12, coeur: 0.6, pli: 0.55,
    feuilles: { frequence: 1.8, relief: 0.55, sombre: 0.72 },
  },
  zones: {
    neutre: { cle: ['#ffffff', 0, 1], hemi: ['#ffffff', 0, 1], sol: ['#000000', 0], brume: ['#ffffff', 0, 1], lavis: ['#808080', 0], bord: ['#000000', 0] },
    ervane_mailles: { cle: ['#ffcf98', 0.25, 1.03], hemi: ['#cfc4d8', 0.15, 1], sol: ['#6b4a2c', 0.2], brume: ['#f0cc98', 0.3, 0.95], lavis: ['#ffb25c', 0.07], bord: ['#3b2412', 0.16] },
    ervane_sources: { cle: ['#fff2d8', 0.3, 1.06], hemi: ['#a6d0ea', 0.3, 0.96], sol: ['#34503a', 0.3], brume: ['#a4d6dc', 0.4, 0.9], lavis: ['#7fe0d0', 0.06], bord: ['#10303a', 0.16] },
    ervane_murets: { cle: ['#fff0d0', 0.3, 1.04], hemi: ['#d0d8e8', 0.25, 1], sol: ['#5e4a30', 0.25], brume: ['#e2d6b4', 0.4, 0.88], lavis: ['#ffe0a0', 0.06], bord: ['#3c2c10', 0.14] },
    ervane_bois: { cle: ['#eef2c0', 0.35, 0.86], hemi: ['#78a094', 0.45, 0.88], sol: ['#1e2a1c', 0.4], brume: ['#6c9a8a', 0.5, 1.3], lavis: ['#2f7a5a', 0.1], bord: ['#06140e', 0.34] },
    ervane_amarre: { cle: ['#ffd2bc', 0.3, 0.96], hemi: ['#aea2d6', 0.4, 1], sol: ['#3a2a40', 0.35], brume: ['#a294c0', 0.45, 1.12], lavis: ['#9a70d0', 0.08], bord: ['#160c26', 0.26] },
    orsane_cimes: { cle: ['#fff0d8', 0.35, 1.04], hemi: ['#c4d4f0', 0.3, 1.1], sol: ['#6a5a48', 0.2], brume: ['#d0dcea', 0.4, 0.85], lavis: ['#fff2d8', 0.06], bord: ['#1a2238', 0.12] },
    orsane_clairieres: { cle: ['#ffe0a0', 0.3, 1.08], hemi: ['#bcd8b0', 0.3, 1.05], sol: ['#4a5a2a', 0.3], brume: ['#c8dca8', 0.4, 0.9], lavis: ['#d8ff70', 0.08], bord: ['#1c2a0c', 0.16] },
    orsane_sentiers: { cle: ['#fff4e6', 0.3, 1], hemi: ['#a8bce0', 0.35, 1], sol: ['#4a4a50', 0.3], brume: ['#a8b8d6', 0.45, 1], lavis: ['#a0c0ff', 0.06], bord: ['#141c30', 0.2] },
    orsane_toiles: { cle: ['#e4d4ee', 0.3, 0.94], hemi: ['#9a94b8', 0.35, 0.96], sol: ['#241c2a', 0.3], brume: ['#8e86a8', 0.45, 1.15], lavis: ['#6a4a90', 0.06], bord: ['#0c0816', 0.28] },
    orsane_eboulis: { cle: ['#ffe2b8', 0.35, 1.02], hemi: ['#c8c0b0', 0.35, 1], sol: ['#5a4a38', 0.3], brume: ['#c8b8a0', 0.45, 1.1], lavis: ['#ffd8a0', 0.07], bord: ['#2a1e12', 0.2] },
    kaldum_ville: { cle: ['#ffb070', 0.45, 0.96], hemi: ['#b09080', 0.45, 0.9], sol: ['#3a1c10', 0.45], brume: ['#a07860', 0.5, 1.15], lavis: ['#ff8a3a', 0.12], bord: ['#1c0804', 0.36] },
    kaldum_galeries: { cle: ['#ffb880', 0.4, 0.82], hemi: ['#8a7a78', 0.5, 0.82], sol: ['#20140e', 0.5], brume: ['#6e605a', 0.55, 1.3], lavis: ['#ff9a50', 0.08], bord: ['#0c0604', 0.46] },
    kaldum_vapeurs: { cle: ['#fff0c8', 0.35, 0.96], hemi: ['#d0c8b0', 0.45, 1.05], sol: ['#4a4436', 0.35], brume: ['#c8c0a8', 0.6, 1.5], lavis: ['#f0e0a0', 0.1], bord: ['#262014', 0.24] },
    kaldum_fonderie: { cle: ['#ff9a60', 0.4, 1], hemi: ['#a07870', 0.4, 0.9], sol: ['#4a1408', 0.4], brume: ['#9a5c48', 0.45, 1.15], lavis: ['#ff6a30', 0.08], bord: ['#200402', 0.36] },
  },
  etalonnage: { vert: [0.15, 0.47], vertTeinte: 0.3, vertVers: 0.45, vertSat: 1.3, vertLum: 0.76, pierreTeinte: 0.09, pierreSat: 0.07, pierreLum: 1.04, terreSat: 1.08, terreLum: 1.05 },
};
