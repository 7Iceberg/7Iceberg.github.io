// Succès du jeu : Orsane et Kaldum. Format : docs/SPEC-CONTENU.md.
// Les donjons et panoplies de Kaldum (cuve_des_cendrous, forge_morte, molh, dorm) sont définis
// dans d'autres fichiers.
const ACH = DATA.content.achievements;

// --- Combats ---
ACH.push({ id: 'premier_sang', name: 'Premier sang', desc: 'Gagner un combat.', cond: { type: 'fights', count: 1 }, rewards: { xp: 30, fils: 10 } });
ACH.push({ id: 'dix_combats', name: 'Dix de tombés', desc: 'Gagner dix combats.', cond: { type: 'fights', count: 10 }, rewards: { xp: 120, fils: 30 } });
ACH.push({ id: 'cinquante_combats', name: 'Cinquante de tombés', desc: 'Gagner cinquante combats.', cond: { type: 'fights', count: 50 }, rewards: { xp: 500, fils: 100, title: 'Batailleur' } });
ACH.push({ id: 'deux_cents_combats', name: 'Deux cents de tombés', desc: 'Gagner deux cents combats.', cond: { type: 'fights', count: 200 }, rewards: { xp: 2000, fils: 400, title: 'Vétéran des Voiles' } });

// --- Familles d'Orsane ---
ACH.push({ id: 'chasseur_de_pilous', name: 'Chasseur de Glyms', desc: 'Vaincre vingt-cinq Glyms Ancestraux.', cond: { type: 'kills', monster: 'pilou', count: 25 }, rewards: { xp: 100, fils: 25 } });
ACH.push({ id: 'fleau_des_pilous', name: 'Fléau des Glyms', desc: 'Vaincre cent Glyms Ancestraux. Les lanternes des Cimes respirent.', cond: { type: 'kills', monster: 'pilou', count: 100 }, rewards: { xp: 400, fils: 80, title: 'Fléau des Glyms' } });
ACH.push({ id: 'dompteur_de_grouks', name: 'Dompteur de Grouks', desc: 'Vaincre vingt-cinq Grouks.', cond: { type: 'kills', monster: 'grouk', count: 25 }, rewards: { xp: 200, fils: 40 } });
ACH.push({ id: 'coupeur_de_toiles', name: 'Coupeur de toiles', desc: 'Vaincre vingt-cinq Tissefils.', cond: { type: 'kills', monster: 'tissefil', count: 25 }, rewards: { xp: 300, fils: 50 } });
ACH.push({ id: 'souffleur_de_veilloches', name: 'Souffleur de Veilloches', desc: 'Vaincre vingt-cinq Veilloches. Un seau d\'eau aide.', cond: { type: 'kills', monster: 'veilloche', count: 25 }, rewards: { xp: 400, fils: 60 } });
ACH.push({ id: 'briseur_de_brimbes', name: 'Briseur de Brimbes', desc: 'Vaincre vingt-cinq Brimbes.', cond: { type: 'kills', monster: 'brimbe', count: 25 }, rewards: { xp: 500, fils: 80 } });

// --- Familles de Kaldum ---
ACH.push({ id: 'fendeur_de_molhs', name: 'Fendeur de Molhs', desc: 'Vaincre vingt-cinq Molhs.', cond: { type: 'kills', monster: 'molh', count: 25 }, rewards: { xp: 700, fils: 100 } });
ACH.push({ id: 'fondeur_de_kaldriks', name: 'Fondeur de Rakthuls', desc: 'Vaincre vingt-cinq Rakthuls.', cond: { type: 'kills', monster: 'kaldrik', count: 25 }, rewards: { xp: 800, fils: 120 } });
ACH.push({ id: 'dissipeur_de_fumerolles', name: 'Dissipeur de Fumerolles', desc: 'Vaincre vingt-cinq Fumerolles, visibles ou non.', cond: { type: 'kills', monster: 'fumerolle', count: 25 }, rewards: { xp: 900, fils: 130 } });
ACH.push({ id: 'emousseur_de_pioches', name: 'Émousseur de Pioches', desc: 'Vaincre vingt-cinq Pioches-Vives.', cond: { type: 'kills', monster: 'pioche_vive', count: 25 }, rewards: { xp: 1000, fils: 150 } });
ACH.push({ id: 'eteigneur_de_cendrous', name: 'Éteigneur de Cendrous', desc: 'Vaincre vingt-cinq Cendrous.', cond: { type: 'kills', monster: 'cendrou', count: 25 }, rewards: { xp: 1100, fils: 170 } });

