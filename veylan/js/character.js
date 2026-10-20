// Le personnage du joueur hors combat : classe, niveau, XP, caractéristiques, équipement,
// inventaire, Fils, quêtes, succès, position. Se sérialise en JSON pour la sauvegarde.
class Character {
  constructor(data) {
    Object.assign(this, {
      classId: DATA.defaultClass, name: 'Veilleur', gender: 'f', level: 1, xp: 0, statPoints: 0,
      stats: { vita: 0, sagesse: 0, force: 0, intel: 0, chance: 0, agi: 0 },
      equipment: { coiffe: null, cape: null, amulette: null, anneau1: null, anneau2: null, ceinture: null, bottes: null, arme: null },
      inventory: {}, fils: 0, hp: null, titles: [], title: null,
      quests: { active: {}, done: [] },
      counters: { fights: 0, wins: 0, kills: {}, maps: [], crafts: 0, gathers: 0, filsEarned: 0, dungeons: [], dungeonTurns: {}, bosses: [], questsDone: 0, feats: {} },
      achievements: [], pos: null, relay: null, relays: [], dungeon: null, autoStats: true, playTime: 0, knots: [], ensembles: [], voie: null, scrolls: {},
      look: null,
    }, data || {});
    // Une sauvegarde plus ancienne peut manquer de champs imbriqués : on complète sans écraser.
    const base = new.target === Character && data ? Character.defaults() : null;
    if (base) {
      this.stats = Object.assign(base.stats, this.stats || {});
      this.equipment = Object.assign(base.equipment, this.equipment || {});
      this.quests = Object.assign(base.quests, this.quests || {});
      this.counters = Object.assign(base.counters, this.counters || {});
    }
    this.name = String(this.name || 'Veilleur').slice(0, 16);
    if (!DATA.classes[this.classId]) this.classId = DATA.defaultClass;
    // Apparence : un personnage d'avant son arrivée reçoit celle de sa classe (la validation de la
    // sauvegarde signale ce qui était faux). Le tutoriel (ch.tuto) est lu par js/guide.js.
    this.look = Character.cleanLook(this.look, this.classId).look;
    // Les sauvegardes faites avec l'ancienne répartition automatique ont la caractéristique
    // principale bloquée à 4 et tout le reste en vitalité : on refait la répartition.
    const main = this.classDef.mainStat;
    // Format 3 : coûts des caractéristiques comme Dofus (paliers, vitalité 1 pour 1, sagesse 3 pour
    // 1). Une sauvegarde plus ancienne récupère tous ses points, replacés si la répartition est
    // automatique.
    this.scrolls = Object.assign({ vita: 0, sagesse: 0, force: 0, intel: 0, chance: 0, agi: 0 }, this.scrolls || {});
    if (base && !(this.v >= 3)) { this.resetStats(); if (this.autoStats) this.autoAllocate(); }
    else if (base && !(this.v >= 2) && this.autoStats && this.stats[main] === 4 && this.stats.vita > 12) {
      const spent = Object.keys(this.stats).reduce((n, k) => n + (k === 'vita' ? Math.floor(this.stats[k] / 3) : this.stats[k]), 0);
      for (const k in this.stats) this.stats[k] = 0;
      this.statPoints += spent;
      this.autoAllocate();
      if (this.hp != null) this.hp = Math.min(this.hp, this.derived().hpMax);
    }
    if (base && typeof Quests !== 'undefined') for (const id in this.quests.active) { const q = Quests.get(id); if (q) Quests.giveStartItems(this, q); }
    // Rangs des sorts (docs/SORTS.md) : un personnage d'avant les rangs a tous ses sorts au rang 1
    // et niveau − 1 points de sort ; s'il laisse le jeu répartir ses caractéristiques, ses points
    // de sort sont placés de même.
    if (!this.spellRanks || typeof this.spellRanks !== 'object' || !Number.isInteger(this.spellPoints)) {
      this.spellRanks = {};
      this.spellPoints = this.level - 1;
      if (typeof this.autoSpells !== 'boolean') this.autoSpells = this.autoStats !== false;
      if (this.autoSpells) this.autoAllocateSpells();
    }
    if (typeof this.autoSpells !== 'boolean') this.autoSpells = true;
    // Récompenses de succès remises (js/achievements.js). Une sauvegarde d'avant les récompenses
    // en attente les a toutes reçues au déblocage : tout ce qui est débloqué compte comme remis.
    if (!Array.isArray(this.achClaimed)) this.achClaimed = (this.achievements || []).slice();
    this.achClaimed = [...new Set(this.achClaimed)].filter(id => this.achievements.includes(id));
    if (this.hp == null) this.hp = this.derived().hpMax;
    // Version du format (les migrations ne jouent qu'une fois) et identifiant du personnage
    // (l'import refuse un code plus ancien du même personnage).
    this.v = 3;
    if (!this.uid) this.uid = (Date.now().toString(36) + Math.random().toString(36).slice(2, 10)).slice(0, 20);
    // Les remarques de la validation ne sont pas sauvegardées.
    Object.defineProperty(this, 'integrity', { value: this.integrity || [], writable: true, enumerable: false });
  }

