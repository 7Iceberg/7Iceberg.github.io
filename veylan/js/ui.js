// Interface DOM : choix de classe et de rencontre, barre de sorts, ordre des tours, compteurs,
// journal, infobulles, surbrillances.
class UI {
  constructor(combat, renderer) {
    this.combat = combat;
    this.renderer = renderer;
    const $ = sel => document.querySelector(sel);
    this.el = {
      timeline: $('#timeline'), round: $('#round'), stats: $('#stats'), spells: $('#spells'),
      log: $('#log'), banner: $('#banner'), tooltip: $('#tooltip'), inspect: $('#inspect'),
      ready: $('#ready'), endTurn: $('#end-turn'), restart: $('#restart'), encounter: $('#encounter'),
      cls: $('#class'), timer: $('#timer'), stage: $('#stage'), challenge: $('#challenge'),
    };
    this.selectedSpell = null;
    this.hoverCell = null;
    this.inspected = null;
    this.bannerTimer = null;
    this.spellButtons = {};
    // Compte à rebours du placement (armerPlacement, posé par le monde ; le laboratoire n'en a pas).
    this.placementEndsAt = 0;
    this.turnStartedAt = Date.now();
    // Le jeu (js/hud-jeu.js) allume les rubans et la barre de tour ; le laboratoire garde la
    // bannière d'avant, ses feuilles de style n'ont pas les nouveaux éléments.
    this.jeu = false;
    this.el.endTurn.dataset.ui = 'fin-tour';
    this.el.ready.dataset.ui = 'pret';

    combat.on('log', d => this.addLog(d));
    combat.on('setup', () => {
      this.selectedSpell = null;
      this.inspected = combat.player;
      this.el.log.innerHTML = '';
      this.lastHp = combat.player ? combat.player.hp : 0;
      this.lastActor = null;
      this.placementEndsAt = 0;
      this.armed = null;
      this.hideCastConfirm();
      this.hideMoveCost();
      this.buildSpellBar();
      this.renderChallenge(null);
      this.refresh();
      if (this.jeu) this.ruban('Prépare-toi !', { sorte: 'placement', ms: 1900, sous: UI.tactile() ? 'Touche une case bleue pour te placer' : 'Clique sur une case bleue pour te placer' });
    });
    combat.on('challenge', ch => this.renderChallenge(ch));
    if (this.el.challenge) this.el.challenge.addEventListener('click', () => { const ch = combat.challenge; if (ch) this.banner(`${ch.name} : ${ch.desc}${ch.failed ? ' (raté : ' + ch.failed + ')' : ''}`, 2600); });
    combat.on('start', () => { this.placementEndsAt = 0; this.refresh(); Bus.emit('battleStart', {}); });
    combat.on('turn', e => {
      this.selectedSpell = null;
      this.armed = null;
      this.hideCastConfirm();
      this.hideMoveCost();
      this.turnStartedAt = Date.now();
      if (this.lastActor === combat.player && e !== combat.player) Bus.emit('turnEnd', {});
      this.lastActor = e;
      this.refresh();
      this.updateHighlights();   // la portée du sort ne reste pas affichée pendant le tour des autres
      if (e === combat.player) {
        if (this.jeu) { this.hideBanner(); this.ruban('À toi de jouer !', { sorte: 'tour', ms: 1100 }); } else this.banner('À toi de jouer', 900);
        Bus.emit('turnStart', {});
      }
    });
    combat.on('update', () => this.refresh());
    combat.on('end', d => {
      this.selectedSpell = null;
      this.armed = null;
      this.hideCastConfirm();
      this.hideMoveCost();
      if (this.lastActor === combat.player) Bus.emit('turnEnd', {});
      this.lastActor = null;
      this.updateHighlights();
      this.refresh();
      this.banner(d.victory ? 'VICTOIRE' : 'DÉFAITE', 2200);
    });

    // Les listes de classe et de rencontre n'existent que dans le laboratoire de combat.
    if (this.el.cls && this.el.encounter) {
      for (const id in DATA.classes) {
        const c = DATA.classes[id];
        const o = document.createElement('option');
        o.value = id;
        o.textContent = `${c.name} · ${c.role.toLowerCase()}`;
        this.el.cls.appendChild(o);
      }
      for (const rid in DATA.regions) {
        const g = document.createElement('optgroup');
        g.label = DATA.regions[rid];
        for (const enc of DATA.encounters.filter(e => e.region === rid)) {
          const o = document.createElement('option');
          o.value = enc.id;
          o.textContent = enc.name;
          g.appendChild(o);
        }
        this.el.encounter.appendChild(g);
      }
      this.el.cls.addEventListener('change', () => this.restart());
      this.el.encounter.addEventListener('change', () => this.restart());
    }
    if (this.el.restart) this.el.restart.addEventListener('click', () => this.restart());
    this.el.ready.addEventListener('click', () => this.ready());
    this.el.endTurn.addEventListener('click', () => this.endTurn());
    setInterval(() => this.updateTimer(), 200);
  }

  // Lancer le combat (bouton « Prêt », compte à rebours du placement, touche Entrée).
  ready() {
    if (this.combat.phase !== 'placement') return;
    this.hideBanner();
    this.placementEndsAt = 0;
    this.combat.start();
  }

  // Le placement a son compte à rebours dans le monde : à zéro, le combat commence seul.
  armerPlacement(seconds) {
    this.placementEndsAt = seconds > 0 && this.combat.phase === 'placement' ? Date.now() + seconds * 1000 : 0;
    this.updateTimer();
  }

  // ----- Positions à l'écran des points du monde -----

  // Coordonnées client d'une case (fractions permises) : son point du monde (cellToScreen), puis le
  // même chemin que boardClient. Tout ce qui s'ancre au monde passe par ici : fiche d'un groupe,
  // confirmation d'un sort, bulles des PNJ, repères.
  static cellClient(renderer, x, y) {
    const p = renderer.cellToScreen(x, y);
    return UI.boardClient(renderer, p.x, p.y);
  }

  // Un point du monde (le plateau en pixels : une forme du rendu, la flèche de sortie) à l'écran :
  // par la caméra du rendu (renderer.worldToClient, zoom et déplacement compris), sinon d'après la
  // taille affichée du canvas.
  static boardClient(renderer, px, py) {
    if (renderer && typeof renderer.worldToClient === 'function') {
      const q = renderer.worldToClient(px, py);
      if (q && Number.isFinite(q.x) && Number.isFinite(q.y)) return q;
    }
    const r = renderer.canvas.getBoundingClientRect();
    return { x: r.left + px * r.width / renderer.W, y: r.top + py * r.height / renderer.H };
  }

