
class Projecteur {
  constructor() {
    this.el = document.createElement('div');
    this.el.className = 'vy-projecteur hidden';
    this.el.setAttribute('aria-hidden', 'true');
    this.el.innerHTML = '<div class="vy-projecteur__trou"></div>' + Projecteur.MAIN;
    document.body.appendChild(this.el);
    this.trou = this.el.firstChild;
    this.main = this.el.querySelector('.vy-main');
    this.sel = null;
  }

  static get MAIN() {
    return '<svg class="vy-main" viewBox="0 0 64 64" width="56" height="56"><circle class="vy-main__onde" cx="18" cy="12" r="9"/>' +
      '<path class="vy-main__doigt" d="M16 34V13a4 4 0 0 1 8 0v15l2-1a4 4 0 0 1 5 2l1-1a4 4 0 0 1 5 2l1-.5a4 4 0 0 1 5 3.2V45c0 8-6 14-14 14h-2c-5 0-9-3-11-7l-7-11a4 4 0 0 1 6-5z"/>' +
      '<path class="vy-main__pli" d="M24 28v6M31 29v5M37 31v4"/></svg>';
  }

  montrer(sel, main, opts) {
    opts = opts || {};
    const voile = opts.voile !== false;
    if (this.sel === sel && this.mainOn === !!main && this.voile === voile) return;
    this.sel = sel;
    this.mainOn = !!main;
    this.voile = voile;
    this.el.classList.toggle('sans-voile', !voile);
    this.manque = 0;
    if (!this.raf) this.raf = requestAnimationFrame(() => this.boucle());
  }

  cacher() {
    this.sel = null;
    this.rect = null;
    this.el.classList.add('hidden');
    document.body.classList.remove('vy-voile');
    if (this.raf) cancelAnimationFrame(this.raf);
    this.raf = null;
  }

  static visible(el) {
    if (!el || !el.getClientRects().length) return false;
    const r = el.getBoundingClientRect();
    if (r.width < 2 || r.height < 2 || r.bottom < 0 || r.right < 0 || r.top > innerHeight || r.left > innerWidth) return false;
    const st = getComputedStyle(el);
    if (st.visibility === 'hidden' || Number(st.opacity) <= 0.05) return false;
    const top = document.elementFromPoint(Math.min(innerWidth - 1, Math.max(0, r.left + r.width / 2)), Math.min(innerHeight - 1, Math.max(0, r.top + r.height / 2)));
    return !top || el.contains(top) || top.contains(el) || !!top.closest('.vy-projecteur') || !!top.closest('.vy-guide--tuto');
  }

  cible() { return this.sel ? Projecteur.trouver(this.sel) : null; }

  static trouver(sel) {
    for (const s of [].concat(sel || [])) {
      let list;
      try { list = document.querySelectorAll(s); } catch (e) { continue; }
      for (const el of list) if (Projecteur.visible(el)) return el;
    }
    return null;
  }

  static deplier(sel) {
    const jeu = typeof VEYLAN === 'object' && VEYLAN.hud && VEYLAN.hud.jeu;
    if (!jeu || !jeu.basculerPanneau || jeu.panneauOuvert) return false;
    for (const s of [].concat(sel || [])) {
      let list;
      try { list = jeu.panneau.querySelectorAll(s); } catch (e) { continue; }
      if (list.length) { jeu.basculerPanneau(true); return true; }
    }
    return false;
  }

  boucle() {
    this.raf = null;
    if (!this.sel) return;
    const el = this.cible();
    document.body.classList.toggle('vy-voile', !!el && this.voile);
    if (!el) {
      this.el.classList.add('hidden');
      this.rect = null;
      if (this.deplie !== this.sel) { this.deplie = this.sel; Projecteur.deplier(this.sel); }
    } else {
      const r = el.getBoundingClientRect(), pad = 5;
      this.el.classList.remove('hidden');
      Object.assign(this.trou.style, { left: (r.left - pad) + 'px', top: (r.top - pad) + 'px', width: (r.width + pad * 2) + 'px', height: (r.height + pad * 2) + 'px' });
      const round = getComputedStyle(el).borderRadius;
      this.trou.style.borderRadius = round && round !== '0px' ? `calc(${round} + ${pad}px)` : '8px';
      this.main.style.display = this.mainOn && UI.tactile() ? '' : 'none';
      const cx = r.width > 160 ? r.right - Math.min(56, r.width * 0.2) : r.left + r.width / 2, cy = r.top + r.height / 2;
      this.main.style.setProperty('--sx', cx > innerWidth - 60 ? -1 : 1);
      this.main.style.setProperty('--sy', cy > innerHeight - 22 ? -1 : 1);
      this.main.style.left = (cx - 18) + 'px';
      this.main.style.top = (cy - 12) + 'px';
      this.rect = r;
    }
    this.raf = requestAnimationFrame(() => this.boucle());
  }
}

