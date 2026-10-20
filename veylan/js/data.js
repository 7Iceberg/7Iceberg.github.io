// Données du prototype : règles chiffrées, classes, sorts, monstres, boss, rencontres.
// Tout est en clair ici pour pouvoir équilibrer sans toucher au moteur.
// Les chiffres suivent la bible du jeu (docs/MONDE.md et la bible en ligne) ; les monstres sont
// équilibrés contre un héros seul, quelle que soit leur « région », parce que le prototype n'a
// pas encore de niveaux.
const DATA = {};

DATA.rules = {
  turnSeconds: 20,
  // Dégâts subis par case non parcourue quand une poussée bute sur un obstacle ou une entité.
  pushDamagePerCell: 6,
  // Invocations vivantes au plus par propriétaire.
  maxSummonsPerOwner: 2,
  // Tours (en rounds) de vie d'un piège posé.
  trapRounds: 5,
  // Pièges posés au plus par lanceur en même temps.
  maxTrapsPerOwner: 3,
  // Un monstre au-dessus du bas de sa fourchette : + tant de dégâts et de PV par niveau.
  monsterDamagePerLevel: 0.06,
  monsterHpPerLevel: 0.08,
  // Multiplicateurs de dégâts et de PV de tous les monstres (pas des invocations, qui prennent
  // l'échelle de leur maître), réglés au bot d'équilibrage (tests/balance.js) pour 70 à 90 % de
  // victoires ; chaque monstre a en plus sa puissance propre (`dmgMult`) et ses PV.
  monsterDamageMult: 3,
  monsterHpMult: 1.4,
  monsterHpHighFrom: 12,
  monsterHpHighPerLevel: 0,
  // Caractéristiques sans plafond : chaque point donne +1 % aux dégâts de son élément, sans fin.
  // Coût d'un point, comme dans Dofus : Terra, Ignis, Aqua et Aer coûtent 1 point jusqu'à 100, 2
  // jusqu'à 200, 3 jusqu'à 300, 4 au-delà ; la Vitalité 1 point pour 1 ; la Sagesse 3 points pour 1.
  statTiers: [[100, 1], [200, 2], [300, 3], [1e9, 4]],
  sagesseCost: 3,
  // Parchemins de caractéristique : des points de base gratuits, 50 au plus par caractéristique.
  scrollMax: 50,
  // Caractéristiques secondaires (Dofus) : Tacle et Fuite = Aer / 10, Esquive et Retrait de PA
  // et de PM = Sagesse / 10, Prospection = 100 + Aqua / 10, Soins = +1 % par point d'Ignis.
  // Un Veilleur a 2 de Fuite de base ; un monstre de contact a Tacle = niveau / 10, et tout
  // monstre a Fuite = niveau / 3 (sauf valeurs propres `tacle`, `fuite`).
  playerFuiteBase: 2,
  monsterTacleDiv: 15,
  monsterFuiteDiv: 3,
  // Les invocations d'un joueur prennent l'échelle de dégâts de leur maître et
  // + `summonHpPerLevel` de PV par niveau du maître au-dessus du premier.
  summonsScaleWithOwner: true,
  summonHpPerLevel: 0.06,
  // Esquive des retraits de PA et de PM par la sagesse (bornes, en pourcentage).
  // Esquive des retraits de PA et de PM (js/combat.js, removalDodgeChance) : 25 % (40 % pour un joueur) à sagesse égale
  // et PA ou PM pleins, bornée de 5 à 75 %. Plus douce que Dofus (50 %, de 10 à 90 %) : le
  // contrôle reste une stratégie, la sagesse une défense.
  removalDodgeBase: 25,
  removalDodgeBasePlayer: 40,       // un Veilleur esquive mieux qu'une bête : le début de partie reste jouable
  removalDodgeK: 40,
  removalDodgeMin: 5,
  removalDodgeMax: 75,
};

DATA.elements = {
  // Chaque élément a sa caractéristique, du même nom (Ignis, Aqua, Aer, Terra) : un point donne
  // +1 % aux dégâts de l'élément. Les clés internes (intel, chance, agi, force) restent pour les
  // sauvegardes.
  feu:    { label: 'Feu',    stat: 'Ignis', color: '#ff5a36', desc: 'Les flammes, l\'énergie et la destruction.' },
  eau:    { label: 'Eau',    stat: 'Aqua',  color: '#22b8cf', desc: 'La fluidité, la glace et la puissance des océans.' },
  air:    { label: 'Air',    stat: 'Aer',   color: '#dde4ec', desc: 'Le vent, la liberté et la vitesse.' },
  terre:  { label: 'Terre',  stat: 'Terra', color: '#6dbb4f', desc: 'La nature, les roches et la stabilité.' },
  neutre: { label: 'Neutre', color: '#e4e4e4' },
};

// Schéma d'un sort :
//   pa            coût en points d'action
//   range         [min, max] en distance de Manhattan depuis le lanceur
//   los           ligne de vue requise (vrai par défaut)
//   line          doit être lancé en ligne droite
//   target        'any' | 'entity' | 'enemy' | 'ally' | 'free' (case libre) | 'self' | 'summon' (invocation alliée)
//   aoe           'single' | 'cross' | 'circle' | 'line' avec size
//   affects       'all' (défaut) | 'allies' | 'enemies' : qui, dans la zone, subit les effets
//   affectsCaster le lanceur peut être touché par ses propres effets
//   effects       appliqués à chaque entité de la zone, dans l'ordre :
//                 damage {min,max} · heal {min,max} · pa/pm {value,duration[,selfNow]} · shield {value,duration}
//                 (selfNow : lancé sur soi pendant son tour, donne tout de suite selfNow PA ou PM)
//                 power {value,turns} (+% dégâts) · vuln {value,turns} (+% dégâts subis) · dot {element,value,turns}
//                 state {name,turns} (invisible, provoked) · cleanse · devourShield · push/pull {cells} · swap
//                 sacrifice {min,max,radius} (tue l'invocation visée, dégâts autour)
//                 effets de case : obstacle {kind,turns} · trap {effects,name} · summon {monster,count} · teleport
//                 glyph {name,turns,affects,effects} (zone qui agit au début du tour de qui s'y tient ; un par tour)
//   selfEffects   appliqués au lanceur quoi qu'il arrive : selfDamagePct {pct} · paNow/pmNow {value} · shield, power…
//   lifesteal     pourcentage des dégâts infligés rendus au lanceur
//   lowHpBonus    {below, mult} : multiplicateur si le lanceur est sous `below` % de PV
//   executeBelow  pourcentage : dégâts doublés si la cible est en dessous
//   bonusIfInvisible multiplicateur si le lanceur est invisible
//   cooldown      tours d'attente avant de relancer · maxPerTurn  lancers par tour
const single = { shape: 'single', size: 0 };
const cross1 = { shape: 'cross', size: 1 };
const circle1 = { shape: 'circle', size: 1 };
const circle2 = { shape: 'circle', size: 2 };
const line3 = { shape: 'line', size: 3 };

function S(id, def) {
  def.id = id;
  if (!def.aoe) def.aoe = single;
  if (!def.target) def.target = 'entity';
  if (def.los === undefined) def.los = true;
  if (!def.effects) def.effects = [];
  return def;
}

const dmg = (min, max) => ({ type: 'damage', min, max });
const heal = (min, max) => ({ type: 'heal', min, max });
const pa = (value, duration) => ({ type: 'pa', value, duration });
const pm = (value, duration) => ({ type: 'pm', value, duration });
const root = { type: 'pm', value: -10, duration: 1 };
const shield = (value, duration) => ({ type: 'shield', value, duration });
const power = (value, turns) => ({ type: 'power', value, turns });
const push = cells => ({ type: 'push', cells });
const pull = cells => ({ type: 'pull', cells });
const dot = (element, value, turns) => ({ type: 'dot', element, value, turns });
const state = (name, turns) => ({ type: 'state', name, turns });
// Serment (Sarkan) : juré `turns` tours, +20 % de dégâts contre lui, 8 de brûlure (feu) s'il frappe
// un autre allié ; parole tenue : 2 PA tout de suite, 10 % des PV maximum, 2 de Fureur.
const oath = turns => ({ type: 'oath', turns, power: 20, burn: 8, kept: { pa: 2, healPct: 10, fury: 2 } });
// Larcin (Nerith) : vole `value` PA ou PM (`duration` tours pour la cible), ou le bouclier.
const steal = (what, value, duration) => ({ type: 'steal', what, value, duration: duration || 1 });

DATA.spells = {};
const spells = DATA.spells;

// ===== Vaelith, Tisseur des Voiles : contrôle (air, eau) =====
spells.eclat = S('eclat', { name: 'Éclat', element: 'feu', pa: 3, range: [1, 5], effects: [dmg(11, 15)], maxPerTurn: 2, desc: 'Un trait de feu, simple et fiable.' });
spells.givre = S('givre', { name: 'Givre', element: 'eau', pa: 3, range: [1, 4], effects: [dmg(8, 12), pm(-1, 1)], maxPerTurn: 2, desc: 'Gèle les jambes : la cible perd 1 PM à son prochain tour.' });
spells.bourrasque = S('bourrasque', { name: 'Bourrasque', element: 'air', pa: 2, range: [1, 3], effects: [dmg(5, 8), push(2)], desc: 'Repousse la cible de 2 cases. Contre un obstacle : dégâts de poussée.' });
spells.secousse = S('secousse', { name: 'Secousse', element: 'terre', pa: 4, range: [1, 3], los: false, target: 'any', aoe: cross1, effects: [dmg(10, 14)], maxPerTurn: 1, desc: 'Frappe en croix, sans ligne de vue. Touche tout ce qui est dans la croix.' });
// Téléfrag (le Xélor, docs/XELOR-ANALYSE.md) : sur une créature, le Vaelith échange sa place avec elle ;
// le premier téléfrag du tour lui rend `telefrag` PA.
spells.pas_de_voile = S('pas_de_voile', { name: 'Pas de Voile', element: 'neutre', pa: 3, range: [1, 6], target: 'free', telefrag: 2, effects: [{ type: 'teleport' }], cooldown: 2, desc: 'Se téléporte sur une case libre en vue ; sur une créature, échange sa place avec elle (téléfrag : +2 PA, une fois par tour).' });
spells.lame_orage = S('lame_orage', { name: "Lame d'Orage", element: 'feu', pa: 4, range: [1, 6], line: true, target: 'any', aoe: line3, effects: [dmg(9, 13)], maxPerTurn: 1, desc: 'Se lance en ligne. Traverse 3 cases à partir de la case visée.' });
// Le Rembobinage du Xélor : à la fin de son tour, le Vaelith revient sur sa case de début de tour.
spells.retour_de_voile = S('retour_de_voile', { name: 'Retour de Voile', element: 'neutre', pa: 1, range: [0, 0], los: false, target: 'self', selfEffects: [{ type: 'rewind' }], cooldown: 2, desc: 'À la fin du tour, revient sur la case où le tour a commencé.' });
spells.manteau = S('manteau', { name: 'Manteau', element: 'neutre', pa: 2, range: [0, 0], los: false, target: 'self', affectsCaster: true, effects: [shield(20, 2)], cooldown: 3, desc: 'Un bouclier de 20 points pendant 2 tours.' });
spells.siphon = S('siphon', { name: 'Siphon', element: 'eau', pa: 3, range: [1, 4], target: 'enemy', effects: [dmg(6, 9), pa(-2, 1)], cooldown: 2, desc: 'Aspire 2 PA à la cible pour son prochain tour.' });
spells.nova = S('nova', { name: 'Nova', element: 'feu', pa: 5, range: [0, 0], los: false, target: 'self', aoe: circle2, effects: [dmg(20, 26)], cooldown: 3, desc: 'Explosion autour de soi, 2 cases de rayon. Épargne le lanceur, pas les alliés.' });
spells.attraction = S('attraction', { name: 'Attraction', element: 'air', pa: 2, range: [2, 5], effects: [dmg(4, 6), pull(2)], desc: 'Attire la cible de 2 cases vers soi.' });

