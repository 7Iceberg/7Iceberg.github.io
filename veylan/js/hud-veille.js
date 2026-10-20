// Fenêtre « Veille du jour » (js/veille.js) : la carte du jour (nom, Voile, élément, récit, dépôt
// demandé, bonus) et son bouton « Déposer », puis le cycle de 28 jours, la réserve, les marques et
// leurs paliers. On l'ouvre depuis le panneau d'un Relais du Fil (bouton « Veille du jour », marqué
// d'un point quand elle reste à faire), par la touche V, ou par toggleWin('veille') depuis un menu.
// Sur window : « veylan:windowOpen » { id: 'veille' } à l'ouverture (annoncé par js/fenetres.js),
// « veylan:chat » { type: 'systeme', text } à chaque dépôt. Se charge après js/hud-fenetres.js et complète Hud.
(() => {
const esc = s => Util.esc(s);
// Une page de calendrier cousue d'un losange.
const ICONE = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="4" y="5" width="16" height="15" rx="2"/><path d="M4 9.5h16M8.5 3v4M15.5 3v4"/><path d="M12 12l2 2.5-2 2.5-2-2.5z"/></svg>';
const element = el => DATA.elements[el] || { label: el, stat: el, color: '#c9a66b' };
// « Semaine de Terra », « Semaine d'Ignis » : l'élision devant une voyelle.
const semaine = el => { const s = element(el).stat; return /^[AEIOUaeiou]/.test(s) ? `Semaine d'${s}` : `Semaine de ${s}`; };
const ETATS = { fait: 'déposée', manque: 'manquée', avenir: 'à venir', avant: 'avant ta première Veille', aujourdhui: 'à faire' };
const emettre = (type, detail) => { try { window.dispatchEvent(new CustomEvent(type, { detail })); } catch (e) { /* événements indisponibles */ } };

// La fenêtre se pilote aussi par son identifiant, comme les autres : toggleWin('veille') (barre de
// menus, menu du téléphone).
const toggleWin = Hud.prototype.toggleWin;
Hud.prototype.toggleWin = function (id) {
  if (id !== 'veille') return toggleWin.call(this, id);
  if (this.fen.isOpen('veille')) this.fen.close('veille');
  else this.openVeille();
  this.syncMenus();
};

Object.assign(Hud.prototype, {
  // Appelé par le constructeur : le message de chaque dépôt (écran et chat), et la touche V tant
  // qu'aucune entrée de la barre de menus ne la prend.
  initVeille() {
    this.world.on('veille', r => {
      const text = `${r.rattrapage ? 'Veille rattrapée' : 'Veille du jour accomplie'} : +${r.xp} XP, une marque de Veille.`;
      this.toast(text);
      emettre('veylan:chat', { type: 'systeme', text });
    });
    this.veilleTouche = !(Hud.MENUS || []).some(m => String(m[2]).toLowerCase() === 'v');
    if (!this.veilleTouche) return;
    window.addEventListener('keydown', evt => {
      const t = evt.target;
      if (evt.key !== 'v' && evt.key !== 'V') return;
      if (evt.ctrlKey || evt.metaKey || evt.altKey || (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.tagName === 'SELECT'))) return;
      if (!this.el.panel.classList.contains('hidden') || !document.getElementById('title').classList.contains('hidden')) return;
      evt.preventDefault();
      this.toggleWin('veille');
    }, true);
  },

  // Le bouton du panneau d'un Relais, avec un point tant que la Veille du jour reste à faire.
  veilleBouton() {
    const dot = Veille.badge(this.world.ch);
    return `<button data-act="relayVeille"${dot ? ' aria-label="Veille du jour, à faire aujourd\'hui"' : ''}>Veille du jour${dot ? '<span class="vy-veille-point" aria-hidden="true"></span>' : ''}</button>`;
  },

  // Depuis le panneau d'un Relais : le panneau se cache sans clore le relais (le dépôt reste
  // possible) ; fermer la fenêtre clôt le relais, comme la carte du monde.
  openVeilleFromRelay() {
    this.el.panel.classList.add('hidden');
    this.el.panel.dataset.open = '';
    this.panelRefresh = null;
    this.setInert(false);
    this.veilleRelais = true;
    this.openVeille();
  },

  openVeille() {
    const actions = {
      deposer: () => {
        const r = this.world.veilleDeposer();
        if (!r.ok) this.toast(r.raison);
      },
    };
    this.simpleWin('veille', 'Veille du jour', () => this.renderVeille(), actions, {
      icon: ICONE, key: this.veilleTouche ? 'V' : undefined, width: 720, cls: 'vy-fenetre--veille',
      onClose: () => this.fermerVeille(),
    });
  },

  fermerVeille() {
    this.syncMenus();
    if (this.veilleRelais) { this.veilleRelais = false; if (this.world.relayOpen && this.world.state === 'panel') this.world.closePanel(); }
  },

  renderVeille() {
    const w = this.world, ch = w.ch;
    const s = Veille.statut(ch, { auRelais: w.atRelay() });
    if (s.jour == null) return `<p class="muted vy-note">${esc(s.raison)}</p>`;
    const e = s.entree, el = element(e.element);
    return `<div class="vy-veille" style="--el:${el.color}">
      <section class="vy-veille__jour" data-defile="veille-jour" aria-label="Veille du jour">${this.veilleCarte(ch, s)}</section>
      <section class="vy-veille__suivi" data-defile="veille-suivi" aria-label="Le cycle et les marques">${this.veilleSuivi(ch, s)}</section>
    </div>`;
  },

  // La carte du jour : page du calendrier, nom, Voile et élément, récit, dépôt, bonus, action.
  veilleCarte(ch, s) {
    const e = s.entree, el = element(e.element);
    const b = Veille.texteBonus(e.bonus);
    const actif = !!Veille.bonusActif(ch);
    const d = s.demande;
    const depot = d && d.def ? `<div class="vy-veille__bloc vy-veille__depot">
        <span class="vy-case" data-rarete="${Items.rarity(d.def)}" aria-hidden="true"><span class="vy-case__icone">${Hud.picto(d.def)}</span><span class="vy-case__nombre">${d.n}</span></span>
        <div><span class="vy-veille__label">Dépôt pour l'entretien des Relais</span><b>${d.n} × ${esc(d.def.name)}</b>
          <span class="vy-veille__compte ${s.possede >= d.n ? 'ok' : 'manque'}">${Math.min(s.possede, 999)} / ${d.n} dans le sac</span></div></div>` : '';
    const bonus = b ? `<div class="vy-veille__bloc vy-veille__bonus${actif ? ' actif' : ''}">
        <span class="vy-veille__label">Bonus du jour${actif ? ' · actif jusqu\'à minuit' : ''}</span><b>${esc(b.titre)} <span>${esc(b.cible)}</span></b>
        <small>${esc(b.detail)}${actif ? '' : ' Il s\'active à ton dépôt, jusqu\'à minuit.'}</small></div>` : '';
    return `<header class="vy-veille__tete">
        <div class="vy-veille__page" role="img" aria-label="Jour ${e.numero} du cycle de 28"><small>${esc(e.voileChiffre)}</small><b>${e.numero}</b><small>sur 28</small></div>
        <div><p class="vy-veille__sur"><span class="vy-pastille" style="--c:${el.color}"></span>${esc(e.voileNom)} · ${esc(semaine(e.element))}</p>
          <h3 class="vy-veille__nom">${esc(e.nom)}</h3></div></header>
      <p class="vy-veille__recit">${esc(e.recit)}</p>
      ${s.ouverte ? depot : ''}${bonus}
      <div class="vy-veille__action">${this.veilleAction(ch, s)}</div>`;
  },

  // Le bouton « Déposer », actif seulement au Relais et avec ce qu'il faut ; sinon, ce qui manque.
  veilleAction(ch, s) {
    const gain = `${s.xp} XP et une marque de Veille`;
    if (!s.ouverte) return `<p class="vy-veille__note">${esc(s.raison)} Tu es niveau ${ch.level} : d'ici là, le calendrier se lit, sans dépôt.</p>`;
    if (s.recule) return `<button class="vy-bouton" disabled>Déposer</button><p class="vy-veille__note">${esc(s.raison)}</p>`;
    if (!s.aFaire) {
      const demain = Veille.entree(s.jour + 1);
      return `<span class="vy-veille__sceau">Veille du jour accomplie</span><p class="vy-veille__note">Demain : « ${esc(demain.nom)} », ${esc(demain.voileNom.replace(/^\S+/, m => m.toLowerCase()))}, ${esc(semaine(demain.element).replace(/^S/, 's'))}.</p>`;
    }
    if (!s.auRelais) return `<button class="vy-bouton" disabled>Rends-toi à un Relais</button><p class="vy-veille__note">Le dépôt se fait au tableau de n'importe quel Relais du Fil. Il rapporte ${gain}.</p>`;
    if (!s.peut) return `<button class="vy-bouton" disabled>Déposer</button><p class="vy-veille__note">${esc(s.raison)}</p>`;
    const quoi = s.rattrapage ? `Rattrape une Veille en réserve (${s.reserve}) : ${gain}.` : `Rapporte ${gain}.`;
    return `<button class="vy-bouton vy-bouton--primaire" data-act="deposer">Déposer</button><p class="vy-veille__note">${quoi}</p>`;
  },

  // Le suivi : la grille du cycle (sept Voiles, quatre semaines), la réserve, les marques et les
  // paliers (des titres, jamais de puissance de combat).
  veilleSuivi(ch, s) {
    const cases = Veille.grille(ch);
    const tete = '<span></span>' + Veille.ROMAINS.map((r, i) => `<span class="vy-veille__col" title="${esc(Veille.VOILES[i])} Voile">${r}</span>`).join('');
    const rangs = [0, 1, 2, 3].map(k => {
      const el = cases[k * 7].element;
      const ligne = cases.slice(k * 7, k * 7 + 7).map(c => `<span class="vy-veille__case${c.aujourdhui ? ' auj' : ''}" data-etat="${c.etat}" style="--c:${element(c.element).color}" title="Jour ${c.numero} · ${esc(c.nom)} (${c.aujourdhui && c.etat === 'fait' ? 'aujourd\'hui, déposée' : ETATS[c.etat]})">${c.numero}</span>`).join('');
      return `<span class="vy-veille__sem" style="--c:${element(el).color}">${esc(element(el).stat)}</span>${ligne}`;
    }).join('');
    const pips = Array.from({ length: Veille.RESERVE_MAX }, (_, i) => `<span class="vy-veille__pip${i < s.reserve ? ' on' : ''}"></span>`).join('');
    const reserve = s.reserve
      ? `${s.reserve} Veille${s.reserve > 1 ? 's' : ''} en réserve : une par dépôt, une fois celle du jour faite.`
      : `Aucune Veille en réserve. Les jours manqués s'y gardent, ${Veille.RESERVE_MAX} au plus.`;
    const paliers = Veille.paliers().map(p => {
      const got = ch.achievements.includes(p.succes.id);
      const n = Math.min(s.marques, p.count);
      return `<li class="vy-veille__palier${got ? ' got' : ''}"><span class="vy-veille__seuil">${p.count}</span>
        <div><b>${esc(p.succes.name)}</b><small>${p.titre ? `titre « ${esc(p.titre)} »` : esc(p.succes.desc)}</small>${got ? '' : Util.jauge('xp', n, p.count, null, `${p.succes.name} : ${n} sur ${p.count}`, 'vy-jauge--fine')}</div>
        <em>${got ? 'obtenu' : `${n} / ${p.count}`}</em></li>`;
    }).join('');
    return `<div class="vy-sous"><span>Le cycle</span><span>jour ${s.entree.numero} sur 28</span></div>
      <div class="vy-veille__grille" role="img" aria-label="Le cycle de 28 jours : ${cases.filter(c => c.etat === 'fait').length} Veilles déposées">${tete}${rangs}</div>
      <div class="vy-veille__legende"><span data-etat="fait">Déposée</span><span data-etat="auj">Aujourd'hui</span><span data-etat="manque">Manquée</span></div>
      <div class="vy-sous"><span>Réserve</span><span>${s.reserve} / ${Veille.RESERVE_MAX}</span></div>
      <div class="vy-veille__reserve"><span class="vy-veille__pips" aria-hidden="true">${pips}</span><small>${reserve}</small></div>
      <div class="vy-sous"><span>Marques de Veille</span><span><b class="vy-veille__marques">${s.marques}</b></span></div>
      <ol class="vy-veille__paliers">${paliers}</ol>
      <p class="muted vy-note">Des titres, jamais de puissance de combat.</p>`;
  },
});
// L'icône de la fenêtre, reprise par le menu du téléphone (js/hud-jeu.js).
Hud.VEILLE_ICONE = ICONE;
})();
