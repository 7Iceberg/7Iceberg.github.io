const Familiers = (() => {
  const NIVEAU_MAX = 10;
  const PALIERS = [25, 40, 60, 80, 110, 140, 190, 255, 450, 650];
  const CUMUL = PALIERS.reduce((a, v) => (a.push(a[a.length - 1] + v), a), [0]);
  const XP_MAX = CUMUL[NIVEAU_MAX];
  const XP_REGION = 2;
  const BONUS_CLES = ['vita', 'sagesse', 'force', 'intel', 'chance', 'agi', 'pp'];
  const BONUS_LABEL = { pp: 'Prospection' };

  const liste = () => (DATA.content && DATA.content.familiers) || [];
  const get = id => liste().find(f => f.id === id) || null;

  function niveau(xp) {
    let n = 0;
    while (n < NIVEAU_MAX && (xp || 0) >= CUMUL[n + 1]) n++;
    return n;
  }
  function progression(xp) {
    const n = niveau(xp);
    if (n >= NIVEAU_MAX) return 1;
    return ((xp || 0) - CUMUL[n]) / PALIERS[n];
  }

  function bonusA(def, n) {
    const out = {};
    if (!def) return out;
    for (const k in def.bonus || {}) {
      const max = def.bonus[k];
      if (!max) continue;
      out[k] = Math.max(1, Math.round(max * (Math.min(NIVEAU_MAX, Math.max(0, n)) + 2) / (NIVEAU_MAX + 2)));
    }
    return out;
  }

  const etat = (ch, id) => (ch && ch.familiers && ch.familiers[id]) || null;
  const possede = (ch, id) => !!etat(ch, id);
  const niveauDe = (ch, id) => { const e = etat(ch, id); return e ? niveau(e.xp) : 0; };
  const actif = ch => (ch && ch.familier && possede(ch, ch.familier) ? get(ch.familier) : null);
  const bonusActif = ch => { const d = actif(ch); return d ? bonusA(d, niveauDe(ch, d.id)) : {}; };

  const texteBonus = stats => Object.keys(stats).filter(k => stats[k]).map(k => `+${stats[k]} ${BONUS_LABEL[k] || Items.STAT_LABEL[k] || k}`).join(', ');

  function eclore(ch, id) {
    const d = get(id);
    if (!d) return { ok: false, raison: 'Familier inconnu.' };
    if (possede(ch, id)) return { ok: false, raison: `Tu as déjà un ${d.nom}.` };
    if (!ch.familiers || typeof ch.familiers !== 'object') ch.familiers = {};
    ch.familiers[id] = { xp: 0 };
    if (!actif(ch)) ch.familier = id;
    return { ok: true, familier: d };
  }

  const besoinsEchange = (ch, d) => (d.echange || []).map(([id, n]) => ({ id, n, a: ch.count(id) }));
  const peutEchanger = (ch, id) => {
    const d = get(id);
    if (!d || !(d.echange || []).length) return { ok: false, raison: 'Ce familier ne s\'échange pas.' };
    if (possede(ch, id)) return { ok: false, raison: `Tu as déjà un ${d.nom}.` };
    const manque = besoinsEchange(ch, d).filter(b => b.a < b.n);
    if (manque.length) return { ok: false, raison: 'Il manque ' + manque.map(b => `${b.n - b.a} ${(Items.get(b.id) || {}).name || b.id}`).join(', ') + '.' };
    return { ok: true };
  };
  function echanger(ch, id) {
    const p = peutEchanger(ch, id);
    if (!p.ok) return p;
    const d = get(id);
    for (const [rid, n] of d.echange) ch.removeItem(rid, n);
    return eclore(ch, id);
  }

  const xpRessource = itemId => { const d = Items.get(itemId); return d && d.kind === 'resource' ? Math.max(1, Items.sellPrice(d)) : 0; };
  const mangeable = itemId => xpRessource(itemId) > 0;

  function reserveQuetes(ch, itemId) {
    if (typeof Quests === 'undefined' || !ch.quests) return 0;
    let n = 0;
    for (const qid in ch.quests.active || {}) {
      const q = Quests.get(qid), st = ch.quests.active[qid];
      if (!q) continue;
      (q.steps || []).forEach((s, i) => { if (s.type === 'collect' && s.item === itemId && i >= ((st && st.step) || 0)) n += s.count || 1; });
    }
    return n;
  }

  function gagner(ch, id, xp) {
    const e = etat(ch, id);
    const avant = niveau(e.xp);
    const pris = Math.max(0, Math.min(xp, XP_MAX - e.xp));
    e.xp += pris;
    return { xp: pris, niveau: niveau(e.xp), niveaux: niveau(e.xp) - avant };
  }

  function nourrir(ch, id, itemId, n) {
    const d = get(id);
    if (!d || !possede(ch, id)) return { ok: false, raison: 'Tu n\'as pas ce familier.' };
    const par = xpRessource(itemId);
    if (!par) return { ok: false, raison: 'Un familier ne mange que des ressources.' };
    const e = etat(ch, id);
    if (e.xp >= XP_MAX) return { ok: false, raison: `${d.nom} est au niveau ${NIVEAU_MAX} : il n'a plus faim.` };
    const reste = XP_MAX - e.xp;
    const q = Math.min(Math.max(1, Math.floor(n || 1)), ch.count(itemId), Math.ceil(reste / par));
    if (q <= 0) return { ok: false, raison: 'Tu n\'en as plus.' };
    ch.removeItem(itemId, q);
    const g = gagner(ch, id, q * par);
    return { ok: true, mange: q, xp: g.xp, niveau: g.niveau, niveaux: g.niveaux, familier: d };
  }

  function apresCombat(ch, region, nbMonstres) {
    const d = actif(ch);
    if (!d || !region || d.region !== region || !nbMonstres) return null;
    const e = etat(ch, d.id);
    if (e.xp >= XP_MAX) return null;
    const g = gagner(ch, d.id, XP_REGION * nbMonstres);
    return g.xp ? { id: d.id, nom: d.nom, xp: g.xp, niveau: g.niveau, niveaux: g.niveaux } : null;
  }

  function emmener(ch, id) {
    if (id != null && !possede(ch, id)) return { ok: false, raison: 'Tu n\'as pas ce familier.' };
    ch.familier = id == null ? null : id;
    if (ch.hp != null && typeof ch.derived === 'function') ch.hp = Math.min(ch.hp, ch.derived().hpMax);
    return { ok: true, familier: id == null ? null : get(id) };
  }

  function texteObtention(d) {
    const noms = [...new Set(d.famille.map(m => DATA.monsters[m] && DATA.monsters[m].name).filter(Boolean))];
    const parts = [`${d.oeuf.nom} : tombe parfois sur ${noms.join(', ')}`];
    for (const b in d.oeuf.boss || {}) if (DATA.monsters[b]) parts.push(`plus souvent sur ${DATA.monsters[b].name}`);
    return parts.join(', ');
  }

  function nettoyer(familiers, familier) {
    const errors = [], out = {};
    if (familiers != null && (typeof familiers !== 'object' || Array.isArray(familiers))) errors.push('familiers');
    else for (const id of Object.keys(familiers || {})) {
      const e = familiers[id];
      if (!get(id)) { errors.push(`familier inconnu ${id}`); continue; }
      const xp = e && e.xp;
      if (!Number.isInteger(xp) || xp < 0 || xp > XP_MAX) { errors.push(`expérience du familier ${id}`); out[id] = { xp: Math.max(0, Math.min(XP_MAX, Math.floor(Number(xp)) || 0)) }; continue; }
      out[id] = { xp };
    }
    let f = familier == null ? null : familier;
    if (f !== null && !out[f]) { errors.push('familier emmené'); f = null; }
    return { familiers: out, familier: f, errors };
  }

  return { NIVEAU_MAX, PALIERS, CUMUL, XP_MAX, XP_REGION, BONUS_CLES, BONUS_LABEL, liste, get, niveau, progression, bonusA, possede, niveauDe, actif, bonusActif, texteBonus,
    eclore, besoinsEchange, peutEchanger, echanger, xpRessource, mangeable, reserveQuetes, nourrir, apresCombat, emmener, texteObtention, nettoyer };
})();
