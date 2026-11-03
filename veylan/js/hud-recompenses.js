(() => {
const esc = s => Util.esc(s);
const svg = p => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${p}</svg>`;
const COFFRE = svg('<path d="M3.5 10.5h17v9h-17z"/><path d="M3.5 10.5V8.5a3.5 3.5 0 0 1 3.5-3.5h10a3.5 3.5 0 0 1 3.5 3.5v2"/><path d="M10 10.5v3.5h4v-3.5M3.5 14.5H10M14 14.5h6.5"/>');
const ACCEPTER = svg('<path d="M5 12.5l4.5 4.5L19 7.5"/>');
const CASES = 6;
const nf = n => Number(n).toLocaleString('fr-FR');

Object.assign(Hud.prototype, {
  initRecompenses() {
    let b = document.getElementById('recompenses-btn');
    if (!b) {
      b = document.createElement('button');
      b.id = 'recompenses-btn';
      b.className = 'vy-coffre';
      b.type = 'button';
      b.hidden = true;
      b.innerHTML = `${COFFRE}<span class="recompenses-btn__nombre"></span>`;
      (document.getElementById('explore-hud') || document.getElementById('stage')).appendChild(b);
    }
    b.onclick = () => this.toggleRecompenses();
    this.coffre = b;
    const w = this.world;
    const nouveau = list => {
      for (const g of list) this.chat('succes', `Succès déverrouillé : ${g.achievement.name}`);
      this.majCoffre();
      if (list.length && this.fen.isOpen('recompenses')) this.fen.render('recompenses');
    };
    w.on('achievement', g => nouveau([g]));
    w.on('fightEnd', r => nouveau(r.achievements || []));
    w.on('claim', list => this.apresRecompense(list));
    w.on('update', () => this.majCoffre());
    w.on('map', () => this.majCoffre());
    if (!this.coffreRedim) { this.coffreRedim = () => this.placerCoffre(); window.addEventListener('resize', this.coffreRedim); }
    this.majCoffre();
  },

  majCoffre() {
    const b = this.coffre, ch = this.world && this.world.ch;
    if (!b || !ch) return;
    const n = Achievements.pending(ch).length;
    const label = `${n} récompense${n > 1 ? 's' : ''} en attente`;
    b.hidden = !n;
    b.querySelector('.recompenses-btn__nombre').textContent = n;
    if (b.getAttribute('aria-label') !== label) { b.setAttribute('aria-label', label); b.title = label; }
    if (n) this.placerCoffre();
  },

  placerCoffre() {
    const b = this.coffre, bas = document.getElementById('bas-centre');
    if (!b || b.hidden || !bas || !b.offsetParent) return;
    const r = bas.getBoundingClientRect(), p = b.offsetParent.getBoundingClientRect();
    if (r.height) b.style.setProperty('--coffre-bas', `${Math.round(p.bottom - r.top + 10)}px`);
  },

  toggleRecompenses() {
    if (this.fen.isOpen('recompenses')) this.fen.close('recompenses');
    else this.openRecompenses();
  },

  openRecompenses() {
    const actions = {
      accepter: d => this.accepterRecompense(d.id),
      toutAccepter: () => this.accepterTout(),
    };
    this.simpleWin('recompenses', 'Récompenses en attente', () => this.renderRecompenses(), actions, { width: 540, icon: COFFRE, cls: 'vy-fenetre--recompenses' });
  },

  renderRecompenses() {
    const ch = this.world.ch, list = Achievements.pending(ch), combat = this.world.state === 'combat';
    const rows = list.map(a => {
      const r = a.rewards || {}, items = r.items || [];
      const cases = [];
      for (let i = 0; i < CASES; i++) {
        const it = items[i], d = it && Items.get(it.id);
        cases.push(d
          ? `<span class="vy-case" data-rarete="${Items.rarity(d)}" title="${esc(d.name)}${it.count > 1 ? ' ×' + it.count : ''}"><span class="vy-case__icone">${Hud.picto(d)}</span>${it.count > 1 ? `<span class="vy-case__nombre">${it.count}</span>` : ''}</span>`
          : '<span class="vy-case vy-case--vide" aria-hidden="true"></span>');
      }
      const gains = [r.xp ? `<span class="vy-recompense__xp"><b>${nf(r.xp)}</b> XP</span>` : '', r.fils ? `<span class="vy-recompense__fils"><b>${nf(r.fils)}</b> Dragmes</span>` : ''].join('');
      return `<li class="vy-recompense" data-id="${a.id}">
        <div class="vy-recompense__tete"><b class="vy-recompense__nom">${esc(a.name)}</b><span class="vy-recompense__cat">${Achievements.category(a)}</span></div>
        <div class="vy-recompense__corps"><div class="vy-recompense__cases" role="list" aria-label="Objets">${cases.join('')}</div>
          <div class="vy-recompense__gains">${gains}</div>
          <button class="vy-bouton vy-bouton--primaire vy-bouton--petit vy-recompense__ok" data-act="accepter" data-id="${a.id}" ${combat ? 'disabled' : ''} aria-label="Accepter : ${esc(a.name)}" title="Accepter">${ACCEPTER}<span>Accepter</span></button></div>
        ${r.title ? `<p class="vy-recompense__titre">Titre « ${esc(r.title)} » déjà obtenu</p>` : ''}
      </li>`;
    }).join('');
    const n = list.length;
    return `<div class="vy-recompenses">
      ${n ? `<ul class="vy-recompenses__liste" data-defile="recompenses">${rows}</ul>` : '<p class="vy-recompenses__vide">Aucune récompense en attente. Chaque succès débloqué dépose ici son XP, ses Dragmes et ses objets.</p>'}
      <footer class="vy-recompenses__pied"><span class="vy-recompenses__reste">${n ? `${n} récompense${n > 1 ? 's' : ''} restante${n > 1 ? 's' : ''}` : 'Tout est remis.'}</span>
        ${combat ? '<span class="muted">Pas pendant un combat.</span>' : ''}
        <button class="vy-bouton vy-bouton--primaire" data-act="toutAccepter" ${n && !combat ? '' : 'disabled'}>Tout accepter</button></footer>
    </div>`;
  },

  accepterRecompense(id) {
    if (this.world.state === 'combat') { this.toast('Pas pendant un combat.'); return null; }
    return this.world.claimAchievement(id);
  },

  accepterTout() {
    if (this.world.state === 'combat') { this.toast('Pas pendant un combat.'); return []; }
    return this.world.claimAllAchievements();
  },

  apresRecompense(list) {
    if (!list || !list.length) return;
    const xp = list.reduce((s, g) => s + g.xp, 0), fils = list.reduce((s, g) => s + g.fils, 0);
    const objets = [];
    for (const g of list) for (const it of g.items) { const d = Items.get(it.id); if (d) objets.push(d.name + (it.count > 1 ? ' ×' + it.count : '')); }
    if (xp) this.chat('gain', `Tu as gagné ${nf(xp)} points d'expérience.`);
    if (fils) this.chat('gain', `Tu as obtenu ${nf(fils)} Dragmes.`);
    for (const o of objets) this.chat('gain', `Tu as obtenu ${o}.`);
    const levels = list.reduce((s, g) => s + g.levels, 0);
    const quoi = [xp ? `+${nf(xp)} XP` : '', fils ? `+${nf(fils)} Dragmes` : ''].concat(objets).filter(Boolean).join(', ');
    this.toast(`${list.length > 1 ? `${list.length} récompenses` : list[0].achievement.name} : ${quoi || 'remis'}${levels ? ` · niveau ${this.world.ch.level} !` : ''}`);
    this.majCoffre();
  },
});
})();
