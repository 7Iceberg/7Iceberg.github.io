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

  // ----- L'aperçu de nuit (docs/ILE-TECHNIQUE.md, 3.24) -----
  // L'ambiance voulue : 'nuit' si l'adresse porte ?ambiance=nuit, ou si la copie de l'aperçu a posé
  // DATA.ile.ambiance = 'nuit' (tools/make-online.sh --nuit) ; ?ambiance=jour l'emporte sur la donnée.
  // Sinon null : le jeu ne charge rien de plus et rien ne change.
  function ambiance() {
    let q = null;
    try { q = new URLSearchParams(location.search).get('ambiance'); } catch (e) { q = null; }
    if (q === 'nuit' || vignette()) return 'nuit';
    if (q === 'jour') return null;
    return typeof DATA === 'object' && DATA && DATA.ile && DATA.ile.ambiance === 'nuit' ? 'nuit' : null;
  }
  // La vignette de l'aperçu : ?vignette=nuit, ou DATA.ile.vignette posé par la copie
  // (tools/make-online.sh --vignette). Elle ouvre droit une partie d'invité, la nuit, au bord est des
  // Mailles, derrière la Place du Relais (une maison, son potager, la lèvre de l'île et le ciel) :
  // js/main.js. Rend le lieu { map, x, y }, ou null.
  const VIGNETTE = { map: 'ervane_mailles_place', x: 232.75, y: 85.75 };
  function vignette() {
    let q = null;
    try { q = new URLSearchParams(location.search).get('vignette'); } catch (e) { q = null; }
    if (q === '0') return null;
    const d = typeof DATA === 'object' && DATA && DATA.ile ? DATA.ile.vignette : null;
    if (q !== 'nuit' && !d) return null;
    return d && typeof d === 'object' ? Object.assign({}, VIGNETTE, d) : Object.assign({}, VIGNETTE);
  }
  // Un script classique de plus, une seule fois (chemin relatif à la racine du jeu, comme Three).
  const scripts = new Map();
  function script(chemin, delai) {
    if (scripts.has(chemin)) return scripts.get(chemin);
    const p = new Promise((ok, ko) => {
      const el = document.createElement('script');
      let src = chemin;
      try { src = new URL('../' + chemin, source()).href; } catch (e) { /* chemin relatif */ }
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
  // Les fichiers de l'aperçu de nuit : le module (js/ile-nuit.js) et les modèles libres convertis
  // (assets/libres/modeles-libres.js). Un échec n'empêche pas l'île : la nuit se passe des modèles.
  function nuit() {
    return Promise.all([
      typeof IleNuit === 'object' ? Promise.resolve() : script('js/ile-nuit.js'),
      typeof window !== 'undefined' && window.MODELES_LIBRES ? Promise.resolve() : script('assets/libres/modeles-libres.js').catch(e => { console.warn('Ervane : modèles libres absents', e); }),
    ]);
  }

  // ----- Le style Lisière (docs/ILE-TECHNIQUE.md, 3.25) -----
  // 'lisiere' si l'adresse porte ?style=lisiere, ou si DATA.ile.style = 'lisiere' ; ?style=0
  // l'emporte sur la donnée. Sinon null : rien de plus ne se charge.
  function style() {
    let q = null;
    try { q = new URLSearchParams(location.search).get('style'); } catch (e) { q = null; }
    if (q === 'lisiere') return 'lisiere';
    if (q === '0') return null;
    // La copie « vignette » (make-online.sh --vignette) et ?ambiance=nuit montrent l'aperçu de nuit
    // (3.24) tel quel, sans le style que la donnée allume (l'adresse peut demander les deux).
    let amb = null;
    try { amb = new URLSearchParams(location.search).get('ambiance'); } catch (e) { amb = null; }
    if (vignette() || amb === 'nuit') return null;
    return typeof DATA === 'object' && DATA && DATA.ile && DATA.ile.style === 'lisiere' && !faible() ? 'lisiere' : null;
  }
  // Ses fichiers : ceux de la nuit (le décor ajouté, les lucioles), puis js/ile-lisiere.js.
  function lisiere() {
    return nuit().then(() => (typeof IleLisiere === 'object' ? null : script('js/ile-lisiere.js')));
  }

  // ----- Le monde modelé dans Blender (tools/blender/monde, js/ile-glb.js) -----
  // 'glb' si l'adresse porte ?monde=glb, ou si DATA.ile.monde = 'glb' ; ?monde=0 l'éteint.
  function monde() {
    let q;
    try { q = new URLSearchParams(location.search).get('monde'); } catch (e) { q = null; }
    if (q === 'glb') return 'glb';
    if (q === '0') return null;
    return typeof DATA === 'object' && DATA && DATA.ile && DATA.ile.monde === 'glb' && !faible() ? 'glb' : null;
  }
  // Un appareil faible (3.28) : ?quality=basse, ou 2 Go de mémoire ou moins (navigator.deviceMemory,
  // que Chrome donne et que Safari tait). Le monde modelé et le style Lisière que la donnée allume
  // par défaut n'y viennent pas (le jeu dessiné par le code reste, moins lourd) ; l'adresse peut
  // toujours les demander. Le nombre de coeurs n'est pas un signe : Safari le plafonne contre le
  // pistage (à 2 sur certains iPhone), un bon téléphone passerait pour faible.
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

  // ----- Les héros modelés (js/ile-heros.js, assets/heros/) -----
  // La classe dont le modèle remplace le panneau du Veilleur : ?heros=<classe> la force (même sans
  // le monde modelé), ?heros=0 l'éteint ; sinon, avec le monde modelé, la classe du personnage si
  // elle a son fichier (IleHeros.FICHIERS), ce que dit 'auto'.
  function heros() {
    let q;
    try { q = new URLSearchParams(location.search).get('heros'); } catch (e) { q = null; }
    if (q === '0') return null;
    if (q) return q;
    if (monde() !== 'glb') return null;
    return typeof DATA === 'object' && DATA && DATA.ile && DATA.ile.heros === false ? null : 'auto';
  }
  function herosScript() {
    return glb().then(() => (typeof IleHeros === 'object' ? null : script('js/ile-heros.js')));
  }

  return { three, webgl, ambiance, vignette, style, lisiere, script, nuit, monde, glb, heros, herosScript, faible, cache: { lire, ecrire, vider }, get essais() { return essais; }, get charge() { return typeof window !== 'undefined' && !!window.THREE; } };
})();
