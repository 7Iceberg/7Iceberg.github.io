// La caméra de l'île d'Ervane (docs/ILE-TECHNIQUE.md, 3.3, 3.11 et 4.7) : azimut de 45° par défaut
// (le haut de l'écran regarde le nord-ouest : +u descend vers la droite, +v vers la gauche, comme
// les cases d'Orsane), que le joueur tourne (deux doigts qui pivotent, le bouton droit, les touches
// A et E) autour du point visé ; perspective d'exploration à 20° d'ouverture, champ de 18 à 60 u
// (la largeur de sol vue au point visé), élévation liée au champ (35° au plus près, 45° au plus loin).
//
// Le point visé suit le Veilleur par un ressort à amortissement critique (posé en 0,6 s, sans
// dépasser), avec une avance du regard dans le sens de sa marche (0,3 s de marche, 2 u au plus). Un
// glissement déplace la vue de 15 u au plus ; elle revient en une seconde dès que le Veilleur
// marche, ou après quatre secondes sans geste. Le point visé reste dans le rectangle de l'île.
//
// En combat, l'azimut est la diagonale la plus proche (45°, 135°, 225° ou 315°) : les cases restent
// des losanges 2:1 ; le passage vers le combat y glisse, et le retour revient à l'azimut du joueur.
//
// Elle présente à CameraControls (js/camera.js) l'interface de Camera : zoomAt, panBy, pinchTo,
// fit, setInsets, setViewport, clientToWorld, clientToScreen, rect, focusRect, update, flush,
// state, on, et les champs zoom, fitZoom, atFit, anim, vw, vh, insets, userUntil. Le zoom vaut le
// champ par défaut divisé par le champ courant ; en exploration, fitZoom est nul, si bien qu'un
// doigt déplace la vue. « veylan:camera » n'est émis que pour les gestes, le zoom, les sauts et le
// recentrage, au plus une fois par image, jamais pour le ressort du suivi.
//
// En combat (5.6), une seconde caméra, orthographique, à 30° d'élévation (60° en vue tactique) :
// les cases deviennent des losanges 2:1 exacts, comme à Orsane. Elle cadre l'aire du combat dans la
// part de la scène que l'interface laisse libre ; le zoom reste entre 0,75 et 2,5 fois ce cadrage, et
// un doigt déplace la vue zoomée. Le passage d'une caméra à l'autre (0,6 s) est un travelling
// compensé : la perspective ferme son ouverture de 20° à 2° en reculant pour garder le cadrage,
// pendant que l'élévation rejoint celle du combat ; l'orthographique prend alors le relais, à cadrage
// égal. L'inverse au retour.
//
// Repère de la scène Three.js : X = u, Y = h, Z = v. Three.js est chargé avant sa construction.
class CameraIle {
  constructor(opts) {
    const THREE = window.THREE;
    opts = opts || {};
    this.el = opts.el || null;            // #board : la surface des gestes, pour les coordonnées client
    const cdef = (opts.def && opts.def.camera) || {};
    this.taille = (opts.def && opts.def.taille) || [240, 180];
    this.terrain = opts.terrain || null;
    // Le style Lisière (3.25) remplace le réglage de l'exploration : plus bas, plus ouvert, le
    // regard levé de `leve` u au-dessus du point visé, pour voir l'horizon et le ciel.
    const ex = Object.assign({}, cdef.exploration || {}, opts.style || {});
    this.ouverture = ex.ouverture || 20;
    this.elevations = ex.elevation || [35, 45];
    this.leve = ex.leve || 0;
    this.champs = cdef.champ || [18, 60];
    const telephone = CameraIle.telephone();
    this.champDefaut = ((opts.style && opts.style.champDefaut) || cdef.champDefaut || [26, 32])[telephone ? 0 : 1];
    this.azimut = (cdef.azimut != null ? cdef.azimut : 45) * Math.PI / 180;
    this.azimutDefaut = this.azimut;
    this.azimutCombat = this.azimut;          // en combat : la diagonale la plus proche (3.3)
    this.animAz = null;                       // l'azimut rejoint en douceur (recentrage, touches)
    this.vitCible = { x: 0, y: 0 };           // la vitesse du point visé (le ressort du suivi)
    this.vitJoueur = { x: 0, y: 0 };          // la vitesse du Veilleur, lissée : l'avance du regard
    this.joueurPrec = null;
    this.cam = new THREE.PerspectiveCamera(this.ouverture, 1, 1, 900);
    this.champ = this.champDefaut;
    this.cible = { x: 0, y: 0, h: 0 };        // le point visé (u, v) et sa hauteur
    this.decalage = { x: 0, y: 0 };           // le glissement du joueur, autour du Veilleur
    this.joueur = { x: 0, y: 0, h: 0 };
    this.vw = 0; this.vh = 0;
    this.insets = { top: 0, right: 0, bottom: 0, left: 0 };
    this.fitZoom = 0;
    this.atFit = true;
    this.anim = null;                          // { zoom, champ, ancre: { x, y }, sx, sy } : zoom doux
    this.userUntil = 0;
    this.revient = false;                      // le glissement revient vers le Veilleur
    this.dirty = false;
    this.queued = false;
    this.muette = false;
    this.listeners = new Set();
    this.lastStep = 0;
    this.focusMarche = false;
    this._v = new THREE.Vector3();
    this._r = new THREE.Raycaster();
    this._ndc = new THREE.Vector2();
    // Le combat : la caméra orthographique, son cadrage, le passage d'une caméra à l'autre.
    const cc = cdef.combat || {};
    this.elevationCombat = (cc.elevation || 30) * Math.PI / 180;
    this.elevationTactique = (cc.tactique || 60) * Math.PI / 180;
    this.ortho = new THREE.OrthographicCamera(-1, 1, 1, -1, 1, 1000);
    this.ortho.userData.s = 0.05;
    this.mode = 'exploration';      // 'exploration' | 'combat'
    this.aire = null;               // l'aire du combat : { x0, y0, w, h, hMin, hMax, hMoy }
    this.tactique = false;          // la vue tactique : 60° d'élévation
    this.cadre = null;              // le cadrage de l'aire (cadrerCombat)
    this.vue = null;                // la vue du combat : { s (u par pixel), px, py (le point de la vue au milieu de la part libre) }
    this.trans = null;              // le passage en cours : { sens: 'aller' | 'retour', t0, duree, de }
    this.avantCombat = null;        // le champ de l'exploration, rendu au retour
    this.dernierEtat = null;        // le dernier état de la perspective pendant un passage
    this.suiviCombat = null;        // l'acteur du tour : { focus, u, h, v }
    this.dernierFocus = null;
    this.fondu = 0;                 // 0 : exploration, 1 : combat (la grille et l'assombrissement suivent le passage)
    this.distCourante = 0;          // la distance de la caméra au point visé (la brume s'y règle)
    this.coin = null;               // la barre de tour du téléphone, dans le coin bas droit : { w, h }
    this.vise = { x: 0, y: 0, h: 0 }; // le point du monde au milieu de la part libre, quel que soit le mode
    this.placer();
  }

