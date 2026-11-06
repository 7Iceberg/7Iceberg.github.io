(() => {
const esc = s => Util.esc(s);
const RARES = ['epique', 'legendaire'];
const NOMS = { epique: 'Épique', legendaire: 'Légendaire', cosmetique: 'Garde-robe' };

Object.assign(Hud.prototype, {
  majeuresDe(r) {
    const l = [];
    for (const d of (r && r.drops) || []) {
      const def = Items.get(d.id), rar = def && Items.rarity(def);
      if (def && RARES.includes(rar)) l.push({ icone: Hud.picto(def), nom: def.name, rarete: rar, sous: d.count > 1 ? `× ${d.count} · dans ton inventaire` : 'Dans ton inventaire' });
    }
    for (const c of (r && r.cosmetiques) || []) if (c && c.cosmetique) l.push({ icone: '', nom: c.cosmetique.nom, rarete: 'cosmetique', sous: c.collection ? `Collection « ${c.collection.nom} » complète` : 'Dans ta Garde-robe' });
    return l;
  },

  recompenseMajeure(liste) {
    this.fileMajeure = (this.fileMajeure || []).concat(liste || []);
    if (!this.elMajeure) this.majeureSuivante();
  },

  majeureSuivante() {
    if (this.elMajeure) { this.elMajeure.remove(); this.elMajeure = null; }
    const m = (this.fileMajeure || []).shift();
    if (!m) return;
    const el = this.elMajeure = document.createElement('div');
    el.className = 'vy-majeure';
    el.dataset.rarete = m.rarete;
    el.setAttribute('role', 'dialog');
    el.setAttribute('aria-label', `Récompense majeure : ${m.nom}`);
    const icone = m.icone || '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M12 4a2 2 0 0 1 2 2c0 1-1 1.6-2 2.3V10l8 6.5a1 1 0 0 1-.6 1.8H4.6a1 1 0 0 1-.6-1.8L12 10"/></svg>';
    el.innerHTML = `<div class="vy-majeure__rayons" aria-hidden="true"></div><div class="vy-majeure__halo" aria-hidden="true"></div>
      <div class="vy-majeure__contenu"><small class="vy-majeure__etiquette">Récompense majeure</small>
        <div class="vy-majeure__objet"><span class="vy-majeure__icone">${icone}</span></div>
        <span class="vy-majeure__rarete">${NOMS[m.rarete] || ''}</span><h2>${esc(m.nom)}</h2><p>${esc(m.sous || '')}</p>
        <button type="button" class="vy-bouton vy-bouton--primaire vy-majeure__ok">Continuer</button></div>`;
    document.getElementById('app').appendChild(el);
    if (typeof Son === 'object' && Son.jouer) try { Son.jouer('butin'); } catch (e) {   }
    const fin = () => { removeEventListener('keydown', touche, true); this.majeureSuivante(); };
    const touche = evt => { if (evt.key === 'Escape' || evt.key === 'Enter' || evt.key === ' ') { evt.preventDefault(); evt.stopImmediatePropagation(); fin(); } };
    addEventListener('keydown', touche, true);
    el.querySelector('.vy-majeure__ok').addEventListener('click', fin);
    requestAnimationFrame(() => el.querySelector('.vy-majeure__ok').focus());
  },
});
})();
