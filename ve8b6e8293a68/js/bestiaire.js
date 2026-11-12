const Bestiaire = (() => {
  const REGIONS = ['ervane', 'orsane', 'kaldum'];
  const ROLES = { soutien: 'Soutien', tireur: 'Tireur', invocateur: 'Invocateur', ranged: 'À distance', melee: 'Corps à corps', charger: 'Corps à corps', support: 'Soutien', summoner: 'Invocateur', inert: '-' };
  const C = () => (typeof DATA === 'object' && DATA.content) || { zones: [], dungeons: [] };
  const M = id => DATA.monsters[id];
  const majuscule = s => String(s || '').replace(/^./, c => c.toUpperCase());

  function regions(ch) {
    const kills = (ch && ch.counters && ch.counters.kills) || {};
    const ile = !ch || ch.origine === 'ervane' || Object.keys(kills).some(id => M(id) && M(id).region === 'ervane');
    return REGIONS.filter(r => DATA.regions[r] && C().zones.some(z => z.region === r) && (r !== 'ervane' || ile));
  }
  const nomRegion = r => ({ ervane: 'Ervane', orsane: 'Orsane', kaldum: 'Kaldum' }[r] || DATA.regions[r] || r);

  const parNiveau = (a, b) => (a.level ? a.level[0] : 0) - (b.level ? b.level[0] : 0);
  function zones(r) {
    return C().zones.filter(z => z.region === r).slice().sort(parNiveau).map(z => {
      const maps = z.maps || [];
      const decl = Array.isArray(z.sousZones) ? z.sousZones : [];
      const sous = [...new Set(maps.map(m => m.sousZone).filter(Boolean))].map(n => {
        const d = decl.find(x => x.nom === n), l = d && d.level;
        return majuscule(n) + (Array.isArray(l) ? ` (${l[0] === l[1] ? l[0] : `${l[0]} à ${l[1]}`})` : '');
      });
      const faune = z.faune && z.faune.monstres ? Object.entries(z.faune.monstres).filter(([id]) => M(id)).sort((a, b) => b[1] - a[1]) : [];
      const total = faune.reduce((t, [, p]) => t + p, 0) || 1;
      const groupes = maps.flatMap(m => m.groups || []);
      const fixes = [...new Set(groupes.flatMap(g => (g.monsters || []).map(x => typeof x === 'string' ? x : x.id)).filter(id => M(id)))];
      return {
        id: z.id, nom: z.name, niveau: z.level, desc: z.description || '', sousZones: sous,
        faune: faune.map(([id, p]) => ({ id, pct: Math.round(100 * p / total) })),
        tailles: z.faune && z.faune.tailles ? Object.entries(z.faune.tailles).map(([n, p]) => ({ n: +n, pct: p })) : [],
        groupesFixes: z.faune ? groupes.filter(g => typeof Groupes === 'object' ? Groupes.fixe(g) : g.fixe).length : 0,
        monstresFixes: z.faune ? [] : fixes,
        donjons: C().dungeons.filter(d => d.zone === z.id).map(d => d.id),
      };
    });
  }

  function donjons(r) {
    const zr = new Set(C().zones.filter(z => z.region === r).map(z => z.id));
    return C().dungeons.filter(d => zr.has(d.zone)).slice().sort(parNiveau).map(d => ({
      id: d.id, nom: d.name, niveau: d.level, desc: d.description || '', zone: d.zone,
      salles: (d.rooms || []).map(s => {
        const ids = [];
        for (const x of s.monsters || []) { const id = typeof x === 'string' ? x : x.id; if (M(id) && !ids.includes(id)) ids.push(id); }
        return { nom: majuscule(s.name), monstres: ids };
      }),
    }));
  }

  function invocateurs(id) {
    const qui = [];
    for (const m of Object.values(DATA.monsters)) {
      const parDecl = (m.triggers || []).some(t => (t.do || []).some(a => a.act === 'summon' && a.monster === id));
      const parSort = (m.spells || []).some(s => DATA.spells[s] && (DATA.spells[s].effects || []).some(e => e.type === 'summon' && e.monster === id));
      if ((parDecl || parSort) && !qui.includes(m.id)) qui.push(m.id);
    }
    return qui;
  }
  function lieux(id) {
    const out = [];
    for (const z of C().zones.slice().sort(parNiveau)) {
      const enFaune = z.faune && z.faune.monstres && z.faune.monstres[id];
      const enGroupe = (z.maps || []).some(m => (m.groups || []).some(g => (g.monsters || []).some(x => (typeof x === 'string' ? x : x.id) === id)));
      if (enFaune || enGroupe) out.push({ type: 'zone', id: z.id, nom: z.name, region: z.region });
    }
    for (const d of C().dungeons.slice().sort(parNiveau)) {
      if ((d.rooms || []).some(s => (s.monsters || []).some(x => (typeof x === 'string' ? x : x.id) === id))) {
        const z = C().zones.find(x => x.id === d.zone);
        out.push({ type: 'donjon', id: d.id, nom: d.name, region: z ? z.region : null });
      }
    }
    return out;
  }
  const estRare = m => !!(m.rare && m.base);
  const duCarnet = r => Object.values(DATA.monsters).filter(m => m.region === r && !m.summon);

  function monstres(r) {
    const vus = new Set(), ordre = [];
    const ajoute = (id, ou) => { const m = M(id); if (!m || vus.has(id) || estRare(m) || m.region !== r || m.summon) return; vus.add(id); ordre.push({ id, groupe: ou }); };
    for (const z of zones(r)) {
      for (const f of z.faune) ajoute(f.id, z.nom);
      const zz = C().zones.find(x => x.id === z.id);
      for (const m of zz.maps || []) for (const g of m.groups || []) for (const x of g.monsters || []) ajoute(typeof x === 'string' ? x : x.id, z.nom);
    }
    for (const d of donjons(r)) for (const s of d.salles) for (const id of s.monstres) ajoute(id, d.nom);
    const reste = duCarnet(r).filter(m => !vus.has(m.id) && !estRare(m)).sort((a, b) => niveauMin(a) - niveauMin(b));
    for (const m of reste) ajoute(m.id, 'Ailleurs');
    const inv = Object.values(DATA.monsters).filter(m => m.summon && invocateurs(m.id).some(q => M(q) && M(q).region === r && !M(q).classId));
    for (const m of inv) if (!vus.has(m.id)) { vus.add(m.id); ordre.push({ id: m.id, groupe: 'Invocations' }); }
    return ordre;
  }
  function rares(r) { return duCarnet(r).filter(estRare).sort((a, b) => niveauMin(M(a.base) || a) - niveauMin(M(b.base) || b)).map(m => m.id); }
  const niveauMin = m => parseInt(String(m.level || '0'), 10) || 0;

  function fiche(id) {
    const m = M(id);
    if (!m) return null;
    const res = Object.entries(m.resist || {}).filter(([, v]) => v).sort((a, b) => b[1] - a[1]).map(([el, v]) => ({ el, v }));
    const sorts = (m.spells || []).map(s => DATA.spells[s]).filter(Boolean).map(s => ({ id: s.id, nom: s.name, el: s.element, desc: s.desc || '' }));
    const ou = lieux(id), inv = m.summon || !ou.length ? invocateurs(id) : [];
    return {
      id, nom: m.name, niveau: niveauVu(id), niveauFiche: m.level, desc: m.desc || '', role: ROLES[m.role] || ROLES[m.ai] || '-',
      pv: m.hp, pa: m.pa, pm: m.pm, res, sorts, lieux: ou, invoquePar: inv,
      boss: !!m.boss, rare: !!m.rare, argent: estRare(m), base: m.base || null, invocation: !!m.summon,
      provisoire: /nom provisoire/i.test(m.desc || ''),
      modele3d: typeof FIGURES_IMAGES === 'object' && !!FIGURES_IMAGES[id],
      argents: Object.values(DATA.monsters).filter(x => x.base === id && x.rare).map(x => x.id),
    };
  }

  function niveauVu(id) {
    const m = M(id), bornes = [];
    for (const l of lieux(id)) {
      const x = l.type === 'zone' ? C().zones.find(z => z.id === l.id) : C().dungeons.find(d => d.id === l.id);
      if (x && Array.isArray(x.level)) bornes.push(x.level);
    }
    if (m && m.rare && m.base && !bornes.length) return niveauVu(m.base);
    if (!bornes.length) return m ? m.level : '';
    return [Math.min(...bornes.map(b => b[0])), Math.max(...bornes.map(b => b[1]))];
  }

  function connu(ch, id) {
    const k = (ch && ch.counters && ch.counters.kills) || {};
    if (k[id]) return true;
    const m = M(id);
    return !!(m && m.summon && invocateurs(id).some(q => k[q]));
  }
  const vaincus = (ch, id) => ((ch && ch.counters && ch.counters.kills) || {})[id] || 0;
  function avancement(ch, r) {
    const l = duCarnet(r);
    return { faits: l.filter(m => vaincus(ch, m.id) > 0).length, total: l.length };
  }

  return { REGIONS, regions, nomRegion, zones, donjons, monstres, rares, fiche, lieux, invocateurs, niveauVu, connu, vaincus, avancement };
})();
if (typeof module !== 'undefined' && module.exports) module.exports = Bestiaire;
