class HudJeu {
  constructor(hud) {
    this.hud = hud;
    this.world = hud.world;
    this.combat = hud.combat;
    this.ui = hud.ui;
    this.renderer = hud.renderer;
    this.app = document.getElementById('app');
    this.stage = document.getElementById('stage');
    this.onglet = null;
    this.page = 0;
    this.verrou = true;
    this.vueDegagee = false;
    this.niveauEnAttente = null;
    this.ui.jeu = true;
    this.ui.buildTurnBar();
    this.ui.apresRefresh = () => this.rafraichirCombat();
    this.gaucher = HudJeu.lire('veylan.gaucher') === '1';
    this.app.classList.toggle('vy-gaucher', this.gaucher);
    this.construirePanneau();
    this.construireLanguette();
    this.construireBarreSorts();
    this.carteInfo = document.getElementById('carte-info');
    this.carteInfo.addEventListener('click', evt => {
      const b = evt.target.closest('[data-act]');
      if (!b) return;
      if (b.dataset.act === 'carte') this.hud.toggleWin('carte');
      if (b.dataset.act === 'quetes') this.hud.toggleWin('quetes');
    });
    this.fiche = new FicheGroupe(this);
    this.glisse = new Glisse(this);
    this.tourne = new Tourne();
    this.indice = document.createElement('div');
    this.indice.className = 'vy-indice hidden';
    this.indice.setAttribute('role', 'status');
    this.stage.appendChild(this.indice);
    this.confirmQuitter = null;

    const w = this.world, cb = this.combat;
    w.on('map', d => { if (!(d && d.secteur)) this.page = 0; this.rafraichir(); });
    w.on('update', () => this.rafraichir());
    w.on('hp', () => this.rafraichirVie());
    w.on('questProgress', () => this.rafraichirCarte());
    w.on('fight', () => {
      this.page = 0;
      this.pageBarre = 0;
      this.onglet = null;
      this.basculerPanneau(false);
      this.ui.armerPlacement(UI.PLACEMENT_SECONDES);
      this.rafraichir();
    });
    w.on('fightEnd', () => { this.fermerQuitter(); this.basculerPanneau(false); this.rafraichir(); });
    w.on('groupPopup', d => this.fiche.montrer(d));
    for (const e of ['setup', 'start', 'turn', 'end']) cb.on(e, () => this.rafraichir());
    Bus.on('levelUp', d => { this.niveauEnAttente = d.level; this.annoncerNiveau(); });
    window.addEventListener('veylan:discussionNonLues', e => this.compterDiscussion(e.detail && e.detail.n));
    window.addEventListener('resize', () => { this.mesurer(); this.rafraichir(); });
    setInterval(() => this.tic(), 400);
    this.mesurer();
    this.rafraichir();
  }

  static lire(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }
  static ecrire(k, v) { try { if (v == null) localStorage.removeItem(k); else localStorage.setItem(k, v); } catch (e) {   } }

  get ch() { return this.world.ch; }
  get enCombat() { return !!this.world.showCombat; }
  get ongletActif() { return this.onglet || (this.enCombat ? 'sorts' : 'objets'); }


  construirePanneau() {
    const p = this.panneau = document.getElementById('panneau');
    const I = Fenetres.ICON, J = HudJeu.ICON;
    const menus = (Hud.MENUS || []).map(([id, label, key, icon]) => `<button type="button" class="vy-rond" data-win="${id}" aria-label="${label} (${key})" title="${label}">${icon}<span class="vy-badge" hidden></span></button>`).join('');
    const veille = typeof Veille !== 'undefined' ? `<button type="button" class="vy-rond" data-win="veille" aria-label="Veille du jour (V)" title="Veille du jour">${Hud.VEILLE_ICONE || J.veille}<span class="vy-badge" hidden></span></button>` : '';
    const bientot = HudJeu.BIENTOT.map(([id, label]) => `<button type="button" class="vy-rond vy-rond--bientot" data-bientot="${id}" aria-disabled="true" aria-label="${label} : bientôt" title="${label} : bientôt">${J[id]}</button>`).join('');
    p.innerHTML =
      '<div class="vy-panneau__haut">' +
      '<div class="vy-panneau__pv" role="img" aria-label="Points de vie"><svg viewBox="0 0 80 92" aria-hidden="true">' +
      '<defs><clipPath id="clip-pv-panneau"><path d="M40 3 76 26 70 70 40 89 10 70 4 26z"/></clipPath>' +
      '<linearGradient id="grad-pv-panneau" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ff9a7c"/><stop offset="1" stop-color="#9c2d1d"/></linearGradient></defs>' +
      '<path d="M40 3 76 26 70 70 40 89 10 70 4 26z" class="vy-panneau__pv-coque"/>' +
      '<rect class="vy-panneau__pv-niveau" clip-path="url(#clip-pv-panneau)" x="0" width="80" y="0" height="92" fill="url(#grad-pv-panneau)"/>' +
      '<path d="M40 3 76 26 70 70 40 89 10 70 4 26z" class="vy-panneau__pv-bord"/><path d="M40 3 40 89M4 26 76 26" class="vy-panneau__pv-facette"/></svg>' +
      '<b class="vy-panneau__pv-val"></b></div>' +
      '<div class="vy-panneau__pts"><span class="vy-pt vy-pt--pa" title="Points d\'action"><b></b><small>PA</small></span><span class="vy-pt vy-pt--pm" title="Points de mouvement"><b></b><small>PM</small></span></div>' +
      '<div class="vy-panneau__rapides" role="toolbar" aria-label="Actions rapides"></div></div>' +
      '<div class="vy-panneau__xp"><span class="vy-panneau__niv"></span><span class="vy-panneau__xp-jauge"></span></div>' +
      '<div class="vy-panneau__grille-zone"><div class="vy-panneau__grille" role="grid" aria-label="Raccourcis"></div>' +
      `<div class="vy-panneau__pages"><button type="button" class="vy-panneau__page" data-page="-1" aria-label="Page précédente">${J.haut}</button><span class="vy-panneau__num">1</span><button type="button" class="vy-panneau__page" data-page="1" aria-label="Page suivante">${J.bas}</button></div></div>` +
      '<div class="vy-panneau__onglets" role="tablist">' +
      `<button type="button" class="vy-panneau__onglet" data-onglet="sorts" role="tab">${J.sorts}<span>Sorts</span></button>` +
      `<button type="button" class="vy-panneau__onglet" data-onglet="objets" role="tab">${I.sac}<span>Objets</span></button>` +
      `<button type="button" class="vy-panneau__verrou" aria-pressed="true" title="Verrouiller la grille">${J.verrou}</button></div>` +
      `<nav class="vy-panneau__menus" aria-label="Menus">${menus}${veille}${bientot}</nav>` +
      '<div class="vy-panneau__bas">' +
      `<button type="button" class="vy-panneau__emote" aria-label="Émotes" aria-expanded="false">${J.emote}</button>` +
      `<button type="button" class="vy-panneau__discussion" aria-label="Discussion">${Discussion.ICONE}<span>Discussion</span><span class="vy-panneau__nonlu" hidden></span></button></div>` +
      `<div class="vy-emotes hidden" role="menu" aria-label="Émotes">${HudJeu.menuEmotes()}</div>`;
    this.grille = p.querySelector('.vy-panneau__grille');
    this.q = s => p.querySelector(s);
    p.addEventListener('click', evt => this.clic(evt));
    this.grille.addEventListener('pointerdown', evt => this.debutGlisser(evt));
    this.grille.addEventListener('contextmenu', evt => evt.preventDefault());
    this.verrou = HudJeu.lire('veylan.grille.libre') !== '1';
  }


  construireLanguette() {
    const J = HudJeu.ICON;
    const l = this.languette = document.createElement('div');
    l.className = 'vy-languette';
    l.setAttribute('role', 'toolbar');
    l.setAttribute('aria-label', 'Jeu');
    l.innerHTML =
      '<button type="button" class="vy-languette__pv" data-languette="panneau" aria-label="Points de vie"><svg class="vy-anneau" viewBox="0 0 40 40" aria-hidden="true">' +
      '<circle class="vy-anneau__piste" cx="20" cy="20" r="16.5"/><circle class="vy-anneau__vie" cx="20" cy="20" r="16.5" pathLength="100" stroke-dasharray="100 100" stroke-dashoffset="0"/>' +
      '</svg><b class="vy-languette__pv-val"></b></button>' +
      '<div class="vy-languette__pts" hidden><span class="vy-pt vy-pt--pa" title="Points d\'action"><b></b><small>PA</small></span><span class="vy-pt vy-pt--pm" title="Points de mouvement"><b></b><small>PM</small></span></div>' +
      `<button type="button" class="vy-languette__bouton" data-languette="panneau" aria-label="Sorts et objets" aria-expanded="false">${J.sorts}</button>` +
      `<button type="button" class="vy-languette__bouton" data-languette="menus" aria-label="Menus">${J.menus}<span class="vy-badge vy-badge--point" hidden>•</span></button>` +
      '<span class="vy-languette__ressort"></span>' +
      `<button type="button" class="vy-languette__bouton" data-languette="discussion" aria-label="Discussion">${Discussion.ICONE}<span class="vy-languette__nonlu" hidden></span></button>` +
      `<button type="button" class="vy-languette__bouton" data-languette="emote" aria-label="Émotes">${J.emote}</button>`;
    this.stage.appendChild(l);
    this.app.classList.add('vy-replie');
    this.panneauOuvert = false;
    l.addEventListener('click', evt => {
      const b = evt.target.closest('[data-languette]');
      if (!b) return;
      const id = b.dataset.languette;
      if (id === 'panneau' || id === 'menus') this.basculerPanneau();
      else if (id === 'discussion') this.hud.discussion.basculer();
      else if (id === 'emote') { this.basculerPanneau(true); this.basculerEmotes(true); }
      b.blur();
    });
    this.stage.addEventListener('pointerdown', evt => {
      if (this.panneauOuvert && !this.enCombat && !evt.target.closest('.vy-languette')) this.basculerPanneau(false);
    }, { capture: true });
  }

  basculerPanneau(on) {
    const ouvert = on != null ? !!on : !this.panneauOuvert;
    if (ouvert === this.panneauOuvert) return;
    this.panneauOuvert = ouvert;
    this.app.classList.toggle('vy-panneau-ouvert', ouvert);
    for (const b of this.languette.querySelectorAll('[data-languette="panneau"], [data-languette="menus"]')) b.setAttribute('aria-expanded', String(ouvert));
    if (!ouvert) this.basculerEmotes(false);
    this.mesurer();
    this.rafraichirGrille();
    this.publierCouverture();
    try { window.dispatchEvent(new Event('resize')); } catch (e) {   }
  }

  publierCouverture() {
    const d = this.insetDroite(), g = this.insetGauche();
    if (this.couvertSig === `${d}|${g}`) return;
    this.couvertSig = `${d}|${g}`;
    document.body.style.setProperty('--vy-couvert-droite', d + 'px');
    document.body.style.setProperty('--vy-couvert-gauche', g + 'px');
  }

