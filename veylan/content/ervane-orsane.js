// Les changements d'Orsane pour un personnage né sur Ervane (docs/ILE-DE-DEPART.md, section 3 ;
// docs/ILE-TECHNIQUE.md, 2.14). Tout est rangé dans le module `ervaneOrsane`, que Ile.appliquerOrsane()
// (js/ile.js) applique au lancement d'une partie, seulement pour un personnage dont l'origine est
// Ervane, avant la lecture validée de sa sauvegarde et avant que le monde soit créé. La page ne sert
// qu'un personnage : un personnage né à Orsane ne voit jamais ces changements, même île allumée, et
// garde ses cartes de 1 à 6, ses quêtes d'arrivée et son tutoriel.
//
// Le module applique des règles, pas une liste recopiée : la table des niveaux des cartes, la remise
// à l'échelle des groupes, les nichées remplacées par leurs adultes, les Grouks Cornus, les Kavous
// ajoutés, les bornes hautes du bestiaire, le Grenier des Glyms, les quêtes (niveau, XP, exigences,
// la récompense des lanternes volées), les répliques de Varek, d'Orvak et de Kelthar. Il ne change
// ni les identifiants ni le nombre d'étapes des quêtes, et n'en ajoute aucune : une sauvegarde se
// valide de la même façon avec ou sans lui. La quête « Le Glym Ancestral » et la Nacelle d'Orsane
// (le passage de Varek) sont dans le module `ervane` (content/ervane.js), toujours appliqué quand
// l'île est disponible : un personnage d'Ervane qui les porte se valide et s'importe partout.
// Idempotent. `node tools/ervane-orsane.js` imprime le résultat carte par carte.
(DATA.modules = DATA.modules || {}).ervaneOrsane = () => {
  const C = DATA.content;
  if (DATA.ile && DATA.ile.orsaneApplique) return;
  DATA.ile = DATA.ile || {};
  DATA.ile.orsaneApplique = true;

  // ----- 1. Les cartes : la table des niveaux (conception, 3) -----
  const CARTES = {
    orsane_cimes_place: [8, 8], orsane_cimes_terrasses: [8, 8], orsane_cimes_ateliers: [8, 8], orsane_cimes_porte: [8, 8],
    orsane_clairieres_lisiere: [8, 9], orsane_clairieres_pres: [8, 9],
    orsane_clairieres_ruisseau: [9, 10], orsane_clairieres_bosquet: [9, 10],
    orsane_clairieres_mare: [10, 11], orsane_clairieres_oree: [10, 11],
    orsane_sentiers_montee: [9, 10], orsane_sentiers_relais: [9, 10],
    orsane_sentiers_halte: [10, 11], orsane_sentiers_corniche: [10, 11],
    orsane_sentiers_pont: [11, 12], orsane_sentiers_crete: [11, 12],
  };
  const ZONES = { orsane_cimes: [8, 8], orsane_clairieres: [8, 11], orsane_sentiers: [9, 12] };
  // ----- 2. Les familles : chaque nichée devient son adulte ; le Brim selon la borne basse -----
  const ADULTES = { piouk: 'pilou', groukin: 'grouk', filin: 'tissefil', loche: 'veilloche' };
  const adulte = (id, bas) => (id === 'brim' ? (bas >= 10 ? 'brimbe' : 'grouk') : (ADULTES[id] || id));
  // ----- 4. Les Kavous : deux Kavous opposés, sur une case M de plus (après les cases M existantes) -----
  const KAVOUS = {
    orsane_clairieres_lisiere: { monsters: ['kavou_bleu', 'kavou_roux'], case: [11, 11] },
    orsane_clairieres_pres: { monsters: ['kavou_ocre', 'kavou_blanc'], case: [3, 12] },
    orsane_clairieres_ruisseau: { monsters: ['kavou_bleu', 'kavou_ocre'], case: [11, 12] },
    orsane_clairieres_bosquet: { monsters: ['kavou_roux', 'kavou_blanc'], case: [3, 12] },
  };
  // Une borne n d'un groupe d'une carte qui passe de [a, b] à [A, B] devient A + round((n - a) × (B - A) / max(1, b - a)).
  const echelle = (n, [a, b], [A, B]) => A + Math.round((n - a) * (B - A) / Math.max(1, b - a));
  for (const z of C.zones) {
    if (ZONES[z.id]) z.level = ZONES[z.id].slice();
    for (const m of z.maps || []) {
      const apres = CARTES[m.id];
      if (!apres) continue;
      const avant = m.level;
      m.level = apres.slice();
      for (const g of m.groups || []) {
        g.level = [echelle(g.level[0], avant, apres), echelle(g.level[1], avant, apres)];
        g.monsters = g.monsters.map(id => adulte(id, g.level[0]));
        // ----- 3. Les formes tissées : trois Grouks sur une carte qui atteint 10 -----
        if (apres[1] >= 10 && g.monsters.length === 3 && g.monsters.every(id => id === 'grouk')) g.monsters = ['grouk_cornu', 'grouk', 'grouk'];
      }
      const k = KAVOUS[m.id];
      if (k) {
        const [x, y] = k.case;
        if (!m.layout || !m.layout[y] || m.layout[y][x] !== '.') throw new Error(`ervaneOrsane : la case ${x},${y} de ${m.id} n'est pas un sol libre`);
        m.layout[y] = m.layout[y].slice(0, x) + 'M' + m.layout[y].slice(x + 1);
        m.groups = (m.groups || []).concat([{ monsters: k.monsters.slice(), level: apres.slice(), respawn: 45 }]);
      }
    }
  }

  // ----- 5. Le bestiaire : les bornes hautes montent là où un groupe les dépasse -----
  if (DATA.monsters.pilou) DATA.monsters.pilou.level = '1 à 12';
  if (DATA.monsters.pilou_chapardeur) DATA.monsters.pilou_chapardeur.level = '4 à 12';
  // Le Glouton du Puits (la Halte, 10 à 11 avec l'île) : « 7 à 9 » dans le bestiaire.
  if (DATA.monsters.glouton) DATA.monsters.glouton.level = '7 à 11';

  // ----- Le Grenier des Glyms : 9 à 11, monstres de salle cinq niveaux plus haut, les nichées adultes -----
  const grenier = C.dungeons.find(d => d.id === 'grenier_des_pilous');
  if (grenier) {
    grenier.level = [9, 11];
    for (const r of grenier.rooms || []) for (const mo of r.monsters || []) { mo.level += 5; mo.id = adulte(mo.id, mo.level); }
  }

  // ----- Les quêtes : niveau, XP (24 × niveau^1,6 en secondaire, le double en principale), exigences -----
  // La table de la conception (section 3) pour les quêtes qu'elle nomme ; les autres quêtes des
  // Cimes de niveau 1 à 7 (les séries d'Incarnam, docs/QUETES-INCARNAM.md, et toute quête ajoutée
  // ensuite) suivent la même règle : le niveau 1 à 3 devient 8, 4 devient 9, 5 à 7 deviennent 10 ;
  // l'exigence de niveau suit (8 pour 8 et 9, 9 pour 10, 10 pour 11) ; l'XP est recalculée. Les
  // quêtes de niveau 8 et plus ne changent pas.
  const NIVEAU = { 1: 8, 2: 8, 3: 8, 4: 9, 5: 10, 6: 10, 7: 10 };
  const REQUIS = { 8: 8, 9: 8, 10: 9, 11: 10 };
  const xpDe = (niveau, principale) => Math.round(24 * Math.pow(niveau, 1.6)) * (principale ? 2 : 1);
  const PREFIXES = ['orsane_', 'porte_', 'ateliers_', 'remue_'];
  const QUETES = {
    orsane_arrivee: { level: 8, xp: 1337, requis: 8, quetes: ['ervane_descente'] },
    orsane_lanternes_volees: { level: 8, xp: 1337, requis: 8 },
    orsane_grenier_des_pilous: { level: 9, xp: 1614, requis: 8 },
    orsane_reveil_des_grouks: { level: 10, xp: 1911, requis: 9 },
    orsane_fil_tendu: { level: 11, xp: 2226, requis: 10 },
    orsane_toupie_de_vali: { level: 8, xp: 669, requis: 8 },
    orsane_plumes_de_thila: { level: 8, xp: 669, requis: 8 },
    orsane_ronde_d_orvak: { level: 8, xp: 669, requis: 8 },
    orsane_semelles_de_korvel: { level: 9, xp: 807, requis: 8 },
    orsane_memoire_de_kelthar: { level: 10, xp: 955, requis: 9 },
    orsane_manche_de_thorak: { level: 10, xp: 955, requis: 9 },
  };
  // Les noms des nichées dans les textes d'une quête, remplacés par ceux de leurs adultes.
  const NOMS_ADULTES = [[/\bGlymets\b/g, 'Glyms Ancestraux'], [/\bGlymet\b/g, 'Glym Ancestral'], [/\bGroukins\b/g, 'Grouks'], [/\bGroukin\b/g, 'Grouk'],
    [/\bFilins\b/g, 'Tissefils'], [/\bFilin\b/g, 'Tissefil'], [/\bLoches\b/g, 'Veilloches'], [/\bLoche\b/g, 'Veilloche']];
  const renommer = t => NOMS_ADULTES.reduce((x, [re, nom]) => x.replace(re, nom), t);
  const nommerAdultes = o => {
    for (const k of Object.keys(o)) {
      if (typeof o[k] === 'string' && k !== 'id' && k !== 'monster' && k !== 'npc' && k !== 'map') o[k] = renommer(o[k]);
      else if (o[k] && typeof o[k] === 'object') nommerAdultes(o[k]);
    }
  };
  for (const q of C.quests) {
    // Les nichées sont devenues leurs adultes dans tout Orsane (2) : une étape qui en demande une vise
    // l'adulte qu'on y croise, et les textes de la quête le nomment. Sinon l'étape ne se finirait qu'en
    // remontant sur Ervane, ou jamais pour le Glymet, qu'on ne croise plus nulle part.
    if (PREFIXES.some(p => q.id.startsWith(p))) {
      let vise = false;
      for (const s of q.steps || []) {
        if (s.type === 'kill' && ADULTES[s.monster]) { s.monster = ADULTES[s.monster]; vise = true; }
        if (s.type === 'kills') for (const k of s.kills || []) if (ADULTES[k.monster]) { k.monster = ADULTES[k.monster]; vise = true; }
      }
      if (vise) nommerAdultes(q);
    }
    let t = QUETES[q.id];
    if (!t && PREFIXES.some(p => q.id.startsWith(p)) && q.id !== 'orsane_glym_ancestral' && NIVEAU[q.level]) {
      const niveau = NIVEAU[q.level];
      t = { level: niveau, xp: xpDe(niveau, !!q.main), requis: REQUIS[niveau] };
    }
    if (!t) continue;
    q.level = t.level;
    q.rewards = Object.assign({}, q.rewards, { xp: t.xp });
    q.requires = Object.assign({}, q.requires, { level: t.requis });
    if (t.quetes) q.requires.quests = (q.requires.quests || []).concat(t.quetes.filter(id => !(q.requires.quests || []).includes(id)));
    if (q.id === 'orsane_arrivee') {
      // L'arrivée n'est plus le tutoriel : Varek accueille celui qui descend de la Nacelle.
      q.dialogue = Object.assign({}, q.dialogue, { offer: ['Tu descends de la Nacelle ? Alors c\'est toi, l\'Éveillé d\'Ervane. Le fil d\'or a tenu, et toi aussi.', 'Fais le tour de la ville. Lotha tient le Comptoir, Orvak tient la Porte. Ils t\'attendent.'] });
    }
    if (q.id === 'orsane_lanternes_volees') {
      // Les Sandales de Duvet (niveau 2) sont déjà gagnées sur l'île : des Bottes de Cuir (niveau 7).
      q.rewards.items = (q.rewards.items || []).map(it => (it.id === 'sandales_de_duvet' ? { id: 'bottes_de_cuir', count: it.count } : it));
    }
  }

  // ----- Les répliques d'arrivée de Varek, d'Orvak et de Kelthar -----
  const pnj = id => C.npcs.find(n => n.id === id);
  const varek = pnj('varek'), orvak = pnj('orvak'), kelthar = pnj('kelthar');
  if (varek) {
    varek.dialogue = ['Tu descends de la Nacelle ? Alors tu as déjà vu plus de Glyms que la moitié des gardes d\'ici. Le Relais est à toi : touche-le, il te ramènera toujours sur cette place.', 'Les Glyms des Clairières ne sont pas ceux des Sources : plus vieux, plus vifs, et ils volent nos lanternes.'];
    // La Nacelle d'Orsane (varek.passage) est posée par content/ervane.js, pour tout personnage.
  }
  if (orvak) orvak.dialogue = ['Au-delà de cette porte, les Clairières. Au-delà des Clairières, tout le reste.', 'On m\'a dit qu\'un Veilleur était descendu d\'Ervane. Les Glyms d\'ici piquent les lanternes et les cachent dans les arbres : tu verras la différence avec tes Glyms des Sources.'];
  if (kelthar) kelthar.dialogue = ['Ervane... J\'y suis monté, il y a longtemps. Le fil d\'or chantait, à l\'époque. Il grince, maintenant, à ce qu\'on dit.', 'Les lanternes du Fil tiennent les remontées à distance. Quand elles s\'éteignent, le monde descend d\'un cran.'];

  // « Le Glym Ancestral » : content/ervane.js (voir l'en-tête).

  // « Champs de bataille » demandait une bête de chaque espèce, nichées comprises : il en reste trois.
  const champs = C.quests.find(q => q.id === 'porte_champs_de_bataille');
  if (champs && champs.dialogue) {
    champs.dialogue.offer = ['Un garde connaît chaque bête de son secteur. Le tien, ce sont les Clairières.', 'Bats deux Glyms Ancestraux, deux Grouks et un Tissefil. Tu sauras ce qui t\'attend la nuit.'];
    champs.dialogue.done = ['Trois espèces, trois façons de se battre. Maintenant tu sais lire les Clairières.'];
  }

  // Le Carnet d'Orsane d'un personnage né sur Ervane compte le Glymet, qu'on ne croise plus, pour
  // inscrit (js/achievements.js, carnetCount) : la condition du succès ne change pas avec le module.
};
