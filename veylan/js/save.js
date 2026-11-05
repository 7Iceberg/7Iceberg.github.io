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

  function cyrb53(str, seed) {
    let h1 = 0xdeadbeef ^ (seed || 0), h2 = 0x41c6ce57 ^ (seed || 0);
    for (let i = 0; i < str.length; i++) { const c = str.charCodeAt(i); h1 = Math.imul(h1 ^ c, 2654435761); h2 = Math.imul(h2 ^ c, 1597334677); }
    h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
    h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
    return (4294967296 * (2097151 & h2) + (h1 >>> 0)).toString(36);
  }
  const sign = (seq, json) => cyrb53(seq + '|' + json + '|' + SEL);

  const get = k => { try { return localStorage.getItem(k); } catch (e) { return null; } };
  const set = (k, v) => { try { localStorage.setItem(k, v); return true; } catch (e) { return false; } };
  const del = k => { try { localStorage.removeItem(k); } catch (e) {   } };
  const parse = s => { try { return s ? JSON.parse(s) : null; } catch (e) { return null; } };
  const newUid = () => (Date.now().toString(36) + Math.random().toString(36).slice(2, 10)).slice(0, 20);

  const seqOf = uid => Number(get(SEQ + uid)) || 0;

  const isInt = (v, min, max) => Number.isInteger(v) && v >= (min == null ? -Infinity : min) && v <= (max == null ? Infinity : max);
  const ALLOWED = new Set(['classId', 'name', 'gender', 'level', 'xp', 'statPoints', 'stats', 'equipment', 'inventory', 'fils', 'hp', 'titles', 'title', 'quests', 'counters', 'achievements', 'achClaimed', 'veille', 'pos', 'relay', 'relays', 'dungeon', 'coffre', 'marche', 'avis', 'dojo', 'trousseau', 'autoStats', 'playTime', 'knots', 'ensembles', 'fight', 'mapTimers', 'flags', 'v', 'uid', 'voie', 'scrolls', 'faction', 'tuto']);
  for (const k of ['variantes', 'spellRanks', 'spellPoints', 'autoSpells']) ALLOWED.add(k);
  ALLOWED.add('look');
  ALLOWED.add('origine');
  for (const k of ['porte', 'ensemblesLook']) ALLOWED.add(k);
  for (const k of ['familiers', 'familier']) ALLOWED.add(k);
  ALLOWED.add('monture');
  ALLOWED.add('sceaux');
  ALLOWED.add('placements');
  ALLOWED.add('bonusDefi');
  ALLOWED.add('repos');
  ALLOWED.add('rares');
  const ORIGINES = ['orsane', 'ervane'];

  const plateauDe = id => {
    const m = typeof World === 'function' && World.mapDef(id);
    return m && m.plateau ? ((DATA.content && DATA.content.plateaux) || []).find(p => p.id === m.plateau) || null : null;
  };
  const dansPlateau = (pl, x, y) => typeof x === 'number' && typeof y === 'number' && Number.isFinite(x) && Number.isFinite(y) && x >= 0 && y >= 0 && x <= pl.taille[0] && y <= pl.taille[1];

  const secteurDe = id => {
    const m = typeof World === 'function' && World.mapDef(id);
    if (!m) return null;
    if (m.secteur) return m.secteur;
    for (const f of Object.values((typeof DATA === 'object' && DATA.modules) || {})) if (typeof f === 'function' && f.secteurs && f.secteurs[id]) return f.secteurs[id];
    return null;
  };
  const caseValide = (x, y) => isInt(x, 0, 14) && isInt(y, 0, 14);
  const r2 = x => Math.round(x * 100) / 100;
  function versMode(pos) {
    const m = pos && World.mapDef(pos.map), sec = m && secteurDe(pos.map);
    if (!sec || !Array.isArray(m.layout)) return pos;
    const fini = typeof pos.x === 'number' && typeof pos.y === 'number' && Number.isFinite(pos.x) && Number.isFinite(pos.y);
    if (!fini) return pos;
    if (m.plateau) return caseValide(pos.x, pos.y) ? { map: pos.map, x: r2(sec.u0 + (pos.x + 0.5) * sec.k), y: r2(sec.v0 + (pos.y + 0.5) * sec.k) } : pos;
    if (caseValide(pos.x, pos.y)) return pos;
    const c = v => Math.max(0, Math.min(14, Math.floor(v)));
    return { map: pos.map, x: c((pos.x - sec.u0) / sec.k), y: c((pos.y - sec.v0) / sec.k) };
  }
  function relaisMode(r) {
    const m = r && World.mapDef(r.map), sec = m && secteurDe(r.map);
    if (!sec || !Array.isArray(m.layout)) return r;
    if (m.plateau) return m.relay && caseValide(r.x, r.y) ? { map: r.map, x: m.relay.u, y: m.relay.v } : r;
    if (caseValide(r.x, r.y)) return r;
    const y = m.layout.findIndex(l => typeof l === 'string' && l.includes('Z'));
    return y >= 0 ? { map: r.map, x: m.layout[y].indexOf('Z'), y } : r;
  }

  function accorder(ch) {
    if (!ch || typeof ch !== 'object') return ch;
    if (ch.pos && typeof ch.pos === 'object') ch.pos = versMode(ch.pos);
    if (ch.relay && typeof ch.relay === 'object') ch.relay = relaisMode(ch.relay);
    if (ch.dungeon && ch.dungeon.retour && !plateauDe(ch.dungeon.retour.map)) delete ch.dungeon.retour;
    return ch;
  }

  function validateSpellRanks(o, bad) {
    delete o.spellRanks; delete o.spellPoints; delete o.autoSpells;
    if (o.variantes == null) { o.variantes = {}; return; }
    const c = DATA.classes[o.classId], out = {};
    if (typeof o.variantes !== 'object' || Array.isArray(o.variantes) || !c) { bad('variantes'); o.variantes = {}; return; }
    for (const k of Object.keys(o.variantes)) {
      const i = Number(k), p = c.paires[i];
      if (o.variantes[k] === true && Number.isInteger(i) && p && p[1] && Character.unlockLevel(o.classId, p[1]) <= o.level) out[i] = true;
      else bad('variantes');
    }
    o.variantes = out;
  }

  const TITRES_RENOMMES = new Map([['Fléau des Pilous', 'Fléau des Glyms'], ['Enfant des Cimes', 'Veilleur des Cimes'],
    ['Bout de fil', 'Étincelle'], ['Couseur', 'Lueur'], ['Point', 'Rayon'], ['Ourlet', 'Flambeau'], ['Trame', 'Fanal'], ['Navette', 'Phare'], ['Fuseau', 'Aurore'], ['Métier', 'Zénith'], ['Grand Tisserand', 'Grand Éveilleur'], ['Main du Fil', 'Main de l\'Aube'],
    ['Accroc', 'Maillon'], ['Éraflure', 'Crochet'], ['Entaille', 'Anneau'], ['Fêlure', 'Rivet'], ['Fente', 'Fer'], ['Lézarde', 'Entrave'], ['Brèche', 'Carcan'], ['Faille', 'Joug'], ['Gouffre', 'Grand Lieur'], ['Voix de la Déchirure', 'Voix de la Chaîne'],
    ['Vétéran des Voiles', 'Vétéran des Cimes'], ['Tisseur de Fils', 'Grand Argentier'], ['Bras du Fil', 'Bras de l\'Aube'], ['Veilleur des sept Voiles', 'Veilleur des Sept Dragons']]);
  function migrerTitres(o) {
    if (Array.isArray(o.titles)) o.titles = o.titles.map(t => (TITRES_RENOMMES.has(t) ? TITRES_RENOMMES.get(t) : t));
    if (TITRES_RENOMMES.has(o.title)) o.title = TITRES_RENOMMES.get(o.title);
  }

  function validate(raw) {
    const errors = [];
    const bad = (msg) => errors.push(msg);
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return { errors: ['sauvegarde illisible'], data: null };
    const o = {};
    for (const k of Object.keys(raw)) { if (ALLOWED.has(k)) o[k] = raw[k]; else bad(`champ inconnu ${k}`); }
    migrerTitres(o);
    const vieille = DATA.classes[o.classId];
    if (vieille && vieille.season && vieille.remplacee) { o.classId = vieille.remplacee; o.variantes = {}; }
    if (!DATA.classes[o.classId]) return { errors: errors.concat('classe inconnue'), data: null };
    o.name = typeof o.name === 'string' ? o.name.slice(0, 16) : 'Veilleur';
    if (!(raw.v >= 5) && isInt(o.level, 1, 30)) {
      const L = o.level, L2 = Math.min(Character.MAX_LEVEL, 2 * L);
      const ancien = Math.round(20 * Math.pow(L, 2.4)), part = isInt(o.xp, 0) ? Math.min(0.999, o.xp / ancien) : 0;
      o.level = L2;
      o.xp = L2 >= Character.MAX_LEVEL ? 0 : Math.floor(part * Character.xpToNext(L2));
      if (isInt(o.statPoints, 0)) o.statPoints += 5 * (L2 - L);
    }
    if (!isInt(o.level, 1, Character.MAX_LEVEL)) { bad('niveau'); o.level = Math.max(1, Math.min(Character.MAX_LEVEL, Math.floor(Number(o.level)) || 1)); }
    if (!isInt(o.xp, 0) || (o.level < Character.MAX_LEVEL && o.xp >= Character.xpToNext(o.level))) { bad('expérience'); o.xp = 0; }
    const stats = { vita: 0, sagesse: 0, force: 0, intel: 0, chance: 0, agi: 0 };
    let statsOk = o.stats && typeof o.stats === 'object';
    for (const k in stats) { const v = statsOk ? o.stats[k] : 0; if (v == null) continue; if (!isInt(v, 0, 2000)) statsOk = false; else stats[k] = v; }
    if (!isInt(o.statPoints, 0, 5 * Character.MAX_LEVEL)) statsOk = false;
    const oldFormat = !(raw.v >= 3);
    if (oldFormat) { for (const k in stats) stats[k] = 0; o.statPoints = 5 * (o.level - 1); o.sceaux = null; }
    else if (!statsOk || Character.spentFor(stats) + o.statPoints !== 5 * (o.level - 1)) {
      bad('caractéristiques');
      for (const k in stats) stats[k] = 0;
      o.statPoints = 5 * (o.level - 1);
      o.sceaux = null;
    }
    o.stats = stats;
    const scrolls = { vita: 0, sagesse: 0, force: 0, intel: 0, chance: 0, agi: 0 };
    if (o.scrolls && typeof o.scrolls === 'object') for (const k in scrolls) { const v = o.scrolls[k]; if (v == null) continue; if (isInt(v, 0, DATA.rules.scrollMax)) scrolls[k] = v; else bad(`parchemin ${k}`); }
    o.scrolls = scrolls;
    const inv = {};
    if (o.inventory && typeof o.inventory === 'object') for (const id of Object.keys(o.inventory)) {
      const n = o.inventory[id];
      if (!Items.get(id)) { bad(`objet inconnu ${id}`); continue; }
      if (!isInt(n, 1, 9999)) { bad(`quantité ${id}`); continue; }
      inv[id] = n;
    }
    o.inventory = inv;
    const coffre = { items: {}, fils: 0 };
    if (o.coffre && typeof o.coffre === 'object') {
      const ci = o.coffre.items;
      if (ci && typeof ci === 'object') for (const id of Object.keys(ci)) {
        const n = ci[id];
        if (!Items.get(id)) { bad(`objet inconnu au coffre ${id}`); continue; }
        if (!isInt(n, 1, 99999)) { bad(`quantité au coffre ${id}`); continue; }
        coffre.items[id] = n;
      }
      if (o.coffre.fils != null) { if (isInt(o.coffre.fils, 0, 1e9)) coffre.fils = o.coffre.fils; else bad('Dragmes du coffre'); }
    }
    o.coffre = coffre;
    if (o.avis != null) {
      const a = o.avis && typeof o.avis === 'object' ? o.avis : {}, connus = new Set(((DATA.content && DATA.content.avis) || []).map(x => x.id));
      const ids = v => (Array.isArray(v) ? [...new Set(v.filter(x => typeof x === 'string' && connus.has(x)))] : []);
      const pris = ids(a.pris), captures = ids(a.captures).filter(x => pris.includes(x)), rendus = {};
      for (const [k, j] of Object.entries(a.rendus && typeof a.rendus === 'object' ? a.rendus : {})) if (connus.has(k) && isInt(j, -100000, 1000000)) rendus[k] = j;
      if (pris.length !== (Array.isArray(a.pris) ? a.pris.length : 0) || captures.length !== (Array.isArray(a.captures) ? a.captures.length : 0)) bad('avis de recherche');
      o.avis = { pris, captures, rendus };
    }
    if (o.dojo != null) {
      const dj = o.dojo && typeof o.dojo === 'object' && isInt(o.dojo.jour, -100000, 1000000) ? { jour: o.dojo.jour } : null;
      if (!dj) bad('épreuve du Dojo');
      o.dojo = dj;
    }
    if (o.trousseau != null) {
      const cles = new Set(((DATA.content && DATA.content.dungeons) || []).map(d => d.keyItem).filter(Boolean)), t = {};
      const src = o.trousseau && typeof o.trousseau === 'object' && !Array.isArray(o.trousseau) ? o.trousseau : {};
      for (const [k, j] of Object.entries(src)) if (cles.has(k) && isInt(j, -100000, 1000000)) t[k] = j;
      if (Object.keys(t).length !== Object.keys(src).length || src !== o.trousseau) bad('trousseau');
      o.trousseau = t;
    }
    if (o.marche != null) {
      const m = o.marche && typeof o.marche === 'object' ? o.marche : {}, vendus = {};
      if (m.vendus && typeof m.vendus === 'object') for (const id of Object.keys(m.vendus)) { if (Items.get(id) && isInt(m.vendus[id], 0, 99999)) vendus[id] = m.vendus[id]; else bad(`vente au Marché ${id}`); }
      if (isInt(m.jour, -100000, 1000000)) o.marche = { jour: m.jour, vendus }; else { bad('carnet du Marché'); delete o.marche; }
    }
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
    if (!isInt(o.fils, 0, 1e9)) { bad('Dragmes'); o.fils = 0; }
    const c = o.counters && typeof o.counters === 'object' ? o.counters : {};
    const counters = Character.defaults().counters;
    for (const k of ['fights', 'wins', 'crafts', 'gathers', 'filsEarned', 'questsDone']) { if (c[k] == null) continue; if (isInt(c[k], 0, 1e9)) counters[k] = c[k]; else bad(`compteur ${k}`); }
    if (counters.wins > counters.fights) { bad('victoires'); counters.wins = counters.fights; }
    if (o.fils + o.coffre.fils > counters.filsEarned) { bad('Dragmes au-delà des gains'); o.fils = Math.min(o.fils, counters.filsEarned); o.coffre.fils = Math.max(0, Math.min(o.coffre.fils, counters.filsEarned - o.fils)); }
    for (const k of ['kills', 'feats']) if (c[k] && typeof c[k] === 'object') for (const id of Object.keys(c[k])) { if (isInt(c[k][id], 0, 1e9)) counters[k][id] = c[k][id]; else bad(`compteur ${k}.${id}`); }
    for (const k of ['maps', 'dungeons', 'bosses']) if (Array.isArray(c[k])) counters[k] = [...new Set(c[k].filter(x => typeof x === 'string'))];
    counters.maps = counters.maps.filter(id => World.mapDef(id));
    counters.dungeons = counters.dungeons.filter(id => World.dungeonDef(id));
    counters.bosses = counters.bosses.filter(id => DATA.monsters[id]);
    if (c.dungeonTurns && typeof c.dungeonTurns === 'object') for (const id of Object.keys(c.dungeonTurns)) if (World.dungeonDef(id) && isInt(c.dungeonTurns[id], 1, 9999)) counters.dungeonTurns[id] = c.dungeonTurns[id];
    o.counters = counters;
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
    const q = o.quests && typeof o.quests === 'object' ? o.quests : {};
    const quests = { active: {}, done: [] };
    for (const id of Array.isArray(q.done) ? q.done : []) if (Quests.get(id) && !quests.done.includes(id)) quests.done.push(id);
    if (q.active && typeof q.active === 'object') for (const id of Object.keys(q.active)) {
      const def = Quests.get(id), st = q.active[id];
      if (!def || (quests.done.includes(id) && !def.repeat) || !st || !isInt(st.step, 0, def.steps.length)) { bad(`quête ${id}`); continue; }
      quests.active[id] = { step: st.step, progress: isInt(st.progress, 0, 9999) ? st.progress : 0, given: !!st.given };
      const sk = def.steps[st.step];
      if (sk && sk.type === 'kills' && Array.isArray(st.counts)) quests.active[id].counts = st.counts.length === sk.kills.length && st.counts.every(n => isInt(n, 0, 99)) ? st.counts.slice() : sk.kills.map(() => 0);
      if (st.choices != null) { const c = Quests.checkChoices(def, st.choices, st.step); if (c) quests.active[id].choices = c; else bad(`choix de la quête ${id}`); }
    }
    o.quests = quests;
    if (o.faction != null) {
      const f = Factions.validate(o.faction, { level: o.level, done: quests.done });
      for (const e of f.errors) bad(e);
      o.faction = f.data;
    }
    const achs = [];
    const tmp = { counters, level: o.level, origine: o.origine, achievements: achs, quests: { done: quests.done }, derived: () => ({ setCount: {} }) };
    const AILLEURS = ['set', 'relais', 'faction', 'familier', 'monture', 'garderobe'];
    const SUITE = ['meta', 'score'];
    const demandes = [];
    for (const id of Array.isArray(o.achievements) ? o.achievements : []) {
      const a = Achievements.get(id);
      if (!a || demandes.some(x => x.id === id)) { bad(`succès ${id}`); continue; }
      demandes.push(a);
    }
    const merite = a => !a.cond || AILLEURS.includes(a.cond.type) || Achievements.met(tmp, a.cond);
    for (const a of demandes) if (!SUITE.includes((a.cond || {}).type)) { if (merite(a)) achs.push(a.id); else bad(`succès non mérité ${a.id}`); }
    let reste = demandes.filter(a => SUITE.includes((a.cond || {}).type));
    for (let avance = true; avance && reste.length;) {
      avance = false;
      for (const a of reste.slice()) if (merite(a)) { achs.push(a.id); reste = reste.filter(x => x !== a); avance = true; }
    }
    for (const a of reste) bad(`succès non mérité ${a.id}`);
    o.achievements = demandes.map(a => a.id).filter(id => achs.includes(id));
    if (!Array.isArray(o.achClaimed)) { if (raw.achClaimed !== undefined) bad('récompenses de succès'); o.achClaimed = achs.slice(); }
    else {
      const claimed = [];
      for (const id of o.achClaimed) {
        if (!achs.includes(id) || claimed.includes(id)) { bad(`récompense de succès ${id}`); continue; }
        claimed.push(id);
      }
      o.achClaimed = claimed;
    }
    const earned = new Set(achs.map(id => (Achievements.get(id).rewards || {}).title).filter(Boolean));
    for (const t of Factions.titles(o.faction)) earned.add(t);
    o.titles = (Array.isArray(o.titles) ? o.titles : []).filter(t => { const ok = typeof t === 'string' && earned.has(t); if (!ok) bad('titre'); return ok; });
    if (o.title != null && !o.titles.includes(o.title)) { bad('titre affiché'); o.title = null; }
    o.relays = (Array.isArray(o.relays) ? o.relays : []).filter(id => typeof id === 'string' && World.mapDef(id));
    if (o.relay && typeof o.relay === 'object') o.relay = relaisMode(o.relay);
    if (o.relay) {
      const pr = o.relay.map && plateauDe(o.relay.map), rd = pr && World.mapDef(o.relay.map).relay;
      const ok = pr ? !!(rd && o.relay.x === rd.u && o.relay.y === rd.v) : !!(o.relay.map && World.mapDef(o.relay.map) && isInt(o.relay.x, 0, 99) && isInt(o.relay.y, 0, 99));
      if (!ok) o.relay = null;
    }
    if (o.pos && !(o.pos.map && (World.mapDef(o.pos.map) || String(o.pos.map).includes('#')))) o.pos = null;
    if (o.pos) o.pos = versMode(o.pos);
    if (o.pos) {
      const pp = plateauDe(o.pos.map);
      if (pp) o.pos = dansPlateau(pp, o.pos.x, o.pos.y) ? { map: o.pos.map, x: Math.round(o.pos.x * 100) / 100, y: Math.round(o.pos.y * 100) / 100 } : null;
    }
    if (o.origine !== undefined && !ORIGINES.includes(o.origine)) { bad('origine'); delete o.origine; }
    if (o.dungeon) {
      const d = World.dungeonDef(o.dungeon.id);
      if (!d || !isInt(o.dungeon.room, 0, d.rooms.length - 1)) o.dungeon = null;
      else {
        const r = o.dungeon.retour, pr = r && r.map && plateauDe(r.map);
        o.dungeon = { id: o.dungeon.id, room: o.dungeon.room, turns: isInt(o.dungeon.turns, 0, 9999) ? o.dungeon.turns : 0 };
        if (pr && dansPlateau(pr, r.x, r.y)) o.dungeon.retour = { map: r.map, x: Math.round(r.x * 100) / 100, y: Math.round(r.y * 100) / 100 };
      }
    }
    o.knots = (Array.isArray(o.knots) ? o.knots : []).filter(id => inv[id]);
    o.ensembles = (Array.isArray(o.ensembles) ? o.ensembles : []).slice(0, 6).filter(e => e && typeof e === 'object').map(e => { const r = {}; for (const s of Object.keys(eq)) if (typeof e[s] === 'string' && Items.get(e[s])) r[s] = e[s]; return r; });
    if (o.hp != null && !isInt(o.hp, 0, 99999)) { bad('PV'); o.hp = null; }
    if (typeof o.playTime !== 'number' || !Number.isFinite(o.playTime) || o.playTime < 0) o.playTime = 0;
    o.autoStats = !!o.autoStats;
    o.voie = null;
    if (o.sceaux != null) {
      if (typeof Sceaux === 'undefined' || typeof o.sceaux !== 'object') o.sceaux = null;
      else {
        const caracs = { force: stats.force || 0, intel: stats.intel || 0, chance: stats.chance || 0, agi: stats.agi || 0 };
        const e = Sceaux.valider({ niveau: o.level, caracs, rangs: o.sceaux.rangs, poses: o.sceaux.poses });
        const garde = { rangs: e.rangs, poses: e.poses };
        const plus = (a, b) => Object.keys(a || {}).some(k => (a[k] || 0) > (b[k] || 0));
        if (plus(o.sceaux.rangs, garde.rangs)) bad('Sceaux');
        o.sceaux = garde;
      }
    }
    o.gender = o.gender === 'm' ? 'm' : 'f';
    const look = Character.cleanLook(o.look, o.classId);
    o.look = look.look;
    for (const e of look.errors) bad(e);
    if (typeof Garderobe !== 'undefined') {
      const p = Garderobe.nettoyerPorte(o.porte); o.porte = p.porte; for (const e of p.errors) bad(e);
      const l = Garderobe.nettoyerLooks(o.ensemblesLook); o.ensemblesLook = l.looks; for (const e of l.errors) bad(e);
    }
    if (typeof Familiers !== 'undefined') {
      const f = Familiers.nettoyer(o.familiers, o.familier); o.familiers = f.familiers; o.familier = f.familier; for (const e of f.errors) bad(e);
    }
    if (typeof Montures !== 'undefined') { const m = Montures.nettoyer(o.monture); o.monture = m.monture; for (const e of m.errors) bad(e); }
    if (o.fight && typeof o.fight !== 'object') o.fight = null;
    if (o.mapTimers && typeof o.mapTimers !== 'object') o.mapTimers = {};
    if (o.repos != null) o.repos = typeof Repos !== 'undefined' ? Repos.nettoyer(o.repos, Date.now()) : null;
    if (o.rares != null) o.rares = typeof Rares !== 'undefined' ? Rares.nettoyer(o.rares, Date.now()) : null;
    if (o.bonusDefi != null && o.bonusDefi !== 'xp' && o.bonusDefi !== 'butin') delete o.bonusDefi;
    if (o.placements != null) {
      const p = {};
      if (typeof o.placements === 'object' && !Array.isArray(o.placements)) {
        for (const [k, v] of Object.entries(o.placements)) if (typeof k === 'string' && k.length <= 80 && (v === 1 || v === 2)) p[k] = v;
      }
      o.placements = p;
    }
    o.flags = Object.assign({}, o.flags && typeof o.flags === 'object' ? { tampered: !!o.flags.tampered } : {});
    if (typeof o.uid !== 'string' || !UID.test(o.uid)) o.uid = null;
    if (o.tuto != null) {
      const t = o.tuto && typeof o.tuto === 'object' && !Array.isArray(o.tuto) ? o.tuto : {};
      const mode = ['guide', 'court', 'off'].includes(t.mode) ? t.mode : null;
      const step = isInt(t.step, 0, 200) ? t.step : null;
      const done = typeof t.done === 'boolean' ? t.done : null;
      if (mode === null || step === null || done === null) bad('tutoriel');
      o.tuto = { mode: mode || 'off', step: step === null ? 0 : step, done: done === null ? mode === null : done };
      if (['orsane', 'ile', 'descente'].includes(t.jeu)) o.tuto.jeu = t.jeu;
    }
    validateSpellRanks(o, bad);
    return { errors, data: o };
  }

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

  function suspend() { suspended = true; }

  const envelope = uid => { const o = parse(get(SLOT + uid)); return o && o.character && typeof o.character === 'object' ? o : null; };
  const forged = o => o.v >= 2 && o.h !== sign(o.seq, JSON.stringify(o.character));

  function readIndex() {
    const o = parse(get(INDEX_KEY)) || {};
    const ordre = Array.isArray(o.ordre) ? [...new Set(o.ordre.filter(u => typeof u === 'string' && UID.test(u)))] : [];
    return { ordre, dernier: typeof o.dernier === 'string' && UID.test(o.dernier) ? o.dernier : null };
  }
  const writeIndex = ix => set(INDEX_KEY, JSON.stringify({ ordre: ix.ordre, dernier: ix.dernier }));

  function uids() {
    const out = readIndex().ordre.filter(u => get(SLOT + u) != null);
    try {
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        const u = k && k.startsWith(SLOT) ? k.slice(SLOT.length) : null;
        if (u && UID.test(u) && !out.includes(u)) out.push(u);
      }
    } catch (e) {   }
    return out;
  }

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

  function lastUid() {
    migrate();
    const ix = readIndex();
    if (ix.dernier && envelope(ix.dernier)) return ix.dernier;
    let best = null, t = -1;
    for (const uid of uids()) { const o = envelope(uid); if (o && (Number(o.t) || 0) > t) { t = Number(o.t) || 0; best = uid; } }
    return best;
  }

  function read(uid) {
    migrate();
    uid = uid || lastUid();
    const o = uid ? envelope(uid) : null;
    if (!o) return null;
    try { return load(o.character, forged(o) ? 'empreinte' : null); } catch (e) { return null; }
  }

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

  function clear() {
    const keys = [INDEX_KEY, LEGACY_KEY, LEGACY_SEQ];
    try {
      for (let i = 0; i < localStorage.length; i++) { const k = localStorage.key(i); if (k && (k.startsWith(SLOT) || k.startsWith(SEQ))) keys.push(k); }
    } catch (e) {   }
    for (const k of keys) del(k);
    migrated = false;
  }

  function exportText(ch) {
    const seq = seqOf(ch.uid);
    const json = JSON.stringify(ch.toJSON());
    return btoa(unescape(encodeURIComponent(JSON.stringify({ v: 2, seq, character: JSON.parse(json), h: sign(seq, json) }))));
  }

  function importText(text) {
    migrate();
    let o;
    try { o = JSON.parse(decodeURIComponent(escape(atob(String(text).trim())))); } catch (e) { return { error: 'Code illisible.' }; }
    if (!o || !o.character || typeof o.character !== 'object') return { error: 'Code illisible.' };
    if (forged(o)) return { error: 'Ce code a été modifié.' };
    if (typeof Ile === 'object' && !Ile.actif() && Ile.trace(o.character)) {
      let garde = false;
      try { sessionStorage.setItem('veylan.ile.import', String(text).trim()); garde = true; } catch (e) { garde = false; }
      if (garde) return { error: 'Ce personnage vient d\'Ervane : la page se recharge pour l\'accueillir.', recharge: true };
      return { error: 'Ce personnage vient d\'Ervane, que cette page ne peut pas charger.' };
    }
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

  return { MAX, LEGACY_KEY, keyOf, list, read, write, remove, lastUid, free, clear, exportText, importText, suspend, validate, accorder, get KEY() { return keyOf(lastUid() || ''); } };
})();