// ===== Sarkan, Lame-Serment : épéiste, tient la ligne (terre, feu) =====
// Fureur (0 à 5, DATA.classes.sarkan.fury) : +1 quand Taille Franche ou Poigne touche, +1 quand un
// ennemi le frappe au contact ; Verdict la dépense en entier. Serment : un juré à la fois, +20 % de
// dégâts contre lui, brûlure s'il frappe un autre allié, « parole tenue » si le Sarkan l'achève.
spells.taille_franche = S('taille_franche', { name: 'Taille Franche', element: 'terre', pa: 3, range: [1, 1], effects: [dmg(13, 17)], fury: 1, maxPerTurn: 2, desc: 'Le coup droit du Sarkan. +1 Fureur si la cible est touchée.' });
spells.saut_delan = S('saut_delan', { name: "Saut d'Élan", element: 'terre', pa: 3, range: [2, 4], los: false, target: 'free', effects: [{ type: 'leap', aoe: cross1, effects: [dmg(6, 9)] }], cooldown: 1, desc: 'Bondit sur une case libre et frappe en croix autour de lui à l\'arrivée.' });
spells.serment_jure = S('serment_jure', { name: 'Serment', element: 'neutre', pa: 2, range: [1, 6], target: 'enemy', effects: [oath(3)], cooldown: 1, desc: 'Désigne le juré pour 3 tours : +20 % de dégâts contre lui ; s\'il frappe un autre allié, la lame le brûle ; l\'achever rend 2 PA, 10 % des PV et 2 de Fureur.' });
spells.garde_de_scorie = S('garde_de_scorie', { name: 'Garde de Scorie', element: 'neutre', pa: 2, range: [0, 0], los: false, target: 'self', affectsCaster: true, effects: [shield(30, 1), { type: 'guard', value: 20, turns: 1 }], cooldown: 2, desc: 'Bouclier de 30 et −20 % de dégâts subis au corps à corps jusqu\'au prochain tour.' });
spells.lame_tournoyante = S('lame_tournoyante', { name: 'Lame Tournoyante', element: 'terre', pa: 4, range: [0, 0], los: false, target: 'self', aoe: circle1, affects: 'enemies', effects: [dmg(10, 13)], perExtraTarget: 20, maxPerTurn: 1, desc: 'Frappe chaque ennemi adjacent, +20 % par ennemi touché en plus du premier.' });
spells.defi = S('defi', { name: 'Défi', element: 'neutre', pa: 2, range: [1, 5], target: 'enemy', effects: [pull(2), state('provoked', 1)], cooldown: 3, desc: 'Attire la cible de 2 cases ; provoquée 1 tour, elle doit frapper le Sarkan si elle peut.' });
spells.poigne_juree = S('poigne_juree', { name: 'Poigne', element: 'terre', pa: 3, range: [1, 1], effects: [dmg(9, 12), pm(-2, 1), { type: 'push', cells: 2, ifSworn: true }], fury: 1, maxPerTurn: 1, desc: '−2 PM pour 1 tour ; contre le juré, le repousse aussi de 2 cases. +1 Fureur.' });
spells.lame_de_braise = S('lame_de_braise', { name: 'Lame de Braise', element: 'feu', pa: 4, range: [1, 3], line: true, target: 'any', aoe: line3, effects: [dmg(12, 16)], cooldown: 1, desc: 'Une traînée de feu sur 3 cases en ligne, à partir de la case visée.' });
// Ferveur suit la règle des boosts courts (docs/IOP-ANALYSE.md) : moins cher, moins long, plus souvent.
spells.ferveur = S('ferveur', { name: 'Ferveur', element: 'neutre', pa: 2, range: [0, 0], los: false, target: 'self', affectsCaster: true, effects: [power(30, 1)], selfEffects: [{ type: 'pmNow', value: 1 }], cooldown: 3, desc: '+30 % de dégâts ce tour et le suivant, et +1 PM ce tour.' });
spells.verdict = S('verdict', { name: 'Verdict', element: 'terre', pa: 5, range: [1, 1], effects: [dmg(16, 20)], furySpend: 20, oathPierce: true, cooldown: 2, desc: '+20 % par point de Fureur dépensé (toute la Fureur). Contre le juré : ni esquive ni armure.' });

// ===== Lyssar, Traqueur : archer, longue portée (air, terre) =====
// Affût (DATA.classes.lyssar.affut) : tant qu'il ne s'est pas déplacé depuis le début de son tour,
// +1 portée à ses tirs et +15 % de dégâts. Repli ne casse pas l'Affût.
// Flèche Tissée : 10 à 14 depuis les rangs des sorts (11 à 15 avant). Déjà à 91 % de victoires au
// bot, le Lyssar passait à 93 % avec n'importe quel bonus de rang ; son rang 4 rend les 11 à 15.
spells.trait_tisse = S('trait_tisse', { name: 'Flèche Tissée', element: 'air', pa: 3, range: [3, 7], effects: [dmg(10, 14)], maxPerTurn: 2, desc: 'Le tir de base, précis et long.' });
spells.fil_tendu = S('fil_tendu', { name: 'Fil Tendu', element: 'air', pa: 3, range: [2, 6], effects: [dmg(8, 11), push(2)], maxPerTurn: 2, desc: 'Repousse de 2 cases, deux fois par tour ; contre un obstacle, +6 dégâts par case non parcourue.' });
spells.collet = S('collet', { name: 'Collet', element: 'neutre', pa: 2, range: [1, 5], target: 'free', effects: [{ type: 'trap', name: 'Collet', effects: [dmg(6, 9), root] }], trapReplaceOldest: true, maxPerTurn: 2, desc: 'Un collet invisible : la cible est blessée et enracinée 1 tour. Un quatrième collet fait disparaître le plus ancien.' });
spells.repli_traqueur = S('repli_traqueur', { name: 'Repli', element: 'neutre', pa: 1, range: [0, 0], los: false, target: 'self', effects: [{ type: 'retreat', cells: 2 }], keepsAffut: true, cooldown: 2, desc: 'Recule de 2 cases à l\'opposé de l\'ennemi le plus proche, sans casser l\'Affût.' });
spells.fleche_lourde = S('fleche_lourde', { name: 'Flèche Lourde', element: 'terre', pa: 4, range: [2, 6], effects: [dmg(15, 19)], maxPerTurn: 1, desc: 'Le tir lourd, la voie de la Force.' });
// Corde Longue suit la règle des bonus du Crâ depuis la 3.6 : 1 PA, court, relance courte
// (docs/CRA-ANALYSE.md). Un effet sur soi tient le tour où il est lancé et le suivant.
spells.corde_longue = S('corde_longue', { name: 'Corde Longue', element: 'neutre', pa: 1, range: [0, 0], los: false, target: 'self', affectsCaster: true, effects: [{ type: 'range', value: 3, turns: 1 }], cooldown: 3, desc: '+3 portée ce tour et le suivant.' });
// Balise de Fil : la sortie de secours du Traqueur, sur le modèle de la Balise de Survie du Crâ
// (3.6). Le piquet attend ; la première fois que le Lyssar est blessé, il prend la place du piquet.
spells.balise_de_fil = S('balise_de_fil', { name: 'Balise de Fil', element: 'neutre', pa: 2, range: [1, 5], target: 'free', effects: [{ type: 'summon', monster: 'balise_de_fil', count: 1, hpPctOfOwner: 20 }], cooldown: 3, desc: 'Plante un piquet de fil. La première fois que le Lyssar est blessé, il échange sa place avec le piquet.' });
spells.marque_traqueur = S('marque_traqueur', { name: 'Marque du Traqueur', element: 'neutre', pa: 2, range: [1, 7], los: false, target: 'enemy', effects: [{ type: 'vuln', value: 25, turns: 2 }, { type: 'track', turns: 2 }], cooldown: 1, desc: 'La cible subit +25 % de dégâts 2 tours, et ne peut plus être invisible.' });
spells.pluie_de_fil = S('pluie_de_fil', { name: 'Pluie de Fil', element: 'air', pa: 4, range: [3, 7], los: false, target: 'any', aoe: circle1, affects: 'enemies', effects: [dmg(8, 11)], cooldown: 2, desc: 'Une volée sans ligne de vue sur une case et ses voisines : chaque ennemi est touché.' });
spells.fleche_ancre = S('fleche_ancre', { name: 'Flèche Ancre', element: 'terre', pa: 3, range: [2, 6], effects: [dmg(6, 9), pm(-2, 2)], cooldown: 2, desc: 'La cible perd 2 PM pendant 2 tours.' });
spells.trait_du_veilleur = S('trait_du_veilleur', { name: 'Trait du Veilleur', element: 'air', pa: 5, range: [4, 10], line: true, target: 'any', aoe: { shape: 'pierce', size: 0 }, markSight: true, effects: [dmg(18, 24)], affutBonus: 30, cooldown: 3, desc: 'La flèche traverse : chaque entité de la ligne jusqu\'au bord ou au premier rocher. +30 % à l\'Affût.' });

// ===== Oriel, Veilleur de Lumière : soigneur (feu, neutre) =====
// Lueur, le mot de l'Eniripsa (refonte de 2016, docs/ENIRIPSA-ANALYSE.md) : sur un allié elle
// soigne, sur un ennemi elle brûle.
spells.lueur = S('lueur', { name: 'Lueur', element: 'feu', pa: 3, range: [0, 5], target: 'entity', affectsCaster: true, effects: [Object.assign(heal(22, 28), { onAlly: true }), Object.assign(dmg(10, 13), { onFoe: true })], maxPerTurn: 1, desc: 'Soigne un allié, ou brûle un ennemi.' });
spells.eclair_solaire = S('eclair_solaire', { name: 'Éclair solaire', element: 'feu', pa: 3, range: [1, 5], effects: [dmg(9, 13)], desc: 'Un trait de lumière.' });
spells.manteau_partage = S('manteau_partage', { name: 'Manteau Partagé', element: 'neutre', pa: 3, range: [0, 4], los: false, target: 'any', aoe: cross1, affects: 'allies', affectsCaster: true, effects: [shield(12, 2)], cooldown: 2, desc: 'Bouclier de 12 sur les alliés d\'une croix.' });
spells.rappel = S('rappel', { name: 'Rappel', element: 'neutre', pa: 2, range: [0, 4], target: 'ally', affectsCaster: true, effects: [{ type: 'cleanse' }], maxPerTurn: 1, desc: 'Retire tous les malus d\'un allié.' });
spells.flamme_vive = S('flamme_vive', { name: 'Flamme vive', element: 'feu', pa: 4, range: [1, 4], effects: [dmg(15, 19)], lifesteal: 50, desc: 'La moitié des dégâts revient en soin au lanceur.' });
spells.benediction = S('benediction', { name: 'Bénédiction', element: 'neutre', pa: 2, range: [0, 3], target: 'ally', affectsCaster: true, effects: [pa(1, 1)], cooldown: 2, desc: '+1 PA à un allié pour son prochain tour.' });
spells.aube = S('aube', { name: 'Aube', element: 'neutre', pa: 5, range: [0, 0], los: false, target: 'self', aoe: circle2, affects: 'allies', affectsCaster: true, effects: [heal(10, 14)], cooldown: 3, desc: 'Soigne tous les alliés à 2 cases.' });
spells.lumiere_aveuglante = S('lumiere_aveuglante', { name: 'Lumière aveuglante', element: 'feu', pa: 3, range: [1, 4], target: 'enemy', effects: [dmg(6, 9), pa(-1, 1)], cooldown: 1, desc: 'La cible perd 1 PA.' });
// La Lanterne de Veille, sur le modèle du Lapino : elle soigne les alliés tant qu'elle tient, et
// en tombant laisse un halo qui soigne encore deux tours.
spells.lanterne_de_veille = S('lanterne_de_veille', { name: 'Lanterne de Veille', element: 'neutre', pa: 3, range: [1, 3], target: 'free', effects: [{ type: 'summon', monster: 'lanterne_de_veille', count: 1, hpPctOfOwner: 25 }], cooldown: 4, desc: 'Une lanterne (25 % des PV de l\'Oriel) qui soigne les alliés blessés ; en tombant, elle laisse un halo qui soigne 2 tours.' });
// Renaissance, sur le modèle du Mot de Reconstitution : tous les PV, puis plus aucun soin 3 tours.
spells.renaissance = S('renaissance', { name: 'Renaissance', element: 'neutre', pa: 4, range: [0, 3], target: 'ally', affectsCaster: true, effects: [{ type: 'healPct', pct: 100 }, state('unhealable', 3)], cooldown: 6, desc: 'Rend tous ses PV à un allié, qui ne peut plus être soigné pendant 3 tours.' });
spells.m_lanterne_soin = S('m_lanterne_soin', { name: 'Clarté', element: 'neutre', pa: 3, range: [0, 4], target: 'ally', affectsCaster: true, effects: [heal(8, 11)], maxPerTurn: 1 });
spells.veille = S('veille', { name: 'Veille', element: 'neutre', pa: 2, range: [0, 0], los: false, target: 'self', affectsCaster: true, effects: [shield(20, 2)], cooldown: 3, desc: 'Un bouclier sur soi.' });
spells.ardeur = S('ardeur', { name: 'Ardeur', element: 'feu', pa: 3, range: [1, 3], target: 'enemy', effects: [dmg(10, 14), push(1)], desc: 'Brûle et repousse d\'une case.' });

