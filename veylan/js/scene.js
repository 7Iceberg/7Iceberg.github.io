class Scene {
  constructor(opts) {
    this.cases = opts.cases;
    this.controls = opts.controls || null;
    this.combat = opts.combat || this.cases.combat;
    this.ile = null;
    this.actif = this.cases;
    this.support = null;
    this.voulu = null;
    this.generation = 0;
    this.highlights = this.cases.highlights;
    this._cue = null;
    this._tactique = false;
    this._onTick = null;
    this._world = null;
    this.stage = document.getElementById('stage');
    this.voileEl = null;
    this.echecs = [];
    const anime = Scene.fondAnime(Scene.fondVoile());
    this.prechargees = anime ? anime.IMAGES.map(src => {
      const img = new Image();
      img.decoding = 'async';
      img.src = src;
      if (img.decode) img.decode().catch(() => {});
      return img;
    }) : [];
  }


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

  get canvas() { return this.cases.canvas; }
  get W() { return this.cases.W; }
  get H() { return this.cases.H; }
  get origin() { return this.cases.origin; }
  get map() { return this.cases.map; }
  get dpr() { return this.cases.dpr; }
  get painter() { return this.cases.painter || this.cases; }
  get en3D() { return this.actif === this.ile && !!this.ile; }
  get voile() { return !!this.voulu && !this.en3D; }
  get camera() { return this.en3D ? this.ile.camera : this.cases.camera; }


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
  echelleFigure(x, y) { return this.en3D ? this.ile.echelleFigure(x, y) : undefined; }
  cameraBounds() { return this.cases.cameraBounds ? this.cases.cameraBounds() : null; }

  centre() {
    const r = this.stage ? this.stage.getBoundingClientRect() : { left: 0, top: 0, width: 0, height: 0 };
    return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
  }


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
    if (voulu && voulu === (this.voulu || this.support)) {
      if (this.en3D && voulu === this.support && !(d && (d.secteur || d.apresCombat))) this.ile.sauter();
      return;
    }
    if (!voulu && !this.voulu && this.actif === this.cases && !this.cases.suspendu && !this.voileEl) return;
    const gen = ++this.generation;
    if (voulu) this.vers3D(voulu, gen);
    else this.versCases();
  }

  async vers3D(voulu, gen) {
    this.voulu = voulu;
    this.cases.suspendre();
    if (this.en3D) { this.ile.desactiver(); this.actif = this.cases; }
    this.support = null;
    if (this.controls) this.controls.camera = this.cases.camera;
    const salle = voulu.startsWith('salle:');
    this.montrerVoile(Scene.titreVoile(voulu), Scene.ETAPES.outils, salle ? 'salle' : 'ile');
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

  static titreVoile(voulu) {
    const [genre, id] = String(voulu || '').split(/:(.*)/);
    if (genre === 'salle') {
      const d = World.dungeonDef(String(id).split('#')[0]);
      return d && d.id !== 'puits_de_l_amarre' ? `On descend dans ${d.name.replace(/^L[ea] /, m => m.toLowerCase())}...` : 'On descend dans le Puits...';
    }
    const pl = typeof Ile === 'object' && Ile.plateau(id);
    return `On rallume ${pl && pl.name ? pl.name : 'Ervane'}...`;
  }
  nomSupport(voulu) {
    const v = String(voulu || this.support || this.voulu || this.supportVoulu() || '');
    if (v.startsWith('plateau:')) { const pl = typeof Ile === 'object' && Ile.plateau(v.slice(8)); return pl && pl.name ? pl.name : 'Ervane'; }
    return World.nomPlateau(v.replace(/^salle:/, ''));
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

  versCases() {
    this.voulu = null;
    if (this.ile) {
      if (this.en3D) this.ile.camera.muette = true;
      this.ile.desactiver();
      const total = this.descenteFaite() || !!this.repliDemande;
      this.ile.liberer(total);
      if (total) this.oublierIle(this.repliDemande ? null : this.plateauDuDonjon());
    }
    this.actif = this.cases;
    this.support = null;
    if (this.controls) this.controls.camera = this.cases.camera;
    this.cacherVoile();
    this.cases.reprendre();
  }

  oublierIle(garder) {
    if (typeof Ile === 'object' && Ile.oublier) { if (garder && Ile.garderSeul) Ile.garderSeul(garder); else Ile.oublier(); }
    if (typeof IlePeinture === 'object' && IlePeinture.oublierVues) IlePeinture.oublierVues();
    if (typeof CartePeinture === 'object' && CartePeinture.oublierPlateaux) CartePeinture.oublierPlateaux();
    try { window.dispatchEvent(new CustomEvent('veylan:ile-oubliee')); } catch (e) {   }
  }

  plateauDuDonjon() {
    const dg = this.world && this.world.ch && this.world.ch.dungeon, d = dg && World.dungeonDef(dg.id), m = d && World.mapDef(d.entryMap);
    return m && m.plateau ? m.plateau : null;
  }

  descenteFaite() {
    const ch = this.world && this.world.ch;
    return !!(ch && ch.quests && Array.isArray(ch.quests.done) && ch.quests.done.includes('ervane_descente'));
  }

  perte(texte) {
    if (!this.en3D && !this.voulu) return;
    const voulu = this.support || this.voulu;
    this.actif = this.cases;
    this.support = null;
    this.voulu = voulu;
    if (this.controls) this.controls.camera = this.cases.camera;
    this.montrerVoile(texte || `${this.nomSupport(voulu)} se recoud...`, '');
  }
  retour() {
    if (!this.voulu) return;
    const gen = ++this.generation;
    this.vers3D(this.voulu, gen);
  }

  pause3D(raison, oui) {
    this.pauses = this.pauses || new Set();
    if (oui) this.pauses.add(raison); else this.pauses.delete(raison);
    if (this.ile) this.ile.endormirDessin(this.pauses.size > 0);
  }
  get dessinEndormi() { return !!(this.ile && this.ile.dessinEndormi); }


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
      ['astuce', 'Trop chargé, tu ne peux plus avancer : surveille la jauge de poids en bas du sac.'],
      ['astuce', 'Chaque point de Terra ajoute 5 au poids que tu peux porter.'],
      ['astuce', 'Chaque point de Sagesse ajoute 1 % à l\'expérience gagnée.'],
      ['astuce', 'Avant d\'attaquer un groupe, ouvre sa fiche : elle donne les résistances de chaque monstre.'],
      ['astuce', 'La Veille du jour change chaque jour : apporte la ressource demandée pour gagner son bonus.'],
      ['astuce', 'Sur ordinateur, Options › Personnaliser l\'interface te laisse déplacer chaque bloc de l\'écran.'],
      ['astuce', 'Au survol d\'un objet du sac, la bulle le compare à celui que tu portes.'],
      ['astuce', 'Le bloc vital a deux styles, Cœur et losanges ou Grappe : choisis le tien dans les Options.'],
      ['astuce', 'Les notifications se règlent dans les Options : position, style, durée et taille.'],
      ['legende', 'Veylan est un continent que sept Grands Dragons ont façonné. Ils gardent ; ils ne règnent pas.'],
      ['legende', 'Il n\'y a pas de dieux à Veylan, mais sept Grands Dragons. Ruhani, le Dragon de l\'Aube, est le plus fort.'],
      ['legende', 'Il y a cent ans, quelqu\'un a pris l\'Écaille d\'Ithren : sa colère a brûlé le nord. On appelle ça la Grande Colère.'],
      ['legende', 'La Flamme des dragons s\'allume dans quelques-uns, sans prévenir. Ce sont les Veilleurs.'],
      ['legende', 'Ervane est le plus haut sommet des Cimes, au-dessus de la mer de nuages, relié à Orsane par le câble de la Nacelle.'],
      ['legende', 'L\'Aube garde les Marques et les dragons, la Chaîne veut les lier. Au niveau 20, tu prêteras serment, ou pas.'],
      ['legende', 'Les Francs-Marcheurs de Thessa commercent avec tout le monde, et vendent de fausses Marques très bien gravées.'],
      ['legende', 'Au fond du Puits de l\'Amarre attend Krobb, le Ronge-Amarre.'],
    ];
  }

  static fondVoile() {
    try {
      const q = new URLSearchParams(location.search).get('chargement');
      if (q) return q === 'medaille' ? 'medaille' : 'paysage';
      return localStorage.getItem('veylan.chargement') === 'medaille' ? 'medaille' : 'paysage';
    } catch (e) { return 'paysage'; }
  }
  static fondAnime(fond) {
    if (fond === 'medaille') return typeof VoileMedaille === 'object' ? VoileMedaille : null;
    return typeof VoilePaysage === 'object' ? VoilePaysage : null;
  }

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

  voileTic() {
    const el = this.voileEl, c = this.chargeVoile;
    if (!el || !c) { clearInterval(this.voileMinuterie); return; }
    const t = performance.now(), dt = Math.min(2000, t - c.t);
    c.t = t;
    if (c.liste && c.cible > c.p) { c.p += (c.cible - c.p) * (1 - Math.exp(-dt / 4000)); this.voileBarre(); }
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

  repli() {
    const ch = this.world && this.world.ch;
    if (!ch) return;
    if (!this.voulu && !this.en3D && !this.supportVoulu()) return;
    if (this.nomSupport() !== 'Ervane') { this.repliOrsane(ch); return; }
    const descendre = (ch.quests.done || []).includes('ervane_descente') || ch.level >= 15;
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
    if (e) e.textContent = descendre ? 'Tu peux réessayer, ou descendre par la Nacelle jusqu\'à la Place du Relais d\'Orsane.' : 'Tu peux réessayer, ou recommencer à Orsane : tu gardes ton niveau, tes objets et tes Dragmes.';
  }

  repliOrsane(ch) {
    const nom = this.nomSupport();
    this.montrerVoile(`${nom} ne s'affiche pas en 3D sur cet appareil.`, '');
    clearInterval(this.voileMinuterie);
    this.voileMinuterie = null;
    const el = this.voileEl;
    el.classList.add('repli');
    el.setAttribute('role', 'alertdialog');
    const boutons = document.createElement('div');
    boutons.className = 'scene-voile__boutons';
    boutons.innerHTML = '<button type="button" class="vy-bouton vy-bouton--primaire" data-voile="reessayer">Réessayer</button>' +
      (ch.invite ? '' : '<button type="button" class="vy-bouton" data-voile="continuer2d">Continuer en 2D</button>');
    el.appendChild(boutons);
    const e = el.querySelector('.scene-voile__etape');
    if (e) e.textContent = ch.invite ? 'Tu peux réessayer.' : `Tu peux réessayer, ou continuer avec ${nom} en cases sur cet appareil : tu gardes tout, et la partie reprend au même endroit.`;
  }

  actionVoile(act) {
    const w = this.world;
    if (!w) return;
    if (act === 'continuer2d') {
      const ch = w.ch;
      if (ch.invite || !ch.uid || typeof Ile !== 'object' || !Ile.continuerEn2D(ch.uid)) return;
      delete ch.fight;
      w.emit('save');
      const u = new URL(location.href);
      u.searchParams.delete('reset');
      location.replace(u.href);
      return;
    }
    if (act === 'reessayer') {
      const voulu = this.voulu || this.supportVoulu();
      if (!voulu) { this.cacherVoile(); return; }
      this.vers3D(voulu, ++this.generation);
    } else if (act === 'descendre') {
      const kolm = World.npcDef('kolm'), p = kolm && kolm.passage;
      const arrivee = World.arriveePassage(p);
      this.repliDemande = true;
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
      if (!w.ch.invite) { const u = new URL(location.href); u.searchParams.delete('reset'); location.replace(u.href); }
    }
  }

  static versOrsane(ch) {
    const e = s => typeof s === 'string' && s.startsWith('ervane_');
    ch.origine = 'orsane';
    if (ch.tuto && ch.tuto.jeu) { const mode = ['guide', 'court', 'off'].includes(ch.tuto.mode) ? ch.tuto.mode : 'guide'; ch.tuto = { mode, step: 0, done: mode === 'off' || !!ch.tuto.done || !!ch.invite }; }
    delete ch.fight;
    for (const id of Object.keys(ch.quests.active || {})) if (e(id)) delete ch.quests.active[id];
    if (Array.isArray(ch.relays)) ch.relays = ch.relays.filter(id => !e(id));
    if (ch.relay && e(ch.relay.map)) ch.relay = null;
    ch.dungeon = null;
    ch.pos = null;
    if (ch.mapTimers) for (const k of Object.keys(ch.mapTimers)) if (e(k)) delete ch.mapTimers[k];
    return ch;
  }

  stats() { return this.ile ? this.ile.stats() : null; }
}
