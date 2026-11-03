const Garderobe = (() => {
  const CLE = 'veylan.garderobe';
  const TYPES = ['teinture', 'lueur', 'aura', 'blason', 'emote', 'theme'];
  const TYPES_PORTES = ['teinture', 'lueur', 'aura', 'blason', 'theme'];
  const SOURCES = ['succes', 'boss', 'veille', 'quete', 'artisanat', 'collection', 'evenement'];
  const RARETES = ['commun', 'rare', 'epique', 'legendaire'];
  const MAX_LOOKS = 5;
  const MAX_JOURNAL = 400;
  const NOM_MAX = 24;
  const ID = /^[a-z0-9_]{1,40}$/;

  const defs = () => (typeof DATA !== 'undefined' && DATA.content && DATA.content.cosmetiques) || [];
  const get = id => (typeof id === 'string' ? defs().find(c => c.id === id) || null : null);
  const collections = () => (typeof DATA !== 'undefined' && DATA.content && DATA.content.collections) || [];
  const collection = id => collections().find(k => k.id === id) || null;
  const horloge = () => (Garderobe.horloge ? Garderobe.horloge() : Date.now());

  const memoire = {};
  const stockage = {
    lire() { try { if (typeof localStorage !== 'undefined') return localStorage.getItem(CLE); } catch (e) {   } return memoire[CLE] == null ? null : memoire[CLE]; },
    ecrire(s) { try { if (typeof localStorage !== 'undefined') { localStorage.setItem(CLE, s); return true; } } catch (e) {   } memoire[CLE] = s; return true; },
    effacer() { try { if (typeof localStorage !== 'undefined') localStorage.removeItem(CLE); } catch (e) {   } delete memoire[CLE]; },
  };

  function valider(raw) {
    const errors = [];
    const bad = m => errors.push(m);
    if (raw != null && (typeof raw !== 'object' || Array.isArray(raw))) { bad('garde-robe illisible'); raw = null; }
    const r = raw || {};
    for (const k of Object.keys(r)) if (k !== 'possedes' && k !== 'journal') bad(`garde-robe : champ ${k}`);
    const possedes = [];
    if (r.possedes != null && !Array.isArray(r.possedes)) bad('garde-robe : possédés');
    for (const id of Array.isArray(r.possedes) ? r.possedes : []) {
      if (!get(id)) { bad(`garde-robe : cosmétique inconnu ${typeof id === 'string' ? id.slice(0, 40) : '?'}`); continue; }
      if (!possedes.includes(id)) possedes.push(id);
    }
    const journal = [];
    if (r.journal != null && !Array.isArray(r.journal)) bad('garde-robe : journal');
    for (const e of Array.isArray(r.journal) ? r.journal : []) {
      if (!e || typeof e !== 'object' || !possedes.includes(e.id)) { bad('garde-robe : entrée du journal'); continue; }
      const date = Number.isFinite(e.date) && e.date >= 0 ? Math.floor(e.date) : 0;
      journal.push({ id: e.id, origine: typeof e.origine === 'string' ? e.origine.slice(0, 60) : '', date });
    }
    return { data: { possedes, journal: journal.slice(-MAX_JOURNAL) }, errors };
  }

  let registre = null;
  let version = 0;
  let derniersErreurs = [];
  const vide = () => ({ possedes: [], journal: [] });

  function charger(raw) {
    if (raw === undefined) { const s = stockage.lire(); try { raw = s ? JSON.parse(s) : null; } catch (e) { raw = null; derniersErreurs = ['garde-robe illisible']; } }
    const v = valider(raw);
    registre = v.data;
    derniersErreurs = v.errors;
    version++;
    return registre;
  }
  function etat() { return registre || charger(); }
  function enregistrer() { return stockage.ecrire(JSON.stringify(etat())); }
  function effacer() { stockage.effacer(); registre = vide(); version++; }

  const possede = id => etat().possedes.includes(id);
  const possedes = () => etat().possedes.slice();
  const journal = () => etat().journal.slice();
  const quand = id => { const e = etat().journal.find(x => x.id === id); return e ? e.date : null; };

  function donner(id, origine) {
    const c = get(id);
    if (!c || possede(id)) return [];
    const r = etat();
    r.possedes.push(id);
    r.journal.push({ id, origine: typeof origine === 'string' ? origine.slice(0, 60) : '', date: horloge() });
    if (r.journal.length > MAX_JOURNAL) r.journal.splice(0, r.journal.length - MAX_JOURNAL);
    version++;
    const out = [{ cosmetique: c, origine: origine || '', collection: null }];
    for (const k of collections()) {
      if (!k.recompense || possede(k.recompense) || !(k.cosmetiques || []).length) continue;
      if (!k.cosmetiques.every(possede)) continue;
      for (const e of donner(k.recompense, 'collection:' + k.id)) out.push(e.collection ? e : Object.assign(e, { collection: k }));
    }
    enregistrer();
    return out;
  }

  function pourSource(genre, id) {
    return defs().filter(c => c.source && c.source.genre === genre && (Array.isArray(c.source.id) ? c.source.id.includes(id) : c.source.id === id));
  }

  function texteSource(c) {
    const s = (c && c.source) || {};
    const ach = id => { const a = ((DATA.content && DATA.content.achievements) || []).find(x => x.id === id); return a ? a.name : id; };
    switch (s.genre) {
      case 'succes': return `Succès : ${ach(s.id)}`;
      case 'veille': return `Veille du jour : ${ach(s.id)}`;
      case 'boss': { const m = DATA.monsters && DATA.monsters[s.id]; return `Boss : ${m ? m.name : s.id}, première victoire`; }
      case 'quete': {
        if (Array.isArray(s.id)) return 'Quête : le geste de ta Voie, au Temple des Voies';
        const q = ((DATA.content && DATA.content.quests) || []).find(x => x.id === s.id);
        return `Quête : ${q ? q.name : s.id}`;
      }
      case 'artisanat': { const d = typeof Items !== 'undefined' && Items.get(s.id); return `Artisanat : ${d ? d.name : s.id}, fabriquée par le tailleur, à utiliser`; }
      case 'collection': { const k = collection(s.id); return `Collection : ${k ? k.nom : s.id}, complète`; }
      case 'evenement': return 'Un événement';
      default: return 'En jouant';
    }
  }

  const porteDefaut = () => { const p = {}; for (const t of TYPES_PORTES) p[t] = null; return p; };

  function nettoyerPorte(porte, garderobe) {
    const g = garderobe || etat();
    const errors = [];
    const out = porteDefaut();
    if (porte == null) return { porte: out, errors };
    if (typeof porte !== 'object' || Array.isArray(porte)) return { porte: out, errors: ['tenue illisible'] };
    for (const k of Object.keys(porte)) {
      if (!TYPES_PORTES.includes(k)) { errors.push(`tenue : champ ${k}`); continue; }
      const id = porte[k];
      if (id == null) continue;
      const c = get(id);
      if (!c || c.type !== k) { errors.push(`tenue : ${k}`); continue; }
      if (g.possedes.includes(id)) out[k] = id;
    }
    return { porte: out, errors };
  }

  function nettoyerLooks(list, garderobe) {
    const errors = [];
    if (list == null) return { looks: [], errors };
    if (!Array.isArray(list)) return { looks: [], errors: ['looks illisibles'] };
    const looks = [];
    for (const l of list.slice(0, MAX_LOOKS)) {
      if (!l || typeof l !== 'object') { errors.push('look illisible'); continue; }
      const p = nettoyerPorte(l.porte, garderobe);
      for (const e of p.errors) errors.push('look : ' + e);
      looks.push({ nom: typeof l.nom === 'string' ? l.nom.slice(0, NOM_MAX) : `Look ${looks.length + 1}`, porte: p.porte });
    }
    if (list.length > MAX_LOOKS) errors.push('looks : plus de cinq');
    return { looks, errors };
  }

  const porteDe = ch => { if (!ch.porte || typeof ch.porte !== 'object') ch.porte = porteDefaut(); for (const t of TYPES_PORTES) if (!(t in ch.porte)) ch.porte[t] = null; return ch.porte; };

  function porter(ch, id, garderobe) {
    const g = garderobe || etat();
    const c = get(id);
    if (!c) return { ok: false, raison: 'Ce cosmétique n\'existe pas.' };
    if (!TYPES_PORTES.includes(c.type)) return { ok: false, raison: 'Une émote ne se porte pas : elle est au menu des émotes.' };
    if (!g.possedes.includes(id)) return { ok: false, raison: `Pas encore dans ta Garde-robe. ${texteSource(c)}.` };
    porteDe(ch)[c.type] = id;
    return { ok: true, type: c.type, cosmetique: c };
  }
  function retirer(ch, type) {
    if (!TYPES_PORTES.includes(type)) return { ok: false, raison: 'Type inconnu.' };
    porteDe(ch)[type] = null;
    return { ok: true, type };
  }
  const porteId = (ch, type) => (ch.porte && typeof ch.porte === 'object' ? ch.porte[type] || null : null);

  const looksDe = ch => { if (!Array.isArray(ch.ensemblesLook)) ch.ensemblesLook = []; return ch.ensemblesLook; };
  function enregistrerLook(ch, nom, i) {
    const looks = looksDe(ch);
    const entree = { nom: (typeof nom === 'string' && nom.trim() ? nom.trim() : `Look ${(Number.isInteger(i) ? i : looks.length) + 1}`).slice(0, NOM_MAX), porte: Object.assign(porteDefaut(), porteDe(ch)) };
    if (Number.isInteger(i) && i >= 0 && i < looks.length) { looks[i] = entree; return { ok: true, i }; }
    if (looks.length >= MAX_LOOKS) return { ok: false, raison: `Cinq looks au plus : supprime-en un d'abord.` };
    looks.push(entree);
    return { ok: true, i: looks.length - 1 };
  }
  function mettreLook(ch, i, garderobe) {
    const g = garderobe || etat();
    const l = looksDe(ch)[i];
    if (!l) return { ok: false, raison: 'Ce look n\'existe pas.' };
    const manquants = [];
    const porte = porteDe(ch);
    for (const t of TYPES_PORTES) {
      const id = l.porte ? l.porte[t] : null;
      if (id && (!get(id) || !g.possedes.includes(id))) { manquants.push(id); continue; }
      porte[t] = id || null;
    }
    return { ok: true, i, manquants };
  }
  function supprimerLook(ch, i) {
    const looks = looksDe(ch);
    if (!looks[i]) return { ok: false, raison: 'Ce look n\'existe pas.' };
    looks.splice(i, 1);
    return { ok: true };
  }
  function renommerLook(ch, i, nom) {
    const l = looksDe(ch)[i];
    if (!l) return { ok: false, raison: 'Ce look n\'existe pas.' };
    l.nom = (typeof nom === 'string' && nom.trim() ? nom.trim() : l.nom).slice(0, NOM_MAX);
    return { ok: true };
  }

  function lookPorte(ch, garderobe, essai) {
    const g = garderobe || etat();
    const base = ch && ch.look && Array.isArray(ch.look.couleurs) ? ch.look : (typeof Character !== 'undefined' ? Character.defaultLook(ch && ch.classId) : { tete: 0, couleurs: [] });
    const couleurs = base.couleurs.slice();
    const porte = essai || (ch && ch.porte) || {};
    const porteOk = t => { const id = porte[t]; const c = id ? get(id) : null; return c && c.type === t && (essai || g.possedes.includes(id)) ? c : null; };
    const teinture = porteOk('teinture'), lueur = porteOk('lueur'), aura = porteOk('aura'), blason = porteOk('blason'), theme = porteOk('theme');
    if (teinture && teinture.data && Array.isArray(teinture.data.couleurs)) {
      for (let i = 0; i < 3 && i < teinture.data.couleurs.length; i++) if (couleurs.length > 2 + i) couleurs[2 + i] = teinture.data.couleurs[i];
    }
    if (lueur && lueur.data && lueur.data.couleur && couleurs.length > 5) couleurs[5] = lueur.data.couleur;
    return { look: { tete: base.tete, couleurs }, teinture, lueur, aura, blason, theme };
  }

  function etatCollections(garderobe) {
    const g = garderobe || etat();
    return collections().map(k => {
      const ids = k.cosmetiques || [];
      const n = ids.filter(id => g.possedes.includes(id)).length;
      return { collection: k, possedes: n, total: ids.length, pourcent: ids.length ? Math.round(100 * n / ids.length) : 0, complete: ids.length > 0 && n === ids.length, recompense: get(k.recompense) };
    });
  }

  const themes = garderobe => { const g = garderobe || etat(); return defs().filter(c => c.type === 'theme' && g.possedes.includes(c.id) && c.data && Array.isArray(c.data.theme)).map(c => c.data.theme.slice()); };
  const themeDe = id => defs().find(c => c.type === 'theme' && c.data && Array.isArray(c.data.theme) && c.data.theme[0] === id) || null;
  const emotes = garderobe => { const g = garderobe || etat(); return defs().filter(c => c.type === 'emote' && g.possedes.includes(c.id) && c.data && c.data.emote).map(c => [c.data.emote, c.data.label || c.nom]); };
  function filtrer(opts, garderobe) {
    const g = garderobe || etat();
    opts = opts || {};
    return defs().filter(c => (!opts.type || c.type === opts.type)
      && (opts.filtre !== 'possedes' || g.possedes.includes(c.id))
      && (opts.filtre !== 'aobtenir' || !g.possedes.includes(c.id))
      && (!opts.source || (c.source && c.source.genre === opts.source)));
  }
  const RARETE_LABEL = { commun: 'Commun', rare: 'Rare', epique: 'Épique', legendaire: 'Légendaire' };
  const TYPE_LABEL = { teinture: 'Teintures', lueur: 'Lueurs', aura: 'Auras', blason: 'Blasons', emote: 'Émotes', theme: 'Thèmes' };
  const SOURCE_LABEL = { succes: 'Succès', boss: 'Boss', veille: 'Veille du jour', quete: 'Quêtes', artisanat: 'Artisanat', collection: 'Collections', evenement: 'Événements' };

  return {
    CLE, TYPES, TYPES_PORTES, SOURCES, RARETES, MAX_LOOKS, ID, RARETE_LABEL, TYPE_LABEL, SOURCE_LABEL,
    defs, get, collections, collection, valider, charger, etat, enregistrer, effacer, erreurs: () => derniersErreurs.slice(),
    possede, possedes, journal, quand, donner, pourSource, texteSource, version: () => version,
    porteDefaut, nettoyerPorte, nettoyerLooks, porter, retirer, porteId,
    enregistrerLook, mettreLook, supprimerLook, renommerLook, lookPorte, etatCollections,
    themes, themeDe, emotes, filtrer,
    horloge: null,
  };
})();
