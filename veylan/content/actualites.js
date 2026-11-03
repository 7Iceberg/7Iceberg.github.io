DATA.version = 'Prototype 0.9';

DATA.actualites = [
  { id: 'garde_robe', date: '2026-11-03', art: 'fenetres', titre: 'La Garde-robe',
    texte: 'Teintures, lueurs de lanterne, auras, blasons, émotes et thèmes d\'interface se gagnent en jouant : succès, premières victoires contre les boss, paliers de la Veille, quêtes de Voie, teintures du tailleur. Tout ce qu\'un personnage gagne sert à tous les autres. La fenêtre Garde-robe (touche G) essaie tout le catalogue, possédé ou non, et garde cinq looks. Jamais de puissance : seulement de l\'allure.' },
  { id: 'ervane', date: '2026-10-20', art: 'carte', titre: 'Ervane, l\'île de l\'Éveil',
    texte: 'Tout nouveau Veilleur s\'éveille désormais sur Ervane, une île en 3D amarrée au-dessus des Cimes. On y marche librement, on combat sur le terrain même, et Varek t\'apprend le jeu jusqu\'au Puits de l\'Amarre. La Nacelle te descend ensuite à Orsane, au niveau 8.' },
  { id: 'factions', date: '2026-10-15', art: 'factions', titre: 'L\'Aube contre la Chaîne',
    texte: 'Au niveau 20, à la Passe de Kaldum, tu prêtes serment à l\'Aube, qui garde les Marques et les dragons depuis Orsane, ou à la Chaîne, qui veut les lier depuis Kessane, au bord du gouffre. Tu peux aussi refuser : les Francs-Marcheurs de Thessa restent neutres et commercent avec tout le monde. Dix rangs, trois ordres par faction, et jamais de puissance de combat : des titres, des apparences, des raccourcis.' },
  { id: 'carte_du_monde', date: '2026-10-15', art: 'carte', titre: 'La carte du monde, peinte et en 3D',
    texte: 'Chaque carte a ses coordonnées [x, y] et se peint d\'après son vrai décor : prés, chemins, eau, forêts, toits, falaises et lave de Kaldum, avec des nuages sur ce que tu n\'as pas encore exploré. Des pastilles montrent les Relais, les donjons, les ateliers et les quêtes, et un appui long pose ton drapeau. La touche M l\'ouvre ; le bouton 3D dresse le continent en îles flottantes, à faire tourner du doigt.' },
  { id: 'grands_dragons', date: '2026-10-14', art: 'dragons', titre: 'Les sept Grands Dragons',
    texte: 'Veylan n\'a pas de dieux : il a sept Grands Dragons, plus vieux que tous les peuples. Chacun grave sa Marque sur la peau de ceux qu\'il accepte : plume d\'argent, losange de pierre, goutte de verre de mer ou bouclier de braise. Ruhani, le Dragon de l\'Aube, réunit les quatre éléments ; Ithren a disparu le jour de la Grande Colère.' },
  { id: 'plan_des_quetes', date: '2026-10-14', art: 'quetes', titre: 'La route jusqu\'au niveau 100',
    texte: 'Le plan des quêtes est tracé : les Cimes d\'Orsane et les forges de Kaldum jusqu\'au niveau 30, puis Thessa et la Lisière, et dès le niveau 50 les arcs des Marques, un dragon par arc. Au bout de la route, la Marque d\'Aube, que Ruhani ne grave que sur qui en porte déjà cinq.' },
  { id: 'classes_alpha', date: '2026-10-14', art: 'classes', titre: 'Sarkan, Lyssar, Nerith : les trois classes de l\'alpha',
    texte: 'Le Sarkan jure contre un ennemi, fait monter sa Fureur au contact et la dépense dans le Verdict. Le Lyssar tire plus loin et plus fort tant qu\'il reste à l\'affût, et pose ses collets. La Nerith disparaît, vole PA, PM et boucliers, et vide les poches de ce qu\'elle achève.' },
  { id: 'caracteristiques', date: '2026-10-14', art: 'caracs', titre: 'Caractéristiques : cinq points par niveau',
    texte: 'Terra, Ignis, Aqua et Aer coûtent un point jusqu\'à 100, puis deux, trois et quatre par palier. La Vitalité se prend un pour un, la Sagesse trois pour un. Les parchemins offrent jusqu\'à 50 points de base, et Tacle, Fuite et Prospection suivent tes choix.' },
  { id: 'interface_fenetres', date: '2026-10-14', art: 'fenetres', titre: 'Une interface en fenêtres',
    texte: 'Caractéristiques, Personnage, Sac, Quêtes, Succès, Carnet, Carte, Journal et Options s\'ouvrent en fenêtres que l\'on déplace à sa guise, chacune avec sa touche. Le bloc vital, les raccourcis d\'objets et la mini-carte restent à portée de main, en exploration comme en combat.' },
];