  static defaults() {
    return {
      stats: { vita: 0, sagesse: 0, force: 0, intel: 0, chance: 0, agi: 0 },
      equipment: { coiffe: null, cape: null, amulette: null, anneau1: null, anneau2: null, ceinture: null, bottes: null, arme: null },
      quests: { active: {}, done: [] },
      counters: { fights: 0, wins: 0, kills: {}, maps: [], crafts: 0, gathers: 0, filsEarned: 0, dungeons: [], dungeonTurns: {}, bosses: [], questsDone: 0, feats: {} },
    };
  }

  // opts : { look, tuto } ; tuto est un mode ('guide', 'court', 'off') ou l'objet complet de
  // js/guide.js ({ mode, step, done }). Sans tutoriel choisi, le guide décide (Guide.modeDe).
  static create(classId, name, gender, voie, opts) {
    opts = opts || {};
    const data = { classId, name: (name || '').trim() || 'Veilleur', gender: gender === 'm' ? 'm' : 'f', voie: Character.VOIES.includes(voie) ? voie : null, look: opts.look || null };
    if (typeof opts.tuto === 'string') data.tuto = { mode: opts.tuto, step: 0, done: opts.tuto === 'off' };
    else if (opts.tuto) data.tuto = opts.tuto;
    return new Character(data);
  }

  // ----- Apparence -----
  // Apparence : { tete: 0 à 7 (coiffure), couleurs: [peau, cheveux, tenue, tenue2, cape, lanterne] },
  // en « #rrggbb ». Par défaut, celle que la classe avait avant les apparences (Util.defaultLook).
  static get TETES() { return 8; }
  static get COULEURS() { return ['peau', 'cheveux', 'tenue', 'tenue2', 'cape', 'lanterne']; }
  static defaultLook(classId) {
    const c = DATA.classes[classId] || DATA.classes[DATA.defaultClass];
    return Util.defaultLook(c.color);
  }

