(() => {
const esc = s => Util.esc(s);
const nf = n => Number(n || 0).toLocaleString('fr-FR');
const svg = p => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${p}</svg>`;
const ICO = {
  trophee: svg('<path d="M8 4h8v5a4 4 0 0 1-8 0z"/><path d="M8 6H5a3 3 0 0 0 3 4M16 6h3a3 3 0 0 1-3 4M12 13v4M8.5 20h7M10 17h4v3h-4z"/>'),
  defaite: svg('<path d="M12 3l8 3v5c0 4.5-3.2 8-8 10-4.8-2-8-5.5-8-10V6z"/><path d="M9 9l6 6M15 9l-6 6"/>'),
  degats: svg('<path d="M14.5 4.5l5 5-9 9H5.5v-5z"/><path d="M12 7l5 5M4 20l3-3"/>'),
  recus: svg('<path d="M12 3l1.8 5.2L19 6l-2.2 5.2L21 13l-5.3.8L17 19l-4.4-3.1L9 20.5l-.4-5.4L3 14l4.6-2.6L5.5 6.5l5 1.6z"/>'),
  soins: svg('<path d="M9.5 4h5v5.5H20v5h-5.5V20h-5v-5.5H4v-5h5.5z"/>'),
  boucliers: svg('<path d="M12 3l8 3v5c0 4.5-3.2 8-8 10-4.8-2-8-5.5-8-10V6z"/>'),
  acheves: svg('<path d="M12 3a7.5 7.5 0 0 0-4.5 13.5V20h9v-3.5A7.5 7.5 0 0 0 12 3z"/><circle cx="9" cy="11" r="1.6"/><circle cx="15" cy="11" r="1.6"/><path d="M10.5 20v-2.5M13.5 20v-2.5"/>'),
  temps: svg('<circle cx="12" cy="13" r="7.5"/><path d="M12 9v4l2.5 2M10 3h4"/>'),
  tours: svg('<path d="M20 12a8 8 0 1 1-3-6.2"/><path d="M20 4v5h-5"/>'),
  plie: svg('<path d="M6 12h12"/>'),
  deplie: svg('<path d="M6 12h12M12 6v12"/>'),
  chevron: svg('<path d="M6 9l6 6 6-6"/>'),
  pods: svg('<path d="M7 9h10l1.5 10.5h-13z"/><path d="M9.5 9V7.5a2.5 2.5 0 0 1 5 0V9"/>'),
};
const DRAGME = '<svg class="vy-fdc__dragme" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="8.5" fill="#f2c14e" stroke="#9b6a14" stroke-width="1.5"/><path d="M12 7.5l3.2 4.5L12 16.5 8.8 12z" fill="#fff3c4" stroke="#9b6a14" stroke-width="1"/></svg>';
const CHIFFRES = [
  ['degats', 'Dégâts infligés', 'Dégâts totaux infligés'],
  ['recus', 'Dégâts reçus', 'Dégâts totaux subis'],
  ['boucliers', 'Boucliers donnés', 'Boucliers donnés'],
  ['soins', 'Soins donnés', 'Soins donnés'],
  ['soinsRecus', 'Soins reçus', 'Soins reçus'],
  ['acheves', 'Ennemis achevés', 'Ennemis achevés'],
];
const ICONE = { degats: ICO.degats, recus: ICO.recus, boucliers: ICO.boucliers, bouclRecus: ICO.boucliers, soins: ICO.soins, soinsRecus: ICO.soins, acheves: ICO.acheves };
const STATS = [['acheves', 'Ennemis achevés'], ['degats', 'Dégâts totaux infligés'], ['recus', 'Dégâts totaux subis'], ['soins', 'Soins donnés'], ['soinsRecus', 'Soins reçus'], ['boucliers', 'Boucliers donnés'], ['bouclRecus', 'Boucliers reçus']];
const duree = s => `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;

Object.assign(Hud.prototype, {
  openFightEnd(r) {
    const ch = this.world.ch;
    if (r.entrainement) return this.finEntrainementDojo(r.entrainement);
    this.fdc = { r };
    const gagne = !!r.victory, bilan = r.bilan || [];
    const moi = bilan.find(b => b.moi) || { nom: ch.name, niveau: ch.level, equipe: 'player' };
    const adverses = bilan.filter(b => b.equipe !== 'player');
    const bd = r.bonusDefi || {}, vers = bd.mode === 'xp' ? ' d\'XP' : bd.mode === 'butin' ? ' de butin' : '';
    const puces = [];
    for (const c of r.challenges || (r.challenge ? [r.challenge] : [])) puces.push(`<span class="vy-fdc__puce ${c.success ? 'ok' : 'rate'}" title="Défi : ${esc(c.name)}">Défi ${esc(c.name)} : ${c.success ? `+${bd.mode ? 2 * c.bonus : c.bonus} %${vers}` : 'raté'}</span>`);
    if (r.repos) puces.push(`<span class="vy-fdc__puce ok">Repos de la zone +${r.repos} %</span>`);
    if (r.knots) puces.push(`<span class="vy-fdc__puce ok">${r.knots} Nœud${r.knots > 1 ? 's' : ''} noué${r.knots > 1 ? 's' : ''} +${r.knots * DATA.rules.knotBonus} %</span>`);
    if (r.veille) puces.push(`<span class="vy-fdc__puce ok">Veille du jour : ${esc(r.veille)}</span>`);
    if (r.epreuveDojo) puces.push(`<span class="vy-fdc__puce${r.epreuveDojo.sceaux ? ' ok' : ''}">Épreuve du jour : ${r.epreuveDojo.tours} tour${r.epreuveDojo.tours > 1 ? 's' : ''}${r.epreuveDojo.sceaux ? ', un Insigne de la Garde' : `, plus de ${r.epreuveDojo.limite} tours`}</span>`);
    if (r.familier) { puces.push(`<span class="vy-fdc__puce ok">${esc(r.familier.nom)} +${nf(r.familier.xp)} XP${r.familier.niveaux ? `, niveau ${r.familier.niveau} !` : ''}</span>`); if (r.familier.niveaux) this.chat('gain', `${r.familier.nom} passe au niveau ${r.familier.niveau}.`); }
    if (r.monture) { puces.push(`<span class="vy-fdc__puce ok">${esc(r.monture.nom)} +${nf(r.monture.xp)} XP (${nf(r.monture.cede)} cédés)${r.monture.niveaux ? `, niveau ${r.monture.niveau} !` : ''}</span>`); if (r.monture.niveaux) this.chat('gain', `${r.monture.nom} passe au niveau ${r.monture.niveau}.`); }
    let dungeon = '';
    if (r.dungeon) dungeon = r.dungeon.cleared ? `<div class="vy-fdc__donjon"><img class="vy-coffre-donjon" src="assets/ui/objets/coffre-donjon.png" alt="Le coffre du donjon, ouvert" draggable="false"><div><b>Donjon terminé : ${esc(r.dungeon.def.name)} !</b>${r.dungeon.turns ? `<span>En ${r.dungeon.turns} tours, toutes salles comprises.</span>` : ''}</div></div>` : `<p class="vy-fdc__suite">Salle suivante : ${esc(r.dungeon.def.rooms[r.dungeon.next].name)}</p>`;
    const donjon = gagne && r.dungeon && r.dungeon.cleared && UI.reglage('finDonjon') ? this.ficheFinDonjon(r.dungeon) : '';
    const meta = `<span class="vy-fdc__meta">${r.duree ? `<span title="Durée">${ICO.temps}${duree(r.duree)}</span>` : ''}${r.tours ? `<span title="Tours">${ICO.tours}${r.tours} tour${r.tours > 1 ? 's' : ''}</span>` : ''}</span>`;
    const onglet = (k, l, on) => `<button type="button" class="vy-onglet${on ? ' on' : ''}" role="tab" aria-selected="${on}" data-act="fdcOnglet" data-page="${k}">${l}</button>`;
    const premier = donjon ? 'donjon' : 'resume';
    const ruban = `<div class="vy-fdc__ruban" role="status"><span>${gagne ? ICO.trophee : ICO.defaite}<b class="vy-fdc__issue">${gagne ? 'Victoire' : 'Défaite'}</b></span></div>`;
    const html = `<div class="vy-fdc ${gagne ? 'gagne' : 'perdu'}">
      <div class="vy-fdc__haut"><nav class="vy-onglets vy-fdc__onglets" role="tablist">${donjon ? onglet('donjon', 'Donjon', true) : ''}${onglet('resume', 'Résumé', premier === 'resume')}${onglet('perso', 'Personnage', false)}${onglet('stats', 'Statistiques', false)}</nav>${meta}</div>
      ${dungeon}
      ${donjon ? `<section class="vy-fdc__page" data-page="donjon">${donjon}</section>` : ''}
      <section class="vy-fdc__page" data-page="resume"${premier === 'resume' ? '' : ' hidden'}>${ruban}${this.fdcResume(r, moi, adverses)}</section>
      <section class="vy-fdc__page" data-page="perso" hidden>${ruban.replace(' role="status"', '')}${this.fdcPersonnage(r, moi, adverses, puces)}</section>
      <section class="vy-fdc__page" data-page="stats" hidden>${this.fdcStats(bilan)}</section>
      <footer class="vy-fdc__pied"><button data-act="cont" class="primary vy-bouton vy-bouton--primaire">Fermer</button></footer>
    </div>`;
    this.actions.cont = () => this.closePanel();
    this.actions.fdcOnglet = d => {
      for (const b of this.el.panelBody.querySelectorAll('.vy-fdc__onglets .vy-onglet')) { const on = b.dataset.page === d.page; b.classList.toggle('on', on); b.setAttribute('aria-selected', String(on)); }
      for (const sct of this.el.panelBody.querySelectorAll('.vy-fdc__page')) sct.hidden = sct.dataset.page !== d.page;
      this.bulleObjet(null);
      this.fdcDessiner();
    };
    this.actions.fdcPlier = d => { const bloc = this.el.panelBody.querySelector(`.vy-fdc__bloc[data-bloc="${d.bloc}"]`); if (!bloc) return; const plie = bloc.classList.toggle('plie'); const b = bloc.querySelector('.vy-fdc__plier'); if (b) { b.innerHTML = plie ? ICO.deplie : ICO.plie; b.setAttribute('aria-expanded', String(!plie)); } };
    this.openPanel('fightEnd', 'Combat terminé', html);
    this.fdcBrancherBulles();
    this.fdcDessiner();
    if (gagne && this.majeuresDe) { const l = this.majeuresDe(r); if (l.length) this.recompenseMajeure(l); }
  },

  fdcCase(d, petit) {
    const def = Items.get(d.id);
    if (!def) return '';
    return `<span class="vy-case vy-fdc__objet${petit ? ' petit' : ''}" data-rarete="${Items.rarity(def)}" data-objet="${esc(d.id)}" data-n="${d.count || 1}" tabindex="0" aria-label="${esc(def.name)}${d.count > 1 ? ' ×' + d.count : ''}"><span class="vy-case__icone">${Hud.picto(def)}</span>${d.count > 1 ? `<span class="vy-case__nombre">${d.count}</span>` : ''}</span>`;
  },

  fdcBete(b, W, H) {
    const img = b.id && DATA.monsters[b.id] && this.portraitBete ? this.portraitBete(b.id, W, H) : '';
    return img ? `<img src="${img}" alt="" draggable="false">` : `<span class="vy-fdc__initiale">${esc((b.nom || '?')[0])}</span>`;
  },

  fdcPersonnage(r, moi, adverses, puces) {
    const ch = this.world.ch, gagne = !!r.victory;
    const chiffres = CHIFFRES.map(([k, l]) => `<li class="vy-fdc__chiffre ${k}"><span class="vy-fdc__ico">${ICONE[k]}</span><span>${l}</span><b>${nf(moi[k] || 0)}</b></li>`).join('');
    const valeur = r.drops.reduce((t, d) => { const def = Items.get(d.id); return t + (def ? Items.sellPrice(def) * (d.count || 1) : 0); }, 0);
    const butin = r.drops.map(d => this.fdcCase(d)).join('');
    const ennemis = adverses.map(b => `<span class="vy-fdc__bete${b.vivant ? '' : ' mort'}" title="${esc(b.nom)}${b.niveau ? ', niveau ' + b.niveau : ''}">${this.fdcBete(b, 64, 72)}</span>`).join('');
    const max = ch.level >= Character.MAX_LEVEL, pct = max ? 100 : Math.floor(ch.xpProgress() * 100);
    return `<div class="vy-fdc__perso">
        <ul class="vy-fdc__chiffres">${chiffres}</ul>
        <figure class="vy-fdc__heros"><canvas class="vy-fdc__toile" aria-hidden="true"></canvas><figcaption>${esc(ch.name)}${ch.title ? `<small>« ${esc(ch.title)} »</small>` : ''}</figcaption></figure>
        <div class="vy-fdc__gains">
          <div class="vy-fdc__carte dragmes"><span>Dragmes</span><b>${nf(gagne ? r.fils : 0)} ${DRAGME}</b></div>
          <div class="vy-fdc__carte butin"><span>Butin</span>${butin ? `<div class="vy-fdc__butin">${butin}</div><small class="vy-fdc__valeur">Valeur estimée : ${nf(valeur)} ${DRAGME}</small>` : `<p class="vy-fdc__rien">${gagne ? 'Aucun butin cette fois.' : 'Pas de butin après une défaite.'}</p>`}</div>
          <div class="vy-fdc__carte ennemis"><span>Ennemis</span><div class="vy-fdc__betes">${ennemis || '<p class="vy-fdc__rien">-</p>'}</div></div>
        </div>
      </div>
      <div class="vy-fdc__xp${r.levels ? ' monte' : ''}">
        <b>${ch.level}</b><span class="vy-fdc__jauge" role="img" aria-label="${pct} % du niveau ${ch.level}"><i style="width:${pct}%"></i></span><b>${max ? 'max' : ch.level + 1}</b>
        <em>${gagne ? `+${nf(r.gained)} XP${r.levels ? ` · niveau ${ch.level} !` : ''}` : 'Tu reviens au Relais de l\'Aube avec la moitié de tes PV.'}</em>
      </div>
      ${puces.length ? `<div class="vy-fdc__puces">${puces.join('')}</div>` : ''}`;
  },

  fdcResume(r, moi, adverses) {
    const ch = this.world.ch, gagne = !!r.victory;
    const pct = ch.level >= Character.MAX_LEVEL ? 100 : Math.floor(ch.xpProgress() * 100);
    const ligne = `<div class="vy-fdc__rang moi" role="row">
        <span role="cell" class="vy-fdc__qui"><canvas class="vy-fdc__buste" aria-hidden="true"></canvas><b>${esc(ch.name)}</b></span>
        <span role="cell" class="vy-fdc__niv">${ch.level}<span class="vy-fdc__jauge"><i style="width:${pct}%"></i></span></span>
        <span role="cell" class="vy-fdc__nb">${gagne ? `${nf(r.gained)} XP` : '-'}</span>
        <span role="cell" class="vy-fdc__nb">${gagne ? `${nf(r.fils)} ${DRAGME}` : '-'}</span>
        <span role="cell" class="vy-fdc__cases">${gagne ? r.drops.map(d => this.fdcCase(d, true)).join('') : ''}</span>
      </div>`;
    const table = `<div class="vy-fdc__table" role="table" aria-label="${gagne ? 'Gagnants' : 'Perdants'}"><div class="vy-fdc__rang entete" role="row"><span role="columnheader">Nom</span><span role="columnheader">Niveau</span><span role="columnheader">Expérience gagnée</span><span role="columnheader">Dragmes</span><span role="columnheader">Butin</span></div>${ligne}</div>`;
    const pastilles = `<div class="vy-fdc__pastilles">${adverses.map(b => `<span class="vy-fdc__pastille${b.vivant ? '' : ' mort'}">${this.fdcBete(b, 40, 44)}<b>${esc(b.nom)}</b>${b.niveau ? `<small>Niv. ${b.niveau}</small>` : ''}</span>`).join('')}</div>`;
    const bloc = (k, titre, corps) => `<div class="vy-fdc__bloc" data-bloc="${k}"><header><span>${ICO.trophee}${titre}</span><button type="button" class="vy-fdc__plier" data-act="fdcPlier" data-bloc="${k}" aria-expanded="true" aria-label="Replier ${titre.toLowerCase()}">${ICO.plie}</button></header><div class="vy-fdc__bloc-corps">${corps}</div></div>`;
    const quetes = r.quests.filter((t, i, arr) => arr.findIndex(x => x.quest === t.quest) === i).map(t => `<li>${esc(t.quest.name)} : ${t.finished ? 'terminée, à rendre à ' + esc(Quests.npcName(Quests.turnInOf(t.quest))) : esc(Quests.stepText(ch, t.quest.id))}</li>`).join('');
    const succes = r.achievements.map(a => `<li>${esc(a.achievement.name)}${a.title ? ' · titre « ' + esc(a.title) + ' »' : ''}</li>`).join('') + (r.cosmetiques || []).map(e => `<li>${esc(World.texteCosmetique(e))}</li>`).join('');
    const avis = (r.avis || []).map(a => `<li>${esc(a.nom)} capturé : la prime t'attend à la tour de la Garde, sur la Place du Relais.</li>`).join('');
    const nouvelles = (quetes ? `<h4>Quêtes</h4><ul>${quetes}</ul>` : '') + (succes ? `<h4>Succès</h4><ul>${succes}</ul>` : '') + (avis ? `<h4>Avis de recherche</h4><ul>${avis}</ul>` : '');
    return (gagne ? bloc('gagnants', 'Gagnants', table) + bloc('perdants', 'Perdants', pastilles) : bloc('gagnants', 'Gagnants', pastilles) + bloc('perdants', 'Perdants', table)) +
      (nouvelles ? `<div class="vy-fdc__nouvelles">${nouvelles}</div>` : '');
  },

  fdcStats(bilan) {
    if (!bilan.length) return '<p class="vy-fdc__rien">Pas de statistiques pour ce combat.</p>';
    const tri = bilan.slice().sort((a, b) => (b.moi - a.moi) || ((a.equipe === 'player' ? 0 : 1) - (b.equipe === 'player' ? 0 : 1)) || ((b.degats || 0) - (a.degats || 0)));
    const moi = bilan.find(b => b.moi) || {};
    return `<div class="vy-fdc__stats"><div class="vy-fdc__stats-tete"><span>Statistique</span><canvas class="vy-fdc__buste" aria-hidden="true"></canvas></div>` + STATS.map(([k, l]) => {
      const max = Math.max(1, ...bilan.map(b => b[k] || 0)), v = moi[k] || 0;
      const barres = tri.map(b => `<div class="vy-fdc__barre ${b.equipe === 'player' ? 'allie' : 'adverse'}${b.moi ? ' moi' : ''}"><span>${esc(b.nom)}${b.niveau ? `<small>niv. ${b.niveau}</small>` : ''}</span><span class="vy-fdc__barre-fond"><i style="width:${Math.round(100 * (b[k] || 0) / max)}%"></i></span><b>${nf(b[k] || 0)}</b></div>`).join('');
      return `<details class="vy-fdc__stat ${k}"><summary><span class="vy-fdc__ico">${ICONE[k]}</span><span class="vy-fdc__stat-nom">${l}</span><b class="vy-fdc__boite${v ? '' : ' vide'}">${v ? nf(v) : '---'}</b><span class="vy-fdc__chevron">${ICO.chevron}</span></summary><div class="vy-fdc__barres">${barres}</div></details>`;
    }).join('') + '</div>';
  },

  fdcDessiner() {
    const ch = this.world.ch, body = this.el.panelBody;
    if (typeof AccueilArt !== 'object' || !body) return;
    const ap = ch.lookAffiche ? ch.lookAffiche() : { look: ch.look };
    const fig = AccueilArt.figure(ch.classId, { look: ap.look, gender: ch.gender, auraCos: ap.auraCos });
    const grand = body.querySelector('.vy-fdc__toile');
    try {
      if (grand && grand.getBoundingClientRect().width > 0) AccueilArt.tournant(grand, fig, { part: 0.66, calme: true, redessiner: () => this.fdcDessiner() });
      for (const cv of body.querySelectorAll('.vy-fdc__buste')) if (cv.getBoundingClientRect().width > 0) AccueilArt.buste(cv, fig);
    } catch (e) {   }
  },

  fdcBrancherBulles() {
    const body = this.el.panelBody;
    if (body.dataset.bulles) return;
    body.dataset.bulles = '1';
    const cible = e => e.target.closest && e.target.closest('[data-objet]');
    body.addEventListener('pointerover', e => { if (e.pointerType !== 'mouse') return; const c = cible(e); if (c) this.bulleObjet(c); });
    body.addEventListener('pointerout', e => { if (e.pointerType !== 'mouse') return; const c = cible(e); if (c && !c.contains(e.relatedTarget)) this.bulleObjet(null); });
    body.addEventListener('focusin', e => { const c = cible(e); if (c) this.bulleObjet(c); });
    body.addEventListener('focusout', e => { if (cible(e)) this.bulleObjet(null); });
    body.addEventListener('pointerdown', e => { this.pointeurBulle = e.pointerType; const c = cible(e), bulle = document.getElementById('vy-bulle-objet'); this.bulleAvant = !!(c && bulle && !bulle.hidden && this.bulleSur === c); }, { passive: true });
    body.addEventListener('click', e => {
      const c = cible(e);
      if (c && this.pointeurBulle !== 'mouse') this.bulleObjet(this.bulleAvant ? null : c);
      else if (!c && this.bulleSur) this.bulleObjet(null);
    });
    body.addEventListener('scroll', () => { const c = this.bulleSur; if (!c) return; const r = c.getBoundingClientRect(), b = body.getBoundingClientRect(); this.bulleObjet(r.bottom < b.top || r.top > b.bottom ? null : c); }, { passive: true });
  },

  bulleObjet(cell) {
    let b = document.getElementById('vy-bulle-objet');
    this.bulleSur = cell || null;
    if (!cell) { if (b) b.hidden = true; return; }
    const d = Items.get(cell.dataset.objet), n = Math.max(1, Number(cell.dataset.n) || 1);
    if (!d) return;
    if (!b) { b = document.createElement('div'); b.id = 'vy-bulle-objet'; b.className = 'vy-bulle-objet'; b.setAttribute('role', 'tooltip'); document.getElementById('app').appendChild(b); }
    const r = Items.rarity(d), poids = Items.poids(d), prix = Items.sellPrice(d);
    const sorte = Hud.typeObjet ? Hud.typeObjet(d) : 'Objet';
    b.dataset.rarete = r;
    b.innerHTML = `<header class="vy-bulle-objet__tete"><span class="vy-bulle-objet__image vy-case" data-rarete="${r}"><span class="vy-case__icone">${Hud.picto(d)}</span></span>
        <div><b>${esc(d.name)}</b><small>Niveau ${d.level || 1} <i>◆</i> ${esc(sorte)}</small><em data-rarete="${r}">${esc(Items.RARITY_LABEL[r] || '')}</em></div></header>
      <div class="vy-bulle-objet__corps">
        <p><small>Poids</small> ${poids} ${ICO.pods}${n > 1 ? ` <span class="vy-bulle-objet__lot">· lot ${poids * n} ${ICO.pods}</span>` : ''}</p>
        <p><small>Prix de revente</small> ${nf(prix)} ${DRAGME}${n > 1 ? ` <span class="vy-bulle-objet__lot">· lot ${nf(prix * n)} ${DRAGME}</span>` : ''}</p>
        ${d.lore ? `<hr><p class="vy-bulle-objet__legende">${esc(d.lore)}</p>` : ''}
      </div>`;
    b.hidden = false;
    const c = cell.getBoundingClientRect(), w = b.offsetWidth, h = b.offsetHeight, vw = window.innerWidth, vh = window.innerHeight;
    const y = c.bottom + 8 + h <= vh - 6 ? c.bottom + 8 : Math.max(6, c.top - h - 8);
    b.style.left = Math.max(6, Math.min(vw - w - 6, c.left + c.width / 2 - w / 2)) + 'px';
    b.style.top = y + 'px';
  },

  finEntrainementDojo(e) {
    this.actions.cont = () => this.closePanel();
    const tuile = (k, v) => `<li class="vy-fdc__chiffre"><span>${k}</span><b>${v}</b></li>`;
    this.openPanel('fightEnd', 'Entraînement au Dojo', `<div class="vy-fdc dojo"><div class="vy-fdc__ruban" aria-hidden="true"><span>${ICO.trophee}<b class="vy-fdc__issue">Entraînement terminé</b></span></div>
      <ul class="vy-fdc__chiffres seul">${tuile('Dégâts infligés', nf(e.degats))}${tuile('Tours', e.tours)}${tuile('Moyenne par tour', nf(Math.round(e.degats / Math.max(1, e.tours))))}${tuile('Mannequins abattus', `${e.abattus} sur ${e.total}`)}</ul>
      <p class="vy-fdc__suite">Au Dojo, ni gain ni perte : tes PV sont ceux d'avant le combat.</p>
      <footer class="vy-fdc__pied"><button data-act="cont" class="primary vy-bouton vy-bouton--primaire">Fermer</button></footer></div>`);
  },

  ficheFinDonjon(dj) {
    const ch = this.world.ch, dd = dj.def;
    const salle = (dd.rooms || []).filter(x => x.boss).pop() || (dd.rooms || [])[dd.rooms.length - 1] || {};
    const bossId = ((salle.monsters || []).find(m => DATA.monsters[m.id] && DATA.monsters[m.id].boss) || (salle.monsters || [])[0] || {}).id;
    const boss = bossId && DATA.monsters[bossId];
    const lv = ((salle.monsters || []).find(m => m.id === bossId) || {}).level;
    const img = boss && this.portraitBete ? this.portraitBete(bossId, 150, 164) : '';
    const lies = typeof Achievements === 'object' ? Achievements.defs().filter(a => Achievements.pourPerso(ch, a) && a.cond && (a.cond.dungeon === dd.id || (bossId && a.cond.monster === bossId && /boss|noeudsBoss|bossDefi/.test(a.cond.type)))) : [];
    const succes = lies.map(a => { const ok = (ch.achievements || []).includes(a.id);
      return `<li class="${ok ? 'ok' : ''}"><span class="vy-fdd__coche" aria-hidden="true">${ok ? '✓' : ''}</span><span>${esc(a.name)}</span><small>${esc(a.desc || '')}</small></li>`; }).join('');
    return `<div class="vy-fdd">
      <div class="vy-fdd__boss">${img ? `<img src="${img}" alt="" draggable="false">` : ''}<div><small>${esc(dd.name)}</small><h3>${boss ? esc(boss.name) : 'Donjon terminé'}</h3>${lv ? `<span class="vy-fdd__niv">niv. ${lv}</span>` : ''}</div></div>
      ${succes ? `<h4>Succès du donjon</h4><ul class="vy-fdd__succes">${succes}</ul>` : ''}
      ${boss && boss.desc ? `<h4>Stratégie</h4><p class="vy-fdd__strat">${esc(boss.desc)}</p>` : ''}
      <label class="vy-coche vy-fdd__couper"><input type="checkbox" id="opt-combat-finDonjon" checked> Montrer cette fiche à la fin d'un donjon</label>
    </div>`;
  },
});
})();