DATA.journal = [
  { date: '2026-10-20', titre: 'Ervane, l\'île de départ', points: [
    'Un nouveau personnage naît sur Ervane, en 3D : cinq zones, onze quêtes principales, le Puits de l\'Amarre, puis la Nacelle vers Orsane.',
    'Déplacement libre hors combat ; en combat, les cases et les règles ne changent pas.',
    'Sans 3D sur l\'appareil, on naît à Orsane comme avant.',
  ] },
  { date: '2026-10-15', titre: 'Nouvel accueil, cinq personnages', points: [
    'Accueil refait : actualités, journal des mises à jour, réglages, partie d\'invité sans sauvegarde.',
    'Jusqu\'à cinq personnages par appareil ; l\'ancienne sauvegarde passe dans le premier emplacement.',
    'Création en étapes : choix du monde, première partie ou non (trois questions pour trouver sa classe), classe, apparence.',
    'Huit coiffures, six couleurs et un nom tiré au sort dans la langue de Veylan ; le personnage regarde où il marche.',
  ] },
  { date: '2026-10-15', titre: 'Les factions', points: [
    'L\'Aube (Orsane) contre la Chaîne (Kessane, la Fosse en attendant) ; les Francs-Marcheurs restent neutres.',
    'Prélude de 17 à 20, serment au niveau 20 à la Passe de Kaldum, dix rangs nommés, trois ordres par faction choisis au rang 3.',
    'Le reniement coûte deux rangs ; la faction ne donne jamais de puissance de combat.',
  ] },
  { date: '2026-10-15', titre: 'Carte du monde peinte et vue 3D', points: [
    'Chaque carte peinte d\'après son décor, quadrillage fin, noms de zones, nuages sur l\'inexploré.',
    'Pastilles (Relais, donjon, atelier, marchand, quêtes), épingles et bulles « x,y · zone · niveau ».',
    'Vue 3D : chaque région en île flottante, caméra qui tourne au doigt ; un relief peint sans WebGL.',
  ] },
  { date: '2026-10-14', titre: 'Carte du monde', points: [
    'Coordonnées [x, y] pour chaque carte, déduites de ses sorties.',
    'Fenêtre Carte du monde (touche M) : zones, Relais, donjons, quêtes, brouillard, zoom au doigt.',
    'Vue Relief en blocs isométriques et onglet Monde avec les régions à venir ; voyage depuis un Relais.',
  ] },
  { date: '2026-10-14', titre: 'Les Grands Dragons et le plan des quêtes', points: [
    'Sept Grands Dragons, chacun d\'un type différent, et leurs Marques.',
    'Plan des quêtes du niveau 1 au niveau 100 ; les arcs des Marques commencent au niveau 50.',
  ] },
  { date: '2026-10-14', titre: 'Les trois classes de l\'alpha', points: [
    'Sarkan : Fureur de 0 à 5, Serment sur un ennemi, Verdict qui dépense la Fureur.',
    'Lyssar : Affût (portée et dégâts tant qu\'il ne bouge pas), Marque qui révèle l\'invisible, Collets.',
    'Nerith : Larcin (PA, PM, bouclier ou bonus), butin des monstres achevés par un vol, Leurre.',
  ] },
  { date: '2026-10-14', titre: 'Caractéristiques et voie élémentaire', points: [
    'Terra, Ignis, Aqua et Aer par paliers ; Vitalité un pour un, Sagesse trois pour un.',
    'Parchemins jusqu\'à 50 points de base ; Tacle, Fuite et Prospection.',
    'Voie élémentaire au choix : les sorts de dégâts prennent l\'élément choisi.',
  ] },
  { date: '2026-10-14', titre: 'Sauvegarde protégée', points: [
    'Sauvegarde validée et signée ; un code d\'import retouché ou plus ancien est refusé.',
    'Plus de salle de donjon rejouée en rechargeant la page ; un combat abandonné compte comme perdu.',
  ] },
  { date: '2026-10-14', titre: 'Interface en fenêtres', points: [
    'Caractéristiques, Personnage, Sac, Quêtes, Succès, Carnet, Journal et Options en fenêtres déplaçables.',
    'Bloc vital, raccourcis d\'objets, mini-carte et cinq thèmes d\'interface.',
  ] },
  { date: '2026-10-13', titre: 'Rendu éclairé', points: [
    'Ciel du crépuscule, île posée sur sa falaise, lumière des lanternes et des cristaux, éclairs.',
    'Le rendu Canvas reste en repli, choisi tout seul si l\'appareil peine.',
  ] },
  { date: '2026-10-13', titre: 'Six nouveaux donjons', points: [
    'Grenier des Glyms, Volière des Kavous, Nid des Toiles, Boues Chaudes, Mine des Tholous, Cuve des Cendrous.',
    'Chaque boss se bat à sa façon : sa clé est dans son combat.',
  ] },
  { date: '2026-10-13', titre: 'Défis, Nœuds et Carnet du Veilleur', points: [
    'Un Défi tiré à chaque combat ; jusqu\'à quatre Nœuds qui durcissent les combats contre plus d\'XP et de butin.',
    'Le Carnet du Veilleur, bestiaire par région.',
  ] },
  { date: '2026-10-13', titre: 'Le jeu, niveaux 1 à 30', points: [
    'Orsane et Kaldum à explorer, quêtes, succès, donjons, artisanat et panoplies.',
  ] },
];
