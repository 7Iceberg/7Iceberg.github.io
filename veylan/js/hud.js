// Interface du monde : barre du personnage, boutons, suivi de quêtes, panneaux (personnage,
// sac, quêtes, succès, menu, dialogue, boutique, atelier, relais, fin de combat). L'accueil et
// la création de personnage sont dans js/accueil.js. Tout passe par le DOM ; le monde et le
// combat n'en savent rien.
class Hud {
  constructor(world, combat, renderer, ui) {
    this.world = world;
    this.combat = combat;
    this.renderer = renderer;
    this.ui = ui;
    const $ = sel => document.querySelector(sel);
    this.el = {
      app: $('#app'), playerBar: $('#player-bar'), tracker: $('#tracker'), mapName: $('#map-name'),
      toasts: $('#toasts'), panel: $('#panel'), panelTitle: $('#panel-title'),
      panelBody: $('#panel-body'), panelClose: $('#panel-close'), ready: $('#ready'),
    };
    this.actions = {};
    this.dialogue = null;
    this.initFenetres();
    this.initFaction();
    if (this.initVeille) this.initVeille();
    this.el.panelClose.addEventListener('click', () => this.closePanel());
    window.addEventListener('keydown', evt => { if (evt.key === 'Escape' && !this.el.panel.classList.contains('hidden')) this.closePanel(); });
    window.addEventListener('beforeunload', () => Save.write(this.world.ch));
    document.addEventListener('visibilitychange', () => { if (document.hidden) Save.write(this.world.ch); });
    this.el.panelBody.addEventListener('click', evt => {
      const b = evt.target.closest('[data-act]');
      if (!b) return;
      const fn = this.actions[b.dataset.act];
      if (fn) fn(b.dataset, b);
    });
    const w = world;
    // Sur l'île, passer d'une sous-zone à l'autre en marchant (`secteur`) change seulement le nom.
    w.on('map', d => {
      if (!d.secteur) this.setMode('explore');
      // La zone dans un span : une fenêtre étroite (901 à 1180 px) ne garde que la sous-zone (css/style.css).
      this.el.mapName.innerHTML = `${d.zone ? `<span class="zone">${Util.esc(d.zone.name)} · </span>` : ''}${Util.esc(d.def.name)}`;
      this.refresh();
    });
    w.on('update', () => this.refresh());
    w.on('hp', () => this.refreshBar());
    // Délégation unique pour les champs des panneaux (titre, répartition auto).
    this.el.panelBody.addEventListener('change', evt => {
      if (evt.target.id === 'title-select') { const v = evt.target.value; this.world.ch.title = this.world.ch.titles.includes(v) ? v : null; this.refreshBar(); }
      if (evt.target.dataset.act === 'auto') this.world.ch.autoStats = evt.target.checked;
    });
    window.addEventListener('keydown', evt => {
      if (this.el.panel.dataset.open === 'fightEnd' && (evt.key === 'Enter' || evt.key === ' ')) { evt.preventDefault(); this.closePanel(); }
    });
    w.on('toast', t => this.toast(t));
    // Sur l'île d'Ervane : le bandeau d'une sous-zone à l'entrée (et à l'arrivée sur le plateau), la
    // sous-zone trop forte annoncée sur le chemin, le texte d'un panneau.
    w.on('zone', d => this.annoncerZone(d));
    w.on('map', d => {
      // Une salle de donjon, ou la sortie du donjon : les toasts du combat précédent s'effacent.
      if (d && !d.secteur && !d.apresCombat && ((w.ch && w.ch.dungeon) || this.enDonjon)) this.viderToasts();
      this.enDonjon = !!(w.ch && w.ch.dungeon);
      if (d && d.plateau && !d.secteur && !d.apresCombat) this.annoncerZone({ map: d.mapId, zone: d.zone, nouveau: false });
    });
    w.on('zoneProche', d => this.toast(`Attention : ${d.nom}, niveau ${d.niveau[0]}${d.niveau[1] !== d.niveau[0] ? ' à ' + d.niveau[1] : ''}. Plus fort que toi.`));
    w.on('panneau', d => this.toast(d.texte));
    w.on('dialogue', ctx => this.openDialogue(ctx));
    // Un combat qui part ferme le panneau et toutes les fenêtres (Sorts, Sac...), sans demander : sur
    // l'île, une figure visible à côté d'une fenêtre ouverte lançait le combat sous elle (revue finale).
    w.on('fight', () => { this.closePanel(); this.fermerFenetres(); this.setMode('combat'); this.ui.refresh(); this.ui.updateHighlights(); });
    w.on('fightEnd', r => this.openFightEnd(r));
    w.on('reward', r => this.openReward(r));
    w.on('achievement', g => this.annoncerSucces(g));
    w.on('relay', d => this.openRelay(d));
    w.on('dungeonPrompt', d => this.openDungeonPrompt(d));
    w.on('dungeonLeavePrompt', d => this.openDungeonLeave(d));
    // L'avancement des quêtes s'écrit dans la discussion (« Quête mise à jour ») et le suivi.
    w.on('questProgress', () => this.refresh());
    w.on('save', () => Save.write(w.ch));
    // La discussion, les dialogues de PNJ, l'interface de jeu du téléphone et le tutoriel
    // (js/discussion.js, js/dialogues.js, js/hud-jeu.js, js/guide.js).
    this.discussion = new Discussion(this);
    this.conversation = new Conversation(this);
    this.jeu = new HudJeu(this);
    this.guide = new Guide(this);
  }

  setMode(mode) {
    this.el.app.classList.toggle('mode-explore', mode === 'explore');
    this.el.app.classList.toggle('mode-combat', mode === 'combat');
    this.ui.hideBanner();
  }

  // ----- Barre et suivi -----

  refresh() {
    this.refreshBar();
    if (this.el.panel.dataset.open && this.panelRefresh) this.panelRefresh();
  }

  refreshBar() {
    const ch = this.world.ch;
    const d = ch.derived();
    const cls = ch.classDef;
    const xp = Math.round(ch.xpProgress() * 100);
    const xpText = ch.level >= Character.MAX_LEVEL ? 'niveau maximum' : xp + ' %';
    // On ne reconstruit la barre que si le texte change ; sinon les jauges glissent vers la
    // nouvelle valeur (la perte de PV reste visible un instant).
    const sig = [ch.name, cls.id, ch.level, ch.title, ch.fils, ch.statPoints, d.hpMax].join('|');
    const bar = this.el.playerBar;
    if (this.barSig !== sig || !bar.querySelector('.vy-jauge')) {
      this.barSig = sig;
      bar.innerHTML =
        `<div class="portrait" style="--c:${cls.color}">${cls.glyph}</div>` +
        `<div class="pb-main"><div class="pb-name">${esc(ch.name)} <small>${cls.name} · niveau ${ch.level}${ch.title ? ' · ' + esc(ch.title) : ''}</small></div>` +
        Util.jauge('vie', ch.hp, d.hpMax, `${ch.hp} / ${d.hpMax}`, 'Points de vie') +
        Util.jauge('xp', xp, 100, null, 'Expérience', 'vy-jauge--fine') + `</div>` +
        `<div class="pb-fils">${ch.fils} <small>Fils</small>${ch.statPoints ? `<div class="pts">+${ch.statPoints} pts</div>` : ''}</div>`;
    } else {
      Util.setJauge(bar.querySelector('.vy-jauge--vie'), ch.hp, d.hpMax, `${ch.hp} / ${d.hpMax}`);
      Util.setJauge(bar.querySelector('.vy-jauge--xp'), xp, 100);
    }
    bar.querySelector('.vy-jauge--xp').title = 'Expérience : ' + xpText;
    const tr = Quests.tracker(ch).slice(0, 3);
    this.el.tracker.innerHTML = tr.map(t => `<div class="tq${t.quest.main ? ' main' : ''}${t.done ? ' done' : ''}"><b>${esc(t.quest.name)}</b><span>${esc(t.text)}</span></div>`).join('');
  }


