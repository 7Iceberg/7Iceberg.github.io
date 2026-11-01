// Interface en fenêtres (à la manière des grands tactiques en ligne, dans la charte Veylan) :
// barre de menus, bloc vital, raccourcis d'objets, mini-carte, et les fenêtres Quêtes, Succès,
// Carnet, Journal, Options. L'Inventaire est dans js/hud-inventaire.js, les Caractéristiques dans
// js/hud-caracteristiques.js, les Récompenses en attente dans js/hud-recompenses.js, la Carte du
// monde dans js/hud-carte.js. Se charge après js/hud.js et complète la classe Hud ;
// js/fenetres.js gère le déplacement et l'empilement.
(() => {
const I = Fenetres.ICON;
const esc = s => String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

// Caractéristiques : couleur, élément, pictogramme. L'élément donne +1 % de dégâts par point.
// Partagés par les fenêtres Inventaire et Caractéristiques (Hud.STAT, Hud.pic).
const STAT = {
  vita: { court: 'Vit', couleur: 'var(--vy-braise-clair)', element: null, svg: '<path d="M12 20s-7-4.5-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.5-7 10-7 10z"/>' },
  sagesse: { court: 'Sag', couleur: 'var(--vy-eclat-clair)', element: null, svg: '<path d="M2 12s4-6 10-6 10 6 10 6-4 6-10 6S2 12 2 12z"/><circle cx="12" cy="12" r="2.5"/>' },
  force: { court: 'Ter', couleur: '#6dbb4f', element: 'terre', svg: '<path d="M3 19l6-10 4 6 3-4 5 8z"/>' },
  intel: { court: 'Ign', couleur: '#ff5a36', element: 'feu', svg: '<path d="M12 3c1 4 5 5 5 10a5 5 0 0 1-10 0c0-3 2-4 2-6 1 1 2 2 3 2 0-2 0-4 0-6z"/>' },
  chance: { court: 'Aqu', couleur: '#22b8cf', element: 'eau', svg: '<path d="M12 3c3 5 6 8 6 11a6 6 0 0 1-12 0c0-3 3-6 6-11z"/>' },
  agi: { court: 'Aer', couleur: '#dde4ec', element: 'air', svg: '<path d="M3 9h11a3 3 0 1 0-3-3M3 13h15a3 3 0 1 1-3 3M3 17h7"/>' },
};
// Les autres valeurs du personnage, au même trait ; la couleur dit la caractéristique qui les nourrit.
const VAL = {
  pv: { couleur: 'var(--vy-braise-clair)', svg: '<path d="M12 20s-7-4.5-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.5-7 10-7 10z"/><path d="M7.5 11.5h2.6l1.3-2.3 1.8 4 1.1-1.7h2.2"/>' },
  pa: { couleur: 'var(--vy-or-clair)', svg: '<path d="M12 3l7.8 4.5v9L12 21l-7.8-4.5v-9z"/><circle cx="12" cy="12" r="2.4"/>' },
  pm: { couleur: 'var(--vy-cimes-clair)', svg: '<path d="M4.5 5.5h7.5l6.5 6.5-6.5 6.5H4.5l6.5-6.5z"/>' },
  init: { couleur: 'var(--vy-cristal-voile)', svg: '<circle cx="12" cy="13.5" r="7"/><path d="M12 9.5v4l2.8 1.8M9.5 3.5h5M12 3.5v3"/>' },
  pp: { couleur: '#22b8cf', svg: '<circle cx="10.5" cy="10.5" r="6"/><path d="M20 20l-5.2-5.2M8 10.5h5M10.5 8v5"/>' },
  invoc: { couleur: 'var(--vy-eclat-clair)', svg: '<circle cx="9" cy="8.5" r="3"/><path d="M3.5 19.5a5.5 5.5 0 0 1 11 0"/><path d="M17.5 4l.9 2.1 2.1.9-2.1.9-.9 2.1-.9-2.1-2.1-.9 2.1-.9z"/>' },
  crit: { couleur: 'var(--vy-braise-clair)', svg: '<path d="M12 3l2.1 5.4 5.9.6-4.5 3.9 1.4 5.8L12 15.6l-4.9 3.1 1.4-5.8L4 9l5.9-.6z"/>' },
  dmg: { couleur: 'var(--vy-ivoire)', svg: '<path d="M13.5 4H20v6.5L9.5 21 3 14.5z"/><path d="M8 13l3 3"/>' },
  tacle: { couleur: '#dde4ec', svg: '<path d="M3.5 12H10M7 8.5l3.5 3.5L7 15.5M20.5 12H14M17 8.5 13.5 12l3.5 3.5"/>' },
  fuite: { couleur: '#dde4ec', svg: '<path d="M4 5v14M8 12h11M15 7.5l4.5 4.5-4.5 4.5"/>' },
  esquive: { couleur: 'var(--vy-eclat-clair)', svg: '<path d="M12 3l7 3v5c0 4.5-3 8-7 10-4-2-7-5.5-7-10V6z"/><path d="M9 12h6"/>' },
  retrait: { couleur: 'var(--vy-eclat-clair)', svg: '<circle cx="12" cy="12" r="8"/><path d="M8 12h8M14 9l3 3-3 3"/>' },
  soins: { couleur: '#ff5a36', svg: '<path d="M9.5 4h5v5.5H20v5h-5.5V20h-5v-5.5H4v-5h5.5z"/>' },
};
const pic = (k, size) => { const p = STAT[k] || VAL[k]; return p ? `<svg class="vy-pic" style="--c:${p.couleur}" viewBox="0 0 24 24" width="${size || 16}" height="${size || 16}" fill="none" stroke="${p.couleur}" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${p.svg}</svg>` : '<span class="vy-pic"></span>'; };

// Les fenêtres et leur raccourci clavier. L'Inventaire réunit l'ancien Sac et l'ancienne fenêtre
// Personnage : le bouton Personnage et la touche P l'ouvrent aussi (ALIAS).
const MENUS = [
  ['carac', 'Caractéristiques', 'C', I.carac],
  ['sorts', 'Sorts', 'S', I.sorts],
  ['perso', 'Personnage', 'P', I.perso],
  ['sac', 'Inventaire', 'I', I.sac],
  ['quetes', 'Quêtes', 'Q', I.quetes],
  ['faction', 'Faction', 'F', I.faction],
  ['succes', 'Succès', 'U', I.succes],
  ['carnet', 'Carnet du Veilleur', 'B', I.carnet],
  ['carte', 'Carte du monde', 'M', I.carte],
  ['journal', 'Journal', 'J', I.journal],
  ['options', 'Options', 'O', I.options],
];
const ALIAS = { perso: 'sac' };

Object.assign(Hud.prototype, {
  initFenetres() {
    this.fen = new Fenetres(document.getElementById('fenetres'));
    // Après la descente d'Ervane (js/scene.js, oublierIle), la vue d'ensemble de la mini-carte est rendue.
    window.addEventListener('veylan:ile-oubliee', () => { this.miniVue = null; });
    this.journal = { combat: [], evenements: [] };
    this.journalTab = 'evenements';
    // Barre de menus : toujours visible, en exploration comme en combat.
    const bar = document.getElementById('menus');
    bar.innerHTML = MENUS.map(([id, label, key, icon]) => `<button class="vy-menu" data-win="${id}" aria-label="${label} (${key})" title="${label} (${key})">${icon}<kbd>${key}</kbd></button>`).join('');
    bar.addEventListener('click', evt => { const b = evt.target.closest('[data-win]'); if (b) this.toggleWin(b.dataset.win); });
    window.addEventListener('keydown', evt => {
      const t = evt.target;
      if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.tagName === 'SELECT')) return;
      if (evt.ctrlKey || evt.metaKey || evt.altKey) return;
      if (!this.el.panel.classList.contains('hidden')) return;
      if (evt.key === 'Escape' && this.fen.closeTop()) { evt.preventDefault(); evt.stopImmediatePropagation(); this.syncMenus(); return; }
      const m = MENUS.find(x => x[2].toLowerCase() === evt.key.toLowerCase());
      if (m && document.getElementById('title').classList.contains('hidden')) { evt.preventDefault(); this.toggleWin(m[0]); }
    }, true);
    // Raccourcis d'objets (pains, potions) et bloc vital.
    document.getElementById('raccourcis').addEventListener('click', evt => {
      const b = evt.target.closest('[data-use]');
      if (b) { if (this.world.state === 'combat') this.toast('Pas pendant un combat.'); else this.world.useItem(b.dataset.use); }
    });
    document.getElementById('minicarte').addEventListener('click', () => this.toggleWin('carte'));
    this.world.on('update', () => { this.fen.refreshAll(); this.refreshVital(); });
    this.world.on('hp', () => this.refreshVital());
    this.world.on('map', () => { this.refreshVital(); this.drawMinimap(true); });
    this.combat.on('log', d => this.pushJournal('combat', d.msg, d.kind));
    setInterval(() => this.drawMinimap(false), 350);
    this.applyTheme(this.loadTheme());
    this.appliquerVerre(this.loadOpacite());
    this.initInventaire();
    this.initRecompenses();
  },

  // Événements du DOM (CustomEvent sur window), pour les modules d'à côté (tutoriel, discussion) :
  //  - 'veylan:windowOpen' { id : 'inventaire' | 'caracteristiques' | 'recompenses' }, à l'ouverture
  //    (annoncé une fois par js/fenetres.js, qui prend spec.annonce quand le nom diffère de l'identifiant) ;
  //  - 'veylan:itemEquipped' { id, slot } ;
  //  - 'veylan:statsAllocated' { stat, points, cost } : points gagnés (négatifs s'ils sont retirés) ;
  //  - 'veylan:chat' { type : 'systeme' | 'succes' | 'gain', text }.
  signal(nom, detail) {
    try { window.dispatchEvent(new CustomEvent('veylan:' + nom, { detail })); } catch (e) { /* rien */ }
  },
  chat(type, text) { this.signal('chat', { type, text }); },

  syncMenus() {
    for (const b of document.querySelectorAll('#menus [data-win]')) b.classList.toggle('on', this.fen.isOpen(ALIAS[b.dataset.win] || b.dataset.win));
  },

  toggleWin(id) {
    if (this.fen.isOpen(ALIAS[id] || id)) this.fen.close(ALIAS[id] || id);
    else ({ carac: () => this.openCaracs(), sorts: () => this.openSorts(), perso: () => this.openPerso(), sac: () => this.openSac(), quetes: () => this.openQuests(), faction: () => this.openFaction(), succes: () => this.openAchievements(), carnet: () => this.openCarnet(), carte: () => this.openMap(), journal: () => this.openJournal(), options: () => this.openMenu() }[id] || (() => {}))();
    this.syncMenus();
  },

  // Une fenêtre « simple » à partir d'un rendu HTML et d'actions, pour les écrans d'avant.
  simpleWin(id, title, render, actions, opts) {
    const m = MENUS.find(x => x[0] === id) || [];
    this.fen.open(id, Object.assign({ title, icon: m[3], key: m[2], width: 460, render, actions: actions || {}, onClose: () => this.syncMenus() }, opts || {}));
    this.syncMenus();
  },

  pushJournal(tab, text, kind) {
    const list = this.journal[tab];
    const t = new Date();
    list.push({ h: `${String(t.getHours()).padStart(2, '0')}:${String(t.getMinutes()).padStart(2, '0')}`, text, kind: kind || '' });
    if (list.length > 200) list.shift();
    if (this.fen && this.fen.isOpen('journal')) this.fen.render('journal');
  },

  // ----- Bloc vital : PV dans un cristal, PA et PM, raccourcis -----

  refreshVital() {
    const ch = this.world.ch;
    if (!ch) return;
    const d = ch.derived();
    const pct = Math.max(0, Math.min(1, ch.hp / d.hpMax));
    const v = document.getElementById('vital');
    const sig = [d.hpMax, d.pa, d.pm].join('|');
    if (v.dataset.sig !== sig) {
      v.dataset.sig = sig;
      v.innerHTML =
        `<div class="vy-vital__pv" role="img" aria-label="Points de vie"><svg viewBox="0 0 80 92" aria-hidden="true">` +
        `<defs><clipPath id="clip-pv"><path d="M40 3 76 26 70 70 40 89 10 70 4 26z"/></clipPath>` +
        `<linearGradient id="grad-pv" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ff9a7c"/><stop offset="1" stop-color="#9c2d1d"/></linearGradient></defs>` +
        `<path d="M40 3 76 26 70 70 40 89 10 70 4 26z" class="vy-vital__coque"/>` +
        `<rect class="vy-vital__niveau" clip-path="url(#clip-pv)" x="0" width="80" y="0" height="92" fill="url(#grad-pv)"/>` +
        `<path d="M40 3 76 26 70 70 40 89 10 70 4 26z" class="vy-vital__bord"/><path d="M40 3 40 89M4 26 76 26" class="vy-vital__facette"/></svg>` +
        `<span class="vy-vital__valeur"><b></b><span></span></span></div>` +
        `<div class="vy-vital__pts"><span class="vy-vital__pa" title="Points d'action"><b>${d.pa}</b><small>PA</small></span><span class="vy-vital__pm" title="Points de mouvement"><b>${d.pm}</b><small>PM</small></span></div>`;
    }
    v.querySelector('.vy-vital__niveau').setAttribute('y', String(92 * (1 - pct)));
    v.querySelector('.vy-vital__valeur b').textContent = ch.hp;
    v.querySelector('.vy-vital__valeur span').textContent = d.hpMax;
    v.classList.toggle('bas', pct < 0.3);
    // Raccourcis : pains et potions possédés, six cases.
    const conso = Object.keys(ch.inventory).map(id => Items.get(id)).filter(x => x && x.kind === 'consumable').sort((a, b) => (a.heal || 0) - (b.heal || 0)).slice(0, 6);
    const cells = conso.map(x => `<button class="vy-case" data-rarete="${Items.rarity(x)}" data-use="${x.id}" title="${esc(x.name)} : utiliser" aria-label="Utiliser ${esc(x.name)}"><span class="vy-case__icone">${Hud.picto(x)}</span><span class="vy-case__nombre">${ch.count(x.id)}</span></button>`);
    while (cells.length < 6) cells.push('<span class="vy-case vy-case--vide" aria-hidden="true"></span>');
    const r = document.getElementById('raccourcis');
    const html = cells.join('');
    if (r.dataset.html !== html) { r.dataset.html = html; r.innerHTML = html; }
  },

  // ----- Mini-carte : la carte vue de dessus, en losange comme le jeu -----

  drawMinimap(force) {
    const cv = document.getElementById('minicarte-cv');
    const w = this.world;
    if (!cv || cv.offsetParent === null) return;
    if (!w.map) { if (w.plateau) this.drawMinimapPlateau(cv, force); return; }
    const p = w.player;
    const sig = [w.mapId, p.x, p.y, w.groups.map(g => g.x + ',' + g.y).join(';')].join('|');
    if (!force && sig === this.miniSig) return;
    this.miniSig = sig;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const W = cv.clientWidth, H = cv.clientHeight;
    if (cv.width !== Math.round(W * dpr)) { cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr); }
    const c = cv.getContext('2d');
    c.setTransform(dpr, 0, 0, dpr, 0, 0);
    c.clearRect(0, 0, W, H);
    const m = w.map, n = Math.max(m.w, m.h);
    const tw = W / (n + 1), th = tw / 2;
    const ox = W / 2, oy = (H - th * n) / 2 + th / 2;
    const iso = (x, y) => ({ x: ox + (x - y) * tw / 2, y: oy + (x + y) * th / 2 });
    const col = { 0: '#3f5a3c', 1: '#22252c', 2: '#0b0e14', 3: '#1f4c6b', 4: '#24402a' };
    for (let y = 0; y < m.h; y++) for (let x = 0; x < m.w; x++) {
      const q = iso(x, y), t = m.cells[y][x];
      c.beginPath(); c.moveTo(q.x, q.y - th / 2); c.lineTo(q.x + tw / 2, q.y); c.lineTo(q.x, q.y + th / 2); c.lineTo(q.x - tw / 2, q.y); c.closePath();
      c.fillStyle = col[t] || col[0]; c.fill();
    }
    const dot = (x, y, color, r) => { const q = iso(x, y); c.beginPath(); c.arc(q.x, q.y, r, 0, Math.PI * 2); c.fillStyle = color; c.fill(); c.lineWidth = 1; c.strokeStyle = 'rgba(0,0,0,0.6)'; c.stroke(); };
    for (const dir in (m.exits || {})) for (const e of m.exits[dir] || []) dot(e.x, e.y, '#e2c690', 1.6);
    if (w.relay) dot(w.relay.x, w.relay.y, '#3fc8e9', 3);
    if (w.door) dot(w.door.x, w.door.y, '#a66cff', 3);
    for (const npc of w.npcs) dot(npc.x, npc.y, '#f2e2c9', 2.4);
    for (const g of w.groups) dot(g.x, g.y, '#f07a5c', 2.6);
    dot(Math.round(p.rx != null ? p.rx : p.x), Math.round(p.ry != null ? p.ry : p.y), '#00c2ff', 3.4);
    // Les cartes voisines et la coordonnée [x, y] de la carte (js/hud-carte.js, js/atlas.js).
    if (this.drawVoisins) this.drawVoisins(c, W);
    const pos = !w.mapId.includes('#') && typeof Atlas === 'object' && Atlas.coordsOf(w.mapId);
    const label = document.getElementById('minicarte-nom');
    if (label) label.textContent = w.mapDef ? w.mapDef.name + (pos ? ` [${pos[0]},${pos[1]}]` : '') : '';
  },

  // La mini-carte d'un plateau (l'île d'Ervane) : la vue d'ensemble peinte (IlePeinture.vueEnsemble,
  // une fois par plateau), tournée comme la caméra (le nord-ouest en haut : un point (u, v) tombe en
  // (u - v, u + v)), centrée sur le Veilleur, avec les relais, portes, PNJ et groupes de la sous-zone.
  drawMinimapPlateau(cv, force) {
    const w = this.world, P = w.plateau, p = w.player;
    const sig = ['plateau', w.mapId, Math.round(p.x * 4), Math.round(p.y * 4), w.groups.length].join('|');
    if (!force && sig === this.miniSig) return;
    this.miniSig = sig;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const W = cv.clientWidth, H = cv.clientHeight;
    if (cv.width !== Math.round(W * dpr)) { cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr); }
    const c = cv.getContext('2d');
    c.setTransform(dpr, 0, 0, dpr, 0, 0);
    // Le vide (le ravin de la Source de Braise, l'Échancrure, le large) dans le gris nuage de la carte
    // peinte, pas en noir (revue finale).
    c.fillStyle = '#9ba6ba'; c.fillRect(0, 0, W, H);
    if (!this.miniVue || this.miniVue.id !== P.id) this.miniVue = { id: P.id, toile: IlePeinture.vueEnsemble(P.terrain, 2) };
    const s = W / 56;   // pixels par u : 56 u de large dans la fenêtre
    const iso = (u, v) => ({ x: W / 2 + ((u - p.x) - (v - p.y)) * s / 2, y: H / 2 + ((u - p.x) + (v - p.y)) * s / 4 });
    c.save();
    // La vue d'ensemble (2 px par u) posée par la transformation isométrique.
    const o = iso(0, 0);
    c.transform(s / 4, s / 8, -s / 4, s / 8, o.x, o.y);
    c.imageSmoothingEnabled = true;
    c.drawImage(this.miniVue.toile, 0, 0);
    c.restore();
    const dot = (x, y, color, r) => { const q = iso(x, y); if (q.x < -4 || q.y < -4 || q.x > W + 4 || q.y > H + 4) return; c.beginPath(); c.arc(q.x, q.y, r, 0, Math.PI * 2); c.fillStyle = color; c.fill(); c.lineWidth = 1; c.strokeStyle = 'rgba(0,0,0,0.6)'; c.stroke(); };
    const def = w.mapDef || {};
    if (def.relay) dot(def.relay.u, def.relay.v, '#3fc8e9', 3);
    if (def.porte) dot(def.porte.u, def.porte.v, '#a66cff', 3);
    for (const n of w.npcs) dot(n.x, n.y, '#f2e2c9', 2.4);
    for (const g of w.groups) dot(g.rx != null ? g.rx : g.x, g.ry != null ? g.ry : g.y, '#f07a5c', 2.6);
    dot(p.x, p.y, '#00c2ff', 3.4);
    const pos = typeof Atlas === 'object' && Atlas.coordsOf(w.mapId);
    const label = document.getElementById('minicarte-nom');
    if (label) label.textContent = def.name ? def.name + (pos ? ` [${pos[0]},${pos[1]}]` : '') : '';
  },

  // ----- Journal : combat et événements -----

  openJournal() {
    const actions = { jtab: d => { this.journalTab = d.tab; this.fen.render('journal'); } };
    this.simpleWin('journal', 'Journal', () => {
      const tabs = [['evenements', 'Événements'], ['combat', 'Combat']].map(([k, l]) => `<button class="vy-onglet${this.journalTab === k ? ' on' : ''}" data-act="jtab" data-tab="${k}" aria-pressed="${this.journalTab === k}">${l}</button>`).join('');
      const lines = this.journal[this.journalTab].slice().reverse().map(l => `<div class="vy-journal__ligne ${esc(l.kind)}"><time>${l.h}</time>${esc(l.text)}</div>`).join('') || '<p class="muted vy-note">Rien pour l\'instant.</p>';
      return `<div class="vy-onglets">${tabs}</div><div class="vy-journal" data-defile="journal">${lines}</div>`;
    }, actions, { width: 380 });
  },

  // ----- Thèmes de l'interface -----

  loadTheme() { try { return localStorage.getItem('veylan.theme') || 'nuit'; } catch (e) { return 'nuit'; } },
  applyTheme(t) {
    document.getElementById('app').dataset.uiTheme = t;
    try { localStorage.setItem('veylan.theme', t); } catch (e) { /* rien */ }
  },

  // Le style en verre (css/verre.css) : allumé par défaut, ?hud=ancien rend les cadres de métal.
  // L'opacité des fonds se règle dans les Options, de 40 à 100 %, gardée sur l'appareil.
  loadOpacite() {
    let v = NaN;
    try { v = parseInt(localStorage.getItem('veylan.opacite'), 10); } catch (e) { /* rien */ }
    return Number.isFinite(v) ? Math.max(40, Math.min(100, v)) : Hud.OPACITE;
  },
  appliquerVerre(opacite, garder) {
    const app = document.getElementById('app');
    if (/[?&]hud=ancien\b/.test(location.search)) app.classList.remove('vy-verre');
    const v = Math.max(40, Math.min(100, Math.round(opacite)));
    app.style.setProperty('--v-alpha', String(v / 100));
    this.opacite = v;
    if (garder) { try { localStorage.setItem('veylan.opacite', String(v)); } catch (e) { /* rien */ } }
    return v;
  },
});

Hud.OPACITE = 90;

Hud.THEMES = [['nuit', 'Nuit d\'Orsane', '#172334', '#c9a66b'], ['royal', 'Bleu des Voiles', '#13264a', '#7fb4ff'], ['braise', 'Braise de Kaldum', '#2a1714', '#f07a5c'], ['cimes', 'Vert des Cimes', '#15261c', '#8db585'], ['ardoise', 'Ardoise claire', '#d9d2c3', '#8e7144']];
Hud.MENUS = MENUS;
Hud.STAT = STAT;
Hud.pic = pic;
})();
