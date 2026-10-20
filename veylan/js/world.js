// Le monde hors combat : cartes, déplacement, groupes errants, PNJ, récolte, relais, donjons,
// passage au combat et retour avec les gains. Ne touche pas au DOM : il émet des événements.
class World {
  constructor(opts) {
    this.ch = opts.character;
    this.combat = opts.combat;
    this.rng = opts.rng || Math.random;
    this.listeners = {};
    this.mapId = null;
    this.mapDef = null;
    this.map = null;
    this.zone = null;
    // facing : l'une des quatre diagonales de l'écran (Grid.facing), celle du dernier pas.
    this.player = { x: 0, y: 0, rx: 0, ry: 0, path: [], moving: false, speed: 5, onArrive: null, facing: 'se' };
    this.groups = [];
    this.npcs = [];
    this.nodes = [];
    this.door = null;
    this.relay = null;
    this.state = 'explore';          // explore | combat | dialogue | panel
    this.showCombat = false;         // le rendu affiche le combat (jusqu'au retour au monde)
    this.mapStates = {};             // mapId -> { dead: { idx: respawnAt }, used: { idx: readyAt } }
    this.time = 0;
    this.regenAcc = 0;
    this.saveAcc = 0;
    this.currentGroup = null;
    this.pending = null;             // action à faire quand le joueur ferme l'écran de fin de combat
    this.lastResult = null;
    this.combat.on('end', d => this.onFightEnd(d));
  }

  on(evt, fn) { (this.listeners[evt] = this.listeners[evt] || []).push(fn); }
  // Les événements que le guide et la discussion suivent passent aussi par le bus (js/util.js).
  emit(evt, data) {
    for (const fn of this.listeners[evt] || []) fn(data);
    if (World.PUBLIC.has(evt) && typeof Bus === 'object') Bus.emit(evt, data);
  }
  static get PUBLIC() {
    return World._public || (World._public = new Set(['map', 'dialogue', 'fight', 'fightEnd', 'quest', 'questProgress', 'reward', 'relay', 'arrive', 'groupPopup', 'equip', 'gain', 'levelUp']));
  }
  toast(text) { this.emit('toast', text); }

  // ----- Données -----

  static index() {
    if (!World._index) {
      World._index = { maps: new Map(), zones: new Map() };
      for (const z of (DATA.content && DATA.content.zones) || []) {
        World._index.zones.set(z.id, z);
        for (const m of z.maps || []) World._index.maps.set(m.id, { def: m, zone: z });
      }
    }
    return World._index;
  }
  static mapDef(id) { const e = World.index().maps.get(id); return e ? e.def : null; }
  static zoneOf(id) { const e = World.index().maps.get(id); return e ? e.zone : null; }
  static dungeonDef(id) { return ((DATA.content && DATA.content.dungeons) || []).find(d => d.id === id) || null; }
  static npcDef(id) { return ((DATA.content && DATA.content.npcs) || []).find(n => n.id === id) || null; }
  static firstMap() { const z = ((DATA.content && DATA.content.zones) || [])[0]; return z && z.maps[0] ? z.maps[0].id : null; }

  // ----- Entrée sur une carte -----

  // arrival : { x, y } | { side: 'n'|'s'|'e'|'w' } (par quelle sortie on arrive) | { relay: true } | vide.
  enter(mapId, arrival) {
    arrival = arrival || {};
    let def, zone;
    if (mapId.includes('#')) {
      // Une salle de donjon : « id_du_donjon#numéro ».
      const [did, idx] = mapId.split('#');
      const d = World.dungeonDef(did);
      const room = d && d.rooms[Number(idx)];
      if (!room) return false;
      def = { id: mapId, name: `${d.name} : ${room.name}`, layout: room.layout, exits: {}, npcs: [], nodes: [],
        groups: [{ monsters: room.monsters.map(m => m.id), levels: room.monsters.map(m => m.level), respawn: 0 }], dungeon: null, relay: true, room: true, dungeonId: did, roomIndex: Number(idx) };
      zone = World.zoneOf(d.entryMap) || { id: d.zone, name: d.name, palette: 'orsane', level: d.level };
      // Les tours se cumulent d'une salle à l'autre : le succès « en moins de N tours » compte la course entière.
      const prev = this.ch.dungeon;
      this.ch.dungeon = { id: did, room: Number(idx), turns: prev && prev.id === did && Number(idx) > 0 ? (prev.turns || 0) : 0 };
    } else {
      def = World.mapDef(mapId);
      zone = World.zoneOf(mapId);
      if (!def) return false;
      this.ch.dungeon = null;
    }
    this.mapId = mapId;
    this.mapDef = def;
    this.zone = zone;
    this.map = Grid.create(def.layout);
    const S = this.map.spots;
    const st = this.mapStates[mapId] || (this.mapStates[mapId] = { dead: {}, used: {} });
    // Minuteries sauvegardées (heure réelle) : recharger ne fait pas réapparaître groupes et récoltes.
    const saved = !def.room && this.ch.mapTimers && this.ch.mapTimers[mapId];
    if (saved) {
      const now = Date.now();
      for (const kind of ['dead', 'used']) for (const i in saved[kind] || {}) {
        const left = (saved[kind][i] - now) / 1000;
        if (left > 0) st[kind][i] = Math.max(st[kind][i] || 0, this.time + left);
      }
    }

    this.npcs = S.npcs.map((c, i) => ({ id: def.npcs[i], def: World.npcDef(def.npcs[i]) || { id: def.npcs[i], name: def.npcs[i], dialogue: ['...'] }, x: c.x, y: c.y }));
    this.nodes = S.nodes.map((c, i) => ({ idx: i, resource: def.nodes[i], x: c.x, y: c.y, ready: !(st.used[i] > this.time), readyAt: st.used[i] || 0 }));
    this.groups = [];
    S.groups.forEach((c, i) => {
      const tpl = def.groups[i];
      if (!tpl || (st.dead[i] && st.dead[i] > this.time)) return;
      this.groups.push(this.makeGroup(tpl, i, c));
    });
    this.door = S.door ? { x: S.door.x, y: S.door.y, dungeon: def.dungeon } : null;
    this.relay = S.relay ? { x: S.relay.x, y: S.relay.y } : null;

    // Position d'arrivée.
    let pos = null;
    if (arrival.x != null) pos = { x: arrival.x, y: arrival.y };
    else if (arrival.side && this.map.exits[arrival.side].length) {
      const cells = this.map.exits[arrival.side];
      pos = cells[Math.min(cells.length - 1, arrival.index != null ? arrival.index : Math.floor(cells.length / 2))];
    } else if (this.relay) pos = { x: this.relay.x, y: this.relay.y };
    if (!pos || !Grid.walkable(this.map, pos.x, pos.y)) pos = this.firstFloor();
    this.player.x = pos.x; this.player.y = pos.y; this.player.rx = pos.x; this.player.ry = pos.y;
    this.player.path = []; this.player.moving = false; this.player.onArrive = null;

    this.ch.pos = { map: mapId, x: pos.x, y: pos.y };
    if (!def.room && !this.ch.counters.maps.includes(mapId)) this.ch.counters.maps.push(mapId);
    const touched = Quests.onEvent(this.ch, { type: 'visit', map: mapId });
    this.afterEvents(touched);
    this.state = 'explore';
    this.emit('map', { mapId, def, zone });
    // Une carte de plus : les succès d'exploration se débloquent à l'arrivée.
    this.checkAchievements();
    this.emit('update');
    return true;
  }