// ===== Nerith, Lame d'Ombre : voleuse, assassin (air, eau) =====
// Invisibilité `lingering` : attaquer ne la révèle qu'à la fin du tour. Larcin (`steal`) : ce que
// l'ennemi perd, elle le gagne. Bourse (`purse`) : un monstre achevé par un sort de vol rapporte
// 25 % de Fils et de butin en plus.
spells.double_entaille = S('double_entaille', { name: 'Double Entaille', element: 'air', pa: 4, range: [1, 1], effects: [dmg(10, 13), dmg(10, 13)], maxPerTurn: 1, desc: 'Deux coups au contact.' });
spells.voile_penombre = S('voile_penombre', { name: "Voile d'Ombre", element: 'neutre', pa: 2, range: [0, 0], los: false, target: 'self', affectsCaster: true, effects: [Object.assign(state('invisible', 1), { lingering: true })], cooldown: 2, desc: 'Invisible jusqu\'à la fin de son prochain tour ; frapper ne la révèle qu\'à la fin du tour.' });
spells.piege_penombre = S('piege_penombre', { name: 'Piège de Pénombre', element: 'neutre', pa: 2, range: [1, 3], target: 'free', effects: [{ type: 'trap', name: 'Piège de Pénombre', effects: [dmg(10, 14), pa(-1, 1)] }], maxPerTurn: 2, desc: 'Un piège invisible qui blesse et retire 1 PA.' });
spells.larcin = S('larcin', { name: 'Larcin', element: 'eau', pa: 3, range: [1, 1], effects: [dmg(9, 12), steal('pa', 1)], purse: 25, maxPerTurn: 1, desc: 'Vole 1 PA. Si la cible meurt, la bourse : +25 % de Fils et de butin.' });
spells.pas_ombre = S('pas_ombre', { name: "Pas de l'Ombre", element: 'neutre', pa: 3, range: [1, 5], target: 'free', effects: [{ type: 'teleport' }], cooldown: 2, desc: 'Se téléporte sans se révéler.' });
spells.coup_penombre = S('coup_penombre', { name: 'Coup de Pénombre', element: 'air', pa: 3, range: [1, 1], effects: [dmg(10, 13)], bonusIfInvisible: 1.8, maxPerTurn: 2, desc: 'Dégâts × 1,8 si la Nerith est invisible.' });
spells.main_leste = S('main_leste', { name: 'Main Leste', element: 'eau', pa: 2, range: [1, 3], effects: [dmg(5, 7), Object.assign(steal('shield'), { orBonus: true })], purse: 25, cooldown: 2, desc: 'Vole le bouclier de la cible, ou son meilleur bonus si elle n\'en a pas.' });
// Piège de Reflux : le piège qui repousse du Sram (docs/SRAM-ANALYSE.md). Il jette sa cible loin de
// la Nerith, sur un autre piège s'il y en a un (un réseau), et l'empoisonne deux tours.
spells.piege_de_reflux = S('piege_de_reflux', { name: 'Piège de Reflux', element: 'eau', pa: 2, range: [1, 3], target: 'free', effects: [{ type: 'trap', name: 'Piège de Reflux', effects: [push(2), { type: 'dot', element: 'eau', value: 3, turns: 2 }] }], maxPerTurn: 2, desc: 'Un piège invisible qui repousse de 2 cases loin de la Nerith, sur un autre piège s\'il y en a un, et empoisonne 2 tours.' });
spells.leurre_penombre = S('leurre_penombre', { name: 'Leurre de Pénombre', element: 'neutre', pa: 3, range: [1, 2], target: 'free', effects: [{ type: 'summon', monster: 'silhouette_ombre', count: 1, hpPctOfOwner: 30 }], cooldown: 4, desc: 'Une silhouette d\'ombre (30 % des PV de la Nerith) qui provoque les ennemis adjacents. À la fin de son deuxième tour, elle échange sa place avec la Nerith, puis éclate.' });
spells.dernier_souffle_ombre = S('dernier_souffle_ombre', { name: 'Dernier Souffle', element: 'air', pa: 5, range: [1, 1], effects: [dmg(15, 19)], executeBelow: 30, onKill: [Object.assign(state('invisible', 1), { lingering: true }), { type: 'paNow', value: 2 }], cooldown: 2, desc: 'Doublé sur une cible sous 30 % de PV. Si elle meurt, la Nerith redevient invisible et récupère 2 PA.' });

// ===== Kaldrin, Mécaniste : mécanismes (feu, terre) =====
spells.tourelle_de_kaldum = S('tourelle_de_kaldum', { name: 'Tourelle de Kaldum', element: 'neutre', pa: 4, range: [1, 3], target: 'free', effects: [{ type: 'summon', monster: 'tourelle', count: 1 }], cooldown: 2, desc: 'Pose une tourelle qui tire chaque tour.' });
spells.mur_articule = S('mur_articule', { name: 'Mur Articulé', element: 'terre', pa: 3, range: [1, 4], los: false, target: 'free', effects: [{ type: 'obstacle', kind: 'rock', turns: 2 }], cooldown: 2, desc: 'Un obstacle d\'une case pendant 2 tours.' });
spells.mine_a_fil = S('mine_a_fil', { name: 'Mine à Fil', element: 'feu', pa: 3, range: [1, 4], target: 'free', effects: [{ type: 'trap', name: 'Mine à Fil', effects: [dmg(14, 18)] }], maxPerTurn: 2, desc: 'Explose au passage d\'un ennemi.' });
spells.marteau = S('marteau', { name: 'Marteau', element: 'terre', pa: 3, range: [1, 1], effects: [dmg(11, 14)], desc: 'Un coup de marteau.' });
spells.surchauffe = S('surchauffe', { name: 'Surchauffe', element: 'feu', pa: 3, range: [1, 4], effects: [dmg(9, 12), dot('feu', 2, 2)], desc: 'Brûle pendant 2 tours.' });
spells.reparation = S('reparation', { name: 'Réparation', element: 'neutre', pa: 2, range: [0, 4], target: 'ally', affectsCaster: true, effects: [heal(12, 16)], cooldown: 1, desc: 'Répare une tourelle ou soigne un allié.' });
spells.propulseur = S('propulseur', { name: 'Propulseur', element: 'neutre', pa: 2, range: [1, 3], effects: [dmg(3, 5), push(3)], desc: 'Projette la cible de 3 cases.' });
spells.grappin = S('grappin', { name: 'Grappin', element: 'neutre', pa: 2, range: [2, 5], effects: [dmg(3, 5), pull(2)], desc: 'Attire la cible de 2 cases.' });
// Le relais du Forgelance (docs/FORGELANCE-ANALYSE.md) : comme ses sorts autour de la lance plantée,
// la chaudière éclate autour de la tourelle du Kaldrin, où qu'elle soit.
spells.detonation = S('detonation', { name: 'Détonation', element: 'feu', pa: 4, range: [0, 8], los: false, target: 'summon', aoe: circle1, affects: 'enemies', effects: [dmg(12, 16)], cooldown: 2, desc: 'Une explosion autour de sa tourelle, sans ligne de vue.' });
spells.forge = S('forge', { name: 'Forge', element: 'neutre', pa: 2, range: [0, 0], los: false, target: 'self', affectsCaster: true, effects: [power(25, 1)], cooldown: 2, desc: '+25 % de dégâts.' });

// ===== Karsh, Lame de Sang : mêlée sacrifice (feu) =====
spells.serment_de_sang = S('serment_de_sang', { name: 'Serment de Sang', element: 'neutre', pa: 1, range: [0, 0], los: false, target: 'self', selfEffects: [{ type: 'selfDamagePct', pct: 15 }, { type: 'paNow', value: 2 }], maxPerTurn: 1, desc: 'Perd 15 % de ses PV, gagne 2 PA tout de suite.' });
spells.charge = S('charge', { name: 'Charge', element: 'neutre', pa: 3, range: [2, 4], line: true, target: 'free', effects: [{ type: 'teleport' }], cooldown: 2, desc: 'Fonce en ligne sur une case libre.' });
spells.taillade = S('taillade', { name: 'Taillade', element: 'feu', pa: 3, range: [1, 1], effects: [dmg(14, 18)], desc: 'Un coup de lame.' });
spells.dernier_souffle = S('dernier_souffle', { name: 'Dernier Souffle', element: 'feu', pa: 4, range: [1, 2], effects: [dmg(17, 21)], lowHpBonus: { below: 30, mult: 2 }, desc: 'Dégâts doublés si le Karsh est sous 30 % de vie.' });
spells.hurlement = S('hurlement', { name: 'Hurlement', element: 'feu', pa: 2, range: [0, 0], los: false, target: 'self', aoe: circle1, affects: 'enemies', effects: [dmg(4, 6), pa(-1, 1)], cooldown: 2, desc: 'Les ennemis adjacents perdent 1 PA.' });
spells.sang_pour_sang = S('sang_pour_sang', { name: 'Sang pour sang', element: 'feu', pa: 3, range: [1, 3], effects: [dmg(9, 12)], lifesteal: 50, desc: 'La moitié des dégâts revient en soin.' });
spells.brulure = S('brulure', { name: 'Brûlure', element: 'feu', pa: 3, range: [1, 3], effects: [dmg(6, 8), dot('feu', 4, 2)], desc: 'Brûle pendant 2 tours.' });
// L'Attirance du Sacrieur (docs/SACRIEUR-ANALYSE.md) : ramener la cible au contact, puis frapper.
spells.lien_de_sang = S('lien_de_sang', { name: 'Lien de Sang', element: 'feu', pa: 3, range: [2, 5], line: true, effects: [dmg(5, 7), pull(3)], cooldown: 2, desc: 'Attire la cible de 3 cases, en ligne.' });
spells.colosse = S('colosse', { name: 'Colosse', element: 'neutre', pa: 2, range: [0, 0], los: false, target: 'self', affectsCaster: true, effects: [shield(25, 1)], cooldown: 3, desc: 'Un bouclier de 25 pour un tour.' });
spells.frappe_lourde = S('frappe_lourde', { name: 'Frappe lourde', element: 'feu', pa: 4, range: [1, 1], effects: [dmg(20, 25), push(1)], maxPerTurn: 1, desc: 'Le gros coup, qui repousse.' });
spells.rage = S('rage', { name: 'Rage', element: 'neutre', pa: 2, range: [0, 0], los: false, target: 'self', affectsCaster: true, effects: [power(35, 1)], selfEffects: [{ type: 'selfDamagePct', pct: 15 }], cooldown: 3, desc: '+35 % de dégâts contre 15 % de ses PV.' });

