// Les dialogues : le texte balisé et son écriture lettre à lettre (Parole), la boîte au grand
// portrait (GuideBoite, celle du guide et des dialogues de quête), la bulle d'un PNJ au-dessus de
// sa tête et la boîte de réponses (BullePnj), et la conversation avec un PNJ (Conversation, ouverte
// par js/hud.js quand le monde émet 'dialogue'). Tout ce qui s'ancre au monde passe par
// UI.cellClient (js/ui.js) et suit la caméra.

// ----- Le texte des bulles : **gras**, {style|mot en couleur}, et l'écriture lettre à lettre -----
const Parole = {
  STYLES: ['pa', 'pm', 'pv', 'cristal', 'or', 'voile', 'braise'],

  // Découpe un texte balisé en segments { text, gras, style }.
  segments(markup) {
    const out = [];
    const re = /\*\*(.+?)\*\*|\{([a-z]+)\|([^}]*)\}/g;
    let last = 0, m;
    const src = String(markup || '');
    while ((m = re.exec(src))) {
      if (m.index > last) out.push({ text: src.slice(last, m.index) });
      if (m[1] != null) {
        // Un mot en couleur peut se trouver dans du gras : {pv|...} reste lisible.
        const inner = /^\{([a-z]+)\|([^}]*)\}$/.exec(m[1]);
        out.push(inner ? { text: inner[2], gras: true, style: Parole.STYLES.includes(inner[1]) ? inner[1] : null } : { text: m[1], gras: true });
      } else out.push({ text: m[3], style: Parole.STYLES.includes(m[2]) ? m[2] : null, gras: true });
      last = re.lastIndex;
    }
    if (last < src.length) out.push({ text: src.slice(last) });
    return out;
  },

  // Texte brut, sans balises (pour les lecteurs d'écran et la discussion).
  brut(markup) { return Parole.segments(markup).map(s => s.text).join(''); },

  // HTML complet d'un texte balisé.
  html(markup) {
    return Parole.segments(markup).map(s => {
      const t = Util.esc(s.text);
      if (!s.gras && !s.style) return t;
      return `<b class="vy-mot${s.style ? ' vy-mot--' + s.style : ''}">${t}</b>`;
    }).join('');
  },

  // Écrit le texte lettre à lettre dans `el` ; un toucher l'achève. Retourne { fini, finir, arreter }.
  ecrire(el, markup, opts) {
    opts = opts || {};
    const segs = Parole.segments(markup);
    el.setAttribute('aria-label', Parole.brut(markup));
    el.innerHTML = segs.map(s => {
      const cls = s.gras || s.style ? `vy-mot${s.style ? ' vy-mot--' + s.style : ''}` : '';
      // La part encore cachée garde sa place : le texte ne bouge pas en s'écrivant.
      return `<span class="${cls}" aria-hidden="true"><span class="vy-parole__vu"></span><span class="vy-parole__reste">${Util.esc(s.text)}</span></span>`;
    }).join('');
    const parts = [...el.children].map((sp, i) => ({ vu: sp.firstChild, reste: sp.lastChild, text: segs[i].text }));
    const total = segs.reduce((n, s) => n + s.text.length, 0);
    const vitesse = opts.vitesse || 62;
    let raf = null, start = null, done = false;
    const show = k => {
      let left = k;
      for (const p of parts) {
        const take = Math.max(0, Math.min(p.text.length, left));
        left -= p.text.length;
        if (p.shown === take) continue;
        p.shown = take;
        p.vu.textContent = p.text.slice(0, take);
        p.reste.textContent = p.text.slice(take);
      }
    };
    const finish = () => {
      if (done) return;
      done = true;
      if (raf) cancelAnimationFrame(raf);
      raf = null;
      show(total);
      if (opts.fin) opts.fin();
    };
    const calme = opts.instant || (typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches);
    if (calme || !total) finish();
    else {
      show(0);
      const tick = now => {
        if (start == null) start = now;
        const n = Math.floor((now - start) / 1000 * vitesse);
        if (n >= total) { finish(); return; }
        show(n);
        raf = requestAnimationFrame(tick);
      };
      raf = requestAnimationFrame(tick);
    }
    return { fini: () => done, finir: finish, arreter: () => { if (raf) cancelAnimationFrame(raf); raf = null; done = true; } };
  },

  // Le buste d'un PNJ, peint en grand par le peintre vectoriel (js/render.js, drawNpc) : net à
  // toute taille. Une lueur de lanterne derrière la tête, et le visage, là où le peintre ne met
  // que deux points : yeux, sourcils, nez, bouche, joues, et le col. `humeur` : 'neutre', 'joie',
  // 'grave'.
  portrait(canvas, def, painter, humeur) {
    const css = canvas.getBoundingClientRect();
    const w = Math.max(40, Math.round(css.width || canvas.clientWidth || 150));
    const h = Math.max(40, Math.round(css.height || canvas.clientHeight || 160));
    const dpr = Math.min(3, (typeof devicePixelRatio === 'number' && devicePixelRatio) || 1);
    canvas.width = Math.round(w * dpr);
    canvas.height = Math.round(h * dpr);
    const c = canvas.getContext('2d');
    c.setTransform(dpr, 0, 0, dpr, 0, 0);
    c.clearRect(0, 0, w, h);
    if (!painter || typeof painter.drawNpc !== 'function') return;
    // Le buste tient de la plume du casque (42 + 15) au bas du torse (8) : 50 unités du plateau.
    const S = Math.min(h / 50, w / 30);
    const look = (def && def.look) || 'marcheur';
    const small = look === 'enfant' ? 0.82 : 1;
    const head = { x: w / 2, y: h + 10 * S - 40 * S * small };
    const halo = c.createRadialGradient(head.x, head.y, 2, head.x, head.y, 24 * S);
    halo.addColorStop(0, 'rgba(242,177,52,0.34)'); halo.addColorStop(0.55, 'rgba(242,177,52,0.1)'); halo.addColorStop(1, 'rgba(242,177,52,0)');
    c.fillStyle = halo; c.fillRect(0, 0, w, h);
    c.save();
    c.translate(w / 2, h + 10 * S);
    c.scale(S, S);
    c.lineJoin = 'round'; c.lineCap = 'round';
    try { painter.drawNpc(c, { x: 0, y: 0 }, { look, phase: 0 }, 0); } catch (e) { /* le peintre n'est pas prêt */ }
    c.scale(small, small);
    const top = -42, ink = '#2a2433';
    // Les yeux en amande, par-dessus les deux points du peintre : le regard vers la boîte, un
    // point de lumière, la paupière à l'encre. Puis les joues et le nez.
    for (const sx of [-1, 1]) {
      const ex = 3.2 * sx, ey = top + 3.4;
      c.save();
      c.beginPath(); c.ellipse(ex, ey, 1.95, 1.3, 0, 0, Math.PI * 2);
      c.fillStyle = '#fff8ec'; c.fill();
      c.clip();
      c.fillStyle = '#4a3328'; c.beginPath(); c.arc(ex + 0.35, ey + 0.1, 1.15, 0, Math.PI * 2); c.fill();
      c.fillStyle = '#140e17'; c.beginPath(); c.arc(ex + 0.42, ey + 0.15, 0.56, 0, Math.PI * 2); c.fill();
      c.restore();
      c.fillStyle = '#ffffff'; c.beginPath(); c.arc(ex + 0.78, ey - 0.38, 0.36, 0, Math.PI * 2); c.fill();
      c.strokeStyle = ink; c.lineWidth = 0.7;
      c.beginPath(); c.moveTo(ex - 2.1, ey + 0.2); c.quadraticCurveTo(ex, ey - 2.05, ex + 2.1, ey + 0.1); c.stroke();
      c.fillStyle = 'rgba(232, 116, 96, 0.26)';
      c.beginPath(); c.ellipse(5.4 * sx, top + 6.1, 1.9, 1.15, 0, 0, Math.PI * 2); c.fill();
    }
    c.strokeStyle = 'rgba(150, 92, 70, 0.8)'; c.lineWidth = 0.6;
    c.beginPath(); c.moveTo(0.3, top + 4.3); c.quadraticCurveTo(1.1, top + 5.3, 0.1, top + 5.6); c.stroke();
    const B ={ neutre: [[-4.8, 1.0], [-1.9, 0.8]], joie: [[-4.8, 0.7], [-1.9, 0.0]], grave: [[-4.8, 0.3], [-1.9, 1.5]] }[humeur] || [[-4.8, 1.0], [-1.9, 0.8]];
    c.strokeStyle = ink; c.lineWidth = 1.05;
    for (const sx of [1, -1]) { c.beginPath(); c.moveTo(B[0][0] * sx, top + B[0][1]); c.lineTo(B[1][0] * sx, top + B[1][1]); c.stroke(); }
    c.lineWidth = 0.9;
    c.beginPath();
    if (humeur === 'grave') { c.moveTo(-1.6, top + 7.1); c.lineTo(1.6, top + 7.1); }
    else if (humeur === 'joie') { c.moveTo(-2.6, top + 6.4); c.quadraticCurveTo(0, top + 9, 2.6, top + 6.4); }
    else { c.moveTo(-1.8, top + 6.7); c.quadraticCurveTo(0, top + 7.7, 1.8, top + 6.7); }
    c.stroke();
    // Le col, cousu d'or : le Fil, chez tous ceux qui le servent (la barbe de l'ancien le cache).
    if (look !== 'ancien') {
      c.fillStyle = 'rgba(239, 230, 212, 0.95)';
      c.beginPath();
      c.moveTo(-7.2, top + 12.8); c.lineTo(-4.4, top + 12); c.lineTo(0, top + 14.8); c.lineTo(4.4, top + 12); c.lineTo(7.2, top + 12.8); c.lineTo(0, top + 17.4);
      c.closePath(); c.fill();
      c.strokeStyle = '#e2c690'; c.lineWidth = 0.85;
      c.beginPath(); c.moveTo(-7.2, top + 12.8); c.lineTo(0, top + 17.4); c.lineTo(7.2, top + 12.8); c.stroke();
    }
    c.restore();
  },
};

