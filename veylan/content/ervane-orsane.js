(DATA.modules = DATA.modules || {}).ervaneOrsane = () => {
  const C = DATA.content;
  if (DATA.ile && DATA.ile.orsaneApplique) return;
  DATA.ile = DATA.ile || {};
  DATA.ile.orsaneApplique = true;

  const CARTES = {
    orsane_cimes_place: [19, 20], orsane_cimes_terrasses: [19, 20], orsane_cimes_ateliers: [19, 20], orsane_cimes_porte: [19, 20],
    orsane_clairieres_lisiere: [19, 22], orsane_clairieres_pres: [19, 22],
    orsane_clairieres_ruisseau: [21, 24], orsane_clairieres_bosquet: [21, 24],
    orsane_clairieres_mare: [23, 26], orsane_clairieres_oree: [23, 26],
    orsane_sentiers_montee: [21, 24], orsane_sentiers_relais: [21, 24],
    orsane_sentiers_halte: [23, 26], orsane_sentiers_corniche: [23, 26],
    orsane_sentiers_pont: [25, 28], orsane_sentiers_crete: [25, 28],
  };
  const ZONES = { orsane_cimes: [19, 20], orsane_clairieres: [19, 26], orsane_sentiers: [21, 28] };
  const ADULTES = { piouk: 'pilou', groukin: 'grouk', filin: 'tissefil', loche: 'veilloche' };
  const adulte = (id, bas) => (id === 'brim' ? (bas >= 19 ? 'brimbe' : 'grouk') : (ADULTES[id] || id));
  const KAVOUS = {
    orsane_clairieres_lisiere: { monsters: ['kavou_bleu', 'kavou_roux'], case: [11, 11] },
    orsane_clairieres_pres: { monsters: ['kavou_ocre', 'kavou_blanc'], case: [3, 12] },
    orsane_clairieres_ruisseau: { monsters: ['kavou_bleu', 'kavou_ocre'], case: [11, 12] },
    orsane_clairieres_bosquet: { monsters: ['kavou_roux', 'kavou_blanc'], case: [3, 12] },
  };
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
        if (apres[1] >= 20 && g.monsters.length === 3 && g.monsters.every(id => id === 'grouk')) g.monsters = ['grouk_cornu', 'grouk', 'grouk'];
      }
      const k = !m.plateau && KAVOUS[m.id];
      if (k) {
        const [x, y] = k.case;
        if (!m.layout || !m.layout[y] || m.layout[y][x] !== '.') throw new Error(`ervaneOrsane : la case ${x},${y} de ${m.id} n'est pas un sol libre`);
        m.layout[y] = m.layout[y].slice(0, x) + 'M' + m.layout[y].slice(x + 1);
        m.groups = (m.groups || []).concat([{ fixe: true, monsters: k.monsters.slice(), level: apres.slice(), respawn: 45 }]);
      }
    }
    if (ZONES[z.id] && z.faune && z.faune.monstres) {
      const vers = (o, bas) => { const r = {}; for (const [id, p] of Object.entries(o || {})) { const a = adulte(id, bas); r[a] = Math.max(r[a] || 0, 0) + p; } return r; };
      z.faune = Object.assign({}, z.faune, { monstres: vers(z.faune.monstres, z.level[0]) });
      if (z.level[1] >= 20 && z.faune.monstres.grouk && !z.faune.monstres.grouk_cornu) z.faune.monstres.grouk_cornu = 8;
      for (const m of z.maps || []) if (m.penche) {
        const r = {};
        for (const [id, k] of Object.entries(m.penche)) { const a = adulte(id, z.level[0]); r[a] = Math.max(r[a] || 1, k); }
        m.penche = r;
      }
    }
  }

  if (DATA.monsters.pilou) DATA.monsters.pilou.level = '1 à 28';
  if (DATA.monsters.pilou_chapardeur) DATA.monsters.pilou_chapardeur.level = '7 à 28';
  if (DATA.monsters.glouton) DATA.monsters.glouton.level = '13 à 26';

  const grenier = C.dungeons.find(d => d.id === 'grenier_des_pilous');
  if (grenier) {
    grenier.level = [21, 26];
    for (const r of grenier.rooms || []) for (const mo of r.monsters || []) { mo.level += 14; mo.id = adulte(mo.id, mo.level); }
  }

  const NIVEAU = { 1: 19, 3: 19, 5: 19, 7: 21, 9: 23, 11: 23, 13: 23 };
  const REQUIS = { 19: 19, 21: 19, 23: 21, 25: 23 };
  const xpDe = (niveau, principale) => Math.round(24 * Math.pow((niveau + 1) / 2, 1.6)) * (principale ? 2 : 1);
  const PREFIXES = ['orsane_', 'porte_', 'ateliers_', 'remue_'];
  const QUETES = {
    orsane_arrivee: { level: 19, xp: 1910, requis: 19, quetes: ['ervane_descente'] },
    orsane_lanternes_volees: { level: 19, xp: 1910, requis: 19 },
    orsane_grenier_des_pilous: { level: 21, xp: 2226, requis: 19 },
    orsane_reveil_des_grouks: { level: 23, xp: 2558, requis: 21 },
    orsane_fil_tendu: { level: 25, xp: 2908, requis: 23 },
    orsane_toupie_de_vali: { level: 19, xp: 955, requis: 19 },
    orsane_plumes_de_thila: { level: 19, xp: 955, requis: 19 },
    orsane_ronde_d_orvak: { level: 19, xp: 955, requis: 19 },
    orsane_semelles_de_korvel: { level: 21, xp: 1113, requis: 19 },
    orsane_memoire_de_kelthar: { level: 23, xp: 1279, requis: 21 },
    orsane_manche_de_thorak: { level: 23, xp: 1279, requis: 21 },
  };
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
      q.dialogue = Object.assign({}, q.dialogue, { offer: ['Tu descends de la Nacelle ? Alors c\'est toi, l\'Éveillé d\'Ervane. Le fil d\'or a tenu, et toi aussi.', 'Fais le tour de la ville. Lotha tient le Comptoir, Orvak tient la Porte. Ils t\'attendent.'] });
    }
    if (q.id === 'orsane_lanternes_volees') {
      q.rewards.items = (q.rewards.items || []).map(it => (it.id === 'sandales_de_duvet' ? { id: 'bottes_de_cuir', count: it.count } : it));
    }
  }

  const pnj = id => C.npcs.find(n => n.id === id);
  const varek = pnj('varek'), orvak = pnj('orvak'), kelthar = pnj('kelthar');
  if (varek) {
    varek.dialogue = ['Tu descends de la Nacelle ? Alors tu as déjà vu plus de Glyms que la moitié des gardes d\'ici. Le Relais est à toi : touche-le, il te ramènera toujours sur cette place.', 'Les Glyms des Clairières ne sont pas ceux des Sources : plus vieux, plus vifs, et ils volent nos lanternes.'];
  }
  if (orvak) orvak.dialogue = ['Au-delà de cette porte, les Clairières. Au-delà des Clairières, tout le reste.', 'On m\'a dit qu\'un Veilleur était descendu d\'Ervane. Les Glyms d\'ici piquent les lanternes et les cachent dans les arbres : tu verras la différence avec tes Glyms des Sources.'];
  if (kelthar) kelthar.dialogue = ['Ervane... J\'y suis monté, il y a longtemps. Le fil d\'or chantait, à l\'époque. Il grince, maintenant, à ce qu\'on dit.', 'Les lanternes de l\'Aube tiennent les bêtes à distance. Quand elles s\'éteignent, le monde descend d\'un cran.'];


  const champs = C.quests.find(q => q.id === 'porte_champs_de_bataille');
  if (champs && champs.dialogue) {
    champs.dialogue.offer = ['Un garde connaît chaque bête de son secteur. Le tien, ce sont les Clairières.', 'Bats deux Glyms Ancestraux, deux Grouks et un Tissefil. Tu sauras ce qui t\'attend la nuit.'];
    champs.dialogue.done = ['Trois espèces, trois façons de se battre. Maintenant tu sais lire les Clairières.'];
  }

};
