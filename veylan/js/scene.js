// L'aiguillage du rendu (docs/ILE-TECHNIQUE.md, 1.6, 1.8 et 5.8) : le HUD, l'interface de combat,
// les dialogues et le guide gardent une seule référence au rendu, prise à leur construction. Sur
// l'île d'Ervane, il faut pourtant passer du rendu des cases (RendererGL ou Renderer, endormi
// pendant ce temps, jamais modifié dans ce qu'il dessine) au rendu 3D (Ile3D, js/ile-3d.js), et
// revenir. Scene est cet objet stable : il présente au HUD le contrat du rendu et le transmet au
// rendu actif.
//
// Il n'existe que si l'île est disponible sur l'appareil (js/ile.js) : éteint, js/main.js garde le
// rendu des cases et rien ne change.
//
// La bascule suit l'événement `map` du monde : un plateau (ou une salle d'un donjon dont l'entrée
// est sur un plateau, étape c) demande la 3D ; une carte à cases la rend. Un changement de
// sous-zone en marchant (`secteur`) ne change rien ; un voyage sur le même plateau fait sauter la
// caméra. Pendant le chargement, un voile cache la scène ; si la 3D tombe (Three.js absent ou trop
// lent, exception, contexte WebGL perdu), le voile de repli propose de réessayer ou de rejoindre
// Orsane.
class Scene {
  constructor(opts) {
    this.cases = opts.cases;              // le rendu des cases (RendererGL ou Renderer)
    this.controls = opts.controls || null; // l'unique CameraControls (js/camera.js)
    this.combat = opts.combat || this.cases.combat;
    this.ile = null;                      // Ile3D, créé à la première entrée sur un plateau
    this.actif = this.cases;              // le rendu qui dessine
    this.support = null;                  // ce que montre la 3D : 'plateau:ervane'
    this.voulu = null;                    // le support que la bascule en cours prépare
    this.generation = 0;                  // une bascule rattrapée par une autre s'abandonne
    this.highlights = this.cases.highlights;   // un seul objet de surbrillances, partagé
    this._cue = null;
    this._tactique = false;
    this._onTick = null;
    this._world = null;
    this.stage = document.getElementById('stage');
    this.voileEl = null;
    this.echecs = [];
    // Les images de la médaille, chargées et décodées tout de suite (pendant l'accueil) : le premier
    // voile les a déjà, sans noir le temps qu'elles arrivent.
    const anime = Scene.fondAnime(Scene.fondVoile());
    this.prechargees = anime ? anime.IMAGES.map(src => {
      const img = new Image();
      img.decoding = 'async';
      img.src = src;
      if (img.decode) img.decode().catch(() => {});
      return img;
    }) : [];
  }

  // ----- Ce que les deux rendus partagent -----

  get world() { return this._world; }
  set world(w) { this._world = w || null; this.cases.world = this._world; if (this.ile) this.ile.world = this._world; }
  get onTick() { return this._onTick; }
  set onTick(fn) { this._onTick = fn; this.cases.onTick = fn; if (this.ile) this.ile.onTick = fn; }
  get guideCue() { return this._cue; }
  set guideCue(v) { this._cue = v || null; this.cases.guideCue = this._cue; if (this.ile) this.ile.guideCue = this._cue; }
  get tactique() { return this._tactique; }
  set tactique(v) { this._tactique = !!v; this.cases.tactique = this._tactique; if (this.ile) this.ile.tactique = this._tactique; }
  get static() { return this.cases.static; }
  set static(v) { this.cases.static = v; }

  // Toujours #board : la surface des gestes, au-dessus de la scène 3D.
  get canvas() { return this.cases.canvas; }
  get W() { return this.cases.W; }
  get H() { return this.cases.H; }
  get origin() { return this.cases.origin; }
  get map() { return this.cases.map; }
  get dpr() { return this.cases.dpr; }
  // Le peintre du rendu des cases, prêt même endormi : bustes, portraits, figures de la 3D.
  get painter() { return this.cases.painter || this.cases; }
  get en3D() { return this.actif === this.ile && !!this.ile; }
  // Le voile est là : la 3D se prépare (ou est tombée), plus rien ne se dessine.
  get voile() { return !!this.voulu && !this.en3D; }
  // La caméra du rendu actif ; pendant le voile, celle du rendu des cases (muette).
  get camera() { return this.en3D ? this.ile.camera : this.cases.camera; }

