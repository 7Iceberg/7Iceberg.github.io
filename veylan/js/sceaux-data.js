const SCEAUX_DATA = (() => {
  const regles = {
    pointsParNiveau: 5,
    pointsParSceau: 10,
    pvParSceau: 5,
    resMax: 50,
    pvBase: 60, pvParNiveau: 5,
    paliers: [[100, 1], [200, 2], [300, 3], [1e9, 4]],
    reinitGratuiteJusqua: 10,
    reinitPrixParNiveau2: 5,
    niveauMax: 300,
  };

  const voies = {
    terre: { id: 'terre', nom: 'Terra', element: 'terre', stat: 'force', icone: 'mountain', couleur: '#5fd068',
      phrase: 'Les dégâts de terre et neutres. L\'arbre de ceux qui tiennent et qui ébranlent.' },
    feu: { id: 'feu', nom: 'Ignis', element: 'feu', stat: 'intel', icone: 'flame', couleur: '#ff6a3d',
      phrase: 'Les dégâts de feu. L\'arbre de ceux qui soignent et de ceux qui brûlent.' },
    eau: { id: 'eau', nom: 'Aqua', element: 'eau', stat: 'chance', icone: 'droplet', couleur: '#38bdf8',
      phrase: 'Les dégâts d\'eau. L\'arbre de ceux qui retiennent et de ceux qui trouvent.' },
    air: { id: 'air', nom: 'Aer', element: 'air', stat: 'agi', icone: 'wind', couleur: '#e4ecf5',
      phrase: 'Les dégâts d\'air. L\'arbre de ceux qui filent et de ceux qui frappent vite.' },
  };

  const E = (nom, u, icone, cat) => ({ nom, u, icone, cat });
  const effets = {
    pv: E('PV', '', 'heart', 'vie'),
    res_terre: E('Résistance terre', '%', 'shield-half', 'vie'), res_feu: E('Résistance feu', '%', 'shield-half', 'vie'),
    res_eau: E('Résistance eau', '%', 'shield-half', 'vie'), res_air: E('Résistance air', '%', 'shield-half', 'vie'),
    resTous: E('Résistances, tous éléments', '%', 'shield', 'vie'),
    reduc: E('Réduction des dégâts', '', 'shield-check', 'vie'),
    dmg_terre: E('Dégâts terre et neutres', '%', 'mountain', 'degats'), dmg_feu: E('Dégâts feu', '%', 'flame', 'degats'),
    dmg_eau: E('Dégâts eau', '%', 'droplet', 'degats'), dmg_air: E('Dégâts air', '%', 'wind', 'degats'),
    fixe_terre: E('Dommages terre', '', 'pickaxe', 'degats'), fixe_feu: E('Dommages feu', '', 'flame', 'degats'),
    fixe_eau: E('Dommages eau', '', 'waves', 'degats'), fixe_air: E('Dommages air', '', 'zap', 'degats'),
    crit: E('Critique', '%', 'zap', 'degats'), dmgCrit: E('Dommages critiques', '', 'sparkles', 'degats'),
    poussee: E('Dommages de poussée', '', 'move', 'degats'),
    soins: E('Soins', '%', 'heart', 'soins'), soinsFixes: E('Soins fixes', '', 'heart-pulse', 'soins'),
    soinsRecus: E('Soins reçus', '%', 'hand-heart', 'soins'), boucliers: E('Boucliers donnés', '%', 'shield-plus', 'soins'),
    tacle: E('Tacle', '', 'hand', 'mobilite'), fuite: E('Fuite', '', 'feather', 'mobilite'), init: E('Initiative', '', 'timer', 'mobilite'),
    retraitPA: E('Retrait PA', '', 'magnet', 'controle'), retraitPM: E('Retrait PM', '', 'anchor', 'controle'),
    esquivePA: E('Esquive PA', '', 'shield-check', 'controle'), esquivePM: E('Esquive PM', '', 'footprints', 'controle'),
    pp: E('Prospection', '', 'gem', 'recolte'), pods: E('Pods', '', 'backpack', 'recolte'),
  };
  const categories = [
    { id: 'vie', nom: 'Vie', icone: 'heart-pulse' }, { id: 'degats', nom: 'Dégâts', icone: 'swords' },
    { id: 'soins', nom: 'Soins', icone: 'hand-heart' }, { id: 'mobilite', nom: 'Mobilité', icone: 'footprints' },
    { id: 'controle', nom: 'Contrôle', icone: 'magnet' }, { id: 'recolte', nom: 'Récolte', icone: 'gem' },
  ];

  const PLAN = [
    { cle: 'coeur', branche: 'tronc', dx: 0, dy: 0, max: 1, parents: [], coeur: true },
    { cle: 't1', branche: 'tronc', dx: 0, dy: -135, max: 1, parents: ['coeur'] },
    { cle: 't2', branche: 'tronc', dx: 0, dy: -255, max: 3, parents: ['t1'] },
    { cle: 't3', branche: 'tronc', dx: 0, dy: -375, max: 3, parents: ['t2'] },
    { cle: 'tc', branche: 'tronc', dx: 0, dy: -505, max: 3, parents: ['t3'], couronne: true, seuilVoie: 30 },
    { cle: 'g1', branche: 'g', dx: -130, dy: -80, max: 3, parents: ['coeur'] },
    { cle: 'g2', branche: 'g', dx: -160, dy: -215, max: 3, parents: ['g1'] },
    { cle: 'g3', branche: 'g', dx: -265, dy: -30, max: 3, parents: ['g1'] },
    { cle: 'g4', branche: 'g', dx: -290, dy: -160, max: 3, parents: ['g2', 'g3'] },
    { cle: 'gm', branche: 'g', dx: -300, dy: -290, max: 1, parents: ['g4'], cle2voute: true, seuil: 9 },
    { cle: 'g5', branche: 'g', dx: -175, dy: -400, max: 3, parents: ['gm'] },
    { cle: 'g6', branche: 'g', dx: -330, dy: -420, max: 3, parents: ['gm'] },
    { cle: 'gk', branche: 'g', dx: -255, dy: -535, max: 1, parents: ['g5', 'g6'], cle2voute: true, seuil: 18 },
  ];
  for (const n of PLAN.filter(x => x.branche === 'g')) {
    PLAN.push(Object.assign({}, n, { cle: 'd' + n.cle.slice(1), branche: 'd', dx: -n.dx, parents: n.parents.map(k => (k[0] === 'g' ? 'd' + k.slice(1) : k)) }));
  }
  const POS = { terre: { x: -1250, y: -320 }, feu: { x: -430, y: -500 }, eau: { x: 430, y: -500 }, air: { x: 1250, y: -320 } };

  const coeurDesc = (nom, de, deg) => `Le cœur de la voie ${de}${nom}. Chaque point de ${nom} donne +1 % aux dégâts ${deg} ; chaque dizaine de ${nom} donne un Sceau ${de}${nom}, à poser dans cet arbre.`;
  const ARBRES = {
    terre: {
      branches: { g: { nom: 'Roc', role: 'tenir', phrase: 'Résister, encaisser, ne pas céder un pas.' },
        d: { nom: 'Séisme', role: 'ébranler', phrase: 'Frapper lourd, pousser, faire trembler.' } },
      noeuds: {
        coeur: { nom: 'Sceau de Terra', icone: 'mountain', effet: {}, desc: coeurDesc('Terra', 'de ', 'de terre et neutres') },
        t1: { nom: 'Ancrage', icone: 'shield-half', effet: { res_terre: 4 } },
        t2: { nom: 'Échine', icone: 'backpack', effet: { pods: 100 } },
        t3: { nom: 'Veine de Pierre', icone: 'pickaxe', effet: { fixe_terre: 3 } },
        tc: { nom: 'Couronne de Terra', icone: 'crown', effet: { dmg_terre: 10, resTous: 2 } },
        g1: { nom: 'Peau de Pierre', icone: 'shield', effet: { resTous: 2 } },
        g2: { nom: 'Socle', icone: 'hand', effet: { tacle: 4 } },
        g3: { nom: 'Pied Ferme', icone: 'footprints', effet: { esquivePM: 5 } },
        g4: { nom: 'Cœur de Roc', icone: 'shield-check', effet: { reduc: 3 } },
        gm: { nom: 'Bastion', icone: 'anvil', effet: { resTous: 3, reduc: 5 } },
        g5: { nom: 'Granit', icone: 'weight', effet: { resTous: 2 } },
        g6: { nom: 'Lourd', icone: 'scale', effet: { esquivePA: 5 } },
        gk: { nom: 'Montagne', icone: 'mountain-snow', effet: { resTous: 5 }, passif: 'Tant que tu n\'as pas bougé de ton dernier tour, tu subis 10 % de dégâts en moins.' },
        d1: { nom: 'Coup Sourd', icone: 'sword', effet: { dmg_terre: 6 } },
        d2: { nom: 'Onde de Choc', icone: 'move', effet: { poussee: 5 } },
        d3: { nom: 'Fracas', icone: 'zap', effet: { crit: 2 } },
        d4: { nom: 'Faille', icone: 'pickaxe', effet: { fixe_terre: 5 } },
        dm: { nom: 'Faille Ouverte', icone: 'drill', effet: { dmg_terre: 10, poussee: 6 } },
        d5: { nom: 'Contrecoup', icone: 'hammer', effet: { dmgCrit: 5 } },
        d6: { nom: 'Masse', icone: 'axe', effet: { dmg_terre: 6 } },
        dk: { nom: 'Tremblement', icone: 'activity', effet: { dmg_terre: 10 }, passif: 'Tes sorts de zone font 10 % de dégâts en plus.' },
      },
    },
    feu: {
      branches: { g: { nom: 'Foyer', role: 'soigner', phrase: 'Rendre la vie, couvrir, garder la flamme.' },
        d: { nom: 'Brasier', role: 'brûler', phrase: 'Frapper fort, frapper juste, tout embraser.' } },
      noeuds: {
        coeur: { nom: 'Sceau d\'Ignis', icone: 'flame', effet: {}, desc: coeurDesc('Ignis', 'd\'', 'de feu') },
        t1: { nom: 'Étincelle', icone: 'shield-half', effet: { res_feu: 4 } },
        t2: { nom: 'Chaleur', icone: 'heart', effet: { soins: 4 } },
        t3: { nom: 'Âme du Feu', icone: 'flame', effet: { fixe_feu: 3 } },
        tc: { nom: 'Couronne d\'Ignis', icone: 'crown', effet: { dmg_feu: 10, soins: 5 } },
        g1: { nom: 'Mains Chaudes', icone: 'heart', effet: { soins: 6 } },
        g2: { nom: 'Âtre', icone: 'heart', effet: { soinsRecus: 5 } },
        g3: { nom: 'Veille du Feu', icone: 'shield-plus', effet: { boucliers: 6 } },
        g4: { nom: 'Flamme Douce', icone: 'heart', effet: { soinsFixes: 4 } },
        gm: { nom: 'Brasero', icone: 'sun', effet: { soins: 10, soinsFixes: 4 } },
        g5: { nom: 'Braises Douces', icone: 'heart-handshake', effet: { soins: 6 } },
        g6: { nom: 'Rempart de Flammes', icone: 'shield-half', effet: { boucliers: 6 } },
        gk: { nom: 'Foyer Vivant', icone: 'hand-heart', effet: { soins: 10 }, passif: 'Chaque soin que tu donnes à un allié te soigne aussi de 10 % de sa valeur.' },
        d1: { nom: 'Tison', icone: 'sword', effet: { dmg_feu: 6 } },
        d2: { nom: 'Ardeur', icone: 'zap', effet: { crit: 2 } },
        d3: { nom: 'Cendres Vives', icone: 'sparkles', effet: { dmgCrit: 5 } },
        d4: { nom: 'Haut Feu', icone: 'flame', effet: { fixe_feu: 5 } },
        dm: { nom: 'Incendie', icone: 'target', effet: { dmg_feu: 10, crit: 2 } },
        d5: { nom: 'Étincelles', icone: 'star', effet: { dmgCrit: 5 } },
        d6: { nom: 'Combustion', icone: 'flame', effet: { dmg_feu: 6 } },
        dk: { nom: 'Embrasement', icone: 'flame', effet: { dmg_feu: 10 }, passif: 'Tes coups critiques de feu laissent une brûlure : 5 % des dégâts du coup à chaque tour, deux tours.' },
      },
    },
    eau: {
      branches: { g: { nom: 'Marée', role: 'retenir', phrase: 'Retirer les PA et les PM, et garder les siens.' },
        d: { nom: 'Fortune', role: 'trouver', phrase: 'Frapper au bon moment, et repartir les poches pleines.' } },
      noeuds: {
        coeur: { nom: 'Sceau d\'Aqua', icone: 'droplet', effet: {}, desc: coeurDesc('Aqua', 'd\'', 'd\'eau') },
        t1: { nom: 'Source', icone: 'shield-half', effet: { res_eau: 4 } },
        t2: { nom: 'Flair', icone: 'search', effet: { pp: 10 } },
        t3: { nom: 'Marée Montante', icone: 'waves', effet: { fixe_eau: 3 } },
        tc: { nom: 'Couronne d\'Aqua', icone: 'crown', effet: { dmg_eau: 10, pp: 20 } },
        g1: { nom: 'Reflux', icone: 'magnet', effet: { retraitPA: 4 } },
        g2: { nom: 'Courant Froid', icone: 'anchor', effet: { retraitPM: 4 } },
        g3: { nom: 'Eau Calme', icone: 'shield-check', effet: { esquivePA: 5 } },
        g4: { nom: 'Ressac', icone: 'shield', effet: { esquivePM: 5 } },
        gm: { nom: 'Contre-Courant', icone: 'refresh-cw', effet: { esquivePA: 6, esquivePM: 6 } },
        g5: { nom: 'Eaux Lourdes', icone: 'hourglass', effet: { retraitPM: 4 } },
        g6: { nom: 'Tourbillon', icone: 'infinity', effet: { retraitPA: 4 } },
        gk: { nom: 'Marée Haute', icone: 'waves', effet: { retraitPA: 6, retraitPM: 6 }, passif: 'Chaque PA ou PM que tu retires à un ennemi te rend 2 % de tes PV.' },
        d1: { nom: 'Pluie Fine', icone: 'sword', effet: { dmg_eau: 6 } },
        d2: { nom: 'Bonne Pioche', icone: 'pickaxe', effet: { pp: 10 } },
        d3: { nom: 'Coup de Chance', icone: 'dices', effet: { crit: 2 } },
        d4: { nom: 'Flot', icone: 'waves', effet: { fixe_eau: 5 } },
        dm: { nom: 'Trésor Enfoui', icone: 'wallet', effet: { pp: 20, dmg_eau: 10 } },
        d5: { nom: 'Écume', icone: 'droplet', effet: { dmg_eau: 6 } },
        d6: { nom: 'Bonne Étoile', icone: 'star', effet: { crit: 2 } },
        dk: { nom: 'Aubaine', icone: 'dices', effet: { dmg_eau: 10 }, passif: 'Ton premier coup critique de chaque tour te rend 1 PM.' },
      },
    },
    air: {
      branches: { g: { nom: 'Vent', role: 'filer', phrase: 'Partir avant tout le monde, et ne jamais rester pris.' },
        d: { nom: 'Orage', role: 'frapper', phrase: 'Frapper vite, retenir ce qui fuit.' } },
      noeuds: {
        coeur: { nom: 'Sceau d\'Aer', icone: 'wind', effet: {}, desc: coeurDesc('Aer', 'd\'', 'd\'air') },
        t1: { nom: 'Souffle', icone: 'shield-half', effet: { res_air: 4 } },
        t2: { nom: 'Pied Léger', icone: 'feather', effet: { fuite: 4 } },
        t3: { nom: 'Haut Vent', icone: 'zap', effet: { fixe_air: 3 } },
        tc: { nom: 'Couronne d\'Aer', icone: 'crown', effet: { dmg_air: 10, init: 100 } },
        g1: { nom: 'Vent Arrière', icone: 'feather', effet: { fuite: 4 } },
        g2: { nom: 'Vif', icone: 'timer', effet: { init: 60 } },
        g3: { nom: 'Insaisissable', icone: 'ghost', effet: { esquivePM: 5 } },
        g4: { nom: 'Courant d\'Air', icone: 'shield-half', effet: { esquivePA: 5 } },
        gm: { nom: 'Vent Porteur', icone: 'compass', effet: { fuite: 8, init: 100 } },
        g5: { nom: 'Zéphyr', icone: 'leaf', effet: { init: 60 } },
        g6: { nom: 'Feu Follet', icone: 'moon', effet: { esquivePM: 5 } },
        gk: { nom: 'Libre comme l\'Air', icone: 'bird', effet: { fuite: 10 }, passif: 'Au premier tour de chaque combat, tu as 1 PM de plus.' },
        d1: { nom: 'Rafale', icone: 'sword', effet: { dmg_air: 6 } },
        d2: { nom: 'Serre', icone: 'hand', effet: { tacle: 4 } },
        d3: { nom: 'Éclair', icone: 'zap', effet: { crit: 2 } },
        d4: { nom: 'Foudre', icone: 'zap', effet: { fixe_air: 5 } },
        dm: { nom: 'Œil du Cyclone', icone: 'radar', effet: { dmg_air: 10, tacle: 6 } },
        d5: { nom: 'Grêle', icone: 'snowflake', effet: { fixe_air: 5 } },
        d6: { nom: 'Bourrasque', icone: 'wind', effet: { dmg_air: 6 } },
        dk: { nom: 'Tempête', icone: 'bolt', effet: { dmg_air: 10 }, passif: 'Quand tu achèves un ennemi, tu gagnes 2 PM pour le reste du tour.' },
      },
    },
  };

  const noeuds = {};
  for (const v in ARBRES) {
    for (const p of PLAN) {
      const c = ARBRES[v].noeuds[p.cle];
      noeuds[`${v}_${p.cle}`] = Object.assign({ id: `${v}_${p.cle}`, voie: v, cle: p.cle, branche: p.branche, x: POS[v].x + p.dx, y: POS[v].y + p.dy, max: p.max, coeur: !!p.coeur,
        parents: p.parents.map(k => `${v}_${k}`), cle2voute: !!p.cle2voute, couronne: !!p.couronne, seuil: p.seuil || 0, seuilVoie: p.seuilVoie || 0 }, c);
    }
  }
  const branches = {};
  for (const v in ARBRES) branches[v] = Object.assign({ tronc: { nom: 'Tronc', role: 'éveil', phrase: 'Les premiers Sceaux de la voie.' } }, ARBRES[v].branches);

  return { regles, voies, effets, categories, noeuds, branches, pos: POS, ordre: ['terre', 'feu', 'eau', 'air'] };
})();

if (typeof DATA !== 'undefined') DATA.sceaux = SCEAUX_DATA;
if (typeof module !== 'undefined') module.exports = SCEAUX_DATA;
