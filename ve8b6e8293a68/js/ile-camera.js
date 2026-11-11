class CameraIle {
  constructor(opts) {
    const THREE = window.THREE;
    opts = opts || {};
    this.el = opts.el || null;
    const cdef = (opts.def && opts.def.camera) || {};
    this.taille = (opts.def && opts.def.taille) || [240, 180];
    this.terrain = opts.terrain || null;
    this.bloque = opts.bloque || null;
    this.dLibre = Infinity;
    const ex = Object.assign({}, cdef.exploration || {}, opts.style || {});
    this.ouverture = ex.ouverture || 20;
    this.elevations = ex.elevation || [35, 45];
    this.leve = ex.leve || 0;
    this.champs = (cdef.champ || [18, 60]).slice();
    this.proche = ex.proche || null;
    this.inclinaison = 0;
    this.orbite = null;
    this.elevSol = 0;
    this.dSol = Infinity;
    if (ex.champMin > 0) this.champs[0] = Math.min(this.champs[0], ex.champMin);
    const telephone = CameraIle.telephone();
    this.champDefaut = ((opts.style && opts.style.champDefaut) || cdef.champDefaut || [26, 32])[telephone ? 0 : 1];
    this.azimut = (cdef.azimut != null ? cdef.azimut : 45) * Math.PI / 180;
    this.azimutDefaut = this.azimut;
    this.azimutCombat = this.azimut;
    this.animAz = null;
    this.vitCible = { x: 0, y: 0 };
    this.vitJoueur = { x: 0, y: 0 };
    this.joueurPrec = null;
    this.suiviPrec = null;
    this.regards = {
      dos: { ouverture: 50, elevations: [12, 52], leve: 1.5, champs: [8, 44], champDefaut: telephone ? 14 : 17, suit: true },
      jeu: { ouverture: this.ouverture, elevations: this.elevations.slice(), leve: this.leve, champs: this.champs.slice(), champDefaut: this.champDefaut, proche: this.proche },
      basse: { ouverture: 58, elevations: [5, 9], leve: 2.2, champs: [9, 22], champDefaut: telephone ? 12 : 14 },
      iso: { ouverture: 6, elevations: [30, 30], leve: 0, champs: [16, 56], champDefaut: telephone ? 24 : 30, fixe: true },
    };
    this.regard = 'jeu';
    this.passageRegard = null;
    let garde = null;
    try { garde = localStorage.getItem(CameraIle.CLE_REGARD); } catch (e) {   }
    const voulu = opts.regard && this.regards[opts.regard] ? opts.regard : garde && this.regards[garde] ? garde : CameraIle.REGARD_DEFAUT;
    if (voulu !== 'jeu') this.poserRegard(voulu);
    this.tourPad = 0;
    this.orbiteVue = -Infinity;
    this.inertie = 0;
    this.vitOrbite = 0;
    this.tOrbite = 0;
    this.cam = new THREE.PerspectiveCamera(this.ouverture, 1, 1, 900);
    this.champ = this.champDefaut;
    this.cible = { x: 0, y: 0, h: 0 };
    this.decalage = { x: 0, y: 0 };
    this.joueur = { x: 0, y: 0, h: 0 };
    this.vw = 0; this.vh = 0;
    this.insets = { top: 0, right: 0, bottom: 0, left: 0 };
    this.fitZoom = 0;
    this.atFit = true;
    this.anim = null;
    this.userUntil = 0;
    this.revient = false;
    this.dirty = false;
    this.queued = false;
    this.muette = false;
    this.listeners = new Set();
    this.lastStep = 0;
    this.focusMarche = false;
    this._v = new THREE.Vector3();
    this._r = new THREE.Raycaster();
    this._ndc = new THREE.Vector2();
    const cc = cdef.combat || {};
    this.elevationCombat = (cc.elevation || 30) * Math.PI / 180;
    this.elevationTactique = (cc.tactique || 60) * Math.PI / 180;
    this.ortho = new THREE.OrthographicCamera(-1, 1, 1, -1, 1, 1000);
    this.ortho.userData.s = 0.05;
    this.mode = 'exploration';
    this.aire = null;
    this.tactique = false;
    this.cadre = null;
    this.vue = null;
    this.trans = null;
    this.avantCombat = null;
    this.dernierEtat = null;
    this.suiviCombat = null;
    this.dernierFocus = null;
    this.fondu = 0;
    this.distCourante = 0;
    this.coin = null;
    this.vise = { x: 0, y: 0, h: 0 };
    this.carte = null;
    this.retourCarte = null;
    this.gel = null;
    this.elJeu = null;
    this.etatAffiche = null;
    this._camC = new THREE.PerspectiveCamera(30, 1, 1, 4000);
    this.placer();
  }

  get courante() { return this.mode === 'combat' && !this.trans ? this.ortho : this.cam; }
  get enCombat() { return this.mode === 'combat'; }

  static telephone() {
    let coarse = false;
    try { coarse = matchMedia('(pointer: coarse)').matches; } catch (e) {   }
    return coarse || (typeof innerWidth === 'number' && Math.min(innerWidth, innerHeight) <= 500);
  }


  get zoom() {
    if (this.mode === 'carte' && this.carte) return this.carte.D0 / this.carte.cur.dist;
    return this.mode === 'combat' && this.vue ? 1 / this.vue.s : this.champDefaut / this.champ;
  }
  elevation(champ) {
    const c = champ == null ? this.champ : champ;
    const [a, b] = this.champs, [e0, e1] = this.elevations;
    const lin = x => e0 + (e1 - e0) * Math.max(0, Math.min(1, (x - a) / (b - a)));
    const k = this.proximite(c);
    let e = k > 0 ? lin(this.champDefaut) + (this.proche.elevation - lin(this.champDefaut)) * k : lin(c);
    if (this.inclinaison && !this.regards[this.regard].fixe) e = Math.max(CameraIle.ORBITE.min, Math.min(CameraIle.ORBITE.max, e + this.inclinaison));
    return e * Math.PI / 180;
  }
  proximite(c) {
    const P = this.proche;
    if (!P || this.regard !== 'jeu' || !(c < this.champDefaut)) return 0;
    return Math.min(1, (this.champDefaut - c) / Math.max(1e-6, this.champDefaut - this.champs[0]));
  }
  leveA(champ) {
    const c = champ == null ? this.champ : champ, k = this.proximite(c);
    const l = k > 0 ? this.leve + (this.proche.leve - this.leve) * k : this.leve;
    if (!this.inclinaison) return l;
    const e = this.elevation(c) * 180 / Math.PI, t = Math.max(0, Math.min(1, (24 - e) / 16));
    return l + (Math.max(l, CameraIle.ORBITE.leve) - l) * t * t * (3 - 2 * t);
  }
  orbiter(dx, dy) {
    if (this.mode !== 'exploration' || this.trans || this.passageRegard) return;
    const fixe = this.regards[this.regard].fixe, O = CameraIle.ORBITE;
    const o = this.orbite || (this.orbite = { az: this.azimut, incl: this.inclinaison });
    const t = typeof performance === 'object' ? performance.now() : 0, dtv = (t - this.tOrbite) / 1000;
    if (!(dtv > 0 && dtv < 0.12)) this.vitOrbite = 0;
    else if (!fixe) this.vitOrbite += (dx * O.tour / dtv - this.vitOrbite) * Math.min(1, dtv / 0.05);
    this.tOrbite = t; this.orbiteVue = t; this.inertie = 0; this.tourPad = 0;
    if (!fixe && dx) { o.az = this.azimut + CameraIle.arc(o.az + dx * O.tour - this.azimut); this.animAz = null; }
    if (!fixe && dy) {
      const base = this.elevationSans() * 180 / Math.PI;
      o.incl = Math.max(O.min - base, Math.min(O.max - base, o.incl + dy * O.pente));
    }
    this.changed();
  }
  lacherOrbite() {
    const t = typeof performance === 'object' ? performance.now() : 0;
    const v = t - this.tOrbite < 100 ? this.vitOrbite : 0;
    this.vitOrbite = 0;
    if (this.mode !== 'exploration' || this.regards[this.regard].fixe || CameraIle.calme() || Math.abs(v) < CameraIle.ORBITE.elan[0]) return;
    this.inertie = Math.max(-CameraIle.ORBITE.elan[1], Math.min(CameraIle.ORBITE.elan[1], v));
  }
  suivrePad(lat, avant, dt) {
    const P = CameraIle.PAD, t = typeof performance === 'object' ? performance.now() : 0;
    if (this.mode !== 'exploration' || this.trans || this.passageRegard || this.retourCarte || this.regards[this.regard].fixe || this.orbite || this.inertie || t - this.orbiteVue < P.attente) { this.tourPad = 0; return; }
    const voulu = -P.tour * Math.max(-1, Math.min(1, lat || 0)) * ((avant || 0) < -0.3 ? P.recul : 1);
    const k = dt > 0 ? 1 - Math.exp(-dt / P.lissage) : 1;
    this.tourPad += (voulu - this.tourPad) * k;
    if (Math.abs(this.tourPad) < 2e-3 && !voulu) { this.tourPad = 0; return; }
    this.azimut = CameraIle.arc(this.azimut + this.tourPad * Math.min(dt, 0.1));
    this.animAz = null;
    this.changed();
  }
  suivrePente(dt, now) {
    const R = this.regards[this.regard], T = this.terrain, jv = this.vitJoueur, n = Math.hypot(jv.x, jv.y), P = CameraIle.PENTE;
    if (this.mode !== 'exploration' || !R || !R.suit || R.fixe || this.trans || this.passageRegard || this.orbite || this.inertie || this.tourPad ||
        now - this.orbiteVue < P.attente || n < 1 || !T || typeof T.marcheA !== 'function') return;
    const ux = jv.x / n, uy = jv.y / n, x = this.joueur.x, y = this.joueur.y;
    const ha = T.marcheA(x - ux * 1.5, y - uy * 1.5), hb = T.marcheA(x + ux * 2.5, y + uy * 2.5);
    const pente = Number.isFinite(ha) && Number.isFinite(hb) ? Math.abs(hb - ha) / 4 : 0;
    const cache = (this.elevSol || 0) > 0.05 || Number.isFinite(this.dSol);
    const force = Math.max(Math.max(0, Math.min(1, (pente - P.seuil) / P.plein)), cache ? P.cache : 0);
    if (force <= 0) return;
    const da = CameraIle.arc(Math.atan2(-ux, -uy) - this.azimut);
    if (Math.abs(da) > P.max * Math.PI / 180) return;
    const v = Math.max(-P.vitesse, Math.min(P.vitesse, da / P.lissage)) * force;
    this.azimut = CameraIle.arc(this.azimut + v * Math.min(dt, 0.1));
    this.animAz = null;
  }
  elevationSans() { const i = this.inclinaison; this.inclinaison = 0; const e = this.elevation(); this.inclinaison = i; return e; }
  bornerChamp(c) { return Math.max(this.champs[0], Math.min(this.champs[1], c)); }

  distance(champ) {
    if (champ == null && (this.mode === 'combat' || this.mode === 'carte' || this.trans || this.retourCarte) && this.distCourante) return this.distCourante;
    const aspect = this.vw && this.vh ? this.vw / this.vh : 1.6;
    const t = Math.tan(this.ouverture * Math.PI / 360) * aspect;
    return (champ == null ? this.champ : champ) / (2 * t);
  }

  focusRect() {
    const i = this.mode === 'carte' ? { top: 0, right: 0, bottom: 0, left: 0 } : this.insets;
    const w = Math.max(1, this.vw - i.left - i.right), h = Math.max(1, this.vh - i.top - i.bottom);
    return { x: i.left, y: i.top, w, h, cx: i.left + w / 2, cy: i.top + h / 2 };
  }

  etatExploration() { return { x: this.cible.x, y: this.cible.y, h: this.cible.h, el: this.elevationVue(), largeur: this.champ, fov: this.ouverture, leve: this.leveA(), az: this.azimut }; }
  elevationVue() { const e = this.elevation(); return this.elevSol > 0 ? Math.max(e, Math.min(CameraIle.SOL.max * Math.PI / 180, e + this.elevSol)) : e; }

  placer(etat) {
    const e = etat || (this.mode === 'carte' && this.carte ? this.etatCarte() : this.etatExploration());
    const cam = this.cam, az = e.az != null ? e.az : this.azimut;
    const aspect = this.vw && this.vh ? this.vw / this.vh : 1.6;
    let d = e.dist != null ? e.dist : e.largeur / (2 * Math.tan(e.fov * Math.PI / 360) * aspect);
    if (!etat && this.mode === 'exploration' && Number.isFinite(this.dLibre)) d = Math.min(d, this.dLibre);
    if (!etat && this.mode === 'exploration' && Number.isFinite(this.dSol)) d = Math.min(d, this.dSol);
    const hv = e.h + (e.leve || 0);
    cam.fov = e.fov;
    cam.position.set(e.x + Math.cos(e.el) * Math.sin(az) * d, hv + Math.sin(e.el) * d, e.y + Math.cos(e.el) * Math.cos(az) * d);
    const T = this.terrain;
    let solCam = Infinity;
    if (T && typeof T.marcheA === 'function') {
      let h = T.marcheA(cam.position.x, cam.position.z);
      if (!Number.isFinite(h) && typeof T.solBrutA === 'function') h = T.solBrutA(cam.position.x, cam.position.z);
      const plancher = this.mode === 'exploration' && this.regards[this.regard] && this.regards[this.regard].suit ? CameraIle.SOL.plancherDos : 3;
      if (Number.isFinite(h) && cam.position.y < h + plancher) cam.position.y = h + plancher;
      if (Number.isFinite(h)) solCam = cam.position.y - h;
    }
    cam.up.set(0, 1, 0);
    cam.lookAt(e.x, hv, e.y);
    cam.near = Math.max(1, Math.min(d * 0.25, 60, 1.2 * solCam));
    cam.far = Math.max(d * 6 + 200, this.loinMin || 0);
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


  rect() { return this.el ? this.el.getBoundingClientRect() : { left: 0, top: 0, width: this.vw, height: this.vh }; }
  clientToScreen(cx, cy) { const r = this.rect(), k = this.mode === 'carte' && this.vw && r.width ? r.width / this.vw : 1; return { x: (cx - r.left) / k, y: (cy - r.top) / k }; }

  rayon(sx, sy) {
    this._ndc.set(sx / Math.max(1, this.vw) * 2 - 1, -(sy / Math.max(1, this.vh) * 2 - 1));
    this._r.setFromCamera(this._ndc, this.courante);
    return this._r.ray;
  }

  ecranVersPlan(sx, sy, h) {
    const ray = this.rayon(sx, sy), y = h == null ? (this.mode === 'combat' && this.cadre ? this.cadre.h : this.cible.h) : h;
    const dy = ray.direction.y;
    if (Math.abs(dy) < 1e-6) return { x: this.cible.x, y: this.cible.y };
    const t = (y - ray.origin.y) / dy;
    return { x: ray.origin.x + ray.direction.x * t, y: ray.origin.z + ray.direction.z * t };
  }
  clientToWorld(cx, cy) { const s = this.clientToScreen(cx, cy); return this.ecranVersPlan(s.x, s.y); }

  versEcran(u, h, v) {
    const p = this._v.set(u, h, v).project(this.courante);
    return { x: (p.x + 1) / 2 * this.vw, y: (1 - p.y) / 2 * this.vh, z: p.z, devant: p.z < 1 && p.z > -1 };
  }
  worldToClient(u, h, v) {
    const g = this.gel;
    if (g) { const q = this._v.set(u, h, v).project(g.cam); return { x: g.rect.left + (q.x + 1) / 2 * g.vw, y: g.rect.top + (1 - q.y) / 2 * g.vh }; }
    const r = this.rect(), p = this.versEcran(u, h, v);
    return { x: r.left + p.x, y: r.top + p.y };
  }

  pixelsParU(u, h, v, jeu) {
    if (this.courante === this.ortho) return 1 / this.ortho.userData.s;
    const cam = jeu && this.gel ? this.gel.cam : this.cam;
    const vh = jeu && this.gel ? this.gel.vh : this.vh;
    const dx = u - cam.position.x, dy = h - cam.position.y, dz = v - cam.position.z;
    const fwd = this._v.set(0, 0, -1).applyQuaternion(cam.quaternion);
    const prof = Math.max(0.5, dx * fwd.x + dy * fwd.y + dz * fwd.z);
    return vh / (2 * Math.tan(cam.fov * Math.PI / 360) * prof);
  }

  dansChamp(x, y, marge) {
    if (!this.vw || !this.vh || this.mode === 'carte') return false;
    const m = marge || 0;
    const pts = [[0, 0], [this.vw, 0], [this.vw, this.vh], [0, this.vh]].map(([sx, sy]) => this.ecranVersPlan(sx, sy));
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


  user() { this.userUntil = performance.now() + 4000; this.revient = false; }

  deplacer(dx, dy) {
    this.suiviPrec = null;
    const d = this.decalage;
    let nx = d.x + dx, ny = d.y + dy;
    const n = Math.sqrt(nx * nx + ny * ny);
    if (n > 15) { nx *= 15 / n; ny *= 15 / n; }
    this.cible.x += nx - d.x; this.cible.y += ny - d.y;
    d.x = nx; d.y = ny;
    this.borner();
  }

  borner() {
    const c = this.cible, [L, H] = this.taille;
    const x = Math.max(0, Math.min(L, c.x)), y = Math.max(0, Math.min(H, c.y));
    if (x !== c.x || y !== c.y) { this.decalage.x += x - c.x; this.decalage.y += y - c.y; c.x = x; c.y = y; }
  }

  placerAvec(champ, ancre, sx, sy) {
    this.champ = this.bornerChamp(champ);
    this.placer();
    const q = this.ecranVersPlan(sx, sy);
    this.deplacer(ancre.x - q.x, ancre.y - q.y);
    this.placer();
  }

  zoomAt(clientX, clientY, factor, opts) {
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
    const fc = this.focusRect();
    s.x = fc.cx; s.y = fc.cy;
    const ancre = this.ecranVersPlan(s.x, s.y);
    this.atFit = false;
    this.user();
    if (smooth) this.anim = { champ, zoom: this.champDefaut / champ, ancre, sx: s.x, sy: s.y };
    else { this.anim = null; this.placerAvec(champ, ancre, s.x, s.y); }
    this.changed();
  }

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


  static arc(d) { return Math.atan2(Math.sin(d), Math.cos(d)); }
  static ressort(x, v, cible, w, dt) {
    const d = x - cible, e = Math.exp(-w * dt), t = (v + w * d) * dt;
    return { x: cible + (d + t) * e, v: (v - t * w) * e };
  }
  static ressortMobile(x, v, cible, vitesse, w, dt) {
    const r = CameraIle.ressort(x, v - vitesse, cible - vitesse * dt, w, dt);
    return { x: r.x + vitesse * dt, v: r.v + vitesse };
  }
  static diagonale(az) { return CameraIle.arc(Math.round((az - Math.PI / 4) / (Math.PI / 2)) * (Math.PI / 2) + Math.PI / 4); }


  poserRegard(nom) {
    const R = this.regards[nom];
    this.regard = nom;
    this.ouverture = R.ouverture; this.elevations = R.elevations.slice(); this.leve = R.leve;
    this.champs = R.champs.slice(); this.champDefaut = R.champDefaut; this.proche = R.proche || null;
    if (R.fixe) { this.azimut = CameraIle.diagonale(this.azimut); this.animAz = null; }
  }
  changerRegard(nom, immediat) {
    if (this.mode !== 'exploration' || this.trans || this.retourCarte) return null;
    const noms = Object.keys(this.regards);
    const cible = nom || noms[(noms.indexOf(this.regard) + 1) % noms.length];
    if (!this.regards[cible] || cible === this.regard) return null;
    const elVu = this.elevation() * 180 / Math.PI, aLin = this.proximite(this.champ) > 0;
    const de = { ouverture: this.ouverture, e0: aLin ? elVu : this.elevations[0], e1: aLin ? elVu : this.elevations[1], leve: this.leveA(), champ: this.champ }, az0 = this.azimut;
    this.anim = null;
    this.poserRegard(cible);
    const vers = { ouverture: this.ouverture, e0: this.elevations[0], e1: this.elevations[1], leve: this.leve, champ: this.champDefaut };
    if (cible === 'basse') { const cap = this.capDegage(); if (cap != null) { if (immediat || CameraIle.calme()) this.azimut = cap; else this.animAz = cap; } }
    if (immediat || CameraIle.calme()) { this.passageRegard = null; this.champ = vers.champ; this.placer(); }
    else {
      if (this.regards[cible].fixe) { const diag = this.azimut; this.azimut = az0; this.animAz = Math.abs(CameraIle.arc(diag - az0)) < 1e-6 ? null : diag; }
      this.ouverture = de.ouverture; this.elevations = [de.e0, de.e1]; this.leve = de.leve; this.proche = null;
      this.passageRegard = { de, vers, t0: null, duree: 500 };
    }
    try { localStorage.setItem(CameraIle.CLE_REGARD, cible); } catch (e) {   }
    this.changed();
    return cible;
  }
  majRegard(now) {
    const p = this.passageRegard;
    if (!p) return;
    if (p.t0 == null) p.t0 = now;
    const u = Math.max(0, Math.min(1, (now - p.t0) / p.duree)), e = u * u * (3 - 2 * u);
    const m = (a, b) => a + (b - a) * e;
    this.ouverture = m(p.de.ouverture, p.vers.ouverture);
    this.elevations = [m(p.de.e0, p.vers.e0), m(p.de.e1, p.vers.e1)];
    this.leve = m(p.de.leve, p.vers.leve);
    this.champ = Math.exp(m(Math.log(p.de.champ), Math.log(p.vers.champ)));
    if (u >= 1) { this.passageRegard = null; this.proche = this.regards[this.regard].proche || null; }
    this.changed();
  }
  finirRegard() {
    const p = this.passageRegard;
    if (!p) return;
    this.passageRegard = null;
    this.ouverture = p.vers.ouverture; this.elevations = [p.vers.e0, p.vers.e1]; this.leve = p.vers.leve; this.champ = p.vers.champ; this.proche = this.regards[this.regard].proche || null;
    if (this.regards[this.regard].fixe && this.animAz != null) { this.azimut = this.animAz; this.animAz = null; }
  }
  majDegagement(dt) {
    const T = this.terrain;
    const basse = this.regard === 'basse';
    if (this.mode !== 'exploration' || !(basse || this.regards[this.regard].suit) || !T || typeof T.solBrutA !== 'function') { this.dLibre = Infinity; return; }
    const e = this.etatExploration(), d0 = this.distance(e.largeur), sx = Math.sin(e.az), sy = Math.cos(e.az);
    const ce = Math.cos(e.el), se = Math.sin(e.el), hv = e.h + (e.leve || 0);
    let libre = d0, plein = 0, debut = 0;
    for (let k = 1.2; k <= d0; k += 0.5) {
      const x = e.x + sx * ce * k, y = e.y + sy * ce * k, ligne = hv + se * k, sol = T.solBrutA(x, y);
      if (basse && Number.isFinite(sol) && sol > ligne - 0.4) { libre = k - 0.8; break; }
      if (this.bloque && this.bloque(x, y) && (!Number.isFinite(sol) || ligne - sol < (basse ? 6 : 3))) {
        if (!plein) debut = k;
        plein++;
        if (plein >= (basse ? 3 : 4)) { libre = debut - 0.8; break; }
      } else plein = 0;
    }
    libre = Math.max(2.4, libre);
    if (libre >= d0 - 0.01) libre = Infinity;
    const cur = Number.isFinite(this.dLibre) ? this.dLibre : d0, vise = Number.isFinite(libre) ? libre : d0;
    const tau = vise < cur ? (basse ? 0.06 : 0.12) : 0.35, nouv = cur + (vise - cur) * (dt > 0 ? 1 - Math.exp(-dt / tau) : 1);
    this.dLibre = !Number.isFinite(libre) && nouv >= d0 - 0.02 ? Infinity : nouv;
  }
  majSol(dt) {
    const T = this.terrain, S = CameraIle.SOL;
    if (this.mode !== 'exploration' || this.regard === 'basse' || this.trans || !T || typeof T.solBrutA !== 'function') { this.elevSol = 0; this.dSol = Infinity; return; }
    const base = this.elevation(), d = this.distance(this.champ);
    const ici = this.besoinSol(this.cible.x, this.cible.y, this.cible.h, base, d);
    const jv = this.vitJoueur, fx = this.cible.x + jv.x * S.anticipation, fy = this.cible.y + jv.y * S.anticipation;
    let loin = ici;
    if (Math.hypot(jv.x, jv.y) > 0.5) {
      const hf = typeof T.marcheA === 'function' ? T.marcheA(fx, fy) : NaN;
      loin = this.besoinSol(fx, fy, Number.isFinite(hf) ? this.cible.h + (hf - T.solBrutA(this.cible.x, this.cible.y)) : this.cible.h, base, d);
    }
    const k = tau => dt > 0 ? 1 - Math.exp(-dt / tau) : 1;
    const doux = !!(this.regards[this.regard] && this.regards[this.regard].suit);
    const visB = Math.min(ici.bras, loin.bras, d), d0 = Number.isFinite(this.dSol) ? this.dSol : d;
    let nd = d0 + (visB - d0) * k(visB < d0 ? S.approche : S.recul);
    if (nd > ici.bras + 0.3) nd = doux ? nd + (ici.bras + 0.3 - nd) * k(S.urgence) : ici.bras + 0.3;
    this.dSol = !Number.isFinite(Math.min(ici.bras, loin.bras)) && nd >= d - 0.02 ? Infinity : nd;
    const vis = Math.max(ici.el, loin.el) - base, cur = this.elevSol || 0;
    let v = cur + (vis - cur) * k(vis > cur ? S.montee : S.descente);
    if (v < ici.el - base - S.ecart) v = doux ? v + (ici.el - base - S.ecart - v) * k(S.urgence) : ici.el - base - S.ecart;
    this.elevSol = vis <= 0 && v < 1e-4 ? 0 : Math.max(0, v);
  }
  besoinSol(x0, y0, h, base, d) {
    const T = this.terrain, S = CameraIle.SOL, suit = !!(this.regards[this.regard] && this.regards[this.regard].suit);
    const haut = (suit ? S.maxDos : S.max) * Math.PI / 180, max = Math.min(haut, base + S.levee * Math.PI / 180);
    const r = { el: base, bras: Infinity };
    if (!(base < max)) return r;
    const sx = Math.sin(this.azimut), sy = Math.cos(this.azimut), l = this.leveA(), hv = h + l, tete = h + Math.max(l, S.tete);
    const [m0, m1] = S.marge, n = S.points;
    const libre = el => {
      const cx = x0 + Math.cos(el) * sx * d, cy = y0 + Math.cos(el) * sy * d, ch = hv + Math.sin(el) * d;
      for (let i = 1; i <= n; i++) {
        const t = i / n, sol = T.solBrutA(x0 + (cx - x0) * t, y0 + (cy - y0) * t);
        if (Number.isFinite(sol) && tete + (ch - tete) * t < sol + m0 + (m1 - m0) * t) return (i - 1) / n;
      }
      return 1;
    };
    if (libre(base) === 1) return r;
    const chercher = (a, b) => { for (let k = 0; k < 8; k++) { const c = (a + b) / 2; if (libre(c) === 1) b = c; else a = c; } return b; };
    const part = libre(max);
    if (part === 1) { r.el = chercher(base, max); return r; }
    r.el = max;
    if (part * d - 1 < Math.max(S.brasMin, S.brasPart * d) && max < haut) r.el = libre(haut) === 1 ? chercher(max, haut) : haut;
    const reste = libre(r.el);
    if (reste < 1) r.bras = Math.max(2.4, reste * d - 1);
    return r;
  }

  horizonCache(az, x, y, h) {
    const T = this.terrain;
    if (!T || typeof T.solBrutA !== 'function') return 0;
    const R = this.regards.basse, d = this.distance(R.champDefaut), oeil = h + R.leve + Math.sin(R.elevations[0] * Math.PI / 180) * d;
    const vx = -Math.sin(az), vy = -Math.cos(az);
    let pire = -Infinity;
    for (let k = 4; k <= 40; k += 2) {
      const sol = T.solBrutA(x + vx * k, y + vy * k);
      if (Number.isFinite(sol)) pire = Math.max(pire, Math.atan2(sol - oeil, k + d));
    }
    return Number.isFinite(pire) ? pire : 0;
  }
  capDegage() {
    const x = this.joueur.x, y = this.joueur.y, h = this.joueur.h || 0;
    const ici = this.horizonCache(this.azimut, x, y, h);
    if (ici < 0.2) return null;
    let meilleur = null, m = ici - 0.05;
    for (let i = 1; i < 8; i++) {
      const az = CameraIle.arc(this.azimut + i * Math.PI / 4), c = this.horizonCache(az, x, y, h);
      if (c < m) { m = c; meilleur = az; }
    }
    return meilleur;
  }
  partIso() {
    if (this.mode !== 'exploration') return 0;
    const j = Math.min(this.regards.jeu.ouverture, this.regards.basse.ouverture), i = this.regards.iso.ouverture;
    return Math.max(0, Math.min(1, (j - this.ouverture) / (j - i)));
  }

  tourner(da) { if (da) this.tournerA(this.azimut + da); }
  tournerA(az) {
    if (this.mode === 'combat' || this.mode === 'carte' || this.trans || !Number.isFinite(az)) return;
    if (this.regards[this.regard].fixe) return;
    this.animAz = null;
    if (this.orbite) this.orbite.az = null;
    const a = CameraIle.arc(az);
    if (a === this.azimut) return;
    this.azimut = a;
    this.placer();
    this.changed();
  }
  tournerVers(az) {
    if (this.mode === 'carte') { this.carteTournerVers(az); return; }
    if (this.mode === 'combat' || this.trans || !Number.isFinite(az)) return;
    if (this.regards[this.regard].fixe) return;
    if (CameraIle.calme()) { this.tournerA(az); return; }
    if (this.orbite) this.orbite.az = null;
    this.animAz = CameraIle.arc(az);
  }

  fit(animate) {
    this.suiviPrec = null;
    if (this.mode === 'carte') { this.carteRecentrer(); return; }
    if (this.trans) return;
    this.userUntil = 0;
    if (this.mode === 'combat') {
      const c = this.cadre;
      if (!c) return;
      this.atFit = true;
      const sv = this.suiviCombat, j = sv ? this.vueJeu(sv.u, sv.h, sv.v) : this.vueJeu();
      if (animate && !CameraIle.calme()) this.anim = { fit: true, s: j.s, zoom: 1 / j.s, px: j.px, py: j.py };
      else { this.anim = null; this.vue = j; this.placerOrtho(); }
      this.changed();
      return;
    }
    this.revient = true;
    this.inertie = 0; this.tourPad = 0;
    if (animate && !CameraIle.calme()) {
      this.anim = { champ: this.champDefaut, zoom: 1, recentre: true };
      this.animAz = this.azimut === this.azimutDefaut ? null : this.azimutDefaut;
      this.orbite = this.inclinaison ? { az: null, incl: 0 } : null;
    } else {
      this.anim = null; this.animAz = null; this.orbite = null; this.inclinaison = 0;
      this.champ = this.champDefaut;
      this.azimut = this.azimutDefaut;
      this.decalage.x = 0; this.decalage.y = 0;
      this.cible.x = this.joueur.x; this.cible.y = this.joueur.y;
      this.vitCible.x = 0; this.vitCible.y = 0;
      this.placer();
    }
    this.changed();
  }

  sauter(x, y, h) {
    this.suiviPrec = null;
    this.finirRegard();
    if (x != null) { this.joueur.x = x; this.joueur.y = y; this.joueur.h = h || 0; }
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


  entrerCombat(aire, immediat) {
    this.finirRegard();
    if (this.mode === 'carte') this.sortirCarte(true);
    this.retourCarte = null;
    const premier = this.mode !== 'combat';
    this.inertie = 0; this.tourPad = 0;
    if (premier) { this.avantCombat = { champ: this.champ }; this.azimutCombat = CameraIle.diagonale(this.azimut); this.animAz = null; }
    const de = this.trans && this.dernierEtat ? this.dernierEtat : (premier ? this.etatExploration() : null);
    this.mode = 'combat';
    this.aire = aire;
    this.anim = null; this.userUntil = 0; this.revient = false;
    this.dernierFocus = null;
    this.cadre = this.cadrerCombat();
    this.vue = this.cadre ? this.vueJeu(this.joueur.x, this.joueur.h, this.joueur.y) : null;
    this.fitZoom = this.cadre ? 1 / this.cadre.sJeu : 0;
    this.atFit = true;
    this.trans = de && this.cadre && !immediat && !CameraIle.calme() ? { sens: 'aller', t0: null, duree: 600, de } : null;
    if (!this.trans) { this.fondu = 1; this.placerOrtho(); }
    this.changed();
  }

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

  setTactique(oui) {
    oui = !!oui;
    if (oui === this.tactique) return;
    this.tactique = oui;
    if (this.mode === 'combat') { this.recadrer(); this.changed(); }
  }

  cadrerCombat() {
    const a = this.aire;
    if (!a || !this.vw || !this.vh) return null;
    const el = this.tactique ? this.elevationTactique : this.elevationCombat, az = this.azimutCombat;
    const dir = [Math.cos(el) * Math.sin(az), Math.sin(el), Math.cos(el) * Math.cos(az)];
    const right = [Math.cos(az), 0, -Math.sin(az)];
    const up = [-Math.sin(el) * Math.sin(az), Math.cos(el), -Math.sin(el) * Math.cos(az)];
    const cx = a.x0 + a.w / 2, cy = a.y0 + a.h / 2, ch = a.hMoy;
    let x0 = Infinity, x1 = -Infinity, y0 = Infinity, y1 = -Infinity;
    const etendre = (u, v, h) => {
      const dx = u - cx, dy = h - ch, dz = v - cy;
      const vx = dx * right[0] + dy * right[1] + dz * right[2], vy = dx * up[0] + dy * up[1] + dz * up[2];
      if (vx < x0) x0 = vx; if (vx > x1) x1 = vx; if (vy < y0) y0 = vy; if (vy > y1) y1 = vy;
    };
    if (a.points && a.points.length) for (const [u, v, h] of a.points) { etendre(u, v, h); etendre(u, v, h + 1.9); }
    else for (const [u, v] of [[a.x0, a.y0], [a.x0 + a.w, a.y0], [a.x0, a.y0 + a.h], [a.x0 + a.w, a.y0 + a.h]]) { etendre(u, v, a.hMin); etendre(u, v, a.hMax + 1.9); }
    const f = this.focusRect(), m = Math.min(this.vw, this.vh) * CameraIle.MARGE_COMBAT;
    let sFit = Math.max((x1 - x0) / Math.max(40, f.w - 2 * m), (y1 - y0) / Math.max(40, f.h - 2 * m));
    if (CameraIle.telephone() && (y1 - y0) / Math.max(40, f.h - 2 * m) > (x1 - x0) / Math.max(40, f.w - 2 * m)) sFit *= 0.92;
    let vcx = (x0 + x1) / 2, vcy = (y0 + y1) / 2;
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
    const tCase = CameraIle.CASE_COMBAT[CameraIle.telephone() ? 0 : 1];
    const sJeu = Math.min(sFit, Math.SQRT2 / tCase);
    return { cx, cy, h: ch, el, dir, right, up, D: 120, x0, x1, y0, y1, vcx, vcy, sFit, sJeu, m };
  }
  vueJeu(u, h, v) {
    const c = this.cadre, s = c.sJeu, f = this.focusRect();
    if (!(s < c.sFit * 0.995) || u == null || !Number.isFinite(u)) return { s, px: c.vcx, py: c.vcy };
    const q = this.versVue(u, h || c.h, v);
    const borne = (x, a, b, demi) => (b - a <= 2 * demi ? (a + b) / 2 : Math.max(a + demi, Math.min(b - demi, x)));
    return { s, px: borne(q.x, c.x0, c.x1, Math.max(0, f.w / 2 - c.m) * s), py: borne(q.y, c.y0, c.y1, Math.max(0, f.h / 2 - c.m) * s) };
  }

  setCoin(coin) {
    const n = coin && coin.w > 0 && coin.h > 0 ? { w: Math.round(coin.w), h: Math.round(coin.h) } : null;
    const o = this.coin;
    if ((!n && !o) || (n && o && n.w === o.w && n.h === o.h)) return;
    this.coin = n;
    if (this.mode === 'combat') { this.recadrer(); this.changed(); }
  }

  recadrer() {
    if (this.mode !== 'combat' || !this.aire) return;
    const ancien = this.cadre, v = this.vue;
    const k = ancien && v ? ancien.sFit / v.s : 1;
    const centre = ancien && v ? this.depuisVue(v.px, v.py) : null;
    this.cadre = this.cadrerCombat();
    if (!this.cadre) return;
    const c = this.cadre;
    this.fitZoom = 1 / c.sJeu;
    if (this.atFit || !centre) { const sv = this.suiviCombat, cj = centre || {}; this.vue = sv ? this.vueJeu(sv.u, sv.h, sv.v) : this.vueJeu(cj.u, cj.h, cj.v); }
    else { const q = this.versVue(centre.u, centre.h, centre.v); this.vue = { s: c.sFit / k, px: q.x, py: q.y }; this.bornerVue(); }
    if (this.anim && this.anim.fit) { const j = this.vue; this.anim = { fit: true, s: j.s, zoom: 1 / j.s, px: j.px, py: j.py }; }
    else this.anim = null;
    if (!this.trans) this.placerOrtho();
  }

  versVue(u, h, v) {
    const c = this.cadre, dx = u - c.cx, dy = h - c.h, dz = v - c.cy;
    return { x: dx * c.right[0] + dy * c.right[1] + dz * c.right[2], y: dx * c.up[0] + dy * c.up[1] + dz * c.up[2] };
  }
  depuisVue(x, y) {
    const c = this.cadre;
    return { u: c.cx + c.right[0] * x + c.up[0] * y, h: c.h + c.right[1] * x + c.up[1] * y, v: c.cy + c.right[2] * x + c.up[2] * y };
  }
  vueSous(sx, sy) {
    const v = this.vue, f = this.focusRect();
    return { x: v.px + (sx - f.cx) * v.s, y: v.py - (sy - f.cy) * v.s };
  }

  bornerEchelle(s) { const c = this.cadre; return Math.max(Math.min(c.sFit / 2.5, c.sJeu / 1.8), Math.min(this.echelleMax(), s)); }
  echelleMax() {
    const c = this.cadre, D = CameraIle.RECUL_COMBAT;
    if (!this.vw || !this.vh) return c.sFit / 0.75;
    return Math.max(c.sFit, D[0] / this.vw, D[1] / this.vh);
  }
  bornerVue() {
    const c = this.cadre, v = this.vue;
    if (!c || !v) return;
    v.s = this.bornerEchelle(v.s);
    v.px = Math.max(c.x0, Math.min(c.x1, v.px));
    v.py = Math.max(c.y0, Math.min(c.y1, v.py));
  }
  zoomerVue(s, q, sx, sy) {
    const v = this.vue, f = this.focusRect();
    v.s = this.bornerEchelle(s);
    v.px = q.x - (sx - f.cx) * v.s;
    v.py = q.y + (sy - f.cy) * v.s;
    this.bornerVue();
    this.placerOrtho();
  }

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

  etatOrtho() {
    const v = this.vue, p = this.depuisVue(v.px, v.py);
    return { x: p.u, y: p.v, h: p.h, el: this.cadre.el, largeur: this.vw * v.s, fov: 2, leve: 0, az: this.azimutCombat };
  }
  etatRetour() {
    return { x: this.joueur.x, y: this.joueur.y, h: this.joueur.h, el: this.elevationVue(), largeur: this.champ, fov: this.ouverture, leve: this.leveA(), az: this.azimut };
  }

  suivreCombat(focus, u, h, v) { this.suiviCombat = u == null ? null : { focus, u, h, v }; }


  update(now, joueur, marche) {
    const ecoule = this.lastStep ? Math.max(0, (now - this.lastStep) / 1000) : 0.016;
    const dt = Math.min(0.1, ecoule);
    this.lastStep = now;
    if (joueur) {
      const jp = this.joueurPrec, jv = this.vitJoueur;
      if (jp && dt > 0) {
        const vx = (joueur.x - jp.x) / dt, vy = (joueur.y - jp.y) / dt;
        const k = 1 - Math.exp(-dt / (marche ? CameraIle.SUIVI.lissageMarche : CameraIle.SUIVI.arret));
        if (Math.hypot(vx, vy) < 20 && ecoule < 0.25) { jv.x += (vx - jv.x) * k; jv.y += (vy - jv.y) * k; }
        else { jv.x = 0; jv.y = 0; this.suiviPrec = null; }
      }
      this.joueurPrec = { x: joueur.x, y: joueur.y };
      this.joueur.x = joueur.x; this.joueur.y = joueur.y; this.joueur.h = joueur.h;
    }
    if (this.trans) { this.suiviPrec = null; return this.majPassage(now); }
    if (this.mode === 'combat') { this.suiviPrec = null; return this.majCombat(dt, now); }
    if (this.mode === 'carte') { this.suiviPrec = null; return this.majCarte(dt, now); }
    const avant = { x: this.cible.x, y: this.cible.y, h: this.cible.h, c: this.champ, az: this.azimut };
    if (marche && !this.focusMarche) this.revient = true;
    this.focusMarche = !!marche;
    if (this.userUntil && now > this.userUntil) { this.userUntil = 0; this.revient = true; }
    const d = this.decalage;
    if (this.revient && (d.x || d.y)) {
      const k = Math.exp(-dt * CameraIle.SUIVI.retour);
      d.x *= k; d.y *= k;
      if (d.x * d.x + d.y * d.y < 0.0004) { d.x = 0; d.y = 0; this.revient = false; }
    }
    if (this.passageRegard) this.majRegard(now);
    this.majDegagement(dt);
    const a = this.anim;
    if (a) {
      const t = 1 - Math.exp(-dt / CameraIle.SUIVI.zoom);
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
    const O = this.orbite;
    if (O) {
      const k = 1 - Math.exp(-dt / CameraIle.ORBITE.lissage);
      let fini = true;
      if (O.az != null) { const da = CameraIle.arc(O.az - this.azimut); if (Math.abs(da) < 0.0005) this.azimut = CameraIle.arc(O.az); else { this.azimut = CameraIle.arc(this.azimut + da * k); fini = false; } }
      const di = O.incl - this.inclinaison;
      if (Math.abs(di) < 0.01) this.inclinaison = O.incl; else { this.inclinaison += di * k; fini = false; }
      if (fini) this.orbite = null;
      this.changed();
    }
    if (this.inertie && !this.orbite) {
      if (this.regards[this.regard].fixe || this.passageRegard) this.inertie = 0;
      else {
        this.azimut = CameraIle.arc(this.azimut + this.inertie * dt);
        this.inertie *= Math.exp(-dt / CameraIle.ORBITE.elan[2]);
        if (Math.abs(this.inertie) < 0.05) this.inertie = 0;
        this.animAz = null;
        this.changed();
      }
    }
    if (this.animAz != null) {
      const da = CameraIle.arc(this.animAz - this.azimut);
      if (Math.abs(da) < 0.003) { this.azimut = this.animAz; this.animAz = null; } else this.azimut = CameraIle.arc(this.azimut + da * (1 - Math.exp(-dt / 0.15)));
      this.changed();
    }
    const S = CameraIle.SUIVI, jv = this.vitJoueur, nv = Math.hypot(jv.x, jv.y);
    const calme = CameraIle.calme(), av = calme ? 0 : Math.min(S.avanceMax, this.champ * 0.045, nv * S.avance);
    const cx = this.joueur.x + d.x + (nv > 1e-3 ? jv.x / nv * av : 0), cy = this.joueur.y + d.y + (nv > 1e-3 ? jv.y / nv * av : 0);
    const prec = this.suiviPrec, vc = this.vitCible;
    const vx = prec && dt > 0 ? (cx - prec.x) / dt : 0, vy = prec && dt > 0 ? (cy - prec.y) / dt : 0;
    const rx = CameraIle.ressortMobile(this.cible.x, vc.x, cx, vx, S.raideur, dt);
    const ry = CameraIle.ressortMobile(this.cible.y, vc.y, cy, vy, S.raideur, dt);
    this.suiviPrec = { x: cx, y: cy };
    this.cible.x = rx.x; vc.x = rx.v;
    this.cible.y = ry.x; vc.y = ry.v;
    this.cible.h += (this.joueur.h - this.cible.h) * (1 - Math.exp(-dt * 5));
    this.borner();
    const solAvant = this.elevSol;
    this.suivrePente(dt, now);
    this.majSol(dt);
    this.placer();
    const fit = Math.hypot(d.x, d.y) < 0.5 && Math.abs(this.champ / this.champDefaut - 1) < 0.02 && Math.abs(CameraIle.arc(this.azimut - this.azimutDefaut)) < 0.01;
    if (fit !== this.atFit) { this.atFit = fit; this.changed(); }
    if (this.retourCarte) { this.majRetourCarte(now); return true; }
    return Math.abs(avant.x - this.cible.x) + Math.abs(avant.y - this.cible.y) + Math.abs(avant.h - this.cible.h) > 1e-4 || avant.c !== this.champ || avant.az !== this.azimut || Math.abs(solAvant - this.elevSol) > 1e-5;
  }

  majPassage(now) {
    const tr = this.trans;
    if (tr.t0 == null) tr.t0 = now;
    const t = Math.min(1, Math.max(0, (now - tr.t0) / tr.duree)), e = t * t * (3 - 2 * t);
    if (tr.sens === 'aller' && (!this.cadre || !this.vue)) { this.trans = null; return false; }
    const A = tr.de, B = tr.sens === 'aller' ? this.etatOrtho() : this.etatRetour();
    const L = (a, b) => a + (b - a) * e, G = (a, b) => Math.exp(Math.log(a) + (Math.log(b) - Math.log(a)) * e);
    const etat = { x: L(A.x, B.x), y: L(A.y, B.y), h: L(A.h, B.h), el: L(A.el, B.el), largeur: G(A.largeur, B.largeur), fov: G(A.fov, B.fov), leve: L(A.leve || 0, B.leve || 0) };
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
      if (sv && v.s < c.sFit / 1.02 && !(this.userUntil && now < this.userUntil)) {
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
    const fit = Math.abs(c.sJeu / v.s - 1) < 0.02 && (c.sJeu < c.sFit * 0.995 || Math.hypot(v.px - c.vcx, v.py - c.vcy) < 0.3);
    if (fit !== this.atFit) { this.atFit = fit; this.changed(); }
    return Math.abs(avant[0] - v.s) + Math.abs(avant[1] - v.px) + Math.abs(avant[2] - v.py) > 1e-7;
  }


  entrerCarte(opts) {
    this.finirRegard();
    if (this.mode !== 'exploration' || this.trans) return false;
    opts = opts || {};
    const C = CameraIle.CARTE;
    const depart = Object.assign({}, this.etatAffiche || this.etatExploration());
    this.retourCarte = null;
    this.gel = { cam: this.cam.clone(), rect: this.rect(), vw: this.vw, vh: this.vh };
    this.elJeu = this.el;
    if (opts.el) this.el = opts.el;
    this.mode = 'carte';
    this.anim = null; this.animAz = null; this.userUntil = 0; this.revient = false; this.inertie = 0; this.tourPad = 0;
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

  majRetourCarte(now) {
    const r = this.retourCarte, B = this.etatAffiche;
    if (r.t0 == null) r.t0 = now;
    const t = Math.min(1, Math.max(0, (now - r.t0) / r.duree)), e = t * t * (3 - 2 * t);
    r.progres = 1 - e;
    if (t >= 1) { this.retourCarte = null; this.changed(); return; }
    this.placer(CameraIle.melange(r.de, B, e));
  }

  static melange(A, B, e) {
    const L = (a, b) => a + (b - a) * e, G = (a, b) => Math.exp(Math.log(a) + (Math.log(b) - Math.log(a)) * e);
    return { x: L(A.x, B.x), y: L(A.y, B.y), h: L(A.h, B.h), dist: G(A.dist, B.dist), el: L(A.el, B.el), az: A.az + CameraIle.arc(B.az - A.az) * e, fov: G(A.fov, B.fov), leve: L(A.leve || 0, B.leve || 0) };
  }

  elevationCarte(dist) {
    const k = this.carte, C = CameraIle.CARTE, [e0, e1] = C.elevation;
    const t = k ? Math.max(0, Math.min(1, Math.log(dist / (C.min * k.D0)) / Math.log(1 / C.min))) : 1;
    return (e0 + (e1 - e0) * t) * Math.PI / 180;
  }
  etatDe(s) { return { x: s.x, y: s.y, h: this.carte ? this.carte.h : 0, dist: s.dist, el: this.elevationCarte(s.dist), az: s.az, fov: CameraIle.CARTE.ouverture, leve: 0 }; }
  etatCarte() { return this.etatDe(this.carte.cur); }

  poserCam(cam, e) {
    const aspect = this.vw && this.vh ? this.vw / this.vh : 1.6, d = e.dist, hv = e.h + (e.leve || 0);
    cam.fov = e.fov; cam.aspect = aspect;
    cam.position.set(e.x + Math.cos(e.el) * Math.sin(e.az) * d, hv + Math.sin(e.el) * d, e.y + Math.cos(e.el) * Math.cos(e.az) * d);
    cam.up.set(0, 1, 0);
    cam.lookAt(e.x, hv, e.y);
    cam.near = Math.max(1, Math.min(d * 0.25, 60)); cam.far = Math.max(d * 6 + 200, this.loinMin || 0);
    cam.clearViewOffset();
    cam.updateProjectionMatrix();
    cam.updateMatrixWorld(true);
  }

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

  bornerCarte() {
    const k = this.carte, b = k.bornes, C = CameraIle.CARTE;
    for (const s of [k.cur, k.des]) {
      s.x = Math.max(b.x0, Math.min(b.x1, s.x)); s.y = Math.max(b.y0, Math.min(b.y1, s.y));
      s.dist = Math.max(C.min * k.D0, Math.min(C.max * k.D0, s.dist));
    }
  }

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
  carteRelacher() {
    const k = this.carte;
    if (!k) return;
    if (performance.now() - k.panT < 90 && Math.hypot(k.vx, k.vy) > 60 && !CameraIle.calme()) k.inertie = { vx: k.vx, vy: k.vy };
    k.vx = 0; k.vy = 0;
  }

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

  carteSol(cx, cy) {
    const k = this.carte;
    if (!k) return { x: 0, y: 0 };
    const s = this.clientToScreen(cx, cy);
    return this.solSous(s.x, s.y, this.etatDe(k.cur)) || { x: k.cur.x, y: k.cur.y };
  }

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

  carteVoler(x, y, dist) {
    const k = this.carte;
    if (!k || k.vol) return;
    k.inertie = null;
    k.des.x = x; k.des.y = y;
    k.des.dist = dist || CameraIle.CARTE.approche * k.D0;
    this.bornerCarte();
    if (CameraIle.calme()) { Object.assign(k.cur, k.des); this.placer(); }
  }
  carteRecentrer() {
    const k = this.carte;
    if (!k || k.vol) return;
    this.carteVoler(k.centre[0], k.centre[1], k.D0);
    this.carteTournerVers(0);
  }

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

  survolCarte() {
    const k = this.carte, r = this.retourCarte, e = this.etatAffiche;
    if ((!k && !r) || !e) return null;
    const aspect = this.vw && this.vh ? this.vw / this.vh : 1.6;
    const largeur = e.dist * 2 * Math.tan(e.fov * Math.PI / 360) * aspect;
    return { dist: e.dist, largeur, D0: k ? k.D0 : r.D0, progres: k ? k.progres : r.progres, carte: !!k, vol: !!(k && k.vol), arrivee: k ? k.arrivee : 0, x: e.x, y: e.y };
  }

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


  on(fn) { this.listeners.add(fn); return () => this.listeners.delete(fn); }

  state() { return { zoom: this.zoom, x: this.vise.x, y: this.vise.y, fitZoom: this.fitZoom, atFit: this.atFit, width: this.vw, height: this.vh, champ: this.champ, mode: this.mode, passage: !!this.trans, carte: !!this.carte, regard: this.regard }; }

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
    if (this.muette || this.mode === 'carte') return;
    const d = this.state();
    for (const fn of this.listeners) { try { fn(d); } catch (e) { console.error(e); } }
    try { window.dispatchEvent(new CustomEvent('veylan:camera', { detail: d })); } catch (e) {   }
  }

  static calme() {
    try { return matchMedia('(prefers-reduced-motion: reduce)').matches; } catch (e) { return false; }
  }
}

CameraIle.CLE_REGARD = 'veylan.regard.v2';
CameraIle.REGARD_DEFAUT = 'dos';
CameraIle.CARTE = { ouverture: 30, elevation: [50, 74], min: 0.11, max: 3.55, approche: 0.41, depart: 0.9, retour: 0.7, marge: 0.05 };
CameraIle.RECUL_COMBAT = [32, 16.75];
CameraIle.MARGE_COMBAT = 0.06;
CameraIle.CASE_COMBAT = [50, 60];
CameraIle.SUIVI = { raideur: 7, avance: 0.18, avanceMax: 1.25, lissageMarche: 0.22, arret: 0.12, retour: 3.2, zoom: 0.17 };
CameraIle.ORBITE = { tour: 0.006, pente: 0.135, min: 6, max: 72, leve: 2.6, lissage: 0.09, elan: [0.6, 4, 0.28] };
CameraIle.PAD = { tour: 0.62, recul: 0.35, lissage: 0.3, attente: 1000 };
CameraIle.SOL = { tete: 1.4, marge: [0.4, 3], points: 24, montee: 0.25, descente: 0.7, ecart: 0.035, max: 76, levee: 30, anticipation: 0.6, approche: 0.2, recul: 0.5, brasMin: 6, brasPart: 0.3,
  maxDos: 72, urgence: 0.07, plancherDos: 1.8 };
CameraIle.PENTE = { attente: 2000, seuil: 0.18, plein: 0.25, cache: 0.6, vitesse: 1.6, lissage: 0.45, max: 150 };
