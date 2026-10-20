// Inventaire (touches I et P), à la manière de Dofus Touch dans la charte Veylan. À gauche la
// poupée : les huit emplacements autour du personnage peint par le moteur (deux flèches pour le
// tourner), puis les quatre Nœuds et les six Écailles des Grands Dragons (à venir) ; dessous, la
// fiche de l'objet choisi (Effets, Conditions, Caractéristiques, Panoplie) et ses actions. À
// droite le sac : onglets par sorte d'objet, filtre, recherche, tri, pages, Fils ; et deux vues,
// Tenues (panoplies portées, ensembles) et Apparence (titre, cosmétiques, thème), qui reprennent
// l'ancienne fenêtre Personnage.
// Toucher choisit ; toucher deux fois équipe, utilise, noue ou retire ; glisser un objet sur la
// poupée ou sur un emplacement l'équipe, glisser un objet porté vers le sac le retire ; l'appui
// long ouvre la fiche. Se charge après js/hud-fenetres.js et complète Hud.
(() => {
const I = Fenetres.ICON;
const esc = s => Util.esc(s);
const svg = p => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${p}</svg>`;
const ICO = {
  tenues: svg('<path d="M10 5.5a2 2 0 1 1 2 2v1.6"/><path d="M12 9.1 3.6 15.2a1.5 1.5 0 0 0 .9 2.7h15a1.5 1.5 0 0 0 .9-2.7z"/>'),
  apparence: svg('<path d="M12 3a9 9 0 1 0 0 18c1.3 0 2-.8 2-1.9 0-1.5 1.1-2.3 2.5-2.3H18a3 3 0 0 0 3-3C21 7.2 17 3 12 3z"/><circle cx="7.5" cy="11.5" r="1"/><circle cx="10" cy="7.5" r="1"/><circle cx="15" cy="7.5" r="1"/>'),
  corbeille: svg('<path d="M4 7h16M9 7V4.5h6V7M6.5 7l1 13h9l1-13M10 11v5.5M14 11v5.5"/>'),
  vendre: svg('<circle cx="12" cy="12" r="8.5"/><path d="M14.8 8.8c-.5-.9-1.5-1.3-2.8-1.3-1.7 0-2.9.8-2.9 2.1 0 2.9 6 1.6 6 4.6 0 1.3-1.3 2.3-3.1 2.3-1.4 0-2.5-.5-3-1.5M12 5.5v1.7M12 17v1.6"/>'),
  cadenas: svg('<rect x="6" y="11" width="12" height="9" rx="1.6"/><path d="M8.5 11V8a3.5 3.5 0 0 1 7 0v3"/>'),
  ecaille: svg('<path d="M12 3.5c3.6 1.8 5.5 4.6 5.5 8.3 0 3.6-2.4 6.6-5.5 8.7-3.1-2.1-5.5-5.1-5.5-8.7 0-3.7 1.9-6.5 5.5-8.3z"/><path d="M12 8.5v7M9.4 12.2 12 14.6l2.6-2.4"/>'),
  fils: svg('<rect x="6" y="3.5" width="12" height="2.6" rx="1"/><rect x="6" y="17.9" width="12" height="2.6" rx="1"/><path d="M8.5 9h7M8.5 12h7M8.5 15h7"/>'),
  precedent: svg('<path d="M15 5l-7 7 7 7"/>'),
  suivant: svg('<path d="M9 5l7 7-7 7"/>'),
  ok: svg('<path d="M5 12.5l4.5 4.5L19 7.5"/>'),
  non: svg('<path d="M7 7l10 10M17 7 7 17"/>'),
};

// Emplacements de la poupée : le cou, les doigts, la taille à gauche ; la tête, le dos, la main,
// les pieds à droite. Les noms viennent de js/items.js (Items.EQUIP_SLOTS).
const LABEL = { coiffe: 'Coiffe', cape: 'Cape', amulette: 'Amulette', anneau1: 'Anneau', anneau2: 'Anneau', ceinture: 'Ceinture', bottes: 'Bottes', arme: 'Arme' };
const KIND = slot => ({ kind: slot === 'arme' ? 'weapon' : 'equip', slot: slot.startsWith('anneau') ? 'anneau' : slot });
const GAUCHE = ['amulette', 'anneau1', 'anneau2', 'ceinture'];
const DROITE = ['coiffe', 'cape', 'arme', 'bottes'];
const MAX_ENSEMBLES = 6;
// Les six Écailles qu'un Veilleur pourra porter (docs/MONDE.md) ; celle d'Ithren est perdue.
const ECAILLES = ['Écaille d\'Aïven', 'Écaille de Durren', 'Écaille de Morrha', 'Écaille d\'Iskar', 'Écaille de Nohra', 'Écaille d\'Aube'];

// Onglets du sac : les sortes d'objets du jeu (celles de l'ancien Sac), puis les deux vues de la tenue.
const portable = d => d.kind === 'equip' || d.kind === 'weapon';
const ONGLETS = [
  ['tout', 'Tout', I.tout, () => true],
  ['equip', 'Équipement', Hud.picto({ kind: 'equip', slot: 'coiffe' }), d => d.kind === 'equip'],
  ['arme', 'Armes', Hud.picto({ kind: 'weapon' }), d => d.kind === 'weapon'],
  ['conso', 'Consommables', Hud.picto({ kind: 'consumable' }), d => d.kind === 'consumable'],
  ['res', 'Ressources', Hud.picto({ kind: 'resource' }), d => d.kind === 'resource'],
  ['noeud', 'Nœuds', Hud.picto({ kind: 'knot' }), d => d.kind === 'knot'],
];
const VUES = [['tenues', 'Tenues : panoplies et ensembles', ICO.tenues], ['apparence', 'Apparence : titre, cosmétiques, thème', ICO.apparence]];
const FILTRES = {
  tout: [['', 'Toutes catégories'], ['equip', 'Équipement'], ['arme', 'Armes'], ['conso', 'Consommables'], ['res', 'Ressources'], ['noeud', 'Nœuds']],
  equip: [['', 'Toutes catégories'], ['coiffe', 'Coiffes'], ['cape', 'Capes'], ['amulette', 'Amulettes'], ['anneau', 'Anneaux'], ['ceinture', 'Ceintures'], ['bottes', 'Bottes'], ['niveau', 'À mon niveau']],
  arme: [['', 'Toutes les armes']].concat(Object.keys(Items.WEAPON_TYPES).map(t => [t, Items.WEAPON_TYPES[t].label]), [['niveau', 'À mon niveau']]),
  conso: [['', 'Toutes catégories'], ['pain', 'Pains'], ['potion', 'Potions'], ['parchemin', 'Parchemins']],
  res: [['', 'Toutes catégories'], ['recolte', 'Récolte'], ['butin', 'Butin de monstre'], ['autre', 'Autres']],
  noeud: [['', 'Tous les Nœuds'], ['noue', 'Noués'], ['libre', 'Pas noués']],
};
const TRIS = [['recent', 'Récents'], ['niveau', 'Niveau'], ['rarete', 'Rareté'], ['nom', 'Nom']];
const TRI = {
  recent: (a, b) => b.ordre - a.ordre,
  niveau: (a, b) => (b.def.level || 0) - (a.def.level || 0) || a.def.name.localeCompare(b.def.name),
  nom: (a, b) => a.def.name.localeCompare(b.def.name),
  rarete: (a, b) => Items.RARITIES.indexOf(Items.rarity(b.def)) - Items.RARITIES.indexOf(Items.rarity(a.def)) || a.def.name.localeCompare(b.def.name),
};
const TYPE_CONSO = { pain: 'Pain', potion: 'Potion', parchemin: 'Parchemin' };
const typeObjet = d => d.kind === 'weapon' ? ((Items.WEAPON_TYPES[d.type] || {}).label || 'Arme') : d.kind === 'equip' ? (LABEL[d.slot === 'anneau' ? 'anneau1' : d.slot] || d.slot) : d.kind === 'knot' ? 'Nœud' : d.kind === 'consumable' ? (TYPE_CONSO[d.sub] || 'Consommable') : 'Ressource';
// L'objet va-t-il à cet emplacement ?
const va = (d, slot) => d.kind === 'weapon' ? slot === 'arme' : d.kind === 'equip' && (d.slot === 'anneau' ? slot.startsWith('anneau') : d.slot === slot);
const nf = n => Number(n).toLocaleString('fr-FR');
const element = el => DATA.elements[el] || DATA.elements.neutre;
// Pictogrammes des stats d'objet : caractéristiques, PA, PM, initiative, critique, dommages.
const picStat = k => Hud.pic(k, 15);

Object.assign(Hud.prototype, {
  initInventaire() {
    // La taille des pages suit la place : on recompte quand la fenêtre du navigateur change.
    if (!this.invRedim) {
      this.invRedim = () => {
        if (!this.fen || !this.fen.isOpen('sac')) return;
        cancelAnimationFrame(this.invRaf);
        this.invRaf = requestAnimationFrame(() => this.fen.render('sac'));
      };
      window.addEventListener('resize', this.invRedim);
    }
    // Tout équipement passé par le monde (fenêtre, ancien panneau) prévient les modules voisins.
    this.world.on('equip', d => {
      const def = Items.get(d.id);
      this.signal('itemEquipped', { id: d.id, slot: d.slot });
      if (def) this.chat('systeme', `Tu as équipé ${def.name}.`);
    });
  },

  // L'ancien Sac et l'ancienne fenêtre Personnage mènent ici.
  openSac() { this.openInventaire(); },
  openPerso() { this.openInventaire(); },

  openInventaire() {
    const s = this.inv = this.inv || { onglet: 'tout', filtre: '', q: '', tri: 'recent', page: 0, cols: 6, parPage: 30, sel: null, fiche: 'effets', facing: null, feuille: null };
    const ouvert = this.fen.isOpen('sac');
    if (!ouvert) s.feuille = null;
    // Le personnage regarde du même côté que sur la carte (ou que l'indique son apparence).
    if (s.facing == null) { const f = this.world.ch.facing != null ? this.world.ch.facing : this.world.player && this.world.player.facing; s.facing = f === -1 ? -1 : 1; }
    const ch = () => this.world.ch;
    const r = () => this.fen.render('sac');
    const actions = {
      onglet: d => { s.onglet = d.onglet; s.filtre = ''; s.page = 0; r(); },
      page: d => { s.page += Number(d.sens) || 0; r(); },
      pick: d => { if (this.invIgnore()) return; if (ch().has(d.id)) { s.sel = { de: 'sac', id: d.id }; r(); } },
      // Un emplacement vide montre dans le sac ce qui peut y aller.
      slot: d => {
        if (this.invIgnore()) return;
        s.sel = { de: 'slot', slot: d.slot };
        if (!ch().equipment[d.slot]) {
          if (d.slot === 'arme') { s.onglet = 'arme'; s.filtre = ''; } else { s.onglet = 'equip'; s.filtre = d.slot.startsWith('anneau') ? 'anneau' : d.slot; }
          s.page = 0;
        }
        r();
      },
      noeudSlot: d => { if (this.invIgnore()) return; s.sel = { de: 'noeud', id: d.id }; r(); },
      fiche: d => { s.fiche = d.fiche; r(); },
      // Sur téléphone en portrait, la fiche se pose sur la poupée : on la referme pour la revoir.
      ficheFermer: () => { s.sel = null; r(); },
      tourner: d => { const F = [1, -1]; s.facing = F[(F.indexOf(s.facing) + Number(d.sens) + F.length * 2) % F.length]; r(); },
      equiper: d => this.invEquiper(d.id),
      retirer: d => this.invRetirer(d.slot),
      utiliser: d => this.invUtiliser(d.id),
      nouer: d => this.invNouer(d.id),
      vendre: d => this.invVendre(d.id),
      detruire: d => { if (ch().has(d.id)) { s.feuille = { type: 'detruire', id: d.id, n: 1 }; r(); this.invFocusFeuille(); } },
      fN: d => { const f = s.feuille; if (!f) return; const max = ch().count(f.id); f.n = d.n === 'max' ? max : Math.max(1, Math.min(max, f.n + Number(d.n))); r(); },
      fOk: () => this.invDetruire(),
      fNon: () => { s.feuille = null; r(); },
      ensSave: () => { const x = ch().saveEnsemble(); this.toast(x.ok ? `Ensemble ${x.index + 1} enregistré.` : x.reason); this.world.emit('update'); },
      ensUse: d => { if (!this.invGarde()) return; const x = ch().useEnsemble(Number(d.i)); this.toast(x.ok ? (x.missing ? `Ensemble mis, ${x.missing} pièce(s) manquante(s).` : 'Ensemble mis.') : x.reason); this.world.emit('update'); },
      ensDel: d => { ch().deleteEnsemble(Number(d.i)); this.world.emit('update'); },
      theme: d => { this.applyTheme(d.theme); r(); },
    };
    const onField = (el, kind) => {
      if (el.id === 'inv-q' && kind === 'input') { s.q = el.value; s.page = 0; r(); }
      if (el.id === 'inv-filtre' && kind === 'change') { s.filtre = el.value; s.page = 0; r(); }
      if (el.id === 'inv-tri' && kind === 'change') { s.tri = el.value; s.page = 0; r(); }
      if (el.id === 'inv-titre' && kind === 'change') { const c = ch(); c.title = c.titles.includes(el.value) ? el.value : null; this.refreshBar(); r(); }
    };
    this.simpleWin('sac', 'Inventaire', () => this.renderInventaire(), actions, {
      width: 900, cls: 'vy-fenetre--inventaire', onField, annonce: 'inventaire',
      after: body => this.apresInventaire(body),
      // Échap ferme d'abord la feuille de confirmation.
      onEscape: () => { if (!s.feuille) return false; s.feuille = null; r(); return true; },
      onClose: () => { this.invFinGlisser(); this.syncMenus(); },
    });
  },

  renderInventaire() {
    const ch = this.world.ch;
    this.invVerifier(ch);
    return `<div class="vy-inv">${this.invPoupee(ch)}${this.invFiche(ch)}${this.invSac(ch)}</div>${this.inv.feuille ? this.invFeuille(ch) : ''}`;
  },

  // Le choix tient-il encore ? Un objet utilisé jusqu'au dernier disparaît ; un Nœud dénoué
  // redevient un objet du sac.
  invVerifier(ch) {
    const s = this.inv, x = s.sel;
    if (!x) return;
    if (x.de === 'sac' && !ch.has(x.id)) s.sel = null;
    if (x.de === 'noeud' && !ch.activeKnots().includes(x.id)) s.sel = ch.has(x.id) ? { de: 'sac', id: x.id } : null;
  },

  // L'objet choisi : { def, id, n, de, slot, porte, noue }, { vide: emplacement } ou null.
  invEntree(ch) {
    const x = this.inv.sel;
    if (!x) return null;
    if (x.de === 'slot') {
      const id = ch.equipment[x.slot], def = id && Items.get(id);
      return def ? { def, id, n: 1, de: 'slot', slot: x.slot, porte: true } : { vide: x.slot };
    }
    const def = Items.get(x.id);
    if (!def) return null;
    return { def, id: x.id, n: ch.count(x.id), de: x.de, noue: ch.activeKnots().includes(x.id) };
  },

  // ----- La poupée -----

  invPoupee(ch) {
    const s = this.inv, cls = ch.classDef;
    const col = slots => slots.map(sl => this.invSlot(ch, sl)).join('');
    const actifs = ch.activeKnots();
    const noeuds = [];
    for (let i = 0; i < DATA.rules.maxKnots; i++) {
      const id = actifs[i], k = id && (DATA.knots || []).find(x => x.id === id);
      const choisi = k && s.sel && s.sel.de === 'noeud' && s.sel.id === id;
      noeuds.push(k
        ? `<button class="vy-case vy-inv__slot vy-inv__noeud${choisi ? ' est-choisie' : ''}" data-rarete="epique" data-act="noeudSlot" data-id="${k.id}" data-depot="noeud" data-glisse="noeud" title="${esc(k.name)} : ${esc(k.desc)}" aria-label="Nœud noué : ${esc(k.name)}"><span class="vy-case__icone">${Hud.picto({ kind: 'knot' })}</span></button>`
        : `<span class="vy-case vy-case--emplacement vy-inv__slot vy-inv__noeud" data-depot="noeud" title="Nœud : libre. Glisse un Nœud ici pour le nouer." aria-label="Nœud libre"><span class="vy-case__icone">${Hud.picto({ kind: 'knot' })}</span></span>`);
    }
    const ecailles = ECAILLES.map(n => `<span class="vy-case vy-inv__ecaille" title="${n} : bientôt" aria-label="${n}, bientôt" aria-disabled="true"><span class="vy-case__icone">${ICO.ecaille}</span><span class="vy-inv__cadenas">${ICO.cadenas}</span></span>`).join('');
    return `<section class="vy-inv__poupee" aria-label="Équipement porté">
      <div class="vy-inv__col">${col(GAUCHE)}</div>
      <div class="vy-inv__perso" data-depot="poupee">
        <canvas class="vy-inv__cv" role="img" aria-label="${esc(ch.name)}, ${esc(cls.name)}"></canvas>
        <button class="vy-inv__tourne vy-inv__tourne--g" data-act="tourner" data-sens="-1" aria-label="Tourner le personnage vers la gauche" title="Tourner">${I.tourneG}</button>
        <button class="vy-inv__tourne vy-inv__tourne--d" data-act="tourner" data-sens="1" aria-label="Tourner le personnage vers la droite" title="Tourner">${I.tourneD}</button>
        <div class="vy-inv__nom">${esc(ch.name)}<small>${esc(cls.name)} · niv. ${ch.level}${ch.title ? ` · ${esc(ch.title)}` : ''}</small></div>
      </div>
      <div class="vy-inv__col">${col(DROITE)}</div>
      <div class="vy-inv__rangee">
        <div class="vy-inv__groupe"><div class="vy-inv__noeuds" title="Nœuds noués : chacun durcit les combats et ajoute ${DATA.rules.knotBonus} % d'XP et de butin">${noeuds.join('')}</div><small>Nœuds ${actifs.length} / ${DATA.rules.maxKnots}</small></div>
        <div class="vy-inv__groupe"><div class="vy-inv__ecailles">${ecailles}</div><small>Écailles · <span class="vy-bientot">bientôt</span></small></div>
      </div>
    </section>`;
  },

  invSlot(ch, slot) {
    const id = ch.equipment[slot], def = id && Items.get(id);
    const s = this.inv, choisi = s.sel && s.sel.de === 'slot' && s.sel.slot === slot ? ' est-choisie' : '';
    if (!def) return `<button class="vy-case vy-case--emplacement vy-inv__slot${choisi}" data-act="slot" data-slot="${slot}" data-depot="slot" title="${LABEL[slot]} : vide" aria-label="${LABEL[slot]}, vide"><span class="vy-case__icone">${Hud.picto(KIND(slot))}</span></button>`;
    return `<button class="vy-case vy-inv__slot${choisi}" data-rarete="${Items.rarity(def)}" data-act="slot" data-slot="${slot}" data-depot="slot" data-glisse="slot" title="${esc(def.name)} (${LABEL[slot]}). Toucher deux fois ou glisser vers le sac : retirer." aria-label="${LABEL[slot]} : ${esc(def.name)}"><span class="vy-case__icone">${Hud.picto(def)}</span><span class="vy-case__niveau">${def.level}</span></button>`;
  },

  // Le personnage, peint par le moteur (renderer.painter.drawBody) et tourné par les flèches.
  // L'apparence, le genre et l'orientation sont transmis au peintre ; celui qui ne les connaît pas
  // les ignore. Comme sur la carte (drawSprite), l'orientation retourne la figure.
  dessinerPoupee(body) {
    const cv = body.querySelector('.vy-inv__cv');
    if (!cv) return;
    const W = cv.clientWidth, H = cv.clientHeight;
    if (!W || !H) return;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr);
    const c = cv.getContext('2d');
    c.setTransform(dpr, 0, 0, dpr, 0, 0);
    const ch = this.world.ch, cls = ch.classDef, sol = H - Math.max(22, H * 0.13);
    const S = Math.max(1, Math.min(W / 52, (sol - 6) / 66));
    const halo = c.createRadialGradient(W / 2, sol - 30 * S, 4, W / 2, sol - 30 * S, Math.max(W, H) * 0.62);
    halo.addColorStop(0, 'rgba(0,194,255,0.17)'); halo.addColorStop(1, 'rgba(0,194,255,0)');
    c.fillStyle = halo; c.fillRect(0, 0, W, H);
    c.fillStyle = 'rgba(0,0,0,0.38)'; c.beginPath(); c.ellipse(W / 2, sol, 17 * S, 4.4 * S, 0, 0, Math.PI * 2); c.fill();
    const painter = this.renderer && (this.renderer.painter || this.renderer);
    if (!painter || typeof painter.drawBody !== 'function') {
      c.fillStyle = cls.color; c.font = `700 ${Math.round(H * 0.3)}px Cinzel, Georgia, serif`; c.textAlign = 'center'; c.textBaseline = 'middle';
      c.fillText(cls.glyph, W / 2, H * 0.48);
      return;
    }
    const f = this.inv.facing === -1 ? -1 : 1;
    c.save(); c.translate(W / 2, sol); c.scale(S * f, S); c.lineJoin = 'round'; c.lineCap = 'round';
    try { painter.drawBody(c, { x: 0, y: 0 }, { shape: 'player', color: cls.color, glyph: cls.glyph, team: 'player', look: ch.look, gender: ch.gender, facing: f }); } catch (e) { /* le peintre n'est pas prêt */ }
    c.restore();
  },

  // ----- La fiche de l'objet choisi -----

  invFiche(ch) {
    const e = this.invEntree(ch);
    if (!e) return '<section class="vy-inv__fiche vy-inv__fiche--vide" aria-live="polite"><p class="vy-inv__invite">Sélectionne un objet</p><p class="vy-inv__astuce">Touche-le deux fois ou glisse-le sur ton personnage pour t\'en équiper.</p></section>';
    if (e.vide) return `<section class="vy-inv__fiche vy-inv__fiche--vide" aria-live="polite"><p class="vy-inv__invite">${LABEL[e.vide]} : vide</p><p class="vy-inv__astuce">Le sac montre ce qui va ici : touche un objet deux fois, ou glisse-le sur l'emplacement.</p></section>`;
    const s = this.inv, d = e.def, r = Items.rarity(d);
    const set = d.set ? Items.getSet(d.set) : null;
    const onglets = [['effets', 'Effets', 'Effets'], ['conditions', 'Conditions', 'Cond.'], ['caracs', 'Caractéristiques', 'Caract.']].concat(set ? [['panoplie', 'Panoplie', 'Pano.']] : []);
    const fiche = onglets.some(o => o[0] === s.fiche) ? s.fiche : 'effets';
    const tabs = onglets.map(([k, l, court]) => `<button class="vy-inv__fiche-onglet${fiche === k ? ' on' : ''}" data-act="fiche" data-fiche="${k}" role="tab" aria-selected="${fiche === k}" title="${l}"><span class="long">${l}</span><span class="court" aria-hidden="true">${court}</span></button>`).join('');
    const contenu = fiche === 'conditions' ? this.invConditions(ch, e) : fiche === 'caracs' ? this.invCaracs(ch, e) : fiche === 'panoplie' ? this.invPanoplie(ch, e) : this.invEffets(ch, e);
    const etat = [e.n > 1 ? `×${e.n}` : '', e.porte ? 'porté' : '', e.noue ? 'noué' : ''].filter(Boolean).join(' · ');
    return `<section class="vy-inv__fiche" data-rarete="${r}" aria-label="Fiche : ${esc(d.name)}">
      <header class="vy-inv__fiche-tete"><h3 class="vy-inv__fiche-nom">${esc(d.name)}</h3><span class="vy-inv__fiche-niv">Niv. ${d.level || 1}</span><button class="vy-fenetre__bouton vy-inv__fiche-fermer" data-act="ficheFermer" aria-label="Fermer la fiche, revoir le personnage">${I.fermer}</button></header>
      <div class="vy-inv__fiche-barre"><span class="vy-inv__fiche-type"><span class="vy-badge-rarete">${Items.RARITY_LABEL[r]}</span><span>${esc(typeObjet(d))}${etat ? ' · ' + etat : ''}</span></span>
        <nav class="vy-inv__fiche-onglets" role="tablist" aria-label="Fiche de l'objet">${tabs}</nav></div>
      <div class="vy-inv__fiche-corps"><span class="vy-case vy-inv__fiche-icone" data-rarete="${r}" aria-hidden="true"><span class="vy-case__icone">${Hud.picto(d)}</span></span>
        <div class="vy-inv__fiche-lignes" data-defile="fiche-${fiche}" role="tabpanel">${contenu}</div></div>
      <footer class="vy-inv__fiche-actions">${this.invActions(ch, e)}</footer>
    </section>`;
  },

  invEffets(ch, e) {
    const d = e.def, L = [];
    const li = (txt, val, cls) => `<li${cls ? ` class="${cls}"` : ''}><span>${txt}</span>${val != null ? `<b>${val}</b>` : ''}</li>`;
    if (d.spell) for (const ef of d.spell.effects) {
      const el = element(d.spell.element);
      L.push(li(`<span class="vy-pastille" style="--c:${el.color}"></span>Dégâts ${el.label.toLowerCase()}`, `${ef.min} à ${ef.max}`, 'vy-inv__degats'));
    }
    for (const k of ['pa', 'pm', 'vita', 'sagesse', 'force', 'intel', 'chance', 'agi', 'init', 'crit', 'dmg']) {
      const v = (d.stats || {})[k];
      if (v) L.push(li(`${picStat(k)}${Items.STAT_LABEL[k]}`, `${v > 0 ? '+' : ''}${v}${k === 'crit' ? ' %' : ''}`, v < 0 ? 'neg' : ''));
    }
    if (d.kind === 'consumable') {
      if (d.sub === 'pain') L.push(li(`${Hud.pic('pv', 15)}Rend`, `${d.heal} PV`));
      if (d.sub === 'potion') L.push(d.heal ? li(`${Hud.pic('pv', 15)}Rend`, 'tous les PV') : li('Ramène au dernier Relais du Fil'));
      if (d.sub === 'parchemin') L.push(li(`${picStat(d.stat)}${Items.STAT_LABEL[d.stat]} de base, gratuits`, `+${d.value}`));
    }
    if (d.kind === 'knot') {
      const k = (DATA.knots || []).find(x => x.id === d.id);
      if (k) L.push(li(esc(k.desc)));
      L.push(li('XP et chances de butin', `+${DATA.rules.knotBonus} %`));
    }
    if (d.kind === 'resource') L.push(li('Ressource d\'artisanat', `${Items.recipes().filter(x => x.ingredients.some(i => i.id === d.id)).length} recette(s)`));
    if (!L.length) L.push(li('Aucun effet'));
    return `<ul class="vy-inv__liste">${L.join('')}</ul>${d.lore ? `<p class="vy-inv__recit">${esc(d.lore)}</p>` : ''}`;
  },

  invConditions(ch, e) {
    const d = e.def, L = [];
    const cond = (ok, txt, val) => `<li class="${ok ? 'ok' : 'ko'}"><span>${ok ? ICO.ok : ICO.non}${txt}</span>${val ? `<b>${val}</b>` : ''}</li>`;
    const info = (txt, val) => `<li><span>${txt}</span>${val ? `<b>${val}</b>` : ''}</li>`;
    if (portable(d) || d.kind === 'knot') {
      const ok = (d.level || 1) <= ch.level;
      L.push(cond(ok, `Niveau ${d.level || 1}`, ok ? `tu es niveau ${ch.level}` : `encore ${d.level - ch.level} niveau${d.level - ch.level > 1 ? 'x' : ''}`));
    }
    if (portable(d)) L.push(info('Emplacement', d.kind === 'weapon' ? 'Arme' : d.slot === 'anneau' ? 'Anneau (deux places)' : LABEL[d.slot]));
    if (d.kind === 'consumable') {
      L.push(info('Hors combat'));
      if (d.sub === 'pain') L.push(info('Sans effet si tes PV sont au maximum'));
      if (d.sub === 'parchemin') { const lu = (ch.scrolls || {})[d.stat] || 0, max = DATA.rules.scrollMax; L.push(cond(lu < max, `${max} au plus par caractéristique`, `${lu} / ${max} en ${Items.STAT_LABEL[d.stat]}`)); }
    }
    if (d.kind === 'knot') {
      const n = ch.activeKnots().length, max = DATA.rules.maxKnots;
      L.push(cond(e.noue || n < max, `${max} Nœuds noués au plus`, `${n} / ${max}`));
      L.push(info('Nouer ne le consomme pas'));
    }
    if (d.kind === 'resource') L.push(info('Aucune'));
    return `<ul class="vy-inv__liste vy-inv__conditions">${L.join('')}</ul>`;
  },

  // Caractéristiques : pour une arme, ce que le moteur en fait (coût, lancers, portée, zone,
  // critique) ; pour tout objet, sa sorte, sa provenance et sa revente. Le moteur n'a pas de bonus
  // de critique propre à l'arme : seule la chance du personnage et le × 1,5 sont montrés.
  invCaracs(ch, e) {
    const d = e.def, L = [];
    const li = (txt, val) => `<li><span>${txt}</span><b>${val}</b></li>`;
    if (d.spell) {
      const sp = d.spell, dd = ch.derived();
      const lancers = Math.floor(dd.pa / sp.pa);
      L.push(li(`${Hud.pic('pa', 15)}Coût`, `${sp.pa} PA`));
      L.push(li('Utilisations par tour', sp.maxPerTurn ? sp.maxPerTurn : `${lancers} avec tes ${dd.pa} PA`));
      L.push(li('Portée', sp.range[0] === sp.range[1] ? sp.range[0] : `${sp.range[0]} à ${sp.range[1]}`));
      L.push(li('Ligne de vue', sp.los ? 'requise' : 'non'));
      L.push(li('Zone', sp.aoe && sp.aoe.shape === 'cross' ? 'en croix, alliés compris' : 'une cible'));
      if (sp.effects.length > 1) L.push(li('Coups', sp.effects.length));
      if (sp.lifesteal) L.push(li('Vol de vie', `${sp.lifesteal} %`));
      L.push(li(`${Hud.pic('crit', 15)}Coups critiques`, `${dd.crit} % de chance, dégâts × 1,5`));
    }
    L.push(li('Type', typeObjet(d)));
    L.push(li('Rareté', Items.RARITY_LABEL[Items.rarity(d)]));
    if (d.set) L.push(li('Panoplie', esc(Items.getSet(d.set).name)));
    const rec = Items.recipeFor(d.id);
    if (rec) L.push(li('Fabrication', `atelier : ${esc(rec.workshop)}`));
    if (d.from && DATA.monsters[d.from]) L.push(li('Tombe sur', esc(DATA.monsters[d.from].name)));
    if (d.kind === 'resource') {
      const mons = [...new Set((d.drops || []).map(x => DATA.monsters[x.monster] && DATA.monsters[x.monster].name).filter(Boolean))];
      if (mons.length) L.push(li('Tombe sur', esc(mons.slice(0, 3).join(', ')) + (mons.length > 3 ? '…' : '')));
      if (d.node) L.push(li('Se récolte', 'sur les cartes'));
    }
    L.push(li('Revente', `${Items.sellPrice(d)} Fils, chez un marchand`));
    return `<ul class="vy-inv__liste">${L.join('')}</ul>`;
  },

  // Panoplie : les pièces (portées en or) et les bonus par nombre de pièces, l'actuel en avant.
  invPanoplie(ch, e) {
    const set = Items.getSet(e.def.set);
    if (!set) return '';
    const n = ch.derived().setCount[set.id] || 0;
    const pieces = set.pieces.map(id => {
      const p = Items.get(id), porte = Items.EQUIP_SLOTS.some(sl => ch.equipment[sl] === id);
      return `<li class="${porte ? 'porte' : ''}"><span><i class="vy-inv__losange" aria-hidden="true"></i>${esc(p.name)}</span><small>${porte ? 'portée' : ch.has(id) ? 'dans le sac' : ''}</small></li>`;
    }).join('');
    const bonus = Object.keys(set.bonuses).map(k => `<li class="${Number(k) === n ? 'actif' : ''}"><span>${k} pièces</span><b>${Items.statLines(set.bonuses[k]).join(', ')}</b></li>`).join('');
    return `<p class="vy-inv__pano-titre"><b>${esc(set.name)}</b><span>${n} / ${set.pieces.length} portée${n > 1 ? 's' : ''}</span></p>
      <ul class="vy-inv__liste vy-inv__pieces">${pieces}</ul><ul class="vy-inv__liste vy-inv__bonus">${bonus}</ul>`;
  },

  // Actions : l'action principale (équiper, utiliser, nouer, retirer), puis vendre (chez un
  // marchand seulement, comme aujourd'hui) et détruire.
  invActions(ch, e) {
    const d = e.def, B = [];
    const principal = (act, label, extra, off) => `<button class="vy-bouton vy-bouton--primaire vy-bouton--petit vy-inv__action" data-act="${act}" ${extra}${off ? ' disabled' : ''}>${label}</button>`;
    const icone = (act, ico, label, extra, cls) => `<button class="vy-bouton vy-bouton--petit vy-bouton--icone${cls ? ' ' + cls : ''}" data-act="${act}" ${extra} aria-label="${label}" title="${label}">${ico}</button>`;
    if (e.de === 'slot') B.push(principal('retirer', 'Retirer', `data-slot="${e.slot}"`));
    else if (e.de === 'noeud') B.push(principal('nouer', 'Dénouer', `data-id="${d.id}"`));
    else if (portable(d)) {
      const c = ch.canEquip(d.id);
      B.push(principal('equiper', 'Équiper', `data-id="${d.id}"`, !c.ok));
      if (!c.ok) B.push(`<span class="vy-inv__raison">${esc(c.reason)}</span>`);
    } else if (d.kind === 'consumable') B.push(principal('utiliser', 'Utiliser', `data-id="${d.id}"`));
    else if (d.kind === 'knot') B.push(principal('nouer', e.noue ? 'Dénouer' : 'Nouer', `data-id="${d.id}"`));
    if (e.de === 'sac') {
      B.push('<span class="vy-inv__espace"></span>');
      if (this.invMarchand()) B.push(icone('vendre', ICO.vendre, `Vendre 1 pour ${Items.sellPrice(d)} Fils`, `data-id="${d.id}"`));
      B.push(icone('detruire', ICO.corbeille, 'Détruire', `data-id="${d.id}"`, 'vy-bouton--danger'));
    }
    return B.join('');
  },

  // ----- Le sac -----

  invSac(ch) {
    const s = this.inv;
    const ids = Object.keys(ch.inventory);
    const tab = (k, l, ico, n) => `<button class="vy-inv__onglet${s.onglet === k ? ' on' : ''}" data-act="onglet" data-onglet="${k}" role="tab" aria-selected="${s.onglet === k}" aria-label="${l}${n != null ? ` (${n})` : ''}" title="${l}${n != null ? ` (${n})` : ''}">${ico}</button>`;
    const tabs = ONGLETS.map(([k, l, ico, f]) => tab(k, l, ico, ids.filter(id => { const d = Items.get(id); return d && f(d); }).length)).join('') +
      '<span class="vy-inv__sep" aria-hidden="true"></span>' + VUES.map(([k, l, ico]) => tab(k, l, ico)).join('');
    const corps = s.onglet === 'tenues' ? this.invTenues(ch) : s.onglet === 'apparence' ? this.invApparence(ch) : this.invGrille(ch);
    return `<section class="vy-inv__sac" data-depot="sac" aria-label="Sac"><nav class="vy-inv__onglets" role="tablist" aria-label="Catégories du sac">${tabs}</nav>${corps}</section>`;
  },

  // Sous-catégorie choisie dans le filtre.
  invFiltre(ch, d) {
    const f = this.inv.filtre;
    if (!f) return true;
    switch (this.inv.onglet) {
      case 'tout': return (ONGLETS.find(o => o[0] === f) || ONGLETS[0])[3](d);
      case 'equip': return f === 'niveau' ? d.level <= ch.level : d.slot === f;
      case 'arme': return f === 'niveau' ? d.level <= ch.level : d.type === f;
      case 'conso': return d.sub === f;
      case 'res': return f === 'recolte' ? !!d.node : f === 'butin' ? !d.node && (d.drops || []).length > 0 : !d.node && !(d.drops || []).length;
      case 'noeud': return (f === 'noue') === ch.activeKnots().includes(d.id);
      default: return true;
    }
  },

  // Les objets de l'onglet, filtrés, cherchés et triés.
  invListe(ch) {
    const s = this.inv, onglet = ONGLETS.find(o => o[0] === s.onglet) || ONGLETS[0];
    const q = s.q.trim().toLowerCase();
    const list = Object.keys(ch.inventory).map((id, i) => ({ id, n: ch.inventory[id], def: Items.get(id), ordre: i }))
      .filter(e => e.def && onglet[3](e.def) && this.invFiltre(ch, e.def) && (!q || e.def.name.toLowerCase().includes(q)));
    return list.sort(TRI[s.tri] || TRI.recent);
  },

  invGrille(ch) {
    const s = this.inv;
    const list = this.invListe(ch);
    const pages = Math.max(1, Math.ceil(list.length / s.parPage));
    s.page = Math.max(0, Math.min(pages - 1, s.page));
    const knots = ch.activeKnots();
    const choisi = s.sel && s.sel.de === 'sac' ? s.sel.id : null;
    const cells = list.slice(s.page * s.parPage, (s.page + 1) * s.parPage).map(e => {
      const d = e.def, r = Items.rarity(d);
      const bloque = portable(d) && !ch.canEquip(e.id).ok;
      const aide = portable(d) ? 'toucher deux fois ou glisser sur le personnage : équiper' : d.kind === 'consumable' ? 'toucher deux fois : utiliser' : d.kind === 'knot' ? 'toucher deux fois : nouer' : '';
      return `<button class="vy-case vy-inv__case${bloque ? ' vy-case--bloquee' : ''}" data-rarete="${r}" data-act="pick" data-id="${e.id}" data-glisse="sac" role="option" aria-selected="${e.id === choisi}" aria-label="${esc(d.name)}${e.n > 1 ? ', ' + e.n : ''}" title="${esc(d.name)}${aide ? ` (${aide})` : ''}">` +
        `<span class="vy-case__icone">${Hud.picto(d)}</span>${d.level > 1 ? `<span class="vy-case__niveau">${d.level}</span>` : ''}${e.n > 1 ? `<span class="vy-case__nombre">${e.n}</span>` : ''}${knots.includes(e.id) ? '<span class="vy-case__porte" title="Noué"></span>' : ''}</button>`;
    });
    while (cells.length < s.parPage) cells.push('<span class="vy-case vy-case--vide" aria-hidden="true"></span>');
    const filtres = (FILTRES[s.onglet] || []).map(([v, l]) => `<option value="${v}"${s.filtre === v ? ' selected' : ''}>${l}</option>`).join('');
    const tris = TRIS.map(([v, l]) => `<option value="${v}"${s.tri === v ? ' selected' : ''}>${l}</option>`).join('');
    const total = Object.values(ch.inventory).reduce((a, n) => a + n, 0);
    return `<div class="vy-inv__outils">
        <select id="inv-filtre" aria-label="Filtrer" title="Filtrer">${filtres}</select>
        <label class="vy-recherche vy-inv__recherche">${I.recherche}<input id="inv-q" type="search" placeholder="Rechercher…" value="${esc(s.q)}" aria-label="Rechercher dans le sac"></label>
        <select id="inv-tri" aria-label="Trier" title="Trier">${tris}</select></div>
      <div class="vy-inv__grille" role="listbox" aria-label="Contenu du sac" style="--cols:${s.cols}">${cells.join('')}${list.length ? '' : `<p class="vy-inv__rien">${s.q.trim() || s.filtre ? 'Aucun objet ne correspond.' : 'Rien ici pour l\'instant.'}</p>`}</div>
      <footer class="vy-inv__pied">
        <span class="vy-inv__pages"><button class="vy-inv__page" data-act="page" data-sens="-1" ${s.page > 0 ? '' : 'disabled'} aria-label="Page précédente">${ICO.precedent}</button><b>${s.page + 1} / ${pages}</b><button class="vy-inv__page" data-act="page" data-sens="1" ${s.page < pages - 1 ? '' : 'disabled'} aria-label="Page suivante">${ICO.suivant}</button></span>
        <span class="vy-inv__compte">${total} objet${total > 1 ? 's' : ''}</span>
        <span class="vy-inv__fils" title="Les Fils, la monnaie de Veylan">${ICO.fils}<b>${nf(ch.fils)}</b> Fils</span>
      </footer>`;
  },

  // Tenues : les panoplies portées (bonus actuel et suivant) et les ensembles enregistrés.
  invTenues(ch) {
    const dd = ch.derived();
    const sets = Object.keys(dd.setCount).map(id => Items.getSet(id)).filter(Boolean).map(set => {
      const n = dd.setCount[set.id], b = set.bonuses[n], next = set.bonuses[n + 1];
      return `<div class="vy-inv__pano"><div class="vy-inv__pano-titre"><b>${esc(set.name)}</b><span>${n} / ${set.pieces.length}</span></div>
        <p>${b ? Items.statLines(b).join(', ') : 'Pas encore de bonus'}</p>${next ? `<small>${n + 1} pièces : ${Items.statLines(next).join(', ')}</small>` : ''}</div>`;
    }).join('');
    const list = ch.ensembles || [];
    const ens = list.map((e, i) => `<span class="vy-ensemble"><button class="vy-bouton vy-bouton--petit" data-act="ensUse" data-i="${i}" title="Mettre l'ensemble ${i + 1} (${Object.keys(e).length} pièce${Object.keys(e).length > 1 ? 's' : ''})">Ensemble ${i + 1}</button><button class="vy-ensemble__suppr" data-act="ensDel" data-i="${i}" aria-label="Supprimer l'ensemble ${i + 1}">${I.fermer}</button></span>`).join('');
    return `<div class="vy-inv__vue" data-defile="tenues">
      <div class="vy-sous"><span>Panoplies portées</span></div>
      ${sets || '<p class="muted vy-note">Aucune pièce de panoplie portée. Deux pièces d\'une même panoplie donnent un bonus, la panoplie complète le plus grand.</p>'}
      <div class="vy-sous"><span>Ensembles</span><span class="muted">${list.length} / ${MAX_ENSEMBLES}</span></div>
      <div class="vy-ensembles">${ens}<button class="vy-bouton vy-bouton--petit vy-bouton--fantome" data-act="ensSave" ${list.length >= MAX_ENSEMBLES ? 'disabled' : ''}>${I.plus} Enregistrer la tenue</button></div>
      <p class="muted vy-note">Un ensemble garde la tenue portée ; le remettre rééquipe chaque pièce encore dans ton sac.</p>
    </div>`;
  },

  // Apparence : le titre affiché, les cosmétiques (à venir) et le thème de l'interface.
  invApparence(ch) {
    const titres = ch.titles.length
      ? `<select id="inv-titre" aria-label="Titre affiché"><option value="">aucun</option>${ch.titles.map(t => `<option ${ch.title === t ? 'selected' : ''}>${esc(t)}</option>`).join('')}</select>`
      : '<p class="muted vy-note">Les succès donnent des titres.</p>';
    const actuel = document.getElementById('app').dataset.uiTheme;
    const themes = Hud.THEMES.map(([id, label, fond, accent]) => `<button class="vy-theme${actuel === id ? ' on' : ''}" data-act="theme" data-theme="${id}" aria-pressed="${actuel === id}"><span class="vy-theme__apercu" style="--f:${fond};--a:${accent}"></span>${label}</button>`).join('');
    return `<div class="vy-inv__vue" data-defile="apparence">
      <div class="vy-sous"><span>Titre affiché</span></div>${titres}
      <div class="vy-sous"><span>Cosmétiques</span><span class="vy-bientot">bientôt</span></div>
      <p class="muted vy-note">Les tenues et teintures arriveront avec la boutique de cosmétiques : jamais de puissance à vendre, seulement de l'allure.</p>
      <div class="vy-sous"><span>Thème de l'interface</span></div><div class="vy-themes">${themes}</div>
    </div>`;
  },

  // Détruire : une feuille de confirmation, avec la quantité s'il y en a plusieurs, et un mot si
  // une quête en cours se sert de l'objet.
  invFeuille(ch) {
    const f = this.inv.feuille, d = Items.get(f.id), n = ch.count(f.id);
    if (!d || !n) { this.inv.feuille = null; return ''; }
    f.n = Math.max(1, Math.min(n, f.n));
    const quete = Object.keys(ch.quests.active).map(id => Quests.get(id)).find(q => q && ((q.startItems || []).some(it => it.id === f.id) || q.steps.some(st => st.type === 'collect' && st.item === f.id)));
    const pas = n > 1 ? `<div class="vy-pas" role="group" aria-label="Quantité à détruire">
        <button class="vy-pas__bouton" data-act="fN" data-n="-1" aria-label="Un de moins" ${f.n > 1 ? '' : 'disabled'}>${I.moins}</button>
        <output class="vy-pas__valeur" aria-live="polite">${f.n}</output>
        <button class="vy-pas__bouton" data-act="fN" data-n="1" aria-label="Un de plus" ${f.n < n ? '' : 'disabled'}>${I.plus}</button>
        <button class="vy-bouton vy-bouton--petit vy-bouton--fantome" data-act="fN" data-n="max">Tout (${n})</button></div>` : '';
    return `<div class="vy-feuille-fond" data-act="fNon"></div>
      <section class="vy-feuille" role="alertdialog" aria-modal="true" aria-labelledby="inv-feuille-titre" aria-describedby="inv-feuille-texte">
        <header class="vy-feuille__tete"><h3 id="inv-feuille-titre">Détruire un objet</h3><button class="vy-fenetre__bouton" data-act="fNon" aria-label="Annuler">${I.fermer}</button></header>
        <div class="vy-feuille__objet"><span class="vy-case" data-rarete="${Items.rarity(d)}" aria-hidden="true"><span class="vy-case__icone">${Hud.picto(d)}</span></span>
          <p id="inv-feuille-texte">Détruire <b>${esc(d.name)}</b>${f.n > 1 ? ` ×${f.n}` : ''} ? Un objet détruit disparaît pour de bon.${quete ? ` <span class="vy-feuille__alerte">La quête « ${esc(quete.name)} » s'en sert.</span>` : ''}</p></div>
        ${pas}
        <footer class="vy-feuille__pied"><button class="vy-bouton vy-bouton--petit vy-bouton--fantome" data-act="fNon">Annuler</button><button class="vy-bouton vy-bouton--petit vy-bouton--danger" data-act="fOk">${ICO.corbeille}Détruire${f.n > 1 ? ' ' + f.n : ''}</button></footer>
      </section>`;
  },

  // La feuille prend le focus (clavier, lecteur d'écran) : Annuler d'abord, rien ne part par erreur.
  invFocusFeuille() {
    const w = this.fen.wins.get('sac'), b = w && w.body.querySelector('.vy-feuille__pied [data-act="fNon"]');
    if (b) b.focus({ preventScroll: true });
  },

  // ----- Les gestes -----

  invGarde() {
    if (this.world.state === 'combat') { this.toast('Pas pendant un combat.'); return false; }
    return true;
  },

  // Un marchand est-il ouvert ? On ne vend qu'à lui, comme dans sa boutique (js/hud.js).
  invMarchand() {
    const n = this.world.talkNpc;
    return !!(n && n.def && n.def.shop && this.world.state !== 'combat');
  },

  // Équipe depuis le sac ; `slot` : l'emplacement visé (objet glissé dessus).
  invEquiper(id, slot) {
    const d = Items.get(id);
    if (!d || !portable(d) || !this.invGarde()) return false;
    if (slot && !va(d, slot)) { this.toast(`${d.name} ne va pas à cet emplacement.`); return false; }
    const r = this.world.equip(id, slot);
    if (!r) return false;
    this.inv.sel = { de: 'slot', slot: r.slot };
    this.fen.render('sac');
    return true;
  },

  invRetirer(slot) {
    const ch = this.world.ch, id = ch.equipment[slot];
    if (!id || !this.invGarde() || !ch.unequip(slot)) return false;
    this.inv.sel = { de: 'sac', id };
    this.invAllerA(id);
    this.chat('systeme', `Tu as retiré ${Items.get(id).name}.`);
    this.world.emit('update');
    return true;
  },

  invUtiliser(id) {
    if (!this.invGarde()) return false;
    return this.world.useItem(id);
  },

  // Noue ou dénoue ; `veut` : seulement nouer (vrai) ou seulement dénouer (faux).
  invNouer(id, veut) {
    const ch = this.world.ch, noue = ch.activeKnots().includes(id);
    if (veut === true && noue) return false;
    if (veut === false && !noue) return false;
    const r = ch.toggleKnot(id);
    if (!r.ok) { this.toast(r.reason); return false; }
    this.inv.sel = r.on ? { de: 'noeud', id } : { de: 'sac', id };
    this.world.emit('update');
    return true;
  },

  invVendre(id) {
    if (!this.invMarchand() || !this.invGarde()) return false;
    const d = Items.get(id);
    if (!this.world.sell(id, 1)) return false;
    this.toast(`${d.name} vendu : +${Items.sellPrice(d)} Fils.`);
    return true;
  },

  invDetruire() {
    const s = this.inv, f = s.feuille;
    if (!f) return false;
    if (!this.invGarde()) return false;
    const ch = this.world.ch, d = Items.get(f.id), n = Math.min(f.n, ch.count(f.id));
    s.feuille = null;
    if (!d || n < 1 || !ch.removeItem(f.id, n)) { this.fen.render('sac'); return false; }
    this.chat('systeme', `Tu as détruit ${d.name}${n > 1 ? ' ×' + n : ''}.`);
    this.world.emit('update');
    this.world.emit('save');
    return true;
  },

  // Montre dans le sac la page où se trouve cet objet.
  invAllerA(id) {
    const s = this.inv, d = Items.get(id);
    const onglet = ONGLETS.find(o => o[0] === s.onglet);
    if (!onglet || !d || !onglet[3](d) || !this.invFiltre(this.world.ch, d)) { s.onglet = 'tout'; s.filtre = ''; }
    s.q = '';
    const i = this.invListe(this.world.ch).findIndex(e => e.id === id);
    if (i >= 0) s.page = Math.floor(i / s.parPage);
  },

  // Après chaque rendu : la poupée, la taille des pages, les gestes (posés une fois).
  apresInventaire(body) {
    this.dessinerPoupee(body);
    this.invMesurer(body);
    if (!body.invGestes) { body.invGestes = true; body.addEventListener('pointerdown', evt => this.invAppui(evt, body)); }
    if (this.invGlisse && this.invGlisse.parti) this.invMarquer(body);
  },

  // Autant de cases que la grille en montre sans défiler : les pages font le reste.
  invMesurer(body) {
    const g = body.querySelector('.vy-inv__grille');
    if (!g || this.invMesure) return;
    const s = this.inv, W = g.clientWidth, H = g.clientHeight;
    if (!W || !H) return;
    const css = getComputedStyle(g);
    const gap = parseFloat(css.columnGap) || 5, cible = parseFloat(css.getPropertyValue('--inv-case')) || 46;
    const cols = Math.max(3, Math.floor((W + gap) / (cible + gap)));
    const cote = (W - gap * (cols - 1)) / cols;
    const rows = Math.max(1, Math.floor((H + gap + 0.5) / (cote + gap)));
    if (cols === s.cols && cols * rows === s.parPage) return;
    const premier = s.page * s.parPage;
    s.cols = cols; s.parPage = cols * rows; s.page = Math.floor(premier / s.parPage);
    this.invMesure = true;
    try { this.fen.render('sac'); } finally { this.invMesure = false; }
  },

  invIgnore() { return performance.now() < (this.invSansClic || 0); },
  invIgnorerClic() { this.invSansClic = performance.now() + 380; },

  // Appui sur un objet (sac, emplacement, Nœud) : glisser, toucher deux fois, appui long.
  invAppui(evt, body) {
    const src = evt.target.closest('[data-glisse]');
    if (!src || !body.contains(src) || this.inv.feuille || (evt.pointerType === 'mouse' && evt.button !== 0)) return;
    if (this.invGlisse) this.invFinGlisser();
    const g = { kind: src.dataset.glisse, id: src.dataset.id || null, slot: src.dataset.slot || null, x0: evt.clientX, y0: evt.clientY, x: evt.clientX, y: evt.clientY, type: evt.pointerType, pointerId: evt.pointerId, parti: false, appui: 0 };
    if (g.kind === 'slot') g.id = this.world.ch.equipment[g.slot];
    if (!g.id) return;
    this.invGlisse = g;
    // Appui long (doigt, stylet) : la fiche de l'objet.
    if (evt.pointerType !== 'mouse') g.appui = setTimeout(() => { g.appui = 0; if (this.invGlisse === g && !g.parti) { g.long = true; this.invAppuiLong(g); } }, 480);
    const bouge = e => this.invBouge(e, g);
    const fin = e => { if (e.pointerId === g.pointerId) { g.off(); this.invLache(e, g); } };
    g.off = () => { window.removeEventListener('pointermove', bouge); window.removeEventListener('pointerup', fin); window.removeEventListener('pointercancel', fin); };
    window.addEventListener('pointermove', bouge);
    window.addEventListener('pointerup', fin);
    window.addEventListener('pointercancel', fin);
  },

  invBouge(evt, g) {
    if (evt.pointerId !== g.pointerId || this.invGlisse !== g) return;
    g.x = evt.clientX; g.y = evt.clientY;
    if (!g.parti) {
      if (Math.hypot(g.x - g.x0, g.y - g.y0) < 7) return;
      g.parti = true;
      if (g.appui) { clearTimeout(g.appui); g.appui = 0; }
      this.invDebutGlisser(g);
    }
    if (evt.cancelable) evt.preventDefault();
    // Au doigt, l'objet se montre au-dessus du doigt qui le cacherait.
    if (g.fantome) g.fantome.style.transform = `translate(${g.x}px, ${g.y - (g.type === 'mouse' ? 0 : 36)}px)`;
    const c = this.invCibleSous(g.x, g.y, g);
    const w = this.fen.wins.get('sac');
    if (w) for (const el of w.body.querySelectorAll('.vy-inv__depot--survol')) if (!c || el !== c.el) el.classList.remove('vy-inv__depot--survol');
    if (c) c.el.classList.add('vy-inv__depot--survol');
  },

  invLache(evt, g) {
    if (g.appui) { clearTimeout(g.appui); g.appui = 0; }
    if (this.invGlisse !== g) return;
    if (g.parti) {
      const c = evt.type === 'pointerup' ? this.invCibleSous(evt.clientX, evt.clientY, g) : null;
      this.invFinGlisser(g);
      this.invIgnorerClic();
      if (c) this.invDeposer(g, c);
      return;
    }
    this.invGlisse = null;
    if (g.long) { this.invIgnorerClic(); return; }
    // Toucher deux fois : équiper, utiliser, nouer, retirer.
    const t = performance.now(), cle = `${g.kind}:${g.slot || g.id}`, avant = this.invDernier;
    if (evt.type === 'pointerup' && avant && avant.cle === cle && t - avant.t < 420 && Math.hypot(evt.clientX - avant.x, evt.clientY - avant.y) < 26) {
      this.invDernier = null;
      this.invIgnorerClic();
      this.invActiver(g);
      return;
    }
    this.invDernier = { cle, t, x: evt.clientX, y: evt.clientY };
  },

  invActiver(g) {
    if (g.kind === 'slot') return this.invRetirer(g.slot);
    if (g.kind === 'noeud') return this.invNouer(g.id, false);
    const d = Items.get(g.id);
    if (!d) return false;
    if (portable(d)) return this.invEquiper(g.id);
    if (d.kind === 'consumable') return this.invUtiliser(g.id);
    if (d.kind === 'knot') return this.invNouer(g.id);
    return false;
  },

  invAppuiLong(g) {
    try { if (navigator.vibrate) navigator.vibrate(12); } catch (e) { /* rien */ }
    const s = this.inv;
    s.sel = g.kind === 'slot' ? { de: 'slot', slot: g.slot } : g.kind === 'noeud' ? { de: 'noeud', id: g.id } : { de: 'sac', id: g.id };
    s.fiche = 'effets';
    this.fen.render('sac');
    const w = this.fen.wins.get('sac'), f = w && w.body.querySelector('.vy-inv__fiche');
    if (f) { f.classList.add('vy-inv__fiche--eclat'); if (f.scrollIntoView) f.scrollIntoView({ block: 'nearest' }); }
  },

  // Où peut-on poser ce qu'on glisse ?
  invDepotValide(g, depot, slot) {
    const d = Items.get(g.id);
    if (!d) return false;
    if (g.kind === 'sac') {
      if (depot === 'slot') return va(d, slot);
      if (depot === 'noeud') return d.kind === 'knot';
      if (depot === 'poupee') return portable(d) || d.kind === 'consumable' || d.kind === 'knot';
      return false;
    }
    return depot === 'sac';
  },

  invCibleSous(x, y, g) {
    const w = this.fen.wins.get('sac'), el = document.elementFromPoint(x, y);
    const t = el && w && w.box.contains(el) ? el.closest('[data-depot]') : null;
    return t && this.invDepotValide(g, t.dataset.depot, t.dataset.slot) ? { el: t, depot: t.dataset.depot, slot: t.dataset.slot } : null;
  },

  invDebutGlisser(g) {
    const d = Items.get(g.id), f = document.createElement('div');
    f.className = 'vy-inv-fantome vy-ui';
    f.setAttribute('aria-hidden', 'true');
    f.innerHTML = `<span class="vy-case" data-rarete="${Items.rarity(d)}"><span class="vy-case__icone">${Hud.picto(d)}</span></span>`;
    f.style.transform = `translate(${g.x}px, ${g.y - (g.type === 'mouse' ? 0 : 36)}px)`;
    document.body.appendChild(f);
    g.fantome = f;
    const w = this.fen.wins.get('sac');
    if (w) { w.box.classList.add('vy-inv--glisse'); this.invMarquer(w.body); }
  },

  // Pendant un glissement : les cases où l'objet peut aller, et sa case de départ.
  invMarquer(body) {
    const g = this.invGlisse;
    if (!g) return;
    for (const el of body.querySelectorAll('[data-depot]')) el.classList.toggle('vy-inv__depot--ok', this.invDepotValide(g, el.dataset.depot, el.dataset.slot));
    const src = [...body.querySelectorAll(`[data-glisse="${g.kind}"]`)].find(el => g.kind === 'slot' ? el.dataset.slot === g.slot : el.dataset.id === g.id);
    if (src) src.classList.add('vy-inv__source');
  },

  invFinGlisser(g) {
    g = g || this.invGlisse;
    if (g) { if (g.appui) clearTimeout(g.appui); if (g.off) g.off(); if (g.fantome) g.fantome.remove(); }
    this.invGlisse = null;
    const w = this.fen && this.fen.wins.get('sac');
    if (!w) return;
    w.box.classList.remove('vy-inv--glisse');
    for (const el of w.body.querySelectorAll('.vy-inv__depot--ok, .vy-inv__depot--survol, .vy-inv__source')) el.classList.remove('vy-inv__depot--ok', 'vy-inv__depot--survol', 'vy-inv__source');
  },

  invDeposer(g, c) {
    const d = Items.get(g.id);
    if (!d) return false;
    if (g.kind === 'sac') {
      if (c.depot === 'slot') return this.invEquiper(g.id, c.slot);
      if (c.depot === 'noeud') return this.invNouer(g.id, true);
      if (c.depot === 'poupee') return portable(d) ? this.invEquiper(g.id) : d.kind === 'consumable' ? this.invUtiliser(g.id) : this.invNouer(g.id, true);
      return false;
    }
    if (c.depot !== 'sac') return false;
    return g.kind === 'slot' ? this.invRetirer(g.slot) : this.invNouer(g.id, false);
  },
});
})();
