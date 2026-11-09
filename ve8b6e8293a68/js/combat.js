
const ASTRES = { feu: 'Soleil', eau: 'Lune', air: 'Étoiles', terre: 'Astres tombés' };
const RAYONNANT = 15;
const LANTERNE_ASTRES = {
  feu: { sort: 'm_lanterne_soin', couleur: '#ffd166' },
  eau: { sort: 'm_lanterne_lune', couleur: '#9fd8f0' },
  air: { sort: 'm_lanterne_etoile', couleur: '#e6eef8' },
  terre: { sort: 'm_lanterne_astre', couleur: '#d9a066' },
};

class Combat {
  constructor(opts) {
    this.rng = opts.rng || Math.random;
    this.turnSeconds = opts.turnSeconds || DATA.rules.turnSeconds;
    this.aiDelay = opts.aiDelay == null ? 350 : opts.aiDelay;
    this.map = Grid.create();
    this.entities = [];
    this.order = [];
    this.temp = new Map();
    this.traps = [];
    this.glyphs = [];
    this.phase = 'placement';
    this.round = 0;
    this.turnIndex = -1;
    this.actor = null;
    this.busy = false;
    this.gen = 0;
    this.nextId = 1;
    this.floodLevel = 0;
    this.turnTimer = null;
    this.turnEndsAt = 0;
    this.listeners = {};
  }


  on(evt, fn) {
    (this.listeners[evt] = this.listeners[evt] || []).push(fn);
  }

  emit(evt, data) {
    for (const fn of this.listeners[evt] || []) fn(data);
  }

  async emitAsync(evt, data) {
    const results = [];
    for (const fn of this.listeners[evt] || []) results.push(fn(data));
    await Promise.all(results);
  }

  log(msg, kind) {
    this.emit('log', { msg, kind: kind || 'info' });
  }


