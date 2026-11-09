(() => {
const I = Fenetres.ICON;
const PROFIL = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="5" width="18" height="14" rx="2"/><circle cx="9" cy="11" r="2.3"/><path d="M5.8 16c.6-1.7 1.8-2.6 3.2-2.6s2.6.9 3.2 2.6M14 10h4M14 13.5h3"/></svg>';
const esc = s => String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const STAT = {
  vita: { court: 'Vit', couleur: 'var(--vy-braise-clair)', element: null, svg: '<path d="M12 20s-7-4.5-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.5-7 10-7 10z"/>' },
  sagesse: { court: 'Sag', couleur: 'var(--vy-eclat-clair)', element: null, svg: '<path d="M2 12s4-6 10-6 10 6 10 6-4 6-10 6S2 12 2 12z"/><circle cx="12" cy="12" r="2.5"/>' },
  force: { court: 'Ter', couleur: '#6dbb4f', element: 'terre', svg: '<path d="M3 19l6-10 4 6 3-4 5 8z"/>' },
  intel: { court: 'Ign', couleur: '#ff5a36', element: 'feu', svg: '<path d="M12 3c1 4 5 5 5 10a5 5 0 0 1-10 0c0-3 2-4 2-6 1 1 2 2 3 2 0-2 0-4 0-6z"/>' },
  chance: { court: 'Aqu', couleur: '#22b8cf', element: 'eau', svg: '<path d="M12 3c3 5 6 8 6 11a6 6 0 0 1-12 0c0-3 3-6 6-11z"/>' },
  agi: { court: 'Aer', couleur: '#dde4ec', element: 'air', svg: '<path d="M3 9h11a3 3 0 1 0-3-3M3 13h15a3 3 0 1 1-3 3M3 17h7"/>' },
};
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
  puissance: { couleur: '#ffd35a', svg: '<path d="M13.5 3 6 13.5h5.5L10 21l8-11h-5.5z"/>' },
  pods: { couleur: '#c7cbd8', svg: '<path d="M7 9h10l1.5 10.5h-13z"/><path d="M9.5 9V7.5a2.5 2.5 0 0 1 5 0V9"/>' },
};
const pic = (k, size) => { const p = STAT[k] || VAL[k]; return p ? `<svg class="vy-pic" style="--c:${p.couleur}" viewBox="0 0 24 24" width="${size || 16}" height="${size || 16}" fill="none" stroke="${p.couleur}" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${p.svg}</svg>` : '<span class="vy-pic"></span>'; };

const MENUS = [
  ['carac', 'Caractéristiques', 'C', I.carac],
  ['sorts', 'Sorts', 'T', I.sorts],
  ['perso', 'Personnage', 'P', I.perso],
  ['sac', 'Inventaire', 'I', I.sac],
  ['quetes', 'Quêtes', 'H', I.quetes],
  ['faction', 'Faction', 'F', I.faction],
  ['guilde', 'Guilde', 'N', I.guilde],
  ['succes', 'Succès', 'U', I.succes],
  ['carnet', 'Bestiaire', 'B', I.carnet],
  ['encyclopedie', 'Encyclopédie', '', I.carnet],
  ['garderobe', 'Garde-robe', 'G', I.garderobe],
  ['boutique', 'Boutique des Voiles', 'Y', I.boutique],
  ['familiers', 'Familiers', 'K', I.familiers],
  ['montures', 'Montures', 'L', I.montures],
  ['metiers', 'Métiers', '', I.metiers || I.sac],
  ['carte', 'Carte du monde', 'M', I.carte],
  ['journal', 'Journal', 'J', I.journal],
  ['aventure', 'Aventure / Guide', '?', I.carnet],
  ['profil', 'Profil', 'A', PROFIL],
  ['options', 'Options', 'O', I.options],
];
const ALIAS = { perso: 'sac' };
const GRILLE = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="4" y="4" width="6" height="6" rx="1.2"/><rect x="14" y="4" width="6" height="6" rx="1.2"/><rect x="4" y="14" width="6" height="6" rx="1.2"/><rect x="14" y="14" width="6" height="6" rx="1.2"/></svg>';
const EPINGLE = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M9 4h6l-1 5 3 3H7l3-3z"/><path d="M12 12v8"/></svg>';

Object.assign(Hud.prototype, {
  initFenetres() {
    this.fen = new Fenetres(document.getElementById('fenetres'));
    const LIVRE = ['carac', 'sac', 'sorts', 'quetes', 'succes', 'familiers', 'montures', 'faction', 'carnet'];
    const NOMS = { carac: 'Personnage', sac: 'Sac', carnet: 'Bestiaire' };
    this.livreDuVeilleur = {
      ids: LIVRE,
      separer: ['familiers'],
      onglets: LIVRE.map(id => { const m = MENUS.find(x => x[0] === id); return [id, NOMS[id] || m[1], m[2], m[3]]; }),
      ouvrir: id => this.toggleWin(id),
      point: id => { const ch = this.world && this.world.ch; return !!ch && ((id === 'carac' && ch.statPoints > 0) || (id === 'sorts' && ch.spellPoints > 0)); },
    };
    window.addEventListener('veylan:ile-oubliee', () => { this.miniVue = null; });
    this.journal = { combat: [], evenements: [] };
    this.journalTab = 'evenements';
    const bar = document.getElementById('menus');
    bar.innerHTML = MENUS.map(([id, label, key, icon]) => `<button class="vy-menu" data-win="${id}" aria-label="${label}${key ? ` (${key})` : ''}">${icon}${key ? `<kbd>${key}</kbd>` : ''}<span class="vy-menu__bulle" aria-hidden="true">${label}<kbd>${key}</kbd></span></button>`).join('') +
      `<button class="vy-menu vy-menu--grille" data-grille aria-label="Tous les menus" aria-expanded="false">${GRILLE}<span class="vy-menu__bulle" aria-hidden="true">Tous les menus</span></button>`;
    bar.addEventListener('click', evt => {
      if (evt.target.closest('[data-grille]')) { this.basculerGrilleMenus(); return; }
      const b = evt.target.closest('[data-win]'); if (b) this.toggleWin(b.dataset.win);
    });
    this.appliquerEpingles();
    window.addEventListener('keydown', evt => {
      const t = evt.target;
      if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.tagName === 'SELECT')) return;
      if (evt.ctrlKey || evt.metaKey || evt.altKey) return;
      if (!this.el.panel.classList.contains('hidden')) return;
      if (this.vue3d || document.querySelector('#app > .vy-b3d')) { if (evt.key === 'Escape') { evt.preventDefault(); evt.stopImmediatePropagation(); this.fermerBete3D(); } return; }
      if (evt.key === 'Escape' && this.fen.closeTop()) { evt.preventDefault(); evt.stopImmediatePropagation(); this.syncMenus(); return; }
      if (evt.shiftKey && evt.key.toLowerCase() === 'a' && document.getElementById('title').classList.contains('hidden')) { evt.preventDefault(); this.toggleWin('aventure'); return; }
      const m = MENUS.find(x => x[2] && x[2].toLowerCase() === evt.key.toLowerCase());
      if (m && document.getElementById('title').classList.contains('hidden')) { evt.preventDefault(); this.toggleWin(m[0]); }
    }, true);
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
    this.applyTheme(this.themeDuPersonnage() || this.loadTheme());
    this.appliquerVerre(this.loadOpacite());
    this.appliquerTaille(this.loadTaille());
    this.initInventaire();
    this.initRecompenses();
    if (this.initInterface) this.initInterface();
    if (this.initNotifs) this.initNotifs();
  },

  signal(nom, detail) {
    try { window.dispatchEvent(new CustomEvent('veylan:' + nom, { detail })); } catch (e) {   }
  },
  chat(type, text) { this.signal('chat', { type, text }); },

  epinglesMenus() {
    if (!this._epingles) {
      let l = null;
      try { l = JSON.parse(localStorage.getItem('veylan.menus.caches') || 'null'); } catch (e) {   }
      this._epingles = new Set(Array.isArray(l) ? l.filter(id => MENUS.some(m => m[0] === id)) : []);
    }
    return this._epingles;
  },
  appliquerEpingles() {
    const caches = this.epinglesMenus();
    for (const b of document.querySelectorAll('#menus [data-win]')) b.classList.toggle('vy-menu--ote', caches.has(b.dataset.win));
  },
  basculerGrilleMenus(on) {
    const bar = document.getElementById('menus'), bouton = bar.querySelector('[data-grille]');
    let g = document.querySelector('.vy-menus-grille');
    const ouvrir = on == null ? !g : on;
    if (!ouvrir) { if (g) g.remove(); if (bouton) { bouton.classList.remove('on'); bouton.setAttribute('aria-expanded', 'false'); } return; }
    if (!g) {
      g = document.createElement('div');
      g.className = 'vy-menus-grille';
      g.setAttribute('role', 'dialog');
      g.setAttribute('aria-label', 'Tous les menus');
      g.addEventListener('click', evt => {
        const ep = evt.target.closest('[data-epingle]');
        if (ep) {
          const id = ep.dataset.epingle, c = this.epinglesMenus();
          if (c.has(id)) c.delete(id); else c.add(id);
          try { localStorage.setItem('veylan.menus.caches', JSON.stringify([...c])); } catch (e) {   }
          this.appliquerEpingles(); this.remplirGrilleMenus(g);
          return;
        }
        const t = evt.target.closest('[data-ouvre]');
        if (t) { this.basculerGrilleMenus(false); this.toggleWin(t.dataset.ouvre); }
      });
      document.getElementById('app').appendChild(g);
      const dehors = evt => { if (!g.isConnected) { removeEventListener('pointerdown', dehors, true); return; } if (!g.contains(evt.target) && !evt.target.closest('[data-grille]')) this.basculerGrilleMenus(false); };
      addEventListener('pointerdown', dehors, true);
      const echap = evt => { if (!g.isConnected) { removeEventListener('keydown', echap, true); return; } if (evt.key === 'Escape') { evt.stopImmediatePropagation(); this.basculerGrilleMenus(false); } };
      addEventListener('keydown', echap, true);
    }
    this.remplirGrilleMenus(g);
    const r = bar.getBoundingClientRect(), app = document.getElementById('app').getBoundingClientRect();
    g.style.top = `${Math.round(r.bottom - app.top + 6)}px`;
    g.style.right = `${Math.max(6, Math.round(app.right - r.right))}px`;
    if (bouton) { bouton.classList.add('on'); bouton.setAttribute('aria-expanded', 'true'); }
  },
  remplirGrilleMenus(g) {
    const c = this.epinglesMenus();
    g.innerHTML = `<header class="vy-menus-grille__tete"><b>Tous les menus</b><small>L'épingle garde un menu dans la barre</small></header><div class="vy-menus-grille__tuiles">` +
      MENUS.map(([id, label, key, icon]) => { const pin = !c.has(id);
        return `<div class="vy-menus-grille__tuile${this.fen.isOpen(ALIAS[id] || id) ? ' on' : ''}"><button type="button" class="vy-menus-grille__ouvrir" data-ouvre="${id}">${icon}<span>${label}</span>${key ? `<kbd>${key}</kbd>` : ''}</button>` +
          `<button type="button" class="vy-menus-grille__epingle${pin ? ' on' : ''}" data-epingle="${id}" aria-pressed="${pin}" title="${pin ? 'Ôter de la barre' : 'Garder dans la barre'}" aria-label="${pin ? 'Ôter' : 'Garder'} ${label} ${pin ? 'de' : 'dans'} la barre">${EPINGLE}</button></div>`; }).join('') + '</div>';
  },

  syncMenus() {
    for (const b of document.querySelectorAll('#menus [data-win]')) b.classList.toggle('on', this.fen.isOpen(ALIAS[b.dataset.win] || b.dataset.win));
  },

  toggleWin(id) {
    if (this.fen.isOpen(ALIAS[id] || id)) this.fen.close(ALIAS[id] || id);
    else ({ aventure: () => this.openAventure(), carac: () => this.openCaracs(), sorts: () => this.openSorts(), perso: () => this.openPerso(), sac: () => this.openSac(), quetes: () => this.openQuests(), faction: () => this.openFaction(), guilde: () => this.openGuilde(), succes: () => this.openAchievements(), boutique: () => this.openBoutique(), carnet: () => this.openCarnet(), encyclopedie: () => this.openEncyclopedie(), garderobe: () => this.openGarderobe(), familiers: () => this.openFamiliers(), montures: () => this.openMontures(), metiers: () => this.openMetiersPerso(), carte: () => this.openMap(), journal: () => this.openJournal(), options: () => this.openMenu(), profil: () => this.openProfil() }[id] || (() => {}))();
    this.syncMenus();
  },

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


  refreshVital() {
    const ch = this.world.ch;
    if (!ch) return;
    const d = ch.derived();
    const v = document.getElementById('vital');
    const da = !!document.querySelector('#app.vy-da'), montrerXp = !this.ihud || this.ihud.xp !== false;
    const style = this.styleVital(), avecXp = montrerXp && !da, cle = style + (avecXp ? '+xp' : '');
    if (v.dataset.style !== cle || !v.firstElementChild) {
      v.dataset.style = cle;
      v.innerHTML = Gemmes.bloc(style, avecXp);
    }
    const xp = ch.xpProgress(), max = ch.level >= Character.MAX_LEVEL;
    if (v.dataset.niveau !== String(ch.level)) v.dataset.niveau = ch.level;
    Gemmes.maj(v.firstElementChild, {
      hp: ch.hp, hpMax: d.hpMax, pa: d.pa, paMax: d.pa, pm: d.pm, pmMax: d.pm, xp,
      xpTexte: max ? 'max' : '', xpTitre: max ? `Niveau ${ch.level}, le plus haut` : `Niveau ${ch.level} : ${ch.xp} / ${Character.xpToNext(ch.level)} XP`,
    });
    this.barreXp(da && montrerXp, xp, max, ch);
    const conso = Object.keys(ch.inventory).map(id => Items.get(id)).filter(x => x && x.kind === 'consumable').sort((a, b) => (a.heal || 0) - (b.heal || 0)).slice(0, 6);
    const cells = conso.map(x => `<button class="vy-case" data-rarete="${Items.rarity(x)}" data-use="${x.id}" title="${esc(x.name)} : utiliser" aria-label="Utiliser ${esc(x.name)}"><span class="vy-case__icone">${Hud.picto(x)}</span><span class="vy-case__nombre">${ch.count(x.id)}</span></button>`);
    while (cells.length < 6) cells.push('<span class="vy-case vy-case--vide" aria-hidden="true"></span>');
    const r = document.getElementById('raccourcis');
    const html = cells.join('');
    if (r.dataset.html !== html) { r.dataset.html = html; r.innerHTML = html; }
  },

  barreXp(on, xp, max, ch) {
    const bc = document.getElementById('bas-centre');
    if (!bc) return;
    let b = bc.querySelector('.vy-xp-barre');
    if (!on) { if (b) b.remove(); return; }
    if (!b) {
      b = document.createElement('div');
      b.className = 'vy-xp-barre';
      b.setAttribute('role', 'progressbar');
      b.setAttribute('aria-valuemin', '0');
      b.setAttribute('aria-valuemax', '100');
      b.innerHTML = '<i></i><span></span>';
      bc.appendChild(b);
    }
    const pc = max ? 100 : Math.floor(Math.max(0, Math.min(1, xp)) * 100);
    const titre = max ? `Niveau ${ch.level}, le plus haut` : `Niveau ${ch.level} · ${ch.xp.toLocaleString('fr-FR')} / ${Character.xpToNext(ch.level).toLocaleString('fr-FR')} XP (${pc} %)`;
    if (b.dataset.t === titre) return;
    b.dataset.t = titre;
    b.title = titre;
    b.setAttribute('aria-label', 'Expérience');
    b.setAttribute('aria-valuenow', String(pc));
    b.firstElementChild.style.width = (max ? 100 : Math.max(0, Math.min(1, xp)) * 100) + '%';
    b.lastElementChild.textContent = max ? 'Niveau maximum' : `${pc} %`;
  },


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
    for (const dir in (m.exits || {})) for (const e of m.exits[dir] || []) dot(e.x, e.y, '#f3bc72', 1.6);
    if (w.relay) dot(w.relay.x, w.relay.y, '#52d2f4', 3);
    if (w.door) dot(w.door.x, w.door.y, '#9764d6', 3);
    for (const npc of w.npcs) dot(npc.x, npc.y, '#f7f0de', 2.4);
    for (const g of w.groups) dot(g.x, g.y, '#ef7574', 2.6);
    dot(Math.round(p.rx != null ? p.rx : p.x), Math.round(p.ry != null ? p.ry : p.y), '#209fec', 3.4);
    if (this.drawVoisins) this.drawVoisins(c, W);
    const pos = !w.mapId.includes('#') && typeof Atlas === 'object' && Atlas.coordsOf(w.mapId);
    const label = document.getElementById('minicarte-nom');
    if (label) label.textContent = w.mapDef ? (w.mapDef.sousZone || w.mapDef.name) + (pos ? ` [${pos[0]},${pos[1]}]` : '') : '';
  },

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
    c.fillStyle = '#9ba6ba'; c.fillRect(0, 0, W, H);
    if (!this.miniVue || this.miniVue.id !== P.id) this.miniVue = { id: P.id, toile: IlePeinture.vueEnsemble(P.terrain, 2) };
    const s = W / 56;
    const iso = (u, v) => ({ x: W / 2 + ((u - p.x) - (v - p.y)) * s / 2, y: H / 2 + ((u - p.x) + (v - p.y)) * s / 4 });
    c.save();
    const o = iso(0, 0);
    c.transform(s / 4, s / 8, -s / 4, s / 8, o.x, o.y);
    c.imageSmoothingEnabled = true;
    c.drawImage(this.miniVue.toile, 0, 0);
    c.restore();
    const dot = (x, y, color, r) => { const q = iso(x, y); if (q.x < -4 || q.y < -4 || q.x > W + 4 || q.y > H + 4) return; c.beginPath(); c.arc(q.x, q.y, r, 0, Math.PI * 2); c.fillStyle = color; c.fill(); c.lineWidth = 1; c.strokeStyle = 'rgba(0,0,0,0.6)'; c.stroke(); };
    const def = w.mapDef || {};
    if (def.relay) dot(def.relay.u, def.relay.v, '#52d2f4', 3);
    if (def.porte) dot(def.porte.u, def.porte.v, '#9764d6', 3);
    for (const n of w.npcs) dot(n.x, n.y, '#f7f0de', 2.4);
    for (const g of w.groups) dot(g.rx != null ? g.rx : g.x, g.ry != null ? g.ry : g.y, '#ef7574', 2.6);
    this.monumentsMini(c, W, H, iso);
    dot(p.x, p.y, '#209fec', 3.4);
    const pos = typeof Atlas === 'object' && Atlas.coordsOf(w.mapId);
    const label = document.getElementById('minicarte-nom');
    if (label) label.textContent = def.name ? def.name + (pos ? ` [${pos[0]},${pos[1]}]` : '') : '';
  },

  monumentsMini(c, W, H, iso) {
    const P = this.world.plateau, p = this.world.player;
    if (!P || typeof Hud.monuments !== 'function' || typeof CartePeinture !== 'object') return;
    const cx = W / 2, cy = H / 2, m = 8;
    for (const r of Hud.monuments(P.id)) {
      const d = Math.hypot(r.u - p.x, r.v - p.y);
      if (d > 320) continue;
      const q = iso(r.u, r.v), dedans = q.x > m && q.x < W - m && q.y > m && q.y < H - m;
      let x = q.x, y = q.y, k = 1;
      if (!dedans) {
        const dx = q.x - cx, dy = q.y - cy, t = Math.min((W / 2 - m) / Math.max(1e-6, Math.abs(dx)), (H / 2 - m) / Math.max(1e-6, Math.abs(dy)));
        x = cx + dx * t; y = cy + dy * t; k = 0.78;
        const a = Math.atan2(dy, dx), L = 5.5;
        c.save(); c.translate(x + Math.cos(a) * 7 * k, y + Math.sin(a) * 7 * k); c.rotate(a);
        c.fillStyle = '#ffcf5a'; c.strokeStyle = 'rgba(20,24,40,0.7)'; c.lineWidth = 1;
        c.beginPath(); c.moveTo(L, 0); c.lineTo(0, -L * 0.6); c.lineTo(0, L * 0.6); c.closePath(); c.fill(); c.stroke();
        c.restore();
      }
      const art = CartePeinture.pastille('monument', Math.round(18 * k * Math.min(2, window.devicePixelRatio || 1)));
      if (!art) continue;
      const e = 18 * k / (art.r * 2);
      c.globalAlpha = dedans ? 1 : 0.9;
      c.drawImage(art.canvas, x - art.ax * e, y - art.ay * e, art.canvas.width * e, art.canvas.height * e);
      c.globalAlpha = 1;
    }
  },


  openJournal() {
    const actions = { jtab: d => { this.journalTab = d.tab; this.fen.render('journal'); } };
    this.simpleWin('journal', 'Journal', () => {
      const tabs = [['evenements', 'Événements'], ['combat', 'Combat']].map(([k, l]) => `<button class="vy-onglet${this.journalTab === k ? ' on' : ''}" data-act="jtab" data-tab="${k}" aria-pressed="${this.journalTab === k}">${l}</button>`).join('');
      const lines = this.journal[this.journalTab].slice().reverse().map(l => `<div class="vy-journal__ligne ${esc(l.kind)}"><time>${l.h}</time>${esc(l.text)}</div>`).join('') || '<p class="muted vy-note">Rien pour l\'instant.</p>';
      return `<div class="vy-onglets">${tabs}</div><div class="vy-journal" data-defile="journal">${lines}</div>`;
    }, actions, { width: 380 });
  },


  loadTheme() {
    try {
      let t = localStorage.getItem('veylan.theme');
      if (!localStorage.getItem('veylan.theme.charte')) { localStorage.setItem('veylan.theme.charte', '1'); if (!t || t === 'duality') t = Hud.THEME_DEFAUT; }
      return t || Hud.THEME_DEFAUT;
    } catch (e) { return Hud.THEME_DEFAUT; }
  },
  themeDuPersonnage() {
    const ch = this.world && this.world.ch;
    if (typeof Garderobe === 'undefined' || !ch || !ch.porte || !ch.porte.theme) return null;
    const c = Garderobe.get(ch.porte.theme);
    return c && c.type === 'theme' && Garderobe.possede(c.id) && c.data && Array.isArray(c.data.theme) ? c.data.theme[0] : null;
  },
  choisirTheme(t) {
    const ch = this.world && this.world.ch;
    const c = typeof Garderobe !== 'undefined' ? Garderobe.themeDe(t) : null;
    if (c && !Garderobe.possede(c.id)) { this.toast(`Pas encore dans ta Garde-robe. ${Garderobe.texteSource(c)}.`); return false; }
    this.applyTheme(t);
    if (ch && typeof Garderobe !== 'undefined') { if (!ch.porte) ch.porte = Garderobe.porteDefaut(); ch.porte.theme = c ? c.id : null; this.world.emit('save'); }
    return true;
  },
  applyTheme(t) {
    const app = document.getElementById('app');
    app.dataset.uiTheme = t;
    const def = (Hud.themesDisponibles ? Hud.themesDisponibles() : Hud.THEMES || []).find(x => x[0] === t);
    if (def) { app.style.setProperty('--theme-fond', def[2]); app.style.setProperty('--theme-accent', def[3]); }
    if (t === 'duality' && document.fonts && document.fonts.load) {
      for (const f of ['400 12px Poppins', '500 12px Poppins', '600 12px Poppins', '700 12px Poppins', '600 12px Rajdhani', '700 12px Rajdhani', '500 12px "JetBrains Mono"', '700 12px "JetBrains Mono"']) document.fonts.load(f).catch(() => {});
    }
    try { localStorage.setItem('veylan.theme', t); } catch (e) {   }
  },

  loadOpacite() {
    let v = NaN;
    try { v = parseInt(localStorage.getItem('veylan.opacite'), 10); } catch (e) {   }
    return Number.isFinite(v) ? Math.max(40, Math.min(100, v)) : Hud.OPACITE;
  },
  appliquerVerre(opacite, garder) {
    const app = document.getElementById('app');
    if (/[?&]hud=ancien\b/.test(location.search)) app.classList.remove('vy-verre');
    const v = Math.max(40, Math.min(100, Math.round(opacite)));
    app.style.setProperty('--v-alpha', String(v / 100));
    this.opacite = v;
    if (garder) { try { localStorage.setItem('veylan.opacite', String(v)); } catch (e) {   } }
    return v;
  },

  loadTaille() {
    let v = NaN;
    try { v = parseInt(localStorage.getItem('veylan.taille'), 10); } catch (e) {   }
    return Number.isFinite(v) ? Math.max(80, Math.min(130, v)) : 100;
  },
  styleVital() {
    if (!this.vital) {
      let v = null;
      try { v = localStorage.getItem('veylan.vital'); } catch (e) {   }
      this.vital = Gemmes.styleSur(v);
    }
    return this.vital;
  },
  choisirVital(style) {
    this.vital = Gemmes.styleSur(style);
    try { localStorage.setItem('veylan.vital', this.vital); } catch (e) {   }
    this.refreshVital();
    if (this.jeu) this.jeu.majStyleVital();
    return this.vital;
  },
  appliquerTaille(taille, garder) {
    const v = Math.max(80, Math.min(130, Math.round(taille)));
    const app = document.getElementById('app');
    if (v === 100) app.style.removeProperty('--ui-z'); else app.style.setProperty('--ui-z', String(v / 100));
    const change = this.taille != null && this.taille !== v;
    this.taille = v;
    if (garder) { try { localStorage.setItem('veylan.taille', String(v)); } catch (e) {   } }
    if (change) { try { window.dispatchEvent(new Event('resize')); } catch (e) {   } }
    return v;
  },
});

Hud.OPACITE = 90;

Hud.THEME_DEFAUT = 'nuit';
Hud.THEMES = [['nuit', 'Veylan', '#19233c', '#ddaa72'], ['royal', 'Bleu des Cimes', '#13264a', '#7fb4ff'], ['braise', 'Braise de Kaldum', '#2a1714', '#ef7574'], ['cimes', 'Vert des Cimes', '#15261c', '#80d697'], ['ardoise', 'Ardoise claire', '#d9d2c3', '#a67349'], ['duality', 'Duality', '#121019', '#ff8a3d']];
Hud.MENUS = MENUS;
Hud.themesDisponibles = () => Hud.THEMES.concat(typeof Garderobe !== 'undefined' ? Garderobe.themes() : []);
Hud.STAT = STAT;
Hud.pic = pic;
})();

