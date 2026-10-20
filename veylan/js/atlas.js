// Atlas du monde : une coordonnée [x, y] par carte, comme sur la carte de Dofus, déduite des
// sorties (n : y - 1, s : y + 1, e : x + 1, w : x - 1). Les salles de donjon n'y sont pas : leur
// porte est sur la carte d'entrée. Ne touche pas au DOM (testable sous Node, voir
// tools/validate-content.js) ; la fenêtre « Carte du monde » (js/hud-carte.js) le dessine.
//
// Repères facultatifs dans le contenu, quand deux morceaux du monde ne sont reliés par aucune
// sortie (un voyage en bateau, par exemple) : `coords: [x, y]` sur une carte la fixe, `origin:
// [x, y]` sur une zone fixe sa première carte. Sans repère, un morceau isolé est posé à droite
// des autres, avec deux cases de mer entre eux.
const Atlas = (() => {
  const STEP = { n: [0, -1], e: [1, 0], s: [0, 1], w: [-1, 0] };
  const OPP = { n: 's', s: 'n', e: 'w', w: 'e' };
  const key = (x, y) => x + ',' + y;
  const pair = v => Array.isArray(v) && v.length === 2 && Number.isInteger(v[0]) && Number.isInteger(v[1]);
  const txt = c => `[${c[0]},${c[1]}]`;

  // Calcule l'atlas d'une liste de zones. Retourne { coords: Map id → [x, y], cells: Map « x,y »
  // → id, conflicts: [{ type, text, ... }], parts: [{ seed, maps, pinned }], bounds }.
  function compute(zones) {
    const maps = new Map();
    for (const z of zones || []) for (const m of z.maps || []) maps.set(m.id, { def: m, zone: z });
    const pinOf = id => {
      const e = maps.get(id);
      if (pair(e.def.coords)) return e.def.coords;
      if (e.zone.maps[0] === e.def && pair(e.zone.origin)) return e.zone.origin;
      return null;
    };
    const coords = new Map(), cells = new Map(), conflicts = [], parts = [];
    const ids = [...maps.keys()];
    // Les cartes fixées d'abord, puis l'ordre du contenu : la première carte du jeu est en [0,0].
    const seeds = ids.filter(id => pinOf(id)).concat(ids.filter(id => !pinOf(id)));
    for (const seed of seeds) {
      if (coords.has(seed)) continue;
      // Parcours en largeur dans un repère local, puis décalage.
      const local = new Map([[seed, [0, 0]]]);
      const queue = [seed];
      while (queue.length) {
        const id = queue.shift();
        const [x, y] = local.get(id);
        const ex = maps.get(id).def.exits || {};
        for (const dir of ['n', 'e', 's', 'w']) {
          const t = ex[dir];
          if (!t || !maps.has(t) || coords.has(t) || local.has(t)) continue;
          local.set(t, [x + STEP[dir][0], y + STEP[dir][1]]);
          queue.push(t);
        }
      }
      const pin = pinOf(seed);
      let dx = 0, dy = 0;
      if (pin) { dx = pin[0]; dy = pin[1]; }
      else if (coords.size) {
        const b = boundsOf([...coords.values()]), lb = boundsOf([...local.values()]);
        dx = b.maxX + 3 - lb.minX; dy = b.minY - lb.minY;
      }
      for (const [id, [x, y]] of local) {
        const c = [x + dx, y + dy];
        coords.set(id, c);
        const k = key(c[0], c[1]);
        if (cells.has(k)) conflicts.push({ type: 'case', at: c, maps: [cells.get(k), id], text: `${txt(c)} : ${cells.get(k)} et ${id} sur la même case` });
        else cells.set(k, id);
      }
      for (const id of local.keys()) {
        const p = pinOf(id);
        if (id !== seed && p && (p[0] !== coords.get(id)[0] || p[1] !== coords.get(id)[1])) conflicts.push({ type: 'repère', map: id, text: `${id} : fixée en ${txt(p)}, mais ses sorties la placent en ${txt(coords.get(id))}` });
      }
      parts.push({ seed, maps: [...local.keys()], pinned: !!pin });
    }
    // Chaque sortie doit mener à la case voisine, dans le bon sens.
    for (const [id, e] of maps) {
      const ex = e.def.exits || {};
      for (const dir of ['n', 'e', 's', 'w']) {
        const t = ex[dir];
        if (!t || !maps.has(t)) continue;
        const a = coords.get(id), b = coords.get(t);
        const want = [a[0] + STEP[dir][0], a[1] + STEP[dir][1]];
        if (b[0] !== want[0] || b[1] !== want[1]) conflicts.push({ type: 'sortie', map: id, dir, target: t, text: `${id} : sortie ${dir} vers ${t}, attendue en ${txt(want)}, placée en ${txt(b)}` });
      }
    }
    return { coords, cells, conflicts, parts, bounds: boundsOf([...coords.values()]) };
  }

  function boundsOf(list) {
    if (!list.length) return { minX: 0, maxX: 0, minY: 0, maxY: 0 };
    const xs = list.map(c => c[0]), ys = list.map(c => c[1]);
    return { minX: Math.min(...xs), maxX: Math.max(...xs), minY: Math.min(...ys), maxY: Math.max(...ys) };
  }

  // L'atlas du contenu chargé, calculé une fois (comme World.index).
  let cache = null, cacheZones = null, cacheCount = -1;
  function get() {
    const zones = (typeof DATA !== 'undefined' && DATA.content && DATA.content.zones) || [];
    const count = zones.reduce((s, z) => s + (z.maps || []).length, 0);
    if (!cache || cacheZones !== zones || cacheCount !== count) { cache = compute(zones); cacheZones = zones; cacheCount = count; cache.index = null; }
    return cache;
  }
  const coordsOf = id => get().coords.get(id) || null;
  const at = (x, y) => get().cells.get(key(x, y)) || null;

  // Index des cartes : zone, PNJ, donjons ; pour la fenêtre et les marques de quêtes.
  function index() {
    const a = get();
    if (a.index) return a.index;
    const ix = { map: new Map(), npcMap: new Map(), dungeonsAt: new Map() };
    for (const z of DATA.content.zones || []) for (const m of z.maps || []) {
      ix.map.set(m.id, { def: m, zone: z });
      for (const n of m.npcs || []) if (!ix.npcMap.has(n)) ix.npcMap.set(n, m.id);
    }
    for (const d of DATA.content.dungeons || []) if (ix.map.has(d.entryMap)) (ix.dungeonsAt.get(d.entryMap) || ix.dungeonsAt.set(d.entryMap, []).get(d.entryMap)).push(d);
    for (const [id, e] of ix.map) if (e.def.dungeon && !(ix.dungeonsAt.get(id) || []).some(d => d.id === e.def.dungeon)) {
      const d = (DATA.content.dungeons || []).find(x => x.id === e.def.dungeon);
      if (d) (ix.dungeonsAt.get(id) || ix.dungeonsAt.set(id, []).get(id)).push(d);
    }
    a.index = ix;
    return ix;
  }

  // Les cases marquées d'une carte, lues dans son plan comme le fait js/grid.js : PNJ, nœuds de
  // récolte, groupes, porte, relais, lanternes, dans l'ordre de lecture. Gardées en cache.
  function spots(id) {
    const ix = index();
    ix.spots = ix.spots || new Map();
    if (ix.spots.has(id)) return ix.spots.get(id);
    const e = ix.map.get(id);
    const out = { npcs: [], nodes: [], groups: [], door: null, relay: null, lanterns: [], size: e ? e.def.layout.length : 15 };
    if (e) e.def.layout.forEach((row, y) => {
      for (let x = 0; x < row.length; x++) {
        const k = row[x];
        if (k === 'P') out.npcs.push({ id: (e.def.npcs || [])[out.npcs.length] || null, x, y });
        else if (k === 'G') out.nodes.push({ id: (e.def.nodes || [])[out.nodes.length] || null, x, y });
        else if (k === 'M') out.groups.push({ tpl: (e.def.groups || [])[out.groups.length] || null, x, y });
        else if (k === 'D') out.door = { x, y };
        else if (k === 'Z') out.relay = { x, y };
        else if (k === 'L') out.lanterns.push({ x, y });
      }
    });
    ix.spots.set(id, out);
    return out;
  }

  // Une case du plan d'une carte, en coordonnées du monde : le centre de la carte [x, y] est
  // au milieu de son plan, chaque carte fait une unité de côté.
  function tileToWorld(id, tx, ty) {
    const p = coordsOf(id);
    if (!p) return null;
    const n = spots(id).size;
    return [p[0] - 0.5 + (tx + 0.5) / n, p[1] - 0.5 + (ty + 0.5) / n];
  }

  // La carte du monde où se trouve le personnage : la carte elle-même, ou l'entrée de son donjon.
  function hereOf(mapId) {
    if (!mapId) return null;
    if (!String(mapId).includes('#')) return get().coords.has(mapId) ? mapId : null;
    const d = (DATA.content.dungeons || []).find(x => x.id === mapId.split('#')[0]);
    return d && get().coords.has(d.entryMap) ? d.entryMap : null;
  }

  // Ce qu'on trouve sur une carte : monstres (avec leurs niveaux), ressources, relais, donjons, PNJ.
  function mapInfo(id) {
    const e = index().map.get(id);
    if (!e) return null;
    const m = e.def;
    const mons = new Map();
    for (const g of m.groups || []) g.monsters.forEach((mid, i) => {
      const lv = g.levels ? [g.levels[i], g.levels[i]] : (g.level || [1, 1]);
      const cur = mons.get(mid);
      mons.set(mid, cur ? [Math.min(cur[0], lv[0]), Math.max(cur[1], lv[1])] : [lv[0], lv[1]]);
    });
    return {
      def: m, zone: e.zone, coords: coordsOf(id),
      monsters: [...mons].map(([mid, level]) => ({ id: mid, def: DATA.monsters[mid] || null, level })),
      resources: [...new Set(m.nodes || [])],
      relay: !!m.relay,
      dungeons: index().dungeonsAt.get(id) || [],
      npcs: (m.npcs || []).slice(),
    };
  }

  // Marques de quêtes par carte, pour un personnage : « ! » (quête à prendre), « ? » (quête à
  // rendre) et cibles des étapes en cours (carte à visiter, PNJ à voir, monstres, récolte, donjon).
  // Par PNJ aussi (giveNpc, turnInNpc), et `pins` : la cible précise des quêtes suivies (les trois
  // premières du suivi, comme à l'écran), une case du plan ; pour des monstres ou une récolte,
  // la carte la plus proche de `hereId`.
  function questMarks(ch, hereId) {
    const ix = index();
    const give = new Map(), turnIn = new Map(), targets = new Map(), giveNpc = new Map(), turnInNpc = new Map();
    const push = (m, mapId, q) => { if (!mapId || (m !== giveNpc && m !== turnInNpc && !ix.map.has(mapId))) return; const l = m.get(mapId) || m.set(mapId, []).get(mapId); if (!l.includes(q)) l.push(q); };
    for (const [npc, mapId] of ix.npcMap) {
      for (const q of Quests.available(ch, npc)) { push(give, mapId, q); push(giveNpc, npc, q); }
      for (const q of Quests.readyFor(ch, npc)) { push(turnIn, mapId, q); push(turnInNpc, npc, q); }
    }
    for (const id of Object.keys(ch.quests.active)) {
      const q = Quests.get(id), st = ch.quests.active[id];
      if (!q || st.step >= q.steps.length) continue;
      const s = q.steps[st.step];
      if (s.type === 'visit') push(targets, s.map, q);
      else if (s.type === 'talk') push(targets, ix.npcMap.get(s.npc), q);
      else if (s.type === 'answer') push(targets, ix.npcMap.get(Quests.answerNpc(q, s)), q);
      else if (s.type === 'dungeon') { const d = (DATA.content.dungeons || []).find(x => x.id === s.dungeon); if (d) push(targets, d.entryMap, q); }
      else if (s.type === 'kill') { for (const [mid, e] of ix.map) if ((e.def.groups || []).some(g => g.monsters.includes(s.monster))) push(targets, mid, q); }
      else if (s.type === 'gather') { for (const [mid, e] of ix.map) if ((e.def.nodes || []).includes(s.resource)) push(targets, mid, q); }
    }
    // Épingles des quêtes suivies.
    const here = hereId && coordsOf(hereId);
    const near = list => list.sort((a, b) => here ? Math.hypot(coordsOf(a.map)[0] - here[0], coordsOf(a.map)[1] - here[1]) - Math.hypot(coordsOf(b.map)[0] - here[0], coordsOf(b.map)[1] - here[1]) : 0)[0] || null;
    const npcSpot = npc => { const m = ix.npcMap.get(npc); const sp = m && spots(m).npcs.find(n => n.id === npc); return m && sp ? { map: m, x: sp.x, y: sp.y } : null; };
    const pins = [];
    for (const t of Quests.tracker(ch).slice(0, 3)) {
      const q = t.quest, st = ch.quests.active[q.id];
      let at = null;
      if (st.step >= q.steps.length) at = npcSpot(Quests.turnInOf(q));
      else {
        const s = q.steps[st.step];
        if (s.type === 'visit' && ix.map.has(s.map)) at = { map: s.map, x: 7, y: 7 };
        else if (s.type === 'talk') at = npcSpot(s.npc);
        else if (s.type === 'answer') at = npcSpot(Quests.answerNpc(q, s));
        else if (s.type === 'dungeon') { const d = (DATA.content.dungeons || []).find(x => x.id === s.dungeon); const door = d && ix.map.has(d.entryMap) && spots(d.entryMap).door; if (door) at = { map: d.entryMap, x: door.x, y: door.y }; }
        else if (s.type === 'kill') at = near([...ix.map.keys()].map(mid => { const g = spots(mid).groups.find(x => x.tpl && x.tpl.monsters.includes(s.monster)); return g ? { map: mid, x: g.x, y: g.y } : null; }).filter(Boolean));
        else if (s.type === 'gather') at = near([...ix.map.keys()].map(mid => { const n = spots(mid).nodes.find(x => x.id === s.resource); return n ? { map: mid, x: n.x, y: n.y } : null; }).filter(Boolean));
      }
      if (at) pins.push(Object.assign({ quest: q, text: t.text }, at));
    }
    return { give, turnIn, targets, giveNpc, turnInNpc, pins };
  }

  // Le premier continent, à l'échelle des régions (docs/MONDE.md, docs/DONJONS-ET-COMBATS.md).
  // Une région est ouverte dès que le contenu a des zones à elle ; ses niveaux viennent alors des
  // zones. `at` place l'île sur la carte du continent (unités libres, 100 de large).
  const REGIONS = [
    { id: 'orsane', name: 'Orsane, les Cimes', level: [1, 20], at: [40, 15], r: 13, desc: 'La capitale, sur les Cimes, tout en hauteur et en lumière. Siège du Fil.' },
    { id: 'kaldum', name: 'Kaldum', level: [20, 40], at: [74, 27], r: 12, desc: 'Mines, forges, roche chaude. Terre des Kaldrin.' },
    { id: 'thessa', name: 'Thessa, les Marées', level: [30, 50], at: [15, 40], r: 12, desc: 'Côte, ports, marchés. Les Francs-Marcheurs y règnent.' },
    { id: 'lisiere', name: 'La Lisière', level: [40, 60], at: [47, 43], r: 11, desc: 'La zone autour de la Déchirure. Contestée, PvP ouvert.' },
    { id: 'basvoiles', name: 'Les Bas-Voiles', level: [50, 80], at: [72, 58], r: 11, desc: 'Ce qu\'on trouve juste sous la fente. Donjons, remontées, noir et pourpre.' },
    { id: 'voile', name: 'Sous le premier Voile', level: [80, 100], at: [36, 64], r: 9, desc: 'La saga de fin : quatre lieutenants, puis l\'Effileur.' },
  ];
  function regions() {
    const zones = (DATA.content && DATA.content.zones) || [];
    return REGIONS.map(r => {
      const zs = zones.filter(z => z.region === r.id);
      const open = zs.length > 0;
      const level = open ? [Math.min(...zs.map(z => z.level[0])), Math.max(...zs.map(z => z.level[1]))] : r.level;
      return Object.assign({}, r, { open, level, zones: zs });
    });
  }

  return { STEP, OPP, compute, get, coordsOf, at, index, spots, tileToWorld, hereOf, mapInfo, questMarks, regions, REGIONS, key };
})();