  // Pixels à l'écran par pixel du plateau, mesurés entre deux cases voisines (zoom compris).
  static cellScale(renderer, x, y) {
    const a = UI.cellClient(renderer, x, y), b = UI.cellClient(renderer, x + 1, y);
    return Math.hypot(b.x - a.x, b.y - a.y) / Math.hypot(Grid.TILE_W / 2, Grid.TILE_H / 2) || 1;
  }

  // Un élément ancré au monde se replace à chaque image tant qu'il est là, et quand la caméra
  // bouge (événement 'veylan:camera') ou que la fenêtre change de taille. Rend la fonction qui le détache.
  static ancrer(fn) {
    const A = UI._ancres || (UI._ancres = new Set());
    A.add(fn);
    if (!UI._ancresOn) {
      UI._ancresOn = true;
      const all = () => { for (const f of [...A]) f(); };
      window.addEventListener('veylan:camera', all);
      window.addEventListener('resize', all);
    }
    const loop = () => { UI._raf = null; if (!A.size) return; for (const f of [...A]) f(); UI._raf = requestAnimationFrame(loop); };
    if (!UI._raf) UI._raf = requestAnimationFrame(loop);
    return () => A.delete(fn);
  }

  // Option « Confirmer les sorts » : au doigt par défaut, pas à la souris (Options).
  static confirmerSorts(touch) {
    let v = null;
    try { v = localStorage.getItem('veylan.confirmerSorts'); } catch (e) { /* stockage indisponible */ }
    if (v === '1') return true;
    if (v === '0') return false;
    return touch != null ? !!touch : UI.tactile();
  }

  // Un écran qu'on touche du doigt (téléphone, tablette) plutôt qu'à la souris.
  static tactile() { return typeof matchMedia === 'function' && matchMedia('(pointer: coarse)').matches; }

  // L'ordre des sorts dans la barre : l'arme équipée d'abord (première case), puis ceux de la
  // classe. Les touches 1 à 9 suivent le même ordre.
  static ordreSorts(e) {
    const list = (e && e.spells) || [];
    return list.includes('arme') ? ['arme'].concat(list.filter(id => id !== 'arme')) : list.slice();
  }

  // ----- Rubans : « Prépare-toi ! », « À toi de jouer ! », « Niveau supérieur ! » -----

  // Un ruban de nuit à liseré d'or, qui entre, reste un instant et repart sans bloquer le jeu.
  // opts : { sorte: 'tour' | 'placement' | 'niveau', ms, sous (une ligne sous le ruban) }.
  ruban(texte, opts) {
    opts = opts || {};
    const stage = this.el.stage;
    if (!stage) return;
    let r = this.el.ruban;
    if (!r) { r = this.el.ruban = document.createElement('div'); r.setAttribute('role', 'status'); stage.appendChild(r); }
    clearTimeout(this.rubanT); clearTimeout(this.rubanT2);
    r.className = `vy-ruban vy-ruban--${opts.sorte || 'tour'}`;
    r.innerHTML = (opts.sorte === 'niveau' ? '<span class="vy-ruban__rayons" aria-hidden="true"></span><span class="vy-ruban__eclats" aria-hidden="true"><i></i><i></i><i></i><i></i><i></i><i></i></span>' : '') +
      `<span class="vy-ruban__bande"><span class="vy-ruban__texte">${Util.esc(texte)}</span></span>${opts.sous ? `<span class="vy-ruban__sous">${Util.esc(opts.sous)}</span>` : ''}`;
    void r.offsetWidth;
    r.classList.add('entre');
    const ms = opts.ms || 1400;
    this.rubanT = setTimeout(() => r.classList.add('sort'), ms);
    this.rubanT2 = setTimeout(() => { r.className = 'vy-ruban hidden'; }, ms + 500);
  }

  restart() {
    if (!this.el.encounter) return;
    this.hideBanner();
    const enc = DATA.encounters.find(e => e.id === this.el.encounter.value) || DATA.encounters[0];
    this.combat.setup(enc, this.el.cls.value);
    this.updateHighlights();
  }

  endTurn() {
    if (this.combat.busy) return;
    this.selectedSpell = null;
    this.armed = null;
    this.hideCastConfirm();
    this.hideMoveCost();
    this.combat.endPlayerTurn();
    this.updateHighlights();
  }

  isPlayerTurn() {
    const c = this.combat;
    return c.phase === 'battle' && c.actor === c.player;
  }

  // ----- Barre de sorts -----

  buildSpellBar() {
    this.el.spells.innerHTML = '';
    this.spellButtons = {};
    UI.ordreSorts(this.combat.player).forEach((id, i) => {
      const s = this.combat.spellOf(id, this.combat.player);
      const b = document.createElement('button');
      b.className = 'spell';
      b.dataset.spell = id;
      b.style.setProperty('--el', DATA.elements[s.element].color);
      // L'icône peinte du sort (js/sort-icones.js) prend la place du losange de l'élément.
      const icone = typeof SortIcones === 'object' ? SortIcones.url(id, s, 48) : '';
      if (icone) b.classList.add('avec-icone');
      b.innerHTML = `<span class="key">${(i + 1) % 10}</span><span class="icon" style="--el:${DATA.elements[s.element].color}">${icone ? `<img src="${icone}" alt="">` : s.name.charAt(0)}</span><span class="name">${s.name}</span><span class="cost">${s.pa} PA</span><span class="cd"></span>`;
      b.addEventListener('click', () => { if (this.suppressClick && Date.now() < this.suppressClick) { this.suppressClick = 0; return; } this.selectSpell(id); });
      b.addEventListener('mouseenter', () => this.showTooltip(b, id));
      b.addEventListener('mouseleave', () => this.hideTooltip());
      let press = null;
      // Appui long : l'infobulle, sans lancer le sort au lever du doigt.
      b.addEventListener('touchstart', () => { press = setTimeout(() => { this.showTooltip(b, id); this.tooltipUntil = Date.now() + 3000; this.suppressClick = Date.now() + 800; }, 450); }, { passive: true });
      for (const evt of ['touchend', 'touchmove', 'touchcancel']) b.addEventListener(evt, () => { clearTimeout(press); }, { passive: true });
      this.el.spells.appendChild(b);
      this.spellButtons[id] = b;
    });
  }