  firstFloor() {
    for (let y = 0; y < this.map.h; y++) for (let x = 0; x < this.map.w; x++) if (Grid.walkable(this.map, x, y)) return { x, y };
    return { x: 0, y: 0 };
  }

  // Un groupe de monstres d'après un gabarit : niveaux tirés dans la fourchette, bornés à la famille.
  makeGroup(tpl, idx, cell) {
    const monsters = tpl.monsters.map((id, i) => {
      const def = DATA.monsters[id];
      const [lo, hi] = def ? Entity.levelRange(def) : [1, 1];
      let level;
      if (tpl.levels) level = tpl.levels[i];
      else { const [a, b] = tpl.level || [lo, lo]; level = a + Math.floor(this.rng() * (b - a + 1)); }
      return { id, level: Math.max(lo, Math.min(hi, level)) };
    });
    return { idx, tpl, monsters, x: cell.x, y: cell.y, rx: cell.x, ry: cell.y, wander: 1 + this.rng() * 3, level: Math.round(monsters.reduce((s, m) => s + m.level, 0) / monsters.length) };
  }

  // ----- Boucle -----

  update(dt) {
    this.time += dt;
    this.ch.playTime += dt;
    if (this.state === 'combat') return;
    if (this.state === 'explore' || this.state === 'panel' || this.state === 'dialogue') {
      this.updatePlayer(dt);
      for (const g of this.groups) this.updateGroup(g, dt);
      for (const n of this.nodes) if (!n.ready && n.readyAt <= this.time) { n.ready = true; this.emit('update'); }
      // Hors donjon seulement, 1 % des PV par seconde : les pains gardent leur usage, et un donjon
      // use ses PV d'une salle à l'autre.
      this.regenAcc += dt;
      if (this.regenAcc >= 1) {
        this.regenAcc = 0;
        const max = this.ch.derived().hpMax;
        if (!this.ch.dungeon && this.ch.hp < max) { this.ch.hp = Math.min(max, this.ch.hp + Math.ceil(max * 0.01)); this.emit('hp'); }
      }
      this.saveAcc += dt;
      if (this.saveAcc >= 15) { this.saveAcc = 0; this.emit('save'); }
    }
  }

  updatePlayer(dt) {
    const p = this.player;
    if (!p.path.length) { if (p.moving) { p.moving = false; } return; }
    const next = p.path[0];
    const dx = next.x - p.rx, dy = next.y - p.ry;
    const d = Math.abs(dx) + Math.abs(dy);
    const step = p.speed * dt;
    p.facing = Grid.facing(dx, dy) || p.facing;
    if (d <= step) {
      p.rx = next.x; p.ry = next.y; p.x = next.x; p.y = next.y;
      p.path.shift();
      this.ch.pos = { map: this.mapId, x: p.x, y: p.y };
      if (!p.path.length) {
        p.moving = false;
        const fn = p.onArrive; p.onArrive = null;
        this.emit('arrive', { map: this.mapId, x: p.x, y: p.y });
        if (fn) fn();
        else this.arrivedAt({ x: p.x, y: p.y });
      }
    } else {
      p.rx += Math.sign(dx) * Math.min(step, Math.abs(dx));
      p.ry += Math.sign(dy) * Math.min(step, Math.abs(dy));
    }
  }

  updateGroup(g, dt) {
    const sp = 3 * dt;
    if (g.rx !== g.x || g.ry !== g.y) {
      const dx = g.x - g.rx, dy = g.y - g.ry;
      g.rx += Math.sign(dx) * Math.min(sp, Math.abs(dx));
      g.ry += Math.sign(dy) * Math.min(sp, Math.abs(dy));
      return;
    }
    g.wander -= dt;
    // Un groupe dont la fiche est ouverte attend qu'on se décide.
    if (g.wander > 0 || this.state !== 'explore' || g.hold) return;
    g.wander = 2 + this.rng() * 4;
    const opts = Grid.neighbors(this.map, g).filter(c => this.isFreeForGroup(c));
    if (!opts.length) return;
    const c = opts[Math.floor(this.rng() * opts.length)];
    g.x = c.x; g.y = c.y;
  }

  isFreeForGroup(c) {
    if (!Grid.walkable(this.map, c.x, c.y)) return false;
    const k = Grid.kindAt(this.map, c.x, c.y);
    if ('nsewPGDZ'.includes(k)) return false;
    if (this.player.x === c.x && this.player.y === c.y) return false;
    if (Grid.dist(c, this.player) <= 1) return false;
    return !this.groupAt(c) && !this.npcAt(c) && !this.nodeAt(c);
  }