// ----- La boîte du guide : grand portrait debout sur une boîte claire, bandeau du nom -----
// Elle sert au guide du tutoriel et aux dialogues de quête (js/hud.js). opts : { onTap(k) où k vaut
// 'suite', 'passer' ou 'fermer' ; passer : bouton « Passer » ; cls : classe en plus }.
class GuideBoite {
  constructor(host, opts) {
    opts = opts || {};
    this.el = document.createElement('div');
    this.el.className = 'vy-guide hidden' + (opts.cls ? ' ' + opts.cls : '');
    this.el.setAttribute('role', 'dialog');
    this.el.innerHTML =
      '<canvas class="vy-guide__portrait" aria-hidden="true"></canvas>' +
      '<div class="vy-guide__boite">' +
      '<div class="vy-guide__nom"><span class="vy-guide__qui"></span>' +
      '<button class="vy-guide__passer" type="button">Passer</button>' +
      `<button class="vy-guide__fermer" type="button" aria-label="Fermer">${Fenetres.ICON.fermer}</button></div>` +
      '<p class="vy-guide__texte" aria-live="polite"></p><p class="vy-guide__note"></p><div class="vy-guide__choix"></div>' +
      '<span class="vy-guide__suite" aria-hidden="true"></span></div>';
    host.appendChild(this.el);
    this.q = s => this.el.querySelector(s);
    const tap = k => { if (opts.onTap) opts.onTap(k); };
    this.q('.vy-guide__boite').addEventListener('click', evt => {
      if (evt.target.closest('button')) return;
      if (this.ecriture && !this.ecriture.fini()) { this.ecriture.finir(); return; }
      tap('suite');
    });
    this.q('.vy-guide__passer').addEventListener('click', evt => {
      const b = evt.currentTarget;
      if (!b.dataset.sure) { b.dataset.sure = '1'; b.textContent = 'Passer le tutoriel ?'; clearTimeout(this.sureT); this.sureT = setTimeout(() => { delete b.dataset.sure; b.textContent = 'Passer'; }, 3500); return; }
      delete b.dataset.sure; b.textContent = 'Passer';
      tap('passer');
    });
    this.q('.vy-guide__fermer').addEventListener('click', () => tap('fermer'));
    this.q('.vy-guide__choix').addEventListener('click', evt => {
      const b = evt.target.closest('[data-i]');
      const c = b && this.choix && this.choix[Number(b.dataset.i)];
      if (!c) return;
      if (this.ecriture && !this.ecriture.fini()) this.ecriture.finir();
      c.action();
    });
  }