// --- Niveaux ---
ACH.push({ id: 'niveau_5', name: 'Pied sur les Cimes', desc: 'Atteindre le niveau 5.', cond: { type: 'level', level: 5 }, rewards: { xp: 80, fils: 20 } });
ACH.push({ id: 'niveau_10', name: 'Sur les Sentiers', desc: 'Atteindre le niveau 10.', cond: { type: 'level', level: 10 }, rewards: { xp: 200, fils: 50 } });
ACH.push({ id: 'niveau_15', name: 'Entre les Toiles', desc: 'Atteindre le niveau 15.', cond: { type: 'level', level: 15 }, rewards: { xp: 400, fils: 80 } });
ACH.push({ id: 'niveau_20', name: 'Veilleur des Cimes', desc: 'Atteindre le niveau 20. Orsane est derrière toi.', cond: { type: 'level', level: 20 }, rewards: { xp: 700, fils: 150, title: 'Veilleur des Cimes' } });
ACH.push({ id: 'niveau_25', name: 'Dans la roche chaude', desc: 'Atteindre le niveau 25.', cond: { type: 'level', level: 25 }, rewards: { xp: 1000, fils: 200 } });
ACH.push({ id: 'niveau_30', name: 'Trempé à la forge', desc: 'Atteindre le niveau 30.', cond: { type: 'level', level: 30 }, rewards: { xp: 1500, fils: 300, title: 'Forgé à Kaldum' } });

