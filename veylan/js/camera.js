// Caméra du plateau : la toile remplit la scène, et le monde (les coordonnées de cellToScreen,
// origin, W, H) y est dessiné à travers un zoom et un décalage, une seule transformation par image :
//   écran = monde × zoom + (x, y), en pixels CSS depuis le coin haut gauche de la toile.
// La carte est une scène pleine : autour du plateau, ses alentours peints (painted) courent au-delà
// des bords de la vue. « Ajuster » fait remplir au plateau jouable (le cœur : toutes les cases où
// l'on se tient) la part de la scène que l'interface ne couvre pas (insets), aussi grand que
// possible, chaque case restant visible. Le zoom reste entre 0,75 et 2,5 fois l'ajustement, et ne
// descend jamais au point de montrer plus que ce qui est peint ; le centre de la vue reste au-dessus
// du cœur, et la vue ne sort jamais des alentours peints.
// Chaque changement (zoom, déplacement, ajustement, taille) émet, au plus une fois par image,
// l'événement « veylan:camera » sur window (detail : zoom, x, y, fitZoom, atFit, width, height) :
// les éléments du DOM posés sur une case se replacent avec renderer.worldToClient(x, y).
class Camera {
  constructor(el) {
    this.el = el;                 // la toile : son coin haut gauche à l'écran sert aux coordonnées client
    this.zoom = 1;
    this.x = 0;
    this.y = 0;
    this.vw = 0;                  // taille de la vue, en pixels CSS
    this.vh = 0;
    this.bounds = { x: 0, y: 0, w: 1, h: 1 };          // le cœur, en coordonnées du monde
    this.core = null;                                  // le plateau jouable, à garder hors de l'interface
    this.painted = null;                               // les alentours peints : la vue n'en sort pas
    this.insets = { top: 0, right: 0, bottom: 0, left: 0 };
    this.fitZoom = 1;
    this.minK = 0.75;
    this.maxK = 2.5;
    this.margin = 0.03;
    this.atFit = true;
    this.anim = null;             // { zoom, wx, wy, sx, sy, fit } : le point (wx, wy) du monde va en (sx, sy)
    this.userUntil = 0;           // le joueur a bougé la vue : la caméra ne le suit pas tout de suite
    this.lastFocus = null;
    this.lastStep = 0;
    this.dirty = false;           // un changement attend son événement
    this.queued = false;
    this.listeners = new Set();
    this.calme = false;
    try {
      const mq = matchMedia('(prefers-reduced-motion: reduce)');
      this.calme = mq.matches;
      if (mq.addEventListener) mq.addEventListener('change', e => { this.calme = e.matches; });
    } catch (e) { /* pas de matchMedia */ }
    // Muette (le rendu des cases dort pendant que l'île d'Ervane s'affiche en 3D, js/scene.js) : elle
    // suit encore la taille de la vue, mais n'émet plus « veylan:camera ».
    this.muette = false;
    // Une rotation de l'écran recadre le plateau entier, même zoomé ; la nouvelle taille suit.
    const turn = () => { if (!this.muette) this.fit(); };
    try {
      if (screen.orientation && screen.orientation.addEventListener) screen.orientation.addEventListener('change', turn);
      else addEventListener('orientationchange', turn);
    } catch (e) { /* pas d'écran */ }
  }

  // ----- Cadre -----

  // La part de la vue que l'interface laisse libre.
  focusRect() {
    const i = this.insets;
    const w = Math.max(1, this.vw - i.left - i.right), h = Math.max(1, this.vh - i.top - i.bottom);
    return { x: i.left, y: i.top, w, h, cx: i.left + w / 2, cy: i.top + h / 2 };
  }

  // Le zoom le plus large qui ne montre que du peint.
  minPainted() {
    const P = this.painted;
    if (!P) return 0;
    const r = this.focusRect();
    return Math.max(r.w / P.w, r.h / P.h);
  }

  // L'ajustement : le cœur aussi grand que possible dans la part libre, au milieu ; puis la vue
  // ramenée dans les alentours peints s'il le faut.
  fitState() {
    const r = this.focusRect(), c = this.core || this.bounds;
    const m = Math.min(this.vw, this.vh) * this.margin;
    const zoom = Math.max(0.05, Math.min((r.w - 2 * m) / c.w, (r.h - 2 * m) / c.h), this.minPainted());
    return this.inside({ zoom, x: r.cx - (c.x + c.w / 2) * zoom, y: r.cy - (c.y + c.h / 2) * zoom });
  }