  insetDroite() { return this.gaucher ? 0 : this.couverture(); }
  insetGauche() { return this.gaucher ? this.couverture() : 0; }
  couverture() {
    if (!this.languette || !this.languette.offsetWidth || getComputedStyle(this.languette).display === 'none') return 0;
    return this.languette.offsetWidth + (this.panneauOuvert ? this.panneau.offsetWidth : 0);
  }

  clic(evt) {
    const t = evt.target;
    if (this.glisserFini && Date.now() < this.glisserFini) return;
    const win = t.closest('[data-win]');
    if (win) { this.hud.toggleWin(win.dataset.win); this.rafraichirBadges(); return; }
    const bientot = t.closest('[data-bientot]');
    if (bientot) { this.bulleBientot(bientot); return; }
    const onglet = t.closest('[data-onglet]');
    if (onglet) { this.onglet = onglet.dataset.onglet; this.page = 0; this.rafraichirGrille(true); return; }
    const page = t.closest('[data-page]');
    if (page) { this.page += Number(page.dataset.page); this.rafraichirGrille(true); return; }
    if (t.closest('.vy-panneau__verrou')) { this.verrou = !this.verrou; HudJeu.ecrire('veylan.grille.libre', this.verrou ? null : '1'); this.rafraichirGrille(true); return; }
    const rapide = t.closest('[data-rapide]');
    if (rapide) { this.rapide(rapide.dataset.rapide, rapide); return; }
    const slot = t.closest('[data-slot]');
    if (slot) { this.toucherSlot(slot); return; }
    if (t.closest('.vy-panneau__emote')) { this.basculerEmotes(); return; }
    const emote = t.closest('[data-emote]');
    if (emote) { this.emote(emote.dataset.emote); return; }
    if (t.closest('.vy-panneau__discussion')) { this.hud.discussion.basculer(); return; }
  }

  mesurer() {
    const z = this.q('.vy-panneau__grille-zone');
    if (!z || !z.clientHeight) { this.rangees = 3; return; }
    const cell = parseFloat(getComputedStyle(this.panneau).getPropertyValue('--case')) || 40;
    this.rangees = Math.max(1, Math.floor((z.clientHeight + 4) / (cell + 4)));
  }

  rafraichir() {
    this.app.classList.toggle('vy-en-combat', this.enCombat);
    this.rafraichirVie();
    this.rafraichirRapides();
    this.rafraichirGrille();
    this.rafraichirBarreSorts();
    this.rafraichirCarte();
    this.rafraichirBadges();
    this.mesurerScene();
  }

  rafraichirCombat() {
    if (!this.enCombat) return;
    this.rafraichirVie();
    this.rafraichirGrille();
    this.rafraichirBarreSorts();
    this.rafraichirIndice();
    this.mesurerScene();
  }

  mesurerScene() {
    this.publierCouverture();
    const app = this.app, b = this.ui.el.turnBar, sl = this.stage.clientWidth;
    const on = this.enCombat && !!b && b.offsetWidth > 0;
    const l = on ? b.offsetWidth : 0, h = on ? b.offsetHeight + 22 : 0;
    if (this.barreSig === `${l}|${h}|${sl}`) return;
    this.barreSig = `${l}|${h}|${sl}`;
    app.style.setProperty('--scene-l', sl + 'px');
    if (on) { app.style.setProperty('--barre-tour-l', l + 'px'); app.style.setProperty('--barre-tour-h', h + 'px'); }
    else { app.style.removeProperty('--barre-tour-l'); app.style.removeProperty('--barre-tour-h'); }
    app.classList.toggle('vy-guide-dessus', on && sl - l - 20 < 280);
  }

  rafraichirVie() {
    const cb = this.combat, ch = this.ch;
    const p = this.enCombat && cb.player;
    const hp = p ? p.hp : ch.hp, max = p ? p.hpMax : ch.derived().hpMax;
    const pct = Math.max(0, Math.min(1, hp / Math.max(1, max)));
    this.q('.vy-panneau__pv-niveau').setAttribute('y', String(92 * (1 - pct)));
    this.q('.vy-panneau__pv-val').textContent = hp;
    const pv = this.q('.vy-panneau__pv');
    pv.setAttribute('aria-label', `Points de vie : ${hp} sur ${max}`);
    pv.title = `${hp} / ${max} PV`;
    pv.classList.toggle('bas', pct < 0.3);
    if (p) {
      this.q('.vy-pt--pa b').textContent = p.pa;
      this.q('.vy-pt--pm b').textContent = p.pm;
    }
    const L = this.languette;
    if (L) {
      L.querySelector('.vy-anneau__vie').setAttribute('stroke-dashoffset', (100 * (1 - pct)).toFixed(1));
      L.querySelector('.vy-languette__pv-val').textContent = hp;
      const lpv = L.querySelector('.vy-languette__pv');
      lpv.setAttribute('aria-label', `Points de vie : ${hp} sur ${max}`);
      lpv.classList.toggle('bas', pct < 0.3);
      const pts = L.querySelector('.vy-languette__pts');
      pts.hidden = !p;
      if (p) { pts.querySelector('.vy-pt--pa b').textContent = p.pa; pts.querySelector('.vy-pt--pm b').textContent = p.pm; }
    }
    const xp = Math.round(ch.xpProgress() * 100);
    this.q('.vy-panneau__niv').textContent = `Niv. ${ch.level}`;
    const j = this.q('.vy-panneau__xp-jauge');
    if (!j.firstChild) j.innerHTML = Util.jauge('xp', xp, 100, null, 'Expérience', 'vy-jauge--fine');
    else Util.setJauge(j.firstChild, xp, 100);
    j.title = ch.level >= Character.MAX_LEVEL ? 'Niveau maximum' : `Expérience : ${xp} %`;
  }


  rafraichirRapides() {
    const J = HudJeu.ICON, I = Fenetres.ICON;
    const r = this.enCombat
      ? [['quitter', 'Quitter le combat', J.quitter], ['tactique', 'Vue tactique', J.tactique, this.renderer.tactique], ['fiches', 'Fiches des combattants', J.fiches, this.app.classList.contains('vy-fiches')], ['defi', 'Défi du combat', I.succes]]
      : [['degager', 'Vue dégagée', J.oeil, this.vueDegagee], ['carte', 'Carte du monde', I.carte], ['suivi', 'Quête suivie', J.epingle, !this.app.classList.contains('vy-sans-suivi')], ['journal', 'Journal', I.journal]]
        .concat(typeof Montures !== 'undefined' && Montures.de(this.ch) ? [['monture', Montures.montee(this.ch) ? 'Descendre de ta monture' : 'Monter ta monture', I.montures, Montures.montee(this.ch)]] : []);
    const sig = r.map(x => x[0] + (x[3] ? 1 : 0)).join('|');
    const box = this.q('.vy-panneau__rapides');
    if (box.dataset.sig === sig) return;
    box.dataset.sig = sig;
    box.innerHTML = r.map(([id, label, icon, on]) => `<button type="button" class="vy-rapide${id === 'quitter' ? ' vy-rapide--danger' : ''}" data-rapide="${id}" aria-label="${label}" title="${label}"${on !== undefined ? ` aria-pressed="${!!on}"` : ''}>${icon}</button>`).join('');
  }

  rapide(id, b) {
    const app = this.app;
    switch (id) {
      case 'degager': this.vueDegagee = !this.vueDegagee; app.classList.toggle('vy-degage', this.vueDegagee); break;
      case 'carte': this.hud.toggleWin('carte'); break;
      case 'suivi': app.classList.toggle('vy-sans-suivi'); break;
      case 'journal': this.hud.toggleWin('journal'); break;
      case 'monture': this.hud.basculerMonture(); break;
      case 'quitter': this.demanderQuitter(); break;
      case 'tactique': this.renderer.tactique = !this.renderer.tactique; break;
      case 'fiches': app.classList.toggle('vy-fiches'); this.ui.renderInspect(); break;
      case 'defi': { const c = this.combat.challenge; this.ui.banner(c ? `Défi : ${c.name}. ${c.desc}${c.failed ? ' (raté : ' + c.failed + ')' : c.success ? ' (réussi)' : ''}` : 'Pas de défi dans ce combat.', 2600); break; }
    }
    this.rafraichirRapides();
    if (b && b.isConnected) b.blur();
  }

  demanderQuitter() {
    if (this.confirmQuitter) return;
    const box = this.confirmQuitter = document.createElement('div');
    box.className = 'vy-confirmer';
    box.setAttribute('role', 'alertdialog');
    box.setAttribute('aria-label', 'Quitter le combat');
    box.innerHTML = '<p><b>Quitter le combat ?</b><br>Il comptera comme perdu : retour au Relais avec la moitié de tes PV.</p>' +
      '<div class="vy-confirmer__boutons"><button type="button" class="vy-bouton vy-bouton--petit" data-non>Rester</button><button type="button" class="vy-bouton vy-bouton--petit vy-bouton--danger" data-oui>Quitter</button></div>';
    box.addEventListener('click', evt => {
      if (evt.target.closest('[data-oui]')) { this.fermerQuitter(); this.world.abandonFight(); }
      else if (evt.target.closest('[data-non]')) this.fermerQuitter();
    });
    this.stage.appendChild(box);
    box.querySelector('[data-non]').focus({ preventScroll: true });
  }

  fermerQuitter() {
    if (this.confirmQuitter) { this.confirmQuitter.remove(); this.confirmQuitter = null; }
  }

