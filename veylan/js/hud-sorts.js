// Fenêtre « Sorts » (touche S), sur le modèle du grimoire de Dofus Touch dans la charte de Veylan :
// à gauche un filtre par type et la liste des sorts de la classe (icône, nom, rang entre « − » et
// « + », coût prévu) ; à droite la fiche du sort choisi, rang par rang (onglets 1 à 5) : coût,
// portée, critique, effets, ce que change le rang suivant, récit ; en bas le capital de points,
// la réinitialisation et la répartition automatique.
// Les « + » ne font que prévoir : rien ne change avant « Valider » et sa confirmation, que la
// fenêtre redemande si on la ferme avec des changements en attente. « − » ne retire qu'un rang
// prévu ; les rangs validés ne se rendent que par « Réinitialiser tout ».
// Événements DOM sur window : `veylan:windowOpen` ({ id: 'sorts' }) à l'ouverture (js/fenetres.js),
// `veylan:spellUpgraded` ({ id, rank }) pour chaque sort monté, `veylan:chat` (message système)
// après une validation. Les rangs sont dans js/character.js et DATA.spellRanks (js/data.js), les
// icônes dans js/sort-icones.js. Se charge après js/hud-fenetres.js et complète la classe Hud.
(() => {
const I = Fenetres.ICON;
const esc = s => Util.esc(s);
const R = () => DATA.spellRanks;

const TYPES = [['tous', 'Tous'], ['degats', 'Dégâts'], ['soin', 'Soin'], ['bouclier', 'Bouclier'], ['deplacement', 'Déplacement'], ['controle', 'Contrôle'], ['invocation', 'Invocation'], ['piege', 'Piège'], ['autres', 'Autres']];
const VERROU = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/></svg>';
const CIBLE = { free: 'case libre', enemy: 'ennemi', ally: 'allié', summon: 'invocation alliée', entity: 'une créature', any: 'toute case' };

// Les types d'un sort, d'après ses effets (un sort peut en avoir plusieurs) ; « Autres » s'il n'en a aucun.
function typesOf(s) {
  const t = new Set();
  const all = s.effects.concat(s.selfEffects || []);
  const walk = list => {
    for (const ef of list) {
      if (ef.type === 'damage' || ef.type === 'sacrifice' || ef.type === 'dot') t.add('degats');
      if (ef.type === 'heal') t.add('soin');
      if (ef.type === 'shield' || ef.type === 'guard' || (ef.type === 'steal' && ef.what === 'shield')) t.add('bouclier');
      if (['teleport', 'leap', 'retreat', 'charge', 'swap', 'push', 'pull'].includes(ef.type)) t.add('deplacement');
      if (((ef.type === 'pa' || ef.type === 'pm') && ef.value < 0) || (ef.type === 'steal' && ef.what !== 'shield') || ef.type === 'obstacle' || (ef.type === 'state' && ef.name === 'provoked')) t.add('controle');
      if (ef.type === 'summon') t.add('invocation');
      if (ef.type === 'trap') t.add('piege');
      if (ef.effects) walk(ef.effects);
    }
  };
  walk(all);
  if (s.lifesteal) t.add('soin');
  if (s.target === 'summon') t.add('invocation');
  if (all.some(ef => ef.type === 'pmNow' || (ef.type === 'pm' && ef.value > 0)) && !all.some(ef => ef.type === 'power' || ef.type === 'damage')) t.add('deplacement');
  if (!t.size) t.add('autres');
  return t;
}

const el = e => DATA.elements[e].label.toLowerCase();
const plural = (n, w) => `${n} ${w}${n > 1 ? 's' : ''}`;
const tours = n => n === 0 ? 'ce tour' : plural(n, 'tour');
const jet = ef => { const v = DATA.rankShown(ef); return v.min === v.max ? `${v.min}` : `${v.min} à ${v.max}`; };
const pct = m => `+${Math.round((m - 1) * 100)} %`;

// Les lignes [libellé, valeur, sous-ligne] d'un effet au rang du sort `s` (jets et valeurs déjà au
// rang) ; `crit` ajoute le coup critique sous chaque jet de dégâts (× 1,5, js/combat.js rollDamage).
function lignes(ef, s, crit) {
  const critique = () => crit ? [['Coup critique', `${Math.round(ef.min * (ef.mult || 1) * 1.5)} à ${Math.round(ef.max * (ef.mult || 1) * 1.5)} ${el(s.element)}`]] : [];
  const sous = list => list.map(([l, v]) => [l, v, true]);
  switch (ef.type) {
    case 'damage': return [['Dégâts', `${jet(ef)} ${el(s.element)}`]].concat(critique());
    case 'heal': return [['Soin', `${jet(ef)} PV`]];
    case 'sacrifice': return [['Sacrifice', `${jet(ef)} ${el(s.element)}, à ${plural(ef.radius, 'case')} de la bête`]].concat(critique());
    case 'shield': return [['Bouclier', `${Math.round(ef.value)} (${tours(ef.duration)})`]];
    case 'echo': return [['Écho', `${tours(ef.turns)} : ${Math.round(ef.min * (ef.mult || 1))} à ${Math.round(ef.max * (ef.mult || 1))} ${el(ef.element)} à chaque PM perdu, ${ef.uses} fois au plus`]];
    case 'dot': return [['Brûlure', `${Math.round(ef.value)} ${el(ef.element)} par tour (${tours(ef.turns)})`]];
    case 'power': return [['Puissance', `+${ef.value} % de dégâts (${tours(ef.turns)})`]];
    case 'vuln': return [['Marque', `+${ef.value} % de dégâts subis (${tours(ef.turns)})`]];
    case 'guard': return [['Garde', `−${ef.value} % de dégâts au contact (${tours(ef.turns)})`]];
    case 'pa': case 'pm':
      if (ef.type === 'pm' && ef.value <= -10) return [['Enracine', tours(ef.duration)]];
      return [[ef.value > 0 ? 'Donne' : 'Retire', `${Math.abs(ef.value)} ${ef.type.toUpperCase()} (${tours(ef.duration)})${ef.selfNow ? `, sur soi +${ef.selfNow} ${ef.type.toUpperCase()} tout de suite` : ''}`]];
    case 'push': return [['Pousse', `${plural(ef.cells, 'case')}${ef.ifSworn ? ' (le juré)' : ''}`]];
    case 'pull': return [['Attire', plural(ef.cells, 'case')]];
    case 'retreat': return [['Recule', plural(ef.cells, 'case')]];
    case 'swap': return [['Échange', 'les places avec la cible']];
    case 'teleport': return [['Téléportation', 'sur la case visée']];
    case 'leap': return [['Bond', 'sur la case visée, puis frappe autour']].concat(sous(ef.effects.flatMap(x => lignes(x, s, crit))));
    case 'trap': return [['Piège', `${ef.name || s.name}, invisible, au passage d'un ennemi`]].concat(sous(ef.effects.flatMap(x => lignes(x, s, crit))));
    case 'summon': return [['Invoque', `${DATA.monsters[ef.monster].name}${ef.hpPctOfOwner ? ` (${ef.hpPctOfOwner} % de tes PV)` : ''}`]];
    case 'obstacle': return [['Mur', tours(ef.turns)]];
    case 'state':
      if (ef.name === 'invisible') return [['Invisible', `${tours(ef.turns)}${ef.lingering ? ', jusqu\'à la fin du tour où tu frappes' : ''}`]];
      return [['Provoque', tours(ef.turns)]];
    case 'oath': return [['Serment', `${tours(ef.turns)}, +${ef.power} % contre le juré`], ['Brûlure du serment', `${Math.round(ef.burn)} feu`]];
    case 'track': return [['Traque', `${tours(ef.turns)}, ne peut plus se cacher`]];
    case 'steal': return [['Vole', ef.what === 'shield' ? `le bouclier${ef.orBonus ? ', ou le meilleur bonus' : ''}` : `${ef.value} ${ef.what.toUpperCase()}`]];
    case 'range': return [['Portée', `+${ef.value} (${tours(ef.turns)})`]];
    case 'cleanse': return [['Purge', 'tous les malus']];
    case 'devourShield': return [['Dévore', 'le bouclier']];
    case 'selfDamagePct': return [['Coûte', `${ef.pct} % de tes PV`]];
    case 'paNow': return [['Gagne', `${ef.value} PA tout de suite`]];
    case 'rewind': return [['Fin du tour', 'revient sur sa case de départ']];
    case 'pmNow': return [['Gagne', `${plural(ef.value, 'PM').replace('PMs', 'PM')} tout de suite`]];
    default: return [];
  }
}

// Ce que le sort fait en plus de ses effets (vol de vie, Fureur, Affût...).
function propres(s) {
  const out = [];
  if (s.lifesteal) out.push(['Vol de vie', `${s.lifesteal} % des dégâts`]);
  if (s.lowHpBonus) out.push(['Sous ' + s.lowHpBonus.below + ' % de tes PV', `dégâts × ${String(s.lowHpBonus.mult).replace('.', ',')}`]);
  if (s.executeBelow) out.push(['Cible sous ' + s.executeBelow + ' % de PV', 'dégâts doublés']);
  if (s.bonusIfInvisible) out.push(['Invisible', `dégâts × ${String(s.bonusIfInvisible).replace('.', ',')}`]);
  if (s.fury) out.push(['Fureur', `+${s.fury} si la cible est touchée`]);
  if (s.furySpend) out.push(['Fureur dépensée', `+${s.furySpend} % par point`]);
  if (s.oathPierce) out.push(['Contre le juré', 'ni esquive ni armure']);
  if (s.affutBonus) out.push(['À l\'affût', `+${s.affutBonus} % de dégâts`]);
  if (s.keepsAffut) out.push(['Affût', 'gardé']);
  if (s.telefrag) out.push(['Sur une créature', `téléfrag : les places s'échangent, +${s.telefrag} PA une fois par tour`]);
  if (s.markSight) out.push(['Cible traquée', 'visée à travers les obstacles']);
  if (s.trapReplaceOldest) out.push(['Au-delà de 3 pièges', 'le plus ancien disparaît']);
  if (s.purse) out.push(['Bourse', `+${s.purse} % de Fils et de butin si la cible tombe`]);
  if (s.onKill) out.push(['Si la cible tombe', s.onKill.flatMap(x => lignes(x, s)).map(([l, v]) => `${l.toLowerCase()} ${v}`).join(', ')]);
  return out;
}

// Ce que le rang `rank` change par rapport au précédent, en lignes [libellé, avant, après].
function changements(s, rank) {
  const out = [];
  const cd = n => n ? plural(n, 'tour') : 'aucune';
  const lim = n => n ? `${n} par tour` : 'sans limite';
  for (const c of DATA.rankChanges(s, rank)) {
    if (c.cle === 'mult') out.push(['Bonus de rang', pct(c.avant), pct(c.apres)]);
    else if (c.cle === 'pa') out.push(['Coût', `${c.avant} PA`, `${c.apres} PA`]);
    else if (c.cle === 'cooldown') out.push(['Relance', cd(c.avant), cd(c.apres)]);
    else if (c.cle === 'maxPerTurn') out.push(['Lancers', lim(c.avant), lim(c.apres)]);
    else if (c.cle === 'range') out.push(['Portée', `${c.avant[0]} à ${c.avant[1]}`, `${c.apres[0]} à ${c.apres[1]}`]);
    else {
      const a = c.avant ? lignes(c.avant, s) : [], b = c.apres ? lignes(c.apres, s) : [];
      for (let i = 0; i < b.length; i++) if (!a[i] || a[i][1] !== b[i][1]) out.push([b[i][0], a[i] ? a[i][1] : 'non', b[i][1]]);
    }
  }
  return out;
}

Object.assign(Hud.prototype, {
  // L'état de la fenêtre : sort choisi, filtre, rang regardé, rangs prévus, question en cours.
  sortsState() {
    return this.sorts || (this.sorts = { sel: null, filtre: 'tous', vue: null, pending: {}, modal: null });
  },

  // Le sort tel que le personnage le lance (sa voie comprise), et son rang avec ce qui est prévu.
  sortVu(id) { return this.world.ch.spellFor(id) || DATA.spells[id]; },
  sortRang(id) { return this.world.ch.spellRank(id) + (this.sortsState().pending[id] || 0); },

  // Coût de ce qui est prévu pour un sort, ou pour tous.
  sortsCout(id) {
    const ch = this.world.ch, P = this.sortsState().pending;
    let n = 0;
    for (const k of id ? [id] : Object.keys(P)) for (let i = 0; i < (P[k] || 0); i++) n += Character.rankCost(ch.spellRank(k) + i);
    return n;
  },
  sortsReste() { return this.world.ch.spellPoints - this.sortsCout(); },

  // Ce qui est prévu reste possible (un niveau, une réinitialisation, la répartition automatique ont
  // pu passer entre-temps) : on garde, sort par sort, les rangs que les points paient encore.
  sortsPurge() {
    const ch = this.world.ch, S = this.sortsState();
    const kept = {};
    let left = ch.spellPoints;
    for (const [id, n] of Object.entries(S.pending)) {
      let r = ch.spellRank(id), k = 0;
      while (k < n) { const c = ch.canRaiseSpell(id, r, left); if (!c.ok) break; left -= c.cost; r++; k++; }
      if (k) kept[id] = k;
    }
    S.pending = kept;
  },

  openSorts() {
    const S = this.sortsState();
    const ch = () => this.world.ch;
    const guard = () => { if (this.world.state === 'combat') { this.toast('Pas pendant un combat.'); return false; } return true; };
    const redraw = () => this.fen.render('sorts');
    const actions = {
      choisir: d => { S.sel = d.id; S.vue = null; redraw(); },
      vue: d => { S.vue = Number(d.rang); redraw(); },
      plus: d => {
        if (!guard()) return;
        const c = ch().canRaiseSpell(d.id, this.sortRang(d.id), this.sortsReste());
        S.sel = d.id; S.vue = null;
        if (c.ok) S.pending[d.id] = (S.pending[d.id] || 0) + 1; else this.toast(c.reason);
        redraw();
      },
      moins: d => {
        if (!(S.pending[d.id] > 0)) return;
        if (--S.pending[d.id] <= 0) delete S.pending[d.id];
        S.sel = d.id; S.vue = null; redraw();
      },
      annuler: () => { S.pending = {}; S.vue = null; redraw(); },
      valider: () => { if (guard() && Object.keys(S.pending).length) { S.modal = 'valider'; redraw(); } },
      reinit: () => { if (guard()) { S.modal = 'reinit'; redraw(); } },
      oui: () => {
        if (S.modal === 'reinit') this.sortsReset();
        else this.sortsValider(S.modal === 'fermer');
      },
      non: () => {
        if (S.modal === 'fermer') { S.pending = {}; S.modal = null; this.fen.close('sorts', true); return; }
        S.modal = null; redraw();
      },
    };
    const onField = (target, kind) => {
      if (target.id === 'sorts-filtre') { S.filtre = target.value; redraw(); }
      if (target.id === 'sorts-auto' && kind === 'change') {
        if (!guard()) { target.checked = ch().autoSpells; return; }
        ch().autoSpells = target.checked;
        if (target.checked) { S.pending = {}; ch().autoAllocateSpells(); this.toast('Répartition automatique : tes points de sort vont d\'abord à tes sorts de dégâts.'); }
        this.world.emit('save');
        this.world.emit('update');
      }
    };
    const after = body => { const b = body.querySelector('.vy-sorts__modale [data-act="oui"]'); if (b && !body.contains(document.activeElement)) b.focus({ preventScroll: true }); };
    this.simpleWin('sorts', 'Sorts', () => this.renderSorts(), actions, { width: 820, cls: 'vy-fenetre--sorts', onField, after, beforeClose: () => this.sortsAvantFermeture() });
  },

  // Fermer la fenêtre : une question ouverte se referme d'abord ; des rangs prévus font demander
  // s'il faut les valider.
  sortsAvantFermeture() {
    const S = this.sortsState();
    if (S.modal) { S.modal = null; this.fen.render('sorts'); return false; }
    if (Object.keys(S.pending).length) { S.modal = 'fermer'; this.fen.render('sorts'); return false; }
    S.vue = null;
    return true;
  },

  sortsValider(fermer) {
    const ch = this.world.ch, S = this.sortsState();
    const montes = [];
    for (const [id, n] of Object.entries(S.pending)) for (let i = 0; i < n; i++) { if (!ch.raiseSpell(id).ok) break; if (!montes.includes(id)) montes.push(id); }
    S.pending = {}; S.modal = null; S.vue = null;
    if (montes.length) {
      // Des rangs choisis à la main : la répartition automatique ne doit plus les défaire.
      ch.autoSpells = false;
      for (const id of montes) window.dispatchEvent(new CustomEvent('veylan:spellUpgraded', { detail: { id, rank: ch.spellRank(id) } }));
      window.dispatchEvent(new CustomEvent('veylan:chat', { detail: { type: 'systeme', text: 'Les changements de tes sorts sont enregistrés.' } }));
      this.world.emit('save');
    }
    if (fermer) this.fen.close('sorts', true);
    this.world.emit('update');
  },

  sortsReset() {
    const ch = this.world.ch, S = this.sortsState();
    const rendus = Character.spellPointsFor(ch.spellRanks);
    ch.resetSpells();
    ch.autoSpells = false;
    S.pending = {}; S.modal = null; S.vue = null;
    this.toast(rendus ? `Sorts remis au rang 1 : ${plural(rendus, 'point')} de sort rendu${rendus > 1 ? 's' : ''}.` : 'Tes sorts sont déjà tous au rang 1.');
    this.world.emit('save');
    this.world.emit('update');
  },

  renderSorts() {
    const ch = this.world.ch, S = this.sortsState();
    this.sortsPurge();
    const ids = ch.classDef.spells.slice().sort((a, b) => Character.unlockLevel(ch.classId, a) - Character.unlockLevel(ch.classId, b) || ch.classDef.spells.indexOf(a) - ch.classDef.spells.indexOf(b));
    if (!ids.includes(S.sel)) S.sel = ids[0];
    const reste = this.sortsReste();
    const enCombat = this.world.state === 'combat';
    const shown = ids.filter(id => S.filtre === 'tous' || typesOf(DATA.spells[id]).has(S.filtre));
    if (shown.length && !shown.includes(S.sel)) { S.sel = shown[0]; S.vue = null; }
    const rows = shown.map(id => this.sortLigne(id, reste, enCombat)).join('') || '<li class="vy-sorts__vide muted">Aucun sort de ce type.</li>';
    const options = TYPES.map(([k, l]) => `<option value="${k}" ${S.filtre === k ? 'selected' : ''}>${l}</option>`).join('');
    const unlocked = ch.unlockedSpells().length;
    const prevu = Object.keys(S.pending).length > 0;
    const pied = (prevu
      ? `<button class="vy-bouton vy-bouton--petit vy-bouton--fantome" data-act="annuler">Annuler</button><button class="vy-bouton vy-bouton--petit vy-bouton--primaire" data-act="valider">Valider</button>`
      : `<button class="vy-bouton vy-bouton--petit vy-bouton--fantome" data-act="reinit" ${Object.keys(ch.spellRanks).length && !enCombat ? '' : 'disabled'} title="Gratuit : tous tes points de sort te sont rendus">Réinitialiser tout</button>`) +
      `<label class="vy-coche" title="À chaque niveau, tes points vont d'abord à tes sorts de dégâts, puis aux autres"><input type="checkbox" id="sorts-auto" ${ch.autoSpells ? 'checked' : ''} ${enCombat ? 'disabled' : ''}> Répartition automatique des sorts</label>` +
      `<span class="vy-sorts__capital${reste > 0 ? ' on' : ''}">Capital de points : <b>${reste}</b></span>`;
    return `<div class="vy-sorts">
      <section class="vy-sorts__gauche" aria-label="Sorts de la classe">
        <div class="vy-sorts__outils"><select id="sorts-filtre" aria-label="Type de sort">${options}</select><span class="vy-sorts__compte muted">${unlocked} / ${ids.length}</span></div>
        <div class="vy-sorts__entete" aria-hidden="true"><span>Nom du sort</span><span>Rang</span><span>Points</span></div>
        <ul class="vy-sorts__liste" data-defile="sorts-liste" role="listbox" aria-label="Sorts">${rows}</ul>
      </section>
      ${this.sortFiche(S.sel)}
    </div>
    <footer class="vy-fen-pied vy-sorts__pied">${pied}</footer>
    ${S.modal ? this.sortsModale() : ''}`;
  },

  // Une ligne de la liste : le sort (bouton qui le choisit), son rang entre « − » et « + », le coût prévu.
  sortLigne(id, reste, enCombat) {
    const ch = this.world.ch, S = this.sortsState();
    const s = this.sortVu(id);
    const unlock = Character.unlockLevel(ch.classId, id);
    const locked = unlock > ch.level;
    const base = ch.spellRank(id), p = S.pending[id] || 0, rank = base + p;
    const pips = Array.from({ length: R().max }, (_, i) => {
      const r = i + 1;
      const cls = r <= base ? 'on' : r <= rank ? 'prevu' : R().levels[i] > ch.level ? 'verrou' : '';
      return `<i class="${cls}"></i>`;
    }).join('');
    const name = `<button class="vy-sort__choix" data-act="choisir" data-id="${id}" aria-label="${esc(s.name)}, rang ${rank}${locked ? `, se débloque au niveau ${unlock}` : ''}">` +
      `<img class="vy-sort__icone" src="${SortIcones.url(id, s, 80)}" width="36" height="36" alt="">` +
      `<span class="vy-sort__nom"><span>${esc(s.name)}</span><small>${s.pa} PA · ${el(s.element)}</small></span></button>`;
    if (locked) {
      return `<li class="vy-sort bloque${S.sel === id ? ' on' : ''}" role="option" aria-selected="${S.sel === id}">${name}` +
        `<span class="vy-sort__niveau">${VERROU}niveau ${unlock}</span><span class="vy-sort__points" aria-hidden="true">·</span></li>`;
    }
    const c = ch.canRaiseSpell(id, rank, reste);
    const plusOk = c.ok && !enCombat;
    const next = rank < R().max ? rank + 1 : null;
    const plusTitle = !next ? 'Rang maximum' : c.ok ? `Rang ${next} : ${plural(c.cost, 'point')}` : c.reason;
    const moins = p > 0
      ? `<button class="vy-sort__moins" data-act="moins" data-id="${id}" aria-label="Retirer un rang prévu à ${esc(s.name)}" title="Retirer un rang prévu">${I.moins}</button>`
      : `<button class="vy-sort__moins" disabled aria-label="Rangs validés : « Réinitialiser tout » les rend" title="Rangs validés : « Réinitialiser tout » les rend">${VERROU}</button>`;
    const plus = `<button class="vy-sort__plus" data-act="plus" data-id="${id}" ${plusOk ? '' : 'disabled'} aria-label="${esc(s.name)} : ${esc(plusTitle)}" title="${esc(plusTitle)}">` +
      `${next && R().levels[rank] > ch.level ? VERROU : I.plus}${next && c.cost != null && R().levels[rank] <= ch.level ? `<span class="vy-sort__cout">${Character.rankCost(rank)}</span>` : ''}</button>`;
    const cout = this.sortsCout(id);
    return `<li class="vy-sort${S.sel === id ? ' on' : ''}${p ? ' prevu' : ''}" role="option" aria-selected="${S.sel === id}">${name}` +
      `<span class="vy-sort__rang">${moins}<span class="vy-sort__valeur"><b>${rank}</b><span class="vy-pips" aria-hidden="true">${pips}</span></span>${plus}</span>` +
      `<span class="vy-sort__points${cout ? ' on' : ''}" title="${cout ? `${plural(cout, 'point')} prévu${cout > 1 ? 's' : ''}` : 'Rien de prévu'}">${cout ? '−' + cout : '·'}</span></li>`;
  },

  // La fiche du sort choisi, au rang regardé (onglets 1 à 5) : par défaut son rang, prévu compris.
  sortFiche(id) {
    const ch = this.world.ch, S = this.sortsState(), d = ch.derived();
    const base0 = this.sortVu(id);
    const unlock = Character.unlockLevel(ch.classId, id);
    const locked = unlock > ch.level;
    const acquis = ch.spellRank(id), actuel = this.sortRang(id);
    const vue = Math.max(1, Math.min(R().max, S.vue || actuel));
    const s = DATA.spellAtRank(base0, vue);
    const needLevel = r => Math.max(unlock, R().levels[r - 1]);
    const tabs = Array.from({ length: R().max }, (_, i) => {
      const r = i + 1, lv = needLevel(r);
      const cls = locked ? 'verrou' : [r <= acquis ? 'acquis' : r <= actuel ? 'prevu' : '', r === actuel ? 'actuel' : '', lv > ch.level ? 'verrou' : ''].filter(Boolean).join(' ');
      const title = lv > ch.level ? `Rang ${r} : niveau ${lv} requis` : r === actuel ? `Rang ${r} : ton rang${r > acquis ? ' (prévu)' : ''}` : `Rang ${r}`;
      return `<button class="vy-rang ${cls}" role="tab" aria-selected="${r === vue}" data-act="vue" data-rang="${r}" title="${title}">${lv > ch.level ? VERROU : ''}<b>${r}</b>${lv > ch.level ? `<small>niv. ${lv}</small>` : ''}</button>`;
    }).join('');
    // Caractéristiques au rang regardé.
    const dmg = s.effects.some(ef => ef.type === 'damage' || ef.type === 'sacrifice' || ((ef.type === 'trap' || ef.type === 'leap') && ef.effects.some(x => x.type === 'damage')));
    const carac = [`<span><b>${s.pa}</b> PA</span>`];
    if (s.target === 'self') carac.push('<span>Sur soi</span>');
    else {
      carac.push(`<span title="Portée"><b>${s.range[0] === s.range[1] ? s.range[0] : `${s.range[0]} à ${s.range[1]}`}</b> PO${s.range[1] >= 2 ? ' <i>modifiable</i>' : ''}</span>`);
      carac.push(`<span>${s.los ? 'Ligne de vue' : 'Sans ligne de vue'}</span>`);
      if (s.line) carac.push('<span>En ligne</span>');
      if (CIBLE[s.target] && s.target !== 'entity' && s.target !== 'any') carac.push(`<span>Cible : ${CIBLE[s.target]}</span>`);
    }
    const zone = { cross: `Croix de ${s.aoe.size}`, circle: `Zone de ${s.aoe.size} case${s.aoe.size > 1 ? 's' : ''}`, line: `Ligne de ${s.aoe.size}`, pierce: 'Traverse la ligne' }[s.aoe.shape];
    if (zone) carac.push(`<span>${zone}${s.affects === 'allies' ? ', alliés' : s.affects === 'enemies' ? ', ennemis' : ''}</span>`);
    carac.push(`<span>${s.cooldown ? `Relance <b>${plural(s.cooldown, 'tour')}</b>` : 'Sans relance'}</span>`);
    if (s.maxPerTurn) carac.push(`<span><b>${s.maxPerTurn}</b> par tour</span>`);
    if (dmg) carac.push(`<span title="Coup critique : dégâts × 1,5">Critique <b>${d.crit} %</b></span>`);
    // Effets au rang regardé, chaque jet de dégâts suivi de son coup critique.
    const fx = [];
    if (DATA.rankScales(s) && vue > 1) fx.push(['Bonus de rang', `${pct(DATA.rankMult(s, vue))} <small>dégâts, soins, boucliers</small>`]);
    for (const ef of s.effects.concat(s.selfEffects || [])) fx.push(...lignes(ef, s, true).map(([l, v, sub]) => [l, esc(v), sub]));
    fx.push(...propres(s).map(([l, v]) => [l, esc(v)]));
    const ul = list => list.map(([l, v, sub]) => `<li${sub ? ' class="sous"' : ''}><span>${esc(l)}</span><b>${v}</b></li>`).join('');
    // Le rang suivant : ce qui change, mis en avant.
    let suivant = '';
    if (vue < R().max) {
      const lv = needLevel(vue + 1), cost = Character.rankCost(vue);
      const ch2 = changements(base0, vue + 1);
      suivant = `<div class="vy-sous vy-sous--suivant"><span>Au rang ${vue + 1}</span><span>${plural(cost, 'point')}${lv > ch.level ? ` · niveau ${lv}` : ''}</span></div>` +
        `<ul class="vy-effets vy-effets--suivant">${ch2.map(([l, a, b]) => `<li><span>${esc(l)}</span><b><s>${esc(a)}</s> → ${esc(b)}</b></li>`).join('')}</ul>`;
    }
    const statut = locked ? `Se débloque au niveau ${unlock}` : vue === actuel ? `Rang ${actuel}${actuel > acquis ? ' prévu' : ''} sur ${R().max}` : `Aperçu du rang ${vue} · ton rang : ${actuel}`;
    return `<article class="vy-sorts__fiche" data-defile="sorts-fiche" aria-label="${esc(s.name)}">
      <nav class="vy-rangs" role="tablist" aria-label="Rangs du sort">${tabs}</nav>
      <header class="vy-fiche-sort"><img class="vy-fiche-sort__icone${locked ? ' bloque' : ''}" src="${SortIcones.url(id, base0, 144)}" width="64" height="64" alt="">
        <div><h3 class="vy-fiche-sort__nom">${esc(s.name)}</h3><p class="vy-fiche-sort__meta">${statut}</p><p class="vy-fiche-sort__meta">Niveau requis : <b>${needLevel(vue)}</b> · ${esc(DATA.elements[s.element].label)}</p></div></header>
      <div class="vy-carac-sort">${carac.join('')}</div>
      <div class="vy-sous"><span>Effets au rang ${vue}</span></div>
      <ul class="vy-effets">${ul(fx)}</ul>
      ${suivant}
      ${s.desc ? `<p class="vy-fiche-sort__recit">${esc(s.desc)}</p>` : ''}
    </article>`;
  },

  // La question avant de valider, de fermer avec des changements prévus, ou de tout réinitialiser.
  sortsModale() {
    const ch = this.world.ch, S = this.sortsState();
    let q, detail;
    if (S.modal === 'reinit') {
      const n = Character.spellPointsFor(ch.spellRanks);
      q = 'Réinitialiser tous tes sorts ?';
      detail = `<p class="muted">Ils repartent du rang 1 et tes ${plural(n, 'point')} de sort te ${n > 1 ? 'sont rendus' : 'est rendu'}, gratuitement.${ch.autoSpells ? ' La répartition automatique sera coupée.' : ''}</p>`;
    } else {
      q = 'Valider les changements ?';
      const items = Object.entries(S.pending).map(([id, n]) => `<li><span>${esc(this.sortVu(id).name)}</span><b>rang ${ch.spellRank(id)} → ${ch.spellRank(id) + n}</b></li>`).join('');
      detail = `<ul class="vy-sorts__resume">${items}</ul><p class="muted">${plural(this.sortsCout(), 'point')} de sort${ch.autoSpells ? ' · la répartition automatique sera coupée' : ''}.</p>`;
    }
    return `<div class="vy-sorts__voile"><div class="vy-sorts__modale" role="alertdialog" aria-modal="true" aria-labelledby="sorts-question">
      <h3>Confirmation</h3><p id="sorts-question" class="vy-sorts__question">${q}</p>${detail}
      <div class="vy-sorts__choix"><button class="vy-bouton vy-bouton--primaire" data-act="oui">Oui</button><button class="vy-bouton" data-act="non">Non</button></div></div></div>`;
  },

  // Une pastille sur le bouton du menu tant qu'un point de sort peut servir.
  marquerSorts() {
    const b = document.querySelector('#menus [data-win="sorts"]');
    const ch = this.world && this.world.ch;
    if (!b || !ch) return;
    const utile = ch.spellPoints > 0 && ch.unlockedSpells().some(id => ch.canRaiseSpell(id).ok);
    b.classList.toggle('a-placer', utile);
    b.title = utile ? `Sorts (S) : ${plural(ch.spellPoints, 'point')} à placer` : 'Sorts (S)';
  },
});

// La pastille suit chaque mise à jour du monde.
const initFenetres = Hud.prototype.initFenetres;
Hud.prototype.initFenetres = function () {
  initFenetres.call(this);
  this.world.on('update', () => this.marquerSorts());
  this.marquerSorts();
};
})();