  setup(encounter, classId) {
    this.gen++;
    this.puissanceMonstres = 1;
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
    this.challenges = [];
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
    this.vagues = null;
    this.epreuveDojo = null;
    this.turnIndex = -1;
    this.actor = null;
    this.emit('setup');
    this.log(`${player.name} contre ${encounter.name}. Choisis ta case de départ (en bleu), puis « Prêt ».`, 'system');
  }

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
    this.puissanceMonstres = opts.monsterPower || 1;
    const reds = opts.monsterCells.slice();
    opts.monsters.forEach((m, i) => {
      const e = new Entity(DATA.monsters[m.id], 'monster', this.nextId++, this.rng, m.level);
      e.scale *= this.puissanceMonstres;
      const fixe = opts.monsterAssign && opts.monsterCells[i] && !this.entityAt(opts.monsterCells[i].x, opts.monsterCells[i].y) ? opts.monsterCells[i] : null;
      const c = fixe || (opts.monsterAssign ? this.freeCellNear(opts.monsterCells[0]) : reds.length ? reds.splice(Math.floor(this.rng() * reds.length), 1)[0] : this.freeCellNear(opts.monsterCells[0]));
      if (c) this.place(e, c.x, c.y);
      this.entities.push(e);
    });
    const b = opts.playerStart || opts.playerCells[Math.floor(this.rng() * opts.playerCells.length)];
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
    this.order = this.ordreDesTours();
    this.round = 1;
    this.turnIndex = -1;
    this.debut = Date.now();
    this.log('Le combat commence.', 'system');
    for (const e of this.entities) if (this.estOriel(e) && !e.veille) e.veille = this.veilleDuMonde();
    for (const e of this.entities.slice()) if (e.alive) this.fireTriggers(e, 'fightStart', {});
    this.applyKnots();
    this.hook('onStart');
    this.emit('start');
    this.nextTurn();
  }

  ordreDesTours() {
    const parInit = (a, b) => b.initiative - a.initiative;
    if (!DATA.rules.tourAlterne) return this.entities.slice().sort(parInit);
    const maitre = e => e.isSummon && e.owner && this.entities.includes(e.owner) ? e.owner : null;
    const chefs = this.entities.filter(e => !maitre(e));
    const camps = {};
    for (const e of chefs.sort(parInit)) (camps[e.team] = camps[e.team] || []).push(e);
    const listes = Object.values(camps).sort((a, b) => b[0].initiative - a[0].initiative);
    const ordre = [];
    for (let i = 0; listes.some(l => i < l.length); i++) for (const l of listes) if (i < l.length) ordre.push(l[i]);
    for (const e of this.entities) {
      const m = maitre(e);
      if (!m) continue;
      let k = ordre.indexOf(m);
      while (k + 1 < ordre.length && maitre(ordre[k + 1]) === m) k++;
      ordre.splice(k + 1, 0, e);
    }
    return ordre;
  }

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

  hook(name, ...args) {
    for (const c of this.challenges) if (c && c.event(name, this, ...args)) this.emit('challenge', c);
  }
  get challenge() { return this.challenges[0] || null; }
  set challenge(c) { this.challenges = c ? [c] : []; }


  tempAt(x, y) {
    return this.temp.get(Grid.key(x, y)) || null;
  }

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

  canSee(viewer, t) {
    return t.team === viewer.team || !t.hasState('invisible') || t.hasState('tracked');
  }

  hasLos(e, from, to, terrainOnly) {
    return Grid.hasLineOfSight(this.map, from, to, (x, y) => {
      if (this.blocksSight(x, y)) return true;
      if (terrainOnly) return false;
      const o = this.entityAt(x, y);
      return !!(o && o !== e && this.canSee(e, o));
    });
  }

  freeCellNear(center, maxRadius) {
    for (let r = 0; r <= (maxRadius || 4); r++) {
      const ring = Grid.aoeCells(this.map, 'circle', r, center, center)
        .filter(c => Grid.dist(c, center) === r && this.isWalkable(c.x, c.y, null) && !this.entityAt(c.x, c.y));
      if (ring.length) return ring[Math.floor(this.rng() * ring.length)];
    }
    return null;
  }


  alivePlayers() { return this.entities.filter(e => e.alive && e.team === 'player' && !e.isSummon); }
  aliveMonsters() { return this.entities.filter(e => e.alive && e.team === 'monster' && !e.isSummon); }
  allies(e) { return this.entities.filter(t => t.alive && t.team === e.team); }
  enemies(e) { return this.entities.filter(t => t.alive && t.team !== e.team); }
  summonsOf(e) { return this.entities.filter(t => t.alive && t.isSummon && t.owner === e); }
  gibierDe(m) {
    if (!m || !m.isSummon || !m.owner) return null;
    return this.enemies(m).find(t => this.canSee(m, t) && t.effects.some(f => f.type === 'state' && f.name === 'gibier' && f.by === m.owner)) || null;
  }

  bilan() {
    return this.entities.filter(e => !e.isSummon).map(e => Object.assign({ nom: e.name, equipe: e.team, moi: e === this.player, vivant: e.alive, niveau: e.level || (e.def && e.def.level) || null, id: e.def && e.def.id },
      { degats: 0, recus: 0, soins: 0, boucliers: 0, acheves: 0, soinsRecus: 0, bouclRecus: 0 }, e.bilan || {}));
  }
  noter(e, cle, n) {
    if (!e || !(n > 0)) return;
    if (e.isSummon && e.owner) { if (cle === 'recus' || cle === 'bouclRecus') return; e = e.owner; }
    const b = e.bilan || (e.bilan = { degats: 0, recus: 0, soins: 0, boucliers: 0 });
    b[cle] = (b[cle] || 0) + n;
  }

  summonBlock(e, monsterId, planned) {
    const mine = this.summonsOf(e);
    const gauge = this.jaugeDe(e) + (this.jaugeDe(e) ? (e.invocations || 0) : 0);
    const max = DATA.rules.maxSummonsPerOwner + (e.invocations || 0);
    if (!gauge) return mine.length + (planned || 0) >= max ? `${max} invocations au plus` : null;
    const cost = m => (DATA.monsters[m] && DATA.monsters[m].summonCost) || 1;
    if (cost(monsterId) > 1 && mine.some(m => m.def.id === monsterId)) return 'Une grande bête de chaque espèce';
    const used = mine.reduce((n, m) => n + cost(m.def.id), 0) + (planned || 0);
    return used + cost(monsterId) > gauge ? `Jauge de meute : ${used} sur ${gauge}` : null;
  }

  jaugeDe(e) {
    const d = e && e.def;
    if (!d || !d.summonGauge) return 0;
    return d.summonGauge + (d.jaugeNiveaux || []).filter(n => (e.level || 1) >= n).length + (e.horde ? e.horde.jauge : 0);
  }

  sangChaud(e) {
    const k = e && e.kit && e.kit.sangChaud;
    if (!k || !e.alive) return { palier: 0, pct: 0, nom: null };
    const p = e.hpPct();
    let r = { palier: 0, pct: 0, nom: null };
    k.paliers.forEach(([seuil, pct, nom], i) => { if (p <= seuil) r = { palier: i + 1, pct, nom }; });
    return r;
  }

  protecteurDe(t) {
    const f = t.effects.find(x => x.type === 'state' && x.name === 'protege');
    const k = f && f.by && f.by.alive ? f.by : null;
    if (k && k !== t) return k;
    return this.entities.find(b => b.alive && b !== t && b.def.encaisse && b.team === t.team && Grid.dist(b.pos, t.pos) <= b.def.encaisse) || null;
  }

  coutPa(e, s) {
    if (e && e.horde && s.effects.some(f => f.type === 'summon')) return Math.max(1, s.pa - e.horde.rabais);
    return s.pa;
  }

  ordreMeute(e, ef) {
    const k = (ef.pct || 50) / 100;
    let n = 0;
    for (const m of this.summonsOf(e)) {
      const s = (m.spells || []).map(id => DATA.spells[id]).find(x => x && x.effects.some(f => f.type === 'damage'));
      if (!s) continue;
      const dm = s.effects.find(f => f.type === 'damage');
      const aPortee = u => this.canSee(m, u) && Grid.dist(m.pos, u.pos) >= s.range[0] && Grid.dist(m.pos, u.pos) <= s.range[1];
      const g = this.gibierDe(m);
      const t = g && aPortee(g) ? g : this.enemies(m).filter(aPortee).sort((a, b) => a.hp - b.hp)[0];
      if (!t) continue;
      n++;
      this.log(`${m.name} obéit et frappe ${t.name}.`, e.team);
      this.dealDamage(m, t, this.rollDamage(m, t, s.element, { min: dm.min * k, max: dm.max * k }, s), s.element, { label: 'ordre' });
    }
    if (!n) this.log('Aucune bête n\'a de proie à portée.', e.team);
  }

  async demonter(e, m) {
    if (!m || !m.alive || !m.isSummon || m.owner !== e || !m.def.relique) { this.log('Il faut viser une de ses reliques.', e.team); return; }
    const s = (m.spells || []).map(id => this.spellOf(id, m)).find(Boolean);
    if (s) {
      const aPortee = u => u !== m && this.canSee(m, u) && Grid.dist(m.pos, u.pos) >= s.range[0] && Grid.dist(m.pos, u.pos) <= s.range[1];
      const soutien = s.target === 'ally' || s.affects === 'allies';
      const t = soutien ? this.allies(m).filter(aPortee).sort((a, b) => a.hpPct() - b.hpPct())[0]
        : this.enemies(m).filter(aPortee).sort((a, b) => a.hp - b.hp)[0];
      if (t) {
        this.log(`${m.name} donne son dernier coup.`, e.team);
        for (const f of s.effects) {
          if (!t.alive) break;
          if (f.type === 'push' || f.type === 'pull') await this.displace(m, t, f, m.pos);
          else await this.applyEffect(m, t, f, s);
        }
      }
    }
    this.kill(m, `${e.name} démonte ${m.name} et en garde les pièces.`);
    if (e.kit && e.kit.reserve) this.gainReserve(e, 1);
  }

  pacte(e, ef) {
    const betes = this.summonsOf(e).filter(m => m.def.summonCost);
    if (!betes.length) { this.log(`${e.name} n'a aucune bête à sacrifier.`, e.team); return; }
    let gain = 0, soin = 0;
    for (const m of betes) {
      gain += m.def.summonCost * (ef.par || 3);
      soin += m.hp * (ef.soin || 30) / 100;
      this.kill(m, `${m.name} se donne à ${e.name}.`);
    }
    e.addEffect({ type: 'power', value: gain, turns: ef.turns || 3 }, e === this.actor);
    const h = e.heal(Math.round(soin));
    this.log(`${e.name} prend la force de sa meute : +${gain} % de dégâts${h ? `, ${h} PV` : ''}.`, e.team);
  }

  checkEnd() {
    if (this.phase !== 'battle') return true;
    if (!this.alivePlayers().length) { this.finish(false); return true; }
    if (!this.aliveMonsters().length) { if (this.lancerVagues(true)) return false; this.finish(true); return true; }
    return false;
  }

  lancerVagues(force) {
    if (!this.vagues || !this.vagues.length) return false;
    const dues = force ? [this.vagues[0]] : this.vagues.filter(v => v.round <= this.round);
    if (!dues.length) return false;
    this.vagues = this.vagues.filter(v => !dues.includes(v));
    const ref = this.entities.find(e => e.team === 'monster' && !e.isSummon);
    const niveau = ref ? ref.level : (this.player ? this.player.level : 1);
    const starts = (this.placementCells && this.placementCells.monster) || (this.map.starts && this.map.starts.monster) || [];
    let n = 0;
    for (const v of dues) for (const id of v.monstres) {
      const near = starts.length ? starts[Math.floor(this.rng() * starts.length)] : (ref ? ref.pos : this.player.pos);
      if (this.spawn(id, 'monster', near, null, null, false, niveau)) n++;
    }
    if (n) this.log('Une nouvelle vague entre sur la cour.', 'system');
    return n > 0;
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
        for (const [k, tmp] of this.temp) {
          if (tmp.owner && !tmp.owner.alive && isFinite(tmp.turnsLeft) && --tmp.turnsLeft <= 0) this.temp.delete(k);
        }
        this.emit('round');
        this.lancerVagues();
      }
      const e = this.order[this.turnIndex];
      if (e.alive) { this.beginTurn(e); return; }
    }
  }

  beginTurn(e) {
    this.actor = e;
    e.beginTurn();
    if (e.isSummon && e.def.id === 'lanterne_de_veille') this.astreLanterne(e);
    e.turnsPlayed = (e.turnsPlayed || 0) + 1;
    for (const [k, tmp] of this.temp) {
      if (tmp.owner === e && isFinite(tmp.turnsLeft) && --tmp.turnsLeft <= 0) this.temp.delete(k);
    }
    this.log(`Tour de ${e.name}` + (e === this.player ? ` : ${e.pa} PA, ${e.pm} PM.` : '.'), 'turn');
    this.tickDots(e);
    if (e.alive) this.tickBraise(e);
    e.glyphThisTurn = false;
    e.telefragThisTurn = false;
    e.aubaineTour = false;
    if (e.turnsPlayed === 1 && e.aPassif('air_gk')) { e.pm += 1; this.log(`${e.name} est libre comme l'air : +1 PM.`); }
    if (this.gibierDe(e)) { e.pm += 1; this.log(`${e.name} sent le gibier : +1 PM.`, e.team); }
    e.turnStartPos = { x: e.x, y: e.y };
    if (e.alive) this.applyGlyphs(e);
    this.ageGlyphs(e);
    if (e.horde && --e.horde.tours <= 0) {
      e.horde = null;
      for (const m of this.summonsOf(e)) this.kill(m, `${m.name} retourne à la lande.`);
      this.log(`La horde de ${e.name} se disperse.`, e.team);
    }
    const stunned = e.alive && e.hasState('stunned');
    if (e.alive && !stunned) this.fireTriggers(e, 'turnStart', {});
    if (e.alive) this.hook('onAnyTurnStart', e);
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

  tickDots(e) {
    for (const f of e.effects.filter(f => f.type === 'dot')) {
      if (!e.alive) break;
      this.dealDamage(null, e, this.scaleByResist(e, f.element, f.value), f.element, { label: 'brûlure' });
    }
    for (const f of e.effects.filter(f => f.type === 'soinDiffere')) {
      if (!e.alive) break;
      e.effects = e.effects.filter(x => x !== f);
      if (f.brut) {
        const h = e.heal(f.min);
        this.noter(e, 'soins', h);
        if (h > 0) { this.emit('float', { x: e.x, y: e.y, text: '+' + h, color: '#6fdc8c' }); this.log(`${e.name} récupère ${h} PV (la vie volée revient).`); }
        continue;
      }
      this.applyEffect(f.owner && f.owner.alive ? f.owner : null, e, { type: 'heal', min: f.min, max: f.max, mult: f.mult }, f.spell);
    }
  }


  estOriel(e) { return !!(e && !e.isSummon && e.kit && e.kit.id === 'oriel'); }

  veilleDuMonde() {
    try {
      if (typeof Heure === 'object' && Heure.moment) { const m = Heure.moment(Date.now()).id; return m === 'crepuscule' || m === 'nuit' ? 'crepuscule' : 'aube'; }
    } catch (err) {   }
    return 'aube';
  }

  rayonner(e, t) {
    const deja = t.hasState('rayonnant');
    t.removeState('rayonnant');
    t.addEffect({ type: 'state', name: 'rayonnant', turns: 1, by: e }, t === this.actor);
    if (!deja) this.log(`${t.name} devient Rayonnant : +${RAYONNANT} % de soins reçus.`, e.team);
  }

  astreLanterne(m) {
    if (!m || m.def.id !== 'lanterne_de_veille') return;
    const a = (m.owner && m.owner.astre) || 'feu', L = LANTERNE_ASTRES[a] || LANTERNE_ASTRES.feu;
    if (m.astre === a) return;
    m.astre = a;
    m.spells = [L.sort];
    m.color = L.couleur;
    this.log(`${m.name} prend la lumière ${a === 'eau' ? 'de la Lune' : a === 'air' ? 'des Étoiles' : a === 'terre' ? 'des Astres tombés' : 'du Soleil'}.`, m.team);
  }

  ecourter(source, t, ef) {
    const n = ef.tours || 1, allie = source && t.team === source.team;
    const malus = f => ((f.type === 'pa' || f.type === 'pm' || f.type === 'power' || f.type === 'range') && f.value < 0) || f.type === 'vuln' || f.type === 'dot' || f.type === 'echo'
      || (f.type === 'state' && ['provoked', 'tracked', 'unhealable', 'tenu', 'stunned'].includes(f.name));
    const bonus = f => ((f.type === 'pa' || f.type === 'pm' || f.type === 'power' || f.type === 'range') && f.value > 0) || f.type === 'shield' || f.type === 'armor' || f.type === 'guard'
      || (f.type === 'state' && ['invisible', 'digue', 'brise_lames', 'protege', 'intaclable'].includes(f.name));
    let k = 0;
    for (const f of t.effects) if (!f.persistent && isFinite(f.turns) && (allie ? malus(f) : bonus(f))) { f.turns -= n; k++; }
    t.effects = t.effects.filter(f => !(isFinite(f.turns) && f.turns <= 0));
    this.log(k ? `${t.name} : ${allie ? 'ses malus' : 'ses bonus'} durent ${n} tour de moins.` : `${t.name} n'a rien à écourter.`);
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
    if (e.tient) this.lacher(e);
    e.resteFixe = !e.moved;
    if (e === this.player) this.hook('onTurnEnd', e);
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


  reachFor(e) {
    return Grid.reachable(this.map, e.pos, e.pm, (x, y) => !!this.entityAt(x, y), (x, y) => this.isWalkable(x, y, e));
  }

  async moveAlong(e, path) {
    if (this.busy || !path || !path.length || path.length > e.pm) return false;
    if (this.actingCheck(e)) return false;
    let prev = e.pos;
    for (const step of path) {
      if (!step || !Number.isInteger(step.x) || !Number.isInteger(step.y) || Grid.dist(prev, step) !== 1) return false;
      prev = step;
    }
    this.busy = true;
    if (e.tient) this.lacher(e);
    try {
      for (const step of path) {
        if (!this.isWalkable(step.x, step.y, e) || this.entityAt(step.x, step.y)) break;
        this.tackle(e);
        if (e.pm <= 0) break;
        await this.emitAsync('animMove', { entity: e, to: step });
        this.place(e, step.x, step.y);
        e.pm--;
        e.moved = true;
        e.pmDepenses = (e.pmDepenses || 0) + 1;
        if (e === this.player) this.hook('onStep', e);
        this.emit('update');
        if (await this.checkTraps(e)) { if (!e.alive || e.pm <= 0) break; }
      }
    } finally {
      this.busy = false;
    }
    if (!e.alive && !this.checkEnd() && e === this.player && this.actor === e) this.endTurn();
    return true;
  }

  async teleport(e, cell, s, verb) {
    await this.emitAsync('animMove', { entity: e, to: cell, teleport: true });
    this.place(e, cell.x, cell.y);
    this.affutSaut(e, s);
    this.log(`${e.name} ${verb || 'se téléporte'}.`);
    await this.checkTraps(e);
  }

  async telefrag(e, t, s) {
    const from = e.pos;
    await this.swap(e, t);
    if (e.x === from.x && e.y === from.y) return;
    this.log(`Téléfrag : ${e.name} et ${t.name} échangent leurs places.`);
    if (!e.telefragThisTurn) {
      e.telefragThisTurn = true;
      e.pa += s.telefrag;
      this.emit('float', { x: e.x, y: e.y, text: `+${s.telefrag} PA`, color: '#4a90ff' });
      this.log(`${e.name} gagne ${s.telefrag} PA.`);
    }
    await this.checkTraps(e);
  }

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

  async retreat(e, ef, s) {
    const steps = this.retreatSteps(e, ef.cells);
    if (!steps.length) { this.log(`${e.name} n'a pas la place de reculer.`); return; }
    for (const step of steps) {
      await this.emitAsync('animMove', { entity: e, to: step, fast: true });
      this.place(e, step.x, step.y);
      if (await this.checkTraps(e)) { if (!e.alive) return; }
    }
    this.affutSaut(e, s);
    this.log(`${e.name} recule de ${steps.length} case(s).`);
  }

  async swap(a, b) {
    if (a.def.fixed || b.def.fixed || a.unpushable || b.unpushable) { this.log(`${a.def.fixed || a.unpushable ? a.name : b.name} ne bouge pas.`); return; }
    if (b.hasState('assise')) { this.log(`${b.name} tient bon : assis comme la montagne.`); return; }
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

  async displace(caster, target, ef, origin) {
    const from = origin || caster.pos;
    const dir = ef.type === 'push'
      ? Grid.pushDirection(from, target.pos)
      : Grid.pushDirection(target.pos, from);
    if (!dir) return;
    if (target.def.fixed || target.unpushable) { this.log(`${target.name} ne bouge pas.`); return; }
    if (target !== caster && target.hasState('assise')) { this.log(`${target.name} tient bon : assis comme la montagne.`); return; }
    const cells = ef.cells + (caster && caster !== target && caster.hasState('assise') ? 1 : 0)
      + (ef.type === 'pull' && caster && caster !== target && this.sangChaud(caster).palier >= 2 ? 1 : 0);
    let moved = 0;
    for (let i = 0; i < cells; i++) {
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
    const remaining = cells - moved;
    if (ef.type === 'push' && remaining > 0) {
      this.dealDamage(caster, target, Math.max(0, remaining * (DATA.rules.pushDamagePerCell + (caster ? caster.poussee || 0 : 0)) - (target.resPou || 0)), null, { label: 'poussée bloquée' });
    } else if (moved) {
      this.log(`${target.name} est ${ef.type === 'push' ? 'poussé' : 'attiré'} de ${moved} case(s).`);
    }
  }


  placeTrap(e, cell, ef, s) {
    if (s.trapReplaceOldest) {
      while (this.traps.filter(t => t.owner === e).length >= DATA.rules.maxTrapsPerOwner) {
        this.traps.splice(this.traps.findIndex(t => t.owner === e), 1);
        this.log(`Le plus ancien piège de ${e.name} disparaît.`);
      }
    }
    this.traps.push({
      x: cell.x, y: cell.y, owner: e, name: ef.name || s.name, element: s.element,
      effects: ef.effects, expiresRound: this.round + DATA.rules.trapRounds, zone: ef.zone || null,
    });
    this.log(`${e.name} pose ${ef.name || s.name}.`);
  }

  placeGlyph(e, cells, ef, s, fromTrigger) {
    this.glyphs.push({
      owner: e, name: ef.name || s.name, element: s.element, turnsLeft: ef.turns || 2,
      affects: ef.affects || 'allies', effects: ef.effects || [], cells: cells.map(c => ({ x: c.x, y: c.y })), unique: !!ef.unique,
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

  sousMaree(t) {
    for (const v of this.entities) {
      const k = v.alive && v.team === t.team && v.kit && v.kit.mare;
      if (!k) continue;
      if (this.glyphsAt(t.x, t.y).some(g => g.owner === v)) return k.armure || 15;
    }
    return 0;
  }

  declencherMares(e) {
    const mares = this.glyphs.filter(g => g.owner === e);
    if (!mares.length) { this.log(`${e.name} n'a aucun Glyphe en jeu.`, e.team); return; }
    this.log(`${e.name} frappe le sol de son bâton : ses Glyphes s'éveillent.`, e.team);
    const vus = new Set();
    for (const g of mares) for (const c of g.cells) {
      const t = this.entityAt(c.x, c.y);
      if (!t || !t.alive || vus.has(t)) continue;
      vus.add(t);
      if (t.team !== e.team) this.applyGlyphs(t, g);
    }
  }

  applyGlyphs(e, seul) {
    for (const g of (seul ? [seul] : this.glyphsAt(e.x, e.y))) {
      const ally = e.team === g.owner.team;
      if ((g.affects === 'allies') !== ally) continue;
      for (const ef of g.effects) {
        if (!e.alive) break;
        if (ef.type === 'damage') this.dealDamage(g.owner, e, this.rollDamage(g.owner, e, g.element, ef, null), g.element, { label: g.name });
        else if (ef.type === 'heal') {
          const h = e.heal(Math.round(this.rand(ef.min, ef.max) * (g.owner.scale || 1)));
          this.noter(g.owner, 'soins', h);
          if (h) { this.emit('float', { x: e.x, y: e.y, text: '+' + h, color: '#6fdc8c' }); this.log(`${g.name} : ${e.name} récupère ${h} PV.`); }
          if (h > 0 && e === this.player) this.hook('onHeal', e, h);
        } else if (ef.type === 'shield') {
          const v = ef.pctOwnerHp ? Math.round(g.owner.hpMax * ef.pctOwnerHp / 100) : ef.value;
          e.effects = e.effects.filter(f => !(f.type === 'shield' && f.glyph === g));
          e.addEffect({ type: 'shield', value: v, turns: ef.duration || 1, glyph: g }, true);
          this.noter(g.owner, 'boucliers', v);
          this.noter(e, 'bouclRecus', v);
          this.log(`${g.name} : ${e.name} reçoit un bouclier de ${v}.`);
        } else if ((ef.type === 'pa' || ef.type === 'pm') && ef.value < 0 && e === this.actor) {
          const lost = this.removalLanded(g.owner, e, ef.type, -ef.value);
          if (lost) { e[ef.type] = Math.max(0, e[ef.type] - lost); this.log(`${g.name} : ${e.name} perd ${lost} ${ef.type.toUpperCase()}.`); }
        } else this.applyStatus(g.owner, e, ef);
      }
      if (g.unique) { this.glyphs = this.glyphs.filter(x => x !== g); this.log(`${e.name} reçoit ${g.name}.`); this.emit('update'); }
    }
  }

  async checkTraps(e) {
    const idx = this.traps.findIndex(t => t.x === e.x && t.y === e.y && t.owner.team !== e.team);
    if (idx < 0) return false;
    const trap = this.traps.splice(idx, 1)[0];
    this.emit('fx', { cells: [{ x: trap.x, y: trap.y }], color: DATA.elements[trap.element].color });
    this.log(`${e.name} déclenche ${trap.name} !`, trap.owner.team);
    const kp = trap.owner && trap.owner.kit && trap.owner.kit.pli;
    if (kp) { trap.owner.piegesPli = Math.min(kp.max || 5, (trap.owner.piegesPli || 0) + 1); this.log(`${trap.owner.name} : Pli ${trap.owner.piegesPli} / ${kp.max || 5}.`, trap.owner.team); }
    await this.emitAsync('animTrap', { trap, entity: e });
    if (trap.zone) {
      const cells = Grid.aoeCells(this.map, trap.zone.shape, trap.zone.size, { x: trap.x, y: trap.y }, { x: trap.x, y: trap.y });
      this.emit('fx', { cells, color: DATA.elements[trap.element].color });
      for (const c of cells) {
        const o = this.entityAt(c.x, c.y);
        if (!o || o === e || !o.alive || o.team === trap.owner.team) continue;
        for (const ef of trap.effects) {
          if (!o.alive) break;
          if (ef.type === 'damage') this.dealDamage(trap.owner, o, this.rollDamage(trap.owner, o, trap.element, ef, null), trap.element, { label: trap.name, trap: true });
          else if (ef.type === 'dot') this.applyStatus(trap.owner, o, ef);
        }
      }
    }
    for (const ef of trap.effects) {
      if (!e.alive) break;
      if (ef.type === 'damage') {
        this.dealDamage(trap.owner, e, this.rollDamage(trap.owner, e, trap.element, ef, null), trap.element, { label: trap.name, trap: true });
      } else if (ef.type === 'push' || ef.type === 'pull') {
        await this.displace(trap.owner, e, ef);
      } else if ((ef.type === 'pa' || ef.type === 'pm') && e === this.actor && ef.value < 0) {
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


  spawn(monsterId, team, near, anchor, owner, asSummon, level) {
    const def = DATA.monsters[monsterId];
    const cell = def ? this.freeCellNear(near) : null;
    if (!cell) return null;
    const [lo, hi] = Entity.levelRange(def);
    const m = new Entity(def, team, this.nextId++, this.rng, level ? Math.max(lo, Math.min(hi, level)) : undefined);
    m.isSummon = !!asSummon;
    m.owner = m.isSummon ? (owner || null) : null;
    if (team === 'monster' && !(m.isSummon && owner && def.summon && DATA.rules.summonsScaleWithOwner)) m.scale *= this.puissanceMonstres || 1;
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
    const ctx = this.castCtx;
    if (ctx && source && source === ctx.caster) {
      ctx.kills.push(t);
      if (ctx.spell.purse && t.team !== source.team && !t.isSummon) {
        t.lootBonus = Math.max(t.lootBonus || 0, ctx.spell.purse);
        this.log(`${source.name} fait les poches de ${t.name} : +${ctx.spell.purse} % de butin.`);
      }
    }
    const oath = t.effects.find(f => f.type === 'state' && f.name === 'sworn');
    if (oath && source && oath.by === source && source.alive) this.keepOath(source, t, oath);
    if (source && source.alive && source === this.actor && t.team !== source.team && source.aPassif('air_dk')) { source.pm += 2; this.log(`${source.name} profite de la tempête : +2 PM.`); }
    const ko = source && source.kit && source.kit.ombre;
    if (ko && source.alive && source === this.actor && t.team !== source.team && !t.isSummon && source.ombreTour !== this.round && (source.cooldowns[ko.sort] || 0) > 0) {
      source.cooldowns[ko.sort] = 0; source.ombreTour = this.round;
      this.log(`${source.name} rentre dans l'ombre : le Manteau d'Ombre est de nouveau prêt.`, source.team);
    }
    if (!silent && t.isSummon && t.def.echangeAMort && t.owner && t.owner.alive) {
      const o = t.owner, at = { x: t.x, y: t.y };
      if (!this.entities.some(x => x.alive && x !== t && x.x === at.x && x.y === at.y)) {
        this.place(o, at.x, at.y);
        this.log(`${o.name} prend la place de ${t.name}.`, o.team);
      }
      if (t.def.pmAMort) {
        if (o === this.actor) o.pm += t.def.pmAMort;
        else o.addEffect({ type: 'pm', value: t.def.pmAMort, turns: 1 }, false);
        this.log(`${o.name} gagne ${t.def.pmAMort} PM.`, o.team);
      }
    }
    this.hook('onKill', t, this.coupFatal || null);
    this.fireTriggers(t, 'death', { source });
    for (const s of this.summonsOf(t)) this.kill(s, `${s.name} disparaît avec ${t.name}.`);
  }


  spellOf(id, e) {
    const s = (e && e.extraSpells && e.extraSpells[id]) || DATA.spells[id];
    const rank = s && e && e.spellRanks ? e.spellRanks[id] || 1 : 1;
    if (rank <= 1) return s;
    const cache = e.rankedSpells || (e.rankedSpells = {});
    return cache[id] || (cache[id] = DATA.spellAtRank(s, rank));
  }

  spellState(e, spellId) {
    const s = this.spellOf(spellId, e);
    if (!s) return { ok: false, reason: 'Sort inconnu' };
    if (e.pa < this.coutPa(e, s)) return { ok: false, reason: 'Pas assez de PA' };
    if ((e.cooldowns[spellId] || 0) > 0) return { ok: false, reason: `Relance dans ${e.cooldowns[spellId]} tour(s)` };
    if (s.maxPerTurn && (e.casts[spellId] || 0) >= s.maxPerTurn) return { ok: false, reason: 'Déjà lancé le maximum de fois ce tour' };
    if (s.braiseCost && this.braiseOf(e) < s.braiseCost) return { ok: false, reason: `Il faut ${s.braiseCost} de Soif` };
    if (e.glyphThisTurn && s.effects.some(ef => ef.type === 'glyph')) return { ok: false, reason: 'Un seul glyphe par tour' };
    if (s.exigeDebout && e.hasState('assise')) return { ok: false, reason: 'Il faut être debout' };
    if (s.exigeTenu && !this.tenuPar(e)) return { ok: false, reason: 'Il faut tenir quelqu\'un (Empoigne)' };
    if (s.exigeLeurre && !this.leurreDe(e)) return { ok: false, reason: 'Il faut ton Leurre' };
    return { ok: true };
  }

  leurreDe(e) {
    return this.summonsOf(e).find(m => m.alive && m.def.leurre) || null;
  }

  async echangeLeurre(l, t) {
    if (t.def.fixed || t.unpushable || t.hasState('assise')) { this.log(`${t.name} ne bouge pas.`); return; }
    const pl = l.pos, pt = t.pos;
    this.place(l, pt.x, pt.y);
    this.place(t, pl.x, pl.y);
    this.log(`${t.name} prend la place du Leurre.`);
    await this.checkTraps(t);
  }

  async hantise(e, cell) {
    const dx = Math.sign(cell.x - e.x), dy = Math.sign(cell.y - e.y);
    if (dx && dy) return;
    const t = this.entityAt(e.x + dx, e.y + dy);
    if (!t || !t.alive) { this.log('Personne à hanter au contact.'); return; }
    const n = Grid.dist(t.pos, cell);
    if (n > 0) await this.displace(e, t, { type: 'push', cells: n });
  }

  traqueDe(e, t) {
    return (t && t.effects && t.effects.find(f => f.type === 'traque' && f.owner === e && f.turns > 0)) || null;
  }

  poserTraque(e, t) {
    for (const x of this.entities) x.effects = x.effects.filter(f => !(f.type === 'traque' && f.owner === e));
    t.addEffect({ type: 'traque', owner: e, crans: 0, turns: e.kit.traque.turns || 2 }, t === this.actor);
    this.log(`${e.name} prend ${t.name} en traque.`, e.team);
  }

  rebond(e, t, ef, s) {
    const dmg = s.effects.find(f => f.type === 'damage');
    if (!dmg) return;
    const u = this.entities.filter(x => x.alive && x !== t && x.team !== e.team && Grid.dist(x.pos, t.pos) <= (ef.cells || 2))
      .sort((a, b) => Grid.dist(a.pos, t.pos) - Grid.dist(b.pos, t.pos))[0];
    if (!u) return;
    const k = (ef.pct || 50) / 100;
    this.log(`La flèche rebondit sur ${u.name}.`, e.team);
    this.dealDamage(e, u, this.rollDamage(e, u, s.element, { min: dmg.min * k, max: dmg.max * k }, s), s.element, { label: 'rebond' });
  }

  tenuPar(e) {
    const t = e && e.tient;
    return t && t.alive && t.effects.some(f => f.type === 'state' && f.name === 'tenu' && f.by === e) ? t : null;
  }

  lacher(e) {
    const t = e && e.tient;
    if (t) t.effects = t.effects.filter(f => !(f.type === 'state' && f.name === 'tenu' && f.by === e));
    if (e) e.tient = null;
  }

  empoigner(e, t) {
    if (!t || t === e) return;
    this.lacher(e);
    t.addEffect({ type: 'state', name: 'tenu', by: e, turns: 1 }, t === this.actor);
    e.tient = t;
    this.log(`${e.name} empoigne ${t.name}.`, e.team);
    if (t.isSummon && t.owner === e && e === this.actor) { e.pa += 1; this.log(`${e.name} reprend 1 PA.`, e.team); }
  }


  affutDe(e, from) {
    const a = e && e.kit && e.kit.affut;
    if (!a || e !== this.actor) return { pct: 0, range: 0 };
    const pas = (e.pmDepenses || 0) + (from ? Grid.dist(e.pos, from) : 0);
    const pct = Math.max(0, a.power - (a.parPm == null ? a.power : a.parPm) * pas - (a.parSaut || 0) * (e.affutCrans || 0));
    return { pct, range: pas === 0 && pct > 0 ? (a.range || 0) : 0 };
  }

  isAffut(e, from) {
    return this.affutDe(e, from).pct > 0;
  }

  affutSaut(e, s) {
    if (s && s.keepsAffut) e.affutCrans = (e.affutCrans || 0) + 1;
    else { e.moved = true; e.affutCrans = 99; }
  }

  rangeOf(e, s, from) {
    if (s.target === 'self' || s.range[1] < 2) return s.range;
    if (s.porteeAssis && e.hasState('assise')) {
      const m = Math.max(s.range[0], Math.floor(s.range[1] * s.porteeAssis) + e.modifier('range') + (e.po || 0));
      return [s.range[0], Math.max(s.range[0], m)];
    }
    let bonus = e.modifier('range') + (e.po || 0);
    bonus += this.affutDe(e, from).range;
    if (s.porteeFixe) bonus = Math.min(0, bonus);
    return bonus ? [s.range[0], Math.max(s.range[0], s.range[1] + bonus)] : s.range;
  }

  oathOn(t, by) {
    return t.effects.find(f => f.type === 'state' && f.name === 'sworn' && (!by || f.by === by)) || null;
  }

  trackedBy(t, by) {
    return !!(t && t.effects.some(f => f.type === 'state' && f.name === 'tracked' && f.by === by));
  }

  braiseOf(e) { return e && e.kit && e.kit.braise ? e.braise || 0 : 0; }
  braisePower(e) { const k = e && e.kit && e.kit.braise; return k ? this.braiseOf(e) * (k.power || 0) : 0; }
  gainBraise(e, n) {
    const k = e.kit && e.kit.braise;
    if (!k || !(n > 0) || !e.alive) return;
    const before = e.braise || 0;
    e.braise = Math.min(k.max, before + n);
    if (e.braise > before) this.log(`${e.name} : Soif ${e.braise} / ${k.max}.`, e.team);
  }
  tickBraise(e) {
    const k = e.kit && e.kit.braise;
    if (!k) return;
    if ((e.braise || 0) >= k.surchauffe) { this.loseHp(e, Math.round(e.hpMax * k.brulure / 100), 'la Soif le dévore'); if (!e.alive) return; }
    this.gainBraise(e, k.perTurn);
  }

  isArmed(e) {
    const a = e && e.kit && e.kit.armed;
    return !!a && !this.summonsOf(e).some(s => s.def.id === a.summon);
  }

  gainReserve(e, n) {
    const k = e.kit && e.kit.reserve;
    if (!k || !e.alive || !(n > 0)) return;
    const avant = e.reserve || 0;
    e.reserve = Math.min(k.max, avant + n);
    if (e.reserve > avant) this.log(`${e.name} : ${k.nom} ${e.reserve} / ${k.max}.`, e.team);
  }
  bonusReserve(source, s) {
    if (!s || !s.reserveSpend || !source) return 0;
    const r = this.castCtx && this.castCtx.caster === source ? this.castCtx.reserve : (source.reserve || 0);
    return s.reserveSpend * r / 100;
  }

  gainFury(e, n) {
    const max = e.kit && e.kit.fury ? e.kit.fury.max : 0;
    if (!max || !(n > 0) || !e.alive) return;
    const before = e.fury;
    e.fury = Math.min(max, e.fury + n);
    if (e.fury > before) this.log(`${e.name} : Fureur ${e.fury} / ${max}.`, e.team);
  }

  swear(source, t, ef) {
    for (const o of this.entities) o.effects = o.effects.filter(f => !(f.type === 'state' && f.name === 'sworn' && f.by === source));
    t.addEffect({ type: 'state', name: 'sworn', by: source, turns: ef.turns, power: ef.power || 0, burn: ef.burn || 0, kept: ef.kept || null }, t === this.actor);
    this.log(`${source.name} jure la perte de ${t.name} (${ef.turns} tour(s)).`, source.team);
  }

  keepOath(e, t, oath) {
    const k = oath.kept || {};
    this.log(`Parole tenue : ${e.name} a eu ${t.name}.`, e.team);
    if (k.pa && e === this.actor) { e.pa += k.pa; this.log(`${e.name} gagne ${k.pa} PA.`); }
    if (k.healPct) {
      const h = e.heal(Math.round(e.hpMax * k.healPct / 100));
      this.noter(e, 'soins', h);
      if (h > 0) { this.emit('float', { x: e.x, y: e.y, text: '+' + h, color: '#6fdc8c' }); this.log(`${e.name} récupère ${h} PV.`); }
    }
    if (k.fury) this.gainFury(e, k.fury);
  }

  track(source, t, ef) {
    if (t.hasState('invisible')) { t.removeState('invisible'); this.log(`${t.name} est révélé.`); }
    t.effects = t.effects.filter(f => !(f.type === 'state' && f.name === 'tracked' && f.by === source));
    t.addEffect({ type: 'state', name: 'tracked', by: source, turns: ef.turns }, t === this.actor);
    this.log(`${t.name} est traqué pendant ${ef.turns} tour(s) : il ne peut plus se cacher.`);
  }

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

  taunterOf(e, from) {
    from = from || e.pos;
    return this.entities.find(o => o.alive && o.team !== e.team && o.def.taunt && Grid.dist(o.pos, from) <= o.def.taunt) || null;
  }

  effectApplies(e, t, ef) {
    if (ef.ifSworn && !this.oathOn(t, e)) return false;
    if (ef.siAssis && !(e && e.hasState('assise'))) return false;
    if (ef.siDebout && e && e.hasState('assise')) return false;
    if (ef.onAlly && t.team !== e.team) return false;
    if (ef.onFoe && t.team === e.team) return false;
    return true;
  }

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
      if (s.los && !this.hasLos(e, from, cell, s.aoe.shape === 'pierce') && !(s.markSight && this.trackedBy(occ, e))) return { ok: false, reason: 'Pas de ligne de vue' };
      const seen = occ && this.canSee(e, occ) ? occ : null;
      const telefrag = s.telefrag && seen && seen !== e;
      if (s.target === 'free' && !telefrag && (occ || !this.isWalkable(cell.x, cell.y, e))) return { ok: false, reason: 'Il faut une case libre' };
      if (s.target === 'entity' && !seen) return { ok: false, reason: 'Aucune cible sur cette case' };
      if (s.target === 'enemy' && (!seen || seen.team === e.team)) return { ok: false, reason: 'Vise un ennemi' };
      if (s.target === 'ally' && (!seen || seen.team !== e.team)) return { ok: false, reason: 'Vise un allié' };
      if (s.target === 'summon' && (!seen || seen.team !== e.team || !seen.isSummon)) return { ok: false, reason: 'Vise une invocation alliée' };
      if (s.exigeRelique && !(seen && seen.isSummon && seen.owner === e && seen.def.relique)) return { ok: false, reason: 'Vise une de ses reliques' };
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
    const ctx = this.castCtx = { caster: e, spell: s, fury: e.fury, braise: e.braise || 0, reserve: e.reserve || 0, hitFoe: false, kills: [] };
    try {
      e.pa -= this.coutPa(e, s);
      e.casts[spellId] = (e.casts[spellId] || 0) + 1;
      if (s.cooldown) e.cooldowns[spellId] = s.cooldown;
      if (s.furySpend && e.fury > 0) { this.log(`${e.name} dépense ${e.fury} de Fureur.`, e.team); e.fury = 0; }
      if (s.braiseCost) { e.braise = Math.max(0, (e.braise || 0) - s.braiseCost); this.log(`${e.name} étanche ${s.braiseCost} de Soif.`, e.team); }
      if (s.braiseSpend && (e.braise || 0) > 0) { this.log(`${e.name} lâche ${e.braise} de Soif.`, e.team); e.braise = 0; }
      if (s.reserveSpend && (e.reserve || 0) > 0 && e.kit && e.kit.reserve) { this.log(`${e.name} dépense ${e.reserve} de ${e.kit.reserve.nom}.`, e.team); e.reserve = 0; }
      const center = s.target === 'self' ? e.pos : { x: cell.x, y: cell.y };
      const cells = this.zoneCells(e, s, center, e.pos);
      this.log(`${e.name} lance ${s.name}.`, e.team);
      if (e === this.player) this.hook('onCast', e, s, spellId);
      this.emit('update');
      await this.emitAsync('animCast', { entity: e, spell: s, cells });
      if (s.bascule && e.hasState(s.bascule)) {
        e.removeState(s.bascule);
        if (s.basculeRend) e.pa += s.basculeRend;
        this.log(`${e.name} se relève${s.basculeRend ? ` et reprend ${s.basculeRend} PA` : ''}.`, e.team);
        this.emit('update');
        return { ok: true };
      }
      if (s.effects.some(ef => ef.type === 'jeter')) {
        const t = this.tenuPar(e);
        this.lacher(e);
        if (t && !this.entityAt(cell.x, cell.y)) {
          await this.emitAsync('animMove', { entity: t, to: { x: cell.x, y: cell.y }, fast: true });
          this.place(t, cell.x, cell.y);
          this.log(`${e.name} jette ${t.name}.`, e.team);
          await this.checkTraps(t);
        }
      }

      let targets = cells.map(c => this.entityAt(c.x, c.y)).filter(t => t && t.alive && (t !== e || s.affectsCaster));
      if (s.affects === 'allies') targets = targets.filter(t => t.team === e.team);
      if (s.affects === 'enemies') targets = targets.filter(t => t.team !== e.team);
      ctx.foes = targets.filter(t => t.team !== e.team).length;
      const moves = [];
      for (const t of targets) {
        const tag = s.faveur && t.team === e.team ? 'faveur' : s.ombre && t.team !== e.team ? 'ombre' : null;
        if (tag) t.effects = t.effects.filter(f => f.tag !== tag);
        const rayonnantAvant = t.hasState('rayonnant');
        const n0 = t.effects.length;
        for (const ef of s.effects) {
          if (!t.alive) break;
          if (!this.effectApplies(e, t, ef)) continue;
          if (ef.type === 'glyph' || ef.type === 'jeter') continue;
          if (ef.type === 'push' || ef.type === 'pull') moves.push({ t, ef });
          else if (ef.type === 'depuisCentre' || ef.type === 'versCentre') { if (t.x !== center.x || t.y !== center.y) moves.push({ t, ef: { type: ef.type === 'depuisCentre' ? 'push' : 'pull', cells: ef.cells }, origin: center }); }
          else if (ef.type === 'empoigner') this.empoigner(e, t);
          else if (ef.type === 'rebond') this.rebond(e, t, ef, s);
          else if (ef.type === 'versLeurre' || ef.type === 'depuisLeurre') { const l = this.leurreDe(e); if (l) moves.push({ t, ef: { type: ef.type === 'depuisLeurre' ? 'push' : 'pull', cells: ef.cells }, origin: l.pos }); }
          else if (ef.type === 'echangeLeurre') { const l = this.leurreDe(e); if (l && l !== t) await this.echangeLeurre(l, t); }
          else await this.applyEffect(e, t, ef, s);
        }
        if (tag) for (const f of t.effects.slice(n0)) f.tag = tag;
        if (tag === 'faveur' && rayonnantAvant && t.hasState('rayonnant')) {
          for (const f of t.effects.slice(n0)) if (isFinite(f.turns)) f.turns += 1;
          t.removeState('rayonnant');
          this.log(`${t.name} rayonnait : la Faveur dure un tour de plus.`, e.team);
        }
        if (e.veille === 'aube' && t.alive && t.team === e.team && !t.hasState('unhealable')
          && s.effects.some(ef => (ef.type === 'heal' || ef.type === 'healPct') && this.effectApplies(e, t, ef))) this.rayonner(e, t);
      }
      if (s.faveur && !targets.some(t => t.team === e.team) && !this.entityAt(cell.x, cell.y) && this.isWalkable(cell.x, cell.y, null)) {
        this.placeGlyph(e, [cell], { name: 'Étincelle', turns: 2, affects: 'allies', unique: true, effects: s.effects.filter(f => f.type !== 'glyph') }, s, true);
      }
      for (const { t, ef, origin } of moves) if (t.alive) await this.displace(e, t, ef, origin);
      for (const ef of s.effects) {
        if (ef.type === 'teleport') {
          const occ = s.telefrag ? this.entityAt(cell.x, cell.y) : null;
          if (occ && occ !== e) await this.telefrag(e, occ, s);
          else await this.teleport(e, cell, s);
        }
        else if (ef.type === 'leap') await this.leap(e, cell, ef, s);
        else if (ef.type === 'hantise') await this.hantise(e, cell);
        else if (ef.type === 'declencherMares') this.declencherMares(e);
        else if (ef.type === 'ordreMeute') this.ordreMeute(e, ef);
        else if (ef.type === 'pacte') this.pacte(e, ef);
        else if (ef.type === 'horde') { e.horde = { tours: ef.turns || 2, jauge: ef.jauge || 3, rabais: ef.rabais || 1 }; this.log(`${e.name} appelle la horde : +${e.horde.jauge} de jauge, ses appels coûtent ${e.horde.rabais} PA de moins.`, e.team); }
        else if (ef.type === 'retreat') await this.retreat(e, ef, s);
        else if (ef.type === 'charge') { await this.charge(e, cell, ef, s); e.moved = true; }
        else if (ef.type === 'obstacle') this.placeObstacles(e, cells, ef);
        else if (ef.type === 'trap') this.placeTrap(e, cell, ef, s);
        else if (ef.type === 'glyph') this.placeGlyph(e, cells, ef, s);
        else if (ef.type === 'summon') {
          for (let i = 0; i < (ef.count || 1); i++) {
            const m = this.spawn(ef.monster, e.team, cell, e, e, true);
            if (m && ef.hpPctOfOwner) { m.hpMax = m.hp = Math.max(1, Math.round(e.hpMax * ef.hpPctOfOwner / 100)); }
          }
        }
      }
      for (const ef of s.selfEffects || []) if (this.effectApplies(e, e, ef)) this.applySelfEffect(e, ef, s);
      if (this.estOriel(e) && ASTRES[s.element] && s.effects.some(ef => ['damage', 'heal', 'soinDiffere', 'glyph'].includes(ef.type)) && e.astre !== s.element) {
        e.astre = s.element;
        for (const m of this.summonsOf(e)) this.astreLanterne(m);
      }
      if (s.recharge) (e.dejaLance = e.dejaLance || {})[s.id] = true;
      if (s.cumul) {
        let f = e.effects.find(x => x.type === 'cumulSort' && x.spell === s.id);
        if (!f) { f = { type: 'cumulSort', spell: s.id, crans: 0, turns: s.cumul.tours || 2 }; e.addEffect(f, true); f = e.effects[e.effects.length - 1]; }
        f.crans = Math.min(s.cumul.max || 2, f.crans + 1); f.turns = s.cumul.tours || 2;
        this.log(`${s.name} : +${f.crans * s.cumul.par} % au prochain lancer.`, e.team);
      }
      if (e.kit && e.kit.traque) {
        const marquee = s.traque ? targets.find(t => t.alive && t.team !== e.team) : null;
        if (marquee) this.poserTraque(e, marquee);
        else if (ctx.touches) for (const t of ctx.touches) {
          const tq = this.traqueDe(e, t);
          if (tq && tq.crans < (e.kit.traque.max || 3)) { tq.crans++; this.log(`${t.name} : Traque ${tq.crans} / ${e.kit.traque.max || 3}.`, e.team); }
        }
      }
      if (s.parPiege && e.piegesPli) { this.log(`${e.name} dépense son Pli (${e.piegesPli}).`, e.team); e.piegesPli = 0; }
      if (s.fury && ctx.hitFoe) this.gainFury(e, s.fury);
      if (s.braise && ctx.hitFoe) this.gainBraise(e, s.braise);
      if (s.reserve && ctx.hitFoe) this.gainReserve(e, s.reserve);
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
        let ls = s.lifesteal || (s.lifestealIfState && source.hasState(s.lifestealIfState.state) ? s.lifestealIfState.pct : 0);
        if (ls && this.sangChaud(source).palier >= 3) ls += 10;
        const crepuscule = source && source.veille === 'crepuscule' ? 15 : 0;
        const volDiffere = s.volDiffere ? s.volDiffere + crepuscule : 0;
        if (!volDiffere) ls += crepuscule;
        this.dealDamage(source, t, this.rollDamage(source, t, s.element, ef, s), s.element, { lifesteal: ls, volDiffere, pierce: !!(s.oathPierce && this.oathOn(t, source)) });
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
      case 'declencherMares':
      case 'demontage':
        await this.demonter(source, t);
        break;
      case 'ordreMeute':
      case 'pacte':
      case 'horde':
      case 'retreat':
        break;
      case 'soinDiffere': {
        t.addEffect({ type: 'soinDiffere', min: ef.min, max: ef.max, mult: ef.mult, owner: source, spell: s, turns: 1 }, t === this.actor);
        this.log(`${t.name} recevra un soin au début de son tour.`);
        break;
      }
      case 'ecourter':
        this.ecourter(source, t, ef);
        break;
      case 'basculeCiel':
        t.veille = t.veille === 'crepuscule' ? 'aube' : 'crepuscule';
        this.emit('float', { x: t.x, y: t.y, text: t.veille === 'aube' ? 'Aube' : 'Crépuscule', color: t.veille === 'aube' ? '#ffd166' : '#a99cf0' });
        this.log(t.veille === 'aube' ? `${t.name} passe à l'Aube : ses soins font 10 % de plus.` : `${t.name} passe au Crépuscule : ses attaques volent la vie.`, t.team);
        break;
      case 'healPct': {
        const h = t.heal(Math.round(t.hpMax * ef.pct / 100));
        this.noter(source || t, 'soins', h);
        this.emit('float', { x: t.x, y: t.y, text: '+' + h, color: '#6fdc8c' });
        this.log(`${t.name} récupère ${h} PV.`);
        if (h > 0 && t === this.player) this.hook('onHeal', t, h);
        break;
      }
      case 'heal': {
        const fac = !source ? 1 : source.soinsPct != null ? 1 + Math.max(0, source.soinsPct) / 100 : (source.scale || 1) * source.statFactor('feu');
        const chance = source ? DATA.chanceCrit(source, s) : 0;
        const critSoin = chance > 0 && this.rng() * 100 < chance;
        const aube = source && source.veille === 'aube' ? 1.1 : 1;
        const brut = (this.rand(ef.min, ef.max) * (ef.mult || 1) * (critSoin ? DATA.critJetDe(s) : 1) * fac + (source ? source.soinsFixes || 0 : 0)) * aube;
        const h = t.heal(Math.round(brut * (1 + ((t.soinsRecus || 0) + (t.hasState('rayonnant') ? RAYONNANT : 0)) / 100)));
        this.noter(source || t, 'soins', h);
        this.emit('float', { x: t.x, y: t.y, text: '+' + h, color: '#6fdc8c' });
        this.log(`${t.name} récupère ${h} PV${critSoin ? ' (soin critique)' : ''}.`);
        if (h > 0 && t === this.player) this.hook('onHeal', t, h);
        if (source && source.team === t.team) this.declencherFilon(source, t, 'soin');
        if (h > 0 && source && source !== t && source.alive && source.team === t.team && source.aPassif('feu_gk')) {
          const r = source.heal(Math.round(h * 0.1));
          this.noter(source, 'soins', r);
          if (r) this.log(`${source.name} récupère ${r} PV (Foyer Vivant).`);
        }
        break;
      }
      case 'swap':
        if (t !== source) await this.swap(source, t);
        break;
      case 'charge':
        break;
      case 'sacrifice':
        this.sacrifice(source, t, ef, s);
        break;
      case 'devourShield': {
        const v = t.stripShields();
        if (v > 0) {
          const h = source.heal(v);
          this.noter(source, 'soins', h);
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

  applyStatus(source, t, ef) {
    const own = t === this.actor;
    const turns = ef.duration != null ? ef.duration : ef.turns;
    switch (ef.type) {
      case 'armor':
        t.addEffect({ type: 'armor', value: ef.value, turns }, own);
        this.log(`${t.name} : −${ef.value} % de dégâts subis pendant ${turns} tour(s).`);
        break;
      case 'pa':
      case 'pm': {
        if (ef.selfNow && source === t && own) {
          t[ef.type] += ef.selfNow;
          this.log(`${t.name} gagne ${ef.selfNow} ${ef.type.toUpperCase()}.`);
          break;
        }
        let value = ef.value;
        let rooted = ef.type === 'pm' && value <= -10;
        if (value < 0 && source && source.team !== t.team) {
          const left = t === this.actor ? t[ef.type] : Math.max(0, (ef.type === 'pa' ? t.paMax : t.pmMax) + t.modifier(ef.type));
          const landed = this.removalLanded(source, t, ef.type, -value);
          if (!landed) break;
          if (rooted) rooted = landed >= left;
          value = rooted ? ef.value : -landed;
        }
        let renfort = false;
        if (ef.type === 'pa' && value > 0 && source && source !== t && source.team === t.team) {
          const deja = t.effects.find(f => f.type === 'pa' && f.renfort);
          if (deja && deja.value >= value) { this.log(`${t.name} a déjà un gain de PA venu d'un allié.`); break; }
          if (deja) t.effects = t.effects.filter(f => f !== deja);
          renfort = true;
        }
        t.addEffect(Object.assign({ type: ef.type, value, turns }, renfort ? { renfort: true } : {}), own);
        if (rooted) this.log(`${t.name} est enraciné pour ${turns} tour(s).`);
        else this.log(`${t.name} : ${value > 0 ? '+' : ''}${value} ${ef.type.toUpperCase()} pendant ${turns} tour(s).`);
        if (ef.type === 'pm' && value < 0) this.echoPmLoss(t);
        break;
      }
      case 'filon': {
        for (const o of this.entities) o.effects = o.effects.filter(f => !(f.type === 'filon' && f.owner === source));
        t.addEffect({ type: 'filon', owner: source, charges: ef.charges || 3, turns, min: ef.min, max: ef.max }, own);
        this.log(`${t.name} porte le Filon de ${source.name} : ${ef.charges || 3} déclenchement(s), ${turns} tour(s).`, source.team);
        break;
      }
      case 'echo':
        t.effects = t.effects.filter(f => !(f.type === 'echo' && f.owner === source));
        t.addEffect({ type: 'echo', turns, min: ef.min, max: ef.max, mult: ef.mult, element: ef.element, uses: ef.uses, owner: source }, own);
        this.log(`${t.name} porte un écho pendant ${turns} tour(s) : chaque PM perdu le fera résonner.`);
        break;
      case 'shield': {
        const pvK = source && source.kit && !source.isSummon && DATA.rules.bouclierPvRef ? Math.max(1, (source.hpMax || 0) / DATA.rules.bouclierPvRef) : 1;
        const v = Math.round(ef.value * pvK * (source ? source.scale || 1 : 1) * (1 + (source ? source.boucliers || 0 : 0) / 100) * (1 + this.bonusReserve(source, this.castCtx && this.castCtx.caster === source ? this.castCtx.spell : null)));
        t.addEffect({ type: 'shield', value: v, turns }, own);
        this.noter(source || t, 'boucliers', v);
        this.noter(t, 'bouclRecus', v);
        this.log(`${t.name} gagne un bouclier de ${v} points.`);
        break;
      }
      case 'power': {
        const renfort = ef.value > 0 && source && source !== t && source.team === t.team;
        if (renfort) {
          const deja = t.effects.find(f => f.type === 'power' && f.renfort);
          if (deja && deja.value >= ef.value) { this.log(`${t.name} a déjà un renfort de dégâts venu d'un allié.`); break; }
          if (deja) t.effects = t.effects.filter(f => f !== deja);
        }
        t.addEffect(Object.assign({ type: 'power', value: ef.value, turns }, renfort ? { renfort: true } : {}), own);
        this.log(`${t.name} : ${ef.value < 0 ? '−' + -ef.value : '+' + ef.value} % de dégâts.`);
        break;
      }
      case 'vuln':
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
        if (ef.name === 'invisible' && t.hasState('tracked')) { this.log(`${t.name} est traqué et ne peut pas se cacher.`); break; }
        if (ef.name === 'unhealable' && t.hasState('rayonnant') && turns > 1) {
          t.removeState('rayonnant');
          this.log(`${t.name} rayonnait : insoignable un tour de moins.`);
          t.addEffect({ type: 'state', name: ef.name, turns: turns - 1, by: source }, own);
          this.log(`${t.name} ne peut plus être soigné pendant ${turns - 1} tour(s).`);
          break;
        }
        t.addEffect({ type: 'state', name: ef.name, turns, by: source, lingering: !!ef.lingering }, own);
        if (ef.name === 'invisible') t.hiddenAt = { x: t.x, y: t.y };
        { const etats = { digue: 'est sous la Carapace Close', brise_lames: 'est derrière le Bouclier à Rouage', forme_iskar: 'prend la Forme Nocturne', protege: `est protégé par ${source.name}`, gibier: `est le gibier de ${source.name}`, victime: `est la victime choisie de ${source.name}`, intaclable: 'devient intaclable', assise: 's\'assoit comme la montagne', tenu: 'est tenu' };
          this.log(ef.name === 'invisible' ? `${t.name} devient invisible.` : ef.name === 'unhealable' ? `${t.name} ne peut plus être soigné pendant ${turns} tour(s).` : ef.name === 'ivre' ? `${t.name} est ivre pendant ${turns} tour(s).` : etats[ef.name] ? `${t.name} ${etats[ef.name]} (${turns} tour(s)).` : `${t.name} est provoqué par ${source.name}.`); }
        break;
      case 'range':
        t.addEffect({ type: 'range', value: ef.value, turns }, own);
        this.log(`${t.name} : ${ef.value > 0 ? '+' : '−'}${Math.abs(ef.value)} de portée pendant ${turns} tour(s).`);
        if (ef.value < 0 && source && source.team !== t.team) this.declencherFilon(source, t, 'portee');
        break;
      case 'guard':
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
    else if (ef.type === 'braiseNow') this.gainBraise(e, ef.value);
    else if (ef.type === 'rewind') { e.rewind = true; this.log(`${e.name} reviendra à la fin de son tour où il l'a commencé.`); }
    else if (ef.type === 'pmNow') {
      if (ef.value < 0) { const lost = Math.min(e.pm, -ef.value); e.pm -= lost; this.log(`${e.name} perd ${lost} PM.`); }
      else { e.pm += ef.value; this.log(`${e.name} gagne ${ef.value} PM.`); }
    }
    else this.applyStatus(e, e, ef);
  }

  echoPmLoss(t) {
    for (const f of t.effects.filter(f => f.type === 'echo' && f.uses > 0)) {
      if (!t.alive) break;
      if (!f.owner || !f.owner.alive) continue;
      f.uses--;
      this.dealDamage(f.owner, t, this.rollDamage(f.owner, t, f.element, f, null), f.element, { label: 'écho' });
    }
  }

  dotValue(source, ef) {
    if (!source) return ef.value;
    return Math.max(1, Math.round(ef.value * (source.scale || 1) * source.statFactor(ef.element) * this.bonusFormat(source)));
  }

  tackle(e) {
    if (e.hasState('intaclable')) return;
    { const f = e.effects.find(x => x.type === 'state' && x.name === 'victime');
      const k = f && f.by;
      if (k && k.alive && !k.hasState('stunned') && Grid.dist(k.pos, e.pos) <= 1 && e.pm > 0) {
        this.log(`${e.name} ne peut pas fuir ${k.name} : −${e.pm} PM.`, e.team);
        this.emit('float', { x: e.x, y: e.y, text: 'retenu', color: '#ffd166' });
        e.pm = 0;
        return;
      } }
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
    if (e === this.player) this.hook('onLose', e, 'tacle');
    this.log(`${e.name} est taclé : ${lpa ? '−' + lpa + ' PA' : ''}${lpa && lpm ? ', ' : ''}${lpm ? '−' + lpm + ' PM' : ''}.`, e.team);
  }

  removalDodgeChance(caster, t, kind, current) {
    if (this.castCtx && this.castCtx.spell && this.castCtx.spell.inesquivable) return 0;
    const max = kind === 'pa' ? t.paMax : t.pmMax;
    if (!(max > 0)) return 1;
    if (current == null) current = t === this.actor ? t[kind] : Math.max(0, max + t.modifier(kind));
    const r = DATA.rules;
    const retrait = Math.max(1, caster ? caster.retrait(kind) : 0), esquive = Math.max(1, t.esquive(kind));
    const rapport = Math.min(r.retraitRapportMax || Infinity, retrait / esquive);
    const passe = r.retraitBase / 100 * rapport * Math.max(0, current) / max;
    return 1 - Math.max(r.retraitMin / 100, Math.min(r.retraitMax / 100, passe));
  }

  removalLanded(caster, t, kind, n) {
    const landed = this.tirerRetrait(caster, t, kind, n);
    if (landed > 0 && caster && caster.team !== t.team) {
      if (t === this.player) this.hook('onLose', t, kind);
      if (caster.team === 'player') this.hook('onRetrait', t, kind);
    }
    return landed;
  }

  tirerRetrait(caster, t, kind, n) {
    const max = kind === 'pa' ? t.paMax : t.pmMax;
    let current = t === this.actor ? t[kind] : Math.max(0, max + t.modifier(kind));
    let landed = 0, dodged = 0;
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
    const kr = caster && caster.kit && caster.kit.reserve;
    if (landed > 0 && t.team !== caster.team && kr && kr.gain === 'retrait' && (!kr.seul || kr.seul === kind)) this.gainReserve(caster, landed * (kr.par || 1));
    if (landed > 0 && caster && t.team !== caster.team) this.declencherFilon(caster, t, kind);
    if (landed > 0 && caster && caster.alive && t.team !== caster.team && caster.aPassif('eau_gk')) {
      const h = caster.heal(Math.round(caster.hpMax * 0.02 * landed));
      this.noter(caster, 'soins', h);
      if (h) this.log(`${caster.name} reprend ${h} PV (Marée Haute).`);
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


  resistOf(t, element) {
    if (!element) return 0;
    if (t.immuneElement === element) return 100;
    return t.resist[element] || 0;
  }

  scaleByResist(t, element, base) {
    return Math.max(0, Math.round(base * (1 - this.resistOf(t, element) / 100)));
  }

  filonDe(source, t) {
    if (!source || !t || !t.effects) return null;
    const m = (source.isSummon && source.owner) || source;
    return t.effects.find(f => f.type === 'filon' && f.owner === m && f.charges > 0)
      || t.effects.find(f => f.type === 'filon' && f.charges > 0 && f.owner && f.owner.team === m.team) || null;
  }

  declencherFilon(source, t, raison) {
    const f = this.filonDe(source, t);
    if (!f || !t.alive || !f.owner.alive) return false;
    const ctx = this.castCtx;
    if (ctx) { ctx.filons = ctx.filons || new Set(); if (ctx.filons.has(t)) return false; ctx.filons.add(t); }
    const m = f.owner;
    f.charges--;
    const sp = ctx && ctx.spell;
    const el = raison === 'soin' ? 'feu' : (sp && sp.element && sp.element !== 'neutre' ? sp.element : 'terre');
    const cibles = raison === 'soin' ? this.entities.filter(e => e.alive && e.team !== t.team && Grid.dist(e.pos, t.pos) <= 2) : [t];
    this.emit('float', { x: t.x, y: t.y, text: 'Filon', color: '#e3b54a' });
    this.log(`Le Filon se déclenche sur ${t.name} (${f.charges} restant${f.charges > 1 ? 's' : ''}).`, m.team);
    for (const c of cibles) if (c.alive) this.dealDamage(m, c, this.rollDamage(m, c, el, { min: f.min, max: f.max }, null), el, { label: 'filon' });
    this.gainReserve(m, 1);
    if (f.charges <= 0) t.effects = t.effects.filter(x => x !== f);
    return true;
  }

  bonusFormat(source) {
    if (!source || source.team !== 'player') return 1;
    const m = source.owner || source.caller;
    return DATA.bonusFormat((m && m.level) || source.level || 1);
  }

  rollDamage(source, t, element, ef, s) {
    let mult = 1 + (source ? source.modifier('power') / 100 : 0) + t.modifier('vuln') / 100;
    const oath = source ? this.oathOn(t, source) : null;
    if (oath) mult += (oath.power || 0) / 100;
    const af = source ? this.affutDe(source) : null;
    if (af && af.pct > 0) mult += (s && s.affutBonus ? s.affutBonus * af.pct / source.kit.affut.power : af.pct) / 100;
    const tq = source && source.kit && source.kit.traque && this.traqueDe(source, t);
    if (tq) mult += tq.crans * (source.kit.traque.par || 8) / 100;
    if (source) mult += this.braisePower(source) / 100;
    if (source && source.kit && source.kit.fury && source.kit.fury.power) mult += (source.fury || 0) * source.kit.fury.power / 100;
    if (source && s && s.recharge && source.dejaLance && source.dejaLance[s.id]) mult += s.recharge / 100;
    if (source && s && s.cumul) { const f = source.effects.find(x => x.type === 'cumulSort' && x.spell === s.id); if (f) mult += f.crans * s.cumul.par / 100; }
    if (source) mult += this.sangChaud(source).pct / 100;
    if (source && source.hasState('tenu')) mult *= 0.5;
    if (s && source) {
      if (s.lowHpBonus && source.hpPct() < s.lowHpBonus.below) mult *= s.lowHpBonus.mult;
      if (s.executeBelow && t.hpPct() < s.executeBelow) mult *= 2;
      if (s.bonusIfInvisible && source.hasState('invisible')) mult *= s.bonusIfInvisible;
      const cc = this.castCtx;
      if (s.perExtraTarget && cc && cc.spell === s && cc.foes > 1) mult += s.perExtraTarget * (cc.foes - 1) / 100;
      if (s.furySpend) {
        const fury = this.castCtx && this.castCtx.caster === source ? this.castCtx.fury : source.fury;
        mult *= 1 + s.furySpend * fury / 100;
      }
      mult *= 1 + this.bonusReserve(source, s);
      if (s.parPiege) mult *= 1 + s.parPiege * Math.min(5, source.piegesPli || 0) / 100;
      if (s.assisBonus && source.hasState('assise')) mult *= 1 + s.assisBonus / 100;
      if (s && s.parPmDepense) mult *= 1 + s.parPmDepense * (source.pmDepenses || 0) / 100;
      if (s && s.parPmRestant) mult *= 1 + s.parPmRestant * Math.max(0, source.pm || 0) / 100;
      if (s.braiseSpend) {
        const braise = this.castCtx && this.castCtx.caster === source ? this.castCtx.braise : (source.braise || 0);
        mult *= 1 + s.braiseSpend * braise / 100;
      }
    }
    let base = this.rand(ef.min, ef.max) * (ef.mult || 1);
    this.lastCrit = false;
    if (source) {
      let jet = base * source.statFactor(element) * (source.scale || 1) * this.bonusFormat(source);
      const chance = DATA.chanceCrit(source, s);
      if (chance > 0 && this.rng() * 100 < chance) { jet *= DATA.critJetDe(s); this.lastCrit = true; }
      base = jet + (source.dmgFlat || 0) + ((source.dmgFixe || {})[element] || 0) + (this.lastCrit ? source.dmgCrit || 0 : 0);
      if (s && s.aoe && s.aoe.shape !== 'single' && source.aPassif('terre_dk')) mult += 0.1;
    }
    const pierce = !!(s && s.oathPierce && oath);
    if (source && !t.hasState('stunned') && !pierce) mult *= 1 - Math.min(90, Math.max(0, t.modifier('armor'))) / 100;
    if (source && t.hasState('assise') && t.kit && t.kit.id === 'thalor' && !pierce) mult *= 0.85;
    if (source && !pierce && Grid.dist(source.pos, t.pos) <= 1 && t.modifier('guard') > 0) mult *= 1 - Math.min(90, t.modifier('guard')) / 100;
    { const sc = source && !pierce ? this.sangChaud(t).pct : 0; if (sc) mult *= 1 - sc / 100; }
    { const pm = source && !pierce ? this.sousMaree(t) : 0; if (pm) mult *= 1 - pm / 100; }
    if (this.isArmed(t)) mult *= 1 - t.kit.armed.reduction / 100;
    if (source && t.resteFixe && t.aPassif('terre_gk')) mult *= 0.9;
    const avantRes = base * Math.max(0, mult) - (source && t.reduc ? t.reduc : 0) - (source && this.lastCrit && t.resCrit ? t.resCrit : 0);
    const out = this.scaleByResist(t, element, Math.max(0, avantRes));
    if (source && this.lastCrit) {
      if (element === 'feu' && out > 0 && source.aPassif('feu_dk')) t.addEffect({ type: 'dot', element: 'feu', value: Math.max(1, Math.round(out * 0.05)), turns: 2 }, false);
      if (source === this.actor && !source.aubaineTour && source.aPassif('eau_dk')) { source.aubaineTour = true; source.pm += 1; this.log(`${source.name} saisit l'aubaine : +1 PM.`); }
    }
    return out;
  }

  dealDamage(source, t, amount, element, opts) {
    opts = opts || {};
    if (amount > 0 && source && !opts.trap && !opts.redirige) {
      const k = source.team !== t.team ? this.protecteurDe(t) : null;
      if (k && k !== source) { this.log(`${k.name} prend le coup à la place de ${t.name}.`, k.team); return this.dealDamage(source, k, amount, element, Object.assign({}, opts, { redirige: true })); }
    }
    const dist = source ? Grid.dist(source.pos, t.pos) : 99;
    const elName0 = element ? DATA.elements[element].label.toLowerCase() : '';
    if (amount > 0 && (t.def.invulnerable || t.hasState('invulnerable'))) {
      this.emit('float', { x: t.x, y: t.y, text: '0', color: '#9fd7ff' });
      this.log(`${t.name} est invulnérable.`);
      this.fireTriggers(t, 'hit', { source, element, dist, dealt: 0, blocked: true });
      return { dealt: 0, absorbed: 0 };
    }
    if (amount > 0 && source && source !== t && !opts.trap) {
      const digue = t.effects.find(f => f.type === 'state' && (f.name === 'digue' || f.name === 'brise_lames'));
      if (digue) {
        const auContact = dist <= 1, protege = digue.name === 'digue' ? auContact : !auContact;
        if (protege) {
          this.emit('float', { x: t.x, y: t.y, text: '0', color: '#9fd7ff' });
          this.log(`${t.name} est invulnérable ${auContact ? 'au contact' : 'à distance'}.`);
          this.fireTriggers(t, 'hit', { source, element, dist, dealt: 0, blocked: true });
          return { dealt: 0, absorbed: 0 };
        }
        if (!digue.riposte) {
          digue.riposte = true;
          if (digue.name === 'digue') {
            if (t === this.actor) t.pm += 1; else t.addEffect({ type: 'pm', value: 1, turns: 1 }, false);
            this.log(`${t.name} riposte : +1 PM.`);
          } else {
            t.addEffect({ type: 'power', value: 15, turns: 1 }, t === this.actor);
            this.log(`${t.name} riposte : +15 % de dégâts.`);
          }
        }
      }
    }
    if (amount > 0 && source && dist > 1 && !opts.pierce && t.effects.some(f => f.type === 'state' && f.farDodge)) {
      this.emit('float', { x: t.x, y: t.y, text: 'esquive', color: '#ffffff' });
      this.log(`${t.name} esquive : à distance, on ne le touche pas.`);
      this.fireTriggers(t, 'hit', { source, element, dist, dealt: 0, dodged: true });
      return { dealt: 0, absorbed: 0 };
    }
    if (amount > 0 && element && t.absorbElement === element) {
      const h = t.heal(amount);
      this.noter(t, 'soins', h);
      this.emit('float', { x: t.x, y: t.y, text: '+' + h, color: '#6fdc8c' });
      this.log(`${t.name} absorbe le coup (${elName0}) et récupère ${h} PV.`);
      this.fireTriggers(t, 'hit', { source, element, dist, dealt: 0, absorbed: true });
      return { dealt: 0, absorbed: 0 };
    }
    const res = this.resistOf(t, element);
    const pvAvant = t.hp, r = t.takeDamage(amount);
    const porte = (pvAvant - t.hp) + (r.absorbed || 0);
    this.noter(source, 'degats', porte);
    this.noter(t, 'recus', porte);
    if (pvAvant > 0 && t.hp <= 0 && source && source.team !== t.team && !t.isSummon) this.noter(source, 'acheves', 1);
    t.flashUntil = performance.now() + 250;
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
      if (opts.volDiffere && r.dealt > 0) {
        const v = Math.round(r.dealt * opts.volDiffere / 100);
        if (v > 0) { source.addEffect({ type: 'soinDiffere', min: v, max: v, brut: true, owner: source, spell: null, turns: 1 }, source === this.actor); this.log(`${source.name} récupérera ${v} PV au début de son tour.`); }
      }
      if (opts.lifesteal && r.dealt > 0) {
        const h = source.heal(Math.round(r.dealt * opts.lifesteal / 100));
        this.noter(source, 'soins', h);
        if (h > 0) {
          this.emit('float', { x: source.x, y: source.y, text: '+' + h, color: '#6fdc8c' });
          this.log(`${source.name} récupère ${h} PV.`);
        }
      }
      if (t.def.relique && t.team === source.team && r.dealt > 0 && source.alive && !opts.trap) {
        const h = source.heal(Math.round(r.dealt * 0.75));
        this.noter(source, 'soins', h);
        if (h > 0) { this.emit('float', { x: source.x, y: source.y, text: '+' + h, color: '#6fdc8c' }); this.log(`${source.name} récupère ${h} PV sur ${t.name}.`, source.team); }
      }
      const inv = source.effects.find(f => f.type === 'state' && f.name === 'invisible');
      if (inv && !inv.persistent && !opts.trap) {
        if (inv.lingering) inv.revealAtEnd = true;
        else { source.removeState('invisible'); this.log(`${source.name} redevient visible.`); }
      }
      if (this.castCtx && this.castCtx.caster === source && t.team !== source.team && r.dealt + r.absorbed > 0) { this.castCtx.hitFoe = true; (this.castCtx.touches = this.castCtx.touches || new Set()).add(t); }
      if (t.kit && t.kit.fury && t.alive && source.team !== t.team && dist <= 1 && r.dealt + r.absorbed > 0) this.gainFury(t, t.kit.fury.onMeleeHit || 0);
      if (source.team !== t.team && r.dealt + r.absorbed > 0) for (const v of this.entities) {
        const k = v.kit && v.kit.reserve;
        if (k && k.gain === 'allie' && v.alive && v.team === t.team && Grid.dist(v.pos, t.pos) <= (k.rayon || 2)) this.gainReserve(v, k.par || 1);
      }
      const oath = this.oathOn(source);
      if (oath && oath.burn && oath.by && oath.by.alive && t !== oath.by && t.team === oath.by.team && r.dealt > 0 && !opts.oathBurn && source.alive) {
        this.dealDamage(oath.by, source, this.scaleByResist(source, 'feu', Math.round(oath.burn * (oath.by.scale || 1) * this.bonusFormat(oath.by))), 'feu', { label: 'serment', oathBurn: true });
      }
    }
    if (t === this.player) this.hook('onDamage', t);
    if (source && source.team === 'monster' && t === this.player && r.dealt > 0 && this.knots) {
      if (this.knots.has('noeud_de_sang')) this.noter(source, 'soins', source.heal(Math.round(r.dealt / 10)));
      if (this.knots.has('noeud_de_braise') && element !== null && !opts.label) {
        t.effects = t.effects.filter(f => !(f.type === 'dot' && f.knot));
        t.addEffect({ type: 'dot', element: 'feu', value: 4, turns: 2, knot: true }, false);
      }
    }
    if (element && t.def.featFaille && r.dealt > 0 && (t.resist || {})[element] < 0) this.feats[t.def.featFaille] = (this.feats[t.def.featFaille] || 0) + 1;
    if (element && t.alive) this.fireTriggers(t, 'hitByElement', { element, source });
    if (t.alive && r.dealt > 0) this.fireTriggers(t, 'hit', { source, element, dist, dealt: r.dealt });
    if (t.alive && r.dealt > 0) this.baliseSwap(t);
    if (t.alive) this.fireTriggers(t, 'hpBelow', {});
    const coup = { source, direct: !!source && (!opts.label || opts.label === 'charge'), dealt: r.dealt };
    if (t.team !== 'player') this.hook('onHit', t, coup);
    if (!t.alive) { this.coupFatal = coup; this.onDeath(t, source); this.coupFatal = null; }
    return r;
  }

  obstacleKind(x, y) {
    if (!Grid.inBounds(this.map, x, y)) return 'obstacle';
    const t = Grid.tile(this.map, x, y);
    const tmp = this.tempAt(x, y);
    if (t === Grid.ROCK || t === Grid.TREE || (tmp && tmp.kind === 'rock')) return 'obstacle';
    return 'edge';
  }

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

  loseHp(e, amount, label) {
    const lost = Math.min(amount, Math.max(0, e.hp - 1));
    e.hp -= lost;
    this.emit('float', { x: e.x, y: e.y, text: '-' + lost, color: '#ff5a5a' });
    this.log(`${e.name} sacrifie ${lost} PV${label ? ' (' + label + ')' : ''}.`);
    if (e === this.player) this.hook('onDamage', e);
    this.fireTriggers(e, 'hpBelow', {});
  }

  baliseSwap(owner) {
    const b = this.summonsOf(owner).find(s => s.def.swapOnOwnerHit);
    if (!b || owner.def.fixed || owner.unpushable) return;
    const from = owner.pos, to = b.pos;
    this.emit('animMove', { entity: owner, to, teleport: true });
    this.kill(b, `${owner.name} file sur sa Balise de Plume.`);
    this.place(owner, to.x, to.y);
    owner.moved = true;
    this.log(`${owner.name} quitte la case ${from.x},${from.y} pour sa balise.`);
    this.checkTraps(owner);
  }

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
    if (c.voitEnnemi != null && this.enemies(e).some(o => this.canSee(e, o) && this.hasLos(e, e.pos, o.pos)) !== !!c.voitEnnemi) return false;
    return true;
  }

  runTrigger(e, a) {
    switch (a.act) {
      case 'log':
        this.log(a.text, 'system');
        break;
      case 'summon': {
        const have = () => this.entities.filter(o => o.alive && o.caller === e && o.def.id === a.monster).length;
        for (let i = 0; i < (a.count || 1); i++) {
          if (a.max && have() >= a.max) break;
          this.spawn(a.monster, e.team, e.pos, e, e, !!DATA.monsters[a.monster].summon, e.level);
        }
        break;
      }
      case 'state':
        if (a.name === 'invisible' && e.hasState('tracked')) break;
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
        this.noter(e, 'soins', h);
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
        const owner = e.owner && e.owner.alive ? e.owner : e;
        const cells = Grid.aoeCells(this.map, 'circle', a.size == null ? 1 : a.size, e.pos, e.pos);
        this.placeGlyph(owner, cells, a, { name: a.name, element: a.element || 'neutre' }, true);
        break;
      }
    }
  }

  cycleColor(e, cycle) {
    e.colorIndex = ((e.colorIndex == null ? -1 : e.colorIndex) + 1) % cycle.length;
    const c = cycle[e.colorIndex];
    e.resist = Object.assign({ feu: 0, eau: 0, air: 0, terre: 0, neutre: 0 }, c.resist || {});
    e.color = c.color;
    if (c.spell) e.spells = [c.spell];
    const a = { feu: 'au feu', eau: 'à l\'eau', air: 'à l\'air', terre: 'à la terre', neutre: 'au neutre' };
    const liste = f => Object.keys(e.resist).filter(k => f(e.resist[k])).map(k => a[k]).join(' et ');
    const fort = liste(v => v > 0), faible = liste(v => v < 0);
    this.log(`${e.name} vire au ${c.name} : il résiste ${fort || 'à rien'}${faible ? ', il est sensible ' + faible : ''}.`, 'system');
  }

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
      if (a.feat) this.feats[a.feat] = (this.feats[a.feat] || 0) + 1;
    }
  }

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
    const noyade = Math.round(12 * (boss.scale || 1));
    for (const t of this.enemies(boss)) {
      const tmp = this.tempAt(t.x, t.y);
      if (tmp && tmp.kind === 'water' && t.alive) this.dealDamage(boss, t, this.scaleByResist(t, 'eau', noyade), 'eau', { label: 'noyade' });
    }
  }

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

  explode(e, a) {
    const cells = Grid.aoeCells(this.map, 'circle', a.radius, e.pos, e.pos);
    this.emit('fx', { cells, color: DATA.elements[a.element].color });
    this.log(`${e.name} explose !`, 'system');
    const k = e.scale || 1;
    for (const c of cells) {
      const t = this.entityAt(c.x, c.y);
      if (!t || t === e || (a.enemiesOnly && t.team === e.team)) continue;
      if (t.def.featExplosion && t.alive) this.feats[t.def.featExplosion] = (this.feats[t.def.featExplosion] || 0) + 1;
      this.dealDamage(null, t, this.rollDamage(null, t, a.element, { min: Math.round(a.min * k), max: Math.round(a.max * k) }, null), a.element, { label: 'explosion' });
    }
  }


  async runAI(e) {
    const gen = this.gen;
    for (let step = 0; step < 12; step++) {
      if (gen !== this.gen || this.phase !== 'battle') return;
      if (!e.alive) break;
      if (e.hasState('stunned')) break;
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
    let visible = all.filter(t => this.canSee(e, t));
    { const g = this.gibierDe(e); if (g) visible = [g]; }
    const allies = this.allies(e);
    if (e.ai === 'charger') {
      const a = this.aiCharge(e, visible);
      if (a) return a;
    }
    if (e.def.home) {
      const h = this.aiHome(e);
      if (h) return h;
    }
    if (e.ai === 'summoner') {
      const a = this.aiSummon(e, visible);
      if (a) return a;
    }
    for (const id of e.spells) {
      const s = this.spellOf(id, e);
      if (!s.effects.some(ef => ef.type === 'heal' || ef.type === 'soinDiffere') || !this.spellState(e, id).ok) continue;
      const hurt = allies.filter(a => a.hp < a.hpMax * 0.6).sort((a, b) => a.hpPct() - b.hpPct());
      for (const a of hurt) if (this.canCastAt(e, id, a.pos).ok) return { type: 'cast', spell: id, cell: a.pos };
    }
    const wall = this.aiWall(e, visible);
    if (wall) return wall;
    const near = visible.some(t => Grid.dist(e.pos, t.pos) <= 4);
    if (near) {
      for (const id of e.spells) {
        const s = this.spellOf(id, e);
        if (s.target !== 'self' || !this.spellState(e, id).ok) continue;
        if (!s.effects.some(ef => ['shield', 'power', 'pa', 'pm', 'state'].includes(ef.type)) && !(s.selfEffects || []).some(ef => ['paNow', 'pmNow', 'shield', 'power'].includes(ef.type))) continue;
        if (s.effects.some(ef => ef.type === 'damage')) continue;
        if (e.pa - s.pa < 3) continue;
        return { type: 'cast', spell: id, cell: e.pos };
      }
    }
    const attack = this.aiBestAttack(e, e.pos, visible);
    if (attack) return attack;
    if (e.pm > 0 && e.aiMoves < 2) return this.aiMove(e, visible.length ? visible : all.map(t => this.knownSpot(e, t)).filter(Boolean));
    return null;
  }

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
      const far = enemies.filter(t => Grid.dist(e.pos, t.pos) >= 3 && !this.aiBestAttack(e, e.pos, [t]));
      for (const t of far) {
        const dir = Grid.pushDirection(t.pos, e.pos);
        const c = { x: t.x + dir.x, y: t.y + dir.y };
        if (this.canCastAt(e, id, c).ok) return { type: 'cast', spell: id, cell: c };
      }
    }
    return null;
  }

  aiBestAttack(e, from, enemies) {
    let best = null;
    for (const id of e.spells) {
      const s = this.spellOf(id, e);
      const dmg = s.effects.find(ef => ef.type === 'damage');
      if (!dmg || !this.spellState(e, id).ok) continue;
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
    const walks = enemies.map(t => Grid.reachable(this.map, t.pos, 60, (x, y) => { const o = this.entityAt(x, y); return !!(o && o !== e && o !== t); }, (x, y) => this.isWalkable(x, y, e)));
    const nearest = c => Math.min(...enemies.map((t, i) => { const d = walks[i].dist.get(Grid.key(c.x, c.y)); return d == null ? 100 + Grid.dist(c, t.pos) : d; }));
    const canStillCast = e.spells.some(id => this.spellState(e, id).ok && this.spellOf(id, e).effects.some(ef => ef.type === 'damage'));
    if (canStillCast) {
      const real = enemies.filter(t => t.def);
      const good = real.length ? cells.filter(c => this.aiBestAttack(e, c, real)) : [];
      if (good.length) {
        if (e.ai === 'ranged') good.sort((a, b) => nearest(b) - nearest(a) || a.d - b.d);
        else good.sort((a, b) => a.d - b.d);
        return { type: 'move', path: Grid.pathTo(reach, good[0]) };
      }
      cells.sort((a, b) => nearest(a) - nearest(b) || a.d - b.d);
      if (nearest(cells[0]) >= nearest(e.pos)) return null;
      return { type: 'move', path: Grid.pathTo(reach, cells[0]) };
    }
    if (e.ai === 'ranged' && nearest(e.pos) <= 2) {
      cells.sort((a, b) => nearest(b) - nearest(a) || a.d - b.d);
      if (nearest(cells[0]) > nearest(e.pos)) return { type: 'move', path: Grid.pathTo(reach, cells[0]) };
    }
    return null;
  }
}
