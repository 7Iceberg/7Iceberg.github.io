GuideAventure.completer(rubriques => {
  const a = (id, titre, texte, fenetre, options) => ({ id, titre, texte, fenetre, ...options });
  const noeud = (id, titre, icone, articles, enfants = []) => ({ id, titre, icone, articles, enfants });
  const rubrique = id => rubriques.find(r => r.id === id);

  rubrique('debuter').articles.push(
    a('carnet-aventure', 'Parcours et suggestions', 'Parcours rassemble les objectifs de ton personnage et leur avancement. Suggestions propose des quêtes accessibles, des régions encore à explorer et des succès commencés. Utilise les filtres de niveau, région et activité, puis les pages pour choisir une piste. Une suggestion ne donne aucune récompense supplémentaire : les gains restent ceux de la quête ou du succès.', 'aventure'),
    a('rythmes', 'Les rendez-vous du Veilleur', 'La Veille du jour, les avis de recherche et certains entraînements ont leur propre rythme. Lis le tableau ou le service concerné pour savoir ce qui est disponible. La boutique annonce également ses rotations et la roue de la semaine. Un objectif quotidien reste une possibilité, pas une obligation.', 'boutique'),
  );
  rubrique('debuter').articles.find(x => x.id === 'carnet-aventure').fenetre = null;

  rubrique('combat').articles.push(
    a('armes', 'Armes et attaque', 'L’arme équipée fournit une attaque avec son coût en PA, son élément et sa zone. Consulte sa fiche et son attaque dans la barre avant de te placer. Les conditions d’équipement et la portée varient d’une arme à l’autre.', 'sac'),
    a('defis', 'Défis', 'Un Défi impose une contrainte pendant le combat et peut améliorer les gains si tu la respectes. Lis sa consigne avant de commencer, puis surveille son état. Certains boss possèdent un Défi associé à leur rencontre. La fenêtre de fin de combat indique le résultat.', 'succes'),
    a('noeuds', 'Nœuds', 'Les Nœuds sont des objets fabriqués qui rendent les combats plus difficiles. Tu peux en nouer jusqu’à quatre ; chacun apporte son bonus d’expérience et de butin. Leurs contraintes se combinent : commence avec un seul et vérifie ton équipement avant d’en ajouter.', 'sac'),
    a('cumuls', 'Durées, effets et cumuls', 'Un bonus ou un malus agit pendant la durée indiquée par le sort. Plusieurs effets peuvent coexister, mais certains remplacent un effet précédent ou ont leur propre limite. Les Faveurs de l’Oriel et les boucliers de glyphes en sont des exemples. Consulte les effets du combattant et la description du sort plutôt que de supposer que tout se cumule.', 'sorts'),
    a('relance', 'Relance et limites de lancer', 'La relance indique quand un sort sera à nouveau disponible. Certains sorts sont aussi limités par tour ou par cible. Les relances diminuent au début des tours du lanceur. Avoir assez de PA ne suffit donc pas toujours à rejouer la même action.', 'sorts'),
    a('ordre-tour', 'Ordre de jeu et fin de tour', 'L’ordre des combattants se lit dans la barre de combat. Tes PA et PM se renouvellent au début de ton tour, tandis que certains effets se déclenchent à ce moment. Termine ton tour quand tes actions sont faites ; attends le tour suivant pour rejouer. La jauge indique le temps réellement disponible.', 'sorts'),
    a('previsualisation', 'Choisir une cible', 'Sélectionner un sort fait apparaître ses cases de lancer et sa zone. Vérifie le coût, les obstacles et toutes les entités dans cette zone avant de confirmer. Une zone peut toucher alliés et ennemis selon les règles du sort ; sa couleur ne remplace pas sa description.', 'sorts'),
    a('bilan-combat', 'Écran de fin de combat', 'Le bilan présente le résultat, l’expérience, les Dragmes et le butin. Il signale aussi les quêtes, succès et étapes de donjon concernés. Les récompenses de succès peuvent attendre dans leur coffre : elles ne sont pas toutes remises avec le butin du combat.', 'succes'),
    a('defaite', 'Défaite et abandon', 'Dans le monde, perdre ou abandonner un combat ramène ton personnage à son relais avec la moitié de ses PV maximum. Une sortie de donjon met fin à cette tentative. Soigne-toi et revois ton placement avant de repartir. L’entraînement du Dojo a son propre bilan et restitue les PV d’avant la séance.', 'carte'),
  );
  rubrique('combat').enfants = [
    noeud('combat-etats', 'États de combat', 'carac', [
      a('etat-invisible', 'Invisible', 'Une entité invisible ne se vise pas directement par un adversaire qui ne la voit pas. Les zones peuvent néanmoins l’atteindre. Certains effets la révèlent ; une cible Traquée ne peut pas se cacher. Les règles exactes d’une attaque dépendent du sort utilisé.', 'sorts'),
      a('etat-traque', 'Traqué', 'La cible marquée reste visible à celui qui la traque. Le Lyssar exploite la Traque pour renforcer ses tirs et certains passages à travers les obstacles. La marque porte un propriétaire : toutes les attaques de tous les combattants ne gagnent pas automatiquement ses avantages.', 'sorts'),
      a('etat-provoque', 'Provoqué', 'Un combattant provoqué ne peut lancer ses sorts de dégâts que sur l’auteur de la provocation. Le contact avec certaines créatures, comme un leurre provocateur, peut aussi contraindre ses cibles. Regarde qui provoque avant de dépenser tes PA.', 'sorts'),
      a('etat-sonne', 'Sonné', 'Un combattant sonné passe son tour. Certains boss peuvent être sonnés en répondant à leur mécanique, par exemple une collision préparée contre le terrain. Ce n’est pas une simple perte de PM.', 'carnet'),
      a('etat-assise', 'Ancré', 'L’Ancrage est une posture du Thalor : il résiste aux déplacements imposés, réduit les coups reçus et modifie plusieurs de ses sorts. Il reste debout et peut encore marcher. Relancer l’Ancrage lui rend la posture Mobile ; il doit libérer sa cible avant de s’ancrer.', 'sorts'),
      a('etat-insoignable', 'Insoignable', 'Cet état empêche de récupérer des PV par un soin. Un bouclier protège autrement, mais ne rend pas les PV manquants. Les interactions particulières, comme Rayonnant, se lisent dans les sorts qui les appliquent.', 'sorts'),
      a('etat-rayonnant', 'Rayonnant', 'L’Oriel peut rendre un allié Rayonnant sous l’Aube. Cet état améliore les soins reçus et interagit avec ses Faveurs et l’état Insoignable. Prépare l’ordre de tes soins et de tes soutiens pour profiter de ces liens.', 'sorts'),
      a('etat-invulnerable', 'Invulnérable', 'Une cible invulnérable ne reçoit pas les dégâts habituels. Cherche la condition qui enlève sa protection : un boss peut demander du placement, un élément ou une action particulière. Frapper plus fort sans lever la protection ne résout pas la rencontre.', 'carnet'),
      a('etat-tenu', 'Porté', 'Le Thalor peut soulever une créature avec sa trompe et marcher avec elle. La cible libère sa case, puis peut être déposée à côté ou projetée plus loin. Elle revient au sol en fin de tour. Une cible fixe ou ancrée résiste à la prise.', 'sorts'),
      a('immobilisation', 'Immobilisation et obstacles', 'Perdre ses PM empêche de marcher, sans nécessairement interdire tous les sorts de mobilité. Les murs, trous, créatures fixes et protections contre le déplacement obéissent à d’autres règles. Distingue une case inaccessible d’un effet qui retire des PM.', 'sorts'),
    ]),
    noeud('combat-terrain', 'Sorts et terrain', 'sorts', [
      a('glyphes', 'Glyphes', 'Un glyphe couvre des cases du sol et porte les effets indiqués par son sort. Les effets s’appliquent notamment au début du tour d’une entité située dedans ; certains sorts les déclenchent autrement. Les glyphes du Velmar protègent ses alliés. Une Étincelle de l’Oriel s’éteint après avoir servi.', 'sorts'),
      a('pieges', 'Pièges', 'Un piège attend le passage d’une entité adverse. Sa zone de déclenchement et ses effets viennent du sort qui l’a posé. Déplacer un adversaire peut préparer le déclenchement de plusieurs pièges ; vérifie les cases libres et les limites de pose.', 'sorts'),
      a('brulures', 'Brûlures et dégâts différés', 'Une brûlure inflige ses dégâts sur plusieurs tours, selon sa durée et son élément. Les dégâts différés permettent de continuer à peser après ton action. Un soin différé, comme la lumière des Étoiles de l’Oriel, arrive lui aussi plus tard : anticipe les dégâts que l’allié subira avant de le recevoir.', 'sorts'),
      a('teleportation', 'Téléportation et échange', 'Une téléportation change instantanément de case ; un échange permute deux positions. Ce sont des effets de sorts, avec leur coût, leurs cibles et leurs restrictions. Ils ne suivent pas nécessairement le chemin d’une marche et peuvent aider à franchir un obstacle.', 'sorts'),
      a('invocations-detail', 'Créatures invoquées', 'Une invocation est une entité de combat avec son rôle et ses sorts. Elle joue après son propriétaire et agit selon son comportement. Le Fennal gère une jauge de meute et des coûts propres à chaque bête. Les reliques de l’Orvald agissent automatiquement dans cette version.', 'sorts'),
    ]),
    noeud('combat-zones', 'Zones d’effet', 'carte', [
      a('zone-point', 'Point', 'Seule la case visée est concernée. Une cible unique exige souvent une ligne de vue dégagée. La fiche du sort précise quelles entités peuvent être touchées.', 'sorts', { schema: { shape: 'single', size: 0 } }),
      a('zone-croix', 'Croix', 'La case visée et les cases alignées sur ses deux axes sont concernées, dans la taille du sort. Les diagonales ne font pas partie de la croix.', 'sorts', { schema: { shape: 'cross', size: 2 } }),
      a('zone-cercle', 'Cercle tactique', 'La distance compte les pas horizontaux et verticaux. Un cercle tactique forme donc un losange dans les coordonnées de la grille : toutes les cases à la distance autorisée du centre sont touchées.', 'sorts', { schema: { shape: 'circle', size: 2 } }),
      a('zone-ligne', 'Ligne', 'La zone part de la case visée et continue dans la direction du lancer, sur le nombre de cases prévu par le sort. Sa direction dépend de la position du lanceur.', 'sorts', { schema: { shape: 'line', size: 3 } }),
      a('zone-percante', 'Ligne perçante', 'Une ligne perçante part du lanceur et continue jusqu’au bord ou au premier obstacle qui bloque la vue. Certains tirs du Lyssar passent les obstacles vers sa cible Traquée : vérifie la particularité du sort.', 'sorts', { schema: { shape: 'pierce', size: 1 } }),
    ]),
  ];

  rubrique('monde').articles.push(
    a('bestiaire', 'Bestiaire et familles', 'Le Bestiaire rassemble les monstres, leurs régions et leurs particularités. Les familles partagent des comportements mais leurs membres peuvent avoir des résistances ou des sorts différents. Observe la fiche d’une créature avant de choisir ton élément.', 'carnet'),
    a('rares', 'Les monstres d’argent', 'Certaines familles d’Orsane et de Kaldum ont une variante rare d’argent, plus résistante et plus dangereuse. Ces rencontres apportent davantage d’expérience et de chances de butin. Elles s’inscrivent aussi dans le Carnet du Veilleur.', 'carnet'),
    a('avis', 'Avis de recherche', 'À la tour de la Garde, sur la Place du Relais, prends un avis avant de partir chercher sa cible. Après l’avoir vaincue, reviens toucher sa prime : expérience, Dragmes et Insignes de la Garde. Les avis se renouvellent selon le jour de la Veille.', 'carte'),
    a('dojo', 'Le Dojo et les Reflets', 'Le Dojo permet d’essayer ton équipement et tes sorts sur des mannequins. Cet entraînement ne rapporte ni expérience, ni Dragmes, ni butin et ne fait pas avancer les quêtes. Ses mesures aident à comparer tes enchaînements. Les Reflets proposent d’autres entraînements liés aux classes.', 'carte'),
    a('transports', 'Relais, rappel et Nacelle', 'Découvrir les relais prépare tes déplacements et ton retour après une défaite. Les objets de rappel et les services de transport ont leurs conditions. La Nacelle relie Ervane et la Cité des Cimes dans le parcours de l’île ; les quêtes guident son ouverture.', 'carte'),
    a('suivi-quetes', 'Suivre une quête', 'Le journal distingue les quêtes en cours, terminées et masquées. Épingle celle que tu veux suivre pour garder son objectif à l’écran. Une quête peut attendre un dialogue, une ressource, une visite ou un combat précis ; une étape terminée doit parfois être rendue à un habitant.', 'quetes'),
  );
  rubrique('monde').articles = rubrique('monde').articles.filter(x => x.id !== 'guildes');
  rubriques.push(noeud('vie-guilde', 'Guildes et Pactes', 'guilde', [
    a('guildes', 'Une Loge de Veilleurs', 'Les guildes arrivent avec le serveur. La fenêtre Guilde présente déjà les règles et un aperçu du don d’expérience ; cet aperçu ne prélève rien. Les niveaux de guilde ouvriront des services, du confort et des apparences, sans donner de puissance en combat.', 'guilde', { statut: 'Avec le serveur' }),
    a('guilde-fonder', 'Charte et recrutement', 'La fondation est prévue au Greffe des Francs-Marcheurs, avec une Charte signée par plusieurs comptes. Une place correspondra à un compte, même avec plusieurs personnages. Les invitations et candidatures devront être acceptées ; la fenêtre Guilde présente les conditions prévues.', 'guilde', { statut: 'Avec le serveur' }),
    a('guilde-droits', 'Rangs et droits', 'Les rangs prévus sont Maître de Loge, Second, Officier, Compagnon et Recrue. Les droits seront attachés aux rangs. On ne pourra gérer que les rangs inférieurs au sien ni transmettre un droit que l’on ne possède pas. Chacun gardera la maîtrise de son don d’expérience.', 'guilde', { statut: 'Avec le serveur' }),
    a('guilde-ouvrage', 'Ouvrage et plein de la semaine', 'L’expérience donnée deviendra de l’Ouvrage avec une conversion qui valorise le même effort à tous les niveaux. Un plein hebdomadaire bornera la contribution ; une fois atteint, le prélèvement s’arrêtera. La part de guilde et celle de monture seront limitées ensemble.', 'guilde', { statut: 'Avec le serveur' }),
    a('guilde-loge', 'Loge, coffre et journal', 'La Loge sera le lieu commun de la guilde. Les accès au coffre et les actions sensibles dépendront des droits, avec un journal pour en garder la trace. Ces services collectifs ne sont pas disponibles dans la partie locale.', 'guilde', { statut: 'Avec le serveur' }),
    a('guilde-pacte', 'Vigies, Pactes et Cairns', 'Une Vigie représentera le guet de la guilde dans une zone. Les Pactes uniront plusieurs guildes ; les Cairns seront les objectifs de territoire. Leurs combats, récompenses et horaires dépendent du futur jeu en ligne. Ils ne sont pas simulés comme des conquêtes réelles dans cette version.', 'guilde', { statut: 'Avec le serveur' }),
  ]));

  rubrique('economie').articles.push(
    a('panoplies', 'Bonus de panoplie', 'Plusieurs pièces d’une même panoplie débloquent ses bonus. Compare le gain d’une pièce isolée avec celui de l’ensemble : le niveau de l’objet ne dit pas tout. La fiche de panoplie montre les pièces et les effets associés.', 'sac'),
    a('ensembles', 'Ensembles d’équipement', 'Un ensemble mémorise une tenue d’équipement pour la retrouver plus vite. Il ne crée pas les objets : tu dois toujours les posséder et remplir leurs conditions. La Garde-robe garde séparément tes choix d’apparence.', 'sac'),
    a('marche', 'Le Marché des Cimes', 'Les comptoirs des équipements, ressources et vivres proposent un étal du jour. Ils rachètent aussi les objets de leur catégorie. Revendre souvent le même objet dans la journée en fait baisser le prix ; lis le montant annoncé avant de confirmer.', 'carte'),
    a('echanges', 'Échanges entre joueurs', 'Les échanges directs et hôtels des ventes entre joueurs attendent le serveur. Leur préparation prévoit une offre à revérifier après chaque modification et un transfert unique lorsque les deux joueurs valident. Le Marché local des Cimes reste un service distinct.', 'carte', { statut: 'Avec le serveur' }),
    a('banque', 'Coffre de la Banque de l’Aube', 'Dépose tes objets et tes Dragmes à la banque pour alléger ton sac. Un objet déposé n’est plus disponible dans ton inventaire tant que tu ne l’as pas retiré. Les interactions de la banque indiquent les quantités avant chaque opération.', 'carte'),
    a('apparences', 'Teintures, lueurs et auras', 'La Garde-robe regroupe les cosmétiques possédés et leurs emplacements. Les teintures changent les couleurs, les lueurs et auras accompagnent la silhouette. Vérifie les catégories compatibles et l’aperçu avant de composer ton apparence.', 'garderobe'),
    a('titres', 'Titres et collections', 'Les succès et autres récompenses peuvent débloquer un titre ou un cosmétique. Les collections de la Garde-robe rassemblent plusieurs apparences autour d’un thème. Un titre distingue ton parcours ; il n’ajoute pas de dégâts.', 'garderobe'),
  );
  rubriques.push(noeud('artisanat', 'Métiers et ateliers', 'metiers', [
    a('metiers-niveaux', 'Apprendre et progresser', 'Tous les métiers sont ouverts au personnage. Chacun progresse par ses récoltes ou fabrications, indépendamment du niveau de combat. Une ressource ou une recette peut demander un niveau de métier minimum. La fenêtre Métiers affiche tes niveaux et les recettes.', 'metiers'),
    a('recolter', 'Récolter une ressource', 'Interagis avec une ressource du monde pour la récolter si ton métier le permet. Elle met ensuite un certain temps à revenir. Choisis une région adaptée à ton niveau de métier et surveille le poids ajouté à ton sac.', 'metiers'),
    a('ateliers', 'Fabriquer à l’atelier', 'Chaque métier a ses ateliers. Choisis une recette, vérifie le niveau demandé, les ingrédients et la quantité à fabriquer. Les halles des Cimes regroupent récoltes, forges et parures : la carte aide à retrouver le bon atelier.', 'metiers'),
    a('ingredients', 'Trouver les ingrédients', 'Une recette indique les ressources nécessaires. Certaines se récoltent, d’autres viennent des monstres ou de services du monde. Consulte les recettes et le Bestiaire pour préparer ta sortie plutôt que de porter tout ton stock.', 'metiers'),
    a('forgemagie', 'Amélioration des objets', 'La forgemagie est encore à l’étude pour Veylan. Aucun atelier de fusion de runes, concasseur ou annuaire d’artisans en ligne n’est disponible dans cette version. Pour améliorer ta tenue aujourd’hui, fabrique des équipements, complète une panoplie et développe tes Sceaux.', 'metiers', { statut: 'À l’étude' }),
  ]));

  rubrique('compagnons').articles.push(
    a('familier-progression', 'Nourrir son familier', 'Donne des ressources à ton familier pour le faire grandir. Sa progression et son bonus se lisent dans sa fenêtre. Il reste un compagnon de route : il ne devient pas une créature de combat à commander comme une invocation.', 'familiers'),
    a('monture-xp', 'Partager l’expérience avec sa monture', 'La fenêtre Montures permet de régler la part d’expérience consacrée à sa croissance. Monter et descendre modifient ton déplacement et le bonus monté. Vérifie la part choisie si tu veux privilégier la progression de ton personnage.', 'montures'),
  );
  rubrique('pratique').articles.push(
    a('discussion', 'Discussion et informations', 'Le panneau de discussion actuel rassemble les messages du système, des quêtes, du butin, des combats et des habitants. Ses filtres aident à retrouver une information. Les conversations publiques, privées et de groupe entre joueurs attendent la connexion au serveur.', 'journal'),
    a('profil', 'Profil du Veilleur', 'Le Profil réunit ton identité, ton équipement et les chiffres de ton aventure. Tu peux comparer les personnages de cet appareil. Les réglages de confidentialité préparent ce que les autres verront lorsque le jeu sera multijoueur.', 'profil'),
    a('groupe', 'Jouer en groupe', 'Les groupes entre joueurs et la recherche de compagnons attendent le serveur. Pour préparer un combat à plusieurs, chacun devra connaître son rôle, son placement et les zones de ses sorts. La version locale ne propose pas encore de recherche automatique de joueurs.', null, { statut: 'Avec le serveur' }),
    a('respect', 'Jouer ensemble', 'Explique tes intentions, laisse aux autres le temps de comprendre et garde les conseils utiles. Un échec sert à revoir le placement ou l’équipement. Les règles du jeu en ligne prévoiront le signalement des abus et leur examen par le Conseil.', null, { statut: 'Jeu en ligne à venir' }),
    a('limites-version', 'Ce qui est disponible', 'Le guide décrit d’abord le jeu jouable. Les rubriques marquées « Avec le serveur » ou « À l’étude » présentent une préparation. Il n’existe actuellement ni logement personnel à aménager, ni mariage, ni élevage reproductif, ni ligue PvP, ni expédition infinie jouable dans cette version.', null),
  );
  rubriques.push(noeud('securite', 'Sauvegardes et sécurité', 'options', [
    a('securite-locale', 'Tes personnages sur cet appareil', 'Cette version conserve les personnages dans le navigateur, sans compte de connexion. Effacer les données du site ou changer de navigateur peut faire perdre ces sauvegardes. Exporte régulièrement un code récent et conserve-le dans un endroit privé.', 'options'),
    a('securite-code', 'Protéger son code d’export', 'Le code d’export contient les données de ton personnage et permet de reprendre sa partie ailleurs. Ne le publie pas. Il n’est pas chiffré et ne constitue pas une preuve de propriété d’un compte. Un import plus ancien peut être refusé pour empêcher le retour en arrière.', 'options'),
    a('securite-phishing', 'Éviter les faux messages', 'Méfie-toi des offres trop avantageuses, des menaces et des pages qui imitent le jeu. Vérifie l’adresse avant de saisir des informations. Ne donne jamais de mot de passe ou de code de protection à une personne qui te le réclame en message.', null),
    a('securite-comptes', 'Les comptes à venir', 'Les comptes et leur protection restent à développer avec le serveur. Il n’y a actuellement ni connexion par mot de passe ni application de double authentification à activer dans Veylan. Le guide sera mis à jour lorsque ces fonctions seront disponibles.', null, { statut: 'Avec le serveur' }),
  ]));

  const mecaniques = {
    sarkan: [
      ['fureur', 'Fureur', 'Les coups portés et reçus au contact nourrissent la Fureur. Elle renforce les dégâts tant que tu la gardes ; certains sorts la dépensent pour un coup décisif. Choisis entre maintenir ta pression et vider la jauge.'],
      ['serment', 'Le Serment', 'Le Serment désigne une cible jurée. Plusieurs sorts récompensent le fait de rester sur cette cible. Prépare ton déplacement et tes PA avant de t’engager.'],
      ['charges', 'Charges et enchaînements', 'Certains coups gagnent en force avec le temps, les lancers répétés ou les PM conservés. Le saut prépare la mêlée, mais dépenser toute sa mobilité peut diminuer l’intérêt d’un autre coup. Lis chaque condition.'],
    ],
    lyssar: [
      ['affut', 'L’Affût', 'Au début de son tour, le Lyssar tire plus loin et plus fort. Marcher ou utiliser certains replis fait fondre l’Affût. Trouve une case sûre avant de tirer plutôt que de te déplacer sans objectif.'],
      ['traque', 'La Traque', 'Marque une proie puis enchaîne tes tirs pour renforcer la Traque. Certains tirs exploitent la marque pour franchir les obstacles. Compare l’intérêt de concentrer tes attaques et celui de contenir une autre menace.'],
      ['distance', 'Garder la distance', 'Collets, reculs et balise aident à éloigner un adversaire. Vérifie aussi la portée minimale : un excellent tir à distance ne se lance pas forcément au contact.'],
    ],
    oriel: [
      ['veille', 'Aube et Crépuscule', 'La Bascule du Ciel change la Veille de l’Oriel. L’Aube favorise les soins et Rayonnant ; le Crépuscule fait voler la vie à ses attaques. Le bon ciel dépend de l’urgence et de la position des alliés.'],
      ['astres', 'Soleil, Lune, Étoiles et Astres tombés', 'Ignis soigne directement, Aqua soigne notamment en frappant, Aer prépare des soins différés et Terra travaille au sol et dans la durée. Un soin promis pour plus tard ne protège pas immédiatement un allié en danger.'],
      ['faveurs', 'Faveurs, Ombres et Étincelles', 'Une Faveur renforce un allié et une Ombre affaiblit un ennemi, avec leurs limites propres. Certains lancers sur une case vide déposent une Étincelle à récupérer. La Lanterne et les autres soutiens complètent ce placement.'],
    ],
    nerith: [
      ['ombre', 'Se cacher et choisir son moment', 'La Nerith prépare ses approches dans l’invisibilité et exploite des attaques renforcées lorsqu’elle est cachée. Être Traquée empêche de disparaître : garde une sortie et surveille les zones adverses.'],
      ['pli', 'Pièges et Pli', 'Les pièges déclenchés nourrissent le Pli. Certains coups dépensent cette réserve. Poussées, attractions et placement du leurre aident à faire marcher une cible sur les cases préparées.'],
      ['leurre', 'Leurre et larcins', 'Le Leurre détourne l’attention et permet des échanges de position. D’autres sorts volent des points, des protections ou améliorent le butin lorsqu’ils achèvent. Le moment du dernier coup compte autant que sa force.'],
    ],
    fennal: [
      ['meute', 'La jauge de meute', 'Chaque bête occupe une part de la jauge : Glym, Grouk et Molh n’ont pas le même coût ni le même rôle. Il faut de la place dans la jauge et sur le terrain pour appeler la bonne bête.'],
      ['ordres', 'Mener et soutenir', 'Le Coup de Sifflet fait frapper la meute immédiatement selon ses possibilités. Plusieurs sorts blessent un ennemi ou soutiennent un allié selon la cible. Place les bêtes pour qu’elles puissent agir sans te bloquer.'],
      ['sacrifice', 'Sacrifice et horde', 'Le sacrifice convertit une bête en effet immédiat. Une horde temporaire augmente tes possibilités mais finit par se disperser. Anticipe sa durée pour ne pas perdre ta protection au mauvais moment.'],
    ],
    velmar: [
      ['glyphes', 'Glyphes protecteurs', 'Le Velmar dessine des zones de protection. Les alliés placés dans ses glyphes profitent de leurs effets ; certains sorts peuvent les déclencher autrement. Protège les cases où l’équipe veut réellement jouer.'],
      ['carapace', 'Carapace et bouclier à rouage', 'Ses protections combinent boucliers, réduction et interactions avec les coups reçus. La Carapace Close et le bouclier à rouage ont leurs conditions propres : garde des PA pour protéger avant que l’ennemi joue.'],
      ['proteger', 'Tenir sans enfermer ses alliés', 'Une protection ne suffit pas si les alliés doivent la quitter pour atteindre leurs cibles. Prépare les lignes de vue et laisse des chemins. Les quatre voies offrent différentes façons de garder les siens.'],
    ],
    orvald: [
      ['filon', 'Filon et Trouvailles', 'L’Orvald marque un Filon. Des retraits sur la cible ennemie ou des soins sur le Filon allié peuvent le déclencher. Les Trouvailles gagnées servent ensuite à ses Fouilles, Pesées et Coups de Fortune.'],
      ['reliques', 'Réveiller les vieilles machines', 'Ses reliques remplissent des rôles de protection, placement, soutien ou dégâts. Elles agissent automatiquement dans cette version. La Besace peut encaisser pour les siens : son placement reste essentiel.'],
      ['demontage', 'Démontage', 'Démonter une relique la fait agir une dernière fois à sa place puis rend une Trouvaille. Choisis le moment où sa dernière action vaut davantage que sa présence sur le terrain.'],
    ],
    karsh: [
      ['soif', 'La Soif', 'La Soif monte au fil du combat. Gorgée la convertit en PA, Frénésie en puissance et d’autres coups la dépensent. La laisser monter au maximum expose le Karsh à sa propre faim.'],
      ['sang-noir', 'Sang Noir', 'Perdre des PV fait passer le Karsh par plusieurs paliers qui modifient sa force et ses protections. Ce bénéfice reste un risque : prépare ton vol de vie et garde assez de santé pour survivre aux actions suivantes.'],
      ['vol-vie', 'Se nourrir ou s’abîmer', 'Certaines attaques rendent de la vie ; des variantes plus brutales coûtent des PV. Compare le gain immédiat et ce que l’adversaire pourra encore te faire. La Forme Nocturne change fortement cet équilibre.'],
    ],
    thalor: [
      ['prise', 'Empoigner et jeter', 'Mobile, cet éléphant martial saisit une créature adjacente avec sa trompe. Il peut marcher avec elle, la déposer sans dégâts sur une case voisine ou la projeter plus loin. Les jets élémentaires modifient la zone d’arrivée ; prépare la destination avant de saisir.'],
      ['assise', 'Mobile et Ancré', 'Mobile, le Thalor prépare ses prises. Ancré, il abaisse ses appuis, résiste aux déplacements forcés et renforce poussées, attractions et prises au contact. Il peut encore marcher ; certains tirs portent moins loin mais frappent plus fort. Relancer l’Ancrage rend la posture Mobile.'],
      ['bloc', 'Le Bloc de Durren', 'Le Bloc offre une pièce à manipuler lorsque le terrain ne fournit pas la bonne cible. Son emplacement prépare prises, jets et collisions. Garde toujours les lignes de vue des alliés en tête.'],
    ],
  };
  rubrique('artisanat').enfants = (DATA.content.metiers || []).map(m => noeud('metier-' + m.id, m.nom, 'metiers', [a('metier-' + m.id + '-fiche', m.nom, m.description || 'Consulte les ressources et recettes de ce métier dans la fenêtre Métiers.', 'metiers')]));

  const nomsElements = { terre: 'Terra', feu: 'Ignis', eau: 'Aqua', air: 'Aer' };
  const classes = DATA.classesJouables().map(c => noeud('classe-' + c.id, c.name, 'perso', [
    a('classe-' + c.id + '-presentation', c.name + ' · ' + c.title, c.desc, 'sorts', { classe: c.id, presentationClasse: true }),
    ...(mecaniques[c.id] || []).map(([id, titre, texte]) => a('classe-' + c.id + '-' + id, titre, texte, 'sorts')),
    ...Object.entries(c.voies || {}).map(([element, v]) => a('classe-' + c.id + '-voie-' + element, nomsElements[element] + ' · ' + v.nom, v.metier.charAt(0).toUpperCase() + v.metier.slice(1) + '.', 'sorts', { icone: { terre: 'force', feu: 'intel', eau: 'chance', air: 'agi' }[element] })),
    a('classe-' + c.id + '-sorts', 'Sorts et variantes', 'Ce répertoire reprend les sorts de cette classe et leurs niveaux d’obtention. Il présente aussi les variantes encore verrouillées. Pour équiper les sorts de ton personnage, ouvre sa fenêtre Sorts.', 'sorts', { sortsClasse: c.id }),
  ]));
  rubriques.splice(2, 0, noeud('classes', 'Classes de Veylan', 'perso', [], classes));
});
