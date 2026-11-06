class MenuCible {
  constructor(jeu) {
    this.jeu = jeu;
    this.el = document.createElement('div');
    this.el.className = 'vy-cible hidden';
    this.el.setAttribute('role', 'menu');
    jeu.stage.appendChild(this.el);
    this.ouvert = null;
    this.el.addEventListener('click', evt => {
      const b = evt.target.closest('[data-i], [data-dossier], [data-fermer]');
      if (!b) return;
      if (b.dataset.fermer != null) { this.fermer(); return; }
      if (b.dataset.dossier != null) { this.ouvert = this.ouvert === b.dataset.dossier ? null : b.dataset.dossier; this.dessiner(); return; }
      const l = this.lignes[Number(b.dataset.i)];
      if (!l || l.off) return;
      const garder = l.action() === 'garder';
      if (garder) this.refaire(); else this.fermer();
    });
    this.el.addEventListener('mouseover', evt => {
      const b = evt.target.closest('[data-dossier]');
      if (b && this.ouvert !== b.dataset.dossier && window.matchMedia && matchMedia('(hover: hover)').matches) { this.ouvert = b.dataset.dossier; this.dessiner(); }
    });
    window.addEventListener('keydown', evt => { if (evt.key === 'Escape' && this.cible) { evt.stopPropagation(); this.fermer(); } }, true);
    jeu.world.on('map', d => { if (!(d && d.secteur)) this.fermer(); });
    jeu.world.on('fight', () => this.fermer());
    jeu.world.on('cibleCompagnon', () => this.montrer('familier'));
    jeu.world.on('cibleSoi', () => this.montrer('soi'));
    document.addEventListener('pointerdown', evt => { if (this.cible && !this.el.contains(evt.target)) this.fermer(); }, true);
  }

  get ch() { return this.jeu.world.ch; }
  apres() { this.jeu.world.emit('update'); this.jeu.world.emit('save'); }
  toast(t) { this.jeu.hud.toast(t); }

  repas(nourrir) {
    const ch = this.ch;
    return Object.keys(ch.inventory || {}).map(id => ({ id, d: Items.get(id), xp: Familiers.xpRessource(id), libre: Math.max(0, ch.count(id) - Familiers.reserveQuetes(ch, id)) }))
      .filter(x => x.d && x.xp > 0 && x.libre > 0).sort((a, b) => b.xp - a.xp).slice(0, 6)
      .map(x => ({ dossier: 'Nourrir', label: `${x.d.name} ×${x.libre}`, note: `+${x.xp} XP`, picto: 'repas', action: () => { nourrir(x.id); return 'garder'; } }));
  }

  montrer(cible) {
    const ch = this.ch;
    if (this.jeu.world.state !== 'explore') return;
    if (cible === 'familier' && !Familiers.actif(ch)) return;
    this.cible = cible;
    this.ouvert = null;
    this.refaire();
    this.el.classList.remove('hidden');
    if (this.lacher) this.lacher();
    this.lacher = UI.ancrer(() => this.placer());
    this.placer();
  }

  refaire() {
    if (this.cible === 'familier') this.menuFamilier(); else this.menuSoi();
    if (!this.lignes) return this.fermer();
    this.dessiner();
  }

  menuFamilier() {
    const ch = this.ch, f = Familiers.actif(ch);
    if (!f) { this.lignes = null; return; }
    const w = this.jeu.world, c = w.compagnon || {}, e = ch.familiers[f.id], n = Familiers.niveau(e.xp);
    this.tete = { picto: Hud.pictoFamilier(f, 38), nom: f.nom, sous: `Familier · niveau ${n} / ${Familiers.NIVEAU_MAX}`, jauge: Familiers.progression(e.xp),
      note: Familiers.texteBonus(Familiers.bonusA(f, n)) };
    const nourrir = id => {
      const res = Familiers.nourrir(ch, f.id, id, 1);
      if (!res.ok) { this.toast(res.raison); return; }
      this.toast(`${f.nom} : +${res.xp} XP${res.niveaux ? ` · niveau ${res.niveau} !` : ''}`);
      this.coeur('e_merci');
      this.apres();
    };
    const autres = Object.keys(ch.familiers || {}).filter(id => id !== f.id && Familiers.get(id));
    const repas = this.repas(nourrir);
    this.lignes = [
      { dossier: 'Ordres', label: c.reste ? 'Me suivre' : 'Suivre', picto: 'suivre', on: !c.reste, action: () => { if (w.compagnon) w.compagnon.reste = false; this.toast(`${f.nom} te suit.`); return 'garder'; } },
      { dossier: 'Ordres', label: 'Rester ici', picto: 'rester', on: !!c.reste, action: () => { if (w.compagnon) w.compagnon.reste = true; this.toast(`${f.nom} t'attend ici.`); return 'garder'; } },
      { label: 'Caresser', picto: 'coeur', action: () => { this.coeur('e_merci'); this.toast(`${f.nom} ronronne de plaisir.`); } },
      ...(repas.length ? repas : [{ dossier: 'Nourrir', label: 'Rien à lui donner : il mange des ressources', picto: 'info', off: true, action: () => {} }]),
      ...autres.map(id => { const d = Familiers.get(id); return { dossier: 'Changer de familier', label: `${d.nom} · niv. ${Familiers.niveauDe(ch, id)}`, picto: 'patte', action: () => { const r = Familiers.emmener(ch, id); if (!r.ok) this.toast(r.raison); else { this.toast(`${d.nom} te suit.`); this.apres(); } } }; }),
      { label: 'Sa fiche', picto: 'fiche', action: () => this.jeu.hud.toggleWin('familiers') },
      { label: 'Le renvoyer', picto: 'renvoyer', danger: true, action: () => { Familiers.emmener(ch, null); this.toast(`${f.nom} rentre au Relais.`); this.apres(); } },
    ];
  }

  menuSoi() {
    const ch = this.ch, hud = this.jeu.hud;
    const m = typeof Montures === 'object' ? Montures.de(ch) : null, d = m && Montures.def(ch);
    const cls = ch.classDef || {};
    this.tete = d
      ? { picto: Hud.pictoFamilier(d, 38), nom: ch.name, sous: `${d.nom} · niveau ${Montures.niveau(ch)} / ${Familiers.NIVEAU_MAX} · ${m.montee ? 'monté' : 'à pied'}`, jauge: Familiers.progression(m.xp) }
      : { picto: `<span class="vy-cible__glyphe" style="--c:${cls.color || '#ddaa72'}">${Util.esc(cls.glyph || ch.name.charAt(0))}</span>`, nom: ch.name, sous: `${cls.name || ''} · niveau ${ch.level}` };
    const lignes = [];
    if (d) {
      lignes.push({ label: m.montee ? 'Descendre de ' + d.nom : 'Monter ' + d.nom, picto: 'monture', primaire: !m.montee, action: () => { hud.basculerMonture(); } });
      const repas = this.repas(id => {
        const res = Montures.nourrir(ch, id, 1);
        if (!res.ok) { this.toast(res.raison); return; }
        this.toast(`${res.monture.nom} : +${res.xp} XP${res.niveaux ? ` · niveau ${res.niveau} !` : ''}`);
        this.apres();
      }).map(l => Object.assign(l, { dossier: 'Nourrir la monture' }));
      lignes.push(...(repas.length ? repas : [{ dossier: 'Nourrir la monture', label: 'Rien à lui donner : elle mange des ressources', picto: 'info', off: true, action: () => {} }]));
      for (const p of Montures.PARTS) lignes.push({ dossier: 'Part d\'expérience', label: p ? `${p} % de ton XP` : 'Rien (elle ne grandit qu\'en mangeant)', picto: 'part', on: m.part === p, action: () => { Montures.choisirPart(ch, p); this.apres(); return 'garder'; } });
      lignes.push({ label: 'Fiche de la monture', picto: 'fiche', action: () => hud.toggleWin('montures') });
    }
    for (const [id, label] of HudJeu.emotesDe()) lignes.push({ dossier: 'Émotes', label, icone: HudJeu.ICON['e_' + id], action: () => this.jeu.emote(id) });
    lignes.push({ dossier: 'Personnage', label: 'Sac', picto: 'sac', action: () => hud.toggleWin('sac') });
    lignes.push({ dossier: 'Personnage', label: 'Garde-robe', picto: 'garderobe', action: () => hud.toggleWin('garderobe') });
    lignes.push({ dossier: 'Personnage', label: 'Caractéristiques', picto: 'fiche', action: () => hud.toggleWin('carac') });
    if (typeof Familiers === 'object' && !Familiers.actif(ch) && Object.keys(ch.familiers || {}).length) {
      for (const id of Object.keys(ch.familiers)) { const f = Familiers.get(id); if (f) lignes.push({ dossier: 'Appeler un familier', label: `${f.nom} · niv. ${Familiers.niveauDe(ch, id)}`, picto: 'patte', action: () => { Familiers.emmener(ch, id); this.toast(`${f.nom} te suit.`); this.apres(); } }); }
    }
    this.lignes = lignes;
  }

  coeur(icone) {
    const c = this.jeu.world.compagnon;
    if (!c) return;
    const el = document.createElement('div');
    el.className = 'vy-emote-bulle entre vy-cible__bulle';
    el.innerHTML = HudJeu.ICON[icone] || '';
    this.jeu.stage.appendChild(el);
    const place = () => {
      const hr = this.jeu.stage.getBoundingClientRect(), k = UI.cellScale(this.jeu.renderer, c.rx, c.ry), q = UI.cellClient(this.jeu.renderer, c.rx, c.ry);
      el.style.transform = `translate(${Math.round(q.x - hr.left - el.offsetWidth / 2)}px, ${Math.round(q.y - hr.top - 46 * k - el.offsetHeight)}px)`;
    };
    const lacher = UI.ancrer(place);
    place();
    setTimeout(() => { el.classList.add('sort'); setTimeout(() => { lacher(); el.remove(); }, 400); }, 1600);
  }

  dessiner() {
    const t = this.tete, P = MenuCible.PICTOS, esc = Util.esc;
    const picto = l => l.icone || P[l.picto] || '';
    const ligne = (l, i) => `<button type="button" class="vy-cible__ligne${l.on ? ' on' : ''}${l.danger ? ' danger' : ''}${l.primaire ? ' primaire' : ''}" role="menuitem" data-i="${i}" ${l.off ? 'disabled' : ''}>${picto(l)}<span>${esc(l.label)}</span>${l.note ? `<em>${esc(l.note)}</em>` : ''}</button>`;
    const dossiers = [], racine = [], tete1 = [];
    this.lignes.forEach((l, i) => {
      if (!l.dossier) { (l.primaire ? tete1 : racine).push(ligne(l, i)); return; }
      if (!dossiers.includes(l.dossier)) dossiers.push(l.dossier);
    });
    const icDossier = { Ordres: P.suivre, Nourrir: P.repas, 'Nourrir la monture': P.repas, 'Changer de familier': P.patte, 'Appeler un familier': P.patte, 'Part d\'expérience': P.part, 'Émotes': P.emote, Personnage: P.fiche };
    const tetes = dossiers.map(n => `<button type="button" class="vy-cible__ligne dossier${this.ouvert === n ? ' ouvert' : ''}" data-dossier="${esc(n)}" aria-expanded="${this.ouvert === n}">${icDossier[n] || P.dossier}<span>${esc(n)}</span>${P.chevron}</button>`);
    const col = `<div class="vy-cible__col">
      <header class="vy-cible__tete">${t.picto}<div><b>${esc(t.nom)}</b><small>${esc(t.sous)}</small>${t.jauge != null ? `<i class="vy-cible__jauge"><i style="width:${Math.round(100 * t.jauge)}%"></i></i>` : ''}${t.note ? `<small class="vy-cible__note">${esc(t.note)}</small>` : ''}</div><button type="button" class="vy-cible__x" data-fermer aria-label="Fermer">${P.fermer}</button></header>
      <div class="vy-cible__liste">${tete1.join('')}${tetes.join('')}${racine.join('')}</div></div>`;
    const sous = this.ouvert ? `<div class="vy-cible__col vy-cible__sous">${this.lignes.map((l, i) => (l.dossier === this.ouvert ? ligne(l, i) : '')).join('')}</div>` : '';
    this.el.innerHTML = col + sous;
    this.placer();
  }

  placer() {
    if (!this.cible) return;
    const w = this.jeu.world, c = this.cible === 'familier' ? w.compagnon : w.player;
    if (!c) return;
    const hr = this.jeu.stage.getBoundingClientRect(), k = UI.cellScale(this.jeu.renderer, c.rx, c.ry), q = UI.cellClient(this.jeu.renderer, c.rx, c.ry);
    const col = this.el.querySelector('.vy-cible__col'), lw = col ? col.offsetWidth : 220, W = this.el.offsetWidth, H = this.el.offsetHeight;
    const fx = q.x - hr.left, fy = q.y - hr.top;
    let x = fx + 24 * k, y = fy - 30 * k - (col ? col.offsetHeight : H) / 2;
    this.el.classList.toggle('a-gauche', x + W > hr.width - 8);
    if (x + W > hr.width - 8) x = fx - 24 * k - lw;
    x = Math.max(8, Math.min(hr.width - lw - 8, x));
    y = Math.max(8, Math.min(hr.height - H - 8, y));
    this.el.style.transform = `translate(${Math.round(x)}px, ${Math.round(y)}px)`;
  }

  fermer() {
    if (!this.cible) return;
    this.cible = null;
    this.el.classList.add('hidden');
    if (this.lacher) { this.lacher(); this.lacher = null; }
  }

  static get PICTOS() {
    const s = p => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${p}</svg>`;
    return {
      suivre: s('<path d="M5 12h12M13 7l5 5-5 5"/><circle cx="5" cy="12" r="1.6"/>'),
      rester: s('<path d="M12 21s-6-5.6-6-10.5A6 6 0 0 1 18 10.5C18 15.4 12 21 12 21z"/><circle cx="12" cy="10.5" r="2.2"/>'),
      coeur: s('<path d="M12 20s-7-4.5-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.5-7 10-7 10z"/>'),
      repas: s('<path d="M4 11h16a8 8 0 0 1-16 0z"/><path d="M8 7c0-1.5 1-2 1-3.5M12 7c0-1.5 1-2 1-3.5M16 7c0-1.5 1-2 1-3.5"/>'),
      patte: s('<circle cx="7" cy="9" r="1.8"/><circle cx="11" cy="6" r="1.8"/><circle cx="15.5" cy="7" r="1.8"/><circle cx="18" cy="11" r="1.8"/><path d="M8 16c0-2.5 2-4.5 4.5-4.5S17 13.5 17 16c0 1.8-1.5 3-3 3h-3c-1.6 0-3-1.2-3-3z"/>'),
      fiche: s('<rect x="4" y="3" width="16" height="18" rx="2"/><path d="M8 8h8M8 12h8M8 16h5"/>'),
      renvoyer: s('<path d="M9 14l-5-5 5-5"/><path d="M4 9h10a6 6 0 0 1 0 12h-3"/>'),
      monture: s('<path d="M7 20V12a5 5 0 0 1 10 0v8"/><path d="M4.5 20h5M14.5 20h5"/>'),
      part: s('<circle cx="12" cy="12" r="8"/><path d="M12 4v8l6 4"/>'),
      emote: s('<circle cx="12" cy="12" r="8.5"/><path d="M8.5 14.5c1 1.4 2.2 2 3.5 2s2.5-.6 3.5-2"/><path d="M9 9.5h.01M15 9.5h.01"/>'),
      sac: s('<path d="M6 8h12l-1 12H7z"/><path d="M9 8V6a3 3 0 0 1 6 0v2"/>'),
      garderobe: s('<path d="M8 4l4 3 4-3 4 4-3 3v9H7v-9L4 8z"/>'),
      info: s('<circle cx="12" cy="12" r="9"/><path d="M12 11v5M12 8h.01"/>'),
      dossier: s('<path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>'),
      chevron: '<svg class="vy-cible__chev" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M9 6l6 6-6 6"/></svg>',
      fermer: s('<path d="M6 6l12 12M18 6L6 18"/>'),
    };
  }
}
