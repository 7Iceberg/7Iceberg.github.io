(() => {
  const E = Encyclopedie;
  const esc = s => Util.esc(String(s ?? ''));
  const boutons = (texte, cible) => `<button type="button" class="vy-ency__lien" data-act="suivre" data-cle="${esc(cible)}">${esc(texte)}</button>`;
  const niv = e => e.niveau.length && e.niveau[0] !== e.niveau.at(-1) ? e.niveau[0] + '–' + e.niveau.at(-1) : e.niveau[0] ?? '—';
  const PAGE = 30;
  const filtresVides = () => ({ q: '', min: '', max: '', cat: '', stat: '', source: '', region: '', tri: 'nom' });
  const select = (id, titre, valeurs, choix) => `<label>${titre}<select id="ency-${id}">${valeurs.map(([v, nom]) =>
    `<option value="${esc(v)}"${v === choix ? ' selected' : ''}>${esc(nom)}</option>`).join('')}</select></label>`;
  const serie = liste => [...new Set(liste)].sort((a, b) => a.localeCompare(b, 'fr')).map(v => [v, v]);
  const nomObjet = id => Items.get(id)?.name || id;
  const objet = id => boutons(nomObjet(id), E.cle('objet', id));
  const article = (titre, contenu) => contenu ? `<section class="vy-ency__bloc"><h4>${titre}</h4>${contenu}</section>` : '';

  function filtres(s) {
    const f = s.filtres, toutes = s.index.vues[s.vue];
    const champ = (k, label) => `<input type="number" id="ency-${k}" min="1" step="1" aria-label="${label}" placeholder="${k === 'min' ? 'Min.' : 'Max.'}" value="${esc(f[k])}">`;
    const niveau = toutes.some(e => e.niveau.length) ? `<fieldset><legend>Niveau</legend>${champ('min', 'Niveau minimum')} ${champ('max', 'Niveau maximum')}</fieldset>` : '';
    const regions = new Map(toutes.flatMap(e => (e.lieux || []).filter(l => l.region).map(l => [l.region, Bestiaire.nomRegion(l.region)])));
    const stats = s.vue === 'equipements' ? select('stat', 'Caractéristique', [['', 'Toutes'],
      ...Object.entries(Items.STAT_LABEL)], f.stat) : '';
    const modes = s.vue === 'bestiaire' ? '' : select('source', 'Obtention', [['', 'Toutes'], ...serie(toutes.flatMap(e => E.modes(e, s.index)))], f.source);
    return `<aside class="vy-ency__filtres" aria-label="Filtres de l’encyclopédie">
      <label>Rechercher<input type="search" id="ency-q" placeholder="Nom, catégorie…" value="${esc(f.q)}"></label>${niveau}
      ${select('cat', 'Catégorie', [['', 'Toutes'], ...serie(toutes.map(e => e.categorie))], f.cat)}
      ${stats}${regions.size ? select('region', 'Région', [['', 'Toutes'], ...regions], f.region) : ''}${modes}
      ${select('tri', 'Trier par', [['nom', 'Nom'], ['niveau', 'Niveau croissant']], f.tri)}
      <button type="button" class="vy-bouton vy-bouton--petit" data-act="reinitialiser">Réinitialiser</button></aside>`;
  }

  function resultat(e, s) {
    const icon = e.type === 'objet' ? `<span class="vy-case" data-rarete="${esc(Items.rarity(e.def))}"><span class="vy-case__icone">${Hud.picto(e.def)}</span></span>` : '';
    const info = e.type === 'monstre' ? (e.butin.length ? e.butin.length + ' butins' : '—') :
      e.type === 'panoplie' ? e.def.pieces.length + ' pièces' : E.modes(e, s.index).join(' · ') || '—';
    return `<button type="button" class="vy-ency__ligne${s.choisi === e.cle ? ' on' : ''}" data-act="choisir" data-cle="${esc(e.cle)}" aria-pressed="${s.choisi === e.cle}">
      <span class="vy-ency__nom">${icon}<b>${esc(e.nom)}</b></span><span>${esc(e.categorie)}</span>
      <span>${niv(e)}</span><span class="vy-ency__obtention">${esc(info)}</span></button>`;
  }

  function vueListe(s) {
    const l = E.filtrer(s.index, s.vue, s.filtres), pages = Math.max(1, Math.ceil(l.length / PAGE));
    s.page = Math.min(s.page, pages - 1);
    const pagination = (delta, label, off) => `<button type="button" class="vy-bouton vy-bouton--petit" data-act="page" data-delta="${delta}"${off ? ' disabled' : ''}>${label}</button>`;
    return `<section class="vy-ency__resultats" aria-label="Résultats">
      <div class="vy-ency__colonnes"><span>Nom</span><span>Catégorie</span><span>Niv.</span><span class="vy-ency__obtention">Obtention</span></div>
      <div class="vy-ency__liste" data-defile="ency-liste">${l.slice(s.page * PAGE, (s.page + 1) * PAGE).map(e => resultat(e, s)).join('') || '<p>Aucun résultat pour ces filtres.</p>'}</div>
      <footer class="vy-ency__pied"><small role="status">${l.length} résultat${l.length > 1 ? 's' : ''}</small>
      ${pages > 1 ? `<span>${pagination(-1, 'Précédent', s.page === 0)} <small>${s.page + 1} / ${pages}</small> ${pagination(1, 'Suivant', s.page + 1 >= pages)}</span>` : ''}</footer></section>`;
  }

  function listeIngredients(ingredients, ch) {
    return `<ul class="vy-ency__ingredients">${ingredients.map(i => {
      const manque = i.manque ?? Math.max(0, i.total - ch.count(i.id));
      return `<li>${objet(i.id)}<span class="${manque ? 'manque' : ''}">${manque ? `${manque} manquant${manque > 1 ? 's' : ''} sur ${i.total}` : `${i.total} / ${i.total} dans le sac`}</span></li>`;
    }).join('')}</ul>`;
  }

  function ficheObjet(e, index, ch) {
    const d = e.def;
    const stats = Items.statLines(d.stats || {});
    const recettes = (index.recettes.get(e.id) || []).map(r => {
      const metier = Metiers.deAtelier(r.workshop), niveau = Metiers.niveauRecette(r);
      const enTete = metier ? `${esc(metier.nom)} · niveau ${niveau}` : `Atelier · niveau ${niveau}`;
      return `<div><p>${enTete}${r.count > 1 ? ` · produit ${r.count} objets` : ''}</p>
        ${listeIngredients(r.ingredients.map(i => ({ id: i.id, total: i.count })), ch)}</div>`;
    }).join('');
    const sources = (index.sources.get(e.id) || []).map(x => `<li><b>${x.genre}</b> · ${x.cible ? boutons(x.nom, x.cible) : esc(x.nom)}
      ${x.lieux?.length ? `<small>${esc(x.lieux.map(l => l.nom).join(', '))}</small>` : ''}</li>`).join('');
    const metier = d.node && Metiers.deRessource(e.id);
    const recolte = metier ? `<p>${esc(metier.nom)} · niveau ${niv(e)}</p>` : '';
    const usages = (index.usages.get(e.id) || []).map(r => `<li>${objet(r.result)}</li>`).join('');
    const soin = d.heal > 0 ? (d.heal >= 999 ? 'Rend tous les PV.' : `Rend ${d.heal} PV.`) : '';
    const parchemin = d.stat && d.value ? `+${d.value} ${Items.STAT_LABEL[d.stat] || d.stat}` : '';
    const effets = [...stats, soin, parchemin].filter(Boolean);
    return `<p>${ch.count(e.id)} dans ton sac${Object.values(ch.equipment || {}).includes(e.id) ? ' · équipé' : ''}</p>
      ${article('Effets', effets.length ? `<p>${esc(effets.join(' · '))}</p>` : '')}
      ${e.panoplie ? article('Panoplie', boutons(e.panoplie.name, E.cle('panoplie', e.panoplie.id))) : ''}
      ${article('Recettes', recettes)}
      ${article('Où l’obtenir', recolte + (sources ? `<ul>${sources}</ul>` : recettes ? '' : '<p>Aucune source n’est renseignée pour cet objet.</p>'))}
      ${article('Utilisé dans', usages ? `<ul>${usages}</ul>` : '')}`;
  }

  function fichePanoplie(e, index, ch) {
    const plan = E.planPanoplie(ch, e.def, index);
    const bonus = Object.entries(e.def.bonuses).map(([n, b]) => `<li>${n} pièces · ${esc(Items.statLines(b).join(', '))}</li>`).join('');
    const pieces = `<ul class="vy-ency__ingredients">${plan.pieces.map(p => `<li>${objet(p.id)}<span class="${p.possede ? '' : 'manque'}">${p.possede ? 'Possédée' : 'À obtenir'}</span></li>`).join('')}</ul>`;
    const aObtenir = plan.aObtenir.map(id => `<li>${objet(id)}</li>`).join('');
    const aChoisir = plan.choix.map(id => `<li>${objet(id)}</li>`).join('');
    return `${article('Pièces · ' + plan.pieces.filter(p => p.possede).length + ' / ' + plan.pieces.length, pieces)}
      ${article('Liste de courses', plan.ingredients.length ? '<p>Ingrédients cumulés pour les pièces à fabriquer.</p>' + listeIngredients(plan.ingredients, ch) : '')}
      ${article('À obtenir autrement', aObtenir ? `<ul>${aObtenir}</ul>` : '')}
      ${article('Plusieurs recettes possibles', aChoisir ? `<ul>${aChoisir}</ul>` : '')}
      ${article('Bonus de panoplie', bonus ? `<ul>${bonus}</ul>` : '')}`;
  }

  function ficheMonstre(e, ch) {
    const lieux = `<ul>${e.lieux.map(l => `<li>${esc(l.nom)}${l.region ? ` · ${esc(Bestiaire.nomRegion(l.region))}` : ''}</li>`).join('')}</ul>`;
    const butin = e.butin.map(b => `<li>${objet(b.id)} <small>${b.rate == null ? '' : `${esc(b.rate.toLocaleString('fr-FR'))} % de base`}</small></li>`).join('');
    return `${article('Où le trouver', lieux)}${article('Butin', butin ? `<ul>${butin}</ul>` : '')}
      ${Bestiaire.connu(ch, e.id) ? '<button class="vy-bouton vy-bouton--petit" type="button" data-act="carnet">Voir ses sorts dans le Carnet</button>' : '<p>Vaincs ce monstre pour consulter ses sorts dans le Carnet.</p>'}`;
  }

  function fiche(s, ch) {
    const e = s.index.entrees.get(s.choisi);
    if (!e) return '';
    const contenu = e.type === 'monstre' ? ficheMonstre(e, ch) : e.type === 'panoplie' ? fichePanoplie(e, s.index, ch) :
      e.type === 'cosmetique' ? `<p>${Garderobe.possede(e.id) ? 'Dans ta Garde-robe' : 'À obtenir'}</p><p>${esc(Garderobe.texteSource(e.def))}</p>` : ficheObjet(e, s.index, ch);
    return `<aside class="vy-ency__fiche" aria-label="Fiche de ${esc(e.nom)}" data-defile="ency-fiche"><div class="vy-ency__fiche-tete">
      <div><h3 tabindex="-1">${esc(e.nom)}</h3><small>${esc(e.categorie)}${e.niveau.length ? ` · Niv. ${niv(e)}` : ''}</small></div>
      <button type="button" class="vy-bouton vy-bouton--petit" data-act="retour">${s.pile.length ? 'Précédent' : 'Fermer la fiche'}</button></div>
      ${e.def.lore ? `<p>${esc(e.def.lore)}</p>` : ''}${contenu}</aside>`;
  }

  Object.assign(Hud.prototype, {
    openEncyclopedie() {
      const s = { index: E.compiler(), vue: 'bestiaire', filtres: filtresVides(), choisi: null, page: 0, pile: [] };
      const rendre = () => this.fen.render('encyclopedie');
      const allerFiche = () => {
        const titre = this.fen.wins?.get('encyclopedie')?.body.querySelector('.vy-ency__fiche h3');
        if (titre) {
          titre.focus({ preventScroll: true });
          titre.scrollIntoView({ block: 'nearest' });
        }
      };
      const ouvrir = (vue, cible) => {
        s.vue = vue; s.filtres = filtresVides(); s.choisi = cible; s.page = 0; rendre();
        if (cible) allerFiche();
      };
      const actions = {
        vue: d => { if (Object.hasOwn(E.ONGLETS, d.vue)) { s.pile.length = 0; ouvrir(d.vue, null); } },
        choisir: d => { if (s.index.entrees.has(d.cle)) { s.choisi = d.cle; s.pile.length = 0; rendre(); allerFiche(); } },
        suivre: d => {
          const e = s.index.entrees.get(d.cle);
          if (!e || e.cle === s.choisi) return;
          s.pile.push({ vue: s.vue, filtres: s.filtres, choisi: s.choisi, page: s.page });
          ouvrir(e.vue, e.cle);
        },
        retour: () => { Object.assign(s, s.pile.pop() || { choisi: null }); rendre(); if (s.choisi) allerFiche(); },
        reinitialiser: () => { s.filtres = filtresVides(); s.page = 0; rendre(); },
        page: d => { s.page = Math.max(0, s.page + (Number(d.delta) === -1 ? -1 : 1)); rendre(); },
        carnet: () => { const e = s.index.entrees.get(s.choisi); if (e?.type === 'monstre') this.openCarnet(e.id); },
      };
      const onField = (el, genre) => {
        const cle = el.id.replace(/^ency-/, '');
        if (!Object.hasOwn(s.filtres, cle) || genre !== (el.type === 'search' ? 'input' : 'change')) return;
        s.filtres[cle] = el.value; s.page = 0; rendre();
      };
      const render = () => `<div class="vy-ency"><nav class="vy-ency__onglets" aria-label="Sections de l’encyclopédie">
        ${Object.entries(E.ONGLETS).map(([id, nom]) => `<button type="button" class="vy-ency__onglet" data-act="vue" data-vue="${id}" aria-pressed="${s.vue === id}">${nom}</button>`).join('')}</nav>
        <div class="vy-ency__grille${s.choisi ? ' avec-fiche' : ''}">${filtres(s)}${vueListe(s)}${fiche(s, this.world.ch)}</div></div>`;
      this.simpleWin('encyclopedie', 'Encyclopédie', render, actions, { width: 1120, cls: 'vy-fenetre--encyclopedie', onField });
    },
  });
})();
