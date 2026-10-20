// Bestiaire étendu (docs/MONSTRES.md, partie 2) : les paliers des familles d'Orsane et de Kaldum
// (nichées, tissés, défaits) et cinq familles nouvelles (Kavou, Thelk, Tholou, Oreth, Korvath).
// Ce fichier se charge juste après js/spell-names.js. Il s'appuie sur les helpers de js/data.js
// (S, M, dmg, heal, pa, pm, root, shield, power, push, dot, state, cross1, circle1, line3),
// déclarés en const au niveau du script et donc visibles d'ici. Il n'altère rien d'existant :
// les ids, les sorts et les fiches de data.js restent tels quels.
(() => {

// ===== Sorts des paliers, Orsane =====
// Glym
DATA.spells.m_picot = S('m_picot', { name: 'Picot', element: 'air', pa: 3, range: [1, 2], target: 'enemy', effects: [dmg(2, 4), pm(-1, 1)] });
DATA.spells.m_bec_defait = S('m_bec_defait', { name: 'Bec défait', element: 'air', pa: 3, range: [1, 3], target: 'enemy', effects: [dmg(7, 10), pm(-1, 1)], selfEffects: [{ type: 'pmNow', value: 1 }] });
// Grouk
DATA.spells.m_charge_folle = S('m_charge_folle', { name: 'Charge folle', element: 'terre', pa: 3, range: [1, 1], target: 'enemy', effects: [dmg(3, 5), push(2)] });
DATA.spells.m_coup_corne = S('m_coup_corne', { name: 'Coup de corne', element: 'terre', pa: 3, range: [1, 1], target: 'enemy', effects: [dmg(9, 12)], cooldown: 1 });
// Tissefil
DATA.spells.m_toile_fine = S('m_toile_fine', { name: 'Toile fine', element: 'neutre', pa: 3, range: [1, 3], target: 'enemy', effects: [dmg(2, 3), pm(-1, 1)] });
DATA.spells.m_fil_tendu = S('m_fil_tendu', { name: 'Fil tendu', element: 'neutre', pa: 2, range: [1, 4], target: 'free', effects: [{ type: 'trap', name: 'Fil tendu', effects: [dmg(4, 6), root] }], cooldown: 2 });
// Veilloche
DATA.spells.m_voile_lueur = S('m_voile_lueur', { name: 'Voile de lueur', element: 'neutre', pa: 3, range: [0, 4], target: 'ally', aoe: cross1, affects: 'allies', affectsCaster: true, effects: [shield(12, 2)], cooldown: 2 });
// Brimbe
DATA.spells.m_caillou = S('m_caillou', { name: 'Caillou', element: 'terre', pa: 3, range: [2, 4], target: 'enemy', effects: [dmg(4, 6)] });
DATA.spells.m_eclat_pierre = S('m_eclat_pierre', { name: 'Éclat de pierre', element: 'terre', pa: 4, range: [2, 5], target: 'enemy', aoe: cross1, affects: 'enemies', effects: [dmg(7, 10)], cooldown: 1 });

// ===== Sorts des paliers, Kaldum =====
// Molh
DATA.spells.m_caillasse = S('m_caillasse', { name: 'Caillasse', element: 'terre', pa: 4, range: [1, 1], target: 'enemy', effects: [dmg(9, 12)] });
DATA.spells.m_tremblement = S('m_tremblement', { name: 'Tremblement', element: 'terre', pa: 3, range: [0, 0], los: false, target: 'self', aoe: circle1, affects: 'enemies', effects: [dmg(8, 10), pm(-1, 1)], cooldown: 2 });
// Rakthul (id kaldrik)
DATA.spells.m_coup_scorie = S('m_coup_scorie', { name: 'Coup de scorie', element: 'terre', pa: 3, range: [1, 1], target: 'enemy', effects: [dmg(7, 9)] });
DATA.spells.m_enclume = S('m_enclume', { name: 'Enclume', element: 'terre', pa: 4, range: [1, 1], target: 'enemy', effects: [dmg(12, 15), push(1)], cooldown: 1 });
// Fumerolle
DATA.spells.m_souffle = S('m_souffle', { name: 'Souffle', element: 'feu', pa: 3, range: [1, 3], los: false, target: 'any', aoe: cross1, affects: 'enemies', effects: [dmg(3, 5)] });
DATA.spells.m_etouffement = S('m_etouffement', { name: 'Étouffement', element: 'feu', pa: 3, range: [1, 3], target: 'enemy', effects: [dmg(6, 8), pa(-1, 1)] });
// Pioche-Vive
DATA.spells.m_clou = S('m_clou', { name: 'Clou', element: 'terre', pa: 3, range: [1, 3], line: true, target: 'enemy', effects: [dmg(5, 7)] });
DATA.spells.m_masse = S('m_masse', { name: 'Masse', element: 'terre', pa: 4, range: [1, 1], target: 'enemy', effects: [dmg(12, 15), push(1)], cooldown: 1 });

// ===== Kavou, la famille à couleurs : un Soupir par couleur =====
DATA.spells.m_soupir_eau = S('m_soupir_eau', { name: 'Soupir bleu', element: 'eau', pa: 3, range: [1, 3], target: 'enemy', effects: [dmg(5, 7)] });
DATA.spells.m_soupir_feu = S('m_soupir_feu', { name: 'Soupir roux', element: 'feu', pa: 3, range: [1, 3], target: 'enemy', effects: [dmg(5, 7)] });
DATA.spells.m_soupir_terre = S('m_soupir_terre', { name: 'Soupir ocre', element: 'terre', pa: 3, range: [1, 3], target: 'enemy', effects: [dmg(5, 7)] });
DATA.spells.m_soupir_air = S('m_soupir_air', { name: 'Soupir blanc', element: 'air', pa: 3, range: [1, 3], target: 'enemy', effects: [dmg(5, 7)] });
DATA.spells.m_soupir_pourpre = S('m_soupir_pourpre', { name: 'Soupir pourpre', element: 'neutre', pa: 3, range: [1, 3], target: 'enemy', effects: [dmg(7, 9), pa(-1, 1)], maxPerTurn: 1 });

// ===== Thelk, la famille énigme =====
DATA.spells.m_giclee = S('m_giclee', { name: 'Giclée', element: 'terre', pa: 3, range: [1, 2], target: 'enemy', effects: [dmg(4, 6)] });
DATA.spells.m_boue = S('m_boue', { name: 'Boue', element: 'terre', pa: 3, range: [1, 2], target: 'enemy', effects: [dmg(8, 11), pm(-1, 1)] });
DATA.spells.m_coulee = S('m_coulee', { name: 'Coulée', element: 'terre', pa: 4, range: [1, 3], line: true, target: 'any', aoe: line3, affects: 'enemies', effects: [dmg(9, 12)], cooldown: 1 });

// ===== Tholou, le soutien qui se colle au plus gros =====
DATA.spells.m_ronron = S('m_ronron', { name: 'Ronron', element: 'neutre', pa: 3, range: [0, 3], target: 'ally', aoe: cross1, affects: 'allies', affectsCaster: true, effects: [heal(8, 11)], maxPerTurn: 1 });
DATA.spells.m_chaleur = S('m_chaleur', { name: 'Chaleur', element: 'feu', pa: 2, range: [0, 3], target: 'ally', aoe: cross1, affects: 'allies', affectsCaster: true, effects: [pa(1, 1)], cooldown: 1 });
DATA.spells.m_manteau_cendre = S('m_manteau_cendre', { name: 'Manteau de cendre', element: 'neutre', pa: 3, range: [0, 3], target: 'ally', aoe: cross1, affects: 'allies', affectsCaster: true, effects: [shield(12, 2)], cooldown: 2 });

// ===== Oreth, le monstre rare =====
DATA.spells.m_frolement = S('m_frolement', { name: 'Frôlement', element: 'air', pa: 3, range: [2, 6], target: 'enemy', effects: [dmg(3, 5), pm(-1, 1)] });

// ===== Korvath, le boss de pleine nature =====
DATA.spells.m_roulement = S('m_roulement', { name: 'Roulement', element: 'terre', pa: 4, range: [1, 4], line: true, target: 'any', aoe: line3, affects: 'enemies', effects: [dmg(10, 13), push(2)] });
DATA.spells.m_eboulement = S('m_eboulement', { name: 'Éboulement', element: 'terre', pa: 3, range: [1, 3], los: false, target: 'any', aoe: circle1, effects: [{ type: 'obstacle', kind: 'rock', turns: 2 }], cooldown: 2 });

// ===== Déclencheurs partagés =====
// Un Kavou se gave quand on le frappe de sa propre couleur : soin de 15 % de ses PV.
const gave = e => [{ when: 'hitByElement', element: e, do: [{ act: 'heal', pct: 15 }] }];
// Le Thelk : le feu le cuit (+50 % de dégâts subis pendant deux tours), l'eau le soigne (15 %).
const thelkTriggers = [{ when: 'hitByElement', element: 'feu', do: [{ act: 'buff', effects: [{ type: 'vuln', value: 50, turns: 2 }] }, { act: 'log', text: 'Le Thelk cuit et craque.' }] }, { when: 'hitByElement', element: 'eau', do: [{ act: 'heal', pct: 15 }] }];

// ===== Les paliers, Orsane =====
// Glym
DATA.monsters.piouk = M('piouk', { name: 'Glymet', region: 'orsane', level: '1 à 3', shape: 'diamond', color: '#c8ecff', hp: 28, dmgMult: 1.0, pa: 6, pm: 3, initiative: 95, spells: ['m_picot'], ai: 'ranged', desc: 'Nichée du Glym. Vole 1 PM de tout près.' });
DATA.monsters.pilou_defait = M('pilou_defait', { name: 'Glym Défait', region: 'orsane', level: '12 à 18', shape: 'diamond', color: '#6a3a8a', hp: 59, dmgMult: 0.5, pa: 6, pm: 5, initiative: 115, resist: { air: 20 }, spells: ['m_bec_defait'], ai: 'ranged', desc: 'Glym déchiré. Garde le PM volé.' });
// Grouk
DATA.monsters.groukin = M('groukin', { name: 'Groukin', region: 'orsane', level: '1 à 4', shape: 'triangle', color: '#d4b07a', hp: 42, dmgMult: 1.7, pa: 6, pm: 3, initiative: 55, spells: ['m_charge_folle'], ai: 'melee', desc: 'Nichée du Grouk. Pousse de deux cases.' });
DATA.monsters.grouk_cornu = M('grouk_cornu', { name: 'Grouk Cornu', region: 'orsane', level: '10 à 16', shape: 'triangle', color: '#e8d5a0', hp: 54, dmgMult: 0.85, pa: 6, pm: 3, initiative: 65, resist: { terre: 15 }, spells: ['m_charge', 'm_coup_corne'], ai: 'melee',
  triggers: [{ when: 'hpBelow', pct: 50, do: [{ act: 'buff', effects: [power(30, 99)] }] }], desc: "Grouk tissé. Encorne, s'énerve à moitié vie." });
// Tissefil
DATA.monsters.filin = M('filin', { name: 'Filin', region: 'orsane', level: '3 à 7', shape: 'hex', color: '#e6e6e6', hp: 32, dmgMult: 1.35, pa: 6, pm: 2, initiative: 75, spells: ['m_toile_fine'], ai: 'ranged', desc: 'Nichée du Tissefil. Ralentit sans enraciner.' });
DATA.monsters.tissefil_ancien = M('tissefil_ancien', { name: 'Tissefil Ancien', region: 'orsane', level: '12 à 18', shape: 'hex', color: '#f0e6c8', hp: 52, dmgMult: 1.1, pa: 6, pm: 2, initiative: 85, spells: ['m_toile', 'm_fil_tendu', 'm_crocs'], ai: 'ranged', desc: 'Tissefil tissé. Tend des fils invisibles.' });
// Veilloche
DATA.monsters.loche = M('loche', { name: 'Loche', region: 'orsane', level: '6 à 10', shape: 'circle', color: '#ffe6a0', hp: 38, dmgMult: 1.6, pa: 6, pm: 2, initiative: 70, resist: { eau: -100 }, spells: ['m_etincelle'], ai: 'ranged', desc: 'Nichée de la Veilloche. Suit, sans soigner.' });
// Le Glouton du Puits : la bête de la Halte, que la quête « Dans la gueule du Glouton » fait
// affronter seul (docs/QUETES-INCARNAM.md, l'équivalent du Milimilou d'Incarnam).
DATA.monsters.glouton = M('glouton', { name: 'Glouton du Puits', region: 'orsane', level: '7 à 9', shape: 'circle', color: '#6b5a7a', hp: 70, dmgMult: 1.3, pa: 6, pm: 3, initiative: 50, resist: { terre: 10 }, spells: ['m_charge'], ai: 'melee', desc: 'Bête du vieux puits de la Halte. Avale tout ce qui brille, et charge ce qui ne brille pas.' });
DATA.monsters.veilloche_tissee = M('veilloche_tissee', { name: 'Veilloche Tissée', region: 'orsane', level: '14 à 20', shape: 'circle', color: '#fff4c2', hp: 42, dmgMult: 1.7, pa: 6, pm: 2, initiative: 75, resist: { eau: -100, feu: 30 }, spells: ['m_lueur', 'm_voile_lueur', 'm_etincelle'], ai: 'support',
  triggers: [{ when: 'hpBelow', pct: 50, do: [{ act: 'buff', effects: [pa(1, 99)] }] }], desc: "Veilloche tissée. Soigne, protège, s'accélère." });
// Brimbe
DATA.monsters.brim = M('brim', { name: 'Brim', region: 'orsane', level: '8 à 12', shape: 'square', color: '#c4c4c4', hp: 49, dmgMult: 0.6, pa: 6, pm: 3, initiative: 85, spells: ['m_caillou'], ai: 'ranged', desc: 'Nichée de la Brimbe. Lance et recule.' });
DATA.monsters.brimbe_fendue = M('brimbe_fendue', { name: 'Brimbe Fendue', region: 'orsane', level: '18 à 24', shape: 'square', color: '#4a2a5a', hp: 38, dmgMult: 1.65, pa: 6, pm: 3, initiative: 90, resist: { terre: 20 }, spells: ['m_galet', 'm_eclat_pierre'], ai: 'ranged',
  triggers: [{ when: 'death', do: [{ act: 'explode', min: 6, max: 9, element: 'terre', radius: 1 }] }], desc: 'Brimbe déchirée. Éclate en mourant.' });

// ===== Les paliers, Kaldum =====
// Molh
DATA.monsters.molhin = M('molhin', { name: 'Molhin', region: 'kaldum', level: '10 à 22', shape: 'square', color: '#aab2c2', hp: 50, dmgMult: 1.7, pa: 4, pm: 3, initiative: 15, resist: { terre: 20, feu: -20 }, spells: ['m_caillasse'], ai: 'melee', desc: 'Nichée du Molh. Lent, dur, fuyable.' });
DATA.monsters.molh_ancien = M('molh_ancien', { name: 'Molh Ancien', region: 'kaldum', level: '20 à 30', shape: 'square', color: '#e8e0cc', hp: 105, dmgMult: 1.7, pa: 4, pm: 3, initiative: 20, resist: { terre: 30, feu: -20 }, spells: ['m_ecrasement', 'm_tremblement'], ai: 'melee',
  triggers: [{ when: 'turnStart', do: [{ act: 'rotateImmunity', elements: ['terre', 'feu'] }] }], desc: 'Molh tissé. Immunité terre puis feu, un tour sur deux.' });
// Rakthul (id kaldrik)
DATA.monsters.scorik = M('scorik', { name: 'Scorik', region: 'kaldum', level: '12 à 24', shape: 'square', color: '#9a7a5a', hp: 77, dmgMult: 1.3, pa: 6, pm: 3, initiative: 50, resist: { feu: -20 }, spells: ['m_coup_scorie'], ai: 'melee',
  triggers: [{ when: 'hitByElement', element: 'feu', do: [{ act: 'buff', effects: [pm(-1, 1)] }] }], desc: 'Nichée du Rakthul. Fond au feu.' });
DATA.monsters.kaldrik_trempe = M('kaldrik_trempe', { name: 'Rakthul Trempé', region: 'kaldum', level: '20 à 30', shape: 'square', color: '#7a8aa0', hp: 109, dmgMult: 1.7, pa: 6, pm: 3, initiative: 55, resist: { feu: 20 }, spells: ['m_poing', 'm_enclume'], ai: 'melee',
  triggers: [{ when: 'hitByElement', element: 'eau', do: [{ act: 'buff', effects: [pm(-1, 1)] }] }], desc: "Rakthul tissé. L'eau le fige." });
// Fumerolle
DATA.monsters.fumil = M('fumil', { name: 'Fumil', region: 'kaldum', level: '14 à 26', shape: 'circle', color: '#e6e6f0', hp: 50, dmgMult: 1.7, pa: 6, pm: 3, initiative: 90, resist: { feu: 30, air: -30 }, spells: ['m_souffle'], ai: 'ranged', desc: 'Nichée de la Fumerolle. Reste visible.' });
DATA.monsters.fumerolle_noire = M('fumerolle_noire', { name: 'Fumerolle Noire', region: 'kaldum', level: '20 à 30', shape: 'circle', color: '#3a2a4a', hp: 57, dmgMult: 0.8, pa: 6, pm: 3, initiative: 100, resist: { feu: 30, air: -30 }, spells: ['m_bouffee', 'm_etouffement'], ai: 'ranged',
  triggers: [{ when: 'turnStart', do: [{ act: 'toggleState', name: 'invisible' }] }, { when: 'death', do: [{ act: 'explode', min: 10, max: 14, element: 'feu', radius: 1 }] }], desc: 'Fumerolle déchirée. Étouffe, disparaît, éclate.' });
// Pioche-Vive
DATA.monsters.clou_vif = M('clou_vif', { name: 'Clou-Vif', region: 'kaldum', level: '12 à 24', shape: 'diamond', color: '#cfcfcf', hp: 45, dmgMult: 0.85, pa: 6, pm: 2, initiative: 60, spells: ['m_clou'], ai: 'ranged', desc: 'Nichée de la Pioche-Vive. Pique en ligne.' });
DATA.monsters.masse_vive = M('masse_vive', { name: 'Masse-Vive', region: 'kaldum', level: '20 à 30', shape: 'diamond', color: '#e8dcb0', hp: 64, dmgMult: 1.45, pa: 6, pm: 2, initiative: 60, resist: { terre: 10 }, spells: ['m_pic', 'm_masse'], ai: 'melee',
  triggers: [{ when: 'hpBelow', pct: 50, do: [{ act: 'buff', effects: [power(20, 99)] }] }], desc: 'Pioche-Vive tissée. Cogne au contact.' });
// Cendrou
DATA.monsters.cendril = M('cendril', { name: 'Cendril', region: 'kaldum', level: '16 à 27', shape: 'hex', color: '#ffb36a', hp: 64, dmgMult: 1.6, pa: 6, pm: 3, initiative: 70, resist: { feu: 30 }, spells: ['m_etincelle'], ai: 'melee',
  triggers: [{ when: 'death', do: [{ act: 'explode', min: 6, max: 9, element: 'feu', radius: 1 }] }], desc: 'Nichée du Cendrou. Une braise qui a grandi.' });

// ===== Kavou, la famille à couleurs (Orsane, 4 à 16) =====
DATA.monsters.kavou_bleu = M('kavou_bleu', { name: 'Kavou Bleu', region: 'orsane', level: '4 à 12', shape: 'circle', color: '#4fb3ff', hp: 29, dmgMult: 0.9, pa: 6, pm: 3, initiative: 85, resist: { eau: 50, feu: -30 }, spells: ['m_soupir_eau'], ai: 'melee', triggers: gave('eau'), desc: "Né sous le Voile bleu. Se gave d'eau." });
DATA.monsters.kavou_roux = M('kavou_roux', { name: 'Kavou Roux', region: 'orsane', level: '4 à 12', shape: 'circle', color: '#ff7a45', hp: 29, dmgMult: 0.9, pa: 6, pm: 3, initiative: 85, resist: { feu: 50, eau: -30 }, spells: ['m_soupir_feu'], ai: 'melee', triggers: gave('feu'), desc: 'Né sous le Voile roux. Se gave de feu.' });
DATA.monsters.kavou_ocre = M('kavou_ocre', { name: 'Kavou Ocre', region: 'orsane', level: '4 à 12', shape: 'circle', color: '#c9a35c', hp: 29, dmgMult: 0.9, pa: 6, pm: 3, initiative: 85, resist: { terre: 50, air: -30 }, spells: ['m_soupir_terre'], ai: 'melee', triggers: gave('terre'), desc: 'Né sous le Voile ocre. Se gave de terre.' });
DATA.monsters.kavou_blanc = M('kavou_blanc', { name: 'Kavou Blanc', region: 'orsane', level: '4 à 12', shape: 'circle', color: '#f2f2f2', hp: 29, dmgMult: 0.9, pa: 6, pm: 3, initiative: 85, resist: { air: 50, terre: -30 }, spells: ['m_soupir_air'], ai: 'melee', triggers: gave('air'), desc: "Né sous le Voile blanc. Se gave d'air." });
DATA.monsters.kavou_pourpre = M('kavou_pourpre', { name: 'Kavou Pourpre', region: 'orsane', level: '12 à 16', shape: 'circle', color: '#5a2a6a', hp: 98, dmgMult: 1.45, pa: 6, pm: 4, initiative: 95, resist: { neutre: 30 }, spells: ['m_soupir_pourpre'], ai: 'melee', triggers: gave('neutre'), desc: 'Kavou défait. Se gave de neutre, vole 1 PA.' });

// ===== Thelk, la famille énigme (les Boues chaudes, 10 à 30) =====
DATA.monsters.glek = M('glek', { name: 'Glek', region: 'kaldum', level: '10 à 16', shape: 'hex', color: '#b89a6a', hp: 52, dmgMult: 1.7, pa: 6, pm: 2, initiative: 40, spells: ['m_giclee'], ai: 'melee', triggers: thelkTriggers, desc: "Nichée du Thelk. L'eau le soigne, le feu le cuit." });
DATA.monsters.thelk = M('thelk', { name: 'Thelk', region: 'kaldum', level: '12 à 24', shape: 'hex', color: '#8a6a3a', hp: 87, dmgMult: 1.05, pa: 6, pm: 2, initiative: 35, resist: { terre: 30 }, spells: ['m_boue'], ai: 'melee', triggers: thelkTriggers, desc: "Glaise vivante. Feu d'abord, jamais d'eau." });
DATA.monsters.thelk_ancien = M('thelk_ancien', { name: 'Thelk Ancien', region: 'kaldum', level: '20 à 30', shape: 'hex', color: '#5a4a2a', hp: 98, dmgMult: 1.65, pa: 6, pm: 2, initiative: 30, resist: { terre: 30 }, spells: ['m_boue', 'm_coulee'], ai: 'melee',
  triggers: [...thelkTriggers, { when: 'hpBelow', pct: 50, do: [{ act: 'summon', monster: 'glek', count: 2 }] }], desc: "Vieille glaise. S'effrite en deux Gleks." });

// ===== Tholou, la famille mignonne de Kaldum (12 à 30) =====
DATA.monsters.tholi = M('tholi', { name: 'Tholi', region: 'kaldum', level: '12 à 20', shape: 'circle', color: '#ffc9a0', hp: 33, dmgMult: 1.65, pa: 6, pm: 1, initiative: 50, resist: { feu: 30 }, spells: ['m_ronron', 'm_etincelle'], ai: 'support', desc: 'Nichée du Tholou. Ronronne, soigne, bouge peu.' });
DATA.monsters.tholou = M('tholou', { name: 'Tholou', region: 'kaldum', level: '16 à 26', shape: 'circle', color: '#ff9a6a', hp: 41, dmgMult: 1.7, pa: 6, pm: 1, initiative: 50, resist: { feu: 30 }, spells: ['m_ronron', 'm_chaleur', 'm_etincelle'], ai: 'support', desc: 'Chauffe-pieds vivant. Soigne et donne des PA.' });
DATA.monsters.tholou_tisse = M('tholou_tisse', { name: 'Tholou Tissé', region: 'kaldum', level: '20 à 30', shape: 'circle', color: '#ffe0b0', hp: 56, dmgMult: 1.7, pa: 6, pm: 1, initiative: 55, resist: { feu: 30 }, spells: ['m_ronron', 'm_chaleur', 'm_manteau_cendre', 'm_etincelle'], ai: 'support', desc: 'Tholou tissé. Soigne, accélère, protège.' });

// ===== Oreth, le monstre rare (les hauts d'Orsane, 10 à 14) =====
// `rare: true` sert au placement des groupes, pas au combat. L'IA « fuyard » n'existe pas encore :
// un tireur à 6 PM fait l'affaire.
DATA.monsters.oreth = M('oreth', { name: 'Oreth', region: 'orsane', level: '10 à 14', rare: true, shape: 'diamond', color: '#fff8d0', hp: 40, pa: 6, pm: 6, initiative: 140, resist: { air: 30, neutre: 30 }, spells: ['m_frolement'], ai: 'ranged',
  triggers: [{ when: 'turnStart', do: [{ act: 'toggleState', name: 'invisible' }] }], desc: 'Fil perdu du premier Voile. Fuit, disparaît.' });

// ===== Korvath, le boss de pleine nature (le Col, 22 à 28) =====
// Le validateur de contenu n'admet un boss qu'en donjon ; Korvath vit sur une carte de pleine
// nature. Il est donc un monstre d'élite sans drapeau boss, avec les 400 PV du document.
DATA.monsters.korvath = M('korvath', { name: 'Korvath', region: 'kaldum', level: '22 à 28', elite: true, shape: 'square', color: '#6a5a4a', hp: 400, pa: 6, pm: 2, initiative: 45, resist: { terre: 40, air: -20 }, spells: ['m_roulement', 'm_eboulement', 'm_ecrasement'], ai: 'melee',
  triggers: [{ when: 'hpBelow', pct: 70, do: [{ act: 'summon', monster: 'brimbe', count: 2 }, { act: 'log', text: "Korvath s'effrite." }] }, { when: 'hpBelow', pct: 35, do: [{ act: 'summon', monster: 'brimbe_fendue', count: 2 }, { act: 'buff', effects: [power(30, 99)] }] }, { when: 'death', do: [{ act: 'explode', min: 14, max: 18, element: 'terre', radius: 2 }] }],
  desc: "Élite de pleine nature. Roule, emmure, lâche des Brimbes, s'effondre." });

// ===== Rencontres de laboratoire (lab.html, tests/smoke.js) =====
DATA.encounters.push(
  { id: 'nichee', region: 'orsane', name: 'Nichée des Cimes', monsters: ['piouk', 'piouk', 'groukin'] },
  { id: 'kavous', region: 'orsane', name: 'Bande de Kavous', monsters: ['kavou_bleu', 'kavou_roux', 'kavou_ocre', 'kavou_blanc'] },
  { id: 'fils_tendus', region: 'orsane', name: 'Fils tendus', monsters: ['tissefil_ancien', 'veilloche_tissee', 'grouk_cornu'] },
  { id: 'hauts', region: 'orsane', name: "Les Hauts d'Orsane (Oreth)", monsters: ['oreth', 'pilou_defait', 'kavou_pourpre'] },
  { id: 'boues', region: 'kaldum', name: 'Les Boues chaudes', monsters: ['thelk', 'glek', 'glek'] },
  { id: 'cendres', region: 'kaldum', name: 'Cendres tièdes', monsters: ['tholou', 'tholou_tisse', 'cendril'] },
  { id: 'vieille_glaise', region: 'kaldum', name: 'Vieille glaise', monsters: ['thelk_ancien', 'molh_ancien', 'fumerolle_noire'] },
  { id: 'col', region: 'kaldum', name: 'Le Col (Korvath)', monsters: ['korvath'] },
);

})();