  // ----- Ce qu'il y a sur une case -----

  npcAt(c) { return this.npcs.find(n => n.x === c.x && n.y === c.y) || null; }
  groupAt(c) { return this.groups.find(g => g.x === c.x && g.y === c.y) || null; }
  nodeAt(c) { return this.nodes.find(n => n.x === c.x && n.y === c.y) || null; }
  isDoor(c) { return !!(this.door && this.door.x === c.x && this.door.y === c.y); }
  isRelay(c) { return !!(this.relay && this.relay.x === c.x && this.relay.y === c.y); }
  exitDir(c) { const k = Grid.kindAt(this.map, c.x, c.y); return 'nsew'.includes(k) ? k : null; }

  blockedForPlayer(x, y) {
    const c = { x, y };
    return !!(this.groupAt(c) || this.npcAt(c) || this.nodeAt(c));
  }

  // ----- Interaction -----

  // Le joueur touche une case : marcher, parler, inspecter un groupe, récolter, entrer, se relayer.
  tap(cell) {
    if (this.state !== 'explore' || !cell || !Grid.inBounds(this.map, cell.x, cell.y)) return;
    const npc = this.npcAt(cell), group = this.groupAt(cell), node = this.nodeAt(cell);
    if (npc) return this.approach(cell, () => this.talk(npc));
    if (group) return this.inspectGroup(group);
    if (node) return this.approach(cell, () => this.gather(node));
    if (this.isDoor(cell)) return this.walkTo(cell, () => this.emit('dungeonPrompt', World.dungeonDef(this.door.dungeon)));
    if (this.isRelay(cell)) return this.walkTo(cell, () => this.useRelay());
    this.walkTo(cell, null);
  }

  // Marche jusqu'à une case voisine de `cell` (ou agit tout de suite si déjà voisin).
  approach(cell, action) {
    const p = this.player;
    if (Grid.dist(p, cell) <= 1 && !p.moving) { p.facing = Grid.facing(cell.x - p.x, cell.y - p.y) || p.facing; action(); return; }
    const reach = this.reach();
    const opts = Grid.neighbors(this.map, cell).filter(c => reach.dist.has(Grid.key(c.x, c.y))).sort((a, b) => reach.dist.get(Grid.key(a.x, a.y)) - reach.dist.get(Grid.key(b.x, b.y)));
    if (!opts.length) { this.toast('Impossible d\'y aller.'); return; }
    const target = opts[0];
    if (reach.dist.get(Grid.key(target.x, target.y)) === 0) { action(); return; }
    this.setPath(Grid.pathTo(reach, target), action);
  }

  walkTo(cell, action) {
    const reach = this.reach();
    const k = Grid.key(cell.x, cell.y);
    if (!reach.dist.has(k)) { this.toast('Impossible d\'y aller.'); return; }
    if (reach.dist.get(k) === 0) { if (action) action(); return; }
    this.setPath(Grid.pathTo(reach, cell), action);
  }

  reach() {
    return Grid.reachable(this.map, { x: this.player.x, y: this.player.y }, 80, (x, y) => this.blockedForPlayer(x, y));
  }

  setPath(path, action) {
    const p = this.player;
    p.path = path || [];
    p.moving = p.path.length > 0;
    p.onArrive = action || null;
    this.emit('path', p.path);
  }

  // Fin d'un déplacement sans action : une case de sortie fait changer de carte.
  arrivedAt(cell) {
    const dir = this.exitDir(cell);
    if (dir && this.mapDef.exits && this.mapDef.exits[dir]) {
      const OPP = { n: 's', s: 'n', e: 'w', w: 'e' };
      const cells = this.map.exits[dir];
      const index = Math.max(0, cells.findIndex(c => c.x === cell.x && c.y === cell.y));
      this.enter(this.mapDef.exits[dir], { side: OPP[dir], index });
      this.emit('save');
    }
  }

  // Glisser l'écran (js/hud-jeu.js) : le Veilleur marche jusqu'à la case de sortie la plus proche
  // de ce côté, puis change de carte comme s'il l'avait touchée. Faux s'il n'y a pas de sortie.
  exitToward(side) {
    if (this.state !== 'explore' || !this.mapDef || !this.mapDef.exits || !this.mapDef.exits[side]) return false;
    const reach = this.reach();
    const cells = (this.map.exits[side] || []).filter(c => reach.dist.has(Grid.key(c.x, c.y)));
    if (!cells.length) return false;
    cells.sort((a, b) => reach.dist.get(Grid.key(a.x, a.y)) - reach.dist.get(Grid.key(b.x, b.y)));
    const c = cells[0];
    if (reach.dist.get(Grid.key(c.x, c.y)) === 0) { this.arrivedAt(c); return true; }
    this.setPath(Grid.pathTo(reach, c), null);
    return true;
  }

  // Le côté de la carte vers lequel pointe un vecteur à l'écran (vx, vy), parmi `sides`. La carte
  // est un losange : vue de face, la sortie n est en haut à droite, e en bas à droite, s en bas à
  // gauche, w en haut à gauche. Null si aucun côté n'est à moins de 70 degrés du geste.
  static sideToward(vx, vy, sides) {
    const n = Math.hypot(vx, vy);
    if (!n) return null;
    const DIR = { n: [Grid.TILE_W / 2, -Grid.TILE_H / 2], e: [Grid.TILE_W / 2, Grid.TILE_H / 2], s: [-Grid.TILE_W / 2, Grid.TILE_H / 2], w: [-Grid.TILE_W / 2, -Grid.TILE_H / 2] };
    let best = null, bestDot = Math.cos(70 * Math.PI / 180);
    for (const side of sides || Object.keys(DIR)) {
      const d = DIR[side];
      if (!d) continue;
      const dot = (vx * d[0] + vy * d[1]) / (n * Math.hypot(d[0], d[1]));
      if (dot > bestDot) { bestDot = dot; best = side; }
    }
    return best;
  }