// ===== Mirel, Chantre : soutien (air) =====
spells.cadence = S('cadence', { name: 'Cadence', element: 'neutre', pa: 1, range: [0, 5], target: 'ally', affectsCaster: true, effects: [Object.assign(pa(1, 1), { selfNow: 2 })], maxPerTurn: 1, desc: '+1 PA à un allié pour son prochain tour ; sur soi, +2 PA tout de suite.' });
spells.refrain = S('refrain', { name: 'Refrain', element: 'neutre', pa: 3, range: [0, 4], los: false, target: 'any', aoe: circle1, affects: 'allies', affectsCaster: true, effects: [pm(1, 1)], cooldown: 2, desc: '+1 PM aux alliés d\'une zone.' });
spells.dissonance = S('dissonance', { name: 'Dissonance', element: 'air', pa: 3, range: [1, 4], target: 'enemy', effects: [dmg(6, 9), pa(-2, 1)], cooldown: 2, desc: 'La cible perd 2 PA.' });
spells.note_vive = S('note_vive', { name: 'Note vive', element: 'air', pa: 3, range: [1, 5], effects: [dmg(10, 13)], desc: 'Un trait sonore.' });
spells.berceuse = S('berceuse', { name: 'Berceuse', element: 'air', pa: 3, range: [1, 4], target: 'enemy', effects: [dmg(4, 6), root], cooldown: 2, desc: 'Endort les jambes : la cible ne bouge plus un tour.' });
spells.envolee = S('envolee', { name: 'Envolée', element: 'neutre', pa: 2, range: [0, 4], target: 'ally', affectsCaster: true, effects: [pm(2, 1)], cooldown: 2, desc: '+2 PM à un allié pour son prochain tour.' });
spells.choeur = S('choeur', { name: 'Chœur', element: 'neutre', pa: 4, range: [0, 0], los: false, target: 'self', aoe: circle2, affects: 'allies', affectsCaster: true, effects: [shield(10, 2), heal(6, 8)], cooldown: 3, desc: 'Soigne et protège les alliés à 2 cases.' });
spells.cri = S('cri', { name: 'Cri', element: 'air', pa: 4, range: [1, 3], target: 'any', aoe: cross1, affects: 'enemies', effects: [dmg(10, 13), push(1)], desc: 'Repousse les ennemis d\'une croix.' });
spells.tempo = S('tempo', { name: 'Tempo', element: 'neutre', pa: 2, range: [0, 0], los: false, target: 'self', affectsCaster: true, effects: [power(20, 1), pm(1, 1)], cooldown: 2, desc: '+20 % de dégâts et +1 PM au prochain tour.' });
// L'Orpaillage de l'Enutrof (docs/ENUTROF-ANALYSE.md) : Silence laisse un écho 2 tours ; chaque retrait
// de PM qui porte ensuite sur la cible le fait résonner (5 à 7 air), 3 fois au plus.
spells.silence = S('silence', { name: 'Silence', element: 'air', pa: 3, range: [1, 4], effects: [dmg(6, 8), pm(-1, 1), { type: 'echo', turns: 2, min: 5, max: 7, element: 'air', uses: 3 }], desc: 'Blesse, ralentit, et laisse un écho : chaque PM perdu ensuite le fait résonner.' });

// ===== Thalor, Porteur : positionneur (terre, eau) =====
spells.transposition = S('transposition', { name: 'Transposition', element: 'neutre', pa: 2, range: [1, 4], effects: [{ type: 'swap' }], maxPerTurn: 2, desc: 'Échange sa place avec la cible, alliée ou ennemie.' });
spells.lancer = S('lancer', { name: 'Lancer', element: 'terre', pa: 3, range: [1, 1], effects: [dmg(10, 13), push(3)], desc: 'Jette la cible à 3 cases.' });
spells.projection = S('projection', { name: 'Projection', element: 'terre', pa: 3, range: [2, 5], effects: [dmg(5, 7), pull(3)], desc: 'Attire la cible de 3 cases.' });
spells.poigne = S('poigne', { name: 'Poigne', element: 'terre', pa: 3, range: [1, 1], effects: [dmg(15, 18)], lifestealIfState: { state: 'ivre', pct: 30 }, desc: 'Un coup de poing.' });
spells.ancre = S('ancre', { name: 'Ancre', element: 'eau', pa: 3, range: [1, 3], target: 'enemy', effects: [dmg(6, 8), root], cooldown: 2, desc: 'La cible ne bouge plus un tour.' });
// Gorgée de Cime : l'ivresse du Pandawa (docs/PANDAWA-ANALYSE.md). Ivre 2 tours : −1 PM tout de
// suite, −15 % de dégâts subis, et Poing Fermé et Prise d'Ours volent 30 % de leurs dégâts.
spells.gorgee_de_cime = S('gorgee_de_cime', { name: 'Gorgée de Cime', element: 'neutre', pa: 1, range: [0, 0], los: false, target: 'self', affectsCaster: true, effects: [state('ivre', 2), { type: 'armor', value: 15, turns: 2 }], selfEffects: [{ type: 'pmNow', value: -1 }], cooldown: 3, desc: 'Ivre 2 tours : −1 PM tout de suite, −15 % de dégâts subis, et les coups au contact volent de la vie.' });
spells.bascule = S('bascule', { name: 'Bascule', element: 'neutre', pa: 2, range: [1, 2], effects: [dmg(3, 5), push(1), pm(-1, 1)], desc: 'Pousse d\'une case et retire 1 PM.' });
// Les glyphes, sur le modèle du Féca (docs/FECA-ANALYSE.md) : une zone qui agit au début du tour de
// qui s'y tient, deux tours du lanceur ; un seul glyphe par tour. En réserve : aucune classe ne les a.
spells.glyphe_de_garde = S('glyphe_de_garde', { name: 'Glyphe de Garde', element: 'neutre', pa: 3, range: [0, 3], target: 'any', los: false, aoe: circle1, effects: [{ type: 'glyph', name: 'Glyphe de Garde', turns: 2, affects: 'allies', effects: [{ type: 'shield', pctOwnerHp: 8 }] }], cooldown: 2, desc: 'Trace un glyphe pour 2 tours : chaque allié qui commence son tour dedans, le lanceur compris, reçoit un bouclier de 8 % des PV du lanceur.' });
spells.glyphe_pesant = S('glyphe_pesant', { name: 'Glyphe Pesant', element: 'terre', pa: 3, range: [1, 4], target: 'any', aoe: circle1, effects: [{ type: 'glyph', name: 'Glyphe Pesant', turns: 2, affects: 'enemies', effects: [dmg(6, 8), pm(-2, 1)] }], cooldown: 3, desc: 'Trace un glyphe pour 2 tours : chaque ennemi qui commence son tour dedans subit 6 à 8 terre et perd 2 PM.' });
spells.mur_de_chair = S('mur_de_chair', { name: 'Mur de chair', element: 'neutre', pa: 2, range: [0, 0], los: false, target: 'self', affectsCaster: true, effects: [shield(20, 2)], cooldown: 3, desc: 'Un bouclier de 20.' });
spells.vague = S('vague', { name: 'Vague', element: 'terre', pa: 4, range: [1, 3], line: true, target: 'any', aoe: line3, effects: [dmg(12, 15), push(1)], cooldown: 1, desc: 'Une ligne de 3 cases qui repousse.' });
spells.etreinte = S('etreinte', { name: 'Étreinte', element: 'terre', pa: 4, range: [1, 1], effects: [dmg(17, 21), pa(-1, 1)], lifestealIfState: { state: 'ivre', pct: 30 }, desc: 'Serre fort : la cible perd 1 PA.' });
spells.elan = S('elan', { name: 'Élan', element: 'neutre', pa: 1, range: [0, 0], los: false, target: 'self', selfEffects: [{ type: 'pmNow', value: 1 }], cooldown: 1, desc: '+1 PM tout de suite.' });

// ===== Fennal, Meneur de Remontées : invocateur (neutre, terre) =====
spells.appel_du_grouk = S('appel_du_grouk', { name: 'Appel du Grouk', element: 'neutre', pa: 4, range: [1, 3], target: 'free', effects: [{ type: 'summon', monster: 'grouk_apprivoise', count: 1 }], cooldown: 2, desc: 'Invoque un Grouk apprivoisé, un cogneur.' });
spells.appel_du_pilou = S('appel_du_pilou', { name: 'Appel du Glym', element: 'neutre', pa: 3, range: [1, 3], target: 'free', effects: [{ type: 'summon', monster: 'pilou_apprivoise', count: 1 }], cooldown: 2, desc: 'Invoque un Glym apprivoisé, un harceleur.' });
// Rappel Sacrificiel prend aussi la force de la bête, sur le modèle de la Chimère de l'Osamodas
// (3.2) et de la transformation par sacrifice (Touch 1.68) : +25 % de dégâts ce tour et le suivant.
spells.rappel_sacrificiel = S('rappel_sacrificiel', { name: 'Rappel Sacrificiel', element: 'neutre', pa: 3, range: [0, 6], target: 'summon', effects: [{ type: 'sacrifice', min: 12, max: 16, radius: 1 }], selfEffects: [power(25, 1)], cooldown: 2, desc: 'Fait exploser une invocation : dégâts aux ennemis autour d\'elle, et le Fennal prend sa force (+25 % de dégâts ce tour et le suivant).' });
// La grande bête (3 de jauge), sur le modèle des invocations à 3 PI de l'Osamodas : elle protège.
spells.appel_du_molh = S('appel_du_molh', { name: 'Appel du Molh', element: 'neutre', pa: 4, range: [1, 2], target: 'free', effects: [{ type: 'summon', monster: 'molh_apprivoise', count: 1 }], cooldown: 3, desc: 'Invoque un Molh apprivoisé : lent, solide, il provoque les ennemis à son contact. Coûte 3 de jauge.' });
spells.morsure = S('morsure', { name: 'Morsure', element: 'terre', pa: 3, range: [1, 2], effects: [dmg(10, 13)], desc: 'Un coup de dents.' });
spells.soin_de_meute = S('soin_de_meute', { name: 'Soin de meute', element: 'neutre', pa: 3, range: [0, 5], target: 'ally', affectsCaster: true, effects: [heal(14, 18)], cooldown: 1, desc: 'Soigne un allié ou une bête.' });
spells.cri_de_ralliement = S('cri_de_ralliement', { name: 'Cri de ralliement', element: 'neutre', pa: 2, range: [0, 0], los: false, target: 'self', aoe: circle2, affects: 'allies', affectsCaster: true, effects: [power(30, 1)], cooldown: 3, desc: '+30 % de dégâts aux alliés à 2 cases.' });
spells.fleche_de_fil = S('fleche_de_fil', { name: 'Flèche de Fil', element: 'neutre', pa: 3, range: [1, 5], effects: [dmg(8, 11)], desc: 'Un tir simple.' });
spells.filet = S('filet', { name: 'Filet', element: 'neutre', pa: 2, range: [1, 4], target: 'enemy', effects: [dmg(3, 5), root], cooldown: 2, desc: 'La cible ne bouge plus un tour.' });
spells.eperon = S('eperon', { name: 'Éperon', element: 'neutre', pa: 2, range: [0, 5], target: 'summon', effects: [pa(3, 1)], maxPerTurn: 1, desc: '+3 PA à une invocation pour son prochain tour.' });
spells.traque = S('traque', { name: 'Traque', element: 'terre', pa: 4, range: [2, 6], effects: [dmg(17, 21)], maxPerTurn: 1, desc: 'Le tir lourd du Meneur.' });

