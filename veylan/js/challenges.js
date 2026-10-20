// Les Défis : une contrainte tirée au sort au début d'un combat du monde. Réussie, elle donne un
// bonus d'XP et de butin. Le moteur de combat appelle `event(nom, combat, ...)` aux moments clés
// (onStart, onTurnStart, onStep, onCast, onTurnEnd, onKill, onDamage, onEnd) ; un défi raté le
// reste jusqu'à la fin du combat.
const Challenges = (() => {
  const isDamage = s => s.effects.some(ef => ef.type === 'damage' || ef.type === 'charge');
  const monsters = c => c.entities.filter(e => e.team === 'monster' && !e.isSummon);

  const LIST = [
    { id: 'racine', name: 'Racine', bonus: 25, desc: 'Finir chaque tour sur sa case de départ.',
      onTurnEnd(c, st, e) { if (e.turnStartPos && (e.x !== e.turnStartPos.x || e.y !== e.turnStartPos.y)) return 'tu as fini ton tour ailleurs'; } },
    { id: 'pas_compte', name: 'Pas compté', bonus: 25, desc: 'Un seul PM par tour.',
      onTurnStart(c, st) { st.steps = 0; },
      onStep(c, st) { if (++st.steps > 1) return 'deux pas dans le même tour'; } },
    { id: 'main_nue', name: 'Main nue', bonus: 30, desc: 'Ne frapper qu\'avec son arme.',
      eligible: c => c.player.spells.includes('arme'),
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
        if (t.team !== 'monster' || t.isSummon) return;
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
  ];

  class Challenge {
    constructor(def) {
      this.def = def;
      this.id = def.id;
      this.name = def.name;
      this.bonus = def.bonus;
      this.desc = def.desc;
      this.state = { };
      this.failed = null;      // la raison de l'échec, s'il y en a un
      this.success = false;
      this.over = false;
    }

    // Retourne vrai si l'état du défi a changé (pour rafraîchir l'interface).
    event(name, combat, ...args) {
      if (this.over) return false;
      if (name === 'onStart' && this.state.desc) this.desc = this.state.desc;
      const fn = this.def[name];
      let changed = false;
      if (fn && !this.failed) {
        const why = fn.call(this.def, combat, this.state, ...args);
        if (name === 'onStart' && this.state.desc) { this.desc = this.state.desc; changed = true; }
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

  // Tire un défi au sort parmi ceux qui ont un sens pour ce combat.
  function pick(combatLike, rng) {
    const ok = LIST.filter(d => !d.eligible || d.eligible(combatLike));
    return new Challenge(ok[Math.floor(rng() * ok.length)]);
  }

  return { LIST, Challenge, pick, byId: id => LIST.find(d => d.id === id) };
})();
