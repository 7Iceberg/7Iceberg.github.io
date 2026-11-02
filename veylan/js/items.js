// Objets : stats calculées depuis le niveau et le profil, panoplies et bonus, armes, consommables,
// ressources. Les données viennent de DATA.content (voir docs/SPEC-CONTENU.md).
const Items = (() => {
  const SLOTS = ['coiffe', 'cape', 'amulette', 'anneau', 'ceinture', 'bottes'];
  const EQUIP_SLOTS = ['coiffe', 'cape', 'amulette', 'anneau1', 'anneau2', 'ceinture', 'bottes', 'arme'];
  const STATS = ['vita', 'sagesse', 'force', 'intel', 'chance', 'agi'];
  const STAT_LABEL = { vita: 'Vitalité', sagesse: 'Sagesse', force: 'Terra', intel: 'Ignis', chance: 'Aqua', agi: 'Aer', pa: 'PA', pm: 'PM', init: 'Initiative', crit: 'Critique', dmg: 'Dommages' };
  // Vitalité d'un point d'objet : 2 PV (les points de caractéristiques du personnage en donnent
  // toujours 3, js/character.js), pour que la vitalité des panoplies n'écrase pas les PV de classe.
  const VITA_PER_POINT = 2;
  // Points de caractéristiques d'une pièce de niveau N. Une panoplie complète de niveau N vaut à
  // peu près une panoplie de Dofus au niveau 2N.
  const budget = level => 6 + 2.2 * level;

  // Types d'armes : coût, portée, nombre de coups, puissance relative, particularités.
  const WEAPON_TYPES = {
    epee:     { label: 'Épée',     pa: 4, range: [1, 1], hits: 1, mult: 1.2 },
    dague:    { label: 'Dague',    pa: 3, range: [1, 1], hits: 2, mult: 0.45 },
    arc:      { label: 'Arc',      pa: 4, range: [2, 6], hits: 1, mult: 1.0 },
    baguette: { label: 'Baguette', pa: 3, range: [1, 5], hits: 1, mult: 0.85 },
    baton:    { label: 'Bâton',    pa: 3, range: [1, 2], hits: 1, mult: 0.95 },
    marteau:  { label: 'Marteau',  pa: 4, range: [1, 1], hits: 1, mult: 1.1, aoe: { shape: 'cross', size: 1 }, target: 'any' },
    pelle:    { label: 'Pelle',    pa: 4, range: [1, 1], hits: 1, mult: 1.0, lifesteal: 30 },
    hache:    { label: 'Hache',    pa: 5, range: [1, 1], hits: 1, mult: 1.45 },
  };
  // Panoplies dont le bonus complet donne un PA ou un PM.
  const FULL_SET_EXTRA = { dorm: { pa: 1 }, cendrou: { pa: 1 }, pioche_vive: { pm: 1 }, fumerolle: { pm: 1 }, grand_grouk: { pm: 1 }, brimbe: { pm: 1 },
    // Thessa et la Lisière (31 à 50), à mesurer au bot quand ces régions ouvriront.
    sivr: { pm: 1 }, brisant: { pa: 1 }, harpide: { pm: 1 }, vulk: { pa: 1 }, ferrel: { pm: 1 }, zhaal: { pa: 1 }, mere_des_brisants: { pa: 1, pm: 1 }, fendu: { pa: 1 } };
  // Objet hors panoplie qui donne un PA ou un PM (`extra`) : ses caractéristiques ne valent plus que
  // ce rapport du budget. On le porte pour le point, pas pour le reste.
  const EXTRA_COST = 0.6;

  const defs = new Map();
  const sets = new Map();
  let built = false;

  // Répartit `points` selon un profil de poids ; la vitalité vaut deux fois plus de points.
  function statsFromProfile(points, profile) {
    const total = Object.values(profile || {}).reduce((s, v) => s + (Number(v) || 0), 0) || 1;
    const out = {};
    for (const k in profile) {
      if (!STATS.includes(k)) continue;
      const v = points * (Number(profile[k]) || 0) / total;
      const val = Math.round(k === 'vita' ? v * VITA_PER_POINT : v);
      if (val) out[k] = val;
    }
    return out;
  }

  function weaponSpell(w) {
    const t = WEAPON_TYPES[w.type] || WEAPON_TYPES.epee;
    // Le sort d'arme est déjà multiplié par l'échelle du porteur (+3 % par niveau) : on la retire
    // ici pour ne pas compter le niveau deux fois.
    const base = (4 + 0.9 * w.level) / (1 + 0.03 * (w.level - 1)) * t.mult;
    const effects = [];
    for (let i = 0; i < t.hits; i++) effects.push({ type: 'damage', min: Math.max(1, Math.round(base * 0.85)), max: Math.max(1, Math.round(base * 1.15)) });
    return {
      id: 'arme', name: w.name, element: w.element, pa: t.pa, range: t.range.slice(), los: true,
      target: t.target || 'entity', aoe: t.aoe || { shape: 'single', size: 0 }, effects,
      lifesteal: t.lifesteal || 0, desc: `${t.label} de niveau ${w.level}.` + (t.aoe ? ' Frappe en croix, alliés compris.' : '') + (t.lifesteal ? ' Rend une partie des dégâts en PV.' : ''),
    };
  }

  function build() {
    if (built) return;
    built = true;
    const C = DATA.content || {};
    for (const r of C.resources || []) {
      defs.set(r.id, { id: r.id, name: r.name, kind: 'resource', level: 1, lore: r.lore || '', price: r.price || 1, drops: r.drops || [], node: r.node || null, stats: {} });
    }
    for (const s of C.sets || []) {
      const pieces = [];
      for (const p of s.pieces || []) {
        const def = { id: p.id, name: p.name, kind: 'equip', slot: p.slot, level: s.level, set: s.id, lore: p.lore || '', stats: statsFromProfile(budget(s.level), s.profile), source: 'craft' };
        defs.set(p.id, def);
        pieces.push(p.id);
      }
      const bonuses = {};
      for (let k = 2; k <= pieces.length; k++) {
        bonuses[k] = statsFromProfile(budget(s.level) * (k - 1) * 0.25, s.bonusProfile || s.profile);
        if (k === pieces.length && FULL_SET_EXTRA[s.id]) Object.assign(bonuses[k], FULL_SET_EXTRA[s.id]);
      }
      sets.set(s.id, { id: s.id, name: s.name, level: s.level, family: s.family || [], pieces, bonuses, lore: s.lore || '' });
    }
    for (const i of C.items || []) {
      const stats = statsFromProfile(budget(i.level) * 0.9 * (i.extra ? EXTRA_COST : 1), i.profile);
      if (i.extra) Object.assign(stats, i.extra);
      defs.set(i.id, { id: i.id, name: i.name, kind: 'equip', slot: i.slot, level: i.level, set: null, lore: i.lore || '', stats, source: i.source || 'craft', from: i.from || null });
    }
    for (const w of C.weapons || []) {
      defs.set(w.id, { id: w.id, name: w.name, kind: 'weapon', slot: 'arme', type: w.type, element: w.element, level: w.level, set: null, lore: w.lore || '', stats: statsFromProfile(budget(w.level) * 0.7, w.profile), source: w.source || 'craft', from: w.from || null, spell: weaponSpell(w) });
    }
    for (const c of C.consumables || []) {
      defs.set(c.id, { id: c.id, name: c.name, kind: 'consumable', sub: c.kind, level: c.level, heal: c.heal || 0, price: c.price || 5, lore: c.lore || '', stats: {}, stat: c.stat || null, value: c.value || 0 });
    }
    for (const k of DATA.knots || []) {
      defs.set(k.id, { id: k.id, name: k.name, kind: 'knot', level: k.level, lore: k.desc, price: 20 + k.level * 6, stats: {} });
    }
    // Prix d'achat des équipements et armes, dérivé du niveau.
    for (const d of defs.values()) {
      if (d.kind === 'equip' || d.kind === 'weapon') d.price = Math.round(budget(d.level) * 4 + d.level * 3);
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

  // Décrit les stats d'un objet pour l'interface, dans un ordre stable.
  // Rareté affichée dans le sac (code couleur de la charte, docs/DIRECTION-ARTISTIQUE.md).
  // Déduite de la provenance, sauf si la donnée la fixe avec `rarity` :
  // ressource de boss ou de fin de donjon : rare ; ressource qui ne tombe qu'à moins de 10 % :
  // peu commune ; pièce de panoplie : peu commune, épique pour une panoplie de boss ; objet tombé
  // d'un monstre : rare ; Nœud : épique. Légendaire reste libre pour les pièces de saga.
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

  // Les pods d'un objet (son poids, comme Dofus ; les Fils ne pèsent rien) : une ressource ou un
  // consommable 1, un Nœud 2, une pièce d'équipement 5 plus 1 tous les 5 niveaux, une arme 10 plus 1
  // tous les 5 niveaux. Un `pods` dans la donnée l'emporte.
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

  function statLines(stats) {
    const order = ['pa', 'pm', 'vita', 'sagesse', 'force', 'intel', 'chance', 'agi', 'init', 'crit', 'dmg'];
    return order.filter(k => stats[k]).map(k => `${stats[k] > 0 ? '+' : ''}${stats[k]} ${STAT_LABEL[k]}`);
  }

  // Équipements qu'une famille de monstres peut faire tomber (pièces de sa panoplie, armes « from »).
  function dropsOf(monsterId) {
    build();
    const out = [];
    for (const s of sets.values()) if (s.family.includes(monsterId)) for (const id of s.pieces) out.push({ id, rate: 2.5 });
    for (const d of defs.values()) if ((d.kind === 'weapon' || d.kind === 'equip') && d.from === monsterId) out.push({ id: d.id, rate: 2 });
    for (const d of defs.values()) if (d.kind === 'resource') for (const dr of d.drops) if (dr.monster === monsterId) out.push({ id: d.id, rate: dr.rate });
    return out;
  }

  return { SLOTS, EQUIP_SLOTS, STATS, STAT_LABEL, WEAPON_TYPES, RARITIES, RARITY_LABEL, budget, statsFromProfile, weaponSpell, build, get, all, setOf, getSet, allSets, recipes, recipeFor, sellPrice, statLines, dropsOf, rarity, poids };
})();
