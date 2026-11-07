(() => {
const svg = p => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${p}</svg>`;
const ICO = {
  oeil: svg('<rect x="3" y="4" width="18" height="16" rx="2"/><path d="M3 9h18M8 20V9"/>'),
  oeilBarre: svg('<path d="M4 8V6a2 2 0 0 1 2-2h2M16 4h2a2 2 0 0 1 2 2v2M20 16v2a2 2 0 0 1-2 2h-2M8 20H6a2 2 0 0 1-2-2v-2"/>'),
};

Object.assign(Hud.prototype, {
  initBoussole() {
    const stage = document.getElementById('stage');
    if (!stage || this.boussoleQ) return;
    const b = this.boussoleQ = document.createElement('button');
    b.type = 'button';
    b.className = 'vy-boussole-quete';
    b.hidden = true;
    b.innerHTML = '<span class="vy-boussole-quete__cadran"><i class="vy-boussole-quete__fleche"></i></span><span class="vy-boussole-quete__t"><b></b><small></small></span>';
    b.addEventListener('click', () => { const id = this.quetesSuivie(); if (id) { this.quetesEtat = Object.assign(this.quetesEtat || { onglet: 'cours', filtre: '' }, { onglet: 'cours', choisie: id, vue: 'fiche' }); if (this.fen.isOpen('quetes')) this.fen.render('quetes'); else this.toggleWin('quetes'); } });
    stage.appendChild(b);
    const poser = () => {
      const vue = document.getElementById('vue');
      if (!vue || document.getElementById('vue-immersive')) return;
      const o = document.createElement('button');
      o.id = 'vue-immersive'; o.className = 'vy-camera__bouton';
      o.addEventListener('click', () => this.basculerImmersif());
      vue.appendChild(o);
      this.majImmersif();
    };
    setTimeout(poser, 0);
    window.addEventListener('keydown', evt => {
      if (evt.ctrlKey || evt.altKey || evt.metaKey || evt.repeat) return;
      const t = evt.target;
      if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.tagName === 'SELECT' || t.isContentEditable)) return;
      if (evt.key.toLowerCase() === 'x' && this.world.state === 'explore') { this.basculerImmersif(); evt.preventDefault(); }
      else if (evt.key === 'Escape' && this.immersif) this.basculerImmersif(false);
    });
    this.world.on('fight', () => { if (this.immersif) this.basculerImmersif(false); this.majBoussole(); });
    this.world.on('map', () => this.majBoussole());
    setInterval(() => this.majBoussole(), 250);
  },

  basculerImmersif(on) {
    this.immersif = on == null ? !this.immersif : !!on;
    if (this.immersif && this.fen) for (const id of [...this.fen.wins.keys()]) this.fen.close(id);
    this.majImmersif();
    this.toast(this.immersif ? 'Vue immersive : X ou Échap pour revenir.' : 'Interface revenue.');
  },

  majImmersif() {
    document.getElementById('app').classList.toggle('vy-immersif', !!this.immersif);
    const o = document.getElementById('vue-immersive');
    if (!o) return;
    const label = this.immersif ? 'Rendre l\'interface (X)' : 'Vue immersive (X)';
    o.innerHTML = this.immersif ? ICO.oeilBarre : ICO.oeil;
    o.title = label; o.setAttribute('aria-label', label); o.setAttribute('aria-pressed', String(!!this.immersif));
  },

  majBoussole() {
    const b = this.boussoleQ, w = this.world;
    if (!b) return;
    const id = w.ch && this.quetesSuivie && this.quetesSuivie();
    const o = id && w.state !== 'combat' && !w.showCombat && this.objectifQuete ? this.objectifQuete(id, true) : null;
    const R = this.renderer;
    if (!o || !o.point || !R || !w.player) { if (!b.hidden) b.hidden = true; return; }
    const p = w.player, d = Math.hypot(o.point.x - p.x, o.point.y - p.y);
    const a = UI.cellClient(R, p.x, p.y), c = UI.cellClient(R, o.point.x, o.point.y);
    const ang = Math.atan2(c.y - a.y, c.x - a.x) * 180 / Math.PI + 90;
    b.hidden = false;
    b.classList.toggle('arrive', d < 3);
    b.style.setProperty('--angle', `${Math.round(ang)}deg`);
    const q = Quests.get(id), nom = q ? q.name : '';
    const t = b.querySelector('b'), s = b.querySelector('small');
    if (t.textContent !== nom) t.textContent = nom;
    const txt = d < 3 ? `${o.nom} : ici` : `${o.nom} · ${Math.round(d)} case${Math.round(d) > 1 ? 's' : ''}`;
    if (s.textContent !== txt) s.textContent = txt;
    b.title = `Quête suivie : ${nom}. Toucher pour l'ouvrir.`;
  },
});
})();