class Guide {
  constructor(hud) {
    this.hud = hud;
    this.world = hud.world;
    this.combat = hud.combat;
    this.ui = hud.ui;
    this.renderer = hud.renderer;
    this.data = Guide.donnees(this.world.ch);
    this.etapes = (this.data.etapes || []).filter(Boolean);
    if (Guide.actif) Guide.actif.detruire();
    Guide.actif = this;
    const stage = document.getElementById('stage');
    this.boite = new GuideBoite(stage, { cls: 'vy-guide--tuto', onTap: k => (k === 'passer' ? this.passer() : this.recevoir('suite', {})) });
    this.rappel = document.createElement('button');
    this.rappel.type = 'button';
    this.rappel.className = 'vy-rappel hidden';
    this.rappel.addEventListener('click', () => this.recevoir('suite', { rappel: true }));
    stage.appendChild(this.rappel);
    this.geste = document.createElement('div');
    this.geste.className = 'vy-geste hidden';
    this.geste.setAttribute('aria-hidden', 'true');
    this.geste.innerHTML = '<span class="vy-geste__trace"></span>' + Projecteur.MAIN;
    stage.appendChild(this.geste);
    this.projecteur = new Projecteur();
    this.desabos = [];
    for (const evt of Guide.EVENEMENTS) this.desabos.push(Bus.on(evt, d => this.recevoir(evt, d)));
    const DOM = { 'veylan:windowOpen': 'windowOpen', 'veylan:itemEquipped': 'equip', 'veylan:statsAllocated': 'statsAllocated', 'veylan:spellUpgraded': 'spellUpgraded' };
    for (const [name, evt] of Object.entries(DOM)) {
      const fn = e => this.recevoir(evt, (e && e.detail) || {});
      window.addEventListener(name, fn);
      this.desabos.push(() => window.removeEventListener(name, fn));
    }
    const vue = () => this.placerBoite();
    window.addEventListener('veylan:camera', vue);
    this.desabos.push(() => window.removeEventListener('veylan:camera', vue));
    this.world.on('map', d => { if (!this.started) this.demarrer(); else this.descente(d); });
    this.minuterie = setInterval(() => this.tic(), 250);
    this.started = false;
    this.instantane = {};
  }

  static get EVENEMENTS() {
    return ['arrive', 'dialogue', 'dialogueClose', 'map', 'zone', 'groupPopup', 'fight', 'placed', 'battleStart', 'turnStart', 'turnEnd', 'spellSelect', 'spellCast', 'moved', 'hpLoss', 'fightEnd', 'equip', 'statsAllocated', 'spellUpgraded', 'quest', 'questProgress', 'gain', 'levelUp'];
  }

  static donnees(ch) {
    const D = typeof DATA === 'object' ? DATA : {};
    const jeu = (ch && ch.tuto && ch.tuto.jeu) || (ch && ch.origine === 'ervane' ? 'ile' : 'orsane');
    const d = jeu === 'ile' ? D.tutorielIle : jeu === 'descente' ? D.tutorielDescente : D.tutoriel;
    return d || D.tutoriel || { etapes: [] };
  }

  detruire() {
    for (const f of this.desabos) f();
    clearInterval(this.minuterie);
    this.projecteur.cacher();
    this.projecteur.el.remove();
    this.boite.el.remove();
    this.rappel.remove();
    this.geste.remove();
    if (this.renderer) this.renderer.guideCue = null;
    if (Guide.actif === this) Guide.actif = null;
  }

  get ch() { return this.world.ch; }

  static modeDe(ch) {
    const t = ch && ch.tuto;
    if (t && ['guide', 'court', 'off'].includes(t.mode)) return t.done ? 'off' : t.mode;
    return ch && ch.level === 1 && !Object.keys(ch.quests.active).length && !ch.quests.done.length ? 'guide' : 'off';
  }

  get mode() { return Guide.modeDe(this.ch); }

  get index() { return this.ch.tuto ? this.ch.tuto.step : 0; }
  set index(v) { if (this.ch.tuto) this.ch.tuto.step = Math.max(0, Math.min(200, v)); }

  etape() { return this.etapes[this.index] || null; }
  indexDe(id) { return this.etapes.findIndex(e => e.id === id); }

