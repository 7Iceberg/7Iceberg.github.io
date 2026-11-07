const Avis = (() => {
  const SCEAU = 'sceau_de_la_garde';
  const jour = () => (typeof Veille === 'object' ? Veille.jour() : Math.floor(Date.now() / 86400000));
  const liste = () => (DATA.content && DATA.content.avis) || [];
  const get = id => liste().find(a => a.id === id) || null;

  function etat(ch) {
    if (!ch.avis || typeof ch.avis !== 'object') ch.avis = { pris: [], captures: [], rendus: {} };
    const a = ch.avis;
    a.pris = a.pris || []; a.captures = a.captures || []; a.rendus = a.rendus || {};
    return a;
  }

  function statut(ch, id, n) {
    const a = etat(ch);
    if (a.captures.includes(id)) return 'capture';
    if (a.pris.includes(id)) return 'pris';
    if (a.rendus[id] === (n == null ? jour() : n)) return 'rendu';
    return 'libre';
  }

  function prendre(ch, id) {
    const d = get(id);
    if (!d) return { ok: false, reason: 'Cet avis n\'existe pas.' };
    const s = statut(ch, id);
    if (s === 'rendu') return { ok: false, reason: 'La prime de cet avis est déjà touchée aujourd\'hui. Un nouvel avis sera cloué demain.' };
    if (s !== 'libre') return { ok: false, reason: 'Tu chasses déjà cette cible.' };
    etat(ch).pris.push(id);
    return { ok: true, avis: d };
  }

  function abandonner(ch, id) {
    const a = etat(ch);
    if (!a.pris.includes(id) || a.captures.includes(id)) return false;
    a.pris = a.pris.filter(x => x !== id);
    return true;
  }

  function cibleDe(ch, carte, idx) {
    const a = etat(ch);
    return liste().find(d => d.carte === carte && d.groupe === idx && a.pris.includes(d.id) && !a.captures.includes(d.id)) || null;
  }

  function victoire(ch, monstresVaincus) {
    const a = etat(ch), out = [];
    for (const d of liste()) {
      if (!a.pris.includes(d.id) || a.captures.includes(d.id) || !monstresVaincus.includes(d.monstre)) continue;
      a.captures.push(d.id);
      out.push(d);
    }
    return out;
  }

  function rendre(ch, id) {
    const d = get(id), a = etat(ch);
    if (!d || !a.captures.includes(id)) return null;
    a.captures = a.captures.filter(x => x !== id);
    a.pris = a.pris.filter(x => x !== id);
    a.rendus[id] = jour();
    return { avis: d, xp: d.prime.xp || 0, fils: d.prime.fils || 0, sceaux: d.prime.sceaux || 0 };
  }

  const ECHANGES = [
    { id: 'parchemin_vitalite', sceaux: 3 }, { id: 'parchemin_sagesse', sceaux: 3 },
    { id: 'parchemin_terra', sceaux: 3 }, { id: 'parchemin_ignis', sceaux: 3 },
    { id: 'parchemin_aqua', sceaux: 3 }, { id: 'parchemin_aer', sceaux: 3 },
    { id: 'potion_de_veille', sceaux: 2 }, { id: 'potion_de_relais', sceaux: 1 },
  ];
  function echanger(ch, id) {
    const e = ECHANGES.find(x => x.id === id);
    if (!e || (typeof Items === 'object' && !Items.get(id))) return { ok: false, reason: 'Le Temple n\'échange pas cela.' };
    if (!ch.has(SCEAU, e.sceaux)) return { ok: false, reason: `Il te faut ${e.sceaux} Insigne${e.sceaux > 1 ? 's' : ''} de la Garde.` };
    ch.removeItem(SCEAU, e.sceaux);
    ch.addItem(id, 1);
    return { ok: true, echange: e };
  }

  return { SCEAU, ECHANGES, jour, liste, get, etat, statut, prendre, abandonner, cibleDe, victoire, rendre, echanger };
})();
