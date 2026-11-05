(() => {
const esc = s => Util.esc(s);
const nf = n => Number(n || 0).toLocaleString('fr-FR');
const virgule = x => String(Math.round(x * 10) / 10).replace('.', ',');

Object.assign(Hud.prototype, {
  openGuilde() {
    if (typeof Guildes === 'undefined') return;
    if (this.guildePart == null) this.guildePart = 30;
    const actions = { part: d => { this.guildePart = Number(d.part) || 0; this.fen.render('guilde'); } };
    this.simpleWin('guilde', 'Guilde', () => this.renderGuilde(), actions, { width: 620, cls: 'vy-fenetre--guilde' });
  },

  renderGuilde() {
    const G = Guildes, R = G.R, ch = this.world.ch, L = ch.level;
    const xp = G.combatOrdinaire(L);
    const monture = typeof Montures === 'object' && Montures.de && Montures.de(ch);
    const partMonture = monture && monture.montee ? monture.part || 0 : 0;
    const voulue = this.guildePart, part = G.partEffective(voulue, partMonture);
    const preleve = Math.round(xp * part / 100), points = G.ouvrage(preleve, L);
    const parts = [0, 10, 20, 30, 50, 70, 90].map(p => `<button class="vy-bouton vy-bouton--petit${voulue === p ? ' vy-bouton--primaire' : ''}" data-act="part" data-part="${p}" aria-pressed="${voulue === p}">${p} %</button>`).join('');
    const max = G.niveauMax();
    const niveaux = G.DEBLOCAGES.map(d => `<li class="${d.niveau > max ? 'plus-tard' : ''}"><b>${d.niveau}</b><span>${esc(d.texte)}</span></li>`).join('');
    return `<div class="vy-mont vy-guilde">
      <header class="vy-fam__tete"><div><b>Les guildes arrivent avec le serveur</b><small>une guilde par compte, ${R.membres} comptes au plus</small></div></header>
      <p class="vy-fam__desc">On en fonde une à ${R.fondateurs}, au Greffe des Francs-Marcheurs, dans la ville de Kaldum : une Charte signée par trois comptes (un personnage de niveau ${R.niveauFondateur} au moins), ${nf(R.prixCharte)} Dragmes. Une guilde ne donne jamais de force en combat : ses niveaux ouvrent du confort, de l'apparence et des services.</p>
      <div class="vy-mont__part"><h4>Ton don d'expérience <small>un aperçu : rien n'est prélevé avant le serveur</small></h4>
        <div class="vy-mont__parts" role="group" aria-label="Part de l'expérience donnée à la guilde">${parts}</div>
        <p class="vy-guilde__calcul">Au niveau ${L}, un combat ordinaire rapporte environ <b>${nf(xp)} XP</b>. À ${part} %, tu en donnes <b>${nf(preleve)}</b>, et la guilde reçoit <b>${virgule(points)} point${points >= 2 ? 's' : ''} d'Ouvrage</b> : un combat donné en entier vaut ${R.pointsCombat} points, à tout niveau.${partMonture ? ` Ta monture prend déjà ${partMonture} % : ta part va jusqu'à ${R.partTotaleMax - partMonture} %.` : ''}</p>
        <p class="vy-guilde__calcul">Jouer à deux membres ou plus compte ${virgule(R.ensemble)} fois. Le plein de la semaine vaut ${R.pleinBase} points plus ${R.pleinParCompte} par compte actif (${R.comptesMax} au plus), doublé sous le niveau ${R.pleinDoubleSous} : plein fait, ta part n'est plus prélevée.</p></div>
      <div class="vy-mont__part"><h4>Les niveaux de guilde <small>${max} avec le jeu de base ; passer au niveau suivant coûte 100 × le niveau</small></h4>
        <ul class="vy-guilde__niveaux">${niveaux}</ul></div>
      <div class="vy-mont__part"><h4>Ensuite</h4>
        <ul class="vy-guilde__ensuite">
          <li><b>La Vigie</b> : posée dans une zone, elle récolte des ressources et guette les monstres rares ; on l'attaque de ${R.vigie.attaque[0]} h à ${R.vigie.attaque[1]} h, à ${R.vigie.equipe} contre ${R.vigie.equipe}, et la guilde a deux minutes pour venir la défendre.</li>
          <li><b>Le Pacte</b> : une alliance de ${R.pacte.min} à ${R.pacte.max} guildes, sans niveau.</li>
          <li><b>Les Cairns</b> : les alliances se disputent des zones lors de Levées, en équipes de 4, deux soirs par semaine ; ${G.cairnsMax()} Cairns au plus, des saisons de ${R.cairn.saison} semaines, des Lauriers à gagner en jouant.</li>
        </ul></div>
    </div>`;
  },
});
})();