  // La caméra qui dessine : l'orthographique en combat (passage fini), sinon la perspective.
  get courante() { return this.mode === 'combat' && !this.trans ? this.ortho : this.cam; }
  get enCombat() { return this.mode === 'combat'; }

  static telephone() {
    let coarse = false;
    try { coarse = matchMedia('(pointer: coarse)').matches; } catch (e) { /* pas de matchMedia */ }
    return coarse || (typeof innerWidth === 'number' && Math.min(innerWidth, innerHeight) <= 500);
  }

  // ----- Le cadre -----

  // Exploration : le champ par défaut sur le champ courant. Combat : les pixels par u.
  get zoom() { return this.mode === 'combat' && this.vue ? 1 / this.vue.s : this.champDefaut / this.champ; }
  // L'élévation suit le champ : 35° au plus près, 45° au plus loin.
  elevation(champ) {
    const c = champ == null ? this.champ : champ;
    const [a, b] = this.champs, [e0, e1] = this.elevations;
    const t = Math.max(0, Math.min(1, (c - a) / (b - a)));
    return (e0 + (e1 - e0) * t) * Math.PI / 180;
  }
  bornerChamp(c) { return Math.max(this.champs[0], Math.min(this.champs[1], c)); }

  // La distance de la caméra au point visé pour que la largeur de sol vue à cet endroit vaille le
  // champ (largeur de la vue entière).
  distance(champ) {
    // En combat et pendant un passage : la distance réelle de la caméra au point visé.
    if (champ == null && (this.mode === 'combat' || this.trans) && this.distCourante) return this.distCourante;
    const aspect = this.vw && this.vh ? this.vw / this.vh : 1.6;
    const t = Math.tan(this.ouverture * Math.PI / 360) * aspect;
    return (champ == null ? this.champ : champ) / (2 * t);
  }

  focusRect() {
    const i = this.insets;
    const w = Math.max(1, this.vw - i.left - i.right), h = Math.max(1, this.vh - i.top - i.bottom);
    return { x: i.left, y: i.top, w, h, cx: i.left + w / 2, cy: i.top + h / 2 };
  }

  // L'état de la perspective d'exploration : point visé, élévation, largeur vue au point visé,
  // ouverture. Un passage vers le combat ou depuis lui interpole entre deux de ces états.
  etatExploration() { return { x: this.cible.x, y: this.cible.y, h: this.cible.h, el: this.elevation(), largeur: this.champ, fov: this.ouverture, leve: this.leve, az: this.azimut }; }

  // Place la caméra perspective d'après un état (par défaut celui de l'exploration) : le point
  // visé tombe au milieu de la part de la scène que l'interface laisse libre.
  placer(etat) {
    const e = etat || this.etatExploration();
    const cam = this.cam, az = e.az != null ? e.az : this.azimut;
    const aspect = this.vw && this.vh ? this.vw / this.vh : 1.6;
    const d = e.largeur / (2 * Math.tan(e.fov * Math.PI / 360) * aspect);
    const hv = e.h + (e.leve || 0);
    cam.fov = e.fov;
    cam.position.set(e.x + Math.cos(e.el) * Math.sin(az) * d, hv + Math.sin(e.el) * d, e.y + Math.cos(e.el) * Math.cos(az) * d);
    // Jamais à moins de 3 u au-dessus du terrain (3.3) : sans effet aux reliefs d'Ervane, mais la
    // règle tient si un jour une falaise se dresse entre le point visé et la caméra.
    const T = this.terrain;
    if (T && typeof T.marcheA === 'function') {
      let h = T.marcheA(cam.position.x, cam.position.z);
      if (!Number.isFinite(h) && typeof T.solBrutA === 'function') h = T.solBrutA(cam.position.x, cam.position.z);
      if (Number.isFinite(h) && cam.position.y < h + 3) cam.position.y = h + 3;
    }
    cam.up.set(0, 1, 0);
    cam.lookAt(e.x, hv, e.y);
    cam.near = Math.max(1, d * 0.25);
    cam.far = d * 6 + 200;
    cam.aspect = aspect;
    if (this.vw && this.vh) {
      const f = this.focusRect();
      const dx = f.cx - this.vw / 2, dy = f.cy - this.vh / 2;
      if (Math.abs(dx) > 0.5 || Math.abs(dy) > 0.5) cam.setViewOffset(this.vw, this.vh, -dx, -dy, this.vw, this.vh);
      else cam.clearViewOffset();
    }
    cam.updateProjectionMatrix();
    cam.updateMatrixWorld(true);
    this.distCourante = d;
    this.vise.x = e.x; this.vise.y = e.y; this.vise.h = e.h;
  }

  // ----- Conversions -----

  rect() { return this.el ? this.el.getBoundingClientRect() : { left: 0, top: 0, width: this.vw, height: this.vh }; }
  clientToScreen(cx, cy) { const r = this.rect(); return { x: cx - r.left, y: cy - r.top }; }

  // Le rayon de la caméra sous un point de l'écran (coordonnées de la toile).
  rayon(sx, sy) {
    this._ndc.set(sx / Math.max(1, this.vw) * 2 - 1, -(sy / Math.max(1, this.vh) * 2 - 1));
    this._r.setFromCamera(this._ndc, this.courante);
    return this._r.ray;
  }

