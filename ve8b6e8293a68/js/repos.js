const Repos = (() => {
  const REGLES = { max: 60, parHeure: 12, parCombat: 20 };
  const R = () => Object.assign({}, REGLES, (typeof DATA === 'object' && DATA.rules && DATA.rules.repos) || {});
  const HEURE = 3600 * 1000;
  const ZONES_MAX = 200;

  const etat = (ch, maintenant) => {
    if (!ch.repos || typeof ch.repos !== 'object') ch.repos = { t0: maintenant, z: {} };
    return ch.repos;
  };

  function valeur(ch, zone, maintenant) {
    if (!ch || !zone) return 0;
    const r = R(), e = etat(ch, maintenant), z = e.z[zone] || [0, e.t0];
    return Math.max(0, Math.min(r.max, Math.floor(z[0] + Math.max(0, maintenant - z[1]) / HEURE * r.parHeure)));
  }

  function consommer(ch, zone, maintenant) {
    if (!ch || !zone) return 0;
    const v = valeur(ch, zone, maintenant), e = etat(ch, maintenant);
    e.z[zone] = [Math.max(0, v - R().parCombat), maintenant];
    return v;
  }

  function nettoyer(o, maintenant) {
    if (!o || typeof o !== 'object' || Array.isArray(o)) return null;
    const t0 = Number.isFinite(o.t0) ? Math.min(o.t0, maintenant) : maintenant, z = {};
    let n = 0;
    if (o.z && typeof o.z === 'object' && !Array.isArray(o.z)) for (const [k, v] of Object.entries(o.z)) {
      if (n >= ZONES_MAX || typeof k !== 'string' || k.length > 60 || !Array.isArray(v) || v.length !== 2) continue;
      const [val, at] = v;
      if (!Number.isFinite(val) || !Number.isFinite(at)) continue;
      z[k] = [Math.max(0, Math.min(R().max, val)), Math.min(at, maintenant)];
      n++;
    }
    return { t0, z };
  }

  return { REGLES, valeur, consommer, nettoyer };
})();
