// Le rendu 3D de l'île d'Ervane (docs/ILE-TECHNIQUE.md, section 3) : la toile Three.js posée sous
// #board, le WebGLRenderer, la boucle et son budget, l'activation, la construction de la scène par
// étapes (sous le voile de js/scene.js), la sélection au toucher, les lumières, la brume de la
// région, le ciel (un dégradé CSS derrière une toile transparente), les nuages, la qualité, la
// perte de contexte. Il présente à l'aiguillage le contrat du rendu (5.8) : cellToScreen,
// worldToClient, screenToCell, echelleFigure, camera, stats().
//
// Les pièces : CameraIle (js/ile-camera.js), IlePeinture (js/ile-peinture.js), IleSol
// (js/ile-sol.js), IleDecor (js/ile-decor.js), IleFigures (js/ile-figures.js), IleArene
// (js/ile-arene.js, le combat sur le terrain). Le moteur (World, Plateau, Combat) ne sait rien de
// tout ceci : le rendu lit l'état du monde et du combat à chaque image.
//
// Le support : un point (x, y) que l'interface donne au rendu (cellToScreen, worldToClient,
// echelleFigure, les repères du guide) est un point du plateau (u, v) en exploration ; pendant un
// combat sur le terrain, c'est une case de l'aire (fractions permises), dont le centre est
// (x0 + x + 0,5, y0 + y + 0,5) ; screenToCell rend alors une case de l'aire. Dans une salle de
// donjon (js/ile-salle.js, 6), c'est toujours une case, dont le centre est (x + 0,5, y + 0,5) sur un
// sol plat : la caméra orthographique du combat cadre la salle entière, en combat ou non.
class Ile3D {
  // Un contexte WebGL se crée-t-il ? (La naissance sur Ervane en dépend, 1.4.)
  static disponible() { return typeof IleCharge === 'object' && IleCharge.webgl(); }