  // Le point où le rayon coupe le plan horizontal à hauteur `h` (par défaut celle du point visé) :
  // ce que CameraControls garde sous les doigts au pincement et à la molette (3.3).
  ecranVersPlan(sx, sy, h) {
    const ray = this.rayon(sx, sy), y = h == null ? (this.mode === 'combat' && this.cadre ? this.cadre.h : this.cible.h) : h;
    const dy = ray.direction.y;
    if (Math.abs(dy) < 1e-6) return { x: this.cible.x, y: this.cible.y };
    const t = (y - ray.origin.y) / dy;
    return { x: ray.origin.x + ray.direction.x * t, y: ray.origin.z + ray.direction.z * t };
  }
  clientToWorld(cx, cy) { const s = this.clientToScreen(cx, cy); return this.ecranVersPlan(s.x, s.y); }

  // Un point de la scène (u, h, v) à l'écran, en coordonnées de la toile ; z : profondeur (NDC).
  versEcran(u, h, v) {
    const p = this._v.set(u, h, v).project(this.courante);
    return { x: (p.x + 1) / 2 * this.vw, y: (1 - p.y) / 2 * this.vh, z: p.z, devant: p.z < 1 && p.z > -1 };
  }
  worldToClient(u, h, v) {
    const r = this.rect(), p = this.versEcran(u, h, v);
    return { x: r.left + p.x, y: r.top + p.y };
  }

  // Les pixels d'écran par unité du monde, au point (u, h, v) : ce qu'une figure ou une bulle doit
  // savoir pour se mettre à l'échelle de la perspective.
  pixelsParU(u, h, v) {
    if (this.courante === this.ortho) return 1 / this.ortho.userData.s;
    const cam = this.cam;
    const dx = u - cam.position.x, dy = h - cam.position.y, dz = v - cam.position.z;
    const fwd = this._v.set(0, 0, -1).applyQuaternion(cam.quaternion);
    const prof = Math.max(0.5, dx * fwd.x + dy * fwd.y + dz * fwd.z);
    return this.vh / (2 * Math.tan(cam.fov * Math.PI / 360) * prof);
  }

  // Le trapèze du sol vu (au niveau du point visé), agrandi de `marge` u : la réapparition des
  // groupes attend qu'il n'y soit pas (4.5).
  dansChamp(x, y, marge) {
    if (!this.vw || !this.vh) return false;
    const m = marge || 0;
    const pts = [[0, 0], [this.vw, 0], [this.vw, this.vh], [0, this.vh]].map(([sx, sy]) => this.ecranVersPlan(sx, sy));
    // Un coin du haut peut tomber au-delà de l'horizon : le trapèze est borné à 200 u.
    const c = this.cible;
    for (const p of pts) { const dx = p.x - c.x, dy = p.y - c.y, d = Math.sqrt(dx * dx + dy * dy); if (!(d < 200)) { p.x = c.x + dx / (d || 1) * 200; p.y = c.y + dy / (d || 1) * 200; } }
    if (IleTerrain.dansPoly(pts.map(p => [p.x, p.y]), x, y)) return true;
    if (!m) return false;
    for (let i = 0; i < 4; i++) {
      const a = pts[i], b = pts[(i + 1) % 4];
      const sx = b.x - a.x, sy = b.y - a.y, l2 = sx * sx + sy * sy;
      let t = l2 ? ((x - a.x) * sx + (y - a.y) * sy) / l2 : 0;
      t = Math.max(0, Math.min(1, t));
      const px = a.x + sx * t - x, py = a.y + sy * t - y;
      if (px * px + py * py <= m * m) return true;
    }
    return false;
  }

  // ----- Gestes -----

  user() { this.userUntil = performance.now() + 4000; this.revient = false; }

  // Le point visé bouge de (dx, dy) u : le glissement autour du Veilleur, borné à 15 u.
  deplacer(dx, dy) {
    const d = this.decalage;
    let nx = d.x + dx, ny = d.y + dy;
    const n = Math.sqrt(nx * nx + ny * ny);
    if (n > 15) { nx *= 15 / n; ny *= 15 / n; }
    this.cible.x += nx - d.x; this.cible.y += ny - d.y;
    d.x = nx; d.y = ny;
    this.borner();
  }

  // Le point visé reste dans le rectangle de l'île.
  borner() {
    const c = this.cible, [L, H] = this.taille;
    const x = Math.max(0, Math.min(L, c.x)), y = Math.max(0, Math.min(H, c.y));
    if (x !== c.x || y !== c.y) { this.decalage.x += x - c.x; this.decalage.y += y - c.y; c.x = x; c.y = y; }
  }

  // Un champ et un point (x, y) du plan du point visé, qui doit tomber en (sx, sy) à l'écran.
  placerAvec(champ, ancre, sx, sy) {
    this.champ = this.bornerChamp(champ);
    this.placer();
    const q = this.ecranVersPlan(sx, sy);
    this.deplacer(ancre.x - q.x, ancre.y - q.y);
    this.placer();
  }

  // Zoom d'un facteur autour d'un point de l'écran (coordonnées client) : le point du plan sous ce
  // point y reste. `opts.smooth` : glissement doux (molette, clavier).
  zoomAt(clientX, clientY, factor, opts) {
    if (!(factor > 0) || factor === 1 || !this.vw || this.trans) return;
    const s = this.clientToScreen(clientX, clientY);
    const smooth = !!(opts && opts.smooth) && !CameraIle.calme();
    if (this.mode === 'combat') {
      if (!this.vue) return;
      const base = smooth && this.anim && !this.anim.fit ? this.anim.s : this.vue.s;
      const cible = this.bornerEchelle(base / factor);
      const ancre = this.vueSous(s.x, s.y);
      this.atFit = false;
      this.user();
      if (smooth) this.anim = { s: cible, zoom: 1 / cible, ancre, sx: s.x, sy: s.y };
      else { this.anim = null; this.zoomerVue(cible, ancre, s.x, s.y); }
      this.changed();
      return;
    }
    const base = smooth && this.anim ? this.anim.champ : this.champ;
    const champ = this.bornerChamp(base / factor);
    const ancre = this.ecranVersPlan(s.x, s.y);
    this.atFit = false;
    this.user();
    if (smooth) this.anim = { champ, zoom: this.champDefaut / champ, ancre, sx: s.x, sy: s.y };
    else { this.anim = null; this.placerAvec(champ, ancre, s.x, s.y); }
    this.changed();
  }