  get visible() { return !this.el.classList.contains('hidden'); }

  // o : { npc (définition), texte (balisé), note (petite ligne), suite (vrai : on attend un toucher),
  // choix: [{ label, act, primaire, action }], humeur, painter, passer, fermer, instant }
  montrer(o) {
    const n = o.npc || {};
    const choix = o.choix || [];
    this.choix = choix;
    this.el.classList.remove('hidden');
    this.el.classList.toggle('attend', !!o.suite);
    const sig = [n.id, o.texte, o.note || '', o.humeur, choix.map(c => c.label + (c.act || '')).join('|'), o.passer ? 1 : 0, o.fermer ? 1 : 0].join('§');
    if (sig === this.sig) return;
    const sameText = this.sig && this.texteSig === [n.id, o.texte].join('§');
    this.sig = sig;
    this.texteSig = [n.id, o.texte].join('§');
    this.el.setAttribute('aria-label', n.name || 'Dialogue');
    this.q('.vy-guide__qui').innerHTML = `${Util.esc(n.name || '')}${n.title ? ` <small>${Util.esc(n.title)}</small>` : ''}`;
    this.q('.vy-guide__choix').innerHTML = choix.map((c, i) => `<button type="button" class="vy-bouton vy-bouton--petit${c.primaire ? ' vy-bouton--primaire' : ''}" data-i="${i}"${c.act ? ` data-act="${Util.esc(c.act)}"` : ''}>${Util.esc(c.label)}</button>`).join('');
    this.q('.vy-guide__choix').hidden = !choix.length;
    const note = this.q('.vy-guide__note');
    note.innerHTML = o.note ? Parole.html(o.note) : '';
    note.hidden = !o.note;
    this.q('.vy-guide__passer').hidden = !o.passer;
    this.q('.vy-guide__fermer').hidden = !o.fermer;
    if (!sameText) {
      if (this.ecriture) this.ecriture.arreter();
      this.ecriture = Parole.ecrire(this.q('.vy-guide__texte'), o.texte || '', { instant: o.instant });
    }
    const cv = this.q('.vy-guide__portrait');
    const pkey = [n.look, o.humeur, cv.clientWidth, cv.clientHeight].join('|');
    if (pkey !== this.pkey || !cv.width) {
      this.pkey = pkey;
      requestAnimationFrame(() => { if (cv.clientWidth) Parole.portrait(cv, n, o.painter, o.humeur || 'neutre'); else this.pkey = null; });
    }
  }