  // Une vue (zoom, x, y) ramenée dans les alentours peints ; centrée sur eux s'ils sont plus petits.
  // La part de la vue à couvrir est la part libre de la scène (focusRect) : ce que l'interface couvre
  // (le panneau de jeu ouvert au téléphone, 3.29) peut rester sans peinture dessous.
  inside(s) {
    const P = this.painted;
    if (!P) return s;
    const z = s.zoom, r = this.focusRect();
    const fit = (v, lo, hi) => (lo > hi ? (lo + hi) / 2 : Math.max(lo, Math.min(hi, v)));
    s.x = fit(s.x, r.x + r.w - (P.x + P.w) * z, r.x - P.x * z);
    s.y = fit(s.y, r.y + r.h - (P.y + P.h) * z, r.y - P.y * z);
    return s;
  }

  // La part libre de la scène (focusRect) en coordonnées du monde.
  visibleFocus() {
    const z = this.zoom, r = this.focusRect();
    return { x0: (r.x - this.x) / z, y0: (r.y - this.y) / z, x1: (r.x + r.w - this.x) / z, y1: (r.y + r.h - this.y) / z };
  }

  // Nouvelle taille de la vue : ajustée si elle l'était ; sinon même point au centre, même zoom
  // rapporté à l'ajustement.
  setViewport(w, h) {
    if (!(w > 0 && h > 0)) return;
    if (w === this.vw && h === this.vh) { this.changed(); return; }
    const first = !this.vw;
    const r0 = this.focusRect();
    const c0 = this.screenToWorld(r0.cx, r0.cy), k = this.zoom / this.fitZoom;
    this.vw = w; this.vh = h;
    this.fitZoom = this.fitState().zoom;
    if (first || this.atFit) { this.fit(); return; }
    const r = this.focusRect();
    this.anim = null;
    this.place(this.fitZoom * k, c0.x, c0.y, r.cx, r.cy);
    this.changed();
  }

  // Ce qu'il faut cadrer (le cœur `b.core`, sinon b) et les alentours peints `b.painted` ;
  // `refit` : on recadre (changement de carte).
  setBounds(b, refit) {
    const box = r => ({ x: r.x, y: r.y, w: Math.max(1, r.w), h: Math.max(1, r.h) });
    this.bounds = box(b);
    this.core = b.core ? box(b.core) : null;
    this.painted = b.painted ? box(b.painted) : null;
    if (!this.vw) return;
    this.fitZoom = this.fitState().zoom;
    if (refit || this.atFit) this.fit();
    else { this.clamp(); this.changed(); }
  }

  // La part de la scène couverte par l'interface (la barre de combat sur téléphone, par exemple).
  setInsets(ins) {
    const n = { top: Math.max(0, ins.top || 0), right: Math.max(0, ins.right || 0), bottom: Math.max(0, ins.bottom || 0), left: Math.max(0, ins.left || 0) };
    const o = this.insets;
    if (n.top === o.top && n.right === o.right && n.bottom === o.bottom && n.left === o.left) return;
    this.insets = n;
    if (!this.vw) return;
    this.fitZoom = this.fitState().zoom;
    if (this.atFit) this.fit();
    else { this.clamp(); this.changed(); }
  }

  // Ajuster : le plateau jouable remplit la vue. `animate` : glissement doux (sauf mouvement réduit).
  fit(animate) {
    if (!this.vw) return;
    const f = this.fitState();
    this.fitZoom = f.zoom;
    this.atFit = true;
    this.userUntil = 0;
    if (animate && !this.calme) {
      const c = this.core || this.bounds, wx = c.x + c.w / 2, wy = c.y + c.h / 2;
      this.anim = { zoom: f.zoom, wx, wy, sx: wx * f.zoom + f.x, sy: wy * f.zoom + f.y, fit: true };
    } else {
      this.anim = null;
      this.zoom = f.zoom; this.x = f.x; this.y = f.y;
    }
    this.changed();
  }

  // ----- Gestes -----