  construireBarreSorts() {
    const b = this.barreSorts = document.createElement('div');
    b.className = 'vy-barre-sorts';
    b.setAttribute('role', 'toolbar');
    b.setAttribute('aria-label', 'Sorts du combat');
    b.innerHTML = '<div class="vy-barre-sorts__boite"><span class="vy-barre-sorts__etats" hidden></span>' +
      `<div class="vy-barre-sorts__vie">${Gemmes.bloc(this.hud.styleVital(), false)}</div>` +
      '<div class="vy-barre-sorts__sorts"><span class="vy-barre-sorts__titre">Sorts</span><div class="vy-barre-sorts__rangee">' +
      `<div class="vy-barre-sorts__pages"><button type="button" class="vy-barre-sorts__page" data-pb="-1" aria-label="Page de sorts précédente">${HudJeu.ICON.haut}</button>` +
      '<button type="button" class="vy-barre-sorts__num" data-pb="tour" aria-label="Page de sorts 1 sur 1, toucher pour la suivante">1</button>' +
      `<button type="button" class="vy-barre-sorts__page" data-pb="1" aria-label="Page de sorts suivante">${HudJeu.ICON.bas}</button></div>` +
      '<div class="vy-barre-sorts__liste"></div>' +
      `<button type="button" class="vy-barre-sorts__poignee" aria-label="Taille de la barre de sorts : glisser pour l'agrandir ou la réduire" title="Glisser : agrandir ou réduire la barre (double clic : taille d'origine)">${HudJeu.ICON.poignee}</button></div></div>` +
      '<div class="vy-barre-sorts__fin"><span class="vy-barre-sorts__chrono" role="timer" aria-label="Temps du tour"><svg viewBox="0 0 40 40" aria-hidden="true"><circle class="vy-chrono__piste" cx="20" cy="20" r="17"/><circle class="vy-chrono__reste" cx="20" cy="20" r="17" pathLength="100"/></svg><b></b></span>' +
      '<button type="button" class="vy-bouton vy-bouton--primaire vy-barre-sorts__action" data-ui="pret">Prêt</button></div>' +
      '</div>';
    this.stage.appendChild(b);
    this.pageBarre = 0;
    b.addEventListener('click', evt => {
      if (this.glisseBarreFini && Date.now() < this.glisseBarreFini) return;
      const pb = evt.target.closest('[data-pb]');
      if (pb) { this.tournerPageBarre(pb.dataset.pb === 'tour' ? 'tour' : Number(pb.dataset.pb)); return; }
      const s = evt.target.closest('[data-slot]');
      if (s) { this.toucherSlot(s); return; }
      if (evt.target.closest('.vy-barre-sorts__action')) { if (this.combat.phase === 'placement') this.ui.ready(); else this.ui.endTurn(); }
    });
    b.addEventListener('contextmenu', evt => { const s = evt.target.closest('[data-spell]'); if (s) { evt.preventDefault(); this.infoSort(s, s.dataset.spell); } });
    b.addEventListener('pointerover', evt => {
      if (evt.pointerType !== 'mouse') return;
      const s = evt.target.closest('[data-spell]');
      if (s && s !== this.sortSurvole) { this.sortSurvole = s; this.infoSort(s, s.dataset.spell, true); }
    });
    b.addEventListener('pointerout', evt => {
      const s = evt.target.closest('[data-spell]');
      if (!s || (evt.relatedTarget && s.contains(evt.relatedTarget))) return;
      this.sortSurvole = null;
      this.ui.el.tooltip.classList.add('hidden');
    });
    b.addEventListener('wheel', evt => {
      if (!evt.target.closest('.vy-barre-sorts__sorts') || this.pagesBarre <= 1) return;
      evt.preventDefault();
      const t = Date.now();
      if (this.moletteBarre && t - this.moletteBarre < 180) return;
      this.moletteBarre = t;
      this.tournerPageBarre((evt.deltaY || evt.deltaX) > 0 ? 1 : -1);
    }, { passive: false });
    const liste = b.querySelector('.vy-barre-sorts__liste');
    const finirAnim = () => { if (liste.getAnimations) for (const a of liste.getAnimations()) a.finish(); };
    liste.addEventListener('pointerdown', evt => {
      if (evt.button > 0) return;
      finirAnim();
      const boite = b.querySelector('.vy-barre-sorts__boite');
      this.glisseBarre = { x: evt.clientX, y: evt.clientY, id: evt.pointerId, actif: false, z: boite.offsetWidth ? boite.getBoundingClientRect().width / boite.offsetWidth : 1 };
    });
    liste.addEventListener('pointermove', evt => {
      const g = this.glisseBarre;
      if (!g || g.id !== evt.pointerId) return;
      const dx = evt.clientX - g.x, dy = evt.clientY - g.y;
      if (!g.actif) {
        if (Math.abs(dx) < 8 || Math.abs(dx) < Math.abs(dy) * 1.2 || this.pagesBarre <= 1) return;
        g.actif = true;
        try { liste.setPointerCapture(evt.pointerId); } catch (e) {   }
        liste.classList.add('glisse');
        this.ui.el.tooltip.classList.add('hidden');
      }
      const bord = (dx > 0 && this.pageBarre <= 0) || (dx < 0 && this.pageBarre >= this.pagesBarre - 1);
      liste.style.transform = `translateX(${(bord ? dx * 0.3 : dx) / g.z}px)`;
    });
    const finGlisse = evt => {
      const g = this.glisseBarre;
      if (!g || g.id !== evt.pointerId) return;
      this.glisseBarre = null;
      if (!g.actif) return;
      this.glisseBarreFini = Date.now() + 350;
      liste.classList.remove('glisse');
      const dx = evt.clientX - g.x, sens = dx < 0 ? 1 : -1;
      const seuil = Math.min(60, liste.getBoundingClientRect().width * 0.18);
      const peut = sens > 0 ? this.pageBarre < this.pagesBarre - 1 : this.pageBarre > 0;
      if (evt.type === 'pointerup' && Math.abs(dx) > seuil && peut) { liste.style.transform = ''; this.tournerPageBarre(sens); return; }
      const dep = liste.style.transform;
      liste.style.transform = '';
      if (liste.animate && dep) liste.animate([{ transform: dep }, { transform: 'none' }], { duration: 160, easing: 'ease-out' });
    };
    liste.addEventListener('pointerup', finGlisse);
    liste.addEventListener('pointercancel', finGlisse);
    liste.addEventListener('lostpointercapture', evt => { if (this.glisseBarre && this.glisseBarre.actif) finGlisse(Object.assign({}, { pointerId: evt.pointerId, clientX: this.glisseBarre.x, type: 'pointercancel' })); });
    const poignee = b.querySelector('.vy-barre-sorts__poignee');
    poignee.addEventListener('pointerdown', evt => {
      if (evt.button > 0) return;
      evt.preventDefault();
      finirAnim();
      const c = liste.querySelector('.vy-sort');
      const r = c ? c.getBoundingClientRect() : { width: 44, height: 44 };
      const t = this.tailleBarre();
      this.tirePoignee = { x: evt.clientX, y: evt.clientY, id: evt.pointerId, cols: Math.min(t.cols, this.capaciteBarre || 10), rows: t.rows, pas: r.width * 1.14, pasV: r.height * 1.14 };
      try { poignee.setPointerCapture(evt.pointerId); } catch (e) {   }
      poignee.classList.add('tiree');
    });
    poignee.addEventListener('pointermove', evt => {
      const g = this.tirePoignee;
      if (!g || g.id !== evt.pointerId) return;
      g.vers = [g.cols + Math.round(2 * (evt.clientX - g.x) / g.pas), g.rows + Math.round(2 * (g.y - evt.clientY) / g.pasV)];
      this.reglerTailleBarre(g.vers[0], g.vers[1], false);
    });
    const finPoignee = evt => {
      const g = this.tirePoignee;
      if (!g || g.id !== evt.pointerId) return;
      this.tirePoignee = null;
      poignee.classList.remove('tiree');
      this.glisseBarreFini = Date.now() + 250;
      if (g.vers) this.reglerTailleBarre(g.vers[0], g.vers[1], true);
    };
    poignee.addEventListener('pointerup', finPoignee);
    poignee.addEventListener('pointercancel', finPoignee);
    poignee.addEventListener('dblclick', () => this.reglerTailleBarre(null, null, true));
    poignee.addEventListener('keydown', evt => {
      const d = { ArrowRight: [1, 0], ArrowLeft: [-1, 0], ArrowUp: [0, 1], ArrowDown: [0, -1] }[evt.key];
      if (!d) return;
      evt.preventDefault(); evt.stopPropagation();
      const t = this.tailleBarre();
      this.reglerTailleBarre(Math.min(t.cols, this.capaciteBarre || 10) + d[0], t.rows + d[1], true);
    });
    this.ui.sortDeTouche = (rang, seconde) => this.sortDeTouche(rang, seconde);
    this.ui.tournerPageSorts = sens => this.barreVisible() ? (this.tournerPageBarre(sens), true) : false;
    addEventListener('resize', () => { if (this.barreOn) { this.capaciteBarre = null; this.rafraichirBarreSorts(true); } });
    this.ui.apresChrono = (reste, total) => this.majChrono(reste, total);
  }

  barreVisible() {
    const boite = this.barreSorts && this.barreSorts.querySelector('.vy-barre-sorts__boite');
    return !!(this.barreOn && boite && boite.offsetWidth);
  }

  modeBarre() {
    try { return matchMedia('(orientation: landscape) and (max-height: 500px)').matches ? 'tel' : 'pc'; } catch (e) { return 'pc'; }
  }

  tailleBarre() {
    const mode = this.modeBarre();
    const def = HudJeu.TAILLE_BARRE[mode];
    const m = /^(\d+)x(\d+)$/.exec(HudJeu.lire(`veylan.barre.${mode}`) || '');
    const cols = m ? Number(m[1]) : def.cols, rows = m ? Number(m[2]) : def.rows;
    return { cols: Math.max(2, Math.min(10, cols)), rows: Math.max(1, Math.min(def.rowsMax, rows)), def };
  }

  rangeesBarre() { return this.tailleBarre().rows; }

  reglerTailleBarre(cols, rows, garder) {
    const mode = this.modeBarre(), t = this.tailleBarre();
    const avant = { cols: this.colonnesBarre || t.cols, rows: t.rows };
    const premier = (this.pageBarre || 0) * avant.cols * avant.rows;
    let v = null;
    if (cols != null) {
      const c = Math.max(2, Math.min(10, this.capaciteBarre || 10, cols));
      const r = Math.max(1, Math.min(t.def.rowsMax, rows));
      v = `${c}x${r}`;
    }
    this.tailleProvisoire = garder ? null : v;
    if (garder) HudJeu.ecrire(`veylan.barre.${mode}`, v);
    const n = this.tailleBarreEffective();
    this.pageBarre = Math.floor(premier / Math.max(1, n.cols * n.rows));
    this.rafraichirBarreSorts(true);
  }

  tailleBarreEffective() {
    const t = this.tailleBarre();
    const m = /^(\d+)x(\d+)$/.exec(this.tailleProvisoire || '');
    const cols = m ? Number(m[1]) : t.cols, rows = m ? Number(m[2]) : t.rows;
    return { cols: Math.max(1, Math.min(10, this.capaciteBarre || 10, cols)), rows };
  }

  sortDeTouche(rang, seconde) {
    if (!this.barreVisible()) return seconde ? null : this.contenu('sorts')[rang];
    const cols = this.colonnesBarre || 10, rows = this.rangeesBarreVue || 1;
    if (seconde && rows < 2) return null;
    if (rang >= cols) return null;
    const vue = this.vueBarre || [];
    return vue[(seconde ? cols : 0) + rang] || null;
  }

  tournerPageBarre(sens) {
    const n = this.pagesBarre || 1;
    if (n <= 1) return;
    const avant = this.pageBarre || 0;
    this.pageBarre = sens === 'tour' ? (avant + 1) % n : Math.max(0, Math.min(n - 1, avant + sens));
    if (this.pageBarre === avant) return;
    this.rafraichirBarreSorts(true);
    const liste = this.barreSorts.querySelector('.vy-barre-sorts__liste');
    let calme = false;
    try { calme = matchMedia('(prefers-reduced-motion: reduce)').matches; } catch (e) {   }
    const dir = this.pageBarre > avant ? 1 : -1;
    if (liste.animate && !calme) liste.animate([{ transform: `translateX(${dir * 36}px)`, opacity: 0.25 }, { transform: 'none', opacity: 1 }], { duration: 170, easing: 'ease-out' });
  }