  demarrer() {
    if (this.started) return;
    this.started = true;
    const ch = this.ch;
    if (!ch.tuto && Guide.modeDe(ch) === 'guide') ch.tuto = { mode: 'guide', step: 0, done: false };
    if (this.mode === 'off') { this.toutCacher(); return; }
    const dep = this.data.depart;
    const neuf = !ch.quests.done.length && !Object.keys(ch.quests.active).length && ch.counters.maps.length <= 1;
    if (this.mode === 'guide' && this.index === 0 && dep && this.world.mapId === dep.map && neuf) this.world.placeAt(dep.u != null ? dep.u : dep.x, dep.v != null ? dep.v : dep.y);
    this.descente({ mapId: this.world.mapId, def: this.world.mapDef });
    const st = this.etape();
    if (st && st.bloc === 'combat' && !this.enCombat()) {
      const back = this.indexDe(st.retour);
      if ((ch.counters.wins || 0) < 1 && back >= 0) this.index = back;
    }
    this.entrer();
  }

  descente(d) {
    const ch = this.ch, t = ch.tuto;
    if (ch.origine === 'orsane' && Guide.donnees(ch) !== this.data) {
      this.data = Guide.donnees(ch);
      this.etapes = (this.data.etapes || []).filter(Boolean);
      this.reprise = null;
      if (this.mode === 'off') this.toutCacher(); else this.entrer();
      return true;
    }
    if (!t || t.jeu !== 'ile' || ch.origine !== 'ervane' || typeof DATA !== 'object' || !DATA.tutorielDescente) return false;
    const mapId = d && (d.mapId || d.map);
    if (!mapId || (d.def && d.def.room) || !String(mapId).startsWith('orsane_')) return false;
    const mode = ['guide', 'court', 'off'].includes(t.mode) ? t.mode : 'guide';
    if (this.world.plateau) {
      if (this.world.plateau.id === 'ervane') return false;
      ch.tuto = { mode, step: 0, done: true, jeu: 'descente' };
      this.data = Guide.donnees(ch);
      this.etapes = (this.data.etapes || []).filter(Boolean);
      this.reprise = null;
      this.started = true;
      this.sauver();
      this.toutCacher();
      return true;
    }
    ch.tuto = { mode, step: 0, done: mode === 'off', jeu: 'descente' };
    this.data = Guide.donnees(ch);
    this.etapes = (this.data.etapes || []).filter(Boolean);
    this.reprise = null;
    this.started = true;
    if (mode === 'off') { this.sauver(); this.toutCacher(); return true; }
    this.entrer();
    return true;
  }


  applicable(st) {
    if (!st || st.enabled === false) return false;
    if (this.mode === 'court' && !st.court) return false;
    if (st.bloc === 'combat' && !this.enCombat()) return false;
    if (st.si && !this.cond(st.si)) return false;
    if (st.saute && this.cond(st.saute)) return false;
    return true;
  }

  entrer() {
    this.attente = false;
    this.dejaVu = false;
    this.siLu = false;
    for (let guard = 0; guard <= this.etapes.length; guard++) {
      const st = this.etape();
      if (this.reprise != null && (!st || st.bloc !== 'niveau')) { this.index = this.reprise; this.reprise = null; continue; }
      if (!st) return this.terminer();
      if (this.applicable(st)) break;
      this.index = this.index + 1;
    }
    this.instantane = { points: this.ch.statPoints };
    this.analyse = null;
    this.trace = null;
    if (this.rappelT) { clearTimeout(this.rappelT); this.rappelT = null; }
    this.sauver();
    this.afficher();
  }

  avancer() {
    this.index = this.index + 1;
    this.entrer();
  }

  terminer() {
    if (this.ch.tuto) { this.ch.tuto.done = true; this.ch.tuto.step = Math.min(200, this.etapes.length); }
    this.finCombatTuto();
    this.sauver();
    this.toutCacher();
  }

  passer() {
    if (!this.ch.tuto) this.ch.tuto = { mode: 'guide', step: 0, done: false };
    this.started = true;
    this.reprise = null;
    this.terminer();
  }

  revoir() {
    this.ch.tuto = { mode: 'guide', step: 0, done: false };
    this.started = true;
    this.reprise = null;
    this.entrer();
  }

  choisirMode(mode) {
    if (!['guide', 'court', 'off'].includes(mode)) return;
    const t = this.ch.tuto || { step: 0, done: false };
    this.ch.tuto = { mode, step: t.step || 0, done: mode === 'off' ? true : (t.done && t.mode === mode) };
    this.started = true;
    this.reprise = null;
    if (mode === 'off') { this.sauver(); this.toutCacher(); return; }
    this.entrer();
  }

  sauver() {
    if (typeof Save === 'object' && this.ch.tuto) Save.write(this.ch);
  }


