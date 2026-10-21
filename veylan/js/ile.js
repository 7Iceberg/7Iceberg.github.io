// L'interrupteur d'Ervane et son registre (docs/ILE-TECHNIQUE.md, 1.4 et 1.5) : décider si l'île est
// utile sur cet appareil, charger alors ses fichiers (données, moteur, rendu : Ile.FICHIERS), appliquer
// ses modules de contenu une fois, garder en mémoire le terrain et la navigation de chaque plateau,
// et faire naître un personnage au Métier.
//
// Se charge juste après content/ervane-interrupteur.js (DATA.ile) et avant js/noeuds.js et
// js/achievements.js, qui engendrent leurs succès d'après le contenu chargé. Une page où l'île n'est
// pas disponible ne charge aucun autre fichier de l'île (628 Ko, 189 Ko compressés : le jeu
// d'aujourd'hui ne les paie pas). Disponible, les fichiers sont écrits dans la page pendant son
// analyse (document.write, synchrone et dans l'ordre), si bien que js/world.js trouve Plateau et que
// js/main.js trouve Scene exactement comme s'ils avaient été dans index.html. Sans DOM : `location`,
// `localStorage` et `sessionStorage` ne sont lus que s'ils existent (sous Node, seul DATA.ile.active
// compte, et les outils chargent eux-mêmes Ile.FICHIERS puis appellent Ile.appliquer()).
//
// L'île est disponible (ses modules sont appliqués) si :
//   1. DATA.ile.active ;
//   2. en développement (fichier local, localhost ou ?dev=1) : ?ile=1, ou la case d'essai de
//      l'accueil (localStorage « veylan.ile.essai » = « 1 ») ; ?ile=0 éteint les deux premières ;
//   3. un personnage de l'appareil porte une trace d'Ervane (lu en brut, sans validation) ;
//   4. un import attend dans sessionStorage (« veylan.ile.import »).
// Elle est allumée (un nouveau personnage y naît) par les deux premières seulement.
const Ile = (() => {
  const ORDRE = ['ervaneBestiaire', 'ervane', 'ervaneAires', 'ervaneTutoriel'];
  const appliques = new Set();
  const cache = new Map();
  let disponible = false, allumee = false, raisons = [];

  const lieu = () => (typeof location !== 'undefined' && location ? location : null);
  function parametres() {
    const l = lieu(), out = {};
    const q = l && typeof l.search === 'string' ? l.search.replace(/^\?/, '') : '';
    for (const part of q.split('&')) { if (!part) continue; const i = part.indexOf('='); const k = decodeURIComponent(i < 0 ? part : part.slice(0, i)); out[k] = i < 0 ? '' : decodeURIComponent(part.slice(i + 1)); }
    return out;
  }
  // La règle du développement est celle de Util.dev (js/util.js, chargé avant) ; sans Util, la même
  // règle, écrite ici pour les contextes qui ne chargent que ce fichier.
  function enDev(p) {
    const l = lieu();
    if (!l) return false;
    if (typeof Util === 'object' && Util && typeof Util.dev === 'function') return Util.dev(l);
    return l.protocol === 'file:' || /^(localhost|127\.0\.0\.1)$/.test(l.hostname || '') || p.dev === '1';
  }
  const lire = (store, k) => { try { return typeof store === 'object' && store ? store.getItem(k) : null; } catch (e) { return null; } };
  const local = () => (typeof localStorage !== 'undefined' ? localStorage : null);
  const session = () => (typeof sessionStorage !== 'undefined' ? sessionStorage : null);

  // Un personnage (JSON brut) porte-t-il une trace d'Ervane ?
  function trace(ch) {
    if (!ch || typeof ch !== 'object') return false;
    const e = s => typeof s === 'string' && s.startsWith('ervane_');
    if (ch.origine === 'ervane') return true;
    if (ch.pos && e(ch.pos.map)) return true;
    if (ch.relay && e(ch.relay.map)) return true;
    if (Array.isArray(ch.relays) && ch.relays.some(e)) return true;
    if (ch.counters && Array.isArray(ch.counters.maps) && ch.counters.maps.some(e)) return true;
    const q = ch.quests || {};
    if (q.active && typeof q.active === 'object' && Object.keys(q.active).some(e)) return true;
    if (Array.isArray(q.done) && q.done.some(e)) return true;
    if (ch.dungeon && ch.dungeon.id === 'puits_de_l_amarre') return true;
    return false;
  }
  // Les emplacements de personnages de l'appareil, lus sans validation.
  function traces() {
    const s = local();
    if (!s) return false;
    try {
      for (let i = 0; i < s.length; i++) {
        const k = s.key(i);
        if (!k || !k.startsWith('veylan.perso.')) continue;
        let o = null;
        try { o = JSON.parse(s.getItem(k)); } catch (e) { o = null; }
        if (o && trace(o.character)) return true;
      }
    } catch (e) { /* pas de stockage */ }
    return false;
  }

  function decider() {
    const p = parametres(), dev = enDev(p);
    const actif = !!(typeof DATA === 'object' && DATA.ile && DATA.ile.active);
    const essai = dev && (p.ile === '1' || lire(local(), 'veylan.ile.essai') === '1');
    const eteint = dev && p.ile === '0';
    allumee = !eteint && (actif || essai);
    raisons = [];
    if (allumee) raisons.push(actif ? 'active' : 'essai');
    if (traces()) raisons.push('personnage');
    if (lire(session(), 'veylan.ile.import')) raisons.push('import');
    disponible = raisons.length > 0;
    return disponible;
  }

  // Les modules d'ajout, une fois chacun, dans l'ordre ; idempotent.
  function appliquer() {
    const M = (typeof DATA === 'object' && DATA.modules) || {};
    let fait = false;
    for (const nom of ORDRE) if (!appliques.has(nom) && typeof M[nom] === 'function') { M[nom](); appliques.add(nom); fait = true; }
    disponible = disponible || appliques.has('ervane');
    if (fait && typeof World === 'function' && World.reindexer) World.reindexer();
    return fait;
  }
  // L'origine d'un emplacement de personnage, lue en brut (sans validation) : 'ervane', 'orsane'
  // ou null. L'accueil s'en sert pour appliquer les changements d'Orsane avant la lecture validée.
  function origineDe(uid) {
    const s = local();
    if (!s || typeof uid !== 'string') return null;
    let o = null;
    try { o = JSON.parse(s.getItem('veylan.perso.' + uid)); } catch (e) { o = null; }
    const ch = o && o.character;
    return ch && typeof ch === 'object' && typeof ch.origine === 'string' ? ch.origine : null;
  }
  // Les changements d'Orsane, par personnage (content/ervane-orsane.js) : appliqués une fois, avant
  // la lecture validée d'un personnage né sur Ervane et avant que le monde soit créé. Jamais pour un
  // personnage né à Orsane (la page ne sert qu'un personnage : en changer la recharge).
  function appliquerOrsane() {
    const M = (typeof DATA === 'object' && DATA.modules) || {};
    if (appliques.has('ervaneOrsane') || typeof M.ervaneOrsane !== 'function') return false;
    M.ervaneOrsane();
    appliques.add('ervaneOrsane');
    if (typeof World === 'function' && World.reindexer) World.reindexer();
    return true;
  }
  const actif = () => appliques.has('ervane');

  // ----- Le registre des plateaux -----
  const plateau = id => ((DATA.content && DATA.content.plateaux) || []).find(p => p.id === id) || null;
  function carte(mapId) {
    for (const z of (DATA.content && DATA.content.zones) || []) for (const m of z.maps || []) if (m.id === mapId) return m;
    return null;
  }
  const estPlateau = mapId => { const m = typeof mapId === 'string' ? carte(mapId) : null; return !!(m && m.plateau && plateau(m.plateau)); };
  // Un donjon (ou une de ses salles, « id#n ») dont l'entrée est sur un plateau.
  function donjon3D(id) {
    const did = String(id || '').split('#')[0];
    const d = ((DATA.content && DATA.content.dungeons) || []).find(x => x.id === did);
    return !!(d && estPlateau(d.entryMap));
  }
  // Le terrain et la navigation d'un plateau, construits une fois et gardés en mémoire.
  function terrain(id) {
    if (cache.has(id)) return cache.get(id);
    const def = plateau(id);
    if (!def) return null;
    const t0 = typeof performance === 'object' && performance && performance.now ? performance.now() : Date.now();
    const T = IleTerrain.construire(def);
    const nav = new Navigation(T, { pas: 0.5, rayon: 0.35 });
    const t1 = typeof performance === 'object' && performance && performance.now ? performance.now() : Date.now();
    const e = { terrain: T, nav, ms: t1 - t0 };
    cache.set(id, e);
    return e;
  }
  const oublier = id => { if (id == null) cache.clear(); else cache.delete(id); };
  // Le nombre de plateaux gardés en mémoire (0 à Orsane après la descente : js/scene.js, oublierIle).
  const registre = () => cache.size;

  // Un nouveau personnage naît au Métier du Relais des Mailles : origine, position, relais
  // enregistré, et le tutoriel de l'île (content/tutoriel-ile.js, `jeu: 'ile'`) dans le mode
  // choisi à la création ; sans ce jeu d'étapes, il naît sans tutoriel.
  function fairenaitre(ch) {
    const n = DATA.ile && DATA.ile.naissance;
    const m = n && carte(n.map), def = m && plateau(m.plateau);
    if (!def) return null;
    const p = (def.lieux || {})[n.lieu] || [m.relay.u, m.relay.v];
    ch.origine = 'ervane';
    ch.pos = { map: n.map, x: p[0], y: p[1] };
    if (m.relay) {
      ch.relay = { map: n.map, x: m.relay.u, y: m.relay.v };
      ch.relays = Array.isArray(ch.relays) ? ch.relays : [];
      if (!ch.relays.includes(n.map)) ch.relays.push(n.map);
    }
    const tutoIle = !!(DATA.tutorielIle && Array.isArray(DATA.tutorielIle.etapes) && DATA.tutorielIle.etapes.length);
    const mode = ch.tuto && ['guide', 'court', 'off'].includes(ch.tuto.mode) ? ch.tuto.mode : 'guide';
    ch.tuto = tutoIle ? { mode, step: 0, done: mode === 'off', jeu: 'ile' } : { mode: 'off', step: 0, done: true };
    return ch;
  }

  // Les fichiers de l'île, dans l'ordre où ils se chargent : les données (modules de contenu, à
  // appliquer ensuite), le moteur sans DOM (avant js/world.js), le rendu 3D (avant js/main.js).
  const FICHIERS = {
    donnees: ['js/data-ile.js', 'content/ervane.js', 'content/ervane-aires.js', 'content/ervane-orsane.js', 'content/tutoriel-ile.js'],
    moteur: ['js/ile-terrain.js', 'js/ile-nav.js', 'js/plateau.js'],
    rendu: ['js/ile-peinture.js', 'js/ile-camera.js', 'js/ile-sol.js', 'js/ile-decor.js', 'js/ile-figures.js', 'js/ile-arene.js', 'js/ile-salle.js', 'js/ile-3d.js', 'js/scene.js'],
  };
  // Écrit les fichiers de l'île dans la page pendant son analyse (ce script est inséré par
  // l'analyseur : document.write est alors synchrone), puis l'application des modules. Rend faux
  // si la page est déjà analysée (un script injecté après coup) : l'île reste indisponible, le jeu
  // continue comme interrupteur éteint.
  let charges = false;
  function charger() {
    if (charges) return true;
    if (typeof document === 'undefined' || !document || typeof document.write !== 'function') return false;
    const courant = document.currentScript;
    if (document.readyState !== 'loading' || !courant) { disponible = false; allumee = false; return false; }
    let base = null;
    try { base = courant.src ? new URL('..', courant.src).href : null; } catch (e) { base = null; }
    const url = f => { try { return base ? new URL(f, base).href : f; } catch (e) { return f; } };
    const esc = s => String(s).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');
    const balises = FICHIERS.donnees.concat(FICHIERS.moteur, FICHIERS.rendu).map(f => `<script src="${esc(url(f))}"><\/script>`).join('\n');
    document.write(balises + '\n<script>Ile.appliquer();<\/script>\n');
    charges = true;
    return true;
  }

  return {
    decider, appliquer, appliquerOrsane, origineDe, actif, plateau, terrain, oublier, registre, estPlateau, donjon3D, fairenaitre, trace, charger, FICHIERS,
    get disponible() { return disponible; }, get allumee() { return allumee; }, get raisons() { return raisons.slice(); },
    get charges() { return charges; },
  };
})();

// Dans une page : l'île disponible charge ses fichiers (puis Ile.appliquer() par la page). Sous
// Node, rien : les outils chargent Ile.FICHIERS eux-mêmes et appellent Ile.appliquer().
if (Ile.decider() && typeof document !== 'undefined') Ile.charger();