// --- Donjons et boss ---
ACH.push({ id: 'donjon_grenier', name: 'Tout le monde descend du grenier', desc: 'Terminer le Grenier des Glyms.', cond: { type: 'dungeon', dungeon: 'grenier_des_pilous' }, rewards: { xp: 150, fils: 30 } });
ACH.push({ id: 'defi_grenier', name: 'Bonk', desc: 'Faire lâcher sa lanterne au Glym Chapardeur trois fois, en le frappant au contact.', cond: { type: 'feat', key: 'lanterne_reprise', count: 3 }, rewards: { xp: 200, fils: 40, title: 'Repreneur de lanternes' } });
ACH.push({ id: 'donjon_voliere', name: 'Toutes les cages ouvertes', desc: 'Terminer la Volière des Kavous.', cond: { type: 'dungeon', dungeon: 'voliere_des_kavous' }, rewards: { xp: 600, fils: 100 } });
ACH.push({ id: 'boss_kavou_prisme', name: 'Toutes les couleurs du Voile', desc: 'Vaincre le Kavou Prisme, quelle que soit sa couleur du moment.', cond: { type: 'boss', monster: 'kavou_prisme' }, rewards: { xp: 500, fils: 90, title: 'Œil du Prisme' } });
ACH.push({ id: 'donjon_nid', name: 'Le Nid défait', desc: 'Terminer le Nid des Toiles.', cond: { type: 'dungeon', dungeon: 'nid_des_toiles' }, rewards: { xp: 600, fils: 100 } });
ACH.push({ id: 'defi_nid', name: 'Deux fils, un seul tour', desc: 'Déchirer trois fois le cocon de la Fileuse en coupant ses deux fils d\'ancrage le même tour.', cond: { type: 'feat', key: 'cocon_dechire', count: 3 }, rewards: { xp: 500, fils: 90, title: 'Coupe-Fil' } });
ACH.push({ id: 'donjon_terrier', name: 'Au fond du Terrier', desc: 'Terminer le Terrier du Grand Grouk.', cond: { type: 'dungeon', dungeon: 'terrier_du_grand_grouk' }, rewards: { xp: 800, fils: 150 } });
ACH.push({ id: 'terrier_vingt_tours', name: 'Au pas de charge', desc: 'Terminer le Terrier du Grand Grouk en vingt-cinq tours au plus, toutes salles comprises.', cond: { type: 'dungeonTurns', dungeon: 'terrier_du_grand_grouk', max: 25 }, rewards: { xp: 1000, fils: 160, title: 'Pas de charge' } });
ACH.push({ id: 'defi_grand_grouk', name: 'Tête contre roche', desc: 'Sonner trois fois le Grand Grouk contre un rocher.', cond: { type: 'feat', key: 'grand_grouk_sonne', count: 3 }, rewards: { xp: 700, fils: 130, title: 'Sonneur de Grouk' } });
ACH.push({ id: 'donjon_boues', name: 'Bain de boue', desc: 'Terminer les Boues Chaudes.', cond: { type: 'dungeon', dungeon: 'boues_chaudes' }, rewards: { xp: 1300, fils: 200 } });
ACH.push({ id: 'defi_boues', name: 'Cuisson à point', desc: 'Cuire cinq fois la Glaise Mère au feu.', cond: { type: 'feat', key: 'glaise_cuite', count: 5 }, rewards: { xp: 1100, fils: 180, title: 'Potier de Kaldum' } });
ACH.push({ id: 'donjon_mine', name: 'Le dortoir réveillé', desc: 'Terminer la Mine des Tholous.', cond: { type: 'dungeon', dungeon: 'mine_des_tholous' }, rewards: { xp: 1600, fils: 250 } });
ACH.push({ id: 'boss_grand_tholou', name: 'Chacun chez soi', desc: 'Vaincre le Grand Tholou, loin de son Molh.', cond: { type: 'boss', monster: 'grand_tholou' }, rewards: { xp: 1400, fils: 230, title: 'Briseur de câlins' } });
ACH.push({ id: 'donjon_cuve', name: 'Sorti de la Cuve', desc: 'Terminer la Cuve des Cendrous.', cond: { type: 'dungeon', dungeon: 'cuve_des_cendrous' }, rewards: { xp: 1800, fils: 280 } });
ACH.push({ id: 'boss_kraska', name: 'La Mère-Braise éteinte', desc: 'Vaincre Kraska, la Mère-Braise.', cond: { type: 'boss', monster: 'kraska' }, rewards: { xp: 1700, fils: 280, title: 'Souffle-Braise' } });
ACH.push({ id: 'donjon_forge_morte', name: 'La Forge rallumée', desc: 'Terminer la Forge Morte.', cond: { type: 'dungeon', dungeon: 'forge_morte' }, rewards: { xp: 2500, fils: 400 } });
ACH.push({ id: 'boss_grand_grouk', name: 'Plus grand que le Grand Grouk', desc: 'Vaincre le Grand Grouk.', cond: { type: 'boss', monster: 'grand_grouk' }, rewards: { xp: 600, fils: 120, title: 'Tombeur de Grouks' } });
ACH.push({ id: 'boss_dorm', name: 'Le Forgeron déterré', desc: 'Vaincre Dorm, le Forgeron Enseveli.', cond: { type: 'boss', monster: 'dorm' }, rewards: { xp: 2000, fils: 350, title: 'Éveilleur de Dorm' } });
ACH.push({ id: 'defi_dorm', name: 'Douche froide', desc: 'Tremper cinq fois Dorm d\'un sort d\'eau pendant qu\'il est en fusion.', cond: { type: 'feat', key: 'dorm_trempe', count: 5 }, rewards: { xp: 1800, fils: 300, title: 'Trempeur de Dorm' } });