  // Déplace la vue de (dx, dy) pixels : le sol suit le doigt.
  panBy(dx, dy) {
    if ((!dx && !dy) || this.trans) return;
    this.anim = null;
    this.atFit = false;
    this.user();
    if (this.mode === 'combat') {
      if (!this.vue) return;
      this.vue.px -= dx * this.vue.s;
      this.vue.py += dy * this.vue.s;
      this.bornerVue();
      this.placerOrtho();
      this.changed();
      return;
    }
    const r = this.focusRect();
    const a = this.ecranVersPlan(r.cx, r.cy), b = this.ecranVersPlan(r.cx + dx, r.cy + dy);
    this.deplacer(a.x - b.x, a.y - b.y);
    this.placer();
    this.changed();
  }

  // Pincement : le zoom `z`, et le point (wx, wy) du plan sous les doigts en (sx, sy).
  pinchTo(z, wx, wy, sx, sy) {
    if (this.trans) return;
    this.anim = null;
    this.atFit = false;
    this.user();
    if (this.mode === 'combat') {
      if (!this.vue) return;
      this.zoomerVue(1 / Math.max(1e-6, z), this.versVue(wx, this.cadre.h, wy), sx, sy);
      this.changed();
      return;
    }
    this.placerAvec(this.champDefaut / Math.max(1e-3, z), { x: wx, y: wy }, sx, sy);
    this.changed();
  }

  // ----- La rotation (3.3) -----

  // Un écart d'angle ramené dans ]-π, π].
  static arc(d) { return Math.atan2(Math.sin(d), Math.cos(d)); }
  // Un ressort à amortissement critique de pulsation `w`, avancé de `dt` : la position `x` et la
  // vitesse `v` vers `cible`, par la solution exacte (x(t) = (d + (v + w d) t) e^(-w t)).
  static ressort(x, v, cible, w, dt) {
    const d = x - cible, e = Math.exp(-w * dt), t = (v + w * d) * dt;
    return { x: cible + (d + t) * e, v: (v - t * w) * e };
  }
  // La diagonale (45° + k × 90°) la plus proche d'un azimut : celle du combat, où les cases restent
  // des losanges 2:1.
  static diagonale(az) { return CameraIle.arc(Math.round((az - Math.PI / 4) / (Math.PI / 2)) * (Math.PI / 2) + Math.PI / 4); }

  // Tourne la vue de `da` radians autour du point visé (en exploration seulement : en combat, les
  // cases gardent leur losange) ; `tournerA(az)` pose l'azimut, `tournerVers(az)` le rejoint en
  // douceur (0,15 s de constante de temps). Positif : le monde tourne dans le sens des aiguilles
  // d'une montre à l'écran.
  tourner(da) { if (da) this.tournerA(this.azimut + da); }
  tournerA(az) {
    if (this.mode === 'combat' || this.trans || !Number.isFinite(az)) return;
    this.animAz = null;
    const a = CameraIle.arc(az);
    if (a === this.azimut) return;
    this.azimut = a;
    this.placer();
    this.changed();
  }
  tournerVers(az) {
    if (this.mode === 'combat' || this.trans || !Number.isFinite(az)) return;
    if (CameraIle.calme()) { this.tournerA(az); return; }
    this.animAz = CameraIle.arc(az);
  }

  // Recentrer (bouton, touche 0) : le Veilleur au milieu, au champ et à l'azimut par défaut ; en
  // combat, l'aire entière cadrée.
  fit(animate) {
    if (this.trans) return;
    this.userUntil = 0;
    if (this.mode === 'combat') {
      const c = this.cadre;
      if (!c) return;
      this.atFit = true;
      if (animate && !CameraIle.calme()) this.anim = { fit: true, s: c.sFit, zoom: 1 / c.sFit, px: c.vcx, py: c.vcy };
      else { this.anim = null; this.vue = { s: c.sFit, px: c.vcx, py: c.vcy }; this.placerOrtho(); }
      this.changed();
      return;
    }
    this.revient = true;
    if (animate && !CameraIle.calme()) {
      this.anim = { champ: this.champDefaut, zoom: 1, recentre: true };
      this.animAz = this.azimut === this.azimutDefaut ? null : this.azimutDefaut;
    } else {
      this.anim = null; this.animAz = null;
      this.champ = this.champDefaut;
      this.azimut = this.azimutDefaut;
      this.decalage.x = 0; this.decalage.y = 0;
      this.cible.x = this.joueur.x; this.cible.y = this.joueur.y;
      this.vitCible.x = 0; this.vitCible.y = 0;
      this.placer();
    }
    this.changed();
  }

  // Un saut (relais, voyage sur le même plateau, défaite) : la vue est tout de suite sur le
  // Veilleur, en exploration.
  sauter(x, y, h) {
    if (x != null) { this.joueur.x = x; this.joueur.y = y; this.joueur.h = h || 0; }
    if (this.mode === 'combat' || this.trans) {
      this.mode = 'exploration';
      this.trans = null;
      this.champ = this.bornerChamp((this.avantCombat && this.avantCombat.champ) || this.champ);
      this.quitterCombat();
    }
    this.anim = null;
    this.decalage.x = 0; this.decalage.y = 0;
    this.cible.x = this.joueur.x; this.cible.y = this.joueur.y; this.cible.h = this.joueur.h;
    this.vitCible.x = 0; this.vitCible.y = 0; this.vitJoueur.x = 0; this.vitJoueur.y = 0; this.joueurPrec = null;
    this.userUntil = 0;
    this.borner();
    this.placer();
    this.changed();
  }

  setViewport(w, h) {
    if (!(w > 0 && h > 0)) return;
    if (w === this.vw && h === this.vh) return;
    this.vw = w; this.vh = h;
    this.placer(this.trans ? this.dernierEtat : null);
    if (this.mode === 'combat') this.recadrer();
    this.changed();
  }