  rafraichirBarreSorts(force) {
    const b = this.barreSorts, cb = this.combat;
    if (!b) return;
    const on = this.enCombat && !!cb.player;
    if (on !== this.barreOn) { this.barreOn = on; this.app.classList.toggle('vy-barre-sorts-on', on); if (!on) this.app.classList.remove('vy-etats-on'); }
    const boite = b.querySelector('.vy-barre-sorts__boite');
    if (on && boite.offsetHeight) this.app.style.setProperty('--barre-sorts-h', boite.offsetHeight + 'px');
    const marges = on ? `${this.insetHaut()}|${this.insetBas()}` : '';
    if (marges !== this.margesCombat) { this.margesCombat = marges; try { window.dispatchEvent(new Event('resize')); } catch (e) {   } }
    if (!on) return;
    const p = cb.player, tour = this.ui.isPlayerTurn() && !cb.busy;
    const ids = this.contenu('sorts');
    const taille = this.tailleBarreEffective();
    const rows = this.rangeesBarreVue = taille.rows;
    const pages = Math.max(1, Math.ceil(ids.length / (rows * taille.cols)));
    const cols = this.colonnesBarre = pages > 1 ? taille.cols : Math.max(1, Math.min(taille.cols, Math.ceil(ids.length / rows)));
    const parPage = rows * cols;
    this.pageBarre = Math.max(0, Math.min(pages - 1, this.pageBarre || 0));
    this.pagesBarre = pages;
    const vue = this.vueBarre = ids.slice(this.pageBarre * parPage, (this.pageBarre + 1) * parPage);
    const vides = pages > 1 ? parPage - vue.length : 0;
    const cases = vue.map((id, i) => this.caseBarre(id, p, tour, i % cols, Math.floor(i / cols))).join('') +
      '<span class="vy-sort vy-sort--vide" aria-hidden="true"></span>'.repeat(vides);
    const act = this.ui.el.turnBar && this.ui.el.turnBar.querySelector('.vy-barre-tour__action');
    const etat = act ? [act.textContent, act.disabled ? 1 : 0, act.dataset.ui, act.classList.contains('hidden') ? 1 : 0].join('|') : '';
    const fx = this.ui.effetsTexte || '';
    const sig = [cases, this.pageBarre, pages, cols, rows, p.pa, p.pm, p.hp, p.hpMax, etat, fx, this.hud.styleVital()].join('§');
    if (!force && sig === this.barreSig2) return;
    this.barreSig2 = sig;
    const liste = b.querySelector('.vy-barre-sorts__liste');
    liste.innerHTML = cases;
    liste.style.setProperty('--colonnes', cols);
    const nav = b.querySelector('.vy-barre-sorts__pages');
    nav.classList.toggle('seule', pages <= 1);
    const num = nav.querySelector('.vy-barre-sorts__num');
    num.textContent = String(this.pageBarre + 1);
    num.disabled = pages <= 1;
    num.dataset.sur = String(pages);
    num.setAttribute('aria-label', `Page de sorts ${this.pageBarre + 1} sur ${pages}${pages > 1 ? ', toucher pour la suivante' : ''}`);
    num.title = pages > 1 ? `Page ${this.pageBarre + 1} sur ${pages} (molette, Page préc. / Page suiv.)` : 'Une seule page';
    nav.querySelector('[data-pb="-1"]').disabled = this.pageBarre <= 0;
    nav.querySelector('[data-pb="1"]').disabled = this.pageBarre >= pages - 1;
    b.dataset.pages = String(pages);
    b.dataset.taille = `${cols}x${rows}`;
    const po = b.querySelector('.vy-barre-sorts__poignee');
    po.setAttribute('aria-label', `Taille de la barre de sorts : ${cols} × ${rows}. Glisser, ou les flèches, pour l'agrandir ou la réduire`);
    const vu = this.mesurerColonnesBarre(liste, cols);
    if (vu && vu !== this.capaciteBarre) {
      this.capaciteBarre = vu;
      if (this.tailleBarreEffective().cols !== taille.cols && !this.remesureBarre) { this.remesureBarre = true; this.rafraichirBarreSorts(true); this.remesureBarre = false; return; }
    }
    const plein = k => Math.max(p[k], (k === 'pa' ? p.paMax : p.pmMax) + (p.modifier ? p.modifier(k) : 0));
    Gemmes.maj(b.querySelector('.vy-gemmes'), { hp: p.hp, hpMax: p.hpMax, pa: p.pa, paMax: plein('pa'), pm: p.pm, pmMax: plein('pm') });
    const etats = b.querySelector('.vy-barre-sorts__etats');
    etats.hidden = !fx;
    etats.innerHTML = fx;
    this.app.classList.toggle('vy-etats-on', !!fx);
    const a = b.querySelector('.vy-barre-sorts__action');
    if (act) { a.textContent = act.textContent; a.disabled = act.disabled; a.dataset.ui = act.dataset.ui || 'pret'; a.hidden = act.classList.contains('hidden'); }
  }

  mesurerColonnesBarre(liste, cols) {
    const b = this.barreSorts, boite = b.querySelector('.vy-barre-sorts__boite');
    if (!boite.offsetWidth) return 0;
    const c = liste.querySelectorAll('.vy-sort');
    if (c.length < 2) return cols;
    const r0 = c[0].getBoundingClientRect(), r1 = c[1].getBoundingClientRect();
    const pas = Math.abs(r1.top - r0.top) < 2 ? r1.left - r0.left : r0.width * 1.15;
    if (!(pas > 0)) return cols;
    const dispo = b.getBoundingClientRect().width, prise = boite.getBoundingClientRect().width, rangee = liste.getBoundingClientRect().width;
    const z = c[0].offsetWidth ? r0.width / c[0].offsetWidth : 1;
    const cs = getComputedStyle(liste), marges = ((parseFloat(cs.paddingLeft) || 0) + (parseFloat(cs.paddingRight) || 0)) * z;
    const ecart = Math.max(0, pas - r0.width);
    const libre = dispo - (prise - rangee) - marges + ecart;
    return Math.max(1, Math.min(10, Math.floor((libre + 0.5) / pas)));
  }

  majStyleVital() {
    const v = this.barreSorts && this.barreSorts.querySelector('.vy-barre-sorts__vie');
    if (!v) return;
    v.innerHTML = Gemmes.bloc(this.hud.styleVital(), false);
    this.barreSig2 = null;
    this.rafraichirBarreSorts(true);
  }

  majChrono(reste, total) {
    const c = this.barreSorts && this.barreSorts.querySelector('.vy-barre-sorts__chrono');
    if (!c) return;
    const vide = reste == null || !total;
    c.classList.toggle('vide', vide);
    if (vide) return;
    const s = Math.max(0, Math.ceil(reste));
    const t = c.querySelector('b');
    if (t.textContent !== String(s)) t.textContent = s;
    c.querySelector('.vy-chrono__reste').style.strokeDashoffset = (100 * (1 - Math.max(0, Math.min(1, reste / total)))).toFixed(1);
    c.classList.toggle('urgent', reste <= 5);
  }

  caseBarre(id, p, tour, rang, ligne) {
    const seconde = ligne === 1;
    const ch = this.ch, cb = this.combat;
    const s = cb.spellOf(id, p);
    if (!s) return '';
    const st = cb.spellState(p, id), cd = p.cooldowns[id] || 0;
    const off = !tour || !st.ok, choisi = this.ui.selectedSpell === id;
    const nom = id === 'arme' ? (Items.get(ch.equipment.arme) || {}).name || s.name : s.name;
    const el = DATA.elements[s.element] || DATA.elements.neutre;
    const icone = typeof SortIcones === 'object' && id !== 'arme' ? SortIcones.url(id, s, 72) : '';
    const tuile = typeof SortTuiles === 'object' && SortTuiles.a(id);
    const fond = icone ? `<img class="vy-sort__icone" src="${icone}" alt="">` : `<span class="vy-sort__icone vy-sort__icone--arme">${id === 'arme' ? Hud.picto({ kind: 'weapon' }) : Util.esc(nom.charAt(0))}</span>`;
    return `<button type="button" class="vy-sort${tuile ? ' vy-sort--tuile' : ''}${off ? ' indispo' : ''}${choisi ? ' choisi' : ''}" data-slot data-spell="${id}" style="--el:${el.color}" aria-label="${Util.esc(nom)}, ${s.pa} PA${st.ok ? '' : ' : ' + Util.esc(st.reason || 'indisponible')}" title="${Util.esc(nom)} · ${s.pa} PA">` +
      `${fond}<em class="vy-sort__pa">${s.pa}</em>${rang < 10 && ligne < 2 ? `<i class="vy-sort__touche">${seconde ? '⇧' : ''}${(rang + 1) % 10}</i>` : ''}${cd ? `<span class="vy-sort__cd">${cd}</span>` : ''}</button>`;
  }

  insetHaut() {
    const t = this.ui.el.turnBar;
    if (!this.barreOn || !t || !t.offsetWidth) return 0;
    const r = t.getBoundingClientRect(), s = this.stage.getBoundingClientRect();
    return r.top < s.top + s.height * 0.4 ? Math.max(0, Math.round(r.bottom - s.top + 4)) : 0;
  }
  insetBas() {
    const b = this.barreSorts && this.barreSorts.querySelector('.vy-barre-sorts__boite');
    if (!this.barreOn || !b || !b.offsetWidth) return 0;
    const s = this.stage.getBoundingClientRect();
    let haut = b.getBoundingClientRect().top;
    const t = this.ui.el.turnBar;
    if (t && t.offsetWidth) { const r = t.getBoundingClientRect(); if (r.top > s.top + s.height * 0.4) haut = Math.min(haut, r.top); }
    return Math.max(0, Math.round(s.bottom - haut + 4));
  }


  contenu(onglet) {
    const ch = this.ch, cb = this.combat;
    let ids;
    if (onglet === 'sorts') {
      if (this.enCombat && cb.player) ids = UI.ordreSorts(cb.player);
      else ids = (ch.equipment.arme && Items.get(ch.equipment.arme) && Items.get(ch.equipment.arme).spell ? ['arme'] : []).concat(ch.unlockedSpells());
    } else {
      const R = Items.RARITIES || [];
      const rank = d => d.kind === 'consumable' ? 0 : d.kind === 'weapon' ? 1 : 2;
      ids = Object.keys(ch.inventory).filter(id => { const d = Items.get(id); return d && (d.kind === 'consumable' || d.kind === 'equip' || d.kind === 'weapon'); })
        .sort((a, b) => { const A = Items.get(a), B = Items.get(b); return rank(A) - rank(B) || R.indexOf(Items.rarity(B)) - R.indexOf(Items.rarity(A)) || A.name.localeCompare(B.name); });
    }
    const ordre = this.ordre(onglet);
    if (ordre.length) ids.sort((a, b) => { const i = ordre.indexOf(a), j = ordre.indexOf(b); return (i < 0 ? 999 : i) - (j < 0 ? 999 : j); });
    return ids;
  }

