(() => {
const I = Fenetres.ICON;
const esc = s => Util.esc(s);
const svg = p => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${p}</svg>`;
const ICO = {
  debut: svg('<path d="M6.5 5v14M18 5.5 9.5 12l8.5 6.5z"/>'),
  fin: svg('<path d="M17.5 5v14M6 5.5l8.5 6.5L6 18.5z"/>'),
  resume: svg('<path d="M5 6h14M5 10h14M5 14h14M5 18h14"/>'),
  details: svg('<rect x="4" y="4" width="16" height="16" rx="2"/><path d="M4 9.5h16M4 15h16M10 4v16"/>'),
  elements: svg('<path d="M5 19V11M10 19V6M15 19v-9M20 19V9"/>'),
  info: svg('<circle cx="12" cy="12" r="8.5"/><path d="M12 11v5.5M12 7.8v.4"/>'),
};
const nf = n => Number(n).toLocaleString('fr-FR');
const pts = n => `${n} point${Math.abs(n) > 1 ? 's' : ''}`;
const ONGLETS = [['resume', 'Résumé'], ['details', 'Détails'], ['elements', 'Éléments']];
const ELEMENTS = ['neutre', 'terre', 'feu', 'eau', 'air'];
const STAT_ELEMENT = { neutre: 'force', terre: 'force', feu: 'intel', eau: 'chance', air: 'agi' };

Object.assign(Hud.prototype, {
  openCaracs() {
    const s = this.carac = this.carac || { onglet: 'resume', feuille: null };
    const ouvert = this.fen.isOpen('carac');
    if (!ouvert) s.feuille = null;
    const ch = () => this.world.ch;
    const r = () => this.fen.render('carac');
    const borne = v => { const b = this.caracBornes(s.feuille.stat); return Math.max(b.min, Math.min(b.max, v)); };
    const actions = {
      onglet: d => { s.onglet = d.onglet; r(); },
      plus: d => {
        if (!Items.STATS.includes(d.stat)) return;
        s.feuille = { stat: d.stat, v: Math.min(1, this.caracBornes(d.stat).max) };
        r();
        const w = this.fen.wins.get('carac'), b = w && w.body.querySelector('.vy-caracs-feuille [data-act="pas"][data-n="1"]');
        if (b && !b.disabled) b.focus({ preventScroll: true });
      },
      pas: d => { if (s.feuille) { s.feuille.v = borne(s.feuille.v + Number(d.n)); r(); } },
      saut: d => {
        const f = s.feuille;
        if (!f) return;
        const b = this.caracBornes(f.stat);
        f.v = Number(d.sens) < 0 ? (f.v > 0 ? 0 : b.min) : (f.v < 0 ? 0 : b.max);
        r();
      },
      repartir: () => actions.plus({ stat: Items.STATS.includes(ch().mainStat) && Character.ALLOUABLES.includes(ch().mainStat) ? ch().mainStat : Character.ALLOUABLES[0] }),
      valider: () => this.caracValider(),
      sceaux: () => this.ouvrirSceaux(),
      fermerFeuille: () => { s.feuille = null; r(); },
      autonow: () => { const c = ch(), avant = Object.assign({}, c.stats); c.autoAllocate(); this.caracSignaler(avant); this.world.emit('update'); this.world.emit('save'); },
      reset: (d, b) => {
        const c = ch(), prix = this.prixReinit(c);
        if (prix > c.fils) { this.toast(`Réinitialiser coûte ${nf(prix)} Dragmes au niveau ${c.level} ; tu en as ${nf(c.fils)}.`); return; }
        if (!b.dataset.sure) { b.dataset.sure = '1'; b.textContent = prix ? `Confirmer (${nf(prix)} Dragmes)` : 'Confirmer'; return; }
        c.fils -= prix;
        c.resetStats(); this.world.emit('update'); this.world.emit('save');
        if (prix) this.toast(`Caractéristiques et Sceaux rendus, contre ${nf(prix)} Dragmes.`);
      },
    };
    const onField = (el, kind) => {
      if (el.id === 'carac-auto') ch().autoStats = el.checked;
      if (el.id === 'carac-valeur' && s.feuille) {
        const v = parseInt(el.value, 10);
        if (Number.isFinite(v) && (kind === 'change' || borne(v) !== s.feuille.v)) { s.feuille.v = borne(v); r(); }
      }
    };
    this.simpleWin('carac', 'Caractéristiques', () => this.renderCaracs(), actions, {
      width: 520, cls: 'vy-fenetre--caracs', onField, annonce: 'caracteristiques', after: body => this.caracBuste(body),
      onEscape: () => { if (!s.feuille) return false; s.feuille = null; r(); return true; },
    });
  },

  caracBornes(stat) {
    const ch = this.world.ch;
    let n = 0, v = ch.stats[stat], reste = ch.statPoints;
    for (;;) { const c = Character.pointCost(stat, v); if (reste < c) break; reste -= c; v++; n++; }
    let min = 0;
    if (typeof Sceaux !== 'undefined' && ch.level <= Sceaux.D.regles.reinitGratuiteJusqua) {
      const voie = Object.keys(Character.STAT_OF).find(x => Character.STAT_OF[x] === stat);
      const poses = Sceaux.sceauxPoses(ch.sceauxEtat(), voie);
      min = -Math.max(0, ch.stats[stat] - poses * Sceaux.D.regles.pointsParSceau);
    }
    return { min, max: n };
  },
  prixReinit(ch) { return typeof Sceaux !== 'undefined' ? Sceaux.prixReinit(ch.level) : 0; },

  caracCout(stat, v) {
    const base = this.world.ch.stats[stat];
    let c = 0;
    if (v > 0) for (let i = 0; i < v; i++) c += Character.pointCost(stat, base + i);
    else for (let i = 1; i <= -v; i++) c -= Character.pointCost(stat, base - i);
    return c;
  },

  caracValider() {
    const s = this.carac, f = s.feuille, ch = this.world.ch;
    if (!f) return 0;
    const avant = Object.assign({}, ch.stats);
    if (f.v > 0) ch.allocate(f.stat, f.v);
    else if (f.v < 0) ch.deallocate(f.stat, -f.v);
    s.feuille = null;
    const gain = this.caracSignaler(avant);
    if (gain) { this.world.emit('update'); this.world.emit('save'); } else this.fen.render('carac');
    return gain;
  },

  caracSignaler(avant) {
    const ch = this.world.ch;
    let total = 0;
    for (const k of Character.ALLOUABLES) {
      const points = ch.stats[k] - (avant[k] || 0);
      if (!points) continue;
      total += points;
      let cost = 0;
      for (let v = Math.min(avant[k], ch.stats[k]); v < Math.max(avant[k], ch.stats[k]); v++) cost += Character.pointCost(k, v);
      this.signal('statsAllocated', { stat: k, points, cost: points > 0 ? cost : -cost });
      this.chat('systeme', `Caractéristiques enregistrées : ${points > 0 ? '+' : ''}${points} ${Items.STAT_LABEL[k]}.`);
    }
    return total;
  },

  renderCaracs() {
    if (document.getElementById('app').classList.contains('vy-eter')) return this.renderCaracsE14();
    const ch = this.world.ch, d = ch.derived(), cls = ch.classDef, s = this.carac;
    const max = ch.level >= Character.MAX_LEVEL, next = Character.xpToNext(ch.level);
    const vues = ONGLETS.map(([k, l]) => `<button class="vy-onglet vy-c3__vue${s.onglet === k ? ' on' : ''}" data-act="onglet" data-onglet="${k}" role="tab" aria-selected="${s.onglet === k}" title="${l}">${ICO[k]}<span class="vy-visuel">${l}</span></button>`).join('');
    const corps = s.onglet === 'details' ? this.caracDetails(ch, d) : s.onglet === 'elements' ? this.caracElements(ch, d, cls) : this.caracResume(ch, d);
    const prix = this.prixReinit(ch);
    return `<div class="vy-caracs" style="--c:${cls.color}">
      <header class="vy-c3__tete"><canvas class="vy-c3__buste" aria-hidden="true"></canvas>
        <div class="vy-c3__qui"><b class="vy-c3__nom-perso">${esc(ch.name)}</b><small>Niveau <b>${ch.level}</b><i aria-hidden="true"></i>${esc(cls.name)}</small>${ch.title ? `<em>« ${esc(ch.title)} »</em>` : ''}
          <div class="vy-c3__xp" title="Expérience"><span>Expérience</span><small>${max ? 'niveau maximum' : `${nf(ch.xp)} / ${nf(next)}`}</small>${Util.jauge('xp', max ? 1 : ch.xp, max ? 1 : next, null, 'Expérience', 'vy-jauge--fine')}</div></div>
        <div class="vy-c3__droite"><nav class="vy-onglets vy-caracs__onglets" role="tablist" aria-label="Vues des caractéristiques">${vues}</nav>${this.boutonSceaux(ch)}</div></header>
      <div class="vy-c3__cadre">
        ${this.caracRail(ch, d)}
        <div class="vy-caracs__corps" data-defile="caracs-${s.onglet}" role="tabpanel">${corps}</div>
      </div>
      <footer class="vy-caracs__pied">
        <div class="vy-c3__pied-haut">
          <button class="vy-bouton vy-bouton--primaire vy-bouton--petit vy-c3__repartir" data-act="repartir"${ch.statPoints ? '' : ' disabled'}>Répartir mes points</button>
          <span class="vy-c3__restants" title="Points de caractéristique à répartir : 5 par niveau">Points restants <b class="vy-points${ch.statPoints ? ' on' : ''}">${ch.statPoints}</b><span class="vy-c3__aide" title="Chaque niveau donne 5 points. Terra, Ignis, Aqua et Aer coûtent 1 point jusqu'à 100, 2 jusqu'à 200, 3 jusqu'à 300, 4 au-delà. Chaque dizaine donne un Sceau de sa voie.">${ICO.info}</span></span>
        </div>
        <div class="vy-c3__pied-bas">
          <label class="vy-coche"><input type="checkbox" id="carac-auto" ${ch.autoStats ? 'checked' : ''}> Auto (${Items.STAT_LABEL[ch.mainStat]})</label>
          <span class="vy-caracs__pied-boutons">${ch.statPoints ? `<button class="vy-bouton vy-bouton--petit vy-bouton--fantome" data-act="autonow" title="Tout poser en ${Items.STAT_LABEL[ch.mainStat]}, la caractéristique de ta classe">Tout en ${Items.STAT_LABEL[ch.mainStat]}</button>` : ''}
          <button class="vy-bouton vy-bouton--petit vy-bouton--fantome" data-act="reset" title="Rend tous les points et tous les Sceaux : ${prix ? `${nf(prix)} Dragmes au niveau ${ch.level}` : `gratuit jusqu'au niveau ${typeof Sceaux !== 'undefined' ? Sceaux.D.regles.reinitGratuiteJusqua : 10}`}">Réinitialiser</button></span></div>
      </footer>
    </div>${s.feuille ? this.caracFeuille(ch, d) : ''}`;
  },

  caracRail(ch, d) {
    const bonus = this.caracBonus(ch, d);
    const pv = `<div class="vy-c3__gemme pv" title="Points de vie : ${ch.hp} sur ${d.hpMax}">${Hud.pic('pv', 24)}<b>${ch.hp}</b><small>/ ${d.hpMax}</small><span class="vy-visuel">Points de vie</span></div>`;
    const caracs = Character.ALLOUABLES.map(k => {
      const base = ch.stats[k], total = d.stats[k] || 0, cost = Character.pointCost(k, base), b = this.caracBornes(k);
      const label = Items.STAT_LABEL[k], detail = bonus.texte(k);
      const titre = `${label} : ${total}${detail ? ` (${base} de base, ${detail})` : ''}. Prochain point : ${pts(cost)}.`;
      return `<div class="vy-c3__gemme" data-k="${k}" title="${titre}">${Hud.pic(k, 24)}<b>${total}</b><span class="vy-c3__nom">${label}<small>coût ${cost}</small></span>` +
        `<button class="vy-caracs__plus" data-act="plus" data-stat="${k}" ${b.max > 0 || base > 0 ? '' : 'disabled'} aria-label="Répartir en ${label}" title="Répartir en ${label}">${I.plus}</button></div>`;
    }).join('');
    const sag = `<div class="vy-c3__gemme sagesse" title="Sagesse : ${d.stats.sagesse || 0} (+${d.stats.sagesse || 0} % d'expérience). Elle vient de l'équipement et des parchemins.">${Hud.pic('sagesse', 24)}<b>${d.stats.sagesse || 0}</b><span class="vy-c3__nom">Sagesse</span></div>`;
    return `<aside class="vy-c3__rail" aria-label="Points de vie et caractéristiques">${pv}${caracs}${sag}</aside>`;
  },

  caracBuste(body) {
    const ch = this.world.ch;
    if (typeof AccueilArt !== 'object') return;
    const ap = ch.lookAffiche ? ch.lookAffiche() : { look: ch.look };
    const fig = AccueilArt.figure(ch.classId, { look: ap.look, gender: ch.gender, auraCos: ap.auraCos, lueur: ap.lueur });
    const cv = body.querySelector('.vy-c3__buste'), pied = body.querySelector('.vy-e14__portrait');
    try { if (cv) AccueilArt.buste(cv, fig); if (pied) AccueilArt.tournant(pied, fig, { part: 0.82, calme: true, redessiner: () => this.caracBuste(body) }); } catch (e) {   }
  },

  renderCaracsE14() {
    const ch = this.world.ch, d = ch.derived(), cls = ch.classDef, s = this.carac;
    const max = ch.level >= Character.MAX_LEVEL, next = Character.xpToNext(ch.level);
    const onglets = ONGLETS.map(([k, l]) => `<button class="vy-onglet${s.onglet === k ? ' on' : ''}" data-act="onglet" data-onglet="${k}" role="tab" aria-selected="${s.onglet === k}">${l}</button>`).join('');
    const corps = s.onglet === 'details' ? this.caracDetails(ch, d) : s.onglet === 'elements' ? this.caracElements(ch, d, cls) : this.caracResumeE14(ch, d);
    const score = typeof Achievements === 'object' && Achievements.score ? Achievements.score(ch) : 0;
    const pods = typeof ch.pods === 'function' ? ch.pods() : 0;
    const barre = (cls2, titre, v, m, texte) => `<div class="vy-e14__barre ${cls2}"><span>${titre}</span><i><b style="width:${Math.max(0, Math.min(100, 100 * v / Math.max(1, m))).toFixed(1)}%"></b></i><small>${texte}</small></div>`;
    const prix = this.prixReinit(ch);
    return `<div class="vy-caracs vy-e14" style="--c:${cls.color}">
      <nav class="vy-onglets vy-caracs__onglets" role="tablist" aria-label="Caractéristiques">${onglets}</nav>
      <header class="vy-e14__banniere">
        <canvas class="vy-e14__portrait" aria-hidden="true"></canvas>
        <div class="vy-e14__gauche"><span class="vy-e14__niv">Niv. <b>${ch.level}</b></span><span class="vy-e14__pastille" title="Points de succès">${Hud.pic('crit', 14)}${nf(score)} pts</span><span class="vy-e14__pastille" title="Classe">${esc(cls.name)}</span></div>
        <div class="vy-e14__droite">${this.boutonSceaux(ch)}</div>
        <div class="vy-e14__qui"><b>${esc(ch.name)}</b>${ch.title ? `<em>${esc(ch.title)}</em>` : ''}</div>
      </header>
      <div class="vy-e14__barres">${barre('xp', 'Expérience', max ? 1 : ch.xp, max ? 1 : next, max ? 'niveau maximum' : `${nf(ch.xp)} / ${nf(next)}`)}${barre('pods', 'Pods', pods, d.podsMax, `${nf(pods)} / ${nf(d.podsMax)}`)}</div>
      <div class="vy-e14__vitaux">
        <div title="Points de vie : ${ch.hp} sur ${d.hpMax}">${Hud.pic('pv', 24)}<b>${ch.hp}</b><small>Points de vie</small></div>
        <div title="Points d'action">${Hud.pic('pa', 24)}<b>${d.pa}</b><small>PA</small></div>
        <div title="Points de mouvement">${Hud.pic('pm', 24)}<b>${d.pm}</b><small>PM</small></div>
        <div title="Initiative : Terra, Ignis, Aqua et Aer ; en combat, elle baisse avec les PV perdus">${Hud.pic('init', 24)}<b>${d.initiative}</b><small>Initiative</small></div>
      </div>
      <div class="vy-caracs__corps" data-defile="caracs-${s.onglet}" role="tabpanel">${corps}</div>
      <footer class="vy-caracs__pied vy-e14__pied">
        <span class="vy-e14__points"><b class="${ch.statPoints ? 'on' : ''}">${ch.statPoints}</b> point(s) à répartir</span>
        <label class="vy-coche"><input type="checkbox" id="carac-auto" ${ch.autoStats ? 'checked' : ''}> Auto</label>
        <span class="vy-caracs__pied-boutons"><button class="vy-bouton vy-bouton--petit vy-bouton--fantome" data-act="reset" title="Rend tous les points et tous les Sceaux : ${prix ? `${nf(prix)} Dragmes au niveau ${ch.level}` : `gratuit jusqu'au niveau ${typeof Sceaux !== 'undefined' ? Sceaux.D.regles.reinitGratuiteJusqua : 10}`}">Réinitialiser</button>
        <button class="vy-bouton vy-bouton--primaire vy-e14__repartir" data-act="${ch.statPoints ? 'autonow' : 'repartir'}" ${ch.statPoints ? '' : 'disabled'} title="Tout poser en ${Items.STAT_LABEL[ch.mainStat]}, la caractéristique de ta classe" aria-label="Répartir en ${Items.STAT_LABEL[ch.mainStat]}">${svg('<path d="M20 12a8 8 0 1 1-3-6.2"/><path d="M20 4v5h-5"/>')}</button></span>
      </footer>
    </div>${s.feuille ? this.caracFeuille(ch, d) : ''}`;
  },

  caracResumeE14(ch, d) {
    const bonus = this.caracBonus(ch, d);
    const ligne = (k, label, val, plus, titre) => `<div class="vy-e14__ligne" data-k="${k}"${titre ? ` title="${titre}"` : ''}>${Hud.pic(k, 20)}<span>${label}</span><b>${val}</b>${plus || '<i></i>'}</div>`;
    const primaires = Character.ALLOUABLES.map(k => {
      const base = ch.stats[k], total = d.stats[k] || 0, cost = Character.pointCost(k, base), b = this.caracBornes(k), label = Items.STAT_LABEL[k], detail = bonus.texte(k);
      return ligne(k, label, total, `<button class="vy-caracs__plus" data-act="plus" data-stat="${k}" ${b.max > 0 || base > 0 ? '' : 'disabled'} aria-label="Répartir en ${label}" title="Répartir en ${label} (coût ${cost})">${I.plus}</button>`, `${label} : ${total}${detail ? ` (${base} de base, ${detail})` : ''}. Prochain point : ${pts(cost)}.`);
    }).join('') + ligne('vita', 'Vitalité', d.stats.vita || 0, '', 'Vient de l\'équipement et des parchemins') + ligne('sagesse', 'Sagesse', d.stats.sagesse || 0, '', '+1 % d\'expérience par point ; de l\'équipement et des parchemins');
    const invoc = ch.classDef.summonGauge ? ['invoc', 'Jauge de meute', ch.classDef.summonGauge + (ch.classDef.jaugeNiveaux || []).filter(n => (ch.level || 1) >= n).length] : ['invoc', 'Invocations', DATA.rules.maxSummonsPerOwner + (d.invocations || 0)];
    const secondaires = [['pp', 'Prospection', d.prospection], invoc, ['crit', 'Critique', `${d.crit} %`], ['puissance', 'Puissance', d.puissance || 0], ['tacle', 'Tacle', d.tacle], ['fuite', 'Fuite', d.fuite]].map(([k, l, v]) => ligne(k, l, v, '')).join('');
    const tete = (t, vue) => `<div class="vy-e14__section"><span>${t}</span>${vue ? `<span class="vy-e14__vues"><button type="button" class="on" aria-pressed="true" title="En liste" aria-label="En liste">${svg('<path d="M8 6h12M8 12h12M8 18h12M4 6h.01M4 12h.01M4 18h.01"/>')}</button><button type="button" data-act="onglet" data-onglet="elements" aria-pressed="false" title="En diagramme (Éléments)" aria-label="En diagramme">${svg('<path d="M12 3l8.5 6.2-3.2 10H6.7L3.5 9.2z"/>')}</button></span>` : ''}</div>`;
    return `${tete('Caractéristiques primaires', true)}<div class="vy-e14__liste primaires">${primaires}</div>${tete('Secondaires')}<div class="vy-e14__liste">${secondaires}</div>`;
  },

  caracBonus(ch, d) {
    const equip = {}, sets = {};
    for (const slot of Items.EQUIP_SLOTS) { const it = ch.equipment[slot] && Items.get(ch.equipment[slot]); if (it) for (const k in it.stats) equip[k] = (equip[k] || 0) + it.stats[k]; }
    for (const b of d.setBonuses) for (const k in b.stats) sets[k] = (sets[k] || 0) + b.stats[k];
    const texte = k => [(ch.scrolls || {})[k] ? `${ch.scrolls[k]} de parchemins` : '', equip[k] ? `${equip[k]} d'équipement` : '', sets[k] ? `${sets[k]} de panoplies` : ''].filter(Boolean).join(', ');
    return { equip, sets, texte };
  },


  caracResume(ch, d) {
    const ligne = (k, label, val, titre) => `<div class="vy-c3__ligne" data-k="${k}"${titre ? ` title="${titre}"` : ''}>${Hud.pic(k, 17)}<span>${label}</span><b class="${!val || val === '0 %' ? 'zero' : ''}">${val}</b></div>`;
    const bloc = (g, dr) => `<div class="vy-c3__bloc"><div>${g.join('')}</div><div>${dr.join('')}</div></div>`;
    const invoc = ch.classDef.summonGauge
      ? ligne('invoc', 'Jauge de meute', ch.classDef.summonGauge + (ch.classDef.jaugeNiveaux || []).filter(n => (ch.level || 1) >= n).length, 'Chaque bête coûte sa part de la jauge (Glym 1, Grouk 2, Molh 3) ; une grande bête de chaque espèce, les Glyms à plusieurs ; +1 au niveau 25 et au 50')
      : ligne('invoc', 'Invocations', DATA.rules.maxSummonsPerOwner + (d.invocations || 0), 'Invocations en jeu au plus');
    const pods = typeof ch.pods === 'function' ? ch.pods() : 0;
    const premiers = bloc([
      ligne('pa', 'PA', d.pa, 'Points d\'action'), ligne('pm', 'PM', d.pm, 'Points de mouvement'), invoc,
    ], [
      ligne('crit', 'Critique', `${d.crit} %`, 'S\'ajoute au taux de critique de chaque sort'), ligne('puissance', 'Puissance', d.puissance || 0, 'S\'ajoute aux dégâts de tous les éléments'), ligne('pp', 'Prospection', d.prospection, '100 + Aqua / 10 : les chances de butin en dépendent'),
    ]);
    const charge = `<div class="vy-c3__bloc un"><div>${ligne('pods', 'Pods', `${nf(pods)} / ${nf(d.podsMax)}`, '1 000, 5 par niveau et 5 par point de Terra')}</div></div>`;
    const combat = bloc([
      ligne('tacle', 'Tacle', d.tacle), ligne('retrait', 'Retrait PA', d.retraitPA), ligne('retrait', 'Retrait PM', d.retraitPM),
      ligne('init', 'Initiative', d.initiative, 'Terra, Ignis, Aqua et Aer ; en combat, elle baisse avec les PV perdus'), ligne('dmg', 'Dommages', d.dmgFlat || 0, 'Ajoutés à chaque coup'),
    ], [
      ligne('fuite', 'Fuite', d.fuite), ligne('esquive', 'Esquive PA', d.esquivePA), ligne('esquive', 'Esquive PM', d.esquivePM),
      ligne('soins', 'Soins', `${d.soins} %`, '+1 % par point d\'Ignis'), ligne('sagesse', 'Expérience', `+${d.stats.sagesse || 0} %`, '+1 % par point de Sagesse'),
    ]);
    const cell = v => `<td class="${v ? '' : 'zero'}">${v}</td>`;
    const lignesEl = ELEMENTS.map(el => {
      const E = DATA.elements[el], pct = (d.stats[STAT_ELEMENT[el]] || 0) + ((d.dmgPct || {})[el] || 0) + (d.puissance || 0), fixe = (d.dmgFixe || {})[el] || 0, res = (d.resist || {})[el] || 0;
      return `<tr><th scope="row"><span class="vy-pastille" style="--c:${E.color}"></span>${E.label}</th>${cell(pct ? `+${pct} %` : '0 %')}${cell(fixe)}<td class="${res < 0 ? 'neg' : res ? '' : 'zero'}">${res} %</td></tr>`;
    }).join('') +
      `<tr><th scope="row">${Hud.pic('crit', 14)}Critiques</th>${cell(d.dmgCrit || 0)}<td class="zero">-</td>${cell(d.resCrit || 0)}</tr>` +
      `<tr><th scope="row">${Hud.pic('dmg', 14)}Poussée</th>${cell(d.poussee || 0)}<td class="zero">-</td>${cell(d.resPou || 0)}</tr>` +
      `<tr><th scope="row">${Hud.pic('esquive', 14)}Réduction</th><td class="zero">-</td><td class="zero">-</td>${cell(d.reduc || 0)}</tr>`;
    const elements = `<table class="vy-c3__elts"><thead><tr><th scope="col"><span class="vy-visuel">Élément</span></th><th scope="col">Dég.</th><th scope="col">Fixes</th><th scope="col">Rés.</th></tr></thead><tbody>${lignesEl}</tbody></table>`;
    const sep = '<div class="vy-c3__sep" aria-hidden="true"><i></i></div>';
    return `<div class="vy-c3__resume">${premiers}${sep}${charge}${sep}${combat}${sep}${elements}</div>`;
  },

  boutonSceaux(ch) {
    if (typeof ArbreSceaux === 'undefined' || typeof Sceaux === 'undefined') return '';
    const e = this.etatSceaux(ch), sc = Sceaux.sceauxLibresTotal(e), p = Sceaux.pointsLibres(e);
    const note = sc || '';
    const svgArbre = svg('<circle cx="12" cy="18.5" r="2.5"/><circle cx="5" cy="6" r="2.5"/><circle cx="12" cy="5" r="2.5"/><circle cx="19" cy="6" r="2.5"/><path d="M12 16V7.5M6.2 8.2 10.6 16M17.8 8.2 13.4 16"/>');
    return `<button type="button" class="vy-caracs__sceaux${sc || p ? ' on' : ''}" data-act="sceaux" title="Arbre des Sceaux : les quatre voies et leurs Sceaux${sc ? ` (${sc} à poser)` : ''}${p ? `, ${pts(p)} à répartir` : ''}" aria-label="Ouvrir l'Arbre des Sceaux">${svgArbre}<span>Sceaux</span>${note ? `<em>${note}</em>` : ''}</button>`;
  },
  etatSceaux(ch) { return ch.sceauxEtat(); },
  ouvrirSceaux() {
    const ch = this.world.ch;
    const etat = this.etatSceaux(ch);
    ArbreSceaux.ouvrir({
      etat, jeu: true,
      joueur: { nom: ch.name, titre: ch.classDef.name, xp: ch.level >= Character.MAX_LEVEL ? 0 : ch.xp, xpMax: ch.level >= Character.MAX_LEVEL ? 0 : Character.xpToNext(ch.level) },
      surChangement: e => {
        const avant = Object.assign({}, ch.stats);
        ch.appliquerSceaux(e);
        this.caracSignaler(avant);
        this.world.emit('update');
        this.world.emit('save');
      },
      surFermer: () => { if (this.fen.isOpen('carac')) this.fen.render('carac'); },
    });
  },


  caracDetails(ch, d) {
    const cls = ch.classDef, st = ch.stats, R = DATA.rules, bonus = this.caracBonus(ch, d);
    const cell = v => v ? v : '<span class="vy-zero">0</span>';
    const row = (k, label, base, total, unite, titre) => {
      const b = total - base, u = unite || '';
      return `<tr${titre ? ` title="${titre}"` : ''}><th scope="row">${Hud.pic(k, 16)}${label}</th><td>${cell(base)}${base ? u : ''}</td><td class="${b > 0 ? 'pos' : b < 0 ? 'neg' : ''}">${b ? (b > 0 ? '+' : '') + b + u : cell(0)}</td><td><b>${total}${u}</b></td></tr>`;
    };
    const section = (titre, lignes) => `<tbody><tr class="vy-caracs__section"><th colspan="4" scope="colgroup">${titre}</th></tr>${lignes.join('')}</tbody>`;
    const sum4 = (st.force || 0) + (st.intel || 0) + (st.chance || 0) + (st.agi || 0);
    const SR = DATA.sceaux ? DATA.sceaux.regles : { pvBase: 50, pvParNiveau: 5 };
    const primaires = Character.ALLOUABLES.concat(['vita', 'sagesse']).map(k => row(k, Items.STAT_LABEL[k], st[k] || 0, d.stats[k] || 0, '', bonus.texte(k) ? `Bonus : ${bonus.texte(k)}` : (k === 'vita' || k === 'sagesse' ? 'Ne se répartit plus : vient de l\'équipement et des parchemins' : '')));
    const arbre = 'l\'Arbre des Sceaux et l\'équipement';
    const combat = [
      row('pv', 'Points de vie', SR.pvBase + SR.pvParNiveau * ch.level, d.hpMax, '', `Points de vie maximum : ${SR.pvBase} + ${SR.pvParNiveau} par niveau, plus la Vitalité de l'équipement et ${SR.pvParSceau || 5} PV par Sceau posé`),
      row('pa', 'PA', 6, d.pa), row('pm', 'PM', 3, d.pm),
      row('init', 'Initiative', sum4, d.initiative, '', 'Terra, Ignis, Aqua et Aer, plus l\'arbre ; en combat, elle baisse avec les PV perdus'),
      row('pp', 'Prospection', 100 + Math.floor((d.stats.chance || 0) / 10), d.prospection, '', `100 + Aqua / 10, plus ${arbre}`),
      row('crit', 'Critique', 0, d.crit, ' %', 'S\'ajoute au taux de critique de chaque sort ; un critique prend le jet critique du sort, plus les dommages critiques'),
      row('invoc', 'Invocations', R.maxSummonsPerOwner, R.maxSummonsPerOwner),
      (() => { const f = Math.round((DATA.bonusFormat(ch.level) - 1) * 100); return f > 0 ? row('dmg', 'Format court', 0, f, ' %', 'Tes dégâts suivent la solidité des monstres de ton niveau : un combat court jusqu\'au niveau 50, puis de plus en plus long jusqu\'au 200, où les combats deviennent longs') : null; })(),
    ].filter(Boolean);
    const secondaires = [
      row('tacle', 'Tacle', Math.floor((d.stats.agi || 0) / 10), d.tacle, '', `Aer / 10, plus ${arbre}`),
      row('fuite', 'Fuite', Math.floor((d.stats.agi || 0) / 10) + (R.playerFuiteBase || 0), d.fuite, '', `Aer / 10, plus ${R.playerFuiteBase || 0} de base, plus ${arbre}`),
      row('esquive', 'Esquive PA', Math.floor((d.stats.sagesse || 0) / 10), d.esquivePA, '', `Sagesse / 10, plus ${arbre}. Un PA qu'on te retire passe avec 50 % × Retrait de l'ennemi / ton Esquive × tes PA restants / maximum (de 10 à 90 %)`), row('esquive', 'Esquive PM', Math.floor((d.stats.sagesse || 0) / 10), d.esquivePM, '', `Sagesse / 10, plus ${arbre}. Un PM qu'on te retire passe avec 50 % × Retrait de l'ennemi / ton Esquive × tes PM restants / maximum (de 10 à 90 %)`),
      row('retrait', 'Retrait PA', Math.floor((d.stats.sagesse || 0) / 10), d.retraitPA, '', `Sagesse / 10, plus ${arbre}. Un PA que tu retires passe avec 50 % × ton Retrait / l'Esquive de la cible × ses PA restants / maximum (de 10 à 90 %)`), row('retrait', 'Retrait PM', Math.floor((d.stats.sagesse || 0) / 10), d.retraitPM, '', `Sagesse / 10, plus ${arbre}. Un PM que tu retires passe avec 50 % × ton Retrait / l'Esquive de la cible × ses PM restants / maximum (de 10 à 90 %)`),
      row('soins', 'Soins', st.intel || 0, d.soins, ' %', '+1 % par point d\'Ignis, plus l\'arbre et l\'équipement'),
      row('sagesse', 'Expérience gagnée', 0, d.stats.sagesse || 0, ' %', '+1 % par point de Sagesse (équipement et parchemins)'),
    ];
    const dommages = [row('dmg', 'Dommages', 0, d.dmgFlat, '', 'Ajoutés à chaque coup'), row('dmg', 'Dommages critiques', 0, d.dmgCrit || 0, '', 'Ajoutés à chaque coup critique'), row('dmg', 'Réduction des dégâts', 0, d.reduc || 0, '', 'Retirée de chaque coup reçu')];
    const resist = ['neutre', 'terre', 'feu', 'eau', 'air'].map(el => { const v = (cls.resist || {})[el] || 0, t = (d.resist || {})[el] || 0; return `<tr><th scope="row"><span class="vy-pastille" style="--c:${DATA.elements[el].color}"></span>${DATA.elements[el].label}</th><td>${cell(v)}${v ? ' %' : ''}</td><td>${t - v ? `+${t - v} %` : cell(0)}</td><td class="${t < 0 ? 'neg' : ''}"><b>${t} %</b></td></tr>`; });
    return `<table class="vy-tableau vy-caracs__table"><thead><tr><th scope="col"><span class="vy-visuel">Caractéristique</span></th><th scope="col">Base</th><th scope="col">Bonus</th><th scope="col">Total</th></tr></thead>
      ${section('Caractéristiques primaires', primaires)}${section('Combat', combat)}${section('Caractéristiques secondaires', secondaires)}${section('Dommages', dommages)}${section('Résistances', resist)}</table>
      <p class="muted vy-note">Base : tes points, pour les caractéristiques ; ce qu'elles donnent, pour le reste. Bonus : parchemins, équipement, panoplies et Sceaux. Les dégâts par élément sont dans l'onglet Éléments.</p>`;
  },


  caracElements(ch, d, cls) {
    return `<div class="vy-caracs__elements"><div>${this.caracProfil(d)}</div><div>${this.caracParElement(ch, d, cls)}</div></div>
      <p class="muted vy-note">Chaque niveau donne 5 points. Terra, Ignis, Aqua et Aer coûtent 1 point jusqu'à 100, 2 jusqu'à 200, 3 jusqu'à 300, 4 au-delà. Un point ajoute 1 % aux dégâts de son élément (Terra : terre et neutre ; Ignis : aussi les soins) ; Aer donne Tacle et Fuite (un pour dix), Aqua la Prospection (un pour dix), Terra 5 de poids porté. Chaque dizaine donne un Sceau de la voie, à poser dans son arbre. Chaque sort garde son élément. La Vitalité et la Sagesse (expérience, Retrait et Esquive) viennent de l'équipement et des parchemins (${DATA.rules.scrollMax} au plus).</p>`;
  },

  caracProfil(d) {
    const keys = Character.ALLOUABLES;
    const vals = keys.map(k => Math.max(0, d.stats[k] || 0));
    const max = Math.max(20, ...vals);
    const cx = 110, cy = 100, R = 70;
    const pt = (i, r) => { const a = -Math.PI / 2 + i * Math.PI * 2 / keys.length; return [cx + Math.cos(a) * r, cy + Math.sin(a) * r]; };
    const ring = f => keys.map((k, i) => pt(i, R * f).join(',')).join(' ');
    const poly = vals.map((v, i) => pt(i, R * Math.max(0.06, v / max)).join(',')).join(' ');
    const labels = keys.map((k, i) => { const [x, y] = pt(i, R + 18); return `<g transform="translate(${x - 9},${y - 9})">${Hud.pic(k, 18)}</g><text x="${x}" y="${y + 20}" text-anchor="middle">${d.stats[k] || 0}</text>`; }).join('');
    return `<div class="vy-sous"><span>Profil</span></div><svg class="vy-radar" viewBox="0 0 220 210" role="img" aria-label="Profil des caractéristiques">
      <polygon points="${ring(1)}" class="anneau"/><polygon points="${ring(0.66)}" class="anneau"/><polygon points="${ring(0.33)}" class="anneau"/>
      ${keys.map((k, i) => `<line x1="${cx}" y1="${cy}" x2="${pt(i, R)[0]}" y2="${pt(i, R)[1]}" class="axe"/>`).join('')}
      <polygon points="${poly}" class="valeur"/>${labels}</svg>`;
  },

  caracParElement(ch, d, cls) {
    const rows = ['neutre', 'terre', 'feu', 'eau', 'air'].map(el => {
      const k = { terre: 'force', neutre: 'force', feu: 'intel', eau: 'chance', air: 'agi' }[el];
      const res = (d.resist || {})[el] || 0, deg = (d.stats[k] || 0) + ((d.dmgPct || {})[el] || 0);
      return `<tr><th scope="row"><span class="vy-pastille" style="--c:${DATA.elements[el].color}"></span>${DATA.elements[el].label}${DATA.elements[el].stat ? ` <small class="muted">${DATA.elements[el].stat}</small>` : ''}</th><td>+${deg} %</td><td class="${res < 0 ? 'neg' : ''}">${res} %</td></tr>`;
    }).join('');
    return `<div class="vy-sous"><span>Par élément</span></div><table class="vy-tableau"><thead><tr><th></th><th>Dégâts</th><th>Rés.</th></tr></thead><tbody>${rows}</tbody></table>`;
  },


  caracFeuille(ch, d) {
    const f = this.carac.feuille, k = f.stat, base = ch.stats[k], b = this.caracBornes(k);
    f.v = Math.max(b.min, Math.min(b.max, f.v));
    const v = f.v, cout = this.caracCout(k, v), label = Items.STAT_LABEL[k];
    const total = d.stats[k] || 0, bonusTxt = this.caracBonus(ch, d).texte(k);
    const paliers = k === 'vita' || k === 'sagesse' ? [[0, Infinity, Character.pointCost(k, 0)]]
      : DATA.rules.statTiers.map(([haut, c], i, T) => [i ? T[i - 1][0] : 0, haut, c]);
    const dans = (p, x) => x >= p[0] && x < p[1];
    const dernier = v > 0 ? base + v - 1 : base;
    const plage = p => p[1] === Infinity ? 'tous' : p[1] >= 1e9 ? `${p[0]} et plus` : `${p[0]} à ${p[1] - 1}`;
    const cols = paliers.map(p => `<td class="${dans(p, base) ? 'actuel' : ''}${v > 0 && !dans(p, base) && dans(p, dernier) ? ' vise' : ''}">`);
    const table = `<table class="vy-caracs__paliers" aria-label="Paliers de coût"><tbody>
      <tr><th scope="row">Base</th>${paliers.map((p, i) => `${cols[i]}${plage(p)}</td>`).join('')}</tr>
      <tr><th scope="row">Coût</th>${paliers.map((p, i) => `${cols[i]}${p[2]}</td>`).join('')}</tr></tbody></table>`;
    const detail = total - base ? ` <small>(base ${base + v}, bonus ${total - base > 0 ? '+' : ''}${total - base})</small>` : '';
    const apercu = v >= 0
      ? `<p class="vy-caracs__gain${v ? ' on' : ''}">+${v} ${label}</p><p>Total : <b>${total + v}</b> ${label}${detail}</p><p class="muted">Coût : ${pts(cout)}, il en restera ${ch.statPoints - cout}</p>`
      : `<p class="vy-caracs__gain retire">${v} ${label}</p><p>Total : <b>${total + v}</b> ${label}${detail}</p><p class="muted">Rendus : ${pts(-cout)}, tu en auras ${ch.statPoints - cout}</p>`;
    const bouton = (act, attr, ico, aria, off) => `<button class="vy-pas__bouton" data-act="${act}" ${attr} aria-label="${aria}" title="${aria}" ${off ? 'disabled' : ''}>${ico}</button>`;
    return `<div class="vy-feuille-fond" data-act="fermerFeuille"></div>
      <section class="vy-feuille vy-caracs-feuille" role="dialog" aria-modal="true" aria-labelledby="carac-feuille-titre">
        <header class="vy-feuille__tete"><h3 id="carac-feuille-titre">${Hud.pic(k, 20)}${label}</h3><button class="vy-fenetre__bouton" data-act="fermerFeuille" aria-label="Fermer">${I.fermer}</button></header>
        <p class="vy-caracs__restants">Points restants à répartir : <b>${ch.statPoints}</b></p>
        <div class="vy-caracs__reglage">
          <div class="vy-pas" role="group" aria-label="Points en ${label}">
            ${bouton('saut', 'data-sens="-1"', ICO.debut, v > 0 ? 'Revenir à zéro' : 'Tout retirer', v <= b.min)}
            ${bouton('pas', 'data-n="-1"', I.moins, 'Un de moins', v <= b.min)}
            <input id="carac-valeur" class="vy-pas__valeur" type="number" inputmode="numeric" min="${b.min}" max="${b.max}" step="1" value="${v}" aria-label="Points en ${label}">
            ${bouton('pas', 'data-n="1"', I.plus, 'Un de plus', v >= b.max)}
            ${bouton('saut', 'data-sens="1"', ICO.fin, v < 0 ? 'Revenir à zéro' : `Le plus possible (${b.max})`, v >= b.max)}
          </div>
          <div class="vy-caracs__apercu" aria-live="polite">${apercu}</div>
        </div>
        ${table}
        <p class="muted vy-caracs__bonus">${bonusTxt ? `Bonus actuel : ${bonusTxt}.` : 'Aucun bonus pour l\'instant.'} Parchemins lus : ${(ch.scrolls || {})[k] || 0} / ${DATA.rules.scrollMax}.${base > 0 ? ` Retirer des points est gratuit jusqu'au niveau ${typeof Sceaux !== 'undefined' ? Sceaux.D.regles.reinitGratuiteJusqua : 10} ; ensuite, c'est la réinitialisation.` : ''}</p>
        <footer class="vy-feuille__pied"><button class="vy-bouton vy-bouton--petit vy-bouton--fantome" data-act="fermerFeuille">Annuler</button><button class="vy-bouton vy-bouton--primaire vy-bouton--petit" data-act="valider" ${v ? '' : 'disabled'}>Valider</button></footer>
      </section>`;
  },
});
})();