  async selectSpell(id) {
    const c = this.combat;
    if (!id || this.selectedSpell === id) { this.selectedSpell = null; this.updateHighlights(); this.refresh(); return; }
    if (!this.isPlayerTurn() || c.busy) return;
    const st = c.spellState(c.actor, id);
    if (!st.ok) { this.banner(st.reason, 900); return; }
    const s = c.spellOf(id, c.actor);
    this.hideCastConfirm();
    this.hideMoveCost();
    this.armed = null;
    if (s.target === 'self') {
      // Les sorts sur soi partent tout de suite, pas besoin de viser.
      Bus.emit('spellSelect', { spell: id });
      this.selectedSpell = null;
      const r = await c.cast(c.actor, id, c.actor.pos);
      if (!r.ok) this.banner(r.reason, 900);
      else Bus.emit('spellCast', { spell: id, ennemi: false });
      this.refresh();
      this.updateHighlights();
      return;
    }
    this.selectedSpell = id;
    Bus.emit('spellSelect', { spell: id });
    this.refresh();
    this.updateHighlights();
  }

  // Les jets et valeurs au rang du sort (DATA.rankShown : `mult` appliqué, arrondis).
  effectLine(ef) {
    const v = DATA.rankShown(ef);
    switch (ef.type) {
      case 'damage': return `Dégâts ${v.min} à ${v.max}`;
      case 'heal': return `Soigne ${v.min} à ${v.max}`;
      case 'pa': case 'pm':
        if (ef.type === 'pm' && ef.value <= -10) return `Enracine ${ef.duration} tour(s)`;
        return `${ef.value > 0 ? '+' : ''}${ef.value} ${ef.type.toUpperCase()} pendant ${ef.duration} tour(s)`;
      case 'shield': return `Bouclier ${v.value} pendant ${ef.duration} tour(s)`;
      case 'power': return `+${ef.value} % de dégâts ${ef.turns === 0 ? 'ce tour' : 'pendant ' + ef.turns + ' tour(s)'}`;
      case 'vuln': return `+${ef.value} % de dégâts subis pendant ${ef.turns} tour(s)`;
      case 'dot': return `Brûle ${v.value} par tour pendant ${ef.turns} tour(s)`;
      case 'echo': return `Écho ${ef.turns} tour(s) : ${v.min} à ${v.max} à chaque PM perdu, ${ef.uses} fois au plus`;
      case 'state': return ef.name === 'invisible' ? `Invisible ${ef.turns} tour(s)${ef.lingering ? ', révélée à la fin du tour où elle frappe' : ''}` : `Provoque ${ef.turns} tour(s)`;
      case 'oath': return `Juré ${ef.turns} tour(s) : +${ef.power} % de dégâts contre lui`;
      case 'track': return `Traqué ${ef.turns} tour(s) : ne peut plus être invisible`;
      case 'steal': return ef.what === 'shield' ? `Vole le bouclier${ef.orBonus ? ' (ou le meilleur bonus)' : ''}` : `Vole ${ef.value} ${ef.what.toUpperCase()}`;
      case 'range': return `+${ef.value} portée pendant ${ef.turns} tour(s)`;
      case 'guard': return `−${ef.value} % de dégâts subis au contact pendant ${ef.turns} tour(s)`;
      case 'leap': return `Bondit, puis ${ef.effects.map(x => this.effectLine(x).toLowerCase()).join(', ')} autour de lui`;
      case 'retreat': return `Recule de ${ef.cells} case(s) loin de l'ennemi le plus proche`;
      case 'cleanse': return 'Retire les malus';
      case 'devourShield': return 'Dévore le bouclier, se soigne d\'autant';
      case 'push': return `Pousse de ${ef.cells} case(s)${ef.ifSworn ? ' (contre le juré)' : ''}`;
      case 'pull': return `Attire de ${ef.cells} case(s)`;
      case 'swap': return 'Échange les places';
      case 'sacrifice': return `Sacrifie l'invocation : ${v.min} à ${v.max} aux ennemis à ${ef.radius} case(s)`;
      case 'teleport': return 'Téléporte le lanceur';
      case 'obstacle': return `Obstacle pendant ${ef.turns} tour(s)`;
      case 'trap': return `Piège : ${ef.effects.map(x => this.effectLine(x).toLowerCase()).join(', ')}`;
      case 'summon': return `Invoque ${DATA.monsters[ef.monster].name}`;
      case 'selfDamagePct': return `Coûte ${ef.pct} % des PV max`;
      case 'paNow': return `+${ef.value} PA immédiatement`;
      case 'rewind': return 'À la fin du tour, revient sur sa case de départ';
      case 'pmNow': return `+${ef.value} PM immédiatement`;
      default: return ef.type;
    }
  }