  ordre(onglet) {
    try { return JSON.parse(HudJeu.lire(`veylan.grille.${onglet}.${this.ch.uid || 'x'}`) || '[]') || []; } catch (e) { return []; }
  }

  rafraichirGrille(force) {
    if (!this.grille) return;
    const onglet = this.ongletActif, cb = this.combat;
    const ids = this.contenu(onglet);
    const cols = 5, rows = this.rangees || 3, parPage = cols * rows;
    const pages = Math.max(1, Math.ceil(ids.length / parPage));
    this.page = Math.max(0, Math.min(pages - 1, this.page));
    const vue = ids.slice(this.page * parPage, (this.page + 1) * parPage);
    const p = this.enCombat ? cb.player : null;
    const tour = this.ui.isPlayerTurn() && !cb.busy;
    const cases = vue.map((id, i) => onglet === 'sorts' ? this.caseSort(id, p, tour, this.page * parPage + i) : this.caseObjet(id));
    while (cases.length < parPage) cases.push('<span class="vy-slot vy-slot--vide" aria-hidden="true"></span>');
    const html = cases.join('');
    const sig = [onglet, this.page, pages, this.verrou ? 1 : 0, html].join('§');
    if (!force && sig === this.grilleSig) return;
    this.grilleSig = sig;
    this.grille.style.setProperty('--rangees', rows);
    this.grille.innerHTML = html;
    this.grille.classList.toggle('libre', !this.verrou);
    this.q('.vy-panneau__num').textContent = String(this.page + 1);
    this.q('[data-page="-1"]').disabled = this.page <= 0;
    this.q('[data-page="1"]').disabled = this.page >= pages - 1;
    for (const b of this.panneau.querySelectorAll('[data-onglet]')) { b.setAttribute('aria-selected', String(b.dataset.onglet === onglet)); b.classList.toggle('on', b.dataset.onglet === onglet); }
    const v = this.q('.vy-panneau__verrou');
    v.setAttribute('aria-pressed', String(this.verrou));
    v.title = this.verrou ? 'Grille verrouillée : la déverrouiller pour réordonner' : 'Grille libre : glisse une case pour la déplacer';
    v.innerHTML = this.verrou ? HudJeu.ICON.verrou : HudJeu.ICON.ouvert;
  }

  caseSort(id, p, tour, rang) {
    const ch = this.ch, cb = this.combat;
    const s = p ? cb.spellOf(id, p) : (id === 'arme' ? (Items.get(ch.equipment.arme) || {}).spell : (ch.spellFor(id) || DATA.spells[id]));
    if (!s) return '<span class="vy-slot vy-slot--vide" aria-hidden="true"></span>';
    const el = DATA.elements[s.element] || DATA.elements.neutre;
    const st = p ? cb.spellState(p, id) : { ok: true };
    const cd = p ? p.cooldowns[id] || 0 : 0;
    const off = p && (!tour || !st.ok);
    const choisi = p && this.ui.selectedSpell === id;
    const nom = id === 'arme' ? (Items.get(ch.equipment.arme) || {}).name || s.name : s.name;
    const glyphe = id === 'arme' ? Hud.picto({ kind: 'weapon' }) : `<i>${Util.esc(nom.charAt(0))}</i>`;
    const touche = rang < 9 ? `<kbd>${rang + 1}</kbd>` : '';
    return `<button type="button" class="vy-slot vy-slot--sort${id === 'arme' ? ' vy-slot--arme' : ''}${off ? ' indispo' : ''}${choisi ? ' choisi' : ''}" data-slot data-spell="${id}" style="--el:${el.color}" aria-label="${Util.esc(nom)}, ${s.pa} PA${st.ok ? '' : ', ' + Util.esc(st.reason)}" title="${Util.esc(nom)} · ${s.pa} PA">` +
      `<span class="vy-slot__losange">${glyphe}</span><span class="vy-slot__pa">${s.pa}</span>${cd ? `<span class="vy-slot__cd">${cd}</span>` : ''}${touche}</button>`;
  }

  caseObjet(id) {
    const ch = this.ch, d = Items.get(id);
    if (!d) return '<span class="vy-slot vy-slot--vide" aria-hidden="true"></span>';
    const n = ch.count(id);
    const verbe = d.kind === 'consumable' ? 'utiliser' : 'équiper';
    const bloque = (d.kind === 'equip' || d.kind === 'weapon') && !ch.canEquip(id).ok;
    return `<button type="button" class="vy-slot vy-slot--objet vy-case${bloque ? ' vy-case--bloquee' : ''}" data-slot data-objet="${id}" data-rarete="${Items.rarity(d)}" aria-label="${Util.esc(d.name)}${n > 1 ? ', ' + n : ''} : ${verbe}" title="${Util.esc(d.name)} (${verbe})">` +
      `<span class="vy-case__icone">${Hud.picto(d)}</span>${n > 1 ? `<span class="vy-case__nombre">${n}</span>` : ''}</button>`;
  }

  async toucherSlot(b) {
    if (b.dataset.spell) {
      const id = b.dataset.spell;
      if (this.enCombat && this.combat.player) {
        if (!this.ui.isPlayerTurn()) { this.infoSort(b, id); return; }
        await this.ui.selectSpell(id);
        this.rafraichirGrille(true);
        this.rafraichirBarreSorts(true);
      } else this.infoSort(b, id);
      return;
    }
    const id = b.dataset.objet, d = Items.get(id);
    if (!d) return;
    if (this.world.state === 'combat') { this.hud.toast('Pas pendant un combat.'); return; }
    if (d.kind === 'consumable') this.world.useItem(id);
    else this.world.equip(id);
  }

  infoSort(b, id, garder) {
    const ch = this.ch, t = this.ui.el.tooltip;
    let html;
    if (this.enCombat && this.combat.player) html = this.ui.spellTooltip(id, this.combat.player);
    else {
      const s = id === 'arme' ? (Items.get(ch.equipment.arme) || {}).spell : (ch.spellFor(id) || DATA.spells[id]);
      if (!s) return;
      const el = DATA.elements[s.element] || DATA.elements.neutre;
      const nom = id === 'arme' ? Items.get(ch.equipment.arme).name : s.name;
      html = `<b style="color:${el.color}">${Util.esc(nom)}</b> <span class="muted">· ${el.label} · ${s.pa} PA</span>${s.desc ? '<br><i>' + Util.esc(s.desc) + '</i>' : ''}`;
    }
    t.innerHTML = html;
    t.classList.remove('hidden');
    const r = b.getBoundingClientRect();
    t.style.left = Math.max(8, Math.min(innerWidth - t.offsetWidth - 8, r.left + r.width / 2 - t.offsetWidth / 2)) + 'px';
    t.style.top = Math.max(8, r.top - t.offsetHeight - 8) + 'px';
    clearTimeout(this.infoT);
    if (!garder) this.infoT = setTimeout(() => t.classList.add('hidden'), 2600);
  }

  debutGlisser(evt) {
    if (this.verrou || evt.button > 0) return;
    const src = evt.target.closest('[data-slot]');
    if (!src) return;
    const key = src.dataset.spell || src.dataset.objet;
    const start = { x: evt.clientX, y: evt.clientY };
    let fantome = null, cible = null;
    const bouge = e => {
      if (!fantome && Math.hypot(e.clientX - start.x, e.clientY - start.y) < 8) return;
      if (!fantome) {
        fantome = src.cloneNode(true);
        fantome.classList.add('vy-slot--fantome');
        document.body.appendChild(fantome);
        src.classList.add('glisse');
      }
      fantome.style.transform = `translate(${e.clientX - 20}px, ${e.clientY - 20}px)`;
      const sous = document.elementFromPoint(e.clientX, e.clientY);
      const c = sous && sous.closest('.vy-panneau__grille [data-slot]');
      if (cible && cible !== c) cible.classList.remove('cible');
      cible = c && c !== src ? c : null;
      if (cible) cible.classList.add('cible');
    };
    const fin = () => {
      window.removeEventListener('pointermove', bouge);
      window.removeEventListener('pointerup', fin);
      window.removeEventListener('pointercancel', fin);
      if (!fantome) return;
      fantome.remove();
      src.classList.remove('glisse');
      this.glisserFini = Date.now() + 250;
      if (!cible) return;
      cible.classList.remove('cible');
      const onglet = this.ongletActif, ids = this.contenu(onglet);
      const a = ids.indexOf(key), b = ids.indexOf(cible.dataset.spell || cible.dataset.objet);
      if (a < 0 || b < 0) return;
      [ids[a], ids[b]] = [ids[b], ids[a]];
      HudJeu.ecrire(`veylan.grille.${onglet}.${this.ch.uid || 'x'}`, JSON.stringify(ids));
      this.rafraichirGrille(true);
    };
    window.addEventListener('pointermove', bouge);
    window.addEventListener('pointerup', fin);
    window.addEventListener('pointercancel', fin);
  }


  rafraichirCarte() {
    const w = this.world, def = w.mapDef;
    if (!def || !this.carteInfo) return;
    const room = !!def.room;
    const zone = w.zone ? w.zone.name : '';
    const pos = !room && typeof Atlas === 'object' ? Atlas.coordsOf(w.mapId) : null;
    const lv = room ? ((World.dungeonDef(def.dungeonId) || {}).level || (w.zone && w.zone.level)) : def.level;
    const niveau = Array.isArray(lv) ? (lv[0] === lv[1] ? `Niveau ${lv[0]}` : `Niveau ${lv[0]} à ${lv[1]}`) : '';
    const maint = Date.now(), heure = !room && typeof Heure === 'object' ? `<span class="vy-carte-info__heure${Heure.crepuscule(maint) ? ' crepuscule' : ''}"> · ${Util.esc(Heure.libelle(maint))}</span>` : '';
    const tous = Quests.tracker(this.ch), suivie = this.hud && this.hud.quetesSuivie ? this.hud.quetesSuivie() : null;
    const t = (suivie && tous.find(x => x.quest.id === suivie)) || tous[0];
    const html = `<button type="button" class="vy-carte-info__carte" data-act="carte" aria-label="${Util.esc(zone)}, ${Util.esc(def.name)} : ouvrir la carte du monde">` +
      `<span class="vy-carte-info__titre"><b>${Util.esc(zone || def.name)}</b>${zone ? ` <span>(${Util.esc(def.name)})</span>` : ''}</span>` +
      `<span class="vy-carte-info__ligne">${zone ? `<span class="vy-carte-info__lieu">${Util.esc(def.name)} · </span>` : ''}${pos ? `${pos[0]},${pos[1]}, ` : ''}${niveau}${heure}</span></button>` +
      (t ? `<button type="button" class="vy-carte-info__suivi${t.done ? ' fini' : ''}" data-act="quetes" aria-label="Quête suivie : ${Util.esc(t.quest.name)}, ${Util.esc(t.text)}">${HudJeu.ICON.epingle}<span><b>${Util.esc(t.quest.name)}</b><small>${Util.esc(t.text)}</small>` +
        `<i class="vy-carte-info__avance" aria-hidden="true"><i style="width:${Math.round(100 * HudJeu.avancement(this.ch, t))}%"></i></i></span></button>` : '');
    if (this.carteInfo.dataset.html !== html) { this.carteInfo.dataset.html = html; this.carteInfo.innerHTML = html; }
  }