  // Les côtés de la carte courante qui mènent quelque part.
  openSides() {
    const ex = (this.mapDef && this.mapDef.exits) || {};
    return ['n', 'e', 's', 'w'].filter(d => ex[d] && (this.map.exits[d] || []).length);
  }

  // Pose le Veilleur sur une case libre de la carte courante (le début du tutoriel).
  placeAt(x, y) {
    if (!this.map || !Grid.walkable(this.map, x, y) || this.blockedForPlayer(x, y)) return false;
    Object.assign(this.player, { x, y, rx: x, ry: y, path: [], moving: false, onArrive: null });
    this.ch.pos = { map: this.mapId, x, y };
    this.emit('update');
    return true;
  }

  // ----- Groupes de monstres : fiche, puis attaque -----

  // Toucher un groupe ouvre sa fiche (le HUD l'affiche près du groupe) ; il attend qu'on se décide.
  inspectGroup(group) {
    if (!group || !this.groups.includes(group)) return;
    for (const g of this.groups) g.hold = false;
    group.hold = true;
    this.emit('groupPopup', { map: this.mapId, group, xp: this.groupXp(group), difficulty: this.groupDifficulty(group) });
  }

  releaseGroup(group) {
    if (group) group.hold = false;
  }

  // « Attaquer » sur la fiche : le Veilleur s'approche, puis le combat commence comme avant. Le
  // groupe attend sur place pendant l'approche.
  attackGroup(group) {
    if (this.state !== 'explore' || !group || !this.groups.includes(group)) return false;
    group.hold = true;
    this.approach({ x: group.x, y: group.y }, () => { if (this.state === 'explore' && this.groups.includes(group)) this.startFight(group); else group.hold = false; });
    // Pas de chemin jusqu'au groupe : il reprend sa marche.
    if (this.state === 'explore' && !this.player.moving) group.hold = false;
    return true;
  }

  // XP annoncée par la fiche d'un groupe : la formule du combat (Entity.xpFor), les Nœuds noués et
  // la Sagesse du personnage. Le Défi, tiré au début du combat, peut y ajouter son bonus.
  groupXp(group) {
    const base = group.monsters.reduce((s, m) => s + Entity.xpFor(DATA.monsters[m.id], m.level), 0);
    const knots = this.ch.activeKnots().length * (DATA.rules.knotBonus || 0);
    return this.ch.wisdomXp(Math.round(base * (1 + knots / 100)));
  }

  // Indication de difficulté : la somme des niveaux du groupe (un boss compte triple) rapportée à
  // deux monstres et demi du niveau du Veilleur, ce qu'un combat de zone ordinaire lui oppose.
  groupDifficulty(group) {
    const sum = group.monsters.reduce((s, m) => s + m.level * (DATA.monsters[m.id] && DATA.monsters[m.id].boss ? 3 : 1), 0);
    const r = sum / (Math.max(1, this.ch.level) * 2.5);
    return r <= 0.6 ? 'facile' : r <= 1.1 ? 'mesure' : r <= 1.6 ? 'difficile' : 'danger';
  }

  // ----- PNJ, quêtes, boutiques -----

  talk(npc) {
    this.state = 'dialogue';
    this.talkNpc = npc;
    const touched = Quests.onEvent(this.ch, { type: 'talk', npc: npc.id });
    this.afterEvents(touched);
    this.emit('dialogue', this.dialogueContext(npc));
  }

  dialogueContext(npc) {
    // Un PNJ peut saluer autrement qui a prêté serment (factionLines : { fil: [...], dechirure: [...] }).
    const f = Factions.insigne(this.ch), byFaction = f && npc.def.factionLines && npc.def.factionLines[f.id];
    return {
      npc,
      lines: byFaction || npc.def.dialogue || [],
      offers: Quests.available(this.ch, npc.id),
      // « done » : la quête se termine ici (turnIn) ; ailleurs, le PNJ rappelle seulement où en est la quête.
      active: Quests.activeFor(this.ch, npc.id).map(q => ({ quest: q, text: Quests.stepText(this.ch, q.id), done: Quests.canTurnIn(this.ch, q.id, npc.id) })),
      answers: Quests.answersFor(this.ch, npc.id),
      shop: npc.def.shop || null,
      workshop: npc.def.workshop || null,
    };
  }

  endDialogue() {
    this.talkNpc = null;
    if (this.state === 'dialogue') this.state = 'explore';
    this.emit('update');
  }

  // La discussion (js/discussion.js) écrit « Nouvelle quête », « Quête mise à jour » et « Quête
  // terminée » d'après les événements quest et questProgress.
  acceptQuest(id) {
    if (!Quests.canStart(this.ch, id) || !Quests.accept(this.ch, id)) return false;
    const q = Quests.get(id);
    this.emit('quest', { type: 'accept', id });
    if ((q.startItems || []).length) this.emit('gain', { source: 'quete', items: q.startItems.map(it => ({ id: it.id, count: it.count || 1 })) });
    this.emit('save');
    return true;
  }

  // Une quête se rend au PNJ à qui l'on parle, s'il est celui de la remise (turnIn ou donneur).
  completeQuest(id) {
    if (!this.talkNpc || !Quests.canTurnIn(this.ch, id, this.talkNpc.id)) return null;
    const r = Quests.complete(this.ch, id);
    if (!r) return null;
    const touched = Quests.onEvent(this.ch, { type: 'inventory' });
    this.afterEvents(touched);
    this.emit('quest', { type: 'complete', id, rewards: r });
    if (r.first) this.emit('reward', { title: `Quête terminée : ${r.quest.name}`, xp: r.xp, fils: r.fils, items: r.items, levels: r.levels });
    this.emit('gain', { source: 'quete', xp: r.xp, fils: r.fils, items: r.items.map(it => ({ id: it.id, count: it.count || 1 })) });
    if (r.levels) this.emit('levelUp', { level: this.ch.level, levels: r.levels });
    this.factionEvents(r.events);
    this.checkAchievements();
    this.emit('save');
    return r;
  }

