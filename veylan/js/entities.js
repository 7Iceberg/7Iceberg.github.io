class Entity {
  constructor(def, team, id, rng, level) {
    this.id = id;
    this.def = def;
    this.team = team;
    this.name = def.name;
    this.shape = def.shape || 'circle';
    this.color = def.color || '#cccccc';
    this.glyph = def.glyph || null;
    const range = Entity.levelRange(def);
    this.level = level || def.level && typeof def.level === 'number' ? (level || def.level) : range[0];
    const R = DATA.rules;
    const steps = def.ai ? Math.max(0, this.level - range[0]) : 0;
    const mob = def.ai && !def.summon;
    this.scale = def.scale || (1 + R.monsterDamagePerLevel * steps) * (def.dmgMult || 1) * (mob ? R.monsterDamageMult : 1);
    const high = mob ? 1 + (R.monsterHpHighPerLevel || 0) * Math.max(0, this.level - (R.monsterHpHighFrom || 99)) : 1;
    this.hpMax = Math.round(def.hp * (1 + R.monsterHpPerLevel * steps) * (mob ? R.monsterHpMult : 1) * high);
    this.hp = this.hpMax;
    this.paMax = def.pa;
    this.pmMax = def.pm;
    this.pa = def.pa;
    this.pm = def.pm;
    this.initiative = def.initiative + Math.floor(rng() * 20);
    this.resist = Object.assign({ feu: 0, eau: 0, air: 0, terre: 0, neutre: 0 }, def.resist || {});
    this.stats = Object.assign({ vita: 0, sagesse: 0, force: 0, intel: 0, chance: 0, agi: 0 }, def.stats || {});
    this.dmgFlat = def.dmgFlat || 0;
    const wild = def.ai && !def.summon;
    const contact = def.ai === 'melee' || def.ai === 'charger';
    this.tacle = def.tacle != null ? def.tacle : (wild && contact ? Math.floor(this.level / DATA.rules.monsterTacleDiv) : 0);
    this.fuite = def.fuite != null ? def.fuite : (wild ? Math.floor(this.level / DATA.rules.monsterFuiteDiv) : 0);
    this.crit = def.crit || 0;
    this.spells = def.spells.slice();
    this.extraSpells = def.extraSpells || null;
    this.spellRanks = def.spellRanks || null;
    this.ai = def.ai || null;
    this.boss = !!def.boss;
    this.ghost = !!def.ghost;
    this.triggers = def.triggers || [];
    this.fired = new Set();
    this.immuneIndex = -1;
    this.immuneElement = null;
    this.owner = null;
    this.isSummon = false;
    this.xp = Entity.xpFor(def, this.level);
    this.x = -1;
    this.y = -1;
    this.alive = true;
    this.effects = [];
    this.cooldowns = {};
    this.casts = {};
    this.aiMoves = 0;
    this.turnStartPos = null;
    this.kit = def.shape === 'player' ? DATA.classes[def.classId || def.id] || null : null;
    this.fury = 0;
    this.braise = this.kit && this.kit.braise ? this.kit.braise.debut || 0 : 0;
    this.moved = false;
    this.lootBonus = 0;
    this.rx = 0;
    this.ry = 0;
    this.alpha = 1;
    this.flashUntil = 0;
  }

  static xpFor(def, level) {
    return def && def.ai && !def.summon ? Math.round(8 * Math.pow(level, 1.6)) * (def.boss ? 5 : 1) : 0;
  }

  static levelRange(def) {
    if (typeof def.level === 'number') return [def.level, def.level];
    const m = String(def.level || '').match(/(\d+)\D+(\d+)/);
    return m ? [Number(m[1]), Number(m[2])] : [1, 1];
  }

  statFor(element) {
    const k = { terre: 'force', neutre: 'force', feu: 'intel', eau: 'chance', air: 'agi' }[element];
    return k ? this.stats[k] || 0 : 0;
  }

  statFactor(element) {
    return 1 + Math.max(0, this.statFor(element)) / 100;
  }

  get wisdom() {
    if (this.owner) return this.owner.wisdom;
    if (this.def.ai && !(this.def.stats && this.def.stats.sagesse != null)) return this.level || 0;
    return this.stats.sagesse || 0;
  }

  get pos() {
    return { x: this.x, y: this.y };
  }

  modifier(type) {
    return this.effects.filter(e => e.type === type).reduce((s, e) => s + e.value, 0);
  }

  get shield() {
    return this.effects.filter(e => e.type === 'shield').reduce((s, e) => s + e.value, 0);
  }

  hasState(name) {
    return this.effects.some(e => e.type === 'state' && e.name === name);
  }

  stateBy(name) {
    const s = this.effects.find(e => e.type === 'state' && e.name === name);
    return s ? s.by : null;
  }

  removeState(name) {
    this.effects = this.effects.filter(e => !(e.type === 'state' && e.name === name));
  }

  hpPct() {
    return this.hpMax ? this.hp / this.hpMax * 100 : 0;
  }

  beginTurn() {
    this.pa = Math.max(0, this.paMax + this.modifier('pa'));
    this.pm = Math.max(0, this.pmMax + this.modifier('pm'));
    this.casts = {};
    this.aiMoves = 0;
    this.moved = false;
    this.turnStartPos = { x: this.x, y: this.y };
    for (const k in this.cooldowns) {
      if (this.cooldowns[k] > 0) this.cooldowns[k]--;
    }
  }

  endTurn() {
    for (const e of this.effects) {
      if (e.skipFirstTick) e.skipFirstTick = false;
      else e.turns--;
    }
    this.effects = this.effects.filter(e => e.turns > 0 && !(e.type === 'shield' && e.value <= 0));
  }

  addEffect(effect, duringOwnTurn) {
    this.effects.push(Object.assign({ skipFirstTick: !!duringOwnTurn }, effect));
  }

  cleanse() {
    this.effects = this.effects.filter(e => {
      if ((e.type === 'pa' || e.type === 'pm') && e.value < 0) return false;
      if (e.type === 'vuln' || e.type === 'dot' || e.type === 'echo') return false;
      if (e.type === 'state' && (e.name === 'provoked' || e.name === 'tracked')) return false;
      return true;
    });
  }

  takeDamage(amount) {
    let remaining = amount;
    for (const e of this.effects) {
      if (e.type !== 'shield' || remaining <= 0) continue;
      const used = Math.min(e.value, remaining);
      e.value -= used;
      remaining -= used;
    }
    this.effects = this.effects.filter(e => !(e.type === 'shield' && e.value <= 0));
    this.hp = Math.max(0, this.hp - remaining);
    if (this.hp === 0) this.alive = false;
    return { dealt: remaining, absorbed: amount - remaining };
  }

  stripShields() {
    const total = this.shield;
    this.effects = this.effects.filter(e => e.type !== 'shield');
    return total;
  }

  heal(amount) {
    if (this.hasState('unhealable')) return 0;
    const before = this.hp;
    this.hp = Math.min(this.hpMax, this.hp + amount);
    return this.hp - before;
  }
}
