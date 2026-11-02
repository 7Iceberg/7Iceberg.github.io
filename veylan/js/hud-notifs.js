// Les notifications, d'après esx_notify (le relais des notifications du serveur Duality) :
//  - typées : information, succès, attention, erreur (une icône et une couleur par type, un petit
//    titre) ; le type vient de l'appel (Hud.toast(texte, type)) ou se déduit du texte ;
//  - les gains : une carte par gain (le butin d'un combat, la récompense d'une quête, une
//    récolte, un achat, une fabrication), les Fils en grand ; l'XP en bulles « +45 XP » qui
//    montent sur le côté ; le niveau supérieur garde son ruban (js/hud-jeu.js) ;
//  - les réglages, dans Options › Notifications : la position (huit places, ou celle du jeu), la
//    durée, le nombre à l'écran, la taille, le style (Verre, Minimal, Ruban), les bulles d'XP ;
//    rangés dans ce navigateur (veylan.notifs) ;
//  - pas de doublon : le même texte arrivé deux fois en 1,5 s ne s'affiche qu'une fois.
// Les sons restent pour plus tard (le jeu n'en a pas encore). Mise en page : css/notifs.css.
// Tests : F81 à F84 (tests/fenetres.js).
(() => {
  const CLE = 'veylan.notifs';
  const DEFAUT = { pos: 'auto', duree: 3, max: 4, taille: 100, style: 'verre', xp: true };
  const POSITIONS = [['auto', 'Celle du jeu'], ['haut-droite', 'En haut à droite'], ['haut-centre', 'En haut au centre'], ['haut-gauche', 'En haut à gauche'],
    ['milieu-droite', 'Au milieu à droite'], ['milieu-gauche', 'Au milieu à gauche'], ['bas-droite', 'En bas à droite'], ['bas-centre', 'En bas au centre'], ['bas-gauche', 'En bas à gauche']];
  const STYLES = [['verre', 'Verre'], ['minimal', 'Minimal'], ['ruban', 'Ruban']];
  const TITRES = { info: 'Information', succes: 'Succès', attention: 'Attention', erreur: 'Erreur' };
  const SOURCES = { combat: 'Butin du combat', quete: 'Récompense de quête', recolte: 'Récolte', achat: 'Achat', artisanat: 'Fabrication' };
  const svg = p => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${p}</svg>`;
  const ICONES = {
    info: svg('<circle cx="12" cy="12" r="9"/><path d="M12 11v5.5M12 7.6v.4"/>'),
    succes: svg('<circle cx="12" cy="12" r="9"/><path d="M8 12.4l2.8 2.8L16.4 9.4"/>'),
    attention: svg('<path d="M12 3.8 21.2 19.5H2.8z"/><path d="M12 10v4.4M12 16.9v.3"/>'),
    erreur: svg('<circle cx="12" cy="12" r="9"/><path d="M9 9l6 6M15 9l-6 6"/>'),
    gain: svg('<path d="M12 3.5l2.4 5 5.4.8-3.9 3.8.9 5.4L12 16l-4.8 2.5.9-5.4L4.2 9.3l5.4-.8z"/>'),
  };
  // Le type d'un message dont l'appel ne le dit pas, d'après sa tournure.
  const ERREUR = /^(Impossible|Pas assez|Pas pendant|Trop loin|Il manque|Il faut|Aucun|Aucune|Rien à|Plus d'|Choisis)|ne (va|peut) pas|illisible|invalide|est fermée?\b|fermé pour/i;
  const ATTENTION = /^Attention|surcharg|abandonné|corrigée|marquée/i;
  const SUCCES = /^(Code copié|Sauvegardé|Relais du Fil enregistré|Position sauvegardée|Ensemble|Caractéristiques enregistrées|Succès)|vendu :|terminé, à rendre|est arrivé|enregistrée?\.$/i;
  const typeDe = texte => ERREUR.test(texte) ? 'erreur' : ATTENTION.test(texte) ? 'attention' : SUCCES.test(texte) ? 'succes' : 'info';
  const borne = (v, a, b, d) => (Number.isFinite(+v) ? Math.max(a, Math.min(b, Math.round(+v))) : d);
  const nf = n => Number(n).toLocaleString('fr-FR');

  Object.assign(Hud.prototype, {
    initNotifs() {
      this.notifs = this.lireNotifs();
      this.notifsVues = new Map();
      this.appliquerNotifs();
      Bus.on('gain', d => this.annoncerGain(d));
    },

    lireNotifs() {
      const r = Object.assign({}, DEFAUT);
      let s = null;
      try { s = JSON.parse(localStorage.getItem(CLE) || 'null'); } catch (e) { s = null; }
      if (s && typeof s === 'object') {
        if (POSITIONS.some(p => p[0] === s.pos)) r.pos = s.pos;
        if (STYLES.some(p => p[0] === s.style)) r.style = s.style;
        r.duree = borne(s.duree, 2, 8, r.duree);
        r.max = borne(s.max, 1, 6, r.max);
        r.taille = borne(s.taille, 80, 130, r.taille);
        if (typeof s.xp === 'boolean') r.xp = s.xp;
      }
      return r;
    },
    garderNotifs() {
      try { localStorage.setItem(CLE, JSON.stringify(this.notifs)); } catch (e) { /* rien */ }
    },
    appliquerNotifs() {
      const r = this.notifs || (this.notifs = Object.assign({}, DEFAUT)), t = this.el.toasts;
      if (!t) return;
      if (r.pos === 'auto') delete t.dataset.pos; else t.dataset.pos = r.pos;
      t.dataset.style = r.style;
      if (r.taille === 100) t.style.removeProperty('--notif-z'); else t.style.setProperty('--notif-z', String(r.taille / 100));
      while (t.children.length > r.max) t.firstChild.remove();
    },

    // Pose une carte : au plus `max` à l'écran (les plus anciennes partent), retirée après `ms`.
    poserNotif(el, ms) {
      const r = this.notifs || DEFAUT, t = this.el.toasts;
      t.appendChild(el);
      while (t.children.length > r.max) t.firstChild.remove();
      setTimeout(() => { el.classList.add('out'); setTimeout(() => el.remove(), 400); }, ms);
    },

    // Un message : le type donné ou déduit ; le même texte en 1,5 s ne s'affiche qu'une fois.
    toast(text, type) {
      const texte = String(text == null ? '' : text);
      if (this.pushJournal) this.pushJournal('evenements', texte);
      const maintenant = Date.now(), vu = this.notifsVues && this.notifsVues.get(texte);
      if (vu && maintenant - vu < 1500) return null;
      if (this.notifsVues) {
        this.notifsVues.set(texte, maintenant);
        if (this.notifsVues.size > 40) for (const [k, v] of this.notifsVues) if (maintenant - v > 1500) this.notifsVues.delete(k);
      }
      const k = TITRES[type] ? type : typeDe(texte);
      const t = document.createElement('div');
      t.className = 'toast vy-notif';
      t.dataset.type = k;
      t.setAttribute('role', k === 'erreur' || k === 'attention' ? 'alert' : 'status');
      t.innerHTML = `<span class="vy-notif__ico">${ICONES[k]}</span><span class="vy-notif__texte"><small>${TITRES[k]}</small><span></span></span>`;
      t.querySelector('.vy-notif__texte > span').textContent = texte;
      this.poserNotif(t, ((this.notifs || DEFAUT).duree) * 1000 - 200);
      return t;
    },

    // Un gain : une carte (les Fils en grand, les objets en dessous) ; l'XP en bulle sur le côté
    // (ou dans la carte, si les bulles sont coupées).
    annoncerGain(d) {
      if (!d || !this.el.toasts) return;
      const r = this.notifs || DEFAUT;
      const objets = (d.items || []).filter(it => it && it.id).map(it => { const def = Items.get(it.id); return `${def ? def.name : it.id}${(it.count || 1) > 1 ? ' ×' + it.count : ''}`; });
      const xp = d.xp > 0 ? d.xp : 0, fils = d.fils > 0 ? d.fils : 0;
      if (xp && r.xp) this.bulleXp(xp);
      const xpCarte = xp && !r.xp;
      if (!fils && !objets.length && !xpCarte) return;
      const t = document.createElement('div');
      t.className = 'toast vy-notif vy-notif--gain';
      t.dataset.type = 'gain';
      t.setAttribute('role', 'status');
      const liste = objets.slice(0, 3).join(' · ') + (objets.length > 3 ? ` et ${objets.length - 3} autre${objets.length > 4 ? 's' : ''}` : '');
      const titre = d.source === 'quete' && !xp && !fils ? 'Objet de quête' : (SOURCES[d.source] || 'Gain');
      t.innerHTML = `<span class="vy-notif__ico">${ICONES.gain}</span><span class="vy-notif__texte"><small>${titre}</small>` +
        (fils ? `<b class="vy-notif__fils">+${nf(fils)} <i>Fils</i></b>` : '') +
        (xpCarte ? `<b class="vy-notif__xp">+${nf(xp)} XP</b>` : '') +
        (liste ? `<span class="vy-notif__objets"></span>` : '') + '</span>';
      if (liste) t.querySelector('.vy-notif__objets').textContent = liste;
      t.setAttribute('aria-label', [titre, fils ? `${fils} Fils` : '', xpCarte ? `${xp} XP` : '', liste].filter(Boolean).join(', '));
      this.poserNotif(t, (r.duree + 1.2) * 1000);
    },

    // « +45 XP » qui monte et s'efface sur le côté de la scène.
    bulleXp(xp) {
      const stage = document.getElementById('stage');
      if (!stage) return;
      let box = document.getElementById('bulles-xp');
      if (!box) { box = document.createElement('div'); box.id = 'bulles-xp'; box.className = 'vy-bulles-xp'; box.setAttribute('aria-hidden', 'true'); stage.appendChild(box); }
      const b = document.createElement('span');
      b.className = 'vy-bulle-xp';
      b.textContent = `+${nf(xp)} XP`;
      box.appendChild(b);
      while (box.children.length > 4) box.firstChild.remove();
      setTimeout(() => b.remove(), 2200);
    },

    // Options › Notifications.
    optionsNotifs() {
      const r = this.notifs || DEFAUT;
      const pos = POSITIONS.map(([v, l]) => `<option value="${v}"${r.pos === v ? ' selected' : ''}>${l}</option>`).join('');
      const styles = STYLES.map(([v, l]) => `<button class="vy-notif-style${r.style === v ? ' on' : ''}" data-act="notifStyle" data-style="${v}" aria-pressed="${r.style === v}">${l}</button>`).join('');
      const curseur = (id, label, v, min, max, pas, unite) => `<div class="row vy-reglage"><label for="${id}">${label}</label><input type="range" id="${id}" min="${min}" max="${max}" step="${pas}" value="${v}" style="--v:${v};--min:${min};--max:${max}" aria-valuetext="${v}${unite}"><output for="${id}">${v}${unite}</output></div>`;
      return `<h4>Notifications</h4>
        <div class="row"><label for="notif-pos">Position</label><select id="notif-pos" aria-label="Position des notifications">${pos}</select></div>
        <div class="row"><span>Style</span><span class="vy-notif-styles" role="group" aria-label="Style des notifications">${styles}</span></div>
        ${curseur('notif-duree', 'Durée', r.duree, 2, 8, 1, ' s')}
        ${curseur('notif-max', 'À l\'écran', r.max, 1, 6, 1, '')}
        ${curseur('notif-taille', 'Taille', r.taille, 80, 130, 5, ' %')}
        <div class="row"><label class="vy-coche"><input type="checkbox" id="notif-xp" ${r.xp ? 'checked' : ''}> Bulles d'XP</label><button data-act="notifEssai">Essayer</button></div>`;
    },
    // Un champ des Options a changé : vrai s'il était à nous.
    champNotifs(el, kind) {
      const r = this.notifs || (this.notifs = Object.assign({}, DEFAUT));
      const id = el.id;
      if (id === 'notif-duree' || id === 'notif-max' || id === 'notif-taille') {
        const k = { 'notif-duree': ['duree', 2, 8, ' s'], 'notif-max': ['max', 1, 6, ''], 'notif-taille': ['taille', 80, 130, ' %'] }[id];
        r[k[0]] = borne(el.value, k[1], k[2], DEFAUT[k[0]]);
        el.style.setProperty('--v', r[k[0]]); el.setAttribute('aria-valuetext', `${r[k[0]]}${k[3]}`);
        const o = el.parentNode.querySelector('output'); if (o) o.textContent = `${r[k[0]]}${k[3]}`;
      } else if (id === 'notif-pos' && kind === 'change') r.pos = POSITIONS.some(p => p[0] === el.value) ? el.value : 'auto';
      else if (id === 'notif-xp' && kind === 'change') r.xp = el.checked;
      else return false;
      this.appliquerNotifs();
      if (kind === 'change') this.garderNotifs();
      return true;
    },
    styleNotifs(style) {
      this.notifs.style = STYLES.some(p => p[0] === style) ? style : 'verre';
      this.appliquerNotifs();
      this.garderNotifs();
    },
    essaiNotifs() {
      this.notifsVues = new Map();
      this.toast('Position sauvegardée.', 'succes');
      this.toast('Le chemin passe par la Porte des Clairières.', 'info');
      this.toast('Tu approches de tes pods maximum.', 'attention');
      this.toast('Pas pendant un combat.', 'erreur');
      this.annoncerGain({ source: 'combat', xp: 45, fils: 120, items: [{ id: 'plume_de_pilou', count: 2 }] });
    },
  });
})();
