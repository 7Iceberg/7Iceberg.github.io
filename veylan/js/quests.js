// Quêtes : disponibilité, acceptation, avancement sur événements, remise des récompenses.
// L'état vit dans character.quests = { active: { id: { step, progress } }, done: [ids] }.
// Une étape de choix (`answer`) garde la réponse donnée : { step, progress, choices: { étape: option } }.
// Une étape `kills` (plusieurs monstres, dans l'ordre qu'on veut ; docs/ILE-DE-DEPART.md, 6) garde
// ses compteurs parallèles : { step, progress, counts: [n, ...] }, remis à zéro quand l'étape change
// et, avec `unCombat`, à la fin d'un combat qui ne les a pas tous remplis.
const Quests = (() => {
  const defs = () => (DATA.content && DATA.content.quests) || [];
  const get = id => defs().find(q => q.id === id) || null;

  // Les compteurs d'une étape `kills`, créés à la demande (autant que de lignes dans l'étape).
  function compteurs(st, s) {
    if (!Array.isArray(st.counts) || st.counts.length !== s.kills.length) st.counts = s.kills.map(() => 0);
    return st.counts;
  }
  const pleins = (st, s) => compteurs(st, s).every((n, i) => n >= s.kills[i].count);
  // « Groukins 2/3, Grouk 1/1 » : le nom du monstre, au pluriel sur le premier mot quand il en faut
  // plusieurs (« Glyms Aer »).
  function texteKills(st, s) {
    const c = compteurs(st, s);
    return s.kills.map((k, i) => {
      const def = DATA.monsters[k.monster], nom = def ? def.name : k.monster;
      const pluriel = k.count > 1 ? nom.replace(/^(\S+)/, m => (/[sxz]$/.test(m) ? m : m + 's')) : nom;
      return `${pluriel} ${Math.min(c[i], k.count)}/${k.count}`;
    }).join(', ');
  }

  function requirementsMet(ch, q) {
    const r = q.requires || {};
    if (r.level && ch.level < r.level) return false;
    for (const id of r.quests || []) if (!ch.quests.done.includes(id)) return false;
    // Serment exigé ou exclu, rang de faction minimum (js/factions.js).
    if ((r.faction || r.notFaction || r.factionRank) && !Factions.requirementsMet(ch, r)) return false;
    return true;
  }

  // Une quête qu'on peut commencer : pas en cours, pas déjà faite (sauf répétable), prérequis tenus.
  function canStart(ch, id) {
    const q = get(id);
    return !!(q && !ch.quests.active[id] && (q.repeat || !ch.quests.done.includes(id)) && requirementsMet(ch, q));
  }

  // Quêtes qu'un PNJ peut proposer maintenant. Une quête cachée ne se propose pas : c'est
  // l'interface qui la lance (le reniement, depuis la fenêtre Faction).
  function available(ch, npcId) {
    return defs().filter(q => q.giver === npcId && !q.hidden && canStart(ch, q.id));
  }

  // À qui se rend une quête : `turnIn`, le dernier PNJ rencontré, sinon le donneur.
  const turnInOf = q => q.turnIn || q.giver;

  // Quêtes en cours liées à ce PNJ : données par lui, ou à lui rendre.
  function activeFor(ch, npcId) {
    return defs().filter(q => (q.giver === npcId || q.turnIn === npcId) && ch.quests.active[q.id]);
  }

  // Quêtes terminées qui se rendent à ce PNJ (le « ? » au-dessus de sa tête).
  function readyFor(ch, npcId) {
    return defs().filter(q => ch.quests.active[q.id] && turnInOf(q) === npcId && isDone(ch, q.id));
  }
  const canTurnIn = (ch, id, npcId) => { const q = get(id); return !!(q && turnInOf(q) === npcId && isDone(ch, id)); };

  // Ce que le donneur remet en confiant la quête (la première clé d'un donjon, par exemple).
  // Une seule fois : l'état de la quête le retient, ce qui rattrape aussi les sauvegardes où la
  // quête était déjà acceptée avant que l'objet existe.
  function giveStartItems(ch, q) {
    const st = ch.quests.active[q.id];
    if (!st || st.given || !(q.startItems || []).length) return;
    for (const it of q.startItems) ch.addItem(it.id, it.count || 1);
    st.given = true;
  }

  function accept(ch, id) {
    const q = get(id);
    if (!q || ch.quests.active[id] || (ch.quests.done.includes(id) && !q.repeat)) return false;
    ch.quests.active[id] = { step: 0, progress: 0 };
    giveStartItems(ch, q);
    // Des étapes déjà satisfaites (objets en poche, niveau atteint) passent tout de suite.
    settle(ch, q);
    return true;
  }

  const state = (ch, id) => ch.quests.active[id] || null;
  const isDone = (ch, id) => { const q = get(id), st = state(ch, id); return !!(q && st && st.step >= q.steps.length); };

  // Texte d'avancement de l'étape courante, pour le journal et le suivi à l'écran.
  function stepText(ch, id) {
    const q = get(id), st = state(ch, id);
    if (!q || !st) return '';
    if (st.step >= q.steps.length) return q.turnIn && q.turnIn !== q.giver ? `Rendre la quête à ${npcName(q.turnIn)}` : `Retourner voir ${npcName(q.giver)}`;
    const s = q.steps[st.step];
    if (s.type === 'kill' || s.type === 'gather') return `${s.text} (${st.progress}/${s.count})`;
    if (s.type === 'kills') return `${s.text} (${texteKills(st, s)})`;
    if (s.type === 'collect') return `${s.text} (${Math.min(ch.count(s.item), s.count)}/${s.count})`;
    return s.text;
  }

  function npcName(id) {
    const n = (DATA.content.npcs || []).find(x => x.id === id);
    return n ? n.name : id;
  }

  // Étape `equip` : une pièce précise portée (`item`, « Marcheur un jour »), sinon un emplacement occupé.
  const equipMet = (ch, s) => s.item
    ? Object.values(ch.equipment).includes(s.item)
    : Object.keys(ch.equipment).some(k => ch.equipment[k] && (k === s.slot || (s.slot === 'anneau' && k.startsWith('anneau'))));

  // Termine les étapes automatiques en chaîne : objets déjà en poche, niveau déjà atteint,
  // pièce déjà portée, carte où l'on se trouve déjà.
  function settle(ch, q) {
    const st = ch.quests.active[q.id];
    let changed = false;
    while (st.step < q.steps.length) {
      const s = q.steps[st.step];
      if (s.type === 'collect' && ch.count(s.item) >= s.count) { ch.removeItem(s.item, s.count); st.step++; st.progress = 0; changed = true; continue; }
      if (s.type === 'level' && ch.level >= s.level) { st.step++; st.progress = 0; changed = true; continue; }
      if (s.type === 'equip' && equipMet(ch, s)) { st.step++; st.progress = 0; changed = true; continue; }
      if (s.type === 'visit' && ch.pos && ch.pos.map === s.map) { st.step++; st.progress = 0; changed = true; continue; }
      break;
    }
    return changed;
  }

  // Fait avancer les quêtes actives sur un événement. Retourne les quêtes touchées :
  // { quest, finished } ; finished vaut vrai si toutes les étapes sont faites.
  function onEvent(ch, ev) {
    const touched = [];
    for (const id in ch.quests.active) {
      const q = get(id);
      const st = ch.quests.active[id];
      if (!q || st.step >= q.steps.length) continue;
      const s = q.steps[st.step];
      let advanced = false;
      if (s.type === 'kill' && ev.type === 'kill' && ev.monster === s.monster) { st.progress++; if (st.progress >= s.count) advanced = true; touched.push({ quest: q, finished: false }); }
      else if (s.type === 'kills' && ev.type === 'kill') {
        // Les compteurs avancent en parallèle : la première ligne de ce monstre qui n'est pas pleine.
        const c = compteurs(st, s), i = s.kills.findIndex((k, j) => k.monster === ev.monster && c[j] < k.count);
        if (i >= 0) { c[i]++; if (pleins(st, s)) advanced = true; touched.push({ quest: q, finished: false }); }
      } else if (s.type === 'kills' && ev.type === 'fightEnd' && s.unCombat && !pleins(st, s)) {
        // Tout en un seul combat : un combat fini sans les avoir tous remplis les remet à zéro.
        if (compteurs(st, s).some(n => n > 0)) { st.counts = s.kills.map(() => 0); touched.push({ quest: q, finished: false }); }
      }
      else if (s.type === 'gather' && ev.type === 'gather' && ev.resource === s.resource) { st.progress++; if (st.progress >= s.count) advanced = true; touched.push({ quest: q, finished: false }); }
      else if (s.type === 'talk' && ev.type === 'talk' && ev.npc === s.npc) advanced = true;
      else if (s.type === 'visit' && ev.type === 'visit' && ev.map === s.map) advanced = true;
      else if (s.type === 'dungeon' && ev.type === 'dungeon' && ev.dungeon === s.dungeon) advanced = true;
      else if (s.type === 'equip' && ev.type === 'equip' && equipMet(ch, s)) advanced = true;
      if (advanced) { st.step++; st.progress = 0; delete st.counts; }
      if (settle(ch, q)) advanced = true;
      if (advanced || touched.some(t => t.quest === q)) {
        const done = st.step >= q.steps.length;
        const entry = touched.find(t => t.quest === q);
        if (entry) entry.finished = done; else touched.push({ quest: q, finished: done });
      } else if (ev.type === 'inventory' && st.step >= q.steps.length) {
        touched.push({ quest: q, finished: true });
      }
    }
    return touched;
  }

  // ----- Étapes de choix -----

  // À qui l'on répond : le PNJ de l'étape, sinon le donneur.
  const answerNpc = (q, s) => s.npc || q.giver;

  // Les quêtes en cours qui attendent une réponse auprès de ce PNJ.
  function answersFor(ch, npcId) {
    const out = [];
    for (const id in ch.quests.active) {
      const q = get(id), st = ch.quests.active[id];
      const s = q && q.steps[st.step];
      if (s && s.type === 'answer' && answerNpc(q, s) === npcId) out.push({ quest: q, step: s, index: st.step });
    }
    return out;
  }

  // Répond à une étape de choix : vérifie puis applique les effets de l'option (serment,
  // reniement : js/factions.js), retient la réponse et avance. L'effet « later » rend la quête
  // au PNJ sans rien changer : elle reste à prendre plus tard (« Je refuse pour l'instant »).
  function answer(ch, id, optionId, npcId) {
    const q = get(id), st = state(ch, id);
    const s = q && st && q.steps[st.step];
    if (!s || s.type !== 'answer') return { ok: false, reason: 'Aucune question en attente.' };
    if (npcId != null && answerNpc(q, s) !== npcId) return { ok: false, reason: `C'est à ${npcName(answerNpc(q, s))} qu'il faut répondre.` };
    const opt = (s.options || []).find(o => o.id === optionId);
    if (!opt) return { ok: false, reason: 'Réponse inconnue.' };
    const effects = opt.effects || [];
    for (const ef of effects) { const c = Factions.canApply(ch, ef); if (!c.ok) return c; }
    const events = [];
    for (const ef of effects) events.push(...Factions.apply(ch, ef));
    if (effects.some(ef => ef.type === 'later')) {
      delete ch.quests.active[id];
      return { ok: true, quest: q, option: opt, later: true, events, dropped: [] };
    }
    st.choices = Object.assign({}, st.choices, { [st.step]: opt.id });
    st.step++; st.progress = 0;
    settle(ch, q);
    // Un serment renié emporte les quêtes en cours qui l'exigeaient.
    const dropped = effects.some(ef => ef.type === 'renounce') ? dropUnmet(ch, id) : [];
    return { ok: true, quest: q, option: opt, done: isDone(ch, id), events, dropped };
  }

  function dropUnmet(ch, keep) {
    const out = [];
    for (const id of Object.keys(ch.quests.active)) {
      const q = get(id), r = (q && q.requires) || {};
      if (id === keep || !(r.faction || r.factionRank) || requirementsMet(ch, q)) continue;
      delete ch.quests.active[id];
      out.push(q);
    }
    return out;
  }

  // Les réponses retenues d'une quête lues dans une sauvegarde : seulement des étapes de choix
  // déjà passées et des options qui existent. Rend null si quelque chose ne va pas.
  function checkChoices(q, raw, step) {
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null;
    const out = {};
    for (const k of Object.keys(raw)) {
      const i = Number(k), s = q.steps[i];
      if (!Number.isInteger(i) || i < 0 || i >= step || !s || s.type !== 'answer' || !(s.options || []).some(o => o.id === raw[k])) return null;
      out[i] = raw[k];
    }
    return out;
  }

  // ----- Abandon -----

  // Abandonner une quête en cours : l'avancement est perdu, la quête redevient disponible. Une
  // quête où l'on a déjà répondu ne s'abandonne plus (un serment prêté reste prêté) ; les objets
  // remis au départ sont repris, et sans eux la quête ne s'abandonne pas.
  function canAbandon(ch, id) {
    const q = get(id), st = state(ch, id);
    if (!q || !st) return { ok: false, reason: 'Cette quête n\'est pas en cours.' };
    if (st.choices && Object.keys(st.choices).length) return { ok: false, reason: 'Ton choix est fait : cette quête ne s\'abandonne plus.' };
    if (st.given) for (const it of q.startItems || []) if (!ch.has(it.id, it.count || 1)) { const d = typeof Items !== 'undefined' && Items.get(it.id); return { ok: false, reason: `${d ? d.name : it.id} est déjà utilisé : cette quête ne s'abandonne plus.` }; }
    return { ok: true };
  }

  function abandon(ch, id) {
    const c = canAbandon(ch, id);
    if (!c.ok) return c;
    const q = get(id), st = state(ch, id);
    if (st.given) for (const it of q.startItems || []) ch.removeItem(it.id, it.count || 1);
    delete ch.quests.active[id];
    return { ok: true, quest: q };
  }

  // ----- Remise -----

  // Remet les récompenses d'une quête terminée. Retourne ce qui a été gagné. Une quête
  // répétable (le serment, le reniement) ne paie qu'une fois.
  function complete(ch, id) {
    const q = get(id);
    if (!q || !isDone(ch, id)) return null;
    const first = !ch.quests.done.includes(id);
    delete ch.quests.active[id];
    if (first) { ch.quests.done.push(id); ch.counters.questsDone++; }
    const r = first ? (q.rewards || {}) : {};
    const out = { quest: q, xp: 0, levels: 0, fils: r.fils || 0, items: [], first, events: [] };
    if (r.xp) { const g = ch.gainXp(r.xp); out.xp = g.gained; out.levels = g.levels; }
    if (r.fils) { ch.fils += r.fils; ch.counters.filsEarned += r.fils; }
    for (const it of r.items || []) { ch.addItem(it.id, it.count || 1); out.items.push(it); }
    // Points de faction, si le serment est toujours celui que la quête exige ; confiance des
    // Francs-Marcheurs.
    if (r.faction && Factions.requirementsMet(ch, q.requires || {})) out.events.push(...Factions.addPoints(ch, r.faction));
    if (r.marcheurs) out.events.push(...Factions.addMarcheurs(ch, r.marcheurs));
    return out;
  }

  // Suivi pour l'écran : les quêtes actives, principale d'abord.
  function tracker(ch) {
    return Object.keys(ch.quests.active).map(id => get(id)).filter(Boolean)
      .sort((a, b) => (b.main ? 1 : 0) - (a.main ? 1 : 0) || a.level - b.level)
      .map(q => ({ quest: q, text: stepText(ch, q.id), done: isDone(ch, q.id) }));
  }

  return {
    defs, get, requirementsMet, canStart, available, turnInOf, activeFor, readyFor, canTurnIn, accept, giveStartItems, state, isDone, stepText,
    onEvent, answerNpc, answersFor, answer, checkChoices, canAbandon, abandon, complete, tracker, npcName, compteurs,
  };
})();
