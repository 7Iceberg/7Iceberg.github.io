const Chantier = (() => {
  let actif = false;
  function demande() {
    try { return typeof location === 'object' && /[?&]chantier=1\b/.test(location.search); } catch (e) { return false; }
  }

  function appliquer(O) {
    const C = DATA.content;
    actif = true;
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
    for (const r of O.recettes) C.recipes.push({ result: r.result, count: r.count || 1, workshop: r.workshop, niveau: r.niveau, ingredients: r.ingredients });
    C.familiers = C.familiers || [];
    for (const f of O.familiers) {
      C.familiers.push({ id: f.id, nom: f.nom, famille: f.famille, region: f.region, bonus: f.bonus, couleur: '#9aa6b2', glyphe: 'F', oeuf: f.oeuf, echange: f.echange, description: f.description || '' });
      const drops = f.famille.map(m => ({ monster: m, rate: f.oeuf.taux }));
      C.consumables.push({ id: f.oeuf.id, name: f.oeuf.nom, kind: 'oeuf', level: 1, price: 40, rarity: 'rare', familier: f.id, drops, lore: '' });
    }
    for (const z of C.zones) for (const m of z.maps) {
      const o = O.noeuds && O.noeuds[m.id];
      if (!o || !m.nodes) continue;
      for (const i in o) { const n = m.nodes[i]; if (typeof n === 'string') m.nodes[i] = o[i]; else if (n) n.resource = o[i]; }
    }
  }

  if (demande() && typeof document === 'object' && document.readyState === 'loading') document.write('<script src="content/chantier/objets-1-60.js"><\/script>');
  return { demande, appliquer, actif: () => actif };
})();