  // Vide la pile des toasts (les gains du combat précédent ne traînent pas d'une salle du donjon à
  // l'autre, ni jusqu'à la sortie) ; le journal les garde.
  viderToasts() {
    if (!this.el.toasts) return;
    for (const t of [...this.el.toasts.children]) t.remove();
  }

  toast(text) {
    if (this.pushJournal) this.pushJournal('evenements', text);
    const t = document.createElement('div');
    t.className = 'toast';
    t.textContent = text;
    this.el.toasts.appendChild(t);
    while (this.el.toasts.children.length > 4) this.el.toasts.firstChild.remove();
    setTimeout(() => { t.classList.add('out'); setTimeout(() => t.remove(), 400); }, 2800);
  }

  // « Succès débloqué » : une carte au contour d'or, la coupe dans une tuile, ce qu'il rapporte.
  // Le texte passe aussi au journal, comme un toast.
  annoncerSucces(g) {
    const a = g.achievement, texte = `Succès : ${a.name}${g.title ? ' · titre « ' + g.title + ' »' : ''}`;
    if (this.pushJournal) this.pushJournal('evenements', texte);
    const gains = [g.xp ? `+${g.xp} XP` : '', g.fils ? `+${g.fils} Fils` : '', g.title ? `« ${g.title} »` : ''].filter(Boolean);
    const t = document.createElement('div');
    t.className = 'toast toast--succes';
    t.setAttribute('role', 'status');
    t.innerHTML = `<span class="toast__tuile" aria-hidden="true">${Fenetres.ICON.succes}</span><span class="toast__texte"><small>Succès débloqué</small><b>${esc(a.name)}</b></span>${gains.length ? `<span class="toast__gain">${esc(gains[0])}</span>` : ''}`;
    t.setAttribute('aria-label', texte);
    this.el.toasts.appendChild(t);
    while (this.el.toasts.children.length > 4) this.el.toasts.firstChild.remove();
    setTimeout(() => { t.classList.add('out'); setTimeout(() => t.remove(), 400); }, 4200);
  }

  // ----- Panneaux génériques -----

  openPanel(id, title, html, refresh) {
    this.el.panel.dataset.open = id;
    this.el.panelTitle.textContent = title;
    this.el.panelBody.innerHTML = html;
    this.el.panel.classList.remove('hidden');
    this.setInert(true);
    this.panelRefresh = refresh || null;
    if (this.world.state === 'explore') this.world.state = 'panel';
  }

  // Toutes les fenêtres, fermées sans demander (un combat qui part).
  fermerFenetres() {
    if (!this.fen) return;
    for (const id of [...this.fen.wins.keys()]) this.fen.close(id, true);
  }

  closePanel() {
    // Un dialogue de PNJ ouvert hors du panneau (bulle et réponses) se ferme aussi.
    if (this.el.panel.classList.contains('hidden')) { if (this.conversation && this.conversation.ouverte) this.conversation.fermer(); return; }
    const id = this.el.panel.dataset.open;
    this.el.panel.classList.add('hidden');
    this.el.panel.dataset.open = '';
    this.panelRefresh = null;
    this.setInert(false);
    if (id === 'dialogue') this.world.endDialogue();
    else if (id === 'fightEnd') {
      this.world.resume();
      this.setMode(this.world.showCombat ? 'combat' : 'explore');
      this.ui.hideBanner();
      this.ui.selectedSpell = null;
      this.ui.updateHighlights();
    } else if (this.world.state === 'panel') this.world.closePanel();
  }

  setInert(on) {
    for (const sel of ['#explore-hud', '#hud', '#topbar', '#side']) { const el = document.querySelector(sel); if (el) el.inert = !!on; }
  }

  // ----- Personnage -----

  // Personnage : la fenêtre Caractéristiques et la fenêtre Personnage, côte à côte.
  openCharacter() { this.openCaracs(); this.openPerso(); }

