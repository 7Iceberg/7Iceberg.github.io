// Carte du monde (touche M), à la manière de Dofus : chaque carte à sa coordonnée [x, y]
// (js/atlas.js), peinte d'après son plan (js/carte-peinture.js), une grille claire par-dessus,
// la brume sur ce qui n'est pas exploré, les noms des zones en grand, des pastilles rondes (relais,
// donjon, artisan, marchand, quêtes), une épingle bleue pour soi, des vertes pour les quêtes
// suivies et un drapeau à soi (appui long ou clic droit). Glisser, zoomer, toucher une case pour
// sa fiche ; bulles au survol (ordinateur) ou au toucher (téléphone).
// « 3D » ouvre la vue en relief (js/carte-3d.js, Three.js chargé à la demande) ; sans WebGL, un
// relief peint en canvas la remplace. L'onglet « Monde » montre le continent à l'échelle des
// régions, celles à venir en îles fermées. Se charge après js/hud-fenetres.js et complète Hud.
(() => {
const I = Fenetres.ICON;
const esc = s => Util.esc(s);

// Roche, encre et lanterne de chaque région (docs/DIRECTION-ARTISTIQUE.md). « Sous le premier
// Voile » prend une obsidienne plus profonde et le violet des Voiles.
const REGION = {
  orsane: { roche: '#e8e1d3', sombre: '#9fa7b8', encre: '#3b4260', lanterne: '#f2b134' },
  kaldum: { roche: '#7a6a5e', sombre: '#3e3230', encre: '#241a18', lanterne: '#ff6a2b' },
  thessa: { roche: '#b9c7b4', sombre: '#5f7a74', encre: '#22403d', lanterne: '#35d6c8' },
  lisiere: { roche: '#b5aeb4', sombre: '#5c5466', encre: '#2a2432', lanterne: '#d08cff' },
  basvoiles: { roche: '#4a3b5c', sombre: '#1e1830', encre: '#0e0a16', lanterne: '#c0266e' },
  voile: { roche: '#3a3550', sombre: '#16121f', encre: '#0b0812', lanterne: '#a66cff' },
};
const BASE = 100;                // côté d'une case au zoom 1, en pixels
const ZOOM = { cartes: [0.22, 2.6], monde: [0.7, 3] };
// Routes du continent (les régions à venir en pointillé).
const ROUTES = [['orsane', 'kaldum'], ['orsane', 'thessa'], ['orsane', 'lisiere'], ['kaldum', 'lisiere'], ['thessa', 'lisiere'], ['lisiere', 'basvoiles'], ['kaldum', 'basvoiles'], ['lisiere', 'voile'], ['basvoiles', 'voile']];
const ATELIERS = { tailleur: 'tailleur', cordonnier: 'cordonnier', bijoutier: 'bijoutier', forgeron: 'forgeron', alchimiste: 'alchimiste' };
const DRAPEAU = 'veylan.carte.drapeau';
// Ordre des pastilles quand elles se recouvrent : la quête d'abord.
const PRIO = { rendre: 6, offre: 5, relais: 4, donjon: 3, artisan: 2, marchand: 1 };

const hex = c => { const m = /^#?([0-9a-f]{6})$/i.exec(String(c || '').trim()); const n = m ? parseInt(m[1], 16) : 0x808080; return [n >> 16, (n >> 8) & 255, n & 255]; };
const mix = (a, b, t) => { const A = hex(a), B = hex(b); return '#' + A.map((v, i) => Math.round(v + (B[i] - v) * t).toString(16).padStart(2, '0')).join(''); };
const rgba = (c, a) => { const [r, g, b] = hex(c); return `rgba(${r},${g},${b},${a})`; };
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const hash = s => { let h = 2166136261; for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619); return (h >>> 0) / 4294967296; };
const region = z => REGION[z && z.region] || REGION.orsane;
const levels = l => l ? (l[0] === l[1] ? `niv. ${l[0]}` : `niv. ${l[0]} à ${l[1]}`) : '';
const niveau = l => l ? (l[0] === l[1] ? `Niveau ${l[0]}` : `Niveau ${l[0]} à ${l[1]}`) : '';
const coord = p => `${p[0]},${p[1]}`;
const inPoly = (p, poly) => { let ins = false; for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) { const [xi, yi] = poly[i], [xj, yj] = poly[j]; if ((yi > p[1]) !== (yj > p[1]) && p[0] < (xj - xi) * (p[1] - yi) / (yj - yi) + xi) ins = !ins; } return ins; };
const poly = (g, pts) => { g.beginPath(); g.moveTo(pts[0][0], pts[0][1]); for (let i = 1; i < pts.length; i++) g.lineTo(pts[i][0], pts[i][1]); g.closePath(); };
const round = (g, x, y, w, h, r) => { g.beginPath(); if (g.roundRect) g.roundRect(x, y, w, h, r); else g.rect(x, y, w, h); };
const hauteur = zone => CartePeinture.hauteur(zone);
// La hauteur d'un bloc du relief peint : celle de sa zone, un peu variée d'une carte à l'autre.
const hauteurCase = id => { const e = id && Atlas.index().map.get(id); return e ? hauteur(e.zone) + hash(id) * 0.6 : 0; };

Object.assign(Hud.prototype, {
  // ----- Fenêtre -----

  openMap() {
    const opening = !this.fen.isOpen('carte');
    const c = this.carte = this.carte || { tab: 'cartes', vue3d: false, rot: 0, sel: null, selCase: null, region: null, vues: {}, survol: null, bulle: null };
    if (c.drapeau === undefined) c.drapeau = this.lireDrapeau();
    if (opening) {
      c.sel = null; c.selCase = null; c.region = null; c.bulle = null;
      if (c.vues.cartes) Object.assign(c.vues.cartes, this.carteIci());
      if (!this.carteVisibilite) {
        // Onglet du navigateur caché : la vue 3D rend sa mémoire, et revient au retour.
        this.carteVisibilite = () => {
          if (document.hidden) { if (this.carte3d) this.fermer3D(); }
          else if (this.fen.isOpen('carte') && this.carte.vue3d && this.carte.tab === 'cartes' && !this.carte.repli3d) this.ouvrir3D();
        };
        document.addEventListener('visibilitychange', this.carteVisibilite);
      }
      if (c.vue3d && c.tab === 'cartes' && !c.repli3d) this.ouvrir3D();
    }
    const actions = {
      ctab: d => {
        c.tab = d.tab; c.survol = null; c.bulle = null; this.cacherBulle();
        if (c.tab !== 'cartes') this.fermer3D(); else if (c.vue3d && !c.repli3d) this.ouvrir3D();
        this.fen.render('carte');
      },
      vue3d: () => {
        c.vue3d = !c.vue3d; c.bulle = null; this.cacherBulle();
        if (c.vue3d) { c.repli3d = false; this.ouvrir3D(); } else this.fermer3D();
        this.fen.render('carte');
      },
      tourner: d => {
        if (this.carte3d) this.carte3d.tourner(Number(d.sens));
        else { c.rot = (((c.rot || 0) + Number(d.sens)) % 4 + 4) % 4; c.bulle = null; this.drawCarte(); }
      },
      zoom: d => { if (this.carte3d && c.tab === 'cartes') this.carte3d.zoom(Number(d.f)); else this.zoomCarte(Number(d.f)); },
      centrer: () => {
        if (this.carte3d && c.tab === 'cartes') { this.carte3d.centrer(); return; }
        if (c.tab === 'monde') Object.assign(this.vueCarte(), { z: 1, cx: 46, cy: 40 });
        else { Object.assign(this.vueCarte(), this.carteIci()); c.sel = null; c.selCase = null; c.bulle = null; }
        this.fen.render('carte');
      },
      region: d => { c.region = d.id; this.fen.render('carte'); },
      voirRegion: d => {
        const pts = [...Atlas.get().coords].filter(([id]) => (Atlas.index().map.get(id).zone.region === d.id)).map(([, p]) => p);
        if (!pts.length) return;
        c.tab = 'cartes';
        Object.assign(this.vueCarte(), { z: 0.7, cx: pts.reduce((s, p) => s + p[0], 0) / pts.length, cy: pts.reduce((s, p) => s + p[1], 0) / pts.length });
        if (c.vue3d && !c.repli3d) this.ouvrir3D();
        this.fen.render('carte');
      },
      voyager: d => {
        // Les règles du relais restent celles du monde (World.canTeleport).
        if (!this.world.canTeleport(d.id)) { this.toast('Il faut être à un Relais du Fil pour voyager.'); return; }
        c.depuisRelais = false;
        this.fen.close('carte');
        this.world.teleport(d.id);
      },
      drapeau: () => this.poserDrapeau(null),
    };
    this.simpleWin('carte', 'Carte du monde', () => this.renderCarte(), actions, {
      width: 860, cls: 'vy-fenetre--carte',
      after: body => this.monterCarte(body),
      onClose: () => this.fermerCarte(),
    });
  },

  // Depuis le panneau d'un Relais du Fil : le panneau se ferme sans clore le relais, et la carte
  // offre « Voyager » vers les relais connus. Fermer la carte clôt le relais.
  openMapFromRelay() {
    this.el.panel.classList.add('hidden');
    this.el.panel.dataset.open = '';
    this.panelRefresh = null;
    this.setInert(false);
    this.openMap();
    this.carte.depuisRelais = true;
    this.carte.tab = 'cartes';
    this.fen.render('carte');
  },

  fermerCarte() {
    this.syncMenus();
    const c = this.carte;
    if (!c) return;
    c.survol = null; c.bulle = null;
    this.fermer3D();
    if (c.depuisRelais) { c.depuisRelais = false; if (this.world.relayOpen && this.world.state === 'panel') this.world.closePanel(); }
  },

  renderCarte() {
    const c = this.carte;
    const tabs = [['cartes', 'Cartes'], ['monde', 'Monde']].map(([k, l]) => `<button class="vy-onglet${c.tab === k ? ' on' : ''}" data-act="ctab" data-tab="${k}" role="tab" aria-selected="${c.tab === k}">${l}</button>`).join('');
    const cartes = c.tab === 'cartes';
    const outils = (cartes ? `<button class="vy-bouton vy-bouton--petit vy-carte__relief" data-act="vue3d" aria-pressed="${!!c.vue3d}" title="Voir en 3D" aria-label="Voir en 3D">${I.relief}<span>3D</span></button>` : '') +
      (cartes && c.vue3d ? `<button class="vy-bouton vy-bouton--petit vy-bouton--icone" data-act="tourner" data-sens="-1" aria-label="Tourner à gauche" title="Tourner à gauche">${I.tourneG}</button><button class="vy-bouton vy-bouton--petit vy-bouton--icone" data-act="tourner" data-sens="1" aria-label="Tourner à droite" title="Tourner à droite">${I.tourneD}</button>` : '') +
      `<button class="vy-bouton vy-bouton--petit vy-bouton--icone" data-act="zoom" data-f="0.8" aria-label="Dézoomer" title="Dézoomer">${I.moins}</button>` +
      `<button class="vy-bouton vy-bouton--petit vy-bouton--icone" data-act="zoom" data-f="1.25" aria-label="Zoomer" title="Zoomer">${I.plus}</button>` +
      `<button class="vy-bouton vy-bouton--petit vy-bouton--icone" data-act="centrer" aria-label="Centrer sur moi" title="Centrer sur moi">${I.cible}</button>`;
    return `<div class="vy-carte">
      <div class="vy-carte__barre"><div class="vy-onglets vy-carte__onglets" role="tablist">${tabs}</div><div class="vy-carte__outils">${outils}</div></div>
      <div class="vy-carte__corps"><div class="vy-carte__vue" data-carte-vue></div>
        <aside class="vy-carte__fiche" data-defile="carte-fiche">${c.tab === 'monde' ? this.ficheRegion() : this.ficheCarte()}</aside></div>
    </div>`;
  },

  // ----- Fiches -----

  ficheCarte() {
    const c = this.carte, w = this.world, ch = w.ch;
    const A = Atlas.get();
    const seen = new Set(ch.counters.maps);
    const here = Atlas.hereOf(w.mapId);
    const vus = [...A.coords.keys()].filter(id => seen.has(id)).length;
    const compte = `<p class="vy-carte__compte"><b>${vus}</b> / ${A.coords.size} cartes explorées</p>`;
    const leg = [['toi', 'Toi'], ['quete', 'Quête suivie'], ['drapeau', 'Ton drapeau'], ['relais', 'Relais du Fil'], ['donjon', 'Donjon'], ['artisan', 'Atelier', 'forgeron'], ['marchand', 'Marchand'], ['offre', 'Quête à prendre'], ['rendre', 'Quête à rendre']];
    const legende = `<div class="vy-carte__legende">${leg.map(([k, l, sub]) => `<span><img src="${CartePeinture.url(k, sub)}" alt="" width="18" height="18">${l}</span>`).join('')}</div>` +
      `<p class="muted vy-note">${c.drapeau ? `Drapeau en ${coord(c.drapeau.map(Math.round))}. <button class="vy-carte__lien" data-act="drapeau">Retirer</button>` : 'Appui long ou clic droit sur la carte : poser ton drapeau.'}</p>`;
    const id = c.sel || (c.selCase ? null : here);
    if (!id) {
      const pos = c.selCase ? `<h3>${coord(c.selCase)}</h3><p class="muted">Rien n'est encore tracé ici : brume, ou terres à venir.</p>` : '<p class="muted">Touche une case pour la voir.</p>';
      return compte + pos + legende;
    }
    const info = Atlas.mapInfo(id);
    const known = seen.has(id);
    const marks = Atlas.questMarks(ch, here);
    const R = info.zone;
    const p = info.coords;
    let html = `<h3>${esc(info.def.name)}</h3><p class="vy-carte__coord"><b>${coord(p)}</b> ${esc(R.name)} · ${levels(info.def.level)}</p>`;
    if (id === here) html += `<p class="vy-carte__ici">${w.mapId === id ? 'Tu es ici.' : 'Tu es dans le donjon de cette carte.'}</p>`;
    if (!known) html += '<p class="muted vy-note">Carte inexplorée : va la découvrir pour en savoir plus.</p>';
    const ligne = (a, b) => `<li><span>${a}</span>${b ? `<b>${b}</b>` : ''}</li>`;
    if (known && info.monsters.length) html += `<div class="vy-sous"><span>Monstres</span></div><ul class="vy-carte__liste">${info.monsters.map(m => ligne(m.def ? `<i class="vy-pastille" style="--c:${m.def.color || '#c9a66b'}"></i>${esc(m.def.name)}` : esc(m.id), levels(m.level))).join('')}</ul>`;
    if (known && info.resources.length) html += `<div class="vy-sous"><span>Récolte</span></div><ul class="vy-carte__liste">${info.resources.map(r => { const d = Items.get(r); return ligne(d ? esc(d.name) : esc(r), d && d.level > 1 ? 'niv. ' + d.level : ''); }).join('')}</ul>`;
    if (info.relay) {
      const reg = ch.relays.includes(id);
      html += `<div class="vy-sous"><span>Relais du Fil</span></div><p class="vy-note">${reg ? 'Enregistré.' : 'Pas encore enregistré : touche-le pour pouvoir y revenir.'}</p>`;
      if (reg && id !== w.mapId) {
        html += w.canTeleport(id)
          ? `<div class="vy-carte__actions"><button class="vy-bouton vy-bouton--primaire" data-act="voyager" data-id="${esc(id)}">Voyager</button></div>`
          : '<p class="muted vy-note">Pour voyager ici, touche un Relais du Fil puis ouvre la carte depuis le relais.</p>';
      }
    }
    for (const d of info.dungeons) {
      const key = d.keyItem && Items.get(d.keyItem);
      html += `<div class="vy-sous"><span>Donjon</span></div><p class="vy-note"><b>${esc(d.name)}</b> <span class="muted">${levels(d.level)} · ${d.rooms.length} salles${key ? ' · clé : ' + esc(key.name) : ''}${ch.counters.dungeons.includes(d.id) ? ' · terminé' : ''}</span></p>`;
    }
    const q = [];
    const marque = k => `<img class="vy-carte__marque" src="${CartePeinture.url(k)}" alt="" width="16" height="16">`;
    for (const x of marks.give.get(id) || []) q.push(ligne(`${marque('offre')}${esc(x.name)}`, `niv. ${x.level}`));
    for (const x of marks.turnIn.get(id) || []) q.push(ligne(`${marque('rendre')}${esc(x.name)}`, 'à rendre'));
    for (const x of marks.targets.get(id) || []) q.push(ligne(`${marque('quete')}${esc(x.name)}<br><small class="muted">${esc(Quests.stepText(ch, x.id))}</small>`));
    if (q.length) html += `<div class="vy-sous"><span>Quêtes</span></div><ul class="vy-carte__liste">${q.join('')}</ul>`;
    if (known && info.npcs.length) html += `<div class="vy-sous"><span>Habitants</span></div><p class="vy-note">${info.npcs.map(n => { const d = World.npcDef(n); return d ? `${esc(d.name)} <small class="muted">${esc(d.title || '')}</small>` : esc(n); }).join(', ')}</p>`;
    return compte + html + legende;
  },

  ficheRegion() {
    const c = this.carte, ch = this.world.ch;
    const regs = Atlas.regions();
    const hereReg = this.world.zone && this.world.zone.region;
    const r = regs.find(x => x.id === (c.region || hereReg)) || regs[0];
    const seen = new Set(ch.counters.maps);
    let html = `<h3>${esc(DATA.regions[r.id] || r.name)}</h3><p class="vy-carte__coord">${levels(r.level)}${r.open ? '' : ' · <b class="vy-carte__avenir">à venir</b>'}</p><p class="vy-note">${esc(r.desc)}</p>`;
    if (r.open) {
      const rows = r.zones.map(z => { const n = z.maps.length, v = z.maps.filter(m => seen.has(m.id)).length; return `<li><span>${esc(z.name)} <small class="muted">${levels(z.level)}</small></span><b>${v} / ${n}</b></li>`; }).join('');
      html += `<div class="vy-sous"><span>Zones</span><span>explorées</span></div><ul class="vy-carte__liste">${rows}</ul>
        <div class="vy-carte__actions"><button class="vy-bouton vy-bouton--petit" data-act="voirRegion" data-id="${r.id}">Voir les cartes</button></div>`;
    } else html += '<p class="muted vy-note">Ces terres ne sont pas encore ouvertes. Les Voiles se lèvent une région après l\'autre.</p>';
    html += `<div class="vy-sous"><span>Le premier continent</span></div><div class="vy-carte__regions">${regs.map(x => `<button class="vy-carte__region${x.id === r.id ? ' on' : ''}${x.open ? '' : ' ferme'}" data-act="region" data-id="${x.id}" aria-pressed="${x.id === r.id}"><span class="vy-pastille" style="--c:${REGION[x.id].lanterne}"></span>${esc(DATA.regions[x.id] || x.name)}<small>${levels(x.level)}${x.open ? '' : ', à venir'}</small></button>`).join('')}</div>`;
    return html;
  },

  // ----- Montage : le canvas 2D, la vue 3D, la bulle -----

  monterCarte(body) {
    const holder = body.querySelector('[data-carte-vue]');
    if (!holder) return;
    const c = this.carte;
    if (!this.carteBulleEl) {
      this.carteBulleEl = document.createElement('div');
      this.carteBulleEl.className = 'vy-carte__bulle';
      this.carteBulleEl.setAttribute('role', 'tooltip');
      this.carteBulleEl.hidden = true;
    }
    if (c.tab === 'cartes' && c.vue3d && !c.repli3d) {
      if (this.carte3d && this.carte3d.pret) { holder.appendChild(this.carte3d.dom); this.carte3d.taille(); this.carte3d.majReperes(); this.carte3d.demander(); }
      else holder.insertAdjacentHTML('beforeend', `<div class="vy-carte__charge" role="status"><span>Chargement de la vue 3D...</span><small>${this.carte3dEtape || ''}</small></div>`);
    } else {
      if (!this.carteCv) this.creerCanvasCarte();
      holder.appendChild(this.carteCv);
    }
    holder.appendChild(this.carteBulleEl);
    this.drawCarte();
  },

  carteIci() {
    const id = Atlas.hereOf(this.world.mapId);
    const p = id ? Atlas.coordsOf(id) : [0, 0];
    return { cx: p[0], cy: p[1] };
  },

  vueCarte() {
    const c = this.carte, k = c.tab === 'monde' ? 'monde' : 'cartes';
    return c.vues[k] || (c.vues[k] = k === 'monde' ? { z: 1, cx: 46, cy: 40 } : Object.assign({ z: 1 }, this.carteIci()));
  },

  // Projection de la vue : la grille à plat, le relief peint (repli sans WebGL), ou le continent.
  projCarte(W, H) {
    const c = this.carte, v = this.vueCarte();
    if (c.tab === 'monde') {
      const k = Math.min(W / 96, H / 80) * v.z;
      return { kind: 'monde', k, W, H, to: (u, t) => [W / 2 + (u - v.cx) * k, H / 2 + (t - v.cy) * k], from: (X, Y) => [v.cx + (X - W / 2) / k, v.cy + (Y - H / 2) / k], delta: (dx, dy) => [dx / k, dy / k] };
    }
    const s = BASE * v.z;
    if (!(c.vue3d && c.repli3d)) return { kind: 'plat', s, W, H, to: (x, y) => [W / 2 + (x - v.cx) * s, H / 2 + (y - v.cy) * s], from: (X, Y) => [v.cx + (X - W / 2) / s, v.cy + (Y - H / 2) / s], delta: (dx, dy) => [dx / s, dy / s] };
    // Relief : la grille tournée d'un quart de tour par cran, puis projetée en isométrie.
    const rot = c.rot || 0;
    const R = (dx, dy) => (rot === 0 ? [dx, dy] : rot === 1 ? [-dy, dx] : rot === 2 ? [-dx, -dy] : [dy, -dx]);
    const Ri = (rx, ry) => (rot === 0 ? [rx, ry] : rot === 1 ? [ry, -rx] : rot === 2 ? [-rx, -ry] : [-ry, rx]);
    const tw = s * 1.2, th = tw / 2, u = th * 0.16;
    const toR = (rx, ry, h) => [W / 2 + (rx - ry) * tw / 2, H / 2 + (rx + ry) * th / 2 - (h || 0) * u];
    return {
      kind: 'relief', s, tw, th, u, W, H, rot, R, toR,
      to: (x, y, h) => { const [rx, ry] = R(x - v.cx, y - v.cy); return toR(rx, ry, h); },
      from: (X, Y) => { const a = (X - W / 2) / (tw / 2), b = (Y - H / 2) / (th / 2), d = Ri((a + b) / 2, (b - a) / 2); return [v.cx + d[0], v.cy + d[1]]; },
      delta: (dx, dy) => Ri(dx / tw + dy / th, dy / th - dx / tw),
    };
  },

  // Zoom autour d'un point de l'écran (le centre par défaut) : ce point ne bouge pas.
  zoomCarte(f, X, Y) {
    const P = this.carteP;
    const v = this.vueCarte();
    const lim = ZOOM[this.carte.tab === 'monde' ? 'monde' : 'cartes'];
    if (!P) { v.z = clamp(v.z * f, lim[0], lim[1]); return; }
    if (X == null) { X = P.W / 2; Y = P.H / 2; }
    const before = P.from(X, Y);
    v.z = clamp(v.z * f, lim[0], lim[1]);
    const after = this.projCarte(P.W, P.H).from(X, Y);
    v.cx += before[0] - after[0]; v.cy += before[1] - after[1];
    this.drawCarte();
  },

  creerCanvasCarte() {
    const cv = this.carteCv = document.createElement('canvas');
    cv.className = 'vy-carte__cv';
    cv.setAttribute('role', 'img');
    cv.setAttribute('aria-label', 'Carte du monde : glisser pour se déplacer, molette ou pincement pour zoomer, toucher une case pour sa fiche, appui long pour poser un drapeau.');
    const pts = new Map();
    let drag = null, pinch = null, appui = 0;
    const pos = evt => { const r = cv.getBoundingClientRect(); return [evt.clientX - r.left, evt.clientY - r.top]; };
    const finAppui = () => { if (appui) { clearTimeout(appui); appui = 0; } };
    cv.addEventListener('pointerdown', evt => {
      try { cv.setPointerCapture(evt.pointerId); } catch (e) { /* rien */ }
      const p = pos(evt), v = this.vueCarte();
      this.carte.pointeur = evt.pointerType;
      pts.set(evt.pointerId, p);
      if (pts.size === 1) {
        drag = { p, cx: v.cx, cy: v.cy, moved: false, fait: false };
        // Appui long (toucher) : le drapeau.
        if (evt.pointerType !== 'mouse' && this.carte.tab === 'cartes') appui = setTimeout(() => { appui = 0; if (drag && !drag.moved && pts.size === 1) { drag.fait = true; this.poserDrapeauEcran(drag.p); } }, 560);
      } else if (pts.size === 2) { finAppui(); const [a, b] = [...pts.values()]; pinch = { d: Math.hypot(a[0] - b[0], a[1] - b[1]) || 1, z: v.z, mid: null }; drag = null; }
    });
    cv.addEventListener('pointermove', evt => {
      const p = pos(evt);
      if (!pts.has(evt.pointerId)) { if (evt.pointerType === 'mouse') this.survolCarte(p); return; }
      pts.set(evt.pointerId, p);
      const v = this.vueCarte(), P = this.carteP;
      if (!P) return;
      if (pinch && pts.size >= 2) {
        const [a, b] = [...pts.values()];
        const mid = [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
        if (pinch.mid) { const d = P.delta(mid[0] - pinch.mid[0], mid[1] - pinch.mid[1]); v.cx -= d[0]; v.cy -= d[1]; }
        pinch.mid = mid;
        this.zoomCarte(pinch.z * (Math.hypot(a[0] - b[0], a[1] - b[1]) / pinch.d) / v.z, mid[0], mid[1]);
        return;
      }
      if (!drag) return;
      const dx = p[0] - drag.p[0], dy = p[1] - drag.p[1];
      if (!drag.moved && Math.hypot(dx, dy) > 6) { drag.moved = true; finAppui(); cv.classList.add('glisse'); this.carte.bulle = null; this.cacherBulle(); }
      if (drag.moved) { const d = P.delta(dx, dy); v.cx = drag.cx - d[0]; v.cy = drag.cy - d[1]; this.carte.survol = null; this.demanderCarte(); }
    });
    const fin = evt => {
      finAppui();
      if (!pts.has(evt.pointerId)) return;
      pts.delete(evt.pointerId);
      if (drag && !drag.moved && !drag.fait && !pinch && evt.type === 'pointerup' && evt.button !== 2) this.toucherCarte(pos(evt), evt.pointerType);
      if (!pts.size) { drag = null; pinch = null; cv.classList.remove('glisse'); }
      else if (pinch) { pinch = null; drag = null; }
    };
    cv.addEventListener('pointerup', fin);
    cv.addEventListener('pointercancel', fin);
    cv.addEventListener('pointerleave', evt => { if (evt.pointerType === 'mouse') { this.carte.survol = null; this.carte.survolZone = null; this.cacherBulle(); this.demanderCarte(); } });
    cv.addEventListener('contextmenu', evt => { evt.preventDefault(); if (this.carte.tab === 'cartes') this.poserDrapeauEcran(pos(evt)); });
    cv.addEventListener('wheel', evt => { evt.preventDefault(); const p = pos(evt); this.zoomCarte(Math.exp(-evt.deltaY * 0.0016), p[0], p[1]); }, { passive: false });
    if (typeof ResizeObserver === 'function') new ResizeObserver(() => this.drawCarte()).observe(cv);
  },

  demanderCarte() {
    if (this.carteRaf) return;
    this.carteRaf = requestAnimationFrame(() => { this.carteRaf = 0; this.drawCarte(); });
  },

  // ----- Toucher, survoler, la bulle -----

  // Une case touchée : sa fiche et sa bulle ; une pastille ou une épingle : la sienne ; le
  // drapeau touché s'enlève ; une île du continent : sa fiche.
  toucherCarte(p, type) {
    const c = this.carte;
    if (c.tab === 'monde') {
      const hit = (this.carteHits || []).slice().reverse().find(h => inPoly(p, h.poly));
      if (hit) { c.region = hit.id; this.fen.render('carte'); }
      return;
    }
    const it = this.repereSous(p);
    if (it && it.kind === 'drapeau') { this.poserDrapeau(null); return; }
    const tactile = type && type !== 'mouse';
    if (it) {
      c.sel = it.map || null;
      c.selCase = it.map ? Atlas.coordsOf(it.map).slice() : c.selCase;
      c.bulle = tactile ? { html: this.bulleRepere(it), at: it.at } : null;
      this.fen.render('carte');
      return;
    }
    const h = this.caseSous(p);
    c.sel = h.id;
    c.selCase = [h.x, h.y];
    c.bulle = tactile ? { html: this.bulleCase(h), at: [h.x, h.y] } : null;
    this.fen.render('carte');
  },

  survolCarte(p) {
    const c = this.carte;
    c.survol = p;
    if (c.tab === 'monde') { this.cacherBulle(); return; }
    const it = this.repereSous(p);
    let zone = null;
    if (it) { this.montrerBulle(this.bulleRepere(it), p[0], p[1]); zone = it.map ? Atlas.index().map.get(it.map).zone : null; }
    else { const h = this.caseSous(p); this.montrerBulle(this.bulleCase(h), p[0], p[1]); zone = h.id ? Atlas.index().map.get(h.id).zone : null; }
    if (zone !== c.survolZone) { c.survolZone = zone; this.demanderCarte(); }
  },

  caseSous(p) {
    const P = this.carteP;
    if (P.kind === 'relief') {
      const hit = (this.carteHits || []).slice().reverse().find(h => inPoly(p, h.poly));
      if (hit) return { id: hit.id, x: hit.x, y: hit.y };
    }
    const g = P.from(p[0], p[1]);
    const x = Math.round(g[0]), y = Math.round(g[1]);
    return { id: Atlas.at(x, y), x, y };
  },

  repereSous(p) {
    const list = this.carteItems || [];
    for (let i = list.length - 1; i >= 0; i--) { const h = list[i]; if (Math.hypot(p[0] - h.x, p[1] - h.y) <= h.r) return h.item; }
    return null;
  },

  // Le contenu des bulles, à la manière de Dofus : « x,y », la zone, le niveau ; « Quêtes »,
  // l'étape et la coordonnée de la cible.
  bulleCase(h) {
    if (!h.id) return `<b>${coord([h.x, h.y])}</b>`;
    const e = Atlas.index().map.get(h.id);
    return `<b>${coord([h.x, h.y])}</b><span>${esc(e.zone.name)}</span><span>${niveau(e.def.level)}</span>`;
  },

  bulleRepere(it) {
    if (it.groupe) return it.groupe.map(x => this.bulleRepere(x)).join('<hr>');
    const ch = this.world.ch;
    const p = it.map ? Atlas.coordsOf(it.map) : null, ou = p ? ` (${coord(p)})` : '';
    const nomCarte = it.map ? Atlas.index().map.get(it.map).def.name : '';
    switch (it.kind) {
      case 'toi': return `<b>Toi</b><span>${esc(nomCarte)}${ou}</span>`;
      case 'drapeau': return `<b>Ton drapeau</b><span>${coord(it.at.map(Math.round))}</span><span class="q">${this.carte.pointeur === 'mouse' ? 'Clic' : 'Toucher'} pour l'enlever</span>`;
      case 'quete': return `<b>Quêtes</b><span class="q">${esc(it.quest.name)}</span><span>${esc(it.text)}${ou}</span>`;
      case 'offre': return `<b>Quêtes</b>${it.quetes.map(q => `<span class="q">${esc(q.name)}</span><span>Aller voir ${esc(it.npc.name)}${ou}</span>`).join('')}`;
      case 'rendre': return `<b>Quêtes</b>${it.quetes.map(q => `<span class="q">${esc(q.name)}</span><span>${esc(Quests.stepText(ch, q.id))}${ou}</span>`).join('')}`;
      case 'relais': return `<b>Relais du Fil</b><span>${esc(nomCarte)}${ou}</span><span class="q">${ch.relays.includes(it.map) ? 'Enregistré' : 'Pas encore enregistré'}</span>`;
      case 'donjon': return `<b>Donjon</b><span>${esc(it.donjon.name)}${ou}</span><span class="q">${niveau(it.donjon.level)}</span>`;
      case 'artisan': return `<b>Atelier</b><span>${esc(it.npc.name)}, ${esc(it.npc.title || ATELIERS[it.sub] || '')}${ou}</span>`;
      case 'marchand': return `<b>Marchand</b><span>${esc(it.npc.name)}, ${esc(it.npc.title || '')}${ou}</span>`;
      default: return '';
    }
  },

  montrerBulle(html, X, Y) {
    const b = this.carteBulleEl;
    if (!b || !b.isConnected || !html) return;
    if (b.dataset.html !== html) { b.innerHTML = html; b.dataset.html = html; }
    b.hidden = false;
    const W = b.parentNode.clientWidth, H = b.parentNode.clientHeight, w = b.offsetWidth, h = b.offsetHeight;
    let x = X + 14, y = Y + 14;
    if (x + w > W - 4) x = X - w - 14;
    if (y + h > H - 4) y = Y - h - 14;
    b.style.left = Math.round(clamp(x, 4, Math.max(4, W - w - 4))) + 'px';
    b.style.top = Math.round(clamp(y, 4, Math.max(4, H - h - 4))) + 'px';
  },

  cacherBulle() { if (this.carteBulleEl) this.carteBulleEl.hidden = true; },

  // ----- Le drapeau du joueur : gardé dans ce navigateur -----

  lireDrapeau() {
    try { const v = JSON.parse(localStorage.getItem(DRAPEAU) || 'null'); if (Array.isArray(v) && v.length === 2 && v.every(Number.isFinite)) return v; } catch (e) { /* rien */ }
    return null;
  },

  poserDrapeau(at) {
    const c = this.carte;
    c.drapeau = at;
    try { if (at) localStorage.setItem(DRAPEAU, JSON.stringify(at)); else localStorage.removeItem(DRAPEAU); } catch (e) { /* stockage indisponible */ }
    this.toast(at ? `Drapeau posé en ${coord(at.map(Math.round))}.` : 'Drapeau retiré.');
    if (navigator.vibrate && at) try { navigator.vibrate(12); } catch (e) { /* rien */ }
    c.bulle = null; this.cacherBulle();
    if (this.carte3d) this.carte3d.majReperes();
    if (this.fen.isOpen('carte')) this.fen.render('carte');
  },

  poserDrapeauEcran(p) {
    const P = this.carteP;
    if (!P || P.kind === 'monde') return;
    const it = this.repereSous(p);
    if (it && it.kind === 'drapeau') { this.poserDrapeau(null); return; }
    const g = P.kind === 'relief' ? (() => { const h = this.caseSous(p); return h.id ? [h.x, h.y] : P.from(p[0], p[1]); })() : P.from(p[0], p[1]);
    this.poserDrapeau([Math.round(g[0] * 100) / 100, Math.round(g[1] * 100) / 100]);
  },

  // ----- Les repères : pastilles et épingles, en coordonnées du monde -----

  // Pastilles : relais et donjons des cartes explorées, ateliers et marchands, quêtes à prendre
  // (« ! ») et à rendre (« ? »), à la case de leur PNJ.
  reperesMonde(D) {
    const items = [];
    for (const [id] of D.A.coords) {
      const sp = Atlas.spots(id), def = D.ix.map.get(id).def, vu = D.seen.has(id);
      const at = (x, y) => Atlas.tileToWorld(id, x, y);
      if (vu && def.relay && sp.relay) items.push({ kind: 'relais', map: id, at: at(sp.relay.x, sp.relay.y) });
      if (vu && sp.door) for (const d of D.ix.dungeonsAt.get(id) || []) items.push({ kind: 'donjon', map: id, at: at(sp.door.x, sp.door.y), donjon: d });
      for (const n of sp.npcs) {
        const nd = n.id && World.npcDef(n.id);
        if (!nd) continue;
        const p = at(n.x, n.y);
        if (D.marks.turnInNpc.has(n.id)) items.push({ kind: 'rendre', map: id, at: p, npc: nd, quetes: D.marks.turnInNpc.get(n.id) });
        else if (D.marks.giveNpc.has(n.id)) items.push({ kind: 'offre', map: id, at: p, npc: nd, quetes: D.marks.giveNpc.get(n.id) });
        if (vu && nd.workshop) items.push({ kind: 'artisan', sub: nd.workshop, map: id, at: p, npc: nd });
        if (vu && nd.shop) items.push({ kind: 'marchand', map: id, at: p, npc: nd });
      }
    }
    return items;
  },

  // Épingles : toi (bleue), les cibles des quêtes suivies (vertes), ton drapeau.
  epinglesMonde(D) {
    const w = this.world, out = [];
    for (const q of D.marks.pins) out.push({ kind: 'quete', map: q.map, at: Atlas.tileToWorld(q.map, q.x, q.y), quest: q.quest, text: q.text });
    if (this.carte.drapeau) { const [x, y] = this.carte.drapeau; out.push({ kind: 'drapeau', map: Atlas.at(Math.round(x), Math.round(y)), at: [x, y] }); }
    if (D.here) {
      let tile = w.mapId === D.here ? [w.player.x, w.player.y] : null;
      if (!tile) { const door = Atlas.spots(D.here).door; tile = door ? [door.x, door.y] : [7, 7]; }
      out.push({ kind: 'toi', map: D.here, at: Atlas.tileToWorld(D.here, tile[0], tile[1]) });
    }
    return out;
  },

  donneesCarte() {
    const ch = this.world.ch, here = Atlas.hereOf(this.world.mapId);
    return { A: Atlas.get(), ix: Atlas.index(), seen: new Set(ch.counters.maps), relays: new Set(ch.relays), marks: Atlas.questMarks(ch, here), here };
  },

  // ----- Dessin -----

  themeCarte() {
    const st = getComputedStyle(document.getElementById('app'));
    const v = (n, d) => st.getPropertyValue(n).trim() || d;
    const fond = v('--fen-fond', '#121c29');
    const [r, g, b] = hex(fond);
    return { fond, fond2: v('--fen-fond-2', '#182536'), tete: v('--fen-tete', '#1c2a3d'), accent: v('--fen-accent', '#c9a66b'), actif: v('--fen-actif', '#00c2ff'), texte: v('--fen-texte', '#f2e2c9'), texte2: v('--fen-texte-2', '#a79f8f'), clair: (r * 0.3 + g * 0.59 + b * 0.11) > 140, titre: v('--vy-font-titre', 'serif'), ui: v('--vy-font-ui', 'sans-serif') };
  },

  drawCarte() {
    const cv = this.carteCv;
    if (!cv || !cv.isConnected || !this.carte) return;
    const W = cv.clientWidth, H = cv.clientHeight;
    if (!W || !H) return;
    const dpr = this.carteDpr = Math.min(2, window.devicePixelRatio || 1);
    if (cv.width !== Math.round(W * dpr) || cv.height !== Math.round(H * dpr)) { cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr); }
    const g = cv.getContext('2d');
    g.setTransform(dpr, 0, 0, dpr, 0, 0);
    const T = this.carteT = this.themeCarte();
    const P = this.carteP = this.projCarte(W, H);
    // Le ciel sous les îles : le crépuscule de la vue 3D, et des nuages lointains qui glissent
    // moins vite que la carte (parallaxe).
    const bg = g.createLinearGradient(0, 0, 0, H);
    bg.addColorStop(0, '#22406e'); bg.addColorStop(0.6, '#4a6797'); bg.addColorStop(1, '#7d7ea2');
    g.fillStyle = bg; g.fillRect(0, 0, W, H);
    if (this.carte.tab === 'cartes') this.cielCarte(g, P);
    const D = this.donneesCarte();
    this.carteHits = [];
    this.carteItems = [];
    g.textAlign = 'center'; g.textBaseline = 'middle';
    if (this.carte.tab === 'monde') { g.fillStyle = T.fond; g.globalAlpha = 0.55; g.fillRect(0, 0, W, H); g.globalAlpha = 1; this.dessinerMonde(g, P, T, D); }
    else {
      if (P.kind === 'relief') this.dessinerRelief(g, P, T, D); else this.dessinerPlat(g, P, T, D);
      // La bulle d'un toucher suit la carte quand on la déplace.
      const b = this.carte.bulle;
      if (b && this.carte.pointeur !== 'mouse') {
        const h = P.kind === 'relief' ? hauteurCase(Atlas.at(Math.round(b.at[0]), Math.round(b.at[1]))) : 0;
        const [X, Y] = P.to(b.at[0], b.at[1], h);
        if (X > 0 && Y > 0 && X < W && Y < H) this.montrerBulle(b.html, X, Y); else this.cacherBulle();
      }
    }
  },

  cielCarte(g, P) {
    const v = this.vueCarte(), b = Atlas.get().bounds, k = (P.s || BASE) * 0.5;
    g.save(); g.globalAlpha = 0.2;
    for (let i = 0; i < 16; i++) {
      const wx = b.minX - 8 + hash('ciel' + i) * (b.maxX - b.minX + 16), wy = b.minY - 6 + hash('cieL' + i) * (b.maxY - b.minY + 12);
      const X = P.W / 2 + (wx - v.cx) * k, Y = P.H / 2 + (wy - v.cy) * k, w = k * (3 + 3 * hash('ciel-' + i));
      if (X < -w || X > P.W + w || Y < -w || Y > P.H + w) continue;
      g.drawImage(CartePeinture.nuage(i), X - w / 2, Y - w * 0.31, w, w * 0.62);
    }
    g.restore();
  },

  // Peint les cartes visibles qui ne le sont pas encore, dans un budget de temps par image ;
  // les autres attendent l'image suivante (une couleur de zone en attendant).
  peindreVisibles(ids) {
    const t0 = performance.now();
    let reste = false;
    for (const id of ids) {
      if (CartePeinture.estPeinte(id)) continue;
      if (performance.now() - t0 > 12) { reste = true; break; }
      CartePeinture.carte(id);
    }
    if (reste) this.demanderCarte();
  },

  imageCarte(id, D) {
    if (!CartePeinture.estPeinte(id)) return null;
    return D.seen.has(id) ? CartePeinture.carte(id) : CartePeinture.brume(id);
  },

  // La grille vue de dessus : les cartes peintes, le flanc de l'île, la grille claire, la brume,
  // les noms des zones, les repères.
  dessinerPlat(g, P, T, D) {
    const { A, ix, seen } = D, s = P.s;
    const vis = [];
    for (const [id, [x, y]] of A.coords) {
      const [X, Y] = P.to(x, y);
      if (X < -s || X > P.W + s || Y < -s * 1.5 || Y > P.H + s) continue;
      vis.push({ id, x, y, X, Y, x0: Math.round(X - s / 2), y0: Math.round(Y - s / 2), x1: Math.round(X + s / 2), y1: Math.round(Y + s / 2) });
    }
    this.peindreVisibles(vis.map(c => c.id));
    const has = (x, y) => A.cells.has(Atlas.key(x, y));
    // 1. L'île flotte : son ombre sur le ciel, puis l'épaisseur de falaise au sud des côtes.
    g.fillStyle = 'rgba(4,8,18,0.35)';
    for (const c of vis) g.fillRect(c.x0 + s * 0.06, c.y0 + s * 0.2, c.x1 - c.x0, c.y1 - c.y0);
    for (const c of vis) {
      if (has(c.x, c.y + 1)) continue;
      const Pz = CartePeinture.palette(ix.map.get(c.id).zone), fh = Math.max(4, s * 0.16);
      const gr = g.createLinearGradient(0, c.y1, 0, c.y1 + fh);
      gr.addColorStop(0, Pz.rocheSombre); gr.addColorStop(0.6, mix(Pz.rocheSombre, Pz.encre, 0.6)); gr.addColorStop(1, rgba(Pz.encre, 0.2));
      g.fillStyle = gr;
      g.beginPath(); g.moveTo(c.x0, c.y1); g.lineTo(c.x1, c.y1);
      for (let i = 6; i >= 0; i--) { const x = c.x0 + ((c.x1 - c.x0) * i) / 6; g.lineTo(x, c.y1 + fh * (0.55 + 0.45 * hash(c.id + i))); }
      g.closePath(); g.fill();
      g.strokeStyle = rgba(Pz.rocheClaire, 0.4); g.lineWidth = 1;
      g.beginPath(); g.moveTo(c.x0, c.y1 + fh * 0.35); g.lineTo(c.x1, c.y1 + fh * 0.3); g.stroke();
    }
    // 2. Les cartes peintes, voilées si inexplorées.
    g.imageSmoothingEnabled = true; g.imageSmoothingQuality = 'high';
    for (const c of vis) {
      const img = this.imageCarte(c.id, D);
      if (img) g.drawImage(img, c.x0, c.y0, c.x1 - c.x0, c.y1 - c.y0);
      else { g.fillStyle = CartePeinture.couleurZone(ix.map.get(c.id).zone); g.fillRect(c.x0, c.y0, c.x1 - c.x0, c.y1 - c.y0); }
    }
    // 3. La grille claire, une ligne par carte ; les zones en pointillé, les régions à l'encre.
    g.lineWidth = 1; g.strokeStyle = 'rgba(255,255,255,0.34)';
    g.beginPath();
    for (const c of vis) {
      g.moveTo(c.x0 + 0.5, c.y1); g.lineTo(c.x0 + 0.5, c.y0 + 0.5); g.lineTo(c.x1, c.y0 + 0.5);
      if (!has(c.x + 1, c.y)) { g.moveTo(c.x1 - 0.5, c.y0); g.lineTo(c.x1 - 0.5, c.y1); }
      if (!has(c.x, c.y + 1)) { g.moveTo(c.x0, c.y1 - 0.5); g.lineTo(c.x1, c.y1 - 0.5); }
    }
    g.stroke();
    for (const c of vis) {
      const e = ix.map.get(c.id);
      for (const [dx, dy] of [[1, 0], [0, 1]]) {
        const nb = A.cells.get(Atlas.key(c.x + dx, c.y + dy)), ne = nb && ix.map.get(nb);
        if (!ne || ne.zone === e.zone) continue;
        const reg = ne.zone.region !== e.zone.region;
        g.setLineDash(reg ? [] : [5, 4]);
        g.strokeStyle = reg ? rgba(region(e.zone).encre, 0.75) : 'rgba(255,255,255,0.6)'; g.lineWidth = reg ? 2.5 : 1.4;
        g.beginPath();
        if (dx) { g.moveTo(c.x1, c.y0); g.lineTo(c.x1, c.y1); } else { g.moveTo(c.x0, c.y1); g.lineTo(c.x1, c.y1); }
        g.stroke();
      }
    }
    g.setLineDash([]);
    // 4. La brume : des nuages peints sur ce qui n'est pas exploré.
    this.brumeCarte(g, vis.filter(c => !seen.has(c.id)).map(c => [c.X, c.Y]), s, 1);
    // 5. La zone survolée (ou celle de la case choisie), surlignée comme sur Dofus.
    this.zoneSurlignee(g, P, D, s);
    // 6. Les noms des zones, en grand, à travers leur étendue.
    this.nomsZones(g, P, T, D, s);
    // 7. La case choisie, puis les repères.
    const sel = this.carte.sel && vis.find(c => c.id === this.carte.sel);
    if (sel) { g.strokeStyle = '#ffe7a3'; g.lineWidth = 2.5; g.strokeRect(sel.x0 + 1.25, sel.y0 + 1.25, sel.x1 - sel.x0 - 2.5, sel.y1 - sel.y0 - 2.5); }
    this.dessinerReperes(g, P, D, s, () => 0);
  },

  // Nuages de brume : deux par carte cachée, qui débordent un peu, pour un voile continu.
  brumeCarte(g, centres, s, alpha) {
    if (!centres.length) return;
    g.save(); g.globalAlpha = 0.92 * alpha;
    for (const [X, Y] of centres) {
      const k = Math.floor(hash(X.toFixed(0) + ':' + Y.toFixed(0)) * 3);
      for (let i = 0; i < 2; i++) {
        const img = CartePeinture.nuage(k + i), w = s * (1.2 + 0.15 * i), h = w * 0.62;
        g.drawImage(img, X - w / 2 + (i ? s * 0.12 : -s * 0.1), Y - h / 2 + (i ? s * 0.2 : -s * 0.16), w, h);
      }
    }
    g.restore();
  },

  zoneSurlignee(g, P, D, s) {
    const c = this.carte;
    const zone = c.survolZone || (c.sel && D.ix.map.get(c.sel) ? D.ix.map.get(c.sel).zone : null);
    if (!zone || P.kind !== 'plat') return;
    const cells = zone.maps.map(m => D.A.coords.get(m.id)).filter(Boolean);
    const inZ = new Set(cells.map(p => Atlas.key(p[0], p[1])));
    g.fillStyle = 'rgba(150,230,100,0.16)';
    for (const [x, y] of cells) { const [X, Y] = P.to(x, y); g.fillRect(Math.round(X - s / 2), Math.round(Y - s / 2), Math.round(X + s / 2) - Math.round(X - s / 2), Math.round(Y + s / 2) - Math.round(Y - s / 2)); }
    g.strokeStyle = 'rgba(190,250,140,0.9)'; g.lineWidth = 2;
    g.beginPath();
    for (const [x, y] of cells) {
      const [X, Y] = P.to(x, y), x0 = Math.round(X - s / 2), y0 = Math.round(Y - s / 2), x1 = Math.round(X + s / 2), y1 = Math.round(Y + s / 2);
      if (!inZ.has(Atlas.key(x, y - 1))) { g.moveTo(x0, y0 + 1); g.lineTo(x1, y0 + 1); }
      if (!inZ.has(Atlas.key(x, y + 1))) { g.moveTo(x0, y1 - 1); g.lineTo(x1, y1 - 1); }
      if (!inZ.has(Atlas.key(x - 1, y))) { g.moveTo(x0 + 1, y0); g.lineTo(x0 + 1, y1); }
      if (!inZ.has(Atlas.key(x + 1, y))) { g.moveTo(x1 - 1, y0); g.lineTo(x1 - 1, y1); }
    }
    g.stroke();
  },

  // Les noms des zones, comme sur la carte de Dofus : en grand, dans la police des titres,
  // à demi transparents, à travers l'étendue de la zone ; le niveau dessous.
  nomsZones(g, P, T, D, s) {
    if (s < 22) return;
    const byZone = new Map();
    for (const [id, [x, y]] of D.A.coords) { const z = D.ix.map.get(id).zone; (byZone.get(z) || byZone.set(z, []).get(z)).push([x, y]); }
    for (const [z, list] of byZone) {
      const h = P.kind === 'relief' ? hauteur(z) : 0;
      const pts = list.map(([x, y]) => P.to(x, y, h));
      const xs = pts.map(p => p[0]), ys = pts.map(p => p[1]);
      const X = xs.reduce((a, b) => a + b, 0) / xs.length, Y = ys.reduce((a, b) => a + b, 0) / ys.length;
      const larg = Math.max(...xs) - Math.min(...xs) + (P.kind === 'relief' ? P.tw : s);
      if (X < -larg || X > P.W + larg || Y < -60 || Y > P.H + 60) continue;
      let f = clamp(s * 0.42, 13, 40);
      g.font = `700 ${Math.round(f)}px ${T.titre}`;
      const w = g.measureText(z.name).width;
      if (w > larg * 1.05) { f = Math.max(11, f * (larg * 1.05) / w); g.font = `700 ${Math.round(f)}px ${T.titre}`; }
      g.save();
      g.shadowColor = rgba(region(z).encre, 0.85); g.shadowBlur = 6; g.shadowOffsetY = 1;
      g.fillStyle = 'rgba(255,255,255,0.78)';
      g.fillText(z.name, X, Y);
      g.font = `600 ${Math.round(clamp(f * 0.48, 10, 15))}px ${T.ui}`;
      g.fillStyle = 'rgba(255,247,226,0.72)';
      g.fillText(niveau(z.level), X, Y + f * 0.78);
      g.restore();
    }
  },

  // Pastilles groupées quand elles se recouvrent, puis épingles ; les cibles de clic sont notées.
  // `hDe(gx, gy)` : la hauteur du relief sous un point (0 à plat).
  dessinerReperes(g, P, D, s, hDe) {
    const dpr = this.carteDpr || 1;
    const r = clamp(s * 0.13, 10, 19);
    const items = this.reperesMonde(D).map(it => { const [X, Y] = P.to(it.at[0], it.at[1], hDe(it.at[0], it.at[1])); return Object.assign(it, { X, Y: Y - (P.kind === 'relief' ? r * 1.2 : 0) }); })
      .filter(it => it.X > -30 && it.X < P.W + 30 && it.Y > -30 && it.Y < P.H + 30)
      .sort((a, b) => PRIO[b.kind] - PRIO[a.kind]);
    let groupes = [];
    for (const it of items) {
      const gr = groupes.find(o => Math.hypot(o.X - it.X, o.Y - it.Y) < r * 1.75);
      if (gr) gr.items.push(it); else groupes.push({ X: it.X, Y: it.Y, items: [it] });
    }
    // De près, les pastilles d'un même lieu s'écartent en grappe, comme sur Dofus ; de loin,
    // une seule pastille porte leur nombre.
    if (s >= 60) groupes = groupes.flatMap(gr => {
      if (gr.items.length === 1 || gr.items.length > 4) return [gr];
      const n = gr.items.length, d = r * 1.05;
      const off = n === 2 ? [[-0.55, 0], [0.55, 0]] : n === 3 ? [[0, -0.5], [-0.58, 0.45], [0.58, 0.45]] : [[-0.55, -0.5], [0.55, -0.5], [-0.55, 0.5], [0.55, 0.5]];
      return gr.items.map((it, i) => ({ X: gr.X + off[i][0] * d, Y: gr.Y + off[i][1] * d, items: [it] }));
    });
    for (const gr of groupes.sort((a, b) => a.Y - b.Y || PRIO[a.items[0].kind] - PRIO[b.items[0].kind])) {
      const top = gr.items[0], art = CartePeinture.pastille(top.kind, 2 * r * dpr, top.sub);
      const cw = art.canvas.width / dpr, chh = art.canvas.height / dpr;
      g.drawImage(art.canvas, gr.X - art.ax / dpr, gr.Y - art.ay / dpr, cw, chh);
      if (gr.items.length > 1) {
        const bx = gr.X + r * 0.78, by = gr.Y - r * 0.78, br = Math.max(6.5, r * 0.46);
        g.fillStyle = '#1d1712'; g.beginPath(); g.arc(bx, by, br, 0, Math.PI * 2); g.fill();
        g.strokeStyle = 'rgba(255,255,255,0.9)'; g.lineWidth = 1.2; g.stroke();
        g.fillStyle = '#ffffff'; g.font = `700 ${Math.round(br * 1.2)}px ${(this.carteT || {}).ui || 'sans-serif'}`; g.fillText(String(gr.items.length), bx, by + 0.5);
      }
      this.carteItems.push({ x: gr.X, y: gr.Y, r: r + 2, item: gr.items.length > 1 ? Object.assign({}, top, { groupe: gr.items }) : top });
    }
    // Épingles : quêtes, drapeau, puis toi par-dessus tout.
    const pins = this.epinglesMonde(D);
    for (const pin of pins) {
      const [X, Y] = P.to(pin.at[0], pin.at[1], hDe(pin.at[0], pin.at[1]));
      if (X < -60 || X > P.W + 60 || Y < -20 || Y > P.H + 80) continue;
      const wpx = pin.kind === 'toi' ? clamp(s * 0.5, 30, 50) : clamp(s * 0.4, 24, 40);
      const art = CartePeinture.epingle(pin.kind, wpx * dpr);
      g.fillStyle = 'rgba(10,8,6,0.35)'; g.beginPath(); g.ellipse(X, Y, wpx * 0.24, wpx * 0.09, 0, 0, Math.PI * 2); g.fill();
      g.drawImage(art.canvas, X - art.ax / dpr, Y - art.ay / dpr, art.canvas.width / dpr, art.canvas.height / dpr);
      this.carteItems.push({ x: X - art.ax / dpr + art.hx / dpr, y: Y - art.ay / dpr + art.hy / dpr, r: art.r / dpr + 3, item: pin });
    }
  },

  // ----- Relief peint, en canvas : le repli de la vue 3D sans WebGL -----

  // Des blocs isométriques dont le dessus porte la peinture de la carte (une transformation
  // affine du carré au losange), les flancs plus sombres, la hauteur selon la zone ; quatre
  // orientations (boutons « tourner »). Repères debout au-dessus des blocs.
  dessinerRelief(g, P, T, D) {
    const { A, ix, seen } = D, s = P.s, v = this.vueCarte();
    const cells = [...A.coords].map(([id, [x, y]]) => { const [rx, ry] = P.R(x - v.cx, y - v.cy); return { id, x, y, rx, ry, e: ix.map.get(id) }; })
      .sort((a, b) => (a.rx + a.ry) - (b.rx + b.ry) || a.rx - b.rx);
    this.peindreVisibles(cells.map(c => c.id));
    const S = CartePeinture.T * 15;
    for (const c of cells) {
      const Pz = CartePeinture.palette(c.e.zone);
      c.h = hauteurCase(c.id);
      const d = c.h * P.u;
      const N = P.toR(c.rx - 0.5, c.ry - 0.5, c.h), E = P.toR(c.rx + 0.5, c.ry - 0.5, c.h), Sx = P.toR(c.rx + 0.5, c.ry + 0.5, c.h), Wp = P.toR(c.rx - 0.5, c.ry + 0.5, c.h);
      const Sd = [Sx[0], Sx[1] + d], Wd = [Wp[0], Wp[1] + d], Ed = [E[0], E[1] + d];
      c.at = P.toR(c.rx, c.ry, c.h);
      c.poly = [N, E, Ed, Sd, Wd, Wp];
      this.carteHits.push({ id: c.id, x: c.x, y: c.y, poly: c.poly });
      if (Math.max(...c.poly.map(p => p[0])) < 0 || Math.min(...c.poly.map(p => p[0])) > P.W || Math.max(...c.poly.map(p => p[1])) < 0 || Math.min(...c.poly.map(p => p[1])) > P.H) continue;
      // Flancs : roche de la région, strates.
      g.fillStyle = mix(Pz.roche, Pz.encre, 0.3); poly(g, [Wp, Sx, Sd, Wd]); g.fill();
      g.fillStyle = mix(Pz.rocheSombre, Pz.encre, 0.35); poly(g, [Sx, E, Ed, Sd]); g.fill();
      g.strokeStyle = rgba(Pz.rocheClaire, 0.25); g.lineWidth = 1;
      for (let k = 1; k < c.h; k += 1.3) { const t = k * P.u; g.beginPath(); g.moveTo(Wp[0], Wp[1] + t); g.lineTo(Sx[0], Sx[1] + t); g.lineTo(E[0], E[1] + t); g.stroke(); }
      // Dessus : la peinture, posée sur le losange (affine : coin nord-ouest, axes x et y).
      const img = this.imageCarte(c.id, D);
      const o = P.to(c.x - 0.5, c.y - 0.5, c.h), ax = P.to(c.x + 0.5, c.y - 0.5, c.h), ay = P.to(c.x - 0.5, c.y + 0.5, c.h);
      if (img) {
        g.save();
        g.transform((ax[0] - o[0]) / S, (ax[1] - o[1]) / S, (ay[0] - o[0]) / S, (ay[1] - o[1]) / S, o[0], o[1]);
        g.drawImage(img, 0, 0, S, S);
        g.restore();
      } else { g.fillStyle = CartePeinture.couleurZone(c.e.zone); poly(g, [N, E, Sx, Wp]); g.fill(); }
      // Arêtes à l'encre de la région, jamais noires ; la grille claire sur le dessus.
      g.strokeStyle = rgba(Pz.encre, 0.55); g.lineWidth = 1;
      g.beginPath(); g.moveTo(Wp[0], Wp[1]); g.lineTo(Wd[0], Wd[1]); g.lineTo(Sd[0], Sd[1]); g.lineTo(Ed[0], Ed[1]); g.lineTo(E[0], E[1]); g.moveTo(Sx[0], Sx[1]); g.lineTo(Sd[0], Sd[1]); g.stroke();
      g.strokeStyle = 'rgba(255,255,255,0.32)'; poly(g, [N, E, Sx, Wp]); g.stroke();
    }
    const hDe = (gx, gy) => { const id = Atlas.at(Math.round(gx), Math.round(gy)); const c = id && cells.find(x => x.id === id); return c ? c.h : 0; };
    this.brumeCarte(g, cells.filter(c => !seen.has(c.id) && c.at).map(c => [c.at[0], c.at[1] - P.th * 0.4]), P.tw * 0.8, 1);
    if (this.carte.sel) { const c = cells.find(x => x.id === this.carte.sel); if (c && c.poly) { g.strokeStyle = '#ffe7a3'; g.lineWidth = 2.5; poly(g, [c.poly[0], c.poly[1], P.toR(c.rx + 0.5, c.ry + 0.5, c.h), c.poly[5]]); g.stroke(); } }
    this.nomsZones(g, P, T, D, P.tw * 0.75);
    this.dessinerReperes(g, P, D, P.tw * 0.75, hDe);
  },

  // ----- Vue 3D : Three.js chargé à la demande, rendu par js/carte-3d.js -----

  // Charge vendor/three.min.js une seule fois, à côté de ce script (en local comme en ligne).
  chargerThree() {
    if (window.THREE) return Promise.resolve(window.THREE);
    if (this.promesseThree) return this.promesseThree;
    const ref = document.querySelector('script[src*="hud-carte.js"]');
    let src = 'vendor/three.min.js';
    try { if (ref && ref.src) src = new URL('../vendor/three.min.js', ref.src).href; } catch (e) { /* chemin relatif */ }
    this.promesseThree = new Promise((ok, ko) => {
      const el = document.createElement('script');
      el.src = src; el.async = true;
      el.onload = () => (window.THREE ? ok(window.THREE) : ko(new Error('THREE absent')));
      el.onerror = () => { this.promesseThree = null; el.remove(); ko(new Error('chargement de Three.js')); };
      document.head.appendChild(el);
    });
    return this.promesseThree;
  },

  ouvrir3D() {
    const c = this.carte;
    if (this.carte3d || this.carte3dPromesse) return this.carte3dPromesse;
    this.carte3dEtape = '';
    this.carte3dPromesse = this.chargerThree().then(() => {
      if (typeof Carte3D !== 'function' || !Carte3D.disponible()) throw new Error('WebGL indisponible');
      if (!this.fen.isOpen('carte') || !c.vue3d || c.tab !== 'cartes') return null;
      const vue = this.carte3d = new Carte3D(this);
      return vue.construire(etape => { this.carte3dEtape = etape; const el = document.querySelector('.vy-carte__charge small'); if (el) el.textContent = etape; }).then(() => vue);
    }).then(vue => {
      this.carte3dPromesse = null;
      if (vue && vue !== this.carte3d) { vue.dispose(); return; }
      if (vue && (!this.fen.isOpen('carte') || !c.vue3d || c.tab !== 'cartes')) { this.fermer3D(); return; }
      if (this.fen.isOpen('carte')) this.fen.render('carte');
    }).catch(() => {
      this.carte3dPromesse = null;
      this.fermer3D();
      c.repli3d = true;
      if (this.fen.isOpen('carte')) this.fen.render('carte');
    });
    return this.carte3dPromesse;
  },

  fermer3D() {
    if (this.carte3d) { const v = this.carte3d; this.carte3d = null; v.dispose(); }
  },

  // Appelé par la vue 3D : une carte choisie (toucher ou clic), avec sa bulle sur téléphone.
  choisirCarte(id, x, y, html, tactile) {
    const c = this.carte;
    c.sel = id || null;
    c.selCase = [x, y];
    this.fen.render('carte');
    if (html && tactile && this.carte3d) { const p = this.carte3d.ecran(x, y); if (p) this.montrerBulle(html, p[0], p[1]); }
  },

  // ----- Onglet Monde : le continent à l'échelle des régions -----

  dessinerMonde(g, P, T, D) {
    const regs = Atlas.regions();
    const k = P.k;
    const by = new Map(regs.map(r => [r.id, r]));
    const sel = this.carte.region || (this.world.zone && this.world.zone.region);
    // La mer : quelques houles.
    g.strokeStyle = rgba(T.texte, 0.05); g.lineWidth = 1;
    for (let i = 0; i < 16; i++) {
      const y = (i + 0.5) * P.H / 16;
      g.beginPath();
      for (let x = 0; x <= P.W; x += 12) g.lineTo(x, y + Math.sin(x / 38 + i * 1.7) * 3);
      g.stroke();
    }
    // Les routes, sous les îles.
    for (const [a, b] of ROUTES) {
      const A = by.get(a), B = by.get(b);
      const pa = P.to(A.at[0], A.at[1]), pb = P.to(B.at[0], B.at[1]);
      const open = A.open && B.open;
      g.setLineDash(open ? [] : [5, 6]);
      g.strokeStyle = open ? rgba(T.accent, 0.7) : rgba(T.texte2, 0.3); g.lineWidth = open ? 2 : 1.3;
      const mx = (pa[0] + pb[0]) / 2 + (pb[1] - pa[1]) * 0.12, my = (pa[1] + pb[1]) / 2 - (pb[0] - pa[0]) * 0.12;
      g.beginPath(); g.moveTo(pa[0], pa[1]); g.quadraticCurveTo(mx, my, pb[0], pb[1]); g.stroke();
    }
    g.setLineDash([]);
    for (const r of regs) {
      const RC = REGION[r.id];
      const [X, Y] = P.to(r.at[0], r.at[1]);
      const R = r.r * k;
      const pts = [];
      for (let i = 0; i < 20; i++) { const a = i / 20 * Math.PI * 2, f = 0.84 + 0.24 * hash(r.id + i); pts.push([X + Math.cos(a) * R * f * 1.18, Y + Math.sin(a) * R * f * 0.86]); }
      this.carteHits.push({ id: r.id, poly: pts });
      const path = () => { g.beginPath(); const m0 = [(pts[0][0] + pts[19][0]) / 2, (pts[0][1] + pts[19][1]) / 2]; g.moveTo(m0[0], m0[1]); for (let i = 0; i < 20; i++) { const a = pts[i], b = pts[(i + 1) % 20]; g.quadraticCurveTo(a[0], a[1], (a[0] + b[0]) / 2, (a[1] + b[1]) / 2); } g.closePath(); };
      // Haut-fond clair autour de l'île, puis la roche.
      path(); g.strokeStyle = rgba(r.open ? RC.roche : RC.sombre, 0.22); g.lineWidth = 9; g.stroke();
      path();
      const fill = g.createLinearGradient(X - R, Y - R, X + R, Y + R);
      if (r.open) { fill.addColorStop(0, mix(RC.roche, '#ffffff', 0.1)); fill.addColorStop(1, mix(RC.roche, RC.sombre, 0.55)); }
      else { fill.addColorStop(0, mix(RC.sombre, T.fond, 0.25)); fill.addColorStop(1, mix(RC.sombre, T.fond, 0.6)); }
      g.fillStyle = fill; g.fill();
      g.strokeStyle = r.id === sel ? T.accent : (r.open ? RC.encre : rgba(RC.lanterne, 0.45)); g.lineWidth = r.id === sel ? 2.5 : 1.5; g.stroke();
      if (r.open) this.ileOuverte(g, r, X, Y, R, T, D);
      else {
        // Terres fermées : hachures, et un cadenas de lanterne.
        g.save(); path(); g.clip();
        g.strokeStyle = rgba(RC.lanterne, 0.16); g.lineWidth = 1;
        for (let x = X - R * 2; x < X + R * 2; x += 7) { g.beginPath(); g.moveTo(x, Y - R); g.lineTo(x + R * 1.2, Y + R); g.stroke(); }
        g.restore();
        if (r.id === 'lisiere') this.dechirure(g, X, Y, R);
        this.cadenas(g, X, Y - R * 0.3, Math.max(6, R * 0.15), RC.lanterne, T);
      }
      // Cartouche : nom, niveaux, « à venir » ; la police rétrécit pour tenir dans l'île.
      const name = DATA.regions[r.id] || r.name;
      let f1 = Math.round(clamp(R * 0.2, 11, 15)), f2 = 11, sub = `${levels(r.level)}${r.open ? '' : ' · à venir'}`, w1, w2;
      for (;;) {
        g.font = `700 ${f1}px ${T.titre}`; w1 = g.measureText(name).width;
        g.font = `600 ${f2}px ${T.ui}`; w2 = g.measureText(sub).width;
        if (Math.max(w1, w2) + 16 <= R * 2.3 || f1 <= 9) break;
        f1--; f2 = Math.max(9, f2 - 1);
      }
      if (Math.max(w1, w2) + 16 > R * 2.3 && !r.open) { sub = levels(r.level); g.font = `600 ${f2}px ${T.ui}`; w2 = g.measureText(sub).width; }
      const w = Math.max(w1, w2) + 16, h = f1 + f2 + 11, ly = r.open ? Y + R * 0.8 : Y + R * 0.38;
      g.fillStyle = rgba(T.fond, 0.86); round(g, X - w / 2, ly - h / 2, w, h, 4); g.fill();
      g.strokeStyle = rgba(RC.lanterne, r.open ? 0.7 : 0.4); g.lineWidth = 1; g.stroke();
      g.fillStyle = r.open ? T.accent : T.texte2; g.font = `700 ${f1}px ${T.titre}`; g.fillText(name, X, ly - f2 / 2 - 1);
      g.fillStyle = r.open ? T.texte : rgba(RC.lanterne, 0.9); g.font = `600 ${f2}px ${T.ui}`; g.fillText(sub, X, ly + f1 / 2 + 1);
    }
  },

  // Une région ouverte : ses cartes peintes en miniature, à leurs coordonnées, et où l'on est.
  ileOuverte(g, r, X, Y, R, T, D) {
    const list = [...D.A.coords].filter(([id]) => D.ix.map.get(id).zone.region === r.id);
    if (!list.length) return;
    const xs = list.map(([, p]) => p[0]), ys = list.map(([, p]) => p[1]);
    const x0 = Math.min(...xs), y0 = Math.min(...ys), bw = Math.max(...xs) - x0 + 1, bh = Math.max(...ys) - y0 + 1;
    const cs = Math.min(R * 1.5 / bw, R * 1.05 / bh);
    const ox = X - bw * cs / 2, oy = Y - R * 0.18 - bh * cs / 2;
    g.imageSmoothingEnabled = true; g.imageSmoothingQuality = 'high';
    for (const [id, [x, y]] of list) {
      const e = D.ix.map.get(id), img = this.imageCarte(id, D);
      const px = ox + (x - x0) * cs, py = oy + (y - y0) * cs;
      if (img) g.drawImage(img, px, py, cs, cs);
      else { g.fillStyle = CartePeinture.couleurZone(e.zone); g.fillRect(px, py, cs, cs); }
      if (id === D.here) { g.strokeStyle = T.actif; g.lineWidth = 2; g.strokeRect(px - 0.5, py - 0.5, cs + 1, cs + 1); }
    }
  },

  // La Déchirure, au-dessus de la Lisière : une fente d'où sort la lumière des Voiles.
  dechirure(g, X, Y, R) {
    const pts = [[-0.25, -0.62], [-0.08, -0.36], [-0.2, -0.12], [0.04, 0.1], [-0.06, 0.3], [0.16, 0.52]].map(([a, b]) => [X + a * R, Y + b * R]);
    g.save();
    g.lineJoin = 'round'; g.lineCap = 'round';
    g.shadowColor = '#bf95ff'; g.shadowBlur = 12;
    g.strokeStyle = 'rgba(166,108,255,0.9)'; g.lineWidth = 3.5;
    g.beginPath(); pts.forEach((p, i) => i ? g.lineTo(p[0], p[1]) : g.moveTo(p[0], p[1])); g.stroke();
    g.shadowBlur = 0; g.strokeStyle = '#f0d6ff'; g.lineWidth = 1.2; g.stroke();
    g.restore();
  },

  cadenas(g, X, Y, r, color, T) {
    g.fillStyle = rgba(T.fond, 0.7); g.beginPath(); g.arc(X, Y, r * 1.9, 0, Math.PI * 2); g.fill();
    g.strokeStyle = color; g.lineWidth = Math.max(1.5, r * 0.28);
    g.beginPath(); g.arc(X, Y - r * 0.25, r * 0.6, Math.PI, 0); g.stroke();
    g.fillStyle = color; round(g, X - r * 0.95, Y - r * 0.25, r * 1.9, r * 1.35, r * 0.25); g.fill();
    g.fillStyle = rgba(T.fond, 0.9); g.beginPath(); g.arc(X, Y + r * 0.35, r * 0.24, 0, Math.PI * 2); g.fill();
  },

  // ----- Mini-carte : les cartes voisines, peintes, en trois sur trois -----

  drawVoisins(g, W) {
    const id = Atlas.hereOf(this.world.mapId);
    const p = id && Atlas.coordsOf(id);
    if (!p) return;
    const seen = this.world.ch.counters.maps;
    const k = W > 160 ? 10 : 7, gap = 1, x0 = W - 3 * (k + gap) - 4, y0 = 4;
    g.fillStyle = 'rgba(8,12,19,0.7)'; g.fillRect(x0 - 2, y0 - 2, 3 * (k + gap) + 3, 3 * (k + gap) + 3);
    for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
      const nid = Atlas.at(p[0] + dx, p[1] + dy), x = x0 + (dx + 1) * (k + gap), y = y0 + (dy + 1) * (k + gap);
      if (!nid) { g.fillStyle = 'rgba(255,255,255,0.06)'; g.fillRect(x, y, k, k); continue; }
      const img = seen.includes(nid) ? CartePeinture.carte(nid) : CartePeinture.brume(nid);
      if (img) g.drawImage(img, x, y, k, k);
    }
    g.strokeStyle = '#00c2ff'; g.lineWidth = 1.5; g.strokeRect(x0 + (k + gap) - 0.5, y0 + (k + gap) - 0.5, k + 1, k + 1);
  },
});

})();
