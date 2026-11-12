(() => {
const esc = s => Util.esc(s);
const svg = p => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${p}</svg>`;
const ICO = {
  presque: svg('<circle cx="12" cy="12" r="8"/><path d="M12 4a8 8 0 0 1 7.6 10.5"/>'),
  reclamer: svg('<path d="M12 3l7 9-7 9-7-9z"/><path d="M12 8v5"/>'),
  suivi: svg('<path d="M7 3h10v18l-5-4-5 4z"/>'),
  tours: svg('<circle cx="12" cy="12" r="8"/><path d="M12 4v3M12 17v3M4 12h3M17 12h3"/><circle cx="12" cy="12" r="2.5"/>'),
  proche: svg('<path d="M12 21s-6-5.6-6-10.5A6 6 0 0 1 18 10.5C18 15.4 12 21 12 21z"/><circle cx="12" cy="10.5" r="2.2"/>'),
  recherche: svg('<circle cx="11" cy="11" r="6.5"/><path d="M16 16l4 4"/>'),
  retour: svg('<path d="M15 6l-6 6 6 6"/>'),
  coche: svg('<path d="M5 12.5l4.2 4.2L19 7"/>'),
  'Général': svg('<path d="M12 3l8 5v8l-8 5-8-5V8z"/>'),
  Exploration: svg('<circle cx="12" cy="12" r="8"/><path d="M15 9l-2 4-4 2 2-4z"/>'),
  Bestiaire: svg('<path d="M6 10c0-3 3-6 6-6s6 3 6 6v3l2 4H4l2-4z"/><path d="M10 13h.01M14 13h.01"/>'),
  Donjons: svg('<path d="M5 21V9a7 7 0 0 1 14 0v12"/><path d="M3 21h18M12 13v8"/>'),
  'Quêtes': svg('<path d="M6 3h10l2 3v15H6z"/><path d="M9 9h6M9 13h6M9 17h3"/>'),
  'Défis et Nœuds': svg('<path d="M5 12c0-3 3-5 7-5s7 2 7 5-3 5-7 5"/><path d="M12 17l-3 3M12 17l-3-3"/>'),
  Artisanat: svg('<path d="M4 20l8-8M14 4l6 6-4 4-6-6z"/>'),
  Panoplies: svg('<path d="M8 4l4 3 4-3 4 4-3 3v9H7v-9L4 8z"/>'),
  Compagnons: svg('<circle cx="8" cy="9" r="2"/><circle cx="16" cy="9" r="2"/><circle cx="5" cy="14" r="1.6"/><circle cx="19" cy="14" r="1.6"/><path d="M8 19c0-3 2-4 4-4s4 1 4 4z"/>'),
};
const SUIVIS_MAX = 3;
const sansAccents = s => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
const nb = n => String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
const ETIQ = { dungeon: 'Victoire', feat: 'Clé', dungeonTurns: 'Vitesse', bossDefi: 'Défi', noeudsBoss: 'Noué', meta: 'Méta', zone: 'Zone', famille: 'Famille', argentes: 'D\'argent', carnet: 'Carnet', kills: 'Chasse', boss: 'Boss', set: 'Panoplie' };

Object.assign(Hud.prototype, {
  succesSuivis() {
    const ch = this.world.ch;
    let l = [];
    try { l = JSON.parse(localStorage.getItem('veylan.succes.suivis.' + (ch.uid || ch.name)) || '[]'); } catch (e) { l = []; }
    return (Array.isArray(l) ? l : []).filter(id => Achievements.get(id) && !ch.achievements.includes(id)).slice(0, SUIVIS_MAX);
  },
  suivreSucces(id) {
    const ch = this.world.ch, l = this.succesSuivis();
    const deja = l.includes(id);
    if (!deja && l.length >= SUIVIS_MAX) return null;
    const n = deja ? l.filter(x => x !== id) : l.concat(id);
    try { localStorage.setItem('veylan.succes.suivis.' + (ch.uid || ch.name), JSON.stringify(n)); } catch (e) {   }
    if (this.jeu && this.jeu.rafraichirCarte) this.jeu.rafraichirCarte();
    if (this.refresh) this.refresh();
    return !deja;
  },

  ouvrirSucces(id) {
    const a = Achievements.get(id);
    const s = this.succesEtat = this.succesEtat || { vue: 'liste', cat: null, sous: null, choisi: null, filtre: '' };
    if (a) { s.cat = Achievements.category(a); s.sous = Achievements.sousCategorie(a); s.choisi = id; s.vue = 'fiche'; s.filtre = ''; }
    if (this.fen.isOpen('succes')) this.fen.render('succes'); else this.toggleWin('succes');
  },

  openAchievements() {
    const s = this.succesEtat = this.succesEtat || { vue: 'liste', cat: null, sous: null, choisi: null, filtre: '' };
    const r = () => this.fen.render('succes');
    const actions = {
      special: d => { s.cat = d.special; s.sous = null; s.vue = 'liste'; r(); },
      cat: d => { if (s.cat === d.cat && !s.sous) return; s.cat = d.cat; s.sous = null; s.vue = 'liste'; r(); },
      sous: d => { s.cat = d.cat; s.sous = d.sous; s.vue = 'liste'; r(); },
      choisir: d => { s.choisi = d.id; s.vue = 'fiche'; r(); },
      retour: () => { s.vue = 'liste'; r(); },
      suivre: d => {
        const on = this.suivreSucces(d.id);
        this.toast(on === null ? `Trois succès suivis au plus : retire d'abord l'un d'eux.` : on ? 'Succès suivi.' : 'Succès plus suivi.');
        r();
      },
      reclamer: d => { const g = this.world.claimAchievement(d.id); if (!g) this.toast(this.world.state === 'combat' ? 'Pas pendant un combat.' : 'Rien à réclamer.'); r(); },
      recompenses: () => this.openRecompenses(),
    };
    const onField = el => { if (el.id === 'succes-recherche') { s.filtre = el.value; s.vue = 'liste'; r(); } };
    this.simpleWin('succes', 'Succès', () => this.renderSucces(), actions, { width: 980, cls: 'vy-fenetre--succes', onField });
  },

  renderSucces() {
    const ch = this.world.ch, s = this.succesEtat, A = Achievements;
    const tous = A.defs().filter(a => A.pourPerso(ch, a));
    const a_ = id => ch.achievements.includes(id);
    const attente = new Set(A.pending(ch).map(a => a.id));
    const suivis = this.succesSuivis();
    const cats = (DATA.succes && DATA.succes.categories) || [...new Set(tous.map(A.category))];
    const ordreSous = (c, l) => { const ref = ((DATA.succes && DATA.succes.sousCategories) || {})[c] || []; return [...new Set(l.map(A.sousCategorie))].sort((x, y) => (ref.indexOf(x) + 1 || 99) - (ref.indexOf(y) + 1 || 99)); };
    if (!s.cat) s.cat = cats[0];

    const score = A.score(ch), total = A.total(ch);
    const paliers = tous.filter(a => a.cond.type === 'score').sort((x, y) => x.cond.count - y.cond.count);
    const prochain = paliers.find(p => !a_(p.id));
    const avant = [0, ...paliers.filter(p => a_(p.id)).map(p => p.cond.count)].pop();
    const recPalier = p => { const r = p.rewards || {}; return [r.title ? `« ${esc(r.title)} »` : '', r.cosmetique && typeof Garderobe !== 'undefined' && Garderobe.get(r.cosmetique) ? esc(Garderobe.get(r.cosmetique).nom) : ''].filter(Boolean).join(' + '); };
    const palier = prochain
      ? `<div class="vy-succes__palier"><div><span>Prochain palier : ${nb(prochain.cond.count)} points</span><b>${recPalier(prochain)}</b></div><i class="vy-succes__jauge"><i style="width:${Math.max(0, Math.min(100, Math.round(100 * (score - avant) / (prochain.cond.count - avant))))}%"></i></i></div>`
      : `<div class="vy-succes__palier"><div><span>Tous les paliers de score atteints</span></div></div>`;
    const tete = `<header class="vy-succes__tete">
      <div class="vy-succes__score"><b>${nb(score)}</b><span>points · ${total ? Math.round(100 * score / total) : 0} % de ${nb(total)}</span></div>
      ${palier}
      <label class="vy-recherche vy-succes__recherche">${ICO.recherche}<input id="succes-recherche" type="search" placeholder="Succès, titre, récompense…" value="${esc(s.filtre)}" aria-label="Chercher un succès, un titre ou une récompense"></label>
      ${attente.size ? `<button type="button" class="vy-bouton vy-bouton--primaire vy-succes__reclamer" data-act="recompenses">${attente.size} à réclamer</button>` : ''}
    </header>`;

    const pts = l => l.reduce((t, a) => t + A.points(a), 0);
    const proches = Achievements.proches ? Achievements.proches(ch, this.world.zone) : [];
    const raisons = this.succesRaisons = new Map(proches.map(x => [x.a.id, x.raison]));
    const presque = tous.filter(a => !a_(a.id) && a.cond.type !== 'score').map(a => ({ a, v: A.avancement(ch, a) })).filter(x => x.v && x.v[0] > 0 && x.v[0] / x.v[1] >= 0.5 && x.v[0] < x.v[1]).sort((x, y) => y.v[0] / y.v[1] - x.v[0] / x.v[1]).slice(0, 30).map(x => x.a);
    const TOURS = ['recoltes', 'argentes', 'relais', 'carnet', 'zone'];
    const tours = tous.filter(a => TOURS.includes(a.cond.type)).map(a => ({ a, v: A.avancement(ch, a), fait: a_(a.id) }))
      .sort((x, y) => (x.fait - y.fait) || (TOURS.indexOf(x.a.cond.type) - TOURS.indexOf(y.a.cond.type)) || ((y.v ? y.v[0] / y.v[1] : 0) - (x.v ? x.v[0] / x.v[1] : 0)))
      .map(x => x.a);
    const special = (k, label, ico, n, cl) => `<button type="button" class="vy-succes__ent${s.cat === k ? ' on' : ''}${cl ? ' ' + cl : ''}" data-act="special" data-special="${k}" aria-pressed="${s.cat === k}">${ico}<span>${label}</span><small>${n}</small></button>`;
    const nav = `<nav class="vy-succes__nav" data-defile="succes-nav">
      ${special('presque', 'Presque accomplis', ICO.presque, presque.length)}
      ${special('proche', 'Près d\'ici', ICO.proche, proches.length, proches.length ? 'proche' : '')}
      ${special('reclamer', 'À réclamer', ICO.reclamer, attente.size, attente.size ? 'cristal' : '')}
      ${special('suivis', 'Suivis', ICO.suivi, suivis.length)}
      ${special('tours', 'Les tours', ICO.tours, tours.filter(a => !a_(a.id)).length)}
      <hr>
      ${cats.map(c => {
        const l = tous.filter(a => A.category(a) === c), on = s.cat === c, t = pts(l), f = pts(l.filter(a => a_(a.id)));
        const sous = on ? ordreSous(c, l).map(x => { const ls = l.filter(a => A.sousCategorie(a) === x); return `<button type="button" class="vy-succes__sous${s.sous === x ? ' on' : ''}" data-act="sous" data-cat="${esc(c)}" data-sous="${esc(x)}"><span>${esc(x)}</span><small>${ls.filter(a => a_(a.id)).length}/${ls.length}</small></button>`; }).join('') : '';
        return `<button type="button" class="vy-succes__cat${on ? ' on' : ''}" data-act="cat" data-cat="${esc(c)}" aria-pressed="${on}">${ICO[c] || ICO['Général']}<span>${esc(c)}</span><small>${f} / ${t}</small><i class="vy-succes__barre"><i style="width:${t ? Math.round(100 * f / t) : 0}%"></i></i></button>${sous ? `<div class="vy-succes__sousliste">${sous}</div>` : ''}`;
      }).join('')}
    </nav>`;

    const f = sansAccents(s.filtre.trim());
    let titre, liste;
    if (f) {
      const texte = a => { const r = a.rewards || {}; return sansAccents([a.name, a.desc, r.title, r.cosmetique && typeof Garderobe !== 'undefined' && Garderobe.get(r.cosmetique) ? Garderobe.get(r.cosmetique).nom : ''].join(' ')); };
      liste = tous.filter(a => texte(a).includes(f));
      titre = `Recherche <span>· ${liste.length} résultat${liste.length > 1 ? 's' : ''}</span>`;
    } else if (s.cat === 'presque') { liste = presque; titre = 'Presque accomplis'; }
    else if (s.cat === 'proche') { liste = proches.map(x => x.a); titre = `Près d'ici <span>· ${esc((this.world.zone && this.world.zone.name) || '')}</span>`; }
    else if (s.cat === 'reclamer') { liste = [...attente].map(A.get).filter(Boolean); titre = 'À réclamer'; }
    else if (s.cat === 'suivis') { liste = suivis.map(A.get).filter(Boolean); titre = 'Suivis'; }
    else if (s.cat === 'tours') { liste = tours; titre = 'Les tours <span>· fait, reste à faire</span>'; }
    else {
      const l = tous.filter(a => A.category(a) === s.cat);
      const ordre = ordreSous(s.cat, l);
      liste = s.sous ? l.filter(a => A.sousCategorie(a) === s.sous) : l.slice().sort((x, y) => ordre.indexOf(A.sousCategorie(x)) - ordre.indexOf(A.sousCategorie(y)));
      titre = `${esc(s.cat)}${s.sous ? ` <span>· ${esc(s.sous)}</span>` : ''}`;
    }
    if (!s.choisi || !A.get(s.choisi) || (!liste.some(a => a.id === s.choisi) && liste.length)) s.choisi = (liste[0] || {}).id || s.choisi;
    const etat = a => attente.has(a.id) ? 'att' : a_(a.id) ? 'ok' : (A.avancement(ch, a) || [0])[0] > 0 ? 'mi' : '';
    const dans = new Set(liste.map(a => a.id)), pris = new Set();
    const blocs = !f && !['presque', 'proche', 'reclamer', 'suivis', 'tours'].includes(s.cat) ? liste.filter(a => a.cond.type === 'meta').map(m => {
      const enf = m.cond.succes.map(A.get).filter(a => a && A.pourPerso(ch, a));
      if (enf.length < 2 || !enf.every(a => dans.has(a.id)) || enf.some(a => pris.has(a.id))) return null;
      enf.forEach(a => pris.add(a.id)); pris.add(m.id);
      return { meta: m, tuiles: enf.concat(m) };
    }).filter(Boolean) : [];
    const nomBloc = b => { const dj = b.tuiles.find(a => a.cond.type === 'dungeon'); const d = dj && World.dungeonDef && World.dungeonDef(dj.cond.dungeon); return d ? d.name : b.meta.name; };
    const court = a => {
      const c = a.cond;
      if (c.type === 'dungeonTurns') return `${c.max} tours au plus`;
      if (c.type === 'bossDefi') { const d = typeof Challenges === 'object' && Challenges.byId(c.defi); return d ? `« ${d.name} »` : a.name; }
      if (c.type === 'noeudsBoss') return `${c.count} Nœuds ou plus`;
      if (/ \(Clé\)$/.test(a.name)) return a.desc.replace(/\.$/, '');
      return a.name;
    };
    const tuile = a => `<button type="button" class="vy-succes__tuile ${etat(a)}${a.cond.type === 'noeudsBoss' ? ' noue' : ''}${a.id === s.choisi ? ' choisi' : ''}" data-act="choisir" data-id="${a.id}" title="${esc(a.name)} : ${esc(a.desc)}"><small class="pt">${A.points(a)}</small><i class="vy-succes__gemme"></i><span class="k">${attente.has(a.id) ? 'Réclamer' : (/_defi2$/.test(a.id) ? 'Défi 2' : ETIQ[a.cond.type]) || A.sousCategorie(a)}</span><span class="nm">${esc(court(a))}</span></button>`;
    const ligne = a => {
      const v = A.avancement(ch, a), fait = a_(a.id);
      return `<button type="button" class="vy-succes__ligne ${etat(a)}${a.id === s.choisi ? ' choisi' : ''}" data-act="choisir" data-id="${a.id}"><i class="vy-succes__gemme"></i>` +
        `<span class="t"><b>${esc(a.name)}</b><small>${esc(a.desc)}</small>${raisons.has(a.id) ? `<small class="vy-succes__raison">${ICO.proche}${esc(raisons.get(a.id))}</small>` : ''}</span>` +
        `<span class="av">${attente.has(a.id) ? '<em>à réclamer</em>' : fait ? '' : v ? `<i class="vy-succes__jauge"><i style="width:${Math.round(100 * v[0] / v[1])}%"></i></i><small>${esc(A.progress(ch, a))}</small>` : `<small>${esc(A.progress(ch, a))}</small>`}</span>` +
        `<span class="pts">${A.points(a)}</span>${suivis.includes(a.id) ? `<span class="suivi">${ICO.suivi}</span>` : ''}</button>`;
    };
    const corps = blocs.map(b => {
      const t = pts(b.tuiles), fait = pts(b.tuiles.filter(a => a_(a.id)));
      return `<div class="vy-succes__bloc${fait === t ? ' fini' : ''}"><div class="vy-succes__bloctete"><b>${esc(nomBloc(b))}</b><span>${fait} <small>/ ${t} pts</small></span><i class="vy-succes__jauge"><i style="width:${t ? Math.round(100 * fait / t) : 0}%"></i></i></div><div class="vy-succes__tuiles">${b.tuiles.map(tuile).join('')}</div></div>`;
    }).join('') + liste.filter(a => !pris.has(a.id)).map(ligne).join('');
    const vide = s.cat === 'tours' ? 'Aucun tour pour l\'instant.' : s.cat === 'proche' ? 'Rien à faire près d\'ici pour l\'instant : la zone est faite.' : s.cat === 'reclamer' ? 'Rien à réclamer pour l\'instant.' : s.cat === 'suivis' ? 'Aucun succès suivi : choisis-en un, puis « Suivre ».' : s.cat === 'presque' ? 'Rien d\'à moitié fait pour l\'instant.' : 'Aucun succès ici.';
    const centre = `<section class="vy-succes__liste" data-defile="succes-liste"><div class="vy-succes__fil"><h3>${titre}</h3><span class="pts">${pts(liste.filter(a => a_(a.id)))} / ${pts(liste)} points</span></div>${corps || `<p class="vy-q-vide">${vide}</p>`}</section>`;

    const choisi = s.choisi && A.get(s.choisi);
    return `<div class="vy-succes${s.vue === 'fiche' ? ' vue-fiche' : ''}">${tete}${nav}${centre}<section class="vy-succes__fiche" data-defile="succes-fiche">${choisi ? this.ficheSucces(choisi, attente, suivis) : `<p class="vy-q-vide">${vide}</p>`}</section></div>`;
  },

  ficheSucces(a, attente, suivis) {
    const ch = this.world.ch, A = Achievements, fait = ch.achievements.includes(a.id), r = a.rewards || {};
    const v = A.avancement(ch, a), pct = v ? Math.round(100 * v[0] / v[1]) : fait ? 100 : 0;
    const enfants = a.cond.type === 'meta' ? a.cond.succes.map(A.get).filter(x => x && A.pourPerso(ch, x)) : [];
    const metas = A.defs().filter(m => m.cond.type === 'meta' && m.cond.succes.includes(a.id) && A.pourPerso(ch, m));
    const cos = r.cosmetique && typeof Garderobe !== 'undefined' ? [].concat(r.cosmetique).map(id => Garderobe.get(id)).filter(Boolean) : [];
    const gains = [
      r.xp ? `<span class="vy-q-gain xp">${nb(r.xp)} XP</span>` : '',
      r.fils ? `<span class="vy-q-gain fils">${nb(r.fils)} Dragmes</span>` : '',
      ...(r.items || []).map(it => { const d = Items.get(it.id); return d ? `<span class="vy-q-gain">${esc(d.name)}${(it.count || 1) > 1 ? ` × ${it.count}` : ''}</span>` : ''; }),
      r.title ? `<span class="vy-q-gain titre">titre « ${esc(r.title)} »</span>` : '',
      ...cos.map(c => `<span class="vy-q-gain cosmetique">${Hud.pictoCosmetique ? Hud.pictoCosmetique(c) : ''}${esc(c.nom)}</span>`),
    ].filter(Boolean).join('');
    const suivi = suivis.includes(a.id);
    const geste = attente.has(a.id)
      ? `<button type="button" class="vy-bouton vy-bouton--primaire" data-act="reclamer" data-id="${a.id}">Réclamer</button>`
      : fait ? '<span class="vy-q-suivre fini">Obtenu</span>'
        : `<button type="button" class="vy-bouton ${suivi ? '' : 'vy-bouton--primaire'}" data-act="suivre" data-id="${a.id}" aria-pressed="${suivi}">${ICO.suivi}${suivi ? 'Ne plus suivre' : 'Suivre ce succès'}</button><small class="vy-succes__nsuivis">${suivis.length} / ${SUIVIS_MAX} suivis</small>`;
    return `<button type="button" class="vy-q-retour" data-act="retour">${ICO.retour}Tous les succès</button>
      <header class="vy-succes__ftete"><span class="vy-succes__grosse ${fait ? 'ok' : pct ? 'mi' : ''}"><b>${A.points(a)}</b></span><div><h3>${esc(a.name)}</h3><small>${esc(A.category(a))} · ${esc(A.sousCategorie(a))}</small></div></header>
      <p class="vy-q-recit">${esc(a.desc)}</p>
      ${this.succesRaisons && this.succesRaisons.has(a.id) ? `<p class="vy-succes__fraison">${ICO.proche}<span>${esc(this.succesRaisons.get(a.id))}</span></p>` : ''}
      <div class="vy-sous"><span>Objectif</span><span>${fait ? 'fait' : esc(A.progress(ch, a))}</span></div>
      ${v || fait ? `<i class="vy-succes__jauge grande"><i style="width:${pct}%"></i></i>` : ''}
      ${enfants.length ? `<ol class="vy-q-etapes">${enfants.map(x => { const ok = ch.achievements.includes(x.id); return `<li class="vy-q-etape${ok ? ' fait' : ''}"><span class="vy-q-case">${ok ? ICO.coche : ''}</span><span>${esc(x.name)}</span></li>`; }).join('')}</ol>` : ''}
      ${gains ? `<div class="vy-sous"><span>Récompenses</span></div><div class="vy-q-gains">${gains}</div>` : ''}
      ${metas.map(m => `<button type="button" class="vy-succes__meta" data-act="choisir" data-id="${m.id}"><i class="vy-succes__gemme ${ch.achievements.includes(m.id) ? 'ok' : ''}"></i><span>Compte pour <b>${esc(m.name)}</b> (${A.points(m)} points) : ${esc(A.progress(ch, m))}</span></button>`).join('')}
      <footer class="vy-q-pied vy-succes__pied">${geste}</footer>`;
  },
});
})();
