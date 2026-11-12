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
    this.placementEndsAt = 0;
    this.turnStartedAt = Date.now();
    this.jeu = false;
    this.el.endTurn.dataset.ui = 'fin-tour';
    this.el.ready.dataset.ui = 'pret';

    combat.on('log', d => this.addLog(d));
    combat.on('setup', () => {
      this.selectedSpell = null;
      this.inspected = combat.player;
      this.el.log.innerHTML = '';
      this.journal = null;
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
    combat.on('turn', () => this.renderSuccesCombat());
    combat.on('update', () => this.renderSuccesCombat());
    if (this.el.challenge) this.el.challenge.addEventListener('click', () => { const t = UI.texteDefis(combat); if (t) this.banner(t, 3200); });
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
      this.updateHighlights();
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
    if (this.el.timeline) this.brancherFrise(this.el.timeline);
    this.el.ready.addEventListener('click', () => this.ready());
    this.el.endTurn.addEventListener('click', () => this.endTurn());
    setInterval(() => this.updateTimer(), 200);
  }

  ready() {
    if (this.combat.phase !== 'placement') return;
    this.hideBanner();
    this.placementEndsAt = 0;
    this.combat.start();
  }

  armerPlacement(seconds) {
    this.placementEndsAt = seconds > 0 && this.combat.phase === 'placement' ? Date.now() + seconds * 1000 : 0;
    this.placementSeconds = seconds > 0 ? seconds : 0;
    this.updateTimer();
  }


  static cellClient(renderer, x, y) {
    const p = renderer.cellToScreen(x, y);
    return UI.boardClient(renderer, p.x, p.y);
  }

  static boardClient(renderer, px, py) {
    if (renderer && typeof renderer.worldToClient === 'function') {
      const q = renderer.worldToClient(px, py);
      if (q && Number.isFinite(q.x) && Number.isFinite(q.y)) return q;
    }
    const r = renderer.canvas.getBoundingClientRect();
    return { x: r.left + px * r.width / renderer.W, y: r.top + py * r.height / renderer.H };
  }

  static cellScale(renderer, x, y) {
    const e = renderer && typeof renderer.echelleFigure === 'function' ? renderer.echelleFigure(x, y) : undefined;
    if (Number.isFinite(e) && e > 0) return e;
    const a = UI.cellClient(renderer, x, y), b = UI.cellClient(renderer, x + 1, y);
    return Math.hypot(b.x - a.x, b.y - a.y) / Math.hypot(Grid.TILE_W / 2, Grid.TILE_H / 2) || 1;
  }

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

  static confirmerSorts(touch) {
    let v = null;
    try { v = localStorage.getItem('veylan.confirmerSorts'); } catch (e) {   }
    if (v === '1') return true;
    if (v === '0') return false;
    return touch != null ? !!touch : UI.tactile();
  }

  static get DUREES_TOUR() { return [['auto', 'Automatique'], ['20', '20 s'], ['30', '30 s'], ['45', '45 s']]; }
  static choixDureeTour() {
    let v = null;
    try { v = localStorage.getItem('veylan.dureeTour'); } catch (e) {   }
    return UI.DUREES_TOUR.some(([id]) => id === v) ? v : 'auto';
  }
  static dureeTour() {
    const v = UI.choixDureeTour(), base = DATA.rules.turnSeconds || 20;
    if (v !== 'auto') return Number(v);
    return UI.tactile() ? Math.max(base, 30) : base;
  }
  static reglerDureeTour(v) {
    try { if (v === 'auto') localStorage.removeItem('veylan.dureeTour'); else localStorage.setItem('veylan.dureeTour', String(v)); } catch (e) {   }
    return UI.dureeTour();
  }

  static tactile() { return typeof matchMedia === 'function' && matchMedia('(pointer: coarse)').matches; }

  static reglage(nom) {
    const M = UI._reglages || (UI._reglages = {});
    if (nom in M) return M[nom];
    let v = null;
    try { v = localStorage.getItem('veylan.combat.' + nom); } catch (e) {   }
    return (M[nom] = v === '0' ? false : v === '1' ? true : !!UI.REGLAGES[nom]);
  }
  static qualiteImage() {
    let v = null;
    try { v = localStorage.getItem('veylan.qualiteImage'); } catch (e) {   }
    return v === 'haute' ? 'haute' : 'standard';
  }
  static reglerQualiteImage(v) {
    try { localStorage.setItem('veylan.qualiteImage', v === 'haute' ? 'haute' : 'standard'); } catch (e) {   }
  }
  static densite(dpr, max) {
    const d = (typeof dpr === 'number' && dpr) || 1;
    return UI.qualiteImage() === 'haute' ? Math.min(2, Math.max(1.5, d)) : Math.min(d, max == null ? 2 : max);
  }
  static regler(nom, on) {
    try { localStorage.setItem('veylan.combat.' + nom, on ? '1' : '0'); } catch (e) {   }
    if (UI._reglages) delete UI._reglages[nom];
  }

  static get ACTIONS_CLASSE() { return { bascule_du_ciel: true, demontage: true }; }

  static ordreSorts(e) {
    const list = ((e && e.spells) || []).filter(id => !UI.ACTIONS_CLASSE[id]);
    return list.includes('arme') ? ['arme'].concat(list.filter(id => id !== 'arme')) : list;
  }


  ruban(texte, opts) {
    opts = opts || {};
    const stage = this.el.stage;
    if (!stage) return;
    let r = this.el.ruban;
    if (!r) { r = this.el.ruban = document.createElement('div'); r.setAttribute('role', 'status'); stage.appendChild(r); }
    clearTimeout(this.rubanT); clearTimeout(this.rubanT2);
    r.className = `vy-ruban vy-ruban--${opts.sorte || 'tour'}`;
    r.innerHTML = (opts.sorte === 'niveau' ? '<span class="vy-ruban__rayons" aria-hidden="true"></span><span class="vy-ruban__eclats" aria-hidden="true"><i></i><i></i><i></i><i></i><i></i><i></i></span>' : '') +
      `<span class="vy-ruban__bande"><span class="vy-ruban__texte">${Util.esc(texte)}</span></span>${opts.sous ? `<span class="vy-ruban__sous">${Util.esc(opts.sous)}</span>` : ''}` +
      ((opts.gains || []).length ? `<span class="vy-ruban__gains">${opts.gains.map(g => `<i>${Util.esc(g)}</i>`).join('')}</span>` : '');
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


  buildSpellBar() {
    this.el.spells.innerHTML = '';
    this.spellButtons = {};
    const p = this.combat.player, actions = Object.keys(UI.ACTIONS_CLASSE).filter(id => (p.spells || []).includes(id));
    UI.ordreSorts(p).concat(actions).forEach((id, i) => {
      const s = this.combat.spellOf(id, this.combat.player);
      const b = document.createElement('button');
      b.className = 'spell';
      b.dataset.spell = id;
      b.style.setProperty('--el', DATA.elements[s.element].color);
      const icone = typeof SortIcones === 'object' ? SortIcones.url(id, s, 48) : '';
      if (icone) b.classList.add('avec-icone');
      b.innerHTML = `<span class="key">${UI.ACTIONS_CLASSE[id] ? '²' : (i + 1) % 10}</span><span class="icon" style="--el:${DATA.elements[s.element].color}">${icone ? `<img src="${icone}" alt="">` : s.name.charAt(0)}</span><span class="name">${s.name}</span><span class="cost">${s.pa} PA</span><span class="cd"></span>${typeof Daltonien === 'object' ? Daltonien.signe(s.element) : ''}`;
      b.addEventListener('click', () => { if (this.suppressClick && Date.now() < this.suppressClick) { this.suppressClick = 0; return; } this.selectSpell(id); });
      b.addEventListener('mouseenter', () => this.showTooltip(b, id));
      b.addEventListener('mouseleave', () => this.hideTooltip());
      let press = null;
      b.addEventListener('touchstart', () => { press = setTimeout(() => { this.showTooltip(b, id); this.tooltipUntil = Date.now() + 3000; this.suppressClick = Date.now() + 800; }, 450); }, { passive: true });
      for (const evt of ['touchend', 'touchmove', 'touchcancel']) b.addEventListener(evt, () => { clearTimeout(press); }, { passive: true });
      this.el.spells.appendChild(b);
      this.spellButtons[id] = b;
    });
  }

  annulerSort() {
    this.selectedSpell = null;
    this.armed = null;
    this.hoverCell = null;
    this.hideCastConfirm();
    this.hideMoveCost();
    this.updateHighlights();
    this.refresh();
  }

  async selectSpell(id) {
    const c = this.combat;
    if (!id || this.selectedSpell === id) { this.annulerSort(); return; }
    if (!this.isPlayerTurn() || c.busy) return;
    const st = c.spellState(c.actor, id);
    if (!st.ok) { this.banner(st.reason, 900); return; }
    const s = c.spellOf(id, c.actor);
    this.hideCastConfirm();
    this.hideMoveCost();
    this.armed = null;
    if (s.target === 'self') {
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

  effectLine(ef) {
    if (ef.siAssis || ef.siDebout) return this.effectLine(Object.assign({}, ef, { siAssis: false, siDebout: false })) + (ef.siAssis ? ' (ancré)' : ' (mobile)');
    if (ef.onAlly || ef.onFoe) return (ef.onAlly ? 'Sur un allié ou une bête : ' : 'Sur un ennemi : ') + this.effectLine(Object.assign({}, ef, { onAlly: false, onFoe: false })).replace(/^./, c => c.toLowerCase());
    const v = DATA.rankShown(ef);
    switch (ef.type) {
      case 'damage': return `Dégâts ${v.min} à ${v.max}`;
      case 'heal': return `Soigne ${v.min} à ${v.max}`;
      case 'pa': case 'pm':
        if (ef.type === 'pm' && ef.value <= -10) return `Enracine ${ef.duration} tour(s)`;
        return `${ef.value > 0 ? '+' : ''}${ef.value} ${ef.type.toUpperCase()} pendant ${ef.duration} tour(s)`;
      case 'shield': return `Bouclier ${v.value} pendant ${ef.duration} tour(s)`;
      case 'power': return `${ef.value < 0 ? '−' + -ef.value : '+' + ef.value} % de dégâts ${ef.turns === 0 ? 'ce tour' : 'pendant ' + ef.turns + ' tour(s)'}`;
      case 'vuln': return `+${ef.value} % de dégâts subis pendant ${ef.turns} tour(s)`;
      case 'dot': return `Brûle ${v.value} par tour pendant ${ef.turns} tour(s)`;
      case 'echo': return `Écho ${ef.turns} tour(s) : ${v.min} à ${v.max} à chaque PM perdu, ${ef.uses} fois au plus`;
      case 'filon': return `Filon ${ef.turns} tour(s), ${ef.charges || 3} déclenchements : ${v.min} à ${v.max} à chaque retrait (PA, PM, portée) sur l'ennemi marqué, ou en zone autour de l'allié marqué soigné ; +1 Trouvaille`;
      case 'state': if (ef.name === 'forme_iskar') return `Forme Nocturne ${ef.turns} tour(s) : 40 % des soins seulement`;  if (ef.name === 'protege') return `Protégé ${ef.turns} tour(s) : le Velmar prend ses coups`; if (ef.name === 'digue') return `Carapace Close ${ef.turns} tour(s) : invulnérable au contact`; if (ef.name === 'brise_lames') return `Bouclier à Rouage ${ef.turns} tour(s) : invulnérable à distance`; if (ef.name === 'assise') return `Ancré ${ef.turns} tour(s) : rien ne le déplace`; if (ef.name === 'rayonnant') return `Rayonnant ${ef.turns} tour(s) : +15 % de soins reçus`; if (ef.name === 'victime') return `Victime choisie ${ef.turns} tour(s) : quitter son contact coûte tous les PM`; if (ef.name === 'gibier') return `Gibier ${ef.turns} tour(s) : les bêtes du Fennal ne chassent que lui`; if (ef.name === 'provoked') return `Provoque ${ef.turns} tour(s)`; if (ef.name === 'invisible') return `Invisible ${ef.turns} tour(s)${ef.lingering ? ', révélée à la fin du tour où elle frappe' : ''}`; { const E = DATA.etats && DATA.etats[ef.name]; if (E) return `${E.nom} ${ef.turns} tour(s) : ${E.desc}`; } return `État ${ef.turns} tour(s)`;
      case 'oath': return `Juré ${ef.turns} tour(s) : +${ef.power} % de dégâts contre lui`;
      case 'track': return `Traqué ${ef.turns} tour(s) : ne peut plus être invisible`;
      case 'steal': return ef.what === 'shield' ? `Vole le bouclier${ef.orBonus ? ' (ou le meilleur bonus)' : ''}` : `Vole ${ef.value} ${ef.what.toUpperCase()}`;
      case 'range': return `${ef.value < 0 ? '−' + -ef.value : '+' + ef.value} portée pendant ${ef.turns} tour(s)`;
      case 'guard': return `−${ef.value} % de dégâts subis au contact pendant ${ef.turns} tour(s)`;
      case 'leap': return `Bondit, puis ${ef.effects.map(x => this.effectLine(x).toLowerCase()).join(', ')} autour de lui`;
      case 'retreat': return `Recule de ${ef.cells} case(s) loin de l'ennemi le plus proche`;
      case 'cleanse': return 'Retire les malus';
      case 'devourShield': return 'Dévore le bouclier, se soigne d\'autant';
      case 'push': return `Pousse de ${ef.cells} case(s)${ef.ifSworn ? ' (contre le juré)' : ''}`;
      case 'pull': return `Attire de ${ef.cells} case(s)`;
      case 'swap': return 'Échange les places';
      case 'empoigner': return 'Porte la cible et peut marcher avec elle jusqu’au dépôt ou au jet';
      case 'jeter': return 'Jette ce que le Thalor tient sur la case visée';
      case 'depuisCentre': return `Repousse de ${ef.cells} case(s) depuis le point de chute`;
      case 'versCentre': return `Attire de ${ef.cells} case(s) vers le point de chute`;
      case 'rebond': return `Rebondit sur l'ennemi le plus proche à ${ef.cells || 2} case(s), ${ef.pct || 50} % des dégâts`;
      case 'glyph': return `${ef.name || 'Glyphe'} ${ef.turns} tour(s) : ${(ef.effects || []).map(x => this.effectLine(x).toLowerCase()).join(', ')}, au début du tour de qui s'y tient`;
      case 'soinDiffere': return `Soin de ${v.min} à ${v.max} au début du prochain tour de la cible`;
      case 'ecourter': return `Sur un allié, ses malus durent ${ef.tours || 1} tour de moins ; sur un ennemi, ses bonus`;
      case 'ordreMeute': return `Toutes ses bêtes frappent tout de suite, à ${ef.pct || 50} % de leurs dégâts`;
      case 'horde': return `+${ef.jauge || 3} de jauge ${ef.turns || 2} tours, ses appels coûtent ${ef.rabais || 1} PA de moins ; puis ses bêtes s'en vont`;
      case 'pacte': return `Sacrifie ses bêtes : +${ef.par || 3} % de dégâts par point de jauge (${ef.turns || 3} tours), ${ef.soin || 30} % de leurs PV`;
      case 'declencherMares': return 'Tous ses Glyphes agissent tout de suite sur les ennemis qui s\'y tiennent';
      case 'hantise': return 'Pousse la créature au contact jusqu\'à la case visée, à travers les pièges';
      case 'versLeurre': return `Attire de ${ef.cells} case(s) vers le Leurre`;
      case 'depuisLeurre': return `Repousse de ${ef.cells} case(s) depuis le Leurre`;
      case 'echangeLeurre': return 'Échange la cible avec le Leurre';
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
    else lines.push(`Portée ${s.range[0]} à ${s.range[1]}${s.los ? ', ligne de vue' : ', sans ligne de vue'}${s.line ? ', en ligne' : ''}${s.porteeFixe ? ', portée fixe' : ''}`);
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
    if (s.braiseCost) lines.push(`Coûte ${s.braiseCost} de Soif`);
    if (s.braise) lines.push(`+${s.braise} de Soif si un ennemi est touché`);
    if (s.recharge) lines.push(`Se charge : +${s.recharge} % à chaque retour de relance, une fois lancé`);
    if (s.cumul) lines.push(`Se cumule : +${s.cumul.par} % par lancer (${s.cumul.max} au plus)`);
    if (s.faveur) lines.push('Faveur : une seule par allié ; sur une case vide, elle reste au sol (Étincelle)');
    if (s.ombre) lines.push('Ombre : une seule par ennemi');
    if (s.mare) lines.push('Dans le Glyphe : le Velmar et ses alliés subissent 15 % de dégâts en moins');
    if (s.parPmRestant) lines.push(`+${s.parPmRestant} % par PM qui reste au lanceur`);
    if (s.traque) lines.push('Prend la cible en traque : chaque autre tir qui la touche ajoute un cran (+8 %, 3 au plus)');
    if (s.parPiege) lines.push(`+${s.parPiege} % par piège déclenché (Pli), le Pli dépensé`);
    { const k = Object.values(DATA.classes).map(c => c.reserve).find((r, i) => r && Object.values(DATA.classes)[i].spells.includes(s.id)); const nom = k ? k.nom : 'réserve';
      if (s.reserve) lines.push(`+${s.reserve} ${nom} si un ennemi est touché`);
      if (s.reserveSpend) lines.push(`+${s.reserveSpend} % par point de ${nom}, toute la ${nom} dépensée`); }
    if (s.braiseSpend) lines.push(`+${s.braiseSpend} % par point de Soif, toute la Soif lâchée`);
    if (s.oathPierce) lines.push('Contre le juré : ni esquive ni armure');
    if (s.affutBonus) lines.push(`+${s.affutBonus} % à l'Affût`);
    if (s.keepsAffut) lines.push('Garde l\'Affût, moins un cran (−4 %)');
    if (s.telefrag) lines.push(`Sur une créature : téléfrag, les places s'échangent, +${s.telefrag} PA une fois par tour`);
    if (s.purse) lines.push(`Bourse : +${s.purse} % de Dragmes et de butin si la cible meurt`);
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


  hover(cell) {
    this.hoverCell = cell;
    const c = this.combat;
    let e = null;
    if (cell) {
      e = c.entityAt(cell.x, cell.y);
      if (e && e !== this.inspected && c.canSee(c.player, e)) { this.inspected = e; this.renderInspect(); }
    }
    if (!this.armed && !UI.tactile()) {
      if (cell && !this.selectedSpell && !e && UI.reglage('cout')) this.showMoveCost(cell); else this.hideMoveCost();
    }
    this.majVise(e && c.canSee(c.player, e) ? e : null);
    this.updateHighlights();
  }

  majVise(e) {
    const id = e ? String(e.id) : null;
    if (this.viseId === id) return;
    this.viseId = id;
    if (typeof document === 'undefined') return;
    for (const el of document.querySelectorAll('.vy-combattant.vise')) if (el.dataset.id !== id) el.classList.remove('vise');
    if (id) for (const el of document.querySelectorAll('.vy-combattant[data-id="' + id + '"]')) el.classList.add('vise');
  }

  toucherPortrait(e, touch) {
    const c = this.combat;
    if (!e || !e.alive || !c.canSee(c.player, e)) return;
    if (this.selectedSpell && this.isPlayerTurn() && !c.busy) {
      const cell = { x: e.x, y: e.y };
      this.hideCastConfirm();
      const ok = c.canCastAt(c.actor, this.selectedSpell, cell);
      if (!ok.ok) { this.annulerSort(); return; }
      if (UI.confirmerSorts(touch)) {
        this.armed = { x: cell.x, y: cell.y, spell: this.selectedSpell };
        this.hover(cell);
        this.showCastConfirm(cell);
        return;
      }
      this.armed = null;
      this.hover(cell);
      this.clickCell(cell);
      return;
    }
    this.inspected = e; this.renderInspect(); this.showEntityCard(e);
  }
  viserPortrait(e) {
    const c = this.combat;
    if (e && (!e.alive || !c.canSee(c.player, e))) e = null;
    this.hover(e ? { x: e.x, y: e.y } : null);
  }

  brancherFrise(liste) {
    const trouver = evt => { const b = evt.target.closest('[data-id]'); return b ? this.combat.entities.find(x => String(x.id) === b.dataset.id) : null; };
    for (const n of ['pointerover', 'pointerdown']) liste.addEventListener(n, evt => { this.pointeurFrise = evt.pointerType; }, { passive: true });
    liste.addEventListener('click', evt => { const e = trouver(evt); if (e) this.toucherPortrait(e, this.pointeurFrise ? this.pointeurFrise !== 'mouse' : UI.tactile()); });
    liste.addEventListener('mouseover', evt => { if (this.pointeurFrise && this.pointeurFrise !== 'mouse') return; const e = trouver(evt); if (e) this.viserPortrait(e); });
    liste.addEventListener('mouseout', evt => {
      if (this.pointeurFrise && this.pointeurFrise !== 'mouse') return;
      const b = evt.target.closest('[data-id]');
      if (!b || (evt.relatedTarget && b.contains(evt.relatedTarget))) return;
      this.viserPortrait(null);
    });
  }

  tapCell(cell, touch) {
    const c = this.combat;
    this.hideCastConfirm();
    if (c.phase !== 'battle') { this.armed = null; return this.clickCell(cell); }
    if (this.selectedSpell && UI.confirmerSorts(touch)) {
      if (!this.isPlayerTurn() || c.busy) return;
      if (!cell) { this.annulerSort(); return; }
      const ok = c.canCastAt(c.actor, this.selectedSpell, cell);
      if (!ok.ok) { this.annulerSort(); return; }
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
    if (c.phase === 'battle' && this.selectedSpell && this.isPlayerTurn() && !c.busy &&
        (!cell || !Grid.inBounds(c.map, cell.x, cell.y))) { this.annulerSort(); return; }
    if (!cell || !Grid.inBounds(c.map, cell.x, cell.y)) return;
    if (c.phase === 'placement') { if (c.placePlayer(cell.x, cell.y)) Bus.emit('placed', { x: cell.x, y: cell.y }); return; }
    if (!this.isPlayerTurn() || c.busy) return;
    if (this.selectedSpell) {
      if (!c.canCastAt(c.actor, this.selectedSpell, cell).ok) { this.annulerSort(); return; }
      const id = this.selectedSpell;
      const target = c.entityAt(cell.x, cell.y);
      const r = await c.cast(c.actor, id, cell);
      if (!r.ok) this.banner(r.reason, 900);
      else {
        Bus.emit('spellCast', { spell: id, ennemi: !!(target && target.team !== c.player.team) });
        if (this.selectedSpell === id) this.selectedSpell = null;
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

  showEntityCard(e) {
    const t = this.el.tooltip;
    const res = Object.entries(e.resist).filter(([, v]) => v).map(([k, v]) => `${DATA.elements[k].label} ${v > 0 ? '+' : ''}${v} %`).join(', ');
    const effects = e.effects.map(f => this.describeEffect(f)).join(', ');
    t.innerHTML = `<b style="color:${e.color}">${Util.esc(e.name)}</b> <span class="muted">niveau ${e.level}</span><br>${e.hp} / ${e.hpMax} PV · ${e.paMax} PA · ${e.pmMax} PM${res ? '<br><span class="muted">' + res + '</span>' : ''}${effects ? '<br>' + effects : ''}${e.def.desc && !e.def.cle ? '<br><i>' + e.def.desc + '</i>' : ''}` + UI.geste(e.def, true);
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
    if ((evt.key === 'PageUp' || evt.key === 'PageDown') && this.tournerPageSorts) {
      if (this.tournerPageSorts(evt.key === 'PageDown' ? 1 : -1)) evt.preventDefault();
      return;
    }
    if (evt.code === 'Backquote' && !evt.ctrlKey && !evt.altKey && !evt.metaKey && c.player) {
      const act = (c.player.spells || []).find(id => UI.ACTIONS_CLASSE[id]);
      if (act) { evt.preventDefault(); this.selectSpell(act); }
      return;
    }
    const chiffre = /^Digit([0-9])$/.exec(evt.code || '') || /^Numpad([0-9])$/.exec(evt.code || '') || (/^[0-9]$/.test(evt.key) ? [0, evt.key] : null);
    if (chiffre && !evt.ctrlKey && !evt.altKey && !evt.metaKey) {
      const idx = chiffre[1] === '0' ? 9 : Number(chiffre[1]) - 1;
      const seconde = !!evt.shiftKey && !!/^Digit/.test(evt.code || '');
      const id = this.sortDeTouche ? this.sortDeTouche(idx, seconde) : UI.ordreSorts(c.player)[idx];
      if (id) this.selectSpell(id);
    }
  }

  updateHighlights() {
    const H = this.renderer.highlights;
    const c = this.combat;
    H.move.clear(); H.range.clear(); H.blocked.clear(); H.aoe.clear();
    H.path = [];
    H.hover = this.hoverCell;
    const vise = this.hoverCell && c.phase === 'battle' ? c.entityAt(this.hoverCell.x, this.hoverCell.y) : null;
    H.cible = vise && vise.alive && c.canSee(c.player, vise) ? vise.id : null;
    if (!this.isPlayerTurn()) return;
    const a = c.actor;
    if (this.selectedSpell) {
      const s = c.spellOf(this.selectedSpell, a);
      if (UI.reglage('portee')) {
        const tc = c.targetCells(a, this.selectedSpell);
        for (const cell of tc.cells) H.range.add(Grid.key(cell.x, cell.y));
        for (const cell of tc.blocked) H.blocked.add(Grid.key(cell.x, cell.y));
      }
      if (this.hoverCell && c.canCastAt(a, this.selectedSpell, this.hoverCell).ok) {
        for (const cell of c.zoneCells(a, s, this.hoverCell, a.pos)) H.aoe.add(Grid.key(cell.x, cell.y));
      }
    } else if (!c.busy) {
      const reach = c.reachFor(a);
      if (UI.reglage('deplacement')) for (const [k, d] of reach.dist) if (d > 0) H.move.add(k);
      if (this.hoverCell) {
        const p = Grid.pathTo(reach, this.hoverCell);
        if (p) H.path = p;
      }
    }
  }


  renderChallenge() {
    const el = this.el.challenge;
    if (!el) return;
    const defis = ((this.combat && this.combat.challenges) || []).filter(Boolean);
    this.renderSuccesCombat();
    if (!defis.length) { el.classList.add('hidden'); el.innerHTML = ''; this.majObjectifs(); return; }
    el.classList.remove('hidden');
    el.classList.add('vy-defis');
    el.classList.toggle('failed', defis.every(c => c.failed));
    el.classList.toggle('success', defis.every(c => c.success));
    const etat = c => (c.failed ? '(raté)' : c.success ? '(réussi)' : `+${c.bonus} %`);
    const phrase = (defis.length > 1 ? 'Défis : ' : 'Défi : ') + defis.map(c => `${c.name} ${etat(c)}`).join(' · ');
    const I = typeof DefisIcones === 'object' ? DefisIcones : null;
    const tuiles = defis.map(c => {
      const e = c.failed ? 'rate' : c.success ? 'reussi' : 'encours';
      const libelle = c.failed ? `Raté : ${c.failed}.` : c.success ? 'Réussi.' : 'En cours.';
      return `<span class="vy-defi" data-etat="${e}" data-defi="${Util.esc(c.id || '')}">` +
        `<span class="vy-defi__ic">${I ? I.de(c.id) : ''}${e !== 'encours' && I ? `<i class="vy-defi__etat">${e === 'reussi' ? I.coche : I.croix}</i>` : ''}</span>` +
        `<b class="vy-defi__bonus">+${c.bonus} %</b>` +
        `<span class="vy-defi__bulle" role="tooltip"><b>${Util.esc(c.name)}</b><span>${Util.esc(c.desc)}</span><small>+${c.bonus} % d'XP et de butin · ${Util.esc(libelle)}</small></span></span>`;
    }).join('');
    el.innerHTML = `<span class="vy-sr">${Util.esc(phrase)}</span>${tuiles}`;
    el.title = '';
    el.setAttribute('aria-label', phrase);
    this.majObjectifs();
  }
  objectifs() {
    if (this.el.objectifs) return this.el.objectifs;
    const def = this.el.challenge;
    if (!def || !def.parentNode) return null;
    const box = document.createElement('div');
    box.className = 'vy-objectifs hidden';
    let replie = false;
    try { replie = localStorage.getItem('veylan.objectifs.replie') === '1'; } catch (e) {   }
    box.classList.toggle('replie', replie);
    box.innerHTML = `<button type="button" class="vy-objectifs__tete" aria-expanded="${!replie}" title="Masquer ou montrer les défis et les succès">` +
      `<span class="vy-objectifs__titre">Objectifs</span><span class="vy-objectifs__compte"></span>` +
      `<svg class="vy-objectifs__chev" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M6 9l6 6 6-6"/></svg></button>` +
      `<div class="vy-objectifs__corps"><div class="vy-objectifs__dedans">` +
      `<section class="vy-objectifs__sec vy-objectifs__sec--geste" hidden><h5>Le geste</h5><div class="vy-objectifs__gestes"></div></section>` +
      `<section class="vy-objectifs__sec vy-objectifs__sec--defis"><h5>Défis</h5></section>` +
      `<section class="vy-objectifs__sec vy-objectifs__sec--succes"><h5>Succès</h5><div class="vy-succes-combat"></div></section>` +
      `</div></div>`;
    def.parentNode.insertBefore(box, def);
    box.querySelector('.vy-objectifs__sec--defis').appendChild(def);
    box.querySelector('.vy-objectifs__tete').addEventListener('click', () => {
      const r = box.classList.toggle('replie');
      box.querySelector('.vy-objectifs__tete').setAttribute('aria-expanded', String(!r));
      try { localStorage.setItem('veylan.objectifs.replie', r ? '1' : '0'); } catch (e) {   }
    });
    this.el.objectifs = box;
    return box;
  }

  majObjectifs() {
    const box = this.objectifs();
    if (!box) return;
    const nd = ((this.combat && this.combat.challenges) || []).filter(Boolean).length, ns = (this._succesCombat || []).length;
    const gestes = this.gestesDuCombat(), ng = gestes.length;
    box.classList.toggle('hidden', !nd && !ns && !ng);
    const sg = box.querySelector('.vy-objectifs__sec--geste');
    sg.hidden = !ng;
    sg.querySelector('.vy-objectifs__gestes').innerHTML = gestes.map(def => `<p class="vy-cle-boss"><b>${Util.esc(def.name)}</b><span>${Util.esc(def.cle)}</span></p>`).join('');
    box.querySelector('.vy-objectifs__sec--defis').hidden = !nd;
    box.querySelector('.vy-objectifs__sec--succes').hidden = !ns;
    box.querySelector('.vy-objectifs__compte').innerHTML = [ng ? `<i class="g">${ng > 1 ? ng + ' gestes' : 'le geste'}</i>` : '', nd ? `<i class="d">${nd} défi${nd > 1 ? 's' : ''}</i>` : '', ns ? `<i class="s">${ns} succès</i>` : ''].join('');
  }

  gestesDuCombat() {
    const c = this.combat;
    if (!c || !Array.isArray(c.entities) || c.phase === 'ended') return [];
    const vus = new Set(), l = [];
    for (const e of c.entities) if (e && e.team === 'monster' && e.alive !== false && e.def && e.def.cle && !vus.has(e.def.id)) { vus.add(e.def.id); l.push(e.def); }
    return l;
  }

  succesDuCombat() {
    const c = this.combat, w = this.world || (c && c.world), ch = w && w.ch;
    if (!ch || typeof Achievements !== 'object' || !c.entities || !c.entities.length || c.phase === 'ended') return [];
    const ids = new Set(c.entities.filter(e => e.team === 'monster' && !e.isSummon && e.def).map(e => e.def.id));
    const boss = [...ids].filter(id => DATA.monsters[id] && DATA.monsters[id].boss);
    const dj = ch.dungeon && ch.dungeon.id;
    const fait = a => (ch.achievements || []).includes(a.id);
    const rang = a => {
      const k = a.cond;
      if (k.type === 'dungeon' && k.dungeon === dj && boss.length) return 1;
      if (k.type === 'dungeonTurns' && k.dungeon === dj && boss.length) return 2;
      if ((k.type === 'bossDefi' || k.type === 'noeudsBoss' || k.type === 'boss') && ids.has(k.monster)) return 3;
      if (k.type === 'kills' && ids.has(k.monster)) return 4;
      if ((k.type === 'famille' || k.type === 'argentes') && (k.monstres || []).some(m => ids.has(m))) return 5;
      return 0;
    };
    const suivis = this.hud && this.hud.succesSuivis ? this.hud.succesSuivis() : [];
    const l = Achievements.defs().filter(a => !fait(a) && Achievements.pourPerso(ch, a)).map(a => ({ a, r: rang(a) || (suivis.includes(a.id) ? 6 : 0) })).filter(x => x.r).sort((x, y) => x.r - y.r);
    return l.slice(0, 5).map(x => x.a);
  }

  renderSuccesCombat() {
    const box = this.objectifs();
    if (!box) return;
    const c = this.combat, w = this.world || (c && c.world), ch = w && w.ch;
    const l = this.succesDuCombat();
    const cle = l.map(a => a.id + ':' + (ch ? Achievements.progress(ch, a) : '')).join('|') + '|' + (c && c.round);
    if (cle === this._cleSucces) { this.majObjectifs(); return; }
    this._cleSucces = cle; this._succesCombat = l;
    const zone = box.querySelector('.vy-succes-combat');
    const ICO = {
      dungeon: '<path d="M4 9l3 4 5-7 5 7 3-4-2 9H6z"/>', boss: '<path d="M4 9l3 4 5-7 5 7 3-4-2 9H6z"/>',
      dungeonTurns: '<path d="M7 3h10M7 21h10M8 3c0 5 8 5 8 9s-8 4-8 9M16 3c0 5-8 5-8 9"/>',
      bossDefi: '<path d="M12 2l3 7h7l-5.5 4.5L18.5 21 12 16.5 5.5 21l2-7.5L2 9h7z"/>',
      noeudsBoss: '<path d="M5 12c0-3 3-5 7-5s7 2 7 5-3 5-7 5"/><path d="M12 17l-3 3M12 17l-3-3"/>',
      kills: '<path d="M14 3l7 7-3 3-7-7z"/><path d="M11 6l-7 11 3 3 11-7"/>',
      famille: '<circle cx="8" cy="9" r="2"/><circle cx="16" cy="9" r="2"/><path d="M8 19c0-3 2-4 4-4s4 1 4 4z"/>',
      argentes: '<path d="M12 3l8 6-8 12L4 9z"/><path d="M4 9h16M12 3v18"/>',
    };
    const picto = a => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICO[a.cond.type] || '<path d="M12 3l7 3v6c0 4-3 7-7 9-4-2-7-5-7-9V6z"/>'}</svg>`;
    zone.innerHTML = l.map(a => {
      const v = ch ? Achievements.avancement(ch, a) : null, prog = ch ? Achievements.progress(ch, a) : '';
      const k = a.cond, tours = k.type === 'dungeonTurns' && c ? `Tour ${Math.max(1, c.round || 1)} sur ${k.max} au plus.` : '';
      return `<span class="vy-defi vy-defi--succes" data-succes="${Util.esc(a.id)}">` +
        `<span class="vy-defi__ic">${picto(a)}${v && v[1] > 1 ? `<i class="vy-defi__jauge"><i style="width:${Math.round(100 * Math.min(v[0], v[1]) / v[1])}%"></i></i>` : ''}</span>` +
        (v && v[1] > 1 ? `<b class="vy-defi__bonus">${Math.min(v[0], v[1])}/${v[1]}</b>` : '') +
        `<span class="vy-defi__bulle" role="tooltip"><b>${Util.esc(a.name)}</b><span>${Util.esc(a.desc)}</span>${tours || (prog && prog !== '0 / 1') ? `<small>${Util.esc([tours, prog && prog !== '0 / 1' ? 'Avancement : ' + prog : ''].filter(Boolean).join(' · '))}</small>` : ''}</span></span>`;
    }).join('');
    this.majObjectifs();
  }

  static texteDefis(combat) {
    const defis = ((combat && combat.challenges) || []).filter(Boolean);
    if (!defis.length) return '';
    const ch = combat.world && combat.world.ch, mode = (ch && ch.bonusDefi) || (typeof window === 'object' && window.VEYLAN && window.VEYLAN.world && window.VEYLAN.world.ch && window.VEYLAN.world.ch.bonusDefi);
    const vers = mode === 'xp' ? ' (bonus doublé, en XP seulement)' : mode === 'butin' ? ' (bonus doublé, en butin seulement)' : '';
    return defis.map(c => `${defis.length > 1 ? 'Défi' : 'Défi'} : ${c.name}. ${c.desc}${c.failed ? ' (raté : ' + c.failed + ')' : c.success ? ' (réussi)' : ` +${c.bonus} %`}`).join('  ') + vers;
  }

  describeEffect(f) {
    const t = f.turns === 0 ? 'ce tour' : (f.turns >= 99 ? 'permanent' : `${f.turns} t.`);
    switch (f.type) {
      case 'armor': return f.turns >= 99 ? `armure ${f.value} %` : `armure ${f.value} % (${t})`;
      case 'shield': return `bouclier ${f.value} (${t})`;
      case 'power': return `${f.value < 0 ? '−' + -f.value : '+' + f.value} % dégâts (${t})`;
      case 'vuln': return `+${f.value} % subis (${t})`;
      case 'dot': return `brûlure ${f.value} ${DATA.elements[f.element].label.toLowerCase()} (${t})`;
      case 'guard': return `garde −${f.value} % au contact (${t})`;
      case 'range': return `${f.value < 0 ? '−' + -f.value : '+' + f.value} portée (${t})`;
      case 'echo': return `écho, ${f.uses} résonance(s) (${t})`;
      case 'cumulSort': return `${(DATA.spells[f.spell] || {}).name || f.spell} : +${f.crans * ((DATA.spells[f.spell] || {}).cumul || { par: 0 }).par} % (${t})`;
      case 'soinDiffere': return `soin de ${f.owner ? Util.esc(f.owner.name) : '?'} au début de son tour`;
      case 'traque': return `Traque de ${f.owner ? Util.esc(f.owner.name) : '?'}, ${f.crans} / 3 (+${f.crans * 8} % subis, ${t})`;
      case 'filon': return `Filon de ${f.owner ? Util.esc(f.owner.name) : '?'}, ${f.charges} déclenchement(s) (${t})`;
      case 'state': {
        { const E = DATA.etats && DATA.etats[f.name]; if (E && f.name !== 'invisible') return `${E.nom.toLowerCase()} : ${E.desc} (${t})`; }
        const names = { tenu: 'porté par le Thalor', invisible: 'invisible', stunned: 'sonné', invulnerable: 'invulnérable', lanterne: 'tient sa lanterne (esquive à distance)', assise: 'ancré comme la montagne (rien ne le déplace, ses prises portent une case de plus, vole de la vie au contact)', unhealable: 'insoignable', rayonnant: 'Rayonnant (+15 % de soins reçus)', forme_iskar: 'Forme Nocturne (40 % des soins seulement)', intaclable: 'intaclable', protege: 'protégé (le Velmar prend ses coups)', digue: 'Carapace Close (invulnérable au contact)', brise_lames: 'Bouclier à Rouage (invulnérable à distance)' };
        if (f.name === 'provoked') return `provoqué par ${f.by ? Util.esc(f.by.name) : '?'} (${t})`;
        if (f.name === 'sworn') return `juré par ${f.by ? Util.esc(f.by.name) : '?'} (${t})`;
        if (f.name === 'tracked') return `traqué par ${f.by ? Util.esc(f.by.name) : '?'} (${t})`;
        return `${names[f.name] || f.name} (${t})`;
      }
      case 'pm': if (f.value <= -10) return `enraciné (${t})`;
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
    if (c.phase === 'battle' && p && this.lastHp != null && p.hp < this.lastHp) Bus.emit('hpLoss', { hp: p.hp, max: p.hpMax });
    this.lastHp = p ? p.hp : null;

    const kit = [];
    if (p.kit && p.kit.fury) kit.push(`Fureur ${p.fury} / ${p.kit.fury.max}${p.kit.fury.power ? ` (+${(p.fury || 0) * p.kit.fury.power} %)` : ''}`);
    if (p.kit && p.kit.reserve) kit.push(`${p.kit.reserve.nom} ${p.reserve || 0} / ${p.kit.reserve.max}`);
    { const sc = c.sangChaud(p); if (sc.palier) kit.push(`Sang Noir : ${sc.nom} (+${sc.pct} %, −${sc.pct} % subis)`); }
    if (p.kit && p.kit.summonGauge) { const used = c.summonsOf(p).reduce((n, m) => n + (m.def.summonCost || 1), 0); kit.push(`Jauge ${used} / ${c.jaugeDe(p)}${p.horde ? ' (horde)' : ''}`); }
    if (p.kit && p.kit.pli) kit.push(`Pli ${p.piegesPli || 0} / ${p.kit.pli.max || 5}`);
    { const af = c.affutDe(p); if (af.pct > 0) kit.push(`Affût +${af.pct} %${af.range ? `, +${af.range} PO` : ''}`); }
    if (p.kit && p.kit.traque) { const cible = c.entities.find(x => x.alive && c.traqueDe(p, x)); if (cible) kit.push(`Traque ${c.traqueDe(p, cible).crans} / ${p.kit.traque.max} (${Util.esc(cible.name)})`); }
    if (p.kit && p.kit.braise) kit.push(`Soif ${c.braiseOf(p)} / ${p.kit.braise.max}${c.braiseOf(p) >= p.kit.braise.surchauffe ? ' (dévorante)' : ''}`);
    if (p.veille) kit.push(p.veille === 'aube' ? 'Aube (soins +10 %, Rayonnant)' : 'Crépuscule (+15 % de vol de vie)');
    if (p.veille && p.astre) kit.push(`Astre : ${{ feu: 'le Soleil', eau: 'la Lune', air: 'les Étoiles', terre: 'les Astres tombés' }[p.astre] || p.astre}`);
    if (c.isArmed(p)) kit.push(`armé (−${p.kit.armed.reduction} % subis)`);
    const effects = kit.concat(p.effects.map(f => this.describeEffect(f))).join(', ');
    this.effetsTexte = effects;
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
      if (id === 'empoigne' || id === 'prise_ferme') {
        const sort = c.spellOf(id, p);
        b.querySelector('.name').textContent = sort.name;
        b.querySelector('.cost').textContent = `${sort.pa} PA`;
        b.setAttribute('aria-label', `${sort.name}, ${sort.pa} PA`);
      }
      const st = c.spellState(p, id);
      b.classList.toggle('selected', this.selectedSpell === id);
      b.classList.toggle('disabled', !playerTurn || !st.ok);
      const cd = p.cooldowns[id] || 0;
      b.querySelector('.cd').textContent = cd > 0 ? cd : '';
    }
    const app = typeof document !== 'undefined' ? document.getElementById('app') : null;
    if (app) app.classList.toggle('vy-sort-choisi', !!this.selectedSpell && playerTurn);

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
    if (this.apresRefresh) this.apresRefresh();
  }

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
    if (this.apresChrono) {
      const total = c.phase === 'placement' ? (this.placementEndsAt && this.placementSeconds) || null : c.phase === 'battle' ? c.turnSeconds : null;
      this.apresChrono(left, total);
    }
    if (c.phase === 'placement' && this.el.round) this.el.round.textContent = this.placementEndsAt ? `Placement · ${txt}` : 'Placement';
  }

  static chrono(s) { return `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`; }


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
    this.brancherFrise(tb.querySelector('.vy-barre-tour__liste'));
    this.el.stage.appendChild(tb);
    this.timelineHtml = null;
    if (this.combat.player) this.refresh();
  }

  renderTimeline() {
    const c = this.combat, p = c.player;
    const order = (c.phase === 'placement' ? c.ordreDesTours() : c.order).filter(e => e.alive);
    const painter = this.renderer && (this.renderer.painter || this.renderer);
    const html = order.map((e, k) => {
      const hidden = !c.canSee(p, e);
      const hp = Math.max(0, Math.min(1, e.hp / e.hpMax));
      const team = e.team === 'player' ? 'allie' : 'ennemi';
      const img = hidden ? '' : `<img src="${UI.buste(painter, e)}" alt="" draggable="false">`;
      const title = hidden ? 'Quelque chose d\'invisible' : `${e.name}, niveau ${e.level} · ${e.hp} / ${e.hpMax} PV`;
      return `<div class="vy-combattant vy-combattant--${team}${e === c.actor ? ' actuel' : ''}${e.isSummon && !e.ally ? ' invoc' : ''}${hidden ? ' cache' : ''}" title="${Util.esc(title)}" data-id="${e.id}" style="--v:${hp.toFixed(3)}">${img}<span class="vy-combattant__pv" aria-hidden="true"></span><i class="vy-combattant__n" aria-hidden="true">${k + 1}</i></div>`;
    }).join('');
    if (this.timelineHtml === html) return;
    this.timelineHtml = html;
    this.el.timeline.innerHTML = html;
    if (this.el.turnBar) this.el.turnBar.querySelector('.vy-barre-tour__liste').innerHTML = html;
    const id = this.viseId; this.viseId = null;
    if (id) this.majVise(c.entities.find(x => String(x.id) === id) || null);
  }

  static buste(painter, e) {
    const figure = e.team === 'monster' && e.def && typeof Figures === 'object' ? Figures.de(e.def.id) : null;
    const key = [e.shape, e.color, e.glyph || '', e.team, e.def && e.def.look || '', e.team === 'monster' && typeof Renderer === 'function' ? Renderer.motifOf(e.def.id) || '' : '', figure ? Figures.cle(figure) : ''].join('|');
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
    halo.addColorStop(0, e.team === 'player' ? 'rgba(82,210,244,0.28)' : 'rgba(239,117,116,0.26)'); halo.addColorStop(1, 'rgba(0,0,0,0)');
    g.fillStyle = halo; g.fillRect(0, 0, W, H);
    const imFig = figure ? Figures.image(figure) : null;
    if (imFig) {
      const h = H * 0.7, w = h * imFig.naturalWidth / imFig.naturalHeight;
      g.drawImage(imFig, (W - w) / 2, H - h - H * 0.12, w, h);
    } else if (painter && typeof painter.drawBody === 'function') {
      const s = { shape: e.shape, color: e.color, glyph: e.glyph, team: e.team, look: e.def && e.def.look, motif: e.team === 'monster' && typeof Renderer === 'function' ? Renderer.motifOf(e.def.id) : null, figure };
      g.save();
      g.translate(W / 2, H + 12);
      g.scale(1.12, 1.12);
      g.lineJoin = 'round'; g.lineCap = 'round';
      try { const peinte = painter.drawBody(g, { x: 0, y: 0 }, s) === 'figure'; if (s.motif && !peinte) painter.drawMotif(g, { x: 0, y: 0 }, s); } catch (err) {   }
      g.restore();
    }
    const url = cv.toDataURL('image/png');
    cache.set(key, url);
    return url;
  }

  static geste(def, court) {
    if (!def || !def.cle) return '';
    return `<p class="vy-cle-boss${court ? ' vy-cle-boss--court' : ''}"><b>Le geste</b><span>${Util.esc(def.cle)}</span></p>`;
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
      return `<li>${typeof Daltonien === 'object' ? Daltonien.signe(s.element) : ''}<span style="color:${DATA.elements[s.element].color}">${s.name}</span> <span class="muted">${s.pa} PA · ${s.target === 'self' ? 'soi' : s.range[0] + '-' + s.range[1]}</span> ${what}</li>`;
    }).join('');
    const effects = e.effects.map(f => this.describeEffect(f)).join(', ');
    const tags = [];
    if (e.boss) tags.push('boss');
    if (e.isSummon) tags.push(`invocation${e.owner ? ' de ' + e.owner.name : ''}`);
    if (e.ghost) tags.push('traverse les rochers');
    if (e.immuneElement) tags.push(`immunisé : ${DATA.elements[e.immuneElement].label.toLowerCase()}`);
    this.el.inspect.innerHTML =
      `<h3 style="color:${e.color}">${Util.esc(e.name)}${e.def.title ? ` <small>${Util.esc(e.def.title)}</small>` : ''} <small>niveau ${e.level}</small></h3>` +
      UI.geste(e.def) +
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
    if (UI.reglage('journalTours') && this.combat) { this.journalParTours(line); return; }
    this.el.log.prepend(line);
    while (this.el.log.children.length > 80) this.el.log.lastChild.remove();
  }

  journalParTours(line) {
    const c = this.combat, log = this.el.log, J = this.journal || (this.journal = { tour: null, bloc: null });
    const e = c.order && c.turnIndex >= 0 ? c.order[c.turnIndex] : null;
    const tour = c.round || 0;
    if (!J.tour || J.tour.n !== tour || !J.tour.el.isConnected) {
      const el = document.createElement('section');
      el.className = 'vy-journal__tour';
      el.innerHTML = `<header>${tour ? `Tour ${tour}` : 'Placement'}</header><div class="vy-journal__corps"></div>`;
      log.prepend(el);
      J.tour = { n: tour, el, corps: el.lastChild };
      J.bloc = null;
    }
    const qui = e && e.alive !== undefined ? e : null;
    if (!J.bloc || J.bloc.qui !== qui || !J.bloc.el.isConnected) {
      const el = document.createElement('div');
      const equipe = qui ? (qui.team === 'player' ? 'allie' : 'ennemi') : 'neutre';
      el.className = `vy-journal__bloc vy-journal__bloc--${equipe}`;
      if (qui && qui.color) el.style.setProperty('--c', qui.color);
      el.innerHTML = `<b class="vy-journal__qui"></b><div class="vy-journal__lignes"></div>`;
      el.firstChild.textContent = qui ? qui.name : 'Combat';
      J.tour.corps.prepend(el);
      J.bloc = { qui, el, lignes: el.lastChild };
    }
    J.bloc.lignes.prepend(line);
    const toutes = log.querySelectorAll('.line');
    for (let i = toutes.length - 1; i >= 80; i--) {
      const l = toutes[i], b = l.closest('.vy-journal__bloc'), t = l.closest('.vy-journal__tour');
      l.remove();
      if (b && !b.querySelector('.line')) b.remove();
      if (t && !t.querySelector('.line')) t.remove();
    }
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

UI.PLACEMENT_SECONDES = 30;

UI.REGLAGES = { grille: true, deplacement: true, portee: true, cout: true, barres: true, agression: true, finDonjon: true, journalTours: false, rappels: true };

UI.ICON = {
  non: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" aria-hidden="true"><path d="M6.5 6.5l11 11M17.5 6.5l-11 11"/></svg>',
  oui: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12.5l4.5 4.5L19 7"/></svg>',
  pa: '<svg class="vy-sceau-pa" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2.2l8.5 4.9v9.8L12 21.8l-8.5-4.9V7.1z" fill="#ddaa72" stroke="#a67349" stroke-width="1.4" stroke-linejoin="round"/><path d="M12 5.4l5.7 3.3v6.6L12 18.6l-5.7-3.3V8.7z" fill="#f2dcaa"/><path d="M12 5.4l5.7 3.3L12 12 6.3 8.7z" fill="#fff3d2" opacity="0.7"/></svg>',
};


