const Boutique = (() => {
  const CLE = 'veylan.boutique';
  const JOUR = 86400000;
  const MAX_COMMANDES = 300, MAX_JOURNAL = 300;
  const B = () => (typeof DATA !== 'undefined' && DATA.boutique) || { articles: [], rayons: [], mecene: [], roue: [], fidelite: [], packs: [], codes: [], jour: {} };
  const articles = () => B().articles || [];
  const article = id => articles().find(a => a.id === id) || null;
  const horloge = () => (Boutique.horloge ? Boutique.horloge() : Date.now());

  const decale = t => t - new Date(t).getTimezoneOffset() * 60000 - (B().heure || 6) * 3600000;
  const jour = (t = horloge()) => Math.floor(decale(t) / JOUR);
  const semaine = (t = horloge()) => Math.floor((jour(t) + 3) / 7);
  const mois = (t = horloge()) => { const d = new Date(decale(t)); return d.getUTCFullYear() * 12 + d.getUTCMonth(); };
  const avantChangement = (t = horloge()) => JOUR - (((decale(t) % JOUR) + JOUR) % JOUR);
  const avantSemaine = (t = horloge()) => avantChangement(t) + ((7 - ((jour(t) + 3) % 7 + 1)) % 7) * JOUR;

  function empreinte(str) {
    let h1 = 0xdeadbeef, h2 = 0x41c6ce57;
    for (const ch of String(str).trim().toUpperCase()) { const c = ch.codePointAt(0); h1 = Math.imul(h1 ^ c, 2654435761); h2 = Math.imul(h2 ^ c, 1597334677); }
    h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
    h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
    return (4294967296 * (2097151 & h2) + (h1 >>> 0)).toString(36);
  }
  const graine = s => { let h = 1779033703 ^ String(s).length; for (const c of String(s)) { h = Math.imul(h ^ c.charCodeAt(0), 3432918353); h = (h << 13) | (h >>> 19); } return h >>> 0; };
  const alea = s => { let a = graine(s); return () => { a |= 0; a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; };
  const melanger = (l, r) => { const a = l.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };

  const memoire = {};
  const stockage = {
    lire() { try { if (typeof localStorage !== 'undefined') return localStorage.getItem(CLE); } catch (e) {   } return memoire[CLE] == null ? null : memoire[CLE]; },
    ecrire(s) { try { if (typeof localStorage !== 'undefined') { localStorage.setItem(CLE, s); return true; } } catch (e) {   } memoire[CLE] = s; return true; },
    effacer() { try { if (typeof localStorage !== 'undefined') localStorage.removeItem(CLE); } catch (e) {   } delete memoire[CLE]; },
  };
  const entier = (v, min, max) => Number.isInteger(v) && v >= min && v <= max;
  const nouveauCompte = () => 'c' + Math.floor(Math.random() * 36 ** 8).toString(36).padStart(8, '0');
  const vide = () => ({ compte: nouveauCompte(), solde: 0, recu: 0, commandes: [], journal: [], codes: [], roue: { semaine: -1, tours: 0, lot: null }, mecene: { palier: 0, fin: 0, historique: [] }, fidelite: { atteints: [], remise: 0 }, teinture: { mois: -1 } });

  function valider(raw) {
    const errors = [], bad = m => errors.push(m), o = vide();
    if (raw == null) return { data: o, errors };
    if (typeof raw !== 'object' || Array.isArray(raw)) return { data: o, errors: ['boutique illisible'] };
    if (typeof raw.compte === 'string' && /^c[0-9a-z]{4,12}$/.test(raw.compte)) o.compte = raw.compte; else if (raw.compte != null) bad('boutique : compte');
    if (entier(raw.recu, 0, 1e9)) o.recu = raw.recu; else if (raw.recu != null) bad('boutique : reçu');
    if (entier(raw.solde, 0, 1e9)) o.solde = Math.min(raw.solde, o.recu); else if (raw.solde != null) bad('boutique : solde');
    if (raw.solde > o.recu) bad('boutique : solde au-delà du reçu');
    for (const c of Array.isArray(raw.commandes) ? raw.commandes : []) {
      if (!c || typeof c !== 'object' || !article(c.id) || !entier(c.prix, 0, 1e7) || !['livre', 'attente', 'rembourse'].includes(c.etat)) { bad('boutique : commande'); continue; }
      o.commandes.push({ id: c.id, prix: c.prix, etat: c.etat, date: entier(c.date, 0, 1e15) ? c.date : 0, origine: typeof c.origine === 'string' ? c.origine.slice(0, 40) : '' });
    }
    for (const e of Array.isArray(raw.journal) ? raw.journal : []) {
      if (!e || typeof e !== 'object' || !Number.isInteger(e.delta)) { bad('boutique : journal'); continue; }
      o.journal.push({ delta: e.delta, motif: typeof e.motif === 'string' ? e.motif.slice(0, 60) : '', date: entier(e.date, 0, 1e15) ? e.date : 0 });
    }
    o.commandes = o.commandes.slice(-MAX_COMMANDES); o.journal = o.journal.slice(-MAX_JOURNAL);
    if (Array.isArray(raw.codes)) o.codes = [...new Set(raw.codes.filter(x => typeof x === 'string' && x.length <= 16))];
    const r = raw.roue || {};
    if (Number.isInteger(r.semaine)) o.roue.semaine = r.semaine;
    if (entier(r.tours, 0, 10)) o.roue.tours = r.tours;
    if (r.lot && typeof r.lot === 'object' && article(r.lot.article) && entier(r.lot.remise, 1, 90)) o.roue.lot = { article: r.lot.article, remise: r.lot.remise, semaine: Number.isInteger(r.lot.semaine) ? r.lot.semaine : o.roue.semaine };
    const m = raw.mecene || {};
    if (entier(m.palier, 0, 3) && entier(m.fin, 0, 1e15)) { o.mecene.palier = m.palier; o.mecene.fin = m.fin; }
    if (Array.isArray(m.historique)) o.mecene.historique = m.historique.filter(h => h && entier(h.palier, 1, 3) && entier(h.debut, 0, 1e15) && entier(h.fin, 0, 1e15)).slice(-50);
    const f = raw.fidelite || {};
    if (Array.isArray(f.atteints)) o.fidelite.atteints = f.atteints.filter(s => (B().fidelite || []).some(p => p.seuil === s) && s <= o.recu);
    if (entier(f.remise, 0, 90)) o.fidelite.remise = f.remise;
    if (raw.teinture && Number.isInteger(raw.teinture.mois)) o.teinture.mois = raw.teinture.mois;
    return { data: o, errors };
  }

  let registre = null, derniersErreurs = [];
  function charger(raw) {
    if (raw === undefined) { const s = stockage.lire(); try { raw = s ? JSON.parse(s) : null; } catch (e) { raw = null; derniersErreurs = ['boutique illisible']; } }
    const v = valider(raw);
    registre = v.data; derniersErreurs = v.errors;
    return registre;
  }
  const etat = () => registre || charger();
  const enregistrer = () => stockage.ecrire(JSON.stringify(etat()));
  function effacer() { stockage.effacer(); registre = vide(); }
  const noter = (delta, motif) => { const r = etat(); r.journal.push({ delta, motif: String(motif || '').slice(0, 60), date: horloge() }); if (r.journal.length > MAX_JOURNAL) r.journal.splice(0, r.journal.length - MAX_JOURNAL); };

  const mecene = (t = horloge()) => { const m = etat().mecene; return m.palier && m.fin > t ? { palier: m.palier, fin: m.fin, def: (B().mecene || []).find(x => x.palier === m.palier) } : null; };
  const avantage = (nom, t) => { const m = mecene(t); return !!(m && m.def && m.def.avantages.includes(nom)); };

  const cosmetiquesDe = a => !a || !a.livraison ? [] : a.livraison.type === 'cosmetique' ? [a.livraison.id] : a.livraison.type === 'pack' ? a.livraison.ids.slice() : [];
  const garde = () => (typeof Garderobe === 'object' ? Garderobe : null);
  const possede = a => { const l = cosmetiquesDe(a); return l.length > 0 && !!garde() && l.every(id => garde().possede(id)); };
  const enVente = a => !!(a && a.livraison && !a.bientot);

  const vendables = () => articles().filter(a => enVente(a) && a.livraison.type !== 'mecene');
  function boutiqueDuJour(t = horloge()) {
    const J = B().jour || {}, r = alea('jour:' + jour(t));
    return melanger(vendables(), r).slice(0, J.nombre || 6).map(a => ({ article: a, remise: (J.remises || [20])[Math.floor(r() * (J.remises || [20]).length)] }));
  }
  function offresPerso(t = horloge()) {
    const J = B().jour || {}, deja = new Set(boutiqueDuJour(t).map(x => x.article.id)), r = alea('perso:' + etat().compte + ':' + jour(t));
    const l = melanger(vendables().filter(a => !deja.has(a.id) && !possede(a)), r).slice(0, J.personnelles || 2);
    return l.map((a, i) => ({ article: a, remise: (J.remisesPerso || [35])[i % (J.remisesPerso || [35]).length], perso: true }));
  }
  function prix(a, t = horloge()) {
    if (!a) return null;
    const cand = [[0, '']];
    const j = boutiqueDuJour(t).find(x => x.article.id === a.id); if (j) cand.push([j.remise, 'boutique du jour']);
    const p = offresPerso(t).find(x => x.article.id === a.id); if (p) cand.push([p.remise, 'offre personnelle']);
    const lot = lotRoue(t); if (lot && lot.article === a.id) cand.push([lot.remise, 'roue de la semaine']);
    const [remise, origine] = cand.sort((x, y) => y[0] - x[0])[0];
    const net = remise ? Math.max(1, Math.round(a.prix * (100 - remise) / 100)) : a.prix;
    return { prix: net, ancien: remise ? a.prix : null, remise, origine };
  }

  function crediter(n, motif) {
    if (!Number.isInteger(n) || n <= 0) return [];
    const r = etat();
    r.solde += n; r.recu += n; noter(n, motif);
    const dons = fidelite();
    enregistrer();
    return dons;
  }
  function fidelite() {
    const r = etat(), dons = [];
    for (const p of B().fidelite || []) {
      if (r.recu < p.seuil || r.fidelite.atteints.includes(p.seuil)) continue;
      r.fidelite.atteints.push(p.seuil);
      if (p.remise) { r.fidelite.remise = Math.max(r.fidelite.remise, p.remise); dons.push({ palier: p, remise: p.remise }); }
      if (p.article) { const l = livrer(article(p.article), 0, 'fidelite'); dons.push({ palier: p, article: article(p.article), livre: l }); }
    }
    return dons;
  }

  function livrer(a, prixPaye, origine, t = horloge()) {
    const r = etat(), out = [];
    if (!a || !a.livraison) return out;
    if (a.livraison.type === 'mecene') {
      const m = r.mecene, actif = m.palier && m.fin > t;
      const debut = actif && m.palier === a.livraison.palier ? m.fin : t;
      const h = m.historique[m.historique.length - 1];
      if (actif && m.palier !== a.livraison.palier && h) h.fin = t;
      m.palier = a.livraison.palier; m.fin = debut + a.livraison.jours * JOUR;
      if (actif && h && h.palier === m.palier && debut === h.fin) h.fin = m.fin; else m.historique.push({ palier: m.palier, debut: t, fin: m.fin });
      if (m.historique.length > 50) m.historique.splice(0, m.historique.length - 50);
    } else for (const id of cosmetiquesDe(a)) if (garde()) out.push(...garde().donner(id, 'boutique:' + a.id));
    r.commandes.push({ id: a.id, prix: prixPaye, etat: 'livre', date: t, origine: origine || '' });
    if (r.commandes.length > MAX_COMMANDES) r.commandes.splice(0, r.commandes.length - MAX_COMMANDES);
    return out;
  }

  function devis(ids, t = horloge()) {
    const r = etat(), vus = new Set(), lignes = [];
    for (const id of ids || []) {
      const a = article(id), refus = !a ? 'article inconnu' : a.bientot ? 'bientôt en vente' : !a.livraison ? 'pas en vente' : vus.has(id) && a.limite ? 'une seule fois' : possede(a) ? 'déjà dans ta Garde-robe' : '';
      vus.add(id);
      const p = a ? prix(a, t) : { prix: 0 };
      lignes.push(Object.assign({ article: a, refus }, p));
    }
    const mecenes = lignes.filter(l => l.article && l.article.livraison && l.article.livraison.type === 'mecene');
    if (mecenes.length > 1) for (const l of mecenes.slice(1)) l.refus = l.refus || 'un seul Mécène à la fois';
    const brut = lignes.filter(l => !l.refus).reduce((s, l) => s + l.prix, 0);
    const remiseCompte = r.fidelite.remise && brut ? Math.round(brut * r.fidelite.remise / 100) : 0;
    return { lignes, brut, remiseCompte, remisePct: remiseCompte ? r.fidelite.remise : 0, total: brut - remiseCompte };
  }

  function acheter(ids, t = horloge()) {
    const r = etat(), d = devis(ids, t);
    if (!d.lignes.length) return { ok: false, raison: 'Le panier est vide.' };
    const refus = d.lignes.find(l => l.refus);
    if (refus) return { ok: false, raison: `${refus.article ? refus.article.nom : 'Un article'} : ${refus.refus}.` };
    if (r.solde < d.total) return { ok: false, raison: `Il te manque ${d.total - r.solde} Éclats.` };
    const livres = [];
    r.solde -= d.total;
    noter(-d.total, `achat de ${d.lignes.length} article${d.lignes.length > 1 ? 's' : ''}`);
    if (d.remiseCompte) r.fidelite.remise = 0;
    const lot = lotRoue(t);
    for (const l of d.lignes) {
      const part = d.brut ? Math.round(l.prix * d.total / d.brut) : 0;
      livres.push(...livrer(l.article, part, l.origine, t));
      if (lot && lot.article === l.article.id) r.roue.lot = null;
    }
    enregistrer();
    return { ok: true, commandes: d.lignes.length, livres, total: d.total };
  }

  function majRoue(t) { const r = etat().roue, s = semaine(t); if (r.semaine !== s) { r.semaine = s; r.tours = 0; if (r.lot && r.lot.semaine !== s) r.lot = null; } return r; }
  const toursMax = t => 1 + (avantage('roue', t) ? 1 : 0);
  const toursRestants = (t = horloge()) => Math.max(0, toursMax(t) - majRoue(t).tours);
  const lotRoue = (t = horloge()) => { const r = etat().roue; return r.lot && r.lot.semaine === semaine(t) ? r.lot : null; };
  const eligiblesRoue = () => vendables().filter(a => a.livraison.type === 'cosmetique' && a.prix >= 100 && !possede(a));
  function tourner(t = horloge(), rng = Math.random) {
    if (!toursRestants(t)) return { ok: false, raison: 'Tour déjà utilisé cette semaine.' };
    const S = B().roue || [], total = S.reduce((s, x) => s + x.poids, 0);
    let x = rng() * total, i = 0;
    while (i < S.length - 1 && x >= S[i].poids) { x -= S[i].poids; i++; }
    const sec = S[i], r = majRoue(t), elig = eligiblesRoue();
    r.tours++;
    let res = { ok: true, secteur: i, lot: sec.lot, valeur: sec.valeur, jackpot: !!sec.jackpot };
    if (sec.lot === 'eclats' || !elig.length) { const n = sec.lot === 'eclats' ? sec.valeur : 50; res.lot = 'eclats'; res.valeur = n; res.dons = crediter(n, 'roue de la semaine'); }
    else if (sec.lot === 'cadeau') { const pas = elig.filter(a => a.prix <= 400); const a = (pas.length ? pas : elig)[Math.floor(rng() * (pas.length ? pas : elig).length)]; res.article = a; res.livres = livrer(a, 0, 'roue de la semaine', t); }
    else { const a = elig[Math.floor(rng() * elig.length)]; r.lot = { article: a.id, remise: sec.valeur, semaine: semaine(t) }; res.article = a; }
    enregistrer();
    return res;
  }

  const teintures = () => vendables().filter(a => a.livraison.type === 'cosmetique' && (garde() ? (garde().get(a.livraison.id) || {}).type === 'teinture' : /teinture/.test(a.id)));
  const teintureDuMois = (t = horloge()) => { const l = teintures(); return l.length ? l[mois(t) % l.length] : null; };
  const teintureDisponible = (t = horloge()) => avantage('teinture', t) && etat().teinture.mois !== mois(t) && !!teintureDuMois(t);
  function reclamerTeinture(t = horloge()) {
    if (!avantage('teinture', t)) return { ok: false, raison: 'Réservé au Mécène Tisseur.' };
    if (etat().teinture.mois === mois(t)) return { ok: false, raison: 'Déjà reçue ce mois-ci.' };
    const a = teintureDuMois(t);
    if (!a) return { ok: false, raison: 'Aucune teinture ce mois-ci.' };
    etat().teinture.mois = mois(t);
    const l = possede(a) ? [] : livrer(a, 0, 'teinture du mois', t);
    if (possede(a) && !l.length) crediter(Math.round(a.prix / 2), 'teinture du mois déjà possédée');
    enregistrer();
    return { ok: true, article: a, livres: l };
  }

  function utiliserCode(code) {
    const e = empreinte(code), r = etat(), c = (B().codes || []).find(x => x.empreinte === e);
    if (!String(code || '').trim()) return { ok: false, raison: 'Écris un code.' };
    if (!c) return { ok: false, raison: 'Ce code n\'existe pas.' };
    if (r.codes.includes(e)) return { ok: false, raison: 'Code déjà utilisé sur ce compte.' };
    r.codes.push(e);
    const res = { ok: true, texte: c.texte || '', eclats: c.eclats || 0, dons: [] };
    if (c.eclats) res.dons = crediter(c.eclats, 'code cadeau');
    if (c.article && article(c.article)) res.livres = livrer(article(c.article), 0, 'code cadeau');
    enregistrer();
    return res;
  }

  return {
    CLE, horloge: null, empreinte, jour, semaine, mois, avantChangement, avantSemaine,
    article, articles, valider, charger, etat, enregistrer, effacer, erreurs: () => derniersErreurs.slice(),
    solde: () => etat().solde, recu: () => etat().recu, commandes: () => etat().commandes.slice().reverse(), journal: () => etat().journal.slice().reverse(),
    mecene, avantage, possede, enVente, cosmetiquesDe, boutiqueDuJour, offresPerso, prix, devis, acheter, crediter, livrer,
    toursRestants, toursMax, lotRoue, tourner, eligiblesRoue, teintureDuMois, teintureDisponible, reclamerTeinture, utiliserCode,
  };
})();
