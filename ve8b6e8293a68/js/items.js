const Items = (() => {
  const SLOTS = ['coiffe', 'cape', 'amulette', 'anneau', 'ceinture', 'bottes', 'bouclier'];
  const EQUIP_SLOTS = ['coiffe', 'cape', 'amulette', 'anneau1', 'anneau2', 'ceinture', 'bottes', 'arme', 'bouclier'];
  const STATS = ['vita', 'sagesse', 'force', 'intel', 'chance', 'agi'];
  const STAT_LABEL = { vita: 'Vitalité', sagesse: 'Sagesse', force: 'Terra', intel: 'Ignis', chance: 'Aqua', agi: 'Aer', pa: 'PA', pm: 'PM', po: 'Portée', init: 'Initiative', crit: 'Critique', dmg: 'Dommages',
    puissance: 'Puissance', invocation: 'Invocation', pp: 'Prospection', pods: 'Pods', soin: 'Soins', tacle: 'Tacle', fuite: 'Fuite',
    esquive_pa: 'Esquive PA', esquive_pm: 'Esquive PM', retrait_pa: 'Retrait PA', retrait_pm: 'Retrait PM',
    dmg_terre: 'Dommages Terra', dmg_feu: 'Dommages Ignis', dmg_eau: 'Dommages Aqua', dmg_air: 'Dommages Aer', dmg_crit: 'Dommages critiques', dmg_pou: 'Dommages de poussée',
    res_pct: '% Résistance (tous)', res_terre: '% Résistance Terra', res_feu: '% Résistance Ignis', res_eau: '% Résistance Aqua', res_air: '% Résistance Aer', res_neutre: '% Résistance neutre',
    res_fixe: 'Résistance fixe', res_crit: 'Résistance critique', res_pou: 'Résistance poussée' };
  const POIDS = { vita: 0.2, init: 0.1, pods: 0.25, force: 1, intel: 1, chance: 1, agi: 1, puissance: 2, res_fixe: 2, res_crit: 2, res_pou: 2,
    sagesse: 3, pp: 3, tacle: 4, fuite: 4, dmg_terre: 5, dmg_feu: 5, dmg_eau: 5, dmg_air: 5, dmg_crit: 5, dmg_pou: 5,
    res_pct: 6, res_terre: 6, res_feu: 6, res_eau: 6, res_air: 6, res_neutre: 6, esquive_pa: 7, esquive_pm: 7, retrait_pa: 7, retrait_pm: 7,
    crit: 10, soin: 10, dmg: 20, invocation: 30, po: 51, pm: 90, pa: 100 };
  const VITA_PER_POINT = 2;
  const vitaParPoint = () => VITA_PER_POINT;
  const budget = level => 6 + 1.1 * (level + 1);
  const COEF_SLOT = { anneau: 0.7, bouclier: 0.7 };
  const objetsK = () => (typeof DATA === 'object' && DATA.rules && DATA.rules.objetsK) || 1;
  const budgetPoids = (level, slot) => objetsK() * Math.max(2 * level + level * level / 100, 14 + 0.4 * level) * (COEF_SLOT[slot] || 1);
  function partsDe(profile) {
    const raw = {};
    for (const k in profile || {}) { const v = Number(profile[k]) || 0; if (v > 0) raw[k] = v * (k === 'vita' ? 0.25 : 1); }
    const tot = Object.values(raw).reduce((s, v) => s + v, 0) || 1;
    const out = {}; for (const k in raw) out[k] = raw[k] / tot;
    return out;
  }
  function statsFromParts(poids, parts) {
    const out = {};
    for (const k in parts) { const w = POIDS[k]; if (!w) continue; const v = Math.round(poids * parts[k] / w); if (v) out[k] = v; }
    return out;
  }
  const resteApres = (poids, extra) => { const e = Object.keys(extra || {}).reduce((s, k) => s + (POIDS[k] || 0) * (extra[k] || 0), 0); return e ? Math.max(0.25 * poids, poids - e) : poids; };
  const CONVEXE = { 2: [1], 3: [0.65, 1], 4: [0.4, 0.7, 1], 5: [0.14, 0.29, 0.61, 1], 6: [0.15, 0.24, 0.5, 0.6, 1], 7: [0.09, 0.18, 0.43, 0.6, 0.7, 1], 8: [0.1, 0.17, 0.36, 0.46, 0.59, 0.79, 1] };
  const partBonus = level => level <= 50 ? 0.54 : level <= 100 ? 0.36 : level <= 150 ? 0.25 : 0.22;

  const WEAPON_TYPES = {
    epee:     { label: 'Épée',     pa: 4, range: [1, 1], hits: 1, mult: 1.2, crit: 10 },
    dague:    { label: 'Dague',    pa: 3, range: [1, 1], hits: 2, mult: 0.45, crit: 15 },
    arc:      { label: 'Arc',      pa: 4, range: [2, 6], hits: 1, mult: 1.0, crit: 10 },
    baguette: { label: 'Baguette', pa: 3, range: [1, 5], hits: 1, mult: 0.85, crit: 10 },
    baton:    { label: 'Bâton',    pa: 3, range: [1, 2], hits: 1, mult: 0.95, crit: 10 },
    marteau:  { label: 'Marteau',  pa: 4, range: [1, 1], hits: 1, mult: 1.1, crit: 5, aoe: { shape: 'cross', size: 1 }, target: 'any' },
    pelle:    { label: 'Pelle',    pa: 4, range: [1, 1], hits: 1, mult: 1.0, crit: 5, lifesteal: 30 },
    hache:    { label: 'Hache',    pa: 5, range: [1, 1], hits: 1, mult: 1.45, crit: 5 },
    faux:     { label: 'Faux',     pa: 4, range: [1, 1], hits: 1, mult: 1.05, crit: 15 },
    lance:    { label: 'Lance',    pa: 4, range: [1, 1], hits: 1, mult: 1.0, crit: 10, aoe: { shape: 'line', size: 4 }, target: 'any' },
    pioche:   { label: 'Pioche',   pa: 4, range: [1, 1], hits: 1, mult: 1.0, crit: 5 },
  };
  const degatsParPA = level => 2.3 + 0.04 * level;
  const usagesParTour = pa => pa <= 2 ? 3 : pa === 3 ? 2 : 1;
  const FULL_SET_EXTRA = { dorm: { pa: 1 }, cendrou: { pa: 1 }, pioche_vive: { pm: 1 }, fumerolle: { pm: 1 }, grand_grouk: { pm: 1 }, brimbe: { pm: 1 },
    sivr: { pm: 1 }, saunier: { pa: 1 }, brisant: { pa: 1 }, harpide: { pm: 1 }, vulk: { pa: 1 }, ferrel: { pm: 1 }, zhaal: { pa: 1 }, mere_des_brisants: { pa: 1, pm: 1 }, fendu: { pa: 1 } };
  const EXTRA_COST = 0.6;

  const defs = new Map();
  const sets = new Map();
  let built = false;

  function statsFromProfile(points, profile, level) {
    const total = Object.values(profile || {}).reduce((s, v) => s + (Number(v) || 0), 0) || 1;
    const out = {};
    for (const k in profile) {
      if (!STATS.includes(k)) continue;
      const v = points * (Number(profile[k]) || 0) / total;
      const val = Math.round(k === 'vita' ? v * vitaParPoint(level || 1) : v);
      if (val) out[k] = val;
    }
    return out;
  }

  function weaponSpell(w) {
    const t = WEAPON_TYPES[w.type] || WEAPON_TYPES.epee;
    const base = degatsParPA(w.level) * t.pa * t.mult / t.hits;
    const dmin = w.degats ? w.degats[0] : Math.max(1, Math.round(base * 0.85)), dmax = w.degats ? w.degats[1] : Math.max(1, Math.round(base * 1.15));
    const effects = [];
    for (let i = 0; i < t.hits; i++) effects.push({ type: 'damage', min: dmin, max: dmax });
    return {
      id: 'arme', name: w.name, element: w.element, pa: t.pa, range: t.range.slice(), los: true, crit: t.crit, maxPerTurn: usagesParTour(t.pa),
      target: t.target || 'entity', aoe: t.aoe || { shape: 'single', size: 0 }, effects,
      lifesteal: t.lifesteal || 0, desc: `${t.label} de niveau ${w.level}, ${usagesParTour(t.pa) > 1 ? usagesParTour(t.pa) + ' fois' : 'une fois'} par tour.` + (t.aoe ? (t.aoe.shape === 'line' ? ' Frappe en ligne, alliés compris.' : ' Frappe en croix, alliés compris.') : '') + (t.lifesteal ? ' Rend une partie des dégâts en PV.' : ''),
    };
  }

  function build() {
    if (built) return;
    built = true;
    const C = DATA.content || {};
    for (const r of C.resources || []) {
      defs.set(r.id, { id: r.id, name: r.name, kind: 'resource', level: 1, lore: r.lore || '', price: r.price || 1, drops: r.drops || [], node: r.node || null, stats: {}, image: r.image || null });
    }
    for (const s of C.sets || []) {
      const pieces = [];
      for (const p of s.pieces || []) {
        const lvl = p.level || s.level;
        const extra = p.extra || null;
        const stats = statsFromParts(resteApres(budgetPoids(lvl, p.slot), extra), p.poids || partsDe(s.profile));
        if (extra) Object.assign(stats, extra);
        const def = { id: p.id, name: p.name, kind: 'equip', slot: p.slot, level: lvl, set: s.id, lore: p.lore || '', stats, source: 'craft', image: p.image || null };
        if (p.slot === 'arme') Object.assign(def, { kind: 'weapon', type: p.type, element: p.element, spell: weaponSpell({ name: p.name, type: p.type, level: lvl, element: p.element, degats: p.degats }) });
        defs.set(p.id, def);
        pieces.push(p.id);
      }
      const bonuses = {};
      const poidsPieces = pieces.reduce((t, id) => t + budgetPoids(defs.get(id).level, defs.get(id).slot), 0);
      const fr = CONVEXE[pieces.length] || [1];
      for (let k = 2; k <= pieces.length; k++) {
        if (s.bonus && s.bonus[k]) { bonuses[k] = Object.assign({}, s.bonus[k]); continue; }
        bonuses[k] = statsFromParts(poidsPieces * partBonus(s.level) * (fr[k - 2] || 1), partsDe(s.bonusProfile || s.profile));
        if (k === pieces.length && (FULL_SET_EXTRA[s.id] || s.bonusExtra)) Object.assign(bonuses[k], FULL_SET_EXTRA[s.id] || s.bonusExtra);
      }
      sets.set(s.id, { id: s.id, name: s.name, level: s.level, family: s.family || [], pieces, bonuses, lore: s.lore || '' });
    }
    for (const i of C.items || []) {
      const stats = statsFromParts(resteApres(budgetPoids(i.level, i.slot) * 0.9, i.extra), i.poids || partsDe(i.profile));
      if (i.extra) Object.assign(stats, i.extra);
      defs.set(i.id, { id: i.id, name: i.name, kind: 'equip', slot: i.slot, level: i.level, set: null, lore: i.lore || '', stats, source: i.source || 'craft', from: i.from || null, image: i.image || null });
    }
    for (const w of C.weapons || []) {
      const wstats = statsFromParts(resteApres(budgetPoids(w.level, 'arme') * 0.9, w.extra), w.poids || partsDe(w.profile));
      if (w.extra) Object.assign(wstats, w.extra);
      defs.set(w.id, { id: w.id, name: w.name, kind: 'weapon', slot: 'arme', type: w.type, element: w.element, level: w.level, set: null, lore: w.lore || '', stats: wstats, source: w.source || 'craft', from: w.from || null, spell: weaponSpell(w), image: w.image || null });
    }
    for (const c of C.consumables || []) {
      defs.set(c.id, { id: c.id, name: c.name, kind: 'consumable', sub: c.kind, level: c.level, heal: c.heal || 0, price: c.price || 5, lore: c.lore || '', stats: {}, stat: c.stat || null, value: c.value || 0, cosmetique: c.cosmetique || null, familier: c.familier || null, monture: c.monture || null, drops: c.drops || [], rarity: c.rarity || null });
    }
    for (const k of DATA.knots || []) {
      defs.set(k.id, { id: k.id, name: k.name, kind: 'knot', level: k.level, lore: k.desc, price: Math.round(20 + (k.level + 1) * 3), stats: {} });
    }
    for (const d of defs.values()) {
      if (d.kind === 'equip' || d.kind === 'weapon') d.price = Math.round(budget(d.level) * 4 + (d.level + 1) * 1.5);
    }
  }

  const get = id => { build(); return defs.get(id) || null; };
  const all = () => { build(); return [...defs.values()]; };
  const setOf = id => { build(); const d = defs.get(id); return d && d.set ? sets.get(d.set) : null; };
  const getSet = id => { build(); return sets.get(id) || null; };
  const allSets = () => { build(); return [...sets.values()]; };
  const recipes = () => (DATA.content && DATA.content.recipes) || [];
  const recipeFor = id => recipes().find(r => r.result === id) || null;
  const sellPrice = def => def.kind === 'resource' ? def.price : Math.max(1, Math.round((def.price || 1) * 0.3));

  const RARITIES = ['commun', 'peu-commun', 'rare', 'epique', 'legendaire'];
  const RARITY_LABEL = { commun: 'Commun', 'peu-commun': 'Peu commun', rare: 'Rare', epique: 'Épique', legendaire: 'Légendaire' };
  const isBoss = id => !!(DATA.monsters[id] && DATA.monsters[id].boss);
  function rarity(d) {
    if (typeof d === 'string') d = get(d);
    if (!d) return 'commun';
    if (d.rarity && RARITIES.includes(d.rarity)) return d.rarity;
    if (d.kind === 'knot') return 'epique';
    if (d.kind === 'resource') {
      const fromDungeon = (DATA.content.dungeons || []).some(dg => ((dg.rewards || {}).items || []).some(it => it.id === d.id));
      if (fromDungeon || d.drops.some(x => isBoss(x.monster))) return 'rare';
      if (d.drops.length && !d.node && d.drops.every(x => (x.rate || 0) < 10)) return 'peu-commun';
      return 'commun';
    }
    if (d.kind === 'equip' && d.set) { const s = sets.get(d.set); return s && s.family.some(isBoss) ? 'epique' : 'peu-commun'; }
    if (d.source === 'drop') return 'rare';
    return 'commun';
  }

  function poids(d) {
    if (typeof d === 'string') d = get(d);
    if (!d) return 0;
    if (Number.isFinite(d.pods)) return Math.max(0, d.pods);
    const n = Math.floor((d.level || 1) / 5);
    if (d.kind === 'weapon') return 10 + n;
    if (d.kind === 'equip') return 5 + n;
    if (d.kind === 'knot') return 2;
    return 1;
  }

  function tauxEquipement(level) {
    const t = typeof DATA === 'object' && DATA.rules && DATA.rules.butin && DATA.rules.butin.equipement;
    return t ? DATA.courbe(t, level || 1) : 2;
  }
  function multProspection(pp, ecart) {
    const B = (typeof DATA === 'object' && DATA.rules && DATA.rules.butin) || {};
    if (B.ecartMax && Math.abs(ecart || 0) >= B.ecartMax) return 1;
    const m = 0.74 + 1.755 / (1 + Math.exp((250 - (pp || 100)) / 85));
    return Math.max(1, Math.min(B.ppMax || 2.5, m));
  }

  function statLines(stats) {
    const order = ['pa', 'pm', 'po', 'vita', 'sagesse', 'force', 'intel', 'chance', 'agi', 'puissance', 'invocation', 'init', 'pp', 'crit', 'dmg', 'dmg_terre', 'dmg_feu', 'dmg_eau', 'dmg_air', 'dmg_crit', 'dmg_pou', 'soin',
      'tacle', 'fuite', 'esquive_pa', 'esquive_pm', 'retrait_pa', 'retrait_pm', 'res_pct', 'res_terre', 'res_feu', 'res_eau', 'res_air', 'res_neutre', 'res_fixe', 'res_crit', 'res_pou', 'pods'];
    return order.filter(k => stats[k]).map(k => `${stats[k] > 0 ? '+' : ''}${stats[k]} ${STAT_LABEL[k]}`);
  }

  function dropsOf(monsterId) {
    build();
    const rare = typeof DATA === 'object' && DATA.monsters && DATA.monsters[monsterId];
    if (rare && rare.rare && rare.base) return dropsOf(rare.base).map(d => Object.assign({}, d, { rate: Math.min(100, d.rate * 2) }));
    const out = [];
    for (const s of sets.values()) if (s.family.includes(monsterId)) for (const id of s.pieces) out.push({ id, rate: tauxEquipement(defs.get(id).level), fixe: true, set: s.id });
    for (const d of defs.values()) if ((d.kind === 'weapon' || d.kind === 'equip') && d.from === monsterId) out.push({ id: d.id, rate: tauxEquipement(d.level), fixe: true, set: d.set || d.id });
    for (const d of defs.values()) if (d.kind === 'resource' || d.kind === 'consumable') for (const dr of d.drops || []) if (dr.monster === monsterId) out.push({ id: d.id, rate: dr.rate });
    return out;
  }

  return { SLOTS, EQUIP_SLOTS, STATS, STAT_LABEL, POIDS, WEAPON_TYPES, RARITIES, RARITY_LABEL, budget, budgetPoids, partsDe, statsFromParts, degatsParPA, usagesParTour, statsFromProfile, weaponSpell, build, get, all, setOf, getSet, allSets, recipes, recipeFor, sellPrice, statLines, dropsOf, rarity, poids, tauxEquipement, multProspection };
})();
