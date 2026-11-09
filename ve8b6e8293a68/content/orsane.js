
DATA.content.zones.push({
  id: 'orsane_cimes', name: 'Les Cimes d\'Orsane', region: 'orsane', level: [1, 6],
  palette: 'orsane',
  origin: [0, 0],
  description: 'La capitale de l\'Aube, posée tout en haut du monde, blanche et dorée sous les lanternes. On y arrive Veilleur, on en repart avec une tâche.',
  maps: [
    {
      id: 'orsane_cimes_place', name: 'Place du Relais', sousZone: 'la Place du Relais', level: [1, 2],
      layout: [
        'TTTTTT.n.TTTTTT',
        'T,,,,,...,,,,,T',
        'T,.LP......L.,T',
        'T,...........,T',
        'T,...,,,,,.P.,T',
        'T,...,.P.,...,T',
        'T,P..,,Z,,...,T',
        'T....,...,....e',
        'T,...,,,,,..P,T',
        'T,...........,T',
        'T,.LP..P..PL.,T',
        'T,..P.....P..,T',
        'T,,,,,...,,,,,T',
        'TTTTTT...TTTTTT',
        'TTTTTTTsTTTTTTT',
      ],
      exits: { n: 'orsane_cimes_terrasses', e: 'orsane_cimes_ateliers', s: 'orsane_cimes_porte', w: null },
      npcs: ['ismere', 'aldric', 'varek', 'ysolde', 'hessa', 'garen', 'lotha', 'mira', 'maelis', 'brann'],
      nodes: [],
      groups: [],
      dungeon: null,
      relay: true,
    },
    {
      id: 'orsane_cimes_terrasses', name: 'Les Terrasses', sousZone: 'les Terrasses', level: [1, 2],
      layout: [
        'ooooooooooooooo',
        'o,,,,,,,,,,,,,o',
        'o,.L.......L.,o',
        'o,...........,o',
        'o,..###.###..,o',
        'o,..#.....#..,o',
        'o,....P......,o',
        'o,P....M...P.,o',
        'o,......P....,o',
        'o,..#.....#..,o',
        'o,..###.###..,o',
        'o,.....P.....,o',
        'o,.L.......L.,o',
        'o,,,,,,,,,,,,,o',
        'ooooooosooooooo',
      ],
      exits: { n: null, e: null, s: 'orsane_cimes_place', w: null },
      npcs: ['kelthar', 'brakk', 'saya', 'vali', 'fenna'],
      nodes: [],
      groups: [{ monsters: ['mannequin', 'mannequin', 'mannequin'], level: [1, 2], respawn: 1, dojo: true }],
      dungeon: null,
      relay: false,
    },
    {
      id: 'orsane_cimes_ateliers', name: 'Rue des Ateliers', sousZone: 'la Place du Relais', level: [1, 2],
      layout: [
        '###############',
        '#,,,,,,,,,,,,,#',
        '#,#PPPP.#PPP#,#',
        '#,...........,#',
        '#,...........,#',
        '#,.L.......L.,#',
        '#,...........,#',
        'w.....,,,.....#',
        '#,...........,#',
        '#,.L.......L.,#',
        '#,...........,#',
        '#,...........,#',
        '#,#P.P.P.P.P#,#',
        '#,,,,,,,,,,,,,#',
        '###############',
      ],
      exits: { n: null, e: null, s: null, w: 'orsane_cimes_place' },
      npcs: ['thorak', 'evrin', 'ostrid', 'jorrin', 'thila', 'korvel', 'rilka', 'velka', 'nilo', 'tessel', 'dunna', 'borrik'],
      nodes: [],
      groups: [],
      dungeon: null,
      relay: false,
    },
    {
      id: 'orsane_cimes_porte', name: 'Porte des Clairières', sousZone: 'la Porte des Clairières', level: [1, 4],
      layout: [
        'TTTTTTTnTTTTTTT',
        'T,,,,,,.,,,,,,T',
        'T,....L.L....,T',
        'T,...........,T',
        'T,.T...M...T.,T',
        'T,...........,T',
        'T,P...P......,T',
        'T,...........,T',
        'T,..M.....M..,T',
        'T,........P..,T',
        'T,.T.......T.,T',
        'T,...........,T',
        'T,....L.L....,T',
        'T,,,,,,.,,,,,,T',
        'TTTTTTTsTTTTTTT',
      ],
      exits: { n: 'orsane_cimes_place', e: null, s: 'orsane_clairieres_lisiere', w: null },
      npcs: ['petra', 'orvak', 'ilsa'],
      nodes: [],
      groups: [
        { monsters: ['piouk', 'piouk'], level: [1, 4], respawn: 30 },
        { monsters: ['pilou'], level: [1, 4], respawn: 30 },
        { monsters: ['pilou'], level: [1, 4], respawn: 30 },
      ],
      dungeon: null,
      relay: false,
    },
  ],
});

DATA.content.zones.push({
  id: 'orsane_clairieres', name: 'Les Clairières d\'Orsane', region: 'orsane', level: [1, 12],
  palette: 'orsane',
  faune: { monstres: { pilou: 30, grouk: 25, piouk: 15, groukin: 15, filin: 10 }, tailles: { 1: 30, 2: 45, 3: 20, 4: 5 } },
  description: 'Des prés en pente douce sous les murs de la ville, coupés de bosquets et d\'un ruisseau. Les Glyms y nichent, et depuis peu les Grouks y grognent.',
  maps: [
    {
      id: 'orsane_clairieres_lisiere', name: 'Le Seuil des Prés', sousZone: 'les Prés', penche: { pilou: 1.5, piouk: 1.5 }, level: [1, 4],
      layout: [
        'TTTTTTTnTTTTTTT',
        'TT,,,,,.,,,,,TT',
        'T,,..........,T',
        'T,..T.....M..,T',
        'T,...........,T',
        'T,..M....G...,T',
        'T,.........T.,T',
        'T,...L.......,T',
        'T,.T.........,T',
        'T,.......M...,T',
        'T,...........,T',
        'T,..G...T....,T',
        'T,,..........,T',
        'TT,,,,,.,,,,,TT',
        'TTTTTTTsTTTTTTT',
      ],
      exits: { n: 'orsane_cimes_porte', e: null, s: 'orsane_clairieres_pres', w: null },
      npcs: [],
      nodes: ['bois_de_cime', 'herbe_de_veille'],
      groups: [
        { taille: [1, 3], monsters: ['piouk', 'groukin'], level: [1, 4], respawn: 40 },
        { taille: [1, 2], monsters: ['pilou'], level: [1, 4], respawn: 40 },
        { taille: [1, 3], monsters: ['pilou', 'groukin'], level: [1, 4], respawn: 40 },
      ],
      dungeon: null,
      relay: false,
    },
    {
      id: 'orsane_clairieres_pres', name: 'Les Prés aux Glyms', sousZone: 'les Prés', penche: { pilou: 2, piouk: 2 }, level: [1, 6],
      layout: [
        'TTTTTTTnTTTTTTT',
        'T,,,,,,.,,,,,,T',
        'T,...,,,,,...,T',
        'T,..M.....,..,T',
        'T,.......,,..,T',
        'T,..TT.......,T',
        'T,..T....M...,T',
        'T,............e',
        'T,......TT...,T',
        'T,.G.....T...,T',
        'T,.........M.,T',
        'T,...M.......,T',
        'T,.......L...,T',
        'T,,,,,,.,,,,,,T',
        'TTTTTTTsTTTTTTT',
      ],
      exits: { n: 'orsane_clairieres_lisiere', e: 'orsane_clairieres_ruisseau', s: 'orsane_clairieres_bosquet', w: null },
      npcs: [],
      nodes: ['bois_de_cime'],
      groups: [
        { taille: [1, 2], monsters: ['pilou'], level: [1, 6], respawn: 40 },
        { taille: [1, 3], monsters: ['pilou', 'groukin'], level: [1, 6], respawn: 40 },
        { taille: [1, 3], monsters: ['piouk', 'piouk'], level: [1, 6], respawn: 40 },
        { taille: [1, 3], monsters: ['pilou', 'groukin'], level: [3, 6], respawn: 40 },
      ],
      dungeon: null,
      relay: false,
    },
    {
      id: 'orsane_clairieres_ruisseau', name: 'Le Ruisseau', sousZone: 'le Bosquet', level: [3, 8],
      layout: [
        'TTTTTTTTTTTTTTT',
        'T,,,,,,~~,,,,,T',
        'T,.....~~....,T',
        'T,..M..~~..G.,T',
        'T,.....~~....,T',
        'T,.....~~....,T',
        'T,.....~~..M.,T',
        'w......,,,...,T',
        'T,.....~~....,T',
        'T,.G...~~....,T',
        'T,.....~~..M.,T',
        'T,.ML..~~....,T',
        'T,.....~~....,T',
        'T,,,,,,~~,,,,,T',
        'TTTTTTTTTTTsTTT',
      ],
      exits: { n: null, e: null, s: 'orsane_clairieres_mare', w: 'orsane_clairieres_pres' },
      npcs: [],
      nodes: ['herbe_de_veille', 'bois_de_cime'],
      groups: [
        { taille: [1, 3], monsters: ['pilou', 'groukin'], level: [3, 8], respawn: 40 },
        { taille: [1, 2], monsters: ['grouk'], level: [5, 8], respawn: 45 },
        { taille: [1, 3], monsters: ['pilou', 'grouk'], level: [5, 8], respawn: 45 },
        { taille: [1, 3], monsters: ['groukin', 'groukin'], level: [3, 8], respawn: 40 },
      ],
      dungeon: null,
      relay: false,
    },
    {
      id: 'orsane_clairieres_bosquet', name: 'Le Bosquet', sousZone: 'le Bosquet', penche: { filin: 2 }, level: [5, 10],
      layout: [
        'TTTTTTTnTTTTTTT',
        'TT,,,,,.,,,,,TT',
        'T,.T.......T.,T',
        'T,..........G,T',
        'T,.T..M.....T,T',
        'T,T..........,T',
        'T,.........T.,T',
        'T,..TT.M.....,e',
        'T,.......M...,T',
        'T,G..........,T',
        'T,.T....T....,T',
        'T,......T.M..,T',
        'T,..T........,T',
        'TT,,,,,D,,,,,TT',
        'TTTTTTTTTTTTTTT',
      ],
      exits: { n: 'orsane_clairieres_pres', e: 'orsane_clairieres_mare', s: null, w: null },
      npcs: [],
      nodes: ['bois_de_cime', 'pierre_de_calcaire'],
      groups: [
        { taille: [1, 3], monsters: ['grouk', 'pilou'], level: [5, 10], respawn: 45 },
        { taille: [1, 3], monsters: ['filin', 'groukin'], level: [5, 10], respawn: 45 },
        { taille: [1, 3], monsters: ['grouk', 'grouk'], level: [5, 10], respawn: 45 },
        { taille: [2, 4], monsters: ['grouk', 'pilou', 'pilou'], level: [7, 10], respawn: 50 },
      ],
      dungeon: 'grenier_des_pilous',
      relay: false,
    },
    {
      id: 'orsane_clairieres_mare', name: 'La Mare aux Grouks', sousZone: 'la Mare aux Grouks', penche: { grouk: 2, groukin: 1.5 }, level: [7, 12],
      layout: [
        'TTTTTTTTTTTnTTT',
        'T,,,,,,,,,,.,,T',
        'T,...........,T',
        'T,..M........,T',
        'T,....~~~....,T',
        'T,...~~~~~...,T',
        'T,...~~~~~.M.,T',
        'w....~~~~~...,T',
        'T,....~~~....,T',
        'T,...........,T',
        'T,.M.......G.,T',
        'T,......L..M.,T',
        'T,...........,T',
        'T,,,,,,,.,,,,,T',
        'TTTTTTTTsTTTTTT',
      ],
      exits: { n: 'orsane_clairieres_ruisseau', e: null, s: 'orsane_clairieres_oree', w: 'orsane_clairieres_bosquet' },
      npcs: [],
      nodes: ['herbe_de_veille'],
      groups: [
        { taille: [1, 3], monsters: ['grouk', 'grouk'], level: [7, 12], respawn: 50 },
        { taille: [2, 4], monsters: ['grouk', 'pilou', 'pilou'], level: [7, 12], respawn: 50 },
        { taille: [2, 4], monsters: ['grouk', 'grouk', 'pilou'], level: [9, 12], respawn: 50 },
        { fixe: true, monsters: ['kavou_bleu', 'kavou_roux'], level: [7, 12], respawn: 50 },
      ],
      dungeon: null,
      relay: false,
    },
    {
      id: 'orsane_clairieres_oree', name: 'L\'Orée des Sentiers', sousZone: 'la Mare aux Grouks', penche: { grouk: 2 }, level: [7, 12],
      layout: [
        'TTTTTTTTnTTTTTT',
        'T,,,,,,,.,,,,,T',
        'T,.T.........,T',
        'T,....M......,T',
        'T,.....P.....,T',
        'T,.T......T..,T',
        'T,..........M,T',
        'T,.......L....e',
        'T,..G........,T',
        'T,.T......T..,T',
        'T,....M......,T',
        'T,...........,T',
        'T,.T......M..,T',
        'T,,,,,,,,,,,,,T',
        'TTTTTTTTTTTTTTT',
      ],
      exits: { n: 'orsane_clairieres_mare', e: 'orsane_sentiers_montee', s: null, w: null },
      npcs: ['dalric'],
      nodes: ['bois_de_cime'],
      groups: [
        { taille: [1, 3], monsters: ['grouk', 'grouk'], level: [7, 12], respawn: 50 },
        { taille: [2, 4], monsters: ['pilou', 'pilou', 'grouk'], level: [7, 12], respawn: 50 },
        { taille: [2, 4], monsters: ['grouk', 'grouk', 'grouk'], level: [9, 12], respawn: 55 },
        { fixe: true, monsters: ['kavou_ocre', 'kavou_blanc'], level: [7, 12], respawn: 50 },
      ],
      dungeon: null,
      relay: false,
    },
  ],
});

DATA.content.zones.push({
  id: 'orsane_sentiers', name: 'Les Sentiers des Cimes', region: 'orsane', level: [9, 24],
  palette: 'orsane',
  faune: { monstres: { grouk: 35, tissefil: 30, filin: 10, loche: 10, brim: 10 }, tailles: { 1: 5, 2: 35, 3: 45, 4: 15 } },
  description: 'Les chemins de pierre qui grimpent au-dessus des Clairières, entre rochers, corniches et un pont au-dessus du vide. Les Grouks y ont leurs tanières et les Tissefils commencent à y tendre leurs toiles.',
  maps: [
    {
      id: 'orsane_sentiers_montee', name: 'La Montée', sousZone: 'la Montée', level: [9, 14],
      layout: [
        '###############',
        '#,,##,,,,,##,,#',
        '#,..#.....#..,#',
        '#,..#..M..#..,#',
        '#,...........,#',
        '#,G..........,#',
        '#....,,,,,....#',
        'w....,.L.,....e',
        '#....,,,,,....#',
        '#,.M.....M...,#',
        '#,...........,#',
        '#,..#.....#.G,#',
        '#,..#..M..#..,#',
        '#,,##,,,,,##,,#',
        '###############',
      ],
      exits: { n: null, e: 'orsane_sentiers_relais', s: null, w: 'orsane_clairieres_oree' },
      npcs: [],
      nodes: ['pierre_de_calcaire', 'bois_noueux'],
      groups: [
        { taille: [1, 3], monsters: ['grouk', 'grouk'], level: [9, 14], respawn: 50 },
        { taille: [2, 4], monsters: ['filin', 'filin', 'grouk'], level: [9, 14], respawn: 50 },
        { taille: [2, 4], monsters: ['grouk', 'grouk', 'pilou'], level: [9, 14], respawn: 50 },
        { taille: [1, 3], monsters: ['grouk', 'tissefil'], level: [11, 14], respawn: 55 },
      ],
      dungeon: null,
      relay: false,
    },
    {
      id: 'orsane_sentiers_relais', name: 'Relais des Sentiers', sousZone: 'la Montée', level: [9, 16],
      layout: [
        '######.n.######',
        '#,,,,,...,,,,,#',
        '#,.L.......L.,#',
        '#,.........M.,#',
        '#,..M........,#',
        '#,....,,,,,..,#',
        '#,....,P.,...,#',
        'w.....,Z,,....#',
        '#,....,,,,,..,#',
        '#,...........,#',
        '#,.........M.,#',
        '#,..G........,#',
        '#,.L.......L.,#',
        '#,,,,,...,,,,,#',
        '######.s.######',
      ],
      exits: { n: 'orsane_sentiers_corniche', e: null, s: 'orsane_sentiers_halte', w: 'orsane_sentiers_montee' },
      npcs: ['ravik'],
      nodes: ['pierre_de_calcaire'],
      groups: [
        { fixe: true, monsters: ['kavou_bleu', 'kavou_roux', 'kavou_ocre'], level: [9, 12], respawn: 60 },
        { taille: [1, 3], monsters: ['grouk', 'grouk'], level: [9, 16], respawn: 55 },
        { taille: [1, 3], monsters: ['grouk', 'tissefil'], level: [11, 16], respawn: 55 },
      ],
      dungeon: null,
      relay: true,
    },
    {
      id: 'orsane_sentiers_corniche', name: 'La Corniche', sousZone: 'la Corniche', penche: { loche: 2 }, level: [13, 20],
      layout: [
        'ooooooooooooooo',
        'oo,,,,,,,,,,,,o',
        'o,...........,o',
        'o,..M....G...,#',
        'o,...........,#',
        'o#...........,#',
        '##.....M.....,#',
        '#,............e',
        '#,...........,#',
        '#,..G........,#',
        '#,........M..,#',
        '#,..M#.......,#',
        '#,...........,#',
        '#,,,,,,.,,,,,,#',
        '#######s#######',
      ],
      exits: { n: null, e: 'orsane_sentiers_pont', s: 'orsane_sentiers_relais', w: null },
      npcs: [],
      nodes: ['pierre_de_calcaire', 'bois_noueux'],
      groups: [
        { taille: [2, 4], monsters: ['grouk', 'grouk', 'tissefil'], level: [13, 20], respawn: 55 },
        { taille: [1, 3], monsters: ['tissefil', 'tissefil'], level: [13, 20], respawn: 55 },
        { taille: [2, 4], monsters: ['grouk', 'grouk', 'grouk'], level: [15, 20], respawn: 60 },
        { taille: [2, 4], monsters: ['loche', 'loche', 'tissefil'], level: [13, 20], respawn: 55 },
      ],
      dungeon: null,
      relay: false,
    },
    {
      id: 'orsane_sentiers_pont', name: 'Le Pont du Vide', sousZone: 'la Crête', penche: { brim: 2 }, level: [15, 22],
      layout: [
        '###############',
        '#,,,,,ooo,,,,,#',
        '#,....ooo....,#',
        '#,.M..ooo....,#',
        '#,....ooo..M.,#',
        '#,....ooo....,#',
        '#,....,,,....,#',
        'w.....,L,.....#',
        '#,....,,,....,#',
        '#,....ooo....,#',
        '#,G...ooo....,#',
        '#,.M..ooo.M..,#',
        '#,....ooo....,#',
        '#,,,,,ooo,,,,,#',
        '###########s###',
      ],
      exits: { n: null, e: null, s: 'orsane_sentiers_crete', w: 'orsane_sentiers_corniche' },
      npcs: [],
      nodes: ['bois_noueux'],
      groups: [
        { taille: [2, 4], monsters: ['tissefil', 'tissefil', 'grouk'], level: [15, 22], respawn: 60 },
        { taille: [2, 4], monsters: ['grouk', 'grouk', 'tissefil'], level: [15, 22], respawn: 60 },
        { taille: [2, 4], monsters: ['brim', 'brim', 'tissefil'], level: [15, 22], respawn: 60 },
        { taille: [2, 4], monsters: ['tissefil', 'tissefil', 'tissefil'], level: [17, 22], respawn: 60 },
      ],
      dungeon: null,
      relay: false,
    },
    {
      id: 'orsane_sentiers_halte', name: 'La Halte de Thoril', sousZone: 'la Corniche', penche: { loche: 2, filin: 1.5 }, level: [11, 18],
      layout: [
        '######.n.######',
        '#,,,,,...,,,,,#',
        '#,.....M.....,#',
        '#,.M.....G...,#',
        '#,.........M.,#',
        '#,.......#...,#',
        '#,..,,,......,#',
        '#,..,P,.......#',
        '#,..,L,..M...,#',
        '#,..,,,......,#',
        '#,......P....,#',
        '#,G....#.....,#',
        '#,........M..,#',
        '#,,,,,,,,,,,,,#',
        '###############',
      ],
      exits: { n: 'orsane_sentiers_relais', e: null, s: null, w: null },
      npcs: ['thoril', 'osk'],
      nodes: ['bois_noueux', 'pierre_de_calcaire'],
      groups: [
        { taille: [1, 3], monsters: ['tissefil', 'grouk'], level: [11, 18], respawn: 55 },
        { taille: [2, 4], monsters: ['loche', 'loche', 'filin'], level: [11, 18], respawn: 55 },
        { taille: [1, 3], monsters: ['tissefil', 'tissefil'], level: [11, 18], respawn: 55 },
        { taille: [2, 4], monsters: ['grouk', 'grouk', 'tissefil'], level: [13, 18], respawn: 60 },
        { fixe: true, monsters: ['glouton'], level: [13, 18], respawn: 90 },
      ],
      dungeon: null,
      relay: false,
    },
    {
      id: 'orsane_sentiers_crete', name: 'La Crête', sousZone: 'la Crête', penche: { brim: 1.5, tissefil: 1.5 }, level: [17, 24],
      layout: [
        '###########n###',
        '#,,D,,,,,,,.,,#',
        '#,.......,...,#',
        '#,.M.........,#',
        '#,....#....M.,#',
        '#,....##.....,#',
        '#,...........,#',
        '#......L......e',
        '#,...........,#',
        '#,.M...##....,#',
        '#,......#..G.,#',
        '#,....M......,#',
        '#,.......M...,#',
        '#,,,,,,,,,,,,,#',
        '###############',
      ],
      exits: { n: 'orsane_sentiers_pont', e: 'orsane_toiles_entree', s: null, w: null },
      npcs: [],
      nodes: ['pierre_de_calcaire'],
      groups: [
        { taille: [2, 4], monsters: ['grouk', 'grouk', 'tissefil'], level: [17, 24], respawn: 60 },
        { taille: [2, 4], monsters: ['tissefil', 'tissefil', 'grouk'], level: [17, 24], respawn: 60 },
        { taille: [2, 4], monsters: ['grouk', 'grouk', 'grouk'], level: [19, 24], respawn: 60 },
        { taille: [1, 2], monsters: ['oreth'], level: [19, 24], respawn: 300, crepuscule: true },
        { taille: [3, 4], monsters: ['tissefil', 'tissefil', 'tissefil', 'brim'], level: [19, 24], respawn: 65 },
      ],
      dungeon: 'voliere_des_kavous',
      relay: false,
    },
  ],
});

