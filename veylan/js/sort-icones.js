// Icônes des sorts, peintes par le code comme le reste du jeu (docs/PIPELINE-IMAGES.md) : une tuile
// de la couleur de l'élément du sort, un motif tiré de son effet principal (lame, flèche, poing,
// bouclier, soin, téléportation, piège, poussée, attraction, zone, invocation, bonus, marque...) et,
// dans un coin, un détail propre au sort. Motif et détail sont choisis à la main pour les cent sorts
// des classes (SPEC), si bien que chaque icône est unique ; un autre sort (monstre, arme) reçoit un
// motif déduit de ses effets. Pas de contour noir : le motif ivoire se détache par une ombre douce
// de la teinte sombre de l'élément. Chaque icône est peinte une fois par taille, gardée en data URL.
// Se charge après js/world.js : le bot d'équilibrage, qui tourne sans navigateur, ne la lit pas.
const SortIcones = (() => {
  // Tuile par élément : clair, moyen, sombre (dégradé et ombre du motif), couleur du détail.
  const PALETTE = {
    feu: { hi: '#ffc58f', mid: '#e5552f', lo: '#5c1608', det: '#a8ecff' },
    eau: { hi: '#a6f0ff', mid: '#1a9fc0', lo: '#06324a', det: '#ffd27a' },
    air: { hi: '#eef4fb', mid: '#8aa0b8', lo: '#223247', det: '#ffd27a' },
    terre: { hi: '#d2efa6', mid: '#5b9f42', lo: '#1b3b13', det: '#ffe6a3' },
    neutre: { hi: '#f4e2bb', mid: '#a8844d', lo: '#352712', det: '#8fe8ff' },
  };
  const IVOIRE = '#fff8ea';

  // Formes calculées : étoile à quatre branches, étoile à n pointes, engrenage, flocon.
  const n1 = v => Math.round(v * 100) / 100;
  const star4 = (cx, cy, r) => { const k = r * 0.28; return `M${n1(cx)} ${n1(cy - r)}L${n1(cx + k)} ${n1(cy - k)}L${n1(cx + r)} ${n1(cy)}L${n1(cx + k)} ${n1(cy + k)}L${n1(cx)} ${n1(cy + r)}L${n1(cx - k)} ${n1(cy + k)}L${n1(cx - r)} ${n1(cy)}L${n1(cx - k)} ${n1(cy - k)}Z`; };
  const circle = (cx, cy, r) => `M${n1(cx - r)} ${n1(cy)}a${r} ${r} 0 1 0 ${n1(2 * r)} 0a${r} ${r} 0 1 0 ${n1(-2 * r)} 0Z`;
  const gear = (cx, cy, r, teeth) => {
    let d = '';
    for (let i = 0; i < teeth * 2; i++) {
      const a0 = (i / (teeth * 2)) * Math.PI * 2, a1 = ((i + 1) / (teeth * 2)) * Math.PI * 2, rr = i % 2 ? r * 0.76 : r;
      d += `${i ? 'L' : 'M'}${n1(cx + Math.cos(a0) * rr)} ${n1(cy + Math.sin(a0) * rr)}L${n1(cx + Math.cos(a1) * rr)} ${n1(cy + Math.sin(a1) * rr)}`;
    }
    return d + 'Z';
  };
  const flake = (cx, cy, r) => {
    let d = '';
    for (let i = 0; i < 6; i++) {
      const a = i * Math.PI / 3 - Math.PI / 2, ex = cx + Math.cos(a) * r, ey = cy + Math.sin(a) * r;
      const bx = cx + Math.cos(a) * r * 0.62, by = cy + Math.sin(a) * r * 0.62;
      d += `M${n1(cx)} ${n1(cy)}L${n1(ex)} ${n1(ey)}`;
      for (const s of [-1, 1]) d += `M${n1(bx)} ${n1(by)}L${n1(bx + Math.cos(a + s * 0.75) * r * 0.32)} ${n1(by + Math.sin(a + s * 0.75) * r * 0.32)}`;
    }
    return d;
  };

  // Motifs, sur une grille de 24 : ['f', chemin] remplit en ivoire, ['s', chemin, épaisseur, tirets]
  // trace en ivoire, ['d', chemin, épaisseur] trace un détail dans la teinte sombre, ['h', chemin]
  // remplit de la teinte moyenne (un cœur de flamme, une vitre).
  const M = {
    lame: [['f', 'M7.2 14.6L17.6 4.2L20.2 3.8L19.8 6.4L9.4 16.8Z'], ['s', 'M4.8 12.4L11.6 19.2', 2.4], ['s', 'M6.2 17.8L3.6 20.4', 2.6], ['d', 'M9.6 14.4L18 6', 0.8]],
    lames: [['f', 'M7.2 14.6L17.6 4.2L20.2 3.8L19.8 6.4L9.4 16.8Z'], ['f', 'M16.8 14.6L6.4 4.2L3.8 3.8L4.2 6.4L14.6 16.8Z'], ['s', 'M4.8 12.4L11.6 19.2M19.2 12.4L12.4 19.2', 2.2], ['s', 'M6.2 17.8L3.6 20.4M17.8 17.8L20.4 20.4', 2.4]],
    dague: [['f', 'M8.4 13.6L15.8 6.2L19.6 4.4L17.8 8.2L10.4 15.6Z'], ['s', 'M6.6 11.8L12.2 17.4', 2.2], ['s', 'M8.6 16.6L5 20.2', 2.6], ['d', 'M10.4 13.6L16.6 7.4', 0.7]],
    tourbillon: [['s', 'M5.4 9.6A7 7 0 0 1 16.4 5.8', 2.2], ['f', 'M19.4 4.2L18.4 9.6L13.8 7Z'], ['s', 'M18.6 14.4A7 7 0 0 1 7.6 18.2', 2.2], ['f', 'M4.6 19.8L5.6 14.4L10.2 17Z'], ['f', 'M8.8 15.2L15.4 8.6L16.6 8.4L16.4 9.6L9.8 16.2Z']],
    fleche: [['s', 'M4 20L16.6 7.4', 2], ['f', 'M20.6 3.4L18.6 10.6L13.4 5.4Z'], ['f', 'M3.4 16.6L5.6 14.4L7.2 16L5 18.2ZM7.4 20.6L9.6 18.4L8 16.8L5.8 19Z']],
    fleche_lourde: [['s', 'M5 19L14.6 9.4', 3.4], ['f', 'M21 3L18.4 12.8L11.2 5.6Z'], ['s', 'M5 19L3.2 14.4M5 19L9.6 20.8', 2.2]],
    pluie: [['s', 'M6 3V12.4M12 5.4V14.8M18 3V12.4', 1.8], ['f', 'M6 17.4L3.4 12.2H8.6ZM12 19.8L9.4 14.6H14.6ZM18 17.4L15.4 12.2H20.6Z'], ['s', 'M3 21.6H21', 1.2, [1.6, 1.6]]],
    percant: [['s', 'M3.4 12H16.6', 2], ['f', 'M21.6 12L15.8 8.4V15.6Z'], ['s', 'M3.4 12L1.8 9.4M3.4 12L1.8 14.6', 1.4], ['s', 'M8.4 6.6V17.4M12.6 7.4V16.6', 1.3, [1.4, 1.2]]],
    arc: [['s', 'M7.4 3.2Q19.6 12 7.4 20.8', 2.2], ['s', 'M7.4 3.2V20.8', 0.9], ['s', 'M3.2 12H17.8', 1.8], ['f', 'M21.6 12L16.6 9.2V14.8Z']],
    poing: [['f', 'M6.4 10.2A2.2 2.2 0 0 1 8.6 8H16.6A3 3 0 0 1 19.6 11V15A5.6 5.6 0 0 1 14 20.6H11A4.6 4.6 0 0 1 6.4 16Z'], ['d', 'M10 8.2V11.8M13 8.2V11.8M16 8.4V11.6', 0.9], ['d', 'M6.6 14H11.4A1.6 1.6 0 0 0 11.4 10.8H10', 1]],
    bouclier: [['f', 'M12 2.8L19.6 5.8V11C19.6 16 16.2 19.6 12 21.4C7.8 19.6 4.4 16 4.4 11V5.8Z'], ['d', 'M12 5.4V18.8M7 9.6H17', 0.9]],
    garde: [['f', 'M10.4 4L16.6 6.4V10.6C16.6 14.6 14 17.6 10.4 19.2C6.8 17.6 4.2 14.6 4.2 10.6V6.4Z'], ['f', 'M13.2 14.8L19.8 4.4L21.4 4L21 5.6L14.4 16Z'], ['s', 'M11.8 13.4L15.8 17.4', 2], ['s', 'M14 17.2L12.2 20.2', 2.2]],
    soin: [['s', 'M12 5.6V18.4M5.6 12H18.4', 4.6], ['f', star4(19, 4.6, 2.6)]],
    coeur: [['f', 'M12 20.6S4 15.6 4 9.6A4.2 4.2 0 0 1 12 7.4A4.2 4.2 0 0 1 20 9.6C20 15.6 12 20.6 12 20.6Z']],
    portail: [['s', 'M4 17a8 3.2 0 1 0 16 0a8 3.2 0 1 0-16 0', 1.9], ['s', 'M6 14C6 4.6 18 4.6 18 11.4', 1.8, [2, 1.8]], ['f', 'M18 16L15.4 11.4H20.6Z'], ['f', star4(6, 5, 2.4)]],
    piege: [['f', 'M4.4 15.4L6.4 8.6L8.4 13.4L10.4 7.4L12.4 13.4L14.4 7.4L16.4 13.4L18.4 8.6L19.6 15.4Z'], ['s', 'M3.4 17.6H20.6', 2.2], ['s', 'M12 17.6V20.6M8 20.6H16', 1.6]],
    mine: [['f', circle(10.6, 14.2, 6.6)], ['s', 'M15.4 8.8Q16.8 5.4 19.4 5', 1.6], ['f', star4(20.4, 4.4, 2.4)], ['d', 'M7.4 12.2A3.4 3.4 0 0 1 9.6 10.4', 1.2]],
    pousse: [['f', circle(5, 12, 2.5)], ['s', 'M9.4 6.4L15 12L9.4 17.6M14.4 6.4L20 12L14.4 17.6', 2.4]],
    attire: [['f', circle(4.6, 12, 2.5)], ['s', 'M14.6 6.4L9 12L14.6 17.6M19.6 6.4L14 12L19.6 17.6', 2.4]],
    crochet: [['s', 'M12 3.4V13.4A4.6 4.6 0 1 1 7.4 8.8', 2.2], ['f', 'M7.4 8.8L5.4 11.8L9.6 11.4Z'], ['s', 'M12 3.4Q15.6 1.6 20 4', 1.4]],
    explosion: [['f', 'M12 1.8L14.3 8L20.8 5.2L17.2 11.2L22.2 13.6L15.8 15L17.6 21.4L12 17.6L6.4 21.4L8.2 15L1.8 13.6L6.8 11.2L3.2 5.2L9.7 8Z'], ['h', 'M12 8.6L13.4 11.4L16.4 12L13.8 13.8L14.4 16.8L12 15.2L9.6 16.8L10.2 13.8L7.6 12L10.6 11.4Z']],
    nova: [['f', circle(12, 12, 3.2)], ['s', 'M12 12m-7 0a7 7 0 1 0 14 0a7 7 0 1 0-14 0', 1.5, [2.2, 1.6]], ['s', 'M12 1.6V4.6M12 19.4V22.4M1.6 12H4.6M19.4 12H22.4M4.6 4.6L6.7 6.7M17.3 17.3L19.4 19.4M4.6 19.4L6.7 17.3M17.3 6.7L19.4 4.6', 1.8]],
    seisme: [['s', 'M12 2.4L10.4 6.4L13 9L11 12L13 15L10.4 17.6L12 21.6M2.4 12L6.4 13.6L9 11L12 13L15 11L17.6 13.6L21.6 12', 2], ['f', 'M12 9.2L14.8 12L12 14.8L9.2 12Z']],
    vague: [['s', 'M2.4 9.6C5 5.6 8 5.6 10.6 9.6S16 13.6 18.6 9.6S21.6 7.6 21.6 7.6', 2.3], ['s', 'M2.4 16C5 12 8 12 10.6 16S16 20 18.6 16S21.6 14 21.6 14', 2.3]],
    flamme: [['f', 'M12 1.8C13 6 18.6 8.4 18.6 14.2A6.6 6.6 0 0 1 5.4 14.2C5.4 10.8 7.6 8.8 8.8 6.8C9 9 10.2 10.2 11.4 10.6C11.2 7.6 11 4.8 12 1.8Z'], ['h', 'M12 12.6C13.6 14.2 14.6 15.4 14.6 17A2.6 2.6 0 0 1 9.4 17C9.4 15.4 10.8 14.4 12 12.6Z']],
    comete: [['f', circle(16.4, 7.6, 4.2)], ['s', 'M13 11L3.8 20.2M15.8 11.8L9.4 18.2M12.2 8.4L5.6 15', 1.9], ['h', circle(17.4, 6.6, 1.6)]],
    eclair: [['f', 'M14 1.8L5 13.4H11L9.2 22.2L19 9.8H12.8Z']],
    flocon: [['s', flake(12, 12, 9.6), 1.8]],
    oeil: [['s', 'M2.4 12C5.6 6.6 9 5.4 12 5.4S18.4 6.6 21.6 12C18.4 17.4 15 18.6 12 18.6S5.6 17.4 2.4 12Z', 1.8], ['f', circle(12, 12, 3)]],
    invisible: [['s', 'M2.4 12C5.6 6.6 9 5.4 12 5.4S18.4 6.6 21.6 12C18.4 17.4 15 18.6 12 18.6S5.6 17.4 2.4 12Z', 1.6, [2.2, 1.6]], ['f', circle(12, 12, 2.8)], ['s', 'M4 20.6L20 3.4', 2.4]],
    main: [['f', 'M6.8 12.8H17.6V15.6C17.6 18.8 15.3 21 12.2 21C9.6 21 7.8 19.6 6.6 17.8L4.2 14.2A1.4 1.4 0 0 1 6.4 12.6Z'], ['s', 'M8.4 13V6.2M11.2 13V4.6M14 13V5.4M16.6 13.2V7.6', 2.6]],
    note: [['f', 'M4.8 17.8a3.2 2.4 -20 1 0 6.4 0a3.2 2.4 -20 1 0-6.4 0Z'], ['s', 'M11 17.2V4', 1.8], ['s', 'M11 4C14 5.6 17.6 6.6 17.2 10.6', 1.8]],
    notes: [['f', 'M3.4 18a2.8 2.1 -20 1 0 5.6 0a2.8 2.1 -20 1 0-5.6 0ZM13.4 16a2.8 2.1 -20 1 0 5.6 0a2.8 2.1 -20 1 0-5.6 0Z'], ['s', 'M8.8 17.4V6.6M18.8 15.4V4.6', 1.6], ['f', 'M8.8 6.6L18.8 4.6V7.6L8.8 9.6Z']],
    marteau: [['s', 'M10.2 10.2L20 20', 2.8], ['f', 'M13.5 6.4L10 2.9L2.9 10L6.4 13.5Z']],
    enclume: [['f', 'M2.4 6.4H18.6L21.6 9H16.2C15.2 11 14.6 12.6 14.6 14.6H9.4C9.4 12 7 9.6 2.4 9.6Z'], ['f', 'M8 14.6H16V16.6H18V19.6H6V16.6H8Z'], ['f', star4(12, 2.6, 2)]],
    mur: [['f', 'M3 5.4H11V9.4H3ZM12.6 5.4H21V9.4H12.6ZM3 11H7.6V15H3ZM9.2 11H17V15H9.2ZM18.6 11H21V15H18.6ZM3 16.6H11V20.6H3ZM12.6 16.6H21V20.6H12.6Z']],
    goutte: [['f', 'M12 2.4C15 7 18.6 10.4 18.6 14.4A6.6 6.6 0 0 1 5.4 14.4C5.4 10.4 9 7 12 2.4Z'], ['d', 'M8.8 14.2A3.2 3.2 0 0 0 12 17.4', 1.2]],
    cri: [['f', 'M2.8 9.4H6.8L12.4 4.8V19.2L6.8 14.6H2.8Z'], ['s', 'M15.2 8.6A4.6 4.6 0 0 1 15.2 15.4M18.2 5.8A8.6 8.6 0 0 1 18.2 18.2', 1.9]],
    echange: [['s', 'M3.8 8.4H17.2', 2], ['f', 'M21.2 8.4L16.6 5V11.8Z'], ['s', 'M20.2 15.6H6.8', 2], ['f', 'M2.8 15.6L7.4 12.2V19Z']],
    crocs: [['f', 'M3 5.6C7 9 17 9 21 5.6V8.6C17 11.8 7 11.8 3 8.6Z'], ['f', 'M7.4 10.4L9 15.6L10.6 10.8ZM13.4 10.8L15 15.6L16.6 10.4Z'], ['f', 'M3 18.4C7 15 17 15 21 18.4V15.6C17 12.8 7 12.8 3 15.6Z']],
    pas: [['f', 'M5.4 15.4a2.6 3.7 -15 1 0 5.2 0a2.6 3.7 -15 1 0-5.2 0Z'], ['f', circle(6.2, 10.4, 0.95) + circle(8.3, 9.7, 0.95) + circle(10.2, 10.3, 0.9)], ['f', 'M13.4 8.6a2.6 3.7 15 1 0 5.2 0a2.6 3.7 15 1 0-5.2 0Z'], ['f', circle(13.8, 3.9, 0.9) + circle(15.7, 3.3, 0.95) + circle(17.8, 4, 0.95)]],
    recul: [['s', 'M19.4 4.6L8.4 15.6', 2.2], ['f', 'M4.6 19.4L6.6 12.4L11.6 17.4Z'], ['s', 'M15.6 2.8L12.2 6.2M21.2 8.4L17.8 11.8', 1.5], ['f', 'M17.4 15.4a1.5 2.2 -45 1 0 3 0a1.5 2.2 -45 1 0-3 0Z']],
    serment: [['s', circle(12, 12, 8.2), 1.6], ['f', 'M10.8 6.4H13.2V16.6L12 19.8L10.8 16.6Z'], ['s', 'M7.8 6.4H16.2', 2.2], ['s', 'M12 6.4V2.6', 2.2]],
    soleil: [['f', circle(12, 12, 4.4)], ['s', 'M12 2V5M12 19V22M2 12H5M19 12H22M4.9 4.9L7 7M17 17L19.1 19.1M4.9 19.1L7 17M17 7L19.1 4.9', 1.9]],
    lanterne: [['s', 'M9.4 4.8A2.6 2.6 0 0 1 14.6 4.8', 1.6], ['f', 'M7.8 5.4H16.2L15.2 7.6H8.8Z'], ['f', 'M8.4 8.2H15.6L16.6 17.2H7.4Z'], ['h', 'M12 10.4C13.4 12 14 13 14 14.2A2 2 0 0 1 10 14.2C10 13 10.6 12 12 10.4Z'], ['f', 'M6.8 17.8H17.2V20H6.8Z']],
    sablier: [['s', 'M6.4 3.4H17.6M6.4 20.6H17.6', 2], ['s', 'M8 3.4C8 9 12 9.6 12 12C12 14.4 8 15 8 20.6M16 3.4C16 9 12 9.6 12 12C12 14.4 16 15 16 20.6', 1.7], ['f', 'M9.2 20C9.6 17.6 11 16.6 12 16.4C13 16.6 14.4 17.6 14.8 20ZM10.4 7.8H13.6L12 10Z']],
    engrenage: [['f', gear(12, 12, 9.4, 8)], ['h', circle(12, 12, 3.4)]],
    tourelle: [['f', 'M4.6 20.6H19.4L17.4 16.6H6.6Z'], ['f', 'M7.8 16.6V11.2A4.2 4.2 0 0 1 16.2 11.2V16.6Z'], ['s', 'M13.6 10.4L19.4 6.8', 2.8], ['f', star4(21.4, 5.4, 2.4)], ['d', 'M9.6 14.4H14.4', 1]],
    patte: [['f', 'M12 12.4C15.2 12.4 17.6 15.4 17.6 17.6C17.6 19.6 15.8 20.6 12 20.6C8.2 20.6 6.4 19.6 6.4 17.6C6.4 15.4 8.8 12.4 12 12.4Z'], ['f', circle(5.8, 10.4, 1.9) + circle(9.4, 6.6, 2) + circle(14.6, 6.6, 2) + circle(18.2, 10.4, 1.9)]],
    plume: [['f', 'M19.6 3.4C12 4 6.4 10 5.4 18.6C10 17 17.6 13.4 19.6 3.4Z'], ['d', 'M5.6 18.4L19.4 3.6', 1], ['s', 'M5.4 18.6L3.2 21', 1.6]],
    bonus: [['s', 'M12 20.6V6.4', 2.6], ['s', 'M6.6 11.4L12 6L17.4 11.4', 2.6], ['f', star4(5.2, 5.4, 2.4) + star4(18.8, 16, 2.2)]],
    cible: [['s', circle(12, 12, 7.4), 1.8], ['f', circle(12, 12, 2.4)], ['s', 'M12 1.6V6M12 18V22.4M1.6 12H6M18 12H22.4', 1.8]],
    ancre: [['s', 'M12 6.6V20', 2], ['s', circle(12, 4.4, 2), 1.6], ['s', 'M8.4 9.6H15.6', 1.8], ['s', 'M4.6 13.6C5 17.6 8 20 12 20C16 20 19 17.6 19.4 13.6', 2], ['f', 'M4.6 13.6L2.6 16.2L6.4 16ZM19.4 13.6L21.4 16.2L17.6 16Z']],
    filet: [['s', 'M3.6 5Q12 8.4 20.4 5M3.2 10Q12 13.4 20.8 10M3.6 15Q12 18.4 20.4 15M6 3.4Q4.4 12 7 20.6M12 3V21M18 3.4Q19.6 12 17 20.6', 1.4]],
    lune: [['f', 'M15.4 3.2A9 9 0 1 0 20.8 15.2A7.2 7.2 0 0 1 15.4 3.2Z'], ['f', star4(18.6, 6.4, 1.8) + star4(20.6, 11, 1.2)]],
    aile: [['f', 'M3 13C6 6 13 3.4 21 3.4C19.4 6.6 16.6 8.2 13.6 8.6C16 9.2 17.6 10 18.2 11.2C15.4 12.4 12.8 12.6 10.8 12.4C12.6 13.4 13.6 14.6 13.8 16C10.2 17 6.4 16.4 3 13Z'], ['d', 'M5.4 13.2C9 9.8 13 7.6 18 6', 0.9]],
    cor: [['f', 'M3.4 17.2C7.4 17.4 10.6 15.6 12.6 12.4C14.6 9.2 16.4 6.4 20.4 5L21.8 10.6C18.6 11.2 17.2 13.2 15.6 15.6C13.2 19.2 9 21 3.4 20.6Z'], ['s', 'M3.4 17.2V20.6', 1.8], ['d', 'M10.6 15.6L12.6 18.4M15.2 11.6L17.6 13.6', 1], ['s', 'M20.6 2.6L19.8 1.2M22.6 3.4L23.4 2', 1.2]],
    sifflet: [['f', 'M3.6 8.6H15A5.4 5.4 0 1 1 9.8 14.4H3.6Z'], ['h', circle(15, 14, 1.8)], ['s', 'M17.4 4L18.4 5.8M20.4 3.4L20 5.6M22 6.4L20.4 7.6', 1.4]],
    pierre: [['f', 'M13.6 8.8C16.6 7.8 19.8 9.4 20.2 12.6C20.6 15.6 18.2 18.2 15 18.2C12 18.2 9.6 16.4 9.6 13.4C9.6 11 11.2 9.6 13.6 8.8Z'], ['s', 'M2.4 9.6H7.4M3.4 13.6H7.8M2.4 17.6H8.6', 1.6]],
    javelot: [['s', 'M3.4 20.6L15.6 8.4', 2], ['f', 'M21.2 2.8L19.6 10.4L15.6 10.6L13.4 8.4L13.6 4.4Z'], ['d', 'M14.4 11.6L12.4 9.6', 1.3]],
    griffe: [['s', 'M4.6 4.4C9 9 11 14 10.4 20.2M10 3.4C14 8.4 16 13.4 15.6 19.6M15.4 4.4C18.8 8.4 20.6 12.4 20.6 17', 2.2]],
    cle: [['f', 'M14.6 3.4A5 5 0 0 0 9.9 10.3L3.6 16.6A2.1 2.1 0 0 0 6.6 19.6L12.9 13.3A5 5 0 0 0 19.8 8.6L16.8 11.6L13.6 11.2L13.2 8L16.2 5A5 5 0 0 0 14.6 3.4Z']],
    vapeur: [['f', 'M2.6 15.4H14.4V20.6H2.6Z'], ['f', circle(17.4, 18, 3)], ['s', 'M6.4 12.6C4.6 10.6 8.4 9 6.6 7C5.2 5.4 7 4 7.6 2.8M11.4 12.6C9.6 10.6 13.4 9 11.6 7C10.2 5.4 12 4 12.6 2.8', 1.8]],
    piston: [['f', 'M2.4 7.6H10V16.4H2.4Z'], ['s', 'M10 12H16', 2.8], ['f', 'M16 6.2H19.2V17.8H16Z'], ['s', 'M20.8 8.4L22.4 6.8M20.8 15.6L22.4 17.2', 1.4]],
    ruee: [['s', 'M2.4 7.6H9M2.4 12H11M2.4 16.4H9', 1.8], ['f', 'M11 5.4L21.8 12L11 18.6L13.8 12Z']],
    bond: [['s', 'M3.4 18.4C5.4 5.6 15.4 3.4 19.2 11.6', 2, [2.2, 1.8]], ['f', 'M20.4 16.4L16.8 12.2L21.8 11Z'], ['s', 'M14.4 21.2H22', 1.6], ['s', 'M15.8 18.6L14.6 17.2M21.6 18.4L22.6 17', 1.3]],
    jet: [['f', 'M2.4 17.6H7V21.4H2.4Z'], ['s', 'M5 16.6C6.6 5 16.6 5 19.2 14.6', 2], ['f', 'M20.2 19.4L16.4 15.2L21.2 13.6Z']],
    noeud: [['s', 'M5 17C5 9 13 5 15.6 9C18 13 9 16.4 9 11.6C9 7.4 15 4.4 19 7', 2.2], ['s', 'M5 17L3.4 20.6M19 7L21 5', 2.2]],
    silhouette: [['f', 'M12 3C15.6 3 18 5.8 18 9.6V20.6L15.8 18.8L13.9 20.6L12 18.8L10.1 20.6L8.2 18.8L6 20.6V9.6C6 5.8 8.4 3 12 3Z'], ['d', circle(9.8, 10, 1) + circle(14.2, 10, 1), 1.6]],
    etincelles: [['f', star4(9.6, 11, 6.4) + star4(17.6, 5.6, 3) + star4(17.2, 17.4, 3.4)]],
    jugement: [['f', 'M10.7 6H13.3V16.4L12 19.6L10.7 16.4Z'], ['s', 'M7.6 6H16.4', 2.4], ['s', 'M12 6V2', 2.4], ['s', 'M5 21.6L7.4 19.2M19 21.6L16.6 19.2M3.4 16.8H6.4M20.6 16.8H17.6', 1.6]],
  };

  // Détails, dans une pastille du coin bas droit (même grille de 24).
  const D = {
    x2: [['s', 'M7.4 18L11.6 6M12.4 18L16.6 6', 3]],
    feu: [['f', M.flamme[0][1]]],
    goutte: [['f', M.goutte[0][1]]],
    chaine: [['s', 'M10.6 8.6L12.4 6.8A3.4 3.4 0 0 1 17.2 11.6L15.4 13.4M13.4 15.4L11.6 17.2A3.4 3.4 0 0 1 6.8 12.4L8.6 10.6M9.8 14.2L14.2 9.8', 2.6]],
    plus: [['s', 'M12 5.6V18.4M5.6 12H18.4', 3.6]],
    moins: [['s', 'M5.6 12H18.4', 3.8]],
    etoile: [['f', star4(12, 12, 8.6)]],
    pa: [['f', circle(12, 12, 7.4)], ['d', circle(12, 12, 4.2), 1.8]],
    pm: [['s', 'M6.6 5.6L12.6 12L6.6 18.4M12 5.6L18 12L12 18.4', 2.8]],
    oeil: [['s', 'M3 12C6 7.4 9 6.4 12 6.4S18 7.4 21 12C18 16.6 15 17.6 12 17.6S6 16.6 3 12Z', 2.2], ['f', circle(12, 12, 2.8)]],
    zone: [['s', 'M12 3.6L20.4 12L12 20.4L3.6 12Z', 2.4], ['f', circle(12, 12, 2.4)]],
    horloge: [['s', circle(12, 12, 7.6), 2.2], ['s', 'M12 7.6V12L15 14', 2.2]],
    lune: [['f', M.lune[0][1]]],
    pousse: [['s', 'M4.6 12H15.4', 2.8], ['f', 'M20 12L14 7.6V16.4Z']],
    cible: [['s', circle(12, 12, 6.6), 2.2], ['f', circle(12, 12, 2.4)]],
    coeur: [['f', M.coeur[0][1]]],
    eclair: [['f', M.eclair[0][1]]],
    bouclier: [['f', M.bouclier[0][1]]],
    engrenage: [['f', gear(12, 12, 9.4, 7)]],
    fleche: [['s', 'M5.4 18.6L15.6 8.4', 2.6], ['f', 'M19.6 4.4L17.6 11.6L12.4 6.4Z']],
    patte: M.patte,
    note: [['f', 'M5 17.4a3.4 2.6 -20 1 0 6.8 0a3.4 2.6 -20 1 0-6.8 0Z'], ['s', 'M11.4 16.8V4.4L17.4 6.6', 2.4]],
    lame: [['f', 'M6 15.4L16.6 4.8L19.6 4.4L19.2 7.4L8.6 18Z'], ['s', 'M4.6 13.4L10.6 19.4', 2.6]],
  };

  // Les cent sorts des classes : [motif, détail].
  const SPEC = {
    // Vaelith
    eclat: ['comete'], givre: ['flocon', 'pm'], bourrasque: ['pousse'], secousse: ['seisme'], pas_de_voile: ['portail'],
    lame_orage: ['eclair'], manteau: ['bouclier', 'etoile'], retour_de_voile: ['sablier', 'recul'], siphon: ['noeud', 'pa'], nova: ['nova'], attraction: ['attire'],
    // Sarkan
    taille_franche: ['lame'], saut_delan: ['bond'], serment_jure: ['serment'], garde_de_scorie: ['garde'], lame_tournoyante: ['tourbillon'],
    defi: ['cri', 'cible'], poigne_juree: ['poing', 'chaine'], lame_de_braise: ['lame', 'zone'], ferveur: ['bonus', 'feu'], verdict: ['jugement'],
    // Lyssar
    trait_tisse: ['fleche'], fil_tendu: ['arc', 'pousse'], collet: ['piege', 'chaine'], repli_traqueur: ['recul'], fleche_lourde: ['fleche_lourde'], balise_de_fil: ['piege', 'recul'], piege_de_reflux: ['piege', 'pousse'], glyphe_de_garde: ['bouclier', 'plus'], glyphe_pesant: ['ancre', 'moins'], lanterne_de_veille: ['lune', 'plus'], renaissance: ['soin', 'plus'], appel_du_molh: ['pierre', 'cor'], gorgee_de_cime: ['goutte', 'bouclier'],
    corde_longue: ['arc', 'plus'], marque_traqueur: ['cible'], pluie_de_fil: ['pluie'], fleche_ancre: ['ancre', 'fleche'], trait_du_veilleur: ['percant'],
    // Oriel
    lueur: ['soin'], eclair_solaire: ['flamme'], manteau_partage: ['bouclier', 'zone'], rappel: ['etincelles'], flamme_vive: ['flamme', 'coeur'],
    benediction: ['bonus', 'pa'], aube: ['soleil'], lumiere_aveuglante: ['lanterne'], veille: ['bouclier', 'oeil'], ardeur: ['flamme', 'pousse'],
    // Nerith
    double_entaille: ['lames'], voile_penombre: ['invisible'], piege_penombre: ['piege', 'lune'], larcin: ['main', 'pa'], pas_ombre: ['portail', 'lune'],
    coup_penombre: ['dague', 'lune'], main_leste: ['main', 'bouclier'], leurre_penombre: ['silhouette'], dernier_souffle_ombre: ['dague', 'goutte'],
    // Kaldrin
    tourelle_de_kaldum: ['tourelle'], mur_articule: ['mur'], mine_a_fil: ['mine'], marteau: ['marteau'], surchauffe: ['vapeur'],
    reparation: ['cle'], propulseur: ['piston'], grappin: ['crochet'], detonation: ['explosion'], forge: ['enclume'],
    // Karsh
    serment_de_sang: ['goutte', 'pa'], charge: ['ruee'], taillade: ['lame', 'feu'], dernier_souffle: ['flamme', 'x2'], hurlement: ['cri'],
    sang_pour_sang: ['goutte', 'coeur'], brulure: ['flamme', 'horloge'], lien_de_sang: ['attire', 'goutte'], colosse: ['bouclier', 'feu'], frappe_lourde: ['lame', 'pousse'], rage: ['bonus', 'goutte'],
    // Mirel
    cadence: ['note', 'pa'], refrain: ['notes', 'pm'], dissonance: ['note', 'moins'], note_vive: ['note'], berceuse: ['lune'],
    envolee: ['aile'], choeur: ['notes', 'coeur'], cri: ['cri', 'zone'], tempo: ['sablier'], silence: ['note', 'chaine'],
    // Thalor
    transposition: ['echange'], lancer: ['jet'], projection: ['attire', 'x2'], poigne: ['poing'], ancre: ['ancre', 'chaine'],
    bascule: ['pas', 'pousse'], mur_de_chair: ['bouclier', 'coeur'], vague: ['vague'], etreinte: ['griffe'], elan: ['pas'],
    // Fennal
    appel_du_grouk: ['patte'], appel_du_pilou: ['plume'], rappel_sacrificiel: ['explosion', 'patte'], morsure: ['crocs'], soin_de_meute: ['soin', 'patte'],
    cri_de_ralliement: ['cor'], fleche_de_fil: ['pierre'], filet: ['filet'], eperon: ['sifflet'], traque: ['javelot'],
  };

  // Un sort hors de la table : le motif de son effet principal.
  function deduce(s) {
    const t = new Set(s.effects.map(ef => ef.type));
    if (t.has('summon')) return ['patte'];
    if (t.has('trap')) return ['piege'];
    if (t.has('teleport')) return ['portail'];
    if (t.has('heal')) return ['soin'];
    if (t.has('shield')) return ['bouclier'];
    if (t.has('obstacle')) return ['mur'];
    if (t.has('push')) return ['pousse'];
    if (t.has('pull')) return ['attire'];
    if (t.has('power')) return ['bonus'];
    if (t.has('damage')) {
      if (s.aoe && s.aoe.shape !== 'single') return ['explosion'];
      if (s.range && s.range[1] <= 1) return ['lame'];
      return { feu: ['flamme'], eau: ['vague'], air: ['fleche'], terre: ['pierre'] }[s.element] || ['comete'];
    }
    return ['etincelles'];
  }

  const hex = c => { const n = parseInt(c.slice(1), 16); return [n >> 16, (n >> 8) & 255, n & 255]; };
  const rgba = (c, a) => `rgba(${hex(c).join(',')},${a})`;

  // Dessine une liste de tracés (grille de 24) dans le contexte déjà mis à l'échelle.
  function ops(g, list, pal, fill) {
    for (const [k, d, w, dash] of list) {
      const p = new Path2D(d);
      if (k === 'f' || k === 'h') { g.fillStyle = k === 'h' ? pal.mid : fill; g.fill(p); continue; }
      g.save();
      g.lineCap = 'round'; g.lineJoin = 'round'; g.lineWidth = w || 2;
      if (dash) g.setLineDash(dash);
      if (k === 'd') { g.shadowColor = 'transparent'; g.strokeStyle = rgba(pal.lo, 0.7); } else g.strokeStyle = fill;
      g.stroke(p);
      g.restore();
    }
  }

  function paint(cv, s, spec) {
    const g = cv.getContext('2d');
    const S = cv.width, pal = PALETTE[s.element] || PALETTE.neutre;
    const r = S * 0.2;
    g.clearRect(0, 0, S, S);
    g.save();
    g.beginPath();
    if (g.roundRect) g.roundRect(0, 0, S, S, r); else Util.roundRect(g, 0, 0, S, S, r);
    g.clip();
    // La tuile : lumière en haut à gauche, profondeur en bas à droite, un voile qui passe en biais.
    const bg = g.createRadialGradient(S * 0.3, S * 0.24, S * 0.04, S * 0.5, S * 0.55, S * 0.82);
    bg.addColorStop(0, pal.hi); bg.addColorStop(0.42, pal.mid); bg.addColorStop(1, pal.lo);
    g.fillStyle = bg; g.fillRect(0, 0, S, S);
    g.fillStyle = rgba(pal.hi, 0.1);
    g.beginPath(); g.moveTo(-S * 0.1, S * 0.62); g.quadraticCurveTo(S * 0.5, S * 0.38, S * 1.1, S * 0.5); g.lineTo(S * 1.1, S * 0.66); g.quadraticCurveTo(S * 0.5, S * 0.52, -S * 0.1, S * 0.78); g.fill();
    const vig = g.createRadialGradient(S * 0.5, S * 0.5, S * 0.4, S * 0.5, S * 0.5, S * 0.74);
    vig.addColorStop(0, 'rgba(0,0,0,0)'); vig.addColorStop(1, rgba(pal.lo, 0.55));
    g.fillStyle = vig; g.fillRect(0, 0, S, S);
    // Le motif, ivoire teinté de l'élément vers le bas, détaché par une ombre de la teinte sombre.
    const k = S / 24;
    const fill = g.createLinearGradient(0, S * 0.12, 0, S * 0.9);
    fill.addColorStop(0, IVOIRE); fill.addColorStop(1, pal.hi);
    g.save();
    if (spec[1]) { g.translate(S * 0.02, S * 0.02); g.scale(k * 0.86, k * 0.86); } else { g.translate(S * 0.04, S * 0.04); g.scale(k * 0.92, k * 0.92); }
    g.shadowColor = rgba(pal.lo, 0.9); g.shadowBlur = S * 0.06; g.shadowOffsetY = S * 0.02;
    ops(g, M[spec[0]] || M.etincelles, pal, fill);
    g.restore();
    // Le détail, dans une pastille de la teinte sombre.
    if (spec[1] && D[spec[1]]) {
      const cx = S * 0.79, cy = S * 0.79, rr = S * 0.19;
      g.fillStyle = rgba(pal.lo, 0.88);
      g.beginPath(); g.arc(cx, cy, rr, 0, Math.PI * 2); g.fill();
      g.strokeStyle = rgba(pal.det, 0.45); g.lineWidth = Math.max(1, S * 0.018);
      g.beginPath(); g.arc(cx, cy, rr - g.lineWidth / 2, 0, Math.PI * 2); g.stroke();
      g.save();
      g.translate(cx - rr * 0.68, cy - rr * 0.68); g.scale(rr * 1.36 / 24, rr * 1.36 / 24);
      ops(g, D[spec[1]], pal, pal.det);
      g.restore();
    }
    // Un liseré clair à l'intérieur du bord : la tuile se lit sur tous les fonds, sans contour noir.
    g.strokeStyle = rgba(pal.hi, 0.42); g.lineWidth = Math.max(1, S * 0.03);
    g.beginPath();
    if (g.roundRect) g.roundRect(g.lineWidth / 2, g.lineWidth / 2, S - g.lineWidth, S - g.lineWidth, r - g.lineWidth / 2); else Util.roundRect(g, g.lineWidth / 2, g.lineWidth / 2, S - g.lineWidth, S - g.lineWidth, r - g.lineWidth / 2);
    g.stroke();
    g.restore();
  }

  const cache = new Map();

  // Motif et détail d'un sort (`spell` : le sort tel que le personnage le lance, voie comprise).
  function spec(id, spell) {
    const s = spell || DATA.spells[id];
    return SPEC[id] || (s ? deduce(s) : ['etincelles']);
  }

  // L'icône en data URL, peinte à `px` pixels de côté (64 par défaut) et gardée.
  function url(id, spell, px) {
    const s = spell || DATA.spells[id];
    if (!s || typeof document === 'undefined') return '';
    // Un sort qui a sa tuile dessinée (js/sort-tuiles.js) la prend, avec les étoiles de son rang.
    if (typeof SortTuiles === 'object' && SortTuiles.a(id)) return SortTuiles.url(id, s.rank || 0);
    px = Math.round(px || 64);
    const key = `${id}|${s.element}|${px}`;
    if (!cache.has(key)) {
      const cv = document.createElement('canvas');
      cv.width = cv.height = px;
      paint(cv, s, spec(id, s));
      cache.set(key, cv.toDataURL('image/png'));
    }
    return cache.get(key);
  }

  return { url, spec, SPEC, motifs: Object.keys(M), details: Object.keys(D) };
})();
