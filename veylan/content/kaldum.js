// Kaldum : la deuxième région de Veylan, niveaux 20 à 30.
// Mines, forges, roche chaude. Terre des Kaldrin. Les forges s'éteignent, et quelque chose
// en dessous récupère leur chaleur. Format : docs/SPEC-CONTENU.md.

// ===================================================================================
// ZONES
// ===================================================================================

DATA.content.zones.push({
  id: 'kaldum_ville', name: 'Kaldum, la ville des forges', region: 'kaldum', level: [20, 22],
  palette: 'kaldum',
  description: "La ville minière de Kaldum, taillée dans le basalte autour de ses forges. Les cheminées fument moins qu'avant, et tout le monde le remarque.",
  maps: [
    {
      id: 'kaldum_ville_porte', name: 'La Porte de Kaldum', level: [20, 22],
      layout: [
        '###############',
        '#.....#...,,,,#',
        '#..M..#...,L,,#',
        '#.....#...,,,,#',
        '#..T..##..,,P,#',
        '#......#...,,,#',
        '#.......T..,,,#',
        'w..M.......,,,e',
        '#.......T..,,,#',
        '#......#..P,,,#',
        '#..T..##..,L,,#',
        '#.....#...,,,,#',
        '#..M..#...,,,,#',
        '#.....#...~~~~#',
        '###############',
      ],
      exits: { n: null, e: 'kaldum_ville_place', s: null, w: 'orsane_eboulis_passe' },
      // Okrel, le capitaine du Fil, tient la Porte avec les Kaldrin.
      npcs: ['okrel', 'ravok'],
      nodes: [],
      groups: [
        { monsters: ['molh', 'molh', 'molhin'], level: [20, 22], respawn: 45 },
        { monsters: ['molhin', 'molhin', 'tholi'], level: [20, 22], respawn: 45 },
        { monsters: ['molh', 'molh', 'molh'], level: [20, 22], respawn: 50 },
      ],
      dungeon: null,
      relay: false,
    },
    {
      id: 'kaldum_ville_place', name: 'La Place des Forges', level: [20, 22],
      layout: [
        '######n########',
        '#,,,,,.,,,,,,,#',
        '#,L,,,.,,,,L,,#',
        '#,,,,,.,,,,,,,#',
        '#,,T,,,,,,T,,,#',
        '#,,,,,,,,,,,,,#',
        '#,,,,,,Z,,,,,,#',
        'w,,,,,P,,,P,,,e',
        '#,,,,,,,,,,,,,#',
        '#,,T,,,,,,T,,,#',
        '#,,,,,,,,,,,,,#',
        '#,L,,,,,,,,L,,#',
        '#,,,,,,P,,,,,,#',
        '#~~~,,,,,,,~~~#',
        '###############',
      ],
      exits: { n: 'kaldum_ville_ateliers', e: 'kaldum_ville_halle', s: null, w: 'kaldum_ville_porte' },
      npcs: ['thalvi', 'korth', 'vika'],
      nodes: [],
      groups: [],
      dungeon: null,
      relay: true,
    },
    {
      id: 'kaldum_ville_ateliers', name: 'Les Ateliers', level: [20, 22],
      layout: [
        '###############',
        '#~~~....#.....#',
        '#~......#..L..#',
        '#..P....#.....#',
        '#.......#.P...#',
        '###.#####.....#',
        '#,,,,,,,,,,,,,#',
        '#,,L,,,,,,,L,,#',
        '#,,,,,,,,,,,,,#',
        '#,,,,,,,,,###.#',
        '#,,,,,,,,,#...#',
        '#,,T,,,,,,#.P.#',
        '#,,,,,,,,,#...#',
        '#,,,,,,,,,#...#',
        '######s########',
      ],
      exits: { n: null, e: null, s: 'kaldum_ville_place', w: null },
      npcs: ['tharik', 'velthi', 'rhuvel'],
      nodes: [],
      groups: [],
      dungeon: null,
      relay: false,
    },
    {
      id: 'kaldum_ville_halle', name: 'La Halle des Mineurs', level: [20, 22],
      layout: [
        '###############',
        '#..T.......T..#',
        '#.............#',
        '#....,,,,,....#',
        '#....,L,L,....#',
        '#....,,P,,....#',
        '#....,,,,,....#',
        'w.............#',
        '#.............#',
        '#..T.......T..#',
        '#......P......#',
        '#.............#',
        '#~~~.......~~~#',
        '#~~~.......~~~#',
        '#######s#######',
      ],
      exits: { n: null, e: null, s: 'kaldum_galeries_entree', w: 'kaldum_ville_place' },
      npcs: ['thorvek', 'kavra'],
      nodes: [],
      groups: [],
      dungeon: null,
      relay: false,
    },
  ],
});

DATA.content.zones.push({
  id: 'kaldum_galeries', name: 'Les Galeries de Kaldum', region: 'kaldum', level: [20, 25],
  palette: 'kaldum',
  description: "Les galeries de la mine, étayées de basalte et éclairées au lichen. Depuis que les forges refroidissent, les Molhs s'y assoient et plus rien ne passe.",
  maps: [
    {
      id: 'kaldum_galeries_entree', name: "L'Entrée des Galeries", level: [20, 22],
      layout: [
        '#######n#######',
        '#.....#.#.....#',
        '#..G..#.#..M..#',
        '#.....#.#.....#',
        '#.............#',
        '#..L.......L..#',
        '#......T......#',
        '#..M......o...#',
        '#......T...oo.#',
        '#..L.......L..#',
        '#..........M..#',
        '#.....#.#.....#',
        '#..G..#.#.....#',
        '#.....#.#.....#',
        '#######s#######',
      ],
      exits: { n: 'kaldum_ville_halle', e: null, s: 'kaldum_galeries_boyau', w: null },
      npcs: [],
      nodes: ['basalte_de_kaldum', 'lichen_de_scorie'],
      groups: [
        { monsters: ['molh', 'molh', 'molhin'], level: [20, 22], respawn: 45 },
        { monsters: ['molh', 'molh', 'molh'], level: [20, 22], respawn: 50 },
        { monsters: ['molhin', 'molhin', 'thelk'], level: [20, 22], respawn: 50 },
      ],
      dungeon: null,
      relay: false,
    },
    {
      id: 'kaldum_galeries_boyau', name: 'Le Boyau', level: [21, 23],
      layout: [
        '#######n#######',
        '###...#.#...###',
        '#.....#.#.....#',
        '#..M..#.#..M..#',
        '#.....#.#.....#',
        '#......L......#',
        '#.............#',
        '#...M..G......e',
        '#.........M...#',
        '#......L......#',
        '#.....#.#.....#',
        '#..M..#.#..~~.#',
        '#.....#.#..~~.#',
        '###...#.#...###',
        '#######s#######',
      ],
      exits: { n: 'kaldum_galeries_entree', e: 'kaldum_galeries_relais', s: 'kaldum_galeries_eboulement', w: null },
      npcs: [],
      nodes: ['lichen_de_scorie'],
      groups: [
        { monsters: ['molh', 'molh', 'molh'], level: [21, 23], respawn: 50 },
        { monsters: ['molh', 'kaldrik'], level: [22, 24], respawn: 50 },
        { monsters: ['scorik', 'scorik', 'molhin'], level: [21, 23], respawn: 50 },
        { monsters: ['thelk', 'thelk'], level: [21, 23], respawn: 50 },
        { monsters: ['molh', 'molh', 'kaldrik'], level: [22, 24], respawn: 55 },
      ],
      dungeon: null,
      relay: false,
    },
    {
      id: 'kaldum_galeries_relais', name: 'Le Relais des Galeries', level: [22, 24],
      layout: [
        '###############',
        '#.....#.......#',
        '#..G..#...M...#',
        '#.....#.......#',
        '#..M..........#',
        '#..L.......L..#',
        '#......Z......#',
        'w.....P.......e',
        '#.............#',
        '#..L.......L..#',
        '#.............#',
        '#.......#.....#',
        '#..M....#.G.o.#',
        '#.......#..oo.#',
        '###############',
      ],
      exits: { n: null, e: 'kaldum_galeries_fond', s: null, w: 'kaldum_galeries_boyau' },
      npcs: ['lethir'],
      nodes: ['basalte_de_kaldum', 'lichen_de_scorie'],
      groups: [
        { monsters: ['molh', 'molh', 'kaldrik'], level: [22, 24], respawn: 55 },
        { monsters: ['clou_vif', 'clou_vif', 'scorik'], level: [22, 24], respawn: 50 },
        { monsters: ['kaldrik', 'kaldrik'], level: [23, 25], respawn: 50 },
      ],
      dungeon: null,
      relay: true,
    },
    {
      id: 'kaldum_galeries_eboulement', name: "L'Éboulement", level: [22, 24],
      layout: [
        '#######n#######',
        '#..#.......#..#',
        '#......#......#',
        '#..M.......M..#',
        '#......#......#',
        '#.##.......##.#',
        '#......G......#',
        '#.............#',
        '#..#.......#..#',
        '#......L......#',
        '#..........M..#',
        '#.G...........#',
        '#......M......#',
        '#..##..D..##..#',
        '###############',
      ],
      exits: { n: 'kaldum_galeries_boyau', e: null, s: null, w: null },
      npcs: [],
      nodes: ['basalte_de_kaldum', 'lichen_de_scorie'],
      groups: [
        { monsters: ['molh', 'molh', 'molh'], level: [22, 24], respawn: 50 },
        { monsters: ['molh', 'molh', 'molh', 'molh'], level: [23, 25], respawn: 60 },
        { monsters: ['thelk', 'thelk', 'molh'], level: [22, 24], respawn: 55 },
        { monsters: ['molh', 'kaldrik', 'molh'], level: [23, 25], respawn: 55 },
      ],
      dungeon: 'boues_chaudes',
      relay: false,
    },
    {
      id: 'kaldum_galeries_fond', name: 'Le Fond des Galeries', level: [23, 25],
      layout: [
        '###############',
        '#.....#.......#',
        '#..M..#...M...#',
        '#.....#.......#',
        '#.....##..oo..#',
        '#.............#',
        '#..L.......L..#',
        'w.............#',
        '#......T......#',
        '#..L.......L..#',
        '#.........M...#',
        '#~~...G.......#',
        '#~~...........#',
        '#~~...M.....~~#',
        '#######s#######',
      ],
      exits: { n: null, e: null, s: 'kaldum_vapeurs_bouche', w: 'kaldum_galeries_relais' },
      npcs: [],
      nodes: ['basalte_de_kaldum'],
      groups: [
        { monsters: ['kaldrik', 'kaldrik', 'molh'], level: [23, 25], respawn: 55 },
        { monsters: ['molh', 'molh', 'kaldrik'], level: [23, 25], respawn: 55 },
        { monsters: ['clou_vif', 'clou_vif', 'scorik', 'kaldrik'], level: [23, 25], respawn: 60 },
        { monsters: ['kaldrik', 'molh', 'molh', 'kaldrik'], level: [24, 25], respawn: 60 },
      ],
      dungeon: null,
      relay: false,
    },
  ],
});