  static qualiteParDefaut() {
    let q = null;
    try { q = new URLSearchParams(location.search).get('quality'); } catch (e) { /* rien */ }
    if (q === 'haute' || q === 'moyenne' || q === 'basse') return { q, force: true };
    const coarse = typeof matchMedia === 'function' && matchMedia('(pointer: coarse)').matches;
    const coeurs = (typeof navigator !== 'undefined' && navigator.hardwareConcurrency) || 4;
    // Un appareil faible (IleCharge.faible, 3.28) : la qualité basse d'office.
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
    this.chargement = {};
    this.octetsTex = 0;
    this.octetsGeo = 0;
    this.compteur = { images: 0, lentes: 0 };
    this.temps = 0;
    this.dernier = 0;
    this.marques = {};
    this.directions = new Map();
    this._boucle = now => this.boucle(now);
    // Les animations du combat (5.5) : seul le rendu actif y répond, une fois l'aire ouverte ;
    // sinon la promesse est tout de suite résolue (le rendu des cases, endormi, fait de même).
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

  // ----- La toile et le rendu WebGL -----

  creerRendu() {
    if (this.renderer) return;
    const THREE = window.THREE;
    if (THREE.ColorManagement) THREE.ColorManagement.legacyMode = false;
    const cv = this.canvas = document.createElement('canvas');
    cv.className = 'board-repli board-3d';
    cv.setAttribute('aria-hidden', 'true');
    cv.style.opacity = '0';
    this.stage.insertBefore(cv, this.board);
    // Les voiles de la peinture : glacis, vignette, grain, posés sur la 3D, sous l'interface.
    const voiles = this.voiles = document.createElement('div');
    voiles.className = 'ile-voiles';
    voiles.setAttribute('aria-hidden', 'true');
    voiles.innerHTML = '<div class="ile-voiles__glacis"></div><div class="ile-voiles__vignette"></div><div class="ile-voiles__grain"></div>';
    this.stage.insertBefore(voiles, this.board);
    const r = this.renderer = new THREE.WebGLRenderer({ canvas: cv, antialias: this.qualite === 'haute', alpha: true, powerPreference: 'high-performance', preserveDrawingBuffer: !!this.capture });
    r.outputEncoding = THREE.sRGBEncoding;
    r.setClearColor(0x000000, 0);
    r.info.autoReset = false;
    this.webgl2 = !!r.capabilities.isWebGL2;
    this.appliquerDensite();
    // Une toile retirée (liberer(true)) ne parle plus : son contexte peut encore revenir.
    cv.addEventListener('webglcontextlost', e => { e.preventDefault(); if (cv === this.canvas) this.surPerte(); }, false);
    cv.addEventListener('webglcontextrestored', () => { if (cv === this.canvas) this.surRetour(); }, false);
    const taille = this._taille = () => this.redimensionner();
    if (typeof ResizeObserver === 'function') { this.ro = new ResizeObserver(taille); this.ro.observe(this.stage); }
    addEventListener('resize', taille);
    try { const g = IlePeinture.grain(); voiles.querySelector('.ile-voiles__grain').style.backgroundImage = `url(${g.toDataURL()})`; } catch (e) { /* rien */ }
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
    const w = this.stage.clientWidth, h = this.stage.clientHeight;
    if (!w || !h) return;
    this.renderer.setSize(w, h, false);
    if (this.camera) this.camera.setViewport(w, h);
    if (this.figures) this.figures.matT.uniforms.vue.value.set(w, h);
    // setSize vide la toile : la boucle endormie (carte du monde ouverte) redessine une image.
    if (this.actif && this.dessinEndormi && this.pret) this.image(performance.now());
  }

  // ----- Le Glym modelé par le code (docs/ILE-TECHNIQUE.md, 3.13), derrière son interrupteur -----

  // ?glym=modele (le Glym Aqua), ?glym=tous (les quatre Glyms), ?glym=0 (éteint), sinon
  // DATA.ile.modeleGlym (true, 'modele' ou 'tous'), qu'une copie d'aperçu peut poser. Éteint (le
  // défaut), js/modele-glym.js n'est pas chargé et rien ne change.
  static modeleGlym() {
    let q = null;
    try { q = new URLSearchParams(location.search).get('glym'); } catch (e) { /* rien */ }
    if (q === 'modele' || q === 'tous') return q;
    if (q === '0') return null;
    const d = typeof DATA === 'object' && DATA && DATA.ile && DATA.ile.modeleGlym;
    return d === 'tous' ? 'tous' : d ? 'modele' : null;
  }

  // Charge js/modele-glym.js (à côté de ce script) et donne aux figures leur parc de Glyms
  // modelés. Un échec laisse les panneaux peints : le jeu continue comme interrupteur éteint.
  async modelesGlym(THREE, scene) {
    const mode = Ile3D.modeleGlym();
    if (!mode) return;
    try {
      // Les générateurs (js/modele-glym.js, puis js/modele-lampignon.js et js/modele-lampignard.js), à côté de ce script.
      // (Un `const` de script n'est pas une propriété de window : `present` le teste directement.)
      const charger = (fichier, present) => present() ? Promise.resolve() : new Promise((ok, ko) => {
        let src = 'js/' + fichier;
        try { const ref = document.querySelector('script[src*="ile-3d.js"]'); if (ref && ref.src) src = new URL(fichier, ref.src).href; } catch (e) { /* chemin relatif */ }
        const el = document.createElement('script');
        el.src = src; el.async = true;
        el.onload = () => ok();
        el.onerror = () => ko(new Error('js/' + fichier + ' introuvable'));
        document.head.appendChild(el);
      });
      await charger('modele-glym.js', () => typeof ModeleGlym === 'object');
      if (typeof ModeleGlym !== 'object') throw new Error('ModeleGlym absent');
      // Le Lampignon est un plus : sans lui, le Glym reste modelé et le Lampignon peint.
      await charger('modele-lampignon.js', () => typeof ModeleLampignon === 'object').catch(e => console.warn('Lampignon modelé : ' + e.message));
      // Le Lampignard, son grand frère, reprend ses outils : il vient après lui, et seulement avec lui.
      if (typeof ModeleLampignon === 'object') await charger('modele-lampignard.js', () => typeof ModeleLampignard === 'object').catch(e => console.warn('Lampignard modelé : ' + e.message));
      const parc = new ModeleGlym.Parc(THREE, { telephone: this.telephone, qualite: this.qualite, mode });
      this.figures.modeles = parc;
      scene.add(parc.groupe);
    } catch (e) { console.warn('Glym modelé : ' + e.message); }
  }

  // Le héros modelé (3.27, js/ile-heros.js) à la place du panneau du Veilleur : la classe du
  // personnage si elle a son modèle, ou celle que l'adresse force (IleCharge.heros). Le GLB est lu
  // une fois, le modèle reconstruit pour chaque scène (l'île, une salle). Un échec garde le
  // panneau. Rend vrai si un héros était demandé.
  async chargerHeros(THREE, etape) {
    this.heros = null;
    const classeHeros = IleCharge.heros ? IleCharge.heros() : null;
    if (!classeHeros) return false;
    const classe = classeHeros === 'auto' ? (this.world && this.world.ch && this.world.ch.classId) : classeHeros;
    if (!classe) return false;
    etape('Le héros modelé');
    try {
      await IleCharge.herosScript();
      if (typeof IleHeros === 'object' && IleHeros.FICHIERS[classe]) this.heros = await IleHeros.charger(THREE, null, classe);
    } catch (e) { console.warn('Ervane : héros modelé indisponible', e); this.heros = null; }
    return true;
  }
  // Les figures portent le héros (IleHeros.porteur) : posé à la place du panneau de la figure
  // marquée `heros`, dans le groupe des figures (il suit leur scène).
  porterHeros(THREE) {
    if (this.heros && this.figures && typeof IleHeros === 'object') this.figures.heros = IleHeros.porteur(THREE, this.heros, this.figures.groupe);
  }

  // ----- La construction, par étapes, sous le voile -----

  async preparer(world, etape) {
    const THREE = window.THREE;
    this.world = world;
    const plateau = world.plateau;
    // Une salle d'un donjon dont l'entrée est sur un plateau (6) : une scène à part, plate.
    if (!plateau && typeof Ile === 'object' && Ile.donjon3D(world.mapId)) return this.preparerSalle(world, etape);
    if (!plateau) throw new Error('pas de plateau');
    // Un contexte perdu pendant le sommeil (à Orsane) et jamais rendu : on repart d'une toile neuve
    // plutôt que de construire une île noire sur un contexte mort.
    if (this.renderer && (this.contextePerdu || this.renderer.getContext().isContextLost())) this.liberer(true);
    this.creerRendu();
    if (this.pret && this.plateauId === plateau.id) { this.sauter(); return; }
    if (this.pret) this.liberer();
    IleDecor.init(THREE);
    // L'aperçu de nuit (3.24) : ?ambiance=nuit ou DATA.ile.ambiance ; ses fichiers se chargent à la
    // demande. Un échec laisse le jour : l'île se construit comme avant.
    this.nuit = null;
    // Le style Lisière (3.25) : ?style=lisiere ou DATA.ile.style ; il prend la place de la nuit (il
    // en reprend le décor ajouté et les lucioles) et règle le ciel, la brume et les lumières à
    // l'heure et au temps qu'il fait. Un échec laisse l'île comme avant.
    if (IleCharge.style && IleCharge.style() === 'lisiere') {
      try { await IleCharge.lisiere(); if (typeof IleLisiere === 'object') this.nuit = new IleLisiere.Lisiere(THREE, this); } catch (e) { console.warn('Ervane : style Lisière indisponible', e); this.nuit = null; }
    }
    if (!this.nuit && IleCharge.ambiance && IleCharge.ambiance() === 'nuit') {
      try { await IleCharge.nuit(); if (typeof IleNuit === 'object') this.nuit = new IleNuit.Nuit(THREE, this); } catch (e) { console.warn('Ervane : aperçu de nuit indisponible', e); this.nuit = null; }
    }
    if (this.voiles) this.voiles.classList.toggle('nuit', !!this.nuit);
    const T = this.T = plateau.terrain, def = this.def = plateau.def;
    const temps = this.chargement = { debut: performance.now() };
    let t0 = performance.now();
    const fini = nom => { const t = performance.now(); temps[nom] = Math.round(t - t0); t0 = t; };
    const pause = () => new Promise(ok => { let fait = false; const f = () => { if (!fait) { fait = true; ok(); } }; requestAnimationFrame(f); setTimeout(f, 60); });
    this.octetsTex = 0; this.octetsGeo = 0;
    const tex = this.tex = {};
    const scene = this.scene = new THREE.Scene();

    // Le cache des peintures (2.12, IleCharge.cache) : la clé suit le plateau, son relief et son
    // contenu, la taille des matières et le texte du code qui peint ; une entrée trouvée remplace
    // toutes les peintures sur le processeur.
    const S = this.qualite === 'haute' ? 1024 : 512;
    const prefixe = `ile|${plateau.id}|${S}|`;
    const cleCache = prefixe + T.signature() + '|' + Ile3D.empreintePeinture(def);
    const K = await IleCharge.cache.lire(cleCache);
    const garde = { toiles: {}, donnees: {} };
    let neuf = false;
    this.chargement.cache = !!K;
    // Une toile peinte (ou relue : ses pixels reposés sur une toile neuve).
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
    // Des données calculées (tableaux typés), relues telles quelles.
    const calcul = (nom, faire, valide) => {
      const e = K && K.donnees && K.donnees[nom];
      const v = e && (!valide || valide(e)) ? e : (neuf = true, faire());
      garde.donnees[nom] = v;
      return v;
    };

    // 1. Les matières, peintes (512 px, 1 024 en qualité haute), en une DataArrayTexture.
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
    // Les moyennes, linéaires (le shader les mélange comme les texels décodés).
    const lin = v => (v <= 0.04045 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4));
    this.moyennes = MAT.moy.map(c => c.map(lin));
    fini('matieres');

    // 2. Les cartes de toute l'île : poids et ombres, teinte, lueur, eau.
    etape('Les cartes de l\'île');
    await pause();
    const cartes = calcul('cartes', () => IlePeinture.cartes(T, this.peindreOmbresDecor(T)));
    // Sans WebGL2 (10.3), une texture dont un côté n'est pas une puissance de 2 n'a ni mipmaps ni
    // répétition : Three agrandirait les toiles, mais pas les données (la texture serait noire).
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
    // La trame claire du détail : elle module les couleurs des sommets sans les assombrir.
    tex.touches = toileTex(toile('touches', () => IlePeinture.trame(8, 0.35)), true, true);
    tex.feuilles = toileTex(toile('feuilles', () => IlePeinture.trame(9, 0.7)), true, true);
    tex.falaise = toileTex(toile('falaise', () => IlePeinture.falaise()), true, true);
    // Une seule fois sur la hauteur (la mousse de la lèvre en haut) ; répétée en largeur.
    tex.falaise.wrapT = THREE.ClampToEdgeWrapping;
    tex.banc = toileTex(toile('banc', () => IlePeinture.bancNuages(this.qualite === 'haute' ? 1024 : 512)), true, true);
    tex.nuages = [1, 2, 3].map(g => toileTex(toile('nuage' + g, () => IlePeinture.nuage(g)), true));
    tex.halo = toileTex(toile('halo', () => IlePeinture.halo()), true);
    tex.chute = toileTex(toile('chute', () => IlePeinture.chute()), true, true);
    tex.touchesLin = toileTex(toile('touchesLin', () => IlePeinture.touches(8, 0.35)), false, true);
    fini('cartes');

    // 3. Les matériaux, les lumières, la brume.
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
    // Les fils blancs du Bois, les corolles, les lanternes : en combat, ce qui survole l'aire s'efface
    // (revue finale : un fil tendu entre deux troncs traversait le plateau de combat).
    this.fonduHouppiers(THREE, mats.lueur, 'lueur');
    // Le fil d'or du Métier (80 u de haut), le brin de l'amarre, le fil de la Nacelle : vus par la
    // caméra orthographique du combat, ils barraient l'écran d'une ligne dorée ; en combat, seule la
    // part qui est à moins de 4 u de l'aire reste (le fil du Puits dans son propre combat).
    this.clipAire(THREE, mats.dessousLueur);
    brume(mats.falaise, -4, -30, '#7d8aa6');
    brume(mats.dessous, -14, -60, '#7d8aa6');
    brume(mats.dessousAcc, -8, -40, '#7d8aa6');
    brume(mats.dessousLueur, -10, -60, '#7d8aa6');
    this.lumieres(scene);
    scene.fog = this.nuit && this.nuit.brouillard ? this.nuit.brouillard() : new THREE.Fog(this.nuit ? this.nuit.brume('#a9c3d6') : new THREE.Color('#a9c3d6'), 60, 150);
    this.brumeVoulue = scene.fog.color.clone();
    fini('materiaux');

    // 4. Le sol : les tuiles de relief.
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
    // Ce que la vue tactique du combat cache, en plus du décor des morceaux : faces, falaise,
    // dessous, fils, puits, chute, nuages, halos.
    const fixe = this.decorFixe = [];
    const esc = IleDecor.escarpements(prepSol.faces);
    if (esc) { const m = new THREE.Mesh(esc, mats.escarpement); m.matrixAutoUpdate = false; scene.add(m); fixe.push(m); this.meshEscarpement = m; this.octetsGeo += Ile3D.octetsGeo(esc); }
    fini('sol');

    // 5. Le décor, fusionné par tuile.
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
    // La nuit : les touffes des modèles libres, refaites autour du point visé comme l'herbe.
    this.touffesNuit = this.nuit ? this.nuit.preparerTouffes(rampe) : null;
    fini('decor');

    // 6. L'eau, la falaise du bord, le dessous, la chute, les fils, les nuages, les halos.
    etape('Les eaux et les nuages');
    await pause();
    const geoEau = IleDecor.eau(T);
    if (geoEau) { this.eau = new THREE.Mesh(geoEau, this.matEau(THREE)); this.eau.renderOrder = 2; this.eau.matrixAutoUpdate = false; scene.add(this.eau); this.octetsGeo += Ile3D.octetsGeo(geoEau); }
    const fb = IleDecor.falaiseBord(T, this.telephone);
    { const m = new THREE.Mesh(fb.geo, mats.falaise); m.matrixAutoUpdate = false; scene.add(m); fixe.push(m); this.meshFalaise = m; this.octetsGeo += Ile3D.octetsGeo(fb.geo); }
    const ds = IleDecor.dessous(T, L, fb.suspendus, this.telephone);
    for (const [k, mat] of [['roche', mats.dessous], ['acc', mats.dessousAcc], ['lueur', mats.dessousLueur]]) if (ds[k]) { const m = new THREE.Mesh(ds[k], mat); m.matrixAutoUpdate = false; scene.add(m); fixe.push(m); this.octetsGeo += Ile3D.octetsGeo(ds[k]); }
    // Les fils et le puits : une seule géométrie lumineuse.
    const fils = IleDecor.fusion((this.decorGlobal = this.decorGlobalItems(D)).lueur);
    if (fils) { const m = new THREE.Mesh(fils, mats.dessousLueur); m.matrixAutoUpdate = false; scene.add(m); fixe.push(m); this.octetsGeo += Ile3D.octetsGeo(fils); }
    if (D.puits) this.puits(THREE, scene, D.puits);
    const ch = (def.eaux || []).find(e => e.sorte === 'chute');
    // Le voile part du point où le ru quitte la terre ferme, pas du point déclaré s'il est dans le
    // vide (le Ru Clair est tracé jusqu'à 24 u au large, revue finale).
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
    // Le monde modelé dans Blender (tools/blender/monde, assets/monde/ervane.glb) à la place du sol
    // et du décor dessinés par le code : ?monde=glb ou DATA.ile.monde. Un échec laisse l'île comme
    // avant.
    if (IleCharge.monde && IleCharge.monde() === 'glb') {
      etape('Le monde modelé');
      await pause();
      try { await IleCharge.glb(); if (typeof IleGlb === 'object') await IleGlb.poser(THREE, this, scene); } catch (e) { console.warn('Ervane : monde modelé indisponible', e); }
    }
    // Le héros modelé (js/ile-heros.js) à la place du panneau du Veilleur.
    if (await this.chargerHeros(THREE, etape)) fini('heros');

    // 7. Les figures et les marques.
    etape('Les Veilleurs et les monstres');
    await pause();
    this.figures = new IleFigures.Figures(THREE, { painter: this.painter, telephone: this.telephone, scene });
    scene.add(this.figures.groupe);
    this.porterHeros(THREE);
    await this.modelesGlym(THREE, scene);
    // L'arène du combat (js/ile-arene.js) : la texture de ses cases va au shader du sol.
    this.arene = new IleArene.Arene(THREE, this);
    if (this.uFondu) this.uFondu.cases.value = this.arene.texCases;
    scene.add(this.arene.groupe);
    mats.uSol.etatCases.value = this.arene.texCases;
    this.marques3D(THREE, scene);
    if (this.nuit) { this.nuit.materiaux(); this.nuit.lucioles(scene); if (this.nuit.ciel3D) this.nuit.ciel3D(scene); }
    const cam = this.camera = new CameraIle({ el: this.board, def, terrain: T, style: this.nuit && this.nuit.styleCamera ? this.nuit.styleCamera() : null });
    this.redimensionner();
    const p = world.player;
    cam.sauter(p.rx, p.ry, this.hauteur(p.rx, p.ry));
    // Les figures connues se peignent avant le premier envoi de l'atlas.
    this.figures.maj(this.sprites(performance.now()), cam, performance.now());
    this.vus = new WeakSet(); this.caches = new Map();
    fini('figures');

    // 8. L'envoi des textures et la compilation des shaders, puis la première image.
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
    // Ce qui a été peint part dans le cache, après la première image (sans l'attendre).
    if (neuf) IleCharge.cache.ecrire(cleCache, garde, prefixe).then(ok => { this.chargement.cacheEcrit = ok; });
  }