  openCharacterPanel() {
    const render = () => {
      const ch = this.world.ch;
      const d = ch.derived();
      const cls = ch.classDef;
      const statRows = Items.STATS.map(k => {
        const base = ch.stats[k], total = d.stats[k] || 0;
        const can = ch.statPoints >= (k === 'vita' ? 1 : (ch.stats[k] >= 100 ? 2 : 1));
        return `<div class="row stat-row"><span>${Items.STAT_LABEL[k]}</span><span><b>${total}</b>${total !== base ? ` <small>(${base} + ${total - base})</small>` : ''}</span>` +
          `<span class="btns"><button data-act="alloc" data-stat="${k}" data-n="1" ${can ? '' : 'disabled'}>+1</button><button data-act="alloc" data-stat="${k}" data-n="5" ${can ? '' : 'disabled'}>+5</button></span></div>`;
      }).join('');
      const slots = Items.EQUIP_SLOTS.map(slot => {
        const id = ch.equipment[slot];
        const def = id ? Items.get(id) : null;
        const label = { coiffe: 'Coiffe', cape: 'Cape', amulette: 'Amulette', anneau1: 'Anneau', anneau2: 'Anneau', ceinture: 'Ceinture', bottes: 'Bottes', arme: 'Arme' }[slot];
        return `<div class="row slot"><span class="muted">${label}</span>${def ? `<span><b>${esc(def.name)}</b> <small>niv. ${def.level}</small><br><small>${Items.statLines(def.stats).join(', ')}</small></span><button data-act="unequip" data-slot="${slot}">Retirer</button>` : '<span class="muted">vide</span><span></span>'}</div>`;
      }).join('');
      const sets = d.setBonuses.map(b => `<div class="muted">${esc(b.set.name)} (${b.count}/${b.set.pieces.length}) : ${Items.statLines(b.stats).join(', ')}</div>`).join('');
      const titles = ch.titles.length ? `<div class="row"><span>Titre</span><select data-act="title" id="title-select">${['<option value="">aucun</option>'].concat(ch.titles.map(t => `<option ${ch.title === t ? 'selected' : ''}>${esc(t)}</option>`)).join('')}</select></div>` : '';
      return `<div class="cols"><div>
        <h3 style="color:${cls.color}">${esc(ch.name)} <small>${cls.name}, ${cls.title}</small></h3>
        <div class="row"><span>Niveau ${ch.level}</span><span>${ch.level >= Character.MAX_LEVEL ? 'maximum' : `${ch.xp} / ${Character.xpToNext(ch.level)} XP`}</span></div>
        <div class="row"><span>PV</span><b>${ch.hp} / ${d.hpMax}</b></div>
        <div class="row"><span>PA · PM</span><b>${d.pa} · ${d.pm}</b></div>
        <div class="row"><span>Initiative · Critique</span><b>${d.initiative} · ${d.crit} %</b></div>
        ${titles}
        <h4>Caractéristiques <small class="muted">${ch.statPoints} point(s) à répartir</small></h4>
        ${statRows}
        <div class="row"><label><input type="checkbox" data-act="auto" ${ch.autoStats ? 'checked' : ''}> Répartition automatique (${Items.STAT_LABEL[cls.mainStat]})</label>${ch.statPoints ? '<button data-act="autonow">Répartir maintenant</button>' : ''}</div>
        <p class="muted">${esc(cls.desc)}</p>
      </div><div>
        <h4>Équipement</h4>${slots}
        ${sets ? `<h4>Bonus de panoplie</h4>${sets}` : ''}
        ${this.knotsSection(ch)}
        <h4>Sorts</h4><div class="muted">${ch.unlockedSpells().map(id => esc(DATA.spells[id].name)).join(', ')}${ch.level < Character.MAX_LEVEL ? `<br>Prochain sort au niveau ${nextUnlock(ch)}` : ''}</div>
      </div></div>`;
    };
    const nextUnlock = ch => { const u = ch.classDef.spells.map((id, i) => DATA.spells[id].unlock || Character.UNLOCK[i]).filter(l => l > ch.level); return u.length ? Math.min(...u) : '-'; };
    this.actions.alloc = d => { this.world.ch.allocate(d.stat, Number(d.n)); this.world.emit('update'); };
    this.actions.unequip = d => { this.world.ch.unequip(d.slot); this.world.emit('update'); };
    this.actions.auto = (d, b) => { this.world.ch.autoStats = b.checked; };
    this.actions.autonow = () => { this.world.ch.autoAllocate(); this.world.emit('update'); };
    this.openPanel('character', 'Personnage', render(), () => { this.el.panelBody.innerHTML = render(); });
  }

  // ----- Sac -----

  // Sac : grille de cases au code couleur de rareté (css/components.css, .vy-inventaire), et la
  // fiche de l'objet choisi avec ses actions.
  openInventory(opts) {
    opts = opts || {};
    if (!opts.sell) return this.openSac();
    this.invTab = this.invTab || 'equip';
    const render = () => {
      const ch = this.world.ch;
      const entries = Object.entries(ch.inventory).map(([id, n]) => ({ def: Items.get(id), id, n })).filter(e => e.def);
      const groups = { equip: entries.filter(e => e.def.kind === 'equip' || e.def.kind === 'weapon'), conso: entries.filter(e => e.def.kind === 'consumable' || e.def.kind === 'knot'), res: entries.filter(e => e.def.kind === 'resource') };
      const tabs = [['equip', 'Équipement'], ['conso', 'Consommables'], ['res', 'Ressources']].map(([k, l]) => `<button class="tab${this.invTab === k ? ' on' : ''}" data-act="tab" data-tab="${k}" aria-pressed="${this.invTab === k}">${l} (${groups[k].length})</button>`).join('');
      const list = groups[this.invTab].sort((a, b) => (a.def.level || 0) - (b.def.level || 0) || a.def.name.localeCompare(b.def.name));
      if (!list.some(e => e.id === this.invSel)) this.invSel = list.length ? list[0].id : null;
      const knots = ch.activeKnots();
      const cells = list.map(e => {
        const d = e.def, r = Items.rarity(d);
        const locked = (d.kind === 'equip' || d.kind === 'weapon') && !ch.canEquip(e.id).ok;
        return `<button class="vy-case${locked ? ' vy-case--bloquee' : ''}" data-rarete="${r}" data-act="pick" data-id="${e.id}" role="option" aria-selected="${e.id === this.invSel}" aria-label="${esc(d.name)}, ${Items.RARITY_LABEL[r].toLowerCase()}${e.n > 1 ? ', ' + e.n + ' exemplaires' : ''}" title="${esc(d.name)}">` +
          `<span class="vy-case__icone">${Hud.picto(d)}</span>` +
          (d.level > 1 ? `<span class="vy-case__niveau">${d.level}</span>` : '') +
          (e.n > 1 ? `<span class="vy-case__nombre">${e.n}</span>` : '') +
          (knots.includes(e.id) ? '<span class="vy-case__porte" title="Noué"></span>' : '') + `</button>`;
      });
      // Des cases vides complètent la dernière rangée : le sac se lit comme un sac.
      const empty = Math.max(0, Math.max(12, Math.ceil(cells.length / 6) * 6) - cells.length);
      for (let i = 0; i < empty; i++) cells.push('<span class="vy-case vy-case--vide" aria-hidden="true"></span>');
      const sel = list.find(e => e.id === this.invSel);
      const detail = sel ? this.itemCard(sel, opts) : `<div class="vy-objet"><p class="muted">${this.invTab === 'res' ? 'Les ressources tombent des monstres et se récoltent sur les cartes.' : 'Rien ici pour l\'instant.'}</p></div>`;
      return `<div class="tabs" role="tablist">${tabs}</div><div class="sac"><div class="vy-inventaire" role="listbox" aria-label="Contenu du sac">${cells.join('')}</div>${detail}</div>`;
    };
    const rerender = () => { this.el.panelBody.innerHTML = render(); };
    this.actions.tab = d => { this.invTab = d.tab; this.invSel = null; rerender(); };
    this.actions.pick = d => { this.invSel = d.id; rerender(); const b = this.el.panelBody.querySelector(`.vy-case[data-id="${d.id}"]`); if (b) b.focus({ preventScroll: true }); };
    this.actions.equip = d => { this.world.equip(d.id); };
    this.actions.use = d => { this.world.useItem(d.id); };
    this.actions.knot = d => { const r = this.world.ch.toggleKnot(d.id); if (!r.ok) this.toast(r.reason); this.world.emit('update'); };
    this.actions.sell = d => { this.world.sell(d.id, 1); };
    this.openPanel(opts.sell ? 'shop' : 'inventory', opts.sell ? 'Vendre' : 'Sac', render(), rerender);
  }

