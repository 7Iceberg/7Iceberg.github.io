// Une entité de combat : le personnage du joueur, un monstre ou une invocation.
class Entity {
  constructor(def, team, id, rng, level) {
    this.id = id;
    this.def = def;
    this.team = team;             // 'player' ou 'monster'
    this.name = def.name;
    this.shape = def.shape || 'circle';
    this.color = def.color || '#cccccc';
    this.glyph = def.glyph || null;
    // Un monstre est mis à l'échelle de son niveau dans sa fourchette ; un personnage arrive déjà calculé.
    const range = Entity.levelRange(def);
    this.level = level || def.level && typeof def.level === 'number' ? (level || def.level) : range[0];
    // Un monstre : +6 % de dégâts et +8 % de PV par niveau au-dessus du bas de sa fourchette, sa
    // puissance propre (`dmgMult`, réglée famille par famille dans js/data.js) et les
    // multiplicateurs communs à tous les monstres (DATA.rules). Une invocation prend ensuite
    // l'échelle de son maître (Combat.spawn).
    const R = DATA.rules;
    const steps = def.ai ? Math.max(0, this.level - range[0]) : 0;
    const mob = def.ai && !def.summon;
    this.scale = def.scale || (1 + R.monsterDamagePerLevel * steps) * (def.dmgMult || 1) * (mob ? R.monsterDamageMult : 1);
    // Au-delà du niveau `monsterHpHighFrom`, les monstres gagnent des PV par niveau absolu : ils
    // suivent les caractéristiques des joueurs, qui n'ont pas de plafond.
    const high = mob ? 1 + (R.monsterHpHighPerLevel || 0) * Math.max(0, this.level - (R.monsterHpHighFrom || 99)) : 1;
    this.hpMax = Math.round(def.hp * (1 + R.monsterHpPerLevel * steps) * (mob ? R.monsterHpMult : 1) * high);
    this.hp = this.hpMax;
    this.paMax = def.pa;
    this.pmMax = def.pm;
    this.pa = def.pa;
    this.pm = def.pm;
    // Petit aléa d'initiative pour que l'ordre des tours varie d'un combat à l'autre.
    this.initiative = def.initiative + Math.floor(rng() * 20);
    this.resist = Object.assign({ feu: 0, eau: 0, air: 0, terre: 0, neutre: 0 }, def.resist || {});
    this.stats = Object.assign({ vita: 0, sagesse: 0, force: 0, intel: 0, chance: 0, agi: 0 }, def.stats || {});
    this.dmgFlat = def.dmgFlat || 0;                     // dommages fixes ajoutés à chaque coup
    // Tacle et Fuite (Dofus) : un joueur les tient de son Aer ; un monstre de contact tacle selon
    // son niveau, tout monstre fuit selon son niveau, sauf valeurs propres.
    const wild = def.ai && !def.summon;
    const contact = def.ai === 'melee' || def.ai === 'charger';
    this.tacle = def.tacle != null ? def.tacle : (wild && contact ? Math.floor(this.level / DATA.rules.monsterTacleDiv) : 0);
    this.fuite = def.fuite != null ? def.fuite : (wild ? Math.floor(this.level / DATA.rules.monsterFuiteDiv) : 0);
    this.crit = def.crit || 0;                           // chance de coup critique, en pourcentage
    this.spells = def.spells.slice();
    this.extraSpells = def.extraSpells || null;          // sorts propres à l'entité (l'arme équipée)
    this.spellRanks = def.spellRanks || null;            // rang de chaque sort (personnage) ; sinon tous au rang 1
    this.ai = def.ai || null;
    this.boss = !!def.boss;
    this.ghost = !!def.ghost;        // traverse les rochers
    this.triggers = def.triggers || [];
    this.fired = new Set();          // déclencheurs à usage unique déjà partis
    this.immuneIndex = -1;
    this.immuneElement = null;       // élément auquel l'entité est immunisée (Thane)
    this.owner = null;               // propriétaire, pour une invocation
    this.isSummon = false;
    this.xp = Entity.xpFor(def, this.level);
    this.x = -1;
    this.y = -1;
    this.alive = true;
    this.effects = [];               // { type, value, turns, skipFirstTick, ... }
    this.cooldowns = {};             // id de sort -> tours restants
    this.casts = {};                 // id de sort -> lancers ce tour
    this.aiMoves = 0;
    this.turnStartPos = null;
    // Kit de classe d'un personnage (Fureur du Sarkan, Affût du Lyssar...), lu dans DATA.classes ;
    // un monstre n'en a pas.
    this.kit = def.shape === 'player' ? DATA.classes[def.classId || def.id] || null : null;
    this.fury = 0;                   // Fureur (0 au maximum du kit), perdue en fin de combat
    this.moved = false;              // s'est déplacé ce tour (casse l'Affût)
    this.lootBonus = 0;              // % de Fils et de butin en plus s'il tombe (bourse de la Nerith)
    // Position de rendu, interpolée pendant les animations.
    this.rx = 0;
    this.ry = 0;
    this.alpha = 1;
    this.flashUntil = 0;
  }

