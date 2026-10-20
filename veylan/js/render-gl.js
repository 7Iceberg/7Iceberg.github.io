// Rendu WebGL (PixiJS 8) du monde et du combat : même entrée et même sortie que le rendu
// Canvas de js/render.js (API identique, choisi dans main.js et lab.js), mais une scène éclairée :
// le plateau et ses alentours peints (js/entourage.js) jusqu'aux bords de la vue, carte de lumière
// des lanternes et des cristaux, lueurs additives, particules, eau animée, décors triés avec les
// personnages, bloom et étalonnage des couleurs en haute qualité. Tout ce qui est peint vient de
// js/paint.js et du peintre (le rendu Canvas en mode peinture seule).
// La toile remplit la scène : le monde passe par la caméra (js/camera.js), appliquée aux conteneurs
// du monde et des étiquettes ; le vignettage et les filtres couvrent l'écran.
//
// Ce que le moteur de jeu et l'interface attendent : W, H, dpr, origin, highlights, static,
// world, onTick, camera, cellToScreen, screenToCell, canvasPoint, worldToClient, animateMove,
// animateCast, follow.
class RendererGL {
  static supported(params) {
    if (params && params.get && params.get('render') === 'canvas') return false;
    if (typeof PIXI === 'undefined' || typeof Paint === 'undefined' || typeof Renderer !== 'function') return false;
    try { const c = document.createElement('canvas'); return !!(c.getContext('webgl2') || c.getContext('webgl')); } catch (e) { return false; }
  }

  // Essai réel avant de choisir ce rendu : Pixi démarre sur une petite toile détachée, dessine une
  // texture, un texte et un filtre, puis se détruit. Si quoi que ce soit échoue ou dure trop, le
  // jeu garde le rendu Canvas. Résultat mémorisé.
  static async probe() {
    if (RendererGL._probe != null) return RendererGL._probe;
    let app = null;
    try {
      const t0 = performance.now();
      const cv = document.createElement('canvas');
      app = new PIXI.Application();
      await app.init({ canvas: cv, width: 96, height: 96, resolution: 1, antialias: false, preference: 'webgl', autoStart: false, sharedTicker: false });
      const src = document.createElement('canvas'); src.width = src.height = 32;
      const g = src.getContext('2d'); g.fillStyle = '#c9a66b'; g.fillRect(0, 0, 32, 32);
      const sp = new PIXI.Sprite(PIXI.Texture.from(src)); sp.blendMode = 'add';
      const gr = new PIXI.Graphics().poly([0, 0, 60, 10, 30, 50]).fill({ color: 0x00c2ff, alpha: 0.8 }).stroke({ color: 0xffffff, width: 2 });
      const tx = new PIXI.Text({ text: 'Veylan', style: { fontSize: 14, fill: '#fff' } });
      const sc = new PIXI.Container(); sc.addChild(sp, gr, tx);
      if (PIXI.filters && PIXI.filters.AdvancedBloomFilter) sc.filters = [new PIXI.filters.AdvancedBloomFilter({ threshold: 0.5, blur: 4, quality: 2 })];
      app.stage.addChild(sc);
      const rt = PIXI.RenderTexture.create({ width: 48, height: 48 });
      app.renderer.render({ container: sc, target: rt, clear: true });
      app.render();
      const ms = performance.now() - t0;
      RendererGL._probe = ms < 8000;
      if (!RendererGL._probe) console.info('Veylan : WebGL trop lent à démarrer (' + Math.round(ms) + ' ms), rendu Canvas.');
    } catch (e) {
      console.info('Veylan : WebGL indisponible, rendu Canvas.', e && e.message);
      RendererGL._probe = false;
    }
    try { if (app) app.destroy(true, { children: true, texture: true }); } catch (e) { /* rien */ }
    return RendererGL._probe;
  }

  constructor(canvas, combat, world) {
    this.canvas = canvas;
    this.combat = combat;
    this.world = world || null;
    // Le peintre : le rendu Canvas en mode « peinture seule » fournit les calques fixes (le plateau
    // et ses alentours, décor cuit, flaques de lumière), les sprites de décor et le dessin des figures. Cette
    // classe les met en scène sur le GPU et ajoute la lumière vivante, les lueurs, les particules.
    this.painter = new Renderer(document.createElement('canvas'), combat, world, { painterOnly: true });
    this.painter.softShadow = () => {};
    this.painter.bglow = () => {};
    this.painter.reducedMotion = true;
    this.sprTex = new Map();
    this.ambientBase = [0.93, 0.93, 0.97];
    const m = this.map;
    this.cliffH = Renderer.CLIFF;
    this.origin = { x: (m.h - 1) * (Grid.TILE_W / 2) + Grid.TILE_W / 2 + 8, y: 84 };
    this.W = (m.w + m.h) * (Grid.TILE_W / 2) + 16;
    this.H = (m.w + m.h) * (Grid.TILE_H / 2) + 110 + this.cliffH;
    this.SH = this.painter.SH;
    this.dpr = Math.min(2, Math.max(1, (typeof devicePixelRatio === 'number' && devicePixelRatio) || 1));
    this.vw = 0; this.vh = 0;
    this.uiK = 1;
    // La toile remplit la scène ; la caméra y place le monde (le repli Canvas la partage).
    this.camera = new Camera(canvas);
    // Le peintre règle les alentours sur cette caméra, et lui donne leurs bornes à chaque carte.
    this.painter.camera = this.camera;
    this.camera.setBounds(this.painter.cameraBounds());
    this.floats = [];
    this.fx = [];
    this.animations = [];
    this.highlights = { move: new Set(), range: new Set(), blocked: new Set(), aoe: new Set(), path: [], hover: null };
    // Repère du guide et vue tactique : mêmes réglages que le rendu Canvas (js/render.js).
    this.guideCue = null;
    this.tactique = false;
    this.static = null;
    this.lights = [];
    this.ready = false;
    this.touch = typeof matchMedia === 'function' && matchMedia('(pointer: coarse)').matches;
    this.calme = typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;
    const params = new URLSearchParams(location.search);
    this.forcedQuality = params.get('quality') === 'basse' || params.get('quality') === 'haute';
    this.quality = this.forcedQuality ? params.get('quality') : RendererGL.autoQuality();
    this.frameEma = 16;
    this.frames = 0;
    this.textures = new Map();
    this.ents = new Map();
    this.decor = [];
    this.waterTiles = [];
    this.particles = [];
    this.tempLights = [];
    this.floatPool = [];
    this.lastNow = performance.now();
    combat.on('animMove', d => this.animateMove(d));
    combat.on('animCast', d => this.animateCast(d));
    combat.on('animTrap', () => Util.delay(180));
    combat.on('fx', d => this.burst(d.cells, d.color, 420));
    combat.on('float', d => this.floats.push({ x: d.x, y: d.y, text: d.text, color: d.color, born: performance.now() }));
    this.watchSize();
    this.initGL().catch(e => { console.error('Rendu WebGL impossible :', e); this.degrade('démarrage : ' + (e && e.message)); });
    canvas.addEventListener('webglcontextlost', e => { e.preventDefault(); this.degrade('contexte WebGL perdu'); });
    requestAnimationFrame(() => this.frame());
  }

  // La toile suit la taille de la scène (fenêtre, rotation, plein écran, colonne voisine) ; le rendu
  // Pixi prend la même taille, à la densité de l'écran (2 au plus), et se redessine aussitôt.
  watchSize() {
    const fit = () => {
      const w = this.canvas.clientWidth, h = this.canvas.clientHeight;
      if (!w || !h || this.degraded) return;
      this.dpr = Math.min(2, Math.max(1, (typeof devicePixelRatio === 'number' && devicePixelRatio) || 1));
      this.painter.dpr = this.dpr;
      this.camera.setViewport(w, h);
      this.painter.suivreDensite(this.camera.fitZoom, this.dpr);
      this.painter.suivreAlentours();
      if (!this.app || (w === this.vw && h === this.vh && this.app.renderer.resolution === this.dpr)) return;
      this.vw = w; this.vh = h;
      this.app.renderer.resize(w, h, this.dpr);
      this.layoutScreen();
      if (this.ready) { try { this.update(performance.now()); this.app.render(); } catch (e) { /* l'image suivante le dira */ } }
    };
    this.resize = fit;
    if (typeof ResizeObserver === 'function') new ResizeObserver(fit).observe(this.canvas.parentElement || this.canvas);
    addEventListener('resize', fit);
    fit();
  }

  // Ce qui suit l'écran plutôt que le monde : le vignettage, la zone des filtres (en coordonnées de
  // la scène, qui ne bouge pas : seul son contenu passe par la caméra).
  layoutScreen() {
    if (!this.layers) return;
    this.vignette.width = this.vw; this.vignette.height = this.vh;
    this.layers.scene.filterArea = new PIXI.Rectangle(0, 0, this.vw, this.vh);
  }

  // La caméra appliquée au monde et aux étiquettes ; les étiquettes gardent une taille lisible à
  // tout zoom (comme uiAt dans le rendu Canvas).
  applyCamera() {
    const cam = this.camera, L = this.layers;
    for (const c of [L.world, L.hud]) { c.position.set(cam.x, cam.y); c.scale.set(cam.zoom); }
    this.uiK = Math.min(1.3, Math.max(0.9, cam.zoom)) / cam.zoom;
  }

