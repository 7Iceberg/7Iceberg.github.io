class Character {
  constructor(data) {
    Object.assign(this, {
      classId: DATA.defaultClass, name: 'Veilleur', gender: 'f', level: 1, xp: 0, statPoints: 0,
      stats: { vita: 0, sagesse: 0, force: 0, intel: 0, chance: 0, agi: 0 },
      equipment: { coiffe: null, cape: null, amulette: null, anneau1: null, anneau2: null, ceinture: null, bottes: null, arme: null, bouclier: null },
      inventory: {}, fils: 0, hp: null, titles: [], title: null,
      coffre: { items: {}, fils: 0 },
      quests: { active: {}, done: [] },
      counters: { fights: 0, wins: 0, kills: {}, maps: [], crafts: 0, gathers: 0, filsEarned: 0, filsRecus: 0, dungeons: [], dungeonTurns: {}, bosses: [], questsDone: 0, feats: {} },
      achievements: [], pos: null, relay: null, relays: [], dungeon: null, autoStats: true, playTime: 0, knots: [], ensembles: [], voie: null, scrolls: {},
      variantes: {},
      look: null, porte: null, ensemblesLook: [],
      familiers: {}, familier: null, metiers: {},
      monture: null,
      sceaux: null,
      trousseau: {},
    }, data || {});
    if (!this.trousseau || typeof this.trousseau !== 'object' || Array.isArray(this.trousseau)) this.trousseau = {};
    if (!this.coffre || typeof this.coffre !== 'object') this.coffre = { items: {}, fils: 0 };
    if (!this.coffre.items || typeof this.coffre.items !== 'object') this.coffre.items = {};
    if (!Number.isFinite(this.coffre.fils)) this.coffre.fils = 0;
    if (!this.familiers || typeof this.familiers !== 'object' || Array.isArray(this.familiers)) this.familiers = {};
    if (this.familier != null && !this.familiers[this.familier]) this.familier = null;
    const base = new.target === Character && data ? Character.defaults() : null;
    if (base) {
      this.stats = Object.assign(base.stats, this.stats || {});
      this.equipment = Object.assign(base.equipment, this.equipment || {});
      this.quests = Object.assign(base.quests, this.quests || {});
      this.counters = Object.assign(base.counters, this.counters || {});
    }
    this.name = String(this.name || 'Veilleur').slice(0, 16);
    const vieille = DATA.classes[this.classId];
    if (vieille && vieille.season && vieille.remplacee) { this.classId = vieille.remplacee; this.variantes = {}; }
    if (!DATA.classes[this.classId]) this.classId = DATA.defaultClass;
    this.look = Character.cleanLook(this.look, this.classId).look;
    this.porte = typeof Garderobe !== 'undefined' ? Garderobe.nettoyerPorte(this.porte).porte : Object.assign(Character.porteDefaut(), this.porte && typeof this.porte === 'object' ? this.porte : {});
    this.ensemblesLook = typeof Garderobe !== 'undefined' ? Garderobe.nettoyerLooks(this.ensemblesLook).looks : (Array.isArray(this.ensemblesLook) ? this.ensemblesLook.slice(0, 5) : []);
    const main = this.classDef.mainStat;
    this.scrolls = Object.assign({ vita: 0, sagesse: 0, force: 0, intel: 0, chance: 0, agi: 0 }, this.scrolls || {});
    if (base && !(this.v >= 3)) { this.resetStats(); if (this.autoStats) this.autoAllocate(); }
    else if (base && !(this.v >= 2) && this.autoStats && this.stats[main] === 4 && this.stats.vita > 12) {
      const spent = Object.keys(this.stats).reduce((n, k) => n + (k === 'vita' ? Math.floor(this.stats[k] / 3) : this.stats[k]), 0);
      for (const k in this.stats) this.stats[k] = 0;
      this.statPoints += spent;
      this.autoAllocate();
      if (this.hp != null) this.hp = Math.min(this.hp, this.derived().hpMax);
    }
    if (base && !(this.v >= 4)) {
      const rendu = Character.spentFor({ vita: this.stats.vita || 0, sagesse: this.stats.sagesse || 0 });
      this.stats.vita = 0; this.stats.sagesse = 0;
      this.statPoints += rendu;
      if (this.autoStats && rendu) this.autoAllocate();
    }
    this.voie = null;
    if (this.sceaux && typeof this.sceaux === 'object') this.sceaux = { rangs: Object.assign({}, this.sceaux.rangs || {}), poses: Array.isArray(this.sceaux.poses) ? this.sceaux.poses : [] };
    else this.sceaux = null;
    this.sceauxNettoyer();
    if (base && typeof Quests !== 'undefined') for (const id in this.quests.active) { const q = Quests.get(id); if (q) Quests.giveStartItems(this, q); }
    delete this.spellRanks; delete this.spellPoints; delete this.autoSpells;
    this.variantes = this.variantesValides(this.variantes);
    if (base && !(this.v >= 5) && this.autoStats && this.statPoints > 0) this.autoAllocate();
    if (!Array.isArray(this.achClaimed)) this.achClaimed = (this.achievements || []).slice();
    this.achClaimed = [...new Set(this.achClaimed)].filter(id => this.achievements.includes(id));
    if (this.hp == null) this.hp = this.derived().hpMax;
    this.v = 5;
    if (!this.uid) this.uid = (Date.now().toString(36) + Math.random().toString(36).slice(2, 10)).slice(0, 20);
    Object.defineProperty(this, 'integrity', { value: this.integrity || [], writable: true, enumerable: false });
  }

  static defaults() {
    return {
      stats: { vita: 0, sagesse: 0, force: 0, intel: 0, chance: 0, agi: 0 },
      equipment: { coiffe: null, cape: null, amulette: null, anneau1: null, anneau2: null, ceinture: null, bottes: null, arme: null, bouclier: null },
      quests: { active: {}, done: [] },
      counters: { fights: 0, wins: 0, kills: {}, maps: [], crafts: 0, gathers: 0, filsEarned: 0, filsRecus: 0, dungeons: [], dungeonTurns: {}, bosses: [], questsDone: 0, feats: {} },
    };
  }

  static create(classId, name, gender, voie, opts) {
    opts = opts || {};
    const data = { classId, name: (name || '').trim() || 'Veilleur', gender: gender === 'm' ? 'm' : 'f', voie: null, look: opts.look || null };
    if (typeof opts.tuto === 'string') data.tuto = { mode: opts.tuto, step: 0, done: opts.tuto === 'off' };
    else if (opts.tuto) data.tuto = opts.tuto;
    return new Character(data);
  }

  static get TETES() { return 8; }
  static get COULEURS() { return ['peau', 'cheveux', 'tenue', 'tenue2', 'cape', 'lanterne']; }
  static defaultLook(classId) {
    const c = DATA.classes[classId] || DATA.classes[DATA.defaultClass];
    return Util.defaultLook(c.color);
  }

  static porteDefaut() { return { teinture: null, lueur: null, aura: null, blason: null, theme: null }; }

  lookAffiche() {
    if (typeof Garderobe === 'undefined') return { look: this.look, auraCos: null, lueur: null, blason: null };
    const cle = `${Garderobe.version()}|${JSON.stringify(this.porte)}|${this.look ? this.look.tete + (this.look.couleurs || []).join('') : ''}`;
    const cache = this._lookAffiche;
    if (cache && cache.cle === cle) return cache.valeur;
    const l = Garderobe.lookPorte(this);
    const valeur = { look: l.look, auraCos: l.aura ? l.aura.data : null, lueur: l.lueur && l.lueur.data ? l.lueur.data.effet || null : null, blason: l.blason ? l.blason.data : null };
    Object.defineProperty(this, '_lookAffiche', { value: { cle, valeur }, writable: true, enumerable: false, configurable: true });
    return valeur;
  }

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

  static get VOIES() { return ['terre', 'feu', 'eau', 'air']; }
  static get STAT_OF() { return { terre: 'force', feu: 'intel', eau: 'chance', air: 'agi' }; }
  static get ALLOUABLES() { return ['force', 'intel', 'chance', 'agi']; }
  get mainStat() { return this.classDef.mainStat; }
  setVoie() { return false; }
  spellFor() { return null; }

  static xpToNext(level) { return Math.round(10 * Math.pow(level / 2, 2.4)); }
  static get PODS_BASE() { return 1000; }
  static get PODS_TERRA() { return 5; }
  static get PLAFOND() { return Object.assign({ pa: 12, pm: 6, po: 6 }, (typeof DATA === 'object' && DATA.rules && DATA.rules.plafonds) || {}); }
  static get MAX_LEVEL() { return (typeof DATA === 'object' && DATA.rules && DATA.rules.niveauMax) || 60; }

  get classDef() { return DATA.classes[this.classId]; }

  derived(equipment = this.equipment) {
    const c = this.classDef;
    const total = Object.assign({}, this.stats);
    for (const k in this.scrolls || {}) total[k] = (total[k] || 0) + (this.scrolls[k] || 0);
    const extra = { pa: 0, pm: 0, po: 0, init: 0, crit: 0, dmg: 0, tacle: 0, fuite: 0, pp: 0, soin: 0, puissance: 0, invocation: 0, pods: 0,
      esquive_pa: 0, esquive_pm: 0, retrait_pa: 0, retrait_pm: 0, dmg_crit: 0, dmg_pou: 0, res_pct: 0, res_fixe: 0, res_crit: 0, res_pou: 0,
      dmg_terre: 0, dmg_feu: 0, dmg_eau: 0, dmg_air: 0, res_terre: 0, res_feu: 0, res_eau: 0, res_air: 0, res_neutre: 0 };
    const setCount = {};
    const seen = new Set();
    const add = stats => { for (const k in stats) { if (k in extra) extra[k] += stats[k]; else if (Items.STATS.includes(k)) total[k] = (total[k] || 0) + stats[k]; } };
    for (const slot of Items.EQUIP_SLOTS) {
      const id = equipment[slot];
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
    const familier = typeof Familiers !== 'undefined' ? Familiers.bonusActif(this) : {};
    add(familier);
    const monture = typeof Montures !== 'undefined' ? Montures.bonusActif(this) : {};
    add(monture);
    const R = DATA.rules;
    const sc = this.sceauxBilan(), A = sc.arbre;
    const a = k => A[k] || 0;
    const S = DATA.sceaux ? DATA.sceaux.regles : { pvBase: 50, pvParNiveau: 5 };
    const pvBrut = S.pvBase + S.pvParNiveau * this.level + (total.vita || 0) + sc.pv;
    const part = R.pvDeClasse === true ? 1 : Number(R.pvDeClasse) || 0;
    const hpMax = Math.round(pvBrut * (1 + part * (c.hp - 120) / 120));
    const sum4 = (total.force || 0) + (total.intel || 0) + (total.chance || 0) + (total.agi || 0);
    const resMax = DATA.sceaux ? DATA.sceaux.regles.resMax || 50 : 50;
    const resist = Object.assign({}, c.resist);
    for (const el of ['terre', 'feu', 'eau', 'air', 'neutre']) { const v = a('res_' + el) + a('resTous') + extra.res_pct + (extra['res_' + el] || 0); if (v) resist[el] = (resist[el] || 0) + v; resist[el] = Math.min(resMax, resist[el] || 0); }
    const agi10 = Math.floor(Math.max(0, total.agi || 0) / 10), sag10 = Math.floor(Math.max(0, total.sagesse || 0) / 10);
    return {
      stats: total, hpMax, pa: Math.min(Character.PLAFOND.pa, 6 + (this.level >= 100 ? 1 : 0) + extra.pa), pm: Math.min(Character.PLAFOND.pm, 3 + extra.pm), po: Math.min(Character.PLAFOND.po, extra.po),
      puissance: extra.puissance, invocations: extra.invocation,
      initiative: extra.init + sum4 + a('init'),
      crit: extra.crit + a('crit'), dmgFlat: extra.dmg, setBonuses, setCount, familier, monture,
      tacle: agi10 + extra.tacle + a('tacle') + (c.tacle || 0),
      fuite: agi10 + extra.fuite + (R.playerFuiteBase || 0) + a('fuite'),
      esquivePA: sag10 + a('esquivePA') + extra.esquive_pa, esquivePM: sag10 + a('esquivePM') + extra.esquive_pm, retraitPA: sag10 + a('retraitPA') + extra.retrait_pa, retraitPM: sag10 + a('retraitPM') + extra.retrait_pm,
      prospection: 100 + Math.floor(Math.max(0, total.chance || 0) / 10) + extra.pp + a('pp') + (c.prospection || 0),
      soins: (total.intel || 0) + extra.soin + a('soins'),
      podsMax: Character.PODS_BASE + 5 * this.level + Character.PODS_TERRA * Math.max(0, total.force || 0) + a('pods') + extra.pods,
      resist, dmgPct: { terre: a('dmg_terre'), neutre: a('dmg_terre'), feu: a('dmg_feu'), eau: a('dmg_eau'), air: a('dmg_air') },
      dmgFixe: { terre: a('fixe_terre') + extra.dmg_terre, neutre: a('fixe_terre') + extra.dmg_terre, feu: a('fixe_feu') + extra.dmg_feu, eau: a('fixe_eau') + extra.dmg_eau, air: a('fixe_air') + extra.dmg_air },
      dmgCrit: a('dmgCrit') + extra.dmg_crit, reduc: a('reduc') + extra.res_fixe, resCrit: extra.res_crit, resPou: extra.res_pou,
      soinsFixes: a('soinsFixes'), soinsRecus: a('soinsRecus'), boucliers: a('boucliers'), poussee: a('poussee') + extra.dmg_pou,
      passifs: sc.passifs, sceauxPoses: sc.poses,
    };
  }


  sceauxEtat() {
    const caracs = {}, depense = {};
    for (const k of Character.ALLOUABLES) { caracs[k] = this.stats[k] || 0; depense[k] = Character.spentFor({ [k]: caracs[k] }); }
    const s = this.sceaux || {};
    return { niveau: this.level, caracs, depense, rangs: Object.assign({}, s.rangs || {}), poses: Array.isArray(s.poses) ? s.poses.slice() : [], dragmes: this.fils };
  }
  appliquerSceaux(e) {
    for (const k of Character.ALLOUABLES) this.stats[k] = e.caracs[k] || 0;
    this.statPoints = 5 * (this.level - 1) - Character.spentFor(this.stats);
    this.sceaux = { rangs: Object.assign({}, e.rangs), poses: e.poses.slice(0, 20) };
    this.fils = e.dragmes;
    if (this.hp != null) this.hp = Math.min(this.hp, this.derived().hpMax);
  }
  sceauxNettoyer() {
    if (typeof Sceaux === 'undefined' || !this.sceaux || !Object.keys(this.sceaux.rangs || {}).length) return;
    const e = Sceaux.valider(this.sceauxEtat());
    this.sceaux = { rangs: e.rangs, poses: e.poses };
  }
  sceauxBilan() {
    const vide = { arbre: {}, pv: 0, poses: 0, passifs: [] };
    if (typeof Sceaux === 'undefined' || !this.sceaux || !this.sceaux.rangs) return vide;
    const b = Sceaux.bilan(this.sceauxEtat());
    const passifs = Object.keys(this.sceaux.rangs).filter(id => this.sceaux.rangs[id] > 0 && Sceaux.D.noeuds[id] && Sceaux.D.noeuds[id].passif);
    return { arbre: b.arbre, pv: b.pvArbre, poses: b.poses, passifs };
  }

  unlockedSpells() {
    const out = [];
    this.classDef.paires.forEach(([base, vari], i) => {
      if (vari && this.variantes[i] && Character.unlockLevel(this.classId, vari) <= this.level) out.push(vari);
      else if (Character.unlockLevel(this.classId, base) <= this.level) out.push(base);
    });
    return out;
  }

  sortsObtenus() {
    return this.classDef.spells.filter(id => Character.unlockLevel(this.classId, id) <= this.level);
  }

  choisirVariante(i, oui) {
    const p = this.classDef.paires[i];
    if (!p || !p[1]) return { ok: false, reason: 'Ce sort n\'a pas de variante.' };
    if (oui && Character.unlockLevel(this.classId, p[1]) > this.level) return { ok: false, reason: `La variante s'obtient au niveau ${Character.unlockLevel(this.classId, p[1])}.` };
    const v = Object.assign({}, this.variantes);
    if (oui) v[i] = true; else delete v[i];
    this.variantes = v;
    return { ok: true };
  }

  variantesValides(v) {
    const out = {};
    if (!v || typeof v !== 'object' || Array.isArray(v)) return out;
    for (const k of Object.keys(v)) {
      const i = Number(k), p = this.classDef.paires[i];
      if (Number.isInteger(i) && v[k] === true && p && p[1]) out[i] = true;
    }
    return out;
  }

  toEntityDef() {
    const d = this.derived();
    const c = this.classDef;
    const spells = this.unlockedSpells();
    const extraSpells = {};
    for (const id of spells) { const v = this.spellFor(id); if (v) extraSpells[id] = v; }
    const weapon = this.equipment.arme ? Items.get(this.equipment.arme) : null;
    if (weapon && weapon.spell) { extraSpells.arme = weapon.spell; spells.push('arme'); }
    const ap = this.lookAffiche();
    return {
      name: this.name, classId: this.classId, level: this.level, shape: 'player', glyph: c.glyph, color: c.color, look: ap.look, auraCos: ap.auraCos, lueur: ap.lueur, gender: this.gender,
      hp: d.hpMax, hpCurrent: this.hp, pa: d.pa, pm: d.pm, initiative: Math.round(d.initiative * Math.max(0, Math.min(1, (this.hp == null ? d.hpMax : this.hp) / Math.max(1, d.hpMax)))), resist: d.resist,
      spells, extraSpells, stats: d.stats, dmgFlat: d.dmgFlat, crit: d.crit, title: this.title, tacle: d.tacle, fuite: d.fuite,
      scale: 1,
      dmgPct: d.dmgPct, dmgFixe: d.dmgFixe, dmgCrit: d.dmgCrit, reduc: d.reduc, soinsPct: d.soins, soinsFixes: d.soinsFixes, soinsRecus: d.soinsRecus,
      puissance: d.puissance, po: d.po, invocations: d.invocations, resCrit: d.resCrit, resPou: d.resPou,
      boucliers: d.boucliers, poussee: d.poussee, esquivePA: d.esquivePA, esquivePM: d.esquivePM, retraitPA: d.retraitPA, retraitPM: d.retraitPM, passifs: d.passifs,
      spellRanks: Object.fromEntries(spells.filter(id => id !== 'arme').map(id => [id, this.spellRank(id)])),
    };
  }

  wisdomXp(amount) {
    return Math.round(amount * (1 + (this.derived().stats.sagesse || 0) / 100));
  }

  gainXp(amount) {
    const gained = this.wisdomXp(amount);
    this.xp += gained;
    let levels = 0;
    while (this.level < Character.MAX_LEVEL && this.xp >= Character.xpToNext(this.level)) {
      this.xp -= Character.xpToNext(this.level);
      this.level++;
      this.statPoints += 5;
      levels++;
    }
    if (levels) {
      if (this.autoStats) this.autoAllocate();
      this.hp = this.derived().hpMax;
    }
    return { gained, levels };
  }

  xpProgress() {
    return this.level >= Character.MAX_LEVEL ? 1 : this.xp / Character.xpToNext(this.level);
  }

  static pointCost(stat, current) {
    if (stat === 'vita') return 1;
    if (stat === 'sagesse') return DATA.rules.sagesseCost;
    for (const [upTo, cost] of DATA.rules.statTiers) if (current < upTo) return cost;
    return 4;
  }

  static spentFor(stats) {
    let n = 0;
    for (const k in stats) for (let v = 0; v < (stats[k] || 0); v++) n += Character.pointCost(k, v);
    return n;
  }

  allocate(stat, n) {
    if (!Character.ALLOUABLES.includes(stat)) return 0;
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

  deallocate(stat, n) {
    n = n || 1;
    let back = 0;
    for (let i = 0; i < n; i++) {
      if (!(this.stats[stat] > 0)) break;
      this.stats[stat] -= 1;
      back += Character.pointCost(stat, this.stats[stat]);
    }
    this.statPoints += back;
    this.sceauxNettoyer();
    this.hp = Math.min(this.hp, this.derived().hpMax);
    return back;
  }

  readScroll(stat, n) {
    const max = DATA.rules.scrollMax;
    const before = this.scrolls[stat] || 0;
    this.scrolls[stat] = Math.min(max, before + n);
    return this.scrolls[stat] - before;
  }

  resetStats() {
    for (const k in this.stats) this.stats[k] = 0;
    this.statPoints = 5 * (this.level - 1);
    if (this.sceaux) this.sceaux = { rangs: {}, poses: [] };
    if (this.hp != null) this.hp = Math.min(this.hp, this.derived().hpMax);
  }

  static nomEnsemble(nom) {
    return typeof nom === 'string' ? nom.replace(/[\x00-\x1f\x7f]/g, '').trim().slice(0, 28) : '';
  }

  saveEnsemble(nom) {
    this.ensembles = this.ensembles || [];
    if (this.ensembles.length >= 6) return { ok: false, reason: 'Six ensembles au plus.' };
    const e = {};
    for (const slot of Items.EQUIP_SLOTS) if (this.equipment[slot]) e[slot] = this.equipment[slot];
    if (!Object.keys(e).length) return { ok: false, reason: 'Rien n’est équipé.' };
    const titre = Character.nomEnsemble(nom);
    if (titre) e.nom = titre;
    this.ensembles.push(e);
    return { ok: true, index: this.ensembles.length - 1 };
  }

  renameEnsemble(i, nom) {
    const e = (this.ensembles || [])[i];
    const titre = Character.nomEnsemble(nom);
    if (!e || !titre) return false;
    e.nom = titre;
    return true;
  }

  planEnsemble(tenue) {
    const equipment = {};
    const inventory = { ...this.inventory };
    const changements = [];
    const erreurs = [];
    for (const slot of Items.EQUIP_SLOTS) {
      const porte = this.equipment[slot] || null;
      if (porte) inventory[porte] = (inventory[porte] || 0) + 1;
      const voulu = tenue[slot] || null;
      equipment[slot] = voulu;
      if (porte !== voulu) changements.push({ slot, porte, voulu });
    }
    for (const slot of Items.EQUIP_SLOTS) {
      const id = equipment[slot];
      if (!id) continue;
      const d = Items.get(id);
      let raison;
      if (!d) raison = 'Objet inconnu';
      else if (d.kind === 'weapon' ? slot !== 'arme' : d.kind !== 'equip' || d.slot !== slot.replace(/\d$/, '')) raison = 'Emplacement incompatible';
      else if (d.level > this.level) raison = 'Niveau ' + d.level + ' requis';
      else if (!(inventory[id] > 0)) raison = 'Absent du sac';
      if (raison) { erreurs.push({ slot, id, raison }); continue; }
      if (--inventory[id] === 0) delete inventory[id];
    }
    return { ok: erreurs.length === 0, equipment, inventory, changements, erreurs };
  }

  equiperEnsemble(tenue) {
    const plan = this.planEnsemble(tenue);
    if (!plan.ok) return { ok: false, reason: 'Cet ensemble contient des pièces indisponibles.' };
    if (!plan.changements.length) return { ok: true };
    const hp = Math.min(this.hp, this.derived(plan.equipment).hpMax);
    this.equipment = plan.equipment;
    this.inventory = plan.inventory;
    this.hp = hp;
    return { ok: true };
  }

  useEnsemble(i) {
    const e = (this.ensembles || [])[i];
    return e ? this.equiperEnsemble(e) : { ok: false, reason: 'Ensemble inconnu.' };
  }

  deleteEnsemble(i) { if (this.ensembles) this.ensembles.splice(i, 1); }

  autoAllocate() {
    const main = this.mainStat;
    while (this.statPoints >= Character.pointCost(main, this.stats[main])) this.allocate(main, 1);
    this.autoSceaux();
  }

  autoSceaux() {
    if (typeof Sceaux === 'undefined') return 0;
    const e = this.sceauxEtat();
    let n = 0;
    for (const v of Character.VOIES) {
      const soin = v === 'feu' && /Soigneur|Soutien/.test(this.classDef.role || '');
      n += Sceaux.autoPoser(e, v, soin ? 'g' : 'd');
    }
    if (n) this.sceaux = { rangs: e.rangs, poses: e.poses };
    return n;
  }


  static unlockLevel(classId, id) {
    const p = DATA.paireDe(classId, id);
    if (!p) return Infinity;
    return DATA.spells[id].unlock || (p.variante ? DATA.calendrier.variantes : DATA.calendrier.bases)[p.i];
  }

  static rangAuNiveau(classId, id, level) {
    const u = Character.unlockLevel(classId, id);
    if (!(u <= level)) return 0;
    const p = DATA.paireDe(classId, id), R = DATA.spellRanks;
    return 1 + (p.variante ? R.ecartsVariante : R.ecarts).filter(e => u + e <= level).length;
  }

  static niveauxDesRangs(classId, id) {
    const u = Character.unlockLevel(classId, id);
    if (!Number.isFinite(u)) return [];
    const p = DATA.paireDe(classId, id), R = DATA.spellRanks;
    const max = (typeof SCEAUX_DATA !== 'undefined' && SCEAUX_DATA.regles.niveauMax) || 300;
    return [u].concat((p.variante ? R.ecartsVariante : R.ecarts).map(e => u + e).filter(l => l <= max));
  }

  spellRank(id) { return Character.rangAuNiveau(this.classId, id, this.level) || 1; }


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

  pods() {
    let n = 0;
    for (const id in this.inventory) n += Items.poids(id) * this.inventory[id];
    for (const slot of Items.EQUIP_SLOTS) if (this.equipment[slot]) n += Items.poids(this.equipment[slot]);
    return n;
  }
  surcharge() { return this.pods() > this.derived().podsMax; }
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
    if (d.sub === 'parchemin' && !d.xp) {
      const got = this.readScroll(d.stat, d.value || 1);
      if (!got) return `Tu sais déjà tout ce que ce parchemin peut t'apprendre (${DATA.rules.scrollMax} au plus).`;
      this.removeItem(id, 1);
      return `${d.name} : +${got} ${Items.STAT_LABEL[d.stat]} de base.`;
    }
    if (d.sub === 'teinture') {
      if (typeof Garderobe === 'undefined' || !Garderobe.get(d.cosmetique)) return null;
      if (Garderobe.possede(d.cosmetique)) return 'Cette teinture est déjà dans ta Garde-robe.';
      this.removeItem(id, 1);
      const entres = Garderobe.donner(d.cosmetique, 'artisanat:' + id);
      return `${d.name} : ${entres.length ? Garderobe.get(d.cosmetique).nom + ' entre dans ta Garde-robe.' : 'rien.'}`;
    }
    if (d.sub === 'oeuf') {
      if (typeof Familiers === 'undefined' || !Familiers.get(d.familier)) return null;
      const r = Familiers.eclore(this, d.familier);
      if (!r.ok) return r.raison;
      this.removeItem(id, 1);
      return this.familier === d.familier ? `${r.familier.nom} éclot et te suit.` : `${r.familier.nom} éclot : il t'attend dans tes Familiers (K).`;
    }
    if (d.sub === 'monture') {
      if (typeof Montures === 'undefined' || !Montures.get(d.monture)) return null;
      const r = Montures.donner(this, d.monture);
      if (!r.ok) return r.raison;
      this.removeItem(id, 1);
      return `Tu montes ton ${r.monture.nom}. Il t'attend dans tes Montures (L).`;
    }
    if (d.sub === 'potion') {
      if (d.effect === 'oubli') { this.removeItem(id, 1); this.resetStats(); if (this.autoStats) this.autoAllocate(); return `${d.name} : tes caractéristiques et tes Sceaux sont rendus.`; }
      if (d.heal && d.heal < 999) {
        const max = this.derived().hpMax;
        if (this.hp >= max) return 'Tu as déjà tous tes PV.';
        this.removeItem(id, 1);
        const avant = this.hp; this.hp = Math.min(max, this.hp + d.heal);
        return `${d.name} : +${this.hp - avant} PV.`;
      }
      this.removeItem(id, 1);
      if (d.heal) { this.hp = this.derived().hpMax; return `${d.name} : PV au maximum.`; }
      return 'relais';
    }
    if (d.sub === 'poisson') {
      const max = this.derived().hpMax;
      if (this.hp >= max) return 'Tu n\'as pas faim.';
      this.removeItem(id, 1);
      const avant = this.hp; this.hp = Math.min(max, this.hp + (d.heal || 0));
      return `${d.name} : +${this.hp - avant} PV.`;
    }
    if (d.sub === 'friandise') {
      const f = this.familier && this.familiers && this.familiers[this.familier];
      if (!f || typeof Familiers === 'undefined') return 'Emmène un familier pour lui donner une friandise.';
      if (f.xp >= Familiers.XP_MAX) return 'Ton familier est à son niveau maximum.';
      this.removeItem(id, 1);
      const pris = Math.min(d.familierXp || 0, Familiers.XP_MAX - f.xp); f.xp += pris;
      return `${d.name} : +${pris} XP pour ton familier.`;
    }
    if (d.sub === 'sac') {
      const region = (d.contenu || '').split(' ').pop();
      const zones = new Set((DATA.content.zones || []).filter(z => z.region === region).map(z => z.id));
      const pool = (DATA.content.resources || []).filter(r => (r.node && (r.node.zone === region || zones.has(r.node.zone))) || (r.drops || []).some(x => DATA.monsters[x.monster] && DATA.monsters[x.monster].region === region && x.rate >= 10));
      if (!pool.length) return null;
      this.removeItem(id, 1);
      const q = d.quantite || 20, recu = {};
      for (let i = 0; i < q; i++) { const r = pool[Math.floor(Math.random() * pool.length)]; this.addItem(r.id, 1); recu[r.name] = (recu[r.name] || 0) + 1; }
      return `${d.name} : ${Object.entries(recu).map(([n, k]) => `${k} ${n}`).join(', ')}.`;
    }
    if (d.sub === 'parchemin' && d.xp) { this.removeItem(id, 1); const g = this.gainXp(d.xp); return `${d.name} : +${g.gained} XP.`; }
    if (['bonbon', 'artifice', 'pierre_ame'].includes(d.sub)) return `${d.name} : bientôt.`;
    return null;
  }

  toJSON() {
    const o = {};
    for (const k of Object.keys(this)) o[k] = this[k];
    return o;
  }

  static fromJSON(o) { return new Character(o); }
}

