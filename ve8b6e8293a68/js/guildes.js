const Guildes = (() => {
  const R = {
    partMax: 90, pas: 10, partTotaleMax: 90,
    monstresCombat: 3, pointsCombat: 10, ensemble: 1.25,
    pleinBase: 500, pleinParCompte: 50, comptesMax: 20, pleinDoubleSous: 10, seuilActif: 20,
    coutParNiveau: 100,
    membres: 60, fondateurs: 3, niveauFondateur: 15, ageCompte: 7, prixCharte: 5000,
    delaiPart: 72,
    absenceMaitre: 30, dissolution: 180,
    vigie: { niveauPerso: 30, joursGuilde: 3, stockHeures: 48, attaque: [12, 23], appel: 120, equipe: 4, repit: 2, interdite: 6 },
    pacte: { min: 2, max: 4, niveauGuilde: 5, prix: 10000, attente: 7 },
    cairn: { comptes: 8, niveau: 40, ageCompte: 14, joursGuilde: 3, equipesMax: 3, minutes: 45, entretien: 1000, colere: 4, saison: 10 },
    lauriersSemaine: 100,
  };

  function niveauMax(plafond) {
    const p = plafond || (typeof Character === 'function' ? Character.MAX_LEVEL : 60);
    return p <= 60 ? 20 : p <= 100 ? 30 : p <= 200 ? 40 : 50;
  }

  const xpMonstre = L => Math.round(8 * Math.pow(Math.max(1, L) / 2, 1.6));
  const combatOrdinaire = L => R.monstresCombat * xpMonstre(L);

  function ouvrage(xp, L, ensemble) {
    if (!(xp > 0)) return 0;
    return R.pointsCombat * xp / combatOrdinaire(L) * (ensemble ? R.ensemble : 1);
  }

  function partEffective(partGuilde, partMonture) {
    const g = Math.max(0, Math.min(R.partMax, Math.floor((Number(partGuilde) || 0) / R.pas) * R.pas));
    return Math.max(0, Math.min(g, R.partTotaleMax - Math.max(0, Number(partMonture) || 0)));
  }

  function plein(actifs, niveau) {
    const n = Math.max(0, Math.min(R.comptesMax, actifs | 0));
    return (R.pleinBase + R.pleinParCompte * n) * ((niveau || 1) < R.pleinDoubleSous ? 2 : 1);
  }

  const coutNiveau = n => R.coutParNiveau * n;
  const cumul = n => R.coutParNiveau * n * (n - 1) / 2;
  function niveauDe(total, max) {
    const m = max || niveauMax();
    let n = 1;
    while (n < m && total >= cumul(n + 1)) n++;
    return n;
  }

  const nouvelle = () => ({ ouvrage: 0, semaine: { points: 0, comptes: {} } });
  const niveau = g => niveauDe(g.ouvrage);

  function donner(g, o) {
    const part = partEffective(o.part, o.partMonture) / 100;
    const xp = Math.max(0, o.xp || 0);
    if (!part || !xp) return { preleve: 0, points: 0, garde: xp };
    let preleve = Math.round(xp * part), points = ouvrage(preleve, o.niveau, o.ensemble);
    if (o.compte) g.semaine.comptes[o.compte] = (g.semaine.comptes[o.compte] || 0) + points;
    const niv = niveau(g), cap = plein(o.actifs != null ? o.actifs : 1, niv);
    const reste = Math.max(0, cap - g.semaine.points);
    if (reste <= 0) return { preleve: 0, points: 0, garde: xp };
    if (points > reste) { preleve = Math.ceil(preleve * reste / points); points = reste; }
    g.ouvrage += points;
    g.semaine.points += points;
    return { preleve, points, garde: xp - preleve };
  }

  function tourner(g) {
    const actifs = Object.values(g.semaine.comptes).filter(p => p >= R.seuilActif).length;
    g.semaine = { points: 0, comptes: {} };
    return actifs;
  }

  const DEBLOCAGES = [
    { niveau: 1, texte: 'Nom, blason simple, canal de guilde, cinq rangs, journal, annuaire, coffre de 20 places, 60 comptes' },
    { niveau: 2, texte: 'La Loge, et la pierre de retour vers la Loge' },
    { niveau: 3, texte: 'Le blason complet (second motif, couleurs libres)' },
    { niveau: 4, texte: 'Coffre de 40 places' },
    { niveau: 5, texte: 'Le Pacte (fonder ou rejoindre une alliance) et une Vigie' },
    { niveau: 6, texte: 'Le Tableau de Loge : trois objectifs communs par semaine' },
    { niveau: 7, texte: 'L\'appel du rare : signaler un monstre rare à la guilde' },
    { niveau: 8, texte: 'Premier décor de Loge, caparaçon de monture aux couleurs de la guilde' },
    { niveau: 10, texte: 'Deux Vigies, coffre de 60 places, cape brodée du blason' },
    { niveau: 12, texte: 'Le Carnet de Loge : les pages du Carnet remplies ensemble, un titre par région' },
    { niveau: 14, texte: 'La salle d\'entraînement de la Loge' },
    { niveau: 15, texte: 'Trois Vigies, coffre de 80 places' },
    { niveau: 17, texte: 'Second décor de Loge, bannière animée' },
    { niveau: 20, texte: 'Quatre Vigies, coffre de 100 places, blason doré, « Maison de renom »' },
    { niveau: 25, texte: 'Avec l\'extension 1 : une cinquième Vigie' },
    { niveau: 30, texte: 'Avec l\'extension 1 : la Double Porte, un donjon pour deux équipes de 4' },
  ];
  const vigies = n => (n >= 25 ? 5 : n >= 20 ? 4 : n >= 15 ? 3 : n >= 10 ? 2 : n >= 5 ? 1 : 0);

  const cairnsMax = plafond => { const p = plafond || (typeof Character === 'function' ? Character.MAX_LEVEL : 60); return p <= 60 ? 3 : p <= 100 ? 4 : 5; };
  const entretien = k => (k > 0 ? R.cairn.entretien * Math.pow(2, k - 1) : 0);
  const protection = k => (k <= 1 ? 7 : k === 2 ? 5 : 3);
  const attaquable = heure => heure >= R.vigie.attaque[0] && heure < R.vigie.attaque[1];

  return { R, niveauMax, xpMonstre, combatOrdinaire, ouvrage, partEffective, plein, coutNiveau, cumul, niveauDe, nouvelle, niveau, donner, tourner, DEBLOCAGES, vigies, cairnsMax, entretien, protection, attaquable };
})();
if (typeof module === 'object' && module.exports) module.exports = Guildes;
