const Heure = (() => {
  const JOUR = 2 * 3600 * 1000;
  const HEURE = JOUR / 24;
  const MOMENTS = [
    { id: 'nuit', nom: 'Nuit', de: 0, suite: true },
    { id: 'aube', nom: 'Aube', de: 5 },
    { id: 'jour', nom: 'Jour', de: 7 },
    { id: 'crepuscule', nom: 'Crépuscule', de: 18 },
    { id: 'nuit', nom: 'Nuit', de: 21 },
  ];
  let figee = null;
  try {
    const q = typeof location === 'object' && location.search && typeof Util === 'object' && Util.dev() ? new URLSearchParams(location.search).get('horloge') : null;
    if (q != null && q !== '' && Number.isFinite(+q)) figee = ((+q % 24) + 24) % 24;
  } catch (e) {   }

  function heure(maintenant) {
    if (figee != null) return figee;
    const t = ((Number(maintenant) % JOUR) + JOUR) % JOUR;
    return t / HEURE;
  }

  function moment(maintenant) {
    const h = heure(maintenant);
    let i = MOMENTS.length - 1;
    while (i > 0 && h < MOMENTS[i].de) i--;
    const m = MOMENTS[i], a = i + 1 < MOMENTS.length ? MOMENTS[i + 1].de : 24 + MOMENTS[1].de;
    return { id: m.id, nom: m.nom, de: m.de, a, reste: Math.round((a - h) * HEURE) };
  }

  const crepuscule = maintenant => moment(maintenant).id === 'crepuscule';

  function avant(id, maintenant) {
    const h = heure(maintenant), m = MOMENTS.find(x => x.id === id && !x.suite);
    if (!m || moment(maintenant).id === id) return 0;
    return Math.round((((m.de - h) % 24) + 24) % 24 * HEURE);
  }

  const libelle = maintenant => `${moment(maintenant).nom}, ${Math.floor(heure(maintenant))} h`;

  const figer = h => { figee = h == null ? null : ((+h % 24) + 24) % 24; };

  return { JOUR, HEURE, MOMENTS, heure, moment, crepuscule, avant, libelle, figer };
})();