  // Zoom d'un facteur autour d'un point de l'écran (coordonnées client) : le point du monde sous
  // ce point y reste. `opts.smooth` : glissement doux (molette, clavier), sauf mouvement réduit.
  zoomAt(clientX, clientY, factor, opts) {
    if (!(factor > 0) || factor === 1 || !this.vw) return;
    const s = this.clientToScreen(clientX, clientY);
    const smooth = !!(opts && opts.smooth) && !this.calme;
    const base = smooth && this.anim && !this.anim.fit ? this.anim.zoom : this.zoom;
    const z = this.clampZoom(base * factor);
    const w = this.screenToWorld(s.x, s.y);
    this.atFit = false;
    this.user();
    if (smooth) this.anim = { zoom: z, wx: w.x, wy: w.y, sx: s.x, sy: s.y };
    else { this.anim = null; this.place(z, w.x, w.y, s.x, s.y); }
    this.changed();
  }

  // Déplace la vue de (dx, dy) pixels CSS.
  panBy(dx, dy) {
    if (!dx && !dy) return;
    this.anim = null;
    this.atFit = false;
    this.user();
    this.x += dx; this.y += dy;
    this.clamp();
    this.changed();
  }

  // Pincement : le zoom `z`, et le point (wx, wy) du monde sous les doigts en (sx, sy).
  pinchTo(z, wx, wy, sx, sy) {
    this.anim = null;
    this.atFit = false;
    this.user();
    this.place(this.clampZoom(z), wx, wy, sx, sy);
    this.changed();
  }

  user() { this.userUntil = performance.now() + 4000; }

  // Suit une cible (coordonnées du monde) quand le plateau ne tient pas en entier : elle reste dans
  // le cadre, à distance des bords. Un nouveau focus (acteur du tour, départ en marche) reprend la
  // main sur le dernier geste du joueur.
  follow(focus, wx, wy) {
    if (focus !== this.lastFocus) { this.lastFocus = focus; if (focus !== 'repos') this.userUntil = 0; }
    if (wx == null || !this.vw || this.anim || this.zoom <= this.fitZoom * 1.02) return;
    if (this.userUntil && performance.now() < this.userUntil) return;
    const s = this.worldToScreen(wx, wy), r = this.focusRect(), mx = r.w * 0.2, my = r.h * 0.2;
    let dx = 0, dy = 0;
    if (s.x < r.x + mx) dx = r.x + mx - s.x; else if (s.x > r.x + r.w - mx) dx = r.x + r.w - mx - s.x;
    if (s.y < r.y + my) dy = r.y + my - s.y; else if (s.y > r.y + r.h - my) dy = r.y + r.h - my - s.y;
    if (Math.abs(dx) < 0.5 && Math.abs(dy) < 0.5) return;
    const k = this.calme ? 1 : 0.12;
    this.x += dx * k; this.y += dy * k;
    this.clamp();
    this.changed();
  }

  // Une étape de glissement, à chaque image du rendu.
  update(now) {
    const dt = this.lastStep ? Math.min(0.1, Math.max(0, (now - this.lastStep) / 1000)) : 0.016;
    this.lastStep = now;
    const a = this.anim;
    if (!a) return false;
    const t = 1 - Math.exp(-dt * 14);
    const z = Math.exp(Math.log(this.zoom) + (Math.log(a.zoom) - Math.log(this.zoom)) * t);
    const s = this.worldToScreen(a.wx, a.wy);
    const sx = s.x + (a.sx - s.x) * t, sy = s.y + (a.sy - s.y) * t;
    this.zoom = z; this.x = sx - a.wx * z; this.y = sy - a.wy * z;
    if (Math.abs(Math.log(a.zoom / z)) < 0.002 && Math.abs(a.sx - sx) < 0.3 && Math.abs(a.sy - sy) < 0.3) {
      this.zoom = a.zoom; this.x = a.sx - a.wx * a.zoom; this.y = a.sy - a.wy * a.zoom;
      this.anim = null;
    }
    this.clamp();
    this.changed();
    return true;
  }

  clampZoom(z) {
    const lo = Math.max(this.fitZoom * this.minK, this.minPainted());
    return Math.max(lo, Math.min(Math.max(lo, this.fitZoom * this.maxK), z));
  }

