// Caractéristiques (touche C), à la manière de Dofus Touch dans la charte Veylan : le portrait,
// l'expérience, et trois onglets. Résumé : PV, PA, PM, Initiative, Prospection, Invocations, puis
// les six caractéristiques avec leur « + », qui ouvre la feuille de répartition (points restants,
// pas à pas, aperçu du gain et du total, paliers de coût, Valider). Détails : base, bonus (parchemins,
// équipement, panoplies) et total de tout ce que le moteur calcule. Éléments : le profil en radar,
// les dégâts et résistances par élément, la voie élémentaire. Au pied : points à répartir,
// répartition automatique, réinitialisation. La Portée n'existe pas pour un personnage de Veylan :
// elle n'est pas montrée. Se charge après js/hud-fenetres.js et complète Hud.
(() => {
const I = Fenetres.ICON;
const esc = s => Util.esc(s);
const svg = p => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${p}</svg>`;
const ICO = {
  debut: svg('<path d="M6.5 5v14M18 5.5 9.5 12l8.5 6.5z"/>'),
  fin: svg('<path d="M17.5 5v14M6 5.5l8.5 6.5L6 18.5z"/>'),
};
const nf = n => Number(n).toLocaleString('fr-FR');
const pts = n => `${n} point${Math.abs(n) > 1 ? 's' : ''}`;
const ONGLETS = [['resume', 'Résumé'], ['details', 'Détails'], ['elements', 'Éléments']];

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
      // Pas à pas : un de plus, un de moins ; les deux flèches vont au prochain arrêt (zéro, puis
      // le plus qu'on peut poser, ou tout retirer).
      pas: d => { if (s.feuille) { s.feuille.v = borne(s.feuille.v + Number(d.n)); r(); } },
      saut: d => {
        const f = s.feuille;
        if (!f) return;
        const b = this.caracBornes(f.stat);
        f.v = Number(d.sens) < 0 ? (f.v > 0 ? 0 : b.min) : (f.v < 0 ? 0 : b.max);
        r();
      },
      valider: () => this.caracValider(),
      fermerFeuille: () => { s.feuille = null; r(); },
      autonow: () => { const c = ch(), avant = Object.assign({}, c.stats); c.autoAllocate(); this.caracSignaler(avant); this.world.emit('update'); this.world.emit('save'); },
      voie: d => {
        const c = ch();
        if (!c.setVoie(d.voie || null)) return;
        this.toast(c.voie ? `Voie ${DATA.elements[c.voie].label.toLowerCase()} : tes sorts de dégâts frappent en ${DATA.elements[c.voie].label.toLowerCase()}, tes points sont rendus.` : 'Éléments d\'origine de la classe : tes points sont rendus.');
        this.world.emit('update');
        this.world.emit('save');
      },
      reset: (d, b) => {
        if (!b.dataset.sure) { b.dataset.sure = '1'; b.textContent = 'Confirmer'; return; }
        ch().resetStats(); this.world.emit('update'); this.world.emit('save');
      },
    };
    const onField = (el, kind) => {
      if (el.id === 'carac-auto') ch().autoStats = el.checked;
      // La valeur tapée suit les bornes, en direct.
      if (el.id === 'carac-valeur' && s.feuille) {
        const v = parseInt(el.value, 10);
        if (Number.isFinite(v) && (kind === 'change' || borne(v) !== s.feuille.v)) { s.feuille.v = borne(v); r(); }
      }
    };
    this.simpleWin('carac', 'Caractéristiques', () => this.renderCaracs(), actions, {
      width: 440, cls: 'vy-fenetre--caracs', onField, annonce: 'caracteristiques',
      onEscape: () => { if (!s.feuille) return false; s.feuille = null; r(); return true; },
    });
  },

  // Ce que la feuille peut faire pour une caractéristique : tout retirer (gratuit jusqu'au niveau
  // 30), ou poser le plus de points que permettent les paliers, compté pas à pas avec le moteur.
  caracBornes(stat) {
    const ch = this.world.ch;
    let n = 0, v = ch.stats[stat], reste = ch.statPoints;
    for (;;) { const c = Character.pointCost(stat, v); if (reste < c) break; reste -= c; v++; n++; }
    return { min: -ch.stats[stat], max: n };
  },

  // Points de caractéristique dépensés pour +v (rendus, en négatif, pour -v), palier par palier.
  caracCout(stat, v) {
    const base = this.world.ch.stats[stat];
    let c = 0;
    if (v > 0) for (let i = 0; i < v; i++) c += Character.pointCost(stat, base + i);
    else for (let i = 1; i <= -v; i++) c -= Character.pointCost(stat, base - i);
    return c;
  },

  // Valider : les méthodes du personnage posent ou rendent les points, au coût des paliers.
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

  // Prévient les modules voisins de ce qui a changé depuis `avant` ; retourne le gain total.
  caracSignaler(avant) {
    const ch = this.world.ch;
    let total = 0;
    for (const k of Items.STATS) {
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
    const ch = this.world.ch, d = ch.derived(), cls = ch.classDef, s = this.carac;
    const max = ch.level >= Character.MAX_LEVEL, next = Character.xpToNext(ch.level);
    const tabs = ONGLETS.map(([k, l]) => `<button class="vy-onglet${s.onglet === k ? ' on' : ''}" data-act="onglet" data-onglet="${k}" role="tab" aria-selected="${s.onglet === k}">${l}</button>`).join('');
    const corps = s.onglet === 'details' ? this.caracDetails(ch, d) : s.onglet === 'elements' ? this.caracElements(ch, d, cls) : this.caracResume(ch, d);
    return `<div class="vy-caracs">
      <header class="vy-fiche vy-caracs__tete"><div class="vy-fiche__portrait" style="--c:${cls.color}">${cls.glyph}</div>
        <div class="vy-caracs__qui"><div class="vy-fiche__nom">${esc(ch.name)}</div><div class="vy-fiche__classe">${esc(cls.name)}, niveau ${ch.level}${ch.title ? ` · ${esc(ch.title)}` : ''}</div></div>
        <div class="vy-caracs__xp" title="Expérience"><span>Expérience</span><small>${max ? 'niveau maximum' : `${nf(ch.xp)} / ${nf(next)}`}</small>${Util.jauge('xp', max ? 1 : ch.xp, max ? 1 : next, null, 'Expérience', 'vy-jauge--fine')}</div></header>
      <nav class="vy-onglets vy-caracs__onglets" role="tablist" aria-label="Caractéristiques">${tabs}</nav>
      <div class="vy-caracs__corps" data-defile="caracs-${s.onglet}" role="tabpanel">${corps}</div>
      <footer class="vy-caracs__pied"><span class="vy-points${ch.statPoints ? ' on' : ''}" title="Points de caractéristique à répartir"><b>${ch.statPoints}</b> à répartir</span>
        <label class="vy-coche"><input type="checkbox" id="carac-auto" ${ch.autoStats ? 'checked' : ''}> Auto (${Items.STAT_LABEL[ch.mainStat]})</label>
        <span class="vy-caracs__pied-boutons">${ch.statPoints ? '<button class="vy-bouton vy-bouton--petit" data-act="autonow" title="Tout poser dans la caractéristique de ta voie">Répartir</button>' : ''}
        <button class="vy-bouton vy-bouton--petit vy-bouton--fantome" data-act="reset" title="Rend tous les points, gratuit jusqu'au niveau 30">Réinitialiser</button></span></footer>
    </div>${s.feuille ? this.caracFeuille(ch, d) : ''}`;
  },

  // Bonus d'une caractéristique, par provenance : parchemins, équipement, panoplies.
  caracBonus(ch, d) {
    const equip = {}, sets = {};
    for (const slot of Items.EQUIP_SLOTS) { const it = ch.equipment[slot] && Items.get(ch.equipment[slot]); if (it) for (const k in it.stats) equip[k] = (equip[k] || 0) + it.stats[k]; }
    for (const b of d.setBonuses) for (const k in b.stats) sets[k] = (sets[k] || 0) + b.stats[k];
    const texte = k => [(ch.scrolls || {})[k] ? `${ch.scrolls[k]} de parchemins` : '', equip[k] ? `${equip[k]} d'équipement` : '', sets[k] ? `${sets[k]} de panoplies` : ''].filter(Boolean).join(', ');
    return { equip, sets, texte };
  },

  // ----- Résumé -----

  caracResume(ch, d) {
    const bonus = this.caracBonus(ch, d);
    const ligne = (k, label, val, titre) => `<div class="vy-caracs__ligne"${titre ? ` title="${titre}"` : ''}>${Hud.pic(k, 18)}<span>${label}</span><b>${val}</b></div>`;
    const vitaux = [
      ligne('pv', 'Points de vie', `${ch.hp} / ${d.hpMax}`),
      ligne('pa', 'PA', d.pa, 'Points d\'action'),
      ligne('pm', 'PM', d.pm, 'Points de mouvement'),
      ligne('init', 'Initiative', d.initiative, 'Initiative de la classe, plus Terra, Ignis, Aqua et Aer'),
      ligne('pp', 'Prospection', d.prospection, '100 + Aqua / 10 : les chances de butin en dépendent'),
      ch.classDef.summonGauge ? ligne('invoc', 'Jauge de meute', ch.classDef.summonGauge, 'Chaque bête coûte sa part de la jauge (Glym 1, Grouk 2, Molh 3), une de chaque espèce') : ligne('invoc', 'Invocations', DATA.rules.maxSummonsPerOwner, 'Invocations en jeu au plus'),
    ].join('');
    const caracs = Items.STATS.map(k => {
      const base = ch.stats[k], total = d.stats[k] || 0, cost = Character.pointCost(k, base), b = this.caracBornes(k);
      const label = Items.STAT_LABEL[k], detail = bonus.texte(k);
      const titre = `${label} : ${total}${detail ? ` (${base} de base, ${detail})` : ''}. Prochain point : ${pts(cost)}.`;
      return `<div class="vy-caracs__stat" title="${titre}">${Hud.pic(k, 20)}<span class="vy-caracs__nom">${label}<small>coût ${cost}</small></span><b>${total}</b>` +
        `<button class="vy-caracs__plus" data-act="plus" data-stat="${k}" ${b.max > 0 || base > 0 ? '' : 'disabled'} aria-label="Répartir en ${label}" title="Répartir en ${label}">${I.plus}</button></div>`;
    }).join('');
    return `<div class="vy-caracs__resume">
      <div class="vy-caracs__vitaux">${vitaux}</div>
      <div class="vy-caracs__liste"><div class="vy-sous"><span>Caractéristiques</span><span class="vy-caracs__reste${ch.statPoints ? ' on' : ''}">${pts(ch.statPoints)}</span></div>${caracs}</div>
    </div>`;
  },

  // ----- Détails : base, bonus, total -----

  caracDetails(ch, d) {
    const cls = ch.classDef, st = ch.stats, R = DATA.rules, bonus = this.caracBonus(ch, d);
    const cell = v => v ? v : '<span class="vy-zero">0</span>';
    const row = (k, label, base, total, unite, titre) => {
      const b = total - base, u = unite || '';
      return `<tr${titre ? ` title="${titre}"` : ''}><th scope="row">${Hud.pic(k, 16)}${label}</th><td>${cell(base)}${base ? u : ''}</td><td class="${b > 0 ? 'pos' : b < 0 ? 'neg' : ''}">${b ? (b > 0 ? '+' : '') + b + u : cell(0)}</td><td><b>${total}${u}</b></td></tr>`;
    };
    const section = (titre, lignes) => `<tbody><tr class="vy-caracs__section"><th colspan="4" scope="colgroup">${titre}</th></tr>${lignes.join('')}</tbody>`;
    const sum4 = (st.force || 0) + (st.intel || 0) + (st.chance || 0) + (st.agi || 0);
    const sag = Math.floor((st.sagesse || 0) / 10);
    const primaires = Items.STATS.map(k => row(k, Items.STAT_LABEL[k], st[k], d.stats[k] || 0, '', bonus.texte(k) ? `Bonus : ${bonus.texte(k)}` : ''));
    const combat = [
      row('pv', 'Points de vie', Math.round((60 + 5 * ch.level + (st.vita || 0)) * cls.hp / 120), d.hpMax, '', 'Points de vie maximum'),
      row('pa', 'PA', 6, d.pa), row('pm', 'PM', 3, d.pm),
      row('init', 'Initiative', cls.initiative + sum4, d.initiative),
      row('pp', 'Prospection', 100 + Math.floor((st.chance || 0) / 10), d.prospection),
      row('crit', 'Coups critiques', 5, d.crit, ' %', 'Chance de coup critique ; un critique fait × 1,5'),
      row('invoc', 'Invocations', R.maxSummonsPerOwner, R.maxSummonsPerOwner),
    ];
    const secondaires = [
      row('tacle', 'Tacle', Math.floor((st.agi || 0) / 10), d.tacle, '', 'Aer / 10'),
      row('fuite', 'Fuite', Math.floor((st.agi || 0) / 10) + (R.playerFuiteBase || 0), d.fuite, '', `Aer / 10, plus ${R.playerFuiteBase || 0} de base`),
      row('esquive', 'Esquive PA', sag, d.esquivePA, '', 'Sagesse / 10'), row('esquive', 'Esquive PM', sag, d.esquivePM, '', 'Sagesse / 10'),
      row('retrait', 'Retrait PA', sag, d.retraitPA, '', 'Sagesse / 10'), row('retrait', 'Retrait PM', sag, d.retraitPM, '', 'Sagesse / 10'),
      row('soins', 'Soins', st.intel || 0, d.soins, ' %', '+1 % par point d\'Ignis'),
      row('sagesse', 'Expérience gagnée', st.sagesse || 0, d.stats.sagesse || 0, ' %', '+1 % par point de Sagesse'),
    ];
    const dommages = [row('dmg', 'Dommages', 0, d.dmgFlat, '', 'Ajoutés à chaque coup')];
    const resist = ['neutre', 'terre', 'feu', 'eau', 'air'].map(el => { const v = (cls.resist || {})[el] || 0; return `<tr><th scope="row"><span class="vy-pastille" style="--c:${DATA.elements[el].color}"></span>${DATA.elements[el].label}</th><td>${cell(v)}${v ? ' %' : ''}</td><td>${cell(0)}</td><td class="${v < 0 ? 'neg' : ''}"><b>${v} %</b></td></tr>`; });
    return `<table class="vy-tableau vy-caracs__table"><thead><tr><th scope="col"><span class="vy-visuel">Caractéristique</span></th><th scope="col">Base</th><th scope="col">Bonus</th><th scope="col">Total</th></tr></thead>
      ${section('Caractéristiques primaires', primaires)}${section('Combat', combat)}${section('Caractéristiques secondaires', secondaires)}${section('Dommages', dommages)}${section('Résistances de la classe', resist)}</table>
      <p class="muted vy-note">Base : tes points, pour les caractéristiques ; ce qu'elles donnent, pour le reste. Bonus : parchemins, équipement et panoplies. Les dégâts par élément sont dans l'onglet Éléments.</p>`;
  },

  // ----- Éléments : profil, dégâts et résistances, voie -----

  caracElements(ch, d, cls) {
    return `<div class="vy-caracs__elements"><div>${this.caracProfil(d)}</div><div>${this.caracParElement(ch, d, cls)}</div></div>${this.voieHtml(ch, cls)}
      <p class="muted vy-note">Chaque niveau donne 5 points. Terra, Ignis, Aqua et Aer coûtent 1 point jusqu'à 100, 2 jusqu'à 200, 3 jusqu'à 300, 4 au-delà ; la Vitalité 1 point, la Sagesse 3. Un point d'élément ajoute 1 % aux dégâts de l'élément (et aux soins pour Ignis) ; Aer donne Tacle et Fuite, la Sagesse l'expérience, l'Esquive et le Retrait, Aqua la Prospection. Les parchemins ajoutent des points de base gratuits (${DATA.rules.scrollMax} au plus).</p>`;
  },

  // Voie élémentaire : l'élément des sorts de dégâts, au choix (sans plafond de caractéristique).
  voieHtml(ch, cls) {
    const orig = [...new Set(cls.spells.map(id => DATA.spells[id].element).filter(e => e !== 'neutre'))].map(e => DATA.elements[e].label.toLowerCase()).join(', ');
    const btn = (v, label, color, title) => `<button class="vy-voie${(ch.voie || null) === v ? ' on' : ''}" data-act="voie" data-voie="${v || ''}" aria-pressed="${(ch.voie || null) === v}" style="--c:${color}" title="${title}">${label}</button>`;
    const btns = [btn(null, 'Origine', 'var(--fen-accent)', `Les éléments de la classe : ${orig}`)]
      .concat(Character.VOIES.map(v => btn(v, `${DATA.elements[v].stat} <small>${DATA.elements[v].label.toLowerCase()}</small>`, DATA.elements[v].color, `${DATA.elements[v].stat} : ${DATA.elements[v].desc} Tous les sorts de dégâts en ${DATA.elements[v].label.toLowerCase()}.`))).join('');
    return `<div class="vy-sous"><span>Voie élémentaire</span></div><div class="vy-voies" role="group" aria-label="Voie élémentaire">${btns}</div>
      <p class="muted vy-note">${ch.voie ? `Tes sorts de dégâts frappent en ${DATA.elements[ch.voie].label.toLowerCase()} ; ta caractéristique est ${Items.STAT_LABEL[ch.mainStat]}.` : `Éléments d'origine : ${orig}.`} Changer de voie rend tes points, gratuitement.</p>`;
  },

  // Profil : un radar à six branches, une par caractéristique.
  caracProfil(d) {
    const keys = Items.STATS;
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

  // Par élément : le bonus de dégâts de la caractéristique et la résistance de la classe.
  caracParElement(ch, d, cls) {
    const rows = ['neutre', 'terre', 'feu', 'eau', 'air'].map(el => {
      const k = { terre: 'force', neutre: 'force', feu: 'intel', eau: 'chance', air: 'agi' }[el];
      const res = (cls.resist || {})[el] || 0;
      return `<tr><th scope="row"><span class="vy-pastille" style="--c:${DATA.elements[el].color}"></span>${DATA.elements[el].label}${DATA.elements[el].stat ? ` <small class="muted">${DATA.elements[el].stat}</small>` : ''}</th><td>+${d.stats[k] || 0} %</td><td class="${res < 0 ? 'neg' : ''}">${res} %</td></tr>`;
    }).join('');
    return `<div class="vy-sous"><span>Par élément</span></div><table class="vy-tableau"><thead><tr><th></th><th>Dégâts</th><th>Rés.</th></tr></thead><tbody>${rows}</tbody></table>`;
  },

  // ----- Feuille de répartition -----

  caracFeuille(ch, d) {
    const f = this.carac.feuille, k = f.stat, base = ch.stats[k], b = this.caracBornes(k);
    f.v = Math.max(b.min, Math.min(b.max, f.v));
    const v = f.v, cout = this.caracCout(k, v), label = Items.STAT_LABEL[k];
    const total = d.stats[k] || 0, bonusTxt = this.caracBonus(ch, d).texte(k);
    // Paliers : [de, jusqu'à, coût]. La Vitalité et la Sagesse ont un seul coût.
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
        <p class="muted vy-caracs__bonus">${bonusTxt ? `Bonus actuel : ${bonusTxt}.` : 'Aucun bonus pour l\'instant.'} Parchemins lus : ${(ch.scrolls || {})[k] || 0} / ${DATA.rules.scrollMax}.${base > 0 ? ' Retirer des points est gratuit jusqu\'au niveau 30.' : ''}</p>
        <footer class="vy-feuille__pied"><button class="vy-bouton vy-bouton--petit vy-bouton--fantome" data-act="fermerFeuille">Annuler</button><button class="vy-bouton vy-bouton--primaire vy-bouton--petit" data-act="valider" ${v ? '' : 'disabled'}>Valider</button></footer>
      </section>`;
  },
});
})();
