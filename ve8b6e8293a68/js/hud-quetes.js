(() => {
const esc = s => Util.esc(s);
const svg = p => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${p}</svg>`;
const ICO = {
  parchemin: svg('<path d="M8 3h9a2 2 0 0 1 2 2v12"/><path d="M8 3a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h9a2 2 0 0 0 2-2"/><path d="M10 8h5M10 12h5M10 16h3"/>'),
  epingle: svg('<path d="M12 21s-6-5.2-6-10a6 6 0 0 1 12 0c0 4.8-6 10-6 10z"/><circle cx="12" cy="11" r="2.2"/>'),
  punaise: svg('<path d="M9 3h6l-1 6 3 3v2H7v-2l3-3z"/><path d="M12 14v7"/>'),
  coche: svg('<path d="M5 12.5l4.2 4.2L19 7"/>'),
  chemin: svg('<path d="M5 19c3 0 3-4 6-4s3 4 6 4"/><circle cx="6" cy="6" r="2"/><path d="M6 8v3M18 5l-3 3h6z"/>'),
  retour: svg('<path d="M15 6l-6 6 6 6"/>'),
  recherche: svg('<circle cx="11" cy="11" r="6.5"/><path d="M16 16l4 4"/>'),
  entonnoir: svg('<path d="M4 5h16l-6 7.5V19l-4-2v-4.5z"/>'),
  oeil: svg('<path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12z"/><circle cx="12" cy="12" r="2.8"/>'),
  oeilBarre: svg('<path d="M4 4l16 16"/><path d="M9.6 6A9.9 9.9 0 0 1 12 5.5c6 0 9.5 6.5 9.5 6.5a17 17 0 0 1-3 3.6M6.4 7.4A17 17 0 0 0 2.5 12s3.5 6.5 9.5 6.5a9.6 9.6 0 0 0 4-.9"/>'),
};
const TYPE_ICO = {
  main: svg('<path d="M12 2.5l8.5 9.5-8.5 9.5L3.5 12z" fill="currentColor" stroke="none"/><path d="M12 7.5v6M12 16.6v.4" stroke="#241a06" stroke-width="2.6"/>'),
  region: svg('<path d="M3 19l6-11 4 6 3-4 5 9z" fill="currentColor" stroke="none"/><circle cx="16.5" cy="6" r="1.8" fill="currentColor" stroke="none"/>'),
  classe: svg('<path d="M12 3c1 3.5 5 5 5 10a5 5 0 0 1-10 0c0-2.4 1.2-3.8 2.4-5 .1 1.6.8 2.6 1.8 3.2C11 8.5 11.3 5.6 12 3z" fill="currentColor" stroke="none"/>'),
  faction: svg('<path d="M6 3v18" stroke-width="2.2"/><path d="M7 4h11l-2.6 4L18 12H7z" fill="currentColor" stroke="none"/>'),
  donjon: svg('<path d="M5 21V10a7 7 0 0 1 14 0v11z" fill="currentColor" stroke="none"/><path d="M9.5 21v-6a2.5 2.5 0 0 1 5 0v6" stroke="#241a06" stroke-width="1.8"/>'),
  autre: svg('<path d="M7 3h10a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2z" fill="currentColor" stroke="none"/><path d="M9 8h6M9 12h6M9 16h4" stroke="#241a06" stroke-width="1.8"/>'),
  rendre: svg('<path d="M9 8.5a3 3 0 1 1 4.3 2.7c-.8.4-1.3 1.1-1.3 2v.6M12 17v.4" stroke-width="2.6"/>'),
};
const CATS = [['main', 'Principales'], ['region', 'Région'], ['classe', 'Voie'], ['faction', 'Faction'], ['donjon', 'Donjons'], ['autre', 'Secondaires']];
const catDe = q => q.main ? 'main' : ['region', 'classe', 'faction', 'donjon'].includes(q.category) ? q.category : 'autre';
const NIV_MAX = 200;
const sansAccents = s => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
const anneau = (pct, fini, type, pret) => {
  const v = Math.round(pct * 100);
  return `<span class="vy-q-anneau${fini ? ' fini' : ''}${pret ? ' pret' : ''}" style="--p:${v}" title="${fini ? 'Terminée' : pret ? 'À rendre' : v + ' %'}" aria-hidden="true"><svg viewBox="0 0 36 36"><circle class="piste" cx="18" cy="18" r="15"/><circle class="part" cx="18" cy="18" r="15" pathLength="100" stroke-dasharray="${fini ? 100 : v} 100"/></svg><b>${fini ? ICO.coche : pret ? TYPE_ICO.rendre : TYPE_ICO[type]}</b></span>`;
};
const motif = nom => String(nom).split(/\s+/).filter(Boolean).map(m => {
  const e = esc(m).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return /al$/i.test(m) ? e.slice(0, -2) + '(?:al|aux)' : e + '(?:s|x)?';
}).join('\\s+');
function nomsEtape(e) {
  if (!e) return [];
  const n = [];
  if (e.npc) n.push(Quests.npcName(e.npc));
  for (const m of [e.monster].concat((e.kills || []).map(k => k.monster))) if (m && DATA.monsters[m]) n.push(DATA.monsters[m].name);
  for (const i of [e.item, e.resource]) { const d = i && Items.get(typeof i === 'object' ? i.id : i); if (d) n.push(d.name); }
  if (e.map && typeof World === 'object' && World.mapDef) { const d = World.mapDef(e.map); if (d) n.push(d.sousZone || d.name); }
  return n.filter(x => x && x.length > 2).sort((a, b) => b.length - a.length);
}
function marquer(texte, noms) {
  let h = esc(texte);
  for (const nom of noms) {
    const re = new RegExp(`(^|[\\s'’(«;])(${motif(nom.replace(/^(le|la|les|l')\s*/i, ''))})(?=$|[\\s,.;:!?)»])`, 'i');
    h = h.replace(re, (m0, avant, x) => `${avant}<b class="vy-q-nom">${x}</b>`);
  }
  return h.replace(/\((\d+\s*\/\s*\d+)\)$/, '<span class="vy-q-compte">$1</span>');
}

Object.assign(Hud.prototype, {
  quetesSuivie() {
    const ch = this.world.ch;
    let id = null;
    try { id = localStorage.getItem('veylan.suivie.' + (ch.uid || ch.name)); } catch (e) {   }
    return id && ch.quests.active[id] ? id : null;
  },
  suivreQuete(id) {
    const ch = this.world.ch, cle = 'veylan.suivie.' + (ch.uid || ch.name);
    const deja = this.quetesSuivie() === id;
    try { if (deja) localStorage.removeItem(cle); else localStorage.setItem(cle, id); } catch (e) {   }
    if (this.jeu && this.jeu.rafraichirCarte) this.jeu.rafraichirCarte();
    return !deja;
  },
  quetesMasquees() {
    const ch = this.world.ch;
    try { const l = JSON.parse(localStorage.getItem('veylan.quetes.masquees.' + (ch.uid || ch.name)) || '[]'); return new Set(Array.isArray(l) ? l : []); } catch (e) { return new Set(); }
  },
  masquerQuete(id) {
    const ch = this.world.ch, m = this.quetesMasquees(), on = !m.has(id);
    if (on) m.add(id); else m.delete(id);
    try { localStorage.setItem('veylan.quetes.masquees.' + (ch.uid || ch.name), JSON.stringify([...m])); } catch (e) {   }
    return on;
  },

  openQuests() {
    const s = this.quetesEtat = this.quetesEtat || { onglet: 'cours', choisie: null, filtre: '', nivMin: 1, nivMax: NIV_MAX, types: [], plies: [], filtres: true };
    s.vue = 'liste';
    const r = () => this.fen.render('quetes');
    const bascule = (liste, k) => { const i = liste.indexOf(k); if (i < 0) liste.push(k); else liste.splice(i, 1); };
    const actions = {
      onglet: d => { s.onglet = d.onglet; s.choisie = null; r(); },
      choisir: d => { s.choisie = d.id; s.vue = 'fiche'; r(); },
      retour: () => { s.vue = 'liste'; r(); },
      plier: d => { bascule(s.plies, d.cat); r(); },
      filtres: () => { s.filtres = !s.filtres; r(); },
      type: d => { bascule(s.types, d.type); r(); },
      suivre: d => { const on = this.suivreQuete(d.id); this.toast(on ? 'Quête suivie.' : 'Quête plus suivie.'); r(); },
      epingler: d => { const on = this.suivreQuete(d.id); this.toast(on ? 'Quête suivie.' : 'Quête plus suivie.'); r(); },
      masquer: d => { const on = this.masquerQuete(d.id); this.toast(on ? 'Quête masquée : elle reste en cours, dans l\'onglet « Masquées ».' : 'Quête de nouveau affichée.'); r(); },
      abandon: (d, b) => {
        if (!b.dataset.sure) { b.dataset.sure = '1'; b.textContent = 'Confirmer l\'abandon'; b.classList.add('vy-bouton--danger'); return; }
        this.world.abandonQuest(d.id);
        s.choisie = null;
      },
      chemin: d => this.cheminQuete(d.id),
    };
    const onField = el => {
      if (el.id === 'quetes-recherche') { s.filtre = el.value; r(); }
      else if (el.id === 'quetes-niv-min' || el.id === 'quetes-niv-max') {
        const v = Math.max(1, Math.min(NIV_MAX, parseInt(el.value, 10) || (el.id === 'quetes-niv-min' ? 1 : NIV_MAX)));
        if (el.id === 'quetes-niv-min') s.nivMin = v; else s.nivMax = v;
        r();
      }
    };
    this.simpleWin('quetes', 'Quêtes', () => this.renderQuetes(), actions, { width: 920, cls: 'vy-fenetre--quetes', onField });
  },

  renderQuetes() {
    const ch = this.world.ch, s = this.quetesEtat, suivie = this.quetesSuivie(), masquees = this.quetesMasquees();
    const toutes = Quests.tracker(ch);
    const actives = toutes.filter(t => !masquees.has(t.quest.id)), cachees = toutes.filter(t => masquees.has(t.quest.id));
    const finies = ch.quests.done.map(id => Quests.get(id)).filter(Boolean);
    const f = sansAccents(s.filtre);
    const lo = Math.min(s.nivMin, s.nivMax), hi = Math.max(s.nivMin, s.nivMax);
    const garde = q => (!f || sansAccents(q.name).includes(f)) && (q.level || 1) >= lo && (q.level || 1) <= hi && !s.types.includes(catDe(q));
    const enCours = l => l.filter(t => garde(t.quest)).map(t => {
      const q = t.quest, st = Quests.state(ch, q.id), n = (q.steps || []).length;
      const sous = t.done ? `à rendre à ${Quests.npcName(q.turnIn || q.giver)}` : `étape ${Math.min(n, (st ? st.step : 0) + 1)} sur ${n}`;
      return { quest: q, fini: false, pct: HudJeu.avancement(ch, t), sous, pret: t.done };
    });
    const liste = s.onglet === 'finies' ? finies.filter(garde).map(q => ({ quest: q, fini: true, pct: 1, sous: 'terminée' }))
      : enCours(s.onglet === 'masquees' ? cachees : actives);
    if (!s.choisie || !liste.some(x => x.quest.id === s.choisie)) s.choisie = (suivie && liste.some(x => x.quest.id === suivie) ? suivie : liste[0] && liste[0].quest.id) || null;
    const groupes = CATS.map(([k, label]) => {
      const items = liste.filter(x => catDe(x.quest) === k);
      if (!items.length) return '';
      const plie = s.plies.includes(k);
      return `<button type="button" class="vy-q-cat${plie ? ' plie' : ''}" data-act="plier" data-cat="${k}" aria-expanded="${!plie}">${label} (${items.length})<i aria-hidden="true">${plie ? '+' : '−'}</i></button>` + (plie ? '' : items.map(x => {
        const q = x.quest, on = q.id === s.choisie, suivi = q.id === suivie;
        const epingle = x.fini ? '' : `<span class="vy-q-item__epingle${suivi ? ' vy-q-item__suivie' : ''}" data-act="epingler" data-id="${q.id}" role="button" title="${suivi ? 'Ne plus suivre' : 'Suivre'}" aria-label="${suivi ? 'Ne plus suivre' : 'Suivre'} ${esc(q.name)}">${ICO.punaise}</span>`;
        return `<button type="button" class="vy-q-item${on ? ' on' : ''}${x.pret ? ' pret' : ''}" data-act="choisir" data-id="${q.id}" aria-pressed="${on}" title="${esc(x.sous)}">${anneau(x.pct, x.fini, catDe(q), x.pret)}` +
          `<span class="vy-q-item__t"><b>${esc(q.name)}</b></span><span class="vy-q-item__niv">Niv. ${q.level}</span>${epingle}</button>`;
      }).join(''));
    }).join('');
    const onglets = [['cours', 'En cours', actives.length], ['finies', 'Terminées', finies.length], ['masquees', 'Masquées', cachees.length]].map(([k, l, n]) =>
      `<button type="button" class="vy-onglet${s.onglet === k ? ' on' : ''}" data-act="onglet" data-onglet="${k}" aria-pressed="${s.onglet === k}">${l} <small>(${n})</small></button>`).join('');
    const filtresOn = s.types.length || lo > 1 || hi < NIV_MAX;
    const types = CATS.map(([k, label]) => `<button type="button" class="vy-q-type${s.types.includes(k) ? '' : ' on'}" data-act="type" data-type="${k}" aria-pressed="${!s.types.includes(k)}" title="${label}">${TYPE_ICO[k]}</button>`).join('');
    const vide = s.onglet === 'finies' ? 'Aucune quête terminée pour l\'instant.' : s.onglet === 'masquees' ? 'Aucune quête masquée.' : f || filtresOn ? 'Aucune quête ne répond à ces filtres.' : 'Aucune quête en cours : parle aux habitants marqués d\'un « ! ».';
    const choisie = s.choisie && Quests.get(s.choisie);
    return `<div class="vy-quetes${s.vue === 'fiche' ? ' vue-fiche' : ''}">
      <aside class="vy-quetes__liste">
        <nav class="vy-onglets vy-quetes__onglets">${onglets}</nav>
        <div class="vy-quetes__outils">
          <div class="vy-quetes__cherche"><label class="vy-recherche vy-quetes__recherche">${ICO.recherche}<input id="quetes-recherche" type="search" placeholder="Rechercher une quête" value="${esc(s.filtre)}" aria-label="Rechercher une quête"></label>
            <button type="button" class="vy-q-entonnoir${s.filtres ? ' on' : ''}${filtresOn ? ' actif' : ''}" data-act="filtres" aria-pressed="${s.filtres}" title="Filtres">${ICO.entonnoir}</button></div>
          ${s.filtres ? `<div class="vy-quetes__filtres"><label class="vy-q-niv">Niveau <input id="quetes-niv-min" type="number" min="1" max="${NIV_MAX}" value="${lo}" aria-label="Niveau minimum"></label><label class="vy-q-niv">à <input id="quetes-niv-max" type="number" min="1" max="${NIV_MAX}" value="${hi}" aria-label="Niveau maximum"></label><span class="vy-q-types">${types}</span></div>` : ''}
        </div>
        <div class="vy-quetes__items" data-defile="quetes-liste">${groupes || `<p class="vy-q-vide">${vide}</p>`}</div>
      </aside>
      <section class="vy-quetes__fiche">${choisie ? this.ficheQuete(choisie, s.onglet === 'finies', suivie, masquees.has(choisie.id)) : `<p class="vy-q-vide">${vide}</p>`}</section>
    </div>`;
  },

  ficheQuete(q, finie, suivie, masquee) {
    const ch = this.world.ch, st = Quests.state(ch, q.id), steps = q.steps || [], n = steps.length;
    const enCours = !finie && !!st, cur = enCours ? st.step : (finie ? n : -1);
    const type = catDe(q), cat = (CATS.find(c => c[0] === type) || [])[1] || '';
    const donneur = Quests.npcName(q.giver), remise = Quests.npcName(q.turnIn || q.giver);
    const recit = q.desc || (q.dialogue && q.dialogue.offer && q.dialogue.offer.slice(0, 2).join(' ')) || '';
    const conseil = enCours && cur < n && q.dialogue && q.dialogue.progress && q.dialogue.progress[0];
    const etapes = steps.map((e, i) => {
      const etat = i < cur ? 'fait' : i === cur ? 'cours' : '';
      const texte = i === cur && enCours ? Quests.stepText(ch, q.id) : e.text;
      return `<li class="vy-q-etape ${etat}"><span class="vy-q-case">${etat === 'fait' ? ICO.coche : ICO.epingle}</span><span>${marquer(texte, nomsEtape(e))}</span></li>`;
    }).join('') + `<li class="vy-q-etape remise ${finie ? 'fait' : cur >= n ? 'cours' : ''}"><span class="vy-q-case">${finie ? ICO.coche : ICO.epingle}</span><span>${marquer(q.turnIn && q.turnIn !== q.giver ? `Rendre la quête à ${remise}` : `Retourner voir ${remise}`, [remise])}</span></li>`;
    const r = q.rewards || {};
    const gains = [
      r.xp ? `<span class="vy-q-gain xp"><b>${r.xp.toLocaleString('fr-FR')}</b> XP</span>` : '',
      r.fils ? `<span class="vy-q-gain fils"><b>${r.fils.toLocaleString('fr-FR')}</b> Dragmes</span>` : '',
      ...(r.items || []).map(it => { const d = Items.get(it.id); return d ? `<span class="vy-q-gain objet vy-case" data-rarete="${Items.rarity(d)}" title="${esc(d.name)}${(it.count || 1) > 1 ? ` × ${it.count}` : ''}"><span class="vy-case__icone">${Hud.picto(d)}</span>${(it.count || 1) > 1 ? `<span class="vy-case__nombre">${it.count}</span>` : ''}</span>` : ''; }),
      r.faction ? `<span class="vy-q-gain faction">Points de faction</span>` : '',
      r.marcheurs ? `<span class="vy-q-gain faction">Confiance des Francs-Marcheurs</span>` : '',
      ...(typeof Garderobe !== 'undefined' ? [].concat(r.cosmetique || []).map(id => { const c = Garderobe.get(id); return c ? `<span class="vy-q-gain cosmetique">${esc(c.nom)}</span>` : ''; }) : []),
    ].filter(Boolean).join('');
    const peut = finie ? null : this.objectifQuete(q.id);
    const abandon = enCours && Quests.canAbandon(ch, q.id).ok ? `<button class="vy-bouton vy-bouton--petit vy-bouton--fantome" data-act="abandon" data-id="${q.id}" title="L'avancement sera perdu ; la quête redeviendra disponible.">Abandonner</button>` : '';
    const chemin = enCours ? `<button class="vy-bouton vy-bouton--petit vy-bouton--primaire" data-act="chemin" data-id="${q.id}"${peut && peut.point ? '' : ' disabled'} title="${esc(peut && peut.point ? `Jusqu'à ${peut.nom}` : (peut && peut.raison) || 'Rien à rejoindre pour cette étape')}">${ICO.chemin}<span>Montrer le chemin</span></button>` : '';
    const estSuivie = suivie === q.id;
    const masquer = enCours ? `<button type="button" class="vy-bouton vy-bouton--petit vy-q-masquer${masquee ? ' on' : ''}" data-act="masquer" data-id="${q.id}" aria-pressed="${!!masquee}">${masquee ? ICO.oeil : ICO.oeilBarre}<span class="vy-q-lib">${masquee ? 'Afficher' : 'Masquer'}</span></button>` : '';
    const suivre = enCours ? `<button type="button" class="vy-bouton vy-bouton--petit vy-q-suivre${estSuivie ? ' on' : ''}" data-act="suivre" data-id="${q.id}" aria-pressed="${estSuivie}">${ICO.punaise}<span class="vy-q-lib">${estSuivie ? 'Ne plus suivre' : 'Suivre'}</span></button>` : '';
    const etat = finie ? '<span class="vy-q-etat fini">Terminée</span>' : estSuivie ? `<span class="vy-q-etat">${ICO.punaise}Suivie</span>` : masquee ? `<span class="vy-q-etat">${ICO.oeilBarre}Masquée</span>` : '';
    return `<div class="vy-q-corps" data-defile="quetes-fiche">
      <button type="button" class="vy-q-retour" data-act="retour">${ICO.retour}Toutes les quêtes</button>
      <div class="vy-q-carte">
        <header class="vy-q-tete"><div class="vy-q-titre"><h3>${esc(q.name)}</h3></div>
          <div class="vy-q-sep" aria-hidden="true"><span class="vy-q-sep__losange">${TYPE_ICO[type]}</span></div>
          <div class="vy-q-meta"><span class="vy-q-cat-tag">${esc(cat)}</span><span>Niveau ${q.level}</span><span>${esc(donneur)}</span>${etat}</div></header>
        ${recit ? `<p class="vy-q-recit">${esc(recit)}</p>` : ''}
      </div>
      <div class="vy-sous vy-q-objectifs"><span>Objectifs</span><span>${Math.min(cur, n)} / ${n}</span></div>
      <ol class="vy-q-etapes">${etapes}</ol>
      ${conseil ? `<p class="vy-q-conseil">${esc(conseil)}</p>` : ''}
    </div>
    <footer class="vy-q-bas">
      ${masquer || suivre || abandon || chemin ? `<div class="vy-q-pied">${masquer}${suivre}<span class="vy-q-pied__ressort"></span>${abandon}${chemin}</div>` : ''}
      ${gains ? `<div class="vy-q-bas__titre"><span>Récompenses</span></div><div class="vy-q-gains">${gains}</div>` : ''}
    </footer>`;
  },

  portraitPnj(id) {
    const def = (DATA.content.npcs || []).find(x => x.id === id);
    const painter = this.renderer && (this.renderer.painter || this.renderer);
    if (!def || !painter || typeof Parole === 'undefined') return '';
    const cache = Hud._bustes || (Hud._bustes = new Map());
    const key = def.look || 'marcheur';
    if (cache.has(key)) return cache.get(key);
    let url = '';
    try {
      const cv = document.createElement('canvas');
      Parole.portrait(cv, def, painter, 'neutre');
      url = cv.toDataURL('image/png');
    } catch (e) { url = ''; }
    if (url) cache.set(key, url);
    return url;
  },

  objectifQuete(id, partout) {
    const w = this.world, ch = w.ch, q = Quests.get(id), st = Quests.state(ch, id);
    if (!q || !st) return null;
    if (!w.plateau && !partout) return { raison: 'Le chemin se montre sur l\'île' };
    if (w.showCombat) return { raison: 'Pas pendant un combat' };
    const steps = q.steps || [], e = steps[st.step], p = w.player;
    const proche = l => l.sort((a, b) => Math.hypot(a.x - p.x, a.y - p.y) - Math.hypot(b.x - p.x, b.y - p.y))[0];
    const pnj = npc => { const n = w.npcs.find(x => x.id === npc); return n ? { point: { x: n.x, y: n.y }, nom: Quests.npcName(npc) } : { raison: `${Quests.npcName(npc)} n'est pas ici` }; };
    const groupe = ids => { const g = proche(w.groups.filter(g2 => g2.monsters.some(m => ids.includes(m.id)))); return g ? { point: { x: g.x, y: g.y }, nom: 'le groupe le plus proche' } : { raison: 'Aucun groupe à vaincre ici' }; };
    if (!e) return pnj(q.turnIn || q.giver);
    if (e.type === 'talk' && e.npc) return pnj(e.npc);
    if (e.type === 'visit' && e.map) {
      const def = World.mapDef(e.map), c = def && def.contour;
      if (!c || (def.plateau && w.plateau && def.plateau !== w.plateau.id)) return { raison: 'Ce lieu est sur une autre carte' };
      const x = c.reduce((t, q) => t + q[0], 0) / c.length, y = c.reduce((t, q) => t + q[1], 0) / c.length;
      return { point: { x, y }, nom: def.name };
    }
    if (e.type === 'kill' && e.monster) return groupe([e.monster]);
    if (e.type === 'kills' && e.kills) return groupe(e.kills.map(k => k.monster));
    if (e.type === 'gather' && e.resource) {
      const n = proche((w.nodes || []).filter(x => (x.resource === e.resource || (x.resource && x.resource.id === e.resource)) && x.ready !== false));
      return n ? { point: { x: n.x, y: n.y }, nom: 'la récolte la plus proche' } : { raison: 'Rien à récolter ici pour l\'instant' };
    }
    if (e.type === 'collect' && e.item) {
      const d = Items.get(e.item), mons = ((d && d.drops) || []).map(x => x.monster).filter(Boolean);
      if (mons.length) return groupe(mons);
    }
    return { raison: 'Cette étape ne se rejoint pas' };
  },

  cheminQuete(id) {
    const o = this.objectifQuete(id), R = this.renderer, g = this.guide;
    if (!o || !o.point || !R || !g || !g.traceVers) { this.toast((o && o.raison) || 'Rien à rejoindre pour cette étape.'); return false; }
    clearInterval(this.cheminT);
    const w = this.world, plateau = w.plateau && w.plateau.id;
    const poser = () => {
      const p = w.player, b = o.point;
      if (w.showCombat || !w.plateau || w.plateau.id !== plateau || Math.hypot(p.x - b.x, p.y - b.y) < 3 || (R.guideCue && R.guideCue !== this.cheminCue)) {
        if (R.guideCue === this.cheminCue) R.guideCue = null;
        clearInterval(this.cheminT); this.cheminT = null; this.cheminCue = null;
        return;
      }
      this.cheminCue = { point: { x: b.x, y: b.y }, chemin: g.traceVers(b) };
      R.guideCue = this.cheminCue;
    };
    this.cheminCue = null;
    R.guideCue = null;
    poser();
    this.cheminT = setInterval(poser, 400);
    this.toast(`Le chemin jusqu'à ${o.nom}.`);
    if (Fenetres.compact || (typeof innerHeight === 'number' && innerHeight <= 500)) this.fen.close('quetes');
    return true;
  },
});
})();
