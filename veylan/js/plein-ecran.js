// Plein écran : l'API Fullscreen, avec son préfixe webkit (Safari). Indisponible sur iPhone
// (Safari n'y met que les vidéos) et dans un cadre qui ne l'autorise pas : on cache alors le
// bouton de l'interface et la case des Options plutôt que de les laisser sans effet.
const PleinEcran = (() => {
  const doc = document;
  const racine = () => doc.documentElement;

  function disponible() {
    const el = racine();
    return !!((doc.fullscreenEnabled && el.requestFullscreen) || (doc.webkitFullscreenEnabled && el.webkitRequestFullscreen));
  }

  function actif() { return !!(doc.fullscreenElement || doc.webkitFullscreenElement); }

  // À appeler depuis un geste du joueur (clic, touche) : le navigateur refuse sinon. La promesse
  // se résout dans tous les cas (un refus laisse l'écran comme il était).
  function basculer() {
    let p = null;
    try {
      if (actif()) p = doc.exitFullscreen ? doc.exitFullscreen() : doc.webkitExitFullscreen();
      else { const el = racine(); p = el.requestFullscreen ? el.requestFullscreen({ navigationUI: 'hide' }) : el.webkitRequestFullscreen(); }
    } catch (e) { /* refusé */ }
    return Promise.resolve(p).catch(() => {});
  }

  function surChangement(fn) {
    doc.addEventListener('fullscreenchange', fn);
    doc.addEventListener('webkitfullscreenchange', fn);
  }

  return { disponible, actif, basculer, surChangement };
})();
