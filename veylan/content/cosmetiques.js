(function () {
  const C = DATA.content;
  const L = C.cosmetiques = C.cosmetiques || [];
  const K = C.collections = C.collections || [];

  L.push(
    { id: 'teinture_lin_bleu', nom: 'Teinture de lin bleu', type: 'teinture', rarete: 'commun', source: { genre: 'artisanat', id: 'teinture_de_lin_bleu' }, collection: 'premiers_pas',
      description: 'Le bleu des champs d\'Ervane, celui dont les Mailles tissent les capes.', data: { couleurs: ['#3f6fb8', '#2a4a80', '#7fa6e0'] } },
    { id: 'teinture_safran', nom: 'Teinture de safran', type: 'teinture', rarete: 'commun', source: { genre: 'artisanat', id: 'teinture_de_safran' }, collection: 'sept_dragons',
      description: 'Un jaune chaud tiré des fleurs des Clairières. Il tient trois lavages.', data: { couleurs: ['#d9a23a', '#9a6a1f', '#f1cf6b'] } },
    { id: 'teinture_mousse', nom: 'Teinture de mousse', type: 'teinture', rarete: 'commun', source: { genre: 'veille', id: 'veille_7' }, collection: 'premiers_pas',
      description: 'Le vert des mousses du Ruisseau, un peu gris, qui ne jure avec rien.', data: { couleurs: ['#5f8a4e', '#3b5a33', '#8fb07a'] } },
    { id: 'teinture_aube', nom: 'Teinture de l\'Aube', type: 'teinture', rarete: 'rare', source: { genre: 'succes', id: 'trente_quetes' }, collection: 'cimes',
      description: 'Blanc et or, les couleurs de l\'Aube : on la gagne à force de services rendus.', data: { couleurs: ['#efe6d2', '#c9a35c', '#f8f3e6'] } },
    { id: 'teinture_braise', nom: 'Teinture de braise', type: 'teinture', rarete: 'rare', source: { genre: 'boss', id: 'dorm' }, collection: 'sept_dragons',
      description: 'Rouge sombre et or de forge, tirée des cendres de Dorm.', data: { couleurs: ['#8f2a1e', '#4a1410', '#e09a3a'] } },
    { id: 'teinture_cendree', nom: 'Teinture cendrée', type: 'teinture', rarete: 'epique', source: { genre: 'succes', id: 'deux_cents_combats' }, collection: 'sept_dragons',
      description: 'Noir et pourpre, les couleurs de ce qui a brûlé. Deux cents combats pour la porter.', data: { couleurs: ['#231a2e', '#120c18', '#7a3fa8'] } },
  );

  L.push(
    { id: 'lueur_dragme', nom: 'Lueur de Dragme', type: 'lueur', rarete: 'commun', source: { genre: 'succes', id: 'mille_fils' }, collection: 'premiers_pas',
      description: 'Une lanterne qui luit de l\'or des pièces. Mille Dragmes amassés.', data: { couleur: '#f2c35b', effet: 'douce' } },
    { id: 'lueur_cendre', nom: 'Lueur de cendre', type: 'lueur', rarete: 'rare', source: { genre: 'boss', id: 'grand_grouk' }, collection: 'cimes',
      description: 'Une lueur pourpre, ramassée dans la tanière du Grand Grouk.', data: { couleur: '#b06cff', effet: 'vive' } },
    { id: 'lueur_mer', nom: 'Lueur de mer', type: 'lueur', rarete: 'rare', source: { genre: 'boss', id: 'fileuse' }, collection: 'cimes',
      description: 'Le cyan du verre de mer, pris à la Fileuse du Nid des Toiles.', data: { couleur: '#3fd6e9', effet: 'douce' } },
    { id: 'lueur_aube', nom: 'Lueur d\'aube', type: 'lueur', rarete: 'epique', source: { genre: 'veille', id: 'veille_28' }, collection: 'sept_dragons',
      description: 'Blanche et chaude comme le souffle de Ruhani. Un cycle entier de Veilles.', data: { couleur: '#fff1cf', effet: 'braise' } },
  );

  L.push(
    { id: 'aura_braises', nom: 'Braises sous les pas', type: 'aura', rarete: 'rare', source: { genre: 'succes', id: 'cinquante_combats' }, collection: 'premiers_pas',
      description: 'Des braises qui s\'allument sous les pieds à chaque pas. Cinquante combats gagnés.', data: { couleur: '#ff8a3d', forme: 'braises' } },
    { id: 'aura_brume', nom: 'Brume d\'Aïven', type: 'aura', rarete: 'rare', source: { genre: 'succes', id: 'boss_kavou_prisme' }, collection: 'cimes',
      description: 'Une brume pâle qui traîne aux chevilles, comme au sommet des Cimes.', data: { couleur: '#9cc3ff', forme: 'brume' } },
    { id: 'aura_lucioles', nom: 'Lucioles du Ruisseau', type: 'aura', rarete: 'epique', source: { genre: 'succes', id: 'chemin_des_ecailles' }, collection: 'sept_dragons',
      description: 'Un cercle de lucioles vertes, celles qui dansent sur la stèle d\'Ithren.', data: { couleur: '#8ff0a0', forme: 'cercle' } },
  );

  L.push(
    { id: 'blason_voie', nom: 'Blason de la Voie', type: 'blason', rarete: 'rare', source: { genre: 'quete', id: ['voie_sarkan_1', 'voie_lyssar_1', 'voie_oriel_1', 'voie_nerith_1', 'voie_karsh_1', 'voie_thalor_1', 'voie_velmar_1', 'voie_fennal_1', 'voie_orvald_1'] }, collection: null,
      description: 'Le geste de ta Voie, reconnu par le Temple. Un seul blason pour les neuf Voies.', data: { glyphe: '✦', couleur: '#c9a35c' } },
    { id: 'blason_grouk', nom: 'Corne du Grand Grouk', type: 'blason', rarete: 'rare', source: { genre: 'boss', id: 'grand_grouk' }, collection: 'cimes',
      description: 'Une corne stylisée, pour qui a fait tomber le Grand Grouk.', data: { glyphe: '⌂', couleur: '#8fb07a' } },
    { id: 'blason_premiers_pas', nom: 'Blason des premiers pas', type: 'blason', rarete: 'rare', source: { genre: 'collection', id: 'premiers_pas' }, collection: null,
      description: 'La collection des premiers pas, complète.', data: { glyphe: '❖', couleur: '#7fb4ff' } },
    { id: 'blason_dragon', nom: 'Blason des Sept', type: 'blason', rarete: 'legendaire', source: { genre: 'collection', id: 'sept_dragons' }, collection: null,
      description: 'Sept dragons, sept pointes. La collection des Sept Dragons, complète.', data: { glyphe: '✷', couleur: '#ffd166' } },
  );

  L.push(
    { id: 'emote_danse', nom: 'Émote : la danse des Cimes', type: 'emote', rarete: 'commun', source: { genre: 'succes', id: 'dix_combats' }, collection: 'premiers_pas',
      description: 'Trois pas de danse, ceux des veillées d\'Orsane. Dix combats gagnés.', data: { emote: 'danse', label: 'Danser' } },
    { id: 'emote_defi', nom: 'Émote : le défi', type: 'emote', rarete: 'commun', source: { genre: 'succes', id: 'niveau_10' }, collection: 'sept_dragons',
      description: 'Un poing levé vers le ciel, pour les dragons qui regardent. Le niveau 10.', data: { emote: 'defi', label: 'Défier' } },
  );

  L.push(
    { id: 'theme_cendrees', nom: 'Thème : les Cendrées', type: 'theme', rarete: 'rare', source: { genre: 'succes', id: 'dix_mille_fils' }, collection: 'sept_dragons',
      description: 'Noir et pourpre, l\'interface aux couleurs de ce qui dort sous la cendre.', data: { theme: ['cendrees', 'Les Cendrées', '#15101c', '#bf95ff'] } },
    { id: 'theme_aube_doree', nom: 'Thème : l\'Aube dorée', type: 'theme', rarete: 'epique', source: { genre: 'collection', id: 'cimes' }, collection: null,
      description: 'Blanc et or : l\'interface de l\'Aube. La collection des Cimes, complète.', data: { theme: ['aube', 'Aube dorée', '#f3ead8', '#9a6a1f'] } },
  );

  K.push(
    { id: 'premiers_pas', nom: 'Les premiers pas', description: 'Ce que les premières semaines d\'un Veilleur rapportent.',
      cosmetiques: ['teinture_lin_bleu', 'teinture_mousse', 'lueur_dragme', 'aura_braises', 'emote_danse'], recompense: 'blason_premiers_pas' },
    { id: 'cimes', nom: 'Les Cimes', description: 'Les bêtes et les belles choses d\'Orsane.',
      cosmetiques: ['teinture_aube', 'lueur_cendre', 'lueur_mer', 'aura_brume', 'blason_grouk'], recompense: 'theme_aube_doree' },
    { id: 'sept_dragons', nom: 'Les Sept Dragons', description: 'Pour qui a tenu la route jusqu\'aux forges, et au-delà.',
      cosmetiques: ['teinture_safran', 'teinture_braise', 'teinture_cendree', 'lueur_aube', 'aura_lucioles', 'emote_defi', 'theme_cendrees'], recompense: 'blason_dragon' },
  );
})();