DATA.content.zones.push({
  id: 'kaldum_vapeurs', name: 'Les Vapeurs', region: 'kaldum', level: [24, 28],
  palette: 'kaldum',
  description: "Sous le fond des galeries, la roche souffle. Les Fumerolles s'y effacent dans la vapeur et les Pioche-Vives y frappent de loin, sans jamais lâcher le manche.",
  maps: [
    {
      id: 'kaldum_vapeurs_bouche', name: 'La Bouche des Vapeurs', level: [24, 26],
      layout: [
        '#######n#######',
        '#.....#.#.....#',
        '#..G..#.#..M..#',
        '#.....#.#.....#',
        '#.....#.#.....#',
        '#......L......#',
        '#.............#',
        '#...P.........e',
        '#.............#',
        '#..oo.....~~..#',
        '#..o......~~..#',
        '#..........M..#',
        '#..M.....G....#',
        '#......D......#',
        '###############',
      ],
      exits: { n: 'kaldum_galeries_fond', e: 'kaldum_vapeurs_etuves', s: null, w: null },
      npcs: ['rukal'],
      nodes: ['lichen_de_scorie', 'basalte_de_kaldum'],
      groups: [
        { monsters: ['fumerolle', 'fumerolle'], level: [24, 26], respawn: 45 },
        { monsters: ['fumil', 'fumil', 'tholou'], level: [24, 26], respawn: 45 },
        { monsters: ['fumerolle', 'fumerolle', 'fumerolle'], level: [25, 27], respawn: 50 },
      ],
      dungeon: 'mine_des_tholous',
      relay: false,
    },
    {
      id: 'kaldum_vapeurs_etuves', name: 'Les Étuves', level: [25, 27],
      layout: [
        '###############',
        '#.....~~......#',
        '#..M..~~..M...#',
        '#.............#',
        '#....o...o....#',
        '#......M......#',
        '#..L.......L..#',
        'w.............e',
        '#.............#',
        '#..L.......L..#',
        '#....o...o....#',
        '#..M..........#',
        '#..G..~.~.M...#',
        '#.....~.~.....#',
        '#######s#######',
      ],
      exits: { n: null, e: 'kaldum_vapeurs_cuve', s: 'kaldum_vapeurs_souffleries', w: 'kaldum_vapeurs_bouche' },
      npcs: [],
      nodes: ['lichen_de_scorie'],
      groups: [
        { monsters: ['fumerolle', 'fumerolle', 'pioche_vive'], level: [26, 28], respawn: 50 },
        { monsters: ['fumerolle', 'pioche_vive'], level: [26, 28], respawn: 45 },
        { monsters: ['cendril', 'cendril', 'fumil'], level: [25, 27], respawn: 50 },
        { monsters: ['tholou', 'fumerolle', 'fumerolle'], level: [25, 27], respawn: 50 },
        { monsters: ['fumerolle', 'fumerolle', 'fumerolle'], level: [25, 27], respawn: 50 },
      ],
      dungeon: null,
      relay: false,
    },
    {
      id: 'kaldum_vapeurs_cuve', name: 'La Cuve des Cendrous', level: [27, 30],
      layout: [
        '###############',
        '#~~~~.....~~~~#',
        '#~~.........~~#',
        '#~...M.......~#',
        '#.............#',
        '#....o...o....#',
        '#.........M...#',
        'w......L.....D#',
        '#.............#',
        '#....o...o....#',
        '#...M.........#',
        '#~.......M...~#',
        '#~~....G....~~#',
        '#~~~~.....~~~~#',
        '###############',
      ],
      exits: { n: null, e: null, s: null, w: 'kaldum_vapeurs_etuves' },
      npcs: [],
      nodes: ['basalte_de_kaldum'],
      groups: [
        { monsters: ['cendrou', 'cendrou', 'fumerolle', 'pioche_vive'], level: [27, 30], respawn: 70 },
        { monsters: ['fumerolle_noire', 'kaldrik', 'cendril'], level: [27, 30], respawn: 70 },
        { monsters: ['tholou_tisse', 'cendrou', 'fumerolle'], level: [27, 30], respawn: 70 },
        { monsters: ['cendrou', 'pioche_vive', 'pioche_vive', 'fumerolle'], level: [27, 30], respawn: 70 },
      ],
      dungeon: 'cuve_des_cendrous',
      relay: false,
    },
    {
      id: 'kaldum_vapeurs_souffleries', name: 'Les Souffleries', level: [26, 28],
      layout: [
        '#######n#######',
        '#.....#.#.....#',
        '#..M..#.#..G..#',
        '#.....#.#.....#',
        '#..........M..#',
        '#.T.........T.#',
        '#......M......#',
        '#..o.......o..#',
        '#.............#',
        '#.T.........T.#',
        '#..M..........#',
        '#.....#.#.....#',
        '#..G..#.#..M..#',
        '#.....#.#.....#',
        '#######s#######',
      ],
      exits: { n: 'kaldum_vapeurs_etuves', e: null, s: 'kaldum_vapeurs_conduit', w: null },
      npcs: [],
      nodes: ['lichen_de_scorie', 'basalte_de_kaldum'],
      groups: [
        { monsters: ['fumerolle', 'pioche_vive', 'pioche_vive'], level: [26, 28], respawn: 50 },
        { monsters: ['tholou', 'tholou', 'pioche_vive'], level: [26, 28], respawn: 50 },
        { monsters: ['fumerolle', 'fumerolle', 'pioche_vive'], level: [26, 28], respawn: 50 },
        { monsters: ['thelk_ancien', 'fumerolle'], level: [26, 28], respawn: 60 },
        { monsters: ['pioche_vive', 'pioche_vive', 'fumerolle', 'fumerolle'], level: [27, 28], respawn: 60 },
      ],
      dungeon: null,
      relay: false,
    },
    {
      id: 'kaldum_vapeurs_conduit', name: 'Le Conduit', level: [26, 28],
      layout: [
        '#######n#######',
        '#.....#.#.....#',
        '#..G..#.#.....#',
        '#.....#.#..M..#',
        '#.....#.#.....#',
        '#..L..........#',
        '#.............#',
        '#.........~~..e',
        '#.....M...~~..#',
        '#..L..........#',
        '#.............#',
        '#..M..........#',
        '#........o....#',
        '#.......oo....#',
        '###############',
      ],
      exits: { n: 'kaldum_vapeurs_souffleries', e: 'kaldum_fonderie_entree', s: null, w: null },
      npcs: [],
      nodes: ['basalte_de_kaldum'],
      groups: [
        { monsters: ['pioche_vive', 'pioche_vive', 'fumerolle'], level: [26, 28], respawn: 50 },
        { monsters: ['tholou_tisse', 'fumerolle', 'fumerolle'], level: [26, 28], respawn: 55 },
        { monsters: ['fumerolle', 'fumerolle', 'pioche_vive', 'pioche_vive'], level: [27, 28], respawn: 60 },
      ],
      dungeon: null,
      relay: false,
    },
  ],
});