  // Le zoom dans ses bornes, le centre de la vue au-dessus du cœur, et la vue dans les alentours peints.
  clamp() {
    const r = this.focusRect(), b = this.core || this.bounds;
    const z = this.clampZoom(this.zoom);
    if (z !== this.zoom) { const c = this.screenToWorld(r.cx, r.cy); this.zoom = z; this.x = r.cx - c.x * z; this.y = r.cy - c.y * z; }
    const c = this.screenToWorld(r.cx, r.cy);
    const wx = Math.max(b.x, Math.min(b.x + b.w, c.x)), wy = Math.max(b.y, Math.min(b.y + b.h, c.y));
    if (wx !== c.x) this.x = r.cx - wx * this.zoom;
    if (wy !== c.y) this.y = r.cy - wy * this.zoom;
    const s = this.inside({ zoom: this.zoom, x: this.x, y: this.y });
    this.x = s.x; this.y = s.y;
  }

  place(z, wx, wy, sx, sy) {
    this.zoom = z; this.x = sx - wx * z; this.y = sy - wy * z;
    this.clamp();
  }

  // ----- Conversions -----

  worldToScreen(wx, wy) { return { x: wx * this.zoom + this.x, y: wy * this.zoom + this.y }; }
  screenToWorld(sx, sy) { return { x: (sx - this.x) / this.zoom, y: (sy - this.y) / this.zoom }; }
  rect() { return this.el.getBoundingClientRect(); }
  clientToScreen(cx, cy) { const r = this.rect(); return { x: cx - r.left, y: cy - r.top }; }
  worldToClient(wx, wy) { const r = this.rect(); return { x: r.left + wx * this.zoom + this.x, y: r.top + wy * this.zoom + this.y }; }
  clientToWorld(cx, cy) { const r = this.rect(); return { x: (cx - r.left - this.x) / this.zoom, y: (cy - r.top - this.y) / this.zoom }; }

  // Le rectangle du monde visible dans la vue.
  visibleWorld() {
    const z = this.zoom;
    return { x0: -this.x / z, y0: -this.y / z, x1: (this.vw - this.x) / z, y1: (this.vh - this.y) / z };
  }

  // ----- Événement « veylan:camera » -----

  on(fn) { this.listeners.add(fn); return () => this.listeners.delete(fn); }

  state() { return { zoom: this.zoom, x: this.x, y: this.y, fitZoom: this.fitZoom, atFit: this.atFit, width: this.vw, height: this.vh }; }

  // Un changement : l'événement part à la fin de l'image du rendu (flush), ou à l'image suivante.
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
}

// Les gestes de la caméra sur la toile : molette (zoom autour du curseur), glisser avec le bouton du
// milieu (déplacer) ou le droit (tourner la vue si la caméra sait tourner, `tourner` ; déplacer
// sinon), deux doigts (pincer pour zoomer, glisser pour déplacer, pivoter pour tourner la vue, dès
// 7° d'écart), touches + et - (zoom), A et E (tourner d'un huitième de tour, touches physiques Q et
// E) et 0 (ajuster). Le clic gauche et le toucher à un doigt gardent leur sens. Un
// glissement à un doigt déplace la vue quand elle est zoomée au-delà de l'ajustement
// (oneFingerPan) ; sinon il reste libre (il change de carte, js/hud-jeu.js) et annule seulement
// le toucher. Les autres gestes du plateau demandent gesturing() (deux doigts posés, vue qu'on
// déplace) et ignoreClick() (un clic qui suit un geste n'en est pas un).
// opts : enabled() (gestes permis), keys() (touches permises), zeroTaken(evt) (0 sert déjà, au
// dixième sort en combat), onRightClick(evt) (clic droit sans glisser).
class CameraControls {
  constructor(camera, el, opts) {
    this.camera = camera;
    this.el = el;
    this.opts = opts || {};
    this.touches = new Map();         // doigts (et stylet) posés
    this.pinch = null;
    this.pan1 = null;                 // un doigt qui déplace la vue zoomée
    this.drag = null;
    this.quietUntil = 0;
    this.tapMoved = false;
    this.lastPointerType = 'mouse';
    el.addEventListener('wheel', e => this.wheel(e), { passive: false });
    el.addEventListener('pointerdown', e => this.down(e));
    el.addEventListener('pointermove', e => this.move(e));
    el.addEventListener('pointerup', e => this.up(e, false));
    el.addEventListener('pointercancel', e => this.up(e, true));
    // Le bouton du milieu ne lance pas le défilement automatique ; Safari ne zoome pas la page.
    el.addEventListener('mousedown', e => { if (e.button === 1) e.preventDefault(); });
    el.addEventListener('gesturestart', e => e.preventDefault());
    addEventListener('keydown', e => this.key(e));
  }