  // Fiche d'un objet du sac : rareté, emplacement, niveau, effets, récit, actions.
  itemCard(e, opts) {
    const ch = this.world.ch;
    const d = e.def, r = Items.rarity(d);
    const kindLabel = d.kind === 'weapon' ? (Items.WEAPON_TYPES[d.type] || {}).label || 'Arme' : d.kind === 'equip' ? d.slot.charAt(0).toUpperCase() + d.slot.slice(1) : d.kind === 'knot' ? 'Nœud' : d.kind === 'consumable' ? 'Consommable' : 'Ressource';
    let btns = '';
    if (d.kind === 'equip' || d.kind === 'weapon') { const c = ch.canEquip(e.id); btns = `<button class="vy-bouton vy-bouton--primaire" data-act="equip" data-id="${e.id}" ${c.ok ? '' : 'disabled title="' + esc(c.reason) + '"'}>Équiper</button>`; if (!c.ok) btns += `<span class="muted">${esc(c.reason)}</span>`; }
    if (d.kind === 'consumable') btns = `<button class="vy-bouton vy-bouton--primaire" data-act="use" data-id="${e.id}">Utiliser</button>`;
    if (d.kind === 'knot') btns = `<button class="vy-bouton vy-bouton--primaire" data-act="knot" data-id="${e.id}">${ch.activeKnots().includes(e.id) ? 'Dénouer' : 'Nouer'}</button>`;
    if (opts.sell) btns += `<button class="vy-bouton vy-bouton--danger" data-act="sell" data-id="${e.id}">Vendre pour ${Items.sellPrice(d)} Fils</button>`;
    const stats = Items.statLines(d.stats || {}).map(l => { const m = l.match(/^([+-]?\d+) (.+)$/); return m ? `<li><span>${esc(m[2])}</span><b>${m[1]}</b></li>` : `<li>${esc(l)}</li>`; });
    if (d.spell) stats.push(`<li><span>Coup d'arme, ${d.spell.pa} PA</span><b>${d.spell.effects.map(x => x.min + '-' + x.max).join(' + ')} ${esc(DATA.elements[d.spell.element].label.toLowerCase())}</b></li>`);
    if (d.kind === 'consumable' && d.heal) stats.push(`<li><span>Soin</span><b>${d.heal >= 999 ? 'tous les PV' : '+' + d.heal + ' PV'}</b></li>`);
    const set = d.set ? Items.getSet(d.set) : null;
    return `<article class="vy-objet" data-rarete="${r}">` +
      `<header class="vy-objet__tete"><span class="vy-case" data-rarete="${r}" aria-hidden="true"><span class="vy-case__icone">${Hud.picto(d)}</span></span>` +
      `<div><h3 class="vy-objet__nom">${esc(d.name)}</h3><p class="vy-objet__meta"><span class="vy-badge-rarete">${Items.RARITY_LABEL[r]}</span><span>${esc(kindLabel)}${d.level > 1 ? ' · niveau ' + d.level : ''}${e.n > 1 ? ' · ×' + e.n : ''}</span></p></div></header>` +
      (stats.length ? `<ul class="vy-objet__stats">${stats.join('')}</ul>` : '') +
      (set ? `<p class="vy-objet__meta">${esc(set.name)} · ${set.pieces.length} pièces</p>` : '') +
      (d.lore ? `<p class="vy-objet__recit">${esc(d.lore)}</p>` : '') +
      (btns ? `<div class="vy-objet__actions">${btns}</div>` : '') + `</article>`;
  }

  // Pictogrammes simplifiés des cases du sac (charte : lisibles en petit, sans dégradé).
  static picto(d) {
    const P = {
      coiffe: '<path d="M5 16a7 7 0 0 1 14 0v2H5z"/><path d="M12 6V4M9 16v2M15 16v2"/>',
      cape: '<path d="M8 4h8l3 16-7-3-7 3z"/><path d="M9 4c1 2 5 2 6 0"/>',
      amulette: '<path d="M6 3l6 7 6-7"/><path d="M12 10l4 5-4 5-4-5z"/>',
      anneau: '<circle cx="12" cy="14" r="6"/><path d="M12 3l2.5 2.5L12 8 9.5 5.5z"/>',
      ceinture: '<rect x="3" y="9" width="18" height="6" rx="1"/><rect x="9" y="8" width="6" height="8" rx="1"/>',
      bottes: '<path d="M8 3h5v10l6 3v4H6V3z"/><path d="M6 17h13"/>',
      arme: '<path d="M18 3h3v3L9 18l-3-3z"/><path d="M5 14l5 5M4 20l3-3"/>',
      ressource: '<path d="M12 3l6 6-6 12-6-12z"/><path d="M6 9h12M12 3v18"/>',
      consommable: '<path d="M10 3h4v5l4 8a3 3 0 0 1-3 4H9a3 3 0 0 1-3-4l4-8z"/><path d="M8 14h8"/>',
      knot: '<path d="M8 8a4 4 0 1 1 4 4 4 4 0 1 0 4 4"/><path d="M16 8a4 4 0 1 0-4 4 4 4 0 1 1-4 4"/>',
    };
    const k = d.kind === 'equip' ? d.slot : d.kind === 'weapon' ? 'arme' : d.kind === 'resource' ? 'ressource' : d.kind === 'consumable' ? 'consommable' : d.kind;
    return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${P[k] || P.ressource}</svg>`;
  }

  // ----- Nœuds -----

  knotsSection(ch) {
    const owned = (DATA.knots || []).filter(k => ch.has(k.id));
    const active = ch.activeKnots();
    if (!owned.length) return `<h4>Nœuds</h4><p class="muted">Aucun Nœud. Le tailleur en fabrique : chaque Nœud noué durcit les combats et ajoute ${DATA.rules.knotBonus} % d'XP et de butin.</p>`;
    const rows = owned.map(k => `<div class="row"><span><b>${esc(k.name)}</b> <small class="muted">niv. ${k.level}</small><br><small>${esc(k.desc)}</small></span><span class="btns"><button data-act="knot" data-id="${k.id}">${active.includes(k.id) ? 'Dénouer' : 'Nouer'}</button></span></div>`).join('');
    this.actions.knot = d => { const r = ch.toggleKnot(d.id); if (!r.ok) this.toast(r.reason); this.world.emit('update'); };
    return `<h4>Nœuds <small class="muted">${active.length} / ${DATA.rules.maxKnots} noués · +${active.length * DATA.rules.knotBonus} %</small></h4>${rows}`;
  }

  // ----- Carnet du Veilleur -----