  // Repli en cours de route : le rendu Canvas prend la main sur une toile posée exactement sous
  // celle-ci (même place, même caméra), qui reste transparente pour continuer à recevoir les
  // touchers et les clics.
  degrade(reason) {
    if (this.degraded) return;
    this.degraded = true;
    this.ready = false;
    console.warn('Veylan : rendu WebGL abandonné (' + reason + '), rendu Canvas.');
    const stage = this.canvas.parentElement;
    const cv = document.createElement('canvas');
    cv.className = 'board-repli';
    if (stage) stage.insertBefore(cv, this.canvas);
    this.canvas.style.opacity = '0';
    const fb = this.fallback = new Renderer(cv, this.combat, this.world, { camera: this.camera });
    fb.highlights = this.highlights;
    fb.guideCue = this._cue || null;
    fb.tactique = !!this._tactique;
    fb.onTick = this._onTick || null;
    fb.static = null;
    try { if (this.app) { this.app.destroy(false, { children: true, texture: true }); this.app = null; } } catch (e) { /* rien */ }
    if (window.VEYLAN_GARDE && /^(démarrage|contexte)/.test(reason) === false) window.VEYLAN_GARDE.show('Rendu WebGL abandonné : ' + reason + '. Le jeu continue en rendu Canvas.');
  }

  get onTick() { return this._onTick; }
  set onTick(fn) { this._onTick = fn; if (this.fallback) this.fallback.onTick = fn; }
  // Le repère du guide et la vue tactique suivent aussi le rendu Canvas de repli.
  get guideCue() { return this._cue; }
  set guideCue(v) { this._cue = v || null; if (this.fallback) this.fallback.guideCue = this._cue; }
  get tactique() { return !!this._tactique; }
  set tactique(v) { this._tactique = !!v; if (this.fallback) this.fallback.tactique = this._tactique; }

  // Sur un téléphone ou une tablette, qualité basse par défaut (pas de filtre de bloom, moins de
  // particules) : la peinture garde ses lueurs cuites, et ?quality=haute reste possible.
  static autoQuality() {
    const coarse = typeof matchMedia === 'function' && matchMedia('(pointer: coarse)').matches;
    const cores = navigator.hardwareConcurrency || 4;
    if (coarse) return 'basse';
    return cores >= 4 ? 'haute' : 'basse';
  }

  get world() { return this._world; }
  set world(w) { this._world = w || null; if (this.painter) this.painter.world = this._world; if (this.fallback) { this.fallback.world = this._world; this.fallback.static = null; } }
  get map() { return this.world ? this.world.map : this.combat.map; }
  get inCombat() { return this.world ? this.world.showCombat : true; }
  get paletteId() { return this.world && this.world.zone ? this.world.zone.palette : 'lab'; }
  get palette() { return Paint.PALETTES[this.paletteId] || Paint.PALETTES.lab; }

  cellToScreen(x, y) { return Grid.toScreen(x, y, this.origin); }
  screenToCell(sx, sy) { return Grid.fromScreen(sx, sy, this.origin); }

  // Coordonnées du monde sous un événement souris ou tactile, à travers la caméra.
  canvasPoint(evt) {
    const src = evt.touches && evt.touches[0] ? evt.touches[0] : (evt.changedTouches && evt.changedTouches[0] ? evt.changedTouches[0] : evt);
    return this.camera.clientToWorld(src.clientX, src.clientY);
  }

  // Un point du monde en coordonnées client, pour poser un élément du DOM dessus.
  worldToClient(x, y) { return this.camera.worldToClient(x, y); }
  cameraBounds() { return this.painter.cameraBounds(); }

  // ----- Animations demandées par le moteur de combat -----

  animateMove({ entity, to, teleport, fast }) {
    return new Promise(resolve => {
      const from = { x: entity.rx, y: entity.ry };
      const dur = teleport ? 200 : (fast ? 90 : 140);
      const start = performance.now();
      // Un Veilleur qui marche regarde où il va ; poussé ou en repli, il garde son regard.
      if (!teleport && !fast && entity.shape === 'player') entity.facing = Grid.facing(to.x - from.x, to.y - from.y) || entity.facing;
      if (teleport) { this.burst([{ x: from.x, y: from.y }], this.palette.crystal, 300); setTimeout(() => this.burst([to], this.palette.crystal, 300), 100); }
      this.animations.push({
        tick: now => {
          const t = Math.min(1, (now - start) / dur);
          if (teleport) {
            entity.rx = t < 0.5 ? from.x : to.x;
            entity.ry = t < 0.5 ? from.y : to.y;
            entity.alpha = Math.abs(t - 0.5) * 2;
          } else {
            entity.rx = from.x + (to.x - from.x) * t;
            entity.ry = from.y + (to.y - from.y) * t;
            entity.hop = Math.sin(t * Math.PI) * 4;
          }
          if (t >= 1) { entity.alpha = 1; entity.hop = 0; resolve(); return true; }
          return false;
        },
      });
    });
  }

  animateCast({ spell, cells }) {
    this.burst(cells, DATA.elements[spell.element].color, 340);
    return Util.delay(240);
  }

  // Une explosion de lumière sur des cases : losange qui s'ouvre, halo, étincelles, lumière brève.
  burst(cells, color, dur) {
    const now = performance.now();
    for (const c of cells) {
      this.fx.push({ x: c.x, y: c.y, color, born: now, dur });
      const p = this.cellToScreen(c.x, c.y);
      this.tempLights.push({ sx: p.x, sy: p.y, r: 110, c: Paint.rgb(color).map(v => v / 255), i: 0.9, until: now + dur * 0.8, born: now, dur: dur * 0.8 });
      for (let i = 0; i < (this.quality === 'haute' ? 7 : 3); i++) this.spawnParticle('etincelle', p.x, p.y - 8, color);
    }
  }

  // ----- Boucle -----

  frame() {
    if (this.degraded) return;   // le rendu Canvas de repli a sa propre boucle
    const now = performance.now();
    this.watchRate(now);
    if (this.onTick) this.onTick(now);
    this.animations = this.animations.filter(a => !a.tick(now));
    this.follow();
    this.camera.update(now);
    if (this.ready) {
      let t0 = performance.now();
      // Le calque fixe se refait au changement de carte, une fois : hors de la mesure, qui juge le
      // coût d'une image ordinaire (et décide de passer en qualité basse).
      try { this.buildStatic(); t0 = performance.now(); this.update(now); this.app.render(); this.okFrames = (this.okFrames || 0) + 1; }
      catch (e) {
        console.error('Rendu WebGL :', e);
        this.degrade('image : ' + (e && e.message));
        return;
      }
      this.measure(performance.now() - t0);
    }
    this.camera.flush();
    this.lastNow = now;
    requestAnimationFrame(() => this.frame());
  }

  // La cadence réelle, rastérisation comprise : la toile remplit l'écran, et une carte graphique qui
  // peine sur un grand écran dense ne se voit pas dans le temps du script. Sous 30 images par seconde
  // pendant trois secondes, qualité basse (sans bloom ni étalonnage). Pas si ?quality= l'impose ; un
  // trou de plus d'un quart de seconde (onglet caché, carte qui se construit) ne compte pas.
  watchRate(now) {
    const dt = this.prevFrame ? now - this.prevFrame : 16;
    this.prevFrame = now;
    if (this.forcedQuality || this.quality !== 'haute' || !this.ready || dt > 250) return;
    this.rate = this.rate ? this.rate * 0.95 + dt * 0.05 : dt;
    this.slowFrames = this.rate > 34 ? (this.slowFrames || 0) + 1 : 0;
    if (this.slowFrames > 90) {
      this.quality = 'basse';
      this.applyQuality();
      console.info('Veylan : rendu passé en qualité basse (' + Math.round(1000 / this.rate) + ' images par seconde).');
    }
  }

  // Si les images sont trop longues à produire, on repasse en qualité basse.
  measure(ms) {
    this.frameEma = this.frameEma * 0.95 + ms * 0.05;
    if (++this.frames > 120 && this.quality === 'haute' && this.frameEma > 40) {
      this.quality = 'basse';
      this.applyQuality();
      console.info('Veylan : rendu passé en qualité basse (' + Math.round(this.frameEma) + ' ms par image).');
    }
  }

  // Comme le rendu Canvas : la caméra garde l'acteur du moment dans le cadre quand le plateau ne
  // tient pas en entier ; l'entrée en combat et le retour au monde recadrent le plateau.
  follow() {
    if (this.inCombat !== this.framedCombat) { this.framedCombat = this.inCombat; this.camera.fit(); }
    const focus = this.inCombat ? (this.combat.actor ? this.combat.actor.id : 0) : (this.world && this.world.player.moving ? 'marche' : 'repos');
    let target = null;
    if (this.inCombat) {
      const a = this.combat.actor;
      target = a && a.alive ? { x: a.rx, y: a.ry } : (this.combat.player ? { x: this.combat.player.rx, y: this.combat.player.ry } : null);
    } else if (this.world) target = { x: this.world.player.rx, y: this.world.player.ry };
    const p = target && this.cellToScreen(target.x, target.y);
    this.camera.follow(focus, p ? p.x : null, p ? p.y - 30 : null);
  }

  // ----- Mise en place de la scène -----

