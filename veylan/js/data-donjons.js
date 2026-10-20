// Les boss des donjons et leurs clés tactiques (docs/DONJONS-ET-COMBATS.md) : la clé du Grand
// Grouk et de Dorm, et les six boss des nouveaux donjons d'Orsane et de Kaldum. Chaque boss se
// gagne en comprenant sa règle, pas en tapant plus fort. Se charge après js/data-bestiaire.js et
// s'appuie sur les helpers de js/data.js (S, M, dmg, pm, ...).
(() => {

// ===== Le Grand Grouk : charge jusqu'au premier obstacle, s'assomme contre un rocher =====
DATA.spells.m_ruee = S('m_ruee', { name: 'Ruée', element: 'terre', pa: 4, range: [1, 7], line: true, los: false, target: 'enemy',
  effects: [{ type: 'charge', min: 16, max: 22, push: 2 }], maxPerTurn: 1,
  desc: 'Fonce en ligne droite jusqu\'au premier obstacle. Qui se trouve sur le chemin prend le choc et recule de deux cases.' });
const gg = DATA.monsters.grand_grouk;
gg.hp = 200;   // 260 avant le réglage au bot (les monstres frappent et durent plus, DATA.rules)
gg.ai = 'charger';
gg.spells = ['m_ruee', 'm_charge_lourde', 'm_pietinement'];
gg.triggers = [
  { when: 'fightStart', do: [{ act: 'armor', value: 60 }, { act: 'log', text: 'Le Grand Grouk baisse la tête : sa toison épaisse amortit les coups.' }] },
  { when: 'blocked', if: { against: 'obstacle', charging: true }, do: [
    { act: 'stun', turns: 1 },
    { act: 'setEffect', effect: { type: 'vuln', value: 50, turns: 1 } },
    { act: 'feat', key: 'grand_grouk_sonne' },
    { act: 'log', text: 'Le Grand Grouk s\'assomme contre l\'obstacle ! Sonné, sans sa toison, il prend tout.' },
  ] },
].concat(gg.triggers);
gg.desc = 'Boss du Terrier. Sa toison amortit les coups. Il charge en ligne droite jusqu\'au premier obstacle : placez-vous dans son axe derrière un rocher, il s\'y assomme et devient vulnérable un tour.';

// ===== Dorm : en fusion, l'eau le trempe, son enclume le reforge =====
DATA.monsters.enclume_dorm = M('enclume_dorm', { name: 'Enclume de Dorm', region: 'invocation', level: '', shape: 'square', color: '#4a4f5c',
  hp: 999, pa: 0, pm: 0, initiative: 0, spells: [], ai: 'inert', summon: true, invulnerable: true, fixed: true,
  desc: 'L\'enclume où Dorm se reforge. On ne la casse pas, on ne la bouge pas : on éloigne Dorm d\'elle.' });
const dorm = DATA.monsters.dorm;
// Réglé au bot (balayage de la salle de l'Enclume, joueur de niveau 28 à 30 avec l'équipement attendu) :
// 280 PV, 3 PM et un Martèlement de 34 à 42 donnent environ 93 % de victoires en 10 tours.
dorm.level = '28 à 40';
dorm.home = 'enclume_dorm';
dorm.triggers = [
  { when: 'fightStart', do: [{ act: 'summon', monster: 'enclume_dorm', count: 1 }, { act: 'armor', value: 50 }, { act: 'log', text: 'Dorm est en fusion : la moitié des coups fondent sur lui.' }] },
  { when: 'hitByElement', element: 'eau', if: { armor: true }, do: [
    { act: 'armor', value: 0 },
    { act: 'setEffect', effect: { type: 'vuln', value: 30, turns: 2 } },
    { act: 'feat', key: 'dorm_trempe' },
    { act: 'log', text: 'Dorm est trempé : sa fusion retombe. Tenez-le loin de son enclume !' },
  ] },
  { when: 'turnEnd', if: { armor: false, adjacentTo: 'enclume_dorm' }, do: [
    { act: 'armor', value: 50 }, { act: 'removeEffect', type: 'vuln' },
    { act: 'log', text: 'Dorm se reforge contre son enclume.' },
  ] },
].concat(dorm.triggers);
dorm.desc = 'Boss de la Forge Morte. En fusion, il encaisse la moitié des coups. Un sort d\'eau le trempe et le rend vulnérable ; s\'il finit son tour contre son enclume, il se reforge.';

// ===== Le Glym Chapardeur (Grenier des Glyms, 4 à 8) : la lanterne volée =====
DATA.spells.m_vol_lumiere = S('m_vol_lumiere', { name: 'Vol de lumière', element: 'air', pa: 3, range: [1, 5], target: 'enemy', effects: [dmg(4, 6), pm(-1, 1)] });
DATA.monsters.pilou_chapardeur = M('pilou_chapardeur', { name: 'Glym Chapardeur', region: 'orsane', level: '4 à 8', boss: true, shape: 'diamond', color: '#ffd166',
  hp: 80, dmgMult: 0.5, pa: 6, pm: 5, initiative: 120, resist: { air: 20 }, spells: ['m_vol_lumiere', 'm_bec'], ai: 'ranged',
  triggers: [
    { when: 'fightStart', do: [{ act: 'state', name: 'lanterne', farDodge: true }, { act: 'log', text: 'Le Glym Chapardeur serre sa lanterne volée : à distance, il esquive tout.' }] },
    { when: 'hit', if: { state: 'lanterne', distanceMax: 1 }, do: [
      { act: 'removeState', name: 'lanterne' }, { act: 'stun', turns: 1 }, { act: 'feat', key: 'lanterne_reprise' },
      { act: 'log', text: 'Bonk ! Le Glym lâche la lanterne et passe son tour à la chercher.' },
    ] },
    { when: 'turnStart', if: { notState: 'lanterne' }, do: [{ act: 'state', name: 'lanterne', farDodge: true }, { act: 'log', text: 'Le Glym a retrouvé sa lanterne.' }] },
  ],
  desc: 'Boss du Grenier. Tant qu\'il tient sa lanterne volée, il esquive tout à distance : il faut aller le frapper au contact, elle tombe, et il perd un tour à la chercher.' });

// ===== Le Kavou Prisme (Volière des Kavous, 12 à 16) : la couleur qui change =====
const PRISME = [
  { name: 'bleu', element: 'eau', weak: 'feu', color: '#4fb3ff', spell: 'm_prisme_eau' },
  { name: 'roux', element: 'feu', weak: 'eau', color: '#ff7a45', spell: 'm_prisme_feu' },
  { name: 'ocre', element: 'terre', weak: 'air', color: '#c9a35c', spell: 'm_prisme_terre' },
  { name: 'blanc', element: 'air', weak: 'terre', color: '#f2f2f2', spell: 'm_prisme_air' },
];
for (const c of PRISME) {
  DATA.spells[c.spell] = S(c.spell, { name: `Éclat ${c.name}`, element: c.element, pa: 3, range: [1, 4], target: 'enemy', effects: [dmg(8, 11)], maxPerTurn: 2 });
}
DATA.monsters.kavou_prisme = M('kavou_prisme', { name: 'Kavou Prisme', region: 'orsane', level: '12 à 16', boss: true, shape: 'circle', color: '#4fb3ff',
  hp: 240, dmgMult: 0.5, pa: 6, pm: 3, initiative: 90, spells: ['m_prisme_eau'], ai: 'melee',
  triggers: [{ when: 'fightStart', do: [{ act: 'cycleColor', cycle: PRISME }] }, { when: 'turnStart', do: [{ act: 'cycleColor', cycle: PRISME }] }],
  desc: 'Boss de la Volière. Change de couleur à chacun de ses tours : sa couleur le soigne, l\'élément opposé le blesse double. Bleu craint le feu, roux l\'eau, ocre l\'air, blanc la terre.' });

// ===== La Fileuse (Nid des Toiles, 12 à 16) : le cocon et ses deux fils =====
DATA.spells.m_fil_de_soie = S('m_fil_de_soie', { name: 'Fil de soie', element: 'neutre', pa: 3, range: [1, 5], target: 'enemy', effects: [dmg(7, 10), pm(-1, 1)] });
DATA.spells.m_morsure_fileuse = S('m_morsure_fileuse', { name: 'Morsure de la Fileuse', element: 'terre', pa: 4, range: [1, 1], target: 'enemy', effects: [dmg(12, 16)] });
DATA.monsters.fil_ancrage = M('fil_ancrage', { name: 'Fil d\'ancrage', region: 'invocation', level: '', shape: 'hex', color: '#e8e8f0',
  hp: 18, pa: 0, pm: 0, initiative: 0, spells: [], ai: 'inert', summon: true, fixed: true,
  desc: 'Un des deux fils qui tiennent le cocon de la Fileuse. Il faut couper les deux le même tour.' });
const COCOON = { act: 'cocoon', anchor: 'fil_ancrage', count: 2, reweave: 3 };
DATA.monsters.fileuse = M('fileuse', { name: 'La Fileuse', region: 'orsane', level: '12 à 16', boss: true, shape: 'hex', color: '#cfcfdf',
  hp: 230, dmgMult: 0.5, pa: 6, pm: 3, initiative: 80, resist: { neutre: 20 }, spells: ['m_fil_de_soie', 'm_toile', 'm_morsure_fileuse'], ai: 'ranged',
  triggers: [{ when: 'fightStart', do: [COCOON] }, { when: 'turnStart', do: [COCOON] }],
  desc: 'Boss du Nid. Invulnérable dans son cocon tant que ses deux fils d\'ancrage tiennent. Un fil coupé repousse : coupez les deux le même tour, et le cocon s\'ouvre trois tours.' });

// ===== Kraska, la Mère-Braise (Cuve des Cendrous, 26 à 32) : les braises qui explosent =====
DATA.monsters.braise_vive = M('braise_vive', { name: 'Braise vive', region: 'invocation', level: '', shape: 'circle', color: '#ff7a2b',
  hp: 12, pa: 3, pm: 3, initiative: 0, spells: ['m_etreinte_braise'], ai: 'melee', summon: true,
  triggers: [{ when: 'death', do: [{ act: 'explode', min: 22, max: 30, element: 'feu', radius: 1 }] }],
  desc: 'Explose en mourant sur tout ce qui l\'entoure, la Mère-Braise comprise.' });
DATA.monsters.kraska = M('kraska', { name: 'Kraska, la Mère-Braise', region: 'kaldum', level: '26 à 32', boss: true, shape: 'hex', color: '#ff6a2b',
  hp: 380, dmgMult: 0.6, pa: 6, pm: 2, initiative: 70, resist: { feu: -20, eau: 20 }, spells: ['m_flamme', 'm_bouffee'], ai: 'ranged',
  triggers: [
    { when: 'fightStart', do: [{ act: 'armor', value: 60 }, { act: 'summon', monster: 'braise_vive', count: 2, max: 4 }, { act: 'log', text: 'Kraska s\'enveloppe de cendre : les coups glissent sur elle, pas les explosions.' }] },
    { when: 'turnStart', if: { every: 3 }, do: [{ act: 'summon', monster: 'braise_vive', count: 2, max: 4 }, { act: 'log', text: 'Kraska rallume deux braises.' }] },
  ],
  desc: 'Boss de la Cuve. Sa robe de cendre amortit les coups, pas les explosions : tuez ses Braises vives à côté d\'elle. Elle en rallume deux tous les trois tours.' });

// ===== La Glaise Mère (Boues Chaudes, 20 à 26) : le feu d'abord, jamais l'eau =====
DATA.monsters.glaise_mere = M('glaise_mere', { name: 'La Glaise Mère', region: 'kaldum', level: '20 à 26', boss: true, shape: 'hex', color: '#8a6a3a',
  hp: 360, dmgMult: 0.6, pa: 6, pm: 2, initiative: 30, resist: { terre: 30 }, spells: ['m_boue', 'm_coulee'], ai: 'melee',
  triggers: [
    { when: 'fightStart', do: [{ act: 'armor', value: 50 }, { act: 'absorb', element: 'eau' }, { act: 'log', text: 'La Glaise Mère est épaisse et boit l\'eau.' }] },
    { when: 'hitByElement', element: 'feu', do: [{ act: 'setEffect', effect: { type: 'vuln', value: 100, turns: 2 } }, { act: 'feat', key: 'glaise_cuite' }, { act: 'log', text: 'La Glaise Mère cuit et craque : elle prend double pendant deux tours.' }] },
    { when: 'hpBelow', pct: 50, do: [{ act: 'summon', monster: 'glek', count: 3 }, { act: 'log', text: 'La Glaise Mère s\'effrite en Gleks !' }] },
  ],
  desc: 'Boss des Boues Chaudes. L\'eau la soigne, le feu la cuit et lui fait prendre double deux tours. À moitié vie, elle s\'effrite en trois Gleks qui suivent la même règle.' });

// ===== Le Grand Tholou (Mine des Tholous, 22 à 30) : le lien avec le plus gros =====
DATA.monsters.grand_tholou = M('grand_tholou', { name: 'Le Grand Tholou', region: 'kaldum', level: '22 à 30', boss: true, shape: 'circle', color: '#ffb37a',
  hp: 300, pa: 6, pm: 2, initiative: 45, resist: { feu: 30 }, spells: ['m_ronron', 'm_chaleur', 'm_etincelle'], ai: 'support',
  triggers: [{ when: 'turnStart', do: [{ act: 'bond', pa: 2, range: 3 }] }],
  desc: 'Boss de la Mine. Donne deux de ses PA au plus gros de ses alliés ; séparé de lui de plus de trois cases, il panique et perd son tour.' });

// ===== Rencontres de laboratoire pour chaque boss =====
DATA.encounters.push(
  { id: 'grenier', region: 'orsane', name: 'Grenier des Glyms (boss)', monsters: ['pilou_chapardeur', 'pilou'] },
  { id: 'voliere_kavous', region: 'orsane', name: 'Volière des Kavous (boss)', monsters: ['kavou_prisme', 'kavou_bleu', 'kavou_roux'] },
  { id: 'nid_toiles', region: 'orsane', name: 'Nid des Toiles (boss)', monsters: ['fileuse', 'tissefil'] },
  { id: 'cuve', region: 'kaldum', name: 'Cuve des Cendrous (boss)', monsters: ['kraska', 'cendrou'] },
  { id: 'glaise_mere', region: 'kaldum', name: 'Boues Chaudes (boss)', monsters: ['glaise_mere', 'glek'] },
  { id: 'mine', region: 'kaldum', name: 'Mine des Tholous (boss)', monsters: ['grand_tholou', 'molh', 'tholou'] },
);
})();