  cacher() {
    if (!this.visible) return;
    this.el.classList.add('hidden');
    this.sig = null;
    this.texteSig = null;
    if (this.ecriture) this.ecriture.arreter();
  }

  // Le côté de la scène : 'gauche' (par défaut) ou 'droite', pour ne pas cacher un repère.
  cote(c) { this.el.dataset.cote = c === 'droite' ? 'droite' : 'gauche'; }
  rect() { return this.visible ? this.q('.vy-guide__boite').getBoundingClientRect() : null; }
}

// ----- La bulle d'un PNJ au-dessus de sa tête, et la boîte de réponses en bas de la scène -----
class BullePnj {
  constructor(host, renderer) {
    this.renderer = renderer;
    this.bulle = document.createElement('div');
    this.bulle.className = 'vy-bulle-pnj hidden';
    this.bulle.innerHTML = '<div class="vy-bulle-pnj__nom"></div><p class="vy-bulle-pnj__texte"></p><span class="vy-bulle-pnj__suite" aria-hidden="true"></span>';
    this.rep = document.createElement('div');
    this.rep.className = 'vy-repliques hidden';
    this.rep.setAttribute('role', 'dialog');
    this.rep.setAttribute('aria-label', 'Réponses');
    this.rep.innerHTML = '<div class="vy-repliques__info"></div><div class="vy-repliques__liste" role="list"></div>' +
      `<button type="button" class="vy-repliques__fermer" aria-label="Fermer le dialogue">${Fenetres.ICON.fermer}</button>`;
    host.appendChild(this.bulle);
    host.appendChild(this.rep);
    this.bulle.addEventListener('click', () => {
      if (this.ecriture && !this.ecriture.fini()) { this.ecriture.finir(); return; }
      if (this.onSuite) this.onSuite();
    });
    this.rep.addEventListener('click', evt => {
      if (evt.target.closest('.vy-repliques__fermer')) { if (this.onFermer) this.onFermer(); return; }
      const b = evt.target.closest('[data-i]');
      if (b && this.choix[Number(b.dataset.i)]) this.choix[Number(b.dataset.i)].action();
    });
    this.choix = [];
  }