DATA.content.zones.push({
  id: 'orsane_toiles', name: 'Les Toiles', region: 'orsane', level: [19, 32],
  palette: 'orsane',
  faune: { monstres: { tissefil: 40, veilloche: 25, tissefil_ancien: 10, veilloche_tissee: 10, grouk_cornu: 8 }, tailles: { 2: 20, 3: 50, 4: 30 } },
  description: 'Une forêt de pins morts tendue de fils gris, où les lanternes de l\'Aube brillent encore à travers les toiles. Les Tissefils y nichent et les Veilloches y veillent, plus nombreux chaque nuit.',
  maps: [
    {
      id: 'orsane_toiles_entree', name: 'Le Seuil des Toiles', sousZone: 'les Fils Tendus', level: [19, 24],
      layout: [
        'TTTTTTTTTTTTTTT',
        'T,,,,,,,,,,,,,T',
        'T,.T.......T.,T',
        'T,...M.......,T',
        'T,........M..,T',
        'T,.T.....T...,T',
        'T,.....P.....,T',
        'w......L......e',
        'T,...........,T',
        'T,.T.....T...,T',
        'T,..M........,T',
        'T,.........M.,T',
        'T,.T..G....T.,T',
        'T,,,,,,.,,,,,,T',
        'TTTTTTTsTTTTTTT',
      ],
      exits: { n: null, e: 'orsane_toiles_fils', s: 'orsane_toiles_nid', w: 'orsane_sentiers_crete' },
      npcs: ['thevra'],
      nodes: ['bois_noueux'],
      groups: [
        { taille: [2, 4], monsters: ['tissefil', 'tissefil', 'tissefil'], level: [19, 24], respawn: 60 },
        { taille: [2, 4], monsters: ['grouk_cornu', 'tissefil', 'tissefil'], level: [19, 24], respawn: 60 },
        { taille: [2, 4], monsters: ['tissefil', 'tissefil', 'veilloche'], level: [19, 24], respawn: 60 },
        { taille: [2, 4], monsters: ['tissefil', 'veilloche', 'grouk'], level: [19, 24], respawn: 60 },
      ],
      dungeon: null,
      relay: false,
    },
    {
      id: 'orsane_toiles_fils', name: 'Les Fils Tendus', sousZone: 'les Fils Tendus', level: [21, 26],
      layout: [
        'TTTTTTTTTTTTTTT',
        'TT,,,,,,,,,,,TT',
        'T,....TT.....,T',
        'T,.M..T......,T',
        'T,...........,T',
        'T,.......TT..,T',
        'T,..G....T.M.,T',
        'w.....,L,.....e',
        'T,...........,T',
        'T,.TT........,T',
        'T,.T....M....,T',
        'T,..M........,T',
        'T,......TT.G.,T',
        'TT,,,,,,,,,,,TT',
        'TTTTTTTTTTTTTTT',
      ],
      exits: { n: null, e: 'orsane_toiles_lanternes', s: null, w: 'orsane_toiles_entree' },
      npcs: [],
      nodes: ['herbe_de_veille', 'bois_noueux'],
      groups: [
        { taille: [2, 4], monsters: ['tissefil', 'tissefil', 'tissefil'], level: [21, 26], respawn: 60 },
        { taille: [2, 4], monsters: ['tissefil', 'tissefil', 'veilloche'], level: [21, 26], respawn: 60 },
        { taille: [2, 4], monsters: ['veilloche', 'veilloche', 'tissefil'], level: [23, 26], respawn: 65 },
        { taille: [2, 4], monsters: ['grouk_cornu', 'brim', 'brim'], level: [21, 26], respawn: 60 },
      ],
      dungeon: null,
      relay: false,
    },
    {
      id: 'orsane_toiles_lanternes', name: 'L\'Allée des Lanternes', sousZone: 'l\'Allée des Lanternes', penche: { veilloche: 2, veilloche_tissee: 2 }, level: [23, 30],
      layout: [
        'TTTTTTTTTTTTTTT',
        'T,,,,,,,,,,,,,T',
        'T,L.........L,T',
        'T,...M.......,T',
        'T,.....T...M.,T',
        'T,..L...L....,T',
        'T,...........,T',
        'w.......M.....T',
        'T,...........,T',
        'T,..L...L....,T',
        'T,.....T...M.,T',
        'T,.M.......G.,T',
        'T,L.........L,T',
        'T,,,,,,,,,,.,,T',
        'TTTTTTTTTTTsTTT',
      ],
      exits: { n: null, e: null, s: 'orsane_toiles_sortie', w: 'orsane_toiles_fils' },
      npcs: [],
      nodes: ['herbe_de_veille'],
      groups: [
        { taille: [2, 4], monsters: ['veilloche', 'veilloche', 'tissefil'], level: [23, 30], respawn: 65 },
        { taille: [2, 4], monsters: ['veilloche_tissee', 'veilloche', 'tissefil'], level: [27, 30], respawn: 65 },
        { taille: [3, 4], monsters: ['veilloche', 'tissefil', 'tissefil', 'tissefil'], level: [23, 30], respawn: 65 },
        { fixe: true, monsters: ['kavou_pourpre', 'kavou_pourpre'], level: [23, 30], respawn: 65 },
        { taille: [2, 4], monsters: ['veilloche', 'veilloche', 'veilloche_tissee'], level: [25, 30], respawn: 65 },
      ],
      dungeon: null,
      relay: false,
    },
    {
      id: 'orsane_toiles_nid', name: 'Le Nid des Toiles', sousZone: 'le Nid des Toiles', penche: { tissefil_ancien: 2 }, level: [25, 32],
      layout: [
        'TTTTTTTnTTTTTTT',
        'TT,,,,,.,,,,,TT',
        'T,...........,T',
        'T,.T...M...T.,T',
        'T,...........,T',
        'T,....T.T....,T',
        'T,...........,T',
        'T,.M...L...M.,T',
        'T,...........,T',
        'T,....T.T....,T',
        'T,...........,T',
        'T,.T.......T.,T',
        'T,......G....,T',
        'TT,,,,,D,,,,,TT',
        'TTTTTTTTTTTTTTT',
      ],
      exits: { n: 'orsane_toiles_entree', e: null, s: null, w: null },
      npcs: [],
      nodes: ['bois_noueux'],
      groups: [
        { taille: [3, 4], monsters: ['tissefil_ancien', 'tissefil', 'tissefil', 'tissefil'], level: [25, 32], respawn: 90 },
        { taille: [3, 4], monsters: ['tissefil', 'tissefil', 'tissefil', 'tissefil'], level: [23, 32], respawn: 90 },
        { taille: [3, 4], monsters: ['tissefil', 'tissefil', 'tissefil', 'tissefil'], level: [23, 32], respawn: 90 },
      ],
      dungeon: 'nid_des_toiles',
      relay: false,
    },
    {
      id: 'orsane_toiles_sortie', name: 'Le Bord des Éboulis', sousZone: 'le Nid des Toiles', penche: { tissefil_ancien: 1.5 }, level: [25, 32],
      layout: [
        'TTTTTTTTTTTnTTT',
        'T,,,,,,,,,,.,,T',
        'T,.T.........,T',
        'T,......M....,T',
        'T,...T.......,#',
        'T,...........,#',
        'T,.M......#..,#',
        'T,.....L......e',
        'T,...........,#',
        'T,....#......,#',
        'T,........M..,#',
        'T,.T.........,#',
        'T,..M...G....,#',
        'T,,,,,,,,,,,,,#',
        'TTTTTTT########',
      ],
      exits: { n: 'orsane_toiles_lanternes', e: 'orsane_eboulis_pente', s: null, w: null },
      npcs: [],
      nodes: ['herbe_de_veille'],
      groups: [
        { taille: [2, 4], monsters: ['tissefil', 'tissefil', 'veilloche'], level: [23, 32], respawn: 65 },
        { taille: [3, 4], monsters: ['veilloche', 'veilloche', 'tissefil', 'tissefil'], level: [23, 32], respawn: 70 },
        { taille: [3, 4], monsters: ['tissefil', 'tissefil', 'tissefil', 'brimbe'], level: [23, 32], respawn: 70 },
        { taille: [2, 4], monsters: ['tissefil_ancien', 'tissefil_ancien', 'veilloche'], level: [25, 32], respawn: 70 },
      ],
      dungeon: null,
      relay: false,
    },
  ],
});

DATA.content.zones.push({
  id: 'orsane_eboulis', name: 'Les Éboulis', region: 'orsane', level: [27, 40],
  palette: 'orsane',
  faune: { monstres: { brimbe: 35, grouk: 25, veilloche: 15, glek: 12, thelk: 10 }, tailles: { 2: 10, 3: 50, 4: 40 } },
  description: 'Le versant est des Cimes, un chaos de rochers tombés d\'on ne sait où. Les Brimbes y lancent leurs galets, les Grouks y creusent, et tout en haut s\'ouvre le Terrier.',
  maps: [
    {
      id: 'orsane_eboulis_pente', name: 'La Pente aux Galets', sousZone: 'la Pente aux Galets', penche: { glek: 2 }, level: [27, 32],
      layout: [
        '###############',
        '#,,#,,,,,,,#,,#',
        '#,...........,#',
        '#,.M....#....,#',
        '#,..#........,#',
        '#,.......G...,#',
        '#,...#.....M.,#',
        'w.............e',
        '#,.....#.....,#',
        '#,G..........,#',
        '#,....#...M..,#',
        '#,..M......#.,#',
        '#,..#........,#',
        '#,,,,,,#,,,,,,#',
        '###############',
      ],
      exits: { n: null, e: 'orsane_eboulis_relais', s: null, w: 'orsane_toiles_sortie' },
      npcs: [],
      nodes: ['pierre_de_calcaire', 'pierre_de_calcaire'],
      groups: [
        { taille: [2, 4], monsters: ['brimbe', 'brimbe', 'grouk'], level: [27, 32], respawn: 70 },
        { taille: [2, 4], monsters: ['brimbe', 'grouk', 'grouk'], level: [27, 32], respawn: 70 },
        { taille: [3, 4], monsters: ['brimbe', 'brimbe', 'brimbe', 'veilloche'], level: [29, 32], respawn: 75 },
        { taille: [2, 4], monsters: ['glek', 'glek', 'brimbe'], level: [27, 32], respawn: 70 },
      ],
      dungeon: null,
      relay: false,
    },
    {
      id: 'orsane_eboulis_relais', name: 'Relais des Éboulis', sousZone: 'la Pente aux Galets', level: [27, 34],
      layout: [
        '#######n#######',
        '#,,,,,,.,,,,,,#',
        '#,.L.......L.,#',
        '#,.........M.,#',
        '#,.M.........,#',
        '#,....,,,,..P,#',
        '#,..P.,P.,P..,#',
        'w.....,Z,,....e',
        '#,....,,,,...,#',
        '#,.........M.,#',
        '#,...........,#',
        '#,..G........,#',
        '#,.L.......L.,#',
        '#,,,,,,,,,,,,,#',
        '###############',
      ],
      exits: { n: 'orsane_eboulis_terrier', e: 'orsane_eboulis_chaos', s: null, w: 'orsane_eboulis_pente' },
      npcs: ['elkor', 'avreth', 'karvel', 'lekra'],
      nodes: ['pierre_de_calcaire'],
      groups: [
        { taille: [2, 4], monsters: ['veilloche_tissee', 'brimbe', 'brimbe'], level: [27, 34], respawn: 70 },
        { taille: [2, 4], monsters: ['brimbe', 'brimbe', 'veilloche'], level: [27, 34], respawn: 70 },
        { taille: [2, 4], monsters: ['grouk', 'grouk', 'brimbe'], level: [29, 34], respawn: 70 },
      ],
      dungeon: null,
      relay: true,
    },
    {
      id: 'orsane_eboulis_terrier', name: 'La Gueule du Terrier', sousZone: 'le Chaos', penche: { grouk: 2 }, level: [33, 40],
      layout: [
        '###############',
        '#,,,,,#D#,,,,,#',
        '#,P...#.#....,#',
        '#,....,.,....,#',
        '#,..M.......M,#',
        '#,...........,#',
        '#,#.........#,#',
        '#,...........,#',
        '#,....L.L....,#',
        '#,G..........,#',
        '#,#...M.....#,#',
        '#,........M..,#',
        '#,...........,#',
        '#,,,,,,.,,,,,,#',
        '#######s#######',
      ],
      exits: { n: null, e: null, s: 'orsane_eboulis_relais', w: null },
      npcs: ['kethril'],
      nodes: ['pierre_de_calcaire'],
      groups: [
        { taille: [3, 4], monsters: ['grouk', 'grouk', 'grouk', 'brimbe'], level: [33, 40], respawn: 75 },
        { taille: [3, 4], monsters: ['grouk', 'grouk', 'veilloche', 'brimbe'], level: [33, 40], respawn: 75 },
        { taille: [3, 4], monsters: ['grouk', 'grouk', 'grouk', 'grouk'], level: [35, 40], respawn: 80 },
        { fixe: true, monsters: ['brimbe_fendue', 'brimbe', 'grouk', 'grouk'], level: [35, 40], respawn: 80 },
      ],
      dungeon: 'terrier_du_grand_grouk',
      relay: false,
    },
    {
      id: 'orsane_eboulis_chaos', name: 'Le Chaos', sousZone: 'le Chaos', penche: { thelk: 2, glek: 1.5 }, level: [31, 38],
      layout: [
        '###############',
        '#,,,,,,,,,,,,,#',
        '#,.#...#.....,#',
        '#,M......#.M.,#',
        '#,....#......,#',
        '#,.#...M..#..,#',
        '#,...G.......,#',
        'w.....#.......e',
        '#,...........,#',
        '#,.#...#..#..,#',
        '#,.M.......M.,#',
        '#,....#......,#',
        '#,.#...M.G...,#',
        '#,,,,,,,,,,,,,#',
        '###############',
      ],
      exits: { n: null, e: 'orsane_eboulis_passe', s: null, w: 'orsane_eboulis_relais' },
      npcs: [],
      nodes: ['pierre_de_calcaire', 'bois_noueux'],
      groups: [
        { taille: [2, 4], monsters: ['brimbe', 'brimbe', 'grouk'], level: [31, 38], respawn: 70 },
        { taille: [3, 4], monsters: ['brimbe', 'veilloche', 'grouk', 'grouk'], level: [29, 38], respawn: 75 },
        { taille: [2, 4], monsters: ['thelk', 'glek', 'glek'], level: [31, 38], respawn: 75 },
        { taille: [3, 4], monsters: ['brimbe', 'brimbe', 'brimbe', 'veilloche'], level: [29, 38], respawn: 75 },
        { taille: [3, 4], monsters: ['grouk', 'grouk', 'grouk', 'veilloche'], level: [29, 38], respawn: 75 },
        { fixe: true, monsters: ['pilou_defait', 'pilou_defait', 'brimbe'], level: [31, 36], respawn: 75 },
      ],
      dungeon: null,
      relay: false,
    },
    {
      id: 'orsane_eboulis_passe', name: 'La Passe de Kaldum', sousZone: 'la Passe de Kaldum', penche: { thelk: 1.5, brimbe: 1.5 }, level: [35, 40],
      layout: [
        '###############',
        '##,,,,,,,,,,,##',
        '#,...........,#',
        '#,.M.....#..P,#',
        '#,........M..,#',
        '##.....#....L,#',
        '###..........##',
        'w.............e',
        '###..........##',
        '##..G..M....L,#',
        '#,...........,#',
        '#,....M......,#',
        '#,.........M.,#',
        '##,,,,,,,,,,,##',
        '###############',
      ],
      exits: { n: null, e: 'kaldum_ville_porte', s: null, w: 'orsane_eboulis_chaos' },
      npcs: ['ulkara'],
      nodes: ['pierre_de_calcaire'],
      groups: [
        { taille: [2, 4], monsters: ['brimbe', 'brimbe', 'veilloche'], level: [35, 40], respawn: 75 },
        { taille: [2, 4], monsters: ['thelk', 'thelk', 'brimbe'], level: [35, 40], respawn: 80 },
        { taille: [1, 2], monsters: ['korvath'], level: [43, 48], respawn: 600 },
        { taille: [3, 4], monsters: ['brimbe', 'brimbe', 'grouk', 'veilloche'], level: [35, 40], respawn: 80 },
        { taille: [3, 4], monsters: ['brimbe', 'brimbe', 'brimbe', 'brimbe'], level: [35, 40], respawn: 80 },
      ],
      dungeon: null,
      relay: false,
    },
  ],
});

