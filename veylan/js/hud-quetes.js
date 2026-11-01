// Le journal des quêtes (touche Q), à la manière de celui de Dofus, dans le verre de Veylan
// (docs/ANALYSE-HUD-DUALITY.md, maquette 5). À gauche : « En cours » et « Terminées », une
// recherche, les quêtes rangées par catégorie (principales, région, faction, donjons, secondaires),
// chacune avec son anneau d'avancement. À droite, la quête choisie : son récit, ses étapes
// (faites, en cours avec leur compte, à venir, puis la remise), ce qu'elle rapporte, et trois
// gestes : « Suivre » (la carte d'infos du téléphone la montre), « Abandonner » (deux appuis) et
// « Montrer le chemin » : sur un plateau, les marques au sol jusqu'à l'objectif de l'étape (le PNJ à
// voir, le groupe à vaincre, le nœud à récolter), comme le guide du tutoriel. Au téléphone en
// portrait, la liste puis la fiche. Se charge après js/hud.js et js/hud-fenetres.js.
(() => {
const esc = s => Util.esc(s);
const svg = p => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${p}</svg>`;
const ICO = {
  parchemin: svg('<path d="M8 3h9a2 2 0 0 1 2 2v12"/><path d="M8 3a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h9a2 2 0 0 0 2-2"/><path d="M10 8h5M10 12h5M10 16h3"/>'),
  epingle: svg('<path d="M12 21s-6-5.2-6-10a6 6 0 0 1 12 0c0 4.8-6 10-6 10z"/><circle cx="12" cy="11" r="2.2"/>'),
  coche: svg('<path d="M5 12.5l4.2 4.2L19 7"/>'),
  chemin: svg('<path d="M5 19c3 0 3-4 6-4s3 4 6 4"/><circle cx="6" cy="6" r="2"/><path d="M6 8v3M18 5l-3 3h6z"/>'),
  retour: svg('<path d="M15 6l-6 6 6 6"/>'),
  recherche: svg('<circle cx="11" cy="11" r="6.5"/><path d="M16 16l4 4"/>'),
};
const CATS = [['main', 'Principales'], ['region', 'Région'], ['faction', 'Faction'], ['donjon', 'Donjons'], ['autre', 'Secondaires']];
const catDe = q => q.main ? 'main' : ['region', 'faction', 'donjon'].includes(q.category) ? q.category : 'autre';
const sansAccents = s => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
// L'anneau d'avancement d'une quête (le pourcentage au milieu).
const anneau = (pct, fini) => {
  const v = Math.round(pct * 100);
  return `<span class="vy-q-anneau${fini ? ' fini' : ''}" style="--p:${v}" aria-hidden="true"><svg viewBox="0 0 36 36"><circle class="piste" cx="18" cy="18" r="15"/><circle class="part" cx="18" cy="18" r="15" pathLength="100" stroke-dasharray="${v} 100"/></svg><b>${fini ? ICO.coche : v + '<i>%</i>'}</b></span>`;
};

Object.assign(Hud.prototype, {
  // La quête suivie : gardée sur l'appareil, par personnage ; à défaut, la première du suivi.
  quetesSuivie() {
    const ch = this.world.ch;
    let id = null;
    try { id = localStorage.getItem('veylan.suivie.' + (ch.uid || ch.name)); } catch (e) { /* rien */ }
    return id && ch.quests.active[id] ? id : null;
  },
  suivreQuete(id) {
    const ch = this.world.ch, cle = 'veylan.suivie.' + (ch.uid || ch.name);
    const deja = this.quetesSuivie() === id;
    try { if (deja) localStorage.removeItem(cle); else localStorage.setItem(cle, id); } catch (e) { /* rien */ }
    if (this.jeu && this.jeu.rafraichirCarte) this.jeu.rafraichirCarte();
    return !deja;
  },

  openQuests() {
    const s = this.quetesEtat = this.quetesEtat || { onglet: 'cours', choisie: null, filtre: '' };
    const r = () => this.fen.render('quetes');
    const actions = {
      onglet: d => { s.onglet = d.onglet; s.choisie = null; r(); },
      choisir: d => { s.choisie = d.id; s.vue = 'fiche'; r(); },
      retour: () => { s.vue = 'liste'; r(); },
      suivre: d => { const on = this.suivreQuete(d.id); this.toast(on ? 'Quête suivie.' : 'Quête plus suivie.'); r(); },
      // Abandonner : l'avancement est perdu, la quête redevient disponible (deux appuis).
      abandon: (d, b) => {
        if (!b.dataset.sure) { b.dataset.sure = '1'; b.textContent = 'Confirmer l\'abandon'; b.classList.add('vy-bouton--danger'); return; }
        this.world.abandonQuest(d.id);
        s.choisie = null;
      },
      chemin: d => this.cheminQuete(d.id),
    };
    const onField = el => { if (el.id === 'quetes-recherche') { s.filtre = el.value; r(); } };
    this.simpleWin('quetes', 'Quêtes', () => this.renderQuetes(), actions, { width: 780, cls: 'vy-fenetre--quetes', onField });
  },

  renderQuetes() {
    const ch = this.world.ch, s = this.quetesEtat, suivie = this.quetesSuivie();
    const actives = Quests.tracker(ch);
    const finies = ch.quests.done.map(id => Quests.get(id)).filter(Boolean);
    const f = sansAccents(s.filtre);
    const garde = q => !f || sansAccents(q.name).includes(f);
    const liste = s.onglet === 'finies'
      ? finies.filter(garde).map(q => ({ quest: q, fini: true, pct: 1, sous: 'terminée' }))
      : actives.filter(t => garde(t.quest)).map(t => {
        const q = t.quest, st = Quests.state(ch, q.id), n = (q.steps || []).length;
        const sous = t.done ? `à rendre à ${Quests.npcName(q.turnIn || q.giver)}` : `étape ${Math.min(n, (st ? st.step : 0) + 1)} sur ${n}`;
        return { quest: q, fini: false, pct: HudJeu.avancement(ch, t), sous, pret: t.done };
      });
    // La quête choisie : celle qu'on a touchée, sinon la suivie, sinon la première.
    if (!s.choisie || !liste.some(x => x.quest.id === s.choisie)) s.choisie = (suivie && liste.some(x => x.quest.id === suivie) ? suivie : liste[0] && liste[0].quest.id) || null;
    const groupes = CATS.map(([k, label]) => {
      const items = liste.filter(x => catDe(x.quest) === k);
      if (!items.length) return '';
      return `<div class="vy-q-cat">${label}<small>${items.length}</small></div>` + items.map(x => {
        const q = x.quest, on = q.id === s.choisie;
        return `<button type="button" class="vy-q-item${on ? ' on' : ''}${x.pret ? ' pret' : ''}" data-act="choisir" data-id="${q.id}" aria-pressed="${on}">${anneau(x.pct, x.fini)}` +
          `<span class="vy-q-item__t"><b>${esc(q.name)}</b><small>${esc(x.sous)}</small></span>` +
          `${q.id === suivie ? `<span class="vy-q-item__suivie" title="Quête suivie">${ICO.epingle}</span>` : `<span class="vy-q-item__niv">niv. ${q.level}</span>`}</button>`;
      }).join('');
    }).join('');
    const onglets = [['cours', `En cours`, actives.length], ['finies', 'Terminées', finies.length]].map(([k, l, n]) =>
      `<button type="button" class="vy-onglet${s.onglet === k ? ' on' : ''}" data-act="onglet" data-onglet="${k}" aria-pressed="${s.onglet === k}">${l}<small>${n}</small></button>`).join('');
    const vide = s.onglet === 'finies' ? 'Aucune quête terminée pour l\'instant.' : f ? 'Aucune quête ne porte ce nom.' : 'Aucune quête en cours : parle aux habitants marqués d\'un « ! ».';
    const choisie = s.choisie && Quests.get(s.choisie);
    return `<div class="vy-quetes${s.vue === 'fiche' ? ' vue-fiche' : ''}">
      <aside class="vy-quetes__liste">
        <nav class="vy-onglets vy-quetes__onglets">${onglets}</nav>
        <label class="vy-recherche vy-quetes__recherche">${ICO.recherche}<input id="quetes-recherche" type="search" placeholder="Chercher une quête" value="${esc(s.filtre)}" aria-label="Chercher une quête"></label>
        <div class="vy-quetes__items" data-defile="quetes-liste">${groupes || `<p class="vy-q-vide">${vide}</p>`}</div>
      </aside>
      <section class="vy-quetes__fiche" data-defile="quetes-fiche">${choisie ? this.ficheQuete(choisie, s.onglet === 'finies', suivie) : `<p class="vy-q-vide">${vide}</p>`}</section>
    </div>`;
  },

  // La fiche d'une quête : l'en-tête, le récit, les étapes, les récompenses, les gestes.
  ficheQuete(q, finie, suivie) {
    const ch = this.world.ch, st = Quests.state(ch, q.id), steps = q.steps || [], n = steps.length;
    const enCours = !finie && !!st, cur = enCours ? st.step : (finie ? n : -1);
    const cat = (CATS.find(c => c[0] === catDe(q)) || [])[1] || '';
    const donneur = Quests.npcName(q.giver), remise = Quests.npcName(q.turnIn || q.giver);
    const recit = q.desc || (q.dialogue && q.dialogue.offer && q.dialogue.offer.slice(0, 2).join(' ')) || '';
    const conseil = enCours && cur < n && q.dialogue && q.dialogue.progress && q.dialogue.progress[0];
    const etapes = steps.map((e, i) => {
      const etat = i < cur ? 'fait' : i === cur ? 'cours' : '';
      const texte = i === cur && enCours ? Quests.stepText(ch, q.id) : e.text;
      return `<li class="vy-q-etape ${etat}"><span class="vy-q-case">${etat === 'fait' ? ICO.coche : ''}</span><span>${esc(texte)}</span></li>`;
    }).join('') + `<li class="vy-q-etape remise ${finie ? 'fait' : cur >= n ? 'cours' : ''}"><span class="vy-q-case">${finie ? ICO.coche : ''}</span><span>${esc(q.turnIn && q.turnIn !== q.giver ? `Rendre la quête à ${remise}` : `Retourner voir ${remise}`)}</span></li>`;
    const r = q.rewards || {};
    const gains = [
      r.xp ? `<span class="vy-q-gain xp">${r.xp} XP</span>` : '',
      r.fils ? `<span class="vy-q-gain fils">${r.fils} Fils</span>` : '',
      ...(r.items || []).map(it => { const d = Items.get(it.id); return d ? `<span class="vy-q-gain">${esc(d.name)}${(it.count || 1) > 1 ? ` × ${it.count}` : ''}</span>` : ''; }),
      r.faction ? `<span class="vy-q-gain faction">points de faction</span>` : '',
      r.marcheurs ? `<span class="vy-q-gain faction">confiance des Francs-Marcheurs</span>` : '',
    ].filter(Boolean).join('');
    const peut = finie ? null : this.objectifQuete(q.id);
    const abandon = enCours && Quests.canAbandon(ch, q.id).ok ? `<button class="vy-bouton vy-bouton--petit vy-bouton--fantome" data-act="abandon" data-id="${q.id}" title="L'avancement sera perdu ; la quête redeviendra disponible.">Abandonner</button>` : '';
    const chemin = enCours ? `<button class="vy-bouton vy-bouton--petit vy-bouton--primaire" data-act="chemin" data-id="${q.id}"${peut && peut.point ? '' : ' disabled'} title="${esc(peut && peut.point ? `Jusqu'à ${peut.nom}` : (peut && peut.raison) || 'Rien à rejoindre pour cette étape')}">${ICO.chemin}Montrer le chemin</button>` : '';
    const estSuivie = suivie === q.id;
    return `<button type="button" class="vy-q-retour" data-act="retour">${ICO.retour}Toutes les quêtes</button>
      <header class="vy-q-tete"><span class="vy-q-tuile">${ICO.parchemin}</span><div class="vy-q-titre"><h3>${esc(q.name)}</h3><small>${esc(cat)} · niveau ${q.level} · ${esc(donneur)}</small></div>
        ${enCours ? `<button type="button" class="vy-q-suivre${estSuivie ? ' on' : ''}" data-act="suivre" data-id="${q.id}" aria-pressed="${estSuivie}">${ICO.epingle}${estSuivie ? 'Suivie' : 'Suivre'}</button>` : finie ? '<span class="vy-q-suivre fini">Terminée</span>' : ''}</header>
      ${recit ? `<p class="vy-q-recit">${esc(recit)}</p>` : ''}
      <div class="vy-sous"><span>Étapes</span><span>${Math.min(cur, n)} / ${n}</span></div>
      <ol class="vy-q-etapes">${etapes}</ol>
      ${conseil ? `<p class="vy-q-conseil">${esc(conseil)}</p>` : ''}
      ${gains ? `<div class="vy-sous"><span>Récompenses</span></div><div class="vy-q-gains">${gains}</div>` : ''}
      ${abandon || chemin ? `<footer class="vy-q-pied">${abandon}<span class="vy-q-pied__ressort"></span>${chemin}</footer>` : ''}`;
  },

  // L'objectif de l'étape en cours d'une quête, sur le plateau courant : { point, nom }, ou une
  // raison quand il n'y a rien à rejoindre (pas sur un plateau, en combat, une étape sans lieu).
  objectifQuete(id) {
    const w = this.world, ch = w.ch, q = Quests.get(id), st = Quests.state(ch, id);
    if (!q || !st) return null;
    if (!w.plateau) return { raison: 'Le chemin se montre sur l\'île' };
    if (w.showCombat) return { raison: 'Pas pendant un combat' };
    const steps = q.steps || [], e = steps[st.step], p = w.player;
    const proche = l => l.sort((a, b) => Math.hypot(a.x - p.x, a.y - p.y) - Math.hypot(b.x - p.x, b.y - p.y))[0];
    const pnj = npc => { const n = w.npcs.find(x => x.id === npc); return n ? { point: { x: n.x, y: n.y }, nom: Quests.npcName(npc) } : { raison: `${Quests.npcName(npc)} n'est pas ici` }; };
    const groupe = ids => { const g = proche(w.groups.filter(g2 => g2.monsters.some(m => ids.includes(m.id)))); return g ? { point: { x: g.x, y: g.y }, nom: 'le groupe le plus proche' } : { raison: 'Aucun groupe à vaincre ici' }; };
    if (!e) return pnj(q.turnIn || q.giver);
    if (e.type === 'talk' && e.npc) return pnj(e.npc);
    // Un lieu de l'île (une sous-zone) : le milieu de son contour.
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

  // « Montrer le chemin » : les marques au sol jusqu'à l'objectif, tenues à jour pendant la marche,
  // effacées à l'arrivée (3 u), en combat, en quittant le plateau ou quand le guide reprend la main.
  cheminQuete(id) {
    const o = this.objectifQuete(id), R = this.renderer, g = this.guide;
    if (!o || !o.point || !R || !g || !g.traceVers) { this.toast((o && o.raison) || 'Rien à rejoindre pour cette étape.'); return false; }
    clearInterval(this.cheminT);
    // Sur l'île, passer d'une sous-zone à l'autre change de carte, pas de plateau.
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
    // Au téléphone, la fenêtre se ferme pour laisser voir le chemin.
    if (Fenetres.compact || (typeof innerHeight === 'number' && innerHeight <= 500)) this.fen.close('quetes');
    return true;
  },
});
})();
