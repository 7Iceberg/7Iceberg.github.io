'use strict';

const ArbreSceaux = (() => {
  let ROOT = null, HOTE = null, PRET = null;
  const $ = (s, r) => (r || ROOT).querySelector(s);
  const $$ = (s, r) => Array.from((r || ROOT).querySelectorAll(s));
  const esc = (v) => String(v ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const ICONES = () => (typeof window !== 'undefined' && window.ARBRE_ICONES) || {};
  const ico = (n) => `<svg viewBox="0 0 24 24">${ICONES()[n] || ICONES()['circle-dot'] || ''}</svg>`;
  const nb = (n) => String(Math.round(Number(n) || 0)).replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const rgb = (hex) => { const m = /^#?([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i.exec(hex || ''); return m ? [1, 2, 3].map((i) => parseInt(m[i], 16)).join(', ') : '255, 61, 139'; };
  const couleur = (hex) => `--c:${hex};--c-rgb:${rgb(hex)}`;
  const pl = (n, mot, mots) => `${nb(n)} ${Math.abs(n) > 1 ? (mots || mot + 's') : mot}`;

  const X = typeof Sceaux !== 'undefined' ? Sceaux : null;
  const SD = X ? X.D : null;

  const S = { e: null, joueur: {}, page: 'apercu', filtre: 'tout', ouvert: false, choisi: null, opts: {}, toucher: null, catEffets: 'vie' };
  const D = { comp: {}, br: {}, pos: {}, enfants: {}, branches: [], competences: [] };

  function indexer() {
    D.comp = {}; D.br = {}; D.pos = {}; D.enfants = {};
    D.branches = SD.ordre.map((v) => { const vo = SD.voies[v]; return { id: v, label: vo.nom, couleur: vo.couleur, icone: vo.icone, pos: SD.pos[v], desc: vo.phrase }; });
    D.competences = Object.values(SD.noeuds).map((n) => ({
      id: n.id, label: n.nom, rangs: n.max, coeur: n.coeur, icone: n.icone, branche: n.voie, sous: n.branche, parents: n.parents,
      effets: n.effet, passif: n.passif || '', seuil: n.seuil, cle: n.cle2voute && !n.passif, couronne: n.couronne, desc: n.coeur ? n.desc : (n.passif || SD.branches[n.voie][n.branche].phrase),
    }));
    for (const b of D.branches) D.br[b.id] = b;
    for (const c of D.competences) { D.comp[c.id] = c; D.enfants[c.id] = []; D.pos[c.id] = { x: SD.noeuds[c.id].x, y: SD.noeuds[c.id].y }; }
    for (const c of D.competences) for (const p of c.parents) if (D.enfants[p]) D.enfants[p].push(c.id);
  }

  const rangDe = (id) => X.rang(S.e, id);
  const etat = (c) => X.etat(S.e, c.id);
  const peutAcheter = (c) => X.peutPoser(S.e, c.id);
  const effetDef = (k) => { const e = SD.effets[k] || {}; return { label: e.nom || k, unite: e.u || '', icone: e.icone || 'circle-dot', cat: e.cat }; };
  function fmtEffet(k, v) {
    const s = (v > 0 ? '+' : v < 0 ? '−' : '') + nb(Math.abs(v));
    return s + (effetDef(k).unite === '%' ? ' %' : '');
  }
  const statsBranche = (bid) => X.avancement(S.e, bid);
  const sousNom = (c) => (c.coeur ? 'Cœur' : SD.branches[c.branche][c.sous].nom);
  const prets = () => X.prets(S.e);
  const sauver = () => { if (S.opts.surChangement) S.opts.surChangement(S.e); };
  const coutCarac = (v) => X.coutPoint(S.e.caracs[X.statDe(v)]);


  function Arbre(hote, opts) {
    this.hote = hote; this.mini = !!(opts && opts.mini);
    this.cam = { x: 0, y: -460, z: 0.6 }; this.but = { x: 0, y: -460, z: 0.6 };
    this.vit = { x: 0, y: 0 }; this.anim = 0;
    hote.innerHTML = '';
    this.monde = document.createElement('div');
    this.monde.className = 'monde';
    hote.appendChild(this.monde);
    if (!this.mini) this.ecouter();
    if (typeof ResizeObserver !== 'undefined') {
      let w = 0, h = 0;
      this.ro = new ResizeObserver(() => {
        const r = hote.getBoundingClientRect();
        if (!r.width || !r.height || (Math.abs(r.width - w) < 1 && Math.abs(r.height - h) < 1)) return;
        w = r.width; h = r.height;
        if (ZOOM) return;
        if (this.mini || !this.touche) this.cadrer(this.mini ? 'tout' : S.filtre, true); else this.poser();
      });
      this.ro.observe(hote);
    }
    else hote.addEventListener('click', () => ouvrirArbreSur());
    this.construire();
  }
  Arbre.prototype.construire = function () {
    const m = this.monde;
    let svg = '<svg class="liens" viewBox="0 0 10 10">';
    for (const b of D.branches) {
      const bx = b.pos.x, by = b.pos.y + 56;
      const d = `M0,0 C0,-170 ${bx * 0.62},${by + 210} ${bx},${by}`;
      svg += `<g data-br="${esc(b.id)}" style="${couleur(b.couleur)}"><path class="tronc-fond" d="${d}"/><path class="tronc" d="${d}"/><path class="tronc-flux" d="${d}"/></g>`;
    }
    for (const c of D.competences) {
      for (const p of c.parents) {
        const a = D.pos[p], z = D.pos[c.id];
        if (!a || !z) continue;
        svg += `<line class="lien" data-de="${esc(p)}" data-a="${esc(c.id)}" data-br="${esc(c.branche)}" style="${couleur(D.br[c.branche].couleur)}" x1="${a.x}" y1="${a.y}" x2="${z.x}" y2="${z.y}"/>`;
      }
    }
    svg += '</svg>';
    let html = svg + '<button type="button" class="racine" data-racine="1" style="left:0;top:0" aria-label="Ton Veilleur : tous les effets"><b>VY</b></button>';
    for (const c of D.competences) {
      const p = D.pos[c.id], b = D.br[c.branche];
      if (c.coeur) {
        html += `<button type="button" class="coeur" data-id="${esc(c.id)}" data-br="${esc(c.branche)}" style="left:${p.x}px;top:${p.y}px;${couleur(b.couleur)}" aria-label="${esc(b.label)} : mettre un point">
                    <i class="ticks"></i><i class="anneau"></i><span class="hx">${ico(c.icone)}</span><i class="plus">${ico('plus')}</i></button>
                    <div class="etiquette" data-br="${esc(b.id)}" data-etq="${esc(b.id)}" style="left:${p.x}px;top:${p.y + 74}px;${couleur(b.couleur)}"></div>`;
      } else {
        html += `<button type="button" class="noeud" data-id="${esc(c.id)}" data-br="${esc(c.branche)}" style="left:${p.x}px;top:${p.y}px;${couleur(b.couleur)}" aria-label="${esc(c.label)}"></button>`;
      }
    }
    m.innerHTML = html;
    $$('.noeud, .coeur, .racine', m).forEach((el) => {
      const id = el.dataset.id || '__racine';
      el.addEventListener('pointerdown', (e) => { S.toucher = e.pointerType === 'touch' ? id : null; });
      el.addEventListener('mouseenter', () => { if (!S.toucher) montrerCarte(id, el); });
      el.addEventListener('mouseleave', () => { if (!S.toucher) cacherCarte(); });
      el.addEventListener('click', (e) => {
        e.stopPropagation();
        if (this.deplace) return;
        if (this.mini) { ouvrirArbreSur(id); return; }
        if (el.dataset.br && this.loin(el.dataset.br)) { cacherCarte(); S.toucher = null; this.cadrer(el.dataset.br); return; }
        if (id === '__racine' && this.but.z > 1.05 * this.zCadre('tout')) { cacherCarte(); this.cadrer('tout'); return; }
        if (S.toucher) {
          if (S.carteDe !== id) { montrerCarte(id, el); return; }
        }
        if (id === '__racine') { montrerCarte(id, el); return; }
        clicNoeud(id, el, e.shiftKey);
      });
      if (!this.mini) el.addEventListener('dblclick', (e) => { e.stopPropagation(); const p = D.pos[id] || { x: 0, y: 0 }; this.viser(p.x, p.y, 1.25); });
    });
    $$('.tronc-fond, .etiquette', m).forEach((el) => {
      const v = el.closest('[data-br]') && el.closest('[data-br]').dataset.br;
      if (!v) return;
      el.addEventListener('click', (e) => { e.stopPropagation(); if (this.deplace) return; if (this.mini) ouvrirArbreSur(); else { cacherCarte(); this.cadrer(v); } });
    });
    this.maj();
  };
  Arbre.prototype.maj = function () {
    const m = this.monde;
    const f = S.filtre || 'tout', att = (br) => (f !== 'tout' && br !== f ? ' attenue' : '');
    for (const el of $$('.noeud', m)) {
      const c = D.comp[el.dataset.id], e = etat(c), r = rangDe(c.id);
      const cl = 'noeud ' + e + (c.passif || c.cle || c.couronne ? ' voute' : '') + (c.couronne ? ' couronne' : '') + (S.choisi === c.id ? ' choisi' : '') + (el.classList.contains('flash') ? ' flash' : '') + att(el.dataset.br);
      const h = `${e}|${r}`;
      if (el._h !== h) { el._h = h; el.innerHTML = (e === 'verrou' ? ico('lock') : ico(c.icone)) + (e === 'pret' ? `<i class="plus">${ico('plus')}</i>` : '') + `<span class="rg">${r}/${c.rangs}</span>`; }
      if (el.className !== cl) el.className = cl;
    }
    for (const el of $$('.coeur', m)) {
      const v = el.dataset.br, ok = X.pointsLibres(S.e) >= coutCarac(v);
      const cl = 'coeur' + (ok ? ' nourrir' : '') + (el.classList.contains('flash') ? ' flash' : '') + att(v);
      if (el.className !== cl) el.className = cl;
    }
    for (const el of $$('.lien', m)) {
      const enf = D.comp[el.dataset.a];
      const actif = rangDe(el.dataset.a) > 0 && rangDe(el.dataset.de) > 0;
      const ouvert = !actif && rangDe(el.dataset.de) > 0 && etat(enf) !== 'verrou';
      const cl = 'lien' + (actif ? ' actif' : ouvert ? ' ouvert' : '') + att(el.dataset.br);
      if (el._c !== cl) { el._c = cl; el.setAttribute('class', cl); }
    }
    for (const el of $$('[data-etq]', m)) {
      const v = el.dataset.etq, b = D.br[v], s = statsBranche(v), libres = X.sceauxLibres(S.e, v), j = X.jauge(S.e, v);
      const segs = Array.from({ length: SD.regles.pointsParSceau }, (_, i) => `<i class="${i < j ? 'on' : ''}"></i>`).join('');
      const h = `<b>${esc(b.label)}</b><div class="n">${s.fait}<small> / ${s.total}</small><em>${nb(S.e.caracs[X.statDe(v)])} pts</em></div><div class="segs-etq">${segs}</div>` +
        `<div class="pc">${libres > 0 ? `<span class="libres">${pl(libres, 'Sceau', 'Sceaux')} à poser</span>` : `Jauge ${j} / ${SD.regles.pointsParSceau}`}</div>`;
      if (el._h !== h) { el._h = h; el.innerHTML = h; }
    }
    this.filtrer(S.filtre);
  };
  Arbre.prototype.filtrer = function (bid) {
    if (this._filtre === bid) return;
    this._filtre = bid;
    for (const el of $$('[data-br]', this.monde)) el.classList.toggle('attenue', bid !== 'tout' && el.dataset.br !== bid);
  };
  Arbre.prototype.bornes = function (bid) {
    let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
    for (const c of D.competences) {
      if (bid && bid !== 'tout' && c.branche !== bid) continue;
      const p = D.pos[c.id];
      x0 = Math.min(x0, p.x); y0 = Math.min(y0, p.y); x1 = Math.max(x1, p.x); y1 = Math.max(y1, p.y);
    }
    if (!bid || bid === 'tout') { x0 = Math.min(x0, 0); x1 = Math.max(x1, 0); y1 = Math.max(y1, 40); }
    else y1 += 180;
    return { x0: x0 - 60, y0: y0 - 60, x1: x1 + 60, y1: y1 + 60 };
  };
  Arbre.prototype.zMin = function () {
    const r = this.hote.getBoundingClientRect();
    if (!r.width) return 0.2;
    return clamp(this.zCadre('tout') * (this.mini ? 1 : 0.85), 0.05, 1);
  };
  Arbre.prototype.zCadre = function (bid) {
    const r = this.hote.getBoundingClientRect();
    if (!r.width) return 0.2;
    const b = this.bornes(bid), haut = this.mini ? 10 : 70;
    return Math.min(r.width / (b.x1 - b.x0), (r.height - haut) / (b.y1 - b.y0), bid && bid !== 'tout' ? 1.15 : 1);
  };
  Arbre.prototype.loin = function (voie) { return !this.mini && this.but.z < 0.7 * this.zCadre(voie); };
  Arbre.ZMAX = 1.8;
  Arbre.prototype.borner = function (c) {
    const b = this._bt || (this._bt = this.bornes('tout'));
    const r = this.hote.getBoundingClientRect();
    if (!r.width || !c.z) return c;
    const mx = Math.max(0, r.width / 2 / c.z - 24 / c.z), my = Math.max(0, r.height / 2 / c.z - 24 / c.z);
    const axe = (v, a, z, m) => (z - a <= 2 * m ? (a + z) / 2 : clamp(v, a + 0.4 * m, z - 0.4 * m));
    const haut = this.mini ? 10 : 70;
    c.x = axe(c.x, b.x0, b.x1, mx);
    c.y = axe(c.y, b.y0 - haut / c.z, b.y1, my);
    return c;
  };
  Arbre.prototype.cadrer = function (bid, immediat) {
    const r = this.hote.getBoundingClientRect();
    if (!r.width) return;
    const b = this.bornes(bid);
    const haut = this.mini ? 10 : 70;
    const z = clamp(this.zCadre(bid), this.zMin(), Arbre.ZMAX);
    this.viser((b.x0 + b.x1) / 2, (b.y0 + b.y1) / 2 - haut / 2 / z, z, immediat);
  };
  Arbre.prototype.viser = function (x, y, z, immediat) {
    this.but = this.borner({ x, y, z: clamp(z, this.zMin(), Arbre.ZMAX) });
    if (immediat) { this.cam = { ...this.but }; this.poser(); } else this.voler(this.but);
  };
  Arbre.VOL_MS = [600, 1100];
  Arbre.prototype.voler = function (vers) {
    if (this.anim) { cancelAnimationFrame(this.anim); this.anim = 0; }
    const de = { ...this.cam }, r = this.hote.getBoundingClientRect();
    const chemin = Math.hypot((vers.x - de.x) * de.z, (vers.y - de.y) * de.z) / Math.max(1, Math.hypot(r.width, r.height)) + Math.abs(Math.log(vers.z / de.z));
    const duree = clamp(Arbre.VOL_MS[0] + chemin * 420, Arbre.VOL_MS[0], Arbre.VOL_MS[1]);
    const doux = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
    const t0 = performance.now(), jeton = (this.vol = (this.vol || 0) + 1);
    this.vit = { x: 0, y: 0 };
    const pas = (t) => {
      if (this.vol !== jeton || this.tient) { this.anim = 0; return; }
      const k = doux(Math.min(1, (t - t0) / duree));
      this.cam = { x: de.x + (vers.x - de.x) * k, y: de.y + (vers.y - de.y) * k, z: de.z * Math.pow(vers.z / de.z, k) };
      this.poser();
      this.anim = k < 1 ? requestAnimationFrame(pas) : 0;
      if (k >= 1) this.but = { ...vers };
    };
    this.anim = requestAnimationFrame(pas);
  };
  Arbre.prototype.poser = function () {
    const r = this.hote.getBoundingClientRect(), c = this.cam;
    this.monde.style.transform = `translate(${r.width / 2 - c.x * c.z}px, ${r.height / 2 - c.y * c.z}px) scale(${c.z})`;
  };
  Arbre.prototype.boucle = function () {
    if (this.vol) { this.vol++; if (this.anim) { cancelAnimationFrame(this.anim); this.anim = 0; } this.but.x = this.cam.x; this.but.y = this.cam.y; }
    if (this.anim) return;
    const pas = () => {
      const c = this.cam, b = this.but;
      if (!this.tient) { b.x += this.vit.x; b.y += this.vit.y; this.vit.x *= 0.9; this.vit.y *= 0.9; }
      const bx = b.x, by = b.y; this.borner(b);
      if (b.x !== bx) this.vit.x = 0;
      if (b.y !== by) this.vit.y = 0;
      c.x += (b.x - c.x) * 0.2; c.y += (b.y - c.y) * 0.2; c.z += (b.z - c.z) * 0.2;
      this.poser();
      const fini = Math.abs(b.x - c.x) < 0.3 && Math.abs(b.y - c.y) < 0.3 && Math.abs(b.z - c.z) < 0.002 && Math.abs(this.vit.x) + Math.abs(this.vit.y) < 0.05;
      this.anim = fini && !this.tient ? 0 : requestAnimationFrame(pas);
    };
    this.anim = requestAnimationFrame(pas);
  };
  Arbre.prototype.zoomVers = function (clientX, clientY, facteur) {
    const r = this.hote.getBoundingClientRect(), mx = clientX - r.left - r.width / 2, my = clientY - r.top - r.height / 2;
    const z0 = this.but.z, z1 = clamp(z0 * facteur, this.zMin(), Arbre.ZMAX);
    const wx = this.but.x + mx / z0, wy = this.but.y + my / z0;
    this.but = { x: wx - mx / z1, y: wy - my / z1, z: z1 };
  };
  Arbre.prototype.ecouter = function () {
    const h = this.hote;
    h.addEventListener('wheel', (e) => {
      e.preventDefault();
      this.touche = true;
      this.zoomVers(e.clientX, e.clientY, e.deltaY < 0 ? 1.15 : 1 / 1.15);
      cacherCarte(); this.boucle();
    }, { passive: false });
    let dx = 0, dy = 0, lx = 0, ly = 0, t = 0;
    const doigts = new Map();
    let pince = null;
    h.addEventListener('pointerdown', (e) => {
      if (e.button !== 0) return;
      doigts.set(e.pointerId, { x: e.clientX, y: e.clientY });
      if (doigts.size === 2) {
        const [a, b] = [...doigts.values()];
        pince = { d: Math.hypot(a.x - b.x, a.y - b.y) || 1 };
        this.deplace = true; cacherCarte();
        return;
      }
      this.tient = true; this.touche = true; this.deplace = false; dx = dy = 0; lx = e.clientX; ly = e.clientY; t = performance.now();
      this.vit = { x: 0, y: 0 }; h.classList.add('glisse'); this.boucle();
    });
    this._move = (e) => {
      if (doigts.has(e.pointerId)) doigts.set(e.pointerId, { x: e.clientX, y: e.clientY });
      if (pince && doigts.size === 2) {
        const [a, b] = [...doigts.values()];
        const d = Math.hypot(a.x - b.x, a.y - b.y) || 1;
        this.zoomVers((a.x + b.x) / 2, (a.y + b.y) / 2, d / pince.d);
        pince.d = d; this.boucle();
        return;
      }
      if (!this.tient) return;
      const mx = e.clientX - lx, my = e.clientY - ly; lx = e.clientX; ly = e.clientY;
      dx += Math.abs(mx); dy += Math.abs(my);
      if (dx + dy > 6) { this.deplace = true; cacherCarte(); }
      const z = this.but.z;
      this.but.x -= mx / z; this.but.y -= my / z;
      const dt = Math.max(1, performance.now() - t); t = performance.now();
      this.vit = { x: -mx / z * (16 / dt) * 0.9, y: -my / z * (16 / dt) * 0.9 };
    };
    this._up = (e) => {
      doigts.delete(e.pointerId);
      if (pince) { if (doigts.size < 2) { pince = null; this.tient = false; h.classList.remove('glisse'); setTimeout(() => { this.deplace = false; }, 0); } return; }
      if (!this.tient) return;
      this.tient = false; h.classList.remove('glisse');
      setTimeout(() => { this.deplace = false; }, 0);
      this.boucle();
    };
    window.addEventListener('pointermove', this._move);
    window.addEventListener('pointerup', this._up);
    window.addEventListener('pointercancel', this._up);
    h.addEventListener('dblclick', (e) => { if (e.target === h || e.target === this.monde) this.cadrer(S.filtre); });
    h.addEventListener('click', (e) => { if (e.target === h || e.target === this.monde) { cacherCarte(); S.carteDe = null; } });
  };
  Arbre.prototype.zoom = function (sens) {
    if (!sens) return this.cadrer(S.filtre);
    this.but.z = clamp(this.but.z * (sens > 0 ? 1.25 : 0.8), this.zMin(), Arbre.ZMAX); this.boucle();
  };
  Arbre.prototype.detruire = function () {
    if (this.ro) this.ro.disconnect();
    if (this._move) { window.removeEventListener('pointermove', this._move); window.removeEventListener('pointerup', this._up); window.removeEventListener('pointercancel', this._up); }
    if (this.anim) cancelAnimationFrame(this.anim);
  };

  let ARBRE = null, MINI = null;

  function placerCarte(carte, el) {
    carte.hidden = false;
    const rr = el.getBoundingClientRect(), W = window.innerWidth, H = window.innerHeight;
    const cw = Math.min(330, W - 24), ch = carte.offsetHeight;
    let x = rr.right + 16;
    if (x + cw > W - 12) x = rr.left - cw - 16;
    if (x < 12) x = clamp(rr.left + rr.width / 2 - cw / 2, 12, W - cw - 12);
    let y = rr.top + rr.height / 2 - ch / 2;
    y = clamp(y, 12, Math.max(12, H - ch - 12));
    carte.style.left = x + 'px'; carte.style.top = y + 'px';
  }
  function ligneEff(k, v, suivant) {
    const def = effetDef(k);
    const val = suivant != null ? `${fmtEffet(k, v)}<span class="fl">→</span><span class="nx">${fmtEffet(k, suivant)}</span>` : fmtEffet(k, v);
    return `<div class="eff"><span class="ei">${ico(def.icone)}</span>${esc(def.label)}<span class="ev">${val}</span></div>`;
  }
  function montrerCarte(id, el) {
    const carte = $('#carte');
    S.carteDe = id;
    if (id === '__racine') return montrerBilan(carte, el);
    const c = D.comp[id];
    if (!c) return;
    const b = D.br[c.branche];
    if (c.coeur) return montrerCoeur(carte, el, c, b);
    const r = rangDe(c.id), e = etat(c);
    const statut = { maitrise: ['ok', 'Maîtrisé'], cours: ['cours', 'En cours'], pret: ['dispo', 'Disponible'], ouvert: ['ferme', 'Pas encore'], verrou: ['ferme', 'Verrouillé'] }[e];
    let h = `<div class="ct"><div class="ic">${ico(c.icone)}</div><div><h3>${esc(c.label)}</h3><div class="br">${esc(b.label)} · ${esc(sousNom(c))} <span class="pill ${statut[0]}">${statut[1]}</span></div></div></div>`;
    h += `<p class="desc">${c.passif ? `<b class="passif">Clé de voûte.</b> ` : c.couronne ? `<b class="passif">Couronne.</b> ` : c.cle ? `<b class="passif">Clé de la branche.</b> ` : ''}${esc(c.desc || '')}</p>`;
    h += '<div class="rangs">';
    for (let i = 1; i <= c.rangs; i++) h += `<i class="${i <= r ? 'on' : ''}"></i>`;
    h += `<span>Rang ${r} / ${c.rangs}</span></div>`;
    const effs = Object.assign({}, c.effets, { pv: SD.regles.pvParSceau });
    const enCours = r > 0 && r < c.rangs;
    h += `<div class="sec"><h4>Effets<span>${enCours ? 'Actuel → Suivant' : r === 0 ? 'Au premier Sceau' : ''}</span></h4>`;
    for (const k of Object.keys(effs)) h += enCours ? ligneEff(k, effs[k] * r, effs[k] * (r + 1)) : ligneEff(k, effs[k] * Math.max(1, r));
    h += '</div>';
    const conds = X.conditions(S.e, c.id);
    if (conds.length) {
      h += '<div class="sec"><h4>Prérequis</h4>';
      for (const q of conds) {
        h += `<div class="req ${q.ok ? '' : 'non'}">${ico(q.ok ? 'circle-check' : 'circle-x')}<div style="flex:1">${esc(q.texte)}${q.chips ? `<div class="chips">${q.chips.map((x) => `<span class="chip ${x.ok ? 'ok' : ''}">${esc(x.label)}</span>`).join('')}</div>` : ''}</div>${q.val ? `<span class="rv">${esc(q.val)}</span>` : ''}</div>`;
      }
      h += '</div>';
    }
    const doigt = !!S.toucher;
    let act;
    if (e === 'maitrise') act = `<div class="act fini">${ico('circle-check')}Maîtrisé</div>`;
    else if (peutAcheter(c)) act = `<div class="act go">${ico('mouse-pointer-click')}${doigt ? 'Touche encore pour ' : 'Clique pour '}${r === 0 ? 'poser un Sceau' : `passer au rang ${r + 1}`}</div>`;
    else {
      const manque = conds.find((q) => !q.ok);
      let t = 'Pas encore disponible';
      if (manque && /^Coûte/.test(manque.texte)) t = `Il te manque un Sceau ${X.nomSceau(c.branche)} : mets des points en ${b.label}`;
      else if (manque && manque.chips) t = 'Pose d\'abord un Sceau sur le nœud d\'avant';
      else if (manque) t = `Il faut ${manque.texte.charAt(0).toLowerCase() + manque.texte.slice(1)}`;
      act = `<div class="act non">${ico('lock')}${esc(t)}</div>`;
    }
    carte.innerHTML = h + act;
    carte.setAttribute('style', couleur(b.couleur));
    placerCarte(carte, el);
  }
  function montrerCoeur(carte, el, c, b) {
    const v = c.branche, k = X.statDe(v), val = S.e.caracs[k], cout = coutCarac(v), libres = X.pointsLibres(S.e);
    const j = X.jauge(S.e, v), gagnes = X.sceauxGagnes(S.e, v), poses = X.sceauxPoses(S.e, v);
    let h = `<div class="ct"><div class="ic">${ico(c.icone)}</div><div><h3>${esc(b.label)}</h3><div class="br">${esc(c.label)} <span class="pill cours">${nb(val)} points</span></div></div></div>`;
    h += `<p class="desc">${esc(b.desc)}</p>`;
    h += '<div class="rangs jauge-sceau">';
    for (let i = 0; i < SD.regles.pointsParSceau; i++) h += `<i class="${i < j ? 'on' : ''}"></i>`;
    h += `<span>${j} / ${SD.regles.pointsParSceau}</span></div>`;
    h += `<div class="sec"><h4>Effets<span>Actuel → Point suivant</span></h4>${ligneEff('dmg_' + v, val, val + 1)}${ligneEff('init', val, val + 1)}</div>`;
    h += `<div class="sec"><h4>Sceaux ${esc(X.nomSceau(v))}</h4>
      <div class="req">${ico('sparkles')}<div style="flex:1">Gagnés</div><span class="rv">${gagnes}</span></div>
      <div class="req">${ico('git-branch')}<div style="flex:1">Posés dans l'arbre</div><span class="rv">${poses}</span></div>
      <div class="req ${gagnes - poses > 0 ? '' : 'non'}">${ico(gagnes - poses > 0 ? 'circle-check' : 'circle-dashed')}<div style="flex:1">À poser</div><span class="rv">${gagnes - poses}</span></div></div>`;
    const act = libres >= cout
      ? `<div class="act go">${ico('mouse-pointer-click')}${S.toucher ? 'Touche encore' : 'Clique'} pour mettre ${cout > 1 ? `${cout} points (1 de ${b.label})` : `1 point en ${b.label}`}${S.toucher ? '' : ' · Maj : 10'}</div>`
      : `<div class="act non">${ico('lock')}${libres > 0 ? `Le prochain point coûte ${cout} points, il t'en reste ${libres}` : 'Plus de points : ils viennent avec les niveaux (5 par niveau)'}</div>`;
    carte.innerHTML = h + act;
    carte.setAttribute('style', couleur(b.couleur));
    placerCarte(carte, el);
  }
  function montrerBilan(carte, el) {
    const bl = X.bilan(S.e), t = bl.total;
    let h = `<div class="ct"><div class="ic">${ico('sparkles')}</div><div><h3>${esc(S.joueur.nom || 'Ton Veilleur')}</h3><div class="br">Niveau ${S.e.niveau} <span class="pill dispo">${pl(bl.poses, 'Sceau posé', 'Sceaux posés')}</span></div></div></div>`;
    h += `<p class="desc">Ce que tes caractéristiques et tes quatre arbres te donnent, avant ta classe et ton équipement.</p>`;
    for (const cat of SD.categories) {
      const cles = Object.keys(t).filter((k) => t[k] && effetDef(k).cat === cat.id);
      if (!cles.length) continue;
      h += `<div class="sec"><h4>${esc(cat.nom)}</h4>${cles.map((k) => ligneEff(k, t[k])).join('')}</div>`;
    }
    carte.innerHTML = h;
    carte.setAttribute('style', couleur('#b44cf0'));
    placerCarte(carte, el);
  }
  function cacherCarte() { if (ROOT) $('#carte').hidden = true; S.carteDe = null; }

  function flash(el) { el.classList.remove('flash'); void el.offsetWidth; el.classList.add('flash'); }
  function clicNoeud(id, el, dix) {
    const c = D.comp[id];
    if (!c) return;
    if (c.coeur) {
      const r = mettrePoints(c.branche, dix ? 10 : 1);
      if (!r.ok) { flash(el); if (S.toucher) montrerCarte(id, el); return; }
      flash(el);
      if (S.carteDe === id) montrerCarte(id, el);
      return;
    }
    if (!peutAcheter(c)) { flash(el); return; }
    cacherCarte();
    S.choisi = id;
    const r = X.poser(S.e, id);
    sauver(); toutMaj();
    if (r.ok) cineDeblocage(id, r.rang);
  }
  function mettrePoints(voie, n) {
    const r = X.ajouterPoints(S.e, voie, n);
    if (!r.ok) { toast({ couleur: '#ff5c6c', icone: 'triangle-alert', sur: D.br[voie].label, titre: 'Impossible', texte: r.raison, cle: 'pts-' + voie }); return r; }
    if (r.gagnes) {
      const libres = X.sceauxLibres(S.e, voie);
      toast({ couleur: D.br[voie].couleur, icone: D.br[voie].icone, sur: D.br[voie].label, titre: r.gagnes > 1 ? `${r.gagnes} Sceaux ${X.nomSceau(voie)} gagnés` : `Sceau ${X.nomSceau(voie)} gagné`,
        texte: `${pl(libres, 'Sceau', 'Sceaux')} à poser dans l'arbre`, jauge: 100, cle: 'sceau-' + voie });
    }
    sauver(); toutMaj();
    return r;
  }
  function ouvrirArbreSur() { changerPage('arbre'); }


  const FILE = [];
  let enCine = false;
  function jouerCine(f) { FILE.push(f); if (!enCine) suivante(); }
  function suivante() {
    const f = FILE.shift();
    const cine = $('#cine');
    if (!f) { enCine = false; cine.hidden = true; return; }
    enCine = true;
    const fin = f(cine);
    cine.hidden = false; cine.classList.remove('sortie');
    let fini = false;
    const fermer = () => { if (fini) return; fini = true; cine.classList.add('sortie'); setTimeout(suivante, 420); };
    cine.onclick = fermer;
    setTimeout(fermer, fin || 2600);
  }
  function particules(n, fn) { let h = ''; for (let i = 0; i < n; i++) h += fn(i); return h; }

  function cineDeblocage(id, rang) {
    const c = D.comp[id];
    if (!c) return;
    const b = D.br[c.branche];
    jouerCine((cine) => {
      cine.className = 'cine';
      cine.setAttribute('style', couleur(b.couleur));
      const eclats = particules(16, (i) => `<i class="eclat" style="--r:${Math.round(i * 22.5 + Math.random() * 12)}deg;animation-delay:${(0.25 + Math.random() * 0.35).toFixed(2)}s"></i>`);
      const pouss = particules(26, () => { const a = Math.random() * 6.28, d = 140 + Math.random() * 220; return `<i class="poussiere" style="left:50%;top:calc(50% - 80px);--dx:${Math.round(Math.cos(a) * d)}px;--dy:${Math.round(Math.sin(a) * d)}px;animation-delay:${(0.2 + Math.random() * 0.5).toFixed(2)}s"></i>`; });
      cine.innerHTML = `<div class="scene-c">
                <i class="cercle" style="width:300px;height:300px;margin-top:-80px;animation-delay:.05s"></i>
                <i class="cercle" style="width:420px;height:420px;margin-top:-80px;animation-delay:.18s"></i>
                <i class="cercle" style="width:560px;height:560px;margin-top:-80px;animation-delay:.32s;border-style:dashed"></i>
                <i class="rayons" style="margin-top:-80px"></i><i class="gloire" style="margin-top:-80px"></i><i class="ticks2"></i>
                ${eclats}${pouss}
                <div class="hexc">${ico(c.icone)}</div>
                <div class="surtitre">${rang > 1 ? 'Nouveau rang' : c.passif ? 'Clé de voûte' : c.couronne ? 'Couronne' : 'Sceau posé'}</div>
                <div class="grand">${esc(c.label)}</div>
                <div class="sous">${esc(b.label)} · ${esc(sousNom(c))} · Rang ${rang} / ${c.rangs}</div>
                <i class="trait"></i></div>`;
      return 2600;
    });
  }

  function cineNiveau(de, a, points) {
    jouerCine((cine) => {
      cine.className = 'cine niveau';
      cine.setAttribute('style', couleur('#b44cf0'));
      const pouss = particules(22, () => { const t = Math.random() * 6.28, d = 130 + Math.random() * 200; return `<i class="poussiere" style="left:50%;top:calc(50% - 70px);--dx:${Math.round(Math.cos(t) * d)}px;--dy:${Math.round(Math.sin(t) * d)}px;animation-delay:${(0.4 + Math.random() * 0.6).toFixed(2)}s"></i>`; });
      cine.innerHTML = `<div class="scene-c">
                <i class="cercle" style="width:330px;height:330px;margin-top:-70px;animation-delay:.1s"></i>
                <i class="cercle" style="width:470px;height:470px;margin-top:-70px;animation-delay:.25s;border-style:dashed"></i>
                ${pouss}
                <div class="titre-n">Nouveau niveau</div>
                <div class="bague"><svg viewBox="0 0 210 210"><defs><linearGradient id="gradNiv" x1="0" x2="1" y1="0" y2="1"><stop offset="0" style="stop-color:var(--a)"/><stop offset="1" style="stop-color:var(--b)"/></linearGradient></defs>
                    <circle class="fond-c" cx="105" cy="105" r="95"/><circle class="arc" cx="105" cy="105" r="95"/></svg>
                    <div class="orbe"><b id="cineNb">${de}</b></div></div>
                <div class="de-a"><span>${de}</span><i></i><span class="n">${a}</span></div>
                <div class="gain"><div class="badge-pts">${ico('sparkles')}+${points} points de caractéristique</div></div></div>`;
      const b = $('#cineNb', cine), t0 = performance.now() + 300, duree = 1300;
      const pas = (t) => { const k = clamp((t - t0) / duree, 0, 1); b.textContent = Math.round(de + (a - de) * (1 - Math.pow(1 - k, 3))); if (k < 1) requestAnimationFrame(pas); };
      requestAnimationFrame(pas);
      return 3000;
    });
  }


  const TOASTS = {};
  function toast(t) {
    const zone = $('#toasts');
    const cle = t.cle || (t.titre + '|' + t.texte);
    const duree = t.duree || 4500;
    let el = TOASTS[cle];
    if (el && el.isConnected) {
      el.n = (el.n || 1) + 1;
      clearTimeout(el.minuteur);
    } else {
      el = document.createElement('div');
      el.className = 'toast';
      zone.appendChild(el);
      TOASTS[cle] = el;
      while (zone.children.length > 5) zone.firstChild.remove();
    }
    el.setAttribute('style', couleur(t.couleur || '#ff3d8b'));
    el.innerHTML = `<div class="ic">${ico(t.icone || 'sparkles')}</div><div style="flex:1;min-width:0"><small>${esc(t.sur || '')}</small><b>${esc(t.titre || '')}</b>${t.texte ? `<span>${esc(t.texte)}</span>` : ''}${t.jauge != null ? `<div class="jauge c"><i style="width:${clamp(t.jauge, 0, 100)}%"></i></div>` : ''}</div><code class="compte">${el.n > 1 ? '×' + el.n : ''}</code><i class="duree" style="animation-duration:${duree}ms"></i>`;
    el.minuteur = setTimeout(() => { el.classList.add('out'); setTimeout(() => el.remove(), 300); }, duree);
  }


  function renderTete() {
    const j = S.joueur, e = S.e, total = X.pointsTotal(e.niveau), libres = X.pointsLibres(e);
    const xp = j.xpMax ? { v: j.xp, max: j.xpMax, txt: `${nb(j.xp)} / ${nb(j.xpMax)} XP` } : { v: total - libres, max: total, txt: `${pl(libres, 'point')} à répartir` };
    const pc = xp.max ? Math.round(xp.v / xp.max * 100) : 100;
    const banc = !S.opts.jeu;
    $('#niveauTete').innerHTML = `<${banc ? 'button type="button" title="Banc d\'essai : un niveau de plus (Maj : un de moins)"' : 'div'} class="hexa" id="hexaNiv"><b>${e.niveau}</b></${banc ? 'button' : 'div'}><div class="infos"><div class="l1"><b>${esc(j.titre || 'Veilleur')}</b><span class="mono">${esc(xp.txt)}</span><span class="mono">${pc} %</span></div><div class="jauge"><i style="width:${pc}%"></i></div></div>`;
    const p = $('#ongletPts'), n = X.sceauxLibresTotal(e); p.hidden = !n; p.textContent = n;
    const h = $('#hexaNiv');
    if (banc) h.onclick = (ev) => changerNiveau(e.niveau + (ev.shiftKey ? -1 : 1));
  }
  function changerNiveau(niveau) {
    const de = S.e.niveau;
    if (niveau === de || niveau < 1 || niveau > SD.regles.niveauMax) return;
    const r = X.changerNiveau(S.e, niveau);
    if (r.rendu) toast({ couleur: '#f5b83d', icone: 'rotate-ccw', sur: 'Banc d\'essai', titre: 'Tout est rendu', texte: 'Ce niveau ne paie plus les points répartis.' });
    if (niveau > de) cineNiveau(de, niveau, SD.regles.pointsParNiveau * (niveau - de));
    sauver(); toutMaj();
  }

  function renderBarreArbre() {
    const e = S.e;
    const libres = X.pointsLibres(e);
    let h = `<div class="groupe pts"><span class="ic">${ico('sparkles')}</span><b>${X.sceauxLibresTotal(e)}</b><small>Sceaux</small><i class="sep"></i><span class="pret">${prets()} à<br>poser</span></div>`;
    h += `<div class="groupe pts points${libres ? ' on' : ''}" title="Points de caractéristique : clique sur le cœur d'une voie pour les y mettre"><b>${nb(libres)}</b><small>point${libres > 1 ? 's' : ''}</small></div>`;
    h += `<div class="groupe"><button type="button" class="filtre tout ${S.filtre === 'tout' ? 'actif' : ''}" data-filtre="tout">Tout</button>`;
    for (const b of D.branches) {
      const n = X.sceauxLibres(e, b.id);
      h += `<button type="button" class="filtre ${S.filtre === b.id ? 'actif' : ''}" data-filtre="${esc(b.id)}" style="${couleur(b.couleur)}"><i></i>${esc(b.label)}${n > 0 ? `<em>${n}</em>` : ''}</button>`;
    }
    h += '</div>';
    h += `<div class="groupe"><button type="button" class="filtre" id="btnReinit" title="Réinitialiser l'arbre" aria-label="Réinitialiser l'arbre">${ico('rotate-ccw')}<span>Réinitialiser</span></button></div>`;
    $('#barreArbre').innerHTML = h;
    $$('[data-filtre]').forEach((el) => el.onclick = () => { S.filtre = el.dataset.filtre; renderBarreArbre(); ARBRE.filtrer(S.filtre); ARBRE.cadrer(S.filtre); });
    $('#btnReinit').onclick = () => demanderReinit(false);
  }
  function prixTexte() {
    const p = X.prixReinit(S.e.niveau);
    return p ? `${nb(p)} Dragmes (tu en as ${nb(S.e.dragmes)})` : `gratuite jusqu'au niveau ${SD.regles.reinitGratuiteJusqua}`;
  }
  function demanderReinit(tout) {
    const quoi = tout ? 'Tout réinitialiser ? Tes points de caractéristique et tes Sceaux reviennent' : 'Réinitialiser l\'arbre ? Tes Sceaux reviennent dans leurs jauges';
    if (!confirmer(`${quoi}. Coût : ${prixTexte()}.`, tout)) return;
    const r = X.reinitialiser(S.e, tout);
    if (r.ok) { sauver(); toutMaj(); }
    toast(r.ok ? { couleur: '#2fd27a', icone: 'rotate-ccw', sur: tout ? 'Caractéristiques' : 'Arbre', titre: tout ? 'Tout est réinitialisé' : 'Arbre réinitialisé', texte: `${pl(r.sceaux, 'Sceau rendu', 'Sceaux rendus')}${tout ? `, ${pl(r.points, 'point rendu', 'points rendus')}` : ''}${r.prix ? ` · −${nb(r.prix)} Dragmes` : ''}.` }
      : { couleur: '#ff5c6c', icone: 'triangle-alert', sur: 'Réinitialisation', titre: 'Impossible', texte: r.raison });
  }
  let attenteConfirm = 0, attenteQuoi = null;
  function confirmer(texte, quoi) {
    if (Date.now() < attenteConfirm && attenteQuoi === quoi) { attenteConfirm = 0; return true; }
    attenteConfirm = Date.now() + 4000; attenteQuoi = quoi;
    toast({ couleur: '#f5b83d', icone: 'circle-help', sur: 'Confirmation', titre: 'Clique encore pour confirmer', texte, duree: 4000, cle: 'confirmer' });
    return false;
  }

  function renderApercu() {
    const e = S.e, total = X.pointsTotal(e.niveau), libres = X.pointsLibres(e);
    const pcPts = total ? Math.round((total - libres) / total * 100) : 0;
    const banc = !S.opts.jeu;
    let gauche = `<div class="bloc"><div class="carte-niv"><${banc ? 'button type="button" title="Banc d\'essai : un niveau de plus (Maj : un de moins)" data-niveau="1"' : 'div'} class="hexa"><b>${e.niveau}</b></${banc ? 'button' : 'div'}><div class="t"><small>Niveau du Veilleur</small><b>${e.niveau}</b><br><span class="rang">${esc(S.joueur.titre || 'Veilleur')}</span></div></div>
        <div class="ligne-xp"><span>Points <b>${nb(total - libres)}</b> / ${nb(total)}</span><b>${pcPts} %</b></div><div class="jauge"><i style="width:${pcPts}%"></i></div>
        <div class="prochain"><span>${ico('sparkles')}Prochain niveau : +${SD.regles.pointsParNiveau} points de caractéristique</span><span>${ico('crown')}${SD.regles.pointsParSceau} de caractéristique : 1 Sceau de la voie</span></div></div>`;
    gauche += `<div class="bloc caracs"><div class="bloc-titre">Caractéristiques<span class="droite reste${libres ? ' on' : ''}">${pl(libres, 'point')}</span></div>`;
    for (const b of D.branches) {
      const v = b.id, val = e.caracs[X.statDe(v)], j = X.jauge(e, v), n = X.sceauxLibres(e, v), cout = coutCarac(v);
      const segs = Array.from({ length: SD.regles.pointsParSceau }, (_, i) => `<i class="${i < j ? 'on' : ''}"></i>`).join('');
      gauche += `<div class="carac" style="${couleur(b.couleur)}"><span class="ic">${ico(b.icone)}</span><div class="t"><b>${esc(b.label)}</b><small>coût ${cout}${n > 0 ? ` · <em>${pl(n, 'Sceau', 'Sceaux')} à poser</em>` : ''}</small><div class="segs">${segs}</div></div>` +
        `<b class="v">${nb(val)}</b><button type="button" class="plus-c" data-plus="${esc(v)}" ${libres >= cout ? '' : 'disabled'} title="1 point en ${esc(b.label)} (Maj : 10 ; maintenir pour répéter)" aria-label="1 point en ${esc(b.label)}">${ico('plus')}</button></div>`;
    }
    gauche += `<button type="button" class="reinit-tout" id="btnReinitTout">${ico('rotate-ccw')}Tout réinitialiser · ${esc(X.prixReinit(e.niveau) ? nb(X.prixReinit(e.niveau)) + ' Dragmes' : 'gratuit')}</button></div>`;

    const centre = `<div class="bloc mini-arbre"><button type="button" class="btn ouvrir" data-aller="arbre">${ico('git-branch')}Ouvrir l'arbre</button><div class="scene" id="miniScene"></div></div>`;

    let droite = '<div class="bloc"><div class="bloc-titre">Derniers Sceaux posés</div><div class="liste-deb">';
    const debs = (e.poses || []).slice(0, 5);
    if (!debs.length) droite += '<div class="vide">Rien encore : mets des points dans une voie, puis pose ses Sceaux dans l\'arbre.</div>';
    for (const d of debs) {
      const c = D.comp[d.id]; if (!c) continue;
      const b = D.br[c.branche];
      droite += `<div class="deb" style="${couleur(b.couleur)}"><span class="ic">${ico(c.icone)}</span><div><b>${esc(c.label)}</b><small>${esc(b.label)} · ${esc(sousNom(c))} · ${d.rang}/${c.rangs}</small></div><span class="t">${esc(ilYa(d.t))}</span></div>`;
    }
    droite += '</div></div>';
    const t = X.bilan(e).total;
    const parCat = SD.categories.map((cat) => ({ cat, cles: Object.keys(t).filter((k) => t[k] && effetDef(k).cat === cat.id) }));
    if (!parCat.some((x) => x.cat.id === S.catEffets && x.cles.length)) S.catEffets = (parCat.find((x) => x.cles.length) || parCat[0]).cat.id;
    droite += '<div class="bloc eff-liste"><div class="bloc-titre">Effets actifs</div><div class="eff-cats" role="tablist" aria-label="Catégories d\'effets">';
    for (const { cat, cles } of parCat) {
      const on = cat.id === S.catEffets;
      droite += `<button type="button" class="eff-catb${on ? ' on' : ''}" data-cat="${esc(cat.id)}" role="tab" aria-selected="${on}" ${cles.length ? '' : 'disabled'}>${ico(cat.icone)}<span>${esc(cat.nom)}</span><em>${cles.length}</em></button>`;
    }
    droite += '</div><div class="eff-corps" role="tabpanel">';
    const choisie = parCat.find((x) => x.cat.id === S.catEffets);
    if (!choisie || !choisie.cles.length) droite += '<div class="vide">Aucun effet pour l\'instant.</div>';
    else for (const k of choisie.cles) droite += `<div class="eff"><span class="ei">${ico(effetDef(k).icone)}</span>${esc(effetDef(k).label)}<span class="ev ${t[k] < 0 ? 'neg' : ''}">${fmtEffet(k, t[k])}</span></div>`;
    droite += '</div></div>';

    const garde = MINI && MINI.hote.isConnected && $('#p-apercu .apercu');
    if (garde) {
      $('#apG').innerHTML = gauche;
      $('#apD').innerHTML = droite;
      MINI.maj();
    } else {
      $('#p-apercu').innerHTML = `<div class="apercu"><div class="col" id="apG">${gauche}</div><div class="col col-centre">${centre}</div><div class="col" id="apD">${droite}</div></div>`;
      MINI = new Arbre($('#miniScene'), { mini: true });
      requestAnimationFrame(() => MINI.cadrer('tout', true));
    }
    $$('#p-apercu [data-aller]').forEach((el) => el.onclick = () => changerPage(el.dataset.aller));
    $$('#p-apercu [data-niveau]').forEach((el) => el.onclick = (ev) => changerNiveau(S.e.niveau + (ev.shiftKey ? -1 : 1)));
    $$('#p-apercu [data-plus]').forEach(brancherPlus);
    $$('#p-apercu [data-cat]').forEach((el) => el.onclick = () => { S.catEffets = el.dataset.cat; renderApercu(); });
    const rt = $('#btnReinitTout'); if (rt) rt.onclick = () => demanderReinit(true);
    if (!ARBRE) setTimeout(preparerArbre, 120);
  }
  function brancherPlus(bt) {
    let minuteur = 0, repete = false;
    const stop = () => { clearTimeout(minuteur); minuteur = 0; };
    bt.onpointerdown = (ev) => {
      if (ev.button !== 0) return;
      repete = false;
      const v = bt.dataset.plus;
      const tour = (delai) => { minuteur = setTimeout(() => { repete = true; if (!mettrePoints(v, 1).ok) return stop(); tour(Math.max(45, delai * 0.82)); }, delai); };
      tour(380);
    };
    bt.onpointerup = bt.onpointerleave = bt.onpointercancel = stop;
    bt.onclick = (ev) => { if (repete) { repete = false; return; } mettrePoints(bt.dataset.plus, ev.shiftKey ? 10 : 1); };
  }
  function preparerArbre() {
    if (ARBRE || !S.ouvert || !$('#scene')) return;
    ARBRE = new Arbre($('#scene'));
    ARBRE.aCadrer = true;
  }
  function ilYa(t) {
    const s = Math.max(0, Math.floor((Date.now() - (t || 0)) / 1000));
    if (s < 60) return 'à l\'instant';
    if (s < 3600) return `il y a ${Math.floor(s / 60)} min`;
    if (s < 86400) return `il y a ${Math.floor(s / 3600)} h`;
    return `il y a ${Math.floor(s / 86400)} j`;
  }

  function renderArbre() {
    renderBarreArbre();
    if (!ARBRE || !ARBRE.hote.isConnected) { ARBRE = new Arbre($('#scene')); requestAnimationFrame(() => ARBRE.cadrer(S.filtre, true)); }
    else {
      ARBRE.maj();
      if (ARBRE.aCadrer && !ZOOM) { ARBRE.aCadrer = false; requestAnimationFrame(() => ARBRE.cadrer(S.filtre, true)); }
    }
  }


  let ZOOM = 0;
  const ZOOM_MS = 560;
  const easeOut = (t) => 1 - Math.pow(1 - t, 3);
  function ongletsActifs(p) { $$('#onglets [data-page]').forEach((b) => b.classList.toggle('actif', b.dataset.page === p)); }
  function camPour(arbre, mini) {
    const h = arbre.hote.getBoundingClientRect(), m = mini.hote.getBoundingClientRect(), c = mini.cam;
    return { x: c.x + ((h.left + h.width / 2) - (m.left + m.width / 2)) / c.z, y: c.y + ((h.top + h.height / 2) - (m.top + m.height / 2)) / c.z, z: c.z };
  }
  function decoupe(el) {
    const P = $('.pages').getBoundingClientRect(), r = el.getBoundingClientRect();
    return `inset(${r.top - P.top}px ${P.right - r.right}px ${P.bottom - r.bottom}px ${r.left - P.left}px round 14px)`;
  }
  function glisserCam(arbre, de, vers, fin) {
    if (arbre.anim) { cancelAnimationFrame(arbre.anim); arbre.anim = 0; }
    const t0 = performance.now();
    const pas = (t) => {
      const k = easeOut(Math.min(1, (t - t0) / ZOOM_MS));
      arbre.cam = { x: de.x + (vers.x - de.x) * k, y: de.y + (vers.y - de.y) * k, z: de.z + (vers.z - de.z) * k };
      arbre.but = { ...arbre.cam };
      arbre.poser();
      if (k < 1) requestAnimationFrame(pas); else if (fin) fin();
    };
    requestAnimationFrame(pas);
  }
  function zoomVersArbre() {
    const ap = $('#p-apercu'), ar = $('#p-arbre'), carte = $('#p-apercu .mini-arbre');
    if (!carte || !MINI || !ARBRE) return false;
    ZOOM = 1;
    const coupe = decoupe(carte), mini = MINI;
    S.page = 'arbre'; cacherCarte(); ongletsActifs('arbre');
    ap.classList.add('garde', 'mini-cache'); ap.classList.remove('actif');
    ar.classList.add('actif', 'zooming', 'zoom-debut');
    ar.style.clipPath = coupe;
    renderPage();
    requestAnimationFrame(() => requestAnimationFrame(() => {
      const de = camPour(ARBRE, mini);
      ARBRE.aCadrer = false;
      ARBRE.cam = { ...de }; ARBRE.but = { ...de }; ARBRE.poser();
      const cible = S.viseApres || S.filtre; S.viseApres = null;
      const b = ARBRE.bornes(cible);
      const z = clamp(ARBRE.zCadre(cible), ARBRE.zMin(), Arbre.ZMAX);
      const vers = { x: (b.x0 + b.x1) / 2, y: (b.y0 + b.y1) / 2 - 35 / z, z };
      void ar.offsetWidth;
      ap.classList.add('zoom-out');
      ar.classList.remove('zoom-debut');
      ar.style.clipPath = 'inset(0px 0px 0px 0px round 0px)';
      glisserCam(ARBRE, de, vers, () => {
        ar.classList.add('sans-entree');
        ap.classList.remove('garde', 'zoom-out', 'mini-cache');
        ar.classList.remove('zooming');
        ZOOM = 0;
      });
    }));
    return true;
  }
  function zoomVersApercu() {
    const ap = $('#p-apercu'), ar = $('#p-arbre');
    if (!ARBRE || !ARBRE.hote.isConnected) return false;
    ZOOM = 1;
    S.page = 'apercu'; cacherCarte(); ongletsActifs('apercu');
    ar.classList.add('garde', 'zooming'); ar.classList.remove('actif');
    ar.style.clipPath = 'inset(0px 0px 0px 0px round 0px)';
    ap.classList.add('actif', 'zoom-out', 'sans-anim', 'mini-cache');
    renderPage();
    requestAnimationFrame(() => requestAnimationFrame(() => {
      const carte = $('#p-apercu .mini-arbre');
      if (!carte || !MINI) { ar.classList.remove('garde', 'zooming'); ar.style.clipPath = ''; ap.classList.remove('zoom-out', 'sans-anim', 'mini-cache'); ZOOM = 0; return; }
      const de = { ...ARBRE.cam }, vers = camPour(ARBRE, MINI);
      void ap.offsetWidth;
      ap.classList.remove('zoom-out');
      ar.classList.add('zoom-debut');
      ar.style.clipPath = decoupe(carte);
      glisserCam(ARBRE, de, vers, () => {
        ap.classList.add('sans-entree');
        ar.classList.remove('garde', 'zooming', 'zoom-debut'); ar.style.clipPath = '';
        ap.classList.remove('sans-anim', 'mini-cache');
        ZOOM = 0;
      });
    }));
    return true;
  }

  function changerPage(p) {
    if (p !== 'arbre') p = 'apercu';
    if (ZOOM) return;
    if (S.ouvert && S.page === 'apercu' && p === 'arbre' && zoomVersArbre()) return;
    if (S.ouvert && S.page === 'arbre' && p === 'apercu' && zoomVersApercu()) return;
    S.page = p; cacherCarte();
    $$('#onglets [data-page]').forEach((b) => b.classList.toggle('actif', b.dataset.page === p));
    $$('.page').forEach((el) => { el.classList.remove('sans-entree'); el.classList.toggle('actif', el.id === 'p-' + p); });
    renderPage();
  }
  function renderPage() {
    if (!S.e) return;
    renderTete();
    (S.page === 'arbre' ? renderArbre : renderApercu)();
  }
  function toutMaj() { renderPage(); if (ARBRE && S.page !== 'arbre') ARBRE.maj(); if (MINI && S.page !== 'apercu') MINI.maj(); }

  const MARQUAGE = `
<div id="app" hidden>
  <div class="fenetre">
    <div class="fond"><i class="grille"></i><i class="halo h1"></i><i class="halo h2"></i></div>
    <header class="tete">
        <div class="marque"><b>VY</b><span>Sceaux</span></div>
        <nav class="onglets" id="onglets">
            <button type="button" data-page="apercu">Aperçu</button>
            <button type="button" data-page="arbre">Arbre<em id="ongletPts" hidden></em></button>
        </nav>
        <div class="niveau-tete" id="niveauTete"></div>
        <button type="button" class="fermer" id="btnFermer" title="Fermer (Échap)"><svg data-i="x"></svg></button>
    </header>
    <main class="pages">
        <section class="page" id="p-apercu"></section>
        <section class="page" id="p-arbre">
            <div class="barre-arbre" id="barreArbre"></div>
            <div class="scene" id="scene"></div>
            <div class="aide-arbre"><span><kbd>Molette</kbd> zoom</span><span><kbd>Clic</kbd> + glisser : déplacer</span><span><kbd>Double-clic</kbd> centrer</span><span><kbd>Maj</kbd> + clic sur un cœur : 10 points</span></div>
            <div class="zoom-btns">
                <button type="button" data-zoom="1" title="Zoomer"><svg data-i="zoom-in"></svg></button>
                <button type="button" data-zoom="-1" title="Dézoomer"><svg data-i="zoom-out"></svg></button>
                <button type="button" data-zoom="0" title="Tout voir"><svg data-i="maximize"></svg></button>
            </div>
        </section>
    </main>
  </div>
  <div class="carte-comp" id="carte" hidden></div>
</div>
<div class="cine" id="cine" hidden></div>
<div class="toasts pos-middle-right" id="toasts"></div>`;

  function monter(base) {
    if (ROOT) return PRET;
    HOTE = document.createElement('div');
    HOTE.id = 'arbre-sceaux';
    HOTE.setAttribute('style', 'position:fixed;inset:0;z-index:9000;display:none');
    document.body.appendChild(HOTE);
    ROOT = HOTE.attachShadow({ mode: 'open' });
    const lien = document.createElement('link');
    lien.rel = 'stylesheet'; lien.href = (base || '') + 'css/arbre.css';
    PRET = new Promise((ok) => { lien.onload = ok; lien.onerror = ok; setTimeout(ok, 2500); });
    ROOT.appendChild(lien);
    const corps = document.createElement('div');
    corps.innerHTML = MARQUAGE;
    while (corps.firstChild) ROOT.appendChild(corps.firstChild);
    $$('svg[data-i]').forEach((s) => { s.setAttribute('viewBox', '0 0 24 24'); s.innerHTML = ICONES()[s.dataset.i] || ''; });
    $$('#onglets [data-page]').forEach((b) => b.onclick = () => changerPage(b.dataset.page));
    $('#btnFermer').onclick = () => fermer();
    $$('.zoom-btns [data-zoom]').forEach((b) => b.onclick = () => ARBRE && ARBRE.zoom(Number(b.dataset.zoom)));
    window.addEventListener('resize', () => { if (!S.ouvert) return; if (ARBRE && S.page === 'arbre') ARBRE.poser(); if (MINI && S.page === 'apercu') MINI.cadrer('tout', true); });
    return PRET;
  }

  async function ouvrir(o) {
    if (!X) throw new Error('js/sceaux.js doit être chargé avant js/arbre.js');
    S.opts = o || {};
    S.e = S.opts.etat || X.nouveau(1);
    S.joueur = S.opts.joueur || {};
    indexer();
    await monter(S.opts.base);
    HOTE.style.display = 'block';
    HOTE.classList.toggle('dans-jeu', !!S.opts.jeu);
    $('#app').classList.toggle('dans-jeu', !!S.opts.jeu);
    $('#btnFermer').hidden = !S.opts.jeu;
    S.ouvert = true;
    $('#app').hidden = false;
    if (ARBRE) ARBRE.detruire();
    ARBRE = null; MINI = null; S.page = 'apercu';
    $$('.page').forEach((el) => { el.classList.remove('actif', 'garde', 'zooming', 'zoom-debut', 'zoom-out', 'mini-cache', 'sans-anim', 'sans-entree'); el.style.clipPath = ''; });
    $('#p-apercu').innerHTML = ''; $('#scene').innerHTML = '';
    changerPage(S.opts.page === 'arbre' ? 'apercu' : 'apercu');
    if (S.opts.page === 'arbre') setTimeout(() => changerPage('arbre'), 260);
  }
  function fermer() {
    if (!S.ouvert) return;
    S.ouvert = false; cacherCarte();
    $('#app').hidden = true;
    HOTE.style.display = 'none';
    if (S.opts.surFermer) S.opts.surFermer();
  }
  function maj(joueur) { if (joueur) S.joueur = joueur; if (S.ouvert) toutMaj(); }

  if (typeof window !== 'undefined' && window.addEventListener) {
    window.addEventListener('keydown', (e) => {
      if (!S.ouvert) return;
      if (S.opts.jeu) e.stopImmediatePropagation();
      if (e.key === 'Escape' && !$('#cine').hidden) { e.preventDefault(); $('#cine').click(); return; }
      if (e.key === 'Escape' && S.opts.jeu) { e.preventDefault(); fermer(); }
    }, true);
  }

  return { ouvrir, fermer, maj, estOuvert: () => S.ouvert, cineDeblocage, cineNiveau, toast, changerPage, etat: S };
})();

if (typeof module !== 'undefined') module.exports = ArbreSceaux;
