(() => {
const esc = s => Util.esc(s);
const svg = p => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${p}</svg>`;
const ICO = {
  accueil: svg('<path d="M4 11l8-7 8 7v9H4z"/><path d="M10 20v-6h4v6"/>'), armes: svg('<path d="M14 4h6v6L9 21l-6-6z"/><path d="M6 14l4 4"/>'),
  tenues: svg('<path d="M8 4l4 3 4-3 4 4-3 3v9H7v-9L4 8z"/>'), lueurs: svg('<circle cx="12" cy="12" r="4"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3M5 5l2 2M17 17l2 2M5 19l2-2M17 7l2-2"/>'),
  blasons: svg('<path d="M12 3l8 3v6c0 5-4 8-8 9-4-1-8-4-8-9V6z"/>'), compagnons: svg('<circle cx="8" cy="9" r="2"/><circle cx="16" cy="9" r="2"/><circle cx="5" cy="14" r="1.6"/><circle cx="19" cy="14" r="1.6"/><path d="M8 19c0-3 2-4 4-4s4 1 4 4z"/>'),
  packs: svg('<path d="M3 8l9-5 9 5v8l-9 5-9-5z"/><path d="M3 8l9 5 9-5M12 13v8"/>'), mecene: svg('<path d="M12 3l2.5 5.5L20 9l-4 4 1 6-5-3-5 3 1-6-4-4 5.5-.5z"/>'),
  recompenses: svg('<path d="M4 10h16v10H4zM3 7h18v3H3zM12 7v13"/><path d="M12 7c-2-3-5-3-5-1s3 1 5 1c2 0 5 1 5-1s-3-2-5 1z"/>'), roue: svg('<circle cx="12" cy="12" r="8"/><path d="M12 4v16M4 12h16M6.3 6.3l11.4 11.4M17.7 6.3L6.3 17.7"/>'),
  fidelite: svg('<path d="M12 21s-7-4.5-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 11c0 5.5-7 10-7 10z"/>'), achats: svg('<path d="M6 3h12v18l-3-2-3 2-3-2-3 2z"/><path d="M9 8h6M9 12h6"/>'),
  panier: svg('<path d="M6 9h12l-1.5 11h-9z"/><path d="M9 9V7a3 3 0 0 1 6 0v2"/>'), chercher: svg('<circle cx="11" cy="11" r="6.5"/><path d="M16 16l4 4"/>'),
  bouclier: svg('<path d="M12 3l8 3v6c0 5-4 8-8 9-4-1-8-4-8-9V6z"/><path d="M9 12l2 2 4-4"/>'), corbeille: svg('<path d="M5 7h14M10 7V5h4v2M7 7l1 13h8l1-13"/>'),
  retour: svg('<path d="M15 6l-6 6 6 6"/>'), coche: svg('<path d="M5 12.5l4.2 4.2L19 7"/>'), cadenas: svg('<rect x="5" y="11" width="14" height="9" rx="2"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/>'),
};
const COMPTE = [['recompenses', 'Récompenses'], ['roue', 'La roue'], ['mecenat', 'Mécène'], ['fidelite', 'Fidélité'], ['achats', 'Mes achats']];
const RARETE = { commun: ['Commun', '#b7a697'], rare: ['Rare', '#52d2f4'], epique: ['Épique', '#ab7cf2'], legendaire: ['Légendaire', '#f3bc72'] };
const nb = n => String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
const sansAccents = s => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
const duree = ms => { const h = Math.floor(ms / 3600000), m = Math.floor(ms / 60000) % 60, j = Math.floor(h / 24); return j ? `${j} j ${h % 24} h` : `${String(h).padStart(2, '0')} h ${String(m).padStart(2, '0')}`; };
const dateCourte = t => { try { return new Date(t).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' }); } catch (e) { return ''; } };
const eclat = (g) => `<i class="vy-bt-eclat${g ? ' g' : ''}" aria-hidden="true"></i>`;
const imageDe = a => (a.image ? `assets/boutique/${a.image}` : null);

Object.assign(Hud.prototype, {
  openBoutique() {
    if (typeof Boutique !== 'object') return;
    const s = this.btEtat = this.btEtat || { page: 'accueil', choisi: null, panier: [], recherche: '', tri: 'prix', filtre: '', code: '', roue: { angle: 0, tourne: false, resultat: null } };
    const r = () => this.fen.render('boutique');
    const apres = () => { this.world.emit('update'); this.world.emit('save'); };
    const ajouter = id => {
      const a = Boutique.article(id);
      if (!a) return;
      if (a.bientot) { this.toast('Bientôt en vente.'); return; }
      if (Boutique.possede(a)) { this.toast('Déjà dans ta Garde-robe.'); return; }
      if (a.livraison.type === 'mecene') s.panier = s.panier.filter(x => !(Boutique.article(x).livraison || {}).type || Boutique.article(x).livraison.type !== 'mecene');
      if (!s.panier.includes(id)) s.panier.push(id);
      this.toast(`${a.nom} : dans le panier.`);
      s.bat = true; r();
    };
    const actions = {
      page: d => { s.page = d.page; s.choisi = null; s.recherche = ''; r(); },
      choisir: d => { s.choisi = d.id; r(); },
      fermerFiche: () => { s.choisi = null; r(); },
      ajouter: d => ajouter(d.id),
      retirer: d => { s.panier = s.panier.filter(x => x !== d.id); r(); },
      vider: () => { s.panier = []; r(); },
      tri: d => { s.tri = d.tri; r(); },
      filtre: d => { s.filtre = s.filtre === d.filtre ? '' : d.filtre; r(); },
      valider: () => {
        const res = Boutique.acheter(s.panier);
        if (!res.ok) { this.toast(res.raison); r(); return; }
        for (const e of res.livres) this.chat('gain', `Garde-robe : ${e.cosmetique.nom}.`);
        this.toast(`Achat fait : ${res.commandes} article${res.commandes > 1 ? 's' : ''}, ${nb(res.total)} Éclats.`);
        s.panier = []; s.page = 'achats'; apres(); r();
      },
      essayer: d => {
        const c = typeof Garderobe === 'object' && Garderobe.get(d.id);
        if (!c) return;
        this.gr = this.gr || { onglet: 'teinture', filtre: 'tous', source: '', choix: null, essai: {}, facing: 'se', tourne: true, feuille: null };
        Object.assign(this.gr, { onglet: c.type, filtre: 'tous', source: '', choix: c.id });
        if (Garderobe.TYPES_PORTES.includes(c.type)) this.gr.essai[c.type] = c.id;
        if (this.fen.isOpen('garderobe')) this.fen.render('garderobe'); else this.toggleWin('garderobe');
      },
      tourner: () => {
        if (s.roue.tourne) return;
        const res = Boutique.tourner();
        if (!res.ok) { this.toast(res.raison); return; }
        const n = (DATA.boutique.roue || []).length, pas = 360 / n;
        const ancien = s.roue.angle;
        s.roue.angle = Math.ceil(s.roue.angle / 360) * 360 + 5 * 360 - res.secteur * pas;
        s.roue.tourne = true; s.roue.resultat = null; r();
        const disque = document.querySelector('.vy-fenetre[data-id="boutique"] .vy-bt__roue .disque');
        if (disque) { disque.style.transition = 'none'; disque.style.transform = `rotate(${ancien}deg)`; disque.getBoundingClientRect(); disque.style.transition = ''; disque.style.transform = `rotate(${s.roue.angle}deg)`; }
        const fin = () => {
          s.roue.tourne = false; s.roue.resultat = res;
          if (res.lot === 'eclats') this.toast(`+${res.valeur} Éclats`);
          else if (res.lot === 'cadeau') this.toast(`Cadeau : ${res.article.nom} entre dans ta Garde-robe.`);
          else this.toast(`−${res.valeur} % sur ${res.article.nom}, jusqu'à lundi.`);
          apres(); if (this.fen.isOpen('boutique')) r();
        };
        const reduit = typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;
        if (reduit || this.btSansAnimation) fin(); else setTimeout(fin, 4700);
      },
      teinture: () => { const res = Boutique.reclamerTeinture(); this.toast(res.ok ? `Teinture du mois : ${res.article.nom}.` : res.raison); apres(); r(); },
      code: () => {
        const el = document.getElementById('bt-code'), res = Boutique.utiliserCode(el ? el.value : s.code);
        this.toast(res.ok ? `${res.texte || 'Code accepté'} : +${res.eclats} Éclats.` : res.raison);
        if (res.ok) { s.code = ''; apres(); }
        r();
      },
      veille: () => this.toggleWin('veille'),
      evenement: () => { if (typeof Evenements === 'object' && Evenements.ouvrir) Evenements.ouvrir(); },
    };
    const onField = el => {
      if (el.id === 'bt-recherche') { s.recherche = el.value; if (s.page === 'accueil' && el.value.trim().length >= 2) s.page = 'recherche'; r(); }
      if (el.id === 'bt-code') s.code = el.value;
    };
    this.simpleWin('boutique', 'Boutique des Cimes', () => this.renderBoutique(), actions, { width: 1180, cls: 'vy-fenetre--boutique', onField });
  },

  renderBoutique() {
    const s = this.btEtat, B = DATA.boutique, Bq = Boutique;
    const tous = Bq.articles(), t = Date.now();
    const page = s.page;
    const compte = id => tous.filter(a => a.rayon === id).length;
    const pts = { recompenses: typeof Veille === 'object' && Veille.badge && Veille.badge(this.world.ch) ? 'or' : '', roue: Bq.toursRestants() ? 'cristal' : '', mecenat: Bq.teintureDisponible() ? 'or' : '' };
    const d = Bq.devis(s.panier);
    const rail = `<nav class="vy-bt__rail" data-defile="bt-rail">
      <div class="vy-bt__marque"><i></i><div><b>BOUTIQUE</b><small>DES CIMES</small></div></div>
      <button type="button" class="vy-bt__solde" data-act="page" data-page="eclats"><span class="vy-bt__lbl">Mon solde</span><span class="m">${eclat(true)}<b>${nb(Bq.solde())}</b><small>Éclats</small></span><span class="lien">Gagner des Éclats ›</span></button>
      <button type="button" class="vy-bt__ent${page === 'accueil' ? ' on' : ''}" data-act="page" data-page="accueil">${ICO.accueil}<span>Accueil</span></button>
      ${B.rayons.map(([id, nom]) => `<button type="button" class="vy-bt__ent${page === id ? ' on' : ''}" data-act="page" data-page="${id}">${ICO[id] || ICO.packs}<span>${esc(nom)}</span><small>${compte(id)}</small></button>`).join('')}
      <hr><span class="vy-bt__lbl t">Mon compte</span>
      ${COMPTE.map(([id, nom]) => `<button type="button" class="vy-bt__ent${page === id ? ' on' : ''}" data-act="page" data-page="${id}">${ICO[id === 'mecenat' ? 'mecene' : id]}<span>${nom}</span>${pts[id] && page !== id ? `<i class="pt ${pts[id]}"></i>` : ''}</button>`).join('')}
      <button type="button" class="vy-bt__panier${s.bat ? ' bat' : ''}${page === 'panier' ? ' on' : ''}" data-act="page" data-page="panier"><span class="ic">${ICO.panier}${s.panier.length ? `<em>${s.panier.length}</em>` : ''}</span><span><b>Mon panier</b><small>${s.panier.length ? `${s.panier.length} article${s.panier.length > 1 ? 's' : ''} · ${eclat()}${nb(d.total)}` : 'Vide'}</small></span></button>
    </nav>`;
    s.bat = false;
    const rayon = B.rayons.find(x => x[0] === page);
    let titre, corps, sous = '';
    if (page === 'accueil') { titre = 'Accueil'; corps = this.btAccueil(t); }
    else if (rayon || page === 'recherche') {
      titre = rayon ? rayon[1] : 'Recherche';
      const f = sansAccents(s.recherche.trim());
      let l = rayon ? tous.filter(a => a.rayon === page) : tous;
      if (f) l = l.filter(a => sansAccents(`${a.nom} ${a.desc} ${a.type} ${a.classe || ''}`).includes(f));
      if (s.filtre === 'neuf') l = l.filter(a => a.nouveau); if (s.filtre === 'promo') l = l.filter(a => Bq.prix(a).remise);
      if (s.filtre === 'budget') l = l.filter(a => Bq.prix(a).prix <= Bq.solde()); if (s.filtre === 'manque') l = l.filter(a => !Bq.possede(a));
      l = l.slice().sort(s.tri === 'prix-' ? (x, y) => Bq.prix(y).prix - Bq.prix(x).prix : s.tri === 'nom' ? (x, y) => x.nom.localeCompare(y.nom, 'fr') : (x, y) => Bq.prix(x).prix - Bq.prix(y).prix);
      sous = rayon ? `${l.length} ${l.length > 1 ? rayon[3] : rayon[2]}` : `${l.length} résultat${l.length > 1 ? 's' : ''}`;
      const filtres = `<div class="vy-bt__filtres">${[['prix', 'Prix croissant'], ['prix-', 'Prix décroissant'], ['nom', 'Nom']].map(([k, n]) => `<button type="button" class="vy-bt__puce${s.tri === k ? ' on' : ''}" data-act="tri" data-tri="${k}">${n}</button>`).join('')}<span class="sep"></span>${[['neuf', 'Nouveautés'], ['promo', 'En promo'], ['budget', 'Dans mon budget'], ['manque', 'Pas encore possédés']].map(([k, n]) => `<button type="button" class="vy-bt__puce${s.filtre === k ? ' on' : ''}" data-act="filtre" data-filtre="${k}">${n}</button>`).join('')}</div>`;
      corps = filtres + (l.length ? `<div class="vy-bt__grille">${l.map(a => this.btTuile(a)).join('')}</div>` : '<p class="vy-bt__vide">Aucun article ne correspond à ces filtres.</p>');
    }
    else if (page === 'panier') { titre = 'Mon panier'; corps = this.btPanier(d); }
    else if (page === 'roue') { titre = 'La roue de la semaine'; corps = this.btRoue(t); }
    else if (page === 'mecenat') { titre = 'Mécène'; corps = this.btMecene(t); }
    else if (page === 'fidelite') { titre = 'Fidélité'; corps = this.btFidelite(); }
    else if (page === 'achats') { titre = 'Mes achats'; corps = this.btAchats(); }
    else if (page === 'recompenses') { titre = 'Récompenses'; corps = this.btRecompenses(); }
    else { titre = 'Gagner des Éclats'; corps = this.btEclats(); }
    const choisi = s.choisi && Bq.article(s.choisi);
    const tete = `<header class="vy-bt__tete"><h3>${esc(titre)}${sous ? `<small>${esc(sous)}</small>` : ''}</h3>
      <span class="vy-bt__chrono">La boutique du jour change dans <b>${duree(Bq.avantChangement(t))}</b></span>
      <label class="vy-recherche vy-bt__recherche">${ICO.chercher}<input id="bt-recherche" type="search" placeholder="Chercher un article…" value="${esc(s.recherche)}" aria-label="Chercher un article"></label></header>`;
    return `<div class="vy-bt${choisi ? ' avec-fiche' : ''}">${rail}<section class="vy-bt__contenu">${tete}<div class="vy-bt__page" data-defile="bt-page">${corps}</div></section>${choisi ? `<aside class="vy-bt__fiche" data-defile="bt-fiche">${this.btFiche(choisi)}</aside>` : ''}</div>`;
  },

  btTuile(a, o) {
    o = o || {};
    const Bq = Boutique, p = Bq.prix(a), possede = Bq.possede(a), [, rc] = RARETE[a.rarete] || RARETE.commun;
    const c = a.livraison && a.livraison.type === 'cosmetique' && typeof Garderobe === 'object' ? Garderobe.get(a.livraison.id) : null;
    const visuel = imageDe(a) ? `<img src="${imageDe(a)}" alt="" loading="lazy">` : c && Hud.pictoCosmetique ? Hud.pictoCosmetique(c) : `<span class="vy-bt__picto">${ICO[a.rayon] || ICO.packs}</span>`;
    const eti = possede ? '<span class="eti possede">POSSÉDÉ</span>' : a.bientot ? '<span class="eti bientot">BIENTÔT</span>' : p.remise ? `<span class="eti remise">−${p.remise} %</span>` : a.nouveau ? '<span class="eti neuf">NOUVEAU</span>' : '';
    const prixTxt = possede ? '<small class="ok">Dans ta Garde-robe</small>' : `${p.ancien ? `<s>${nb(p.ancien)}</s>` : ''}${eclat()}<b>${nb(p.prix)}</b>`;
    return `<div class="vy-bt__tuile${p.remise && !possede ? ' promo' : ''}${this.btEtat.choisi === a.id ? ' choisie' : ''}" style="--r:${rc}">
      <button type="button" class="vy-bt__tuile-corps" data-act="choisir" data-id="${a.id}" aria-label="${esc(a.nom)} : la fiche"><span class="im">${visuel}<i class="rar"></i>${eti}</span>
        <span class="bas"><b>${esc(a.nom)}</b><small>${esc(a.classe ? `${a.type} · ${a.classe}` : `${a.type} · ${(RARETE[a.rarete] || [''])[0]}`)}${o.origine ? ` · ${esc(o.origine)}` : ''}</small><span class="prix">${prixTxt}</span></span></button>
      ${possede || a.bientot ? '' : `<button type="button" class="plus" data-act="ajouter" data-id="${a.id}" aria-label="Ajouter ${esc(a.nom)} au panier" title="Ajouter au panier">+</button>`}</div>`;
  },

  btAccueil(t) {
    const Bq = Boutique, tous = Bq.articles();
    const ev = typeof Evenements === 'object' && Evenements.actif ? Evenements.actif() : null;
    const armes = ['thalor', 'nerith', 'sarkan'].map((c, i) => `<img src="assets/boutique/arme-${c}.webp" alt="" class="a${i}">`).join('');
    const heros = `<div class="vy-bt__heros"><div class="armes">${armes}</div><div class="txt"><span class="vy-bt__lbl cristal">Bientôt en boutique</span><p class="vy-bt__h4">Les Armes taillées</p>
      <p>Neuf apparences d'armes, une par classe : la pierre, l'or et le cristal du V, une fente de lumière dans chaque lame.</p>
      <button type="button" class="vy-bouton vy-bouton--primaire" data-act="page" data-page="armes">Découvrir</button></div></div>`;
    const cote = ev ? `<div class="vy-bt__ev"><span class="cours"><i></i>ÉVÉNEMENT EN COURS</span><span class="k">${esc(ev.kick || '')}</span><p class="vy-bt__h4">${esc(ev.titre)}</p>
        ${ev.finDans ? `<small>Fin dans ${esc(ev.finDans)}</small>` : ''}<button type="button" class="vy-bouton vy-bouton--primaire" data-act="evenement">Ouvrir l'événement</button></div>`
      : `<div class="vy-bt__ev mecene"><span class="vy-bt__lbl">Mécène</span><p class="vy-bt__h4">Veilleur, Gardien, Tisseur</p><p>Un tour de roue de plus, deux looks de plus, une teinture chaque mois. Rien que du confort et de l'apparence.</p><button type="button" class="vy-bouton vy-bouton--primaire" data-act="page" data-page="mecenat">Voir les paliers</button></div>`;
    const jour = Bq.boutiqueDuJour(t), perso = Bq.offresPerso(t);
    const nouveaux = tous.filter(a => a.nouveau && !a.bientot).slice(0, 5);
    return `<div class="vy-bt__rang1">${heros}${cote}</div>
      <div class="vy-bt__sec"><p class="vy-bt__h4">Boutique du jour</p><span class="ligne"></span><span class="vy-bt__chrono">change dans <b>${duree(Boutique.avantChangement(t))}</b></span></div>
      <div class="vy-bt__jour"><div class="vy-bt__perso"><span class="vy-bt__lbl cristal">Offres personnelles</span><b>Réservé à ton compte</b>${perso.map(x => this.btTuile(x.article)).join('')}</div>
        <div class="vy-bt__grille six">${jour.map(x => this.btTuile(x.article)).join('')}</div></div>
      ${nouveaux.length ? `<div class="vy-bt__sec"><p class="vy-bt__h4">Nouveautés</p><span class="ligne"></span></div><div class="vy-bt__grille cinq">${nouveaux.map(a => this.btTuile(a)).join('')}</div>` : ''}`;
  },

  btFiche(a) {
    const Bq = Boutique, p = Bq.prix(a), possede = Bq.possede(a), [rn, rc] = RARETE[a.rarete] || RARETE.commun;
    const ids = Bq.cosmetiquesDe(a), cos = typeof Garderobe === 'object' ? ids.map(Garderobe.get).filter(Boolean) : [];
    const visuel = imageDe(a) ? `<img src="${imageDe(a)}" alt="">` : cos[0] && Hud.pictoCosmetique ? Hud.pictoCosmetique(cos[0]) : `<span class="vy-bt__picto">${ICO[a.rayon] || ICO.packs}</span>`;
    const essais = cos.filter(c => Garderobe.TYPES_PORTES.includes(c.type));
    const geste = possede ? '<span class="vy-bt__possede">' + ICO.coche + 'Dans ta Garde-robe</span>'
      : a.bientot ? `<span class="vy-bt__bientot">${ICO.cadenas}Bientôt en vente</span>`
        : `<button type="button" class="vy-bouton vy-bouton--primaire" data-act="ajouter" data-id="${a.id}">Ajouter au panier</button>`;
    const contenu = a.livraison && a.livraison.type === 'pack' ? `<ul class="vy-bt__contenu-pack">${cos.map(c => `<li>${Hud.pictoCosmetique ? Hud.pictoCosmetique(c) : ''}<span>${esc(c.nom)}</span>${Garderobe.possede(c.id) ? '<small>possédé</small>' : ''}</li>`).join('')}</ul>` : '';
    return `<button type="button" class="vy-q-retour" data-act="fermerFiche">${ICO.retour}Retour</button>
      <div class="vy-bt__cabine" style="--r:${rc}">${visuel}<i class="socle"></i></div>
      <p class="vy-bt__h4">${esc(a.nom)}</p>
      <div class="vy-bt__meta"><span style="color:${rc};border-color:${rc}">${rn}</span><span>${esc(a.type)}</span>${a.classe ? `<span>${esc(a.classe)}</span>` : ''}${a.nouveau ? '<span class="neuf">Nouveau</span>' : ''}</div>
      <p class="vy-bt__desc">${esc(a.desc)}</p>${contenu}
      ${a.livraison && a.livraison.type === 'mecene' ? '' : `<span class="vy-bt__zero">${ICO.bouclier}Apparence seule : rien ne change en combat</span>`}
      ${essais.length ? `<div class="vy-bt__essais">${essais.map(c => `<button type="button" class="vy-bouton vy-bouton--petit" data-act="essayer" data-id="${c.id}">Essayer${essais.length > 1 ? ' : ' + esc(c.nom) : ' dans la Garde-robe'}</button>`).join('')}</div>` : ''}
      <div class="vy-bt__achat">${possede || a.bientot ? '' : `<span class="prix">${p.ancien ? `<s>${nb(p.ancien)}</s>` : ''}${eclat(true)}<b>${nb(p.prix)}</b></span>`}${geste}</div>
      ${p.remise && !possede ? `<small class="vy-bt__lim">−${p.remise} % : ${esc(p.origine)}</small>` : ''}
      <small class="vy-bt__lim">${a.livraison && a.livraison.type === 'mecene' ? 'Trente jours ; racheter le même palier prolonge.' : 'Une par compte, pour tous tes personnages.'}</small>`;
  },

  btPanier(d) {
    const s = this.btEtat, solde = Boutique.solde();
    if (!s.panier.length) return `<div class="vy-bt__vide grand">${ICO.panier}<b>Ton panier est vide</b><button type="button" class="vy-bouton vy-bouton--primaire" data-act="page" data-page="accueil">Découvrir la boutique</button></div>`;
    const lignes = d.lignes.map(l => `<div class="vy-bt__ligne${l.refus ? ' refus' : ''}"><span class="v">${this.btVignette(l.article)}</span><span class="t"><b>${esc(l.article ? l.article.nom : '?')}</b><small>${l.refus ? esc(l.refus) : l.remise ? `−${l.remise} % · ${esc(l.origine)}` : esc(l.article.type)}</small></span>
      <span class="prix">${l.ancien ? `<s>${nb(l.ancien)}</s>` : ''}${eclat()}<b>${nb(l.prix)}</b></span><button type="button" class="vy-bouton vy-bouton--petit vy-bouton--fantome" data-act="retirer" data-id="${l.article ? l.article.id : ''}" aria-label="Retirer">${ICO.corbeille}</button></div>`).join('');
    const manque = d.total - solde;
    return `<div class="vy-bt__panier-page"><div class="lignes">${lignes}<button type="button" class="vy-bouton vy-bouton--petit vy-bouton--fantome" data-act="vider">Vider le panier</button></div>
      <div class="vy-bt__recap"><div><span>Articles</span><b>${eclat()}${nb(d.brut)}</b></div>${d.remiseCompte ? `<div class="remise"><span>Fidélité −${d.remisePct} %</span><b>−${nb(d.remiseCompte)}</b></div>` : ''}
        <div class="total"><span>Total</span><b>${eclat(true)}${nb(d.total)}</b></div><div><span>Ton solde</span><b>${nb(solde)}</b></div>
        ${manque > 0 ? `<p class="manque">Il te manque ${nb(manque)} Éclats. <button type="button" class="lien" data-act="page" data-page="eclats">Gagner des Éclats</button></p>` : ''}
        <button type="button" class="vy-bouton vy-bouton--primaire" data-act="valider" ${manque > 0 || d.lignes.some(l => l.refus) ? 'disabled' : ''}>Valider l'achat</button></div></div>`;
  },
  btVignette(a) {
    if (!a) return '';
    const c = a.livraison && a.livraison.type === 'cosmetique' && typeof Garderobe === 'object' ? Garderobe.get(a.livraison.id) : null;
    return imageDe(a) ? `<img src="${imageDe(a)}" alt="">` : c && Hud.pictoCosmetique ? Hud.pictoCosmetique(c) : ICO[a.rayon] || ICO.packs;
  },

  btRoue(t) {
    const Bq = Boutique, S = DATA.boutique.roue, n = S.length, R = 150, c = 170, s = this.btEtat.roue;
    const coul = x => x.jackpot ? ['#f7f0de', '#f3bc72', '#a67349'] : x.lot === 'cadeau' ? ['#ab7cf2', '#9764d6', '#3e207f'] : x.lot === 'eclats' ? ['#acdded', '#209fec', '#113f8a'] : ['#22355d', '#19233c', '#0f1728'];
    const lib = x => x.jackpot ? `Jackpot −${x.valeur} %` : x.lot === 'cadeau' ? 'Cadeau' : x.lot === 'eclats' ? `${x.valeur} Éclats` : `−${x.valeur} %`;
    let defs = '', parts = '';
    S.forEach((x, i) => {
      const a0 = (i / n) * 2 * Math.PI - Math.PI / 2 - Math.PI / n, a1 = a0 + 2 * Math.PI / n, [c0, c1, c2] = coul(x), p = (a, r) => `${(c + r * Math.cos(a)).toFixed(1)} ${(c + r * Math.sin(a)).toFixed(1)}`;
      defs += `<radialGradient id="bt-s${i}" cx="${c}" cy="${c}" r="${R}" gradientUnits="userSpaceOnUse"><stop offset=".15" stop-color="${c2}"/><stop offset=".7" stop-color="${c1}"/><stop offset="1" stop-color="${c0}"/></radialGradient>`;
      parts += `<path d="M${c} ${c}L${p(a0, R)}A${R} ${R} 0 0 1 ${p(a1, R)}Z" fill="url(#bt-s${i})" stroke="#835737" stroke-width="1.5"/>`;
      const am = (a0 + a1) / 2, d0 = ((am * 180 / Math.PI) % 360 + 360) % 360, deg = d0 > 90 && d0 < 270 ? d0 + 180 : d0;
      parts += `<text transform="translate(${p(am, R * 0.62)}) rotate(${deg.toFixed(1)})" text-anchor="middle" dominant-baseline="middle" font-family="Cinzel,serif" font-weight="700" font-size="${lib(x).length > 9 ? 9.5 : 12}" fill="${x.jackpot ? '#2a1d12' : '#f7f0de'}">${lib(x).toUpperCase()}</text>`;
    });
    const ampoules = Array.from({ length: 24 }, (_, i) => { const a = i / 24 * 2 * Math.PI; return `<circle cx="${(c + (R + 10) * Math.cos(a)).toFixed(1)}" cy="${(c + (R + 10) * Math.sin(a)).toFixed(1)}" r="2.8" fill="${i % 2 ? '#f7f0de' : '#52d2f4'}"/>`; }).join('');
    const jante = `<linearGradient id="bt-jante" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#f7f0de"/><stop offset=".3" stop-color="#f3bc72"/><stop offset=".55" stop-color="#a67349"/><stop offset=".8" stop-color="#eecda6"/><stop offset="1" stop-color="#835737"/></linearGradient><linearGradient id="bt-cr" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#acdded"/><stop offset=".5" stop-color="#209fec"/><stop offset="1" stop-color="#113f8a"/></linearGradient>`;
    const roue = `<div class="vy-bt__roue${s.tourne ? ' tourne' : ''}"><svg viewBox="0 0 340 340" aria-hidden="true"><defs>${defs}${jante}</defs><circle cx="${c}" cy="${c}" r="${R + 18}" fill="url(#bt-jante)"/><circle cx="${c}" cy="${c}" r="${R + 4}" fill="#0b1220"/>${ampoules}
      <g class="disque" style="transform:rotate(${s.angle}deg)">${parts}</g>
      <circle cx="${c}" cy="${c}" r="30" fill="url(#bt-jante)" stroke="#835737" stroke-width="1.5"/><circle cx="${c}" cy="${c}" r="22" fill="#0f1728"/><path d="M${c - 11} ${c - 9}h5l6 12 6-12h5l-11 21z" fill="url(#bt-jante)"/><path d="M${c} ${c - 1}l4 5-4 5-4-5z" fill="url(#bt-cr)"/>
      <path d="M${c} ${c - R - 2}l-13-23h26z" fill="url(#bt-jante)" stroke="#835737" stroke-width="1.5"/><path d="M${c} ${c - R - 10}l-5-8h10z" fill="url(#bt-cr)"/></svg></div>`;
    const lot = Bq.lotRoue(t), restants = Bq.toursRestants(t), a = lot && Bq.article(lot.article), res = s.resultat;
    const panneau = a ? `<span class="vy-bt__lbl cristal">Ton lot de la semaine</span><p class="vy-bt__h4">−${lot.remise} % sur un article</p><div class="vy-bt__lot">${this.btTuile(a)}<p>La roue a désigné <b>${esc(a.nom)}</b>. La remise est déjà dans son prix, jusqu'à lundi.</p></div>`
      : res && res.lot === 'eclats' ? `<span class="vy-bt__lbl cristal">Ton lot</span><p class="vy-bt__h4">+${res.valeur} Éclats</p><p>Ils sont dans ta bourse.</p>`
        : res && res.lot === 'cadeau' ? `<span class="vy-bt__lbl cristal">Ton lot</span><p class="vy-bt__h4">Un article offert</p><div class="vy-bt__lot">${this.btTuile(res.article)}<p><b>${esc(res.article.nom)}</b> est dans ta Garde-robe.</p></div>`
          : `<span class="vy-bt__lbl cristal">Ton lot de la semaine</span><p class="vy-bt__h4">${restants ? 'La roue t\'attend' : 'Rien cette semaine'}</p><p>Une remise sur un article, des Éclats, ou un article offert.</p>`;
    return `<div class="vy-bt__roue-page">${roue}<div class="cote"><div class="vy-bt__lotcadre">${panneau}</div>
      <div class="vy-bt__chiffres"><div><small>Prochaine semaine dans</small><b>${duree(Bq.avantSemaine(t))}</b></div><div><small>Tours restants</small><b>${restants} / ${Bq.toursMax(t)}</b></div><div><small>Mécène</small><b>${Bq.avantage('roue', t) ? '+1 tour' : '-'}</b></div></div>
      ${restants ? `<button type="button" class="vy-bouton vy-bouton--primaire grand" data-act="tourner" ${s.tourne ? 'disabled' : ''}>${s.tourne ? 'La roue tourne…' : 'Tourner la roue'}</button>` : '<div class="vy-bt__fait">Tour déjà utilisé cette semaine</div>'}
      <div class="vy-bt__etapes"><div><b>Un tour</b>Chaque semaine, offert à tous ; un de plus pour les Mécènes.</div><div><b>Un lot</b>Une remise, des Éclats, ou un article offert.</div><div><b>Jusqu'à lundi</b>La remise vaut jusqu'au lundi suivant, 6 h.</div></div></div></div>`;
  },

  btMecene(t) {
    const Bq = Boutique, B = DATA.boutique, m = Bq.mecene(t), et = Bq.etat().mecene;
    const cartes = B.mecene.map(p => {
      const a = Bq.articles().find(x => x.livraison && x.livraison.type === 'mecene' && x.livraison.palier === p.palier), actif = m && m.palier === p.palier;
      return `<div class="vy-bt__palier${actif ? ' actif' : ''}"><span class="etoiles">${'★'.repeat(p.palier)}</span><p class="vy-bt__h4">${esc(p.nom)}</p><ul>${p.avantages.map(k => `<li>${ICO.coche}<span><b>${esc(B.avantages[k][0])}</b><small>${esc(B.avantages[k][1])}</small></span></li>`).join('')}</ul>
        <div class="vy-bt__achat"><span class="prix">${eclat(true)}<b>${nb(a.prix)}</b><small>/ 30 jours</small></span><button type="button" class="vy-bouton ${actif ? '' : 'vy-bouton--primaire'}" data-act="ajouter" data-id="${a.id}">${actif ? 'Prolonger' : 'Choisir'}</button></div></div>`;
    }).join('');
    const teinture = m && Bq.avantage('teinture', t) ? (() => { const a = Bq.teintureDuMois(t); return `<div class="vy-bt__teinture"><span>${a ? this.btVignette(a) : ''}</span><div><b>La teinture du mois : ${esc(a ? a.nom : '-')}</b><small>Offerte au Mécène Tisseur, une fois par mois.</small></div>${Bq.teintureDisponible(t) ? '<button type="button" class="vy-bouton vy-bouton--primaire" data-act="teinture">Récupérer</button>' : '<span class="vy-bt__possede">' + ICO.coche + 'Reçue ce mois-ci</span>'}</div>`; })() : '';
    const hist = et.historique.slice().reverse().map(h => `<li><b>${esc((B.mecene.find(p => p.palier === h.palier) || {}).nom || '')}</b><span>${dateCourte(h.debut)} → ${dateCourte(h.fin)}</span></li>`).join('');
    return `<div class="vy-bt__statut">${m ? `${ICO.mecene}<div><b>Mécène ${esc(m.def.nom)}</b><small>actif jusqu'au ${dateCourte(m.fin)}</small></div>` : `${ICO.mecene}<div><b>Pas de Mécène en cours</b><small>Trois paliers, rien que du confort et de l'apparence. Les avantages d'un palier passent aux suivants.</small></div>`}</div>
      ${teinture}<div class="vy-bt__paliers">${cartes}</div>
      <p class="vy-bt__note">Les looks en plus du Gardien restent tant que le Mécène dure ; à sa fin, la Garde-robe en garde cinq.</p>
      ${hist ? `<div class="vy-bt__sec"><p class="vy-bt__h4">Mes Mécènes</p><span class="ligne"></span></div><ul class="vy-bt__hist">${hist}</ul>` : ''}`;
  },

  btFidelite() {
    const Bq = Boutique, B = DATA.boutique, recu = Bq.recu(), et = Bq.etat().fidelite;
    const paliers = B.fidelite, suivant = paliers.find(p => recu < p.seuil), avant = [0, ...paliers.filter(p => recu >= p.seuil).map(p => p.seuil)].pop();
    const pct = suivant ? Math.round(100 * (recu - avant) / (suivant.seuil - avant)) : 100;
    const cartes = paliers.map((p, i) => {
      const fait = et.atteints.includes(p.seuil), a = p.article && Bq.article(p.article);
      return `<div class="vy-bt__fid${fait ? ' fait' : p === suivant ? ' prochain' : ''}"><span class="n">${fait ? ICO.coche : i + 1}</span><b>${esc(p.nom)}</b><small>${nb(p.seuil)} Éclats reçus</small>
        <span class="don">${a ? `${this.btVignette(a)}<span>${esc(a.nom)} offert</span>` : `<span class="rem">−${p.remise} %</span><span>sur le prochain panier</span>`}</span><em>${fait ? 'Obtenu' : p === suivant ? 'Prochain' : 'Verrouillé'}</em></div>`;
    }).join('');
    return `<div class="vy-bt__progression"><span class="vy-bt__lbl">Ta progression</span><b>${nb(recu)} Éclats reçus</b>${suivant ? `<small>encore ${nb(suivant.seuil - recu)} pour « ${esc(suivant.nom)} »</small>` : '<small>Tous les paliers sont atteints.</small>'}
      <i class="vy-bt__jauge"><i style="width:${pct}%"></i></i>${et.remise ? `<span class="vy-bt__remise">−${et.remise} % t'attend sur ton prochain panier</span>` : ''}</div>
      <div class="vy-bt__fids">${cartes}</div><p class="vy-bt__note">Tout ce que reçoit ta bourse compte : succès, roue, codes, et plus tard les Éclats achetés et les événements.</p>`;
  },

  btAchats() {
    const l = Boutique.commandes();
    if (!l.length) return `<div class="vy-bt__vide grand">${ICO.achats}<b>Aucun achat pour l'instant</b></div>`;
    const ETAT = { livre: 'Livré', attente: 'En attente', rembourse: 'Remboursé' };
    return `<div class="vy-bt__achats">${l.map(c => { const a = Boutique.article(c.id); return `<div class="vy-bt__ligne"><span class="v">${this.btVignette(a)}</span><span class="t"><b>${esc(a ? a.nom : c.id)}</b><small>${dateCourte(c.date)}${c.origine ? ' · ' + esc(c.origine) : ''}</small></span><span class="prix">${c.prix ? `${eclat()}<b>${nb(c.prix)}</b>` : '<small>offert</small>'}</span><span class="etat ${c.etat}">${ETAT[c.etat]}</span></div>`; }).join('')}</div>`;
  },

  btRecompenses() {
    const ch = this.world.ch, V = typeof Veille === 'object' ? Veille : null, a_faire = V && V.badge && V.badge(ch);
    return `<div class="vy-bt__statut">${ICO.recompenses}<div><b>La Veille du jour</b><small>Le cadeau de chaque jour, c'est elle : un dépôt par jour, un cycle de 28 jours, les sept Dragons.</small></div><button type="button" class="vy-bouton vy-bouton--primaire" data-act="veille">${a_faire ? 'Faire la Veille du jour' : 'Ouvrir la Veille'}</button></div>
      <div class="vy-bt__statut">${ICO.mecene}<div><b>Les succès</b><small>Les métas et les paliers de score donnent des Éclats (50 à 500).</small></div><button type="button" class="vy-bouton" data-act="page" data-page="eclats">Gagner des Éclats</button></div>`;
  },

  btEclats() {
    const B = DATA.boutique;
    const packs = B.packs.map(([eur, n, bonus], i) => `<div class="vy-bt__pack"><span class="pile">${Array.from({ length: Math.min(5, i + 1) }, () => eclat(true)).join('')}</span><b>${nb(n)}</b>${bonus ? `<em>+${nb(bonus)} offerts</em>` : '<em class="vide"></em>'}<span class="eur">${eur} €</span><button type="button" class="vy-bouton vy-bouton--petit" disabled>Bientôt</button></div>`).join('');
    return `<div class="vy-bt__solde-grand">${eclat(true)}<div><b>${nb(Boutique.solde())} Éclats</b><small>La monnaie de la Boutique des Cimes, sur ton compte : partagée par tous tes personnages.</small></div></div>
      <div class="vy-bt__sec"><p class="vy-bt__h4">En jouant</p><span class="ligne"></span></div>
      <div class="vy-bt__sources"><div><b>Succès</b>Métas et paliers de score : 10 à 500 Éclats.</div><div><b>La roue</b>Chaque semaine, peut-être 50 ou 100 Éclats.</div><div><b>Codes cadeaux</b>Donnés par l'équipe du jeu.</div><div><b>Événements</b>Bientôt.</div></div>
      <div class="vy-bt__code"><label class="vy-recherche"><input id="bt-code" type="text" maxlength="32" placeholder="Code cadeau" value="${esc(this.btEtat.code)}" aria-label="Code cadeau"></label><button type="button" class="vy-bouton vy-bouton--primaire" data-act="code">Utiliser le code</button></div>
      <div class="vy-bt__sec"><p class="vy-bt__h4">Acheter des Éclats</p><span class="ligne"></span><span class="vy-bt__chrono">1 € = 100 Éclats</span></div>
      <div class="vy-bt__packs">${packs}</div>
      <p class="vy-bt__note">L'achat en euros arrivera avec le serveur du jeu, par un paiement sécurisé. On n'achète que des apparences : rien ne change en combat.</p>`;
  },
});
})();
