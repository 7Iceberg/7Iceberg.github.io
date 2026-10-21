// Moteur de combat : placement, ordre des tours, déplacements, sorts et effets, invocations,
// pièges, obstacles temporaires, déclencheurs des monstres, IA.
// Le moteur ne connaît pas le DOM : il émet des événements que le rendu et l'interface écoutent.
class Combat {
  constructor(opts) {
    this.rng = opts.rng || Math.random;
    this.turnSeconds = opts.turnSeconds || DATA.rules.turnSeconds;
    this.aiDelay = opts.aiDelay == null ? 350 : opts.aiDelay;
    this.map = Grid.create();
    this.entities = [];
    this.order = [];
    this.temp = new Map();        // clé de case -> { kind: 'rock' | 'water' | 'fente', owner, turnsLeft }
    this.traps = [];              // { x, y, owner, name, element, effects, expiresRound }
    this.glyphs = [];             // { owner, name, element, cells, turnsLeft, affects, effects } (docs/FECA-ANALYSE.md)
    this.phase = 'placement';     // 'placement' | 'battle' | 'ended'
    this.round = 0;
    this.turnIndex = -1;
    this.actor = null;
    this.busy = false;            // une action est en cours d'animation
    this.gen = 0;                 // incrémenté à chaque nouveau combat, pour couper les IA en cours
    this.nextId = 1;
    this.floodLevel = 0;
    this.turnTimer = null;
    this.turnEndsAt = 0;
    this.listeners = {};
  }

  // ----- Événements -----

  on(evt, fn) {
    (this.listeners[evt] = this.listeners[evt] || []).push(fn);
  }

  emit(evt, data) {
    for (const fn of this.listeners[evt] || []) fn(data);
  }

  // Les écouteurs d'animation retournent une promesse ; on attend qu'elles soient toutes résolues.
  async emitAsync(evt, data) {
    const results = [];
    for (const fn of this.listeners[evt] || []) results.push(fn(data));
    await Promise.all(results);
  }

  log(msg, kind) {
    this.emit('log', { msg, kind: kind || 'info' });
  }

  // ----- Mise en place -----

  setup(encounter, classId) {
    this.gen++;
    this.clearTimer();
    this.busy = false;
    this.encounter = encounter;
    this.classId = DATA.classes[classId] ? classId : DATA.defaultClass;
    this.entities = [];
    this.order = [];
    this.temp = new Map();
    this.traps = [];
    this.glyphs = [];
    this.floodLevel = 0;
    this.nextId = 1;
    const player = new Entity(DATA.classes[this.classId], 'player', this.nextId++, this.rng);
    this.player = player;
    this.feats = {};
    this.challenge = null;
    this.knots = new Set();
    this.entities.push(player);
    const reds = this.map.starts.monster.slice();
    for (const mid of encounter.monsters) {
      const m = new Entity(DATA.monsters[mid], 'monster', this.nextId++, this.rng);
      const c = reds.splice(Math.floor(this.rng() * reds.length), 1)[0];
      this.place(m, c.x, c.y);
      this.entities.push(m);
    }
    const blues = this.map.starts.player;
    const b = blues[Math.floor(this.rng() * blues.length)];
    this.place(player, b.x, b.y);
    this.placementCells = null;
    this.phase = 'placement';
    this.round = 0;
    this.turnIndex = -1;
    this.actor = null;
    this.emit('setup');
    this.log(`${player.name} contre ${encounter.name}. Choisis ta case de départ (en bleu), puis « Prêt ».`, 'system');
  }

  // Combat dans le monde : la carte courante, le personnage du joueur déjà calculé (voir
  // Character.toEntityDef), des monstres à niveau, et des cases de placement pour chaque camp.
  setupFight(opts) {
    this.gen++;
    this.clearTimer();
    this.busy = false;
    this.map = opts.map || this.map;
    this.encounter = { id: opts.id || 'monde', name: opts.name || 'Combat', monsters: opts.monsters.map(m => m.id) };
    this.classId = opts.player.classId || this.classId;
    this.entities = [];
    this.order = [];
    this.temp = new Map();
    this.traps = [];
    this.glyphs = [];
    this.floodLevel = 0;
    this.nextId = 1;
    const player = new Entity(opts.player, 'player', this.nextId++, this.rng);
    if (opts.player.hpCurrent != null) player.hp = Math.max(1, Math.min(player.hpMax, opts.player.hpCurrent));
    this.player = player;
    this.entities.push(player);
    this.feats = {};
    this.challenge = opts.challenge || null;
    this.knots = new Set(opts.knots || []);
    this.placementCells = { player: opts.playerCells.slice(), monster: opts.monsterCells.slice() };
    const reds = opts.monsterCells.slice();
    for (const m of opts.monsters) {
      const e = new Entity(DATA.monsters[m.id], 'monster', this.nextId++, this.rng, m.level);
      const c = reds.length ? reds.splice(Math.floor(this.rng() * reds.length), 1)[0] : this.freeCellNear(opts.monsterCells[0]);
      if (c) this.place(e, c.x, c.y);
      this.entities.push(e);
    }
    const b = opts.playerCells[Math.floor(this.rng() * opts.playerCells.length)];
    this.place(player, b.x, b.y);
    this.phase = 'placement';
    this.round = 0;
    this.turnIndex = -1;
    this.actor = null;
    this.emit('setup');
    this.log(`${this.encounter.name}. Choisis ta case de départ (en bleu), puis « Prêt ».`, 'system');
  }

  place(e, x, y) {
    e.x = x; e.y = y; e.rx = x; e.ry = y;
  }

  entityAt(x, y) {
    return this.entities.find(e => e.alive && e.x === x && e.y === y) || null;
  }

  isStartCell(team, x, y) {
    const cells = this.placementCells ? this.placementCells[team] : this.map.starts[team];
    return cells.some(c => c.x === x && c.y === y);
  }

  placePlayer(x, y) {
    if (this.phase !== 'placement') return false;
    if (!this.isStartCell('player', x, y) || this.entityAt(x, y)) return false;
    this.place(this.player, x, y);
    this.emit('update');
    return true;
  }

  start() {
    if (this.phase !== 'placement') return;
    this.phase = 'battle';
    this.order = this.entities.slice().sort((a, b) => b.initiative - a.initiative);
    this.round = 1;
    this.turnIndex = -1;
    this.log('Le combat commence.', 'system');
    for (const e of this.entities.slice()) if (e.alive) this.fireTriggers(e, 'fightStart', {});
    this.applyKnots();
    this.hook('onStart');
    this.emit('start');
    this.nextTurn();
  }

  // Les Nœuds noués par le joueur durcissent le combat (js/noeuds.js).
  applyKnots() {
    if (!this.knots || !this.knots.size) return;
    const p = this.player;
    const foes = this.entities.filter(e => e.team === 'monster' && !e.isSummon);
    if (this.knots.has('noeud_lourd')) p.addEffect({ type: 'pm', value: -1, turns: 999 }, false);
    if (this.knots.has('noeud_serre')) p.addEffect({ type: 'pa', value: -2, turns: 1 }, false);
    if (this.knots.has('noeud_de_garde')) for (const m of foes) m.addEffect({ type: 'shield', value: Math.round(m.hpMax / 5), turns: 2 }, false);
    if (this.knots.has('noeud_de_fer')) for (const m of foes) m.unpushable = true;
    if (this.knots.has('noeud_d_ombre') && foes.length) {
      const m = foes[Math.floor(this.rng() * foes.length)];
      m.triggers = m.triggers.concat([{ when: 'turnStart', do: [{ act: 'toggleState', name: 'invisible' }] }]);
    }
    const names = [...this.knots].map(id => { const k = DATA.knots.find(x => x.id === id); return k ? k.name : id; });
    this.log(`Nœuds noués : ${names.join(', ')}.`, 'system');
  }

  // Le défi du combat, s'il y en a un, suit ce qui se passe (js/challenges.js).
  hook(name, ...args) {
    if (this.challenge && this.challenge.event(name, this, ...args)) this.emit('challenge', this.challenge);
  }

  // ----- Terrain -----

  tempAt(x, y) {
    return this.temp.get(Grid.key(x, y)) || null;
  }

  // Une case est franchissable selon le terrain, les obstacles temporaires et la nature de
  // l'entité : un ver de voile traverse les rochers, jamais les trous ni les fentes.
  isWalkable(x, y, e) {
    if (!Grid.inBounds(this.map, x, y)) return false;
    const t = Grid.tile(this.map, x, y);
    const tmp = this.tempAt(x, y);
    if (t === Grid.HOLE || t === Grid.WATER || (tmp && tmp.kind === 'fente')) return false;
    if (t === Grid.ROCK || t === Grid.TREE || (tmp && tmp.kind === 'rock')) return !!(e && e.ghost);
    return true;
  }

  blocksSight(x, y) {
    const tmp = this.tempAt(x, y);
    return Grid.blocksSight(this.map, x, y) || !!(tmp && tmp.kind === 'rock');
  }

  // Une entité invisible n'est vue que par son équipe ; une cible traquée (Marque du Traqueur) ne
  // peut plus se cacher.
  canSee(viewer, t) {
    return t.team === viewer.team || !t.hasState('invisible') || t.hasState('tracked');
  }

  // Ligne de vue pour `e` : rochers, murs temporaires et entités visibles bloquent ; pour une
  // flèche perçante (`terrainOnly`), seulement le terrain.
  hasLos(e, from, to, terrainOnly) {
    return Grid.hasLineOfSight(this.map, from, to, (x, y) => {
      if (this.blocksSight(x, y)) return true;
      if (terrainOnly) return false;
      const o = this.entityAt(x, y);
      return !!(o && o !== e && this.canSee(e, o));
    });
  }

  // Première case libre autour de `center`, en élargissant le rayon.
  freeCellNear(center, maxRadius) {
    for (let r = 0; r <= (maxRadius || 4); r++) {
      const ring = Grid.aoeCells(this.map, 'circle', r, center, center)
        .filter(c => Grid.dist(c, center) === r && this.isWalkable(c.x, c.y, null) && !this.entityAt(c.x, c.y));
      if (ring.length) return ring[Math.floor(this.rng() * ring.length)];
    }
    return null;
  }

  // ----- Tours -----

  // Les invocations ne comptent pas : un combat se gagne ou se perd sur les vrais combattants.
  alivePlayers() { return this.entities.filter(e => e.alive && e.team === 'player' && !e.isSummon); }
  aliveMonsters() { return this.entities.filter(e => e.alive && e.team === 'monster' && !e.isSummon); }
  allies(e) { return this.entities.filter(t => t.alive && t.team === e.team); }
  enemies(e) { return this.entities.filter(t => t.alive && t.team !== e.team); }
  summonsOf(e) { return this.entities.filter(t => t.alive && t.isSummon && t.owner === e); }

  // Peut-on invoquer ce monstre ? Un invocateur à jauge (le Fennal, sur le modèle de la jauge de
  // l'Osamodas en 3.2, docs/OSAMODAS-ANALYSE.md) paie chaque bête de son coût (`summonCost`) et n'a
  // qu'une bête de chaque espèce ; les autres gardent la limite commune. `planned` : bêtes déjà
  // prévues ce tour (bot). Retourne la raison du refus, ou null.
  summonBlock(e, monsterId, planned) {
    const mine = this.summonsOf(e);
    const gauge = e.def && e.def.summonGauge;
    if (!gauge) return mine.length + (planned || 0) >= DATA.rules.maxSummonsPerOwner ? `${DATA.rules.maxSummonsPerOwner} invocations au plus` : null;
    if (mine.some(m => m.def.id === monsterId)) return 'Une bête de chaque espèce';
    const cost = m => (DATA.monsters[m] && DATA.monsters[m].summonCost) || 1;
    const used = mine.reduce((n, m) => n + cost(m.def.id), 0) + (planned || 0);
    return used + cost(monsterId) > gauge ? `Jauge de meute : ${used} sur ${gauge}` : null;
  }

  checkEnd() {
    if (this.phase !== 'battle') return true;
    if (!this.alivePlayers().length) { this.finish(false); return true; }
    if (!this.aliveMonsters().length) { this.finish(true); return true; }
    return false;
  }

  finish(victory) {
    this.hook('onEnd', victory);
    this.phase = 'ended';
    this.actor = null;
    this.clearTimer();
    this.log(victory ? 'Victoire !' : 'Défaite.', 'system');
    this.emit('end', { victory });
  }

  nextTurn() {
    if (this.checkEnd()) return;
    for (let guard = 0; guard <= this.order.length; guard++) {
      this.turnIndex++;
      if (this.turnIndex >= this.order.length) {
        this.turnIndex = 0;
        this.round++;
        this.traps = this.traps.filter(t => t.expiresRound > this.round);
        // Les obstacles d'un propriétaire mort s'usent au changement de tour.
        for (const [k, tmp] of this.temp) {
          if (tmp.owner && !tmp.owner.alive && isFinite(tmp.turnsLeft) && --tmp.turnsLeft <= 0) this.temp.delete(k);
        }
        this.emit('round');
      }
      const e = this.order[this.turnIndex];
      if (e.alive) { this.beginTurn(e); return; }
    }
  }