DATA.content.zones.push({
  id: 'kaldum_fonderie', name: 'La Fonderie', region: 'kaldum', level: [27, 30],
  palette: 'kaldum',
  description: "La grande fonderie de Kaldum, où la lave coule dans des rigoles de basalte. Les Cendrous y volent les braises et les emportent vers une porte que personne n'ouvrait plus.",
  maps: [
    {
      id: 'kaldum_fonderie_entree', name: "L'Entrée de la Fonderie", level: [27, 29],
      layout: [
        '###############',
        '#~~~.......~~~#',
        '#~.....G.....~#',
        '#....T...T....#',
        '#..M.......M..#',
        '#.............#',
        '#..L.......L..#',
        'w.............e',
        '#......M......#',
        '#..L.......L..#',
        '#..........M..#',
        '#....T...T....#',
        '#~.....G.....~#',
        '#~~~.......~~~#',
        '###############',
      ],
      exits: { n: null, e: 'kaldum_fonderie_relais', s: null, w: 'kaldum_vapeurs_conduit' },
      npcs: [],
      nodes: ['basalte_de_kaldum', 'lichen_de_scorie'],
      groups: [
        { monsters: ['kaldrik', 'kaldrik', 'pioche_vive'], level: [27, 29], respawn: 50 },
        { monsters: ['molh_ancien', 'kaldrik', 'kaldrik'], level: [27, 29], respawn: 55 },
        { monsters: ['molh', 'kaldrik', 'pioche_vive'], level: [27, 29], respawn: 55 },
        { monsters: ['kaldrik', 'pioche_vive', 'pioche_vive'], level: [27, 29], respawn: 50 },
      ],
      dungeon: null,
      relay: false,
    },
    {
      id: 'kaldum_fonderie_relais', name: 'Le Relais de la Fonderie', level: [27, 29],
      layout: [
        '#######n#######',
        '#.....#.#.....#',
        '#..M..#.#..G..#',
        '#.....#.#.....#',
        '#..........M..#',
        '#..L.......L..#',
        '#......Z......#',
        'w......P......#',
        '#.............#',
        '#..L.......L..#',
        '#.............#',
        '#.....#.#.....#',
        '#..~~.#.#..M..#',
        '#..~~.#.#.....#',
        '#######s#######',
      ],
      exits: { n: 'kaldum_fonderie_coulees', e: null, s: 'kaldum_fonderie_creusets', w: 'kaldum_fonderie_entree' },
      npcs: ['kerath'],
      nodes: ['lichen_de_scorie'],
      groups: [
        { monsters: ['kaldrik', 'kaldrik', 'cendrou'], level: [28, 30], respawn: 55 },
        { monsters: ['kaldrik_trempe', 'kaldrik', 'kaldrik'], level: [28, 29], respawn: 55 },
        { monsters: ['cendrou', 'pioche_vive', 'kaldrik'], level: [28, 30], respawn: 55 },
      ],
      dungeon: null,
      relay: true,
    },
    {
      id: 'kaldum_fonderie_coulees', name: 'Les Coulées', level: [28, 30],
      layout: [
        '###############',
        '#~~~~~~~~~~~~~#',
        '#~~.........~~#',
        '#~...M...G...~#',
        '#~...........~#',
        '#.............#',
        '#...~~...~~...#',
        '#...~~.M.~~...#',
        '#.............#',
        '#..L.......L..#',
        '#..M..........#',
        '#..G......M...#',
        '#.............#',
        '#~~.........~~#',
        '#######s#######',
      ],
      exits: { n: null, e: null, s: 'kaldum_fonderie_relais', w: null },
      npcs: [],
      nodes: ['basalte_de_kaldum', 'lichen_de_scorie'],
      groups: [
        { monsters: ['cendrou', 'cendrou', 'fumerolle'], level: [28, 30], respawn: 50 },
        { monsters: ['cendrou', 'cendrou', 'kaldrik'], level: [28, 30], respawn: 55 },
        { monsters: ['thelk_ancien', 'cendrou', 'cendrou'], level: [28, 30], respawn: 60 },
        { monsters: ['cendrou', 'cendrou', 'cendrou', 'kaldrik'], level: [29, 30], respawn: 65 },
      ],
      dungeon: null,
      relay: false,
    },
    {
      id: 'kaldum_fonderie_creusets', name: 'Les Creusets', level: [28, 30],
      layout: [
        '#######n#######',
        '#.....#.#.....#',
        '#..M..#.#..M..#',
        '#.....#.#.....#',
        '#.............#',
        '#.~~.......~~.#',
        '#.~~...L...~~.#',
        '#.............e',
        '#.~~...L...~~.#',
        '#.~~.......~~.#',
        '#.........M...#',
        '#..M...M......#',
        '#.............#',
        '#..G.......oo.#',
        '###############',
      ],
      exits: { n: 'kaldum_fonderie_relais', e: 'kaldum_fonderie_forge', s: null, w: null },
      npcs: [],
      nodes: ['basalte_de_kaldum'],
      groups: [
        { monsters: ['cendrou', 'pioche_vive', 'kaldrik'], level: [28, 30], respawn: 55 },
        { monsters: ['cendrou', 'cendrou', 'pioche_vive'], level: [28, 30], respawn: 55 },
        { monsters: ['masse_vive', 'kaldrik_trempe', 'pioche_vive'], level: [28, 30], respawn: 60 },
        { monsters: ['fumerolle_noire', 'kaldrik', 'cendrou'], level: [28, 30], respawn: 60 },
        { monsters: ['kaldrik', 'kaldrik', 'cendrou', 'pioche_vive'], level: [29, 30], respawn: 65 },
      ],
      dungeon: null,
      relay: false,
    },
    {
      id: 'kaldum_fonderie_forge', name: 'La Porte de la Forge Morte', level: [29, 30],
      layout: [
        '###############',
        '#~~~~~~.~~~~~~#',
        '#~~~~~.D.~~~~~#',
        '#~~~.......~~~#',
        '#~...........~#',
        '#..L.......L..#',
        '#..M..........#',
        'w.............#',
        '#..........M..#',
        '#..L.......L..#',
        '#......M......#',
        '#...T.....T...#',
        '#......G......#',
        '#~~.........~~#',
        '###############',
      ],
      exits: { n: null, e: null, s: null, w: 'kaldum_fonderie_creusets' },
      npcs: [],
      nodes: ['basalte_de_kaldum'],
      groups: [
        { monsters: ['cendrou', 'cendrou', 'kaldrik', 'pioche_vive'], level: [29, 30], respawn: 65 },
        { monsters: ['cendrou', 'pioche_vive', 'pioche_vive', 'kaldrik'], level: [29, 30], respawn: 65 },
        { monsters: ['masse_vive', 'masse_vive', 'molh_ancien', 'kaldrik_trempe'], level: [29, 30], respawn: 70 },
      ],
      dungeon: 'forge_morte',
      relay: false,
    },
  ],
});

// ===================================================================================
// PNJ
// ===================================================================================

DATA.content.npcs.push({
  id: 'ravok', name: 'Thulvar', title: 'Garde de la Porte', look: 'garde',
  dialogue: [
    "Halte. Tu viens des Cimes ? Ça se voit : pas encore de suie sur les joues.",
    "Kaldum a besoin de bras. Les forges s'éteignent une à une.",
    "Va voir Thorvek, à la Halle des Mineurs. Il saura quoi faire de toi.",
  ],
});

DATA.content.npcs.push({
  id: 'thalvi', name: 'Thalvi', title: 'Relayeuse et tailleuse', look: 'tisseur', workshop: 'tailleur',
  dialogue: [
    "Le Relais de Kaldum tient encore. Tant que le Fil tient, tu peux revenir ici.",
    "Touche le Relais et le Fil te ramènera sur cette place. Pratique, quand les galeries se referment derrière toi.",
    "Entre deux voyageurs, je couds. Apporte-moi de quoi, je te taille une coiffe ou une cape.",
  ],
});

DATA.content.npcs.push({
  id: 'korth', name: 'Korth', title: 'Marchand de la Place', look: 'marchand',
  dialogue: [
    "Pain de scorie, pain de forge, potions. Tout ce qu'il faut pour descendre, et surtout pour remonter.",
    "Le pain de scorie croque un peu. C'est normal, c'est la scorie.",
  ],
  shop: ['pain_de_scorie', 'pain_de_forge', 'potion_de_relais', 'potion_de_veille'],
});

DATA.content.npcs.push({
  id: 'vika', name: 'Vika', title: 'Fille de mineur', look: 'enfant',
  dialogue: [
    "Mon père dit qu'il y a un géant sous la forge. Un géant qui dort.",
    "Tu vas descendre ? Rapporte-moi un caillou qui brille.",
  ],
});

DATA.content.npcs.push({
  id: 'tharik', name: 'Lurvik', title: 'Forgeron', look: 'artisan', workshop: 'forgeron',
  dialogue: [
    "Ma forge est tiède. Tiède ! Tu sais ce qu'on fait avec une forge tiède ? Des cuillères.",
    "Rapporte-moi du fer et de la scorie, je te ferai quelque chose qui tient le coup.",
  ],
});

DATA.content.npcs.push({
  id: 'velthi', name: 'Velthi', title: 'Bijoutière', look: 'artisan', workshop: 'bijoutier',
  dialogue: [
    "Le basalte de Kaldum, bien poli, brille comme la nuit. Les gens d'Orsane paient ça une fortune.",
    "Une amulette, ça ne se forge pas. Ça se mérite.",
  ],
});

DATA.content.npcs.push({
  id: 'rhuvel', name: 'Rhuvel', title: 'Alchimiste', look: 'artisan', workshop: 'alchimiste',
  dialogue: [
    "Ne touche à rien. Tout est chaud ou toxique. Souvent les deux.",
    "Les vapeurs des galeries ont changé d'odeur. Je veux savoir pourquoi.",
  ],
});

DATA.content.npcs.push({
  id: 'thorvek', name: 'Thorvek', title: 'Chef de mine', look: 'ancien',
  dialogue: [
    "Kaldum vit de sa chaleur. Quand les forges s'éteignent, c'est toute la ville qui a froid.",
    "Les galeries sont bouchées par des Molhs. Et sous les Molhs, il y a autre chose.",
  ],
});

DATA.content.npcs.push({
  id: 'kavra', name: 'Kavra', title: 'Mineuse', look: 'marcheur',
  dialogue: [
    "Les Molhs ? Des cailloux qui marchent. Sauf qu'ils marchent vers toi.",
    "Je parie que je descends plus de Molhs que toi. Pari tenu ?",
  ],
});

DATA.content.npcs.push({
  id: 'lethir', name: 'Lethir', title: 'Vieux mineur', look: 'ancien',
  dialogue: [
    "Quarante ans dans les galeries. Je connais chaque pierre. Même celles qui bougent.",
    "Ma lanterne s'est éteinte. Le lichen de scorie éclaire mieux, de toute façon.",
  ],
});

DATA.content.npcs.push({
  id: 'rukal', name: 'Rukal', title: 'Mineur sans pioche', look: 'marcheur',
  dialogue: [
    "Ma pioche est partie. Toute seule. Elle a sauté de mes mains et elle est partie en courant.",
    "On m'a dit de me reposer. Je me repose. Devant la Bouche des Vapeurs. Très reposant.",
  ],
});

DATA.content.npcs.push({
  id: 'kerath', name: 'Kerath', title: 'Fondeur et cordonnier', look: 'artisan', workshop: 'cordonnier',
  dialogue: [
    "La fonderie tourne au ralenti. Les Cendrous emportent les braises je ne sais où.",
    "Ma barbe a brûlé trois fois ce mois-ci. Trois fois.",
    "Pendant que le métal chauffe, je cloue des semelles et je fonds des boucles. Apporte le cuir, je fais le reste.",
  ],
});

// Le Fil à Kaldum : son capitaine tient la Porte. La Déchirure, elle, attend à la Fosse
// (Kethril, content/orsane.js).
DATA.content.npcs.push({
  id: 'okrel', name: 'Okrel', title: 'Capitaine du Fil', look: 'garde',
  dialogue: [
    "La Porte tient parce que quelqu'un la tient. Ici, c'est le Fil.",
    "Les Kaldrin n'aiment pas qu'on les aide. Ils aiment encore moins les Molhs.",
  ],
  factionLines: {
    fil: ["Un fil d'or de plus à la Porte. Bien. Il y a toujours un Molh de trop."],
    dechirure: ["La cape déchirée, ici ? Passe. La Porte reste ouverte à tous : c'est le Fil qui l'a voulu."],
  },
});

// ===================================================================================
// QUÊTES : ligne principale
// ===================================================================================