  // Répondre à une étape de choix (le serment, le reniement), auprès du PNJ à qui l'on parle.
  // Si la quête se rend à ce PNJ, elle se termine dans la foulée.
  answerQuest(id, optionId) {
    if (!this.talkNpc) return { ok: false, reason: 'Personne à qui répondre.' };
    const r = Quests.answer(this.ch, id, optionId, this.talkNpc.id);
    if (!r.ok) { this.toast(r.reason); return r; }
    this.emit('quest', { type: 'answer', id, option: optionId, later: !!r.later });
    this.factionEvents(r.events);
    for (const q of r.dropped || []) this.emit('quest', { type: 'dropped', id: q.id });
    if (r.done && Quests.canTurnIn(this.ch, id, this.talkNpc.id)) r.completed = this.completeQuest(id);
    this.checkAchievements();
    this.emit('update');
    this.emit('save');
    return r;
  }

  // Abandonner une quête en cours (fenêtre Quêtes) : l'avancement est perdu, elle redevient disponible.
  abandonQuest(id) {
    const r = Quests.abandon(this.ch, id);
    if (!r.ok) { this.toast(r.reason); return r; }
    this.toast(`Quête abandonnée : ${r.quest.name}`);
    this.emit('quest', { type: 'abandon', id });
    this.emit('update');
    this.emit('save');
    return r;
  }

  // L'ordre de faction, au rang 3 (fenêtre Faction).
  chooseOrder(order) {
    const r = Factions.chooseOrder(this.ch, order);
    if (!r.ok) { this.toast(r.reason); return r; }
    this.factionEvents(r.events);
    this.emit('update');
    this.emit('save');
    return r;
  }

  // Serment, rang, ordre, reniement, confiance : l'interface les annonce.
  factionEvents(events) {
    for (const ev of events || []) this.emit('faction', ev);
  }

  // Quêtes dont une étape vient d'avancer : la discussion et le suivi l'écrivent ; une quête finie
  // dit en plus à qui la rendre.
  afterEvents(touched) {
    for (const t of touched || []) {
      if (t.finished) this.toast(`${t.quest.name} : terminé, à rendre à ${Quests.npcName(Quests.turnInOf(t.quest))}.`);
    }
    if (touched && touched.length) this.emit('questProgress', touched);
  }

  // Une quantité d'objets valable : entière, de 1 à 999. Ce sont les règles qu'appliquera le serveur.
  static okCount(n) { return Number.isInteger(n) && n >= 1 && n <= 999; }

  buy(id, n) {
    const d = Items.get(id);
    n = n == null ? 1 : Number(n);
    if (!d || !World.okCount(n) || !Number.isFinite(this.ch.fils)) return false;
    // On n'achète qu'à un marchand ouvert, et seulement ce qu'il vend.
    const shop = this.talkNpc && this.talkNpc.def.shop;
    if (!shop || !shop.includes(id)) return false;
    const cost = d.price * n;
    if (this.ch.fils < cost) { this.toast('Pas assez de Fils.'); return false; }
    this.ch.fils -= cost;
    this.ch.addItem(id, n);
    this.emit('gain', { source: 'achat', items: [{ id, count: n }] });
    this.afterEvents(Quests.onEvent(this.ch, { type: 'inventory' }));
    this.emit('update');
    return true;
  }

  sell(id, n) {
    const d = Items.get(id);
    n = n == null ? 1 : Number(n);
    if (!d || !World.okCount(n) || !this.ch.has(id, n) || this.state === 'combat') return false;
    this.ch.removeItem(id, n);
    const gain = Items.sellPrice(d) * n;
    this.ch.fils += gain;
    this.ch.counters.filsEarned += gain;
    this.checkAchievements();
    this.emit('update');
    return true;
  }

  craft(recipe) {
    // On fabrique à l'atelier du PNJ à qui l'on parle.
    if (!recipe || !this.talkNpc || this.talkNpc.def.workshop !== recipe.workshop) return false;
    const cost = this.recipeCost(recipe);
    for (const ing of cost) if (!this.ch.has(ing.id, ing.count)) { this.toast('Il manque des ingrédients.'); return false; }
    for (const ing of cost) this.ch.removeItem(ing.id, ing.count);
    this.ch.addItem(recipe.result, recipe.count || 1);
    this.ch.counters.crafts++;
    this.emit('gain', { source: 'artisanat', items: [{ id: recipe.result, count: recipe.count || 1 }] });
    this.afterEvents(Quests.onEvent(this.ch, { type: 'inventory' }));
    this.checkAchievements();
    this.emit('update');
    this.emit('save');
    return true;
  }

  // `want` : l'emplacement visé pour un anneau (anneau1 ou anneau2). Retourne { ok, slot } ou false.
  equip(id, want) {
    const r = this.ch.equip(id, want);
    if (!r.ok) { this.toast(r.reason); return false; }
    this.emit('equip', { id, slot: r.slot });
    this.afterEvents(Quests.onEvent(this.ch, { type: 'equip', slot: r.slot }));
    this.checkAchievements();
    this.emit('update');
    return r;
  }

  useItem(id) {
    const r = this.ch.use(id);
    if (r === 'relais') { this.teleportToRelay(); return true; }
    if (r) this.toast(r);
    this.emit('update');
    return !!r;
  }

  // ----- Récolte, relais, donjons -----

  gather(node) {
    if (!node.ready) { this.toast('Rien à récolter pour l\'instant.'); return; }
    node.ready = false;
    node.readyAt = this.time + 60;
    this.mapStates[this.mapId].used[node.idx] = node.readyAt;
    this.persistTimer('used', node.idx, 60);
    const n = 1 + (this.rng() < 0.3 ? 1 : 0);
    this.ch.addItem(node.resource, n);
    this.ch.counters.gathers++;
    this.emit('gain', { source: 'recolte', items: [{ id: node.resource, count: n }] });
    for (let i = 0; i < n; i++) this.afterEvents(Quests.onEvent(this.ch, { type: 'gather', resource: node.resource }));
    this.afterEvents(Quests.onEvent(this.ch, { type: 'inventory' }));
    this.checkAchievements();
    this.emit('update');
  }