  async initGL() {
    const app = new PIXI.Application();
    // La taille de la scène (la toile la remplit) ; la caméra place le monde dedans.
    const w = this.canvas.clientWidth || this.W, h = this.canvas.clientHeight || this.H;
    await app.init({ canvas: this.canvas, width: w, height: h, resolution: this.dpr, autoDensity: false, antialias: false, background: '#070b14', preference: 'webgl', autoStart: false, sharedTicker: false, powerPreference: 'high-performance' });
    this.app = app;
    this.vw = w; this.vh = h;
    // La scène reste fixe (elle porte les filtres, sur tout l'écran) ; le monde, dedans, et les
    // étiquettes passent par la caméra ; le vignettage est entre les deux, à la taille de l'écran.
    const L = this.layers = {};
    L.scene = new PIXI.Container();
    L.world = new PIXI.Container();
    L.sky = new PIXI.Container();
    L.ground = new PIXI.Container();
    L.water = new PIXI.Container();
    L.light = new PIXI.Container();
    L.cells = new PIXI.Container();
    L.sorted = new PIXI.Container(); L.sorted.sortableChildren = true;
    L.glow = new PIXI.Container();
    L.screen = new PIXI.Container();
    L.hud = new PIXI.Container();
    L.world.addChild(L.sky, L.ground, L.water, L.light, L.cells, L.sorted, L.glow);
    L.scene.addChild(L.world);
    app.stage.addChild(L.scene, L.screen, L.hud);

    const T = this.T = {
      glow: this.tex(Paint.glow('#ffffff', 256, 1)),
      glowSoft: this.tex(Paint.glow('#ffffff', 256, 0.55)),
      shadow: this.tex(Paint.shadow()),
      ring: this.tex(Paint.ring()),
      diamond: this.tex(Paint.diamondTex()),
      diamondRing: this.tex(Paint.diamondRing()),
      spark: this.tex(Paint.spark()),
      star: this.tex(Paint.star()),
      bubble: this.tex(Paint.bubble()),
      shield: this.tex(Paint.shieldIcon()),
      white: PIXI.Texture.WHITE,
    };

    // Carte de lumière du calque proche : l'ambiance partout, puis les lumières en addition. Rendue
    // en demi-résolution, appliquée en multiplication sur le sol ; le lointain prend l'ambiance en
    // teinte, sans lumières.
    const K = this.painter.calque;
    this.lmW = Math.ceil(K.w / 2); this.lmH = Math.ceil(K.h / 2);
    this.lm = PIXI.RenderTexture.create({ width: this.lmW, height: this.lmH, resolution: 1 });
    this.lmc = new PIXI.Container();
    this.lmBg = new PIXI.Sprite(T.white); this.lmBg.width = this.lmW; this.lmBg.height = this.lmH;
    this.lmLights = new PIXI.Container();
    this.lmc.addChild(this.lmBg, this.lmLights);
    this.lmSprite = new PIXI.Sprite(this.lm); this.lmSprite.scale.set(2); this.lmSprite.blendMode = 'multiply';
    this.lmSprite.position.set(K.x, K.y);
    L.light.addChild(this.lmSprite);

    this.gTact = new PIXI.Graphics(); this.gTact.visible = false; L.cells.addChild(this.gTact);
    this.gCells = new PIXI.Graphics(); L.cells.addChild(this.gCells);
    // Les cases de départ du joueur, à part : elles respirent pendant le placement.
    this.gDepart = new PIXI.Graphics(); L.cells.addChild(this.gDepart);
    // La lueur du repère, sous sa forme : dans le calque des cases, que le changement de carte
    // ne vide pas (celui des lueurs est refait à chaque carte).
    this.cueGlow = new PIXI.Sprite(T.glow); this.cueGlow.anchor.set(0.5); this.cueGlow.blendMode = 'add'; this.cueGlow.visible = false; L.cells.addChild(this.cueGlow);
    this.gCue = new PIXI.Graphics(); L.cells.addChild(this.gCue);
    this.gHover = new PIXI.Graphics(); L.hud.addChild(this.gHover);
    // La colonne de lumière du repère, par-dessus les figures.
    this.gBeam = new PIXI.Graphics(); this.gBeam.blendMode = 'add'; L.hud.addChild(this.gBeam);
    // Au-delà de ce qui est peint (le temps qu'une nouvelle taille de vue soit repeinte), la couleur
    // du lointain (updateBackdrop).
    this.backstop = new PIXI.Sprite(T.white); this.backstop.visible = false; L.sky.addChild(this.backstop);
    // Le vignettage, étiré à la taille de l'écran (l'ovale suit sa forme).
    this.vignette = new PIXI.Sprite(this.tex(Paint.vignette(512, 512))); this.vignette.blendMode = 'multiply'; L.screen.addChild(this.vignette);
    this.floatLayer = new PIXI.Container(); L.hud.addChild(this.floatLayer);
    this.applyQuality();
    this.layoutScreen();
    this.ready = true;
    this.static = null;
    // La scène a pu changer de taille pendant le démarrage.
    this.resize();
  }

  applyQuality() {
    const haute = this.quality === 'haute';
    const F = [];
    if (haute && PIXI.filters && PIXI.filters.AdvancedBloomFilter) {
      this.bloom = new PIXI.filters.AdvancedBloomFilter({ threshold: 0.74, bloomScale: 0.5, brightness: 1.0, blur: 7, quality: 3 });
      this.bloom.resolution = this.touch ? 1 : this.dpr;
      this.bloom.padding = 0;
      F.push(this.bloom);
    }
    if (haute) { const cm = new PIXI.ColorMatrixFilter(); cm.saturate(0.14, false); cm.contrast(0.05, true); cm.resolution = this.touch ? 1 : this.dpr; cm.padding = 0; F.push(cm); }
    this.layers.scene.filters = F.length ? F : null;
    this.maxParticles = haute ? 72 : 24;
  }

  tex(canvas) { return PIXI.Texture.from(canvas); }

  // Texture d'un peintre, en cache ; rend { texture, ax, ay, scale }.
  painted(key, make) {
    let t = this.textures.get(key);
    if (t) return t;
    const r = make();
    t = { texture: this.tex(r.canvas), ax: r.ax / r.canvas.width, ay: r.ay / r.canvas.height, scale: r.scale };
    this.textures.set(key, t);
    return t;
  }

  spriteOf(key, make) {
    const t = this.painted(key, make);
    const s = new PIXI.Sprite(t.texture);
    s.anchor.set(t.ax, t.ay);
    s.scale.set(t.scale);
    return s;
  }

  // ----- Les calques fixes : le sol et ses alentours, les décors, les lumières de la carte -----

  buildStatic() {
    const m = this.map, P = this.palette, pid = this.paletteId;
    const pt = this.painter;
    pt.world = this.world;
    pt.setQuality('haute');
    pt.buildStatic();
    // (Le peintre a donné à la caméra les bornes de la nouvelle carte, et l'a recadrée.)
    if (this.static && this.staticMap === m && this.staticPalette === P && this.staticCanvas === pt.static) {
      // Une vue agrandie : seules les bandes du lointain ont été repeintes.
      if (this.lointainV !== pt.lointainV) this.buildLointain();
      return;
    }
    this.staticMap = m; this.staticPalette = P; this.staticCanvas = pt.static;
    const L = this.layers;
    for (const e of this.ents.values()) { e.ui.destroy({ children: true }); if (e.aura) e.aura.destroy(); if (e.lanternGlow) e.lanternGlow.destroy(); }
    this.ents.clear();
    this.dropLointain();
    for (const layer of [L.ground, L.water, L.sorted, L.glow]) { for (const ch of layer.removeChildren()) ch.destroy({ children: true }); }
    if (this.fxSprites) this.fxSprites = [];
    if (this.tempRocks) this.tempRocks.clear();
    this.decor = []; this.waterTiles = []; this.lights = []; this.particles = []; this.tempRocks = new Map();
    if (this.groundTex) this.groundTex.destroy(true);
    // Les calques fixes du peintre en textures : les bandes du lointain (les alentours jusqu'aux
    // bords de la vue), teintées de l'ambiance, puis le proche (le plateau et ses abords), et sa
    // couche lumineuse fixe en addition par-dessus.
    const K = pt.calque;
    this.buildLointain();
    this.groundTex = this.tex(pt.static);
    const ground = new PIXI.Sprite(this.groundTex); ground.position.set(K.x, K.y); ground.width = K.w; ground.height = K.h; L.ground.addChild(ground);
    this.backstop.tint = Paint.toInt(pt.entourage.farColor);
    if (this.bloomTex) { this.bloomTex.destroy(true); this.bloomTex = null; }
    if (pt.staticBloom) {
      this.bloomTex = this.tex(pt.staticBloom);
      const b = new PIXI.Sprite(this.bloomTex); b.width = this.W; b.height = pt.SH; b.blendMode = 'add'; b.alpha = 0.68; L.ground.addChild(b);
    }
    this.lmCol = null;
    // Le décor qui peut masquer quelqu'un : trié avec les figures, effacé à demi quand il le faut
    for (const d of pt.decor) {
      const c = new PIXI.Container();
      c.position.set(d.px, d.py);
      c.zIndex = (d.x + d.y) * 10 + 5;
      const body = this.sprSprite(d.spr);
      c.addChild(body);
      L.sorted.addChild(c);
      const rec = { x: d.x, y: d.y, c, body, cover: d.cover || [], kind: d.kind, sway: d.kind === 'arbre' || d.kind === 'buisson', seed: Paint.hash(d.x, d.y, 1) };
      if (d.kind === 'relais') {
        rec.glow = this.addGlow(d.px, d.py - 47, P.crystal, 0.4, 0.3);
        rec.crystal = this.spriteOf(`relayCrystal|${pid}`, () => { const cv = Paint.canvas(48, 72); const cc = cv.getContext('2d'); cc.scale(2, 2); Paint.shard(cc, 12, 22, 8, P, 0.5); return { canvas: cv, ax: 24, ay: 36, scale: 0.5 }; });
        rec.crystal.position.set(0, -47); c.addChild(rec.crystal);
      } else if (d.kind === 'porte') {
        rec.glow = this.addGlow(d.px, d.py - 22, '#a66cff', 0.35, 0.3);
      }
      this.decor.push(rec);
    }
    // Lumières du peintre : lanternes, braseros, relais, portes
    for (const lt of pt.lights) {
      const p = this.cellToScreen(lt.x, lt.y);
      const kind = lt.k === 'Z' ? 'relais' : lt.k === 'D' ? 'porte' : 'lanterne';
      const color = lt.k === 'Z' ? P.crystal : lt.k === 'D' ? '#a66cff' : lt.color;
      const rad = lt.k === 'Z' ? 200 : lt.k === 'D' ? 130 : 190;
      this.lights.push({ sx: p.x, sy: p.y - lt.h, r: rad, c: Paint.rgb(Paint.mix(color, '#ffffff', 0.25)).map(v => v / 255), i: 0.5 * (lt.r || 1), k: kind, seed: Paint.hash(lt.x, lt.y, 3), glow: kind === 'lanterne' ? this.addGlow(p.x, p.y - lt.h, lt.glow || color, 0.32, 0.22) : null });
    }
    for (const cs of pt.crystalSpots || []) this.lights.push({ sx: cs.x, sy: cs.y, r: 110, c: Paint.rgb(P.crystal).map(v => v / 255), i: 0.45, k: 'cristal', seed: Paint.hash(Math.round(cs.x), Math.round(cs.y), 4) });
    // Eau et lave : miroitement par case ; la lave éclaire
    for (const w of pt.liquidCells || []) {
      const p = this.cellToScreen(w.x, w.y), n = Paint.hash(w.x, w.y, 1);
      const s = new PIXI.Sprite(this.T.diamond); s.anchor.set(0.5); s.position.set(p.x, p.y); s.scale.set(0.5); s.blendMode = 'add'; s.tint = Paint.toInt(P.waterLight); s.alpha = 0.1;
      L.water.addChild(s);
      const rec = { x: w.x, y: w.y, n, sprite: s };
      if (P.lava) { this.lights.push({ sx: p.x, sy: p.y, r: 80, c: Paint.rgb(P.water).map(v => v / 255), i: 0.4, k: 'lave', seed: n }); if (n < 0.3) rec.glow = this.addGlow(p.x, p.y, P.water, 0.4, 0.16); }
      this.waterTiles.push(rec);
    }
    this.static = true;
  }

