// Grille isométrique : carte, conversions écran/case, distances, ligne de vue, zones, chemins.
// Les coordonnées de case sont (x, y) ; les déplacements se font en 4 directions, comme dans
// les jeux tactiques classiques. La distance est la distance de Manhattan.
const Grid = (() => {
  const TILE_W = 64;
  const TILE_H = 32;
  const FLOOR = 0;
  const ROCK = 1;   // bloque le déplacement et la ligne de vue
  const HOLE = 2;   // bloque le déplacement seulement
  const WATER = 3;  // bloque le déplacement seulement (eau, lave)
  const TREE = 4;   // bloque le déplacement et la ligne de vue (arbre, pilier)

  // Légende des cartes (docs/SPEC-CONTENU.md). Tout ce qui n'est pas listé est du sol.
  const KIND = { '#': ROCK, 'T': TREE, '~': WATER, 'o': HOLE };
  const SPOTS = { P: 'npcs', G: 'nodes', M: 'groups', D: 'door', Z: 'relay', B: 'playerStarts', R: 'monsterStarts' };
  const EXITS = { n: 'n', s: 's', e: 'e', w: 'w' };

  // Carte du laboratoire de combat : '.' sol · '#' rocher · 'o' trou · 'R' départ des monstres · 'B' départ du joueur
  const LAB_LAYOUT = [
    '...R.R.R.R.....',
    '..R.R.R.R.R....',
    '....#......#...',
    '..o.......#....',
    '...............',
    '.....#...o.....',
    '..#............',
    '.......#.......',
    '............#..',
    '.....o...#.....',
    '...............',
    '....#.......o..',
    '...#......#....',
    '....B.B.B.B.B..',
    '.....B.B.B.B...',
  ];

  // Construit une carte depuis 15 lignes de caractères. `map.kind[y][x]` garde le caractère
  // d'origine pour le rendu (variantes de sol, lanternes) ; `map.spots` liste les cases spéciales
  // dans l'ordre de lecture ; `map.exits` les cases de sortie par direction.
  function create(layout) {
    layout = layout || LAB_LAYOUT;
    const h = layout.length;
    const w = layout[0].length;
    const cells = [];
    const kind = [];
    const spots = { npcs: [], nodes: [], groups: [], door: null, relay: null, playerStarts: [], monsterStarts: [] };
    const exits = { n: [], s: [], e: [], w: [] };
    for (let y = 0; y < h; y++) {
      cells[y] = [];
      kind[y] = [];
      for (let x = 0; x < w; x++) {
        const ch = layout[y][x];
        cells[y][x] = KIND[ch] == null ? FLOOR : KIND[ch];
        kind[y][x] = ch;
        if (SPOTS[ch]) {
          const list = spots[SPOTS[ch]];
          if (Array.isArray(list)) list.push({ x, y });
          else spots[SPOTS[ch]] = { x, y };
        }
        if (EXITS[ch]) exits[ch].push({ x, y });
      }
    }
    // Compatibilité avec le laboratoire : starts.player / starts.monster.
    const starts = { player: spots.playerStarts, monster: spots.monsterStarts };
    return { w, h, cells, kind, spots, exits, starts, layout };
  }

  const key = (x, y) => x + ',' + y;
  const inBounds = (map, x, y) => x >= 0 && y >= 0 && x < map.w && y < map.h;
  const tile = (map, x, y) => (inBounds(map, x, y) ? map.cells[y][x] : ROCK);
  const walkable = (map, x, y) => tile(map, x, y) === FLOOR;
  const blocksSight = (map, x, y) => { const t = tile(map, x, y); return t === ROCK || t === TREE; };
  const dist = (a, b) => Math.abs(a.x - b.x) + Math.abs(a.y - b.y);
  const inLine = (a, b) => a.x === b.x || a.y === b.y;
  const kindAt = (map, x, y) => (inBounds(map, x, y) ? map.kind[y][x] : '#');

  // Ligne de vue entre deux cases. On échantillonne le segment entre les deux centres ;
  // toute case intermédiaire qui bloque la vue ou qui est occupée (selon `occupied`) bloque.
  function hasLineOfSight(map, from, to, occupied) {
    const d = dist(from, to);
    if (d <= 1) return true;
    const steps = d * 4;
    for (let i = 1; i < steps; i++) {
      const t = i / steps;
      const cx = Math.round(from.x + (to.x - from.x) * t);
      const cy = Math.round(from.y + (to.y - from.y) * t);
      if ((cx === from.x && cy === from.y) || (cx === to.x && cy === to.y)) continue;
      if (blocksSight(map, cx, cy)) return false;
      if (occupied && occupied(cx, cy)) return false;
    }
    return true;
  }

  // Parcours en largeur limité à maxSteps pas. `blocked(x, y)` signale les cases occupées ;
  // `walkableFn(x, y)` remplace la règle de terrain par défaut (obstacles temporaires, vers qui
  // traversent les rochers).
  function reachable(map, start, maxSteps, blocked, walkableFn) {
    const canWalk = walkableFn || ((x, y) => walkable(map, x, y));
    const distances = new Map();
    const parent = new Map();
    const queue = [start];
    distances.set(key(start.x, start.y), 0);
    const dirs = [[1, 0], [-1, 0], [0, 1], [0, -1]];
    while (queue.length) {
      const c = queue.shift();
      const dc = distances.get(key(c.x, c.y));
      if (dc >= maxSteps) continue;
      for (const [dx, dy] of dirs) {
        const nx = c.x + dx;
        const ny = c.y + dy;
        const k = key(nx, ny);
        if (distances.has(k)) continue;
        if (!canWalk(nx, ny)) continue;
        if (blocked && blocked(nx, ny)) continue;
        distances.set(k, dc + 1);
        parent.set(k, c);
        queue.push({ x: nx, y: ny });
      }
    }
    return { dist: distances, parent };
  }

  // Chemin (liste de cases, départ exclu) vers `target` d'après un résultat de `reachable`.
  function pathTo(reach, target) {
    const k = key(target.x, target.y);
    if (!reach.dist.has(k) || reach.dist.get(k) === 0) return null;
    const path = [];
    let c = target;
    while (c && reach.dist.get(key(c.x, c.y)) > 0) {
      path.unshift({ x: c.x, y: c.y });
      c = reach.parent.get(key(c.x, c.y));
    }
    return path;
  }

  // Cases voisines (4 directions) de `c`, dans les limites de la carte.
  function neighbors(map, c) {
    const out = [];
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      if (inBounds(map, c.x + dx, c.y + dy)) out.push({ x: c.x + dx, y: c.y + dy });
    }
    return out;
  }

  // Cases couvertes par une zone d'effet centrée sur `center`. `origin` est le lanceur (pour les lignes).
  function aoeCells(map, shape, size, center, origin) {
    const out = [];
    if (shape === 'cross' || shape === 'circle') {
      for (let dy = -size; dy <= size; dy++) {
        for (let dx = -size; dx <= size; dx++) {
          if (shape === 'cross' && dx !== 0 && dy !== 0) continue;
          if (Math.abs(dx) + Math.abs(dy) > size) continue;
          const x = center.x + dx;
          const y = center.y + dy;
          if (inBounds(map, x, y)) out.push({ x, y });
        }
      }
      return out;
    }
    if (shape === 'line') {
      const dir = pushDirection(origin, center) || { x: 1, y: 0 };
      for (let i = 0; i < size; i++) {
        const x = center.x + dir.x * i;
        const y = center.y + dir.y * i;
        if (!inBounds(map, x, y)) break;
        out.push({ x, y });
      }
      return out;
    }
    return [{ x: center.x, y: center.y }];
  }

  // Direction de poussée de `from` vers `to` : on suit l'axe dominant.
  function pushDirection(from, to) {
    const dx = to.x - from.x;
    const dy = to.y - from.y;
    if (dx === 0 && dy === 0) return null;
    if (Math.abs(dx) >= Math.abs(dy)) return { x: Math.sign(dx), y: 0 };
    return { x: 0, y: Math.sign(dy) };
  }

  // Centre d'une case à l'écran. Les coordonnées de case peuvent être fractionnaires (animations).
  function toScreen(x, y, origin) {
    return { x: origin.x + (x - y) * (TILE_W / 2), y: origin.y + (x + y) * (TILE_H / 2) };
  }

  // Orientation d'une figure après un pas de (dx, dy) cases : l'une des quatre diagonales de
  // l'écran. x+ descend vers la droite (se), y+ vers la gauche (sw), x- monte vers la gauche (nw),
  // y- monte vers la droite (ne). Rien pour un pas nul.
  function facing(dx, dy) {
    if (!dx && !dy) return null;
    if (Math.abs(dx) >= Math.abs(dy)) return dx > 0 ? 'se' : 'nw';
    return dy > 0 ? 'sw' : 'ne';
  }

  function fromScreen(sx, sy, origin) {
    const u = (sx - origin.x) / (TILE_W / 2);
    const v = (sy - origin.y) / (TILE_H / 2);
    return { x: Math.round((u + v) / 2), y: Math.round((v - u) / 2) };
  }

  return {
    TILE_W, TILE_H, FLOOR, ROCK, HOLE, WATER, TREE, LAB_LAYOUT,
    create, key, inBounds, tile, kindAt, walkable, blocksSight, dist, inLine, neighbors,
    hasLineOfSight, reachable, pathTo, aoeCells, pushDirection, toScreen, fromScreen, facing,
  };
})();