// ===== Sorts des monstres =====
spells.m_bec = S('m_bec', { name: 'Coup de bec', element: 'air', pa: 3, range: [1, 3], target: 'enemy', effects: [dmg(4, 6), pm(-1, 1)], maxPerTurn: 1 });
spells.m_charge = S('m_charge', { name: 'Charge', element: 'terre', pa: 3, range: [1, 1], target: 'enemy', effects: [dmg(8, 11), push(1)] });
spells.m_toile = S('m_toile', { name: 'Toile', element: 'neutre', pa: 3, range: [1, 4], target: 'enemy', effects: [dmg(3, 5), root], maxPerTurn: 1 });
spells.m_morsure = S('m_morsure', { name: 'Morsure', element: 'neutre', pa: 3, range: [1, 1], target: 'enemy', effects: [dmg(6, 8)] });
spells.m_lueur = S('m_lueur', { name: 'Lueur', element: 'neutre', pa: 3, range: [0, 4], target: 'ally', aoe: cross1, affects: 'allies', affectsCaster: true, effects: [heal(10, 14)], maxPerTurn: 1 });
spells.m_etincelle = S('m_etincelle', { name: 'Étincelle', element: 'feu', pa: 3, range: [1, 3], target: 'enemy', effects: [dmg(4, 6)] });
spells.m_galet = S('m_galet', { name: 'Galet', element: 'terre', pa: 3, range: [2, 5], target: 'enemy', effects: [dmg(6, 8)] });
spells.m_charge_lourde = S('m_charge_lourde', { name: 'Charge lourde', element: 'terre', pa: 4, range: [1, 1], target: 'enemy', effects: [dmg(14, 18), push(2)] });
spells.m_pietinement = S('m_pietinement', { name: 'Piétinement', element: 'terre', pa: 2, range: [0, 0], los: false, target: 'self', aoe: circle1, affects: 'enemies', effects: [dmg(6, 8)], cooldown: 1 });
spells.m_ecrasement = S('m_ecrasement', { name: 'Écrasement', element: 'terre', pa: 4, range: [1, 1], target: 'enemy', effects: [dmg(14, 18)] });
spells.m_poing = S('m_poing', { name: 'Poing de scorie', element: 'terre', pa: 3, range: [1, 1], target: 'enemy', effects: [dmg(10, 13)] });
spells.m_bouffee = S('m_bouffee', { name: 'Bouffée', element: 'feu', pa: 3, range: [1, 3], los: false, target: 'any', aoe: cross1, affects: 'enemies', effects: [dmg(5, 7), dot('feu', 3, 2)] });
spells.m_pic = S('m_pic', { name: 'Pic', element: 'terre', pa: 3, range: [2, 4], line: true, target: 'enemy', effects: [dmg(9, 12)] });
spells.m_appel_braise = S('m_appel_braise', { name: 'Appel de braise', element: 'feu', pa: 3, range: [1, 3], target: 'free', effects: [{ type: 'summon', monster: 'braise', count: 1 }], cooldown: 1 });
spells.m_etreinte_braise = S('m_etreinte_braise', { name: 'Étreinte', element: 'feu', pa: 3, range: [1, 1], target: 'enemy', effects: [dmg(4, 6)] });
spells.m_martelement = S('m_martelement', { name: 'Martèlement', element: 'terre', pa: 4, range: [1, 4], line: true, target: 'any', aoe: line3, affects: 'enemies', effects: [dmg(34, 42)] });
spells.m_forge_mur = S('m_forge_mur', { name: 'Forge un mur', element: 'terre', pa: 2, range: [1, 3], los: false, target: 'free', effects: [{ type: 'obstacle', kind: 'rock', turns: 2 }], cooldown: 2 });
spells.m_trempe = S('m_trempe', { name: 'Trempe', element: 'eau', pa: 2, range: [0, 0], los: false, target: 'self', affectsCaster: true, effects: [heal(20, 26)], cooldown: 2 });
spells.m_dard = S('m_dard', { name: 'Dard', element: 'air', pa: 3, range: [2, 6], target: 'enemy', effects: [dmg(8, 11)] });
spells.m_pince = S('m_pince', { name: 'Pince', element: 'eau', pa: 3, range: [1, 1], target: 'enemy', effects: [dmg(9, 12)] });
spells.m_deferlante = S('m_deferlante', { name: 'Déferlante', element: 'eau', pa: 4, range: [1, 3], target: 'enemy', effects: [dmg(8, 11), push(2)] });
spells.m_serre = S('m_serre', { name: 'Serre', element: 'air', pa: 3, range: [1, 2], target: 'enemy', effects: [dmg(6, 9), pa(-1, 1)] });
spells.m_soin_noye = S('m_soin_noye', { name: 'Chant du noyé', element: 'eau', pa: 3, range: [0, 5], target: 'ally', affectsCaster: true, effects: [heal(12, 16)], maxPerTurn: 1 });
spells.m_corde = S('m_corde', { name: 'Corde', element: 'neutre', pa: 3, range: [1, 4], target: 'enemy', effects: [dmg(4, 6), root], maxPerTurn: 1 });
spells.m_vague_mere = S('m_vague_mere', { name: 'Vague mère', element: 'eau', pa: 4, range: [1, 4], line: true, target: 'any', aoe: line3, affects: 'enemies', effects: [dmg(10, 13), push(1)] });
spells.m_ressac = S('m_ressac', { name: 'Ressac', element: 'eau', pa: 3, range: [2, 5], target: 'enemy', effects: [dmg(7, 10)] });
spells.m_coup = S('m_coup', { name: 'Coup de corne', element: 'neutre', pa: 3, range: [1, 1], target: 'enemy', effects: [dmg(10, 14)] });
spells.m_soin = S('m_soin', { name: 'Lueur', element: 'neutre', pa: 3, range: [0, 5], target: 'ally', affectsCaster: true, effects: [heal(12, 16)], maxPerTurn: 1 });
spells.m_pique = S('m_pique', { name: 'Pique', element: 'neutre', pa: 3, range: [1, 3], target: 'enemy', effects: [dmg(6, 8)] });
spells.m_flamme = S('m_flamme', { name: 'Flamme', element: 'feu', pa: 3, range: [1, 4], target: 'enemy', effects: [dmg(11, 14)] });
spells.m_echange = S('m_echange', { name: 'Échange', element: 'neutre', pa: 2, range: [1, 5], target: 'enemy', effects: [dmg(3, 5), { type: 'swap' }], cooldown: 2 });
spells.m_lame_fendue = S('m_lame_fendue', { name: 'Lame fendue', element: 'air', pa: 3, range: [1, 1], target: 'enemy', effects: [dmg(9, 12)] });
spells.m_devorer = S('m_devorer', { name: 'Dévorer', element: 'neutre', pa: 3, range: [1, 1], target: 'enemy', effects: [{ type: 'devourShield' }, dmg(8, 11)] });
spells.m_fente = S('m_fente', { name: 'Fente', element: 'air', pa: 4, range: [1, 5], line: true, target: 'any', aoe: line3, affects: 'enemies', effects: [dmg(11, 14)] });
spells.m_dechirure = S('m_dechirure', { name: 'Déchirure', element: 'neutre', pa: 3, range: [1, 3], target: 'enemy', effects: [dmg(8, 10), pa(-1, 1)] });
spells.m_frisson = S('m_frisson', { name: 'Frisson', element: 'eau', pa: 3, range: [1, 3], target: 'enemy', effects: [dmg(7, 9), pa(-1, 1)] });
spells.m_morsure_vrill = S('m_morsure_vrill', { name: 'Morsure de ver', element: 'terre', pa: 3, range: [1, 1], target: 'enemy', effects: [dmg(10, 13), push(1)] });
spells.m_os = S('m_os', { name: 'Os tissé', element: 'neutre', pa: 3, range: [2, 6], line: true, target: 'enemy', effects: [dmg(9, 12)] });
spells.m_appel_tissefil = S('m_appel_tissefil', { name: 'Appel des toiles', element: 'neutre', pa: 3, range: [1, 3], target: 'free', effects: [{ type: 'summon', monster: 'tissefil', count: 1 }], cooldown: 2 });
spells.m_toile_ancienne = S('m_toile_ancienne', { name: 'Toile ancienne', element: 'neutre', pa: 2, range: [1, 4], los: false, target: 'free', effects: [{ type: 'obstacle', kind: 'rock', turns: 2 }], cooldown: 2 });
spells.m_crocs = S('m_crocs', { name: 'Crocs', element: 'neutre', pa: 3, range: [1, 1], target: 'enemy', effects: [dmg(9, 12)] });
spells.m_poing_pierre = S('m_poing_pierre', { name: 'Poing de pierre', element: 'terre', pa: 4, range: [1, 1], target: 'enemy', effects: [dmg(14, 18)] });
spells.m_coup_dechu = S('m_coup_dechu', { name: 'Coup déchu', element: 'neutre', pa: 3, range: [1, 2], target: 'enemy', effects: [dmg(10, 13)] });
spells.m_tir_tourelle = S('m_tir_tourelle', { name: 'Tir de tourelle', element: 'neutre', pa: 3, range: [1, 5], target: 'enemy', effects: [dmg(8, 10)] });
spells.m_coup_grouk = S('m_coup_grouk', { name: 'Coup de Grouk', element: 'terre', pa: 3, range: [1, 1], target: 'enemy', effects: [dmg(8, 11)] });
spells.m_bec_pilou = S('m_bec_pilou', { name: 'Bec de Glym', element: 'air', pa: 3, range: [2, 5], target: 'enemy', effects: [dmg(5, 7), pm(-1, 1)] });

// ===== Rangs des sorts =====
// Comme dans Dofus Touch, chaque sort de classe monte du rang 1 au rang 5 avec des points de sort :
// un point par niveau gagné (js/character.js), et passer du rang r au rang r + 1 en coûte r (1, 2,
// 3, 4 : dix points pour le rang 5). Les rangs 2 à 4 demandent seulement le sort débloqué ; le rang
// 5 demande le niveau 50 (le dernier rang de Dofus s'obtient au niveau 100, et un niveau de Veylan
// en vaut deux, docs/QUETES.md) : il est hors d'atteinte dans l'alpha.
// Chaque rang multiplie les dégâts, les soins, les boucliers, les brûlures et les bonus en % du sort
// (`mult`, et `multLong` pour un sort à longue portée, réglés au bot d'équilibrage) ; des bonus
// communs s'y ajoutent (portée, relance, lancers), et des exceptions par sort (DATA.rankOverrides).
// Le rang 1 est le sort tel qu'il est écrit plus haut.
// DATA.spellAtRank donne le sort tel que le moteur le lance à un rang (js/combat.js, spellOf) ;
// DATA.rankChanges dit ce qui change d'un rang au suivant (fenêtre Sorts, docs/COMBAT.md).
DATA.spellRanks = {
  max: 5,
  costs: [1, 2, 3, 4],                  // du rang r au rang r + 1
  levels: [1, 1, 1, 1, 50],             // niveau du personnage requis pour chaque rang
  mult: [1, 1.05, 1.1, 1.15, 1.25],     // dégâts, soins, boucliers, brûlures, bonus en %
  // +1 portée maximale au rang 3 pour un sort chiffré à longue portée (5 ou plus) ; un sort sans
  // valeur chiffrée qui se lance à distance (déplacement, appel, placement) gagne +1 portée aux
  // rangs 2, 3 et 5.
  longRange: 5, rangeRank: 3, utilityRangeRanks: [2, 3, 5],
  // Le sort chiffré à longue portée gagne moins en valeurs : à distance, on frappe sans être frappé.
  // Au bot d'équilibrage, avec ×1,15 pour tous au rang 4, les classes à distance passaient au-dessus
  // de 92 % de victoires (Lyssar, Mirel 93 %) ; ×1,10 les ramène dans la cible.
  multLong: [1, 1.03, 1.06, 1.1, 1.2],
  // −1 tour de relance au rang 4 pour une relance de 2 tours ou plus.
  cooldownFrom: 2, cooldownRank: 4,
  // +1 lancer par tour au rang 4 pour un sort de 2 PA ou moins limité en lancers.
  cheapPa: 2, castsRank: 4,
};

// Exceptions : `mult` remplace les multiplicateurs communs pour ce sort ; `sans` retire un bonus
// commun qui casserait le kit (`portee`, `relance`, `lancers`).
// Un rang ajoute ses changements, gardés aux rangs suivants : `pa`, `portee`, `relance` et
// `lancers` s'ajoutent au sort, `fixe` impose des champs du sort ; `effet` nomme un type d'effet
// (du sort ou sur soi) dont les autres champs s'ajoutent ; `soi` ajoute un effet sur soi, ou
// renforce celui du même type.
DATA.rankOverrides = {
  // Une invisibilité à chaque tour ne laisserait plus de fenêtre pour la frapper : à la place, de
  // quoi se replacer en disparaissant, et un PA de moins.
  voile_penombre: { sans: ['relance'], 2: { soi: { type: 'pmNow', value: 1 } }, 3: { pa: -1 }, 4: { soi: { type: 'pmNow', value: 1 } }, 5: { soi: { type: 'pmNow', value: 1 } } },
  // Deux Prix du Sang par tour, c'est +4 PA pour 30 % des PV ; le prix baisse à la place.
  serment_de_sang: { sans: ['lancers'], 2: { effet: 'selfDamagePct', pct: -1 }, 3: { effet: 'selfDamagePct', pct: -2 }, 4: { effet: 'selfDamagePct', pct: -2 }, 5: { effet: 'selfDamagePct', pct: -2 } },
  // Deux Temps Forts par tour sur soi, c'est +2 PA nets ; à la place, l'allié garde son PA deux tours.
  cadence: { sans: ['lancers'], 4: { effet: 'pa', duration: 1 } },
  // Ce qui enracine ou ralentit sur deux tours garde sa relance : relancé à chaque tour, la cible ne
  // bougerait plus jamais.
  berceuse: { sans: ['relance'] },
  ancre: { sans: ['relance'] },
  filet: { sans: ['relance'] },
  fleche_ancre: { sans: ['relance'] },
  // Les sorts sur soi sans chiffre : plus loin, plus longtemps, plus souvent.
  repli_traqueur: { 2: { effet: 'retreat', cells: 1 }, 3: { effet: 'retreat', cells: 1 }, 5: { effet: 'retreat', cells: 1 } },
  corde_longue: { 2: { effet: 'range', value: 1 }, 3: { effet: 'range', turns: 1 }, 5: { effet: 'range', value: 1 } },
  elan: { 2: { effet: 'pmNow', value: 1 }, 3: { fixe: { cooldown: 0, maxPerTurn: 2 } }, 4: { soi: { type: 'pm', value: 1, duration: 1 } }, 5: { effet: 'pmNow', value: 1 } },
};

