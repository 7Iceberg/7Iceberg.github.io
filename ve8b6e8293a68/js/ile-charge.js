const IleCharge = (() => {
  let promesse = null;
  let essais = 0;

  function source() {
    let src = 'vendor/three.min.js';
    try {
      const ref = document.querySelector('script[src*="ile-charge.js"]') || document.querySelector('script[src*="hud-carte.js"]');
      if (ref && ref.src) { const u = new URL(ref.src); src = new URL('../vendor/three.min.js', u).href + u.search; }
    } catch (e) {   }
    return src;
  }

  function three(delai) {
    if (typeof window !== 'undefined' && window.THREE) return Promise.resolve(window.THREE);
    if (promesse) return promesse;
    essais++;
    promesse = new Promise((ok, ko) => {
      const el = document.createElement('script');
      el.src = source();
      el.async = true;
      let fini = false;
      const fin = err => {
        if (fini) return;
        fini = true;
        clearTimeout(minuterie);
        if (err) { promesse = null; el.remove(); ko(err); } else ok(window.THREE);
      };
      const minuterie = setTimeout(() => fin(new Error('Three.js met trop de temps à se charger')), delai || 20000);
      el.onload = () => fin(window.THREE ? null : new Error('THREE absent'));
      el.onerror = () => fin(new Error('chargement de Three.js refusé'));
      document.head.appendChild(el);
    });
    return promesse;
  }

  let gl = null;
  function webgl() {
    if (gl != null) return gl;
    try {
      const c = document.createElement('canvas');
      const x = c.getContext('webgl2') || c.getContext('webgl');
      gl = !!x;
      const perte = x && x.getExtension('WEBGL_lose_context');
      if (perte) perte.loseContext();
    } catch (e) { gl = false; }
    return gl;
  }

  const BASE = 'veylan-ile', MAGASIN = 'peintures';
  let base = null;
  const coupe = () => { try { return new URLSearchParams(location.search).get('cache') === '0'; } catch (e) { return false; } };
  const borne = (promesse, ms) => Promise.race([promesse, new Promise(ok => setTimeout(() => ok(null), ms))]);
  function ouvrir() {
    if (base) return base;
    base = borne(new Promise(ok => {
      try {
        const rq = indexedDB.open(BASE, 1);
        rq.onupgradeneeded = () => { if (!rq.result.objectStoreNames.contains(MAGASIN)) rq.result.createObjectStore(MAGASIN); };
        rq.onsuccess = () => ok(rq.result);
        rq.onerror = rq.onblocked = () => ok(null);
      } catch (e) { ok(null); }
    }), 1500);
    return base;
  }
  async function lire(cle) {
    if (coupe() || typeof indexedDB === 'undefined') return null;
    const db = await ouvrir();
    if (!db) return null;
    return borne(new Promise(ok => {
      try { const rq = db.transaction(MAGASIN, 'readonly').objectStore(MAGASIN).get(cle); rq.onsuccess = () => ok(rq.result || null); rq.onerror = () => ok(null); } catch (e) { ok(null); }
    }), 3000);
  }
  async function ecrire(cle, valeur, prefixe) {
    if (coupe() || typeof indexedDB === 'undefined') return false;
    const db = await ouvrir();
    if (!db) return false;
    return borne(new Promise(ok => {
      try {
        const tx = db.transaction(MAGASIN, 'readwrite'), st = tx.objectStore(MAGASIN);
        const rq = st.getAllKeys();
        rq.onsuccess = () => { for (const k of rq.result) if (String(k).startsWith(prefixe) && k !== cle) st.delete(k); st.put(valeur, cle); };
        tx.oncomplete = () => ok(true);
        tx.onerror = tx.onabort = () => ok(false);
      } catch (e) { ok(false); }
    }), 10000);
  }
  async function vider() {
    const db = typeof indexedDB === 'undefined' ? null : await ouvrir();
    if (!db) return false;
    return borne(new Promise(ok => { try { const tx = db.transaction(MAGASIN, 'readwrite'); tx.objectStore(MAGASIN).clear(); tx.oncomplete = () => ok(true); tx.onerror = tx.onabort = () => ok(false); } catch (e) { ok(false); } }), 3000);
  }

  function ambiance() {
    let q = null;
    try { q = new URLSearchParams(location.search).get('ambiance'); } catch (e) { q = null; }
    if (q === 'nuit' || vignette()) return 'nuit';
    if (q === 'jour') return null;
    return typeof DATA === 'object' && DATA && DATA.ile && DATA.ile.ambiance === 'nuit' ? 'nuit' : null;
  }
  const VIGNETTE = { map: 'ervane_mailles_place', x: 232.75, y: 85.75 };
  function vignette() {
    let q = null;
    try { q = new URLSearchParams(location.search).get('vignette'); } catch (e) { q = null; }
    if (q === '0') return null;
    const d = typeof DATA === 'object' && DATA && DATA.ile ? DATA.ile.vignette : null;
    if (q !== 'nuit' && !d) return null;
    return d && typeof d === 'object' ? Object.assign({}, VIGNETTE, d) : Object.assign({}, VIGNETTE);
  }
  const scripts = new Map();
  function script(chemin, delai) {
    if (scripts.has(chemin)) return scripts.get(chemin);
    const p = new Promise((ok, ko) => {
      const el = document.createElement('script');
      let src = chemin;
      try { src = new URL('../' + chemin, source()).href; } catch (e) {   }
      el.src = src;
      el.async = true;
      const minuterie = setTimeout(() => { scripts.delete(chemin); ko(new Error(chemin + ' met trop de temps à se charger')); }, delai || 20000);
      el.onload = () => { clearTimeout(minuterie); ok(); };
      el.onerror = () => { clearTimeout(minuterie); scripts.delete(chemin); el.remove(); ko(new Error('chargement refusé : ' + chemin)); };
      document.head.appendChild(el);
    });
    scripts.set(chemin, p);
    return p;
  }
  function nuit() {
    return Promise.all([
      typeof IleNuit === 'object' ? Promise.resolve() : script('js/ile-nuit.js'),
      typeof window !== 'undefined' && window.MODELES_LIBRES ? Promise.resolve() : script('assets/libres/modeles-libres.js').catch(e => { console.warn('Ervane : modèles libres absents', e); }),
    ]);
  }

  function style() {
    let q = null;
    try { q = new URLSearchParams(location.search).get('style'); } catch (e) { q = null; }
    if (q === 'lisiere') return 'lisiere';
    if (q === '0') return null;
    let amb = null;
    try { amb = new URLSearchParams(location.search).get('ambiance'); } catch (e) { amb = null; }
    if (vignette() || amb === 'nuit') return null;
    return typeof DATA === 'object' && DATA && DATA.ile && DATA.ile.style === 'lisiere' && !faible() ? 'lisiere' : null;
  }
  function lisiere() {
    return nuit().then(() => (typeof IleLisiere === 'object' ? null : script('js/ile-lisiere.js')));
  }

  function monde() {
    let q;
    try { q = new URLSearchParams(location.search).get('monde'); } catch (e) { q = null; }
    if (q === 'glb') return 'glb';
    if (q === '0') return null;
    return typeof DATA === 'object' && DATA && DATA.ile && DATA.ile.monde === 'glb' && !faible() ? 'glb' : null;
  }
  function faible() {
    let q = null;
    try { q = new URLSearchParams(location.search).get('quality'); } catch (e) { q = null; }
    if (q === 'basse') return true;
    if (q === 'haute' || q === 'moyenne') return false;
    const n = typeof navigator !== 'undefined' && navigator ? navigator : {};
    return (n.deviceMemory || 4) <= 2;
  }
  function glb() {
    return typeof IleGlb === 'object' ? Promise.resolve() : script('js/ile-glb.js');
  }

  function heros() {
    let q;
    try { q = new URLSearchParams(location.search).get('heros'); } catch (e) { q = null; }
    if (q === '0') return null;
    if (q) return q;
    if (monde() !== 'glb') return null;
    return typeof DATA === 'object' && DATA && DATA.ile && DATA.ile.heros === false ? null : 'auto';
  }
  function modeles() {
    let q;
    try { q = new URLSearchParams(location.search).get('modeles'); } catch (e) { q = null; }
    if (q === '0' || monde() !== 'glb') return null;
    return typeof DATA === 'object' && DATA && DATA.ile && DATA.ile.modeles === false ? null : 'oui';
  }
  function modelesScript() {
    return glb().then(() => (typeof IleModeles === 'object' ? null : script('js/ile-modeles.js')));
  }
  function herosScript() {
    return glb().then(() => (typeof IleHeros === 'object' ? null : script('js/ile-heros.js')));
  }
  function peauScript() {
    return glb().then(() => (typeof IlePeau === 'object' ? null : script('js/ile-peau.js')));
  }

  function reperes() {
    let q;
    try { q = new URLSearchParams(location.search).get('reperes'); } catch (e) { q = null; }
    if (q === '0') return null;
    return typeof DATA === 'object' && DATA && DATA.ile && DATA.ile.reperes && DATA.ile.reperesActifs !== false ? 'oui' : null;
  }
  function reperesScript() {
    return glb().then(() => (typeof IleReperes === 'object' ? null : script('js/ile-reperes.js')));
  }

  return { three, webgl, ambiance, vignette, style, lisiere, script, nuit, monde, glb, heros, herosScript, peauScript, modeles, modelesScript, reperes, reperesScript, faible, cache: { lire, ecrire, vider }, get essais() { return essais; }, get charge() { return typeof window !== 'undefined' && !!window.THREE; } };
})();
