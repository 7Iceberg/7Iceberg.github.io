// La discussion : le fil de ce qui arrive, en haut à gauche de la scène. Ouverte, un panneau
// translucide avec ses petits onglets (Tout, Système, Quêtes, Butin, Combat, PNJ) ; repliée, les
// trois dernières lignes flottent en bas à gauche, puis s'effacent. Elle écrit ce que racontent le
// monde (quêtes, gains, relais, niveaux, succès), le combat (sorts lancés, PV perdus), les PNJ, et
// toute ligne qu'un autre module lui envoie par l'événement 'veylan:chat' (detail { type, text }).
class Discussion {
  constructor(hud) {
    this.hud = hud;
    this.lignes = [];
    this.filtre = 'tout';
    this.nonLues = 0;
    const stage = document.getElementById('stage');
    this.el = document.createElement('section');
    this.el.className = 'vy-discussion hidden';
    this.el.setAttribute('aria-label', 'Discussion');
    this.el.innerHTML =
      `<header class="vy-discussion__tete"><nav class="vy-discussion__onglets" aria-label="Filtrer">${Discussion.TYPES.map(([k, l]) => `<button type="button" class="vy-discussion__onglet vy-chat--${k}" data-filtre="${k}" aria-pressed="${k === 'tout'}">${l}</button>`).join('')}</nav>` +
      `<button type="button" class="vy-discussion__fermer" aria-label="Replier la discussion">${Fenetres.ICON.reduire}</button></header>` +
      '<div class="vy-discussion__lignes" role="log" aria-live="polite"></div>';
    this.flottant = document.createElement('div');
    this.flottant.className = 'vy-discussion__flottant';
    this.flottant.setAttribute('aria-hidden', 'true');
    // Hors du téléphone en paysage (où le panneau de jeu a son bouton), un bouton dans la scène.
    this.bouton = document.createElement('button');
    this.bouton.type = 'button';
    this.bouton.className = 'vy-discussion__bouton';
    this.bouton.setAttribute('aria-label', 'Discussion');
    this.bouton.innerHTML = Discussion.ICONE + '<span class="vy-discussion__compte" hidden></span>';
    stage.appendChild(this.flottant);
    stage.appendChild(this.el);
    stage.appendChild(this.bouton);
    this.liste = this.el.querySelector('.vy-discussion__lignes');
    this.el.querySelector('.vy-discussion__onglets').addEventListener('click', evt => {
      const b = evt.target.closest('[data-filtre]');
      if (!b) return;
      this.filtre = b.dataset.filtre;
      for (const o of this.el.querySelectorAll('[data-filtre]')) o.setAttribute('aria-pressed', String(o === b));
      this.rendre();
    });
    this.el.querySelector('.vy-discussion__fermer').addEventListener('click', () => this.fermer());
    this.bouton.addEventListener('click', () => this.basculer());
    this.ecouter();
  }

  // Les types de ligne et leur onglet ; la couleur de chacun est dans css/jeu.css.
  static get TYPES() { return [['tout', 'Tout'], ['systeme', 'Système'], ['quete', 'Quêtes'], ['butin', 'Butin'], ['combat', 'Combat'], ['pnj', 'PNJ']]; }

  static get ICONE() {
    return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 6.5A2.5 2.5 0 0 1 6.5 4h11A2.5 2.5 0 0 1 20 6.5v7a2.5 2.5 0 0 1-2.5 2.5H11l-4.5 4v-4h0A2.5 2.5 0 0 1 4 13.5z"/><path d="M8.5 10h.01M12 10h.01M15.5 10h.01"/></svg>';
  }

  get ouverte() { return !this.el.classList.contains('hidden'); }

  ouvrir() {
    this.el.classList.remove('hidden');
    this.nonLues = 0;
    this.compter();
    this.rendre();
    this.liste.scrollTop = this.liste.scrollHeight;
    document.body.classList.add('vy-discussion-ouverte');
    window.dispatchEvent(new CustomEvent('veylan:discussion', { detail: { ouverte: true } }));
  }

  fermer() {
    this.el.classList.add('hidden');
    document.body.classList.remove('vy-discussion-ouverte');
    window.dispatchEvent(new CustomEvent('veylan:discussion', { detail: { ouverte: false } }));
  }

  basculer() { if (this.ouverte) this.fermer(); else this.ouvrir(); }