  // Une texture d'une toile peinte : sans retournement, sRGB pour une couleur, répétée ou non.
  // Sans WebGL2, une toile dont un côté n'est pas une puissance de 2 n'a ni mipmaps ni répétition.
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

  // La rampe du modelé en aplats (MeshToonMaterial) : ombre à 42 %, lumière pleine, une marche douce.
  static rampe(THREE) {
    const N = 128, d = new Uint8Array(N * 4);
    for (let i = 0; i < N; i++) { const t = i / (N - 1), s = Math.max(0, Math.min(1, (t - 0.4) / 0.22)), v = Math.round(255 * (0.42 + 0.58 * s * s * (3 - 2 * s))); d[i * 4] = d[i * 4 + 1] = d[i * 4 + 2] = v; d[i * 4 + 3] = 255; }
    const t = new THREE.DataTexture(d, N, 1, THREE.RGBAFormat); t.minFilter = t.magFilter = THREE.LinearFilter; t.generateMipmaps = false; t.needsUpdate = true;
    return t;
  }

  // ----- Une salle de donjon (js/ile-salle.js, 6) -----

  // La salle courante du monde (une carte « donjon#n » dont l'entrée est sur un plateau) : une
  // scène plate, construite en quelques dizaines de millisecondes, sans cache. L'île, si elle était
  // construite, est rendue d'abord (au téléphone, les deux ne tiennent pas) : le retour sur le
  // plateau la refait depuis les caches (Ile.terrain, les peintures).
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
    tex.paroi = this.textureToile(IlePeinture.paroi(), true, true);
    tex.nuages = [1, 2, 3].map(g => this.textureToile(IlePeinture.nuage(g), true));
    tex.sol = this.textureToile(IleSalle.peindreSol(layout, style, this.qualite === 'haute' ? 1024 : 512), true, false);
    const rampe = this.rampe = Ile3D.rampe(THREE);
    const scene = this.scene = new THREE.Scene();
    const sol = IleSol.materiauSalle(THREE, tex.sol, rampe);
    const toon = o => new THREE.MeshToonMaterial(Object.assign({ gradientMap: rampe }, o));
    // Les murs, blocs, piliers et racines portent les strates du calcaire (IlePeinture.paroi).
    const mats = this.mats = { sol: sol.sol, uSol: sol.uniforms, roche: toon({ vertexColors: true, map: tex.paroi }), lueur: new THREE.MeshBasicMaterial({ vertexColors: true }) };
    // Les blocs et les piliers deviennent des fantômes là où ils cachent une case de sol de l'aire.
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
    // La brume de la salle : la couleur du style, mais sombre ; derrière la toile, un dégradé radial
    // (clair au milieu, sombre aux coins) plutôt qu'un aplat : la salle se détache dans la profondeur
    // du puits.
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
    // Le héros modelé descend dans la salle (3.27) : le GLB lu une fois, reconstruit pour sa scène.
    await this.chargerHeros(THREE, etape);
    this.porterHeros(THREE);
    this.arene = new IleArene.Arene(THREE, this);
    if (this.uFondu) this.uFondu.cases.value = this.arene.texCases;
    scene.add(this.arene.groupe);
    mats.uSol.etatCases.value = this.arene.texCases;
    this.marques3D(THREE, scene);
    this.salle = { id: mapId, map: world.map, aire: S.aire, style, index };
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

  // Une salle : une lueur froide et basse, un jour pâle du fond, le contre-jour de la lanterne, une
  // lumière ponctuelle par lanterne (quatre au plus), et celle, plus vive, qui va à la lanterne la
  // plus proche du Veilleur.
  lumieresSalle(scene, style, lanternes) {
    const THREE = window.THREE;
    const hemi = new THREE.HemisphereLight(new THREE.Color('#5d5a80'), new THREE.Color('#1c1826'), 0.55);
    const cle = new THREE.DirectionalLight(new THREE.Color('#cfc6e4'), 0.38); cle.position.set(-30, 60, -20);
    const contre = new THREE.DirectionalLight(new THREE.Color(style.lumiere), 0.14); contre.position.set(40, 30, 50);
    this.ponctuelle = new THREE.PointLight(new THREE.Color(style.lumiere), 0, 13, 1.6);
    scene.add(hemi, cle, contre, this.ponctuelle);
    for (const l of (lanternes || []).slice(0, 4)) {
      const p = new THREE.PointLight(new THREE.Color(style.lumiere), 1.1, 8.5, 1.5);
      p.position.set(l.x, l.y + 0.3, l.z);
      scene.add(p);
    }
  }

  // La brume d'une salle : des bouffées de nuage posées autour, basses, en mélange ordinaire (un
  // voile, pas une lumière), une seule géométrie instanciée.
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

  // L'image d'une salle : la caméra du combat cadre la salle, l'aire s'y ouvre et s'y ferme, les
  // blocs deviennent fantômes devant les cases qu'ils cachent, la lanterne proche s'allume.
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

  // L'empreinte du code qui peint et du contenu qu'il lit (la clé du cache des peintures) : le
  // texte entier de la fabrique d'IlePeinture, les outils de bruit, les ombres du décor ; les
  // régions, sols et eaux du plateau. Le code ne change pas pendant la page : gardée.
  static empreintePeinture(def) {
    const M = IleTerrain.M;
    if (!Ile3D._codePeinture) {
      const outils = Object.values(M).filter(f => typeof f === 'function').map(String).join('|');
      const fab = typeof fabriqueIlePeinture === 'function' ? String(fabriqueIlePeinture) : Object.values(IlePeinture).map(String).join('|');
      Ile3D._codePeinture = M.cle(fab + '|' + outils + '|' + String(Ile3D.prototype.peindreOmbresDecor)).toString(16);
    }
    // Les plans des aires : leurs obstacles portent des ombres peintes.
    const plans = [];
    for (const c of IleTerrain.cartesDe(def.id)) for (const g of c.groups || []) if (g.aire && g.aire.layout) plans.push(g.aire.x + ',' + g.aire.y + ':' + g.aire.layout.join(''));
    return Ile3D._codePeinture + '-' + M.cle(JSON.stringify({ r: def.regions || null, s: def.sols || null, e: def.eaux || null, a: def.accents || null, l: def.lieux || null, p: plans })).toString(16);
  }