DATA.content.quests.push({
  id: 'kaldum_arrivee', name: "L'arrivée à Kaldum", level: 20, main: true,
  giver: 'ravok', turnIn: 'thorvek', requires: { level: 20, quests: ['orsane_le_terrier'] },
  steps: [
    { type: 'kill', monster: 'molh', count: 3, text: 'Repousser trois Molhs à la Porte de Kaldum' },
    { type: 'visit', map: 'kaldum_ville_place', text: 'Entrer dans Kaldum par la Place des Forges' },
    { type: 'talk', npc: 'thorvek', text: 'Se présenter à Thorvek, à la Halle des Mineurs' },
  ],
  dialogue: {
    offer: [
      "Les forges de Kaldum s'éteignent. Une par semaine, parfois deux.",
      "Depuis que la ville refroidit, les Molhs remontent jusqu'à la Porte.",
      "Repousse ceux qui traînent ici, puis va te présenter à Thorvek, à la Halle des Mineurs.",
    ],
    progress: ["Les Molhs sont lents. Toi, sois rapide."],
    done: [
      "C'est Thulvar qui t'envoie ? Bien. Il ne m'envoie que ceux qui tiennent debout.",
      "Regarde la halle : autrefois, on ne s'entendait pas parler ici. Maintenant, on entend le froid.",
    ],
  },
  rewards: { xp: 5793, fils: 40, items: [{ id: 'pain_de_scorie', count: 2 }] },
});

DATA.content.quests.push({
  id: 'kaldum_les_galeries_bouchees', name: 'Les galeries bouchées', level: 22, main: true,
  giver: 'thorvek', requires: { level: 21, quests: ['kaldum_arrivee'] },
  steps: [
    { type: 'kill', monster: 'molh', count: 6, text: 'Dégager les galeries de six Molhs' },
    { type: 'collect', item: 'pierre_de_molh', count: 4, text: 'Ramasser quatre pierres de Molh' },
    { type: 'visit', map: 'kaldum_galeries_fond', text: 'Atteindre le Fond des Galeries' },
    { type: 'talk', npc: 'thorvek', text: 'Rapporter les pierres à Thorvek' },
  ],
  dialogue: {
    offer: [
      "Les Molhs bouchent les galeries. De la pierre qui marche, de la pierre qui s'assoit, et plus rien ne passe.",
      "Dégage le passage jusqu'au Fond. Et rapporte-moi des pierres de Molh : je veux savoir d'où elles viennent.",
    ],
    progress: ["Le Fond des Galeries est tout en bas. Suis le Fil, il connaît le chemin."],
    done: [
      "Ces pierres sont chaudes. Pas chaudes comme une pierre au soleil. Chaudes comme une pierre qui sort du four.",
      "Il y a une forge quelque part là-dessous. Et ce n'est pas une des nôtres.",
    ],
  },
  rewards: { xp: 6747, fils: 50, items: [{ id: 'bottes_molh', count: 1 }] },
});

DATA.content.quests.push({
  id: 'kaldum_les_vapeurs', name: 'Les vapeurs', level: 25, main: true,
  giver: 'thorvek', requires: { level: 24, quests: ['kaldum_les_galeries_bouchees'] },
  steps: [
    { type: 'visit', map: 'kaldum_vapeurs_bouche', text: 'Descendre jusqu\'à la Bouche des Vapeurs' },
    { type: 'kill', monster: 'fumerolle', count: 5, text: 'Dissiper cinq Fumerolles' },
    { type: 'collect', item: 'vapeur_de_fumerolle', count: 3, text: 'Recueillir trois vapeurs de Fumerolle' },
    { type: 'talk', npc: 'rhuvel', text: 'Porter les vapeurs à Rhuvel, aux Ateliers' },
    { type: 'talk', npc: 'thorvek', text: 'Revenir voir Thorvek' },
  ],
  dialogue: {
    offer: [
      "Au-delà du Fond, les galeries se remplissent de vapeur. Les mineurs qui en reviennent toussent noir.",
      "Des Fumerolles y rôdent : des souffles qui brûlent et qui s'effacent. Prends-leur leur vapeur et porte-la à Rhuvel.",
    ],
    progress: ["Rhuvel est aux Ateliers. Ne respire pas trop ce que tu lui apportes."],
    done: [
      "Rhuvel est formel : ce n'est pas une vapeur de mine. C'est un souffle de forge.",
      "Quelque chose, en bas, tire notre chaleur et la souffle ailleurs.",
    ],
  },
  rewards: { xp: 8278, fils: 60, items: [{ id: 'cape_fumerolle', count: 1 }] },
});

DATA.content.quests.push({
  id: 'kaldum_les_cendrous', name: 'Les Cendrous', level: 27, main: true,
  giver: 'thorvek', requires: { level: 26, quests: ['kaldum_les_vapeurs'] },
  steps: [
    { type: 'visit', map: 'kaldum_fonderie_entree', text: 'Traverser les Vapeurs jusqu\'à la Fonderie' },
    { type: 'kill', monster: 'cendrou', count: 5, text: 'Éteindre cinq Cendrous' },
    { type: 'collect', item: 'cendre_de_cendrou', count: 4, text: 'Recueillir quatre cendres de Cendrou' },
    { type: 'talk', npc: 'kerath', text: 'Montrer les cendres à Kerath, au Relais de la Fonderie' },
    { type: 'talk', npc: 'thorvek', text: 'Revenir voir Thorvek' },
  ],
  dialogue: {
    offer: [
      "Kerath, à la Fonderie, dit que ses braises s'envolent. Des Cendrous les emportent vers le bas.",
      "Suis-les. Prends-leur leur cendre et montre-la à Kerath. Il reconnaîtra une braise de chez nous.",
    ],
    progress: ["La Fonderie est au bout du Conduit. Kerath t'attend près du Relais."],
    done: [
      "Kerath a reconnu la cendre. Ce sont nos braises, mais elles ont été forgées une seconde fois.",
      "Un seul forgeron sait faire ça, et il dort sous la Fonderie depuis la Déchirure. Dorm.",
    ],
  },
  rewards: { xp: 9363, fils: 70, items: [{ id: 'amulette_pioche_vive', count: 1 }] },
});

DATA.content.quests.push({
  id: 'kaldum_la_forge_morte', name: 'La Forge Morte', level: 29, main: true,
  giver: 'thorvek', requires: { level: 28, quests: ['kaldum_les_cendrous'] },
  steps: [
    { type: 'talk', npc: 'kerath', text: 'Rejoindre Kerath au Relais de la Fonderie' },
    { type: 'visit', map: 'kaldum_fonderie_forge', text: 'Trouver la porte de la Forge Morte' },
    { type: 'dungeon', dungeon: 'forge_morte', text: 'Vaincre Dorm, le Forgeron Enseveli' },
    { type: 'talk', npc: 'thorvek', text: 'Annoncer la nouvelle à Thorvek' },
  ],
  dialogue: {
    offer: [
      "Dorm forgeait pour l'ère qui dort sous Kaldum. Quand le Voile s'est déchiré, sa forge s'est réveillée avec lui.",
      "Il tire notre chaleur pour rallumer la sienne. Si on le laisse faire, Kaldum s'éteint.",
      "Descends à la Forge Morte. Éteins-le pour de bon.",
    ],
    progress: ["La porte est au bout de la Fonderie, derrière les Creusets. N'y va pas seul."],
    done: [
      "Les forges se rallument. Toutes. Lurvik pleure devant la sienne, mais ne lui dis pas que je te l'ai dit.",
      "Kaldum te doit sa chaleur, Veilleur. Ça ne s'oublie pas, ici.",
    ],
  },
  rewards: { xp: 10497, fils: 100, items: [{ id: 'bottes_cendrou', count: 1 }] },
});

// ===================================================================================
// QUÊTES : secondaires
// ===================================================================================

DATA.content.quests.push({
  id: 'kaldum_habille_pour_la_mine', name: 'Habillé pour la mine', level: 20, main: false,
  giver: 'tharik', requires: { level: 20, quests: [] },
  steps: [
    { type: 'equip', slot: 'coiffe', text: 'Porter une coiffe, n\'importe laquelle' },
    { type: 'talk', npc: 'tharik', text: 'Se montrer à Lurvik' },
  ],
  dialogue: {
    offer: [
      "Tu comptes descendre dans les galeries tête nue ? Les Molhs lâchent des cailloux. Gros comme toi.",
      "Mets quelque chose sur ta tête. N'importe quoi. Un chaudron, s'il le faut.",
    ],
    progress: ["Toujours rien sur la tête. Tu attends qu'un Molh te coiffe ?"],
    done: ["Voilà. Maintenant tu ressembles à quelqu'un qui va revenir. Tiens, de quoi manger."],
  },
  rewards: { xp: 2896, fils: 30, items: [{ id: 'pain_de_forge', count: 2 }] },
});

DATA.content.quests.push({
  id: 'kaldum_le_pari_de_kavra', name: 'Le pari de Kavra', level: 21, main: false,
  giver: 'kavra', requires: { level: 20, quests: [] },
  steps: [
    { type: 'kill', monster: 'molh', count: 6, text: 'Mettre à terre six Molhs' },
    { type: 'talk', npc: 'kavra', text: 'Revenir réclamer le pari à Kavra' },
  ],
  dialogue: {
    offer: [
      "Six Molhs. Je dis que tu n'y arrives pas avant la fin de mon pain.",
      "Je mange lentement. Mais pas tant que ça.",
    ],
    progress: ["Il me reste la croûte. Dépêche-toi."],
    done: [
      "Six ? Bon. J'ai perdu. J'avais déjà fini le pain, en fait.",
      "Tiens, deux autres. Tu les as gagnés, et moi je n'ai plus faim.",
    ],
  },
  rewards: { xp: 3132, fils: 40, items: [{ id: 'pain_de_scorie', count: 2 }] },
});

