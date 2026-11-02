// Le paysage animé, fond par défaut du voile de chargement (js/scene.js) : le paysage de la planche
// de la charte en calques (tools/paysage) et, par-dessus, ce qui bouge sans le fil principal
// (opacité et transformations, que le navigateur anime seul pendant que la page construit l'île) :
// - la grande île et les petits rochers flottent ;
// - le rayon de lumière bat, des lueurs y montent, il s'éclaire avec la progression ;
// - les cascades coulent, la brume dérive en bas, des lucioles montent.
// Positions en pourcentage de l'image, données dans son repère de 1280 de large (1280 x 1241) ;
// l'image livrée fait 1560 x 1512 (tools/paysage : la découpe sans perte de la planche, agrandie x4).
const VoilePaysage = (() => {
  const W = 1280, H = 1241;
  const pc = (v, t) => (v / t * 100).toFixed(3) + '%';
  const boite = (x0, y0, x1, y1) => `left:${pc(x0, W)};top:${pc(y0, H)};width:${pc(x1 - x0, W)};height:${pc(y1 - y0, H)}`;
  // Les calques détourés (tools/paysage/calques.py) et leur boîte dans l'image.
  const ILE = [571.1, 79.6, 740.9, 443.9], ROCS = [470.2, 119, 823.8, 506.3];
  // Les cascades : la grande à droite, les deux du milieu.
  const CASCADES = [[1003, 425, 1027, 640], [518, 800, 548, 990], [603, 805, 636, 990]];
  // Les lucioles : réparties dans le bas du tableau, chacune son départ, sa durée, sa dérive.
  const LUCIOLES = [[120, 980], [210, 1080], [300, 900], [360, 1120], [430, 1010], [480, 860], [560, 1060], [700, 1000], [760, 900],
    [820, 1100], [880, 960], [950, 1050], [1040, 880], [1100, 1010], [1180, 940], [260, 760], [1000, 760], [640, 1150]];

  function html() {
    const cascades = CASCADES.map(([x0, y0, x1, y1], i) => `<div class="vy-paysage__cascade" style="${boite(x0, y0, x1, y1)}"><i style="animation-duration:${(1.1 + i * 0.25).toFixed(2)}s"></i></div>`).join('');
    const montees = [-0.6, 0.4, -0.2, 0.8, 0.1, -0.9].map((dx, i) => `<i style="left:${(50 + dx * 30).toFixed(1)}%;animation-delay:${(-i * 0.83).toFixed(2)}s;animation-duration:${(4.2 + (i % 3) * 0.9).toFixed(2)}s"></i>`).join('');
    const lucioles = LUCIOLES.map(([x, y], i) => `<i class="vy-paysage__luciole" style="left:${pc(x, W)};top:${pc(y, H)};animation-delay:${(-(i * 1.37) % 9).toFixed(2)}s;animation-duration:${(7 + (i * 0.71) % 5).toFixed(2)}s;--dx:${((i % 5) - 2) * 9}px"></i>`).join('');
    return '<div class="vy-paysage">' +
      '<img class="vy-paysage__fond" src="assets/ui/paysage-fond.webp" alt="" decoding="sync">' +
      // le rayon sous l'île : son halo, son cœur, sa flaque de lumière en bas, les lueurs qui montent
      `<div class="vy-paysage__rayon" style="${boite(605, 400, 685, 800)}"><b></b><i class="coeur"></i><span class="montees">${montees}</span></div>` +
      `<div class="vy-paysage__flaque" style="${boite(560, 740, 730, 830)}"></div>` +
      `<div class="vy-paysage__rayon vy-paysage__rayon--violet" style="${boite(310, 50, 336, 390)}"><i class="coeur"></i></div>` +
      `<img class="vy-paysage__ile" src="assets/ui/paysage-ile.webp" alt="" decoding="sync" style="${boite(...ILE)}">` +
      `<img class="vy-paysage__rocs" src="assets/ui/paysage-rocs.webp" alt="" decoding="sync" style="${boite(...ROCS)}">` +
      cascades +
      `<div class="vy-paysage__ecume" style="${boite(480, 950, 680, 1030)}"></div>` +
      '<div class="vy-paysage__brume"><i></i><i></i><i></i></div>' +
      lucioles + '</div>';
  }

  // L'image d'abord : rien ne s'allume avant qu'elle soit décodée (sinon, un instant de noir).
  function demarrer(racine) {
    const b = racine.querySelector('.vy-paysage'), img = b && b.querySelector('.vy-paysage__fond');
    if (!img) return;
    const prete = () => b.classList.add('prete');
    if (img.decode) img.decode().then(prete, () => img.addEventListener('load', prete, { once: true }));
    else if (img.complete && img.naturalWidth) prete(); else img.addEventListener('load', prete, { once: true });
  }

  // Le rayon s'éclaire avec la progression (0 à 1).
  function progres(racine, p) {
    const b = racine.querySelector('.vy-paysage');
    if (b) b.style.setProperty('--p', Math.min(1, Math.max(0, p)).toFixed(3));
  }

  const IMAGES = ['assets/ui/paysage-fond.webp', 'assets/ui/paysage-ile.webp', 'assets/ui/paysage-rocs.webp', 'assets/ui/paysage-eau.webp'];
  return { html, demarrer, progres, IMAGES };
})();
