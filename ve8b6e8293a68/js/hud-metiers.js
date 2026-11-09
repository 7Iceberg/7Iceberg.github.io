(() => {
const esc = s => Util.esc(s);
const nf = n => Number(n || 0).toLocaleString('fr-FR');
const svg = p => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${p}</svg>`;
const PICTO = {
  bucheron: svg('<path d="M5 20l9-9"/><path d="M13 4l5 5-3 3-5-5z"/><path d="M15 6l2 2"/>'),
  mineur: svg('<path d="M4 20l10-10"/><path d="M8 5c4-2 9-1 12 3-3-1-6-1-9 1"/>'),
  paysan: svg('<path d="M12 21V9"/><path d="M12 9c-3 0-4-2-4-5 3 0 4 2 4 5zM12 13c3 0 4-2 4-5-3 0-4 2-4 5zM12 17c-3 0-4-2-4-5 3 0 4 2 4 5z"/>'),
  pecheur: svg('<path d="M3 12c3-4 8-5 12-3l4-3v12l-4-3c-4 2-9 1-12-3z"/><circle cx="8" cy="11" r=".6" fill="currentColor"/>'),
  alchimiste: svg('<path d="M9 3h6M10 3v6l-5 9a2 2 0 0 0 2 3h10a2 2 0 0 0 2-3l-5-9V3"/><path d="M7 15h10"/>'),
  forgeron: svg('<path d="M3 15h12l3-3h3v4h-5l-2 3H6z"/><path d="M8 19v2M13 19v2"/><path d="M9 9l4-4 3 3-4 4"/>'),
  sculpteur: svg('<path d="M6 3c6 3 9 9 6 18"/><path d="M6 3c3 4 3 10 0 18"/><path d="M4 12h9"/>'),
  faconneur: svg('<path d="M12 3l7 3v6c0 4-3 7-7 9-4-2-7-5-7-9V6z"/><circle cx="12" cy="11" r="2.4"/>'),
  bricoleur: svg('<circle cx="8" cy="8" r="3.5"/><path d="M10.5 10.5L20 20M16 16l2-2M18 18l2-2"/>'),
  tailleur: svg('<path d="M5 19L19 5"/><circle cx="17" cy="7" r="2"/><path d="M5 13c3 0 6 3 6 6"/>'),
  cordonnier: svg('<path d="M4 17V8h5v4c3 0 7 1 10 3v2z"/><path d="M4 17h15v2H4z"/>'),
  bijoutier: svg('<path d="M7 4h10l3 5-8 11L4 9z"/><path d="M4 9h16M9 4l3 5 3-5M12 9v11"/>'),
};
const CAT = { coiffe: 'Coiffes', cape: 'Capes', amulette: 'Amulettes', anneau: 'Anneaux', ceinture: 'Ceintures', bottes: 'Bottes', bouclier: 'Boucliers', arme: 'Armes', consommable: 'Consommables', ressource: 'Ressources', cle: 'Clés et nœuds', autre: 'Autres' };
const categorieDe = d => (!d ? 'autre' : d.kind === 'weapon' ? 'arme' : d.kind === 'equip' ? (CAT[d.slot] ? d.slot : 'autre') : d.kind === 'consumable' ? 'consommable' : d.kind === 'resource' ? 'ressource' : d.kind === 'knot' || d.kind === 'key' ? 'cle' : 'autre');
const TRIS = { haut: 'Niveau le plus élevé', bas: 'Niveau le plus bas', nom: 'Par nom', xp: 'Le plus d\'expérience' };
const MANQUE = { tous: 'Tous les ingrédients manquants', un: 'Au plus un ingrédient manquant', aucun: 'Aucun ingrédient manquant' };

Object.assign(Hud.prototype, {
  etatMetiers() {
    const ch = this.world.ch;
    if (!this.met) this.met = { choisi: null, onglet: 'recettes', q: '', min: 1, max: Metiers.MAX, cat: '', tri: 'haut', manque: 'tous', dessus: true, possibles: false, aMonNiveau: false, ordre: 'desc' };
    const S = this.met;
    if (!S.choisi || !Metiers.get(S.choisi)) S.choisi = (this.metiersTries()[0] || {}).id;
    if (ch && Metiers.get(S.choisi).genre !== 'recolte' && S.onglet === 'ressources') S.onglet = 'recettes';
    return S;
  },
  metiersTries() {
    const ch = this.world.ch, S = this.met || { ordre: 'desc' }, M = Metiers;
    const pos = m => M.niveau(ch, m.id) * 1e7 + (ch.metiers[m.id] ? ch.metiers[m.id].xp : 0);
    return M.liste().slice().sort((a, b) => (S.ordre === 'asc' ? pos(a) - pos(b) : pos(b) - pos(a)) || a.nom.localeCompare(b.nom, 'fr'));
  },

  openMetiersPerso() {
    if (typeof Metiers === 'undefined') return;
    Metiers.etat(this.world.ch);
    const S = this.etatMetiers(), r = () => this.fen.render('metiers');
    const actions = {
      metChoisir: d => { S.choisi = d.id; if (Metiers.get(d.id).genre !== 'recolte') S.onglet = 'recettes'; r(); },
      metOnglet: d => { S.onglet = d.onglet; r(); },
      metOrdre: () => { S.ordre = S.ordre === 'desc' ? 'asc' : 'desc'; r(); },
    };
    const onField = (el, kind) => {
      const v = el.type === 'checkbox' ? el.checked : el.value;
      switch (el.id) {
        case 'met-q': S.q = v; break;
        case 'met-min': S.min = Math.max(1, Math.min(Metiers.MAX, parseInt(v, 10) || 1)); if (kind === 'input') return; break;
        case 'met-max': S.max = Math.max(1, Math.min(Metiers.MAX, parseInt(v, 10) || Metiers.MAX)); if (kind === 'input') return; break;
        case 'met-cat': S.cat = v; break;
        case 'met-tri': S.tri = v; break;
        case 'met-manque': S.manque = v; break;
        case 'met-dessus': S.dessus = v; break;
        case 'met-possibles': S.possibles = v; break;
        case 'met-niveau': S.aMonNiveau = v; break;
        default: return;
      }
      if (kind === 'change') setTimeout(r, 0); else r();
    };
    this.simpleWin('metiers', 'Métiers', () => this.renderMetiers(), actions, { width: 1060, cls: 'vy-fenetre--metiers', onField });
  },

  renderMetiers() {
    const ch = this.world.ch, M = Metiers;
    M.etat(ch);
    const S = this.etatMetiers();
    const lignes = this.metiersTries().map(m => {
      const nv = M.niveau(ch, m.id), e = ch.metiers[m.id], besoin = M.xpNiveau(nv), max = nv >= M.MAX;
      const pc = max ? 100 : Math.round(100 * (e.xp || 0) / besoin);
      return `<button type="button" class="vy-met__metier${S.choisi === m.id ? ' on' : ''}" data-act="metChoisir" data-id="${m.id}" aria-pressed="${S.choisi === m.id}" data-genre="${m.genre}">
        <span class="vy-met__picto">${PICTO[m.id] || PICTO.bricoleur}</span>
        <span class="vy-met__corps"><span class="vy-met__nom"><b>${esc(m.nom)}</b>${max ? '' : `<small><em>${nf(e.xp)}</em> / ${nf(besoin)}</small>`}</span>
          <i class="vy-met__jauge" role="progressbar" aria-valuenow="${pc}" aria-valuemin="0" aria-valuemax="100"><i style="width:${pc}%"></i></i></span>
        <span class="vy-met__niveau">${nv}</span></button>`;
    }).join('');
    const gauche = `<section class="vy-met__liste" aria-label="Les métiers"><header class="vy-met__entete"><span>Métier</span><span>Niveau</span>
        <button type="button" class="vy-met__ordre" data-act="metOrdre" title="${S.ordre === 'desc' ? 'Du plus haut au plus bas' : 'Du plus bas au plus haut'} (inverser)" aria-label="Inverser l'ordre">${svg(S.ordre === 'desc' ? '<path d="M8 4v16M4 16l4 4 4-4M16 20V4M12 8l4-4 4 4"/>' : '<path d="M8 20V4M4 8l4-4 4 4M16 4v16M12 16l4 4 4-4"/>')}</button></header>
      <div class="vy-met__metiers">${lignes}</div></section>`;
    const m = M.get(S.choisi), recolte = m.genre === 'recolte';
    const onglets = `<nav class="vy-onglets vy-met__onglets" role="tablist">${[['recettes', 'Recettes'], ['ressources', 'Ressources']].map(([k, l]) =>
      `<button type="button" role="tab" class="vy-onglet${S.onglet === k ? ' on' : ''}" data-act="metOnglet" data-onglet="${k}" aria-selected="${S.onglet === k}" ${k === 'ressources' && !recolte ? 'disabled title="Les métiers de récolte seulement"' : ''}>${l}</button>`).join('')}</nav>`;
    const droite = S.onglet === 'ressources' && recolte ? this.metiersRessources(m) : this.metiersRecettes(m);
    const halle = { recoltes: 'la Halle des Récoltes', forges: 'la Halle des Forges', parures: 'la Halle des Parures' }[m.halle];
    return `<div class="vy-met">${gauche}<section class="vy-met__page">${onglets}
      <p class="vy-met__desc"><b>${esc(m.nom)}</b> · ${esc(m.description)}${halle ? ` <small>Son atelier : ${halle}, aux Cimes.</small>` : ''}</p>${droite}</section></div>`;
  },

  metiersRecettes(m) {
    const ch = this.world.ch, M = Metiers, S = this.met, nv = M.niveau(ch, m.id);
    const toutes = Items.recipes().filter(r => m.ateliers.includes(r.workshop) && Items.get(r.result));
    const q = Util.plie ? Util.plie(S.q) : S.q.toLowerCase();
    const plie = t => (Util.plie ? Util.plie(t) : String(t).toLowerCase());
    const info = r => {
      const d = Items.get(r.result), n = M.niveauRecette(r);
      const ings = r.ingredients.map(i => ({ id: i.id, d: Items.get(i.id), besoin: i.count, a: ch.count(i.id) }));
      const manquants = ings.filter(i => i.a < i.besoin).length;
      const faisables = ings.length ? Math.min(...ings.map(i => Math.floor(i.a / i.besoin))) : 0;
      return { r, d, n, ings, manquants, faisables: n <= nv ? faisables : 0, xp: M.xpFabrication(ch, r), cat: categorieDe(d) };
    };
    const all = toutes.map(info);
    const cats = [...new Set(all.map(x => x.cat))];
    let l = all.filter(x => x.n >= Math.min(S.min, S.max) && x.n <= Math.max(S.min, S.max) && (!S.cat || x.cat === S.cat) && (!q || plie(x.d.name).includes(q))
      && (S.dessus || x.n <= nv) && (!S.possibles || (x.n <= nv && x.manquants === 0)) && (S.manque === 'tous' || (S.manque === 'un' ? x.manquants <= 1 : x.manquants === 0)));
    const tri = { haut: (a, b) => b.n - a.n, bas: (a, b) => a.n - b.n, nom: (a, b) => a.d.name.localeCompare(b.d.name, 'fr'), xp: (a, b) => b.xp - a.xp }[S.tri] || ((a, b) => b.n - a.n);
    l = l.sort((a, b) => tri(a, b) || a.d.name.localeCompare(b.d.name, 'fr'));
    const filtres = `<div class="vy-met__filtres">
        <label class="vy-recherche vy-met__q">${svg('<circle cx="11" cy="11" r="6.5"/><path d="M16 16l4 4"/>')}<input id="met-q" type="search" value="${esc(S.q)}" placeholder="Rechercher…" aria-label="Rechercher une recette"></label>
        <span class="vy-met__niveaux"><span>Niveau</span><input id="met-min" type="number" min="1" max="${M.MAX}" value="${S.min}" aria-label="Niveau minimum"><span>à</span><input id="met-max" type="number" min="1" max="${M.MAX}" value="${S.max}" aria-label="Niveau maximum"></span>
        <select id="met-cat" aria-label="Catégorie"><option value="">Toutes catégories</option>${cats.map(c => `<option value="${c}"${S.cat === c ? ' selected' : ''}>${CAT[c]}</option>`).join('')}</select>
        <select id="met-tri" aria-label="Tri">${Object.entries(TRIS).map(([k, t]) => `<option value="${k}"${S.tri === k ? ' selected' : ''}>${t}</option>`).join('')}</select>
        <select id="met-manque" class="vy-met__large" aria-label="Ingrédients manquants">${Object.entries(MANQUE).map(([k, t]) => `<option value="${k}"${S.manque === k ? ' selected' : ''}>${t}</option>`).join('')}</select></div>`;
    const ligne = x => {
      const bloque = x.n > nv;
      const ings = x.ings.map(i => `<span class="vy-case vy-met__ingr${i.a < i.besoin ? ' manque' : ''}" data-rarete="${i.d ? Items.rarity(i.d) : ''}" title="${esc(i.d ? i.d.name : i.id)} : ${nf(i.a)} / ${nf(i.besoin)}"><span class="vy-case__icone">${i.d ? Hud.picto(i.d) : ''}</span><b>${i.besoin}</b>${i.a < i.besoin ? '<i aria-label="manquant">!</i>' : ''}</span>`).join('');
      return `<div class="vy-met__recette${bloque ? ' bloque' : ''}">
        <span class="vy-met__objet"><span class="vy-case" data-rarete="${Items.rarity(x.d)}"><span class="vy-case__icone">${Hud.picto(x.d)}</span></span><small>x${nf(x.faisables)}</small></span>
        <span class="vy-met__info"><b>${esc(x.d.name)}</b><small>Niv. ${x.n}${x.r.count > 1 ? ` · ×${x.r.count}` : ''}</small><span class="vy-met__ingrs">${ings}</span></span>
        <span class="vy-met__xp">${bloque ? `<small>Niv. ${x.n} requis</small>` : `${nf(x.xp)} <small>XP</small>`}</span></div>`;
    };
    const liste = l.map(ligne).join('') || '<p class="vy-met__vide">Aucune recette ne correspond.</p>';
    const pied = `<footer class="vy-met__pied"><label><input id="met-dessus" type="checkbox" ${S.dessus ? 'checked' : ''}> Afficher les recettes au-dessus de mon niveau</label>
      <label><input id="met-possibles" type="checkbox" ${S.possibles ? 'checked' : ''}> Afficher uniquement les recettes possibles</label><span class="vy-met__compte">${l.length} recette${l.length > 1 ? 's' : ''}</span></footer>`;
    return `${filtres}<div class="vy-met__recettes">${liste}</div>${pied}`;
  },

  metiersRessources(m) {
    const ch = this.world.ch, M = Metiers, S = this.met, nv = M.niveau(ch, m.id);
    let res = (DATA.content.resources || []).filter(r => r.node && m.recolte.includes(r.node.kind)).sort((a, b) => (a.niveau || 1) - (b.niveau || 1) || a.name.localeCompare(b.name, 'fr'));
    if (S.aMonNiveau) res = res.filter(r => (r.niveau || 1) <= nv);
    const lignes = res.map(r => {
      const d = Items.get(r.id), n = r.niveau || 1, bloque = n > nv, xp = M.xpRecolte(ch, r.id, 1);
      return `<div class="vy-met__ressource${bloque ? ' bloque' : ''}"><span class="vy-met__rnom"><span class="vy-case" data-rarete="${d ? Items.rarity(d) : ''}"><span class="vy-case__icone">${d ? Hud.picto(d) : ''}</span></span><b>${esc(r.name)}</b></span>
        <span>${n}</span><span>1 à 2</span><span class="vy-met__xp">${bloque ? `<small>Niv. ${n} requis</small>` : `${nf(xp)} <small>XP</small>`}</span></div>`;
    }).join('') || '<p class="vy-met__vide">Aucune ressource.</p>';
    return `<div class="vy-met__table"><div class="vy-met__ressource vy-met__titres"><span>Nom</span><span>Niveau</span><span>Récolte</span><span>Expérience</span></div>${lignes}</div>
      <footer class="vy-met__pied"><label><input id="met-niveau" type="checkbox" ${S.aMonNiveau ? 'checked' : ''}> Afficher uniquement les ressources récoltables à mon niveau</label><span class="vy-met__compte">${res.length} ressource${res.length > 1 ? 's' : ''}</span></footer>`;
  },
});
})();