(() => {
  const R = DATA.spellRanks;
  const JET = new Set(['damage', 'heal', 'sacrifice', 'echo']);    // un jet min à max : multiplicateur `mult`
  const VALEUR = new Set(['shield', 'dot']);                // arrondis par le moteur, à l'échelle du lanceur
  const POURCENT = new Set(['power', 'vuln', 'guard']);     // des % entiers, arrondis ici
  const chiffre = list => (list || []).some(ef => JET.has(ef.type) || VALEUR.has(ef.type) || POURCENT.has(ef.type) || ef.type === 'oath' || chiffre(ef.effects));
  const scaled = (list, m) => list.map(ef => {
    const o = Object.assign({}, ef);
    if (m !== 1) {
      if (JET.has(o.type)) o.mult = (o.mult || 1) * m;
      else if (VALEUR.has(o.type)) o.value *= m;
      else if (POURCENT.has(o.type)) o.value = Math.round(o.value * m);
      else if (o.type === 'oath') { o.power = Math.round(o.power * m); o.burn *= m; }
    }
    if (o.effects) o.effects = scaled(o.effects, m);   // pièges, bonds
    return o;
  });
  const patch = (s, p) => {
    if (p.pa) s.pa = Math.max(1, s.pa + p.pa);
    if (p.portee && s.target !== 'self') s.range = [s.range[0], s.range[1] + p.portee];
    if (p.relance) s.cooldown = Math.max(0, (s.cooldown || 0) + p.relance);
    if (p.lancers) s.maxPerTurn = (s.maxPerTurn || 0) + p.lancers;
    if (p.fixe) Object.assign(s, p.fixe);
    if (p.effet) for (const ef of s.effects.concat(s.selfEffects || [])) if (ef.type === p.effet) for (const k in p) if (k !== 'effet' && typeof ef[k] === 'number') ef[k] += p[k];
    if (p.soi) {
      s.selfEffects = s.selfEffects || [];
      const same = s.selfEffects.find(ef => ef.type === p.soi.type);
      if (same) same.value += p.soi.value; else s.selfEffects.push(Object.assign({}, p.soi));
    }
  };

  // Le sort `s` (celui des données, ou sa version dans la voie du personnage) au rang `rank`.
  DATA.spellAtRank = (s, rank) => {
    rank = Math.max(1, Math.min(R.max, Math.floor(rank) || 1));
    const ov = DATA.rankOverrides[s.id] || {};
    const m = DATA.rankMult(s, rank);
    const o = Object.assign({}, s, { rank, effects: scaled(s.effects, m) });
    if (s.selfEffects) o.selfEffects = scaled(s.selfEffects, m);
    const sans = ov.sans || [];
    if (s.target !== 'self' && !sans.includes('portee')) {
      const bonus = DATA.rankScales(s)
        ? (DATA.rankLong(s) && rank >= R.rangeRank ? 1 : 0)
        : R.utilityRangeRanks.filter(r => rank >= r).length;
      if (bonus) o.range = [s.range[0], s.range[1] + bonus];
    }
    if ((s.cooldown || 0) >= R.cooldownFrom && rank >= R.cooldownRank && !sans.includes('relance')) o.cooldown = s.cooldown - 1;
    if (s.maxPerTurn && s.pa <= R.cheapPa && rank >= R.castsRank && !sans.includes('lancers')) o.maxPerTurn = s.maxPerTurn + 1;
    for (let r = 2; r <= rank; r++) if (ov[r]) patch(o, ov[r]);
    return o;
  };

  // Un sort a-t-il des valeurs que le rang multiplie (dégâts, soins, boucliers, brûlures, bonus) ?
  DATA.rankScales = s => chiffre(s.effects) || chiffre(s.selfEffects);

  // Un sort chiffré à longue portée (portée maximale de 5 ou plus, hors sorts sur soi) : il gagne de
  // la portée au rang 3 et suit `multLong`.
  DATA.rankLong = s => s.target !== 'self' && s.range[1] >= R.longRange && DATA.rankScales(s) && !((DATA.rankOverrides[s.id] || {}).sans || []).includes('portee');

  // Multiplicateur d'un sort à un rang : le sien s'il en a un (DATA.rankOverrides), sinon celui des
  // sorts à longue portée ou le commun.
  DATA.rankMult = (s, rank) => ((DATA.rankOverrides[s.id] || {}).mult || (DATA.rankLong(s) ? R.multLong : R.mult))[rank - 1];

  // Ce qu'un effet affiche : les jets et valeurs arrondis au rang, pour comparer deux rangs.
  DATA.rankShown = ef => {
    const o = {};
    for (const k in ef) {
      if (k === 'mult' || k === 'type') continue;
      if (k === 'effects') o.effects = ef.effects.map(DATA.rankShown);
      else if ((k === 'min' || k === 'max') && JET.has(ef.type)) o[k] = Math.round(ef[k] * (ef.mult || 1));
      else if (typeof ef[k] === 'number') o[k] = Math.round(ef[k]);
    }
    return o;
  };

  // Ce qui change du rang `rank` − 1 au rang `rank` : [{ cle, avant, apres }], `cle` étant
  // 'mult', 'pa', 'range', 'cooldown', 'maxPerTurn', 'effet' ou 'soi' (avec l'effet entier).
  DATA.rankChanges = (s, rank) => {
    if (rank < 2 || rank > R.max) return [];
    const a = DATA.spellAtRank(s, rank - 1), b = DATA.spellAtRank(s, rank);
    const out = [];
    if (DATA.rankScales(s) && DATA.rankMult(s, rank) !== DATA.rankMult(s, rank - 1)) out.push({ cle: 'mult', avant: DATA.rankMult(s, rank - 1), apres: DATA.rankMult(s, rank) });
    for (const k of ['pa', 'cooldown', 'maxPerTurn']) if ((a[k] || 0) !== (b[k] || 0)) out.push({ cle: k, avant: a[k] || 0, apres: b[k] || 0 });
    if (a.target !== 'self' && (a.range[0] !== b.range[0] || a.range[1] !== b.range[1])) out.push({ cle: 'range', avant: a.range, apres: b.range });
    const sig = ef => ef ? JSON.stringify(DATA.rankShown(ef)) : '';
    for (const [cle, la, lb] of [['effet', a.effects, b.effects], ['soi', a.selfEffects || [], b.selfEffects || []]]) {
      for (let i = 0; i < Math.max(la.length, lb.length); i++) if (sig(la[i]) !== sig(lb[i])) out.push({ cle, avant: la[i] || null, apres: lb[i] || null });
    }
    return out;
  };
})();

// ===== Les classes jouables =====
// Les stats sont celles du prototype, pas celles du jeu final ; les dix sorts tiennent dans la barre.
DATA.classes = {
  vaelith: { id: 'vaelith', name: 'Vaelith', title: 'Tisseur des Voiles', role: 'Contrôle', glyph: 'V', color: '#4a90ff', hp: 105, pa: 6, pm: 3, initiative: 100,
    spells: ['eclat', 'givre', 'bourrasque', 'secousse', 'pas_de_voile', 'lame_orage', 'retour_de_voile', 'siphon', 'nova', 'attraction'],
    desc: 'Pousse, attire, gèle, se téléporte et prend la place des autres ; gagne par le placement, jamais par la force.' },
  // Les trois classes de l'alpha (docs/CLASSES-PRINCIPALES.md) portent leur mécanique propre :
  // `fury` (Fureur du Sarkan : maximum, gain quand un ennemi le frappe au contact) et `affut`
  // (Affût du Lyssar : portée et % de dégâts tant qu'il n'a pas bougé de son tour).
  sarkan: { id: 'sarkan', name: 'Sarkan', title: 'Lame-Serment', role: 'Épéiste', glyph: 'S', color: '#c9a35c', hp: 145, pa: 6, pm: 3, initiative: 70, resist: { terre: 15 },
    fury: { max: 5, onMeleeHit: 1 },
    spells: ['taille_franche', 'saut_delan', 'serment_jure', 'garde_de_scorie', 'lame_tournoyante', 'defi', 'poigne_juree', 'lame_de_braise', 'ferveur', 'verdict'],
    desc: 'Saute dans la mêlée, jure contre une cible et ne la lâche plus ; sa Fureur monte à chaque coup, et le Verdict la dépense.' },
  lyssar: { id: 'lyssar', name: 'Lyssar', title: 'Traqueur', role: 'Archer', glyph: 'L', color: '#2fbf71', hp: 85, pa: 6, pm: 3, initiative: 115,
    affut: { range: 1, power: 15 },
    spells: ['trait_tisse', 'fil_tendu', 'collet', 'repli_traqueur', 'balise_de_fil', 'corde_longue', 'marque_traqueur', 'pluie_de_fil', 'fleche_ancre', 'trait_du_veilleur'],
    desc: 'Choisit sa case et ne bouge plus : à l\'affût, il tire plus loin et plus fort, repousse ce qui approche et pose ses collets.' },
  oriel: { id: 'oriel', name: 'Oriel', title: 'Veilleur de Lumière', role: 'Soigneur', glyph: 'O', color: '#ffd166', hp: 110, pa: 6, pm: 3, initiative: 90,
    spells: ['lueur', 'eclair_solaire', 'manteau_partage', 'rappel', 'flamme_vive', 'renaissance', 'aube', 'lumiere_aveuglante', 'lanterne_de_veille', 'ardeur'],
    desc: 'Soigne, pose des boucliers, retire les malus ; ses flammes rendent des PV.' },
  nerith: { id: 'nerith', name: 'Nerith', title: "Lame d'Ombre", role: 'Voleuse', glyph: 'N', color: '#9b59d0', hp: 90, pa: 6, pm: 3, initiative: 135,
    spells: ['double_entaille', 'voile_penombre', 'piege_penombre', 'larcin', 'pas_ombre', 'coup_penombre', 'main_leste', 'piege_de_reflux', 'leurre_penombre', 'dernier_souffle_ombre'],
    desc: 'Disparaît, choisit son moment et frappe ; vole les PA, les PM et les boucliers, et vide les poches de ce qu\'elle achève.' },
  // `armed` : l'état Armé du Forgelance (docs/FORGELANCE-ANALYSE.md) : tant que sa tourelle n'est pas
  // posée, le Kaldrin subit `reduction` % de dégâts en moins.
  kaldrin: { id: 'kaldrin', name: 'Kaldrin', title: 'Mécaniste', role: 'Mécanismes', glyph: 'K', color: '#ff7a45', hp: 130, pa: 6, pm: 3, initiative: 70,
    armed: { reduction: 10, summon: 'tourelle' },
    spells: ['tourelle_de_kaldum', 'mur_articule', 'mine_a_fil', 'marteau', 'surchauffe', 'reparation', 'propulseur', 'grappin', 'detonation', 'forge'],
    desc: 'Pose des tourelles, des murs, des mines ; fait éclater sa tourelle, et tient mieux tant qu\'elle n\'est pas posée.' },
  // `blood` : Sang Versé, le passif du Sacrieur (docs/SACRIEUR-ANALYSE.md) : +1 % de dégâts et −1 %
  // de dégâts subis par `per` % de PV perdus, au plus `max` % (le plafond de la 2.59).
  karsh: { id: 'karsh', name: 'Karsh', title: 'Lame de Sang', role: 'Mêlée', glyph: 'Kr', color: '#d9452b', hp: 150, pa: 6, pm: 3, initiative: 80,
    blood: { per: 5, max: 15 },
    spells: ['serment_de_sang', 'charge', 'taillade', 'dernier_souffle', 'hurlement', 'sang_pour_sang', 'lien_de_sang', 'colosse', 'frappe_lourde', 'rage'],
    desc: 'Plus il est blessé, plus il frappe et moins il encaisse ; dépense ses PV pour des PA, ramène ses proies au contact.' },
  mirel: { id: 'mirel', name: 'Mirel', title: 'Chantre', role: 'Soutien', glyph: 'M', color: '#a8e6d8', hp: 105, pa: 6, pm: 3, initiative: 100,
    spells: ['cadence', 'refrain', 'dissonance', 'note_vive', 'berceuse', 'envolee', 'choeur', 'cri', 'tempo', 'silence'],
    desc: 'Donne des PA et des PM, chante des zones, affaiblit l\'ennemi.' },
  thalor: { id: 'thalor', name: 'Thalor', title: 'Porteur', role: 'Positionneur', glyph: 'T', color: '#8a93a6', hp: 175, pa: 6, pm: 3, initiative: 75,
    spells: ['transposition', 'lancer', 'projection', 'poigne', 'ancre', 'gorgee_de_cime', 'elan', 'vague', 'etreinte', 'mur_de_chair'],
    desc: 'Lance, attire, échange les places ; le roi des combos.' },
  // summonGauge : la jauge de meute (docs/OSAMODAS-ANALYSE.md) ; chaque bête coûte son summonCost.
  fennal: { id: 'fennal', name: 'Fennal', title: 'Meneur de Remontées', role: 'Invocateur', glyph: 'F', color: '#6fdc8c', hp: 110, pa: 6, pm: 3, initiative: 85, summonGauge: 4,
    spells: ['appel_du_grouk', 'appel_du_pilou', 'rappel_sacrificiel', 'morsure', 'soin_de_meute', 'cri_de_ralliement', 'fleche_de_fil', 'filet', 'appel_du_molh', 'traque'],
    desc: 'Mène une meute (jauge de 4 : Glym 1, Grouk 2, Molh 3), la sacrifie pour prendre sa force.' },
};
// Caractéristique principale conseillée (répartition automatique) et bonus de PV de classe
// (les PV du laboratoire servent de référence : 120 est la moyenne ; hors laboratoire, les PV
// du personnage sont multipliés par PV de classe / 120, js/character.js).
const MAIN_STAT = { vaelith: 'intel', sarkan: 'force', lyssar: 'agi', oriel: 'intel', nerith: 'agi', kaldrin: 'intel', karsh: 'intel', mirel: 'agi', thalor: 'force', fennal: 'force' };
for (const id in DATA.classes) {
  const c = DATA.classes[id];
  c.shape = 'player'; c.resist = c.resist || {};
  c.hpBonus = c.hp - 120;
  c.mainStat = MAIN_STAT[id] || 'force';
}
DATA.defaultClass = 'vaelith';

