(function () {
  const C = DATA.content;
  const M = C.montures = C.montures || [];

  M.push(
    { id: 'molh_de_selle', nom: 'Molh de selle', famille: ['molh'], region: 'kaldum', bonus: { vita: 20 }, vitesse: 1.5,
      couleur: '#8a93a6', glyphe: 'M',
      objet: { id: 'molh_selle', nom: 'Molh sellé', lore: 'Un jeune Molh, une selle de basalte et un mors de Lurvik. Il attend qu\'on monte. Il attendra longtemps s\'il le faut.' },
      description: 'Un jeune Molh apprivoisé par Kavra. Lent au départ, il ne s\'arrête plus une fois lancé : on traverse les cartes plus vite, et sa masse protège (de la Vitalité, quand on le monte).' },
  );

  for (const m of M) C.consumables.push({ id: m.objet.id, name: m.objet.nom, kind: 'monture', level: DATA.rules.montureNiveau || 50, price: 1, rarity: 'epique', monture: m.id, lore: m.objet.lore });

  C.quests.push({
    id: 'kaldum_un_molh_qui_suit', name: 'Un Molh qui suit', level: 50, main: false,
    giver: 'kavra', requires: { level: 50, quests: ['kaldum_le_pari_de_kavra'] },
    steps: [
      { type: 'kill', monster: 'molh', count: 5, text: 'Écarter cinq grands Molhs de celui qui suit Kavra' },
      { type: 'collect', item: 'pierre_de_molh', count: 6, text: 'Rapporter six pierres de Molh, encore chaudes, pour l\'appâter' },
      { type: 'talk', npc: 'kavra', text: 'Revenir voir Kavra à la Halle' },
    ],
    dialogue: {
      offer: [
        "Il y en a un qui me suit. Un petit Molh. Depuis que les forges refroidissent, il vient se chauffer contre mon dos.",
        "Les grands le chassent. Écarte-les, et rapporte-moi des pierres de Molh chaudes : il ne mange que ça.",
      ],
      progress: ["Il m'attend derrière la Halle. Il fait semblant d'être un rocher. Il le fait très bien."],
      done: [
        "Il a tout mangé. Six pierres. Il a l'air content : il n'a pas bougé depuis.",
        "Si on lui mettait une selle, je crois qu'il porterait n'importe qui. Même toi.",
      ],
    },
    rewards: { xp: 3374, fils: 45 },
  });

  C.quests.push({
    id: 'kaldum_la_selle_de_basalte', name: 'La selle de basalte', level: 50, main: false,
    giver: 'kavra', requires: { level: 50, quests: ['kaldum_un_molh_qui_suit'] },
    steps: [
      { type: 'gather', resource: 'basalte_de_kaldum', count: 6, text: 'Tailler six blocs de basalte pour la selle' },
      { type: 'talk', npc: 'tharik', text: 'Faire forger un mors chez Lurvik, aux Ateliers' },
      { type: 'talk', npc: 'kavra', text: 'Seller le Molh avec Kavra' },
    ],
    dialogue: {
      offer: [
        "Une selle en cuir, il la mangerait. En basalte, il ne la sentira même pas.",
        "Taille-moi du basalte, et va demander un mors à Lurvik. Il dira non, puis il le fera.",
      ],
      progress: ["Lurvik râle, mais il forge. Le basalte, tu le trouves dans les galeries."],
      done: [
        "Voilà. Selle de basalte, mors de Lurvik, et un Molh qui ne demande qu'à avancer.",
        "Il est à toi. Monte, et tiens-toi bien : une fois lancé, il ne s'arrête plus.",
      ],
    },
    rewards: { xp: 3620, fils: 50, items: [{ id: 'molh_selle', count: 1 }] },
  });
})();