  openCarnet() {
    // Le premier onglet : la région où l'on se trouve (Ervane pour un Veilleur qui s'y éveille).
    const ici = this.world.zone && this.world.zone.region;
    this.carnetTab = this.carnetTab || (ici && Object.values(DATA.monsters).some(m => m.region === ici && !m.summon) ? ici : 'orsane');
    const render = () => {
      const ch = this.world.ch;
      const kills = ch.counters.kills || {};
      // L'onglet d'Ervane : pour qui y est né ou y a déjà vaincu une remontée (un personnage d'Orsane n'y monte pas).
      const ileVue = ch.origine === 'ervane' || Object.keys(kills).some(id => DATA.monsters[id] && DATA.monsters[id].region === 'ervane');
      const regions = Object.keys(DATA.regions).filter(r => Object.values(DATA.monsters).some(m => m.region === r && !m.summon) && (r !== 'ervane' || ileVue));
      const tabs = regions.map(r => {
        const all = Object.values(DATA.monsters).filter(m => m.region === r && !m.summon);
        const seen = all.filter(m => kills[m.id]).length;
        return `<button class="tab${this.carnetTab === r ? ' on' : ''}" data-act="ctab" data-tab="${r}">${esc(DATA.regions[r])} (${seen}/${all.length})</button>`;
      }).join('');
      const list = Object.values(DATA.monsters).filter(m => m.region === this.carnetTab && !m.summon)
        .sort((a, b) => Entity.levelRange(a)[0] - Entity.levelRange(b)[0])
        .map(m => {
          const n = kills[m.id] || 0;
          const tag = m.boss ? ' <small class="badge">boss</small>' : (m.rare ? ' <small class="badge rare">rare</small>' : '');
          if (!n) return `<div class="row dim"><span><b>???</b>${tag}<br><small class="muted">niv. ${esc(m.level)} · pas encore vaincu</small></span></div>`;
          return `<div class="row"><span><b style="color:${m.color}">${esc(m.name)}</b>${tag} <small class="muted">niv. ${esc(m.level)}</small><br><small>${esc(m.desc || '')}</small></span><small class="muted">${n} vaincu${n > 1 ? 's' : ''}</small></div>`;
        }).join('');
      return `<div class="tabs">${tabs}</div><p class="muted">Une remontée vaincue s'inscrit au Carnet. Les régions complètes donnent des succès.</p>${list}`;
    };
    this.simpleWin('carnet', 'Carnet du Veilleur', render, { ctab: d => { this.carnetTab = d.tab; this.fen.render('carnet'); } }, { width: 480 });
  }

  // ----- Quêtes et succès -----

  openQuests() {
    const render = () => {
      const ch = this.world.ch;
      // Abandonner : l'avancement est perdu, la quête redevient disponible (deux appuis).
      const quit = q => Quests.canAbandon(ch, q.id).ok ? `<button class="vy-bouton vy-bouton--petit vy-bouton--fantome" data-act="abandon" data-id="${q.id}" title="L'avancement sera perdu ; la quête redeviendra disponible.">Abandonner</button>` : '';
      const active = Quests.tracker(ch).map(t => `<div class="row quest${t.quest.main ? ' main' : ''}"><span><b>${esc(t.quest.name)}</b> <small class="muted">niv. ${t.quest.level}${t.quest.main ? ' · principale' : ''}${t.quest.category === 'faction' ? ' · faction' : ''}</small><br><small>${esc(t.text)}</small></span>${quit(t.quest)}</div>`).join('') || '<p class="muted">Aucune quête en cours. Les PNJ marqués « ! » en proposent.</p>';
      const done = ch.quests.done.map(id => Quests.get(id)).filter(Boolean).map(q => `<div class="row done"><span>${esc(q.name)}</span><small class="muted">terminée</small></div>`).join('');
      return `<h4>En cours</h4>${active}${done ? `<h4>Terminées (${ch.quests.done.length})</h4>${done}` : ''}`;
    };
    const actions = {
      abandon: (d, b) => {
        if (!b.dataset.sure) { b.dataset.sure = '1'; b.textContent = 'Confirmer l\'abandon'; b.classList.add('vy-bouton--danger'); return; }
        this.world.abandonQuest(d.id);
      },
    };
    this.simpleWin('quetes', 'Quêtes', render, actions, { width: 440 });
  }

  // Un succès débloqué dont la récompense attend est « à réclamer » (js/hud-recompenses.js).
  openAchievements() {
    const render = () => {
      const ch = this.world.ch;
      const attente = Achievements.pending(ch).map(a => a.id);
      // Un personnage né à Orsane ne monte jamais sur Ervane : les succès de l'île ne lui sont pas montrés.
      const ileSeule = a => /ervane|puits_de_l_amarre|krobb/.test(JSON.stringify(a.cond || {}));
      const defs = Achievements.defs().filter(a => ch.origine === 'ervane' || ch.achievements.includes(a.id) || !ileSeule(a));
      const list = defs.map(a => {
        const got = ch.achievements.includes(a.id);
        const r = a.rewards || {};
        return `<div class="row ach${got ? ' got' : ''}"><span><b>${esc(a.name)}</b><br><small>${esc(a.desc)}</small></span><span class="muted">${attente.includes(a.id) ? '<b>à réclamer</b>' : got ? 'obtenu' : Achievements.progress(ch, a)}<br><small>${[r.xp ? r.xp + ' XP' : '', r.fils ? r.fils + ' Fils' : '', r.title ? '« ' + esc(r.title) + ' »' : ''].filter(Boolean).join(' · ')}</small></span></div>`;
      }).join('');
      const n = attente.length;
      return `<div class="row"><span class="muted">${ch.achievements.length} / ${defs.length} succès</span>${n ? `<button data-act="recompenses">${n} récompense${n > 1 ? 's' : ''} en attente</button>` : ''}</div>${list}`;
    };
    this.simpleWin('succes', 'Succès', render, { recompenses: () => this.openRecompenses() }, { width: 480 });
  }

  // ----- Menu -----
  // La carte du monde (touche M) est dans js/hud-carte.js.

