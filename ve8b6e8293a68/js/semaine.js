const Semaine = (() => {
  const OBJECTIF = 5;
  const SCEAUX = 2;
  const XP = 24;

  const numero = date => {
    const j = typeof Veille === 'object' ? Veille.jour(date) : null;
    return j == null ? null : Math.floor(j / 7);
  };
  const tirage = (n, k) => { let x = Math.imul(n + 7919, 2654435761) >>> 0; x ^= x >>> 15; x = Math.imul(x, 2246822519) >>> 0; x ^= x >>> 13; return (x >>> 0) % k; };
  const choix = (n, k) => { let prev = -1, c = 0; for (let w = Math.min(0, n); w <= n; w++) { c = tirage(w, k); if (k > 1 && c === prev) c = (c + 1) % k; prev = c; } return c; };
  const candidats = level => (DATA.knots || []).filter(k => k.level <= level);
  const knot = id => (DATA.knots || []).find(k => k.id === id) || null;

  function etat(ch, date) {
    if (!ch) return null;
    const n = numero(date);
    if (n == null) return null;
    let s = ch.semaine;
    if (!s || typeof s !== 'object' || s.n !== n || !knot(s.noeud)) {
      const c = candidats(ch.level || 1);
      if (!c.length) return null;
      s = ch.semaine = { n, noeud: c[choix(n, c.length)].id, victoires: 0, prime: false };
    }
    return s;
  }

  const noeud = (ch, date) => { const s = etat(ch, date); return s ? knot(s.noeud) : null; };

  function bonus(ch, noeuds) {
    const s = etat(ch);
    return s && Array.isArray(noeuds) && noeuds.includes(s.noeud) ? (DATA.rules.knotBonus || 0) : 0;
  }

  const xp = level => Math.round(XP * Math.pow(Math.max(1, level) / 2, 1.6));
  const fils = level => 30 + 4 * Math.max(1, level);

  function victoire(ch, noeuds) {
    const s = etat(ch);
    if (!s || s.prime || !Array.isArray(noeuds) || !noeuds.includes(s.noeud)) return null;
    s.victoires = Math.min(OBJECTIF, (s.victoires || 0) + 1);
    if (s.victoires < OBJECTIF) return { victoires: s.victoires, prime: null };
    s.prime = true;
    const F = ch.counters.feats || (ch.counters.feats = {});
    F.semaines = (F.semaines || 0) + 1;
    return { victoires: s.victoires, prime: { xp: xp(ch.level), fils: fils(ch.level), sceaux: SCEAUX } };
  }

  function statut(ch, date) {
    const s = etat(ch, date), k = s && knot(s.noeud);
    if (!s || !k) return { ouverte: false, niveau: (DATA.knots || []).reduce((m, x) => Math.min(m, x.level), 99) };
    const j = typeof Veille === 'object' ? Veille.jour(date) : null;
    return {
      ouverte: true, noeud: k, victoires: s.victoires || 0, objectif: OBJECTIF, prime: !!s.prime,
      noue: (ch.activeKnots ? ch.activeKnots() : []).includes(k.id), possede: ch.has ? ch.has(k.id) : false,
      gain: { xp: xp(ch.level), fils: fils(ch.level), sceaux: SCEAUX },
      joursRestants: j == null ? null : 7 - (((j % 7) + 7) % 7),
      tenues: ((ch.counters && ch.counters.feats) || {}).semaines || 0,
    };
  }

  function valider(v, bad) {
    if (v == null) return null;
    const ok = v && typeof v === 'object' && Number.isInteger(v.n) && v.n >= -1000 && v.n <= 100000 && knot(v.noeud)
      && Number.isInteger(v.victoires) && v.victoires >= 0 && v.victoires <= OBJECTIF && typeof v.prime === 'boolean' && (!v.prime || v.victoires === OBJECTIF);
    if (!ok) { bad('Nœud de la semaine'); return null; }
    return { n: v.n, noeud: v.noeud, victoires: v.victoires, prime: v.prime };
  }

  return { OBJECTIF, SCEAUX, numero, etat, noeud, bonus, victoire, statut, valider, xp, fils };
})();