  recevoir(evt, d) {
    d = d || {};
    if (evt === 'fightEnd') this.finCombatTuto();
    if (!this.started || this.mode === 'off') return;
    if (evt === 'levelUp' && this.mode === 'guide' && this.ch.level - (d.levels || 1) === 1 && this.premierNiveau()) return;
    const st = this.etape();
    if (!st) return;
    if (evt === 'fight' && st.allie) {
      if (this.mode === 'guide') this.debutCombatTuto();
      const first = this.etapes.findIndex(e => e.bloc === 'combat');
      if (first > this.index) { this.index = first; this.entrer(); return; }
    }
    if (evt === 'fightEnd' && st.bloc === 'combat') {
      if (d.victory) {
        let i = this.index;
        while (this.etapes[i] && this.etapes[i].bloc === 'combat') i++;
        this.index = i;
      } else {
        const back = this.indexDe(st.retour);
        if (back >= 0) this.index = back;
      }
      this.entrer();
      return;
    }
    if (evt === 'suite' && d.rappel && this.mode === 'court') { this.avancer(); return; }
    if (st.attendre && st.attendre.on && this.attente && this.correspond(st.attendre, evt, d)) { this.attente = false; this.dejaVu = true; this.afficher(); return; }
    const fait = !this.attente && this.realise(st.until, evt, d);
    if (fait) { this.suivre(fait); return; }
    this.tic();
  }

  realise(u, evt, d) {
    for (const x of [].concat(u || [])) {
      if (!x) continue;
      if (x.cond ? evt == null && this.cond(x.cond) : evt != null && this.correspond(x, evt, d)) return x;
    }
    return null;
  }

  suivre(x) {
    const i = x && x.vers ? this.indexDe(x.vers) : -1;
    if (i < 0) { this.avancer(); return; }
    this.index = i;
    this.entrer();
  }

  premierNiveau() {
    const bloc = this.etapes.map((e, i) => (e.bloc === 'niveau' && e.enabled !== false ? i : -1)).filter(i => i >= 0);
    if (!bloc.length) return false;
    if (this.ch.autoStats) { this.ch.resetStats(); this.ch.autoStats = false; this.world.emit('update'); }
    if (this.ch.autoSpells) { this.ch.resetSpells(); this.ch.autoSpells = false; this.world.emit('update'); }
    if (this.index <= bloc[bloc.length - 1] || this.reprise != null) return false;
    this.reprise = this.index;
    this.index = bloc[0];
    this.entrer();
    return true;
  }

  debutCombatTuto() {
    if (this.tutoCombat || !this.enCombatPlacement()) return;
    this.tutoCombat = { turnSeconds: this.combat.turnSeconds };
    if (this.data.allie) this.world.addAlly(this.data.allie);
    if (this.data.secondesTour) this.combat.turnSeconds = Math.max(this.combat.turnSeconds, this.data.secondesTour);
    if (this.ui && this.ui.armerPlacement) this.ui.armerPlacement(0);
  }

  finCombatTuto() {
    if (!this.tutoCombat) return;
    this.combat.turnSeconds = this.tutoCombat.turnSeconds;
    this.tutoCombat = null;
  }

  correspond(u, evt, d) {
    if (Array.isArray(u)) return u.some(x => this.correspond(x, evt, d));
    if (!u || u.cond || u.on !== evt) return false;
    for (const k of Object.keys(u)) {
      if (['on', 'proche', 'x', 'y', 'vers', 'u', 'v', 'rayon', 'monstre'].includes(k)) continue;
      if (this.champ(d, k) !== u[k]) return false;
    }
    if (u.x != null && !(Math.abs((d.x | 0) - u.x) + Math.abs((d.y | 0) - u.y) <= (u.proche || 0))) return false;
    if (u.u != null && !(Math.hypot((d.x || 0) - u.u, (d.y || 0) - u.v) <= (u.rayon || 1))) return false;
    if (u.monstre && !(d.group && Array.isArray(d.group.monsters) && d.group.monsters.some(m => m.id === u.monstre))) return false;
    return true;
  }

  champ(d, k) {
    if (k === 'map') return d.map || d.mapId || (d.def && d.def.id) || null;
    if (k === 'npc') return d.npc && typeof d.npc === 'object' ? d.npc.id : d.npc;
    return d[k];
  }

  tic() {
    if (!this.started) return;
    if (this.mode === 'off') { this.toutCacher(); return; }
    const st = this.etape();
    if (!st) return;
    if (st.saute && this.cond(st.saute)) { this.avancer(); return; }
    if (st.bloc === 'combat' && !this.enCombat() && !this.world.showCombat) { this.entrer(); return; }
    if (st.attendre && !st.attendre.on && this.attente && this.cond(st.attendre)) { this.attente = false; this.afficher(); return; }
    const fait = !this.attente && this.realise(st.until);
    if (fait) { this.suivre(fait); return; }
    this.afficher(true);
    this.degagerInfo();
  }