  openMenu() {
    const ch = this.world.ch;
    const themes = Hud.THEMES.map(([id, label, fond, accent]) => `<button class="vy-theme${document.getElementById('app').dataset.uiTheme === id ? ' on' : ''}" data-act="theme" data-theme="${id}" aria-pressed="${document.getElementById('app').dataset.uiTheme === id}"><span class="vy-theme__apercu" style="--f:${fond};--a:${accent}"></span>${label}</button>`).join('');
    // Une partie d'invité n'écrit rien : on le dit, et on propose de garder le personnage par un code.
    const invite = !!ch.invite;
    const tuto = () => {
      const mode = Guide.modeDe(ch), t = ch.tuto;
      const opts = [['guide', 'Guidé'], ['court', 'Rappels courts'], ['off', 'Aucun']].map(([v, l]) => `<option value="${v}" ${(t ? (t.done ? 'off' : t.mode) : mode) === v ? 'selected' : ''}>${l}</option>`).join('');
      return `<h4>Tutoriel</h4><div class="row"><span>Aide du guide</span><select id="opt-tuto" aria-label="Aide du guide">${opts}</select></div>
        <div class="row"><span class="muted">${mode === 'off' ? 'Le tutoriel est terminé ou éteint.' : 'Le guide t\'accompagne pas à pas.'}</span><span class="btns">${mode !== 'off' ? '<button data-act="tutoPasser">Passer le tutoriel</button>' : ''}<button data-act="tutoRevoir">Revoir le tutoriel</button></span></div>`;
    };
    const jeu = () => `<h4>Jeu</h4>
      <div class="row"><label class="vy-coche"><input type="checkbox" id="opt-confirmer" ${UI.confirmerSorts(null) ? 'checked' : ''}> Confirmer les sorts</label><span class="muted">un toucher sur la cible, puis la coche</span></div>
      <div class="row"><label class="vy-coche"><input type="checkbox" id="opt-gaucher" ${this.jeu && this.jeu.gaucher ? 'checked' : ''}> Mode gaucher</label><span class="muted">le panneau de jeu passe à gauche</span></div>
      ${PleinEcran.disponible() ? `<div class="row"><label class="vy-coche"><input type="checkbox" id="opt-plein-ecran"${PleinEcran.actif() ? ' checked' : ''}> Plein écran</label><span class="muted">sans la barre du navigateur</span></div>` : ''}`;
    // L'opacité des fonds : la valeur posée (le curseur suit, même si la fenêtre se redessine en cours de route).
    const opacite = () => { const v = this.opacite || this.loadOpacite(); return `<div class="row vy-opacite"><label for="opt-opacite">Opacité des fonds</label><input type="range" id="opt-opacite" min="40" max="100" step="5" value="${v}" style="--v:${v}" aria-valuetext="${v} %"><output for="opt-opacite">${v} %</output></div>`; };
    const html = () => `${tuto()}${jeu()}<h4>Thème de l'interface</h4><div class="vy-themes">${themes}</div>
      ${opacite()}
      <div class="row"><span class="muted">Fenêtres déplacées trop loin ?</span><button data-act="replacer">Replacer les fenêtres</button></div>
      ${invite ? '<div class="row"><span>Partie d\'invité : rien n\'est enregistré sur cet appareil. Pour garder ce personnage, copie son code et importe-le depuis l\'accueil.</span></div>'
    : '<div class="row"><span>Partie sauvegardée automatiquement dans ce navigateur.</span><button data-act="savenow">Sauvegarder</button></div>'}
      <h4>Changer d'appareil</h4><p class="muted">Copie ce code, colle-le dans « Importer » sur l'autre appareil.</p>
      <textarea id="export-area" rows="3" readonly>${Save.exportText(ch)}</textarea>
      <div class="row"><button data-act="copy">Copier le code</button></div>
      ${invite ? '' : `<h4>Importer</h4><textarea id="import-area" rows="3" placeholder="Colle un code ici">${esc(this.importDraft || '')}</textarea><div class="row"><button data-act="import">Importer</button></div>`}
      <h4>Temps de jeu</h4><p class="muted">${Math.floor(ch.playTime / 60)} min · ${ch.counters.wins} victoires sur ${ch.counters.fights} combats</p>
      <h4>Personnages</h4><div class="row"><span class="muted">${invite ? 'Quitter la partie d\'invité ramène à l\'accueil ; ce personnage sera perdu.' : 'Jusqu\'à cinq personnages par appareil. Celui-ci est sauvegardé avant de partir.'}</span><button data-act="newgame"${invite ? ' class="danger"' : ''}>${invite ? 'Quitter la partie' : 'Changer de personnage'}</button></div>
      <p class="muted">Raccourcis : ${Hud.MENUS.map(m => `${m[2]} ${m[1].toLowerCase()}`).join(' · ')} · Échap ferme la fenêtre du dessus.</p>
      ${location.protocol === 'file:' || location.hostname === 'localhost' ? '<p class="muted">Laboratoire de combat : <a href="lab.html">lab.html</a></p>' : ''}`;
    this.actions.savenow = () => { this.toast(Save.write(ch) ? 'Sauvegardé.' : 'Sauvegarde impossible ici.'); };
    this.actions.copy = () => { const ta = document.getElementById('export-area'); ta.select(); const fallback = () => this.toast('Sélectionne et copie le code.'); try { navigator.clipboard.writeText(ta.value).then(() => this.toast('Code copié.'), fallback); } catch (e) { fallback(); } };
    this.actions.import = () => {
      const r = Save.importText(document.getElementById('import-area').value);
      // Un personnage d'Ervane sur une page sans l'île : le code attend, la page se recharge (js/save.js).
      if (r.recharge) { this.toast(r.error); Save.write(ch); Save.suspend(); setTimeout(() => location.reload(), 50); return; }
      if (!r.ch) { this.toast(r.error || 'Code invalide.'); return; }
      this.importDraft = ''; Save.write(ch); Save.write(r.ch); Save.suspend(); location.reload();
    };
    // Changer de personnage : on sauvegarde celui-ci et on revient à la liste des emplacements.
    this.actions.newgame = (d, b) => {
      if (invite && !b.dataset.sure) { b.dataset.sure = '1'; b.textContent = 'Confirmer : quitter sans garder'; return; }
      if (!invite) Save.write(ch);
      Save.suspend();
      try { sessionStorage.setItem('veylan.entree', invite ? 'accueil' : 'personnages'); } catch (e) { /* rien */ }
      location.reload();
    };
    const actions = {
      savenow: this.actions.savenow, copy: this.actions.copy, import: this.actions.import, newgame: this.actions.newgame,
      theme: d => { this.applyTheme(d.theme); this.fen.close('options'); this.openMenu(); },
      replacer: () => this.fen.resetPositions(),
      tutoPasser: (d, b) => { if (!b.dataset.sure) { b.dataset.sure = '1'; b.textContent = 'Confirmer : passer'; return; } this.guide.passer(); this.fen.render('options'); },
      tutoRevoir: () => { this.fen.close('options'); this.syncMenus(); this.guide.revoir(); },
    };
    const onField = (el, kind) => {
      if (el.id === 'import-area') this.importDraft = el.value;
      if (el.id === 'opt-opacite') {
        const v = this.appliquerVerre(Number(el.value), kind === 'change');
        el.style.setProperty('--v', v); el.setAttribute('aria-valuetext', `${v} %`);
        const o = el.parentNode.querySelector('output'); if (o) o.textContent = `${v} %`;
        return;
      }
      if (kind !== 'change') return;
      if (el.id === 'opt-tuto') { this.guide.choisirMode(el.value); this.fen.render('options'); }
      if (el.id === 'opt-confirmer') { try { localStorage.setItem('veylan.confirmerSorts', el.checked ? '1' : '0'); } catch (e) { /* stockage indisponible */ } }
      if (el.id === 'opt-gaucher' && this.jeu) this.jeu.mettreGaucher(el.checked);
      if (el.id === 'opt-plein-ecran') PleinEcran.basculer().then(() => { if (this.fen.isOpen('options')) this.fen.render('options'); });
    };
    // La case suit le plein écran, même quitté par Échap ou par le bouton de la vue.
    if (!this.suitPleinEcran) { this.suitPleinEcran = true; PleinEcran.surChangement(() => { if (this.fen.isOpen('options')) this.fen.render('options'); }); }
    this.simpleWin('options', 'Options', html, actions, { width: 480, onField });
  }

  // ----- Dialogue, boutique, atelier -----

  // Parler à un PNJ : sa bulle au-dessus de la tête et la boîte de réponses (js/dialogues.js) ;
  // les textes de quête passent dans la grande boîte au portrait.
  openDialogue(ctx) {
    this.dialogue = ctx;
    this.conversation.ouvrir(ctx);
  }

