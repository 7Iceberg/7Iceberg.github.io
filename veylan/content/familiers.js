(function () {
  const C = DATA.content;
  const F = C.familiers = C.familiers || [];

  F.push(
    { id: 'petit_glym', nom: 'Petit Glym', famille: ['pilou'], region: 'orsane', bonus: { pp: 20 },
      couleur: '#9fd7ff', glyphe: 'G',
      oeuf: { id: 'oeuf_de_glym', nom: 'Œuf de Glym', taux: 1.5, lore: 'Bleu pâle, tiède, et il bouge un peu quand on le regarde trop longtemps.' },
      echange: [['plume_de_pilou', 40], ['bec_de_pilou', 12], ['duvet_de_pilou', 3]],
      description: 'Un Glym des Prés qui a décidé de vous suivre. Il fouille tout ce qui tombe et rapporte ce qui brille : plus de butin.' },
    { id: 'petit_kavou_de_braise', nom: 'Petit Kavou de Braise', famille: ['kavou_roux'], region: 'orsane', bonus: { intel: 30 },
      couleur: '#e2843c', glyphe: 'K',
      oeuf: { id: 'oeuf_de_kavou', nom: 'Œuf de Kavou de Braise', taux: 1.5, lore: 'Une coquille rousse, chaude au toucher. Elle sent la braise et la plume roussie.' },
      echange: [['plume_de_kavou', 50]],
      description: 'Un Kavou de Braise encore tout en duvet. Il couve une petite flamme qu\'il vous prête : de l\'Ignis.' },
    { id: 'petit_tholou', nom: 'Petit Tholou', famille: ['tholou', 'tholou_tisse'], region: 'kaldum', bonus: { vita: 24 },
      couleur: '#ff9a6a', glyphe: 'T',
      oeuf: { id: 'oeuf_de_tholou', nom: 'Petit Tholou endormi', taux: 1.5, boss: { grand_tholou: 10 }, lore: 'Roulé en boule, il ronronne. On n\'ose pas le réveiller, mais il faudra bien.' },
      echange: [['poil_de_tholou', 40], ['pelage_du_grand_tholou', 1]],
      description: 'Le familier le plus demandé de Kaldum. Son ventre tiède réchauffe celui qui le porte : de la Vitalité.' },
  );

  for (const f of F) {
    const drops = f.famille.map(m => ({ monster: m, rate: f.oeuf.taux }));
    for (const b in f.oeuf.boss || {}) drops.push({ monster: b, rate: f.oeuf.boss[b] });
    C.consumables.push({ id: f.oeuf.id, name: f.oeuf.nom, kind: 'oeuf', level: 1, price: 40, rarity: 'rare', familier: f.id, drops, lore: f.oeuf.lore });
  }
})();
