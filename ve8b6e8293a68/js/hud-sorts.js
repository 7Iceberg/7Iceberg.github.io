(() => {
const I = Fenetres.ICON;
const esc = s => Util.esc(s);

const TYPES = [['tous', 'Tous'], ['degats', 'Dégâts'], ['soin', 'Soin'], ['bouclier', 'Bouclier'], ['deplacement', 'Déplacement'], ['controle', 'Contrôle'], ['invocation', 'Invocation'], ['piege', 'Piège'], ['autres', 'Autres']];
const VERROU = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/></svg>';
const COCHE = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg>';
const CIBLE = { free: 'case libre', enemy: 'ennemi', ally: 'allié', summon: 'invocation alliée', entity: 'une créature', any: 'toute case' };

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
  if (s.lifesteal || s.volDiffere) t.add('soin');
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

function lignes(ef, s, crit) {
  if (ef.siAssis || ef.siDebout) return lignes(Object.assign({}, ef, { siAssis: false, siDebout: false }), s, crit).map(([l, v, sub]) => [`${l} (${ef.siAssis ? 'ancré' : 'mobile'})`, v, sub]);
  if (ef.onAlly || ef.onFoe) return lignes(Object.assign({}, ef, { onAlly: false, onFoe: false }), s, crit).map(([l, v, sub]) => [`${l} (${ef.onAlly ? 'allié ou bête' : 'ennemi'})`, v, sub]);
  const k = DATA.critJetDe(s), aCrit = crit && DATA.critDe(s) > 0;
  const jetCrit = () => `${Math.round(ef.min * (ef.mult || 1) * k)} à ${Math.round(ef.max * (ef.mult || 1) * k)}`;
  const critique = () => aCrit ? [['Coup critique', `${jetCrit()} ${el(s.element)}`]] : [];
  const sous = list => list.map(([l, v]) => [l, v, true]);
  switch (ef.type) {
    case 'damage': return [['Dégâts', `${jet(ef)} ${el(s.element)}`]].concat(critique());
    case 'heal': return [['Soin', `${jet(ef)} PV`]].concat(aCrit ? [['Coup critique', `${jetCrit()} PV`]] : []);
    case 'sacrifice': return [['Sacrifice', `${jet(ef)} ${el(s.element)}, à ${plural(ef.radius, 'case')} de la bête`]].concat(critique());
    case 'shield': return [['Bouclier', `${Math.round(ef.value)} (${tours(ef.duration)})`], ['', `grandit avec vos PV au-delà de ${DATA.rules.bouclierPvRef || 300}`, true]];
    case 'echo': return [['Écho', `${tours(ef.turns)} : ${Math.round(ef.min * (ef.mult || 1))} à ${Math.round(ef.max * (ef.mult || 1))} ${el(ef.element)} à chaque PM perdu, ${ef.uses} fois au plus`]];
    case 'filon': return [['Filon', `${tours(ef.turns)}, ${ef.charges || 3} déclenchements : ${jet(ef)} à chaque retrait de PA, de PM ou de portée sur l'ennemi marqué ; sur un allié marqué, à chaque soin, en zone de 2 cases autour de lui ; +1 Trouvaille`]];
    case 'dot': return [['Brûlure', `${Math.round(ef.value)} ${el(ef.element)} par tour (${tours(ef.turns)})`]];
    case 'power': return [['Puissance', `${ef.value < 0 ? '−' + -ef.value : '+' + ef.value} % de dégâts (${tours(ef.turns)})`]];
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
      if (ef.name === 'forme_iskar') return [['Forme Nocturne', `${tours(ef.turns)} : ne reçoit plus que 40 % des soins`]];
      if (ef.name === 'intaclable') return [['Intaclable', tours(ef.turns)]];
      if (ef.name === 'protege') return [['Protégé', `${tours(ef.turns)} : les coups reçus tombent sur le Velmar`]];
      if (ef.name === 'digue') return [['Carapace Close', `${tours(ef.turns)} : invulnérable au contact ; frappé à distance, +1 PM`]];
      if (ef.name === 'brise_lames') return [['Bouclier à Rouage', `${tours(ef.turns)} : invulnérable à distance ; frappé au contact, +15 % de dégâts`]];
      if (ef.name === 'invisible') return [['Invisible', `${tours(ef.turns)}${ef.lingering ? ', jusqu\'à la fin du tour où tu frappes' : ''}`]];
      return [['Provoque', tours(ef.turns)]];
    case 'oath': return [['Serment', `${tours(ef.turns)}, +${ef.power} % contre le juré`], ['Brûlure du serment', `${Math.round(ef.burn)} feu`]];
    case 'track': return [['Repéré', `${tours(ef.turns)}, ne peut plus se cacher`]];
    case 'steal': return [['Vole', ef.what === 'shield' ? `le bouclier${ef.orBonus ? ', ou le meilleur bonus' : ''}` : `${ef.value} ${ef.what.toUpperCase()}`]];
    case 'range': return [['Portée', `${ef.value < 0 ? '−' + -ef.value : '+' + ef.value} (${tours(ef.turns)})`]];
    case 'cleanse': return [['Purge', 'tous les malus']];
    case 'devourShield': return [['Dévore', 'le bouclier']];
    case 'selfDamagePct': return [['Coûte', `${ef.pct} % de tes PV`]];
    case 'paNow': return [['Gagne', `${ef.value} PA tout de suite`]];
    case 'rewind': return [['Fin du tour', 'revient sur sa case de départ']];
    case 'pmNow': return [['Gagne', `${plural(ef.value, 'PM').replace('PMs', 'PM')} tout de suite`]];
    case 'empoigner': return [['Porte', 'la cible suit le Thalor jusqu’au dépôt ou au jet']];
    case 'jeter': return [['Jette', 'ce que le Thalor tient, sur la case visée']];
    case 'depuisCentre': return [['Repousse', `de ${plural(ef.cells, 'case')} depuis le point de chute`]];
    case 'versCentre': return [['Attire', `de ${plural(ef.cells, 'case')} vers le point de chute`]];
    case 'rebond': return [['Rebond', `sur l\'ennemi le plus proche à ${plural(ef.cells || 2, 'case')}, ${ef.pct || 50} % des dégâts`]];
    case 'glyph': return [[ef.name || 'Glyphe', `${tours(ef.turns)} sur la zone, au début du tour ${ef.affects === 'allies' ? 'd\'un allié' : 'd\'un ennemi'} qui s'y tient`]].concat(sous([].concat(...(ef.effects || []).map(x => lignes(x, s, crit)))));
    case 'soinDiffere': return [['Soin différé', `${jet(ef)} PV, au début du prochain tour de la cible`]];
    case 'demontage': return [['Démontage', 'sur une de ses reliques : elle joue son coup une dernière fois là où elle est, puis disparaît ; +1 Trouvaille']];
    case 'basculeCiel': return [['Veille', 'passe de l\'Aube (soins +10 %, l\'allié soigné devient Rayonnant : +15 % de soins reçus) au Crépuscule (attaques : +15 points de vol de vie), ou l\'inverse']];
    case 'ecourter': return [['Heure Juste', `sur un allié, ses malus durent ${plural(ef.tours || 1, 'tour')} de moins ; sur un ennemi, ses bonus et ses boucliers`]];
    case 'ordreMeute': return [['Ordre', `toutes ses bêtes frappent tout de suite, à ${ef.pct || 50} % de leurs dégâts`]];
    case 'horde': return [['Horde', `+${ef.jauge || 3} de jauge pendant ${plural(ef.turns || 2, 'tour')}, ses appels coûtent ${ef.rabais || 1} PA de moins ; au bout, ses bêtes s'en vont`]];
    case 'pacte': return [['Pacte', `sacrifie ses bêtes : +${ef.par || 3} % de dégâts par point de jauge (${tours(ef.turns || 3)}), ${ef.soin || 30} % de leurs PV`]];
    case 'declencherMares': return [['Glyphes', 'tous ses Glyphes agissent tout de suite sur les ennemis qui s\'y tiennent']];
    case 'hantise': return [['Hantise', 'pousse la créature au contact jusqu\'à la case visée, à travers les pièges']];
    case 'versLeurre': return [['Attire', `de ${plural(ef.cells, 'case')} vers le Leurre`]];
    case 'depuisLeurre': return [['Repousse', `de ${plural(ef.cells, 'case')} depuis le Leurre`]];
    case 'echangeLeurre': return [['Échange', 'la cible avec le Leurre']];
    default: return [];
  }
}

function propres(s) {
  const out = [];
  if (s.porteeAssis || s.assisBonus) out.push(['Ancré', `${s.porteeAssis ? `portée × ${String(s.porteeAssis).replace('.', ',')}` : ''}${s.porteeAssis && s.assisBonus ? ', ' : ''}${s.assisBonus ? `+${s.assisBonus} % de dégâts` : ''}`]);
  if (s.exigeDebout) out.push(['Condition', 'mobile']);
  if (s.exigeTenu) out.push(['Condition', 'tenir une cible (Prise de Trompe)']);
  if (s.exigeLeurre) out.push(['Condition', 'avoir son Leurre en jeu']);
  if (s.recharge) out.push(['Se charge', `+${s.recharge} % à chaque retour de relance, une fois lancé`]);
  if (s.cumul) out.push(['Se cumule', `+${s.cumul.par} % par lancer (${s.cumul.max} au plus), perdu sans le relancer dans les ${plural(s.cumul.tours || 2, 'tour')}`]);
  if (s.faveur) out.push(['Faveur', 'une seule par allié (la nouvelle remplace l\'ancienne) ; sur une case vide, elle reste au sol en Étincelle pour le premier allié qui y commence son tour']);
  if (s.ombre) out.push(['Ombre', 'une seule par ennemi : la nouvelle remplace l\'ancienne']);
  if (s.mare) out.push(['Dans le Glyphe', 'le Velmar et ses alliés subissent 15 % de dégâts en moins']);
  if (s.parPmRestant) out.push(['PM restants', `+${s.parPmRestant} % par PM qui te reste`]);
  if (s.traque) out.push(['Traque', 'chaque autre tir sur la cible ajoute un cran : +8 % chacun, 3 au plus ; marquer une autre cible repart de zéro']);
  if (s.parPiege) out.push(['Pli', `+${s.parPiege} % par piège déclenché (5 au plus), le Pli dépensé`]);
  if (s.bascule) out.push(['Ancré', `relancé en posture Ancré, il rend sa mobilité au Thalor${s.basculeRend ? ` et rend ${s.basculeRend} PA` : ''}`]);
  if (s.lifesteal) out.push(['Vol de vie', `${s.lifesteal} % des dégâts`]);
  if (s.volDiffere) out.push(['Vol de vie différé', `${s.volDiffere} % des dégâts, rendus au début de ton prochain tour`]);
  if (s.lowHpBonus) out.push(['Sous ' + s.lowHpBonus.below + ' % de tes PV', `dégâts × ${String(s.lowHpBonus.mult).replace('.', ',')}`]);
  if (s.executeBelow) out.push(['Cible sous ' + s.executeBelow + ' % de PV', 'dégâts doublés']);
  if (s.bonusIfInvisible) out.push(['Invisible', `dégâts × ${String(s.bonusIfInvisible).replace('.', ',')}`]);
  if (s.fury) out.push(['Fureur', `+${s.fury} si la cible est touchée`]);
  if (s.furySpend) out.push(['Fureur dépensée', `+${s.furySpend} % par point`]);
  if (s.braiseCost) out.push(['Soif', `coûte ${s.braiseCost}`]);
  if (s.braise) out.push(['Soif', `+${s.braise} si la cible est touchée`]);
  if (s.braiseSpend) out.push(['Soif lâchée', `+${s.braiseSpend} % par point`]);
  const cr = Object.values(DATA.classes).find(c => c.reserve && c.spells.includes(s.id));
  if (cr && s.reserve) out.push([cr.reserve.nom, `+${s.reserve} si la cible est touchée`]);
  if (cr && s.reserveSpend) out.push([`${cr.reserve.nom} dépensée`, `+${s.reserveSpend} % par point (dégâts et boucliers)`]);
  if (s.oathPierce) out.push(['Contre le juré', 'ni esquive ni armure']);
  if (s.affutBonus) out.push(['À l\'affût', `+${s.affutBonus} % de dégâts`]);
  if (s.keepsAffut) out.push(['Affût', 'gardé, moins un cran (−4 %)']);
  if (s.telefrag) out.push(['Sur une créature', `téléfrag : les places s'échangent, +${s.telefrag} PA une fois par tour`]);
  if (s.markSight) out.push(['Cible traquée', 'visée à travers les obstacles']);
  if (s.trapReplaceOldest) out.push(['Au-delà de 3 pièges', 'le plus ancien disparaît']);
  if (s.purse) out.push(['Bourse', `+${s.purse} % de Dragmes et de butin si la cible tombe`]);
  if (s.onKill) out.push(['Si la cible tombe', s.onKill.flatMap(x => lignes(x, s)).map(([l, v]) => `${l.toLowerCase()} ${v}`).join(', ')]);
  return out;
}

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
  sortsState() {
    if (!this.sorts) {
      let niveaux = true;
      try { niveaux = localStorage.getItem('veylan.sorts.niveaux') !== '0'; } catch (e) {   }
      this.sorts = { sel: null, filtre: 'tous', cherche: '', niveaux, vue: null };
    }
    return this.sorts;
  },

  sortVu(id) { return this.world.ch.spellFor(id) || DATA.spells[id]; },

  openSorts() {
    const S = this.sortsState();
    const ch = () => this.world.ch;
    const redraw = () => this.fen.render('sorts');
    const actions = {
      choisir: d => { S.sel = d.id; S.vue = null; redraw(); },
      vue: d => { S.vue = Number(d.rang); redraw(); },
      equiper: d => {
        if (this.world.state === 'combat') { this.toast('Pas pendant un combat.'); return; }
        const p = DATA.paireDe(ch().classId, d.id);
        if (!p) return;
        const r = ch().choisirVariante(p.i, p.variante);
        S.sel = d.id; S.vue = null;
        if (!r.ok) { this.toast(r.reason); redraw(); return; }
        window.dispatchEvent(new CustomEvent('veylan:spellVariant', { detail: { paire: p.i, id: d.id } }));
        this.toast(`${this.sortVu(d.id).name} prend sa place dans ta barre de sorts.`);
        this.world.emit('save');
        this.world.emit('update');
        redraw();
      },
    };
    const onField = (target, kind) => {
      if (target.id === 'sorts-filtre') { S.filtre = target.value; redraw(); }
      if (target.id === 'sorts-recherche') { S.cherche = target.value; redraw(); }
      if (target.id === 'sorts-niveaux' && kind === 'change') {
        S.niveaux = target.checked;
        try { localStorage.setItem('veylan.sorts.niveaux', S.niveaux ? '1' : '0'); } catch (e) {   }
        redraw();
      }
    };
    this.simpleWin('sorts', 'Sorts', () => this.renderSorts(), actions, { width: 960, cls: 'vy-fenetre--sorts', onField, beforeClose: () => { S.vue = null; return true; } });
  },

  renderSorts() {
    const ch = this.world.ch, S = this.sortsState();
    const ids = [];
    for (const [base, vari] of ch.classDef.paires) { ids.push(base); if (vari) ids.push(vari); }
    if (!ids.includes(S.sel)) S.sel = ids[0];
    const enCombat = this.world.state === 'combat';
    const plie = t => t.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
    const cherche = plie(S.cherche.trim());
    const shown = ids.filter(id => (S.filtre === 'tous' || typesOf(DATA.spells[id]).has(S.filtre)) && (!cherche || plie(this.sortVu(id).name).includes(cherche)));
    if (shown.length && !shown.includes(S.sel)) { S.sel = shown[0]; S.vue = null; }
    const equipes = new Set(ch.unlockedSpells());
    const rangees = [];
    for (const paire of ch.classDef.paires) {
      const l = paire.filter(id => id && shown.includes(id));
      if (l.length) rangees.push(`<li class="vy-sorts__paire${l.length > 1 ? ' double' : ''}" role="presentation">${l.map(id => this.sortLigne(id, equipes, enCombat)).join(l.length > 1 ? '<span class="vy-sorts__ou" aria-hidden="true">ou</span>' : '')}</li>`);
    }
    const rows = rangees.join('') || `<li class="vy-sorts__vide muted">${cherche ? 'Aucun sort à ce nom.' : 'Aucun sort de ce type.'}</li>`;
    const options = TYPES.map(([k, l]) => `<option value="${k}" ${S.filtre === k ? 'selected' : ''}>${l}</option>`).join('');
    const obtenus = ch.sortsObtenus().length;
    const prochains = ids.map(id => Character.unlockLevel(ch.classId, id)).filter(l => l > ch.level);
    const prochain = prochains.length ? Math.min(...prochains) : null;
    const pied = `<span class="vy-sorts__info">Les rangs montent seuls avec ton niveau. Une paire : le sort de base ou sa variante, un seul dans ta barre.</span>` +
      `<span class="vy-sorts__capital">${prochain ? `Prochain sort : <b>niveau ${prochain}</b>` : 'Tous tes sorts sont obtenus'}</span>`;
    const loupe = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><circle cx="11" cy="11" r="6.5"/><path d="M16 16l4 4"/></svg>';
    return `<div class="vy-sorts">
      <section class="vy-sorts__gauche" aria-label="Sorts de la classe">
        <div class="vy-sorts__outils">
          <span class="vy-sorts__classe"><b>Sorts de classe</b><small>${esc(ch.classDef.name)} · <span class="vy-sorts__compte">${obtenus} / ${ids.length}</span></small></span>
          <label class="vy-recherche vy-sorts__recherche">${loupe}<input id="sorts-recherche" type="search" placeholder="Rechercher…" value="${esc(S.cherche)}" aria-label="Rechercher un sort"></label>
          <select id="sorts-filtre" aria-label="Type de sort">${options}</select>
        </div>
        <ul class="vy-sorts__liste${S.niveaux ? ' niveaux' : ''}" data-defile="sorts-liste" role="listbox" aria-label="Sorts">${rows}</ul>
        <label class="vy-coche vy-sorts__niveaux"><input type="checkbox" id="sorts-niveaux" ${S.niveaux ? 'checked' : ''}> Afficher tous les niveaux d'obtention et de rang</label>
      </section>
      ${this.sortFiche(S.sel, equipes)}
    </div>
    <footer class="vy-fen-pied vy-sorts__pied">${pied}</footer>`;
  },

  sortLigne(id, equipes, enCombat) {
    const ch = this.world.ch, S = this.sortsState();
    const s = this.sortVu(id);
    const p = DATA.paireDe(ch.classId, id);
    const unlock = Character.unlockLevel(ch.classId, id);
    const locked = unlock > ch.level;
    const niveaux = Character.niveauxDesRangs(ch.classId, id);
    const rank = locked ? 0 : ch.spellRank(id);
    const pips = niveaux.map((lv, i) => `<i class="${i < rank ? 'on' : lv > ch.level ? 'verrou' : ''}"></i>`).join('');
    const obt = niveaux.map(n => `<i class="${n <= ch.level ? 'ok' : ''}">${n}</i>`).join('');
    const teinte = (DATA.elements[s.element] || DATA.elements.neutre).color;
    const autre = p ? ch.classDef.paires[p.i][p.variante ? 0 : 1] : null;
    const cls = ['vy-sort', S.sel === id ? 'on' : '', locked ? 'bloque' : '', p && p.variante ? 'variante' : '', equipes.has(id) ? 'equipe' : ''].filter(Boolean).join(' ');
    const name = `<button class="vy-sort__choix" data-act="choisir" data-id="${id}" aria-label="${esc(s.name)}${p && p.variante ? ', variante' : ''}${locked ? `, s'obtient au niveau ${unlock}` : `, rang ${rank}`}${equipes.has(id) ? ', équipé' : ''}">` +
      `<img class="vy-sort__icone" src="${SortIcones.url(id, s, 88)}" width="44" height="44" alt="">` +
      `<span class="vy-sort__nom"><span>${esc(s.name)}</span><small>${s.pa} PA · ${el(s.element)}</small></span></button>`;
    const obtention = `<span class="vy-sort__obt" aria-hidden="true">${obt}</span>`;
    let etat;
    if (locked) etat = `<span class="vy-sort__niveau">${VERROU}niveau ${unlock}</span>`;
    else etat = `<span class="vy-sort__rang" title="Rang ${rank} sur ${niveaux.length}"><span class="vy-sort__valeur"><b>${rank}</b><span class="vy-pips" aria-hidden="true">${pips}</span></span></span>`;
    let equip = '<span class="vy-sort__equipe" aria-hidden="true">·</span>';
    if (equipes.has(id)) equip = `<span class="vy-sort__equipe on" title="Dans ta barre de sorts">${COCHE}</span>`;
    else if (!locked && autre) equip = `<button class="vy-sort__equiper" data-act="equiper" data-id="${id}" ${enCombat ? 'disabled' : ''} title="Équiper à la place de ${esc(this.sortVu(autre).name)}" aria-label="Équiper ${esc(s.name)} à la place de ${esc(this.sortVu(autre).name)}">⇄</button>`;
    return `<div class="${cls}" role="option" aria-selected="${S.sel === id}" style="--el:${teinte}">${obtention}${name}${etat}${equip}</div>`;
  },

  sortFiche(id, equipes) {
    const ch = this.world.ch, S = this.sortsState(), d = ch.derived();
    const base0 = this.sortVu(id);
    const p = DATA.paireDe(ch.classId, id);
    const unlock = Character.unlockLevel(ch.classId, id);
    const locked = unlock > ch.level;
    const niveaux = Character.niveauxDesRangs(ch.classId, id);
    const max = Math.max(1, niveaux.length);
    const actuel = locked ? 1 : ch.spellRank(id);
    const vue = Math.max(1, Math.min(max, S.vue || actuel));
    const s = DATA.spellAtRank(base0, vue);
    const tabs = niveaux.map((lv, i) => {
      const r = i + 1;
      const cls = [lv <= ch.level ? 'acquis' : 'verrou', r === actuel && !locked ? 'actuel' : ''].filter(Boolean).join(' ');
      const title = lv > ch.level ? `Rang ${r} : au niveau ${lv}` : r === actuel ? `Rang ${r} : ton rang` : `Rang ${r}`;
      return `<button class="vy-rang ${cls}" role="tab" aria-selected="${r === vue}" data-act="vue" data-rang="${r}" title="${title}">${lv > ch.level ? VERROU : '<i class="vy-rang__etoile" aria-hidden="true"></i>'}<b>${r}</b><small>niv. ${lv}</small></button>`;
    }).join('');
    const dmg = s.effects.some(ef => ef.type === 'damage' || ef.type === 'sacrifice' || ((ef.type === 'trap' || ef.type === 'leap') && ef.effects.some(x => x.type === 'damage')));
    const carac = [['Coût', `<b>${s.pa}</b> PA`]];
    if (s.target === 'self') carac.push(['Portée', 'sur soi']);
    else {
      carac.push(['Portée', `<b>${s.range[0] === s.range[1] ? s.range[0] : `${s.range[0]} à ${s.range[1]}`}</b> PO${s.range[1] >= 2 ? (s.porteeFixe ? ' <i>fixe</i>' : ' <i>modifiable</i>') : ''}`]);
      carac.push(['Ligne de vue', s.los ? 'oui' : 'non, sans ligne de vue']);
      if (s.line) carac.push(['Lancer', 'en ligne']);
      if (CIBLE[s.target] && s.target !== 'entity' && s.target !== 'any') carac.push(['Cible', CIBLE[s.target]]);
    }
    const zone = { cross: `croix de ${s.aoe.size}`, circle: `${s.aoe.size} case${s.aoe.size > 1 ? 's' : ''} autour`, line: `ligne de ${s.aoe.size}`, pierce: 'traverse la ligne' }[s.aoe.shape];
    if (zone) carac.push(['Zone', `${zone}${s.affects === 'allies' ? ', alliés' : s.affects === 'enemies' ? ', ennemis' : ''}`]);
    carac.push(['Relance', s.cooldown ? `<b>${plural(s.cooldown, 'tour')}</b>` : 'sans relance']);
    if (s.maxPerTurn) carac.push(['Utilisations', `<b>${s.maxPerTurn}</b> par tour`]);
    if (dmg || s.effects.some(ef => ef.type === 'heal')) carac.push(['Critique', DATA.critDe(s) > 0 ? `<b>${DATA.chanceCrit(d, s)} %</b> <small>(${DATA.critDe(s)} % du sort${d.crit ? ` ${d.crit > 0 ? '+' : '−'} ${Math.abs(d.crit)} % de Critique` : ''})</small>` : 'jamais']);
    const fx = [], crits = [];
    if (DATA.rankScales(s) && vue > 1) fx.push(['Bonus de rang', `${pct(DATA.rankMult(s, vue))} <small>dégâts, soins, boucliers</small>`]);
    for (const ef of s.effects.concat(s.selfEffects || [])) for (const [l, v, sub] of lignes(ef, s, true)) (l === 'Coup critique' ? crits : fx).push([l, esc(v), sub]);
    fx.push(...propres(s).map(([l, v]) => [l, esc(v)]));
    const ul = list => list.map(([l, v, sub]) => `<li${sub ? ' class="sous"' : ''}><span>${esc(l)}</span><b>${v}</b></li>`).join('');
    let suivant = '';
    if (vue < max) {
      const ch2 = changements(base0, vue + 1);
      suivant = `<div class="vy-sous vy-sous--suivant"><span>Au rang ${vue + 1}</span><span>niveau ${niveaux[vue]}</span></div>` +
        `<ul class="vy-effets vy-effets--suivant">${ch2.map(([l, a, b]) => `<li><span>${esc(l)}</span><b><s>${esc(a)}</s> → ${esc(b)}</b></li>`).join('')}</ul>`;
    }
    let paire = '';
    if (p) {
      const autre = ch.classDef.paires[p.i][p.variante ? 0 : 1];
      if (autre) paire = `<p class="vy-fiche-sort__meta">${p.variante ? 'Variante de' : 'Sa variante :'} <b>${esc(this.sortVu(autre).name)}</b>${p.variante ? '' : ` (niveau ${Character.unlockLevel(ch.classId, autre)})`} · ${equipes.has(id) ? 'dans ta barre' : equipes.has(autre) ? 'l\'autre est dans ta barre' : 'pas encore obtenus'}</p>`;
    }
    const statut = locked ? `S'obtient au niveau ${unlock}` : vue === actuel ? `Rang ${actuel} sur ${max}` : `Aperçu du rang ${vue} · ton rang : ${actuel}`;
    return `<article class="vy-sorts__fiche" data-defile="sorts-fiche" aria-label="${esc(s.name)}">
      <header class="vy-fiche-sort"><img class="vy-fiche-sort__icone${locked ? ' bloque' : ''}" src="${SortIcones.url(id, Object.assign({}, base0, { rank: locked ? 0 : vue }), 144)}" width="64" height="64" alt="">
        <div><h3 class="vy-fiche-sort__nom">${esc(s.name)}</h3><p class="vy-fiche-sort__meta">${statut}</p><p class="vy-fiche-sort__meta">Niveau requis : <b>${niveaux[vue - 1] || unlock}</b> · ${esc(DATA.elements[s.element].label)}</p>${paire}</div></header>
      <nav class="vy-rangs" role="tablist" aria-label="Rangs du sort">${tabs}</nav>
      <dl class="vy-carac-sort">${carac.map(([k, v]) => `<dt>${k}</dt><dd>${v}</dd>`).join('')}</dl>
      ${s.desc ? `<p class="vy-fiche-sort__recit">${esc(s.desc)}</p>` : ''}
      <div class="vy-sous"><span>Effets au rang ${vue}</span></div>
      <ul class="vy-effets">${ul(fx)}</ul>
      ${crits.length ? `<div class="vy-sous vy-sous--crit"><span>Effets critiques</span></div><ul class="vy-effets vy-effets--crit">${ul(crits)}</ul>` : ''}
      ${suivant}
    </article>`;
  },

  marquerSorts() {
    const b = document.querySelector('#menus [data-win="sorts"]');
    if (b) { b.classList.remove('a-placer'); b.title = 'Sorts (T)'; }
  },
});

const initFenetres = Hud.prototype.initFenetres;
Hud.prototype.initFenetres = function () {
  initFenetres.call(this);
  this.world.on('update', () => this.marquerSorts());
  this.marquerSorts();
};
})();