  beginTurn(e) {
    this.actor = e;
    e.beginTurn();
    e.turnsPlayed = (e.turnsPlayed || 0) + 1;
    // Les obstacles posés par cette entité s'usent à chacun de ses tours.
    for (const [k, tmp] of this.temp) {
      if (tmp.owner === e && isFinite(tmp.turnsLeft) && --tmp.turnsLeft <= 0) this.temp.delete(k);
    }
    this.log(`Tour de ${e.name}` + (e === this.player ? ` : ${e.pa} PA, ${e.pm} PM.` : '.'), 'turn');
    this.tickDots(e);
    e.glyphThisTurn = false;
    e.telefragThisTurn = false;
    e.turnStartPos = { x: e.x, y: e.y };
    if (e.alive) this.applyGlyphs(e);
    this.ageGlyphs(e);
    // Sonné : il passe son tour, et ses déclencheurs de début de tour ne partent pas.
    const stunned = e.alive && e.hasState('stunned');
    if (e.alive && !stunned) this.fireTriggers(e, 'turnStart', {});
    if (e === this.player) this.hook('onTurnStart', e);
    this.emit('turn', e);
    if (this.checkEnd()) return;
    if (!e.alive) { this.actor = null; this.nextTurn(); return; }
    if (stunned || e.skipNow) {
      e.skipNow = false;
      this.log(stunned ? `${e.name} est sonné et passe son tour.` : `${e.name} passe son tour.`, 'system');
      this.skipTurn(e);
      return;
    }
    if (e.team === 'monster' || e.isSummon) this.runAI(e);
    else this.startTimer();
  }

  async skipTurn(e) {
    const gen = this.gen;
    await Util.delay(this.aiDelay);
    if (gen === this.gen && this.phase === 'battle' && this.actor === e && !this.busy) this.endTurn();
  }

  // Les brûlures et saignements frappent au début du tour de celui qui les subit.
  tickDots(e) {
    for (const f of e.effects.filter(f => f.type === 'dot')) {
      if (!e.alive) break;
      this.dealDamage(null, e, this.scaleByResist(e, f.element, f.value), f.element, { label: 'brûlure' });
    }
  }

  startTimer() {
    this.clearTimer();
    this.turnEndsAt = Date.now() + this.turnSeconds * 1000;
    this.turnTimer = setTimeout(() => this.timerFired(), this.turnSeconds * 1000);
  }

  timerFired() {
    if (this.phase !== 'battle' || !this.actor || this.actor !== this.player) return;
    if (this.busy) { this.turnTimer = setTimeout(() => this.timerFired(), 300); return; }
    this.log('Temps écoulé.', 'system');
    this.endTurn();
  }

  clearTimer() {
    if (this.turnTimer) { clearTimeout(this.turnTimer); this.turnTimer = null; }
  }

  endTurn() {
    if (this.phase !== 'battle' || !this.actor || this.busy) return;
    this.clearTimer();
    const e = this.actor;
    if (e.alive) this.fireTriggers(e, 'turnEnd', {});
    if (e.alive && e.rewind) this.rewindTurn(e);
    if (e === this.player) this.hook('onTurnEnd', e);
    // Invisibilité de la Nerith : celle qui a frappé pendant son tour redevient visible à la fin
    // de ce tour, pas au premier coup.
    if (e.effects.some(f => f.type === 'state' && f.name === 'invisible' && f.revealAtEnd)) {
      e.effects = e.effects.filter(f => !(f.type === 'state' && f.name === 'invisible' && f.revealAtEnd));
      this.log(`${e.name} redevient visible.`);
    }
    e.endTurn();
    this.actor = null;
    this.emit('update');
    this.nextTurn();
  }

  endPlayerTurn() {
    if (this.actor && this.actor === this.player) this.endTurn();
  }

  // ----- Déplacement -----

  reachFor(e) {
    return Grid.reachable(this.map, e.pos, e.pm, (x, y) => !!this.entityAt(x, y), (x, y) => this.isWalkable(x, y, e));
  }

  async moveAlong(e, path) {
    if (this.busy || !path || !path.length || path.length > e.pm) return false;
    if (this.actingCheck(e)) return false;
    // Un pas à la fois : chaque case touche la précédente, en partant de la position actuelle.
    let prev = e.pos;
    for (const step of path) {
      if (!step || !Number.isInteger(step.x) || !Number.isInteger(step.y) || Grid.dist(prev, step) !== 1) return false;
      prev = step;
    }
    this.busy = true;
    try {
      for (const step of path) {
        if (!this.isWalkable(step.x, step.y, e) || this.entityAt(step.x, step.y)) break;
        // Quitter le contact d'ennemis coûte des PA et des PM (tacle), avant le pas.
        this.tackle(e);
        if (e.pm <= 0) break;
        await this.emitAsync('animMove', { entity: e, to: step });
        this.place(e, step.x, step.y);
        e.pm--;
        e.moved = true;
        if (e === this.player) this.hook('onStep', e);
        this.emit('update');
        // Un piège peut arrêter net le déplacement.
        if (await this.checkTraps(e)) { if (!e.alive || e.pm <= 0) break; }
      }
    } finally {
      this.busy = false;
    }
    // Mort sur un piège en marchant : le combat se termine, ou le tour du joueur s'arrête là.
    if (!e.alive && !this.checkEnd() && e === this.player && this.actor === e) this.endTurn();
    return true;
  }

  // Un sort de déplacement casse l'Affût, sauf s'il est fait pour (`keepsAffut`, le Repli).
  async teleport(e, cell, s, verb) {
    await this.emitAsync('animMove', { entity: e, to: cell, teleport: true });
    this.place(e, cell.x, cell.y);
    if (!(s && s.keepsAffut)) e.moved = true;
    this.log(`${e.name} ${verb || 'se téléporte'}.`);
    await this.checkTraps(e);
  }

  // Téléfrag (le Xélor, docs/XELOR-ANALYSE.md) : se téléporter sur une créature échange les places ;
  // le premier téléfrag du tour rend `s.telefrag` PA au lanceur.
  async telefrag(e, t, s) {
    const from = e.pos;
    await this.swap(e, t);
    if (e.x === from.x && e.y === from.y) return;   // la créature ne bouge pas
    this.log(`Téléfrag : ${e.name} et ${t.name} échangent leurs places.`);
    if (!e.telefragThisTurn) {
      e.telefragThisTurn = true;
      e.pa += s.telefrag;
      this.emit('float', { x: e.x, y: e.y, text: `+${s.telefrag} PA`, color: '#4a90ff' });
      this.log(`${e.name} gagne ${s.telefrag} PA.`);
    }
    await this.checkTraps(e);
  }

  // Retour (le Rembobinage du Xélor) : à la fin de son tour, le lanceur revient sur la case où il
  // l'a commencé, si elle est libre.
  rewindTurn(e) {
    e.rewind = false;
    const to = e.turnStartPos;
    if (!to || (to.x === e.x && to.y === e.y)) return;
    const occ = this.entityAt(to.x, to.y);
    if ((occ && occ !== e) || !this.isWalkable(to.x, to.y, e)) { this.log(`${e.name} ne peut pas revenir : sa case est prise.`); return; }
    this.emit('animMove', { entity: e, to, teleport: true });
    this.place(e, to.x, to.y);
    this.log(`${e.name} revient où il a commencé son tour.`);
  }

  // Bond (Saut d'Élan) : le lanceur saute sur la case visée, puis frappe autour de lui à l'arrivée
  // (les ennemis de la zone `ef.aoe`, avec les effets `ef.effects` et l'élément du sort).
  async leap(e, cell, ef, s) {
    await this.teleport(e, cell, s, 'bondit');
    if (!e.alive) return;
    const zone = Grid.aoeCells(this.map, ef.aoe.shape, ef.aoe.size, e.pos, e.pos);
    this.emit('fx', { cells: zone, color: DATA.elements[s.element].color });
    for (const c of zone) {
      const t = this.entityAt(c.x, c.y);
      if (!t || t === e || t.team === e.team) continue;
      for (const f of ef.effects) { if (!t.alive) break; await this.applyEffect(e, t, f, s); }
    }
  }

  // Cases d'un repli : `cells` pas à l'opposé de l'ennemi visible le plus proche de `from`, tant que
  // la case est libre. Sert au moteur et au bot d'équilibrage.
  retreatSteps(e, cells, from) {
    from = from || e.pos;
    const foes = this.enemies(e).filter(t => this.canSee(e, t)).sort((a, b) => Grid.dist(from, a.pos) - Grid.dist(from, b.pos));
    const dir = foes.length ? Grid.pushDirection(foes[0].pos, from) : null;
    const steps = [];
    if (!dir) return steps;
    let c = from;
    for (let i = 0; i < cells; i++) {
      const n = { x: c.x + dir.x, y: c.y + dir.y };
      if (!this.isWalkable(n.x, n.y, e) || this.entityAt(n.x, n.y)) break;
      steps.push(n);
      c = n;
    }
    return steps;
  }

  // Repli (Lyssar) : il recule sans tacle ni dégâts de poussée ; un repli `keepsAffut` garde l'Affût.
  async retreat(e, ef, s) {
    const steps = this.retreatSteps(e, ef.cells);
    if (!steps.length) { this.log(`${e.name} n'a pas la place de reculer.`); return; }
    for (const step of steps) {
      await this.emitAsync('animMove', { entity: e, to: step, fast: true });
      this.place(e, step.x, step.y);
      if (await this.checkTraps(e)) { if (!e.alive) return; }
    }
    if (!(s && s.keepsAffut)) e.moved = true;
    this.log(`${e.name} recule de ${steps.length} case(s).`);
  }

  async swap(a, b) {
    if (a.def.fixed || b.def.fixed || a.unpushable || b.unpushable) { this.log(`${a.def.fixed || a.unpushable ? a.name : b.name} ne bouge pas.`); return; }
    const pa = a.pos, pb = b.pos;
    await Promise.all([
      this.emitAsync('animMove', { entity: a, to: pb, teleport: true }),
      this.emitAsync('animMove', { entity: b, to: pa, teleport: true }),
    ]);
    this.place(a, pb.x, pb.y);
    this.place(b, pa.x, pa.y);
    a.moved = true;
    this.log(`${a.name} échange sa place avec ${b.name}.`);
    await this.checkTraps(a);
    if (b.alive) await this.checkTraps(b);
  }

  async displace(caster, target, ef) {
    const dir = ef.type === 'push'
      ? Grid.pushDirection(caster.pos, target.pos)
      : Grid.pushDirection(target.pos, caster.pos);
    if (!dir) return;
    if (target.def.fixed || target.unpushable) { this.log(`${target.name} ne bouge pas.`); return; }
    let moved = 0;
    for (let i = 0; i < ef.cells; i++) {
      const nx = target.x + dir.x;
      const ny = target.y + dir.y;
      if (!this.isWalkable(nx, ny, target) || this.entityAt(nx, ny)) {
        const other = this.entityAt(nx, ny);
        this.fireTriggers(target, 'blocked', { against: other ? 'entity' : this.obstacleKind(nx, ny), other, pushed: true, source: caster });
        break;
      }
      await this.emitAsync('animMove', { entity: target, to: { x: nx, y: ny }, fast: true });
      this.place(target, nx, ny);
      moved++;
      await this.checkTraps(target);
      if (!target.alive) return;
    }
    const remaining = ef.cells - moved;
    if (ef.type === 'push' && remaining > 0) {
      this.dealDamage(caster, target, remaining * DATA.rules.pushDamagePerCell, null, { label: 'poussée bloquée' });
    } else if (moved) {
      this.log(`${target.name} est ${ef.type === 'push' ? 'poussé' : 'attiré'} de ${moved} case(s).`);
    }
  }

  // ----- Pièges et obstacles -----

  placeTrap(e, cell, ef, s) {
    // Collets du Lyssar (`trapReplaceOldest`) : au-delà de la limite, le plus ancien disparaît.
    if (s.trapReplaceOldest) {
      while (this.traps.filter(t => t.owner === e).length >= DATA.rules.maxTrapsPerOwner) {
        this.traps.splice(this.traps.findIndex(t => t.owner === e), 1);
        this.log(`Le plus ancien piège de ${e.name} disparaît.`);
      }
    }
    this.traps.push({
      x: cell.x, y: cell.y, owner: e, name: ef.name || s.name, element: s.element,
      effects: ef.effects, expiresRound: this.round + DATA.rules.trapRounds,
    });
    this.log(`${e.name} pose ${ef.name || s.name}.`);
  }

  // ----- Glyphes (sur le modèle du Féca, docs/FECA-ANALYSE.md) -----
  // Une zone posée au sol, qui agit au début du tour de chaque entité qui s'y tient : ses alliés
  // (`affects: 'allies'`, la propriétaire comprise) ou ses ennemis. Elle dure tant de tours de sa
  // propriétaire ; une propriétaire ne pose qu'un glyphe par tour.
  placeGlyph(e, cells, ef, s, fromTrigger) {
    this.glyphs.push({
      owner: e, name: ef.name || s.name, element: s.element, turnsLeft: ef.turns || 2,
      affects: ef.affects || 'allies', effects: ef.effects || [], cells: cells.map(c => ({ x: c.x, y: c.y })),
    });
    if (!fromTrigger) e.glyphThisTurn = true;
    this.log(`${e.name} trace ${ef.name || s.name}.`, e.team);
  }

  glyphsAt(x, y) { return (this.glyphs || []).filter(g => g.cells.some(c => c.x === x && c.y === y)); }