// --- Défis de combat ---
ACH.push({ id: 'defis_10', name: 'Joueur de défis', desc: 'Réussir dix Défis de combat.', cond: { type: 'feat', key: 'defi', count: 10 }, rewards: { xp: 200, fils: 40, title: 'Joueur de défis' } });
ACH.push({ id: 'defis_50', name: 'Preneur de risques', desc: 'Réussir cinquante Défis de combat.', cond: { type: 'feat', key: 'defi', count: 50 }, rewards: { xp: 1000, fils: 150, title: 'Preneur de risques' } });
ACH.push({ id: 'defis_200', name: 'Maître des Défis', desc: 'Réussir deux cents Défis de combat.', cond: { type: 'feat', key: 'defi', count: 200 }, rewards: { xp: 4000, fils: 500, title: 'Maître des Défis' } });

// --- Quêtes ---
ACH.push({ id: 'cinq_quetes', name: 'Rendre service', desc: 'Terminer cinq quêtes.', cond: { type: 'quests', count: 5 }, rewards: { xp: 100, fils: 30 } });
ACH.push({ id: 'quinze_quetes', name: 'Homme de confiance', desc: 'Terminer quinze quêtes.', cond: { type: 'quests', count: 15 }, rewards: { xp: 500, fils: 100 } });
ACH.push({ id: 'trente_quetes', name: 'Bras du Fil', desc: 'Terminer trente quêtes.', cond: { type: 'quests', count: 30 }, rewards: { xp: 1500, fils: 300, title: 'Bras du Fil' } });

// --- Exploration ---
ACH.push({ id: 'dix_cartes', name: 'Promeneur', desc: 'Visiter dix cartes.', cond: { type: 'maps', count: 10 }, rewards: { xp: 80, fils: 20 } });
ACH.push({ id: 'vingt_cinq_cartes', name: 'Arpenteur', desc: 'Visiter vingt-cinq cartes.', cond: { type: 'maps', count: 25 }, rewards: { xp: 400, fils: 80, title: 'Arpenteur' } });

// --- Panoplies ---
ACH.push({ id: 'panoplie_pilou', name: 'Tout en plumes', desc: 'Porter la panoplie du Glym au complet.', cond: { type: 'set', set: 'pilou' }, rewards: { xp: 100, fils: 30 } });
ACH.push({ id: 'panoplie_grouk', name: 'Tout en cuir', desc: 'Porter la panoplie du Grouk au complet.', cond: { type: 'set', set: 'grouk' }, rewards: { xp: 250, fils: 50 } });
ACH.push({ id: 'panoplie_veilloche', name: 'Tout en lumière', desc: 'Porter la panoplie du Veilloche au complet.', cond: { type: 'set', set: 'veilloche' }, rewards: { xp: 500, fils: 90 } });
ACH.push({ id: 'panoplie_molh', name: 'Tout en pierre', desc: 'Porter la panoplie du Molh au complet.', cond: { type: 'set', set: 'molh' }, rewards: { xp: 900, fils: 150 } });
ACH.push({ id: 'panoplie_dorm', name: 'Tout en forge', desc: 'Porter la panoplie de Dorm au complet.', cond: { type: 'set', set: 'dorm' }, rewards: { xp: 2000, fils: 350, title: 'Héritier de Dorm' } });

// --- Métiers ---
ACH.push({ id: 'dix_fabrications', name: 'Apprenti', desc: 'Fabriquer dix objets aux ateliers.', cond: { type: 'craft', count: 10 }, rewards: { xp: 100, fils: 30 } });
ACH.push({ id: 'cinquante_fabrications', name: 'Compagnon', desc: 'Fabriquer cinquante objets aux ateliers.', cond: { type: 'craft', count: 50 }, rewards: { xp: 600, fils: 120, title: 'Compagnon des Ateliers' } });
ACH.push({ id: 'vingt_recoltes', name: 'Cueilleur', desc: 'Récolter vingt fois.', cond: { type: 'gather', count: 20 }, rewards: { xp: 80, fils: 20 } });
ACH.push({ id: 'cent_recoltes', name: 'Récolteur', desc: 'Récolter cent fois.', cond: { type: 'gather', count: 100 }, rewards: { xp: 500, fils: 100 } });