  // XP d'un monstre vaincu à ce niveau (cinq fois plus pour un boss, rien pour une invocation) :
  // celle que le monde additionne en fin de combat, et que la fiche d'un groupe annonce avant.
  static xpFor(def, level) {
    return def && def.ai && !def.summon ? Math.round(8 * Math.pow(level, 1.6)) * (def.boss ? 5 : 1) : 0;
  }

  // Fourchette de niveaux d'une définition : « 3 à 10 » pour un monstre, un nombre, ou [1, 1].
  static levelRange(def) {
    if (typeof def.level === 'number') return [def.level, def.level];
    const m = String(def.level || '').match(/(\d+)\D+(\d+)/);
    return m ? [Number(m[1]), Number(m[2])] : [1, 1];
  }

  // Caractéristique qui porte les dégâts d'un élément : force (terre, neutre), intelligence (feu),
  // chance (eau), agilité (air).
  statFor(element) {
    const k = { terre: 'force', neutre: 'force', feu: 'intel', eau: 'chance', air: 'agi' }[element];
    return k ? this.stats[k] || 0 : 0;
  }

  // Multiplicateur de dégâts de la caractéristique d'un élément : +1 % par point, sans plafond.
  statFactor(element) {
    return 1 + Math.max(0, this.statFor(element)) / 100;
  }

  // Sagesse : celle des caractéristiques pour un personnage ; un monstre sans sagesse définie a
  // celle de son niveau ; une invocation a celle de son maître.
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

  // Un effet posé pendant son propre tour ne commence à s'user qu'au tour suivant,
  // sinon un bouclier de « 1 tour » disparaîtrait avant que les ennemis aient joué.
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

  // Retire les malus : PA et PM négatifs, vulnérabilité, brûlures, états subis.
  cleanse() {
    this.effects = this.effects.filter(e => {
      if ((e.type === 'pa' || e.type === 'pm') && e.value < 0) return false;
      if (e.type === 'vuln' || e.type === 'dot' || e.type === 'echo') return false;
      if (e.type === 'state' && (e.name === 'provoked' || e.name === 'tracked')) return false;
      return true;
    });
  }

  // Applique des dégâts en consommant d'abord les boucliers. Retourne { dealt, absorbed }.
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

  // Retire tous les boucliers et retourne ce qu'ils valaient.
  stripShields() {
    const total = this.shield;
    this.effects = this.effects.filter(e => e.type !== 'shield');
    return total;
  }

  heal(amount) {
    // Insoignable (après une Renaissance) : aucun soin ne prend.
    if (this.hasState('unhealable')) return 0;
    const before = this.hp;
    this.hp = Math.min(this.hpMax, this.hp + amount);
    return this.hp - before;
  }
}
