// Objets et économie de Veylan : ressources, panoplies, objets, armes, consommables, recettes.
// Format : docs/SPEC-CONTENU.md. Niveaux 1 à 30, d'Orsane (les Cimes) à Kaldum (les Scories) ;
// niveaux 31 à 50, Thessa et la Lisière (partie 7), en attendant que ces régions ouvrent.
// Aucune valeur de stat brute ici : le moteur calcule tout à partir du niveau et des profils.
// Correspondance des éléments et des caractéristiques : feu = intel, eau = chance, air = agi, terre = force.
(function () {
  const C = DATA.content;

  // =====================================================================
  // 1. Ressources
  // =====================================================================
  // Pour chaque monstre : la première tombe souvent, la deuxième parfois, la troisième rarement.

  // --- Orsane, les Cimes ---
  C.resources.push(
    { id: 'plume_de_pilou', name: 'Plume de Glym', lore: 'Légère, bleutée, et toujours en trop grand nombre sur le sol de la Volière.',
      drops: [{ monster: 'pilou', rate: 38 }, { monster: 'piouk', rate: 20 }], node: null, price: 2 },
    { id: 'bec_de_pilou', name: 'Bec de Glym', lore: 'Petit, dur, et il pince encore un peu quand on le ramasse.',
      drops: [{ monster: 'pilou', rate: 15 }, { monster: 'pilou_defait', rate: 20 }], node: null, price: 6 },
    { id: 'duvet_de_pilou', name: 'Duvet de Glym', lore: 'Le dessous des ailes, doux comme un nuage qui aurait appris à voler.',
      drops: [{ monster: 'pilou', rate: 5 }], node: null, price: 15 },

    { id: 'cuir_de_grouk', name: 'Cuir de Grouk', lore: 'Épais et rugueux ; un Grouk en a plus qu\'il ne lui en faut.',
      drops: [{ monster: 'grouk', rate: 40 }, { monster: 'groukin', rate: 20 }], node: null, price: 3 },
    { id: 'corne_de_grouk', name: 'Corne de Grouk', lore: 'Courte, torsadée, parfaite pour un manche ou pour se faire charger.',
      drops: [{ monster: 'grouk', rate: 15 }, { monster: 'grouk_cornu', rate: 20 }], node: null, price: 8 },
    { id: 'croc_de_grouk', name: 'Croc de Grouk', lore: 'Un Grouk n\'en perd que lorsqu\'il mord quelque chose de plus dur que lui.',
      drops: [{ monster: 'grouk', rate: 4 }], node: null, price: 18 },

    { id: 'soie_de_tissefil', name: 'Soie de Tissefil', lore: 'Un fil qui ne casse pas, à condition de ne pas s\'y prendre les pieds.',
      drops: [{ monster: 'tissefil', rate: 35 }, { monster: 'filin', rate: 20 }], node: null, price: 4 },
    { id: 'patte_de_tissefil', name: 'Patte de Tissefil', lore: 'Huit par bête, et pourtant on n\'en récupère jamais plus d\'une.',
      drops: [{ monster: 'tissefil', rate: 16 }, { monster: 'tissefil_ancien', rate: 20 }], node: null, price: 9 },
    { id: 'venin_de_tissefil', name: 'Venin de Tissefil', lore: 'Une goutte verte qui engourdit ; les alchimistes l\'adorent, les doigts moins.',
      drops: [{ monster: 'tissefil', rate: 4 }], node: null, price: 20 },

    { id: 'cire_de_veilloche', name: 'Cire de Veilloche', lore: 'Encore tiède. Une Veilloche en coule un peu à chaque pas.',
      drops: [{ monster: 'veilloche', rate: 38 }, { monster: 'loche', rate: 25 }], node: null, price: 5 },
    { id: 'meche_de_veilloche', name: 'Mèche de Veilloche', lore: 'Le cœur de la lanterne vivante ; elle brûle sans jamais noircir.',
      drops: [{ monster: 'veilloche', rate: 14 }, { monster: 'veilloche_tissee', rate: 20 }], node: null, price: 11 },
    { id: 'lueur_de_veilloche', name: 'Lueur de Veilloche', lore: 'Un éclat de lumière figé dans un cristal ; il éclaire les sacs de l\'intérieur.',
      drops: [{ monster: 'veilloche', rate: 4 }], node: null, price: 24 },

    { id: 'galet_de_brimbe', name: 'Galet de Brimbe', lore: 'Rond, lisse, lancé fort. Beaucoup finissent dans les poches des Veilleurs.',
      drops: [{ monster: 'brimbe', rate: 42 }, { monster: 'brim', rate: 20 }], node: null, price: 5 },
    { id: 'ecaille_de_brimbe', name: 'Écaille de Brimbe', lore: 'Grise et dure, elle fait un bruit de pierre quand elle tombe.',
      drops: [{ monster: 'brimbe', rate: 16 }, { monster: 'brimbe_fendue', rate: 20 }], node: null, price: 12 },
    { id: 'oeil_de_brimbe', name: 'Œil de Brimbe', lore: 'L\'œil qui vise si bien. Il continue de fixer celui qui le porte.',
      drops: [{ monster: 'brimbe', rate: 5 }], node: null, price: 26 },

    { id: 'crocs_du_grand_grouk', name: 'Crocs du Grand Grouk', lore: 'Deux crocs longs comme l\'avant-bras ; le Grand Grouk n\'en avait que deux, et il y tenait.',
      drops: [{ monster: 'grand_grouk', rate: 100 }], node: null, price: 45 },
    { id: 'peau_du_grand_grouk', name: 'Peau du Grand Grouk', lore: 'Un pan de peau tanné par vingt ans de charges dans la roche.',
      drops: [{ monster: 'grand_grouk', rate: 50 }], node: null, price: 40 },
    { id: 'cle_du_terrier', name: 'Clé du Terrier', lore: 'Un coin de corne et de galets serrés dans du cuir. On le glisse sous la pierre de la Gueule, elle bascule, on entre. La pierre garde le coin.',
      drops: [{ monster: 'grouk_cornu', rate: 3 }, { monster: 'grouk', rate: 1 }], node: null, price: 60 },

    { id: 'lanterne_cabossee', name: 'Lanterne cabossée', lore: 'Une lanterne du Fil reprise au Glym Chapardeur. Elle éclaire encore, mais de travers.',
      drops: [{ monster: 'pilou_chapardeur', rate: 100 }], node: null, price: 20 },
    { id: 'plume_doree', name: 'Plume dorée', lore: 'Le Chapardeur la lissait chaque soir à la lueur de ses lanternes volées. Elle brille très bien sans elles.',
      drops: [{ monster: 'pilou_chapardeur', rate: 50 }], node: null, price: 25 },

    { id: 'eclat_de_prisme', name: 'Éclat de prisme', lore: 'Un éclat tombé du Kavou Prisme. Il change de couleur dès qu\'on cesse de le regarder.',
      drops: [{ monster: 'kavou_prisme', rate: 100 }], node: null, price: 35 },
    { id: 'plume_changeante', name: 'Plume changeante', lore: 'Bleue le matin, rousse à midi, blanche le soir. Ocre quand elle boude.',
      drops: [{ monster: 'kavou_prisme', rate: 50 }], node: null, price: 40 },

    { id: 'plume_de_kavou', name: 'Plume de Kavou', lore: 'Teinte de la couleur du Voile sous lequel le Kavou a niché. Elle déteint un peu sur les doigts.',
      drops: [{ monster: 'kavou_bleu', rate: 20 }, { monster: 'kavou_roux', rate: 20 }, { monster: 'kavou_ocre', rate: 20 }, { monster: 'kavou_blanc', rate: 20 }, { monster: 'kavou_pourpre', rate: 25 }], node: null, price: 5 },
    { id: 'brin_d_oreth', name: 'Brin d\'Oreth', lore: 'Un fil du premier Voile, encore lumineux. Il glisse entre les doigts comme s\'il voulait repartir.',
      drops: [{ monster: 'oreth', rate: 100 }], node: null, price: 60 },

    { id: 'cocon_de_fileuse', name: 'Cocon de la Fileuse', lore: 'Un pan du cocon déchiré, plus solide que tout ce que tissent les Tissefils réunis.',
      drops: [{ monster: 'fileuse', rate: 100 }], node: null, price: 35 },
    { id: 'soie_de_fileuse', name: 'Soie de la Fileuse', lore: 'Un fil si fin qu\'on ne le voit qu\'au moment de le perdre.',
      drops: [{ monster: 'fileuse', rate: 50 }], node: null, price: 40 },
  );

  // --- Kaldum, les Scories ---
  C.resources.push(
    { id: 'pierre_de_molh', name: 'Pierre de Molh', lore: 'Un morceau de Molh ; il pèse exactement ce qu\'il a l\'air de peser.',
      drops: [{ monster: 'molh', rate: 40 }, { monster: 'molhin', rate: 20 }], node: null, price: 6 },
    { id: 'mousse_de_molh', name: 'Mousse de Molh', lore: 'Elle pousse sur le dos des Molhs, qui ne vont jamais assez vite pour la perdre.',
      drops: [{ monster: 'molh', rate: 15 }, { monster: 'molh_ancien', rate: 20 }], node: null, price: 12 },
    { id: 'coeur_de_molh', name: 'Cœur de Molh', lore: 'Une pierre chaude au centre de la masse. Elle bat, lentement.',
      drops: [{ monster: 'molh', rate: 4 }], node: null, price: 32 },

    { id: 'scorie_de_kaldrik', name: 'Scorie de Rakthul', lore: 'Croûte noire et poreuse, encore un peu chaude le matin.',
      drops: [{ monster: 'kaldrik', rate: 38 }, { monster: 'scorik', rate: 20 }, { monster: 'kaldrik_trempe', rate: 20 }], node: null, price: 7 },
    { id: 'poing_de_kaldrik', name: 'Poing de Rakthul', lore: 'Une main de roche fondue qui garde la forme du dernier coup donné.',
      drops: [{ monster: 'kaldrik', rate: 14 }], node: null, price: 14 },
    { id: 'braise_de_kaldrik', name: 'Braise de Rakthul', lore: 'Ce qui reste quand un Rakthul a trop fondu. Ne pas ranger près du pain.',
      drops: [{ monster: 'kaldrik', rate: 5 }], node: null, price: 30 },

    { id: 'vapeur_de_fumerolle', name: 'Vapeur de Fumerolle', lore: 'Capturée dans une fiole, elle tourne encore sur elle-même.',
      drops: [{ monster: 'fumerolle', rate: 35 }, { monster: 'fumil', rate: 20 }, { monster: 'fumerolle_noire', rate: 20 }], node: null, price: 8 },
    { id: 'suie_de_fumerolle', name: 'Suie de Fumerolle', lore: 'Fine et noire, elle tache tout ce qu\'elle touche, Veilleur compris.',
      drops: [{ monster: 'fumerolle', rate: 16 }], node: null, price: 14 },
    { id: 'souffle_de_fumerolle', name: 'Souffle de Fumerolle', lore: 'La dernière bouffée d\'une Fumerolle ; elle sent le soufre et l\'invisible.',
      drops: [{ monster: 'fumerolle', rate: 4 }], node: null, price: 34 },

    { id: 'fer_de_pioche_vive', name: 'Fer de Pioche-Vive', lore: 'Un bon fer, déjà forgé une fois. Il n\'aime pas qu\'on le refonde.',
      drops: [{ monster: 'pioche_vive', rate: 40 }, { monster: 'clou_vif', rate: 20 }], node: null, price: 9 },
    { id: 'manche_de_pioche_vive', name: 'Manche de Pioche-Vive', lore: 'Du bois dur de Kaldum, poli par des années à frapper tout seul.',
      drops: [{ monster: 'pioche_vive', rate: 14 }, { monster: 'masse_vive', rate: 20 }], node: null, price: 15 },
    { id: 'etincelle_de_pioche_vive', name: 'Étincelle de Pioche-Vive', lore: 'Ce qui faisait vivre la pioche. Elle saute d\'un doigt à l\'autre.',
      drops: [{ monster: 'pioche_vive', rate: 4 }], node: null, price: 36 },

    { id: 'cendre_de_cendrou', name: 'Cendre de Cendrou', lore: 'Chaude et grise ; un Cendrou en sème partout où il passe.',
      drops: [{ monster: 'cendrou', rate: 42 }, { monster: 'cendril', rate: 20 }], node: null, price: 8 },
    { id: 'charbon_de_cendrou', name: 'Charbon de Cendrou', lore: 'Noir, dense, il tient le feu trois jours sans se plaindre.',
      drops: [{ monster: 'cendrou', rate: 16 }], node: null, price: 16 },
    { id: 'noyau_de_cendrou', name: 'Noyau de Cendrou', lore: 'Le cœur d\'un Cendrou, rouge sombre. Il faut des gants, et du courage.',
      drops: [{ monster: 'cendrou', rate: 4 }], node: null, price: 40 },

    { id: 'argile_de_thelk', name: 'Argile de Thelk', lore: 'Une motte tiède qui claque des lèvres quand on l\'arrose. Mieux vaut ne pas l\'arroser.',
      drops: [{ monster: 'glek', rate: 20 }, { monster: 'thelk', rate: 25 }, { monster: 'thelk_ancien', rate: 25 }], node: null, price: 9 },
    { id: 'poil_de_tholou', name: 'Poil de Tholou', lore: 'Doux, roux et toujours un peu chaud. Il ronronne encore quand on le caresse, ce qui inquiète.',
      drops: [{ monster: 'tholi', rate: 20 }, { monster: 'tholou', rate: 20 }, { monster: 'tholou_tisse', rate: 25 }], node: null, price: 9 },
    { id: 'coeur_de_col', name: 'Cœur de Col', lore: 'Le bloc qui tenait Korvath debout. Il roule encore un peu quand on le pose de travers.',
      drops: [{ monster: 'korvath', rate: 100 }], node: null, price: 80 },

    { id: 'marteau_de_dorm', name: 'Marteau de Dorm', lore: 'Le marteau de Dorm, le Forgeron Enseveli. Il résonne encore un peu quand on le pose.',
      drops: [{ monster: 'dorm', rate: 100 }], node: null, price: 60 },
    { id: 'enclume_de_dorm', name: 'Éclat d\'enclume de Dorm', lore: 'Un éclat de l\'enclume de Dorm. Tout ce qu\'on y frappe en sort meilleur.',
      drops: [{ monster: 'dorm', rate: 50 }], node: null, price: 55 },

    { id: 'motte_de_glaise_mere', name: 'Motte de Glaise Mère', lore: 'Encore tiède, encore molle ; elle garde la forme de la main qui la serre.',
      drops: [{ monster: 'glaise_mere', rate: 100 }], node: null, price: 45 },
    { id: 'tesson_cuit', name: 'Tesson cuit', lore: 'Un morceau de Glaise Mère passé au feu. Dur comme la pierre, il sonne quand on le frappe.',
      drops: [{ monster: 'glaise_mere', rate: 50 }], node: null, price: 50 },

    { id: 'pelage_du_grand_tholou', name: 'Pelage du Grand Tholou', lore: 'Une touffe de poils roux qui reste chaude des jours entiers. Les mineurs en glissent dans leurs bottes.',
      drops: [{ monster: 'grand_tholou', rate: 100 }], node: null, price: 50 },
    { id: 'moustache_du_grand_tholou', name: 'Moustache du Grand Tholou', lore: 'Longue, raide et tiède. Il en avait dix-huit, il en comptera dix-sept.',
      drops: [{ monster: 'grand_tholou', rate: 50 }], node: null, price: 55 },

    { id: 'robe_de_kraska', name: 'Lambeau de robe de cendre', lore: 'Un pan de la robe de Kraska. Les coups glissent dessus, les explosions passent au travers.',
      drops: [{ monster: 'kraska', rate: 100 }], node: null, price: 55 },
    { id: 'coeur_de_kraska', name: 'Cœur de la Mère-Braise', lore: 'Il rougeoie encore et rallume tout ce qu\'on pose à côté, sac compris.',
      drops: [{ monster: 'kraska', rate: 50 }], node: null, price: 60 },
  );

  // --- Récolte ---
  C.resources.push(
    { id: 'bois_de_cime', name: 'Bois de Cime', lore: 'Bois clair des grands arbres d\'Orsane ; léger, droit, facile à vivre.',
      drops: [], node: { kind: 'bois', zone: 'orsane' }, price: 2 },
    { id: 'bois_noueux', name: 'Bois Noueux', lore: 'Un bois tordu qui a poussé contre le vent. Il ne cassera pas, il a l\'habitude.',
      drops: [], node: { kind: 'bois', zone: 'orsane' }, price: 4 },
    { id: 'pierre_de_calcaire', name: 'Pierre de Calcaire', lore: 'Blanche, tendre, facile à tailler ; les Cimes sont faites de ça.',
      drops: [], node: { kind: 'pierre', zone: 'orsane' }, price: 3 },
    { id: 'basalte_de_kaldum', name: 'Basalte de Kaldum', lore: 'Noir et lourd, refroidi d\'une coulée que personne n\'a vue couler.',
      drops: [], node: { kind: 'pierre', zone: 'kaldum' }, price: 7 },
    { id: 'herbe_de_veille', name: 'Herbe de Veille', lore: 'Elle ne se ferme jamais la nuit. Les boulangers d\'Orsane en mettent partout.',
      drops: [], node: { kind: 'plante', zone: 'orsane' }, price: 2 },
    { id: 'lichen_de_scorie', name: 'Lichen de Scorie', lore: 'Il pousse sur la roche chaude. Amer, mais nourrissant, et il ne brûle jamais.',
      drops: [], node: { kind: 'plante', zone: 'kaldum' }, price: 6 },
  );

  // =====================================================================
  // 2. Panoplies
  // =====================================================================
  // Chaque panoplie a coiffe, cape, amulette et bottes, plus anneau et/ou ceinture.
  // Les profils suivent le caractère de la famille ; sur l'ensemble, les six caractéristiques sont servies.

  C.sets.push({
    id: 'marcheur', name: 'Panoplie du Marcheur', family: [], level: 1,
    profile: { vita: 40, sagesse: 20, force: 10, intel: 10, chance: 10, agi: 10 },
    pieces: [
      { slot: 'coiffe', id: 'coiffe_marcheur', name: 'Coiffe du Marcheur', lore: 'Un bonnet de laine qui tient chaud et qui tient sur la tête, ce qui fait déjà deux qualités.' },
      { slot: 'cape', id: 'cape_marcheur', name: 'Cape du Marcheur', lore: 'Elle a surtout servi de couverture, et elle le fera encore.' },
      { slot: 'amulette', id: 'amulette_marcheur', name: 'Amulette du Marcheur', lore: 'Un galet percé sur une ficelle. Le Fil y tient beaucoup, personne ne sait pourquoi.' },
      { slot: 'ceinture', id: 'ceinture_marcheur', name: 'Ceinture du Marcheur', lore: 'Une sangle de toile avec une boucle en bois. Elle retient le pantalon, ce qui est son travail.' },
      { slot: 'bottes', id: 'bottes_marcheur', name: 'Bottes du Marcheur', lore: 'Elles ont déjà marché pour quelqu\'un d\'autre. Elles connaissent le chemin.' },
    ],
    bonusProfile: { vita: 60, sagesse: 40 },
    lore: 'L\'équipement de départ que le Fil remet à chaque Veilleur, vendu trois fois rien au Comptoir. Il n\'a rien d\'extraordinaire, et c\'est bien ce qu\'on lui demande.',
  });

  C.sets.push({
    id: 'pilou', name: 'Panoplie du Glym', family: ['pilou'], level: 3,
    profile: { agi: 50, vita: 30, sagesse: 20 },
    pieces: [
      { slot: 'coiffe', id: 'coiffe_pilou', name: 'Coiffe du Glym', lore: 'Une couronne de plumes bleues. De loin, les Glyms la prennent pour un des leurs.' },
      { slot: 'cape', id: 'cape_pilou', name: 'Cape du Glym', lore: 'Elle claque au vent et donne envie de sauter d\'un rocher. Résistez.' },
      { slot: 'amulette', id: 'amulette_pilou', name: 'Amulette du Glym', lore: 'Un bec de Glym monté sur un fil. Il ne pince plus, en principe.' },
      { slot: 'anneau', id: 'anneau_pilou', name: 'Anneau du Glym', lore: 'Si fin qu\'on l\'oublie. Puis on court plus vite et on se souvient.' },
      { slot: 'bottes', id: 'bottes_pilou', name: 'Bottes du Glym', lore: 'Doublées de duvet. Les pieds ne touchent presque plus le sol.' },
    ],
    bonusProfile: { agi: 60, vita: 40 },
    lore: 'Cousue dans les plumes des Glyms de la Volière, elle rend presque aussi léger qu\'eux. Presque : on ne vole pas, on trébuche moins.',
  });

  C.sets.push({
    id: 'grouk', name: 'Panoplie du Grouk', family: ['grouk'], level: 6,
    profile: { force: 50, vita: 40, sagesse: 10 },
    pieces: [
      { slot: 'coiffe', id: 'coiffe_grouk', name: 'Coiffe du Grouk', lore: 'Deux cornes sur un casque de cuir. Baisser la tête devient une stratégie.' },
      { slot: 'cape', id: 'cape_grouk', name: 'Cape du Grouk', lore: 'Un pan de cuir si épais qu\'il tient debout tout seul.' },
      { slot: 'amulette', id: 'amulette_grouk', name: 'Amulette du Grouk', lore: 'Un croc de Grouk au bout d\'une lanière. Il a mordu de la roche, il peut bien pendre à un cou.' },
      { slot: 'ceinture', id: 'ceinture_grouk', name: 'Ceinture du Grouk', lore: 'Large comme une planche. Elle tient le ventre et les idées en place.' },
      { slot: 'bottes', id: 'bottes_grouk', name: 'Bottes du Grouk', lore: 'Chaque pas s\'entend à dix cases. Les Glyms s\'enfuient, les Grouks accourent.' },
    ],
    bonusProfile: { force: 60, vita: 40 },
    lore: 'Du cuir, de la corne et du poids. Taillée pour ceux qui préfèrent encaisser une charge plutôt que l\'éviter.',
  });

  C.sets.push({
    id: 'tissefil', name: 'Panoplie du Tissefil', family: ['tissefil'], level: 9,
    profile: { intel: 50, sagesse: 30, vita: 20 },
    pieces: [
      { slot: 'coiffe', id: 'coiffe_tissefil', name: 'Coiffe du Tissefil', lore: 'Un voile de soie qui couvre les yeux sans gêner la vue. Personne ne sait comment.' },
      { slot: 'cape', id: 'cape_tissefil', name: 'Cape du Tissefil', lore: 'Elle ondule même sans vent. On préfère ne pas savoir pourquoi.' },
      { slot: 'amulette', id: 'amulette_tissefil', name: 'Amulette du Tissefil', lore: 'Une goutte de venin prise dans la soie. Elle luit faiblement quand il pleut.' },
      { slot: 'anneau', id: 'anneau_tissefil', name: 'Anneau du Tissefil', lore: 'Huit fils tressés serré, comme les pattes qui les ont filés.' },
      { slot: 'ceinture', id: 'ceinture_tissefil', name: 'Ceinture du Tissefil', lore: 'Elle colle juste assez pour que rien ne tombe des poches.' },
      { slot: 'bottes', id: 'bottes_tissefil', name: 'Bottes du Tissefil', lore: 'On ne glisse plus sur les Toiles. On y adhère, ce qui est un autre problème.' },
    ],
    bonusProfile: { intel: 60, sagesse: 40 },
    lore: 'Tissée dans la soie des Toiles, elle est douce, luisante et un peu collante. Ceux qui la portent disent qu\'on finit par s\'y faire.',
  });

  C.sets.push({
    id: 'veilloche', name: 'Panoplie de la Veilloche', family: ['veilloche'], level: 12,
    profile: { intel: 45, sagesse: 35, vita: 20 },
    pieces: [
      { slot: 'coiffe', id: 'coiffe_veilloche', name: 'Coiffe de la Veilloche', lore: 'Une mèche y brûle sans flamme. Pratique pour lire la nuit, moins pour se cacher.' },
      { slot: 'cape', id: 'cape_veilloche', name: 'Cape de la Veilloche', lore: 'Elle garde la chaleur et une odeur de bougie qui ne part jamais.' },
      { slot: 'amulette', id: 'amulette_veilloche', name: 'Amulette de la Veilloche', lore: 'Un éclat de lueur figé dans la cire. Il pulse au rythme du cœur.' },
      { slot: 'anneau', id: 'anneau_veilloche', name: 'Anneau de la Veilloche', lore: 'Une goutte de cire durcie autour du doigt. Elle réchauffe les mains et les sorts.' },
      { slot: 'bottes', id: 'bottes_veilloche', name: 'Bottes de la Veilloche', lore: 'Les semelles laissent des pas légèrement lumineux. On vous retrouve toujours.' },
    ],
    bonusProfile: { sagesse: 50, intel: 50 },
    lore: 'Moulée dans la cire tiède des lanternes vivantes, elle éclaire doucement celui qui la porte. Les soigneurs l\'adorent, les embusqués moins.',
  });

  C.sets.push({
    id: 'brimbe', name: 'Panoplie de la Brimbe', family: ['brimbe'], level: 14,
    profile: { chance: 40, agi: 35, vita: 25 },
    pieces: [
      { slot: 'coiffe', id: 'coiffe_brimbe', name: 'Coiffe de la Brimbe', lore: 'Un casque d\'écailles avec un œil de Brimbe serti au front. Il regarde où vous ne regardez pas.' },
      { slot: 'cape', id: 'cape_brimbe', name: 'Cape de la Brimbe', lore: 'Cousue d\'écailles, elle pèse plus que prévu et protège mieux qu\'espéré.' },
      { slot: 'amulette', id: 'amulette_brimbe', name: 'Amulette de la Brimbe', lore: 'Un galet parfaitement rond. Il donne envie de le lancer sur quelqu\'un.' },
      { slot: 'ceinture', id: 'ceinture_brimbe', name: 'Ceinture de la Brimbe', lore: 'Des poches pleines de galets. On ne manque jamais de munitions.' },
      { slot: 'bottes', id: 'bottes_brimbe', name: 'Bottes de la Brimbe', lore: 'Faites pour reculer sans se retourner. Les Brimbes approuvent.' },
    ],
    bonusProfile: { agi: 50, force: 50 },
    lore: 'Écailles grises et galets polis, assemblés pour ceux qui frappent de loin et reculent vite. Elle fait un bruit de gravier à chaque pas.',
  });

  C.sets.push({
    id: 'grand_grouk', name: 'Panoplie du Grand Grouk', family: ['grand_grouk'], level: 18,
    profile: { force: 30, chance: 20, vita: 35, sagesse: 15 },
    pieces: [
      { slot: 'coiffe', id: 'coiffe_grand_grouk', name: 'Coiffe du Grand Grouk', lore: 'Les deux grands crocs encadrent le visage. On a l\'air redoutable, et un peu idiot.' },
      { slot: 'cape', id: 'cape_grand_grouk', name: 'Cape du Grand Grouk', lore: 'Un pan entier de peau tannée. Les charges glissent dessus.' },
      { slot: 'amulette', id: 'amulette_grand_grouk', name: 'Amulette du Grand Grouk', lore: 'Un croc du maître du Terrier, serti dans la corne. Il vibre quand un Grouk approche.' },
      { slot: 'anneau', id: 'anneau_grand_grouk', name: 'Anneau du Grand Grouk', lore: 'Un anneau de corne massif. Il tient le poing fermé tout seul.' },
      { slot: 'ceinture', id: 'ceinture_grand_grouk', name: 'Ceinture du Grand Grouk', lore: 'Trois tours de cuir du Terrier. On y accroche ce qu\'on veut, et ça tient.' },
      { slot: 'bottes', id: 'bottes_grand_grouk', name: 'Bottes du Grand Grouk', lore: 'Chaque pas fait trembler le sol. C\'est l\'effet recherché.' },
    ],
    bonusProfile: { force: 50, vita: 50 },
    lore: 'Découpée dans la peau du maître du Terrier, elle sent encore la horde. Quand on la porte, les Grouks hésitent une seconde avant de charger.',
  });

  C.sets.push({
    id: 'molh', name: 'Panoplie du Molh', family: ['molh'], level: 21,
    profile: { force: 30, intel: 20, vita: 40, sagesse: 10 },
    pieces: [
      { slot: 'coiffe', id: 'coiffe_molh', name: 'Coiffe du Molh', lore: 'Un bloc de pierre creusé à la mesure du crâne. Rien ne passe au travers, pas même les idées.' },
      { slot: 'cape', id: 'cape_molh', name: 'Cape du Molh', lore: 'De la mousse de Molh tissée serré. Elle est chaude, humide et indestructible.' },
      { slot: 'amulette', id: 'amulette_molh', name: 'Amulette du Molh', lore: 'Un cœur de Molh dans un écrin de pierre. Il bat encore, lentement.' },
      { slot: 'ceinture', id: 'ceinture_molh', name: 'Ceinture du Molh', lore: 'Des dalles de pierre articulées. S\'asseoir demande une préparation.' },
      { slot: 'bottes', id: 'bottes_molh', name: 'Bottes du Molh', lore: 'On ne court pas avec. On ne recule pas non plus.' },
    ],
    bonusProfile: { vita: 60, force: 40 },
    lore: 'Pierre de Kaldum et mousse épaisse, pour ceux qui préfèrent ne pas bouger plutôt que tomber. Elle pèse son poids, et c\'est le but.',
  });

  C.sets.push({
    id: 'kaldrik', name: 'Panoplie du Rakthul', family: ['kaldrik'], level: 23,
    profile: { force: 35, intel: 35, vita: 30 },
    pieces: [
      { slot: 'coiffe', id: 'coiffe_kaldrik', name: 'Coiffe du Rakthul', lore: 'Un heaume de scorie. Il tient chaud en hiver et trop chaud le reste du temps.' },
      { slot: 'cape', id: 'cape_kaldrik', name: 'Cape du Rakthul', lore: 'Une croûte de scorie souple comme du cuir. Les étincelles glissent dessus.' },
      { slot: 'amulette', id: 'amulette_kaldrik', name: 'Amulette du Rakthul', lore: 'Une braise de Rakthul enfermée dans la roche. Elle ne s\'éteint jamais tout à fait.' },
      { slot: 'ceinture', id: 'ceinture_kaldrik', name: 'Ceinture du Rakthul', lore: 'Un poing de Rakthul sert de boucle. Il tient fermé, et fort.' },
      { slot: 'bottes', id: 'bottes_kaldrik', name: 'Bottes du Rakthul', lore: 'Semelles de scorie. Elles grésillent sur le sol mouillé.' },
    ],
    bonusProfile: { force: 50, intel: 50 },
    lore: 'Scorie noire et roche fondue, forgée pour frapper fort et chauffer vite. Elle garde la chaleur d\'un Rakthul qu\'on vient d\'abattre.',
  });

  C.sets.push({
    id: 'fumerolle', name: 'Panoplie de la Fumerolle', family: ['fumerolle'], level: 25,
    profile: { intel: 30, chance: 30, agi: 15, vita: 25 },
    pieces: [
      { slot: 'coiffe', id: 'coiffe_fumerolle', name: 'Coiffe de la Fumerolle', lore: 'Un voile de vapeur qui ne retombe jamais. Les contours du visage se brouillent.' },
      { slot: 'cape', id: 'cape_fumerolle', name: 'Cape de la Fumerolle', lore: 'Elle laisse une traînée de fumée. Les ennemis la suivent, et vous êtes déjà ailleurs.' },
      { slot: 'amulette', id: 'amulette_fumerolle', name: 'Amulette de la Fumerolle', lore: 'Un souffle de Fumerolle dans une fiole. Il tourne encore.' },
      { slot: 'anneau', id: 'anneau_fumerolle', name: 'Anneau de la Fumerolle', lore: 'Il devient froid quand quelqu\'un vous regarde. Un bon signal.' },
      { slot: 'bottes', id: 'bottes_fumerolle', name: 'Bottes de la Fumerolle', lore: 'Elles ne laissent pas de traces, juste un peu de suie.' },
    ],
    bonusProfile: { agi: 50, intel: 50 },
    lore: 'Tissée de vapeur et de suie, elle est à peine là, et ceux qui la portent non plus. Taillée pour frapper vite et disparaître.',
  });

  C.sets.push({
    id: 'pioche_vive', name: 'Panoplie de la Pioche-Vive', family: ['pioche_vive'], level: 27,
    profile: { agi: 45, force: 30, vita: 25 },
    pieces: [
      { slot: 'coiffe', id: 'coiffe_pioche_vive', name: 'Coiffe de la Pioche-Vive', lore: 'Un casque de fer vif. Il frémit quand une veine de métal passe à portée.' },
      { slot: 'cape', id: 'cape_pioche_vive', name: 'Cape de la Pioche-Vive', lore: 'Des plaques de fer cousues sur du cuir. Elle tinte en marchant, comme une mine en activité.' },
      { slot: 'amulette', id: 'amulette_pioche_vive', name: 'Amulette de la Pioche-Vive', lore: 'Une étincelle de Pioche-Vive prise dans le fer. Elle saute d\'un maillon à l\'autre.' },
      { slot: 'anneau', id: 'anneau_pioche_vive', name: 'Anneau de la Pioche-Vive', lore: 'Un anneau de fer forgé d\'une pièce. Il vise mieux que vous, et le sait.' },
      { slot: 'ceinture', id: 'ceinture_pioche_vive', name: 'Ceinture de la Pioche-Vive', lore: 'Une boucle de fer vif et un manche en guise de sangle. Elle se resserre toute seule.' },
      { slot: 'bottes', id: 'bottes_pioche_vive', name: 'Bottes de la Pioche-Vive', lore: 'Du bois dur et du fer. Elles frappent le sol, et le sol s\'en souvient.' },
    ],
    bonusProfile: { agi: 60, force: 40 },
    lore: 'Fer vif et bois de Kaldum, montés par des forgerons qui espéraient que ça ne se mettrait pas à bouger. Jusqu\'ici, ça tient.',
  });

  C.sets.push({
    id: 'cendrou', name: 'Panoplie du Cendrou', family: ['cendrou'], level: 29,
    profile: { intel: 50, sagesse: 25, vita: 25 },
    pieces: [
      { slot: 'coiffe', id: 'coiffe_cendrou', name: 'Coiffe du Cendrou', lore: 'Un casque de charbon dense. On en sort les cheveux gris, mais l\'esprit vif.' },
      { slot: 'cape', id: 'cape_cendrou', name: 'Cape du Cendrou', lore: 'De la cendre figée en tissu. Elle se consume sans jamais finir.' },
      { slot: 'amulette', id: 'amulette_cendrou', name: 'Amulette du Cendrou', lore: 'Un noyau de Cendrou. Il brûle rouge au creux de la poitrine.' },
      { slot: 'anneau', id: 'anneau_cendrou', name: 'Anneau du Cendrou', lore: 'Un anneau de charbon poli. Les sorts de feu en sortent plus chauds.' },
      { slot: 'bottes', id: 'bottes_cendrou', name: 'Bottes du Cendrou', lore: 'Elles laissent des traces de cendre chaude. Les braises vous suivent de loin.' },
    ],
    bonusProfile: { intel: 60, sagesse: 40 },
    lore: 'Charbon, cendre et noyau rouge, pour ceux dont les sorts brûlent déjà. Elle tient chaud ; il ne faut pas s\'asseoir dessus.',
  });

  C.sets.push({
    id: 'dorm', name: 'Panoplie de Dorm', family: ['dorm'], level: 30,
    profile: { force: 35, vita: 30, intel: 25, sagesse: 10 },
    pieces: [
      { slot: 'coiffe', id: 'coiffe_dorm', name: 'Coiffe de Dorm', lore: 'Un heaume de forgeron, noir de suie. Il a vu des siècles de feu et n\'en parle à personne.' },
      { slot: 'cape', id: 'cape_dorm', name: 'Cape de Dorm', lore: 'Un tablier de forge taillé en cape. Rien ne le traverse, pas même les regrets.' },
      { slot: 'amulette', id: 'amulette_dorm', name: 'Amulette de Dorm', lore: 'Un éclat de l\'enclume de Dorm. Il résonne quand on frappe fort.' },
      { slot: 'anneau', id: 'anneau_dorm', name: 'Anneau de Dorm', lore: 'Un anneau de fer trempé. Il ne chauffe jamais, même en plein feu.' },
      { slot: 'ceinture', id: 'ceinture_dorm', name: 'Ceinture de Dorm', lore: 'Cuir de forge et boucle de fer. Elle a survécu à Dorm, elle vous survivra.' },
      { slot: 'bottes', id: 'bottes_dorm', name: 'Bottes de Dorm', lore: 'Semelles de basalte et tiges de cuir. On marche sur la lave sans y penser.' },
    ],
    bonusProfile: { force: 40, intel: 30, vita: 30 },
    lore: 'Forgée avec le marteau et l\'enclume de Dorm, le Forgeron Enseveli, dans sa propre forge. La panoplie la plus solide du premier continent, et la plus lourde à porter.',
  });

  // =====================================================================
  // 3. Objets hors panoplie
  // =====================================================================
  // Ils comblent les trous entre les panoplies : une caractéristique à un niveau où aucune panoplie ne la donne.
  // Pour une source drop, « from » indique le monstre qui la lâche.

  C.items.push(
    // --- Coiffes ---
    { id: 'capuche_de_soie', name: 'Capuche de Soie', slot: 'coiffe', level: 11, profile: { chance: 50, agi: 30, vita: 20 }, source: 'craft',
      lore: 'Légère et glissante ; les coups passent à côté, les regards aussi.' },
    { id: 'heaume_de_calcaire', name: 'Heaume de Calcaire', slot: 'coiffe', level: 16, profile: { vita: 50, force: 30, sagesse: 20 }, source: 'craft',
      lore: 'Taillé dans la pierre blanche des Cimes. Lourd, mais rien ne le traverse.' },
    { id: 'capuche_de_lichen', name: 'Capuche de Lichen', slot: 'coiffe', level: 20, profile: { chance: 50, sagesse: 30, vita: 20 }, source: 'craft',
      lore: 'Du lichen de scorie tressé sur de la mousse. Elle pousse encore, et elle porte chance, dit le cordonnier qui ne la fait pas.' },
    { id: 'couronne_de_braise', name: 'Couronne de Braise', slot: 'coiffe', level: 24, profile: { intel: 60, sagesse: 20, vita: 20 }, source: 'craft',
      lore: 'Un cercle de scorie où brûle une braise. Les idées viennent chaudes.' },
    { id: 'casque_de_fer_vif', name: 'Casque de Fer Vif', slot: 'coiffe', level: 28, profile: { agi: 50, chance: 30, vita: 20 }, source: 'drop', from: 'pioche_vive',
      lore: 'Il frémit avant chaque coup, un quart de seconde avant vous.' },

    // --- Capes ---
    { id: 'cape_de_plumes', name: 'Cape de Plumes', slot: 'cape', level: 4, profile: { agi: 60, vita: 40 }, source: 'craft',
      lore: 'Mille plumes de Glym. Elle ne fait pas voler, mais elle fait croire.' },
    { id: 'voile_d_oreth', name: 'Voile d\'Oreth', slot: 'cape', level: 12, profile: { agi: 45, sagesse: 35, vita: 20 }, source: 'craft',
      lore: 'Un brin d\'Oreth tissé dans des plumes de Kavou. Il luit au crépuscule, et tout le monde demande où on l\'a trouvé.' },
    { id: 'manteau_de_cuir', name: 'Manteau de Cuir', slot: 'cape', level: 8, profile: { vita: 50, force: 50 }, source: 'craft',
      lore: 'Du cuir de Grouk cousu double. Il protège, il pèse, il sent le Grouk.' },
    { id: 'voile_de_cire', name: 'Voile de Cire', slot: 'cape', level: 13, profile: { sagesse: 60, vita: 40 }, source: 'craft',
      lore: 'Un voile tiède qui sent la bougie ; on apprend plus vite dessous.' },
    { id: 'cape_d_ecailles', name: 'Cape d\'Écailles', slot: 'cape', level: 17, profile: { chance: 50, force: 30, vita: 20 }, source: 'craft',
      lore: 'Des écailles de Brimbe sur du cuir. Elle cliquette quand on court.' },
    { id: 'manteau_de_scorie', name: 'Manteau de Scorie', slot: 'cape', level: 22, profile: { force: 40, intel: 40, vita: 20 }, source: 'craft',
      lore: 'Souple comme du cuir, chaud comme une forge. À éviter en été.' },
    { id: 'cape_de_suie', name: 'Cape de Suie', slot: 'cape', level: 26, profile: { agi: 50, intel: 30, vita: 20 }, source: 'drop', from: 'fumerolle',
      lore: 'Noire et légère ; elle tache tout, sauf la réputation.' },

    // --- Amulettes ---
    { id: 'amulette_de_bec', name: 'Amulette de Bec', slot: 'amulette', level: 5, profile: { agi: 50, chance: 30, vita: 20 }, source: 'craft',
      lore: 'Un bec de Glym sur une ficelle. Il pointe toujours vers le prochain repas.' },
    { id: 'pendentif_de_meche', name: 'Pendentif de Mèche', slot: 'amulette', level: 10, profile: { intel: 50, sagesse: 50 }, source: 'craft',
      lore: 'Une mèche de Veilloche dans un écrin de cire. Elle éclaire le dedans.' },
    { id: 'amulette_de_galet', name: 'Amulette de Galet', slot: 'amulette', level: 15, profile: { force: 50, chance: 50 }, source: 'craft',
      lore: 'Un galet de Brimbe poli par des années de lancers. Il connaît la trajectoire.' },
    { id: 'collier_de_mousse', name: 'Collier de Mousse', slot: 'amulette', level: 20, profile: { vita: 60, sagesse: 40 }, source: 'craft',
      lore: 'De la mousse de Molh tressée. Elle pousse encore un peu, doucement.' },
    { id: 'amulette_du_col', name: 'Amulette du Col', slot: 'amulette', level: 24, profile: { force: 45, vita: 40, sagesse: 15 }, source: 'craft',
      lore: 'Un éclat du cœur de Korvath serti dans de la glaise cuite. Lourde, et celui qui la porte ne recule plus.' },
    { id: 'amulette_de_vapeur', name: 'Amulette de Vapeur', slot: 'amulette', level: 25, profile: { intel: 50, agi: 50 }, source: 'craft',
      lore: 'Une fiole de vapeur de Fumerolle. Elle tourne, et vous aussi.' },
    { id: 'collier_de_noyau', name: 'Collier de Noyau', slot: 'amulette', level: 29, profile: { chance: 50, intel: 30, vita: 20 }, source: 'drop', from: 'cendrou',
      lore: 'Un noyau de Cendrou serti de fer. Il chauffe quand la chance tourne.' },

    // --- Anneaux ---
    { id: 'anneau_de_corne', name: 'Anneau de Corne', slot: 'anneau', level: 6, profile: { force: 70, vita: 30 }, source: 'craft',
      lore: 'Un bout de corne de Grouk, évidé et poli. On serre le poing plus fort.' },
    { id: 'anneau_de_veille', name: 'Anneau de Veille', slot: 'anneau', level: 8, profile: { intel: 70, vita: 30 }, source: 'craft',
      lore: 'De la cire durcie autour d\'un brin d\'herbe de veille. Il réchauffe les sorts.' },
    { id: 'anneau_de_venin', name: 'Anneau de Venin', slot: 'anneau', level: 11, profile: { chance: 60, agi: 40 }, source: 'craft',
      lore: 'Une goutte de venin sous verre. Elle n\'engourdit que les adversaires, en principe.' },
    { id: 'anneau_de_calcaire', name: 'Anneau de Calcaire', slot: 'anneau', level: 17, profile: { vita: 50, sagesse: 50 }, source: 'craft',
      lore: 'Taillé dans la pierre blanche. Il rappelle qu\'il faut tenir, et apprendre.' },
    { id: 'anneau_de_poing', name: 'Anneau de Poing', slot: 'anneau', level: 23, profile: { force: 60, intel: 40 }, source: 'craft',
      lore: 'Forgé dans un poing de Rakthul. Il n\'a jamais appris à s\'ouvrir.' },
    { id: 'anneau_de_lichen', name: 'Anneau de Lichen', slot: 'anneau', level: 27, profile: { chance: 50, force: 50 }, source: 'craft',
      lore: 'Du lichen de scorie pris dans le basalte. Ça pousse sur tout, même sur la chance.' },
    { id: 'anneau_d_etincelle', name: 'Anneau d\'Étincelle', slot: 'anneau', level: 30, profile: { agi: 50, intel: 50 }, source: 'drop', from: 'pioche_vive',
      lore: 'Une étincelle de Pioche-Vive court tout autour. Elle ne s\'arrête jamais.' },

    // --- Ceintures ---
    { id: 'ceinture_de_plume', name: 'Ceinture de Plume', slot: 'ceinture', level: 3, profile: { agi: 60, vita: 40 }, source: 'craft',
      lore: 'Des plumes tressées sur une ficelle. Elle tient, et elle allège.' },
    { id: 'ceinture_de_cire', name: 'Ceinture de Cire', slot: 'ceinture', level: 12, profile: { sagesse: 50, intel: 30, vita: 20 }, source: 'craft',
      lore: 'Souple à la chaleur du corps. Elle apprend la forme de celui qui la porte.' },
    { id: 'ceinture_de_cuir_epais', name: 'Ceinture de Cuir Épais', slot: 'ceinture', level: 19, profile: { vita: 60, force: 40 }, source: 'craft',
      lore: 'Trois épaisseurs de cuir de Grouk. Elle tient le ventre et le reste.' },
    { id: 'ceinture_de_suie', name: 'Ceinture de Suie', slot: 'ceinture', level: 26, profile: { chance: 50, agi: 50 }, source: 'craft',
      lore: 'Noire, légère, elle glisse d\'un côté à l\'autre, comme sa Fumerolle.' },
    { id: 'ceinture_de_charbon', name: 'Ceinture de Charbon', slot: 'ceinture', level: 29, profile: { intel: 50, vita: 50 }, source: 'craft',
      lore: 'Des blocs de charbon montés sur cuir. Elle tient chaud trois jours de suite.' },

    // --- Bottes ---
    { id: 'sandales_de_duvet', name: 'Sandales de Duvet', slot: 'bottes', level: 2, profile: { agi: 50, vita: 50 }, source: 'craft',
      lore: 'Du duvet et de la ficelle. On marche sur un nuage qui aurait des trous.' },
    { id: 'bottes_de_cuir', name: 'Bottes de Cuir', slot: 'bottes', level: 7, profile: { force: 50, vita: 50 }, source: 'drop', from: 'grouk',
      lore: 'Des bottes de Grouk, enfin, de cuir de Grouk. Elles chargent presque toutes seules.' },
    { id: 'bottes_de_soie', name: 'Bottes de Soie', slot: 'bottes', level: 12, profile: { chance: 60, agi: 40 }, source: 'craft',
      lore: 'Si fines qu\'on sent les cailloux. Si légères qu\'on ne les sent pas longtemps.' },
    { id: 'bottes_de_basalte', name: 'Bottes de Basalte', slot: 'bottes', level: 21, profile: { force: 50, vita: 50 }, source: 'craft',
      lore: 'Semelles de roche noire. Chaque pas est un argument.' },
    { id: 'bottes_de_fer_vif', name: 'Bottes de Fer Vif', slot: 'bottes', level: 28, profile: { agi: 60, chance: 40 }, source: 'craft',
      lore: 'Le fer frémit à chaque pas et vous pousse en avant. Difficile de rester en place.' },
  );

  // =====================================================================
  // 4. Armes
  // =====================================================================
  // Huit types, trois paliers chacun : niveaux 2 à 5 (Volière, Sentier), 12 à 16 (Toiles, Éboulis), 24 à 28 (Kaldum).

  C.weapons.push(
    // --- Épées (1 PA de plus, portée 1) ---
    { id: 'lame_de_cime', name: 'Lame de Cime', type: 'epee', level: 3, element: 'air', profile: { agi: 60, vita: 40 }, source: 'craft',
      lore: 'Une lame de bois de cime durcie au feu. Elle siffle plus qu\'elle ne coupe, mais elle siffle bien.' },
    { id: 'lame_de_galet', name: 'Lame de Galet', type: 'epee', level: 14, element: 'terre', profile: { force: 60, vita: 40 }, source: 'craft',
      lore: 'Du galet de Brimbe taillé en tranchant. Lourde, nette, sans surprise.' },
    { id: 'lame_de_scorie', name: 'Lame de Scorie', type: 'epee', level: 26, element: 'feu', profile: { intel: 50, force: 30, vita: 20 }, source: 'craft',
      lore: 'Forgée dans la scorie de Rakthul ; le tranchant reste chaud toute la journée.' },

    // --- Dagues (deux coups) ---
    { id: 'dagues_de_bec', name: 'Dagues de Bec', type: 'dague', level: 2, element: 'air', profile: { agi: 70, vita: 30 }, source: 'drop', from: 'pilou',
      lore: 'Deux becs de Glym sur des manches de bois. Elles pincent deux fois.' },
    { id: 'dagues_de_venin', name: 'Dagues de Venin', type: 'dague', level: 13, element: 'eau', profile: { chance: 60, agi: 40 }, source: 'craft',
      lore: 'Trempées dans le venin de Tissefil. La première engourdit, la seconde décide.' },
    { id: 'dagues_de_suie', name: 'Dagues de Suie', type: 'dague', level: 25, element: 'feu', profile: { intel: 50, agi: 50 }, source: 'drop', from: 'fumerolle',
      lore: 'On ne les voit pas venir, et après, on ne voit plus grand-chose.' },

    // --- Arcs (portée 2 à 6) ---
    { id: 'arc_de_cime', name: 'Arc de Cime', type: 'arc', level: 4, element: 'air', profile: { agi: 60, vita: 40 }, source: 'craft',
      lore: 'Bois de cime et corde de plumes tressées. Il tire droit si on le laisse faire.' },
    { id: 'arc_de_corne', name: 'Arc de Corne', type: 'arc', level: 15, element: 'terre', profile: { force: 60, agi: 40 }, source: 'craft',
      lore: 'Deux cornes de Grouk pour les branches. Il faut des bras, puis ça part loin.' },
    { id: 'arc_de_vapeur', name: 'Arc de Vapeur', type: 'arc', level: 22, element: 'air', profile: { agi: 60, vita: 40 }, source: 'craft',
      lore: 'La corde est un fil de vapeur tenu par deux crochets de cuivre. Elle siffle avant que la flèche parte.' },
    { id: 'arc_de_fer_vif', name: 'Arc de Fer Vif', type: 'arc', level: 27, element: 'eau', profile: { chance: 60, agi: 40 }, source: 'craft',
      lore: 'Le fer vif tend la corde tout seul. L\'archer n\'a plus qu\'à viser, et parfois pas.' },

    // --- Baguettes (portée 1 à 5) ---
    { id: 'baguette_de_duvet', name: 'Baguette de Duvet', type: 'baguette', level: 3, element: 'eau', profile: { chance: 60, vita: 40 }, source: 'craft',
      lore: 'Une tige de bois de cime emplumée de duvet. Les premiers sorts partent de là.' },
    { id: 'baguette_de_meche', name: 'Baguette de Mèche', type: 'baguette', level: 12, element: 'feu', profile: { intel: 60, sagesse: 40 }, source: 'craft',
      lore: 'Une mèche de Veilloche au bout d\'un bois noueux. Elle éclaire et elle brûle.' },
    { id: 'baguette_de_braise', name: 'Baguette de Braise', type: 'baguette', level: 24, element: 'feu', profile: { intel: 70, vita: 30 }, source: 'craft',
      lore: 'Une braise de Rakthul sertie dans la scorie. Les sorts en sortent déjà chauds.' },

    // --- Bâtons (portée 1 à 2, zone croix) ---
    { id: 'baton_de_cime', name: 'Bâton de Cime', type: 'baton', level: 5, element: 'terre', profile: { force: 50, vita: 50 }, source: 'craft',
      lore: 'Un bâton de bois noueux, lourd au bout. Il frappe en croix et en silence.' },
    { id: 'baton_de_cire', name: 'Bâton de Cire', type: 'baton', level: 13, element: 'feu', profile: { intel: 50, sagesse: 30, vita: 20 }, source: 'craft',
      lore: 'Du bois noueux gainé de cire de Veilloche. Il réchauffe les mains et les alliés.' },
    { id: 'baton_de_lichen', name: 'Bâton de Lichen', type: 'baton', level: 26, element: 'eau', profile: { chance: 60, sagesse: 40 }, source: 'craft',
      lore: 'Un manche de Pioche-Vive couvert de lichen. Il pousse encore un peu chaque nuit.' },

    // --- Marteaux (zone croix au contact) ---
    { id: 'masse_de_calcaire', name: 'Masse de Calcaire', type: 'marteau', level: 5, element: 'terre', profile: { force: 60, vita: 40 }, source: 'craft',
      lore: 'Un bloc de calcaire sur un manche de bois noueux. Simple, lourd, efficace.' },
    { id: 'marteau_de_corne', name: 'Marteau de Corne', type: 'marteau', level: 16, element: 'terre', profile: { force: 70, vita: 30 }, source: 'craft',
      lore: 'Une tête de corne de Grouk. Il cogne en croix, comme la bête.' },
    { id: 'marteau_de_forge', name: 'Marteau de Forge', type: 'marteau', level: 28, element: 'feu', profile: { intel: 40, force: 40, vita: 20 }, source: 'craft',
      lore: 'Reforgé avec le marteau de Dorm lui-même. Il résonne à chaque coup, et le sol aussi.' },

    // --- Pelles (portée 1, vole des PV) ---
    { id: 'pelle_noueuse', name: 'Pelle Noueuse', type: 'pelle', level: 4, element: 'terre', profile: { force: 50, vita: 50 }, source: 'craft',
      lore: 'Du bois noueux et une lame de calcaire. Elle creuse les trous et les PV.' },
    { id: 'pelle_de_brimbe', name: 'Pelle de Brimbe', type: 'pelle', level: 14, element: 'eau', profile: { chance: 60, vita: 40 }, source: 'drop', from: 'brimbe',
      lore: 'Une écaille de Brimbe sur un manche. Elle racle le sol et vole ce qui traîne.' },
    { id: 'pelle_de_basalte', name: 'Pelle de Basalte', type: 'pelle', level: 26, element: 'terre', profile: { force: 50, chance: 30, vita: 20 }, source: 'craft',
      lore: 'Une lame de basalte noir. Elle prend aux autres ce qu\'elle vous rend.' },

    // --- Haches (portée 1, gros coup) ---
    { id: 'hache_de_cime', name: 'Hache de Cime', type: 'hache', level: 5, element: 'terre', profile: { force: 70, vita: 30 }, source: 'craft',
      lore: 'Du calcaire sur du bois de cime. Un coup, un gros, et on en reparle.' },
    { id: 'hache_de_croc', name: 'Hache de Croc', type: 'hache', level: 15, element: 'air', profile: { agi: 50, force: 50 }, source: 'craft',
      lore: 'Un croc de Grouk en guise de tranchant. Elle mord plus qu\'elle ne coupe.' },
    { id: 'lames_de_brume', name: 'Lames de Brume', type: 'dague', level: 28, element: 'air', profile: { agi: 70, vita: 30 }, source: 'drop', from: 'fumerolle_noire',
      lore: 'Deux lames grises qu\'une Fumerolle Noire laisse en se dissipant. Elles ne pèsent rien et ne font pas de bruit.' },
    { id: 'hache_de_kaldrik', name: 'Hache de Rakthul', type: 'hache', level: 25, element: 'feu', profile: { intel: 50, force: 50 }, source: 'drop', from: 'kaldrik',
      lore: 'Un poing de Rakthul aplati en lame. Elle fond un peu à chaque coup, et la cible aussi.' },
  );

  // =====================================================================
  // 5. Consommables
  // =====================================================================
  // La Potion de Relais ne soigne pas : « effect: 'relais' » dit au moteur qu'elle ramène au Relais du Fil.

  C.consumables.push(
    { id: 'pain_de_cime', name: 'Pain de Cime', kind: 'pain', level: 1, heal: 30, price: 6,
      lore: 'Pain blanc d\'Orsane, à l\'herbe de veille. Il tient dans la poche et dans le ventre.' },
    { id: 'pain_de_grouk', name: 'Pain de Grouk', kind: 'pain', level: 8, heal: 70, price: 14,
      lore: 'Pain dense, à la corne râpée. Les Grouks en mangent, dit-on. Les Veilleurs aussi.' },
    { id: 'pain_de_scorie', name: 'Pain de Scorie', kind: 'pain', level: 18, heal: 140, price: 28,
      lore: 'Pain noir au lichen de scorie. Amer, chaud, et il remet debout.' },
    { id: 'pain_de_forge', name: 'Pain de Forge', kind: 'pain', level: 26, heal: 220, price: 44,
      lore: 'Cuit sur une enclume de Kaldum. Croûte de charbon, cœur tendre, et l\'effet d\'une sieste.' },
    // Parchemins de caractéristique : +5 de base, gratuits, 50 au plus par caractéristique.
    { id: 'parchemin_terra', name: 'Parchemin de Terra', kind: 'parchemin', stat: 'force', value: 5, level: 10, price: 120,
      lore: 'Un vélin poussiéreux couvert de traits de mine. On le lit à voix basse, et les épaules s\'élargissent.' },
    { id: 'parchemin_ignis', name: 'Parchemin d\'Ignis', kind: 'parchemin', stat: 'intel', value: 5, level: 10, price: 120,
      lore: 'L\'encre est encore tiède. Les lettres se consument au fil de la lecture.' },
    { id: 'parchemin_aqua', name: 'Parchemin d\'Aqua', kind: 'parchemin', stat: 'chance', value: 5, level: 10, price: 120,
      lore: 'Écrit à l\'eau de mare sur une feuille qui ne sèche jamais.' },
    { id: 'parchemin_aer', name: 'Parchemin d\'Aer', kind: 'parchemin', stat: 'agi', value: 5, level: 10, price: 120,
      lore: 'Si léger qu\'il faut le tenir à deux mains pour qu\'il ne s\'envole pas.' },
    { id: 'parchemin_vitalite', name: 'Parchemin de Vitalité', kind: 'parchemin', stat: 'vita', value: 5, level: 10, price: 120,
      lore: 'Une recette de pain, en vérité. Mais elle marche.' },
    { id: 'parchemin_sagesse', name: 'Parchemin de Sagesse', kind: 'parchemin', stat: 'sagesse', value: 5, level: 10, price: 120,
      lore: 'Les marges sont pleines de remarques. Ce sont elles qui comptent.' },
    { id: 'potion_de_relais', name: 'Potion de Relais', kind: 'potion', level: 1, heal: 0, effect: 'relais', price: 15,
      lore: 'Un fil blanc dans une fiole. On la boit, on tire, on se retrouve au Relais.' },
    { id: 'potion_de_veille', name: 'Potion de Veille', kind: 'potion', level: 15, heal: 999, price: 60,
      lore: 'Lueur de Veilloche et herbe de veille. Elle rend tous les PV et un peu de courage.' },
  );

  // =====================================================================
  // 6. Recettes
  // =====================================================================
  // Ateliers : tailleur (coiffe, cape), cordonnier (bottes, ceinture), bijoutier (amulette, anneau),
  // forgeron (armes), alchimiste (pains, potions). Une recette par pièce de panoplie, par objet et arme
  // de source craft, par pain et par potion. Le total de ressources monte avec le niveau : 6 au niveau 1, 20 au niveau 30.
  const R = (result, workshop, pairs, count) => C.recipes.push({
    result, count: count || 1, workshop,
    ingredients: pairs.map(([id, n]) => ({ id, count: n })),
  });

  // --- Panoplie du Marcheur (1) ---
  R('coiffe_marcheur', 'tailleur', [['plume_de_pilou', 3], ['herbe_de_veille', 2], ['bois_de_cime', 1]]);
  R('cape_marcheur', 'tailleur', [['plume_de_pilou', 4], ['herbe_de_veille', 2]]);
  R('amulette_marcheur', 'bijoutier', [['pierre_de_calcaire', 3], ['plume_de_pilou', 2], ['herbe_de_veille', 1]]);
  R('ceinture_marcheur', 'cordonnier', [['herbe_de_veille', 3], ['bois_de_cime', 2], ['plume_de_pilou', 1]]);
  R('bottes_marcheur', 'cordonnier', [['plume_de_pilou', 3], ['bois_de_cime', 2], ['herbe_de_veille', 1]]);

  // --- Panoplie du Glym (3) ---
  R('coiffe_pilou', 'tailleur', [['plume_de_pilou', 5], ['duvet_de_pilou', 1], ['herbe_de_veille', 1]]);
  R('cape_pilou', 'tailleur', [['plume_de_pilou', 6], ['duvet_de_pilou', 1]]);
  R('amulette_pilou', 'bijoutier', [['bec_de_pilou', 2], ['plume_de_pilou', 3], ['pierre_de_calcaire', 2]]);
  R('anneau_pilou', 'bijoutier', [['bec_de_pilou', 2], ['duvet_de_pilou', 1], ['pierre_de_calcaire', 3], ['plume_de_pilou', 1]]);
  R('bottes_pilou', 'cordonnier', [['plume_de_pilou', 4], ['duvet_de_pilou', 1], ['bois_de_cime', 2]]);

  // --- Panoplie du Grouk (6) ---
  R('coiffe_grouk', 'tailleur', [['cuir_de_grouk', 5], ['corne_de_grouk', 2], ['plume_de_pilou', 2]]);
  R('cape_grouk', 'tailleur', [['cuir_de_grouk', 7], ['corne_de_grouk', 1], ['herbe_de_veille', 1]]);
  R('amulette_grouk', 'bijoutier', [['croc_de_grouk', 1], ['corne_de_grouk', 2], ['cuir_de_grouk', 3], ['pierre_de_calcaire', 3]]);
  R('ceinture_grouk', 'cordonnier', [['cuir_de_grouk', 6], ['corne_de_grouk', 2], ['bois_noueux', 1]]);
  R('bottes_grouk', 'cordonnier', [['cuir_de_grouk', 6], ['corne_de_grouk', 1], ['bois_noueux', 2]]);

  // --- Panoplie du Tissefil (9) ---
  R('coiffe_tissefil', 'tailleur', [['soie_de_tissefil', 6], ['patte_de_tissefil', 2], ['plume_de_pilou', 2]]);
  R('cape_tissefil', 'tailleur', [['soie_de_tissefil', 7], ['patte_de_tissefil', 2], ['venin_de_tissefil', 1]]);
  R('amulette_tissefil', 'bijoutier', [['venin_de_tissefil', 1], ['soie_de_tissefil', 4], ['patte_de_tissefil', 2], ['pierre_de_calcaire', 3]]);
  R('anneau_tissefil', 'bijoutier', [['soie_de_tissefil', 5], ['patte_de_tissefil', 3], ['venin_de_tissefil', 1], ['pierre_de_calcaire', 1]]);
  R('ceinture_tissefil', 'cordonnier', [['soie_de_tissefil', 5], ['cuir_de_grouk', 3], ['patte_de_tissefil', 2]]);
  R('bottes_tissefil', 'cordonnier', [['soie_de_tissefil', 6], ['patte_de_tissefil', 2], ['bois_noueux', 2]]);

  // --- Panoplie de la Veilloche (12) ---
  R('coiffe_veilloche', 'tailleur', [['cire_de_veilloche', 7], ['meche_de_veilloche', 3], ['soie_de_tissefil', 2]]);
  R('cape_veilloche', 'tailleur', [['cire_de_veilloche', 8], ['meche_de_veilloche', 2], ['soie_de_tissefil', 2]]);
  R('amulette_veilloche', 'bijoutier', [['lueur_de_veilloche', 1], ['cire_de_veilloche', 5], ['meche_de_veilloche', 3], ['pierre_de_calcaire', 3]]);
  R('anneau_veilloche', 'bijoutier', [['cire_de_veilloche', 6], ['meche_de_veilloche', 3], ['lueur_de_veilloche', 1], ['pierre_de_calcaire', 2]]);
  R('bottes_veilloche', 'cordonnier', [['cire_de_veilloche', 6], ['meche_de_veilloche', 2], ['cuir_de_grouk', 4]]);

  // --- Panoplie de la Brimbe (14) ---
  R('coiffe_brimbe', 'tailleur', [['ecaille_de_brimbe', 4], ['galet_de_brimbe', 6], ['oeil_de_brimbe', 1], ['cuir_de_grouk', 2]]);
  R('cape_brimbe', 'tailleur', [['ecaille_de_brimbe', 5], ['cuir_de_grouk', 5], ['galet_de_brimbe', 3]]);
  R('amulette_brimbe', 'bijoutier', [['galet_de_brimbe', 7], ['oeil_de_brimbe', 1], ['ecaille_de_brimbe', 2], ['pierre_de_calcaire', 3]]);
  R('ceinture_brimbe', 'cordonnier', [['galet_de_brimbe', 6], ['cuir_de_grouk', 4], ['ecaille_de_brimbe', 3]]);
  R('bottes_brimbe', 'cordonnier', [['ecaille_de_brimbe', 4], ['galet_de_brimbe', 5], ['cuir_de_grouk', 3], ['bois_noueux', 1]]);

  // --- Panoplie du Grand Grouk (18) ---
  R('coiffe_grand_grouk', 'tailleur', [['peau_du_grand_grouk', 1], ['crocs_du_grand_grouk', 1], ['cuir_de_grouk', 8], ['corne_de_grouk', 4]]);
  R('cape_grand_grouk', 'tailleur', [['peau_du_grand_grouk', 2], ['cuir_de_grouk', 9], ['corne_de_grouk', 3]]);
  R('amulette_grand_grouk', 'bijoutier', [['crocs_du_grand_grouk', 1], ['corne_de_grouk', 5], ['croc_de_grouk', 2], ['pierre_de_calcaire', 6]]);
  R('anneau_grand_grouk', 'bijoutier', [['crocs_du_grand_grouk', 1], ['corne_de_grouk', 6], ['croc_de_grouk', 1], ['pierre_de_calcaire', 6]]);
  R('ceinture_grand_grouk', 'cordonnier', [['peau_du_grand_grouk', 1], ['cuir_de_grouk', 9], ['corne_de_grouk', 4]]);
  R('bottes_grand_grouk', 'cordonnier', [['peau_du_grand_grouk', 1], ['cuir_de_grouk', 8], ['bois_noueux', 3], ['corne_de_grouk', 2]]);

  // --- Panoplie du Molh (21) ---
  R('coiffe_molh', 'tailleur', [['pierre_de_molh', 8], ['mousse_de_molh', 4], ['basalte_de_kaldum', 3]]);
  R('cape_molh', 'tailleur', [['mousse_de_molh', 8], ['pierre_de_molh', 5], ['lichen_de_scorie', 2]]);
  R('amulette_molh', 'bijoutier', [['coeur_de_molh', 1], ['pierre_de_molh', 7], ['mousse_de_molh', 3], ['basalte_de_kaldum', 4]]);
  R('ceinture_molh', 'cordonnier', [['pierre_de_molh', 7], ['mousse_de_molh', 4], ['cuir_de_grouk', 4]]);
  R('bottes_molh', 'cordonnier', [['pierre_de_molh', 8], ['basalte_de_kaldum', 4], ['mousse_de_molh', 3]]);

  // --- Panoplie du Rakthul (23) ---
  R('coiffe_kaldrik', 'tailleur', [['scorie_de_kaldrik', 9], ['poing_de_kaldrik', 3], ['pierre_de_molh', 4]]);
  R('cape_kaldrik', 'tailleur', [['scorie_de_kaldrik', 10], ['poing_de_kaldrik', 2], ['mousse_de_molh', 4]]);
  R('amulette_kaldrik', 'bijoutier', [['braise_de_kaldrik', 1], ['scorie_de_kaldrik', 7], ['poing_de_kaldrik', 3], ['basalte_de_kaldum', 5]]);
  R('ceinture_kaldrik', 'cordonnier', [['scorie_de_kaldrik', 8], ['poing_de_kaldrik', 3], ['pierre_de_molh', 5]]);
  R('bottes_kaldrik', 'cordonnier', [['scorie_de_kaldrik', 8], ['poing_de_kaldrik', 2], ['basalte_de_kaldum', 6]]);

  // --- Panoplie de la Fumerolle (25) ---
  R('coiffe_fumerolle', 'tailleur', [['vapeur_de_fumerolle', 9], ['suie_de_fumerolle', 4], ['souffle_de_fumerolle', 1], ['scorie_de_kaldrik', 3]]);
  R('cape_fumerolle', 'tailleur', [['vapeur_de_fumerolle', 10], ['suie_de_fumerolle', 5], ['scorie_de_kaldrik', 2]]);
  R('amulette_fumerolle', 'bijoutier', [['souffle_de_fumerolle', 1], ['vapeur_de_fumerolle', 8], ['suie_de_fumerolle', 3], ['basalte_de_kaldum', 5]]);
  R('anneau_fumerolle', 'bijoutier', [['vapeur_de_fumerolle', 8], ['suie_de_fumerolle', 4], ['souffle_de_fumerolle', 1], ['basalte_de_kaldum', 4]]);
  R('bottes_fumerolle', 'cordonnier', [['suie_de_fumerolle', 5], ['vapeur_de_fumerolle', 7], ['scorie_de_kaldrik', 5]]);

  // --- Panoplie de la Pioche-Vive (27) ---
  R('coiffe_pioche_vive', 'tailleur', [['fer_de_pioche_vive', 9], ['manche_de_pioche_vive', 3], ['vapeur_de_fumerolle', 6]]);
  R('cape_pioche_vive', 'tailleur', [['fer_de_pioche_vive', 8], ['manche_de_pioche_vive', 4], ['scorie_de_kaldrik', 6]]);
  R('amulette_pioche_vive', 'bijoutier', [['etincelle_de_pioche_vive', 1], ['fer_de_pioche_vive', 9], ['manche_de_pioche_vive', 3], ['basalte_de_kaldum', 5]]);
  R('anneau_pioche_vive', 'bijoutier', [['fer_de_pioche_vive', 10], ['etincelle_de_pioche_vive', 1], ['manche_de_pioche_vive', 2], ['basalte_de_kaldum', 5]]);
  R('ceinture_pioche_vive', 'cordonnier', [['manche_de_pioche_vive', 4], ['fer_de_pioche_vive', 8], ['scorie_de_kaldrik', 6]]);
  R('bottes_pioche_vive', 'cordonnier', [['fer_de_pioche_vive', 8], ['manche_de_pioche_vive', 4], ['basalte_de_kaldum', 6]]);

  // --- Panoplie du Cendrou (29) ---
  R('coiffe_cendrou', 'tailleur', [['charbon_de_cendrou', 5], ['cendre_de_cendrou', 10], ['noyau_de_cendrou', 1], ['vapeur_de_fumerolle', 3]]);
  R('cape_cendrou', 'tailleur', [['cendre_de_cendrou', 11], ['charbon_de_cendrou', 5], ['suie_de_fumerolle', 3]]);
  R('amulette_cendrou', 'bijoutier', [['noyau_de_cendrou', 1], ['charbon_de_cendrou', 6], ['cendre_de_cendrou', 7], ['basalte_de_kaldum', 5]]);
  R('anneau_cendrou', 'bijoutier', [['charbon_de_cendrou', 6], ['cendre_de_cendrou', 8], ['noyau_de_cendrou', 1], ['basalte_de_kaldum', 4]]);
  R('bottes_cendrou', 'cordonnier', [['charbon_de_cendrou', 5], ['cendre_de_cendrou', 8], ['scorie_de_kaldrik', 6]]);

  // --- Panoplie de Dorm (30) ---
  R('coiffe_dorm', 'tailleur', [['marteau_de_dorm', 1], ['enclume_de_dorm', 1], ['fer_de_pioche_vive', 10], ['charbon_de_cendrou', 8]]);
  R('cape_dorm', 'tailleur', [['enclume_de_dorm', 1], ['fer_de_pioche_vive', 9], ['cendre_de_cendrou', 10]]);
  R('amulette_dorm', 'bijoutier', [['enclume_de_dorm', 1], ['marteau_de_dorm', 1], ['fer_de_pioche_vive', 10], ['basalte_de_kaldum', 8]]);
  R('anneau_dorm', 'bijoutier', [['marteau_de_dorm', 1], ['enclume_de_dorm', 1], ['fer_de_pioche_vive', 10], ['basalte_de_kaldum', 8]]);
  R('ceinture_dorm', 'cordonnier', [['marteau_de_dorm', 1], ['fer_de_pioche_vive', 9], ['scorie_de_kaldrik', 10]]);
  R('bottes_dorm', 'cordonnier', [['enclume_de_dorm', 1], ['fer_de_pioche_vive', 9], ['basalte_de_kaldum', 10]]);

  // --- Objets hors panoplie, source craft ---
  R('capuche_de_soie', 'tailleur', [['soie_de_tissefil', 7], ['patte_de_tissefil', 2], ['plume_de_pilou', 2]]);
  R('heaume_de_calcaire', 'tailleur', [['pierre_de_calcaire', 8], ['cuir_de_grouk', 4], ['ecaille_de_brimbe', 2]]);
  R('capuche_de_lichen', 'tailleur', [['lichen_de_scorie', 7], ['mousse_de_molh', 4], ['pierre_de_molh', 3], ['coeur_de_molh', 1]]);
  R('couronne_de_braise', 'tailleur', [['braise_de_kaldrik', 1], ['scorie_de_kaldrik', 9], ['poing_de_kaldrik', 3], ['lichen_de_scorie', 3]]);
  R('cape_de_plumes', 'tailleur', [['plume_de_pilou', 6], ['duvet_de_pilou', 1], ['herbe_de_veille', 1]]);
  R('voile_d_oreth', 'tailleur', [['brin_d_oreth', 1], ['plume_de_kavou', 6], ['soie_de_tissefil', 4], ['herbe_de_veille', 2]]);
  R('manteau_de_cuir', 'tailleur', [['cuir_de_grouk', 7], ['corne_de_grouk', 1], ['plume_de_pilou', 2]]);
  R('voile_de_cire', 'tailleur', [['cire_de_veilloche', 8], ['meche_de_veilloche', 2], ['soie_de_tissefil', 2]]);
  R('cape_d_ecailles', 'tailleur', [['ecaille_de_brimbe', 5], ['cuir_de_grouk', 6], ['galet_de_brimbe', 3]]);
  R('manteau_de_scorie', 'tailleur', [['scorie_de_kaldrik', 8], ['mousse_de_molh', 5], ['poing_de_kaldrik', 2]]);
  R('amulette_de_bec', 'bijoutier', [['bec_de_pilou', 3], ['plume_de_pilou', 3], ['pierre_de_calcaire', 2]]);
  R('pendentif_de_meche', 'bijoutier', [['meche_de_veilloche', 3], ['cire_de_veilloche', 5], ['pierre_de_calcaire', 3]]);
  R('amulette_de_galet', 'bijoutier', [['galet_de_brimbe', 8], ['ecaille_de_brimbe', 2], ['corne_de_grouk', 2], ['pierre_de_calcaire', 2]]);
  R('collier_de_mousse', 'bijoutier', [['mousse_de_molh', 5], ['pierre_de_molh', 6], ['basalte_de_kaldum', 4]]);
  R('amulette_du_col', 'bijoutier', [['coeur_de_col', 1], ['argile_de_thelk', 6], ['galet_de_brimbe', 6], ['basalte_de_kaldum', 4]]);
  R('amulette_de_vapeur', 'bijoutier', [['vapeur_de_fumerolle', 9], ['suie_de_fumerolle', 3], ['souffle_de_fumerolle', 1], ['basalte_de_kaldum', 4]]);
  R('anneau_de_corne', 'bijoutier', [['corne_de_grouk', 3], ['cuir_de_grouk', 3], ['pierre_de_calcaire', 3]]);
  R('anneau_de_veille', 'bijoutier', [['cire_de_veilloche', 4], ['herbe_de_veille', 3], ['pierre_de_calcaire', 3]]);
  R('anneau_de_venin', 'bijoutier', [['venin_de_tissefil', 1], ['soie_de_tissefil', 5], ['patte_de_tissefil', 2], ['pierre_de_calcaire', 3]]);
  R('anneau_de_calcaire', 'bijoutier', [['pierre_de_calcaire', 8], ['galet_de_brimbe', 4], ['oeil_de_brimbe', 1], ['meche_de_veilloche', 1]]);
  R('anneau_de_poing', 'bijoutier', [['poing_de_kaldrik', 3], ['scorie_de_kaldrik', 8], ['basalte_de_kaldum', 5]]);
  R('anneau_de_lichen', 'bijoutier', [['lichen_de_scorie', 6], ['basalte_de_kaldum', 6], ['fer_de_pioche_vive', 5], ['manche_de_pioche_vive', 1]]);
  R('ceinture_de_plume', 'cordonnier', [['plume_de_pilou', 5], ['bois_de_cime', 2]]);
  R('ceinture_de_cire', 'cordonnier', [['cire_de_veilloche', 6], ['cuir_de_grouk', 4], ['meche_de_veilloche', 2]]);
  R('ceinture_de_cuir_epais', 'cordonnier', [['cuir_de_grouk', 9], ['corne_de_grouk', 3], ['ecaille_de_brimbe', 3]]);
  R('ceinture_de_suie', 'cordonnier', [['suie_de_fumerolle', 5], ['vapeur_de_fumerolle', 7], ['scorie_de_kaldrik', 5]]);
  R('ceinture_de_charbon', 'cordonnier', [['charbon_de_cendrou', 6], ['cendre_de_cendrou', 8], ['fer_de_pioche_vive', 5]]);
  R('sandales_de_duvet', 'cordonnier', [['duvet_de_pilou', 1], ['plume_de_pilou', 4], ['herbe_de_veille', 1]]);
  R('bottes_de_soie', 'cordonnier', [['soie_de_tissefil', 7], ['patte_de_tissefil', 2], ['cuir_de_grouk', 3]]);
  R('bottes_de_basalte', 'cordonnier', [['basalte_de_kaldum', 7], ['pierre_de_molh', 5], ['mousse_de_molh', 3]]);
  R('bottes_de_fer_vif', 'cordonnier', [['fer_de_pioche_vive', 9], ['manche_de_pioche_vive', 3], ['scorie_de_kaldrik', 6]]);

  // --- Armes, source craft (forgeron) ---
  R('lame_de_cime', 'forgeron', [['bois_de_cime', 4], ['pierre_de_calcaire', 2], ['plume_de_pilou', 1]]);
  // La Clé du Terrier : une par entrée. Le Grand Grouk se mérite, comme sa panoplie.
  R('cle_du_terrier', 'forgeron', [['corne_de_grouk', 4], ['cuir_de_grouk', 6], ['galet_de_brimbe', 5], ['croc_de_grouk', 1]]);
  R('lame_de_galet', 'forgeron', [['galet_de_brimbe', 7], ['bois_noueux', 3], ['ecaille_de_brimbe', 3]]);
  R('lame_de_scorie', 'forgeron', [['scorie_de_kaldrik', 9], ['poing_de_kaldrik', 3], ['basalte_de_kaldum', 5]]);
  R('dagues_de_venin', 'forgeron', [['venin_de_tissefil', 1], ['patte_de_tissefil', 4], ['bois_noueux', 3], ['pierre_de_calcaire', 4]]);
  R('arc_de_cime', 'forgeron', [['bois_de_cime', 4], ['plume_de_pilou', 3], ['bec_de_pilou', 1]]);
  R('arc_de_corne', 'forgeron', [['corne_de_grouk', 4], ['bois_noueux', 5], ['soie_de_tissefil', 4], ['croc_de_grouk', 1]]);
  R('arc_de_fer_vif', 'forgeron', [['fer_de_pioche_vive', 8], ['manche_de_pioche_vive', 3], ['vapeur_de_fumerolle', 6], ['etincelle_de_pioche_vive', 1]]);
  R('baguette_de_duvet', 'forgeron', [['bois_de_cime', 4], ['duvet_de_pilou', 1], ['plume_de_pilou', 2]]);
  R('baguette_de_meche', 'forgeron', [['meche_de_veilloche', 3], ['bois_noueux', 4], ['cire_de_veilloche', 5]]);
  R('baguette_de_braise', 'forgeron', [['braise_de_kaldrik', 1], ['scorie_de_kaldrik', 8], ['poing_de_kaldrik', 3], ['basalte_de_kaldum', 4]]);
  R('baton_de_cime', 'forgeron', [['bois_noueux', 4], ['pierre_de_calcaire', 3], ['cuir_de_grouk', 2]]);
  R('baton_de_cire', 'forgeron', [['bois_noueux', 4], ['cire_de_veilloche', 6], ['meche_de_veilloche', 2]]);
  R('baton_de_lichen', 'forgeron', [['manche_de_pioche_vive', 2], ['lichen_de_scorie', 7], ['basalte_de_kaldum', 5], ['vapeur_de_fumerolle', 3]]);
  R('masse_de_calcaire', 'forgeron', [['pierre_de_calcaire', 5], ['bois_noueux', 3], ['cuir_de_grouk', 1]]);
  R('marteau_de_corne', 'forgeron', [['corne_de_grouk', 5], ['bois_noueux', 4], ['galet_de_brimbe', 4], ['croc_de_grouk', 1]]);
  R('marteau_de_forge', 'forgeron', [['marteau_de_dorm', 1], ['fer_de_pioche_vive', 8], ['charbon_de_cendrou', 5], ['basalte_de_kaldum', 4]]);
  R('pelle_noueuse', 'forgeron', [['bois_noueux', 3], ['pierre_de_calcaire', 4], ['cuir_de_grouk', 1]]);
  R('pelle_de_basalte', 'forgeron', [['basalte_de_kaldum', 8], ['manche_de_pioche_vive', 3], ['scorie_de_kaldrik', 6]]);
  R('hache_de_cime', 'forgeron', [['pierre_de_calcaire', 4], ['bois_de_cime', 3], ['corne_de_grouk', 2]]);
  R('parchemin_terra', 'alchimiste', [['corne_de_grouk', 3], ['galet_de_brimbe', 3], ['pierre_de_molh', 2], ['herbe_de_veille', 2]]);
  R('parchemin_ignis', 'alchimiste', [['meche_de_veilloche', 3], ['braise_de_kaldrik', 2], ['cendre_de_cendrou', 3], ['herbe_de_veille', 2]]);
  R('parchemin_aqua', 'alchimiste', [['ecaille_de_brimbe', 3], ['vapeur_de_fumerolle', 3], ['argile_de_thelk', 2], ['herbe_de_veille', 2]]);
  R('parchemin_aer', 'alchimiste', [['plume_de_pilou', 4], ['plume_de_kavou', 3], ['souffle_de_fumerolle', 2], ['herbe_de_veille', 2]]);
  R('parchemin_vitalite', 'alchimiste', [['cuir_de_grouk', 4], ['mousse_de_molh', 3], ['poil_de_tholou', 2], ['herbe_de_veille', 2]]);
  R('parchemin_sagesse', 'alchimiste', [['soie_de_tissefil', 4], ['lueur_de_veilloche', 2], ['oeil_de_brimbe', 1], ['herbe_de_veille', 2]]);
  R('arc_de_vapeur', 'forgeron', [['vapeur_de_fumerolle', 6], ['basalte_de_kaldum', 4], ['scorie_de_kaldrik', 4], ['suie_de_fumerolle', 2]]);
  R('hache_de_croc', 'forgeron', [['croc_de_grouk', 2], ['bois_noueux', 5], ['ecaille_de_brimbe', 4], ['galet_de_brimbe', 3]]);

  // --- Pains et potions (alchimiste) : une fournée donne plusieurs pains ---
  R('pain_de_cime', 'alchimiste', [['herbe_de_veille', 4], ['plume_de_pilou', 2]], 3);
  R('pain_de_grouk', 'alchimiste', [['herbe_de_veille', 5], ['corne_de_grouk', 1], ['bois_de_cime', 2]], 3);
  R('pain_de_scorie', 'alchimiste', [['lichen_de_scorie', 6], ['mousse_de_molh', 3], ['basalte_de_kaldum', 1]], 3);
  R('pain_de_forge', 'alchimiste', [['lichen_de_scorie', 6], ['charbon_de_cendrou', 3], ['cendre_de_cendrou', 3], ['scorie_de_kaldrik', 2]], 3);
  R('potion_de_relais', 'alchimiste', [['herbe_de_veille', 3], ['plume_de_pilou', 2], ['pierre_de_calcaire', 1]], 2);
  R('potion_de_veille', 'alchimiste', [['lueur_de_veilloche', 1], ['cire_de_veilloche', 4], ['herbe_de_veille', 4], ['meche_de_veilloche', 2]], 1);

  // =====================================================================
  // 7. Thessa et la Lisière, niveaux 31 à 50
  // =====================================================================
  // La suite de l'économie, calquée sur les objets de Dofus du niveau 62 au niveau 100 (un niveau de
  // Veylan en vaut deux, docs/OBJETS-31-50.md) : une panoplie par famille, une de boss, des objets
  // hors panoplie aux niveaux où un élément manque, un quatrième palier d'armes, et deux objets qui
  // donnent un PA ou un PM contre des caractéristiques plus faibles (`extra`, js/items.js).
  // Le niveau maximum reste 30 dans l'alpha : ces objets attendent Thessa et la Lisière.

  // --- Ressources : Thessa, Marsalée ---
  C.resources.push(
    { id: 'aile_de_sivr', name: 'Aile de Sivr', lore: 'Une aile de toile tendue sur deux baleines de cuivre. Elle vibre encore quand le vent passe.',
      drops: [{ monster: 'sivr', rate: 40 }], node: null, price: 9 },
    { id: 'dard_de_sivr', name: 'Dard de Sivr', lore: 'Une pointe de pierre polie comme une aiguille. Les couturières de Marsalée la gardent pour le cuir.',
      drops: [{ monster: 'sivr', rate: 15 }], node: null, price: 17 },
    { id: 'chas_de_sivr', name: 'Chas de Sivr', lore: 'Le trou de l\'aiguille, où brillait la lanterne. Un fil en sort encore, qui ne mène nulle part.',
      drops: [{ monster: 'sivr', rate: 4 }], node: null, price: 42 },

    { id: 'galet_de_marnel', name: 'Galet de Marnel', lore: 'Un morceau de carapace roulé par la mer. Lisse dessus, rugueux dessous, lourd partout.',
      drops: [{ monster: 'marnel', rate: 40 }], node: null, price: 9 },
    { id: 'pince_de_marnel', name: 'Pince de Marnel', lore: 'Elle se referme encore d\'un coup sec si on la touche au mauvais endroit. Il n\'y a pas de bon endroit.',
      drops: [{ monster: 'marnel', rate: 15 }], node: null, price: 18 },
    { id: 'carapace_de_marnel', name: 'Carapace de Marnel', lore: 'Une carapace entière, sombre comme un galet mouillé. Le Marnel l\'a perdue avant de courir, et il a couru.',
      drops: [{ monster: 'marnel', rate: 4 }], node: null, price: 44 },

    { id: 'ecume_de_brisant', name: 'Écume de Brisant', lore: 'Une poignée d\'écume qui ne retombe pas. On la garde en bocal, couvercle serré.',
      drops: [{ monster: 'brisant', rate: 38 }], node: null, price: 10 },
    { id: 'remous_de_brisant', name: 'Remous de Brisant', lore: 'Un petit tourbillon pris dans une fiole. Il tourne toujours dans le même sens, celui de la marée.',
      drops: [{ monster: 'brisant', rate: 15 }], node: null, price: 19 },
    { id: 'coeur_de_brisant', name: 'Cœur de Brisant', lore: 'Le creux de la vague, figé en verre de mer. On y entend le ressac en le portant à l\'oreille.',
      drops: [{ monster: 'brisant', rate: 4 }], node: null, price: 46 },

    { id: 'plume_de_harpide', name: 'Plume de Harpide', lore: 'Blanche, raide, coupante sur la tranche. On la ramasse par le bout.',
      drops: [{ monster: 'harpide', rate: 40 }], node: null, price: 10 },
    { id: 'serre_de_harpide', name: 'Serre de Harpide', lore: 'Trois griffes recourbées. Elles agrippent encore ce qu\'on leur tend, surtout les doigts.',
      drops: [{ monster: 'harpide', rate: 15 }], node: null, price: 20 },
    { id: 'oeil_de_harpide', name: 'Œil de Harpide', lore: 'Un œil pâle qui suit tout ce qui bouge. Il préfère ce qui recule.',
      drops: [{ monster: 'harpide', rate: 4 }], node: null, price: 48 },

    { id: 'corde_de_noye', name: 'Corde de Noyé', lore: 'Un bout de cordage gorgé d\'eau. Il ne sèche jamais, et il serre toujours un peu.',
      drops: [{ monster: 'noye', rate: 38 }], node: null, price: 11 },
    { id: 'perle_de_noye', name: 'Perle de Noyé', lore: 'Une perle grise qui brille de l\'intérieur, comme une lanterne au fond de l\'eau.',
      drops: [{ monster: 'noye', rate: 14 }], node: null, price: 21 },
    { id: 'soupir_de_noye', name: 'Soupir de Noyé', lore: 'La dernière bulle d\'un Noyé, gardée dans du verre. Elle fredonne le chant qui soignait les siens.',
      drops: [{ monster: 'noye', rate: 4 }], node: null, price: 50 },

    { id: 'maree_figee', name: 'Marée figée', lore: 'Une vague prise dans le verre au moment où elle allait tout recouvrir. Elle monte d\'un cheveu chaque nuit.',
      drops: [{ monster: 'mere_des_brisants', rate: 100 }], node: null, price: 75 },
    { id: 'conque_de_la_mere', name: 'Conque de la Mère', lore: 'La conque où la Mère des Brisants appelait la marée. Soufflez dedans et reculez.',
      drops: [{ monster: 'mere_des_brisants', rate: 50 }], node: null, price: 80 },
  );

  // --- Ressources : la Lisière, les Effilures ---
  C.resources.push(
    { id: 'corne_de_vulk', name: 'Corne de Vulk', lore: 'Un tronçon de corne cassée en couronne. Elle sonne comme une cloche fêlée.',
      drops: [{ monster: 'vulk', rate: 40 }], node: null, price: 11 },
    { id: 'pierre_de_vulk', name: 'Pierre de Vulk', lore: 'Un éclat d\'ardoise du dos d\'un Vulk. Il reste chaud là où il touchait la fêlure.',
      drops: [{ monster: 'vulk', rate: 15 }], node: null, price: 21 },
    { id: 'fele_de_vulk', name: 'Fêlure de Vulk', lore: 'Un filet de lumière lilas pris dans la pierre. Personne ne sait ce qui brille au fond.',
      drops: [{ monster: 'vulk', rate: 4 }], node: null, price: 50 },

    { id: 'pique_de_ferrel', name: 'Pique de Ferrel', lore: 'Une pointe jaune et souple. Elle pique, puis elle soigne la piqûre, par politesse.',
      drops: [{ monster: 'ferrel', rate: 38 }], node: null, price: 12 },
    { id: 'lueur_de_ferrel', name: 'Lueur de Ferrel', lore: 'Une petite clarté dorée qui se pose sur les blessures. Elle n\'aime pas rester dans un sac.',
      drops: [{ monster: 'ferrel', rate: 14 }], node: null, price: 22 },
    { id: 'baume_de_ferrel', name: 'Baume de Ferrel', lore: 'Ce qui coule d\'un Ferrel qui a trop soigné. Les Veilleurs se le disputent après chaque meute.',
      drops: [{ monster: 'ferrel', rate: 4 }], node: null, price: 52 },

    { id: 'flammeche_de_zhaal', name: 'Flammèche de Zhaal', lore: 'Une flamme violette pas plus grande qu\'un ongle. Elle brûle sans rien consumer, sauf la patience.',
      drops: [{ monster: 'zhaal', rate: 38 }], node: null, price: 12 },
    { id: 'tison_de_zhaal', name: 'Tison de Zhaal', lore: 'Un bout de bois noir qui rougeoie au moindre souffle. Le Zhaal s\'en servait comme d\'une plume.',
      drops: [{ monster: 'zhaal', rate: 15 }], node: null, price: 23 },
    { id: 'oeil_de_zhaal', name: 'Œil de Zhaal', lore: 'Un œil de braise qui ne cligne jamais. Il vise encore, faute de pouvoir lancer.',
      drops: [{ monster: 'zhaal', rate: 4 }], node: null, price: 54 },

    { id: 'lambeau_de_fendu', name: 'Lambeau de Fendu', lore: 'Un morceau de vêtement déchiré en deux sens à la fois. Il ne se laisse pas recoudre.',
      drops: [{ monster: 'fendu', rate: 40 }], node: null, price: 13 },
    { id: 'eclat_de_lame_fendue', name: 'Éclat de lame fendue', lore: 'Un morceau de la lame d\'un Fendu. Il coupe des deux côtés, et parfois de l\'autre.',
      drops: [{ monster: 'fendu', rate: 14 }], node: null, price: 24 },
    { id: 'fil_dechire', name: 'Fil déchiré', lore: 'Un fil du Voile arraché avec le Fendu. Il cherche encore l\'endroit d\'où il vient.',
      drops: [{ monster: 'fendu', rate: 4 }], node: null, price: 56 },
  );

  // --- Récolte : Thessa et la Lisière ---
  C.resources.push(
    { id: 'bois_flotte', name: 'Bois flotté', lore: 'Blanchi par le sel, poli par la mer. Il a déjà voyagé plus loin que la plupart des Veilleurs.',
      drops: [], node: { kind: 'bois', zone: 'thessa' }, price: 8 },
    { id: 'sel_de_marsalee', name: 'Sel de Marsalée', lore: 'Des cristaux gris raclés sur les rochers de la côte. Ils conservent tout, même les rancunes.',
      drops: [], node: { kind: 'pierre', zone: 'thessa' }, price: 9 },
    { id: 'algue_de_ressac', name: 'Algue de Ressac', lore: 'Longue, verte et glissante. Séchée, elle fait un fil solide ; fraîche, elle fait tomber.',
      drops: [], node: { kind: 'plante', zone: 'thessa' }, price: 8 },
    { id: 'ardoise_des_effilures', name: 'Ardoise des Effilures', lore: 'Une plaque d\'ardoise veinée de lilas. Elle se fend toujours dans le sens du Voile.',
      drops: [], node: { kind: 'pierre', zone: 'lisiere' }, price: 11 },
    { id: 'chardon_de_lisiere', name: 'Chardon de Lisière', lore: 'Il pousse au bord de la Déchirure et ne fleurit que la nuit. Ses piquants sont tièdes.',
      drops: [], node: { kind: 'plante', zone: 'lisiere' }, price: 10 },
  );

  // --- Panoplies 31 à 50 ---
  C.sets.push({
    id: 'sivr', name: 'Panoplie du Sivr', family: ['sivr'], level: 32,
    profile: { agi: 50, chance: 20, vita: 30 },
    pieces: [
      { slot: 'coiffe', id: 'coiffe_sivr', name: 'Coiffe du Sivr', lore: 'Une visière de toile tendue sur du cuivre. On voit plus loin, et on a envie d\'y aller.' },
      { slot: 'cape', id: 'cape_sivr', name: 'Cape du Sivr', lore: 'Deux ailes cousues dans le dos. Elles ne portent pas, mais elles poussent.' },
      { slot: 'amulette', id: 'amulette_sivr', name: 'Amulette du Sivr', lore: 'Un chas de Sivr sur un cordon. Un fil en sort et suit chacun de vos pas.' },
      { slot: 'anneau', id: 'anneau_sivr', name: 'Anneau du Sivr', lore: 'Une boucle de cuivre fine comme un fil. Elle tient le doigt droit quand on vise.' },
      { slot: 'bottes', id: 'bottes_sivr', name: 'Bottes du Sivr', lore: 'Légères comme de la toile. On recule d\'un pas avant d\'y avoir pensé.' },
    ],
    bonusProfile: { agi: 60, vita: 40 },
    lore: 'Toile et cuivre de la lagune, cousus pour ceux qui tirent de loin et ne restent jamais en place. On dit que le fil qui la tient ne casse qu\'une fois le porteur tombé.',
  });

  C.sets.push({
    id: 'marnel', name: 'Panoplie du Marnel', family: ['marnel'], level: 34,
    profile: { vita: 45, chance: 35, sagesse: 20 },
    pieces: [
      { slot: 'coiffe', id: 'coiffe_marnel', name: 'Coiffe du Marnel', lore: 'Un dôme de carapace. On rentre la tête dessous au premier bruit, par réflexe.' },
      { slot: 'cape', id: 'cape_marnel', name: 'Cape du Marnel', lore: 'Des plaques de galet de mer sur une toile d\'algue. Elle pèse, puis elle protège.' },
      { slot: 'amulette', id: 'amulette_marnel', name: 'Amulette du Marnel', lore: 'Un éclat de carapace poli par la marée. Il est froid le matin et tiède le soir.' },
      { slot: 'ceinture', id: 'ceinture_marnel', name: 'Ceinture du Marnel', lore: 'Une pince de Marnel en guise de boucle. Elle ne se desserre jamais, ce qui pose parfois problème.' },
      { slot: 'bottes', id: 'bottes_marnel', name: 'Bottes du Marnel', lore: 'Lourdes et lentes. Ce qui les pousse recule avant elles.' },
    ],
    bonusProfile: { vita: 60, chance: 40 },
    lore: 'Taillée dans des carapaces de Marnel ramassées sur la grève. Elle ralentit celui qui la porte et fatigue ceux qui le frappent.',
  });

  C.sets.push({
    id: 'brisant', name: 'Panoplie du Brisant', family: ['brisant'], level: 38,
    profile: { chance: 50, force: 25, vita: 25 },
    pieces: [
      { slot: 'coiffe', id: 'coiffe_brisant', name: 'Coiffe du Brisant', lore: 'Une crête d\'écume figée. Elle mouille un peu le front, ce qui garde l\'esprit clair.' },
      { slot: 'cape', id: 'cape_brisant', name: 'Cape du Brisant', lore: 'Elle se gonfle comme une vague à chaque pas. Les ennemis reculent, on ne sait pas pourquoi.' },
      { slot: 'amulette', id: 'amulette_brisant', name: 'Amulette du Brisant', lore: 'Un cœur de Brisant serti de sel. On y entend la mer, et parfois elle répond.' },
      { slot: 'anneau', id: 'anneau_brisant', name: 'Anneau du Brisant', lore: 'Un remous pris dans du verre de mer. Il tourne autour du doigt sans jamais s\'arrêter.' },
      { slot: 'ceinture', id: 'ceinture_brisant', name: 'Ceinture du Brisant', lore: 'Une sangle d\'algue tressée serré. Elle tient bon, même quand la vague tire.' },
      { slot: 'bottes', id: 'bottes_brisant', name: 'Bottes du Brisant', lore: 'Elles laissent des flaques là où elles passent. Personne ne glisse, sauf les autres.' },
    ],
    bonusProfile: { chance: 60, force: 40 },
    lore: 'Écume, sel et remous assemblés par les tailleurs de Marsalée. Celui qui la porte frappe comme une vague : de loin, fort, et toujours une deuxième fois.',
  });

  C.sets.push({
    id: 'harpide', name: 'Panoplie de la Harpide', family: ['harpide'], level: 40,
    profile: { agi: 45, sagesse: 30, vita: 25 },
    pieces: [
      { slot: 'coiffe', id: 'coiffe_harpide', name: 'Coiffe de la Harpide', lore: 'Un casque de plumes blanches dressées. On a l\'air de guetter, et on guette.' },
      { slot: 'cape', id: 'cape_harpide', name: 'Cape de la Harpide', lore: 'Des rémiges raides cousues en éventail. Elle siffle quand on tourne trop vite.' },
      { slot: 'amulette', id: 'amulette_harpide', name: 'Amulette de la Harpide', lore: 'Un œil de Harpide sous verre. Il regarde par-dessus votre épaule à votre place.' },
      { slot: 'anneau', id: 'anneau_harpide', name: 'Anneau de la Harpide', lore: 'Une serre refermée en anneau. Elle agrippe le temps de l\'adversaire, un peu.' },
      { slot: 'bottes', id: 'bottes_harpide', name: 'Bottes de la Harpide', lore: 'Des serres à la place des boucles. On s\'accroche partout, même au vent.' },
    ],
    bonusProfile: { agi: 50, sagesse: 50 },
    lore: 'Plumes et serres des falaises du Ressac, pour ceux qui harcèlent plutôt qu\'ils ne frappent. Ses porteurs apprennent vite à prendre le temps des autres.',
  });

  C.sets.push({
    id: 'vulk', name: 'Panoplie du Vulk', family: ['vulk'], level: 42,
    profile: { force: 50, vita: 35, intel: 15 },
    pieces: [
      { slot: 'coiffe', id: 'coiffe_vulk', name: 'Coiffe du Vulk', lore: 'Une couronne de cornes cassées. Elle tient sur la tête par son seul poids.' },
      { slot: 'cape', id: 'cape_vulk', name: 'Cape du Vulk', lore: 'Des plaques d\'ardoise reliées par des chardons. Elle gratte, et elle tient.' },
      { slot: 'amulette', id: 'amulette_vulk', name: 'Amulette du Vulk', lore: 'Une fêlure lilas prise dans la pierre. Elle brille plus fort quand un Vulk approche.' },
      { slot: 'ceinture', id: 'ceinture_vulk', name: 'Ceinture du Vulk', lore: 'Une large bande d\'ardoise. Les coups y sonnent comme sur une porte.' },
      { slot: 'bottes', id: 'bottes_vulk', name: 'Bottes du Vulk', lore: 'Des semelles de pierre voûtée. On cogne en marchant, c\'est le principe.' },
    ],
    bonusProfile: { force: 60, vita: 40 },
    lore: 'Ardoise et cornes des Effilures, montées pour encaisser une meute entière. Elle rend plus fort celui qui se bat entouré, et plus calme celui qui est seul.',
  });

  C.sets.push({
    id: 'noye', name: 'Panoplie du Noyé', family: ['noye'], level: 43,
    profile: { intel: 40, sagesse: 35, vita: 25 },
    pieces: [
      { slot: 'coiffe', id: 'coiffe_noye', name: 'Coiffe du Noyé', lore: 'Un capuchon de toile mouillée. Il ne sèche jamais, et les idées restent fraîches.' },
      { slot: 'cape', id: 'cape_noye', name: 'Cape du Noyé', lore: 'Une voile de navire, déchirée et recousue. Elle sent la mer et les chansons tristes.' },
      { slot: 'amulette', id: 'amulette_noye', name: 'Amulette du Noyé', lore: 'Un soupir de Noyé sous verre. Il fredonne doucement quand un allié saigne.' },
      { slot: 'anneau', id: 'anneau_noye', name: 'Anneau du Noyé', lore: 'Une perle grise montée sur un nœud de corde. Elle brille au fond des poches.' },
      { slot: 'ceinture', id: 'ceinture_noye', name: 'Ceinture du Noyé', lore: 'Un cordage noué trois fois. Il retient tout ce qu\'on y accroche, et le reste aussi.' },
    ],
    bonusProfile: { intel: 50, sagesse: 50 },
    lore: 'Cousue dans les voiles et les cordes de l\'Épave. Ceux qui la portent soignent mieux et oublient moins, mais ils entendent parfois un chant venu du fond.',
  });

  C.sets.push({
    id: 'ferrel', name: 'Panoplie du Ferrel', family: ['ferrel'], level: 45,
    profile: { chance: 40, sagesse: 30, vita: 30 },
    pieces: [
      { slot: 'coiffe', id: 'coiffe_ferrel', name: 'Coiffe du Ferrel', lore: 'Un bonnet de piques jaunes repliées. Il éclaire un peu, et il pique beaucoup.' },
      { slot: 'cape', id: 'cape_ferrel', name: 'Cape du Ferrel', lore: 'Une étoffe dorée où dorment des lueurs. Elles se réveillent quand on tombe.' },
      { slot: 'amulette', id: 'amulette_ferrel', name: 'Amulette du Ferrel', lore: 'Une goutte de baume dans de l\'ardoise. Elle tiédit sur la poitrine avant les coups durs.' },
      { slot: 'anneau', id: 'anneau_ferrel', name: 'Anneau du Ferrel', lore: 'Un anneau de piques tressées. Il soigne la main qui le porte, et pique celle qui le prend.' },
      { slot: 'bottes', id: 'bottes_ferrel', name: 'Bottes du Ferrel', lore: 'Des semelles de chardon et des liens dorés. On court vers les blessés sans y penser.' },
    ],
    bonusProfile: { chance: 50, vita: 50 },
    lore: 'Piques et lueurs de la meute, pour ceux qui gardent les autres debout. Les Vulks reconnaissent l\'odeur et hésitent, une seconde.',
  });

  C.sets.push({
    id: 'zhaal', name: 'Panoplie du Zhaal', family: ['zhaal'], level: 46,
    profile: { intel: 55, agi: 20, vita: 25 },
    pieces: [
      { slot: 'coiffe', id: 'coiffe_zhaal', name: 'Coiffe du Zhaal', lore: 'Une capuche où brûle une flammèche violette. Elle éclaire juste ce qu\'il faut viser.' },
      { slot: 'cape', id: 'cape_zhaal', name: 'Cape du Zhaal', lore: 'Une étoffe noire piquée de braises. Elle ne prend jamais feu, elle donne le feu.' },
      { slot: 'amulette', id: 'amulette_zhaal', name: 'Amulette du Zhaal', lore: 'Un œil de Zhaal serti d\'ardoise. Il ne cligne pas, et vous non plus.' },
      { slot: 'anneau', id: 'anneau_zhaal', name: 'Anneau du Zhaal', lore: 'Un tison roulé en anneau. Les sorts en partent plus chauds et plus loin.' },
      { slot: 'ceinture', id: 'ceinture_zhaal', name: 'Ceinture du Zhaal', lore: 'Une ceinture de cuir brûlé. Elle sent la fumée et la vitesse.' },
      { slot: 'bottes', id: 'bottes_zhaal', name: 'Bottes du Zhaal', lore: 'Légères, noires, tièdes. Elles laissent des traces violettes qui s\'éteignent vite.' },
    ],
    bonusProfile: { intel: 60, agi: 40 },
    lore: 'Flammèches et tisons des lanceurs de la Lisière. Elle donne une puissance de feu rare et presque aucune protection : on la porte loin du contact.',
  });

  C.sets.push({
    id: 'mere_des_brisants', name: 'Panoplie de la Mère des Brisants', family: ['mere_des_brisants'], level: 48,
    profile: { chance: 40, vita: 35, intel: 15, sagesse: 10 },
    pieces: [
      { slot: 'coiffe', id: 'coiffe_mere_des_brisants', name: 'Coiffe de la Mère des Brisants', lore: 'Une couronne de marée figée. Elle monte d\'un cheveu chaque nuit, et personne ne sait jusqu\'où.' },
      { slot: 'cape', id: 'cape_mere_des_brisants', name: 'Cape de la Mère des Brisants', lore: 'Une vague entière tissée dans l\'écume. Elle recouvre tout, puis elle se retire.' },
      { slot: 'amulette', id: 'amulette_mere_des_brisants', name: 'Amulette de la Mère des Brisants', lore: 'La conque de la Mère, réduite à la taille d\'un pouce. On l\'entend appeler la marée.' },
      { slot: 'anneau', id: 'anneau_mere_des_brisants', name: 'Anneau de la Mère des Brisants', lore: 'Un cercle de verre de mer où l\'eau monte et descend avec la lune.' },
      { slot: 'ceinture', id: 'ceinture_mere_des_brisants', name: 'Ceinture de la Mère des Brisants', lore: 'Une amarre du Phare Englouti. Elle a tenu des navires, elle tiendra bien un Veilleur.' },
      { slot: 'bottes', id: 'bottes_mere_des_brisants', name: 'Bottes de la Mère des Brisants', lore: 'On marche dans l\'eau sans s\'enfoncer. Elle vous laisse passer, pour cette fois.' },
    ],
    bonusProfile: { chance: 50, vita: 50 },
    lore: 'Taillée dans la marée que la Mère des Brisants faisait monter au fond du Phare Englouti. La panoplie la plus forte de Thessa : elle donne le temps et la place, et la mer obéit un peu à celui qui la porte.',
  });

  C.sets.push({
    id: 'fendu', name: 'Panoplie du Fendu', family: ['fendu'], level: 50,
    profile: { force: 30, agi: 30, vita: 25, sagesse: 15 },
    pieces: [
      { slot: 'coiffe', id: 'coiffe_fendu', name: 'Coiffe du Fendu', lore: 'Un masque coupé en deux, cousu de travers. Chaque moitié regarde ailleurs.' },
      { slot: 'cape', id: 'cape_fendu', name: 'Cape du Fendu', lore: 'Des lambeaux qui flottent dans deux vents à la fois. On ne sait jamais de quel côté elle tombe.' },
      { slot: 'amulette', id: 'amulette_fendu', name: 'Amulette du Fendu', lore: 'Un fil déchiré noué sur lui-même. Il tire vers la Déchirure, doucement, toujours.' },
      { slot: 'anneau', id: 'anneau_fendu', name: 'Anneau du Fendu', lore: 'Un anneau brisé dont les deux bouts ne se touchent pas. Il tient quand même.' },
      { slot: 'ceinture', id: 'ceinture_fendu', name: 'Ceinture du Fendu', lore: 'Un éclat de lame fendue en guise de boucle. Elle coupe le vent, et parfois la ceinture.' },
      { slot: 'bottes', id: 'bottes_fendu', name: 'Bottes du Fendu', lore: 'Elles font un pas ici et l\'autre un peu plus loin. On s\'y habitue, puis on en profite.' },
    ],
    bonusProfile: { force: 50, agi: 50 },
    lore: 'Cousue avec ce que la Déchirure laisse des humains qu\'elle a traversés. Elle donne la force et la vitesse des Fendus, et un peu de leur façon d\'être à deux endroits à la fois.',
  });

  // --- Objets hors panoplie 31 à 50 ---
  // Comme plus haut, ils servent un élément au niveau où aucune panoplie ne le sert : Ignis et Terra
  // entre 31 et 41. Deux objets donnent un PA ou un PM (`extra`) contre des caractéristiques plus
  // faibles, comme l'anneau de Dofus qu'on garde des dizaines de niveaux pour ce seul point.
  C.items.push(
    { id: 'ceinture_de_varech', name: 'Ceinture de Varech', slot: 'ceinture', level: 31, profile: { intel: 50, vita: 30, sagesse: 20 }, source: 'craft',
      lore: 'De l\'algue de ressac tressée et séchée. Elle sent la marée basse et les idées neuves.' },
    { id: 'tricorne_de_bois_flotte', name: 'Tricorne de Bois Flotté', slot: 'coiffe', level: 33, profile: { force: 50, vita: 30, sagesse: 20 }, source: 'craft',
      lore: 'Trois planches de bois flotté et une couche de carapace. On a l\'air d\'un capitaine, et la tête d\'une coque.' },
    { id: 'voile_de_sel', name: 'Voile de Sel', slot: 'cape', level: 35, profile: { intel: 50, chance: 30, vita: 20 }, source: 'craft',
      lore: 'Une toile raidie au sel de Marsalée. Elle crépite au soleil comme un feu de grève.' },
    { id: 'anneau_de_galet_marin', name: 'Anneau de Galet Marin', slot: 'anneau', level: 36, profile: { force: 60, vita: 40 }, source: 'craft',
      lore: 'Un galet de Marnel percé et poli. Il alourdit le poing juste ce qu\'il faut.' },
    { id: 'amulette_de_carapace', name: 'Amulette de Carapace', slot: 'amulette', level: 37, profile: { force: 50, vita: 30, sagesse: 20 }, source: 'craft',
      lore: 'Un éclat de carapace entière sur une corde de sel. Il encaisse un peu à votre place.' },
    { id: 'bottes_de_sel', name: 'Bottes de Sel', slot: 'bottes', level: 39, profile: { intel: 50, force: 30, vita: 20 }, source: 'craft',
      lore: 'Des semelles de sel tassé. Elles brûlent un peu les pieds et beaucoup les ennemis.' },
    { id: 'anneau_d_ecume', name: 'Anneau d\'Écume', slot: 'anneau', level: 40, profile: { chance: 50, vita: 50 }, extra: { pm: 1 }, source: 'craft',
      lore: 'Deux cœurs de Brisant et un œil de Harpide pris dans l\'écume. Il donne peu, sauf un pas de plus, et ce pas-là change tout.' },
    { id: 'anneau_de_tison', name: 'Anneau de Tison', slot: 'anneau', level: 44, profile: { intel: 60, force: 40 }, source: 'craft',
      lore: 'Un tison de Zhaal serré dans l\'ardoise. Il chauffe le poing et les sorts à parts égales.' },
    { id: 'bottes_de_lisiere', name: 'Bottes de Lisière', slot: 'bottes', level: 44, profile: { agi: 50, chance: 30, vita: 20 }, source: 'craft',
      lore: 'Des piques de Ferrel et des plumes de Harpide. On court au bord de la Déchirure sans y tomber, en général.' },
    { id: 'capuche_de_tison', name: 'Capuche de Tison', slot: 'coiffe', level: 47, profile: { intel: 60, sagesse: 20, vita: 20 }, source: 'craft',
      lore: 'Une capuche où couve un tison. Les idées s\'y allument toutes seules, les cheveux aussi.' },
    { id: 'ceinture_d_ardoise', name: 'Ceinture d\'Ardoise', slot: 'ceinture', level: 47, profile: { force: 60, vita: 40 }, source: 'craft',
      lore: 'Des plaques d\'ardoise veinées de lilas. Elle tient debout ceux qui ne veulent pas plier.' },
    { id: 'cape_de_lambeaux', name: 'Cape de Lambeaux', slot: 'cape', level: 49, profile: { agi: 50, force: 30, vita: 20 }, source: 'drop', from: 'fendu',
      lore: 'Des lambeaux que les Fendus perdent en se déchirant. Elle flotte un instant avant vous.' },
    { id: 'amulette_de_la_fente', name: 'Amulette de la Fente', slot: 'amulette', level: 50, profile: { force: 25, intel: 25, chance: 25, agi: 25 }, extra: { pa: 1 }, source: 'drop', from: 'fendu',
      lore: 'Un morceau de Voile déchiré, refermé sur un vide. Elle ne donne presque rien, sauf le temps d\'un geste de plus.' },
  );

  // --- Armes 31 à 50 : le quatrième palier ---
  C.weapons.push(
    { id: 'aiguilles_de_sivr', name: 'Aiguilles de Sivr', type: 'dague', level: 33, element: 'air', profile: { agi: 70, vita: 30 }, source: 'drop', from: 'sivr',
      lore: 'Deux dards de Sivr montés sur cuivre. Elles cousent l\'adversaire en deux points.' },
    { id: 'baguette_de_varech', name: 'Baguette de Varech', type: 'baguette', level: 35, element: 'eau', profile: { chance: 60, sagesse: 40 }, source: 'craft',
      lore: 'Du bois flotté gainé d\'algue, un chas de Sivr au bout. Les sorts en sortent mouillés.' },
    { id: 'pelle_de_carapace', name: 'Pelle de Carapace', type: 'pelle', level: 37, element: 'terre', profile: { force: 50, vita: 50 }, source: 'craft',
      lore: 'Une carapace de Marnel au bout d\'un manche. Elle creuse la grève et les défenses.' },
    { id: 'arc_de_bois_flotte', name: 'Arc de Bois Flotté', type: 'arc', level: 39, element: 'air', profile: { agi: 60, vita: 40 }, source: 'craft',
      lore: 'Le bois a trop voyagé pour avoir peur. La corde est une plume de Harpide tordue.' },
    { id: 'sabre_de_ressac', name: 'Sabre de Ressac', type: 'epee', level: 40, element: 'eau', profile: { chance: 60, vita: 40 }, source: 'craft',
      lore: 'Une lame d\'écume figée autour d\'un cœur de Brisant. Elle frappe et revient, comme la vague.' },
    { id: 'hache_d_ardoise', name: 'Hache d\'Ardoise', type: 'hache', level: 41, element: 'terre', profile: { force: 70, vita: 30 }, source: 'craft',
      lore: 'Une plaque d\'ardoise des Effilures sur une corne de Vulk. Elle fend dans le sens du Voile.' },
    { id: 'masse_de_vulk', name: 'Masse de Vulk', type: 'marteau', level: 42, element: 'terre', profile: { force: 60, vita: 40 }, source: 'drop', from: 'vulk',
      lore: 'Une corne de Vulk entière, encore tiède. Elle frappe en croix, comme une meute.' },
    { id: 'baton_de_lanterne', name: 'Bâton de Lanterne', type: 'baton', level: 43, element: 'feu', profile: { intel: 50, sagesse: 30, vita: 20 }, source: 'craft',
      lore: 'Une perle de Noyé brille au bout d\'un mât de bois flotté. Elle brûle comme un feu de naufrage.' },
    { id: 'baguette_de_tison', name: 'Baguette de Tison', type: 'baguette', level: 46, element: 'feu', profile: { intel: 70, vita: 30 }, source: 'drop', from: 'zhaal',
      lore: 'Le tison d\'un Zhaal, encore rouge. Il écrit des flammes dans l\'air.' },
    { id: 'baton_de_la_mere', name: 'Bâton de la Mère', type: 'baton', level: 48, element: 'eau', profile: { chance: 60, sagesse: 20, vita: 20 }, source: 'drop', from: 'mere_des_brisants',
      lore: 'Le sceptre de corail de la Mère des Brisants. La marée monte d\'une rangée quand on le lève.' },
    { id: 'hache_des_effilures', name: 'Hache des Effilures', type: 'hache', level: 49, element: 'feu', profile: { intel: 50, force: 50 }, source: 'craft',
      lore: 'Une lame d\'ardoise où brûle une flammèche violette. Elle coupe et elle brûle, dans cet ordre.' },
    { id: 'lame_dechiree', name: 'Lame Déchirée', type: 'epee', level: 50, element: 'air', profile: { agi: 50, force: 30, vita: 20 }, source: 'drop', from: 'fendu',
      lore: 'La lame d\'un Fendu, fendue comme lui. Elle frappe ici et un peu plus loin.' },
  );

  // --- Pains 31 à 50 ---
  C.consumables.push(
    { id: 'pain_d_algue', name: 'Pain d\'Algue', kind: 'pain', level: 36, heal: 320, price: 64,
      lore: 'Pain vert de Marsalée, salé à l\'eau de mer. Il se garde un mois et remet d\'aplomb en une bouchée.' },
    { id: 'pain_des_effilures', name: 'Pain des Effilures', kind: 'pain', level: 46, heal: 420, price: 84,
      lore: 'Galette de chardon cuite sur l\'ardoise chaude. Elle pique la langue et ferme les plaies.' },
  );

  // --- Recettes 31 à 50 : de 21 ressources au niveau 32 à 29 au niveau 50 ---
  // Panoplie du Sivr (32)
  R('coiffe_sivr', 'tailleur', [['aile_de_sivr', 10], ['dard_de_sivr', 4], ['chas_de_sivr', 1], ['bois_flotte', 6]]);
  R('cape_sivr', 'tailleur', [['aile_de_sivr', 11], ['dard_de_sivr', 4], ['algue_de_ressac', 6]]);
  R('amulette_sivr', 'bijoutier', [['chas_de_sivr', 1], ['dard_de_sivr', 5], ['aile_de_sivr', 7], ['sel_de_marsalee', 8]]);
  R('anneau_sivr', 'bijoutier', [['aile_de_sivr', 8], ['dard_de_sivr', 5], ['chas_de_sivr', 1], ['sel_de_marsalee', 7]]);
  R('bottes_sivr', 'cordonnier', [['aile_de_sivr', 9], ['dard_de_sivr', 4], ['bois_flotte', 5], ['galet_de_marnel', 3]]);

  // Panoplie du Marnel (34)
  R('coiffe_marnel', 'tailleur', [['galet_de_marnel', 10], ['pince_de_marnel', 4], ['carapace_de_marnel', 1], ['sel_de_marsalee', 7]]);
  R('cape_marnel', 'tailleur', [['galet_de_marnel', 11], ['pince_de_marnel', 4], ['algue_de_ressac', 7]]);
  R('amulette_marnel', 'bijoutier', [['carapace_de_marnel', 1], ['pince_de_marnel', 5], ['galet_de_marnel', 8], ['sel_de_marsalee', 8]]);
  R('ceinture_marnel', 'cordonnier', [['galet_de_marnel', 10], ['pince_de_marnel', 5], ['bois_flotte', 4], ['aile_de_sivr', 3]]);
  R('bottes_marnel', 'cordonnier', [['galet_de_marnel', 10], ['pince_de_marnel', 4], ['bois_flotte', 8]]);

  // Panoplie du Brisant (38)
  R('coiffe_brisant', 'tailleur', [['ecume_de_brisant', 10], ['remous_de_brisant', 5], ['coeur_de_brisant', 1], ['algue_de_ressac', 7]]);
  R('cape_brisant', 'tailleur', [['ecume_de_brisant', 12], ['remous_de_brisant', 4], ['galet_de_marnel', 7]]);
  R('amulette_brisant', 'bijoutier', [['coeur_de_brisant', 1], ['remous_de_brisant', 5], ['ecume_de_brisant', 8], ['sel_de_marsalee', 9]]);
  R('anneau_brisant', 'bijoutier', [['ecume_de_brisant', 9], ['remous_de_brisant', 5], ['coeur_de_brisant', 1], ['sel_de_marsalee', 8]]);
  R('ceinture_brisant', 'cordonnier', [['ecume_de_brisant', 10], ['remous_de_brisant', 4], ['pince_de_marnel', 3], ['bois_flotte', 6]]);
  R('bottes_brisant', 'cordonnier', [['ecume_de_brisant', 10], ['remous_de_brisant', 5], ['bois_flotte', 8]]);

  // Panoplie de la Harpide (40)
  R('coiffe_harpide', 'tailleur', [['plume_de_harpide', 10], ['serre_de_harpide', 5], ['oeil_de_harpide', 1], ['bois_flotte', 8]]);
  R('cape_harpide', 'tailleur', [['plume_de_harpide', 12], ['serre_de_harpide', 4], ['aile_de_sivr', 8]]);
  R('amulette_harpide', 'bijoutier', [['oeil_de_harpide', 1], ['serre_de_harpide', 6], ['plume_de_harpide', 8], ['sel_de_marsalee', 9]]);
  R('anneau_harpide', 'bijoutier', [['plume_de_harpide', 10], ['serre_de_harpide', 5], ['oeil_de_harpide', 1], ['sel_de_marsalee', 8]]);
  R('bottes_harpide', 'cordonnier', [['plume_de_harpide', 10], ['serre_de_harpide', 5], ['ecume_de_brisant', 4], ['bois_flotte', 5]]);

  // Panoplie du Vulk (42)
  R('coiffe_vulk', 'tailleur', [['corne_de_vulk', 11], ['pierre_de_vulk', 5], ['fele_de_vulk', 1], ['ardoise_des_effilures', 8]]);
  R('cape_vulk', 'tailleur', [['corne_de_vulk', 12], ['pierre_de_vulk', 5], ['chardon_de_lisiere', 8]]);
  R('amulette_vulk', 'bijoutier', [['fele_de_vulk', 1], ['pierre_de_vulk', 6], ['corne_de_vulk', 8], ['ardoise_des_effilures', 10]]);
  R('ceinture_vulk', 'cordonnier', [['corne_de_vulk', 11], ['pierre_de_vulk', 5], ['ardoise_des_effilures', 6], ['plume_de_harpide', 3]]);
  R('bottes_vulk', 'cordonnier', [['corne_de_vulk', 11], ['pierre_de_vulk', 5], ['ardoise_des_effilures', 9]]);

  // Panoplie du Noyé (43)
  R('coiffe_noye', 'tailleur', [['corde_de_noye', 11], ['perle_de_noye', 5], ['soupir_de_noye', 1], ['algue_de_ressac', 8]]);
  R('cape_noye', 'tailleur', [['corde_de_noye', 12], ['perle_de_noye', 5], ['algue_de_ressac', 8]]);
  R('amulette_noye', 'bijoutier', [['soupir_de_noye', 1], ['perle_de_noye', 6], ['corde_de_noye', 8], ['sel_de_marsalee', 10]]);
  R('anneau_noye', 'bijoutier', [['corde_de_noye', 10], ['perle_de_noye', 5], ['soupir_de_noye', 1], ['sel_de_marsalee', 9]]);
  R('ceinture_noye', 'cordonnier', [['corde_de_noye', 11], ['perle_de_noye', 5], ['bois_flotte', 6], ['galet_de_marnel', 3]]);

  // Panoplie du Ferrel (45)
  R('coiffe_ferrel', 'tailleur', [['pique_de_ferrel', 11], ['lueur_de_ferrel', 5], ['baume_de_ferrel', 1], ['chardon_de_lisiere', 9]]);
  R('cape_ferrel', 'tailleur', [['pique_de_ferrel', 12], ['lueur_de_ferrel', 5], ['chardon_de_lisiere', 9]]);
  R('amulette_ferrel', 'bijoutier', [['baume_de_ferrel', 1], ['lueur_de_ferrel', 6], ['pique_de_ferrel', 9], ['ardoise_des_effilures', 10]]);
  R('anneau_ferrel', 'bijoutier', [['pique_de_ferrel', 10], ['lueur_de_ferrel', 5], ['baume_de_ferrel', 1], ['ardoise_des_effilures', 10]]);
  R('bottes_ferrel', 'cordonnier', [['pique_de_ferrel', 11], ['lueur_de_ferrel', 5], ['ardoise_des_effilures', 6], ['corne_de_vulk', 4]]);

  // Panoplie du Zhaal (46)
  R('coiffe_zhaal', 'tailleur', [['flammeche_de_zhaal', 11], ['tison_de_zhaal', 5], ['oeil_de_zhaal', 1], ['chardon_de_lisiere', 10]]);
  R('cape_zhaal', 'tailleur', [['flammeche_de_zhaal', 13], ['tison_de_zhaal', 5], ['chardon_de_lisiere', 9]]);
  R('amulette_zhaal', 'bijoutier', [['oeil_de_zhaal', 1], ['tison_de_zhaal', 6], ['flammeche_de_zhaal', 9], ['ardoise_des_effilures', 11]]);
  R('anneau_zhaal', 'bijoutier', [['flammeche_de_zhaal', 10], ['tison_de_zhaal', 6], ['oeil_de_zhaal', 1], ['ardoise_des_effilures', 10]]);
  R('ceinture_zhaal', 'cordonnier', [['flammeche_de_zhaal', 11], ['tison_de_zhaal', 5], ['ardoise_des_effilures', 7], ['pique_de_ferrel', 4]]);
  R('bottes_zhaal', 'cordonnier', [['flammeche_de_zhaal', 11], ['tison_de_zhaal', 5], ['chardon_de_lisiere', 7], ['corne_de_vulk', 4]]);

  // Panoplie de la Mère des Brisants (48) : chaque pièce demande une ressource de boss.
  R('coiffe_mere_des_brisants', 'tailleur', [['maree_figee', 1], ['conque_de_la_mere', 1], ['ecume_de_brisant', 12], ['perle_de_noye', 6], ['sel_de_marsalee', 8]]);
  R('cape_mere_des_brisants', 'tailleur', [['conque_de_la_mere', 1], ['ecume_de_brisant', 12], ['corde_de_noye', 9], ['algue_de_ressac', 6]]);
  R('amulette_mere_des_brisants', 'bijoutier', [['maree_figee', 1], ['conque_de_la_mere', 1], ['remous_de_brisant', 8], ['perle_de_noye', 6], ['sel_de_marsalee', 12]]);
  R('anneau_mere_des_brisants', 'bijoutier', [['maree_figee', 1], ['conque_de_la_mere', 1], ['remous_de_brisant', 7], ['perle_de_noye', 6], ['sel_de_marsalee', 13]]);
  R('ceinture_mere_des_brisants', 'cordonnier', [['maree_figee', 1], ['ecume_de_brisant', 12], ['corde_de_noye', 8], ['bois_flotte', 7]]);
  R('bottes_mere_des_brisants', 'cordonnier', [['conque_de_la_mere', 1], ['ecume_de_brisant', 11], ['galet_de_marnel', 8], ['bois_flotte', 8]]);

  // Panoplie du Fendu (50)
  R('coiffe_fendu', 'tailleur', [['lambeau_de_fendu', 12], ['eclat_de_lame_fendue', 5], ['fil_dechire', 1], ['chardon_de_lisiere', 11]]);
  R('cape_fendu', 'tailleur', [['lambeau_de_fendu', 14], ['eclat_de_lame_fendue', 5], ['chardon_de_lisiere', 10]]);
  R('amulette_fendu', 'bijoutier', [['fil_dechire', 1], ['eclat_de_lame_fendue', 6], ['lambeau_de_fendu', 10], ['ardoise_des_effilures', 12]]);
  R('anneau_fendu', 'bijoutier', [['lambeau_de_fendu', 11], ['eclat_de_lame_fendue', 6], ['fil_dechire', 1], ['ardoise_des_effilures', 11]]);
  R('ceinture_fendu', 'cordonnier', [['lambeau_de_fendu', 12], ['eclat_de_lame_fendue', 5], ['ardoise_des_effilures', 8], ['corne_de_vulk', 4]]);
  R('bottes_fendu', 'cordonnier', [['lambeau_de_fendu', 12], ['eclat_de_lame_fendue', 5], ['ardoise_des_effilures', 8], ['flammeche_de_zhaal', 4]]);

  // Objets hors panoplie 31 à 50, source craft
  R('ceinture_de_varech', 'cordonnier', [['algue_de_ressac', 10], ['aile_de_sivr', 6], ['bois_flotte', 5]]);
  R('tricorne_de_bois_flotte', 'tailleur', [['bois_flotte', 9], ['galet_de_marnel', 8], ['pince_de_marnel', 2], ['algue_de_ressac', 3]]);
  R('voile_de_sel', 'tailleur', [['sel_de_marsalee', 9], ['aile_de_sivr', 7], ['dard_de_sivr', 3], ['algue_de_ressac', 3]]);
  R('anneau_de_galet_marin', 'bijoutier', [['galet_de_marnel', 9], ['pince_de_marnel', 4], ['carapace_de_marnel', 1], ['sel_de_marsalee', 9]]);
  R('amulette_de_carapace', 'bijoutier', [['carapace_de_marnel', 1], ['galet_de_marnel', 8], ['remous_de_brisant', 3], ['sel_de_marsalee', 11]]);
  R('bottes_de_sel', 'cordonnier', [['sel_de_marsalee', 10], ['ecume_de_brisant', 7], ['remous_de_brisant', 3], ['bois_flotte', 4]]);
  R('anneau_d_ecume', 'bijoutier', [['coeur_de_brisant', 2], ['oeil_de_harpide', 1], ['ecume_de_brisant', 10], ['sel_de_marsalee', 11]]);
  R('anneau_de_tison', 'bijoutier', [['flammeche_de_zhaal', 10], ['tison_de_zhaal', 4], ['ardoise_des_effilures', 11]]);
  R('bottes_de_lisiere', 'cordonnier', [['pique_de_ferrel', 8], ['plume_de_harpide', 7], ['chardon_de_lisiere', 6], ['lueur_de_ferrel', 4]]);
  R('capuche_de_tison', 'tailleur', [['tison_de_zhaal', 5], ['flammeche_de_zhaal', 10], ['oeil_de_zhaal', 1], ['chardon_de_lisiere', 11]]);
  R('ceinture_d_ardoise', 'cordonnier', [['ardoise_des_effilures', 12], ['pierre_de_vulk', 5], ['fele_de_vulk', 1], ['corne_de_vulk', 9]]);

  // Armes 31 à 50, source craft (forgeron)
  R('baguette_de_varech', 'forgeron', [['algue_de_ressac', 9], ['chas_de_sivr', 1], ['bois_flotte', 7], ['dard_de_sivr', 5]]);
  R('pelle_de_carapace', 'forgeron', [['carapace_de_marnel', 1], ['galet_de_marnel', 9], ['bois_flotte', 8], ['pince_de_marnel', 5]]);
  R('arc_de_bois_flotte', 'forgeron', [['bois_flotte', 10], ['aile_de_sivr', 6], ['plume_de_harpide', 4], ['dard_de_sivr', 4]]);
  R('sabre_de_ressac', 'forgeron', [['ecume_de_brisant', 10], ['remous_de_brisant', 4], ['coeur_de_brisant', 1], ['sel_de_marsalee', 9]]);
  R('hache_d_ardoise', 'forgeron', [['ardoise_des_effilures', 10], ['corne_de_vulk', 8], ['bois_flotte', 4], ['pierre_de_vulk', 3]]);
  R('baton_de_lanterne', 'forgeron', [['corde_de_noye', 9], ['perle_de_noye', 4], ['soupir_de_noye', 1], ['bois_flotte', 11]]);
  R('hache_des_effilures', 'forgeron', [['flammeche_de_zhaal', 10], ['tison_de_zhaal', 5], ['oeil_de_zhaal', 1], ['ardoise_des_effilures', 12]]);

  // Pains 31 à 50 (alchimiste)
  R('pain_d_algue', 'alchimiste', [['algue_de_ressac', 6], ['sel_de_marsalee', 3], ['galet_de_marnel', 1]], 3);
  R('pain_des_effilures', 'alchimiste', [['chardon_de_lisiere', 6], ['flammeche_de_zhaal', 3], ['ardoise_des_effilures', 2]], 3);
})();