  useRelay() {
    if (this.ch.dungeon) { this.emit('dungeonLeavePrompt', World.dungeonDef(this.ch.dungeon.id)); return; }
    this.ch.relay = { map: this.mapId, x: this.relay.x, y: this.relay.y };
    this.relayOpen = true;
    if (!this.ch.relays.includes(this.mapId)) { this.ch.relays.push(this.mapId); this.toast('Relais du Fil enregistré.'); }
    this.state = 'panel';
    this.emit('relay', { here: this.mapId, known: this.ch.relays.map(id => ({ id, def: World.mapDef(id), zone: World.zoneOf(id) })) });
    this.emit('save');
  }

  // Seulement depuis un Relais du Fil, hors donjon et hors combat, vers un relais connu. La carte
  // du monde demande la même chose avant d'offrir « Voyager ».
  canTeleport(mapId) {
    return !!(this.relayOpen && !this.ch.dungeon && this.state !== 'combat' && this.ch.relays.includes(mapId) && World.mapDef(mapId));
  }

  teleport(mapId) {
    if (!this.canTeleport(mapId)) return false;
    this.relayOpen = false;
    this.state = 'explore';
    this.enter(mapId, { relay: true });
    this.emit('save');
    return true;
  }

  teleportToRelay() {
    const r = this.ch.relay || { map: World.firstMap() };
    this.enter(r.map, { relay: true });
    this.emit('save');
  }

  // ----- Veille du jour (js/veille.js) -----

  // Au tableau d'un Relais du Fil : son panneau est ouvert, ou le joueur se tient sur sa case. Pas
  // en donjon (la case d'arrivée d'une salle n'est pas un relais) ni en combat.
  atRelay() {
    if (!this.relay || this.ch.dungeon || (this.mapDef && this.mapDef.room) || this.state === 'combat') return false;
    return !!this.relayOpen || (this.player.x === this.relay.x && this.player.y === this.relay.y);
  }

  // Le dépôt du jour, ou d'une Veille en réserve, au Relais où l'on se tient. Retourne le résultat
  // de Veille.deposer ({ ok, raison } en cas de refus).
  veilleDeposer(date) {
    if (typeof Veille !== 'object') return { ok: false, raison: 'La Veille n\'est pas disponible.' };
    const r = Veille.deposer(this.ch, { date, auRelais: this.atRelay() });
    if (!r.ok) return r;
    if (r.levels) this.afterEvents(Quests.onEvent(this.ch, { type: 'level', level: this.ch.level }));
    this.afterEvents(Quests.onEvent(this.ch, { type: 'inventory' }));
    for (const g of r.succes) this.emit('achievement', g);
    this.emit('veille', r);
    this.emit('update');
    this.emit('save');
    return r;
  }

  // Les ingrédients d'une recette aujourd'hui : la Veille allège l'atelier du jour.
  recipeCost(recipe) {
    return typeof Veille === 'object' ? Veille.cout(this.ch, recipe) : recipe.ingredients;
  }

  // Le bonus de la Veille pour un combat gagné : XP par monstre, butin, texte ; neutre sans elle.
  static veilleBonus(ch, ctx) {
    return typeof Veille === 'object' ? Veille.combat(ch, ctx) : { xp: () => 1, butin: 1, texte: null };
  }

  closePanel() {
    this.relayOpen = false;
    if (this.state === 'panel') this.state = 'explore';
    this.emit('update');
  }

  enterDungeon(id) {
    const d = World.dungeonDef(id);
    if (!d) return false;
    if (d.keyItem && !this.ch.has(d.keyItem)) { this.toast(`Il faut ${Items.get(d.keyItem).name} pour entrer.`); return false; }
    if (d.keyItem) this.ch.removeItem(d.keyItem, 1);
    this.returnMap = { map: this.mapId, x: this.player.x, y: this.player.y };
    // Chaque entrée repart d'un donjon plein : les salles vaincues de la fois d'avant reviennent.
    for (let i = 0; i < d.rooms.length; i++) delete this.mapStates[`${id}#${i}`];
    this.enter(`${id}#0`, { relay: true });
    this.emit('save');
    return true;
  }

  leaveDungeon() {
    const d = this.ch.dungeon && World.dungeonDef(this.ch.dungeon.id);
    this.ch.dungeon = null;
    this.state = 'explore';
    const back = this.returnMap || (d && { map: d.entryMap });
    if (back) this.enter(back.map, back.x != null ? { x: back.x, y: back.y } : { relay: true });
    else this.teleportToRelay();
    this.emit('save');
  }

  // ----- Combat -----

  cellsAround(center, n, forbid) {
    const reach = Grid.reachable(this.map, center, 4, (x, y) => this.blockedForPlayer(x, y) || (forbid && forbid.some(c => c.x === x && c.y === y)));
    const cells = [...reach.dist.entries()].sort((a, b) => a[1] - b[1]).map(([k]) => { const [x, y] = k.split(',').map(Number); return { x, y }; });
    return cells.slice(0, n);
  }

  startFight(group) {
    this.state = 'combat';
    this.showCombat = true;
    this.currentGroup = group;
    group.hold = false;
    const knots = this.ch.activeKnots();
    // Nœud de Meute : un monstre de plus, copie d'un monstre du groupe.
    let monsters = group.monsters;
    if (knots.includes('noeud_de_meute') && monsters.length < 6) monsters = monsters.concat([monsters[Math.floor(this.rng() * monsters.length)]]);
    const monsterCells = this.cellsAround({ x: group.x, y: group.y }, 6, [this.player]);
    const playerCells = this.cellsAround({ x: this.player.x, y: this.player.y }, 6, monsterCells);
    const names = [...new Set(group.monsters.map(m => DATA.monsters[m.id].name))].join(', ');
    this.combat.setupFight({
      id: this.mapId, name: `${names} (niveau ${group.level})`, map: this.map,
      player: this.ch.toEntityDef(), monsters, knots,
      playerCells: playerCells.length ? playerCells : [{ x: this.player.x, y: this.player.y }],
      monsterCells: monsterCells.length ? monsterCells : [{ x: group.x, y: group.y }],
    });
    this.combat.challenge = Challenges.pick(this.combat, this.rng);
    this.combat.emit('challenge', this.combat.challenge);
    this.ch.counters.fights++;
    // Marque « combat en cours » : si la page se ferme avant la fin, le combat compte comme perdu.
    this.ch.fight = { map: this.mapId, at: Date.now() };
    this.emit('save');
    this.emit('fight', { group });
  }

