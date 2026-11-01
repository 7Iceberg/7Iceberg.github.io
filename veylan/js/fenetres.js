// Fenêtres de l'interface : déplaçables, empilables, réductibles, plusieurs ouvertes à la fois
// (inventaire et caractéristiques côte à côte). Sur téléphone, une seule à la fois, en plein
// écran. Chaque fenêtre a son rendu et ses actions ; le gestionnaire ne sait rien du jeu.
class Fenetres {
  constructor(layer) {
    this.layer = layer;
    this.wins = new Map();
    this.z = 30;
    this.pos = {};
    try { this.pos = JSON.parse(localStorage.getItem('veylan.fenetres') || '{}') || {}; } catch (e) { this.pos = {}; }
    this.layer.addEventListener('click', evt => {
      const box = evt.target.closest('.vy-fenetre');
      if (!box) return;
      const w = this.wins.get(box.dataset.id);
      const b = evt.target.closest('[data-act]');
      if (!w || !b || !box.contains(b)) return;
      if (b.dataset.act === 'fermer') return this.close(w.id);
      if (b.dataset.act === 'reduire') { box.classList.toggle('reduite'); return; }
      const fn = w.spec.actions && w.spec.actions[b.dataset.act];
      if (fn) fn(b.dataset, b, evt);
    });
    this.layer.addEventListener('dblclick', evt => {
      const box = evt.target.closest('.vy-fenetre');
      const w = box && this.wins.get(box.dataset.id);
      const b = evt.target.closest('[data-dbl]');
      if (w && b && w.spec.actions && w.spec.actions[b.dataset.dbl]) w.spec.actions[b.dataset.dbl](b.dataset, b, evt);
    });
    this.layer.addEventListener('input', evt => this.field(evt, 'input'));
    this.layer.addEventListener('change', evt => this.field(evt, 'change'));
    this.layer.addEventListener('pointerdown', evt => {
      const box = evt.target.closest('.vy-fenetre');
      if (box) this.focus(box.dataset.id);
    });
  }

  // Les champs (recherche, tri, cases à cocher) passent par `onField` de la fenêtre.
  field(evt, kind) {
    const box = evt.target.closest('.vy-fenetre');
    const w = box && this.wins.get(box.dataset.id);
    if (w && w.spec.onField) w.spec.onField(evt.target, kind);
  }

  static get compact() { return window.innerWidth <= 720; }

  isOpen(id) { return this.wins.has(id); }

  toggle(id, spec) { if (this.isOpen(id)) this.close(id); else this.open(id, spec); }

  // spec : { title, icon (svg), key, width, cls (classe en plus), render() → html, actions, onField, place: {x, y} | 'centre',
  //          onEscape() → vrai si la fenêtre a refermé une feuille à elle (Échap ne la ferme pas alors) }
  // Une fenêtre qui s'ouvre le dit à la page (événement 'veylan:windowOpen', { id }) : le guide
  // (js/guide.js) attend certaines fenêtres, et ce point de passage les voit toutes, une fois
  // chacune. spec.annonce : le nom annoncé quand il diffère de l'identifiant (sac → inventaire,
  // carac → caracteristiques).
  open(id, spec) {
    if (Fenetres.compact) for (const other of [...this.wins.keys()]) if (other !== id) this.close(other);
    let w = this.wins.get(id);
    const created = !w;
    if (!w) {
      const box = document.createElement('section');
      box.className = 'vy-fenetre';
      box.dataset.id = id;
      box.setAttribute('role', 'dialog');
      box.setAttribute('aria-label', spec.title);
      box.innerHTML =
        `<header class="vy-fenetre__tete">${spec.icon ? `<span class="vy-fenetre__icone" aria-hidden="true">${spec.icon}</span>` : ''}` +
        `<h2 class="vy-fenetre__titre"></h2>${spec.key ? `<kbd class="vy-fenetre__touche" title="Raccourci clavier">${spec.key}</kbd>` : ''}` +
        `<span class="vy-fenetre__boutons"><button class="vy-fenetre__bouton" data-act="reduire" aria-label="Réduire">${Fenetres.ICON.reduire}</button>` +
        `<button class="vy-fenetre__bouton" data-act="fermer" aria-label="Fermer">${Fenetres.ICON.fermer}</button></span></header>` +
        `<div class="vy-fenetre__corps"></div>`;
      if (spec.width) box.style.setProperty('--largeur', spec.width + 'px');
      // Au téléphone en paysage, une fenêtre étroite garde sa largeur, le jeu reste visible à côté (css/verre.css).
      if ((spec.width || 420) <= 520) box.classList.add('vy-fenetre--etroite');
      if (spec.cls) box.classList.add(spec.cls);
      this.layer.appendChild(box);
      w = { id, box, body: box.querySelector('.vy-fenetre__corps'), title: box.querySelector('.vy-fenetre__titre'), spec };
      this.wins.set(id, w);
      this.drag(w);
      w.spec = spec;
      w.title.textContent = spec.title;
      this.render(id);
      this.place(w);
    } else {
      w.spec = spec;
      w.title.textContent = spec.title;
      this.render(id);
    }
    this.focus(id);
    if (created) window.dispatchEvent(new CustomEvent('veylan:windowOpen', { detail: { id: spec.annonce || id } }));
    return w;
  }