  // ----- Le contrat du rendu (5.8) -----

  // 3D : un « point de scène » dans les coordonnées du support (x = u, y = v sur un plateau), rendu
  // tel quel ; worldToClient le projette. Pendant le voile, des valeurs finies.
  cellToScreen(x, y) {
    if (this.en3D) return { x, y };
    if (this.voile) return { x: 0, y: 0 };
    return this.cases.cellToScreen(x, y);
  }
  worldToClient(x, y) {
    if (this.en3D) return this.ile.worldToClient(x, y);
    if (this.voile) return this.centre();
    return this.cases.worldToClient(x, y);
  }
  // 3D : les coordonnées client de l'événement ; screenToCell fait la sélection (3.10).
  canvasPoint(evt) {
    if (this.en3D || this.voile) {
      const src = evt.touches && evt.touches[0] ? evt.touches[0] : (evt.changedTouches && evt.changedTouches[0] ? evt.changedTouches[0] : evt);
      return { x: src.clientX, y: src.clientY };
    }
    return this.cases.canvasPoint(evt);
  }
  screenToCell(px, py) {
    if (this.en3D) return this.ile.screenToCell(px, py);
    if (this.voile) return null;
    return this.cases.screenToCell(px, py);
  }
  // Pixels d'écran par pixel de peinture au pied d'une figure (UI.cellScale) ; rien hors de la 3D.
  echelleFigure(x, y) { return this.en3D ? this.ile.echelleFigure(x, y) : undefined; }
  cameraBounds() { return this.cases.cameraBounds ? this.cases.cameraBounds() : null; }

  centre() {
    const r = this.stage ? this.stage.getBoundingClientRect() : { left: 0, top: 0, width: 0, height: 0 };
    return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
  }

  // ----- La bascule -----

  // Le monde est créé : la bascule suit ses changements de carte (avant le HUD, qui écoute aussi).
  brancher(world) {
    this.world = world;
    world.on('map', d => this.surCarte(d));
  }

  supportVoulu() {
    const w = this.world;
    if (!w) return null;
    if (w.plateau) return 'plateau:' + w.plateau.id;
    if (typeof Ile === 'object' && w.mapId && String(w.mapId).includes('#') && Ile.donjon3D(w.mapId)) return 'salle:' + w.mapId;
    return null;
  }

  surCarte(d) {
    const voulu = this.supportVoulu();
    // Même support : un changement de sous-zone ne fait rien ; un voyage sur le même plateau fait
    // sauter la caméra (pas de glissement à travers l'île) ; le retour d'un combat gagné sur le
    // terrain (`apresCombat`) laisse la caméra revenir d'elle-même au Veilleur, sans saut.
    if (voulu && voulu === (this.voulu || this.support)) {
      if (this.en3D && voulu === this.support && !(d && (d.secteur || d.apresCombat))) this.ile.sauter();
      return;
    }
    // Déjà sur les cases, éveillées et sans voile : rien à faire.
    if (!voulu && !this.voulu && this.actif === this.cases && !this.cases.suspendu && !this.voileEl) return;
    const gen = ++this.generation;
    if (voulu) this.vers3D(voulu, gen);
    else this.versCases();
  }

