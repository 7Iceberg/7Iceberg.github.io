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

  const TAILLES_DEFAUT = { 1: 30, 2: 40, 3: 25, 4: 5 };
  const SANS_FAUNE = typeof location === 'object' && !!location && /[?&]faune=0(&|$)/.test(location.search || '');
  function sousZone(zone, carte) {
    if (!zone || !Array.isArray(zone.sousZones) || !carte || !carte.sousZone) return null;
    return zone.sousZones.find(s => s.nom === carte.sousZone) || null;
  }
  function faune(zone, carte) {
    const sz = sousZone(zone, carte);
    const f = !SANS_FAUNE && ((sz && sz.faune) || (zone && zone.faune));
    if (!f || !f.monstres) return null;
    const monstres = {};
    for (const [id, p] of Object.entries(f.monstres)) {
      const k = (carte && carte.penche && carte.penche[id]) || 1;
      if (p * k > 0) monstres[id] = p * k;
    }
    return Object.keys(monstres).length ? { monstres, tailles: f.tailles || TAILLES_DEFAUT } : null;
  }
  function tirerFaune(tpl, f, rng) {
    if (!f || fixe(tpl)) return tpl.monsters.slice();
    let tailles = f.tailles;
    if (Array.isArray(tpl.taille)) {
      const [a, b] = tpl.taille, t = {};
      for (const [n, p] of Object.entries(tailles)) if (+n >= a && +n <= b) t[n] = p;
      tailles = Object.keys(t).length ? t : { [a]: 1 };
    }
    const n = Number(pioche(tailles, rng));
    let monstres = f.monstres;
    if (Array.isArray(tpl.level)) {
      const [a, b] = tpl.level, m = {};
      for (const [id, p] of Object.entries(f.monstres)) { const [lo, hi] = tranche_(id); if (lo <= b && hi >= a) m[id] = p; }
      if (Object.keys(m).length) monstres = m;
    }
    const out = [];
    for (let i = 0; i < n; i++) out.push(pioche(monstres, rng));
    return out;
  }
  function tranche_(id) {
    const d = def(id);
    if (d && typeof Entity === 'function' && Entity.levelRange) return Entity.levelRange(d);
    const m = d && /(\d+)\D+(\d+)/.exec(String(d.level || ''));
    return m ? [+m[1], +m[2]] : [1, 999];
  }

  return { TAILLES, RESPAWN_RARE, TAILLES_DEFAUT, fixe, reserve, tirer, tranche, faune, tirerFaune, sousZone };
})();
