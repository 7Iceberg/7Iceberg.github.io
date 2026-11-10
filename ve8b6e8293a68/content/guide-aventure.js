const GuideAventure = (() => {
  const article = (id, titre, texte, fenetre, icone) => ({ id, titre, texte, fenetre, icone });
  const rubriques = [
    { id: 'debuter', titre: 'Devenir Veilleur', icone: 'carte', articles: [
      article('premiers-pas', 'Tes premiers pas', 'Explore les alentours, parle aux habitants et suis les quêtes de ton journal. Observe le niveau des groupes avant de les attaquer. Une fois le combat terminé, pense à regarder tes succès et leurs récompenses.', 'quetes'),
      article('progression', 'Niveaux et expérience', 'Combats, quêtes et succès font progresser ton personnage. Chaque niveau gagné apporte cinq points à répartir entre Terra, Ignis, Aqua et Aer. Choisis les éléments de tes sorts et garde un équipement adapté à ton niveau.', 'carac'),
      article('sceaux', 'L’Arbre des Sceaux', 'Les points répartis dans les quatre voies remplissent leurs jauges de Sceaux. L’arbre permet de spécialiser ta façon de jouer : tenir, soigner, retenir ou te déplacer. L’équipement et les parchemins ne remplissent pas ces jauges. Ouvre les Caractéristiques puis « Sceaux » pour préparer ton arbre.', 'carac'),
      article('succes', 'Succès et récompenses', 'Le monde garde la trace de tes découvertes et de tes exploits. Un succès débloqué peut garder ses récompenses en attente : ouvre la fenêtre Succès et le coffre des récompenses pour les récupérer.', 'succes'),
      article('veille', 'La Veille du jour', 'La Veille du jour est une contribution au réseau des Relais de l’Aube. Consulte le tableau d’un relais pour connaître le dépôt demandé et les récompenses. Les jours manqués peuvent se conserver en réserve, jusqu’à sept.', 'carte'),
    ] },
    { id: 'caracteristiques', titre: 'Caractéristiques', icone: 'carac', articles: [
      article('repartition', 'Répartir ses points', 'Terra, Ignis, Aqua et Aer sont les quatre caractéristiques que tu peux augmenter avec tes points de niveau. Leur coût augmente par paliers. Vitalité et Sagesse viennent de tes autres bonus, notamment de l’équipement et des parchemins. La feuille de répartition affiche le coût et le résultat avant validation.', 'carac'),
      article('terra', 'Terra', 'Terra renforce les dégâts de Terre et de Neutre. Chaque point augmente aussi la capacité de port de cinq pods. Dans l’Arbre des Sceaux, ses branches permettent de tenir le terrain ou d’ébranler l’adversaire.', 'carac', 'force'),
      article('ignis', 'Ignis', 'Ignis renforce les dégâts de Feu et les soins donnés. Ses Sceaux permettent de développer le Foyer, pour soutenir, ou le Brasier, pour frapper.', 'carac', 'intel'),
      article('aqua', 'Aqua', 'Aqua renforce les dégâts d’Eau. Dix points apportent un point de Prospection. Les Sceaux de Marée développent notamment le Retrait et l’Esquive ; Fortune accompagne les dégâts et le butin.', 'carac', 'chance'),
      article('aer', 'Aer', 'Aer renforce les dégâts d’Air. Dix points apportent un point de Tacle et de Fuite, auxquels s’ajoutent les autres bonus. Ses Sceaux développent la mobilité ou l’offensive.', 'carac', 'agi'),
      article('vitalite', 'Vitalité et points de vie', 'La Vitalité augmente tes points de vie maximum : un point apporte un PV. Ton niveau, tes Sceaux et tes autres bonus contribuent aussi à ta réserve. Avant un combat difficile, soigne-toi avec un consommable adapté.', 'carac', 'vita'),
      article('sagesse', 'Sagesse', 'La Sagesse augmente l’expérience reçue. Dix points apportent un point de Retrait et d’Esquive de PA et de PM. Elle ne se répartit pas avec les points de niveau : cherche-la dans l’équipement et les parchemins.', 'carac', 'sagesse'),
      article('pa', 'Points d’action', 'Les PA servent à lancer tes sorts et tes attaques. Chaque action indique son coût. Ils se renouvellent au début de ton tour, selon tes valeurs et les effets en cours. Prépare ton enchaînement avant de dépenser les derniers PA.', 'sorts', 'pa'),
      article('pm', 'Points de mouvement', 'Les PM permettent de te déplacer en combat. Une case coûte normalement un PM. Un obstacle, une occupation ou le Tacle adverse peuvent limiter ton chemin. Les déplacements et les sorts de mobilité se complètent.', 'carac', 'pm'),
      article('initiative', 'Initiative', 'L’Initiative participe à l’ordre de jeu. La somme de Terra, Ignis, Aqua et Aer y contribue, avec tes bonus. Les PV manquants réduisent l’Initiative transmise au combat ; arriver en bonne santé est donc utile.', 'carac', 'init'),
      article('dommages', 'Dommages et Puissance', 'Les dommages fixes ajoutent des dégâts ; certains ne concernent qu’un élément ou les coups critiques. La Puissance augmente les dégâts dans tous les éléments, sans donner les avantages secondaires de Terra, Ignis, Aqua ou Aer. Consulte les valeurs de tes sorts pour comparer tes choix.', 'carac', 'puissance'),
      article('critique', 'Coups critiques', 'Chaque sort ou arme possède son propre taux de critique. Tes bonus de Critique s’y ajoutent. Un critique utilise le jet critique du sort, puis ses éventuels dommages critiques. Un sort dont le taux de base est nul ne déclenche pas de critique.', 'sorts', 'crit'),
      article('resistances', 'Résistances', 'Les résistances réduisent les dégâts reçus. Les réductions fixes sont appliquées avant les résistances en pourcentage. Les résistances critiques et de poussée répondent à ces dégâts particuliers. Regarde les éléments de tes adversaires avant de choisir ton équipement.', 'carac', 'esquive'),
      article('tacle', 'Tacle et Fuite', 'Le Tacle gêne un adversaire qui tente de quitter ton contact. La Fuite aide à s’en dégager et limite les pertes de PA et de PM. Aer nourrit les deux valeurs ; l’équipement, les Sceaux et certains effets les modifient aussi.', 'carac', 'tacle'),
      article('retrait', 'Retrait et Esquive PA / PM', 'Le Retrait améliore tes chances d’enlever des PA ou des PM ; l’Esquive aide à les conserver. Le résultat dépend des deux combattants et des points encore disponibles. Un retrait n’est donc pas garanti : prévois une solution de repli.', 'carac', 'retrait'),
      article('soins', 'Soins et boucliers', 'Un soin rend des PV sans dépasser le maximum de la cible. Ignis et tes bonus renforcent les soins. Un bouclier absorbe des dégâts pendant sa durée : il protège, mais ne remplace pas les PV perdus.', 'carac', 'soins'),
      article('prospection', 'Prospection', 'La Prospection améliore tes chances de trouver des ressources à la fin d’un combat. Aqua, l’équipement et les Sceaux peuvent l’augmenter. Tous les butins ne suivent pas la même règle : les équipements ont leurs propres taux.', 'carac', 'pp'),
      article('pods', 'Pods', 'Les pods représentent le poids que tu portes. Ton niveau, Terra et certains bonus augmentent ta capacité. Au-delà de cette limite, tu ne peux plus te déplacer dans le monde : vends, utilise ou dépose une partie du sac.', 'sac', 'pods'),
      article('parchemins', 'Parchemins de caractéristique', 'Ces consommables donnent des points permanents supplémentaires, distincts de ceux répartis à chaque niveau. Leur usage est limité par caractéristique. Ils ne donnent pas de Sceaux : consulte l’objet avant de l’utiliser.', 'sac'),
    ] },
    { id: 'combat', titre: 'Comprendre le combat', icone: 'sorts', articles: [
      article('placement', 'Placement et tours', 'Au début du combat, choisis une case de départ autorisée puis confirme. À ton tour, déplace-toi, lance tes sorts et termine ton tour. Utilise le temps adverse pour préparer tes prochaines actions.', 'sorts'),
      article('portee', 'Portée et ligne de vue', 'La portée appartient au sort : vérifie sa distance minimale, sa distance maximale et son éventuel lancer en ligne. Un obstacle ou un combattant peut bloquer la ligne de vue. Une zone peut atteindre plusieurs cases : vérifie aussi la position de tes alliés.', 'sorts'),
      article('invocations', 'Invocations', 'Une invocation combat aux côtés de son propriétaire et joue après lui. Invoquer demande une case et le respect de la limite du sort et du combattant. Les invocations ne suffisent pas à maintenir une équipe en vie quand ses combattants principaux sont vaincus.', 'sorts', 'invoc'),
      article('poussee', 'Poussée et attraction', 'Déplacer un adversaire permet de libérer un passage, de rompre un contact ou de préparer une zone. Une poussée bloquée peut infliger des dégâts de collision. Les dommages et la résistance de poussée modifient ce résultat.', 'sorts'),
      article('effets', 'États et effets temporaires', 'Brûlure, invisibilité, provocation, bonus et malus changent les possibilités d’un combattant. Lis leur durée et leurs conditions. Les effets d’un boss peuvent demander une réponse précise plutôt que davantage de dégâts.', 'carnet'),
      article('donjons', 'Donjons et boss à clé', 'Un donjon enchaîne plusieurs salles. Chaque boss possède sa manière d’être affronté : observe le terrain, ses états et ses réactions. Le trousseau conserve les clés rangées et leur disponibilité. Les Nœuds permettent de durcir un combat contre davantage de récompenses.', 'carnet'),
    ] },
    { id: 'monde', titre: 'Voyager et découvrir', icone: 'carte', articles: [
      article('carte', 'Carte et relais', 'La carte du monde aide à retrouver régions, lieux et chemins. Les Relais de l’Aube sont tes repères de voyage. Explore les sorties et consulte tes quêtes pour choisir la prochaine étape.', 'carte'),
      article('quetes', 'Quêtes et journal', 'Parle aux habitants et lis les étapes de tes quêtes. Certaines demandent des combats, des objets ou une exploration. Le journal distingue les quêtes actives et terminées ; suis celles qui correspondent à ton aventure.', 'quetes'),
      article('factions', 'L’Aube et la Chaîne', 'Les factions portent des visions différentes du monde. Leur fenêtre présente ton serment, ta progression et tes possibilités. Les conditions d’engagement et de reniement sont indiquées au moment du choix.', 'faction'),
      article('guildes', 'Guildes et vie commune', 'La fenêtre Guilde rassemble les informations et fonctions disponibles de ta communauté. Les fonctions entre joueurs dépendent de leur disponibilité dans ta version du jeu. Les rangs et droits organisent ce que chaque membre peut faire.', 'guilde'),
    ] },
    { id: 'economie', titre: 'Sac et économie', icone: 'sac', articles: [
      article('inventaire', 'Équipement et panoplies', 'Le sac rassemble ressources, consommables et équipements. Lis les conditions et les effets d’un objet avant de l’équiper. Plusieurs pièces d’une même panoplie peuvent donner un bonus supplémentaire.', 'sac'),
      article('dragmes', 'Dragmes et banque', 'Les Dragmes sont la monnaie de ton aventure. Tu en gagnes notamment par les combats, les quêtes et les ventes. La banque permet de déposer des objets et des Dragmes pour alléger le sac ; consulte un service bancaire dans le monde.', 'sac'),
      article('metiers', 'Récolte et artisanat', 'Les métiers permettent de récolter des ressources et de fabriquer des objets. La fenêtre Métiers présente les niveaux, recettes et ingrédients. Utilise les ateliers et les ressources de ta région pour préparer ton équipement.', 'metiers'),
      article('boutique', 'Éclats et Boutique des Cimes', 'Les Éclats servent à la Boutique des Cimes, notamment pour les cosmétiques. Ils sont distincts des Dragmes. Consulte les sources d’Éclats, les conditions des offres et leur disponibilité dans la boutique. Un article annoncé « Bientôt » n’est pas encore livré en jeu.', 'boutique'),
      article('garderobe', 'Garde-robe et apparence', 'La Garde-robe permet de composer ton apparence avec les cosmétiques possédés. Tes choix visuels accompagnent ton personnage sans remplacer les caractéristiques de son équipement.', 'garderobe'),
    ] },
    { id: 'compagnons', titre: 'Compagnons de route', icone: 'familiers', articles: [
      article('familiers', 'Familiers', 'Un familier te suit et apporte un bonus. Obtiens son œuf ou découvre les échanges de sa famille, puis nourris-le avec des ressources pour le faire grandir. Il n’a ni heure de repas imposée ni risque de mourir de faim.', 'familiers'),
      article('montures', 'Montures', 'Une monture accompagne ton personnage, accélère ses déplacements lorsqu’il la monte et lui apporte son bonus. Elle progresse grâce aux ressources et à la part d’expérience que tu lui attribues. Sa fenêtre permet de régler cette part et de monter ou descendre.', 'montures'),
    ] },
    { id: 'pratique', titre: 'Aide pratique', icone: 'options', articles: [
      article('sauvegarde', 'Sauvegarde et changement d’appareil', 'Dans cette version, tes personnages sont conservés dans ce navigateur. Utilise l’export du menu pour garder un code et l’import pour reprendre sur un autre appareil. Un ancien code peut être refusé pour éviter de revenir en arrière. Garde une copie récente avant d’effacer les données du navigateur.', 'options'),
      article('interface', 'Interface et raccourcis', 'La barre des menus donne accès aux fenêtres du jeu ; la grille rassemble tous les menus. Les touches indiquées sur les boutons les ouvrent directement. Les Options permettent de régler l’affichage et, sur ordinateur, de personnaliser les blocs du HUD.', 'options'),
    ] },
  ];
  const normaliser = s => String(s || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
  const complements = [];
  let catalogue = null, indexLecture = null;
  const obtenir = () => {
    if (!catalogue) {
      catalogue = rubriques.map(r => ({ ...r, articles: r.articles.slice() }));
      for (const fn of complements) fn(catalogue);
    }
    return catalogue;
  };
  const noeuds = (liste = obtenir()) => liste.flatMap(r => [r, ...noeuds(r.enfants || [])]);
  const trouver = id => noeuds().flatMap(r => r.articles || []).find(a => a.id === id);
  const branche = (id, liste = obtenir()) => noeuds(liste).find(r => (r.articles || []).some(a => a.id === id));
  const chemin = (id, liste = obtenir()) => {
    for (const r of liste) {
      if ((r.articles || []).some(a => a.id === id)) return [r.id];
      const suite = chemin(id, r.enfants || []);
      if (suite.length) return [r.id, ...suite];
    }
    return [];
  };
  const index = () => {
    if (!indexLecture) {
      const visiter = (liste, parents = []) => liste.flatMap(r => [
        ...(r.articles || []).map(article => ({ article, rubrique: r, parents: [...parents, r], texte: normaliser([...parents, r].map(p => p.titre).join(' ') + ' ' + article.titre + ' ' + article.texte + ' ' + (article.sortsClasse ? (DATA.classes[article.sortsClasse].spells || []).map(id => { const d = DATA.spells[id]; return d ? d.name + ' ' + d.desc : ''; }).join(' ') : '')) })),
        ...visiter(r.enfants || [], [...parents, r]),
      ]);
      indexLecture = visiter(obtenir());
    }
    return indexLecture;
  };
  const resultats = q => {
    const termes = normaliser(q).trim().split(/\s+/).filter(Boolean);
    return index().filter(r => termes.every(t => r.texte.includes(t)));
  };
  const chercher = q => {
    const ids = new Set(resultats(q).map(r => r.article.id));
    const filtrer = liste => liste.map(r => ({ ...r,
      articles: (r.articles || []).filter(a => ids.has(a.id)), enfants: filtrer(r.enfants || []),
    })).filter(r => r.articles.length || r.enfants.length);
    return filtrer(obtenir());
  };
  const completer = fn => { complements.push(fn); catalogue = null; indexLecture = null; };
  return { get rubriques() { return obtenir(); }, trouver, branche, chemin, noeuds, chercher, resultats, index, normaliser, completer };
})();
