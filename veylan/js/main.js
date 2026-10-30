// Point d'entrée du jeu : l'entrée (accueil, personnages, création, js/accueil.js), puis le monde,
// le combat, le rendu et l'interface.
// Paramètres de développement, lus seulement en local (fichier, localhost) ou avec ?dev=1 :
//   ?seed=42       graine du générateur aléatoire
//   ?aidelay=0     pause entre les actions des monstres, en millisecondes
//   ?reset=1       efface tous les personnages et le monde choisi (premier lancement)
// En ligne, ils sont ignorés et rien n'est exposé dans la console (docs/ANTI-TRICHE.md).
// ?render=canvas force le rendu Canvas ; sans lui, le choix des réglages de l'accueil s'applique.
// L'île d'Ervane (docs/ILE-TECHNIQUE.md) : ?ile=1 l'allume en développement (js/ile.js) ;
// ?quality=haute|moyenne|basse impose la qualité de son rendu 3D (js/ile-3d.js).
(async function () {
  const params = new URLSearchParams(location.search);
  const DEV = Util.dev();
  if (DEV && params.get('reset')) { Save.clear(); Accueil.oublierMonde(); }
  let rendu = null;
  try { rendu = localStorage.getItem('veylan.rendu'); } catch (e) { /* rien */ }
  if (!params.has('render') && rendu === 'canvas') params.set('render', 'canvas');
  try { localStorage.setItem('veylan.rendu.vu', rendu === 'canvas' ? 'canvas' : 'webgl'); } catch (e) { /* rien */ }
  const freshSeed = () => { try { return crypto.getRandomValues(new Uint32Array(1))[0]; } catch (e) { return Math.floor(Math.random() * 4294967296); } };
  const seed = DEV && params.get('seed') ? Number(params.get('seed')) : freshSeed();
  const rng = Util.mulberry32(seed);
  const combat = new Combat({ rng, turnSeconds: DATA.rules.turnSeconds, aiDelay: DEV && params.has('aidelay') ? Number(params.get('aidelay')) : 350 });
  const canvas = document.getElementById('board');
  // Rendu WebGL éclairé quand le navigateur le permet et qu'un essai réel réussit
  // (?render=canvas force le rendu Canvas).
  const useGL = typeof RendererGL === 'function' && RendererGL.supported(params) && await RendererGL.probe();
  const RendererClass = useGL ? RendererGL : Renderer;
  const renderer = new RendererClass(canvas, combat, null);
  // L'aiguillage du rendu (js/scene.js) : seulement quand l'île d'Ervane est disponible sur
  // l'appareil (js/ile.js). Sinon le rendu des cases sert seul, exactement comme avant.
  const scene = typeof Scene === 'function' && typeof Ile === 'object' && Ile.actif() ? new Scene({ cases: renderer, combat }) : null;
  const R = scene || renderer;
  const ui = new UI(combat, R);
  let world = null;
  let hud = null;

  function startGame(character) {
    title.hide();
    // Un combat laissé en cours (page fermée, rechargée) compte comme perdu : moitié des PV,
    // retour au relais, la salle de donjon est perdue.
    let abandoned = false;
    if (character.fight) {
      abandoned = true;
      delete character.fight;
      character.hp = Math.max(1, Math.round(character.derived().hpMax * 0.5));
      character.dungeon = null;
      character.pos = character.relay ? { map: character.relay.map, x: character.relay.x, y: character.relay.y } : null;
      character.counters.abandons = (character.counters.abandons || 0) + 1;
    }
    // Un personnage né sur Ervane voit l'Orsane du module ervaneOrsane (content/ervane-orsane.js) :
    // l'accueil l'a appliqué avant la lecture validée ; ici, le filet pour tout autre chemin.
    if (character.origine === 'ervane' && typeof Ile === 'object' && Ile.actif()) Ile.appliquerOrsane();
    // Les cartes de plateau (Ervane) demandent l'aiguillage du rendu 3D (js/scene.js) : sans lui,
    // le monde les refuse et le personnage repart à Orsane (docs/ILE-TECHNIQUE.md, journal).
    world = new World({ character, combat, rng, plateaux: !!scene });
    R.world = world;
    R.static = null;
    // La bascule écoute les changements de carte avant le HUD.
    if (scene) scene.brancher(world);
    hud = new Hud(world, combat, R, ui);
    let last = performance.now();
    R.onTick = now => { const dt = Math.min(0.1, (now - last) / 1000); last = now; world.update(dt); };
    const start = character.dungeon ? `${character.dungeon.id}#${character.dungeon.room}` : (character.pos && World.mapDef(character.pos.map) ? character.pos.map : World.firstMap(character));
    const arrival = character.dungeon ? { relay: true } : (character.pos && World.mapDef(character.pos.map) && character.pos.x != null ? { x: character.pos.x, y: character.pos.y } : { relay: true });
    if (!start) { hud.toast('Aucune zone chargée.'); return; }
    // Une salle ou une carte disparue (mise à jour du contenu), ou un plateau sans rendu 3D : on
    // repart du premier relais (le Métier pour un personnage d'Ervane, sinon le premier d'Orsane).
    if (!world.enter(start, arrival)) {
      character.dungeon = null;
      const premiere = World.firstMap(character);
      if (premiere === start || !world.enter(premiere, { relay: true })) world.enter(World.firstMap(), { relay: true });
    }
    if (abandoned) hud.toast('Combat abandonné : il compte comme perdu.');
    if (character.integrity && character.integrity.length) hud.toast('Sauvegarde corrigée : des valeurs impossibles ont été remises en ordre.');
    Save.write(character);
    VEYLAN.world = world;
    VEYLAN.hud = hud;
  }

  const title = new Accueil({ onStart: startGame, painter: renderer.painter || renderer, rendu: useGL ? 'webgl' : 'canvas' });
  title.show();

  // La caméra du plateau (js/camera.js) : molette, glisser avec le bouton du milieu ou le droit,
  // doigts, touches + - 0, sur la toile du plateau seulement. Rien tant que l'entrée est affichée
  // (#title, js/accueil.js) ; pas de touches sous un panneau.
  // Le 0 reste au dixième sort en combat, et le clic droit sans glisser désélectionne le sort.
  const titleEl = document.getElementById('title'), panelEl = document.getElementById('panel');
  const controls = R.controls = new CameraControls(R.camera, canvas, {
    enabled: () => !!world && titleEl.classList.contains('hidden'),
    keys: () => panelEl.classList.contains('hidden'),
    zeroTaken: () => !!(world && world.showCombat && combat.player && combat.player.spells.length >= 10),
    onRightClick: () => { if (world && world.showCombat) ui.selectSpell(null); },
  });

  // La souris et le toucher : en exploration, une case touchée est une intention de déplacement
  // ou d'interaction ; en combat, l'interface de combat prend la main. Un clic qui suit un geste
  // de la caméra (deux doigts, vue déplacée, toucher qui a glissé) ne compte pas.
  const cellOf = evt => { const p = R.canvasPoint(evt); return R.screenToCell(p.x, p.y); };
  canvas.addEventListener('mousemove', evt => {
    if (!world || controls.gesturing()) return;
    if (world.showCombat) ui.hover(cellOf(evt));
    else { R.highlights.hover = cellOf(evt); }
  });
  canvas.addEventListener('mouseleave', () => { if (world && world.showCombat) ui.hover(null); R.highlights.hover = null; });
  let lastPointer = 'mouse';
  canvas.addEventListener('pointerdown', evt => { lastPointer = evt.pointerType || 'mouse'; });
  canvas.addEventListener('click', evt => {
    if (!world || controls.ignoreClick()) return;
    // Au doigt, une fenêtre ouverte (Sorts, Sac...) couvre une part de la scène : un toucher sur la
    // toile la referme et ne vise rien (ni figure, ni sol), comme sur un panneau.
    if (lastPointer === 'touch' && hud && hud.fen && hud.fen.wins.size) { hud.fen.closeTop(); return; }
    if (world.showCombat) ui.tapCell(cellOf(evt), lastPointer === 'touch');
    else {
      R.highlights.hover = null;
      const c = cellOf(evt);
      // Pendant le voile de la bascule vers l'île, un toucher ne vise rien.
      if (c) world.tap(c);
    }
  });
  canvas.addEventListener('contextmenu', evt => evt.preventDefault());
  // Double-clic sur un sol où il n'y a rien (ni personne, ni porte, ni relais ; ou hors du plateau) :
  // la vue recadre le plateau entier. Pas au doigt : le double toucher valide une action en combat.
  const emptyGround = c => {
    if (!c) return false;
    // En combat (sur une carte à cases comme sur l'aire d'un plateau) : une case sans combattant.
    if (world.showCombat) return !Grid.inBounds(combat.map, c.x, c.y) || !combat.entityAt(c.x, c.y);
    // Sur un plateau (l'île en 3D) : un sol sans cible (ni personne, ni relais, ni porte).
    if (world.plateau) return !c.cible;
    if (!Grid.inBounds(world.map, c.x, c.y)) return true;
    return !world.blockedForPlayer(c.x, c.y) && !world.isDoor(c) && !world.isRelay(c);
  };
  canvas.addEventListener('dblclick', evt => {
    if (!world || lastPointer === 'touch' || !controls.enabled()) return;
    if (emptyGround(cellOf(evt))) R.camera.fit(true);
  });

  // Les boutons de la vue (placés par css/fenetres.css selon l'écran) : recentrer (atténué quand le
  // plateau est déjà cadré) et plein écran (absent si le navigateur ne le permet pas : iPhone, cadre
  // sandboxé).
  const vue = document.getElementById('vue');
  vue.innerHTML = `<button id="vue-recentrer" class="vy-camera__bouton au-cadre" aria-label="Recentrer la vue (0)" title="Recentrer la vue (0)">${Fenetres.ICON.recentrer}</button>` +
    (PleinEcran.disponible() ? '<button id="vue-plein-ecran" class="vy-camera__bouton" aria-pressed="false"></button>' : '');
  const recentrer = document.getElementById('vue-recentrer');
  recentrer.addEventListener('click', () => R.camera.fit(true));
  addEventListener('veylan:camera', evt => recentrer.classList.toggle('au-cadre', !!evt.detail.atFit));
  const pleinEcran = document.getElementById('vue-plein-ecran');
  if (pleinEcran) {
    const sync = () => {
      const on = PleinEcran.actif(), label = on ? 'Quitter le plein écran' : 'Plein écran';
      pleinEcran.setAttribute('aria-pressed', String(on));
      pleinEcran.setAttribute('aria-label', label);
      pleinEcran.title = label;
      pleinEcran.innerHTML = on ? Fenetres.ICON.quitterPleinEcran : Fenetres.ICON.pleinEcran;
    };
    pleinEcran.addEventListener('click', () => PleinEcran.basculer());
    PleinEcran.surChangement(sync);
    sync();
  }

  // Sur téléphone, la barre de sorts flotte sur le bas de la carte : la caméra garde le plateau
  // au-dessus. Sur grand écran, elle est sous la scène et ne couvre rien.
  const stageEl = document.getElementById('stage'), hudEl = document.getElementById('hud');
  const coverHud = () => {
    const s = stageEl.getBoundingClientRect(), h = hudEl.getBoundingClientRect();
    const over = h.height > 0 && h.top > s.top && h.top < s.bottom - 1;
    R.camera.setInsets({ bottom: over ? s.bottom - h.top : 0 });
    // La caméra des cases garde les mêmes marges pendant que l'île s'affiche (pour le retour).
    if (scene && R.camera !== renderer.camera) renderer.camera.setInsets({ bottom: over ? s.bottom - h.top : 0 });
  };
  if (typeof ResizeObserver === 'function') { const ro = new ResizeObserver(coverHud); ro.observe(stageEl); ro.observe(hudEl); }
  addEventListener('resize', coverHud);
  window.addEventListener('keydown', evt => {
    if (!world || !world.showCombat) return;
    if (evt.target && (evt.target.tagName === 'INPUT' || evt.target.tagName === 'TEXTAREA')) return;
    ui.key(evt);
  });

  // Exposé pour les tests automatisés et le débogage, en développement seulement.
  const VEYLAN = { combat, renderer, scene, ui, seed, DATA, Grid, Items, Save, startGame, title, controls };
  // Le rendu 3D de l'île (js/ile-3d.js), créé à la première entrée sur un plateau : ses mesures
  // (stats) et son pas d'horloge déterministe pour les tests (avancer).
  if (scene) Object.defineProperty(VEYLAN, 'ile', { get: () => scene.ile });
  if (DEV) window.VEYLAN = VEYLAN;

  // La vignette de l'aperçu de nuit (docs/ILE-TECHNIQUE.md, 3.24 ; IleCharge.vignette) : une partie
  // d'invité s'ouvre droit sur un lieu des Mailles, la nuit, sans tutoriel ni sauvegarde. Sans elle,
  // l'accueil reste l'entrée et rien ne change.
  const vignette = scene && typeof IleCharge === 'object' && IleCharge.vignette ? IleCharge.vignette() : null;
  if (vignette && Ile.allumee && typeof Ile3D === 'function' && Ile3D.disponible()) {
    const ch = Character.create('vaelith', 'Ivra', 'f', null, {});
    if (Ile.fairenaitre(ch)) {
      Ile.appliquerOrsane();
      ch.pos = { map: vignette.map, x: vignette.x, y: vignette.y };
      ch.tuto = { mode: 'off', step: 0, done: true, jeu: 'ile' };
      Object.defineProperty(ch, 'invite', { value: true });
      Save.suspend();
      startGame(ch);
    }
  }
})();
