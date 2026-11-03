const Grid = (() => {
  const TILE_W = 64;
  const TILE_H = 32;
  const FLOOR = 0;
  const ROCK = 1;
  const HOLE = 2;
  const WATER = 3;
  const TREE = 4;

  const KIND = { '#': ROCK, 'T': TREE, '~': WATER, 'o': HOLE };
  const SPOTS = { P: 'npcs', G: 'nodes', M: 'groups', D: 'door', Z: 'relay', B: 'playerStarts', R: 'monsterStarts' };
  const EXITS = { n: 'n', s: 's', e: 'e', w: 'w' };

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

  function neighbors(map, c) {
    const out = [];
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      if (inBounds(map, c.x + dx, c.y + dy)) out.push({ x: c.x + dx, y: c.y + dy });
    }
    return out;
  }

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

  function pushDirection(from, to) {
    const dx = to.x - from.x;
    const dy = to.y - from.y;
    if (dx === 0 && dy === 0) return null;
    if (Math.abs(dx) >= Math.abs(dy)) return { x: Math.sign(dx), y: 0 };
    return { x: 0, y: Math.sign(dy) };
  }

  function toScreen(x, y, origin) {
    return { x: origin.x + (x - y) * (TILE_W / 2), y: origin.y + (x + y) * (TILE_H / 2) };
  }

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