  setInsets(ins) {
    ins = ins || {};
    const n = { top: Math.max(0, ins.top || 0), right: Math.max(0, ins.right || 0), bottom: Math.max(0, ins.bottom || 0), left: Math.max(0, ins.left || 0) };
    const o = this.insets;
    if (n.top === o.top && n.right === o.right && n.bottom === o.bottom && n.left === o.left) return;
    this.insets = n;
    this.placer(this.trans ? this.dernierEtat : null);
    if (this.mode === 'combat') this.recadrer();
    this.changed();
  }

  // ----- Le combat (5.6) -----

  // Entre en combat sur l'aire `aire` ({ x0, y0, w, h, hMin, hMax, hMoy } : le carré, les hauteurs
  // extrêmes et moyenne de son sol). Le passage de 0,6 s commence, sauf `immediat` ou mouvement
  // réduit. Rien ne bouge pendant le passage (gestes ignorés).
  entrerCombat(aire, immediat) {
    const premier = this.mode !== 'combat';
    if (premier) { this.avantCombat = { champ: this.champ }; this.azimutCombat = CameraIle.diagonale(this.azimut); this.animAz = null; }
    const de = this.trans && this.dernierEtat ? this.dernierEtat : (premier ? this.etatExploration() : null);
    this.mode = 'combat';
    this.aire = aire;
    this.anim = null; this.userUntil = 0; this.revient = false;
    this.dernierFocus = null;
    this.cadre = this.cadrerCombat();
    this.vue = this.cadre ? { s: this.cadre.sFit, px: this.cadre.vcx, py: this.cadre.vcy } : null;
    this.fitZoom = this.cadre ? 1 / this.cadre.sFit : 0;
    this.atFit = true;
    this.trans = de && this.cadre && !immediat && !CameraIle.calme() ? { sens: 'aller', t0: null, duree: 600, de } : null;
    if (!this.trans) { this.fondu = 1; this.placerOrtho(); }
    this.changed();
  }

  // Revient à l'exploration, sur le Veilleur, au champ d'avant le combat : le passage inverse.
  sortirCombat(immediat) {
    if (this.mode !== 'combat') return;
    const de = this.trans && this.dernierEtat ? this.dernierEtat : (this.cadre && this.vue ? this.etatOrtho() : null);
    this.mode = 'exploration';
    this.champ = this.bornerChamp((this.avantCombat && this.avantCombat.champ) || this.champ);
    this.anim = null; this.userUntil = 0; this.revient = false;
    this.decalage.x = 0; this.decalage.y = 0;
    this.trans = de && !immediat && !CameraIle.calme() && this.vw ? { sens: 'retour', t0: null, duree: 600, de } : null;
    if (!this.trans) this.finirRetour();
    this.changed();
  }

  finirRetour() {
    this.quitterCombat();
    this.cible.x = this.joueur.x; this.cible.y = this.joueur.y; this.cible.h = this.joueur.h;
    this.vitCible.x = 0; this.vitCible.y = 0;
    this.decalage.x = 0; this.decalage.y = 0;
    this.atFit = true;
    this.borner();
    this.placer();
  }

  quitterCombat() {
    this.cadre = null; this.vue = null; this.aire = null; this.avantCombat = null;
    this.suiviCombat = null; this.dernierFocus = null;
    this.fitZoom = 0; this.fondu = 0;
  }

  // La vue tactique (60°) : le même point reste au milieu, au même zoom rapporté au cadrage.
  setTactique(oui) {
    oui = !!oui;
    if (oui === this.tactique) return;
    this.tactique = oui;
    if (this.mode === 'combat') { this.recadrer(); this.changed(); }
  }

  // Le cadrage de l'aire : la caméra orthographique regarde le centre de l'aire depuis l'azimut du
  // combat (la diagonale la plus proche de celui de l'exploration), à l'élévation du combat ; l'échelle fait tenir les quatre coins du carré (et la
  // tête d'une figure posée sur chacun) dans la part libre de la scène, avec la marge de
  // l'ajustement des cartes à cases (3 % du petit côté).
  cadrerCombat() {
    const a = this.aire;
    if (!a || !this.vw || !this.vh) return null;
    const el = this.tactique ? this.elevationTactique : this.elevationCombat, az = this.azimutCombat;
    const dir = [Math.cos(el) * Math.sin(az), Math.sin(el), Math.cos(el) * Math.cos(az)];
    // Les axes de la vue : la droite (horizontale) et le haut, comme les pose lookAt.
    const right = [Math.cos(az), 0, -Math.sin(az)];
    const up = [-Math.sin(el) * Math.sin(az), Math.cos(el), -Math.sin(el) * Math.cos(az)];
    const cx = a.x0 + a.w / 2, cy = a.y0 + a.h / 2, ch = a.hMoy;
    let x0 = Infinity, x1 = -Infinity, y0 = Infinity, y1 = -Infinity;
    for (const [u, v] of [[a.x0, a.y0], [a.x0 + a.w, a.y0], [a.x0, a.y0 + a.h], [a.x0 + a.w, a.y0 + a.h]]) {
      for (const h of [a.hMin, a.hMax + 1.9]) {
        const dx = u - cx, dy = h - ch, dz = v - cy;
        const vx = dx * right[0] + dy * right[1] + dz * right[2], vy = dx * up[0] + dy * up[1] + dz * up[2];
        if (vx < x0) x0 = vx; if (vx > x1) x1 = vx; if (vy < y0) y0 = vy; if (vy > y1) y1 = vy;
      }
    }
    const f = this.focusRect(), m = Math.min(this.vw, this.vh) * 0.03;
    let sFit = Math.max((x1 - x0) / Math.max(40, f.w - 2 * m), (y1 - y0) / Math.max(40, f.h - 2 * m));
    // Au téléphone, quand c'est la hauteur qui borne le cadrage (l'aire tient dans la largeur), un
    // cran plus serré : les coins haut et bas du losange (les cases (0, 0) et (14, 14)) sortent un
    // peu, les combattants gagnent 8 % (revue finale). Le doigt recule la vue s'il y tient.
    if (CameraIle.telephone() && (y1 - y0) / Math.max(40, f.h - 2 * m) > (x1 - x0) / Math.max(40, f.w - 2 * m)) sFit *= 0.92;
    let vcx = (x0 + x1) / 2, vcy = (y0 + y1) / 2;
    // La barre de tour du téléphone couvre le coin bas droit : le losange de l'aire glisse vers le
    // haut et la gauche pour que son bord bas droit (la colonne x = 14) passe au-dessus d'elle ; s'il
    // n'y a pas la place, il rapetisse un peu (jusqu'à 80 %).
    if (this.coin && a.coins) {
      const proj = (p, s, cxv, cyv) => { const dx = p[0] - cx, dy = p[2] - ch, dz = p[1] - cy; const vx = dx * right[0] + dy * right[1] + dz * right[2], vy = dx * up[0] + dy * up[1] + dz * up[2]; return [f.cx + (vx - cxv) / s, f.cy - (vy - cyv) / s]; };
      const P = [this.vw - this.coin.w - 6, this.vh - this.coin.h - 6];
      let meilleur = null;
      for (let k = 1; k >= 0.799; k -= 0.02) {
        const s = sFit / k;
        const R = proj(a.coins[1], s, vcx, vcy), B = proj(a.coins[3], s, vcx, vcy);
        let nx = B[1] - R[1], ny = -(B[0] - R[0]);
        const nl = Math.hypot(nx, ny) || 1; nx /= nl; ny /= nl;
        if (nx + ny < 0) { nx = -nx; ny = -ny; }
        const d = (P[0] - R[0]) * nx + (P[1] - R[1]) * ny;
        const dx = d < 0 ? nx * d : 0, dy = d < 0 ? ny * d : 0;
        const haut = f.cy - (y1 - vcy) / s + dy, gauche = f.cx + (x0 - vcx) / s + dx;
        const ok = haut >= f.y + m - 0.5 && gauche >= f.x + m - 0.5;
        meilleur = { s, vcx: vcx - dx * s, vcy: vcy + dy * s };
        if (ok) break;
      }
      if (meilleur) { sFit = meilleur.s; vcx = meilleur.vcx; vcy = meilleur.vcy; }
    }
    return { cx, cy, h: ch, el, dir, right, up, D: 120, x0, x1, y0, y1, vcx, vcy, sFit };
  }

