const Agression = (() => {
  const FAMILLES = new Set(['kaldrik', 'kaldrik_trempe', 'pilou_defait']);
  const VILLES = new Set(['orsane_cimes', 'kaldum_ville']);
  const VUE = 3, ALERTE = 3, LACHE = 5, ECART = 10;

  function hostile(g) {
    if (!g || !g.monsters || (g.tpl && g.tpl.dojo)) return false;
    return g.monsters.some(m => {
      const d = typeof DATA === 'object' && DATA.monsters ? DATA.monsters[m.id] : null;
      return !!(d && !d.boss && (d.elite || d.hostile || FAMILLES.has(m.id)));
    });
  }

  return { FAMILLES, VILLES, VUE, ALERTE, LACHE, ECART, hostile };
})();