  // Une ligne : son type (systeme, quete, butin, combat, pnj) et son texte, **gras** permis.
  ajouter(type, texte) {
    if (!texte) return;
    const known = Discussion.TYPES.some(t => t[0] === type && type !== 'tout');
    const t = new Date();
    const l = { type: known ? type : 'systeme', texte: String(texte), h: `${String(t.getHours()).padStart(2, '0')}:${String(t.getMinutes()).padStart(2, '0')}` };
    this.lignes.push(l);
    if (this.lignes.length > 160) this.lignes.shift();
    if (this.ouverte) {
      if (this.filtre === 'tout' || this.filtre === l.type) {
        const bas = this.liste.scrollHeight - this.liste.scrollTop - this.liste.clientHeight < 24;
        this.liste.insertAdjacentHTML('beforeend', this.ligneHtml(l));
        while (this.liste.children.length > 160) this.liste.firstChild.remove();
        if (bas) this.liste.scrollTop = this.liste.scrollHeight;
      }
    } else {
      this.nonLues++;
      this.compter();
      this.flotter(l);
    }
  }

  ligneHtml(l) {
    return `<p class="vy-chat vy-chat--${l.type}"><time>${l.h}</time> ${Parole.html(l.texte)}</p>`;
  }

  rendre() {
    const list = this.lignes.filter(l => this.filtre === 'tout' || l.type === this.filtre);
    this.liste.innerHTML = list.map(l => this.ligneHtml(l)).join('') || '<p class="vy-chat vy-chat--vide">Rien pour l\'instant.</p>';
    this.liste.scrollTop = this.liste.scrollHeight;
  }

  // Repliée : la ligne flotte quelques secondes, trois au plus, puis s'efface.
  flotter(l) {
    const p = document.createElement('p');
    p.className = `vy-chat vy-chat--${l.type}`;
    p.innerHTML = Parole.html(l.texte);
    this.flottant.appendChild(p);
    while (this.flottant.children.length > 3) this.flottant.firstChild.remove();
    setTimeout(() => p.classList.add('sort'), 6500);
    setTimeout(() => p.remove(), 7200);
  }

  compter() {
    const n = this.bouton.querySelector('.vy-discussion__compte');
    n.hidden = !this.nonLues;
    n.textContent = this.nonLues > 9 ? '9+' : String(this.nonLues);
    window.dispatchEvent(new CustomEvent('veylan:discussionNonLues', { detail: { n: this.nonLues } }));
  }

  // ----- Ce que le jeu raconte -----

  ecouter() {
    const hud = this.hud, w = hud.world, cb = hud.combat;
    const nom = id => { const q = Quests.get(id); return q ? q.name : id; };
    Bus.on('quest', d => {
      if (d.type === 'accept') this.ajouter('quete', `Nouvelle quête : **${nom(d.id)}**`);
      if (d.type === 'complete') this.ajouter('quete', `Quête terminée : **${nom(d.id)}**`);
    });
    Bus.on('questProgress', list => {
      const vus = new Set();
      for (const t of Array.isArray(list) ? list : []) {
        if (!t || !t.quest || vus.has(t.quest.id) || !w.ch.quests.active[t.quest.id]) continue;
        vus.add(t.quest.id);
        this.ajouter('quete', `Quête mise à jour : **${t.quest.name}**`);
      }
    });
    Bus.on('gain', d => {
      for (const it of d.items || []) {
        const def = Items.get(it.id);
        this.ajouter('butin', `Tu as obtenu ${it.count || 1} **${def ? def.name : it.id}**.`);
      }
      if (d.xp) this.ajouter('butin', `Tu as gagné ${d.xp} points d'expérience.`);
      if (d.fils) this.ajouter('butin', `Tu as gagné ${d.fils} Fils.`);
    });
    Bus.on('relay', () => this.ajouter('systeme', 'Position sauvegardée.'));
    Bus.on('levelUp', d => this.ajouter('systeme', `Tu passes au niveau **${d.level}** !`));
    // Les succès arrivent par « veylan:chat » (type succes, js/hud-recompenses.js), une ligne chacun.
    // Le combat : qui lance quoi, qui perd ou regagne des PV.
    cb.on('animCast', d => { if (w.showCombat && d && d.entity && d.spell) this.ajouter('combat', `${d.entity.name} lance **${d.spell.name}**.`); });
    cb.on('float', d => {
      if (!w.showCombat || !d || !/^[-+]\d+$/.test(String(d.text))) return;
      const t = cb.entities.find(e => e.alive && e.x === d.x && e.y === d.y) || cb.entities.find(e => e.x === d.x && e.y === d.y);
      if (t) this.ajouter('combat', `${t.name} : ${d.text} PV.`);
    });
    window.addEventListener('veylan:chat', e => { const d = (e && e.detail) || {}; if (d.text) this.ajouter(d.type, d.text); });
  }
}