  // La barre de tour du téléphone (le coin bas droit de la scène qu'elle couvre, en pixels), ou
  // null : le cadrage du combat l'évite.
  setCoin(coin) {
    const n = coin && coin.w > 0 && coin.h > 0 ? { w: Math.round(coin.w), h: Math.round(coin.h) } : null;
    const o = this.coin;
    if ((!n && !o) || (n && o && n.w === o.w && n.h === o.h)) return;
    this.coin = n;
    if (this.mode === 'combat') { this.recadrer(); this.changed(); }
  }

  // Le cadrage refait (taille, marges, vue tactique) : ajusté s'il l'était ; sinon le même point du
  // monde au milieu, au même zoom rapporté au cadrage.
  recadrer() {
    if (this.mode !== 'combat' || !this.aire) return;
    const ancien = this.cadre, v = this.vue;
    const k = ancien && v ? ancien.sFit / v.s : 1;
    const centre = ancien && v ? this.depuisVue(v.px, v.py) : null;
    this.cadre = this.cadrerCombat();
    if (!this.cadre) return;
    const c = this.cadre;
    this.fitZoom = 1 / c.sFit;
    if (this.atFit || !centre) this.vue = { s: c.sFit, px: c.vcx, py: c.vcy };
    else { const q = this.versVue(centre.u, centre.h, centre.v); this.vue = { s: c.sFit / k, px: q.x, py: q.y }; this.bornerVue(); }
    if (this.anim && this.anim.fit) this.anim = { fit: true, s: c.sFit, zoom: 1 / c.sFit, px: c.vcx, py: c.vcy };
    else this.anim = null;
    if (!this.trans) this.placerOrtho();
  }

  // Un point du monde dans le repère de la vue du combat (relatif au centre de l'aire), et l'inverse
  // (sur le plan qui passe par le centre, perpendiculaire à la vue).
  versVue(u, h, v) {
    const c = this.cadre, dx = u - c.cx, dy = h - c.h, dz = v - c.cy;
    return { x: dx * c.right[0] + dy * c.right[1] + dz * c.right[2], y: dx * c.up[0] + dy * c.up[1] + dz * c.up[2] };
  }
  depuisVue(x, y) {
    const c = this.cadre;
    return { u: c.cx + c.right[0] * x + c.up[0] * y, h: c.h + c.right[1] * x + c.up[1] * y, v: c.cy + c.right[2] * x + c.up[2] * y };
  }
  // Le point de la vue sous un point de l'écran (coordonnées de la toile).
  vueSous(sx, sy) {
    const v = this.vue, f = this.focusRect();
    return { x: v.px + (sx - f.cx) * v.s, y: v.py - (sy - f.cy) * v.s };
  }

  bornerEchelle(s) { const c = this.cadre; return Math.max(c.sFit / 2.5, Math.min(c.sFit / 0.75, s)); }
  // Le zoom entre 0,75 et 2,5 fois le cadrage ; le milieu de la vue au-dessus de l'aire.
  bornerVue() {
    const c = this.cadre, v = this.vue;
    if (!c || !v) return;
    v.s = this.bornerEchelle(v.s);
    v.px = Math.max(c.x0, Math.min(c.x1, v.px));
    v.py = Math.max(c.y0, Math.min(c.y1, v.py));
  }
  // L'échelle `s`, et le point `q` de la vue qui doit tomber en (sx, sy).
  zoomerVue(s, q, sx, sy) {
    const v = this.vue, f = this.focusRect();
    v.s = this.bornerEchelle(s);
    v.px = q.x - (sx - f.cx) * v.s;
    v.py = q.y + (sy - f.cy) * v.s;
    this.bornerVue();
    this.placerOrtho();
  }

