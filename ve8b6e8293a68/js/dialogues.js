
const Parole = {
  STYLES: ['pa', 'pm', 'pv', 'cristal', 'or', 'voile', 'braise'],

  segments(markup) {
    const out = [];
    const re = /\*\*(.+?)\*\*|\{([a-z]+)\|([^}]*)\}/g;
    let last = 0, m;
    const src = String(markup || '');
    while ((m = re.exec(src))) {
      if (m.index > last) out.push({ text: src.slice(last, m.index) });
      if (m[1] != null) {
        const inner = /^\{([a-z]+)\|([^}]*)\}$/.exec(m[1]);
        out.push(inner ? { text: inner[2], gras: true, style: Parole.STYLES.includes(inner[1]) ? inner[1] : null } : { text: m[1], gras: true });
      } else out.push({ text: m[3], style: Parole.STYLES.includes(m[2]) ? m[2] : null, gras: true });
      last = re.lastIndex;
    }
    if (last < src.length) out.push({ text: src.slice(last) });
    return out;
  },

  brut(markup) { return Parole.segments(markup).map(s => s.text).join(''); },

  html(markup) {
    return Parole.segments(markup).map(s => {
      const t = Util.esc(s.text);
      if (!s.gras && !s.style) return t;
      return `<b class="vy-mot${s.style ? ' vy-mot--' + s.style : ''}">${t}</b>`;
    }).join('');
  },

  ecrire(el, markup, opts) {
    opts = opts || {};
    const segs = Parole.segments(markup);
    el.setAttribute('aria-label', Parole.brut(markup));
    el.innerHTML = segs.map(s => {
      const cls = s.gras || s.style ? `vy-mot${s.style ? ' vy-mot--' + s.style : ''}` : '';
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
    try { painter.drawNpc(c, { x: 0, y: 0 }, { look, phase: 0 }, 0); } catch (e) {   }
    c.scale(small, small);
    const top = -42, ink = '#2a2433';
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
    if (look !== 'ancien') {
      c.fillStyle = 'rgba(239, 230, 212, 0.95)';
      c.beginPath();
      c.moveTo(-7.2, top + 12.8); c.lineTo(-4.4, top + 12); c.lineTo(0, top + 14.8); c.lineTo(4.4, top + 12); c.lineTo(7.2, top + 12.8); c.lineTo(0, top + 17.4);
      c.closePath(); c.fill();
      c.strokeStyle = '#f3bc72'; c.lineWidth = 0.85;
      c.beginPath(); c.moveTo(-7.2, top + 12.8); c.lineTo(0, top + 17.4); c.lineTo(7.2, top + 12.8); c.stroke();
    }
    c.restore();
  },
};

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

  cote(c) { this.el.dataset.cote = c === 'droite' ? 'droite' : 'gauche'; }
  rect() { return this.visible ? this.q('.vy-guide__boite').getBoundingClientRect() : null; }
}

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

  repondre(choix, info) {
    this.choix = choix || [];
    this.rep.classList.remove('hidden');
    this.rep.classList.add('vy-inter-pnj');
    let tete = this.rep.querySelector('.vy-inter-pnj__tete');
    if (!tete) { tete = document.createElement('header'); tete.className = 'vy-inter-pnj__tete'; this.rep.prepend(tete); }
    const d = this.npc && this.npc.def;
    tete.innerHTML = d ? `<span class="vy-inter__ic">${BullePnj.PICTOS.parler}</span><div><b>${Util.esc(d.name)}</b>${d.title || d.metier ? `<small>${Util.esc(d.title || d.metier)}</small>` : ''}</div>` : '';
    const inf = this.rep.querySelector('.vy-repliques__info');
    inf.innerHTML = info || '';
    inf.hidden = !info;
    let groupe = null;
    this.rep.querySelector('.vy-repliques__liste').innerHTML = this.choix.map((c, i) => {
      const m = c.marque;
      const data = Object.entries(c.data || {}).map(([k, v]) => ` data-${k}="${Util.esc(v)}"`).join('');
      const titre = c.groupe && c.groupe !== groupe ? `<div class="vy-inter-pnj__groupe" role="presentation">${Util.esc(c.groupe)}</div>` : '';
      groupe = c.groupe || groupe;
      const picto = BullePnj.PICTOS[c.picto] || '';
      return titre + `<button type="button" class="vy-replique${c.primaire ? ' vy-replique--primaire' : ''}${c.quitter ? ' vy-replique--quitter' : ''}" role="listitem" data-i="${i}"${data}>${picto ? `<span class="vy-replique__picto" aria-hidden="true">${picto}</span>` : ''}<span class="vy-replique__texte">${Util.esc(c.label)}</span>` +
        (m ? `<span class="vy-replique__marque vy-replique__marque--${m === '!' ? 'offre' : c.rendre ? 'rendre' : c.passage ? 'passage' : 'question'}" aria-hidden="true">${m}</span>` : '') + '</button>';
    }).join('');
    this.placer();
  }

  static get PICTOS() {
    const s = p => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${p}</svg>`;
    return {
      parler: s('<path d="M4 5h16v11H9l-5 4z"/><path d="M8 9h8M8 12h5"/>'),
      quete: s('<path d="M6 3h10l2 3v15H6z"/><path d="M12 8v5M12 16h.01"/>'),
      rendre: s('<path d="M6 3h10l2 3v15H6z"/><path d="M9 13l2 2 4-4"/>'),
      choix: s('<path d="M12 3v6M12 9l-6 6M12 9l6 6"/><circle cx="6" cy="18" r="2"/><circle cx="18" cy="18" r="2"/>'),
      passage: s('<path d="M4 17h16M6 17V9a6 6 0 0 1 12 0v8"/><path d="M12 3v3"/>'),
      commerce: s('<path d="M6 9h12l-1.5 11h-9z"/><path d="M9 9V7a3 3 0 0 1 6 0v2"/>'),
      atelier: s('<path d="M14 6l4 4M9 11l7-7 4 4-7 7z"/><path d="M11 13l-7 7"/>'),
      marche: s('<path d="M4 10h16l-1-5H5z"/><path d="M5 10v9h14v-9M10 19v-5h4v5"/>'),
      metiers: s('<path d="M4 6h16v12H4z"/><path d="M8 10h8M8 14h5"/>'),
      combat: s('<path d="M4 4l9 9M4 4v4M4 4h4M20 4l-9 9M20 4v4M20 4h-4"/><path d="M8.5 15.5l-3 3M15.5 15.5l3 3"/>'),
      avis: s('<path d="M5 3h14v18H5z"/><circle cx="12" cy="10" r="3"/><path d="M8 17c1-2 2.5-3 4-3s3 1 4 3"/>'),
      insigne: s('<path d="M12 3l7 3v6c0 4-3 7-7 9-4-2-7-5-7-9V6z"/>'),
      classe: s('<path d="M10 3h4M11 3v5l-5 9a2 2 0 0 0 2 3h8a2 2 0 0 0 2-3l-5-9V3"/><path d="M8 14h8"/>'),
      banque: s('<path d="M3 9l9-5 9 5M5 9v9M19 9v9M9 9v9M15 9v9M3 20h18"/>'),
      quitter: s('<path d="M6 6l12 12M18 6L6 18"/>'),
    };
  }

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
    if (!this.rep.classList.contains('hidden') && this.rep.classList.contains('vy-inter-pnj')) {
      const rw = this.rep.offsetWidth, rh = this.rep.offsetHeight, fx = feet.x - hr.left, fy = feet.y - hr.top;
      let rx = fx + 26 * k, ry = fy - 34 * k - rh / 2;
      if (rx + rw > hr.width - 8) rx = fx - 26 * k - rw;
      rx = Math.max(8, Math.min(hr.width - rw - 8, rx));
      ry = Math.max(flip ? 8 : y + bh + 8, Math.min(hr.height - rh - 8, ry));
      ry = Math.max(8, Math.min(hr.height - rh - 8, ry));
      this.rep.style.transform = `translate(${Math.round(rx)}px, ${Math.round(ry)}px)`;
    }
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
    document.body.classList.add('vy-dialogue-ouvert');
    this.parler();
  }

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

  dire(texte) {
    const d = this.hud.discussion, line = `${this.ctx.npc.def.name} : ${texte}`;
    if (d && this.dernier !== line) d.ajouter('pnj', line);
    this.dernier = line;
  }

  choix() {
    const ctx = this.ctx, hud = this.hud;
    const out = [];
    for (const a of ctx.answers || []) out.push({ label: `${a.quest.name} : ${a.step.text}`, marque: '?', picto: 'choix', groupe: 'Quêtes', data: { repondre: a.quest.id }, action: () => this.ailleurs(() => hud.openAnswerPanel(ctx.npc, a.quest.id)) });
    for (const q of ctx.offers) out.push({ label: q.name, marque: '!', picto: 'quete', groupe: 'Quêtes', data: { quete: q.id }, action: () => this.offre(q) });
    for (const a of ctx.active) if (a.done && !this.enChoix(a)) out.push({ label: `Rendre : ${a.quest.name}`, marque: '?', picto: 'rendre', groupe: 'Quêtes', rendre: true, data: { rendre: a.quest.id }, action: () => this.rendre(a.quest) });
    if (ctx.passage) out.push({ label: ctx.passage.texte, marque: '>', picto: 'passage', primaire: true, passage: true, data: { passage: ctx.passage.vers }, action: () => this.ailleurs(() => { if (!hud.world.passage()) hud.world.endDialogue(); }) });
    if (ctx.shop) out.push({ label: 'Voir tes marchandises.', picto: 'commerce', groupe: 'Services', action: () => this.ailleurs(() => hud.openShop(ctx)) });
    if (ctx.workshop) out.push({ label: 'Utiliser ton atelier.', picto: 'atelier', groupe: 'Services', action: () => this.ailleurs(() => hud.openWorkshop(ctx)) });
    if (ctx.marche) out.push({ label: 'Voir l\'étal du jour.', picto: 'marche', groupe: 'Services', action: () => this.ailleurs(() => hud.openMarche(ctx)) });
    if (ctx.metiers) out.push({ label: 'Voir le tableau des métiers.', picto: 'metiers', groupe: 'Services', action: () => this.ailleurs(() => hud.openMetiers(ctx)) });
    if (ctx.dojo) out.push({ label: 'M\'entraîner contre les mannequins.', picto: 'combat', groupe: 'Services', action: () => this.ailleurs(() => { hud.world.endDialogue && hud.world.endDialogue(); hud.world.entrainement(); }) });
    if (ctx.epreuve) out.push({ label: 'Affronter mon Reflet sur la cour.', marque: '!', picto: 'combat', groupe: 'Quêtes', action: () => this.ailleurs(() => { hud.world.endDialogue && hud.world.endDialogue(); hud.world.epreuveVoie(); }) });
    if (ctx.epreuveDojo) out.push({ label: 'Tenter l\'épreuve du jour.', picto: 'combat', groupe: 'Services', action: () => this.ailleurs(() => { hud.world.endDialogue && hud.world.endDialogue(); hud.world.epreuveDojo(); }) });
    if (ctx.avis) out.push({ label: 'Voir les avis de recherche.', picto: 'avis', groupe: 'Services', action: () => this.ailleurs(() => hud.openAvis(ctx)) });
    if (ctx.temple) out.push({ label: 'Échanger des Insignes de la Garde.', picto: 'insigne', groupe: 'Services', action: () => this.ailleurs(() => hud.openTemple(ctx)) });
    if (ctx.potionClasse) out.push({ label: 'À la réflexion, ma classe ne me ressemble pas.', picto: 'classe', groupe: 'Services', data: { classe: '1' }, action: () => this.potionClasse() });
    if (ctx.banque) out.push({ label: 'Ouvrir ton coffre.', picto: 'banque', groupe: 'Services', action: () => this.ailleurs(() => hud.openBanque(ctx)) });
    const rang = c => c.primaire ? 0 : c.groupe === 'Quêtes' ? 1 : c.groupe === 'Services' ? 2 : 3;
    out.sort((x, y) => rang(x) - rang(y));
    out.push({ label: 'Au revoir.', picto: 'quitter', quitter: true, action: () => this.fermer() });
    return out;
  }

  info() {
    return this.enCours().map(a => `<b>${Util.esc(a.quest.name)}</b> : ${Util.esc(a.text)}`).join('<br>');
  }

  enCours() { return this.ctx.active.filter(a => !a.done && !this.enChoix(a)); }
  enChoix(a) { return (this.ctx.answers || []).some(x => x.quest === a.quest); }

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

  potionClasse() {
    const def = this.ctx.npc.def;
    const lines = def.lignesClasse || ['Ça arrive. On choisit sa Voie un matin, et le soir on se rend compte qu\'on tient l\'arme à l\'envers.', 'Bois ceci quand tu seras prêt. Tu garderas ton niveau, ton sac et tout ce que tu as fait. Tes gestes, eux, seront à réapprendre.'];
    this.page = { kind: 'classe', lines, i: 0 };
    this.montrerPage();
  }

  prendrePotionClasse() {
    const w = this.hud.world;
    if (!w.prendrePotionClasse()) { this.retour(); return; }
    this.ctx = w.dialogueContext(this.ctx.npc);
    this.page = { kind: 'classe-recue', lines: ['Avant le niveau 20, ça ne coûte rien. Après, ta Voie est la tienne.'], i: 0, note: 'Reçu : Potion de changement de classe. Bois-la depuis ton sac : le choix se fait à l\'écran des personnages.' };
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
    if (last && (p.kind === 'fin' || p.kind === 'classe-recue')) { choix = [{ label: 'Continuer', act: 'continuer', primaire: true, action: () => this.retour() }]; note = p.note; }
    if (last && p.kind === 'classe') {
      choix = [{ label: 'Prendre la potion', act: 'prendre-potion', primaire: true, action: () => this.prendrePotionClasse() }, { label: 'Plus tard', act: 'plus-tard', action: () => this.retour() }];
      note = 'Gratuit jusqu\'au niveau 19. Tu gardes ton niveau, tes objets, tes Dragmes, tes quêtes et tes succès ; tes caractéristiques, tes Sceaux et tes variantes de sorts sont rendus.';
    }
    const titre = p.kind === 'offre' ? p.q.name : p.kind === 'classe' || p.kind === 'classe-recue' ? 'Changer de classe' : `${p.q.name} : terminée`;
    this.boite.montrer({ npc: Object.assign({}, this.ctx.npc.def, { title: titre }), texte: p.lines[p.i], suite: !last, choix, note, humeur: p.kind === 'fin' || p.kind === 'classe-recue' ? 'joie' : 'neutre', painter: this.painter, fermer: true });
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
    if ((this.ctx.answers || []).some(a => a.quest.id === q.id)) {
      const npc = this.ctx.npc;
      this.ailleurs(() => this.hud.openAnswerPanel(npc, q.id));
      return;
    }
    this.retour();
  }

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

  static recompense(r) {
    const parts = [];
    if (r.xp) parts.push(`${r.xp} XP`);
    if (r.fils) parts.push(`${r.fils} Dragmes`);
    for (const it of r.items || []) { const d = Items.get(it.id); parts.push(`${it.count || 1} ${d ? d.name : it.id}`); }
    if (typeof Garderobe !== 'undefined') for (const e of r.cosmetiques || []) parts.push(`${e.cosmetique.nom} (Garde-robe)`);
    if (typeof Garderobe !== 'undefined' && !r.cosmetiques) for (const id of [].concat(r.cosmetique || [])) { const c = Garderobe.get(id); if (c) parts.push(`${c.nom} (Garde-robe)`); }
    return parts.join(', ') || 'rien';
  }
}