  spellTooltip(id, entity) {
    const s = this.combat.spellOf(id, entity || this.combat.player);
    const el = DATA.elements[s.element];
    const lines = [];
    lines.push(`<b style="color:${el.color}">${s.name}</b> <span class="muted">· ${el.label} · ${s.pa} PA${s.rank > 1 ? ` · rang ${s.rank}` : ''}</span>`);
    if (s.target === 'self') lines.push('Sur soi');
    else lines.push(`Portée ${s.range[0]} à ${s.range[1]}${s.los ? ', ligne de vue' : ', sans ligne de vue'}${s.line ? ', en ligne' : ''}`);
    const targets = { free: 'case libre', enemy: 'ennemi', ally: 'allié', summon: 'invocation alliée' };
    if (targets[s.target]) lines.push(`Cible : ${targets[s.target]}`);
    if (s.aoe.shape === 'cross') lines.push(`Zone : croix de ${s.aoe.size}`);
    if (s.aoe.shape === 'circle') lines.push(`Zone : ${s.aoe.size} cases autour`);
    if (s.aoe.shape === 'line') lines.push(`Zone : ligne de ${s.aoe.size}`);
    if (s.affects === 'allies') lines.push('Alliés seulement');
    if (s.affects === 'enemies') lines.push('Ennemis seulement');
    for (const ef of s.effects) lines.push(this.effectLine(ef));
    for (const ef of s.selfEffects || []) lines.push(this.effectLine(ef));
    if (s.lifesteal) lines.push(`Vol de vie ${s.lifesteal} %`);
    if (s.lowHpBonus) lines.push(`Dégâts × ${s.lowHpBonus.mult} sous ${s.lowHpBonus.below} % de vie`);
    if (s.executeBelow) lines.push(`Dégâts doublés sur une cible sous ${s.executeBelow} % de vie`);
    if (s.bonusIfInvisible) lines.push(`Dégâts × ${s.bonusIfInvisible} si invisible`);
    if (s.aoe.shape === 'pierce') lines.push('Traverse la ligne jusqu\'au bord ou au premier rocher');
    if (s.fury) lines.push(`+${s.fury} Fureur si un ennemi est touché`);
    if (s.furySpend) lines.push(`+${s.furySpend} % par point de Fureur, toute la Fureur dépensée`);
    if (s.oathPierce) lines.push('Contre le juré : ni esquive ni armure');
    if (s.affutBonus) lines.push(`+${s.affutBonus} % à l'Affût`);
    if (s.keepsAffut) lines.push('Ne casse pas l\'Affût');
    if (s.telefrag) lines.push(`Sur une créature : téléfrag, les places s'échangent, +${s.telefrag} PA une fois par tour`);
    if (s.purse) lines.push(`Bourse : +${s.purse} % de Fils et de butin si la cible meurt`);
    if (s.onKill) lines.push(`Si la cible meurt : ${s.onKill.map(x => this.effectLine(x).toLowerCase()).join(', ')}`);
    const limits = [];
    if (s.cooldown) limits.push(`relance : ${s.cooldown} tours`);
    if (s.maxPerTurn) limits.push(`${s.maxPerTurn} par tour`);
    if (limits.length) lines.push(`<span class="muted">${limits.join(' · ')}</span>`);
    if (s.desc) lines.push(`<i>${s.desc}</i>`);
    if (entity) {
      const st = this.combat.spellState(entity, id);
      if (!st.ok) lines.push(`<span class="warn">${st.reason}</span>`);
    }
    return lines.join('<br>');
  }

  showTooltip(button, id) {
    const t = this.el.tooltip;
    t.innerHTML = this.spellTooltip(id, this.combat.player);
    t.classList.remove('hidden');
    const r = button.getBoundingClientRect();
    t.style.left = Math.max(8, Math.min(window.innerWidth - t.offsetWidth - 8, r.left + r.width / 2 - t.offsetWidth / 2)) + 'px';
    t.style.top = (r.top - t.offsetHeight - 8) + 'px';
  }

  hideTooltip() {
    if (this.tooltipUntil && Date.now() < this.tooltipUntil) {
      clearTimeout(this.tipTimer);
      this.tipTimer = setTimeout(() => this.el.tooltip.classList.add('hidden'), this.tooltipUntil - Date.now());
      return;
    }
    this.el.tooltip.classList.add('hidden');
  }

  // ----- Interaction avec le plateau -----

  hover(cell) {
    this.hoverCell = cell;
    if (cell) {
      const e = this.combat.entityAt(cell.x, cell.y);
      if (e && e !== this.inspected && this.combat.canSee(this.combat.player, e)) { this.inspected = e; this.renderInspect(); }
    }
    this.updateHighlights();
  }

  // Un sort choisi : avec l'option « Confirmer les sorts » (au doigt par défaut), la case visée ouvre
  // une petite fiche près de la cible (nom, coût en PA, annuler, lancer), la zone restant allumée ;
  // sans elle, le sort part. Au doigt, sans sort, un premier toucher montre le chemin et son coût
  // en PM, un second toucher sur la même case fait marcher ; une entité touchée montre sa fiche.
  // À la souris, rien ne change : le survol montre, le clic agit.
  tapCell(cell, touch) {
    const c = this.combat;
    this.hideCastConfirm();
    if (c.phase !== 'battle') { this.armed = null; return this.clickCell(cell); }
    if (this.selectedSpell && UI.confirmerSorts(touch)) {
      if (!cell || !this.isPlayerTurn() || c.busy) return;
      const ok = c.canCastAt(c.actor, this.selectedSpell, cell);
      if (!ok.ok) { this.armed = null; this.hover(null); this.banner(ok.reason, 900); return; }
      this.armed = { x: cell.x, y: cell.y, spell: this.selectedSpell };
      this.hover(cell);
      this.showCastConfirm(cell);
      return;
    }
    if (!touch || this.selectedSpell) { this.armed = null; this.hideMoveCost(); return this.clickCell(cell); }
    const e = cell && c.entityAt(cell.x, cell.y);
    if (e && c.canSee(c.player, e)) { this.armed = null; this.hideMoveCost(); return this.clickCell(cell); }
    if (this.armed && cell && this.armed.x === cell.x && this.armed.y === cell.y && !this.armed.spell) {
      this.armed = null;
      this.hideMoveCost();
      return this.clickCell(cell);
    }
    this.armed = cell ? { x: cell.x, y: cell.y, spell: null } : null;
    this.hover(cell);
    this.showMoveCost(cell);
  }

  // ----- Confirmation d'un sort et coût d'un déplacement, près de la case visée -----

  showCastConfirm(cell) {
    const c = this.combat, id = this.selectedSpell;
    const s = c.spellOf(id, c.actor);
    if (!s || !this.el.stage) return;
    let box = this.el.confirm;
    if (!box) {
      box = this.el.confirm = document.createElement('div');
      box.className = 'vy-confirm-sort hidden';
      box.setAttribute('role', 'dialog');
      box.innerHTML = '<div class="vy-confirm-sort__nom"></div><div class="vy-confirm-sort__ligne">' +
        `<button type="button" class="vy-confirm-sort__non" aria-label="Annuler">${UI.ICON.non}</button>` +
        `<span class="vy-confirm-sort__cout">${UI.ICON.pa}<span></span></span>` +
        `<button type="button" class="vy-confirm-sort__oui" aria-label="Lancer le sort">${UI.ICON.oui}</button></div>`;
      box.addEventListener('click', evt => {
        if (evt.target.closest('.vy-confirm-sort__oui')) this.confirmCast();
        else if (evt.target.closest('.vy-confirm-sort__non')) { this.hideCastConfirm(); this.armed = null; this.hover(null); }
      });
      this.el.stage.appendChild(box);
    }
    box.querySelector('.vy-confirm-sort__nom').textContent = s.name;
    box.querySelector('.vy-confirm-sort__cout span').textContent = `PA : -${s.pa}`;
    box.setAttribute('aria-label', `Lancer ${s.name}, ${s.pa} PA`);
    box.classList.remove('hidden');
    this.confirmCell = { x: cell.x, y: cell.y };
    if (this.lacherConfirm) this.lacherConfirm();
    this.lacherConfirm = UI.ancrer(() => this.placeNear(box, this.confirmCell, 54));
    this.placeNear(box, this.confirmCell, 54);
  }