  ageGlyphs(e) {
    for (const g of this.glyphs) if (g.owner === e) g.turnsLeft--;
    const before = this.glyphs.length;
    this.glyphs = this.glyphs.filter(g => g.turnsLeft > 0 && g.owner.alive);
    if (this.glyphs.length < before) this.emit('update');
  }

  applyGlyphs(e) {
    for (const g of this.glyphsAt(e.x, e.y)) {
      const ally = e.team === g.owner.team;
      if ((g.affects === 'allies') !== ally) continue;
      for (const ef of g.effects) {
        if (!e.alive) break;
        if (ef.type === 'damage') this.dealDamage(g.owner, e, this.rollDamage(g.owner, e, g.element, ef, null), g.element, { label: g.name });
        else if (ef.type === 'heal') {
          const h = e.heal(Math.round(this.rand(ef.min, ef.max) * (g.owner.scale || 1)));
          if (h) { this.emit('float', { x: e.x, y: e.y, text: '+' + h, color: '#6fdc8c' }); this.log(`${g.name} : ${e.name} récupère ${h} PV.`); }
        } else if (ef.type === 'shield') {
          // Bouclier pris sur la vitalité de la propriétaire (`pctOwnerHp`), ou fixe (`value`).
          const v = ef.pctOwnerHp ? Math.round(g.owner.hpMax * ef.pctOwnerHp / 100) : ef.value;
          // Un seul bouclier par glyphe : celui du tour d'avant est remplacé, pas cumulé.
          e.effects = e.effects.filter(f => !(f.type === 'shield' && f.glyph === g));
          e.addEffect({ type: 'shield', value: v, turns: ef.duration || 1, glyph: g }, true);
          this.log(`${g.name} : ${e.name} reçoit un bouclier de ${v}.`);
        } else if ((ef.type === 'pa' || ef.type === 'pm') && ef.value < 0) {
          // Au début de son propre tour, le retrait frappe tout de suite (chaque point s'esquive), comme un piège.
          const lost = this.removalLanded(g.owner, e, ef.type, -ef.value);
          if (lost) { e[ef.type] = Math.max(0, e[ef.type] - lost); this.log(`${g.name} : ${e.name} perd ${lost} ${ef.type.toUpperCase()}.`); }
        } else this.applyStatus(g.owner, e, ef);
      }
    }
  }

  // Déclenche le piège ennemi sous `e`, s'il y en a un. Retourne vrai si un piège est parti.
  async checkTraps(e) {
    const idx = this.traps.findIndex(t => t.x === e.x && t.y === e.y && t.owner.team !== e.team);
    if (idx < 0) return false;
    const trap = this.traps.splice(idx, 1)[0];
    this.emit('fx', { cells: [{ x: trap.x, y: trap.y }], color: DATA.elements[trap.element].color });
    this.log(`${e.name} déclenche ${trap.name} !`, trap.owner.team);
    await this.emitAsync('animTrap', { trap, entity: e });
    for (const ef of trap.effects) {
      if (!e.alive) break;
      if (ef.type === 'damage') {
        this.dealDamage(trap.owner, e, this.rollDamage(trap.owner, e, trap.element, ef, null), trap.element, { label: trap.name, trap: true });
      } else if (ef.type === 'push' || ef.type === 'pull') {
        // Un piège qui repousse peut jeter sa cible sur un autre piège : c'est le réseau.
        await this.displace(trap.owner, e, ef);
      } else if ((ef.type === 'pa' || ef.type === 'pm') && e === this.actor && ef.value < 0) {
        // Pendant son propre tour, le malus frappe tout de suite (chaque point s'esquive par la sagesse).
        const before = e[ef.type];
        const lost = this.removalLanded(trap.owner, e, ef.type, -ef.value);
        if (lost) {
          e[ef.type] = Math.max(0, e[ef.type] - lost);
          this.log(ef.value <= -10 && lost >= before ? `${e.name} est enraciné.` : `${e.name} perd ${lost} ${ef.type.toUpperCase()}.`);
        }
      } else {
        this.applyStatus(trap.owner, e, ef);
      }
    }
    this.emit('update');
    return true;
  }

  placeObstacles(e, cells, ef) {
    let n = 0;
    for (const c of cells) {
      if (Grid.tile(this.map, c.x, c.y) !== Grid.FLOOR || this.tempAt(c.x, c.y) || this.entityAt(c.x, c.y)) continue;
      this.temp.set(Grid.key(c.x, c.y), { kind: ef.kind || 'rock', owner: e, turnsLeft: ef.turns });
      n++;
    }
    if (n) this.log(`${e.name} dresse un obstacle de ${n} case(s) pour ${ef.turns} tour(s).`);
  }

  // ----- Invocations -----

  // `near` : case souhaitée (ou la plus proche libre). `anchor` : l'entité après laquelle l'invocation
  // joue. `asSummon` : compte dans la limite d'invocations, disparaît avec son propriétaire et
  // n'empêche pas la fin du combat.
  // `level` : niveau voulu (celui du boss qui appelle des renforts), borné à la fourchette du monstre.
  spawn(monsterId, team, near, anchor, owner, asSummon, level) {
    const def = DATA.monsters[monsterId];
    const cell = def ? this.freeCellNear(near) : null;
    if (!cell) return null;
    const [lo, hi] = Entity.levelRange(def);
    const m = new Entity(def, team, this.nextId++, this.rng, level ? Math.max(lo, Math.min(hi, level)) : undefined);
    m.isSummon = !!asSummon;
    m.owner = m.isSummon ? (owner || null) : null;
    // Une invocation frappe à l'échelle de son maître ; la bête ou la tourelle d'un joueur gagne
    // aussi + 6 % de PV par niveau du maître au-dessus du premier.
    if (m.isSummon && owner && def.summon && DATA.rules.summonsScaleWithOwner) {
      m.scale = owner.scale || 1;
      if (owner.team === 'player') {
        m.hpMax = Math.round(def.hp * (1 + DATA.rules.summonHpPerLevel * ((owner.level || 1) - 1)));
        m.hp = m.hpMax;
      }
    }
    m.caller = owner || null;
    if (anchor) m.initiative = anchor.initiative;
    this.place(m, cell.x, cell.y);
    this.entities.push(m);
    if (this.phase === 'battle') {
      let idx = anchor ? this.order.indexOf(anchor) : -1;
      if (idx < 0) idx = this.turnIndex;
      this.order.splice(idx + 1, 0, m);
      if (idx + 1 <= this.turnIndex) this.turnIndex++;
    }
    this.emit('fx', { cells: [cell], color: '#ffffff' });
    this.log(`${m.name} apparaît.`, team);
    this.emit('update');
    return m;
  }

  kill(t, msg) {
    if (!t.alive) return;
    t.hp = 0;
    t.alive = false;
    if (msg) this.log(msg, 'system');
    this.onDeath(t, null, true);
  }

  onDeath(t, source, silent) {
    if (!silent) this.log(`${t.name} est vaincu.`, 'system');
    // Le coup final d'un sort en cours : effets « à la mort » du sort (Dernier Souffle) et bourse
    // de la Nerith (`purse` : + tant de % de Fils et de butin sur ce monstre).
    const ctx = this.castCtx;
    if (ctx && source && source === ctx.caster) {
      ctx.kills.push(t);
      if (ctx.spell.purse && t.team !== source.team && !t.isSummon) {
        t.lootBonus = Math.max(t.lootBonus || 0, ctx.spell.purse);
        this.log(`${source.name} fait les poches de ${t.name} : +${ctx.spell.purse} % de butin.`);
      }
    }
    // Parole tenue : le Sarkan achève son juré.
    const oath = t.effects.find(f => f.type === 'state' && f.name === 'sworn');
    if (oath && source && oath.by === source && source.alive) this.keepOath(source, t, oath);
    this.hook('onKill', t);
    this.fireTriggers(t, 'death', { source });
    for (const s of this.summonsOf(t)) this.kill(s, `${s.name} disparaît avec ${t.name}.`);
  }

  // ----- Sorts -----

  // Un sort vient des données, ou de l'entité elle-même (l'arme équipée du joueur, un sort dans sa
  // voie). Un personnage le lance à son rang (`spellRanks`, DATA.spellAtRank) : jets multipliés,
  // portée, relance et lancers du rang. Monstres et invocations restent au rang 1.
  spellOf(id, e) {
    const s = (e && e.extraSpells && e.extraSpells[id]) || DATA.spells[id];
    const rank = s && e && e.spellRanks ? e.spellRanks[id] || 1 : 1;
    if (rank <= 1) return s;
    const cache = e.rankedSpells || (e.rankedSpells = {});
    return cache[id] || (cache[id] = DATA.spellAtRank(s, rank));
  }

  // Le sort est-il lançable ce tour, indépendamment de la cible ?
  spellState(e, spellId) {
    const s = this.spellOf(spellId, e);
    if (!s) return { ok: false, reason: 'Sort inconnu' };
    if (e.pa < s.pa) return { ok: false, reason: 'Pas assez de PA' };
    if ((e.cooldowns[spellId] || 0) > 0) return { ok: false, reason: `Relance dans ${e.cooldowns[spellId]} tour(s)` };
    if (s.maxPerTurn && (e.casts[spellId] || 0) >= s.maxPerTurn) return { ok: false, reason: 'Déjà lancé le maximum de fois ce tour' };
    if (e.glyphThisTurn && s.effects.some(ef => ef.type === 'glyph')) return { ok: false, reason: 'Un seul glyphe par tour' };
    return { ok: true };
  }

  // ----- Kits de classe : Fureur, Serment, Affût, traque -----

  // À l'affût (Lyssar) : pendant son tour, il ne s'est pas déplacé depuis le début du tour. `from` :
  // une case d'où l'on envisage de lancer (le bot) ; y aller casserait l'Affût.
  isAffut(e, from) {
    if (!e || !e.kit || !e.kit.affut || e !== this.actor || e.moved) return false;
    return !from || (from.x === e.x && from.y === e.y);
  }

  // Portée d'un sort pour son lanceur : bonus de portée (Corde Longue) et Affût, pour les sorts à
  // distance (portée maximale de 2 ou plus, hors sorts sur soi).
  rangeOf(e, s, from) {
    if (s.target === 'self' || s.range[1] < 2) return s.range;
    let bonus = Math.max(0, e.modifier('range'));
    if (this.isAffut(e, from)) bonus += e.kit.affut.range || 0;
    return bonus ? [s.range[0], s.range[1] + bonus] : s.range;
  }

  // Le serment que `t` porte, juré par `by` (n'importe qui si `by` est omis).
  oathOn(t, by) {
    return t.effects.find(f => f.type === 'state' && f.name === 'sworn' && (!by || f.by === by)) || null;
  }

  // `t` est-il traqué (Marque du Traqueur) par `by` ?
  trackedBy(t, by) {
    return !!(t && t.effects.some(f => f.type === 'state' && f.name === 'tracked' && f.by === by));
  }

  // Sang Versé (Karsh, sur le passif du Sacrieur, docs/SACRIEUR-ANALYSE.md) : +1 % de dégâts
  // infligés et −1 % de dégâts subis par `per` % de PV perdus, au plus `max` %.
  bloodOf(e) {
    const b = e && e.kit && e.kit.blood;
    if (!b || !e.hpMax) return 0;
    return Math.max(0, Math.min(b.max, Math.floor((1 - e.hp / e.hpMax) * 100 / b.per)));
  }

  // Armé (Kaldrin, sur le Forgelance, docs/FORGELANCE-ANALYSE.md) : tant que sa tourelle n'est pas
  // posée, il subit `reduction` % de dégâts en moins.
  isArmed(e) {
    const a = e && e.kit && e.kit.armed;
    return !!a && !this.summonsOf(e).some(s => s.def.id === a.summon);
  }

  // Fureur (Sarkan) : bornée au maximum du kit, gagnée au contact, dépensée par Verdict.
  gainFury(e, n) {
    const max = e.kit && e.kit.fury ? e.kit.fury.max : 0;
    if (!max || !(n > 0) || !e.alive) return;
    const before = e.fury;
    e.fury = Math.min(max, e.fury + n);
    if (e.fury > before) this.log(`${e.name} : Fureur ${e.fury} / ${max}.`, e.team);
  }

  // Serment : un seul juré à la fois par lanceur ; le nouveau remplace l'ancien.
  swear(source, t, ef) {
    for (const o of this.entities) o.effects = o.effects.filter(f => !(f.type === 'state' && f.name === 'sworn' && f.by === source));
    t.addEffect({ type: 'state', name: 'sworn', by: source, turns: ef.turns, power: ef.power || 0, burn: ef.burn || 0, kept: ef.kept || null }, t === this.actor);
    this.log(`${source.name} jure la perte de ${t.name} (${ef.turns} tour(s)).`, source.team);
  }

  // Parole tenue : le lanceur du serment achève son juré ; PA tout de suite (pendant son tour),
  // PV et Fureur.
  keepOath(e, t, oath) {
    const k = oath.kept || {};
    this.log(`Parole tenue : ${e.name} a eu ${t.name}.`, e.team);
    if (k.pa && e === this.actor) { e.pa += k.pa; this.log(`${e.name} gagne ${k.pa} PA.`); }
    if (k.healPct) {
      const h = e.heal(Math.round(e.hpMax * k.healPct / 100));
      if (h > 0) { this.emit('float', { x: e.x, y: e.y, text: '+' + h, color: '#6fdc8c' }); this.log(`${e.name} récupère ${h} PV.`); }
    }
    if (k.fury) this.gainFury(e, k.fury);
  }