// Les deux classes prévues après le lancement, nommées mais pas encore jouables.
DATA.futureClasses = {
  kaelum: { id: 'kaelum', name: 'Kaelum', title: 'Déchireur', role: 'Dégâts de zone', season: 1 },
  lheth: { id: 'lheth', name: 'Lheth', title: 'Horloger des Voiles', role: 'Contrôle du temps', season: 2 },
};

// ===== Les monstres =====
// ai : 'melee' fonce au contact · 'ranged' garde ses distances · 'support' soigne d'abord · 'summoner' invoque d'abord.
// dmgMult : puissance propre du monstre (dégâts et soins), en plus de DATA.rules.monsterDamageMult.
// triggers : { when: 'hpBelow', pct, do: [...] } · { when: 'turnStart', do } · { when: 'hitByElement', element, do } · { when: 'death', do }
//   actions : summon {monster,count} · buff {effects} · heal {pct} · toggleState {name} · rotateImmunity {elements}
//             flood · shiftHoles {count} · explode {min,max,element,radius}
const M = (id, def) => { def.id = id; def.resist = def.resist || {}; def.triggers = def.triggers || []; return def; };
DATA.monsters = {
  // --- Les Nichées, Orsane ---
  pilou: M('pilou', { name: 'Glym Ancestral', region: 'orsane', level: '1 à 8', shape: 'diamond', color: '#9fd7ff', hp: 35, dmgMult: 0.65, pa: 6, pm: 4, initiative: 100, spells: ['m_bec'], ai: 'ranged',
    desc: 'Harceleur volant. Vole 1 PM à sa cible quand il touche.' }),
  grouk: M('grouk', { name: 'Grouk', region: 'orsane', level: '3 à 20', shape: 'triangle', color: '#b08a4a', hp: 36, dmgMult: 1.15, pa: 6, pm: 3, initiative: 60, resist: { terre: 10 }, spells: ['m_charge'], ai: 'melee',
    desc: 'Cogneur. Charge et pousse d\'une case.' }),
  tissefil: M('tissefil', { name: 'Tissefil', region: 'orsane', level: '5 à 18', shape: 'hex', color: '#cfcfcf', hp: 35, dmgMult: 0.55, pa: 6, pm: 2, initiative: 80, spells: ['m_toile', 'm_morsure'], ai: 'ranged',
    desc: 'Contrôleur. Ses toiles enracinent un tour.' }),
  veilloche: M('veilloche', { name: 'Veilloche', region: 'orsane', level: '8 à 20', shape: 'circle', color: '#ffd166', hp: 36, dmgMult: 1.65, pa: 6, pm: 2, initiative: 70, resist: { eau: -100 }, spells: ['m_lueur', 'm_etincelle'], ai: 'support',
    desc: 'Soigneur. Lanterne vivante qui soigne en croix ; un sort d\'eau lui fait le double de dégâts.' }),
  brimbe: M('brimbe', { name: 'Brimbe', region: 'orsane', level: '10 à 20', shape: 'square', color: '#a0a0a0', hp: 45, dmgMult: 0.55, pa: 6, pm: 3, initiative: 90, spells: ['m_galet'], ai: 'ranged',
    desc: 'Tireur. Lance des galets et recule.' }),
  grand_grouk: M('grand_grouk', { name: 'Le Grand Grouk', region: 'orsane', level: '15 à 20', boss: true, shape: 'triangle', color: '#8a6a2a', hp: 220, dmgMult: 0.4, pa: 6, pm: 3, initiative: 50, resist: { terre: 20 }, spells: ['m_charge_lourde', 'm_pietinement'], ai: 'melee',
    triggers: [{ when: 'hpBelow', pct: 60, do: [{ act: 'summon', monster: 'grouk', count: 2 }, { act: 'log', text: 'Le Grand Grouk appelle sa horde.' }] }, { when: 'hpBelow', pct: 30, do: [{ act: 'buff', effects: [power(50, 99)] }, { act: 'log', text: 'Le Grand Grouk s\'enrage.' }] }],
    desc: 'Boss. Appelle deux Grouks à 60 % de vie, s\'enrage à 30 %.' }),

  // --- Les Scories, Kaldum ---
  molh: M('molh', { name: 'Molh', region: 'kaldum', level: '12 à 30', shape: 'square', color: '#8a93a6', hp: 75, dmgMult: 0.8, pa: 4, pm: 3, initiative: 20, resist: { terre: 30, feu: -20 }, spells: ['m_ecrasement'], ai: 'melee',
    desc: 'Tank. Masse de pierre lente, terre +30 %, feu −20 %.' }),
  kaldrik: M('kaldrik', { name: 'Rakthul', region: 'kaldum', level: '14 à 32', shape: 'square', color: '#6b4f3a', hp: 87, dmgMult: 1.1, pa: 6, pm: 3, initiative: 55, resist: { feu: -20 }, spells: ['m_poing'], ai: 'melee',
    triggers: [{ when: 'hitByElement', element: 'feu', do: [{ act: 'buff', effects: [pm(-1, 1)] }] }],
    desc: 'Cogneur. Chaque sort de feu reçu le fait fondre : −1 PM.' }),
  fumerolle: M('fumerolle', { name: 'Fumerolle', region: 'kaldum', level: '16 à 34', shape: 'circle', color: '#d0d0e0', hp: 41, dmgMult: 0.5, pa: 6, pm: 3, initiative: 95, resist: { feu: 30, air: -30 }, spells: ['m_bouffee'], ai: 'ranged',
    triggers: [{ when: 'turnStart', do: [{ act: 'toggleState', name: 'invisible' }] }],
    desc: 'Contrôleur. Brûle en croix, invisible un tour sur deux.' }),
  pioche_vive: M('pioche_vive', { name: 'Pioche-Vive', region: 'kaldum', level: '18 à 36', shape: 'diamond', color: '#b0b0b0', hp: 80, dmgMult: 0.9, pa: 6, pm: 2, initiative: 65, spells: ['m_pic'], ai: 'ranged',
    desc: 'Tireur. Frappe en ligne à 2 à 4 cases.' }),
  cendrou: M('cendrou', { name: 'Cendrou', region: 'kaldum', level: '19 à 40', shape: 'hex', color: '#ff9a3c', hp: 60, dmgMult: 1.5, pa: 6, pm: 2, initiative: 75, resist: { feu: 30 }, spells: ['m_appel_braise', 'm_etincelle'], ai: 'summoner',
    desc: 'Invocateur. Appelle des braises à 1 PV qui explosent en mourant.' }),
  dorm: M('dorm', { name: 'Dorm, le Forgeron Enseveli', region: 'kaldum', level: '28 à 40', boss: true, shape: 'square', color: '#5b4636', hp: 280, dmgMult: 0.5, pa: 6, pm: 3, initiative: 40, resist: { terre: 30, feu: 30, eau: -30 }, spells: ['m_martelement', 'm_forge_mur', 'm_trempe'], ai: 'melee',
    triggers: [{ when: 'hpBelow', pct: 50, do: [{ act: 'buff', effects: [power(30, 99)] }, { act: 'log', text: 'Dorm chauffe à blanc.' }] }],
    desc: 'Boss. Martèle une ligne, forge des murs, se trempe pour se soigner. L\'eau lui fait mal.' }),

  // --- Les Marées, Thessa ---
  sivr: M('sivr', { name: 'Sivr', region: 'thessa', level: '30 à 38', shape: 'diamond', color: '#2fbf71', hp: 40, pa: 6, pm: 4, initiative: 90, resist: { air: 20, terre: -10 }, spells: ['m_dard'], ai: 'ranged',
    desc: 'Tireur nerveux. Garde ses distances.' }),
  marnel: M('marnel', { name: 'Marnel', region: 'thessa', level: '32 à 40', shape: 'square', color: '#d97b4a', hp: 85, pa: 6, pm: 2, initiative: 40, resist: { eau: 30 }, spells: ['m_pince'], ai: 'melee',
    triggers: [{ when: 'hpBelow', pct: 50, do: [{ act: 'buff', effects: [pm(2, 99), power(20, 99)] }, { act: 'log', text: 'Le Marnel perd sa carapace et s\'affole.' }] }],
    desc: 'Tank. Perd sa carapace sous 50 % de vie et devient rapide.' }),
  brisant: M('brisant', { name: 'Brisant', region: 'thessa', level: '36 à 44', shape: 'triangle', color: '#4fb3ff', hp: 70, pa: 6, pm: 3, initiative: 85, resist: { eau: 50, feu: -20 }, spells: ['m_deferlante'], ai: 'melee',
    desc: 'Cogneur. Vague vivante, pousse de deux cases.' }),
  harpide: M('harpide', { name: 'Harpide', region: 'thessa', level: '38 à 46', shape: 'diamond', color: '#e8e8e8', hp: 50, pa: 6, pm: 4, initiative: 115, resist: { air: 30 }, spells: ['m_serre'], ai: 'ranged',
    desc: 'Harceleur. Griffe et retire 1 PA.' }),
  noye: M('noye', { name: 'Noyé', region: 'thessa', level: '40 à 50', shape: 'circle', color: '#5c7a8a', hp: 75, pa: 6, pm: 2, initiative: 60, spells: ['m_soin_noye', 'm_corde'], ai: 'support',
    desc: 'Soigneur et contrôleur. Soigne les Marées, enracine d\'une corde.' }),
  mere_des_brisants: M('mere_des_brisants', { name: 'La Mère des Brisants', region: 'thessa', level: '45 à 50', boss: true, shape: 'circle', color: '#2a6fb0', hp: 260, pa: 6, pm: 2, initiative: 70, resist: { eau: 50 }, spells: ['m_vague_mere', 'm_ressac'], ai: 'ranged',
    triggers: [{ when: 'turnStart', do: [{ act: 'flood' }] }],
    desc: 'Boss. La marée monte : à chacun de ses tours, une rangée de plus est inondée, et qui s\'y tient boit la tasse.' }),

  // --- Les Déchirés, la Lisière ---
  vulk: M('vulk', { name: 'Vulk', region: 'lisiere', level: '40 à 48', shape: 'triangle', color: '#d9452b', hp: 60, pa: 6, pm: 3, initiative: 60, resist: { feu: 10, terre: -10 }, spells: ['m_coup'], ai: 'melee',
    desc: 'Brute cornue. Cogne deux fois par tour.' }),
  ferrel: M('ferrel', { name: 'Ferrel', region: 'lisiere', level: '42 à 50', shape: 'circle', color: '#e9c23c', hp: 50, pa: 6, pm: 3, initiative: 70, resist: { eau: 15 }, spells: ['m_soin', 'm_pique'], ai: 'support',
    desc: 'Soigneur de meute. À abattre en premier.' }),
  zhaal: M('zhaal', { name: 'Zhaal', region: 'lisiere', level: '44 à 52', shape: 'hex', color: '#9b59d0', hp: 35, pa: 6, pm: 3, initiative: 110, resist: { feu: 30, eau: -20 }, spells: ['m_flamme'], ai: 'ranged',
    desc: 'Lanceur fragile. Frappe fort au feu.' }),
  fendu: M('fendu', { name: 'Fendu', region: 'lisiere', level: '46 à 56', shape: 'player', color: '#7a4a8a', hp: 70, pa: 6, pm: 3, initiative: 95, spells: ['m_echange', 'm_lame_fendue'], ai: 'melee',
    desc: 'Contrôleur. Humain déchiré, échange sa place avec sa cible.' }),
  mache_voile: M('mache_voile', { name: 'Mâche-Voile', region: 'lisiere', level: '50 à 60', shape: 'square', color: '#3a2a4a', hp: 110, pa: 6, pm: 2, initiative: 45, spells: ['m_devorer'], ai: 'melee',
    desc: 'Tank. Dévore les boucliers et se soigne d\'autant.' }),
  porte_fente: M('porte_fente', { name: 'Le Porte-Fente', region: 'lisiere', level: '55 à 60', boss: true, shape: 'hex', color: '#5a1a7a', hp: 300, pa: 6, pm: 3, initiative: 65, resist: { air: 20 }, spells: ['m_fente', 'm_dechirure'], ai: 'ranged',
    triggers: [{ when: 'turnStart', do: [{ act: 'shiftHoles', count: 4 }] }],
    desc: 'Boss. Ouvre des fentes sur la grille : quatre trous qui changent de place à chacun de ses tours.' }),

  // --- Les Remontées, les Bas-Voiles ---
  oubli: M('oubli', { name: 'Oubli', region: 'basvoiles', level: '50 à 60', shape: 'circle', color: '#2a2a3a', hp: 55, pa: 6, pm: 4, initiative: 120, resist: { neutre: 30 }, spells: ['m_frisson'], ai: 'ranged',
    triggers: [{ when: 'turnStart', do: [{ act: 'toggleState', name: 'invisible' }] }],
    desc: 'Harceleur. Ombre invisible un tour sur deux, retire des PA.' }),
  vrill: M('vrill', { name: 'Vrill', region: 'basvoiles', level: '55 à 65', shape: 'triangle', color: '#6a5a8a', hp: 90, pa: 6, pm: 3, initiative: 50, ghost: true, spells: ['m_morsure_vrill'], ai: 'melee',
    desc: 'Cogneur. Ver de voile : traverse les rochers, pousse.' }),
  craneux: M('craneux', { name: 'Crâneux', region: 'basvoiles', level: '58 à 70', shape: 'diamond', color: '#e0dcc8', hp: 75, pa: 6, pm: 2, initiative: 80, spells: ['m_os'], ai: 'ranged',
    triggers: [{ when: 'hpBelow', pct: 50, do: [{ act: 'heal', pct: 40 }, { act: 'log', text: 'Le Crâneux se recoud.' }] }],
    desc: 'Tireur. Squelette tissé, se recoud une fois à moitié vie.' }),
  tisseuse: M('tisseuse', { name: 'Tisseuse', region: 'basvoiles', level: '62 à 74', shape: 'hex', color: '#8a8a9a', hp: 120, pa: 6, pm: 2, initiative: 60, spells: ['m_appel_tissefil', 'm_toile_ancienne', 'm_crocs'], ai: 'summoner',
    desc: 'Contrôleur et invocateur. Tisse des murs, appelle des Tissefils.' }),
  thane: M('thane', { name: 'Thane', region: 'basvoiles', level: '70 à 80', shape: 'square', color: '#4a5a6a', hp: 160, pa: 4, pm: 2, initiative: 30, spells: ['m_poing_pierre'], ai: 'melee',
    triggers: [{ when: 'turnStart', do: [{ act: 'rotateImmunity', elements: ['feu', 'eau', 'air', 'terre'] }] }],
    desc: 'Tank. Gardien de pierre, immunisé à un élément qui change à chacun de ses tours.' }),
  veilleur_dechu: M('veilleur_dechu', { name: 'Le Veilleur Déchu', region: 'basvoiles', level: '75 à 80', boss: true, shape: 'player', color: '#1a1a2a', hp: 320, pa: 7, pm: 3, initiative: 100, resist: { feu: 10, eau: 10, air: 10, terre: 10, neutre: 10 }, spells: ['eclat', 'givre', 'lame_orage', 'siphon', 'manteau', 'm_coup_dechu'], ai: 'ranged',
    triggers: [{ when: 'hpBelow', pct: 40, do: [{ act: 'buff', effects: [power(40, 99), pa(1, 99)] }, { act: 'log', text: 'Le Veilleur Déchu se souvient de ce qu\'il était.' }] }],
    desc: 'Boss. Un ancien Veilleur qui tisse comme un Vaelith, et se souvient à 40 % de vie.' }),

  // --- Invocations ---
  tourelle: M('tourelle', { name: 'Tourelle', region: 'invocation', level: '', shape: 'square', color: '#ff7a45', hp: 30, pa: 3, pm: 0, initiative: 0, spells: ['m_tir_tourelle'], ai: 'ranged', summon: true,
    desc: 'Mécanisme du Kaldrin. Tire chaque tour, ne bouge pas.' }),
  grouk_apprivoise: M('grouk_apprivoise', { name: 'Grouk apprivoisé', region: 'invocation', level: '', shape: 'triangle', color: '#6fdc8c', hp: 45, pa: 6, pm: 3, initiative: 0, spells: ['m_coup_grouk'], ai: 'melee', summon: true, summonCost: 2,
    desc: 'Bête du Fennal. Un cogneur.' }),
  pilou_apprivoise: M('pilou_apprivoise', { name: 'Glym apprivoisé', region: 'invocation', level: '', shape: 'diamond', color: '#6fdc8c', hp: 25, pa: 6, pm: 4, initiative: 0, spells: ['m_bec_pilou'], ai: 'ranged', summon: true, summonCost: 1,
    desc: 'Bête du Fennal. Harcèle et retire 1 PM.' }),
  molh_apprivoise: M('molh_apprivoise', { name: 'Molh apprivoisé', region: 'invocation', level: '', shape: 'square', color: '#6fdc8c', hp: 70, pa: 4, pm: 2, initiative: 0, resist: { terre: 20 }, spells: ['m_ecrasement'], ai: 'melee', summon: true, summonCost: 3, taunt: 1,
    desc: 'Grande bête du Fennal. Lente et solide ; les ennemis à son contact ne peuvent frapper qu\'elle.' }),
  // La silhouette du Leurre de Pénombre : ses PV sont taillés dans ceux de la Nerith (30 %), elle
  // provoque les ennemis à son contact (`taunt`) et éclate en tombant, sans toucher son camp.
  lanterne_de_veille: M('lanterne_de_veille', { name: 'Lanterne de Veille', region: 'invocation', level: '', shape: 'circle', color: '#ffd166', hp: 25, pa: 3, pm: 0, initiative: 0, spells: ['m_lanterne_soin'], ai: 'ranged', summon: true, fixed: true,
    triggers: [{ when: 'death', do: [{ act: 'glyph', name: 'Halo de la Lanterne', turns: 2, size: 1, affects: 'allies', effects: [{ type: 'heal', min: 8, max: 11 }] }] }],
    desc: 'Lanterne de l\'Oriel. Soigne les alliés blessés ; en tombant, laisse un halo qui soigne 2 tours.' }),
  balise_de_fil: M('balise_de_fil', { name: 'Balise de Fil', region: 'invocation', level: '', shape: 'diamond', color: '#35d6c8', hp: 20, pa: 0, pm: 0, initiative: 0, spells: [], ai: 'inert', summon: true, swapOnOwnerHit: true,
    desc: 'Piquet du Lyssar. La première fois que le Lyssar est blessé, il prend la place du piquet.' }),
  silhouette_ombre: M('silhouette_ombre', { name: "Silhouette d'ombre", region: 'invocation', level: '', shape: 'diamond', color: '#6b3f99', hp: 27, pa: 0, pm: 0, initiative: 0, spells: [], ai: 'inert', summon: true, fixed: true, taunt: 1,
    // Le Double du Sram : à la fin de son deuxième tour, il prend la place de la Nerith, puis se dissipe.
    triggers: [
      { when: 'turnEnd', if: { every: 2 }, once: true, do: [{ act: 'swapOwner' }, { act: 'vanish', text: 'La silhouette se dissipe.' }] },
      { when: 'death', do: [{ act: 'explode', min: 10, max: 14, element: 'air', radius: 1, enemiesOnly: true }] },
    ],
    desc: 'Leurre de la Nerith. Provoque les ennemis à son contact ; à la fin de son deuxième tour, prend la place de la Nerith puis éclate.' }),
  braise: M('braise', { name: 'Braise', region: 'invocation', level: '', shape: 'circle', color: '#ff5a1a', hp: 1, pa: 3, pm: 3, initiative: 0, spells: ['m_etreinte_braise'], ai: 'melee', summon: true,
    triggers: [{ when: 'death', do: [{ act: 'explode', min: 8, max: 12, element: 'feu', radius: 1 }] }],
    desc: 'Invocation du Cendrou. Explose en mourant.' }),
};