  degagerInfo() {
    const app = document.getElementById('app'), info = document.getElementById('carte-info');
    const cue = this.renderer && this.renderer.guideCue, o = cue && (cue.group || cue.entity || cue.cell || cue.point);
    let sous = false;
    if (o && info && info.offsetParent && !this.world.showCombat) {
      const q = UI.cellClient(this.renderer, o.rx != null ? o.rx : o.x, o.ry != null ? o.ry : o.y), r = info.getBoundingClientRect();
      sous = q.x > r.left - 24 && q.x < r.right + 24 && q.y > r.top && q.y < r.bottom + 70;
    }
    if (app) app.classList.toggle('vy-info-sous-repere', sous);
  }


  cond(c) {
    if (!c) return true;
    for (const k of Object.keys(c)) if (!this.test(k, c[k])) return false;
    return true;
  }

  test(k, v) {
    const ch = this.ch, w = this.world, cb = this.combat;
    const equipables = weapon => Object.keys(ch.inventory).some(id => { const d = Items.get(id); return d && (weapon ? d.kind === 'weapon' : d.kind === 'equip' || d.kind === 'weapon') && ch.canEquip(id).ok; });
    switch (k) {
      case 'non': return !this.cond(v);
      case 'quete': return !!ch.quests.active[v] || ch.quests.done.includes(v);
      case 'queteEtape': return ch.quests.done.includes(v[0]) || !!(ch.quests.active[v[0]] && ch.quests.active[v[0]].step >= v[1]);
      case 'queteFinie': return ch.quests.done.includes(v);
      case 'carte': return w.mapId === v;
      case 'niveau': return ch.level >= v;
      case 'victoires': return (ch.counters.wins || 0) >= v;
      case 'equipable': return equipables(false) === !!v;
      case 'armeEquipable': return equipables(true) === !!v;
      case 'arme': return !!ch.equipment.arme === !!v;
      case 'points': return (ch.statPoints > 0) === !!v;
      case 'pointsSort': return (ch.spellPoints > 0) === !!v;
      case 'auto': return !!ch.autoStats === !!v;
      case 'sortChoisi': return !!(this.ui && this.ui.selectedSpell) === !!v;
      case 'pointsPlaces': return (this.instantane.points != null && ch.statPoints < this.instantane.points) === !!v;
      case 'explore': return (w.state === 'explore' && !w.showCombat) === !!v;
      case 'tourJoueur': return this.tourJoueur() === !!v;
      case 'peutFrapper': return !!(this.tourJoueur() && this.sortFrappe()) === !!v;
      case 'pmRestants': return !!(this.enCombat() && cb.phase === 'battle' && cb.player && cb.player.pm > 0 && cb.aliveMonsters().length) === !!v;
      case 'sortElement': return typeof v === 'string' ? this.elementsDeClasse().includes(v) : !!this.analyseElement(this.ficheGroupe()) === !!v;
      default: return false;
    }
  }

  elementsDeClasse() {
    const out = [];
    const ch = this.ch, ids = ch && ch.unlockedSpells ? ch.unlockedSpells() : [];
    for (const id of ids) {
      const s = DATA.spells[id];
      if (s && s.element && s.element !== 'neutre' && (s.effects || []).some(e => e.type === 'damage') && !out.includes(s.element)) out.push(s.element);
    }
    return out;
  }

  ficheGroupe() {
    const f = this.hud && this.hud.jeu && this.hud.jeu.fiche;
    return f && f.d && !f.el.classList.contains('hidden') ? f.d.group : null;
  }

  analyseElement(group) {
    const M = DATA.monsters || {};
    const glyms = Object.keys(M).filter(id => /^glym_/.test(id) && M[id].region === 'ervane' && !M[id].boss).map(id => M[id]);
    const dans = group && Array.isArray(group.monsters) ? group.monsters.map(m => M[m.id]).filter(Boolean) : [];
    for (const e of this.elementsDeClasse()) {
      const craint = d => !!(d.resist && d.resist[e] < 0), resiste = d => !!(d.resist && d.resist[e] > 0);
      const faible = dans.find(craint) || glyms.find(craint);
      if (!faible) continue;
      return { element: e, faible, resiste: dans.find(resiste) || glyms.find(resiste) || null, dansFiche: dans.includes(faible) };
    }
    return null;
  }

  enCombat() { return !!(this.world.showCombat && this.world.state === 'combat'); }
  enCombatPlacement() { return this.enCombat() && this.combat.phase === 'placement'; }
  tourJoueur() { const cb = this.combat; return this.enCombat() && cb.phase === 'battle' && cb.actor === cb.player && !cb.busy; }

  sortFrappe() {
    const cb = this.combat, p = cb.player;
    if (!p) return null;
    const foes = cb.aliveMonsters().filter(e => cb.canSee(p, e));
    for (const id of UI.ordreSorts(p)) {
      const s = cb.spellOf(id, p);
      if (!s || !s.effects.some(ef => ef.type === 'damage') || !cb.spellState(p, id).ok) continue;
      if (foes.some(f => cb.canCastAt(p, id, f.pos).ok)) return id;
    }
    return null;
  }