  // Traque : la cible est révélée et ne peut plus devenir invisible tant que la marque tient.
  track(source, t, ef) {
    if (t.hasState('invisible')) { t.removeState('invisible'); this.log(`${t.name} est révélé.`); }
    t.effects = t.effects.filter(f => !(f.type === 'state' && f.name === 'tracked' && f.by === source));
    t.addEffect({ type: 'state', name: 'tracked', by: source, turns: ef.turns }, t === this.actor);
    this.log(`${t.name} est traqué pendant ${ef.turns} tour(s) : il ne peut plus se cacher.`);
  }

  // Larcin (Nerith) : ce que la cible perd, le lanceur le gagne. PA et PM : retrait esquivable par
  // la sagesse, gagné tout de suite pendant le tour du lanceur ; bouclier : il change de mains ;
  // bonus (puissance, PA, PM en plus) : le meilleur passe sur le lanceur pour sa durée restante,
  // trois tours au plus.
  steal(source, t, ef) {
    if (ef.what === 'pa' || ef.what === 'pm') {
      const landed = this.removalLanded(source, t, ef.what, ef.value);
      if (!landed) return;
      t.addEffect({ type: ef.what, value: -landed, turns: ef.duration || 1 }, t === this.actor);
      if (ef.what === 'pm') this.echoPmLoss(t);
      if (source === this.actor) source[ef.what] += landed;
      else source.addEffect({ type: ef.what, value: landed, turns: 1 }, false);
      this.emit('float', { x: source.x, y: source.y, text: `+${landed} ${ef.what.toUpperCase()}`, color: '#c9a0ff' });
      this.log(`${source.name} vole ${landed} ${ef.what.toUpperCase()} à ${t.name}.`);
      return;
    }
    if (ef.what === 'shield') {
      const turns = Math.max(1, ...t.effects.filter(f => f.type === 'shield').map(f => Math.min(3, f.turns)));
      const v = t.stripShields();
      if (v > 0) {
        source.addEffect({ type: 'shield', value: v, turns }, source === this.actor);
        this.log(`${source.name} vole le bouclier de ${t.name} (${v} points).`);
        return;
      }
      if (!ef.orBonus) { this.log(`${t.name} n'a pas de bouclier à voler.`); return; }
    }
    const worth = f => (f.type === 'power' ? f.value : f.type === 'pa' ? f.value * 15 : f.value * 10);
    const best = t.effects.filter(f => ['power', 'pa', 'pm'].includes(f.type) && f.value > 0).sort((a, b) => worth(b) - worth(a))[0];
    if (!best) { this.log(`${t.name} n'a rien à voler.`); return; }
    t.effects.splice(t.effects.indexOf(best), 1);
    source.addEffect({ type: best.type, value: best.value, turns: Math.max(1, Math.min(3, best.turns)) }, source === this.actor);
    this.log(`${source.name} vole un bonus à ${t.name} (${best.type === 'power' ? '+' + best.value + ' % de dégâts' : '+' + best.value + ' ' + best.type.toUpperCase()}).`);
  }

  // Une silhouette qui provoque (Leurre de Pénombre, `taunt` : rayon) : l'ennemi à son contact ne
  // peut frapper qu'elle.
  taunterOf(e, from) {
    from = from || e.pos;
    return this.entities.find(o => o.alive && o.team !== e.team && o.def.taunt && Grid.dist(o.pos, from) <= o.def.taunt) || null;
  }

  // Un effet sous condition : `ifSworn` ne vaut que contre le juré du lanceur.
  effectApplies(e, t, ef) {
    if (ef.ifSworn && !this.oathOn(t, e)) return false;
    // Le mot de l'Eniripsa (docs/ENIRIPSA-ANALYSE.md) : soigne un allié, blesse un ennemi.
    if (ef.onAlly && t.team !== e.team) return false;
    if (ef.onFoe && t.team === e.team) return false;
    return true;
  }

  // Zone d'un sort lancé sur `center` depuis `from`. La flèche perçante (`pierce`) file du lanceur
  // jusqu'au bord ou au premier obstacle ; vers une cible qu'il traque (`markSight`), elle passe
  // les obstacles jusqu'à elle.
  zoneCells(e, s, center, from) {
    from = from || e.pos;
    if (s.aoe.shape !== 'pierce') return Grid.aoeCells(this.map, s.aoe.shape, s.aoe.size, center, from);
    const dir = Grid.pushDirection(from, center);
    if (!dir) return [];
    const aimed = this.entityAt(center.x, center.y);
    const through = s.markSight && this.trackedBy(aimed, e);
    const reach = Grid.dist(from, center);
    const out = [];
    for (let i = 1; i < 64; i++) {
      const c = { x: from.x + dir.x * i, y: from.y + dir.y * i };
      if (!Grid.inBounds(this.map, c.x, c.y)) break;
      if (this.blocksSight(c.x, c.y)) { if (through && i < reach) continue; break; }
      out.push(c);
    }
    return out;
  }

  // Cases visables depuis `from` (par défaut la position du lanceur), et celles hors de vue.
  targetCells(e, spellId, from) {
    from = from || e.pos;
    const s = this.spellOf(spellId, e);
    const cells = [];
    const blocked = [];
    if (s.target === 'self') return { cells: [from], blocked };
    const [min, max] = this.rangeOf(e, s, from);
    for (let dy = -max; dy <= max; dy++) {
      for (let dx = -max; dx <= max; dx++) {
        const d = Math.abs(dx) + Math.abs(dy);
        if (d < min || d > max) continue;
        const c = { x: from.x + dx, y: from.y + dy };
        if (!Grid.inBounds(this.map, c.x, c.y)) continue;
        if (s.line && !Grid.inLine(from, c)) continue;
        if (s.los && !this.hasLos(e, from, c, s.aoe.shape === 'pierce') && !(s.markSight && this.trackedBy(this.entityAt(c.x, c.y), e))) { blocked.push(c); continue; }
        cells.push(c);
      }
    }
    return { cells, blocked };
  }

  canCastAt(e, spellId, cell, from) {
    const st = this.spellState(e, spellId);
    if (!st.ok) return st;
    const s = this.spellOf(spellId, e);
    from = from || e.pos;
    if (s.target === 'self') {
      if (cell.x !== from.x || cell.y !== from.y) return { ok: false, reason: 'Se lance sur soi-même' };
    } else {
      if (!Grid.inBounds(this.map, cell.x, cell.y)) return { ok: false, reason: 'Hors de la carte' };
      const d = Grid.dist(from, cell);
      const range = this.rangeOf(e, s, from);
      if (d < range[0] || d > range[1]) return { ok: false, reason: 'Hors de portée' };
      if (s.line && !Grid.inLine(from, cell)) return { ok: false, reason: 'Doit être lancé en ligne' };
      const occ = this.entityAt(cell.x, cell.y);
      // Une cible traquée se voit à travers les obstacles pour les sorts de traque (`markSight`).
      if (s.los && !this.hasLos(e, from, cell, s.aoe.shape === 'pierce') && !(s.markSight && this.trackedBy(occ, e))) return { ok: false, reason: 'Pas de ligne de vue' };
      const seen = occ && this.canSee(e, occ) ? occ : null;   // un ennemi invisible ne se vise pas
      // Un sort `telefrag` se lance aussi sur une créature visible : le lanceur échange sa place avec elle.
      const telefrag = s.telefrag && seen && seen !== e;
      if (s.target === 'free' && !telefrag && (occ || !this.isWalkable(cell.x, cell.y, e))) return { ok: false, reason: 'Il faut une case libre' };
      if (s.target === 'entity' && !seen) return { ok: false, reason: 'Aucune cible sur cette case' };
      if (s.target === 'enemy' && (!seen || seen.team === e.team)) return { ok: false, reason: 'Vise un ennemi' };
      if (s.target === 'ally' && (!seen || seen.team !== e.team)) return { ok: false, reason: 'Vise un allié' };
      if (s.target === 'summon' && (!seen || seen.team !== e.team || !seen.isSummon)) return { ok: false, reason: 'Vise une invocation alliée' };
      if (s.effects.some(ef => ef.type === 'trap') && this.traps.some(t => t.x === cell.x && t.y === cell.y && t.owner.team === e.team)) {
        return { ok: false, reason: 'Il y a déjà un piège ici' };
      }
      if (s.effects.some(ef => ef.type === 'trap') && !s.trapReplaceOldest && this.traps.filter(t => t.owner === e).length >= DATA.rules.maxTrapsPerOwner) {
        return { ok: false, reason: `${DATA.rules.maxTrapsPerOwner} pièges posés au plus` };
      }
    }
    const summonEf = s.effects.find(ef => ef.type === 'summon');
    if (summonEf) { const why = this.summonBlock(e, summonEf.monster); if (why) return { ok: false, reason: why }; }
    if (e.hasState('provoked') && s.effects.some(ef => ef.type === 'damage')) {
      const by = e.stateBy('provoked');
      if (by && by.alive && (s.target === 'self' || cell.x !== by.x || cell.y !== by.y)) {
        return { ok: false, reason: `Provoqué : ne peut viser que ${by.name}` };
      }
    }
    const taunter = s.effects.some(ef => ef.type === 'damage') ? this.taunterOf(e, from) : null;
    if (taunter && (s.target === 'self' || cell.x !== taunter.x || cell.y !== taunter.y)) {
      return { ok: false, reason: `Provoqué : ne peut viser que ${taunter.name}` };
    }
    return { ok: true };
  }

  rand(min, max) {
    return min + Math.floor(this.rng() * (max - min + 1));
  }

  // Le joueur n'agit que pendant son tour, en combat, avec ses propres sorts : le moteur le
  // vérifie lui-même (il tournera côté serveur), sans se fier à l'interface.
  actingCheck(e) {
    if (e !== this.player) return null;
    if (this.phase !== 'battle') return 'Le combat n\'a pas commencé';
    if (this.actor !== e || !e.alive) return 'Ce n\'est pas ton tour';
    return null;
  }

  async cast(e, spellId, cell) {
    if (this.busy) return { ok: false, reason: 'Action en cours' };
    const notNow = this.actingCheck(e);
    if (notNow) return { ok: false, reason: notNow };
    if (e === this.player && !(e.spells || []).includes(spellId)) return { ok: false, reason: 'Sort inconnu' };
    if (!cell || !Number.isInteger(cell.x) || !Number.isInteger(cell.y)) return { ok: false, reason: 'Case invalide' };
    const check = this.canCastAt(e, spellId, cell);
    if (!check.ok) return check;
    const s = this.spellOf(spellId, e);
    this.busy = true;
    // Le sort en cours : son lanceur, la Fureur au moment du lancer (Verdict la dépense tout de
    // suite), les ennemis touchés et ceux qu'il achève.
    const ctx = this.castCtx = { caster: e, spell: s, fury: e.fury, hitFoe: false, kills: [] };
    try {
      e.pa -= s.pa;
      e.casts[spellId] = (e.casts[spellId] || 0) + 1;
      if (s.cooldown) e.cooldowns[spellId] = s.cooldown;
      if (s.furySpend && e.fury > 0) { this.log(`${e.name} dépense ${e.fury} de Fureur.`, e.team); e.fury = 0; }
      const center = s.target === 'self' ? e.pos : { x: cell.x, y: cell.y };
      const cells = this.zoneCells(e, s, center, e.pos);
      this.log(`${e.name} lance ${s.name}.`, e.team);
      if (e === this.player) this.hook('onCast', e, s, spellId);
      this.emit('update');
      await this.emitAsync('animCast', { entity: e, spell: s, cells });

      // 1. Effets sur chaque entité de la zone, dans l'ordre du sort ; les poussées attendent.
      let targets = cells.map(c => this.entityAt(c.x, c.y)).filter(t => t && t.alive && (t !== e || s.affectsCaster));
      if (s.affects === 'allies') targets = targets.filter(t => t.team === e.team);
      if (s.affects === 'enemies') targets = targets.filter(t => t.team !== e.team);
      // Ennemis pris dans la zone : un sort `perExtraTarget` frappe plus fort à chacun en plus.
      ctx.foes = targets.filter(t => t.team !== e.team).length;
      const moves = [];
      for (const t of targets) {
        for (const ef of s.effects) {
          if (!t.alive) break;
          if (!this.effectApplies(e, t, ef)) continue;
          if (ef.type === 'glyph') continue;   // un glyphe agit sur sa zone, pas au lancer
          if (ef.type === 'push' || ef.type === 'pull') moves.push({ t, ef });
          else await this.applyEffect(e, t, ef, s);
        }
      }
      // 2. Poussées et attractions.
      for (const { t, ef } of moves) if (t.alive) await this.displace(e, t, ef);
      // 3. Effets de case : téléportation, obstacles, pièges, invocations.
      for (const ef of s.effects) {
        if (ef.type === 'teleport') {
          const occ = s.telefrag ? this.entityAt(cell.x, cell.y) : null;
          if (occ && occ !== e) await this.telefrag(e, occ, s);
          else await this.teleport(e, cell, s);
        }
        else if (ef.type === 'leap') await this.leap(e, cell, ef, s);
        else if (ef.type === 'retreat') await this.retreat(e, ef, s);
        else if (ef.type === 'charge') { await this.charge(e, cell, ef, s); e.moved = true; }
        else if (ef.type === 'obstacle') this.placeObstacles(e, cells, ef);
        else if (ef.type === 'trap') this.placeTrap(e, cell, ef, s);
        else if (ef.type === 'glyph') this.placeGlyph(e, cells, ef, s);
        else if (ef.type === 'summon') {
          for (let i = 0; i < (ef.count || 1); i++) {
            const m = this.spawn(ef.monster, e.team, cell, e, e, true);
            // Une silhouette taillée dans le lanceur (Leurre) : tant de % de ses PV maximum.
            if (m && ef.hpPctOfOwner) { m.hpMax = m.hp = Math.max(1, Math.round(e.hpMax * ef.hpPctOfOwner / 100)); }
          }
        }
      }
      // 4. Ce que le sort coûte ou rapporte au lanceur, quoi qu'il arrive.
      for (const ef of s.selfEffects || []) this.applySelfEffect(e, ef, s);
      // 5. Fureur : le sort en rapporte s'il a touché un ennemi.
      if (s.fury && ctx.hitFoe) this.gainFury(e, s.fury);
      // 6. Le sort a achevé quelqu'un : ses effets « à la mort » (Dernier Souffle).
      if (s.onKill && ctx.kills.length && e.alive) for (const ef of s.onKill) this.applySelfEffect(e, ef, s);
    } finally {
      this.busy = false;
      this.castCtx = null;
    }
    this.emit('update');
    this.checkEnd();
    return { ok: true };
  }

