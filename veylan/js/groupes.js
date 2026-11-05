const Groupes = (() => {
  const TAILLES = [[1, 2], [2, 3], [3, 4]];
  const RESPAWN_RARE = 300;

  const def = id => (typeof DATA === 'object' && DATA.monsters ? DATA.monsters[id] : null);
  const special = id => { const d = def(id); return !d || !!(d.boss || d.elite || d.rare || d.summon || d.fixed); };

  function fixe(tpl) {
    if (!tpl || !Array.isArray(tpl.monsters) || !tpl.monsters.length) return true;
    if (tpl.dojo || tpl.fixe || tpl.levels || (tpl.respawn || 0) >= RESPAWN_RARE) return true;
    return tpl.monsters.some(special);
  }

  function reserve(cartes) {
    const r = {};
    let n = 0;
    for (const c of [].concat(cartes || [])) for (const tpl of (c && c.groups) || []) {
      if (fixe(tpl)) continue;
      for (const id of tpl.monsters) { r[id] = (r[id] || 0) + 1; n++; }
    }
    return n ? r : null;
  }

  function pioche(r, rng) {
    let total = 0;
    for (const k in r) total += r[k];
    let x = rng() * total;
    for (const k in r) { x -= r[k]; if (x < 0) return k; }
    return Object.keys(r)[0];
  }

  const tranche = n => (n <= TAILLES.length ? TAILLES[n - 1] : [n, n]);

  function tirer(tpl, r, rng) {
    if (fixe(tpl) || !r) return tpl.monsters.slice();
    const [a, b] = tranche(tpl.monsters.length);
    const taille = Math.max(tpl.monsters.length, a + Math.floor(rng() * (b - a + 1)));
    const out = tpl.monsters.slice();
    while (out.length < taille) out.push(pioche(r, rng));
    return out;
  }

  return { TAILLES, RESPAWN_RARE, fixe, reserve, tirer, tranche };
})();