// ===== Les rencontres, par région =====
DATA.regions = {
  orsane: 'Orsane, les Cimes',
  kaldum: 'Kaldum',
  thessa: 'Thessa',
  lisiere: 'La Lisière',
  basvoiles: 'Les Bas-Voiles',
};

DATA.encounters = [
  { id: 'voliere', region: 'orsane', name: 'Volière', monsters: ['pilou', 'pilou'] },
  { id: 'sentier', region: 'orsane', name: 'Sentier des Cimes', monsters: ['grouk', 'pilou'] },
  { id: 'toiles', region: 'orsane', name: 'Les Toiles', monsters: ['tissefil', 'tissefil', 'veilloche'] },
  { id: 'eboulis', region: 'orsane', name: 'Éboulis', monsters: ['brimbe', 'brimbe', 'grouk'] },
  { id: 'terrier', region: 'orsane', name: 'Terrier du Grand Grouk (boss)', monsters: ['grand_grouk', 'grouk'] },
  { id: 'galerie', region: 'kaldum', name: 'Galerie', monsters: ['molh', 'kaldrik'] },
  { id: 'vapeurs', region: 'kaldum', name: 'Vapeurs', monsters: ['fumerolle', 'pioche_vive'] },
  { id: 'fonderie', region: 'kaldum', name: 'Fonderie', monsters: ['cendrou', 'kaldrik'] },
  { id: 'forge_morte', region: 'kaldum', name: 'La Forge Morte (boss)', monsters: ['dorm', 'pioche_vive'] },
  { id: 'lagune', region: 'thessa', name: 'Lagune', monsters: ['sivr', 'marnel'] },
  { id: 'ressac', region: 'thessa', name: 'Ressac', monsters: ['brisant', 'harpide'] },
  { id: 'epave', region: 'thessa', name: 'Épave', monsters: ['noye', 'sivr', 'marnel'] },
  { id: 'phare', region: 'thessa', name: 'Le Phare Englouti (boss)', monsters: ['mere_des_brisants'] },
  { id: 'patrouille', region: 'lisiere', name: 'Patrouille', monsters: ['vulk', 'sivr'] },
  { id: 'meute', region: 'lisiere', name: 'Meute', monsters: ['vulk', 'vulk', 'ferrel'] },
  { id: 'embuscade', region: 'lisiere', name: 'Embuscade', monsters: ['sivr', 'zhaal', 'ferrel'] },
  { id: 'fendus', region: 'lisiere', name: 'Les Fendus', monsters: ['fendu', 'mache_voile'] },
  { id: 'breche', region: 'lisiere', name: 'La Brèche (boss)', monsters: ['porte_fente', 'fendu'] },
  { id: 'ombres', region: 'basvoiles', name: 'Ombres', monsters: ['oubli', 'oubli'] },
  { id: 'vers', region: 'basvoiles', name: 'Galerie des vers', monsters: ['vrill', 'craneux'] },
  { id: 'nid', region: 'basvoiles', name: 'Nid de la Tisseuse', monsters: ['tisseuse', 'tissefil'] },
  { id: 'gardien', region: 'basvoiles', name: 'Le Gardien', monsters: ['thane', 'craneux'] },
  { id: 'fente_basse', region: 'basvoiles', name: 'Fente-Basse (boss)', monsters: ['veilleur_dechu', 'oubli'] },
];