DATA.content.npcs.push({
  id: 'varek', name: 'Varek', title: 'Relayeur de l\'Aube', look: 'garde',
  dialogue: ['Bienvenue sur les Cimes, Veilleur. Le Relais est à toi : touche-le, il te ramènera toujours ici.', 'Les Glyms ont volé la moitié des lanternes cette nuit. Si tu veux te rendre utile, c\'est le moment.'],
});
DATA.content.npcs.push({
  id: 'lotha', name: 'Lotha', title: 'Marchande du Comptoir', look: 'marchand', marche: 'vivres',
  dialogue: ['Pain de Cime, pain de Grouk, de quoi tenir sur les sentiers. Et le prix est honnête, parole de Lotha.', 'Les Dragmes, ça se gagne. Les Glyms en ont plein les plumes, va savoir pourquoi.'],
  shop: ['pain_de_cime', 'pain_de_grouk', 'potion_de_relais', 'coiffe_marcheur', 'cape_marcheur', 'amulette_marcheur', 'bottes_marcheur'],
});
DATA.content.npcs.push({
  id: 'thila', name: 'Thila', title: 'Tailleuse des Cimes', look: 'artisan', workshop: 'tailleur',
  dialogue: ['Les plumes de Glym font les meilleures coiffes. Légères, chaudes, et elles sifflent dans le vent.', 'Apporte-moi de quoi coudre et je te montre comment on taille une cape.'],
});
DATA.content.npcs.push({
  id: 'korvel', name: 'Korvel', title: 'Cordonnier', look: 'artisan', workshop: 'cordonnier',
  dialogue: ['Tu marches beaucoup, Veilleur ? Alors il te faut de bonnes bottes. Et des semelles. Et moi.', 'Le cuir de Grouk, rien de plus solide. Sauf le Grouk lui-même, mais on ne le chausse pas.'],
});
DATA.content.npcs.push({
  id: 'rilka', name: 'Rilka', title: 'Bijoutière', look: 'artisan', workshop: 'bijoutier',
  dialogue: ['Une amulette, ce n\'est pas un bijou. C\'est un morceau d\'aube qu\'on porte sur le coeur.', 'Le calcaire des Sentiers se taille bien. Rapporte-m\'en, je te fais quelque chose.'],
});
DATA.content.npcs.push({
  id: 'thorak', name: 'Thorak', title: 'Forgeron', look: 'artisan', workshop: 'forgeron',
  dialogue: ['Ici on forge. Pas de bavardage, le métal n\'attend pas.', 'Du bois noueux pour le manche, du cuir pour la poignée, et ta lame tiendra vingt ans.'],
});
DATA.content.npcs.push({
  id: 'velka', name: 'Velka', title: 'Alchimiste', look: 'artisan', workshop: 'alchimiste',
  dialogue: ['Herbe de veille, cire de Veilloche, un peu de patience : voilà une potion de Relais.', 'Ne bois pas ce qui fume en vert. Celle-là, c\'est pour les Grouks.'],
});
DATA.content.npcs.push({
  id: 'borrik', name: 'Borrik', title: 'Bûcheron', look: 'artisan', workshop: 'bucheron',
  dialogue: ['Un arbre, ça ne se coupe pas, ça se demande. Ensuite on scie, et on scie droit.', 'Le Bois Noueux casse les mauvaises lames. Les bonnes, il les rend meilleures.'],
});
DATA.content.npcs.push({
  id: 'dunna', name: 'Dunna', title: 'Mineuse', look: 'artisan', workshop: 'mineur',
  dialogue: ['Le calcaire des Cimes, on le casse à la main. Le minerai, on le fond ici, et on en tire des lingots.', 'Thorak dit que mes alliages sont trop durs. Il dit ça parce qu\'ils lui usent ses marteaux.'],
});
DATA.content.npcs.push({
  id: 'tessel', name: 'Tessel', title: 'Paysanne', look: 'artisan', workshop: 'paysan',
  dialogue: ['On fauche dans les Clairières, on moud ici. La farine des Cimes fait le pain de toute la ville.', 'Pétra me prend tout mon grain. Je fais semblant de m\'en plaindre.'],
});
DATA.content.npcs.push({
  id: 'nilo', name: 'Nilo', title: 'Pêcheur', look: 'artisan', workshop: 'pecheur',
  dialogue: ['Un poisson bien préparé te rend plus de forces qu\'une potion ratée. Demande à Velka, elle te le dira.', 'Les ruisseaux des Clairières sont froids. Les poissons qui y vivent ont du caractère.'],
});
DATA.content.npcs.push({
  id: 'evrin', name: 'Évrin', title: 'Sculpteur', look: 'artisan', workshop: 'sculpteur',
  dialogue: ['Un arc, c\'est du bois qui a envie de revenir droit. Mon travail, c\'est de l\'en empêcher.', 'Bâtons, baguettes, arcs : apporte-moi le bois, je trouve ce qu\'il cache.'],
});
DATA.content.npcs.push({
  id: 'ostrid', name: 'Ostrid', title: 'Façonneuse', look: 'artisan', workshop: 'faconneur',
  dialogue: ['Un bouclier ne gagne pas les combats. Il te laisse le temps de les gagner.', 'Les pierres d\'âme se façonnent à froid. Le feu, c\'est pour Thorak.'],
});
DATA.content.npcs.push({
  id: 'jorrin', name: 'Jorrin', title: 'Bricoleur', look: 'artisan', workshop: 'bricoleur',
  dialogue: ['Une porte de donjon, une serrure, une clé. Je fais les clés ; les donjons, c\'est toi.', 'Rapporte-moi de quoi tailler une clé et je te rouvre ce que tu veux.'],
});
DATA.content.npcs.push({
  id: 'ysolde', name: 'Ysolde', title: 'Banquière de l\'Aube', look: 'tisseur', banque: true,
  dialogue: ['Ce que tu déposes ici reste à toi, objets et Dragmes, et ton sac s\'en trouve plus léger.', 'Un coffre sans fond, disent les Veilleurs. Il en a un, mais personne n\'y a jamais touché.'],
});
DATA.content.npcs.push({
  id: 'garen', name: 'Garen', title: 'Comptoir des équipements', look: 'marchand', marche: 'equipements',
  dialogue: ['Capes, amulettes, bottes, armes : mon étal change chaque matin. Reviens voir.', 'Tu reviendras me vendre ce que tu trouves en bas. Tout le monde revient.'],
});
DATA.content.npcs.push({
  id: 'mira', name: 'Mira', title: 'Comptoir des ressources', look: 'marchand', marche: 'ressources',
  dialogue: ['Plumes, cuir, soie, cire : ce qu\'il faut aux ateliers quand la récolte a été maigre.', 'Je rachète mieux que les marchands des routes. Mais si tout le monde m\'apporte des plumes le même jour, la plume baisse.'],
});
DATA.content.npcs.push({
  id: 'aldric', name: 'Aldric', title: 'Maître des Métiers', look: 'ancien', metiers: true,
  dialogue: ['Chaque métier a son atelier dans la Rue des Ateliers, à l\'est : la forge, la taille, la cordonnerie, la bijouterie, l\'alchimie. Touche la machine, l\'artisan fera le reste.', 'Ce qui se récolte dehors se façonne ici. Rapporte, fabrique, recommence : c\'est tout le secret.'],
});
DATA.content.npcs.push({
  id: 'brakk', name: 'Brakk', title: 'Armurier des Terrasses', look: 'artisan',
  dialogue: ['Une arme à ta main, pas à ta vanité. Prends ce que tu sais tenir.', 'Les lames de Cime coupent droit. Les bâtons, eux, ne coupent rien, mais personne ne s\'en plaint deux fois.'],
  shop: ['lame_de_cime', 'dagues_de_bec', 'arc_de_cime', 'baguette_de_duvet', 'baton_de_cime', 'masse_de_calcaire', 'pelle_noueuse', 'hache_de_cime'],
});
DATA.content.npcs.push({
  id: 'saya', name: 'Saya', title: 'Maîtresse du Dojo', look: 'marcheur', dojo: true,
  dialogue: ['Le Dojo des Cimes est ouvert à tous. Les mannequins de la cour ne rendent pas les coups : essaie tes sorts sur eux avant de les essayer sur un Grouk.', 'Un Veilleur qui ne s\'entraîne pas apprend sur le terrain. Le terrain, lui, n\'est pas patient.', 'L\'épreuve du jour, c\'est mes élèves au bâton, par vagues, et le maître d\'armes pour finir. Tiens en huit tours et la Garde te doit un Insigne. Une fois par jour, pas deux.'],
});
DATA.content.npcs.push({
  id: 'hessa', name: 'Hessa', title: 'Capitaine de la Garde', look: 'garde', avis: true,
  dialogue: ['La Garde des Cimes tient la Place, la Porte et les murs. Dehors, c\'est à toi de tenir.', 'Les avis de recherche sont cloués à la tour : un par zone, une prime chacun. Ramène-moi la bête, je paie en Dragmes et en Insignes.'],
});
DATA.content.npcs.push({
  id: 'ismere', name: 'Ismère', title: 'Gardienne du Temple des Voies', look: 'ancien', temple: true,
  dialogue: ['Neuf statues, neuf Voies. Chacune a commencé par un geste, et chacune a fini par un serment.', 'La Garde paie ses primes en Insignes. Ici, un Insigne vaut une page de ce que les Voies ont appris.', 'Les maîtres des Voies se tiennent près de leur statue. Ils ne parlent pas aux Veilleurs : ils les regardent, et c\'est moi qui transmets.'],
});
DATA.content.resources.push({ id: 'sceau_de_la_garde', name: 'Insigne de la Garde', monnaie: true, drops: [], node: null, price: 8,
  lore: 'Un jeton de cire bleue frappé de la tour des Cimes. La Garde le donne pour chaque bête ramenée ; le Temple le reprend contre ses pages.' });
(DATA.content.avis = DATA.content.avis || []).push(
  { id: 'avis_brask', monstre: 'brask', niveau: 11, carte: 'orsane_clairieres_oree', groupe: 2, lieu: 'à l\'Orée des Sentiers, au bout des Clairières',
    texte: 'Un vieux Grouk qui charge les charrettes des fermes. Deux ou trois Grouks le suivent partout.', prime: { xp: 300, fils: 40, sceaux: 1 } },
  { id: 'avis_meche_folle', monstre: 'meche_folle', niveau: 19, carte: 'orsane_sentiers_corniche', groupe: 3, lieu: 'sur la Corniche des Sentiers',
    texte: 'Une Loche qui brûle les ponts de corde. Elle vole avec deux Loches et un Tissefil.', prime: { xp: 700, fils: 70, sceaux: 2 } },
  { id: 'avis_nouette', monstre: 'nouette', niveau: 29, carte: 'orsane_toiles_sortie', groupe: 3, lieu: 'au Bord des Éboulis, à la sortie des Toiles',
    texte: 'La plus vieille fileuse des Toiles. Deux Tissefils Anciens et une Veilloche la gardent.', prime: { xp: 1300, fils: 110, sceaux: 3 } },
  { id: 'avis_gravas', monstre: 'gravas', niveau: 37, carte: 'orsane_eboulis_chaos', groupe: 0, lieu: 'dans le Chaos des Éboulis',
    texte: 'Une Brimbe grosse comme un rocher, qui ferme la route de Kaldum. Deux Brimbes et un Grouk tiennent la pente avec elle.', prime: { xp: 2000, fils: 160, sceaux: 4 } },
);
DATA.content.npcs.push({
  id: 'petra', name: 'Pétra', title: 'Boulangère de la Porte', look: 'marchand',
  dialogue: ['Pain de Cime chaud du matin, pain de Grouk pour les longues marches. Prends-en avant de sortir.', 'Les gardes me prennent tout à l\'aube. Viens tôt, ou viens souvent.'],
  shop: ['pain_de_cime', 'pain_de_grouk', 'potion_de_relais'],
});
DATA.content.npcs.push({
  id: 'kelthar', name: 'Kelthar', title: 'Ancien des Cimes', look: 'ancien',
  dialogue: ['J\'ai vu le nord brûler, petit. Enfin, je crois. Ma mémoire a des trous.', 'Les lanternes de l\'Aube tiennent les bêtes à distance. Quand elles s\'éteignent, le monde descend d\'un cran.'],
});
DATA.content.npcs.push({
  id: 'vali', name: 'Vali', title: 'Enfant des Terrasses', look: 'enfant',
  dialogue: ['Tu es un vrai Veilleur ? Tu as déjà battu un Grouk ? Et un Glym ? Et un gros rocher ?', 'J\'ai perdu ma toupie. Enfin, un Glym l\'a trouvée avant moi.'],
});
DATA.content.npcs.push({
  id: 'orvak', name: 'Orvak', title: 'Gardien de la Porte', look: 'garde',
  dialogue: ['Au-delà de cette porte, les Clairières. Au-delà des Clairières, tout le reste.', 'Les Glyms piquent les lanternes et les cachent dans les arbres. Ils croient que c\'est drôle.'],
});
DATA.content.npcs.push({
  id: 'ravik', name: 'Ravik', title: 'Guide des Sentiers', look: 'marcheur',
  dialogue: ['Les Sentiers montent, puis ils montent encore. Touche le Relais ici, tu me remercieras.', 'Les Grouks dormaient depuis dix ans. Quelque chose les a réveillés, et ce n\'est pas moi.'],
});
DATA.content.npcs.push({
  id: 'thoril', name: 'Thoril', title: 'Éleveur de Veilloches', look: 'ancien',
  dialogue: ['Voici Volu. C\'est un Veilloche. Non, il ne mord pas. Oui, il met le feu aux rideaux.', 'Un Veilloche apprivoisé, ça éclaire la maison et ça chauffe la soupe. Il faut juste le tenir loin de l\'eau.'],
});
DATA.content.npcs.push({
  id: 'thevra', name: 'Thevra', title: 'Éclaireuse de l\'Aube', look: 'tisseur',
  dialogue: ['Les Toiles grandissent chaque nuit. Hier elles étaient à la crête, aujourd\'hui elles touchent mes bottes.', 'Un Tissefil seul, ça se gère. Quatre dans un nid, c\'est une autre histoire.'],
});
DATA.content.npcs.push({
  id: 'karvel', name: 'Larkoth', title: 'Garde des Éboulis', look: 'garde',
  dialogue: ['Derrière moi, le Terrier. Dedans, le Grand Grouk. Tu veux vraiment entrer ?', 'La passe de l\'est mène à Kaldum. Chaud, bruyant, plein de Kaldrin. Tu vas adorer.'],
});

DATA.content.npcs.push({
  id: 'avreth', name: 'Avreth', title: 'Émissaire de l\'Aube', look: 'tisseur',
  dialogue: ['L\'Aube tient les feux allumés et les Marques sur des peaux dignes, Veilleur. Quelqu\'un doit bien le faire.', 'La Chaîne t\'a déjà parlé ? Elle parle beaucoup. Nous, nous scellons.'],
  factionLines: {
    fil: ['Un fil d\'or au-dessus de la tête : tu es des nôtres. Okrel t\'attend à la Porte de Kaldum.'],
    dechirure: ['Tu portes la cape fendue. Passe, Veilleur : l\'Aube ne retient personne. Elle scelle derrière.'],
  },
});
DATA.content.npcs.push({
  id: 'lekra', name: 'Lekra', title: 'Émissaire de la Chaîne', look: 'marcheur',
  dialogue: ['L\'Aube scelle tout ce qu\'elle ne comprend pas. Nous, on regarde d\'abord.', 'Il y a des villes entières sous la cendre. Tu ne veux pas savoir ce qui y dort ?'],
  factionLines: {
    dechirure: ['La Fosse t\'a vu passer. Kethril dit que tu descends bien.'],
    fil: ['Un fil d\'or au-dessus de la tête ? Il brille bien. Il cache mal ce qu\'il y a dessous.'],
  },
});
DATA.content.npcs.push({
  id: 'elkor', name: 'Elkor', title: 'Convoyeur des Francs-Marcheurs', look: 'marchand',
  dialogue: ['L\'Aube, la Chaîne : ma guilde vend aux deux, et les deux paient. Chacun son serment, moi je garde mes mules.', 'Une Marque ? J\'en ai trois. Des vraies, presque. Non, je plaisante. Enfin, à moitié.'],
});
DATA.content.npcs.push({
  id: 'ulkara', name: 'Ulkara', title: 'Guetteuse de la Passe', look: 'ancien',
  dialogue: ['Sur cette Passe, personne ne commande. Ni l\'Aube, ni la Chaîne. C\'est pour ça qu\'on y prête serment.', 'Chaque soir, le col descend. Je le regarde passer, et je compte ceux qui ont eu peur.'],
  factionLines: {
    fil: ['Tu as choisi l\'Aube. La Passe s\'en souvient, et elle ne te juge pas.', 'Un serment se renie ici aussi, devant moi. Ça coûte deux rangs, et un peu de fierté.'],
    dechirure: ['Tu as choisi la Chaîne. La Passe s\'en souvient, et elle ne te juge pas.', 'Un serment se renie ici aussi, devant moi. Ça coûte deux rangs, et un peu de fierté.'],
  },
});
DATA.content.npcs.push({
  id: 'kethril', name: 'Kethril', title: 'Maîtresse de la Fosse', look: 'marcheur',
  dialogue: ['La Fosse n\'a pas de porte. Ceux qui la trouvent ont le droit d\'y rester.', 'L\'Aube appelle ça une blessure. Nous, on appelle ça une fenêtre.'],
  factionLines: {
    dechirure: ['Une entaille de plus sur ta cape, Veilleur. Le dessous te va bien.'],
    fil: ['Une flamme d\'or à la Fosse. Assieds-toi, regarde. Personne ne te demandera de sceller quoi que ce soit.'],
  },
});

