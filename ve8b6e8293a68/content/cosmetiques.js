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
    { id: 'lueur_dragme', nom: 'Lueur de Dragme', type: 'aura', rarete: 'commun', source: { genre: 'succes', id: 'mille_fils' }, collection: 'premiers_pas',
      description: 'Un cercle d\'or des pièces sous les pas. Mille Dragmes amassés.', data: { couleur: '#f2c35b', forme: 'cercle' } },
    { id: 'lueur_cendre', nom: 'Lueur de cendre', type: 'aura', rarete: 'rare', source: { genre: 'boss', id: 'grand_grouk' }, collection: 'cimes',
      description: 'Une lueur pourpre, ramassée dans la tanière du Grand Grouk.', data: { couleur: '#b06cff', forme: 'brume' } },
    { id: 'lueur_mer', nom: 'Lueur de mer', type: 'aura', rarete: 'rare', source: { genre: 'boss', id: 'fileuse' }, collection: 'cimes',
      description: 'Le cyan du verre de mer, pris à la Fileuse du Nid des Toiles.', data: { couleur: '#3fd6e9', forme: 'cercle' } },
    { id: 'lueur_aube', nom: 'Lueur d\'aube', type: 'aura', rarete: 'epique', source: { genre: 'veille', id: 'veille_28' }, collection: 'sept_dragons',
      description: 'Blanche et chaude comme le souffle de Ruhani. Un cycle entier de Veilles.', data: { couleur: '#fff1cf', forme: 'braises' } },
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
    { id: 'lueur_score_100', nom: 'Lueur de calcaire', type: 'aura', rarete: 'commun', source: { genre: 'succes', id: 'score_100' }, collection: null,
      description: 'Une lueur pâle, couleur de pierre. Cent points de succès.', data: { couleur: '#f7f0de', forme: 'cercle' } },
    { id: 'lueur_score_250', nom: 'Lueur de grès', type: 'aura', rarete: 'commun', source: { genre: 'succes', id: 'score_250' }, collection: null,
      description: 'Le grès chaud des Cimes au couchant. Deux cent cinquante points de succès.', data: { couleur: '#eecda6', forme: 'cercle' } },
    { id: 'lueur_score_500', nom: 'Lueur dorée', type: 'aura', rarete: 'rare', source: { genre: 'succes', id: 'score_500' }, collection: null,
      description: 'L\'or des arêtes du V. Cinq cents points de succès.', data: { couleur: '#ddaa72', forme: 'brume' } },
    { id: 'lueur_score_1000', nom: 'Lueur d\'or vif', type: 'aura', rarete: 'rare', source: { genre: 'succes', id: 'score_1000' }, collection: null,
      description: 'Un or qui brille de lui-même. Mille points de succès.', data: { couleur: '#f3bc72', forme: 'brume' } },
    { id: 'lueur_score_1500', nom: 'Lueur de cristal', type: 'aura', rarete: 'epique', source: { genre: 'succes', id: 'score_1500' }, collection: null,
      description: 'Le bleu du cristal qui traverse la pierre. Mille cinq cents points de succès.', data: { couleur: '#52d2f4', forme: 'brume' } },
    { id: 'lueur_score_2500', nom: 'Lueur des deux réalités', type: 'aura', rarete: 'legendaire', source: { genre: 'succes', id: 'score_2500' }, collection: null,
      description: 'Le saphir profond du cœur du V : presque tout ce que Veylan offre, accompli.', data: { couleur: '#209fec', forme: 'braises' } },
    { id: 'lueur_defis', nom: 'Lueur des douze Défis', type: 'aura', rarete: 'rare', source: { genre: 'succes', id: 'tous_les_defis' }, collection: null,
      description: 'Une lueur améthyste, pour qui a relevé chacun des douze Défis.', data: { couleur: '#ab7cf2', forme: 'brume' } },
  );
  L.push(
    { id: 'blason_ervane', nom: 'Blason de l\'Éveil', type: 'blason', rarete: 'rare', source: { genre: 'succes', id: 'explorer_ervane' }, collection: null,
      description: 'L\'île d\'Ervane parcourue en entier, des Mailles au Puits.', data: { glyphe: '◇', couleur: '#80d697' } },
    { id: 'blason_orsane', nom: 'Blason des Cimes', type: 'blason', rarete: 'rare', source: { genre: 'succes', id: 'explorer_orsane' }, collection: null,
      description: 'Chaque zone d\'Orsane visitée, des Cimes aux Éboulis.', data: { glyphe: '▲', couleur: '#ddaa72' } },
    { id: 'blason_kaldum', nom: 'Blason des forges', type: 'blason', rarete: 'rare', source: { genre: 'succes', id: 'explorer_kaldum' }, collection: null,
      description: 'Kaldum parcourue jusqu\'à la Fonderie, ses galeries comprises.', data: { glyphe: '⬢', couleur: '#ef7574' } },
    { id: 'blason_patte', nom: 'Blason de la ménagerie', type: 'blason', rarete: 'epique', source: { genre: 'succes', id: 'tous_familiers' }, collection: null,
      description: 'Chaque familier éclos et gardé. Une patte, frappée dans l\'or.', data: { glyphe: '✦', couleur: '#6eb19f' } },
  );
  L.push(
    { id: 'aura_fil', nom: 'Le monde arpenté', type: 'aura', rarete: 'legendaire', source: { genre: 'succes', id: 'le_monde_recousu' }, collection: null,
      description: 'Un cercle d\'or sous les pas : Ervane, Orsane et Kaldum explorées en entier.', data: { couleur: '#f3bc72', forme: 'cercle' } },
    { id: 'aura_trophees', nom: 'Brume du trappeur', type: 'aura', rarete: 'legendaire', source: { genre: 'succes', id: 'trappeur_du_fil' }, collection: null,
      description: 'Une brume verte qui suit le pas : tout le Bestiaire accompli.', data: { couleur: '#80d697', forme: 'brume' } },
    { id: 'aura_colosse', nom: 'Braises du colosse', type: 'aura', rarete: 'legendaire', source: { genre: 'succes', id: 'mission_veilleur' }, collection: null,
      description: 'Des braises de cristal sous les pieds : tous les succès de donjon.', data: { couleur: '#52d2f4', forme: 'braises' } },
  );

  L.push(
    { id: 'b_teinture_nuit', nom: 'Teinture nuit indigo', type: 'teinture', rarete: 'rare', source: { genre: 'boutique', id: 'b_teinture_nuit' }, collection: null,
      description: 'Le bleu de nuit du ciel de Veylan, cousu d\'or.', data: { couleurs: ['#0f1728', '#22355d', '#ddaa72'] } },
    { id: 'b_teinture_calcaire', nom: 'Teinture calcaire et or', type: 'teinture', rarete: 'rare', source: { genre: 'boutique', id: 'b_teinture_calcaire' }, collection: null,
      description: 'La pierre pâle du V et ses arêtes d\'or.', data: { couleurs: ['#efe6d2', '#a67349', '#f3bc72'] } },
    { id: 'b_teinture_amethyste', nom: 'Teinture améthyste', type: 'teinture', rarete: 'epique', source: { genre: 'boutique', id: 'b_teinture_amethyste' }, collection: null,
      description: 'Violet profond et lavande, la couleur des voiles.', data: { couleurs: ['#3e207f', '#241448', '#ab7cf2'] } },
    { id: 'b_teinture_rubis', nom: 'Teinture rubis des forges', type: 'teinture', rarete: 'epique', source: { genre: 'boutique', id: 'b_teinture_rubis' }, collection: null,
      description: 'Rouge de forge et or sombre, pour qui revient de Kaldum.', data: { couleurs: ['#b83a44', '#5a1a20', '#ddaa72'] } },
    { id: 'b_lueur_saphir', nom: 'Lueur de saphir', type: 'aura', rarete: 'rare', source: { genre: 'boutique', id: 'b_lueur_saphir' }, collection: null,
      description: 'Le cristal du logo, en brume sous les pas.', data: { couleur: '#209fec', forme: 'brume' } },
    { id: 'b_lueur_rubis', nom: 'Lueur de rubis', type: 'aura', rarete: 'rare', source: { genre: 'boutique', id: 'b_lueur_rubis' }, collection: null,
      description: 'Des braises rouges sous les pas, chaudes comme une forge.', data: { couleur: '#ef7574', forme: 'braises' } },
    { id: 'b_lueur_feuille', nom: 'Lueur de feuille', type: 'aura', rarete: 'rare', source: { genre: 'boutique', id: 'b_lueur_feuille' }, collection: null,
      description: 'Le vert tendre des Clairières au printemps.', data: { couleur: '#80d697', forme: 'cercle' } },
    { id: 'b_aura_vitrail', nom: 'Éclats de vitrail', type: 'aura', rarete: 'epique', source: { genre: 'boutique', id: 'b_aura_vitrail' }, collection: null,
      description: 'Des éclats de cristal qui tombent sous les pas.', data: { couleur: '#52d2f4', forme: 'braises' } },
    { id: 'b_aura_fil', nom: 'Le fil d\'or', type: 'aura', rarete: 'legendaire', source: { genre: 'boutique', id: 'b_aura_fil' }, collection: null,
      description: 'Un cercle de fil d\'or qui recoud le sol où l\'on marche.', data: { couleur: '#f3bc72', forme: 'cercle' } },
    { id: 'b_aura_brume', nom: 'Brume d\'améthyste', type: 'aura', rarete: 'epique', source: { genre: 'boutique', id: 'b_aura_brume' }, collection: null,
      description: 'Une brume violette, basse, qui suit le pas.', data: { couleur: '#ab7cf2', forme: 'brume' } },
    { id: 'b_blason_v', nom: 'Blason du V taillé', type: 'blason', rarete: 'epique', source: { genre: 'boutique', id: 'b_blason_v' }, collection: null,
      description: 'Le V de Veylan, frappé dans l\'or à côté du nom.', data: { glyphe: 'V', couleur: '#ddaa72' } },
    { id: 'b_blason_cristal', nom: 'Blason du cristal', type: 'blason', rarete: 'rare', source: { genre: 'boutique', id: 'b_blason_cristal' }, collection: null,
      description: 'Un losange de cristal saphir à côté du nom.', data: { glyphe: '◆', couleur: '#52d2f4' } },
  );

  K.push(
    { id: 'premiers_pas', nom: 'Les premiers pas', description: 'Ce que les premières semaines d\'un Veilleur rapportent.',
      cosmetiques: ['teinture_lin_bleu', 'teinture_mousse', 'lueur_dragme', 'aura_braises', 'emote_danse'], recompense: 'blason_premiers_pas' },
    { id: 'cimes', nom: 'Les Cimes', description: 'Les bêtes et les belles choses d\'Orsane.',
      cosmetiques: ['teinture_aube', 'lueur_cendre', 'lueur_mer', 'aura_brume', 'blason_grouk'], recompense: null },
    { id: 'sept_dragons', nom: 'Les Sept Dragons', description: 'Pour qui a tenu la route jusqu\'aux forges, et au-delà.',
      cosmetiques: ['teinture_safran', 'teinture_braise', 'teinture_cendree', 'lueur_aube', 'aura_lucioles', 'emote_defi'], recompense: 'blason_dragon' },
  );
})();