  async applyEffect(source, t, ef, s) {
    switch (ef.type) {
      case 'damage':
        // Contre son juré, un sort `oathPierce` (Verdict) ne s'esquive pas.
        // `lifestealIfState` : le sort vole de la vie seulement dans cet état (le Thalor ivre, docs/PANDAWA-ANALYSE.md).
        const ls = s.lifesteal || (s.lifestealIfState && source.hasState(s.lifestealIfState.state) ? s.lifestealIfState.pct : 0);
        this.dealDamage(source, t, this.rollDamage(source, t, s.element, ef, s), s.element, { lifesteal: ls, pierce: !!(s.oathPierce && this.oathOn(t, source)) });
        break;
      case 'steal':
        this.steal(source, t, ef);
        break;
      case 'oath':
        this.swear(source, t, ef);
        break;
      case 'track':
        this.track(source, t, ef);
        break;
      case 'leap':
      case 'retreat':
        break;   // résolus comme effets de case, après les effets sur les cibles
      case 'healPct': {
        // Soin d'une part des PV maximum de la cible (Renaissance), qui ne grandit avec rien.
        const h = t.heal(Math.round(t.hpMax * ef.pct / 100));
        this.emit('float', { x: t.x, y: t.y, text: '+' + h, color: '#6fdc8c' });
        this.log(`${t.name} récupère ${h} PV.`);
        break;
      }
      case 'heal': {
        // Les soins grandissent avec le niveau du soigneur (comme ses dégâts) et avec son
        // intelligence, deux fois moins vite que les dégâts (même rendement décroissant), et avec
        // le rang du sort (`mult`).
        const h = t.heal(Math.round(this.rand(ef.min, ef.max) * (ef.mult || 1) * (source ? source.scale || 1 : 1) * (source ? source.statFactor('feu') : 1)));
        this.emit('float', { x: t.x, y: t.y, text: '+' + h, color: '#6fdc8c' });
        this.log(`${t.name} récupère ${h} PV.`);
        break;
      }
      case 'swap':
        if (t !== source) await this.swap(source, t);
        break;
      case 'charge':
        break;   // résolue comme effet de case, après les effets sur les cibles
      case 'sacrifice':
        this.sacrifice(source, t, ef, s);
        break;
      case 'devourShield': {
        const v = t.stripShields();
        if (v > 0) {
          const h = source.heal(v);
          this.emit('float', { x: source.x, y: source.y, text: '+' + h, color: '#6fdc8c' });
          this.log(`${source.name} dévore le bouclier de ${t.name} et récupère ${h} PV.`);
        } else {
          this.log(`${t.name} n'a pas de bouclier à dévorer.`);
        }
        break;
      }
      default:
        this.applyStatus(source, t, ef);
    }
  }

  // Effets d'état : PA, PM, bouclier, puissance, vulnérabilité, brûlure, état, purge.
  applyStatus(source, t, ef) {
    const own = t === this.actor;
    const turns = ef.duration != null ? ef.duration : ef.turns;
    switch (ef.type) {
      case 'armor':
        // Armure de sort : − tant de % aux dégâts subis, pour un temps (l'ivresse du Thalor).
        t.addEffect({ type: 'armor', value: ef.value, turns }, own);
        this.log(`${t.name} : −${ef.value} % de dégâts subis pendant ${turns} tour(s).`);
        break;
      case 'pa':
      case 'pm': {
        // Sur soi pendant son tour, un sort « selfNow » donne ses PA ou PM tout de suite (Temps Fort).
        if (ef.selfNow && source === t && own) {
          t[ef.type] += ef.selfNow;
          this.log(`${t.name} gagne ${ef.selfNow} ${ef.type.toUpperCase()}.`);
          break;
        }
        let value = ef.value;
        let rooted = ef.type === 'pm' && value <= -10;
        // Un retrait venu d'un ennemi s'esquive point par point, un enracinement (−10 PM) compris :
        // il n'enracine que si tous les PM de la cible tombent.
        if (value < 0 && source && source.team !== t.team) {
          const left = t === this.actor ? t[ef.type] : Math.max(0, (ef.type === 'pa' ? t.paMax : t.pmMax) + t.modifier(ef.type));
          const landed = this.removalLanded(source, t, ef.type, -value);
          if (!landed) break;
          if (rooted) rooted = landed >= left;
          value = rooted ? ef.value : -landed;
        }
        t.addEffect({ type: ef.type, value, turns }, own);
        if (rooted) this.log(`${t.name} est enraciné pour ${turns} tour(s).`);
        else this.log(`${t.name} : ${value > 0 ? '+' : ''}${value} ${ef.type.toUpperCase()} pendant ${turns} tour(s).`);
        if (ef.type === 'pm' && value < 0) this.echoPmLoss(t);
        break;
      }
      case 'echo':
        // Écho (la Mirel, sur l'Enutrof Eau, docs/ENUTROF-ANALYSE.md) : un seul par lanceur, renouvelé.
        t.effects = t.effects.filter(f => !(f.type === 'echo' && f.owner === source));
        t.addEffect({ type: 'echo', turns, min: ef.min, max: ef.max, mult: ef.mult, element: ef.element, uses: ef.uses, owner: source }, own);
        this.log(`${t.name} porte un écho pendant ${turns} tour(s) : chaque PM perdu le fera résonner.`);
        break;
      case 'shield': {
        // Le bouclier suit le niveau de celui qui le donne, comme les soins.
        const v = Math.round(ef.value * (source ? source.scale || 1 : 1));
        t.addEffect({ type: 'shield', value: v, turns }, own);
        this.log(`${t.name} gagne un bouclier de ${v} points.`);
        break;
      }
      case 'power':
        t.addEffect({ type: 'power', value: ef.value, turns }, own);
        this.log(`${t.name} : +${ef.value} % de dégâts.`);
        break;
      case 'vuln':
        // La marque d'un même lanceur ne se cumule pas : la nouvelle remplace l'ancienne.
        if (source && source !== t) t.effects = t.effects.filter(f => !(f.type === 'vuln' && f.by === source));
        t.addEffect({ type: 'vuln', value: ef.value, turns, by: source || null }, own);
        this.log(`${t.name} subit +${ef.value} % de dégâts pendant ${turns} tour(s).`);
        break;
      case 'dot': {
        const v = this.dotValue(source, ef);
        t.addEffect({ type: 'dot', element: ef.element, value: v, turns }, own);
        this.log(`${t.name} brûle : ${v} par tour pendant ${turns} tour(s).`);
        break;
      }
      case 'state':
        // Une cible traquée ne peut plus se cacher.
        if (ef.name === 'invisible' && t.hasState('tracked')) { this.log(`${t.name} est traqué et ne peut pas se cacher.`); break; }
        // `lingering` : l'invisibilité ne tombe qu'à la fin du tour où l'on frappe (Nerith).
        t.addEffect({ type: 'state', name: ef.name, turns, by: source, lingering: !!ef.lingering }, own);
        // Les ennemis ne savent plus où il est : seulement où il a disparu.
        if (ef.name === 'invisible') t.hiddenAt = { x: t.x, y: t.y };
        this.log(ef.name === 'invisible' ? `${t.name} devient invisible.` : ef.name === 'unhealable' ? `${t.name} ne peut plus être soigné pendant ${turns} tour(s).` : ef.name === 'ivre' ? `${t.name} est ivre pendant ${turns} tour(s).` : `${t.name} est provoqué par ${source.name}.`);
        break;
      case 'range':
        t.addEffect({ type: 'range', value: ef.value, turns }, own);
        this.log(`${t.name} : +${ef.value} de portée pendant ${turns} tour(s).`);
        break;
      case 'guard':
        // Garde : − tant de % aux dégâts subis au corps à corps.
        t.addEffect({ type: 'guard', value: ef.value, turns }, own);
        this.log(`${t.name} se garde : −${ef.value} % de dégâts subis au contact.`);
        break;
      case 'cleanse':
        t.cleanse();
        this.log(`${t.name} est débarrassé de ses malus.`);
        break;
    }
  }

  applySelfEffect(e, ef, s) {
    if (ef.type === 'selfDamagePct') this.loseHp(e, Math.round(e.hpMax * ef.pct / 100), s.name);
    else if (ef.type === 'paNow') { e.pa += ef.value; this.log(`${e.name} gagne ${ef.value} PA.`); }
    else if (ef.type === 'rewind') { e.rewind = true; this.log(`${e.name} reviendra à la fin de son tour où il l'a commencé.`); }
    else if (ef.type === 'pmNow') {
      if (ef.value < 0) { const lost = Math.min(e.pm, -ef.value); e.pm -= lost; this.log(`${e.name} perd ${lost} PM.`); }
      else { e.pm += ef.value; this.log(`${e.name} gagne ${ef.value} PM.`); }
    }
    else this.applyStatus(e, e, ef);
  }

  // Écho (l'Orpaillage de l'Enutrof, docs/ENUTROF-ANALYSE.md) : chaque retrait de PM qui porte fait
  // résonner les échos de la cible, qui la frappent au nom de leur lanceur, `uses` fois au plus.
  echoPmLoss(t) {
    for (const f of t.effects.filter(f => f.type === 'echo' && f.uses > 0)) {
      if (!t.alive) break;
      if (!f.owner || !f.owner.alive) continue;
      f.uses--;
      this.dealDamage(f.owner, t, this.rollDamage(f.owner, t, f.element, f, null), f.element, { label: 'écho' });
    }
  }

  // Brûlure : fixée à la pose, à l'échelle du lanceur et de sa caractéristique (rendement
  // décroissant compris). Sans lanceur (déclencheur, Nœud), la valeur brute.
  dotValue(source, ef) {
    if (!source) return ef.value;
    return Math.max(1, Math.round(ef.value * (source.scale || 1) * source.statFactor(ef.element)));
  }

  // Tacle, comme Dofus : quitter une case au contact d'ennemis fait perdre une part des PA et des
  // PM. Part gardée = (Fuite + 2) / (2 × (somme des Tacles voisins + 2)), au plus 100 %.
  tackle(e) {
    let tacle = 0;
    for (const n of Grid.neighbors(this.map, e.pos)) {
      const o = this.entityAt(n.x, n.y);
      if (o && o.alive && o.team !== e.team && !o.hasState('stunned')) tacle += o.tacle || 0;
    }
    if (tacle <= 0) return;
    const kept = Math.min(1, ((e.fuite || 0) + 2) / (2 * (tacle + 2)));
    if (kept >= 1) return;
    const lpa = Math.round(e.pa * (1 - kept)), lpm = Math.round(e.pm * (1 - kept));
    if (!lpa && !lpm) return;
    e.pa -= lpa; e.pm -= lpm;
    this.emit('float', { x: e.x, y: e.y, text: 'taclé', color: '#ffd166' });
    this.log(`${e.name} est taclé : ${lpa ? '−' + lpa + ' PA' : ''}${lpa && lpm ? ', ' : ''}${lpm ? '−' + lpm + ' PM' : ''}.`, e.team);
  }

  // Esquive d'un retrait de PA ou de PM, sur le modèle de Dofus mais plus douce : chance de garder
  // un point = 25 % (40 % pour un joueur) × (sagesse de la cible + 40) / (sagesse du lanceur + 40) × (PA ou PM restants /
  // maximum), bornée de 5 à 75 %. Hors de son tour, la cible compte ce qu'elle aura à son prochain tour.
  removalDodgeChance(caster, t, kind, current) {
    // Un sort `inesquivable` (la Gouttelette du Glym Aqua) : son retrait ne s'esquive jamais.
    if (this.castCtx && this.castCtx.spell && this.castCtx.spell.inesquivable) return 0;
    const max = kind === 'pa' ? t.paMax : t.pmMax;
    if (!(max > 0)) return 1;
    if (current == null) current = t === this.actor ? t[kind] : Math.max(0, max + t.modifier(kind));
    const r = DATA.rules;
    const K = r.removalDodgeK;
    const base = t.team === 'player' && !t.isSummon ? r.removalDodgeBasePlayer : r.removalDodgeBase;
    const p = base / 100 * (t.wisdom + K) / ((caster ? caster.wisdom : 0) + K) * Math.max(0, current) / max;
    return Math.max(r.removalDodgeMin / 100, Math.min(r.removalDodgeMax / 100, p));
  }

