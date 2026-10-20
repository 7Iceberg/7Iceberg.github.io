// La Veille du jour (js/veille.js) : le calendrier de 28 jours, sept jours, un par Voile, et quatre
// semaines, une par élément (Terra, Ignis, Aqua, Aer). Chaque jour a un nom, son Voile, son
// élément, une ligne de récit et un bonus ; la ressource demandée dépend de la tranche de niveau.
// Format : docs/QUETES.md, « La Veille du jour ». Validation : node tools/validate-content.js
// Les ressources, zones, donjons et monstres nommés ici sont définis dans d'autres fichiers.
(function () {
  const C = DATA.content;

  C.veille = {
    // Les semaines, dans l'ordre du cycle.
    semaines: ['terre', 'feu', 'eau', 'air'],

    // Ce que le réseau des Relais demande, par tranche de niveau : des ressources courantes de la
    // tranche (content/items.js), qui tombent ou se récoltent dans ses zones. Le jour choisit la
    // ressource (rang du jour dans le cycle, modulo la liste) ; la quantité, de 1 à 9, fait qu'un
    // dépôt vaut à peu près la même somme de Fils dans une tranche : 25, 35, 45, 55 puis 65.
    tranches: [
      { niveaux: [8, 12], ressources: [
        { id: 'cuir_de_grouk', n: 8 }, { id: 'soie_de_tissefil', n: 6 }, { id: 'plume_de_kavou', n: 5 },
        { id: 'cire_de_veilloche', n: 5 }, { id: 'galet_de_brimbe', n: 5 }, { id: 'bois_noueux', n: 6 },
      ] },
      { niveaux: [13, 17], ressources: [
        { id: 'cire_de_veilloche', n: 7 }, { id: 'patte_de_tissefil', n: 4 }, { id: 'galet_de_brimbe', n: 7 },
        { id: 'corne_de_grouk', n: 4 }, { id: 'herbe_de_veille', n: 9 }, { id: 'meche_de_veilloche', n: 3 },
      ] },
      { niveaux: [18, 22], ressources: [
        { id: 'pierre_de_molh', n: 8 }, { id: 'ecaille_de_brimbe', n: 4 }, { id: 'argile_de_thelk', n: 5 },
        { id: 'meche_de_veilloche', n: 4 }, { id: 'poil_de_tholou', n: 5 }, { id: 'pierre_de_calcaire', n: 9 },
      ] },
      { niveaux: [23, 27], ressources: [
        { id: 'scorie_de_kaldrik', n: 8 }, { id: 'vapeur_de_fumerolle', n: 7 }, { id: 'basalte_de_kaldum', n: 8 },
        { id: 'fer_de_pioche_vive', n: 6 }, { id: 'cendre_de_cendrou', n: 7 }, { id: 'mousse_de_molh', n: 5 },
      ] },
      { niveaux: [28, 30], ressources: [
        { id: 'cendre_de_cendrou', n: 8 }, { id: 'suie_de_fumerolle', n: 5 }, { id: 'lichen_de_scorie', n: 9 },
        { id: 'poing_de_kaldrik', n: 5 }, { id: 'charbon_de_cendrou', n: 4 }, { id: 'manche_de_pioche_vive', n: 4 },
      ] },
    ],

    // Les familles que nomment les bonus d'XP : les paliers d'une même remontée, sans son boss.
    familles: {
      grouk: { nom: 'Grouks', monstres: ['grouk', 'groukin', 'grouk_cornu'] },
      molh: { nom: 'Molhs', monstres: ['molh', 'molhin', 'molh_ancien'] },
      cendrou: { nom: 'Cendrous', monstres: ['cendrou', 'cendril'] },
      kaldrik: { nom: 'Rakthuls', monstres: ['kaldrik', 'scorik', 'kaldrik_trempe'] },
      thelk: { nom: 'Thelks', monstres: ['glek', 'thelk', 'thelk_ancien'] },
      kavou: { nom: 'Kavous', monstres: ['kavou_bleu', 'kavou_roux', 'kavou_ocre', 'kavou_blanc', 'kavou_pourpre'] },
      tissefil: { nom: 'Tissefils', monstres: ['tissefil', 'filin', 'tissefil_ancien'] },
      fumerolle: { nom: 'Fumerolles', monstres: ['fumerolle', 'fumil', 'fumerolle_noire'] },
    },

    // Les 28 jours. Bonus : xp_zone {zone} (+20 % d'XP en combat dans la zone), xp_famille
    // {famille} (+50 % d'XP sur la famille), butin_donjon {donjon} (+25 % de chances de butin),
    // atelier {atelier} (25 % de ressources en moins). Chaque donjon et chaque atelier a son jour,
    // chaque zone aussi à partir du niveau 8 ; le bonus ne s'active qu'après le dépôt du jour.
    jours: [
      // ----- Semaine de Terra : Durren, le Dragon-Montagne -----
      { voile: 1, element: 'terre', nom: 'Le Premier Souffle',
        recit: 'Chaque matin, Ruhani expire, et c\'est l\'aube. Les anciens des Cimes comptent les jours en souffles, et le cycle de la Veille commence au premier.',
        bonus: { type: 'xp_zone', zone: 'orsane_eboulis', pct: 20 } },
      { voile: 2, element: 'terre', nom: 'La Charge des Grouks',
        recit: 'Les Grouks ont dormi dix ans d\'affilée. Quelque chose les a réveillés, et depuis ils chargent tout ce qui bouge, parfois ce qui ne bouge pas.',
        bonus: { type: 'xp_famille', famille: 'grouk', pct: 50 } },
      { voile: 3, element: 'terre', nom: 'La Gueule du Terrier',
        recit: 'La pierre de la Gueule garde chaque clé qu\'on glisse dessous. Aux Cimes, les forgerons en taillent d\'autres dans la corne et le galet.',
        bonus: { type: 'butin_donjon', donjon: 'terrier_du_grand_grouk', pct: 25 } },
      { voile: 4, element: 'terre', nom: 'Les Semelles usées',
        recit: 'À Kaldum, on ressemelle ses bottes plus souvent qu\'on ne change de chemise : la roche chaude mange le cuir.',
        bonus: { type: 'atelier', atelier: 'cordonnier', pct: 25 } },
      { voile: 5, element: 'terre', nom: 'La Mousse qui luit',
        recit: 'Sur l\'Écaille de Durren pousse encore une mousse qui luit. Les Molhs en portent une toute pareille sur le dos, et personne n\'ose leur demander d\'où elle vient.',
        bonus: { type: 'xp_famille', famille: 'molh', pct: 50 } },
      { voile: 6, element: 'terre', nom: 'Les Heures lentes',
        recit: 'Là où Nohra pose ses ailes, les heures ralentissent. Les mineurs jurent qu\'elle s\'est posée un jour sur la Mine des Tholous, et que les Tholous y font la sieste depuis.',
        bonus: { type: 'butin_donjon', donjon: 'mine_des_tholous', pct: 25 } },
      { voile: 7, element: 'terre', nom: 'Les Galeries crevées',
        recit: 'Le jour de la Déchirure, les mines de Kaldum ont crevé de l\'intérieur. Les galeries rouvertes depuis bourdonnent encore de scorie de Voile.',
        bonus: { type: 'xp_zone', zone: 'kaldum_galeries', pct: 20 } },

      // ----- Semaine d'Ignis : Iskar, la Wyverne de Braise -----
      { voile: 1, element: 'feu', nom: 'Les Ailes de forge',
        recit: 'Quand Iskar passe au-dessus de la Fonderie, ses ailes de feu se tendent comme les voiles d\'une forge. Les fondeurs disent qu\'ils n\'ont jamais eu meilleur tirage.',
        bonus: { type: 'xp_zone', zone: 'kaldum_fonderie', pct: 20 } },
      { voile: 2, element: 'feu', nom: 'La Cendre semée',
        recit: 'Un Cendrou sème sa cendre partout où il passe. À Kaldum, on la balaie le matin et on la retrouve le soir, un peu plus chaude.',
        bonus: { type: 'xp_famille', famille: 'cendrou', pct: 50 } },
      { voile: 3, element: 'feu', nom: 'La Mère-Braise',
        recit: 'Au fond de la Cuve couve Kraska, la Mère-Braise. Les Cendrous qu\'on croise dans les Vapeurs en sont tous sortis, encore tièdes.',
        bonus: { type: 'butin_donjon', donjon: 'cuve_des_cendrous', pct: 25 } },
      { voile: 4, element: 'feu', nom: 'Les Forges allumées',
        recit: 'La nuit où Kaldum tombait, Dorm a tiré une lame de la scorie encore brûlante. Depuis, aucune forge de la ville ne s\'éteint la nuit : on ne sait jamais quand il faudra tenir un pont.',
        bonus: { type: 'atelier', atelier: 'forgeron', pct: 25 } },
      { voile: 5, element: 'feu', nom: 'Le Poing de scorie',
        recit: 'Un Rakthul garde dans son poing la forme du dernier coup donné. Les forgerons s\'en servent comme d\'un moule, une fois qu\'il n\'en a plus l\'usage.',
        bonus: { type: 'xp_famille', famille: 'kaldrik', pct: 50 } },
      { voile: 6, element: 'feu', nom: 'Le Marteau sous la roche',
        recit: 'Le Forgeron Enseveli frappe encore sous la roche de la Forge Morte. Les nuits calmes, tout Kaldum l\'entend battre la mesure.',
        bonus: { type: 'butin_donjon', donjon: 'forge_morte', pct: 25 } },
      { voile: 7, element: 'feu', nom: 'Le Pont de Scorie',
        recit: 'Vaskor a tenu le Pont de Scorie trois jours, seul d\'abord, puis avec ceux qui revenaient en le voyant tenir. Les Sarkan y gravent encore leur serment.',
        bonus: { type: 'xp_zone', zone: 'kaldum_ville', pct: 20 } },

      // ----- Semaine d'Aqua : Morrha, la Grande Vouivre -----
      { voile: 1, element: 'eau', nom: 'Le Ciel sans étoiles',
        recit: 'Au-dessus de la Lisière, un trou sans étoiles garde la forme d\'Ithren, disparu le jour où le premier Voile s\'est déchiré. Le Fil le cherche encore ; la Déchirure ne dit pas tout ce qu\'elle sait.',
        bonus: { type: 'xp_zone', zone: 'kaldum_vapeurs', pct: 20 } },
      { voile: 2, element: 'eau', nom: 'La Glaise qui boit',
        recit: 'Un Thelk boit l\'eau qu\'on lui jette et en sort plus fort. Les potiers de Kaldum le savent : la glaise se cuit, elle ne s\'arrose jamais.',
        bonus: { type: 'xp_famille', famille: 'thelk', pct: 50 } },
      { voile: 3, element: 'eau', nom: 'Les Boues tièdes',
        recit: 'La Glaise Mère garde la forme de chaque main qui l\'a serrée. Les potiers disent qu\'elle les reconnaît toutes, et qu\'elle n\'aime pas tout le monde.',
        bonus: { type: 'butin_donjon', donjon: 'boues_chaudes', pct: 25 } },
      { voile: 4, element: 'eau', nom: 'La Fiole de Relais',
        recit: 'Une potion de Relais se brasse à l\'herbe de Veille, qui ne se ferme jamais la nuit. Les alchimistes la conseillent aux Veilleurs qui se perdent, c\'est-à-dire à tous.',
        bonus: { type: 'atelier', atelier: 'alchimiste', pct: 25 } },
      { voile: 5, element: 'eau', nom: 'Le Voile bleu',
        recit: 'Un Kavou prend la couleur du Voile sous lequel il a niché. Ceux du Voile bleu se gavent de pluie et ne craignent rien tant que le feu.',
        bonus: { type: 'xp_famille', famille: 'kavou', pct: 50 } },
      { voile: 6, element: 'eau', nom: 'La Rosée des Toiles',
        recit: 'Dans le Nid des Toiles, la rosée tient sur les fils jusqu\'au soir. La Fileuse s\'y abreuve, et ce qu\'elle tisse ensuite ne casse plus.',
        bonus: { type: 'butin_donjon', donjon: 'nid_des_toiles', pct: 25 } },
      { voile: 7, element: 'eau', nom: 'Le Verre de mer',
        recit: 'L\'Écaille de Morrha est une goutte de verre de mer où bouge une vague. À Thessa, les Francs-Marcheurs en vendent des fausses, et les meilleures ont leur vague aussi.',
        bonus: { type: 'atelier', atelier: 'bijoutier', pct: 25 } },

      // ----- Semaine d'Aer : Aïven, le Serpent à Plumes -----
      { voile: 1, element: 'air', nom: 'L\'Orage sans nuage',
        recit: 'Sur les Sentiers des Cimes, les Traqueurs comptent les rafales. Quand l\'orage gronde sans un nuage, c\'est Aïven qui passe au loin.',
        bonus: { type: 'xp_zone', zone: 'orsane_sentiers', pct: 20 } },
      { voile: 2, element: 'air', nom: 'Le Fil coupé',
        recit: 'Les Tissefils tendent leurs fils en travers des chemins, là où passe le Fil des Relais. Un Relais dont le fil est coupé ne ramène plus personne.',
        bonus: { type: 'xp_famille', famille: 'tissefil', pct: 50 } },
      { voile: 3, element: 'air', nom: 'Les Cages ouvertes',
        recit: 'Le Kavou Prisme change de couleur dès qu\'on cesse de le regarder. À la Volière, on apprend vite à ne plus cligner des yeux.',
        bonus: { type: 'butin_donjon', donjon: 'voliere_des_kavous', pct: 25 } },
      { voile: 4, element: 'air', nom: 'La Cape au vent',
        recit: 'Une cape de Veilleur se coud avec un pan de Voile dans l\'ourlet, pour tomber droit même dans la tempête. Les tailleurs des Cimes refusent de dire où ils le trouvent.',
        bonus: { type: 'atelier', atelier: 'tailleur', pct: 25 } },
      { voile: 5, element: 'air', nom: 'La Fumée chassée',
        recit: 'Une Fumerolle craint le vent plus que la lame. Une bonne rafale la disperse avant qu\'elle ait fini de disparaître.',
        bonus: { type: 'xp_famille', famille: 'fumerolle', pct: 50 } },
      { voile: 6, element: 'air', nom: 'Les Lanternes volées',
        recit: 'En une nuit, les Glyms ont volé la moitié des lanternes des Cimes. Le Grenier en est encore plein, et aucune n\'éclaire droit.',
        bonus: { type: 'butin_donjon', donjon: 'grenier_des_pilous', pct: 25 } },
      { voile: 7, element: 'air', nom: 'La Flèche qui tombe',
        recit: 'Ysvane a tiré une flèche à travers le premier Voile, et les Lyssar disent qu\'elle tombe encore, quelque part sous le septième. Les jours de grand vent, on tend l\'oreille.',
        bonus: { type: 'xp_zone', zone: 'orsane_toiles', pct: 20 } },
    ],
  };

  // Les paliers de marques de Veille : des titres, jamais de puissance de combat. Les marques sont
  // comptées comme un haut fait (counters.feats.veille, js/veille.js).
  C.achievements.push(
    { id: 'veille_7', name: 'Une semaine de Veille', desc: 'Accomplir sept Veilles, autant que de Voiles.', cond: { type: 'feat', key: 'veille', count: 7 }, rewards: { title: 'Main des Relais' } },
    { id: 'veille_28', name: 'Le cycle des Voiles', desc: 'Accomplir vingt-huit Veilles : un cycle entier, sous les quatre éléments.', cond: { type: 'feat', key: 'veille', count: 28 }, rewards: { title: 'Veilleur des sept Voiles' } },
    { id: 'veille_100', name: 'Cent Veilles', desc: 'Accomplir cent Veilles pour l\'entretien des Relais.', cond: { type: 'feat', key: 'veille', count: 100 }, rewards: { title: 'Lanterne des Relais' } },
    { id: 'veille_365', name: 'Une année de souffles', desc: 'Accomplir trois cent soixante-cinq Veilles, autant que de souffles de Ruhani dans une année.', cond: { type: 'feat', key: 'veille', count: 365 }, rewards: { title: 'Compteur de souffles' } },
  );
})();
