// Les avis de recherche de la Garde des Cimes (docs/CITE-DES-CIMES.md, C6), comme ceux de la milice
// d'Astrub : à la tour de la Garde, sur la Place du Relais, la capitaine cloue un avis par zone
// d'Orsane (DATA.content.avis). On prend un avis : sa cible, un monstre recherché, se joint à un
// groupe précis de sa carte (en tête, son nom sur l'étiquette). On la bat, on revient à la tour, on
// touche la prime : de l'XP, des Fils et des Sceaux de la Garde, qu'on échange au Temple des Voies
// (des parchemins, comme les doplons d'Astrub aux temples de classe). Chaque avis se rend une fois
// par jour (le jour de la Veille).
const Avis = (() => {
  const SCEAU = 'sceau_de_la_garde';
  const jour = () => (typeof Veille === 'object' ? Veille.jour() : Math.floor(Date.now() / 86400000));
  const liste = () => (DATA.content && DATA.content.avis) || [];
  const get = id => liste().find(a => a.id === id) || null;

  // L'état des avis du personnage : { pris: [id], captures: [id], rendus: { id: jour } }.
  function etat(ch) {
    if (!ch.avis || typeof ch.avis !== 'object') ch.avis = { pris: [], captures: [], rendus: {} };
    const a = ch.avis;
    a.pris = a.pris || []; a.captures = a.captures || []; a.rendus = a.rendus || {};
    return a;
  }

  // Où en est un avis : 'rendu' (prime touchée aujourd'hui), 'capture' (cible battue, la prime
  // attend), 'pris' (la chasse est ouverte), 'libre'.
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

  // Renoncer à un avis pris (pas à une prime qui attend).
  function abandonner(ch, id) {
    const a = etat(ch);
    if (!a.pris.includes(id) || a.captures.includes(id)) return false;
    a.pris = a.pris.filter(x => x !== id);
    return true;
  }

  // La cible qui se joint au groupe `idx` de la carte `carte`, s'il y en a une : un avis pris dont
  // la cible n'est pas encore battue.
  function cibleDe(ch, carte, idx) {
    const a = etat(ch);
    return liste().find(d => d.carte === carte && d.groupe === idx && a.pris.includes(d.id) && !a.captures.includes(d.id)) || null;
  }

  // Une victoire où la cible d'un avis pris est tombée : l'avis est capturé. Rend les avis capturés.
  function victoire(ch, monstresVaincus) {
    const a = etat(ch), out = [];
    for (const d of liste()) {
      if (!a.pris.includes(d.id) || a.captures.includes(d.id) || !monstresVaincus.includes(d.monstre)) continue;
      a.captures.push(d.id);
      out.push(d);
    }
    return out;
  }

  // Toucher la prime d'un avis capturé : { xp, fils, sceaux } à donner (le monde les donne).
  function rendre(ch, id) {
    const d = get(id), a = etat(ch);
    if (!d || !a.captures.includes(id)) return null;
    a.captures = a.captures.filter(x => x !== id);
    a.pris = a.pris.filter(x => x !== id);
    a.rendus[id] = jour();
    return { avis: d, xp: d.prime.xp || 0, fils: d.prime.fils || 0, sceaux: d.prime.sceaux || 0 };
  }

  // Le Temple des Voies : ce que la gardienne donne contre des Sceaux de la Garde.
  const ECHANGES = [
    { id: 'parchemin_vitalite', sceaux: 3 }, { id: 'parchemin_sagesse', sceaux: 3 },
    { id: 'parchemin_terra', sceaux: 3 }, { id: 'parchemin_ignis', sceaux: 3 },
    { id: 'parchemin_aqua', sceaux: 3 }, { id: 'parchemin_aer', sceaux: 3 },
    { id: 'potion_de_veille', sceaux: 2 }, { id: 'potion_de_relais', sceaux: 1 },
  ];
  function echanger(ch, id) {
    const e = ECHANGES.find(x => x.id === id);
    if (!e || (typeof Items === 'object' && !Items.get(id))) return { ok: false, reason: 'Le Temple n\'échange pas cela.' };
    if (!ch.has(SCEAU, e.sceaux)) return { ok: false, reason: `Il te faut ${e.sceaux} Sceau${e.sceaux > 1 ? 'x' : ''} de la Garde.` };
    ch.removeItem(SCEAU, e.sceaux);
    ch.addItem(id, 1);
    return { ok: true, echange: e };
  }

  return { SCEAU, ECHANGES, jour, liste, get, etat, statut, prendre, abandonner, cibleDe, victoire, rendre, echanger };
})();