  // Vers la 3D : le rendu des cases s'endort tout de suite (la prochaine image tenterait de peindre
  // une carte sans plan), le voile se pose, Three.js se charge (déjà en cache le plus souvent), la
  // scène se construit par étapes, puis s'active.
  async vers3D(voulu, gen) {
    this.voulu = voulu;
    this.cases.suspendre();
    if (this.en3D) { this.ile.desactiver(); this.actif = this.cases; }
    this.support = null;
    if (this.controls) this.controls.camera = this.cases.camera;
    const salle = voulu.startsWith('salle:');
    this.montrerVoile(salle ? 'On descend dans le Puits...' : 'On recoud Ervane...', Scene.ETAPES.outils, salle ? 'salle' : 'ile');
    try {
      await IleCharge.three();
      if (gen !== this.generation) return;
      if (!this.ile) {
        this.ile = new Ile3D({ stage: this.stage, board: this.canvas, combat: this.combat, painter: this.painter, highlights: this.highlights, scene: this });
        this.ile.world = this.world;
        this.ile.onTick = this._onTick;
        this.ile.guideCue = this._cue;
        this.ile.tactique = this._tactique;
        if (this.pauses && this.pauses.size) this.ile.endormirDessin(true);
      }
      // Un garde-fou : une construction qui n'aboutit pas en 45 s (la page figée une fois à l'entrée
      // du Puits, revue finale) tombe sur le voile de repli au lieu d'attendre sans fin.
      const t0 = performance.now();
      let minuterie = null;
      const garde = new Promise((ok, ko) => { minuterie = setTimeout(() => ko(new Error('la scène met trop de temps à se construire (45 s)')), 45000); });
      try { await Promise.race([this.ile.preparer(this.world, etape => { if (gen === this.generation) this.voileEtape(etape); }), garde]); } finally { clearTimeout(minuterie); }
      if (gen !== this.generation) return;
      const ms = performance.now() - t0;
      if (ms > 10000) console.info('Ervane : scène construite en ' + Math.round(ms) + ' ms', this.ile.chargement);
      this.activer(voulu);
    } catch (e) {
      if (gen !== this.generation) return;
      console.error('Ervane : rendu 3D impossible', e);
      this.echecs.push(String(e && e.message || e));
      this.repli();
    }
  }

  activer(voulu) {
    const ile = this.ile;
    const ins = this.cases.camera.insets;
    ile.camera.setInsets(ins);
    ile.activer();
    this.actif = ile;
    this.support = voulu;
    this.voulu = null;
    if (this.controls) this.controls.camera = ile.camera;
    this.cacherVoile();
    ile.camera.changed();
  }

  // Vers les cases : la 3D se désactive (et rend sa mémoire si l'on quitte le plateau ; le
  // contexte reste pour un retour, sauf après la descente : à Orsane, plus rien de l'île ne reste,
  // toile et contexte compris ; un retour par la Nacelle refait tout), le rendu des cases se réveille.
  versCases() {
    this.voulu = null;
    if (this.ile) {
      if (this.en3D) this.ile.camera.muette = true;
      this.ile.desactiver();
      // Tout part (contexte compris) après la descente, et aussi quand la bascule vient du voile de
      // repli (« Descendre », « Recommencer à Orsane » : `repliDemande`) : un joueur dont la 3D vient
      // de tomber ne garde pas un contexte malade à Orsane. Un repli plus ancien ne compte pas.
      const total = this.descenteFaite() || !!this.repliDemande;
      this.ile.liberer(total);
      if (total) this.oublierIle();
    }
    this.actif = this.cases;
    this.support = null;
    if (this.controls) this.controls.camera = this.cases.camera;
    this.cacherVoile();
    this.cases.reprendre();
  }

  // Après la descente (ou un repli) : le terrain et la navigation du registre (Ile.terrain, environ
  // 9 Mo), les vues d'ensemble peintes (carte du monde, mini-carte) sont rendus. Un retour par la
  // Nacelle reconstruit tout.
  oublierIle() {
    if (typeof Ile === 'object' && Ile.oublier) Ile.oublier();
    if (typeof IlePeinture === 'object' && IlePeinture.oublierVues) IlePeinture.oublierVues();
    if (typeof CartePeinture === 'object' && CartePeinture.oublierPlateaux) CartePeinture.oublierPlateaux();
    try { window.dispatchEvent(new CustomEvent('veylan:ile-oubliee')); } catch (e) { /* pas de CustomEvent */ }
  }

  // La descente d'Ervane est faite : le personnage vit à Orsane, l'île n'est plus qu'une visite.
  descenteFaite() {
    const ch = this.world && this.world.ch;
    return !!(ch && ch.quests && Array.isArray(ch.quests.done) && ch.quests.done.includes('ervane_descente'));
  }