  hideCastConfirm() {
    if (this.lacherConfirm) { this.lacherConfirm(); this.lacherConfirm = null; }
    if (this.el.confirm) this.el.confirm.classList.add('hidden');
    this.confirmCell = null;
  }

  get confirming() { return !!(this.el.confirm && !this.el.confirm.classList.contains('hidden')); }

  async confirmCast() {
    const cell = this.confirmCell;
    this.hideCastConfirm();
    this.armed = null;
    if (cell) await this.clickCell(cell);
  }

  showMoveCost(cell) {
    const c = this.combat;
    const path = cell && this.isPlayerTurn() && !c.busy ? Grid.pathTo(c.reachFor(c.actor), cell) : null;
    if (!path || !path.length || !this.el.stage) { this.hideMoveCost(); return; }
    let tag = this.el.coutPm;
    if (!tag) { tag = this.el.coutPm = document.createElement('div'); tag.className = 'vy-cout-pm hidden'; this.el.stage.appendChild(tag); }
    tag.innerHTML = `<b>${path.length}</b> PM`;
    tag.classList.remove('hidden');
    this.moveCell = { x: cell.x, y: cell.y };
    if (this.lacherCout) this.lacherCout();
    this.lacherCout = UI.ancrer(() => this.placeNear(tag, this.moveCell, 30));
    this.placeNear(tag, this.moveCell, 30);
  }

  hideMoveCost() {
    if (this.lacherCout) { this.lacherCout(); this.lacherCout = null; }
    if (this.el.coutPm) this.el.coutPm.classList.add('hidden');
    this.moveCell = null;
  }

  // Place un élément de la scène au-dessus d'une case (centré), sans sortir de la scène.
  placeNear(el, cell, lift) {
    if (!cell || !this.el.stage) return;
    const hr = this.el.stage.getBoundingClientRect();
    const k = UI.cellScale(this.renderer, cell.x, cell.y);
    const q = UI.cellClient(this.renderer, cell.x, cell.y);
    const w = el.offsetWidth, h = el.offsetHeight;
    let x = q.x - hr.left - w / 2, y = q.y - hr.top - lift * k - h;
    if (y < 6) y = q.y - hr.top + 18 * k;
    x = Math.max(6, Math.min(hr.width - w - 6, x));
    y = Math.max(6, Math.min(hr.height - h - 6, y));
    el.style.transform = `translate(${Math.round(x)}px, ${Math.round(y)}px)`;
  }

  async clickCell(cell) {
    const c = this.combat;
    if (!cell || !Grid.inBounds(c.map, cell.x, cell.y)) return;
    if (c.phase === 'placement') { if (c.placePlayer(cell.x, cell.y)) Bus.emit('placed', { x: cell.x, y: cell.y }); return; }
    if (!this.isPlayerTurn() || c.busy) return;
    if (this.selectedSpell) {
      const id = this.selectedSpell;
      const target = c.entityAt(cell.x, cell.y);
      const r = await c.cast(c.actor, id, cell);
      if (!r.ok) this.banner(r.reason, 900);
      else {
        Bus.emit('spellCast', { spell: id, ennemi: !!(target && target.team !== c.player.team) });
        if (c.actor && !c.spellState(c.actor, id).ok) this.selectedSpell = null;
      }
      this.refresh();
      this.updateHighlights();
      return;
    }
    const target = c.entityAt(cell.x, cell.y);
    if (target && c.canSee(c.player, target)) { this.inspected = target; this.renderInspect(); this.showEntityCard(target); return; }
    const path = Grid.pathTo(c.reachFor(c.actor), cell);
    if (path) {
      const moved = await c.moveAlong(c.actor, path);
      if (moved) Bus.emit('moved', { x: c.player.x, y: c.player.y });
      this.refresh();
      this.updateHighlights();
    }
  }

  // Une bulle au-dessus du plateau avec l'essentiel d'une entité (utile sans panneau latéral).
  showEntityCard(e) {
    const t = this.el.tooltip;
    const res = Object.entries(e.resist).filter(([, v]) => v).map(([k, v]) => `${DATA.elements[k].label} ${v > 0 ? '+' : ''}${v} %`).join(', ');
    const effects = e.effects.map(f => this.describeEffect(f)).join(', ');
    t.innerHTML = `<b style="color:${e.color}">${Util.esc(e.name)}</b> <span class="muted">niveau ${e.level}</span><br>${e.hp} / ${e.hpMax} PV · ${e.paMax} PA · ${e.pmMax} PM${res ? '<br><span class="muted">' + res + '</span>' : ''}${effects ? '<br>' + effects : ''}${e.def.desc ? '<br><i>' + e.def.desc + '</i>' : ''}`;
    t.classList.remove('hidden');
    const r = this.el.stage.getBoundingClientRect();
    t.style.left = Math.max(8, Math.min(window.innerWidth - t.offsetWidth - 8, r.left + r.width / 2 - t.offsetWidth / 2)) + 'px';
    t.style.top = (r.top + 48) + 'px';
    this.tooltipUntil = Date.now() + 2600;
    clearTimeout(this.cardTimer);
    this.cardTimer = setTimeout(() => { if (Date.now() >= this.tooltipUntil) this.hideTooltip(); }, 2700);
  }

  key(evt) {
    if (evt.target && evt.target.tagName === 'SELECT') return;
    const c = this.combat;
    if (evt.key === 'Escape') { if (this.confirming) { this.hideCastConfirm(); this.armed = null; this.hover(null); } else this.selectSpell(null); return; }
    if (evt.key === ' ' || evt.key === 'Enter') {
      evt.preventDefault();
      if (this.confirming) this.confirmCast();
      else if (c.phase === 'placement') this.ready();
      else this.endTurn();
      return;
    }
    if (/^[0-9]$/.test(evt.key)) {
      const idx = evt.key === '0' ? 9 : Number(evt.key) - 1;
      const id = UI.ordreSorts(c.player)[idx];
      if (id) this.selectSpell(id);
    }
  }