  // La caméra orthographique d'après le cadrage et la vue.
  placerOrtho() {
    const c = this.cadre, v = this.vue, o = this.ortho;
    if (!c || !v || !this.vw || !this.vh) return;
    const f = this.focusRect();
    o.left = v.px - f.cx * v.s; o.right = o.left + this.vw * v.s;
    o.top = v.py + f.cy * v.s; o.bottom = o.top - this.vh * v.s;
    o.position.set(c.cx + c.dir[0] * c.D, c.h + c.dir[1] * c.D, c.cy + c.dir[2] * c.D);
    o.up.set(0, 1, 0);
    o.lookAt(c.cx, c.h, c.cy);
    o.near = 1; o.far = c.D + 260;
    o.userData.s = v.s;
    o.updateProjectionMatrix();
    o.updateMatrixWorld(true);
    this.distCourante = c.D;
    const p = this.depuisVue(v.px, v.py);
    this.vise.x = p.u; this.vise.y = p.v; this.vise.h = p.h;
  }

  // La perspective qui montre exactement ce que montre l'orthographique : même point au milieu,
  // même largeur, ouverture de 2°.
  etatOrtho() {
    const v = this.vue, p = this.depuisVue(v.px, v.py);
    return { x: p.u, y: p.v, h: p.h, el: this.cadre.el, largeur: this.vw * v.s, fov: 2, leve: 0, az: this.azimutCombat };
  }
  // Le retour : le Veilleur au milieu, au champ d'avant le combat.
  etatRetour() {
    return { x: this.joueur.x, y: this.joueur.y, h: this.joueur.h, el: this.elevation(), largeur: this.champ, fov: this.ouverture, leve: this.leve, az: this.azimut };
  }

  // L'acteur du tour, suivi quand la vue est zoomée (comme la caméra des cases) : `focus` change à
  // chaque tour, et rend la main au suivi après un geste.
  suivreCombat(focus, u, h, v) { this.suiviCombat = u == null ? null : { focus, u, h, v }; }

  // ----- Chaque image -----

  // Le Veilleur (x, y, hauteur de marche) et s'il marche : le ressort du suivi, le zoom doux, le
  // retour du glissement ; en combat, le zoom doux et le suivi de l'acteur ; pendant un passage,
  // le travelling. Rend vrai si la vue a bougé.
  update(now, joueur, marche) {
    const dt = this.lastStep ? Math.min(0.1, Math.max(0, (now - this.lastStep) / 1000)) : 0.016;
    this.lastStep = now;
    if (joueur) {
      // La vitesse du Veilleur, lissée (0,15 s) ; un saut de 20 u/s ou plus n'est pas une marche.
      const jp = this.joueurPrec, jv = this.vitJoueur;
      if (jp && dt > 0) {
        const vx = (joueur.x - jp.x) / dt, vy = (joueur.y - jp.y) / dt, k = 1 - Math.exp(-dt / 0.15);
        if (Math.hypot(vx, vy) < 20) { jv.x += (vx - jv.x) * k; jv.y += (vy - jv.y) * k; } else { jv.x = 0; jv.y = 0; }
      }
      this.joueurPrec = { x: joueur.x, y: joueur.y };
      this.joueur.x = joueur.x; this.joueur.y = joueur.y; this.joueur.h = joueur.h;
    }
    if (this.trans) return this.majPassage(now);
    if (this.mode === 'combat') return this.majCombat(dt, now);
    const avant = { x: this.cible.x, y: this.cible.y, h: this.cible.h, c: this.champ, az: this.azimut };
    // Le Veilleur se met en marche : le glissement revient (en une seconde) ; de même après quatre
    // secondes sans geste.
    if (marche && !this.focusMarche) this.revient = true;
    this.focusMarche = !!marche;
    if (this.userUntil && now > this.userUntil) { this.userUntil = 0; this.revient = true; }
    const d = this.decalage;
    if (this.revient && (d.x || d.y)) {
      const k = Math.exp(-dt * 4.5);
      d.x *= k; d.y *= k;
      if (d.x * d.x + d.y * d.y < 0.0004) { d.x = 0; d.y = 0; this.revient = false; }
    }
    // Le zoom doux (molette, clavier, recentrage).
    const a = this.anim;
    if (a) {
      const t = 1 - Math.exp(-dt * 12);
      const champ = Math.exp(Math.log(this.champ) + (Math.log(a.champ) - Math.log(this.champ)) * t);
      if (a.recentre) {
        this.champ = champ;
        d.x *= 1 - t; d.y *= 1 - t;
      } else {
        this.champ = champ;
        this.placer();
        const q = this.ecranVersPlan(a.sx, a.sy);
        this.deplacer(a.ancre.x - q.x, a.ancre.y - q.y);
      }
      if (Math.abs(Math.log(a.champ / champ)) < 0.002) { this.champ = a.champ; if (a.recentre) { d.x = 0; d.y = 0; } this.anim = null; }
      this.changed();
    }
    // L'azimut rejoint en douceur celui qu'on vise (recentrage, touches).
    if (this.animAz != null) {
      const da = CameraIle.arc(this.animAz - this.azimut);
      if (Math.abs(da) < 0.003) { this.azimut = this.animAz; this.animAz = null; } else this.azimut = CameraIle.arc(this.azimut + da * (1 - Math.exp(-dt / 0.15)));
      this.changed();
    }
    // Le ressort du suivi, à amortissement critique (posé en 0,6 s, sans dépasser) : le point visé
    // rejoint le Veilleur, son glissement, et l'avance du regard (0,3 s de sa marche, 2 u au plus).
    const jv = this.vitJoueur, nv = Math.hypot(jv.x, jv.y), av = Math.min(2, nv * 0.3);
    const cx = this.joueur.x + d.x + (nv > 1e-3 ? jv.x / nv * av : 0), cy = this.joueur.y + d.y + (nv > 1e-3 ? jv.y / nv * av : 0);
    // La solution exacte du ressort sur le pas de temps (stable à dix images par seconde, où un pas
    // d'Euler inverserait la vitesse à chaque image).
    const vc = this.vitCible, rx = CameraIle.ressort(this.cible.x, vc.x, cx, 6.5, dt), ry = CameraIle.ressort(this.cible.y, vc.y, cy, 6.5, dt);
    this.cible.x = rx.x; vc.x = rx.v;
    this.cible.y = ry.x; vc.y = ry.v;
    this.cible.h += (this.joueur.h - this.cible.h) * (1 - Math.exp(-dt * 5));
    this.borner();
    this.placer();
    // Au cadre : sans glissement, au champ et à l'azimut par défaut (l'avance du regard n'y change rien).
    const fit = Math.hypot(d.x, d.y) < 0.5 && Math.abs(this.champ / this.champDefaut - 1) < 0.02 && Math.abs(CameraIle.arc(this.azimut - this.azimutDefaut)) < 0.01;
    if (fit !== this.atFit) { this.atFit = fit; this.changed(); }
    return Math.abs(avant.x - this.cible.x) + Math.abs(avant.y - this.cible.y) + Math.abs(avant.h - this.cible.h) > 1e-4 || avant.c !== this.champ || avant.az !== this.azimut;
  }

