const Chantier = (() => {
  let actif = false;
  function demande() {
    try { return typeof location === 'object' && /[?&]chantier=1\b/.test(location.search) && typeof Util === 'object' && Util.dev(); } catch (e) { return false; }
  }

  function appliquer(O) {
    const C = DATA.content;
    actif = true;
    const N = typeof CHANTIER_NOMS === 'object' && CHANTIER_NOMS ? CHANTIER_NOMS : {};
    const nommer = x => { const n = x && N[x.id]; if (n) { if (n.name) x.name = n.name; if (n.lore) x.lore = n.lore; } return x; };
    for (const liste of [O.ressources, O.intermediaires, O.objets, O.armes]) for (const x of liste || []) nommer(x);
    for (const p of O.panoplies || []) { nommer(p); for (const x of p.pieces || []) nommer(x); }
    for (const r of O.ressources) C.resources.push({ id: r.id, name: r.name, lore: r.lore || '', drops: r.drops || [], node: r.node || null, price: r.price || 1, niveau: r.niveau || 1 });
    for (const r of O.intermediaires) C.resources.push({ id: r.id, name: r.name, lore: r.lore || '', drops: [], node: null, price: r.price || 1, niveau: r.niveau || 1 });
    for (const p of O.panoplies) {
      C.sets.push({ id: p.id, name: p.name, family: p.famille || [], level: p.niveau, lore: p.lore || '', profile: { vita: 1 }, bonus: p.bonus,
        pieces: p.pieces.map(x => Object.assign({ slot: x.slot, id: x.id, name: x.name, lore: x.lore || '', level: x.niveau, poids: x.poids, extra: Object.keys(x.extra || {}).length ? x.extra : null },
          x.slot === 'arme' ? { type: x.type, element: x.element, degats: x.degats } : {})) });
    }
    for (const o of O.objets) C.items.push({ id: o.id, name: o.name, slot: o.slot, level: o.niveau, poids: o.poids, extra: Object.keys(o.extra || {}).length ? o.extra : null, source: o.source, from: o.from || null, lore: o.lore || '' });
    for (const a of O.armes) C.weapons.push({ id: a.id, name: a.name, type: a.type, level: a.niveau, element: a.element, poids: a.poids, extra: Object.keys(a.extra || {}).length ? a.extra : null, degats: a.degats, source: a.source, from: a.from || null, lore: a.lore || '' });
    for (const c of O.consommables) C.consumables.push(Object.assign({}, c, { name: c.name, kind: c.kind, level: c.level, price: c.price || Math.max(5, (c.level || 1) * 2), lore: c.lore || '' }));
    veyliths = (O.petitsVeyliths || []).filter(v => !C.items.some(i => i.slot === 'veylith' && i.quete === v.quete));
    for (const v of veyliths) C.items.push({ id: v.id, name: v.name, slot: 'veylith', level: v.niveau, stats: v.stats || {}, passif: v.passif || null, effet: v.effet || '',
      lie: true, marque: true, quete: v.quete, source: 'quete', rarity: 'epique', lore: v.lore || '' });
    for (const r of O.recettes) C.recipes.push({ result: r.result, count: r.count || 1, workshop: r.workshop, niveau: r.niveau, ingredients: r.ingredients });
    C.familiers = C.familiers || [];
    for (const f of O.familiers) {
      C.familiers.push({ id: f.id, nom: f.nom, famille: f.famille, region: f.region, bonus: f.bonus, couleur: '#9aa6b2', glyphe: 'F', oeuf: f.oeuf, echange: f.echange, description: f.description || '' });
      const drops = f.famille.map(m => ({ monster: m, rate: f.oeuf.taux }));
      C.consumables.push({ id: f.oeuf.id, name: f.oeuf.nom, kind: 'oeuf', level: 1, price: 40, rarity: 'rare', familier: f.id, drops, lore: '' });
    }
    noeuds = O.noeuds || null;
    ajouts = O.ajouts || null;
    appliquerNoeuds();
  }
  let noeuds = null, ajouts = null, veyliths = [];
  function appliquerNoeuds() {
    if (!actif || typeof DATA !== 'object') return;
    for (const v of veyliths) {
      const q = (DATA.content.quests || []).find(x => x.id === v.quete);
      if (!q) continue;
      q.rewards = q.rewards || {}; q.rewards.items = q.rewards.items || [];
      if (!q.rewards.items.some(it => it.id === v.id)) q.rewards.items.push({ id: v.id, count: 1 });
    }
    if (!noeuds) return;
    for (const z of DATA.content.zones) for (const m of z.maps) {
      const o = noeuds[m.id];
      if (o && m.nodes) for (const i in o) { const n = m.nodes[i]; if (typeof n === 'string') m.nodes[i] = o[i]; else if (n) n.resource = o[i]; }
      const a = ajouts && ajouts[m.id];
      if (a && m.nodes) for (const p of a) if (!m.nodes.some(n => n && n.chantier && n.u === p.u && n.v === p.v)) m.nodes.push({ resource: p.resource, u: p.u, v: p.v, chantier: true });
    }
  }

  function pierresPleines() {
    if (!actif || typeof DATA !== 'object') return [];
    return Object.entries(DATA.monsters).filter(([, m]) => !m.summon && (m.boss || (m.rare && m.base)) && m.ai).map(([id, m]) => {
      const r = String(m.level || '').match(/(\d+)\D+(\d+)/), haut = r ? Number(r[2]) : Number(m.level) || 1;
      return { id: 'pierre_pleine_' + id, name: `[pierre pleine] ${m.name}`, kind: 'pierre_pleine', level: 1, monstre: id, niveauCombat: haut, price: 20 + haut * 3, rarity: m.boss ? 'epique' : 'rare', lore: '' };
    });
  }

  if (demande() && typeof document === 'object' && document.readyState === 'loading') document.write('<script src="content/chantier/noms-1-60.js"><\/script><script src="content/chantier/objets-1-60.js"><\/script>');
  return { demande, appliquer, appliquerNoeuds, pierresPleines, actif: () => actif };
})();
