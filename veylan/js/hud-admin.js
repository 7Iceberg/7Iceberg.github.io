(() => {
const esc = s => Util.esc(s);
const nf = n => Number(n || 0).toLocaleString('fr-FR');
const svg = p => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${p}</svg>`;
const ICO = {
  accueil: svg('<path d="M4 11l8-7 8 7v9a1 1 0 0 1-1 1h-4v-6H9v6H5a1 1 0 0 1-1-1z"/>'),
  perso: svg('<circle cx="12" cy="8" r="3.6"/><path d="M5 20c.8-4 3.6-6 7-6s6.2 2 7 6"/>'),
  objets: svg('<path d="M4 8l8-4 8 4-8 4z"/><path d="M4 8v8l8 4 8-4V8M12 12v8"/>'),
  metiers: svg('<path d="M14 6l4 4-9 9H5v-4z"/><path d="M12 8l4 4"/>'),
  monde: svg('<circle cx="12" cy="12" r="8.5"/><path d="M3.5 12h17M12 3.5c2.5 2.6 3.6 5.4 3.6 8.5S14.5 17.9 12 20.5C9.5 17.9 8.4 15.1 8.4 12S9.5 6.1 12 3.5z"/>'),
  quetes: svg('<path d="M8 3h9a2 2 0 0 1 2 2v12"/><path d="M8 3a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h9a2 2 0 0 0 2-2"/><path d="M10 8h5M10 12h5M10 16h3"/>'),
  succes: svg('<path d="M8 4h8v5a4 4 0 0 1-8 0z"/><path d="M8 6H5a3 3 0 0 0 3 4M16 6h3a3 3 0 0 1-3 4M12 13v4M9 20h6"/>'),
  compagnons: svg('<circle cx="7" cy="9" r="2"/><circle cx="12" cy="6.5" r="2"/><circle cx="17" cy="9" r="2"/><path d="M8 17c0-3 1.8-5 4-5s4 2 4 5-1.8 3-4 3-4 0-4-3z"/>'),
  rangs: svg('<path d="M12 3l7 3v5c0 4.6-3 8.4-7 10-4-1.6-7-5.4-7-10V6z"/><path d="M9 12l2 2 4-4"/>'),
  journal: svg('<path d="M6 4h12v16H6z"/><path d="M9 8h6M9 12h6M9 16h4"/>'),
  console: svg('<rect x="3" y="4" width="18" height="16" rx="2"/><path d="M7 9l3 3-3 3M12 15h5"/>'),
  fermer: svg('<path d="M6 6l12 12M18 6L6 18"/>'),
  recherche: svg('<circle cx="11" cy="11" r="6.5"/><path d="M16 16l4 4"/>'),
};
const PAGES = [
  ['accueil', 'Accueil', 'open'], ['perso', 'Personnage', 'fiche'], ['objets', 'Objets', 'base'], ['metiers', 'Métiers', 'metiers'],
  ['monde', 'Monde', 'monde'], ['quetes', 'Quêtes', 'quetes'], ['succes', 'Succès', 'succes'], ['compagnons', 'Compagnons', 'compagnons'],
  ['rangs', 'Rangs et droits', 'rangs'], ['journal', 'Journal', 'journal'], ['console', 'Console', 'console'],
];

Object.assign(Hud.prototype, {
  initAdmin() {
    if (typeof Admin !== 'object') return;
    Admin.attacher(this.world, this);
    this.admin = { page: 'accueil', filtre: '', cat: '', choisi: null, sortie: [], historique: [], hist: -1, rang: null };
    window.addEventListener('keydown', evt => {
      if (evt.key === 'Escape' && this.elAdmin) { evt.preventDefault(); evt.stopImmediatePropagation(); this.basculerAdmin(false); return; }
      if (evt.key !== 'F8' || evt.repeat) return;
      evt.preventDefault();
      this.basculerAdmin();
    }, true);
  },

  basculerAdmin(on) {
    const ouvert = !!this.elAdmin;
    const voulu = on == null ? !ouvert : on;
    if (!voulu) { if (this.elAdmin) { this.elAdmin.remove(); this.elAdmin = null; } return; }
    if (!Admin.peut('open')) { this.toast('Le Conseil est réservé au staff.'); return; }
    if (!this.elAdmin) {
      const el = this.elAdmin = document.createElement('div');
      el.className = 'vy-admin';
      el.setAttribute('role', 'dialog');
      el.setAttribute('aria-label', 'Le Conseil des Veilleurs');
      el.addEventListener('click', evt => this.clicAdmin(evt));
      el.addEventListener('input', evt => this.champAdmin(evt, 'input'));
      el.addEventListener('change', evt => this.champAdmin(evt, 'change'));
      el.addEventListener('keydown', evt => this.toucheAdmin(evt));
      document.getElementById('app').appendChild(el);
    }
    this.rendreAdmin();
  },

  adminFaire(id, args) {
    const r = Admin.executer(id, args || []);
    this.toast(r.texte || (r.ok ? 'Fait.' : 'Refusé.'));
    this.admin.sortie.push({ t: `/${id} ${(args || []).join(' ')}`.trim(), r });
    this.rendreAdmin();
    return r;
  },

  annonceAdmin(texte) {
    const a = document.createElement('div');
    a.className = 'vy-admin-annonce';
    a.innerHTML = `<small>Annonce du Conseil</small><b>${esc(texte)}</b>`;
    document.getElementById('app').appendChild(a);
    setTimeout(() => a.classList.add('part'), 4200);
    setTimeout(() => a.remove(), 4800);
  },

  rendreAdmin() {
    const el = this.elAdmin;
    if (!el) return;
    const S = this.admin, idRang = Admin.rangDe(), r = Admin.rang(idRang) || {};
    const page = PAGES.find(p => p[0] === S.page) || PAGES[0];
    const nav = PAGES.map(([id, label, droit]) => { const ok = Admin.peut(droit);
      return `<button type="button" class="vy-admin__nav${id === page[0] ? ' on' : ''}" data-page="${id}" ${ok ? '' : 'disabled'} title="${esc(label)}${ok ? '' : ' (ton rang ne le permet pas)'}">${ICO[id]}<span>${esc(label)}</span></button>`; }).join('');
    const rendu = this['adminPage_' + page[0]];
    const corps = Admin.peut(page[2]) ? (rendu ? rendu.call(this) : '') : '<p class="vy-admin__vide">Ton rang ne permet pas cette page.</p>';
    const defile = el.querySelector('.vy-admin__corps');
    const haut = defile ? defile.scrollTop : 0, memePage = el.dataset.vue === page[0];
    const focus = document.activeElement && el.contains(document.activeElement) && document.activeElement.id ? [document.activeElement.id, document.activeElement.selectionStart] : null;
    el.dataset.vue = page[0];
    el.innerHTML = `<div class="vy-admin__boite">
      <aside class="vy-admin__cote"><div class="vy-admin__marque"><b>Le Conseil</b><small>des Veilleurs</small></div><nav>${nav}</nav>
        <div class="vy-admin__moi"><i style="--c:${r.couleur || '#aaa'}"></i><span><b>${esc(this.world.ch ? this.world.ch.name : '')}</b><small>${esc(r.label || idRang)}${Admin.dev() ? ' · mode développeur' : ''}</small></span></div></aside>
      <section class="vy-admin__page"><header class="vy-admin__tete"><h2>${esc(page[1])}</h2><button type="button" class="vy-admin__fermer" data-act="fermer" aria-label="Fermer (F8)">${ICO.fermer}</button></header>
        <div class="vy-admin__corps">${corps}</div></section></div>`;
    const nd = el.querySelector('.vy-admin__corps');
    if (nd && memePage) nd.scrollTop = haut;
    if (page[0] === 'console') { const o = el.querySelector('.vy-admin__sortie'); if (o) o.scrollTop = o.scrollHeight; }
    if (focus) { const f = el.querySelector('#' + focus[0]); if (f) { f.focus(); try { if (focus[1] != null) f.setSelectionRange(focus[1], focus[1]); } catch (e) {   } } }
  },

  clicAdmin(evt) {
    const S = this.admin;
    if (evt.target === this.elAdmin) { this.basculerAdmin(false); return; }
    const nav = evt.target.closest('.vy-admin__nav[data-page]');
    if (nav && !nav.disabled) { S.page = nav.dataset.page; S.filtre = ''; S.cat = ''; S.choisi = null; this.rendreAdmin(); return; }
    const b = evt.target.closest('[data-act]');
    if (!b || b.disabled) return;
    const d = b.dataset, val = sel => { const x = this.elAdmin.querySelector(sel); return x ? x.value : ''; };
    switch (d.act) {
      case 'fermer': this.basculerAdmin(false); break;
      case 'cmd': this.adminFaire(d.cmd, d.args ? JSON.parse(d.args) : []); break;
      case 'cmdChamp': this.adminFaire(d.cmd, [...(d.avant ? JSON.parse(d.avant) : []), val(d.champ), ...(d.apres ? JSON.parse(d.apres) : [])].filter(x => x !== '')); break;
      case 'choisir': S.choisi = d.id; this.rendreAdmin(); break;
      case 'cat': S.cat = d.cat; this.rendreAdmin(); break;
      case 'aller': S.page = d.page; S.filtre = d.filtre || ''; S.choisi = d.id || null; this.rendreAdmin(); break;
      case 'rangChoisir': S.rang = d.id; this.rendreAdmin(); break;
      case 'rangDroit': { const v = d.v === 'null' ? null : d.v === 'true'; const r = Admin.gererRang(d.id, { droit: [d.droit, v] }); if (!r.ok) this.toast(r.texte); this.rendreAdmin(); break; }
      case 'rangNouveau': { const id = Admin.nouveauRang(); if (id) S.rang = id; else this.toast('Ton rang ne permet pas de créer un rang.'); this.rendreAdmin(); break; }
      case 'rangSuppr': { if (!b.dataset.sure) { b.dataset.sure = '1'; b.textContent = 'Confirmer la suppression'; return; } const r = Admin.gererRang(d.id, null); this.toast(r.texte); S.rang = null; this.rendreAdmin(); break; }
      case 'rangEnreg': { const r = Admin.gererRang(d.id, { label: val('#adm-rang-nom'), niveau: val('#adm-rang-niveau'), couleur: val('#adm-rang-couleur') }); this.toast(r.texte); this.rendreAdmin(); break; }
      case 'membre': { const r = Admin.membre(this.world.ch, val('#adm-membre')); this.toast(r.texte); this.rendreAdmin(); break; }
      case 'console': this.adminConsole(); break;
      case 'exemple': { const i = this.elAdmin.querySelector('#adm-console'); if (i) { i.value = d.texte; i.focus(); } break; }
      default: break;
    }
  },

  champAdmin(evt, kind) {
    const t = evt.target;
    if (t.id === 'adm-filtre') { this.admin.filtre = t.value; if (kind === 'input') this.rendreAdmin(); }
  },

  toucheAdmin(evt) {
    const t = evt.target, S = this.admin;
    evt.stopPropagation();
    if (evt.key === 'Escape') { evt.preventDefault(); this.basculerAdmin(false); return; }
    if (t.id === 'adm-console') {
      if (evt.key === 'Enter') { evt.preventDefault(); this.adminConsole(); }
      else if (evt.key === 'ArrowUp' || evt.key === 'ArrowDown') {
        evt.preventDefault();
        const h = S.historique; if (!h.length) return;
        S.hist = evt.key === 'ArrowUp' ? Math.max(0, (S.hist < 0 ? h.length : S.hist) - 1) : Math.min(h.length, S.hist + 1);
        t.value = h[S.hist] || '';
      }
    } else if (evt.key === 'Enter' && t.dataset.entree) { evt.preventDefault(); const b = this.elAdmin.querySelector(`[data-act][data-champ="#${t.id}"]`); if (b) b.click(); }
  },

  adminConsole() {
    const S = this.admin, i = this.elAdmin.querySelector('#adm-console');
    const texte = i ? i.value.trim() : '';
    if (!texte) return;
    S.historique.push(texte); S.hist = -1;
    const r = Admin.console(texte);
    S.sortie.push({ t: texte, r });
    if (S.sortie.length > 200) S.sortie.shift();
    if (i) i.value = '';
    this.rendreAdmin();
  },

  adminBouton(label, cmd, args, opts) {
    const o = opts || {}, ok = Admin.peut((Admin.COMMANDES[cmd] || {}).droit);
    return `<button type="button" class="vy-bouton vy-bouton--petit${o.primaire ? ' vy-bouton--primaire' : ''}" data-act="cmd" data-cmd="${cmd}" data-args='${esc(JSON.stringify(args || []))}' ${ok ? '' : 'disabled title="Ton rang ne le permet pas"'}>${esc(label)}</button>`;
  },
  adminChamp(id, label, cmd, opts) {
    const o = opts || {}, ok = Admin.peut((Admin.COMMANDES[cmd] || {}).droit);
    return `<div class="vy-admin__champ"><label for="${id}">${esc(label)}</label><input id="${id}" type="${o.type || 'text'}" ${o.min != null ? `min="${o.min}"` : ''} ${o.max != null ? `max="${o.max}"` : ''} value="${esc(o.valeur == null ? '' : o.valeur)}" placeholder="${esc(o.aide || '')}" data-entree="1" ${ok ? '' : 'disabled'}>` +
      `<button type="button" class="vy-bouton vy-bouton--petit vy-bouton--primaire" data-act="cmdChamp" data-cmd="${cmd}" data-champ="#${id}" ${o.avant ? `data-avant='${esc(JSON.stringify(o.avant))}'` : ''} ${o.apres ? `data-apres='${esc(JSON.stringify(o.apres))}'` : ''} ${ok ? '' : 'disabled'}>${esc(o.bouton || 'Appliquer')}</button></div>`;
  },
  adminRecherche(aide) {
    return `<label class="vy-recherche vy-admin__recherche">${ICO.recherche}<input id="adm-filtre" type="search" value="${esc(this.admin.filtre)}" placeholder="${esc(aide)}" aria-label="${esc(aide)}"></label>`;
  },

  adminPage_accueil() {
    const ch = this.world.ch, w = this.world, j = Admin.peut('journal') ? Admin.journal().slice(0, 6) : [];
    const tuile = (k, v, s) => `<div class="vy-admin__tuile"><small>${k}</small><b>${v}</b>${s ? `<em>${s}</em>` : ''}</div>`;
    const carte = w.mapId && World.mapDef(w.mapId);
    const heure = typeof Heure === 'object' && Heure.libelle ? Heure.libelle(Date.now()) : '';
    return `<div class="vy-admin__tuiles">
        ${tuile('Personnage', esc(ch.name), `${esc(ch.classDef.name)} · niveau ${ch.level}`)}
        ${tuile('Dragmes', nf(ch.fils), `${nf(ch.counters.filsEarned)} gagnées en tout`)}
        ${tuile('Combats', nf(ch.counters.wins), `victoires sur ${nf(ch.counters.fights)}`)}
        ${tuile('Quêtes', nf(ch.quests.done.length), `${Object.keys(ch.quests.active).length} en cours`)}
        ${tuile('Succès', nf((ch.achievements || []).length), `sur ${nf(typeof Achievements === 'object' ? Achievements.defs().length : 0)}`)}
        ${tuile('Lieu', esc(carte ? carte.name : '-'), esc(heure))}
      </div>
      <h3>Raccourcis</h3><div class="vy-admin__boutons">${this.adminBouton('Soigner', 'soigner')}${this.adminBouton('Retour au Relais', 'relais')}${this.adminBouton('Sauvegarder', 'sauver')}${this.adminBouton(Admin.outil('invincible') ? 'Invincible : oui' : 'Invincible : non', 'invincible')}${this.adminBouton('Révéler la carte', 'carte', ['reveler'])}</div>
      ${this.adminChamp('adm-annonce', 'Annonce à l\'écran', 'annonce', { aide: 'Le texte de l\'annonce', bouton: 'Annoncer' })}
      ${j.length ? `<h3>Dernières actions du staff</h3><ul class="vy-admin__journal">${j.map(x => this.adminLigneJournal(x)).join('')}</ul>` : ''}`;
  },

  adminPage_perso() {
    const ch = this.world.ch, d = ch.derived();
    const inv = Object.keys(ch.inventory).filter(id => ch.count(id) > 0).map(id => Items.get(id)).filter(Boolean).sort((a, b) => a.name.localeCompare(b.name, 'fr'));
    const equipe = Object.entries(ch.equipment).map(([slot, id]) => { const it = id && Items.get(id); return `<li><small>${esc(slot)}</small><span>${it ? esc(it.name) : '-'}</span></li>`; }).join('');
    return `<div class="vy-admin__fiche"><div class="vy-admin__tuiles">
        <div class="vy-admin__tuile"><small>Niveau</small><b>${ch.level}</b><em>${nf(ch.xp)} / ${nf(Character.xpToNext(ch.level))} XP</em></div>
        <div class="vy-admin__tuile"><small>PV</small><b>${nf(ch.hp)} / ${nf(d.hpMax)}</b><em>${d.pa} PA · ${d.pm} PM</em></div>
        <div class="vy-admin__tuile"><small>Points</small><b>${ch.statPoints}</b><em>à répartir</em></div>
        <div class="vy-admin__tuile"><small>Dragmes</small><b>${nf(ch.fils)}</b></div></div>
      <h3>Actions</h3><div class="vy-admin__boutons">${this.adminBouton('Soigner', 'soigner', [], { primaire: true })}${this.adminBouton('Retour au Relais', 'relais')}</div>
      <div class="vy-admin__grille2">
        ${this.adminChamp('adm-xp', 'Expérience', 'xp', { type: 'number', min: 1, aide: '1000', bouton: 'Donner' })}
        ${this.adminChamp('adm-niveau', 'Niveau', 'niveau', { type: 'number', min: 1, max: Character.MAX_LEVEL, valeur: ch.level, bouton: 'Fixer' })}
        ${this.adminChamp('adm-dragmes', 'Dragmes (négatif : retirer)', 'dragmes', { type: 'number', aide: '500', bouton: 'Appliquer' })}
        ${this.adminChamp('adm-points', 'Points de caractéristique', 'points', { type: 'number', aide: '10', bouton: 'Donner' })}
      </div>
      <h3>Équipement</h3><ul class="vy-admin__equipement">${equipe}</ul>
      <h3>Inventaire <small>${inv.length} objets</small></h3>
      <div class="vy-admin__table">${inv.map(it => `<div class="vy-admin__ligne"><span class="vy-admin__ic">${Hud.picto(it)}</span><span class="vy-admin__nom">${esc(it.name)}<small>${esc(it.id)}</small></span><b>× ${ch.count(it.id)}</b>${this.adminBouton('−1', 'retirer', [it.id, '1'])}${this.adminBouton('Tout retirer', 'retirer', [it.id])}</div>`).join('') || '<p class="vy-admin__vide">Le sac est vide.</p>'}</div></div>`;
  },

  adminPage_objets() {
    const S = this.admin, f = Admin.plie(S.filtre);
    const kinds = [['', 'Tous'], ['equip', 'Équipement'], ['consumable', 'Consommables'], ['resource', 'Ressources'], ['knot', 'Nœuds']];
    const tous = Items.all().filter(it => (!S.cat || it.kind === S.cat) && (!f || Admin.plie(it.name).includes(f) || Admin.plie(it.id).includes(f)));
    const liste = tous.slice(0, 120);
    const choisi = S.choisi && Items.get(S.choisi);
    const fiche = choisi ? `<div class="vy-admin__detail"><div class="vy-admin__detail-tete"><span class="vy-case" data-rarete="${Items.rarity(choisi)}"><span class="vy-case__icone">${Hud.picto(choisi)}</span></span><div><b>${esc(choisi.name)}</b><small>${esc(choisi.id)} · ${esc(Items.RARITY_LABEL ? (Items.RARITY_LABEL[Items.rarity(choisi)] || '') : Items.rarity(choisi))}${choisi.level ? ` · niveau ${choisi.level}` : ''}</small></div></div>
        ${choisi.stats ? Items.statLines(choisi.stats).map(l => `<p class="vy-admin__stat">${esc(l)}</p>`).join('') : ''}
        ${choisi.desc ? `<p class="vy-admin__desc">${esc(choisi.desc)}</p>` : ''}
        <p class="vy-admin__desc">Dans le sac : <b>${this.world.ch.count(choisi.id)}</b></p>
        ${this.adminChamp('adm-qte', 'Quantité', 'donner', { type: 'number', min: 1, valeur: 1, avant: [choisi.id], bouton: 'Donner' })}
        <div class="vy-admin__boutons">${this.adminBouton('Retirer tout', 'retirer', [choisi.id])}</div></div>` : '<div class="vy-admin__detail"><p class="vy-admin__vide">Choisis un objet.</p></div>';
    return `<div class="vy-admin__outils">${this.adminRecherche('Chercher un objet (nom ou identifiant)')}<div class="vy-admin__filtres">${kinds.map(([k, l]) => `<button type="button" class="vy-admin__filtre${S.cat === k ? ' on' : ''}" data-act="cat" data-cat="${k}">${l}</button>`).join('')}</div></div>
      <div class="vy-admin__deux"><div class="vy-admin__table">${liste.map(it => `<button type="button" class="vy-admin__ligne${S.choisi === it.id ? ' on' : ''}" data-act="choisir" data-id="${esc(it.id)}"><span class="vy-admin__ic" data-rarete="${Items.rarity(it)}">${Hud.picto(it)}</span><span class="vy-admin__nom">${esc(it.name)}<small>${esc(it.id)}</small></span><em>${it.level ? 'niv. ' + it.level : ''}</em></button>`).join('')}${tous.length > liste.length ? `<p class="vy-admin__vide">${tous.length - liste.length} de plus : affine la recherche.</p>` : ''}${!tous.length ? '<p class="vy-admin__vide">Aucun objet.</p>' : ''}</div>${fiche}</div>`;
  },

  adminPage_metiers() {
    const S = this.admin, f = Admin.plie(S.filtre), ch = this.world.ch;
    const ateliers = (typeof Veille === 'object' && Veille.ATELIERS) || {};
    const cles = Object.keys(ateliers);
    const cat = S.cat && cles.includes(S.cat) ? S.cat : '';
    const recettes = Items.recipes().filter(r => Items.get(r.result) && (!cat || r.workshop === cat) && (!f || Admin.plie(Items.get(r.result).name).includes(f)));
    const nomAtelier = k => { const a = ateliers[k]; return (a && (a.nom || a.name || a.label)) || k; };
    const lignes = recettes.slice(0, 80).map(r => { const it = Items.get(r.result);
      const ingr = (r.ingredients || []).map(i => { const d = Items.get(i.id); const a = ch.count(i.id); return `<span class="${a >= i.count ? 'ok' : ''}">${d ? esc(d.name) : esc(i.id)} ${a}/${i.count}</span>`; }).join('');
      return `<div class="vy-admin__ligne vy-admin__recette"><span class="vy-admin__ic" data-rarete="${Items.rarity(it)}">${Hud.picto(it)}</span><span class="vy-admin__nom">${esc(it.name)}<small>${esc(nomAtelier(r.workshop))}${it.level ? ` · niveau ${it.level}` : ''}</small><span class="vy-admin__ingr">${ingr}</span></span>${this.adminBouton('Ingrédients', 'fabriquer', [it.id, 'ingredients'])}${this.adminBouton('Fabriquer', 'fabriquer', [it.id], { primaire: true })}</div>`; }).join('');
    return `<div class="vy-admin__outils">${this.adminRecherche('Chercher une recette')}<div class="vy-admin__filtres"><button type="button" class="vy-admin__filtre${!cat ? ' on' : ''}" data-act="cat" data-cat="">Tous les ateliers</button>${cles.map(k => `<button type="button" class="vy-admin__filtre${cat === k ? ' on' : ''}" data-act="cat" data-cat="${esc(k)}">${esc(nomAtelier(k))}</button>`).join('')}</div></div>
      <div class="vy-admin__table">${lignes || '<p class="vy-admin__vide">Aucune recette.</p>'}</div>`;
  },

  adminPage_monde() {
    const S = this.admin, f = Admin.plie(S.filtre), w = this.world;
    const zones = [...World.index().zones.values()];
    const blocs = zones.map(z => { const maps = (z.maps || []).filter(m => !f || Admin.plie(m.name).includes(f) || Admin.plie(z.name).includes(f)); if (!maps.length) return '';
      return `<div class="vy-admin__zone"><h4>${esc(z.name)}${z.level ? ` <small>niv. ${Array.isArray(z.level) ? z.level.join('-') : z.level}</small>` : ''}</h4>${maps.map(m => `<div class="vy-admin__ligne${m.id === w.mapId ? ' on' : ''}"><span class="vy-admin__nom">${esc(m.name)}<small>${esc(m.id)}</small></span>${this.adminBouton(m.id === w.mapId ? 'Ici' : 'Y aller', 'tp', [m.id])}</div>`).join('')}</div>`; }).join('');
    return `<h3>Heure et monstres</h3><div class="vy-admin__boutons">${[6, 12, 18, 22].map(h => this.adminBouton(`${h} h`, 'heure', [String(h)])).join('')}${this.adminBouton('Heure réelle', 'heure', ['auto'])}${this.adminBouton('Vider les monstres', 'monstres', ['vider'])}${this.adminBouton('Repeupler', 'monstres', ['repeupler'])}${this.adminBouton('Révéler la carte', 'carte', ['reveler'])}</div>
      <h3>Combat</h3><div class="vy-admin__boutons">${this.adminBouton('Gagner le combat', 'combat', ['gagner'], { primaire: true })}${this.adminBouton('Perdre le combat', 'combat', ['perdre'])}${this.adminBouton(Admin.outil('invincible') ? 'Invincible : oui' : 'Invincible : non', 'invincible')}</div>
      <h3>Téléportation</h3><div class="vy-admin__outils">${this.adminRecherche('Chercher une carte ou une zone')}</div><div class="vy-admin__zones">${blocs || '<p class="vy-admin__vide">Aucune carte.</p>'}</div>`;
  },

  adminPage_quetes() {
    const S = this.admin, f = Admin.plie(S.filtre), ch = this.world.ch;
    const etat = q => ch.quests.active[q.id] ? 'cours' : ch.quests.done.includes(q.id) ? 'faite' : '';
    const l = Quests.defs().filter(q => (!f || Admin.plie(q.name).includes(f) || Admin.plie(q.id).includes(f)) && (!S.cat || etat(q) === S.cat || (S.cat === 'libre' && !etat(q)))).slice(0, 120);
    const cats = [['', 'Toutes'], ['cours', 'En cours'], ['faite', 'Terminées'], ['libre', 'Pas commencées']];
    return `<div class="vy-admin__outils">${this.adminRecherche('Chercher une quête')}<div class="vy-admin__filtres">${cats.map(([k, t]) => `<button type="button" class="vy-admin__filtre${S.cat === k ? ' on' : ''}" data-act="cat" data-cat="${k}">${t}</button>`).join('')}</div></div>
      <div class="vy-admin__table">${l.map(q => { const e = etat(q);
        return `<div class="vy-admin__ligne"><span class="vy-admin__etat ${e}">${e === 'cours' ? 'En cours' : e === 'faite' ? 'Terminée' : '-'}</span><span class="vy-admin__nom">${esc(q.name)}<small>${esc(q.id)} · niveau ${q.level || 1} · ${esc(Quests.npcName(q.giver))}</small></span>
          ${e !== 'cours' ? this.adminBouton('Accepter', 'quete', [q.id, 'accepter']) : this.adminBouton('Abandonner', 'quete', [q.id, 'abandonner'])}${e !== 'faite' ? this.adminBouton('Terminer', 'quete', [q.id, 'terminer'], { primaire: true }) : this.adminBouton('Oublier', 'quete', [q.id, 'oublier'])}</div>`; }).join('') || '<p class="vy-admin__vide">Aucune quête.</p>'}</div>`;
  },

  adminPage_succes() {
    const S = this.admin, f = Admin.plie(S.filtre), ch = this.world.ch, a = new Set(ch.achievements || []);
    const l = Achievements.defs().filter(x => (!f || Admin.plie(x.name).includes(f)) && (!S.cat || (S.cat === 'oui') === a.has(x.id))).slice(0, 150);
    return `<div class="vy-admin__outils">${this.adminRecherche('Chercher un succès')}<div class="vy-admin__filtres">${[['', 'Tous'], ['oui', 'Obtenus'], ['non', 'À obtenir']].map(([k, t]) => `<button type="button" class="vy-admin__filtre${S.cat === k ? ' on' : ''}" data-act="cat" data-cat="${k}">${t}</button>`).join('')}</div></div>
      <div class="vy-admin__table">${l.map(x => `<div class="vy-admin__ligne"><span class="vy-admin__etat ${a.has(x.id) ? 'faite' : ''}">${a.has(x.id) ? 'Obtenu' : '-'}</span><span class="vy-admin__nom">${esc(x.name)}<small>${esc(x.desc || '')}</small></span>${a.has(x.id) ? this.adminBouton('Retirer', 'succes', [x.id, 'retirer']) : this.adminBouton('Donner', 'succes', [x.id, 'donner'], { primaire: true })}</div>`).join('') || '<p class="vy-admin__vide">Aucun succès.</p>'}</div>`;
  },

  adminPage_compagnons() {
    const ch = this.world.ch, S = this.admin, f = Admin.plie(S.filtre);
    const fam = typeof Familiers === 'object' ? Familiers.liste().filter(x => !f || Admin.plie(x.nom).includes(f)) : [];
    const mont = typeof Montures === 'object' ? Montures.liste().filter(x => !f || Admin.plie(x.nom).includes(f)) : [];
    const cos = typeof Garderobe === 'object' ? Garderobe.defs().filter(x => !f || Admin.plie(x.nom).includes(f)).slice(0, 80) : [];
    const m = typeof Montures === 'object' && Montures.de(ch);
    return `<div class="vy-admin__outils">${this.adminRecherche('Chercher un familier, une monture, un cosmétique')}</div>
      <h3>Familiers</h3><div class="vy-admin__table">${fam.map(x => { const a = Familiers.possede(ch, x.id); return `<div class="vy-admin__ligne"><span class="vy-admin__nom">${esc(x.nom)}<small>${esc(x.id)}</small></span>${a ? '<span class="vy-admin__etat faite">Possédé</span>' : this.adminBouton('Faire éclore', 'familier', [x.id], { primaire: true })}</div>`; }).join('') || '<p class="vy-admin__vide">Aucun.</p>'}</div>
      <h3>Montures <small>${m ? `actuelle : ${esc((Montures.def(ch) || {}).nom || '')}` : 'aucune'}</small></h3><div class="vy-admin__table">${mont.map(x => `<div class="vy-admin__ligne"><span class="vy-admin__nom">${esc(x.nom)}<small>${esc(x.id)}</small></span>${this.adminBouton(m && m.id === x.id ? 'Actuelle' : 'Donner', 'monture', [x.id])}</div>`).join('') || '<p class="vy-admin__vide">Aucune.</p>'}</div>
      <h3>Cosmétiques</h3><div class="vy-admin__table">${cos.map(x => `<div class="vy-admin__ligne"><span class="vy-admin__nom">${esc(x.nom)}<small>${esc((Garderobe.TYPE_LABEL || {})[x.type] || x.type || '')}</small></span>${Garderobe.possede(x.id) ? '<span class="vy-admin__etat faite">Possédé</span>' : this.adminBouton('Donner', 'cosmetique', [x.id])}</div>`).join('') || '<p class="vy-admin__vide">Aucun.</p>'}</div>`;
  },

  adminPage_rangs() {
    const S = this.admin, rangs = Admin.rangs(), ids = Object.keys(rangs).sort((a, b) => rangs[b].niveau - rangs[a].niveau);
    const moi = Admin.rangDe(), niveauMoi = (Admin.rang(moi) || {}).niveau || 0;
    if (!S.rang || !rangs[S.rang]) S.rang = ids[0];
    const r = rangs[S.rang], modifiable = Admin.peut('rangs') && (r.niveau < niveauMoi || moi === 'fondateur');
    const cats = [...new Set(Admin.DROITS.map(d => d[2]))];
    const droits = cats.map(c => `<div class="vy-admin__cat"><h4>${esc(c)}</h4>${Admin.DROITS.filter(d => d[2] === c).map(([id, label, , niv]) => {
      const exc = r.droits && typeof r.droits[id] === 'boolean' ? r.droits[id] : null, on = Admin.peut(id, S.rang);
      const suivant = exc === null ? !on : exc === !(r.niveau >= niv) ? null : !exc;
      return `<button type="button" class="vy-admin__droit${on ? ' on' : ''}${exc !== null ? ' exception' : ''}" data-act="rangDroit" data-id="${esc(S.rang)}" data-droit="${id}" data-v="${suivant}" ${modifiable ? '' : 'disabled'} title="Niveau ${niv} par défaut${exc !== null ? ' · réglé à la main' : ''}"><i></i><span>${esc(label)}</span><small>niv. ${niv}</small></button>`; }).join('')}</div>`).join('');
    const membres = Admin.membres(), saves = typeof Save === 'object' ? Save.list() : [];
    return `<div class="vy-admin__rangs"><div class="vy-admin__liste-rangs">${ids.map(id => `<button type="button" class="vy-admin__rang${id === S.rang ? ' on' : ''}" data-act="rangChoisir" data-id="${esc(id)}" style="--c:${rangs[id].couleur}"><i></i><span>${esc(rangs[id].label)}<small>niveau ${rangs[id].niveau}${id === moi ? ' · toi' : ''}</small></span></button>`).join('')}
        <button type="button" class="vy-bouton vy-bouton--petit" data-act="rangNouveau" ${Admin.peut('rangs') ? '' : 'disabled'}>Nouveau rang</button></div>
      <div class="vy-admin__rang-fiche"><div class="vy-admin__grille3">
          <div class="vy-admin__champ"><label for="adm-rang-nom">Nom</label><input id="adm-rang-nom" value="${esc(r.label)}" ${modifiable ? '' : 'disabled'}></div>
          <div class="vy-admin__champ"><label for="adm-rang-niveau">Niveau</label><input id="adm-rang-niveau" type="number" min="0" max="5" value="${r.niveau}" ${modifiable ? '' : 'disabled'}></div>
          <div class="vy-admin__champ"><label for="adm-rang-couleur">Couleur</label><input id="adm-rang-couleur" type="color" value="${esc(r.couleur)}" ${modifiable ? '' : 'disabled'}></div></div>
        ${r.desc ? `<p class="vy-admin__desc">${esc(r.desc)}</p>` : ''}
        <div class="vy-admin__boutons"><button type="button" class="vy-bouton vy-bouton--petit vy-bouton--primaire" data-act="rangEnreg" data-id="${esc(S.rang)}" ${modifiable ? '' : 'disabled'}>Enregistrer</button>${S.rang !== 'fondateur' && S.rang !== 'veilleur' ? `<button type="button" class="vy-bouton vy-bouton--petit vy-bouton--danger" data-act="rangSuppr" data-id="${esc(S.rang)}" ${modifiable ? '' : 'disabled'}>Supprimer</button>` : ''}</div>
        <p class="vy-admin__desc">Chaque droit a un niveau minimum ; un clic l'ouvre ou le ferme pour ce rang (en cristal : réglé à la main ; un second clic rend la règle du niveau).${modifiable ? '' : ' Tu ne peux pas modifier un rang égal ou supérieur au tien.'}</p>
        <div class="vy-admin__droits">${droits}</div>
        <h3>Le personnage joué</h3><div class="vy-admin__champ"><label for="adm-membre">Rang de ${esc(this.world.ch.name)}</label><select id="adm-membre" ${Admin.peut('rangs') ? '' : 'disabled'}>${ids.map(id => `<option value="${esc(id)}"${id === moi ? ' selected' : ''}>${esc(rangs[id].label)}</option>`).join('')}</select><button type="button" class="vy-bouton vy-bouton--petit vy-bouton--primaire" data-act="membre" ${Admin.peut('rangs') ? '' : 'disabled'}>Donner</button></div>
        ${saves.length ? `<h3>Personnages de cet appareil</h3><div class="vy-admin__table">${saves.map(s => { const id = membres[s.uid]; const rg = id && rangs[id]; return `<div class="vy-admin__ligne"><span class="vy-admin__nom">${esc(s.name)}<small>niveau ${s.level}</small></span><span class="vy-admin__etat" style="color:${rg ? rg.couleur : 'inherit'}">${rg ? esc(rg.label) : Admin.dev() ? 'Fondateur (mode développeur)' : 'Veilleur'}</span></div>`; }).join('')}</div>` : ''}
      </div></div>`;
  },

  adminLigneJournal(x) {
    const r = Admin.rang(x.rang), d = new Date(x.t);
    return `<li><time>${d.toLocaleDateString('fr-FR')} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}</time><b style="color:${r ? r.couleur : 'inherit'}">${esc(x.qui)}</b><span><em>/${esc(x.action)}</em> ${esc(x.detail)}</span></li>`;
  },
  adminPage_journal() {
    const f = Admin.plie(this.admin.filtre);
    const l = Admin.journal().filter(x => !f || Admin.plie(`${x.qui} ${x.action} ${x.detail}`).includes(f));
    return `<div class="vy-admin__outils">${this.adminRecherche('Chercher dans le journal')}</div><ul class="vy-admin__journal">${l.map(x => this.adminLigneJournal(x)).join('') || '<p class="vy-admin__vide">Rien au journal.</p>'}</ul>`;
  },

  adminPage_console() {
    const S = this.admin;
    const sortie = S.sortie.map(o => `<div class="vy-admin__echo"><b>› ${esc(o.t)}</b><pre class="${o.r && o.r.ok ? 'ok' : 'non'}">${esc((o.r && o.r.texte) || '')}</pre></div>`).join('') || '<p class="vy-admin__vide">Tape une commande, par exemple /aide.</p>';
    const exemples = ['/aide', '/donner pain de cime 5', '/xp 5000', '/dragmes 1000', '/tp place du relais', '/heure 22', '/quete arrivee terminer', '/combat gagner'];
    return `<div class="vy-admin__console"><div class="vy-admin__sortie">${sortie}</div>
      <div class="vy-admin__saisie"><span>/</span><input id="adm-console" autocomplete="off" spellcheck="false" placeholder="commande (↑ ↓ : l'historique)" aria-label="Commande"><button type="button" class="vy-bouton vy-bouton--petit vy-bouton--primaire" data-act="console">Exécuter</button></div>
      <div class="vy-admin__exemples">${exemples.map(e => `<button type="button" data-act="exemple" data-texte="${esc(e)}">${esc(e)}</button>`).join('')}</div></div>`;
  },
});
})();
