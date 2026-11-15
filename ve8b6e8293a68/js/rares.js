const Rares = (() => {
  const CHANCE = 40, DELAI = 2 * 3600 * 1000, JEU = 15 * 60 * 1000;
  const REGIONS = new Set(['orsane', 'kaldum']);
  const idDe = id => id + '_argent';

  function bases() {
    const G = typeof Groupes === 'object' ? Groupes : null, b = new Set();
    for (const z of DATA.content.zones) if (REGIONS.has(z.region)) for (const m of z.maps || []) for (const t of m.groups || []) {
      if (G && G.fixe(t)) continue;
      const f = G && G.faune ? G.faune(z, m) : null;
      for (const id of f ? Object.keys(f.monstres) : t.monsters || []) b.add(id);
    }
    return b;
  }

  function preparer() {
    preparer.retirees = [];
    if (typeof DATA !== 'object' || !DATA.monsters || !DATA.content || !DATA.content.zones) return [];
    const M = DATA.monsters, B = bases(), faits = [];
    for (const [rid, d] of Object.entries(M)) if (d && d.argent && !B.has(d.base)) { delete M[rid]; preparer.retirees.push(rid); }
    for (const id of B) {
      const d = M[id], rid = idDe(id);
      if (!d || d.boss || d.elite || d.rare || d.summon || M[rid]) continue;
      M[rid] = Object.assign({}, d, {
        id: rid, name: d.name + ' d\'argent', rare: true, argent: true, base: id,
        hp: Math.round(d.hp * 1.6), dmgMult: Math.round((d.dmgMult || 1) * 1.15 * 100) / 100, color: '#cfd6e2',
        desc: `Rare. ${d.desc || ''}`.trim(),
      });
      faits.push(rid);
    }
    return faits;
  }

  const auRepos = (ch, rid, maintenant) => !!(ch && ch.rares && ch.rares[rid] > maintenant);

  function placer(ids, ch, maintenant, rng) {
    const out = ids.slice(), M = DATA.monsters;
    const ordre = out.map((_, i) => i).sort(() => rng() - 0.5);
    for (const i of ordre) {
      const rid = idDe(out[i]);
      if (!M[rid] || auRepos(ch, rid, maintenant)) continue;
      if (rng() * CHANCE < 1) { out[i] = rid; return out; }
    }
    return out;
  }

  function vaincue(ch, rid, maintenant, rng) {
    if (!ch || !DATA.monsters[rid] || !DATA.monsters[rid].rare || !DATA.monsters[rid].base) return;
    ch.rares = ch.rares || {};
    ch.rares[rid] = maintenant + DELAI + Math.round((rng() * 2 - 1) * JEU);
  }

  function nettoyer(o, maintenant) {
    if (!o || typeof o !== 'object' || Array.isArray(o)) return null;
    const r = {};
    let n = 0;
    for (const [k, v] of Object.entries(o)) {
      if (n >= 200 || typeof k !== 'string' || k.length > 60 || !Number.isFinite(v)) continue;
      if (v > maintenant) { r[k] = Math.min(v, maintenant + DELAI + JEU); n++; }
    }
    return r;
  }

  return { CHANCE, DELAI, JEU, idDe, bases, preparer, placer, vaincue, nettoyer, auRepos };
})();
Rares.preparer();