  // La 3D est tombée en cours de route (contexte perdu, Ile3D le signale) : le voile, et la suite.
  perte(texte) {
    if (!this.en3D && !this.voulu) return;
    const voulu = this.support || this.voulu;
    this.actif = this.cases;
    this.support = null;
    this.voulu = voulu;
    if (this.controls) this.controls.camera = this.cases.camera;
    this.montrerVoile(texte || 'Ervane se recoud...', '');
  }
  // Le contexte revient : on reconstruit tout depuis les caches (Ile.terrain).
  retour() {
    if (!this.voulu) return;
    const gen = ++this.generation;
    this.vers3D(this.voulu, gen);
  }

  // Le dessin de la 3D s'endort tant qu'une fenêtre couvre la scène ou que la carte du monde en
  // 3D vit à côté (3.12) : `raison` ('carte', 'carte3d'...) ; le dessin reprend quand plus aucune
  // raison ne tient. Sans effet sur les cases.
  pause3D(raison, oui) {
    this.pauses = this.pauses || new Set();
    if (oui) this.pauses.add(raison); else this.pauses.delete(raison);
    if (this.ile) this.ile.endormirDessin(this.pauses.size > 0);
  }
  get dessinEndormi() { return !!(this.ile && this.ile.dessinEndormi); }

  // ----- Les voiles -----

  // Le voile de chargement, d'après l'écran de chargement de Duality : le fond illustré, la barre
  // avec le pourcentage et l'étape en cours, et des phrases qui défilent (astuces, légendes).
  // Les étapes, dans l'ordre où Ile3D.preparer et preparerSalle les annoncent (js/ile-3d.js) ;
  // une étape absente (le monde modelé, le héros) est sautée, la barre ne recule jamais.
  static get ETAPES() {
    return {
      outils: 'Le métier à tisser',
      ile: ['Le métier à tisser', 'Les matières du sol', 'Les cartes de l\'île', 'Le relief', 'Le décor', 'Les eaux et les nuages', 'Le monde modelé', 'Le héros modelé', 'Les Veilleurs et les monstres', 'La lumière'],
      salle: ['Le métier à tisser', 'La salle', 'Les Veilleurs et les monstres', 'Le héros modelé', 'La lumière'],
    };
  }
  static get PHRASES() {
    return [
      ['astuce', 'Les objets marqués d\'une étoile restent en tête du sac.'],
      ['astuce', 'Trop chargé, tu ne peux plus avancer : surveille la jauge de pods en bas du sac.'],
      ['astuce', 'Chaque point de Terra ajoute 5 pods à ce que tu peux porter.'],
      ['astuce', 'Chaque point de Sagesse ajoute 1 % à l\'expérience gagnée.'],
      ['astuce', 'Avant d\'attaquer un groupe, ouvre sa fiche : elle donne les résistances de chaque monstre.'],
      ['astuce', 'La Veille du jour change chaque jour : apporte la ressource demandée pour gagner son bonus.'],
      ['astuce', 'Sur ordinateur, Options › Personnaliser l\'interface te laisse déplacer chaque bloc de l\'écran.'],
      ['astuce', 'Au survol d\'un objet du sac, la bulle le compare à celui que tu portes.'],
      ['astuce', 'Le bloc vital a deux styles, Cœur et losanges ou Grappe : choisis le tien dans les Options.'],
      ['astuce', 'Les notifications se règlent dans les Options : position, style, durée et taille.'],
      ['legende', 'Veylan est posé sous sept Voiles. Sous chacun dort une ère plus ancienne.'],
      ['legende', 'Il n\'y a pas de dieux à Veylan, mais sept Grands Dragons. Ruhani, le Dragon de l\'Aube, est le plus fort.'],
      ['legende', 'Il y a cent ans, le premier Voile s\'est déchiré. On appelle ça la Déchirure.'],
      ['legende', 'Le Tissage est l\'art de tirer sur les fils des Voiles. Les Veilleurs l\'ont dans les mains.'],
      ['legende', 'Ervane flotte au-dessus d\'Orsane, cousue au monde par une amarre du Fil.'],
      ['legende', 'Le Fil veut recoudre les Voiles, la Déchirure veut les ouvrir. Au niveau 20, tu prêteras serment, ou pas.'],
      ['legende', 'Les Francs-Marcheurs de Thessa commercent avec tout le monde, et vendent de fausses Écailles très bien faites.'],
      ['legende', 'Au fond du Puits de l\'Amarre attend Krobb, le Ronge-Amarre.'],
    ];
  }