  get ouverte() { return !this.rep.classList.contains('hidden') || !this.bulle.classList.contains('hidden'); }

  // npc : { x, y, def } du monde ; texte balisé ; suite : une ligne de plus à lire.
  dire(npc, texte, suite) {
    this.npc = npc;
    this.bulle.classList.remove('hidden');
    this.bulle.classList.toggle('attend', !!suite);
    this.bulle.querySelector('.vy-bulle-pnj__nom').textContent = npc.def.name;
    if (this.ecriture) this.ecriture.arreter();
    this.ecriture = Parole.ecrire(this.bulle.querySelector('.vy-bulle-pnj__texte'), texte || '...', { vitesse: 80 });
    if (!this.lacher) this.lacher = UI.ancrer(() => this.placer());
    this.placer();
  }

  // Réponses : [{ label, marque: '?' | '!', data: { cle: valeur }, action }] ; info : une ligne au-dessus.
  repondre(choix, info) {
    this.choix = choix || [];
    this.rep.classList.remove('hidden');
    const inf = this.rep.querySelector('.vy-repliques__info');
    inf.innerHTML = info || '';
    inf.hidden = !info;
    this.rep.querySelector('.vy-repliques__liste').innerHTML = this.choix.map((c, i) => {
      const m = c.marque || '?';
      const data = Object.entries(c.data || {}).map(([k, v]) => ` data-${k}="${Util.esc(v)}"`).join('');
      return `<button type="button" class="vy-replique" role="listitem" data-i="${i}"${data}><span class="vy-replique__texte">${Util.esc(c.label)}</span>` +
        `<span class="vy-replique__marque vy-replique__marque--${m === '!' ? 'offre' : c.rendre ? 'rendre' : 'question'}" aria-hidden="true">${m}</span></button>`;
    }).join('');
  }

  // La bulle suit la tête du PNJ (caméra comprise) et reste dans la scène.
  placer() {
    if (!this.npc || this.bulle.classList.contains('hidden')) return;
    const host = this.bulle.offsetParent;
    if (!host) return;
    const hr = host.getBoundingClientRect();
    const k = UI.cellScale(this.renderer, this.npc.x, this.npc.y);
    const feet = UI.cellClient(this.renderer, this.npc.x, this.npc.y);
    const headY = feet.y - 56 * k;
    const bw = this.bulle.offsetWidth, bh = this.bulle.offsetHeight;
    let x = feet.x - hr.left - bw * 0.3, y = headY - hr.top - bh - 15;
    x = Math.max(6, Math.min(hr.width - bw - 6, x));
    const flip = y < 6;
    if (flip) y = feet.y - hr.top + 15 * k;
    this.bulle.classList.toggle('dessous', flip);
    this.bulle.style.transform = `translate(${Math.round(x)}px, ${Math.round(y)}px)`;
    const tail = Math.max(20, Math.min(bw - 20, feet.x - hr.left - x));
    this.bulle.style.setProperty('--queue', Math.round(tail) + 'px');
  }

  cacherBulle() {
    this.bulle.classList.add('hidden');
    if (this.ecriture) this.ecriture.arreter();
  }

  cacherReponses() { this.rep.classList.add('hidden'); }

  fermer() {
    this.cacherBulle();
    this.cacherReponses();
    if (this.lacher) { this.lacher(); this.lacher = null; }
    this.npc = null;
    this.choix = [];
  }
}