  sortDegats() {
    const cb = this.combat, p = cb.player;
    if (!p) return null;
    return this.sortFrappe() || UI.ordreSorts(p).find(id => { const s = cb.spellOf(id, p); return s && s.effects.some(ef => ef.type === 'damage'); }) || p.spells[0];
  }


  peutParler() {
    const panel = document.getElementById('panel');
    const title = document.getElementById('title');
    const tourne = document.querySelector('.vy-tourne:not(.hidden)');
    return this.world.state !== 'dialogue' && (!panel || panel.classList.contains('hidden')) && (!title || title.classList.contains('hidden')) && !tourne;
  }

  texte(st) {
    const tactile = UI.tactile();
    let t = st.say;
    if (!tactile && st.saySouris) t = st.saySouris;
    else if (tactile && st.sayConfirme && UI.confirmerSorts(true)) t = st.sayConfirme;
    if (st.sayAilleurs) { const a = this.analyse = this.analyseElement(this.ficheGroupe()); if (a && !a.dansFiche) t = st.sayAilleurs; }
    return this.remplir(t);
  }

  remplir(t) {
    if (typeof t !== 'string' || t.indexOf('{{') < 0) return t;
    const a = this.analyse || (this.analyse = this.analyseElement(this.ficheGroupe()));
    const el = (a && DATA.elements && DATA.elements[a.element]) || {};
    return t.replace(/\{\{(\w+)\}\}/g, (m, k) => (k === 'element' ? (el.label || '') : k === 'faible' ? (a && a.faible ? a.faible.name : '') : k === 'resiste' ? (a && a.resiste ? a.resiste.name : '') : m));
  }

  afficher(tic) {
    const st = this.etape();
    if (!st || this.mode === 'off') { this.toutCacher(); return; }
    if (st.attendre && !this.dejaVu) {
      const ok = st.attendre.on ? false : this.cond(st.attendre);
      if (!ok) { this.attente = true; this.siLu = false; this.toutCacher(); return; }
      this.attente = false;
    }
    if (st.puisSi && !this.siLu) {
      this.siLu = true;
      if (!this.cond(st.puisSi)) { this.avancer(); return; }
    }
    if (!this.peutParler()) {
      this.boite.cacher();
      this.rappel.classList.add('hidden');
      this.montrerGeste(null);
      if (this.renderer) this.renderer.guideCue = null;
      const sel = this.world.state === 'dialogue' && this.mode === 'guide' ? st.cueDialogue : null;
      if (sel) this.projecteur.montrer(sel, true, { voile: false }); else this.projecteur.cacher();
      this.marquer(false);
      return;
    }
    if (!tic && st.deselect && this.ui.selectedSpell) this.ui.selectSpell(null);
    const npcId = st.npc || this.data.guide;
    const def = World.npcDef(npcId) || { id: npcId, name: npcId };
    const suite = [].concat(st.until || []).some(u => u && u.on === 'suite');
    if (this.mode === 'court') {
      this.boite.cacher();
      const court = !UI.tactile() && st.courtSouris ? st.courtSouris : st.court;
      const html = Parole.html(this.remplir(court));
      if (this.rappel.dataset.id !== st.id) { this.rappel.dataset.id = st.id; this.rappel.innerHTML = `<span class="vy-rappel__point" aria-hidden="true"></span><span>${html}</span>`; this.rappel.setAttribute('aria-label', Parole.brut(court)); }
      this.rappel.classList.remove('hidden');
      if (suite && !this.rappelT) this.rappelT = setTimeout(() => { this.rappelT = null; if (this.etape() === st) this.avancer(); }, 7000);
    } else {
      this.rappel.classList.add('hidden');
      const humeur = st.humeur || 'neutre';
      this.boite.montrer({ npc: def, texte: this.texte(st), suite, humeur, painter: this.renderer.painter || this.renderer, passer: true });
    }
    this.reperer(st);
    this.placerBoite();
    this.marquer(this.boite.visible);
  }

  marquer(on) { document.body.classList.toggle('vy-guide-visible', !!on); }

  toutCacher() {
    this.boite.cacher();
    const app = document.getElementById('app');
    if (app) app.classList.remove('vy-info-sous-repere');
    this.rappel.classList.add('hidden');
    this.projecteur.cacher();
    this.montrerGeste(null);
    if (this.renderer) this.renderer.guideCue = null;
    if (this.rappelT) { clearTimeout(this.rappelT); this.rappelT = null; }
    this.marquer(false);
  }