  // Les ombres de contact du décor, peintes sur une toile de 480 × 360 (2 texels par u), vers l'est :
  // la lumière vient du haut à gauche de l'écran.
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
    // Les obstacles des aires cuites (rochers, bornes, souches, bouts de muret).
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

  // Les fils (d'or, du Métier) et les liens lumineux posés par le décor, en une seule géométrie.
  decorGlobalItems(D) { return { lueur: (D.global || []).slice() }; }

  lumieres(scene) {
    const THREE = window.THREE;
    // Le ciel bleu dessus, un rebond chaud dessous ; le soleil (blanc chaud) de l'ouest à 50° ; un
    // reflet chaud de face, un contre-jour froid à peine.
    const hemi = new THREE.HemisphereLight(new THREE.Color('#c6d4ef'), new THREE.Color('#544b3c'), 0.62);
    const L = IlePeinture.LUMIERE, el = 50 * Math.PI / 180;
    const cle = new THREE.DirectionalLight(new THREE.Color('#fff2df'), 1.28);
    cle.position.set(L.x * Math.cos(el) * 100, Math.sin(el) * 100, L.y * Math.cos(el) * 100);
    const chaud = new THREE.DirectionalLight(new THREE.Color('#ffd2a0'), 0.22); chaud.position.set(60, 35, 70);
    const contre = new THREE.DirectionalLight(new THREE.Color('#9fb4ff'), 0.14); contre.position.set(10, 30, -90);
    this.ponctuelle = new THREE.PointLight(new THREE.Color('#ffb347'), 0, 13, 2);
    scene.add(hemi, cle, chaud, contre, this.ponctuelle);
    this.lum = { hemi, cle, chaud, contre, ponctuelle: this.ponctuelle };
    if (this.nuit) this.nuit.lumieres(scene, this.lum);
  }

  // Les houppiers entre la caméra et le Veilleur s'effacent en trame (un cylindre de 3,2 u autour
  // de la ligne de vue, au-dessus de sa tête) : sous les grands arbres du Bois, on voit encore le
  // Veilleur, le chemin et les monstres. La trame de Bayer 8 × 8 (plus fine qu'en 4 × 4, un bord
  // doux de 1,8 à 3,2 u) n'a besoin ni de tri ni de mélange.
  //
  // En combat (5.4), tout ce qui cache une part de l'aire (frondaisons, troncs, toiles) s'efface :
  // le point du fragment, ramené le long de la vue jusqu'à la hauteur de l'aire, tombe dans le
  // carré (agrandi de 4 u devant, vers la caméra, pour emporter le pied des troncs).
  //
  // Les obstacles de l'aire elle-même (bornes, souches, rochers, bouts de muret : `roche` et `acc`
  // dont le fragment est dans le carré) suivent une autre règle, depuis la revue de l'étape b : vus à
  // 30°, une borne de 1,8 u ou une souche de 1,5 u couvraient une à deux cases derrière elles, et
  // le joueur ne voyait pas où il posait le doigt. Un fragment d'obstacle devient un fantôme (une
  // trame à 36 %) là où le point qu'il cache, ramené le long de la caméra du combat au sol (la
  // hauteur de la case lue dans la texture des cases, en trois passes), tombe sur une case de sol
  // de l'aire (genre 0) autre que la sienne ; son pied et ce qui ne couvre que sa propre case ou
  // une autre case d'obstacle restent pleins : l'obstacle se lit toujours comme un bloc.
  //
  // Les pièces lumineuses (`lueur` : fils blancs du Bois, corolles, lanternes) suivent la seule règle
  // du dehors, dedans comme dehors : un fragment à plus de 0,35 u au-dessus du plan de l'aire, dont le
  // point ramené au sol tombe dans le carré, s'efface. Un fil tendu au-dessus des cases ne se lit
  // plus comme un trait de sélection.
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

  // En combat, un matériau ainsi marqué ne garde que les fragments dont le pied (x, z) est à moins de
  // 4 u du carré de l'aire : les grands fils lumineux (le fil d'or du Métier monte à 80 u, celui de
  // la Nacelle descend à 150 u) ne barrent plus l'écran de la caméra orthographique. Hors combat,
  // rien ne change (fonduAire.z < fonduAire.x).
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

  // Les herbes : des lames opaques, balancées par le vertex shader et écartées autour du Veilleur.
  matHerbe(THREE, rampe) {
    if (this._matHerbe) return this._matHerbe;
    const m = new THREE.MeshToonMaterial({ gradientMap: rampe, vertexColors: true });
    this.uHerbe = { temps: { value: 0 }, joueur: { value: new THREE.Vector3() } };
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
    m.customProgramCacheKey = () => 'ile-herbe';
    this._matHerbe = m;
    return m;
  }