  // Le fond du voile : le paysage de la planche animé (js/voile-paysage.js, par défaut), ou la
  // médaille du V animée (js/voile-medaille.js), gardée en réserve (?chargement=medaille, ou
  // veylan.chargement = 'medaille' dans ce navigateur).
  static fondVoile() {
    try {
      const q = new URLSearchParams(location.search).get('chargement');
      if (q) return q === 'medaille' ? 'medaille' : 'paysage';
      return localStorage.getItem('veylan.chargement') === 'medaille' ? 'medaille' : 'paysage';
    } catch (e) { return 'paysage'; }
  }
  // Le module qui anime ce fond, s'il est chargé (sans lui, le paysage reste immobile).
  static fondAnime(fond) {
    if (fond === 'medaille') return typeof VoileMedaille === 'object' ? VoileMedaille : null;
    return typeof VoilePaysage === 'object' ? VoilePaysage : null;
  }

  // `liste` : 'ile' ou 'salle' pour la barre ; sans liste (la 3D perdue, le repli), pas de barre.
  montrerVoile(titre, etape, liste) {
    if (!this.stage) return;
    if (!this.voileEl) {
      const el = this.voileEl = document.createElement('div');
      el.className = 'scene-voile-boite';
      el.setAttribute('role', 'status');
      el.setAttribute('aria-live', 'polite');
      el.addEventListener('click', evt => {
        const b = evt.target.closest('[data-voile]');
        if (b) this.actionVoile(b.dataset.voile);
      });
      this.stage.appendChild(el);
    }
    const el = this.voileEl;
    el.classList.remove('repli');
    el.classList.toggle('sans-barre', !liste);
    let fond = Scene.fondVoile(), anime = Scene.fondAnime(fond);
    if (!anime) fond = 'paysage';
    this.fondAnime = anime;
    el.classList.toggle('medaille', fond === 'medaille');
    el.classList.toggle('paysage', fond === 'paysage' && !!anime);
    el.innerHTML = `<div class="scene-voile__fond" data-fond="${fond}"${anime ? ' data-anime' : ''} aria-hidden="true">${anime ? anime.html() : ''}</div>` +
      '<div class="scene-voile__fil" aria-hidden="true"></div>' +
      `<p class="scene-voile__titre">${Util.esc(titre)}</p>` +
      '<div class="scene-voile__barre" role="progressbar" aria-label="Chargement" aria-valuemin="0" aria-valuemax="100" aria-valuenow="0"><i></i></div>' +
      `<div class="scene-voile__ligne"><p class="scene-voile__etape">${Util.esc(etape || '')}</p><b class="scene-voile__pct" aria-hidden="true">0 %</b></div>` +
      '<div class="scene-voile__phrase" aria-live="off"><small></small><p></p></div>';
    this.stage.classList.add('scene-voile');
    const t = performance.now();
    this.chargeVoile = { liste: liste ? Scene.ETAPES[liste] : null, p: 0, cible: 0, t, phrase: t, efface: false, phrases: null, n: 0 };
    if (anime) anime.demarrer(el);
    this.voilePhrase();
    if (liste) this.voileEtape(etape);
    clearInterval(this.voileMinuterie);
    this.voileMinuterie = setInterval(() => this.voileTic(), 250);
  }

  voileEtape(etape) {
    const el = this.voileEl, c = this.chargeVoile;
    const e = el && el.querySelector('.scene-voile__etape');
    if (e) e.textContent = etape || '';
    // La barre : le début de l'étape, puis elle glisse doucement vers la suivante.
    if (!el || !c || !c.liste) return;
    const i = c.liste.indexOf(etape), n = c.liste.length;
    if (i < 0) return;
    c.p = Math.max(c.p, i / n);
    c.cible = Math.max(c.cible, (i + 0.85) / n);
    this.voileBarre();
  }

