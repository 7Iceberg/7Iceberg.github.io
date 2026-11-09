DATA.regions.geole = 'La Geôle du Guet';
DATA.content.zones.push({
  id: 'geole', name: 'La Geôle du Guet', region: 'geole', horsCarte: true, level: [1, 200], palette: 'orsane', origin: [60, 60],
  description: 'La cellule du Guet des Cimes. On y attend que le Conseil vous rende la lumière.',
  maps: [
    {
      id: 'geole_cellule', name: 'La Cellule', sousZone: 'La Geôle du Guet', level: [1, 200],
      layout: [
        '###############',
        '##,,,,,,,,,,,##',
        '##,,,,,,,,,,,##',
        '##,,,,,,,,,,,##',
        '##,,,,,,,,,,,##',
        '##,,,,L,L,,,,##',
        '##,,,,,,,,,,,##',
        '##,,,,,P,,,,,##',
        '##,,,,,,,,,,,##',
        '##,,,,,,,,,,,##',
        '##,,,,,,,,,,,##',
        '##,,,,,,,,,,,##',
        '##,,,,,,,,,,,##',
        '###############',
        '###############',
      ],
      exits: { n: null, e: null, s: null, w: null },
      npcs: ['geolier'],
      nodes: [],
      groups: [],
      relay: false,
    },
  ],
});
DATA.content.npcs.push({
  id: 'geolier', name: 'Le Geôlier', title: 'Le Guet des Cimes', look: 'garde',
  dialogue: [
    'Le Conseil t\'a mis à l\'ombre, Veilleur. La raison et la durée sont dans ta lettre ; si tu crois à une erreur, tu peux la contester une fois, dans les trente jours.',
    'Ici, ni combat ni échange. Assieds-toi, la peine passe plus vite qu\'on ne le croit, et la porte s\'ouvre d\'elle-même à la fin.',
  ],
});