  // Tire chaque point retiré séparément (aléa du combat, donc déterministe à graine égale) ;
  // retourne le nombre de points qui passent.
  removalLanded(caster, t, kind, n) {
    const max = kind === 'pa' ? t.paMax : t.pmMax;
    let current = t === this.actor ? t[kind] : Math.max(0, max + t.modifier(kind));
    let landed = 0, dodged = 0;
    // Une immobilisation (retrait de tout ce qui reste) s'esquive d'un seul jet, pas point par point.
    if (n >= max || n >= 10) {
      if (this.rng() < this.removalDodgeChance(caster, t, kind, current)) {
        this.emit('float', { x: t.x, y: t.y, text: 'esquive', color: '#ffffff' });
        this.log(`${t.name} esquive l'immobilisation.`);
        return 0;
      }
      return Math.min(n, current);
    }
    for (let i = 0; i < n && current > 0; i++) {
      if (this.rng() < this.removalDodgeChance(caster, t, kind, current)) { dodged++; continue; }
      landed++;
      current--;
    }
    if (dodged > 0) {
      this.emit('float', { x: t.x, y: t.y, text: 'esquive', color: '#ffffff' });
      this.log(`${t.name} esquive le retrait de ${dodged} ${kind.toUpperCase()}.`);
    }
    return landed;
  }

  sacrifice(source, summon, ef, s) {
    const cells = Grid.aoeCells(this.map, 'circle', ef.radius, summon.pos, summon.pos);
    this.emit('fx', { cells, color: DATA.elements[s.element].color });
    this.log(`${summon.name} se sacrifie !`, source.team);
    for (const c of cells) {
      const t = this.entityAt(c.x, c.y);
      if (!t || t === summon || t.team === source.team) continue;
      this.dealDamage(source, t, this.rollDamage(source, t, s.element, ef, s), s.element, {});
    }
    this.kill(summon);
  }

  // ----- Dégâts -----

  resistOf(t, element) {
    if (!element) return 0;
    if (t.immuneElement === element) return 100;
    return t.resist[element] || 0;
  }

  scaleByResist(t, element, base) {
    return Math.max(0, Math.round(base * (1 - this.resistOf(t, element) / 100)));
  }

  // Dégâts d'un effet : jet (multiplié par le rang du sort, `mult`), caractéristique du lanceur
  // (+1 % par point jusqu'à 100, +0,5 % au-delà), dommages fixes, échelle de niveau du monstre, coup
  // critique (× 1,5), puissance du lanceur, vulnérabilité de la cible, bonus du sort, résistance.
  rollDamage(source, t, element, ef, s) {
    let mult = 1 + (source ? source.modifier('power') / 100 : 0) + t.modifier('vuln') / 100;
    // Kits : le serment (+ % contre son juré) et l'Affût (+ % tant qu'il n'a pas bougé, ou le
    // bonus propre du sort, `affutBonus`) s'ajoutent à la puissance.
    const oath = source ? this.oathOn(t, source) : null;
    if (oath) mult += (oath.power || 0) / 100;
    if (source && this.isAffut(source)) mult += ((s && s.affutBonus) || source.kit.affut.power || 0) / 100;
    if (source) mult += this.bloodOf(source) / 100;
    if (s && source) {
      if (s.lowHpBonus && source.hpPct() < s.lowHpBonus.below) mult *= s.lowHpBonus.mult;
      if (s.executeBelow && t.hpPct() < s.executeBelow) mult *= 2;
      if (s.bonusIfInvisible && source.hasState('invisible')) mult *= s.bonusIfInvisible;
      // Lame Tournoyante (sur le modèle du Tumulte du Iop) : + tant de % par ennemi touché en plus du premier.
      const cc = this.castCtx;
      if (s.perExtraTarget && cc && cc.spell === s && cc.foes > 1) mult += s.perExtraTarget * (cc.foes - 1) / 100;
      // Verdict : + tant de % par point de Fureur dépensé (celle d'avant le lancer).
      if (s.furySpend) {
        const fury = this.castCtx && this.castCtx.caster === source ? this.castCtx.fury : source.fury;
        mult *= 1 + s.furySpend * fury / 100;
      }
    }
    let base = this.rand(ef.min, ef.max) * (ef.mult || 1);
    this.lastCrit = false;
    if (source) {
      base = base * source.statFactor(element) * (source.scale || 1) + (source.dmgFlat || 0);
      if (source.crit > 0 && this.rng() * 100 < source.crit) { base *= 1.5; this.lastCrit = true; }
    }
    // L'armure amortit les coups portés ; un être sonné n'en a plus. Explosions, brûlures et
    // poussées bloquées passent à travers, et un sort `oathPierce` contre son juré aussi. La garde
    // (Garde de Scorie) amortit les coups portés au contact.
    const pierce = !!(s && s.oathPierce && oath);
    if (source && !t.hasState('stunned') && !pierce) mult *= 1 - Math.min(90, Math.max(0, t.modifier('armor'))) / 100;
    if (source && !pierce && Grid.dist(source.pos, t.pos) <= 1 && t.modifier('guard') > 0) mult *= 1 - Math.min(90, t.modifier('guard')) / 100;
    mult *= 1 - this.bloodOf(t) / 100;
    if (this.isArmed(t)) mult *= 1 - t.kit.armed.reduction / 100;
    return this.scaleByResist(t, element, base * Math.max(0, mult));
  }

  // Toute perte de PV passe ici : boucliers, journal, vol de vie, déclencheurs, fin d'invisibilité.
  dealDamage(source, t, amount, element, opts) {
    opts = opts || {};
    const dist = source ? Grid.dist(source.pos, t.pos) : 99;
    const elName0 = element ? DATA.elements[element].label.toLowerCase() : '';
    if (amount > 0 && (t.def.invulnerable || t.hasState('invulnerable'))) {
      this.emit('float', { x: t.x, y: t.y, text: '0', color: '#9fd7ff' });
      this.log(`${t.name} est invulnérable.`);
      this.fireTriggers(t, 'hit', { source, element, dist, dealt: 0, blocked: true });
      return { dealt: 0, absorbed: 0 };
    }
    if (amount > 0 && source && dist > 1 && !opts.pierce && t.effects.some(f => f.type === 'state' && f.farDodge)) {
      this.emit('float', { x: t.x, y: t.y, text: 'esquive', color: '#ffffff' });
      this.log(`${t.name} esquive : à distance, on ne le touche pas.`);
      this.fireTriggers(t, 'hit', { source, element, dist, dealt: 0, dodged: true });
      return { dealt: 0, absorbed: 0 };
    }
    if (amount > 0 && element && t.absorbElement === element) {
      const h = t.heal(amount);
      this.emit('float', { x: t.x, y: t.y, text: '+' + h, color: '#6fdc8c' });
      this.log(`${t.name} absorbe le coup (${elName0}) et récupère ${h} PV.`);
      this.fireTriggers(t, 'hit', { source, element, dist, dealt: 0, absorbed: true });
      return { dealt: 0, absorbed: 0 };
    }
    const res = this.resistOf(t, element);
    const r = t.takeDamage(amount);
    t.flashUntil = performance.now() + 250;
    // Un ennemi invisible ne trahit pas sa case par ses chiffres de dégâts.
    if (!(t.team !== 'player' && t.hasState('invisible'))) this.emit('float', { x: t.x, y: t.y, text: '-' + r.dealt, color: element ? DATA.elements[element].color : '#ffffff' });
    const elName = element ? DATA.elements[element].label.toLowerCase() : '';
    let msg;
    if (res >= 100) msg = `${t.name} est immunisé (${elName})`;
    else {
      msg = `${t.name} perd ${r.dealt} PV`;
      if (this.lastCrit) { msg += ' (coup critique)'; this.lastCrit = false; }
      if (opts.label) msg += ` (${opts.label})`;
      if (r.absorbed) msg += ` (${r.absorbed} absorbés)`;
      if (res) msg += ` (${res > 0 ? '−' : '+'}${Math.abs(res)} % ${elName})`;
    }
    this.log(msg + '.');
    if (source && source !== t) {
      if (opts.lifesteal && r.dealt > 0) {
        const h = source.heal(Math.round(r.dealt * opts.lifesteal / 100));
        if (h > 0) {
          this.emit('float', { x: source.x, y: source.y, text: '+' + h, color: '#6fdc8c' });
          this.log(`${source.name} récupère ${h} PV.`);
        }
      }
      // Attaquer révèle, sauf pour une invisibilité de nature (Fumerolle, Oubli) ; un piège qui se
      // déclenche ne révèle pas son poseur. Une invisibilité `lingering` (Nerith) tient jusqu'à la
      // fin du tour où elle a frappé.
      const inv = source.effects.find(f => f.type === 'state' && f.name === 'invisible');
      if (inv && !inv.persistent && !opts.trap) {
        if (inv.lingering) inv.revealAtEnd = true;
        else { source.removeState('invisible'); this.log(`${source.name} redevient visible.`); }
      }
      // Le sort en cours a touché un ennemi (la Fureur de Taille Franche et de Poigne en dépend).
      if (this.castCtx && this.castCtx.caster === source && t.team !== source.team && r.dealt + r.absorbed > 0) this.castCtx.hitFoe = true;
      // Fureur : frappé au corps à corps par un ennemi.
      if (t.kit && t.kit.fury && t.alive && source.team !== t.team && dist <= 1 && r.dealt + r.absorbed > 0) this.gainFury(t, t.kit.fury.onMeleeHit || 0);
      // Serment : le juré qui frappe un allié du Sarkan (pas le Sarkan) se brûle à la lame.
      const oath = this.oathOn(source);
      if (oath && oath.burn && oath.by && oath.by.alive && t !== oath.by && t.team === oath.by.team && r.dealt > 0 && !opts.oathBurn && source.alive) {
        this.dealDamage(oath.by, source, this.scaleByResist(source, 'feu', Math.round(oath.burn * (oath.by.scale || 1))), 'feu', { label: 'serment', oathBurn: true });
      }
    }
    if (t === this.player) this.hook('onDamage', t);
    if (source && source.team === 'monster' && t === this.player && r.dealt > 0 && this.knots) {
      if (this.knots.has('noeud_de_sang')) source.heal(Math.round(r.dealt / 10));
      if (this.knots.has('noeud_de_braise') && element !== null && !opts.label) {
        t.effects = t.effects.filter(f => !(f.type === 'dot' && f.knot));
        t.addEffect({ type: 'dot', element: 'feu', value: 4, turns: 2, knot: true }, false);
      }
    }
    if (element && t.alive) this.fireTriggers(t, 'hitByElement', { element, source });
    if (t.alive && r.dealt > 0) this.fireTriggers(t, 'hit', { source, element, dist, dealt: r.dealt });
    if (t.alive && r.dealt > 0) this.baliseSwap(t);
    if (t.alive) this.fireTriggers(t, 'hpBelow', {});
    else this.onDeath(t, source);
    return r;
  }

  // Ce qui arrête une poussée ou une charge sur la case (x, y) : un obstacle dur (rocher, arbre,
  // mur, bord de la carte) ou un vide (trou, eau, fente) où l'on freine sans se cogner.
  obstacleKind(x, y) {
    if (!Grid.inBounds(this.map, x, y)) return 'obstacle';
    const t = Grid.tile(this.map, x, y);
    const tmp = this.tempAt(x, y);
    if (t === Grid.ROCK || t === Grid.TREE || (tmp && tmp.kind === 'rock')) return 'obstacle';
    return 'edge';
  }

  // Charge : le lanceur fonce en ligne droite vers la case visée et ne s'arrête qu'au premier
  // obstacle. Une entité sur le chemin prend le choc et recule ; un rocher sonne le chargeur
  // (via son déclencheur « blocked »).
  async charge(e, cell, ef, s) {
    const dir = Grid.pushDirection(e.pos, cell);
    if (!dir) return;
    for (let steps = 0; steps < 30; steps++) {
      const nx = e.x + dir.x, ny = e.y + dir.y;
      const other = Grid.inBounds(this.map, nx, ny) ? this.entityAt(nx, ny) : null;
      if (other) {
        this.dealDamage(e, other, this.rollDamage(e, other, s.element, ef, s), s.element, { label: 'charge' });
        if (other.alive && ef.push) await this.displace(e, other, { type: 'push', cells: ef.push });
        this.fireTriggers(e, 'blocked', { against: 'entity', other, charging: true });
        return;
      }
      if (!this.isWalkable(nx, ny, e)) {
        const kind = this.obstacleKind(nx, ny);
        this.log(kind === 'obstacle' ? `${e.name} heurte l'obstacle de plein fouet !` : `${e.name} freine au bord du vide.`);
        this.fireTriggers(e, 'blocked', { against: kind, charging: true });
        return;
      }
      await this.emitAsync('animMove', { entity: e, to: { x: nx, y: ny }, fast: true });
      this.place(e, nx, ny);
      await this.checkTraps(e);
      if (!e.alive) return;
    }
  }