DATA.content.quests.push({
  id: 'kaldum_la_lanterne_de_lethir', name: 'La lanterne de Lethir', level: 22, main: false,
  giver: 'lethir', requires: { level: 21, quests: [] },
  steps: [
    { type: 'gather', resource: 'lichen_de_scorie', count: 3, text: 'Récolter trois lichens de scorie' },
    { type: 'talk', npc: 'lethir', text: 'Rapporter le lichen à Lethir' },
  ],
  dialogue: {
    offer: [
      "Ma lanterne est morte. Quarante ans qu'elle tenait, et elle choisit ce mois-ci.",
      "Le lichen de scorie luit tout seul. Ramène-m'en trois poignées, j'en ferai une lampe qui ne s'éteint jamais.",
    ],
    progress: ["Le lichen pousse sur les parois chaudes. Si ça brûle les doigts, c'est le bon."],
    done: [
      "Ça éclaire. Ça éclaire même trop. Je vais voir des choses que je ne voulais pas voir.",
      "Prends ça. Un vieux casque de Molh. Il a l'air d'un caillou, mais c'est un bon caillou.",
    ],
  },
  rewards: { xp: 3374, fils: 45, items: [{ id: 'coiffe_molh', count: 1 }] },
});

DATA.content.quests.push({
  id: 'kaldum_l_alliage_qui_brille', name: "L'alliage qui brille", level: 24, main: false,
  giver: 'tharik', requires: { level: 23, quests: [] },
  steps: [
    { type: 'kill', monster: 'kaldrik', count: 4, text: 'Faire fondre quatre Rakthuls' },
    { type: 'collect', item: 'scorie_de_kaldrik', count: 5, text: 'Rapporter cinq scories de Rakthul' },
    { type: 'talk', npc: 'tharik', text: 'Livrer les scories à Lurvik' },
  ],
  dialogue: {
    offer: [
      "J'ai une idée d'alliage. Il ne sert à rien, mais il brille.",
      "Il me faut de la scorie de Rakthul. Ils fondent au feu, alors chauffe-les et ramasse ce qui reste.",
    ],
    progress: ["Cinq scories. Et propres, hein. Pas de doigts de Rakthul dedans."],
    done: [
      "Regarde-moi ça. Ça ne coupe pas, ça ne protège pas, mais on se voit dedans.",
      "J'ai aussi fait une cape avec les restes. Elle, au moins, elle sert à quelque chose.",
    ],
  },
  rewards: { xp: 3877, fils: 55, items: [{ id: 'cape_kaldrik', count: 1 }] },
});

DATA.content.quests.push({
  id: 'kaldum_des_bagues_qui_pesent', name: 'Des bagues qui pèsent', level: 25, main: false,
  giver: 'velthi', requires: { level: 24, quests: [] },
  steps: [
    { type: 'gather', resource: 'basalte_de_kaldum', count: 4, text: 'Tailler quatre blocs de basalte de Kaldum' },
    { type: 'collect', item: 'vapeur_de_fumerolle', count: 3, text: 'Recueillir trois vapeurs de Fumerolle' },
    { type: 'talk', npc: 'velthi', text: 'Apporter le tout à Velthi' },
  ],
  dialogue: {
    offer: [
      "Les gens d'Orsane veulent des bagues qui pèsent. Ils disent que ça fait sérieux.",
      "Du basalte, donc. Et de la vapeur de Fumerolle pour le polir : rien ne fait briller la pierre comme un souffle qui brûle.",
    ],
    progress: ["Le basalte, c'est lourd. C'est le but."],
    done: [
      "Parfait. Des bagues qu'on ne peut pas lever. Orsane va adorer.",
      "Pour toi, quelque chose de plus léger. Une amulette : elle brille, et elle ne pèse rien.",
    ],
  },
  rewards: { xp: 4139, fils: 60, items: [{ id: 'amulette_fumerolle', count: 1 }] },
});

DATA.content.quests.push({
  id: 'kaldum_la_tournee_des_relais', name: 'La tournée des Relais', level: 26, main: false,
  giver: 'thalvi', requires: { level: 25, quests: [] },
  steps: [
    { type: 'visit', map: 'kaldum_galeries_relais', text: 'Toucher le Relais des Galeries' },
    { type: 'visit', map: 'kaldum_fonderie_relais', text: 'Toucher le Relais de la Fonderie' },
    { type: 'talk', npc: 'thalvi', text: 'Faire son rapport à Thalvi' },
  ],
  dialogue: {
    offer: [
      "Les Relais des Galeries et de la Fonderie ne me répondent plus. Le Fil est tendu, mais il ne chante pas.",
      "Va les toucher, l'un après l'autre. S'ils tiennent, je le sentirai d'ici.",
      "C'est loin ? Un peu. C'est dangereux ? Un peu. C'est payé ? Un peu.",
    ],
    progress: ["Je ne sens toujours rien. Soit ils sont morts, soit tu es encore sur la place."],
    done: [
      "Je les sens. Les deux. Ils ne répondaient pas parce que personne ne leur parlait.",
      "Les Relais, c'est comme les mineurs : si on ne passe pas les voir, ils boudent.",
    ],
  },
  rewards: { xp: 4407, fils: 60, items: [{ id: 'potion_de_relais', count: 2 }] },
});

DATA.content.quests.push({
  id: 'kaldum_la_pioche_qui_mord', name: 'La pioche qui mord', level: 27, main: false,
  giver: 'rukal', requires: { level: 26, quests: [] },
  steps: [
    { type: 'kill', monster: 'pioche_vive', count: 4, text: 'Casser quatre Pioche-Vives' },
    { type: 'collect', item: 'fer_de_pioche_vive', count: 3, text: 'Récupérer trois fers de Pioche-Vive' },
    { type: 'talk', npc: 'rukal', text: 'Rendre son fer à Rukal' },
  ],
  dialogue: {
    offer: [
      "Ma pioche s'est enfuie. Elle est quelque part dans les Vapeurs, et elle a des copines.",
      "Je ne veux pas la revoir. Je veux son fer. Ramène-moi de quoi en forger une qui reste tranquille.",
    ],
    progress: ["Si tu en vois une avec un manche rouge, c'est la mienne. Ne lui fais pas de cadeau."],
    done: [
      "Du bon fer. Un peu nerveux encore, mais ça se calme à la forge.",
      "Tiens, ses bottes. Enfin, celles qu'elle m'a laissées en partant. Je ne pose pas de questions.",
    ],
  },
  rewards: { xp: 4682, fils: 65, items: [{ id: 'bottes_pioche_vive', count: 1 }] },
});

DATA.content.quests.push({
  id: 'kaldum_la_barbe_de_kerath', name: 'La barbe de Kerath', level: 28, main: false,
  giver: 'kerath', requires: { level: 27, quests: [] },
  steps: [
    { type: 'kill', monster: 'cendrou', count: 4, text: 'Éteindre quatre Cendrous' },
    { type: 'collect', item: 'cendre_de_cendrou', count: 3, text: 'Ramasser trois cendres de Cendrou' },
    { type: 'talk', npc: 'kerath', text: 'Rapporter les cendres à Kerath' },
  ],
  dialogue: {
    offer: [
      "Trois fois ce mois-ci. Trois fois qu'un Cendrou me passe sous le nez et que ma barbe s'enflamme.",
      "Éteins-en quelques-uns. Et ramène leur cendre : je veux la mettre dans un bocal et la regarder tous les matins.",
    ],
    progress: ["Pas de cendre encore ? Ma barbe repousse plus vite que toi."],
    done: [
      "Dans le bocal. Voilà. On verra qui regarde qui, maintenant.",
      "Prends cette coiffe. Du fer de Pioche-Vive refondu : ça ne brûle pas. Je l'ai testée sur ma barbe.",
    ],
  },
  rewards: { xp: 4962, fils: 70, items: [{ id: 'coiffe_pioche_vive', count: 1 }] },
});

DATA.content.quests.push({
  id: 'kaldum_le_bain_de_lethir', name: 'Le bain de Lethir', level: 22, main: false,
  giver: 'lethir', requires: { level: 21, quests: [] },
  steps: [
    { type: 'visit', map: 'kaldum_galeries_eboulement', text: 'Descendre jusqu\'à l\'Éboulement' },
    { type: 'dungeon', dungeon: 'boues_chaudes', text: 'Vaincre la Glaise Mère au fond des Boues Chaudes' },
    { type: 'talk', npc: 'lethir', text: 'Revenir voir Lethir' },
  ],
  dialogue: {
    offer: [
      "Sous l'Éboulement, il y a des boues chaudes. Quarante ans que j'y prends mon bain du dimanche.",
      "Dimanche dernier, la boue m'a pris mon savon. Puis elle m'a regardé.",
      "C'est la Glaise Mère. Le feu la cuit, l'eau la régale. Ne lui offre surtout pas à boire.",
    ],
    progress: ["Si elle s'effrite en petits Gleks, même règle : du feu, jamais d'eau."],
    done: [
      "Cuite ? Bien cuite ? Alors dimanche, bain.",
      "Tiens, pour ta peine. Et si tu retrouves mon savon, garde-le : il a vu des choses.",
    ],
  },
  rewards: { xp: 3374, fils: 60, items: [{ id: 'pain_de_scorie', count: 2 }] },
});

DATA.content.quests.push({
  id: 'kaldum_le_casse_croute_de_rukal', name: 'Le casse-croûte de Rukal', level: 26, main: false,
  giver: 'rukal', requires: { level: 25, quests: [] },
  steps: [
    { type: 'dungeon', dungeon: 'mine_des_tholous', text: 'Descendre dans la Mine des Tholous' },
    { type: 'talk', npc: 'rukal', text: 'Rapporter son casse-croûte à Rukal' },
  ],
  dialogue: {
    offer: [
      "Derrière moi, la vieille mine. Les Tholous s'y sont installés. Ils sont ronds, ils sont tièdes, et ils ont mon casse-croûte.",
      "Leur chef, le Grand Tholou, ne quitte jamais son gros Molh. Il lui chauffe les pieds, le Molh tape pour deux.",
      "Sépare-les. Pousse le Grand Tholou loin de son Molh : sans lui, il ne sait plus quoi faire de ses pattes.",
    ],
    progress: ["Plus de trois cases entre eux, et il panique. Les rochers aident à les tenir écartés."],
    done: [
      "Mon casse-croûte ! Il est tiède. Ils l'ont gardé au chaud, c'est presque gentil.",
      "Prends-en la moitié. Non, le tiers. Bon, prends plutôt ça.",
    ],
  },
  rewards: { xp: 4407, fils: 70, items: [{ id: 'pain_de_forge', count: 2 }] },
});

