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
  function enDev(p) {
    const l = lieu();
    if (!l) return false;
    if (typeof Util === 'object' && Util && typeof Util.dev === 'function') return Util.dev(l);
    return l.protocol === 'file:' || /^(localhost|127\.0\.0\.1)$/.test(l.hostname || '') || p.dev === '1';
  }
  const lire = (store, k) => { try { return typeof store === 'object' && store ? store.getItem(k) : null; } catch (e) { return null; } };
  const local = () => (typeof localStorage !== 'undefined' ? localStorage : null);
  const session = () => (typeof sessionStorage !== 'undefined' ? sessionStorage : null);

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
    } catch (e) {   }
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

  function appliquer() {
    const M = (typeof DATA === 'object' && DATA.modules) || {};
    let fait = false;
    for (const nom of ORDRE) if (!appliques.has(nom) && typeof M[nom] === 'function') { M[nom](); appliques.add(nom); fait = true; }
    disponible = disponible || appliques.has('ervane');
    if (fait && typeof World === 'function' && World.reindexer) World.reindexer();
    return fait;
  }
  function origineDe(uid) {
    const s = local();
    if (!s || typeof uid !== 'string') return null;
    let o = null;
    try { o = JSON.parse(s.getItem('veylan.perso.' + uid)); } catch (e) { o = null; }
    const ch = o && o.character;
    return ch && typeof ch === 'object' && typeof ch.origine === 'string' ? ch.origine : null;
  }
  function appliquerOrsane() {
    const M = (typeof DATA === 'object' && DATA.modules) || {};
    if (appliques.has('ervaneOrsane') || typeof M.ervaneOrsane !== 'function') return false;
    M.ervaneOrsane();
    appliques.add('ervaneOrsane');
    if (typeof World === 'function' && World.reindexer) World.reindexer();
    return true;
  }
  const actif = () => appliques.has('ervane');

  function orsane3dAllume() {
    const p = parametres(), dev = enDev(p);
    if (p.orsane3d === '0') return false;
    if (dev && (p.orsane3d === '1' || lire(local(), 'veylan.orsane3d.essai') === '1')) return true;
    return !!(typeof DATA === 'object' && DATA.ile && DATA.ile.orsane3d);
  }
  const PAS_EN_3D = 'veylan.orsane2d.';
  function orsane3dPour(ch) {
    if (!orsane3dAllume() || !actif()) return false;
    const M = (typeof DATA === 'object' && DATA.modules) || {};
    if (typeof M.orsanePlateau !== 'function' || typeof M.orsaneAires !== 'function') return false;
    if (typeof IleCharge === 'object' && IleCharge.webgl && !IleCharge.webgl()) return false;
    if (!ch || typeof ch !== 'object') return true;
    const t = ch.tuto;
    if (t && typeof t === 'object' && !t.done && t.mode !== 'off' && t.jeu !== 'ile') return false;
    if (typeof ch.uid === 'string' && lire(local(), PAS_EN_3D + ch.uid) === '1') return false;
    return true;
  }
  function brut(uid) {
    const s = local();
    if (!s || typeof uid !== 'string') return null;
    let o = null;
    try { o = JSON.parse(s.getItem('veylan.perso.' + uid)); } catch (e) { o = null; }
    return o && o.character && typeof o.character === 'object' ? o.character : null;
  }
  function appliquerOrsane3D() {
    const M = (typeof DATA === 'object' && DATA.modules) || {};
    if (appliques.has('orsanePlateau') || typeof M.orsanePlateau !== 'function' || typeof M.orsaneAires !== 'function') return false;
    M.orsanePlateau();
    appliques.add('orsanePlateau');
    M.orsaneAires();
    appliques.add('orsaneAires');
    if (typeof M.kaldumPlateau === 'function' && typeof M.kaldumAires === 'function') {
      M.kaldumPlateau(); appliques.add('kaldumPlateau');
      M.kaldumAires(); appliques.add('kaldumAires');
    }
    if (typeof World === 'function' && World.reindexer) World.reindexer();
    return true;
  }
  function appliquerOrsane3DPour(uidOuPerso) {
    const ch = typeof uidOuPerso === 'string' ? brut(uidOuPerso) : uidOuPerso;
    if (typeof uidOuPerso === 'string' && !ch) return false;
    return orsane3dPour(ch) ? (appliquerOrsane3D(), true) : false;
  }
  const orsane3D = () => appliques.has('orsanePlateau');
  function continuerEn2D(uid) {
    const s = local();
    if (!s || typeof uid !== 'string') return false;
    try { s.setItem(PAS_EN_3D + uid, '1'); return true; } catch (e) { return false; }
  }

  const plateau = id => ((DATA.content && DATA.content.plateaux) || []).find(p => p.id === id) || null;
  function carte(mapId) {
    for (const z of (DATA.content && DATA.content.zones) || []) for (const m of z.maps || []) if (m.id === mapId) return m;
    return null;
  }
  const estPlateau = mapId => { const m = typeof mapId === 'string' ? carte(mapId) : null; return !!(m && m.plateau && plateau(m.plateau)); };
  function donjon3D(id) {
    const did = String(id || '').split('#')[0];
    const d = ((DATA.content && DATA.content.dungeons) || []).find(x => x.id === did);
    return !!(d && d.salles3d && estPlateau(d.entryMap));
  }
  function terrain(id, opts) {
    if (opts && opts.seul) for (const k of [...cache.keys()]) if (k !== id) cache.delete(k);
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
  const garderSeul = id => { for (const k of [...cache.keys()]) if (k !== id) cache.delete(k); };
  const registre = () => cache.size;

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

  const FICHIERS = {
    donnees: ['js/data-ile.js', 'content/ervane.js', 'content/ervane-aires.js', 'content/ervane-orsane.js', 'content/tutoriel-ile.js', 'content/orsane-plateau.js', 'content/orsane-aires.js', 'content/kaldum-plateau.js', 'content/kaldum-aires.js'],
    moteur: ['js/ile-terrain.js', 'js/ile-nav.js', 'js/plateau.js'],
    rendu: ['js/ile-peinture.js', 'js/ile-camera.js', 'js/ile-sol.js', 'js/ile-decor.js', 'js/ile-figures.js', 'js/ile-arene.js', 'js/ile-salle.js', 'js/ile-3d.js', 'js/ile-carte.js', 'js/voile-paysage.js', 'js/voile-medaille.js', 'js/scene.js'],
  };
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
    decider, appliquer, appliquerOrsane, origineDe, actif, plateau, terrain, oublier, garderSeul, registre, estPlateau, donjon3D, fairenaitre, trace, charger, FICHIERS,
    orsane3dAllume, orsane3dPour, appliquerOrsane3D, appliquerOrsane3DPour, orsane3D, continuerEn2D,
    get disponible() { return disponible; }, get allumee() { return allumee; }, get raisons() { return raisons.slice(); },
    get charges() { return charges; },
  };
})();

if (Ile.decider() && typeof document !== 'undefined') Ile.charger();
