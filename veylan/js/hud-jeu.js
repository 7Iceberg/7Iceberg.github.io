// L'interface de jeu à la manière des grands tactiques sur téléphone, dans la charte Veylan : le
// panneau de droite (cristal de vie, PA et PM, boutons rapides, grille de sorts et d'objets en
// pages, menus ronds, discussion et émotes), la carte d'infos en haut à gauche avec la quête
// suivie, la fiche d'un groupe de monstres, le glissé pour changer de carte, le compte à rebours
// du placement, les badges des menus, « Niveau supérieur ! », et l'invitation à tourner le
// téléphone. Le panneau est une colonne à part de la grille de #app, à côté de #stage, jamais
// posée dessus : la caméra (js/camera.js) remplit #stage. css/jeu.css décide quand il se
// montre (téléphone en paysage, 500 pixels de haut ou moins) ; sur ordinateur et tablette, la
// disposition en fenêtres reste.
class HudJeu {
  constructor(hud) {
    this.hud = hud;
    this.world = hud.world;
    this.combat = hud.combat;
    this.ui = hud.ui;
    this.renderer = hud.renderer;
    this.app = document.getElementById('app');
    this.stage = document.getElementById('stage');
    this.onglet = null;            // 'sorts' | 'objets', null : celui du mode
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
      this.onglet = null;
      // Le placement a son compte à rebours : à zéro, le combat commence seul (le tutoriel
      // peut l'éteindre pour son premier combat, js/guide.js).
      this.ui.armerPlacement(UI.PLACEMENT_SECONDES);
      this.rafraichir();
    });
    w.on('fightEnd', () => { this.fermerQuitter(); this.rafraichir(); });
    w.on('groupPopup', d => this.fiche.montrer(d));
    for (const e of ['setup', 'start', 'turn', 'end']) cb.on(e, () => this.rafraichir());
    Bus.on('levelUp', d => { this.niveauEnAttente = d.level; this.annoncerNiveau(); });
    window.addEventListener('veylan:discussionNonLues', e => this.compterDiscussion(e.detail && e.detail.n));
    window.addEventListener('resize', () => { this.mesurer(); this.rafraichir(); });
    // Les badges, le niveau en attente et l'indice de placement suivent l'état du jeu.
    setInterval(() => this.tic(), 400);
    this.mesurer();
    this.rafraichir();
  }

  static lire(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }
  static ecrire(k, v) { try { if (v == null) localStorage.removeItem(k); else localStorage.setItem(k, v); } catch (e) { /* stockage indisponible */ } }

  get ch() { return this.world.ch; }
  get enCombat() { return !!this.world.showCombat; }
  get ongletActif() { return this.onglet || (this.enCombat ? 'sorts' : 'objets'); }

  // ----- Le panneau de droite -----

  construirePanneau() {
    const p = this.panneau = document.getElementById('panneau');
    const I = Fenetres.ICON, J = HudJeu.ICON;
    const menus = (Hud.MENUS || []).map(([id, label, key, icon]) => `<button type="button" class="vy-rond" data-win="${id}" aria-label="${label} (${key})" title="${label}">${icon}<span class="vy-badge" hidden></span></button>`).join('');
    // La Veille du jour (js/hud-veille.js) se pilote par toggleWin('veille') ; un point tant que le
    // dépôt du jour reste à faire (rafraichirBadges).
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
      `<div class="vy-emotes hidden" role="menu" aria-label="Émotes">${HudJeu.EMOTES.map(([id, label]) => `<button type="button" role="menuitem" data-emote="${id}" title="${label}" aria-label="${label}">${J['e_' + id]}</button>`).join('')}</div>`;
    this.grille = p.querySelector('.vy-panneau__grille');
    this.q = s => p.querySelector(s);
    p.addEventListener('click', evt => this.clic(evt));
    // Glisser pour réordonner la grille, quand elle est déverrouillée.
    this.grille.addEventListener('pointerdown', evt => this.debutGlisser(evt));
    this.grille.addEventListener('contextmenu', evt => evt.preventDefault());
    this.verrou = HudJeu.lire('veylan.grille.libre') !== '1';
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

  // La grille prend la place libre : autant de rangées de cinq que la hauteur en permet.
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
    this.rafraichirCarte();
    this.rafraichirBadges();
    this.mesurerScene();
  }

  // Après chaque rafraîchissement de l'interface de combat (js/ui.js) : PA, PM, PV, sorts.
  rafraichirCombat() {
    if (!this.enCombat) return;
    this.rafraichirVie();
    this.rafraichirGrille();
    this.rafraichirIndice();
    this.mesurerScene();
  }

  // La largeur de la scène règle la taille des rubans ; celle de la barre de tour (en bas à
  // droite, en combat) dit où se pose la boîte du guide : à côté, ou au-dessus si la place manque.
  mesurerScene() {
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
    const xp = Math.round(ch.xpProgress() * 100);
    this.q('.vy-panneau__niv').textContent = `Niv. ${ch.level}`;
    const j = this.q('.vy-panneau__xp-jauge');
    if (!j.firstChild) j.innerHTML = Util.jauge('xp', xp, 100, null, 'Expérience', 'vy-jauge--fine');
    else Util.setJauge(j.firstChild, xp, 100);
    j.title = ch.level >= Character.MAX_LEVEL ? 'Niveau maximum' : `Expérience : ${xp} %`;
  }

  // ----- Boutons rapides : en exploration, en combat -----

  rafraichirRapides() {
    const J = HudJeu.ICON, I = Fenetres.ICON;
    const r = this.enCombat
      ? [['quitter', 'Quitter le combat', J.quitter], ['tactique', 'Vue tactique', J.tactique, this.renderer.tactique], ['fiches', 'Fiches des combattants', J.fiches, this.app.classList.contains('vy-fiches')], ['defi', 'Défi du combat', I.succes]]
      : [['degager', 'Vue dégagée', J.oeil, this.vueDegagee], ['carte', 'Carte du monde', I.carte], ['suivi', 'Quête suivie', J.epingle, !this.app.classList.contains('vy-sans-suivi')], ['journal', 'Journal', I.journal]];
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
      case 'quitter': this.demanderQuitter(); break;
      case 'tactique': this.renderer.tactique = !this.renderer.tactique; break;
      case 'fiches': app.classList.toggle('vy-fiches'); this.ui.renderInspect(); break;
      case 'defi': { const c = this.combat.challenge; this.ui.banner(c ? `Défi : ${c.name}. ${c.desc}${c.failed ? ' (raté : ' + c.failed + ')' : c.success ? ' (réussi)' : ''}` : 'Pas de défi dans ce combat.', 2600); break; }
    }
    this.rafraichirRapides();
    if (b && b.isConnected) b.blur();
  }

  // Quitter le combat : une confirmation au milieu de la scène, le combat compte comme perdu.
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

  // ----- La grille : sorts ou objets, en pages, réordonnable -----

  // Les sorts : l'arme d'abord (première case), puis ceux de la classe ; en exploration, les sorts
  // connus. Les objets : les consommables, puis l'équipement du sac. Un ordre choisi par le joueur
  // (glisser, grille déverrouillée) est gardé dans ce navigateur.
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
      } else this.infoSort(b, id);
      return;
    }
    const id = b.dataset.objet, d = Items.get(id);
    if (!d) return;
    if (this.world.state === 'combat') { this.hud.toast('Pas pendant un combat.'); return; }
    if (d.kind === 'consumable') this.world.useItem(id);
    else this.world.equip(id);
  }

  // Hors de son tour ou hors combat : la fiche du sort dans l'infobulle, un instant.
  infoSort(b, id) {
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
    this.infoT = setTimeout(() => t.classList.add('hidden'), 2600);
  }

  // Glisser une case sur une autre les échange (grille déverrouillée seulement).
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

  // ----- Carte d'infos et quête suivie, en haut à gauche de la scène -----

  rafraichirCarte() {
    const w = this.world, def = w.mapDef;
    if (!def || !this.carteInfo) return;
    const room = !!def.room;
    const zone = w.zone ? w.zone.name : '';
    const pos = !room && typeof Atlas === 'object' ? Atlas.coordsOf(w.mapId) : null;
    const lv = room ? ((World.dungeonDef(def.dungeonId) || {}).level || (w.zone && w.zone.level)) : def.level;
    const niveau = Array.isArray(lv) ? (lv[0] === lv[1] ? `Niveau ${lv[0]}` : `Niveau ${lv[0]} à ${lv[1]}`) : '';
    const t = Quests.tracker(this.ch)[0];
    const html = `<button type="button" class="vy-carte-info__carte" data-act="carte" aria-label="${Util.esc(zone)}, ${Util.esc(def.name)} : ouvrir la carte du monde">` +
      `<span class="vy-carte-info__titre"><b>${Util.esc(zone || def.name)}</b>${zone ? ` <span>(${Util.esc(def.name)})</span>` : ''}</span>` +
      `<span class="vy-carte-info__ligne">${pos ? `${pos[0]},${pos[1]}, ` : ''}${niveau}</span></button>` +
      (t ? `<button type="button" class="vy-carte-info__suivi${t.done ? ' fini' : ''}" data-act="quetes" aria-label="Quête suivie : ${Util.esc(t.quest.name)}, ${Util.esc(t.text)}">${HudJeu.ICON.epingle}<span><b>${Util.esc(t.quest.name)}</b><small>${Util.esc(t.text)}</small></span></button>` : '');
    if (this.carteInfo.dataset.html !== html) { this.carteInfo.dataset.html = html; this.carteInfo.innerHTML = html; }
  }

  // ----- Badges des menus : « + » pour des points à placer, « ! » pour une quête à rendre, un point
  // pour la Veille du jour à faire -----

  rafraichirBadges() {
    const ch = this.ch;
    const marks = {
      carac: ch.statPoints > 0 ? '+' : '',
      sorts: typeof ch.spellPoints === 'number' && ch.spellPoints > 0 ? '+' : '',
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
    // Le menu d'une fenêtre ouverte s'allume, comme dans la barre des menus (Hud.syncMenus).
    const fen = this.hud.fen;
    for (const b of this.panneau.querySelectorAll('.vy-rond[data-win]')) b.classList.toggle('on', !!(fen && fen.isOpen(b.dataset.win)));
  }

  // « Bientôt » : une fonction prévue, montrée grisée, qui ne prétend pas marcher.
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
    const s = this.q('.vy-panneau__nonlu');
    if (!s) return;
    s.hidden = !n;
    s.textContent = n > 9 ? '9+' : String(n || '');
  }

  // ----- Émotes : une bulle au-dessus du personnage, rien n'est envoyé -----

  basculerEmotes(on) {
    const box = this.q('.vy-emotes'), b = this.q('.vy-panneau__emote');
    const open = on != null ? on : box.classList.contains('hidden');
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
    const label = (HudJeu.EMOTES.find(e => e[0] === id) || [])[1] || '';
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

  // ----- Le rythme : badges, niveau en attente, indice de placement -----

  tic() {
    this.rafraichirBadges();
    this.annoncerNiveau();
    this.rafraichirIndice();
    this.mesurerScene();
  }

  // « Niveau supérieur ! » : tout de suite si rien n'est ouvert, sinon après l'écran de fin de
  // combat ou le dialogue.
  annoncerNiveau() {
    if (this.niveauEnAttente == null) return;
    const panel = document.getElementById('panel');
    if ((panel && !panel.classList.contains('hidden')) || this.world.state === 'dialogue' || this.world.showCombat) return;
    const lv = this.niveauEnAttente;
    this.niveauEnAttente = null;
    this.ui.ruban('Niveau supérieur !', { sorte: 'niveau', ms: 2600, sous: `Niveau ${lv}` });
  }

  // Pendant le placement, une ligne rappelle quoi faire (sauf quand le guide le dit déjà).
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

// Les fonctions prévues, grisées dans les menus.
HudJeu.BIENTOT = [['metiers', 'Métiers'], ['familiers', 'Familiers'], ['montures', 'Montures'], ['guilde', 'Guilde'], ['boutique', 'Boutique cosmétique']];
HudJeu.EMOTES = [['salut', 'Saluer'], ['joie', 'Se réjouir'], ['merci', 'Remercier'], ['doute', 'S\'interroger'], ['repos', 'Se reposer']];

// Pictogrammes du panneau : un trait, lisibles en 18 pixels, comme ceux des fenêtres.
HudJeu.ICON = (() => {
  const s = p => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${p}</svg>`;
  return {
    haut: s('<path d="M6 15l6-6 6 6"/>'),
    bas: s('<path d="M6 9l6 6 6-6"/>'),
    sorts: s('<path d="M12 3l3 6 6 1-4.5 4.5L18 21l-6-3-6 3 1.5-6.5L3 10l6-1z"/>'),
    verrou: s('<rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/>'),
    ouvert: s('<rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V8a4 4 0 0 1 7.5-2"/>'),
    emote: s('<circle cx="12" cy="12" r="8.5"/><path d="M8.5 14.5c1 1.4 2.2 2 3.5 2s2.5-.6 3.5-2"/><path d="M9 9.5h.01M15 9.5h.01"/>'),
    oeil: s('<path d="M2 12s4-6.5 10-6.5S22 12 22 12s-4 6.5-10 6.5S2 12 2 12z"/><circle cx="12" cy="12" r="2.8"/>'),
    epingle: s('<path d="M12 21s-6-5.6-6-10.5A6 6 0 0 1 18 10.5C18 15.4 12 21 12 21z"/><circle cx="12" cy="10.5" r="2.2"/>'),
    quitter: s('<path d="M6 6l12 12M18 6L6 18"/>'),
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
  };
})();

// ----- La fiche d'un groupe de monstres, près du groupe touché -----
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
      if (b.dataset.act === 'fiche') {
        const def = DATA.monsters[g.monsters[0].id];
        this.cacher(true);
        if (def && def.region) jeu.hud.carnetTab = def.region;
        jeu.hud.openCarnet();
      }
      if (b.dataset.act === 'fermer') this.cacher(true);
    });
    // Toucher ailleurs (la carte, un autre groupe) referme la fiche ; pas la bulle du guide.
    jeu.stage.addEventListener('pointerdown', evt => { if (this.d && !this.el.contains(evt.target) && !evt.target.closest('.vy-guide, .vy-rappel')) this.cacher(true); }, true);
    window.addEventListener('keydown', evt => { if (evt.key === 'Escape' && this.d) this.cacher(true); });
    // Sur l'île, marcher d'une sous-zone à l'autre (`secteur`) ne referme pas la fiche.
    jeu.world.on('map', d => { if (!(d && d.secteur)) this.cacher(false); });
    jeu.world.on('fight', () => this.cacher(false));
  }

  // « Résiste : Feu 30 % · Faible : Eau 50 % » (rien si le monstre n'a ni l'une ni l'autre).
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

  // d : { group, xp, difficulty } (World.inspectGroup).
  montrer(d) {
    this.d = d;
    const g = d.group;
    const somme = g.monsters.reduce((s, m) => s + m.level, 0);
    const lignes = [];
    for (const m of g.monsters) {
      const l = lignes.find(x => x.id === m.id && x.level === m.level);
      if (l) l.n++; else lignes.push({ id: m.id, level: m.level, n: 1 });
    }
    // Sur l'île d'Ervane, chaque monstre montre aussi ses résistances et ses faiblesses : c'est la
    // leçon des Glyms (un élément contre l'autre).
    const ile = !!this.jeu.world.plateau;
    const liste = lignes.map(l => {
      const def = DATA.monsters[l.id] || { name: l.id, color: '#aaa' };
      // `data-monstre` : le guide de l'île y met en avant le Glym qui craint et celui qui résiste.
      return `<li data-monstre="${Util.esc(l.id)}"><span class="vy-pastille" style="--c:${def.color}"></span><span class="vy-fiche-groupe__nom">${Util.esc(def.name)}</span><small>niv. ${l.level}</small>${l.n > 1 ? `<b>×${l.n}</b>` : ''}</li>` +
        (ile ? FicheGroupe.ligneResistances(def) : '');
    }).join('');
    this.el.innerHTML =
      `<header class="vy-fiche-groupe__tete"><div><h3>Groupe niveau ${somme}</h3><p class="vy-fiche-groupe__xp" title="XP estimée, avant le bonus d'un Défi réussi">${d.xp} XP</p></div>` +
      `<button type="button" class="vy-fiche-groupe__fermer" data-act="fermer" aria-label="Fermer">${Fenetres.ICON.fermer}</button></header>` +
      `<ul class="vy-fiche-groupe__liste">${liste}</ul>` +
      `<p class="vy-fiche-groupe__difficulte" data-niveau="${d.difficulty}">${FicheGroupe.DIFFICULTE[d.difficulty] || ''}</p>` +
      `<footer class="vy-fiche-groupe__pied"><button type="button" class="vy-bouton vy-bouton--petit" data-act="fiche" title="Le Carnet du Veilleur">${Fenetres.ICON.carnet}<span>Fiche</span></button>` +
      '<button type="button" class="vy-bouton vy-bouton--primaire vy-fiche-groupe__attaquer" data-act="attaquer">Attaquer</button></footer>';
    this.el.classList.remove('hidden');
    if (this.lacher) this.lacher();
    this.lacher = UI.ancrer(() => this.placer());
    this.placer();
  }

  // Près du groupe (sa position animée), dans la scène : au-dessus, sinon à droite, à gauche ou
  // dessous, là où la fiche cache le moins le groupe et la boîte du guide (ou d'un dialogue).
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
    for (const b of document.querySelectorAll('.vy-guide:not(.hidden)')) {
      for (const part of b.querySelectorAll('.vy-guide__boite, .vy-guide__portrait')) genes.push(Object.assign(local(part.getBoundingClientRect()), { poids: 3 }));
    }
    const recouvre = (x, y) => genes.reduce((s, r) => s + r.poids * Math.max(0, Math.min(x + w, r.right) - Math.max(x, r.left)) * Math.max(0, Math.min(y + h, r.bottom) - Math.max(y, r.top)), 0);
    const essais = [[gx - w / 2, gy - 58 * k - h], [gx + 30 * k, gy - 28 * k - h / 2], [gx - 30 * k - w, gy - 28 * k - h / 2], [gx - w / 2, gy + 16 * k]];
    let best = null;
    for (const [x0, y0] of essais) {
      const x = Math.max(6, Math.min(hr.width - w - 6, x0)), y = Math.max(6, Math.min(hr.height - h - 6, y0));
      const cout = recouvre(x, y);
      if (!best || cout < best.cout - 1) best = { x, y, cout };
    }
    this.el.style.transform = `translate(${Math.round(best.x)}px, ${Math.round(best.y)}px)`;
  }

  get ouverte() { return !!this.d; }

  // `relacher` : le groupe reprend sa marche (on n'attaque pas).
  cacher(relacher) {
    if (!this.d) return;
    if (relacher) this.jeu.world.releaseGroup(this.d.group);
    this.d = null;
    this.el.classList.add('hidden');
    if (this.lacher) { this.lacher(); this.lacher = null; }
  }
}

// ----- Glisser l'écran d'un doigt pour changer de carte -----
// Comme on tourne une page : glisser vers la droite amène la carte de gauche (la sortie du côté
// opposé au geste). Un deuxième doigt annule le geste : les gestes à deux doigts sont ceux de la
// caméra. Zoomée au-delà de l'ajustement, la vue se déplace d'un doigt (js/camera.js) : le geste
// ne change pas de carte. Toucher le bord marche toujours (js/world.js).
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
    // Le clic qui suit un glissé ne doit pas faire marcher le Veilleur.
    window.addEventListener('click', e => { if (e.target === c && Date.now() < this.avalerJusqua) { e.stopImmediatePropagation(); e.preventDefault(); } }, true);
  }

  // La distance à parcourir : 56 pixels, ou un dixième de la scène si elle est grande.
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

  // Un geste (dx, dy) à l'écran : la sortie opposée, s'il y en a une de ce côté. Vrai s'il part.
  glisser(dx, dy) {
    const w = this.jeu.world;
    if (w.state !== 'explore' || w.showCombat) return false;
    const side = World.sideToward(-dx, -dy, w.openSides());
    if (!side) return false;
    return w.exitToward(side);
  }
}

// ----- « Tourne ton téléphone » : le jeu se joue en paysage -----
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
      try { sessionStorage.setItem('veylan.portrait', '1'); } catch (e) { /* stockage indisponible */ }
      this.verifier();
    });
    this.mq = typeof matchMedia === 'function' ? matchMedia('(orientation: portrait) and (max-width: 600px)') : null;
    if (this.mq && this.mq.addEventListener) this.mq.addEventListener('change', () => this.verifier());
    window.addEventListener('resize', () => this.verifier());
    this.verifier();
  }

  verifier() {
    let ignore = false;
    try { ignore = sessionStorage.getItem('veylan.portrait') === '1'; } catch (e) { /* stockage indisponible */ }
    const on = !!(this.mq && this.mq.matches) && !ignore;
    this.el.classList.toggle('hidden', !on);
  }
}