DATA.content.quests.push({
  id: 'kaldum_la_sieste_de_rukal', name: 'La sieste de Rukal', level: 28, main: false,
  giver: 'rukal', requires: { level: 27, quests: [] },
  steps: [
    { type: 'visit', map: 'kaldum_vapeurs_cuve', text: 'Aller jusqu\'à la Cuve des Cendrous' },
    { type: 'dungeon', dungeon: 'cuve_des_cendrous', text: 'Éteindre Kraska, la Mère-Braise' },
    { type: 'talk', npc: 'rukal', text: 'Revenir voir Rukal' },
  ],
  dialogue: {
    offer: [
      "Impossible de faire la sieste. La Cuve, à côté, chauffe tellement que mes bottes fument.",
      "C'est Kraska, la Mère-Braise. Les Cendrous lui apportent les braises de la Fonderie, elle les rallume.",
      "Ses braises explosent en mourant, et sa robe de cendre n'arrête pas ça. Fais-les sauter contre elle.",
    ],
    progress: ["Une braise, ça se tue à côté de Kraska. Ailleurs, c'est du gâchis."],
    done: [
      "Le calme. La fraîcheur. Enfin, la tiédeur.",
      "Merci, Veilleur. Je vais pouvoir me reposer. Comme d'habitude, mais mieux.",
    ],
  },
  rewards: { xp: 4962, fils: 80, items: [{ id: 'potion_de_veille', count: 1 }] },
});

// ===================================================================================
// QUÊTES : les factions, rangs 1 et 2 (docs/MONDE.md)
// ===================================================================================
// Trois quêtes par rang et par faction, 10 points chacune : trente points font un rang
// (js/factions.js). Le Fil protège, recoud et scelle ; la Déchirure regarde, ouvre et lie.
// Elles se rendent au contact de la faction : Okrel à la Porte, Kethril à la Fosse.

// ----- Le Fil, rang 1 : Bout de fil -----

DATA.content.quests.push({
  id: 'kaldum_fil_la_porte_tient', name: 'La Porte tient', level: 20, main: false, category: 'faction',
  giver: 'okrel', requires: { level: 20, faction: 'fil', factionRank: 1 },
  steps: [
    { type: 'kill', monster: 'molh', count: 6, text: 'Repousser six Molhs devant la Porte de Kaldum' },
    { type: 'kill', monster: 'molhin', count: 3, text: 'Écarter trois Molhins des remparts' },
    { type: 'talk', npc: 'okrel', text: 'Rendre compte à Okrel' },
  ],
  dialogue: {
    offer: [
      "Les Molhs remontent jusqu'à la Porte, et les Kaldrin les repoussent seuls. Le Fil ne laisse pas une ville seule.",
      "Tiens la Porte avec moi. Six Molhs, trois Molhins, et la nuit sera calme.",
    ],
    progress: ["Un Molh ne court pas. Toi, tu peux."],
    done: ["La Porte tient. Les Kaldrin ne diront pas merci, mais ils ont ouvert une fenêtre. C'est leur façon."],
  },
  rewards: { xp: 2896, fils: 40, faction: 10 },
});

DATA.content.quests.push({
  id: 'kaldum_fil_les_lanternes_des_galeries', name: 'Les lanternes des galeries', level: 22, main: false, category: 'faction',
  giver: 'okrel', requires: { level: 21, faction: 'fil', factionRank: 1 },
  steps: [
    { type: 'visit', map: 'kaldum_galeries_entree', text: "Descendre à l'Entrée des Galeries" },
    { type: 'gather', resource: 'lichen_de_scorie', count: 4, text: 'Cueillir quatre lichens de scorie pour les lanternes' },
    { type: 'visit', map: 'kaldum_galeries_relais', text: 'Rallumer la lanterne du Relais des Galeries' },
    { type: 'talk', npc: 'okrel', text: 'Rendre compte à Okrel' },
  ],
  dialogue: {
    offer: [
      "Dans les Galeries, les lanternes du Fil s'éteignent une à une. Sans elles, les mineurs se perdent, et les remontées les trouvent.",
      "Le lichen de scorie brûle sans fin. Cueilles-en, et rallume la lanterne du Relais des Galeries. Le Fil allume ; il n'éteint pas.",
    ],
    progress: ["Le lichen pousse sur les parois chaudes. Ne le confonds pas avec la mousse de Molh : elle, elle mord."],
    done: [
      "Je la sens d'ici, ta lanterne. Le Fil tremble quand une lumière revient.",
      "Lethir t'a regardé faire, je parie. Il ne dira rien. Il ne dit jamais rien, et il voit tout.",
    ],
  },
  rewards: { xp: 3374, fils: 45, faction: 10 },
});

DATA.content.quests.push({
  id: 'kaldum_fil_le_sceau_du_boyau', name: 'Le sceau du Boyau', level: 24, main: false, category: 'faction',
  giver: 'okrel', requires: { level: 23, faction: 'fil', factionRank: 1 },
  steps: [
    { type: 'visit', map: 'kaldum_galeries_boyau', text: 'Trouver la fente scellée du Boyau' },
    { type: 'kill', monster: 'thelk', count: 4, text: 'Renvoyer quatre Thelks qui poussent contre le sceau' },
    { type: 'kill', monster: 'scorik', count: 3, text: 'Écarter trois Scoriks du sceau' },
    { type: 'talk', npc: 'okrel', text: 'Dire à Okrel que le sceau tient' },
  ],
  dialogue: {
    offer: [
      "Dans le Boyau, il y a une fente. Pas une fissure : une porte, avec des marches. Le Fil l'a scellée il y a longtemps.",
      "Le sceau faiblit. Renvoie ce qui pousse contre, et ne regarde pas dedans. Ce qu'il y a derrière, le Fil le sait. Ça suffit.",
    ],
    progress: ["Ne descends pas les marches. Ce n'est pas une question de courage."],
    done: [
      "Le sceau tient. Tu n'as pas regardé ? Bien.",
      "Ne parle de cette fente à personne. Surtout pas à la Fosse : là-bas, une porte fermée, c'est une invitation.",
    ],
  },
  rewards: { xp: 3877, fils: 55, faction: 10 },
});

// ----- Le Fil, rang 2 : Couseur -----

DATA.content.quests.push({
  id: 'kaldum_fil_recoudre_la_bouche', name: 'Recoudre la Bouche', level: 25, main: false, category: 'faction',
  giver: 'okrel', requires: { level: 24, faction: 'fil', factionRank: 2 },
  steps: [
    { type: 'visit', map: 'kaldum_vapeurs_bouche', text: 'Descendre à la Bouche des Vapeurs' },
    { type: 'kill', monster: 'fumerolle', count: 5, text: 'Dissiper cinq Fumerolles autour de la déchirure' },
    { type: 'gather', resource: 'basalte_de_kaldum', count: 3, text: 'Tailler trois blocs de basalte pour lester la couture' },
    { type: 'talk', npc: 'okrel', text: 'Rendre compte à Okrel' },
  ],
  dialogue: {
    offer: [
      "La Bouche des Vapeurs n'est pas une bouche. C'est une déchirure, petite, qui souffle chaud. Les Couseurs la recousent chaque printemps.",
      "Cette année, ils n'osent plus descendre. Dissipe les Fumerolles, leste la couture avec du basalte, et la Bouche se taira un moment.",
    ],
    progress: ["Une Fumerolle craint l'air. Garde tes sorts d'air pour elles."],
    done: ["Les Couseurs sont redescendus. Ils disent que la couture est belle. Venant d'eux, c'est beaucoup."],
  },
  rewards: { xp: 4139, fils: 55, faction: 10 },
});

DATA.content.quests.push({
  id: 'kaldum_fil_le_souffle_de_la_roche', name: 'Le souffle de la roche', level: 27, main: false, category: 'faction',
  giver: 'okrel', requires: { level: 26, faction: 'fil', factionRank: 2 },
  steps: [
    { type: 'visit', map: 'kaldum_vapeurs_souffleries', text: 'Écouter la roche, aux Souffleries' },
    { type: 'kill', monster: 'thelk_ancien', count: 1, text: 'Calmer un Thelk Ancien qui garde le passage' },
    { type: 'kill', monster: 'pioche_vive', count: 4, text: 'Briser quatre Pioche-Vives qui creusent vers le bruit' },
    { type: 'talk', npc: 'okrel', text: "Rapporter à Okrel ce que dit la roche" },
  ],
  dialogue: {
    offer: [
      "Les Gardiens d'Écailles disent que la roche de Kaldum respire. Pas fort : une fois par heure, sous les Souffleries.",
      "Ils veulent savoir si c'est un Grand Dragon qui dort, ou la Déchirure qui pousse. Va écouter. Et arrête les Pioche-Vives : elles creusent vers le bruit.",
    ],
    progress: ["Pose la main sur la roche, et attends. Si elle te répond, ne lui réponds pas."],
    done: [
      "Une respiration lente, et chaude. Ce n'est pas la Déchirure : elle ne respire pas, elle tire.",
      "Les Gardiens d'Écailles vont écrire ça quelque part, et le ranger loin. Le Fil range beaucoup de choses loin.",
    ],
  },
  rewards: { xp: 4682, fils: 60, faction: 10 },
});

DATA.content.quests.push({
  id: 'kaldum_fil_le_point', name: 'Le Point', level: 29, main: false, category: 'faction',
  giver: 'okrel', requires: { level: 28, faction: 'fil', factionRank: 2 },
  steps: [
    { type: 'visit', map: 'kaldum_fonderie_entree', text: "Rejoindre l'Entrée de la Fonderie" },
    { type: 'kill', monster: 'molh_ancien', count: 2, text: 'Arrêter deux Molhs Anciens qui montent vers la ville' },
    { type: 'kill', monster: 'kaldrik', count: 4, text: 'Repousser quatre Rakthuls' },
    { type: 'talk', npc: 'okrel', text: "Recevoir ton Point des mains d'Okrel" },
  ],
  dialogue: {
    offer: [
      "Un Point, chez nous, c'est le premier nœud solide. Celui qui tient quand le reste lâche.",
      "Les Molhs Anciens remontent de la Fonderie vers la ville. Arrête-les. Après, tu choisiras ton ordre : Gardes-Fil, Couseurs ou Gardiens d'Écailles.",
    ],
    progress: ["Un Molh Ancien change de peau, un tour sur deux : la terre, puis le feu. Frappe avec l'élément qu'il ne porte pas."],
    done: [
      "Tu tiens quand le reste lâche. Te voilà Point du Fil.",
      "Choisis ton ordre, et choisis bien : on n'en change pas comme de cape.",
    ],
  },
  rewards: { xp: 5249, fils: 70, items: [{ id: 'pain_de_forge', count: 2 }], faction: 10 },
});

