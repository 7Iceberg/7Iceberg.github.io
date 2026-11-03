const Quests = (() => {
  const defs = () => (DATA.content && DATA.content.quests) || [];
  const get = id => defs().find(q => q.id === id) || null;

  function compteurs(st, s) {
    if (!Array.isArray(st.counts) || st.counts.length !== s.kills.length) st.counts = s.kills.map(() => 0);
    return st.counts;
  }
  const pleins = (st, s) => compteurs(st, s).every((n, i) => n >= s.kills[i].count);
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
    if (r.classe && ch.classId !== r.classe) return false;
    for (const id of r.quests || []) if (!ch.quests.done.includes(id)) return false;
    if ((r.faction || r.notFaction || r.factionRank) && !Factions.requirementsMet(ch, r)) return false;
    return true;
  }

  function canStart(ch, id) {
    const q = get(id);
    return !!(q && !ch.quests.active[id] && (q.repeat || !ch.quests.done.includes(id)) && requirementsMet(ch, q));
  }

  function available(ch, npcId) {
    return defs().filter(q => q.giver === npcId && !q.hidden && canStart(ch, q.id));
  }

  const turnInOf = q => q.turnIn || q.giver;

  function activeFor(ch, npcId) {
    return defs().filter(q => (q.giver === npcId || q.turnIn === npcId) && ch.quests.active[q.id]);
  }

  function readyFor(ch, npcId) {
    return defs().filter(q => ch.quests.active[q.id] && turnInOf(q) === npcId && isDone(ch, q.id));
  }
  const canTurnIn = (ch, id, npcId) => { const q = get(id); return !!(q && turnInOf(q) === npcId && isDone(ch, id)); };

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
    settle(ch, q);
    return true;
  }

  const state = (ch, id) => ch.quests.active[id] || null;
  const isDone = (ch, id) => { const q = get(id), st = state(ch, id); return !!(q && st && st.step >= q.steps.length); };

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

  const equipMet = (ch, s) => s.item
    ? Object.values(ch.equipment).includes(s.item)
    : Object.keys(ch.equipment).some(k => ch.equipment[k] && (k === s.slot || (s.slot === 'anneau' && k.startsWith('anneau'))));

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
        const c = compteurs(st, s), i = s.kills.findIndex((k, j) => k.monster === ev.monster && c[j] < k.count);
        if (i >= 0) { c[i]++; if (pleins(st, s)) advanced = true; touched.push({ quest: q, finished: false }); }
      } else if (s.type === 'kills' && ev.type === 'fightEnd' && s.unCombat && !pleins(st, s)) {
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


  const answerNpc = (q, s) => s.npc || q.giver;

  function answersFor(ch, npcId) {
    const out = [];
    for (const id in ch.quests.active) {
      const q = get(id), st = ch.quests.active[id];
      const s = q && q.steps[st.step];
      if (s && s.type === 'answer' && answerNpc(q, s) === npcId) out.push({ quest: q, step: s, index: st.step });
    }
    return out;
  }

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
    if (r.faction && Factions.requirementsMet(ch, q.requires || {})) out.events.push(...Factions.addPoints(ch, r.faction));
    if (r.marcheurs) out.events.push(...Factions.addMarcheurs(ch, r.marcheurs));
    if (r.spellPoints) { ch.spellPoints = (ch.spellPoints || 0) + r.spellPoints; out.spellPoints = r.spellPoints; }
    if (r.title && Array.isArray(ch.titles) && !ch.titles.includes(r.title)) { ch.titles.push(r.title); out.title = r.title; }
    return out;
  }

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
