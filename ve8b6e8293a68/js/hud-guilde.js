(() => {
const esc = s => Util.esc(s);
const nf = n => Number(n || 0).toLocaleString('fr-FR');
const virgule = x => String(Math.round(x * 10) / 10).replace('.', ',');
const ONGLETS = {
  membres: 'Membres', missions: 'Missions', expeditions: 'Expéditions',
  journal: 'Journal', loge: 'Loge', annuaire: 'Annuaire', guide: 'Guide',
};
const RANGS = ['Maître de Loge', 'Second', 'Officier', 'Compagnon', 'Recrue'];
const MEMBRES = [
  { nom: 'Ilyane', rang: 0, niveau: 46, points: 125, ligne: true, note: 'Prépare la sortie du soir.' },
  { nom: 'Veyric', rang: 1, niveau: 39, points: 80, ligne: true, note: 'Artisan de la Loge.' },
  { nom: 'Méra', rang: 2, niveau: 33, points: 72, ligne: true, note: 'Partante pour les donjons.' },
  { nom: 'Orven', rang: 3, niveau: 28, points: 44, ligne: true, note: 'Explore Kaldum.' },
  { nom: 'Tavelle', rang: 3, niveau: 24, points: 56, ligne: false, note: 'Disponible le week-end.' },
  { nom: 'Néral', rang: 4, niveau: 18, points: 28, ligne: false, note: 'Découvre Orsane.' },
  { nom: 'Maelis', rang: 3, niveau: 25, points: 70, ligne: false, note: 'Récolte pour le coffre.' },
  { nom: 'Sorel', rang: 4, niveau: 17, points: 55, ligne: false, note: 'Apprend la forge.' },
];
const MISSIONS = [
  { nom: 'Sur les traces du Grand Grouk', type: 'Donjon', icone: '✦', texte: 'Vaincre le Grand Grouk avec des membres de la guilde.', fait: 1, but: 3 },
  { nom: 'L’intendance de la Loge', type: 'Artisanat', icone: '⚒', texte: 'Fabriquer des consommables pour les prochaines sorties.', fait: 12, but: 20 },
  { nom: 'De relais en relais', type: 'Exploration', icone: '◇', texte: 'Explorer les cartes des Cimes avec des membres de la guilde.', fait: 5, but: 5 },
];
const EXPEDITIONS = [
  { capitaine: 'Ilyane', equipes: [['Ilyane', 'Méra'], ['Veyric']], note: 'Première traversée, on avance à notre rythme.' },
  { capitaine: 'Veyric', equipes: [['Veyric', 'Méra', 'Orven', 'Néral'], ['Ilyane', 'Tavelle', 'Maelis', 'Sorel']], note: 'Les deux équipes sont prêtes.' },
];
const ACTIVITES = [
  { quand: 'Aujourd’hui, 18 h 15', type: 'Membres', texte: 'Néral a rejoint la guilde.' },
  { quand: 'Aujourd’hui, 16 h 42', type: 'Rangs', texte: 'Ilyane a nommé Méra Officier.' },
  { quand: 'Hier, 20 h 10', type: 'Coffre', texte: 'Veyric a déposé des ressources au coffre.' },
  { quand: 'Hier, 17 h 30', type: 'Vigies', texte: 'Une Vigie a été allumée dans les Clairières.' },
];
const ANNUAIRE = [
  { nom: 'Le Relais des Braises', niveau: 12, membres: 8, mode: 'Candidature', style: 'Entraide', desc: 'Exploration, artisanat et donjons en petit groupe.' },
  { nom: 'Les Veilleurs de l\'Aube', niveau: 7, membres: 14, mode: 'Ouvert', style: 'Exploration', desc: 'Cartographier les chemins d’Orsane et accueillir les nouveaux Veilleurs.' },
  { nom: 'La Veille des Cimes', niveau: 16, membres: 60, mode: 'Fermé', style: 'Donjons', desc: 'Sorties de donjon et entraînement à la Loge.' },
];
const bouton = (act, texte, d = '', actif = false) =>
  `<button type="button" class="vy-bouton vy-bouton--petit${actif ? ' vy-bouton--primaire' : ''}" data-act="${act}"${d}>${esc(texte)}</button>`;
const bascule = (id, label, on) => `<label class="vy-loge__bascule"><input id="${id}" type="checkbox"${on ? ' checked' : ''}> ${label}</label>`;
const cherche = (id, label, valeur) => `<input id="${id}" class="vy-loge__recherche" type="search" aria-label="${label}" placeholder="${label}" value="${esc(valeur)}">`;
const choix = (id, label, valeurs, courant) =>
  `<label class="vy-loge__filtre">${label}<select id="${id}">${valeurs.map(v => `<option${v === courant ? ' selected' : ''}>${esc(v)}</option>`).join('')}</select></label>`;
const correspond = (source, recherche) => {
  const plie = s => s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase('fr');
  return plie(source).includes(plie(recherche.trim()));
};
const vide = texte => `<p class="vy-loge__vide">${texte}</p>`;
const rang = m => RANGS[m.rang];

function vueMembres(s) {
  const liste = MEMBRES.filter(m => (m.ligne || s.horsLigne) && correspond(m.nom + ' ' + rang(m), s.rechercheMembre));
  liste.sort((a, b) => {
    if (s.tri === 'Nom') return a.nom.localeCompare(b.nom, 'fr');
    if (s.tri === 'Niveau') return b.niveau - a.niveau;
    if (s.tri === 'Ouvrage') return b.points - a.points;
    return a.rang - b.rang;
  });
  const selection = liste.find(m => m.nom === s.membre);
  const lignes = liste.map(m => `<tr${m === selection ? ' class="on"' : ''}>
    <td><span class="vy-loge__point${m.ligne ? ' on' : ''}" role="img" aria-label="${m.ligne ? 'En ligne' : 'Hors ligne'}"></span></td>
    <th scope="row"><button type="button" class="vy-loge__lien" data-act="membre" data-nom="${esc(m.nom)}" aria-expanded="${m === selection}">${esc(m.nom)}</button></th>
    <td class="vy-loge__secondaire">${esc(m.note)}</td><td>${rang(m)}</td>
    <td>${m.niveau}</td><td class="vy-loge__secondaire">${m.points}</td></tr>`).join('');
  const fiche = selection ? `<aside class="vy-loge__carte"><h4>${esc(selection.nom)}</h4>
    <p>${rang(selection)} · Niveau ${selection.niveau}</p><p>${esc(selection.note)}</p>
    <dl><dt>Présence</dt><dd>${selection.ligne ? 'En ligne' : 'Hors ligne'}</dd><dt>Ouvrage cette semaine</dt><dd>${selection.points} points</dd></dl></aside>` : '';
  return `<div class="vy-loge__outils">${cherche('loge-recherche-membre', 'Rechercher un membre', s.rechercheMembre)}
    ${choix('loge-tri', 'Trier par', ['Rang', 'Nom', 'Niveau', 'Ouvrage'], s.tri)}
    ${bouton('rangs', s.rangs ? 'Fermer les rangs' : 'Voir les rangs')}</div>
    ${s.rangs ? `<p class="vy-loge__encart"><b>Rangs de départ</b> · ${RANGS.join(' · ')}</p>` : ''}
    <div class="vy-loge__membres${selection ? ' avec-fiche' : ''}"><div class="vy-loge__table">
      <table><thead><tr><th scope="col"><span class="vy-loge__sr">Présence</span></th><th scope="col">Nom</th><th scope="col" class="vy-loge__secondaire">Note</th>
      <th scope="col">Rang</th><th scope="col">Niv.</th><th scope="col" class="vy-loge__secondaire">Ouvrage</th></tr></thead><tbody>${lignes}</tbody></table>
      ${lignes ? '' : vide('Aucun membre ne correspond.')}</div>${fiche}</div>
    <footer class="vy-loge__pied">${bascule('loge-hors-ligne', 'Afficher les membres hors ligne', s.horsLigne)}
      <small>${liste.length} affiché${liste.length > 1 ? 's' : ''} · ${MEMBRES.filter(m => m.ligne).length} en ligne</small></footer>`;
}

function vueMissions(s) {
  const liste = MISSIONS.filter(m => !s.masquerMissions || m.fait < m.but);
  return `<div class="vy-loge__outils"><div><h4>Tableau de Loge</h4><p>Trois objectifs communs par semaine, à partir du niveau 6.</p></div>
    ${bascule('loge-masquer-missions', 'Masquer les missions terminées', s.masquerMissions)}</div>
    <div class="vy-loge__missions">${liste.map(m => `<article class="vy-loge__carte"><span class="vy-loge__jeton" aria-hidden="true">${m.icone}</span>
      <small>${m.type}</small><h4>${m.nom}</h4><p>${m.texte}</p>
      <progress aria-label="${m.nom}" value="${m.fait}" max="${m.but}"></progress><small>${m.fait} / ${m.but} · ${m.fait === m.but ? 'Terminée' : 'En cours'}</small></article>`).join('')}</div>`;
}

function vueExpeditions(s) {
  const e = EXPEDITIONS[s.expedition];
  const places = x => x.equipes[0].length + x.equipes[1].length;
  return `<div class="vy-loge__colonnes">
    <div class="vy-loge__liste"><h4>Sorties de guilde</h4>${EXPEDITIONS.map((x, i) => `<button class="vy-loge__choix${i === s.expedition ? ' on' : ''}" type="button" data-act="expedition" data-index="${i}" aria-pressed="${i === s.expedition}">
      <b>La Double Porte</b><small>${x.capitaine} · ${places(x)} / 8 · ${places(x) === 8 ? 'Complet' : 'Places libres'}</small></button>`).join('')}</div>
    <article class="vy-loge__carte"><small>Prévue pour l’extension 1</small><h4>La Double Porte</h4>
      <p>Deux équipes de quatre progressent en parallèle dans le donjon de guilde.</p><p><b>Message de ${e.capitaine}</b> · ${e.note}</p>
      <div class="vy-loge__equipes">${e.equipes.map((eq, i) => `<section><h5>Équipe ${i + 1}</h5><ul>${Array.from({ length: 4 }, (_, j) => `<li>${eq[j] || '<small>Place libre</small>'}</li>`).join('')}</ul></section>`).join('')}</div>
    </article></div>`;
}

function vueJournal(s) {
  const entrees = ACTIVITES.filter(a => s.journal === 'Tout' || a.type === s.journal);
  return `<div class="vy-loge__colonnes vy-loge__journal">
    <article class="vy-loge__carte"><h4>Informations de guilde</h4><p>La Loge accueille les Veilleurs qui aiment découvrir le monde ensemble.</p>
      <p>Sorties de donjon après la Veille. Pense à indiquer tes disponibilités dans ta note de membre.</p></article>
    <div><div class="vy-loge__outils"><h4>Dernières activités</h4>${choix('loge-journal', 'Filtrer', ['Tout', 'Membres', 'Rangs', 'Coffre', 'Vigies'], s.journal)}</div>
      <ol class="vy-loge__historique">${entrees.map(a => `<li><small>${a.quand}</small><p>${a.texte}</p></li>`).join('')}</ol></div></div>`;
}

function vueLoge(s) {
  return `<div class="vy-loge__colonnes"><article class="vy-loge__carte"><small>Francs-Marcheurs · Kaldum</small>
    <h4>La Loge du Relais des Braises</h4><p>Le lieu de rassemblement de la guilde. La Loge s’ouvre au niveau 2 et dispose d’une pierre de retour.</p>
    <p>La salle d’entraînement s’ouvre au niveau 14.</p>${bouton('coffre', s.coffre ? 'Fermer le coffre' : 'Voir le coffre')}</article>
    <article class="vy-loge__carte"><h4>${s.coffre ? 'Coffre de guilde' : 'Services de la Loge'}</h4>
    ${s.coffre ? '<p>Exemple de capacité au niveau 12 · 60 places.</p><p>Les dépôts et retraits dépendent des droits du rang.</p>'
      : '<p>Le coffre, le Tableau de Loge et le Carnet de Loge s’ouvrent à mesure que la guilde progresse.</p>'}</article></div>`;
}

function vueAnnuaire(s) {
  const liste = ANNUAIRE.filter(g => correspond(g.nom + ' ' + g.style, s.rechercheGuilde) &&
    (s.recrutement === 'Tous' || g.mode === s.recrutement) && (!s.masquerPleines || g.membres < Guildes.R.membres));
  return `<div class="vy-loge__colonnes"><aside class="vy-loge__liste"><h4>Rechercher une guilde</h4>
      ${cherche('loge-recherche-guilde', 'Nom ou activité', s.rechercheGuilde)}
      ${choix('loge-recrutement', 'Recrutement', ['Tous', 'Ouvert', 'Candidature', 'Fermé'], s.recrutement)}
      ${bascule('loge-masquer-pleines', 'Masquer les guildes pleines', s.masquerPleines)}</aside>
    <div class="vy-loge__liste">${liste.map(g => `<article class="vy-loge__carte"><small>${g.style} · ${g.mode}</small>
      <h4>${g.nom}</h4><p>Niveau ${g.niveau} · ${g.membres} / ${Guildes.R.membres} membres</p>
      ${bouton('guilde', g.nom === s.guilde ? 'Fermer la fiche' : 'Voir la fiche', ` data-nom="${esc(g.nom)}"`)}
      ${g.nom === s.guilde ? `<p>${g.desc} Les candidatures seront disponibles avec les guildes en ligne.</p>` : ''}</article>`).join('') || vide('Aucune guilde ne correspond.')}</div></div>`;
}

const VUES = { membres: vueMembres, missions: vueMissions, expeditions: vueExpeditions, journal: vueJournal, loge: vueLoge, annuaire: vueAnnuaire };

Object.assign(Hud.prototype, {
  openGuilde() {
    if (typeof Guildes === 'undefined') return;
    if (this.guildePart == null) this.guildePart = 30;
    const s = { onglet: 'membres', tri: 'Rang', rechercheMembre: '', rechercheGuilde: '',
      horsLigne: false, expedition: 0, journal: 'Tout', recrutement: 'Tous', masquerPleines: false };
    const rendre = () => this.fen.render('guilde');
    const ouvrir = onglet => { if (Object.hasOwn(ONGLETS, onglet)) { s.onglet = onglet; rendre(); } };
    const actions = {
      onglet: d => ouvrir(d.vue),
      contribuer: () => ouvrir('guide'),
      coffre: () => { s.coffre = !s.coffre; ouvrir('loge'); },
      part: d => { this.guildePart = Number(d.part) || 0; rendre(); },
      rangs: () => { s.rangs = !s.rangs; rendre(); },
      membre: d => { s.membre = s.membre === d.nom ? null : d.nom; rendre(); },
      expedition: d => { s.expedition = Number(d.index) === 1 ? 1 : 0; rendre(); },
      guilde: d => { s.guilde = s.guilde === d.nom ? null : d.nom; rendre(); },
    };
    const champs = { 'loge-recherche-membre': 'rechercheMembre', 'loge-recherche-guilde': 'rechercheGuilde',
      'loge-hors-ligne': 'horsLigne', 'loge-masquer-missions': 'masquerMissions', 'loge-masquer-pleines': 'masquerPleines',
      'loge-tri': 'tri', 'loge-journal': 'journal', 'loge-recrutement': 'recrutement' };
    const onField = (el, type) => {
      const cle = champs[el.id];
      if (!cle || type !== (el.type === 'search' ? 'input' : 'change')) return;
      s[cle] = el.type === 'checkbox' ? el.checked : el.value;
      rendre();
    };
    this.simpleWin('guilde', 'Guilde', () => this.renderGuilde(s), actions, { width: 1060, cls: 'vy-fenetre--guilde', onField });
  },

  renderGuilde(s) {
    const niveau = 12;
    const objectif = Guildes.plein(MEMBRES.length, niveau);
    const semaine = MEMBRES.reduce((total, m) => total + m.points, 0);
    const cap = Guildes.coutNiveau(niveau);
    const contenu = s.onglet === 'guide' ? this.renderGuideGuilde() : VUES[s.onglet](s);
    return `<div class="vy-loge">
      <header class="vy-loge__tete">
        <div class="vy-loge__identite"><span class="vy-guilde__armes" aria-hidden="true"><img src="assets/ui/objets/etendard.png" alt=""><img src="assets/ui/objets/blason.png" alt=""></span>
          <div><small class="vy-loge__apercu">Aperçu de la fenêtre · données d’exemple</small><h3>Le Relais des Braises</h3>
            <p>Niveau ${niveau} · ${MEMBRES.length} / ${Guildes.R.membres} membres</p>
            <progress value="690" max="${cap}" aria-label="Ouvrage vers le prochain niveau"></progress>
            <small>${nf(690)} / ${nf(cap)} vers le niveau ${niveau + 1}</small></div></div>
        <div class="vy-loge__ouvrage"><h4>Plein de la semaine</h4>
          <progress value="${semaine}" max="${objectif}" aria-label="Ouvrage de la semaine"></progress><p>${nf(semaine)} / ${nf(objectif)} Ouvrage</p>
          ${bouton('contribuer', 'Simuler le don d’XP')}</div>
        <div class="vy-loge__message"><h4>Message de guilde</h4><p>Rendez-vous à la Loge après la Veille.</p></div>
      </header>
      <nav class="vy-loge__onglets" aria-label="Sections de la guilde">
        ${Object.entries(ONGLETS).map(([vue, nom]) => `<button type="button" class="vy-loge__onglet" data-act="onglet" data-vue="${vue}" aria-pressed="${vue === s.onglet}">${nom}</button>`).join('')}
      </nav><section class="vy-loge__page" aria-label="${ONGLETS[s.onglet]}">${contenu}</section></div>`;
  },

  renderGuideGuilde() {
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
      <header class="vy-fam__tete vy-guilde__tete"><span class="vy-guilde__armes" aria-hidden="true"><img src="assets/ui/objets/etendard.png" alt="" draggable="false"><img src="assets/ui/objets/blason.png" alt="" draggable="false"></span><div><b>Les guildes arrivent avec le serveur</b><small>une guilde par compte, ${R.membres} comptes au plus</small></div></header>
      <p class="vy-fam__desc">On en fonde une à ${['', 'un', 'deux', 'trois', 'quatre', 'cinq'][R.fondateurs] || R.fondateurs}, au Greffe des Francs-Marcheurs, dans la ville de Kaldum : une Charte signée par ${['', 'un', 'deux', 'trois', 'quatre', 'cinq'][R.fondateurs] || R.fondateurs} comptes (un personnage de niveau ${R.niveauFondateur} au moins), ${nf(R.prixCharte)} Dragmes. Une guilde ne donne jamais de force en combat : ses niveaux ouvrent du confort, de l'apparence et des services.</p>
      <div class="vy-mont__part"><h4>Ton don d'expérience <small>un aperçu : rien n'est prélevé avant le serveur</small></h4>
        <div class="vy-mont__parts" role="group" aria-label="Part de l'expérience donnée à la guilde">${parts}</div>
        <p class="vy-guilde__calcul">Au niveau ${L}, un combat ordinaire rapporte environ <b>${nf(xp)} XP</b>. À ${part} %, tu en donnes <b>${nf(preleve)}</b>, et la guilde reçoit <b>${virgule(points)} point${points >= 2 ? 's' : ''} d'Ouvrage</b> : un combat donné en entier vaut ${R.pointsCombat} points, à tout niveau.${partMonture ? ` Ta monture prend déjà ${partMonture} % : ta part va jusqu'à ${R.partTotaleMax - partMonture} %.` : ''}</p>
        <p class="vy-guilde__calcul">Jouer à deux membres ou plus compte ${String(R.ensemble).replace('.', ',')} fois. Le plein de la semaine vaut ${R.pleinBase} points plus ${R.pleinParCompte} par compte actif (${R.comptesMax} au plus), doublé sous le niveau ${R.pleinDoubleSous} : plein fait, ta part n'est plus prélevée.</p></div>
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
