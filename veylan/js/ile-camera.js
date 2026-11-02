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
// La carte de l'île (3.30, docs/ANALYSE-MAP-DUALITY.md, 4.2) est un troisième mode : la caméra du jeu
// décolle au-dessus de l'île entière, le nord en haut, et la survole (glisser avec inertie, zoom vers
// le curseur et sous les doigts, rotation) ; à la fermeture, elle redescend en douceur vers la vue du
// jeu. Pendant la carte, la vue du jeu est figée pour le DOM posé sur le monde (worldToClient).
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
    // La carte (3.30) : son état, le retour vers la vue du jeu, la vue du jeu figée, l'élément du jeu.
    this.carte = null;
    this.retourCarte = null;
    this.gel = null;
    this.elJeu = null;
    this.etatAffiche = null;        // le dernier état posé (point visé, distance, élévation, cap, ouverture)
    this._camC = new THREE.PerspectiveCamera(30, 1, 1, 4000);   // une caméra de calcul (cadrage, sol sous un point)
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
  get zoom() {
    if (this.mode === 'carte' && this.carte) return this.carte.D0 / this.carte.cur.dist;
    return this.mode === 'combat' && this.vue ? 1 / this.vue.s : this.champDefaut / this.champ;
  }
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
    if (champ == null && (this.mode === 'combat' || this.mode === 'carte' || this.trans || this.retourCarte) && this.distCourante) return this.distCourante;
    const aspect = this.vw && this.vh ? this.vw / this.vh : 1.6;
    const t = Math.tan(this.ouverture * Math.PI / 360) * aspect;
    return (champ == null ? this.champ : champ) / (2 * t);
  }

  focusRect() {
    // La vue de la carte n'a pas de marges : l'interface du jeu ne la couvre pas.
    const i = this.mode === 'carte' ? { top: 0, right: 0, bottom: 0, left: 0 } : this.insets;
    const w = Math.max(1, this.vw - i.left - i.right), h = Math.max(1, this.vh - i.top - i.bottom);
    return { x: i.left, y: i.top, w, h, cx: i.left + w / 2, cy: i.top + h / 2 };
  }

  // L'état de la perspective d'exploration : point visé, élévation, largeur vue au point visé,
  // ouverture. Un passage vers le combat ou depuis lui interpole entre deux de ces états.
  etatExploration() { return { x: this.cible.x, y: this.cible.y, h: this.cible.h, el: this.elevation(), largeur: this.champ, fov: this.ouverture, leve: this.leve, az: this.azimut }; }

  // Place la caméra perspective d'après un état (par défaut celui de l'exploration) : le point
  // visé tombe au milieu de la part de la scène que l'interface laisse libre.
  placer(etat) {
    const e = etat || (this.mode === 'carte' && this.carte ? this.etatCarte() : this.etatExploration());
    const cam = this.cam, az = e.az != null ? e.az : this.azimut;
    const aspect = this.vw && this.vh ? this.vw / this.vh : 1.6;
    // La carte parle en distance ; le jeu, en largeur de sol vue au point visé.
    const d = e.dist != null ? e.dist : e.largeur / (2 * Math.tan(e.fov * Math.PI / 360) * aspect);
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
    // (Le plan proche reste en deçà du dôme du ciel, 100 u autour de la caméra, quand la carte s'éloigne.)
    cam.near = Math.max(1, Math.min(d * 0.25, 60));
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
    this.etatAffiche = { x: e.x, y: e.y, h: e.h, dist: d, el: e.el, az, fov: e.fov, leve: e.leve || 0 };
  }

  // ----- Conversions -----

  rect() { return this.el ? this.el.getBoundingClientRect() : { left: 0, top: 0, width: this.vw, height: this.vh }; }
  // La vue de la carte peut être sous un `zoom` CSS (le corps d'une fenêtre, réduit au téléphone) :
  // ses pixels de mise en page ne sont pas ceux de la page ; `k` les convertit.
  clientToScreen(cx, cy) { const r = this.rect(), k = this.mode === 'carte' && this.vw && r.width ? r.width / this.vw : 1; return { x: (cx - r.left) / k, y: (cy - r.top) / k }; }

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
  // Pendant la carte, le DOM posé sur le monde (UI.ancrer, la fiche d'un groupe, le guide) garde la
  // vue du jeu figée à l'ouverture : il reste à sa place sur la photo de la scène.
  worldToClient(u, h, v) {
    const g = this.gel;
    if (g) { const q = this._v.set(u, h, v).project(g.cam); return { x: g.rect.left + (q.x + 1) / 2 * g.vw, y: g.rect.top + (1 - q.y) / 2 * g.vh }; }
    const r = this.rect(), p = this.versEcran(u, h, v);
    return { x: r.left + p.x, y: r.top + p.y };
  }

  // Les pixels d'écran par unité du monde, au point (u, h, v) : ce qu'une figure ou une bulle doit
  // savoir pour se mettre à l'échelle de la perspective.
  // `jeu` : pour le DOM posé sur le monde, la vue du jeu figée pendant la carte.
  pixelsParU(u, h, v, jeu) {
    if (this.courante === this.ortho) return 1 / this.ortho.userData.s;
    const cam = jeu && this.gel ? this.gel.cam : this.cam;
    const vh = jeu && this.gel ? this.gel.vh : this.vh;
    const dx = u - cam.position.x, dy = h - cam.position.y, dz = v - cam.position.z;
    const fwd = this._v.set(0, 0, -1).applyQuaternion(cam.quaternion);
    const prof = Math.max(0.5, dx * fwd.x + dy * fwd.y + dz * fwd.z);
    return vh / (2 * Math.tan(cam.fov * Math.PI / 360) * prof);
  }

  // Le trapèze du sol vu (au niveau du point visé), agrandi de `marge` u : la réapparition des
  // groupes attend qu'il n'y soit pas (4.5).
  dansChamp(x, y, marge) {
    // Pendant la carte, l'île entière est en vue : la règle ne vaut que pour la vue du jeu.
    if (!this.vw || !this.vh || this.mode === 'carte') return false;
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
    // Pendant la carte, les touches + et - (CameraControls du jeu) zooment la carte.
    if (this.mode === 'carte') { this.carteZoomAt(clientX, clientY, factor, opts); return; }
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
    if ((!dx && !dy) || this.trans || this.mode === 'carte') return;
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
    if (this.trans || this.mode === 'carte') return;
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
    if (this.mode === 'combat' || this.mode === 'carte' || this.trans || !Number.isFinite(az)) return;
    this.animAz = null;
    const a = CameraIle.arc(az);
    if (a === this.azimut) return;
    this.azimut = a;
    this.placer();
    this.changed();
  }
  tournerVers(az) {
    if (this.mode === 'carte') { this.carteTournerVers(az); return; }
    if (this.mode === 'combat' || this.trans || !Number.isFinite(az)) return;
    if (CameraIle.calme()) { this.tournerA(az); return; }
    this.animAz = CameraIle.arc(az);
  }

  // Recentrer (bouton, touche 0) : le Veilleur au milieu, au champ et à l'azimut par défaut ; en
  // combat, l'aire entière cadrée.
  fit(animate) {
    if (this.mode === 'carte') { this.carteRecentrer(); return; }
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
    // Pendant la carte, la vue du jeu (rendue au retour) se pose sur le Veilleur ; la carte reste.
    if (this.mode === 'carte') { this.decalage.x = 0; this.decalage.y = 0; this.cible.x = this.joueur.x; this.cible.y = this.joueur.y; this.cible.h = this.joueur.h; this.vitCible.x = 0; this.vitCible.y = 0; return; }
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
    // La carte : D0 suit la taille de sa vue, le zoom (rapporté à D0) reste.
    if (this.mode === 'carte' && this.carte) {
      const k = this.carte, zc = k.cur.dist / k.D0, zd = k.des.dist / k.D0;
      k.D0 = this.carteD0();
      k.cur.dist = zc * k.D0; k.des.dist = zd * k.D0;
      this.placer(k.vol ? (k.vol.dernier || k.vol.de) : null);
      return;
    }
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
    if (this.mode === 'carte') this.sortirCarte(true);
    this.retourCarte = null;
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
    if (this.mode === 'carte') return this.majCarte(dt, now);
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
    // Le retour de la carte : de la vue de la carte à celle du jeu (qui suit déjà le Veilleur).
    if (this.retourCarte) { this.majRetourCarte(now); return true; }
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

  // ----- La carte de l'île (3.30 ; docs/ANALYSE-MAP-DUALITY.md, 4.2) -----
  //
  // L'état de la carte : le point visé (x, y), la distance de la caméra au point visé (dist) et le
  // cap (az), en deux copies : `des` (voulu) et `cur` (affiché), lissées par une exponentielle
  // indépendante du rythme des images (8 par seconde pour la translation et le cap, 11 pour le zoom :
  // voler vers un lieu, c'est poser `des`). L'élévation suit le zoom : 74° à D0 et au-delà (une vue
  // de haut où se lisent encore le relief et la falaise du bord), 50° au plus près. D0 : la distance
  // qui montre l'île entière dans la vue de la carte ; tous les réglages en sont des rapports.

  // Entre dans la carte : la vue du jeu est figée (worldToClient), l'état d'exploration est gardé
  // pour le retour ; puis le décollage depuis la vue du jeu vers l'île entière, le nord en haut, en
  // 0,9 s (sans vol si le mouvement est réduit ou `opts.immediat`). `opts.el` : l'élément de la vue
  // de la carte (ses coordonnées client) ; `opts.contour` : le contour de l'île (le cadrage de D0) ;
  // `opts.bornes` : le rectangle où le point visé reste.
  entrerCarte(opts) {
    if (this.mode !== 'exploration' || this.trans) return false;
    opts = opts || {};
    const C = CameraIle.CARTE;
    const depart = Object.assign({}, this.etatAffiche || this.etatExploration());
    this.retourCarte = null;
    this.gel = { cam: this.cam.clone(), rect: this.rect(), vw: this.vw, vh: this.vh };
    this.elJeu = this.el;
    if (opts.el) this.el = opts.el;
    this.mode = 'carte';
    this.anim = null; this.animAz = null; this.userUntil = 0; this.revient = false;
    const [L, H] = this.taille;
    const b = opts.bornes || { x0: 0, y0: 0, x1: L, y1: H };
    const contour = opts.contour && opts.contour.length >= 3 ? opts.contour : [[b.x0, b.y0], [b.x1, b.y0], [b.x1, b.y1], [b.x0, b.y1]];
    const cx = (b.x0 + b.x1) / 2, cy = (b.y0 + b.y1) / 2;
    const k = this.carte = { bornes: b, contour, centre: [cx, cy], D0: 1, h: 0, des: { x: cx, y: cy, dist: 1, az: 0 }, cur: null, vol: null, progres: 1, arrivee: 0, inertie: null, vx: 0, vy: 0, panT: 0 };
    k.D0 = this.carteD0();
    k.des.dist = k.D0;
    k.cur = Object.assign({}, k.des);
    if (opts.immediat || CameraIle.calme()) { k.arrivee = performance.now(); this.placer(); }
    else { k.vol = { t0: null, duree: C.depart * 1000, de: depart, dernier: null }; k.progres = 0; this.placer(depart); }
    return true;
  }

  // Sort de la carte : la vue du jeu reprend sur le Veilleur, au champ et au cap d'avant, après une
  // descente de 0,7 s depuis la vue de la carte (sans elle si le mouvement est réduit, `immediat`).
  sortirCarte(immediat) {
    const k = this.carte;
    if (!k) return;
    const de = Object.assign({}, this.etatAffiche || this.etatCarte());
    this.carte = null;
    if (this.elJeu) this.el = this.elJeu;
    this.elJeu = null; this.gel = null;
    this.mode = 'exploration';
    this.anim = null; this.animAz = null; this.userUntil = 0; this.revient = false;
    this.decalage.x = 0; this.decalage.y = 0;
    this.cible.x = this.joueur.x; this.cible.y = this.joueur.y; this.cible.h = this.joueur.h;
    this.vitCible.x = 0; this.vitCible.y = 0;
    this.borner();
    this.retourCarte = immediat || CameraIle.calme() ? null : { t0: null, duree: CameraIle.CARTE.retour * 1000, de, D0: k.D0, progres: 1 };
    this.placer(this.retourCarte ? de : null);
    this.changed();
  }

  // La descente vers la vue du jeu : de l'état de la carte à celui de l'exploration, qui vient
  // d'être posé (il suit le Veilleur, qui marche peut-être déjà vers le lieu choisi).
  majRetourCarte(now) {
    const r = this.retourCarte, B = this.etatAffiche;
    if (r.t0 == null) r.t0 = now;
    const t = Math.min(1, Math.max(0, (now - r.t0) / r.duree)), e = t * t * (3 - 2 * t);
    r.progres = 1 - e;
    if (t >= 1) { this.retourCarte = null; this.changed(); return; }
    this.placer(CameraIle.melange(r.de, B, e));
  }

  // Deux états posés (point visé, distance, élévation, cap, ouverture, regard levé) mêlés à `e`.
  static melange(A, B, e) {
    const L = (a, b) => a + (b - a) * e, G = (a, b) => Math.exp(Math.log(a) + (Math.log(b) - Math.log(a)) * e);
    return { x: L(A.x, B.x), y: L(A.y, B.y), h: L(A.h, B.h), dist: G(A.dist, B.dist), el: L(A.el, B.el), az: A.az + CameraIle.arc(B.az - A.az) * e, fov: G(A.fov, B.fov), leve: L(A.leve || 0, B.leve || 0) };
  }

  elevationCarte(dist) {
    const k = this.carte, C = CameraIle.CARTE, [e0, e1] = C.elevation;
    const t = k ? Math.max(0, Math.min(1, Math.log(dist / (C.min * k.D0)) / Math.log(1 / C.min))) : 1;
    return (e0 + (e1 - e0) * t) * Math.PI / 180;
  }
  // Un état (des ou cur) en état posé.
  etatDe(s) { return { x: s.x, y: s.y, h: this.carte ? this.carte.h : 0, dist: s.dist, el: this.elevationCarte(s.dist), az: s.az, fov: CameraIle.CARTE.ouverture, leve: 0 }; }
  etatCarte() { return this.etatDe(this.carte.cur); }

  // Une caméra de calcul posée d'après un état, sans marges.
  poserCam(cam, e) {
    const aspect = this.vw && this.vh ? this.vw / this.vh : 1.6, d = e.dist, hv = e.h + (e.leve || 0);
    cam.fov = e.fov; cam.aspect = aspect;
    cam.position.set(e.x + Math.cos(e.el) * Math.sin(e.az) * d, hv + Math.sin(e.el) * d, e.y + Math.cos(e.el) * Math.cos(e.az) * d);
    cam.up.set(0, 1, 0);
    cam.lookAt(e.x, hv, e.y);
    cam.near = Math.max(1, Math.min(d * 0.25, 60)); cam.far = d * 6 + 200;
    cam.clearViewOffset();
    cam.updateProjectionMatrix();
    cam.updateMatrixWorld(true);
  }

  // D0 : la plus petite distance où tout le contour de l'île (à hauteur 0) tient dans la vue de la
  // carte, nord en haut, à l'élévation de D0, avec une marge (plus large en haut, pour les noms).
  carteD0() {
    const k = this.carte, C = CameraIle.CARTE;
    if (!k || !this.vw || !this.vh) return 300;
    const m = Math.min(this.vw, this.vh) * C.marge, cam = this._camC, v = this._v;
    const el = C.elevation[1] * Math.PI / 180;
    let lo = 5, hi = 6000;
    for (let i = 0; i < 36; i++) {
      const d = Math.sqrt(lo * hi);
      this.poserCam(cam, { x: k.centre[0], y: k.centre[1], h: 0, dist: d, el, az: 0, fov: C.ouverture });
      let ok = true;
      for (const [u, w] of k.contour) {
        const p = v.set(u, 0, w).project(cam);
        const sx = (p.x + 1) / 2 * this.vw, sy = (1 - p.y) / 2 * this.vh;
        if (p.z > 1 || sx < m || sx > this.vw - m || sy < m * 1.8 || sy > this.vh - m) { ok = false; break; }
      }
      if (ok) hi = d; else lo = d;
    }
    return hi;
  }

  // Le point du plan horizontal (à la hauteur du point visé) sous un point de la vue (sx, sy), pour
  // un état donné ; null au-dessus de l'horizon.
  solSous(sx, sy, etat) {
    const cam = this._camC;
    this.poserCam(cam, etat);
    this._ndc.set(sx / Math.max(1, this.vw) * 2 - 1, -(sy / Math.max(1, this.vh) * 2 - 1));
    this._r.setFromCamera(this._ndc, cam);
    const ray = this._r.ray, dy = ray.direction.y;
    if (dy > -1e-4) return null;
    const t = (etat.h - ray.origin.y) / dy;
    return { x: ray.origin.x + ray.direction.x * t, y: ray.origin.z + ray.direction.z * t };
  }

  // Le point visé reste dans le rectangle de l'île, la distance entre ses bornes (rapports de D0).
  bornerCarte() {
    const k = this.carte, b = k.bornes, C = CameraIle.CARTE;
    for (const s of [k.cur, k.des]) {
      s.x = Math.max(b.x0, Math.min(b.x1, s.x)); s.y = Math.max(b.y0, Math.min(b.y1, s.y));
      s.dist = Math.max(C.min * k.D0, Math.min(C.max * k.D0, s.dist));
    }
  }

  // Glisser (pixels) : le point attrapé reste exactement sous le doigt (sans lissage) ; la vitesse est
  // une moyenne 50/50 par mouvement, pour l'inertie au relâchement (carteRelacher).
  cartePan(dx, dy, lance) {
    const k = this.carte;
    if (!k || k.vol || (!dx && !dy)) return;
    const f = this.focusRect(), E = this.etatDe(k.cur);
    const a = this.solSous(f.cx, f.cy, E), b = this.solSous(f.cx + dx, f.cy + dy, E);
    if (!a || !b) return;
    const mx = a.x - b.x, my = a.y - b.y;
    k.cur.x += mx; k.cur.y += my; k.des.x += mx; k.des.y += my;
    this.bornerCarte();
    if (!lance) {
      const t = performance.now(), dt = (t - k.panT) / 1000;
      if (dt > 0.001 && dt < 0.12) { k.vx = 0.5 * k.vx + 0.5 * dx / dt; k.vy = 0.5 * k.vy + 0.5 * dy / dt; } else { k.vx = 0; k.vy = 0; }
      k.panT = t;
      k.inertie = null;
    }
    this.placer();
  }
  // Le doigt (ou la souris) se lève : l'inertie, si le glisser bougeait encore (v *= exp(-5 dt) par la
  // suite, arrêt sous 12 px/s).
  carteRelacher() {
    const k = this.carte;
    if (!k) return;
    if (performance.now() - k.panT < 90 && Math.hypot(k.vx, k.vy) > 60 && !CameraIle.calme()) k.inertie = { vx: k.vx, vy: k.vy };
    k.vx = 0; k.vy = 0;
  }

  // Zoom vers un point (coordonnées client) : dist' = dist / f, le sol sous le point y reste ; calculé
  // sur l'état voulu, pour que des crans rapides se cumulent. `opts.smooth` : lissé (la molette).
  carteZoomAt(clientX, clientY, f, opts) {
    const k = this.carte;
    if (!k || k.vol || !(f > 0) || f === 1) return;
    const s = this.clientToScreen(clientX, clientY);
    if (s.x < -1 || s.y < -1 || s.x > this.vw + 1 || s.y > this.vh + 1) return;
    const C = CameraIle.CARTE;
    k.inertie = null;
    const a = this.solSous(s.x, s.y, this.etatDe(k.des));
    k.des.dist = Math.max(C.min * k.D0, Math.min(C.max * k.D0, k.des.dist / f));
    const b = this.solSous(s.x, s.y, this.etatDe(k.des));
    if (a && b) { k.des.x += a.x - b.x; k.des.y += a.y - b.y; }
    this.bornerCarte();
    if (!(opts && opts.smooth) || CameraIle.calme()) { Object.assign(k.cur, k.des); this.placer(); }
  }

  // Le pincement : le zoom `z` (rapporté à D0) et le point (wx, wy) du sol sous les doigts en (sx, sy).
  cartePinch(z, wx, wy, sx, sy) {
    const k = this.carte;
    if (!k || k.vol) return;
    const C = CameraIle.CARTE;
    k.inertie = null;
    k.cur.dist = k.des.dist = Math.max(C.min * k.D0, Math.min(C.max * k.D0, k.D0 / Math.max(1e-3, z)));
    k.des.az = k.cur.az;
    const q = this.solSous(sx, sy, this.etatDe(k.cur));
    if (q) { k.cur.x += wx - q.x; k.cur.y += wy - q.y; }
    k.des.x = k.cur.x; k.des.y = k.cur.y;
    this.bornerCarte();
    this.placer();
  }

  // Le sol sous un point client (CameraControls garde ce point sous les doigts).
  carteSol(cx, cy) {
    const k = this.carte;
    if (!k) return { x: 0, y: 0 };
    const s = this.clientToScreen(cx, cy);
    return this.solSous(s.x, s.y, this.etatDe(k.cur)) || { x: k.cur.x, y: k.cur.y };
  }

  // La rotation : directe au geste (bouton droit, deux doigts), lissée aux touches et aux boutons.
  carteTournerA(az) {
    const k = this.carte;
    if (!k || k.vol || !Number.isFinite(az)) return;
    k.inertie = null;
    k.cur.az = k.des.az = CameraIle.arc(az);
    this.placer();
  }
  carteTourner(da) { if (da && this.carte) this.carteTournerA(this.carte.cur.az + da); }
  carteTournerVers(az) {
    const k = this.carte;
    if (!k || k.vol || !Number.isFinite(az)) return;
    if (CameraIle.calme()) { this.carteTournerA(az); return; }
    k.des.az = CameraIle.arc(az);
  }

  // Voler vers un point (« Centrer ») : poser l'état voulu ; `dist` en u (par défaut l'approche d'un
  // lieu, 0,41 × D0).
  carteVoler(x, y, dist) {
    const k = this.carte;
    if (!k || k.vol) return;
    k.inertie = null;
    k.des.x = x; k.des.y = y;
    k.des.dist = dist || CameraIle.CARTE.approche * k.D0;
    this.bornerCarte();
    if (CameraIle.calme()) { Object.assign(k.cur, k.des); this.placer(); }
  }
  // L'île entière, le nord en haut.
  carteRecentrer() {
    const k = this.carte;
    if (!k || k.vol) return;
    this.carteVoler(k.centre[0], k.centre[1], k.D0);
    this.carteTournerVers(0);
  }

  // Chaque image, en carte : le décollage, ou l'inertie puis le lissage de l'état affiché vers
  // l'état voulu ; la hauteur du point visé suit le relief (bornée, lissée).
  majCarte(dt, now) {
    const k = this.carte;
    const T = this.terrain;
    let hT = null;
    if (T && typeof T.marcheA === 'function') { hT = T.marcheA(k.cur.x, k.cur.y); if (!Number.isFinite(hT) && typeof T.solBrutA === 'function') hT = T.solBrutA(k.cur.x, k.cur.y); }
    if (Number.isFinite(hT)) k.h += (Math.max(-4, Math.min(14, hT)) - k.h) * (1 - Math.exp(-dt * 4));
    if (k.vol) {
      const v = k.vol;
      if (v.t0 == null) v.t0 = now;
      const t = Math.min(1, Math.max(0, (now - v.t0) / v.duree)), e = t * t * (3 - 2 * t);
      k.progres = e;
      if (t >= 1) { k.vol = null; k.arrivee = now; this.placer(); }
      else { v.dernier = CameraIle.melange(v.de, this.etatCarte(), e); this.placer(v.dernier); }
      return true;
    }
    const I = k.inertie;
    if (I) {
      this.cartePan(I.vx * dt, I.vy * dt, true);
      const f = Math.exp(-5 * dt);
      I.vx *= f; I.vy *= f;
      if (Math.hypot(I.vx, I.vy) < 12) k.inertie = null;
    }
    const c = k.cur, d = k.des, avant = c.x + c.y * 7 + c.dist * 13 + c.az * 17;
    const a8 = 1 - Math.exp(-dt * 8), a11 = 1 - Math.exp(-dt * 11);
    c.x += (d.x - c.x) * a8; c.y += (d.y - c.y) * a8;
    c.az = CameraIle.arc(c.az + CameraIle.arc(d.az - c.az) * a8);
    c.dist = Math.exp(Math.log(c.dist) + (Math.log(d.dist) - Math.log(c.dist)) * a11);
    if (Math.abs(d.x - c.x) + Math.abs(d.y - c.y) < 1e-3) { c.x = d.x; c.y = d.y; }
    if (Math.abs(CameraIle.arc(d.az - c.az)) < 1e-4) c.az = d.az;
    if (Math.abs(Math.log(d.dist / c.dist)) < 1e-4) c.dist = d.dist;
    this.placer();
    return Math.abs(avant - (c.x + c.y * 7 + c.dist * 13 + c.az * 17)) > 1e-6 || !!I;
  }

  // Le survol en cours (la carte, son décollage, ou la descente vers le jeu), pour le rendu : la
  // distance, la largeur de sol vue au point visé, D0, et la part de carte (0 : la vue du jeu, 1 : la
  // carte posée). Null hors de la carte.
  survolCarte() {
    const k = this.carte, r = this.retourCarte, e = this.etatAffiche;
    if ((!k && !r) || !e) return null;
    const aspect = this.vw && this.vh ? this.vw / this.vh : 1.6;
    const largeur = e.dist * 2 * Math.tan(e.fov * Math.PI / 360) * aspect;
    return { dist: e.dist, largeur, D0: k ? k.D0 : r.D0, progres: k ? k.progres : r.progres, carte: !!k, vol: !!(k && k.vol), arrivee: k ? k.arrivee : 0, x: e.x, y: e.y };
  }

  // Ce que CameraControls attend d'une caméra, pour les gestes sur la vue de la carte : un doigt n'y
  // déplace pas la vue (fitZoom infini : la fenêtre de la carte gère elle-même le glisser et son
  // inertie), deux doigts zooment et tournent, la molette zoome, le bouton droit tourne.
  adaptateurCarte() {
    const cam = this;
    return {
      get anim() { return null; }, get animAz() { return null; },
      get zoom() { return cam.carte ? cam.carte.D0 / cam.carte.cur.dist : 1; },
      fitZoom: Infinity,
      get azimut() { return cam.carte ? cam.carte.cur.az : 0; },
      get vw() { return cam.vw; }, get vh() { return cam.vh; },
      rect: () => cam.rect(), focusRect: () => cam.focusRect(), clientToScreen: (x, y) => cam.clientToScreen(x, y),
      clientToWorld: (x, y) => cam.carteSol(x, y),
      zoomAt: (x, y, f, o) => cam.carteZoomAt(x, y, f, o),
      panBy: (dx, dy) => cam.cartePan(dx, dy),
      pinchTo: (z, wx, wy, sx, sy) => cam.cartePinch(z, wx, wy, sx, sy),
      tourner: da => cam.carteTourner(da), tournerA: az => cam.carteTournerA(az), tournerVers: az => cam.carteTournerVers(az),
      fit: () => cam.carteRecentrer(),
    };
  }

  // ----- Événement « veylan:camera » -----

  on(fn) { this.listeners.add(fn); return () => this.listeners.delete(fn); }

  state() { return { zoom: this.zoom, x: this.vise.x, y: this.vise.y, fitZoom: this.fitZoom, atFit: this.atFit, width: this.vw, height: this.vh, champ: this.champ, mode: this.mode, passage: !!this.trans, carte: !!this.carte }; }

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
    // Pendant la carte, rien ne bouge pour le DOM posé sur le monde (la vue du jeu est figée).
    if (this.muette || this.mode === 'carte') return;
    const d = this.state();
    for (const fn of this.listeners) { try { fn(d); } catch (e) { console.error(e); } }
    try { window.dispatchEvent(new CustomEvent('veylan:camera', { detail: d })); } catch (e) { /* pas de CustomEvent */ }
  }

  static calme() {
    try { return matchMedia('(prefers-reduced-motion: reduce)').matches; } catch (e) { return false; }
  }
}

// Les réglages de la carte (3.30), en rapports de D0 (la distance qui montre l'île entière) : la
// distance de 0,11 à 3,55 × D0, l'approche d'un lieu à 0,41 × D0 (docs/ANALYSE-MAP-DUALITY.md, 4) ;
// l'ouverture (degrés), l'élévation au plus près et à D0 (degrés), le décollage et le retour
// (secondes), la marge du cadrage de D0 (part du petit côté de la vue).
CameraIle.CARTE = { ouverture: 30, elevation: [50, 74], min: 0.11, max: 3.55, approche: 0.41, depart: 0.9, retour: 0.7, marge: 0.05 };