// ----- La Déchirure, rang 1 : Accroc -----

DATA.content.quests.push({
  id: 'kaldum_dechirure_les_yeux_ouverts', name: 'Les yeux ouverts', level: 20, main: false, category: 'faction',
  giver: 'kethril', requires: { level: 20, faction: 'dechirure', factionRank: 1 },
  steps: [
    { type: 'visit', map: 'kaldum_galeries_entree', text: "Descendre à l'Entrée des Galeries de Kaldum" },
    { type: 'kill', monster: 'thelk', count: 3, text: "Observer trois Thelks : la glaise vivante vient d'en dessous" },
    { type: 'kill', monster: 'molhin', count: 3, text: 'Compter trois Molhins remontés' },
    { type: 'talk', npc: 'kethril', text: 'Raconter à Kethril ce que tu as vu' },
  ],
  dialogue: {
    offer: [
      "La Déchirure ne ferme pas les yeux, Veilleur. Elle les ouvre, même quand ça pique.",
      "Sous Kaldum, la glaise marche et la roche pousse. Le Fil dit « remontées » et sort sa lame. Nous, on regarde d'où elles viennent. Descends, observe, reviens me dire.",
    ],
    progress: ["Regarde les pieds d'un Thelk. La boue qui y colle n'est pas de Kaldum."],
    done: [
      "Une boue plus vieille que la mine. Tu vois ? Quand on regarde, on apprend.",
      "Le Fil aurait recousu, et il n'aurait rien su.",
    ],
  },
  rewards: { xp: 2896, fils: 40, faction: 10 },
});

DATA.content.quests.push({
  id: 'kaldum_dechirure_ce_que_la_roche_retient', name: 'Ce que la roche retient', level: 22, main: false, category: 'faction',
  giver: 'kethril', requires: { level: 21, faction: 'dechirure', factionRank: 1 },
  steps: [
    { type: 'visit', map: 'kaldum_galeries_eboulement', text: "Descendre jusqu'à l'Éboulement" },
    { type: 'kill', monster: 'molh', count: 8, text: "Ouvrir l'Éboulement : huit Molhs à déplacer" },
    { type: 'gather', resource: 'basalte_de_kaldum', count: 3, text: 'Prélever trois blocs de basalte au fond' },
    { type: 'talk', npc: 'kethril', text: 'Montrer les blocs à Kethril' },
  ],
  dialogue: {
    offer: [
      "L'Éboulement n'est pas tombé tout seul. Quelqu'un l'a fait tomber, pour boucher quelque chose.",
      "Ouvre-le. Les Molhs s'y sont assis : déplace-les. Et rapporte-moi des blocs du fond. La roche se souvient de ce qu'elle a retenu.",
    ],
    progress: ["Huit Molhs. Ils sont lourds, mais ils ne tiennent pas tant que ça à rester."],
    done: [
      "Ce basalte est taillé. Pas cassé : taillé, d'un côté. Il y avait un mur, et derrière le mur, un passage.",
      "Le Fil a fait tomber cet éboulement. Je m'en doutais. Maintenant, je le sais.",
    ],
  },
  rewards: { xp: 3374, fils: 45, faction: 10 },
});

DATA.content.quests.push({
  id: 'kaldum_dechirure_la_fente_du_boyau', name: 'La fente du Boyau', level: 24, main: false, category: 'faction',
  giver: 'kethril', requires: { level: 23, faction: 'dechirure', factionRank: 1 },
  steps: [
    { type: 'visit', map: 'kaldum_galeries_boyau', text: 'Trouver la fente que le Fil a scellée' },
    { type: 'kill', monster: 'thelk', count: 4, text: 'Laisser sortir ce qui pousse, et compter : quatre Thelks' },
    { type: 'kill', monster: 'kaldrik', count: 2, text: 'Écarter deux Rakthuls du sceau' },
    { type: 'talk', npc: 'kethril', text: "Dire à Kethril ce qu'il y a derrière" },
  ],
  dialogue: {
    offer: [
      "Dans le Boyau, le Fil a scellé une fente. Un sceau tout neuf sur une porte très vieille.",
      "Va voir ce qui pousse contre. Ne casse rien : un sceau, ça se lit avant de s'ouvrir. Puis reviens me dire ce qu'il y a derrière.",
    ],
    progress: ["Si un capitaine du Fil te demande ce que tu fais là, dis que tu cherches du lichen."],
    done: [
      "Des marches. Taillées. Quelqu'un est descendu là avant nous, et le Fil l'a caché.",
      "Un jour, on descendra ces marches. Pas aujourd'hui. Aujourd'hui, on sait qu'elles existent, et c'est déjà beaucoup.",
    ],
  },
  rewards: { xp: 3877, fils: 55, faction: 10 },
});

// ----- La Déchirure, rang 2 : Éraflure -----

DATA.content.quests.push({
  id: 'kaldum_dechirure_lier_une_vapeur', name: 'Lier une vapeur', level: 25, main: false, category: 'faction',
  giver: 'kethril', requires: { level: 24, faction: 'dechirure', factionRank: 2 },
  steps: [
    { type: 'visit', map: 'kaldum_vapeurs_bouche', text: 'Descendre à la Bouche des Vapeurs' },
    { type: 'kill', monster: 'fumerolle', count: 5, text: 'Essouffler cinq Fumerolles' },
    { type: 'gather', resource: 'lichen_de_scorie', count: 3, text: 'Tresser un lien avec trois lichens de scorie' },
    { type: 'talk', npc: 'kethril', text: 'Montrer le lien à Kethril' },
  ],
  dialogue: {
    offer: [
      "Les Lieurs ne tuent pas ce qui remonte. Ils l'attachent, et ils écoutent.",
      "Essouffle les Fumerolles de la Bouche, puis tresse un lien de lichen. On verra si une vapeur se laisse tenir.",
    ],
    progress: ["Un lien de lichen, ça brûle les doigts. Les bons liens brûlent toujours un peu."],
    done: [
      "Il tient. Une vapeur attachée, qui tourne en rond dans son lien comme un chien content.",
      "Si une vapeur se laisse lier, un dragon aussi. Il faut juste un plus gros lien. Beaucoup plus gros.",
    ],
  },
  rewards: { xp: 4139, fils: 55, faction: 10 },
});

DATA.content.quests.push({
  id: 'kaldum_dechirure_les_descendeurs', name: 'Les Descendeurs', level: 27, main: false, category: 'faction',
  giver: 'kethril', requires: { level: 26, faction: 'dechirure', factionRank: 2 },
  steps: [
    { type: 'visit', map: 'kaldum_vapeurs_souffleries', text: 'Relever les Souffleries pour la carte' },
    { type: 'kill', monster: 'thelk_ancien', count: 1, text: 'Vaincre un Thelk Ancien, la plus vieille glaise du lieu' },
    { type: 'visit', map: 'kaldum_vapeurs_conduit', text: "Descendre jusqu'au Conduit" },
    { type: 'kill', monster: 'tholou_tisse', count: 2, text: 'Observer deux Tholous Tissés' },
    { type: 'talk', npc: 'kethril', text: 'Rapporter ta carte à Kethril' },
  ],
  dialogue: {
    offer: [
      "Les Descendeurs dessinent la carte de ce qui est en dessous. Pas les Bas-Voiles, pas encore : on commence par les Vapeurs.",
      "Relève les Souffleries et le Conduit. Note ce qui y vit : la vieille glaise, les Tholous tissés. Tout ce qui est tissé est remonté.",
    ],
    progress: ["Une bonne carte, c'est une carte où l'on a mis les pieds."],
    done: [
      "Les Souffleries respirent vers le bas, le Conduit vers le haut. Kaldum a deux poumons, et l'un des deux n'est pas à elle.",
      "Tu dessines bien. Les Descendeurs te garderaient, si tu les choisis.",
    ],
  },
  rewards: { xp: 4682, fils: 60, faction: 10 },
});

DATA.content.quests.push({
  id: 'kaldum_dechirure_l_entaille', name: "L'Entaille", level: 29, main: false, category: 'faction',
  giver: 'kethril', requires: { level: 28, faction: 'dechirure', factionRank: 2 },
  steps: [
    { type: 'visit', map: 'kaldum_fonderie_creusets', text: 'Descendre aux Creusets' },
    { type: 'kill', monster: 'fumerolle_noire', count: 2, text: "Étudier deux Fumerolles Noires, déchirées jusqu'au cœur" },
    { type: 'visit', map: 'kaldum_fonderie_forge', text: 'Regarder la porte de la Forge Morte, sans entrer' },
    { type: 'talk', npc: 'kethril', text: 'Recevoir ton Entaille des mains de Kethril' },
  ],
  dialogue: {
    offer: [
      "Une Entaille, chez nous, c'est la première vraie marque. Celle qui ne se referme plus.",
      "Aux Creusets rôdent des Fumerolles Noires, déchirées jusqu'au cœur. Étudie-les, puis va regarder la porte de la Forge Morte. Juste regarder : ce qui dort derrière, on le réveillera peut-être un jour.",
    ],
    progress: ["Une Fumerolle Noire éclate en mourant. Prends tes notes de loin."],
    done: [
      "Tu as regardé la Forge sans l'ouvrir. C'est plus dur qu'on croit. Tu portes ton Entaille.",
      "Choisis ton ordre : Effileurs, Lieurs ou Descendeurs. Une entaille ne se recoud pas, un ordre non plus.",
    ],
  },
  rewards: { xp: 5249, fils: 70, items: [{ id: 'pain_de_forge', count: 2 }], faction: 10 },
});

// ===================================================================================
// DONJONS
// ===================================================================================