// --- Fils ---
ACH.push({ id: 'mille_fils', name: 'Pelote', desc: 'Amasser mille Fils.', cond: { type: 'fils', count: 1000 }, rewards: { xp: 200, fils: 50 } });
ACH.push({ id: 'dix_mille_fils', name: 'Bobine', desc: 'Amasser dix mille Fils.', cond: { type: 'fils', count: 10000 }, rewards: { xp: 1000, fils: 200, title: 'Tisseur de Fils' } });

// ----- Les succès de quêtes des Cimes, sur le modèle des succès d'Incarnam -----
// Chaque série de quêtes de départ a son succès, et qui les finit toutes reçoit le titre
// « Enfant des Cimes », comme le « Fils d'Incarnam » de Dofus (docs/QUETES-INCARNAM.md).
{
const SERIE_ECAILLES = ['orsane_questions_de_kelthar', 'orsane_visages_des_cimes', 'orsane_legende_d_ithren', 'orsane_gueule_du_glouton', 'orsane_destination_toiles'];
const SERIE_PORTE = ['porte_mise_a_l_epreuve', 'porte_champs_de_bataille', 'porte_coups_d_epee_dans_l_eau', 'porte_decime_des_grouks', 'porte_chasse_aux_chapardeurs', 'porte_lecon_d_humilite', 'porte_tissefils_en_marche'];
const SERIE_ATELIERS = ['ateliers_produits_des_cimes', 'ateliers_metier_des_veilleurs', 'ateliers_la_hache_et_le_burin', 'ateliers_marcheur_un_jour', 'ateliers_preparation_au_combat'];
const SERIE_REMUE = ['remue_galette_de_brann', 'remue_mort_aux_glymets', 'remue_secret_du_grenier', 'remue_un_peu_de_pigment'];
ACH.push({ id: 'chemin_des_ecailles', name: 'Le chemin des Écailles', desc: 'Suivre la piste d\'Ithren, des questions de Kelthar jusqu\'au Seuil des Toiles.', cond: { type: 'questline', quests: SERIE_ECAILLES }, rewards: { xp: 1200, fils: 150 } });
ACH.push({ id: 'service_de_la_porte', name: 'Service de la Porte', desc: 'Accomplir les sept missions d\'Orvak, de la mise à l\'épreuve aux Tissefils qui marchent.', cond: { type: 'questline', quests: SERIE_PORTE }, rewards: { xp: 1000, fils: 120 } });
ACH.push({ id: 'mains_des_ateliers', name: 'Les mains des ateliers', desc: 'Apprendre les ateliers avec Thila, de la première fournée à la préparation au combat.', cond: { type: 'questline', quests: SERIE_ATELIERS }, rewards: { xp: 700, fils: 100 } });
ACH.push({ id: 'remue_menage_aux_cimes', name: 'Remue-ménage aux Cimes', desc: 'Rendre service à l\'auberge, au peintre et aux archives.', cond: { type: 'questline', quests: SERIE_REMUE }, rewards: { xp: 600, fils: 90 } });
ACH.push({ id: 'enfant_des_cimes', name: 'Enfant des Cimes', desc: 'Finir toutes les quêtes de départ des Cimes. Maëlis te compte parmi les siens.', cond: { type: 'questline', quests: [...SERIE_ECAILLES, ...SERIE_PORTE, ...SERIE_ATELIERS, ...SERIE_REMUE, 'orsane_instincts_primaires'] }, rewards: { xp: 1500, fils: 200, title: 'Enfant des Cimes' } });
}
