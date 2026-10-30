// Ervane, l'île de l'Éveil : le plateau continu où naissent les nouveaux Veilleurs, au-dessus
// d'Orsane (docs/ILE-DE-DEPART.md pour la conception, docs/ILE-TECHNIQUE.md pour le format).
//
// Tout dépend de l'interrupteur (content/ervane-interrupteur.js, DATA.ile, allumé, la seule ligne que
// toute page charge) : ce fichier n'est chargé que si l'île est disponible sur l'appareil, et son
// contenu est rangé dans le module `ervane`, une fonction qui ne fait rien tant que js/ile.js ne
// l'appelle pas. Éteint, le jeu ne voit ni le plateau, ni ses cartes, ni ses PNJ.
//
// Repère : u d'ouest en est (0 à 240), v du nord au sud (0 à 180), en unités ; 1 u = 1 case de
// combat. Les positions sont celles du plan du document de conception (section 2).

(DATA.modules = DATA.modules || {}).ervane = () => {
  const C = DATA.content;
  if (C.plateaux.some(p => p.id === 'ervane')) return;

  // ----- Les frontières des régions, partagées par leurs contours et par les lignes -----
  // Le ravin du Ru Clair sépare les Murets (à l'est) du Bois Cousu ; il finit au pied du coin
  // nord-ouest du village, où naît le Ru.
  const RAVIN = [[121, -12], [121, 2], [124, 14], [128, 24], [133, 34], [138, 44], [146, 52], [156, 60], [164, 70]];
  // L'escarpement qui porte les Murets au-dessus du village, et sa branche ouest, au-dessus du Bois.
  const ESCARPEMENT_SO = [[148, 92], [153, 85], [159, 77], [164, 70]];
  const ESCARPEMENT_N = [[164, 70], [180, 71], [195, 69], [205, 69], [215, 70], [228, 68], [250, 69]];
  // La lèvre de pierre blanche du village, au-dessus du vallon des Sources.
  const LEVRE = [[148, 92], [152, 96], [160, 100], [170, 103], [182, 106], [182, 137], [200, 138], [220, 137], [250, 136]];
  // La haie des Bornes, entre les Sources et l'Amarre.
  const HAIE = [[80, 92], [81.5, 98], [80, 104], [77.5, 111], [79, 118], [82, 125], [81, 132], [78.5, 141], [80, 150], [82, 157], [78, 165], [79.5, 175], [80, 190]];
  const rev = a => a.slice().reverse();

  C.plateaux.push({
    id: 'ervane', name: 'Ervane', graine: 1207,
    taille: [240, 180],
    camera: {
      azimut: 45,
      exploration: { ouverture: 20, elevation: [35, 45] },
      combat: { orthographique: true, elevation: 30 },
      champ: [18, 60], champDefaut: [26, 32],
    },
    // Un lambeau en fer à cheval, ouvert à l'ouest sur l'Échancrure.
    bord: {
      contour: [[32, 12.6], [48.5, 12.8], [72.4, 9.2], [79, 9], [88.4, 11.1], [104.4, 17.2], [110.7, 18], [123.3, 15.5], [135.8, 11.5], [152.8, 8.8], [154.6, 7.9], [166.1, 9.4], [176.8, 8.5], [183.7, 6.6], [187.9, 6.6], [194, 9.7], [199.1, 10.4], [202.1, 9.6], [207.1, 6.1], [208.3, 3.2], [216.3, 4.2], [222, 6.9], [224.2, 7], [226.5, 9.6], [227.6, 14.4], [226.9, 17.6], [231.6, 20.3], [232.2, 21.9], [236.9, 44.5], [236.1, 52.1], [232.8, 54.8], [231.5, 57.7], [233.2, 62.9], [236.3, 64.1], [235.2, 81.9], [233.8, 84], [233, 89.1], [235, 94.9], [237.2, 97.7], [236.9, 102.6], [231.5, 109], [230.3, 112.9], [231.6, 118], [233.9, 122.2], [234.6, 132], [235.6, 133.1], [234, 140], [231.7, 141.5], [228.2, 145.4], [222.3, 155], [217.7, 158.5], [207.1, 163.6], [199.1, 166], [185.7, 166.4], [170.5, 169.5], [166.4, 169.1], [156.5, 165.5], [151.8, 165.1], [147, 166.5], [141.1, 170.1], [139.1, 170.1], [137.1, 168.6], [136.1, 166.8], [129.3, 162.7], [111.2, 161.3], [106.1, 163.3], [100.8, 168.8], [99.7, 172], [97.7, 172.9], [95.6, 175.3], [86.9, 174.5], [55, 174], [22, 170], [5, 160], [2, 130], [8, 106], [3, 96], [14.1, 90.7], [16.5, 93.2], [16.1, 87.3], [14.3, 83.9], [12.8, 75.9], [15, 68.7], [15.5, 63], [10.8, 40.9], [11.1, 39.1], [13.1, 32.2], [15.9, 27.2], [25.1, 15.8], [27.9, 13.9]],
      bruit: 1.5, levre: 0.6, cone: [50, 70],
    },
    echancrure: { contour: [[-12, 86], [-10.1, 85.1], [0.7, 85.9], [31.1, 81], [31.6, 78.6], [36.7, 74.3], [41.5, 72.2], [49.7, 70.3], [64.2, 68.5], [78.3, 68.5], [99.2, 71.5], [118.9, 73], [143.8, 77], [149.6, 80.3], [151, 82.5], [159.4, 85.3], [164.2, 88.7], [165.8, 91.6], [165.9, 93.7], [163.2, 97.8], [155.2, 102.2], [154.8, 103.6], [150.9, 106.5], [143.7, 108.9], [122.8, 111.1], [117.7, 110.9], [111.5, 109.5], [106.3, 109.8], [97.2, 110.5], [94.3, 112], [91.4, 112.5], [86.5, 111.3], [60, 108], [25, 104], [0, 100], [-12, 100], [-13.2, 89.4]] },
    regions: [
      {
        zone: 'ervane_mailles', hauteur: 0, relief: 0.3, sol: 'calcaire',
        contour: [...ESCARPEMENT_SO, ...ESCARPEMENT_N.slice(1), [250, 136], ...rev(LEVRE).slice(1)],
        palette: { herbe: ['#5e8f5a', '#6a9664'], herbeClaire: '#b7d08a', terre: '#c2b48c', roche: '#e4e6da', feuillages: ['#6aa86a', '#8dbb6a'], brume: '#b4bccb', lanterne: '#f2c14e', lueur: '#fff0b8' },
        semis: [
          { sorte: 'arbre', formes: ['rond'], densite: 0.14, rayon: [1.2, 1.8] },
          { sorte: 'buisson', densite: 1.1, rayon: [0.5, 0.8] },
          { sorte: 'rocher', densite: 0.06, rayon: [0.4, 0.8] },
          { sorte: 'galet', densite: 0.8, rayon: [0.2, 0.35] },
          { sorte: 'fleurs', densite: 6, rayon: [0.3, 0.5] },
          { sorte: 'herbe', densite: 5, rayon: [0.2, 0.4] },
        ],
      },
      {
        zone: 'ervane_sources', hauteur: -4, relief: 1.4, sol: 'pre',
        contour: [[80, 92], ...LEVRE, [250, 190], ...rev(HAIE).slice(0, -1)],
        palette: { herbe: ['#6fae5f', '#7cba68'], herbeClaire: '#c9e39a', terre: '#b9a77e', roche: '#c4c7bd', feuillages: ['#78b56a', '#9ccb74'], brume: '#a9c3d6', lanterne: '#f2c14e', lueur: '#fff0b8' },
        semis: [
          { sorte: 'arbre', formes: ['rond', 'haut'], densite: 0.15, rayon: [1.1, 2.0] },
          { sorte: 'rocher', densite: 0.12, rayon: [0.5, 1.1] },
          { sorte: 'buisson', densite: 0.5, rayon: [0.5, 0.8] },
          { sorte: 'fleurs', densite: 4, rayon: [0.3, 0.5] },
          { sorte: 'galet', densite: 0.6, rayon: [0.2, 0.35] },
          { sorte: 'herbe', densite: 8, rayon: [0.2, 0.4] },
        ],
      },
      {
        zone: 'ervane_murets', hauteur: 12, relief: 1.6, sol: 'lande',
        contour: [[121, -12], [250, -12], ...rev(ESCARPEMENT_N), ...rev(RAVIN).slice(1, -1)],
        palette: { herbe: ['#a08f57', '#ad9c62'], herbeClaire: '#d6c78e', terre: '#b49a6c', roche: '#c9bfa6', feuillages: ['#8e9a52', '#a7a75c'], brume: '#d8c38f', lanterne: '#f2c14e', lueur: '#fff0b8' },
        semis: [
          { sorte: 'rocher', densite: 0.55, rayon: [0.5, 1.3] },
          { sorte: 'buisson', densite: 1.2, rayon: [0.4, 0.7] },
          { sorte: 'bruyere', densite: 1.6, rayon: [0.4, 0.7] },
          { sorte: 'arbre', formes: ['large'], densite: 0.05, rayon: [1.4, 2.0] },
          { sorte: 'arbre_mort', densite: 0.08, rayon: [0.6, 1.0] },
          { sorte: 'galet', densite: 1.2, rayon: [0.2, 0.35] },
          { sorte: 'herbe', densite: 12, rayon: [0.2, 0.4] },
        ],
      },
      {
        zone: 'ervane_bois', hauteur: 5, relief: 2.2, sol: 'sous_bois',
        contour: [[-20, -12], ...RAVIN, ...ESCARPEMENT_SO.slice(0, -1).reverse(), [30, 92], [30, 84.5], [10, 84.5], [10, 92], [-20, 92]],
        palette: { herbe: ['#3f6b55', '#4a7a5e'], herbeClaire: '#8fb59a', terre: '#7f7058', roche: '#9aa49c', feuillages: ['#2f5e4e', '#3d7060'], brume: '#7fa8a3', lanterne: '#f2c14e', lueur: '#ffe6a0' },
        semis: [
          { sorte: 'arbre', formes: ['rond', 'haut', 'large', 'pin'], densite: 2.6, rayon: [1.2, 2.2] },
          { sorte: 'fougere', densite: 3, rayon: [0.4, 0.8] },
          { sorte: 'buisson', densite: 0.6, rayon: [0.5, 0.8] },
          { sorte: 'rocher', densite: 0.15, rayon: [0.5, 1.0] },
          { sorte: 'fil', densite: 0.35 },
        ],
      },
      {
        zone: 'ervane_amarre', hauteur: 3, relief: 3, sol: 'ruines', terrasses: { pas: 2, fondu: 1.1 },
        contour: [[-20, 92], [10, 92], [10, 84.5], [30, 84.5], [30, 92], ...HAIE.slice(0, -1), [80, 190], [-20, 190]],
        palette: { herbe: ['#7d8a6a', '#8a9573'], herbeClaire: '#b9bf9e', terre: '#9a8f80', roche: '#a7a3a6', feuillages: ['#5f6f55', '#6e7b5e'], brume: '#8f87a3', lanterne: '#f2c14e', lueur: '#d9b8ff' },
        semis: [
          { sorte: 'pin_tordu', densite: 0.45, rayon: [1.0, 1.6] },
          { sorte: 'arbre_mort', densite: 0.1, rayon: [0.6, 1.0] },
          { sorte: 'rocher', densite: 0.45, rayon: [0.5, 1.2] },
          { sorte: 'borne', densite: 0.3, rayon: [0.4, 0.6] },
          { sorte: 'buisson', densite: 0.4, rayon: [0.4, 0.7] },
          { sorte: 'bruyere', densite: 0.9, rayon: [0.4, 0.7] },
          { sorte: 'galet', densite: 2.5, rayon: [0.2, 0.4] },
          { sorte: 'herbe', densite: 6, rayon: [0.2, 0.4] },
        ],
      },
    ],
    fondu: 8,
    lignes: [
      // Les falaises : franches, jamais lissées.
      { id: 'escarpement_des_murets', sorte: 'escarpement', points: [...ESCARPEMENT_SO, ...ESCARPEMENT_N.slice(1)], denivele: 12, largeur: 2 },
      { id: 'levre_des_mailles', sorte: 'escarpement', points: LEVRE, denivele: 4, largeur: 1.5 },
      // Le ravin du Ru Clair et ses passages.
      { id: 'ravin_du_ru', sorte: 'ravin', points: [...RAVIN.slice(0, -1), [162, 66]], largeur: 8, profondeur: 6, berge: 3 },
      { id: 'gue_du_ru', sorte: 'gue', points: [[149, 46.5], [136, 40], [123, 45]], largeur: 3 },
      { id: 'passerelle', sorte: 'pont', points: [[134, 18.5], [126, 20], [118, 21.5]], largeur: 2.4, matiere: 'planches', au_dessus: 'ravin' },
      { id: 'pont_de_cordes', sorte: 'pont', points: [[20, 77], [17.5, 92], [20, 107]], largeur: 2.4, matiere: 'corde', au_dessus: 'vide' },
      // Les escaliers taillés dans la pierre.
      { id: 'escalier_des_murets', sorte: 'escalier', points: [[205, 75], [205, 63.5]], largeur: 3, marches: 22 },
      { id: 'escalier_de_la_porte', sorte: 'escalier', points: [[186.5, 128.4], [178, 128.4]], largeur: 2.6, marches: 10 },
      // Les ruelles pavées du village.
      { id: 'ruelle_de_l_escalier', sorte: 'ruelle', points: [[205, 91], [205, 82], [205, 75]], largeur: 3.5 },
      { id: 'ruelle_du_belvedere', sorte: 'ruelle', points: [[196.5, 99], [186, 96.5], [176, 94.5], [170.5, 94]], largeur: 3 },
      { id: 'ruelle_de_la_porte', sorte: 'ruelle', points: [[199.5, 107.5], [194, 114], [189.5, 121], [186.5, 128.4]], largeur: 3 },
      { id: 'ruelle_des_archives', sorte: 'ruelle', points: [[211.5, 106.5], [215.5, 111]], largeur: 3 },
      { id: 'ruelle_de_la_cour', sorte: 'ruelle', points: [[212.5, 94], [218, 89.5]], largeur: 3 },
      // Les sentiers de terre : aucun segment de plus de 30 u, chaque tracé lissé.
      { id: 'sentier_des_sources', sorte: 'sentier', points: [[178, 128.4], [175, 132], [170, 140], [167, 142.5]], largeur: 2 },
      { id: 'gue_de_la_source', sorte: 'gue', points: [[167, 142.5], [160, 147.5], [153, 143]], largeur: 2.5 },
      { id: 'sentier_de_la_braise', sorte: 'sentier', points: [[153, 143], [148, 140], [132, 128], [118, 132], [105, 122]], largeur: 2 },
      { id: 'sentier_de_la_mousse', sorte: 'sentier', points: [[148, 140], [142, 155], [140, 166]], largeur: 1.8 },
      { id: 'sentier_du_confluent', sorte: 'sentier', points: [[118, 132], [108, 145], [100, 152], [92, 164]], largeur: 2 },
      { id: 'sentier_des_bornes', sorte: 'sentier', points: [[100, 152], [90, 151], [80, 150], [72, 146], [60, 135]], largeur: 2 },
      { id: 'sentier_des_murets', sorte: 'sentier', points: [[205, 63.5], [205, 58], [222, 42], [208, 34], [194, 42], [180, 48], [172, 38], [175, 28], [198, 20], [222, 12]], largeur: 2 },
      { id: 'sentier_du_gue', sorte: 'sentier', points: [[180, 48], [160, 52], [149, 46.5]], largeur: 2 },
      { id: 'sentier_de_la_lisiere', sorte: 'sentier', points: [[123, 45], [115, 56]], largeur: 2 },
      { id: 'sentier_de_la_passerelle', sorte: 'sentier', points: [[175, 28], [150, 26], [134, 18.5]], largeur: 2 },
      { id: 'sentier_des_fils', sorte: 'sentier', points: [[118, 21.5], [108, 24], [85, 22]], largeur: 2 },
      { id: 'sentier_du_bois', sorte: 'sentier', points: [[115, 56], [96, 42], [85, 22], [64, 26], [45, 30], [28, 36], [15, 40]], largeur: 2 },
      { id: 'sentier_de_la_bobine', sorte: 'sentier', points: [[96, 42], [75, 52], [56, 60], [36, 66], [22, 73], [20, 77]], largeur: 2 },
      { id: 'sentier_de_l_amarre', sorte: 'sentier', points: [[20, 107], [28, 112], [44, 114], [55, 118], [62, 128], [60, 135], [46, 138.5], [43.5, 138.5]], largeur: 2.2 },
      { id: 'sentier_de_la_nacelle', sorte: 'sentier', points: [[60, 135], [60, 150], [55, 160], [34, 163], [13, 158]], largeur: 2 },
      // Le muret ouest du village, ouvert à la Porte des Sources.
      { id: 'muret_des_mailles', sorte: 'muret', points: [[183, 108], [183, 122], [183, 136.2]], hauteur: 1, breches: [{ point: [183, 128.4], largeur: 3.2 }] },
      // Les murets de pierre sèche des Murets, ouverts là où passent les sentiers.
      { id: 'muret_du_haut', sorte: 'muret', points: [[188, 36], [191, 48], [190, 62]], hauteur: 1, breches: [{ point: [190.6, 43.6], largeur: 3.5 }] },
      { id: 'muret_des_enclos', sorte: 'muret', points: [[162, 40], [170, 46], [172, 58]], hauteur: 1, breches: [{ point: [171.4, 50.2], largeur: 3 }] },
      { id: 'muret_du_hameau', sorte: 'muret', points: [[156, 12], [160, 22], [159, 34]], hauteur: 1, breches: [{ point: [159.6, 26.8], largeur: 3.5 }] },
      { id: 'muret_du_cairn', sorte: 'muret', points: [[212, 4], [214, 18], [228, 23]], hauteur: 1, breches: [{ point: [213.5, 14.8], largeur: 3.5 }] },
      // Les haies : celle des Bornes avec son fossé et sa barrière (fermée tant que « Les lueurs
      // qui suivent » n'est pas rendue : Ardek l'ouvre), et les enclos des Haies.
      { id: 'haie_des_bornes', sorte: 'haie', points: HAIE, hauteur: 1.4, fosse: 0.6, barrieres: [{ id: 'barriere_des_bornes', point: [80, 150], largeur: 3, quete: 'ervane_lueurs' }] },
      { id: 'haie_des_enclos', sorte: 'haie', points: [[211, 30], [229, 30.5], [233, 46]], hauteur: 1.2 },
      { id: 'haie_du_terrier', sorte: 'haie', points: [[202, 50.5], [214, 53], [228, 51.5]], hauteur: 1.2, breches: [{ point: [211, 52.4], largeur: 3.5 }] },
    ],
    eaux: [
      { id: 'source_claire', sorte: 'bassin', centre: [160, 148], rayon: 5, profondeur: 1.4 },
      { id: 'mare_du_confluent', sorte: 'bassin', centre: [99, 153], rayon: 2.5, profondeur: 0.45 },
      { id: 'ru_clair', sorte: 'ru', points: [[162, 66], [156, 60], [146, 52], [138, 44], [133, 34], [128, 24], [124, 14], [121, 2], [121, -8]], largeur: 2, profondeur: 0.8 },
      { id: 'saut_du_ru', sorte: 'chute', point: [121, 2] },
      // Les ruisselets des quatre sources, peu profonds : on les traverse à gué.
      { id: 'ruisselet_claire', sorte: 'ru', points: [[155, 151], [145, 151], [130, 152.5], [115, 153], [102, 153]], largeur: 1.2, profondeur: 0.25 },
      { id: 'ruisselet_braise', sorte: 'ru', points: [[129, 131], [123, 139], [112, 147], [102, 152]], largeur: 1.2, profondeur: 0.25 },
      { id: 'ruisselet_mousse', sorte: 'ru', points: [[136, 163], [124, 160], [111, 156.5], [102, 154]], largeur: 1.2, profondeur: 0.25 },
      { id: 'ruisselet_vent', sorte: 'ru', points: [[104, 127], [100.5, 137], [99.5, 146], [99, 151]], largeur: 1.2, profondeur: 0.25 },
    ],
    places: [
      { id: 'place_du_relais', centre: [205, 100], rayon: 9, hauteur: 0, sol: 'calcaire' },
      { id: 'belvedere', centre: [169.5, 94], rayon: 3.5, sol: 'calcaire' },
      { id: 'cour_d_armes', centre: [222, 86], rayon: 5, sol: 'terre' },
      { id: 'haut_de_l_escalier', centre: [205, 58], rayon: 5, sol: 'terre' },
      { id: 'hameau_vide', centre: [175, 28], rayon: 6, sol: 'terre' },
      { id: 'clairiere_des_lueurs', centre: [45, 30], rayon: 8, sol: 'herbe' },
      { id: 'tete_du_pont', centre: [21, 73], rayon: 3.5, sol: 'terre' },
      { id: 'camp_d_ardek', centre: [28, 113], rayon: 6, sol: 'terre' },
      { id: 'rond_des_quatre', centre: [92, 164], rayon: 6, sol: 'herbe' },
      { id: 'pointe_de_la_nacelle', centre: [12, 158], rayon: 4, sol: 'calcaire' },
    ],
    trous: [{ id: 'puits', centre: [32, 140], rayon: 8, margelle: 1.2 }],
    accents: [
      { centre: [130, 125], rayon: 7, sol: 'braise' },
      { centre: [140, 166], rayon: 7, sol: 'mousse' },
      { centre: [105, 120], rayon: 7, sol: 'herbe_blanche' },
    ],
    objets: [
      // Les Mailles.
      { sorte: 'metier', u: 205, v: 98, rot: 0 },
      { sorte: 'pierre_levee', u: 198.5, v: 96 }, { sorte: 'pierre_levee', u: 211.5, v: 96 },
      { sorte: 'pierre_levee', u: 198, v: 104.5 }, { sorte: 'pierre_levee', u: 212, v: 104.5 },
      { sorte: 'comptoir', u: 192, v: 90.5, rot: 0.1, taille: [5, 2] }, { sorte: 'auvent', u: 192, v: 90.5 },
      { sorte: 'maison', u: 191.5, v: 86, rot: 0.1, taille: [7, 4], toit: 'toile' },
      { sorte: 'maison', u: 228, v: 79.5, rot: -0.2, taille: [6, 5], toit: 'toile' },
      { sorte: 'poteau', u: 219, v: 84 }, { sorte: 'poteau', u: 224, v: 83.5 }, { sorte: 'poteau', u: 226, v: 88.5 },
      { sorte: 'ratelier', u: 217.5, v: 82.5, rot: -0.4 },
      // Le petit mobilier (revue finale) : des tonneaux devant le comptoir et derrière la maison de
      // la cour, une corde à linge et une barrière entre les maisons du sud.
      { sorte: 'tonneau', u: 189.3, v: 93.2 }, { sorte: 'tonneau', u: 190.3, v: 93.9, rot: 0.7 }, { sorte: 'tonneau', u: 231.8, v: 83.2, rot: 0.3 },
      { sorte: 'linge', u: 211.5, v: 129.5, rot: 0.15, longueur: 4.5 },
      { sorte: 'barriere', u: 201, v: 129, rot: 0.3, longueur: 3.5 }, { sorte: 'tonneau', u: 222.5, v: 127.5, rot: 1.1 },
      { sorte: 'tour', u: 219.5, v: 116.5, taille: [6, 6] },
      { sorte: 'maison', u: 196, v: 119.5, rot: 0.25, taille: [6, 5], toit: 'toile' }, { sorte: 'cerf_volant', u: 196, v: 119.5 },
      { sorte: 'maison', u: 230, v: 100, rot: 0.05, taille: [6, 5], toit: 'toile' },
      { sorte: 'maison', u: 227, v: 124, rot: -0.15, taille: [6, 5], toit: 'toile' },
      { sorte: 'maison', u: 206, v: 125, rot: 0.1, taille: [5, 4], toit: 'toile' },
      { sorte: 'maison', u: 178.5, v: 84, rot: 0.35, taille: [5, 4], toit: 'toile' },
      { sorte: 'longue_vue', u: 167.5, v: 93.5 }, { sorte: 'rambarde', u: 167, v: 94, rot: 1.2 },
      { sorte: 'arche', u: 183, v: 128.4, rot: 1.5708 },
      { sorte: 'lanterne', u: 207.5, v: 87 }, { sorte: 'lanterne', u: 202.5, v: 78 }, { sorte: 'lanterne', u: 181, v: 97.5 },
      { sorte: 'lanterne', u: 191, v: 117 }, { sorte: 'lanterne', u: 214, v: 109.5 },
      { sorte: 'panneau', u: 208, v: 77.5, texte: 'Les Murets, niveaux 3 à 5' },
      // Les Murets.
      { sorte: 'tente', u: 209.5, v: 55, rot: 0.3, taille: [3, 3] }, { sorte: 'feu', u: 204, v: 54.5 },
      { sorte: 'ruine', u: 175, v: 16.5, rot: 0, taille: [7, 5] }, { sorte: 'ruine', u: 164, v: 19.5, rot: 0.25, taille: [6, 5] },
      { sorte: 'ruine', u: 163.5, v: 34, rot: -0.3, taille: [5, 5] }, { sorte: 'ruine', u: 183, v: 35.5, rot: 0.2, taille: [6, 5] },
      { sorte: 'ruine', u: 189, v: 30, rot: 0.1, taille: [6, 5] }, { sorte: 'ruine', u: 186, v: 13.5, rot: -0.15, taille: [6, 5] },
      { sorte: 'four', u: 179, v: 31 }, { sorte: 'puits_sec', u: 170, v: 31.5 },
      { sorte: 'cairn', u: 222, v: 12, hauteur: 4 },
      { sorte: 'panneau', u: 152.5, v: 51, texte: 'Le Bois Cousu, niveaux 5 à 7' },
      { sorte: 'panneau', u: 138, v: 16.5, texte: 'Le Bois Cousu, niveaux 5 à 7' },
      // Le Bois Cousu.
      { sorte: 'arbre_bobine', u: 75, v: 47.5 },
      { sorte: 'maison', u: 118.5, v: 60.5, rot: -0.5, taille: [5, 4], toit: 'toile' },
      { sorte: 'pieu', u: 18, v: 76.5 }, { sorte: 'pieu', u: 22.5, v: 76.5 },
      { sorte: 'panneau', u: 24, v: 76, texte: 'L\'Amarre, niveaux 7 à 8' },
      // L'Amarre.
      { sorte: 'tente', u: 23.5, v: 115.5, rot: -0.2, taille: [3, 3] }, { sorte: 'tente', u: 33.5, v: 109, rot: 0.4, taille: [3, 3] },
      { sorte: 'feu', u: 30, v: 115.5 },
      { sorte: 'relais', u: 22.5, v: 114.5, rot: 0.6 },
      { sorte: 'arche_brisee', u: 43.5, v: 121.5, rot: 1.2 }, { sorte: 'arche_brisee', u: 76, v: 118, rot: 0.3 },
      { sorte: 'ruine', u: 52.5, v: 130.5, rot: 0.1, taille: [9, 7] },
      { sorte: 'margelle', u: 32, v: 140, rayon: 8, largeur: 1.2 }, { sorte: 'treuil', u: 40.4, v: 137.8 },
      { sorte: 'plateforme', u: 12, v: 158, rot: 0.6 }, { sorte: 'nacelle', u: 5.5, v: 160.5, rot: 0.6 },
      { sorte: 'fil_d_or', u: 8, v: 150 },
      // Les Quatre Sources.
      { sorte: 'cairn', u: 99, v: 115.5, hauteur: 1.5 }, { sorte: 'cairn', u: 109, v: 114, hauteur: 1.8 }, { sorte: 'cairn', u: 112.5, v: 122.5, hauteur: 1.4 },
      { sorte: 'pierre_levee', u: 88, v: 160, element: 'feu' }, { sorte: 'pierre_levee', u: 96, v: 160, element: 'eau' },
      { sorte: 'pierre_levee', u: 96, v: 168, element: 'air' }, { sorte: 'pierre_levee', u: 88, v: 168, element: 'terre' },
      { sorte: 'rambarde', u: 92, v: 172, rot: 0 },
    ],
    lieux: {
      // `eveil` : où naît un nouveau Veilleur, à l'écart du cadre du Métier (vu de la caméra, le
      // Métier cachait le Veilleur né derrière sa toile : revue finale, décision de contenu). Le
      // tutoriel y commence aussi (content/tutoriel-ile.js, depart).
      metier: [205, 98], eveil: [209, 101], porte_des_sources: [182, 128], belvedere: [168, 94], nacelle: [10, 158],
      haut_escalier: [205, 58], gue: [136, 40], tete_du_pont: [22, 74], camp_ardek: [28, 112], margelle: [43, 138.5],
    },
  });

  // ----- Les zones et leurs sous-zones (une carte de plateau par sous-zone) -----
  // Chaque contour ne compte que dans la région de sa zone : il peut déborder sur une autre zone.
  const P = 'ervane';
  const R = (x0, y0, x1, y1) => [[x0, y0], [x1, y0], [x1, y1], [x0, y1]];
  const sources = { style: 'pierres' }, murets = { style: 'murets' }, bois = { style: 'troncs' }, amarre = { style: 'bornes' };
  const aire = (base, x, y, errance) => Object.assign({ x, y, errance: errance || 5 }, base);

  C.zones.push({
    id: 'ervane_mailles', name: 'Les Mailles', region: 'ervane', level: [1, 1], palette: 'orsane',
    description: 'Le village du Fil, sur une avancée de pierre blanche au fond de l\'Échancrure. Des maisons de toile cousues aux murs, le Métier au milieu : c\'est ici qu\'on se réveille.',
    maps: [
      { id: 'ervane_mailles_place', name: 'la Place du Relais', level: [1, 1], plateau: P, contour: R(187, 60, 255, 110), coords: [-1, -8],
        npcs: [{ id: 'varek_ervane', u: 201, v: 101.5 }, { id: 'sefra', u: 192, v: 93.5 }, { id: 'haldrec', u: 221, v: 90 }],
        nodes: [], groups: [], relay: { u: 205, v: 101 }, dungeon: null, porte: null },
      { id: 'ervane_mailles_belvedere', name: 'le Belvédère', level: [1, 1], plateau: P, contour: R(140, 55, 187, 110), coords: [-3, -9],
        npcs: [], nodes: [], groups: [], relay: null, dungeon: null, porte: null },
      { id: 'ervane_mailles_archives', name: 'les Archives', level: [1, 1], plateau: P, contour: R(140, 110, 255, 150), coords: [-1, -7],
        npcs: [{ id: 'grenne', u: 214, v: 116 }, { id: 'mibbe', u: 196, v: 124.5 }], nodes: [], groups: [], relay: null, dungeon: null, porte: null },
    ],
  });

  C.zones.push({
    id: 'ervane_sources', name: 'Les Quatre Sources', region: 'ervane', level: [1, 3], palette: 'orsane',
    description: 'Le vallon du bras sud, sous le village : quatre sources, quatre lignées de Glyms, et des ruisselets qui se rejoignent au Confluent. Herbe fraîche, matin clair.',
    maps: [
      { id: 'ervane_porte_des_sources', name: 'la Porte des Sources', level: [1, 1], plateau: P, contour: R(168, 92, 255, 152), coords: [-3, -7],
        npcs: [{ id: 'nolwe', u: 175.5, v: 136.5 }], nodes: [{ resource: 'herbe_de_veille', u: 171, v: 145 }],
        groups: [{ monsters: ['glym_aqua'], level: [1, 1], respawn: 30, aire: aire(sources, 177, 140, 4) }],
        relay: null, dungeon: null, porte: null },
      { id: 'ervane_source_claire', name: 'la Source Claire', level: [1, 1], plateau: P, contour: [[148, 92], [168, 92], [168, 152], [255, 152], [255, 190], [148, 190]], coords: [-3, -6],
        npcs: [], nodes: [{ resource: 'herbe_de_veille', u: 152, v: 157 }],
        groups: [
          { monsters: ['glym_aqua'], level: [1, 1], respawn: 30, aire: aire(sources, 158, 151, 5) },
          { monsters: ['glym_aqua'], level: [1, 1], respawn: 30, aire: aire(sources, 159, 126, 5) },
          { monsters: ['glym_aqua', 'glym_aqua'], level: [1, 2], respawn: 30, aire: aire(sources, 199, 144, 5) },
        ],
        relay: null, dungeon: null, porte: null },
      { id: 'ervane_source_braise', name: 'la Source de Braise', level: [1, 2], plateau: P, contour: R(118, 92, 148, 146), coords: [-5, -7],
        npcs: [], nodes: [{ resource: 'herbe_de_veille', u: 138, v: 131.5 }],
        groups: [
          { monsters: ['glym_ignis'], level: [1, 1], respawn: 30, aire: aire(sources, 123, 113, 5) },
          { monsters: ['glym_ignis'], level: [1, 1], respawn: 30, aire: aire(sources, 139, 125, 5) },
          { monsters: ['glym_ignis', 'glym_ignis'], level: [1, 2], respawn: 30, aire: aire(sources, 139, 101, 5) },
        ],
        relay: null, dungeon: null, porte: null },
      { id: 'ervane_source_mousse', name: 'la Source de Mousse', level: [1, 2], plateau: P, contour: R(118, 146, 148, 190), coords: [-4, -5],
        npcs: [], nodes: [{ resource: 'herbe_de_veille', u: 146, v: 161 }],
        groups: [
          { monsters: ['glym_terra'], level: [1, 2], respawn: 30, aire: aire(sources, 136, 145, 5) },
          { monsters: ['glym_terra'], level: [1, 2], respawn: 30, aire: aire(sources, 129, 157, 5) },
          { monsters: ['glym_terra', 'glym_terra'], level: [2, 2], respawn: 30, aire: aire(sources, 123, 138, 5) },
        ],
        relay: null, dungeon: null, porte: null },
      { id: 'ervane_source_vent', name: 'la Source du Vent', level: [2, 2], plateau: P, contour: R(70, 92, 118, 138), coords: [-6, -7],
        npcs: [], nodes: [{ resource: 'herbe_de_veille', u: 110.5, v: 128.5 }],
        groups: [
          { monsters: ['glym_aer'], level: [1, 2], respawn: 30, aire: aire(sources, 83, 109, 5) },
          { monsters: ['glym_aer'], level: [1, 2], respawn: 30, aire: aire(sources, 94, 118, 5) },
          { monsters: ['glym_aer', 'glym_aer'], level: [2, 2], respawn: 30, aire: aire(sources, 84, 120, 5) },
        ],
        relay: null, dungeon: null, porte: null },
      { id: 'ervane_confluent', name: 'le Confluent', level: [2, 3], plateau: P, contour: [[70, 138], [118, 138], [118, 190], [106, 190], [106, 158], [70, 158]], coords: [-6, -6],
        npcs: [], nodes: [{ resource: 'herbe_de_veille', u: 106, v: 147.5 }],
        groups: [
          { monsters: ['glym_ignis', 'glym_aqua'], level: [2, 3], respawn: 40, aire: aire(sources, 109, 130, 5) },
          { monsters: ['glym_aer', 'glym_terra'], level: [2, 3], respawn: 40, aire: aire(sources, 86, 131, 5) },
          { monsters: ['glym_ignis', 'glym_terra'], level: [2, 3], respawn: 40, aire: aire(sources, 85, 143, 5) },
          { monsters: ['glym_aqua', 'glym_aer'], level: [2, 3], respawn: 40, aire: aire(sources, 109, 143, 5) },
          { monsters: ['glym_ignis', 'glym_aqua', 'glym_aer'], level: [3, 3], respawn: 40, aire: aire(sources, 97, 131, 5) },
          { monsters: ['glym_terra', 'glym_aer', 'glym_aqua'], level: [3, 3], respawn: 40, aire: aire(sources, 115, 152, 5) },
        ],
        relay: null, dungeon: null, porte: null },
      { id: 'ervane_rond_des_quatre', name: 'le Rond des Quatre', level: [3, 3], plateau: P, contour: R(70, 158, 106, 190), coords: [-7, -5],
        npcs: [], nodes: [],
        groups: [{ monsters: ['glym_ignis', 'glym_aqua', 'glym_aer', 'glym_terra'], level: [3, 3], respawn: 60, aire: aire(sources, 98, 149, 4) }],
        relay: null, dungeon: null, porte: null },
    ],
  });

  C.zones.push({
    id: 'ervane_murets', name: 'Les Murets', region: 'ervane', level: [3, 5], palette: 'orsane',
    description: 'Un haut plateau venteux au-dessus du village, découpé en enclos de pierre sèche. Au milieu, un hameau du Fil vidé depuis que les Lampignons ont pris racine sous les murs.',
    maps: [
      { id: 'ervane_haut_escalier', name: 'le Haut de l\'Escalier', level: [3, 3], plateau: P, contour: R(194, 54, 255, 75), coords: [-1, -11],
        npcs: [{ id: 'pelk', u: 202.5, v: 58.5 }], nodes: [],
        groups: [
          { monsters: ['lampignon'], level: [3, 3], respawn: 45, aire: aire(murets, 186, 53, 4) },
          { monsters: ['lampignon'], level: [3, 3], respawn: 45, aire: aire(murets, 223, 52, 4) },
        ],
        relay: null, dungeon: null, porte: null },
      { id: 'ervane_haies', name: 'les Haies', level: [3, 4], plateau: P, contour: R(194, 36, 255, 54), coords: [0, -11],
        npcs: [], nodes: [{ resource: 'bois_noueux', u: 210, v: 39 }, { resource: 'bois_noueux', u: 226, v: 35 }, { resource: 'bois_noueux', u: 231.5, v: 50 }, { resource: 'bois_noueux', u: 218, v: 47.5 }, { resource: 'bois_noueux', u: 202, v: 45.5 }],
        groups: [
          { monsters: ['lampignon'], level: [3, 4], respawn: 45, aire: aire(murets, 186, 41, 5) },
          { monsters: ['lampignon'], level: [3, 4], respawn: 45, aire: aire(murets, 209, 23, 5) },
          { monsters: ['lampignon', 'lampignon'], level: [3, 3], respawn: 45, aire: aire(murets, 213, 49, 5) },
          { monsters: ['lampignon', 'lampignon'], level: [3, 3], respawn: 45, aire: aire(murets, 196, 23, 5) },
        ],
        relay: null, dungeon: null, porte: null },
      { id: 'ervane_les_murets', name: 'les Murets', level: [4, 4], plateau: P, contour: R(110, 36, 194, 75), coords: [-2, -11],
        npcs: [], nodes: [],
        groups: [
          { monsters: ['lampignard'], level: [4, 4], respawn: 45, aire: aire(murets, 162, 44, 5) },
          { monsters: ['lampignard'], level: [4, 4], respawn: 45, aire: aire(murets, 172, 54, 5) },
          { monsters: ['lampignon', 'lampignon'], level: [4, 4], respawn: 45, aire: aire(murets, 174, 42, 5) },
        ],
        relay: null, dungeon: null, porte: null },
      { id: 'ervane_hameau', name: 'le Hameau Vide', level: [4, 5], plateau: P, contour: R(110, -15, 198, 36), coords: [-3, -12],
        npcs: [], nodes: [],
        groups: [
          { monsters: ['lampignon'], level: [4, 5], respawn: 45, aire: aire(murets, 142, 14, 5) },
          { monsters: ['lampignon'], level: [4, 5], respawn: 45, aire: aire(murets, 142, 26, 5) },
          { monsters: ['lampignard'], level: [5, 5], respawn: 45, aire: aire(murets, 132, 20, 5) },
          { monsters: ['lampignard'], level: [5, 5], respawn: 45, aire: aire(murets, 141, 4, 5) },
          { monsters: ['lampignard', 'lampignon'], level: [4, 5], respawn: 45, aire: aire(murets, 193, 4, 5) },
        ],
        relay: null, dungeon: null, porte: null },
      { id: 'ervane_cairn', name: 'le Cairn du Vent', level: [5, 5], plateau: P, contour: R(198, -15, 255, 36), coords: [0, -13],
        npcs: [], nodes: [],
        groups: [
          { monsters: ['lampignard'], level: [7, 7], respawn: 120, aire: aire(murets, 204, 11, 4) },
          { monsters: ['lampignard', 'lampignard'], level: [4, 4], respawn: 45, aire: aire(murets, 221, 16, 5) },
        ],
        relay: null, dungeon: null, porte: null },
    ],
  });

  C.zones.push({
    id: 'ervane_bois', name: 'Le Bois Cousu', region: 'ervane', level: [5, 7], palette: 'orsane',
    description: 'Le bras nord de l\'île : de grands arbres sombres que des fils blancs relient d\'un tronc à l\'autre. Les troncs coupent la vue, les Loches y flottent comme des braises.',
    maps: [
      { id: 'ervane_gue', name: 'le Gué et la Passerelle', level: [5, 5], plateau: P, contour: R(108, -15, 170, 46), coords: [-5, -11],
        npcs: [], nodes: [{ resource: 'bois_de_cime', u: 113.5, v: 33 }],
        groups: [
          { monsters: ['filin', 'filin'], level: [5, 5], respawn: 50, aire: aire(bois, 102, 17, 5) },
          { monsters: ['filin', 'filin'], level: [5, 5], respawn: 50, aire: aire(bois, 107, 37, 5) },
        ],
        relay: null, dungeon: null, porte: null },
      { id: 'ervane_lisiere', name: 'la Lisière Cousue', level: [5, 6], plateau: P, contour: [[100, 40], [108, 40], [108, 46], [170, 46], [170, 95], [100, 95]], coords: [-6, -11],
        npcs: [{ id: 'yssel', u: 114, v: 58.5 }], nodes: [{ resource: 'herbe_de_veille', u: 104.5, v: 50.5 }, { resource: 'bois_de_cime', u: 124, v: 63.5 }],
        groups: [
          { monsters: ['filin', 'filin', 'tissefil'], level: [5, 6], respawn: 50, aire: aire(bois, 125, 59, 5) },
          { monsters: ['filin', 'filin', 'tissefil'], level: [5, 6], respawn: 50, aire: aire(bois, 97, 56, 5) },
          { monsters: ['filin', 'tissefil'], level: [6, 6], respawn: 50, aire: aire(bois, 143, 63, 5) },
        ],
        relay: null, dungeon: null, porte: null },
      { id: 'ervane_fils_croises', name: 'les Fils Croisés', level: [6, 6], plateau: P, contour: R(64, -15, 108, 40), coords: [-7, -12],
        npcs: [], nodes: [{ resource: 'herbe_de_veille', u: 76, v: 26.5 }, { resource: 'bois_de_cime', u: 94.5, v: 29 }],
        groups: [
          { monsters: ['tissefil', 'tissefil'], level: [6, 6], respawn: 50, aire: aire(bois, 77, 12, 5) },
          { monsters: ['tissefil', 'tissefil'], level: [6, 6], respawn: 50, aire: aire(bois, 68, 28, 5) },
        ],
        relay: null, dungeon: null, porte: null },
      { id: 'ervane_arbre_bobine', name: 'l\'Arbre-Bobine', level: [6, 7], plateau: P, contour: [[30, 46], [64, 46], [64, 40], [100, 40], [100, 95], [42, 95], [42, 62], [30, 62]], coords: [-8, -11],
        npcs: [], nodes: [{ resource: 'herbe_de_veille', u: 66, v: 58 }, { resource: 'bois_de_cime', u: 83, v: 57.5 }],
        groups: [
          { monsters: ['tissefil', 'loche'], level: [6, 7], respawn: 50, aire: aire({ style: 'racines' }, 67, 55, 5) },
          { monsters: ['tissefil', 'loche'], level: [6, 7], respawn: 50, aire: aire({ style: 'racines' }, 81, 37, 5) },
          { monsters: ['loche', 'loche'], level: [6, 6], respawn: 50, aire: aire(bois, 43, 56, 5) },
          { monsters: ['loche', 'loche'], level: [6, 6], respawn: 50, aire: aire(bois, 30, 39, 5) },
        ],
        relay: null, dungeon: null, porte: null },
      { id: 'ervane_clairiere', name: 'la Clairière des Lueurs', level: [7, 7], plateau: P, contour: R(30, -15, 64, 46), coords: [-9, -12],
        npcs: [], nodes: [{ resource: 'herbe_de_veille', u: 52.5, v: 35 }, { resource: 'bois_de_cime', u: 39, v: 37.5 }],
        groups: [
          { monsters: ['loche', 'loche'], level: [7, 7], respawn: 50, aire: aire({ style: 'libre' }, 41, 19, 5) },
          { monsters: ['loche', 'loche'], level: [7, 7], respawn: 50, aire: aire({ style: 'libre' }, 54, 37, 5) },
          { monsters: ['loche', 'loche', 'filin'], level: [7, 7], respawn: 50, aire: aire(bois, 55, 6, 5) },
        ],
        relay: null, dungeon: null, porte: null },
      { id: 'ervane_hautes_toiles', name: 'les Hautes Toiles', level: [7, 7], plateau: P, contour: R(-15, -15, 30, 62), coords: [-11, -11],
        npcs: [], nodes: [{ resource: 'bois_de_cime', u: 19.5, v: 45.5 }],
        groups: [
          { monsters: ['tissefil', 'tissefil', 'loche'], level: [7, 7], respawn: 50, aire: aire(bois, 10, 29, 5) },
          { monsters: ['tissefil', 'tissefil', 'loche'], level: [7, 7], respawn: 50, aire: aire(bois, 21, 10, 5) },
        ],
        relay: null, dungeon: null, porte: null },
      { id: 'ervane_tete_du_pont', name: 'la Tête du Pont', level: [5, 5], plateau: P, contour: R(-15, 62, 42, 95), coords: [-10, -10],
        npcs: [], nodes: [], groups: [], relay: null, dungeon: null, porte: null },
    ],
  });

  C.zones.push({
    id: 'ervane_amarre', name: 'L\'Amarre', region: 'ervane', level: [7, 8], palette: 'orsane',
    description: 'La pointe sud-ouest, où le fil d\'or remonte des nuages : les ruines d\'un poste du Fil sur des terrasses de calcaire gris. Partout, des galets qui bougent.',
    maps: [
      { id: 'ervane_pont', name: 'le Pont de cordes', level: [7, 7], plateau: P, contour: R(5, 75, 35, 104), coords: [-10, -9],
        npcs: [], nodes: [], groups: [], relay: null, dungeon: null, porte: null },
      { id: 'ervane_camp_ardek', name: 'le camp d\'Ardek', level: [7, 7], plateau: P, contour: R(-15, 104, 42, 126), coords: [-10, -8],
        npcs: [{ id: 'ardek', u: 30.5, v: 109.5 }], nodes: [], groups: [], relay: { u: 24.5, v: 112.8 }, dungeon: null, porte: null },
      { id: 'ervane_arcades', name: 'les Arcades', level: [7, 7], plateau: P, contour: R(42, 95, 85, 127), coords: [-9, -8],
        npcs: [], nodes: [{ resource: 'pierre_de_calcaire', u: 50, v: 120.5 }],
        groups: [
          { monsters: ['krobbet', 'gravelin'], level: [7, 7], respawn: 60, aire: aire(amarre, 43, 103, 5) },
          { monsters: ['krobbet', 'gravelin'], level: [7, 7], respawn: 60, aire: aire(amarre, 55, 106, 5) },
          { monsters: ['meuliere', 'krobbet'], level: [7, 7], respawn: 60, aire: aire(amarre, 60, 115, 4) },
        ],
        relay: null, dungeon: null, porte: null },
      { id: 'ervane_vieux_poste', name: 'le Vieux Poste', level: [7, 7], plateau: P, contour: R(46, 127, 85, 148), coords: [-8, -7],
        npcs: [], nodes: [{ resource: 'pierre_de_calcaire', u: 66.5, v: 131 }],
        groups: [
          { monsters: ['krobbet', 'krobbet', 'gravelin'], level: [7, 7], respawn: 60, aire: aire(amarre, 47, 137, 5) },
          { monsters: ['krobbet', 'krobbet', 'gravelin'], level: [7, 7], respawn: 60, aire: aire(amarre, 60, 132, 5) },
          { monsters: ['krobbet', 'gravelin'], level: [8, 8], respawn: 60, aire: aire(amarre, 62, 153, 5) },
        ],
        relay: null, dungeon: null, porte: null },
      { id: 'ervane_margelle', name: 'la Margelle', level: [7, 8], plateau: P, contour: [[-15, 126], [42, 126], [42, 127], [46, 127], [46, 150], [-15, 150]], coords: [-10, -6],
        npcs: [], nodes: [{ resource: 'pierre_de_calcaire', u: 46.5, v: 132.5 }],
        groups: [
          { monsters: ['meuliere', 'krobbet', 'gravelin'], level: [7, 7], respawn: 60, aire: aire(amarre, 5, 118, 5) },
          { monsters: ['meuliere', 'krobbet', 'gravelin'], level: [7, 7], respawn: 60, aire: aire(amarre, 6, 139, 4) },
          { monsters: ['meuliere', 'krobbet', 'gravelin'], level: [8, 8], respawn: 60, aire: aire(amarre, -2, 128, 4) },
        ],
        // La porte du Puits de l'Amarre, au treuil de la margelle.
        relay: null, dungeon: 'puits_de_l_amarre', porte: { u: 41.6, v: 138.3 } },
      { id: 'ervane_champ_des_bornes', name: 'le Champ des Bornes', level: [7, 8], plateau: P, contour: [[24, 150], [46, 150], [46, 148], [85, 148], [85, 190], [24, 190]], coords: [-9, -5],
        npcs: [], nodes: [{ resource: 'pierre_de_calcaire', u: 63, v: 151.5 }, { resource: 'pierre_de_calcaire', u: 35, v: 165.5 }],
        groups: [
          { monsters: ['krobbet', 'gravelin'], level: [8, 8], respawn: 60, aire: aire(amarre, 38, 157, 5) },
          { monsters: ['krobbet', 'gravelin'], level: [8, 8], respawn: 60, aire: aire(amarre, 16, 159, 5) },
          { monsters: ['meuliere', 'gravelin', 'gravelin'], level: [8, 8], respawn: 60, aire: aire(amarre, 57, 163, 4) },
        ],
        relay: null, dungeon: null, porte: null },
      { id: 'ervane_nacelle', name: 'la Pointe de la Nacelle', level: [8, 8], plateau: P, contour: R(-15, 150, 24, 190), coords: [-11, -6],
        npcs: [{ id: 'kolm', u: 13.5, v: 155 }], nodes: [], groups: [], relay: null, dungeon: null, porte: null },
    ],
  });

  // ----- Les PNJ d'Ervane -----
  // Varek d'Ervane a son propre identifiant : une étape « parler à Varek » ne compte pas des deux
  // côtés du Fil. Même nom, même allure que celui d'Orsane.
  C.npcs.push(
    { id: 'varek_ervane', name: 'Varek', title: 'Relayeur du Fil', look: 'garde',
      dialogue: ['Doucement. Tu as dormi trois jours, et tu viens de traverser un Voile. Bienvenue sur Ervane, Veilleur.', 'Le Métier t\'a remonté jusqu\'ici. Touche le Relais quand tu veux : il te ramènera toujours aux Mailles.'] },
    { id: 'sefra', name: 'Sefra', title: 'Marchande des Mailles', look: 'marchand',
      dialogue: ['Du pain, des potions, de quoi tenir debout. Le reste, tu le trouveras au bord des sources.', 'Les cailloux tièdes des sources, je les reprends. Ne me demande pas ce que j\'en fais.'],
      shop: ['pain_de_cime', 'potion_de_relais', 'coiffe_marcheur', 'cape_marcheur', 'amulette_marcheur', 'bottes_marcheur'] },
    { id: 'haldrec', name: 'Haldrec', title: 'Maître d\'armes', look: 'garde',
      dialogue: ['Une arme ne fait pas le Veilleur. Mais elle aide, les jours où le Veilleur hésite.', 'Les poteaux ne rendent pas les coups. Les Lampignards, si.'] },
    { id: 'grenne', name: 'Grenne', title: 'Archiviste des Mailles', look: 'ancien',
      dialogue: ['Toute l\'île est peinte sur ces murs. Enfin, presque : le Bois ne se laisse pas dessiner.', 'Les Glyms des Sources descendent de ceux d\'Orsane. Une affaire de famille, comme toujours.'] },
    { id: 'mibbe', name: 'Mibbe', title: 'Enfant des Mailles', look: 'enfant',
      dialogue: ['Mon cerf-volant est parti avec le vent. Et le vent, il va toujours vers la Source du Vent.', 'Tu sais voler, toi ? Non ? Moi non plus. Mais mon cerf-volant, oui.'] },
    { id: 'nolwe', name: 'Nolwé', title: 'Gardienne des Sources', look: 'tisseur',
      dialogue: ['Quatre sources, quatre lignées de Glyms. Chacune garde son élément.', 'Chaque Glym craint l\'eau d\'à côté. Regarde leur fiche avant de frapper, pas après.'] },
    { id: 'pelk', name: 'Pelk', title: 'Bâtisseur de murets', look: 'artisan',
      dialogue: ['Un muret, ça se monte pierre par pierre. Ça se démonte d\'un coup de corne.', 'Les Lampignons ont pris racine sous les murs du hameau. Bientôt, plus rien ne tiendra là-haut.'] },
    { id: 'yssel', name: 'Yssel', title: 'Veilleuse du Bois', look: 'marcheur',
      dialogue: ['Ne tire pas sur les fils blancs. Personne ne sait qui les a tendus, et personne ne veut le savoir.', 'Dans le Bois, ce que tu ne vois pas ne te voit pas non plus. Sers-t\'en.'] },
    { id: 'ardek', name: 'Ardek', title: 'Gardien de l\'Amarre', look: 'garde',
      dialogue: ['Écoute. Ce craquement, c\'est l\'île. Quelque chose mange notre fil.', 'Le Relais de l\'Amarre est à toi. Si l\'île te secoue trop, c\'est ici que tu reviendras.'] },
    // Kolm offre le passage de la Nacelle vers la Place du Relais d'Orsane, une fois « La descente »
    // rendue (docs/ILE-TECHNIQUE.md, 2.9) ; la Nacelle d'Orsane remonte (content/ervane-orsane.js).
    { id: 'kolm', name: 'Kolm', title: 'Passeur de la Nacelle', look: 'marcheur',
      dialogue: ['Tiens-toi au bord, ne regarde pas en bas. Enfin si, regarde : c\'est Orsane.', 'La Nacelle descend quand le Fil le dit. Pour l\'instant, il dit d\'attendre.'],
      passage: { vers: 'orsane_cimes_place', arrivee: { x: 7, y: 9 }, texte: 'Descendre par la Nacelle', quete: 'ervane_descente' } },
  );
  // La Nacelle d'Orsane : Varek (content/orsane.js) remonte sur Ervane celui qui a rendu « La
  // descente ». Dans ce module, et non dans celui d'Orsane par personnage : une sauvegarde doit se
  // valider de la même façon sur toute page où l'île est disponible (docs/ILE-TECHNIQUE.md, 7.2).
  const varekOrsane = C.npcs.find(n => n.id === 'varek');
  if (varekOrsane) varekOrsane.passage = { vers: 'ervane_nacelle', arrivee: { lieu: 'nacelle' }, texte: 'Monter sur Ervane par la Nacelle', quete: 'ervane_descente' };

  // ----- Les ressources d'Ervane -----
  // Le butin des Glyms des Sources est minéral (pas de plumes, pas de panoplie par élément : les
  // Glyms sont une branche de la famille Glym, docs/ILE-DE-DEPART.md, 4). La nichée de Krobb laisse
  // du gravier mâché ; Krobb lui-même, sa dent, que le Puits remet aussi. Le Lampignon des Murets sème
  // ses spores, le Lampignard laisse la bave de son bâton.
  C.resources.push(
    { id: 'spore_lumineuse', name: 'Spore lumineuse', lore: 'Une poussière de coiffe qui luit encore dans le creux de la main. Les Lampignons en sèment partout où ils poussent.',
      drops: [{ monster: 'lampignon', rate: 30 }], node: null, price: 4 },
    { id: 'bave_de_lampignard', name: 'Bave de Lampignard', lore: 'Une goutte verte qui coule du bâton sans jamais tomber tout à fait. Elle luit plus fort quand on la secoue.',
      drops: [{ monster: 'lampignard', rate: 30 }], node: null, price: 5 },
    { id: 'eclat_de_source', name: 'Éclat de source', lore: 'Un caillou lisse qui garde la tiédeur de sa source. Sefra les reprend, sans dire pourquoi.',
      drops: [{ monster: 'glym_ignis', rate: 40 }, { monster: 'glym_aqua', rate: 40 }, { monster: 'glym_aer', rate: 40 }, { monster: 'glym_terra', rate: 40 }], node: null, price: 4 },
    { id: 'gravier_d_amarre', name: 'Gravier d\'amarre', lore: 'Du fil d\'or mâché pris dans la pierre. Il pèse plus qu\'il ne devrait.',
      drops: [{ monster: 'krobbet', rate: 35 }, { monster: 'gravelin', rate: 35 }, { monster: 'meuliere', rate: 35 }, { monster: 'krobb', rate: 50 }], node: null, price: 6 },
    { id: 'dent_de_krobb', name: 'Dent de Krobb', lore: 'Une dent de meule, lourde, ébréchée par cent ans de fil d\'or.',
      drops: [{ monster: 'krobb', rate: 100 }], node: null, price: 40 },
  );

  // ----- La Panoplie du Ronge-Amarre (niveau 8) : force et vitalité, fabriquée à Orsane -----
  // Il n'y a pas d'atelier sur l'île : on ramasse ici, on fabrique en bas, chez Thila, Rilka et Korvel.
  C.sets.push({
    id: 'ronge_amarre', name: 'Panoplie du Ronge-Amarre', family: ['krobbet', 'gravelin', 'meuliere', 'krobb'], level: 8,
    profile: { force: 50, vita: 40, sagesse: 10 },
    pieces: [
      { slot: 'coiffe', id: 'coiffe_ronge_amarre', name: 'Coiffe du Ronge-Amarre', lore: 'Un bonnet de cuir piqué de gravier d\'or. Lourd sur la tête, mais rien ne la fend.' },
      { slot: 'cape', id: 'cape_ronge_amarre', name: 'Cape du Ronge-Amarre', lore: 'De la toile du Fil, cousue de galets mâchés : elle sonne un peu quand on marche.' },
      { slot: 'amulette', id: 'amulette_ronge_amarre', name: 'Amulette du Ronge-Amarre', lore: 'Une dent de Krobb au bout d\'un fil d\'or. Elle a mordu l\'amarre ; elle tient à un cou.' },
      { slot: 'ceinture', id: 'ceinture_ronge_amarre', name: 'Ceinture du Ronge-Amarre', lore: 'Du calcaire taillé en plaques, enfilé sur une lanière. On se tient droit, on n\'a pas le choix.' },
      { slot: 'bottes', id: 'bottes_ronge_amarre', name: 'Bottes du Ronge-Amarre', lore: 'Semelles de pierre, tige de cuir. Les galets s\'écartent, on ne sait pas pourquoi.' },
    ],
    bonusProfile: { force: 60, vita: 40 },
    lore: 'Pierre, gravier et fil d\'or : ce qui reste de l\'amarre, porté par ceux qui l\'ont défendue.',
  });
  const RA = (result, workshop, pairs) => C.recipes.push({ result, count: 1, workshop, ingredients: pairs.map(([id, count]) => ({ id, count })) });
  RA('coiffe_ronge_amarre', 'tailleur', [['gravier_d_amarre', 5], ['pierre_de_calcaire', 2], ['herbe_de_veille', 2]]);
  RA('cape_ronge_amarre', 'tailleur', [['gravier_d_amarre', 6], ['pierre_de_calcaire', 2]]);
  RA('amulette_ronge_amarre', 'bijoutier', [['dent_de_krobb', 1], ['gravier_d_amarre', 3], ['pierre_de_calcaire', 2]]);
  RA('ceinture_ronge_amarre', 'cordonnier', [['pierre_de_calcaire', 4], ['gravier_d_amarre', 3]]);
  RA('bottes_ronge_amarre', 'cordonnier', [['gravier_d_amarre', 4], ['pierre_de_calcaire', 3], ['herbe_de_veille', 1]]);

  // ----- Les quêtes : la ligne principale (docs/ILE-DE-DEPART.md, 6) -----
  // XP à la règle des quêtes secondaires (24 × niveau^1,6) : l'île apprend, elle ne fait pas sauter
  // de niveaux. Chaque quête a son `turnIn`. Les combats imposés tiennent 80 % par classe au bot
  // (tests/balance.js --ile).
  C.quests.push(
    { id: 'ervane_eveil', name: 'L\'éveil', level: 1, main: true,
      giver: 'varek_ervane', turnIn: 'nolwe', requires: { level: 1, quests: [] },
      steps: [
        { type: 'talk', npc: 'sefra', text: 'Se présenter à Sefra, au Comptoir' },
        { type: 'talk', npc: 'nolwe', text: 'Descendre à la Porte des Sources, voir Nolwé' },
        { type: 'kill', monster: 'glym_aqua', count: 1, text: 'Vaincre un Glym Aqua près de la Porte' },
      ],
      dialogue: {
        offer: ['Doucement. Tu as dormi trois jours, et tu viens de traverser un Voile. Bienvenue sur Ervane, Veilleur.', 'Le Fil t\'a remonté jusqu\'ici pour que tu apprennes sans danger. Sefra tient le Comptoir, là-bas sous l\'auvent : va te présenter.', 'Puis descends à la Porte des Sources. Nolwé t\'y attend, et un Glym aussi.'],
        progress: ['Un Glym Aqua rôde près de la Porte des Sources, en bas de la ruelle. Va le vaincre, puis reviens voir Nolwé : Varek te rejoint pour le combat.'],
        done: ['Un Glym de moins autour de la Porte, et un Veilleur de plus qui sait frapper. Varek avait raison de te faire descendre.'],
      },
      rewards: { xp: 24, fils: 20, items: [{ id: 'pain_de_cime', count: 2 }, { id: 'coiffe_marcheur', count: 1 }] } },
    { id: 'ervane_quatre_sources', name: 'Les quatre Sources', level: 2, main: true,
      giver: 'nolwe', turnIn: 'nolwe', requires: { level: 2, quests: ['ervane_eveil'] },
      steps: [
        { type: 'kills', kills: [{ monster: 'glym_ignis', count: 1 }, { monster: 'glym_aer', count: 1 }, { monster: 'glym_terra', count: 1 }], text: 'Vaincre un Glym Ignis, un Glym Aer et un Glym Terra, dans l\'ordre qu\'on veut' },
        { type: 'collect', item: 'eclat_de_source', count: 2, text: 'Rapporter deux Éclats de source' },
      ],
      dialogue: {
        offer: ['Quatre sources, quatre lignées de Glyms. Chacune garde son élément, et chacune craint celui d\'à côté.', 'Va voir les trois autres : la Braise à l\'ouest, la Mousse au sud, le Vent au bord du vide. Regarde leur fiche avant de frapper, pas après.', 'Rapporte-moi deux Éclats de source. Ils tombent de leur crête quand ils s\'éteignent.'],
        progress: ['Le feu craint l\'eau, la terre craint l\'air. Choisis ton sort selon le Glym, pas l\'inverse.'],
        done: ['Tièdes, encore. Tu as compris la leçon des Sources : on ne frappe pas tout de la même façon.'],
      },
      rewards: { xp: 73, fils: 15, items: [{ id: 'sandales_de_duvet', count: 1 }] } },
    { id: 'ervane_lecon', name: 'La leçon de Haldrec', level: 3, main: true,
      giver: 'nolwe', turnIn: 'haldrec', requires: { level: 2, quests: ['ervane_quatre_sources'] },
      steps: [
        { type: 'level', level: 3, text: 'Atteindre le niveau 3' },
        { type: 'equip', slot: 'coiffe', text: 'Porter une coiffe' },
      ],
      dialogue: {
        offer: ['Tu as les gestes. Il te manque la tête, et Haldrec, dans sa cour d\'armes, s\'en occupe.', 'Monte au village quand tu auras pris un peu de niveau. Couvre-toi avant d\'entrer dans sa cour : il y tient.'],
        progress: ['Les Glyms du Confluent vont par deux. Ils te feront passer le niveau 3 plus vite que les autres.'],
        done: ['Une coiffe. Bien. Maintenant écoute : cinq points par niveau, à placer dans tes caractéristiques. Et un point de sort.', 'Au contact, un ennemi te tacle : partir lui coûte des points d\'action et de mouvement. La Fuite t\'en rend ; le Tacle, c\'est toi qui retiens. Retiens-le.'],
      },
      rewards: { xp: 139, fils: 15, items: [{ id: 'potion_de_relais', count: 1 }] } },
    { id: 'ervane_ronde', name: 'La Ronde des Quatre', level: 4, main: true,
      giver: 'haldrec', turnIn: 'varek_ervane', requires: { level: 4, quests: ['ervane_lecon'] },
      steps: [
        { type: 'equip', slot: 'bottes', text: 'Porter des bottes' },
        { type: 'kills', unCombat: true, kills: [{ monster: 'glym_ignis', count: 1 }, { monster: 'glym_aqua', count: 1 }, { monster: 'glym_aer', count: 1 }, { monster: 'glym_terra', count: 1 }], text: 'Vaincre la Ronde des Quatre, au Rond des Quatre, en un seul combat' },
      ],
      dialogue: {
        offer: ['Au bout du vallon, au bord du vide, les quatre lignées tournent ensemble : la Ronde des Quatre.', 'Chausse-toi, descends-y, et bats-les tous les quatre dans le même combat. Un seul. Varek voudra l\'entendre de ta bouche.'],
        progress: ['Quatre Glyms, quatre éléments : commence par celui que tes sorts blessent le plus, et garde l\'autre pour la fin.'],
        done: ['La Ronde, à ton niveau. Les Sources n\'ont plus rien à t\'apprendre. Les Murets, si.'],
      },
      rewards: { xp: 221, fils: 20, items: [{ id: 'ceinture_de_plume', count: 1 }, { id: 'potion_de_relais', count: 1 }] } },
    { id: 'ervane_hameau_vide', name: 'Le hameau vide', level: 4, main: true,
      giver: 'varek_ervane', turnIn: 'pelk', requires: { level: 4, quests: ['ervane_ronde'] },
      steps: [
        { type: 'talk', npc: 'pelk', text: 'Monter l\'Escalier des Murets et parler à Pelk' },
        { type: 'kills', kills: [{ monster: 'lampignon', count: 3 }, { monster: 'lampignard', count: 1 }], text: 'Vaincre trois Lampignons et un Lampignard sur les Murets' },
      ],
      dialogue: {
        offer: ['Au nord du village, l\'escalier monte sur les Murets. Pelk y bâtit des murets de pierre sèche que les Lampignons défont la nuit, à force de pousser dessous.', 'Va lui prêter main-forte. Les Lampignards cognent du bâton : apprends à te placer avant qu\'ils frappent.'],
        progress: ['Un muret de côté, jamais dans le dos : un coup de bâton t\'y écraserait.'],
        done: ['Trois Lampignons et leur grand frère. Le hameau respire. Tiens, une pelle : elle creuse, et elle cogne.'],
      },
      rewards: { xp: 221, fils: 25, items: [{ id: 'pelle_noueuse', count: 1 }] } },
    { id: 'ervane_vieux_grouk', name: 'Le vieux Lampignard', level: 5, main: true,
      giver: 'pelk', turnIn: 'pelk', requires: { level: 5, quests: ['ervane_hameau_vide'] },
      steps: [
        { type: 'equip', slot: 'arme', text: 'Porter une arme' },
        { type: 'kill', monster: 'lampignard', count: 1, text: 'Vaincre le vieux Lampignard, au Cairn du Vent' },
      ],
      dialogue: {
        offer: ['Au Cairn du Vent, tout en haut, a poussé un Lampignard deux fois plus vieux que les autres, la coiffe toute rousse.', 'C\'est lui qui mène les siens sous mes murets, son bâton qui bave en tête. Prends une arme, monte, et règle ça.'],
        progress: ['L\'arme est le premier sort de ta barre. Elle ne coûte rien de plus que des points d\'action.'],
        done: ['Le vieux est tombé, et son bâton a cessé de baver. Les murets tiendront un hiver de plus. Yssel, dans le Bois, a besoin d\'un bras comme le tien.'],
      },
      rewards: { xp: 315, fils: 30, items: [{ id: 'cape_de_plumes', count: 1 }] } },
    { id: 'ervane_fils', name: 'Les fils du Bois', level: 6, main: true,
      giver: 'pelk', turnIn: 'yssel', requires: { level: 5, quests: ['ervane_vieux_grouk'] },
      steps: [
        { type: 'talk', npc: 'yssel', text: 'Passer le Gué ou la Passerelle et trouver Yssel, à la Lisière Cousue' },
        { type: 'kills', kills: [{ monster: 'filin', count: 3 }, { monster: 'tissefil', count: 1 }], text: 'Vaincre trois Filins et un Tissefil' },
        { type: 'gather', resource: 'bois_de_cime', count: 3, text: 'Couper trois Bois de Cime dans le Bois Cousu' },
      ],
      dialogue: {
        offer: ['De l\'autre côté du ravin, le Bois Cousu. Yssel y veille, dans sa cabane de la Lisière.', 'Passe par le Gué ou la Passerelle, et dis-lui que je t\'envoie. Elle te dira le reste.'],
        progress: ['Dans le Bois, les troncs coupent la vue. Ce que tu ne vois pas ne te voit pas non plus.'],
        done: ['Trois Filins, un Tissefil, et du bois pour mon toit. Tu sais te servir des troncs, maintenant : ça va compter.'],
      },
      rewards: { xp: 422, fils: 35, items: [{ id: 'amulette_de_bec', count: 1 }] } },
    { id: 'ervane_lueurs', name: 'Les lueurs qui suivent', level: 7, main: true,
      giver: 'yssel', turnIn: 'ardek', requires: { level: 6, quests: ['ervane_fils'] },
      steps: [
        { type: 'kill', monster: 'loche', count: 3, text: 'Éteindre trois Loches dans le Bois Cousu' },
        { type: 'visit', map: 'ervane_pont', text: 'Traverser le Pont de cordes vers l\'Amarre' },
      ],
      dialogue: {
        offer: ['Les Loches flottent entre les arbres comme des braises qui se promènent. Elles suivent qui passe, et elles brûlent.', 'Éteins-en trois, puis va jusqu\'au Pont de cordes, à la pointe ouest. Ardek, de l\'autre côté, a besoin de savoir que le Bois est tranquille. Il t\'ouvrira la Barrière des Bornes.'],
        progress: ['Les Loches ne chargent pas : elles t\'attendent. Frappe de loin, ou frappe la première.'],
        done: ['Tu viens du Bois ? Alors tu as entendu, toi aussi. Ce craquement, c\'est l\'île. Quelque chose mange notre fil.', 'La Barrière des Bornes est ouverte : tu pourras rentrer aux Sources sans repasser le Pont.'],
      },
      rewards: { xp: 540, fils: 40, items: [{ id: 'anneau_de_corne', count: 1 }] } },
    { id: 'ervane_amarre_grince', name: 'L\'amarre qui grince', level: 7, main: true,
      giver: 'ardek', turnIn: 'ardek', requires: { level: 7, quests: ['ervane_lueurs'] },
      steps: [
        { type: 'kill', monster: 'meuliere', count: 1, text: 'Vaincre une Meulière dans les ruines de l\'Amarre' },
        { type: 'visit', map: 'ervane_margelle', text: 'Aller jusqu\'à la Margelle du Puits' },
      ],
      dialogue: {
        offer: ['Les galets bougent, ici. Les petits grignotent, les gros crachent, et les mères soignent les autres. Abats la mère d\'abord.', 'Bats une Meulière, puis va voir la Margelle du Puits. Tu comprendras d\'où vient le bruit.'],
        progress: ['La Meulière soigne les siens : c\'est elle qu\'on abat en premier, toujours.'],
        done: ['Tu as vu le fil ? Effiloché, et cette lueur violette dans les fibres. Il y a quelque chose au fond du Puits.'],
      },
      rewards: { xp: 540, fils: 45, items: [{ id: 'potion_de_relais', count: 2 }] } },
    { id: 'ervane_puits', name: 'Le Puits de l\'Amarre', level: 7, main: true,
      giver: 'ardek', turnIn: 'varek_ervane', requires: { level: 7, quests: ['ervane_amarre_grince'] },
      steps: [
        { type: 'dungeon', dungeon: 'puits_de_l_amarre', text: 'Descendre dans le Puits de l\'Amarre et vaincre ce qui ronge le fil' },
      ],
      dialogue: {
        offer: ['Au fond du Puits, le plus vieux et le plus gros des galets mâche le nœud de l\'amarre. Chaque bouchée fait trembler l\'île.', 'Descends par le treuil. Trois salles, et lui au fond. Il ne te voit pas derrière un pilier : sers-t\'en.', 'Quand ce sera fait, remonte le dire à Varek. C\'est lui qui décide quand le Fil te laisse descendre.'],
        progress: ['Krobb garde sa carapace tant qu\'il te voit. Cache-toi à la fin de ton tour : il ouvrira la gueule pour renifler.'],
        done: ['Le fil ne tremble plus. Tu as fait plus que ce qu\'on demande à un Veilleur d\'un mois.', 'Le Fil te juge prêt. Va voir Kolm, à la pointe : la Nacelle descend quand je le dis, et je le dis.'],
      },
      rewards: { xp: 540, fils: 80, items: [{ id: 'pain_de_grouk', count: 3 }] } },
    { id: 'ervane_descente', name: 'La descente', level: 8, main: true,
      giver: 'varek_ervane', turnIn: 'kolm', requires: { level: 7, quests: ['ervane_puits'] },
      steps: [
        { type: 'visit', map: 'ervane_nacelle', text: 'Rejoindre Kolm à la Pointe de la Nacelle' },
      ],
      dialogue: {
        offer: ['Orsane est en bas, sous les nuages. Kolm t\'y descendra par la Nacelle, le long du fil d\'or.', 'Tu pourras remonter : la Nacelle fait les deux trajets. Mais le Fil a besoin de toi en bas, maintenant.'],
        progress: ['La Pointe de la Nacelle est à l\'extrême sud-ouest, au bout du sentier qui passe le Champ des Bornes.'],
        done: ['Tiens-toi au bord, ne regarde pas en bas. Enfin si, regarde : c\'est Orsane.', 'Quand tu veux redescendre ou remonter, tu me le dis. La Nacelle ne refuse personne que le Fil a éveillé.'],
      },
      rewards: { xp: 0, fils: 20 } },
  );

  // ----- Les quêtes secondaires -----
  C.quests.push(
    { id: 'ervane_cerf_volant', name: 'Le cerf-volant de Mibbe', level: 2, main: false,
      giver: 'mibbe', turnIn: 'mibbe', requires: { level: 2, quests: [] },
      steps: [
        { type: 'visit', map: 'ervane_source_vent', text: 'Aller à la Source du Vent' },
        { type: 'kill', monster: 'glym_aer', count: 2, text: 'Vaincre deux Glyms Aer qui jouent avec le cerf-volant' },
      ],
      dialogue: {
        offer: ['Mon cerf-volant est parti avec le vent. Et le vent, il va toujours vers la Source du Vent.', 'Les Glyms de là-bas jouent avec. Fais-les lâcher, s\'il te plaît.'],
        progress: ['Il est bleu, avec une queue rouge. Enfin, il était bleu.'],
        done: ['Il vole encore ! Tiens, du pain. Maman en a fait trop.'],
      },
      rewards: { xp: 73, fils: 10, items: [{ id: 'pain_de_cime', count: 3 }] } },
    { id: 'ervane_air_de_famille', name: 'Un air de famille', level: 3, main: false,
      giver: 'grenne', turnIn: 'grenne', requires: { level: 2, quests: [] },
      steps: [
        { type: 'collect', item: 'eclat_de_source', count: 4, text: 'Rapporter quatre Éclats de source' },
        { type: 'visit', map: 'ervane_rond_des_quatre', text: 'Aller au Rond des Quatre' },
      ],
      dialogue: {
        offer: ['Les Glyms des Sources descendent de ceux d\'Orsane, montés le long du Fil il y a longtemps. Une affaire de famille.', 'Rapporte-moi quatre Éclats, un par lignée si tu peux, et va voir le Rond des Quatre : les pierres y sont teintées comme eux.'],
        progress: ['Chaque pierre du Rond porte un élément. Les Glyms les ont choisies, ou l\'inverse.'],
        done: ['Quatre éclats, quatre teintes. L\'ancêtre, le Glym Ancestral, vit dans les Clairières d\'Orsane. Si tu descends un jour, va le saluer de ma part.'],
      },
      rewards: { xp: 139, fils: 15, items: [{ id: 'anneau_pilou', count: 1 }] } },
    // « Le Glym Ancestral » : la suite à Orsane d'« Un air de famille », le fil entre les deux régions
    // (conception, 3 et 6). Ici, et non dans le module d'Orsane par personnage : un personnage
    // d'Ervane qui la porte doit se valider (Save.list, Save.importText) sur toute page où l'île est
    // disponible, même sans ses changements d'Orsane. Un personnage né à Orsane n'y accède pas (elle
    // exige une quête d'Ervane).
    { id: 'orsane_glym_ancestral', name: 'Le Glym Ancestral', level: 9, main: false,
      giver: 'kelthar', turnIn: 'kelthar', requires: { level: 8, quests: ['ervane_air_de_famille'] },
      steps: [
        { type: 'kill', monster: 'pilou', count: 3, text: 'Vaincre trois Glyms Ancestraux aux Prés aux Glyms' },
        { type: 'collect', item: 'plume_de_pilou', count: 1, text: 'Rapporter une plume de Glym' },
        { type: 'talk', npc: 'kelthar', text: 'Raconter les Glyms des Prés à Kelthar' },
      ],
      dialogue: {
        offer: ['Grenne t\'a parlé du Glym Ancestral ? Elle tient ça de moi, et moi de personne : je l\'ai vu.', 'Va aux Prés, regarde-les voler. Rapporte-moi une plume : je veux savoir si elles sont encore bleues.'],
        progress: ['Les Prés aux Glyms, juste après le Seuil. Ils volent plus haut que leurs cousins des Sources.'],
        done: ['Bleue. Comme dans ma mémoire. Alors tout n\'a pas de trous.', 'Les Glyms des Sources sont leurs petits-enfants, petit. Et toi, tu es le premier Veilleur à avoir vu les deux.'],
      },
      rewards: { xp: 807, fils: 40, items: [{ id: 'pain_de_grouk', count: 2 }] } },
    { id: 'ervane_haies_de_pelk', name: 'Les haies de Pelk', level: 4, main: false,
      giver: 'pelk', turnIn: 'pelk', requires: { level: 4, quests: [] },
      steps: [
        { type: 'gather', resource: 'bois_noueux', count: 4, text: 'Ramasser quatre Bois Noueux dans les Haies' },
      ],
      dialogue: {
        offer: ['Un muret, ça se monte pierre par pierre. Une haie, ça se tresse avec du bois noueux, et les Haies en sont pleines.', 'Ramasse-m\'en quatre. Les Lampignons n\'aiment pas qu\'on touche à leurs terriers, alors prends garde.'],
        progress: ['Le bois noueux pousse contre le vent, le long des enclos.'],
        done: ['Du bon bois tordu. Il ne cassera pas, il a l\'habitude. Tiens, de quoi manger.'],
      },
      rewards: { xp: 221, fils: 20, items: [{ id: 'pain_de_cime', count: 3 }] } },
    { id: 'ervane_carte', name: 'La carte de Grenne', level: 5, main: false,
      giver: 'grenne', turnIn: 'grenne', requires: { level: 5, quests: [] },
      steps: [
        { type: 'visit', map: 'ervane_mailles_belvedere', text: 'Aller au Belvédère' },
        { type: 'visit', map: 'ervane_hameau', text: 'Aller au Hameau Vide' },
        { type: 'visit', map: 'ervane_cairn', text: 'Monter au Cairn du Vent' },
      ],
      dialogue: {
        offer: ['Toute l\'île est peinte sur ces murs. Enfin, presque : il me manque trois points de vue.', 'Va au Belvédère, au Hameau Vide, puis au Cairn du Vent, dans cet ordre. Regarde bien, et reviens me dire ce que tu as vu.'],
        progress: ['Du Cairn, on voit toute l\'île. Et Orsane, si les nuages veulent bien.'],
        done: ['Voilà ma carte complète. Ouvre la tienne quand tu veux : l\'île y est, maintenant.'],
      },
      rewards: { xp: 315, fils: 25 } },
    { id: 'ervane_cire', name: 'La cire des Lueurs', level: 7, main: false,
      giver: 'yssel', turnIn: 'yssel', requires: { level: 6, quests: [] },
      steps: [
        { type: 'kill', monster: 'loche', count: 3, text: 'Éteindre trois Loches' },
        { type: 'gather', resource: 'herbe_de_veille', count: 4, text: 'Cueillir quatre Herbes de Veille' },
      ],
      dialogue: {
        offer: ['Les Loches laissent de la cire en s\'éteignant, et l\'herbe de veille la fait tenir. Avec les deux, une lanterne dure un hiver.', 'Trois Loches, quatre herbes. Je te paie en potions.'],
        progress: ['L\'herbe de veille pousse au bord des sentiers. Elle ne se ferme jamais la nuit.'],
        done: ['De la cire et de l\'herbe. Mes lanternes tiendront. Prends ça, elles te ramèneront quand il faudra.'],
      },
      rewards: { xp: 540, fils: 35, items: [{ id: 'potion_de_relais', count: 2 }] } },
  );

  // ----- Le donjon : le Puits de l'Amarre (docs/ILE-DE-DEPART.md, 5) -----
  // Trois salles, le combat lancé à l'entrée de chacune (`entreeEnCombat`), l'entrée au niveau 7
  // avec la quête « Le Puits de l'Amarre » acceptée ou finie (`entree`), sans clé. Krobb est dans
  // js/data-ile.js ; sa clé est la ligne de vue (voitEnnemi). Les salles en 3D : js/ile-salle.js.
  C.dungeons.push({
    id: 'puits_de_l_amarre', name: 'Le Puits de l\'Amarre', zone: 'ervane_amarre', level: [7, 8],
    entryMap: 'ervane_margelle',
    keyItem: null,
    entree: { niveau: 7, quete: 'ervane_puits' },
    entreeEnCombat: true,
    salles3d: { sol: 'dalles_amarre', paroi: 'roche_grise', lumiere: '#f2c14e', brume: '#2a2238', accessoires: [{ salle: 2, sorte: 'fil_d_or', case: [7, 1] }] },
    description: 'Le puits creusé dans la pointe de l\'île, où le fil d\'or de l\'amarre se noue à un anneau de pierre. On y descend par le treuil, le long du fil, jusqu\'au nœud que Krobb mâche.',
    rooms: [
      {
        name: 'La margelle',
        layout: [
          '###############',
          '#,,,,,,,,,,,,,#',
          '#,L.........L,#',
          '#,.oo.....oo.,#',
          '#,.o.......o.,#',
          '#,...........,#',
          '#,.....M.....,#',
          '#,...........,#',
          '#,...........,#',
          '#,.o.......o.,#',
          '#,.oo.....oo.,#',
          '#,.....Z.....,#',
          '#,L.........L,#',
          '#,,,,,,,,,,,,,#',
          '###############',
        ],
        monsters: [{ id: 'krobbet', level: 6 }, { id: 'gravelin', level: 6 }],
      },
      {
        name: 'Les racines cousues',
        layout: [
          '###############',
          '#,,,,,,,,,,,,,#',
          '#,...T.......,#',
          '#,...........,#',
          '#,.......T...,#',
          '#,..T........,#',
          '#,.....M.....,#',
          '#,.........T.,#',
          '#,...........,#',
          '#,.T.........,#',
          '#,......T....,#',
          '#,...........,#',
          '#,.....Z.....,#',
          '#,,,,,,,,,,,,,#',
          '###############',
        ],
        monsters: [{ id: 'meuliere', level: 7 }, { id: 'krobbet', level: 7 }, { id: 'gravelin', level: 7 }],
      },
      {
        name: 'Le nœud',
        layout: [
          '###############',
          '#,,,,,,,,,,,,,#',
          '#,...........,#',
          '#,..##...##..,#',
          '#,..##...##..,#',
          '#,.....M.....,#',
          '#,...........,#',
          '#,.o.......o.,#',
          '#,...........,#',
          '#,..##...##..,#',
          '#,..##...##..,#',
          '#,...........,#',
          '#,.....Z.....,#',
          '#,,,,,,,,,,,,,#',
          '###############',
        ],
        monsters: [{ id: 'krobb', level: 7 }, { id: 'krobbet', level: 6 }],
        boss: true,
      },
    ],
    rewards: { fils: 60, items: [{ id: 'dent_de_krobb', rate: 100 }, { id: 'gravier_d_amarre', rate: 50 }] },
  });

  // ----- Les succès d'Ervane -----
  C.achievements.push(
    { id: 'donjon_puits', name: 'Le fil tient bon', desc: 'Terminer le Puits de l\'Amarre.', cond: { type: 'dungeon', dungeon: 'puits_de_l_amarre' }, rewards: { xp: 150, fils: 30 } },
    { id: 'defi_puits', name: 'Cache-cache', desc: 'Frapper Krobb dix fois pendant qu\'il renifle, gueule ouverte.', cond: { type: 'feat', key: 'krobb_gueule_ouverte', count: 10 }, rewards: { xp: 200, fils: 40, title: 'Ronge-Krobb' } },
    { id: 'eveille_d_ervane', name: 'Éveillé d\'Ervane', desc: 'Descendre d\'Ervane par la Nacelle, le Puits vaincu.', cond: { type: 'quest', quest: 'ervane_descente' }, rewards: { title: 'Éveillé d\'Ervane' } },
    { id: 'ronde_des_quatre', name: 'La Ronde', desc: 'Vaincre la Ronde des Quatre, les quatre Glyms des Sources en un seul combat.', cond: { type: 'quest', quest: 'ervane_ronde' }, rewards: { xp: 60, fils: 15 } },
  );
};