  onFightEnd(d) {
    if (this.state !== 'combat') return;
    const ch = this.ch;
    delete ch.fight;
    const result = { victory: d.victory, xp: 0, gained: 0, levels: 0, fils: 0, drops: [], achievements: [], quests: [], dungeon: null };
    const monsters = this.combat.entities.filter(e => e.team === 'monster' && !e.isSummon);
    // Défi : réussi, il ajoute son bonus à l'XP et aux chances de butin.
    const chal = this.combat.challenge;
    const knotCount = this.combat.knots ? this.combat.knots.size : 0;
    const bonus = (d.victory && chal && chal.success ? chal.bonus : 0) + (d.victory ? knotCount * DATA.rules.knotBonus : 0);
    result.knots = knotCount;
    result.challenge = chal ? { name: chal.name, desc: chal.desc, success: chal.success, failed: chal.failed, bonus: chal.bonus } : null;
    ch.counters.feats = ch.counters.feats || {};
    if (d.victory) for (const k in this.combat.feats || {}) ch.counters.feats[k] = (ch.counters.feats[k] || 0) + this.combat.feats[k];
    if (d.victory && chal && chal.success) ch.counters.feats.defi = (ch.counters.feats.defi || 0) + 1;
    if (d.victory && knotCount) ch.counters.feats.noeuds_1 = (ch.counters.feats.noeuds_1 || 0) + 1;
    if (d.victory && knotCount >= 4) ch.counters.feats.noeuds_4 = (ch.counters.feats.noeuds_4 || 0) + 1;
    if (d.victory) {
      ch.counters.wins++;
      // Veille du jour, une fois le dépôt fait : plus d'XP dans une zone ou sur une famille, plus de
      // butin dans un donjon (js/veille.js).
      const veille = World.veilleBonus(ch, { zone: this.zone && this.zone.id, dungeon: ch.dungeon && ch.dungeon.id, monsters: monsters.map(e => e.def.id) });
      result.veille = veille.texte;
      // Prospection comme Dofus : 100 + Aqua / 10 ; chaque taux de butin est multiplié par elle / 100.
      const prospection = (ch.derived().prospection / 100) * (1 + bonus / 100) * veille.butin;
      for (const e of monsters) {
        result.xp += e.xp * veille.xp(e.def.id);
        ch.counters.kills[e.def.id] = (ch.counters.kills[e.def.id] || 0) + 1;
        if (e.boss && !ch.counters.bosses.includes(e.def.id)) ch.counters.bosses.push(e.def.id);
        // Bourse de la Nerith : un monstre achevé par un sort de vol rapporte + `lootBonus` % de
        // Fils et de chances de butin (js/combat.js, onDeath).
        const purse = 1 + (e.lootBonus || 0) / 100;
        result.fils += Math.round((1 + Math.floor(this.rng() * 3)) * e.level * purse);
        for (const drop of Items.dropsOf(e.def.id)) {
          if (this.rng() * 100 < drop.rate * prospection * purse) {
            const found = result.drops.find(x => x.id === drop.id);
            if (found) found.count++; else result.drops.push({ id: drop.id, count: 1 });
          }
        }
        result.quests.push(...Quests.onEvent(ch, { type: 'kill', monster: e.def.id }));
      }
      result.xp = Math.round(result.xp * (1 + bonus / 100));
      const g = ch.gainXp(result.xp);
      result.gained = g.gained; result.levels = g.levels;
      ch.fils += result.fils; ch.counters.filsEarned += result.fils;
      for (const dr of result.drops) ch.addItem(dr.id, dr.count);
      if (!g.levels) ch.hp = Math.max(1, this.combat.player.hp);
      if (g.levels) result.quests.push(...Quests.onEvent(ch, { type: 'level', level: ch.level }));
      result.quests.push(...Quests.onEvent(ch, { type: 'inventory' }));
      // Le groupe disparaît et réapparaîtra plus tard.
      if (this.currentGroup) {
        const st = this.mapStates[this.mapId];
        st.dead[this.currentGroup.idx] = this.time + (this.currentGroup.tpl.respawn || 45);
        this.persistTimer('dead', this.currentGroup.idx, this.currentGroup.tpl.respawn || 45);
        this.groups = this.groups.filter(g2 => g2 !== this.currentGroup);
      }
      if (ch.dungeon) {
        const dd = World.dungeonDef(ch.dungeon.id);
        ch.dungeon.turns = (ch.dungeon.turns || 0) + (this.combat.round || 1);
        if (ch.dungeon.room >= dd.rooms.length - 1) {
          if (!ch.counters.dungeons.includes(dd.id)) ch.counters.dungeons.push(dd.id);
          const best = ch.counters.dungeonTurns = ch.counters.dungeonTurns || {};
          best[dd.id] = Math.min(best[dd.id] || Infinity, ch.dungeon.turns);
          const rw = dd.rewards || {};
          if (rw.fils) { ch.fils += rw.fils; result.fils += rw.fils; ch.counters.filsEarned += rw.fils; }
          for (const it of rw.items || []) if (this.rng() * 100 < (it.rate == null ? 100 : it.rate) * veille.butin) { ch.addItem(it.id, it.count || 1); result.drops.push({ id: it.id, count: it.count || 1 }); }
          result.quests.push(...Quests.onEvent(ch, { type: 'dungeon', dungeon: dd.id }));
          result.dungeon = { def: dd, cleared: true, turns: ch.dungeon.turns };
          this.pending = 'exitDungeon';
          // La sauvegarde de fin de combat place déjà le personnage dehors : recharger sur cet
          // écran ne rouvre pas la salle du boss.
          this.returnMap = this.returnMap || { map: dd.entryMap };
          ch.dungeon = null;
          ch.pos = { map: this.returnMap.map, x: this.returnMap.x, y: this.returnMap.y };
        } else {
          result.dungeon = { def: dd, cleared: false, next: ch.dungeon.room + 1 };
          // La salle avance dès la victoire : recharger ne rejoue pas la salle gagnée.
          ch.dungeon.room += 1;
          ch.pos = null;
          this.pending = 'nextRoom';
        }
      }
    } else {
      ch.hp = Math.max(1, Math.round(ch.derived().hpMax * 0.5));
      this.pending = 'relay';
      if (ch.dungeon) ch.dungeon = null;
      // La sauvegarde place déjà le personnage au relais (et non dans la salle perdue).
      ch.pos = ch.relay ? { map: ch.relay.map, x: ch.relay.x, y: ch.relay.y } : null;
    }
    result.achievements = this.checkAchievements(true);
    this.lastResult = result;
    this.state = 'panel';
    this.emit('fightEnd', result);
    if (d.victory) this.emit('gain', { source: 'combat', xp: result.gained, fils: result.fils, items: result.drops.map(x => ({ id: x.id, count: x.count })) });
    if (result.levels) this.emit('levelUp', { level: ch.level, levels: result.levels });
    this.emit('save');
  }