  voileBarre() {
    const el = this.voileEl, c = this.chargeVoile;
    if (!el || !c) return;
    const pct = Math.min(99, Math.round(c.p * 100));
    const b = el.querySelector('.scene-voile__barre');
    if (b) { b.firstChild.style.width = (c.p * 100).toFixed(1) + '%'; b.setAttribute('aria-valuenow', pct); }
    const t = el.querySelector('.scene-voile__pct');
    if (t) t.textContent = pct + ' %';
    if (this.fondAnime) this.fondAnime.progres(el, c.p);
  }

  // Une phrase au hasard, puis les autres dans un ordre mêlé ; elle change toutes les 6 s.
  voilePhrase() {
    const el = this.voileEl, c = this.chargeVoile;
    const boite = el && el.querySelector('.scene-voile__phrase');
    if (!boite || !c) return;
    if (!c.phrases || c.n >= c.phrases.length) {
      const l = Scene.PHRASES.slice();
      for (let i = l.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [l[i], l[j]] = [l[j], l[i]]; }
      c.phrases = l; c.n = 0;
    }
    const [genre, texte] = c.phrases[c.n++];
    boite.dataset.genre = genre;
    boite.querySelector('small').textContent = genre === 'astuce' ? 'Astuce' : 'Légende';
    boite.querySelector('p').textContent = texte;
  }

  // Sur l'horloge, pas sur le nombre de tours : pendant la construction, la page est très occupée
  // et la minuterie prend du retard.
  voileTic() {
    const el = this.voileEl, c = this.chargeVoile;
    if (!el || !c) { clearInterval(this.voileMinuterie); return; }
    const t = performance.now(), dt = Math.min(2000, t - c.t);
    c.t = t;
    // La barre glisse vers la fin de l'étape en cours (63 % du chemin en 4 s).
    if (c.liste && c.cible > c.p) { c.p += (c.cible - c.p) * (1 - Math.exp(-dt / 4000)); this.voileBarre(); }
    // Toutes les 6 s : la phrase s'efface (0,4 s), change, revient.
    const boite = el.querySelector('.scene-voile__phrase');
    if (!boite) return;
    if (!c.efface && t - c.phrase >= 6000) { c.efface = true; boite.classList.add('change'); }
    else if (c.efface && t - c.phrase >= 6450) { c.efface = false; c.phrase = t; this.voilePhrase(); boite.classList.remove('change'); }
  }

  cacherVoile() {
    clearInterval(this.voileMinuterie);
    this.voileMinuterie = null;
    this.chargeVoile = null;
    if (this.voileEl) { this.voileEl.remove(); this.voileEl = null; }
    if (this.stage) this.stage.classList.remove('scene-voile');
  }

  // Le voile de repli (1.8) : « Réessayer », puis rejoindre Orsane selon l'avancement.
  repli() {
    const ch = this.world && this.world.ch;
    if (!ch) return;
    // Ni plateau à l'écran ni bascule en cours (le joueur est à Orsane) : pas de voile.
    if (!this.voulu && !this.en3D && !this.supportVoulu()) return;
    const descendre = (ch.quests.done || []).includes('ervane_descente') || ch.level >= 8;
    this.montrerVoile('Ervane ne s\'affiche pas sur cet appareil.', '');
    clearInterval(this.voileMinuterie);
    this.voileMinuterie = null;
    const el = this.voileEl;
    el.classList.add('repli');
    el.setAttribute('role', 'alertdialog');
    const boutons = document.createElement('div');
    boutons.className = 'scene-voile__boutons';
    boutons.innerHTML = '<button type="button" class="vy-bouton vy-bouton--primaire" data-voile="reessayer">Réessayer</button>' +
      (descendre ? '<button type="button" class="vy-bouton" data-voile="descendre">Descendre à Orsane</button>'
        : '<button type="button" class="vy-bouton" data-voile="recommencer">Recommencer à Orsane</button>');
    el.appendChild(boutons);
    const e = el.querySelector('.scene-voile__etape');
    if (e) e.textContent = descendre ? 'Tu peux réessayer, ou descendre par la Nacelle jusqu\'à la Place du Relais d\'Orsane.' : 'Tu peux réessayer, ou recommencer à Orsane : tu gardes ton niveau, tes objets et tes Fils.';
  }

