(async function () {
  const params = new URLSearchParams(location.search);
  const DEV = Util.dev();
  if (DEV && params.get('reset')) { Save.clear(); Accueil.oublierMonde(); }
  let rendu = null;
  try { rendu = localStorage.getItem('veylan.rendu'); } catch (e) {   }
  if (!params.has('render') && rendu === 'canvas') params.set('render', 'canvas');
  try { localStorage.setItem('veylan.rendu.vu', rendu === 'canvas' ? 'canvas' : 'webgl'); } catch (e) {   }
  const freshSeed = () => { try { return crypto.getRandomValues(new Uint32Array(1))[0]; } catch (e) { return Math.floor(Math.random() * 4294967296); } };
  const seed = DEV && params.get('seed') ? Number(params.get('seed')) : freshSeed();
  const rng = Util.mulberry32(seed);
  const combat = new Combat({ rng, turnSeconds: DATA.rules.turnSeconds, aiDelay: DEV && params.has('aidelay') ? Number(params.get('aidelay')) : 350 });
  const canvas = document.getElementById('board');
  const useGL = typeof RendererGL === 'function' && RendererGL.supported(params) && await RendererGL.probe();
  const RendererClass = useGL ? RendererGL : Renderer;
  const renderer = new RendererClass(canvas, combat, null);
  const scene = typeof Scene === 'function' && typeof Ile === 'object' && Ile.actif() ? new Scene({ cases: renderer, combat }) : null;
  const R = scene || renderer;
  const ui = new UI(combat, R);
  let world = null;
  let hud = null;
  let nuitIle = false;
  const regionDe = z => { const r = z && (z.region || z.palette); return r === 'ervane' ? 'ervane' : r === 'kaldum' ? 'kaldum' : 'orsane'; };
  const musiqueDuLieu = w => {
    if (!w) return 'accueil';
    if (w.ch && w.ch.dungeon) return [w.ch.dungeon.id, 'donjon'];
    const z = World.zoneOf(w.mapId), r = regionDe(z);
    const l = r === 'ervane' && nuitIle ? ['nuit'] : [];
    if (z && z.id) l.push(z.id);
    l.push(r);
    return l;
  };
  const musiqueDuCombat = (w, boss) => {
    if (boss) return [w && w.ch && w.ch.dungeon ? w.ch.dungeon.id + '_boss' : null, 'boss'];
    const z = w && World.zoneOf(w.mapId);
    return [z && z.id ? z.id + '_combat' : null, 'combat'];
  };
  Son.musique('accueil');
  document.addEventListener('veylan:nuit', e => {
    nuitIle = !!(e && e.detail);
    if (world && !world.showCombat && !(world.ch && world.ch.dungeon)) Son.musique(musiqueDuLieu(world));
  });
  combat.on('float', d => { if (/^-\d/.test(d.text)) Son.jouer('coup'); else if (/^\+\d+$/.test(d.text)) Son.jouer('soin'); });
  combat.on('fx', () => Son.jouer('sort'));
  combat.on('turn', e => { if (e === combat.player) Son.jouer('tour'); });
  document.addEventListener('click', e => { if (e.target && e.target.closest && e.target.closest('button, .vy-bouton, .e-nu, .vy-onglet, .tab')) Son.jouer('toucher'); }, true);

  function startGame(character) {
    title.hide();
    let abandoned = false;
    if (character.fight) {
      abandoned = true;
      delete character.fight;
      character.hp = Math.max(1, Math.round(character.derived().hpMax * 0.5));
      character.dungeon = null;
      character.pos = character.relay ? { map: character.relay.map, x: character.relay.x, y: character.relay.y } : null;
      character.counters.abandons = (character.counters.abandons || 0) + 1;
    }
    if (character.origine === 'ervane' && typeof Ile === 'object' && Ile.actif()) Ile.appliquerOrsane();
    if (typeof Ile === 'object' && Ile.appliquerOrsane3DPour && !Ile.orsane3D() && Ile.appliquerOrsane3DPour(character)) Save.accorder(character);
    world = new World({ character, combat, rng, plateaux: !!scene });
    R.world = world;
    R.static = null;
    if (scene) scene.brancher(world);
    hud = new Hud(world, combat, R, ui);
    let last = performance.now();
    R.onTick = now => { const dt = Math.min(0.1, (now - last) / 1000); last = now; world.update(dt); };
    const start = character.dungeon ? `${character.dungeon.id}#${character.dungeon.room}` : (character.pos && World.mapDef(character.pos.map) ? character.pos.map : World.firstMap(character));
    const arrival = character.dungeon ? { relay: true } : (character.pos && World.mapDef(character.pos.map) && character.pos.x != null ? { x: character.pos.x, y: character.pos.y } : { relay: true });
    if (!start) { hud.toast('Aucune zone chargée.'); return; }
    if (!world.enter(start, arrival)) {
      character.dungeon = null;
      const premiere = World.firstMap(character);
      if (premiere === start || !world.enter(premiere, { relay: true })) world.enter(World.firstMap(), { relay: true });
    }
    if (abandoned) hud.toast('Combat abandonné : il compte comme perdu.');
    if (character.integrity && character.integrity.length) hud.toast('Sauvegarde corrigée : des valeurs impossibles ont été remises en ordre.');
    Save.write(character);
    if (navigator.storage && navigator.storage.persist) { try { navigator.storage.persist().catch(() => {}); } catch (e) {   } }
    Son.musique(musiqueDuLieu(world));
    world.on('map', () => Son.musique(musiqueDuLieu(world)));
    world.on('fight', d => { const g = d && d.group; const boss = !!(g && g.monsters && g.monsters.some(m => DATA.monsters[m.id] && DATA.monsters[m.id].boss)); Son.musique(musiqueDuCombat(world, boss)); });
    world.on('fightEnd', r => { Son.jouer(r && r.victory ? 'victoire' : 'defaite'); Son.musique(musiqueDuLieu(world)); });
    world.on('levelUp', () => Son.jouer('niveau'));
    world.agression = typeof UI === 'function' && UI.reglage ? UI.reglage('agression') : true;
    world.on('alerte', g => { const d = g && g.monsters && DATA.monsters[g.monsters[0].id]; if (d) world.toast(`${d.name} t'a repéré !`); });
    world.on('gain', () => Son.jouer('butin'));
    world.on('reward', () => Son.jouer('butin'));
    world.on('quest', q => { if (q && q.type === 'complete') Son.jouer('quete'); });
    world.on('achievement', () => Son.jouer('succes'));
    VEYLAN.world = world;
    VEYLAN.hud = hud;
  }

  const title = new Accueil({ onStart: startGame, painter: renderer.painter || renderer, rendu: useGL ? 'webgl' : 'canvas' });
  title.show();

  const titleEl = document.getElementById('title'), panelEl = document.getElementById('panel');
  const controls = R.controls = new CameraControls(R.camera, canvas, {
    enabled: () => !!world && titleEl.classList.contains('hidden'),
    keys: () => panelEl.classList.contains('hidden'),
    zeroTaken: () => !!(world && world.showCombat && combat.player && combat.player.spells.length >= 10),
    onRightClick: () => { if (world && world.showCombat) ui.selectSpell(null); },
  });

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
    if (lastPointer === 'touch' && hud && hud.fen && hud.fen.wins.size) { hud.fen.closeTop(); return; }
    if (world.showCombat) ui.tapCell(cellOf(evt), lastPointer === 'touch');
    else {
      R.highlights.hover = null;
      const c = cellOf(evt);
      if (c) world.tap(c);
    }
  });
  canvas.addEventListener('contextmenu', evt => evt.preventDefault());
  const emptyGround = c => {
    if (!c) return false;
    if (world.showCombat) return !Grid.inBounds(combat.map, c.x, c.y) || !combat.entityAt(c.x, c.y);
    if (world.plateau) return !c.cible;
    if (!Grid.inBounds(world.map, c.x, c.y)) return true;
    return !world.blockedForPlayer(c.x, c.y) && !world.isDoor(c) && !world.isRelay(c);
  };
  canvas.addEventListener('dblclick', evt => {
    if (!world || lastPointer === 'touch' || !controls.enabled()) return;
    if (emptyGround(cellOf(evt))) R.camera.fit(true);
  });

  const vue = document.getElementById('vue');
  vue.innerHTML = `<button id="vue-recentrer" class="vy-camera__bouton au-cadre" aria-label="Recentrer la vue (0)" title="Recentrer la vue (0)">${Fenetres.ICON.recentrer}</button>` +
    `<button id="vue-regard" class="vy-camera__bouton" hidden>${Fenetres.ICON.regard}</button>` +
    (PleinEcran.disponible() ? '<button id="vue-plein-ecran" class="vy-camera__bouton" aria-pressed="false"></button>' : '');
  const recentrer = document.getElementById('vue-recentrer');
  recentrer.addEventListener('click', () => R.camera.fit(true));
  addEventListener('veylan:camera', evt => recentrer.classList.toggle('au-cadre', !!evt.detail.atFit));
  const regard = document.getElementById('vue-regard');
  const NOMS_REGARD = { jeu: 'la vue du jeu', basse: 'la vue basse', iso: 'la vue isométrique' };
  const majRegard = () => {
    const cam = R.camera, ok = !!cam && typeof cam.changerRegard === 'function' && cam.mode === 'exploration';
    regard.hidden = !ok;
    if (!ok) return;
    const noms = Object.keys(cam.regards), suivant = noms[(noms.indexOf(cam.regard) + 1) % noms.length];
    const label = `Passer à ${NOMS_REGARD[suivant] || suivant} (R)`;
    if (regard.title !== label) { regard.title = label; regard.setAttribute('aria-label', label); }
  };
  regard.addEventListener('click', () => { const cam = R.camera; if (cam && typeof cam.changerRegard === 'function') cam.changerRegard(); majRegard(); });
  addEventListener('veylan:camera', majRegard);
  setInterval(majRegard, 1000);
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

  const stageEl = document.getElementById('stage'), hudEl = document.getElementById('hud');
  const coverHud = () => {
    const s = stageEl.getBoundingClientRect(), h = hudEl.getBoundingClientRect();
    const over = h.height > 0 && h.top > s.top && h.top < s.bottom - 1;
    const jeu = hud && hud.jeu;
    const ins = { bottom: Math.max(over ? s.bottom - h.top : 0, jeu && jeu.insetBas ? jeu.insetBas() : 0), top: jeu && jeu.insetHaut ? jeu.insetHaut() : 0, right: jeu && jeu.insetDroite ? jeu.insetDroite() : 0, left: jeu && jeu.insetGauche ? jeu.insetGauche() : 0 };
    R.camera.setInsets(ins);
    if (scene && R.camera !== renderer.camera) renderer.camera.setInsets(ins);
  };
  if (typeof ResizeObserver === 'function') { const ro = new ResizeObserver(coverHud); ro.observe(stageEl); ro.observe(hudEl); }
  addEventListener('resize', coverHud);
  window.addEventListener('keydown', evt => {
    if (!world || !world.showCombat) return;
    if (evt.target && (evt.target.tagName === 'INPUT' || evt.target.tagName === 'TEXTAREA')) return;
    ui.key(evt);
  });

  const VEYLAN = { combat, renderer, scene, ui, seed, DATA, Grid, Items, Save, startGame, title, controls };
  if (scene) Object.defineProperty(VEYLAN, 'ile', { get: () => scene.ile });
  if (DEV) window.VEYLAN = VEYLAN;

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
