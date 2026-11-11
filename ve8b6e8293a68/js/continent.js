const Continent = (() => {
  const X0 = -4, Y0 = -3, LX = 108, LY = 86;

  const PAYS = [
    { id: 'voile', nom: 'Le Nid d\'Ithren', centre: [50, 6], poids: 1.05, alt: 0.3, niveaux: [160, 200], anneau: 5, livraison: 'ext2', dragon: 'Ithren',
      sol: ['#b4b0c0', '#8a8498', '#4a4256'], lanterne: '#e8f0ff', biome: 'le cœur de la Brûlure, blanc froid sous le trou sans étoiles',
      ville: 'aucun Relais dedans', entree: 'au-delà des Cendrées, à pied', desc: 'Là où Ithren a disparu, sous le trou sans étoiles. La saga de fin.' },
    { id: 'heure', nom: 'L\'Heure Tenue', centre: [30, 16], poids: 0.82, alt: 0.4, niveaux: [159, 180], anneau: 5, livraison: 'ext2', dragon: 'Nohra',
      sol: ['#c4b2dc', '#a993cf', '#e8915a'], lanterne: '#ff8a3d', biome: 'un crépuscule figé, des flammes arrêtées',
      ville: 'un Relais à l\'entrée, à pied dedans', entree: 'un rideau de lumière entre la Lisière et les Cendrées', desc: 'Sous l\'aile de Nohra, l\'heure de la Colère tient encore.' },
    { id: 'basvoiles', nom: 'Les Cendrées', centre: [57, 18], poids: 1.0, alt: 0.35, niveaux: [100, 160], anneau: 4, livraison: 'ext2', dragon: 'Ithren',
      sol: ['#d0c9d2', '#ada3b5', '#86629a'], lanterne: '#c0266e', biome: 'la cendre claire sur les villes d\'avant la Colère, le pourpre en accent',
      ville: 'les puits des Descendeurs', entree: 'la descente depuis Kessane', desc: 'Sous la cendre, au-delà de la Lisière. Donjons, Brûlés, noir et pourpre.' },
    { id: 'vetrane', nom: 'Vetrane', centre: [27, 31], poids: 0.95, alt: 1.0, niveaux: [123, 144], anneau: 4, livraison: 'ext2', dragon: 'Aïven',
      sol: ['#f4f7fc', '#dbe2ee', '#7f8cab'], lanterne: '#6fe0ff', biome: 'la neige et le granite bleu des hauts plateaux, le vent',
      ville: 'le Col des Plumes, l\'Observatoire', entree: 'le Col des Plumes, depuis la Lisière', desc: 'Le terrain de chasse d\'Aïven, au-dessus des Cimes : la neige vient de l\'altitude.' },
    { id: 'lisiere', nom: 'La Lisière', centre: [53, 31], poids: 1.0, alt: 0.5, niveaux: [80, 120], anneau: 3, livraison: 'ext1', dragon: 'Ithren',
      sol: ['#a39dac', '#7d7389', '#c9c0c2'], lanterne: '#d08cff', biome: 'l\'ardoise fendue, la roche vitrifiée, les chardons',
      ville: 'Kessane, les Fanaux', entree: 'l\'escarpement nord, par la route du nord depuis la Fosse', desc: 'Le bord de la Brûlure, la cicatrice de la Colère. Contestée, PvP ouvert.' },
    { id: 'drevala', nom: 'Drevala', centre: [15, 47], poids: 1.0, alt: 0.45, niveaux: [95, 116], anneau: 4, livraison: 'ext2', dragon: 'Durren',
      sol: ['#5f8e55', '#41693f', '#8bb46c'], lanterne: '#6ff2a6', biome: 'la jungle de mousse, les fougères géantes, les sources chaudes vertes',
      ville: 'le Seuil Vert', entree: 'par l\'amont du delta, depuis Lhorva ; l\'ascenseur de lianes des Toiles, après l\'arc', desc: 'Le flanc de Durren boit l\'humidité de l\'ouest : une jungle de mousse sous la falaise des Toiles.' },
    { id: 'orsane', nom: 'Les Cimes', centre: [42, 46], poids: 1.15, alt: 0.82, niveaux: [19, 40], anneau: 1, livraison: 'base', dragon: 'Durren',
      sol: ['#a8c97c', '#86b062', '#e4ddcb'], lanterne: '#f2b134', biome: 'des prés frais et des pins sur le calcaire blanc',
      ville: 'la Cité des Cimes, capitale d\'Orsane', entree: 'la Nacelle depuis Ervane ; les deux portes à escaliers de la Cité', desc: 'Le dos de Durren. La Cité des Cimes, capitale d\'Orsane et siège de l\'Aube, et son pays : les Clairières, les Sentiers, les Toiles, les Éboulis.' },
    { id: 'kaldum', nom: 'Kaldum', centre: [66, 47], poids: 0.95, alt: 0.6, niveaux: [39, 60], anneau: 2, livraison: 'base', dragon: 'Iskar',
      sol: ['#7e6d60', '#5f5047', '#b2583c'], lanterne: '#ff6a2b', biome: 'le basalte, le cuivre et la braise ; le travertin à l\'eau turquoise',
      ville: 'Kaldum, la ville des forges, au carrefour', entree: 'la Passe, un col, à pied', desc: 'Mines, forges, roche chaude, terre des Kaldrins. Sa ville est au carrefour : la Passe, le funiculaire de Thessa, la porte de fer d\'Ostrum.' },
    { id: 'ostrum', nom: 'Ostrum', centre: [83, 40], poids: 1.1, alt: 0.3, niveaux: [139, 160], anneau: 4, livraison: 'ext2', dragon: 'Iskar',
      sol: ['#e9c58b', '#d8a86a', '#b5664a'], lanterne: '#ffe45c', biome: 'les dunes ocre, le grès rouge en voiles, les oasis turquoise ; le soleil',
      ville: 'la Porte des Sables, l\'Oasis de Sel', entree: 'la caravane de Thessa, puis la porte de fer de la Fonderie', desc: 'Les ailes d\'Iskar ont arrêté le feu de la Colère et séché le pays : le désert, derrière les Cimes.' },
    { id: 'elvea', nom: 'Elvéa', centre: [94, 49], poids: 0.62, alt: 0.55, niveaux: [183, 200], anneau: 5, livraison: 'ext2', dragon: 'Ruhani',
      sol: ['#f2d8cc', '#e5bf8b', '#c99a8e'], lanterne: '#f4a7bf', biome: 'les falaises de nacre rose à l\'aube, les prés dorés',
      ville: 'les Marches de l\'Est', entree: 'au bout de la piste d\'Ostrum ; le bateau de Thessa ensuite', desc: 'Le cap de l\'Aube, au bout du continent : là où se lève le souffle de Ruhani.' },
    { id: 'lhorva', nom: 'Lhorva', centre: [33, 63], poids: 1.0, alt: 0.12, niveaux: [67, 92], anneau: 3, livraison: 'ext1', dragon: 'Morrha',
      sol: ['#d3c98f', '#9faf75', '#7fb4a2'], lanterne: '#f2a65a', biome: 'le delta clair, les roseaux d\'or, les pilotis ; la brume',
      ville: 'les Pilotis', entree: 'le bac des Francs-Marcheurs, depuis Thessa', desc: 'Les rivières des Cimes et de Kaldum s\'y perdent en mille chenaux.' },
    { id: 'thessa', nom: 'Thessa', centre: [61, 64], poids: 0.95, alt: 0.25, niveaux: [60, 100], anneau: 3, livraison: 'ext1', dragon: 'Morrha',
      sol: ['#b6c8ae', '#8fa99a', '#d9d1b6'], lanterne: '#35d6c8', biome: 'les galets, le cuivre vert-de-gris, les salines, le port',
      ville: 'Thessa, le port et la Lice', entree: 'la falaise de Kaldum, par le funiculaire', desc: 'Côte, ports, marchés. Les Francs-Marcheurs y règnent : la ville où l\'on échange et où l\'on s\'affronte.' },
    { id: 'ulvane', nom: 'Ulvane', centre: [55, 74], poids: 0.82, alt: 0.05, niveaux: [109, 132], anneau: 4, livraison: 'ext2', dragon: 'Morrha',
      sol: ['#e4d7bc', '#cbbb9b', '#87a8a9'], lanterne: '#ff8270', biome: 'un fond marin à l\'air libre, le varech, le corail, les murs d\'eau',
      ville: 'la Grève Haute', entree: 'la côte du sud, quand la mer recule', desc: 'Le sillage de Morrha : la mer s\'est retirée et le fond est à l\'air.' },
  ];
  const ERVANE = { id: 'ervane', nom: 'Ervane', centre: [37.5, 36.5], rayon: 3.6, nuages: 6.8, niveaux: [1, 20], anneau: 0, livraison: 'base', dragon: 'Durren',
    sol: ['#b4d488', '#e8e3cf', '#f2c14e'], lanterne: '#f2c14e', biome: 'la prairie du sommet, les quatre sources, le bois cousu ; le fil d\'or du Métier',
    ville: 'les Mailles, le Relais de l\'Amarre', entree: 'la mer de nuages ; la Nacelle, dans les deux sens', desc: 'L\'île de l\'Éveil : le plus haut sommet des Cimes, au-dessus de la mer de nuages. Son fil d\'or se voit de tout le continent.' };

  const COTE = [[X0, Y0], [96, Y0], [95, 9], [91, 21], [94, 30], [98.5, 40], [101, 48], [99, 55], [93, 59], [86, 61], [80, 64.5], [74, 69],
    [70, 75], [64, 79], [55, 80.5], [47, 78.5], [43.5, 73.5], [38, 71.5], [30, 72], [23, 70.5], [15.5, 66.5], [9.5, 60], [5, 52], [2, 42], [X0, 34]];
  const RIVIERES = [
    [[43.5, 48.5], [41, 52], [38.5, 56], [35.5, 59.5], [32.5, 62.5], [29.5, 66], [26.5, 70]],
    [[64.5, 52], [60, 55.5], [55, 58.5], [49, 60.5], [43, 62], [38, 62.5], [33.5, 63]],
    [[32.5, 62.5], [35, 66], [37, 70.5]],
  ];
  const ANCRES = {
    orsane_cimes: [42.5, 42.5], orsane_clairieres: [41.5, 48.5], orsane_sentiers: [47, 42.5], orsane_toiles: [36.5, 46], orsane_eboulis: [50, 49],
    kaldum_ville: [66, 46.5], kaldum_galeries: [62.5, 48.5], kaldum_vapeurs: [66, 51.5], kaldum_fonderie: [70.5, 46],
  };
  const LIEUX = [
    { id: 'cite', nom: 'la Cité des Cimes', at: [42.5, 42.5], sorte: 'capitale', pays: 'orsane' },
    { id: 'kaldum_ville', nom: 'Kaldum', at: [66, 46.5], sorte: 'ville', pays: 'kaldum' },
    { id: 'thessa_ville', nom: 'Thessa', at: [60.5, 68.5], sorte: 'ville', pays: 'thessa' },
    { id: 'kessane', nom: 'Kessane', at: [56.5, 27.2], sorte: 'ville', pays: 'lisiere' },
    { id: 'fosse', nom: 'la Fosse', at: [50.5, 42.5], sorte: 'camp', pays: 'orsane', avenir: true },
    { id: 'passe', nom: 'la Passe', at: [56.5, 48.3], sorte: 'passage', pays: null },
    { id: 'funiculaire', nom: 'le funiculaire', at: [64.5, 56.5], sorte: 'passage', pays: 'kaldum', avenir: true },
    { id: 'porte_fer', nom: 'la porte de fer', at: [73.5, 44.5], sorte: 'passage', pays: 'kaldum', avenir: true },
    { id: 'col_plumes', nom: 'le Col des Plumes', at: [45.5, 29.8], sorte: 'passage', pays: null, avenir: true },
    { id: 'combe', nom: 'la Combe de la Venue', at: [40.5, 53.5], sorte: 'combe', pays: 'orsane', avenir: true },
  ];
  const ROUTES = [
    { id: 'nacelle', nom: 'la Nacelle', sorte: 'cable', ouvert: true, pts: [[37.5, 36.5], [42.5, 42.5]] },
    { id: 'passe', nom: 'la Passe', sorte: 'pied', ouvert: true, pts: [[42.5, 42.5], [46, 46.5], [50, 49], [54, 48.6], [56.5, 48.3], [62, 47.6], [66, 46.5]] },
    { id: 'fonderie', nom: 'vers la porte de fer', sorte: 'pied', ouvert: true, pts: [[66, 46.5], [70.5, 46], [73.5, 44.5]] },
    { id: 'vapeurs', nom: 'vers le funiculaire', sorte: 'pied', ouvert: true, pts: [[66, 46.5], [66, 51.5], [64.5, 56.5]] },
    { id: 'nord', nom: 'la route du nord', sorte: 'pied', pts: [[50, 49], [50.5, 42.5], [52.5, 35.5], [56.5, 27.2]] },
    { id: 'col', nom: 'le Col des Plumes', sorte: 'pied', pts: [[56.5, 27.2], [50, 29], [45.5, 29.8], [36, 29.5], [27, 31]] },
    { id: 'descente', nom: 'la descente des Descendeurs', sorte: 'pied', pts: [[56.5, 27.2], [55.5, 23], [57, 18]] },
    { id: 'nid', nom: 'vers le Nid', sorte: 'pied', pts: [[57, 18], [53.5, 11.5], [50, 6]] },
    { id: 'rideau', nom: 'le rideau de lumière', sorte: 'rideau', pts: [[46, 25], [38, 20], [30, 16]] },
    { id: 'funiculaire', nom: 'le funiculaire', sorte: 'cable', pts: [[64.5, 56.5], [60.5, 68.5]] },
    { id: 'porte_fer', nom: 'la porte de fer', sorte: 'pied', pts: [[73.5, 44.5], [78.5, 41.5], [83, 40]] },
    { id: 'piste', nom: 'la piste de l\'est', sorte: 'pied', pts: [[83, 40], [88.5, 44.5], [94, 49]] },
    { id: 'caravane', nom: 'la caravane', sorte: 'caravane', pts: [[60.5, 68.5], [70, 60.5], [77, 52], [83, 40]] },
    { id: 'bac', nom: 'le bac', sorte: 'bac', pts: [[60.5, 68.5], [52, 67.5], [44, 66.5], [37, 64.5], [33, 63]] },
    { id: 'delta', nom: 'l\'amont du delta', sorte: 'pied', pts: [[33, 63], [27.5, 57.5], [21.5, 52], [15, 47]] },
    { id: 'cote_sud', nom: 'la côte du sud', sorte: 'pied', pts: [[60.5, 68.5], [58.5, 70], [55, 74]] },
    { id: 'bateau', nom: 'le bateau de Thessa', sorte: 'bac', pts: [[63, 67.5], [74, 71.5], [87, 63.5], [96.5, 53.5]] },
    { id: 'lianes', nom: 'l\'ascenseur de lianes', sorte: 'lianes', pts: [[36.5, 46], [26, 46.5], [15, 47]] },
    { id: 'observatoire', nom: 'la nacelle de l\'Observatoire', sorte: 'cable', pts: [[27, 31], [42.5, 42.5]] },
  ];

  const h2 = (x, y, s) => { let h = (Math.imul(x, 374761393) + Math.imul(y, 668265263) + Math.imul(s, 974634211)) | 0; h = Math.imul(h ^ (h >>> 13), 1274126177); return ((h ^ (h >>> 16)) >>> 0) / 4294967296; };
  const vnoise = (x, y, s) => { const xi = Math.floor(x), yi = Math.floor(y), fx = x - xi, fy = y - yi, u = fx * fx * (3 - 2 * fx), v = fy * fy * (3 - 2 * fy); const a = h2(xi, yi, s), b = h2(xi + 1, yi, s), c = h2(xi, yi + 1, s), d = h2(xi + 1, yi + 1, s); return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v; };
  const fbm = (x, y, s, o) => { let v = 0, a = 0.5, f = 1, n = 0; for (let k = 0; k < (o || 4); k++) { v += a * vnoise(x * f, y * f, s + k * 31); n += a; a *= 0.5; f *= 2; } return v / n; };
  const lisse = (a, b, t) => { const x = Math.max(0, Math.min(1, (t - a) / (b - a))); return x * x * (3 - 2 * x); };

  const SEG = COTE.map((a, i) => [a, COTE[(i + 1) % COTE.length]]);
  function cote(x, y) {
    let d = Infinity, dedans = false;
    for (const [a, b] of SEG) {
      const dx = b[0] - a[0], dy = b[1] - a[1], L2 = dx * dx + dy * dy, t = Math.max(0, Math.min(1, ((x - a[0]) * dx + (y - a[1]) * dy) / L2));
      d = Math.min(d, Math.hypot(x - a[0] - dx * t, y - a[1] - dy * t));
      if ((a[1] > y) !== (b[1] > y) && x < (b[0] - a[0]) * (y - a[1]) / (b[1] - a[1]) + a[0]) dedans = !dedans;
    }
    return (dedans ? d : -d) + (fbm(x * 0.16, y * 0.16, 7, 4) - 0.5) * 5 + (vnoise(x * 0.9, y * 0.9, 9) - 0.5) * 0.7;
  }
  function cellule(x, y) {
    const wx = x + (fbm(x * 0.085, y * 0.085, 11, 3) - 0.5) * 9, wy = y + (fbm(x * 0.085, y * 0.085, 23, 3) - 0.5) * 9;
    let i1 = -1, d1 = Infinity, d2 = Infinity;
    for (let i = 0; i < PAYS.length; i++) {
      const p = PAYS[i], d = Math.hypot(wx - p.centre[0], wy - p.centre[1]) / p.poids;
      if (d < d1) { d2 = d1; d1 = d; i1 = i; } else if (d < d2) d2 = d;
    }
    return { i: i1, d1, d2 };
  }
  function hauteur(x, y, sd) {
    let s = 0, w = 0;
    for (const p of PAYS) { const d2 = (x - p.centre[0]) ** 2 + (y - p.centre[1]) ** 2, k = Math.exp(-d2 / (2 * 9.5 * 9.5)) + 1e-6; s += p.alt * k; w += k; }
    const base = s / w, doux = fbm(x * 0.11, y * 0.11, 3, 3), arete = 1 - Math.abs(2 * fbm(x * 0.2, y * 0.2, 19, 3) - 1);
    return Math.max(0, (base * 0.7 + (doux - 0.5) * 0.3 + arete * arete * base * base * 0.32) * lisse(-0.5, 7, sd));
  }

  function paysEn(x, y) {
    if (Math.hypot(x - ERVANE.centre[0], y - ERVANE.centre[1]) < ERVANE.rayon + 0.6) return 'ervane';
    if (cote(x, y) < 0) return null;
    return PAYS[cellule(x, y).i].id;
  }

  function pays() {
    const zones = (typeof DATA === 'object' && DATA.content && DATA.content.zones) || [];
    const avecErvane = typeof DATA === 'object' && DATA.regions && DATA.regions.ervane;
    const liste = (avecErvane ? [ERVANE] : []).concat(PAYS);
    return liste.map(p => {
      const zs = zones.filter(z => z.region === p.id);
      const open = zs.length > 0;
      const niveaux = open ? [Math.min(...zs.map(z => z.level[0])), Math.max(...zs.map(z => z.level[1]))] : p.niveaux;
      return Object.assign({}, p, { open, niveaux, zones: zs });
    });
  }
  const parId = id => (id === 'ervane' ? ERVANE : PAYS.find(p => p.id === id)) || null;

  const ETIQUETTES = { kaldum: [69.5, 52.5], thessa: [65.5, 63.5], lisiere: [51, 33.5] };
  let centres = null;
  function centresPays() {
    if (centres) return centres;
    const acc = new Map(PAYS.map(p => [p.id, [0, 0, 0]]));
    for (let y = 0; y <= 80; y += 1) for (let x = 0; x <= 100; x += 1) {
      if (cote(x, y) < 1.2) continue;
      if (Math.hypot(x - ERVANE.centre[0], y - ERVANE.centre[1]) < ERVANE.nuages) continue;
      const c = acc.get(PAYS[cellule(x, y).i].id); c[0] += x; c[1] += y; c[2]++;
    }
    centres = {};
    for (const [id, c] of acc) centres[id] = ETIQUETTES[id] ? ETIQUETTES[id].slice() : c[2] ? [c[0] / c[2], c[1] / c[2]] : parId(id).centre.slice();
    centres.ervane = ERVANE.centre.slice();
    return centres;
  }
  function ancre(zone) {
    if (!zone) return null;
    if (ANCRES[zone.id]) return ANCRES[zone.id].slice();
    if (zone.region === 'ervane') return ERVANE.centre.slice();
    const c = centresPays()[zone.region];
    return c ? c.slice() : null;
  }

  const rgb = h => { const n = parseInt(String(h).slice(1), 16); return [n >> 16, (n >> 8) & 255, n & 255]; };
  const SOLS = PAYS.map(p => p.sol.map(rgb));
  const VOILE = rgb('#d6d2e2');
  function peindre(px, ouverts) {
    const Wp = Math.round(LX * px), Hp = Math.round(LY * px);
    const cv = document.createElement('canvas'); cv.width = Wp; cv.height = Hp;
    const g = cv.getContext('2d'), img = g.createImageData(Wp, Hp), D = img.data;
    const index = new Uint8Array(Wp * Hp), haut = new Float32Array(Wp * Hp), sdA = new Float32Array(Wp * Hp), bord = new Float32Array(Wp * Hp);
    const ouv = new Set(ouverts || []);
    for (let j = 0; j < Hp; j++) for (let i = 0; i < Wp; i++) {
      const x = X0 + (i + 0.5) / px, y = Y0 + (j + 0.5) / px, t = j * Wp + i;
      const sd = cote(x, y);
      sdA[t] = sd;
      if (sd < 0) { index[t] = 255; continue; }
      const c = cellule(x, y);
      index[t] = c.i; bord[t] = c.d2 - c.d1;
      haut[t] = hauteur(x, y, sd);
    }
    const lum = [0.62, -0.78];
    for (let j = 0; j < Hp; j++) for (let i = 0; i < Wp; i++) {
      const t = j * Wp + i, o = t * 4, x = X0 + (i + 0.5) / px, y = Y0 + (j + 0.5) / px;
      if (index[t] === 255) {
        const sd = sdA[t], pres = lisse(-3.2, 0, sd), houle = Math.sin(x * 1.6 + Math.sin(y * 0.7) * 2.2 + y * 0.35) * 0.5 + 0.5;
        const c0 = [60, 104, 150], c1 = [116, 186, 196];
        for (let k = 0; k < 3; k++) D[o + k] = c0[k] + (c1[k] - c0[k]) * pres + houle * 10 * (1 - pres) - (fbm(x * 0.2, y * 0.2, 5, 3) - 0.5) * 18;
        if (sd > -0.35) { D[o] = 238; D[o + 1] = 232; D[o + 2] = 214; }
        D[o + 3] = 255;
        continue;
      }
      const p = PAYS[index[t]], S = SOLS[index[t]], h = haut[t];
      const hx = haut[j * Wp + Math.min(Wp - 1, i + 1)] - haut[j * Wp + Math.max(0, i - 1)], hy = haut[Math.min(Hp - 1, j + 1) * Wp + i] - haut[Math.max(0, j - 1) * Wp + i];
      const pente = Math.hypot(hx, hy) * px, ombre = Math.max(0.6, Math.min(1.22, 1 + (hx * lum[0] + hy * lum[1]) * px * 3.2));
      const n1 = fbm(x * 0.32, y * 0.32, 13, 3), n2 = vnoise(x * 1.25, y * 1.25, 17);
      let r = S[0][0] + (S[1][0] - S[0][0]) * n1, gg = S[0][1] + (S[1][1] - S[0][1]) * n1, b = S[0][2] + (S[1][2] - S[0][2]) * n1;
      const roc = p.id === 'vetrane' ? lisse(0.05, 0.16, pente + (n2 - 0.5) * 0.05) : lisse(0.55, 0.95, h + (n2 - 0.5) * 0.12);
      r += (S[2][0] - r) * roc; gg += (S[2][1] - gg) * roc; b += (S[2][2] - b) * roc;
      const id = p.id, touche = (c, k) => { r += (c[0] - r) * k; gg += (c[1] - gg) * k; b += (c[2] - b) * k; };
      if (id === 'kaldum' && n2 > 0.88) touche([255, 120, 50], 0.7);
      else if (id === 'ostrum') { const dune = Math.pow(Math.sin((x * 0.8 + y * 0.45) * 1.6 + n1 * 7) * 0.5 + 0.5, 3); r -= dune * 46; gg -= dune * 52; b -= dune * 40; }
      else if (id === 'lhorva' && fbm(x * 0.7, y * 0.7, 29, 3) > 0.6) touche([120, 178, 168], 0.75);
      else if (id === 'drevala' && n2 > 0.86) touche([132, 230, 160], 0.5);
      else if (id === 'ulvane' && n2 > 0.9) touche([240, 150, 140], 0.55);
      else if (id === 'basvoiles' && fbm(x * 0.9, y * 0.9, 31, 3) > 0.67) touche([150, 70, 140], 0.6);
      else if (id === 'lisiere' && Math.abs(fbm(x * 0.6, y * 0.6, 37, 3) - 0.5) < 0.018) touche([200, 150, 240], 0.7);
      else if (id === 'heure' && n2 > 0.9) touche([255, 150, 80], 0.6);
      else if (id === 'orsane' && n2 > 0.84 && roc < 0.5) touche([74, 120, 70], 0.6);
      else if (id === 'voile') { const dn = Math.hypot(x - p.centre[0], y - p.centre[1]), k = lisse(9, 1.5, dn); r -= k * 120; gg -= k * 130; b -= k * 90; }
      r *= ombre; gg *= ombre; b *= ombre;
      if (!ouv.has(id)) { const k = 0.34, m = (r + gg + b) / 3; r += (m - r) * 0.25; gg += (m - gg) * 0.25; b += (m - b) * 0.25; r += (VOILE[0] - r) * k; gg += (VOILE[1] - gg) * k; b += (VOILE[2] - b) * k; }
      const fr = lisse(0, 0.55, bord[t]);
      const k2 = (1 - fr) * 0.5;
      r *= 1 - k2; gg *= 1 - k2; b *= 1 - k2 * 0.8;
      const sd = sdA[t];
      if (sd < 0.45) { const k = (0.45 - sd) / 0.45 * 0.35; r *= 1 - k; gg *= 1 - k; b *= 1 - k; }
      D[o] = r; D[o + 1] = gg; D[o + 2] = b; D[o + 3] = 255;
    }
    g.putImageData(img, 0, 0);
    const P = (x, y) => [(x - X0) * px, (y - Y0) * px];
    g.lineCap = 'round'; g.lineJoin = 'round';
    for (const riv of RIVIERES) {
      const pts = [];
      for (let k = 0; k + 1 < riv.length; k++) {
        const [a, b] = [riv[k], riv[k + 1]], L = Math.hypot(b[0] - a[0], b[1] - a[1]), nx = -(b[1] - a[1]) / L, ny = (b[0] - a[0]) / L;
        for (let q = 0; q < 8; q++) { const t = q / 8, f = Math.sin(t * Math.PI * 2 + k * 1.7) * 0.55 * Math.sin(t * Math.PI); pts.push([a[0] + (b[0] - a[0]) * t + nx * f, a[1] + (b[1] - a[1]) * t + ny * f]); }
      }
      pts.push(riv[riv.length - 1]);
      for (const [w, c] of [[0.85, 'rgba(236,232,214,0.75)'], [0.45, 'rgba(84,152,186,0.95)']]) {
        g.strokeStyle = c; g.lineWidth = w * px * 0.55; g.beginPath();
        pts.forEach(([x, y], k) => { const [X, Y] = P(x, y); k ? g.lineTo(X, Y) : g.moveTo(X, Y); });
        g.stroke();
      }
    }
    { const [X, Y] = P(50, 5.5), R = 7 * px, gr = g.createRadialGradient(X, Y, 0, X, Y, R);
      gr.addColorStop(0, 'rgba(20,10,34,0.95)'); gr.addColorStop(0.35, 'rgba(80,40,130,0.6)'); gr.addColorStop(0.7, 'rgba(171,124,242,0.22)'); gr.addColorStop(1, 'rgba(171,124,242,0)');
      g.fillStyle = gr; g.beginPath(); g.arc(X, Y, R, 0, Math.PI * 2); g.fill(); }
    { const E = ERVANE, [X, Y] = P(E.centre[0], E.centre[1]);
      for (let k = 0; k < 26; k++) {
        const a = k / 26 * Math.PI * 2 + h2(k, 1, 3) * 0.5, rr = (E.rayon + 0.6 + h2(k, 2, 3) * (E.nuages - E.rayon - 0.6)) * px, R = (1.3 + h2(k, 3, 3) * 1.6) * px;
        const cx = X + Math.cos(a) * rr, cy = Y + Math.sin(a) * rr * 0.86, gr = g.createRadialGradient(cx, cy, 0, cx, cy, R);
        gr.addColorStop(0, 'rgba(255,255,255,0.92)'); gr.addColorStop(0.6, 'rgba(246,244,252,0.7)'); gr.addColorStop(1, 'rgba(246,244,252,0)');
        g.fillStyle = gr; g.beginPath(); g.arc(cx, cy, R, 0, Math.PI * 2); g.fill();
      }
      const gr = g.createRadialGradient(X, Y, 0, X, Y, E.nuages * px);
      gr.addColorStop(0, 'rgba(255,255,255,0.75)'); gr.addColorStop(0.72, 'rgba(250,248,255,0.55)'); gr.addColorStop(1, 'rgba(250,248,255,0)');
      g.fillStyle = gr; g.beginPath(); g.arc(X, Y, E.nuages * px, 0, Math.PI * 2); g.fill();
      const R = E.rayon * px, forme = (dx, dy) => { g.beginPath(); for (let k = 0; k <= 24; k++) { const a = k / 24 * Math.PI * 2, f = 0.86 + h2(k % 24, 5, 7) * 0.22; g.lineTo(X + dx + Math.cos(a) * R * f, Y + dy + Math.sin(a) * R * f * 0.8); } g.closePath(); };
      g.fillStyle = 'rgba(80,80,120,0.22)'; forme(px * 0.7, px * 1.0); g.fill();
      forme(0, 0); const gp = g.createLinearGradient(X - R, Y - R, X + R, Y + R); gp.addColorStop(0, '#c9e19c'); gp.addColorStop(0.55, '#a4c87a'); gp.addColorStop(1, '#7f9f64');
      g.fillStyle = gp; g.fill(); g.strokeStyle = '#e9e3cf'; g.lineWidth = px * 0.35; g.stroke();
      g.strokeStyle = 'rgba(52,64,90,0.6)'; g.lineWidth = px * 0.12; g.stroke();
      const fx = X - R * 0.15, fy = Y - R * 0.1, gf = g.createLinearGradient(fx, fy, fx, fy - R * 2.2);
      gf.addColorStop(0, 'rgba(255,214,110,0.95)'); gf.addColorStop(1, 'rgba(255,214,110,0)');
      g.strokeStyle = gf; g.lineWidth = px * 0.3; g.beginPath(); g.moveTo(fx, fy); g.lineTo(fx + R * 0.1, fy - R * 2.2); g.stroke();
      for (let j = Math.max(0, Math.floor(Y - R)); j < Math.min(Hp, Math.ceil(Y + R)); j++) for (let i = Math.max(0, Math.floor(X - R)); i < Math.min(Wp, Math.ceil(X + R)); i++) {
        if (Math.hypot((i - X) / R, (j - Y) / (R * 0.8)) < 1) index[j * Wp + i] = 254;
      }
    }
    return { canvas: cv, index, largeur: Wp, hauteur: Hp, px, x0: X0, y0: Y0 };
  }
  function contour(peinture, id, couleur) {
    const { largeur: W, hauteur: H, index } = peinture, k = id === 'ervane' ? 254 : PAYS.findIndex(p => p.id === id);
    const cv = document.createElement('canvas'); cv.width = W; cv.height = H;
    if (k < 0) return cv;
    const g = cv.getContext('2d'), img = g.createImageData(W, H), D = img.data, [r, gg, b] = rgb(couleur || '#ffe08a');
    const e = Math.max(1, Math.round(peinture.px * 0.28));
    for (let j = e; j < H - e; j++) for (let i = e; i < W - e; i++) {
      const t = j * W + i;
      if (index[t] !== k) continue;
      const lim = index[t - e] !== k || index[t + e] !== k || index[t - e * W] !== k || index[t + e * W] !== k;
      const o = t * 4;
      if (lim) { D[o] = r; D[o + 1] = gg; D[o + 2] = b; D[o + 3] = 255; } else { D[o] = r; D[o + 1] = gg; D[o + 2] = b; D[o + 3] = 34; }
    }
    g.putImageData(img, 0, 0);
    return cv;
  }

  return { PAYS, ERVANE, COTE, RIVIERES, ANCRES, LIEUX, ROUTES, X0, Y0, LX, LY, cote, cellule, paysEn, pays, parId, centresPays, ancre, peindre, contour };
})();