  actionVoile(act) {
    const w = this.world;
    if (!w) return;
    if (act === 'reessayer') {
      const voulu = this.voulu || this.supportVoulu();
      if (!voulu) { this.cacherVoile(); return; }
      this.vers3D(voulu, ++this.generation);
    } else if (act === 'descendre') {
      // Le passage de Kolm, lu dans le contenu (content/ervane.js : la seule source), construit comme
      // World.passage le construit, avec le même événement ; le changement de carte rend les cases.
      const kolm = World.npcDef('kolm'), p = kolm && kolm.passage;
      const a = (p && p.arrivee) || {};
      const arrivee = a.lieu ? { lieu: a.lieu } : (a.x != null && a.y != null ? { x: a.x, y: a.y } : { relay: true });
      this.repliDemande = true;   // la bascule (synchrone, sur l'événement map) rend tout
      try {
        if (p && w.enter(p.vers, arrivee)) w.emit('passage', { vers: p.vers, npc: 'kolm', repli: true });
        else w.enter(World.firstMap(w.ch), { relay: true });
      } finally { this.repliDemande = false; }
      w.emit('save');
    } else if (act === 'recommencer') {
      const el = this.voileEl;
      const ok = el && el.querySelector('[data-voile="recommencer-ok"]');
      if (!ok) {
        const b = el.querySelector('.scene-voile__boutons');
        b.innerHTML = '<p class="scene-voile__question">Ton personnage deviendra un personnage d\'Orsane, au départ d\'Orsane. Ses quêtes d\'Ervane en cours seront abandonnées.</p>' +
          '<button type="button" class="vy-bouton" data-voile="reessayer">Réessayer plutôt</button><button type="button" class="vy-bouton vy-bouton--danger" data-voile="recommencer-ok">Recommencer à Orsane</button>';
        return;
      }
    } else if (act === 'recommencer-ok') {
      Scene.versOrsane(w.ch);
      this.repliDemande = true;
      try { w.enter(World.firstMap(w.ch), { relay: true }); } finally { this.repliDemande = false; }
      w.emit('save');
      // La page garde l'Orsane du module ervaneOrsane (cartes et quêtes au niveau 8) : un personnage
      // d'Orsane se recharge (la page ne sert qu'un personnage, 1.4), sans ?reset (développement).
      // Une partie d'invité n'est jamais écrite : elle reste dans la page.
      if (!w.ch.invite) { const u = new URL(location.href); u.searchParams.delete('reset'); location.replace(u.href); }
    }
  }

  // Un personnage d'Ervane devient un personnage d'Orsane (1.8) : il garde son niveau, ses objets et
  // ses Fils ; ses quêtes d'Ervane en cours sont retirées, ses relais d'Ervane oubliés.
  static versOrsane(ch) {
    const e = s => typeof s === 'string' && s.startsWith('ervane_');
    ch.origine = 'orsane';
    // Le tutoriel de l'île n'a pas de sens à Orsane : celui d'Orsane, du début, dans le même mode
    // (un tutoriel fini reste fini). Fini pour un invité, qui reste dans la page, où Orsane est celle
    // d'un personnage d'Ervane (« L'arrivée sur les Cimes » y demande « La descente » et le niveau 8).
    if (ch.tuto && ch.tuto.jeu) { const mode = ['guide', 'court', 'off'].includes(ch.tuto.mode) ? ch.tuto.mode : 'guide'; ch.tuto = { mode, step: 0, done: mode === 'off' || !!ch.tuto.done || !!ch.invite }; }
    // Un combat sur le terrain d'Ervane, interrompu par le repli : annulé, pas perdu (js/main.js le
    // compterait comme abandonné au rechargement).
    delete ch.fight;
    for (const id of Object.keys(ch.quests.active || {})) if (e(id)) delete ch.quests.active[id];
    if (Array.isArray(ch.relays)) ch.relays = ch.relays.filter(id => !e(id));
    if (ch.relay && e(ch.relay.map)) ch.relay = null;
    ch.dungeon = null;
    ch.pos = null;
    if (ch.mapTimers) for (const k of Object.keys(ch.mapTimers)) if (e(k)) delete ch.mapTimers[k];
    return ch;
  }

  // ----- Pour les tests et le budget -----
  stats() { return this.ile ? this.ile.stats() : null; }
}
