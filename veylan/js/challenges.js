const Challenges = (() => {
  const isDamage = s => s.effects.some(ef => ef.type === 'damage' || ef.type === 'charge');
  const monsters = c => c.entities.filter(e => e.team === 'monster' && !e.isSummon);
  const vivants = c => monsters(c).filter(m => m.alive);
  const duCamp = (c, e) => !!e && (e === c.player || e.team === 'player');
  const sorts = c => ((c.player && c.player.spells) || []).map(id => DATA.spells[id]).filter(Boolean);
  const aEffet = (c, types) => sorts(c).some(s => (s.effects || []).some(ef => types.includes(ef.type)));
  const contreObstacle = (c, p) => [[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dy]) => !c.isWalkable(p.x + dx, p.y + dy));
  const vu = (c, e) => c.enemies(e).some(t => t.alive && c.canSee(e, t) && c.hasLos(t, t.pos, e.pos));
  const designer = (c, st, pref) => {
    const m = vivants(c);
    st.cible = m.length ? m[Math.floor(c.rng() * m.length)] : null;
    if (st.cible) st.desc = `${pref} ${st.cible.name}.`;
  };

  const LIST = [
    { id: 'racine', name: 'Racine', bonus: 25, desc: 'Finir chaque tour sur sa case de départ.',
      onTurnEnd(c, st, e) { if (e.turnStartPos && (e.x !== e.turnStartPos.x || e.y !== e.turnStartPos.y)) return 'tu as fini ton tour ailleurs'; } },
    { id: 'pas_compte', name: 'Pas compté', bonus: 25, desc: 'Un seul PM par tour.',
      onTurnStart(c, st) { st.steps = 0; },
      onStep(c, st) { if (++st.steps > 1) return 'deux pas dans le même tour'; } },
    { id: 'main_nue', name: 'Main nue', bonus: 30, desc: 'Ne frapper qu\'avec son arme.',
      eligible: c => !!c.player && (c.player.spells || []).includes('arme'),
      onCast(c, st, e, s, id) { if (id !== 'arme' && isDamage(s)) return `${s.name} n'est pas ton arme`; } },
    { id: 'sans_repit', name: 'Sans répit', bonus: 20, desc: 'Attaquer à chacun de ses tours.',
      onTurnStart(c, st) { st.hit = false; },
      onCast(c, st, e, s) { if (isDamage(s)) st.hit = true; },
      onTurnEnd(c, st) { if (!st.hit) return 'un tour sans attaquer'; } },
    { id: 'designe', name: 'Désigné', bonus: 30, desc: 'Tuer d\'abord le monstre désigné.',
      eligible: c => monsters(c).length >= 2,
      onStart(c, st) { const m = monsters(c); st.target = m[Math.floor(c.rng() * m.length)]; st.desc = `Tuer d'abord ${st.target.name}.`; },
      onKill(c, st, t) {
        if (st.done || t.team !== 'monster' || t.isSummon) return;
        if (t !== st.target) return `${t.name} est tombé avant ${st.target.name}`;
        st.done = true;
      } },
    { id: 'dans_l_ordre', name: 'Dans l\'ordre', bonus: 35, desc: 'Tuer les monstres dans l\'ordre affiché.',
      eligible: c => monsters(c).length >= 2,
      onStart(c, st) { st.order = monsters(c).slice(); st.desc = `Tuer dans l'ordre : ${st.order.map(m => m.name).join(', ')}.`; },
      onKill(c, st, t) {
        if (t.team !== 'monster' || t.isSummon || !st.order.includes(t)) return;
        const next = st.order.find(m => m.alive || m === t);
        if (next !== t) return `${t.name} est tombé avant ${next.name}`;
        st.order = st.order.filter(m => m !== t);
      } },
    { id: 'eclaireur', name: 'Éclaireur', bonus: 25, desc: 'Finir chaque tour à 3 cases ou plus de tout ennemi.',
      onTurnEnd(c, st, e) { if (c.enemies(e).some(t => !t.isSummon && Grid.dist(t.pos, e.pos) < 3)) return 'un ennemi à moins de 3 cases'; } },
    { id: 'au_contact', name: 'Au contact', bonus: 25, desc: 'Finir chaque tour au contact d\'un ennemi.',
      onTurnEnd(c, st, e) { if (!c.enemies(e).some(t => Grid.dist(t.pos, e.pos) === 1)) return 'aucun ennemi au contact'; } },
    { id: 'un_seul_fil', name: 'Un seul fil', bonus: 30, desc: 'N\'utiliser qu\'un élément de tout le combat.',
      onCast(c, st, e, s) {
        if (!isDamage(s)) return;
        st.element = st.element || s.element;
        if (s.element !== st.element) return `${DATA.elements[s.element].label} après ${DATA.elements[st.element].label}`;
      } },
    { id: 'econome', name: 'Économe', bonus: 20, desc: 'Trois sorts au plus par tour.',
      onTurnStart(c, st) { st.casts = 0; },
      onCast(c, st) { if (++st.casts > 3) return 'un quatrième sort dans le même tour'; } },
    { id: 'vite', name: 'Vite', bonus: 30, desc: 'Gagner en quatre tours ou moins.',
      onEnd(c, st, victory) { if (victory && c.round > 4) return `victoire au tour ${c.round}`; } },
    { id: 'intact', name: 'Intact', bonus: 30, desc: 'Ne jamais descendre sous la moitié de ses PV.',
      onDamage(c, st, e) { if (e.hp < e.hpMax / 2) return 'sous la moitié des PV'; } },

    { id: 'epargne', name: 'Épargné', bonus: 30, desc: 'Tuer en dernier le monstre désigné.',
      eligible: c => monsters(c).length >= 2,
      onStart(c, st) { const m = monsters(c); st.cible = m[Math.floor(c.rng() * m.length)]; st.desc = `Tuer ${st.cible.name} en dernier.`; },
      onKill(c, st, t) {
        if (t === st.cible && vivants(c).length) return `${t.name} est tombé avant les autres`;
      } },
    { id: 'petit_a_petit', name: 'Petit à petit', bonus: 25, desc: 'Tuer les monstres du plus faible niveau au plus fort.',
      eligible: c => new Set(monsters(c).map(m => m.level)).size >= 2,
      onKill(c, st, t) {
        if (t.team !== 'monster' || t.isSummon) return;
        const plusBas = vivants(c).find(m => m.level < t.level);
        if (plusBas) return `${t.name} (niveau ${t.level}) avant ${plusBas.name} (niveau ${plusBas.level})`;
      } },
    { id: 'la_tete', name: 'La tête d\'abord', bonus: 25, desc: 'Tuer les monstres du plus fort niveau au plus faible.',
      eligible: c => new Set(monsters(c).map(m => m.level)).size >= 2,
      onKill(c, st, t) {
        if (t.team !== 'monster' || t.isSummon) return;
        const plusHaut = vivants(c).find(m => m.level > t.level);
        if (plusHaut) return `${t.name} (niveau ${t.level}) avant ${plusHaut.name} (niveau ${plusHaut.level})`;
      } },
    { id: 'd_un_elan', name: 'D\'un seul élan', bonus: 45, desc: 'Abattre les deux monstres dans le même tour de jeu.',
      eligible: c => monsters(c).length === 2,
      onKill(c, st, t) {
        if (t.team !== 'monster' || t.isSummon) return;
        if (st.tour == null) st.tour = c.round;
        if (c.round !== st.tour) return `${t.name} est tombé un tour plus tard`;
      } },

    { id: 'acharne', name: 'Acharné', bonus: 20, desc: 'Un monstre touché doit tomber avant d\'en toucher un autre.',
      eligible: c => monsters(c).length >= 2,
      onHit(c, st, t, coup) {
        if (!duCamp(c, coup.source) || t.team !== 'monster' || t.isSummon) return;
        if (st.cible && st.cible.alive && st.cible !== t) return `${t.name} touché avant la chute de ${st.cible.name}`;
        st.cible = t;
      } },
    { id: 'oeilleres', name: 'Œillères', bonus: 30, desc: 'Ne toucher que le monstre désigné, jusqu\'à sa chute.',
      eligible: c => monsters(c).length >= 2,
      onStart(c, st) { designer(c, st, 'Ne toucher que'); },
      onKill(c, st, t) { if (t === st.cible) designer(c, st, 'Puis seulement'); },
      onHit(c, st, t, coup) {
        if (!duCamp(c, coup.source) || t.team !== 'monster' || t.isSummon || !st.cible) return;
        if (t !== st.cible && st.cible.alive) return `${t.name} touché au lieu de ${st.cible.name}`;
      } },
    { id: 'girouette', name: 'Girouette', bonus: 35, desc: 'Ne toucher que le monstre désigné ; il change à chaque tour.',
      eligible: c => monsters(c).length >= 2,
      onTurnStart(c, st) { designer(c, st, 'Ce tour-ci, ne toucher que'); },
      onKill(c, st, t) { if (t === st.cible) designer(c, st, 'Ce tour-ci, ne toucher que'); },
      onHit(c, st, t, coup) {
        if (!duCamp(c, coup.source) || t.team !== 'monster' || t.isSummon || !st.cible) return;
        if (t !== st.cible && st.cible.alive) return `${t.name} touché au lieu de ${st.cible.name}`;
      } },
    { id: 'au_plus_pres', name: 'Au plus près', bonus: 15, desc: 'Ne toucher que le monstre le plus proche.',
      eligible: c => monsters(c).length >= 2,
      onTurnStart(c, st) { st.proches = null; },
      onHit(c, st, t, coup) {
        if (!duCamp(c, coup.source) || t.team !== 'monster' || t.isSummon) return;
        if (!st.proches || !st.proches.some(m => m.alive)) {
          const m = vivants(c).concat(t.alive ? [] : [t]);
          const d = Math.min(...m.map(x => Grid.dist(x.pos, c.player.pos)));
          st.proches = m.filter(x => Grid.dist(x.pos, c.player.pos) === d);
        }
        if (!st.proches.includes(t)) return `${t.name} n'était pas le plus proche`;
      } },
    { id: 'sans_lendemain', name: 'Sans lendemain', bonus: 35, desc: 'Un monstre touché ne doit pas rejouer.',
      onHit(c, st, t, coup) { if (duCamp(c, coup.source) && t.team === 'monster' && !t.isSummon) (st.touches = st.touches || new Set()).add(t); },
      onAnyTurnStart(c, st, e) { if (st.touches && st.touches.has(e)) return `${e.name}, touché, a rejoué`; } },

    { id: 'gants_blancs', name: 'Gants blancs', bonus: 50, desc: 'N\'achever aucun monstre d\'un coup direct : poussée, piège, glyphe, brûlure ou invocation.',
      eligible: c => aEffet(c, ['trap', 'glyph', 'dot', 'echo', 'summon']),
      onKill(c, st, t, coup) {
        if (t.team !== 'monster' || t.isSummon || !coup) return;
        if (coup.direct && coup.source === c.player) return `${t.name} achevé d'un coup direct`;
      } },
    { id: 'sans_redite', name: 'Sans redite', bonus: 45, desc: 'Chaque sort une seule fois de tout le combat.',
      eligible: c => sorts(c).length >= 8 && monsters(c).length <= 2,
      onCast(c, st, e, s, id) {
        st.lances = st.lances || new Set();
        if (st.lances.has(id)) return `${s.name} lancé une deuxième fois`;
        st.lances.add(id);
      } },
    { id: 'varie', name: 'Varié', bonus: 20, desc: 'Chaque sort une seule fois par tour.',
      onTurnStart(c, st) { st.lances = new Set(); },
      onCast(c, st, e, s, id) {
        st.lances = st.lances || new Set();
        if (st.lances.has(id)) return `${s.name} deux fois dans le même tour`;
        st.lances.add(id);
      } },
    { id: 'sans_arme', name: 'Sans arme', bonus: 10, desc: 'Ne jamais frapper avec son arme.',
      eligible: c => !!c.player && (c.player.spells || []).includes('arme'),
      onCast(c, st, e, s, id) { if (id === 'arme') return 'un coup d\'arme'; } },
    { id: 'tout_donner', name: 'Tout donner', bonus: 15, desc: 'Finir chaque tour sans assez de PA pour un sort.',
      onTurnEnd(c, st, e) {
        const reste = (e.spells || []).map(id => DATA.spells[id] && c.spellState(e, id).ok ? DATA.spells[id] : null).find(Boolean);
        if (reste) return `${e.pa} PA laissés, de quoi lancer ${reste.name}`;
      } },
    { id: 'errant', name: 'Errant', bonus: 20, desc: 'Dépenser tous ses PM à chaque tour.',
      onTurnEnd(c, st, e) {
        const libre = [[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dy]) => c.isWalkable(e.x + dx, e.y + dy, e) && !c.entityAt(e.x + dx, e.y + dy));
        if (e.pm > 0 && libre) return `${e.pm} PM laissés`;
      } },
    { id: 'sans_entrave', name: 'Sans entrave', bonus: 10, desc: 'Ne retirer ni PA ni PM aux monstres.',
      eligible: c => aEffet(c, ['pa', 'pm', 'steal']),
      onRetrait(c, st, t, kind) { if (t.team === 'monster') return `${kind.toUpperCase()} retirés à ${t.name}`; } },

    { id: 'indemne', name: 'Indemne', bonus: 40, desc: 'Ne perdre aucun PV.',
      onStart(c, st) { st.pv = c.player.hp; },
      onHeal(c, st, e) { st.pv = Math.max(st.pv, e.hp); },
      onDamage(c, st, e) { if (e.hp < st.pv) return 'des PV perdus'; } },
    { id: 'sans_soin', name: 'Sans soin', bonus: 10, desc: 'Ne recevoir aucun soin (voler de la vie reste permis).',
      eligible: c => aEffet(c, ['heal', 'healPct']),
      onHeal(c, st, e, h) { return `${h} PV soignés`; } },
    { id: 'insaisissable', name: 'Insaisissable', bonus: 15, desc: 'Ne perdre aucun PA ni PM à cause d\'un ennemi.',
      onLose(c, st, e, kind) { return kind === 'tacle' ? 'taclé' : `${kind.toUpperCase()} perdus`; } },

    { id: 'a_couvert', name: 'À couvert', bonus: 40, desc: 'Finir chaque tour hors de vue de tout ennemi.',
      eligible: c => !!(c.map && c.map.cells) && c.map.cells.some(r => r.some(t => t === Grid.ROCK || t === Grid.TREE)),
      onTurnEnd(c, st, e) { if (vu(c, e)) return 'un ennemi te voyait'; } },
    { id: 'a_decouvert', name: 'À découvert', bonus: 15, desc: 'Finir chaque tour en vue d\'un ennemi.',
      onTurnEnd(c, st, e) { if (!vu(c, e)) return 'aucun ennemi ne te voyait'; } },
    { id: 'rase_murs', name: 'Rase-murs', bonus: 30, desc: 'Finir chaque tour contre un obstacle ou le bord.',
      onTurnEnd(c, st, e) { if (!contreObstacle(c, e.pos)) return 'aucun obstacle au contact'; } },
    { id: 'contre_le_mur', name: 'Contre le mur', bonus: 40, desc: 'Achever chaque monstre contre un obstacle ou le bord.',
      eligible: c => aEffet(c, ['push', 'pull']),
      onKill(c, st, t) { if (t.team === 'monster' && !t.isSummon && !contreObstacle(c, t.pos)) return `${t.name} est tombé loin de tout obstacle`; } },
    { id: 'sur_la_place', name: 'Sur la place', bonus: 30, desc: 'Après avoir achevé un monstre, finir son tour sur sa case.',
      onTurnStart(c, st) { st.cases = []; },
      onKill(c, st, t) { if (t.team === 'monster' && !t.isSummon && c.actor === c.player) (st.cases = st.cases || []).push({ x: t.x, y: t.y }); },
      onTurnEnd(c, st, e) { if ((st.cases || []).length && !st.cases.some(p => p.x === e.x && p.y === e.y)) return 'pas sur la case d\'un monstre achevé'; } },
  ];

  class Challenge {
    constructor(def) {
      this.def = def;
      this.id = def.id;
      this.name = def.name;
      this.bonus = def.bonus;
      this.desc = def.desc;
      this.state = { };
      this.failed = null;
      this.success = false;
      this.over = false;
    }

    event(name, combat, ...args) {
      if (this.over) return false;
      if (name === 'onStart' && this.state.desc) this.desc = this.state.desc;
      const fn = this.def[name];
      let changed = false;
      if (fn && !this.failed) {
        const why = fn.call(this.def, combat, this.state, ...args);
        if (this.state.desc && this.state.desc !== this.desc) {
          this.desc = this.state.desc; changed = true;
          if (name !== 'onStart') combat.log(`Défi (${this.name}) : ${this.desc}`, 'system');
        }
        if (why) {
          this.failed = why;
          combat.log(`Défi raté (${this.name}) : ${why}.`, 'system');
          changed = true;
        }
      }
      if (name === 'onStart') combat.log(`Défi : ${this.name}. ${this.desc} (+${this.bonus} % d'XP et de butin)`, 'system');
      if (name === 'onEnd') {
        this.over = true;
        this.success = !!args[0] && !this.failed;
        if (this.success) combat.log(`Défi réussi : ${this.name}, +${this.bonus} % d'XP et de butin.`, 'system');
        changed = true;
      }
      return changed;
    }
  }

  function pick(combatLike, rng) {
    const ok = LIST.filter(d => !d.eligible || d.eligible(combatLike));
    const imposes = (typeof DATA === 'object' && DATA.succes && DATA.succes.defisBoss) || {};
    const boss = ((combatLike && combatLike.entities) || []).find(e => e.team === 'monster' && e.boss && imposes[e.def.id]);
    const impose = boss && ok.find(d => d.id === imposes[boss.def.id]);
    if (impose) return new Challenge(impose);
    return new Challenge(ok[Math.floor(rng() * ok.length)]);
  }

  return { LIST, Challenge, pick, byId: id => LIST.find(d => d.id === id) };
})();