  // Perte de PV volontaire : ignore boucliers et résistances, ne peut pas tuer.
  loseHp(e, amount, label) {
    const lost = Math.min(amount, Math.max(0, e.hp - 1));
    e.hp -= lost;
    this.emit('float', { x: e.x, y: e.y, text: '-' + lost, color: '#ff5a5a' });
    this.log(`${e.name} sacrifie ${lost} PV${label ? ' (' + label + ')' : ''}.`);
    if (e === this.player) this.hook('onDamage', e);
    this.fireTriggers(e, 'hpBelow', {});
  }

  // Balise de Fil (Lyssar) : la première fois que son propriétaire est blessé, il prend la place du
  // piquet, qui disparaît. Les pièges de la case d'arrivée se déclenchent comme après un échange.
  baliseSwap(owner) {
    const b = this.summonsOf(owner).find(s => s.def.swapOnOwnerHit);
    if (!b || owner.def.fixed || owner.unpushable) return;
    const from = owner.pos, to = b.pos;
    this.emit('animMove', { entity: owner, to, teleport: true });
    this.kill(b, `${owner.name} file sur sa Balise de Fil.`);
    this.place(owner, to.x, to.y);
    owner.moved = true;
    this.log(`${owner.name} quitte la case ${from.x},${from.y} pour sa balise.`);
    this.checkTraps(owner);
  }

  // Le double de la Nerith (sur le modèle du Double du Sram) : il échange sa place avec sa
  // propriétaire, sans délai d'animation, même s'il ne bouge pas de lui-même.
  swapWithOwner(s) {
    const o = s.owner;
    if (!o || !o.alive || !s.alive || o.def.fixed || o.unpushable) return;
    const po = o.pos, ps = s.pos;
    this.emit('animMove', { entity: o, to: ps, teleport: true });
    this.emit('animMove', { entity: s, to: po, teleport: true });
    this.place(o, ps.x, ps.y);
    this.place(s, po.x, po.y);
    o.moved = true;
    this.log(`${o.name} échange sa place avec ${s.name}.`);
    this.checkTraps(o);
  }

  // ----- Déclencheurs des monstres -----

  fireTriggers(e, when, ctx) {
    ctx = ctx || {};
    e.triggers.forEach((tr, i) => {
      if (tr.when !== when) return;
      if (when === 'hpBelow') {
        if (!e.alive || e.fired.has(i) || e.hpPct() >= tr.pct) return;
        e.fired.add(i);
      }
      if (when === 'hitByElement' && tr.element !== ctx.element) return;
      if (tr.if && !this.triggerCond(e, tr.if, ctx)) return;
      if (tr.once) { if (e.fired.has(i)) return; e.fired.add(i); }
      for (const a of tr.do) this.runTrigger(e, a, ctx);
    });
  }

  // Conditions d'un déclencheur : état, distance du coup, ce qu'on a heurté, voisinage, rythme.
  triggerCond(e, c, ctx) {
    if (c.state && !e.hasState(c.state)) return false;
    if (c.notState && e.hasState(c.notState)) return false;
    if (c.distanceMax != null && !(ctx.dist <= c.distanceMax)) return false;
    if (c.against && ctx.against !== c.against) return false;
    if (c.charging && !ctx.charging) return false;
    if (c.armor === true && !(e.modifier('armor') > 0)) return false;
    if (c.armor === false && e.modifier('armor') > 0) return false;
    if (c.every && (e.turnsPlayed || 0) % c.every !== 0) return false;
    if (c.adjacentTo && !this.entities.some(o => o.alive && o !== e && o.def.id === c.adjacentTo && Grid.dist(o.pos, e.pos) === 1)) return false;
    // `voitEnnemi` (la clé de Krobb, docs/ILE-TECHNIQUE.md, 5.7) : au moins un ennemi vivant, que le
    // monstre peut voir (l'invisibilité compte), est en ligne de vue depuis sa case.
    if (c.voitEnnemi != null && this.enemies(e).some(o => this.canSee(e, o) && this.hasLos(e, e.pos, o.pos)) !== !!c.voitEnnemi) return false;
    return true;
  }

  runTrigger(e, a) {
    switch (a.act) {
      case 'log':
        this.log(a.text, 'system');
        break;
      case 'summon': {
        // `max` : pas plus de tant d'invocations vivantes de ce monstre pour ce propriétaire.
        const have = () => this.entities.filter(o => o.alive && o.caller === e && o.def.id === a.monster).length;
        for (let i = 0; i < (a.count || 1); i++) {
          if (a.max && have() >= a.max) break;
          this.spawn(a.monster, e.team, e.pos, e, e, !!DATA.monsters[a.monster].summon, e.level);
        }
        break;
      }
      case 'state':
        if (a.name === 'invisible' && e.hasState('tracked')) break;   // traqué : ne se cache plus
        e.removeState(a.name);
        e.addEffect({ type: 'state', name: a.name, turns: a.turns || 99, persistent: true, farDodge: !!a.farDodge }, true);
        break;
      case 'removeState':
        e.removeState(a.name);
        break;
      case 'stun':
        e.removeState('stunned');
        e.addEffect({ type: 'state', name: 'stunned', turns: a.turns || 1 }, this.actor === e);
        break;
      case 'skipTurn':
        e.skipNow = true;
        break;
      case 'armor':
        e.effects = e.effects.filter(f => f.type !== 'armor');
        if (a.value > 0) e.addEffect({ type: 'armor', value: a.value, turns: 999 }, true);
        break;
      case 'setEffect':
        e.effects = e.effects.filter(f => f.type !== a.effect.type);
        this.applyStatus(e, e, a.effect);
        break;
      case 'removeEffect':
        e.effects = e.effects.filter(f => f.type !== a.type);
        break;
      case 'absorb':
        e.absorbElement = a.element;
        break;
      case 'cycleColor':
        this.cycleColor(e, a.cycle);
        break;
      case 'cocoon':
        this.cocoon(e, a);
        break;
      case 'bond':
        this.bond(e, a);
        break;
      case 'feat':
        this.feats[a.key] = (this.feats[a.key] || 0) + 1;
        break;
      case 'buff':
        for (const ef of a.effects) this.applyStatus(e, e, ef);
        break;
      case 'heal': {
        const h = e.heal(Math.round(e.hpMax * a.pct / 100));
        this.emit('float', { x: e.x, y: e.y, text: '+' + h, color: '#6fdc8c' });
        this.log(`${e.name} récupère ${h} PV.`);
        break;
      }
      case 'toggleState':
        if (e.hasState(a.name)) { e.removeState(a.name); this.log(`${e.name} redevient visible.`); }
        else if (a.name === 'invisible' && e.hasState('tracked')) this.log(`${e.name} est traqué et ne peut pas se cacher.`);
        else { e.addEffect({ type: 'state', name: a.name, turns: 99, persistent: true }, true); this.log(`${e.name} devient invisible.`); }
        break;
      case 'rotateImmunity':
        e.immuneIndex = (e.immuneIndex + 1) % a.elements.length;
        e.immuneElement = a.elements[e.immuneIndex];
        this.log(`${e.name} s'immunise : ${DATA.elements[e.immuneElement].label.toLowerCase()}.`, 'system');
        break;
      case 'flood':
        this.flood(e);
        break;
      case 'shiftHoles':
        this.shiftHoles(e, a.count || 1);
        break;
      case 'explode':
        this.explode(e, a);
        break;
      case 'swapOwner':
        this.swapWithOwner(e);
        break;
      case 'vanish':
        this.kill(e, a.text || `${e.name} se dissipe.`);
        break;
      case 'glyph': {
        // Un glyphe laissé là où se tenait l'entité (la Lanterne de l'Oriel en tombant) : il
        // appartient à sa propriétaire, et vit au rythme de ses tours.
        const owner = e.owner && e.owner.alive ? e.owner : e;
        const cells = Grid.aoeCells(this.map, 'circle', a.size == null ? 1 : a.size, e.pos, e.pos);
        this.placeGlyph(owner, cells, a, { name: a.name, element: a.element || 'neutre' }, true);
        break;
      }
    }
  }

  // Couleur changeante (Kavou Prisme) : sa couleur le soigne, l'élément opposé le blesse double.
  cycleColor(e, cycle) {
    e.colorIndex = ((e.colorIndex == null ? -1 : e.colorIndex) + 1) % cycle.length;
    const c = cycle[e.colorIndex];
    e.baseResist = e.baseResist || Object.assign({}, e.resist);
    e.resist = Object.assign({}, e.baseResist);
    e.resist[c.weak] = -100;
    e.absorbElement = c.element;
    e.color = c.color;
    if (c.spell) e.spells = [c.spell];
    const label = el => DATA.elements[el].label.toLowerCase();
    this.log(`${e.name} vire au ${c.name} : ${label(c.element)} le soigne, ${label(c.weak)} le blesse double.`, 'system');
  }

  // Cocon (la Fileuse) : invulnérable tant que ses fils d'ancrage tiennent ; un seul fil coupé
  // repousse à son tour, les deux coupés entre deux de ses tours déchirent le cocon pour
  // `reweave` tours.
  cocoon(e, a) {
    const anchors = () => this.entities.filter(o => o.alive && o.owner === e && o.def.id === a.anchor);
    const plant = n => {
      const spots = [[3, 0], [-3, 0], [0, 3], [0, -3], [2, 2], [-2, -2], [2, -2], [-2, 2]];
      let planted = 0;
      for (const [dx, dy] of spots) {
        if (planted >= n) break;
        const c = { x: Math.max(0, Math.min(this.map.w - 1, e.x + dx)), y: Math.max(0, Math.min(this.map.h - 1, e.y + dy)) };
        if (this.entities.some(o => o.alive && o.owner === e && o.def.id === a.anchor && Grid.dist(o.pos, c) <= 2)) continue;
        if (this.spawn(a.anchor, e.team, c, e, e, true)) planted++;
      }
    };
    const shut = () => { e.removeState('invulnerable'); e.addEffect({ type: 'state', name: 'invulnerable', turns: 999, persistent: true }, true); };
    if (!e.cocoonInit) {
      e.cocoonInit = true;
      plant(a.count);
      shut();
      this.log(`${e.name} s'enferme dans son cocon, tenu par ${a.count} fils.`, 'system');
      return;
    }
    if (e.cocoonDown > 0) {
      if (--e.cocoonDown === 0) { plant(a.count - anchors().length); shut(); this.log(`${e.name} retisse son cocon.`, 'system'); }
      return;
    }
    const left = anchors().length;
    if (left === 0 && e.hasState('invulnerable')) {
      e.removeState('invulnerable');
      e.cocoonDown = a.reweave;
      this.log(`Le cocon de ${e.name} se déchire ! Elle est vulnérable ${a.reweave} tours.`, 'system');
      this.feats.cocon_dechire = (this.feats.cocon_dechire || 0) + 1;
    } else if (left > 0 && left < a.count) {
      plant(a.count - left);
      this.log(`${e.name} retisse le fil coupé : il faut couper les deux le même tour.`, 'system');
    }
  }

  // Lien (le Grand Tholou) : il donne `pa` PA au plus gros de ses alliés s'il est à `range`
  // cases ou moins ; plus loin, il panique et perd son tour.
  bond(e, a) {
    const allies = this.allies(e).filter(o => o !== e && !o.isSummon);
    if (!allies.length) return;
    const big = allies.sort((x, y) => y.hpMax - x.hpMax)[0];
    if (Grid.dist(big.pos, e.pos) <= a.range) {
      big.addEffect({ type: 'pa', value: a.pa, turns: 1 }, false);
      e.pa = Math.max(0, e.pa - a.pa);
      this.log(`${e.name} réchauffe ${big.name} : +${a.pa} PA à son prochain tour.`);
    } else {
      e.skipNow = true;
      this.log(`${e.name} a perdu ${big.name} de vue et panique !`, 'system');
    }
  }

  // La marée monte d'une rangée par le bas ; qui se tient dans l'eau boit la tasse.
  flood(boss) {
    if (this.floodLevel < this.map.h) {
      const y = this.map.h - 1 - this.floodLevel++;
      for (let x = 0; x < this.map.w; x++) {
        if (Grid.tile(this.map, x, y) === Grid.FLOOR && !this.tempAt(x, y)) {
          this.temp.set(Grid.key(x, y), { kind: 'water', owner: boss, turnsLeft: Infinity });
        }
      }
      this.log(`La marée monte : une rangée de plus est inondée (${this.floodLevel}).`, 'system');
    }
    for (const t of this.enemies(boss)) {
      const tmp = this.tempAt(t.x, t.y);
      if (tmp && tmp.kind === 'water' && t.alive) this.dealDamage(boss, t, this.scaleByResist(t, 'eau', 12), 'eau', { label: 'noyade' });
    }
  }

  // Les fentes changent de place : `count` trous temporaires sur des cases libres.
  shiftHoles(boss, count) {
    for (const [k, tmp] of this.temp) if (tmp.kind === 'fente') this.temp.delete(k);
    const free = [];
    for (let y = 0; y < this.map.h; y++) {
      for (let x = 0; x < this.map.w; x++) {
        if (Grid.tile(this.map, x, y) === Grid.FLOOR && !this.tempAt(x, y) && !this.entityAt(x, y)) free.push({ x, y });
      }
    }
    for (let i = 0; i < count && free.length; i++) {
      const c = free.splice(Math.floor(this.rng() * free.length), 1)[0];
      this.temp.set(Grid.key(c.x, c.y), { kind: 'fente', owner: boss, turnsLeft: Infinity });
    }
    this.log(`${boss.name} ouvre ${count} fentes dans la grille.`, 'system');
  }

