const PleinEcran = (() => {
  const doc = document;
  const racine = () => doc.documentElement;

  function disponible() {
    const el = racine();
    return !!((doc.fullscreenEnabled && el.requestFullscreen) || (doc.webkitFullscreenEnabled && el.webkitRequestFullscreen));
  }

  function actif() { return !!(doc.fullscreenElement || doc.webkitFullscreenElement); }

  function basculer() {
    let p = null;
    try {
      if (actif()) p = doc.exitFullscreen ? doc.exitFullscreen() : doc.webkitExitFullscreen();
      else { const el = racine(); p = el.requestFullscreen ? el.requestFullscreen({ navigationUI: 'hide' }) : el.webkitRequestFullscreen(); }
    } catch (e) {   }
    return Promise.resolve(p).catch(() => {});
  }

  function surChangement(fn) {
    doc.addEventListener('fullscreenchange', fn);
    doc.addEventListener('webkitfullscreenchange', fn);
  }

  return { disponible, actif, basculer, surChangement };
})();
