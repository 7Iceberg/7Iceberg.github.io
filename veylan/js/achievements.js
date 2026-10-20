// Succès : conditions évaluées sur les compteurs du personnage. Un succès se débloque tout de suite,
// avec son titre ; son XP, ses Fils et ses objets attendent que le joueur vienne les chercher
// (fenêtre « Récompenses en attente », js/hud-recompenses.js), une fois chacun : `achClaimed`
// garde les succès dont la récompense est remise.
const Achievements = (() => {
  const defs = () => (DATA.content && DATA.content.achievements) || [];
  const get = id => defs().find(a => a.id === id) || null;
  // Nombre de remontées distinctes d'une région déjà vaincues (le Carnet du Veilleur).
  const carnetCount = (ch, region) => Object.keys(ch.counters.kills || {}).filter(id => DATA.monsters[id] && DATA.monsters[id].region === region && !DATA.monsters[id].summon).length;
  // Cartes d'une zone, et combien sont déjà visitées.
  const zoneMaps = id => { const z = ((DATA.content && DATA.content.zones) || []).find(x => x.id === id); return z ? z.maps.map(m => m.id) : []; };
  const zoneSeen = (ch, id) => zoneMaps(id).filter(m => ch.counters.maps.includes(m)).length;

  function met(ch, c) {
    const k = ch.counters;
    switch (c.type) {
      case 'fights': return k.wins >= c.count;
      case 'kills': return (k.kills[c.monster] || 0) >= c.count;
      case 'level': return ch.level >= c.level;
      case 'dungeon': return k.dungeons.includes(c.dungeon);
      case 'dungeonTurns': return ((k.dungeonTurns || {})[c.dungeon] || Infinity) <= c.max;
      case 'boss': return k.bosses.includes(c.monster);
      case 'feat': return ((k.feats || {})[c.key] || 0) >= c.count;
      case 'carnet': return carnetCount(ch, c.region) >= c.count;
      case 'quests': return k.questsDone >= c.count;
      // Une série de quêtes, toutes faites (les succès de quêtes d'Incarnam, docs/QUETES-INCARNAM.md).
      case 'questline': return (c.quests || []).every(id => ((ch.quests || {}).done || []).includes(id));
      case 'maps': return k.maps.length >= c.count;
      case 'zone': { const n = zoneMaps(c.zone).length; return n > 0 && zoneSeen(ch, c.zone) >= n; }
      case 'craft': return k.crafts >= c.count;
      case 'gather': return k.gathers >= c.count;
      case 'fils': return k.filsEarned >= c.count;
      case 'set': { const s = Items.getSet(c.set); return !!s && (ch.derived().setCount[c.set] || 0) >= s.pieces.length; }
      default: return false;
    }
  }

  // Un succès a-t-il quelque chose à remettre (XP, Fils, objets) ? Le titre ne compte pas : il
  // est remis au déblocage.
  const hasReward = a => { const r = a.rewards || {}; return !!(r.xp || r.fils || (r.items || []).length); };

  // Débloque ce qui vient d'être atteint : le titre tout de suite, le reste attend. Retourne les
  // succès débloqués avec ce qu'ils promettent.
  function check(ch) {
    const out = [];
    ch.achClaimed = ch.achClaimed || [];
    for (const a of defs()) {
      if (ch.achievements.includes(a.id) || !met(ch, a.cond || {})) continue;
      ch.achievements.push(a.id);
      const r = a.rewards || {};
      if (r.title && !ch.titles.includes(r.title)) ch.titles.push(r.title);
      // Rien à remettre : il n'attend pas.
      if (!hasReward(a)) ch.achClaimed.push(a.id);
      out.push({ achievement: a, xp: r.xp || 0, levels: 0, fils: r.fils || 0, title: r.title || null, pending: hasReward(a) });
    }
    return out;
  }

  // Succès débloqués dont la récompense attend, dans l'ordre du déblocage.
  function pending(ch) {
    const claimed = ch.achClaimed || [];
    return ch.achievements.filter(id => !claimed.includes(id)).map(get).filter(Boolean);
  }

  // Remet la récompense d'un succès débloqué, une seule fois. Retourne ce qui a été gagné, ou null.
  function claim(ch, id) {
    const a = get(id);
    if (!a || !ch.achievements.includes(id)) return null;
    ch.achClaimed = ch.achClaimed || [];
    if (ch.achClaimed.includes(id)) return null;
    ch.achClaimed.push(id);
    const r = a.rewards || {};
    const got = { achievement: a, xp: 0, levels: 0, fils: r.fils || 0, items: [] };
    if (r.xp) { const g = ch.gainXp(r.xp); got.xp = g.gained; got.levels = g.levels; }
    if (r.fils) { ch.fils += r.fils; ch.counters.filsEarned += r.fils; }
    for (const it of r.items || []) if (Items.get(it.id)) { ch.addItem(it.id, it.count || 1); got.items.push({ id: it.id, count: it.count || 1 }); }
    return got;
  }

  // Catégorie affichée, déduite du type de condition (et du haut fait pour les « feat »).
  function category(a) {
    const c = a.cond || {};
    switch (c.type) {
      case 'maps': case 'zone': return 'Exploration';
      case 'quests': case 'questline': return 'Quêtes';
      case 'fights': return 'Combat';
      case 'kills': return 'Chasse';
      case 'carnet': return 'Carnet';
      case 'level': return 'Progression';
      case 'dungeon': case 'dungeonTurns': case 'boss': return 'Donjons';
      case 'set': return 'Panoplies';
      case 'craft': case 'gather': return 'Métiers';
      case 'fils': return 'Fortune';
      case 'feat': return /^noeuds_/.test(c.key) ? 'Nœuds' : c.key === 'defi' ? 'Défis' : 'Donjons';
      default: return 'Succès';
    }
  }

  // Avancement lisible d'un succès, pour l'écran.
  function progress(ch, a) {
    const c = a.cond || {}, k = ch.counters;
    const pair = (v, n) => `${Math.min(v, n)}/${n}`;
    switch (c.type) {
      case 'fights': return pair(k.wins, c.count);
      case 'kills': return pair(k.kills[c.monster] || 0, c.count);
      case 'level': return pair(ch.level, c.level);
      case 'quests': return pair(k.questsDone, c.count);
      case 'questline': return pair((c.quests || []).filter(id => ((ch.quests || {}).done || []).includes(id)).length, (c.quests || []).length);
      case 'maps': return pair(k.maps.length, c.count);
      case 'zone': return pair(zoneSeen(ch, c.zone), zoneMaps(c.zone).length);
      case 'craft': return pair(k.crafts, c.count);
      case 'gather': return pair(k.gathers, c.count);
      case 'fils': return pair(k.filsEarned, c.count);
      case 'feat': return pair((k.feats || {})[c.key] || 0, c.count);
      case 'carnet': return pair(carnetCount(ch, c.region), c.count);
      case 'dungeonTurns': { const b = (k.dungeonTurns || {})[c.dungeon]; return ch.achievements.includes(a.id) ? 'fait' : b ? `meilleur : ${b} tours` : 'à faire'; }
      default: return ch.achievements.includes(a.id) ? 'fait' : 'à faire';
    }
  }

  return { defs, get, met, check, pending, claim, hasReward, category, progress };
})();