DATA.content.quests.push({
  id: 'orsane_arrivee', name: 'L\'arrivée sur les Cimes', level: 1, main: true,
  giver: 'varek', turnIn: 'orvak', requires: { level: 1, quests: [] },
  steps: [
    { type: 'talk', npc: 'lotha', text: 'Se présenter à Lotha, au Comptoir' },
    { type: 'visit', map: 'orsane_cimes_porte', text: 'Descendre à la Porte des Clairières' },
    { type: 'talk', npc: 'orvak', text: 'Parler à Orvak, le gardien de la Porte' },
  ],
  dialogue: {
    offer: ['Tu as la Flamme dans les mains, on le voit d\'ici. Alors tu es des nôtres.', 'Fais le tour de la ville. Lotha tient le Comptoir, Orvak tient la Porte. Ils t\'attendent.'],
    progress: ['La Porte est au sud de la place. Suis les lanternes.'],
    done: ['Tu connais la ville. Maintenant il faut qu\'elle te connaisse.'],
  },
  rewards: { xp: 48, fils: 15, items: [{ id: 'pain_de_cime', count: 2 }] },
});
DATA.content.quests.push({
  id: 'orsane_visite_cite', name: 'La visite de la Cité', level: 1,
  giver: 'maelis', turnIn: 'maelis', requires: { level: 1, quests: ['orsane_arrivee'] },
  steps: [
    { type: 'talk', npc: 'ysolde', text: 'Passer à la Banque de l\'Aube, à l\'ouest de la Place' },
    { type: 'talk', npc: 'garen', text: 'Voir le Marché des Cimes, au sud-ouest de la Place' },
    { type: 'talk', npc: 'aldric', text: 'Entrer à l\'Hôtel des Métiers, au nord-est de la Place' },
    { type: 'talk', npc: 'saya', text: 'Monter au Dojo des Cimes, sur les Terrasses' },
    { type: 'talk', npc: 'maelis', text: 'Revenir voir Maëlis, près du Relais' },
  ],
  dialogue: {
    offer: ['Une ville, ça se connaît à pied. La Banque garde ce que tu ne portes pas, le Marché achète ce que tu rapportes, l\'Hôtel des Métiers t\'apprend à fabriquer, le Dojo à frapper juste.', 'Fais le tour, puis reviens me voir.'],
    progress: ['La Banque est à l\'ouest de la Place, le Marché au sud-ouest, l\'Hôtel des Métiers au nord-est, le Dojo en haut, sur les Terrasses.'],
    done: ['Te voilà des Cimes. Les Clairières t\'attendent, et plus loin les Sentiers, les Toiles, les Éboulis.'],
  },
  rewards: { xp: 40, fils: 20, items: [{ id: 'pain_de_cime', count: 2 }] },
});
DATA.content.quests.push({
  id: 'orsane_lanternes_volees', name: 'Les lanternes volées', level: 3, main: true,
  giver: 'orvak', requires: { level: 1, quests: ['orsane_arrivee'] },
  steps: [
    { type: 'kill', monster: 'pilou', count: 5, text: 'Chasser cinq Glyms Ancestraux dans les Clairières' },
    { type: 'collect', item: 'plume_de_pilou', count: 3, text: 'Ramasser trois plumes de Glym' },
    { type: 'talk', npc: 'orvak', text: 'Rendre compte à Orvak' },
  ],
  dialogue: {
    offer: ['Les Glyms ont pris six lanternes cette nuit. Sans lumière, la Porte ne tient pas.', 'Va dans les Clairières, fais-les tomber. Ramène-moi des plumes : je veux savoir d\'où ils viennent.'],
    progress: ['Les Glyms nichent dans les Prés, juste après le Seuil.'],
    done: ['Des plumes grises. Ceux-là ne sont pas d\'ici. Quelque chose les pousse vers nous.', 'Varek doit le savoir. Monte le lui dire.'],
  },
  rewards: { xp: 146, fils: 25, items: [{ id: 'sandales_de_duvet', count: 1 }] },
});
DATA.content.quests.push({
  id: 'orsane_grenier_des_pilous', name: 'Le Grenier des Glyms', level: 7, main: true,
  giver: 'varek', turnIn: 'orvak', requires: { level: 5, quests: ['orsane_lanternes_volees'] },
  startItems: [{ id: 'cle_du_grenier', count: 1 }],
  steps: [
    { type: 'visit', map: 'orsane_clairieres_bosquet', text: 'Trouver la vieille grange du Bosquet' },
    { type: 'dungeon', dungeon: 'grenier_des_pilous', text: 'Reprendre les lanternes dans le Grenier des Glyms' },
    { type: 'talk', npc: 'orvak', text: 'Rapporter les lanternes à Orvak' },
  ],
  dialogue: {
    offer: ['Des plumes grises, et pas une lanterne. Les Glyms ne les cassent pas : ils les entassent.', 'Chaque nuit, une lueur passe au-dessus du Bosquet, dans le grenier de la vieille grange. Nos lanternes sont là-haut.', 'Monte les reprendre et rends-les à Orvak. La Porte en a besoin avant la nuit.'],
    progress: ['La grange est au fond du Bosquet, au sud des Prés. Celui qui tient la plus grosse lanterne esquive tout de loin : va le frapper au contact.'],
    done: ['Six lanternes. Cabossées, mais elles brûlent. La Porte tiendra cette nuit.', 'Ce Chapardeur ne volait pas pour lui. Il fuyait quelque chose, plus bas, vers la Mare. Varek doit l\'apprendre.'],
  },
  rewards: { xp: 441, fils: 30, items: [{ id: 'amulette_pilou', count: 1 }] },
});
DATA.content.quests.push({
  id: 'orsane_reveil_des_grouks', name: 'Le réveil des Grouks', level: 9, main: true,
  giver: 'varek', turnIn: 'ravik', requires: { level: 7, quests: ['orsane_grenier_des_pilous'] },
  steps: [
    { type: 'visit', map: 'orsane_clairieres_mare', text: 'Aller voir la Mare aux Grouks' },
    { type: 'kill', monster: 'grouk', count: 6, text: 'Repousser six Grouks' },
    { type: 'collect', item: 'cuir_de_grouk', count: 4, text: 'Récupérer quatre cuirs de Grouk' },
    { type: 'talk', npc: 'ravik', text: 'Rejoindre Ravik au Relais des Sentiers' },
  ],
  dialogue: {
    offer: ['Les Grouks dormaient sous la mare depuis dix ans. Ils sont debout, et ils montent vers la ville.', 'Repousse-les. Ravik, notre guide des Sentiers, a vu quelque chose là-haut. Rejoins-le avec des cuirs, il saura lire les marques.'],
    progress: ['Les Grouks chargent et poussent. Garde un rocher dans ton dos.'],
    done: ['Ces cuirs portent des fils gris. Les Toiles descendent, Veilleur, et les Grouks fuient devant elles.'],
  },
  rewards: { xp: 630, fils: 40, items: [{ id: 'cape_de_plumes', count: 1 }] },
});
DATA.content.quests.push({
  id: 'orsane_fil_tendu', name: 'Le Col des Toiles', level: 15, main: true,
  giver: 'ravik', turnIn: 'thevra', requires: { level: 13, quests: ['orsane_reveil_des_grouks'] },
  steps: [
    { type: 'equip', slot: 'cape', text: 'Porter une cape avant de monter' },
    { type: 'kill', monster: 'tissefil', count: 6, text: 'Couper six Tissefils sur les Sentiers' },
    { type: 'visit', map: 'orsane_sentiers_crete', text: 'Atteindre la Crête' },
    { type: 'talk', npc: 'thevra', text: 'Trouver Thevra au seuil des Toiles' },
  ],
  dialogue: {
    offer: ['Au-dessus du Pont, les Tissefils ont tendu leurs fils en travers du chemin. La lumière du Relais ne passe plus.', 'Couvre-toi, monte, coupe ce qui bloque. Thevra, notre éclaireuse, campe juste après la Crête.'],
    progress: ['Les toiles enracinent un tour. Frappe de loin ou avance à deux.'],
    done: ['Tu as rouvert le chemin jusqu\'ici. Mais regarde derrière moi : ce n\'est plus une toile, c\'est une forêt.'],
  },
  rewards: { xp: 1337, fils: 55, items: [{ id: 'pain_de_grouk', count: 3 }] },
});
DATA.content.quests.push({
  id: 'orsane_toiles_etendues', name: 'Les Toiles s\'étendent', level: 23, main: true,
  giver: 'thevra', turnIn: 'karvel', requires: { level: 21, quests: ['orsane_fil_tendu'] },
  steps: [
    { type: 'collect', item: 'soie_de_tissefil', count: 6, text: 'Récupérer six soies de Tissefil' },
    { type: 'kill', monster: 'veilloche', count: 4, text: 'Éteindre quatre Veilloches' },
    { type: 'visit', map: 'orsane_toiles_nid', text: 'Trouver le Nid des Toiles' },
    { type: 'kill', monster: 'tissefil', count: 8, text: 'Vider le Nid de huit Tissefils' },
    { type: 'talk', npc: 'karvel', text: 'Rejoindre Larkoth au Relais des Éboulis' },
  ],
  dialogue: {
    offer: ['Les Toiles ne poussent pas toutes seules. Quelque chose les nourrit, et les Veilloches les éclairent pour que les Tissefils travaillent la nuit.', 'Ramène-moi de la soie, je veux comprendre le tissage. Puis trouve le nid et vide-le. Larkoth, de l\'autre côté, garde ce que je crains.'],
    progress: ['Le nid est au sud du seuil. Quatre Tissefils par groupe : ne te fais pas enraciner au milieu.'],
    done: ['Tu arrives des Toiles ? Alors Thevra t\'a parlé du Terrier. Les fils partent tous d\'ici.'],
  },
  rewards: { xp: 2558, fils: 75, items: [{ id: 'amulette_tissefil', count: 1 }] },
});
DATA.content.quests.push({
  id: 'orsane_le_terrier', name: 'Le Terrier', level: 33, main: true,
  giver: 'karvel', requires: { level: 29, quests: ['orsane_toiles_etendues'] },
  startItems: [{ id: 'cle_du_terrier', count: 1 }],
  steps: [
    { type: 'kill', monster: 'brimbe', count: 6, text: 'Écarter six Brimbes des Éboulis' },
    { type: 'collect', item: 'galet_de_brimbe', count: 5, text: 'Rapporter cinq galets de Brimbe' },
    { type: 'visit', map: 'orsane_eboulis_terrier', text: 'Monter jusqu\'à la Gueule du Terrier' },
    { type: 'dungeon', dungeon: 'terrier_du_grand_grouk', text: 'Vaincre le Grand Grouk dans son Terrier' },
    { type: 'talk', npc: 'karvel', text: 'Revenir voir Larkoth' },
  ],
  dialogue: {
    offer: ['Le Grand Grouk s\'est réveillé le premier. C\'est lui qui a chassé sa horde vers la ville, lui qui a laissé les Toiles monter.', 'Les Brimbes gardent la pente. Passe-les, prends leurs galets pour caler la porte, et entre. Je ne peux pas quitter le Relais.', 'Tiens, la Clé du Terrier. Je n\'en ai qu\'une : la pierre la garde quand on entre. Les suivantes, Thorak te les forgera aux Cimes, avec de la corne, du cuir et des galets.'],
    progress: ['À 60 % de vie, il appelle sa horde. Garde des PA pour ce moment-là.'],
    done: ['Le Grand Grouk est tombé. Les Cimes dormiront mieux, et toi aussi.', 'Mais ce qui l\'a réveillé n\'est pas d\'Orsane. Les Kaldrin ont vu la même chose sous leurs forges. Prends la passe de l\'est : Kaldum t\'attend.'],
  },
  rewards: { xp: 4466, fils: 130, items: [{ id: 'heaume_de_calcaire', count: 1 }, { id: 'potion_de_relais', count: 2 }] },
});

