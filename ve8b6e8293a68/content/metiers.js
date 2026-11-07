(function () {
  const C = DATA.content;
  C.metiers = [
    { id: 'bucheron', nom: 'Bûcheron', genre: 'recolte', recolte: ['bois'], ateliers: ['bucheron'], hote: 'cordonnier',
      description: 'Abat les arbres et taille les planches que demandent les cordonniers, les sculpteurs et les façonneurs.' },
    { id: 'mineur', nom: 'Mineur', genre: 'recolte', recolte: ['pierre', 'minerai'], ateliers: ['mineur'], hote: 'forgeron',
      description: 'Extrait la pierre et le minerai, et les fond en alliages pour les bijoutiers et les forgerons.' },
    { id: 'paysan', nom: 'Paysan', genre: 'recolte', recolte: ['cereale'], ateliers: ['paysan', 'boulanger'], hote: 'alchimiste',
      description: 'Fauche les céréales, les moud en farine et cuit les pains (la boulangerie lui est rattachée).' },
    { id: 'alchimiste', nom: 'Alchimiste', genre: 'recolte', recolte: ['plante'], ateliers: ['alchimiste'], hote: null,
      description: 'Cueille les plantes et en tire les potions, les parchemins et les essences.' },
    { id: 'pecheur', nom: 'Pêcheur', genre: 'recolte', recolte: ['poisson'], ateliers: ['pecheur'], hote: 'alchimiste',
      description: 'Pêche dans les eaux des régions et prépare les poissons, qui rendent des PV.' },
    { id: 'tailleur', nom: 'Tailleur', genre: 'artisanat', recolte: [], ateliers: ['tailleur'], hote: null,
      description: 'Coiffes et capes ; les Nœuds et les teintures.' },
    { id: 'cordonnier', nom: 'Cordonnier', genre: 'artisanat', recolte: [], ateliers: ['cordonnier'], hote: null,
      description: 'Bottes et ceintures.' },
    { id: 'bijoutier', nom: 'Bijoutier', genre: 'artisanat', recolte: [], ateliers: ['bijoutier'], hote: null,
      description: 'Anneaux et amulettes.' },
    { id: 'forgeron', nom: 'Forgeron', genre: 'artisanat', recolte: [], ateliers: ['forgeron'], hote: null,
      description: 'Épées, dagues, haches, marteaux, pelles, faux, lances et pioches.' },
    { id: 'sculpteur', nom: 'Sculpteur', genre: 'artisanat', recolte: [], ateliers: ['sculpteur'], hote: 'forgeron',
      description: 'Arcs, bâtons et baguettes.' },
    { id: 'faconneur', nom: 'Façonneur', genre: 'artisanat', recolte: [], ateliers: ['faconneur'], hote: 'forgeron',
      description: 'Boucliers, pierres d\'âme ; plus tard, les Sceaux de Forge.' },
    { id: 'bricoleur', nom: 'Bricoleur', genre: 'artisanat', recolte: [], ateliers: ['bricoleur'], hote: 'forgeron',
      description: 'Les clés des donjons et les objets utiles.' },
  ];

  const SCULPTE = ['arc', 'baton', 'baguette'];
  for (const r of C.recipes) {
    const w = C.weapons.find(x => x.id === r.result);
    if (w && SCULPTE.includes(w.type)) r.workshop = 'sculpteur';
    else if (/^cle_/.test(r.result)) r.workshop = 'bricoleur';
    else { const c = C.consumables.find(x => x.id === r.result); if (c && c.kind === 'pain') r.workshop = 'paysan'; }
  }
})();