  rafraichirBadges() {
    const ch = this.ch;
    const marks = {
      carac: ch.statPoints > 0 ? '+' : '',
      sorts: '',
      quetes: Quests.tracker(ch).some(t => t.done) ? '!' : '',
      veille: typeof Veille !== 'undefined' && Veille.badge(ch) ? '•' : '',
    };
    for (const b of document.querySelectorAll('#menus [data-win], #panneau [data-win]')) {
      let badge = b.querySelector('.vy-badge');
      const m = marks[b.dataset.win] || '';
      if (!badge && !m) continue;
      if (!badge) { badge = document.createElement('span'); badge.className = 'vy-badge'; b.appendChild(badge); }
      badge.hidden = !m;
      badge.textContent = m;
      badge.classList.toggle('vy-badge--plus', m === '+');
      badge.classList.toggle('vy-badge--point', m === '•');
    }
    const fen = this.hud.fen;
    for (const b of this.panneau.querySelectorAll('.vy-rond[data-win]')) b.classList.toggle('on', !!(fen && fen.isOpen(b.dataset.win)));
    const pt = this.languette && this.languette.querySelector('[data-languette="menus"] .vy-badge');
    if (pt) pt.hidden = !Object.values(marks).some(Boolean);
  }

  bulleBientot(b) {
    const t = this.ui.el.tooltip;
    t.innerHTML = `<b>${Util.esc(b.title.replace(/ : bientôt$/, ''))}</b><br><span class="muted">Bientôt.</span>`;
    t.classList.remove('hidden');
    const r = b.getBoundingClientRect();
    t.style.left = Math.max(8, Math.min(innerWidth - t.offsetWidth - 8, r.left + r.width / 2 - t.offsetWidth / 2)) + 'px';
    t.style.top = Math.max(8, r.top - t.offsetHeight - 8) + 'px';
    clearTimeout(this.infoT);
    this.infoT = setTimeout(() => t.classList.add('hidden'), 1600);
  }

  compterDiscussion(n) {
    for (const s of [this.q('.vy-panneau__nonlu'), this.languette && this.languette.querySelector('.vy-languette__nonlu')]) {
      if (!s) continue;
      s.hidden = !n;
      s.textContent = n > 9 ? '9+' : String(n || '');
    }
  }


  basculerEmotes(on) {
    const box = this.q('.vy-emotes'), b = this.q('.vy-panneau__emote');
    const open = on != null ? on : box.classList.contains('hidden');
    if (open) { const html = HudJeu.menuEmotes(); if (box.innerHTML !== html) box.innerHTML = html; }
    box.classList.toggle('hidden', !open);
    b.setAttribute('aria-expanded', String(open));
  }

  emote(id) {
    this.basculerEmotes(false);
    if (!this.bulleEmote) {
      this.bulleEmote = document.createElement('div');
      this.bulleEmote.className = 'vy-emote-bulle hidden';
      this.bulleEmote.setAttribute('role', 'status');
      this.stage.appendChild(this.bulleEmote);
    }
    const el = this.bulleEmote;
    const label = (HudJeu.emotesDe().find(e => e[0] === id) || [])[1] || '';
    el.innerHTML = HudJeu.ICON['e_' + id] || '';
    el.setAttribute('aria-label', `${this.ch.name} : ${label}`);
    el.classList.remove('hidden', 'sort');
    void el.offsetWidth;
    el.classList.add('entre');
    const place = () => {
      const cb = this.combat, w = this.world;
      const who = this.enCombat && cb.player ? { x: cb.player.rx, y: cb.player.ry } : { x: w.player.rx, y: w.player.ry };
      const hr = this.stage.getBoundingClientRect();
      const k = UI.cellScale(this.renderer, who.x, who.y);
      const q = UI.cellClient(this.renderer, who.x, who.y);
      el.style.transform = `translate(${Math.round(q.x - hr.left - el.offsetWidth / 2)}px, ${Math.round(q.y - hr.top - 70 * k - el.offsetHeight)}px)`;
    };
    if (this.lacherEmote) this.lacherEmote();
    this.lacherEmote = UI.ancrer(place);
    place();
    clearTimeout(this.emoteT);
    this.emoteT = setTimeout(() => {
      el.classList.add('sort');
      setTimeout(() => { el.classList.add('hidden'); if (this.lacherEmote) { this.lacherEmote(); this.lacherEmote = null; } }, 400);
    }, 2600);
  }


  tic() {
    if (typeof Heure === 'object') { const l = Heure.libelle(Date.now()); if (l !== this.heureVue) { this.heureVue = l; this.rafraichirCarte(); } }
    this.rafraichirBadges();
    this.annoncerNiveau();
    this.rafraichirIndice();
    this.mesurerScene();
  }

  annoncerNiveau() {
    if (this.niveauEnAttente == null) return;
    const panel = document.getElementById('panel');
    if ((panel && !panel.classList.contains('hidden')) || this.world.state === 'dialogue' || this.world.showCombat) return;
    const lv = this.niveauEnAttente;
    this.niveauEnAttente = null;
    this.ui.ruban('Niveau supérieur !', { sorte: 'niveau', ms: 2600, sous: `Niveau ${lv}` });
  }

  rafraichirIndice() {
    const cb = this.combat;
    const on = this.enCombat && cb.phase === 'placement' && !document.body.classList.contains('vy-guide-visible');
    if (on) {
      const txt = UI.tactile() ? 'Touche une case bleue pour te placer, puis Prêt.' : 'Clique sur une case bleue pour te placer, puis Prêt.';
      if (this.indice.textContent !== txt) this.indice.textContent = txt;
    }
    this.indice.classList.toggle('hidden', !on);
  }

  mettreGaucher(on) {
    this.gaucher = !!on;
    HudJeu.ecrire('veylan.gaucher', on ? '1' : null);
    this.app.classList.toggle('vy-gaucher', this.gaucher);
    window.dispatchEvent(new Event('resize'));
  }
}

HudJeu.BIENTOT = [['metiers', 'Métiers'], ['boutique', 'Boutique cosmétique']];
HudJeu.EMOTES = [['salut', 'Saluer'], ['joie', 'Se réjouir'], ['merci', 'Remercier'], ['doute', 'S\'interroger'], ['repos', 'Se reposer']];
HudJeu.emotesDe = () => HudJeu.EMOTES.concat(typeof Garderobe !== 'undefined' ? Garderobe.emotes() : []);
HudJeu.menuEmotes = () => HudJeu.emotesDe().map(([id, label]) => `<button type="button" role="menuitem" data-emote="${id}" title="${label}" aria-label="${label}">${HudJeu.ICON['e_' + id] || HudJeu.ICON.emote}</button>`).join('');

HudJeu.avancement = (ch, t) => {
  if (t.done) return 1;
  const q = t.quest, st = Quests.state(ch, q.id), n = (q.steps || []).length;
  if (!st || !n) return 0;
  const s = q.steps[st.step];
  let part = 0;
  if (s && (s.type === 'kill' || s.type === 'gather') && s.count) part = Math.min(1, (st.progress || 0) / s.count);
  else if (s && s.type === 'collect' && s.count) part = Math.min(1, ch.count(s.item) / s.count);
  return Math.max(0, Math.min(1, (st.step + part) / n));
};

HudJeu.TAILLE_BARRE = { pc: { cols: 6, rows: 2, rowsMax: 3 }, tel: { cols: 6, rows: 1, rowsMax: 2 } };