  updateHighlights() {
    const H = this.renderer.highlights;
    const c = this.combat;
    H.move.clear(); H.range.clear(); H.blocked.clear(); H.aoe.clear();
    H.path = [];
    H.hover = this.hoverCell;
    if (!this.isPlayerTurn()) return;
    const a = c.actor;
    if (this.selectedSpell) {
      const s = c.spellOf(this.selectedSpell, a);
      const tc = c.targetCells(a, this.selectedSpell);
      for (const cell of tc.cells) H.range.add(Grid.key(cell.x, cell.y));
      for (const cell of tc.blocked) H.blocked.add(Grid.key(cell.x, cell.y));
      if (this.hoverCell && c.canCastAt(a, this.selectedSpell, this.hoverCell).ok) {
        for (const cell of c.zoneCells(a, s, this.hoverCell, a.pos)) H.aoe.add(Grid.key(cell.x, cell.y));
      }
    } else if (!c.busy) {
      const reach = c.reachFor(a);
      for (const [k, d] of reach.dist) if (d > 0) H.move.add(k);
      if (this.hoverCell) {
        const p = Grid.pathTo(reach, this.hoverCell);
        if (p) H.path = p;
      }
    }
  }

  // ----- Panneaux -----

  // La pastille du défi dans la barre du haut : nom, bonus, et son état.
  renderChallenge(ch) {
    const el = this.el.challenge;
    if (!el) return;
    if (!ch) { el.classList.add('hidden'); return; }
    el.classList.remove('hidden');
    el.classList.toggle('failed', !!ch.failed);
    el.classList.toggle('success', !!ch.success);
    el.textContent = `Défi : ${ch.name} ${ch.failed ? '(raté)' : ch.success ? '(réussi)' : `+${ch.bonus} %`}`;
    el.title = ch.desc + (ch.failed ? ` Raté : ${ch.failed}.` : '');
  }

  describeEffect(f) {
    const t = f.turns === 0 ? 'ce tour' : (f.turns >= 99 ? 'permanent' : `${f.turns} t.`);
    switch (f.type) {
      case 'armor': return f.turns >= 99 ? `armure ${f.value} %` : `armure ${f.value} % (${t})`;
      case 'shield': return `bouclier ${f.value} (${t})`;
      case 'power': return `+${f.value} % dégâts (${t})`;
      case 'vuln': return `+${f.value} % subis (${t})`;
      case 'dot': return `brûlure ${f.value} ${DATA.elements[f.element].label.toLowerCase()} (${t})`;
      case 'guard': return `garde −${f.value} % au contact (${t})`;
      case 'range': return `+${f.value} portée (${t})`;
      case 'echo': return `écho, ${f.uses} résonance(s) (${t})`;
      case 'state': {
        const names = { invisible: 'invisible', stunned: 'sonné', invulnerable: 'invulnérable', lanterne: 'tient sa lanterne (esquive à distance)', ivre: 'ivre (vole de la vie au contact)', unhealable: 'insoignable' };
        if (f.name === 'provoked') return `provoqué par ${f.by ? Util.esc(f.by.name) : '?'} (${t})`;
        if (f.name === 'sworn') return `juré par ${f.by ? Util.esc(f.by.name) : '?'} (${t})`;
        if (f.name === 'tracked') return `traqué par ${f.by ? Util.esc(f.by.name) : '?'} (${t})`;
        return `${names[f.name] || f.name} (${t})`;
      }
      case 'pm': if (f.value <= -10) return `enraciné (${t})`;
      // un malus de PM ordinaire s'affiche comme les PA
      default: return `${f.value > 0 ? '+' : ''}${f.value} ${f.type.toUpperCase()} (${t})`;
    }
  }

  refresh() {
    const c = this.combat;
    const p = c.player;
    if (!p) return;
    const playerTurn = this.isPlayerTurn();

    this.el.round.textContent = c.phase === 'battle' ? `Tour ${c.round}` : (c.phase === 'ended' ? 'Combat terminé' : 'Placement');
    this.renderTimeline();
    // Les PV du joueur baissent : le guide peut prévenir (js/guide.js).
    if (c.phase === 'battle' && p && this.lastHp != null && p.hp < this.lastHp) Bus.emit('hpLoss', { hp: p.hp, max: p.hpMax });
    this.lastHp = p ? p.hp : null;

    // Ressources du kit (Fureur du Sarkan, Affût du Lyssar, Sang Versé du Karsh, Kaldrin armé), puis les effets en cours.
    const kit = [];
    if (p.kit && p.kit.fury) kit.push(`Fureur ${p.fury} / ${p.kit.fury.max}`);
    if (c.isAffut(p)) kit.push('à l\'affût');
    if (p.kit && p.kit.blood) kit.push(`Sang Versé ${c.bloodOf(p)} %`);
    if (c.isArmed(p)) kit.push(`armé (−${p.kit.armed.reduction} % subis)`);
    const effects = kit.concat(p.effects.map(f => this.describeEffect(f))).join(', ');
    // Les cases de stats sont construites une fois, puis mises à jour : la jauge de vie glisse
    // et garde un instant la trace des PV perdus.
    if (!this.statEls || !this.el.stats.contains(this.statEls.hp)) {
      this.el.stats.innerHTML =
        `<div class="stat hp"><b></b><small></small>${Util.jauge('vie', p.hp, p.hpMax, null, 'Points de vie')}</div>` +
        `<div class="stat pa"><b></b><small>PA</small></div>` +
        `<div class="stat pm"><b></b><small>PM</small></div>` +
        `<div class="stat timer" id="timer"></div>` +
        `<div class="stat fx hidden"><small></small></div>`;
      const q = sel => this.el.stats.querySelector(sel);
      this.statEls = { hp: q('.stat.hp'), hpB: q('.stat.hp b'), hpS: q('.stat.hp small'), gauge: q('.stat.hp .vy-jauge'), pa: q('.stat.pa b'), pm: q('.stat.pm b'), fx: q('.stat.fx'), fxS: q('.stat.fx small') };
      this.el.timer = q('#timer');
    }
    const S = this.statEls;
    S.hpB.textContent = p.hp;
    S.hpS.textContent = `/ ${p.hpMax} PV`;
    Util.setJauge(S.gauge, p.hp, p.hpMax);
    S.pa.textContent = p.pa;
    S.pm.textContent = p.pm;
    S.fx.classList.toggle('hidden', !effects);
    S.fxS.innerHTML = effects;
    this.updateTimer();

    for (const id in this.spellButtons) {
      const b = this.spellButtons[id];
      const st = c.spellState(p, id);
      b.classList.toggle('selected', this.selectedSpell === id);
      b.classList.toggle('disabled', !playerTurn || !st.ok);
      const cd = p.cooldowns[id] || 0;
      b.querySelector('.cd').textContent = cd > 0 ? cd : '';
    }

    this.el.ready.classList.toggle('hidden', c.phase !== 'placement');
    this.el.endTurn.classList.toggle('hidden', c.phase !== 'battle');
    this.el.endTurn.disabled = !playerTurn;
    const tb = this.el.turnBar;
    if (tb) {
      const act = tb.querySelector('.vy-barre-tour__action');
      const placement = c.phase === 'placement';
      act.textContent = placement ? 'Prêt' : 'Fin du tour';
      act.dataset.ui = placement ? 'pret' : 'fin-tour';
      act.disabled = !(placement || playerTurn);
      act.classList.toggle('hidden', c.phase === 'ended');
      tb.querySelector('.vy-barre-tour__tour').textContent = c.phase === 'battle' ? `Tour : ${c.round}` : (placement ? 'Placement' : 'Fin du combat');
    }
    this.renderInspect();
    // Le panneau de jeu du téléphone suit (js/hud-jeu.js) : PA, PM, PV, état des sorts.
    if (this.apresRefresh) this.apresRefresh();
  }