// ----- La conversation avec un PNJ -----
// La bulle au-dessus de sa tête dit ses répliques, ou la ligne de la quête qu'il a confiée ; la
// boîte de réponses, en bas de la scène, offre ses quêtes (marquées « ! »), celles à lui rendre,
// sa boutique et son atelier. Le texte d'une quête (l'offre, la fin) passe dans la grande boîte au
// portrait, ligne par ligne. Fermer la boîte de réponses termine le dialogue.
class Conversation {
  constructor(hud) {
    this.hud = hud;
    const stage = document.getElementById('stage');
    this.bulle = new BullePnj(stage, hud.renderer);
    this.boite = new GuideBoite(stage, { cls: 'vy-guide--dialogue', onTap: k => this.toucher(k) });
    this.bulle.onSuite = () => { if (this.ctx && !this.page && this.ligne < this.repliques().length - 1) { this.ligne++; this.parler(); } };
    this.bulle.onFermer = () => this.fermer();
    this.ctx = null;
    window.addEventListener('keydown', evt => {
      if (evt.key !== 'Escape' || !this.ctx) return;
      if (this.page) this.retour(); else this.fermer();
    });
  }

  get ouverte() { return !!this.ctx; }
  get painter() { return this.hud.renderer.painter || this.hud.renderer; }

  ouvrir(ctx) {
    this.ctx = ctx;
    this.ligne = 0;
    this.page = null;
    // La page sait qu'un dialogue est ouvert (les lignes flottantes de la discussion s'effacent).
    document.body.classList.add('vy-dialogue-ouvert');
    this.parler();
  }

  // La quête que ce PNJ a confiée et qui n'est pas finie : il en redit la ligne d'avancement.
  repliques() {
    const enCours = this.enCours()[0];
    const prog = enCours && enCours.quest.dialogue && enCours.quest.dialogue.progress;
    return prog && prog.length ? prog : (this.ctx.lines.length ? this.ctx.lines : ['...']);
  }

  parler() {
    const ctx = this.ctx;
    if (!ctx) return;
    const lines = this.repliques();
    const i = Math.min(this.ligne, lines.length - 1);
    this.ligne = i;
    this.boite.cacher();
    this.bulle.dire(ctx.npc, lines[i], i < lines.length - 1);
    this.dire(lines[i]);
    this.bulle.repondre(this.choix(), this.info());
  }

  // Une ligne dite par le PNJ passe aussi dans la discussion, une seule fois de suite.
  dire(texte) {
    const d = this.hud.discussion, line = `${this.ctx.npc.def.name} : ${texte}`;
    if (d && this.dernier !== line) d.ajouter('pnj', line);
    this.dernier = line;
  }

  choix() {
    const ctx = this.ctx, hud = this.hud;
    const out = [];
    // Une étape de choix (le serment, le reniement) se joue dans le grand panneau (js/hud-faction.js).
    for (const a of ctx.answers || []) out.push({ label: `${a.quest.name} : ${a.step.text}`, marque: '?', data: { repondre: a.quest.id }, action: () => this.ailleurs(() => hud.openAnswerPanel(ctx.npc, a.quest.id)) });
    for (const q of ctx.offers) out.push({ label: q.name, marque: '!', data: { quete: q.id }, action: () => this.offre(q) });
    for (const a of ctx.active) if (a.done && !this.enChoix(a)) out.push({ label: `Rendre : ${a.quest.name}`, marque: '?', rendre: true, data: { rendre: a.quest.id }, action: () => this.rendre(a.quest) });
    if (ctx.shop) out.push({ label: 'Voir tes marchandises.', action: () => this.ailleurs(() => hud.openShop(ctx)) });
    if (ctx.workshop) out.push({ label: 'Utiliser ton atelier.', action: () => this.ailleurs(() => hud.openWorkshop(ctx)) });
    if (!out.length) out.push({ label: 'Au revoir.', action: () => this.fermer() });
    return out;
  }

  info() {
    return this.enCours().map(a => `<b>${Util.esc(a.quest.name)}</b> : ${Util.esc(a.text)}`).join('<br>');
  }

  // Les quêtes de ce PNJ qui ne se rendent pas encore ici, hors étapes de choix (elles ont leur réponse).
  enCours() { return this.ctx.active.filter(a => !a.done && !this.enChoix(a)); }
  enChoix(a) { return (this.ctx.answers || []).some(x => x.quest === a.quest); }