  reperer(st) {
    const R = this.renderer, w = this.world, cb = this.combat;
    let ground = null, sel = null, main = false, geste = null;
    const onMap = m => !m || m === w.mapId;
    let fiche = null;
    const resolve = c => {
      if (!c || ground || sel) return;
      switch (c.type) {
        case 'case': if (onMap(c.map) && !w.showCombat) ground = { cell: { x: c.x, y: c.y } }; break;
        case 'point': if (onMap(c.map) && !w.showCombat && w.plateau) ground = { point: { x: c.u, y: c.v } }; break;
        case 'lieu': { const p = !w.showCombat && this.pointDe({ lieu: c.lieu }); if (p) ground = { point: p }; break; }
        case 'chemin': { const p = !w.showCombat && w.plateau && this.pointDe(c.vers); if (p) ground = { point: p, chemin: this.traceVers(p) }; break; }
        case 'groupeFaible': {
          if (w.showCombat) break;
          const a = this.analyse = this.analyseElement(this.ficheGroupe());
          if (!a) break;
          fiche = a;
          const p = w.player, craint = g2 => g2.monsters.some(m => DATA.monsters[m.id] && DATA.monsters[m.id].resist && DATA.monsters[m.id].resist[a.element] < 0);
          const g = w.groups.filter(craint).sort((g1, g2) => Grid.dist(g1, p) - Grid.dist(g2, p))[0];
          if (g) ground = { group: g };
          break;
        }
        case 'pnj': { const n = !w.showCombat && w.npcs.find(x => x.id === c.npc); if (n) ground = { cell: { x: n.x, y: n.y } }; break; }
        case 'groupe': {
          if (w.showCombat || !w.groups.length) break;
          const p = w.player, poids = g2 => g2.monsters.length * 100 + g2.monsters.reduce((s, m) => s + m.level, 0);
          ground = { group: w.groups.slice().sort((a, b) => poids(a) - poids(b) || Grid.dist(a, p) - Grid.dist(b, p))[0] };
          break;
        }
        case 'sortie': if (onMap(c.map) && !w.showCombat && w.mapDef && w.mapDef.exits && w.mapDef.exits[c.side]) { ground = { edge: c.side }; geste = c.side; } break;
        case 'placement': {
          if (!this.enCombatPlacement()) break;
          const foes = cb.aliveMonsters();
          const free = ((cb.placementCells && cb.placementCells.player) || []).filter(c2 => !cb.entityAt(c2.x, c2.y) || cb.entityAt(c2.x, c2.y) === cb.player);
          const near = c2 => Math.min(...foes.map(f => Grid.dist(c2, f.pos)));
          const best = free.sort((a, b) => near(a) - near(b))[0];
          if (best && !(best.x === cb.player.x && best.y === cb.player.y)) ground = { cell: best };
          break;
        }
        case 'ennemi': {
          if (!this.enCombat()) break;
          const p = cb.player;
          const foes = cb.aliveMonsters().filter(e => cb.canSee(p, e));
          foes.sort(c.plusBlesse ? (a, b) => a.hp - b.hp : (a, b) => Grid.dist(a.pos, p.pos) - Grid.dist(b.pos, p.pos));
          if (foes[0]) ground = { entity: foes[0] };
          break;
        }
        case 'sort': {
          if (!this.tourJoueur()) break;
          const id = c.quel === 'degats' ? this.sortDegats() : c.quel;
          if (id) { sel = `[data-spell="${id}"]`; main = true; }
          break;
        }
        case 'objet': {
          const ids = Object.keys(this.ch.inventory).filter(id => { const d = Items.get(id); return d && (c.quel === 'arme' ? d.kind === 'weapon' : d.kind === 'equip' || d.kind === 'weapon') && this.ch.canEquip(id).ok; });
          if (ids.length) { sel = ids.map(id => `.vy-fenetre[data-id="sac"] [data-id="${id}"]`); main = true; }
          break;
        }
        case 'ui': if (Projecteur.trouver(c.cible) || Projecteur.deplier(c.cible)) { sel = c.cible; main = !!c.main; } break;
      }
    };
    for (const c of [].concat(st.cue || [])) {
      resolve(c);
      if (c && c.type === 'ui' && c.sinon && !sel && !ground) resolve(c.sinon);
    }
    if (R) R.guideCue = ground;
    this.marquerFiche(fiche);
    if (sel && this.mode === 'guide') this.projecteur.montrer(sel, main);
    else if (sel && this.mode === 'court') this.projecteur.montrer(sel, false, { voile: false });
    else this.projecteur.cacher();
    this.montrerGeste(geste && UI.tactile() && this.mode === 'guide' ? geste : null);
  }

  pointDe(vers) {
    const w = this.world;
    if (!vers || !w.plateau) return null;
    if (vers.npc) { const n = w.npcs.find(x => x.id === vers.npc); return n ? { x: n.x, y: n.y } : null; }
    if (vers.lieu) { const def = typeof Ile === 'object' && Ile.plateau(w.plateau.id), p = def && def.lieux && def.lieux[vers.lieu]; return p ? { x: p[0], y: p[1] } : null; }
    return vers.u != null ? { x: vers.u, y: vers.v } : null;
  }

