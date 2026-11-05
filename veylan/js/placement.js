const Placement = (() => {
  const NOMS = ['face', 'flanc', 'dispersee'];
  const LIBELLES = { face: 'Face à face', flanc: 'En flanc', dispersee: 'Dispersée', proche: 'Rapprochée' };
  const MIN = 5, MAX = 9, CIBLE = 6, BLEUES = 8;
  const DEVANT = { rempart: 3, cogneur: 2, chargeur: 2, entraveur: 1, melee: 2, charger: 2 };
  const roleDe = def => {
    if (!def) return 'cogneur';
    if (def.role) return def.role;
    return { melee: 'cogneur', charger: 'cogneur', ranged: 'tireur', support: 'soutien', summoner: 'invocateur' }[def.ai] || 'cogneur';
  };
  const avant = def => DEVANT[roleDe(def)] || 0;

  const dist = (a, b) => Math.abs(a.x - b.x) + Math.abs(a.y - b.y);
  const cle = c => c.x + ',' + c.y;

  function disposer(opts) {
    const { map, groupe, joueur } = opts;
    const monstres = opts.monstres || [];
    const MINI = opts.min || MIN, CIBLEV = opts.cible || CIBLE;
    const libre = opts.libre || ((x, y) => Grid.walkable(map, x, y));
    if (!map || !groupe || !joueur || !monstres.length) return null;
    const reach = Grid.reachable(map, groupe, 99, (x, y) => !libre(x, y), (x, y) => libre(x, y));
    const cases = [...reach.dist.keys()].map(k => { const [x, y] = k.split(',').map(Number); return { x, y }; });
    if (cases.length < 12) return null;
    const dx = joueur.x - groupe.x, dy = joueur.y - groupe.y;
    const axe = Math.abs(dx) >= Math.abs(dy) ? { x: Math.sign(dx) || 1, y: 0 } : { x: 0, y: Math.sign(dy) || 1 };
    const lat = { x: -axe.y, y: axe.x };
    const t = c => (c.x - groupe.x) * axe.x + (c.y - groupe.y) * axe.y;
    const s = c => (c.x - groupe.x) * lat.x + (c.y - groupe.y) * lat.y;
    const plusProche = (p, pris) => {
      let best = null, bd = Infinity;
      for (const c of cases) {
        if (pris.has(cle(c))) continue;
        const d = dist(c, p) + Math.hypot(c.x - p.x, c.y - p.y) * 1e-3 + (c.y * 15 + c.x) * 1e-7;
        if (d < bd) { bd = d; best = c; }
      }
      return best;
    };
    let nom = NOMS[((opts.rang || 0) % NOMS.length + NOMS.length) % NOMS.length];
    if (nom === 'dispersee' && monstres.length < 2) nom = 'face';

    const ancres = nom === 'dispersee'
      ? [{ x: groupe.x + lat.x * 3, y: groupe.y + lat.y * 3 }, { x: groupe.x - lat.x * 3, y: groupe.y - lat.y * 3 }]
      : [groupe];
    const ordre = monstres.map((m, i) => ({ i, a: avant(DATA.monsters[m.id]) })).sort((p, q) => q.a - p.a || p.i - q.i);
    const pris = new Set(), rouges = new Array(monstres.length);
    ordre.forEach((o, k) => {
      const ancre = ancres[k % ancres.length];
      const autour = cases.filter(c => !pris.has(cle(c)) && dist(c, ancre) <= 2);
      const note = c => (o.a > 0 ? t(c) : -t(c)) * 2 - dist(c, ancre) - (c.y * 15 + c.x) * 1e-6;
      autour.sort((p, q) => note(q) - note(p));
      const c = autour[0] || plusProche(ancre, pris);
      if (!c) return;
      rouges[o.i] = c; pris.add(cle(c));
    });
    if (rouges.some(c => !c)) return null;

    const dmin = c => Math.min(...rouges.map(r => dist(c, r)));
    const vue = c => rouges.some(r => Grid.hasLineOfSight(map, c, r));
    const cote = nom === 'flanc' ? (cases.filter(c => s(c) > 0).length >= cases.filter(c => s(c) < 0).length ? 1 : -1) : 0;
    const ouvert = new Set(cases.map(cle));
    const degagement = c => {
      let v = 0;
      for (let oy = -1; oy <= 1; oy++) for (let ox = -1; ox <= 1; ox++) if ((ox || oy) && ouvert.has((c.x + ox) + ',' + (c.y + oy))) v++;
      const bord = Math.min(c.x, c.y, map.w - 1 - c.x, map.h - 1 - c.y);
      return v - (bord === 0 ? 4 : bord === 1 ? 1.5 : 0);
    };
    const noter = c => {
      const d = dmin(c);
      let n = -Math.abs(d - CIBLEV) * 2 + Math.min(6, degagement(c)) * 0.6;
      if (nom === 'flanc') n += Math.min(4, cote * s(c)) * 1.2 + Math.min(2, t(c)) * 0.5;
      else n += Math.min(5, t(c)) * 1.0 - Math.abs(s(c)) * 0.25;
      return n - (c.y * 15 + c.x) * 1e-6;
    };
    let bornes = [MIN, MAX], cand = [];
    for (const [a, b] of [[MINI, MAX], [Math.min(MINI, 4), 10], [3, 11]]) {
      cand = cases.filter(c => !pris.has(cle(c)) && dmin(c) >= a && dmin(c) <= b && t(c) > -2);
      bornes = [a, b];
      if (cand.length >= BLEUES) break;
    }
    if (cand.length < 3) return null;
    cand.sort((p, q) => noter(q) - noter(p));
    const bleues = [];
    const restantes = cand.slice();
    while (bleues.length < BLEUES && restantes.length) {
      let bi = 0, bn = -Infinity;
      restantes.forEach((c, i) => {
        const voisines = bleues.filter(b => dist(b, c) === 1).length;
        const n = noter(c) - voisines * 1.2;
        if (n > bn) { bn = n; bi = i; }
      });
      bleues.push(restantes.splice(bi, 1)[0]);
    }
    const assurer = (veut) => {
      if (bleues.some(c => vue(c) === veut)) return;
      const r = restantes.find(c => vue(c) === veut);
      if (r) bleues[bleues.length - 1] = r;
    };
    assurer(false);
    assurer(true);
    const depart = bleues.slice().sort((p, q) => noter(q) - noter(p))[0];
    return {
      nom: bornes[0] < MINI ? 'proche' : nom, disposition: nom, libelle: LIBELLES[bornes[0] < MINI ? 'proche' : nom],
      rouges, bleues, joueur: depart, distance: Math.min(...bleues.map(dmin)), bornes,
    };
  }

  return { NOMS, LIBELLES, disposer, roleDe, MIN, MAX };
})();
