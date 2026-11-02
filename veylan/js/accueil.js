// L'entrée dans le jeu, de l'accueil au personnage créé, en écrans successifs :
//   Accueil (actualités, journal des mises à jour, réglages, « Continuer », partie d'invité)
//   → Personnages (cinq emplacements) → Choix du monde (avant le premier personnage)
//   → « As-tu déjà joué à Veylan ? » (trois questions pour qui commence) → Classe → Apparence → le jeu.
// Contrat avec js/main.js : new Accueil({ onStart, painter, rendu }), show(), hide() ; onStart(personnage).
// Retour : bouton en haut à gauche ou Échap. Les illustrations sont peintes par js/accueil-art.js.
// Mémorisé (localStorage, toujours sous try/catch) : le monde choisi, les couleurs récentes, le rendu,
// le thème ; sessionStorage garde l'écran où revenir après « Changer de personnage » en jeu.
const Accueil = (() => {
class Accueil {
  constructor(opts) {
    opts = opts || {};
    this.el = document.getElementById('title');
    this.onStart = opts.onStart || (() => {});
    this.rendu = opts.rendu || 'canvas';
    AccueilArt.painter = opts.painter || null;
    this.calme = !!(window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches);
    this.pile = [];
    this.ecran = null;
    this.actuIndex = 0;
    this.b = null;
    // La scène (fond, éclats, éclairs) est posée une fois ; les écrans glissent par-dessus.
    this.el.innerHTML = '<div class="titre-scene" aria-hidden="true"><div class="titre-fond"></div><canvas class="titre-fx"></canvas><div class="titre-brume"></div></div>' +
      '<div class="entree-teinte" aria-hidden="true"></div><div class="entree" role="application" aria-roledescription="accueil"><div class="entree-vue"></div><div class="entree-toast" role="status" aria-live="polite"></div></div>' +
      '<canvas class="titre-fx-avant" aria-hidden="true"></canvas>';
    this.racine = this.el.querySelector('.entree');
    this.vue = this.el.querySelector('.entree-vue');
    this.teinte = this.el.querySelector('.entree-teinte');
    this.fx = typeof TitreFx === 'function' ? new TitreFx(this.el.querySelector('.titre-fx'), this.el, this.el.querySelector('.titre-fx-avant')) : null;
    this.racine.addEventListener('click', evt => this.clic(evt));
    this.racine.addEventListener('input', evt => this.saisie(evt));
    this.racine.addEventListener('keydown', evt => { if (evt.key === 'Enter' && evt.target.dataset && evt.target.dataset.entree) { evt.preventDefault(); this.clic(evt, evt.target.dataset.entree); } });
    this.onKey = evt => {
      if (this.el.classList.contains('hidden') || evt.key !== 'Escape') return;
      evt.preventDefault();
      if (this.calqueEl) this.fermerCalque(); else this.retour();
    };
    window.addEventListener('keydown', this.onKey);
    if (typeof ResizeObserver === 'function') {
      let attente = 0;
      this.ro = new ResizeObserver(() => { cancelAnimationFrame(attente); attente = requestAnimationFrame(() => this.redessiner()); });
      this.ro.observe(this.racine);
    }
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => this.redessiner());
    this.boucle = this.boucle.bind(this);
    // Après « Changer de personnage » en jeu, on revient directement à la liste. Le premier écran
    // ne prend pas le focus : rien ne s'allume avant le premier geste.
    let retour = null;
    try { retour = sessionStorage.getItem('veylan.entree'); sessionStorage.removeItem('veylan.entree'); } catch (e) { /* rien */ }
    this.premier = true;
    this.aller(retour === 'personnages' && Save.list().length ? 'personnages' : 'accueil', { racine: true });
    // L'île d'Ervane disponible (js/ile.js) : Three.js se charge pendant qu'on choisit, pour que la
    // bascule vers la 3D n'attende pas le réseau (docs/ILE-TECHNIQUE.md, 1.5).
    // Seulement si la 3D peut servir : WebGL, et un personnage de l'appareil déjà sur l'île ; une
    // création le demande à son tour (commencerCreation).
    // (Un personnage d'Orsane qui garde une trace d'Ervane, après « Recommencer à Orsane », n'y remonte pas.)
    if (typeof Ile === 'object' && Ile.raisons.includes('personnage') && Save.list().some(p => Ile.origineDe(p.uid) === 'ervane')) Accueil.prechargerIle();
    // Un import qui attendait que l'île soit chargée (js/save.js, docs/ILE-TECHNIQUE.md, 7.3) :
    // le code reprend ici tout seul, une fois.
    let attente = null;
    try { attente = sessionStorage.getItem('veylan.ile.import'); if (attente) sessionStorage.removeItem('veylan.ile.import'); } catch (e) { attente = null; }
    if (attente) setTimeout(() => this.reprendreImport(attente), 0);
  }

  reprendreImport(code) {
    const r = Save.importText(code);
    // La clé a été lue et effacée : l'île est disponible ici, le moteur ne redemande pas de recharge.
    if (!r.ch) { this.toast(r.error || 'Code invalide.'); return; }
    if (!Save.write(r.ch)) { this.toast('Impossible d\'enregistrer ce personnage ici.'); return; }
    this.choix = r.ch.uid;
    this.toast(`${r.ch.name} est arrivé sur cet appareil.`);
    this.afficher('personnages', 1);
  }

  // En développement (fichier local, localhost, ?dev=1) : les réglages montrent les essais.
  // La règle du développement est celle de Util.dev (js/util.js), la même partout.
  static dev() {
    try { return Util.dev(); } catch (e) { return false; }
  }
  // La case « Naître sur Ervane (essai) » : en développement, quand l'île est disponible, que
  // l'adresse en parle (?ile=) ou que la case est déjà cochée. Ailleurs, les réglages ne changent
  // pas de hauteur (ils tiennent dans l'écran du téléphone sans défiler).
  static essaiIle() {
    // Allumée par la source (DATA.ile.active, depuis le basculement), l'île n'a plus d'essai à offrir.
    if (!Accueil.dev() || typeof Ile !== 'object' || (DATA.ile && DATA.ile.active)) return false;
    let adresse = false;
    try { adresse = new URLSearchParams(location.search).has('ile'); } catch (e) { /* rien */ }
    return Ile.disponible || adresse || Accueil.lire('veylan.ile.essai') === '1';
  }

  // ----- Visibilité -----
  // Tant que l'entrée est là, la page ne défile pas : le jeu derrière (plus large que l'écran sur
  // téléphone) ne doit pas pouvoir glisser sous le doigt.
  hide() {
    document.documentElement.classList.remove('entree-ouverte');
    this.el.classList.add('hidden');
    if (this.fx) this.fx.stop();
    this.anime = null;
    clearInterval(this.minuteur);
    window.removeEventListener('keydown', this.onKey);
  }
  show() {
    document.documentElement.classList.add('entree-ouverte');
    this.el.classList.remove('hidden');
    if (this.fx) this.fx.start();
    window.removeEventListener('keydown', this.onKey);
    window.addEventListener('keydown', this.onKey);
    requestAnimationFrame(this.boucle);
  }

  // Une seule boucle d'animation : le globe, le socle tournant, les particules de la classe.
  boucle(t) {
    if (this.el.classList.contains('hidden')) return;
    if (this.anime && !document.hidden) this.anime(t);
    requestAnimationFrame(this.boucle);
  }

  toast(texte) {
    const t = this.racine.querySelector('.entree-toast');
    t.textContent = fines(texte);
    t.classList.add('on');
    clearTimeout(this.toastFin);
    this.toastFin = setTimeout(() => t.classList.remove('on'), 2600);
  }

  // ----- Navigation -----
  aller(id, o) {
    o = o || {};
    if (o.racine) this.pile = [];
    else if (this.ecran && !o.remplace) this.pile.push(this.ecran);
    this.afficher(id, o.sens || 1);
  }

  retour() {
    if (this.calqueEl) return this.fermerCalque();
    if (this.ecran === 'monde' && this.mondeTable) { this.mondeTable = false; return this.afficher('monde', -1); }
    const prev = this.pile.pop();
    if (prev) this.afficher(prev, -1);
    else if (this.ecran !== 'accueil') this.afficher('accueil', -1);
  }

  // Dessine l'écran `id` ; l'ancien s'efface en glissant (un fondu seul si le système le demande).
  afficher(id, sens) {
    const old = this.vue.querySelector('.ecran:not(.ecran--sortie)');
    this.ecran = id;
    this.anime = null;
    clearInterval(this.minuteur);
    const tmp = document.createElement('div');
    tmp.innerHTML = fines(this['ecran_' + id]());
    const el = tmp.firstElementChild;
    el.classList.add(sens < 0 ? 'ecran--retour' : 'ecran--avance');
    this.vue.appendChild(el);
    if (old) {
      old.classList.add('ecran--sortie');
      old.setAttribute('aria-hidden', 'true');
      old.inert = true;
      setTimeout(() => old.remove(), 240);
    }
    this.ecranEl = el;
    this.teinter(id === 'classe' || id === 'apparence' ? this.couleurClasse() : null);
    if (this.fx) this.fx.sobre = id !== 'accueil';
    this.monter(id);
    const cible = el.querySelector('[data-focus]') || el.querySelector('.entree-retour') || el.querySelector('button');
    if (cible && !this.premier) cible.focus({ preventScroll: true });
    this.premier = false;
  }

  // Teinte du fond aux couleurs de la classe (ou aucune). --classe sert aussi au bandeau de la
  // classe et glisse d'une couleur à l'autre (css/accueil.css).
  teinter(col) {
    if (col) this.el.style.setProperty('--classe', col);
    this.teinte.classList.toggle('on', !!col);
  }

  // Après le rendu HTML d'un écran : toiles, écouteurs, animations.
  monter(id) {
    const m = { accueil: () => this.monterAccueil(), personnages: () => this.monterPersonnages(), monde: () => this.monterMonde(), deja: () => this.monterDeja(), classe: () => this.monterClasse(), apparence: () => this.monterApparence() }[id];
    if (m) m();
  }

  redessiner() {
    if (this.el.classList.contains('hidden') || !this.ecran) return;
    if (this.ecran === 'accueil') { this.dessinerActu(true); this.dessinerBusteContinuer(); }
    else if (this.ecran === 'personnages') this.dessinerPortraits();
    else if (this.ecran === 'deja') this.ecranEl.querySelectorAll('.deja-toile').forEach(cv => AccueilArt.moitie(cv, cv.dataset.kind));
    else if (this.ecran === 'classe') { this.calerTournant(); this.dessinerGrille(); this.dessinerIllustration(); this.dessinerTournant(); }
    else if (this.ecran === 'apparence') { this.dessinerTetes(); this.dessinerTournant(); this.dessinerSelecteur(); }
    if (this.anime && this.calme) this.anime(performance.now());
  }

  // Le clic : un seul écouteur pour tout ce qui porte data-act.
  clic(evt, force) {
    const b = force ? evt.target : evt.target.closest('[data-act]');
    if (!b || !this.racine.contains(b) || b.disabled) return;
    const act = force || b.dataset.act;
    const fn = this.actions[act];
    if (fn) { evt.preventDefault(); fn.call(this, b, evt); }
  }

  saisie(evt) {
    const t = evt.target;
    if (t.id === 'entree-nom') {
      this.b.name = t.value;
      this.racine.querySelector('.app-nom__compte').textContent = `${t.value.length}/16`;
      this.erreur('');
    } else if (t.classList.contains('app-hex__champ')) {
      const v = t.value.replace(/[^0-9a-f]/gi, '').slice(0, 6);
      if (v !== t.value) t.value = v;
      if (v.length === 6) this.poserCouleur('#' + v.toLowerCase(), true);
    }
  }

  // ----- Le brouillon de personnage -----
  nouveauBrouillon(invite) {
    const id = DATA.defaultClass;
    this.b = { classId: id, gender: 'f', voie: null, look: apparenceDeClasse(id, 'f'), lookTouche: false, name: '', tuto: 'court', recommandee: null, invite: !!invite, facing: 'se' };
    this.slot = 0;
  }

  couleurClasse() { return this.b && DATA.classes[this.b.classId] ? DATA.classes[this.b.classId].color : null; }

  // La figure du brouillon, pour le peintre.
  figureBrouillon(o) {
    const b = this.b;
    return AccueilArt.figure(b.classId, Object.assign({ gender: b.gender, look: b.look, facing: b.facing }, o || {}));
  }

  // Les étapes de la création en cours (affichées dans l'en-tête).
  etapes() {
    return this.parcours || ['classe', 'apparence'];
  }

  // Three.js se charge pendant qu'on choisit (docs/ILE-TECHNIQUE.md, 1.5), seulement là où l'île s'affiche.
  static prechargerIle() {
    if (typeof Ile === 'object' && Ile.actif() && typeof IleCharge === 'object' && IleCharge.webgl()) setTimeout(() => IleCharge.three().catch(() => { /* le voile de repli s'en chargera */ }), 1200);
  }

  // Commence une création : le monde avant le tout premier personnage (s'il n'a pas déjà été choisi),
  // la question « As-tu déjà joué ? » quand aucun personnage n'existe encore ou pour un invité.
  commencerCreation(invite) {
    if (!invite && Save.free() <= 0) { this.toast('Plus d\'emplacement libre : supprime d\'abord un personnage.'); return; }
    if (typeof Ile === 'object' && Ile.allumee) Accueil.prechargerIle();
    this.nouveauBrouillon(invite);
    const premier = !Save.list().length;
    const monde = premier && !invite && !Accueil.mondeChoisi();
    const deja = premier || invite;
    this.parcours = (monde ? ['monde'] : []).concat(deja ? ['deja'] : [], ['classe', 'apparence']);
    this.aller(this.parcours[0]);
  }

  // Passe à l'étape suivante de la création.
  suite(apres) {
    const p = this.etapes();
    const i = p.indexOf(apres);
    this.aller(p[i + 1] || 'apparence');
  }

  // ----- En-tête des écrans -----
  tete(titre, sous, retour) {
    const p = this.etapes(), i = p.indexOf(this.ecranVise);
    const NOMS = { monde: 'Monde', deja: 'Expérience', classe: 'Classe', apparence: 'Apparence' };
    const etapes = i >= 0 && p.length > 1 ? `<ol class="entree-etapes" aria-label="Étape ${i + 1} sur ${p.length}">${p.map((e, k) => `<li class="${k < i ? 'fait' : k === i ? 'ici' : ''}"${k === i ? ' aria-current="step"' : ''}><span class="entree-etapes__marque"></span><span class="entree-etapes__nom">${NOMS[e]}</span></li>`).join('')}</ol>` : '<span class="entree-tete__vide"></span>';
    return `<header class="entree-tete">
      <button class="e-nu entree-retour" data-act="retour">${ICONES.chevronG}<span>${retour || 'Retour'}</span></button>
      <h1 class="entree-titre"><span>${titre}</span>${sous ? `<small>${sous}</small>` : ''}</h1>
      ${etapes}
    </header>`;
  }

  libres() {
    const n = Save.free();
    return n === 0 ? 'aucun emplacement libre' : `${n} emplacement${n > 1 ? 's' : ''} libre${n > 1 ? 's' : ''}`;
  }

  // =====================================================================
  // Accueil
  // =====================================================================
  ecran_accueil() {
    const persos = Save.list();
    const dernier = Save.lastUid();
    const d = persos.find(p => p.uid === dernier) || null;
    this.continuer = d;
    const A = DATA.actualites || [], i = Math.min(this.actuIndex, Math.max(0, A.length - 1)), a = A[i];
    const J = (DATA.journal || [])[0];
    const points = A.map((x, k) => `<button class="e-nu actus__point${k === i ? ' on' : ''}" data-act="actu-aller" data-i="${k}" aria-label="Actualité ${k + 1} sur ${A.length}"${k === i ? ' aria-current="true"' : ''}></button>`).join('');
    const cl = d ? DATA.classes[d.classId] : null;
    const panneau = d
      ? `<p class="acc-texte">Reprends ton aventure là où tu l'as laissée.</p>
         <button class="vy-bouton vy-bouton--primaire acc-continuer" data-act="continuer" data-focus>
           <canvas class="acc-continuer__buste" width="48" height="48" aria-hidden="true"></canvas>
           <span class="acc-continuer__texte"><b>Continuer</b><small>${esc(d.name)}, ${esc(cl.name)} niv. ${d.level}</small></span>
         </button>
         <button class="vy-bouton acc-changer" data-act="personnages">Changer de personnage</button>`
      : `<p class="acc-texte">Sept Voiles, un monde à recoudre : ton Veilleur t'attend.</p>
         <button class="vy-bouton vy-bouton--primaire vy-bouton--grand acc-creer" data-act="creer" data-focus>Créer un personnage</button>
         ${persos.length ? '<button class="vy-bouton acc-changer" data-act="personnages">Mes personnages</button>' : '<button class="vy-bouton acc-changer" data-act="importer">Importer un personnage</button>'}`;
    return `<section class="ecran ecran--accueil" aria-label="Accueil">
      <div class="acc-communaute"><button class="e-nu acc-communaute__pastille" disabled title="Forum et serveur de discussion : bientôt">${ICONES.bulle}<span>Communauté</span><small>bientôt</small></button></div>
      <div class="acc-coin">
        <button class="e-nu acc-rond" data-act="reglages" aria-label="Réglages" title="Réglages">${ICONES.engrenage}</button>
        <button class="e-nu acc-rond acc-rond--texte" data-act="langue" aria-label="Langue : français" title="Langue">FR</button>
      </div>
      <div class="acc-corps">
        ${a ? `<article class="actus" aria-roledescription="carrousel" aria-label="Actualités">
          <div class="actus__vue">
            <canvas class="actus__toile on" aria-hidden="true"></canvas><canvas class="actus__toile" aria-hidden="true"></canvas>
            <button class="e-nu actus__ouvrir" data-act="actu-lire" aria-label="Lire : ${esc(a.titre)}"></button>
            <button class="e-nu actus__fleche actus__fleche--g" data-act="actu-prec" aria-label="Actualité précédente">${ICONES.chevronG}</button>
            <button class="e-nu actus__fleche actus__fleche--d" data-act="actu-suiv" aria-label="Actualité suivante">${ICONES.chevronD}</button>
            <div class="actus__points">${points}</div>
          </div>
          <footer class="actus__pied">
            <button class="e-nu actus__actu" data-act="actu-lire">
              <span class="actus__date">Actualité · ${dateFr(a.date)}</span>
              <span class="actus__titre">${esc(a.titre)}</span>
            </button>
            ${J ? `<button class="e-nu actus__journal" data-act="journal">
              <span class="actus__journal-texte"><span class="actus__date">Mise à jour · ${dateFr(J.date)}</span><span class="actus__titre">Journal des mises à jour</span></span>
              <span class="actus__journal-icone">${ICONES.livre}</span>
            </button>` : ''}
          </footer>
        </article>` : ''}
        <aside class="acc-panneau">
          <header class="titre-logo">
            <h1 class="titre-logo__image"><img src="assets/ui/logo-veylan.webp" alt="Veylan" width="756" height="307" decoding="async"><span class="titre-logo__reflet" aria-hidden="true"></span></h1>
            <p class="titre-logo__signature">Entre deux réalités</p>
            <hr class="vy-filet">
          </header>
          <div class="acc-actions">${panneau}</div>
        </aside>
      </div>
      <footer class="acc-pied">
        <span class="acc-version">${esc(DATA.version || 'Prototype')} <span>· monde local, sauvegarde sur cet appareil</span></span>
        <button class="e-nu acc-invite" data-act="invite">Jouer sans sauvegarder</button>
      </footer>
    </section>`;
  }

  monterAccueil() {
    this.dessinerActu(true);
    this.dessinerBusteContinuer();
    // Défilement des actualités : toutes les 8 secondes, suspendu au survol, à l'écran caché, ou
    // si le système demande moins d'animations ; le doigt les fait glisser.
    const vue = this.ecranEl.querySelector('.actus__vue');
    if (!vue) return;
    this.pause = false;
    vue.addEventListener('pointerenter', () => { this.pause = true; });
    vue.addEventListener('pointerleave', () => { this.pause = false; });
    let x0 = null;
    vue.addEventListener('pointerdown', e => { x0 = e.clientX; });
    vue.addEventListener('pointerup', e => {
      if (x0 == null) return;
      const dx = e.clientX - x0; x0 = null;
      if (Math.abs(dx) > 40) { this.glisse = true; this.changerActu(dx < 0 ? 1 : -1); setTimeout(() => { this.glisse = false; }, 50); }
    });
    if (!this.calme) this.minuteur = setInterval(() => { if (!this.pause && !document.hidden && !this.calqueEl) this.changerActu(1); }, 8000);
  }

  // L'actualité en cours, dans la toile de devant ; la précédente s'efface derrière.
  dessinerActu(surPlace) {
    const vue = this.ecranEl && this.ecranEl.querySelector('.actus__vue');
    if (!vue) return;
    const A = DATA.actualites, a = A[this.actuIndex];
    const toiles = vue.querySelectorAll('.actus__toile');
    const avant = vue.querySelector('.actus__toile.on'), arriere = [...toiles].find(t => t !== avant);
    if (surPlace) { AccueilArt.actu(avant, a.art); return; }
    AccueilArt.actu(arriere, a.art);
    arriere.classList.add('on'); avant.classList.remove('on');
  }

  changerActu(d) {
    const A = DATA.actualites || [];
    if (!A.length || this.ecran !== 'accueil') return;
    this.actuIndex = (this.actuIndex + d + A.length) % A.length;
    const a = A[this.actuIndex];
    this.dessinerActu(false);
    const el = this.ecranEl;
    el.querySelectorAll('.actus__point').forEach((p, k) => { p.classList.toggle('on', k === this.actuIndex); if (k === this.actuIndex) p.setAttribute('aria-current', 'true'); else p.removeAttribute('aria-current'); });
    el.querySelector('.actus__actu .actus__date').textContent = `Actualité · ${dateFr(a.date)}`;
    el.querySelector('.actus__actu .actus__titre').textContent = fines(a.titre);
    el.querySelector('.actus__ouvrir').setAttribute('aria-label', 'Lire : ' + a.titre);
  }

  dessinerBusteContinuer() {
    const cv = this.ecranEl && this.ecranEl.querySelector('.acc-continuer__buste');
    const d = this.continuer;
    if (cv && d) AccueilArt.buste(cv, AccueilArt.figure(d.classId, { look: d.look, gender: d.gender }), { w: 48, h: 48 });
  }

  // =====================================================================
  // Personnages : les cinq emplacements
  // =====================================================================
  ecran_personnages() {
    this.ecranVise = 'personnages';
    const persos = Save.list();
    if (!persos.some(p => p.uid === this.choix)) this.choix = Save.lastUid() || (persos[0] && persos[0].uid) || null;
    const libres = Save.MAX - persos.length;
    const cartes = persos.map(p => {
      const cl = DATA.classes[p.classId];
      const on = p.uid === this.choix;
      return `<div class="perso-carte${on ? ' on' : ''}" style="--c:${cl.color}" role="option" aria-selected="${on}">
        <button class="e-nu perso-carte__choix" data-act="choisir" data-uid="${p.uid}" aria-label="${esc(p.name)}, ${esc(cl.name)} niveau ${p.level}">
          <canvas class="perso-carte__toile" data-uid="${p.uid}" aria-hidden="true"></canvas>
          <span class="perso-carte__nom">${esc(p.name)}</span>
          <span class="perso-carte__classe">${esc(cl.name)} · niv. ${p.level}</span>
          <span class="perso-carte__date">${p.tampered ? '<span class="perso-carte__alerte" title="Des valeurs impossibles ont été remises en ordre">Sauvegarde corrigée</span>' : 'Joué ' + depuis(p.at)}</span>
        </button>
        <button class="e-nu perso-carte__suppr" data-act="supprimer" data-uid="${p.uid}" aria-label="Supprimer ${esc(p.name)}" title="Supprimer">${ICONES.corbeille}</button>
      </div>`;
    });
    for (let k = 0; k < libres; k++) cartes.push(`<button class="e-nu perso-carte perso-carte--vide" data-act="creer"><span class="perso-carte__plus">${ICONES.plus}</span><span class="perso-carte__libre">Emplacement libre</span></button>`);
    const sel = persos.find(p => p.uid === this.choix);
    return `<section class="ecran ecran--personnages" aria-label="Personnages">
      ${this.tete('Tes personnages', this.libres(), 'Retour')}
      <div class="perso-corps">
        <div class="perso-liste" role="listbox" aria-label="Personnages de cet appareil">${cartes.join('')}</div>
        <footer class="perso-pied">
          <button class="vy-bouton" data-act="importer">Importer un code</button>
          <span class="perso-pied__ecart"></span>
          <button class="vy-bouton" data-act="creer"${libres ? '' : ' disabled'}>Créer un personnage <small>(${this.libres()})</small></button>
          <button class="vy-bouton vy-bouton--primaire perso-jouer" data-act="jouer"${sel ? ' data-focus' : ' disabled'}>${sel ? `Jouer : ${esc(sel.name)}` : 'Jouer'}</button>
        </footer>
      </div>
    </section>`;
  }

  monterPersonnages() { this.dessinerPortraits(); }

  dessinerPortraits() {
    const persos = Save.list();
    this.ecranEl.querySelectorAll('.perso-carte__toile').forEach(cv => {
      const p = persos.find(x => x.uid === cv.dataset.uid);
      if (p) AccueilArt.enPied(cv, AccueilArt.figure(p.classId, { look: p.look, gender: p.gender }));
    });
  }

  // =====================================================================
  // Choix du monde
  // =====================================================================
  ecran_monde() {
    this.ecranVise = 'monde';
    const corps = this.mondeTable
      ? `<h2 class="entree-h2">Mondes disponibles</h2>
         <div class="monde-table" role="table" aria-label="Mondes">
           <div class="monde-table__tete" role="row"><span role="columnheader">Nom</span><span role="columnheader">Création</span><span role="columnheader">État</span></div>
           <button class="e-nu monde-table__ligne on" data-act="monde-ligne" role="row" aria-pressed="true" data-focus>
             <span role="cell" class="monde-table__nom">${ICONES.globe} Veylan, monde local</span>
             <span role="cell">Octobre 2026</span>
             <span role="cell" class="monde-table__etat"><i aria-hidden="true"></i>Disponible (sur cet appareil)</span>
           </button>
         </div>
         <p class="entree-note">${ICONES.info} Les mondes en ligne arriveront avec le multijoueur. D'ici là, ta partie vit dans ce navigateur.</p>
         <div class="monde-actions"><button class="vy-bouton" data-act="monde-annuler">Annuler</button><button class="vy-bouton vy-bouton--primaire" data-act="monde-ok">Valider</button></div>`
      : `<h2 class="entree-h2">Où commence ton aventure ?</h2>
         <p class="entree-texte">Pour l'instant, Veylan vit sur ton appareil : un seul monde, le tien. Les mondes en ligne arriveront avec le multijoueur.</p>
         <div class="monde-choix">
           <button class="vy-bouton vy-bouton--primaire vy-bouton--grand" data-act="monde-auto" data-focus>Sélection automatique <small>(recommandé)</small></button>
           <button class="vy-bouton vy-bouton--grand" data-act="monde-table">Je choisis mon monde</button>
         </div>`;
    return `<section class="ecran ecran--monde" aria-label="Choix du monde">
      ${this.tete('Choix du monde', null, 'Annuler')}
      <div class="monde-corps">
        <div class="monde-globe"><canvas class="monde-toile" aria-hidden="true"></canvas></div>
        <div class="monde-panneau">${corps}</div>
      </div>
    </section>`;
  }

  monterMonde() {
    const cv = this.ecranEl.querySelector('.monde-toile');
    let last = 0;
    this.anime = t => { if (t - last < 33 && !this.calme) return; last = t; AccueilArt.monde(cv, this.calme ? 0 : t); };
    this.anime(performance.now());
  }

  static mondeChoisi() { try { return localStorage.getItem('veylan.monde'); } catch (e) { return null; } }
  static oublierMonde() { try { localStorage.removeItem('veylan.monde'); } catch (e) { /* rien */ } }
  choisirMonde(mode) {
    try { localStorage.setItem('veylan.monde', JSON.stringify({ id: 'local', mode, t: Date.now() })); } catch (e) { /* rien */ }
    this.mondeTable = false;
    this.toast('Monde : Veylan, monde local.');
    this.suite('monde');
  }

  // =====================================================================
  // « As-tu déjà joué à Veylan ? »
  // =====================================================================
  ecran_deja() {
    this.ecranVise = 'deja';
    return `<section class="ecran ecran--deja" aria-label="As-tu déjà joué à Veylan ?">
      ${this.tete('As-tu déjà joué à Veylan ?', this.b && this.b.invite ? 'partie d\'invité' : null, 'Annuler')}
      <div class="deja-corps">
        <button class="e-nu deja-moitie deja-moitie--debut" data-act="deja-debut" data-focus>
          <canvas class="deja-toile" data-kind="debut" aria-hidden="true"></canvas>
          <span class="deja-texte">C'est ma première fois : guide-moi vers une classe qui me ressemble.</span>
          <span class="vy-bouton vy-bouton--primaire vy-bouton--grand deja-bouton">Je commence</span>
        </button>
        <span class="deja-fente" aria-hidden="true"></span>
        <button class="e-nu deja-moitie deja-moitie--connait" data-act="deja-connait">
          <canvas class="deja-toile" data-kind="connait" aria-hidden="true"></canvas>
          <span class="deja-texte">J'ai déjà mes repères : je choisis ma classe moi-même.</span>
          <span class="vy-bouton vy-bouton--grand deja-bouton">Je connais déjà</span>
        </button>
      </div>
    </section>`;
  }

  monterDeja() { this.ecranEl.querySelectorAll('.deja-toile').forEach(cv => AccueilArt.moitie(cv, cv.dataset.kind)); }

  // =====================================================================
  // Classe
  // =====================================================================
  ecran_classe() {
    this.ecranVise = 'classe';
    const b = this.b;
    const cells = Object.values(DATA.classes).map(c => `<button class="e-nu classe-case${c.id === b.classId ? ' on' : ''}${c.id === b.recommandee ? ' reco' : ''}" data-act="classe" data-id="${c.id}" style="--c:${c.color}" role="radio" aria-checked="${c.id === b.classId}" aria-label="${esc(c.name)}, ${esc(epithete(c.title))}${c.id === b.recommandee ? ', recommandée pour toi' : ''}" title="${esc(c.name)}">
        <canvas class="classe-case__toile" data-id="${c.id}" aria-hidden="true"></canvas><span class="classe-case__nom">${esc(c.name)}</span>${c.id === b.recommandee ? `<span class="classe-case__reco" aria-hidden="true">${ICONES.etoile}</span>` : ''}</button>`)
      .concat(Object.values(DATA.futureClasses || {}).map(c => `<button class="e-nu classe-case classe-case--verrou" data-act="classe-verrou" data-id="${c.id}" aria-disabled="true" aria-label="${esc(c.name)}, ${esc(epithete(c.title))} : saison ${c.season}" title="${esc(c.name)} : saison ${c.season}">
        <canvas class="classe-case__toile" data-id="${c.id}" aria-hidden="true"></canvas><span class="classe-case__nom">${esc(c.name)}</span><span class="classe-case__cadenas" aria-hidden="true">${ICONES.cadenas}</span></button>`)).join('');
    const voies = [[null, 'Origine', '#e2c690']].concat(Character.VOIES.map(v => [v, DATA.elements[v].stat, DATA.elements[v].color]))
      .map(([v, l, col]) => `<button class="e-nu classe-voie__btn${(b.voie || null) === v ? ' on' : ''}" data-act="voie" data-voie="${v || ''}" style="--e:${col}" role="radio" aria-checked="${(b.voie || null) === v}" title="${v ? `Voie ${esc(l)} : tous tes sorts de dégâts frappent en ${esc(DATA.elements[v].label.toLowerCase())}` : 'Origine : les éléments de la classe'}">${esc(l)}</button>`).join('');
    return `<section class="ecran ecran--classe" aria-label="Choix de la classe">
      ${this.tete('Crée ton personnage', b.invite ? 'partie d\'invité, sans sauvegarde' : this.libres(), 'Annuler')}
      <div class="classe-corps">
        <div class="classe-scene">
          <div class="classe-illu"><canvas class="classe-illu__toile" aria-hidden="true"></canvas><img class="classe-illu__image" alt="" hidden></div>
          <canvas class="classe-particules" aria-hidden="true"></canvas>
          <div class="tournant">
            <canvas class="tournant__toile" aria-label="Ton personnage, sur son socle"></canvas>
            <button class="e-nu tournant__fleche tournant__fleche--g" data-act="tourner" data-sens="-1" aria-label="Tourner vers la gauche">${ICONES.tournerG}</button>
            <button class="e-nu tournant__fleche tournant__fleche--d" data-act="tourner" data-sens="1" aria-label="Tourner vers la droite">${ICONES.tournerD}</button>
          </div>
        </div>
        <div class="classe-infos" aria-live="polite">${this.infosClasse()}</div>
        <div class="classe-choix">
          <div class="classe-grille" role="radiogroup" aria-label="Classe">${cells}</div>
          <div class="classe-genre" role="radiogroup" aria-label="Genre">
            <button class="e-nu classe-genre__btn${b.gender === 'f' ? ' on' : ''}" data-act="genre" data-g="f" role="radio" aria-checked="${b.gender === 'f'}">${ICONES.femme}<span>Femme</span></button>
            <button class="e-nu classe-genre__btn${b.gender === 'm' ? ' on' : ''}" data-act="genre" data-g="m" role="radio" aria-checked="${b.gender === 'm'}">${ICONES.homme}<span>Homme</span></button>
          </div>
          <div class="classe-voie" role="radiogroup" aria-label="Voie élémentaire"><span class="classe-voie__titre">Voie</span>${voies}</div>
        </div>
        <div class="classe-actions">
          <button class="vy-bouton" data-act="quiz">${ICONES.boussole}<span>Recommandation</span></button>
          <button class="vy-bouton vy-bouton--primaire" data-act="suivant" data-focus>Suivant</button>
        </div>
      </div>
    </section>`;
  }

  // Le bandeau de la classe : rôles, nom et épithète, description, difficulté.
  infosClasse() {
    const b = this.b, c = DATA.classes[b.classId], P = PROFILS[c.id] || { difficulte: 2, roles: [] };
    const roles = P.roles.map(r => { const R = ROLES[r]; return `<span class="classe-role" style="--r:${R[2]}" title="${R[0]}"><span class="classe-role__losange">${R[1]}</span><span class="classe-role__nom">${R[0]}</span></span>`; }).join('');
    const pips = [1, 2, 3].map(n => `<i class="${n <= P.difficulte ? 'on' : ''}"></i>`).join('');
    const voie = b.voie ? ` · voie ${DATA.elements[b.voie].stat}` : '';
    return `<div class="classe-roles" aria-label="Rôles">${roles}</div>
      <h2 class="classe-nom"><span class="classe-nom__nom">${esc(c.name)}</span><span class="classe-nom__epithete">${esc(epithete(c.title))}</span></h2>
      ${c.id === b.recommandee ? `<p class="classe-reco">${ICONES.etoile} Recommandée pour toi</p>` : ''}
      <p class="classe-desc">${esc(c.desc)}</p>
      <p class="classe-diff"><span>Difficulté</span><span class="classe-diff__pips" role="img" aria-label="Difficulté ${P.difficulte} sur 3">${pips}</span><span class="classe-diff__mot">${['', 'accessible', 'tactique', 'exigeante'][P.difficulte]}${voie}</span></p>`;
  }

  monterClasse() {
    this.calerTournant();
    this.dessinerGrille();
    this.dessinerIllustration();
    this.monterTournant();
  }

  // Le socle tournant s'arrête au-dessus du bandeau de la classe, quelle que soit sa hauteur
  // (une description de deux ou trois lignes, la mention « Recommandée pour toi »).
  calerTournant() {
    const el = this.ecranEl, scene = el && el.querySelector('.classe-scene'), infos = el && el.querySelector('.classe-infos');
    if (!scene || !infos) return;
    const dessous = scene.offsetTop + scene.offsetHeight - infos.offsetTop;
    scene.style.setProperty('--bandeau', Math.round(Math.max(0, Math.min(dessous + 6, scene.offsetHeight * 0.58))) + 'px');
  }

  // Une classe choisie : le fond, l'illustration, le socle et le bandeau suivent.
  choisirClasse(id) {
    const b = this.b;
    if (!DATA.classes[id] || id === b.classId) return;
    b.classId = id;
    if (!b.lookTouche) b.look = apparenceDeClasse(id, b.gender);
    this.majClasse();
  }

  majClasse() {
    const el = this.ecranEl, b = this.b;
    el.querySelectorAll('.classe-case[data-act="classe"]').forEach(x => { const on = x.dataset.id === b.classId; x.classList.toggle('on', on); x.setAttribute('aria-checked', on); });
    el.querySelectorAll('.classe-genre__btn').forEach(x => { const on = x.dataset.g === b.gender; x.classList.toggle('on', on); x.setAttribute('aria-checked', on); });
    el.querySelectorAll('.classe-voie__btn').forEach(x => { const on = (x.dataset.voie || null) === (b.voie || null); x.classList.toggle('on', on); x.setAttribute('aria-checked', on); });
    el.querySelector('.classe-infos').innerHTML = fines(this.infosClasse());
    this.calerTournant();
    this.teinter(this.couleurClasse());
    this.dessinerIllustration();
    this.dessinerTournant();
  }

  dessinerGrille() {
    const g = this.b.gender;
    this.ecranEl.querySelectorAll('.classe-case__toile').forEach(cv => {
      const id = cv.dataset.id, fut = !DATA.classes[id];
      const s = fut ? { color: FUTURES[id] ? FUTURES[id].color : '#5c5466', glyph: FUTURES[id] ? FUTURES[id].glyph : '?', gender: g, look: Util.defaultLook('#5c5466') } : AccueilArt.figure(id, { gender: g, look: apparenceDeClasse(id, g) });
      AccueilArt.buste(cv, s, { verrou: fut });
    });
  }

  // La grande illustration : l'image de la graphiste si elle existe (posée sur la peinture du code,
  // qui reste dessous et la remplace sur téléphone debout), sinon la peinture seule.
  dessinerIllustration() {
    const box = this.ecranEl.querySelector('.classe-illu');
    if (!box) return;
    const id = this.b.classId, cv = box.querySelector('canvas'), img = box.querySelector('img');
    const autre = this.b.gender === 'm' ? 'f' : 'm';
    AccueilArt.illustration(cv, id, { gender: this.b.gender, look: this.b.look, autre: apparenceDeClasse(id, autre) });
    AccueilArt.imageClasse(id, e => {
      if (this.ecran !== 'classe' || this.b.classId !== id || !img.isConnected) return;
      const ok = e.etat === 'ok';
      if (ok) { img.src = e.img.src; img.alt = DATA.classes[id].name; }
      img.hidden = !ok;
    });
  }

  // =====================================================================
  // Le socle tournant (classe et apparence)
  // =====================================================================
  monterTournant() {
    const scene = this.ecranEl;
    const cv = scene.querySelector('.tournant__toile');
    const part = scene.querySelector('.classe-particules');
    const list = AccueilArt.particules(this.calme ? 0 : 36, 9);
    // tourner au doigt : un glissé d'une cinquantaine de pixels fait un quart de tour
    let x0 = null;
    cv.addEventListener('pointerdown', e => { x0 = e.clientX; try { cv.setPointerCapture(e.pointerId); } catch (er) { /* rien */ } });
    cv.addEventListener('pointermove', e => { if (x0 == null) return; const dx = e.clientX - x0; if (Math.abs(dx) > 50) { this.tourner(dx > 0 ? -1 : 1); x0 = e.clientX; } });
    cv.addEventListener('pointerup', () => { x0 = null; });
    cv.addEventListener('pointercancel', () => { x0 = null; });
    let last = 0;
    this.anime = t => {
      if (t - last < 33 && !this.calme) return;
      last = t;
      this.dessinerTournant(t);
      if (part) {
        const { c, w, h } = AccueilArt.prepare(part);
        const cl = DATA.classes[this.b.classId];
        const cols = [cl.color].concat([...new Set(cl.spells.map(id => DATA.spells[id] && DATA.spells[id].element).filter(e => e && e !== 'neutre'))].map(e => DATA.elements[e].color));
        AccueilArt.dessinerParticules(c, w, h, list, cols, t);
      }
    };
    this.anime(performance.now());
  }

  dessinerTournant(t) {
    const cv = this.ecranEl && this.ecranEl.querySelector('.tournant__toile');
    if (!cv || !this.b) return;
    AccueilArt.tournant(cv, this.figureBrouillon(), { t: t == null ? performance.now() : t, calme: this.calme, part: this.ecran === 'apparence' ? 0.64 : 0.6 });
  }

  // Un quart de tour : se → sw → nw → ne (sens des aiguilles), ou l'inverse.
  tourner(sens) {
    const F = ['se', 'sw', 'nw', 'ne'];
    this.b.facing = F[(F.indexOf(this.b.facing) + (sens > 0 ? 1 : 3)) % 4];
    this.dessinerTournant();
  }

  // =====================================================================
  // Apparence
  // =====================================================================
  ecran_apparence() {
    this.ecranVise = 'apparence';
    const b = this.b;
    const tetes = TETES.map((n, i) => `<button class="e-nu app-tete${b.look.tete === i ? ' on' : ''}" data-act="tete" data-i="${i}" role="radio" aria-checked="${b.look.tete === i}" aria-label="Coiffure : ${n}" title="${n}"><canvas class="app-tete__toile" data-i="${i}" aria-hidden="true"></canvas></button>`).join('');
    const cases = Character.COULEURS.map((k, i) => `<button class="e-nu app-case${this.slot === i ? ' on' : ''}" data-act="case" data-i="${i}" role="radio" aria-checked="${this.slot === i}" style="--k:${b.look.couleurs[i]}"><span class="app-case__teinte"></span><span class="app-case__nom">${COULEURS_NOMS[i]}</span></button>`).join('');
    return `<section class="ecran ecran--apparence" aria-label="Apparence">
      ${this.tete('Crée ton personnage', b.invite ? 'partie d\'invité, sans sauvegarde' : this.libres(), 'Retour')}
      <div class="app-corps">
        <div class="app-scene">
          <canvas class="classe-particules" aria-hidden="true"></canvas>
          <div class="tournant tournant--grand">
            <canvas class="tournant__toile" aria-label="Ton personnage, sur son socle"></canvas>
            <button class="e-nu tournant__fleche tournant__fleche--g" data-act="tourner" data-sens="-1" aria-label="Tourner vers la gauche">${ICONES.tournerG}</button>
            <button class="e-nu tournant__fleche tournant__fleche--d" data-act="tourner" data-sens="1" aria-label="Tourner vers la droite">${ICONES.tournerD}</button>
          </div>
          <p class="app-legende"><b>${esc(DATA.classes[b.classId].name)}</b> · ${esc(epithete(DATA.classes[b.classId].title))}</p>
        </div>
        <div class="app-panneau">
          <div class="app-bloc">
            <span class="app-titre">Coiffure</span>
            <div class="app-tetes" role="radiogroup" aria-label="Coiffure">${tetes}</div>
          </div>
          <div class="app-bloc app-couleurs">
            <div class="app-colonne">
              <span class="app-titre">Couleurs</span>
              <div class="app-cases" role="radiogroup" aria-label="Couleur à modifier">${cases}</div>
            </div>
            <div class="app-selecteur" aria-label="Teinte et luminosité">
              <div class="app-carre"><canvas class="app-carre__toile" aria-label="Teinte et saturation"></canvas><span class="app-carre__curseur"></span></div>
              <div class="app-lum"><canvas class="app-lum__toile" aria-label="Luminosité"></canvas><span class="app-lum__curseur"></span></div>
            </div>
          </div>
          <div class="app-bloc app-ligne">
            <div class="app-recents" aria-label="Couleurs récentes">${this.recentsHtml()}</div>
            <label class="app-hex"><span>#</span><input class="app-hex__champ" maxlength="6" spellcheck="false" autocomplete="off" aria-label="Couleur en hexadécimal" value="${b.look.couleurs[this.slot].slice(1)}"></label>
          </div>
          <div class="app-bloc app-outils">
            <button class="vy-bouton vy-bouton--icone" data-act="tourner" data-sens="1" aria-label="Tourner le personnage" title="Tourner">${ICONES.tourner}</button>
            <button class="vy-bouton" data-act="aleatoire">${ICONES.de}<span>Aléatoire</span></button>
            <button class="vy-bouton" data-act="reinit">Réinitialiser tout</button>
          </div>
          <div class="app-bloc app-nom">
            <label class="app-nom__champ"><input id="entree-nom" maxlength="16" placeholder="Nom du personnage" autocomplete="off" spellcheck="false" value="${esc(b.name)}" data-entree="creer-perso"><span class="app-nom__compte">${b.name.length}/16</span></label>
            <button class="vy-bouton" data-act="nom-aleatoire" aria-label="Nom aléatoire" title="Nom aléatoire">${ICONES.de}<span>Nom aléatoire</span></button>
            <button class="vy-bouton vy-bouton--primaire app-creer" data-act="creer-perso">${b.invite ? 'Jouer' : 'Créer'}</button>
            <p class="app-erreur" role="alert"></p>
          </div>
        </div>
      </div>
    </section>`;
  }

  monterApparence() {
    this.dessinerTetes();
    this.monterTournant();
    this.monterSelecteur();
  }

  dessinerTetes() {
    const b = this.b;
    this.ecranEl.querySelectorAll('.app-tete__toile').forEach(cv => {
      const look = { tete: Number(cv.dataset.i), couleurs: b.look.couleurs };
      AccueilArt.buste(cv, this.figureBrouillon({ look, facing: 'se' }), { fond: 'neutre', zoom: 0.58, haut: 0.57, peint: true });
    });
  }

  // Les couleurs récentes (huit au plus), gardées d'une création à l'autre.
  static recents() { try { const r = JSON.parse(localStorage.getItem('veylan.couleurs') || '[]'); return Array.isArray(r) ? r.filter(c => /^#[0-9a-f]{6}$/.test(c)).slice(0, 8) : []; } catch (e) { return []; } }
  recentsHtml() {
    const r = Accueil.recents();
    return '<span class="app-titre">Récentes</span>' + (r.length ? r.map(c => `<button class="e-nu app-recent" data-act="recent" data-c="${c}" style="--k:${c}" aria-label="Couleur ${c}" title="${c}"></button>`).join('') : '<span class="app-recents__vide">aucune</span>');
  }
  retenirCouleur(c) {
    const r = [c].concat(Accueil.recents().filter(x => x !== c)).slice(0, 8);
    try { localStorage.setItem('veylan.couleurs', JSON.stringify(r)); } catch (e) { /* rien */ }
    const box = this.ecranEl.querySelector('.app-recents');
    if (box) box.innerHTML = this.recentsHtml();
  }

  // Le sélecteur TSV : un carré teinte × saturation, une réglette de luminosité, au doigt comme à la souris.
  monterSelecteur() {
    const el = this.ecranEl;
    const carre = el.querySelector('.app-carre'), lum = el.querySelector('.app-lum');
    this.hsv = hexHsv(this.b.look.couleurs[this.slot]);
    const suivre = (zone, fn) => {
      zone.addEventListener('pointerdown', e => {
        e.preventDefault();
        try { zone.setPointerCapture(e.pointerId); } catch (er) { /* rien */ }
        fn(e);
        const move = ev => fn(ev);
        const up = () => { zone.removeEventListener('pointermove', move); zone.removeEventListener('pointerup', up); zone.removeEventListener('pointercancel', up); this.retenirCouleur(this.b.look.couleurs[this.slot]); };
        zone.addEventListener('pointermove', move); zone.addEventListener('pointerup', up); zone.addEventListener('pointercancel', up);
      });
    };
    suivre(carre, e => {
      const r = carre.getBoundingClientRect();
      this.hsv.h = Math.max(0, Math.min(359.9, (e.clientX - r.left) / r.width * 360));
      this.hsv.s = Math.max(0, Math.min(1, 1 - (e.clientY - r.top) / r.height));
      this.appliquerHsv();
    });
    suivre(lum, e => {
      const r = lum.getBoundingClientRect();
      this.hsv.v = Math.max(0, Math.min(1, 1 - (e.clientY - r.top) / r.height));
      this.appliquerHsv();
    });
    // Au clavier : les flèches déplacent le curseur du carré ou de la réglette.
    carre.tabIndex = 0; lum.tabIndex = 0;
    carre.addEventListener('keydown', e => {
      const d = { ArrowLeft: [-6, 0], ArrowRight: [6, 0], ArrowUp: [0, 0.05], ArrowDown: [0, -0.05] }[e.key];
      if (!d) return; e.preventDefault();
      this.hsv.h = (this.hsv.h + d[0] + 360) % 360; this.hsv.s = Math.max(0, Math.min(1, this.hsv.s + d[1])); this.appliquerHsv();
    });
    lum.addEventListener('keydown', e => {
      const d = { ArrowUp: 0.05, ArrowDown: -0.05 }[e.key];
      if (!d) return; e.preventDefault();
      this.hsv.v = Math.max(0, Math.min(1, this.hsv.v + d)); this.appliquerHsv();
    });
    this.dessinerSelecteur();
  }

  dessinerSelecteur() {
    const el = this.ecranEl;
    const cv = el.querySelector('.app-carre__toile'), lv = el.querySelector('.app-lum__toile');
    if (!cv || !this.hsv) return;
    const { h, s, v } = this.hsv;
    // carré : l'arc-en-ciel en haut, vers le blanc en bas, assombri selon la luminosité
    const A = AccueilArt.prepare(cv);
    const g = A.c.createLinearGradient(0, 0, A.w, 0);
    for (let i = 0; i <= 6; i++) g.addColorStop(i / 6, `hsl(${i * 60},100%,50%)`);
    A.c.fillStyle = g; A.c.fillRect(0, 0, A.w, A.h);
    const w = A.c.createLinearGradient(0, 0, 0, A.h); w.addColorStop(0, 'rgba(255,255,255,0)'); w.addColorStop(1, 'rgba(255,255,255,1)');
    A.c.fillStyle = w; A.c.fillRect(0, 0, A.w, A.h);
    A.c.fillStyle = `rgba(0,0,0,${1 - v})`; A.c.fillRect(0, 0, A.w, A.h);
    // réglette : de la couleur pleine (haut) au noir (bas)
    const B = AccueilArt.prepare(lv);
    const l = B.c.createLinearGradient(0, 0, 0, B.h); l.addColorStop(0, hsvHex(h, s, 1)); l.addColorStop(1, '#000000');
    B.c.fillStyle = l; B.c.fillRect(0, 0, B.w, B.h);
    const cur = el.querySelector('.app-carre__curseur'), lc = el.querySelector('.app-lum__curseur');
    cur.style.left = `${h / 360 * 100}%`; cur.style.top = `${(1 - s) * 100}%`; cur.style.background = hsvHex(h, s, v);
    lc.style.top = `${(1 - v) * 100}%`;
  }

  appliquerHsv() { this.poserCouleur(hsvHex(this.hsv.h, this.hsv.s, this.hsv.v), false, true); }

  // Pose une couleur sur la case en cours. `hex` vient du champ hexadécimal (pas de réécriture du champ).
  poserCouleur(c, depuisHex, depuisHsv) {
    const b = this.b;
    b.look = { tete: b.look.tete, couleurs: b.look.couleurs.map((x, i) => (i === this.slot ? c : x)) };
    b.lookTouche = true;
    if (!depuisHsv) this.hsv = hexHsv(c);
    const el = this.ecranEl;
    const caseEl = el.querySelector(`.app-case[data-i="${this.slot}"]`);
    if (caseEl) caseEl.style.setProperty('--k', c);
    if (!depuisHex) { const f = el.querySelector('.app-hex__champ'); if (f) f.value = c.slice(1); }
    if (depuisHex) this.retenirCouleur(c);
    this.dessinerSelecteur();
    this.dessinerTournant();
    cancelAnimationFrame(this.tetesAttente);
    this.tetesAttente = requestAnimationFrame(() => this.dessinerTetes());
  }

  // L'apparence entière change (aléatoire, réinitialisation) : cases, tête, sélecteur, socle.
  majApparence() {
    const el = this.ecranEl, b = this.b;
    el.querySelectorAll('.app-case').forEach(x => x.style.setProperty('--k', b.look.couleurs[Number(x.dataset.i)]));
    el.querySelectorAll('.app-tete').forEach(x => { const on = Number(x.dataset.i) === b.look.tete; x.classList.toggle('on', on); x.setAttribute('aria-checked', on); });
    const f = el.querySelector('.app-hex__champ'); if (f) f.value = b.look.couleurs[this.slot].slice(1);
    this.hsv = hexHsv(b.look.couleurs[this.slot]);
    this.dessinerSelecteur();
    this.dessinerTetes();
    this.dessinerTournant();
  }

  // Une palette au hasard, accordée à la classe : la lanterne garde la couleur de la classe (c'est
  // elle qui dit la classe), la tenue tourne autour de sa teinte, la cape lui répond.
  paletteAleatoire() {
    const R = Math.random, pick = a => a[Math.floor(R() * a.length)];
    const cl = DATA.classes[this.b.classId], H = hexHsv(cl.color).h;
    const peaux = ['#f6dcc4', '#f2d9bf', '#e8c4a0', '#d8a982', '#c68e6a', '#a86f4c', '#8a5536', '#6b3f28'];
    const cheveux = ['#1c1410', '#3a2a20', '#5a3a24', '#7a4a2a', '#b5542c', '#d8b070', '#e8d5a0', '#9a9aa6'];
    const t = H + (R() - 0.5) * 70;
    return { tete: Math.floor(R() * Character.TETES), couleurs: [
      pick(peaux),
      R() < 0.75 ? pick(cheveux) : hsvHex(t + 180 + (R() - 0.5) * 60, 0.5, 0.55),
      hsvHex(t, 0.45 + R() * 0.3, 0.55 + R() * 0.3),
      hsvHex(t + (R() < 0.5 ? -35 : 35), 0.25 + R() * 0.2, 0.18 + R() * 0.15),
      hsvHex(t + 180 + (R() - 0.5) * 50, 0.4 + R() * 0.25, 0.25 + R() * 0.2),
      cl.color,
    ] };
  }

  erreur(t) { const e = this.ecranEl && this.ecranEl.querySelector('.app-erreur'); if (e) e.textContent = fines(t); }

  // Crée le personnage (ou la partie d'invité) et lance le jeu.
  creerPersonnage() {
    const b = this.b;
    const champ = this.ecranEl.querySelector('#entree-nom');
    const nom = (champ ? champ.value : b.name).replace(/\s+/g, ' ').trim().slice(0, 16);
    if (!nom) { this.erreur('Donne un nom à ton personnage.'); if (champ) champ.focus(); return; }
    const ch = Character.create(b.classId, nom, b.gender, b.voie, { look: b.look, tuto: b.tuto });
    // L'île allumée (l'interrupteur, docs/ILE-TECHNIQUE.md, 1.4) et la 3D possible : le personnage
    // naît au Métier d'Ervane, avec le tutoriel de l'île dans le mode choisi.
    if (typeof Ile === 'object' && Ile.allumee && typeof Ile3D === 'function' && Ile3D.disponible() && Ile.fairenaitre(ch)) Ile.appliquerOrsane();
    if (b.invite) {
      // Une partie d'invité n'écrit jamais rien : ni à la création, ni en jeu.
      Object.defineProperty(ch, 'invite', { value: true });
      Save.suspend();
    } else if (!Save.write(ch)) { this.erreur('Impossible d\'enregistrer : plus d\'emplacement libre, ou stockage refusé par le navigateur.'); return; }
    this.demarrer(ch);
  }

  demarrer(ch) {
    this.anime = null;
    this.onStart(ch);
  }

  // =====================================================================
  // Calques : réglages, journal, article, recommandation, suppression, import
  // =====================================================================
  ouvrirCalque(id, titre, corps, opts) {
    this.fermerCalque(true);
    opts = opts || {};
    const fond = document.createElement('div');
    fond.className = 'vy-modale-fond entree-calque';
    fond.dataset.calque = id;
    fond.innerHTML = fines(`<section class="vy-modale entree-modale${opts.classe ? ' ' + opts.classe : ''}" role="dialog" aria-modal="true" aria-labelledby="entree-calque-titre">
      <header class="vy-modale__tete"><h2 id="entree-calque-titre" class="vy-modale__titre">${titre}</h2><button class="vy-bouton vy-bouton--icone vy-bouton--fantome" data-act="fermer-calque" aria-label="Fermer">${ICONES.fermer}</button></header>
      <div class="vy-modale__corps">${corps}</div>
      ${opts.pied ? `<footer class="vy-modale__pied">${opts.pied}</footer>` : ''}
    </section>`);
    fond.addEventListener('click', e => { if (e.target === fond) this.fermerCalque(); });
    this.racine.appendChild(fond);
    this.calqueEl = fond;
    this.ecranEl.inert = true;
    // Pas d'éclair par-dessus une fenêtre ouverte : plus de nouvel éclair, et la toile de devant
    // (les éclairs qui frappent le logo) s'efface le temps du calque.
    if (this.fx) this.fx.sobre = true;
    this.el.classList.add('calque-ouvert');
    const f = fond.querySelector('[data-focus]') || fond.querySelector('.vy-modale__corps button, .vy-modale__corps textarea, .vy-modale__pied button') || fond.querySelector('button');
    if (f) f.focus({ preventScroll: true });
    return fond;
  }

  fermerCalque(silence) {
    if (!this.calqueEl) return;
    this.calqueEl.remove();
    this.calqueEl = null;
    this.el.classList.remove('calque-ouvert');
    if (this.ecranEl) this.ecranEl.inert = false;
    if (this.fx) this.fx.sobre = this.ecran !== 'accueil';
    if (!silence) { const f = this.ecranEl && (this.ecranEl.querySelector('[data-focus]') || this.ecranEl.querySelector('button')); if (f) f.focus({ preventScroll: true }); }
  }

  ouvrirReglages() {
    const app = document.getElementById('app');
    const theme = app.dataset.uiTheme || Accueil.lire('veylan.theme') || 'duality';
    const themes = (typeof Hud === 'function' && Hud.THEMES ? Hud.THEMES : [['nuit', 'Nuit d\'Orsane', '#172334', '#c9a66b']])
      .map(([id, label, fond, accent]) => `<button class="vy-theme${theme === id ? ' on' : ''}" data-act="theme" data-theme="${id}" aria-pressed="${theme === id}"><span class="vy-theme__apercu" style="--f:${fond};--a:${accent}"></span>${label}</button>`).join('');
    const pref = Accueil.lire('veylan.rendu') === 'canvas' ? 'canvas' : 'webgl';
    const force = new URLSearchParams(location.search).get('render') === 'canvas';
    const gl = typeof RendererGL === 'function' && RendererGL.supported(new URLSearchParams());
    const seg = [['webgl', 'Éclairé (WebGL)'], ['canvas', 'Léger (Canvas)']]
      .map(([v, l]) => `<button class="e-nu reglages__seg-btn${pref === v ? ' on' : ''}" data-act="rendu" data-rendu="${v}" aria-pressed="${pref === v}"${v === 'webgl' && !gl ? ' disabled title="WebGL indisponible sur cet appareil"' : ''}>${l}</button>`).join('');
    const corps = `<div class="reglages">
      <section class="reglages__bloc"><h3 class="reglages__titre">Thème de l'interface</h3><div class="vy-themes">${themes}</div></section>
      <section class="reglages__bloc"><h3 class="reglages__titre">Rendu</h3>
        <div class="reglages__seg" role="group" aria-label="Rendu">${seg}</div>
        <p class="reglages__note">En ce moment : ${this.rendu === 'webgl' ? 'éclairé (WebGL)' : 'léger (Canvas)'}${force ? ', imposé par l\'adresse (?render=canvas)' : ''}. Un changement prend effet au prochain lancement.</p>
        <button class="vy-bouton vy-bouton--petit reglages__relancer" data-act="relancer"${Accueil.lire('veylan.rendu.vu') === pref ? ' hidden' : ''}>Relancer maintenant</button>
      </section>
      <section class="reglages__bloc"><h3 class="reglages__titre">Son</h3>
        <div class="reglages__ligne reglages__ligne--bientot"><span>Musique et effets sonores</span><span class="reglages__bientot">bientôt</span><button class="e-nu reglages__interrupteur" disabled aria-label="Son : bientôt" aria-pressed="false"><i></i></button></div>
      </section>
      <section class="reglages__bloc"><h3 class="reglages__titre">Langue</h3>
        <div class="reglages__seg" role="group" aria-label="Langue"><button class="e-nu reglages__seg-btn on" aria-pressed="true" data-act="rien">Français</button><button class="e-nu reglages__seg-btn" disabled>English <small>bientôt</small></button></div>
      </section>
      ${Accueil.essaiIle() ? `<section class="reglages__bloc"><h3 class="reglages__titre">Essais (développement)</h3>
        <div class="reglages__ligne"><span>Naître sur Ervane (essai)</span><button class="e-nu reglages__interrupteur" data-act="ile-essai" aria-pressed="${Accueil.lire('veylan.ile.essai') === '1'}" aria-label="Naître sur Ervane (essai)"><i></i></button></div>
        <p class="reglages__note">Un nouveau personnage naît au Métier, sur l'île en 3D. Prend effet au prochain lancement.</p>
        <button class="vy-bouton vy-bouton--petit reglages__relancer" data-act="relancer" data-ile-relancer hidden>Relancer maintenant</button>
      </section>` : ''}
      <p class="reglages__version">${esc(DATA.version || '')} · le jeu est sauvegardé dans ce navigateur, sur cet appareil.</p>
    </div>`;
    this.ouvrirCalque('reglages', 'Réglages', corps, { classe: 'entree-modale--reglages' });
  }

  static lire(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }
  // Un personnage lu pour être joué : s'il est né sur Ervane, les changements d'Orsane s'appliquent
  // avant sa lecture validée (content/ervane-orsane.js ; sa quête « Le Glym Ancestral » existe alors).
  static lirePersonnage(uid) {
    if (typeof Ile === 'object' && Ile.actif() && Ile.origineDe(uid) === 'ervane') Ile.appliquerOrsane();
    return Save.read(uid);
  }
  static ecrire(k, v) { try { localStorage.setItem(k, v); } catch (e) { /* rien */ } }

  ouvrirJournal() {
    const J = DATA.journal || [];
    const corps = `<div class="journal">${J.map(e => `<article class="journal__entree">
      <header class="journal__tete"><time datetime="${e.date}">${dateFr(e.date)}</time><h3>${esc(e.titre)}</h3></header>
      <ul>${e.points.map(p => `<li>${esc(p)}</li>`).join('')}</ul></article>`).join('')}</div>`;
    this.ouvrirCalque('journal', 'Journal des mises à jour', corps, { classe: 'entree-modale--journal' });
  }

  ouvrirActu() {
    const a = DATA.actualites[this.actuIndex];
    const corps = `<article class="article"><canvas class="article__toile" aria-hidden="true"></canvas>
      <p class="article__date">${dateFr(a.date)}</p><p class="article__texte">${esc(a.texte)}</p></article>`;
    const f = this.ouvrirCalque('actu', esc(a.titre), corps, { classe: 'entree-modale--article', pied: '<button class="vy-bouton" data-act="actu-prec-lire">Précédente</button><button class="vy-bouton" data-act="actu-suiv-lire">Suivante</button><button class="vy-bouton vy-bouton--primaire" data-act="fermer-calque" data-focus>Fermer</button>' });
    requestAnimationFrame(() => AccueilArt.actu(f.querySelector('.article__toile'), a.art));
  }

  // La recommandation : trois questions, une classe. `apres` : ce qui suit la réponse.
  ouvrirQuiz() {
    this.quiz = { i: 0, rep: [] };
    this.ouvrirCalque('quiz', 'Trouvons ta classe', this.quizHtml(), { classe: 'entree-modale--quiz' });
  }

  quizHtml() {
    const q = this.quiz;
    if (q.i >= QUIZ.length) {
      const id = recommander(q.rep), c = DATA.classes[id];
      return `<div class="quiz quiz--fin" style="--c:${c.color}">
        <canvas class="quiz__buste" width="96" height="96" aria-hidden="true"></canvas>
        <p class="quiz__surtitre">Ta classe</p>
        <h3 class="quiz__classe">${esc(c.name)} <span>${esc(epithete(c.title))}</span></h3>
        <p class="quiz__desc">${esc(c.desc)}</p>
        <div class="quiz__actions"><button class="vy-bouton" data-act="quiz-refaire">Recommencer</button><button class="vy-bouton vy-bouton--primaire" data-act="quiz-choisir" data-id="${id}" data-focus>Choisir ${esc(c.name)}</button></div>
      </div>`;
    }
    const Q = QUIZ[q.i];
    return `<div class="quiz">
      <ol class="quiz__progres" aria-label="Question ${q.i + 1} sur ${QUIZ.length}">${QUIZ.map((x, k) => `<li class="${k < q.i ? 'fait' : k === q.i ? 'ici' : ''}"></li>`).join('')}</ol>
      <h3 class="quiz__question">${Q.q}</h3>
      <div class="quiz__reponses">${Q.r.map((r, k) => `<button class="e-nu quiz__reponse" data-act="quiz-rep" data-id="${r.id}"${k === 0 ? ' data-focus' : ''}><span class="quiz__icone">${ICONES[r.icone] || ''}</span><span class="quiz__texte"><b>${r.label}</b><small>${r.aide}</small></span></button>`).join('')}</div>
    </div>`;
  }

  majQuiz() {
    const corps = this.calqueEl && this.calqueEl.querySelector('.vy-modale__corps');
    if (!corps) return;
    corps.innerHTML = fines(this.quizHtml());
    const cv = corps.querySelector('.quiz__buste');
    if (cv) { const id = recommander(this.quiz.rep); AccueilArt.buste(cv, AccueilArt.figure(id, { gender: this.b.gender, look: apparenceDeClasse(id, this.b.gender) }), { w: 96, h: 96 }); }
    const f = corps.querySelector('[data-focus]') || corps.querySelector('button'); if (f) f.focus({ preventScroll: true });
  }

  confirmerSuppression(uid) {
    const p = Save.list().find(x => x.uid === uid);
    if (!p) return;
    const cl = DATA.classes[p.classId];
    this.ouvrirCalque('supprimer', 'Supprimer ce personnage ?', `<p class="entree-texte"><b>${esc(p.name)}</b>, ${esc(cl.name)} niveau ${p.level}, sera effacé de cet appareil. Cette action est définitive ; un code exporté depuis les Options permet de le retrouver.</p>`,
      { pied: `<button class="vy-bouton" data-act="fermer-calque" data-focus>Annuler</button><button class="vy-bouton vy-bouton--danger" data-act="supprimer-ok" data-uid="${uid}">Supprimer ${esc(p.name)}</button>` });
  }

  ouvrirImport() {
    this.ouvrirCalque('importer', 'Importer un personnage', `<p class="entree-texte">Colle le code copié depuis les Options du jeu, sur l'autre appareil.</p>
      <textarea class="entree-zone" rows="4" placeholder="Colle le code ici" aria-label="Code du personnage" data-focus></textarea><p class="app-erreur entree-calque__erreur" role="alert"></p>`,
    { pied: '<button class="vy-bouton" data-act="fermer-calque">Annuler</button><button class="vy-bouton vy-bouton--primaire" data-act="importer-ok">Importer</button>' });
  }
}

// ----- Les actions, par nom (data-act) -----
Accueil.prototype.actions = {
  retour() { this.retour(); },
  reglages() { this.ouvrirReglages(); },
  langue() { this.ouvrirReglages(); },
  rien() {},
  'fermer-calque'() { this.fermerCalque(); },
  theme(b) {
    document.getElementById('app').dataset.uiTheme = b.dataset.theme;
    Accueil.ecrire('veylan.theme', b.dataset.theme);
    this.calqueEl.querySelectorAll('.vy-theme').forEach(x => { const on = x === b; x.classList.toggle('on', on); x.setAttribute('aria-pressed', on); });
  },
  rendu(b) {
    const v = b.dataset.rendu === 'canvas' ? 'canvas' : 'webgl';
    if (v === 'webgl') { try { localStorage.removeItem('veylan.rendu'); } catch (e) { /* rien */ } } else Accueil.ecrire('veylan.rendu', v);
    this.calqueEl.querySelectorAll('.reglages__seg-btn[data-rendu]').forEach(x => { const on = x === b; x.classList.toggle('on', on); x.setAttribute('aria-pressed', on); });
    const r = this.calqueEl.querySelector('.reglages__relancer'); if (r) r.hidden = Accueil.lire('veylan.rendu.vu') === v;
  },
  relancer() { location.reload(); },
  'ile-essai'(b) {
    const on = b.getAttribute('aria-pressed') !== 'true';
    if (on) Accueil.ecrire('veylan.ile.essai', '1'); else { try { localStorage.removeItem('veylan.ile.essai'); } catch (e) { /* rien */ } }
    b.setAttribute('aria-pressed', String(on));
    const r = this.calqueEl.querySelector('[data-ile-relancer]'); if (r) r.hidden = false;
  },
  journal() { this.ouvrirJournal(); },
  'actu-lire'() { if (!this.glisse) this.ouvrirActu(); },
  'actu-prec'() { this.changerActu(-1); },
  'actu-suiv'() { this.changerActu(1); },
  'actu-aller'(b) { this.changerActu(Number(b.dataset.i) - this.actuIndex); },
  'actu-prec-lire'() { this.changerActu(-1); this.ouvrirActu(); },
  'actu-suiv-lire'() { this.changerActu(1); this.ouvrirActu(); },
  continuer() {
    const d = this.continuer;
    const ch = d ? Accueil.lirePersonnage(d.uid) : null;
    if (!ch) { this.toast('Cette sauvegarde est illisible.'); return; }
    this.demarrer(ch);
  },
  personnages() { this.aller('personnages'); },
  creer() { this.commencerCreation(false); },
  invite() { this.commencerCreation(true); },
  choisir(b) {
    if (this.choix === b.dataset.uid) return this.actions.jouer.call(this);
    this.choix = b.dataset.uid;
    const persos = Save.list(), sel = persos.find(p => p.uid === this.choix);
    this.ecranEl.querySelectorAll('.perso-carte').forEach(x => { const btn = x.querySelector('[data-uid]'); const on = !!btn && btn.dataset.uid === this.choix; x.classList.toggle('on', on); if (btn) x.setAttribute('aria-selected', on); });
    const j = this.ecranEl.querySelector('.perso-jouer');
    if (j && sel) { j.disabled = false; j.textContent = fines(`Jouer : ${sel.name}`); }
  },
  jouer() {
    const ch = this.choix ? Accueil.lirePersonnage(this.choix) : null;
    if (!ch) { this.toast('Choisis un personnage.'); return; }
    this.demarrer(ch);
  },
  supprimer(b) { this.confirmerSuppression(b.dataset.uid); },
  'supprimer-ok'(b) {
    const p = Save.list().find(x => x.uid === b.dataset.uid);
    Save.remove(b.dataset.uid);
    this.fermerCalque(true);
    if (p) this.toast(`${p.name} a été supprimé.`);
    this.afficher('personnages', 1);
  },
  importer() { this.ouvrirImport(); },
  'importer-ok'() {
    const zone = this.calqueEl.querySelector('.entree-zone');
    const r = Save.importText(zone.value);
    const err = this.calqueEl.querySelector('.entree-calque__erreur');
    // Un personnage d'Ervane sur une page sans l'île : le code attend, la page se recharge (js/save.js).
    if (r.recharge) { err.textContent = fines(r.error); setTimeout(() => location.reload(), 50); return; }
    if (!r.ch) { err.textContent = fines(r.error || 'Code invalide.'); return; }
    if (!Save.write(r.ch)) { err.textContent = 'Impossible d\'enregistrer ce personnage ici.'; return; }
    this.choix = r.ch.uid;
    this.fermerCalque(true);
    this.toast(`${r.ch.name} est arrivé sur cet appareil.`);
    this.afficher('personnages', 1);
  },
  'monde-auto'() { this.choisirMonde('auto'); },
  'monde-table'() { this.mondeTable = true; this.afficher('monde', 1); },
  'monde-annuler'() { this.mondeTable = false; this.afficher('monde', -1); },
  'monde-ligne'() {},
  'monde-ok'() { this.choisirMonde('choix'); },
  'deja-debut'() {
    this.b.tuto = 'guide';
    this.suite('deja');
    this.ouvrirQuiz();
  },
  'deja-connait'() { this.b.tuto = 'court'; this.suite('deja'); },
  classe(b) { this.choisirClasse(b.dataset.id); },
  'classe-verrou'(b) { const c = DATA.futureClasses[b.dataset.id]; this.toast(`${c.name}, ${epithete(c.title).toLowerCase()} : arrive avec la saison ${c.season}.`); },
  genre(b) {
    this.b.gender = b.dataset.g === 'm' ? 'm' : 'f';
    if (!this.b.lookTouche) this.b.look = apparenceDeClasse(this.b.classId, this.b.gender);
    this.majClasse(); this.dessinerGrille();
  },
  voie(b) { this.b.voie = b.dataset.voie || null; this.majClasse(); },
  tourner(b) { this.tourner(Number(b.dataset.sens) || 1); },
  quiz() { this.ouvrirQuiz(); },
  'quiz-rep'(b) { this.quiz.rep.push(b.dataset.id); this.quiz.i++; this.majQuiz(); },
  'quiz-refaire'() { this.quiz = { i: 0, rep: [] }; this.majQuiz(); },
  'quiz-choisir'(b) {
    const id = b.dataset.id;
    this.b.recommandee = id;
    this.fermerCalque(true);
    if (this.ecran === 'classe') {
      this.b.classId = null;
      this.choisirClasse(id);
      this.ecranEl.querySelectorAll('.classe-case[data-act="classe"]').forEach(x => {
        const on = x.dataset.id === id;
        x.classList.toggle('reco', on);
        const etoile = x.querySelector('.classe-case__reco');
        if (on && !etoile) x.insertAdjacentHTML('beforeend', `<span class="classe-case__reco" aria-hidden="true">${ICONES.etoile}</span>`);
        if (!on && etoile) etoile.remove();
      });
      this.toast(`Recommandée pour toi : ${DATA.classes[id].name}.`);
      const s = this.ecranEl.querySelector('[data-act="suivant"]'); if (s) s.focus({ preventScroll: true });
    }
  },
  suivant() { this.b.facing = 'se'; this.suite('classe'); },
  tete(b) { const i = Number(b.dataset.i); this.b.look = { tete: i, couleurs: this.b.look.couleurs.slice() }; this.b.lookTouche = true; this.majApparence(); },
  case(b) {
    this.slot = Number(b.dataset.i);
    this.ecranEl.querySelectorAll('.app-case').forEach(x => { const on = x === b; x.classList.toggle('on', on); x.setAttribute('aria-checked', on); });
    this.hsv = hexHsv(this.b.look.couleurs[this.slot]);
    const f = this.ecranEl.querySelector('.app-hex__champ'); if (f) f.value = this.b.look.couleurs[this.slot].slice(1);
    this.dessinerSelecteur();
  },
  recent(b) { this.poserCouleur(b.dataset.c, false); },
  aleatoire() { this.b.look = this.paletteAleatoire(); this.b.lookTouche = true; this.majApparence(); },
  reinit() { this.b.look = apparenceDeClasse(this.b.classId, this.b.gender); this.b.lookTouche = false; this.b.facing = 'se'; this.majApparence(); },
  'nom-aleatoire'() {
    const n = Noms.aleatoire();
    this.b.name = n;
    const f = this.ecranEl.querySelector('#entree-nom');
    if (f) { f.value = n; this.racine.querySelector('.app-nom__compte').textContent = `${n.length}/16`; }
    this.erreur('');
  },
  'creer-perso'() { this.creerPersonnage(); },
};

// ----- Tables -----
// Profil de chaque classe pour l'écran de choix : difficulté (1 à 3, d'après le kit : contrôle et
// invocation plus exigeants), trois rôles, les réponses du questionnaire qui la désignent, et
// l'apparence de départ d'un nouveau personnage (coiffure de la Veilleuse, du Veilleur, peau,
// cheveux ; la tenue, la cape et la lanterne restent aux couleurs de la classe).
const PROFILS = {
  vaelith: { difficulte: 3, roles: ['controle', 'distance', 'placement'], quiz: ['distance', 'controler', 'exigeant'], look: [4, 0, '#f2d9bf', '#2b2d42'] },
  sarkan: { difficulte: 1, roles: ['melee', 'endurance', 'degats'], quiz: ['contact', 'proteger', 'simple'], look: [5, 2, '#d8a982', '#5a3a24'] },
  lyssar: { difficulte: 2, roles: ['distance', 'degats', 'pieges'], quiz: ['distance', 'frapper', 'simple'], look: [1, 1, '#f6dcc4', '#b5542c'] },
  oriel: { difficulte: 1, roles: ['soin', 'protection', 'soutien'], quiz: ['distance', 'proteger', 'simple'], look: [3, 7, '#e8c4a0', '#e8d5a0'] },
  nerith: { difficulte: 2, roles: ['furtivite', 'melee', 'larcin'], quiz: ['contact', 'frapper', 'exigeant'], look: [6, 6, '#f2d9bf', '#1c1410'] },
  kaldrin: { difficulte: 3, roles: ['mecanismes', 'controle', 'distance'], quiz: ['distance', 'controler', 'exigeant'], look: [3, 2, '#c68e6a', '#3a2a20'] },
  karsh: { difficulte: 1, roles: ['melee', 'degats', 'endurance'], quiz: ['contact', 'frapper', 'simple'], look: [4, 7, '#f2d9bf', '#2c1c1a'] },
  mirel: { difficulte: 2, roles: ['soutien', 'entrave', 'zones'], quiz: ['distance', 'proteger', 'exigeant'], look: [4, 0, '#a86f4c', '#1c1410'] },
  thalor: { difficulte: 3, roles: ['placement', 'controle', 'endurance'], quiz: ['contact', 'controler', 'exigeant'], look: [5, 7, '#8a5536', '#1c1410'] },
  fennal: { difficulte: 3, roles: ['invocation', 'controle', 'soutien'], quiz: ['distance', 'controler', 'exigeant'], look: [1, 0, '#f6dcc4', '#7a4a2a'] },
};
// L'apparence de départ d'une classe pour un genre (Character.defaultLook pour une classe sans profil).
function apparenceDeClasse(id, g) {
  const base = Character.defaultLook(id), P = PROFILS[id];
  if (!P || !P.look) return base;
  return { tete: g === 'm' ? P.look[1] : P.look[0], couleurs: [P.look[2], P.look[3]].concat(base.couleurs.slice(2)) };
}
// Classes des saisons à venir (docs/MONDE.md) : une couleur et un glyphe pour leur case verrouillée.
const FUTURES = { kaelum: { color: '#7a3b5e', glyph: 'Ka' }, lheth: { color: '#4b5a8a', glyph: 'Lh' } };

// Les rôles : nom, pictogramme, couleur du losange.
const ROLES = (() => {
  const s = p => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${p}</svg>`;
  return {
    melee: ['Mêlée', s('<path d="M5 19L17 7M14 5h4v4M7 14l3 3M4 20l2-2"/>'), '#c9472f'],
    distance: ['Distance', s('<path d="M4 20L18 6M13 5h6v6M4 20l3-1-2-2z"/>'), '#62865e'],
    controle: ['Contrôle', s('<path d="M12 12m-2 0a2 2 0 1 0 4 0a4 4 0 1 0-8 0a6 6 0 1 0 12 0"/>'), '#7a52c7'],
    placement: ['Placement', s('<path d="M4 8h13l-3-3M20 16H7l3 3"/>'), '#0a8fc0'],
    soin: ['Soin', s('<path d="M12 5v14M5 12h14"/>'), '#4f8a4a'],
    protection: ['Protection', s('<path d="M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6z"/>'), '#b08a4a'],
    soutien: ['Soutien', s('<path d="M6 14l6-6 6 6M6 19l6-6 6 6"/>'), '#a8873f'],
    mecanismes: ['Mécanismes', s('<circle cx="12" cy="12" r="3"/><path d="M12 3v3M12 18v3M3 12h3M18 12h3M5.6 5.6l2.1 2.1M16.3 16.3l2.1 2.1M5.6 18.4l2.1-2.1M16.3 7.7l2.1-2.1"/>'), '#c45a2c'],
    invocation: ['Invocation', s('<circle cx="8" cy="9" r="2.5"/><circle cx="16" cy="9" r="2.5"/><path d="M5 19c0-3 1.5-5 3-5s3 2 3 5M13 19c0-3 1.5-5 3-5s3 2 3 5"/>'), '#3f8a5a'],
    furtivite: ['Furtivité', s('<path d="M3 12s3.5-5 9-5 9 5 9 5-3.5 5-9 5-9-5-9-5z"/><path d="M4 4l16 16"/>'), '#5a3f8a'],
    endurance: ['Endurance', s('<path d="M12 20s-7-4.5-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.5-7 10-7 10z"/>'), '#a03c3c'],
    degats: ['Dégâts', s('<path d="M12 3c1 4 5 5 5 10a5 5 0 0 1-10 0c0-3 2-4 2-6 1 1 2 2 3 2 0-2 0-4 0-6z"/>'), '#c2502a'],
    pieges: ['Pièges', s('<path d="M4 18h16M6 18l6-11 6 11M9 13h6"/>'), '#8e7144'],
    entrave: ['Entrave', s('<circle cx="12" cy="5" r="2"/><path d="M12 7v13M6 13a6 6 0 0 0 12 0M9 10h6"/>'), '#1f7f99'],
    larcin: ['Larcin', s('<circle cx="12" cy="13" r="6"/><path d="M12 10v6M10 12h4M9 4l3 3 3-3"/>'), '#9a7a2a'],
    zones: ['Zones', s('<circle cx="12" cy="12" r="2"/><circle cx="12" cy="12" r="5.5"/><circle cx="12" cy="12" r="9"/>'), '#2a8f8a'],
  };
})();

// Le questionnaire de recommandation : trois questions courtes.
const QUIZ = [
  { q: 'En combat, où aimes-tu te tenir ?', r: [
    { id: 'contact', label: 'Au contact', aide: 'Je fonce et je tiens la ligne.', icone: 'lame' },
    { id: 'distance', label: 'À distance', aide: 'Je vise de loin, à l\'abri.', icone: 'fleche' },
  ] },
  { q: 'Ce qui te plaît le plus ?', r: [
    { id: 'proteger', label: 'Protéger', aide: 'Soigner, couvrir, garder les autres debout.', icone: 'bouclier' },
    { id: 'frapper', label: 'Frapper', aide: 'Des dégâts, et vite.', icone: 'flamme' },
    { id: 'controler', label: 'Contrôler', aide: 'Placer, pousser, piéger, décider du terrain.', icone: 'spirale' },
  ] },
  { q: 'Et ton style de jeu ?', r: [
    { id: 'simple', label: 'Simple et direct', aide: 'Je veux m\'y retrouver tout de suite.', icone: 'etoile' },
    { id: 'exigeant', label: 'Exigeant', aide: 'J\'aime les plans en trois tours et les combinaisons.', icone: 'engrenage' },
  ] },
];
// Ordre de préférence quand deux classes répondent aussi bien : les classes de l'alpha d'abord.
const ORDRE_RECO = ['sarkan', 'lyssar', 'nerith', 'oriel', 'karsh', 'vaelith', 'mirel', 'thalor', 'kaldrin', 'fennal'];
// La classe qui répond le mieux : le rôle compte double, la distance une fois et demie.
function recommander(rep) {
  const poids = [1.5, 2, 1];
  let best = null, score = -1;
  for (const id of ORDRE_RECO) {
    const P = PROFILS[id];
    if (!P || !DATA.classes[id]) continue;
    const sc = rep.reduce((n, r, i) => n + (P.quiz[i] === r ? poids[i] : 0), 0);
    if (sc > score) { score = sc; best = id; }
  }
  return best || DATA.defaultClass;
}

const TETES = ['Mèche balayée', 'Queue haute', 'Hérissés', 'Chignon', 'Longs', 'Tresse', 'Capuche', 'Rasé, bandeau d\'or'];
const COULEURS_NOMS = ['Peau', 'Cheveux', 'Tunique', 'Chausses', 'Cape', 'Lanterne'];

// « Tisseur des Voiles » devient « Le Tisseur des Voiles », « Lame d'Ombre » « La Lame d'Ombre ».
function epithete(t) {
  const mot = String(t).split(/[\s-]/)[0];
  if (/^[aeiouyhéèêâ]/i.test(t)) return 'L\'' + t;
  return (['Lame'].includes(mot) ? 'La ' : 'Le ') + t;
}

function esc(s) { return Util.esc(s); }
// Typographie française : une espace insécable avant « : ; ! ? » » et après « « », pour qu'aucune
// ligne ne commence par un deux-points ou un guillemet fermant.
function fines(texte) { return String(texte).replace(/ ([:;!?»])/g, ' $1').replace(/« /g, '« '); }
function dateFr(d) { return String(d || '').split('-').reverse().join('/'); }

// Depuis quand : « à l'instant », « il y a 5 min », « hier », « le 12/10/2026 ».
function depuis(t) {
  if (!t) return 'jamais';
  const s = Math.max(0, (Date.now() - t) / 1000);
  if (s < 60) return 'à l\'instant';
  if (s < 3600) return `il y a ${Math.floor(s / 60)} min`;
  if (s < 86400) return `il y a ${Math.floor(s / 3600)} h`;
  const j = Math.floor(s / 86400);
  if (j === 1) return 'hier';
  if (j < 30) return `il y a ${j} jours`;
  return 'le ' + new Date(t).toLocaleDateString('fr-FR');
}

// Couleurs : TSV (teinte 0 à 360, saturation et valeur 0 à 1) et « #rrggbb ».
function hsvHex(h, s, v) {
  h = ((h % 360) + 360) % 360;
  const f = n => { const k = (n + h / 60) % 6; return v - v * s * Math.max(0, Math.min(k, 4 - k, 1)); };
  const x = n => Math.round(f(n) * 255).toString(16).padStart(2, '0');
  return '#' + x(5) + x(3) + x(1);
}
function hexHsv(hex) {
  const n = parseInt(hex.slice(1), 16), r = ((n >> 16) & 255) / 255, g = ((n >> 8) & 255) / 255, b = (n & 255) / 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b), d = max - min;
  let h = 0;
  if (d) h = max === r ? 60 * (((g - b) / d) % 6) : max === g ? 60 * ((b - r) / d + 2) : 60 * ((r - g) / d + 4);
  return { h: (h + 360) % 360, s: max ? d / max : 0, v: max };
}

// Pictogrammes de l'entrée : un trait, comme ceux des fenêtres (js/fenetres.js).
const ICONES = (() => {
  const s = (p, w) => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="${w || 1.8}" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${p}</svg>`;
  return {
    chevronG: s('<path d="M15 5l-7 7 7 7"/>', 2.2),
    chevronD: s('<path d="M9 5l7 7-7 7"/>', 2.2),
    fermer: s('<path d="M6 6l12 12M18 6L6 18"/>'),
    engrenage: s('<circle cx="12" cy="12" r="3"/><path d="M12 2.5v3M12 18.5v3M2.5 12h3M18.5 12h3M5.3 5.3l2.1 2.1M16.6 16.6l2.1 2.1M5.3 18.7l2.1-2.1M16.6 7.4l2.1-2.1"/><circle cx="12" cy="12" r="6.5"/>'),
    livre: s('<path d="M4 5c3-1.5 5.5-1.5 8 0v14c-2.5-1.5-5-1.5-8 0z"/><path d="M20 5c-3-1.5-5.5-1.5-8 0v14c2.5-1.5 5-1.5 8 0z"/><path d="M16 4v6l1.5-1 1.5 1V4.5"/>'),
    corbeille: s('<path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13M10 11v6M14 11v6"/>'),
    plus: s('<path d="M12 5v14M5 12h14"/>', 2),
    globe: s('<circle cx="12" cy="12" r="8.5"/><path d="M3.5 12h17M12 3.5c2.5 2.5 3.5 5.5 3.5 8.5s-1 6-3.5 8.5c-2.5-2.5-3.5-5.5-3.5-8.5s1-6 3.5-8.5z"/>'),
    info: s('<circle cx="12" cy="12" r="9"/><path d="M12 11v6M12 7.5v.5"/>'),
    tournerG: s('<path d="M20 12a8 8 0 1 1-3-6.2"/><path d="M20 4v5h-5"/>', 2.2),
    tournerD: s('<path d="M4 12a8 8 0 1 0 3-6.2"/><path d="M4 4v5h5"/>', 2.2),
    tourner: s('<path d="M4 12a8 8 0 1 0 3-6.2"/><path d="M4 4v5h5"/>', 2),
    de: s('<rect x="4" y="4" width="16" height="16" rx="3"/><circle cx="9" cy="9" r="1.1" fill="currentColor"/><circle cx="15" cy="15" r="1.1" fill="currentColor"/><circle cx="15" cy="9" r="1.1" fill="currentColor"/><circle cx="9" cy="15" r="1.1" fill="currentColor"/><circle cx="12" cy="12" r="1.1" fill="currentColor"/>'),
    femme: s('<circle cx="12" cy="9" r="5"/><path d="M12 14v7M9 18h6"/>', 2),
    homme: s('<circle cx="10" cy="14" r="5"/><path d="M14 10l6-6M15 4h5v5"/>', 2),
    cadenas: s('<rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/>', 2),
    etoile: s('<path d="M12 3l2.6 5.6 6.1.7-4.5 4.2 1.2 6.1L12 16.6 6.6 19.6l1.2-6.1-4.5-4.2 6.1-.7z"/>'),
    bulle: s('<path d="M4 6.5A2.5 2.5 0 0 1 6.5 4h11A2.5 2.5 0 0 1 20 6.5v7a2.5 2.5 0 0 1-2.5 2.5H10l-4 4v-4h0.5A2.5 2.5 0 0 1 4 13.5z"/><path d="M8.5 10h.01M12 10h.01M15.5 10h.01"/>'),
    boussole: s('<circle cx="12" cy="12" r="9"/><path d="M15.5 8.5l-2 5-5 2 2-5z"/>'),
    lame: s('<path d="M5 19L17 7M14 5h4v4M7 14l3 3M4 20l2-2"/>', 2),
    fleche: s('<path d="M4 20L18 6M13 5h6v6M4 20l3-1-2-2z"/>', 2),
    bouclier: s('<path d="M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6z"/>', 2),
    flamme: s('<path d="M12 3c1 4 5 5 5 10a5 5 0 0 1-10 0c0-3 2-4 2-6 1 1 2 2 3 2 0-2 0-4 0-6z"/>', 2),
    spirale: s('<path d="M12 12m-2 0a2 2 0 1 0 4 0a4 4 0 1 0-8 0a6 6 0 1 0 12 0"/>', 2),
  };
})();

// L'apparence de départ d'une classe, aussi pour les peintures de l'accueil (js/accueil-art.js).
Accueil.apparenceDeClasse = apparenceDeClasse;

return Accueil;
})();
