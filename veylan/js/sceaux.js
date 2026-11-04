const Sceaux = (() => {
  const D = typeof SCEAUX_DATA !== 'undefined' ? SCEAUX_DATA : require('./sceaux-data.js');
  const R = D.regles;
  const STATS = D.ordre.map(v => D.voies[v].stat);

  function nouveau(niveau, dragmes) {
    const zero = () => Object.fromEntries(STATS.map(k => [k, 0]));
    return { niveau: Math.max(1, Math.min(R.niveauMax, niveau || 1)), caracs: zero(), depense: zero(), rangs: {}, dragmes: dragmes || 0, poses: [] };
  }

  const pointsTotal = niveau => R.pointsParNiveau * (Math.max(1, niveau) - 1);
  const pointsDepenses = e => STATS.reduce((n, k) => n + (e.depense[k] || 0), 0);
  const pointsLibres = e => pointsTotal(e.niveau) - pointsDepenses(e);
  function coutPoint(valeur) {
    for (const [jusqua, cout] of R.paliers) if (valeur < jusqua) return cout;
    return R.paliers[R.paliers.length - 1][1];
  }
  const statDe = voie => D.voies[voie].stat;

  function ajouterPoints(e, voie, n) {
    const k = statDe(voie);
    const avant = sceauxGagnes(e, voie);
    let ajoutes = 0;
    for (let i = 0; i < (n || 1); i++) {
      const cout = coutPoint(e.caracs[k]);
      if (pointsLibres(e) < cout) break;
      e.caracs[k] += 1; e.depense[k] += cout; ajoutes++;
    }
    const gagnes = sceauxGagnes(e, voie) - avant;
    if (!ajoutes) return { ok: false, ajoutes: 0, gagnes: 0, raison: pointsLibres(e) > 0 ? `Le prochain point coûte ${coutPoint(e.caracs[k])} points.` : 'Plus de points à répartir.' };
    return { ok: true, ajoutes, gagnes };
  }

  const sceauxGagnes = (e, voie) => Math.floor((e.caracs[statDe(voie)] || 0) / R.pointsParSceau);
  const jauge = (e, voie) => (e.caracs[statDe(voie)] || 0) % R.pointsParSceau;
  const noeudsDe = voie => Object.values(D.noeuds).filter(c => c.voie === voie);
  function sceauxPoses(e, voie, branche) {
    let n = 0;
    for (const c of noeudsDe(voie)) if (!c.coeur && (!branche || c.branche === branche)) n += e.rangs[c.id] || 0;
    return n;
  }
  const sceauxLibres = (e, voie) => sceauxGagnes(e, voie) - sceauxPoses(e, voie);
  const sceauxLibresTotal = e => D.ordre.reduce((n, v) => n + sceauxLibres(e, v), 0);

  const rang = (e, id) => (D.noeuds[id] && D.noeuds[id].coeur ? 1 : (e.rangs[id] || 0));
  const parentsOk = (e, c) => !c.parents.length || c.parents.some(p => rang(e, p) > 0);
  function conditions(e, id) {
    const c = D.noeuds[id], r = rang(e, id), out = [];
    if (!c || c.coeur || r >= c.max) return out;
    if (r === 0 && c.parents.length) {
      out.push({ ok: parentsOk(e, c), texte: c.parents.length > 1 ? 'Un de ces nœuds' : 'Ce nœud',
        chips: c.parents.map(p => ({ label: D.noeuds[p].nom, ok: rang(e, p) > 0 })) });
    }
    if (r === 0 && c.seuil) {
      const n = sceauxPoses(e, c.voie, c.branche), b = D.branches[c.voie][c.branche];
      out.push({ ok: n >= c.seuil, texte: `${c.seuil} Sceaux posés dans ${b.nom}`, val: `${n} posés` });
    }
    if (r === 0 && c.seuilVoie) {
      const n = sceauxPoses(e, c.voie);
      out.push({ ok: n >= c.seuilVoie, texte: `${c.seuilVoie} Sceaux posés dans l'arbre ${nomSceau(c.voie).replace(/^de /, 'de ')}`, val: `${n} posés` });
    }
    const libres = sceauxLibres(e, c.voie);
    out.push({ ok: libres >= 1, texte: `Coûte 1 Sceau ${nomSceau(c.voie)}`, val: `tu en as ${Math.max(0, libres)}` });
    return out;
  }
  const peutPoser = (e, id) => { const c = D.noeuds[id]; return !!c && !c.coeur && rang(e, id) < c.max && conditions(e, id).every(q => q.ok); };
  function etat(e, id) {
    const c = D.noeuds[id], r = rang(e, id);
    if (r >= c.max) return 'maitrise';
    if (r > 0) return 'cours';
    if (!parentsOk(e, c)) return 'verrou';
    return peutPoser(e, id) ? 'pret' : 'ouvert';
  }
  function poser(e, id) {
    if (!peutPoser(e, id)) {
      const q = conditions(e, id).find(x => !x.ok);
      return { ok: false, raison: q ? (/^Coûte/.test(q.texte) ? `Il te manque un Sceau ${nomSceau(D.noeuds[id].voie)}.` : q.chips ? 'Pose d\'abord un Sceau sur le nœud d\'avant.' : `Il faut ${q.texte.toLowerCase()}.`) : 'Rang maximum atteint.' };
    }
    e.rangs[id] = rang(e, id) + 1;
    e.poses.unshift({ id, rang: e.rangs[id], t: Date.now() });
    e.poses.length = Math.min(e.poses.length, 20);
    return { ok: true, rang: e.rangs[id] };
  }
  const nomSceau = voie => (/^[AEIOU]/.test(D.voies[voie].nom) ? 'd\'' : 'de ') + D.voies[voie].nom;
  const prets = e => Object.values(D.noeuds).filter(c => !c.coeur && peutPoser(e, c.id)).length;

  function avancement(e, voie, branche) {
    let total = 0, fait = 0;
    for (const c of noeudsDe(voie)) if (!c.coeur && (!branche || c.branche === branche)) { total += c.max; fait += Math.min(c.max, e.rangs[c.id] || 0); }
    return { total, fait, pc: total ? Math.round(fait / total * 100) : 0 };
  }

  function bilan(e) {
    const t = {};
    let poses = 0;
    for (const c of Object.values(D.noeuds)) {
      const r = c.coeur ? 0 : (e.rangs[c.id] || 0);
      if (!r) continue;
      poses += r;
      for (const k in c.effet) t[k] = (t[k] || 0) + c.effet[k] * r;
    }
    const arbre = Object.assign({}, t);
    t.pv = R.pvBase + R.pvParNiveau * e.niveau + R.pvParSceau * poses;
    for (const v of D.ordre) t['dmg_' + v] = (t['dmg_' + v] || 0) + (e.caracs[statDe(v)] || 0);
    t.init = (t.init || 0) + STATS.reduce((n, k) => n + (e.caracs[k] || 0), 0);
    return { total: t, arbre, pvArbre: R.pvParSceau * poses, poses };
  }

  function autoPoser(e, voie, pref) {
    const a = pref === 'g' ? 'g' : 'd', b = a === 'g' ? 'd' : 'g';
    const ordre = ['t1', a + '1', a + '2', a + '3', a + '4', 't2', a + 'm', a + '5', a + '6', a + 'k', 't3', 'tc',
      b + '1', b + '2', b + '3', b + '4', b + 'm', b + '5', b + '6', b + 'k'];
    let n = 0;
    for (let tour = 0; tour < 3 && sceauxLibres(e, voie) > 0; tour++) {
      for (const k of ordre) while (sceauxLibres(e, voie) > 0 && poser(e, voie + '_' + k).ok) n++;
    }
    return n;
  }

  const prixReinit = niveau => (niveau <= R.reinitGratuiteJusqua ? 0 : R.reinitPrixParNiveau2 * niveau * niveau);
  function reinitialiser(e, tout) {
    const prix = prixReinit(e.niveau);
    const rien = !Object.keys(e.rangs).length && (!tout || !pointsDepenses(e));
    if (rien) return { ok: false, raison: tout ? 'Rien à réinitialiser : aucun point n\'est réparti.' : 'Rien à réinitialiser : aucun Sceau n\'est posé.' };
    if (e.dragmes < prix) return { ok: false, raison: `Il faut ${prix} Dragmes, tu en as ${e.dragmes}.`, prix };
    const sceaux = Object.values(e.rangs).reduce((n, r) => n + r, 0), points = tout ? pointsDepenses(e) : 0;
    e.dragmes -= prix;
    e.rangs = {}; e.poses = [];
    if (tout) for (const k of STATS) { e.caracs[k] = 0; e.depense[k] = 0; }
    return { ok: true, prix, sceaux, points };
  }

  function changerNiveau(e, niveau) {
    e.niveau = Math.max(1, Math.min(R.niveauMax, niveau));
    if (pointsLibres(e) < 0) { e.rangs = {}; e.poses = []; for (const k of STATS) { e.caracs[k] = 0; e.depense[k] = 0; } return { rendu: true }; }
    return { rendu: false };
  }

  function valider(brut) {
    const e = nouveau(brut && brut.niveau, Math.max(0, Math.floor((brut && brut.dragmes) || 0)));
    if (!brut || typeof brut !== 'object') return e;
    for (const v of D.ordre) {
      const k = statDe(v), cible = Math.max(0, Math.floor((brut.caracs || {})[k] || 0));
      while (e.caracs[k] < cible && ajouterPoints(e, v, 1).ok) {   }
    }
    const voulu = brut.rangs || {};
    for (let tour = 0; tour < 6; tour++) {
      for (const c of Object.values(D.noeuds)) {
        const cible = Math.min(c.max, Math.max(0, Math.floor(voulu[c.id] || 0)));
        while (!c.coeur && rang(e, c.id) < cible && poser(e, c.id).ok) {   }
      }
    }
    e.poses = Array.isArray(brut.poses) ? brut.poses.filter(p => p && D.noeuds[p.id] && rang(e, p.id) >= p.rang).slice(0, 20) : [];
    return e;
  }

  return { D, STATS, nouveau, pointsTotal, pointsDepenses, pointsLibres, coutPoint, statDe, ajouterPoints, sceauxGagnes, jauge,
    sceauxPoses, sceauxLibres, sceauxLibresTotal, rang, parentsOk, conditions, peutPoser, etat, poser, nomSceau, prets, avancement, autoPoser,
    bilan, prixReinit, reinitialiser, changerNiveau, valider };
})();

if (typeof module !== 'undefined') module.exports = Sceaux;
