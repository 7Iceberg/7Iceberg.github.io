(() => {

DATA.spells.m_picot = S('m_picot', { name: 'Picot', element: 'air', pa: 3, range: [1, 2], target: 'enemy', effects: [dmg(2, 4), pm(-1, 1)] });
DATA.spells.m_bec_defait = S('m_bec_defait', { name: 'Bec défait', element: 'air', pa: 3, range: [1, 3], target: 'enemy', effects: [dmg(7, 10), pm(-1, 1)], selfEffects: [{ type: 'pmNow', value: 1 }] });
DATA.spells.m_charge_folle = S('m_charge_folle', { name: 'Charge folle', element: 'terre', pa: 3, range: [1, 1], target: 'enemy', effects: [dmg(3, 5), push(2)] });
DATA.spells.m_coup_corne = S('m_coup_corne', { name: 'Coup de corne', element: 'terre', pa: 3, range: [1, 1], target: 'enemy', effects: [dmg(9, 12)], cooldown: 1 });
DATA.spells.m_toile_fine = S('m_toile_fine', { name: 'Toile fine', element: 'neutre', pa: 3, range: [1, 3], target: 'enemy', effects: [dmg(2, 3), pm(-1, 1)] });
DATA.spells.m_fil_tendu = S('m_fil_tendu', { name: 'Fil tendu', element: 'neutre', pa: 2, range: [1, 4], target: 'free', effects: [{ type: 'trap', name: 'Fil tendu', effects: [dmg(4, 6), root] }], cooldown: 2 });
DATA.spells.m_voile_lueur = S('m_voile_lueur', { name: 'Halo de lueur', element: 'neutre', pa: 3, range: [0, 4], target: 'ally', aoe: cross1, affects: 'allies', affectsCaster: true, effects: [shield(12, 2)], cooldown: 2 });
DATA.spells.m_caillou = S('m_caillou', { name: 'Caillou', element: 'terre', pa: 3, range: [2, 4], target: 'enemy', effects: [dmg(4, 6)] });
DATA.spells.m_eclat_pierre = S('m_eclat_pierre', { name: 'Éclat de pierre', element: 'terre', pa: 4, range: [2, 5], target: 'enemy', aoe: cross1, affects: 'enemies', effects: [dmg(7, 10)], cooldown: 1 });

DATA.spells.m_caillasse = S('m_caillasse', { name: 'Caillasse', element: 'terre', pa: 4, range: [1, 1], target: 'enemy', effects: [dmg(9, 12)] });
DATA.spells.m_tremblement = S('m_tremblement', { name: 'Tremblement', element: 'terre', pa: 3, range: [0, 0], los: false, target: 'self', aoe: circle1, affects: 'enemies', effects: [dmg(8, 10), pm(-1, 1)], cooldown: 2 });
DATA.spells.m_coup_scorie = S('m_coup_scorie', { name: 'Coup de scorie', element: 'terre', pa: 3, range: [1, 1], target: 'enemy', effects: [dmg(7, 9)] });
DATA.spells.m_enclume = S('m_enclume', { name: 'Enclume', element: 'terre', pa: 4, range: [1, 1], target: 'enemy', effects: [dmg(12, 15), push(1)], cooldown: 1 });
DATA.spells.m_souffle = S('m_souffle', { name: 'Souffle', element: 'feu', pa: 3, range: [1, 3], los: false, target: 'any', aoe: cross1, affects: 'enemies', effects: [dmg(3, 5)] });
DATA.spells.m_etouffement = S('m_etouffement', { name: 'Étouffement', element: 'feu', pa: 3, range: [1, 3], target: 'enemy', effects: [dmg(6, 8), pa(-1, 1)] });
DATA.spells.m_clou = S('m_clou', { name: 'Clou', element: 'terre', pa: 3, range: [1, 3], line: true, target: 'enemy', effects: [dmg(5, 7)] });
DATA.spells.m_masse = S('m_masse', { name: 'Masse', element: 'terre', pa: 4, range: [1, 1], target: 'enemy', effects: [dmg(12, 15), push(1)], cooldown: 1 });

DATA.spells.m_soupir_eau = S('m_soupir_eau', { name: 'Soupir de brume', element: 'eau', pa: 3, range: [1, 3], target: 'enemy', effects: [dmg(5, 7)] });
DATA.spells.m_soupir_feu = S('m_soupir_feu', { name: 'Soupir de braise', element: 'feu', pa: 3, range: [1, 3], target: 'enemy', effects: [dmg(5, 7)] });
DATA.spells.m_soupir_terre = S('m_soupir_terre', { name: 'Soupir de mousse', element: 'terre', pa: 3, range: [1, 3], target: 'enemy', effects: [dmg(5, 7)] });
DATA.spells.m_soupir_air = S('m_soupir_air', { name: 'Soupir de vent', element: 'air', pa: 3, range: [1, 3], target: 'enemy', effects: [dmg(5, 7)] });
DATA.spells.m_soupir_pourpre = S('m_soupir_pourpre', { name: 'Soupir ancien', element: 'neutre', pa: 3, range: [1, 3], target: 'enemy', effects: [dmg(7, 9), pa(-1, 1)], maxPerTurn: 1 });

DATA.spells.m_giclee = S('m_giclee', { name: 'Giclée', element: 'terre', pa: 3, range: [1, 2], target: 'enemy', effects: [dmg(4, 6)] });
DATA.spells.m_boue = S('m_boue', { name: 'Boue', element: 'terre', pa: 3, range: [1, 2], target: 'enemy', effects: [dmg(8, 11), pm(-1, 1)] });
DATA.spells.m_coulee = S('m_coulee', { name: 'Coulée', element: 'terre', pa: 4, range: [1, 3], line: true, target: 'any', aoe: line3, affects: 'enemies', effects: [dmg(9, 12)], cooldown: 1 });

DATA.spells.m_ronron = S('m_ronron', { name: 'Ronron', element: 'neutre', pa: 3, range: [0, 3], target: 'ally', aoe: cross1, affects: 'allies', affectsCaster: true, effects: [heal(8, 11)], maxPerTurn: 1 });
DATA.spells.m_chaleur = S('m_chaleur', { name: 'Chaleur', element: 'feu', pa: 2, range: [0, 3], target: 'ally', aoe: cross1, affects: 'allies', affectsCaster: true, effects: [pa(1, 1)], cooldown: 1 });
DATA.spells.m_manteau_cendre = S('m_manteau_cendre', { name: 'Manteau de cendre', element: 'neutre', pa: 3, range: [0, 3], target: 'ally', aoe: cross1, affects: 'allies', affectsCaster: true, effects: [shield(12, 2)], cooldown: 2 });

DATA.spells.m_frolement = S('m_frolement', { name: 'Frôlement', element: 'air', pa: 3, range: [2, 6], target: 'enemy', effects: [dmg(3, 5), pm(-1, 1)] });

DATA.spells.m_roulement = S('m_roulement', { name: 'Roulement', element: 'terre', pa: 4, range: [1, 4], line: true, target: 'any', aoe: line3, affects: 'enemies', effects: [dmg(10, 13), push(2)] });
DATA.spells.m_eboulement = S('m_eboulement', { name: 'Éboulement', element: 'terre', pa: 3, range: [1, 3], los: false, target: 'any', aoe: circle1, effects: [{ type: 'obstacle', kind: 'rock', turns: 2 }], cooldown: 2 });

const gave = e => [{ when: 'hitByElement', element: e, do: [{ act: 'heal', pct: 15 }] }];
const thelkTriggers = [{ when: 'hitByElement', element: 'feu', do: [{ act: 'buff', effects: [{ type: 'vuln', value: 50, turns: 2 }] }, { act: 'log', text: 'Le Thelk cuit et craque.' }] }, { when: 'hitByElement', element: 'eau', do: [{ act: 'heal', pct: 15 }] }];

DATA.monsters.mannequin = M('mannequin', { name: 'Mannequin du Dojo', region: 'dojo', level: 'au tien', shape: 'square', color: '#d8c27a', hp: 70, dmgMult: 0, pa: 0, pm: 0, initiative: 1, spells: [], ai: 'inert', entrainement: true,
  desc: 'De la paille serrée sur un poteau. Il ne rend pas les coups.' });
for (const [cid, c] of Object.entries(DATA.classes)) {
  const purs = (c.spells || []).filter(s => { const d = DATA.spells[s]; return d && d.target === 'enemy' && (d.effects || []).length && d.effects.every(e => e.type === 'damage'); });
  const sorts = purs.slice(0, 2);
  if (!sorts.length && c.spells && c.spells[0]) sorts.push(c.spells[0]);
  const loin = sorts.some(s => (DATA.spells[s].range || [1, 1])[1] >= 3);
  DATA.monsters['reflet_' + cid] = M('reflet_' + cid, { name: 'Reflet de ' + c.name, region: 'dojo', level: '1 à 30', shape: 'player', classId: cid, glyph: c.glyph, color: c.color, gender: 'm',
    hp: Math.round((c.hp || 90) * 1.25), dmgMult: 1.0, pa: 6, pm: 3, initiative: c.initiative || 100, resist: Object.assign({}, c.resist || {}), spells: sorts, ai: loin ? 'ranged' : 'melee', epreuve: true,
    desc: `Ton propre geste, renvoyé par le miroir de la cour : la Voie ${c.title}, telle que le Temple la garde.` });
}
DATA.spells.m_baton_du_dojo = S('m_baton_du_dojo', { name: 'Bâton de bois', element: 'neutre', pa: 3, range: [1, 1], target: 'enemy', effects: [dmg(6, 9)] });
DATA.spells.m_balayage = S('m_balayage', { name: 'Balayage', element: 'neutre', pa: 4, range: [1, 2], target: 'enemy', effects: [dmg(9, 13), pm(-1, 1)] });
DATA.monsters.eleve_du_dojo = M('eleve_du_dojo', { name: 'Élève du Dojo', region: 'dojo', level: '1 à 30', shape: 'square', color: '#c9a66b', hp: 32, dmgMult: 0.9, pa: 6, pm: 3, initiative: 80, spells: ['m_baton_du_dojo'], ai: 'melee', epreuve: true,
  desc: 'Un élève de Saya, bâton de bois en main. Il frappe pour de vrai.' });
DATA.monsters.maitre_d_armes = M('maitre_d_armes', { name: 'Maître d\'armes du Dojo', region: 'dojo', level: '1 à 30', shape: 'square', color: '#e2c690', hp: 80, dmgMult: 1.3, pa: 7, pm: 3, initiative: 110, resist: { neutre: 15 }, spells: ['m_baton_du_dojo', 'm_balayage'], ai: 'melee', epreuve: true,
  desc: 'Le bras droit de Saya. Son balayage retire 1 PM.' });
DATA.monsters.brask = M('brask', { name: 'Brask Corne-Lasse', region: 'avis', recherche: true, level: '3 à 20', shape: 'triangle', color: '#7a5a2a', hp: 80, dmgMult: 1.25, pa: 6, pm: 3, initiative: 62, resist: { terre: 20 }, spells: ['m_charge'], ai: 'melee',
  desc: 'Un vieux Grouk qui a pris les Clairières pour son pré. Il charge les charrettes, et les fermiers avec.' });
DATA.monsters.meche_folle = M('meche_folle', { name: 'Mèche-Folle', region: 'avis', recherche: true, level: '6 à 10', shape: 'circle', color: '#ff9a3c', hp: 80, dmgMult: 1.7, pa: 6, pm: 3, initiative: 78, resist: { eau: -50, feu: 25 }, spells: ['m_etincelle'], ai: 'ranged',
  desc: 'Une Loche qui a goûté à l\'huile des lanternes. Elle met le feu aux ponts de corde des Sentiers.' });
DATA.monsters.nouette = M('nouette', { name: 'La Vieille Nouette', region: 'avis', recherche: true, level: '12 à 18', shape: 'hex', color: '#d8cfa8', hp: 110, dmgMult: 1.2, pa: 6, pm: 2, initiative: 88, spells: ['m_toile', 'm_fil_tendu', 'm_crocs'], ai: 'ranged',
  desc: 'La plus vieille fileuse des Toiles. Elle noue les sentiers sur eux-mêmes pour que les Veilleurs tournent en rond.' });
DATA.monsters.gravas = M('gravas', { name: 'Gravas', region: 'avis', recherche: true, level: '10 à 20', shape: 'square', color: '#6e6e78', hp: 100, dmgMult: 0.65, pa: 6, pm: 3, initiative: 92, resist: { terre: 25, neutre: 10 }, spells: ['m_galet'], ai: 'ranged',
  desc: 'Une Brimbe grosse comme un rocher, qui lance des rochers. Elle a fermé deux fois la route de Kaldum.' });
DATA.monsters.piouk = M('piouk', { name: 'Glymet', region: 'orsane', level: '1 à 3', shape: 'diamond', color: '#c8ecff', hp: 28, dmgMult: 1.0, pa: 6, pm: 3, initiative: 95, spells: ['m_picot'], ai: 'ranged', desc: 'Nichée du Glym. Vole 1 PM de tout près.' });
DATA.monsters.pilou_defait = M('pilou_defait', { name: 'Glym Défait', region: 'orsane', level: '12 à 18', shape: 'diamond', color: '#6a3a8a', hp: 59, dmgMult: 0.5, pa: 6, pm: 5, initiative: 115, resist: { air: 20 }, spells: ['m_bec_defait'], ai: 'ranged', desc: 'Glym brûlé. Garde le PM volé.' });
DATA.monsters.groukin = M('groukin', { name: 'Groukin', region: 'orsane', level: '1 à 4', shape: 'triangle', color: '#d4b07a', hp: 42, dmgMult: 1.7, pa: 6, pm: 3, initiative: 55, spells: ['m_charge_folle'], ai: 'melee', desc: 'Nichée du Grouk. Pousse de deux cases.' });
DATA.monsters.grouk_cornu = M('grouk_cornu', { name: 'Grouk Cornu', region: 'orsane', level: '10 à 16', shape: 'triangle', color: '#e8d5a0', hp: 54, dmgMult: 0.85, pa: 6, pm: 3, initiative: 65, resist: { terre: 15 }, spells: ['m_charge', 'm_coup_corne'], ai: 'melee',
  triggers: [{ when: 'hpBelow', pct: 50, do: [{ act: 'buff', effects: [power(30, 99)] }] }], desc: "Grouk tissé. Encorne, s'énerve à moitié vie." });
DATA.monsters.filin = M('filin', { name: 'Filin', region: 'orsane', level: '3 à 7', shape: 'hex', color: '#e6e6e6', hp: 32, dmgMult: 1.35, pa: 6, pm: 2, initiative: 75, spells: ['m_toile_fine'], ai: 'ranged', desc: 'Nichée du Tissefil. Ralentit sans enraciner.' });
DATA.monsters.tissefil_ancien = M('tissefil_ancien', { name: 'Tissefil Ancien', region: 'orsane', level: '12 à 18', shape: 'hex', color: '#f0e6c8', hp: 52, dmgMult: 1.1, pa: 6, pm: 2, initiative: 85, spells: ['m_toile', 'm_fil_tendu', 'm_crocs'], ai: 'ranged', desc: 'Tissefil tissé. Tend des fils invisibles.' });
DATA.monsters.loche = M('loche', { name: 'Loche', region: 'orsane', level: '6 à 10', shape: 'circle', color: '#ffe6a0', hp: 38, dmgMult: 1.6, pa: 6, pm: 2, initiative: 70, resist: { eau: -100 }, spells: ['m_etincelle'], ai: 'ranged', desc: 'Nichée de la Veilloche. Suit, sans soigner.' });
DATA.monsters.glouton = M('glouton', { name: 'Glouton du Puits', region: 'orsane', level: '7 à 9', shape: 'circle', color: '#6b5a7a', hp: 70, dmgMult: 1.3, pa: 6, pm: 3, initiative: 50, resist: { terre: 10 }, spells: ['m_charge'], ai: 'melee', desc: 'Bête du vieux puits de la Halte. Avale tout ce qui brille, et charge ce qui ne brille pas.' });
DATA.monsters.veilloche_tissee = M('veilloche_tissee', { name: 'Veilloche Tissée', region: 'orsane', level: '14 à 20', shape: 'circle', color: '#fff4c2', hp: 42, dmgMult: 1.7, pa: 6, pm: 2, initiative: 75, resist: { eau: -100, feu: 30 }, spells: ['m_lueur', 'm_voile_lueur', 'm_etincelle'], ai: 'support',
  triggers: [{ when: 'hpBelow', pct: 50, do: [{ act: 'buff', effects: [pa(1, 99)] }] }], desc: "Veilloche tissée. Soigne, protège, s'accélère." });
DATA.monsters.brim = M('brim', { name: 'Brim', region: 'orsane', level: '8 à 12', shape: 'square', color: '#c4c4c4', hp: 49, dmgMult: 0.6, pa: 6, pm: 3, initiative: 85, spells: ['m_caillou'], ai: 'ranged', desc: 'Nichée de la Brimbe. Lance et recule.' });
DATA.monsters.brimbe_fendue = M('brimbe_fendue', { name: 'Brimbe Fendue', region: 'orsane', level: '18 à 24', shape: 'square', color: '#4a2a5a', hp: 38, dmgMult: 1.65, pa: 6, pm: 3, initiative: 90, resist: { terre: 20 }, spells: ['m_galet', 'm_eclat_pierre'], ai: 'ranged',
  triggers: [{ when: 'death', do: [{ act: 'explode', min: 6, max: 9, element: 'terre', radius: 1 }] }], desc: 'Brimbe brûlée. Éclate en mourant.' });

DATA.monsters.molhin = M('molhin', { name: 'Molhin', region: 'kaldum', level: '10 à 22', shape: 'square', color: '#aab2c2', hp: 50, dmgMult: 1.7, pa: 4, pm: 3, initiative: 15, resist: { terre: 20, feu: -20 }, spells: ['m_caillasse'], ai: 'melee', desc: 'Nichée du Molh. Lent, dur, fuyable.' });
DATA.monsters.molh_ancien = M('molh_ancien', { name: 'Molh Ancien', region: 'kaldum', level: '20 à 30', shape: 'square', color: '#e8e0cc', hp: 105, dmgMult: 1.7, pa: 4, pm: 3, initiative: 20, resist: { terre: 30, feu: -20 }, spells: ['m_ecrasement', 'm_tremblement'], ai: 'melee',
  triggers: [{ when: 'turnStart', do: [{ act: 'rotateImmunity', elements: ['terre', 'feu'] }] }], desc: 'Molh tissé. Immunité terre puis feu, un tour sur deux.' });
DATA.monsters.scorik = M('scorik', { name: 'Scorik', region: 'kaldum', level: '12 à 24', shape: 'square', color: '#9a7a5a', hp: 77, dmgMult: 1.3, pa: 6, pm: 3, initiative: 50, resist: { feu: -20 }, spells: ['m_coup_scorie'], ai: 'melee',
  triggers: [{ when: 'hitByElement', element: 'feu', do: [{ act: 'buff', effects: [pm(-1, 1)] }] }], desc: 'Nichée du Rakthul. Fond au feu.' });
DATA.monsters.kaldrik_trempe = M('kaldrik_trempe', { name: 'Rakthul Trempé', region: 'kaldum', level: '20 à 30', shape: 'square', color: '#7a8aa0', hp: 109, dmgMult: 1.7, pa: 6, pm: 3, initiative: 55, resist: { feu: 20 }, spells: ['m_poing', 'm_enclume'], ai: 'melee',
  triggers: [{ when: 'hitByElement', element: 'eau', do: [{ act: 'buff', effects: [pm(-1, 1)] }] }], desc: "Rakthul tissé. L'eau le fige." });
DATA.monsters.fumil = M('fumil', { name: 'Fumil', region: 'kaldum', level: '14 à 26', shape: 'circle', color: '#e6e6f0', hp: 50, dmgMult: 1.7, pa: 6, pm: 3, initiative: 90, resist: { feu: 30, air: -30 }, spells: ['m_souffle'], ai: 'ranged', desc: 'Nichée de la Fumerolle. Reste visible.' });
DATA.monsters.fumerolle_noire = M('fumerolle_noire', { name: 'Fumerolle Noire', region: 'kaldum', level: '20 à 30', shape: 'circle', color: '#3a2a4a', hp: 57, dmgMult: 0.8, pa: 6, pm: 3, initiative: 100, resist: { feu: 30, air: -30 }, spells: ['m_bouffee', 'm_etouffement'], ai: 'ranged',
  triggers: [{ when: 'turnStart', do: [{ act: 'toggleState', name: 'invisible' }] }, { when: 'death', do: [{ act: 'explode', min: 10, max: 14, element: 'feu', radius: 1 }] }], desc: 'Fumerolle brûlée. Étouffe, disparaît, éclate.' });
DATA.monsters.clou_vif = M('clou_vif', { name: 'Clou-Vif', region: 'kaldum', level: '12 à 24', shape: 'diamond', color: '#cfcfcf', hp: 45, dmgMult: 0.85, pa: 6, pm: 2, initiative: 60, spells: ['m_clou'], ai: 'ranged', desc: 'Nichée de la Pioche-Vive. Pique en ligne.' });
DATA.monsters.masse_vive = M('masse_vive', { name: 'Masse-Vive', region: 'kaldum', level: '20 à 30', shape: 'diamond', color: '#e8dcb0', hp: 64, dmgMult: 1.45, pa: 6, pm: 2, initiative: 60, resist: { terre: 10 }, spells: ['m_pic', 'm_masse'], ai: 'melee',
  triggers: [{ when: 'hpBelow', pct: 50, do: [{ act: 'buff', effects: [power(20, 99)] }] }], desc: 'Pioche-Vive tissée. Cogne au contact.' });
DATA.monsters.cendril = M('cendril', { name: 'Cendril', region: 'kaldum', level: '16 à 27', shape: 'hex', color: '#ffb36a', hp: 64, dmgMult: 1.6, pa: 6, pm: 3, initiative: 70, resist: { feu: 30 }, spells: ['m_etincelle'], ai: 'melee',
  triggers: [{ when: 'death', do: [{ act: 'explode', min: 6, max: 9, element: 'feu', radius: 1 }] }], desc: 'Nichée du Cendrou. Une braise qui a grandi.' });

DATA.monsters.kavou_bleu = M('kavou_bleu', { name: 'Kavou de Brume', region: 'orsane', level: '4 à 12', shape: 'circle', color: '#7fa6c4', hp: 29, dmgMult: 0.9, pa: 6, pm: 3, initiative: 85, resist: { eau: 35, air: -20 }, spells: ['m_soupir_eau'], ai: 'melee', triggers: gave('eau'), desc: "Né dans la brume de la Mare. Se gave d'eau." });
DATA.monsters.kavou_roux = M('kavou_roux', { name: 'Kavou de Braise', region: 'orsane', level: '4 à 12', shape: 'circle', color: '#e2843c', hp: 29, dmgMult: 0.9, pa: 6, pm: 3, initiative: 85, resist: { feu: 35, terre: -20 }, spells: ['m_soupir_feu'], ai: 'melee', triggers: gave('feu'), desc: 'Né près des feux de l\'Orée. Se gave de feu.' });
DATA.monsters.kavou_ocre = M('kavou_ocre', { name: 'Kavou des Mousses', region: 'orsane', level: '4 à 12', shape: 'circle', color: '#7f9a4e', hp: 29, dmgMult: 0.9, pa: 6, pm: 3, initiative: 85, resist: { terre: 35, feu: -20 }, spells: ['m_soupir_terre'], ai: 'melee', triggers: gave('terre'), desc: 'Né dans la mousse du Bosquet. Se gave de terre.' });
DATA.monsters.kavou_blanc = M('kavou_blanc', { name: 'Kavou des Vents', region: 'orsane', level: '4 à 12', shape: 'circle', color: '#e6eef4', hp: 29, dmgMult: 0.9, pa: 6, pm: 3, initiative: 85, resist: { air: 35, eau: -20 }, spells: ['m_soupir_air'], ai: 'melee', triggers: gave('air'), desc: "Né sur les crêtes venteuses. Se gave d'air." });
DATA.monsters.kavou_pourpre = M('kavou_pourpre', { name: 'Kavou Ancien', region: 'orsane', level: '12 à 16', shape: 'circle', color: '#4a2e5e', hp: 98, dmgMult: 1.45, pa: 6, pm: 4, initiative: 95, resist: { neutre: 30 }, spells: ['m_soupir_pourpre'], ai: 'melee', triggers: gave('neutre'), desc: 'Le plus vieux des Kavous. Se gave de neutre, vole 1 PA.' });

DATA.monsters.glek = M('glek', { name: 'Glek', region: 'kaldum', level: '10 à 16', shape: 'hex', color: '#b89a6a', hp: 52, dmgMult: 1.7, pa: 6, pm: 2, initiative: 40, spells: ['m_giclee'], ai: 'melee', triggers: thelkTriggers, desc: "Nichée du Thelk. L'eau le soigne, le feu le cuit." });
DATA.monsters.thelk = M('thelk', { name: 'Thelk', region: 'kaldum', level: '12 à 24', shape: 'hex', color: '#8a6a3a', hp: 87, dmgMult: 1.05, pa: 6, pm: 2, initiative: 35, resist: { terre: 30 }, spells: ['m_boue'], ai: 'melee', triggers: thelkTriggers, desc: "Glaise vivante. Feu d'abord, jamais d'eau." });
DATA.monsters.thelk_ancien = M('thelk_ancien', { name: 'Thelk Ancien', region: 'kaldum', level: '20 à 30', shape: 'hex', color: '#5a4a2a', hp: 98, dmgMult: 1.65, pa: 6, pm: 2, initiative: 30, resist: { terre: 30 }, spells: ['m_boue', 'm_coulee'], ai: 'melee',
  triggers: [...thelkTriggers, { when: 'hpBelow', pct: 50, do: [{ act: 'summon', monster: 'glek', count: 2 }] }], desc: "Vieille glaise. S'effrite en deux Gleks." });

DATA.monsters.tholi = M('tholi', { name: 'Tholi', region: 'kaldum', level: '12 à 20', shape: 'circle', color: '#ffc9a0', hp: 33, dmgMult: 1.65, pa: 6, pm: 1, initiative: 50, resist: { feu: 30 }, spells: ['m_ronron', 'm_etincelle'], ai: 'support', desc: 'Nichée du Tholou. Ronronne, soigne, bouge peu.' });
DATA.monsters.tholou = M('tholou', { name: 'Tholou', region: 'kaldum', level: '16 à 26', shape: 'circle', color: '#ff9a6a', hp: 41, dmgMult: 1.7, pa: 6, pm: 1, initiative: 50, resist: { feu: 30 }, spells: ['m_ronron', 'm_chaleur', 'm_etincelle'], ai: 'support', desc: 'Chauffe-pieds vivant. Soigne et donne des PA.' });
DATA.monsters.tholou_tisse = M('tholou_tisse', { name: 'Tholou Tissé', region: 'kaldum', level: '20 à 30', shape: 'circle', color: '#ffe0b0', hp: 56, dmgMult: 1.7, pa: 6, pm: 1, initiative: 55, resist: { feu: 30 }, spells: ['m_ronron', 'm_chaleur', 'm_manteau_cendre', 'm_etincelle'], ai: 'support', desc: 'Tholou tissé. Soigne, accélère, protège.' });

DATA.monsters.oreth = M('oreth', { name: 'Oreth', region: 'orsane', level: '10 à 14', rare: true, shape: 'diamond', color: '#fff8d0', hp: 40, pa: 6, pm: 6, initiative: 140, resist: { air: 30, neutre: 30 }, spells: ['m_frolement'], ai: 'ranged',
  triggers: [{ when: 'turnStart', do: [{ act: 'toggleState', name: 'invisible' }] }], desc: 'Étincelle perdue de la Colère d\'Ithren. Fuit, disparaît.' });

DATA.monsters.korvath = M('korvath', { name: 'Korvath', region: 'kaldum', level: '22 à 28', elite: true, shape: 'square', color: '#6a5a4a', hp: 400, pa: 6, pm: 2, initiative: 45, resist: { terre: 40, air: -20 }, spells: ['m_roulement', 'm_eboulement', 'm_ecrasement'], ai: 'melee',
  triggers: [{ when: 'hpBelow', pct: 70, do: [{ act: 'summon', monster: 'brimbe', count: 2 }, { act: 'log', text: "Korvath s'effrite." }] }, { when: 'hpBelow', pct: 35, do: [{ act: 'summon', monster: 'brimbe_fendue', count: 2 }, { act: 'buff', effects: [power(30, 99)] }] }, { when: 'death', do: [{ act: 'explode', min: 14, max: 18, element: 'terre', radius: 2 }] }],
  desc: "Élite de pleine nature. Roule, emmure, lâche des Brimbes, s'effondre." });

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
