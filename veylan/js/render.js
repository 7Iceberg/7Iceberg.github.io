// Rendu du plateau sur un canvas 2D, pour l'exploration et le combat. Tout est dessiné par le code,
// d'après la planche de direction artistique : fantasy épique au crépuscule, or ancien et cristal.
//
// Organisation :
//  - la toile remplit la scène ; tout se dessine en coordonnées du monde (cellToScreen, origin, W, H)
//    à travers la caméra (js/camera.js), une seule transformation par image ;
//  - la carte est une scène pleine, à la manière d'une carte de Dofus Touch : autour du plateau
//    jouable, ses alentours (js/entourage.js) continuent le sol de la zone dans toutes les
//    directions, avec leur décor, les chemins qui sortent par les bords, des parois de roche et
//    l'obscurité sous terre, une terrasse ou une vallée au bord d'un vide. La caméra ne montre
//    jamais au-delà de ce qui est peint : ni ciel, ni falaise d'île ;
//  - des calques fixes, refaits à chaque changement de carte (et exécutés tout de suite) : le
//    proche (this.static, le plateau et ses abords à la densité des calques : sols peints, flaques
//    de lumière, décor cuit) et, sous lui, les bandes du lointain (this.lointain, les alentours
//    autour de lui jusqu'aux bords de ce que la vue peut montrer, moins denses) ;
//  - des sprites de décor précalculés (arbres, rochers, murs, lanternes, relais), triés avec les
//    personnages à chaque image : l'avant cache l'arrière, et s'efface s'il masque une figure ;
//  - une couche lumineuse à demi-résolution (bloom), floutée puis ajoutée en mode additif ;
//  - ce qui vit : eau et lave, lucioles, éclats de cristal, braises, sorts ;
//  - le vignettage, à la taille de l'écran, puis les étiquettes, à une taille lisible à tout zoom.
// Deux réglages de qualité : « haute », et « basse » (sans bloom, moins de particules, 30 images
// par seconde). Le réglage se choisit d'après l'appareil, se force avec ?qualite=haute|basse et
// redescend tout seul si le dessin d'une image devient trop lent.
class Renderer {
  // `opts.painterOnly` : le rendu ne s'abonne à rien et ne dessine pas ; il sert de peintre au
  // rendu WebGL (js/render-gl.js), qui lui demande le calque fixe, les décors et les figures.
  constructor(canvas, combat, world, opts) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.combat = combat;
    this.world = world || null;
    const m = this.map;
    // Le monde : le rectangle du plateau (W × H). La case (0, h-1) est la plus à gauche : son centre
    // doit y tenir. Les alentours débordent de ce rectangle de tous les côtés.
    this.origin = { x: (m.h - 1) * (Grid.TILE_W / 2) + Grid.TILE_W / 2 + 8, y: 84 };
    this.W = (m.w + m.h) * (Grid.TILE_W / 2) + 16;
    this.H = (m.w + m.h) * (Grid.TILE_H / 2) + 110 + Renderer.CLIFF;
    // La hauteur des calques du plateau (couche lumineuse, bloom) : le rectangle W × H suffit, aucune
    // falaise ne pend plus sous le plateau.
    this.SH = this.H;
    // Le calque proche (this.calque : le plateau et ses abords) et ce que la caméra peut montrer
    // (this.alentours : le proche et les bandes du lointain autour de lui), en coordonnées du monde.
    this.calque = { x: -Renderer.ABORDS, y: -Renderer.ABORDS, w: this.W + 2 * Renderer.ABORDS, h: this.H + 2 * Renderer.ABORDS };
    this.alentours = null;
    this.lointain = [];
    this.dpr = Math.min(2, Math.max(1, (typeof devicePixelRatio === 'number' && devicePixelRatio) || 1));
    // Densité des calques en cache (plateau, décors) : deux pixels par unité du monde (les textures
    // de sol n'ont pas plus de détail), trois sur un grand écran dense (densite). Le lointain suit
    // l'ajustement de plus près (densiteLointain).
    this.cs = 2;
    this.co = 1;
    this.floats = [];
    this.fx = [];
    this.animations = [];
    this.highlights = { move: new Set(), range: new Set(), blocked: new Set(), aoe: new Set(), path: [], hover: null };
    // Repère du guide (js/guide.js) : { cell } | { group } | { entity } | { edge: 'n'|'s'|'e'|'w' }.
    this.guideCue = null;
    // Vue tactique du combat : plateau à plat, sans décor ni alentours (bouton du panneau de jeu).
    this.tactique = false;
    this.static = null;
    this.staticKey = null;
    this.lights = [];
    this.decor = [];
    // Qualité, mouvement réduit et vie du décor.
    this.forcedQuality = Renderer.qualityParam();
    this.quality = this.forcedQuality || Renderer.detectQuality();
    this.reducedMotion = false;
    try {
      const mq = matchMedia('(prefers-reduced-motion: reduce)');
      this.reducedMotion = mq.matches;
      if (mq.addEventListener) mq.addEventListener('change', e => { this.reducedMotion = e.matches; });
    } catch (e) { /* pas de matchMedia */ }
    this.particles = [];
    this.sparks = [];
    this.shots = [];
    this.spawnAcc = {};
    this.lastNow = performance.now();
    this.lastDraw = 0;
    this.perf = { samples: new Float32Array(90), i: 0, n: 0, avg: 0, slow: 0 };
    this.painterOnly = !!(opts && opts.painterOnly);
    if (this.painterOnly) return;
    // La toile remplit la scène ; la caméra y place le monde (le repli du rendu WebGL partage la sienne).
    this.camera = (opts && opts.camera) || new Camera(canvas);
    this.camera.setBounds(this.cameraBounds());
    this.watchSize();
    combat.on('animMove', d => this.animateMove(d));
    combat.on('animCast', d => this.animateCast(d));
    combat.on('animTrap', () => Util.delay(180));
    combat.on('fx', d => { for (const c of d.cells) this.fx.push({ x: c.x, y: c.y, color: d.color, born: performance.now(), dur: 420 }); });
    combat.on('float', d => this.floats.push({ x: d.x, y: d.y, text: d.text, color: d.color, born: performance.now() }));
    requestAnimationFrame(() => this.frame());
  }

  static get CLIFF() { return 40; }
  // Les abords du plateau peints dans le calque proche, au-delà du rectangle W × H, et la largeur
  // du fondu de son bord dans le lointain (en unités du monde).
  static get ABORDS() { return 64; }
  static get FONDU() { return 44; }

  // Le plus petit rectangle qui contient a et b.
  static union(a, b) {
    const x = Math.min(a.x, b.x), y = Math.min(a.y, b.y);
    return { x, y, w: Math.max(a.x + a.w, b.x + b.w) - x, h: Math.max(a.y + a.h, b.y + b.h) - y };
  }

  // ----- Veilleurs : apparence et orientation -----
  // Les quatre diagonales de l'écran, comme Grid.facing les nomme.
  static get FACINGS() { return ['se', 'sw', 'nw', 'ne']; }

  // L'apparence à dessiner : celle du personnage si elle est complète, sinon celle de sa classe
  // (gardée par couleur : le rendu Canvas la demande à chaque image).
  static heroLook(s) {
    const L = s.look;
    if (L && Number.isInteger(L.tete) && Array.isArray(L.couleurs) && L.couleurs.length === 6) return L;
    const cache = Renderer._looks || (Renderer._looks = new Map());
    let d = cache.get(s.color);
    if (!d) { d = Util.defaultLook(s.color); cache.set(s.color, d); }
    return d;
  }

  // La clé d'une figure de Veilleur pour les textures du rendu WebGL : apparence, genre, orientation.
  static heroKey(s) {
    const L = Renderer.heroLook(s);
    return `${L.tete}${L.couleurs.join('')}|${s.gender === 'm' ? 'm' : 'f'}|${Renderer.FACINGS.includes(s.facing) ? s.facing : 'se'}`;
  }

  // Le retournement horizontal d'une figure : un monstre garde son ±1 ; un Veilleur porte une
  // diagonale et se retourne lui-même (drawHero).
  static flipOf(s) { return typeof s.facing === 'number' ? s.facing : 1; }
  // Le côté vers lequel regarde la figure : ±1 pour un monstre ; pour un Veilleur, -1 quand sa
  // diagonale regarde vers la gauche (sw, nw). L'insigne de faction le suit.
  static sideOf(s) { return typeof s.facing === 'number' ? s.facing : (s.facing === 'sw' || s.facing === 'nw' ? -1 : 1); }

  // Avant son premier pas d'un combat, un Veilleur regarde l'ennemi le plus proche.
  static faceFoe(cb, e) {
    let best = null, d = Infinity;
    for (const m of cb.entities) {
      if (!m.alive || m.team === e.team) continue;
      const dd = Math.abs(m.x - e.x) + Math.abs(m.y - e.y);
      if (dd < d) { d = dd; best = m; }
    }
    return (best && Grid.facing(best.x - e.x, best.y - e.y)) || 'se';
  }

  get map() { return this.world ? this.world.map : this.combat.map; }
  get inCombat() { return this.world ? this.world.showCombat : true; }

  // ----- Qualité -----

  static qualityParam() {
    try {
      const q = new URLSearchParams(location.search).get('qualite');
      return q === 'haute' || q === 'basse' ? q : null;
    } catch (e) { return null; }
  }

  // Haute qualité par défaut ; basse sur un petit écran à peu de cœurs ou à très forte densité,
  // et sur les appareils les plus modestes.
  static detectQuality() {
    const nav = typeof navigator !== 'undefined' ? navigator : {};
    const cores = nav.hardwareConcurrency || 4;
    const mem = nav.deviceMemory || 4;
    const dpr = (typeof devicePixelRatio === 'number' && devicePixelRatio) || 1;
    let side = 1024;
    try { side = Math.min(screen.width, screen.height); } catch (e) { /* pas d'écran */ }
    if (cores <= 2 || mem <= 2) return 'basse';
    if (side <= 540 && (cores <= 4 || dpr >= 3)) return 'basse';
    return 'haute';
  }

  setQuality(q) {
    this.quality = q === 'basse' ? 'basse' : 'haute';
    if (this.particles.length > this.maxParticles) this.particles.length = this.maxParticles;
  }

  get maxParticles() { return this.quality === 'haute' ? 72 : 24; }

  // Temps moyen de draw() sur les dernières images ; en qualité automatique, on redescend si c'est lent.
  measure(ms) {
    const P = this.perf;
    P.samples[P.i] = ms; P.i = (P.i + 1) % P.samples.length; P.n = Math.min(P.samples.length, P.n + 1);
    let s = 0; for (let i = 0; i < P.n; i++) s += P.samples[i];
    P.avg = s / P.n;
    P.last = ms;
    if (!this.forcedQuality && this.quality === 'haute' && P.n === P.samples.length) {
      P.slow = P.avg > 26 ? P.slow + 1 : 0;
      if (P.slow > 60) { this.setQuality('basse'); P.slow = 0; }
    }
  }

  // Cadence réelle (images par seconde), qui compte aussi la rastérisation : si elle reste sous
  // 24 images par seconde pendant trois secondes, on passe en basse qualité.
  watchRate(now) {
    const P = this.perf;
    if (P.prev) {
      const dt = Math.min(120, now - P.prev);
      P.rate = P.rate ? P.rate * 0.95 + dt * 0.05 : dt;
      if (!this.forcedQuality && this.quality === 'haute' && dt < 100) {
        P.slowFrames = P.rate > 42 ? (P.slowFrames || 0) + 1 : 0;
        if (P.slowFrames > 75) { this.setQuality('basse'); P.slowFrames = 0; }
      }
    }
    P.prev = now;
  }

  // ----- Palettes -----

  // Les couleurs historiques (light, dark, ink, lantern, glow, floorA...) et l'ambiance de chaque région.
  static get PALETTES() {
    if (Renderer._palettes) return Renderer._palettes;
    const orsane = {
      id: 'orsane',
      light: '#E8E1D3', dark: '#9FA7B8', ink: '#1E2540', lantern: '#F2B134', glow: '#FFE7A3',
      floorA: '#4F7D4C', floorB: '#5B8A55', path: '#A68A62', water: '#3A86C4', waterDeep: '#1D4F86', crown: '#346A48', crownLight: '#76A35E', trunk: '#4A3426', hole: '#05070E', bg: ['#16223f', '#060a14'],
      sky: { top: '#050a1d', high: '#0f1c46', mid: '#253a78', low: '#5a68a8', glow: '#ffae78', haze: '#56659e', abyss: '#1e2b5c', deep: '#050918', cloud: '#34437e', cloudLit: '#ffc496', cloudCool: '#c4d4ff', seaDark: '#26326a', seaLit: '#9eaedc', nebula: '#8a5ce0', nebula2: '#2f6fe0', far: '#4f5f98', mid2: '#2a3768', near: '#18214a', window: '#ffc672', beam: '#8fe9ff', beamPower: 0.85 },
      grade: ['#c3cdf0', '#9ca8d6'],
      fog: '#6f86c0',
      grass: ['#14302a', '#22463a', '#356546', '#558c52', '#88b465', '#c3d98a'],
      dirt: ['#33291f', '#54442f', '#7a6246', '#a28763', '#c9b38a'],
      gravel: ['#2a2622', '#45403a', '#67604f', '#8d846c', '#b3a88a'],
      ardoise: ['#1b1d26', '#282b36', '#383c49', '#4d5160', '#666a7a'],
      stone: ['#6a6358', '#968c7a', '#bdb19a', '#dcd1b9', '#f3e9d4'],
      vein: ['#4a2e0e', '#d6ae62', '#ffe6a6'],
      cobble: ['#4a4646', '#6e665e', '#968b7a', '#bcae96', '#ddd0b6'],
      flag: ['#2c2b36', '#413f4d', '#585465', '#736d7d', '#968f9c'],
      rock: ['#20243a', '#353b54', '#525a74', '#7a819a', '#a9aec0', '#d6d8e2'],
      moss: ['#26462f', '#3f6b40', '#6e9a55'],
      cliff: ['#0b0f1f', '#181e35', '#283048', '#3c435c', '#575d76', '#7a7e94'],
      leaves: ['#0d2226', '#153532', '#1f4a3d', '#2f6646', '#4d8a52', '#86b468', '#c6dc8e'],
      bark: ['#171110', '#36271e', '#5a402f', '#83654a'],
      waterRamp: ['#06162e', '#0c2c56', '#174d84', '#2f78b4', '#79bde8'],
      lava: null,
      crystal: ['#051a33', '#0a3f78', '#0b7cc6', '#00c2ff', '#8fe9ff', '#f0fdff'],
      crystals: 0.05,
      rim: 'rgba(176,224,255,0.6)',
      particles: { luciole: 2.4, eclat: 0.7, poussiere: 0.5 },
      tree: 'feuillu', wall: 'calcaire', column: 'colonne', lamp: 'lanterne', ground: 'herbe', roots: true,
      tint: 'rgba(36,46,112,0.2)',
    };
    const kaldum = Object.assign({}, orsane, {
      id: 'kaldum',
      light: '#7A6A5E', dark: '#3E3230', ink: '#170f12', lantern: '#FF6A2B', glow: '#FFB37A',
      floorA: '#4A3F3B', floorB: '#544845', path: '#6E5E55', water: '#FF7A2B', waterDeep: '#C0441A', crown: '#5A4A3E', crownLight: '#7A6453', trunk: '#3A2E28', hole: '#050304', bg: ['#2a1c18', '#120c0a'],
      sky: { top: '#060309', high: '#140b19', mid: '#2e1828', low: '#6a2e2e', glow: '#ff7a36', haze: '#5a2c30', abyss: '#2a131a', deep: '#050203', cloud: '#3a2028', cloudLit: '#ff9a58', cloudCool: '#b896b4', seaDark: '#2a1418', seaLit: '#8a5056', nebula: '#9a3a6a', nebula2: '#4a2a8a', far: '#5a3038', mid2: '#2e1a20', near: '#180c10', window: '#ff9a40', beam: '#8fe9ff', beamPower: 0.5 },
      grade: ['#c6bac4', '#988a98'],
      fog: '#5a3238',
      gravel: ['#151012', '#241c1b', '#3a2e2a', '#54443c', '#74604f'],
      ardoise: ['#111014', '#1b191f', '#26232b', '#36323b', '#4a4550', '#625c68'],
      stone: ['#2a2930', '#3d3c43', '#545259', '#6d6a6f', '#8b8686'],
      vein: ['#3a0c02', '#ff6a2b', '#ffd08a'],
      cobble: ['#1c1a20', '#2b2830', '#3d393f', '#524d52', '#6a6466'],
      flag: ['#1d1b20', '#2b282e', '#3b373e', '#4e4950', '#666066'],
      rock: ['#100e13', '#1c1920', '#2c2830', '#433c45', '#5f565e', '#7f7479'],
      moss: null,
      cliff: ['#070508', '#120e12', '#1f191e', '#2f272c', '#443a3f', '#5b4f54'],
      bark: ['#0f0b0b', '#241b19', '#3d2e28', '#574137'],
      waterRamp: null,
      lava: ['#240501', '#6e1604', '#b8360c', '#f26a1a', '#ffb544', '#fff0b0'],
      crystals: 0.035,
      rim: 'rgba(255,170,120,0.5)',
      particles: { braise: 5.5, eclat: 0.35, cendre: 1.0 },
      tree: 'basalte', wall: 'fer', column: 'basalte', lamp: 'brasero', ground: 'ardoise', roots: false,
      tint: 'rgba(40,18,30,0.12)',
    });
    const thessa = Object.assign({}, orsane, {
      id: 'thessa', ink: '#14303a', lantern: '#35D6C8', glow: '#9FF0E6',
      sky: Object.assign({}, orsane.sky, { mid: '#0f2f4e', low: '#2b5a7a', glow: '#e0a070', haze: '#3a6a8a', abyss: '#0b2236', cloudLit: '#f0b080', seaLit: '#8ec0d8', nebula: '#3a8ac0', nebula2: '#2a5ad0' }),
      grade: ['#b6d0e4', '#8aa6c4'],
      grass: ['#13302e', '#1f4a40', '#33664f', '#538a62', '#88b48a', '#c4dcae'],
      stone: ['#6d6a62', '#9a9584', '#c3bba4', '#ded5bf', '#f1ead8'],
      vein: ['#3a200c', '#c8834a', '#f5c08a'],
      particles: { luciole: 1.2, eclat: 0.6, poussiere: 0.8 },
    });
    const lisiere = Object.assign({}, orsane, {
      id: 'lisiere', ink: '#1d1828', lantern: '#D08CFF', glow: '#F0D6FF',
      sky: Object.assign({}, orsane.sky, { mid: '#1f1846', low: '#3d3070', glow: '#c07ac0', haze: '#4a3a7a', cloudLit: '#d890c8', nebula: '#a66cff' }),
      grade: ['#c0b6e0', '#9488c0'],
      grass: ['#1b2230', '#283244', '#3a4658', '#566275', '#7c8698', '#b0b8c4'],
      crystals: 0.12,
      particles: { eclat: 1.6, voile: 1.0, poussiere: 0.4 },
    });
    const basvoiles = Object.assign({}, orsane, {
      id: 'basvoiles', ink: '#0c0814', lantern: '#C0266E', glow: '#FF7DB0',
      sky: Object.assign({}, orsane.sky, { top: '#030108', high: '#0c0620', mid: '#24124a', low: '#4a2470', glow: '#a66cff', haze: '#3a2260', abyss: '#140a26', cloud: '#2a1848', cloudLit: '#c070ff', seaDark: '#1a0e30', seaLit: '#7a5ab0', nebula: '#a66cff', nebula2: '#c0266e', beamPower: 1 }),
      grade: ['#b8a6dc', '#7e6aa8'],
      grass: ['#120c1c', '#1d1430', '#2c2046', '#3f3060', '#5a4680', '#8068a8'],
      rock: ['#0e0a16', '#1c1430', '#2e2448', '#463a66', '#665a88', '#9488b0'],
      cliff: ['#06030c', '#0f0a1c', '#1a1230', '#281e44', '#3c305c', '#564a78'],
      crystal: ['#14062a', '#3a1a78', '#6a3ad0', '#a66cff', '#d6b8ff', '#f8f0ff'],
      crystals: 0.22,
      rim: 'rgba(200,160,255,0.6)',
      particles: { eclat: 1.2, voile: 2.2 },
      tree: 'mort', roots: false,
    });
    const lab = Object.assign({}, orsane, { id: 'lab', particles: { luciole: 1.2, eclat: 0.9, poussiere: 0.4 } });
    Renderer._palettes = { orsane, kaldum, thessa, lisiere, basvoiles, lab };
    return Renderer._palettes;
  }

  get paletteId() {
    const id = this.world && this.world.zone ? this.world.zone.palette : 'lab';
    return Renderer.PALETTES[id] ? id : 'lab';
  }

  get palette() { return Renderer.PALETTES[this.paletteId]; }

  // Le genre de lieu décide des matières : ville (pavés et dalles veinées d'or), donjon, ou nature.
  get site() {
    const w = this.world;
    if (!w || !w.mapDef) return 'sauvage';
    if (w.mapDef.room) return 'donjon';
    const z = (w.zone && w.zone.id) || '';
    return /_(ville|cimes)$/.test(z) ? 'ville' : 'sauvage';
  }

  cellToScreen(x, y) { return Grid.toScreen(x, y, this.origin); }
  screenToCell(sx, sy) { return Grid.fromScreen(sx, sy, this.origin); }

  // Un sommet de la grille (coin de case), en coordonnées de case : (0, 0) est le coin du haut.
  vx(u, v) { return { x: this.origin.x + (u - v) * (Grid.TILE_W / 2), y: this.origin.y - Grid.TILE_H / 2 + (u + v) * (Grid.TILE_H / 2) }; }

  // Coordonnées du monde sous un événement souris ou tactile, à travers la caméra : screenToCell
  // les prend telles quelles.
  canvasPoint(evt) {
    const src = evt.touches && evt.touches[0] ? evt.touches[0] : (evt.changedTouches && evt.changedTouches[0] ? evt.changedTouches[0] : evt);
    return this.camera.clientToWorld(src.clientX, src.clientY);
  }

  // Un point du monde en coordonnées client (de la fenêtre), pour poser un élément du DOM dessus ;
  // l'événement « veylan:camera » dit quand le replacer.
  worldToClient(x, y) { return this.camera.worldToClient(x, y); }

  // Ce que la caméra cadre (js/camera.js) : le cœur, toutes les cases où l'on peut se tenir, avec la
  // place d'une figure au-dessus de la plus haute (« ajuster » le fait tenir dans la part libre de
  // la scène, aussi grand que possible) ; et les alentours peints, que la vue ne quitte jamais.
  cameraBounds() {
    const core = this.coreBox();
    return { x: core.x, y: core.y, w: core.w, h: core.h, core, painted: this.alentours || null };
  }

  coreBox() {
    const m = this.map, TW = Grid.TILE_W / 2, TH = Grid.TILE_H / 2;
    let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
    for (let y = 0; y < m.h; y++) for (let x = 0; x < m.w; x++) {
      if (m.cells[y][x] !== Grid.FLOOR || (this.voidMap && this.voidMap[y][x])) continue;
      const p = this.cellToScreen(x, y);
      x0 = Math.min(x0, p.x - TW); x1 = Math.max(x1, p.x + TW); y0 = Math.min(y0, p.y - TH); y1 = Math.max(y1, p.y + TH);
    }
    if (x0 === Infinity) { const t = this.vx(0, 0), r = this.vx(m.w, 0), b = this.vx(m.w, m.h), l = this.vx(0, m.h); x0 = l.x; x1 = r.x; y0 = t.y; y1 = b.y; }
    // Une figure debout dépasse sa case d'une cinquantaine d'unités ; son nom, un peu plus.
    return { x: x0 - 6, y: y0 - 58, w: x1 - x0 + 12, h: y1 - y0 + 58 + 8 };
  }

  // Les alentours qu'il faut peindre pour la vue : de quoi couvrir la scène au zoom le plus large
  // que la caméra permet (minK fois l'ajustement), où que l'ajustement la pose, centré sur le cœur.
  // Sur un écran tactile, on compte aussi la barre de combat qui couvre le bas de la scène (le cœur
  // remonte au-dessus d'elle). Arrondi au pas de 64 unités : une petite variation de taille ne
  // repeint rien.
  wantedSurroundings() {
    const cam = this.camera, core = this.coreBox();
    const cx = core.x + core.w / 2, cy = core.y + core.h / 2;
    let hx = core.w / 2 + 160, hy = core.h / 2 + 160;
    if (cam && cam.vw) {
      let coarse = false;
      try { coarse = matchMedia('(pointer: coarse)').matches; } catch (e) { /* pas de matchMedia */ }
      const ins = cam.insets, cases = [ins];
      if (coarse) cases.push({ top: ins.top, right: ins.right, left: ins.left, bottom: Math.max(ins.bottom, cam.vh * 0.24) });
      const m = Math.min(cam.vw, cam.vh) * cam.margin;
      for (const i of cases) {
        const fw = Math.max(1, cam.vw - i.left - i.right), fh = Math.max(1, cam.vh - i.top - i.bottom);
        const z = Math.max(0.05, Math.min((fw - 2 * m) / core.w, (fh - 2 * m) / core.h)) * cam.minK;
        hx = Math.max(hx, cam.vw / z / 2 + Math.abs(i.left - i.right) / z / 2 + 48);
        hy = Math.max(hy, cam.vh / z / 2 + Math.abs(i.top - i.bottom) / z / 2 + 48);
      }
    } else { hx = Math.max(hx, 900); hy = Math.max(hy, 640); }
    hx = Math.min(2400, Math.ceil(hx / 64) * 64); hy = Math.min(2400, Math.ceil(hy / 64) * 64);
    return { x: Math.floor(cx - hx), y: Math.floor(cy - hy), w: 2 * hx, h: 2 * hy };
  }

  // La densité du lointain : ce que l'ajustement en montre à l'écran (entre 0,75 et 1,5 pixel par
  // unité du monde), sans dépasser 4096 pixels de côté (textures WebGL) ni 8 millions de pixels
  // pour ses bandes.
  densiteLointain(E, bandes) {
    const cam = this.camera;
    const z = cam && cam.vw ? cam.fitZoom * this.dpr : 1;
    let k = Math.max(0.75, Math.min(1.5, Math.round(z * 4) / 4));
    let aire = 0;
    for (const b of bandes || [E]) { aire += b.w * b.h; k = Math.min(k, 4096 / b.w, 4096 / b.h); }
    return Math.max(0.25, Math.min(k, Math.sqrt(8e6 / Math.max(1, aire))));
  }

  // Les bandes du lointain : ce que la caméra peut montrer (E) moins l'intérieur du calque proche,
  // qui les recouvre (son bord fondu passe au-dessus d'elles). Elles se chevauchent de quelques
  // unités : pas de couture entre elles.
  bandes(E) {
    const K = this.calque, f = Renderer.FONDU, o = 4;
    const kx0 = K.x + f, ky0 = K.y + f, kx1 = K.x + K.w - f, ky1 = K.y + K.h - f;
    const ex1 = E.x + E.w, ey1 = E.y + E.h, out = [];
    if (E.y < ky0) out.push({ x: E.x, y: E.y, w: E.w, h: ky0 - E.y + o });
    if (ey1 > ky1) out.push({ x: E.x, y: ky1 - o, w: E.w, h: ey1 - ky1 + o });
    const y0 = Math.max(E.y, ky0) - o, y1 = Math.min(ey1, ky1) + o;
    if (y1 > y0) {
      if (E.x < kx0) out.push({ x: E.x, y: y0, w: kx0 - E.x + o, h: y1 - y0 });
      if (ex1 > kx1) out.push({ x: kx1 - o, y: y0, w: ex1 - kx1 + o, h: y1 - y0 });
    }
    return out;
  }

  // La toile suit la taille de la scène (fenêtre, rotation, plein écran, colonne voisine) : sa
  // mémoire d'image vaut sa taille CSS fois la densité de l'écran (2 au plus). Redessinée tout de
  // suite, pour ne jamais montrer une toile vidée par le changement de taille.
  watchSize() {
    const fit = () => {
      const w = this.canvas.clientWidth, h = this.canvas.clientHeight;
      if (!w || !h) return;
      this.dpr = Math.min(2, Math.max(1, (typeof devicePixelRatio === 'number' && devicePixelRatio) || 1));
      const bw = Math.round(w * this.dpr), bh = Math.round(h * this.dpr);
      const sized = this.canvas.width !== bw || this.canvas.height !== bh;
      if (sized) { this.canvas.width = bw; this.canvas.height = bh; }
      this.camera.setViewport(w, h);
      this.suivreDensite(this.camera.fitZoom, this.dpr);
      this.suivreAlentours();
      if (sized && this.static) { this.lastDraw = performance.now(); this.draw(this.lastDraw); }
    };
    this.resize = fit;
    if (typeof ResizeObserver === 'function') new ResizeObserver(fit).observe(this.canvas.parentElement || this.canvas);
    addEventListener('resize', fit);
    fit();
  }

  // La densité des calques en cache suit l'ajustement, jamais le zoom du moment : un zoom ne repeint
  // rien. Trois pixels par unité du monde quand l'ajustement en montre plus de 2,2 (écran rétine,
  // grande fenêtre) ; deux sur téléphone et tablette (mémoire). Avant le premier calque, la densité
  // se prend tout de suite ; ensuite, le calque fixe est refait une fois la taille posée.
  static densite(fitZoom, dpr) {
    let coarse = false;
    try { coarse = matchMedia('(pointer: coarse)').matches; } catch (e) { /* pas de matchMedia */ }
    return !coarse && fitZoom * dpr > 2.2 ? 3 : 2;
  }

  suivreDensite(fitZoom, dpr) {
    const want = Renderer.densite(fitZoom, dpr);
    clearTimeout(this.densiteTimer);
    if (want === this.cs) return;
    if (!this.static) { this.cs = want; return; }
    this.densiteTimer = setTimeout(() => { this.cs = want; this.static = null; }, 500);
  }

  // Les alentours suivent la taille de la scène : si la vue peut montrer plus que ce qui est peint
  // (rotation, fenêtre agrandie, barre de combat), ou si le lointain est bien moins dense que l'écran,
  // on repeint ses bandes une fois la taille posée (le calque proche ne change pas). En attendant, la
  // caméra ne sort pas de ce qui est peint.
  suivreAlentours() {
    clearTimeout(this.alentoursTimer);
    const E = this.alentours;
    if (!E || !this.static) return;
    const want = this.wantedSurroundings();
    const inside = want.x >= E.x && want.y >= E.y && want.x + want.w <= E.x + E.w && want.y + want.h <= E.y + E.h;
    if (inside && this.densiteLointain(E, this.bandes(E)) <= this.co * 1.34) return;
    this.alentoursTimer = setTimeout(() => this.refaireLointain(), 300);
  }

  // De nouvelles bandes du lointain pour la vue du moment (le hasard des alentours tient à la
  // position : ce qui était peint ne change pas), puis la caméra prend leurs bornes.
  refaireLointain() {
    if (!this.static || !this.entourage || this.staticMap !== this.map) return;
    const old = this.alentours, want = this.wantedSurroundings();
    // On ne rétrécit pas : une vue qui revient à sa taille garde ce qui est déjà peint.
    const E = old && want.x >= old.x && want.y >= old.y && want.x + want.w <= old.x + old.w && want.y + want.h <= old.y + old.h ? old : want;
    this.alentours = E;
    const zone = Renderer.union(E, this.calque), g = this.entourage.zone;
    if (zone.x < g.x || zone.y < g.y || zone.x + zone.w > g.x + g.w || zone.y + zone.h > g.y + g.h) this.entourage = new Entourage(this, this.palette, this.res, zone);
    this.paintLointain();
    if (this.camera) this.camera.setBounds(this.cameraBounds());
  }

  // Le lointain : les alentours en bandes autour du calque proche, à la densité du lointain.
  paintLointain() {
    const E = this.alentours, ent = this.entourage, list = this.bandes(E);
    const co = this.co = this.densiteLointain(E, list);
    this.lointain = list.map(b => {
      const cv = Renderer.canvas(b.w * co, b.h * co), f = cv.getContext('2d');
      // La bande mesure exactement sa toile : pas de demi-pixel étiré.
      b.w = cv.width / co; b.h = cv.height / co;
      f.setTransform(co, 0, 0, co, -b.x * co, -b.y * co);
      ent.paintGround(f, b);
      ent.gradeGround(f, b);
      ent.paintDecor(f, b, []);
      ent.paintAir(f, b);
      Renderer.flush(cv);
      return Object.assign(b, { cv });
    });
    this.lointainV = (this.lointainV || 0) + 1;
  }

  // La caméra : le monde mis à l'échelle et décalé dans la toile.
  worldTransform(c) {
    const cam = this.camera, k = cam.zoom * this.dpr;
    c.setTransform(k, 0, 0, k, cam.x * this.dpr, cam.y * this.dpr);
  }

  animateMove({ entity, to, teleport, fast }) {
    return new Promise(resolve => {
      const from = { x: entity.rx, y: entity.ry };
      const dur = teleport ? 200 : (fast ? 90 : 140);
      const start = performance.now();
      // Un Veilleur qui marche regarde où il va ; poussé ou en repli, il garde son regard.
      if (!teleport && !fast && entity.shape === 'player') entity.facing = Grid.facing(to.x - from.x, to.y - from.y) || entity.facing;
      if (teleport) this.burst(from.x, from.y, '#8fe9ff', 6);
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
          }
          if (t >= 1) { entity.alpha = 1; if (teleport) this.burst(to.x, to.y, '#8fe9ff', 6); resolve(); return true; }
          return false;
        },
      });
    });
  }

  // Un projectile lumineux part du lanceur, puis les cases touchées s'allument à son arrivée.
  animateCast({ spell, cells, entity }) {
    const color = DATA.elements[spell.element].color;
    const now = performance.now();
    let delay = 0;
    if (entity && cells && cells.length) {
      let tx = 0, ty = 0;
      for (const c of cells) { tx += c.x; ty += c.y; }
      tx /= cells.length; ty /= cells.length;
      const fx = entity.rx != null ? entity.rx : entity.x, fy = entity.ry != null ? entity.ry : entity.y;
      if (Math.abs(tx - fx) + Math.abs(ty - fy) >= 1) {
        this.shots.push({ fx, fy, tx, ty, color, born: now, dur: 180 });
        delay = 150;
      }
    }
    for (const c of cells) this.fx.push({ x: c.x, y: c.y, color, born: now + delay, dur: 520 });
    return Util.delay(240);
  }

  frame() {
    const now = performance.now();
    this.watchRate(now);
    if (this.onTick) this.onTick(now);
    this.animations = this.animations.filter(a => !a.tick(now));
    this.follow();
    const moving = this.camera.update(now) || this.camera.dirty;
    // En basse qualité, on dessine une image sur deux : 30 images par seconde suffisent (pas pendant
    // un zoom ou un déplacement de la vue, qui restent fluides).
    if (moving || this.quality !== 'basse' || now - this.lastDraw >= 30) { this.lastDraw = now; this.draw(now); }
    this.camera.flush();
    requestAnimationFrame(() => this.frame());
  }

  // Quand le plateau ne tient pas en entier (zoom), la caméra garde l'acteur du moment dans le cadre.
  // Un nouvel acteur, ou le personnage qui se met en marche, rend la main à la caméra. L'entrée en
  // combat et le retour au monde recadrent le plateau entier.
  follow() {
    if (this.inCombat !== this.framedCombat) { this.framedCombat = this.inCombat; this.camera.fit(); this.suivreAlentours(); }
    const focus = this.inCombat ? (this.combat.actor ? this.combat.actor.id : 0) : (this.world && this.world.player.moving ? 'marche' : 'repos');
    let target = null;
    if (this.inCombat) {
      const a = this.combat.actor;
      target = a && a.alive ? { x: a.rx, y: a.ry } : (this.combat.player ? { x: this.combat.player.rx, y: this.combat.player.ry } : null);
    } else if (this.world) target = { x: this.world.player.rx, y: this.world.player.ry };
    const p = target && this.cellToScreen(target.x, target.y);
    this.camera.follow(focus, p ? p.x : null, p ? p.y - 30 : null);
  }

  // ----- Outils -----

  static canvas(w, h) {
    const c = document.createElement('canvas');
    c.width = Math.max(1, Math.ceil(w)); c.height = Math.max(1, Math.ceil(h));
    return c;
  }

  // Le navigateur garde les ordres de dessin d'une toile et ne les exécute qu'à la première lecture
  // (pour le rendu WebGL, à l'envoi de la texture, dans la première image qui suit). Un calque
  // fixe se peint au changement de carte : on le fait exécuter tout de suite, pour que ce coût reste
  // celui du changement de carte et ne retombe pas sur une image ordinaire.
  static flush(cv) {
    try { cv.getContext('2d').getImageData(0, 0, 1, 1); } catch (e) { /* toile illisible */ }
  }

  // Bruit déterministe par case, pour varier les sols sans les rendre bruyants.
  static noise(x, y) {
    let h = (x * 374761393 + y * 668265263) ^ 0x5bd1e995;
    h = Math.imul(h ^ (h >>> 13), 1274126177);
    return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
  }

  static hashStr(s) {
    let h = 2166136261;
    for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
    return h >>> 0;
  }

  // Générateur pseudo-aléatoire à graine (mulberry32) : le décor est le même à chaque visite.
  static prng(seed) {
    let a = seed >>> 0;
    return () => {
      a = (a + 0x6D2B79F5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  // Bruit de valeur multi-octaves sur une grille w × h ; `wrap` le rend raccordable (texture en mosaïque).
  static fbm(w, h, cell, octaves, seed, wrap) {
    const out = new Float32Array(w * h);
    let amp = 1, tot = 0, cs = cell;
    for (let o = 0; o < octaves && cs >= 1; o++) {
      const pw = wrap ? Math.max(1, Math.round(w / cs)) : Math.ceil(w / cs) + 2;
      const ph = wrap ? Math.max(1, Math.round(h / cs)) : Math.ceil(h / cs) + 2;
      const rnd = Renderer.prng(seed + o * 7919);
      const lat = new Float32Array(pw * ph);
      for (let i = 0; i < lat.length; i++) lat[i] = rnd();
      for (let y = 0; y < h; y++) {
        const fy = y / cs, iy = Math.floor(fy), ty = fy - iy, sy = ty * ty * (3 - 2 * ty);
        const r0 = (iy % ph) * pw, r1 = ((iy + 1) % ph) * pw;
        for (let x = 0; x < w; x++) {
          const fx = x / cs, ix = Math.floor(fx), tx = fx - ix, sx = tx * tx * (3 - 2 * tx);
          const c0 = ix % pw, c1 = (ix + 1) % pw;
          const a = lat[r0 + c0] + (lat[r0 + c1] - lat[r0 + c0]) * sx;
          const b = lat[r1 + c0] + (lat[r1 + c1] - lat[r1 + c0]) * sx;
          out[y * w + x] += (a + (b - a) * sy) * amp;
        }
      }
      tot += amp; amp *= 0.5; cs /= 2;
    }
    for (let i = 0; i < out.length; i++) out[i] /= tot;
    return out;
  }

  // Bruit de valeur en un point quelconque (plusieurs octaves), pour les motifs en perspective.
  static vnoise(x, y, octaves, seed) {
    let amp = 1, tot = 0, v = 0;
    for (let o = 0; o < octaves; o++) {
      const ix = Math.floor(x), iy = Math.floor(y), fx = x - ix, fy = y - iy;
      const sx = fx * fx * (3 - 2 * fx), sy = fy * fy * (3 - 2 * fy);
      const s = seed + o * 101;
      const a = Renderer.noise(ix + s, iy), b = Renderer.noise(ix + 1 + s, iy), c = Renderer.noise(ix + s, iy + 1), d = Renderer.noise(ix + 1 + s, iy + 1);
      v += (a + (b - a) * sx + (c - a) * sy + (a - b - c + d) * sx * sy) * amp;
      tot += amp; amp *= 0.5; x *= 2.03; y *= 2.03;
    }
    return v / tot;
  }

  static rgb(hex) {
    const cache = Renderer._rgb || (Renderer._rgb = new Map());
    let v = cache.get(hex);
    if (!v) { const n = parseInt(hex.slice(1), 16); v = [(n >> 16) & 255, (n >> 8) & 255, n & 255]; cache.set(hex, v); }
    return v;
  }

  static rampAt(R, v) {
    const n = R.length - 1;
    const f = Math.min(n - 1e-6, Math.max(0, v * n));
    const i = Math.floor(f), t = f - i, a = R[i], b = R[i + 1];
    return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
  }

  static ramp(ramp, v, a) {
    const c = Renderer.rampAt(ramp.map(Renderer.rgb), v);
    return a == null ? `rgb(${c[0] | 0},${c[1] | 0},${c[2] | 0})` : `rgba(${c[0] | 0},${c[1] | 0},${c[2] | 0},${a})`;
  }

  static mix(a, b, t) {
    const pa = parseInt(a.slice(1), 16), pb = parseInt(b.slice(1), 16);
    const ch = s => [(s >> 16) & 255, (s >> 8) & 255, s & 255];
    const [r1, g1, b1] = ch(pa), [r2, g2, b2] = ch(pb);
    const v = x => Math.round(x).toString(16).padStart(2, '0');
    return '#' + v(r1 + (r2 - r1) * t) + v(g1 + (g2 - g1) * t) + v(b1 + (b2 - b1) * t);
  }

  static rgba(hex, a) {
    const v = parseInt(hex.slice(1), 16);
    return `rgba(${(v >> 16) & 255},${(v >> 8) & 255},${v & 255},${a})`;
  }

  // Une lueur radiale dessinée une fois, réutilisée pour toutes les lanternes de la carte.
  static glowSprite(color) {
    const off = Renderer.canvas(92, 92);
    const g2 = off.getContext('2d');
    const g = g2.createRadialGradient(46, 46, 2, 46, 46, 46);
    g.addColorStop(0, Renderer.rgba(color, 0.55)); g.addColorStop(1, Renderer.rgba(color, 0));
    g2.fillStyle = g; g2.fillRect(0, 0, 92, 92);
    return off;
  }

  // Un point de lumière doux (cœur plein, bord nul), en cache par couleur : particules, halos, impacts.
  static dot(color) {
    const cache = Renderer._dots || (Renderer._dots = new Map());
    let cv = cache.get(color);
    if (!cv) {
      cv = Renderer.canvas(64, 64);
      const c = cv.getContext('2d');
      const g = c.createRadialGradient(32, 32, 0, 32, 32, 32);
      g.addColorStop(0, Renderer.rgba(color, 1)); g.addColorStop(0.18, Renderer.rgba(color, 0.75));
      g.addColorStop(0.45, Renderer.rgba(color, 0.22)); g.addColorStop(1, Renderer.rgba(color, 0));
      c.fillStyle = g; c.fillRect(0, 0, 64, 64);
      cache.set(color, cv);
    }
    return cv;
  }

  // L'ombre portée douce des figures et des objets.
  static shadowSprite() {
    if (!Renderer._shadow) {
      const cv = Renderer.canvas(64, 64), c = cv.getContext('2d');
      const g = c.createRadialGradient(32, 32, 0, 32, 32, 32);
      g.addColorStop(0, 'rgba(3,5,12,0.75)'); g.addColorStop(0.55, 'rgba(3,5,12,0.4)'); g.addColorStop(1, 'rgba(3,5,12,0)');
      c.fillStyle = g; c.fillRect(0, 0, 64, 64);
      Renderer._shadow = cv;
    }
    return Renderer._shadow;
  }

  softShadow(c, x, y, rx, ry, a) {
    const old = c.globalAlpha;
    c.globalAlpha = old * a;
    c.drawImage(Renderer.shadowSprite(), x - rx, y - ry, rx * 2, ry * 2);
    c.globalAlpha = old;
  }

  static canFilter() {
    if (Renderer._canFilter == null) {
      try {
        const c = Renderer.canvas(2, 2).getContext('2d');
        Renderer._canFilter = typeof c.filter === 'string';
        if (Renderer._canFilter) { c.filter = 'blur(2px)'; Renderer._canFilter = c.filter === 'blur(2px)'; }
      } catch (e) { Renderer._canFilter = false; }
    }
    return Renderer._canFilter;
  }

  // Floute `src` dans le contexte `dst` (même taille). Sans ctx.filter, on passe par une réduction
  // puis un agrandissement lissé : le lissage bilinéaire fait office de flou.
  static blurInto(dst, src, radius, alpha) {
    const w = src.width, h = src.height;
    dst.save();
    dst.setTransform(1, 0, 0, 1, 0, 0);
    dst.globalAlpha = alpha == null ? 1 : alpha;
    dst.globalCompositeOperation = 'lighter';
    if (Renderer.canFilter()) {
      dst.filter = `blur(${radius}px)`;
      dst.drawImage(src, 0, 0);
      dst.filter = 'none';
    } else {
      const k = Math.max(2, Math.round(radius / 1.5));
      const tmp = Renderer._blurTmp && Renderer._blurTmp.width === Math.ceil(w / k) && Renderer._blurTmp.height === Math.ceil(h / k)
        ? Renderer._blurTmp : (Renderer._blurTmp = Renderer.canvas(w / k, h / k));
      const t = tmp.getContext('2d');
      t.setTransform(1, 0, 0, 1, 0, 0);
      t.clearRect(0, 0, tmp.width, tmp.height);
      t.imageSmoothingEnabled = true;
      t.drawImage(src, 0, 0, tmp.width, tmp.height);
      dst.imageSmoothingEnabled = true;
      dst.drawImage(tmp, 0, 0, w, h);
    }
    dst.restore();
  }

  diamond(c, cx, cy, w = Grid.TILE_W, h = Grid.TILE_H) {
    c.beginPath();
    c.moveTo(cx, cy - h / 2);
    c.lineTo(cx + w / 2, cy);
    c.lineTo(cx, cy + h / 2);
    c.lineTo(cx - w / 2, cy);
    c.closePath();
  }

  static addDiamond(path, cx, cy, k) {
    const w = Grid.TILE_W / 2 * k, h = Grid.TILE_H / 2 * k;
    path.moveTo(cx, cy - h); path.lineTo(cx + w, cy); path.lineTo(cx, cy + h); path.lineTo(cx - w, cy); path.closePath();
  }

  // Un polygone aux coins arrondis, pour les corps « roulés comme un galet ».
  static roundPoly(pts, r) {
    const path = new Path2D();
    const n = pts.length;
    const mid = (a, b) => [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
    const m0 = mid(pts[n - 1], pts[0]);
    path.moveTo(m0[0], m0[1]);
    for (let i = 0; i < n; i++) {
      const a = pts[i], b = pts[(i + 1) % n], mm = mid(a, b);
      path.arcTo(a[0], a[1], mm[0], mm[1], r);
    }
    path.closePath();
    return path;
  }

  // ----- Textures procédurales (une fois par palette, en cache) -----

  static texture(P, kind) {
    const cache = Renderer._tex || (Renderer._tex = new Map());
    const key = P.id + ':' + kind;
    let cv = cache.get(key);
    if (cv) return cv;
    const T = 512;
    cv = Renderer.canvas(T, kind === 'falaise' ? 512 : T);
    // texture lue et réécrite (grain) : on la garde en mémoire centrale, c'est bien plus rapide
    const c = cv.getContext('2d', { willReadFrequently: true });
    const seed = Renderer.hashStr(key);
    const rnd = Renderer.prng(seed);
    const R = Renderer;
    switch (kind) {
      case 'herbe':
        R.wash(c, T, P.grass.slice(0, 5), seed, 16, 1.8);
        R.dabs(c, T, P.grass.slice(1, 5), 1500, 2, 7, 0.10, 0.32, rnd, 0.45);
        R.dabs(c, T, P.grass.slice(0, 2), 500, 3, 9, 0.10, 0.28, rnd, 0.6);
        R.dabs(c, T, P.grass.slice(4), 380, 1, 2.2, 0.25, 0.55, rnd, 0.8);
        R.grain(c, T, T, 16, rnd);
        break;
      case 'terre':
        R.wash(c, T, P.dirt.slice(0, 4), seed, 16, 1.6);
        R.dabs(c, T, P.dirt.slice(1), 900, 2, 7, 0.10, 0.28, rnd, 0.55);
        R.pebbles(c, T, P.dirt, 150, 2, 5, rnd);
        R.grain(c, T, T, 20, rnd);
        break;
      case 'gravier':
        R.wash(c, T, P.gravel.slice(0, 4), seed, 32, 1.5);
        R.pebbles(c, T, P.gravel, 650, 1.2, 3.4, rnd);
        R.grain(c, T, T, 22, rnd);
        break;
      case 'ardoise':
        R.wash(c, T, P.ardoise.slice(0, 5), seed, 16, 1.7);
        R.flakes(c, T, P.ardoise, 260, rnd);
        R.cracks(c, T, 'rgba(0,0,0,0.55)', 40, rnd);
        R.grain(c, T, T, 14, rnd);
        break;
      case 'dalle':
        R.slabs(c, T, P.stone, P.vein, rnd, { per: 1, veins: P.lava ? 0.22 : 0.5, split: 0.35, round: 3 });
        R.grain(c, T, T, 12, rnd);
        break;
      case 'pave':
        R.slabs(c, T, P.cobble, P.vein, rnd, { per: 2, veins: 0, split: 0, stagger: true, round: 6 });
        R.grain(c, T, T, 14, rnd);
        break;
      case 'sol':
        R.slabs(c, T, P.flag, [P.crystal[0], P.crystal[2], P.crystal[3]], rnd, { per: 1, veins: 0.06, split: 0.5, round: 2 });
        R.grain(c, T, T, 12, rnd);
        break;
      case 'eau':
        R.wash(c, T, (P.waterRamp || Renderer.PALETTES.orsane.waterRamp).slice(0, 4), seed, 32, 1.4);
        R.dabs(c, T, (P.waterRamp || Renderer.PALETTES.orsane.waterRamp).slice(2), 260, 6, 18, 0.05, 0.14, rnd, 0.18);
        break;
      case 'lave':
        R.wash(c, T, P.lava.slice(2), seed, 32, 1.6);
        R.crust(c, T, P.lava, rnd);
        break;
      case 'falaise':
        R.strata(c, T, P.cliff, seed, rnd);
        break;
    }
    cache.set(key, cv);
    return cv;
  }

  // Lavis : un bruit multi-octaves basse résolution, colorié par la rampe et agrandi en douceur.
  static wash(c, T, ramp, seed, cell, contrast) {
    const n = 128;
    const f = Renderer.fbm(n, n, cell, 4, seed, true);
    const R = ramp.map(Renderer.rgb);
    const s = Renderer.canvas(n + 2, n + 2);
    const sc = s.getContext('2d');
    const img = sc.createImageData(n + 2, n + 2), d = img.data;
    for (let y = 0; y < n + 2; y++) {
      for (let x = 0; x < n + 2; x++) {
        const v0 = f[((y + n - 1) % n) * n + ((x + n - 1) % n)];
        const v = Math.min(1, Math.max(0, (v0 - 0.5) * contrast + 0.5));
        const col = Renderer.rampAt(R, v);
        const i = (y * (n + 2) + x) * 4;
        d[i] = col[0]; d[i + 1] = col[1]; d[i + 2] = col[2]; d[i + 3] = 255;
      }
    }
    sc.putImageData(img, 0, 0);
    c.imageSmoothingEnabled = true;
    const k = T / n;
    c.drawImage(s, -k, -k, T + 2 * k, T + 2 * k);
  }

  // Coups de pinceau : des ellipses translucides, raccordées sur les bords de la mosaïque.
  static dabs(c, T, ramp, count, rmin, rmax, amin, amax, rnd, stretch) {
    for (let i = 0; i < count; i++) {
      const x = rnd() * T, y = rnd() * T, r = rmin + rnd() * (rmax - rmin), a = rnd() * Math.PI;
      c.fillStyle = ramp[Math.floor(rnd() * ramp.length)];
      c.globalAlpha = amin + rnd() * (amax - amin);
      for (let ox = -T; ox <= T; ox += T) for (let oy = -T; oy <= T; oy += T) {
        const X = x + ox, Y = y + oy;
        if (X < -r * 2 || X > T + r * 2 || Y < -r * 2 || Y > T + r * 2) continue;
        c.beginPath(); c.ellipse(X, Y, r, Math.max(0.3, r * stretch), a, 0, Math.PI * 2); c.fill();
      }
    }
    c.globalAlpha = 1;
  }

  static pebbles(c, T, ramp, count, rmin, rmax, rnd) {
    for (let i = 0; i < count; i++) {
      const x = rnd() * T, y = rnd() * T, r = rmin + rnd() * (rmax - rmin);
      for (let ox = -T; ox <= T; ox += T) for (let oy = -T; oy <= T; oy += T) {
        const X = x + ox, Y = y + oy;
        if (X < -10 || X > T + 10 || Y < -10 || Y > T + 10) continue;
        c.fillStyle = 'rgba(0,0,0,0.35)'; c.beginPath(); c.ellipse(X + r * 0.3, Y + r * 0.35, r, r * 0.8, 0, 0, Math.PI * 2); c.fill();
        c.fillStyle = ramp[2 + Math.floor(rnd() * (ramp.length - 2))]; c.beginPath(); c.ellipse(X, Y, r, r * 0.8, 0, 0, Math.PI * 2); c.fill();
        c.fillStyle = 'rgba(255,255,255,0.18)'; c.beginPath(); c.ellipse(X - r * 0.3, Y - r * 0.3, r * 0.45, r * 0.3, 0, 0, Math.PI * 2); c.fill();
      }
    }
  }

  static flakes(c, T, ramp, count, rnd) {
    for (let i = 0; i < count; i++) {
      const x = rnd() * T, y = rnd() * T, r = 5 + rnd() * 14, n = 4 + Math.floor(rnd() * 3), a0 = rnd() * 6.3;
      c.fillStyle = ramp[1 + Math.floor(rnd() * (ramp.length - 1))];
      c.globalAlpha = 0.25 + rnd() * 0.35;
      for (let ox = -T; ox <= T; ox += T) for (let oy = -T; oy <= T; oy += T) {
        const X = x + ox, Y = y + oy;
        if (X < -30 || X > T + 30 || Y < -30 || Y > T + 30) continue;
        c.beginPath();
        for (let k = 0; k < n; k++) { const a = a0 + k / n * Math.PI * 2, rr = r * (0.6 + 0.4 * Math.sin(k * 2.3 + x)); c.lineTo(X + Math.cos(a) * rr, Y + Math.sin(a) * rr * 0.7); }
        c.closePath(); c.fill();
      }
    }
    c.globalAlpha = 1;
  }

  static cracks(c, T, color, count, rnd) {
    c.strokeStyle = color; c.lineCap = 'round';
    for (let i = 0; i < count; i++) {
      let x = rnd() * T, y = rnd() * T, a = rnd() * 6.3;
      c.lineWidth = 0.8 + rnd() * 1.4;
      c.beginPath(); c.moveTo(x, y);
      for (let k = 0; k < 5; k++) { a += (rnd() - 0.5) * 1.4; x += Math.cos(a) * (6 + rnd() * 12); y += Math.sin(a) * (6 + rnd() * 12); c.lineTo(x, y); }
      c.stroke();
    }
  }

  static grain(c, w, h, amount, rnd) {
    const img = c.getImageData(0, 0, w, h), d = img.data;
    for (let i = 0; i < d.length; i += 4) { const v = (rnd() - 0.5) * amount; d[i] += v; d[i + 1] += v; d[i + 2] += v; }
    c.putImageData(img, 0, 0);
  }

  // Dalles (une par case, ou des pavés) : ton variable, biseau, fêlures veinées d'or.
  static slabs(c, T, ramp, vein, rnd, o) {
    const size = 64 / o.per, n = T / size;
    c.fillStyle = Renderer.mix(ramp[0], '#000000', 0.35); c.fillRect(0, 0, T, T);
    const wash = Renderer.canvas(T, T), wc = wash.getContext('2d');
    Renderer.wash(wc, T, ramp.slice(1), Renderer.hashStr(ramp.join()), 16, 1.5);
    for (let j = 0; j < n; j++) {
      const shift = o.stagger && j % 2 ? size / 2 : 0;
      for (let i = -1; i < n; i++) {
        const x0 = i * size + shift, y0 = j * size, g = 2.4;
        const parts = rnd() < o.split ? (rnd() < 0.5 ? [[x0, y0, size / 2, size], [x0 + size / 2, y0, size / 2, size]] : [[x0, y0, size, size / 2], [x0, y0 + size / 2, size, size / 2]]) : [[x0, y0, size, size]];
        for (const [px, py, pw, ph] of parts) {
          const r = Math.min(o.round, pw / 4);
          const path = new Path2D();
          path.moveTo(px + g + r, py + g); path.arcTo(px + pw - g, py + g, px + pw - g, py + ph - g, r); path.arcTo(px + pw - g, py + ph - g, px + g, py + ph - g, r);
          path.arcTo(px + g, py + ph - g, px + g, py + g, r); path.arcTo(px + g, py + g, px + pw - g, py + g, r); path.closePath();
          c.save(); c.clip(path);
          c.drawImage(wash, 0, 0);
          c.fillStyle = Renderer.rgba(ramp[1 + Math.floor(rnd() * (ramp.length - 1))], 0.35 + rnd() * 0.3); c.fillRect(px, py, pw, ph);
          // biseau : lumière en haut à gauche, ombre en bas à droite
          c.lineWidth = 3.5;
          c.strokeStyle = 'rgba(255,250,235,0.22)'; c.beginPath(); c.moveTo(px + g, py + ph - g); c.lineTo(px + g, py + g); c.lineTo(px + pw - g, py + g); c.stroke();
          c.strokeStyle = 'rgba(0,0,0,0.32)'; c.beginPath(); c.moveTo(px + pw - g, py + g); c.lineTo(px + pw - g, py + ph - g); c.lineTo(px + g, py + ph - g); c.stroke();
          if (rnd() < o.veins) Renderer.vein(c, px, py, pw, ph, vein, rnd);
          else if (rnd() < 0.5) {
            c.strokeStyle = 'rgba(0,0,0,0.35)'; c.lineWidth = 1.3; c.beginPath();
            let x = px + rnd() * pw, y = py + g; c.moveTo(x, y);
            for (let k = 0; k < 4; k++) { x += (rnd() - 0.5) * pw * 0.4; y += ph / 4; c.lineTo(x, y); }
            c.stroke();
          }
          c.restore();
        }
      }
    }
  }

  // Une fêlure remplie d'or (la « pierre fissurée veinée d'or » de la planche).
  static vein(c, px, py, pw, ph, vein, rnd) {
    const horiz = rnd() < 0.5;
    const pts = [];
    let x = horiz ? px : px + pw * (0.2 + rnd() * 0.6), y = horiz ? py + ph * (0.2 + rnd() * 0.6) : py;
    pts.push([x, y]);
    for (let k = 0; k < 6; k++) {
      if (horiz) { x += pw / 6; y += (rnd() - 0.5) * ph * 0.28; } else { y += ph / 6; x += (rnd() - 0.5) * pw * 0.28; }
      pts.push([x, y]);
    }
    const branch = [];
    const b0 = pts[2 + Math.floor(rnd() * 3)];
    let bx = b0[0], by = b0[1];
    branch.push([bx, by]);
    for (let k = 0; k < 3; k++) { bx += (rnd() - 0.3) * pw * 0.22; by += (rnd() - 0.3) * ph * 0.22; branch.push([bx, by]); }
    const line = (list, w, col) => { c.lineWidth = w; c.strokeStyle = col; c.beginPath(); list.forEach((p, i) => (i ? c.lineTo(p[0], p[1]) : c.moveTo(p[0], p[1]))); c.stroke(); };
    c.lineCap = 'round'; c.lineJoin = 'round';
    for (const list of [pts, branch]) {
      const k = list === pts ? 1 : 0.7;
      line(list, 9 * k, Renderer.rgba(vein[1], 0.12));
      line(list, 5.5 * k, Renderer.rgba(vein[0], 0.85));
      line(list, 3.2 * k, vein[1]);
      line(list, 1.2 * k, Renderer.rgba(vein[2], 0.9));
    }
  }

  static crust(c, T, ramp, rnd) {
    for (let i = 0; i < 70; i++) {
      const x = rnd() * T, y = rnd() * T, r = 14 + rnd() * 26, n = 5 + Math.floor(rnd() * 3), a0 = rnd() * 6.3;
      for (let ox = -T; ox <= T; ox += T) for (let oy = -T; oy <= T; oy += T) {
        const X = x + ox, Y = y + oy;
        if (X < -50 || X > T + 50 || Y < -50 || Y > T + 50) continue;
        c.beginPath();
        for (let k = 0; k < n; k++) { const a = a0 + k / n * Math.PI * 2, rr = r * (0.7 + 0.3 * Math.sin(k * 1.7 + i)); c.lineTo(X + Math.cos(a) * rr, Y + Math.sin(a) * rr); }
        c.closePath();
        c.fillStyle = Renderer.rgba(ramp[0], 0.9); c.fill();
        c.strokeStyle = Renderer.rgba(ramp[2], 0.6); c.lineWidth = 2; c.stroke();
        c.fillStyle = Renderer.rgba(ramp[1], 0.45); c.beginPath(); c.arc(X - r * 0.2, Y - r * 0.2, r * 0.45, 0, Math.PI * 2); c.fill();
      }
    }
  }

  // La roche de la falaise : des colonnes taillées à facettes, des strates, des corniches et des fissures.
  static strata(c, T, ramp, seed, rnd) {
    const H = 512;
    c.fillStyle = ramp[2]; c.fillRect(0, 0, T, H);
    // colonnes verticales, éclairées à gauche, ombrées à droite
    let x = 0;
    while (x < T - 4) {
      const w = Math.min(T - x, 16 + rnd() * 44);
      const tone = 1 + Math.floor(rnd() * 4);
      const g = c.createLinearGradient(x, 0, x + w, 0);
      g.addColorStop(0, ramp[Math.min(5, tone + 1)]); g.addColorStop(0.3, ramp[tone]); g.addColorStop(1, ramp[Math.max(0, tone - 1)]);
      c.fillStyle = g;
      const edgeL = [], edgeR = [];
      for (let y = 0; y <= H; y += 16) { edgeL.push([x + (x === 0 ? 0 : (rnd() - 0.5) * 7), y]); edgeR.push([x + w + (x + w >= T ? 0 : (rnd() - 0.5) * 7), y]); }
      c.beginPath(); edgeL.forEach((q, i) => (i ? c.lineTo(q[0], q[1]) : c.moveTo(q[0], q[1]))); for (let i = edgeR.length - 1; i >= 0; i--) c.lineTo(edgeR[i][0], edgeR[i][1]); c.closePath(); c.fill();
      if (x + w < T) {
        c.strokeStyle = 'rgba(0,0,0,0.6)'; c.lineWidth = 1.2 + rnd() * 1.8;
        c.beginPath(); edgeR.forEach((q, i) => (i ? c.lineTo(q[0], q[1]) : c.moveTo(q[0], q[1]))); c.stroke();
        c.strokeStyle = Renderer.rgba(ramp[5], 0.25); c.lineWidth = 1;
        c.beginPath(); edgeR.forEach((q, i) => (i ? c.lineTo(q[0] + 1.6, q[1]) : c.moveTo(q[0] + 1.6, q[1]))); c.stroke();
      }
      x += w;
    }
    // strates horizontales translucides
    let y = 0;
    while (y < H) {
      const h = 6 + rnd() * 18, k = 1 + Math.floor(rnd() * 3), ph = rnd() * 6.3;
      c.fillStyle = rnd() < 0.5 ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.12)';
      c.beginPath(); c.moveTo(0, y);
      for (let xx = 0; xx <= T; xx += 8) c.lineTo(xx, y + Math.sin(xx / T * Math.PI * 2 * k + ph) * 2.5);
      c.lineTo(T, y + h); c.lineTo(0, y + h); c.closePath(); c.fill();
      y += h;
    }
    // corniches courtes : arête claire, ombre portée dessous
    for (let i = 0; i < 46; i++) {
      const x0 = rnd() * T, yy = rnd() * H, len = 20 + rnd() * 70;
      c.lineWidth = 3; c.strokeStyle = 'rgba(0,0,0,0.4)';
      c.beginPath(); c.moveTo(x0, yy + 2.5); c.lineTo(x0 + len * 0.5, yy + 2.5 + (rnd() - 0.5) * 3); c.lineTo(x0 + len, yy + 2.5); c.stroke();
      c.lineWidth = 1.4; c.strokeStyle = Renderer.rgba(ramp[5], 0.55);
      c.beginPath(); c.moveTo(x0, yy); c.lineTo(x0 + len * 0.5, yy + (rnd() - 0.5) * 3); c.lineTo(x0 + len, yy); c.stroke();
    }
    const f = Renderer.fbm(128, 128, 16, 4, seed, true);
    const s = Renderer.canvas(128, 128), sc = s.getContext('2d'), img = sc.createImageData(128, 128);
    for (let i = 0; i < f.length; i++) { const v = Math.min(255, Math.max(0, (f[i] - 0.5) * 2.2 * 255 + 128)); img.data[i * 4] = img.data[i * 4 + 1] = img.data[i * 4 + 2] = v; img.data[i * 4 + 3] = 255; }
    sc.putImageData(img, 0, 0);
    c.globalCompositeOperation = 'overlay'; c.globalAlpha = 0.5; c.drawImage(s, 0, 0, T, H); c.globalAlpha = 1; c.globalCompositeOperation = 'source-over';
    c.strokeStyle = 'rgba(0,0,0,0.5)'; c.lineCap = 'round';
    for (let i = 0; i < 70; i++) {
      let xx = rnd() * T, yy = rnd() * H; c.lineWidth = 0.8 + rnd() * 1.4; c.beginPath(); c.moveTo(xx, yy);
      for (let k = 0; k < 3; k++) { xx += (rnd() - 0.5) * 8; yy += 5 + rnd() * 10; c.lineTo(xx, yy); }
      c.stroke();
    }
    Renderer.grain(c, T, H, 16, rnd);
  }

  // ----- Calques fixes : le plateau et ses alentours, leur lumière ; puis décor et couche lumineuse -----

  buildStatic() {
    const m = this.map;
    const P = this.palette;
    const site = this.site;
    if (this.static && this.staticMap === m && this.staticPalette === P && this.staticSite === site) return;
    const t0 = performance.now();
    // Le premier calque d'un rendu de repli garde la vue du rendu WebGL ; ensuite, une autre carte recadre.
    const newMap = !!this.staticMap && this.staticMap !== m;
    this.staticMap = m;
    this.staticPalette = P;
    this.staticSite = site;
    this.particles = [];
    this.sparks = [];
    this.seed = Renderer.hashStr((this.world && this.world.mapId) || 'arene') ^ Renderer.hashStr(m.layout ? m.layout.join('') : 'x');
    this.glow = Renderer.glowSprite(P.glow);
    const steps = this.buildSteps = {};
    let tk = performance.now();
    const step = name => { const t = performance.now(); steps[name] = Math.round(t - tk); tk = t; };
    this.analyse(P, site);
    const R = this.resources(P, site);
    this.res = R;
    step('ressources');
    // Couche des lumières fixes du plateau, à demi-résolution, floutée une fois pour toutes.
    this.emitCanvas = Renderer.canvas(this.W / 2, this.SH / 2);
    this.emit = this.emitCanvas.getContext('2d');
    this.emit.setTransform(0.5, 0, 0, 0.5, 0, 0);
    this.emit.globalCompositeOperation = 'lighter';
    // Ce qu'il faut peindre autour : de quoi couvrir la vue au zoom le plus large.
    const E = this.alentours = this.wantedSurroundings();
    const K = this.calque;
    const ent = this.entourage = new Entourage(this, P, R, Renderer.union(E, K));
    step('alentours');
    // Le calque proche : le plateau et ses abords, à la densité des calques.
    const cs = this.cs;
    const off = Renderer.canvas(K.w * cs, K.h * cs);
    const c = off.getContext('2d');
    c.setTransform(cs, 0, 0, cs, -K.x * cs, -K.y * cs);
    ent.paintGround(c, K);
    step('abords');
    this.paintGround(c, P);
    step('sols');
    this.paintDetails(c, P, R);
    step('details');
    this.buildDecor(P, R);
    step('decor');
    this.paintShadows(c);
    this.paintLight(c, P);
    step('lumiere');
    // Le décor qui ne peut masquer ni figure ni case jouable est cuit dans le calque fixe, trié en
    // profondeur avec celui des alentours.
    ent.paintDecor(c, K, this.decor.filter(d => d.baked));
    this.decor = this.decor.filter(d => !d.baked);
    ent.paintAir(c, K);
    ent.feather(off, cs);
    Renderer.flush(off);
    step('proche');
    // Le lointain : les mêmes alentours, en bandes autour du proche, jusqu'au bord de ce que la
    // caméra peut montrer.
    this.paintLointain();
    step('lointain');
    // Couche lumineuse fixe (lanternes, cristaux, lave) : floutée à demi-résolution, ajoutée à chaque
    // image en mode additif par-dessus le plateau. En basse qualité, pas de bloom.
    this.staticBloom = null;
    if (this.quality === 'haute') this.finishBloom();
    step('bloom');
    this.static = off;
    this.buildPaths();
    // Une nouvelle carte : la caméra recadre le plateau.
    if (this.camera) this.camera.setBounds(this.cameraBounds(), newMap);
    this.buildMs = performance.now() - t0;
  }

  finishBloom() {
    for (const L of this.lights) {
      const p = this.cellToScreen(L.x, L.y);
      this.emitDot(p.x, p.y - L.h, L.k === 'Z' ? 34 : 26, L.k === 'L' || L.k === 'B' ? L.glow : L.color, L.k === 'D' ? 0.6 : 0.85);
    }
    const out = Renderer.canvas(this.emitCanvas.width, this.emitCanvas.height);
    const o = out.getContext('2d');
    Renderer.blurInto(o, this.emitCanvas, 3, 0.9);
    Renderer.blurInto(o, this.emitCanvas, 11, 1);
    // Bords fondus : une lueur ne s'arrête pas net au bord du rectangle du plateau.
    o.globalCompositeOperation = 'destination-in';
    const w = out.width, h = out.height, e = 16, t = 44;
    let g = o.createLinearGradient(0, 0, w, 0);
    g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(e / w, '#000'); g.addColorStop(1 - e / w, '#000'); g.addColorStop(1, 'rgba(0,0,0,0)');
    o.fillStyle = g; o.fillRect(0, 0, w, h);
    g = o.createLinearGradient(0, 0, 0, h);
    g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(t / h, '#000'); g.addColorStop(1, '#000');
    o.fillStyle = g; o.fillRect(0, 0, w, h);
    Renderer.flush(out);
    this.staticBloom = out;
  }

  // Ce que la carte contient : le vide d'un bord (terrasse ou vallée), les matières, les lumières, les cases libres.
  analyse(P, site) {
    const m = this.map;
    const vd = [];
    for (let y = 0; y < m.h; y++) vd.push(new Array(m.w).fill(false));
    const q = [];
    for (let y = 0; y < m.h; y++) for (let x = 0; x < m.w; x++) {
      if ((x === 0 || y === 0 || x === m.w - 1 || y === m.h - 1) && m.cells[y][x] === Grid.HOLE) { vd[y][x] = true; q.push([x, y]); }
    }
    while (q.length) {
      const [x, y] = q.pop();
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const nx = x + dx, ny = y + dy;
        if (Grid.inBounds(m, nx, ny) && !vd[ny][nx] && m.cells[ny][nx] === Grid.HOLE) { vd[ny][nx] = true; q.push([nx, ny]); }
      }
    }
    this.voidMap = vd;
    // Ce que le vide d'une carte devient dans la scène : une terrasse (le plateau surplombe d'un mur
    // bas un contrebas qui continue tout autour) quand l'avant du plateau (bords +x et +y, ceux qu'on
    // voit tomber) y donne pour une bonne part ; sinon une vallée, loin derrière le bord.
    let avant = 0, vide = 0, any = false;
    for (let i = 0; i < m.w; i++) { avant++; if (vd[m.h - 1][i]) vide++; }
    for (let j = 0; j < m.h - 1; j++) { avant++; if (vd[j][m.w - 1]) vide++; }
    for (const row of vd) if (row.some(Boolean)) any = true;
    this.chute = !any ? null : vide / avant >= 0.3 ? 'terrasse' : 'vallee';
    this.liquid = null;
    this.matEdges = {};
    this.exitCells = [];
    this.mat = [];
    const base = site === 'donjon' ? 'sol' : site === 'ville' ? 'pave' : P.ground === 'ardoise' ? 'ardoise' : 'herbe';
    this.baseMat = base;
    this.floorCells = [];
    this.liquidCells = [];
    this.lights = [];
    this.crystalSpots = [];
    for (let y = 0; y < m.h; y++) {
      const row = [];
      for (let x = 0; x < m.w; x++) {
        const t = m.cells[y][x], k = m.kind[y][x];
        let mat;
        if (vd[y][x]) mat = 'vide';
        else if (t === Grid.WATER) mat = P.lava ? 'lave' : 'eau';
        else if (t === Grid.HOLE) mat = 'trou';
        else if (site === 'donjon') mat = k === ',' ? 'dalle' : 'sol';
        else if (site === 'ville') mat = t === Grid.TREE && P.ground !== 'ardoise' ? 'herbe' : (k === ',' ? 'dalle' : 'pave');
        // Une case de sortie prend la matière du chemin qui en part (js/entourage.js).
        else if (P.ground === 'ardoise') mat = k === ',' || 'nsew'.includes(k) ? 'gravier' : 'ardoise';
        else mat = k === ',' || 'nsew'.includes(k) ? 'terre' : 'herbe';
        row.push(mat);
        if (t === Grid.FLOOR && !vd[y][x]) this.floorCells.push({ x, y });
        if (t === Grid.WATER) this.liquidCells.push({ x, y });
        if ('nsew'.includes(k)) this.exitCells.push({ x, y });
        if (k === 'L') this.lights.push({ x, y, k, h: P.lamp === 'brasero' ? 30 : 45, color: P.lantern, glow: P.glow, r: 1 });
        if (k === 'Z') this.lights.push({ x, y, k, h: 47, color: '#00c2ff', glow: '#8fe9ff', r: 0.9 });
        if (k === 'D') this.lights.push({ x, y, k, h: 26, color: '#a66cff', glow: '#8fe9ff', r: 0.7 });
      }
      this.mat.push(row);
    }
  }

  // Le vide d'une carte. Hors de la carte, les alentours continuent le bord le plus proche : le vide
  // en contrebas, la terre ferme en terre ferme. Au-delà d'une sortie percée dans le bord d'une
  // terrasse, le contrebas continue aussi : un escalier y descend (js/entourage.js).
  isVoid(x, y) {
    const m = this.map;
    if (Grid.inBounds(m, x, y)) return this.voidMap[y][x];
    const cx = Math.max(0, Math.min(m.w - 1, x)), cy = Math.max(0, Math.min(m.h - 1, y));
    if (this.voidMap[cy][cx]) return true;
    if (this.chute === 'terrasse' && 'nsew'.includes(m.kind[cy][cx])) {
      const along = cx === x ? [[1, 0], [-1, 0]] : [[0, 1], [0, -1]];
      return along.some(([dx, dy]) => Grid.inBounds(m, cx + dx, cy + dy) && this.voidMap[cy + dy][cx + dx]);
    }
    return false;
  }
  matAt(x, y) { return Grid.inBounds(this.map, x, y) ? this.mat[y][x] : 'vide'; }

  // Les ressources d'une palette : sprites du décor, du plateau et de ses alentours, gardés en cache
  // (deux palettes au plus).
  resources(P, site) {
    const key = [P.id, site, this.cs, this.W, this.H].join('|');
    const cache = Renderer._res || (Renderer._res = new Map());
    if (cache.has(key)) return cache.get(key);
    if (cache.size >= 2) {
      // on libère la plus ancienne palette, et ses textures si plus personne ne s'en sert
      const old = cache.keys().next().value;
      cache.delete(old);
      const keep = new Set([...cache.keys()].map(k => k.split('|')[0]).concat(P.id));
      if (Renderer._tex) for (const k of [...Renderer._tex.keys()]) if (!keep.has(k.split(':')[0])) Renderer._tex.delete(k);
    }
    const R = {};
    const rnd = Renderer.prng(Renderer.hashStr('decor:' + key));
    R.trees = []; R.bushes = []; R.rocks = []; R.crystalRocks = []; R.wallsTall = []; R.wallsLow = []; R.columns = [];
    for (let i = 0; i < 6; i++) R.trees.push(this.treeSprite(P, rnd, 1, i));
    for (let i = 0; i < 4; i++) R.bushes.push(this.treeSprite(P, rnd, 0.66 + i * 0.05, i));
    R.crystal = this.crystalSprite(P, Renderer.prng(7), 1);
    R.crystalSmall = [0, 1, 2].map(i => this.crystalSprite(P, Renderer.prng(11 + i), 0.55));
    for (let i = 0; i < 4; i++) R.rocks.push(this.rockSprite(P, rnd, null));
    for (let i = 0; i < 2; i++) R.crystalRocks.push(this.rockSprite(P, rnd, R.crystal));
    for (let i = 0; i < 3; i++) R.wallsTall.push(this.wallSprite(P, rnd, 38));
    for (let i = 0; i < 2; i++) R.wallsLow.push(this.wallSprite(P, rnd, 14));
    R.ramparts = [0, 1, 2].map(() => this.rampartSprite(P, rnd, 34));
    R.rampartsLow = [0, 1].map(() => this.rampartSprite(P, rnd, 13));
    for (let i = 0; i < 2; i++) R.columns.push(this.columnSprite(P, rnd, i === 1));
    R.lamp = this.lampSprite(P);
    R.door = this.doorSprite(P);
    R.relay = this.relaySprite(P);
    R.tempRock = this.rockSprite(Object.assign({}, P, { rock: ['#2a1d14', '#45301f', '#634631', '#80603f', '#a07e58', '#c4a27a'], moss: null }), rnd, null);
    cache.set(key, R);
    return R;
  }

  // Un sprite : un petit canvas à la densité des calques (this.cs) ; (0, 0) est le point d'ancrage au sol.
  spr(w, h, ax, ay, fn, tint) {
    const dpr = this.cs;
    w = Math.ceil(w); h = Math.ceil(h); ax = Math.round(ax); ay = Math.round(ay);
    const cv = Renderer.canvas(w * dpr, h * dpr);
    const c = cv.getContext('2d');
    c.setTransform(dpr, 0, 0, dpr, ax * dpr, ay * dpr);
    c.lineJoin = 'round'; c.lineCap = 'round';
    fn(c);
    if (tint) { c.setTransform(1, 0, 0, 1, 0, 0); c.globalCompositeOperation = 'source-atop'; c.fillStyle = tint; c.fillRect(0, 0, cv.width, cv.height); c.globalCompositeOperation = 'source-over'; }
    return { cv, w, h, ax, ay };
  }

  emitDot(x, y, r, color, a) {
    if (!this.emit) return;
    this.emit.globalAlpha = a;
    this.emit.drawImage(Renderer.dot(color), x - r, y - r, r * 2, r * 2);
    this.emit.globalAlpha = 1;
  }

  // ----- Sols : matières en mosaïque isométrique, bords organiques, eau, lave et puits -----

  isoPattern(c, P, kind) {
    const pat = c.createPattern(Renderer.texture(P, kind), 'repeat');
    if (pat && pat.setTransform && typeof DOMMatrix === 'function') pat.setTransform(new DOMMatrix([0.5, 0.25, -0.5, 0.25, this.origin.x, this.origin.y - 16]));
    return pat;
  }

  // Polygone d'une case en coordonnées de case. Les bords qui touchent une autre matière ondulent.
  cellPoly(x, y, same, amp) {
    const corners = [[x, y], [x + 1, y], [x + 1, y + 1], [x, y + 1]];
    const nbs = [[x, y - 1], [x + 1, y], [x, y + 1], [x - 1, y]];
    const free = nbs.map(n => !same(n[0], n[1]));
    const pts = [], edges = [];
    for (let e = 0; e < 4; e++) {
      const A = corners[e], B = corners[(e + 1) % 4];
      let a = A;
      if (amp && free[e] && free[(e + 3) % 4]) a = [A[0] + (x + 0.5 - A[0]) * 0.22, A[1] + (y + 0.5 - A[1]) * 0.22];
      pts.push(a);
      if (free[e] && amp) {
        const seg = [a];
        for (const t of [0.25, 0.5, 0.75]) {
          const px = A[0] + (B[0] - A[0]) * t, py = A[1] + (B[1] - A[1]) * t;
          const j = (Renderer.noise(Math.round(px * 8) + 101, Math.round(py * 8) + 37) - 0.5) * 2 * amp;
          const q = A[1] === B[1] ? [px, py + j] : [px + j, py];
          pts.push(q); seg.push(q);
        }
        let b = B;
        if (free[(e + 1) % 4]) b = [B[0] + (x + 0.5 - B[0]) * 0.22, B[1] + (y + 0.5 - B[1]) * 0.22];
        seg.push(b);
        edges.push(seg);
      } else if (free[e]) edges.push([A, B]);
    }
    return { pts, edges };
  }

  // Chemins (remplissage et bordure seule) pour une matière.
  matPaths(kind, amp) {
    const m = this.map, fill = new Path2D(), edge = new Path2D();
    let any = false;
    // Le bord du plateau n'en est pas un pour une matière : les alentours la continuent.
    const same = (nx, ny) => this.matAt(nx, ny) === kind || (kind !== 'eau' && kind !== 'lave' && (this.isVoid(nx, ny) || !Grid.inBounds(m, nx, ny)));
    for (let y = 0; y < m.h; y++) for (let x = 0; x < m.w; x++) {
      if (this.mat[y][x] !== kind) continue;
      any = true;
      const { pts, edges } = this.cellPoly(x, y, same, amp);
      pts.forEach((q, i) => { const p = this.vx(q[0], q[1]); if (i) fill.lineTo(p.x, p.y); else fill.moveTo(p.x, p.y); });
      fill.closePath();
      for (const seg of edges) seg.forEach((q, i) => { const p = this.vx(q[0], q[1]); if (i) edge.lineTo(p.x, p.y); else edge.moveTo(p.x, p.y); });
    }
    return any ? { fill, edge } : null;
  }

  paintGround(c, P) {
    const m = this.map;
    const top = new Path2D();
    for (let y = 0; y < m.h; y++) for (let x = 0; x < m.w; x++) {
      if (this.isVoid(x, y)) continue;
      const a = this.vx(x, y), b = this.vx(x + 1, y), d = this.vx(x + 1, y + 1), e = this.vx(x, y + 1);
      top.moveTo(a.x, a.y); top.lineTo(b.x, b.y); top.lineTo(d.x, d.y); top.lineTo(e.x, e.y); top.closePath();
    }
    this.topPath = top;
    c.fillStyle = this.isoPattern(c, P, this.baseMat); c.fill(top);
    const order = ['herbe', 'ardoise', 'sol', 'pave', 'terre', 'gravier', 'dalle'];
    this.matEdges = {};
    for (const kind of order) {
      if (kind === this.baseMat) continue;
      const organic = kind === 'terre' || kind === 'gravier';
      const paths = this.matPaths(kind, organic ? 0.16 : 0);
      if (!paths) continue;
      this.matEdges[kind] = paths.edge;
      c.fillStyle = this.isoPattern(c, P, kind); c.fill(paths.fill);
      if (organic) {
        c.save(); c.clip(paths.fill);
        c.lineWidth = 5; c.strokeStyle = 'rgba(10,8,4,0.22)'; c.stroke(paths.edge);
        c.restore();
      } else {
        // bordure de pierre : un filet sombre puis un filet clair, comme une margelle
        c.lineWidth = 2.6; c.strokeStyle = 'rgba(8,8,14,0.45)'; c.stroke(paths.edge);
        c.lineWidth = 1; c.strokeStyle = Renderer.rgba(kind === 'herbe' ? P.stone[3] : P.stone[4], 0.4); c.stroke(paths.edge);
      }
    }
    // Eau et lave.
    for (const kind of ['eau', 'lave']) {
      const paths = this.matPaths(kind, 0.2);
      if (!paths) continue;
      this.liquid = { kind, fill: paths.fill, edge: paths.edge };
      // berge : une bande humide et sombre autour
      c.lineWidth = 7; c.strokeStyle = kind === 'lave' ? 'rgba(20,6,2,0.65)' : 'rgba(6,12,20,0.35)'; c.stroke(paths.edge);
      c.fillStyle = this.isoPattern(c, P, kind); c.fill(paths.fill);
      c.save(); c.clip(paths.fill);
      if (kind === 'eau') {
        const g = c.createLinearGradient(0, this.origin.y - 16, 0, this.origin.y + m.h * 32);
        g.addColorStop(0, Renderer.rgba(P.sky.low, 0.45)); g.addColorStop(0.5, Renderer.rgba(P.sky.mid, 0.15)); g.addColorStop(1, 'rgba(0,0,0,0.12)');
        c.fillStyle = g; c.fill(paths.fill);
        c.lineWidth = 9; c.strokeStyle = 'rgba(2,8,20,0.45)'; c.stroke(paths.edge);
        c.lineWidth = 3; c.strokeStyle = 'rgba(2,8,20,0.5)'; c.stroke(paths.edge);
      } else {
        c.lineWidth = 8; c.strokeStyle = 'rgba(40,6,0,0.55)'; c.stroke(paths.edge);
      }
      c.restore();
      if (kind === 'eau') { c.lineWidth = 1.3; c.strokeStyle = 'rgba(200,232,255,0.4)'; c.stroke(paths.edge); }
      else { c.lineWidth = 1.6; c.strokeStyle = 'rgba(255,170,80,0.55)'; c.stroke(paths.edge); }
      if (kind === 'lave') {
        this.emit.fillStyle = Renderer.rgba(P.lava[3], 0.75); this.emit.fill(paths.fill);
      }
    }
    // Puits : des trous dans le sol, aux parois de roche qui plongent dans le noir.
    const tex = Renderer.texture(P, 'falaise');
    for (let y = 0; y < m.h; y++) for (let x = 0; x < m.w; x++) {
      if (this.mat[y][x] !== 'trou') continue;
      const a = this.vx(x, y), b = this.vx(x + 1, y), d = this.vx(x + 1, y + 1), e = this.vx(x, y + 1);
      const cell = new Path2D(); cell.moveTo(a.x, a.y); cell.lineTo(b.x, b.y); cell.lineTo(d.x, d.y); cell.lineTo(e.x, e.y); cell.closePath();
      c.save(); c.clip(cell);
      c.fillStyle = '#020309'; c.fill(cell);
      const pat = c.createPattern(tex, 'repeat');
      for (const [side, A, B] of [['x', e, a], ['y', a, b]]) {
        if (pat.setTransform && typeof DOMMatrix === 'function') pat.setTransform(new DOMMatrix([side === 'x' ? -0.5 : 0.5, 0.25, 0, 1, A.x, A.y]));
        const wall = new Path2D(); wall.moveTo(A.x, A.y); wall.lineTo(B.x, B.y); wall.lineTo(B.x, B.y + 40); wall.lineTo(A.x, A.y + 40); wall.closePath();
        c.fillStyle = pat; c.fill(wall);
        c.fillStyle = side === 'x' ? 'rgba(0,0,0,0.25)' : 'rgba(0,0,0,0.45)'; c.fill(wall);
      }
      const g = c.createLinearGradient(0, a.y, 0, d.y);
      g.addColorStop(0, 'rgba(2,3,9,0)'); g.addColorStop(0.55, 'rgba(2,3,9,0.85)'); g.addColorStop(1, 'rgba(2,3,9,1)');
      c.fillStyle = g; c.fill(cell);
      c.restore();
      c.lineWidth = 1.2; c.strokeStyle = Renderer.rgba(P.stone[3], 0.35);
      c.beginPath(); c.moveTo(e.x, e.y); c.lineTo(a.x, a.y); c.lineTo(b.x, b.y); c.stroke();
    }
  }

  // Touches au pinceau, à pleine résolution : brins d'herbe, fleurs, cailloux, braises, lèvre d'un bord.
  paintDetails(c, P, R) {
    const m = this.map;
    const rnd = Renderer.prng(this.seed ^ 0xde7a);
    const pt = (x, y, lo, hi) => this.vx(x + lo + rnd() * (hi - lo), y + lo + rnd() * (hi - lo));
    c.lineCap = 'round';
    const grassLit = P.grass.slice(3), grassDark = P.grass.slice(1, 4);
    for (let y = 0; y < m.h; y++) for (let x = 0; x < m.w; x++) {
      const mat = this.mat[y][x], t = m.cells[y][x];
      if (mat === 'herbe') {
        const n = t === Grid.FLOOR ? 11 : 6;
        for (let i = 0; i < n; i++) {
          const p = pt(x, y, 0.05, 0.95), h = 3 + rnd() * 4.5, lean = (rnd() - 0.5) * 4;
          c.lineWidth = 1.1;
          c.strokeStyle = grassDark[Math.floor(rnd() * grassDark.length)];
          c.beginPath(); c.moveTo(p.x, p.y); c.quadraticCurveTo(p.x + lean * 0.2, p.y - h * 0.6, p.x + lean, p.y - h); c.stroke();
          c.strokeStyle = grassLit[Math.floor(rnd() * grassLit.length)];
          c.lineWidth = 0.9;
          c.beginPath(); c.moveTo(p.x + lean * 0.45, p.y - h * 0.55); c.lineTo(p.x + lean, p.y - h); c.stroke();
        }
        if (t === Grid.FLOOR && P.id !== 'kaldum' && rnd() < (this.site === 'ville' ? 0.5 : 0.3)) {
          const cols = ['#f2e2c9', '#f2c25a', '#9fd0ff', '#e89ac0'];
          const col = cols[Math.floor(rnd() * cols.length)];
          for (let i = 0; i < 3 + rnd() * 3; i++) { const p = pt(x, y, 0.15, 0.85); c.fillStyle = col; c.beginPath(); c.arc(p.x, p.y - 2, 1.2, 0, Math.PI * 2); c.fill(); }
        }
      } else if (mat === 'terre' || mat === 'gravier') {
        for (let i = 0; i < 3; i++) {
          const p = pt(x, y, 0.15, 0.85), r = 1 + rnd() * 1.8;
          c.fillStyle = 'rgba(0,0,0,0.35)'; c.beginPath(); c.ellipse(p.x + 0.6, p.y + 0.6, r, r * 0.6, 0, 0, Math.PI * 2); c.fill();
          c.fillStyle = (mat === 'terre' ? P.dirt : P.gravel)[3]; c.beginPath(); c.ellipse(p.x, p.y, r, r * 0.6, 0, 0, Math.PI * 2); c.fill();
        }
      } else if (mat === 'ardoise' && P.lava && rnd() < 0.16 && t === Grid.FLOOR) {
        // une fêlure de braise qui court dans l'ardoise, avec une branche
        const u0 = 0.15 + rnd() * 0.3, v0 = 0.15 + rnd() * 0.7, ang = (rnd() - 0.5) * 0.9;
        const line = [], branch = [];
        for (let k = 0; k <= 6; k++) {
          const u = u0 + k * 0.11 * Math.cos(ang), v = v0 + k * 0.11 * Math.sin(ang) + (rnd() - 0.5) * 0.08;
          line.push(this.vx(x + Math.min(0.95, u), y + Math.min(0.95, Math.max(0.05, v))));
        }
        const b0 = line[2 + Math.floor(rnd() * 3)];
        branch.push(b0); branch.push({ x: b0.x + (rnd() - 0.5) * 8, y: b0.y + 3 + rnd() * 3 }); branch.push({ x: b0.x + (rnd() - 0.5) * 14, y: b0.y + 6 + rnd() * 3 });
        const draw = (ctx, w, col) => { ctx.lineWidth = w; ctx.strokeStyle = col; for (const L of [line, branch]) { ctx.beginPath(); L.forEach((p, i) => (i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y))); ctx.stroke(); } };
        draw(c, 2.4, 'rgba(0,0,0,0.65)'); draw(c, 1, P.lava[3]); draw(c, 0.45, P.lava[5]);
        draw(this.emit, 3.5, Renderer.rgba(P.lava[3], 0.7));
      } else if ((mat === 'pave' || mat === 'dalle') && P.moss && rnd() < 0.25) {
        for (let i = 0; i < 4; i++) { const p = pt(x, y, 0.1, 0.9); c.fillStyle = Renderer.rgba(P.moss[1 + (i % 2)], 0.55); c.beginPath(); c.ellipse(p.x, p.y, 2 + rnd() * 2.5, 1 + rnd(), 0, 0, Math.PI * 2); c.fill(); }
      }
    }
    // Touffes le long des chemins, pour casser la ligne.
    if (this.matEdges.terre || this.matEdges.gravier) {
      for (let y = 0; y < m.h; y++) for (let x = 0; x < m.w; x++) {
        if (this.mat[y][x] !== 'herbe' || m.cells[y][x] !== Grid.FLOOR) continue;
        for (const [dx, dy, u, v] of [[1, 0, 0.92, 0.5], [-1, 0, 0.08, 0.5], [0, 1, 0.5, 0.92], [0, -1, 0.5, 0.08]]) {
          const nm = this.matAt(x + dx, y + dy);
          if (nm !== 'terre' && nm !== 'gravier') continue;
          for (let i = 0; i < 4; i++) {
            const p = this.vx(x + u + (dx ? 0 : (rnd() - 0.5) * 0.8) + dx * 0.06, y + v + (dy ? 0 : (rnd() - 0.5) * 0.8) + dy * 0.06);
            for (let k = 0; k < 3; k++) {
              c.lineWidth = 1; c.strokeStyle = P.grass[2 + k];
              c.beginPath(); c.moveTo(p.x, p.y); c.lineTo(p.x + (k - 1) * 2, p.y - 3 - rnd() * 3); c.stroke();
            }
          }
        }
      }
    }
    // La lèvre d'une corniche : filet de lumière froide, pli d'ombre, herbe qui déborde.
    for (const F of this.faceList || []) {
      c.lineWidth = 2.2; c.strokeStyle = 'rgba(2,3,10,0.5)';
      c.beginPath(); c.moveTo(F.top[0].x, F.top[0].y + 1.5); c.lineTo(F.top[6].x, F.top[6].y + 1.5); c.stroke();
      c.lineWidth = 1.2; c.strokeStyle = F.f.side === 'y' ? 'rgba(200,225,255,0.55)' : 'rgba(255,214,170,0.4)';
      c.beginPath(); c.moveTo(F.top[0].x, F.top[0].y); c.lineTo(F.top[6].x, F.top[6].y); c.stroke();
      const mat = Grid.inBounds(this.map, F.f.x, F.f.y) ? this.mat[F.f.y][F.f.x] : this.entourage.baseMat;
      if (mat === 'herbe') {
        for (let i = 0; i < 6; i++) {
          const t = rnd(), x = F.top[0].x + (F.top[6].x - F.top[0].x) * t, y = F.top[0].y + (F.top[6].y - F.top[0].y) * t;
          c.strokeStyle = P.grass[2 + Math.floor(rnd() * 3)]; c.lineWidth = 1.1;
          c.beginPath(); c.moveTo(x, y - 1); c.quadraticCurveTo(x + (rnd() - 0.5) * 3, y + 2, x + (rnd() - 0.5) * 4, y + 3 + rnd() * 4); c.stroke();
        }
      }
    }
    // Liseré du bord arrière d'une corniche, éclairé par l'horizon.
    c.lineWidth = 1.4; c.strokeStyle = Renderer.rgba(P.sky.glow, 0.45);
    for (let y = 0; y < m.h; y++) for (let x = 0; x < m.w; x++) {
      if (this.isVoid(x, y)) continue;
      if (this.isVoid(x - 1, y)) { const a = this.vx(x, y), b = this.vx(x, y + 1); c.beginPath(); c.moveTo(a.x, a.y); c.lineTo(b.x, b.y); c.stroke(); }
      if (this.isVoid(x, y - 1)) { const a = this.vx(x, y), b = this.vx(x + 1, y); c.beginPath(); c.moveTo(a.x, a.y); c.lineTo(b.x, b.y); c.stroke(); }
    }
    // Petits cristaux au sol, au bord d'une corniche et des puits (pas sur une terrasse de la ville).
    const vallee = this.chute === 'vallee';
    for (let y = 0; y < m.h; y++) for (let x = 0; x < m.w; x++) {
      if (m.cells[y][x] !== Grid.FLOOR || this.isVoid(x, y)) continue;
      const nearVoid = (vallee && (this.isVoid(x + 1, y) || this.isVoid(x, y + 1) || this.isVoid(x - 1, y) || this.isVoid(x, y - 1))) || this.matAt(x + 1, y) === 'trou' || this.matAt(x, y + 1) === 'trou';
      if (!nearVoid || rnd() > P.crystals * 2.2) continue;
      const corner = this.isVoid(x + 1, y) ? [0.86, 0.3 + rnd() * 0.4] : this.isVoid(x, y + 1) ? [0.3 + rnd() * 0.4, 0.86] : [0.2 + rnd() * 0.6, 0.15];
      const p = this.vx(x + corner[0], y + corner[1]);
      const s = R.crystalSmall[Math.floor(rnd() * 3)];
      c.drawImage(s.cv, p.x - s.ax * 0.8, p.y - s.ay * 0.8, s.w * 0.8, s.h * 0.8);
      this.emitDot(p.x, p.y - 6, 14, P.crystal[3], 0.5);
      this.crystalSpots.push({ x: p.x, y: p.y - 6 });
    }
    // Sorties : chevrons d'or vers l'extérieur ; le chemin continue dans les alentours.
    for (let y = 0; y < m.h; y++) for (let x = 0; x < m.w; x++) {
      const k = m.kind[y][x];
      if (!'nsew'.includes(k)) continue;
      const d = { n: [0, -1], s: [0, 1], e: [1, 0], w: [-1, 0] }[k];
      const p = this.cellToScreen(x, y);
      const dir = { x: (d[0] - d[1]) * 0.5, y: (d[0] + d[1]) * 0.25 };
      for (let i = 0; i < 2; i++) {
        const cx = p.x + dir.x * (6 + i * 11), cy = p.y + dir.y * (6 + i * 11);
        const path = () => { c.beginPath(); c.moveTo(cx - dir.y * 12 - dir.x * 6, cy + dir.x * 6 - dir.y * 6); c.lineTo(cx, cy); c.lineTo(cx + dir.y * 12 - dir.x * 6, cy - dir.x * 6 - dir.y * 6); };
        path(); c.lineWidth = 4.5; c.strokeStyle = 'rgba(10,8,4,0.6)'; c.stroke();
        path(); c.lineWidth = 2.2; c.strokeStyle = '#e2c690'; c.stroke();
      }
      this.emitDot(p.x + dir.x * 12, p.y + dir.y * 12, 18, '#f2c25a', 0.35);
    }
    // Dais du relais : une estrade ronde incrustée d'or, au cœur cyan.
    for (const L of this.lights) {
      if (L.k !== 'Z') continue;
      const p = this.cellToScreen(L.x, L.y);
      c.fillStyle = P.cliff[1]; c.beginPath(); c.ellipse(p.x, p.y + 3, 30, 15, 0, 0, Math.PI * 2); c.fill();
      const g = c.createLinearGradient(p.x - 30, p.y - 15, p.x + 30, p.y + 15);
      g.addColorStop(0, P.stone[4]); g.addColorStop(1, P.stone[1]);
      c.fillStyle = g; c.beginPath(); c.ellipse(p.x, p.y, 30, 15, 0, 0, Math.PI * 2); c.fill();
      c.strokeStyle = P.ink; c.lineWidth = 1.4; c.stroke();
      c.strokeStyle = P.vein[1]; c.lineWidth = 1.8; c.beginPath(); c.ellipse(p.x, p.y, 24, 12, 0, 0, Math.PI * 2); c.stroke();
      for (let i = 0; i < 12; i++) { const a = i / 12 * Math.PI * 2; c.fillStyle = P.vein[2]; c.fillRect(p.x + Math.cos(a) * 27 - 0.8, p.y + Math.sin(a) * 13.5 - 0.8, 1.6, 1.6); }
      c.fillStyle = 'rgba(0,194,255,0.35)'; c.beginPath(); c.ellipse(p.x, p.y, 13, 6.5, 0, 0, Math.PI * 2); c.fill();
      c.strokeStyle = 'rgba(160,240,255,0.8)'; c.lineWidth = 1.2; c.stroke();
      this.emitDot(p.x, p.y, 26, '#00c2ff', 0.45);
    }
  }

  // Ombres douces au pied du décor (la lumière du ciel vient d'en haut à gauche).
  paintShadows(c) {
    for (const d of this.decor) {
      const p = this.cellToScreen(d.x, d.y);
      const r = d.foot || 20;
      this.softShadow(c, p.x + r * 0.22, p.y + 2, r * 1.15, r * 0.55, d.kind === 'mur' ? 0.55 : 0.75);
    }
  }

  // Lumière : ton de crépuscule bleu, brume au fond, flaques chaudes des lanternes.
  paintLight(c, P) {
    // Le ton du crépuscule, sur le plateau comme sur ses abords (js/entourage.js).
    this.entourage.gradeGround(c, this.calque);
    c.save();
    c.globalCompositeOperation = 'lighter';
    for (const L of this.lights) {
      const p = this.cellToScreen(L.x, L.y);
      if (L.k === 'L') this.pool(c, p.x, p.y, 130, L.color, 0.34);
      else if (L.k === 'Z') this.pool(c, p.x, p.y, 105, '#00c2ff', 0.26);
      else if (L.k === 'D') this.pool(c, p.x, p.y, 80, '#a66cff', 0.22);
      else this.pool(c, p.x, p.y, 110, L.color, 0.3);
    }
    if (this.liquid && this.liquid.kind === 'lave') for (const q of this.liquidCells) { const p = this.cellToScreen(q.x, q.y); this.pool(c, p.x, p.y, 70, P.lava[3], 0.12); }
    for (const s of this.crystalSpots) this.pool(c, s.x, s.y + 6, 40, '#00c2ff', 0.16);
    c.restore();
  }

  pool(c, x, y, r, color, a) {
    c.save(); c.translate(x, y); c.scale(1, 0.55);
    const g = c.createRadialGradient(0, 0, 0, 0, 0, r);
    g.addColorStop(0, Renderer.rgba(color, a)); g.addColorStop(0.3, Renderer.rgba(color, a * 0.5)); g.addColorStop(1, Renderer.rgba(color, 0));
    c.fillStyle = g; c.beginPath(); c.arc(0, 0, r, 0, Math.PI * 2); c.fill();
    c.restore();
  }

  // Le vignettage de la vue : un carré étiré à la taille de l'écran (l'ovale suit sa forme).
  static vignette() {
    if (Renderer._vignette) return Renderer._vignette;
    const N = 256, cv = Renderer.canvas(N, N), c = cv.getContext('2d');
    const g = c.createRadialGradient(N / 2, N / 2, N * 0.3, N / 2, N / 2, N * 0.72);
    g.addColorStop(0, 'rgba(2,4,10,0)'); g.addColorStop(0.55, 'rgba(2,4,10,0.16)'); g.addColorStop(1, 'rgba(2,4,10,0.55)');
    c.fillStyle = g; c.fillRect(0, 0, N, N);
    Renderer._vignette = cv;
    return cv;
  }

  // Les chemins réutilisés à chaque image : la grille de combat.
  buildPaths() {
    const m = this.map;
    // La grille de combat : chaque ligne de sommets tracée d'un seul trait sur les cases au sol,
    // pour que chaque arête ne soit dessinée qu'une fois.
    const grid = new Path2D();
    const floor = (x, y) => Grid.inBounds(m, x, y) && m.cells[y][x] === Grid.FLOOR && !this.isVoid(x, y);
    for (let i = 0; i <= m.w; i++) {
      let start = null;
      for (let j = 0; j <= m.h; j++) {
        const on = j < m.h && (floor(i - 1, j) || floor(i, j));
        if (on && start === null) start = j;
        if (!on && start !== null) { const a = this.vx(i, start), b = this.vx(i, j); grid.moveTo(a.x, a.y); grid.lineTo(b.x, b.y); start = null; }
      }
    }
    for (let j = 0; j <= m.h; j++) {
      let start = null;
      for (let i = 0; i <= m.w; i++) {
        const on = i < m.w && (floor(i, j - 1) || floor(i, j));
        if (on && start === null) start = i;
        if (!on && start !== null) { const a = this.vx(start, j), b = this.vx(i, j); grid.moveTo(a.x, a.y); grid.lineTo(b.x, b.y); start = null; }
      }
    }
    this.gridPath = grid;
  }

  // ----- Sprites du décor -----

  treeSprite(P, rnd, scale, variant) {
    if (P.tree === 'basalte') return this.columnSprite(P, rnd, variant % 2 === 1, true);
    const conifer = P.tree === 'feuillu' && variant >= 4 && scale >= 1;
    const dead = P.tree === 'mort';
    const h = (conifer ? 52 : 42) * scale + rnd() * 10 * scale;
    return this.spr(90, h + 46, 45, h + 34, c => {
      if (conifer) this.paintConifer(c, P, rnd, h, scale);
      else if (dead) this.paintDeadTree(c, P, rnd, h, scale);
      else this.paintTree(c, P, rnd, h, scale);
    });
  }

  paintTree(c, P, rnd, h, s) {
    const L = P.leaves, B = P.bark, ink = P.ink;
    const lean = (rnd() - 0.5) * 5;
    if (s >= 0.9) {
      const tw = 4.2 * s;
      c.beginPath();
      c.moveTo(-tw - 5 * s, 2);
      c.quadraticCurveTo(-tw, -1, -tw * 0.8, -8 * s);
      c.lineTo(lean - tw * 0.55, -h * 0.75);
      c.lineTo(lean + tw * 0.55, -h * 0.75);
      c.lineTo(tw * 0.8, -8 * s);
      c.quadraticCurveTo(tw, -1, tw + 6 * s, 2);
      c.quadraticCurveTo(0, 4, -tw - 5 * s, 2);
      const g = c.createLinearGradient(-tw, 0, tw, 0);
      g.addColorStop(0, B[3]); g.addColorStop(0.45, B[2]); g.addColorStop(1, B[0]);
      c.fillStyle = g; c.fill(); c.strokeStyle = ink; c.lineWidth = 1.5; c.stroke();
      c.strokeStyle = 'rgba(0,0,0,0.35)'; c.lineWidth = 0.8;
      for (let i = 0; i < 3; i++) { const x = -tw * 0.5 + i * tw * 0.5; c.beginPath(); c.moveTo(x, -4); c.lineTo(x + lean * 0.4, -h * 0.55); c.stroke(); }
      c.strokeStyle = B[2]; c.lineWidth = 2.4 * s;
      c.beginPath(); c.moveTo(lean * 0.6, -h * 0.55); c.quadraticCurveTo(lean - 6 * s, -h * 0.72, lean - 12 * s, -h * 0.86);
      c.moveTo(lean * 0.7, -h * 0.62); c.quadraticCurveTo(lean + 6 * s, -h * 0.74, lean + 11 * s, -h * 0.9); c.stroke();
    }
    const R = 13 * s;
    const layout = s >= 0.9
      ? [[-11, -4, 0.95, 0], [11, -6, 0.95, 0], [0, -15, 1.05, 0], [-16, 7, 0.78, 1], [16, 6, 0.8, 1], [-6, 7, 0.95, 2], [7, 9, 0.9, 2], [0, -2, 1.1, 2]]
      : [[-9, 2, 0.85, 0], [9, 1, 0.85, 0], [0, -5, 1, 1], [-4, 6, 0.9, 2], [6, 6, 0.85, 2]];
    const cl = layout.map(([dx, dy, k, layer]) => ({ x: lean + dx * s + (rnd() - 0.5) * 3, y: -h + dy * s + (rnd() - 0.5) * 3 + (s < 0.9 ? h * 0.75 : 0), r: R * k * (0.88 + rnd() * 0.24), layer }));
    this.paintFoliage(c, P, rnd, cl, L, ink);
    // les buissons d'Orsane fleurissent : quelques touches ivoire, rose ou or
    if (s < 0.9 && P.tree === 'feuillu' && rnd() < 0.8) {
      const cols = ['#f2e2c9', '#f0a8c8', '#f2c25a', '#c8b0ff'], col = cols[Math.floor(rnd() * cols.length)];
      for (let i = 0; i < 7; i++) {
        const q = cl[Math.floor(rnd() * cl.length)], a = Math.PI * (1.05 + rnd() * 0.9), rr = q.r * (0.3 + rnd() * 0.55);
        const x = q.x + Math.cos(a) * rr, y = q.y + Math.sin(a) * rr;
        c.fillStyle = 'rgba(10,20,20,0.5)'; c.beginPath(); c.arc(x + 0.6, y + 0.6, 1.6, 0, Math.PI * 2); c.fill();
        c.fillStyle = col; c.beginPath(); c.arc(x, y, 1.5, 0, Math.PI * 2); c.fill();
      }
    }
  }

  // Le feuillage en couches : silhouette d'encre, masse sombre, touches de lumière, liseré.
  paintFoliage(c, P, rnd, cl, L, ink) {
    c.fillStyle = ink;
    for (const q of cl) { c.beginPath(); c.arc(q.x, q.y, q.r + 1.8, 0, Math.PI * 2); c.fill(); }
    c.fillStyle = L[1];
    for (const q of cl) { c.beginPath(); c.arc(q.x, q.y, q.r, 0, Math.PI * 2); c.fill(); }
    const top = Math.min(...cl.map(q => q.y - q.r)), bottom = Math.max(...cl.map(q => q.y + q.r));
    for (const q of [...cl].sort((a, b) => a.layer - b.layer)) {
      c.save(); c.beginPath(); c.arc(q.x, q.y, q.r, 0, Math.PI * 2); c.clip();
      const n = Math.round(q.r * q.r * 0.34);
      for (let i = 0; i < n; i++) {
        const a = rnd() * Math.PI * 2, rr = Math.sqrt(rnd()) * q.r;
        const lx = Math.cos(a) * rr, ly = Math.sin(a) * rr;
        const height = 1 - ((q.y + ly) - top) / Math.max(1, bottom - top);
        let v = 0.42 - (lx * 0.5 + ly * 0.9) / q.r * 0.3 + height * 0.3 + (rnd() - 0.5) * 0.26 + q.layer * 0.05;
        v = Math.min(0.999, Math.max(0, v));
        c.fillStyle = L[Math.floor(v * L.length)];
        c.beginPath(); c.ellipse(q.x + lx, q.y + ly, 2.2 + rnd() * 1.8, 1.5 + rnd() * 1.1, rnd() * Math.PI, 0, Math.PI * 2); c.fill();
      }
      // ombre propre en bas à droite de chaque touffe
      const g = c.createRadialGradient(q.x - q.r * 0.35, q.y - q.r * 0.4, q.r * 0.3, q.x - q.r * 0.2, q.y - q.r * 0.2, q.r * 1.25);
      g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, 'rgba(4,12,20,0.5)');
      c.fillStyle = g; c.fillRect(q.x - q.r, q.y - q.r, q.r * 2, q.r * 2);
      c.restore();
    }
    // liseré de lumière froide sur les bords exposés en haut à gauche
    c.strokeStyle = P.rim; c.lineWidth = 1.4;
    for (const q of cl) {
      for (let a = Math.PI * 0.95; a < Math.PI * 1.7; a += 0.12) {
        const x = q.x + Math.cos(a) * (q.r - 0.6), y = q.y + Math.sin(a) * (q.r - 0.6);
        const hidden = cl.some(o => o !== q && o.layer >= q.layer && Math.hypot(x - o.x, y - o.y) < o.r - 0.5);
        if (hidden) continue;
        c.beginPath(); c.arc(q.x, q.y, q.r - 0.6, a, a + 0.13); c.stroke();
      }
    }
  }

  paintConifer(c, P, rnd, h, s) {
    const L = P.leaves, B = P.bark, ink = P.ink;
    c.fillStyle = B[1]; c.strokeStyle = ink; c.lineWidth = 1.3;
    c.beginPath(); c.moveTo(-3, 2); c.lineTo(-2, -12); c.lineTo(2, -12); c.lineTo(3, 2); c.closePath(); c.fill(); c.stroke();
    const tiers = 4;
    for (let t = 0; t < tiers; t++) {
      const yb = -8 - t * (h - 8) / tiers * 0.95, w = (19 - t * 3.6) * s, th = (h / tiers) * 1.5;
      const path = new Path2D();
      path.moveTo(-w, yb); path.quadraticCurveTo(-w * 0.3, yb - th * 0.45, 0, yb - th); path.quadraticCurveTo(w * 0.3, yb - th * 0.45, w, yb);
      path.quadraticCurveTo(0, yb + 5, -w, yb); path.closePath();
      c.lineWidth = 3.4; c.strokeStyle = ink; c.stroke(path);
      c.save(); c.clip(path);
      c.fillStyle = L[1]; c.fillRect(-w, yb - th, w * 2, th + 6);
      const n = Math.round(w * th * 0.32);
      for (let i = 0; i < n; i++) {
        const lx = (rnd() - 0.5) * 2 * w, ly = -rnd() * th;
        let v = 0.42 - lx / w * 0.3 - ly / th * 0.15 + (rnd() - 0.5) * 0.3 + t * 0.05;
        v = Math.min(0.999, Math.max(0, v));
        c.fillStyle = L[Math.floor(v * L.length)];
        c.beginPath(); c.ellipse(lx, yb + ly, 2.4, 1.2, (lx < 0 ? 0.5 : -0.5), 0, Math.PI * 2); c.fill();
      }
      const g = c.createLinearGradient(0, yb - th, 0, yb + 4);
      g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, 'rgba(4,12,20,0.5)');
      c.fillStyle = g; c.fillRect(-w, yb - th, w * 2, th + 6);
      c.restore();
      c.strokeStyle = P.rim; c.lineWidth = 1.2;
      c.beginPath(); c.moveTo(-w + 2, yb - 1); c.quadraticCurveTo(-w * 0.3, yb - th * 0.45, 0, yb - th + 1); c.stroke();
    }
  }

  paintDeadTree(c, P, rnd, h, s) {
    const B = P.bark, ink = P.ink;
    const branch = (x, y, a, len, w, depth) => {
      const x2 = x + Math.cos(a) * len, y2 = y + Math.sin(a) * len;
      c.strokeStyle = ink; c.lineWidth = w + 2; c.beginPath(); c.moveTo(x, y); c.lineTo(x2, y2); c.stroke();
      c.strokeStyle = B[2]; c.lineWidth = w; c.beginPath(); c.moveTo(x, y); c.lineTo(x2, y2); c.stroke();
      if (depth > 0) { branch(x2, y2, a - 0.4 - rnd() * 0.4, len * 0.68, w * 0.62, depth - 1); branch(x2, y2, a + 0.3 + rnd() * 0.4, len * 0.62, w * 0.6, depth - 1); }
    };
    branch(0, 0, -Math.PI / 2 + (rnd() - 0.5) * 0.2, h * 0.45, 5 * s, 3);
  }

  // Colonne : fût de pierre et chapiteau doré (donjon), ou orgue de basalte et brasero (Kaldum).
  columnSprite(P, rnd, withFire, basalt) {
    basalt = basalt || P.column === 'basalte';
    const h = basalt ? 40 + rnd() * 12 : 48;
    const sp = this.spr(48, h + 40, 24, h + 28, c => {
      const ink = P.ink;
      if (basalt) {
        const r = 11, pts = [];
        for (let i = 0; i < 6; i++) { const a = i / 6 * Math.PI * 2 + Math.PI / 6; pts.push([Math.cos(a) * r, Math.sin(a) * r * 0.5]); }
        for (let i = 0; i < 6; i++) {
          const a = pts[i], b = pts[(i + 1) % 6], mid = (i + 0.5) / 6 * Math.PI * 2 + Math.PI / 6;
          if (Math.sin(mid) <= 0) continue;
          const lit = 0.55 - Math.cos(mid) * 0.38;
          c.fillStyle = Renderer.ramp(P.rock, lit);
          c.beginPath(); c.moveTo(a[0], a[1]); c.lineTo(b[0], b[1]); c.lineTo(b[0], b[1] - h); c.lineTo(a[0], a[1] - h); c.closePath(); c.fill();
          c.strokeStyle = Renderer.rgba(ink, 0.6); c.lineWidth = 0.8; c.stroke();
        }
        c.fillStyle = P.rock[4]; c.beginPath(); pts.forEach((p, i) => (i ? c.lineTo(p[0], p[1] - h) : c.moveTo(p[0], p[1] - h))); c.closePath(); c.fill();
        c.strokeStyle = ink; c.lineWidth = 1.4; c.stroke();
        // cerclage de fer et rivets
        c.fillStyle = '#26232a'; c.fillRect(-11, -h * 0.72 - 3, 22, 5);
        c.fillStyle = 'rgba(255,200,150,0.5)'; for (let x = -8; x <= 8; x += 4) c.fillRect(x, -h * 0.72 - 1.5, 1.2, 1.2);
        c.strokeStyle = ink; c.lineWidth = 1.6;
        c.beginPath(); c.moveTo(-r * 0.87, pts[0][1] - h); c.lineTo(-r * 0.87, pts[0][1]); c.stroke();
        c.beginPath(); c.moveTo(r * 0.87, pts[0][1] - h); c.lineTo(r * 0.87, pts[0][1]); c.stroke();
        if (withFire) {
          c.fillStyle = '#1c1a1e'; c.beginPath(); c.ellipse(0, -h - 2, 10, 4.5, 0, 0, Math.PI); c.fill();
          c.beginPath(); c.moveTo(-10, -h - 2); c.quadraticCurveTo(0, -h + 8, 10, -h - 2); c.fill(); c.strokeStyle = ink; c.lineWidth = 1.2; c.stroke();
          c.fillStyle = P.lava ? P.lava[4] : '#ffb544'; c.beginPath(); c.ellipse(0, -h - 2.5, 8, 3, 0, 0, Math.PI * 2); c.fill();
        }
      } else {
        const r = 9;
        c.fillStyle = P.stone[1]; c.beginPath(); c.ellipse(0, -1, r + 4, (r + 4) * 0.5, 0, 0, Math.PI * 2); c.fill(); c.strokeStyle = ink; c.lineWidth = 1.3; c.stroke();
        c.fillStyle = P.stone[2]; c.fillRect(-r - 4, -6, (r + 4) * 2, 5);
        const g = c.createLinearGradient(-r, 0, r, 0);
        g.addColorStop(0, P.stone[4]); g.addColorStop(0.35, P.stone[3]); g.addColorStop(1, P.stone[0]);
        c.fillStyle = g; c.fillRect(-r, -h, r * 2, h - 5);
        c.strokeStyle = 'rgba(0,0,0,0.18)'; c.lineWidth = 1;
        for (let x = -r + 3; x < r; x += 3.5) { c.beginPath(); c.moveTo(x, -h + 4); c.lineTo(x, -7); c.stroke(); }
        c.strokeStyle = ink; c.lineWidth = 1.5; c.strokeRect(-r, -h, r * 2, h - 5);
        c.fillStyle = P.stone[3]; c.fillRect(-r - 4, -h - 6, (r + 4) * 2, 6); c.strokeRect(-r - 4, -h - 6, (r + 4) * 2, 6);
        c.fillStyle = P.vein[1]; c.fillRect(-r - 4, -h - 1.5, (r + 4) * 2, 2);
        c.fillStyle = P.stone[4]; c.beginPath(); c.ellipse(0, -h - 6, r + 4, (r + 4) * 0.45, 0, 0, Math.PI * 2); c.fill(); c.stroke();
      }
    }, P.tint);
    sp.height = h; sp.fire = !!withFire;
    return sp;
  }

  // Rocher à facettes, veiné d'or (ou de braise), avec mousse ou cristaux.
  rockSprite(P, rnd, crystals) {
    return this.spr(70, 70, 35, 50, c => {
      const n = 7 + Math.floor(rnd() * 3);
      const rx = 24, ry = 12, z = 22 + rnd() * 12;
      const B = [], T = [];
      for (let i = 0; i < n; i++) {
        const a = i / n * Math.PI * 2 + rnd() * 0.35, r = 0.85 + rnd() * 0.18;
        B.push({ x: Math.cos(a) * rx * r, y: Math.sin(a) * ry * r + 2, a });
      }
      const skew = (rnd() - 0.5) * 6;
      for (const b of B) T.push({ x: b.x * (0.42 + rnd() * 0.16) + skew, y: b.y * 0.45 - z * (0.85 + rnd() * 0.25) });
      const sides = [];
      for (let i = 0; i < n; i++) {
        const j = (i + 1) % n, mid = Math.atan2(B[i].y + B[j].y, B[i].x + B[j].x);
        if (Math.sin(mid) < -0.25) continue;
        sides.push({ i, j, mid, depth: B[i].y + B[j].y });
      }
      sides.sort((a, b) => a.depth - b.depth);
      // contour d'encre : l'enveloppe de tous les points
      const all = B.concat(T);
      const hull = Renderer.hull(all);
      c.beginPath(); hull.forEach((p, i) => (i ? c.lineTo(p.x, p.y) : c.moveTo(p.x, p.y))); c.closePath();
      c.lineWidth = 4; c.strokeStyle = P.ink; c.stroke();
      for (const s of sides) {
        const lit = 0.5 - Math.cos(s.mid) * 0.32 - Math.sin(s.mid) * 0.08;
        c.fillStyle = Renderer.ramp(P.rock, lit);
        c.beginPath(); c.moveTo(B[s.i].x, B[s.i].y); c.lineTo(B[s.j].x, B[s.j].y); c.lineTo(T[s.j].x, T[s.j].y); c.lineTo(T[s.i].x, T[s.i].y); c.closePath(); c.fill();
        c.strokeStyle = Renderer.rgba(P.ink, 0.45); c.lineWidth = 0.9; c.stroke();
      }
      c.fillStyle = Renderer.ramp(P.rock, 0.86);
      c.beginPath(); T.forEach((p, i) => (i ? c.lineTo(p.x, p.y) : c.moveTo(p.x, p.y))); c.closePath(); c.fill();
      c.strokeStyle = Renderer.rgba(P.rock[5], 0.5); c.lineWidth = 1; c.stroke();
      // veine : une fêlure de métal ou de braise qui descend une facette
      const s0 = sides[Math.floor(sides.length / 2)];
      if (s0 && !crystals) {
        const a = T[s0.i], b = B[s0.j];
        const pts = [[a.x * 0.7 + T[s0.j].x * 0.3, a.y * 0.7 + T[s0.j].y * 0.3]];
        for (let k = 1; k <= 4; k++) pts.push([pts[0][0] + (b.x - pts[0][0]) * k / 4 + (rnd() - 0.5) * 4, pts[0][1] + (b.y - pts[0][1]) * k / 4]);
        const draw = (w, col) => { c.lineWidth = w; c.strokeStyle = col; c.beginPath(); pts.forEach((p, i) => (i ? c.lineTo(p[0], p[1]) : c.moveTo(p[0], p[1]))); c.stroke(); };
        draw(3, 'rgba(0,0,0,0.55)'); draw(1.6, P.vein[1]); draw(0.6, P.vein[2]);
      }
      if (P.moss) {
        for (let i = 0; i < 26; i++) {
          const t = T[Math.floor(rnd() * T.length)], k = rnd();
          const x = t.x * k * 0.8 + skew * (1 - k), y = t.y + (rnd() - 0.3) * 4;
          c.fillStyle = Renderer.rgba(P.moss[Math.floor(rnd() * 3)], 0.85); c.beginPath(); c.ellipse(x, y, 2.2, 1.2, 0, 0, Math.PI * 2); c.fill();
        }
      }
      if (crystals) {
        const s = crystals;
        c.drawImage(s.cv, skew - s.ax * 0.9 + 3, T[0].y + 4 - s.ay * 0.9, s.w * 0.9, s.h * 0.9);
      }
    }, P.tint);
  }

  static hull(pts) {
    const p = pts.slice().sort((a, b) => a.x - b.x || a.y - b.y);
    const cross = (o, a, b) => (a.x - o.x) * (b.y - o.y) - (a.y - o.y) * (b.x - o.x);
    const lo = [], up = [];
    for (const q of p) { while (lo.length >= 2 && cross(lo[lo.length - 2], lo[lo.length - 1], q) <= 0) lo.pop(); lo.push(q); }
    for (let i = p.length - 1; i >= 0; i--) { const q = p[i]; while (up.length >= 2 && cross(up[up.length - 2], up[up.length - 1], q) <= 0) up.pop(); up.push(q); }
    up.pop(); lo.pop();
    return lo.concat(up);
  }

  // Grappe de cristaux bleus facettés, pointes blanches.
  crystalSprite(P, rnd, size) {
    const C = P.crystal;
    return this.spr(44 * size + 8, 50 * size + 8, 22 * size + 4, 44 * size + 4, c => {
      const n = 3 + Math.floor(rnd() * 3), shards = [];
      for (let i = 0; i < n; i++) shards.push({ a: -Math.PI / 2 + (rnd() - 0.5) * 1.3, len: (14 + rnd() * 22) * size, w: (3.5 + rnd() * 3) * size, x: (rnd() - 0.5) * 12 * size });
      shards.sort((a, b) => a.len - b.len);
      for (const s of shards) {
        const dx = Math.cos(s.a), dy = Math.sin(s.a), nx = -dy, ny = dx;
        const bx = s.x, by = 0;
        const tip = [bx + dx * s.len, by + dy * s.len];
        const mid = [bx + dx * s.len * 0.72, by + dy * s.len * 0.72];
        const L = [[bx + nx * s.w, by + ny * s.w], [mid[0] + nx * s.w, mid[1] + ny * s.w], tip];
        const Rr = [[bx - nx * s.w, by - ny * s.w], [mid[0] - nx * s.w, mid[1] - ny * s.w], tip];
        const poly = (pts, fill) => { c.fillStyle = fill; c.beginPath(); pts.forEach((p, i) => (i ? c.lineTo(p[0], p[1]) : c.moveTo(p[0], p[1]))); c.closePath(); c.fill(); };
        c.lineWidth = 2.4; c.strokeStyle = C[0];
        c.beginPath(); c.moveTo(L[0][0], L[0][1]); c.lineTo(L[1][0], L[1][1]); c.lineTo(tip[0], tip[1]); c.lineTo(Rr[1][0], Rr[1][1]); c.lineTo(Rr[0][0], Rr[0][1]); c.closePath(); c.stroke();
        poly([[bx, by], L[0], L[1], tip, [mid[0], mid[1]]], C[4]);
        poly([[bx, by], Rr[0], Rr[1], tip, [mid[0], mid[1]]], C[2]);
        poly([L[1], tip, [mid[0], mid[1]]], C[5]);
        poly([Rr[1], tip, [mid[0], mid[1]]], C[3]);
        c.strokeStyle = 'rgba(255,255,255,0.7)'; c.lineWidth = 0.8;
        c.beginPath(); c.moveTo(bx, by); c.lineTo(mid[0], mid[1]); c.lineTo(tip[0], tip[1]); c.stroke();
      }
    });
  }

  // Bloc de mur maçonné : calcaire clair et filet d'or (Orsane), pierre froide et fer (Kaldum).
  wallSprite(P, rnd, h) {
    const kald = P.wall === 'fer';
    const S = kald ? P.cobble : P.stone;
    return this.spr(72, h + 40, 36, h + 22, c => {
      const ink = P.ink;
      const left = new Path2D(); left.moveTo(-32, 0); left.lineTo(0, 16); left.lineTo(0, 16 - h); left.lineTo(-32, -h); left.closePath();
      const right = new Path2D(); right.moveTo(0, 16); right.lineTo(32, 0); right.lineTo(32, -h); right.lineTo(0, 16 - h); right.closePath();
      const top = new Path2D(); top.moveTo(0, -16 - h); top.lineTo(32, -h); top.lineTo(0, 16 - h); top.lineTo(-32, -h); top.closePath();
      const sil = new Path2D(); sil.moveTo(-32, 0); sil.lineTo(0, 16); sil.lineTo(32, 0); sil.lineTo(32, -h); sil.lineTo(0, -16 - h); sil.lineTo(-32, -h); sil.closePath();
      c.lineWidth = 3.6; c.strokeStyle = ink; c.stroke(sil);
      c.fillStyle = S[kald ? 3 : 3]; c.fill(left);
      c.fillStyle = S[1]; c.fill(right);
      // assises de pierres : joints horizontaux, joints verticaux décalés, tons variés
      const course = 9;
      for (const [face, sx] of [[left, -1], [right, 1]]) {
        c.save(); c.clip(face);
        for (let row = 0; row * course < h + 2; row++) {
          const y0 = -row * course;
          const off = row % 2 ? 8 : 0;
          for (let u = -off; u < 32; u += 16) {
            const x0 = sx < 0 ? -32 + u : u, x1 = x0 + 16;
            const yA = sx < 0 ? (x0 + 32) * 0.5 : 16 - x0 * 0.5, yB = sx < 0 ? (x1 + 32) * 0.5 : 16 - x1 * 0.5;
            c.fillStyle = rnd() < 0.5 ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.1)';
            c.beginPath(); c.moveTo(x0, y0 + yA); c.lineTo(x1, y0 + yB); c.lineTo(x1, y0 + yB - course); c.lineTo(x0, y0 + yA - course); c.closePath(); c.fill();
            c.strokeStyle = 'rgba(0,0,0,0.3)'; c.lineWidth = 1; c.beginPath(); c.moveTo(x0, y0 + yA); c.lineTo(x0, y0 + yA - course); c.stroke();
          }
          c.strokeStyle = 'rgba(0,0,0,0.32)'; c.lineWidth = 1;
          c.beginPath(); c.moveTo(sx < 0 ? -32 : 0, y0 + (sx < 0 ? 0 : 16)); c.lineTo(sx < 0 ? 0 : 32, y0 + (sx < 0 ? 16 : 0)); c.stroke();
        }
        c.restore();
      }
      const tg = c.createLinearGradient(-32, -h - 16, 32, -h + 16);
      tg.addColorStop(0, S[4]); tg.addColorStop(1, S[2]);
      c.fillStyle = tg; c.fill(top);
      c.strokeStyle = Renderer.rgba(ink, 0.5); c.lineWidth = 0.9; c.stroke(top);
      // filet d'or (ou de fer) sous la couvertine
      c.strokeStyle = kald ? '#3a3640' : P.vein[1]; c.lineWidth = kald ? 2.6 : 1.8;
      c.beginPath(); c.moveTo(-32, -h + 3.5); c.lineTo(0, 16 - h + 3.5); c.lineTo(32, -h + 3.5); c.stroke();
      if (kald) { c.fillStyle = 'rgba(255,190,140,0.55)'; for (let x = -28; x <= 28; x += 7) c.fillRect(x - 0.6, (x < 0 ? (x + 32) * 0.5 : 16 - x * 0.5) - h + 2.8, 1.2, 1.2); }
      c.strokeStyle = 'rgba(255,245,225,0.35)'; c.lineWidth = 1; c.beginPath(); c.moveTo(0, 16 - h); c.lineTo(0, 15); c.stroke();
      if (P.moss && !kald) for (let i = 0; i < 10; i++) { const x = (rnd() - 0.5) * 60, y = (x < 0 ? (x + 32) * 0.5 : 16 - x * 0.5) - rnd() * 5; c.fillStyle = Renderer.rgba(P.moss[Math.floor(rnd() * 3)], 0.8); c.beginPath(); c.ellipse(x, y, 2.5, 1.3, 0, 0, Math.PI * 2); c.fill(); }
    }, P.tint);
  }

  // Rempart de roche brute : un bloc taillé dans la falaise, au sommet irrégulier (moussu ou fêlé de braise).
  rampartSprite(P, rnd, h) {
    const tex = Renderer.texture(P, 'falaise');
    return this.spr(76, h + 48, 38, h + 28, c => {
      const ink = P.ink;
      const j = () => (rnd() - 0.5) * 7;
      const tl = [-32, -h + j()], tt = [0, -16 - h + j() - 3], tr = [32, -h + j()], tb = [0, 16 - h + j()];
      const ml = [-16, (tl[1] + tb[1]) / 2 + 8 + j() - 4], mr = [16, (tb[1] + tr[1]) / 2 + j() - 2];
      const left = new Path2D(); left.moveTo(-32, 0); left.lineTo(0, 16); left.lineTo(tb[0], tb[1]); left.lineTo(ml[0], ml[1]); left.lineTo(tl[0], tl[1]); left.closePath();
      const right = new Path2D(); right.moveTo(0, 16); right.lineTo(32, 0); right.lineTo(tr[0], tr[1]); right.lineTo(mr[0], mr[1]); right.lineTo(tb[0], tb[1]); right.closePath();
      const top = new Path2D(); top.moveTo(tl[0], tl[1]); top.lineTo(tt[0], tt[1]); top.lineTo(tr[0], tr[1]); top.lineTo(mr[0], mr[1]); top.lineTo(tb[0], tb[1]); top.lineTo(ml[0], ml[1]); top.closePath();
      const sil = new Path2D(); sil.moveTo(-32, 0); sil.lineTo(0, 16); sil.lineTo(32, 0); sil.lineTo(tr[0], tr[1]); sil.lineTo(tt[0], tt[1]); sil.lineTo(tl[0], tl[1]); sil.closePath();
      c.lineWidth = 3.6; c.strokeStyle = ink; c.stroke(sil);
      for (const [face, side] of [[left, 'y'], [right, 'x']]) {
        const pat = c.createPattern(tex, 'repeat');
        if (pat.setTransform && typeof DOMMatrix === 'function') pat.setTransform(new DOMMatrix([side === 'x' ? -0.5 : 0.5, 0.25, 0, 1, rnd() * 200, rnd() * 200]));
        c.fillStyle = pat; c.fill(face);
        c.fillStyle = side === 'x' ? 'rgba(4,6,14,0.4)' : 'rgba(150,180,255,0.08)'; c.fill(face);
      }
      const g = c.createLinearGradient(-32, tt[1], 32, tb[1]);
      g.addColorStop(0, P.rock[4]); g.addColorStop(1, P.rock[2]);
      c.fillStyle = g; c.fill(top);
      c.strokeStyle = Renderer.rgba(ink, 0.6); c.lineWidth = 1; c.stroke(top);
      c.strokeStyle = Renderer.rgba(P.rock[5], 0.5); c.lineWidth = 1.2;
      c.beginPath(); c.moveTo(tl[0], tl[1]); c.lineTo(ml[0], ml[1]); c.lineTo(tb[0], tb[1]); c.stroke();
      if (P.moss) {
        for (let i = 0; i < 30; i++) {
          const u = rnd(), v = rnd();
          const x = (u - v) * 26, y = tt[1] + (u + v) * 15 + 2;
          c.fillStyle = Renderer.rgba(P.moss[Math.floor(rnd() * 3)], 0.9); c.beginPath(); c.ellipse(x, y, 2.6, 1.3, 0, 0, Math.PI * 2); c.fill();
        }
        for (let i = 0; i < 5; i++) { const x = -30 + rnd() * 28, y = (x + 32) * 0.5 - h + 4; c.strokeStyle = P.moss[1]; c.lineWidth = 1.2; c.beginPath(); c.moveTo(x, y); c.lineTo(x + (rnd() - 0.5) * 3, y + 6 + rnd() * 8); c.stroke(); }
      } else if (P.lava && rnd() < 0.4) {
        // une veine de braise qui descend une face, différente à chaque bloc
        const sx = rnd() < 0.5 ? -1 : 1, x0 = sx * (6 + rnd() * 20);
        const yTop = (sx < 0 ? (x0 + 32) * 0.5 : 16 - x0 * 0.5) - h + 5;
        const pts = [[x0, yTop]];
        for (let k = 1; k <= 6; k++) pts.push([x0 + (rnd() - 0.5) * 7, yTop + k * h * 0.12]);
        for (const [w, col] of [[2.2, 'rgba(0,0,0,0.6)'], [0.9, P.lava[3]], [0.4, P.lava[5]]]) { c.lineWidth = w; c.strokeStyle = col; c.beginPath(); pts.forEach((q, i) => (i ? c.lineTo(q[0], q[1]) : c.moveTo(q[0], q[1]))); c.stroke(); }
      }
    }, P.tint);
  }

  // Lanterne de fer à verre chaud (Orsane), ou brasero sur trépied (Kaldum).
  lampSprite(P) {
    return this.spr(40, 70, 20, 60, c => {
      const ink = P.ink;
      if (P.lamp === 'brasero') {
        c.strokeStyle = ink; c.lineWidth = 3;
        c.beginPath(); c.moveTo(-8, 2); c.lineTo(0, -24); c.lineTo(8, 2); c.moveTo(0, 3); c.lineTo(0, -24); c.stroke();
        c.strokeStyle = '#4a4248'; c.lineWidth = 1.4;
        c.beginPath(); c.moveTo(-8, 2); c.lineTo(0, -24); c.lineTo(8, 2); c.stroke();
        c.fillStyle = '#211d22'; c.beginPath(); c.moveTo(-11, -27); c.quadraticCurveTo(0, -17, 11, -27); c.closePath(); c.fill(); c.lineWidth = 1.4; c.strokeStyle = ink; c.stroke();
        c.fillStyle = P.lava ? P.lava[4] : '#ffb544'; c.beginPath(); c.ellipse(0, -27.5, 10, 3.2, 0, 0, Math.PI * 2); c.fill();
        c.fillStyle = '#fff0b0'; c.beginPath(); c.ellipse(0, -27.8, 5, 1.6, 0, 0, Math.PI * 2); c.fill();
        return;
      }
      c.fillStyle = P.stone[1]; c.beginPath(); c.ellipse(0, 0, 7, 3.5, 0, 0, Math.PI * 2); c.fill(); c.strokeStyle = ink; c.lineWidth = 1.2; c.stroke();
      c.fillStyle = P.stone[2]; c.fillRect(-4.5, -6, 9, 6); c.strokeRect(-4.5, -6, 9, 6);
      c.strokeStyle = ink; c.lineWidth = 3.6; c.beginPath(); c.moveTo(0, -6); c.lineTo(0, -40); c.stroke();
      c.strokeStyle = '#4a5068'; c.lineWidth = 1.4; c.beginPath(); c.moveTo(-0.6, -6); c.lineTo(-0.6, -40); c.stroke();
      c.strokeStyle = ink; c.lineWidth = 1.5;
      c.beginPath(); c.arc(-3.5, -31, 3, -Math.PI * 0.2, Math.PI * 1.1); c.arc(3.5, -31, 3, Math.PI * 1.9, Math.PI * 0.8, true); c.stroke();
      // cage
      c.fillStyle = ink; c.beginPath(); c.moveTo(-7.5, -50); c.lineTo(0, -56); c.lineTo(7.5, -50); c.closePath(); c.fill();
      const g = c.createLinearGradient(0, -50, 0, -39);
      g.addColorStop(0, '#fff6d0'); g.addColorStop(0.5, P.lantern); g.addColorStop(1, Renderer.mix(P.lantern, '#7a3a08', 0.4));
      c.fillStyle = g; c.fillRect(-5, -50, 10, 11);
      c.strokeStyle = ink; c.lineWidth = 1.3; c.strokeRect(-5, -50, 10, 11);
      c.beginPath(); c.moveTo(0, -50); c.lineTo(0, -39); c.stroke();
      c.fillStyle = ink; c.fillRect(-6.5, -40, 13, 2.4);
      c.fillStyle = P.vein[1]; c.beginPath(); c.arc(0, -57, 1.8, 0, Math.PI * 2); c.fill();
    }, P.tint);
  }

  // Entrée de donjon : arche de pierre à filet d'or, clef de cristal, portail du Voile.
  doorSprite(P) {
    return this.spr(80, 96, 40, 76, c => {
      const ink = P.ink, S = P.stone;
      c.fillStyle = S[1]; this.diamond(c, 0, 4, 52, 26); c.fill(); c.strokeStyle = ink; c.lineWidth = 1.2; c.stroke();
      c.fillStyle = S[2]; this.diamond(c, 0, 0, 44, 22); c.fill(); c.stroke();
      const portal = new Path2D();
      portal.moveTo(-14, 0); portal.lineTo(-14, -34); portal.ellipse(0, -34, 14, 16, 0, Math.PI, 0); portal.lineTo(14, 0); portal.closePath();
      const g = c.createRadialGradient(0, -24, 2, 0, -24, 26);
      g.addColorStop(0, '#d9c8ff'); g.addColorStop(0.25, '#7a4ad8'); g.addColorStop(0.6, '#24124a'); g.addColorStop(1, '#0a0618');
      c.fillStyle = g; c.fill(portal);
      c.save(); c.clip(portal);
      c.strokeStyle = 'rgba(0,194,255,0.55)'; c.lineWidth = 1.2;
      for (let i = 0; i < 5; i++) { c.beginPath(); c.ellipse(0, -24, 4 + i * 3.5, 6 + i * 4, i * 0.6, 0.3, Math.PI * 1.4); c.stroke(); }
      c.restore();
      for (const sx of [-1, 1]) {
        const x = sx * 19;
        const pg = c.createLinearGradient(x - 6, 0, x + 6, 0);
        pg.addColorStop(0, S[4]); pg.addColorStop(1, S[1]);
        c.fillStyle = pg; c.fillRect(x - 6, -40, 12, 42);
        c.strokeStyle = ink; c.lineWidth = 1.5; c.strokeRect(x - 6, -40, 12, 42);
        c.fillStyle = S[3]; c.fillRect(x - 7.5, -44, 15, 5); c.strokeRect(x - 7.5, -44, 15, 5);
      }
      c.lineWidth = 9; c.strokeStyle = ink; c.beginPath(); c.ellipse(0, -40, 19, 21, 0, Math.PI, 0); c.stroke();
      c.lineWidth = 6.5; c.strokeStyle = S[3]; c.stroke();
      c.lineWidth = 1.6; c.strokeStyle = P.vein[1]; c.beginPath(); c.ellipse(0, -40, 16.5, 18.5, 0, Math.PI, 0); c.stroke();
      c.fillStyle = S[4]; c.beginPath(); c.moveTo(-5, -62); c.lineTo(5, -62); c.lineTo(3.5, -54); c.lineTo(-3.5, -54); c.closePath(); c.fill(); c.strokeStyle = ink; c.lineWidth = 1.2; c.stroke();
      c.fillStyle = P.crystal[4]; c.beginPath(); c.moveTo(0, -66); c.lineTo(3, -60); c.lineTo(0, -55); c.lineTo(-3, -60); c.closePath(); c.fill(); c.strokeStyle = P.crystal[0]; c.stroke();
    }, P.tint);
  }

  // Relais : obélisque de pierre cerclé d'or ; le cristal qui flotte au-dessus est animé à part.
  relaySprite(P) {
    return this.spr(50, 60, 25, 44, c => {
      const ink = P.ink, S = P.stone;
      c.fillStyle = S[1]; this.diamond(c, 0, 1, 26, 13); c.fill(); c.strokeStyle = ink; c.lineWidth = 1.2; c.stroke();
      c.fillStyle = S[2]; c.fillRect(-8, -6, 16, 6); c.strokeRect(-8, -6, 16, 6);
      const g = c.createLinearGradient(-6, 0, 6, 0);
      g.addColorStop(0, S[4]); g.addColorStop(0.4, S[3]); g.addColorStop(1, S[0]);
      c.fillStyle = g; c.beginPath(); c.moveTo(-6, -6); c.lineTo(-4, -28); c.lineTo(4, -28); c.lineTo(6, -6); c.closePath(); c.fill(); c.lineWidth = 1.5; c.stroke();
      c.fillStyle = P.vein[1]; c.fillRect(-5.5, -12, 11, 1.8); c.fillRect(-4.6, -24, 9.2, 1.6);
      c.fillStyle = ink; c.beginPath(); c.moveTo(-7, -28); c.quadraticCurveTo(0, -24, 7, -28); c.lineTo(5, -31); c.lineTo(-5, -31); c.closePath(); c.fill();
      c.fillStyle = P.vein[1]; c.fillRect(-5, -31, 10, 1.4);
    }, P.tint);
  }

  // La liste du décor qui se trie avec les figures, et les cases qu'il peut masquer.
  buildDecor(P, R) {
    const m = this.map, site = this.site;
    const rnd = Renderer.prng(this.seed ^ 0xdec0);
    this.decor = [];
    for (let y = 0; y < m.h; y++) for (let x = 0; x < m.w; x++) {
      if (this.isVoid(x, y)) continue;
      const t = m.cells[y][x], k = m.kind[y][x];
      const front = x === m.w - 1 || y === m.h - 1;
      let spr = null, kind = null, foot = 20;
      if (t === Grid.ROCK) {
        const linked = [[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dy]) => Grid.tile(m, x + dx, y + dy) === Grid.ROCK && !this.isVoid(x + dx, y + dy));
        if (site === 'ville' || site === 'donjon') { spr = (front ? R.wallsLow : R.wallsTall)[Math.floor(rnd() * (front ? 2 : 3))]; kind = 'mur'; foot = 30; }
        else if (linked) { spr = (front ? R.rampartsLow : R.ramparts)[Math.floor(rnd() * (front ? 2 : 3))]; kind = 'mur'; foot = 30; }
        else if (rnd() < P.crystals * 3) { spr = R.crystalRocks[Math.floor(rnd() * 2)]; kind = 'rocher'; foot = 24; this.crystalSpots.push(Object.assign(this.cellToScreen(x, y), { y: this.cellToScreen(x, y).y - 30 })); }
        else { spr = R.rocks[Math.floor(rnd() * R.rocks.length)]; kind = 'rocher'; foot = 24; }
      } else if (t === Grid.TREE) {
        if (site === 'donjon' && P.column !== 'basalte') { spr = R.columns[0]; kind = 'colonne'; foot = 13; }
        else if (P.tree === 'basalte') {
          const fire = rnd() < 0.5;
          spr = R.columns.find(s => s.fire === fire) || R.columns[0]; kind = 'colonne'; foot = 14;
          if (spr.fire) this.lights.push({ x, y, k: 'B', h: spr.height + 4, color: P.lantern, glow: P.glow, r: 0.8 });
        } else if (front) { spr = R.bushes[Math.floor(rnd() * R.bushes.length)]; kind = 'buisson'; foot = 18; }
        else { spr = R.trees[Math.floor(rnd() * R.trees.length)]; kind = 'arbre'; foot = 20; }
      }
      if (k === 'L') { spr = R.lamp; kind = 'lanterne'; foot = 9; }
      if (k === 'D') { spr = R.door; kind = 'porte'; foot = 24; }
      if (k === 'Z') { spr = R.relay; kind = 'relais'; foot = 12; }
      if (!spr) continue;
      const p = this.cellToScreen(x, y);
      const d = { x, y, depth: x + y - 0.01, spr, kind, foot, fade: 1, isDecor: true, px: p.x, py: p.y };
      // Cases derrière ce décor, que son sprite recouvre : on l'efface s'il y a quelqu'un ou une surbrillance.
      d.cover = [];
      const L = p.x - spr.w * 0.36, Rr = p.x + spr.w * 0.36, T = p.y - spr.ay * 0.92, B = p.y - 6;
      for (let cy = y - 4; cy <= y; cy++) for (let cx = x - 4; cx <= x; cx++) {
        if ((cx === x && cy === y) || !Grid.inBounds(m, cx, cy) || cx + cy >= x + y) continue;
        const q = this.cellToScreen(cx, cy);
        if (q.x > L + 4 && q.x < Rr - 4 && q.y + 4 > T && q.y - 40 < B) d.cover.push(Grid.key(cx, cy));
      }
      this.decor.push(d);
    }
    // Ce qui ne recouvre que de la roche, des arbres ou le vide ne masquera jamais rien : on le cuit.
    this.decor.sort((a, b) => a.depth - b.depth);
    const at = new Map(this.decor.map(d => [Grid.key(d.x, d.y), d]));
    for (const d of this.decor) {
      d.baked = d.kind !== 'relais' && d.kind !== 'porte' && d.cover.every(k => {
        const [cx, cy] = k.split(',').map(Number);
        if (this.isVoid(cx, cy)) return true;
        const t = m.cells[cy][cx];
        if (t !== Grid.ROCK && t !== Grid.TREE) return false;
        const o = at.get(k);
        return !o || o.baked;
      });
    }
  }

  // ----- Image -----

  draw(now) {
    const c = this.ctx;
    // Le calque fixe se refait au changement de carte, une fois : hors de la mesure, qui juge le coût
    // d'une image ordinaire.
    this.buildStatic();
    const t0 = performance.now();
    const dt = Math.min(0.1, Math.max(0, (now - this.lastNow) / 1000));
    this.lastNow = now;
    const high = this.quality === 'haute';
    // Les étiquettes gardent une taille lisible à tout zoom (uiAt).
    const z = this.camera.zoom;
    this.uiK = Math.min(1.3, Math.max(0.9, z)) / z;
    c.setTransform(1, 0, 0, 1, 0, 0);
    c.globalCompositeOperation = 'source-over';
    c.globalAlpha = 1;
    this.worldTransform(c);
    this.drawSurroundings(c);
    if (this.staticBloom) {
      c.save(); c.globalCompositeOperation = 'lighter'; c.globalAlpha = 0.68; c.imageSmoothingEnabled = true;
      c.drawImage(this.staticBloom, 0, 0, this.W, this.SH); c.restore();
    }
    c.lineJoin = 'round'; c.lineCap = 'round';
    this.bloomBegin(high);

    this.drawLiquid(c, now);
    this.drawGroundLife(c, now);

    const inCombat = this.inCombat;
    if (inCombat && this.tactique) this.drawTactical(c);
    this.drawHighlights(c, now, inCombat);
    this.drawGuideCue(c, now);
    this.drawGroundFx(c, now);

    // Les figures et le décor, du fond vers l'avant.
    const sprites = inCombat ? this.combatSprites(now) : this.worldSprites(now);
    this.drawScene(c, now, dt, sprites, inCombat);

    if (!(inCombat && this.tactique)) this.drawLights(c, now);
    this.updateParticles(now, dt);
    this.drawParticles(c, now);
    this.drawGuideBeam(c, now);
    this.drawShots(c, now, dt);
    this.drawBloom(c, now);
    this.drawVignette(c);
    this.drawOverlays(c, now, sprites, inCombat);

    this.floats = this.floats.filter(f => now - f.born < 900);
    const u = this.uiK;
    for (const f of this.floats) {
      const t = (now - f.born) / 900;
      const p = this.cellToScreen(f.x, f.y);
      const pop = t < 0.12 ? 0.7 + t / 0.12 * 0.45 : 1.15 - Math.min(0.15, (t - 0.12) * 0.6);
      c.save();
      c.globalAlpha = 1 - t * t;
      c.translate(p.x, p.y - 50 - t * 30 * u); c.scale(pop * u, pop * u);
      c.font = '800 18px Inter, "Segoe UI", system-ui, sans-serif'; c.textAlign = 'center'; c.textBaseline = 'middle';
      c.lineWidth = 4.5; c.strokeStyle = '#0b0f18'; c.strokeText(f.text, 0, 0);
      c.fillStyle = f.color; c.fillText(f.text, 0, 0);
      c.restore();
    }
    c.globalAlpha = 1;
    c.textBaseline = 'alphabetic';
    this.measure(performance.now() - t0);
  }

  // ----- Couche lumineuse (bloom) -----

  bloomBegin(high) {
    if (!high) { this.bl = null; return; }
    const w = Math.ceil(this.W / 2), h = Math.ceil(this.SH / 2);
    if (!this.bloomSrc || this.bloomSrc.width !== w || this.bloomSrc.height !== h) {
      this.bloomSrc = Renderer.canvas(w, h);
      this.bloomBlur = Renderer.canvas(w, h);
    }
    const b = this.bloomSrc.getContext('2d');
    b.setTransform(1, 0, 0, 1, 0, 0);
    b.clearRect(0, 0, w, h);
    b.setTransform(0.5, 0, 0, 0.5, 0, 0);
    b.globalCompositeOperation = 'lighter';
    this.bl = b;
    this.blUsed = false;
  }

  bglow(x, y, r, color, a) {
    if (!this.bl) return;
    this.bl.globalAlpha = Math.min(1, a);
    this.bl.drawImage(Renderer.dot(color), x - r, y - r, r * 2, r * 2);
    this.blUsed = true;
  }

  drawBloom(c, now) {
    if (!this.bl) return;
    if (!this.blUsed) return;
    c.save();
    this.worldTransform(c);
    c.globalCompositeOperation = 'lighter';
    c.imageSmoothingEnabled = true;
    {
      const bb = this.bloomBlur.getContext('2d');
      bb.setTransform(1, 0, 0, 1, 0, 0);
      bb.globalCompositeOperation = 'source-over';
      bb.clearRect(0, 0, this.bloomBlur.width, this.bloomBlur.height);
      Renderer.blurInto(bb, this.bloomSrc, 5, 1);
      c.globalAlpha = 0.9;
      c.drawImage(this.bloomBlur, 0, 0, this.W, this.SH);
    }
    c.restore();
  }

  // Les alentours puis le plateau : les bandes du lointain sous le calque proche. Au-delà de ce qui
  // est peint (seulement le temps qu'une nouvelle taille de vue soit repeinte), la couleur du
  // lointain.
  drawSurroundings(c) {
    const E = this.alentours, K = this.calque, v = this.camera.visibleWorld();
    if (!E || v.x0 < E.x || v.y0 < E.y || v.x1 > E.x + E.w || v.y1 > E.y + E.h) {
      c.fillStyle = this.entourage ? this.entourage.farColor : '#10141c';
      c.fillRect(v.x0, v.y0, v.x1 - v.x0, v.y1 - v.y0);
    }
    for (const b of this.lointain) if (b.x < v.x1 && b.x + b.w > v.x0 && b.y < v.y1 && b.y + b.h > v.y0) c.drawImage(b.cv, b.x, b.y, b.w, b.h);
    c.drawImage(this.static, K.x, K.y, K.w, K.h);
  }

  // Le vignettage, à la taille de l'écran : les bords de la vue s'assombrissent doucement.
  drawVignette(c) {
    c.setTransform(1, 0, 0, 1, 0, 0);
    c.drawImage(Renderer.vignette(), 0, 0, this.canvas.width, this.canvas.height);
    this.worldTransform(c);
  }

  // Une étiquette (barre de vie, nom, marque de quête, chiffre qui monte) garde une taille lisible
  // quel que soit le zoom : on la met à l'échelle autour de son point d'attache.
  uiAt(c, x, y, fn) {
    const k = this.uiK || 1;
    if (Math.abs(k - 1) < 0.01) { fn(); return; }
    c.save(); c.translate(x, y); c.scale(k, k); c.translate(-x, -y);
    fn();
    c.restore();
  }

  // ----- Eau et lave animées -----

  drawLiquid(c, now) {
    const L = this.liquid;
    if (!L) return;
    const P = this.palette;
    c.save();
    c.clip(L.fill);
    if (L.kind === 'eau') {
      // vaguelettes qui glissent, et des éclats de ciel qui scintillent
      c.lineWidth = 1.1;
      for (const q of this.liquidCells) {
        const p = this.cellToScreen(q.x, q.y), n = Renderer.noise(q.x, q.y);
        for (let i = 0; i < 2; i++) {
          const ph = now / 1400 + n * 6.3 + i * 2.1;
          const ox = Math.sin(ph) * 8, oy = (i - 0.5) * 10 + Math.cos(ph * 0.7) * 2;
          c.strokeStyle = `rgba(190,230,255,${0.16 + 0.12 * Math.sin(ph * 1.3)})`;
          c.beginPath(); c.moveTo(p.x - 14 + ox, p.y + oy); c.quadraticCurveTo(p.x + ox, p.y + oy - 3, p.x + 14 + ox, p.y + oy); c.stroke();
        }
        const g = Math.sin(now / 300 + n * 40);
        if (g > 0.75) { c.fillStyle = `rgba(255,255,255,${(g - 0.75) * 3})`; c.fillRect(p.x + (n - 0.5) * 30, p.y + (Renderer.noise(q.y, q.x) - 0.5) * 12, 2.2, 1); }
      }
    } else {
      // lave : la croûte respire, la chaleur pulse
      c.globalCompositeOperation = 'lighter';
      for (const q of this.liquidCells) {
        const p = this.cellToScreen(q.x, q.y), n = Renderer.noise(q.x, q.y);
        const a = 0.12 + 0.1 * Math.sin(now / 700 + n * 12);
        c.globalAlpha = a;
        c.drawImage(Renderer.dot(P.lava[4]), p.x - 34, p.y - 20, 68, 40);
      }
      c.globalAlpha = 1;
    }
    c.restore();
  }

  // Sorties qui pulsent, relais qui respire.
  drawGroundLife(c, now) {
    if (this.inCombat || !this.exitCells || !this.exitCells.length) return;
    c.globalCompositeOperation = 'lighter';
    const a = 0.18 + 0.12 * Math.sin(now / 500);
    for (const e of this.exitCells) {
      const p = this.cellToScreen(e.x, e.y);
      c.globalAlpha = a;
      c.drawImage(Renderer.dot('#f2c25a'), p.x - 26, p.y - 13, 52, 26);
    }
    c.globalAlpha = 1;
    c.globalCompositeOperation = 'source-over';
  }

  // ----- Surbrillances de combat : lisibles avant tout -----

  static get HL() {
    return {
      departJ: { fill: 'rgba(56,150,255,0.42)', edge: 'rgba(160,215,255,1)' },
      departM: { fill: 'rgba(235,64,56,0.38)', edge: 'rgba(255,155,135,0.95)' },
      move: { fill: 'rgba(80,214,110,0.40)', edge: 'rgba(176,255,180,1)' },
      range: { fill: 'rgba(36,140,255,0.42)', edge: 'rgba(140,208,255,1)' },
      blocked: { fill: 'rgba(4,6,14,0.58)', edge: 'rgba(150,160,190,0.55)' },
      aoe: { fill: 'rgba(255,150,36,0.6)', edge: 'rgba(255,240,170,1)' },
      eau: { fill: 'rgba(40,120,200,0.58)', edge: 'rgba(150,210,255,0.7)' },
      fente: { fill: 'rgba(16,6,26,0.92)', edge: 'rgba(196,128,255,0.9)' },
      glyphe: { fill: 'rgba(70,200,190,0.32)', edge: 'rgba(160,255,240,0.85)' },
      glypheE: { fill: 'rgba(200,90,60,0.32)', edge: 'rgba(255,190,150,0.85)' },
    };
  }

  // Hachures claires de la zone d'effet : elles se lisent sur tous les sols, même sur la lave.
  stripes(c) {
    if (!this._stripes) {
      const cv = Renderer.canvas(12, 12), g = cv.getContext('2d');
      g.strokeStyle = 'rgba(255,246,214,0.55)'; g.lineWidth = 2.2;
      for (const o of [-12, 0, 12]) { g.beginPath(); g.moveTo(o, 12); g.lineTo(o + 12, 0); g.stroke(); }
      this._stripes = c.createPattern(cv, 'repeat');
    }
    return this._stripes;
  }

  drawHighlights(c, now, inCombat) {
    const H = this.highlights, m = this.map, cb = this.combat;
    const placement = inCombat && cb.phase === 'placement';
    if (inCombat && this.gridPath) {
      c.lineWidth = 1; c.strokeStyle = 'rgba(220,232,255,0.13)'; c.stroke(this.gridPath);
    }
    const anyHL = placement || H.move.size || H.range.size || H.blocked.size || H.aoe.size || (inCombat && (cb.temp.size || (cb.glyphs || []).length));
    if (anyHL) {
      const groups = {};
      const fentes = [];
      for (let y = 0; y < m.h; y++) {
        for (let x = 0; x < m.w; x++) {
          const k = Grid.key(x, y);
          const tmp = inCombat ? cb.tempAt(x, y) : null;
          let st = null;
          if (tmp && tmp.kind === 'water') st = 'eau';
          if (tmp && tmp.kind === 'fente') { st = 'fente'; fentes.push({ x, y }); }
          // Glyphes : turquoise pour ceux qui protègent, rouille pour ceux qui frappent.
          const gl = inCombat && cb.glyphsAt ? cb.glyphsAt(x, y) : [];
          if (gl.length) st = gl.some(g => g.affects === 'allies') ? 'glyphe' : 'glypheE';
          if (placement) {
            if (cb.isStartCell('player', x, y)) st = 'departJ';
            else if (cb.isStartCell('monster', x, y)) st = 'departM';
          }
          if (H.move.has(k)) st = 'move';
          if (H.range.has(k)) st = 'range';
          if (H.blocked.has(k)) st = 'blocked';
          if (H.aoe.has(k)) st = 'aoe';
          if (!st) continue;
          const p = this.cellToScreen(x, y);
          (groups[st] || (groups[st] = new Path2D()));
          Renderer.addDiamond(groups[st], p.x, p.y, 0.88);
        }
      }
      const S = Renderer.HL;
      for (const st of ['eau', 'fente', 'glyphe', 'glypheE', 'departJ', 'departM', 'move', 'range', 'blocked', 'aoe']) {
        const path = groups[st];
        if (!path) continue;
        // La zone d'effet bat vite ; les cases de départ du joueur respirent pendant le placement.
        const pulse = st === 'aoe' ? 0.85 + 0.15 * Math.sin(now / 200) : st === 'departJ' ? 0.72 + 0.28 * Math.sin(now / 340) : 1;
        c.globalAlpha = pulse;
        c.fillStyle = S[st].fill; c.fill(path);
        if (st === 'aoe') { c.fillStyle = this.stripes(c); c.fill(path); }
        c.globalAlpha = 1;
        c.lineWidth = 3.4; c.strokeStyle = 'rgba(2,4,12,0.5)'; c.stroke(path);
        c.lineWidth = st === 'aoe' ? 2 : 1.6; c.strokeStyle = S[st].edge; c.stroke(path);
      }
      for (const f of fentes) { const p = this.cellToScreen(f.x, f.y); this.bglow(p.x, p.y, 26, '#a66cff', 0.5); }
    }

    // Les pièges de l'équipe du joueur sont visibles pour lui ; ceux des monstres restent cachés.
    if (inCombat) {
      for (const tr of this.combat.traps) {
        if (tr.owner.team !== 'player') continue;
        const p = this.cellToScreen(tr.x, tr.y);
        const col = DATA.elements[tr.element].color;
        const cross = () => { c.beginPath(); c.moveTo(p.x - 9, p.y - 5); c.lineTo(p.x + 9, p.y + 5); c.moveTo(p.x + 9, p.y - 5); c.lineTo(p.x - 9, p.y + 5); };
        cross(); c.lineWidth = 4.5; c.strokeStyle = 'rgba(4,6,14,0.7)'; c.stroke();
        cross(); c.lineWidth = 2.2; c.strokeStyle = col; c.stroke();
        this.bglow(p.x, p.y, 14, col, 0.5);
      }
    }

    // Chemin prévu.
    for (let i = 0; i < H.path.length; i++) {
      const s = H.path[i];
      const p = this.cellToScreen(s.x, s.y);
      const last = i === H.path.length - 1;
      c.fillStyle = 'rgba(4,6,14,0.65)'; c.beginPath(); c.arc(p.x, p.y, last ? 6.5 : 5, 0, Math.PI * 2); c.fill();
      c.fillStyle = last ? '#ffe3a1' : 'rgba(255,248,230,0.95)'; c.beginPath(); c.arc(p.x, p.y, last ? 4.5 : 3.4, 0, Math.PI * 2); c.fill();
    }
    if (!inCombat && this.world && this.world.player.path.length) {
      for (const s of this.world.player.path) {
        const p = this.cellToScreen(s.x, s.y);
        c.fillStyle = 'rgba(4,6,14,0.45)'; c.beginPath(); c.arc(p.x, p.y, 4, 0, Math.PI * 2); c.fill();
        c.fillStyle = 'rgba(255,240,210,0.7)'; c.beginPath(); c.arc(p.x, p.y, 2.6, 0, Math.PI * 2); c.fill();
      }
    }
    if (H.hover && Grid.inBounds(m, H.hover.x, H.hover.y)) {
      const p = this.cellToScreen(H.hover.x, H.hover.y);
      this.diamond(c, p.x, p.y, Grid.TILE_W * 0.94, Grid.TILE_H * 0.94);
      c.fillStyle = 'rgba(255,255,255,0.1)'; c.fill();
      c.lineWidth = 4; c.strokeStyle = 'rgba(2,4,12,0.55)'; c.stroke();
      c.lineWidth = 2; c.strokeStyle = '#ffffff'; c.stroke();
    }
  }

  // Les cases touchées par un sort : un losange qui s'ouvre et un anneau, en lumière additive.
  drawGroundFx(c, now) {
    this.fx = this.fx.filter(f => now - f.born < f.dur);
    if (!this.fx.length) return;
    c.globalCompositeOperation = 'lighter';
    for (const f of this.fx) {
      const t = (now - f.born) / f.dur;
      if (t < 0) continue;
      const p = this.cellToScreen(f.x, f.y);
      if (!f.sparked) { f.sparked = true; this.burst(f.x, f.y, f.color, this.quality === 'haute' ? 8 : 4); }
      c.globalAlpha = (1 - t) * 0.6;
      this.diamond(c, p.x, p.y, Grid.TILE_W * (0.3 + 0.7 * t), Grid.TILE_H * (0.3 + 0.7 * t));
      c.fillStyle = f.color; c.fill();
      c.globalAlpha = 1 - t;
      this.diamond(c, p.x, p.y, Grid.TILE_W * (0.55 + 0.6 * t), Grid.TILE_H * (0.55 + 0.6 * t));
      c.lineWidth = 2; c.strokeStyle = f.color; c.stroke();
      c.globalAlpha = (1 - t) * 0.9;
      const r = 22 + 20 * t;
      c.drawImage(Renderer.dot(f.color), p.x - r, p.y - 14 - r, r * 2, r * 2);
      this.bglow(p.x, p.y - 12, r * 1.3, f.color, (1 - t) * 0.9);
    }
    c.globalAlpha = 1;
    c.globalCompositeOperation = 'source-over';
  }

  // ----- Repères du guide (js/guide.js) : la case qui brille et la flèche de sortie -----

  // Formes partagées avec js/render-gl.js, en coordonnées du plateau. La case : un losange de
  // cristal qui respire, un losange intérieur, quatre chevrons qui pointent vers le centre.
  static cueGeometry(p, now) {
    const t = 0.5 + 0.5 * Math.sin(now / 280);
    const W = Grid.TILE_W / 2, H = Grid.TILE_H / 2;
    const dia = k => [[p.x, p.y - H * k], [p.x + W * k, p.y], [p.x, p.y + H * k], [p.x - W * k, p.y]];
    const d = 0.74 + 0.12 * (1 - t), s = 5.5;
    const chevrons = [
      [[p.x + W * d, p.y - s], [p.x + W * d - s * 1.1, p.y], [p.x + W * d, p.y + s]],
      [[p.x - W * d, p.y - s], [p.x - W * d + s * 1.1, p.y], [p.x - W * d, p.y + s]],
      [[p.x - s * 1.3, p.y - H * d], [p.x, p.y - H * d + s * 0.6], [p.x + s * 1.3, p.y - H * d]],
      [[p.x - s * 1.3, p.y + H * d], [p.x, p.y + H * d - s * 0.6], [p.x + s * 1.3, p.y + H * d]],
    ];
    // Une onde part de la case et s'élargit en s'effaçant.
    const r = (now % 1500) / 1500;
    return { t, outer: dia(0.97), inner: dia(0.5), chevrons, ripple: dia(1 + 0.42 * r), rippleA: 0.75 * (1 - r) * (1 - r) };
  }

  // La colonne de lumière qui monte du repère, et trois éclats qui y glissent vers le haut.
  static beamGeometry(p, now) {
    const H = 84, sparks = [];
    for (let i = 0; i < 3; i++) {
      const k = (now / 1700 + i / 3) % 1;
      sparks.push({ x: p.x + Math.sin(k * 6.3 + i * 2.1) * 6, y: p.y - 8 - k * (H - 14), a: Math.sin(k * Math.PI) * 0.9 });
    }
    return { x: p.x, y0: p.y, y1: p.y - H, w0: 15, w1: 5, a: 0.34 + 0.12 * Math.sin(now / 280), sparks };
  }

  // La flèche de sortie, posée à plat sur la case de sortie du côté `side` et pointée vers
  // l'extérieur ; elle avance et recule d'un souffle.
  static arrowGeometry(map, origin, side, now) {
    const cells = map && map.exits && map.exits[side];
    if (!cells || !cells.length) return null;
    const mid = cells[Math.floor((cells.length - 1) / 2)];
    const D = { n: [0, -1], s: [0, 1], e: [1, 0], w: [-1, 0] }[side];
    const N = [-D[1], D[0]];
    const k = 0.5 + 0.5 * Math.sin(now / 260);
    const off = 0.1 + 0.3 * k;
    const g = (u, v) => Grid.toScreen(mid.x + D[0] * (u + off) + N[0] * v, mid.y + D[1] * (u + off) + N[1] * v, origin);
    const pts = [g(-0.5, -0.3), g(0.95, -0.3), g(0.95, -0.85), g(2.25, 0), g(0.95, 0.85), g(0.95, 0.3), g(-0.5, 0.3)];
    return { k, pts, tip: g(2.25, 0), base: g(-0.5, 0), mid: g(0.9, 0) };
  }

  cuePoint(cue) {
    const o = cue && (cue.group || cue.entity || cue.cell);
    if (!o) return null;
    return { x: o.rx != null ? o.rx : o.x, y: o.ry != null ? o.ry : o.y };
  }

  drawGuideCue(c, now) {
    const cue = this.guideCue;
    if (!cue) return;
    const poly = pts => { c.beginPath(); pts.forEach((q, i) => (i ? c.lineTo(q[0] != null ? q[0] : q.x, q[1] != null ? q[1] : q.y) : c.moveTo(q[0] != null ? q[0] : q.x, q[1] != null ? q[1] : q.y))); };
    const at = this.cuePoint(cue);
    if (at) {
      const p = this.cellToScreen(at.x, at.y);
      const G = Renderer.cueGeometry(p, now);
      c.save();
      c.globalCompositeOperation = 'lighter';
      c.globalAlpha = 0.35 + 0.3 * G.t;
      c.drawImage(Renderer.dot('#00c2ff'), p.x - 54, p.y - 30, 108, 60);
      c.restore();
      // Pas de trait noir : le bord se lit sur un liseré de bleu profond, puis le cristal.
      poly(G.outer); c.closePath();
      c.fillStyle = `rgba(0,194,255,${0.24 + 0.14 * G.t})`; c.fill();
      c.lineWidth = 4; c.strokeStyle = 'rgba(10,42,74,0.5)'; c.stroke();
      c.lineWidth = 2.2; c.strokeStyle = '#8fe9ff'; c.stroke();
      poly(G.ripple); c.closePath();
      c.lineWidth = 2; c.strokeStyle = `rgba(143,233,255,${G.rippleA})`; c.stroke();
      poly(G.inner); c.closePath();
      c.lineWidth = 1.4; c.strokeStyle = `rgba(230,251,255,${0.55 + 0.35 * G.t})`; c.stroke();
      for (const ch of G.chevrons) {
        poly(ch); c.lineWidth = 4.4; c.strokeStyle = 'rgba(10,42,74,0.55)'; c.stroke();
        poly(ch); c.lineWidth = 2.2; c.strokeStyle = '#e6fbff'; c.stroke();
      }
      this.bglow(p.x, p.y, 38, '#00c2ff', 0.45 + 0.3 * G.t);
    }
    if (cue.edge && !this.inCombat) {
      const A = Renderer.arrowGeometry(this.map, this.origin, cue.edge, now);
      if (!A) return;
      c.save();
      c.globalCompositeOperation = 'lighter';
      c.globalAlpha = 0.5 + 0.3 * A.k;
      c.drawImage(Renderer.dot('#f2c25a'), A.mid.x - 80, A.mid.y - 46, 160, 92);
      c.restore();
      poly(A.pts); c.closePath();
      const g = c.createLinearGradient(A.base.x, A.base.y, A.tip.x, A.tip.y);
      g.addColorStop(0, '#8e7144'); g.addColorStop(0.55, '#e2c690'); g.addColorStop(1, '#fff3d2');
      c.fillStyle = g; c.fill();
      c.lineWidth = 4; c.strokeStyle = 'rgba(110,85,48,0.7)'; c.stroke();
      c.lineWidth = 1.6; c.strokeStyle = '#fff3d2'; c.stroke();
      this.bglow(A.mid.x, A.mid.y, 58, '#f2b134', 0.55 + 0.3 * A.k);
    }
  }

  // La colonne de lumière du repère, par-dessus les figures (elle se voit derrière un arbre).
  drawGuideBeam(c, now) {
    const at = this.cuePoint(this.guideCue);
    if (!at) return;
    const p = this.cellToScreen(at.x, at.y);
    const B = Renderer.beamGeometry(p, now);
    c.save();
    c.globalCompositeOperation = 'lighter';
    const g = c.createLinearGradient(0, B.y0, 0, B.y1);
    g.addColorStop(0, `rgba(110,220,255,${B.a})`); g.addColorStop(0.6, `rgba(0,194,255,${B.a * 0.35})`); g.addColorStop(1, 'rgba(0,194,255,0)');
    c.fillStyle = g;
    c.beginPath();
    c.moveTo(B.x - B.w0, B.y0); c.lineTo(B.x - B.w1, B.y1); c.lineTo(B.x + B.w1, B.y1); c.lineTo(B.x + B.w0, B.y0);
    c.ellipse(B.x, B.y0, B.w0, B.w0 * 0.5, 0, 0, Math.PI);
    c.closePath(); c.fill();
    for (const sp of B.sparks) { c.globalAlpha = sp.a; c.drawImage(Renderer.dot('#bff4ff'), sp.x - 4, sp.y - 4, 8, 8); }
    c.restore();
  }

  // Vue tactique : un fond de nuit, les cases de sol en damier d'ardoise, les obstacles en pierre
  // sombre, l'eau et les trous à plat. Le décor n'est plus dessiné (drawScene).
  drawTactical(c) {
    const m = this.map;
    if (this.tactKey !== m) {
      this.tactKey = m;
      const P = { a: new Path2D(), b: new Path2D(), roc: new Path2D(), eau: new Path2D(), trou: new Path2D() };
      for (let y = 0; y < m.h; y++) for (let x = 0; x < m.w; x++) {
        const t = m.cells[y][x], p = this.cellToScreen(x, y);
        const k = t === Grid.FLOOR ? ((x + y) % 2 ? 'a' : 'b') : t === Grid.WATER ? 'eau' : t === Grid.HOLE ? 'trou' : 'roc';
        Renderer.addDiamond(P[k], p.x, p.y, 0.98);
      }
      this.tactPaths = P;
    }
    const P = this.tactPaths;
    c.save();
    // Le fond couvre toute la vue, zoom et déplacement compris (js/camera.js).
    const v = this.camera.visibleWorld();
    const g = c.createLinearGradient(0, v.y0, 0, v.y1);
    g.addColorStop(0, '#0b111b'); g.addColorStop(1, '#070a11');
    c.fillStyle = g; c.fillRect(v.x0, v.y0, v.x1 - v.x0, v.y1 - v.y0);
    c.fillStyle = '#3b4356'; c.fill(P.a);
    c.fillStyle = '#343b4d'; c.fill(P.b);
    c.fillStyle = '#121620'; c.fill(P.roc);
    c.lineWidth = 1.2; c.strokeStyle = 'rgba(201,166,107,0.35)'; c.stroke(P.roc);
    c.fillStyle = '#1d4766'; c.fill(P.eau);
    c.fillStyle = '#05070b'; c.fill(P.trou);
    c.restore();
  }

  // ----- La scène : décor et figures triés en profondeur -----

  drawScene(c, now, dt, sprites, inCombat) {
    const H = this.highlights;
    const busy = new Set();
    for (const s of sprites) if (s.kind !== 'node') busy.add(Grid.key(Math.round(s.rx), Math.round(s.ry)));
    if (inCombat) {
      for (const k of H.move) busy.add(k);
      for (const k of H.range) busy.add(k);
      for (const k of H.aoe) busy.add(k);
      for (const s of H.path) busy.add(Grid.key(s.x, s.y));
      if (H.hover) busy.add(Grid.key(H.hover.x, H.hover.y));
    }
    const items = [];
    // En vue tactique, le décor disparaît : le plateau à plat suffit à lire les obstacles.
    for (const d of inCombat && this.tactique ? [] : this.decor) {
      const target = d.cover.some(k => busy.has(k)) ? (inCombat ? 0.38 : 0.55) : 1;
      d.fade += (target - d.fade) * Math.min(1, dt * 9);
      items.push(d);
    }
    for (const s of sprites) { s.depth = s.rx + s.ry; items.push(s); }
    if (inCombat) {
      for (const [k, tmp] of this.combat.temp) {
        if (tmp.kind !== 'rock') continue;
        const [x, y] = k.split(',').map(Number);
        items.push({ temprock: true, x, y, depth: x + y - 0.01 });
      }
    }
    items.sort((a, b) => a.depth - b.depth || (a.isDecor ? -1 : 0) - (b.isDecor ? -1 : 0));
    for (const it of items) {
      if (it.isDecor) {
        c.globalAlpha = it.fade;
        c.drawImage(it.spr.cv, it.px - it.spr.ax, it.py - it.spr.ay, it.spr.w, it.spr.h);
        if (it.kind === 'relais') this.drawRelayCrystal(c, it, now);
        if (it.kind === 'porte') this.drawPortal(c, it, now);
        c.globalAlpha = 1;
      } else if (it.temprock) {
        this.drawRock(c, this.cellToScreen(it.x, it.y), this.palette, Renderer.noise(it.x, it.y), true);
      } else this.drawSprite(it, now, true);
    }
  }

  drawRelayCrystal(c, d, now) {
    const P = this.palette;
    const bob = this.reducedMotion ? 0 : Math.sin(now / 900) * 3;
    const x = d.px, y = d.py - 47 + bob;
    const spin = Math.sin(now / 1300);
    const w = 7 + 2 * Math.abs(spin);
    c.save();
    c.globalCompositeOperation = 'lighter';
    c.globalAlpha = 0.5 * d.fade;
    c.drawImage(Renderer.dot('#00c2ff'), x - 26, y - 26, 52, 52);
    // un mince rayon qui monte, comme le grand rayon de la planche
    const g = c.createLinearGradient(0, y - 140, 0, y);
    g.addColorStop(0, 'rgba(143,233,255,0)'); g.addColorStop(1, 'rgba(143,233,255,0.35)');
    c.fillStyle = g; c.fillRect(x - 1.5, y - 140, 3, 140);
    c.restore();
    c.globalAlpha = d.fade;
    const C = P.crystal;
    c.lineWidth = 2.2; c.strokeStyle = C[0];
    c.beginPath(); c.moveTo(x, y - 13); c.lineTo(x + w, y); c.lineTo(x, y + 12); c.lineTo(x - w, y); c.closePath(); c.stroke();
    c.fillStyle = C[4]; c.beginPath(); c.moveTo(x, y - 13); c.lineTo(x - w, y); c.lineTo(x, y + 12); c.closePath(); c.fill();
    c.fillStyle = C[2]; c.beginPath(); c.moveTo(x, y - 13); c.lineTo(x + w, y); c.lineTo(x, y + 12); c.closePath(); c.fill();
    c.fillStyle = C[5]; c.beginPath(); c.moveTo(x, y - 13); c.lineTo(x - w * (0.4 + 0.3 * spin), y - 1); c.lineTo(x, y + 2); c.closePath(); c.fill();
    c.strokeStyle = 'rgba(255,255,255,0.8)'; c.lineWidth = 0.8; c.beginPath(); c.moveTo(x, y - 13); c.lineTo(x, y + 12); c.stroke();
  }

  drawPortal(c, d, now) {
    if (this.reducedMotion) return;
    c.save();
    c.globalCompositeOperation = 'lighter';
    c.globalAlpha = d.fade * (0.45 + 0.2 * Math.sin(now / 400));
    c.translate(d.px, d.py - 24);
    c.rotate(now / 1600);
    c.strokeStyle = 'rgba(143,233,255,0.6)'; c.lineWidth = 1.4;
    for (let i = 0; i < 3; i++) { c.beginPath(); c.ellipse(0, 0, 5 + i * 3.5, 7 + i * 4.5, 0, i, i + 2.2); c.stroke(); }
    c.restore();
  }

  // ----- Lumières vivantes : flammes, halos -----

  drawLights(c, now) {
    if (!this.lights.length) return;
    const P = this.palette;
    c.save();
    c.globalCompositeOperation = 'lighter';
    for (let i = 0; i < this.lights.length; i++) {
      const L = this.lights[i];
      if (L.k === 'Z' || L.k === 'D') continue;
      const p = this.cellToScreen(L.x, L.y);
      const y = p.y - L.h;
      const fl = this.reducedMotion ? 0.9 : 0.82 + 0.1 * Math.sin(now / 110 + i * 1.7) + 0.08 * Math.sin(now / 47 + i * 3.1);
      c.globalAlpha = 0.5 * fl;
      c.drawImage(this.glow, p.x - 46, y - 46);
      c.globalAlpha = 0.85 * fl;
      c.drawImage(Renderer.dot(L.glow), p.x - 9, y - 9, 18, 18);
      if (L.k === 'B' || P.lamp === 'brasero') {
        // petites flammes qui dansent au-dessus du foyer
        for (let k = 0; k < 3; k++) {
          const ph = now / 160 + k * 2.1 + i;
          const fx = p.x + (k - 1) * 4 + Math.sin(ph) * 1.5, fh = 9 + 4 * Math.sin(ph * 1.3);
          c.globalAlpha = 0.85;
          c.fillStyle = k === 1 ? '#ffd36a' : P.lantern;
          c.beginPath(); c.moveTo(fx - 3, y + 2); c.quadraticCurveTo(fx - 2, y - fh * 0.5, fx + Math.sin(ph * 2) * 1.5, y - fh); c.quadraticCurveTo(fx + 2, y - fh * 0.5, fx + 3, y + 2); c.closePath(); c.fill();
        }
      }
    }
    c.restore();
  }

  // ----- Particules : lucioles, éclats de cristal, braises, poussière de lumière -----

  updateParticles(now, dt) {
    const P = this.palette, max = this.maxParticles;
    const rates = P.particles || {};
    const k = (this.quality === 'haute' ? 1 : 0.4) * (this.reducedMotion ? 0.5 : 1);
    for (const kind in rates) {
      this.spawnAcc[kind] = (this.spawnAcc[kind] || 0) + rates[kind] * dt * k;
      while (this.spawnAcc[kind] >= 1) {
        this.spawnAcc[kind] -= 1;
        if (this.particles.length < max) this.spawn(kind);
      }
    }
    const slow = this.reducedMotion ? 0.4 : 1;
    for (const p of this.particles) {
      p.age += dt;
      p.x += (p.vx + Math.sin(p.age * p.wob + p.ph) * p.sway) * dt * slow;
      p.y += p.vy * dt * slow;
      p.z += p.vz * dt * slow;
    }
    this.particles = this.particles.filter(p => p.age < p.life);
    for (const s of this.sparks) {
      s.age += dt;
      s.x += s.vx * dt; s.y += s.vy * dt; s.z += s.vz * dt; s.vz -= s.g * dt;
      if (s.z < 0) { s.z = 0; s.vz *= -0.3; s.vx *= 0.6; s.vy *= 0.6; }
    }
    this.sparks = this.sparks.filter(s => s.age < s.life);
  }

  spawn(kind) {
    const cells = this.floorCells;
    if (!cells || !cells.length) return;
    const P = this.palette;
    const r = Math.random;
    const cell = cells[Math.floor(r() * cells.length)];
    const base = this.vx(cell.x + r(), cell.y + r());
    const p = { kind, x: base.x, y: base.y, z: 0, vx: 0, vy: 0, vz: 0, age: 0, life: 3, size: 1.4, color: '#ffffff', wob: 1, sway: 0, ph: r() * 6.3, blink: 0 };
    if (kind === 'luciole') { Object.assign(p, { z: 6 + r() * 26, vx: (r() - 0.5) * 8, vy: (r() - 0.5) * 4, vz: (r() - 0.5) * 3, life: 4 + r() * 4, size: 1.5, color: r() < 0.6 ? '#e8ff9a' : '#ffe08a', wob: 1.3, sway: 10, blink: 1 }); }
    else if (kind === 'eclat') {
      const spots = this.crystalSpots;
      if (spots.length && r() < 0.7) { const s = spots[Math.floor(r() * spots.length)]; p.x = s.x + (r() - 0.5) * 16; p.y = s.y + 20; p.z = 20; }
      Object.assign(p, { z: p.z + r() * 16, vx: (r() - 0.5) * 3, vz: 5 + r() * 9, life: 2.4 + r() * 2, size: 1.2, color: '#8fe9ff', wob: 3, sway: 3, blink: 2 });
    } else if (kind === 'braise') {
      if (this.liquidCells.length && r() < 0.5) { const q = this.liquidCells[Math.floor(r() * this.liquidCells.length)]; const b = this.vx(q.x + r(), q.y + r()); p.x = b.x; p.y = b.y; }
      else if (this.lights.length && r() < 0.5) { const L = this.lights[Math.floor(r() * this.lights.length)]; const b = this.cellToScreen(L.x, L.y); p.x = b.x + (r() - 0.5) * 8; p.y = b.y; p.z = L.h; }
      Object.assign(p, { vx: (r() - 0.5) * 10, vz: 16 + r() * 22, life: 1.4 + r() * 1.8, size: 1.3, color: r() < 0.5 ? '#ff8a3a' : '#ffc46a', wob: 4, sway: 8 });
    } else if (kind === 'cendre') { Object.assign(p, { z: 30 + r() * 60, vx: 4 + r() * 6, vz: -3 - r() * 4, life: 5 + r() * 3, size: 1, color: '#b0a0a0', wob: 1, sway: 4 }); }
    else if (kind === 'poussiere') { Object.assign(p, { z: 10 + r() * 50, vx: 2 + r() * 3, vz: (r() - 0.5) * 2, life: 5 + r() * 4, size: 0.9, color: '#ffe8c0', wob: 0.8, sway: 3 }); }
    else if (kind === 'voile') { Object.assign(p, { z: 4 + r() * 30, vx: (r() - 0.5) * 4, vz: 3 + r() * 5, life: 3 + r() * 3, size: 1.3, color: r() < 0.5 ? '#c49aff' : '#8fe9ff', wob: 2, sway: 5, blink: 1 }); }
    this.particles.push(p);
  }

  // Une gerbe d'étincelles qui retombent, à la case donnée (coordonnées de case).
  burst(cx, cy, color, n) {
    const p = this.cellToScreen(cx, cy);
    this.burstAt(p.x, p.y, color, n, 1);
  }

  burstAt(x, y, color, n, power) {
    const cap = this.quality === 'haute' ? 90 : 30;
    for (let i = 0; i < n && this.sparks.length < cap; i++) {
      const a = Math.random() * Math.PI * 2, v = (30 + Math.random() * 60) * power;
      this.sparks.push({ x, y, z: 8 + Math.random() * 10, vx: Math.cos(a) * v, vy: Math.sin(a) * v * 0.5, vz: (60 + Math.random() * 90) * power, g: 240, age: 0, life: 0.45 + Math.random() * 0.4, color });
    }
  }

  drawParticles(c, now) {
    if (!this.particles.length && !this.sparks.length) return;
    c.save();
    c.globalCompositeOperation = 'lighter';
    for (const p of this.particles) {
      const fade = Math.min(1, p.age / 0.6, (p.life - p.age) / 0.8);
      const blink = p.blink === 1 ? 0.55 + 0.45 * Math.sin(now / 260 + p.ph * 3) : p.blink === 2 ? 0.5 + 0.5 * Math.sin(now / 120 + p.ph * 5) : 1;
      const a = Math.max(0, fade * blink);
      const y = p.y - p.z;
      const r = p.size * 4;
      c.globalAlpha = a * 0.8;
      c.drawImage(Renderer.dot(p.color), p.x - r, y - r, r * 2, r * 2);
      c.globalAlpha = a;
      c.fillStyle = '#ffffff';
      c.fillRect(p.x - p.size * 0.4, y - p.size * 0.4, p.size * 0.8, p.size * 0.8);
    }
    for (const s of this.sparks) {
      const t = s.age / s.life, a = 1 - t;
      const y = s.y - s.z;
      c.globalAlpha = a;
      c.strokeStyle = s.color; c.lineWidth = 1.6;
      c.beginPath(); c.moveTo(s.x, y); c.lineTo(s.x - s.vx * 0.03, y + s.vz * 0.03 - s.vy * 0.03); c.stroke();
      c.fillStyle = '#ffffff'; c.fillRect(s.x - 0.7, y - 0.7, 1.4, 1.4);
      this.bglow(s.x, y, 6, s.color, a * 0.8);
    }
    c.restore();
  }

  // Projectiles des sorts : un orbe lumineux en arc, avec sa traînée.
  drawShots(c, now) {
    if (!this.shots.length) return;
    this.shots = this.shots.filter(s => now - s.born < s.dur);
    c.save();
    c.globalCompositeOperation = 'lighter';
    for (const s of this.shots) {
      const t = Math.min(1, (now - s.born) / s.dur);
      for (let k = 4; k >= 0; k--) {
        const tt = Math.max(0, t - k * 0.06);
        const x = s.fx + (s.tx - s.fx) * tt, y = s.fy + (s.ty - s.fy) * tt;
        const p = this.cellToScreen(x, y);
        const lift = 22 + Math.sin(tt * Math.PI) * 26;
        const r = (k ? 12 - k * 1.5 : 18);
        c.globalAlpha = k ? 0.6 - k * 0.1 : 1;
        c.drawImage(Renderer.dot(s.color), p.x - r, p.y - lift - r, r * 2, r * 2);
        if (!k) { c.fillStyle = '#ffffff'; c.beginPath(); c.arc(p.x, p.y - lift, 3.2, 0, Math.PI * 2); c.fill(); this.bglow(p.x, p.y - lift, 26, s.color, 1); }
      }
    }
    c.restore();
  }

  // ----- Figures -----

  combatSprites(now) {
    const cb = this.combat;
    return cb.entities.filter(e => e.alive && cb.canSee(cb.player, e)).map(e => {
      const moving = Math.abs(e.rx - Math.round(e.rx)) + Math.abs(e.ry - Math.round(e.ry)) > 0.02;
      const hop = moving ? Math.abs(Math.sin((e.rx + e.ry) * Math.PI)) * 5 : 0;
      return {
        kind: 'entity', rx: e.rx, ry: e.ry, shape: e.shape, color: e.color, glyph: e.glyph, name: e.name,
        scale: e.boss ? 1.35 : (e.isSummon && !e.ally ? 0.8 : 1), alpha: (e.alpha == null ? 1 : e.alpha) * (e.hasState('invisible') ? 0.45 : 1), look: e.def.look,
        team: e.team, flash: now < e.flashUntil, current: cb.actor === e, immune: e.immuneElement,
        hp: e.hp / e.hpMax, shield: e.shield / e.hpMax, bob: hop, motif: e.team === 'monster' ? Renderer.motifOf(e.def.id) : null,
        facing: e.shape === 'player' ? e.facing || Renderer.faceFoe(cb, e) : 1, gender: e.def.gender,
        stunned: e.hasState('stunned'), invuln: !!e.def.invulnerable || e.hasState('invulnerable'), armor: e.modifier('armor') > 0,
        lantern: e.effects.some(f => f.type === 'state' && f.farDodge), boss: e.boss, phase: (e.id || 0) * 1.7,
      };
    });
  }

  worldSprites(now) {
    const w = this.world;
    const out = [];
    const ch = w.ch, cls = DATA.classes[ch.classId];
    const p = w.player;
    out.push({ kind: 'entity', rx: p.rx, ry: p.ry, shape: 'player', color: cls.color, glyph: cls.glyph, name: ch.name, scale: 1, alpha: 1, team: 'player', facing: p.facing, look: ch.look, gender: ch.gender, bob: p.moving ? Math.abs(Math.sin(now / 90)) * 3.5 : 0, label: null, phase: 0, insigne: Factions.insigne(ch) });
    for (const g of w.groups) {
      const def = DATA.monsters[g.monsters[0].id];
      out.push({ kind: 'entity', rx: g.rx, ry: g.ry, shape: def.shape, color: def.color, glyph: null, name: def.name, scale: def.boss ? 1.3 : 0.95, alpha: 1, team: 'monster', facing: 1, bob: Math.abs(Math.sin(now / 500 + g.idx)) * 1.5, badge: g.monsters.length > 1 ? `×${g.monsters.length}` : null, label: `${def.name} niv. ${g.level}`, motif: Renderer.motifOf(g.monsters[0].id), phase: g.idx || 0 });
    }
    if (!this.marksAt || now - this.marksAt > 500 || this.marksMap !== w.mapId) {
      this.marksAt = now; this.marksMap = w.mapId; this.marks = {};
      for (const n of w.npcs) this.marks[n.id] = Quests.available(ch, n.id).length ? '!' : (Quests.readyFor(ch, n.id).length ? '?' : null);
    }
    for (const n of w.npcs) out.push({ kind: 'npc', rx: n.x, ry: n.y, look: n.def.look || 'marcheur', name: n.def.name, quest: this.marks[n.id], bob: 0, phase: n.x * 1.3 + n.y });
    for (const n of w.nodes) out.push({ kind: 'node', rx: n.x, ry: n.y, resource: n.resource, ready: n.ready });
    return out;
  }

  // Une figure au sol : ombre, anneau de camp, reflet, corps. Avec `bodyOnly`, sans les étiquettes,
  // qui se dessinent ensuite par-dessus la lumière (drawOverlays).
  drawSprite(s, now, bodyOnly) {
    const c = this.ctx;
    const p = this.cellToScreen(s.rx, s.ry);
    if (s.kind === 'node') return this.drawNode(c, p, s);
    if (s.kind === 'npc') { this.drawNpc(c, p, s, now); if (!bodyOnly) this.drawOverlay(c, s, now); return; }
    const k = s.scale;
    c.globalAlpha = s.alpha;
    this.softShadow(c, p.x + 2, p.y + 1, 19 * k, 8.5 * k, 0.85);
    this.drawRings(c, p, s, now);
    if (this.quality === 'haute' && this.nearLiquid(s.rx, s.ry)) this.drawReflection(c, p, s);
    const breath = this.reducedMotion ? 1 : 1 + 0.022 * Math.sin(now / 640 + (s.phase || 0));
    c.save();
    c.translate(p.x, p.y - (s.bob || 0)); c.scale(k * Renderer.flipOf(s), k * breath); c.translate(-p.x, -p.y);
    this.drawBody(c, p, s);
    if (s.motif) this.drawMotif(c, p, s);
    c.restore();
    if (s.insigne) this.drawInsigne(c, p, s, now);
    c.globalAlpha = 1;
    if (!bodyOnly) this.drawOverlay(c, s, now);
  }

  // L'insigne de faction, posé par-dessus la figure du Veilleur (le peintre du héros n'en sait
  // rien) : le Fil, un fil d'or cousu en auréole ; la Déchirure, une lueur violette qui sort de la
  // cape par une déchirure. Plus vif à chaque rang (docs/MONDE.md). Avec `full`, pleine intensité
  // et sans mouvement : le rendu WebGL en cuit une texture.
  drawInsigne(c, p, s, now, full) {
    const ins = s.insigne;
    const a = full ? 1 : Math.min(1, 0.3 + 0.06 * ins.rank);
    const k = s.scale || 1, top = p.y - 42;
    const still = full || this.reducedMotion;
    c.save();
    c.translate(p.x, p.y - (s.bob || 0)); c.scale(k * Renderer.sideOf(s), k); c.translate(-p.x, -p.y);
    c.globalCompositeOperation = 'lighter';
    if (ins.id === 'fil') {
      const hy = top - 9;
      c.globalAlpha = a * 0.45;
      c.drawImage(Renderer.dot('#ffd98a'), p.x - 17, hy - 9, 34, 18);
      c.globalAlpha = a;
      c.lineWidth = 1.7; c.strokeStyle = '#ffe3a3';
      c.setLineDash([3, 2.2]); c.lineDashOffset = still ? 0 : -now / 160;
      c.beginPath(); c.ellipse(p.x, hy, 10.5, 3.4, 0, 0, Math.PI * 2); c.stroke();
      c.setLineDash([]);
      if (!full) this.bglow(p.x, hy - (s.bob || 0), 12, '#ffd98a', a * 0.35);
    } else {
      const cx = p.x - 10, cy = p.y - 19;
      const flick = still ? 1 : 0.82 + 0.18 * Math.sin(now / 170 + 1.3) * Math.sin(now / 410);
      c.globalAlpha = a * 0.75 * flick;
      c.drawImage(Renderer.dot('#a66cff'), cx - 15, cy - 19, 30, 38);
      c.globalAlpha = a * flick;
      // la déchirure : un trait violet, et son cœur pâle
      const fente = () => { c.beginPath(); c.moveTo(cx + 2.5, cy - 11); c.lineTo(cx - 1.5, cy - 5); c.lineTo(cx + 1.5, cy - 0.5); c.lineTo(cx - 2, cy + 5); c.lineTo(cx + 0.5, cy + 11); c.stroke(); };
      c.lineWidth = 3.2; c.strokeStyle = 'rgba(150,90,255,0.9)'; fente();
      c.lineWidth = 1.1; c.strokeStyle = '#efe4ff'; fente();
      // deux lambeaux de lumière qui s'échappent
      c.lineWidth = 1; c.strokeStyle = '#b98cff';
      const drift = still ? 0 : (now / 900) % 1;
      for (const [dx, dy] of [[-5, -4], [-6, 4]]) {
        const y = cy + dy - drift * 3;
        c.beginPath(); c.moveTo(cx + dx, y); c.lineTo(cx + dx - 2.5, y - 1.5); c.lineTo(cx + dx - 4, y + 0.5); c.stroke();
      }
      if (!full) this.bglow(p.x - 10 * Renderer.sideOf(s), cy - (s.bob || 0), 12, '#a66cff', a * 0.35);
    }
    c.restore();
  }

  nearLiquid(rx, ry) {
    if (!this.liquid || this.liquid.kind !== 'eau') return false;
    const x = Math.round(rx), y = Math.round(ry);
    return this.matAt(x + 1, y) === 'eau' || this.matAt(x, y + 1) === 'eau' || this.matAt(x + 1, y + 1) === 'eau';
  }

  // Le reflet inversé d'une figure dans l'eau voisine.
  drawReflection(c, p, s) {
    c.save();
    c.clip(this.liquid.fill);
    c.globalAlpha = s.alpha * 0.3;
    c.translate(p.x, p.y + 6); c.scale(s.scale * Renderer.flipOf(s), -s.scale * 0.8); c.translate(-p.x, -p.y);
    this.drawBody(c, p, s);
    c.restore();
  }

  // Anneau de camp (bleu cristal pour les alliés, braise pour les ennemis), lisible sur tout sol.
  drawRings(c, p, s, now) {
    const k = s.scale;
    const col = s.team === 'player' ? '74,196,255' : '255,86,70';
    const rx = 21 * k, ry = 10.5 * k;
    c.beginPath(); c.ellipse(p.x, p.y, rx, ry, 0, 0, Math.PI * 2);
    c.fillStyle = `rgba(${col},0.13)`; c.fill();
    c.lineWidth = 4.6; c.strokeStyle = 'rgba(3,5,12,0.6)'; c.stroke();
    c.lineWidth = 2.2; c.strokeStyle = `rgba(${col},0.98)`; c.stroke();
    if (s.immune) {
      c.setLineDash([5, 4]);
      c.beginPath(); c.ellipse(p.x, p.y, rx + 4, ry + 2, 0, 0, Math.PI * 2);
      c.lineWidth = 2.2; c.strokeStyle = DATA.elements[s.immune].color; c.stroke();
      c.setLineDash([]);
    }
    if (s.current) {
      const pulse = 0.5 + 0.5 * Math.sin(now / 180);
      const R1 = (26 + pulse * 3) * k, R2 = (13 + pulse * 1.5) * k;
      c.beginPath(); c.ellipse(p.x, p.y, R1, R2, 0, 0, Math.PI * 2);
      c.lineWidth = 4; c.strokeStyle = 'rgba(3,5,12,0.45)'; c.stroke();
      c.lineWidth = 2; c.strokeStyle = `rgba(255,220,140,${0.55 + 0.45 * pulse})`; c.stroke();
      const rot = now / 900;
      c.fillStyle = '#ffe3a1';
      for (let i = 0; i < 4; i++) {
        const a = rot + i * Math.PI / 2;
        const x = p.x + Math.cos(a) * R1, y = p.y + Math.sin(a) * R2;
        c.beginPath(); c.moveTo(x, y - 3); c.lineTo(x + 3, y); c.lineTo(x, y + 3); c.lineTo(x - 3, y); c.closePath(); c.fill();
      }
    }
  }

  // Les états qui se voient : sonné (étoiles), invulnérable (bulle), armure (écu), lanterne volée.
  drawStates(c, p, s, now) {
    const k = s.scale || 1;
    const top = p.y - 42 * k;
    const bar = p.y - 42 * k - 13;
    if (s.invuln) {
      const g = c.createRadialGradient(p.x - 6 * k, p.y - 30 * k, 2, p.x, p.y - 20 * k, 30 * k);
      g.addColorStop(0, 'rgba(200,240,255,0.28)'); g.addColorStop(0.75, 'rgba(120,200,255,0.12)'); g.addColorStop(1, 'rgba(120,200,255,0.3)');
      c.fillStyle = g; c.beginPath(); c.ellipse(p.x, p.y - 20 * k, 24 * k, 30 * k, 0, 0, Math.PI * 2); c.fill();
      c.lineWidth = 3.5; c.strokeStyle = 'rgba(3,5,12,0.35)'; c.stroke();
      c.lineWidth = 2; c.strokeStyle = 'rgba(170,228,255,0.95)'; c.stroke();
      c.strokeStyle = 'rgba(255,255,255,0.8)'; c.lineWidth = 1.5;
      c.beginPath(); c.ellipse(p.x, p.y - 20 * k, 19 * k, 25 * k, 0, Math.PI * 1.15, Math.PI * 1.4); c.stroke();
      this.bglow(p.x, p.y - 20 * k, 28 * k, '#8fe9ff', 0.4);
    }
    if (s.stunned) this.uiAt(c, p.x, top, () => {
      for (let i = 0; i < 3; i++) {
        const a = now / 300 + i * 2.094;
        const sx = p.x + Math.cos(a) * 16, sy = bar - 13 + Math.sin(a) * 3.5;
        c.beginPath();
        for (let j = 0; j < 10; j++) { const r = j % 2 ? 2.8 : 6.8; const b = Math.PI / 5 * j - Math.PI / 2; c.lineTo(sx + Math.cos(b) * r, sy + Math.sin(b) * r); }
        c.closePath();
        c.lineWidth = 2.6; c.strokeStyle = '#2a1a04'; c.stroke();
        c.fillStyle = '#ffd166'; c.fill();
        this.bglow(sx, sy, 9, '#ffd166', 0.6);
      }
    });
    if (s.armor) this.uiAt(c, p.x, top, () => {
      const x = p.x + (s.boss ? 25 : 20) + 11, y = bar + 3;
      const sh = () => { c.beginPath(); c.moveTo(x - 7.5, y - 8); c.lineTo(x + 7.5, y - 8); c.lineTo(x + 7.5, y + 1); c.quadraticCurveTo(x, y + 11, x - 7.5, y + 1); c.closePath(); };
      sh(); c.lineWidth = 4; c.strokeStyle = '#0b0f18'; c.stroke();
      const g = c.createLinearGradient(x - 7, y - 7, x + 7, y + 8);
      g.addColorStop(0, '#d8dde8'); g.addColorStop(1, '#6a7286');
      sh(); c.fillStyle = g; c.fill();
      c.lineWidth = 1.2; c.strokeStyle = '#e2c690'; c.stroke();
      c.strokeStyle = 'rgba(40,46,60,0.8)'; c.lineWidth = 1.2; c.beginPath(); c.moveTo(x, y - 6); c.lineTo(x, y + 6); c.stroke();
    });
    if (s.lantern) {
      const x = p.x - 18 * k, y = p.y - 26 * k;
      c.save(); c.globalCompositeOperation = 'lighter'; c.globalAlpha = 0.8;
      c.drawImage(Renderer.dot('#ffe7a3'), x - 16, y - 16, 32, 32); c.restore();
      c.fillStyle = '#1e2540'; c.fillRect(x - 4.5, y - 6.5, 9, 12);
      c.fillStyle = '#f2b134'; c.fillRect(x - 2.5, y - 4, 5, 7);
      this.bglow(x, y, 12, '#ffe7a3', 0.6);
    }
  }

  // Les étiquettes par-dessus la lumière : barres de vie, états, noms, nombre de monstres, quêtes.
  drawOverlays(c, now, sprites) {
    for (const s of sprites) this.drawOverlay(c, s, now);
  }

  drawOverlay(c, s, now) {
    if (s.kind === 'node') return;
    const p = this.cellToScreen(s.rx, s.ry);
    if (s.kind === 'npc') {
      const top = p.y - 42;
      if (s.quest) this.uiAt(c, p.x, top, () => {
        const y = top - 16 + Math.sin(now / 300) * 2;
        c.save(); c.globalCompositeOperation = 'lighter'; c.globalAlpha = 0.55;
        c.drawImage(Renderer.dot(s.quest === '!' ? '#ffd166' : '#6fdc8c'), p.x - 15, y - 17, 30, 30); c.restore();
        c.font = '900 20px Inter, "Segoe UI", system-ui, sans-serif'; c.textAlign = 'center';
        c.lineWidth = 4; c.strokeStyle = '#0b0f18'; c.strokeText(s.quest, p.x, y);
        c.fillStyle = s.quest === '!' ? '#ffd166' : '#6fdc8c'; c.fillText(s.quest, p.x, y);
      });
      this.uiAt(c, p.x, p.y, () => this.label(c, s.name, p.x, p.y + 18, false));
      return;
    }
    const k = s.scale;
    c.globalAlpha = Math.max(0.7, s.alpha);
    this.drawStates(c, p, s, now);
    if (s.hp != null) this.uiAt(c, p.x, p.y - 42 * k, () => {
      const bw = s.boss ? 50 : 40, bh = 6, bx = p.x - bw / 2, by = p.y - 42 * k - 13;
      Util.roundRect(c, bx - 1.5, by - 1.5, bw + 3, bh + 3, 3.5); c.fillStyle = '#0b0f18'; c.fill();
      Util.roundRect(c, bx, by, bw, bh, 2.5); c.fillStyle = '#1a2130'; c.fill();
      const w = bw * Math.max(0, Math.min(1, s.hp));
      if (w > 0.5) {
        const g = c.createLinearGradient(0, by, 0, by + bh);
        if (s.team === 'player') { g.addColorStop(0, '#9af0a8'); g.addColorStop(0.5, '#4cc46a'); g.addColorStop(1, '#2a8a48'); }
        else { g.addColorStop(0, '#ffa58a'); g.addColorStop(0.5, '#f0583c'); g.addColorStop(1, '#b02e1e'); }
        Util.roundRect(c, bx, by, Math.max(3, w), bh, 2.5); c.fillStyle = g; c.fill();
        c.fillStyle = 'rgba(255,255,255,0.35)'; c.fillRect(bx + 1.5, by + 1, Math.max(0, w - 3), 1.2);
      }
      if (s.shield > 0) {
        Util.roundRect(c, bx, by - 4.5, bw * Math.min(1, s.shield), 3, 1.5); c.fillStyle = '#9fe4ff'; c.fill();
        c.lineWidth = 1; c.strokeStyle = '#0b0f18'; c.stroke();
      }
      if (s.current) {
        const y = by - 9 - Math.abs(Math.sin(now / 260)) * 3;
        c.beginPath(); c.moveTo(p.x - 6, y - 6); c.lineTo(p.x + 6, y - 6); c.lineTo(p.x, y); c.closePath();
        c.lineWidth = 3; c.strokeStyle = '#0b0f18'; c.stroke(); c.fillStyle = '#ffd27a'; c.fill();
      }
    });
    if (s.badge) this.uiAt(c, p.x + 18, p.y - 40, () => {
      const x = p.x + 18, y = p.y - 40;
      c.beginPath(); c.arc(x, y, 9.5, 0, Math.PI * 2); c.fillStyle = '#0f141d'; c.fill();
      c.lineWidth = 1.6; c.strokeStyle = '#c9a66b'; c.stroke();
      c.fillStyle = '#f2e2c9'; c.font = '700 10.5px Inter, "Segoe UI", system-ui, sans-serif'; c.textAlign = 'center'; c.fillText(s.badge, x, y + 3.8);
    });
    if (s.label) this.uiAt(c, p.x, p.y, () => this.label(c, s.label, p.x, p.y + 18, s.team === 'monster'));
    c.globalAlpha = 1;
  }

  // Une étiquette sur une plaque sombre à filet d'or : lisible sur tous les sols.
  label(c, text, x, y, enemy) {
    c.font = '600 11px Inter, "Segoe UI", system-ui, sans-serif'; c.textAlign = 'center';
    const w = c.measureText(text).width + 12;
    Util.roundRect(c, x - w / 2, y - 11, w, 15, 4);
    c.fillStyle = 'rgba(9,13,22,0.72)'; c.fill();
    c.lineWidth = 1; c.strokeStyle = enemy ? 'rgba(240,122,92,0.55)' : 'rgba(201,166,107,0.5)'; c.stroke();
    c.fillStyle = '#f2e2c9'; c.fillText(text, x, y);
  }

  // Le motif qui distingue une famille de monstres, d'après son identifiant.
  static motifOf(id) {
    const M = { pilou: 'bird', piouk: 'bird', sivr: 'bird', harpide: 'bird', grouk: 'horn', groukin: 'horn', grand_grouk: 'horn', vulk: 'horn', korvath: 'horn',
      tissefil: 'legs', tisseuse: 'legs', vrill: 'legs', veilloche: 'lamp', ferrel: 'lamp', tholou: 'lamp', brimbe: 'pebble', molh: 'pebble', thane: 'pebble',
      kaldrik: 'ember', cendrou: 'ember', braise: 'ember', zhaal: 'ember', fumerolle: 'smoke', oubli: 'smoke', pioche_vive: 'pick', tourelle: 'pick', dorm: 'hammer',
      marnel: 'shell', brisant: 'wave', mere_des_brisants: 'wave', noye: 'drip', thelk: 'drip', glek: 'drip', mache_voile: 'teeth', glouton: 'teeth', craneux: 'bones', porte_fente: 'crack', fendu: 'crack', oreth: 'star' };
    if (M[id]) return M[id];
    for (const k in M) if (id.startsWith(k)) return M[k];
    return null;
  }

  drawMotif(c, p, s) {
    const top = p.y - 42;
    const cy = s.shape === 'square' ? top + 22 : p.y - 22;
    const ink = Renderer.mix(s.color, '#0a0d18', 0.74);
    c.lineWidth = 2; c.strokeStyle = ink;
    switch (s.motif) {
      case 'bird':
        c.fillStyle = '#ffb14a'; c.beginPath(); c.moveTo(p.x + 4, cy + 4); c.lineTo(p.x + 14, cy + 7); c.lineTo(p.x + 4, cy + 10); c.closePath(); c.stroke(); c.fill();
        c.fillStyle = Renderer.mix(s.color, '#000000', 0.25); c.beginPath(); c.ellipse(p.x - 12, cy + 2, 7, 4, -0.5, 0, Math.PI * 2); c.stroke(); c.fill();
        c.fillStyle = 'rgba(255,255,255,0.3)'; c.beginPath(); c.ellipse(p.x - 13, cy + 0.5, 4, 1.6, -0.5, 0, Math.PI * 2); c.fill();
        break;
      case 'horn': {
        const g = c.createLinearGradient(p.x - 18, cy - 22, p.x - 6, cy - 10);
        g.addColorStop(0, '#fff3cf'); g.addColorStop(1, '#b89a5e');
        c.fillStyle = g; c.beginPath(); c.moveTo(p.x - 10, cy - 10); c.lineTo(p.x - 18, cy - 22); c.lineTo(p.x - 6, cy - 14); c.closePath(); c.stroke(); c.fill();
        c.beginPath(); c.moveTo(p.x + 10, cy - 10); c.lineTo(p.x + 18, cy - 22); c.lineTo(p.x + 6, cy - 14); c.closePath(); c.stroke(); c.fill();
        break;
      }
      case 'legs':
        for (const w of [4.2, 2]) {
          c.strokeStyle = w > 3 ? ink : Renderer.mix(s.color, '#000000', 0.25); c.lineWidth = w;
          for (const dx of [-16, -8, 8, 16]) { c.beginPath(); c.moveTo(p.x + dx * 0.6, cy + 6); c.lineTo(p.x + dx, cy + 2); c.lineTo(p.x + dx * 1.2, p.y - 2); c.stroke(); }
        }
        break;
      case 'lamp': {
        const g = c.createRadialGradient(p.x, cy, 2, p.x, cy, 22);
        g.addColorStop(0, 'rgba(255,230,160,0.7)'); g.addColorStop(1, 'rgba(255,230,160,0)');
        c.fillStyle = g; c.beginPath(); c.arc(p.x, cy, 22, 0, Math.PI * 2); c.fill();
        break;
      }
      case 'pebble':
        c.strokeStyle = 'rgba(0,0,0,0.45)'; c.lineWidth = 1.6;
        c.beginPath(); c.moveTo(p.x - 10, cy - 6); c.lineTo(p.x - 3, cy); c.lineTo(p.x - 6, cy + 8); c.moveTo(p.x + 5, cy - 9); c.lineTo(p.x + 9, cy - 2); c.stroke();
        break;
      case 'ember':
        c.fillStyle = '#ff7a2b'; c.beginPath(); c.arc(p.x - 5, cy, 2.5, 0, Math.PI * 2); c.arc(p.x + 5, cy, 2.5, 0, Math.PI * 2); c.fill();
        c.fillStyle = 'rgba(255,190,90,0.8)'; for (const [dx, dy] of [[-12, -14], [10, -18], [0, -22]]) { c.beginPath(); c.arc(p.x + dx, cy + dy, 2, 0, Math.PI * 2); c.fill(); }
        break;
      case 'smoke':
        c.fillStyle = 'rgba(220,220,235,0.5)'; for (const [dx, dy, r] of [[-8, -20, 6], [2, -28, 8], [12, -20, 5]]) { c.beginPath(); c.arc(p.x + dx, cy + dy, r, 0, Math.PI * 2); c.fill(); }
        break;
      case 'pick':
        c.strokeStyle = ink; c.lineWidth = 5; c.beginPath(); c.moveTo(p.x + 12, cy + 10); c.lineTo(p.x + 22, cy - 16); c.stroke();
        c.beginPath(); c.moveTo(p.x + 12, cy - 18); c.quadraticCurveTo(p.x + 22, cy - 24, p.x + 32, cy - 14); c.stroke();
        c.strokeStyle = '#7a5a3e'; c.lineWidth = 3; c.beginPath(); c.moveTo(p.x + 12, cy + 10); c.lineTo(p.x + 22, cy - 16); c.stroke();
        c.strokeStyle = '#d0d6e0'; c.lineWidth = 3; c.beginPath(); c.moveTo(p.x + 12, cy - 18); c.quadraticCurveTo(p.x + 22, cy - 24, p.x + 32, cy - 14); c.stroke();
        break;
      case 'hammer':
        c.strokeStyle = ink; c.lineWidth = 5; c.beginPath(); c.moveTo(p.x + 22, cy - 14); c.lineTo(p.x + 18, cy + 12); c.stroke();
        c.strokeStyle = '#7a5a3e'; c.lineWidth = 3; c.stroke();
        c.fillStyle = '#5a606e'; c.fillRect(p.x + 14, cy - 24, 16, 10); c.lineWidth = 1.6; c.strokeStyle = ink; c.strokeRect(p.x + 14, cy - 24, 16, 10);
        c.fillStyle = 'rgba(255,255,255,0.3)'; c.fillRect(p.x + 15, cy - 23, 14, 2);
        break;
      case 'shell':
        c.strokeStyle = 'rgba(0,0,0,0.45)'; c.lineWidth = 1.6; for (let i = 1; i <= 3; i++) { c.beginPath(); c.arc(p.x, cy + 6, i * 5, Math.PI, Math.PI * 2); c.stroke(); }
        break;
      case 'wave':
        c.strokeStyle = 'rgba(255,255,255,0.7)'; c.lineWidth = 2; c.beginPath(); c.moveTo(p.x - 12, cy + 2); c.quadraticCurveTo(p.x - 6, cy - 6, p.x, cy + 2); c.quadraticCurveTo(p.x + 6, cy + 10, p.x + 12, cy + 2); c.stroke();
        break;
      case 'drip':
        c.fillStyle = Renderer.mix(s.color, '#000000', 0.3); for (const [dx, dy] of [[-8, 12], [6, 14], [0, 18]]) { c.beginPath(); c.ellipse(p.x + dx, p.y - 6 + dy * 0.3, 3, 5, 0, 0, Math.PI * 2); c.fill(); }
        break;
      case 'teeth':
        c.fillStyle = '#ffffff'; c.beginPath(); for (let i = -3; i <= 3; i++) { c.moveTo(p.x + i * 5 - 2, cy + 6); c.lineTo(p.x + i * 5, cy + 12); c.lineTo(p.x + i * 5 + 2, cy + 6); } c.fill();
        c.lineWidth = 1; c.stroke();
        break;
      case 'bones':
        c.strokeStyle = 'rgba(255,255,255,0.75)'; c.lineWidth = 2; for (let i = 0; i < 3; i++) { c.beginPath(); c.moveTo(p.x - 9, cy + i * 5); c.lineTo(p.x + 9, cy + i * 5); c.stroke(); }
        break;
      case 'crack':
        c.strokeStyle = '#2a0e40'; c.lineWidth = 4; c.beginPath(); c.moveTo(p.x - 2, cy - 16); c.lineTo(p.x + 3, cy - 6); c.lineTo(p.x - 3, cy + 2); c.lineTo(p.x + 2, cy + 12); c.stroke();
        c.strokeStyle = '#d08cff'; c.lineWidth = 2; c.stroke();
        break;
      case 'star':
        c.fillStyle = '#ffffff'; c.beginPath(); for (let i = 0; i < 10; i++) { const r = i % 2 ? 3 : 8; const a = Math.PI / 5 * i - Math.PI / 2; c.lineTo(p.x + Math.cos(a) * r, cy - 24 + Math.sin(a) * r); } c.closePath(); c.stroke(); c.fill();
        break;
    }
  }

  // Le corps d'une figure, en volume : contour d'encre, liseré de lumière (cyan pour les alliés,
  // or pour les ennemis), dégradé du clair vers l'ombre, terminateur fondu, reflet.
  drawBody(c, p, s) {
    const color = s.flash ? '#ffffff' : s.color;
    const top = p.y - 42;
    const ink = Renderer.mix(s.color, '#0a0d18', 0.74);
    const rim = s.team === 'player' ? '#9cecff' : '#ffd796';
    let path, box, eyesAt = null;
    switch (s.shape) {
      case 'player':
        return this.drawHero(c, p, s, color, ink, rim, top);
      case 'pnj':
        // Un PNJ qui combat aux côtés du joueur (le guide du premier combat) garde son allure.
        return this.drawNpc(c, p, { look: s.look || 'garde', phase: s.phase || 0 }, 0);
      case 'triangle':
        path = Renderer.roundPoly([[p.x, top], [p.x + 16, p.y - 4], [p.x - 16, p.y - 4]], 4.5);
        box = [p.x - 16, top, p.x + 16, p.y - 4]; eyesAt = [p.x, p.y - 18, 5];
        break;
      case 'square':
        path = Renderer.roundPoly([[p.x - 15, top + 6], [p.x + 15, top + 6], [p.x + 15, top + 38], [p.x - 15, top + 38]], 7);
        box = [p.x - 15, top + 6, p.x + 15, top + 38]; eyesAt = [p.x, top + 18, 7];
        break;
      case 'diamond':
        path = Renderer.roundPoly([[p.x, top], [p.x + 13, p.y - 22], [p.x, p.y - 4], [p.x - 13, p.y - 22]], 3);
        box = [p.x - 13, top, p.x + 13, p.y - 4]; eyesAt = [p.x, p.y - 24, 4];
        break;
      case 'hex': {
        const pts = [];
        for (let i = 0; i < 6; i++) { const a = Math.PI / 3 * i - Math.PI / 6; pts.push([p.x + 15 * Math.cos(a), p.y - 22 + 17 * Math.sin(a)]); }
        path = Renderer.roundPoly(pts, 3.5);
        box = [p.x - 15, p.y - 39, p.x + 15, p.y - 5]; eyesAt = [p.x, p.y - 24, 6];
        break;
      }
      default:
        path = new Path2D(); path.ellipse(p.x, p.y - 22, 15.5, 15, 0, 0, Math.PI * 2);
        box = [p.x - 15.5, p.y - 37, p.x + 15.5, p.y - 7]; eyesAt = [p.x, p.y - 24, 6];
    }
    this.shadeBody(c, path, box, color, ink, rim);
    if (s.shape === 'diamond' || s.shape === 'hex') {
      // facettes : la moitié droite dans l'ombre, comme une pierre taillée
      c.save(); c.clip(path);
      c.fillStyle = 'rgba(10,14,30,0.18)'; c.fillRect(p.x, box[1], box[2] - p.x, box[3] - box[1]);
      c.strokeStyle = 'rgba(255,255,255,0.18)'; c.lineWidth = 1; c.beginPath(); c.moveTo(p.x, box[1]); c.lineTo(p.x, box[3]); c.stroke();
      c.restore();
    }
    if (eyesAt) this.eyes(c, eyesAt[0], eyesAt[1], eyesAt[2]);
  }

  // `T` règle l'épaisseur du contour (1 par défaut ; plus fin quand la figure est peinte en grand).
  shadeBody(c, path, box, color, ink, rim, T) {
    const [x0, y0, x1, y1] = box, w = x1 - x0, h = y1 - y0;
    const lit = Renderer.mix(color, '#ffffff', 0.42), dark = Renderer.mix(color, '#141a33', 0.55);
    c.lineJoin = 'round';
    c.lineWidth = 5 * (T || 1); c.strokeStyle = ink; c.stroke(path);
    c.save();
    c.clip(path);
    c.fillStyle = rim; c.fill(path);
    c.translate(1.7, 1.5);
    const g = c.createLinearGradient(x0, y0, x0 + w * 0.8, y1);
    g.addColorStop(0, lit); g.addColorStop(0.42, color); g.addColorStop(1, dark);
    c.fillStyle = g; c.fill(path);
    c.translate(-1.7, -1.5);
    // terminateur fondu et occlusion au pied
    const r = Math.max(w, h);
    const g2 = c.createRadialGradient(x0 + w * 0.32, y0 + h * 0.3, r * 0.2, x0 + w * 0.32, y0 + h * 0.3, r * 1.02);
    g2.addColorStop(0, 'rgba(8,10,24,0)'); g2.addColorStop(0.6, 'rgba(8,10,24,0.06)'); g2.addColorStop(1, 'rgba(8,10,24,0.42)');
    c.fillStyle = g2; c.fillRect(x0 - 4, y0 - 4, w + 8, h + 8);
    c.fillStyle = 'rgba(255,255,255,0.32)';
    c.beginPath(); c.ellipse(x0 + w * 0.32, y0 + h * 0.24, Math.max(1, w * 0.13), Math.max(1, h * 0.075), -0.6, 0, Math.PI * 2); c.fill();
    c.restore();
  }

  // Le Veilleur : bottes, cape à filet d'or, bras, torse en volume, ceinture, tête et coiffure,
  // glyphe de classe, et la lanterne de classe (une gemme qui luit à la main).
  // s.look = { tete: 0 à 7, couleurs: [peau, cheveux, tenue, tenue2, cape, lanterne] } (à défaut,
  // l'apparence de la classe : Util.defaultLook), s.gender 'f' ou 'm' (épaules, taille, cils),
  // s.facing l'une des quatre diagonales : deux vues de trois quarts (face, dos), retournées pour
  // les deux autres (docs/DIRECTION-ARTISTIQUE.md). s.trait (1 par défaut) affine le trait d'encre
  // quand la figure est peinte en grand (portraits, écrans d'accueil).
  drawHero(c, p, s, color, ink, rim, top) {
    const L = Renderer.heroLook(s);
    const [skin, , tenue, tenue2, capeC, lantern] = L.couleurs;
    const facing = Renderer.FACINGS.includes(s.facing) ? s.facing : 'se';
    const back = facing === 'ne' || facing === 'nw', flip = facing === 'sw' || facing === 'nw';
    const T = s.trait || 1, lw = w => w * T;
    const fem = s.gender !== 'm';
    const body = s.flash ? '#ffffff' : tenue;
    ink = Renderer.mix(tenue, '#0a0d18', 0.74);
    const X = p.x, Y = p.y, by = top + 10;
    const hx = X + (back ? 0 : 0.9), hy = top + 2;
    c.save();
    if (flip) { c.translate(2 * X, 0); c.scale(-1, 1); }
    c.lineJoin = 'round'; c.lineCap = 'round';
    // Un bras : un trait d'encre, la manche par-dessus ; la main au bout.
    const arm = (x0, y0, x1, y1, x2, y2, col) => {
      c.beginPath(); c.moveTo(x0, y0); c.quadraticCurveTo(x1, y1, x2, y2);
      c.lineWidth = 3.4 + lw(1.9); c.strokeStyle = ink; c.stroke();
      c.lineWidth = 3.4; c.strokeStyle = col; c.stroke();
    };
    const hand = (x, y) => { c.beginPath(); c.arc(x, y, 2.1, 0, Math.PI * 2); c.lineWidth = lw(1.3); c.strokeStyle = ink; c.stroke(); c.fillStyle = skin; c.fill(); };
    const sleeve = Renderer.mix(body, '#0a0d18', 0.22);
    // De face, la cape et le dos de la coiffure passent derrière tout le reste.
    if (!back) {
      this.heroCape(c, X, Y, top, capeC, ink, rim, lw);
      this.heroHair(c, 'arriere', L, hx, hy, ink, rim, T);
    }
    // Jambes et bottes : la chausse éclairée de face, la botte et sa pointe vers l'avant (de dos,
    // le talon seul), un revers et un reflet.
    const boot = Renderer.mix(tenue2, '#07080e', 0.55);
    for (const x of [X - 7, X + 2]) {
      Util.roundRect(c, x, Y - 15, 5, 14, 2);
      const lg = c.createLinearGradient(x, 0, x + 5, 0);
      lg.addColorStop(0, Renderer.mix(tenue2, '#ffffff', 0.12)); lg.addColorStop(1, Renderer.mix(tenue2, '#000000', 0.22));
      c.fillStyle = lg; c.fill(); c.lineWidth = lw(1.6); c.strokeStyle = ink; c.stroke();
      const b = new Path2D();
      b.moveTo(x - 0.4, Y - 6.8); b.lineTo(x + 5.4, Y - 6.8);
      if (back) { b.lineTo(x + 5.4, Y - 1); b.quadraticCurveTo(x + 5.4, Y + 0.1, x + 4.2, Y + 0.1); }
      else { b.lineTo(x + 5.4, Y - 3.2); b.quadraticCurveTo(x + 7.6, Y - 2.8, x + 7.5, Y - 1); b.quadraticCurveTo(x + 7.4, Y + 0.1, x + 5.8, Y + 0.1); }
      b.lineTo(x + 0.6, Y + 0.1); b.quadraticCurveTo(x - 0.4, Y + 0.1, x - 0.4, Y - 0.9); b.closePath();
      c.fillStyle = boot; c.fill(b); c.lineWidth = lw(1.1); c.strokeStyle = ink; c.stroke(b);
      c.fillStyle = Renderer.mix(boot, '#ffffff', 0.2); c.fillRect(x - 0.4, Y - 6.8, 5.8, 1.3);
      c.fillStyle = 'rgba(255,255,255,0.15)'; c.beginPath(); c.ellipse(x + 1.8, Y - 3.4, 0.8, 1.6, 0, 0, Math.PI * 2); c.fill();
    }
    // Bras lointain, derrière le torse
    if (!back) { arm(X - 8, by + 3, X - 11, by + 9.5, X - 10.8, by + 16, sleeve); hand(X - 10.8, by + 16.6); }
    // Torse : épaules plus larges pour un Veilleur ; taille marquée et tunique évasée pour une Veilleuse.
    const sw = fem ? 9.2 : 10.4, ww = fem ? 7.4 : 9, hw = fem ? 10.6 : 10;
    const tp = new Path2D();
    tp.moveTo(X - sw + 2.6, by); tp.lineTo(X + sw - 2.6, by);
    tp.quadraticCurveTo(X + sw, by, X + sw, by + 3);
    tp.quadraticCurveTo(X + sw, by + 10, X + ww, by + 15);
    tp.quadraticCurveTo(X + hw, by + 19, X + hw, by + 21.6);
    tp.quadraticCurveTo(X + hw, by + 24, X + hw - 2.6, by + 24);
    tp.lineTo(X - hw + 2.6, by + 24);
    tp.quadraticCurveTo(X - hw, by + 24, X - hw, by + 21.6);
    tp.quadraticCurveTo(X - hw, by + 19, X - ww, by + 15);
    tp.quadraticCurveTo(X - sw, by + 10, X - sw, by + 3);
    tp.quadraticCurveTo(X - sw, by, X - sw + 2.6, by);
    tp.closePath();
    const half = Math.max(sw, hw);
    this.shadeBody(c, tp, [X - half, by, X + half, by + 24], body, ink, rim, T);
    if (back) {
      // De dos : la cape couvre le torse, les bras sortent de ses bords.
      this.heroCapeDos(c, X, Y, by, capeC, ink, rim, lw);
      arm(X - 8.4, by + 3.4, X - 11.6, by + 9.5, X - 11.6, by + 15.6, sleeve); hand(X - 11.6, by + 16.2);
      arm(X + 8.4, by + 3.4, X + 11.6, by + 9.5, X + 11.8, by + 15.2, sleeve); hand(X + 11.8, by + 15.8);
    } else {
      // Bras proche, col, ceinture et boucle, couture d'or à l'épaule (le Fil tient la figure).
      arm(X + 8, by + 3, X + 11.6, by + 8.5, X + 12.6, by + 13.6, body);
      c.fillStyle = Renderer.mix(body, '#ffffff', 0.25);
      c.beginPath(); c.moveTo(X - 5.2, by + 0.5); c.lineTo(X + 0.6, by + 4.4); c.lineTo(X + 6.2, by + 0.5); c.closePath(); c.fill();
      c.fillStyle = '#3a2a20'; c.fillRect(X - ww - 0.6, by + 14, 2 * ww + 1.2, 3.3);
      c.fillStyle = '#e2c690'; c.fillRect(X - 1.2, by + 13.6, 3.6, 4.1);
      c.strokeStyle = '#e2c690'; c.lineWidth = 0.9; c.setLineDash([1.2, 1.1]);
      c.beginPath(); c.moveTo(X + sw - 5.6, by + 0.9); c.lineTo(X + sw - 1.2, by + 4); c.stroke();
      c.setLineDash([]);
    }
    // Cou, oreille (du côté de la nuque), tête
    c.fillStyle = Renderer.mix(skin, '#6a3424', 0.3); c.fillRect(hx - 2.4, hy + 6.4, 4.8, 4.6);
    if (!back) {
      c.beginPath(); c.ellipse(hx - 8.4, hy + 1.8, 1.7, 2.3, -0.2, 0, Math.PI * 2);
      c.lineWidth = lw(1.6); c.strokeStyle = ink; c.stroke(); c.fillStyle = skin; c.fill();
    }
    const hg = c.createRadialGradient(hx - 3, hy - 3, 1, hx, hy, 10);
    hg.addColorStop(0, Renderer.mix(skin, '#ffffff', 0.45)); hg.addColorStop(0.7, skin); hg.addColorStop(1, Renderer.mix(skin, '#6a3424', 0.32));
    c.beginPath(); c.arc(hx, hy, 9, 0, Math.PI * 2);
    c.lineWidth = lw(3.6); c.strokeStyle = ink; c.stroke(); c.fillStyle = hg; c.fill();
    if (back) this.heroHair(c, 'dos', L, hx, hy, ink, rim, T);
    else { this.heroFace(c, hx, hy, L, fem); this.heroHair(c, 'avant', L, hx, hy, ink, rim, T); }
    // L'objet de classe, puis la main proche qui le tient
    this.drawProp(c, p, s, top, by, ink, lantern, T, back);
    if (!back) hand(X + 12.6, by + 14);
    c.restore();
    // Glyphe de classe, ivoire sur la poitrine (jamais retourné)
    if (!back) {
      const glyph = s.glyph || 'V', gx = X + (flip ? -0.6 : 0.6);
      c.font = `800 ${glyph.length > 1 ? 9.5 : 11.5}px Cinzel, Georgia, serif`; c.textAlign = 'center'; c.textBaseline = 'middle';
      c.lineWidth = 2.6 * T; c.strokeStyle = Renderer.rgba(ink, 0.9); c.strokeText(glyph, gx, by + 8.6);
      c.fillStyle = '#f7ead2'; c.fillText(glyph, gx, by + 8.6);
      c.textBaseline = 'alphabetic';
    }
  }

  // La cape de face : elle tombe de l'épaule lointaine, ourlée d'or.
  heroCape(c, X, Y, top, capeC, ink, rim, lw) {
    const k = new Path2D();
    k.moveTo(X - 9, top + 11); k.bezierCurveTo(X - 15, top + 20, X - 18, Y - 14, X - 16, Y - 5);
    k.quadraticCurveTo(X - 6, Y - 1, X + 3, Y - 7); k.lineTo(X + 6, top + 12); k.closePath();
    c.lineWidth = lw(3.4); c.strokeStyle = ink; c.stroke(k);
    const g = c.createLinearGradient(X - 16, top, X + 4, Y);
    g.addColorStop(0, Renderer.mix(capeC, rim, 0.25)); g.addColorStop(0.35, capeC); g.addColorStop(1, Renderer.mix(capeC, '#000000', 0.45));
    c.fillStyle = g; c.fill(k);
    c.strokeStyle = '#c9a66b'; c.lineWidth = 1.3; c.beginPath(); c.moveTo(X - 16, Y - 5); c.quadraticCurveTo(X - 6, Y - 1, X + 3, Y - 7); c.stroke();
  }

  // La cape de dos : des deux épaules à mi-mollet, ourlet d'or et couture du Fil au milieu.
  heroCapeDos(c, X, Y, by, capeC, ink, rim, lw) {
    const k = new Path2D();
    k.moveTo(X - 9, by + 0.6);
    k.quadraticCurveTo(X, by - 2.6, X + 9, by + 0.6);
    k.bezierCurveTo(X + 11, by + 8, X + 12.4, Y - 14, X + 11.8, Y - 5.4);
    k.quadraticCurveTo(X + 6, Y - 3, X, Y - 3.6);
    k.quadraticCurveTo(X - 6, Y - 3, X - 11.8, Y - 5.4);
    k.bezierCurveTo(X - 12.4, Y - 14, X - 11, by + 8, X - 9, by + 0.6);
    k.closePath();
    c.lineWidth = lw(3.4); c.strokeStyle = ink; c.stroke(k);
    const g = c.createLinearGradient(X - 12, by, X + 10, Y);
    g.addColorStop(0, Renderer.mix(capeC, rim, 0.22)); g.addColorStop(0.4, capeC); g.addColorStop(1, Renderer.mix(capeC, '#000000', 0.45));
    c.fillStyle = g; c.fill(k);
    c.strokeStyle = 'rgba(0,0,0,0.22)'; c.lineWidth = 0.9;
    c.beginPath(); c.moveTo(X - 5, by + 4); c.quadraticCurveTo(X - 6.5, by + 14, X - 7, Y - 5.6); c.moveTo(X + 5, by + 4); c.quadraticCurveTo(X + 6.5, by + 14, X + 7, Y - 5.6); c.stroke();
    c.strokeStyle = '#c9a66b'; c.lineWidth = 1.3;
    c.beginPath(); c.moveTo(X - 11.8, Y - 5.4); c.quadraticCurveTo(X - 6, Y - 3, X, Y - 3.6); c.quadraticCurveTo(X + 6, Y - 3, X + 11.8, Y - 5.4); c.stroke();
    c.lineWidth = 0.9; c.setLineDash([1.4, 1.2]);
    c.beginPath(); c.moveTo(X, by + 1.4); c.lineTo(X, Y - 4.6); c.stroke();
    c.setLineDash([]);
  }

  // Le visage de trois quarts : joues, yeux en amande (l'œil lointain plus étroit) avec leur point
  // de lumière, sourcils de la couleur des cheveux (l'expression passe par eux), cils, bouche.
  heroFace(c, x, y, L, fem) {
    const skin = L.couleurs[0], hair = L.couleurs[1];
    const ex = x + 0.6, ey = y + 1.6;
    c.fillStyle = 'rgba(236,120,104,0.2)';
    c.beginPath(); c.ellipse(ex - 4.8, y + 4.5, 1.6, 0.95, 0, 0, Math.PI * 2); c.ellipse(ex + 4.5, y + 4.5, 1.6, 0.95, 0, 0, Math.PI * 2); c.fill();
    c.fillStyle = '#1a1220';
    c.beginPath(); c.ellipse(ex - 3.4, ey, 1.02, 1.55, 0, 0, Math.PI * 2); c.ellipse(ex + 3.2, ey, 1.18, 1.62, 0, 0, Math.PI * 2); c.fill();
    c.fillStyle = '#ffffff';
    for (const dx of [-3.3, 3.3]) { c.beginPath(); c.arc(ex + dx - 0.05, ey - 0.6, 0.46, 0, Math.PI * 2); c.fill(); }
    c.strokeStyle = Renderer.mix(hair, '#0a0810', 0.45); c.lineWidth = fem ? 0.75 : 1.05;
    c.beginPath(); c.moveTo(ex - 4.7, ey - 2.4); c.quadraticCurveTo(ex - 3.6, ey - 3.3, ex - 2.3, ey - 2.9);
    c.moveTo(ex + 1.9, ey - 2.9); c.quadraticCurveTo(ex + 3.3, ey - 3.4, ex + 4.5, ey - 2.5); c.stroke();
    if (fem) {
      c.strokeStyle = '#1a1220'; c.lineWidth = 0.55;
      c.beginPath(); c.moveTo(ex - 4.3, ey - 0.8); c.lineTo(ex - 5, ey - 1.4); c.moveTo(ex + 4.3, ey - 0.8); c.lineTo(ex + 5, ey - 1.4); c.stroke();
    }
    c.strokeStyle = Renderer.mix(skin, '#4a1c1c', 0.55); c.lineWidth = 0.7;
    c.beginPath(); c.moveTo(ex - 1.3, y + 5.7); c.quadraticCurveTo(ex, y + 6.4, ex + 1.3, y + 5.7); c.stroke();
  }

  // Les huit coiffures, lisibles à 45 pixels comme en grand : 0 mèche balayée (l'allure d'origine),
  // 1 queue haute, 2 hérissée, 3 chignon, 4 longs, 5 tresse, 6 capuche, 7 rasée à bandeau d'or.
  // `part` : 'arriere' (derrière la tête vue de face), 'avant' (sur la tête vue de face), 'dos'.
  heroHair(c, part, L, x, y, ink, rim, T) {
    const hair = L.couleurs[1], tenue = L.couleurs[2], capeC = L.couleurs[4], lantern = L.couleurs[5];
    const lw = w => w * T, t = L.tete;
    const light = Renderer.mix(hair, '#ffffff', 0.32), dark = Renderer.mix(hair, '#06050a', 0.42);
    // Une masse de cheveux : contour d'encre, puis le dégradé du clair (haut gauche) vers l'ombre.
    const mass = (k, outline) => {
      if (outline !== false) { c.lineWidth = lw(outline || 2.2); c.strokeStyle = ink; c.stroke(k); }
      const g = c.createLinearGradient(x - 9, y - 13, x + 7, y + 12);
      g.addColorStop(0, light); g.addColorStop(0.45, hair); g.addColorStop(1, dark);
      c.fillStyle = g; c.fill(k);
    };
    // Le capuchon, dans la couleur de la cape.
    const hood = (k, outline) => {
      c.lineWidth = lw(outline || 2.4); c.strokeStyle = ink; c.stroke(k);
      const g = c.createLinearGradient(x - 11, y - 13, x + 9, y + 10);
      g.addColorStop(0, Renderer.mix(capeC, rim, 0.24)); g.addColorStop(0.5, capeC); g.addColorStop(1, Renderer.mix(capeC, '#000000', 0.4));
      c.fillStyle = g; c.fill(k);
    };
    const strands = list => {
      c.strokeStyle = Renderer.rgba(dark, 0.75); c.lineWidth = 0.7;
      c.beginPath(); for (const [a, b, d, e, f, g] of list) { c.moveTo(x + a, y + b); c.quadraticCurveTo(x + d, y + e, x + f, y + g); } c.stroke();
    };
    const poly = pts => { const k = new Path2D(); pts.forEach(([a, b], i) => (i ? k.lineTo(x + a, y + b) : k.moveTo(x + a, y + b))); k.closePath(); return k; };
    const rimArc = () => { c.strokeStyle = Renderer.rgba(rim, 0.7); c.lineWidth = 1.2; c.beginPath(); c.arc(x, y - 0.5, 9.2, Math.PI * 1.1, Math.PI * 1.45); c.stroke(); };
    // La calotte vue de dos : tout le crâne jusqu'à la nuque.
    const nape = () => {
      const k = new Path2D(); k.moveTo(x - 9.4, y + 3); k.arc(x, y - 0.4, 9.6, Math.PI * 0.94, Math.PI * 2.06);
      k.quadraticCurveTo(x + 7, y + 7.6, x + 1, y + 6.4); k.quadraticCurveTo(x - 5, y + 7.8, x - 9.4, y + 3); k.closePath();
      mass(k, false);
    };
    const tail = () => { // queue haute vue de dos
      const k = new Path2D(); k.moveTo(x - 3, y - 5.6);
      k.bezierCurveTo(x - 4.6, y + 4, x - 3.6, y + 11.4, x - 1, y + 16.4);
      k.quadraticCurveTo(x + 2, y + 8.6, x + 2.6, y - 5.2); k.closePath();
      mass(k, 1.8);
      c.beginPath(); c.arc(x - 0.2, y - 5.2, 1.7, 0, Math.PI * 2); c.lineWidth = lw(1); c.strokeStyle = ink; c.stroke(); c.fillStyle = tenue; c.fill();
    };
    const bun = (bx, bh, r) => {
      const k = new Path2D(); k.arc(bx, bh, r, 0, Math.PI * 2); mass(k, 1.8);
      c.strokeStyle = Renderer.rgba(dark, 0.75); c.lineWidth = 0.7;
      c.beginPath(); c.arc(bx, bh, r * 0.55, Math.PI * 0.9, Math.PI * 2.3); c.stroke();
      // épingle d'or, un éclat de lanterne au bout
      c.strokeStyle = '#c9a66b'; c.lineWidth = 1.1; c.beginPath(); c.moveTo(bx - r - 1.6, bh - 2.4); c.lineTo(bx + r + 0.6, bh + 1.8); c.stroke();
      c.fillStyle = lantern; c.beginPath(); c.arc(bx - r - 1.6, bh - 2.4, 1.1, 0, Math.PI * 2); c.fill();
    };
    const braid = (x0, y0, x1, y1) => {
      for (let i = 0; i < 4; i++) {
        const f = i / 3, bx = x0 + (x1 - x0) * f * 0.88, bh = y0 + (y1 - y0) * f * 0.88;
        const k = new Path2D(); k.ellipse(bx, bh, 2.3 - f * 0.4, 1.9, i % 2 ? 0.5 : -0.5, 0, Math.PI * 2); mass(k, 1.3);
      }
      c.fillStyle = tenue; c.fillRect(x1 - 1.6, y1 - 1.6, 3.2, 1.7);
      const k = new Path2D(); k.moveTo(x1 - 1.5, y1); k.lineTo(x1 + 1.5, y1); k.lineTo(x1 + 0.3, y1 + 3.4); k.closePath(); mass(k, 1);
    };
    const shaved = back => {
      c.save(); c.beginPath(); c.arc(x, y, 9, 0, Math.PI * 2); c.clip();
      c.fillStyle = Renderer.rgba(hair, 0.42); c.beginPath(); c.arc(x, y + (back ? 1.6 : -1.4), 9.8, Math.PI * 0.95, Math.PI * 2.05); c.closePath(); c.fill();
      c.restore();
    };
    const band = front => {
      c.beginPath(); c.moveTo(x - 9.1, y - 2); c.quadraticCurveTo(x, front ? y - 5.6 : y - 4.4, x + 9.1, y - 2.6);
      c.lineWidth = 2.4 + lw(1.4); c.strokeStyle = ink; c.stroke();
      c.lineWidth = 2.4; c.strokeStyle = '#c9a66b'; c.stroke();
      c.lineWidth = 0.7; c.strokeStyle = '#f2dcaa'; c.beginPath(); c.moveTo(x - 8, y - 2.9); c.quadraticCurveTo(x, front ? y - 6.2 : y - 5, x + 8, y - 3.4); c.stroke();
      if (front) {
        const gx = x + 1.2, gy = y - 4.3;
        c.beginPath(); c.moveTo(gx, gy - 2.6); c.lineTo(gx + 1.8, gy); c.lineTo(gx, gy + 2.2); c.lineTo(gx - 1.8, gy); c.closePath();
        c.lineWidth = lw(1); c.strokeStyle = ink; c.stroke(); c.fillStyle = Renderer.mix(lantern, '#ffffff', 0.45); c.fill();
      }
    };
    const SPIKES = [[-12.8, -4.2], [-8.8, -5], [-10.6, -11.2], [-5.2, -8.8], [-4.6, -15.2], [-0.2, -9.8], [2.4, -15.4], [4.2, -9.6], [9.2, -12.6], [8.4, -6.2], [12.4, -5]];
    const HOOD = () => {
      const k = new Path2D(); k.moveTo(x - 10.4, y + 7.2);
      k.bezierCurveTo(x - 13, y - 1, x - 14, y - 8, x - 10.2, y - 12.6);
      k.quadraticCurveTo(x - 3, y - 13.6, x + 4, y - 11.4);
      k.bezierCurveTo(x + 11, y - 8.6, x + 12.2, y + 1, x + 10.6, y + 7.2);
      k.quadraticCurveTo(x, y + 10.6, x - 10.4, y + 7.2); k.closePath();
      return k;
    };

    if (part === 'arriere') {
      if (t === 1) {
        const k = new Path2D(); k.moveTo(x - 3.4, y - 8.4);
        k.bezierCurveTo(x - 12.6, y - 11.4, x - 16.2, y - 1, x - 12.6, y + 11.2);
        k.quadraticCurveTo(x - 11, y + 3, x - 7, y - 3.6); k.closePath();
        mass(k); strands([[-6, -7, -12, -4, -12.4, 6], [-8, -6, -13.4, 0, -11.6, 8]]);
      } else if (t === 3) bun(x - 2.4, y - 10.6, 4.4);
      else if (t === 4) {
        const k = new Path2D(); k.moveTo(x - 8.8, y - 3);
        k.quadraticCurveTo(x - 12.4, y + 6, x - 10.8, y + 14.2);
        k.quadraticCurveTo(x - 4, y + 16.8, x + 2, y + 15.2);
        k.quadraticCurveTo(x + 9.6, y + 14.6, x + 10.2, y + 9);
        k.quadraticCurveTo(x + 10.6, y + 2, x + 8.8, y - 3); k.closePath();
        mass(k);
      } else if (t === 6) hood(HOOD());
      return;
    }

    if (part === 'avant') {
      switch (t) {
        case 1: {
          const k = new Path2D(); k.arc(x, y - 1.6, 9.6, Math.PI * 0.97, Math.PI * 2.03);
          k.quadraticCurveTo(x + 6.4, y - 4.8, x + 1.4, y - 2.8);
          k.quadraticCurveTo(x - 4.6, y - 4.4, x - 9.4, y + 1.2); k.closePath();
          mass(k, false); strands([[-6, -6, -2, -9, 3, -7.5]]);
          c.beginPath(); c.arc(x - 5.8, y - 7.6, 1.6, 0, Math.PI * 2); c.lineWidth = lw(1); c.strokeStyle = ink; c.stroke(); c.fillStyle = tenue; c.fill();
          break;
        }
        case 2: {
          mass(poly([[-9.6, 1.4]].concat(SPIKES, [[9.6, -1.2], [5.2, -4], [1.6, -1.8], [-2.6, -3.8], [-5.8, -1.2]])), 1.8);
          strands([[-4, -6, -5, -9, -4.6, -13], [2, -6, 2.4, -10, 2.4, -13.6]]);
          break;
        }
        case 3: {
          const k = new Path2D(); k.arc(x, y - 1.2, 9.5, Math.PI, Math.PI * 2);
          k.quadraticCurveTo(x + 6.4, y - 6.2, x + 0.6, y - 6.6);
          k.quadraticCurveTo(x - 6, y - 6.2, x - 9.5, y - 1.2); k.closePath();
          mass(k, false); strands([[0.6, -6.6, -3, -9.4, -7, -7.4], [0.6, -6.6, 4, -9.2, 7.4, -6.8]]);
          break;
        }
        case 4: {
          const k = new Path2D(); k.arc(x, y - 1.4, 9.7, Math.PI * 0.96, Math.PI * 2.04);
          k.quadraticCurveTo(x + 6, y - 5.6, x - 0.4, y - 5.6);
          k.quadraticCurveTo(x - 7, y - 4.6, x - 9.6, y + 2); k.closePath();
          mass(k, false);
          const a = new Path2D(); a.moveTo(x - 9.6, y - 1.2); a.quadraticCurveTo(x - 11.4, y + 7, x - 9.6, y + 12.6); a.quadraticCurveTo(x - 7.4, y + 6, x - 7.2, y - 0.6); a.closePath(); mass(a, 1.6);
          const b = new Path2D(); b.moveTo(x + 9.4, y - 1.6); b.quadraticCurveTo(x + 10.9, y + 6, x + 9.4, y + 11.2); b.quadraticCurveTo(x + 7.6, y + 5, x + 7.4, y - 1.2); b.closePath(); mass(b, 1.6);
          break;
        }
        case 5: {
          const k = new Path2D(); k.arc(x, y - 1.5, 9.6, Math.PI * 0.98, Math.PI * 2.02);
          k.quadraticCurveTo(x + 4.6, y - 1.4, x - 1, y - 6.4);
          k.quadraticCurveTo(x - 6.4, y - 4.2, x - 9.5, y + 1.2); k.closePath();
          mass(k, false);
          braid(x + 7.6, y + 4.6, x + 9.6, y + 16.8);
          break;
        }
        case 6: {
          const f = new Path2D(); f.arc(x + 0.6, y + 0.8, 8.4, Math.PI * 1.08, Math.PI * 1.92); f.quadraticCurveTo(x + 2, y - 3.6, x - 6.8, y - 2.6); f.closePath();
          mass(f, false);
          const k = new Path2D(); k.arc(x + 0.2, y + 0.4, 10.6, Math.PI * 0.84, Math.PI * 2.16); k.arc(x + 0.8, y + 1.6, 8.2, Math.PI * 2.1, Math.PI * 0.9, true); k.closePath();
          hood(k, 1.6);
          break;
        }
        case 7: shaved(false); band(true); break;
        default: {
          const k = new Path2D(); k.arc(x, y - 1.5, 9.6, Math.PI * 0.98, Math.PI * 2.02);
          k.quadraticCurveTo(x + 4, y - 4, x - 1, y - 0.5);
          k.quadraticCurveTo(x - 6, y - 1.5, x - 9.4, y + 2); k.closePath();
          mass(k, false);
        }
      }
      if (t !== 6) rimArc();
      return;
    }

    // De dos
    switch (t) {
      case 2: mass(poly([[-9.6, 2.6]].concat(SPIKES, [[9.6, 2.6], [5, 7], [0, 7.8], [-5, 7]])), 1.8); break;
      case 4: {
        const k = new Path2D(); k.moveTo(x - 9.6, y + 1); k.arc(x, y - 0.6, 9.7, Math.PI * 0.95, Math.PI * 2.05);
        k.quadraticCurveTo(x + 11.2, y + 8, x + 10.4, y + 14.4); k.quadraticCurveTo(x + 4.4, y + 17.6, x - 0.4, y + 15.8);
        k.quadraticCurveTo(x - 5, y + 18, x - 10.4, y + 14.4); k.quadraticCurveTo(x - 11.2, y + 8, x - 9.6, y + 1); k.closePath();
        mass(k, 1.8); strands([[-4, -4, -6, 6, -6, 13], [3, -4, 5, 6, 5, 13]]);
        break;
      }
      case 6: hood(HOOD()); break;
      case 7: shaved(true); band(false); break;
      default: nape(); strands([[-3, -6, -6, 0, -6, 5], [3, -6, 5, 0, 5, 5]]);
    }
    if (t === 1) tail();
    else if (t === 3) bun(x, y - 8.6, 4.6);
    else if (t === 5) braid(x - 0.4, y + 4.6, x + 0.6, y + 18);
    if (t !== 6) rimArc();
  }

  // L'objet de classe, porteur de la seule couleur vive de la figure (sa « lanterne »), dans la
  // couleur choisie à la création. De dos, la hotte du Kaldrin se porte sur la cape.
  drawProp(c, p, s, top, by, ink, col, T, back) {
    col = col || s.color; T = T || 1;
    const light = Renderer.mix(col, '#ffffff', 0.55);
    const ow = (inner, outer) => inner + (outer - inner) * T;
    const glow = (x, y, r) => { c.save(); c.globalCompositeOperation = 'lighter'; c.globalAlpha = 0.8; c.drawImage(Renderer.dot(col), x - r, y - r, r * 2, r * 2); c.restore(); };
    const gem = (x, y, w, h) => {
      c.beginPath(); c.moveTo(x, y - h); c.lineTo(x + w, y); c.lineTo(x, y + h); c.lineTo(x - w, y); c.closePath();
      c.lineWidth = 2.2 * T; c.strokeStyle = ink; c.stroke(); c.fillStyle = light; c.fill();
      c.fillStyle = 'rgba(255,255,255,0.8)'; c.beginPath(); c.moveTo(x, y - h); c.lineTo(x - w * 0.6, y - h * 0.1); c.lineTo(x, y); c.closePath(); c.fill();
    };
    const line = (pts, w, color) => { c.lineWidth = w; c.strokeStyle = color; c.beginPath(); pts.forEach((q, i) => (i ? c.lineTo(q[0], q[1]) : c.moveTo(q[0], q[1]))); c.stroke(); };
    switch (s.glyph) {
      case 'L': { // arc de bois doré, cristal à la pointe
        const x = p.x + 14;
        const arc = () => { c.beginPath(); c.moveTo(x, top + 2); c.quadraticCurveTo(x + 11, top + 22, x, top + 42); };
        arc(); c.lineWidth = ow(2.2, 4.4); c.strokeStyle = ink; c.stroke();
        arc(); c.lineWidth = 2.2; c.strokeStyle = '#c9a66b'; c.stroke();
        line([[x, top + 3], [x - 1.5, top + 41]], 0.9, 'rgba(240,240,255,0.85)');
        glow(x, top + 2, 8); gem(x, top + 1, 2.4, 3.8);
        break;
      }
      case 'O': { // bâton à lanterne
        const x = p.x + 14;
        line([[x, p.y - 1], [x, top - 6]], ow(2.2, 4.2), ink); line([[x, p.y - 1], [x, top - 6]], 2.2, '#8a6a46');
        glow(x, top - 12, 11);
        c.fillStyle = ink; c.fillRect(x - 5, top - 18, 10, 12);
        c.fillStyle = light; c.fillRect(x - 3.5, top - 16.5, 7, 9);
        c.fillStyle = '#c9a66b'; c.fillRect(x - 5.5, top - 19.5, 11, 2.2); c.fillRect(x - 5.5, top - 7, 11, 2);
        break;
      }
      case 'Kr': case 'N': { // lame levée (Karsh : fêlures de sang ; Nerith : lame courte)
        const len = s.glyph === 'Kr' ? 26 : 17, x0 = p.x + 11, y0 = by + 14;
        const x1 = x0 + len * 0.42, y1 = y0 - len;
        line([[x0, y0], [x1, y1]], ow(3.2, 5.4), ink); line([[x0, y0], [x1, y1]], 3.2, '#d8dee8');
        line([[x0 + 1, y0 - 3], [x1 - 0.5, y1 + 3]], 1, s.glyph === 'Kr' ? '#ff4a3a' : light);
        line([[x0 - 4, y0 + 1], [x0 + 4.5, y0 - 2]], 3.2, '#c9a66b');
        if (s.glyph === 'N') { glow(p.x - 11, by + 18, 7); c.fillStyle = ink; c.fillRect(p.x - 14, by + 14, 6, 8); c.fillStyle = light; c.fillRect(p.x - 13, by + 16, 4, 4); }
        else glow(x0 + len * 0.2, y0 - len * 0.5, 7);
        break;
      }
      case 'S': { // dalle de pierre au bras, arêtes de la couleur de classe
        Util.roundRect(c, p.x - 19, by + 2, 10, 20, 2.5);
        c.lineWidth = ow(1.4, 3.4); c.strokeStyle = ink; c.stroke();
        c.fillStyle = '#8f8a80'; c.fill();
        c.lineWidth = 1.4; c.strokeStyle = col; c.stroke();
        c.strokeStyle = 'rgba(0,0,0,0.35)'; c.lineWidth = 0.9; c.beginPath(); c.moveTo(p.x - 16, by + 6); c.lineTo(p.x - 13, by + 12); c.lineTo(p.x - 15, by + 18); c.stroke();
        break;
      }
      case 'K': { // hotte à foyer, dans le dos
        const hx = back ? p.x - 4.5 : p.x - 17, hy = back ? by + 1 : by - 1;
        Util.roundRect(c, hx, hy, 9, 17, 2);
        c.lineWidth = ow(1.2, 3); c.strokeStyle = ink; c.stroke(); c.fillStyle = '#4a3a30'; c.fill();
        glow(hx + 4.5, hy + 8, 8);
        c.fillStyle = light; c.fillRect(hx + 2, hy + 5, 5, 5);
        break;
      }
      default: {
        const gx = p.x + 12.5, gy = by + 13;
        glow(gx, gy, 9); gem(gx, gy, 3, 4.5);
      }
    }
  }

  // Yeux en cabochons : blanc chaud serti d'ombre, pupille sombre, point de lumière.
  eyes(c, x, y, gap) {
    c.fillStyle = 'rgba(8,10,22,0.6)';
    c.beginPath(); c.arc(x - gap, y, 4, 0, Math.PI * 2); c.arc(x + gap, y, 4, 0, Math.PI * 2); c.fill();
    c.fillStyle = '#fff8ec';
    c.beginPath(); c.arc(x - gap, y, 3.1, 0, Math.PI * 2); c.arc(x + gap, y, 3.1, 0, Math.PI * 2); c.fill();
    c.fillStyle = '#15111c';
    c.beginPath(); c.arc(x - gap + 1, y + 0.3, 1.7, 0, Math.PI * 2); c.arc(x + gap + 1, y + 0.3, 1.7, 0, Math.PI * 2); c.fill();
    c.fillStyle = '#ffffff';
    c.beginPath(); c.arc(x - gap + 0.2, y - 0.9, 0.7, 0, Math.PI * 2); c.arc(x + gap + 0.2, y - 0.9, 0.7, 0, Math.PI * 2); c.fill();
  }

  drawNpc(c, p, s, now) {
    const LOOK = { garde: '#8a93a6', marchand: '#c9a35c', artisan: '#b06a3c', ancien: '#d8d0c0', enfant: '#ffd166', marcheur: '#6fdc8c', tisseur: '#4a90ff' };
    const color = LOOK[s.look] || '#aaaaaa';
    const small = s.look === 'enfant' ? 0.82 : 1;
    const breath = this.reducedMotion ? 1 : 1 + 0.02 * Math.sin(now / 700 + (s.phase || 0));
    this.softShadow(c, p.x + 2, p.y + 1, 17 * small, 7.5 * small, 0.85);
    c.save();
    c.translate(p.x, p.y); c.scale(small, small * breath); c.translate(-p.x, -p.y);
    const top = p.y - 42;
    const ink = Renderer.mix(color, '#0a0d18', 0.74);
    for (const x of [p.x - 7, p.x + 2]) { Util.roundRect(c, x, p.y - 15, 5, 14, 2); c.fillStyle = '#2b2f40'; c.fill(); c.lineWidth = 1.6; c.strokeStyle = ink; c.stroke(); }
    const body = new Path2D();
    const bx = p.x - 10, by = top + 10, bw = 20, bh = 24, r = 5;
    body.moveTo(bx + r, by); body.arcTo(bx + bw, by, bx + bw, by + bh, r); body.arcTo(bx + bw, by + bh, bx, by + bh, r); body.arcTo(bx, by + bh, bx, by, r); body.arcTo(bx, by, bx + bw, by, r); body.closePath();
    this.shadeBody(c, body, [bx, by, bx + bw, by + bh], color, ink, '#ffe3b0');
    if (s.look === 'artisan') { c.fillStyle = '#5a3a24'; Util.roundRect(c, p.x - 7, by + 8, 14, 15, 2); c.fill(); }
    if (s.look === 'tisseur') { c.strokeStyle = '#e2c690'; c.lineWidth = 1.4; c.beginPath(); c.moveTo(p.x, by + 2); c.lineTo(p.x, by + bh - 2); c.stroke(); }
    c.fillStyle = '#3a2a20'; c.fillRect(bx + 0.5, by + 18, bw - 1, 3);
    const hg = c.createRadialGradient(p.x - 3, top - 1, 1, p.x, top + 2, 10);
    hg.addColorStop(0, '#fbe9d6'); hg.addColorStop(0.7, '#f0d9c2'); hg.addColorStop(1, '#c9967a');
    c.beginPath(); c.arc(p.x, top + 2, 9, 0, Math.PI * 2); c.lineWidth = 3.6; c.strokeStyle = ink; c.stroke(); c.fillStyle = hg; c.fill();
    c.fillStyle = '#1a1220'; c.beginPath(); c.arc(p.x - 3.2, top + 3.4, 1.2, 0, Math.PI * 2); c.arc(p.x + 3.2, top + 3.4, 1.2, 0, Math.PI * 2); c.fill();
    if (s.look === 'garde') {
      const g = c.createLinearGradient(p.x - 10, top - 9, p.x + 10, top - 1);
      g.addColorStop(0, '#c8ceda'); g.addColorStop(1, '#4a5262');
      c.fillStyle = g; c.beginPath(); c.arc(p.x, top + 0.5, 10, Math.PI, Math.PI * 2); c.closePath(); c.fill(); c.lineWidth = 1.6; c.strokeStyle = ink; c.stroke();
      c.fillStyle = '#c9a66b'; c.fillRect(p.x - 1, top - 13, 2, 5);
    }
    if (s.look === 'marchand' || s.look === 'artisan') {
      c.fillStyle = Renderer.mix(color, '#000', 0.3); c.beginPath(); c.arc(p.x, top - 1, 9.5, Math.PI, Math.PI * 2); c.fill();
      if (s.look === 'marchand') { c.beginPath(); c.ellipse(p.x, top - 1, 14, 3.2, 0, 0, Math.PI * 2); c.fill(); c.lineWidth = 1.2; c.strokeStyle = ink; c.stroke(); }
    }
    if (s.look === 'ancien') {
      c.fillStyle = '#eee8dc'; c.beginPath(); c.moveTo(p.x - 5, top + 6); c.quadraticCurveTo(p.x, top + 18, p.x + 5, top + 6); c.closePath(); c.fill();
      c.fillStyle = '#5a5060'; c.beginPath(); c.arc(p.x, top + 1, 10, Math.PI * 1.02, Math.PI * 1.98); c.fill();
    }
    if (s.look === 'marcheur' || s.look === 'tisseur') {
      c.fillStyle = Renderer.mix(color, '#0d1020', 0.45); c.beginPath(); c.arc(p.x, top + 1, 10.2, Math.PI * 0.95, Math.PI * 2.05); c.lineTo(p.x + 8, top + 4); c.quadraticCurveTo(p.x, top - 4, p.x - 8, top + 4); c.closePath(); c.fill();
    }
    c.restore();
  }

  drawNode(c, p, s) {
    const def = Items.get(s.resource);
    const kind = def && def.node ? def.node.kind : 'plante';
    const P = this.palette;
    c.globalAlpha = s.ready ? 1 : 0.35;
    this.softShadow(c, p.x + 2, p.y + 1, 14, 6, 0.8);
    const ink = P.ink;
    if (kind === 'bois') {
      const B = P.bark;
      c.fillStyle = B[2]; c.fillRect(p.x - 9, p.y - 16, 18, 16);
      c.beginPath(); c.ellipse(p.x, p.y, 9, 4.5, 0, 0, Math.PI); c.fill();
      const g = c.createLinearGradient(p.x - 9, 0, p.x + 9, 0); g.addColorStop(0, B[3]); g.addColorStop(1, B[0]);
      c.fillStyle = g; c.fillRect(p.x - 9, p.y - 16, 18, 16);
      c.lineWidth = 1.5; c.strokeStyle = ink; c.beginPath(); c.moveTo(p.x - 9, p.y - 16); c.lineTo(p.x - 9, p.y); c.ellipse(p.x, p.y, 9, 4.5, 0, Math.PI, 0, true); c.lineTo(p.x + 9, p.y - 16); c.stroke();
      c.fillStyle = '#d8b884'; c.beginPath(); c.ellipse(p.x, p.y - 16, 9, 4.5, 0, 0, Math.PI * 2); c.fill(); c.stroke();
      c.strokeStyle = '#9a7650'; c.lineWidth = 0.9; for (const r of [2, 4.5, 6.8]) { c.beginPath(); c.ellipse(p.x, p.y - 16, r, r * 0.5, 0, 0, Math.PI * 2); c.stroke(); }
      if (P.moss) { c.fillStyle = P.moss[1]; c.beginPath(); c.ellipse(p.x - 6, p.y - 2, 4, 2, 0, 0, Math.PI * 2); c.fill(); }
    } else if (kind === 'pierre') {
      const pts = [[p.x - 13, p.y], [p.x - 9, p.y - 14], [p.x + 2, p.y - 19], [p.x + 13, p.y - 7], [p.x + 10, p.y]];
      c.beginPath(); pts.forEach((q, i) => (i ? c.lineTo(q[0], q[1]) : c.moveTo(q[0], q[1]))); c.closePath();
      c.lineWidth = 3.5; c.strokeStyle = ink; c.stroke();
      const g = c.createLinearGradient(p.x - 13, p.y - 19, p.x + 13, p.y);
      g.addColorStop(0, P.rock[4]); g.addColorStop(1, P.rock[1]);
      c.fillStyle = g; c.fill();
      c.strokeStyle = P.vein[1]; c.lineWidth = 1.6; c.beginPath(); c.moveTo(p.x - 6, p.y - 12); c.lineTo(p.x - 1, p.y - 7); c.lineTo(p.x + 4, p.y - 9); c.lineTo(p.x + 7, p.y - 3); c.stroke();
      c.fillStyle = P.lantern; c.beginPath(); c.arc(p.x + 1, p.y - 8, 2.4, 0, Math.PI * 2); c.arc(p.x - 5, p.y - 4, 1.8, 0, Math.PI * 2); c.fill();
      if (s.ready) this.bglow(p.x, p.y - 8, 10, P.lantern, 0.5);
    } else {
      for (const [dx, w] of [[-6, 1], [0, 1.2], [6, 1]]) {
        c.strokeStyle = ink; c.lineWidth = 3.6 * w; c.beginPath(); c.moveTo(p.x + dx, p.y); c.quadraticCurveTo(p.x + dx * 1.5, p.y - 10, p.x + dx * 0.6, p.y - 18); c.stroke();
        c.strokeStyle = '#5aa45c'; c.lineWidth = 2 * w; c.stroke();
      }
      for (const [dx, dy, a] of [[-8, -8, -0.6], [8, -9, 0.6]]) { c.fillStyle = '#6ebc66'; c.beginPath(); c.ellipse(p.x + dx, p.y + dy, 5, 2.2, a, 0, Math.PI * 2); c.fill(); c.lineWidth = 1; c.strokeStyle = ink; c.stroke(); }
      c.save(); c.globalCompositeOperation = 'lighter'; c.globalAlpha = s.ready ? 0.8 : 0.3;
      c.drawImage(Renderer.dot(P.lantern), p.x - 10, p.y - 28, 20, 20); c.restore();
      c.fillStyle = P.glow; c.beginPath(); c.arc(p.x, p.y - 18, 3.2, 0, Math.PI * 2); c.fill();
      c.lineWidth = 1.2; c.strokeStyle = ink; c.stroke();
      if (s.ready) this.bglow(p.x, p.y - 18, 10, P.lantern, 0.6);
    }
    c.globalAlpha = 1;
  }

  // Rocher posé à la case p (rocher temporaire d'un sort, ou décor dessiné à la demande).
  drawRock(c, p, P, n, temp) {
    const R = this.res;
    if (!R) return;
    const s = temp ? R.tempRock : R.rocks[Math.floor(n * R.rocks.length) % R.rocks.length];
    this.softShadow(c, p.x + 5, p.y + 2, 26, 12, 0.7);
    c.drawImage(s.cv, p.x - s.ax, p.y - s.ay, s.w, s.h);
  }

  drawTree(c, p, P, n) { const R = this.res; if (!R) return; const s = R.trees[Math.floor(n * R.trees.length) % R.trees.length]; c.drawImage(s.cv, p.x - s.ax, p.y - s.ay, s.w, s.h); }
  drawLantern(c, p) { const s = this.res && this.res.lamp; if (s) c.drawImage(s.cv, p.x - s.ax, p.y - s.ay, s.w, s.h); }
  drawDoor(c, p) { const s = this.res && this.res.door; if (s) c.drawImage(s.cv, p.x - s.ax, p.y - s.ay, s.w, s.h); }
  drawRelay(c, p) { const s = this.res && this.res.relay; if (s) c.drawImage(s.cv, p.x - s.ax, p.y - s.ay, s.w, s.h); }
}