DATA.content.dungeons.push({
  id: 'forge_morte', name: 'La Forge Morte', zone: 'kaldum_fonderie', level: [28, 30],
  entryMap: 'kaldum_fonderie_forge',
  keyItem: null,
  description: "La forge de Dorm, ensevelie sous la Fonderie depuis la Déchirure. Elle s'est rallumée, et c'est la chaleur de Kaldum qu'elle brûle.",
  rooms: [
    {
      name: 'Le Vestibule',
      layout: [
        '###############',
        '#~~~.......~~~#',
        '#~...........~#',
        '#.....T.T.....#',
        '#......M......#',
        '#.............#',
        '#..L.......L..#',
        '#.............#',
        '#.............#',
        '#..L.......L..#',
        '#.............#',
        '#......Z......#',
        '#.....T.T.....#',
        '#~~.........~~#',
        '###############',
      ],
      monsters: [{ id: 'kaldrik', level: 28 }, { id: 'kaldrik', level: 28 }, { id: 'molh', level: 28 }, { id: 'molh', level: 29 }],
    },
    {
      name: 'La Salle des Braises',
      layout: [
        '###############',
        '#~~~~~~~~~~~~~#',
        '#~~.........~~#',
        '#~....M......~#',
        '#.............#',
        '#..~~.....~~..#',
        '#..~~..L..~~..#',
        '#.............#',
        '#..~~..L..~~..#',
        '#..~~.....~~..#',
        '#.............#',
        '#~......Z....~#',
        '#~~.........~~#',
        '#~~~~~~~~~~~~~#',
        '###############',
      ],
      monsters: [{ id: 'cendrou', level: 29 }, { id: 'cendrou', level: 29 }, { id: 'cendrou', level: 30 }],
    },
    {
      name: "L'Atelier",
      layout: [
        '###############',
        '#.............#',
        '#..T..M..T....#',
        '#.............#',
        '#....o...o....#',
        '#.............#',
        '#..L.......L..#',
        '#......T......#',
        '#..L.......L..#',
        '#.............#',
        '#....o...o....#',
        '#.............#',
        '#..T...Z..T...#',
        '#.............#',
        '###############',
      ],
      monsters: [{ id: 'pioche_vive', level: 29 }, { id: 'pioche_vive', level: 30 }, { id: 'fumerolle', level: 29 }, { id: 'fumerolle', level: 30 }],
    },
    {
      name: "L'Enclume",
      layout: [
        '###############',
        '#~~~~~~~~~~~~~#',
        '#~~~.......~~~#',
        '#~~...M.....~~#',
        '#~...........~#',
        '#.............#',
        '#..L..###..L..#',
        '#.....###.....#',
        '#..L..###..L..#',
        '#.............#',
        '#~...........~#',
        '#~~....Z....~~#',
        '#~~~.......~~~#',
        '#~~~~~~~~~~~~~#',
        '###############',
      ],
      monsters: [{ id: 'dorm', level: 30 }, { id: 'pioche_vive', level: 30 }],
      boss: true,
    },
  ],
  rewards: { fils: 250, items: [{ id: 'marteau_de_dorm', rate: 100 }, { id: 'enclume_de_dorm', rate: 50 }] },
});

DATA.content.dungeons.push({
  id: 'boues_chaudes', name: 'Les Boues Chaudes', zone: 'kaldum_galeries', level: [20, 24],
  entryMap: 'kaldum_galeries_eboulement',
  keyItem: null,
  description: "Sous l'Éboulement, des bassins de boue tiède où les mineurs prenaient leur bain. La Glaise Mère s'y est levée, et ses petits Gleks barbotent partout.",
  rooms: [
    {
      name: 'La mare tiède',
      layout: [
        '###############',
        '#.............#',
        '#..~~.....~~..#',
        '#..~~..M..~~..#',
        '#.............#',
        '#......#......#',
        '#.............#',
        '#.~~.......~~.#',
        '#.............#',
        '#......#......#',
        '#.............#',
        '#..~~.....~~..#',
        '#..~~..Z..~~..#',
        '#.............#',
        '###############',
      ],
      monsters: [{ id: 'glek', level: 16 }, { id: 'glek', level: 16 }, { id: 'thelk', level: 20 }, { id: 'thelk', level: 21 }],
    },
    {
      name: 'Le bouillon',
      layout: [
        '###############',
        '#~~~.......~~~#',
        '#~...........~#',
        '#.....M.......#',
        '#..##.....##..#',
        '#.............#',
        '#.....~~~.....#',
        '#.....~~~.....#',
        '#.............#',
        '#..##.....##..#',
        '#.............#',
        '#.......Z.....#',
        '#~...........~#',
        '#~~~.......~~~#',
        '###############',
      ],
      monsters: [{ id: 'thelk', level: 22 }, { id: 'thelk', level: 22 }, { id: 'molhin', level: 21 }, { id: 'molhin', level: 22 }],
    },
    {
      name: 'Le lit de la Glaise Mère',
      layout: [
        '###############',
        '#~~.........~~#',
        '#~...........~#',
        '#.....~~~.....#',
        '#.............#',
        '#..#...M...#..#',
        '#.............#',
        '#.............#',
        '#.~~.......~~.#',
        '#.............#',
        '#..#.......#..#',
        '#......Z......#',
        '#~...........~#',
        '#~~.........~~#',
        '###############',
      ],
      monsters: [{ id: 'glaise_mere', level: 24 }, { id: 'thelk', level: 23 }],
      boss: true,
    },
  ],
  rewards: { fils: 170, items: [{ id: 'motte_de_glaise_mere', rate: 100 }, { id: 'tesson_cuit', rate: 50 }] },
});

DATA.content.dungeons.push({
  id: 'mine_des_tholous', name: 'La Mine des Tholous', zone: 'kaldum_vapeurs', level: [24, 28],
  entryMap: 'kaldum_vapeurs_bouche',
  keyItem: null,
  description: "Une vieille mine abandonnée près de la Bouche des Vapeurs, devenue le dortoir le plus tiède de Kaldum. Les Tholous y ronronnent en tas, et le Grand Tholou ne quitte jamais son Molh.",
  rooms: [
    {
      name: 'La galerie des étais',
      layout: [
        '###############',
        '#.....#.#.....#',
        '#..T..#.#..T..#',
        '#.............#',
        '#......M......#',
        '#.............#',
        '#..L.......L..#',
        '#....T...T....#',
        '#.............#',
        '#..L.......L..#',
        '#.............#',
        '#......Z......#',
        '#..T..#.#..T..#',
        '#.....#.#.....#',
        '###############',
      ],
      monsters: [{ id: 'tholi', level: 20 }, { id: 'tholi', level: 20 }, { id: 'tholou', level: 24 }, { id: 'tholou', level: 25 }],
    },
    {
      name: 'Le dortoir',
      layout: [
        '###############',
        '#.............#',
        '#..##.....##..#',
        '#..#...M...#..#',
        '#.............#',
        '#.............#',
        '#..L...#...L..#',
        '#......#......#',
        '#..L...#...L..#',
        '#.............#',
        '#.............#',
        '#..#.......#..#',
        '#..##..Z..##..#',
        '#.............#',
        '###############',
      ],
      monsters: [{ id: 'tholou', level: 25 }, { id: 'tholou', level: 26 }, { id: 'molh', level: 26 }, { id: 'molh', level: 27 }],
    },
    {
      name: 'Le nid du Grand Tholou',
      layout: [
        '###############',
        '#.............#',
        '#..L.......L..#',
        '#...##...##...#',
        '#......M......#',
        '#.............#',
        '#..###...###..#',
        '#.............#',
        '#.............#',
        '#...T.....T...#',
        '#.............#',
        '#......Z......#',
        '#..L.......L..#',
        '#.............#',
        '###############',
      ],
      monsters: [{ id: 'grand_tholou', level: 28 }, { id: 'molh', level: 27 }, { id: 'tholou', level: 26 }],
      boss: true,
    },
  ],
  rewards: { fils: 200, items: [{ id: 'pelage_du_grand_tholou', rate: 100 }, { id: 'moustache_du_grand_tholou', rate: 50 }] },
});

DATA.content.dungeons.push({
  id: 'cuve_des_cendrous', name: 'La Cuve des Cendrous', zone: 'kaldum_vapeurs', level: [26, 30],
  entryMap: 'kaldum_vapeurs_cuve',
  keyItem: null,
  description: "Sous la Cuve, un puits de lave où les Cendrous portent les braises volées à la Fonderie. Au fond, Kraska, la Mère-Braise, les rallume une à une.",
  rooms: [
    {
      name: 'La margelle',
      layout: [
        '###############',
        '#~~~.......~~~#',
        '#~...........~#',
        '#~....M......~#',
        '#.............#',
        '#...o.....o...#',
        '#.............#',
        '#......L......#',
        '#.............#',
        '#...o.....o...#',
        '#.............#',
        '#~.....Z.....~#',
        '#~...........~#',
        '#~~~.......~~~#',
        '###############',
      ],
      monsters: [{ id: 'cendrou', level: 27 }, { id: 'cendrou', level: 28 }, { id: 'cendril', level: 27 }, { id: 'cendril', level: 27 }],
    },
    {
      name: 'Les fumées',
      layout: [
        '###############',
        '#~~.........~~#',
        '#~...........~#',
        '#...T.....T...#',
        '#......M......#',
        '#.............#',
        '#..T...~...T..#',
        '#.....~~~.....#',
        '#..T...~...T..#',
        '#.............#',
        '#.............#',
        '#...T..Z..T...#',
        '#~...........~#',
        '#~~.........~~#',
        '###############',
      ],
      monsters: [{ id: 'cendrou', level: 28 }, { id: 'fumerolle', level: 28 }, { id: 'fumerolle', level: 29 }, { id: 'pioche_vive', level: 29 }],
    },
    {
      name: 'Le fond de la Cuve',
      layout: [
        '###############',
        '#~~~~~...~~~~~#',
        '#~~.........~~#',
        '#~...........~#',
        '#......M......#',
        '#.............#',
        '#..~.......~..#',
        '#..~...L...~..#',
        '#..~.......~..#',
        '#.............#',
        '#.............#',
        '#~.....Z.....~#',
        '#~~.........~~#',
        '#~~~~~...~~~~~#',
        '###############',
      ],
      monsters: [{ id: 'kraska', level: 30 }, { id: 'cendrou', level: 29 }],
      boss: true,
    },
  ],
  rewards: { fils: 230, items: [{ id: 'robe_de_kraska', rate: 100 }, { id: 'coeur_de_kraska', rate: 50 }] },
});
