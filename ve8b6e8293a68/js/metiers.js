const Metiers = (() => {
  const MAX = 200;
  const liste = () => (DATA.content && DATA.content.metiers) || [];
  const get = id => liste().find(m => m.id === id) || null;
  const R = () => Object.assign({ exigeNiveau: true, partRecolte: 0.15, ecartPlein: 5, ecartNul: 20 }, (DATA.rules && DATA.rules.metiers) || {});

  const xpNiveau = n => Math.round(20 + 6 * n + 0.12 * n * n);

  const etat = ch => {
    if (!ch.metiers || typeof ch.metiers !== 'object') ch.metiers = {};
    for (const m of liste()) if (!ch.metiers[m.id]) ch.metiers[m.id] = { niveau: 1, xp: 0 };
    return ch.metiers;
  };
  const niveau = (ch, id) => (etat(ch)[id] || { niveau: 1 }).niveau;

  const deAtelier = w => liste().find(m => m.ateliers.includes(w)) || null;
  const deRessource = rid => {
    const r = (DATA.content.resources || []).find(x => x.id === rid);
    return r && r.node ? liste().find(m => m.recolte.includes(r.node.kind)) || null : null;
  };
  const niveauRessource = rid => { const r = (DATA.content.resources || []).find(x => x.id === rid); return (r && r.niveau) || 1; };
  const niveauRecette = rec => { const d = Items.get(rec.result); return Math.max(1, rec.niveau || (d && d.level) || 1); };

  function atelierAccepte(atelierPnj, atelierRecette) {
    if (!atelierPnj) return false;
    if (atelierPnj === atelierRecette) return true;
    const m = deAtelier(atelierRecette);
    return !!(m && m.ateliers.includes(atelierPnj));
  }
  const ateliersDe = atelierPnj => { const m = deAtelier(atelierPnj); return m ? m.ateliers.slice() : [atelierPnj]; };

  function part(nivChose, nivMetier) {
    const r = R(), e = nivMetier - nivChose;
    if (e <= r.ecartPlein) return 1;
    return Math.max(0.05, 1 - (e - r.ecartPlein) / (r.ecartNul - r.ecartPlein));
  }

  function gagner(ch, id, xp) {
    const e = etat(ch)[id];
    if (!e || !(xp > 0)) return { niveaux: 0 };
    let niveaux = 0;
    e.xp += Math.round(xp);
    while (e.niveau < MAX && e.xp >= xpNiveau(e.niveau)) { e.xp -= xpNiveau(e.niveau); e.niveau++; niveaux++; }
    if (e.niveau >= MAX) e.xp = 0;
    return { niveaux, niveau: e.niveau, metier: get(id) };
  }

  function peutFabriquer(ch, rec) {
    const m = deAtelier(rec.workshop);
    if (!m || !R().exigeNiveau) return { ok: true, metier: m };
    const n = niveauRecette(rec);
    return niveau(ch, m.id) >= n ? { ok: true, metier: m } : { ok: false, metier: m, raison: `${m.nom} niveau ${n} requis (tu es niveau ${niveau(ch, m.id)}).` };
  }
  function peutRecolter(ch, rid) {
    const m = deRessource(rid);
    if (!m || !R().exigeNiveau) return { ok: true, metier: m };
    const n = niveauRessource(rid);
    return niveau(ch, m.id) >= n ? { ok: true, metier: m } : { ok: false, metier: m, raison: `${m.nom} niveau ${n} requis (tu es niveau ${niveau(ch, m.id)}).` };
  }
  function apresFabrication(ch, rec) {
    const m = deAtelier(rec.workshop);
    if (!m) return null;
    const nv = niveau(ch, m.id), n = niveauRecette(rec);
    const xp = xpNiveau(nv) * part(n, nv);
    return Object.assign({ xp: Math.round(xp) }, gagner(ch, m.id, xp));
  }
  function apresRecolte(ch, rid, n) {
    const m = deRessource(rid);
    if (!m) return null;
    const nv = niveau(ch, m.id);
    const xp = xpNiveau(nv) * R().partRecolte * part(niveauRessource(rid), nv) * (n || 1);
    return Object.assign({ xp: Math.round(xp) }, gagner(ch, m.id, xp));
  }

  function xpFabrication(ch, rec) {
    const m = deAtelier(rec.workshop);
    if (!m) return 0;
    const nv = niveau(ch, m.id), n = niveauRecette(rec);
    if (R().exigeNiveau && nv < n) return 0;
    return nv >= MAX ? 0 : Math.round(xpNiveau(nv) * part(n, nv));
  }
  function xpRecolte(ch, rid, n) {
    const m = deRessource(rid);
    if (!m) return 0;
    const nv = niveau(ch, m.id), nr = niveauRessource(rid);
    if (R().exigeNiveau && nv < nr) return 0;
    return nv >= MAX ? 0 : Math.round(xpNiveau(nv) * R().partRecolte * part(nr, nv) * (n || 1));
  }

  function nettoyer(o) {
    const out = {};
    if (!o || typeof o !== 'object' || Array.isArray(o)) return out;
    for (const m of liste()) {
      const e = o[m.id];
      if (!e || typeof e !== 'object') continue;
      const nv = Number.isInteger(e.niveau) ? Math.max(1, Math.min(MAX, e.niveau)) : 1;
      const xp = Number.isFinite(e.xp) ? Math.max(0, Math.min(xpNiveau(nv) - 1, Math.floor(e.xp))) : 0;
      out[m.id] = { niveau: nv, xp };
    }
    return out;
  }

  return { MAX, liste, get, xpNiveau, etat, niveau, deAtelier, deRessource, niveauRessource, niveauRecette, atelierAccepte, ateliersDe, part, gagner, peutFabriquer, peutRecolter, apresFabrication, apresRecolte, xpFabrication, xpRecolte, nettoyer };
})();