  enabled() { return !this.opts.enabled || this.opts.enabled(); }

  static tactile(e) { return e.pointerType === 'touch' || e.pointerType === 'pen'; }

  // Zoomée au-delà de l'ajustement, un doigt déplace la vue ; à l'ajustement (ou en deçà), son
  // glissement reste au changement de carte.
  oneFingerPan() {
    const c = this.camera, z = c.anim ? c.anim.zoom : c.zoom;
    return this.enabled() && z > c.fitZoom * 1.02;
  }

  // Un geste de la caméra est en cours : deux doigts posés, ou la vue qu'on déplace (souris, doigt).
  gesturing() { return !!this.pinch || this.touches.size >= 2 || !!(this.drag && this.drag.moved) || !!(this.pan1 && this.pan1.moved); }

  // Un clic qui suit un geste (deux doigts, glisser, toucher qui a bougé) n'est pas un clic.
  ignoreClick() {
    if (this.pinch || this.touches.size >= 2) return true;
    if (performance.now() < this.quietUntil) return true;
    return (this.lastPointerType === 'touch' || this.lastPointerType === 'pen') && this.tapMoved;
  }

  // La molette d'une souris (pas d'environ 100) ou le pincement d'un pavé tactile (ctrlKey, petits pas).
  // Un glissement seulement horizontal (pavé tactile) ne fait rien, ni retour de page.
  wheel(e) {
    if (!this.enabled()) return;
    e.preventDefault();
    let dy = e.deltaY;
    if (!dy) return;
    if (e.deltaMode === 1) dy *= 16; else if (e.deltaMode === 2) dy *= this.camera.vh || 800;
    dy = Math.max(-300, Math.min(300, dy));
    this.camera.zoomAt(e.clientX, e.clientY, Math.exp(-dy * (e.ctrlKey ? 0.01 : 0.0015)), { smooth: !e.ctrlKey });
  }

  down(e) {
    this.lastPointerType = e.pointerType || 'mouse';
    if (!this.enabled()) return;
    if (CameraControls.tactile(e)) {
      this.touches.set(e.pointerId, { x: e.clientX, y: e.clientY, x0: e.clientX, y0: e.clientY });
      if (this.touches.size === 1) {
        this.tapMoved = false;
        this.pan1 = this.oneFingerPan() ? { id: e.pointerId, x: e.clientX, y: e.clientY, moved: false } : null;
      }
      if (this.touches.size >= 2) {
        if (this.pan1) { this.pan1 = null; this.el.classList.remove('glisse'); }
        this.quietUntil = Infinity;
        this.startPinch();
      }
      return;
    }
    if (e.button === 1 || e.button === 2) {
      this.drag = { id: e.pointerId, x: e.clientX, y: e.clientY, button: e.button, moved: false, tourne: e.button === 2 && typeof this.camera.tourner === 'function' };
      try { this.el.setPointerCapture(e.pointerId); } catch (err) { /* rien */ }
    }
  }

  move(e) {
    if (CameraControls.tactile(e)) {
      const t = this.touches.get(e.pointerId);
      if (!t) return;
      t.x = e.clientX; t.y = e.clientY;
      if (this.touches.size === 1 && Math.hypot(t.x - t.x0, t.y - t.y0) > 12) this.tapMoved = true;
      if (this.pinch) this.updatePinch();
      else if (this.pan1 && this.pan1.id === e.pointerId && this.tapMoved) this.panOne(e);
      return;
    }
    const d = this.drag;
    if (!d || d.id !== e.pointerId) return;
    const dx = e.clientX - d.x, dy = e.clientY - d.y;
    if (!d.moved && Math.hypot(dx, dy) < 4) return;
    if (!d.moved) { d.moved = true; this.el.classList.add('glisse'); }
    d.x = e.clientX; d.y = e.clientY;
    // Le bouton droit tourne la vue : un tiers de tour pour 300 px.
    if (d.tourne) this.camera.tourner(dx * 0.007); else this.camera.panBy(dx, dy);
  }

