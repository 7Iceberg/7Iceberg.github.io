// Le chargement de Three.js (vendor/three.min.js), une seule fois pour toute la page, partagé par la
// carte du monde en 3D (js/hud-carte.js) et l'île d'Ervane (js/scene.js, docs/ILE-TECHNIQUE.md, 1.5) ;
// et le test synchrone de WebGL dont dépend la naissance sur Ervane (1.4).
//
// IleCharge.three(delai) rend une promesse de THREE. Un échec (fichier absent, refusé, trop lent :
// 20 s par défaut) rejette la promesse et l'oublie : un nouvel appel recommence (« Réessayer » du
// voile de repli, 1.8). IleCharge.webgl() dit si un contexte webgl2 ou webgl se crée.
const IleCharge = (() => {
  let promesse = null;
  let essais = 0;

  // vendor/three.min.js à côté de ce script, en local comme en ligne.
  function source() {
    let src = 'vendor/three.min.js';
    try {
      const ref = document.querySelector('script[src*="ile-charge.js"]') || document.querySelector('script[src*="hud-carte.js"]');
      if (ref && ref.src) src = new URL('../vendor/three.min.js', ref.src).href;
    } catch (e) { /* chemin relatif */ }
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

  // Un contexte webgl2 ou webgl se crée-t-il ? Gardé après le premier essai ; le contexte d'essai
  // est rendu aussitôt (un téléphone n'en garde qu'une poignée en vie).
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

  // ----- Le cache des peintures (2.12) -----
  // IndexedDB garde ce que la construction de l'île peint sur le processeur (matières, cartes,
  // toiles) : la première entrée peint et range, les suivantes relisent. Une seule entrée par
  // plateau et par taille de matières (l'ancienne part à l'écriture). Sans IndexedDB (navigation
  // privée, quota), on peint comme avant : chaque étape a sa minuterie et ne fait jamais échouer
  // la construction. `?cache=0` le coupe (mesures à froid).
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

  return { three, webgl, cache: { lire, ecrire, vider }, get essais() { return essais; }, get charge() { return typeof window !== 'undefined' && !!window.THREE; } };
})();