HudJeu.ICON = (() => {
  const s = p => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${p}</svg>`;
  return {
    haut: s('<path d="M6 15l6-6 6 6"/>'),
    bas: s('<path d="M6 9l6 6 6-6"/>'),
    poignee: s('<path d="M9 6h.01M15 6h.01M9 12h.01M15 12h.01M9 18h.01M15 18h.01" stroke-width="3.2"/>'),
    sorts: s('<path d="M12 3l3 6 6 1-4.5 4.5L18 21l-6-3-6 3 1.5-6.5L3 10l6-1z"/>'),
    verrou: s('<rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/>'),
    ouvert: s('<rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V8a4 4 0 0 1 7.5-2"/>'),
    emote: s('<circle cx="12" cy="12" r="8.5"/><path d="M8.5 14.5c1 1.4 2.2 2 3.5 2s2.5-.6 3.5-2"/><path d="M9 9.5h.01M15 9.5h.01"/>'),
    oeil: s('<path d="M2 12s4-6.5 10-6.5S22 12 22 12s-4 6.5-10 6.5S2 12 2 12z"/><circle cx="12" cy="12" r="2.8"/>'),
    epingle: s('<path d="M12 21s-6-5.6-6-10.5A6 6 0 0 1 18 10.5C18 15.4 12 21 12 21z"/><circle cx="12" cy="10.5" r="2.2"/>'),
    quitter: s('<path d="M6 6l12 12M18 6L6 18"/>'),
    menus: s('<path d="M4 7h16M4 12h16M4 17h16"/>'),
    tactique: s('<path d="M12 4l8 4.5-8 4.5-8-4.5z"/><path d="M4 13l8 4.5 8-4.5"/>'),
    fiches: s('<rect x="3.5" y="5" width="17" height="14" rx="2"/><circle cx="9" cy="11" r="2.4"/><path d="M5.8 16.5c.6-1.8 1.8-2.6 3.2-2.6s2.6.8 3.2 2.6M14.5 10h3.5M14.5 13.5h3.5"/>'),
    veille: s('<path d="M15.5 3.5A8.5 8.5 0 1 0 20.5 15a7 7 0 0 1-5-11.5z"/><path d="M18 3v3M16.5 4.5h3"/>'),
    metiers: s('<path d="M14 6l4 4M9 11l7-7 4 4-7 7z"/><path d="M11 13l-7 7"/>'),
    familiers: s('<circle cx="7" cy="9" r="1.8"/><circle cx="11" cy="6" r="1.8"/><circle cx="15.5" cy="7" r="1.8"/><circle cx="18" cy="11" r="1.8"/><path d="M8 16c0-2.5 2-4.5 4.5-4.5S17 13.5 17 16c0 1.8-1.4 3-3 3h-3c-1.6 0-3-1.2-3-3z"/>'),
    montures: s('<path d="M7 20V12a5 5 0 0 1 10 0v8"/><path d="M4.5 20h5M14.5 20h5"/>'),
    guilde: s('<path d="M6 3h12v11l-6 6-6-6z"/><path d="M9 8h6M12 8v6"/>'),
    boutique: s('<path d="M6 9h12l-1.5 11h-9z"/><path d="M9 9V7a3 3 0 0 1 6 0v2"/><path d="M12 13l1 2-1 2-1-2z"/>'),
    e_salut: s('<path d="M8 13V6.5a1.5 1.5 0 0 1 3 0V11M11 10V5a1.5 1.5 0 0 1 3 0v6M14 10.5V7a1.5 1.5 0 0 1 3 0v6c0 4-2.5 7-6 7s-5.5-2-7-5l-1-2a1.5 1.5 0 0 1 2.6-1.5L8 14"/>'),
    e_joie: s('<path d="M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8z"/><path d="M18.5 16l.8 2 2 .8-2 .8-.8 2-.8-2-2-.8 2-.8z"/>'),
    e_merci: s('<path d="M12 20s-7-4.5-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.5-7 10-7 10z"/>'),
    e_doute: s('<path d="M9 9a3 3 0 1 1 4.5 2.6c-1 .6-1.5 1.3-1.5 2.4v.5"/><path d="M12 18h.01"/>'),
    e_repos: s('<path d="M5 8h5l-5 6h5M13 5h4l-4 5h4M15 15h3l-3 4h3"/>'),
    e_danse: s('<circle cx="12" cy="5" r="2"/><path d="M12 7.5l-4 4 3 1.5-1.5 6.5M12 7.5l5 2.5-1.5 3.5M11 13l4 2.5 2 4"/>'),
    e_defi: s('<path d="M12 21V11"/><path d="M8.5 11.5V8a1.5 1.5 0 0 1 3 0v3M11.5 8V5.5a1.5 1.5 0 0 1 3 0V11M14.5 7.5a1.5 1.5 0 0 1 3 0v4.5c0 3-1.5 5-4 6"/><path d="M8.5 11l-2-1.5a1.4 1.4 0 0 0-2 1.7l2.5 4"/>'),
  };
})();

class FicheGroupe {
  constructor(jeu) {
    this.jeu = jeu;
    this.el = document.createElement('div');
    this.el.className = 'vy-fiche-groupe hidden';
    this.el.setAttribute('role', 'dialog');
    this.el.setAttribute('aria-label', 'Groupe de monstres');
    jeu.stage.appendChild(this.el);
    this.el.addEventListener('click', evt => {
      const b = evt.target.closest('[data-act]');
      if (!b || !this.d) return;
      const g = this.d.group, w = jeu.world;
      if (b.dataset.act === 'attaquer') { this.cacher(false); w.attackGroup(g); }
      if (b.dataset.act === 'apercu') { FicheGroupe.apercuOuvert = !FicheGroupe.apercuOuvert; this.dessinerApercu(); this.placer(); }
      if (b.dataset.act === 'fiche') {
        const def = DATA.monsters[g.monsters[0].id];
        this.cacher(true);
        if (def && def.region) jeu.hud.carnetTab = def.region;
        jeu.hud.openCarnet();
      }
      if (b.dataset.act === 'fermer') this.cacher(true);
    });
    jeu.stage.addEventListener('pointerdown', evt => { if (this.d && !this.el.contains(evt.target) && !evt.target.closest('.vy-guide, .vy-rappel')) this.cacher(true); }, true);
    window.addEventListener('keydown', evt => { if (evt.key === 'Escape' && this.d) this.cacher(true); });
    jeu.world.on('map', d => { if (!(d && d.secteur)) this.cacher(false); });
    jeu.world.on('fight', () => this.cacher(false));
  }

  static ligneResistances(def) {
    const r = def.resist || {}, el = DATA.elements || {};
    const nom = k => (el[k] && el[k].label) || k;
    const fort = Object.keys(r).filter(k => r[k] > 0).map(k => `<span style="--c:${(el[k] && el[k].color) || '#ccc'}">${Util.esc(nom(k))} ${r[k]} %</span>`);
    const faible = Object.keys(r).filter(k => r[k] < 0).map(k => `<span style="--c:${(el[k] && el[k].color) || '#ccc'}">${Util.esc(nom(k))} ${-r[k]} %</span>`);
    if (!fort.length && !faible.length) return '';
    return `<li class="vy-fiche-groupe__resist">${fort.length ? `<small>Résiste</small> ${fort.join(' ')}` : ''}${faible.length ? `<small>Faible</small> ${faible.join(' ')}` : ''}</li>`;
  }

  static get DIFFICULTE() {
    return { facile: 'Facile', mesure: 'À ta mesure', difficile: 'Difficile', danger: 'Dangereux' };
  }

  montrer(d) {
    this.d = d;
    const g = d.group;
    const somme = g.monsters.reduce((s, m) => s + m.level, 0);
    const lignes = [];
    for (const m of g.monsters) {
      const l = lignes.find(x => x.id === m.id && x.level === m.level);
      if (l) l.n++; else lignes.push({ id: m.id, level: m.level, n: 1 });
    }
    const ile = !!this.jeu.world.plateau;
    const liste = lignes.map(l => {
      const def = DATA.monsters[l.id] || { name: l.id, color: '#aaa' };
      return `<li data-monstre="${Util.esc(l.id)}"><span class="vy-pastille" style="--c:${def.color}"></span><span class="vy-fiche-groupe__nom">${Util.esc(def.name)}</span><small>niv. ${l.level}</small>${def.recherche ? '<small class="vy-fiche-groupe__recherche">recherché</small>' : ''}${l.n > 1 ? `<b>×${l.n}</b>` : ''}</li>` +
        (ile ? FicheGroupe.ligneResistances(def) : '');
    }).join('');
    const wj = this.jeu.world, rep = typeof Repos !== 'undefined' && wj.zone && !wj.ch.dungeon && !wj.estDojo(g) ? Repos.valeur(wj.ch, wj.zone.id, Date.now()) : 0;
    this.el.innerHTML =
      `<header class="vy-fiche-groupe__tete"><div><h3>Groupe niveau ${somme}</h3><p class="vy-fiche-groupe__xp" title="XP estimée, avant le bonus d'un Défi réussi">${d.xp} XP</p>${rep ? `<p class="vy-fiche-groupe__repos" title="La zone s'est reposée : une victoire ici rapporte plus d'XP et de butin, puis le bonus baisse">Repos de la zone : +${rep} %</p>` : ''}</div>` +
      `<button type="button" class="vy-fiche-groupe__fermer" data-act="fermer" aria-label="Fermer">${Fenetres.ICON.fermer}</button></header>` +
      `<ul class="vy-fiche-groupe__liste">${liste}</ul>` +
      `<p class="vy-fiche-groupe__difficulte" data-niveau="${d.difficulty}">${FicheGroupe.DIFFICULTE[d.difficulty] || ''}</p>` +
      `<button type="button" class="vy-fiche-groupe__voir" data-act="apercu" aria-expanded="false" title="Voir l'aire du combat et les cases de départ">${Fenetres.ICON.tout}<span>Aire du combat</span></button>` +
      '<div class="vy-fiche-groupe__apercu hidden"></div>' +
      `<footer class="vy-fiche-groupe__pied"><button type="button" class="vy-bouton vy-bouton--petit" data-act="fiche" title="Le Carnet du Veilleur">${Fenetres.ICON.carnet}<span>Fiche</span></button>` +
      '<button type="button" class="vy-bouton vy-bouton--primaire vy-fiche-groupe__attaquer" data-act="attaquer">Attaquer</button></footer>';
    this.el.classList.remove('hidden');
    this.dessinerApercu();
    if (this.lacher) this.lacher();
    this.lacher = UI.ancrer(() => this.placer());
    this.placer();
  }

  dessinerApercu() {
    const boite = this.el.querySelector('.vy-fiche-groupe__apercu'), bouton = this.el.querySelector('[data-act="apercu"]');
    if (this.anim) { cancelAnimationFrame(this.anim); this.anim = 0; }
    if (!boite) return;
    const ouvert = !!FicheGroupe.apercuOuvert;
    if (bouton) { bouton.classList.toggle('on', ouvert); bouton.setAttribute('aria-expanded', String(ouvert)); }
    boite.classList.toggle('hidden', !ouvert);
    if (!ouvert) { boite.innerHTML = ''; this.jeu.world.apercuTerrain = null; return; }
    const a = this.d && this.jeu.world.apercuCombat ? this.jeu.world.apercuCombat(this.d.group) : null;
    this.jeu.world.apercuTerrain = a && a.map.ancre ? a : null;
    if (!a) { boite.innerHTML = '<p class="vy-fiche-groupe__note">Pas d\'aperçu pour ce combat.</p>'; return; }
    const { map, disposition: d, fenetre: f } = a;
    const L = 208, TW = L / Math.max(f.w, f.h) * 0.98, TH = TW / 2, HB = TH * 0.8;
    const W = L, H = Math.ceil((f.w + f.h) * TH / 2 + HB + 6);
    const dpr = Math.min(3, window.devicePixelRatio || 1);
    const cv = document.createElement('canvas');
    cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr);
    cv.style.width = W + 'px'; cv.style.height = H + 'px';
    cv.setAttribute('role', 'img');
    cv.setAttribute('aria-label', `Aire du combat : ${d.libelle}, départ à ${d.distance} cases`);
    const g = cv.getContext('2d');
    const cle = c => c.x + ',' + c.y;
    const bleues = new Set(d.bleues.map(cle)), rouges = new Map(d.rouges.map((c, i) => [cle(c), i]));
    const ecran = (x, y) => ({ x: W / 2 + (x - y) * TW / 2 + (f.h - f.w) * TW / 4, y: HB + 3 + (x + y + 1) * TH / 2 });
    const losange = (p, k, dy = 0) => {
      const w = TW / 2 * k, h = TH / 2 * k;
      g.beginPath(); g.moveTo(p.x, p.y - h + dy); g.lineTo(p.x + w, p.y + dy); g.lineTo(p.x, p.y + h + dy); g.lineTo(p.x - w, p.y + dy); g.closePath();
    };
    const S = Renderer.HL;
    const presents = new Set();
    const cases = [];
    for (let y = 0; y < f.h; y++) for (let x = 0; x < f.w; x++) cases.push({ x, y, X: f.x0 + x, Y: f.y0 + y });
    cases.sort((p, q) => (p.x + p.y) - (q.x + q.y) || p.x - q.x);
    const pion = (p, couleur, r) => {
      g.fillStyle = 'rgba(2,4,12,0.45)'; g.beginPath(); g.ellipse(p.x, p.y + 1, r * 1.1, r * 0.55, 0, 0, Math.PI * 2); g.fill();
      g.fillStyle = couleur; g.strokeStyle = 'rgba(2,4,12,0.75)'; g.lineWidth = 1.2;
      g.beginPath(); g.arc(p.x, p.y - r * 0.9, r, 0, Math.PI * 2); g.fill(); g.stroke();
    };
    const dessiner = now => {
      g.setTransform(dpr, 0, 0, dpr, 0, 0);
      g.clearRect(0, 0, W, H);
      const souffle = 0.72 + 0.28 * Math.sin(now / 340);
      for (const c of cases) {
        const k = Grid.tile(map, c.X, c.Y), p = ecran(c.x, c.y);
        if (k === Grid.HOLE) continue;
        losange(p, 1);
        if (k === Grid.WATER) { g.fillStyle = S.eau.fill; g.fill(); g.strokeStyle = S.eau.edge; g.lineWidth = 0.8; g.stroke(); presents.add('eau'); continue; }
        g.fillStyle = 'rgba(214,226,190,0.13)'; g.fill();
        g.strokeStyle = 'rgba(220,232,255,0.16)'; g.lineWidth = 0.8; g.stroke();
      }
      for (const c of cases) {
        const k = cle({ x: c.X, y: c.Y });
        const st = bleues.has(k) ? 'departJ' : rouges.has(k) ? 'departM' : null;
        if (!st) continue;
        const p = ecran(c.x, c.y);
        losange(p, 0.88);
        g.globalAlpha = st === 'departJ' ? souffle : 1;
        g.fillStyle = S[st].fill; g.fill(); g.fill();
        g.globalAlpha = 1;
        g.lineWidth = 2.2; g.strokeStyle = 'rgba(2,4,12,0.5)'; g.stroke();
        g.lineWidth = 1.1; g.strokeStyle = S[st].edge; g.stroke();
      }
      for (const c of cases) {
        const k = Grid.tile(map, c.X, c.Y), p = ecran(c.x, c.y);
        if (k === Grid.ROCK || k === Grid.TREE) {
          presents.add('obstacle');
          const arbre = k === Grid.TREE, h = arbre ? HB * 1.25 : HB, s = 0.82;
          const w = TW / 2 * s, hh = TH / 2 * s;
          g.fillStyle = arbre ? '#3f5e3a' : '#5d5850';
          g.beginPath(); g.moveTo(p.x - w, p.y); g.lineTo(p.x, p.y + hh); g.lineTo(p.x, p.y + hh - h); g.lineTo(p.x - w, p.y - h); g.closePath(); g.fill();
          g.fillStyle = arbre ? '#4d7246' : '#726c62';
          g.beginPath(); g.moveTo(p.x + w, p.y); g.lineTo(p.x, p.y + hh); g.lineTo(p.x, p.y + hh - h); g.lineTo(p.x + w, p.y - h); g.closePath(); g.fill();
          losange(p, s, -h); g.fillStyle = arbre ? '#6f9a5e' : '#a29b8d'; g.fill();
          g.lineWidth = 0.8; g.strokeStyle = 'rgba(2,4,12,0.45)'; g.stroke();
        }
        const kc = cle({ x: c.X, y: c.Y });
        if (rouges.has(kc)) {
          const m = a.monstres[rouges.get(kc)], def = m && DATA.monsters[m.id];
          pion(p, (def && def.color) || '#d8433a', TH * 0.42);
        } else if (d.joueur && d.joueur.x === c.X && d.joueur.y === c.Y) pion(p, '#ffffff', TH * 0.42);
      }
    };
    dessiner(performance.now());
    boite.innerHTML = `<p class="vy-fiche-groupe__note"><b>${Util.esc(d.libelle)}</b> · départ à ${d.distance} cases</p>`;
    boite.appendChild(cv);
    const leg = document.createElement('p');
    leg.className = 'vy-fiche-groupe__legende';
    const item = (f, e, t) => `<span style="--f:${f};--e:${e}">${t}</span>`;
    leg.innerHTML = item(S.departJ.fill, S.departJ.edge, 'tes cases') + item(S.departM.fill, S.departM.edge, 'monstres') +
      (presents.has('obstacle') ? item('#a29b8d', '#5d5850', 'obstacle') : '') + (presents.has('eau') ? item(S.eau.fill, S.eau.edge, 'eau') : '');
    boite.appendChild(leg);
    if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const boucle = now => {
      if (!cv.isConnected || !FicheGroupe.apercuOuvert) { this.anim = 0; return; }
      dessiner(now);
      this.anim = requestAnimationFrame(boucle);
    };
    this.anim = requestAnimationFrame(boucle);
  }

  placer() {
    if (!this.d) return;
    const g = this.d.group, R = this.jeu.renderer;
    const hr = this.jeu.stage.getBoundingClientRect();
    const k = UI.cellScale(R, g.rx, g.ry);
    const q = UI.cellClient(R, g.rx, g.ry);
    const w = this.el.offsetWidth, h = this.el.offsetHeight;
    const gx = q.x - hr.left, gy = q.y - hr.top;
    const local = r => ({ left: r.left - hr.left, top: r.top - hr.top, right: r.right - hr.left, bottom: r.bottom - hr.top });
    const genes = [{ left: gx - 22 * k, top: gy - 52 * k, right: gx + 22 * k, bottom: gy + 8 * k, poids: 1 }];
    const ap = this.jeu.world.apercuTerrain, an = ap && ap.map && ap.map.ancre;
    if (an) {
      const coins = [[an.x0, an.y0], [an.x0 + 15, an.y0], [an.x0, an.y0 + 15], [an.x0 + 15, an.y0 + 15]].map(([u, v]) => UI.cellClient(R, u, v));
      genes.push({ left: Math.min(...coins.map(c => c.x)) - hr.left, top: Math.min(...coins.map(c => c.y)) - hr.top, right: Math.max(...coins.map(c => c.x)) - hr.left, bottom: Math.max(...coins.map(c => c.y)) - hr.top, poids: 0.5 });
    }
    for (const b of document.querySelectorAll('.vy-guide:not(.hidden)')) {
      for (const part of b.querySelectorAll('.vy-guide__boite, .vy-guide__portrait')) genes.push(Object.assign(local(part.getBoundingClientRect()), { poids: 3 }));
    }
    const recouvre = (x, y) => genes.reduce((s, r) => s + r.poids * Math.max(0, Math.min(x + w, r.right) - Math.max(x, r.left)) * Math.max(0, Math.min(y + h, r.bottom) - Math.max(y, r.top)), 0);
    const essais = [[gx - w / 2, gy - 58 * k - h], [gx + 30 * k, gy - 28 * k - h / 2], [gx - 30 * k - w, gy - 28 * k - h / 2], [gx - w / 2, gy + 16 * k]];
    if (an) essais.push([6, gy - h / 2], [hr.width - w - 6, gy - h / 2]);
    let best = null;
    for (const [x0, y0] of essais) {
      const x = Math.max(6, Math.min(hr.width - w - 6, x0)), y = Math.max(6, Math.min(hr.height - h - 6, y0));
      const cout = recouvre(x, y);
      if (!best || cout < best.cout - 1) best = { x, y, cout };
    }
    this.el.style.transform = `translate(${Math.round(best.x)}px, ${Math.round(best.y)}px)`;
  }

  get ouverte() { return !!this.d; }

  cacher(relacher) {
    if (this.anim) { cancelAnimationFrame(this.anim); this.anim = 0; }
    if (this.jeu && this.jeu.world) this.jeu.world.apercuTerrain = null;
    if (!this.d) return;
    if (relacher) this.jeu.world.releaseGroup(this.d.group);
    this.d = null;
    this.el.classList.add('hidden');
    if (this.lacher) { this.lacher(); this.lacher = null; }
  }
}

class Glisse {
  constructor(jeu) {
    this.jeu = jeu;
    this.canvas = jeu.renderer.canvas;
    this.doigts = new Map();
    this.geste = null;
    this.avalerJusqua = 0;
    const c = this.canvas;
    c.addEventListener('pointerdown', e => this.bas(e));
    c.addEventListener('pointermove', e => this.bouge(e));
    c.addEventListener('pointerup', e => this.haut(e));
    c.addEventListener('pointercancel', e => this.annuler(e));
    window.addEventListener('click', e => { if (e.target === c && Date.now() < this.avalerJusqua) { e.stopImmediatePropagation(); e.preventDefault(); } }, true);
  }

  seuil() {
    const r = this.jeu.stage.getBoundingClientRect();
    return Math.max(56, Math.min(r.width, r.height) * 0.1);
  }

  bas(e) {
    if (e.pointerType !== 'touch' && e.pointerType !== 'pen') return;
    this.doigts.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (this.doigts.size > 1) { if (this.geste) this.geste.annule = true; return; }
    const vue = this.jeu.renderer.controls;
    this.geste = { id: e.pointerId, x: e.clientX, y: e.clientY, t: performance.now(), annule: !!(vue && vue.oneFingerPan()) };
  }

  bouge(e) {
    if (!this.doigts.has(e.pointerId)) return;
    this.doigts.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (this.doigts.size > 1 && this.geste) this.geste.annule = true;
  }

  annuler(e) {
    this.doigts.delete(e.pointerId);
    if (this.geste) this.geste.annule = true;
    if (!this.doigts.size) this.geste = null;
  }

  haut(e) {
    if (!this.doigts.has(e.pointerId)) return;
    this.doigts.delete(e.pointerId);
    const g = this.geste;
    if (this.doigts.size) return;
    this.geste = null;
    if (!g || g.annule || g.id !== e.pointerId) return;
    const dx = e.clientX - g.x, dy = e.clientY - g.y;
    if (Math.hypot(dx, dy) < this.seuil() || performance.now() - g.t > 900) return;
    if (this.glisser(dx, dy)) this.avalerJusqua = Date.now() + 450;
  }

  glisser(dx, dy) {
    const w = this.jeu.world;
    if (w.state !== 'explore' || w.showCombat) return false;
    const side = World.sideToward(-dx, -dy, w.openSides());
    if (!side) return false;
    return w.exitToward(side);
  }
}

class Tourne {
  constructor() {
    this.el = document.createElement('div');
    this.el.className = 'vy-tourne hidden';
    this.el.setAttribute('role', 'dialog');
    this.el.setAttribute('aria-label', 'Tourne ton téléphone');
    this.el.innerHTML = '<div class="vy-tourne__boite"><span class="vy-tourne__tel" aria-hidden="true"></span>' +
      '<h2>Tourne ton téléphone</h2><p>Veylan se joue à l\'horizontale : la carte d\'un côté, ton panneau de l\'autre.</p>' +
      '<button type="button" class="vy-tourne__lien">Continuer en portrait</button></div>';
    document.body.appendChild(this.el);
    this.el.querySelector('.vy-tourne__lien').addEventListener('click', () => {
      try { sessionStorage.setItem('veylan.portrait', '1'); } catch (e) {   }
      this.verifier();
    });
    this.mq = typeof matchMedia === 'function' ? matchMedia('(orientation: portrait) and (max-width: 600px)') : null;
    if (this.mq && this.mq.addEventListener) this.mq.addEventListener('change', () => this.verifier());
    window.addEventListener('resize', () => this.verifier());
    this.verifier();
  }

  verifier() {
    let ignore = false;
    try { ignore = sessionStorage.getItem('veylan.portrait') === '1'; } catch (e) {   }
    const on = !!(this.mq && this.mq.matches) && !ignore;
    this.el.classList.toggle('hidden', !on);
  }
}
