class Visionneuse3D {
  constructor(el, id, o) {
    this.el = el; this.id = id; this.o = o || {};
    this.role = 'repos'; this.debut = performance.now();
    this.azimut = 28; this.haut = 14; this.distance = 1; this.libre = performance.now();
    this.vivant = true; this.roles = [];
    this.pret = this.charger();
  }

  async charger() {
    if (typeof IleCharge !== 'object' || !IleCharge.webgl || !IleCharge.webgl()) throw new Error('WebGL indisponible');
    const THREE = await IleCharge.three();
    await IleCharge.peauScript();
    if (!this.vivant) return;
    if (typeof IlePeau !== 'object' || !IlePeau.PEAUX[this.id]) throw new Error('pas de peau pour ' + this.id);
    const rendu = this.rendu = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    rendu.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));
    rendu.outputEncoding = THREE.sRGBEncoding;
    rendu.setClearColor(0x000000, 0);
    rendu.domElement.className = 'vy-b3d__toile';
    this.el.appendChild(rendu.domElement);
    const scene = this.scene = new THREE.Scene();
    const hemi = new THREE.HemisphereLight(new THREE.Color('#c6d4ef'), new THREE.Color('#544b3c'), 0.66);
    const cle = new THREE.DirectionalLight(new THREE.Color('#fff2df'), 1.28); cle.position.set(-50, 77, -30);
    const chaud = new THREE.DirectionalLight(new THREE.Color('#ffd2a0'), 0.3); chaud.position.set(60, 35, 70);
    const contre = new THREE.DirectionalLight(new THREE.Color('#9fd8ff'), 0.42); contre.position.set(10, 30, -90);
    scene.add(hemi, cle, chaud, contre);
    const socle = new THREE.Mesh(new THREE.CircleGeometry(1, 64), new THREE.MeshBasicMaterial({ color: 0x0b1222, transparent: true, opacity: 0.55 }));
    socle.rotation.x = -Math.PI / 2;
    const anneau = new THREE.Mesh(new THREE.RingGeometry(0.97, 1.0, 96), new THREE.MeshBasicMaterial({ color: 0xddaa72, transparent: true, opacity: 0.75, side: THREE.DoubleSide }));
    anneau.rotation.x = -Math.PI / 2; anneau.position.y = 0.002;
    this.socle = new THREE.Group(); this.socle.add(socle, anneau); scene.add(this.socle);
    this.camera = new THREE.PerspectiveCamera(30, 1, 0.05, 100);
    const M = this.M = await IlePeau.charger(THREE, this.id);
    if (!this.vivant) { M.liberer(); return; }
    this.ex = M.prendre(); scene.add(this.ex.racine);
    const H = M.P.hauteur || 1.5;
    this.socle.scale.setScalar(Math.max(0.6, (M.P.ombre || 0.6) * 1.35 * Math.max(1, H / 1.6)));
    this.roles = ['placement', 'repos', 'marche', 'sort', 'coup', 'victoire', 'mort'].filter(r => M.P.clips[r] && (r !== 'victoire' || M.clips[(M.P.clips.victoire.nom || M.P.clips.victoire)]));
    this.brancher();
    this.taille();
    if (typeof ResizeObserver === 'function') { this.ro = new ResizeObserver(() => this.taille()); this.ro.observe(this.el); }
    const boucle = now => { if (!this.vivant) return; this.image(now); this.raf = requestAnimationFrame(boucle); };
    this.raf = requestAnimationFrame(boucle);
    return this;
  }

  taille() {
    if (!this.rendu) return;
    const w = Math.max(1, this.el.clientWidth), h = Math.max(1, this.el.clientHeight);
    this.rendu.setSize(w, h, false);
    this.camera.aspect = w / h; this.camera.updateProjectionMatrix();
  }

  brancher() {
    const el = this.el, doigts = new Map();
    let glisse = null, pince = null;
    const bouge = () => { this.libre = performance.now() + 2500; };
    this.ecoute = [
      ['pointerdown', e => { if (e.target.closest('button')) return; doigts.set(e.pointerId, { x: e.clientX, y: e.clientY }); try { el.setPointerCapture(e.pointerId); } catch (err) {   }
        if (doigts.size === 1) glisse = { x: e.clientX, y: e.clientY, a: this.azimut, h: this.haut };
        if (doigts.size === 2) { const [p, q] = [...doigts.values()]; pince = { d: Math.hypot(p.x - q.x, p.y - q.y), v: this.distance }; glisse = null; }
        bouge(); }],
      ['pointermove', e => { if (!doigts.has(e.pointerId)) return; doigts.set(e.pointerId, { x: e.clientX, y: e.clientY });
        if (pince && doigts.size === 2) { const [p, q] = [...doigts.values()]; this.distance = Math.max(0.45, Math.min(2.2, pince.v * pince.d / Math.max(20, Math.hypot(p.x - q.x, p.y - q.y)))); }
        else if (glisse) { this.azimut = glisse.a - (e.clientX - glisse.x) * 0.45; this.haut = Math.max(-4, Math.min(62, glisse.h + (e.clientY - glisse.y) * 0.3)); }
        bouge(); }],
      ['pointerup', e => { doigts.delete(e.pointerId); if (doigts.size < 2) pince = null; if (!doigts.size) glisse = null; }],
      ['pointercancel', e => { doigts.delete(e.pointerId); pince = null; glisse = null; }],
      ['wheel', e => { e.preventDefault(); this.distance = Math.max(0.45, Math.min(2.2, this.distance * (e.deltaY > 0 ? 1.1 : 0.91))); bouge(); }],
    ];
    for (const [t, f] of this.ecoute) el.addEventListener(t, f, t === 'wheel' ? { passive: false } : undefined);
  }

  jouer(role) { if (this.roles.includes(role)) { this.role = role; this.debut = performance.now(); } }

  image(now) {
    const M = this.M, ex = this.ex, role = this.role, t = now - this.debut;
    const D = M.P.durees || {}, H = M.P.hauteur || 1.5;
    if (now > this.libre && !this.o.fixe) this.azimut += 0.06;
    let geste = null, bouge = false, vitesse = 0;
    if (role === 'marche') { bouge = true; vitesse = ((M.P.clips.marche && M.P.clips.marche.vitesse) || 0.5) * H; }
    if (role === 'sort' || role === 'coup' || role === 'mort' || role === 'placement') {
      const d = role === 'coup' ? 600 : (D[role] || 1000), cycle = d + (role === 'mort' ? 1600 : 900), x = (t % cycle) / d;
      geste = x < 1 || role === 'mort' ? { type: role, t: Math.min(1, x) } : null;
    }
    if (role === 'victoire') {
      M.poser(ex, 0, 0, 0, 0, now, false, 0, null, false, 1, 1);
      M.reposer(ex); M.meler(ex, M.clip('repos'), t / 1000, 1, true); M.meler(ex, M.clip('victoire'), t / 1000, 1, true); M.appliquer(ex);
    } else M.poser(ex, 0, 0, 0, 0, this.debut + t, bouge, vitesse, geste, false, 1, 1);
    const cible = H * 0.48, d = H * 3.1 * this.distance, a = this.azimut * Math.PI / 180, e = this.haut * Math.PI / 180;
    this.camera.position.set(Math.sin(a) * Math.cos(e) * d, cible + Math.sin(e) * d, Math.cos(a) * Math.cos(e) * d);
    this.camera.lookAt(0, cible, 0);
    this.rendu.render(this.scene, this.camera);
  }

  detruire() {
    this.vivant = false;
    if (this.raf) cancelAnimationFrame(this.raf);
    if (this.ro) this.ro.disconnect();
    if (this.ecoute) for (const [t, f] of this.ecoute) this.el.removeEventListener(t, f);
    if (this.M) { try { this.M.liberer(); } catch (e) {   } }
    if (this.socle) this.socle.traverse(o => { if (o.geometry) o.geometry.dispose(); if (o.material) o.material.dispose(); });
    if (this.rendu) { this.rendu.dispose(); if (this.rendu.forceContextLoss) this.rendu.forceContextLoss(); this.rendu.domElement.remove(); }
  }
}
if (typeof module !== 'undefined' && module.exports) module.exports = Visionneuse3D;
