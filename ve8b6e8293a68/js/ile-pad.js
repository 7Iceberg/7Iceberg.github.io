class IlePad {
  constructor(stage) {
    this.direction = null;
    this.pointer = null;
    this.actif = false;
    this.replie = false;
    try { this.replie = localStorage.getItem('veylan.pad.replie') === '1'; } catch (e) {   }
    const el = this.el = document.createElement('div');
    el.className = 'ile-pad'; el.hidden = true;
    el.innerHTML = '<button type="button" class="ile-pad__toggle" aria-controls="ile-pad-zone"></button><div id="ile-pad-zone" class="ile-pad__zone" role="group" aria-label="Joystick de déplacement. Glisser pour marcher, pousser au bord pour courir."><span class="ile-pad__axes" aria-hidden="true"></span><span class="ile-pad__pommeau" aria-hidden="true"></span></div>';
    this.zone = el.querySelector('.ile-pad__zone');
    this.toggle = el.querySelector('button');
    this.pommeau = el.querySelector('.ile-pad__pommeau');
    this.toggle.addEventListener('click', e => {
      e.stopPropagation(); this.annuler(); this.replie = !this.replie; this.afficher();
      try { localStorage.setItem('veylan.pad.replie', this.replie ? '1' : '0'); } catch (err) {   }
    });
    this.zone.addEventListener('pointerdown', e => {
      if (!this.actif || this.replie || this.pointer != null || e.button > 0) return;
      e.preventDefault(); e.stopPropagation();
      const r = this.zone.getBoundingClientRect(), mx = r.left + r.width / 2, my = r.top + r.height / 2, rayon = r.width * 0.32;
      const ox = e.clientX - mx, oy = e.clientY - my, od = Math.hypot(ox, oy), k = od > rayon * 0.5 ? rayon * 0.5 / od : 1;
      this.centre = { x: mx + ox * k, y: my + oy * k, rayon, ox: ox * k, oy: oy * k };
      this.pointer = e.pointerId;
      this.zone.setPointerCapture(e.pointerId);
      el.classList.add('en-main'); this.bouger(e);
    });
    this.zone.addEventListener('pointermove', e => {
      if (e.pointerId !== this.pointer) return;
      e.preventDefault(); e.stopPropagation(); this.bouger(e);
    });
    const fin = e => {
      if (e.pointerId !== this.pointer) return;
      e.preventDefault(); e.stopPropagation(); this.annuler();
    };
    this.zone.addEventListener('pointerup', fin);
    this.zone.addEventListener('pointercancel', fin);
    this.zone.addEventListener('lostpointercapture', fin);
    el.addEventListener('contextmenu', e => e.preventDefault());
    el.addEventListener('click', e => e.stopPropagation());
    this._annuler = () => this.annuler();
    this._visibilite = () => { if (document.hidden) this.annuler(); };
    addEventListener('blur', this._annuler);
    addEventListener('resize', this._annuler);
    document.addEventListener('visibilitychange', this._visibilite);
    stage.append(el); this.afficher();
  }

  afficher() {
    this.el.classList.toggle('replie', this.replie);
    this.zone.hidden = this.replie;
    this.toggle.setAttribute('aria-expanded', String(!this.replie));
    const nom = this.replie ? 'Afficher le joystick' : 'Masquer le joystick';
    this.toggle.setAttribute('aria-label', nom); this.toggle.title = nom;
    this.toggle.innerHTML = this.replie
      ? '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><circle cx="12" cy="12" r="8.5"/><circle cx="12" cy="12" r="3.2" fill="currentColor" stroke="none"/></svg>'
      : '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" aria-hidden="true"><path d="M7 12h10"/></svg>';
  }

  bouger(e) {
    const c = this.centre, dx = e.clientX - c.x, dy = e.clientY - c.y;
    const d = Math.hypot(dx, dy), n = Math.min(1, d / c.rayon);
    this.pommeau.style.transform = `translate(${c.ox + (d ? dx / d * n * c.rayon : 0)}px, ${c.oy + (d ? dy / d * n * c.rayon : 0)}px)`;
    const force = Math.max(0, (n - 0.16) / 0.84);
    this.direction = force > 0 ? { x: dx / d, y: dy / d, force, course: n > 0.92 } : null;
    this.el.classList.toggle('course', !!(this.direction && this.direction.course));
  }

  annuler() {
    const id = this.pointer; this.pointer = null; this.direction = null;
    if (id != null && this.zone.hasPointerCapture(id)) this.zone.releasePointerCapture(id);
    this.pommeau.style.transform = '';
    this.el.classList.remove('en-main', 'course');
  }

  maj(actif) {
    if (actif === this.actif) return;
    this.actif = actif; this.el.hidden = !actif;
    if (!actif) this.annuler();
  }

  liberer() {
    this.annuler(); this.el.remove();
    removeEventListener('blur', this._annuler); removeEventListener('resize', this._annuler);
    document.removeEventListener('visibilitychange', this._visibilite);
  }
}