  // Les bandes du lointain du peintre, sous le calque proche (au fond du calque du sol), teintées de
  // l'ambiance comme lui.
  buildLointain() {
    const pt = this.painter, L = this.layers;
    this.dropLointain();
    this.lointainV = pt.lointainV;
    this.farSprites = (pt.lointain || []).map((b, i) => {
      const t = this.tex(b.cv), s = new PIXI.Sprite(t);
      s.position.set(b.x, b.y); s.width = b.w; s.height = b.h;
      if (this.lmCol != null) s.tint = this.lmCol;
      L.ground.addChildAt(s, i);
      return s;
    });
  }

  dropLointain() {
    for (const s of this.farSprites || []) { const t = s.texture; s.destroy(); t.destroy(true); }
    this.farSprites = [];
  }

  // Un sprite Pixi depuis un sprite du peintre ({ cv, w, h, ax, ay } : w × h en unités du monde, le
  // canvas à n'importe quelle densité, celle des calques ou celle d'une image d'artiste).
  sprSprite(spr) {
    let t = this.sprTex.get(spr);
    if (!t) { t = this.tex(spr.cv); this.sprTex.set(spr, t); }
    const s = new PIXI.Sprite(t);
    s.anchor.set(spr.ax / spr.w, spr.ay / spr.h);
    s.scale.set(spr.w / spr.cv.width, spr.h / spr.cv.height);
    return s;
  }

  // Les figures sont dessinées par le peintre dans une texture, une par apparence.
  paintFigure(s) {
    const OS = 2, cv = Paint.canvas(88 * OS, 84 * OS), c = cv.getContext('2d');
    c.scale(OS, OS); c.lineJoin = 'round'; c.lineCap = 'round';
    const p = { x: 44, y: 76 };
    this.painter.drawBody(c, p, s);
    if (s.motif) this.painter.drawMotif(c, p, s);
    return { canvas: cv, ax: 44 * OS, ay: 76 * OS, scale: 1 / OS };
  }
  paintNpc(s) {
    const OS = 2, cv = Paint.canvas(80 * OS, 84 * OS), c = cv.getContext('2d');
    c.scale(OS, OS); c.lineJoin = 'round'; c.lineCap = 'round';
    this.painter.drawNpc(c, { x: 40, y: 76 }, Object.assign({}, s, { bob: 0, phase: 0 }), 0);
    return { canvas: cv, ax: 40 * OS, ay: 76 * OS, scale: 1 / OS };
  }
  paintNode(s) {
    const OS = 2, cv = Paint.canvas(64 * OS, 56 * OS), c = cv.getContext('2d');
    c.scale(OS, OS); c.lineJoin = 'round'; c.lineCap = 'round';
    this.painter.drawNode(c, { x: 32, y: 50 }, Object.assign({}, s, { ready: true }));
    return { canvas: cv, ax: 32 * OS, ay: 50 * OS, scale: 1 / OS };
  }

  addShadow(c, sx, alpha) {
    const sh = new PIXI.Sprite(this.T.shadow); sh.anchor.set(0.5); sh.scale.set(0.42 * sx, 0.42 * sx); sh.alpha = alpha; sh.position.set(0, 1);
    c.addChild(sh);
    return sh;
  }

  addGlow(x, y, color, scale, alpha) {
    const g = new PIXI.Sprite(this.T.glow); g.anchor.set(0.5); g.position.set(x, y); g.scale.set(scale); g.blendMode = 'add'; g.tint = Paint.toInt(color); g.alpha = alpha;
    this.layers.glow.addChild(g);
    return g;
  }

  // ----- Image -----

  update(now) {
    this.buildStatic();
    this.applyCamera();
    const dt = Math.min(0.05, (now - this.lastNow) / 1000);
    this.updateBackdrop();
    this.updateWater(now);
    this.updateCells(now);
    this.updateTactical();
    this.updateCue(now);
    this.updateEntities(now);
    this.updateFx(now);
    this.updateParticles(now, dt);
    this.updateLights(now);
    this.tintAll(now);
    this.updateFloats(now);
  }

  // La couleur du lointain sous les alentours, seulement si la vue montre plus que ce qui est peint.
  updateBackdrop() {
    const E = this.painter.alentours, v = this.camera.visibleWorld(), b = this.backstop;
    b.visible = !E || v.x0 < E.x || v.y0 < E.y || v.x1 > E.x + E.w || v.y1 > E.y + E.h;
    if (b.visible) { b.position.set(v.x0 - 2, v.y0 - 2); b.width = v.x1 - v.x0 + 4; b.height = v.y1 - v.y0 + 4; }
  }

  updateWater(now) {
    const lava = this.palette.lava;
    for (const w of this.waterTiles) {
      const ph = now / (lava ? 1400 : 900) + w.n * 6.28;
      w.sprite.alpha = lava ? 0.05 + 0.05 * Math.sin(ph) : 0.04 + 0.08 * (0.5 + 0.5 * Math.sin(ph)) * (0.5 + 0.5 * Math.sin(ph * 0.37 + w.x));
      w.sprite.scale.set(0.5 + 0.04 * Math.sin(ph * 0.7), 0.5);
      if (w.glow) w.glow.alpha = 0.14 + 0.06 * Math.sin(ph);
    }
  }