  // Le compte à rebours : celui du tour en cours (le tien vient du moteur, celui des autres est
  // compté depuis le début de leur tour), ou celui du placement dans le monde.
  updateTimer() {
    const c = this.combat;
    const now = Date.now();
    if (c.phase === 'placement' && this.placementEndsAt && now >= this.placementEndsAt) { this.ready(); return; }
    if (this.el.timer) {
      if (this.isPlayerTurn()) {
        const left = Math.max(0, Math.ceil((c.turnEndsAt - now) / 1000));
        this.el.timer.innerHTML = `<b>${left}</b><small>s</small>`;
        this.el.timer.classList.toggle('urgent', left <= 5);
      } else {
        this.el.timer.innerHTML = '';
      }
    }
    let left = null;
    if (c.phase === 'placement' && this.placementEndsAt) left = (this.placementEndsAt - now) / 1000;
    else if (c.phase === 'battle' && c.actor) left = c.actor === c.player ? (c.turnEndsAt - now) / 1000 : c.turnSeconds - (now - this.turnStartedAt) / 1000;
    const txt = left == null ? '' : UI.chrono(Math.max(0, Math.ceil(left)));
    if (this.el.turnBar) {
      const ch = this.el.turnBar.querySelector('.vy-barre-tour__chrono');
      if (ch.textContent !== txt) ch.textContent = txt;
      ch.classList.toggle('urgent', left != null && left <= 5);
    }
    if (c.phase === 'placement' && this.el.round) this.el.round.textContent = this.placementEndsAt ? `Placement · ${txt}` : 'Placement';
  }

  static chrono(s) { return `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`; }

  // ----- L'ordre de jeu en bustes -----

  // La barre de tour du téléphone en paysage : compte à rebours en tête, bustes dans l'ordre du
  // tour, puis « Tour : N » et « Prêt » ou « Fin du tour ». Posée dans la scène par le jeu
  // (js/hud-jeu.js), montrée par css/jeu.css quand la disposition s'y prête.
  buildTurnBar() {
    if (!this.el.stage || this.el.turnBar) return;
    const tb = this.el.turnBar = document.createElement('div');
    tb.className = 'vy-barre-tour';
    tb.setAttribute('role', 'group');
    tb.setAttribute('aria-label', 'Ordre de jeu');
    tb.innerHTML = '<div class="vy-barre-tour__tete"><span class="vy-barre-tour__chrono" role="timer" aria-label="Temps restant"></span></div>' +
      '<div class="vy-barre-tour__corps"><div class="vy-barre-tour__liste vy-combattants"></div>' +
      '<div class="vy-barre-tour__cote"><span class="vy-barre-tour__tour"></span>' +
      '<button type="button" class="vy-bouton vy-bouton--primaire vy-barre-tour__action" data-ui="pret">Prêt</button></div></div>';
    tb.querySelector('.vy-barre-tour__action').addEventListener('click', () => { if (this.combat.phase === 'placement') this.ready(); else this.endTurn(); });
    // Toucher un buste : la fiche du combattant.
    tb.querySelector('.vy-barre-tour__liste').addEventListener('click', evt => {
      const b = evt.target.closest('[data-id]');
      const e = b && this.combat.entities.find(x => String(x.id) === b.dataset.id);
      if (e && e.alive && this.combat.canSee(this.combat.player, e)) { this.inspected = e; this.renderInspect(); this.showEntityCard(e); }
    });
    this.el.stage.appendChild(tb);
    this.timelineHtml = null;
    if (this.combat.player) this.refresh();
  }

  // Les combattants vivants, dans l'ordre du tour (invocations comprises) : buste, liseré de
  // camp, jauge de PV ; celui qui joue est cerclé d'or. Les vaincus quittent la file.
  renderTimeline() {
    const c = this.combat, p = c.player;
    const order = (c.phase === 'placement' ? c.entities.slice().sort((a, b) => b.initiative - a.initiative) : c.order).filter(e => e.alive);
    const painter = this.renderer && (this.renderer.painter || this.renderer);
    const html = order.map(e => {
      const hidden = !c.canSee(p, e);
      const hp = Math.max(0, Math.min(1, e.hp / e.hpMax));
      const team = e.team === 'player' ? 'allie' : 'ennemi';
      const img = hidden ? '' : `<img src="${UI.buste(painter, e)}" alt="" draggable="false">`;
      const title = hidden ? 'Quelque chose d\'invisible' : `${e.name}, niveau ${e.level} · ${e.hp} / ${e.hpMax} PV`;
      return `<div class="vy-combattant vy-combattant--${team}${e === c.actor ? ' actuel' : ''}${e.isSummon && !e.ally ? ' invoc' : ''}${hidden ? ' cache' : ''}" title="${Util.esc(title)}" data-id="${e.id}" style="--v:${hp.toFixed(3)}">${img}<span class="vy-combattant__pv" aria-hidden="true"></span></div>`;
    }).join('');
    if (this.timelineHtml === html) return;
    this.timelineHtml = html;
    this.el.timeline.innerHTML = html;
    if (this.el.turnBar) this.el.turnBar.querySelector('.vy-barre-tour__liste').innerHTML = html;
  }