DATA.content.quests.push({
  id: 'orsane_toupie_de_vali', name: 'La toupie de Vali', level: 3, main: false,
  giver: 'vali', requires: { level: 1, quests: [] },
  steps: [
    { type: 'visit', map: 'orsane_clairieres_pres', text: 'Chercher dans les Prés aux Glyms' },
    { type: 'kill', monster: 'pilou', count: 4, text: 'Secouer quatre Glyms Ancestraux' },
    { type: 'talk', npc: 'vali', text: 'Rapporter la toupie à Vali' },
  ],
  dialogue: {
    offer: ['Ma toupie ! Elle tournait, elle tournait, et puis un Glym est passé et elle ne tournait plus.', 'Il est parti vers les Prés. Si tu secoues les Glyms, elle va bien finir par tomber.'],
    progress: ['Elle est rouge. Enfin, elle était rouge. Avec de la boue dessus, peut-être.'],
    done: ['C\'est elle ! Elle tourne encore ! Tiens, j\'ai du pain en trop. Maman n\'est pas au courant.'],
  },
  rewards: { xp: 73, fils: 10, items: [{ id: 'pain_de_cime', count: 2 }] },
});
DATA.content.quests.push({
  id: 'orsane_plumes_de_thila', name: 'Les plumes de Thila', level: 5, main: false,
  giver: 'thila', requires: { level: 3, quests: [] },
  steps: [
    { type: 'collect', item: 'plume_de_pilou', count: 6, text: 'Rassembler six plumes de Glym' },
    { type: 'talk', npc: 'thila', text: 'Rapporter les plumes à Thila' },
  ],
  dialogue: {
    offer: ['J\'ai une commande de six coiffes pour la garde et plus une plume dans l\'atelier.', 'Les Glyms en perdent à chaque coup de vent. Ramasse ce qui tombe, je paie bien.'],
    progress: ['Des plumes entières, s\'il te plaît. Pas des bouts.'],
    done: ['Douces comme un nuage. Tiens, j\'ai tressé un anneau avec les plus petites. Ne le dis pas à la garde.'],
  },
  rewards: { xp: 139, fils: 15, items: [{ id: 'anneau_pilou', count: 1 }] },
});
DATA.content.quests.push({
  id: 'orsane_ronde_d_orvak', name: 'La ronde d\'Orvak', level: 5, main: false,
  giver: 'orvak', requires: { level: 3, quests: ['orsane_arrivee'] },
  steps: [
    { type: 'equip', slot: 'coiffe', text: 'Mettre une coiffe, on ne patrouille pas tête nue' },
    { type: 'kill', monster: 'pilou', count: 8, text: 'Faire tomber huit Glyms Ancestraux au Seuil des Prés' },
    { type: 'talk', npc: 'orvak', text: 'Finir la ronde chez Orvak' },
  ],
  dialogue: {
    offer: ['Mes gardes ont tous la grippe. Tous. Le même jour. Je n\'y crois pas une seconde.', 'Fais la ronde à leur place. Couvre-toi d\'abord, le vent des Cimes ne pardonne pas.'],
    progress: ['Une ronde, c\'est aller jusqu\'au Seuil des Prés, taper ce qui bouge, et revenir.'],
    done: ['Bonne ronde. Si mes gardes guérissent un jour, je leur raconterai comment on fait.'],
  },
  rewards: { xp: 139, fils: 15, items: [{ id: 'cape_pilou', count: 1 }] },
});
DATA.content.quests.push({
  id: 'orsane_semelles_de_korvel', name: 'Les semelles de Korvel', level: 7, main: false,
  giver: 'korvel', requires: { level: 5, quests: [] },
  steps: [
    { type: 'gather', resource: 'bois_de_cime', count: 5, text: 'Couper cinq bois de Cime' },
    { type: 'collect', item: 'cuir_de_grouk', count: 3, text: 'Obtenir trois cuirs de Grouk' },
    { type: 'talk', npc: 'korvel', text: 'Livrer le tout à Korvel' },
  ],
  dialogue: {
    offer: ['Du bois pour la semelle, du cuir pour le dessus. Sans ça, mes bottes ne sont que des chaussettes.', 'Le bois de Cime pousse dans les Clairières. Le cuir, lui, marche encore sur quatre pattes.'],
    progress: ['Un Grouk donne un bon cuir, mais il faut le lui demander fermement.'],
    done: ['Voilà de quoi chausser la ville. Prends cette paire, elle était trop petite pour Thorak.'],
  },
  rewards: { xp: 221, fils: 20, items: [{ id: 'bottes_pilou', count: 1 }] },
});
DATA.content.quests.push({
  id: 'orsane_memoire_de_kelthar', name: 'La mémoire de Kelthar', level: 11, main: false,
  giver: 'kelthar', requires: { level: 9, quests: [] },
  steps: [
    { type: 'visit', map: 'orsane_clairieres_mare', text: 'Regarder près de la Mare' },
    { type: 'visit', map: 'orsane_sentiers_corniche', text: 'Regarder sur la Corniche' },
    { type: 'gather', resource: 'herbe_de_veille', count: 3, text: 'Cueillir trois herbes de veille pour sa tisane' },
    { type: 'talk', npc: 'kelthar', text: 'Revenir voir Kelthar' },
  ],
  dialogue: {
    offer: ['J\'ai posé ma lanterne quelque part. À la Mare. Ou sur la Corniche. Ou sur ma table, mais ça, c\'est moins drôle.', 'Va voir, petit. Et ramène-moi de l\'herbe de veille, ça aide la mémoire. Enfin, il paraît.'],
    progress: ['Tu l\'as trouvée ? Non ? Elle est peut-être sur ma table, finalement.'],
    done: ['Elle était sur ma table. Mais tu as vu du pays, et moi j\'ai ma tisane. Tout le monde y gagne.'],
  },
  rewards: { xp: 422, fils: 25, items: [{ id: 'pain_de_grouk', count: 2 }] },
});
DATA.content.quests.push({
  id: 'orsane_manche_de_thorak', name: 'Le manche de Thorak', level: 13, main: false,
  giver: 'thorak', requires: { level: 11, quests: [] },
  steps: [
    { type: 'gather', resource: 'bois_noueux', count: 5, text: 'Couper cinq bois noueux sur les Sentiers' },
    { type: 'collect', item: 'cuir_de_grouk', count: 5, text: 'Obtenir cinq cuirs de Grouk' },
    { type: 'talk', npc: 'thorak', text: 'Rapporter le tout à Thorak' },
  ],
  dialogue: {
    offer: ['Mon marteau a cassé son manche. Sur une enclume. Ne demande pas.', 'Bois noueux des Sentiers, cuir de Grouk pour la poignée. Vite, le métal refroidit.'],
    progress: ['Noueux, le bois. Pas droit. Le droit casse.'],
    done: ['Ça, c\'est un manche. Tiens, pour ta peine. Et sors de ma forge, tu fais de l\'ombre.'],
  },
  rewards: { xp: 540, fils: 35, items: [{ id: 'pain_de_grouk', count: 3 }] },
});
DATA.content.quests.push({
  id: 'orsane_pierres_de_rilka', name: 'Les pierres de Rilka', level: 17, main: false,
  giver: 'rilka', requires: { level: 15, quests: [] },
  steps: [
    { type: 'gather', resource: 'pierre_de_calcaire', count: 6, text: 'Extraire six pierres de calcaire' },
    { type: 'kill', monster: 'grouk', count: 5, text: 'Chasser cinq Grouks qui rôdent autour des carrières' },
    { type: 'talk', npc: 'rilka', text: 'Rapporter les pierres à Rilka' },
  ],
  dialogue: {
    offer: ['Le calcaire des Sentiers se taille comme du beurre. Si on arrive jusqu\'aux carrières sans finir aplati par un Grouk.', 'Six pierres, bien blanches. Et écarte les Grouks, ils adorent dormir dessus.'],
    progress: ['Les pierres sont sur la Montée et la Corniche. Les Grouks aussi.'],
    done: ['Du beau calcaire. Je t\'ai monté une amulette avec la première pierre. Elle te va bien.'],
  },
  rewards: { xp: 807, fils: 40, items: [{ id: 'amulette_grouk', count: 1 }] },
});
DATA.content.quests.push({
  id: 'orsane_volu_le_veilloche', name: 'Volu le Veilloche', level: 19, main: false,
  giver: 'thoril', requires: { level: 17, quests: [] },
  steps: [
    { type: 'collect', item: 'cire_de_veilloche', count: 4, text: 'Trouver quatre cires de Veilloche pour recoller Volu' },
    { type: 'kill', monster: 'tissefil', count: 5, text: 'Chasser cinq Tissefils qui rôdent autour de la Halte' },
    { type: 'talk', npc: 'thoril', text: 'Revenir voir Thoril et Volu' },
  ],
  dialogue: {
    offer: ['Volu a pris la pluie. Un Veilloche sous la pluie, ça fond. Il lui manque la moitié du dessous.', 'Il faut de la cire de Veilloche pour le recoller. Et chasse les Tissefils, ils veulent en faire une lanterne de nid.'],
    progress: ['Il fond encore un peu. Dépêche-toi, mais sans courir : il a peur des gens qui courent.'],
    done: ['Regarde-le ! Entier, et il chauffe à nouveau la soupe. Prends ces bottes, Volu les a juste un peu roussies.'],
  },
  rewards: { xp: 955, fils: 45, items: [{ id: 'bottes_tissefil', count: 1 }] },
});
DATA.content.quests.push({
  id: 'orsane_tisane_de_velka', name: 'La tisane de Velka', level: 21, main: false,
  giver: 'velka', requires: { level: 19, quests: [] },
  steps: [
    { type: 'gather', resource: 'herbe_de_veille', count: 6, text: 'Cueillir six herbes de veille' },
    { type: 'collect', item: 'cire_de_veilloche', count: 3, text: 'Trouver trois cires de Veilloche' },
    { type: 'talk', npc: 'velka', text: 'Livrer les ingrédients à Velka' },
  ],
  dialogue: {
    offer: ['Les potions de Relais partent plus vite que je ne les brasse. Les Veilleurs se perdent beaucoup, ces temps-ci.', 'Herbe de veille, cire de Veilloche. Je te garde les deux premières fioles.'],
    progress: ['La cire, c\'est ce qui reste quand une Veilloche s\'éteint. Elle ne la donne pas de bon coeur.'],
    done: ['Parfait. Deux fioles pour toi. Si ça fume en vert, c\'est que je me suis trompée de chaudron.'],
  },
  rewards: { xp: 1113, fils: 50, items: [{ id: 'potion_de_relais', count: 2 }] },
});
DATA.content.quests.push({
  id: 'orsane_galets_de_karvel', name: 'Les galets de Larkoth', level: 31, main: false,
  giver: 'karvel', requires: { level: 29, quests: ['orsane_toiles_etendues'] },
  steps: [
    { type: 'kill', monster: 'brimbe', count: 10, text: 'Faire reculer dix Brimbes dans le Chaos' },
    { type: 'collect', item: 'galet_de_brimbe', count: 8, text: 'Ramasser huit galets de Brimbe' },
    { type: 'talk', npc: 'karvel', text: 'Rapporter les galets à Larkoth' },
  ],
  dialogue: {
    offer: ['Les Brimbes me jettent des galets depuis trois jours. J\'ai décidé de les collectionner.', 'Va dans le Chaos, fais-les reculer, et ramène-moi les plus ronds. Je refais le dallage du Relais.'],
    progress: ['Elles reculent après chaque tir. Coince-les contre un rocher.'],
    done: ['Regarde-moi ces galets. Ils paveront le Relais pour cent ans. Tiens, ces bottes sont faites avec le reste.'],
  },
  rewards: { xp: 2027, fils: 90, items: [{ id: 'bottes_brimbe', count: 1 }] },
});
DATA.content.quests.push({
  id: 'orsane_kavous_de_thoril', name: 'Les Kavous de Thoril', level: 25, main: false,
  giver: 'thoril', requires: { level: 23, quests: [] },
  startItems: [{ id: 'cle_de_la_voliere', count: 1 }],
  steps: [
    { type: 'visit', map: 'orsane_sentiers_crete', text: 'Trouver la vieille volière sur la Crête' },
    { type: 'dungeon', dungeon: 'voliere_des_kavous', text: 'Traverser la Volière des Kavous' },
    { type: 'talk', npc: 'thoril', text: 'Revenir voir Thoril' },
  ],
  dialogue: {
    offer: ['Avant les Veilloches, j\'élevais des Kavous. Quatre couleurs, une volière, aucun souci.', 'Puis l\'un d\'eux a picoré les quatre couleurs à la fois. Il a pris la volière, là-haut sur la Crête, et il change de teinte comme de chemise.', 'Regarde sa couleur avant de frapper : il prend la peau du Kavou de la même teinte, en plus dure. Sa fiche te dira quoi lui envoyer.'],
    progress: ['Il change à chacun de ses tours. Relis sa fiche à chaque fois : ce qui le plie en bleu glisse sur lui en roux.'],
    done: ['Le multicolore est tombé ? Volu en a éteint sa mèche de surprise.', 'Garde la volière si tu veux. Moi, je reste aux Veilloches : elles n\'ont qu\'une couleur, et elles s\'y tiennent.'],
  },
  rewards: { xp: 1454, fils: 60, items: [{ id: 'pain_de_grouk', count: 2 }] },
});
DATA.content.quests.push({
  id: 'orsane_cocon_de_thevra', name: 'Le cocon', level: 25, main: false,
  giver: 'thevra', requires: { level: 23, quests: [] },
  startItems: [{ id: 'cle_du_nid', count: 1 }],
  steps: [
    { type: 'visit', map: 'orsane_toiles_nid', text: 'Descendre au Nid des Toiles' },
    { type: 'dungeon', dungeon: 'nid_des_toiles', text: 'Déchirer le cocon de la Fileuse au fond du Nid' },
    { type: 'talk', npc: 'thevra', text: 'Revenir voir Thevra' },
  ],
  dialogue: {
    offer: ['Au fond du Nid, quelque chose file plus vite que tous les Tissefils réunis. Une Fileuse.', 'Elle dort dans un cocon tenu par deux fils. Coupes-en un, elle le renoue en bâillant.', 'Coupe les deux le même tour, et le cocon s\'ouvre. Là, tu frappes. Fort.'],
    progress: ['Deux fils, le même tour. Garde tes PA pour le second, sinon tu recommences.'],
    done: ['Tu as vu sa soie ? Plus fine que la mienne. Je suis jalouse, et je l\'assume.', 'Les Toiles vont arrêter de pousser. Enfin, de pousser aussi vite.'],
  },
  rewards: { xp: 1454, fils: 60, items: [{ id: 'pain_de_grouk', count: 2 }] },
});

DATA.content.quests.push({
  id: 'orsane_le_brin_qui_luit', name: 'Le brin qui luit', level: 33, main: false,
  giver: 'karvel', turnIn: 'kelthar', requires: { level: 33, quests: ['orsane_toiles_etendues'] },
  steps: [
    { type: 'visit', map: 'orsane_sentiers_crete', text: 'Guetter le fil qui luit, sur la Crête des Sentiers' },
    { type: 'kill', monster: 'oreth', count: 1, text: 'Attraper Oreth, le fil qui passe au crépuscule' },
    { type: 'collect', item: 'brin_d_oreth', count: 1, text: 'Garder le Brin d\'Oreth' },
    { type: 'talk', npc: 'kelthar', text: 'Montrer le Brin à Kelthar, l\'ancien des Terrasses' },
  ],
  dialogue: {
    offer: ['Quand je montais la garde sur la Crête, un fil passait au crépuscule. Il luisait, et il fuyait dès qu\'on le regardait.', 'Les vieux l\'appellent Oreth. Attrape-le, garde ce qu\'il laisse, et porte-le à Kelthar, aux Terrasses : il était là le jour de la Grande Colère.'],
    progress: ['Il ne passe qu\'au crépuscule, entre 18 h et 21 h, et jamais sous les yeux de qui le guette : éloigne-toi de la Crête, puis reviens.', 'En combat, Oreth disparaît un tour sur deux. Attends qu\'il revienne, et frappe vite.'],
    done: ['Un Brin d\'Oreth... Il est chaud, petit. Un brin de lumière ne devrait pas être chaud.', 'Ce n\'est pas un brin de lumière. C\'est une étincelle d\'écaille, et je n\'en connais qu\'une qui brûle comme ça : celle d\'Ithren, le dragon disparu le jour de la Grande Colère.', 'Garde l\'œil ouvert. S\'il reste un brin, il reste un chemin.'],
  },
  rewards: { xp: 2233, fils: 80, items: [{ id: 'potion_de_veille', count: 1 }] },
});

DATA.content.quests.push({
  id: 'orsane_la_fissure_du_chaos', name: 'La fissure du Chaos', level: 35, main: false, category: 'faction',
  giver: 'avreth', requires: { level: 33, notFaction: 'dechirure' },
  steps: [
    { type: 'visit', map: 'orsane_eboulis_chaos', text: 'Trouver la fissure, au fond du Chaos' },
    { type: 'kill', monster: 'pilou_defait', count: 4, text: 'Renvoyer quatre Glyms Défaits sous la cendre' },
    { type: 'collect', item: 'soie_de_tissefil', count: 4, text: 'Réunir quatre soies de Tissefil pour le sceau' },
    { type: 'visit', map: 'orsane_eboulis_chaos', text: 'Sceller la fissure du Chaos' },
    { type: 'talk', npc: 'avreth', text: 'Rendre compte à Avreth, au Relais des Éboulis' },
  ],
  dialogue: {
    offer: ['Dans le Chaos, la roche s\'est fendue. Un doigt de large, pas plus : assez pour que des Glyms en remontent, gris, à moitié brûlés.', 'L\'Aube ne laisse pas une fissure ouverte. Renvoie ce qui en sort, apporte de la soie, et scelle. C\'est ainsi qu\'on protège les vivants.'],
    progress: ['La soie de Tissefil tient tout, même une fissure. Il en traîne dans les Toiles, juste à l\'ouest.'],
    done: ['Scellée. Elle tiendra une saison, peut-être deux. Ensuite, quelqu\'un d\'autre la scellera.', 'Voilà l\'Aube, Veilleur : on scelle, encore et encore. Au niveau 20, à la Passe de Kaldum, tu pourras nous prêter serment.'],
  },
  rewards: { xp: 2447, fils: 85, items: [{ id: 'pain_de_scorie', count: 2 }] },
});
DATA.content.quests.push({
  id: 'orsane_ce_qui_remonte', name: 'Ce qui remonte', level: 35, main: false, category: 'faction',
  giver: 'lekra', turnIn: 'kethril', requires: { level: 33, notFaction: 'fil' },
  steps: [
    { type: 'visit', map: 'orsane_eboulis_chaos', text: 'Regarder la fissure du Chaos, sans la toucher' },
    { type: 'kill', monster: 'pilou_defait', count: 3, text: 'Étudier trois Glyms Défaits : ce qu\'ils gardent du dessous' },
    { type: 'kill', monster: 'brimbe_fendue', count: 1, text: 'Voir une Brimbe Fendue éclater, à la Gueule du Terrier' },
    { type: 'talk', npc: 'kethril', text: 'Porter tes notes à Kethril, à la Fosse, au-dessus du Terrier' },
  ],
  dialogue: {
    offer: ['L\'Aube va te demander de sceller la fissure du Chaos. Avant, regarde ce qui en sort.', 'Les Glyms Défaits, les Brimbes Fendues : ils viennent de la cendre, et ils en rapportent quelque chose. Étudie-les, puis va voir Kethril. La Fosse est au-dessus du Terrier : cherche bien.'],
    progress: ['Une Brimbe Fendue éclate en mourant. Regarde la couleur de l\'éclat, pas tes blessures.'],
    done: ['Tu as trouvé la Fosse. Peu de gens la trouvent sans qu\'on les y conduise.', 'Tes notes disent ce que l\'Aube ne dit jamais : ce qui sort de la cendre n\'est pas mauvais, c\'est perdu. Au niveau 20, à la Passe de Kaldum, tu pourras nous prêter serment.'],
  },
  rewards: { xp: 2447, fils: 85, items: [{ id: 'pain_de_scorie', count: 2 }] },
});
DATA.content.quests.push({
  id: 'orsane_le_convoi_de_la_passe', name: 'Le convoi de la Passe', level: 37, main: false, category: 'faction',
  giver: 'elkor', turnIn: 'ravok', requires: { level: 35 },
  steps: [
    { type: 'visit', map: 'orsane_eboulis_passe', text: 'Partir devant le convoi, jusqu\'à la Passe de Kaldum' },
    { type: 'kill', monster: 'brimbe', count: 5, text: 'Dégager la route de cinq Brimbes' },
    { type: 'kill', monster: 'thelk', count: 2, text: 'Écarter deux Thelks qui bouchent le col' },
    { type: 'visit', map: 'kaldum_ville_porte', text: 'Voir passer le convoi à la Porte de Kaldum' },
    { type: 'talk', npc: 'ravok', text: 'Faire signer le laissez-passer par Thulvar' },
  ],
  dialogue: {
    offer: ['Un convoi de mules pour Kaldum : du sel, des clous, et trois Marques. Fausses, les Marques. Très bien gravées.', 'La Passe est pleine de Brimbes et de boue qui marche. Ouvre la route devant mes mules, puis fais signer le laissez-passer à la Porte. Je paie comme un Franc-Marcheur : bien, et sans te demander ton serment.'],
    progress: ['Les mules ne passent pas sur les Brimbes. Elles passent encore moins sur les Thelks.'],
    done: ['Le convoi d\'Elkor ? Passé, compté, signé. Les mules sentaient le sel et la mauvaise humeur.', 'Il m\'a laissé ta part. Les Francs-Marcheurs paient toujours : c\'est même la seule chose qu\'ils jurent.'],
  },
  rewards: { xp: 2668, fils: 95, items: [{ id: 'potion_de_relais', count: 2 }], marcheurs: 10 },
});
DATA.content.quests.push({
  id: 'orsane_la_passe_au_crepuscule', name: 'La Passe au crépuscule', level: 37, main: true,
  giver: 'karvel', turnIn: 'ulkara', requires: { level: 35, quests: ['orsane_le_terrier'] },
  steps: [
    { type: 'visit', map: 'orsane_eboulis_chaos', text: 'Traverser le Chaos avant la nuit' },
    { type: 'visit', map: 'orsane_eboulis_passe', text: 'Monter à la Passe de Kaldum au crépuscule' },
    { type: 'talk', npc: 'ulkara', text: 'Trouver Ulkara, la guetteuse de la Passe' },
    { type: 'kill', monster: 'brimbe', count: 4, text: 'Tenir le col pendant que Korvath descend : quatre Brimbes' },
    { type: 'talk', npc: 'ulkara', text: 'Revenir auprès d\'Ulkara' },
  ],
  dialogue: {
    offer: ['Le Grand Grouk est tombé, mais la Passe ne dort toujours pas. Chaque soir, au crépuscule, quelque chose descend du col, et les Kaldrin ferment leur Porte.', 'Monte voir. Sur la Passe se tient Ulkara, la guetteuse. Elle ne prend aucun parti : elle regarde. Fais comme elle.'],
    progress: ['Ne cherche pas à l\'arrêter. Regarde-le descendre, et tiens ta place.'],
    done: ['Tu l\'as vu. Korvath : un col entier qui marche. Il descend chaque soir, et chaque matin il remonte là-haut.', 'Ne le touche pas encore, tu n\'as pas son poids. Le jour où tu le disperseras, Kaldum te connaîtra.', 'Tu as tenu la Passe. Écoute, maintenant : c\'est ici, en terrain neutre, que les Veilleurs prêtent serment.'],
  },
  rewards: { xp: 5336, fils: 140, items: [{ id: 'pain_de_scorie', count: 3 }] },
});
DATA.content.quests.push({
  id: 'orsane_le_serment', name: 'Le serment', level: 39, main: true, category: 'faction', repeat: true,
  giver: 'ulkara', requires: { level: 39, quests: ['orsane_la_passe_au_crepuscule'], notFaction: ['fil', 'dechirure'] },
  steps: [
    {
      type: 'answer', npc: 'ulkara', text: 'Prêter serment devant Ulkara, ou refuser',
      prompt: ['Ici, personne ne commande. L\'Aube scelle, la Chaîne ouvre, et aucune des deux n\'a tout à fait tort.', 'Choisis, ou refuse : refuser ne ferme rien. La route de Kaldum reste ouverte, et je serai encore là.'],
      options: [
        { id: 'fil', text: 'Je prête serment à l\'Aube', effects: [{ type: 'faction', id: 'fil' }], reply: ['L\'Aube te reçoit. Okrel, son capitaine, t\'attend à la Porte de Kaldum.'] },
        { id: 'dechirure', text: 'Je prête serment à la Chaîne', effects: [{ type: 'faction', id: 'dechirure' }], reply: ['La Chaîne te reçoit. Kethril t\'attend à la Fosse, au-dessus du Terrier.'] },
        { id: 'plus_tard', text: 'Je refuse pour l\'instant', effects: [{ type: 'later' }], reply: ['Refuser n\'est pas fuir. La Passe ne bouge pas, et moi non plus. Reviens quand tu voudras.'] },
      ],
    },
  ],
  dialogue: {
    offer: ['Tu as tenu la Passe. Alors tu peux choisir, si tu le veux.', 'L\'Aube, la Chaîne, ou personne. Prends le temps qu\'il faut : un serment se prête en un mot, et se renie cher.'],
    progress: ['Prends ton temps. Le col aussi prend le sien.'],
    done: ['C\'est dit. La Passe s\'en souviendra, et moi aussi.'],
  },
  rewards: { xp: 5793, fils: 100 },
});
DATA.content.quests.push({
  id: 'orsane_le_reniement', name: 'Le reniement', level: 39, main: false, category: 'faction', repeat: true, hidden: true,
  giver: 'ulkara', requires: { level: 39, faction: ['fil', 'dechirure'] },
  steps: [
    {
      type: 'answer', npc: 'ulkara', text: 'Renier ton serment devant Ulkara, à la Passe de Kaldum',
      prompt: ['Un serment se renie ici, comme il s\'est prêté. Ça coûte deux rangs, ton ordre et les titres de ta faction.', 'Tu pourras en prêter un autre, au même endroit. C\'est bien décidé ?'],
      options: [
        { id: 'renier', text: 'Je renie mon serment', effects: [{ type: 'renounce' }], reply: ['C\'est fait. Tu n\'appartiens plus qu\'à toi.'] },
        { id: 'garder', text: 'Je garde mon serment', effects: [{ type: 'later' }], reply: ['Bien. Un serment qu\'on garde pèse moins lourd qu\'on croit.'] },
      ],
    },
  ],
  dialogue: {
    offer: ['Renier ? Ça arrive. Va voir Ulkara, à la Passe de Kaldum : c\'est devant elle que ça se fait.'],
    done: ['Le serment se prête encore ici, quand tu voudras. À l\'Aube, à la Chaîne, ou à personne.'],
  },
  rewards: {},
});