  // Quitter un combat en cours : il compte comme perdu (moitié des PV, retour au Relais), comme un
  // combat laissé ouvert à la fermeture de la page (js/main.js).
  abandonFight() {
    if (this.state !== 'combat' || this.combat.phase === 'ended' || this.combat.busy) return false;
    this.ch.counters.abandons = (this.ch.counters.abandons || 0) + 1;
    this.combat.log(`${this.ch.name} quitte le combat.`, 'system');
    this.combat.finish(false);
    return true;
  }

  // Un allié mené par l'IA (le guide du premier combat, js/guide.js) : une entité du camp du joueur,
  // jouée comme une invocation sans maître. Elle ne compte ni pour la victoire ni pour la défaite,
  // ne rapporte pas d'XP et n'entre pas dans la limite d'invocations.
  addAlly(def) {
    const cb = this.combat;
    if (this.state !== 'combat' || cb.phase !== 'placement' || !def) return null;
    const cells = ((cb.placementCells && cb.placementCells.player) || []).filter(c => !cb.entityAt(c.x, c.y));
    const cell = cells.sort((a, b) => Grid.dist(a, cb.player.pos) - Grid.dist(b, cb.player.pos))[0] || cb.freeCellNear(cb.player.pos, 3);
    if (!cell) return null;
    const e = new Entity(def, 'player', cb.nextId++, cb.rng, def.level);
    e.isSummon = true;
    e.ally = true;
    cb.place(e, cell.x, cell.y);
    cb.entities.push(e);
    cb.log(`${e.name} se joint au combat.`, 'player');
    cb.emit('update');
    return e;
  }

  // Garde une minuterie de la carte courante en heure réelle, et oublie celles qui sont passées.
  persistTimer(kind, idx, seconds) {
    if (!this.mapId || this.mapDef.room) return;
    const now = Date.now();
    const all = this.ch.mapTimers = this.ch.mapTimers || {};
    for (const m in all) {
      for (const k of ['dead', 'used']) for (const i in all[m][k] || {}) if (all[m][k][i] <= now) delete all[m][k][i];
      if (!Object.keys(all[m].dead || {}).length && !Object.keys(all[m].used || {}).length) delete all[m];
    }
    const t = all[this.mapId] = all[this.mapId] || { dead: {}, used: {} };
    t[kind][idx] = now + seconds * 1000;
  }

  // Après l'écran de fin de combat : salle suivante, sortie du donjon, retour au relais, ou rien.
  resume() {
    const p = this.pending;
    this.pending = null;
    this.showCombat = false;
    this.state = 'explore';
    if (p === 'nextRoom') this.enter(`${this.ch.dungeon.id}#${this.ch.dungeon.room}`, { relay: true });
    else if (p === 'exitDungeon') this.leaveDungeon();
    else if (p === 'relay') this.teleportToRelay();
    else this.emit('map', { mapId: this.mapId, def: this.mapDef, zone: this.zone });
    this.emit('save');
  }

  checkAchievements(silent) {
    const got = Achievements.check(this.ch);
    for (const g of got) if (!silent) this.emit('achievement', g);
    if (got.length && !silent) this.emit('save');
    return got;
  }

  // ----- Récompenses de succès -----
  // Un succès débloqué attend qu'on vienne chercher son XP, ses Fils et ses objets ; chacun ne se
  // remet qu'une fois (Achievements.claim). Pas pendant un combat : le personnage du combat ne
  // changerait pas de niveau. Émet 'claim' avec ce qui a été gagné.

  claimAchievement(id) {
    if (this.state === 'combat') return null;
    const got = Achievements.claim(this.ch, id);
    if (got) this.afterClaim([got]);
    return got;
  }

  claimAllAchievements() {
    if (this.state === 'combat') return [];
    const all = Achievements.pending(this.ch).map(a => Achievements.claim(this.ch, a.id)).filter(Boolean);
    if (all.length) this.afterClaim(all);
    return all;
  }

  afterClaim(list) {
    if (list.some(g => g.levels)) this.afterEvents(Quests.onEvent(this.ch, { type: 'level', level: this.ch.level }));
    if (list.some(g => g.items.length)) this.afterEvents(Quests.onEvent(this.ch, { type: 'inventory' }));
    this.emit('claim', list);
    this.checkAchievements();
    this.emit('update');
    this.emit('save');
  }
}