  up(e, cancel) {
    if (CameraControls.tactile(e)) {
      const t = this.touches.get(e.pointerId);
      if (t && Math.hypot(e.clientX - t.x0, e.clientY - t.y0) > 12) this.tapMoved = true;
      this.touches.delete(e.pointerId);
      const p = this.pan1;
      if (p && p.id === e.pointerId) {
        this.pan1 = null;
        if (p.moved) { this.el.classList.remove('glisse'); this.quietUntil = Math.max(this.quietUntil, performance.now() + 250); }
      }
      if (this.touches.size >= 2) this.startPinch(); else this.pinch = null;
      if (!this.touches.size && this.quietUntil === Infinity) this.quietUntil = performance.now() + 350;
      return;
    }
    const d = this.drag;
    if (!d || d.id !== e.pointerId) return;
    this.drag = null;
    this.el.classList.remove('glisse');
    try { this.el.releasePointerCapture(e.pointerId); } catch (err) { /* rien */ }
    if (d.moved) this.quietUntil = performance.now() + 250;
    else if (!cancel && d.button === 2 && this.opts.onRightClick) this.opts.onRightClick(e);
  }

  // Un doigt sur la vue zoomée : le monde suit le doigt, dès qu'il a quitté la zone du toucher.
  panOne(e) {
    const p = this.pan1;
    if (!p.moved) { p.moved = true; this.el.classList.add('glisse'); }
    const dx = e.clientX - p.x, dy = e.clientY - p.y;
    p.x = e.clientX; p.y = e.clientY;
    this.camera.panBy(dx, dy);
  }

  // Deux doigts : le point du monde sous leur milieu suit le milieu, l'écart règle le zoom, et
  // l'angle entre les doigts tourne la vue (quand la caméra sait tourner), une fois passés 7°
  // d'écart depuis la pose : en deçà, un pincement un peu tordu ne fait que zoomer.
  startPinch() {
    const [a, b] = this.touches.values();
    const cam = this.camera, w = cam.clientToWorld((a.x + b.x) / 2, (a.y + b.y) / 2);
    this.pinch = { d0: Math.max(10, Math.hypot(a.x - b.x, a.y - b.y)), z0: cam.zoom, wx: w.x, wy: w.y, a0: Math.atan2(b.y - a.y, b.x - a.x), az0: cam.azimut, tourne: false };
  }

  updatePinch() {
    const [a, b] = this.touches.values(), p = this.pinch, cam = this.camera;
    if (typeof cam.tournerA === 'function' && typeof p.az0 === 'number') {
      const ang = Math.atan2(b.y - a.y, b.x - a.x), da = Math.atan2(Math.sin(ang - p.a0), Math.cos(ang - p.a0));
      if (!p.tourne && Math.abs(da) > 0.12) { p.tourne = true; p.a0 = ang; p.az0 = cam.azimut; }
      else if (p.tourne) cam.tournerA(p.az0 + da);
    }
    const s = cam.clientToScreen((a.x + b.x) / 2, (a.y + b.y) / 2);
    cam.pinchTo(p.z0 * Math.max(10, Math.hypot(a.x - b.x, a.y - b.y)) / p.d0, p.wx, p.wy, s.x, s.y);
  }

  key(e) {
    if (e.ctrlKey || e.metaKey || e.altKey || !this.enabled() || (this.opts.keys && !this.opts.keys())) return;
    const t = e.target;
    if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.tagName === 'SELECT' || t.isContentEditable)) return;
    const cam = this.camera;
    const zoom = k => { e.preventDefault(); const r = cam.rect(), f = cam.focusRect(); cam.zoomAt(r.left + f.cx, r.top + f.cy, k, { smooth: true }); };
    if (e.key === '+' || e.key === '=' || e.code === 'NumpadAdd') zoom(1.25);
    else if (e.key === '-' || e.key === '_' || e.code === 'NumpadSubtract') zoom(0.8);
    // Une lettre déjà prise par un menu (la touche Q des Quêtes en qwerty, saisie avant nous, en
    // capture, par js/hud-fenetres.js) ne tourne pas la vue.
    else if ((e.code === 'KeyQ' || e.code === 'KeyE') && !e.defaultPrevented && typeof cam.tournerVers === 'function') { e.preventDefault(); cam.tournerVers((cam.animAz != null ? cam.animAz : cam.azimut) + (e.code === 'KeyQ' ? -1 : 1) * Math.PI / 4); }
    else if ((e.key === '0' || e.code === 'Numpad0') && !(this.opts.zeroTaken && this.opts.zeroTaken(e))) { e.preventDefault(); cam.fit(true); }
  }
}