DATA.content.dungeons.push({
  id: 'terrier_du_grand_grouk', name: 'Le Terrier du Grand Grouk', zone: 'orsane_eboulis', level: [29, 40],
  entryMap: 'orsane_eboulis_terrier',
  salles3d: { texture: 'terrier', sol: 'terre_battue', paroi: 'terre', lumiere: '#f2a64e', brume: '#2a2018' },
  keyItem: 'cle_du_terrier',
  description: 'Cinq salles creusées sous les Éboulis par dix ans de griffes, de plus en plus chaudes à mesure qu\'on descend. Au fond, le Grand Grouk attend, et sa horde avec lui. On entre avec la Clé du Terrier ; la pierre de la Gueule la garde.',
  rooms: [
    {
      name: 'La gueule',
      layout: [
        '###############',
        '#,,,,,,,,,,,,,#',
        '#,...........,#',
        '#,..#.....#..,#',
        '#,...........,#',
        '#,......M....,#',
        '#,...........,#',
        '#,...........,#',
        '#,...........,#',
        '#,...........,#',
        '#,...Z.......,#',
        '#,..#.....#..,#',
        '#,...........,#',
        '#,,,,,,,,,,,,,#',
        '###############',
      ],
      monsters: [{ id: 'grouk', level: 29 }, { id: 'grouk', level: 29 }, { id: 'grouk', level: 31 }],
    },
    {
      name: 'Les galeries',
      layout: [
        '###############',
        '#,,,,,,#,,,,,,#',
        '#,.....#.....,#',
        '#,.....#.....,#',
        '#,..M........,#',
        '#,...........,#',
        '#,#.........#,#',
        '#,...........,#',
        '#,#.........#,#',
        '#,...........,#',
        '#,........Z..,#',
        '#,.....#.....,#',
        '#,.....#.....,#',
        '#,,,,,,#,,,,,,#',
        '###############',
      ],
      monsters: [{ id: 'grouk', level: 31 }, { id: 'brimbe', level: 31 }, { id: 'brimbe', level: 33 }, { id: 'grouk', level: 33 }],
    },
    {
      name: 'La chambre des lueurs',
      layout: [
        '###############',
        '#,,,,,,,,,,,,,#',
        '#,.L.......L.,#',
        '#,...........,#',
        '#,....ooo....,#',
        '#,...o...o...,#',
        '#,...o.M.o...,#',
        '#,...o...o...,#',
        '#,....o.o....,#',
        '#,...........,#',
        '#,...........,#',
        '#,.L..Z....L.,#',
        '#,...........,#',
        '#,,,,,,,,,,,,,#',
        '###############',
      ],
      monsters: [{ id: 'veilloche', level: 33 }, { id: 'veilloche', level: 35 }, { id: 'grouk', level: 35 }, { id: 'grouk', level: 35 }],
    },
    {
      name: 'Le garde-manger',
      layout: [
        '###############',
        '#,,,,,,,,,,,,,#',
        '#,...........,#',
        '#,..#.....#..,#',
        '#,...........,#',
        '#,....#.#....,#',
        '#,.....M.....,#',
        '#,....#.#....,#',
        '#,...........,#',
        '#,..#.....#..,#',
        '#,...........,#',
        '#,.....Z.....,#',
        '#,...........,#',
        '#,,,,,,,,,,,,,#',
        '###############',
      ],
      monsters: [{ id: 'grouk_cornu', level: 35 }, { id: 'grouk_cornu', level: 35 }, { id: 'groukin', level: 33 }, { id: 'groukin', level: 33 }, { id: 'brimbe', level: 35 }],
    },
    {
      name: 'La tanière',
      layout: [
        '###############',
        '#,,,,,,,,,,,,,#',
        '#,...........,#',
        '#,.#.......#.,#',
        '#,.....R.....,#',
        '#,...R.M.R...,#',
        '#,.....R.....,#',
        '#,.#.......#.,#',
        '#,...........,#',
        '#,...........,#',
        '#,.#...B...#.,#',
        '#,...B.Z.B...,#',
        '#,....B.B....,#',
        '#,,,,,,,,,,,,,#',
        '###############',
      ],
      monsters: [{ id: 'grand_grouk', level: 39 }, { id: 'grouk', level: 35 }, { id: 'grouk', level: 37 }],
      boss: true,
    },
  ],
  rewards: { fils: 150, items: [{ id: 'crocs_du_grand_grouk', rate: 100 }, { id: 'peau_du_grand_grouk', rate: 50 }] },
});

DATA.content.dungeons.push({
  id: 'grenier_des_pilous', name: 'Le Grenier des Glyms', zone: 'orsane_clairieres', level: [7, 12],
  entryMap: 'orsane_clairieres_bosquet',
  salles3d: { tuiles: 'planches', sol: 'planches', paroi: 'bois', lumiere: '#f2c14e', brume: '#2b2418' },
  keyItem: 'cle_du_grenier',
  description: 'Le grenier d\'une vieille grange du Bosquet, où les Glyms entassent toutes les lanternes qu\'ils chapardent. Ça sent la paille, la plume et la mèche brûlée.',
  rooms: [
    {
      name: 'La trappe',
      layout: [
        '###############',
        '#,,,,,,,,,,,,,#',
        '#,L.........L,#',
        '#,...........,#',
        '#,..T.....T..,#',
        '#,.....M.....,#',
        '#,...........,#',
        '#,.##.....##.,#',
        '#,...........,#',
        '#,..T.....T..,#',
        '#,...........,#',
        '#,.....Z.....,#',
        '#,L.........L,#',
        '#,,,,,,,,,,,,,#',
        '###############',
      ],
      monsters: [{ id: 'pilou', level: 7 }, { id: 'piouk', level: 5 }, { id: 'piouk', level: 5 }],
    },
    {
      name: 'Le tas de foin',
      layout: [
        '###############',
        '#,,,,,,#,,,,,,#',
        '#,...L.#.....,#',
        '#,.....#..M..,#',
        '#,...........,#',
        '#,##.......#.,#',
        '#,...L...L...,#',
        '#,.....T.....,#',
        '#,...L...L...,#',
        '#,.#.......##,#',
        '#,...........,#',
        '#,..Z..#.....,#',
        '#,.....#..L..,#',
        '#,,,,,,#,,,,,,#',
        '###############',
      ],
      monsters: [{ id: 'pilou', level: 9 }, { id: 'pilou', level: 9 }, { id: 'groukin', level: 7 }],
    },
    {
      name: 'Le trésor du Chapardeur',
      layout: [
        '###############',
        '#L,,,,,,,,,,,L#',
        '#,L.........L,#',
        '#,...T.R.T...,#',
        '#,...R.M.R...,#',
        '#,.....R.....,#',
        '#,.T.......T.,#',
        '#,....L.L....,#',
        '#,.T.......T.,#',
        '#,...........,#',
        '#,...........,#',
        '#,...T.B.T...,#',
        '#,..BB.Z.BB..,#',
        '#L,,,,,,,,,,,L#',
        '###############',
      ],
      monsters: [{ id: 'pilou_chapardeur', level: 11 }, { id: 'pilou', level: 9 }, { id: 'pilou', level: 11 }],
      boss: true,
    },
  ],
  rewards: { fils: 40, items: [{ id: 'lanterne_cabossee', rate: 100 }, { id: 'plume_doree', rate: 50 }] },
});

DATA.content.dungeons.push({
  id: 'voliere_des_kavous', name: 'La Volière des Kavous', zone: 'orsane_sentiers', level: [23, 28],
  entryMap: 'orsane_sentiers_crete',
  salles3d: { tuiles: 'claire', sol: 'dalles_claires', paroi: 'roche_grise', lumiere: '#e8d890', brume: '#262a38' },
  keyItem: 'cle_de_la_voliere',
  description: 'La vieille volière de Thoril, accrochée à la Crête : un perchoir par couleur, et des Kavous partout. Au sommet, le Kavou Prisme change de couleur plus vite qu\'on ne change d\'avis.',
  rooms: [
    {
      name: 'Le perchoir bleu',
      layout: [
        '###############',
        '#,,,,,,,,,,,,,#',
        '#,..~~...~~..,#',
        '#,..~~.M.~~..,#',
        '#,...........,#',
        '#,.T.......T.,#',
        '#,...........,#',
        '#,....~~~....,#',
        '#,...........,#',
        '#,.T.......T.,#',
        '#,...........,#',
        '#,..~~...~~..,#',
        '#,..~~.Z.~~..,#',
        '#,,,,,,,,,,,,,#',
        '###############',
      ],
      monsters: [{ id: 'kavou_bleu', level: 23 }, { id: 'kavou_bleu', level: 23 }, { id: 'pilou', level: 15 }, { id: 'pilou', level: 15 }],
    },
    {
      name: 'Le perchoir roux',
      layout: [
        '###############',
        '#,,,,,,,,,,,,,#',
        '#,L.........L,#',
        '#,.##.....##.,#',
        '#,.#...M...#.,#',
        '#,...........,#',
        '#,.....T.....,#',
        '#,...T...T...,#',
        '#,.....T.....,#',
        '#,...........,#',
        '#,.#.......#.,#',
        '#,.##..Z..##.,#',
        '#,L.........L,#',
        '#,,,,,,,,,,,,,#',
        '###############',
      ],
      monsters: [{ id: 'kavou_roux', level: 23 }, { id: 'kavou_roux', level: 23 }, { id: 'grouk', level: 25 }],
    },
    {
      name: 'Le perchoir ocre',
      layout: [
        '###############',
        '#,,,,,#,#,,,,,#',
        '#,....#.#....,#',
        '#,...........,#',
        '#,.#...M...#.,#',
        '#,.#.......#.,#',
        '#,...........,#',
        '#,...##.##...,#',
        '#,...........,#',
        '#,.#.......#.,#',
        '#,.#.......#.,#',
        '#,...........,#',
        '#,....#Z#....,#',
        '#,,,,,#,#,,,,,#',
        '###############',
      ],
      monsters: [{ id: 'kavou_ocre', level: 23 }, { id: 'kavou_ocre', level: 23 }, { id: 'grouk', level: 25 }, { id: 'pilou', level: 15 }],
    },
    {
      name: 'Le perchoir blanc',
      layout: [
        '###############',
        '#,,,,,,,,,,,,,#',
        '#,...........,#',
        '#,..o.....o..,#',
        '#,..o..M..o..,#',
        '#,...........,#',
        '#,...........,#',
        '#,.oo.....oo.,#',
        '#,...........,#',
        '#,...........,#',
        '#,..o.....o..,#',
        '#,..o..Z..o..,#',
        '#,...........,#',
        '#,,,,,,,,,,,,,#',
        '###############',
      ],
      monsters: [{ id: 'kavou_blanc', level: 23 }, { id: 'kavou_blanc', level: 23 }, { id: 'grouk', level: 27 }],
    },
    {
      name: 'La grande volière',
      layout: [
        '###############',
        '#,,,,,,,,,,,,,#',
        '#,L.........L,#',
        '#,...........,#',
        '#,...T.R.T...,#',
        '#,...R.M.R...,#',
        '#,.....R.....,#',
        '#,.T.......T.,#',
        '#,...........,#',
        '#,...........,#',
        '#,...T.B.T...,#',
        '#,...B.Z.B...,#',
        '#,L...B.B...L,#',
        '#,,,,,,,,,,,,,#',
        '###############',
      ],
      monsters: [{ id: 'kavou_prisme', level: 27 }, { id: 'kavou_bleu', level: 23 }, { id: 'kavou_roux', level: 23 }],
      boss: true,
    },
  ],
  rewards: { fils: 100, items: [{ id: 'eclat_de_prisme', rate: 100 }, { id: 'plume_changeante', rate: 50 }] },
});

DATA.content.dungeons.push({
  id: 'nid_des_toiles', name: 'Le Nid des Toiles', zone: 'orsane_toiles', level: [23, 28],
  entryMap: 'orsane_toiles_nid',
  salles3d: { texture: 'toiles', sol: 'sous_bois', paroi: 'bois_mort', lumiere: '#c8e0a0', brume: '#1e2428' },
  keyItem: 'cle_du_nid',
  description: 'Sous le Nid, les toiles descendent en galeries tièdes et serrées, où les Filins jouent et les Veilloches éclairent le travail. Tout au fond, la Fileuse dort dans son cocon, tenu par deux fils.',
  rooms: [
    {
      name: 'La toile d\'entrée',
      layout: [
        '###############',
        '#,,,,,T,T,,,,,#',
        '#,....T.T....,#',
        '#,...........,#',
        '#,.T...M...T.,#',
        '#,...........,#',
        '#,...T...T...,#',
        '#,...........,#',
        '#,...T...T...,#',
        '#,...........,#',
        '#,.T.......T.,#',
        '#,...........,#',
        '#,.....Z.....,#',
        '#,,,,,,,,,,,,,#',
        '###############',
      ],
      monsters: [{ id: 'tissefil', level: 23 }, { id: 'filin', level: 13 }, { id: 'filin', level: 13 }, { id: 'tissefil', level: 23 }],
    },
    {
      name: 'Les lueurs',
      layout: [
        '###############',
        '#,,,,,,,,,,,,,#',
        '#,.L.......L.,#',
        '#,...TT......,#',
        '#,...T...M...,#',
        '#,...........,#',
        '#,.......T...,#',
        '#,..L...TT.L.,#',
        '#,...........,#',
        '#,.TT........,#',
        '#,..T........,#',
        '#,.......Z...,#',
        '#,.L.......L.,#',
        '#,,,,,,,,,,,,,#',
        '###############',
      ],
      monsters: [{ id: 'tissefil', level: 25 }, { id: 'tissefil', level: 25 }, { id: 'veilloche', level: 23 }, { id: 'veilloche', level: 25 }],
    },
    {
      name: 'Le cocon',
      layout: [
        '###############',
        '#T,,,,,,,,,,,T#',
        '#,...........,#',
        '#,...........,#',
        '#,.....R.....,#',
        '#,...R.M.R...,#',
        '#,.....R.....,#',
        '#,...........,#',
        '#,...........,#',
        '#,T.........T,#',
        '#,....T.T....,#',
        '#,.....B.....,#',
        '#,..BB.Z.BB..,#',
        '#T,,,,,,,,,,,T#',
        '###############',
      ],
      monsters: [{ id: 'fileuse', level: 27 }, { id: 'tissefil', level: 25 }],
      boss: true,
    },
  ],
  rewards: { fils: 100, items: [{ id: 'cocon_de_fileuse', rate: 100 }, { id: 'soie_de_fileuse', rate: 50 }] },
});


DATA.content.npcs.push({
  id: 'maelis', name: 'Maëlis', title: 'Doyenne des Cimes', look: 'ancien',
  dialogue: ['Les Cimes ne sont pas grandes, mais tout le monde y compte. Moi, je compte tout le monde.', 'Un nouveau visage ? Va saluer ceux qui font tenir la ville. Ils t\'aideront plus vite s\'ils te connaissent.'],
});
DATA.content.npcs.push({
  id: 'fenna', name: 'Fenna', title: 'Archiviste de l\'Aube', look: 'tisseur',
  dialogue: ['Les archives de l\'Aube tiennent dans trois coffres et ma tête. Les coffres sont mieux rangés.', 'Les Marques, Veilleur. Sept dragons, six Marques, et une Écaille volée. Tout commence là.'],
});
DATA.content.npcs.push({
  id: 'brann', name: 'Brann', title: 'Aubergiste de la Lanterne', look: 'marchand',
  dialogue: ['À la Lanterne, on sert du cidre de Cime et des nouvelles fraîches. Le cidre est plus fiable.', 'Si tu cherches du travail, regarde l\'affiche sur ma porte. Si tu cherches à boire, assieds-toi.'],
});
DATA.content.npcs.push({
  id: 'ilsa', name: 'Ilsa', title: 'Caporale de la Porte', look: 'garde',
  dialogue: ['Orvak commande, moi j\'entraîne. Ceux qui passent entre mes mains tiennent la Porte, les autres tiennent le lit.', 'Tu veux servir ? Montre d\'abord que tu sais te battre.'],
});
DATA.content.npcs.push({
  id: 'osk', name: 'Osk', title: 'Gardien du vieux puits', look: 'ancien',
  dialogue: ['Ce puits a avalé trois seaux, deux chèvres et un voyageur. Le voyageur, je le regrette.', 'Quelque chose vit au fond. Ça remonte la nuit, et ça mange tout ce qui brille.'],
});
DATA.content.npcs.push({
  id: 'dalric', name: 'Dalric', title: 'Peintre des lanternes', look: 'artisan',
  dialogue: ['Chaque lanterne de l\'Aube porte sa couleur. Je les repeins une à une, et il y en a mille.', 'Les Kavous ont les plus belles plumes des Clairières. Les plus belles couleurs aussi, si on sait les broyer.'],
});