  // Surbrillances des cases : rebâties seulement quand leur contenu change.
  updateCells(now) {
    const H = this.highlights, cb = this.combat, m = this.map;
    const inCombat = this.inCombat, placement = inCombat && cb.phase === 'placement';
    const traps = inCombat ? cb.traps.filter(t => t.owner.team === 'player') : [];
    const glyphs = inCombat ? cb.glyphs || [] : [];
    const sig = [inCombat ? 1 : 0, placement ? 1 : 0, [...H.move].join(','), [...H.range].join(','), [...H.blocked].join(','), [...H.aoe].join(','), inCombat ? [...cb.temp.keys()].map(k => k + cb.temp.get(k).kind).join(',') : '', traps.map(t => t.x + ',' + t.y + t.element).join(';'), glyphs.map(g => g.affects + g.cells.map(c => c.x + ',' + c.y).join(' ')).join(';'), this.paletteId].join('|');
    // Rochers temporaires : des sprites triés avec le reste
    if (inCombat) {
      const want = new Set();
      for (const [k, tmp] of cb.temp) if (tmp.kind === 'rock') {
        want.add(k);
        if (!this.tempRocks.has(k)) {
          const [x, y] = k.split(',').map(Number), p = this.cellToScreen(x, y);
          const c = new PIXI.Container(); c.position.set(p.x, p.y); c.zIndex = (x + y) * 10 + 5;
          this.addShadow(c, 0.9, 0.5);
          const body = this.painter.res && this.painter.res.tempRock ? this.sprSprite(this.painter.res.tempRock) : this.spriteOf(`rock|${this.paletteId}|t`, () => Paint.rock(this.palette, 0.5, false)); c.addChild(body);
          this.layers.sorted.addChild(c); this.tempRocks.set(k, c);
        }
      }
      for (const [k, c] of this.tempRocks) if (!want.has(k)) { c.destroy({ children: true }); this.tempRocks.delete(k); }
    } else if (this.tempRocks && this.tempRocks.size) { for (const c of this.tempRocks.values()) c.destroy({ children: true }); this.tempRocks.clear(); }
    if (sig === this.cellSig) return;
    this.cellSig = sig;
    const g0 = this.gCells, gd = this.gDepart;
    g0.clear(); gd.clear();
    const TW = Grid.TILE_W, TH = Grid.TILE_H;
    const dia = (g, p, k = 1) => g.poly([p.x, p.y - TH / 2 * k, p.x + TW / 2 * k, p.y, p.x, p.y + TH / 2 * k, p.x - TW / 2 * k, p.y]);
    const any = placement || H.move.size || H.range.size || H.blocked.size || H.aoe.size || (inCombat && (cb.temp.size || glyphs.length));
    for (let y = 0; any && y < m.h; y++) for (let x = 0; x < m.w; x++) {
      const k = Grid.key(x, y);
      const tmp = inCombat ? cb.tempAt(x, y) : null;
      let fill = null, stroke = null, g = g0;
      if (tmp && tmp.kind === 'water') { fill = [0x2f8fe0, 0.5]; stroke = [0x9fd7ff, 0.5]; }
      if (tmp && tmp.kind === 'fente') { fill = [0x120818, 0.92]; stroke = [0xbf95ff, 0.9]; }
      // Glyphes : turquoise pour ceux qui protègent, rouille pour ceux qui frappent (comme js/render.js).
      const gl = glyphs.length ? cb.glyphsAt(x, y) : [];
      if (gl.length) { const ally = gl.some(gg => gg.affects === 'allies'); fill = ally ? [0x46c8be, 0.32] : [0xc85a3c, 0.32]; stroke = ally ? [0xa0fff0, 0.85] : [0xffbe96, 0.85]; }
      if (placement) {
        if (cb.isStartCell('player', x, y)) { fill = [0x3f8fff, 0.55]; stroke = [0x9fd7ff, 0.95]; g = gd; }
        else if (cb.isStartCell('monster', x, y)) { fill = [0xe04a4a, 0.45]; stroke = [0xff9c9c, 0.85]; }
      }
      if (H.move.has(k)) { fill = [0x4fd47a, 0.4]; stroke = [0xa8ffc4, 0.6]; g = g0; }
      if (H.range.has(k)) { fill = [0x4a90ff, 0.38]; stroke = [0xb8dcff, 0.5]; g = g0; }
      if (H.blocked.has(k)) { fill = [0x000000, 0.4]; stroke = null; g = g0; }
      if (H.aoe.has(k)) { fill = [0xff9a30, 0.6]; stroke = [0xffe0a0, 0.95]; g = g0; }
      if (!fill) continue;
      const p = this.cellToScreen(x, y);
      dia(g, p, 0.94); g.fill({ color: fill[0], alpha: fill[1] });
      if (stroke) { dia(g, p, 0.94); g.stroke({ color: stroke[0], width: 1.3, alpha: stroke[1] }); }
    }
    const g = g0;
    for (const tr of traps) {
      const p = this.cellToScreen(tr.x, tr.y), col = Paint.toInt(DATA.elements[tr.element].color);
      g.moveTo(p.x - 9, p.y - 5); g.lineTo(p.x + 9, p.y + 5); g.moveTo(p.x + 9, p.y - 5); g.lineTo(p.x - 9, p.y + 5);
      g.stroke({ color: 0x000000, width: 4, alpha: 0.5 });
      g.moveTo(p.x - 9, p.y - 5); g.lineTo(p.x + 9, p.y + 5); g.moveTo(p.x + 9, p.y - 5); g.lineTo(p.x - 9, p.y + 5);
      g.stroke({ color: col, width: 2 });
    }
  }

  // Vue tactique : les alentours, les sols peints et le décor s'effacent ; le plateau reste
  // à plat, en damier d'ardoise, les obstacles en pierre sombre (comme js/render.js, drawTactical).
  updateTactical() {
    const L = this.layers, m = this.map;
    const on = this.inCombat && this.tactique;
    for (const layer of [L.sky, L.ground, L.water, L.light]) layer.visible = !on;
    this.gTact.visible = on;
    if (!on || this.tactMap === m) return;
    this.tactMap = m;
    const g = this.gTact;
    g.clear();
    const TW = Grid.TILE_W, TH = Grid.TILE_H;
    for (let y = 0; y < m.h; y++) for (let x = 0; x < m.w; x++) {
      const t = m.cells[y][x], p = this.cellToScreen(x, y), k = 0.98;
      const col = t === Grid.FLOOR ? ((x + y) % 2 ? 0x3b4356 : 0x343b4d) : t === Grid.WATER ? 0x1d4766 : t === Grid.HOLE ? 0x05070b : 0x121620;
      g.poly([p.x, p.y - TH / 2 * k, p.x + TW / 2 * k, p.y, p.x, p.y + TH / 2 * k, p.x - TW / 2 * k, p.y]).fill({ color: col });
      if (t === Grid.ROCK || t === Grid.TREE) g.poly([p.x, p.y - TH / 2 * k, p.x + TW / 2 * k, p.y, p.x, p.y + TH / 2 * k, p.x - TW / 2 * k, p.y]).stroke({ color: 0xc9a66b, width: 1.2, alpha: 0.35 });
    }
  }

  // Repère du guide : la case de cristal qui respire et ses chevrons, ou la flèche d'or posée sur
  // la sortie. Quelques polygones redessinés à chaque image, seulement quand un repère est actif.
  updateCue(now) {
    const g = this.gCue, gb = this.gBeam, cue = this.guideCue;
    this.gDepart.alpha = this.inCombat && this.combat.phase === 'placement' ? 0.72 + 0.28 * Math.sin(now / 340) : 1;
    g.clear();
    gb.clear();
    this.cueGlow.visible = false;
    if (!cue) return;
    const pts = a => a.flatMap(q => (q.x != null ? [q.x, q.y] : q));
    const o = cue.group || cue.entity || cue.cell;
    if (o) {
      const p = this.cellToScreen(o.rx != null ? o.rx : o.x, o.ry != null ? o.ry : o.y);
      const G = Renderer.cueGeometry(p, now);
      // Pas de trait noir : un liseré de bleu profond sous le cristal (comme js/render.js).
      g.poly(pts(G.outer)).fill({ color: 0x00c2ff, alpha: 0.24 + 0.14 * G.t });
      g.poly(pts(G.outer)).stroke({ color: 0x0a2a4a, width: 4, alpha: 0.5, join: 'round' });
      g.poly(pts(G.outer)).stroke({ color: 0x8fe9ff, width: 2.2, join: 'round' });
      g.poly(pts(G.ripple)).stroke({ color: 0x8fe9ff, width: 2, alpha: G.rippleA, join: 'round' });
      g.poly(pts(G.inner)).stroke({ color: 0xe6fbff, width: 1.4, alpha: 0.55 + 0.35 * G.t });
      for (const ch of G.chevrons) {
        g.poly(pts(ch), false).stroke({ color: 0x0a2a4a, width: 4.4, alpha: 0.55, cap: 'round', join: 'round' });
        g.poly(pts(ch), false).stroke({ color: 0xe6fbff, width: 2.2, cap: 'round', join: 'round' });
      }
      Object.assign(this.cueGlow, { visible: true, tint: 0x00c2ff, alpha: 0.32 + 0.25 * G.t });
      this.cueGlow.position.set(p.x, p.y);
      this.cueGlow.scale.set(0.42, 0.24);
      // La colonne : des tranches de plus en plus pâles vers le haut (le dégradé de js/render.js).
      const B = Renderer.beamGeometry(p, now), N = 7;
      for (let i = 0; i < N; i++) {
        const a0 = i / N, a1 = (i + 1) / N;
        const y0 = B.y0 + (B.y1 - B.y0) * a0, y1 = B.y0 + (B.y1 - B.y0) * a1;
        const w0 = B.w0 + (B.w1 - B.w0) * a0, w1 = B.w0 + (B.w1 - B.w0) * a1;
        gb.poly([B.x - w0, y0, B.x - w1, y1, B.x + w1, y1, B.x + w0, y0]).fill({ color: i < 3 ? 0x6edcff : 0x00c2ff, alpha: B.a * Math.pow(1 - a0, 1.5) });
      }
      gb.ellipse(B.x, B.y0, B.w0, B.w0 * 0.5).fill({ color: 0x6edcff, alpha: B.a * 0.6 });
      for (const sp of B.sparks) gb.circle(sp.x, sp.y, 2.2).fill({ color: 0xbff4ff, alpha: sp.a });
    }
    if (cue.edge && !this.inCombat) {
      const A = Renderer.arrowGeometry(this.map, this.origin, cue.edge, now);
      if (!A) return;
      g.poly(pts(A.pts)).fill({ color: 0xe2c690 });
      g.poly(pts(A.pts)).stroke({ color: 0x6e5530, width: 4, alpha: 0.7, join: 'round' });
      g.poly(pts(A.pts)).stroke({ color: 0xfff3d2, width: 1.6, join: 'round' });
      Object.assign(this.cueGlow, { visible: true, tint: 0xf2b134, alpha: 0.48 + 0.25 * A.k });
      this.cueGlow.position.set(A.mid.x, A.mid.y);
      this.cueGlow.scale.set(0.64, 0.38);
    }
  }

  // ----- Personnages, monstres, PNJ, nœuds -----