// Succès d'exploration, un par zone : toutes ses cartes visitées. Générés depuis le contenu, comme
// ceux du Carnet (js/noeuds.js) ; l'XP suit modestement les niveaux de la zone (15 par niveau du
// bas et du haut de la fourchette, arrondi à la dizaine : 60 aux Cimes, 860 à la Fonderie).
(() => {
  const C = DATA.content;
  if (!C || !C.zones || !C.achievements) return;
  // « les Cimes d'Orsane », « des Cimes d'Orsane », « de la Fonderie », « de Kaldum, ... ».
  const article = n => n.replace(/^(Les|La|Le) /, m => m.toLowerCase()).replace(/^L'/, 'l\'');
  const de = n => /^Les /.test(n) ? 'des ' + n.slice(4) : /^Le /.test(n) ? 'du ' + n.slice(3) : /^(La |L')/.test(n) ? 'de ' + article(n) : /^[AEIOUYÉÈÊ]/i.test(n) ? 'd\'' + n : 'de ' + n;
  for (const z of C.zones) {
    const id = `explorer_${z.id}`;
    if (!(z.maps || []).length || C.achievements.some(a => a.id === id)) continue;
    const [lo, hi] = z.level || [1, 1];
    C.achievements.push({
      id, name: `Explorer ${article(z.name)}`, desc: `Visiter les ${z.maps.length} cartes ${de(z.name)}.`,
      cond: { type: 'zone', zone: z.id }, rewards: { xp: Math.round((lo + hi) * 1.5) * 10 },
    });
  }
})();