  // Une étape de choix (le serment, le reniement) se joue dans le grand panneau : on parle toujours
  // au PNJ (world.talkNpc), et « Continuer » lui rend la parole avec l'état des quêtes relu.
  openAnswerPanel(npc, questId) {
    const q = Quests.get(questId);
    this.actions.back = () => this.retourConversation(npc);
    this.openPanel('dialogue', q ? q.name : npc.def.name, '');
    this.openAnswer(npc, questId);
  }

  retourConversation(npc) {
    this.el.panel.classList.add('hidden');
    this.el.panel.dataset.open = '';
    this.panelRefresh = null;
    this.setInert(false);
    if (!this.world.talkNpc) return;
    this.dialogue = this.world.dialogueContext(npc);
    this.conversation.ouvrir(this.dialogue);
  }

  // La fin d'une quête, dite par le PNJ de la remise ; `before` : les répliques d'un choix.
  questDoneHtml(npc, q, r, before) {
    const lines = (before || []).concat((q.dialogue && q.dialogue.done) || []);
    const gained = r.first === false ? 'déjà reçu' : rewardText(q.rewards);
    return `<div class="dialogue"><div class="npc-face look-${npc.def.look || 'marcheur'}"></div><div class="npc-text"><b>${esc(npc.def.name)}</b><h3>${esc(q.name)} : terminée</h3><p>${lines.map(esc).join('<br>')}</p><div class="muted">Gagné : ${gained}${r.levels ? ` · niveau ${this.world.ch.level} !` : ''}</div></div></div>
        <div class="dialogue-actions"><button data-act="back">Continuer</button></div>`;
  }

  openShop(ctx) {
    this.shopTab = this.shopTab || 'buy';
    const render = () => {
      const ch = this.world.ch;
      const tabs = `<div class="tabs"><button class="tab${this.shopTab === 'buy' ? ' on' : ''}" data-act="stab" data-tab="buy">Acheter</button><button class="tab${this.shopTab === 'sell' ? ' on' : ''}" data-act="stab" data-tab="sell">Vendre</button></div><p class="muted">Tu as ${ch.fils} Fils.</p>`;
      if (this.shopTab === 'sell') {
        const entries = Object.entries(ch.inventory).map(([id, n]) => ({ def: Items.get(id), id, n })).filter(e => e.def);
        return tabs + (entries.map(e => `<div class="row item"><span><b>${esc(e.def.name)}</b> ×${e.n}</span><span class="btns"><button data-act="sell" data-id="${e.id}">Vendre 1 (${Items.sellPrice(e.def)} F)</button>${e.n > 1 ? `<button data-act="sellall" data-id="${e.id}" data-n="${e.n}">Tout (${Items.sellPrice(e.def) * e.n} F)</button>` : ''}</span></div>`).join('') || '<p class="muted">Rien à vendre.</p>');
      }
      return tabs + (ctx.shop || []).map(id => { const d = Items.get(id); if (!d) return ''; const info = d.kind === 'consumable' ? (d.heal ? `rend ${d.heal >= 999 ? 'tous les' : d.heal} PV` : esc(d.lore)) : `niv. ${d.level} · ${Items.statLines(d.stats).join(', ')}`; return `<div class="row item"><span><b>${esc(d.name)}</b><br><small>${info}</small></span><span class="btns"><button data-act="buy" data-id="${id}" ${ch.fils >= d.price ? '' : 'disabled'}>Acheter ${d.price} F</button></span></div>`; }).join('');
    };
    this.actions.stab = d => { this.shopTab = d.tab; this.el.panelBody.innerHTML = render(); };
    this.actions.buy = d => { this.world.buy(d.id, 1); };
    this.actions.sell = d => { this.world.sell(d.id, 1); };
    this.actions.sellall = d => { this.world.sell(d.id, Number(d.n)); };
    this.openPanel('dialogue', `Boutique de ${ctx.npc.def.name}`, render(), () => { this.el.panelBody.innerHTML = render(); });
  }

  openWorkshop(ctx) {
    const render = () => {
      const ch = this.world.ch;
      const recipes = Items.recipes().filter(r => r.workshop === ctx.workshop).map(r => ({ r, def: Items.get(r.result) })).filter(x => x.def).sort((a, b) => a.def.level - b.def.level);
      // La Veille du jour peut alléger cet atelier (World.recipeCost).
      const remise = typeof Veille === 'object' ? Veille.remise(ch, ctx.workshop) : 0;
      const rows = recipes.map(({ r, def }) => {
        const cost = this.world.recipeCost(r);
        const ok = cost.every(i => ch.has(i.id, i.count));
        const ings = cost.map(i => { const d = Items.get(i.id); const have = ch.count(i.id); return `<span class="${have >= i.count ? 'ok' : 'missing'}">${d ? esc(d.name) : i.id} ${have}/${i.count}</span>`; }).join(', ');
        const info = def.kind === 'consumable' ? (def.heal ? `rend ${def.heal >= 999 ? 'tous les' : def.heal} PV` : esc(def.lore)) : Items.statLines(def.stats).join(', ');
        return `<div class="row item${ok ? '' : ' dim'}"><span><b>${esc(def.name)}</b>${r.count > 1 ? ` ×${r.count}` : ''} <small class="muted">niv. ${def.level}</small><br><small>${info}</small><br><small>${ings}</small></span><span class="btns"><button data-act="craft" data-id="${r.result}" ${ok ? '' : 'disabled'}>Fabriquer</button></span></div>`;
      }).join('');
      return `<p class="muted">Atelier : ${ctx.workshop}. Les ingrédients viennent des monstres et de la récolte.${remise ? ` <b class="ok">Veille du jour : ${remise} % de ressources en moins.</b>` : ''}</p>${rows || '<p class="muted">Aucune recette.</p>'}`;
    };
    this.actions.craft = d => { const r = Items.recipeFor(d.id); if (r) this.world.craft(r); };
    this.openPanel('dialogue', `Atelier de ${ctx.npc.def.name}`, render(), () => { this.el.panelBody.innerHTML = render(); });
  }

  // ----- Relais, donjons, fin de combat -----

  openRelay(d) {
    const rows = d.known.map(k => `<div class="row"><span>${k.def ? esc(k.def.name) : k.id}<br><small class="muted">${k.zone ? esc(k.zone.name) : ''}</small></span>${k.id === d.here ? '<small class="muted">ici</small>' : `<button data-act="tp" data-id="${k.id}">Aller</button>`}</div>`).join('');
    this.actions.tp = x => { this.closePanel(); this.world.teleport(x.id); };
    this.actions.relayCarte = () => this.openMapFromRelay();
    this.actions.relayVeille = () => this.openVeilleFromRelay();
    this.openPanel('relay', 'Relais du Fil', `<p class="muted">Point de retour enregistré ici. Tu peux rejoindre un autre relais connu.</p>${rows}<div class="row center"><button data-act="relayCarte">Choisir sur la carte du monde</button>${this.veilleBouton ? this.veilleBouton() : ''}</div>`);
  }

