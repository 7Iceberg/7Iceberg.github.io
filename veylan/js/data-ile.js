(DATA.modules = DATA.modules || {}).ervaneBestiaire = () => {
  if (DATA.monsters.glym_ignis) return;
  DATA.regions.ervane = 'Ervane, l\'île de l\'Éveil';

  DATA.spells.m_braisille = S('m_braisille', { name: 'Braisille', element: 'feu', pa: 3, range: [1, 3], target: 'enemy',
    effects: [dmg(2, 4), dot('feu', 1, 2)], maxPerTurn: 1, desc: 'Une braise qui colle : brûle un peu pendant deux tours.' });
  DATA.spells.m_gouttelette = S('m_gouttelette', { name: 'Gouttelette', element: 'eau', pa: 3, range: [1, 3], target: 'enemy',
    effects: [dmg(3, 5), pm(-1, 1)], inesquivable: true, maxPerTurn: 1, desc: 'Une goutte glacée sur les pieds : 1 PM de moins au prochain tour, sans esquive.' });
  DATA.spells.m_rafale = S('m_rafale', { name: 'Rafale', element: 'air', pa: 3, range: [1, 2], target: 'enemy',
    effects: [dmg(3, 5), push(1)], maxPerTurn: 1, desc: 'Un coup de vent qui repousse d\'une case.' });
  DATA.spells.m_motte = S('m_motte', { name: 'Motte', element: 'terre', pa: 3, range: [1, 1], target: 'enemy',
    effects: [dmg(3, 5)], selfEffects: [shield(3, 1)], maxPerTurn: 1, desc: 'Frappe au contact et se couvre de mousse : un petit bouclier.' });

  DATA.monsters.glym_ignis = M('glym_ignis', { name: 'Glym Ignis', region: 'ervane', level: '1 à 3', shape: 'diamond', color: '#a8533c', noyau: '#ffb347',
    hp: 27, dmgMult: 0.8, pa: 3, pm: 3, initiative: 100, resist: { feu: 20, eau: -30 }, spells: ['m_braisille'], ai: 'ranged',
    desc: 'Glym de la Source de Braise. Frappe au feu et brûle un peu.' });
  DATA.monsters.glym_aqua = M('glym_aqua', { name: 'Glym Aqua', region: 'ervane', level: '1 à 3', shape: 'diamond', color: '#3f7f86', noyau: '#a6f0e4',
    hp: 29, dmgMult: 0.8, pa: 3, pm: 3, initiative: 90, resist: { eau: 30, terre: -30, feu: -10 }, spells: ['m_gouttelette'], ai: 'ranged',
    desc: 'Glym de la Source Claire. Frappe à l\'eau et retire 1 PM.' });
  DATA.monsters.glym_aer = M('glym_aer', { name: 'Glym Aer', region: 'ervane', level: '1 à 3', shape: 'diamond', color: '#8e93b8', noyau: '#dcd6ff',
    hp: 25, dmgMult: 0.8, pa: 3, pm: 4, initiative: 115, resist: { air: 30, feu: -30 }, spells: ['m_rafale'], ai: 'ranged',
    desc: 'Glym de la Source du Vent. Frappe à l\'air et repousse d\'une case.' });
  DATA.monsters.glym_terra = M('glym_terra', { name: 'Glym Terra', region: 'ervane', level: '1 à 3', shape: 'diamond', color: '#6c7f45', noyau: '#c9f06a',
    hp: 38, dmgMult: 0.85, pa: 3, pm: 2, initiative: 60, resist: { terre: 30, air: -30, feu: -10 }, spells: ['m_motte'], ai: 'melee',
    desc: 'Glym de la Source de Mousse. Frappe à la terre et se couvre d\'un petit bouclier.' });

  DATA.spells.m_spores = S('m_spores', { name: 'Bouffée de spores', element: 'terre', pa: 3, range: [1, 1], target: 'enemy',
    effects: [dmg(3, 5), push(2)], fx: 'spores', desc: 'Un coup de coiffe et un nuage de spores : repousse de deux cases.' });
  DATA.monsters.lampignon = M('lampignon', { name: 'Lampignon', region: 'ervane', level: '3 à 5', shape: 'triangle', color: '#b3a07c', noyau: '#5fe8ff',
    hp: 42, dmgMult: 1.7, pa: 6, pm: 3, initiative: 55, resist: { eau: 10, terre: 5, feu: -15 }, spells: ['m_spores'], ai: 'melee',
    desc: 'Champignon des Murets, l\'œil de verre allumé. Charge et repousse de deux cases.' });

  DATA.spells.m_baton_gluant = S('m_baton_gluant', { name: 'Bâton gluant', element: 'terre', pa: 3, range: [1, 1], target: 'enemy',
    effects: [dmg(8, 11), push(1)], fx: 'bave', desc: 'Un coup de bâton tordu, la bave avec : repousse d\'une case.' });
  DATA.monsters.lampignard = M('lampignard', { name: 'Lampignard', region: 'ervane', level: '3 à 20', shape: 'triangle', color: '#9e5631', noyau: '#9ee04a',
    hp: 36, dmgMult: 1.15, pa: 6, pm: 3, initiative: 60, resist: { terre: 10, eau: 5, feu: -10 }, spells: ['m_baton_gluant'], ai: 'melee',
    desc: 'Le grand frère des Lampignons, chaman des Murets. Frappe du bâton et repousse d\'une case.' });

  DATA.spells.m_grignote = S('m_grignote', { name: 'Grignote', element: 'terre', pa: 3, range: [1, 1], target: 'enemy', effects: [dmg(7, 10)],
    desc: 'Deux dents de meule qui se referment.' });
  DATA.spells.m_gravillon = S('m_gravillon', { name: 'Gravillon', element: 'terre', pa: 3, range: [2, 4], target: 'enemy', effects: [dmg(4, 6)],
    desc: 'Du gravier mâché, craché de loin.' });
  DATA.spells.m_polissage = S('m_polissage', { name: 'Polissage', element: 'neutre', pa: 3, range: [0, 3], target: 'ally', effects: [heal(6, 9)], maxPerTurn: 1,
    desc: 'La Meulière polit un des siens : il reprend des PV.' });
  DATA.monsters.krobbet = M('krobbet', { name: 'Krobbet', region: 'ervane', level: '6 à 10', shape: 'square', color: '#8f8676',
    hp: 38, dmgMult: 0.95, pa: 6, pm: 3, initiative: 70, resist: { terre: 15, air: -10 }, spells: ['m_grignote'], ai: 'melee',
    desc: 'Nichée de Krobb. Grignote au contact.' });
  DATA.monsters.gravelin = M('gravelin', { name: 'Gravelin', region: 'ervane', level: '6 à 10', shape: 'square', color: '#a39a86',
    hp: 46, dmgMult: 0.65, pa: 6, pm: 3, initiative: 85, resist: { terre: 15, air: -10 }, spells: ['m_gravillon'], ai: 'ranged',
    desc: 'Crache du gravier de loin et se cache derrière les bornes.' });
  DATA.monsters.meuliere = M('meuliere', { name: 'Meulière', region: 'ervane', level: '7 à 12', shape: 'square', color: '#bdb39c',
    hp: 34, dmgMult: 1.0, pa: 6, pm: 2, initiative: 75, resist: { eau: 10, neutre: 5, terre: -10 }, spells: ['m_polissage', 'm_gravillon'], ai: 'support',
    desc: 'La mère des galets. Soigne les siens : à abattre en premier.' });

  DATA.spells.m_grosse_bouchee = S('m_grosse_bouchee', { name: 'Grosse bouchée', element: 'terre', pa: 4, range: [1, 1], target: 'enemy',
    effects: [dmg(9, 12)], maxPerTurn: 1, desc: 'Krobb referme sa mâchoire de meule sur ce qui est à portée.' });
  DATA.spells.m_crachat_gravier = S('m_crachat_gravier', { name: 'Crachat de gravier', element: 'terre', pa: 2, range: [2, 5], target: 'enemy',
    effects: [dmg(4, 6)], maxPerTurn: 2, desc: 'Du gravier mâché, craché de loin, deux fois par tour au plus.' });
  DATA.monsters.krobb = M('krobb', { name: 'Krobb, le Ronge-Amarre', region: 'ervane', level: '7 à 9', boss: true, shape: 'square', color: '#7d7466', noyau: '#f2c14e',
    hp: 120, dmgMult: 0.35, pa: 6, pm: 3, initiative: 60, resist: { terre: 20, air: -10 }, spells: ['m_grosse_bouchee', 'm_crachat_gravier'],
    ai: 'melee',
    triggers: [
      { when: 'fightStart', do: [{ act: 'armor', value: 50 },
        { act: 'log', text: 'Krobb serre les dents : sa carapace de gravier amortit la moitié des coups.' }] },
      { when: 'turnStart', if: { armor: false, voitEnnemi: true }, do: [{ act: 'armor', value: 50 },
        { act: 'log', text: 'Krobb vous voit : sa carapace se referme.' }] },
      { when: 'turnStart', if: { armor: true, voitEnnemi: false }, do: [{ act: 'armor', value: 0 }, { act: 'feat', key: 'krobb_renifle' },
        { act: 'log', text: 'Krobb ne voit personne : il renifle, gueule grande ouverte. Sortez et frappez !' }] },
      { when: 'hit', if: { armor: false }, do: [{ act: 'feat', key: 'krobb_gueule_ouverte' }] },
    ],
    desc: 'Boss du Puits. Sa carapace amortit la moitié des coups tant qu\'il vous voit. Cachez-vous derrière un pilier : il ouvre la gueule pour renifler, et reste ouvert un tour.' });

  DATA.encounters.push({ id: 'puits_krobb', region: 'ervane', name: 'Puits de l\'Amarre (boss)', monsters: ['krobb', 'krobbet'] });
};