  // Une apparence propre : une liste blanche, des entiers bornés, des couleurs hexadécimales.
  // Rend { look, errors } ; ce qui est faux reprend la valeur par défaut et laisse une remarque.
  static cleanLook(look, classId) {
    const def = Character.defaultLook(classId);
    if (look == null) return { look: def, errors: [] };
    if (typeof look !== 'object' || Array.isArray(look)) return { look: def, errors: ['apparence illisible'] };
    const errors = [];
    for (const k of Object.keys(look)) if (k !== 'tete' && k !== 'couleurs') errors.push(`apparence : champ ${k}`);
    let tete = look.tete;
    if (!Number.isInteger(tete) || tete < 0 || tete >= Character.TETES) { errors.push('apparence : tête'); tete = 0; }
    const list = Array.isArray(look.couleurs) ? look.couleurs : null;
    if (!list || list.length !== def.couleurs.length) errors.push('apparence : couleurs');
    const couleurs = def.couleurs.map((d, i) => {
      const c = list ? list[i] : null;
      if (typeof c === 'string' && /^#[0-9a-f]{6}$/i.test(c)) return c.toLowerCase();
      if (list && i < list.length) errors.push(`apparence : couleur ${Character.COULEURS[i]}`);
      return d;
    });
    return { look: { tete, couleurs }, errors };
  }

  // Voie élémentaire : le joueur choisit l'élément de ses sorts de dégâts (terre, feu, eau, air), ou
  // garde les éléments d'origine de sa classe (voie nulle). La caractéristique principale suit.
  static get VOIES() { return ['terre', 'feu', 'eau', 'air']; }
  static get STAT_OF() { return { terre: 'force', feu: 'intel', eau: 'chance', air: 'agi' }; }
  get mainStat() { return this.voie ? Character.STAT_OF[this.voie] : this.classDef.mainStat; }

  // Changer de voie rend tous les points (gratuit, comme la réinitialisation) ; en répartition
  // automatique, ils repartent dans la nouvelle caractéristique.
  setVoie(voie) {
    voie = Character.VOIES.includes(voie) ? voie : null;
    if (voie === this.voie) return false;
    this.voie = voie;
    this.resetStats();
    if (this.autoStats) this.autoAllocate();
    if (this.autoSpells) this.autoAllocateSpells();
    return true;
  }

  // Un sort de la classe vu par ce personnage : dans sa voie, ses effets prennent l'élément choisi.
  spellFor(id) {
    const s = DATA.spells[id];
    if (!this.voie || !s || s.element === 'neutre' || s.element === this.voie) return null;
    return Object.assign({}, s, { element: this.voie, effects: s.effects.map(ef => ef.element ? Object.assign({}, ef, { element: this.voie }) : ef) });
  }

  static xpToNext(level) { return Math.round(20 * Math.pow(level, 2.4)); }
  static get UNLOCK() { return [1, 1, 1, 3, 6, 9, 13, 17, 21, 26]; }
  static get MAX_LEVEL() { return 30; }

  get classDef() { return DATA.classes[this.classId]; }

  // Stats totales (allouées + objets), PV max, PA, PM, initiative, critique, bonus de panoplie.
  derived() {
    const c = this.classDef;
    const total = Object.assign({}, this.stats);
    for (const k in this.scrolls || {}) total[k] = (total[k] || 0) + (this.scrolls[k] || 0);
    const extra = { pa: 0, pm: 0, init: 0, crit: 0, dmg: 0, tacle: 0, fuite: 0, pp: 0, soin: 0 };
    const setCount = {};
    const seen = new Set();   // deux anneaux identiques ne font qu'une pièce de panoplie
    const add = stats => { for (const k in stats) { if (k in extra) extra[k] += stats[k]; else total[k] = (total[k] || 0) + stats[k]; } };
    for (const slot of Items.EQUIP_SLOTS) {
      const id = this.equipment[slot];
      if (!id) continue;
      const d = Items.get(id);
      if (!d) continue;
      add(d.stats);
      if (d.set && !seen.has(id)) { seen.add(id); setCount[d.set] = (setCount[d.set] || 0) + 1; }
    }
    const setBonuses = [];
    for (const setId in setCount) {
      const s = Items.getSet(setId);
      const b = s && s.bonuses[setCount[setId]];
      if (b) { add(b); setBonuses.push({ set: s, count: setCount[setId], stats: b }); }
    }
    // PV de classe en proportion (120 = la moyenne) : l'écart entre un Sarkan et une Nerith tient
    // à tous les niveaux au lieu de fondre sous la vitalité des panoplies.
    const hpMax = Math.round((60 + 5 * this.level + (total.vita || 0)) * c.hp / 120);
    const R = DATA.rules;
    const sum4 = (total.force || 0) + (total.intel || 0) + (total.chance || 0) + (total.agi || 0);
    const sag = Math.floor((total.sagesse || 0) / 10);
    return {
      stats: total, hpMax, pa: 6 + extra.pa, pm: 3 + extra.pm,
      // Initiative comme Dofus : celle de la classe plus la somme des quatre caractéristiques.
      initiative: c.initiative + extra.init + sum4,
      crit: 5 + extra.crit, dmgFlat: extra.dmg, setBonuses, setCount,
      // Caractéristiques secondaires.
      tacle: Math.floor((total.agi || 0) / 10) + extra.tacle,
      fuite: Math.floor((total.agi || 0) / 10) + extra.fuite + (R.playerFuiteBase || 0),
      esquivePA: sag, esquivePM: sag, retraitPA: sag, retraitPM: sag,
      prospection: 100 + Math.floor((total.chance || 0) / 10) + extra.pp,
      soins: (total.intel || 0) + extra.soin,
    };
  }

  // Sorts connus : l'ordre de la classe, débloqués par niveau (DATA.spells[id].unlock prime).
  unlockedSpells() {
    return this.classDef.spells.filter((id, i) => (DATA.spells[id].unlock || Character.UNLOCK[i]) <= this.level);
  }

  // Définition d'entité pour le moteur de combat.
  toEntityDef() {
    const d = this.derived();
    const c = this.classDef;
    const spells = this.unlockedSpells();
    const extraSpells = {};
    for (const id of spells) { const v = this.spellFor(id); if (v) extraSpells[id] = v; }
    const weapon = this.equipment.arme ? Items.get(this.equipment.arme) : null;
    if (weapon && weapon.spell) { extraSpells.arme = weapon.spell; spells.push('arme'); }
    return {
      name: this.name, classId: this.classId, level: this.level, shape: 'player', glyph: c.glyph, color: c.color, look: this.look, gender: this.gender,
      hp: d.hpMax, hpCurrent: this.hp, pa: d.pa, pm: d.pm, initiative: d.initiative, resist: Object.assign({}, c.resist),
      spells, extraSpells, stats: d.stats, dmgFlat: d.dmgFlat, crit: d.crit, title: this.title, tacle: d.tacle, fuite: d.fuite,
      // Les sorts grandissent avec le niveau, comme les sorts montés de niveau dans Dofus : +3 % par niveau.
      scale: 1 + 0.03 * (this.level - 1),
      // Et chacun au rang que le joueur lui a donné : le moteur le lance à ce rang (DATA.spellAtRank).
      spellRanks: Object.assign({}, this.spellRanks),
    };
  }

  // L'XP réellement gagnée : la Sagesse ajoute 1 % par point.
  wisdomXp(amount) {
    return Math.round(amount * (1 + (this.derived().stats.sagesse || 0) / 100));
  }

  // Gagne de l'XP (sagesse comprise), monte de niveau : +5 points de caractéristique et 1 point de
  // sort, PV remis au maximum.
  gainXp(amount) {
    const gained = this.wisdomXp(amount);
    this.xp += gained;
    let levels = 0;
    while (this.level < Character.MAX_LEVEL && this.xp >= Character.xpToNext(this.level)) {
      this.xp -= Character.xpToNext(this.level);
      this.level++;
      this.statPoints += 5;
      this.spellPoints += 1;
      levels++;
    }
    if (levels) {
      if (this.autoStats) this.autoAllocate();
      if (this.autoSpells) this.autoAllocateSpells();
      this.hp = this.derived().hpMax;
    }
    return { gained, levels };
  }

  xpProgress() {
    return this.level >= Character.MAX_LEVEL ? 1 : this.xp / Character.xpToNext(this.level);
  }

  // Coût d'un point dans une caractéristique, d'après sa valeur de base actuelle (comme Dofus) :
  // Terra, Ignis, Aqua, Aer par paliers (1 jusqu'à 100, 2 jusqu'à 200, 3 jusqu'à 300, 4 au-delà),
  // Vitalité 1, Sagesse 3. Les parchemins et les objets ne comptent pas dans les paliers.
  static pointCost(stat, current) {
    if (stat === 'vita') return 1;
    if (stat === 'sagesse') return DATA.rules.sagesseCost;
    for (const [upTo, cost] of DATA.rules.statTiers) if (current < upTo) return cost;
    return 4;
  }

  // Points dépensés pour atteindre ces valeurs de base (sert à la validation des sauvegardes).
  static spentFor(stats) {
    let n = 0;
    for (const k in stats) for (let v = 0; v < (stats[k] || 0); v++) n += Character.pointCost(k, v);
    return n;
  }

  allocate(stat, n) {
    n = n || 1;
    let spent = 0;
    for (let i = 0; i < n; i++) {
      const cost = Character.pointCost(stat, this.stats[stat]);
      if (this.statPoints < cost) break;
      this.statPoints -= cost;
      this.stats[stat] += 1;
      spent += cost;
    }
    return spent;
  }

  // Retire des points d'une caractéristique et les rend (réinitialisation gratuite jusqu'au
  // niveau 30, comme l'alpha entière), au coût du palier où ils avaient été posés.
  deallocate(stat, n) {
    n = n || 1;
    let back = 0;
    for (let i = 0; i < n; i++) {
      if (!(this.stats[stat] > 0)) break;
      this.stats[stat] -= 1;
      back += Character.pointCost(stat, this.stats[stat]);
    }
    this.statPoints += back;
    this.hp = Math.min(this.hp, this.derived().hpMax);
    return back;
  }

  // Parchemin : un point de base gratuit dans une caractéristique, 50 au plus.
  readScroll(stat, n) {
    const max = DATA.rules.scrollMax;
    const before = this.scrolls[stat] || 0;
    this.scrolls[stat] = Math.min(max, before + n);
    return this.scrolls[stat] - before;
  }

  // Remet toutes les caractéristiques à zéro : chaque niveau rend ses 5 points.
  resetStats() {
    for (const k in this.stats) this.stats[k] = 0;
    this.statPoints = 5 * (this.level - 1);
    if (this.hp != null) this.hp = Math.min(this.hp, this.derived().hpMax);
  }

  // ----- Ensembles : des tenues enregistrées, remises d'un geste -----
  saveEnsemble() {
    this.ensembles = this.ensembles || [];
    if (this.ensembles.length >= 6) return { ok: false, reason: 'Six ensembles au plus.' };
    const e = {};
    for (const slot of Items.EQUIP_SLOTS) if (this.equipment[slot]) e[slot] = this.equipment[slot];
    if (!Object.keys(e).length) return { ok: false, reason: 'Rien n\'est équipé.' };
    this.ensembles.push(e);
    return { ok: true, index: this.ensembles.length - 1 };
  }

  useEnsemble(i) {
    const e = (this.ensembles || [])[i];
    if (!e) return { ok: false, reason: 'Ensemble inconnu.' };
    let missing = 0;
    for (const slot of Items.EQUIP_SLOTS) {
      const want = e[slot] || null;
      if (this.equipment[slot] === want) continue;
      if (this.equipment[slot]) this.unequip(slot);
      if (!want) continue;
      if (!this.canEquip(want).ok) { missing++; continue; }
      // Pose l'objet dans l'emplacement précis (deux anneaux).
      this.removeItem(want, 1);
      this.equipment[slot] = want;
    }
    this.hp = Math.min(this.hp, this.derived().hpMax);
    return { ok: true, missing };
  }

  deleteEnsemble(i) { if (this.ensembles) this.ensembles.splice(i, 1); }

  // Répartition automatique : tout dans la caractéristique de la voie, comme on joue dans Dofus.
  autoAllocate() {
    const main = this.mainStat;
    while (this.statPoints >= Character.pointCost(main, this.stats[main])) this.allocate(main, 1);
  }

  // ----- Rangs des sorts (docs/SORTS.md, DATA.spellRanks) -----
  // Un point de sort par niveau gagné ; monter un sort du rang r au rang r + 1 en coûte r. Les points
  // placés et ceux qui restent font toujours niveau − 1 (js/save.js le vérifie).

  static rankCost(rank) { return DATA.spellRanks.costs[rank - 1] || Infinity; }

  // Points que coûtent ces rangs depuis le rang 1 (sert à la validation des sauvegardes).
  static spellPointsFor(ranks) {
    let n = 0;
    for (const id in ranks || {}) for (let r = 1; r < ranks[id]; r++) n += Character.rankCost(r);
    return n;
  }

  // Niveau où un sort de la classe se débloque (DATA.spells[id].unlock prime) ; Infinity hors de la classe.
  static unlockLevel(classId, id) {
    const i = DATA.classes[classId] ? DATA.classes[classId].spells.indexOf(id) : -1;
    return i < 0 ? Infinity : (DATA.spells[id].unlock || Character.UNLOCK[i]);
  }

  spellRank(id) { return (this.spellRanks && this.spellRanks[id]) || 1; }

  // Le sort peut-il passer du rang `from` (par défaut le sien) au suivant avec `points` (par défaut
  // ceux qui restent) ? La fenêtre Sorts prévoit plusieurs rangs avant de valider : elle donne les deux.
  canRaiseSpell(id, from, points) {
    const R = DATA.spellRanks;
    from = from || this.spellRank(id);
    points = points == null ? this.spellPoints : points;
    const unlock = Character.unlockLevel(this.classId, id);
    if (!Number.isFinite(unlock)) return { ok: false, reason: 'Ce sort n\'est pas de ta classe.' };
    if (unlock > this.level) return { ok: false, reason: `Ce sort se débloque au niveau ${unlock}.`, level: unlock };
    if (from >= R.max) return { ok: false, reason: 'Rang maximum atteint.' };
    if (R.levels[from] > this.level) return { ok: false, reason: `Rang ${from + 1} : niveau ${R.levels[from]} requis.`, level: R.levels[from] };
    const cost = Character.rankCost(from);
    if (points < cost) return { ok: false, reason: `Rang ${from + 1} : ${cost} point${cost > 1 ? 's' : ''} de sort.`, cost };
    return { ok: true, cost };
  }

  raiseSpell(id) {
    const c = this.canRaiseSpell(id);
    if (!c.ok) return c;
    this.spellPoints -= c.cost;
    this.spellRanks = Object.assign({}, this.spellRanks, { [id]: this.spellRank(id) + 1 });
    return { ok: true, rank: this.spellRanks[id], cost: c.cost };
  }

  // Remet tous les sorts au rang 1, gratuitement : chaque niveau rend son point.
  resetSpells() {
    this.spellRanks = {};
    this.spellPoints = this.level - 1;
  }

  // Répartition automatique, refaite de zéro (c'est gratuit) : chaque sort, dans l'ordre de
  // spellPriority, monte aussi haut que les points le permettent ; ce qui reste paie le rang 2 des
  // suivants.
  autoAllocateSpells() {
    this.resetSpells();
    for (const id of this.spellPriority()) while (this.canRaiseSpell(id).ok) this.raiseSpell(id);
  }

  // Ordre de la répartition automatique, parmi les sorts débloqués : les sorts de dégâts de la
  // caractéristique principale (celle de la voie, sinon de la classe), du plus rentable au moins
  // rentable par PA ; puis les autres sorts de dégâts ; puis soins et boucliers ; puis le reste,
  // dans l'ordre de déblocage.
  spellPriority() {
    const STAT = { terre: 'force', neutre: 'force', feu: 'intel', eau: 'chance', air: 'agi' };
    const list = this.unlockedSpells().map(id => {
      const s = this.spellFor(id) || DATA.spells[id];
      const rate = Character.damageRate(s);
      const care = s.effects.some(ef => ef.type === 'heal' || ef.type === 'shield');
      const group = rate > 0 ? (STAT[s.element] === this.mainStat ? 0 : 1) : (care ? 2 : 3);
      return { id, group, rate, unlock: Character.unlockLevel(this.classId, id) };
    });
    list.sort((a, b) => a.group - b.group || b.rate - a.rate || a.unlock - b.unlock);
    return list.map(x => x.id);
  }

  // Rendement d'un sort de dégâts pour la répartition automatique : dégâts moyens par PA (coups,
  // bonds, pièges, sacrifices, brûlures sur toute leur durée), plus pour une zone ou un bonus
  // propre (invisible, Fureur, PV bas, cible affaiblie), moins pour une relance de 2 tours ou plus.
  static damageRate(s) {
    const sum = list => (list || []).reduce((n, ef) => n + (ef.type === 'damage' || ef.type === 'sacrifice' ? (ef.min + ef.max) / 2
      : ef.type === 'dot' ? ef.value * ef.turns : ef.type === 'leap' ? sum(ef.effects) : ef.type === 'trap' ? 0.6 * sum(ef.effects) : 0), 0);
    let d = sum(s.effects);
    if (!d) return 0;
    if (s.aoe && s.aoe.shape !== 'single') d *= 1.4;
    if (s.bonusIfInvisible || s.furySpend || s.lowHpBonus || s.executeBelow) d *= 1.25;
    if ((s.cooldown || 0) >= 2) d *= 0.7;
    return d / Math.max(1, s.pa);
  }


  // ----- Nœuds -----
  // Les Nœuds noués et effectivement possédés (un Nœud vendu se dénoue).
  activeKnots() { return (this.knots || []).filter(id => this.has(id)); }
  toggleKnot(id) {
    const k = (DATA.knots || []).find(x => x.id === id);
    if (!k || !this.has(id)) return { ok: false, reason: 'Tu n\'as pas ce Nœud.' };
    this.knots = this.activeKnots();
    if (this.knots.includes(id)) { this.knots = this.knots.filter(x => x !== id); return { ok: true, on: false }; }
    if (k.level > this.level) return { ok: false, reason: `Niveau ${k.level} requis.` };
    if (this.knots.length >= DATA.rules.maxKnots) return { ok: false, reason: `${DATA.rules.maxKnots} Nœuds au plus.` };
    this.knots.push(id);
    return { ok: true, on: true };
  }

  // ----- Inventaire -----
  count(id) { return this.inventory[id] || 0; }
  has(id, n) { return this.count(id) >= (n || 1); }
  addItem(id, n) { this.inventory[id] = this.count(id) + (n || 1); return this.inventory[id]; }
  removeItem(id, n) {
    n = n || 1;
    if (this.count(id) < n) return false;
    this.inventory[id] -= n;
    if (this.inventory[id] <= 0) delete this.inventory[id];
    return true;
  }

  canEquip(id) {
    const d = Items.get(id);
    if (!d) return { ok: false, reason: 'Objet inconnu' };
    if (d.kind !== 'equip' && d.kind !== 'weapon') return { ok: false, reason: 'Ne s\'équipe pas' };
    if (d.level > this.level) return { ok: false, reason: `Niveau ${d.level} requis` };
    if (!this.has(id)) return { ok: false, reason: 'Pas dans l\'inventaire' };
    return { ok: true };
  }

  // Équipe un objet depuis l'inventaire ; l'ancien retourne dans l'inventaire. Un anneau va au
  // premier emplacement libre, ou à celui qu'on vise (`want` : anneau1 ou anneau2, l'objet glissé
  // sur un emplacement précis).
  equip(id, want) {
    const check = this.canEquip(id);
    if (!check.ok) return check;
    const d = Items.get(id);
    let slot = d.slot;
    if (slot === 'anneau') slot = want === 'anneau1' || want === 'anneau2' ? want : (!this.equipment.anneau1 ? 'anneau1' : (!this.equipment.anneau2 ? 'anneau2' : 'anneau1'));
    const old = this.equipment[slot];
    this.removeItem(id, 1);
    this.equipment[slot] = id;
    if (old) this.addItem(old, 1);
    this.hp = Math.min(this.hp, this.derived().hpMax);
    return { ok: true, slot };
  }

  unequip(slot) {
    const id = this.equipment[slot];
    if (!id) return false;
    this.equipment[slot] = null;
    this.addItem(id, 1);
    this.hp = Math.min(this.hp, this.derived().hpMax);
    return true;
  }

  // Consomme un pain ou une potion. Retourne un texte pour le journal, ou null.
  use(id) {
    const d = Items.get(id);
    if (!d || d.kind !== 'consumable' || !this.has(id)) return null;
    if (d.sub === 'pain') {
      const max = this.derived().hpMax;
      if (this.hp >= max) return 'Tu n\'as pas faim.';
      this.removeItem(id, 1);
      const before = this.hp;
      this.hp = Math.min(max, this.hp + d.heal);
      return `${d.name} : +${this.hp - before} PV.`;
    }
    if (d.sub === 'parchemin') {
      const got = this.readScroll(d.stat, d.value || 1);
      if (!got) return `Tu sais déjà tout ce que ce parchemin peut t'apprendre (${DATA.rules.scrollMax} au plus).`;
      this.removeItem(id, 1);
      return `${d.name} : +${got} ${Items.STAT_LABEL[d.stat]} de base.`;
    }
    if (d.sub === 'potion') {
      this.removeItem(id, 1);
      if (d.heal) { this.hp = this.derived().hpMax; return `${d.name} : PV au maximum.`; }
      return 'relais';
    }
    return null;
  }

  toJSON() {
    const o = {};
    for (const k of Object.keys(this)) o[k] = this[k];
    return o;
  }

  static fromJSON(o) { return new Character(o); }
}