  render(id) {
    const w = this.wins.get(id);
    if (!w) return;
    // On garde le défilement et le champ actif d'un rendu à l'autre.
    const scrolls = [...w.body.querySelectorAll('[data-defile]')].map(el => [el.dataset.defile, el.scrollTop]);
    const top = w.body.scrollTop;
    const active = document.activeElement && w.body.contains(document.activeElement) ? document.activeElement : null;
    const activeId = active && active.id;
    const caret = active && typeof active.selectionStart === 'number' ? active.selectionStart : null;
    w.body.innerHTML = w.spec.render();
    w.body.scrollTop = top;
    for (const [k, v] of scrolls) { const el = w.body.querySelector(`[data-defile="${k}"]`); if (el) el.scrollTop = v; }
    if (activeId) { const el = document.getElementById(activeId); if (el && w.body.contains(el)) { el.focus({ preventScroll: true }); if (caret != null && el.setSelectionRange) el.setSelectionRange(caret, caret); } }
    if (w.spec.after) w.spec.after(w.body);
  }

  refreshAll() { for (const id of this.wins.keys()) this.render(id); }

  // Une fenêtre peut retenir sa fermeture (`beforeClose` rend faux : la fenêtre Sorts demande d'abord
  // s'il faut valider ses changements) ; `force` ferme sans demander.
  close(id, force) {
    const w = this.wins.get(id);
    if (!w) return;
    if (!force && w.spec.beforeClose && w.spec.beforeClose() === false) return;
    w.box.remove();
    this.wins.delete(id);
    if (w.spec.onClose) w.spec.onClose();
  }

  closeTop() {
    let top = null;
    for (const w of this.wins.values()) if (!top || Number(w.box.style.zIndex) > Number(top.box.style.zIndex)) top = w;
    if (!top) return false;
    // Une feuille ouverte dans la fenêtre (confirmation, répartition) se referme d'abord.
    if (!(top.spec.onEscape && top.spec.onEscape())) this.close(top.id);
    return true;
  }

  closeAll() { for (const id of [...this.wins.keys()]) this.close(id); }

  focus(id) {
    const w = this.wins.get(id);
    if (!w) return;
    w.box.style.zIndex = ++this.z;
    for (const o of this.wins.values()) o.box.classList.toggle('active', o === w);
  }

  // Position : celle enregistrée, sinon la première place libre de gauche à droite (les fenêtres
  // s'ouvrent côte à côte), sinon en cascade ; toujours ramenée dans l'écran.
  place(w) {
    if (Fenetres.compact) return;
    const r = this.layer.getBoundingClientRect();
    const saved = this.pos[w.id];
    const width = w.box.offsetWidth || 360, height = w.box.offsetHeight || 300;
    const y = Math.max(8, Math.min(64, r.height - height - 8));
    if (saved) return this.moveTo(w, saved.x, saved.y);
    const others = [...this.wins.values()].filter(o => o !== w);
    const free = x0 => others.every(o => x0 + width + 8 <= o.box.offsetLeft || x0 >= o.box.offsetLeft + o.box.offsetWidth + 8);
    for (let x0 = 12; x0 + width <= r.width - 12; x0 += 12) if (free(x0)) return this.moveTo(w, x0, y);
    const n = others.length;
    this.moveTo(w, r.width / 2 - width / 2 + n * 26, y + n * 26);
  }

  moveTo(w, x, y) {
    const r = this.layer.getBoundingClientRect();
    const width = w.box.offsetWidth || 360;
    x = Math.max(4 - width + 80, Math.min(r.width - 80, x));
    y = Math.max(4, Math.min(r.height - 40, y));
    w.box.style.left = Math.round(x) + 'px';
    w.box.style.top = Math.round(y) + 'px';
  }

  drag(w) {
    const head = w.box.querySelector('.vy-fenetre__tete');
    let start = null;
    head.addEventListener('pointerdown', evt => {
      if (Fenetres.compact || evt.target.closest('button')) return;
      start = { px: evt.clientX, py: evt.clientY, x: w.box.offsetLeft, y: w.box.offsetTop };
      head.setPointerCapture(evt.pointerId);
      w.box.classList.add('deplacee');
    });
    head.addEventListener('pointermove', evt => {
      if (!start) return;
      this.moveTo(w, start.x + evt.clientX - start.px, start.y + evt.clientY - start.py);
    });
    const stop = () => {
      if (!start) return;
      start = null;
      w.box.classList.remove('deplacee');
      this.pos[w.id] = { x: w.box.offsetLeft, y: w.box.offsetTop };
      try { localStorage.setItem('veylan.fenetres', JSON.stringify(this.pos)); } catch (e) { /* stockage indisponible */ }
    };
    head.addEventListener('pointerup', stop);
    head.addEventListener('pointercancel', stop);
    // Double-clic sur le titre : réduire.
    head.addEventListener('dblclick', evt => { if (!evt.target.closest('button')) w.box.classList.toggle('reduite'); });
  }