  // Explosion : jet brut à l'échelle de celui qui explose (celle de son maître pour une braise),
  // sans caractéristique ni armure. `enemiesOnly` : épargne son camp (le Leurre de la Nerith).
  explode(e, a) {
    const cells = Grid.aoeCells(this.map, 'circle', a.radius, e.pos, e.pos);
    this.emit('fx', { cells, color: DATA.elements[a.element].color });
    this.log(`${e.name} explose !`, 'system');
    const k = e.scale || 1;
    for (const c of cells) {
      const t = this.entityAt(c.x, c.y);
      if (!t || t === e || (a.enemiesOnly && t.team === e.team)) continue;
      this.dealDamage(null, t, this.rollDamage(null, t, a.element, { min: Math.round(a.min * k), max: Math.round(a.max * k) }, null), a.element, { label: 'explosion' });
    }
  }

  // ----- IA des monstres et des invocations -----

  async runAI(e) {
    const gen = this.gen;
    for (let step = 0; step < 12; step++) {
      if (gen !== this.gen || this.phase !== 'battle') return;
      if (!e.alive) break;                // mort pendant son tour (un piège) : le tour se termine quand même
      if (e.hasState('stunned')) break;   // sonné en plein tour (une charge contre un rocher)
      const action = this.aiChoose(e);
      if (!action) break;
      await Util.delay(this.aiDelay);
      if (gen !== this.gen || this.phase !== 'battle') return;
      if (action.type === 'cast') await this.cast(e, action.spell, action.cell);
      else { await this.moveAlong(e, action.path); e.aiMoves++; }
    }
    if (gen !== this.gen || this.phase !== 'battle' || this.actor !== e) return;
    await Util.delay(this.aiDelay);
    if (gen !== this.gen || this.phase !== 'battle' || this.actor !== e) return;
    this.endTurn();
  }

  aiChoose(e) {
    if (e.ai === 'inert') return null;
    const all = this.enemies(e);
    if (!all.length) return null;
    const visible = all.filter(t => this.canSee(e, t));
    const allies = this.allies(e);
    // 0. Un chargeur fonce sur l'ennemi aligné le plus proche, rochers ou pas.
    if (e.ai === 'charger') {
      const a = this.aiCharge(e, visible);
      if (a) return a;
    }
    // 0 bis. Sans son armure, un boss lié à un point d'ancrage y retourne (Dorm et son enclume).
    if (e.def.home) {
      const h = this.aiHome(e);
      if (h) return h;
    }
    // 1. Un invocateur appelle d'abord.
    if (e.ai === 'summoner') {
      const a = this.aiSummon(e, visible);
      if (a) return a;
    }
    // 2. Soigner un allié mal en point, soi compris.
    for (const id of e.spells) {
      const s = this.spellOf(id, e);
      if (!s.effects.some(ef => ef.type === 'heal') || !this.spellState(e, id).ok) continue;
      const hurt = allies.filter(a => a.hp < a.hpMax * 0.6).sort((a, b) => a.hpPct() - b.hpPct());
      for (const a of hurt) if (this.canCastAt(e, id, a.pos).ok) return { type: 'cast', spell: id, cell: a.pos };
    }
    // 3. Un mur devant un ennemi qu'on ne peut pas atteindre.
    const wall = this.aiWall(e, visible);
    if (wall) return wall;
    // 4. Se renforcer d'un sort sur soi quand l'ennemi est à portée de frappe.
    const near = visible.some(t => Grid.dist(e.pos, t.pos) <= 4);
    if (near) {
      for (const id of e.spells) {
        const s = this.spellOf(id, e);
        if (s.target !== 'self' || !this.spellState(e, id).ok) continue;
        if (!s.effects.some(ef => ['shield', 'power', 'pa', 'pm', 'state'].includes(ef.type)) && !(s.selfEffects || []).some(ef => ['paNow', 'pmNow', 'shield', 'power'].includes(ef.type))) continue;
        if (s.effects.some(ef => ef.type === 'damage')) continue;
        if (e.pa - s.pa < 3) continue;   // garder de quoi frapper
        return { type: 'cast', spell: id, cell: e.pos };
      }
    }
    // 5. Attaquer d'où l'on est.
    const attack = this.aiBestAttack(e, e.pos, visible);
    if (attack) return attack;
    // 6. Bouger, au plus deux fois par tour : une approche, un repli. Un ennemi caché par un sort
    // (Voile d'Ombre) n'est cherché que là où il a disparu ; une invisibilité de nature (Fumerolle)
    // ne cache pas sa case.
    if (e.pm > 0 && e.aiMoves < 2) return this.aiMove(e, visible.length ? visible : all.map(t => this.knownSpot(e, t)).filter(Boolean));
    return null;
  }

  // Ce que `e` sait de la place de `t` : l'entité elle-même s'il la voit ou si son invisibilité est
  // de nature, sinon un repère à la case où elle a disparu.
  knownSpot(e, t) {
    if (this.canSee(e, t)) return t;
    const inv = t.effects.find(f => f.type === 'state' && f.name === 'invisible');
    if (!inv || inv.persistent) return t;
    return t.hiddenAt ? { x: t.hiddenAt.x, y: t.hiddenAt.y, pos: { x: t.hiddenAt.x, y: t.hiddenAt.y }, alive: true, team: t.team } : null;
  }

  aiCharge(e, enemies) {
    const id = e.spells.find(sid => this.spellOf(sid, e).effects.some(ef => ef.type === 'charge'));
    if (!id || !this.spellState(e, id).ok) return null;
    const aligned = enemies.filter(t => Grid.inLine(e.pos, t.pos) && this.canCastAt(e, id, t.pos).ok)
      .sort((a, b) => Grid.dist(e.pos, a.pos) - Grid.dist(e.pos, b.pos));
    if (aligned.length) return { type: 'cast', spell: id, cell: aligned[0].pos };
    // Personne dans l'axe : se placer dans l'axe d'un ennemi, au plus près.
    if (e.pm <= 0 || e.aiMoves >= 2) return null;
    const reach = this.reachFor(e);
    const s = this.spellOf(id, e);
    let best = null;
    for (const [k, d] of reach.dist) {
      if (d === 0) continue;
      const [x, y] = k.split(',').map(Number);
      const c = { x, y };
      if (!enemies.some(t => Grid.inLine(c, t.pos) && Grid.dist(c, t.pos) >= s.range[0] && Grid.dist(c, t.pos) <= s.range[1])) continue;
      if (!best || d < best.d) best = { c, d };
    }
    return best ? { type: 'move', path: Grid.pathTo(reach, best.c) } : null;
  }

  aiHome(e) {
    if (e.modifier('armor') > 0 || e.pm <= 0 || e.aiMoves >= 2) return null;
    const home = this.entities.find(o => o.alive && o.def.id === e.def.home);
    if (!home || Grid.dist(home.pos, e.pos) === 1) return null;
    // La case atteignable la plus proche de l'ancrage (à côté si possible), en contournant.
    const reach = this.reachFor(e);
    const walk = Grid.reachable(this.map, home.pos, 60, (x, y) => { const o = this.entityAt(x, y); return !!(o && o !== e); }, (x, y) => this.isWalkable(x, y, e));
    let best = null;
    for (const [k, d] of reach.dist) {
      if (d === 0) continue;
      const w = walk.dist.get(k);
      if (w == null) continue;
      if (!best || w < best.w || (w === best.w && d < best.d)) { const [x, y] = k.split(',').map(Number); best = { c: { x, y }, w, d }; }
    }
    const here = walk.dist.get(Grid.key(e.x, e.y));
    if (!best || (here != null && best.w >= here)) return null;
    return { type: 'move', path: Grid.pathTo(reach, best.c) };
  }

  aiSummon(e, enemies) {
    for (const id of e.spells) {
      const s = this.spellOf(id, e);
      if (!s.effects.some(ef => ef.type === 'summon') || !this.spellState(e, id).ok) continue;
      const cells = this.targetCells(e, id).cells.filter(c => this.canCastAt(e, id, c).ok);
      if (!cells.length) continue;
      const nearest = c => (enemies.length ? Math.min(...enemies.map(t => Grid.dist(c, t.pos))) : 0);
      cells.sort((a, b) => nearest(a) - nearest(b));
      return { type: 'cast', spell: id, cell: cells[0] };
    }
    return null;
  }

  aiWall(e, enemies) {
    for (const id of e.spells) {
      const s = this.spellOf(id, e);
      if (!s.effects.some(ef => ef.type === 'obstacle') || !this.spellState(e, id).ok) continue;
      // Contre un ennemi à distance que l'on ne peut pas frapper d'ici : un mur devant lui.
      const far = enemies.filter(t => Grid.dist(e.pos, t.pos) >= 3 && !this.aiBestAttack(e, e.pos, [t]));
      for (const t of far) {
        const dir = Grid.pushDirection(t.pos, e.pos);
        const c = { x: t.x + dir.x, y: t.y + dir.y };
        if (this.canCastAt(e, id, c).ok) return { type: 'cast', spell: id, cell: c };
      }
    }
    return null;
  }

  // Meilleure attaque possible depuis `from` : dégâts attendus, prime si le coup achève la cible.
  aiBestAttack(e, from, enemies) {
    let best = null;
    for (const id of e.spells) {
      const s = this.spellOf(id, e);
      const dmg = s.effects.find(ef => ef.type === 'damage');
      if (!dmg || !this.spellState(e, id).ok) continue;
      // Sort centré sur soi (Piétinement, Tremblement) : on compte les ennemis dans la zone.
      if (s.target === 'self') {
        if (!this.canCastAt(e, id, from, from).ok) continue;
        const zone = s.aoe ? Grid.aoeCells(this.map, s.aoe.shape, s.aoe.size, from, from) : [from];
        const score = enemies
          .filter(t => !t.def.invulnerable && !t.hasState('invulnerable') && t.absorbElement !== s.element && zone.some(c => c.x === t.x && c.y === t.y))
          .reduce((sum, t) => sum + Math.max(0, ((dmg.min + dmg.max) / 2) * (1 - this.resistOf(t, s.element) / 100)), 0);
        if (score > 0 && (!best || score > best.score)) best = { type: 'cast', spell: id, cell: { x: from.x, y: from.y }, score };
        continue;
      }
      for (const t of enemies) {
        if (t.def.invulnerable || t.hasState('invulnerable')) continue;
        if (t.absorbElement === s.element) continue;
        if (!this.canSee(e, t) || !this.canCastAt(e, id, t.pos, from).ok) continue;
        const expected = ((dmg.min + dmg.max) / 2) * (1 - this.resistOf(t, s.element) / 100);
        if (expected <= 0) continue;
        const score = expected + (t.hp + t.shield <= expected ? 50 : 0) - t.hp * 0.05 - (t.isSummon ? 10 : 0);
        if (!best || score > best.score) best = { type: 'cast', spell: id, cell: t.pos, score };
      }
    }
    return best;
  }

  aiMove(e, enemies) {
    const reach = this.reachFor(e);
    const cells = [];
    for (const [k, d] of reach.dist) {
      if (d === 0) continue;
      const [x, y] = k.split(',').map(Number);
      cells.push({ x, y, d });
    }
    if (!cells.length) return null;
    // Distance de marche jusqu'à l'ennemi le plus proche (contourne rochers et murs) ; à vol
    // d'oiseau si aucun chemin n'existe.
    const walks = enemies.map(t => Grid.reachable(this.map, t.pos, 60, (x, y) => { const o = this.entityAt(x, y); return !!(o && o !== e && o !== t); }, (x, y) => this.isWalkable(x, y, e)));
    const nearest = c => Math.min(...enemies.map((t, i) => { const d = walks[i].dist.get(Grid.key(c.x, c.y)); return d == null ? 100 + Grid.dist(c, t.pos) : d; }));
    const canStillCast = e.spells.some(id => this.spellState(e, id).ok && this.spellOf(id, e).effects.some(ef => ef.type === 'damage'));
    if (canStillCast) {
      // Une case d'où tirer : la plus proche pour un cogneur, la plus lointaine pour un tireur.
      const real = enemies.filter(t => t.def);   // pas les repères d'ennemis cachés
      const good = real.length ? cells.filter(c => this.aiBestAttack(e, c, real)) : [];
      if (good.length) {
        if (e.ai === 'ranged') good.sort((a, b) => nearest(b) - nearest(a) || a.d - b.d);
        else good.sort((a, b) => a.d - b.d);
        return { type: 'move', path: Grid.pathTo(reach, good[0]) };
      }
      // Sinon, se rapprocher.
      cells.sort((a, b) => nearest(a) - nearest(b) || a.d - b.d);
      if (nearest(cells[0]) >= nearest(e.pos)) return null;
      return { type: 'move', path: Grid.pathTo(reach, cells[0]) };
    }
    // PA épuisés : un tireur au contact se replie.
    if (e.ai === 'ranged' && nearest(e.pos) <= 2) {
      cells.sort((a, b) => nearest(b) - nearest(a) || a.d - b.d);
      if (nearest(cells[0]) > nearest(e.pos)) return { type: 'move', path: Grid.pathTo(reach, cells[0]) };
    }
    return null;
  }
}
