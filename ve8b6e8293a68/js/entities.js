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
    const mob = def.ai && !def.summon && !def.epreuve;
    const k = mob ? (R.echelleVeilleurs || 0) : 0;
    const e = k ? Entity.ecartEchelle(this.level) : { degats: 1, pv: 1 };
    const absolu = 1 + k * (e.pv - 1);
    this.echelleHp = 1 + k * (e.degats - 1);
    const objD = mob && R.monstresObjetsDegats ? DATA.courbe(R.monstresObjetsDegats, this.level) : 1;
    this.objPv = mob && R.monstresObjetsPv ? DATA.courbe(R.monstresObjetsPv, this.level) : 1;
    this.scale = def.scale || (1 + R.monsterDamagePerLevel * steps) * (def.dmgMult || 1) * (mob ? R.monsterDamageMult : 1) * absolu * objD / (mob ? DATA.reductionCoups(this.level) : 1);
    const high = mob ? 1 + (R.monsterHpHighPerLevel || 0) * Math.max(0, this.level - (R.monsterHpHighFrom || 99)) : 1;
    const compense = mob ? 1 + (R.monsterHpCompense || 0) * Math.max(0, this.level - 1) : 1;
    const echelle = mob ? DATA.echellePv(this.level) : 1;
    this.hpMax = Math.max(1, Math.round(def.hp * (1 + R.monsterHpPerLevel * steps) * (mob ? R.monsterHpMult : 1) * high * this.echelleHp / compense * echelle * this.objPv));
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
    this.resCrit = def.resCrit || 0;
    this.puissance = def.puissance || 0;
    this.po = def.po || 0;
    this.invocations = def.invocations || 0;
    this.resPou = def.resPou || 0;
    this.dmgPct = def.dmgPct || {};
    this.dmgFixe = def.dmgFixe || {};
    this.dmgCrit = def.dmgCrit || 0;
    this.reduc = def.reduc || 0;
    this.soinsPct = def.soinsPct != null ? def.soinsPct : null;
    this.soinsFixes = def.soinsFixes || 0;
    this.soinsRecus = def.soinsRecus || 0;
    this.boucliers = def.boucliers || 0;
    this.poussee = def.poussee || 0;
    this.esquivePts = { pa: def.esquivePA || 0, pm: def.esquivePM || 0 };
    this.retraitPts = { pa: def.retraitPA || 0, pm: def.retraitPM || 0 };
    this.passifs = new Set(def.passifs || []);
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
    if (this.kit && this.kit.id === 'oriel' && DATA.spells.bascule_du_ciel && !this.spells.includes('bascule_du_ciel')) this.spells.push('bascule_du_ciel');
    if (this.kit && this.kit.id === 'orvald' && DATA.spells.demontage && !this.spells.includes('demontage')
      && this.spells.some(id => DATA.spells[id] && DATA.spells[id].effects.some(f => f.type === 'summon' && DATA.monsters[f.monster] && DATA.monsters[f.monster].relique))) this.spells.push('demontage');
    this.fury = 0;
    this.reserve = 0;
    this.braise = this.kit && this.kit.braise ? this.kit.braise.debut || 0 : 0;
    this.moved = false;
    this.lootBonus = 0;
    this.rx = 0;
    this.ry = 0;
    this.alpha = 1;
    this.flashUntil = 0;
  }

  static echellePv(level) { return DATA.echellePv(level); }

  static xpFor(def, level) {
    return def && def.ai && !def.summon ? Math.round(8 * Math.pow(level / 2, 1.6)) * (def.boss ? 5 : def.rare && def.base ? 3 : 1) : 0;
  }

  static ecartEchelle(n) {
    const tiers = DATA.rules.statTiers || [[1e9, 1]];
    const carac = points => { let v = 0; for (const [jusqua, cout] of tiers) { while (v < jusqua && points >= cout) { v++; points -= cout; } if (points < cout) break; } return v; };
    const L = Math.max(1, n), A = (L + 1) / 2;
    const cN = carac(5 * (L - 1)), cA = carac(Math.round(5 * (A - 1)));
    const SR = (DATA.sceaux && DATA.sceaux.regles) || { pvBase: 50, pvParNiveau: 5, pvParSceau: 5 };
    const pv = (niv, c) => SR.pvBase + SR.pvParNiveau * niv + (SR.pvParSceau || 5) * Math.floor(c / 10);
    return { degats: (100 + cN) / (100 + cA), pv: pv(L, cN) / pv(A, cA) };
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
    return 1 + Math.max(0, this.statFor(element) + (this.dmgPct[element] || 0) + (this.puissance || 0)) / 100;
  }

  aPassif(id) { return !this.isSummon && this.passifs.has(id); }

  esquive(kind) {
    if (this.owner) return this.owner.esquive(kind);
    return (this.esquivePts[kind] || 0) + Math.floor(this.wisdom / 10);
  }
  retrait(kind) {
    if (this.owner) return this.owner.retrait(kind);
    return (this.retraitPts[kind] || 0) + Math.floor(this.wisdom / 10);
  }

  get wisdom() {
    if (this.owner) return this.owner.wisdom;
    if (this.def.ai && !(this.def.stats && this.def.stats.sagesse != null)) return Math.floor((this.level || 0) / 2);
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
    this.pmDepenses = 0;
    this.affutCrans = 0;
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
    if (this.hasState('forme_iskar')) amount = Math.round(amount * 0.4);
    const before = this.hp;
    this.hp = Math.min(this.hpMax, this.hp + amount);
    const h = this.hp - before;
    if (h > 0 && !this.isSummon) { const b = this.bilan || (this.bilan = { degats: 0, recus: 0, soins: 0, boucliers: 0 }); b.soinsRecus = (b.soinsRecus || 0) + h; }
    return h;
  }
}