  openDungeonPrompt(d) {
    if (!d) return;
    const lvl = d.level ? `niveaux ${d.level[0]} à ${d.level[1]}` : '';
    // La condition d'entrée (`entree`, js/world.js, canEnterDungeon) : dite, et le bouton éteint tant
    // qu'elle ne tient pas.
    const peut = this.world.canEnterDungeon ? this.world.canEnterDungeon(d) : { ok: true };
    const e = d.entree || {};
    const q = e.quete && Quests.get(e.quete);
    const entree = e.niveau || q ? `<p class="muted">Pour entrer : ${[e.niveau ? 'niveau ' + e.niveau : '', q ? 'la quête « ' + esc(q.name) + ' »' : ''].filter(Boolean).join(' et ')}${d.entreeEnCombat ? ' · le combat s\'engage à l\'entrée de chaque salle' : ''}.</p>` : '';
    this.actions.enterd = () => { if (!peut.ok) { this.toast(peut.reason); return; } this.closePanel(); this.world.enterDungeon(d.id); };
    this.openPanel('dungeon', d.name, `<p>${esc(d.description || '')}</p><p class="muted">${lvl} · ${d.rooms.length} salles${d.keyItem ? ' · clé : ' + esc(Items.get(d.keyItem).name) : ''}</p>${entree}${peut.ok ? '' : `<p class="missing">${esc(peut.reason)}</p>`}<div class="row"><button data-act="enterd" class="primary"${peut.ok ? '' : ' disabled'}>Entrer</button></div>`);
  }

  // Le bandeau d'une sous-zone de l'île (js/plateau.js, changerSecteur) : la zone, puis la sous-zone
  // et son niveau, « lieu découvert » la première fois ; pas deux fois la même en vingt secondes.
  annoncerZone(d) {
    const w = this.world, def = d && d.map ? World.mapDef(d.map) : null;
    if (!def || !this.ui || !this.ui.ruban) return;
    this.zonesVues = this.zonesVues || new Map();
    const t = w.time || 0, avant = this.zonesVues.get(d.map);
    if (avant != null && t - avant < 20 && !d.nouveau) return;
    this.zonesVues.set(d.map, t);
    const l = def.level, niveau = Array.isArray(l) ? (l[0] === l[1] ? `niveau ${l[0]}` : `niveaux ${l[0]} à ${l[1]}`) : '';
    const sous = [def.name, niveau].filter(Boolean).join(', ') + (d.nouveau ? ' · Lieu découvert' : '');
    // Sous le voile d'une bascule (js/scene.js), le bandeau attend que la scène soit visible : vingt
    // essais au plus (six secondes), une seule minuterie à la fois, oubliée si une autre annonce vient
    // (un voile de repli qui reste ne garde donc pas de minuterie en vie).
    if (this.rubanZone) { clearTimeout(this.rubanZone); this.rubanZone = null; }
    let essais = 0;
    const montrer = () => {
      this.rubanZone = null;
      if (this.renderer && this.renderer.voile) { if (++essais <= 20) this.rubanZone = setTimeout(montrer, 300); return; }
      if (w.showCombat) return;
      this.ui.ruban(d.zone ? d.zone.name : def.name, { sorte: 'zone', ms: 3200, sous });
    };
    montrer();
  }

  openDungeonLeave(d) {
    this.actions.leaved = () => { this.closePanel(); this.world.leaveDungeon(); };
    this.openPanel('dungeon', d ? d.name : 'Donjon', `<p>Quitter le donjon ? La progression des salles sera perdue.</p><div class="row"><button data-act="leaved" class="danger">Sortir</button></div>`);
  }

  openFightEnd(r) {
    const ch = this.world.ch;
    const drops = r.drops.map(d => { const def = Items.get(d.id); return `<li>${def ? esc(def.name) : d.id}${d.count > 1 ? ' ×' + d.count : ''}</li>`; }).join('');
    const achs = r.achievements.map(a => `<li>Succès : ${esc(a.achievement.name)}${a.title ? ' · titre « ' + esc(a.title) + ' »' : ''}</li>`).join('');
    const quests = r.quests.filter((t, i, arr) => arr.findIndex(x => x.quest === t.quest) === i).map(t => `<li>${esc(t.quest.name)} : ${t.finished ? 'terminée, à rendre à ' + esc(Quests.npcName(Quests.turnInOf(t.quest))) : esc(Quests.stepText(ch, t.quest.id))}</li>`).join('');
    const chal = r.challenge ? `<div class="row"><span>Défi : ${esc(r.challenge.name)}</span><b class="${r.challenge.success ? 'ok' : 'missing'}">${r.challenge.success ? `réussi, +${r.challenge.bonus} %` : 'raté'}</b></div>` : '';
    let dungeon = '';
    if (r.dungeon) dungeon = r.dungeon.cleared ? `<p class="big">Donjon terminé : ${esc(r.dungeon.def.name)} !</p>${r.dungeon.turns ? `<p class="muted">En ${r.dungeon.turns} tours, toutes salles comprises.</p>` : ''}` : `<p class="muted">Salle suivante : ${esc(r.dungeon.def.rooms[r.dungeon.next].name)}</p>`;
    const html = r.victory
      ? `<p class="big win">Victoire</p>${dungeon}<div class="row"><span>Expérience</span><b>+${r.gained} XP${r.levels ? ` · niveau ${ch.level} !` : ''}</b></div><div class="row"><span>Fils</span><b>+${r.fils}</b></div>${chal}${r.veille ? `<div class="row"><span>Veille du jour</span><b class="ok">${esc(r.veille)}</b></div>` : ''}${r.knots ? `<div class="row"><span>Nœuds noués : ${r.knots}</span><b class="ok">+${r.knots * DATA.rules.knotBonus} %</b></div>` : ''}${drops ? `<h4>Butin</h4><ul>${drops}</ul>` : '<p class="muted">Aucun butin cette fois.</p>'}${quests ? `<h4>Quêtes</h4><ul>${quests}</ul>` : ''}${achs ? `<ul>${achs}</ul>` : ''}`
      : `<p class="big lose">Défaite</p><p>Tu reviens au Relais du Fil avec la moitié de tes PV.${this.world.ch.dungeon ? '' : ''}</p>`;
    this.actions.cont = () => this.closePanel();
    this.openPanel('fightEnd', r.victory ? 'Combat gagné' : 'Combat perdu', `${html}<div class="row center"><button data-act="cont" class="primary">Continuer</button></div>`);
  }

  // Une quête rendue : la discussion écrit « Quête terminée », l'XP et les objets (js/discussion.js).
  openReward() {
    this.refresh();
  }
}

function esc(s) {
  return Util.esc(s);
}

function rewardText(r) {
  r = r || {};
  const parts = [];
  if (r.xp) parts.push(`${r.xp} XP`);
  if (r.fils) parts.push(`${r.fils} Fils`);
  for (const it of r.items || []) { const d = Items.get(it.id); parts.push(`${d ? esc(d.name) : it.id}${it.count > 1 ? ' ×' + it.count : ''}`); }
  if (r.faction) parts.push(`${r.faction} points de faction`);
  if (r.marcheurs) parts.push('la confiance des Francs-Marcheurs');
  return parts.join(', ') || 'rien';
}
