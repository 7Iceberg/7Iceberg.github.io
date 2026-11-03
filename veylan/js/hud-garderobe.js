(() => {
const esc = s => Util.esc(s);
const I = Fenetres.ICON;
const svg = (p, extra) => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" ${extra || ''}>${p}</svg>`;
const ONGLETS = [['teinture', 'Teintures'], ['lueur', 'Lueurs'], ['aura', 'Auras'], ['blason', 'Blasons'], ['emote', 'Émotes'], ['theme', 'Thèmes'], ['collections', 'Collections'], ['looks', 'Looks']];
const FILTRES = [['tous', 'Tous'], ['possedes', 'Possédés'], ['aobtenir', 'À obtenir']];
const FACINGS = ['se', 'sw', 'nw', 'ne'];
const APPUI_LONG = 480;
const hex = c => (/^#[0-9a-f]{6}$/i.test(c || '') ? c : '#c9a66b');
const dateCourte = t => { try { return new Date(t).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' }); } catch (e) { return ''; } };

Hud.pictoCosmetique = c => {
  const d = (c && c.data) || {};
  const G = p => `<svg class="vy-gr__picto" viewBox="0 0 40 40" aria-hidden="true">${p}</svg>`;
  switch (c && c.type) {
    case 'teinture': { const [a, b, k] = (d.couleurs || []).map(hex); return G(`<rect x="5" y="6" width="10" height="28" rx="3" fill="${a || '#888'}"/><rect x="15" y="6" width="10" height="28" fill="${b || '#666'}"/><rect x="25" y="6" width="10" height="28" rx="3" fill="${k || '#aaa'}"/><rect x="5" y="6" width="30" height="28" rx="3" fill="none" stroke="rgba(0,0,0,0.5)"/>`); }
    case 'lueur': { const col = hex(d.couleur); return G(`<defs><radialGradient id="g${c.id}"><stop offset="0" stop-color="${col}" stop-opacity="1"/><stop offset="0.45" stop-color="${col}" stop-opacity="0.55"/><stop offset="1" stop-color="${col}" stop-opacity="0"/></radialGradient></defs><circle cx="20" cy="20" r="18" fill="url(#g${c.id})"/><path d="M20 12l3 5-3 5-3-5z" fill="#fff" fill-opacity="0.9"/>`); }
    case 'aura': {
      const col = hex(d.couleur);
      if (d.forme === 'brume') return G(`<ellipse cx="20" cy="24" rx="16" ry="6" fill="${col}" fill-opacity="0.45"/><ellipse cx="20" cy="26" rx="11" ry="4" fill="${col}" fill-opacity="0.6"/>`);
      if (d.forme === 'braises') return G([[9, 26, 2.4], [15, 30, 1.8], [21, 29, 2.2], [27, 25, 2.6], [31, 18, 1.6], [12, 17, 1.5], [23, 20, 1.8]].map(([x, y, r]) => `<circle cx="${x}" cy="${y}" r="${r}" fill="${col}"/>`).join(''));
      return G(`<ellipse cx="20" cy="24" rx="14" ry="6" fill="none" stroke="${col}" stroke-width="2" stroke-dasharray="3 3"/><ellipse cx="20" cy="24" rx="7" ry="3" fill="${col}" fill-opacity="0.5"/>`);
    }
    case 'blason': return G(`<text x="20" y="27" text-anchor="middle" font-size="22" fill="${hex(d.couleur)}" font-family="serif">${esc(d.glyphe || '')}</text>`);
    case 'emote': return `<span class="vy-gr__picto" style="display:grid;place-items:center">${(typeof HudJeu !== 'undefined' && HudJeu.ICON && (HudJeu.ICON['e_' + d.emote] || HudJeu.ICON.emote)) || ''}</span>`;
    case 'theme': { const [, , fond, accent] = d.theme || []; return G(`<rect x="5" y="6" width="30" height="28" rx="4" fill="${hex(fond)}" stroke="rgba(0,0,0,0.5)"/><rect x="9" y="10" width="22" height="5" rx="2" fill="${hex(accent)}"/><rect x="9" y="19" width="14" height="3" rx="1.5" fill="${hex(accent)}" fill-opacity="0.6"/><rect x="9" y="25" width="18" height="3" rx="1.5" fill="${hex(accent)}" fill-opacity="0.4"/>`); }
    default: return '';
  }
};

Object.assign(Hud.prototype, {
  openGarderobe() {
    if (typeof Garderobe === 'undefined') return;
    if (!this.gr) this.gr = { onglet: 'teinture', filtre: 'tous', source: '', choix: null, essai: {}, facing: 'se', tourne: true, feuille: null };
    const s = this.gr, ch = () => this.world.ch;
    const r = () => this.fen.render('garderobe');
    const apres = () => { this.world.emit('update'); this.world.emit('save'); };
    const actions = {
      onglet: d => { s.onglet = d.onglet; s.feuille = null; r(); },
      filtre: d => { s.filtre = d.filtre; r(); },
      choisir: d => { s.choix = d.id; const c = Garderobe.get(d.id); if (c && Garderobe.TYPES_PORTES.includes(c.type)) s.essai[c.type] = d.id; r(); },
      fiche: d => { s.choix = d.id; s.feuille = d.id; r(); },
      fermerFeuille: () => { s.feuille = null; r(); },
      porter: d => {
        const res = Garderobe.porter(ch(), d.id);
        if (!res.ok) { this.toast(res.raison); return; }
        delete s.essai[res.type];
        if (res.type === 'theme') this.choisirTheme(res.cosmetique.data.theme[0]);
        apres(); s.feuille = null; r();
      },
      retirer: d => {
        Garderobe.retirer(ch(), d.type);
        delete s.essai[d.type];
        if (d.type === 'theme') this.grAppliquerTheme();
        apres(); s.feuille = null; r();
      },
      annulerEssai: d => { delete s.essai[d.type]; r(); },
      toutAnnuler: () => { s.essai = {}; r(); },
      tourner: d => { s.tourne = false; s.facing = FACINGS[(FACINGS.indexOf(s.facing) + (Number(d.sens) || 1) + 4) % 4]; r(); },
      tournerAuto: () => { s.tourne = !s.tourne; r(); },
      jouerEmote: d => { if (this.jeu && this.jeu.emote) this.jeu.emote(d.emote); },
      lookMettre: d => {
        const res = Garderobe.mettreLook(ch(), Number(d.i));
        if (!res.ok) { this.toast(res.raison); return; }
        if (res.manquants.length) this.toast(`Look remis, sauf ${res.manquants.map(id => (Garderobe.get(id) || {}).nom || id).join(', ')} : plus dans ta Garde-robe.`);
        s.essai = {}; this.grAppliquerTheme(); apres(); r();
      },
      lookSupprimer: d => { Garderobe.supprimerLook(ch(), Number(d.i)); apres(); r(); },
      lookRemplacer: d => { const res = Garderobe.enregistrerLook(ch(), this.grNomLook(), Number(d.i)); if (!res.ok) this.toast(res.raison); apres(); r(); },
      lookEnregistrer: () => { const res = Garderobe.enregistrerLook(ch(), this.grNomLook()); if (!res.ok) { this.toast(res.raison); return; } apres(); r(); },
    };
    const onField = (el, kind) => { if (el.id === 'gr-source') { s.source = el.value; if (kind === 'change') r(); } };
    this.simpleWin('garderobe', 'Garde-robe', () => this.renderGarderobe(), actions, { width: 780, cls: 'vy-fenetre--garderobe', onField, onClose: () => this.fermerGarderobe() });
    this.grDemarrer();
  },

  fermerGarderobe() {
    if (this.grTimer) { clearInterval(this.grTimer); this.grTimer = null; }
    if (this.gr) { this.gr.essai = {}; this.gr.feuille = null; }
    this.syncMenus();
  },

  grDemarrer() {
    const s = this.gr;
    if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) s.tourne = false;
    if (!this.grTimer) this.grTimer = setInterval(() => { if (s.tourne && this.fen.isOpen('garderobe')) { s.facing = FACINGS[(FACINGS.indexOf(s.facing) + 1) % 4]; this.grPeindre(); } }, 1300);
    const w = this.fen.wins.get('garderobe');
    if (!w || !w.body || w.body.dataset.grLong) return;
    w.body.dataset.grLong = '1';
    let t = null, cible = null;
    const fin = () => { clearTimeout(t); t = null; cible = null; };
    w.body.addEventListener('pointerdown', evt => {
      const b = evt.target.closest('[data-long]');
      if (!b) return;
      cible = b;
      t = setTimeout(() => { if (cible === b) { s.choix = b.dataset.id; s.feuille = b.dataset.id; this.fen.render('garderobe'); } fin(); }, APPUI_LONG);
    });
    for (const ev of ['pointerup', 'pointercancel', 'pointerleave']) w.body.addEventListener(ev, fin);
    w.body.addEventListener('pointermove', evt => { if (cible && evt.target.closest('[data-long]') !== cible) fin(); });
    w.body.addEventListener('contextmenu', evt => { if (evt.target.closest('[data-long]')) evt.preventDefault(); });
  },

  grNomLook() { const w = this.fen.wins.get('garderobe'); const el = w && w.body.querySelector('#gr-look-nom'); return el ? el.value : ''; },

  grAppliquerTheme() {
    const t = this.themeDuPersonnage(), cur = document.getElementById('app').dataset.uiTheme;
    if (t) { if (cur !== t) this.applyTheme(t); } else if (Garderobe.themeDe(cur)) this.applyTheme(Hud.THEMES[0][0]);
  },

  grApparence() {
    const ch = this.world.ch, s = this.gr;
    const porte = Object.assign(Garderobe.porteDefaut(), ch.porte || {}, s.essai);
    const l = Garderobe.lookPorte(ch, null, porte);
    return { look: l.look, auraCos: l.aura ? l.aura.data : null, lueur: l.lueur && l.lueur.data ? l.lueur.data.effet || null : null, blason: l.blason ? l.blason.data : null };
  },

  grPeindre() {
    const w = this.fen.wins.get('garderobe');
    const cv = w && w.body.querySelector('.vy-gr__cv');
    if (!cv) return;
    const W = cv.clientWidth, H = cv.clientHeight;
    if (!W || !H) return;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    if (cv.width !== Math.round(W * dpr) || cv.height !== Math.round(H * dpr)) { cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr); }
    const c = cv.getContext('2d');
    c.setTransform(dpr, 0, 0, dpr, 0, 0);
    c.clearRect(0, 0, W, H);
    const ch = this.world.ch, cls = ch.classDef, sol = H - Math.max(26, H * 0.16);
    const S = Math.max(1, Math.min(W / 60, (sol - 8) / 66));
    c.fillStyle = 'rgba(0,0,0,0.38)'; c.beginPath(); c.ellipse(W / 2, sol, 22 * S, 5 * S, 0, 0, Math.PI * 2); c.fill();
    c.strokeStyle = 'rgba(255,255,255,0.14)'; c.lineWidth = 1; c.beginPath(); c.ellipse(W / 2, sol + 3, 28 * S, 7 * S, 0, 0, Math.PI * 2); c.stroke();
    const painter = this.renderer && (this.renderer.painter || this.renderer);
    if (!painter || typeof painter.drawBody !== 'function') {
      c.fillStyle = cls.color; c.font = `700 ${Math.round(H * 0.3)}px Cinzel, Georgia, serif`; c.textAlign = 'center'; c.textBaseline = 'middle';
      c.fillText(cls.glyph, W / 2, H * 0.48);
      return;
    }
    const ap = this.grApparence();
    c.save(); c.translate(W / 2, sol); c.scale(S, S); c.lineJoin = 'round'; c.lineCap = 'round';
    try { painter.drawBody(c, { x: 0, y: 0 }, { shape: 'player', color: cls.color, glyph: cls.glyph, team: 'player', look: ap.look, auraCos: ap.auraCos, lueur: ap.lueur, gender: ch.gender, facing: this.gr.facing }); } catch (e) {   }
    c.restore();
  },

  renderGarderobe() {
    const s = this.gr, ch = this.world.ch;
    const g = Garderobe.etat();
    const ap = this.grApparence();
    const essais = Object.keys(s.essai).filter(t => s.essai[t] && s.essai[t] !== (ch.porte || {})[t]);
    const onglets = ONGLETS.map(([id, label]) => {
      const n = id === 'collections' || id === 'looks' ? '' : `<small>${Garderobe.filtrer({ type: id, filtre: 'possedes' }, g).length}/${Garderobe.filtrer({ type: id }, g).length}</small>`;
      return `<button class="vy-onglet${s.onglet === id ? ' on' : ''}" data-act="onglet" data-onglet="${id}" role="tab" aria-selected="${s.onglet === id}">${label}${n}</button>`;
    }).join('');
    const choix = Garderobe.get(s.choix);
    const corps = s.onglet === 'collections' ? this.grCollections(g) : s.onglet === 'looks' ? this.grLooks(ch, g) : this.grCatalogue(g);
    const feuille = s.feuille && Garderobe.get(s.feuille)
      ? `<div class="vy-feuille-fond" data-act="fermerFeuille"></div><section class="vy-feuille vy-gr__feuille" role="dialog" aria-modal="true" aria-label="Fiche du cosmétique"><header class="vy-feuille__tete"><h3>${esc(Garderobe.get(s.feuille).nom)}</h3><button class="vy-fenetre__bouton" data-act="fermerFeuille" aria-label="Fermer">${I.fermer}</button></header>${this.grFiche(Garderobe.get(s.feuille), g)}</section>`
      : '';
    setTimeout(() => this.grPeindre(), 0);
    return `<div class="vy-gr">
      <aside class="vy-gr__socle">
        <div class="vy-gr__scene"><canvas class="vy-gr__cv" aria-label="Ton personnage sur son socle"></canvas>
          <div class="vy-gr__nom">${ap.blason ? `<span class="pb-blason" style="color:${esc(hex(ap.blason.couleur))}" aria-hidden="true">${esc(ap.blason.glyphe || '')}</span>` : ''}${esc(ch.name)}</div></div>
        <div class="vy-gr__tour"><button class="vy-bouton vy-bouton--petit vy-bouton--fantome" data-act="tourner" data-sens="-1" aria-label="Tourner à gauche">${I.tourneG}</button><button class="vy-bouton vy-bouton--petit vy-bouton--fantome" data-act="tournerAuto" aria-pressed="${s.tourne}" title="Le socle tourne de lui-même">${s.tourne ? 'Arrêter' : 'Tourner'}</button><button class="vy-bouton vy-bouton--petit vy-bouton--fantome" data-act="tourner" data-sens="1" aria-label="Tourner à droite">${I.tourneD}</button></div>
        ${essais.length ? `<div class="vy-gr__essai"><span>Essai : <b>${essais.map(t => esc((Garderobe.get(s.essai[t]) || {}).nom || '')).join(', ')}</b></span><button class="vy-bouton vy-bouton--petit vy-bouton--fantome" data-act="toutAnnuler">Annuler</button></div>` : ''}
        ${this.grFiche(choix, g)}
        ${this.grBarre(choix, g)}
      </aside>
      <section class="vy-gr__cata">
        <div class="vy-onglets vy-gr__onglets" role="tablist">${onglets}</div>
        ${corps}
      </section>
    </div>${feuille}`;
  },

  grCatalogue(g) {
    const s = this.gr, ch = this.world.ch;
    const filtres = FILTRES.map(([id, label]) => `<button class="vy-gr__filtre${s.filtre === id ? ' on' : ''}" data-act="filtre" data-filtre="${id}" aria-pressed="${s.filtre === id}">${label}</button>`).join('');
    const sources = `<select id="gr-source" aria-label="Par source"><option value="">Toutes les sources</option>${Garderobe.SOURCES.map(k => `<option value="${k}" ${s.source === k ? 'selected' : ''}>${Garderobe.SOURCE_LABEL[k]}</option>`).join('')}</select>`;
    const liste = Garderobe.filtrer({ type: s.onglet, filtre: s.filtre, source: s.source }, g);
    const cartes = liste.map(c => {
      const possede = g.possedes.includes(c.id), porte = (ch.porte || {})[c.type] === c.id, essai = s.essai[c.type] === c.id && !porte;
      const etat = porte ? 'Porté' : essai ? 'À l\'essai' : possede ? 'Possédé' : (Garderobe.SOURCE_LABEL[(c.source || {}).genre] || 'À obtenir');
      return `<button class="vy-gr__carte${s.choix === c.id ? ' est-choisie' : ''}${possede ? '' : ' a-obtenir'}" data-act="choisir" data-id="${c.id}" data-long="fiche" title="${esc(c.nom)} : ${possede ? 'dans ta Garde-robe' : Garderobe.texteSource(c)}" aria-label="${esc(c.nom)}, ${etat}">
        <span class="vy-case" data-rarete="${c.rarete}"><span class="vy-case__icone">${Hud.pictoCosmetique(c)}</span></span>
        <span class="vy-gr__carte-texte"><b>${esc(c.nom)}</b><small class="${porte || essai ? 'porte' : ''}">${etat}</small></span></button>`;
    }).join('');
    return `<div class="vy-gr__filtres" role="group" aria-label="Filtres">${filtres}${sources}</div>
      <div class="vy-gr__grille" data-defile="garderobe">${cartes || '<p class="vy-gr__vide">Rien ici avec ces filtres.</p>'}</div>`;
  },

  grBoutons(c, g, compact) {
    const s = this.gr, ch = this.world.ch;
    const possede = g.possedes.includes(c.id), portable = Garderobe.TYPES_PORTES.includes(c.type);
    const porte = portable && (ch.porte || {})[c.type] === c.id, essai = portable && s.essai[c.type] === c.id && !porte;
    const boutons = [];
    if (portable && possede && !porte) boutons.push(`<button class="vy-bouton vy-bouton--primaire vy-bouton--petit" data-act="porter" data-id="${c.id}">Porter</button>`);
    if (porte) boutons.push(`<button class="vy-bouton vy-bouton--petit" data-act="retirer" data-type="${c.type}">Retirer</button>`);
    if (essai && !compact) boutons.push(`<button class="vy-bouton vy-bouton--petit vy-bouton--fantome" data-act="annulerEssai" data-type="${c.type}">Annuler l'essai</button>`);
    if (c.type === 'emote' && possede) boutons.push(`<button class="vy-bouton vy-bouton--primaire vy-bouton--petit" data-act="jouerEmote" data-emote="${esc(c.data.emote)}">Jouer</button>`);
    if (!s.feuille) boutons.push(`<button class="vy-bouton vy-bouton--petit vy-bouton--fantome" data-act="fiche" data-id="${c.id}">Fiche</button>`);
    return boutons.join('');
  },

  grBarre(c, g) {
    if (!c) return '';
    const possede = g.possedes.includes(c.id);
    return `<div class="vy-gr__barre"><span class="vy-case" data-rarete="${c.rarete}"><span class="vy-case__icone">${Hud.pictoCosmetique(c)}</span></span>
      <span class="vy-gr__barre-nom"><b>${esc(c.nom)}</b><small>${possede ? 'Dans ta Garde-robe' : esc(Garderobe.texteSource(c))}</small></span>
      <span class="vy-gr__barre-actions">${this.grBoutons(c, g, true)}</span></div>`;
  },

  grFiche(c, g) {
    if (!c) return '<div class="vy-gr__fiche vy-gr__fiche--vide">Choisis un cosmétique : il s\'essaie sur le socle, possédé ou non. Un objet non possédé dit comment l\'obtenir.</div>';
    const s = this.gr;
    const possede = g.possedes.includes(c.id);
    const quand = possede ? Garderobe.quand(c.id) : null;
    const source = possede
      ? `<span class="vy-gr__source ok">Dans ta Garde-robe${quand ? ` depuis le ${esc(dateCourte(quand))}` : ''}, pour tous tes personnages.</span>`
      : `<span class="vy-gr__source">À obtenir. ${esc(Garderobe.texteSource(c))}.</span>`;
    const collection = c.collection ? Garderobe.collection(c.collection) : null;
    return `<div class="vy-gr__fiche" aria-live="polite">
      <div class="vy-gr__fiche-tete"><span class="vy-case" data-rarete="${c.rarete}"><span class="vy-case__icone">${Hud.pictoCosmetique(c)}</span></span>
        <span class="vy-gr__fiche-nom"><b>${esc(c.nom)}</b><small>${Garderobe.TYPE_LABEL[c.type] || c.type} · ${Garderobe.RARETE_LABEL[c.rarete] || c.rarete}${collection ? ' · ' + esc(collection.nom) : ''}</small></span></div>
      <p>${esc(c.description || '')}</p>
      ${source}
      <div class="vy-gr__fiche-actions">${this.grBoutons(c, g, false)}</div>
    </div>`;
  },

  grCollections(g) {
    const liste = Garderobe.etatCollections(g).map(e => {
      const k = e.collection;
      const pieces = (k.cosmetiques || []).map(id => { const c = Garderobe.get(id); return c ? `<span class="vy-case${g.possedes.includes(id) ? '' : ' manque'}" data-rarete="${c.rarete}" title="${esc(c.nom)}${g.possedes.includes(id) ? '' : ' : ' + esc(Garderobe.texteSource(c))}"><span class="vy-case__icone">${Hud.pictoCosmetique(c)}</span></span>` : ''; }).join('');
      return `<article class="vy-gr__collection${e.complete ? ' complete' : ''}">
        <div class="vy-gr__collection-tete"><b>${esc(k.nom)}</b><span>${e.pourcent} %</span></div>
        <p>${esc(k.description || '')}</p>
        ${Util.jauge('xp', e.possedes, Math.max(1, e.total), `${e.possedes} / ${e.total}`, 'Avancement', 'vy-jauge--fine')}
        <div class="vy-gr__collection-pieces">${pieces}</div>
        ${e.recompense ? `<span class="vy-gr__collection-recompense">${e.complete ? 'Complète : ' : 'Complète, elle donne : '}${esc(e.recompense.nom)}</span>` : ''}
      </article>`;
    }).join('');
    return `<div class="vy-gr__collections" data-defile="garderobe">${liste || '<p class="vy-gr__vide">Aucune collection.</p>'}</div>`;
  },

  grLooks(ch, g) {
    const looks = Array.isArray(ch.ensemblesLook) ? ch.ensemblesLook : [];
    const resume = p => Garderobe.TYPES_PORTES.map(t => Garderobe.get(p && p[t])).filter(Boolean).map(c => esc(c.nom)).join(', ') || 'rien de porté';
    const lignes = [];
    for (let i = 0; i < Garderobe.MAX_LOOKS; i++) {
      const l = looks[i];
      lignes.push(l
        ? `<div class="vy-gr__look"><span class="vy-gr__look-nom"><b>${esc(l.nom)}</b><small>${resume(l.porte)}</small></span>
            <span class="vy-gr__look-actions"><button class="vy-bouton vy-bouton--primaire vy-bouton--petit" data-act="lookMettre" data-i="${i}">Mettre</button><button class="vy-bouton vy-bouton--petit vy-bouton--fantome" data-act="lookRemplacer" data-i="${i}" title="Remplacer par la tenue portée">Remplacer</button><button class="vy-bouton vy-bouton--petit vy-bouton--fantome" data-act="lookSupprimer" data-i="${i}" aria-label="Supprimer ${esc(l.nom)}">${I.fermer}</button></span></div>`
        : `<div class="vy-gr__look vide"><span class="vy-gr__look-nom"><b>Look ${i + 1}</b><small>libre</small></span></div>`);
    }
    return `<div class="vy-gr__looks" data-defile="garderobe">${lignes.join('')}
      <div class="vy-gr__look-nouveau"><input id="gr-look-nom" type="text" maxlength="24" placeholder="Nom du look" aria-label="Nom du look"><button class="vy-bouton vy-bouton--petit" data-act="lookEnregistrer" ${looks.length >= Garderobe.MAX_LOOKS ? 'disabled' : ''}>${I.plus} Enregistrer la tenue portée</button></div>
      <p class="muted vy-note">Un look garde ce que tu portes (teinture, lueur, aura, blason, thème). Le remettre reprend chaque pièce encore dans ta Garde-robe. Cinq au plus.</p>
    </div>`;
  },
});

})();