  resetPositions() {
    this.pos = {};
    try { localStorage.removeItem('veylan.fenetres'); } catch (e) { /* rien */ }
    for (const w of this.wins.values()) this.place(w);
  }
}

// Pictogrammes de l'interface : un trait, lisibles en 18 px, sans dégradé.
Fenetres.ICON = (() => {
  const s = p => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${p}</svg>`;
  return {
    fermer: s('<path d="M6 6l12 12M18 6L6 18"/>'),
    reduire: s('<path d="M6 12h12"/>'),
    carac: s('<path d="M12 3l8 5v8l-8 5-8-5V8z"/><path d="M12 8l4 2.5v3L12 16l-4-2.5v-3z"/>'),
    sorts: s('<path d="M3 6h6a3 3 0 0 1 3 3v11a2.5 2.5 0 0 0-2.5-2.5H3z"/><path d="M21 6h-6a3 3 0 0 0-3 3v11a2.5 2.5 0 0 1 2.5-2.5H21z"/><path d="M17.5 1.5l.8 1.7 1.7.8-1.7.8-.8 1.7-.8-1.7-1.7-.8 1.7-.8z"/>'),
    perso: s('<circle cx="12" cy="7" r="3.5"/><path d="M5 21v-2a7 7 0 0 1 14 0v2"/><path d="M9 14l3 3 3-3"/>'),
    sac: s('<path d="M6 8h12l-1 12H7z"/><path d="M9 8V6a3 3 0 0 1 6 0v2"/><path d="M9 13h6"/>'),
    quetes: s('<path d="M6 3h10l2 3v15H6z"/><path d="M9 9h6M9 13h6M9 17h3"/>'),
    faction: s('<path d="M6 21V4"/><path d="M6 4h11l-2.5 4.5L17 13H6"/><path d="M10 6.5c2 .8 2 3.2 0 4"/>'),
    succes: s('<path d="M8 4h8v5a4 4 0 0 1-8 0z"/><path d="M8 6H5a3 3 0 0 0 3 4M16 6h3a3 3 0 0 1-3 4M12 13v4M8 21h8M10 17h4v4h-4z"/>'),
    carnet: s('<path d="M5 4h11a3 3 0 0 1 3 3v13H8a3 3 0 0 1-3-3z"/><path d="M5 17a3 3 0 0 1 3-3h11"/><path d="M10 8l1.5 1.5L14 7"/>'),
    carte: s('<path d="M3 6l6-2 6 2 6-2v14l-6 2-6-2-6 2z"/><path d="M9 4v14M15 6v14"/>'),
    journal: s('<path d="M4 5h16v11H9l-5 4z"/><path d="M8 9h8M8 12h5"/>'),
    options: s('<circle cx="12" cy="12" r="3"/><path d="M12 2v3M12 19v3M4.2 4.2l2.1 2.1M17.7 17.7l2.1 2.1M2 12h3M19 12h3M4.2 19.8l2.1-2.1M17.7 6.3l2.1-2.1"/>'),
    recherche: s('<circle cx="11" cy="11" r="6"/><path d="M20 20l-4.5-4.5"/>'),
    tout: s('<rect x="4" y="4" width="7" height="7" rx="1"/><rect x="13" y="4" width="7" height="7" rx="1"/><rect x="4" y="13" width="7" height="7" rx="1"/><rect x="13" y="13" width="7" height="7" rx="1"/>'),
    liste: s('<path d="M8 6h12M8 12h12M8 18h12M4 6h.01M4 12h.01M4 18h.01"/>'),
    profil: s('<path d="M12 3l8 6-3 11H7L4 9z"/><path d="M12 8l3 3-1 4h-4l-1-4z"/>'),
    plus: s('<path d="M12 5v14M5 12h14"/>'),
    moins: s('<path d="M5 12h14"/>'),
    cible: s('<circle cx="12" cy="12" r="7"/><circle cx="12" cy="12" r="2"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3"/>'),
    relief: s('<path d="M12 3l8 4.5v9L12 21l-8-4.5v-9z"/><path d="M4 7.5l8 4.5 8-4.5M12 12v9"/>'),
    tourneG: s('<path d="M4 12a8 8 0 1 0 2.4-5.7"/><path d="M4 4v4.5h4.5"/>'),
    tourneD: s('<path d="M20 12a8 8 0 1 1-2.4-5.7"/><path d="M20 4v4.5h-4.5"/>'),
    recentrer: s('<path d="M4 9V4h5M15 4h5v5M20 15v5h-5M9 20H4v-5"/><path d="M12 8l4 4-4 4-4-4z"/>'),
    pleinEcran: s('<path d="M14 4h6v6M20 4l-6 6M10 20H4v-6M4 20l6-6"/>'),
    quitterPleinEcran: s('<path d="M20 10h-6V4M14 10l6-6M4 14h6v6M10 14l-6 6"/>'),
  };
})();