  // Une boutique, un atelier : leur panneau prend la place (le dialogue se termine en le fermant).
  ailleurs(fn) {
    this.bulle.fermer();
    this.boite.cacher();
    this.ctx = null;
    this.page = null;
    document.body.classList.remove('vy-dialogue-ouvert');
    fn();
  }

  offre(q) {
    const lines = (q.dialogue && q.dialogue.offer && q.dialogue.offer.length) ? q.dialogue.offer : [q.name];
    this.page = { kind: 'offre', q, lines, i: 0 };
    this.montrerPage();
  }

  rendre(q) {
    const r = this.hud.world.completeQuest(q.id);
    if (!r) return;
    this.ctx = this.hud.world.dialogueContext(this.ctx.npc);
    const lines = (q.dialogue && q.dialogue.done && q.dialogue.done.length) ? q.dialogue.done : ['Merci, Veilleur.'];
    this.page = { kind: 'fin', q, lines, i: 0, note: `Gagné : ${r.first === false ? 'déjà reçu' : Conversation.recompense(r)}${r.levels ? ` · niveau ${this.hud.world.ch.level} !` : ''}` };
    this.montrerPage();
  }

  montrerPage() {
    const p = this.page, last = p.i >= p.lines.length - 1;
    this.bulle.cacherBulle();
    this.bulle.cacherReponses();
    let choix = [], note = null;
    if (last && p.kind === 'offre') {
      choix = [{ label: 'Accepter', act: 'accepter', primaire: true, action: () => this.accepter(p.q) }, { label: 'Plus tard', act: 'plus-tard', action: () => this.retour() }];
      note = `Récompense : ${Conversation.recompense(p.q.rewards || {})}`;
    }
    if (last && p.kind === 'fin') { choix = [{ label: 'Continuer', act: 'continuer', primaire: true, action: () => this.retour() }]; note = p.note; }
    const titre = p.kind === 'offre' ? p.q.name : `${p.q.name} : terminée`;
    this.boite.montrer({ npc: Object.assign({}, this.ctx.npc.def, { title: titre }), texte: p.lines[p.i], suite: !last, choix, note, humeur: p.kind === 'fin' ? 'joie' : 'neutre', painter: this.painter, fermer: true });
    this.dire(p.lines[p.i]);
  }

  toucher(k) {
    if (k === 'fermer') { this.retour(); return; }
    const p = this.page;
    if (k === 'suite' && p && p.i < p.lines.length - 1) { p.i++; this.montrerPage(); }
  }

  accepter(q) {
    this.hud.world.acceptQuest(q.id);
    this.ctx = this.hud.world.dialogueContext(this.ctx.npc);
    // Une quête qui commence par un choix auprès de ce PNJ (le serment) s'ouvre tout de suite.
    if ((this.ctx.answers || []).some(a => a.quest.id === q.id)) {
      const npc = this.ctx.npc;
      this.ailleurs(() => this.hud.openAnswerPanel(npc, q.id));
      return;
    }
    this.retour();
  }

  // Retour à la bulle et aux réponses (la quête vient d'être prise, ou on la remet à plus tard).
  retour() {
    if (!this.ctx) return;
    this.page = null;
    this.ligne = 0;
    this.parler();
  }

  fermer() {
    if (!this.ctx) return;
    const npc = this.ctx.npc;
    this.bulle.fermer();
    this.boite.cacher();
    this.ctx = null;
    this.page = null;
    this.dernier = null;
    document.body.classList.remove('vy-dialogue-ouvert');
    Bus.emit('dialogueClose', { npc: npc.id });
    this.hud.world.endDialogue();
  }

  // « 48 XP, 15 Fils, 2 Pain de Cime » : ce qu'une quête promet ou ce qu'elle a donné.
  static recompense(r) {
    const parts = [];
    if (r.xp) parts.push(`${r.xp} XP`);
    if (r.fils) parts.push(`${r.fils} Fils`);
    for (const it of r.items || []) { const d = Items.get(it.id); parts.push(`${it.count || 1} ${d ? d.name : it.id}`); }
    return parts.join(', ') || 'rien';
  }
}