  // L'herbe proche : les touffes du semis et d'autres, posées sur l'herbe, la lande et le sous-bois
  // (d'après la carte des matières), hors de l'eau et des obstacles ; une seule InstancedMesh, refaite
  // autour du point visé quand il s'éloigne (le travail de fond de 3.9), qui s'efface au bord de son
  // rayon. Les candidates sont rangées une fois dans une grille de 8 u.
  preparerHerbe(THREE, D, cartes, L, rampe) {
    const T = this.T, def = this.def, tel = this.telephone;
    const pas = this.qualite === 'haute' ? 1.0 : this.qualite === 'basse' ? 1.7 : tel ? 1.45 : 1.2;
    const k = cartes.k, W = cartes.w, Hc = cartes.h, P1 = cartes.poids1, P2 = cartes.poids2;
    const palettes = (def.regions || []).map(r => r.palette || {});
    const nav = this.world && this.world.plateau && this.world.plateau.nav;
    const IM = IleTerrain.M, R = IM.hasard(IM.cle('herbe-proche'));
    const mats = [], cols = [];
    // Les touffes du semis (le contenu), puis celles du rendu.
    for (const t of D.tuiles) for (const h of t.herbes) { for (let q = 0; q < 16; q++) mats.push(h.m.elements[q]); cols.push(h.c[0], h.c[1], h.c[2]); }
    const m4 = new THREE.Matrix4(), qu = new THREE.Quaternion(), eu = new THREE.Euler(0, 0, 0, 'YXZ'), po = new THREE.Vector3(), sc = new THREE.Vector3();
    const C = new THREE.Color(), C2 = new THREE.Color();
    for (let v = pas / 2; v < T.hauteur; v += pas) for (let u = pas / 2; u < T.largeur; u += pas) {
      const x = u + (R() - 0.5) * pas * 0.9, z = v + (R() - 0.5) * pas * 0.9, tirage = R();
      const i = Math.floor(x * k), j = Math.floor(z * k);
      if (i < 0 || j < 0 || i >= W || j >= Hc) continue;
      const o = (j * W + i) * 4;
      const herbe = P1[o] / 255, lande = P1[o + 1] / 255, sousBois = P2[o + 1] / 255, vert = herbe + lande + sousBois;
      // En touffes groupées par places (un bruit de 7 u), pas en semis régulier.
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
    // Les fleurs des prés : de petits bouquets de corolles, par places, surtout aux Sources (leurs
    // quatre couleurs au Confluent), plus rares ailleurs ; la même mécanique que l'herbe.
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

  // Une InstancedMesh refaite autour du point visé : les matrices et couleurs de toutes les
  // candidates, rangées par cellules de 8 u (un tri par dénombrement).
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

  // Refait l'herbe et les fleurs proches autour de (x, y) si le point visé s'est éloigné de plus de
  // 3 u, ou si le champ a changé de rayon. Ce qui est au bord rapetisse jusqu'à disparaître.
  majHerbe(x, y) {
    const r0 = Math.min(this.telephone ? 20 : 30, this.camera.champ * (this.telephone ? 0.72 : 0.85));
    const rayon = this.qualite === 'basse' ? r0 * 0.75 : r0;
    for (const H of [this.herbe, this.fleurs, this.touffesNuit]) if (H) this.majSemis(H, x, y, rayon);
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

  // L'eau : la nappe translucide du prototype, ses touches qui dérivent, l'écume aux rives, lue sur
  // la carte de profondeur de toute l'île.
  matEau(THREE) {
    const m = new THREE.ShaderMaterial({
      uniforms: THREE.UniformsUtils.merge([THREE.UniformsLib.fog, {
        temps: { value: 0 }, plan: { value: this.tex.eau }, touches: { value: this.tex.touchesLin }, bord: { value: this.tex.poids2 }, tailleIle: { value: new THREE.Vector2(this.T.largeur, this.T.hauteur) },
        profonde: { value: new THREE.Color('#24566a') }, claire: { value: new THREE.Color('#4f9c9e') }, ecume: { value: new THREE.Color('#eef8f4') }, anime: { value: this.qualite === 'basse' ? 0 : 1 },
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
    // UniformsUtils.merge clone les textures : on pose les originales après, pour que liberer()
    // les rende vraiment (un clone gardé tiendrait la texture sur la carte graphique).
    m.uniforms.plan.value = this.tex.eau;
    m.uniforms.touches.value = this.tex.touchesLin;
    m.uniforms.bord.value = this.tex.poids2;
    this.matEauRef = m;
    return m;
  }

  // Le puits de l'Amarre (revue finale : plus un disque de noir absolu) : une paroi intérieure en
  // strates de calcaire (la texture de la falaise, six fois autour, de la lèvre moussue au fond) qui
  // s'assombrit sur 8 u puis se perd dans un violet sombre ; un fond en dégradé radial (violet au
  // centre, jamais noir) ; la lueur qui monte vient des halos posés par le décor (js/ile-decor.js).
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
    // Le fond : un disque dont les couleurs des sommets vont du violet (au centre) à l'ombre (au bord).
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

  // La mer de nuages : trois bancs (des plans répétés, plus bas, plus gris, plus sombres) et des
  // bouffées qui dérivent autour de l'île.
  nuages(THREE, scene) {
    const R = IleTerrain.M.hasard(123), T = this.T;
    const cx = T.largeur / 2, cz = T.hauteur / 2;
    this.bancs = [];
    // Les bancs, sans la brume du lointain (elle les noierait dans sa couleur) : la mer de nuages
    // reste lisible sous l'île, plus sombre et plus bleue en profondeur.
    // Une répétition de la texture tous les 70 à 110 u : des moutons de nuages lisibles de haut.
    // Revue finale : la mer de nuages se lisait comme une plaque grise. Les bancs sont moins opaques
    // (on voit celui du dessous), et leurs sommets portent un dégradé de profondeur : sombre et bleu
    // sous l'île (à l'ombre), clair vers l'horizon.
    const bancs = this.qualite === 'basse' ? [[-30, 8, '#aab3c6', 0.9]] : [[-46, 13, '#8e98b0', 0.95], [-34, 10, '#a7b0c4', 0.78], [-24, 7, '#c3cad8', 0.62]];
    const sombre = new THREE.Color('#4f5a78'), cTmp = new THREE.Color();
    for (const [y, rep, teinte, op] of bancs) {
      const t = this.tex.banc.clone(); t.needsUpdate = true; t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(rep * 2, rep * 2); t.offset.set(R(), R());
      const g = new THREE.PlaneGeometry(1400, 1400, 28, 28), P = g.attributes.position, col = new Float32Array(P.count * 3);
      for (let i = 0; i < P.count; i++) {
        // Le plan est couché ensuite (rotation x) : son y devient -z.
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
    // Les bouffées : des panneaux face à la caméra, une seule géométrie instanciée ; elles tournent
    // lentement autour de l'île (le vertex shader les place, rien à faire par image).
    const nLarge = this.qualite === 'basse' ? 8 : this.telephone ? 16 : 26;
    // Des bouffées posées (sans orbite) sous le bord de l'île et dans l'Échancrure : le vide y prend
    // du volume au lieu d'une plaque (revue finale). Hors du large, à 5 à 14 u de la lèvre.
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
      // Le vertex shader place une bouffée par son orbite (angle, distance, le z étiré de 0,8) :
      // une bouffée posée est une orbite immobile qui passe par son point.
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
    if (this.decorFixe) this.decorFixe.push(mesh);
  }

  // Les halos : des quads additifs tournés vers la caméra, une seule InstancedMesh.
  halos(THREE, scene, liste) {
    const n = liste.length;
    if (!n) return;
    const geo = new THREE.InstancedBufferGeometry();
    const q = new THREE.PlaneGeometry(1, 1);
    geo.index = q.index; geo.attributes.position = q.attributes.position; geo.attributes.uv = q.attributes.uv;
    // Par halo : le centre, la couleur et la taille, l'opacité et la phase du scintillement.
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

  // La marque de destination, le chemin, le survol, le repère du guide.
  marques3D(THREE, scene) {
    const anneau = new THREE.RingGeometry(0.55, 0.78, 32).rotateX(-Math.PI / 2);
    const mk = (couleur, op) => new THREE.MeshBasicMaterial({ color: new THREE.Color(couleur), transparent: true, opacity: op, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -3, polygonOffsetUnits: -6, fog: false });
    this.marque = new THREE.Mesh(anneau, mk('#ffe9a8', 0.9)); this.marque.visible = false; this.marque.renderOrder = 6;
    this.survol = new THREE.Mesh(anneau, mk('#8fe9ff', 0.75)); this.survol.visible = false; this.survol.renderOrder = 6;
    this.repere = new THREE.Mesh(new THREE.RingGeometry(0.7, 1.0, 40).rotateX(-Math.PI / 2), mk('#00c2ff', 0.8)); this.repere.visible = false; this.repere.renderOrder = 6;
    const pt = new THREE.CircleGeometry(0.09, 8).rotateX(-Math.PI / 2);
    this.points = new THREE.InstancedMesh(pt, mk('#ffffff', 0.75), 48); this.points.count = 0; this.points.frustumCulled = false; this.points.renderOrder = 6;
    // Les marques du guide le long d'un chemin (js/guide.js, repère `chemin` ; « Montrer le chemin »
    // du journal des quêtes, js/hud-quetes.js) : assez larges pour se voir sur les pavés clairs.
    this.traces = new THREE.InstancedMesh(new THREE.RingGeometry(0.2, 0.36, 16).rotateX(-Math.PI / 2), mk('#00c2ff', 0.92), 48); this.traces.count = 0; this.traces.frustumCulled = false; this.traces.renderOrder = 6;
    scene.add(this.marque, this.survol, this.repere, this.points, this.traces);
  }

  static octetsGeo(g) {
    let n = 0;
    for (const k in g.attributes) n += g.attributes[k].array.byteLength;
    if (g.index) n += g.index.array.byteLength;
    return n;
  }

  // ----- L'activation -----

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
    this.actif = false;
    cancelAnimationFrame(this.raf);
    if (this.arene) this.arene.finirAnimations();
    if (this.canvas) this.canvas.style.opacity = '0';
    if (this.voiles) this.voiles.classList.remove('on');
    if (this.camera) this.camera.muette = true;
  }

  // Rend les géométries et les textures ; le contexte reste (un retour par la Nacelle). `total` :
  // après la descente, tout part, contexte compris. Les références de la construction (décor,
  // relief, terrain, matériaux gardés) partent aussi : rien de l'île ne reste en mémoire à Orsane.
  liberer(total) {
    this.desactiver();
    const rendre = t => { if (t && t.isTexture) t.dispose(); };
    if (this.scene) {
      this.scene.traverse(o => {
        if (o.geometry) o.geometry.dispose();
        const mats = Array.isArray(o.material) ? o.material : o.material ? [o.material] : [];
        for (const m of mats) {
          rendre(m.map);
          // Les textures des uniforms (ShaderMaterial), clones compris.
          if (m.uniforms) for (const u of Object.values(m.uniforms)) rendre(u && u.value);
          m.dispose();
        }
      });
    }
    for (const t of Object.values(this.tex || {})) { if (Array.isArray(t)) t.forEach(rendre); else rendre(t); }
    if (this.figures) this.figures.liberer();
    this.heros = null;
    if (this.arene) { this.arene.liberer(); this.arene = null; }
    if (this.rampe) this.rampe.dispose();
    if (this.mats) for (const m of Object.values(this.mats)) if (m && m.isMaterial) m.dispose();
    this._matHerbe = null; this.herbe = null; this.fleurs = null; this.touffesNuit = null; this.nuit = null; this.lum = null;
    this.scene = null; this.figures = null; this.tex = {}; this.pret = false; this.plateauId = null;
    this.tuilesSol = []; this.tuilesDecor = [];
    this.decor = null; this.prepSol = null; this.T = null; this.def = null; this.cibles = null; this.lanternes = null;
    this.bancs = null; this.eau = null; this.bouffees = null; this.decorGlobal = null; this.moyennes = null; this.rampe = null; this.mats = null;
    this.matEauRef = null; this.matChute = null; this.matHalos = null; this.matBouffees = null;
    this.uFondu = null; this.uHerbe = null; this.ponctuelle = null; this.decorFixe = null;
    this.meshEscarpement = null; this.meshFalaise = null; this.meshChute = null;
    this.marque = null; this.survol = null; this.repere = null; this.points = null; this.traces = null;
    this.salle = null;
    this.directions.clear();
    if (this.camera) this.camera.terrain = null;
    this.marques = {}; this.marquesA = 0; this.brumeCle = null; this.cielHex = null;
    this.vus = null; this.caches = null;
    if (total && this.renderer) {
      this.renderer.dispose();
      // Un contexte déjà perdu ne se perd pas deux fois (l'extension le signalerait).
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

  // Le contexte WebGL perdu (fréquent au téléphone quand l'application passe en arrière-plan) : la
  // boucle s'arrête, le voile « Ervane se recoud... » ; sans retour en 5 s, le voile de repli.
  // Endormi (le joueur est à Orsane), rien ne s'affiche : on le note, et un retour sur l'île
  // repartira d'une toile neuve si le contexte n'est pas revenu d'ici là.
  surPerte() {
    const sc = this.sceneAiguillage;
    const enJeu = this.actif || !!(sc && (sc.en3D || sc.voulu));
    this.desactiver();
    this.pret = false;
    this.contextePerdu = true;
    clearTimeout(this.minuteriePerte);
    if (!enJeu || !sc) return;
    sc.perte('Ervane se recoud...');
    this.minuteriePerte = setTimeout(() => { if (sc.en3D || sc.voulu) sc.repli(); }, 5000);
  }
  surRetour() {
    clearTimeout(this.minuteriePerte);
    this.contextePerdu = false;
    try { this.liberer(); } catch (e) { /* le contexte neuf n'a plus rien */ }
    const sc = this.sceneAiguillage;
    if (sc) sc.retour();
  }

  // ----- Le contrat du rendu -----

  hauteur(x, y) {
    const T = this.T;
    if (!T) return 0;
    const h = T.marcheA(x, y);
    return Number.isFinite(h) ? h : T.solBrutA(x, y);
  }
  // La normale du sol : celle du terrain ; verticale dans une salle.
  normale(x, y) { return this.T ? this.T.normaleA(x, y) : [0, 1, 0]; }
  // Le support courant : l'aire pendant un combat sur le terrain, la salle (des cases), le plateau sinon.
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
    return this.camera.pixelsParU(p.u, this.hauteur(p.u, p.v), p.v) * IleFigures.PX;
  }
  sauter() {
    if (!this.camera || !this.world) return;
    // Dans une salle, la caméra du combat cadre la salle entière, tout de suite.
    if (this.salle) { const q = this.versScene(this.world.player.rx, this.world.player.ry); this.camera.joueur = { x: q.u, y: q.v, h: 0 }; this.camera.entrerCombat(this.salle.aire, true); return; }
    const p = this.world.player;
    this.camera.sauter(p.rx, p.ry, this.hauteur(p.rx, p.ry));
  }

  // La sélection (3.10) : les figures (rectangles de la dernière image, agrandis à 44 px au doigt),
  // les objets qui agissent (relais, porte, panneaux), puis le sol (le rayon marche sur la hauteur
  // de marche par pas de 0,5 u, puis une dichotomie). Rend { x, y, cible } en u, ou null.
  screenToCell(cx, cy) {
    if (!this.camera || !this.figures) return null;
    const cam = this.camera, s = cam.clientToScreen(cx, cy);
    const doigt = typeof matchMedia === 'function' && matchMedia('(pointer: coarse)').matches;
    // En combat : la case de l'aire sous le doigt, par la seule géométrie du sol, comme le rendu des
    // cases (Grid.fromScreen), ou null hors de la grille (3.10). Les panneaux des combattants ne
    // captent pas le toucher : un panneau couvre la case ou les cases derrière lui (une case de
    // départ, un pas, les pieds d'un monstre qui se tient là), et la confirmation au doigt montre de
    // toute façon la case visée.
    if (this.enArene) {
      const sol = this.rayonSol(s.x, s.y) || cam.ecranVersPlan(s.x, s.y);
      const c = this.arene.caseSous(sol.x, sol.y);
      return this.combat && this.combat.map && Grid.inBounds(this.combat.map, c.x, c.y) ? c : null;
    }
    // Dans une salle, hors combat : la case du sol plat sous le doigt (le monde y voit le groupe).
    if (this.salle) {
      const sol = cam.ecranVersPlan(s.x, s.y, 0);
      const c = { x: Math.floor(sol.x), y: Math.floor(sol.y) };
      return this.salle.map && Grid.inBounds(this.salle.map, c.x, c.y) ? c : null;
    }
    // 1. Les figures, de la plus proche à la plus lointaine.
    const rects = this.figures.rects.slice().sort((a, b) => a.z - b.z);
    for (const r of rects) {
      if (!r.s.cible) continue;
      const w = Math.max(doigt ? 44 : 20, r.w * 0.5), h = Math.max(doigt ? 44 : 24, r.h * 0.8);
      const x0 = r.x - w / 2, y0 = r.y - h * 0.95, y1 = r.y + Math.max(6, h * 0.12);
      if (s.x >= x0 && s.x <= x0 + w && s.y >= y0 && s.y <= y1) return { x: r.s.cible.ref.x, y: r.s.cible.ref.y, cible: r.s.cible };
    }
    // 2. Les objets qui agissent, par leur volume projeté (un fuseau vertical).
    for (const c of this.cibles || []) {
      if (c.type === 'decor') continue;
      const h0 = this.hauteur(c.x, c.y), a = cam.versEcran(c.x, h0, c.y), b = cam.versEcran(c.x, h0 + c.h, c.y);
      if (!a.devant) continue;
      const ppu = cam.pixelsParU(c.x, h0, c.y), rr = Math.max(doigt ? 24 : 12, c.r * ppu);
      const t = Math.max(0, Math.min(1, ((s.x - a.x) * (b.x - a.x) + (s.y - a.y) * (b.y - a.y)) / (((b.x - a.x) ** 2 + (b.y - a.y) ** 2) || 1)));
      const px = a.x + (b.x - a.x) * t, py = a.y + (b.y - a.y) * t;
      if ((s.x - px) ** 2 + (s.y - py) ** 2 <= rr * rr) return { x: c.x, y: c.y, cible: { type: c.type, ref: c.ref != null ? c.ref : c } };
    }
    // 3. Le sol.
    const sol = this.rayonSol(s.x, s.y);
    if (sol) return { x: sol.x, y: sol.y, cible: null };
    // Hors de l'île (les nuages) : le point du plan du point visé ; le moteur cherche le plus
    // proche praticable.
    const q = cam.ecranVersPlan(s.x, s.y);
    return { x: Math.max(0, Math.min(this.T.largeur, q.x)), y: Math.max(0, Math.min(this.T.hauteur, q.y)), cible: null };
  }

  rayonSol(sx, sy) {
    const T = this.T;
    if (!T) return null;
    const ray = this.camera.rayon(sx, sy);
    const o = ray.origin, d = ray.direction;
    // Du haut du relief (20 u) jusqu'au plus bas (-10 u), par pas de 0,5 u le long du rayon.
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

  // ----- La boucle -----

  boucle(now) {
    if (!this.actif) return;
    this.raf = requestAnimationFrame(this._boucle);
    // Les animations du combat avancent toujours : le moteur de combat les attend.
    if (this.arene) this.arene.avancer(now);
    if (this.enPause) return;
    const dtReel = this.dernier ? now - this.dernier : 16;
    this.dernier = now;
    // Le dessin endormi (une fenêtre couvre la scène, la carte du monde en 3D vit à côté, 3.12) :
    // le monde avance toujours (minuteries, errance), mais rien ne se dessine.
    if (this.dessinEndormi) { if (this.onTick) this.onTick(now); return; }
    this.surveillerCadence(dtReel);
    if (this.onTick) this.onTick(now);
    this.image(now);
  }

  // Endort ou réveille le dessin, sans quitter la scène (Scene.pause3D).
  endormirDessin(oui) {
    oui = !!oui;
    if (oui === !!this.dessinEndormi) return;
    this.dessinEndormi = oui;
    this.dernier = 0;
    if (!oui && this.actif && this.pret) this.image(performance.now());
  }

  // Sous 30 images par seconde pendant trois secondes (le temps cumulé des images lentes, pas leur
  // nombre), un cran de qualité en moins ; jamais on ne remonte seul ; ?quality= l'impose. Un trou de
  // plus d'un quart de seconde ne compte pas. L'antialias reste celui du départ (fixé à la création
  // du contexte).
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

  // Ce qui suit la qualité sans reconstruire : la densité de pixels, l'animation de l'eau, le rayon
  // de l'herbe proche, le nombre de bouffées de nuages ; le reste attend la prochaine construction.
  descendreQualite(q) {
    this.qualite = q;
    this.appliquerDensite();
    if (this.matEauRef) this.matEauRef.uniforms.anime.value = q === 'basse' ? 0 : 1;
    if (this.bouffees) this.bouffees.instanceCount = Math.min(this.bouffees.instanceCount, q === 'basse' ? 18 : this.telephone ? 34 : 56);
    for (const H of [this.herbe, this.fleurs, this.touffesNuit]) if (H) H.centre = null;
  }

  // Une image : la caméra, les tuiles (niveaux de détail), les figures, les marques, l'eau, les
  // nuages, la brume de la région, la lanterne la plus proche, puis le rendu.
  image(now) {
    if (!this.pret || !this.renderer) return;
    if (this.salle) return this.imageSalle(now);
    const THREE = window.THREE, w = this.world, p = w.player, cam = this.camera;
    const t0 = performance.now();
    const dt = this.tempsPrec ? Math.min(0.1, (now - this.tempsPrec) / 1000) : 0.016;
    this.tempsPrec = now;
    this.temps += dt;
    const hp = this.hauteur(p.rx, p.ry);
    this.majArene(now);
    cam.update(now, { x: p.rx, y: p.ry, h: hp }, p.moving);
    const c = cam.vise;
    const A = this.arene, tact = this.enArene && this.tactique;
    // Les tuiles du sol : la proche (un sommet par u) jusqu'à un champ du point visé (la distance
    // au rectangle de la tuile), la lointaine (un sommet pour 2 u) au-delà.
    const pres = cam.champ * (this.qualite === 'haute' ? 1.6 : this.qualite === 'basse' ? 0.9 : 1.15) + 6;
    const distTuile = t => Math.hypot(Math.max(0, Math.abs(t.centre[0] - c.x) - 15), Math.max(0, Math.abs(t.centre[1] - c.y) - 15));
    // Le style Lisière (3.25) : sa caméra basse voit le sol jusqu'à l'horizon ; au-delà de `solMax`
    // u, la brume l'a pris, la tuile ne se dessine plus (le ciel de la brume est derrière).
    const solMax = this.nuit && this.nuit.solMax && !this.enArene ? this.nuit.solMax : Infinity;
    for (const t of this.tuilesSol) {
      const d = distTuile(t), proche = !t.loin || d < pres;
      t.proche.visible = proche && d < solMax;
      if (t.loin) t.loin.visible = !proche && d < solMax;
    }
    // Le monde modelé (3.26) : ses tuiles suivent les mêmes portées (le sol sous la brume, le semis
    // et le reste à la portée des silhouettes), posées plus bas, une fois les portées connues.
    // Le décor : complet jusqu'à 45 u (60 en qualité haute, 30 en basse), silhouettes jusqu'à 80 u.
    // La nuit (3.24), la brume plus proche cache le lointain : le décor détaillé et les silhouettes
    // s'arrêtent plus tôt (ce qu'on y gagne paie une part du décor ajouté).
    // Le style Lisière (3.25) règle ses propres portées : sa caméra basse voit plus de morceaux.
    const kNuit = this.nuit ? (this.nuit.kDetail || (this.telephone ? 0.8 : 0.85)) : 1;
    const rDet = (this.qualite === 'haute' ? 60 : this.qualite === 'basse' ? 30 : 45) * kNuit, rSil = (this.qualite === 'haute' ? 120 : 80) * (this.nuit ? (this.nuit.kSil || 0.72) : 1);
    const demi = IleDecor.TUILE / 2;
    const distMorceau = t => Math.hypot(Math.max(0, Math.abs(t.centre[0] - c.x) - demi), Math.max(0, Math.abs(t.centre[1] - c.y) - demi));
    if (this.monde && typeof IleGlb === 'object' && IleGlb.portee && !tact) IleGlb.portee(this.monde, c, { sol: solMax, semis: rSil, reste: Math.max(rSil, 60) });
    // La vue tactique cache le décor, l'herbe et l'eau : le damier d'ardoise du sol reste seul.
    for (const t of this.tuilesDecor) {
      const d = distMorceau(t);
      t.groupe.visible = d < rDet && !tact;
      if (t.sil) t.sil.visible = d >= rDet && d < rSil && !tact;
    }
    for (const H of [this.herbe, this.fleurs, this.touffesNuit]) if (H) H.mesh.visible = !tact;
    // Les touffes de la nuit se taisent pendant un combat : la grille reste nette, le budget aussi.
    if (this.touffesNuit) this.touffesNuit.mesh.visible = !tact && !(A && A.etat);
    if (this.eau) this.eau.visible = !tact;
    for (const m of this.decorFixe || []) m.visible = !tact;
    // Le monde modelé (3.26) : son semis, son eau et ses objets se cachent de même en vue tactique.
    if (this.monde && typeof IleGlb === 'object' && IleGlb.tactique && this.mondeTactique !== tact) { IleGlb.tactique(this.monde, tact); this.mondeTactique = tact; }
    // La chute du Ru (un voile de 40 u) ne se dessine pas pendant un combat : vue par la caméra
    // orthographique, elle barrait le bord de l'écran au Hameau Vide.
    if (this.meshChute) this.meshChute.visible = !tact && !(A && A.etat);
    if (this.uHerbe) { this.uHerbe.temps.value = this.temps; this.uHerbe.joueur.value.set(p.rx, hp, p.ry); }
    if (this.uFondu) {
      // Les frondaisons entre la caméra et le Veilleur (en combat : l'acteur du tour) s'effacent.
      const vis = this.enArene ? this.cibleFondu() : { u: p.rx, v: p.ry };
      this.uFondu.a.value.copy(cam.courante.position);
      this.uFondu.b.value.set(vis.u, this.hauteur(vis.u, vis.v) + 0.9, vis.v);
      // Ce qui cache l'aire (vu le long de la caméra du combat) devient un fantôme.
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
    // Les figures, leurs étiquettes (jamais sous les barres de l'interface) ; en combat, les effets
    // et les chiffres qui montent.
    this.mesurerHUD(now);
    const extras = A && A.etat ? A.majEffets(now, dt) : null;
    this.figures.maj(this.sprites(now), cam, now, extras);
    this.majMarques(now, hp);
    // L'eau, la chute, les halos, les nuages.
    if (this.matEauRef) this.matEauRef.uniforms.temps.value = this.temps;
    if (this.matChute) this.matChute.map.offset.y = -this.temps * 0.32;
    if (this.matHalos) this.matHalos.uniforms.temps.value = this.temps;
    for (const b of this.bancs || []) b.material.map.offset.x += dt * b.userData.vit;
    if (this.matBouffees) this.matBouffees.uniforms.temps.value = this.temps;
    // La brume prend, en deux secondes, la couleur de la région sous le point visé.
    this.majBrume(dt);
    // La lanterne allumée la plus proche du Veilleur porte la seule lumière ponctuelle.
    let best = null, bd = 14 * 14;
    for (const l of this.lanternes || []) { const d = (l.x - p.rx) ** 2 + (l.z - p.ry) ** 2; if (d < bd) { bd = d; best = l; } }
    if (best) { this.ponctuelle.position.set(best.x, best.y + 0.3, best.z); this.ponctuelle.intensity = 1.6 * (0.85 + 0.15 * Math.sin(this.temps * 9 + best.x)); }
    else this.ponctuelle.intensity = 0;
    // La nuit (3.24) : la lumière ponctuelle devient la flaque dorée autour du Veilleur (en combat,
    // autour de son combattant) ; les lucioles dérivent autour du point visé.
    if (this.nuit) {
      const e = this.enArene && this.combat && this.combat.player, q = e ? A.versMonde(e.rx, e.ry) : { u: p.rx, v: p.ry };
      this.nuit.maj(now, this.temps, { x: q.u, y: q.v }, this.hauteur(q.u, q.v), cam, tact);
    }
    const r = this.renderer;
    r.info.reset();
    r.render(this.scene, cam.courante);
    this.derniereInfo = { appels: r.info.render.calls, triangles: r.info.render.triangles, points: r.info.render.points, lignes: r.info.render.lines };
    this.compteur.images++;
    this.msScript = (this.msScript || 0) * 0.9 + (performance.now() - t0) * 0.1;
    cam.flush();
  }

  // Les rectangles de l'interface posés sur la scène (la fiche du Veilleur, la barre de menu, le
  // bandeau, la mini-carte, les boutons de la vue, la barre de tour...), en coordonnées de la toile,
  // mesurés quatre fois par seconde : une étiquette de figure ne s'y dessine pas (revue finale).
  mesurerHUD(now) {
    if (this._hudA && now - this._hudA < 250 && now >= this._hudA) return;
    this._hudA = now;
    if (typeof document === 'undefined' || !this.stage || !this.figures) return;
    const st = this.stage.getBoundingClientRect(), zones = [];
    for (const sel of ['#player-bar', '#menus', '#map-name', '#carte-info', '#bas-centre', '#minicarte', '#vue', '#tracker', '.vy-barre-tour', '.vy-ruban:not(.hidden)', '.vy-rappel:not(.hidden)']) {
      for (const el of document.querySelectorAll(sel)) {
        if (!el.offsetWidth || !el.offsetHeight) continue;
        const r = el.getBoundingClientRect();
        if (r.width < 4 || r.height < 4) continue;
        zones.push({ x0: r.left - st.left - 2, y0: r.top - st.top - 2, x1: r.right - st.left + 2, y1: r.bottom - st.top + 2 });
      }
    }
    this.figures.zonesHUD = zones;
  }

  // Le combat sur ce plateau commence ou finit : l'aire s'ouvre et la caméra passe en
  // orthographique, ou l'aire se ferme et la caméra revient au Veilleur ; les uniformes du sol
  // (l'aire, le passage, l'épaisseur des traits, la vue tactique) et l'état des cases suivent.
  majArene(now) {
    const A = this.arene, cam = this.camera, w = this.world, cb = this.combat;
    if (!A || !cam) return;
    const an = w && w.showCombat && cb && cb.map && cb.map.ancre;
    const ici = !!(an && (this.salle ? an.salle === this.salle.id : an.plateau === this.plateauId));
    if (ici && !A.ouverte) {
      const aire = A.ouvrir(cb.map);
      this.mats.uSol.aireO.value.set(aire.x0, aire.y0);
      cam.entrerCombat(aire, !!this.salle);
    } else if (!ici && A.ouverte) {
      A.fermer();
      // Dans une salle, la caméra reste celle du combat : elle cadre la salle.
      if (!this.salle) cam.sortirCombat();
    }
    if (A.etat === 'fermeture' && !cam.trans) A.eteindre();
    cam.setTactique(ici && this.tactique);
    // La barre de tour du téléphone (dans le coin bas droit de la scène) : mesurée quatre fois par
    // seconde, le cadrage du combat l'évite.
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
    u.aireOn.value = A.etat ? Math.max(0, Math.min(1, cam.fondu)) : 0;
    u.tempsSol.value = now / 1000;
    u.tactiqueSol.value = ici && this.tactique ? 1 : 0;
    if (A.etat) {
      // Un pixel d'écran en u, perpendiculairement au bord d'une case (l'azimut est de 45°).
      const el = cam.enCombat && !cam.trans && cam.cadre ? cam.cadre.el : (cam.dernierEtat ? cam.dernierEtat.el : cam.elevation());
      const se = Math.sin(el), f = se / (0.7071 * Math.sqrt(1 + se * se));
      const v = cam.vise, ppu = cam.pixelsParU(v.x, v.h, v.y);
      u.traitU.value = 1 / Math.max(1e-3, ppu * f);
    }
  }

  // En combat, le point dont les frondaisons s'effacent : l'acteur du tour, sinon le Veilleur.
  cibleFondu() {
    const cb = this.combat, A = this.arene;
    const e = cb.actor && cb.actor.alive ? cb.actor : cb.player;
    return e ? A.versMonde(e.rx, e.ry) : { u: A.x0 + 7.5, v: A.y0 + 7.5 };
  }

  majBrume(dt) {
    const THREE = window.THREE, c = this.camera.vise;
    const k = this.T.regionA(c.x, c.y), reg = (this.def.regions || [])[k];
    const col = (reg && reg.palette && reg.palette.brume) || '#a9c3d6';
    if (this.brumeCle !== col) { this.brumeCle = col; this.brumeVoulue = this.nuit ? this.nuit.brume(col) : new THREE.Color(col); }
    const f = this.scene.fog;
    const a = 1 - Math.exp(-dt * 2.2);
    f.color.lerp(this.brumeVoulue, a);
    // En combat, la brume se tient loin derrière l'aire (la caméra orthographique est à 120 u) ;
    // pendant le passage, elle glisse d'un réglage à l'autre.
    const d = this.camera.distance(), fc = this.camera.fondu || 0;
    // La nuit, la brume vient plus près : le lointain se perd dans le bleu.
    const kp = this.nuit ? 0.92 : 1.1, kl = this.nuit ? 2.0 : 2.7;
    // Le style Lisière (3.25) : une brume exponentielle, sa densité réglée par le temps qu'il fait,
    // éclaircie en combat (la caméra du combat est loin derrière l'aire).
    if (f.isFogExp2) f.density = (this.nuit.densite || 0.016) * (1 - fc) + 0.0035 * fc;
    else { f.near = d * kp * (1 - fc) + (d + 30) * fc; f.far = d * kl * (1 - fc) + (d + 120) * fc; }
    // Le ciel (le dégradé CSS derrière la toile transparente) suit la brume.
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

  // Les figures du monde : le Veilleur, les monstres des groupes (en file derrière le premier),
  // les PNJ (leur marque de quête), les nœuds de récolte.
  sprites(now) {
    const w = this.world, out = [];
    const ch = w.ch, cls = DATA.classes[ch.classId], p = w.player;
    const c = this.camera ? this.camera.vise : { x: p.rx, y: p.ry };
    const rayon = (this.camera ? this.camera.champ : 30) * 1.4 + 12;
    // En combat : les figures du monde dans l'aire et à 2 u autour sont cachées, le Veilleur du
    // monde aussi (le combat a le sien) ; la vue tactique ne garde que les combattants.
    const A = this.arene, enCombat = this.enArene;
    if (enCombat && this.tactique) return A.sprites(this.combat, now, this.figures, this.telephone);
    const dansAire = enCombat ? (x, y) => x > A.x0 - 2 && x < A.x0 + 17 && y > A.y0 - 2 && y < A.y0 + 17 : () => false;
    const loin = (x, y) => Math.abs(x - c.x) > rayon || Math.abs(y - c.y) > rayon || dansAire(x, y);
    const H = (x, y) => this.hauteur(x, y);
    const N = (x, y) => this.normale(x, y);
    // Dans une salle hors combat, les positions du monde sont des cases : leur centre dans la scène.
    const salle = !!this.salle && !enCombat;
    const pos = (x, y) => (salle ? [x + 0.5, y + 0.5] : [x, y]);
    const fig = this.figures;
    const [px, py] = pos(p.rx, p.ry);
    const veilleur = { kind: 'entity', shape: 'player', color: cls.color, glyph: cls.glyph, name: ch.name, team: 'player', facing: p.facing, look: ch.look, gender: ch.gender, scale: 1, x: px, y: py, h: H(px, py), normale: N(px, py), bob: p.moving ? Math.abs(Math.sin(now / 70)) * 3 : Math.sin(now / 900) * 0.8, joueur: true };
    veilleur.cle = fig.cleFigure(veilleur); veilleur.peindre = fig.peindreFigure(veilleur);
    // Le héros modelé (3.27) : les figures le posent à la place du panneau du Veilleur, sur l'île
    // comme dans une salle (en combat, l'arène marque la figure du joueur) ; sa marche suit `moving`.
    if (fig.heros && !enCombat) { veilleur.heros = true; veilleur.bouge = !!p.moving; }
    if (!enCombat) out.push(veilleur);
    else for (const s of A.sprites(this.combat, now, fig, this.telephone)) out.push(s);
    for (const g of w.groups) {
      const [gx, gy] = pos(g.rx, g.ry);
      // Un groupe revenu (Plateau.reapparitions pose `naissance`) alors qu'il est dans le champ de la
      // caméra attend, invisible, d'en être sorti, ou que le Veilleur s'en approche à 12 u ; puis il
      // paraît en fondu. Le moteur, lui, ne regarde jamais la caméra (4.5, 7.5).
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
      // Le sens du regard suit la marche à l'écran (vers la droite : +u, -v).
      const prec = this.directions.get(g) || { x: g.rx, y: g.ry, f: 1 };
      const sx = (g.rx - prec.x) - (g.ry - prec.y);
      if (Math.abs(sx) > 0.02) prec.f = sx > 0 ? 1 : -1;
      prec.x = g.rx; prec.y = g.ry; this.directions.set(g, prec);
      g.monsters.slice(0, 4).forEach((m, k) => {
        const def = DATA.monsters[m.id];
        if (!def) return;
        const [x, y] = membres[k];
        const s = { kind: 'entity', shape: def.shape, color: def.color, glyph: null, team: 'monster', motif: Renderer.motifOf(m.id), noyau: def.noyau || null, scale: def.boss ? 1.3 : this.telephone ? 1.2 : 0.95, facing: prec.f, x, y, h: H(x, y), normale: N(x, y), bob: Math.sin(now / 500 + g.idx + k) * 1.5, alpha: fondu, cible: { type: 'groupe', ref: g } };
        // En combat, les groupes du monde gardent leur figure, pas leur nom.
        // Un boss garde son prénom sur l'étiquette (« Krobb niv. 7 ») : le titre entier tient sur sa fiche.
        if (k === 0 && !enCombat) { s.label = `${def.boss ? def.name.split(',')[0] : def.name} niv. ${g.level}`; s.labelSorte = 'ennemi'; if (g.monsters.length > 1) s.badge = `×${g.monsters.length}`; }
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
      const s = { kind: 'npc', look: n.def.look || 'marcheur', x: nx, y: ny, h: H(nx, ny), normale: N(nx, ny), label: enCombat ? null : n.def.name, labelSorte: 'nom', quest: enCombat ? null : this.marques[n.id], bob: 0, cible: { type: 'pnj', ref: n } };
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
    // Le chemin qui reste : des points tous les 1,2 u.
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
    // Le survol (à la souris) : un anneau sous la cible, ou sous le point du sol.
    const hv = !enCombat && this.highlights && this.highlights.hover;
    this.survol.visible = !!(hv && Number.isFinite(hv.x) && hv.cible);
    if (this.survol.visible) { this.survol.position.set(hv.x, this.hauteur(hv.x, hv.y) + 0.05, hv.y); }
    // Le repère du guide : { cell }, { group }, { entity }, { point }, et les marques de { chemin }.
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
      // En combat, une case ou un combattant sont des cases de l'aire ; dans une salle, tout l'est.
      if ((enCombat && !cue.group && !cue.point) || (this.salle && !cue.point)) { const q = this.versScene(x, y); x = q.u; y = q.v; }
      const k = 1 + 0.18 * Math.sin(now / 280);
      this.repere.position.set(x, this.hauteur(x, y) + 0.07, y);
      this.repere.scale.set(k, 1, k);
    }
    void hp;
  }

  // ----- Pour les tests et le budget -----

  // Fait avancer le monde de `ms` millisecondes par pas fixes de 1/30 s (développement seulement :
  // les tests du rendu logiciel n'attendent pas en temps réel), la caméra avec lui, puis dessine une
  // image. Avec `enPause`, la boucle ne fait plus avancer le monde : seul ce pas d'horloge le fait.
  avancer(ms) {
    const w = this.world;
    if (!w || !this.pret) return;
    const pas = 1 / 30, n = Math.max(1, Math.round(ms / 1000 / pas));
    let t = Math.max(performance.now(), this.horlogeTest || 0);
    for (let i = 0; i < n; i++) {
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
    const tex = this.octetsTex + (this.figures ? this.figures.octets() : 0);
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