DATA.content.quests.push({
  id: 'orsane_questions_de_kelthar', name: 'Les questions de Kelthar', level: 1, main: false, category: 'region',
  giver: 'kelthar', turnIn: 'maelis', requires: { level: 1, quests: ['orsane_arrivee'] },
  steps: [
    { type: 'answer', npc: 'kelthar', text: 'Répondre à la question de Kelthar sur les Grands Dragons',
      prompt: ['Avant de te laisser filer, une question. Combien de Grands Dragons ont perdu une Écaille, au temps des Lieurs ?'],
      options: [
        { id: 'sept', text: 'Sept, et l\'une d\'elles court encore', reply: ['Sept, oui. Les dragons ont tout repris, sauf Ithren : la sienne court encore, et le ciel de la Lisière garde sa forme. Tu écoutes, c\'est bien.'] },
        { id: 'six', text: 'Six, je crois', reply: ['Six qui ont repris la leur, et une septième que personne n\'a revue. Tu n\'as pas tort, tu n\'as pas raison. Comme tout le monde.'] },
        { id: 'aucune_idee', text: 'Aucune idée', reply: ['Honnête. C\'est déjà plus que la plupart. Sept, petit. Retiens-le.'] },
      ] },
    { type: 'talk', npc: 'maelis', text: 'Se présenter à Maëlis, la doyenne, sur la place du Relais' },
  ],
  dialogue: {
    offer: ['Tu as la Flamme dans les mains, et des questions plein les yeux. Les Marques, les dragons, la Colère : tout ça se tient.', 'Je te réponds, puis tu iras voir Maëlis. Une ville, ça se découvre par ses gens.'],
    progress: ['Maëlis est sur la place du Relais. Elle te trouvera avant que tu la trouves.'],
    done: ['Kelthar t\'envoie ? Alors il t\'a déjà posé sa question. Il la pose à tout le monde depuis quarante ans.'],
  },
  rewards: { xp: 24, fils: 10, items: [{ id: 'pain_de_cime', count: 2 }] },
});
DATA.content.quests.push({
  id: 'orsane_visages_des_cimes', name: 'Les visages des Cimes', level: 5, main: false, category: 'region',
  giver: 'maelis', turnIn: 'fenna', requires: { level: 1, quests: ['orsane_questions_de_kelthar'] },
  steps: [
    { type: 'talk', npc: 'thila', text: 'Saluer Thila, qui tient la rue des Ateliers' },
    { type: 'talk', npc: 'brann', text: 'Saluer Brann, à l\'auberge de la Lanterne' },
    { type: 'talk', npc: 'lotha', text: 'Saluer Lotha, au Comptoir' },
    { type: 'talk', npc: 'orvak', text: 'Saluer Orvak, qui commande la Porte' },
    { type: 'talk', npc: 'fenna', text: 'Rejoindre Fenna, l\'archiviste, sur les Terrasses' },
  ],
  dialogue: {
    offer: ['Quatre personnes font tenir les Cimes : Thila pour les ateliers, Brann pour l\'auberge, Lotha pour le Comptoir, Orvak pour la Porte.', 'Va les saluer. Ensuite, parle à Fenna sur les Terrasses : tu as des questions sur les Marques, elle a des réponses.'],
    progress: ['Thila, Brann, Lotha, Orvak, puis Fenna. Ce n\'est pas une liste, c\'est une ville.'],
    done: ['Maëlis t\'a fait faire le tour ? Bien. Maintenant, les Marques. Assieds-toi, ça va prendre un moment.'],
  },
  rewards: { xp: 139, fils: 15, items: [{ id: 'ceinture_de_plume', count: 1 }] },
});
DATA.content.quests.push({
  id: 'orsane_legende_d_ithren', name: 'La légende d\'Ithren', level: 9, main: false, category: 'region',
  giver: 'fenna', requires: { level: 7, quests: ['orsane_visages_des_cimes'] },
  steps: [
    { type: 'visit', map: 'orsane_clairieres_ruisseau', text: 'Lire la vieille stèle du Ruisseau' },
    { type: 'answer', npc: 'vali', text: 'Jouer aux osselets avec Vali, qui sait la suite de l\'histoire',
      prompt: ['Je te dis la fin de la légende si tu gagnes. Pair ou impair ?'],
      options: [
        { id: 'pair', text: 'Pair', reply: ['Pair ! Gagné. Enfin, j\'ai triché, mais tu as gagné quand même. Ithren est tombé là où le ciel est vide, au-dessus de la Lisière.'] },
        { id: 'impair', text: 'Impair', reply: ['Impair. Perdu ! Je te la dis quand même : Ithren est tombé là où le ciel est vide. Et quelqu\'un tenait son Écaille.'] },
      ] },
    { type: 'kill', monster: 'kavou_bleu', count: 1, text: 'Vaincre un Kavou, la bête qui garde la couleur du ciel d\'avant la Colère' },
    { type: 'talk', npc: 'fenna', text: 'Raconter à Fenna ce que disent la stèle, Vali et le Kavou' },
  ],
  dialogue: {
    offer: ['Il y a une stèle au Ruisseau, plus vieille que la ville. Elle parle d\'Ithren, le dragon disparu.', 'Lis-la. Puis va voir Vali : les enfants des Terrasses connaissent la fin de la légende mieux que mes coffres. Et les Kavous gardent la couleur du ciel d\'avant la Colère ; regarde-en un de près, de très près.'],
    progress: ['La stèle, Vali, un Kavou. Dans cet ordre, si tu veux comprendre.'],
    done: ['Quelqu\'un tenait son Écaille. C\'est ce qu\'on disait déjà quand j\'étais petite. On ne sait toujours pas qui.', 'Il y a un autre chercheur qui avait une piste. Hargal. Il est descendu au vieux puits de la Halte, et il n\'est pas remonté.'],
  },
  rewards: { xp: 315, fils: 25, items: [{ id: 'amulette_de_bec', count: 1 }] },
});
DATA.content.quests.push({
  id: 'orsane_gueule_du_glouton', name: 'Le Glouton du vieux puits', level: 15, main: false, category: 'region',
  giver: 'fenna', requires: { level: 13, quests: ['orsane_legende_d_ithren'] },
  steps: [
    { type: 'talk', npc: 'osk', text: 'Interroger Osk, le gardien du vieux puits de la Halte' },
    { type: 'kill', monster: 'glouton', count: 1, text: 'Affronter le Glouton du Puits' },
    { type: 'talk', npc: 'fenna', text: 'Rapporter à Fenna le carnet d\'Hargal' },
  ],
  dialogue: {
    offer: ['Hargal cherchait l\'Écaille d\'Ithren depuis vingt ans. Il disait qu\'une piste partait du vieux puits de la Halte.', 'Osk garde le puits. Va le voir. Et si quelque chose a avalé Hargal, fais-le rendre ce qu\'il a pris.'],
    progress: ['La Halte est au-dessus du Relais des Sentiers. Osk ne quitte jamais son puits.'],
    done: ['Le carnet d\'Hargal. Mouillé, mâché, mais lisible. Il a vu une lueur au fond du puits, la même que dans le ciel vide.', 'Il a laissé une adresse : les Toiles. Thevra, l\'Éclaireuse de l\'Aube. C\'est là que tu dois aller.'],
  },
  rewards: { xp: 668, fils: 40, items: [{ id: 'bottes_de_cuir', count: 1 }] },
});
DATA.content.quests.push({
  id: 'orsane_destination_toiles', name: 'Vers les Toiles', level: 19, main: false, category: 'region',
  giver: 'fenna', turnIn: 'thevra', requires: { level: 17, quests: ['orsane_gueule_du_glouton'] },
  steps: [
    { type: 'visit', map: 'orsane_sentiers_crete', text: 'Monter jusqu\'à la Crête des Sentiers' },
    { type: 'visit', map: 'orsane_toiles_entree', text: 'Passer le Seuil des Toiles' },
    { type: 'talk', npc: 'thevra', text: 'Remettre la page d\'Hargal à Thevra, l\'Éclaireuse de l\'Aube' },
  ],
  dialogue: {
    offer: ['Tu as fini ce que les Cimes pouvaient t\'apprendre. Le reste est plus haut, et plus loin.', 'Monte à la Crête, passe le Seuil des Toiles, et donne cette page à Thevra. Elle saura quoi en faire, ou elle saura qui le sait.'],
    progress: ['La Crête, puis les Toiles. Fais attention où tu mets les pieds, ça colle.'],
    done: ['Hargal. Je pensais qu\'il était mort. Il l\'est peut-être, mais sa page est arrivée jusqu\'ici.', 'Bienvenue aux Toiles, Veilleur. Ici, les fils se voient à l\'œil nu.'],
  },
  rewards: { xp: 955, fils: 50, items: [{ id: 'pain_de_grouk', count: 3 }] },
});

DATA.content.quests.push({
  id: 'porte_mise_a_l_epreuve', name: 'Le regard d\'Ilsa', level: 5, main: false, category: 'region',
  giver: 'orvak', requires: { level: 5, quests: ['ateliers_produits_des_cimes'] },
  steps: [
    { type: 'talk', npc: 'ilsa', text: 'Se présenter à Ilsa, la caporale' },
    { type: 'kill', monster: 'piouk', count: 3, text: 'Vaincre trois Glymets sous les yeux d\'Ilsa' },
    { type: 'talk', npc: 'orvak', text: 'Revenir voir Orvak' },
  ],
  dialogue: {
    offer: ['Tu veux servir la Porte ? Tout le monde veut servir la Porte. La moitié tombe à la première ronde.', 'Ilsa va te mettre à l\'épreuve. Si elle dit oui, je te donne du travail.'],
    progress: ['Ilsa est près de la Porte. Elle ne note pas sur dix, elle note sur debout ou par terre.'],
    done: ['Ilsa dit que tu tiens debout. Venant d\'elle, c\'est presque un compliment.', 'Bienvenue au service de la Porte. Ta première mission t\'attend.'],
  },
  rewards: { xp: 139, fils: 15, items: [{ id: 'coiffe_marcheur', count: 1 }] },
});
DATA.content.quests.push({
  id: 'porte_champs_de_bataille', name: 'Toutes les bêtes des Clairières', level: 7, main: false, category: 'region',
  giver: 'orvak', requires: { level: 5, quests: ['porte_mise_a_l_epreuve'] },
  steps: [
    { type: 'kill', monster: 'piouk', count: 1, text: 'Vaincre un Glymet' },
    { type: 'kill', monster: 'pilou', count: 1, text: 'Vaincre un Glym Ancestral' },
    { type: 'kill', monster: 'groukin', count: 1, text: 'Vaincre un Groukin' },
    { type: 'kill', monster: 'grouk', count: 1, text: 'Vaincre un Grouk' },
    { type: 'kill', monster: 'filin', count: 1, text: 'Vaincre un Filin' },
    { type: 'talk', npc: 'orvak', text: 'Faire son rapport à Orvak' },
  ],
  dialogue: {
    offer: ['Un garde connaît chaque bête de son secteur. Le tien, ce sont les Clairières.', 'Bats une bête de chaque espèce : Glymet, Glym, Groukin, Grouk, Filin. Tu sauras ce qui t\'attend la nuit.'],
    progress: ['Les Filins tissent au Bosquet. Les autres, tu les croiseras en chemin.'],
    done: ['Cinq espèces, cinq façons de se battre. Maintenant tu sais lire les Clairières.'],
  },
  rewards: { xp: 221, fils: 20, items: [{ id: 'cape_marcheur', count: 1 }] },
});
DATA.content.quests.push({
  id: 'porte_coups_d_epee_dans_l_eau', name: 'Les Groukins du Ruisseau', level: 7, main: false, category: 'region',
  giver: 'orvak', requires: { level: 5, quests: ['porte_champs_de_bataille'] },
  steps: [
    { type: 'equip', slot: 'arme', text: 'Prendre une arme en main' },
    { type: 'visit', map: 'orsane_clairieres_ruisseau', text: 'Descendre au Ruisseau' },
    { type: 'kill', monster: 'groukin', count: 4, text: 'Chasser quatre Groukins qui pataugent dans le Ruisseau' },
    { type: 'talk', npc: 'orvak', text: 'Revenir voir Orvak' },
  ],
  dialogue: {
    offer: ['Les Groukins pataugent dans le Ruisseau et salissent l\'eau de toute la ville. Les porteurs d\'eau se plaignent.', 'Prends une arme, une vraie, et va les déloger. Les poings, c\'est pour les tavernes.'],
    progress: ['Une arme en main d\'abord. Ensuite le Ruisseau, au nord de la Mare.'],
    done: ['L\'eau est claire. Les porteurs ont arrêté de crier. Toi, tu es trempé jusqu\'aux genoux, mais c\'est le métier.'],
  },
  rewards: { xp: 221, fils: 20, items: [{ id: 'amulette_marcheur', count: 1 }] },
});
DATA.content.quests.push({
  id: 'porte_decime_des_grouks', name: 'Dix Grouks pour la Porte', level: 9, main: false, category: 'region',
  giver: 'orvak', requires: { level: 7, quests: ['porte_coups_d_epee_dans_l_eau'] },
  steps: [
    { type: 'kill', monster: 'grouk', count: 10, text: 'Repousser dix Grouks' },
    { type: 'talk', npc: 'orvak', text: 'Revenir voir Orvak' },
  ],
  dialogue: {
    offer: ['Les Grouks remontent de la Mare par troupeaux entiers. Dix de moins, et les Clairières respirent.', 'Ils chargent et poussent. Garde un arbre dans ton dos, et frappe quand ils reprennent leur souffle.'],
    progress: ['La Mare, l\'Orée, le Bosquet : ils sont partout où l\'herbe est grasse.'],
    done: ['Dix. Ils vont mettre une saison à s\'en remettre. Nous aussi, mais pour d\'autres raisons.'],
  },
  rewards: { xp: 315, fils: 25, items: [{ id: 'ceinture_marcheur', count: 1 }] },
});
DATA.content.quests.push({
  id: 'porte_chasse_aux_chapardeurs', name: 'Les voleurs de rubans', level: 11, main: false, category: 'region',
  giver: 'orvak', requires: { level: 9, quests: ['porte_decime_des_grouks'] },
  steps: [
    { type: 'kill', monster: 'kavou_bleu', count: 1, text: 'Vaincre un Kavou de Brume' },
    { type: 'kill', monster: 'kavou_roux', count: 1, text: 'Vaincre un Kavou de Braise' },
    { type: 'kill', monster: 'kavou_ocre', count: 1, text: 'Vaincre un Kavou des Mousses' },
    { type: 'kill', monster: 'kavou_blanc', count: 1, text: 'Vaincre un Kavou des Vents' },
    { type: 'talk', npc: 'orvak', text: 'Revenir voir Orvak' },
  ],
  dialogue: {
    offer: ['Quelqu\'un vole les rubans des lanternes. Pas les Glyms, eux prennent tout. Quelqu\'un qui choisit les couleurs.', 'Les Kavous. Un de chaque sorte, à la Mare et à l\'Orée. Ramène-les à la raison.'],
    progress: ['Bleu et roux à la Mare, ocre et blanc à l\'Orée. Ils aiment ce qui brille et ce qui flotte.'],
    done: ['Quatre couleurs, quatre voleurs. Dalric va pouvoir repeindre ses lanternes en paix.'],
  },
  rewards: { xp: 422, fils: 30, items: [{ id: 'bottes_marcheur', count: 1 }] },
});
DATA.content.quests.push({
  id: 'porte_lecon_d_humilite', name: 'Le reproche d\'Ilsa', level: 13, main: false, category: 'region',
  giver: 'orvak', requires: { level: 11, quests: ['porte_chasse_aux_chapardeurs'] },
  steps: [
    { type: 'answer', npc: 'ilsa', text: 'Écouter le reproche d\'Ilsa',
      prompt: ['On m\'a dit que tu te vantais à l\'auberge. Dix Grouks, quatre Kavous, et bientôt le Grand Grouk à mains nues ?'],
      options: [
        { id: 'excuses', text: 'J\'en ai trop dit, je m\'excuse', reply: ['Bien. Un garde qui sait se taire vit plus longtemps. Va le prouver à la Halte.'] },
        { id: 'fierte', text: 'Je n\'ai dit que la vérité', reply: ['La vérité d\'hier. Celle de demain, c\'est la Halte, et les Loches qui ne t\'ont jamais entendu parler.'] },
      ] },
    { type: 'kill', monster: 'loche', count: 3, text: 'Vaincre trois Loches à la Halte de Thoril, sans un mot' },
    { type: 'talk', npc: 'orvak', text: 'Revenir voir Orvak' },
  ],
  dialogue: {
    offer: ['Ilsa veut te parler. Elle a cette tête qu\'elle fait avant une leçon. Je ne t\'envie pas.'],
    progress: ['Les Loches brûlent ce qu\'elles touchent. Un sort d\'eau les éteint deux fois plus vite.'],
    done: ['Ilsa dit que tu n\'as rien raconté à personne depuis trois jours. Elle est inquiète, c\'est bon signe.'],
  },
  rewards: { xp: 540, fils: 35, items: [{ id: 'anneau_de_corne', count: 1 }] },
});
DATA.content.quests.push({
  id: 'porte_tissefils_en_marche', name: 'La Corniche qui grouille', level: 15, main: false, category: 'region',
  giver: 'orvak', requires: { level: 13, quests: ['porte_lecon_d_humilite'] },
  steps: [
    { type: 'visit', map: 'orsane_sentiers_corniche', text: 'Monter à la Corniche' },
    { type: 'kill', monster: 'tissefil', count: 6, text: 'Arrêter six Tissefils qui descendent vers la ville' },
    { type: 'talk', npc: 'orvak', text: 'Faire son dernier rapport à Orvak' },
  ],
  dialogue: {
    offer: ['Les Tissefils ne bougent jamais de leurs Toiles. Ce matin, on en a vu six sur la Corniche, et ils descendaient.', 'Arrête-les avant qu\'ils tissent la Porte. Après ça, tu n\'auras plus besoin de moi pour savoir quoi faire.'],
    progress: ['La Corniche est au-dessus du Relais des Sentiers. Leurs toiles enracinent : ne reste pas au contact.'],
    done: ['Six Tissefils. Les Toiles descendent, Veilleur, et tu viens de leur montrer où s\'arrête la ville.', 'Ton service est fini. Tu peux rester garde de la Porte, ou aller voir plus loin. Je sais déjà ce que tu choisiras.'],
  },
  rewards: { xp: 668, fils: 40, items: [{ id: 'manteau_de_cuir', count: 1 }] },
});