  // Le passage d'une caméra à l'autre (0,6 s) : le point visé, l'élévation et la largeur vue
  // glissent d'un état à l'autre pendant que l'ouverture se ferme (de 20° à 2°) ou s'ouvre ; la
  // distance suit l'ouverture pour garder la largeur. À la fin de l'aller, l'orthographique prend
  // le relais (elle montre la même chose qu'une perspective de 2° à cadrage égal).
  majPassage(now) {
    const tr = this.trans;
    if (tr.t0 == null) tr.t0 = now;
    const t = Math.min(1, Math.max(0, (now - tr.t0) / tr.duree)), e = t * t * (3 - 2 * t);
    if (tr.sens === 'aller' && (!this.cadre || !this.vue)) { this.trans = null; return false; }
    const A = tr.de, B = tr.sens === 'aller' ? this.etatOrtho() : this.etatRetour();
    const L = (a, b) => a + (b - a) * e, G = (a, b) => Math.exp(Math.log(a) + (Math.log(b) - Math.log(a)) * e);
    const etat = { x: L(A.x, B.x), y: L(A.y, B.y), h: L(A.h, B.h), el: L(A.el, B.el), largeur: G(A.largeur, B.largeur), fov: G(A.fov, B.fov), leve: L(A.leve || 0, B.leve || 0) };
    // L'azimut glisse au plus court vers la diagonale du combat, ou revient à celui du joueur.
    if (A.az != null && B.az != null) etat.az = A.az + CameraIle.arc(B.az - A.az) * e;
    this.dernierEtat = etat;
    this.fondu = tr.sens === 'aller' ? e : 1 - e;
    if (t >= 1) {
      this.trans = null;
      this.dernierEtat = null;
      if (tr.sens === 'aller') { this.fondu = 1; this.placerOrtho(); }
      else this.finirRetour();
    } else this.placer(etat);
    this.changed();
    return true;
  }

  // En combat : le zoom doux (molette, clavier, recentrage) et le suivi de l'acteur du tour quand
  // la vue est zoomée.
  majCombat(dt, now) {
    const v = this.vue, c = this.cadre;
    if (!v || !c) return false;
    const avant = [v.s, v.px, v.py];
    const a = this.anim;
    if (a) {
      const t = 1 - Math.exp(-dt * 12);
      const s = Math.exp(Math.log(v.s) + (Math.log(a.s) - Math.log(v.s)) * t);
      if (a.fit) { v.s = s; v.px += (a.px - v.px) * t; v.py += (a.py - v.py) * t; this.bornerVue(); }
      else this.zoomerVue(s, a.ancre, a.sx, a.sy);
      if (Math.abs(Math.log(a.s / v.s)) < 0.002 && (!a.fit || Math.hypot(a.px - v.px, a.py - v.py) < 0.01)) {
        v.s = a.s;
        if (a.fit) { v.px = a.px; v.py = a.py; }
        this.anim = null;
      }
      this.changed();
    } else {
      const sv = this.suiviCombat;
      if (sv && sv.focus !== this.dernierFocus) { this.dernierFocus = sv.focus; this.userUntil = 0; }
      if (sv && 1 / v.s > this.fitZoom * 1.02 && !(this.userUntil && now < this.userUntil)) {
        const q = this.versVue(sv.u, sv.h, sv.v), f = this.focusRect();
        const sx = f.cx + (q.x - v.px) / v.s, sy = f.cy - (q.y - v.py) / v.s - 30;
        const mx = f.w * 0.2, my = f.h * 0.2;
        let dx = 0, dy = 0;
        if (sx < f.x + mx) dx = f.x + mx - sx; else if (sx > f.x + f.w - mx) dx = f.x + f.w - mx - sx;
        if (sy < f.y + my) dy = f.y + my - sy; else if (sy > f.y + f.h - my) dy = f.y + f.h - my - sy;
        if (Math.abs(dx) >= 0.5 || Math.abs(dy) >= 0.5) {
          const k = CameraIle.calme() ? 1 : 0.12;
          v.px -= dx * k * v.s; v.py += dy * k * v.s;
          this.bornerVue();
          this.changed();
        }
      }
    }
    this.placerOrtho();
    const fit = Math.abs(c.sFit / v.s - 1) < 0.02 && Math.hypot(v.px - c.vcx, v.py - c.vcy) < 0.3;
    if (fit !== this.atFit) { this.atFit = fit; this.changed(); }
    return Math.abs(avant[0] - v.s) + Math.abs(avant[1] - v.px) + Math.abs(avant[2] - v.py) > 1e-7;
  }

  // ----- Événement « veylan:camera » -----

  on(fn) { this.listeners.add(fn); return () => this.listeners.delete(fn); }

  state() { return { zoom: this.zoom, x: this.vise.x, y: this.vise.y, fitZoom: this.fitZoom, atFit: this.atFit, width: this.vw, height: this.vh, champ: this.champ, mode: this.mode, passage: !!this.trans }; }

  changed() {
    this.dirty = true;
    if (!this.queued && typeof requestAnimationFrame === 'function') {
      this.queued = true;
      requestAnimationFrame(() => { this.queued = false; this.flush(); });
    }
  }

  flush() {
    if (!this.dirty) return;
    this.dirty = false;
    if (this.muette) return;
    const d = this.state();
    for (const fn of this.listeners) { try { fn(d); } catch (e) { console.error(e); } }
    try { window.dispatchEvent(new CustomEvent('veylan:camera', { detail: d })); } catch (e) { /* pas de CustomEvent */ }
  }

  static calme() {
    try { return matchMedia('(prefers-reduced-motion: reduce)').matches; } catch (e) { return false; }
  }
}