  combatSprites() {
    const cb = this.combat;
    return cb.entities.filter(e => e.alive && cb.canSee(cb.player, e)).map(e => ({
      key: 'c' + e.id, kind: 'entity', rx: e.rx, ry: e.ry, shape: e.shape, color: e.color, glyph: e.glyph, name: e.name,
      scale: e.boss ? 1.35 : (e.isSummon && !e.ally ? 0.8 : 1), alpha: (e.alpha == null ? 1 : e.alpha) * (e.hasState('invisible') ? 0.45 : 1), look: e.def.look,
      team: e.team, flash: performance.now() < e.flashUntil, current: cb.actor === e, immune: e.immuneElement, boss: e.boss,
      hp: e.hp / e.hpMax, shield: e.shield / e.hpMax, bob: e.hop || 0, motif: e.team === 'monster' ? Renderer.motifOf(e.def.id) : null,
      facing: e.shape === 'player' ? e.facing || Renderer.faceFoe(cb, e) : 1, gender: e.def.gender,
      stunned: e.hasState('stunned'), invuln: !!e.def.invulnerable || e.hasState('invulnerable'), armor: e.modifier('armor') > 0,
      lantern: e.effects.some(f => f.type === 'state' && f.farDodge),
    }));
  }

  worldSprites(now) {
    const w = this.world, out = [];
    const ch = w.ch, cls = DATA.classes[ch.classId], p = w.player;
    out.push({ key: 'player', kind: 'entity', rx: p.rx, ry: p.ry, shape: 'player', color: cls.color, glyph: cls.glyph, name: ch.name, scale: 1, alpha: 1, team: 'player', facing: p.facing, look: ch.look, gender: ch.gender, bob: p.moving ? Math.abs(Math.sin(now / 70)) * 3 : Math.sin(now / 900) * 0.8, aura: true, insigne: Factions.insigne(ch) });
    for (const g of w.groups) {
      const def = DATA.monsters[g.monsters[0].id];
      out.push({ key: 'g' + g.idx, kind: 'entity', rx: g.rx, ry: g.ry, shape: def.shape, color: def.color, glyph: null, name: def.name, scale: def.boss ? 1.3 : 0.95, alpha: 1, team: 'monster', facing: 1, bob: Math.sin(now / 500 + g.idx) * 1.5, badge: g.monsters.length > 1 ? `×${g.monsters.length}` : null, label: `${def.name} niv. ${g.level}`, motif: Renderer.motifOf(g.monsters[0].id), boss: def.boss });
    }
    if (!this.marksAt || now - this.marksAt > 500 || this.marksMap !== w.mapId) {
      this.marksAt = now; this.marksMap = w.mapId; this.marks = {};
      for (const n of w.npcs) this.marks[n.id] = Quests.available(ch, n.id).length ? '!' : (Quests.readyFor(ch, n.id).length ? '?' : null);
    }
    for (const n of w.npcs) out.push({ key: 'n' + n.id, kind: 'npc', rx: n.x, ry: n.y, look: n.def.look || 'marcheur', name: n.def.name, quest: this.marks[n.id], bob: Math.sin(now / 900 + n.x) * 0.8 });
    for (const n of w.nodes) out.push({ key: 'r' + n.idx, kind: 'node', rx: n.x, ry: n.y, resource: n.resource, ready: n.ready });
    return out;
  }

  textStyle(size, fill, weight, strokeW) {
    return { fontFamily: 'Inter, system-ui, sans-serif', fontSize: size, fontWeight: weight || '600', fill, stroke: { color: '#000000', width: strokeW || 3 }, align: 'center' };
  }

  // Crée les sprites d'un acteur : ombre, anneaux, corps, puis les éléments de l'interface.
  makeEnt(s) {
    const c = new PIXI.Container();
    const e = { c, kind: s.kind, bodyKey: null };
    e.shadow = this.addShadow(c, s.kind === 'node' ? 0.55 : 0.8, 0.5);
    if (s.kind === 'entity') {
      e.ringTeam = new PIXI.Sprite(this.T.ring); e.ringTeam.anchor.set(0.5); e.ringTeam.scale.set(0.38, 0.38); e.ringTeam.alpha = 0.85; c.addChild(e.ringTeam);
      e.ringImmune = new PIXI.Sprite(this.T.ring); e.ringImmune.anchor.set(0.5); e.ringImmune.scale.set(0.44, 0.44); e.ringImmune.visible = false; c.addChild(e.ringImmune);
      e.ringCurrent = new PIXI.Sprite(this.T.ring); e.ringCurrent.anchor.set(0.5); e.ringCurrent.visible = false; e.ringCurrent.blendMode = 'add'; c.addChild(e.ringCurrent);
    }
    e.body = new PIXI.Sprite(PIXI.Texture.EMPTY); c.addChild(e.body);
    e.states = new PIXI.Container(); c.addChild(e.states);
    this.layers.sorted.addChild(c);
    // Interface au-dessus de tout : barre de vie, nom, badge, marque de quête. Elle garde une taille
    // lisible à tout zoom : ce qui est au-dessus de la tête s'agrandit autour de la tête (uiTop), le
    // nom autour des pieds (uiFoot).
    e.ui = new PIXI.Container(); this.layers.hud.addChild(e.ui);
    e.uiTop = new PIXI.Container(); e.uiFoot = new PIXI.Container(); e.ui.addChild(e.uiTop, e.uiFoot);
    if (s.kind === 'entity') {
      e.hpBg = new PIXI.Sprite(this.T.white); e.hpBg.tint = 0x0a0d14; e.hpBg.width = 38; e.hpBg.height = 7; e.hpBg.position.set(-19, -14); e.uiTop.addChild(e.hpBg);
      e.hpFill = new PIXI.Sprite(this.T.white); e.hpFill.height = 5; e.hpFill.position.set(-18, -13); e.uiTop.addChild(e.hpFill);
      e.shieldFill = new PIXI.Sprite(this.T.white); e.shieldFill.tint = 0xdff3ff; e.shieldFill.height = 2; e.shieldFill.position.set(-18, -16); e.uiTop.addChild(e.shieldFill);
      e.hpBg.visible = e.hpFill.visible = e.shieldFill.visible = false;
    }
    e.label = null; e.badge = null; e.quest = null;
    return e;
  }

  setBody(e, key, make) {
    if (e.bodyKey === key) return;
    e.bodyKey = key;
    const t = this.painted(key, make);
    e.body.texture = t.texture; e.body.anchor.set(t.ax, t.ay); e.baseScale = t.scale;
  }

  labelOf(e, which, text, style, parent) {
    if (!text) { if (e[which]) { e[which].visible = false; } return null; }
    if (!e[which]) { e[which] = new PIXI.Text({ text, style }); e[which].anchor.set(0.5); (parent || e.ui).addChild(e[which]); }
    else if (e[which].text !== text) e[which].text = text;
    e[which].visible = true;
    return e[which];
  }

