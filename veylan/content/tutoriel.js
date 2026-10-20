// Tutoriel d'ouverture : Orsane, la première quête « L'arrivée sur les Cimes » (orsane_arrivee),
// la Place du Relais puis la Porte des Clairières. Lu par js/guide.js ; validé par
// tools/validate-content.js (PNJ, cartes, quêtes et repères cités doivent exister).
//
// Une étape : { id, npc, say, saySouris, sayConfirme, court, humeur, cue, cueDialogue, until, si,
// saute, attendre, puisSi, bloc, retour, allie, deselect, enabled }.
//  - say : la bulle du guide, trois lignes au plus. **gras**, et {pa|...} {pm|...} {pv|...}
//    {cristal|...} {or|...} {voile|...} pour un mot en couleur. saySouris remplace say à la
//    souris, sayConfirme au doigt quand les sorts se confirment (option « Confirmer les sorts »).
//  - court : le rappel d'une ligne du mode « court » ; une étape sans rappel y est sautée.
//  - humeur : le visage du portrait, 'neutre' (par défaut), 'joie' ou 'grave'.
//  - cue : le repère montré au joueur (ou une liste : le premier qui a un sens ici).
//      { type: 'case', map, x, y }        une case qui brille au sol
//      { type: 'pnj', npc }               la case d'un PNJ de la carte
//      { type: 'groupe' }                 le groupe le plus facile de la carte (puis le plus proche)
//      { type: 'sortie', map, side }      la flèche de sortie (n, e, s, w), et le geste au doigt
//      { type: 'placement' }              une case de départ conseillée
//      { type: 'ennemi' }                 l'ennemi le plus proche (le plus blessé avec plusBlesse)
//      { type: 'sort', quel }             un sort de la barre : 'degats' ou 'arme', ou un identifiant
//      { type: 'objet', quel }            un objet à équiper dans le sac ('arme' : une arme)
//      { type: 'ui', cible, main, sinon } un élément de l'interface (sélecteur CSS), projecteur et
//                                         main qui touche ; `sinon` : le repère si la cible manque
//  - cueDialogue : pendant un dialogue de PNJ, le guide se tait mais son projecteur montre la
//    réplique ou le bouton à toucher (sélecteurs CSS, le premier visible).
//  - until : ce qu'on attend pour passer à la suite. { on: 'suite' } (toucher la bulle), un
//    événement avec ses filtres ({ on: 'map', map }), une condition ({ cond: {...} }), ou une liste
//    d'alternatives. Les événements sont décrits en tête de js/guide.js. Une alternative avec
//    `vers` mène à l'étape nommée au lieu de la suivante (une boucle).
//  - si : l'étape n'a lieu que si la condition est vraie ; saute : elle passe si la condition est
//    vraie ; attendre : le guide se tait jusqu'à ce que la condition (ou l'événement { on }) arrive ;
//    puisSi : la condition se lit à la fin de chaque attente (au début du tour) ; fausse, l'étape
//    passe.
//  - bloc: 'combat' : une étape du premier combat, passée si le combat se termine avant ;
//    retour : l'étape où reprendre après une défaite. bloc: 'niveau' : les étapes du premier
//    niveau, où le guide revient si ce niveau arrive après elles.
//  - allie : quand le combat commence pendant cette étape, c'est le combat du tutoriel : le guide
//    s'y joint (DATA.tutoriel.allie), le placement n'a pas de compte à rebours et le tour dure
//    `secondesTour`.
//  - deselect : à l'affichage, le sort choisi est relâché (pour voir les cases de déplacement).
//  - enabled: false : étape prête mais éteinte.
//
// Conditions : { quete }, { queteEtape: [id, n] }, { queteFinie }, { carte }, { niveau },
// { victoires }, { equipable }, { armeEquipable }, { arme }, { points }, { pointsPlaces }, { auto },
// { explore }, { tourJoueur }, { peutFrapper }, { pmRestants }, { sortChoisi }, { non: {...} } ; toutes les clés
// d'une condition doivent être vraies.
DATA.tutoriel = {
  guide: 'varek',
  // Un nouveau Veilleur commence au sud de la place, pour marcher jusqu'au guide.
  depart: { map: 'orsane_cimes_place', x: 7, y: 12 },
  // Le premier combat laisse le temps de lire : un tour de 90 secondes au lieu de 20.
  secondesTour: 90,
  // Le guide dans le premier combat : il soigne et tire de loin, sans voler la victoire. Une
  // entité du camp du joueur menée par l'IA (World.addAlly), avec des sorts qui existent déjà.
  allie: {
    id: 'guide_varek', name: 'Varek', title: 'Relayeur du Fil', shape: 'pnj', look: 'garde', color: '#8a93a6',
    level: 1, hp: 70, pa: 6, pm: 3, initiative: 40, spells: ['lueur', 'eclat'], ai: 'ranged', summon: true, dmgMult: 0.45,
    desc: 'Ton guide. Il soigne ceux qui faiblissent et tire de loin.',
  },
  etapes: [
    // ----- L'arrivée sur la Place du Relais -----
    { id: 'bienvenue', say: 'Te voilà sur les Cimes, Veilleur. Je suis **Varek**, je garde le **Relais du Fil**.', humeur: 'joie',
      until: { on: 'suite' }, saute: { quete: 'orsane_arrivee' } },
    { id: 'marcher', say: 'Approche-toi. **Touche la case qui brille** pour y marcher.',
      saySouris: 'Approche-toi. **Clique sur la case qui brille** pour y marcher.',
      court: 'Touche une case pour y marcher.',
      cue: { type: 'case', map: 'orsane_cimes_place', x: 7, y: 7 },
      until: [{ on: 'arrive', map: 'orsane_cimes_place', x: 7, y: 7, proche: 1 }, { on: 'dialogue', npc: 'varek' }],
      saute: { quete: 'orsane_arrivee' } },
    { id: 'parler', say: 'Bien. Maintenant, **touche-moi** pour me parler : le Fil a une tâche pour toi.',
      saySouris: 'Bien. Maintenant, **clique sur moi** pour me parler : le Fil a une tâche pour toi.',
      court: 'Un PNJ marqué d\'un {or|!} a une quête pour toi : touche-le.',
      cue: { type: 'pnj', npc: 'varek' },
      cueDialogue: ['.vy-replique[data-quete="orsane_arrivee"]', '.vy-guide--dialogue [data-act="accepter"]'],
      until: { on: 'quest', type: 'accept', id: 'orsane_arrivee' }, saute: { quete: 'orsane_arrivee' } },
    { id: 'lotha', say: '**Lotha** tient le Comptoir, juste au sud. Va te présenter à elle.',
      cue: { type: 'pnj', npc: 'lotha' },
      until: { cond: { queteEtape: ['orsane_arrivee', 1] } }, saute: { queteEtape: ['orsane_arrivee', 1] } },
    { id: 'sortie', say: 'La **Porte des Clairières** est en bas. **Glisse l\'écran** vers la droite, ou **touche le bord** près de la flèche.',
      saySouris: 'La **Porte des Clairières** est en bas. **Clique sur le bord** de la carte, près de la flèche.',
      court: 'Glisse l\'écran, ou touche le bord, pour changer de carte.',
      cue: { type: 'sortie', map: 'orsane_cimes_place', side: 's' },
      until: { on: 'map', map: 'orsane_cimes_porte' }, saute: { queteEtape: ['orsane_arrivee', 2] } },

    // ----- La Porte des Clairières -----
    { id: 'orvak', say: 'Voici la Porte. **Orvak** la garde : parle-lui, il connaît les Clairières.',
      cue: { type: 'pnj', npc: 'orvak' },
      until: { cond: { queteEtape: ['orsane_arrivee', 3] } }, saute: { queteEtape: ['orsane_arrivee', 3] } },
    { id: 'groupe', say: 'Des **Glyms** rôdent près de la Porte. **Touche un groupe** pour voir sa fiche.',
      saySouris: 'Des **Glyms** rôdent près de la Porte. **Clique sur un groupe** pour voir sa fiche.',
      court: 'Touche un groupe de monstres pour voir sa fiche.',
      cue: [{ type: 'groupe' }, { type: 'sortie', map: 'orsane_cimes_place', side: 's' }], allie: true,
      until: [{ on: 'groupPopup' }, { on: 'fight' }], saute: { victoires: 1 } },
    { id: 'attaquer', say: 'Sa fiche dit son **niveau** et l\'{or|XP} qu\'il rapporte. Touche **Attaquer** : je viens avec toi.',
      saySouris: 'Sa fiche dit son **niveau** et l\'{or|XP} qu\'il rapporte. Clique sur **Attaquer** : je viens avec toi.',
      court: 'Touche Attaquer pour lancer le combat.',
      cue: { type: 'ui', cible: '.vy-fiche-groupe [data-act="attaquer"]', main: true, sinon: { type: 'groupe' } }, allie: true,
      until: { on: 'fight' }, saute: { victoires: 1 } },

    // ----- Le premier combat -----
    { id: 'placement', bloc: 'combat', retour: 'groupe', humeur: 'grave',
      say: '**Prépare-toi !** Touche une {cristal|case bleue} pour choisir ta place.',
      saySouris: '**Prépare-toi !** Clique sur une {cristal|case bleue} pour choisir ta place.',
      court: 'Touche une case bleue pour te placer, puis Prêt.',
      cue: { type: 'placement' }, until: [{ on: 'placed' }, { on: 'battleStart' }] },
    { id: 'pret', bloc: 'combat', retour: 'groupe',
      say: 'Quand tu es prêt, touche **Prêt** pour lancer le combat.',
      saySouris: 'Quand tu es prêt, clique sur **Prêt** pour lancer le combat.',
      cue: { type: 'ui', cible: '[data-ui="pret"]', main: true }, until: { on: 'battleStart' } },
    // Le tour du joueur : s'approcher tant que l'ennemi est hors de portée (un tour fini sans
    // frapper ramène ici), puis les PA et le sort sur l'ennemi.
    { id: 'combat_approche', bloc: 'combat', retour: 'groupe', attendre: { tourJoueur: true }, puisSi: { non: { peutFrapper: true } }, deselect: true,
      say: 'Tes {pm|Points de Mouvement} te font avancer : touche une **case verte**, puis encore une fois pour y aller. Approche-toi de l\'ennemi.',
      saySouris: 'Tes {pm|Points de Mouvement} te font avancer : clique sur une **case verte**. Approche-toi de l\'ennemi.',
      cue: { type: 'ennemi' },
      until: [{ cond: { peutFrapper: true } }, { cond: { pmRestants: false } }, { on: 'turnEnd', vers: 'combat_approche' }] },
    { id: 'combat_loin', bloc: 'combat', retour: 'groupe', attendre: { tourJoueur: true }, puisSi: { non: { peutFrapper: true } },
      say: 'L\'ennemi est encore loin. Touche **Fin du tour** : tu frapperas au prochain.',
      saySouris: 'L\'ennemi est encore loin. Clique sur **Fin du tour** : tu frapperas au prochain.',
      cue: { type: 'ui', cible: '[data-ui="fin-tour"]', main: true }, until: { on: 'turnEnd', vers: 'combat_approche' } },
    { id: 'combat_pa', bloc: 'combat', retour: 'groupe', attendre: { tourJoueur: true }, puisSi: { peutFrapper: true },
      say: 'Tes {pa|Points d\'Action} lancent tes sorts ; ils reviennent à chaque tour. **Touche ce sort.**',
      saySouris: 'Tes {pa|Points d\'Action} lancent tes sorts ; ils reviennent à chaque tour. **Clique sur ce sort.**',
      court: 'Touche un sort, puis l\'ennemi.',
      cue: { type: 'sort', quel: 'degats' },
      until: [{ on: 'spellSelect' }, { on: 'spellCast' }, { on: 'turnEnd', vers: 'combat_approche' }] },
    { id: 'combat_cible', bloc: 'combat', retour: 'groupe', si: { peutFrapper: true, sortChoisi: true },
      say: 'Touche l\'**ennemi** pour lancer ton sort.',
      sayConfirme: 'Touche l\'**ennemi**, puis valide d\'un toucher sur la **coche**.',
      saySouris: 'Clique sur l\'**ennemi** pour lancer ton sort.',
      cue: { type: 'ennemi' }, until: [{ on: 'spellCast', ennemi: true }, { on: 'turnEnd', vers: 'combat_approche' }] },
    { id: 'combat_pm', bloc: 'combat', retour: 'groupe', si: { pmRestants: true }, deselect: true,
      say: 'Il te reste des {pm|PM} : touche une **case verte**, puis encore une fois, pour te déplacer.',
      saySouris: 'Il te reste des {pm|PM} : clique sur une **case verte** pour te déplacer.',
      until: [{ on: 'moved' }, { on: 'suite' }, { on: 'turnEnd' }] },
    { id: 'combat_fin', bloc: 'combat', retour: 'groupe', attendre: { tourJoueur: true },
      say: 'Quand tu as fini, touche **Fin du tour** : l\'ennemi jouera à son tour.',
      saySouris: 'Quand tu as fini, clique sur **Fin du tour** : l\'ennemi jouera à son tour.',
      court: 'Touche Fin du tour quand tu as fini.',
      cue: { type: 'ui', cible: '[data-ui="fin-tour"]', main: true }, until: { on: 'turnEnd' } },
    { id: 'combat_pv', bloc: 'combat', retour: 'groupe', attendre: { on: 'hpLoss' }, humeur: 'grave',
      say: 'Attention : si tu n\'as plus de {pv|Points de Vie}, le combat est perdu !',
      until: [{ on: 'suite' }, { on: 'turnStart' }] },
    { id: 'combat_acheve', bloc: 'combat', retour: 'groupe', attendre: { tourJoueur: true }, humeur: 'grave',
      say: '**Achève le monstre !**', cue: { type: 'ennemi', plusBlesse: true }, until: { on: 'fightEnd' } },

    // ----- Après la victoire -----
    { id: 'victoire', attendre: { explore: true }, humeur: 'joie',
      say: 'Bien joué, Veilleur ! Le Fil peut compter sur toi.', until: { on: 'suite' } },

    // ----- Le premier niveau : ici s'il vient du combat ; s'il vient plus tard, le guide revient
    // à ces étapes puis reprend où il en était (js/guide.js, premierNiveau) -----
    { id: 'niveau', bloc: 'niveau', si: { niveau: 2 }, humeur: 'joie',
      say: 'Tu as gagné un **niveau** ! À chaque niveau, tu gagnes {or|5 points} de caractéristiques.',
      court: 'Nouveau niveau : 5 points de caractéristiques à placer.',
      cue: { type: 'ui', cible: '[data-win="carac"]', main: true }, until: { on: 'windowOpen', id: 'caracteristiques' } },
    { id: 'points', bloc: 'niveau', si: { points: true },
      say: 'Touche **+** sur la caractéristique de ton choix, puis **Valider**.',
      saySouris: 'Clique sur **+** sur la caractéristique de ton choix, puis **Valider**.',
      // Le « + » ouvre la feuille de répartition ; le projecteur passe alors sur « Valider ».
      cue: { type: 'ui', cible: ['.vy-fenetre[data-id="carac"] .vy-feuille [data-act="valider"]:not([disabled])', '.vy-fenetre[data-id="carac"] [data-act="plus"]:not([disabled])'], main: true },
      until: [{ on: 'statsAllocated' }, { cond: { pointsPlaces: true } }] },
    { id: 'points_auto', bloc: 'niveau', si: { niveau: 2, auto: true, non: { points: true } },
      say: 'Tes points se placent seuls tant que **Auto** est coché. Décoche-le pour les placer toi-même.',
      cue: { type: 'ui', cible: '#carac-auto' }, until: { on: 'suite' } },
    // Le point de sort du niveau (js/hud-sorts.js) : on ouvre le livre des sorts, « + » prévoit un
    // rang, « Valider » puis « Oui » le donnent. Au premier niveau guidé, la répartition automatique
    // des sorts est rendue au joueur comme celle des caractéristiques (js/guide.js, premierNiveau).
    { id: 'sorts', bloc: 'niveau', si: { pointsSort: true },
      say: 'Tu as aussi un **point de sort**. Ouvre ton **livre des sorts**.',
      court: 'Un point de sort t\'attend dans le livre des sorts.',
      cue: { type: 'ui', cible: '[data-win="sorts"]', main: true }, until: { on: 'windowOpen', id: 'sorts' } },
    { id: 'sorts_rang', bloc: 'niveau', si: { pointsSort: true },
      say: 'Touche **+** sur un sort, puis **Valider** : il passe au rang suivant.',
      saySouris: 'Clique sur **+** sur un sort, puis **Valider** : il passe au rang suivant.',
      cue: { type: 'ui', cible: ['.vy-fenetre[data-id="sorts"] .vy-sorts__modale [data-act="oui"]', '.vy-fenetre[data-id="sorts"] [data-act="valider"]', '.vy-fenetre[data-id="sorts"] [data-act="plus"]:not([disabled])'], main: true },
      until: [{ on: 'spellUpgraded' }, { cond: { pointsSort: false } }] },

    // ----- Le sac, l'équipement, la quête rendue -----
    { id: 'sac', say: 'Ce que tu gagnes va dans ton **sac**. Ouvre-le.',
      court: 'Ton butin t\'attend dans le sac.',
      cue: { type: 'ui', cible: '[data-win="sac"]', main: true }, until: { on: 'windowOpen', id: 'inventaire' } },
    // Aucune des premières quêtes ne donne d'arme : si le sac en contient une (butin, achat), le
    // guide montre le geste et attend qu'elle soit équipée ; sinon il en parle pour plus tard.
    { id: 'equiper_arme', si: { armeEquipable: true },
      say: 'Touche deux fois sur l\'**arme**, ou glisse-la vers ton personnage, pour t\'en équiper.',
      saySouris: 'Double-clique sur l\'**arme**, ou glisse-la vers ton personnage, pour t\'en équiper.',
      court: 'Touche deux fois une arme pour t\'en équiper.',
      cue: { type: 'objet', quel: 'arme' }, until: { on: 'equip' } },
    { id: 'equiper', si: { equipable: true, non: { armeEquipable: true } },
      say: 'Touche deux fois sur un **objet**, ou glisse-le vers ton personnage, pour t\'en équiper.',
      saySouris: 'Double-clique sur un **objet**, ou glisse-le vers ton personnage, pour t\'en équiper.',
      cue: { type: 'objet' }, until: { on: 'equip' } },
    { id: 'equiper_plus_tard', si: { non: { equipable: true } },
      say: 'Ton sac est encore léger. Quand tu trouveras une **arme**, touche-la deux fois pour t\'en équiper.',
      saySouris: 'Ton sac est encore léger. Quand tu trouveras une **arme**, double-clique dessus pour t\'en équiper.',
      until: { on: 'suite' } },
    { id: 'retour', say: 'Ta tâche est faite. Remonte voir **Varek** au Relais pour ta récompense.',
      cue: [{ type: 'sortie', map: 'orsane_cimes_porte', side: 'n' }, { type: 'pnj', npc: 'varek' }],
      cueDialogue: ['.vy-replique[data-rendre="orsane_arrivee"]', '.vy-guide--dialogue [data-act="continuer"]'],
      until: { cond: { queteFinie: 'orsane_arrivee' } }, saute: { queteFinie: 'orsane_arrivee' } },

    // ----- Le journal des quêtes -----
    { id: 'quetes', say: 'Tes quêtes sont notées dans ton **journal des quêtes**. Ouvre-le pour les relire.',
      court: 'Le journal des quêtes garde tes objectifs.',
      cue: { type: 'ui', cible: '[data-win="quetes"]', main: true }, until: { on: 'windowOpen', id: 'quetes' } },

    // ----- L'arme, au combat suivant -----
    { id: 'arme_combat', si: { arme: true }, attendre: { tourJoueur: true },
      say: 'Maintenant, attaque avec ton **arme** !', court: 'Ton arme est le premier sort de ta barre.',
      cue: { type: 'sort', quel: 'arme' }, until: { on: 'spellCast', spell: 'arme' } },

    { id: 'fin', humeur: 'joie', say: 'Tu as l\'essentiel, Veilleur. **Orvak**, à la Porte, a une tâche pour toi. Bonne route !',
      until: { on: 'suite' } },
  ],
};