DATA.content.quests.push({
  id: 'ateliers_produits_des_cimes', name: 'Deux pains et une potion', level: 7, main: false, category: 'region',
  giver: 'thila', requires: { level: 5, quests: ['orsane_visages_des_cimes'] },
  steps: [
    { type: 'collect', item: 'pain_de_cime', count: 2, text: 'Cuire deux pains de Cime chez l\'alchimiste' },
    { type: 'collect', item: 'potion_de_relais', count: 1, text: 'Préparer une potion de Relais' },
    { type: 'collect', item: 'ceinture_de_plume', count: 1, text: 'Coudre une ceinture de plume chez le cordonnier' },
    { type: 'talk', npc: 'thila', text: 'Apporter les trois ouvrages à Thila' },
  ],
  dialogue: {
    offer: ['Un Veilleur qui ne sait rien faire de ses mains, c\'est un Veilleur qui paie tout au Comptoir. Lotha adore, moi moins.', 'Trois ouvrages, trois ateliers : deux pains, une potion de Relais, une ceinture de plume. Les recettes sont au mur.'],
    progress: ['L\'alchimiste pour le pain et la potion, le cordonnier pour la ceinture. Tout est dans la rue.'],
    done: ['Le pain est un peu cuit, la ceinture un peu de travers. Parfait pour une première fois.'],
  },
  rewards: { xp: 221, fils: 20, items: [{ id: 'sandales_de_duvet', count: 1 }] },
});
DATA.content.quests.push({
  id: 'ateliers_metier_des_veilleurs', name: 'Cuir et plumes', level: 7, main: false, category: 'region',
  giver: 'thila', requires: { level: 5, quests: ['ateliers_produits_des_cimes'] },
  steps: [
    { type: 'kill', monster: 'groukin', count: 3, text: 'Chasser trois Groukins' },
    { type: 'collect', item: 'cuir_de_grouk', count: 3, text: 'Rapporter trois cuirs de Grouk' },
    { type: 'collect', item: 'plume_de_pilou', count: 5, text: 'Rapporter cinq plumes de Glym' },
    { type: 'talk', npc: 'thila', text: 'Montrer la chasse à Thila' },
  ],
  dialogue: {
    offer: ['Tout ce qu\'on coud ici a d\'abord couru dans les Clairières. Le cuir, les plumes, tout.', 'Va chasser. Ramène du cuir et des plumes : un artisan qui ne chasse pas dépend de ceux qui chassent.'],
    progress: ['Les Grouks donnent le cuir, les Glyms les plumes. Ils ne les donnent pas de bon cœur.'],
    done: ['Du bon cuir, des plumes propres. Tu chasses comme tu couds : sans perdre le fil.'],
  },
  rewards: { xp: 221, fils: 20, items: [{ id: 'pain_de_cime', count: 3 }] },
});
DATA.content.quests.push({
  id: 'ateliers_la_hache_et_le_burin', name: 'Bois, calcaire et herbe de veille', level: 9, main: false, category: 'region',
  giver: 'thila', requires: { level: 7, quests: ['ateliers_metier_des_veilleurs'] },
  steps: [
    { type: 'gather', resource: 'bois_de_cime', count: 4, text: 'Couper quatre bois de Cime' },
    { type: 'gather', resource: 'pierre_de_calcaire', count: 4, text: 'Tailler quatre pierres de calcaire au Bosquet' },
    { type: 'gather', resource: 'herbe_de_veille', count: 4, text: 'Cueillir quatre herbes de veille' },
    { type: 'talk', npc: 'thila', text: 'Rapporter la récolte à Thila' },
  ],
  dialogue: {
    offer: ['Le bois, la pierre, l\'herbe : ça ne court pas, mais ça ne se ramasse pas tout seul non plus.', 'Coupe, taille, cueille. Quatre de chaque. Les arbres des Clairières repoussent vite, la pierre moins.'],
    progress: ['Le calcaire affleure au Bosquet. Le bois et l\'herbe, partout où il y a de la lumière.'],
    done: ['Tu sais maintenant d\'où vient tout ce qu\'on fabrique. Il ne te reste qu\'à le fabriquer.'],
  },
  rewards: { xp: 315, fils: 25, items: [{ id: 'lame_de_cime', count: 1 }] },
});
DATA.content.quests.push({
  id: 'ateliers_marcheur_un_jour', name: 'La panoplie du Marcheur', level: 9, main: false, category: 'region',
  giver: 'thila', requires: { level: 7, quests: ['ateliers_la_hache_et_le_burin'] },
  steps: [
    { type: 'equip', item: 'coiffe_marcheur', text: 'Porter la Coiffe du Marcheur' },
    { type: 'equip', item: 'cape_marcheur', text: 'Porter la Cape du Marcheur' },
    { type: 'equip', item: 'amulette_marcheur', text: 'Porter l\'Amulette du Marcheur' },
    { type: 'equip', item: 'ceinture_marcheur', text: 'Porter la Ceinture du Marcheur' },
    { type: 'equip', item: 'bottes_marcheur', text: 'Porter les Bottes du Marcheur' },
    { type: 'talk', npc: 'thila', text: 'Se montrer à Thila en Marcheur complet' },
  ],
  dialogue: {
    offer: ['La panoplie du Marcheur, tous les Veilleurs la portent un jour. Ceux qui l\'ont fabriquée eux-mêmes la portent mieux.', 'Fabrique les cinq pièces, ou gagne-les au service de la Porte, et porte-les toutes. Je veux te voir en entier.'],
    progress: ['Coiffe, cape, amulette, ceinture, bottes. Les recettes sont chez moi, chez Korvel et chez Rilka.'],
    done: ['Voilà un Marcheur. Le bonus de la panoplie complète, tu le sens ? C\'est la ville qui te tient chaud.'],
  },
  rewards: { xp: 315, fils: 25, items: [{ id: 'baguette_de_duvet', count: 1 }] },
});
DATA.content.quests.push({
  id: 'ateliers_preparation_au_combat', name: 'Une masse avant le Grenier', level: 11, main: false, category: 'region',
  giver: 'thila', turnIn: 'thorak', requires: { level: 9, quests: ['ateliers_marcheur_un_jour'] },
  steps: [
    { type: 'collect', item: 'masse_de_calcaire', count: 1, text: 'Forger une Masse de Calcaire' },
    { type: 'collect', item: 'potion_de_relais', count: 2, text: 'Préparer deux potions de Relais, de quoi revenir du Grenier' },
    { type: 'talk', npc: 'thorak', text: 'Faire vérifier l\'équipement par Thorak, le forgeron' },
  ],
  dialogue: {
    offer: ['Tu as la tenue. Il te manque l\'arme et de quoi rentrer quand ça tourne mal.', 'Forge une masse, prépare deux potions de Relais, et montre le tout à Thorak. S\'il ne dit rien, c\'est que c\'est bon.'],
    progress: ['La masse se forge chez Thorak, les potions chez Velka.'],
    done: ['Hm. La masse tient. Les potions aussi.', 'Tu es prêt pour le Grenier des Glyms. Prends ça, c\'est mieux qu\'une masse pour qui frappe en croix.'],
  },
  rewards: { xp: 422, fils: 30, items: [{ id: 'baton_de_cime', count: 1 }] },
});

DATA.content.quests.push({
  id: 'remue_galette_de_brann', name: 'Le miel de Vali', level: 13, main: false, category: 'region',
  giver: 'brann', requires: { level: 11, quests: ['orsane_visages_des_cimes'] },
  steps: [
    { type: 'collect', item: 'pain_de_cime', count: 3, text: 'Cuire trois pains de Cime selon la recette secrète de Brann' },
    { type: 'gather', resource: 'herbe_de_veille', count: 5, text: 'Cueillir cinq herbes de veille pour le miel de Vali' },
    { type: 'talk', npc: 'vali', text: 'Échanger les herbes contre le pot de miel de Vali' },
    { type: 'talk', npc: 'brann', text: 'Rapporter le pot de miel à Brann' },
  ],
  dialogue: {
    offer: ['Ma galette de Cime, c\'est trois pains, un pot de miel et un secret. Le secret, je le garde. Le reste, tu me l\'apportes.', 'Vali a du miel. Elle ne le donne pas, elle l\'échange, contre des herbes de veille. Elle a le sens des affaires, cette petite.'],
    progress: ['Trois pains, cinq herbes pour Vali, un pot de miel pour moi.'],
    done: ['Voilà. Ce soir, galette pour toute l\'auberge. Et pour toi, une part, la plus grosse.', 'Garde un peu de miel sur toi. On dit que le Glouton du Puits en raffole.'],
  },
  rewards: { xp: 540, fils: 35, items: [{ id: 'pain_de_grouk', count: 2 }] },
});
DATA.content.quests.push({
  id: 'remue_mort_aux_glymets', name: 'Les Glymets du cellier', level: 13, main: false, category: 'region',
  giver: 'brann', requires: { level: 11, quests: ['orsane_visages_des_cimes'] },
  steps: [
    { type: 'answer', npc: 'brann', text: 'Commander à Brann de quoi attirer les Glymets du cellier',
      prompt: ['L\'affiche, c\'est moi. Des Glymets ont fait leur nid dans mon cellier. Pour les faire sortir, il faut les appâter. Tu prends quoi ?'],
      options: [
        { id: 'cidre', text: 'Un cidre de Cime, bien sucré', reply: ['Bon choix. Ils ne résistent pas au sucre. Verse-le près du tonneau et recule.'] },
        { id: 'miel', text: 'Un fond de miel', reply: ['Du miel ? Ils vont devenir fous. Va, et ferme la trappe derrière toi.'] },
      ] },
    { type: 'kill', monster: 'piouk', count: 4, text: 'Chasser les quatre Glymets du cellier' },
    { type: 'talk', npc: 'brann', text: 'Annoncer à Brann que le cellier est libre' },
  ],
  dialogue: {
    offer: ['Tu as vu l\'affiche sur ma porte ? « On cherche un chasseur, payé en Dragmes et en cidre. » C\'est toujours d\'actualité.'],
    progress: ['Ils sont sortis par la trappe et se sont envolés vers la Porte. Rattrape-les.'],
    done: ['Plus un Glymet dans le cellier. Mes tonneaux te remercient. Moi aussi, en Dragmes.'],
  },
  rewards: { xp: 540, fils: 35, items: [{ id: 'potion_de_relais', count: 2 }] },
});
DATA.content.quests.push({
  id: 'remue_secret_du_grenier', name: 'Le secret du Grenier', level: 11, main: false, category: 'donjon',
  giver: 'kelthar', turnIn: 'fenna', requires: { level: 9, quests: ['orsane_grenier_des_pilous'] },
  startItems: [{ id: 'cle_du_grenier', count: 1 }],
  steps: [
    { type: 'dungeon', dungeon: 'grenier_des_pilous', text: 'Retraverser le Grenier des Glyms jusqu\'au Chapardeur' },
    { type: 'talk', npc: 'fenna', text: 'Raconter à Fenna ce que cachait le Grenier' },
  ],
  dialogue: {
    offer: ['Le Grenier des Glyms, tu l\'as nettoyé une fois. Mais le Chapardeur volait avant les Glyms, et pas que des lanternes.', 'Retourne là-haut et regarde derrière lui. Fenna voudra savoir ce que tu as vu.'],
    progress: ['La vieille grange est au fond du Bosquet. Le Chapardeur revient toujours, il aime trop son nid.'],
    done: ['Une plume dorée et une carte gravée dans une poutre ? Le Chapardeur volait pour quelqu\'un. Je note, je note.'],
  },
  rewards: { xp: 422, fils: 30, items: [{ id: 'arc_de_cime', count: 1 }] },
});
DATA.content.quests.push({
  id: 'remue_un_peu_de_pigment', name: 'Les couleurs de Dalric', level: 15, main: false, category: 'region',
  giver: 'dalric', requires: { level: 13, quests: ['orsane_visages_des_cimes'] },
  steps: [
    { type: 'collect', item: 'plume_de_kavou', count: 3, text: 'Rapporter trois plumes de Kavou à broyer' },
    { type: 'talk', npc: 'dalric', text: 'Donner les plumes à Dalric' },
  ],
  dialogue: {
    offer: ['Je n\'ai plus de bleu. Plus une goutte. Les lanternes de la Porte vont finir grises, et Orvak déteste le gris.', 'Les plumes de Kavou, broyées, donnent la couleur du ciel sous lequel ils ont niché. Trois me suffiront.'],
    progress: ['Les Kavous nichent à la Mare et ici, à l\'Orée. Toutes les couleurs font l\'affaire.'],
    done: ['Ah, ce bleu. Et ce roux ! Les lanternes vont avoir l\'air neuves. Enfin, presque.'],
  },
  rewards: { xp: 668, fils: 40, items: [{ id: 'anneau_de_veille', count: 1 }] },
});

DATA.content.quests.push({
  id: 'orsane_instincts_primaires', name: 'Le tableau de chasse de Velka', level: 9, main: false, category: 'region',
  giver: 'velka', requires: { level: 7, quests: [] },
  steps: [
    { type: 'kill', monster: 'filin', count: 2, text: 'Vaincre deux Filins' },
    { type: 'kill', monster: 'groukin', count: 2, text: 'Vaincre deux Groukins' },
    { type: 'kill', monster: 'piouk', count: 2, text: 'Vaincre deux Glymets' },
    { type: 'talk', npc: 'velka', text: 'Revenir voir Velka' },
  ],
  dialogue: {
    offer: ['Les petites bêtes des Clairières ont toutes un instinct : fuir, charger, tisser. Je veux comprendre lequel les rend si nerveuses.', 'Bats-en quelques-unes et regarde comment elles se battent. Deux Filins, deux Groukins, deux Glymets.'],
    progress: ['Les Glymets à la Porte, les Groukins au Seuil, les Filins au Bosquet.'],
    done: ['Elles fuient toutes vers le haut. Ce n\'est pas toi qui les effraies, c\'est ce qui descend des Toiles.'],
  },
  rewards: { xp: 315, fils: 25, items: [{ id: 'pain_de_cime', count: 3 }] },
});

{
const MAITRES = {
  vaelith: ['Orwenn', 'Trame éprouvée', 'tisser avant de frapper'],
  sarkan: ['Dagrel', 'Lame éprouvée', 'tenir la garde avant de la lever'],
  lyssar: ['Ilvane', 'Œil éprouvé', 'viser avant de tirer'],
  oriel: ['Maelle', 'Lueur éprouvée', 'éclairer avant de soigner'],
  nerith: ['Sorrel', 'Ombre éprouvée', 'disparaître avant de frapper'],
  kaldrin: ['Brakka', 'Rouage éprouvé', 'poser avant d\'armer'],
  karsh: ['Vorn', 'Sang éprouvé', 'saigner avant de frapper'],
  mirel: ['Elisse', 'Voix éprouvée', 'chanter avant de se taire'],
  thalor: ['Gorm', 'Bras éprouvé', 'porter avant de pousser'],
  fennal: ['Hesk', 'Meute éprouvée', 'appeler avant de courir'],
  velmar: ['Thessaly', 'Marée éprouvée', 'tenir avant de rendre'],
  orvald: ['Aubrac', 'Fouille éprouvée', 'creuser avant de prendre'],
};
for (const [cid, c] of Object.entries(DATA.classes)) {
  const m = MAITRES[cid];
  if (!m || c.season) continue;
  const [maitre, titre, geste] = m;
  DATA.content.quests.push({
    id: 'voie_' + cid + '_1', name: 'Le geste : ' + c.title, level: 19, main: false, category: 'classe',
    giver: 'ismere', turnIn: 'ismere', requires: { level: 17, classe: cid },
    steps: [
      { type: 'talk', npc: 'saya', text: 'Demander à Saya la cour du Dojo' },
      { type: 'kill', monster: 'reflet_' + cid, count: 1, text: 'Vaincre son Reflet sur la cour du Dojo' },
      { type: 'talk', npc: 'ismere', text: 'Revenir au Temple des Voies' },
    ],
    dialogue: {
      offer: [`${maitre}, qui tient la statue de ${c.name}, t\'a vu passer. Le geste de ta Voie, dit-il, c\'est ${geste}. Il veut savoir si tu le tiens.`, 'Monte au Dojo. Saya te prêtera la cour, et le miroir du Temple te renverra ton propre geste. Bats-le, et reviens me voir.'],
      progress: ['Le Reflet t\'attend sur la cour du Dojo, sur les Terrasses. Demande-la à Saya.', `Ton Reflet frappe comme toi. ${maitre} dit que c\'est là toute la difficulté.`],
      done: [`${maitre} a regardé le combat depuis la statue. Il dit que le geste est là, et que le reste viendra.`, `Le Temple te reconnaît : ${titre}.`],
    },
    rewards: { xp: 955, fils: 80, title: titre, cosmetique: 'blason_voie' },
  });
  const palier = DATA.spells[(c.paires && c.paires[11] && c.paires[11][0]) || ''];
  DATA.content.quests.push({
    id: 'voie_' + cid + '_seuil', name: 'Le seuil : ' + c.title, level: 50, main: false, category: 'classe',
    giver: 'ismere', turnIn: 'ismere', requires: { level: 50, classe: cid, quests: ['voie_' + cid + '_1'] },
    steps: [
      { type: 'gather', resource: 'basalte_de_kaldum', count: 10, text: 'Tailler dix blocs de basalte de Kaldum pour l\'anneau' },
      { type: 'talk', npc: 'rilka', text: 'Porter le basalte à Rilka, la bijoutière' },
      { type: 'kill', monster: 'reflet_' + cid, count: 1, text: 'Vaincre son Reflet une seconde fois, sur la cour du Dojo' },
      { type: 'talk', npc: 'ismere', text: 'Revenir au Temple des Voies' },
    ],
    dialogue: {
      offer: [`${maitre} dit que tu es au seuil. Ce qui vient après est plus long, et plus dur.`, `Rapporte du basalte de Kaldum : Rilka en taillera un anneau qui te laissera le temps d\'un geste de plus. Puis bats ton Reflet encore une fois, pour que ${maitre} voie ce que tu es devenu.`],
      progress: ['Le basalte se taille dans les galeries de Kaldum. Rilka attend dans son atelier, sur les Terrasses.', 'Ton Reflet t\'attend sur la cour du Dojo.'],
      done: [`${maitre} a regardé le combat. Il dit que tu as passé le seuil.`, `Voici l\'Anneau du Seuil. Et ta Voie s\'ouvre${palier ? ` : ${palier.name}` : ''}.`],
    },
    rewards: { xp: 2400, fils: 400, items: [{ id: 'anneau_du_seuil', count: 1 }] },
  });
}
}
