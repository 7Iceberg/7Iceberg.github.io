// Le tutoriel de l'île d'Ervane (docs/ILE-DE-DEPART.md, section 6 ; docs/ILE-TECHNIQUE.md, 6) : un
// second jeu d'étapes, DATA.tutorielIle, que js/guide.js choisit pour un personnage né sur Ervane
// (ch.tuto.jeu = 'ile'), et DATA.tutorielDescente, joué une fois à sa première carte à cases
// d'Orsane (ch.tuto.jeu = 'descente'). Selon l'interrupteur : le module ervaneTutoriel les pose,
// appliqué par js/ile.js ; éteint, seul DATA.tutoriel (content/tutoriel.js) existe.
//
// Le format des étapes est celui de content/tutoriel.js. Ce que le guide sait de plus sur un
// plateau :
//  - repères : { type: 'point', map, u, v } (un anneau au sol, en unités de l'île) ;
//              { type: 'chemin', vers: { npc } | { lieu } | { u, v } } (des marques au sol le long
//              du chemin calculé jusqu'au but, et l'anneau au but) ; { type: 'lieu', lieu } (un lieu
//              nommé du plateau) ; { type: 'groupeFaible' } (le groupe de Glyms le plus proche dont
//              un membre craint un élément des sorts de la classe, et ses deux lignes sur la fiche) ;
//  - événements : { on: 'arrive', u, v, rayon } (en unités de l'île), { on: 'zone', map } (l'entrée
//    dans une sous-zone), { on: 'fight', monstre } (un combat où ce monstre est présent) ;
//  - condition : { sortElement: true } (la classe a un sort de dégâts d'un élément qu'un Glym des
//    Sources craint) ou { sortElement: 'feu' } ;
//  - mots : {{element}}, {{faible}}, {{resiste}} dans les textes (la leçon des Sources) ;
//  - `courtSouris` : la ligne du mode court à la souris (comme `saySouris` pour la boîte), choisie par
//    js/guide.js quand le dernier pointeur n'est pas le doigt.
(DATA.modules = DATA.modules || {}).ervaneTutoriel = () => {
  if (DATA.tutorielIle) return;
  // Le premier combat laisse le temps de lire ; le guide s'y joint, comme à Orsane.
  const allie = {
    id: 'guide_varek', name: 'Varek', title: 'Relayeur du Fil', shape: 'pnj', look: 'garde', color: '#8a93a6',
    level: 1, hp: 70, pa: 6, pm: 3, initiative: 40, spells: ['lueur', 'eclat'], ai: 'ranged', summon: true, dmgMult: 0.45,
    desc: 'Ton guide. Il soigne ceux qui faiblissent et tire de loin.',
  };
  // Le premier combat et le premier niveau : les mêmes étapes qu'à Orsane, sur la grille posée sur
  // le terrain. `retour` : l'étape où reprendre après une défaite.
  const combat = [
    { id: 'placement', bloc: 'combat', retour: 'groupe', humeur: 'grave',
      say: '**Prépare-toi !** Touche une {cristal|case bleue} pour choisir ta place.',
      saySouris: '**Prépare-toi !** Clique sur une {cristal|case bleue} pour choisir ta place.',
      court: 'Touche une case bleue pour te placer, puis Prêt.', courtSouris: 'Clique sur une case bleue pour te placer, puis Prêt.',
      cue: { type: 'placement' }, until: [{ on: 'placed' }, { on: 'battleStart' }] },
    { id: 'pret', bloc: 'combat', retour: 'groupe',
      say: 'Quand tu es prêt, touche **Prêt** pour lancer le combat.',
      saySouris: 'Quand tu es prêt, clique sur **Prêt** pour lancer le combat.',
      cue: { type: 'ui', cible: '[data-ui="pret"]', main: true }, until: { on: 'battleStart' } },
    { id: 'combat_approche', bloc: 'combat', retour: 'groupe', attendre: { tourJoueur: true }, puisSi: { non: { peutFrapper: true } }, deselect: true,
      say: 'Tes {pm|Points de Mouvement} te font avancer : touche une **case verte**, puis encore une fois pour y aller. Approche-toi du Glym.',
      saySouris: 'Tes {pm|Points de Mouvement} te font avancer : clique sur une **case verte**. Approche-toi du Glym.',
      cue: { type: 'ennemi' },
      until: [{ cond: { peutFrapper: true } }, { cond: { pmRestants: false } }, { on: 'turnEnd', vers: 'combat_approche' }] },
    { id: 'combat_loin', bloc: 'combat', retour: 'groupe', attendre: { tourJoueur: true }, puisSi: { non: { peutFrapper: true } },
      say: 'Le Glym est encore loin. Touche **Fin du tour** : tu frapperas au prochain.',
      saySouris: 'Le Glym est encore loin. Clique sur **Fin du tour** : tu frapperas au prochain.',
      cue: { type: 'ui', cible: '[data-ui="fin-tour"]', main: true }, until: { on: 'turnEnd', vers: 'combat_approche' } },
    { id: 'combat_pa', bloc: 'combat', retour: 'groupe', attendre: { tourJoueur: true }, puisSi: { peutFrapper: true },
      say: 'Tes {pa|Points d\'Action} lancent tes sorts ; ils reviennent à chaque tour. **Touche ce sort.**',
      saySouris: 'Tes {pa|Points d\'Action} lancent tes sorts ; ils reviennent à chaque tour. **Clique sur ce sort.**',
      court: 'Touche un sort, puis l\'ennemi.', courtSouris: 'Clique sur un sort, puis sur l\'ennemi.',
      cue: { type: 'sort', quel: 'degats' },
      until: [{ on: 'spellSelect' }, { on: 'spellCast' }, { on: 'turnEnd', vers: 'combat_approche' }] },
    { id: 'combat_cible', bloc: 'combat', retour: 'groupe', si: { peutFrapper: true, sortChoisi: true },
      say: 'Touche le **Glym** pour lancer ton sort.',
      sayConfirme: 'Touche le **Glym**, puis valide d\'un toucher sur la **coche**.',
      saySouris: 'Clique sur le **Glym** pour lancer ton sort.',
      cue: { type: 'ennemi' }, until: [{ on: 'spellCast', ennemi: true }, { on: 'turnEnd', vers: 'combat_approche' }] },
    { id: 'combat_pm', bloc: 'combat', retour: 'groupe', si: { pmRestants: true }, deselect: true,
      say: 'Il te reste des {pm|PM} : touche une **case verte**, puis encore une fois, pour te déplacer.',
      saySouris: 'Il te reste des {pm|PM} : clique sur une **case verte** pour te déplacer.',
      until: [{ on: 'moved' }, { on: 'suite' }, { on: 'turnEnd' }] },
    { id: 'combat_fin', bloc: 'combat', retour: 'groupe', attendre: { tourJoueur: true },
      say: 'Quand tu as fini, touche **Fin du tour** : le Glym jouera à son tour.',
      saySouris: 'Quand tu as fini, clique sur **Fin du tour** : le Glym jouera à son tour.',
      court: 'Touche Fin du tour quand tu as fini.', courtSouris: 'Clique sur Fin du tour quand tu as fini.',
      cue: { type: 'ui', cible: '[data-ui="fin-tour"]', main: true }, until: { on: 'turnEnd' } },
    { id: 'combat_pv', bloc: 'combat', retour: 'groupe', attendre: { on: 'hpLoss' }, humeur: 'grave',
      say: 'Attention : si tu n\'as plus de {pv|Points de Vie}, le combat est perdu !',
      until: [{ on: 'suite' }, { on: 'turnStart' }] },
    { id: 'combat_acheve', bloc: 'combat', retour: 'groupe', attendre: { tourJoueur: true }, humeur: 'grave',
      say: '**Achève le Glym !**', cue: { type: 'ennemi', plusBlesse: true }, until: { on: 'fightEnd' } },
  ];
  const niveau = [
    { id: 'niveau', bloc: 'niveau', si: { niveau: 2 }, humeur: 'joie',
      say: 'Tu as gagné un **niveau** ! À chaque niveau, tu gagnes {or|5 points} de caractéristiques.',
      court: 'Nouveau niveau : 5 points de caractéristiques à placer.',
      cue: { type: 'ui', cible: '[data-win="carac"]', main: true }, until: { on: 'windowOpen', id: 'caracteristiques' } },
    { id: 'points', bloc: 'niveau', si: { points: true },
      say: 'Touche **+** sur la caractéristique de ton choix, puis **Valider**.',
      saySouris: 'Clique sur **+** sur la caractéristique de ton choix, puis **Valider**.',
      court: 'Touche + sur une caractéristique, puis Valider.', courtSouris: 'Clique sur + sur une caractéristique, puis Valider.',
      cue: { type: 'ui', cible: ['.vy-fenetre[data-id="carac"] .vy-feuille [data-act="valider"]:not([disabled])', '.vy-fenetre[data-id="carac"] [data-act="plus"]:not([disabled])'], main: true },
      until: [{ on: 'statsAllocated' }, { cond: { pointsPlaces: true } }] },
    { id: 'points_auto', bloc: 'niveau', si: { niveau: 2, auto: true, non: { points: true } },
      say: 'Tes points se placent seuls tant que **Auto** est coché. Décoche-le pour les placer toi-même.',
      cue: { type: 'ui', cible: '#carac-auto' }, until: { on: 'suite' } },
    { id: 'sorts', bloc: 'niveau', si: { pointsSort: true },
      say: 'Tu as aussi un **point de sort**. Ouvre ton **livre des sorts**.',
      court: 'Un point de sort t\'attend dans le livre des sorts.',
      cue: { type: 'ui', cible: '[data-win="sorts"]', main: true }, until: { on: 'windowOpen', id: 'sorts' } },
    { id: 'sorts_rang', bloc: 'niveau', si: { pointsSort: true },
      say: 'Touche **+** sur un sort, puis **Valider** : il passe au rang suivant.',
      saySouris: 'Clique sur **+** sur un sort, puis **Valider** : il passe au rang suivant.',
      cue: { type: 'ui', cible: ['.vy-fenetre[data-id="sorts"] .vy-sorts__modale [data-act="oui"]', '.vy-fenetre[data-id="sorts"] [data-act="valider"]', '.vy-fenetre[data-id="sorts"] [data-act="plus"]:not([disabled])'], main: true },
      until: [{ on: 'spellUpgraded' }, { cond: { pointsSort: false } }] },
  ];

  DATA.tutorielIle = {
    guide: 'varek_ervane',
    // Un nouveau Veilleur s'éveille un peu à l'écart du Métier, pour marcher jusqu'au guide.
    depart: { map: 'ervane_mailles_place', u: 209, v: 96 },
    secondesTour: 90,
    allie,
    etapes: [
      // ----- L'éveil, au Relais des Mailles -----
      { id: 'bienvenue', say: 'Doucement, Veilleur. Tu as dormi trois jours. Je suis **Varek** : je garde le Relais des Mailles, ici, sur **Ervane**.', humeur: 'joie',
        until: { on: 'suite' }, saute: { quete: 'ervane_eveil' } },
      // Le point qui brille est à plus de 3 u de toute cible du plateau (le Relais, Varek, le Métier) :
      // la sélection à l'écran (js/ile-3d.js, screenToCell) rend les objets qui agissent avant le
      // sol, et un doigt sur l'anneau doit faire marcher, pas ouvrir le panneau du Relais. Le
      // validateur le vérifie (verifierTutoriel).
      { id: 'marcher', say: 'Ici, on marche où l\'on veut. **Touche le sol qui brille** pour y aller.',
        saySouris: 'Ici, on marche où l\'on veut. **Clique sur le sol qui brille** pour y aller.',
        court: 'Touche le sol pour y marcher.', courtSouris: 'Clique sur le sol pour y marcher.',
        cue: { type: 'point', map: 'ervane_mailles_place', u: 209, v: 103 },
        until: [{ on: 'arrive', map: 'ervane_mailles_place', u: 209, v: 103, rayon: 1.5 }, { on: 'dialogue', npc: 'varek_ervane' }],
        saute: { quete: 'ervane_eveil' } },
      { id: 'parler', say: 'Bien. Maintenant, **touche-moi** pour me parler : le Fil a une tâche pour toi.',
        saySouris: 'Bien. Maintenant, **clique sur moi** pour me parler : le Fil a une tâche pour toi.',
        court: 'Un PNJ marqué d\'un {or|!} a une quête pour toi : touche-le.', courtSouris: 'Un PNJ marqué d\'un {or|!} a une quête pour toi : clique dessus.',
        cue: { type: 'pnj', npc: 'varek_ervane' },
        cueDialogue: ['.vy-replique[data-quete="ervane_eveil"]', '.vy-guide--dialogue [data-act="accepter"]'],
        until: { on: 'quest', type: 'accept', id: 'ervane_eveil' }, saute: { quete: 'ervane_eveil' } },
      { id: 'sefra', say: '**Sefra** tient le Comptoir, sous l\'auvent. Va te présenter à elle.',
        court: 'Présente-toi à Sefra, au Comptoir, sous l\'auvent.',
        cue: { type: 'pnj', npc: 'sefra' },
        until: { cond: { queteEtape: ['ervane_eveil', 1] } }, saute: { queteEtape: ['ervane_eveil', 1] } },
      { id: 'chemin', say: 'La **Porte des Sources** est en bas, par la ruelle. **Suis les marques** au sol : elles te mènent à Nolwé.',
        court: 'Les marques au sol mènent à la Porte des Sources.',
        cue: { type: 'chemin', vers: { npc: 'nolwe' } },
        until: [{ on: 'zone', map: 'ervane_porte_des_sources' }, { on: 'dialogue', npc: 'nolwe' }], saute: { queteEtape: ['ervane_eveil', 2] } },

      // ----- La Porte des Sources -----
      { id: 'nolwe', say: 'Voici la Porte. **Nolwé** la garde : parle-lui, elle connaît les Sources.',
        court: 'Parle à Nolwé, la gardienne de la Porte.',
        cue: { type: 'pnj', npc: 'nolwe' },
        until: { cond: { queteEtape: ['ervane_eveil', 2] } }, saute: { queteEtape: ['ervane_eveil', 2] } },
      { id: 'groupe', say: 'Un **Glym Aqua** rôde près de la Porte. **Touche-le** pour voir sa fiche.',
        saySouris: 'Un **Glym Aqua** rôde près de la Porte. **Clique dessus** pour voir sa fiche.',
        court: 'Touche un groupe de monstres pour voir sa fiche.', courtSouris: 'Clique sur un groupe de monstres pour voir sa fiche.',
        cue: { type: 'groupe' }, allie: true,
        until: [{ on: 'groupPopup' }, { on: 'fight' }], saute: { victoires: 1 } },
      { id: 'attaquer', say: 'Sa fiche dit son **niveau**, l\'{or|XP} qu\'il rapporte, et ce qu\'il **craint**. Touche **Attaquer** : je viens avec toi.',
        saySouris: 'Sa fiche dit son **niveau**, l\'{or|XP} qu\'il rapporte, et ce qu\'il **craint**. Clique sur **Attaquer** : je viens avec toi.',
        court: 'Touche Attaquer pour lancer le combat.', courtSouris: 'Clique sur Attaquer pour lancer le combat.',
        cue: { type: 'ui', cible: '.vy-fiche-groupe [data-act="attaquer"]', main: true, sinon: { type: 'groupe' } }, allie: true,
        until: { on: 'fight' }, saute: { victoires: 1 } },

      // ----- Le premier combat, sur l'aire du Glym -----
      ...combat,

      // ----- Après la victoire -----
      { id: 'victoire', attendre: { explore: true }, humeur: 'joie',
        say: 'Bien joué, Veilleur ! Le Fil a eu raison de te remonter jusqu\'ici.', until: { on: 'suite' } },
      ...niveau,

      // ----- Le sac, l'équipement, la quête rendue -----
      { id: 'sac', say: 'Ce que tu gagnes va dans ton **sac**. Ouvre-le.',
        court: 'Ton butin t\'attend dans le sac.',
        cue: { type: 'ui', cible: '[data-win="sac"]', main: true }, until: { on: 'windowOpen', id: 'inventaire' } },
      // Ces deux étapes ont une issue (« Suite ») : si le double toucher ne passe pas, ou si l'objet est
      // vendu ou gardé, le guide ne reste pas bloqué dessus jusqu'à la fin de l'île (revue finale).
      { id: 'equiper_arme', si: { armeEquipable: true },
        say: 'Touche deux fois sur l\'**arme**, ou glisse-la vers ton personnage, pour t\'en équiper. Tu peux aussi passer : le sac t\'attendra.',
        saySouris: 'Double-clique sur l\'**arme**, ou glisse-la vers ton personnage, pour t\'en équiper. Tu peux aussi passer : le sac t\'attendra.',
        court: 'Touche deux fois une arme pour t\'en équiper.', courtSouris: 'Double-clique sur une arme pour t\'en équiper.',
        cue: { type: 'objet', quel: 'arme' }, until: [{ on: 'equip' }, { on: 'suite' }], saute: { non: { equipable: true } } },
      { id: 'equiper', si: { equipable: true, non: { armeEquipable: true } },
        say: 'Touche deux fois sur un **objet**, ou glisse-le vers ton personnage, pour t\'en équiper. Tu peux aussi passer : le sac t\'attendra.',
        saySouris: 'Double-clique sur un **objet**, ou glisse-le vers ton personnage, pour t\'en équiper. Tu peux aussi passer : le sac t\'attendra.',
        court: 'Touche deux fois un objet pour t\'en équiper.', courtSouris: 'Double-clique sur un objet pour t\'en équiper.',
        cue: { type: 'objet' }, until: [{ on: 'equip' }, { on: 'suite' }], saute: { non: { equipable: true } } },
      { id: 'equiper_plus_tard', si: { non: { equipable: true } },
        say: 'Ton sac est encore léger. Quand tu trouveras une **arme**, touche-la deux fois pour t\'en équiper.',
        saySouris: 'Ton sac est encore léger. Quand tu trouveras une **arme**, double-clique dessus pour t\'en équiper.',
        until: { on: 'suite' } },
      { id: 'retour', say: 'Ta tâche est faite. Retourne voir **Nolwé**, à la Porte, pour ta récompense.',
        cue: { type: 'pnj', npc: 'nolwe' },
        cueDialogue: ['.vy-replique[data-rendre="ervane_eveil"]', '.vy-guide--dialogue [data-act="continuer"]'],
        until: { cond: { queteFinie: 'ervane_eveil' } }, saute: { queteFinie: 'ervane_eveil' } },

      // ----- Le journal des quêtes -----
      { id: 'quetes', say: 'Tes quêtes sont notées dans ton **journal des quêtes**. Ouvre-le : « Les quatre Sources » t\'y attend.',
        court: 'Le journal des quêtes garde tes objectifs.',
        cue: { type: 'ui', cible: '[data-win="quetes"]', main: true }, until: { on: 'windowOpen', id: 'quetes' } },

      // ----- La leçon des Sources : à la première fiche d'un groupe de Glyms -----
      // `sayAilleurs` : quand la fiche ouverte ne montre pas le Glym qui craint l'élément (une classe
      // Air devant le Glym Aqua de la Porte) ; le repère pointe alors le groupe qui le craint.
      { id: 'element', si: { sortElement: true }, attendre: { on: 'groupPopup' },
        say: 'Lis la fiche. Ton sort est de type **{{element}}** : le **{{resiste}}** y résiste, le **{{faible}}** le craint. Vise-le.',
        sayAilleurs: 'Lis la fiche : celui-ci ne craint pas ton **{{element}}**. Le **{{faible}}**, lui, le craint : il rôde près d\'une Source voisine, va le voir.',
        court: 'Chaque Glym craint un élément : lis sa fiche avant de frapper.',
        cue: { type: 'groupeFaible' },
        until: [{ on: 'suite' }, { on: 'fight' }], saute: { queteFinie: 'ervane_quatre_sources' } },

      // ----- Le Défi, au deuxième combat -----
      { id: 'defi', si: { victoires: 1 }, attendre: { on: 'battleStart' },
        say: 'Un **Défi** t\'est proposé à chaque combat. Réussi, il rapporte plus d\'{or|XP} ; tu peux l\'ignorer sans rien perdre.',
        court: 'Un Défi réussi rapporte plus d\'XP ; tu peux l\'ignorer.',
        cue: { type: 'ui', cible: '[data-ui="defi"]' },
        until: [{ on: 'suite' }, { on: 'turnEnd' }], saute: { victoires: 4 } },

      // ----- L'arme, au combat suivant -----
      { id: 'arme_combat', si: { arme: true }, attendre: { tourJoueur: true },
        say: 'Maintenant, attaque avec ton **arme** !', court: 'Ton arme est le premier sort de ta barre.',
        cue: { type: 'sort', quel: 'arme' }, until: { on: 'spellCast', spell: 'arme' } },

      // ----- Le Lampignon, aux Murets -----
      { id: 'poussee', attendre: { on: 'fight', monstre: 'lampignon' }, humeur: 'grave',
        say: 'Un **Lampignon** ! Il charge et repousse de deux cases. Place-toi **sans muret dans le dos** : contre un mur, le choc fait mal.',
        court: 'Le Lampignon repousse : pas de muret dans ton dos.',
        until: [{ on: 'suite' }, { on: 'battleStart' }], saute: { queteFinie: 'ervane_hameau_vide' } },

      // ----- La carte, au camp d'Ardek -----
      { id: 'carte', attendre: { on: 'zone', map: 'ervane_camp_ardek' },
        say: 'Le camp d\'Ardek, et le **Relais de l\'Amarre**. Ouvre la **carte** : elle montre l\'île, tes quêtes et tes relais.',
        court: 'La carte montre l\'île, tes quêtes et tes relais.',
        cue: { type: 'ui', cible: '[data-win="carte"]', main: true }, until: { on: 'windowOpen', id: 'carte' }, saute: { queteFinie: 'ervane_puits' } },

      { id: 'fin', humeur: 'joie', say: 'Tu sais tout ce que je peux t\'apprendre, Veilleur. Ardek a besoin de toi, et l\'amarre grince. Bonne route !',
        until: { on: 'suite' } },
    ],
  };

  // À la descente : les cases d'Orsane, puis le bord de carte, une fois.
  DATA.tutorielDescente = {
    guide: 'varek',
    etapes: [
      { id: 'cases', say: 'Te voilà sur les Cimes, Veilleur. Ici, on marche **de case en case** : touche la case qui brille.',
        saySouris: 'Te voilà sur les Cimes, Veilleur. Ici, on marche **de case en case** : clique sur la case qui brille.',
        court: 'À Orsane, touche une case pour y marcher.', courtSouris: 'À Orsane, clique sur une case pour y marcher.',
        cue: { type: 'case', map: 'orsane_cimes_place', x: 7, y: 7 },
        until: [{ on: 'arrive', map: 'orsane_cimes_place', x: 7, y: 7, proche: 1 }, { on: 'dialogue' }],
        saute: { non: { carte: 'orsane_cimes_place' } } },
      { id: 'sortie', say: 'Les cartes d\'Orsane ont des **bords**. **Glisse l\'écran** vers la droite, ou **touche le bord** près de la flèche, pour passer à la suivante.',
        saySouris: 'Les cartes d\'Orsane ont des **bords**. **Clique sur le bord** de la carte, près de la flèche, pour passer à la suivante.',
        court: 'Glisse l\'écran, ou touche le bord, pour changer de carte.', courtSouris: 'Clique sur le bord de la carte pour changer de carte.',
        cue: { type: 'sortie', map: 'orsane_cimes_place', side: 's' },
        until: { on: 'map' }, saute: { non: { carte: 'orsane_cimes_place' } } },
    ],
  };
};