  // Le buste d'un combattant, peint une fois par apparence puis gardé en image.
  static buste(painter, e) {
    const key = [e.shape, e.color, e.glyph || '', e.team, e.def && e.def.look || '', e.team === 'monster' && typeof Renderer === 'function' ? Renderer.motifOf(e.def.id) || '' : ''].join('|');
    const cache = UI._bustes || (UI._bustes = new Map());
    if (cache.has(key)) return cache.get(key);
    const W = 44, H = 52, k = 2;
    const cv = document.createElement('canvas');
    cv.width = W * k; cv.height = H * k;
    const g = cv.getContext('2d');
    g.scale(k, k);
    const bg = g.createLinearGradient(0, 0, 0, H);
    if (e.team === 'player') { bg.addColorStop(0, '#1d3d5c'); bg.addColorStop(1, '#0d1726'); } else { bg.addColorStop(0, '#4a1f1c'); bg.addColorStop(1, '#170d10'); }
    g.fillStyle = bg; g.fillRect(0, 0, W, H);
    const halo = g.createRadialGradient(W / 2, H * 0.42, 2, W / 2, H * 0.42, W * 0.6);
    halo.addColorStop(0, e.team === 'player' ? 'rgba(0,194,255,0.28)' : 'rgba(240,122,92,0.26)'); halo.addColorStop(1, 'rgba(0,0,0,0)');
    g.fillStyle = halo; g.fillRect(0, 0, W, H);
    if (painter && typeof painter.drawBody === 'function') {
      const s = { shape: e.shape, color: e.color, glyph: e.glyph, team: e.team, look: e.def && e.def.look, motif: e.team === 'monster' && typeof Renderer === 'function' ? Renderer.motifOf(e.def.id) : null };
      g.save();
      g.translate(W / 2, H + 12);
      g.scale(1.12, 1.12);
      g.lineJoin = 'round'; g.lineCap = 'round';
      try { painter.drawBody(g, { x: 0, y: 0 }, s); if (s.motif) painter.drawMotif(g, { x: 0, y: 0 }, s); } catch (err) { /* peintre pas prêt */ }
      g.restore();
    }
    const url = cv.toDataURL('image/png');
    cache.set(key, url);
    return url;
  }

  renderInspect() {
    const e = this.inspected;
    if (!e) { this.el.inspect.innerHTML = ''; return; }
    const res = Object.entries(e.resist).filter(([, v]) => v).map(([k, v]) => `${DATA.elements[k].label} ${v > 0 ? '+' : ''}${v} %`).join(', ') || 'aucune';
    const spells = e.spells.map(id => {
      const s = this.combat.spellOf(id, e);
      const dmg = s.effects.find(ef => ef.type === 'damage');
      const heal = s.effects.find(ef => ef.type === 'heal');
      const shown = DATA.rankShown(dmg || heal || {});
      const what = dmg ? `${shown.min}-${shown.max}` : heal ? `soin ${shown.min}-${shown.max}` : '';
      return `<li><span style="color:${DATA.elements[s.element].color}">${s.name}</span> <span class="muted">${s.pa} PA · ${s.target === 'self' ? 'soi' : s.range[0] + '-' + s.range[1]}</span> ${what}</li>`;
    }).join('');
    const effects = e.effects.map(f => this.describeEffect(f)).join(', ');
    const tags = [];
    if (e.boss) tags.push('boss');
    if (e.isSummon) tags.push(`invocation${e.owner ? ' de ' + e.owner.name : ''}`);
    if (e.ghost) tags.push('traverse les rochers');
    if (e.immuneElement) tags.push(`immunisé : ${DATA.elements[e.immuneElement].label.toLowerCase()}`);
    this.el.inspect.innerHTML =
      `<h3 style="color:${e.color}">${Util.esc(e.name)}${e.def.title ? ` <small>${Util.esc(e.def.title)}</small>` : ''} <small>niveau ${e.level}</small></h3>` +
      `<div class="row"><span>${e.hp} / ${e.hpMax} PV</span><span>${e.paMax} PA · ${e.pmMax} PM</span></div>` +
      `<div class="muted">Initiative ${e.initiative} · ${e.alive ? '' : 'vaincu · '}résistances : ${res}</div>` +
      (tags.length ? `<div class="muted">${tags.join(' · ')}</div>` : '') +
      (effects ? `<div class="muted">Effets : ${effects}</div>` : '') +
      (e.def.desc ? `<p>${e.def.desc}</p>` : '') +
      `<ul class="spells">${spells}</ul>`;
  }

  addLog({ msg, kind }) {
    const line = document.createElement('div');
    line.className = 'line ' + kind;
    line.textContent = msg;
    this.el.log.prepend(line);
    while (this.el.log.children.length > 80) this.el.log.lastChild.remove();
  }

  banner(text, ms) {
    const b = this.el.banner;
    b.textContent = text;
    b.classList.remove('hidden');
    if (this.bannerTimer) clearTimeout(this.bannerTimer);
    this.bannerTimer = ms ? setTimeout(() => this.hideBanner(), ms) : null;
  }

  hideBanner() {
    this.el.banner.classList.add('hidden');
    if (this.bannerTimer) { clearTimeout(this.bannerTimer); this.bannerTimer = null; }
  }
}

// Le compte à rebours du placement, dans le monde : à zéro, le combat commence.
UI.PLACEMENT_SECONDES = 30;

// Pictogrammes de la confirmation d'un sort : annuler, lancer, et le badge des PA (un hexagone
// d'or, la forme des PA dans toute l'interface).
UI.ICON = {
  non: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" aria-hidden="true"><path d="M6.5 6.5l11 11M17.5 6.5l-11 11"/></svg>',
  oui: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12.5l4.5 4.5L19 7"/></svg>',
  pa: '<svg class="vy-sceau-pa" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2.2l8.5 4.9v9.8L12 21.8l-8.5-4.9V7.1z" fill="#c9a66b" stroke="#8e7144" stroke-width="1.4" stroke-linejoin="round"/><path d="M12 5.4l5.7 3.3v6.6L12 18.6l-5.7-3.3V8.7z" fill="#f2dcaa"/><path d="M12 5.4l5.7 3.3L12 12 6.3 8.7z" fill="#fff3d2" opacity="0.7"/></svg>',
};
