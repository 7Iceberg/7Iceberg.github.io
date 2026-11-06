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
    if (this.initBoussole) this.initBoussole();
    if (this.initAdmin) this.initAdmin();
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
    w.on('map', d => {
      if (!d.secteur) this.setMode('explore');
      this.el.mapName.innerHTML = `${d.zone ? `<span class="zone">${Util.esc(d.zone.name)} · </span>` : ''}${Util.esc(d.def.name)}`;
      this.refresh();
    });
    w.on('update', () => this.refresh());
    w.on('hp', () => this.refreshBar());
    this.el.panelBody.addEventListener('change', evt => {
      if (evt.target.id === 'title-select') { const v = evt.target.value; this.world.ch.title = this.world.ch.titles.includes(v) ? v : null; this.refreshBar(); }
      if (evt.target.dataset.act === 'auto') this.world.ch.autoStats = evt.target.checked;
      if (evt.target.id === 'opt-combat-finDonjon') { UI.regler('finDonjon', evt.target.checked); this.toast(evt.target.checked ? 'La fiche de fin de donjon reviendra.' : 'Plus de fiche de fin de donjon (Options, Combat, pour la remettre).'); }
    });
    window.addEventListener('keydown', evt => {
      if (this.el.panel.dataset.open === 'fightEnd' && (evt.key === 'Enter' || evt.key === ' ')) { evt.preventDefault(); this.closePanel(); }
    });
    w.on('toast', t => this.toast(t));
    w.on('zone', d => this.annoncerZone(d));
    w.on('map', d => {
      if (d && !d.secteur && !d.apresCombat && ((w.ch && w.ch.dungeon) || this.enDonjon)) this.viderToasts();
      this.enDonjon = !!(w.ch && w.ch.dungeon);
      if (d && d.plateau && !d.secteur && !d.apresCombat) this.annoncerZone({ map: d.mapId, zone: d.zone, nouveau: false });
    });
    w.on('zoneProche', d => this.toast(`Attention : ${d.nom}, niveau ${d.niveau[0]}${d.niveau[1] !== d.niveau[0] ? ' à ' + d.niveau[1] : ''}. Plus fort que toi.`));
    w.on('panneau', d => this.toast(d.texte));
    w.on('dialogue', ctx => this.openDialogue(ctx));
    w.on('fight', () => { this.closePanel(); this.fermerFenetres(); this.setMode('combat'); this.ui.refresh(); this.ui.updateHighlights(); });
    w.on('fightEnd', r => this.openFightEnd(r));
    w.on('machine', ctx => this.openWorkshop(ctx));
    w.on('reward', r => this.openReward(r));
    w.on('achievement', g => this.annoncerSucces(g));
    w.on('relay', d => this.openRelay(d));
    w.on('dungeonPrompt', d => this.openDungeonPrompt(d));
    w.on('dungeonLeavePrompt', d => this.openDungeonLeave(d));
    w.on('questProgress', () => this.refresh());
    w.on('save', () => Save.write(w.ch));
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
    const blason = ch.lookAffiche ? ch.lookAffiche().blason : null;
    const sig = [ch.name, cls.id, ch.level, ch.title, ch.fils, ch.statPoints, d.hpMax, blason ? blason.glyphe + blason.couleur : ''].join('|');
    const bar = this.el.playerBar;
    if (this.barSig !== sig || !bar.querySelector('.vy-jauge')) {
      this.barSig = sig;
      bar.innerHTML =
        `<div class="portrait" style="--c:${cls.color}">${cls.glyph}</div>` +
        `<div class="pb-main"><div class="pb-name">${blason ? `<span class="pb-blason" style="color:${esc(blason.couleur || '#ddaa72')}" title="Blason" aria-hidden="true">${esc(blason.glyphe || '')}</span>` : ''}${esc(ch.name)} <small>${cls.name} · niveau ${ch.level}${ch.title ? ' · ' + esc(ch.title) : ''}</small></div>` +
        Util.jauge('vie', ch.hp, d.hpMax, `${ch.hp} / ${d.hpMax}`, 'Points de vie') +
        Util.jauge('xp', xp, 100, null, 'Expérience', 'vy-jauge--fine') + `</div>` +
        `<div class="pb-fils">${ch.fils} <small>Dragmes</small>${ch.statPoints ? `<div class="pts">+${ch.statPoints} pts</div>` : ''}</div>`;
    } else {
      Util.setJauge(bar.querySelector('.vy-jauge--vie'), ch.hp, d.hpMax, `${ch.hp} / ${d.hpMax}`);
      Util.setJauge(bar.querySelector('.vy-jauge--xp'), xp, 100);
    }
    bar.querySelector('.vy-jauge--xp').title = 'Expérience : ' + xpText;
    for (const [id, n] of [['carac', ch.statPoints]]) {
      const b = document.querySelector(`#menus [data-win="${id}"]`);
      if (b) b.classList.toggle('vy-menu--point', n > 0);
    }
    const tr = Quests.tracker(ch).slice(0, 3);
    const succes = this.succesSuivis ? this.succesSuivis().map(Achievements.get).filter(Boolean) : [];
    this.el.tracker.innerHTML = tr.map(t => `<div class="tq${t.quest.main ? ' main' : ''}${t.done ? ' done' : ''}"><b>${esc(t.quest.name)}</b><span>${esc(t.text)}</span></div>`).join('') +
      succes.map(a => `<div class="tq succes"><b>${esc(a.name)}</b><span>Succès · ${esc(Achievements.progress(ch, a))}</span></div>`).join('');
  }


  viderToasts() {
    if (!this.el.toasts) return;
    for (const t of [...this.el.toasts.children]) t.remove();
  }


  annoncerSucces(g) {
    const a = g.achievement, texte = `Succès : ${a.name}${g.title ? ' · titre « ' + g.title + ' »' : ''}`;
    if (this.pushJournal) this.pushJournal('evenements', texte);
    const gains = [g.xp ? `+${g.xp} XP` : '', g.fils ? `+${g.fils} Dragmes` : '', g.title ? `« ${g.title} »` : ''].filter(Boolean);
    const t = document.createElement('div');
    t.className = 'toast toast--succes';
    t.setAttribute('role', 'status');
    t.innerHTML = `<span class="toast__tuile" aria-hidden="true">${Fenetres.ICON.succes}</span><span class="toast__texte"><small>Succès débloqué</small><b>${esc(a.name)}</b></span>${gains.length ? `<span class="toast__gain">${esc(gains[0])}</span>` : ''}`;
    t.setAttribute('aria-label', texte);
    if (this.poserNotif) this.poserNotif(t, ((this.notifs && this.notifs.duree) || 3) * 1000 + 1200);
    else { this.el.toasts.appendChild(t); setTimeout(() => t.remove(), 4200); }
  }


  openPanel(id, title, html, refresh) {
    this.el.panel.dataset.open = id;
    this.el.panelTitle.textContent = title;
    this.el.panelBody.innerHTML = html;
    this.el.panel.classList.remove('hidden');
    this.setInert(true);
    this.panelRefresh = refresh || null;
    if (this.world.state === 'explore') this.world.state = 'panel';
  }

  fermerFenetres() {
    if (!this.fen) return;
    for (const id of [...this.fen.wins.keys()]) this.fen.close(id, true);
  }

  closePanel() {
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


  static texteCle(w, d) {
    if (!d || !d.keyItem) return '';
    const e = w && w.etatCle ? w.etatCle(d) : null, nom = esc(Items.get(d.keyItem).name);
    if (!e || !e.range) return ` · clé : ${nom}${e && e.sac ? ` (${e.sac} dans le sac)` : ''}`;
    return ` · clé : ${nom} (trousseau : ${e.libre ? 'libre aujourd\'hui' : 'déjà ouvert aujourd\'hui'}${e.sac ? `, ${e.sac} dans le sac` : ''})`;
  }

  static picto(d) {
    const P = {
      coiffe: '<path d="M5 16a7 7 0 0 1 14 0v2H5z"/><path d="M12 6V4M9 16v2M15 16v2"/>',
      cape: '<path d="M8 4h8l3 16-7-3-7 3z"/><path d="M9 4c1 2 5 2 6 0"/>',
      amulette: '<path d="M6 3l6 7 6-7"/><path d="M12 10l4 5-4 5-4-5z"/>',
      anneau: '<circle cx="12" cy="14" r="6"/><path d="M12 3l2.5 2.5L12 8 9.5 5.5z"/>',
      ceinture: '<rect x="3" y="9" width="18" height="6" rx="1"/><rect x="9" y="8" width="6" height="8" rx="1"/>',
      bottes: '<path d="M8 3h5v10l6 3v4H6V3z"/><path d="M6 17h13"/>',
      arme: '<path d="M18 3h3v3L9 18l-3-3z"/><path d="M5 14l5 5M4 20l3-3"/>',
      bouclier: '<path d="M12 3l7 3v5c0 4.5-3 8-7 10-4-2-7-5.5-7-10V6z"/><path d="M12 7v10M8 11h8"/>',
      ressource: '<path d="M12 3l6 6-6 12-6-12z"/><path d="M6 9h12M12 3v18"/>',
      consommable: '<path d="M10 3h4v5l4 8a3 3 0 0 1-3 4H9a3 3 0 0 1-3-4l4-8z"/><path d="M8 14h8"/>',
      knot: '<path d="M8 8a4 4 0 1 1 4 4 4 4 0 1 0 4 4"/><path d="M16 8a4 4 0 1 0-4 4 4 4 0 1 1-4 4"/>',
    };
    if (d.image) return `<img class="vy-case__img" src="${esc(d.image)}" alt="" draggable="false">`;
    const k = d.kind === 'equip' ? d.slot : d.kind === 'weapon' ? 'arme' : d.kind === 'resource' ? 'ressource' : d.kind === 'consumable' ? 'consommable' : d.kind;
    return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${P[k] || P.ressource}</svg>`;
  }






  openMenu() {
    const ch = this.world.ch;
    const themeActuel = document.getElementById('app').dataset.uiTheme || '';
    const themes = Hud.themesDisponibles().map(([id, label, fond, accent]) => `<button class="vy-theme${themeActuel === id ? ' on' : ''}" data-act="theme" data-theme="${id}" aria-pressed="${themeActuel === id}"><span class="vy-theme__apercu" style="--f:${fond};--a:${accent}"><i class="vy-theme__barre"></i><i class="vy-theme__case"></i><i class="vy-theme__case"></i><i class="vy-theme__bouton"></i></span><span class="vy-theme__nom">${label}</span></button>`).join('');
    const invite = !!ch.invite;
    const tuto = () => {
      const mode = Guide.modeDe(ch), t = ch.tuto;
      const opts = [['guide', 'Guidé'], ['court', 'Rappels courts'], ['off', 'Aucun']].map(([v, l]) => `<option value="${v}" ${(t ? (t.done ? 'off' : t.mode) : mode) === v ? 'selected' : ''}>${l}</option>`).join('');
      return `<h4>Tutoriel</h4><div class="row"><span>Aide du guide</span><select id="opt-tuto" aria-label="Aide du guide">${opts}</select></div>
        <div class="row"><span class="muted">${mode === 'off' ? 'Le tutoriel est terminé ou éteint.' : 'Le guide t\'accompagne pas à pas.'}</span><span class="btns">${mode !== 'off' ? '<button data-act="tutoPasser">Passer le tutoriel</button>' : ''}<button data-act="tutoRevoir">Revoir le tutoriel</button></span></div>`;
    };
    const jeu = () => `<h4>Jeu</h4>
      <div class="row"><label class="vy-coche"><input type="checkbox" id="opt-gaucher" ${this.jeu && this.jeu.gaucher ? 'checked' : ''}> Mode gaucher</label><span class="muted">le panneau de jeu passe à gauche</span></div>
      ${PleinEcran.disponible() ? `<div class="row"><label class="vy-coche"><input type="checkbox" id="opt-plein-ecran"${PleinEcran.actif() ? ' checked' : ''}> Plein écran</label><span class="muted">sans la barre du navigateur</span></div>` : ''}
      <div class="row"><span>Qualité d'image</span><select id="opt-qualite-image" aria-label="Qualité d'image">${[['standard', 'Standard'], ['haute', 'Haute']].map(([v, l]) => `<option value="${v}"${UI.qualiteImage() === v ? ' selected' : ''}>${l}</option>`).join('')}</select></div>
      <div class="row"><span class="muted">${UI.qualiteImage() === 'haute' ? 'Image plus fine (au moins 1,5 fois l\'écran) : demande plus à la carte graphique.' : 'Réglée par l\'appareil. Haute : contours plus lisses, plus de travail pour la carte graphique.'}</span></div>`;
    const coche = (nom, label, aide) => `<div class="row"><label class="vy-coche"><input type="checkbox" id="opt-combat-${nom}" ${UI.reglage(nom) ? 'checked' : ''}> ${label}</label><span class="muted">${aide}</span></div>`;
    const combat = () => `<h4>Combat</h4>
      <div class="row"><label class="vy-coche"><input type="checkbox" id="opt-confirmer" ${UI.confirmerSorts(null) ? 'checked' : ''}> Confirmer les sorts</label><span class="muted">un toucher sur la cible, puis la coche</span></div>
      ${coche('grille', 'Afficher la grille', 'le quadrillage de l\'aire')}
      ${coche('deplacement', 'Cases de déplacement', 'en vert, pendant ton tour')}
      ${coche('portee', 'Portée des sorts', 'en bleu, pour le sort choisi')}
      ${coche('cout', 'Coût du déplacement', 'les PM du chemin, au survol')}
      ${coche('barres', 'Barres de vie', 'au-dessus de chaque combattant ; sinon celui qu\'on vise et celui qui joue')}
      ${coche('agression', 'Monstres agressifs', 'les élites et quelques familles hostiles attaquent à vue, hors des villes')}
      ${coche('finDonjon', 'Fiche de fin de donjon', 'le boss, les succès du donjon et sa stratégie, à la victoire')}
      <div class="row"><span>Bonus des défis</span><select id="opt-bonus-defi" aria-label="Bonus des défis">${[['', 'XP et butin'], ['xp', 'XP seulement (doublé)'], ['butin', 'Butin seulement (doublé)']].map(([v, l]) => `<option value="${v}"${(ch.bonusDefi || '') === v ? ' selected' : ''}>${l}</option>`).join('')}</select></div>
      <div class="row"><span class="muted">${ch.bonusDefi === 'xp' ? 'Un défi réussi double son bonus, tout en expérience.' : ch.bonusDefi === 'butin' ? 'Un défi réussi double son bonus, tout en chances de butin.' : 'Un défi réussi ajoute son bonus à l\'expérience et aux chances de butin.'}</span></div>`;
    const curseur = (id, cls, label, v, min, max) => `<div class="row vy-reglage ${cls}"><label for="${id}">${label}</label><input type="range" id="${id}" min="${min}" max="${max}" step="5" value="${v}" style="--v:${v};--min:${min};--max:${max}" aria-valuetext="${v} %"><output for="${id}">${v} %</output></div>`;
    const opacite = () => curseur('opt-opacite', 'vy-opacite', 'Opacité des fonds', this.opacite || this.loadOpacite(), 40, 100) +
      curseur('opt-taille', 'vy-taille', 'Taille de l\'interface', this.taille || this.loadTaille(), 80, 130);
    const vitaux = () => Gemmes.STYLES.map(([id, label]) => { const on = this.styleVital() === id;
      return `<button class="vy-style-vital${on ? ' on' : ''}" data-act="vital" data-vital="${id}" aria-pressed="${on}"><span class="vy-style-vital__apercu" aria-hidden="true">${Gemmes.apercu(id)}</span><span class="vy-style-vital__nom">${label}</span></button>`; }).join('');
    const son = () => `<h4>Son</h4>
      <div class="row"><label class="vy-coche"><input type="checkbox" id="opt-son" ${Son.actif() ? 'checked' : ''}> Son</label><span class="muted">${Son.pret() ? 'la musique du lieu et les bruitages' : 'se lance au premier toucher'}</span></div>
      ${curseur('opt-musique', 'vy-musique', 'Musique', Son.reglages.musique, 0, 100)}
      ${curseur('opt-bruitages', 'vy-bruitages', 'Bruitages', Son.reglages.bruitages, 0, 100)}`;
    const SECTIONS = [['jeu', 'Jeu'], ['combat', 'Combat'], ['interface', 'Interface'], ['themes', 'Thèmes'], ['son', 'Son'], ['notifications', 'Notifications'], ['accessibilite', 'Accessibilité'], ['raccourcis', 'Raccourcis'], ['sauvegarde', 'Sauvegarde'], ['personnages', 'Personnages']];
    const ouvre = id => `<section class="vy-opt__sec" id="opt-sec-${id}" data-sec="${id}">`;
    const loupe = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><circle cx="11" cy="11" r="6.5"/><path d="M16 16l4 4"/></svg>';
    const touches = `<h4>Raccourcis clavier</h4><div class="vy-opt__touches">${Hud.MENUS.filter(m => m[2]).map(m => `<div class="vy-opt__touche"><kbd>${m[2]}</kbd><span>${m[1]}</span></div>`).join('')}<div class="vy-opt__touche"><kbd>Échap</kbd><span>Fermer la fenêtre du dessus</span></div><div class="vy-opt__touche"><kbd>1</kbd>…<kbd>0</kbd><span>Sorts de la première rangée</span></div><div class="vy-opt__touche"><kbd>Maj</kbd>+<kbd>1</kbd>…<span>Sorts de la seconde rangée</span></div></div>`;
    if (this.optCherche) requestAnimationFrame(() => this.filtrerOptions(this.optCherche));
    const html = () => `<div class="vy-opt"><nav class="vy-opt__nav" aria-label="Sections des options"><label class="vy-recherche vy-opt__cherche">${loupe}<input id="opt-cherche" type="search" placeholder="Chercher un réglage" value="${esc(this.optCherche || '')}" aria-label="Chercher un réglage"></label>${SECTIONS.map(([id, l]) => `<button type="button" data-act="optAller" data-sec="${id}">${l}</button>`).join('')}</nav><div class="vy-opt__corps" data-defile="options">${ouvre('jeu')}${tuto()}${jeu()}</section>${ouvre('combat')}${combat()}</section>${ouvre('interface')}<h4>Bloc vital</h4><div class="vy-styles-vital" role="group" aria-label="Style du bloc vital">${vitaux()}</div>
      <div class="row"><span class="muted">Déplacer, cacher et régler les blocs du HUD</span><button data-act="editeur">Personnaliser l'interface</button></div>
      <div class="row"><span class="muted">Fenêtres déplacées trop loin ?</span><button data-act="replacer">Replacer les fenêtres</button></div>
      </section>${ouvre('themes')}<h4>Thème de l'interface</h4><div class="vy-themes">${themes}</div></section>${ouvre('son')}${son()}</section>
      ${this.optionsNotifs ? `${ouvre('notifications')}${this.optionsNotifs()}</section>` : ''}
      ${ouvre('accessibilite')}<h4>Accessibilité</h4>${opacite()}</section>
      ${ouvre('raccourcis')}${touches}</section>${ouvre('sauvegarde')}
      ${invite ? '<div class="row"><span>Partie d\'invité : rien n\'est enregistré sur cet appareil. Pour garder ce personnage, copie son code et importe-le depuis l\'accueil.</span></div>'
    : '<div class="row"><span>Partie sauvegardée automatiquement dans ce navigateur.</span><button data-act="savenow">Sauvegarder</button></div>'}
      <h4>Changer d'appareil</h4><p class="muted">Copie ce code, colle-le dans « Importer » sur l'autre appareil.</p>
      <textarea id="export-area" rows="3" readonly>${Save.exportText(ch)}</textarea>
      <div class="row"><button data-act="copy">Copier le code</button><button data-act="telecharger">Télécharger le fichier</button></div>
      ${invite ? '' : `<h4>Importer</h4><textarea id="import-area" rows="3" placeholder="Colle un code ici">${esc(this.importDraft || '')}</textarea><div class="row"><button data-act="import">Importer</button><button data-act="charger">Charger un fichier</button></div>`}
      </section>${ouvre('personnages')}
      <h4>Temps de jeu</h4><p class="muted">${Math.floor(ch.playTime / 60)} min · ${ch.counters.wins} victoires sur ${ch.counters.fights} combats</p>
      <h4>Personnages</h4><div class="row"><span class="muted">${invite ? 'Quitter la partie d\'invité ramène à l\'accueil ; ce personnage sera perdu.' : 'Jusqu\'à cinq personnages par appareil. Celui-ci est sauvegardé avant de partir.'}</span><button data-act="newgame"${invite ? ' class="danger"' : ''}>${invite ? 'Quitter la partie' : 'Changer de personnage'}</button></div>
      ${location.protocol === 'file:' || location.hostname === 'localhost' ? '<p class="muted">Laboratoire de combat : <a href="lab.html">lab.html</a></p>' : ''}</section></div></div>`;
    this.actions.savenow = () => { this.toast(Save.write(ch) ? 'Sauvegardé.' : 'Sauvegarde impossible ici.'); };
    this.actions.copy = () => { const ta = document.getElementById('export-area'); ta.select(); const fallback = () => this.toast('Sélectionne et copie le code.'); try { navigator.clipboard.writeText(ta.value).then(() => this.toast('Code copié.'), fallback); } catch (e) { fallback(); } };
    this.actions.telecharger = () => {
      try {
        const blob = new Blob([Save.exportText(ch)], { type: 'text/plain;charset=utf-8' });
        const a = document.createElement('a'); a.href = URL.createObjectURL(blob);
        a.download = `veylan-${String(ch.name || 'veilleur').replace(/[^\w.-]+/g, '_')}.txt`;
        document.body.appendChild(a); a.click(); a.remove();
        setTimeout(() => URL.revokeObjectURL(a.href), 2000);
        this.toast('Fichier de sauvegarde téléchargé.');
      } catch (e) { this.toast('Téléchargement impossible ici.'); }
    };
    this.actions.charger = () => {
      const inp = document.createElement('input'); inp.type = 'file'; inp.accept = '.txt,.veylan,text/plain';
      inp.addEventListener('change', () => {
        const f = inp.files && inp.files[0]; if (!f) return;
        f.text().then(t => { const ta = document.getElementById('import-area'); if (ta) ta.value = t.trim(); this.importDraft = t.trim(); this.actions.import(); }, () => this.toast('Fichier illisible.'));
      });
      inp.click();
    };
    this.actions.import = () => {
      const r = Save.importText(document.getElementById('import-area').value);
      if (r.recharge) { this.toast(r.error); Save.write(ch); Save.suspend(); setTimeout(() => location.reload(), 50); return; }
      if (!r.ch) { this.toast(r.error || 'Code invalide.'); return; }
      this.importDraft = ''; Save.write(ch); Save.write(r.ch); Save.suspend(); location.reload();
    };
    this.actions.newgame = (d, b) => {
      if (invite && !b.dataset.sure) { b.dataset.sure = '1'; b.textContent = 'Confirmer : quitter sans garder'; return; }
      if (!invite) Save.write(ch);
      Save.suspend();
      try { sessionStorage.setItem('veylan.entree', invite ? 'accueil' : 'personnages'); } catch (e) {   }
      location.reload();
    };
    const actions = {
      savenow: this.actions.savenow, copy: this.actions.copy, import: this.actions.import, newgame: this.actions.newgame, telecharger: this.actions.telecharger, charger: this.actions.charger,
      theme: d => { this.choisirTheme(d.theme); this.fen.close('options'); this.openMenu(); },
      vital: d => { this.choisirVital(d.vital); this.fen.render('options'); },
      replacer: () => this.fen.resetPositions(),
      optAller: (d, b) => { if (b && b.parentElement) for (const x of b.parentElement.querySelectorAll('[data-act="optAller"]')) x.classList.toggle('on', x === b); const el = document.getElementById('opt-sec-' + d.sec); if (el && el.parentElement) el.parentElement.scrollTo({ top: el.offsetTop - el.parentElement.offsetTop - 6, behavior: 'smooth' }); },
      editeur: () => { this.fen.close('options'); this.syncMenus(); this.ouvrirEditeur(); },
      notifStyle: d => { this.styleNotifs(d.style); this.fen.render('options'); },
      notifEssai: () => this.essaiNotifs(),
      tutoPasser: (d, b) => { if (!b.dataset.sure) { b.dataset.sure = '1'; b.textContent = 'Confirmer : passer'; return; } this.guide.passer(); this.fen.render('options'); },
      tutoRevoir: () => { this.fen.close('options'); this.syncMenus(); this.guide.revoir(); },
    };
    const onField = (el, kind) => {
      if (el.id === 'opt-cherche') { this.optCherche = el.value; this.filtrerOptions(el.value); return; }
      if (this.champNotifs && this.champNotifs(el, kind)) return;
      if (el.id === 'import-area') this.importDraft = el.value;
      if (el.id === 'opt-musique' || el.id === 'opt-bruitages') {
        const v = Math.max(0, Math.min(100, Number(el.value) || 0));
        Son.regler(el.id.slice(4), v);
        el.style.setProperty('--v', v); el.setAttribute('aria-valuetext', `${v} %`);
        const o = el.parentNode.querySelector('output'); if (o) o.textContent = `${v} %`;
        if (kind === 'change' && el.id === 'opt-bruitages') Son.jouer('butin');
        return;
      }
      if (el.id === 'opt-opacite' || el.id === 'opt-taille') {
        const v = el.id === 'opt-taille' ? this.appliquerTaille(Number(el.value), kind === 'change') : this.appliquerVerre(Number(el.value), kind === 'change');
        el.style.setProperty('--v', v); el.setAttribute('aria-valuetext', `${v} %`);
        const o = el.parentNode.querySelector('output'); if (o) o.textContent = `${v} %`;
        return;
      }
      if (kind !== 'change') return;
      if (el.id === 'opt-tuto') { this.guide.choisirMode(el.value); this.fen.render('options'); }
      if (el.id === 'opt-confirmer') { try { localStorage.setItem('veylan.confirmerSorts', el.checked ? '1' : '0'); } catch (e) {   } }
      if (/^opt-combat-/.test(el.id)) { UI.regler(el.id.slice(11), el.checked); if (this.ui && this.ui.updateHighlights) this.ui.updateHighlights(); if (el.id === 'opt-combat-agression' && this.world) this.world.agression = el.checked; }
      if (el.id === 'opt-gaucher' && this.jeu) this.jeu.mettreGaucher(el.checked);
      if (el.id === 'opt-bonus-defi') { if (el.value) ch.bonusDefi = el.value; else delete ch.bonusDefi; Save.write(ch); this.fen.render('options'); if (this.ui && this.ui.renderChallenge) this.ui.renderChallenge(); }
      if (el.id === 'opt-qualite-image') {
        UI.reglerQualiteImage(el.value);
        const V = typeof window === 'object' && window.VEYLAN;
        if (V && V.ile && V.ile.appliquerDensite) V.ile.appliquerDensite();
        if (typeof window === 'object' && typeof Event === 'function') window.dispatchEvent(new Event('resize'));
        this.fen.render('options');
      }
      if (el.id === 'opt-son') { Son.regler('actif', el.checked); if (el.checked) { Son.deverrouiller(); Son.jouer('butin'); } }
      if (el.id === 'opt-plein-ecran') PleinEcran.basculer().then(() => { if (this.fen.isOpen('options')) this.fen.render('options'); });
    };
    if (!this.suitPleinEcran) { this.suitPleinEcran = true; PleinEcran.surChangement(() => { if (this.fen.isOpen('options')) this.fen.render('options'); }); }
    this.simpleWin('options', 'Options', html, actions, { width: 760, cls: 'vy-fenetre--options', onField });
  }


  openDialogue(ctx) {
    this.dialogue = ctx;
    this.conversation.ouvrir(ctx);
  }

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

  questDoneHtml(npc, q, r, before) {
    const lines = (before || []).concat((q.dialogue && q.dialogue.done) || []);
    const gained = r.first === false ? 'déjà reçu' : rewardText(q.rewards);
    return `<div class="dialogue"><div class="npc-face look-${npc.def.look || 'marcheur'}"></div><div class="npc-text"><b>${esc(npc.def.name)}</b><h3>${esc(q.name)} : terminée</h3><p>${lines.map(esc).join('<br>')}</p><div class="muted">Gagné : ${gained}${r.levels ? ` · niveau ${this.world.ch.level} !` : ''}</div></div></div>
        <div class="dialogue-actions"><button data-act="back">Continuer</button></div>`;
  }

  svcBarre(onglets, extra) {
    return `<div class="vy-svc__barre">${onglets ? `<nav class="vy-svc__onglets">${onglets}</nav>` : '<span></span>'}${extra || ''}${Hud.svcBourse(this.world.ch.fils)}</div>`;
  }

  openShop(ctx) {
    this.shopTab = this.shopTab || 'buy';
    const render = () => {
      const ch = this.world.ch;
      const onglet = (k, l) => `<button class="vy-svc__onglet${this.shopTab === k ? ' on' : ''}" data-act="stab" data-tab="${k}">${l}</button>`;
      const tete = this.svcBarre(onglet('buy', 'Acheter') + onglet('sell', 'Vendre'));
      if (this.shopTab === 'sell') {
        const entries = Object.entries(ch.inventory).map(([id, n]) => ({ def: Items.get(id), id, n })).filter(e => e.def).sort((a, b) => a.def.name.localeCompare(b.def.name));
        return tete + `<div class="vy-svc__liste">${entries.map(e => Hud.svcLigne(e.def, { n: e.n, sous: `${Items.sellPrice(e.def)} Dragmes l'unité`, gestes: `<button class="vy-bouton vy-bouton--petit" data-act="sell" data-id="${e.id}">Vendre 1 (${Items.sellPrice(e.def)} F)</button>${e.n > 1 ? `<button class="vy-bouton vy-bouton--petit" data-act="sellall" data-id="${e.id}" data-n="${e.n}">Tout (${Items.sellPrice(e.def) * e.n} F)</button>` : ''}` })).join('') || '<p class="vy-svc__vide">Rien à vendre.</p>'}</div>`;
      }
      return tete + `<div class="vy-svc__liste">${(ctx.shop || []).map(id => { const d = Items.get(id); if (!d) return ''; const info = d.kind === 'consumable' ? (d.heal ? `rend ${d.heal >= 999 ? 'tous les' : d.heal} PV` : esc(d.lore)) : `niv. ${d.level} · ${Items.statLines(d.stats).join(', ')}`;
        const pile = d.kind === 'consumable' || d.kind === 'resource';
        return Hud.svcLigne(d, { sous: info, n: ch.count(id) || 0, possede: true, gestes: `${Hud.svcPrix(d.price)}<button class="vy-bouton vy-bouton--petit vy-bouton--primaire" data-act="buy" data-id="${id}" ${ch.fils >= d.price ? '' : 'disabled'}>Acheter</button>${pile ? `<button class="vy-bouton vy-bouton--petit" data-act="buy" data-id="${id}" data-n="10" ${ch.fils >= d.price * 10 ? '' : 'disabled'}>×10</button>` : ''}` }); }).join('')}</div>`;
    };
    this.actions.stab = d => { this.shopTab = d.tab; this.el.panelBody.innerHTML = render(); };
    this.actions.buy = d => { this.world.buy(d.id, Number(d.n) || 1); };
    this.actions.sell = d => { this.world.sell(d.id, 1); };
    this.actions.sellall = d => { this.world.sell(d.id, Number(d.n)); };
    this.openPanel('dialogue', `Boutique de ${ctx.npc.def.name}`, render(), () => { this.el.panelBody.innerHTML = render(); });
  }

  openBanque(ctx) {
    const render = () => {
      const ch = this.world.ch, c = ch.coffre || { items: {}, fils: 0 };
      const trie = o => Object.entries(o).filter(([id]) => Items.get(id)).sort((a, b) => Items.get(a[0]).name.localeCompare(Items.get(b[0]).name));
      const ligne = (id, n, act, lab) => Hud.svcLigne(Items.get(id), { n, gestes: `<button class="vy-bouton vy-bouton--petit" data-act="${act}" data-id="${id}" data-n="1">${lab}</button>${n > 1 ? `<button class="vy-bouton vy-bouton--petit" data-act="${act}" data-id="${id}" data-n="${n}">Tout</button>` : ''}` });
      const fils = (act, n, lab) => `<button class="vy-bouton vy-bouton--petit" data-act="${act}" data-n="${n}"${n >= 1 ? '' : ' disabled'}>${lab}</button>`;
      const sac = trie(ch.inventory).map(([id, n]) => ligne(id, n, 'bdeposer', 'Déposer')).join('') || '<p class="vy-svc__vide">Ton sac est vide.</p>';
      const coffre = trie(c.items).map(([id, n]) => ligne(id, n, 'bretirer', 'Retirer')).join('') || '<p class="vy-svc__vide">Le coffre est vide.</p>';
      return `<div class="banque"><section class="banque__col"><h4>Ton sac</h4><p class="banque__fils">${Hud.svcBourse(ch.fils)} <span class="btns">${fils('bdeposerfils', Math.min(100, ch.fils), 'Déposer 100')}${fils('bdeposerfils', ch.fils, 'Tout')}</span></p><div class="vy-svc__liste">${sac}</div></section>`
        + `<section class="banque__col"><h4><img class="banque__coffre" src="assets/ui/objets/coffre-banque.png" alt="" draggable="false">Ton coffre</h4><p class="banque__fils">${Hud.svcBourse(c.fils)} <span class="btns">${fils('bretirerfils', Math.min(100, c.fils), 'Retirer 100')}${fils('bretirerfils', c.fils, 'Tout')}</span></p><div class="vy-svc__liste">${coffre}</div></section></div>`;
    };
    this.actions.bdeposer = d => { this.world.deposer(d.id, Number(d.n)); };
    this.actions.bretirer = d => { this.world.retirer(d.id, Number(d.n)); };
    this.actions.bdeposerfils = d => { this.world.deposerFils(Number(d.n)); };
    this.actions.bretirerfils = d => { this.world.retirerFils(Number(d.n)); };
    this.openPanel('dialogue', `La Banque de l'Aube, ${ctx.npc.def.name}`, render(), () => { this.el.panelBody.innerHTML = render(); });
  }

  openMarche(ctx) {
    const g = ctx.marche, G = Marche.GENRES[g];
    this.marcheTab = this.marcheTab || 'acheter';
    const render = () => {
      const ch = this.world.ch;
      const onglet = (k, l) => `<button class="vy-svc__onglet${this.marcheTab === k ? ' on' : ''}" data-act="mtab" data-tab="${k}">${l}</button>`;
      const tete = this.svcBarre(onglet('acheter', 'L\'étal du jour') + onglet('vendre', 'Vendre'), `<small class="vy-svc__genre">${esc(G.nom[0].toUpperCase() + G.nom.slice(1))}</small>`);
      if (this.marcheTab === 'vendre') {
        const entries = Object.entries(ch.inventory).filter(([id]) => Marche.rachete(g, id)).map(([id, n]) => ({ def: Items.get(id), id, n })).sort((a, b) => a.def.name.localeCompare(b.def.name));
        const note = `<p class="vy-svc__note">Le Marché paie mieux qu'un marchand ; le prix d'un objet baisse de ${Math.round(Marche.BAISSE * 100)} % à chaque vente du même objet aujourd'hui (jusqu'à la moitié) et revient demain.</p>`;
        return tete + note + `<div class="vy-svc__liste">${entries.map(e => { const pr = Marche.prixVente(ch, e.id), v = Marche.vendus(ch, e.id); return Hud.svcLigne(e.def, { n: e.n, sous: v ? `${v} vendu${v > 1 ? 's' : ''} aujourd'hui` : `${pr} Dragmes l'unité aujourd'hui`, gestes: `<button class="vy-bouton vy-bouton--petit" data-act="mvendre" data-id="${e.id}" data-n="1">Vendre 1 (${pr} F)</button>${e.n > 1 ? `<button class="vy-bouton vy-bouton--petit" data-act="mvendre" data-id="${e.id}" data-n="${e.n}">Tout (${Marche.gain(ch, e.id, e.n)} F)</button>` : ''}` }); }).join('') || '<p class="vy-svc__vide">Rien de ce genre dans ton sac.</p>'}</div>`;
      }
      return tete + `<div class="vy-svc__liste">${Marche.etal(g).map(id => { const d = Items.get(id), prix = Marche.prixAchat(id); const info = d.kind === 'consumable' ? (d.heal ? `rend ${d.heal >= 999 ? 'tous les' : d.heal} PV` : esc(d.lore)) : d.kind === 'resource' ? esc(d.lore || 'Ressource') : `niv. ${d.level} · ${Items.statLines(d.stats).join(', ')}`;
        return Hud.svcLigne(d, { sous: info, gestes: `${Hud.svcPrix(prix)}<button class="vy-bouton vy-bouton--petit vy-bouton--primaire" data-act="macheter" data-id="${id}" ${ch.fils >= prix ? '' : 'disabled'}>Acheter</button>` }); }).join('')}</div><p class="vy-svc__note">L'étal change chaque jour.</p>`;
    };
    this.actions.mtab = d => { this.marcheTab = d.tab; this.el.panelBody.innerHTML = render(); };
    this.actions.macheter = d => { this.world.acheterMarche(d.id, 1); };
    this.actions.mvendre = d => { this.world.vendreMarche(d.id, Number(d.n)); };
    this.openPanel('dialogue', `Le Marché des Cimes, ${ctx.npc.def.name}`, render(), () => { this.el.panelBody.innerHTML = render(); });
  }

  openMetiers(ctx) {
    const ateliers = (typeof Veille === 'object' && Veille.ATELIERS) || {};
    const res = id => (DATA.content.resources || []).find(r => r.id === id);
    const render = () => {
      const lignes = Object.keys(ateliers).map(k => {
        const recettes = Items.recipes().filter(r => r.workshop === k && Items.get(r.result));
        if (!recettes.length) return '';
        const niv = recettes.map(r => Items.get(r.result).level || 1), compte = {};
        for (const r of recettes) for (const i of r.ingredients || []) compte[i.id] = (compte[i.id] || 0) + i.count;
        const top = Object.entries(compte).sort((a, b) => b[1] - a[1]).slice(0, 4).map(([id]) => { const d = Items.get(id), r = res(id); return d ? `<span class="vy-svc__puce">${Hud.picto(d)}${esc(d.name)}${r ? ` <small>${r.node ? 'récolte' : 'butin'}</small>` : ''}</span>` : ''; }).filter(Boolean).join('');
        const artisans = DATA.content.npcs.filter(n => n.workshop === k).map(n => esc(n.name)).join(', ');
        const ex = recettes.slice().sort((a, b) => (Items.get(a.result).level || 1) - (Items.get(b.result).level || 1)).slice(0, 4).map(r => Items.get(r.result));
        return `<article class="vy-svc__atelier"><header><b>L'atelier ${esc(ateliers[k])}</b><small>${recettes.length} recettes · niveaux ${Math.min(...niv)} à ${Math.max(...niv)}</small></header>
          <p><small>Artisans</small>${artisans || 'aucun'}</p>
          <div class="vy-svc__exemples">${ex.map(d => `<span class="vy-case" data-rarete="${Items.rarity(d)}" title="${esc(d.name)}"><span class="vy-case__icone">${Hud.picto(d)}</span></span>`).join('')}<small>On y fait : ${ex.slice(0, 3).map(d => esc(d.name)).join(', ')}…</small></div>
          <div class="vy-svc__demande"><small>Ce qu'il demande le plus</small>${top}</div></article>`;
      }).join('');
      return `<p class="vy-svc__note">Chaque métier a son atelier dans la Rue des Ateliers, à l'est de la Place : parle à l'artisan, ou touche sa machine.</p><div class="vy-svc__ateliers">${lignes}</div>`;
    };
    this.openPanel('dialogue', `L'Hôtel des Métiers, ${ctx.npc.def.name}`, render(), () => { this.el.panelBody.innerHTML = render(); });
  }

  openAvis(ctx) {
    const render = () => {
      const ch = this.world.ch;
      const lignes = Avis.liste().map(a => {
        const m = DATA.monsters[a.monstre] || { name: a.monstre, color: '#aaa' }, s = Avis.statut(ch, a.id), p = a.prime;
        const prime = `${p.xp} XP, ${p.fils} Dragmes, ${p.sceaux} Insigne${p.sceaux > 1 ? 's' : ''} de la Garde`;
        const bouton = s === 'libre' ? `<button class="vy-bouton vy-bouton--petit vy-bouton--primaire" data-act="aprendre" data-id="${a.id}">Prendre l'avis</button>`
          : s === 'pris' ? `<button class="vy-bouton vy-bouton--petit" data-act="alacher" data-id="${a.id}">Renoncer</button>`
          : s === 'capture' ? `<button data-act="arendre" data-id="${a.id}" class="vy-bouton vy-bouton--petit vy-bouton--primaire primary">Toucher la prime</button>`
          : '<small class="vy-svc__fait">Prime touchée : un nouvel avis demain</small>';
        const etat = s === 'pris' ? '<span class="vy-svc__etat cours">En chasse</span>' : s === 'capture' ? '<span class="vy-svc__etat fait">Capturé, la prime t\'attend</span>' : '';
        const img = this.portraitBete ? this.portraitBete(a.monstre, 56, 62) : '';
        return `<article class="vy-svc__avis${s === 'rendu' ? ' dim' : ''}" data-avis="${a.id}">${img ? `<img src="${img}" alt="" draggable="false">` : ''}<div><b style="color:${m.color}">${esc(m.name)}</b> <small>niv. ${a.niveau}</small>${etat}<p>${esc(a.texte)}</p><small>Vu ${esc(a.lieu)}. Prime : ${prime}.</small></div><span class="vy-svc__gestes">${bouton}</span></article>`;
      }).join('');
      return `<p class="vy-svc__note">Prends un avis : sa cible se joint à un groupe de sa carte, son nom sur l'étiquette. Bats-la, puis reviens toucher la prime. Chaque avis se rend une fois par jour ; les Insignes s'échangent au Temple des Voies.</p><div class="vy-svc__liste">${lignes}</div>`;
    };
    this.actions.aprendre = d => { this.world.prendreAvis(d.id); };
    this.actions.alacher = d => { this.world.abandonnerAvis(d.id); };
    this.actions.arendre = d => { this.world.rendreAvis(d.id); };
    this.openPanel('dialogue', `Les avis de recherche, ${ctx.npc.def.name}`, render(), () => { this.el.panelBody.innerHTML = render(); });
  }

  openTemple(ctx) {
    const render = () => {
      const ch = this.world.ch, n = ch.count(Avis.SCEAU), ins = Items.get(Avis.SCEAU);
      const lignes = Avis.ECHANGES.map(e => {
        const d = Items.get(e.id);
        if (!d) return '';
        const info = d.sub === 'parchemin' ? `+${d.value} ${esc((Items.STAT_LABEL && Items.STAT_LABEL[d.stat]) || d.stat)} pour toujours` : d.heal ? `rend ${d.heal >= 999 ? 'tous les' : d.heal} PV` : esc(d.lore || '');
        return Hud.svcLigne(d, { sous: info, gestes: `<button class="vy-bouton vy-bouton--petit vy-bouton--primaire" data-act="techanger" data-id="${e.id}" ${n >= e.sceaux ? '' : 'disabled'}>${e.sceaux} Insigne${e.sceaux > 1 ? 's' : ''}</button>` });
      }).join('');
      return `<div class="vy-svc__barre"><span class="vy-svc__note">On gagne les Insignes aux avis de recherche, à la tour de la Garde sur la Place.</span><span class="vy-svc__bourse" title="Tes Insignes de la Garde">${ins ? Hud.picto(ins) : ''}<b>${n}</b><small>Insigne${n > 1 ? 's' : ''}</small></span></div><p class="vy-svc__note">Tu as ${n} Insigne${n > 1 ? 's' : ''} de la Garde.</p><div class="vy-svc__liste">${lignes}</div>`;
    };
    this.actions.techanger = d => { this.world.echangerTemple(d.id); };
    this.openPanel('dialogue', `Le Temple des Voies, ${ctx.npc.def.name}`, render(), () => { this.el.panelBody.innerHTML = render(); });
  }

  openWorkshop(ctx) {
    const render = () => {
      const ch = this.world.ch;
      const M = typeof Metiers === 'object' ? Metiers : null;
      const ateliers = M ? M.ateliersDe(ctx.workshop) : [ctx.workshop];
      const recipes = Items.recipes().filter(r => ateliers.includes(r.workshop)).map(r => ({ r, def: Items.get(r.result) })).filter(x => x.def).sort((a, b) => a.def.level - b.def.level);
      const metiers = M ? [...new Set(recipes.map(x => M.deAtelier(x.r.workshop)).filter(Boolean))] : [];
      const tete = metiers.map(m => `${esc(m.nom)} niv. ${M.niveau(ch, m.id)}`).join(' · ');
      const remise = typeof Veille === 'object' ? Veille.remise(ch, ctx.workshop) : 0;
      const faisables = !!this.atelierFaisables;
      const rows = recipes.map(({ r, def }) => {
        const cost = this.world.recipeCost(r);
        const permis = M ? M.peutFabriquer(ch, r) : { ok: true };
        const ok = permis.ok && cost.every(i => ch.has(i.id, i.count));
        if (faisables && !ok) return '';
        const ings = cost.map(i => { const d = Items.get(i.id); const have = ch.count(i.id); return `<span class="vy-svc__ingr ${have >= i.count ? 'ok' : 'missing'}" title="${d ? esc(d.name) : i.id}">${d ? Hud.picto(d) : ''}${d ? esc(d.name) : i.id} ${have}/${i.count}</span>`; }).join('');
        const info = def.kind === 'consumable' ? (def.heal ? `rend ${def.heal >= 999 ? 'tous les' : def.heal} PV` : esc(def.lore)) : Items.statLines(def.stats).join(', ');
        return Hud.svcLigne(def, { cls: ok ? 'faisable' : 'dim', n: r.count > 1 ? r.count : 0, titre: `${esc(def.name)}${r.count > 1 ? ` ×${r.count}` : ''} <small>niv. ${def.level}</small>${permis.ok ? '' : ` <small class="missing">${esc(permis.raison)}</small>`}`, sous: `${info}<span class="vy-svc__ingrs">${ings}</span>`, gestes: `<button class="vy-bouton vy-bouton--petit${ok ? ' vy-bouton--primaire' : ''}" data-act="craft" data-id="${r.result}" ${ok ? '' : 'disabled'}>Fabriquer</button>` });
      }).join('');
      const bascule = `<label class="vy-coche vy-svc__faisables"><input type="checkbox" data-act="atelierFaisables" ${faisables ? 'checked' : ''}> Faisables seulement</label>`;
      return `<div class="vy-svc__barre"><span class="vy-svc__note">Atelier : ${ctx.workshop}${tete ? ` · ${tete}` : ''}. Les ingrédients viennent des monstres et de la récolte.${remise ? ` <b class="ok">Veille du jour : ${remise} % de ressources en moins.</b>` : ''}</span>${bascule}</div><div class="vy-svc__liste">${rows || `<p class="vy-svc__vide">${faisables ? 'Rien de faisable avec ton sac pour l\'instant.' : 'Aucune recette.'}</p>`}</div>`;
    };
    this.actions.craft = d => { const r = Items.recipeFor(d.id); if (r) this.world.craft(r); };
    this.actions.atelierFaisables = () => { this.atelierFaisables = !this.atelierFaisables; this.el.panelBody.innerHTML = render(); };
    this.openPanel('dialogue', ctx.npc.machine ? ctx.npc.def.name : `Atelier de ${ctx.npc.def.name}`, render(), () => { this.el.panelBody.innerHTML = render(); });
  }


  openRelay(d) {
    const zones = [];
    for (const k of d.known) { const z = k.zone ? k.zone.name : 'Ailleurs'; let g = zones.find(x => x.nom === z); if (!g) zones.push(g = { nom: z, l: [] }); g.l.push(k); }
    const rows = `<div class="vy-svc__relais">${zones.map(g => `<section><h4>${esc(g.nom)}</h4>${g.l.map(k => `<div class="vy-svc__relai${k.id === d.here ? ' ici' : ''}"><span>${k.def ? esc(k.def.name) : k.id}</span>${k.id === d.here ? '<small class="muted">ici</small>' : `<button class="vy-bouton vy-bouton--petit" data-act="tp" data-id="${k.id}">Aller</button>`}</div>`).join('')}</section>`).join('')}</div>`;
    this.actions.tp = x => { this.closePanel(); this.world.teleport(x.id); };
    this.actions.relayCarte = () => this.openMapFromRelay();
    this.actions.relayVeille = () => this.openVeilleFromRelay();
    this.openPanel('relay', 'Relais de l\'Aube', `<p class="muted">Point de retour enregistré ici. Tu peux rejoindre un autre relais connu.</p>${rows}<div class="row center"><button class="vy-bouton vy-bouton--petit" data-act="relayCarte">Choisir sur la carte du monde</button>${this.veilleBouton ? this.veilleBouton() : ''}</div>`);
  }

  openDungeonPrompt(d) {
    if (!d) return;
    const lvl = d.level ? `niveaux ${d.level[0]} à ${d.level[1]}` : '';
    const peut = this.world.canEnterDungeon ? this.world.canEnterDungeon(d) : { ok: true };
    const e = d.entree || {};
    const q = e.quete && Quests.get(e.quete);
    const entree = e.niveau || q ? `<p class="muted">Pour entrer : ${[e.niveau ? 'niveau ' + e.niveau : '', q ? 'la quête « ' + esc(q.name) + ' »' : ''].filter(Boolean).join(' et ')}${d.entreeEnCombat ? ' · le combat s\'engage à l\'entrée de chaque salle' : ''}.</p>` : '';
    this.actions.enterd = () => { if (!peut.ok) { this.toast(peut.reason); return; } this.closePanel(); this.world.enterDungeon(d.id); };
    const salle = (d.rooms || []).filter(x => x.boss).pop() || (d.rooms || [])[d.rooms.length - 1] || {};
    const bossId = ((salle.monsters || []).find(m => DATA.monsters[m.id] && DATA.monsters[m.id].boss) || (salle.monsters || [])[0] || {}).id;
    const boss = bossId && DATA.monsters[bossId], img = boss && this.portraitBete ? this.portraitBete(bossId, 120, 131) : '';
    const fait = (this.world.ch.counters.dungeons || []).includes(d.id);
    const tete = `<div class="vy-fdd__boss vy-entree-donjon">${img ? `<img src="${img}" alt="" draggable="false">` : ''}<div><small>${fait ? 'Donjon terminé' : 'Donjon'}</small><h3>${esc(d.name)}</h3>${lvl ? `<span class="vy-fdd__niv">${lvl}</span>` : ''}${boss ? `<p class="vy-fdd__tours">Au bout : ${esc(boss.name)} · ${d.rooms.length} salles</p>` : ''}</div></div>`;
    this.openPanel('dungeon', d.name, `<div class="vy-fdd">${tete}<p>${esc(d.description || '')}</p><p class="muted">${lvl} · ${d.rooms.length} salles${Hud.texteCle(this.world, d)}</p>${entree}${peut.ok ? '' : `<p class="missing">${esc(peut.reason)}</p>`}<div class="row center"><button data-act="enterd" class="primary vy-bouton vy-bouton--primaire"${peut.ok ? '' : ' disabled'}>Entrer</button></div></div>`);
  }

  annoncerZone(d) {
    const w = this.world, def = d && d.map ? World.mapDef(d.map) : null;
    if (!def || !this.ui || !this.ui.ruban) return;
    this.zonesVues = this.zonesVues || new Map();
    const t = w.time || 0, avant = this.zonesVues.get(d.map);
    if (avant != null && t - avant < 20 && !d.nouveau) return;
    this.zonesVues.set(d.map, t);
    const l = def.level, niveau = Array.isArray(l) ? (l[0] === l[1] ? `niveau ${l[0]}` : `niveaux ${l[0]} à ${l[1]}`) : '';
    const sous = [def.name, niveau].filter(Boolean).join(', ') + (d.nouveau ? ' · Lieu découvert' : '');
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
    if (r.entrainement) {
      const e = r.entrainement;
      this.actions.cont = () => this.closePanel();
      this.openPanel('fightEnd', 'Entraînement au Dojo', `<p class="big win">Entraînement terminé</p><div class="row"><span>Dégâts infligés</span><b>${e.degats}</b></div><div class="row"><span>Tours</span><b>${e.tours}</b></div><div class="row"><span>Moyenne par tour</span><b>${Math.round(e.degats / Math.max(1, e.tours))}</b></div><div class="row"><span>Mannequins abattus</span><b>${e.abattus} sur ${e.total}</b></div><p class="muted">Au Dojo, ni gain ni perte : tes PV sont ceux d'avant le combat.</p><div class="row center"><button data-act="cont" class="primary">Continuer</button></div>`);
      return;
    }
    const drops = r.drops.map(d => { const def = Items.get(d.id); return `<li>${def ? esc(def.name) : d.id}${d.count > 1 ? ' ×' + d.count : ''}</li>`; }).join('');
    const achs = r.achievements.map(a => `<li>${esc(a.achievement.name)}${a.title ? ' · titre « ' + esc(a.title) + ' »' : ''}</li>`).join('')
      + (r.cosmetiques || []).map(e => `<li>${esc(World.texteCosmetique(e))}</li>`).join('');
    const quests = r.quests.filter((t, i, arr) => arr.findIndex(x => x.quest === t.quest) === i).map(t => `<li>${esc(t.quest.name)} : ${t.finished ? 'terminée, à rendre à ' + esc(Quests.npcName(Quests.turnInOf(t.quest))) : esc(Quests.stepText(ch, t.quest.id))}</li>`).join('');
    const bd = r.bonusDefi || {}, vers = bd.mode === 'xp' ? ' d\'XP' : bd.mode === 'butin' ? ' de butin' : '';
    const chal = (r.challenges || (r.challenge ? [r.challenge] : [])).map(c => `<div class="row"><span>Défi : ${esc(c.name)}</span><b class="${c.success ? 'ok' : 'missing'}">${c.success ? `réussi, +${bd.mode ? 2 * c.bonus : c.bonus} %${vers}` : 'raté'}</b></div>`).join('');
    const epr = r.epreuveDojo ? `<div class="row"><span>Épreuve du jour</span><b>${r.epreuveDojo.tours} tour${r.epreuveDojo.tours > 1 ? 's' : ''}${r.epreuveDojo.sceaux ? ' · un Insigne de la Garde' : ` · plus de ${r.epreuveDojo.limite} tours, sans Insigne`}</b></div>` : '';
    const fam = r.familier ? `<div class="row"><span>${esc(r.familier.nom)}</span><b>+${r.familier.xp} XP${r.familier.niveaux ? ` · niveau ${r.familier.niveau} !` : ''}</b></div>` : '';
    if (r.familier && r.familier.niveaux) this.chat('gain', `${r.familier.nom} passe au niveau ${r.familier.niveau}.`);
    const mont = r.monture ? `<div class="row"><span>${esc(r.monture.nom)} (${nfr(r.monture.cede)} XP cédés)</span><b>+${r.monture.xp} XP${r.monture.niveaux ? ` · niveau ${r.monture.niveau} !` : ''}</b></div>` : '';
    if (r.monture && r.monture.niveaux) this.chat('gain', `${r.monture.nom} passe au niveau ${r.monture.niveau}.`);
    let dungeon = '';
    if (r.dungeon) dungeon = r.dungeon.cleared ? `<div class="vy-fdc__donjon"><img class="vy-coffre-donjon" src="assets/ui/objets/coffre-donjon.png" alt="Le coffre du donjon, ouvert" draggable="false"><div><b>Donjon terminé : ${esc(r.dungeon.def.name)} !</b>${r.dungeon.turns ? `<span>En ${r.dungeon.turns} tours, toutes salles comprises.</span>` : ''}</div></div>` : `<p class="muted">Salle suivante : ${esc(r.dungeon.def.rooms[r.dungeon.next].name)}</p>`;
    const xpMax = ch.level >= Character.MAX_LEVEL, xpPct = xpMax ? 100 : Math.floor(ch.xpProgress() * 100);
    const tuiles = r.victory ? `<div class="vy-fdc__tuiles">
        <div class="vy-fdc__tuile xp"><small>Expérience</small><b>+${nfr(r.gained)} XP</b><span class="vy-fdc__jauge"><i style="width:${xpPct}%"></i></span><em>${r.levels ? `Niveau ${ch.level} !` : `Niveau ${ch.level} · ${xpPct} %`}</em></div>
        <div class="vy-fdc__tuile fils"><small>Dragmes</small><b>+${nfr(r.fils)}</b><em>${nfr(ch.fils)} en poche</em></div>
      </div>` : '';
    const butin = r.drops.map(d => { const def = Items.get(d.id); return def ? `<span class="vy-case vy-fdc__objet" data-rarete="${Items.rarity(def)}" title="${esc(def.name)}${d.count > 1 ? ' ×' + d.count : ''}"><span class="vy-case__icone">${Hud.picto(def)}</span>${d.count > 1 ? `<span class="vy-case__nombre">${d.count}</span>` : ''}</span>` : ''; }).join('');
    const resume = r.victory
      ? `${tuiles}${fam}${mont}${chal}${epr}${r.veille ? `<div class="row"><span>Veille du jour</span><b class="ok">${esc(r.veille)}</b></div>` : ''}${r.knots ? `<div class="row"><span>Nœuds noués : ${r.knots}</span><b class="ok">+${r.knots * DATA.rules.knotBonus} %</b></div>` : ''}${r.repos ? `<div class="row"><span>Repos de la zone</span><b class="ok">+${r.repos} %</b></div>` : ''}${drops ? `<h4>Butin</h4><div class="vy-fdc__butin">${butin}</div><ul class="vy-fdc__butin-noms">${drops}</ul>` : '<p class="muted">Aucun butin cette fois.</p>'}${quests ? `<h4>Quêtes</h4><ul>${quests}</ul>` : ''}${(r.avis || []).length ? `<h4>Avis de recherche</h4><ul>${r.avis.map(a => `<li>${esc(a.nom)} capturé : la prime t'attend à la tour de la Garde, sur la Place du Relais.</li>`).join('')}</ul>` : ''}${achs ? `<h4>Succès</h4><ul>${achs}</ul>` : ''}`
      : `<p class="vy-fdc__defaite">Tu reviens au Relais de l'Aube avec la moitié de tes PV.</p>`;
    const dureeTxt = r.duree ? (r.duree >= 60 ? `${Math.floor(r.duree / 60)} min ${String(r.duree % 60).padStart(2, '0')} s` : `${r.duree} s`) : '';
    const meta = [r.tours ? `${r.tours} tour${r.tours > 1 ? 's' : ''}` : '', dureeTxt].filter(Boolean).join(' · ');
    const stats = this.statsCombat(r.bilan || []);
    const donjon = r.victory && r.dungeon && r.dungeon.cleared && UI.reglage('finDonjon') ? this.ficheFinDonjon(r.dungeon) : '';
    const html = `<div class="vy-fdc ${r.victory ? 'gagne' : 'perdu'}">
      <header class="vy-fdc__tete"><p class="big ${r.victory ? 'win' : 'lose'} vy-fdc__issue">${r.victory ? 'Victoire' : 'Défaite'}</p>${meta ? `<span class="vy-fdc__meta">${meta}</span>` : ''}</header>
      ${dungeon}
      ${stats || donjon ? `<nav class="vy-onglets vy-fdc__onglets" role="tablist">${donjon ? '<button type="button" class="vy-onglet on" role="tab" aria-selected="true" data-act="fdcOnglet" data-page="donjon">Donjon</button>' : ''}<button type="button" class="vy-onglet${donjon ? '' : ' on'}" role="tab" aria-selected="${!donjon}" data-act="fdcOnglet" data-page="resume">Résumé</button>${stats ? '<button type="button" class="vy-onglet" role="tab" aria-selected="false" data-act="fdcOnglet" data-page="stats">Statistiques</button>' : ''}</nav>` : ''}
      ${donjon ? `<section class="vy-fdc__page" data-page="donjon">${donjon}</section>` : ''}
      <section class="vy-fdc__page" data-page="resume"${donjon ? ' hidden' : ''}>${resume}</section>
      ${stats ? `<section class="vy-fdc__page" data-page="stats" hidden>${stats}</section>` : ''}
    </div>`;
    this.actions.cont = () => this.closePanel();
    this.actions.fdcOnglet = d => {
      for (const b of this.el.panelBody.querySelectorAll('.vy-fdc__onglets .vy-onglet')) { const on = b.dataset.page === d.page; b.classList.toggle('on', on); b.setAttribute('aria-selected', String(on)); }
      for (const sct of this.el.panelBody.querySelectorAll('.vy-fdc__page')) sct.hidden = sct.dataset.page !== d.page;
    };
    this.openPanel('fightEnd', r.victory ? 'Combat gagné' : 'Combat perdu', `${html}<div class="row center"><button data-act="cont" class="primary">Continuer</button></div>`);
    if (r.victory && this.majeuresDe) { const l = this.majeuresDe(r); if (l.length) this.recompenseMajeure(l); }
  }

  ficheFinDonjon(dj) {
    const ch = this.world.ch, dd = dj.def;
    const salle = (dd.rooms || []).filter(x => x.boss).pop() || (dd.rooms || [])[dd.rooms.length - 1] || {};
    const bossId = ((salle.monsters || []).find(m => DATA.monsters[m.id] && DATA.monsters[m.id].boss) || (salle.monsters || [])[0] || {}).id;
    const boss = bossId && DATA.monsters[bossId];
    const lv = ((salle.monsters || []).find(m => m.id === bossId) || {}).level;
    const img = boss && this.portraitBete ? this.portraitBete(bossId, 150, 164) : '';
    const lies = typeof Achievements === 'object' ? Achievements.defs().filter(a => Achievements.pourPerso(ch, a) && a.cond && (a.cond.dungeon === dd.id || (bossId && a.cond.monster === bossId && /boss|noeudsBoss|bossDefi/.test(a.cond.type)))) : [];
    const succes = lies.map(a => { const ok = (ch.achievements || []).includes(a.id);
      return `<li class="${ok ? 'ok' : ''}"><span class="vy-fdd__coche" aria-hidden="true">${ok ? '✓' : ''}</span><span>${esc(a.name)}</span><small>${esc(a.desc || '')}</small></li>`; }).join('');
    return `<div class="vy-fdd">
      <div class="vy-fdd__boss">${img ? `<img src="${img}" alt="" draggable="false">` : ''}<div><small>${esc(dd.name)}</small><h3>${boss ? esc(boss.name) : 'Donjon terminé'}</h3>${lv ? `<span class="vy-fdd__niv">niv. ${lv}</span>` : ''}</div></div>
      ${succes ? `<h4>Succès du donjon</h4><ul class="vy-fdd__succes">${succes}</ul>` : ''}
      ${boss && boss.desc ? `<h4>Stratégie</h4><p class="vy-fdd__strat">${esc(boss.desc)}</p>` : ''}
      <label class="vy-coche vy-fdd__couper"><input type="checkbox" id="opt-combat-finDonjon" checked> Montrer cette fiche à la fin d'un donjon</label>
    </div>`;
  }

  statsCombat(bilan) {
    if (!bilan.length) return '';
    const cols = [['degats', 'Dégâts'], ['soins', 'Soins'], ['boucliers', 'Boucliers'], ['recus', 'Reçus']];
    const max = {};
    for (const [k] of cols) max[k] = Math.max(1, ...bilan.map(b => b[k] || 0));
    const ligne = b => `<div class="vy-fdc__ligne${b.moi ? ' moi' : ''}${b.vivant ? '' : ' mort'}"><span class="vy-fdc__nom">${esc(b.nom)}${b.niveau ? `<small>niv. ${b.niveau}</small>` : ''}</span>` +
      cols.map(([k]) => `<span class="vy-fdc__val ${k}"><b>${nfr(b[k] || 0)}</b><i style="width:${Math.round(100 * (b[k] || 0) / max[k])}%"></i></span>`).join('') + '</div>';
    const bloc = (titre, l, cls) => l.length ? `<div class="vy-fdc__equipe ${cls}"><div class="vy-fdc__ligne vy-fdc__entete"><span class="vy-fdc__nom">${titre}</span>${cols.map(([, t]) => `<span class="vy-fdc__val">${t}</span>`).join('')}</div>${l.map(ligne).join('')}</div>` : '';
    const tri = l => l.slice().sort((a, b) => (b.moi - a.moi) || (b.degats - a.degats));
    return bloc('Alliés', tri(bilan.filter(b => b.equipe === 'player')), 'allies') + bloc('Adversaires', tri(bilan.filter(b => b.equipe !== 'player')), 'adverses');
  }

  filtrerOptions(q) {
    const w = this.fen && this.fen.wins.get('options');
    if (!w) return;
    const plie = t => String(t || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
    const f = plie(q).trim();
    const motif = f ? new RegExp('(^|[^a-z0-9])' + f.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')) : null;
    const repond = t => motif.test(t);
    for (const sec of w.body.querySelectorAll('.vy-opt__sec')) {
      const titre = plie((w.body.querySelector(`.vy-opt__nav [data-sec="${sec.dataset.sec}"]`) || {}).textContent);
      const tout = !f || repond(titre);
      let reste = 0;
      for (const el of sec.querySelectorAll(':scope > .row, :scope > .vy-reglage, :scope > p, :scope > textarea, .vy-theme, .vy-style-vital, .vy-opt__touche')) {
        const ok = tout || repond(plie(el.textContent + ' ' + (el.querySelector('select, input') ? [...el.querySelectorAll('option')].map(o => o.textContent).join(' ') : '')));
        el.classList.toggle('vy-opt-cache', !ok);
        if (ok) reste++;
      }
      for (const h of sec.querySelectorAll(':scope > h4')) {
        let n = h.nextElementSibling, vu = false;
        while (n && n.tagName !== 'H4') {
          const groupe = n.matches('.vy-themes, .vy-styles-vital, .vy-opt__touches');
          if (!n.classList.contains('vy-opt-cache') && (!groupe || n.querySelector(':scope > :not(.vy-opt-cache)'))) { vu = true; break; }
          n = n.nextElementSibling;
        }
        h.classList.toggle('vy-opt-cache', !!f && !vu);
      }
      sec.hidden = !!f && !reste;
      const nav = w.body.querySelector(`.vy-opt__nav [data-sec="${sec.dataset.sec}"]`);
      if (nav) nav.hidden = sec.hidden;
    }
    let vide = w.body.querySelector('.vy-opt__vide');
    const aucun = !!f && ![...w.body.querySelectorAll('.vy-opt__sec')].some(x => !x.hidden);
    if (aucun && !vide) { vide = document.createElement('p'); vide.className = 'vy-opt__vide muted'; w.body.querySelector('.vy-opt__corps').prepend(vide); }
    if (vide) { vide.hidden = !aucun; vide.textContent = aucun ? `Aucun réglage pour « ${q.trim()} ».` : ''; }
  }

  openReward() {
    this.refresh();
  }
}

function esc(s) {
  return Util.esc(s);
}
const DRAGME = '<svg class="vy-svc__dragme" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="8.5" fill="#f2c14e" stroke="#9b6a14" stroke-width="1.5"/><path d="M12 7.5l3.2 4.5L12 16.5 8.8 12z" fill="#fff3c4" stroke="#9b6a14" stroke-width="1"/></svg>';
Hud.svcLigne = (def, o) => {
  o = o || {};
  return `<div class="vy-svc__ligne${o.cls ? ' ' + o.cls : ''} row item"><span class="vy-case vy-svc__case" data-rarete="${Items.rarity(def)}"><span class="vy-case__icone">${Hud.picto(def)}</span>${o.n > 1 ? `<span class="vy-case__nombre">${o.n}</span>` : ''}</span>` +
    `<span class="vy-svc__t"><b data-rarete="${Items.rarity(def)}">${o.titre || esc(def.name)}</b>${o.n > 1 && !o.possede ? ` <em>×${o.n}</em>` : ''}${o.sous ? `<small>${o.sous}</small>` : ''}</span><span class="vy-svc__gestes btns">${o.gestes || ''}</span></div>`;
};
Hud.svcBourse = n => `<span class="vy-svc__bourse" title="Tes Dragmes">${DRAGME}<b>${nfr(n)}</b><small>Dragmes</small></span>`;
Hud.svcPrix = n => `<span class="vy-svc__prix">${DRAGME}${nfr(n)}</span>`;
const nfr = n => Number(n || 0).toLocaleString('fr-FR');

function rewardText(r) {
  r = r || {};
  const parts = [];
  if (r.xp) parts.push(`${r.xp} XP`);
  if (r.fils) parts.push(`${r.fils} Dragmes`);
  for (const it of r.items || []) { const d = Items.get(it.id); parts.push(`${d ? esc(d.name) : it.id}${it.count > 1 ? ' ×' + it.count : ''}`); }
  if (r.faction) parts.push(`${r.faction} points de faction`);
  if (r.marcheurs) parts.push('la confiance des Francs-Marcheurs');
  if (r.cosmetique && typeof Garderobe !== 'undefined') for (const id of [].concat(r.cosmetique)) { const c = Garderobe.get(id); if (c) parts.push(`${esc(c.nom)} (Garde-robe)`); }
  return parts.join(', ') || 'rien';
}
