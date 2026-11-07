(() => {
const esc = s => Util.esc(s);
const svg = p => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${p}</svg>`;
const ICO = {
  monstres: svg('<path d="M6 10c0-3 3-6 6-6s6 3 6 6v3l2 4H4l2-4z"/><path d="M10 13h.01M14 13h.01"/>'),
  zones: svg('<path d="M3 6l6-2 6 2 6-2v14l-6 2-6-2-6 2z"/><path d="M9 4v14M15 6v14"/>'),
  donjons: svg('<path d="M5 21V9a7 7 0 0 1 14 0v12"/><path d="M3 21h18M12 13v8"/>'),
  recherche: svg('<circle cx="11" cy="11" r="6.5"/><path d="M16 16l4 4"/>'),
  retour: svg('<path d="M15 6l-6 6 6 6"/>'),
  cube: svg('<path d="M12 3l8 4.5v9L12 21l-8-4.5v-9z"/><path d="M12 12l8-4.5M12 12v9M12 12L4 7.5"/>'),
  fermer: svg('<path d="M6 6l12 12M18 6L6 18"/>'),
  lieu: svg('<path d="M12 21s-6-5.5-6-11a6 6 0 0 1 12 0c0 5.5-6 11-6 11z"/><circle cx="12" cy="10" r="2"/>'),
};
const ROLES_3D = { placement: 'Apparition', repos: 'Repos', marche: 'Marche', sort: 'Sort', coup: 'Coup reçu', victoire: 'Victoire', mort: 'Mort' };
const sansAccents = s => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
const niv = l => Array.isArray(l) ? (l[0] === l[1] ? `niv. ${l[0]}` : `niv. ${l[0]} à ${l[1]}`) : `niv. ${esc(l)}`;

Object.assign(Hud.prototype, {
  portraitBete(id, W, H) {
    const m = DATA.monsters[id];
    const fig = typeof Figures === 'object' ? Figures.de(id) : null;
    const im = fig ? Figures.image(fig) : null;
    const key = `${id}|${W}x${H}|${im ? 'fig' : 'code'}`;
    const cache = Hud._portraits || (Hud._portraits = new Map());
    if (cache.has(key)) return cache.get(key);
    const k = 2, cv = document.createElement('canvas');
    cv.width = W * k; cv.height = H * k;
    const g = cv.getContext('2d');
    g.scale(k, k);
    const sol = H * 0.86;
    g.fillStyle = 'rgba(0,0,0,0.32)'; g.beginPath(); g.ellipse(W / 2, sol, W * 0.26, H * 0.045, 0, 0, Math.PI * 2); g.fill();
    const painter = this.renderer && (this.renderer.painter || this.renderer);
    if (im) {
      const h = H * 0.8, w = Math.min(W * 0.96, h * im.naturalWidth / im.naturalHeight), hh = w * im.naturalHeight / im.naturalWidth;
      g.drawImage(im, (W - w) / 2, sol - hh + H * 0.03, w, hh);
    } else if (fig) {
      const el = new Image(); el.onload = () => { if (this.fen && this.fen.isOpen('carnet')) this.fen.render('carnet'); }; el.src = FIGURES_IMAGES[fig];
      return '';
    } else if (m && painter && typeof painter.drawBody === 'function') {
      const s = { shape: m.shape, color: m.color, glyph: null, team: 'monster', motif: typeof Renderer === 'function' ? Renderer.motifOf(id) : null, noyau: m.noyau || null, figure: null };
      const S = Math.min(W, H) / 46 * (m.boss ? 1.12 : 1);
      g.save(); g.translate(W / 2, sol); g.scale(S, S); g.lineJoin = 'round'; g.lineCap = 'round';
      try { const peinte = painter.drawBody(g, { x: 0, y: 0 }, s) === 'figure'; if (s.motif && !peinte) painter.drawMotif(g, { x: 0, y: 0 }, s); } catch (e) {   }
      g.restore();
    }
    const url = cv.toDataURL('image/png');
    cache.set(key, url);
    return url;
  },

  openCarnet(id) {
    const ch = this.world.ch;
    const regs = Bestiaire.regions(ch);
    const b = this.best = this.best || { region: null, vue: 'monstres', choisi: null, filtre: '', fiche: false };
    if (id && DATA.monsters[id]) {
      const m = DATA.monsters[id], r = m.region !== 'invocation' ? m.region : ((Bestiaire.invocateurs(id).map(q => DATA.monsters[q]).find(Boolean) || {}).region);
      if (regs.includes(r)) b.region = r;
      b.vue = 'monstres'; b.choisi = id; b.filtre = ''; b.fiche = true;
    }
    if (!regs.includes(b.region)) {
      const ici = this.world.zone && this.world.zone.region;
      b.region = regs.includes(ici) ? ici : (this.carnetTab && regs.includes(this.carnetTab) ? this.carnetTab : regs[0]);
    }
    const r = () => this.fen.render('carnet');
    const actions = {
      region: d => { b.region = d.region; b.choisi = null; b.fiche = false; r(); },
      vue: d => { b.vue = d.vue; b.fiche = false; r(); },
      choisir: d => { b.choisi = d.id; b.vue = 'monstres'; b.fiche = true; r(); },
      retour: () => { b.fiche = false; r(); },
      lieu: d => { b.vue = d.type === 'donjon' ? 'donjons' : 'zones'; b.focus = d.lieu; if (d.region && regs.includes(d.region)) b.region = d.region; r(); },
      voir3d: d => this.ouvrirBete3D(d.id),
    };
    const onField = el => { if (el.id === 'best-recherche') { b.filtre = el.value; b.vue = 'monstres'; r(); } };
    this.simpleWin('carnet', 'Bestiaire', () => this.renderBestiaire(), actions, { width: 980, cls: 'vy-fenetre--bestiaire', onField });
    if (b.focus) requestAnimationFrame(() => {
      const el = document.querySelector(`.vy-best [data-lieu-id="${b.focus}"]`);
      if (el) { el.scrollIntoView({ block: 'start' }); el.classList.add('vu'); }
      b.focus = null;
    });
  },

  renderBestiaire() {
    const ch = this.world.ch, b = this.best, B = Bestiaire;
    const regs = B.regions(ch);
    const tete = `<header class="vy-best__tete">
      <nav class="vy-best__regions" aria-label="Régions">${regs.map(rg => { const a = B.avancement(ch, rg); return `<button type="button" class="vy-best__region${b.region === rg ? ' on' : ''}" data-act="region" data-region="${rg}" aria-pressed="${b.region === rg}"><b>${esc(B.nomRegion(rg))}</b><small>${a.faits} / ${a.total}</small><i class="vy-best__jauge"><i style="width:${a.total ? Math.round(100 * a.faits / a.total) : 0}%"></i></i></button>`; }).join('')}</nav>
      <nav class="vy-best__vues" aria-label="Vues">${[['monstres', 'Monstres'], ['zones', 'Zones'], ['donjons', 'Donjons']].map(([v, l]) => `<button type="button" class="vy-best__vue${b.vue === v ? ' on' : ''}" data-act="vue" data-vue="${v}" aria-pressed="${b.vue === v}">${ICO[v]}<span>${l}</span></button>`).join('')}</nav>
      <label class="vy-recherche vy-best__recherche">${ICO.recherche}<input id="best-recherche" type="search" placeholder="Chercher une bête…" value="${esc(b.filtre)}" aria-label="Chercher une bête"></label>
    </header>`;
    const corps = b.vue === 'zones' ? this.bestZones() : b.vue === 'donjons' ? this.bestDonjons() : this.bestMonstres();
    return `<div class="vy-best vue-${b.vue}${b.fiche ? ' vue-fiche' : ''}">${tete}${corps}</div>`;
  },

  carteBete(id, petit) {
    const ch = this.world.ch, m = DATA.monsters[id], vu = Bestiaire.connu(ch, id), n = Bestiaire.vaincus(ch, id);
    const f = Bestiaire.fiche(id), b = this.best;
    const marque = f.boss ? '<i class="vy-best__marque boss">Boss</i>' : f.argent ? '<i class="vy-best__marque argent">Argent</i>' : f.rare ? '<i class="vy-best__marque rare">Rare</i>' : f.invocation ? '<i class="vy-best__marque inv">Invocation</i>' : '';
    const img = this.portraitBete(id, petit ? 64 : 96, petit ? 72 : 108);
    return `<button type="button" class="vy-best__carte${vu ? '' : ' inconnu'}${b.choisi === id ? ' choisi' : ''}${f.boss ? ' boss' : ''}${petit ? ' petit' : ''}" data-act="choisir" data-id="${id}" title="${vu ? esc(m.name) : 'Pas encore vaincu'}">
      <span class="vy-best__portrait">${img ? `<img src="${img}" alt="" draggable="false">` : ''}${f.modele3d && vu ? `<i class="vy-best__3d" title="Modèle 3D">${ICO.cube}</i>` : ''}</span>
      <b>${vu ? esc(m.name) : '???'}</b><small>${niv(f.niveau)}${vu && n ? ` · ${n}` : ''}</small>${marque}</button>`;
  },

  bestMonstres() {
    const ch = this.world.ch, b = this.best, B = Bestiaire;
    const filtre = sansAccents(b.filtre.trim());
    let ordre = B.monstres(b.region);
    const rares = B.rares(b.region);
    if (filtre) {
      ordre = B.regions(ch).flatMap(rg => B.monstres(rg).concat(B.rares(rg).map(id => ({ id, groupe: 'Rares d\'argent' }))))
        .filter(x => B.connu(ch, x.id) && sansAccents(DATA.monsters[x.id].name).includes(filtre)).map(x => ({ id: x.id, groupe: 'Recherche' }));
    }
    const groupes = [];
    for (const x of ordre) { let g = groupes[groupes.length - 1]; if (!g || g.nom !== x.groupe) { g = { nom: x.groupe, ids: [] }; groupes.push(g); } g.ids.push(x.id); }
    if (!filtre && rares.length) groupes.push({ nom: 'Rares d\'argent', ids: rares, note: 'Une variante rare par famille : elle remplace parfois une bête de son groupe, environ une fois sur 40, et revient au bout de deux heures.' });
    const tous = groupes.flatMap(g => g.ids);
    if (!b.choisi || !tous.includes(b.choisi)) b.choisi = tous[0] || null;
    const liste = groupes.length ? groupes.map(g => `<section class="vy-best__groupe"><h4>${esc(g.nom)}<small>${g.ids.filter(id => B.connu(ch, id)).length} / ${g.ids.length}</small></h4>${g.note ? `<p class="vy-best__note">${esc(g.note)}</p>` : ''}<div class="vy-best__grille">${g.ids.map(id => this.carteBete(id)).join('')}</div></section>`).join('')
      : `<p class="vy-q-vide">${filtre ? 'Aucune bête inscrite de ce nom.' : 'Aucune bête ici.'}</p>`;
    return `<section class="vy-best__liste" data-defile="best-liste-${b.region}">${liste}</section><section class="vy-best__fiche" data-defile="best-fiche">${b.choisi ? this.ficheBete(b.choisi) : ''}</section>`;
  },

  ficheBete(id) {
    const ch = this.world.ch, B = Bestiaire, f = B.fiche(id), m = DATA.monsters[id], vu = B.connu(ch, id), n = B.vaincus(ch, id);
    const EL = DATA.elements || {};
    const lieux = f.lieux.length ? f.lieux.map(l => `<button type="button" class="vy-best__lieu" data-act="lieu" data-type="${l.type}" data-lieu="${l.id}" data-region="${l.region || ''}">${ICO.lieu}${esc(l.nom)}</button>`).join('')
      : f.invoquePar.length ? `<span class="vy-best__lieu nu">invoqué par ${f.invoquePar.map(q => esc(B.connu(ch, q) ? DATA.monsters[q].name : '???')).join(', ')}</span>` : '<span class="vy-best__lieu nu">On ne la croise pas encore.</span>';
    const portrait = `<div class="vy-best__grand${vu ? '' : ' inconnu'}"><img src="${this.portraitBete(id, 220, 240)}" alt="" draggable="false">
      ${vu && f.modele3d ? `<button type="button" class="vy-bouton vy-best__voir3d" data-act="voir3d" data-id="${id}">${ICO.cube}<span>Voir en 3D</span></button>` : ''}</div>`;
    const retour = `<button type="button" class="vy-q-retour" data-act="retour">${ICO.retour}Toutes les bêtes</button>`;
    if (!vu) {
      return `${retour}${portrait}<header class="vy-best__ftete"><h3>???</h3><span class="vy-best__niv">${niv(f.niveau)}</span></header>
        <p class="vy-best__recit">Pas encore vaincue. ${f.invocation ? 'Elle s\'inscrit au Bestiaire avec la bête qui l\'appelle.' : 'La vaincre l\'inscrit au Bestiaire, avec son rôle, ses sorts et ses résistances.'}</p>
        <div class="vy-sous"><span>Où la trouver</span></div><div class="vy-best__lieux">${lieux}</div>`;
    }
    const badges = [f.boss ? '<i class="vy-best__badge boss">Boss</i>' : '', f.argent ? '<i class="vy-best__badge argent">Rare d\'argent</i>' : f.rare ? '<i class="vy-best__badge rare">Rare</i>' : '', f.invocation ? '<i class="vy-best__badge inv">Invocation</i>' : '', f.modele3d ? '<i class="vy-best__badge d3">Modèle 3D</i>' : ''].join('');
    const res = f.res.length ? f.res.map(x => `<span class="vy-best__res" style="--c:${(EL[x.el] && EL[x.el].color) || '#cfc6b6'}">${esc((EL[x.el] && EL[x.el].label) || x.el)} <b>${x.v > 0 ? '+' : ''}${x.v} %</b></span>`).join('') : '<span class="vy-best__res nu">aucune</span>';
    const sorts = f.sorts.length ? `<ul class="vy-best__sorts">${f.sorts.map(s => `<li><b style="color:${(EL[s.el] && EL[s.el].color) || '#f7f0de'}">${esc(s.nom)}</b>${s.desc ? ` <span>${esc(s.desc)}</span>` : ''}</li>`).join('')}</ul>` : '<p class="vy-best__note">Ne frappe pas.</p>';
    const argents = f.argents.length ? `<div class="vy-sous"><span>Variante d'argent</span></div><div class="vy-best__mini">${f.argents.map(a => this.carteBete(a, true)).join('')}</div>` : '';
    const base = f.argent && f.base ? `<p class="vy-best__note">La forme rare de ${esc(DATA.monsters[f.base].name)} : plus de PV, trois fois l'XP, le butin deux fois plus fréquent.</p>` : '';
    return `${retour}${portrait}
      <header class="vy-best__ftete"><h3>${esc(m.name)}</h3><span class="vy-best__niv">${niv(f.niveau)}</span></header>
      ${badges ? `<div class="vy-best__badges">${badges}</div>` : ''}
      <p class="vy-best__recit">${esc(m.desc || '')}</p>${base}
      <dl class="vy-best__stats"><div><dt>Rôle</dt><dd>${esc(f.role)}</dd></div><div><dt>PV</dt><dd>${f.pv}</dd></div><div><dt>PA</dt><dd>${f.pa}</dd></div><div><dt>PM</dt><dd>${f.pm}</dd></div><div><dt>Vaincus</dt><dd>${n}</dd></div></dl>
      <div class="vy-sous"><span>Résistances</span></div><div class="vy-best__resist">${res}</div>
      <div class="vy-sous"><span>Sorts</span></div>${sorts}
      <div class="vy-sous"><span>Où la trouver</span></div><div class="vy-best__lieux">${lieux}</div>${argents}`;
  },

  bestZones() {
    const ch = this.world.ch, b = this.best, B = Bestiaire;
    const nomDj = id => { const d = DATA.content.dungeons.find(x => x.id === id); return d ? d.name : id; };
    const puce = (id, pct) => { const vu = B.connu(ch, id); return `<button type="button" class="vy-best__puce${vu ? '' : ' inconnu'}" data-act="choisir" data-id="${id}"><img src="${this.portraitBete(id, 64, 72)}" alt=""><span>${vu ? esc(DATA.monsters[id].name) : '???'}</span>${pct != null ? `<b>${pct} %</b>` : ''}</button>`; };
    const cartes = B.zones(b.region).map(z => `<article class="vy-best__zone" data-lieu-id="${z.id}">
      <header><h4>${esc(z.nom)}</h4><span class="vy-best__niv">${niv(z.niveau)}</span></header>
      <p class="vy-best__recit">${esc(z.desc)}</p>
      ${z.sousZones.length ? `<div class="vy-sous"><span>Sous-zones</span></div><div class="vy-best__sz">${z.sousZones.map(s => `<span>${esc(s)}</span>`).join('')}</div>` : ''}
      ${z.faune.length ? `<div class="vy-sous"><span>Faune</span></div><div class="vy-best__puces">${z.faune.map(x => puce(x.id, x.pct)).join('')}</div>
        <p class="vy-best__note">Groupes de ${z.tailles.map(t => `${t.n} : ${t.pct} %`).join(' · ')}${z.groupesFixes ? ` · ${z.groupesFixes} groupe${z.groupesFixes > 1 ? 's' : ''} fixe${z.groupesFixes > 1 ? 's' : ''} (quêtes, formes rares)` : ''}.</p>`
        : `<p class="vy-best__note">Pas de faune : une ville ou un village.</p>${z.monstresFixes.length ? `<div class="vy-best__puces">${z.monstresFixes.map(id => puce(id)).join('')}</div>` : ''}`}
      ${z.donjons.length ? `<div class="vy-best__lieux">${z.donjons.map(d => `<button type="button" class="vy-best__lieu" data-act="lieu" data-type="donjon" data-lieu="${d}">${ICO.donjons}${esc(nomDj(d))}</button>`).join('')}</div>` : ''}
    </article>`).join('');
    return `<section class="vy-best__pleine" data-defile="best-zones-${b.region}"><div class="vy-best__cartes">${cartes}</div></section>`;
  },

  bestDonjons() {
    const ch = this.world.ch, b = this.best, B = Bestiaire;
    const nomZone = id => { const z = DATA.content.zones.find(x => x.id === id); return z ? z.name : id; };
    const puce = id => { const vu = B.connu(ch, id), m = DATA.monsters[id]; return `<button type="button" class="vy-best__puce${vu ? '' : ' inconnu'}${m.boss ? ' boss' : ''}" data-act="choisir" data-id="${id}"><img src="${this.portraitBete(id, 64, 72)}" alt=""><span>${vu ? esc(m.name) : '???'}</span></button>`; };
    const liste = B.donjons(b.region);
    const cartes = liste.map(d => `<article class="vy-best__zone vy-best__donjon" data-lieu-id="${d.id}">
      <header><h4>${esc(d.nom)}</h4><span class="vy-best__niv">${niv(d.niveau)}</span></header>
      <button type="button" class="vy-best__entree" data-act="lieu" data-type="zone" data-lieu="${d.zone}">Entrée : ${esc(nomZone(d.zone))}</button>
      <p class="vy-best__recit">${esc(d.desc)}</p>
      <ol class="vy-best__salles">${d.salles.map((s, k) => `<li><span class="vy-best__salle"><i>${k + 1}</i>${esc(s.nom)}</span><div class="vy-best__puces">${s.monstres.map(puce).join('')}</div></li>`).join('')}</ol>
    </article>`).join('');
    return `<section class="vy-best__pleine" data-defile="best-donjons-${b.region}">${liste.length ? `<div class="vy-best__cartes">${cartes}</div>` : '<p class="vy-q-vide">Pas de donjon dans cette région.</p>'}</section>`;
  },

  ouvrirBete3D(id) {
    this.fermerBete3D();
    const m = DATA.monsters[id];
    if (!m || typeof Visionneuse3D !== 'function') return;
    const f = Bestiaire.fiche(id);
    const el = document.createElement('div');
    el.className = 'vy-b3d';
    el.setAttribute('role', 'dialog'); el.setAttribute('aria-modal', 'true'); el.setAttribute('aria-label', `${m.name} en 3D`);
    el.innerHTML = `<div class="vy-b3d__boite">
      <header class="vy-b3d__tete"><div><h3>${esc(m.name)}</h3><small>${niv(f.niveau)} · ${esc(f.role)}</small></div><button type="button" class="vy-b3d__fermer" data-b3d="fermer" aria-label="Fermer">${ICO.fermer}</button></header>
      <div class="vy-b3d__scene"><img class="vy-b3d__attente" src="${this.portraitBete(id, 220, 240)}" alt=""><p class="vy-b3d__etat">Chargement du modèle…</p></div>
      <footer class="vy-b3d__pied"><nav class="vy-b3d__roles" aria-label="Animations"></nav><small>Glisser pour tourner · molette ou pincer pour approcher</small></footer>
    </div>`;
    document.getElementById('app').appendChild(el);
    const scene = el.querySelector('.vy-b3d__scene'), roles = el.querySelector('.vy-b3d__roles');
    const v = this.vue3d = new Visionneuse3D(scene, id);
    const boutons = () => { roles.innerHTML = v.roles.map(r => `<button type="button" class="vy-b3d__role${v.role === r ? ' on' : ''}" data-b3d="role" data-role="${r}" aria-pressed="${v.role === r}">${ROLES_3D[r] || r}</button>`).join(''); };
    v.pret.then(() => { if (this.vue3d !== v) return; el.classList.add('pret'); boutons(); })
      .catch(err => { if (this.vue3d !== v) return; el.classList.add('echec'); el.querySelector('.vy-b3d__etat').textContent = 'La 3D n\'est pas disponible ici : voici son portrait.'; console.warn('Bestiaire 3D :', err && err.message); });
    el.addEventListener('click', e => {
      const t = e.target.closest('[data-b3d]');
      if (!t) { if (e.target === el) this.fermerBete3D(); return; }
      if (t.dataset.b3d === 'fermer') this.fermerBete3D();
      if (t.dataset.b3d === 'role') { v.jouer(t.dataset.role); boutons(); }
    });
    requestAnimationFrame(() => el.classList.add('on'));
    el.querySelector('.vy-b3d__fermer').focus();
  },
  fermerBete3D() {
    if (this.vue3d) { this.vue3d.detruire(); this.vue3d = null; }
    const el = document.querySelector('#app > .vy-b3d');
    if (el) el.remove();
  },
});
})();
