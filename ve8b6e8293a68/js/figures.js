const Figures = (() => {
  const LISTE = typeof FIGURES_IMAGES === 'object' && FIGURES_IMAGES ? FIGURES_IMAGES : {};
  const IMAGES = new Map();
  const navigateur = typeof Image === 'function' && typeof document === 'object';
  function de(id) { return id && LISTE[id] ? id : null; }
  function image(id) {
    if (!navigateur || !LISTE[id]) return null;
    let im = IMAGES.get(id);
    if (!im) { im = new Image(); im.decoding = 'async'; im.src = LISTE[id]; IMAGES.set(id, im); }
    return im.complete && im.naturalWidth > 0 ? im : null;
  }
  function cle(id) { return id && image(id) ? 'fig:' + id : ''; }
  function precharger() { for (const id of Object.keys(LISTE)) image(id); }
  function poser(c, p, s, im) {
    const H = 80, W = H * im.naturalWidth / im.naturalHeight;
    c.save();
    if (s && s.flash && 'filter' in c) c.filter = 'brightness(1.9)';
    c.drawImage(im, p.x - W / 2, p.y - H * 0.94, W, H);
    c.restore();
  }
  if (navigateur) precharger();
  return { LISTE, de, image, cle, precharger, poser };
})();
if (typeof module !== 'undefined' && module.exports) module.exports = Figures;