  updateEntities(now) {
    const inCombat = this.inCombat;
    const sprites = inCombat ? this.combatSprites() : this.worldSprites(now);
    const used = new Set();
    const P = this.palette, pid = this.paletteId;
    for (const s of sprites) {
      used.add(s.key);
      let e = this.ents.get(s.key);
      if (!e || e.kind !== s.kind) { if (e) this.dropEnt(e); e = this.makeEnt(s); this.ents.set(s.key, e); }
      const p = this.cellToScreen(s.rx, s.ry);
      e.c.position.set(p.x, p.y);
      e.c.zIndex = (s.rx + s.ry) * 10 + 6;
      e.c.alpha = s.alpha == null ? 1 : s.alpha;
      e.ui.position.set(p.x, p.y);
      e.ui.alpha = e.c.alpha;
      e.uiTop.position.set(0, -42 * (s.scale || 1)); e.uiTop.scale.set(this.uiK);
      e.uiFoot.scale.set(this.uiK);
      e.sx = p.x; e.sy = p.y;
      if (s.kind === 'node') {
        const def = Items.get(s.resource), kind = def && def.node ? def.node.kind : 'plante';
        this.setBody(e, `node|${pid}|${kind}`, () => this.paintNode(s));
        e.body.scale.set(e.baseScale); e.body.position.set(0, 0);
        e.c.alpha = s.ready ? 1 : 0.38;
        continue;
      }
      if (s.kind === 'npc') {
        this.setBody(e, `npc|${pid}|${s.look}`, () => this.paintNpc(s));
        e.body.scale.set(e.baseScale); e.body.position.set(0, -(s.bob || 0));
        this.labelOf(e, 'label', s.name, this.textStyle(11, '#f2e2c9', '600', 3), e.uiFoot).position.set(0, 16);
        const q = this.labelOf(e, 'quest', s.quest, this.textStyle(20, s.quest === '!' ? '#f2b134' : '#8db585', '800', 4), e.uiTop);
        if (q) q.position.set(0, -16 + Math.sin(now / 300) * 2);
        continue;
      }
      // Entité de combat ou du monde. Un Veilleur a une texture par apparence, genre et orientation :
      // elle n'est peinte qu'une fois, puis reprise du cache.
      const k = s.scale;
      // Une texture par allure de PNJ allié (look en mot, js/render.js drawNpc) ; pour un Veilleur,
      // par apparence, genre et orientation (Renderer.heroKey).
      const hero = s.shape === 'player' ? '|' + Renderer.heroKey(s) : '';
      const allure = typeof s.look === 'string' ? s.look : '';
      this.setBody(e, `body|${pid}|${s.shape}|${allure}|${s.color}|${s.glyph || ''}|${s.motif || ''}|${s.team}|${s.flash ? 1 : 0}${hero}`, () => this.paintFigure(s));
      e.body.scale.set(e.baseScale * k * Renderer.flipOf(s), e.baseScale * k);
      e.body.position.set(0, -(s.bob || 0));
      this.updateInsigne(e, s, now, k);
      e.shadow.scale.set(0.42 * 0.8 * k, 0.42 * 0.8 * k);
      e.ringTeam.tint = s.team === 'player' ? 0x4a90ff : 0xff5a5a;
      e.ringTeam.scale.set(0.38 * k, 0.38 * k);
      e.ringImmune.visible = !!s.immune;
      if (s.immune) { e.ringImmune.tint = Paint.toInt(DATA.elements[s.immune].color); e.ringImmune.scale.set(0.44 * k, 0.44 * k); }
      e.ringCurrent.visible = !!s.current;
      if (s.current) { const pulse = 0.5 + 0.5 * Math.sin(now / 180); e.ringCurrent.scale.set((0.46 + pulse * 0.05) * k, (0.46 + pulse * 0.05) * k); e.ringCurrent.alpha = 0.35 + 0.45 * pulse; e.ringCurrent.tint = 0xffffff; }
      // Aura du Veilleur (hors combat) et aura des boss
      if (s.aura || s.boss) {
        if (!e.aura) { e.aura = new PIXI.Sprite(this.T.glow); e.aura.anchor.set(0.5); e.aura.blendMode = 'add'; this.layers.glow.addChild(e.aura); }
        e.aura.position.set(p.x, p.y - 10);
        e.aura.tint = s.boss ? Paint.toInt(s.team === 'player' ? P.crystal : '#c0266e') : Paint.toInt(P.crystal);
        e.aura.scale.set(s.boss ? 0.75 : 0.42); e.aura.alpha = (s.boss ? 0.3 : 0.22) + 0.08 * Math.sin(now / 700);
      } else if (e.aura) { e.aura.destroy(); e.aura = null; }
      // États
      this.updateStates(e, s, now, k);
      // Barre de vie, nom, badge
      const showHp = s.hp != null;
      e.hpBg.visible = e.hpFill.visible = showHp;
      if (showHp) {
        e.hpFill.width = Math.max(0, 36 * Math.max(0, Math.min(1, s.hp)));
        e.hpFill.tint = s.team === 'player' ? (s.hp <= 0.25 ? 0xf07a5c : 0x8db585) : 0xf07a5c;
        e.shieldFill.visible = s.shield > 0;
        if (s.shield > 0) e.shieldFill.width = 36 * Math.min(1, s.shield);
      } else e.shieldFill.visible = false;
      const lbl = this.labelOf(e, 'label', s.label || null, this.textStyle(11, '#f2e2c9', '600', 3), e.uiFoot);
      if (lbl) lbl.position.set(0, 16);
      const bd = this.labelOf(e, 'badge', s.badge || null, this.textStyle(11, '#ffffff', '800', 4));
      if (bd) { bd.position.set(18 * k, -40 * k); bd.scale.set(this.uiK); }
    }
    for (const [key, e] of this.ents) if (!used.has(key)) { this.dropEnt(e); this.ents.delete(key); }
    // Le décor qui recouvre une figure ou une case en surbrillance s'efface à demi
    const busy = new Set();
    for (const s of sprites) if (s.kind !== 'node') busy.add(Grid.key(Math.round(s.rx), Math.round(s.ry)));
    if (inCombat) {
      const H = this.highlights;
      for (const k of H.move) busy.add(k);
      for (const k of H.range) busy.add(k);
      for (const k of H.aoe) busy.add(k);
      for (const st of H.path) busy.add(Grid.key(st.x, st.y));
      if (H.hover) busy.add(Grid.key(H.hover.x, H.hover.y));
    }
    const tact = inCombat && this.tactique;
    for (const d of this.decor) {
      d.c.visible = !tact;
      const want = d.cover.some(k => busy.has(k)) ? (inCombat ? 0.38 : 0.55) : 1;
      d.c.alpha += (want - d.c.alpha) * 0.2;
      if (d.sway && this.quality === 'haute' && !this.calme) d.body.rotation = Math.sin(now / 1900 + d.seed * 9) * 0.012;
      if (d.glow) d.glow.alpha = (d.kind === 'porte' ? 0.35 + 0.15 * Math.sin(now / 400) : 0.45 + 0.1 * Math.sin(now / 700)) * d.c.alpha;
      if (d.crystal) { d.crystal.y = -47 + (this.calme ? 0 : Math.sin(now / 900) * 3); d.crystal.scale.x = 0.5 * (0.7 + 0.3 * Math.abs(Math.sin(now / 1300))); }
    }
  }

  // L'insigne de faction : une lueur posée juste après la figure (le peintre du héros n'en sait
  // rien), cuite une fois par faction, plus vive à chaque rang. Elle vit dans le conteneur de la
  // figure, et disparaît avec lui.
  updateInsigne(e, s, now, k) {
    const ins = s.insigne;
    if (!ins) { if (e.insigne) { e.insigne.destroy(); e.insigne = null; } return; }
    const t = this.painted('insigne|' + ins.id, () => this.paintInsigne(ins.id));
    if (!e.insigne) { e.insigne = new PIXI.Sprite(t.texture); e.insigne.blendMode = 'add'; e.c.addChildAt(e.insigne, e.c.getChildIndex(e.body) + 1); }
    else if (e.insigne.texture !== t.texture) e.insigne.texture = t.texture;
    e.insigne.anchor.set(t.ax, t.ay);
    e.insigne.scale.set(t.scale * k * Renderer.sideOf(s), t.scale * k);
    e.insigne.position.set(0, -(s.bob || 0));
    const pulse = this.calme ? 1 : ins.id === 'fil' ? 0.86 + 0.14 * Math.sin(now / 700) : 0.82 + 0.18 * Math.sin(now / 170 + 1.3) * Math.sin(now / 410);
    e.insigne.alpha = Math.min(1, 0.3 + 0.06 * ins.rank) * pulse;
  }
  paintInsigne(id) {
    const OS = 2, cv = Paint.canvas(88 * OS, 84 * OS), c = cv.getContext('2d');
    c.scale(OS, OS);
    this.painter.drawInsigne(c, { x: 44, y: 76 }, { insigne: { id, rank: 10 }, facing: 1, bob: 0, scale: 1 }, 0, true);
    return { canvas: cv, ax: 44 * OS, ay: 76 * OS, scale: 1 / OS };
  }

  updateStates(e, s, now, k) {
    const st = e.states;
    if (!e.stateSprites) {
      e.stateSprites = {
        bubble: (() => { const b = new PIXI.Sprite(this.T.bubble); b.anchor.set(0.5, 0.55); b.visible = false; st.addChild(b); return b; })(),
        armor: (() => { const b = new PIXI.Sprite(this.T.shield); b.anchor.set(0.5); b.visible = false; st.addChild(b); return b; })(),
        stars: [0, 1, 2].map(() => { const b = new PIXI.Sprite(this.T.star); b.anchor.set(0.5); b.scale.set(0.5); b.visible = false; st.addChild(b); return b; }),
        lantern: (() => { const b = new PIXI.Sprite(this.painted('lanternIcon|' + this.paletteId, () => ({ canvas: Paint.lanternIcon(this.palette), ax: 12, ay: 28, scale: 1 })).texture); b.anchor.set(0.5, 0.9); b.visible = false; st.addChild(b); return b; })(),
      };
    }
    const S = e.stateSprites;
    S.bubble.visible = !!s.invuln;
    if (s.invuln) { S.bubble.position.set(0, -20 * k); S.bubble.scale.set(0.55 * k, 0.6 * k); S.bubble.alpha = 0.8 + 0.15 * Math.sin(now / 400); }
    S.armor.visible = !!s.armor;
    if (s.armor) S.armor.position.set(22 * k, -48 * k);
    for (let i = 0; i < 3; i++) {
      S.stars[i].visible = !!s.stunned;
      if (s.stunned) { const a = now / 300 + i * 2.094; S.stars[i].position.set(Math.cos(a) * 14 * k, -46 * k + Math.sin(a) * 4); S.stars[i].rotation = a; }
    }
    S.lantern.visible = !!s.lantern;
    if (s.lantern) {
      S.lantern.position.set(-18 * k, -26 * k);
      if (!e.lanternGlow) { e.lanternGlow = this.addGlow(0, 0, this.palette.glow, 0.25, 0.7); }
      e.lanternGlow.position.set(e.sx - 18 * k, e.sy - 30 * k);
    } else if (e.lanternGlow) { e.lanternGlow.destroy(); e.lanternGlow = null; }
  }

  dropEnt(e) {
    e.c.destroy({ children: true });
    e.ui.destroy({ children: true });
    if (e.aura) e.aura.destroy();
    if (e.lanternGlow) e.lanternGlow.destroy();
  }

  // ----- Effets de sorts, particules, chiffres qui montent -----

