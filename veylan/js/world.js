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
    this.plateau = null;             // le plateau continu courant (js/plateau.js), ou null sur une carte à cases
    this.state = 'explore';          // explore | combat | dialogue | panel
    this.showCombat = false;         // le rendu affiche le combat (jusqu'au retour au monde)
    this.mapStates = {};             // mapId -> { dead: { idx: respawnAt }, used: { idx: readyAt } }
    this.time = 0;
    this.regenAcc = 0;
    this.saveAcc = 0;
    this.currentGroup = null;
    this.pending = null;             // action à faire quand le joueur ferme l'écran de fin de combat
    this.lastResult = null;
    // Les cartes de plateau (Ervane) demandent le rendu 3D (js/scene.js, étape a2) : sans lui, le
    // jeu passe `plateaux: false` et le monde les refuse au lieu de planter au rendu des cases.
    this.plateauxPermis = opts.plateaux !== false;
    this.combat.on('end', d => this.onFightEnd(d));
  }

  on(evt, fn) { (this.listeners[evt] = this.listeners[evt] || []).push(fn); }
  off(evt, fn) { const l = this.listeners[evt]; if (!l) return; const i = l.indexOf(fn); if (i >= 0) l.splice(i, 1); }
  // Les événements que le guide et la discussion suivent passent aussi par le bus (js/util.js).
  emit(evt, data) {
    for (const fn of this.listeners[evt] || []) fn(data);
    if (World.PUBLIC.has(evt) && typeof Bus === 'object') Bus.emit(evt, data);
  }
  static get PUBLIC() {
    return World._public || (World._public = new Set(['map', 'dialogue', 'fight', 'fightEnd', 'quest', 'questProgress', 'reward', 'relay', 'arrive', 'groupPopup', 'equip', 'gain', 'levelUp', 'zone', 'zoneProche', 'passage']));
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
  // La première carte d'un personnage : le Métier d'Ervane pour un personnage né sur l'île (quand
  // l'île est chargée), sinon la première carte du contenu.
  static firstMap(ch) {
    if (ch && ch.origine === 'ervane' && typeof Ile === 'object' && Ile.actif() && DATA.ile && World.mapDef(DATA.ile.naissance.map)) return DATA.ile.naissance.map;
    const z = ((DATA.content && DATA.content.zones) || [])[0]; return z && z.maps[0] ? z.maps[0].id : null;
  }
  // Une carte de plateau, ou une salle d'un donjon dont l'entrée est sur un plateau, quand le rendu
  // 3D manque (`plateaux: false`) : refusée, avec un mot. Toute autre carte est acceptée ici.
  accessible(mapId) {
    if (this.plateauxPermis || typeof Ile !== 'object' || typeof mapId !== 'string') return true;
    if (!(mapId.includes('#') ? Ile.donjon3D(mapId) : Ile.estPlateau(mapId))) return true;
    // Un seul mot par instant du monde (le départ essaie la carte sauvegardée, puis le Métier).
    if (this.refusA !== this.time) { this.refusA = this.time; this.toast('Ervane ne s\'affiche pas encore sur cet appareil.'); }
    return false;
  }
  // Quitter le plateau courant : il rend son écouteur au monde.
  libererPlateau() {
    if (this.plateau) this.plateau.liberer();
    this.plateau = null;
  }
  // Après l'application d'un module de contenu (js/ile.js) : l'index sera refait.
  static reindexer() { World._index = null; }

  // ----- Entrée sur une carte -----

  // arrival : { x, y } | { side: 'n'|'s'|'e'|'w' } (par quelle sortie on arrive) | { relay: true } | vide ;
  // sur un plateau, aussi { lieu } (un lieu nommé du plateau).
  enter(mapId, arrival) {
    arrival = arrival || {};
    let def, zone;
    if (typeof mapId !== 'string') return false;
    if (mapId.includes('#')) {
      // Une salle de donjon : « id_du_donjon#numéro ».
      const [did, idx] = mapId.split('#');
      const d = World.dungeonDef(did);
      const room = d && d.rooms[Number(idx)];
      if (!room) return false;
      if (!this.accessible(mapId)) return false;
      // Refusée avant de toucher à ch.dungeon : un refus laisse le personnage comme il était.
      if (!Array.isArray(room.layout)) { this.toast('Cette carte ne peut pas s\'afficher.'); return false; }
      def = { id: mapId, name: `${d.name} : ${room.name}`, layout: room.layout, exits: {}, npcs: [], nodes: [],
        groups: [{ monsters: room.monsters.map(m => m.id), levels: room.monsters.map(m => m.level), respawn: 0 }], dungeon: null, relay: true, room: true, dungeonId: did, roomIndex: Number(idx) };
      zone = World.zoneOf(d.entryMap) || { id: d.zone, name: d.name, palette: 'orsane', level: d.level };
      // Les tours se cumulent d'une salle à l'autre : le succès « en moins de N tours » compte la course entière.
      const prev = this.ch.dungeon;
      this.ch.dungeon = { id: did, room: Number(idx), turns: prev && prev.id === did && Number(idx) > 0 ? (prev.turns || 0) : 0 };
      // Le point de retour d'un donjon entré depuis un plateau (docs/ILE-TECHNIQUE.md, 6.3) suit
      // d'une salle à l'autre, et survit à un rechargement.
      if (prev && prev.id === did && prev.retour) this.ch.dungeon.retour = prev.retour;
    } else {
      def = World.mapDef(mapId);
      zone = World.zoneOf(mapId);
      if (!def) return false;
      if (def.plateau) return this.accessible(mapId) ? this.enterPlateau(mapId, def, zone, arrival) : false;
      // Une carte sans plan ni plateau est refusée (Grid.create retomberait sans bruit sur l'arène
      // du laboratoire), avant de toucher à ch.dungeon.
      if (!Array.isArray(def.layout)) { this.toast('Cette carte ne peut pas s\'afficher.'); return false; }
      this.ch.dungeon = null;
    }
    this.libererPlateau();
    this.mapId = mapId;
    this.mapDef = def;
    this.zone = zone;
    this.map = Grid.create(def.layout);
    // Une salle d'un donjon dont l'entrée est sur un plateau (le Puits de l'Amarre) : le rendu 3D
    // ancre l'aire du combat sur la salle elle-même (js/ile-3d.js, majArene).
    if (def.room && typeof Ile === 'object' && Ile.donjon3D(mapId)) this.map.ancre = { salle: mapId, x0: 0, y0: 0 };
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
    // Un donjon `entreeEnCombat` (le Puits de l'Amarre, 6.3) : chaque salle lance son combat dès
    // qu'on y entre, après un court plan de la salle ; d'ici là, toucher le sol ne fait rien.
    const dd = def.room ? World.dungeonDef(def.dungeonId) : null;
    this.combatAuto = dd && dd.entreeEnCombat && this.groups.length ? { at: this.time + 1.5, group: this.groups[0] } : null;
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

  // ----- Plateau continu (Ervane, docs/ILE-TECHNIQUE.md, 4.10) -----

  // Entrée sur une carte de plateau : le Plateau (repris s'il est le même) remplit PNJ, nœuds et
  // groupes et pose le Veilleur ; la suite (compteurs, quêtes, événement map, succès) est celle des
  // cartes à cases.
  enterPlateau(mapId, def, zone, arrival) {
    const pdef = typeof Ile === 'object' ? Ile.plateau(def.plateau) : null;
    if (!pdef) { this.toast('Cette carte ne peut pas s\'afficher.'); return false; }
    if (!this.plateau || this.plateau.id !== pdef.id) { this.libererPlateau(); this.plateau = new Plateau(pdef, this); }
    this.ch.dungeon = null;
    this.combatAuto = null;
    this.map = null; this.door = null; this.relay = null;
    this.mapId = mapId; this.mapDef = def; this.zone = zone;
    const ici = this.plateau.entrer(mapId, arrival);
    if (ici && ici !== mapId && World.mapDef(ici)) { mapId = ici; def = World.mapDef(ici); zone = World.zoneOf(ici); }
    this.mapId = mapId; this.mapDef = def; this.zone = zone;
    // ch.pos est déjà écrit par Plateau.placer (la sous-zone calculée, la position au centième).
    if (!this.ch.counters.maps.includes(mapId)) this.ch.counters.maps.push(mapId);
    this.afterEvents(Quests.onEvent(this.ch, { type: 'visit', map: mapId }));
    this.state = 'explore';
    this.emit('map', { mapId, def, zone, plateau: pdef.id });
    this.checkAchievements();
    this.emit('update');
    return true;
  }

  // Le Veilleur entre dans une autre sous-zone du plateau en marchant : pas de chargement, la
  // carte courante change. Émet map (avec secteur) et zone.
  changerSecteur(mapId) {
    const def = World.mapDef(mapId), zone = World.zoneOf(mapId);
    if (!this.plateau || !def || def.plateau !== this.plateau.id || mapId === this.mapId) return false;
    this.mapId = mapId; this.mapDef = def; this.zone = zone;
    this.plateau.noterPosition(mapId);
    const nouveau = !this.ch.counters.maps.includes(mapId);
    if (nouveau) this.ch.counters.maps.push(mapId);
    this.afterEvents(Quests.onEvent(this.ch, { type: 'visit', map: mapId }));
    this.emit('map', { mapId, def, zone, secteur: true, nouveau });
    this.emit('zone', { map: mapId, zone, nouveau });
    this.checkAchievements();
    this.emit('update');
    return true;
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
    // Le combat d'une salle `entreeEnCombat` part de lui-même, le plan de la salle vu.
    if (this.combatAuto && this.state === 'explore' && this.time >= this.combatAuto.at) {
      const g = this.combatAuto.group;
      this.combatAuto = null;
      if (this.groups.includes(g)) { this.startFight(g); return; }
    }
    if (this.state === 'explore' || this.state === 'panel' || this.state === 'dialogue') {
      if (this.plateau) this.plateau.update(dt);
      else {
        this.updatePlayer(dt);
        for (const g of this.groups) this.updateGroup(g, dt);
      }
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
  // Sur un plateau : un point { x, y, cible? } (4.4), confié au Plateau.
  tap(cell) {
    if (this.plateau) return this.state === 'explore' ? this.plateau.toucher(cell) : false;
    // Dans une salle dont le combat va partir seul, on ne marche pas case par case.
    if (this.combatAuto) return false;
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
  // Sur un plateau : s'arrêter à 1,5 u de la cible ; rend l'état de l'approche (4.4).
  approach(cell, action) {
    if (this.plateau) return this.plateau.approcher(cell, 1.5, action, 2.5);
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
    if (this.plateau) return this.plateau.allerA(cell.x, cell.y, action);
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
    // Surchargé (plus de pods que le maximum) : on ne marche plus, comme Dofus.
    if (path && path.length && this.ch && this.ch.surcharge()) { this.avertirSurcharge(); path = []; action = null; }
    p.path = path || [];
    p.moving = p.path.length > 0;
    p.onArrive = action || null;
    this.emit('path', p.path);
  }

  // « Tu es surchargé » : au plus une fois toutes les deux secondes.
  avertirSurcharge() {
    const t = Date.now();
    if (this.surchargeDit && t - this.surchargeDit < 2000) return;
    this.surchargeDit = t;
    const ch = this.ch;
    this.toast(`Tu es surchargé (${ch.pods()} / ${ch.derived().podsMax} pods) : allège ton sac pour avancer.`);
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
    if (this.plateau) return false;
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
    if (this.plateau) return [];
    const ex = (this.mapDef && this.mapDef.exits) || {};
    return ['n', 'e', 's', 'w'].filter(d => ex[d] && (this.map.exits[d] || []).length);
  }

  // Pose le Veilleur sur une case libre de la carte courante (le début du tutoriel).
  placeAt(x, y) {
    if (this.plateau) return this.plateau.poser(x, y);
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
    // Sur un plateau (4.4) : le Veilleur s'approche à 1,5 u du groupe (2,5 u au plus pour lancer),
    // puis le combat se joue sur l'aire du groupe. L'approche rend un état ; le groupe, qui attend,
    // est relâché par le rappel d'échec de Plateau.approcher : aucun chemin (tout de suite ou quand
    // la recherche découpée finit), ou le Veilleur arrivé trop loin pour lancer.
    if (this.plateau) {
      group.hold = true;
      const etat = this.plateau.approcher(group, 1.5, () => { if (this.state === 'explore' && this.groups.includes(group)) this.startFight(group); else group.hold = false; }, 2.5, () => { group.hold = false; });
      if (etat === 'impossible') { group.hold = false; return false; }
      return true;
    }
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
    // Sur un plateau, on parle à 3 u au plus (le moteur vérifie, comme le serveur le fera).
    if (this.plateau && (!npc || Plateau.dist(this.player, npc) > 3)) { this.toast('Trop loin pour parler.'); return false; }
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
      // Un passeur (la Nacelle d'Ervane, docs/ILE-TECHNIQUE.md, 2.9) : offert quand sa quête est faite.
      passage: this.passageDe(npc),
    };
  }

  // Le passage qu'un PNJ offre maintenant : { vers, arrivee, texte, quete }, ou null si sa quête
  // n'est pas faite.
  passageDe(npc) {
    const p = npc && npc.def && npc.def.passage;
    if (!p || !p.vers) return null;
    if (p.quete && !this.ch.quests.done.includes(p.quete)) return null;
    return p;
  }

  // Prendre le passage du PNJ à qui l'on parle (la Nacelle, dans les deux sens) : le dialogue se
  // ferme, le monde change de carte, la partie est sauvegardée. Faux si rien n'est offert.
  passage() {
    const npc = this.talkNpc, p = this.passageDe(npc);
    if (!p || this.state !== 'dialogue') return false;
    const a = p.arrivee || {};
    const arrivee = a.lieu ? { lieu: a.lieu } : (a.x != null && a.y != null ? { x: a.x, y: a.y } : { relay: true });
    this.endDialogue();
    if (!this.enter(p.vers, arrivee)) { this.toast('Le passage est fermé pour l\'instant.'); return false; }
    this.emit('passage', { vers: p.vers, npc: npc.id });
    this.emit('save');
    return true;
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
    if (this.plateau && Plateau.dist(this.player, node) > 2.5) { this.toast('Trop loin pour récolter.'); return; }
    if (!node.ready) { this.toast('Rien à récolter pour l\'instant.'); return; }
    node.ready = false;
    node.readyAt = this.time + 60;
    // La minuterie va sous la carte du nœud (sur un plateau, sa sous-zone).
    const carte = node.carte || this.mapId;
    (this.mapStates[carte] || (this.mapStates[carte] = { dead: {}, used: {} })).used[node.idx] = node.readyAt;
    this.persistTimer('used', node.idx, 60, carte);
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
    // Sur un plateau : le relais le plus proche à 3 u ; le point de retour prend sa carte.
    const r = this.plateau ? this.plateau.relaisProche(3) : { map: this.mapId, x: this.relay.x, y: this.relay.y };
    if (!r) { this.toast('Aucun Relais du Fil à portée.'); return; }
    this.ch.relay = { map: r.map, x: r.x, y: r.y };
    this.relayOpen = true;
    if (!this.ch.relays.includes(r.map)) { this.ch.relays.push(r.map); this.toast('Relais du Fil enregistré.'); }
    this.state = 'panel';
    this.emit('relay', { here: this.mapId, known: this.ch.relays.map(id => ({ id, def: World.mapDef(id), zone: World.zoneOf(id) })) });
    this.emit('save');
  }

  // Seulement depuis un Relais du Fil, hors donjon et hors combat, vers un relais connu. La carte
  // du monde demande la même chose avant d'offrir « Voyager ».
  canTeleport(mapId) {
    return !!(this.relayOpen && !this.ch.dungeon && this.state !== 'combat' && this.ch.relays.includes(mapId) && World.mapDef(mapId) && (this.plateauxPermis || typeof Ile !== 'object' || !Ile.estPlateau(mapId)));
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
    const r = this.ch.relay || { map: World.firstMap(this.ch) };
    // Un personnage d'Ervane sans relais revient au Métier.
    const naissance = !this.ch.relay && this.ch.origine === 'ervane' && DATA.ile && r.map === DATA.ile.naissance.map;
    this.enter(r.map, naissance ? { lieu: DATA.ile.naissance.lieu } : { relay: true });
    this.emit('save');
  }

  // ----- Veille du jour (js/veille.js) -----

  // Au tableau d'un Relais du Fil : son panneau est ouvert, ou le joueur se tient sur sa case. Pas
  // en donjon (la case d'arrivée d'une salle n'est pas un relais) ni en combat.
  atRelay() {
    if (this.plateau) return !this.ch.dungeon && this.state !== 'combat' && (!!this.relayOpen || !!this.plateau.relaisProche(3));
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

  // La condition d'entrée d'un donjon (`entree: { niveau, quete }`, docs/ILE-TECHNIQUE.md, 6.1) :
  // le niveau, et la quête acceptée ou finie. Rend { ok, reason }.
  canEnterDungeon(d) {
    const e = d && d.entree;
    if (!e) return { ok: true };
    if (e.niveau && this.ch.level < e.niveau) return { ok: false, reason: `Il faut être niveau ${e.niveau} pour entrer.` };
    if (e.quete && !(this.ch.quests.active[e.quete] || this.ch.quests.done.includes(e.quete))) {
      const q = Quests.get(e.quete);
      return { ok: false, reason: `Il faut d'abord accepter la quête « ${q ? q.name : e.quete} ».` };
    }
    return { ok: true };
  }

  enterDungeon(id) {
    const d = World.dungeonDef(id);
    if (!d) return false;
    const c = this.canEnterDungeon(d);
    if (!c.ok) { this.toast(c.reason); return false; }
    if (d.keyItem && !this.ch.has(d.keyItem)) { this.toast(`Il faut ${Items.get(d.keyItem).name} pour entrer.`); return false; }
    if (d.keyItem) this.ch.removeItem(d.keyItem, 1);
    this.returnMap = { map: this.mapId, x: this.player.x, y: this.player.y };
    // Chaque entrée repart d'un donjon plein : les salles vaincues de la fois d'avant reviennent.
    for (let i = 0; i < d.rooms.length; i++) delete this.mapStates[`${id}#${i}`];
    if (!this.enter(`${id}#0`, { relay: true })) return false;
    // Depuis un plateau, le point de retour (position continue) est sauvegardé avec le donjon.
    if (this.ch.dungeon && typeof Ile === 'object' && Ile.estPlateau(this.returnMap.map)) this.ch.dungeon.retour = { map: this.returnMap.map, x: Plateau.arrondi(this.returnMap.x), y: Plateau.arrondi(this.returnMap.y) };
    this.emit('save');
    return true;
  }

  leaveDungeon() {
    const dg = this.ch.dungeon, d = dg && World.dungeonDef(dg.id);
    this.ch.dungeon = null;
    this.state = 'explore';
    this.combatAuto = null;
    // Le point de retour : celui de la partie en cours, sinon celui sauvegardé avec le donjon
    // (après un rechargement en pleine salle), sinon l'entrée du donjon.
    const back = this.returnMap || (dg && dg.retour) || (d && { map: d.entryMap });
    if (back) this.enter(back.map, back.x != null ? { x: back.x, y: back.y } : { relay: true });
    else this.teleportToRelay();
    this.emit('save');
  }

  // ----- Combat -----

  // Les `n` cases les plus proches de `center` (4 pas au plus). `map` : une aire de combat (un
  // plateau, 5.1), où seules les cases interdites comptent (ni PNJ, ni groupe, ni nœud dessus).
  cellsAround(center, n, forbid, map) {
    const interdite = (x, y) => !!(forbid && forbid.some(c => c.x === x && c.y === y));
    const reach = map ? Grid.reachable(map, center, 4, interdite) : Grid.reachable(this.map, center, 4, (x, y) => this.blockedForPlayer(x, y) || (forbid && forbid.some(c => c.x === x && c.y === y)));
    const cells = [...reach.dist.entries()].sort((a, b) => a[1] - b[1]).map(([k]) => { const [x, y] = k.split(',').map(Number); return { x, y }; });
    return cells.slice(0, n);
  }

  startFight(group) {
    // Sur un plateau, le combat se joue sur l'aire du groupe (Plateau.arene) ; sans plan, pas de
    // combat.
    const arene = this.plateau ? this.plateau.arene(group) : null;
    if (this.plateau && !arene) { if (group) group.hold = false; this.toast('Ce combat n\'est pas prêt.'); return false; }
    if (arene) this.plateau.ecarterGroupes(group);
    this.state = 'combat';
    this.showCombat = true;
    this.currentGroup = group;
    group.hold = false;
    const knots = this.ch.activeKnots();
    // Nœud de Meute : un monstre de plus, copie d'un monstre du groupe.
    let monsters = group.monsters;
    if (knots.includes('noeud_de_meute') && monsters.length < 6) monsters = monsters.concat([monsters[Math.floor(this.rng() * monsters.length)]]);
    const monsterCells = arene ? arene.monsterCells : this.cellsAround({ x: group.x, y: group.y }, 6, [this.player]);
    const playerCells = arene ? arene.playerCells : this.cellsAround({ x: this.player.x, y: this.player.y }, 6, monsterCells);
    const names = [...new Set(group.monsters.map(m => DATA.monsters[m.id].name))].join(', ');
    this.combat.setupFight({
      id: this.mapId, name: `${names} (niveau ${group.level})`, map: arene ? arene.map : this.map,
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
        // La minuterie va sous la carte du groupe (sur un plateau, sa sous-zone, 4.5).
        const carte = this.currentGroup.carte || this.mapId;
        const st = this.mapStates[carte] || (this.mapStates[carte] = { dead: {}, used: {} });
        st.dead[this.currentGroup.idx] = this.time + (this.currentGroup.tpl.respawn || 45);
        this.persistTimer('dead', this.currentGroup.idx, this.currentGroup.tpl.respawn || 45, carte);
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
          // écran ne rouvre pas la salle du boss. Le point de retour sauvegardé avec le donjon sert
          // après un rechargement en pleine salle.
          this.returnMap = this.returnMap || ch.dungeon.retour || { map: dd.entryMap };
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
    // Les étapes `kills` à faire en un seul combat repartent de zéro si ce combat ne les a pas remplies.
    result.quests.push(...Quests.onEvent(ch, { type: 'fightEnd', victory: !!d.victory }));
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

  // Garde une minuterie en heure réelle, et oublie celles qui sont passées. `carte` : la carte du
  // groupe ou du nœud (sur un plateau, sa sous-zone) ; par défaut la carte courante.
  persistTimer(kind, idx, seconds, carte) {
    if (!this.mapId || this.mapDef.room) return;
    carte = carte || this.mapId;
    const now = Date.now();
    const all = this.ch.mapTimers = this.ch.mapTimers || {};
    for (const m in all) {
      for (const k of ['dead', 'used']) for (const i in all[m][k] || {}) if (all[m][k][i] <= now) delete all[m][k][i];
      if (!Object.keys(all[m].dead || {}).length && !Object.keys(all[m].used || {}).length) delete all[m];
    }
    const t = all[carte] = all[carte] || { dead: {}, used: {} };
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
    else if (this.plateau) {
      // Sur un plateau, après une victoire : le Veilleur reprend sa case finale (5.3), sans voyage ;
      // `apresCombat` dit au rendu de revenir à l'exploration en douceur, sans saut de caméra.
      this.plateau.apresCombat(this.combat);
      this.emit('map', { mapId: this.mapId, def: this.mapDef, zone: this.zone, plateau: this.plateau.id, apresCombat: true });
    } else this.emit('map', { mapId: this.mapId, def: this.mapDef, zone: this.zone });
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
