(() => {
const esc = s => Util.esc(s);
const nf = n => Number(n || 0).toLocaleString('fr-FR');

Object.assign(Hud.prototype, {
  openMetiersPerso() {
    if (typeof Metiers === 'undefined') return;
    this.simpleWin('metiers', 'Métiers', () => this.renderMetiers(), {}, { width: 620, cls: 'vy-fenetre--metiers' });
  },

  renderMetiers() {
    const ch = this.world.ch, M = Metiers;
    M.etat(ch);
    const ligne = m => {
      const nv = M.niveau(ch, m.id), e = ch.metiers[m.id], besoin = M.xpNiveau(nv);
      const recettes = Items.recipes().filter(r => m.ateliers.includes(r.workshop) && Items.get(r.result));
      const faites = recettes.filter(r => M.niveauRecette(r) <= nv).length;
      const res = (DATA.content.resources || []).filter(r => r.node && m.recolte.includes(r.node.kind));
      const prochaine = recettes.map(r => M.niveauRecette(r)).filter(n => n > nv).sort((a, b) => a - b)[0];
      const quoi = m.genre === 'recolte'
        ? `Récolte : ${res.length ? res.map(r => `${esc(r.name)}${(r.niveau || 1) > nv ? ` <small class="muted">(niv. ${r.niveau})</small>` : ''}`).join(', ') : '-'}${recettes.length ? ` · ${faites} / ${recettes.length} recettes` : ''}`
        : `${faites} / ${recettes.length} recettes à ta portée${prochaine ? ` · la suivante au niveau ${prochaine}` : ''}`;
      const atelier = m.hote ? ` <small class="muted">(en attendant ses artisans : chez ${esc(m.hote)})</small>` : '';
      return `<div class="row item"><span><b>${esc(m.nom)}</b> <small class="muted">niveau ${nv} / ${M.MAX}</small>${atelier}<br><small>${esc(m.description)}</small><br><small>${quoi}</small>
        <span class="vy-jauge" style="display:block;height:5px;margin-top:4px;border-radius:3px;background:rgba(255,255,255,0.08)"><span style="display:block;height:100%;width:${nv >= M.MAX ? 100 : Math.round(100 * (e.xp || 0) / besoin)}%;border-radius:3px;background:var(--fen-accent, #52d2f4)"></span></span>
        <small class="muted">${nv >= M.MAX ? 'niveau maximum' : `${nf(e.xp)} / ${nf(besoin)} XP`}</small></span></div>`;
    };
    const groupe = (g, titre) => `<h4>${titre}</h4>${M.liste().filter(m => m.genre === g).map(ligne).join('')}`;
    return `<p class="muted">Une ressource de niveau N se récolte au métier de niveau N, un objet de niveau N se fabrique au métier de niveau N. Récolter ou fabriquer près de son niveau fait monter le métier.</p>${groupe('recolte', 'Récolte')}${groupe('artisanat', 'Artisanat')}`;
  },
});
})();
