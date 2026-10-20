// Les factions à l'écran (docs/MONDE.md) : la fenêtre Faction (touche F), l'écran solennel du
// serment avec les deux bannières, les autres étapes de choix (le reniement), la confirmation du
// reniement, et les annonces envoyées à la discussion. Se charge après js/hud-fenetres.js et
// complète la classe Hud ; le moteur (js/factions.js, js/quests.js) ne sait rien du DOM.
//
// Événements de fenêtre émis ici, pour les modules qui les écoutent (la discussion) :
//   'veylan:chat'       detail { type: 'systeme' | 'quete', text }
//   'veylan:windowOpen' detail { id: 'faction' }, annoncé par js/fenetres.js
(() => {
const esc = s => Util.esc(s);
const chat = (type, text) => { try { window.dispatchEvent(new CustomEvent('veylan:chat', { detail: { type, text } })); } catch (e) { /* rien */ } };

// Les emblèmes, en SVG. Le Fil : une auréole de fil d'or cousue au-dessus d'une aiguille, sur un
// champ blanc. La Déchirure : une cape noire fendue, une lueur violette dans la fente.
let emblemes = 0;
function embleme(id, size) {
  const u = 'em' + (++emblemes), z = size || 64;
  if (id === 'fil') {
    return `<svg class="vy-embleme" viewBox="0 0 64 64" width="${z}" height="${z}" aria-hidden="true"><defs>` +
      `<radialGradient id="${u}c" cx="50%" cy="38%" r="62%"><stop offset="0" stop-color="#fffdf6"/><stop offset="1" stop-color="#e9dcc0"/></radialGradient>` +
      `<radialGradient id="${u}h" cx="50%" cy="50%" r="50%"><stop offset="0" stop-color="#ffe7a8" stop-opacity=".9"/><stop offset="1" stop-color="#ffe7a8" stop-opacity="0"/></radialGradient></defs>` +
      `<circle cx="32" cy="32" r="30" fill="url(#${u}c)" stroke="#8e7144" stroke-width="2.5"/><circle cx="32" cy="32" r="26.5" fill="none" stroke="#c9a66b" stroke-width="1"/>` +
      `<ellipse cx="32" cy="20" rx="19" ry="8" fill="url(#${u}h)"/>` +
      `<ellipse cx="32" cy="20" rx="13.5" ry="4.4" fill="none" stroke="#b8893d" stroke-width="2.6" stroke-dasharray="3.4 2.2" stroke-linecap="round"/>` +
      `<path d="M32 27.5 C25 29 22 25 23.5 21.5" fill="none" stroke="#c9a66b" stroke-width="1.5" stroke-linecap="round"/>` +
      `<path d="M32 25.5 L33.7 30 L32.7 52 L31.3 52 L30.3 30 Z" fill="#cfc8b8" stroke="#6e5530" stroke-width="1.1" stroke-linejoin="round"/>` +
      `<ellipse cx="32" cy="29.8" rx=".7" ry="1.7" fill="#fffdf6"/></svg>`;
  }
  return `<svg class="vy-embleme" viewBox="0 0 64 64" width="${z}" height="${z}" aria-hidden="true"><defs>` +
    `<radialGradient id="${u}c" cx="50%" cy="40%" r="62%"><stop offset="0" stop-color="#2a1638"/><stop offset="1" stop-color="#0f0814"/></radialGradient>` +
    `<radialGradient id="${u}l" cx="50%" cy="50%" r="50%"><stop offset="0" stop-color="#d6b8ff" stop-opacity=".95"/><stop offset=".45" stop-color="#a66cff" stop-opacity=".55"/><stop offset="1" stop-color="#a66cff" stop-opacity="0"/></radialGradient></defs>` +
    `<circle cx="32" cy="32" r="30" fill="url(#${u}c)" stroke="#6b2fa0" stroke-width="2.5"/><circle cx="32" cy="32" r="26.5" fill="none" stroke="#3d1f55" stroke-width="1"/>` +
    `<ellipse cx="32" cy="31" rx="9" ry="19" fill="url(#${u}l)"/>` +
    `<path d="M21 15 Q32 11 43 15 L46.5 49 L40.5 45.5 L37 51 L33.5 45 L32 46.5 L30.5 45 L27 51 L23.5 45.5 L17.5 49 Z" fill="#1d0f27" stroke="#5a2a80" stroke-width="1.4" stroke-linejoin="round"/>` +
    `<path d="M32 16 L29.6 23 L34 28 L30.2 34 L33.8 39.5 L32 45.5 L30.4 39.5 L33.4 34 L29.3 28 L33 23 Z" fill="#c9a8ff"/>` +
    `<path d="M32 16 L29.6 23 L34 28 L30.2 34 L33.8 39.5 L32 45.5" fill="none" stroke="#f1e6ff" stroke-width=".9"/>` +
    `<circle cx="32" cy="15" r="2.2" fill="#a66cff" stroke="#f1e6ff" stroke-width=".7"/></svg>`;
}

// Les quêtes de faction : celle du serment (une réponse qui fait prêter serment) et celle du
// reniement (une réponse qui fait renier), trouvées dans le contenu plutôt que nommées ici.
const answerWith = type => Quests.defs().find(q => q.steps.some(s => s.type === 'answer' && (s.options || []).some(o => (o.effects || []).some(e => e.type === type))));
const npcPlace = id => {
  for (const z of DATA.content.zones || []) for (const m of z.maps || []) if ((m.npcs || []).includes(id)) return m.name;
  return '';
};
// « auprès d'Okrel », « auprès de Kethril » ; un PNJ et sa carte : « Ulkara (La Passe de Kaldum) ».
const de = n => (/^[aeiouyàâéèêîïôû]/i.test(n) ? 'd\'' : 'de ') + n;
const qui = id => `${Quests.npcName(id)}${npcPlace(id) ? ` (${npcPlace(id)})` : ''}`;

Object.assign(Hud.prototype, {
  initFaction() {
    const w = this.world;
    // Serment, rang, ordre, reniement, confiance : un mot à l'écran, et la discussion.
    w.on('faction', ev => {
      const text = Factions.describe(ev);
      if (!text) return;
      this.toast(text);
      const type = Factions.chatType(ev);
      if (type) chat(type, text);
    });
    w.on('quest', e => {
      const q = Quests.get(e.id);
      if (!q) return;
      if (e.type === 'abandon') chat('quete', `Quête abandonnée : ${q.name}.`);
      else if (e.type === 'dropped') chat('quete', `${q.name} : quête perdue avec le serment.`);
      else if (e.type === 'answer' && e.later) {
        const s = q.steps.find(x => x.type === 'answer' && (x.options || []).some(o => o.id === e.option));
        const o = s && s.options.find(x => x.id === e.option);
        chat('quete', `${q.name} : ${o ? o.text.toLowerCase() : 'plus tard'}.`);
      } else if (q.category === 'faction' && e.type === 'accept') chat('quete', `Quête de faction acceptée : ${q.name}.`);
      else if (q.category === 'faction' && e.type === 'complete') chat('quete', `Quête de faction terminée : ${q.name}.`);
    });
  },

  // ----- La fenêtre Faction -----

  openFaction() {
    const actions = {
      // L'ordre se choisit une fois, au rang 3 : deux appuis.
      ordre: (d, b) => {
        if (!b.dataset.sure) { b.dataset.sure = '1'; b.classList.add('vy-ordre--sur'); b.querySelector('.vy-ordre__ok').textContent = 'Toucher encore pour confirmer'; return; }
        this.world.chooseOrder(d.order);
      },
      renier: () => this.openRenier(),
      renierAnnuler: d => this.world.abandonQuest(d.id),
    };
    this.simpleWin('faction', 'Faction', () => this.renderFaction(), actions, { width: 560 });
  },

  renderFaction() {
    const ch = this.world.ch;
    const f = Factions.of(ch);
    return Factions.isSworn(ch) ? this.factionJuree(ch, f) : this.factionLibre(ch, f) + this.factionMarcheurs(ch, f);
  },

  // Sous serment : l'emblème, le rang, la barre jusqu'au rang suivant, l'ordre, ce qu'ouvre
  // chaque rang, les quêtes de faction, et le reniement.
  factionJuree(ch, f) {
    const d = Factions.def(f.id), pr = Factions.progress(f);
    const barre = pr.next != null
      ? `${Util.jauge('faction', f.points - pr.from, pr.next - pr.from, `${f.points} / ${pr.next} points`, `Points ${d.du}`, 'vy-jauge--' + f.id)}<small class="muted">Rang suivant : <b>${esc(pr.nextTitle)}</b>${f.rank + 1 === Factions.ORDER_RANK ? ', et le choix de ton ordre' : ''}. Environ trois quêtes de faction par rang.</small>`
      : `${Util.jauge('faction', 1, 1, `${f.points} points`, `Points ${d.du}`, 'vy-jauge--' + f.id)}<small class="muted">Rang le plus haut.</small>`;
    let ordre;
    if (f.order) { const o = Factions.orderDef(f.id, f.order); ordre = `<p class="vy-faction__ordre"><b>${esc(o.name[0].toUpperCase() + o.name.slice(1))}</b> <small class="muted">${esc(o.role)}</small></p>`; }
    else if (f.rank >= Factions.ORDER_RANK) ordre = `<p class="muted vy-note">Rang ${Factions.ORDER_RANK} atteint : choisis ton ordre. Il colore tes quêtes et tes apparences, jamais ta force. On n'en change pas.</p><div class="vy-ordres">${d.orders.map(o => `<button class="vy-ordre" data-act="ordre" data-order="${o.id}"><b>${esc(o.name[0].toUpperCase() + o.name.slice(1))}</b><small>${esc(o.role)}</small><span class="vy-ordre__ok"></span></button>`).join('')}</div>`;
    else ordre = `<p class="muted vy-note">Au rang ${Factions.ORDER_RANK} (${esc(Factions.title(f.id, Factions.ORDER_RANK))}), tu choisiras ton ordre : ${d.orders.map(o => esc(o.name.replace(/^les /, ''))).join(', ')}.</p>`;
    const rangs = d.ranks.map((t, i) => {
      const r = i + 1, u = d.unlocks[i];
      const etat = r < f.rank ? 'fait' : r === f.rank ? 'ici' : 'loin';
      return `<li class="vy-rang vy-rang--${etat}"><b class="vy-rang__n">${r}</b><span><b>${esc(t)}</b><small>${esc(u.text)}</small></span>${u.venir ? '<i class="vy-rang__venir">à venir</i>' : ''}</li>`;
    }).join('');
    const quetes = this.factionQuetes(ch, f);
    const ren = answerWith('renounce');
    const enCours = ren && ch.quests.active[ren.id];
    const pied = enCours
      ? `<p class="vy-note">Reniement en cours : va voir ${esc(qui(Quests.answerNpc(ren, ren.steps[0])))}.</p><button class="vy-bouton vy-bouton--petit vy-bouton--fantome" data-act="renierAnnuler" data-id="${ren.id}">Garder mon serment</button>`
      : `<span class="muted">Renier coûte deux rangs, ton ordre et tes titres de rang.</span><button class="vy-bouton vy-bouton--petit vy-bouton--danger" data-act="renier">Renier mon serment</button>`;
    return `<div class="vy-faction vy-faction--${f.id}">
      <div class="vy-faction__tete">${embleme(f.id, 68)}<div><div class="vy-faction__nom">${esc(d.Nom)}</div><div class="vy-faction__rang">Rang ${f.rank} · <b>${esc(pr.title)}</b></div><small class="muted">Serment prêté au niveau ${f.sworn} · ${esc(d.couleurs)} · ${esc(d.insigne)}</small></div></div>
      <div class="vy-faction__barre">${barre}</div>
      <div class="vy-sous"><span>Ordre</span></div>${ordre}
      <div class="vy-sous"><span>Les rangs</span><small class="muted">jamais de puissance de combat</small></div><ol class="vy-rangs" data-defile="rangs">${rangs}</ol>
      <div class="vy-sous"><span>Quêtes de faction</span></div>${quetes}
      ${this.factionMarcheurs(ch, f)}
      <footer class="vy-fen-pied vy-faction__pied">${pied}</footer></div>`;
  },

  // Les quêtes de faction en cours, et celles à prendre (avec leur PNJ).
  factionQuetes(ch, f) {
    const actives = Quests.tracker(ch).filter(t => t.quest.category === 'faction');
    const mine = Quests.defs().filter(q => q.category === 'faction' && !q.hidden && q.requires && q.requires.faction && Quests.canStart(ch, q.id));
    const a = actives.map(t => `<div class="vy-ligne-quete"><b>${esc(t.quest.name)}</b><small>${esc(t.text)}</small></div>`).join('');
    const b = mine.map(q => `<div class="vy-ligne-quete vy-ligne-quete--offre"><b>${esc(q.name)}</b><small>À prendre auprès ${esc(de(qui(q.giver)))} · niv. ${q.level}</small></div>`).join('');
    if (a || b) return a + b;
    return f && f.id ? `<p class="muted vy-note">Rien en cours. Les quêtes de ton rang : ${esc(Factions.def(f.id).contact)}.</p>` : '<p class="muted vy-note">Aucune quête de faction en cours.</p>';
  },

  // Sans serment : les deux factions côte à côte, ce qu'elles veulent, leur part de lumière et
  // d'ombre, et où prêter serment.
  factionLibre(ch, f) {
    const s = answerWith('faction');
    const carte = id => {
      const d = Factions.def(id);
      return `<article class="vy-faction-carte vy-faction-carte--${id}">${embleme(id, 52)}<h3>${esc(d.Nom)}</h3>
        <p class="vy-faction-carte__cap">${esc(d.capitale)} · ${esc(d.couleurs)}</p>
        <dl><dt>Ce qu'elle veut</dt><dd>${esc(d.veut)}</dd><dt>Ce qu'elle a de juste</dt><dd>${esc(d.juste)}</dd><dt>Son côté sombre</dt><dd>${esc(d.sombre)}</dd><dt>Ses ordres</dt><dd>${d.orders.map(o => esc(o.name.replace(/^les /, ''))).join(', ')}</dd></dl>
        <p class="vy-faction-carte__rangs"><small>Rangs : ${esc(d.ranks[0])} → ${esc(d.ranks[d.ranks.length - 1])}</small></p></article>`;
    };
    let ou = '';
    if (s) {
      const npc = Quests.answerNpc(s, s.steps.find(x => x.type === 'answer'));
      const need = (s.requires && s.requires.quests || []).filter(id => !ch.quests.done.includes(id)).map(id => Quests.get(id)).filter(Boolean);
      let etat;
      if (ch.quests.active[s.id]) etat = `${esc(Quests.npcName(npc))} attend ta réponse.`;
      else if (ch.level < Factions.SWEAR_LEVEL) etat = `Tu es niveau ${ch.level} : le serment s'ouvre au niveau ${Factions.SWEAR_LEVEL}.`;
      else if (need.length) etat = `Termine d'abord ${need.map(q => `« ${esc(q.name)} »`).join(', ')}.`;
      else etat = `${esc(Quests.npcName(npc))} t'attend : tu peux prêter serment, ou refuser encore.`;
      ou = `<div class="vy-sous"><span>Où prêter serment</span></div><p class="vy-note">Devant ${esc(qui(npc))}, en terrain neutre : la quête « ${esc(s.name)} », au niveau ${Factions.SWEAR_LEVEL}. Refuser ne ferme rien : la route de Kaldum reste ouverte, et le serment reste possible plus tard.</p><p class="vy-faction__etat">${etat}</p>`;
    }
    const passe = f.renounced ? `<p class="muted vy-note">Tu as renié un serment (${f.renounced} fois). Ton prochain serment commencera au rang ${Factions.rankFor(f.points)}.</p>` : '';
    const prelude = Quests.tracker(ch).filter(t => t.quest.category === 'faction');
    const enCours = prelude.length ? `<div class="vy-sous"><span>Le prélude en cours</span></div>${prelude.map(t => `<div class="vy-ligne-quete"><b>${esc(t.quest.name)}</b><small>${esc(t.text)}</small></div>`).join('')}` : '';
    return `<p class="vy-note vy-faction__intro">Deux factions se disputent les Voiles. Aucune n'est « gentille » : chacune a raison sur un point et tort sur un autre. Au niveau ${Factions.SWEAR_LEVEL}, tu prêteras serment à l'une, ou tu refuseras.</p>
      <div class="vy-faction-cartes">${Factions.IDS.map(carte).join('')}</div>${ou}${passe}${enCours}`;
  },

  // Les Francs-Marcheurs : une confiance, pas un rang.
  factionMarcheurs(ch, f) {
    const M = Factions.MARCHEURS, t = Factions.tier(f.marcheurs);
    const jauge = t.next ? Util.jauge('faction', f.marcheurs - t.at, t.next.at - t.at, `${f.marcheurs} / ${t.next.at}`, 'Confiance des Francs-Marcheurs', 'vy-jauge--marcheurs') : Util.jauge('faction', 1, 1, `${f.marcheurs}`, 'Confiance des Francs-Marcheurs', 'vy-jauge--marcheurs');
    return `<div class="vy-sous"><span>Les Francs-Marcheurs</span><small class="muted">neutres</small></div>
      <div class="vy-marcheurs"><div><b>${esc(t.name)}</b> <small class="muted">${t.next ? `prochain : ${esc(t.next.name)} à ${t.next.at}` : 'la confiance la plus haute'}</small></div>${jauge}
      <p class="muted vy-note">${esc(M.texte)} ${esc(M.neutres)}</p></div>`;
  },

  // Le reniement, depuis la fenêtre : une confirmation forte (ce qu'on perd, une case à cocher),
  // puis la quête « Le reniement » commence ; il se fait devant la guetteuse de la Passe.
  openRenier() {
    const ch = this.world.ch, f = Factions.of(ch);
    const ren = answerWith('renounce');
    if (!Factions.isSworn(ch) || !ren) return;
    const d = Factions.def(f.id);
    const apres = Factions.rankFor(Math.max(0, f.points - Factions.RENOUNCE_RANKS * Factions.PER_RANK));
    const npc = Quests.answerNpc(ren, ren.steps[0]);
    const pertes = Quests.tracker(ch).filter(t => t.quest.requires && t.quest.requires.faction);
    this.actions.renierCoche = (x, b) => { const go = this.el.panelBody.querySelector('[data-act="renierGo"]'); if (go) go.disabled = !b.checked; };
    this.actions.renierGo = () => {
      this.closePanel();
      if (this.world.acceptQuest(ren.id)) this.toast(`${ren.name} : va voir ${qui(npc)}.`);
      if (this.fen.isOpen('faction')) this.fen.render('faction');
    };
    this.actions.renierNon = () => this.closePanel();
    this.openPanel('renier', 'Renier ton serment ?', `<div class="vy-renier">${embleme(f.id, 56)}
      <p>Renier ${esc(d.nom)}, c'est perdre <b>deux rangs</b> : de <b>${esc(Factions.title(f.id, f.rank))}</b> (rang ${f.rank}), ton prochain serment repartira au rang ${apres}.</p>
      <ul><li>Ton ordre${f.order ? ` (${esc(Factions.orderDef(f.id, f.order).name)})` : ''} et tes titres de rang ${esc(d.du)} s'en vont.</li>
      <li>${pertes.length ? `Les quêtes en cours de ta faction sont perdues : ${pertes.map(t => esc(t.quest.name)).join(', ')}.` : 'Les quêtes déjà faites restent faites ; on ne les refait pas.'}</li>
      <li>Le reniement se fait devant ${esc(qui(npc))}. Tu pourras encore changer d'avis là-bas.</li></ul>
      <label class="vy-coche"><input type="checkbox" data-act="renierCoche"> Je comprends : je perds deux rangs et mon ordre.</label>
      <div class="dialogue-actions"><button class="vy-bouton vy-bouton--danger" data-act="renierGo" disabled>Aller renier ${esc(d.nom)}</button><button class="vy-bouton vy-bouton--fantome" data-act="renierNon">Garder mon serment</button></div></div>`);
  },

  // ----- Étapes de choix, dans le dialogue -----

  // Une étape de choix auprès de ce PNJ : l'écran solennel s'il s'agit du serment, sinon les
  // réponses en boutons (celles qui coûtent demandent deux appuis).
  openAnswer(npc, questId, pick) {
    const ch = this.world.ch, q = Quests.get(questId), st = Quests.state(ch, questId);
    const s = q && st && q.steps[st.step];
    if (!s || s.type !== 'answer') { this.actions.back(); return; }
    this.el.panelTitle.textContent = q.name;
    const serment = s.options.filter(o => (o.effects || []).some(e => e.type === 'faction'));
    this.actions.answerPick = d => this.openAnswer(npc, questId, d.opt);
    this.actions.answerOpt = (d, b) => {
      const opt = s.options.find(o => o.id === d.opt);
      if (!opt) return;
      if ((opt.effects || []).some(e => e.type === 'renounce') && !b.dataset.sure) { b.dataset.sure = '1'; b.textContent = `Confirmer : ${opt.text.toLowerCase()}`; return; }
      const r = this.world.answerQuest(questId, opt.id);
      if (!r || !r.ok) { this.openAnswer(npc, questId, pick); return; }
      this.answerDone(npc, q, opt, r);
    };
    const voix = `<div class="vy-serment__voix"><div class="npc-face look-${npc.def.look || 'marcheur'}"></div><div><b>${esc(npc.def.name)}</b><p>${(s.prompt || []).map(esc).join('<br>')}</p></div></div>`;
    if (!serment.length) {
      const btns = s.options.map(o => `<button class="vy-bouton ${(o.effects || []).some(e => e.type === 'renounce') ? 'vy-bouton--danger' : (o.effects || []).some(e => e.type === 'later') ? 'vy-bouton--fantome' : 'vy-bouton--primaire'}" data-act="answerOpt" data-opt="${o.id}">${esc(o.text)}</button>`).join('');
      this.el.panelBody.innerHTML = `<div class="vy-choix">${voix}<div class="dialogue-actions">${btns}</div></div>`;
      return;
    }
    // Le serment : les deux bannières ; on en touche une, puis on prête serment.
    const banniere = o => {
      const id = o.effects.find(e => e.type === 'faction').id, d = Factions.def(id);
      return `<button class="vy-banniere vy-banniere--${id}${pick === o.id ? ' on' : ''}" data-act="answerPick" data-opt="${o.id}" aria-pressed="${pick === o.id}">
        <span class="vy-banniere__tete">${embleme(id, 54)}<span class="vy-banniere__nom">${esc(d.Nom)}</span></span>
        <span class="vy-banniere__veut">${esc(d.veut)}</span>
        <span class="vy-banniere__cote vy-banniere__cote--juste">${esc(d.juste)}</span>
        <span class="vy-banniere__cote vy-banniere__cote--sombre">${esc(d.sombre)}</span>
        <span class="vy-banniere__ordres">${d.orders.map(x => esc(x.name.replace(/^les /, ''))).join(' · ')}</span></button>`;
    };
    const autres = s.options.filter(o => !serment.includes(o));
    const choisi = serment.find(o => o.id === pick);
    this.el.panelBody.innerHTML = `<div class="vy-serment">${voix}
      <div class="vy-serment__bannieres">${serment.map(banniere).join('')}</div>
      <div class="vy-serment__pied">${choisi ? `<button class="vy-bouton vy-bouton--primaire" data-act="answerOpt" data-opt="${choisi.id}">${esc(choisi.text)}</button>` : '<span class="muted">Touche une bannière pour la choisir.</span>'}
        ${autres.map(o => `<button class="vy-bouton vy-bouton--fantome" data-act="answerOpt" data-opt="${o.id}">${esc(o.text)}</button>`).join('')}</div></div>`;
  },

  // Après une réponse : la fin de la quête si elle s'est rendue, sinon la réplique du PNJ.
  answerDone(npc, q, opt, r) {
    const reply = opt.reply || [];
    const sworn = (r.events || []).find(e => e.type === 'serment');
    if (r.completed) {
      let html = this.questDoneHtml(npc, q, r.completed, reply);
      if (sworn) {
        const d = Factions.def(sworn.faction), rang = (r.events || []).filter(e => e.type === 'rang').pop();
        html = `<div class="vy-serment-fait vy-serment-fait--${sworn.faction}">${embleme(sworn.faction, 76)}<div><b>Tu as prêté serment ${esc(d.au)}.</b><small>${rang ? `Rang ${rang.rank} : ${esc(rang.title)}. ` : ''}${esc(d.insigne)}</small></div></div>` + html;
      }
      this.el.panelBody.innerHTML = html;
      return;
    }
    this.el.panelBody.innerHTML = `<div class="dialogue"><div class="npc-face look-${npc.def.look || 'marcheur'}"></div><div class="npc-text"><b>${esc(npc.def.name)}</b><p>${reply.map(esc).join('<br>') || '…'}</p></div></div>
      <div class="dialogue-actions"><button data-act="back">Continuer</button></div>`;
  },
});
})();