  traceVers(but) {
    const w = this.world, p = w.player, t = this.trace;
    if (t && t.but.x === but.x && t.but.y === but.y && Math.hypot(p.x - t.de.x, p.y - t.de.y) < 4) return t.pts;
    const pts = [];
    const chemin = w.plateau.chemin({ x: p.x, y: p.y }, but);
    if (chemin && chemin.length > 1) {
      let s = 0, prochain = 2;
      for (let i = 1; i < chemin.length && pts.length < 48; i++) {
        const a = chemin[i - 1], b = chemin[i], l = Math.hypot(b.x - a.x, b.y - a.y);
        while (s + l >= prochain && pts.length < 48) { const k = (prochain - s) / Math.max(1e-6, l); pts.push({ x: a.x + (b.x - a.x) * k, y: a.y + (b.y - a.y) * k }); prochain += 2; }
        s += l;
      }
    }
    this.trace = { but: { x: but.x, y: but.y }, de: { x: p.x, y: p.y }, pts };
    return pts;
  }

  marquerFiche(a) {
    const f = typeof document === 'object' ? document.querySelector('.vy-fiche-groupe:not(.hidden)') : null;
    if (!f) return;
    for (const li of f.querySelectorAll('[data-monstre]')) {
      li.classList.toggle('vy-faible', !!(a && a.faible && li.dataset.monstre === a.faible.id));
      li.classList.toggle('vy-resiste', !!(a && a.resiste && li.dataset.monstre === a.resiste.id));
    }
  }

  montrerGeste(side) {
    if (!side) { this.geste.classList.add('hidden'); this.geste.dataset.side = ''; return; }
    if (this.geste.dataset.side === side) return;
    this.geste.dataset.side = side;
    const D = { n: [Grid.TILE_W / 2, -Grid.TILE_H / 2], e: [Grid.TILE_W / 2, Grid.TILE_H / 2], s: [-Grid.TILE_W / 2, Grid.TILE_H / 2], w: [-Grid.TILE_W / 2, -Grid.TILE_H / 2] }[side];
    const n = Math.hypot(D[0], D[1]);
    this.geste.style.setProperty('--gx', (-D[0] / n * 120).toFixed(1) + 'px');
    this.geste.style.setProperty('--gy', (-D[1] / n * 120).toFixed(1) + 'px');
    this.geste.style.setProperty('--ga', (Math.atan2(-D[1], -D[0]) * 180 / Math.PI).toFixed(1) + 'deg');
    this.geste.classList.remove('hidden');
  }

  placerBoite() {
    if (!this.boite.visible) return;
    const stage = document.getElementById('stage').getBoundingClientRect();
    let r = this.projecteur.sel && this.projecteur.rect ? this.projecteur.rect : null;
    const cue = this.renderer && this.renderer.guideCue;
    if (!r && cue) {
      let pt = null;
      if (cue.edge) {
        const A = Renderer.arrowGeometry(this.renderer.map, this.renderer.origin, cue.edge, 0);
        if (A) pt = UI.boardClient(this.renderer, A.mid.x, A.mid.y);
      } else {
        const o = cue.group || cue.entity || cue.cell || cue.point;
        if (o) pt = UI.cellClient(this.renderer, o.rx != null ? o.rx : o.x, o.ry != null ? o.ry : o.y);
      }
      if (pt) r = { left: pt.x - 40, right: pt.x + 40, top: pt.y - 50, bottom: pt.y + 20 };
    }
    if (!r) { this.boite.cote('gauche'); return; }
    const cur = this.boite.el.dataset.cote || 'gauche';
    const box = this.boite.el.getBoundingClientRect();
    const haut = box.top - Math.max(0, this.boite.q('.vy-guide__portrait').offsetHeight - 22);
    const couvert = c => parseFloat(getComputedStyle(document.body).getPropertyValue(c)) || 0;
    const cd = couvert('--vy-couvert-droite'), cg = couvert('--vy-couvert-gauche');
    const zone = side => {
      const w = this.boite.el.offsetWidth;
      return side === 'gauche' ? { left: stage.left + cg, right: stage.left + cg + w + 12, top: haut, bottom: box.bottom } : { left: stage.right - cd - w - 12, right: stage.right - cd, top: haut, bottom: box.bottom };
    };
    const hit = z => r.left < z.right && r.right > z.left && r.top < z.bottom && r.bottom > z.top;
    if (hit(zone(cur))) { const other = cur === 'gauche' ? 'droite' : 'gauche'; if (!hit(zone(other))) this.boite.cote(other); }
    else if (cur === 'droite' && !hit(zone('gauche'))) this.boite.cote('gauche');
  }
}