  updateFx(now) {
    if (!this.fxSprites) this.fxSprites = [];
    this.fx = this.fx.filter(f => now - f.born < f.dur);
    while (this.fxSprites.length < this.fx.length) {
      const d = new PIXI.Sprite(this.T.diamondRing); d.anchor.set(0.5); d.blendMode = 'add';
      const g = new PIXI.Sprite(this.T.glow); g.anchor.set(0.5); g.blendMode = 'add';
      this.layers.glow.addChild(g, d);
      this.fxSprites.push({ d, g });
    }
    this.fxSprites.forEach((fs, i) => {
      const f = this.fx[i];
      if (!f) { fs.d.visible = fs.g.visible = false; return; }
      const t = (now - f.born) / f.dur, p = this.cellToScreen(f.x, f.y), col = Paint.toInt(f.color);
      fs.d.visible = fs.g.visible = true;
      fs.d.position.set(p.x, p.y); fs.d.scale.set(0.25 + 0.4 * t); fs.d.alpha = 1 - t; fs.d.tint = col;
      fs.g.position.set(p.x, p.y - 6); fs.g.scale.set(0.35 + 0.3 * t); fs.g.alpha = (1 - t) * 0.9; fs.g.tint = col;
    });
    // Survol et chemin, dans l'interface
    const g = this.gHover, H = this.highlights, m = this.map;
    g.clear();
    const TW = Grid.TILE_W, TH = Grid.TILE_H;
    for (const s of H.path) { const p = this.cellToScreen(s.x, s.y); g.circle(p.x, p.y, 4.5); g.fill({ color: 0x000000, alpha: 0.4 }); g.circle(p.x, p.y, 3.2); g.fill({ color: 0xffffff, alpha: 0.9 }); }
    if (!this.inCombat && this.world && this.world.player.path.length) { for (const s of this.world.player.path) { const p = this.cellToScreen(s.x, s.y); g.circle(p.x, p.y, 2.6); g.fill({ color: 0xffffff, alpha: 0.5 }); } }
    if (H.hover && Grid.inBounds(m, H.hover.x, H.hover.y)) {
      const p = this.cellToScreen(H.hover.x, H.hover.y);
      g.poly([p.x, p.y - TH / 2, p.x + TW / 2, p.y, p.x, p.y + TH / 2, p.x - TW / 2, p.y]); g.stroke({ color: 0x00c2ff, width: 4, alpha: 0.35 });
      g.poly([p.x, p.y - TH / 2, p.x + TW / 2, p.y, p.x, p.y + TH / 2, p.x - TW / 2, p.y]); g.stroke({ color: 0xffffff, width: 2, alpha: 0.95 });
    }
  }

  spawnParticle(kind, x, y, color) {
    if (this.particles.length >= this.maxParticles + 40) return;
    const s = new PIXI.Sprite(this.T.spark); s.anchor.set(0.5); s.blendMode = 'add'; s.tint = Paint.toInt(color); this.layers.glow.addChild(s);
    const a = Math.random() * Math.PI * 2, v = 40 + Math.random() * 90;
    this.particles.push({ kind, s, x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 40, life: 0.5 + Math.random() * 0.4, max: 0.9, size: 0.5 + Math.random() * 0.5, ph: Math.random() * 6.28 });
  }

  // Lucioles d'Orsane, braises de Kaldum, poussière de cristal : elles vivent sur le plateau.
  updateParticles(now, dt) {
    const P = this.palette, m = this.map;
    const ambientCount = this.calme ? 0 : this.maxParticles;
    const bg = this.particles.filter(p => p.kind === 'ambiance').length;
    if (bg < ambientCount && Math.random() < 0.5) {
      const x = Math.random() * (m.w - 1), y = Math.random() * (m.h - 1);
      const t = m.cells[Math.round(y)] && m.cells[Math.round(y)][Math.round(x)];
      if (t != null) {
        const lava = P.lava && t === Grid.WATER;
        const p = this.cellToScreen(x, y);
        const s = new PIXI.Sprite(this.T.spark); s.anchor.set(0.5); s.blendMode = 'add'; s.tint = Paint.toInt(lava ? P.waterLight : (Math.random() < 0.25 ? P.crystal : P.fireflies)); this.layers.glow.addChild(s);
        this.particles.push({ kind: 'ambiance', s, x: p.x, y: p.y - 6 - Math.random() * 30, vx: (Math.random() - 0.5) * 8, vy: lava ? -12 - Math.random() * 14 : -2 - Math.random() * 4, life: 4 + Math.random() * 5, max: 9, size: 0.35 + Math.random() * 0.35, ph: Math.random() * 6.28 });
      }
    }
    for (const p of this.particles) {
      p.life -= dt;
      if (p.kind === 'etincelle') { p.vy += 160 * dt; p.vx *= 0.96; }
      else { p.vx += Math.sin(now / 900 + p.ph) * 6 * dt; }
      p.x += p.vx * dt; p.y += p.vy * dt;
      const tw = 0.55 + 0.45 * Math.sin(now / 230 + p.ph);
      p.s.position.set(p.x, p.y);
      p.s.alpha = Math.max(0, Math.min(1, p.life / 0.6)) * (p.kind === 'ambiance' ? tw * 0.85 : 1);
      p.s.scale.set(p.size * (p.kind === 'ambiance' ? 0.9 : 1.1));
    }
    this.particles = this.particles.filter(p => { if (p.life > 0) return true; p.s.destroy(); return false; });
  }

  // Carte de lumière : lanternes qui vacillent, cristaux, lave, aura, sorts, éclairs.
  updateLights(now) {
    const P = this.palette;
    const L = this.lightsNow = [];
    for (const l of this.lights) {
      let i = l.i;
      if (l.k === 'lanterne') i *= 0.82 + 0.18 * Paint.fbm(now / 420 + l.seed * 50, l.seed, 2, 64, 5) * 1.4;
      else if (l.k === 'cristal' || l.k === 'relais' || l.k === 'porte') i *= 0.85 + 0.15 * Math.sin(now / 900 + l.seed * 6);
      else if (l.k === 'lave') i *= 0.8 + 0.2 * Math.sin(now / 1400 + l.seed * 6.28);
      L.push({ sx: l.sx, sy: l.sy, r: l.r, c: l.c, i });
      if (l.glow) l.glow.alpha = (l.k === 'lanterne' ? 0.26 : 0.3) * i * 1.6;
    }
    this.tempLights = this.tempLights.filter(t => now < t.until);
    for (const t of this.tempLights) L.push({ sx: t.sx, sy: t.sy, r: t.r, c: t.c, i: t.i * (1 - (now - t.born) / t.dur) });
    if (this.inCombat) { const pl = this.combat.player; if (pl && pl.alive) { const p = this.cellToScreen(pl.rx, pl.ry); L.push({ sx: p.x, sy: p.y - 10, r: 85, c: Paint.rgb(P.crystal).map(v => v / 255), i: 0.3 }); } }
    else if (this.world) { const p = this.cellToScreen(this.world.player.rx, this.world.player.ry); L.push({ sx: p.x, sy: p.y - 10, r: 85, c: Paint.rgb(P.crystal).map(v => v / 255), i: 0.32 }); }
    // Rendu de la carte
    const pool = this.lmLights, K = this.painter.calque;
    while (pool.children.length < L.length) { const s = new PIXI.Sprite(this.T.glowSoft); s.anchor.set(0.5); s.blendMode = 'add'; pool.addChild(s); }
    pool.children.forEach((s, i) => {
      const l = L[i];
      if (!l) { s.visible = false; return; }
      s.visible = true;
      s.position.set((l.sx - K.x) / 2, (l.sy - K.y) / 2);
      s.scale.set(l.r / 128, l.r / 128 * 0.62);
      s.tint = Paint.toInt(Paint.hex(l.c[0] * 255, l.c[1] * 255, l.c[2] * 255));
      s.alpha = Math.min(1, l.i * 1.3);
    });
    const amb = this.ambNow = this.ambientBase;
    // Le fond de la carte de lumière et le lointain prennent la couleur d'ambiance.
    const col = Paint.toInt(Paint.hex(amb[0] * 255, amb[1] * 255, amb[2] * 255));
    if (col !== this.lmCol) { this.lmCol = col; this.lmBg.tint = col; for (const s of this.farSprites || []) s.tint = col; }
    this.app.renderer.render({ container: this.lmc, target: this.lm, clear: true });
  }

  lightAt(sx, sy) {
    const a = this.ambNow || this.ambientBase;
    let r = a[0], g = a[1], b = a[2];
    for (const l of this.lightsNow) {
      const dx = sx - l.sx, dy = (sy - l.sy) / 0.62;
      const d = Math.sqrt(dx * dx + dy * dy);
      if (d >= l.r) continue;
      const f = 1 - d / l.r, k = f * f * l.i * 0.35;
      r += l.c[0] * k; g += l.c[1] * k; b += l.c[2] * k;
    }
    const cl = v => Math.max(0.7, Math.min(1, v));
    return Paint.toInt(Paint.hex(cl(r) * 255, cl(g) * 255, cl(b) * 255));
  }

  tintAll(now) {
    for (const d of this.decor) d.body.tint = this.lightAt(d.c.x, d.c.y);
    for (const e of this.ents.values()) { const t = this.lightAt(e.sx, e.sy); e.body.tint = t; }
    for (const c of this.tempRocks.values()) c.children[1].tint = this.lightAt(c.x, c.y);
  }

  updateFloats(now) {
    this.floats = this.floats.filter(f => now - f.born < 900);
    while (this.floatPool.length < this.floats.length) { const t = new PIXI.Text({ text: '', style: this.textStyle(18, '#ffffff', '800', 4) }); t.anchor.set(0.5); this.floatLayer.addChild(t); this.floatPool.push(t); }
    this.floatPool.forEach((t, i) => {
      const f = this.floats[i];
      if (!f) { t.visible = false; return; }
      const k = (now - f.born) / 900, p = this.cellToScreen(f.x, f.y), u = this.uiK;
      t.visible = true;
      if (t.text !== f.text) t.text = f.text;
      if (t.style.fill !== f.color) t.style.fill = f.color;
      t.position.set(p.x, p.y - 48 - k * 30 * u);
      t.alpha = 1 - k * k;
      t.scale.set((1 + (1 - Math.min(1, k * 6)) * 0.4) * u);
    });
  }
}
