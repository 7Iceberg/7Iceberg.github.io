// Les tuiles des sorts, à la manière de Dofus (docs/ANALYSE-ARBRE-SORTS.md) : un carré arrondi au
// cadre en relief de la couleur de l'élément (argent pour Aer, or pour Neutre, vert pour Terra,
// rouge pour Ignis, bleu pour Aqua), un médaillon creusé au centre, le motif du sort ton sur ton
// (clair, cerné de la teinte sombre de l'élément), les fils du Voile en cyan, et au bas les étoiles
// d'or du rang. Chaque motif est dessiné pour son sort : les dix du Lyssar et leurs variantes pour
// l'instant ; les autres sorts gardent leur icône peinte (js/sort-icones.js, qui demande ici d'abord).
// En SVG, gardé en data URL par sort et par rang.
const SortTuiles = (() => {
  const PAL = {
    air:    { cadre: ['#f6f8fc', '#aeb9ca', '#4d586c'], disque: ['#f1f5fa', '#a9b8cc'], motif: ['#ffffff', '#dfe6ef'], trait: '#47536a' },
    neutre: { cadre: ['#f3d796', '#bf9146', '#5f4117'], disque: ['#fbe8b8', '#d0a457'], motif: ['#fffaf0', '#f3dcae'], trait: '#6e4a17' },
    terre:  { cadre: ['#c4e6a3', '#66a34a', '#28481b'], disque: ['#def3c6', '#86bd63'], motif: ['#fbfff4', '#e2f2cf'], trait: '#2b4d1d' },
    feu:    { cadre: ['#f8b49b', '#d2542f', '#5e190a'], disque: ['#ffd8c6', '#e8774f'], motif: ['#fff7f2', '#fbdccd'], trait: '#6d1f0d' },
    eau:    { cadre: ['#a8e4f1', '#3aa6c3', '#11495c'], disque: ['#d9f6fc', '#6dcbe1'], motif: ['#f6feff', '#d5f2f9'], trait: '#124a5e' },
  };
  const star4 = (cx, cy, r) => { const k = r * 0.28; return `M${cx} ${cy - r}L${cx + k} ${cy - k}L${cx + r} ${cy}L${cx + k} ${cy + k}L${cx} ${cy + r}L${cx - k} ${cy + k}L${cx - r} ${cy}L${cx - k} ${cy - k}Z`; };
  const star5 = (cx, cy, R) => { let d = ''; for (let i = 0; i < 10; i++) { const r = i % 2 ? R * 0.45 : R, a = (i * 36 - 90) * Math.PI / 180; d += (i ? 'L' : 'M') + (cx + Math.cos(a) * r).toFixed(2) + ' ' + (cy + Math.sin(a) * r).toFixed(2); } return d + 'Z'; };
  // Une tuile de sort : le cadre carré arrondi en relief, le médaillon creusé au centre, le motif ton
  // sur ton (clair, cerné de la teinte sombre de l'élément), les fils du Voile en cyan, et en bas les
  // étoiles d'or du rang (0 à 5).
  function tuile(id, el, motif, rang) {
    const P = PAL[el], [c1, c2, c3] = P.cadre, [d1, d2] = P.disque, [m1, m2] = P.motif, lo = P.trait;
    const k = `${id}-${rang || 0}`;
    const m = motif.replace(/§ID/g, k).replace(/§LU/g, `url(#lu-${k})`).replace(/§LO/g, lo).replace(/§I/g, `url(#iv-${k})`).replace(/§T/g, '#36dcff');
    let etoiles = '';
    if (rang) { const n = rang, w = 11.5, x0 = 50 - (n - 1) * w / 2; for (let i = 0; i < n; i++) etoiles += `<path d="${star5(x0 + i * w, 92, 6.2)}" fill="url(#or-${k})" stroke="#6b430c" stroke-width="1.1" stroke-linejoin="round"/>`; }
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><defs>
  <linearGradient id="ca-${k}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${c1}"/><stop offset=".55" stop-color="${c2}"/><stop offset="1" stop-color="${c3}"/></linearGradient>
  <radialGradient id="di-${k}" cx="44%" cy="36%" r="70%"><stop offset="0" stop-color="${d1}"/><stop offset=".7" stop-color="${d2}"/><stop offset="1" stop-color="${c3}"/></radialGradient>
  <linearGradient id="iv-${k}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${m1}"/><stop offset="1" stop-color="${m2}"/></linearGradient>
  <linearGradient id="fx-${k}" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#36dcff" stop-opacity="0"/><stop offset=".55" stop-color="#9ff3ff"/><stop offset="1" stop-color="#ffffff"/></linearGradient>
  <linearGradient id="or-${k}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff2b0"/><stop offset=".5" stop-color="#ffd24d"/><stop offset="1" stop-color="#d9951c"/></linearGradient>
  <filter id="om-${k}" x="-20%" y="-20%" width="140%" height="140%"><feMorphology in="SourceAlpha" operator="dilate" radius="1.5" result="d"/><feFlood flood-color="${lo}"/><feComposite in2="d" operator="in" result="contour"/><feGaussianBlur in="d" stdDeviation="1.6"/><feOffset dx="1" dy="2.2" result="ob"/><feFlood flood-color="${c3}" flood-opacity=".55"/><feComposite in2="ob" operator="in" result="ombre"/><feMerge><feMergeNode in="ombre"/><feMergeNode in="contour"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
  <filter id="lu-${k}" x="-60%" y="-60%" width="220%" height="220%"><feGaussianBlur stdDeviation="1.4" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
  <filter id="cr-${k}" x="-10%" y="-10%" width="120%" height="120%"><feGaussianBlur in="SourceAlpha" stdDeviation="2.2"/><feOffset dy="2.4"/><feComposite in2="SourceAlpha" operator="arithmetic" k2="-1" k3="1" result="i"/><feFlood flood-color="#000" flood-opacity=".45"/><feComposite in2="i" operator="in"/><feComposite in2="SourceGraphic" operator="over"/></filter>
  <clipPath id="cl-${k}"><circle cx="50" cy="47" r="35"/></clipPath></defs>
  <rect x="1.5" y="1.5" width="97" height="97" rx="21" fill="url(#ca-${k})" stroke="${c3}" stroke-width="3"/>
  <rect x="5" y="5" width="90" height="90" rx="17.5" fill="none" stroke="#fff" stroke-opacity=".45" stroke-width="1.6"/>
  <path d="M7 30Q7 7 30 7H70Q93 7 93 30" fill="none" stroke="#fff" stroke-opacity=".35" stroke-width="2.4"/>
  <circle cx="50" cy="47" r="38.5" fill="${c3}" opacity=".55"/>
  <circle cx="50" cy="47" r="37" fill="none" stroke="#fff" stroke-opacity=".5" stroke-width="1.4"/>
  <circle cx="50" cy="47" r="35" fill="url(#di-${k})" filter="url(#cr-${k})"/>
  <g clip-path="url(#cl-${k})"><ellipse cx="50" cy="40" rx="26" ry="20" fill="#fff" opacity=".22"/>
  <g filter="url(#om-${k})"><g transform="translate(50 47) scale(.74) translate(-50 -50)">${m}</g></g>
  <path d="M17 32Q50 10 83 32Q50 20 17 32Z" fill="#fff" opacity=".25"/></g>
  ${etoiles}</svg>`;
  }
  const S = {
    trait_tisse: ['air', `<g transform="rotate(-45 50 50)">
      <path d="M10 50C18 40 26 60 34 50S50 40 58 50" fill="none" stroke="§T" stroke-width="2.6" stroke-linecap="round" filter="§LU"/>
      <rect x="20" y="47.4" width="52" height="5.2" rx="2.6" fill="§I"/>
      <path d="M90 50L68 38.5L72.5 50L68 61.5Z" fill="§I"/>
      <path d="M31 50L19 38H10L21 50L10 62H19Z" fill="§I"/></g>
      <path d="${star4(79, 21, 7)}" fill="#e9fdff" filter="§LU"/>`],
    fil_tendu: ['air', `<circle cx="15" cy="58" r="5.5" fill="none" stroke="§I" stroke-width="3.4"/>
      <path d="M20.5 57.2L56 50.6" stroke="§T" stroke-width="2.8" stroke-linecap="round" filter="§LU"/>
      <path d="M65 49.4L50 40.5L53.6 49.9L50.6 59Z" fill="§I"/>
      <path d="M66 31L82 50L66 69H72.5L88.5 50L72.5 31Z" fill="§I"/>
      <path d="M80 37L91.5 50L80 63H84.5L96 50L84.5 37Z" fill="§I" opacity=".6"/>`],
    collet: ['neutre', `<ellipse cx="48" cy="69" rx="36" ry="12" fill="#000" opacity=".22"/>
      <ellipse cx="46" cy="66" rx="26" ry="9" fill="none" stroke="§T" stroke-width="3.2" filter="§LU"/>
      <path d="M71.5 63C78 58 77 47 72 41" fill="none" stroke="§T" stroke-width="2.6" stroke-linecap="round" filter="§LU"/>
      <path d="M69.6 24L76.6 25L73.8 62L68.8 61.4Z" fill="§I"/>
      <path d="M68.8 61.4L73.8 62L70.6 70Z" fill="§I"/>
      <circle cx="72" cy="63.5" r="3.4" fill="§I"/>
      <path d="${star4(30, 56, 4.5)}" fill="#e9fdff" filter="§LU"/><path d="${star4(52, 76, 3.5)}" fill="#e9fdff" filter="§LU"/>`],
    repli_traqueur: ['neutre', `<path d="M78 28C60 24 40 33 32.7 52" fill="none" stroke="§I" stroke-width="7.5" stroke-linecap="round"/>
      <path d="M27.6 66.2L41 55.4L25 48.8Z" fill="§I"/>
      <path d="M66 44L88 42M62 55H86M58 66L80 68" stroke="§I" stroke-width="3.2" stroke-linecap="round" opacity=".65"/>`],
    balise_de_fil: ['neutre', `<ellipse cx="61.5" cy="80" rx="20" ry="6" fill="#000" opacity=".25"/>
      <path d="M12 76Q26 34 57 26" fill="none" stroke="§T" stroke-width="2.6" stroke-dasharray="5 4" stroke-linecap="round" filter="§LU"/>
      <rect x="58" y="32" width="7.2" height="40" rx="2" fill="§I"/>
      <path d="M58 70H65.2L61.6 82Z" fill="§I"/>
      <path d="M61.6 8L71 21L61.6 34L52.2 21Z" fill="#7fe8ff" filter="§LU"/>
      <path d="M61.6 8L71 21H61.6Z" fill="#effdff" opacity=".85"/>`],
    corde_longue: ['neutre', `<path d="M36 13Q6 50 36 87" fill="none" stroke="§I" stroke-width="6.5" stroke-linecap="round"/>
      <path d="M36 13L53 50L36 87" fill="none" stroke="§T" stroke-width="2.2" filter="§LU"/>
      <rect x="50" y="48" width="33" height="4.4" rx="2.2" fill="§I"/>
      <path d="M95 50.2L81 42.5L84.4 50.2L81 58Z" fill="§I"/>
      <path d="M73 21V37M65 29H81" stroke="#e9fdff" stroke-width="3.6" stroke-linecap="round" filter="§LU"/>`],
    marque_traqueur: ['neutre', `<circle cx="50" cy="50" r="28" fill="none" stroke="§I" stroke-width="4.2"/>
      <path d="M50 12V25M50 75V88M12 50H25M75 50H88" stroke="§I" stroke-width="4.2" stroke-linecap="round"/>
      <path d="M30 50Q50 33 70 50Q50 67 30 50Z" fill="§I"/>
      <circle cx="50" cy="50" r="8" fill="#5fdcff" filter="§LU"/><circle cx="50" cy="50" r="3.2" fill="#13243a"/><circle cx="52.5" cy="47.5" r="1.6" fill="#fff"/>`],
    pluie_de_fil: ['air', `<path d="M30 6C26 10 34 14 30 18M50 2C46 6 54 10 50 14M70 8C66 12 74 16 70 20" fill="none" stroke="§T" stroke-width="2.2" stroke-linecap="round" filter="§LU"/>
      <g fill="§I"><rect x="28" y="20" width="4" height="30" rx="2"/><path d="M30 62L22.5 47L30 51L37.5 47Z"/><path d="M30 22L24 14V10L30 18L36 10V14Z"/>
      <rect x="48" y="16" width="4" height="34" rx="2"/><path d="M50 64L42.5 49L50 53L57.5 49Z"/><path d="M50 18L44 10V6L50 14L56 6V10Z"/>
      <rect x="68" y="22" width="4" height="30" rx="2"/><path d="M70 64L62.5 49L70 53L77.5 49Z"/><path d="M70 24L64 16V12L70 20L76 12V16Z"/></g>
      <ellipse cx="50" cy="78" rx="31" ry="7.5" fill="none" stroke="§T" stroke-width="2.4" filter="§LU" opacity=".9"/>`],
    fleche_ancre: ['terre', `<path d="M4 82Q50 72 96 82V100H4Z" fill="#000" opacity=".24"/>
      <path d="M50 79L43 90M50 79L59 91" stroke="#000" stroke-opacity=".3" stroke-width="2.2" stroke-linecap="round"/>
      <rect x="47.4" y="18" width="5.2" height="52" rx="2.6" fill="§I"/>
      <path d="M50 25L39 12V5L50 18L61 5V12Z" fill="§I"/>
      <rect x="35" y="38" width="30" height="5.4" rx="2.7" fill="§I"/>
      <path d="M27 57Q50 86 73 57" fill="none" stroke="§I" stroke-width="6" stroke-linecap="round"/>
      <path d="M21 50L35 55L26 64Z M79 50L65 55L74 64Z" fill="§I"/>
      <path d="${star4(76, 24, 5)}" fill="#f4ffd8" filter="§LU"/>`],
    trait_du_veilleur: ['air', `<g transform="rotate(-20 50 50)">
      <path d="M4 41H32M0 50H36M6 59H30" stroke="§T" stroke-width="2.2" opacity=".6" stroke-linecap="round"/>
      <rect x="14" y="44.5" width="74" height="11" rx="5.5" fill="url(#fx-§ID)" filter="§LU"/>
      <rect x="30" y="48.2" width="56" height="3.6" rx="1.8" fill="#fff"/>
      <ellipse cx="44" cy="50" rx="5.2" ry="16" fill="none" stroke="§I" stroke-width="3.4"/>
      <ellipse cx="64" cy="50" rx="5.2" ry="16" fill="none" stroke="§I" stroke-width="3.4"/>
      <path d="M99 50L82 39.5L86.5 50L82 60.5Z" fill="§I"/></g>`],
    // ----- Les variantes (une par sort, à la manière de Dofus) -----
    fleche_nouee: ['terre', `<g transform="rotate(-45 50 50)">
      <rect x="16" y="45" width="52" height="10" rx="5" fill="§I"/>
      <path d="M90 50L64 33L69.5 50L64 67Z" fill="§I"/>
      <path d="M28 50L15 35H6L18 50L6 65H15Z" fill="§I"/></g>
      <ellipse cx="47" cy="53" rx="13" ry="6" transform="rotate(45 47 53)" fill="none" stroke="§T" stroke-width="3" filter="§LU"/>
      <ellipse cx="47" cy="53" rx="13" ry="6" transform="rotate(-45 47 53)" fill="none" stroke="§T" stroke-width="3" filter="§LU"/>`],
    fil_rappel: ['air', `<path d="M86 30V58A10 10 0 0 1 66 58" fill="none" stroke="§I" stroke-width="6" stroke-linecap="round"/>
      <path d="M66 56L42 50" stroke="§T" stroke-width="2.8" stroke-linecap="round" filter="§LU"/>
      <path d="M36 31L18 50L36 69H29.5L11.5 50L29.5 31Z" fill="§I"/>
      <path d="M50 37L38 50L50 63H45L33 50L45 37Z" fill="§I" opacity=".65"/>`],
    noeud_coulant: ['neutre', `<ellipse cx="50" cy="64" rx="34" ry="12" fill="#000" opacity=".2"/>
      <ellipse cx="50" cy="60" rx="24" ry="9" fill="none" stroke="§T" stroke-width="3.2" filter="§LU"/>
      <path d="M70 55C80 44 78 26 66 16" fill="none" stroke="§I" stroke-width="5" stroke-linecap="round"/>
      <path d="M12 60H24M27 60L21 55V65Z M88 60H76M73 60L79 55V65Z" stroke="§I" stroke-width="3" fill="§I" stroke-linejoin="round"/>
      <path d="M50 82V74M50 71L45 77H55Z" stroke="§I" stroke-width="3" fill="§I" stroke-linejoin="round"/>`],
    bond_traqueur: ['neutre', `<path d="M8 80H40M60 80H92" stroke="§I" stroke-width="3" stroke-linecap="round" opacity=".55"/>
      <path d="M18 76C24 30 62 18 78 52" fill="none" stroke="§I" stroke-width="7" stroke-linecap="round" stroke-dasharray="0.1 0" />
      <path d="M85.5 66L70 52.5L86 46Z" fill="§I"/>
      <ellipse cx="80" cy="78" rx="12" ry="4.5" fill="none" stroke="§T" stroke-width="2.8" filter="§LU"/>
      <circle cx="18" cy="79" r="4" fill="§I"/>`],
    leurre_de_fil: ['neutre', `<circle cx="56" cy="30" r="12" fill="none" stroke="§T" stroke-width="3" stroke-dasharray="5 3.5" filter="§LU"/>
      <path d="M34 82C34 58 44 48 56 48S78 58 78 82" fill="none" stroke="§T" stroke-width="3" stroke-dasharray="5 3.5" filter="§LU"/>
      <rect x="8" y="57" width="34" height="5" rx="2.5" fill="§I"/>
      <path d="M50 59.5L36 51L39.5 59.5L36 68Z" fill="§I"/>
      <path d="M14 59.5L7 52H2L9 59.5L2 67H7Z" fill="§I"/>`],
    corde_raide: ['feu', `<path d="M40 12Q14 50 40 88" fill="none" stroke="§I" stroke-width="7" stroke-linecap="round"/>
      <path d="M40 12L40 88" stroke="§T" stroke-width="2.2" filter="§LU"/>
      <rect x="38" y="47.6" width="40" height="4.8" rx="2.4" fill="§I"/>
      <path d="M94 50L78 41.5L82 50L78 58.5Z" fill="§I"/>
      <path d="M70 22C66 30 76 30 72 38M82 18C78 26 88 26 84 34" fill="none" stroke="§I" stroke-width="3.2" stroke-linecap="round"/>`],
    marque_clouee: ['terre', `<circle cx="50" cy="54" r="27" fill="none" stroke="§I" stroke-width="4.2"/>
      <path d="M23 54H32M68 54H77M50 81V90" stroke="§I" stroke-width="4.2" stroke-linecap="round"/>
      <rect x="36" y="10" width="28" height="9" rx="3" fill="§I"/>
      <path d="M45 19H55L53 66L50 74L47 66Z" fill="§I"/>
      <ellipse cx="50" cy="70" rx="12" ry="4" fill="none" stroke="§T" stroke-width="2.6" filter="§LU"/>`],
    rideau_de_fil: ['air', `<rect x="12" y="14" width="76" height="7" rx="3.5" fill="§I"/>
      <path d="M22 22C18 34 26 46 22 58S26 74 22 82M36 22C32 34 40 46 36 58S40 74 36 82M50 22C46 34 54 46 50 58S54 74 50 82M64 22C60 34 68 46 64 58S68 74 64 82M78 22C74 34 82 46 78 58S82 74 78 82" fill="none" stroke="§T" stroke-width="2.6" stroke-linecap="round" filter="§LU"/>
      <circle cx="12" cy="17.5" r="5" fill="§I"/><circle cx="88" cy="17.5" r="5" fill="§I"/>`],
    fleche_lestee: ['terre', `<g transform="rotate(30 50 40)">
      <rect x="10" y="37.6" width="58" height="4.8" rx="2.4" fill="§I"/>
      <path d="M88 40L68 29.5L72.5 40L68 50.5Z" fill="§I"/>
      <path d="M22 40L12 30H5L14 40L5 50H12Z" fill="§I"/></g>
      <path d="M44 45V58" stroke="§T" stroke-width="2.6" filter="§LU"/>
      <circle cx="44" cy="61" r="4" fill="none" stroke="§I" stroke-width="2.6"/>
      <path d="M34 66H54L60 88H28Z" fill="§I"/>`],
    eclat_ysvane: ['air', `<path d="${star4(60, 44, 24)}" fill="#e9fdff" filter="§LU"/>
      <path d="${star4(60, 44, 11)}" fill="§I"/>
      <path d="M60 8L64 14L60 20L56 14Z M60 68L64 74L60 80L56 74Z M24 44L30 40L36 44L30 48Z M84 44L90 40L96 44L90 48Z" fill="§T" filter="§LU"/>
      <rect x="6" y="79" width="40" height="4.6" rx="2.3" transform="rotate(-38 26 81)" fill="§I"/>
      <path d="M50 58L35 58.5L43 66.5Z" fill="§I"/>`],
  };
  const cache = new Map();
  // Ce sort a-t-il sa tuile dessinée ?
  const a = id => Object.prototype.hasOwnProperty.call(S, id);
  // Le SVG de la tuile, au rang `rang` (0 : sans étoile).
  const svg = (id, rang) => tuile(id, S[id][0], S[id][1], Math.max(0, Math.min(5, Math.floor(rang) || 0)));
  function url(id, rang) {
    if (!a(id)) return '';
    const r = Math.max(0, Math.min(5, Math.floor(rang) || 0)), k = id + '|' + r;
    if (!cache.has(k)) cache.set(k, 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg(id, r)));
    return cache.get(k);
  }
  return { a, svg, url, ids: () => Object.keys(S), element: id => (a(id) ? S[id][0] : null) };
})();
