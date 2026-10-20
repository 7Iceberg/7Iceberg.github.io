// Sauvegarde locale (navigateur) : jusqu'à cinq personnages par appareil, un par emplacement,
// chacun exportable en texte.
//
// Intégrité, côté client : tout ce qui est dans le navigateur peut être modifié, donc ces mesures
// arrêtent la triche facile et protègent le joueur, sans prétendre à plus. Le vrai juge sera le
// serveur (docs/ANTI-TRICHE.md).
//  - validate() vérifie chaque champ : types, bornes, contenu existant, invariant des points
//    (5 par niveau), titres réellement gagnés, récompenses de succès remises une fois, apparence
//    et tutoriel. Une sauvegarde locale fautive est réparée et marquée ; un code d'import fautif
//    est refusé.
//  - Une empreinte détecte l'édition à la main ; un numéro de séquence propre à chaque personnage
//    refuse de réimporter un code plus ancien que sa partie en cours (retour en arrière après un
//    boss). Jouer un personnage ne fait pas vieillir le code d'un autre, et supprimer un
//    personnage ne rouvre pas la porte à ses vieux codes.
//
// Rangement : `veylan.perso.<uid>` garde l'enveloppe signée d'un personnage { v, seq, t, character,
// h }, `veylan.seq.<uid>` son dernier numéro de séquence (gardé après une suppression),
// `veylan.persos` l'ordre des emplacements et le dernier joué. L'ancienne sauvegarde unique
// (`veylan.save.v1`) passe dans un emplacement au premier accès, signature comprise.
const Save = (() => {
  const LEGACY_KEY = 'veylan.save.v1';
  const LEGACY_SEQ = 'veylan.seq';
  const INDEX_KEY = 'veylan.persos';
  const SLOT = 'veylan.perso.';
  const SEQ = 'veylan.seq.';
  const MAX = 5;
  const UID = /^[a-z0-9]{6,24}$/;
  const SEL = 'veylan|fil|voile|2026';
  let suspended = false;
  let migrated = false;

  // Hachage 53 bits (cyrb53), synchrone et court : une empreinte, pas un secret.
  function cyrb53(str, seed) {
    let h1 = 0xdeadbeef ^ (seed || 0), h2 = 0x41c6ce57 ^ (seed || 0);
    for (let i = 0; i < str.length; i++) { const c = str.charCodeAt(i); h1 = Math.imul(h1 ^ c, 2654435761); h2 = Math.imul(h2 ^ c, 1597334677); }
    h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
    h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
    return (4294967296 * (2097151 & h2) + (h1 >>> 0)).toString(36);
  }
  const sign = (seq, json) => cyrb53(seq + '|' + json + '|' + SEL);

  // Le stockage peut manquer (navigation privée, quota, réglages) : rien ici ne doit lever.
  const get = k => { try { return localStorage.getItem(k); } catch (e) { return null; } };
  const set = (k, v) => { try { localStorage.setItem(k, v); return true; } catch (e) { return false; } };
  const del = k => { try { localStorage.removeItem(k); } catch (e) { /* rien */ } };
  const parse = s => { try { return s ? JSON.parse(s) : null; } catch (e) { return null; } };
  const newUid = () => (Date.now().toString(36) + Math.random().toString(36).slice(2, 10)).slice(0, 20);

  // Dernier numéro de séquence écrit pour ce personnage.
  const seqOf = uid => Number(get(SEQ + uid)) || 0;

  // ----- Validation -----
  const isInt = (v, min, max) => Number.isInteger(v) && v >= (min == null ? -Infinity : min) && v <= (max == null ? Infinity : max);
  const ALLOWED = new Set(['classId', 'name', 'gender', 'level', 'xp', 'statPoints', 'stats', 'equipment', 'inventory', 'fils', 'hp', 'titles', 'title', 'quests', 'counters', 'achievements', 'achClaimed', 'veille', 'pos', 'relay', 'relays', 'dungeon', 'autoStats', 'playTime', 'knots', 'ensembles', 'fight', 'mapTimers', 'flags', 'v', 'uid', 'voie', 'scrolls', 'faction', 'tuto']);
  // Rangs des sorts (docs/SORTS.md) : { idDeSort: rang }, points de sort restants, répartition automatique.
  for (const k of ['spellRanks', 'spellPoints', 'autoSpells']) ALLOWED.add(k);
  // Création de personnage (js/accueil.js) : l'apparence.
  ALLOWED.add('look');

  // Rangs des sorts : des sorts de la classe seulement, des rangs entiers de 1 à 5, un rang 2 ou plus
  // sur un sort débloqué, chaque rang au niveau qu'il demande (le 5 au niveau 50), et l'invariant
  // points placés + points restants = niveau − 1. Une sauvegarde d'avant les rangs n'a ni l'un ni
  // l'autre champ (une d'avant le format 3 n'en a pas de légitime) : le personnage les reçoit au
  // chargement (js/character.js), sans faute. Au moindre écart, tous les sorts repartent du rang 1
  // avec tous leurs points.
  function validateSpellRanks(o, bad, oldFormat) {
    if (o.autoSpells !== undefined) o.autoSpells = !!o.autoSpells;
    if (oldFormat) { delete o.spellRanks; delete o.spellPoints; }
    if (o.spellRanks === undefined && o.spellPoints === undefined) return;
    const R = DATA.spellRanks;
    const ranks = {};
    let ok = !!o.spellRanks && typeof o.spellRanks === 'object' && !Array.isArray(o.spellRanks);
    if (ok) for (const id of Object.keys(o.spellRanks)) {
      const r = o.spellRanks[id], unlock = Character.unlockLevel(o.classId, id);
      if (!isInt(r, 1, R.max) || !Number.isFinite(unlock) || (r > 1 && unlock > o.level) || R.levels[r - 1] > o.level) { ok = false; break; }
      if (r > 1) ranks[id] = r;
    }
    if (!ok || !isInt(o.spellPoints, 0, Character.MAX_LEVEL) || Character.spellPointsFor(ranks) + o.spellPoints !== o.level - 1) {
      bad('rangs des sorts');
      o.spellRanks = {};
      o.spellPoints = o.level - 1;
      return;
    }
    o.spellRanks = ranks;
  }

  // Titres renommés : la sauvegarde garde le texte affiché du titre, pas un identifiant. Quand un
  // nom affiché change (la famille Pilou devenue les Glyms, docs/MONSTRES.md), l'ancien texte est
  // remplacé par le nouveau au chargement, avant la validation : une partie d'avant le renommage
  // garde ses titres, sans faute ni marque. La sauvegarde suivante écrit le nouveau nom.
  const TITRES_RENOMMES = new Map([['Fléau des Pilous', 'Fléau des Glyms']]);
  function migrerTitres(o) {
    if (Array.isArray(o.titles)) o.titles = o.titles.map(t => (TITRES_RENOMMES.has(t) ? TITRES_RENOMMES.get(t) : t));
    if (TITRES_RENOMMES.has(o.title)) o.title = TITRES_RENOMMES.get(o.title);
  }

  // Renvoie { errors, data } : `data` est une copie corrigée (champs fautifs remis à une valeur sûre).
  function validate(raw) {
    const errors = [];
    const bad = (msg) => errors.push(msg);
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return { errors: ['sauvegarde illisible'], data: null };
    const o = {};
    for (const k of Object.keys(raw)) { if (ALLOWED.has(k)) o[k] = raw[k]; else bad(`champ inconnu ${k}`); }
    migrerTitres(o);
    if (!DATA.classes[o.classId]) return { errors: errors.concat('classe inconnue'), data: null };
    o.name = typeof o.name === 'string' ? o.name.slice(0, 16) : 'Veilleur';
    if (!isInt(o.level, 1, Character.MAX_LEVEL)) { bad('niveau'); o.level = Math.max(1, Math.min(Character.MAX_LEVEL, Math.floor(Number(o.level)) || 1)); }
    if (!isInt(o.xp, 0) || (o.level < Character.MAX_LEVEL && o.xp >= Character.xpToNext(o.level))) { bad('expérience'); o.xp = 0; }
    // Caractéristiques : entiers positifs, vitalité par 3, et 5 points par niveau au total.
    const stats = { vita: 0, sagesse: 0, force: 0, intel: 0, chance: 0, agi: 0 };
    let statsOk = o.stats && typeof o.stats === 'object';
    for (const k in stats) { const v = statsOk ? o.stats[k] : 0; if (v == null) continue; if (!isInt(v, 0, 2000)) statsOk = false; else stats[k] = v; }
    if (!isInt(o.statPoints, 0, 5 * Character.MAX_LEVEL)) statsOk = false;
    // Avant le format 3, les coûts étaient autres : ces points sont rendus au chargement, sans faute.
    const oldFormat = !(raw.v >= 3);
    if (oldFormat) { for (const k in stats) stats[k] = 0; o.statPoints = 5 * (o.level - 1); }
    else if (!statsOk || Character.spentFor(stats) + o.statPoints !== 5 * (o.level - 1)) {
      bad('caractéristiques');
      for (const k in stats) stats[k] = 0;
      o.statPoints = 5 * (o.level - 1);
    }
    o.stats = stats;
    // Parchemins : des entiers de 0 à 50 par caractéristique.
    const scrolls = { vita: 0, sagesse: 0, force: 0, intel: 0, chance: 0, agi: 0 };
    if (o.scrolls && typeof o.scrolls === 'object') for (const k in scrolls) { const v = o.scrolls[k]; if (v == null) continue; if (isInt(v, 0, DATA.rules.scrollMax)) scrolls[k] = v; else bad(`parchemin ${k}`); }
    o.scrolls = scrolls;
    // Inventaire : objets existants, quantités entières.
    const inv = {};
    if (o.inventory && typeof o.inventory === 'object') for (const id of Object.keys(o.inventory)) {
      const n = o.inventory[id];
      if (!Items.get(id)) { bad(`objet inconnu ${id}`); continue; }
      if (!isInt(n, 1, 9999)) { bad(`quantité ${id}`); continue; }
      inv[id] = n;
    }
    o.inventory = inv;
    // Équipement : objet existant, bon emplacement, niveau atteint ; sinon il retourne au sac.
    const eq = { coiffe: null, cape: null, amulette: null, anneau1: null, anneau2: null, ceinture: null, bottes: null, arme: null };
    if (o.equipment && typeof o.equipment === 'object') for (const slot of Object.keys(eq)) {
      const id = o.equipment[slot];
      if (id == null) continue;
      const d = typeof id === 'string' && Items.get(id);
      const want = slot === 'arme' ? 'arme' : slot.replace(/\d$/, '');
      if (!d || (d.slot !== want && !(slot === 'arme' && d.kind === 'weapon'))) { bad(`équipement ${slot}`); continue; }
      if (d.level > o.level) { bad(`niveau de ${id}`); inv[id] = (inv[id] || 0) + 1; continue; }
      eq[slot] = id;
    }
    o.equipment = eq;
    if (!isInt(o.fils, 0, 1e9)) { bad('Fils'); o.fils = 0; }
    // Compteurs.
    const c = o.counters && typeof o.counters === 'object' ? o.counters : {};
    const counters = Character.defaults().counters;
    for (const k of ['fights', 'wins', 'crafts', 'gathers', 'filsEarned', 'questsDone']) { if (c[k] == null) continue; if (isInt(c[k], 0, 1e9)) counters[k] = c[k]; else bad(`compteur ${k}`); }
    if (counters.wins > counters.fights) { bad('victoires'); counters.wins = counters.fights; }
    if (o.fils > counters.filsEarned) { bad('Fils au-delà des gains'); o.fils = counters.filsEarned; }
    for (const k of ['kills', 'feats']) if (c[k] && typeof c[k] === 'object') for (const id of Object.keys(c[k])) { if (isInt(c[k][id], 0, 1e9)) counters[k][id] = c[k][id]; else bad(`compteur ${k}.${id}`); }
    for (const k of ['maps', 'dungeons', 'bosses']) if (Array.isArray(c[k])) counters[k] = [...new Set(c[k].filter(x => typeof x === 'string'))];
    counters.maps = counters.maps.filter(id => World.mapDef(id));
    counters.dungeons = counters.dungeons.filter(id => World.dungeonDef(id));
    counters.bosses = counters.bosses.filter(id => DATA.monsters[id]);
    if (c.dungeonTurns && typeof c.dungeonTurns === 'object') for (const id of Object.keys(c.dungeonTurns)) if (World.dungeonDef(id) && isInt(c.dungeonTurns[id], 1, 9999)) counters.dungeonTurns[id] = c.dungeonTurns[id];
    o.counters = counters;
    // Veille du jour (js/veille.js) : des jours entiers, comptés depuis l'époque du cycle. Le premier
    // dépôt ne précède pas la création du personnage (lue en tête de son identifiant, à un jour
    // près pour les fuseaux ; à défaut, l'époque). Réserve de 0 à 7. Les marques
    // (counters.feats.veille) et la réserve tiennent dans les jours du premier au dernier dépôt,
    // donc dans ceux écoulés depuis la création ; les jours remplis, dans le dernier cycle.
    // L'horloge n'y entre pas : une horloge reculée ne doit pas effacer une Veille honnête.
    if (o.veille != null || counters.feats.veille) {
      const vl = o.veille && typeof o.veille === 'object' ? o.veille : {};
      const born = typeof Veille === 'object' ? Veille.creation(o.uid) : null;
      let marks = counters.feats.veille || 0;
      if (!isInt(vl.first, Math.max(0, born == null ? 0 : born - 1), 1e5) || !isInt(vl.last, vl.first, 1e5) || !marks) {
        bad('Veille');
        o.veille = null;
        delete counters.feats.veille;
      } else {
        let reserve = vl.reserve;
        if (!isInt(reserve, 0, 7)) { bad('réserve de Veille'); reserve = 0; }
        if (marks + reserve > vl.last - vl.first + 1) { bad('marques de Veille'); reserve = 0; marks = Math.min(marks, vl.last - vl.first + 1); }
        const jours = Array.isArray(vl.days) ? vl.days : [];
        const days = jours.filter((d, i) => isInt(d, Math.max(vl.first, vl.last - 27), vl.last) && jours.indexOf(d) === i).slice(-marks);
        if (days.length !== jours.length) bad('jours de Veille');
        o.veille = { first: vl.first, last: vl.last, reserve, days };
        counters.feats.veille = marks;
      }
    }
    // Quêtes.
    const q = o.quests && typeof o.quests === 'object' ? o.quests : {};
    const quests = { active: {}, done: [] };
    for (const id of Array.isArray(q.done) ? q.done : []) if (Quests.get(id) && !quests.done.includes(id)) quests.done.push(id);
    if (q.active && typeof q.active === 'object') for (const id of Object.keys(q.active)) {
      const def = Quests.get(id), st = q.active[id];
      if (!def || (quests.done.includes(id) && !def.repeat) || !st || !isInt(st.step, 0, def.steps.length)) { bad(`quête ${id}`); continue; }
      quests.active[id] = { step: st.step, progress: isInt(st.progress, 0, 9999) ? st.progress : 0, given: !!st.given };
      // Réponses des étapes de choix (le serment) : étapes passées, options existantes.
      if (st.choices != null) { const c = Quests.checkChoices(def, st.choices, st.step); if (c) quests.active[id].choices = c; else bad(`choix de la quête ${id}`); }
    }
    o.quests = quests;
    // Faction (js/factions.js) : faction connue, pas avant le niveau 20, rang égal à celui des
    // points, points et confiance justifiés par les quêtes faites, ordre de sa faction au rang 3.
    if (o.faction != null) {
      const f = Factions.validate(o.faction, { level: o.level, done: quests.done });
      for (const e of f.errors) bad(e);
      o.faction = f.data;
    }
    // Succès et titres : seulement ceux qui existent et que les compteurs justifient.
    const tmp = { counters, level: o.level, achievements: [], quests: { done: quests.done }, derived: () => ({ setCount: {} }) };
    const achs = [];
    for (const id of Array.isArray(o.achievements) ? o.achievements : []) {
      const a = Achievements.defs().find(x => x.id === id);
      if (!a || achs.includes(id)) { bad(`succès ${id}`); continue; }
      if (a.cond && a.cond.type !== 'set' && !Achievements.met(Object.assign({}, tmp, { questsDone: counters.questsDone }), a.cond)) { bad(`succès non mérité ${id}`); continue; }
      achs.push(id);
    }
    o.achievements = achs;
    // Récompenses de succès remises : seulement des succès débloqués, chacun une fois. L'XP en
    // attente n'est pas encore comptée : l'invariant de l'expérience et des points tient. Une
    // sauvegarde d'avant ce champ a tout reçu au déblocage, et un champ illisible est réparé de
    // même : tout est marqué remis, jamais deux fois la même récompense.
    if (!Array.isArray(o.achClaimed)) { if (raw.achClaimed !== undefined) bad('récompenses de succès'); o.achClaimed = achs.slice(); }
    else {
      const claimed = [];
      for (const id of o.achClaimed) {
        if (!achs.includes(id) || claimed.includes(id)) { bad(`récompense de succès ${id}`); continue; }
        claimed.push(id);
      }
      o.achClaimed = claimed;
    }
    const earned = new Set(achs.map(id => (Achievements.defs().find(x => x.id === id).rewards || {}).title).filter(Boolean));
    for (const t of Factions.titles(o.faction)) earned.add(t);
    o.titles = (Array.isArray(o.titles) ? o.titles : []).filter(t => { const ok = typeof t === 'string' && earned.has(t); if (!ok) bad('titre'); return ok; });
    if (o.title != null && !o.titles.includes(o.title)) { bad('titre affiché'); o.title = null; }
    // Lieux : tout doit encore exister (une mise à jour peut retirer une salle ou une carte).
    o.relays = (Array.isArray(o.relays) ? o.relays : []).filter(id => typeof id === 'string' && World.mapDef(id));
    if (o.relay && !(o.relay.map && World.mapDef(o.relay.map) && isInt(o.relay.x, 0, 99) && isInt(o.relay.y, 0, 99))) o.relay = null;
    if (o.pos && !(o.pos.map && (World.mapDef(o.pos.map) || String(o.pos.map).includes('#')))) o.pos = null;
    if (o.dungeon) {
      const d = World.dungeonDef(o.dungeon.id);
      if (!d || !isInt(o.dungeon.room, 0, d.rooms.length - 1)) o.dungeon = null;
      else o.dungeon = { id: o.dungeon.id, room: o.dungeon.room, turns: isInt(o.dungeon.turns, 0, 9999) ? o.dungeon.turns : 0 };
    }
    o.knots = (Array.isArray(o.knots) ? o.knots : []).filter(id => inv[id]);
    o.ensembles = (Array.isArray(o.ensembles) ? o.ensembles : []).slice(0, 6).filter(e => e && typeof e === 'object').map(e => { const r = {}; for (const s of Object.keys(eq)) if (typeof e[s] === 'string' && Items.get(e[s])) r[s] = e[s]; return r; });
    if (o.hp != null && !isInt(o.hp, 0, 99999)) { bad('PV'); o.hp = null; }
    if (typeof o.playTime !== 'number' || !Number.isFinite(o.playTime) || o.playTime < 0) o.playTime = 0;
    o.autoStats = !!o.autoStats;
    if (o.voie != null && !Character.VOIES.includes(o.voie)) { bad('voie'); o.voie = null; }
    o.gender = o.gender === 'm' ? 'm' : 'f';
    // Apparence (tête de 0 à 7, six couleurs « #rrggbb ») : liste blanche ; un personnage d'avant
    // son arrivée reçoit l'apparence de sa classe, sans remarque.
    const look = Character.cleanLook(o.look, o.classId);
    o.look = look.look;
    for (const e of look.errors) bad(e);
    if (o.fight && typeof o.fight !== 'object') o.fight = null;
    if (o.mapTimers && typeof o.mapTimers !== 'object') o.mapTimers = {};
    o.flags = Object.assign({}, o.flags && typeof o.flags === 'object' ? { tampered: !!o.flags.tampered } : {});
    if (typeof o.uid !== 'string' || !UID.test(o.uid)) o.uid = null;
    // Tutoriel (js/guide.js) : un mode connu, une étape entière de 0 à 200, fini ou non.
    if (o.tuto != null) {
      const t = o.tuto && typeof o.tuto === 'object' && !Array.isArray(o.tuto) ? o.tuto : {};
      const mode = ['guide', 'court', 'off'].includes(t.mode) ? t.mode : null;
      const step = isInt(t.step, 0, 200) ? t.step : null;
      const done = typeof t.done === 'boolean' ? t.done : null;
      if (mode === null || step === null || done === null) bad('tutoriel');
      o.tuto = { mode: mode || 'off', step: step === null ? 0 : step, done: done === null ? mode === null : done };
    }
    validateSpellRanks(o, bad, oldFormat);
    return { errors, data: o };
  }

  // Construit le personnage depuis des données validées ; les erreurs le marquent.
  function load(raw, why) {
    const v = validate(raw);
    if (!v.data) return null;
    const ch = Character.fromJSON(v.data);
    if (v.errors.length || why) {
      ch.flags = Object.assign({}, ch.flags, { tampered: true });
      ch.integrity = v.errors.concat(why ? [why] : []);
    }
    return ch;
  }

  // Avant un rechargement voulu (import, changement de personnage) ou pendant une partie d'invité,
  // plus aucune écriture.
  function suspend() { suspended = true; }

  // ----- Emplacements -----
  // Une enveloppe : { v: 2, seq, t (dernière écriture), character, h (empreinte de seq et du JSON) }.
  // Une enveloppe v1 n'a pas d'empreinte ; une v2 dont l'empreinte ne correspond plus a été modifiée.
  const envelope = uid => { const o = parse(get(SLOT + uid)); return o && o.character && typeof o.character === 'object' ? o : null; };
  const forged = o => o.v >= 2 && o.h !== sign(o.seq, JSON.stringify(o.character));

  function readIndex() {
    const o = parse(get(INDEX_KEY)) || {};
    const ordre = Array.isArray(o.ordre) ? [...new Set(o.ordre.filter(u => typeof u === 'string' && UID.test(u)))] : [];
    return { ordre, dernier: typeof o.dernier === 'string' && UID.test(o.dernier) ? o.dernier : null };
  }
  const writeIndex = ix => set(INDEX_KEY, JSON.stringify({ ordre: ix.ordre, dernier: ix.dernier }));

  // Les emplacements présents, dans l'ordre de création ; une enveloppe absente de l'index (index
  // perdu) est reprise à la fin.
  function uids() {
    const out = readIndex().ordre.filter(u => get(SLOT + u) != null);
    try {
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        const u = k && k.startsWith(SLOT) ? k.slice(SLOT.length) : null;
        if (u && UID.test(u) && !out.includes(u)) out.push(u);
      }
    } catch (e) { /* pas de stockage */ }
    return out;
  }

  // L'ancienne sauvegarde unique devient un emplacement, une seule fois. Son empreinte est gardée ;
  // elle n'est refaite que si l'identifiant manquait et que l'empreinte d'origine était bonne.
  function migrate() {
    if (migrated) return;
    migrated = true;
    const o = parse(get(LEGACY_KEY));
    if (!o || !o.character || typeof o.character !== 'object' || Array.isArray(o.character)) return;
    const ch = o.character;
    let env = o;
    if (typeof ch.uid !== 'string' || !UID.test(ch.uid)) {
      const honest = !forged(o);
      ch.uid = newUid();
      env = Object.assign({}, o, { character: ch });
      if (o.v >= 2 && honest) env.h = sign(o.seq, JSON.stringify(ch));
    }
    const uid = ch.uid;
    const cur = envelope(uid);
    if (!cur || (Number(cur.seq) || 0) < (Number(env.seq) || 0)) {
      if (!set(SLOT + uid, JSON.stringify(env))) { migrated = false; return; }
    }
    set(SEQ + uid, String(Math.max(seqOf(uid), Number(get(LEGACY_SEQ)) || 0, Number(env.seq) || 0)));
    const ix = readIndex();
    if (!ix.ordre.includes(uid)) ix.ordre.unshift(uid);
    if (!ix.dernier) ix.dernier = uid;
    writeIndex(ix);
    del(LEGACY_KEY);
    del(LEGACY_SEQ);
  }

  // Le résumé de chaque personnage, dans l'ordre des emplacements : { uid, name, classId, level,
  // gender, voie, look, at (dernière partie, en ms), tampered }. Tout est validé avant d'être montré.
  function list() {
    migrate();
    const out = [];
    for (const uid of uids()) {
      const o = envelope(uid);
      const v = o ? validate(o.character) : null;
      if (!v || !v.data) continue;
      const d = v.data;
      out.push({ uid, name: d.name, classId: d.classId, level: d.level, gender: d.gender, voie: d.voie, look: d.look, at: Number(o.t) || 0, tampered: forged(o) || v.errors.length > 0 || !!d.flags.tampered });
    }
    return out;
  }

  const free = () => Math.max(0, MAX - list().length);

  // Le dernier personnage joué ; à défaut, celui dont la partie est la plus récente.
  function lastUid() {
    migrate();
    const ix = readIndex();
    if (ix.dernier && envelope(ix.dernier)) return ix.dernier;
    let best = null, t = -1;
    for (const uid of uids()) { const o = envelope(uid); if (o && (Number(o.t) || 0) > t) { t = Number(o.t) || 0; best = uid; } }
    return best;
  }

  // Un personnage (le dernier joué si `uid` manque), validé ; une enveloppe retouchée le marque.
  function read(uid) {
    migrate();
    uid = uid || lastUid();
    const o = uid ? envelope(uid) : null;
    if (!o) return null;
    try { return load(o.character, forged(o) ? 'empreinte' : null); } catch (e) { return null; }
  }

  // Écrit le personnage dans son emplacement (`ch.uid`) et le note comme dernier joué. Refuse un
  // nouveau personnage quand les cinq emplacements sont pris, et un personnage d'invité.
  function write(ch) {
    if (suspended || !ch || ch.invite || typeof ch.uid !== 'string' || !UID.test(ch.uid)) return false;
    migrate();
    const uid = ch.uid;
    if (get(SLOT + uid) == null && list().length >= MAX) return false;
    try {
      const seq = seqOf(uid) + 1;
      const json = JSON.stringify(ch.toJSON());
      if (!set(SLOT + uid, JSON.stringify({ v: 2, seq, t: Date.now(), character: JSON.parse(json), h: sign(seq, json) }))) return false;
      set(SEQ + uid, String(seq));
      const ix = readIndex();
      if (!ix.ordre.includes(uid)) ix.ordre.push(uid);
      ix.dernier = uid;
      writeIndex(ix);
      return true;
    } catch (e) { return false; }
  }

  // Supprime un personnage de cet appareil. Son numéro de séquence reste : réimporter un code plus
  // ancien que sa dernière partie (supprimer pour revenir en arrière) est refusé comme avant.
  function remove(uid) {
    migrate();
    if (typeof uid !== 'string' || get(SLOT + uid) == null) return false;
    del(SLOT + uid);
    const ix = readIndex();
    ix.ordre = ix.ordre.filter(u => u !== uid);
    if (ix.dernier === uid) ix.dernier = null;
    writeIndex(ix);
    return true;
  }

  // Efface tous les personnages, l'ancienne sauvegarde comprise (?reset=1 en développement).
  function clear() {
    const keys = [INDEX_KEY, LEGACY_KEY, LEGACY_SEQ];
    try {
      for (let i = 0; i < localStorage.length; i++) { const k = localStorage.key(i); if (k && (k.startsWith(SLOT) || k.startsWith(SEQ))) keys.push(k); }
    } catch (e) { /* pas de stockage */ }
    for (const k of keys) del(k);
    migrated = false;
  }

  // Export en texte à copier (base64 du JSON signé), pour changer d'appareil.
  function exportText(ch) {
    const seq = seqOf(ch.uid);
    const json = JSON.stringify(ch.toJSON());
    return btoa(unescape(encodeURIComponent(JSON.stringify({ v: 2, seq, character: JSON.parse(json), h: sign(seq, json) }))));
  }

  // Import : { ch } ou { error }. Refuse un code modifié, incohérent, plus ancien que la partie en
  // cours du même personnage, ou un nouveau personnage quand les emplacements sont pris. Un code
  // accepté relève la séquence du personnage : un code plus ancien que lui sera refusé ensuite.
  function importText(text) {
    migrate();
    let o;
    try { o = JSON.parse(decodeURIComponent(escape(atob(String(text).trim())))); } catch (e) { return { error: 'Code illisible.' }; }
    if (!o || !o.character || typeof o.character !== 'object') return { error: 'Code illisible.' };
    if (forged(o)) return { error: 'Ce code a été modifié.' };
    const v = validate(o.character);
    if (!v.data || v.errors.length) return { error: 'Ce code contient un personnage incohérent.' };
    const uid = v.data.uid, seq = Number(o.seq) || 0;
    const here = !!(uid && envelope(uid));
    if (uid && seq < seqOf(uid)) return { error: here ? 'Ce code est plus ancien que ta partie en cours.' : 'Ce code est plus ancien que la dernière partie de ce personnage.' };
    if (!here && list().length >= MAX) return { error: `Plus d'emplacement libre : ${MAX} personnages au plus sur cet appareil.` };
    if (uid) set(SEQ + uid, String(Math.max(seqOf(uid), seq)));
    return { ch: Character.fromJSON(v.data) };
  }

  const keyOf = uid => SLOT + uid;

  // KEY : l'ancienne clé unique, gardée pour le code qui la lit encore ; elle désigne maintenant
  // l'emplacement du dernier personnage joué.
  return { MAX, LEGACY_KEY, keyOf, list, read, write, remove, lastUid, free, clear, exportText, importText, suspend, validate, get KEY() { return keyOf(lastUid() || ''); } };
})();
