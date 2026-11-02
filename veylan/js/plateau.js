// Un plateau continu dans le monde (docs/ILE-TECHNIQUE.md, section 4) : la marche libre au toucher,
// le chemin découpé par images, les sous-zones qui changent en marchant, les groupes qui errent
// sur leur aire, les réapparitions hors de vue, l'annonce des zones trop hautes, les barrières.
// World (js/world.js) lui confie l'espace quand la carte courante est une carte de plateau ; tout
// le reste (quêtes, combats, gains, relais, sauvegarde) reste à World.
//
// Sans DOM et déterministe : le hasard vient du générateur du monde, les angles de polynômes
// (IleTerrain.M), et le temps du `dt` que le monde reçoit. Le terrain et la navigation viennent du
// registre de l'île (Ile.terrain), construits une fois.
//
// Repère : x = u, y = v (mêmes nombres, flottants) ; world.player, les PNJ, les groupes et les
// nœuds gardent leurs champs x, y, rx, ry, comme sur les cartes à cases.
class Plateau {
  constructor(def, world) {
    this.def = def;
    this.id = def.id;
    this.world = world;
    const c = Ile.terrain(def.id);
    this.terrain = c.terrain;
    this.nav = c.nav;
    this.cartes = [];          // [{ def, zone }] : les sous-zones du plateau
    this.relais = [];          // [{ carte, x, y }]
    this.portes = [];          // [{ carte, x, y, dungeon }]
    this.panneaux = [];        // [{ x, y, texte }]
    this.marque = null;        // la marque de destination { x, y }, posée à l'image du toucher
    this.recherche = null;     // la recherche de chemin en cours, découpée par images
    // Le travail de fond de l'A* par image (3.9), compté en cases explorées et non en millisecondes,
    // pour que le départ du Veilleur ne dépende pas de la vitesse de la machine : 2 000 cases, environ
    // 1 ms sur la machine de test, 3 ms sur le téléphone de référence (trois fois plus lent).
    this.budgetFond = 2000;
    this.annonces = new Map(); // sous-zone -> heure de la dernière annonce zoneProche
    this.horloges = { zone: 0, reapparition: 0, position: 0, trajet: 0 };
    this.cellulesAires = new Map();
    this.centres = this.centresSecteurs();
    const met = (def.lieux || {}).metier;
    const p = met && this.nav.plusProche(met[0], met[1], 6, { statique: true });
    this.compPrincipale = p ? this.nav.composanteA(p[0], p[1]) : 0;
    // Une barrière se rouvre quand sa quête se termine. L'écouteur est rendu par liberer().
    this.surQuete = e => { if (world.plateau === this && e && e.type === 'complete') this.majPassages(); };
    world.on('quest', this.surQuete);
  }

  // Le monde quitte ce plateau : l'écouteur est retiré, la recherche en cours abandonnée. Le
  // terrain et la navigation restent dans le registre de l'île (Ile.terrain).
  liberer() {
    if (this.surQuete) this.world.off('quest', this.surQuete);
    this.surQuete = null;
    this.recherche = null;
  }

  static dist(a, b) { const dx = a.x - b.x, dy = a.y - b.y; return Math.sqrt(dx * dx + dy * dy); }
  static arrondi(x) { return Math.round(x * 100) / 100; }

  // Le centre de chaque sous-zone : la moyenne de ses échantillons de terre ferme.
  centresSecteurs() {
    const T = this.terrain, sommes = new Map();
    for (let v = 0; v < T.H; v++) for (let u = 0; u < T.W; u++) {
      const i = v * T.W + u;
      if (T.vide[i] || T.secteur[i] === 255) continue;
      const id = T.secteurs[T.secteur[i]];
      const s = sommes.get(id) || [0, 0, 0];
      s[0] += u; s[1] += v; s[2]++;
      sommes.set(id, s);
    }
    const out = new Map();
    for (const [id, s] of sommes) out.set(id, [s[0] / s[2], s[1] / s[2]]);
    return out;
  }

  // ----- L'entrée sur le plateau -----

  // Remplit les PNJ, nœuds et groupes du monde avec ceux de toutes les sous-zones (le plateau est
  // un seul espace), relit les minuteries de toutes, pose le Veilleur (4.9). Rend l'identifiant de
  // la sous-zone où il se tient.
  entrer(mapId, arrivee) {
    const w = this.world;
    arrivee = arrivee || {};
    this.nav.vider();
    this.recherche = null;
    this.marque = null;
    this.cartes = [];
    for (const z of (DATA.content && DATA.content.zones) || []) for (const m of z.maps || []) if (m.plateau === this.id) this.cartes.push({ def: m, zone: z });
    const now = Date.now();
    for (const c of this.cartes) {
      const st = w.mapStates[c.def.id] || (w.mapStates[c.def.id] = { dead: {}, used: {} });
      const saved = w.ch.mapTimers && w.ch.mapTimers[c.def.id];
      if (saved) for (const kind of ['dead', 'used']) for (const i in saved[kind] || {}) {
        const left = (saved[kind][i] - now) / 1000;
        if (left > 0) st[kind][i] = Math.max(st[kind][i] || 0, w.time + left);
      }
    }
    w.npcs = []; w.nodes = []; w.groups = [];
    this.relais = []; this.portes = [];
    for (const c of this.cartes) {
      const m = c.def, st = w.mapStates[m.id];
      for (const n of m.npcs || []) w.npcs.push({ id: n.id, def: World.npcDef(n.id) || { id: n.id, name: n.id, dialogue: ['...'] }, x: n.u, y: n.v, rx: n.u, ry: n.v, carte: m.id });
      (m.nodes || []).forEach((n, i) => w.nodes.push({ idx: i, carte: m.id, resource: n.resource, x: n.u, y: n.v, ready: !(st.used[i] > w.time), readyAt: st.used[i] || 0 }));
      (m.groups || []).forEach((tpl, i) => { if (!(st.dead[i] && st.dead[i] > w.time)) w.groups.push(this.creerGroupe(tpl, i, m.id)); });
      if (m.relay) this.relais.push({ carte: m.id, x: m.relay.u, y: m.relay.v });
      if (m.porte) this.portes.push({ carte: m.id, x: m.porte.u, y: m.porte.v, dungeon: m.dungeon || null });
    }
    this.panneaux = this.terrain.objets.filter(o => o.sorte === 'panneau').map(o => ({ x: o.u, y: o.v, texte: o.texte || '' }));
    this.majPassages();
    const p = this.pointArrivee(mapId, arrivee);
    this.placer(p[0], p[1]);
    return this.secteurDe(p[0], p[1]) || mapId;
  }

  // Où poser le Veilleur : { x, y } (ou le plus proche praticable), { lieu }, sinon le relais de
  // la sous-zone, sa porte de donjon, le relais du plateau le plus proche de son centre, le Métier.
  pointArrivee(mapId, a) {
    const T = this.terrain, lieux = this.def.lieux || {};
    // D'abord une case libre des groupes (on n'arrive pas figure sur figure, revue finale), sinon la
    // plus proche praticable sans eux.
    const proche = (x, y, r) => (Number.isFinite(x) && Number.isFinite(y) && T.dans(x, y) ? (this.nav.plusProche(x, y, r, { comp: this.compPrincipale }) || this.nav.plusProche(x, y, r, { statique: true, comp: this.compPrincipale })) : null);
    if (a.x != null && a.y != null) { const p = proche(a.x, a.y, 6); if (p) return this.nav.libre(a.x, a.y) && this.nav.composanteA(a.x, a.y) === this.compPrincipale ? [a.x, a.y] : p; }
    if (a.lieu && lieux[a.lieu]) { const p = proche(lieux[a.lieu][0], lieux[a.lieu][1], 6); if (p) return p; }
    const ici = this.relais.find(r => r.carte === mapId);
    if (ici) { const p = proche(ici.x, ici.y, 4); if (p) return p; }
    const porte = this.portes.find(r => r.carte === mapId);
    if (porte) { const p = proche(porte.x, porte.y, 4); if (p) return p; }
    const c = this.centres.get(mapId);
    if (c && this.relais.length) {
      const r = this.relais.slice().sort((a1, b1) => Plateau.dist({ x: c[0], y: c[1] }, a1) - Plateau.dist({ x: c[0], y: c[1] }, b1))[0];
      const p = proche(r.x, r.y, 4); if (p) return p;
    }
    const m = lieux.metier || [T.largeur / 2, T.hauteur / 2];
    return proche(m[0], m[1], 12) || m;
  }

  // Pose le Veilleur, immobile, à ce point.
  placer(x, y) {
    const w = this.world, p = w.player;
    Object.assign(p, { x, y, rx: x, ry: y, path: [], moving: false, onArrive: null, chemin: null, vitesse: 0, course: false });
    if (p.cap == null) p.cap = 2.356;
    this.recherche = null;
    this.marque = null;
    this.noterPosition(this.secteurDe(x, y) || w.mapId);
  }

  // La position sauvegardée (4.9) : la sous-zone et la position du Veilleur au centième. La seule
  // écriture de ch.pos sur un plateau (World.changerSecteur l'appelle aussi).
  noterPosition(mapId) {
    const w = this.world, p = w.player;
    w.ch.pos = { map: mapId || w.mapId, x: Plateau.arrondi(p.x), y: Plateau.arrondi(p.y) };
  }

  // La sous-zone d'un point (le vide sous un pont garde celle de la région autour).
  secteurDe(x, y) { return this.terrain.secteurA(x, y); }

  // ----- Les groupes -----

  creerGroupe(tpl, idx, carte) {
    const a = tpl.aire || { x: 0, y: 0, errance: 5 };
    const cases = this.casesAire(carte, idx, a);
    const cu = a.x + 7.5, cv = a.y + 7.5;
    let depart = [cu, cv];
    if (cases.length) { let bd = Infinity; for (const c of cases) { const d = (c[0] - cu) * (c[0] - cu) + (c[1] - cv) * (c[1] - cv); if (d < bd) { bd = d; depart = c; } } }
    const g = this.world.makeGroup(tpl, idx, { x: depart[0], y: depart[1] });
    g.carte = carte;
    g.aire = a;
    g.chemin = null;
    g.pause = 4 + this.world.rng() * 4;
    g.nid = `g:${carte}#${idx}`;
    this.nav.poser(g.nid, g.x, g.y, 0.8);
    g.posee = [g.x, g.y];
    return g;
  }

  // Les centres des cases de sol de l'aire, dans le cercle d'errance : d'après le plan cuit de
  // l'aire quand il existe (étape b), sinon d'après la navigation.
  casesAire(carte, idx, a) {
    const cle = `${carte}#${idx}`;
    if (this.cellulesAires.has(cle)) return this.cellulesAires.get(cle);
    const out = [], cu = a.x + 7.5, cv = a.y + 7.5, r = a.errance || 5;
    for (let cy = 0; cy < 15; cy++) for (let cx = 0; cx < 15; cx++) {
      const u = a.x + cx + 0.5, v = a.y + cy + 0.5;
      if ((u - cu) * (u - cu) + (v - cv) * (v - cv) > r * r) continue;
      if (a.layout ? !'.,LM'.includes(a.layout[cy][cx]) : false) continue;
      const k = this.nav.caseDe(u, v);
      if (k < 0 || !this.nav.ouvertStatique(k) || this.nav.comp[k] !== this.compPrincipale) continue;
      out.push([u, v]);
    }
    this.cellulesAires.set(cle, out);
    return out;
  }

  errer(g, dt) {
    const w = this.world, p = w.player;
    if (g.chemin) {
      if (g.hold || w.state === 'combat') return;
      const ch = g.chemin;
      // Il s'arrête plutôt que de marcher sur le Veilleur : sur le centre de la case de sol la plus
      // proche (sa case de combat), s'il en voit une à 2 u au moins du Veilleur, sinon sur place.
      const devant = ch.pts[Math.min(ch.pts.length - 1, ch.k + 2)];
      if (!ch.repli && Plateau.dist(devant, p) < 1.4) {
        g.chemin = null; g.pause = 1 + w.rng() * 2;
        let best = null, bd = 1.6 * 1.6;
        for (const c of this.casesAire(g.carte, g.idx, g.aire)) {
          const d = (c[0] - g.x) * (c[0] - g.x) + (c[1] - g.y) * (c[1] - g.y);
          if (d >= bd || (c[0] - p.x) * (c[0] - p.x) + (c[1] - p.y) * (c[1] - p.y) < 4) continue;
          // La ligne de vue sans son propre disque.
          this.nav.marquerIgnore(g.nid);
          if (this.nav.voitSans([g.x, g.y], c)) { bd = d; best = c; }
        }
        if (best && bd > 1e-6) g.chemin = { pts: [{ x: g.x, y: g.y }, { x: best[0], y: best[1] }], k: 0, but: best, repli: true };
        return;
      }
      let pas = 1.5 * dt;
      while (pas > 0 && ch.k < ch.pts.length - 1) {
        const b = ch.pts[ch.k + 1], dx = b.x - g.x, dy = b.y - g.y, d = Math.sqrt(dx * dx + dy * dy);
        if (d <= pas) { g.x = b.x; g.y = b.y; ch.k++; pas -= d; }
        else { g.x += dx / d * pas; g.y += dy / d * pas; pas = 0; }
        if (d > 1e-6) g.facing = Grid.facing(dx, dy) || g.facing;
      }
      g.rx = g.x; g.ry = g.y;
      if (Plateau.dist({ x: g.posee[0], y: g.posee[1] }, g) >= 0.25) { this.nav.poser(g.nid, g.x, g.y, 0.8); g.posee = [g.x, g.y]; }
      if (ch.k >= ch.pts.length - 1) { g.chemin = null; g.pause = 4 + w.rng() * 4; }
      return;
    }
    // Un groupe dont la fiche est ouverte attend qu'on se décide ; rien ne bouge hors exploration.
    if (g.hold || w.state !== 'explore') return;
    g.pause -= dt;
    if (g.pause > 0) return;
    g.pause = 4 + w.rng() * 4;
    const cases = this.casesAire(g.carte, g.idx, g.aire);
    const autres = w.groups.filter(o => o !== g);
    const choix = cases.filter(c => {
      const dx = c[0] - p.x, dy = c[1] - p.y;
      if (dx * dx + dy * dy < 4) return false;
      if ((c[0] - g.x) * (c[0] - g.x) + (c[1] - g.y) * (c[1] - g.y) < 1) return false;
      return !autres.some(o => (o.x - c[0]) * (o.x - c[0]) + (o.y - c[1]) * (o.y - c[1]) < 9);
    });
    if (!choix.length) return;
    const c = choix[Math.floor(w.rng() * choix.length)];
    const r = this.nav.chemin([g.x, g.y], c, { max: 2000, ignorer: g.nid });
    if (!r || r.partiel || r.points.length < 2) return;
    // Le groupe ne sort jamais de son cercle d'errance, même pour contourner un obstacle.
    const cu = g.aire.x + 7.5, cv = g.aire.y + 7.5, lim = (g.aire.errance || 5) + 0.75;
    if (r.points.some(q => (q.x - cu) * (q.x - cu) + (q.y - cv) * (q.y - cv) > lim * lim)) return;
    g.chemin = { pts: r.points, k: 0, but: c };
  }

  // Les groupes vaincus reviennent au centre de leur aire après leur délai, à 25 u au moins du
  // Veilleur. Le moteur seul en décide (le serveur, 7.5, doit pouvoir le rejouer) : le rendu, qui
  // connaît le champ de la caméra, ne dessine pas un groupe revenu dans le champ tant qu'il n'en est
  // pas sorti (`naissance`, lu par js/ile-3d.js). Le groupe du combat en cours (et de son écran de
  // fin) ne revient pas avant la fin.
  reapparitions() {
    const w = this.world, p = w.player;
    const enCombat = w.showCombat && w.currentGroup;
    for (const c of this.cartes) {
      const m = c.def, st = w.mapStates[m.id] || (w.mapStates[m.id] = { dead: {}, used: {} });
      (m.groups || []).forEach((tpl, i) => {
        if (w.groups.some(g => g.carte === m.id && g.idx === i) || (enCombat && w.currentGroup.carte === m.id && w.currentGroup.idx === i)) return;
        if (st.dead[i] && st.dead[i] > w.time) return;
        const a = tpl.aire || { x: 0, y: 0 };
        const cu = a.x + 7.5, cv = a.y + 7.5;
        if (Plateau.dist({ x: cu, y: cv }, p) < 25) return;
        delete st.dead[i];
        const g = this.creerGroupe(tpl, i, m.id);
        g.naissance = w.time;
        w.groups.push(g);
      });
    }
  }

  // ----- La boucle -----

  update(dt) {
    const w = this.world;
    if (this.recherche) this.poursuivre(false);
    this.marcher(dt);
    for (const g of w.groups) this.errer(g, dt);
    if (w.state === 'combat') return;
    this.verifierSecteur();
    const h = this.horloges;
    h.zone += dt;
    if (h.zone >= 0.5) { h.zone = 0; this.annoncer(); }
    h.reapparition += dt;
    if (h.reapparition >= 1) { h.reapparition = 0; this.reapparitions(); }
  }

  marcher(dt) {
    const w = this.world, p = w.player, ch = p.chemin;
    if (!ch) return;
    // 4,5 u/s au pas, 7 u/s en course ; accélération et freinage sur 0,15 s.
    const vmax = p.course ? 7 : 4.5, acc = vmax / 0.15;
    const reste = ch.longueur - ch.s;
    p.vitesse = Math.min(vmax, p.vitesse + acc * dt, Math.sqrt(2 * acc * Math.max(0, reste)));
    if (p.vitesse < 0.05 && reste > 1e-3) p.vitesse = Math.min(vmax, 0.05 + acc * dt);
    const avant = { x: p.x, y: p.y };
    ch.s = Math.min(ch.longueur, ch.s + p.vitesse * dt);
    const q = this.pointA(ch, ch.s);
    p.x = q.x; p.y = q.y; p.rx = q.x; p.ry = q.y;
    // Comme sur une carte à cases, `path` ne garde que ce qui reste à parcourir.
    if (ch.kPath !== ch.k) { ch.kPath = ch.k; p.path = ch.pts.slice(ch.k + 1); }
    const dx = p.x - avant.x, dy = p.y - avant.y;
    if (dx * dx + dy * dy > 1e-8) {
      p.facing = Grid.facing(dx, dy) || p.facing;
      // Le cap (pour le rendu) tourne de 720° par seconde au plus.
      const vise = IleTerrain.M.atan2(dy, dx);
      let d = vise - (p.cap || 0);
      while (d > Math.PI) d -= 2 * Math.PI;
      while (d < -Math.PI) d += 2 * Math.PI;
      const lim = 4 * Math.PI * dt;
      p.cap = (p.cap || 0) + Math.max(-lim, Math.min(lim, d));
    }
    const h = this.horloges;
    h.position += dt;
    if (h.position >= 1) { h.position = 0; this.noterPosition(); }
    // Un groupe qui marche sur ce qui reste du trajet : on recalcule (un contrôle par quart de seconde).
    h.trajet += dt;
    if (h.trajet >= 0.25) { h.trajet = 0; if (this.trajetCoupe(ch)) { this.planifier([ch.but.x, ch.but.y], p.onArrive, true); return; } }
    if (ch.s >= ch.longueur - 1e-9) this.arriver();
  }

  // Le point d'un trajet à l'abscisse s.
  pointA(ch, s) {
    const c = ch.cum, n = ch.pts.length;
    if (s <= 0) return ch.pts[0];
    if (s >= c[n - 1]) return ch.pts[n - 1];
    while (ch.k < n - 2 && c[ch.k + 1] < s) ch.k++;
    while (ch.k > 0 && c[ch.k] > s) ch.k--;
    const a = ch.pts[ch.k], b = ch.pts[ch.k + 1], L = c[ch.k + 1] - c[ch.k], t = L > 0 ? (s - c[ch.k]) / L : 0;
    return { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t };
  }

  trajetCoupe(ch) {
    const groupes = this.world.groups;
    if (!groupes.length) return false;
    const fin = Math.min(ch.longueur, ch.s + 10);
    for (let s = ch.s + 0.5; s <= fin; s += 0.5) {
      const q = this.pointACopie(ch, s);
      for (const g of groupes) { const dx = g.x - q.x, dy = g.y - q.y; if (dx * dx + dy * dy < 1.15 * 1.15) return true; }
    }
    return false;
  }
  pointACopie(ch, s) { const k = ch.k, q = this.pointA(ch, s); ch.k = k; return q; }

  arriver() {
    const w = this.world, p = w.player;
    p.chemin = null; p.path = []; p.moving = false; p.vitesse = 0;
    this.marque = null;
    this.noterPosition();
    const fn = p.onArrive;
    p.onArrive = null;
    w.emit('arrive', { map: w.mapId, x: p.x, y: p.y });
    if (fn) fn();
  }

  // On ne change de sous-zone qu'une fois entré de 1 u dans la nouvelle.
  verifierSecteur() {
    const w = this.world, p = w.player, T = this.terrain;
    const s = this.secteurDe(p.x, p.y);
    if (!s || s === w.mapId) return;
    const R = [[1, 0], [-1, 0], [0, 1], [0, -1], [0.7071, 0.7071], [-0.7071, 0.7071], [0.7071, -0.7071], [-0.7071, -0.7071]];
    for (const [dx, dy] of R) {
      const x = p.x + dx, y = p.y + dy;
      if (T.videA(x, y) && T.pontA(x, y) < 0) continue;
      if (this.secteurDe(x, y) !== s) return;
    }
    w.changerSecteur(s);
  }

  // À 8 u devant le Veilleur sur son trajet : une sous-zone dont le niveau bas dépasse le sien de
  // deux ou plus est annoncée (une fois par sous-zone et par minute). Une sous-zone sans groupe (le
  // Pont, la Pointe de la Nacelle) ne l'est pas : son niveau ne sert qu'à l'atlas.
  annoncer() {
    const w = this.world, p = w.player, ch = p.chemin;
    if (!ch) return;
    const q = this.pointACopie(ch, Math.min(ch.longueur, ch.s + 8));
    const s = this.secteurDe(q.x, q.y);
    if (!s || s === w.mapId) return;
    const def = World.mapDef(s);
    if (!def || !def.level || !(def.groups || []).length || def.level[0] < w.ch.level + 2) return;
    const avant = this.annonces.get(s);
    if (avant != null && w.time - avant < 60) return;
    this.annonces.set(s, w.time);
    w.emit('zoneProche', { map: s, niveau: def.level, nom: def.name, zone: World.zoneOf(s) && World.zoneOf(s).id });
  }

  // ----- Toucher, marcher, puis agir (4.4) -----

  // Ce qu'on vise près d'un point, faute de cible donnée par le rendu.
  viser(x, y) {
    const w = this.world, cands = [];
    const voir = (type, ref, r) => { const d = Plateau.dist({ x, y }, ref); if (d <= r) cands.push({ type, ref, n: d / r }); };
    for (const n of w.npcs) voir('pnj', n, 1.0);
    for (const g of w.groups) voir('groupe', g, 1.3);
    for (const n of w.nodes) voir('noeud', n, 1.0);
    for (const r of this.relais) voir('relais', r, 1.6);
    for (const r of this.portes) voir('porte', r, 2.0);
    for (const r of this.panneaux) voir('panneau', r, 1.0);
    cands.sort((a, b) => a.n - b.n);
    return cands[0] ? { type: cands[0].type, ref: cands[0].ref } : null;
  }

  // Un toucher : { x, y, cible? }. Rend l'état de l'approche, ou false si le toucher est refusé.
  toucher(t) {
    const w = this.world;
    if (w.state !== 'explore' || !t || !Number.isFinite(t.x) || !Number.isFinite(t.y) || !this.terrain.dans(t.x, t.y)) return false;
    const c = t.cible && t.cible.type ? t.cible : this.viser(t.x, t.y);
    const ref = c && this.reference(c);
    // Un nouveau but remplace l'approche d'un groupe qu'on allait attaquer : il reprend sa marche.
    if (!(c && ref && c.type === 'groupe')) for (const g of w.groups) g.hold = false;
    switch (c && ref && c.type) {
      case 'pnj': return this.approcher(ref, 2, () => w.talk(ref), 3);
      case 'groupe': w.inspectGroup(ref); return 'immediat';
      case 'noeud': return this.approcher(ref, 1.2, () => w.gather(ref), 2.5);
      case 'relais': return this.approcher(ref, 1.5, () => w.useRelay(), 3);
      case 'porte': return this.approcher(ref, 1.5, () => {
        const d = ref.dungeon && World.dungeonDef(ref.dungeon);
        if (d) w.emit('dungeonPrompt', d); else w.toast('Cette porte est fermée pour l\'instant.');
      }, 3);
      case 'panneau': return this.approcher(ref, 1.5, () => w.emit('panneau', { texte: ref.texte, x: ref.x, y: ref.y }), 3);
      default: return this.allerA(t.x, t.y, null);
    }
  }

  // La référence vivante d'une cible (le rendu peut donner un identifiant ou l'objet lui-même).
  reference(c) {
    const w = this.world, r = c.ref;
    const parId = (liste, f) => (liste.includes(r) ? r : liste.find(f) || null);
    switch (c.type) {
      case 'pnj': return parId(w.npcs, n => n.id === r);
      case 'groupe': return parId(w.groups, g => g.nid === r);
      case 'noeud': return parId(w.nodes, n => `${n.carte}#${n.idx}` === r);
      case 'relais': return parId(this.relais, x => x.carte === r);
      case 'porte': return parId(this.portes, x => x.carte === r);
      case 'panneau': return parId(this.panneaux, x => x.texte === r);
      default: return null;
    }
  }

  composanteJoueur() {
    const p = this.world.player, c = this.nav.composanteA(p.x, p.y);
    if (c >= 0) return c;
    const q = this.nav.plusProche(p.x, p.y, 2, { statique: true });
    return q ? this.nav.composanteA(q[0], q[1]) : this.compPrincipale;
  }

  // S'approcher d'une cible : s'arrêter à `distance` d'elle, du côté du Veilleur, puis agir si l'on
  // est à `portee` au plus. Rend 'immediat' | 'en_route' | 'en_calcul' | 'impossible'. `echec`, s'il
  // est donné, est appelé quand l'action n'aura pas lieu : aucun but, aucun chemin (la recherche
  // découpée a fini sans en trouver), ou le Veilleur arrivé trop loin de la cible (le but choisi
  // était à portée, mais la cible a pu bouger) ; World.attackGroup y relâche le groupe visé.
  approcher(cible, distance, action, portee, echec) {
    const w = this.world, p = w.player;
    portee = portee == null ? distance + 1 : portee;
    const agir = () => {
      if (Plateau.dist(p, cible) > portee + 1e-6) { w.toast('Trop loin.'); if (echec) echec(); return; }
      p.facing = Grid.facing(cible.x - p.x, cible.y - p.y) || p.facing;
      if (action) action();
    };
    const d = Plateau.dist(p, cible);
    if (d <= portee && !p.chemin && !this.recherche) { agir(); return 'immediat'; }
    const comp = this.composanteJoueur();
    const ax = d > 1e-6 ? cible.x + (p.x - cible.x) / d * distance : p.x, ay = d > 1e-6 ? cible.y + (p.y - cible.y) / d * distance : p.y;
    let but = this.nav.libre(ax, ay) && this.nav.composanteA(ax, ay) === comp ? [ax, ay] : this.nav.plusProche(ax, ay, 3, { comp });
    if (!but || Plateau.dist({ x: but[0], y: but[1] }, cible) > portee) but = this.nav.plusProche(cible.x, cible.y, portee, { comp });
    if (!but) { if (echec) echec(); return 'impossible'; }
    return this.planifier(but, agir, false, echec);
  }

  // Marcher jusqu'à un point, ou jusqu'au plus proche praticable (le vide, l'eau profonde).
  allerA(x, y, action) {
    if (!Number.isFinite(x) || !Number.isFinite(y)) return 'impossible';
    const comp = this.composanteJoueur();
    let but = this.nav.libre(x, y) && this.nav.composanteA(x, y) === comp ? [x, y] : this.nav.plusProche(x, y, 12, { comp });
    if (!but) but = this.nav.plusProche(x, y, 12);
    if (!but) return 'impossible';
    return this.planifier(but, action || null);
  }

  // Lance la recherche : la marque de destination est posée tout de suite ; le Veilleur part dès
  // que le chemin est trouvé (souvent dans la même image). Un nouveau but remplace l'ancien.
  // `surEchec` est appelé si la recherche ne trouve aucun chemin (tout de suite ou plus tard).
  planifier(but, action, garderVitesse, surEchec) {
    // Surchargé : on ne marche plus, comme Dofus (js/world.js, setPath).
    if (this.world.ch && this.world.ch.surcharge()) { this.world.avertirSurcharge(); if (surEchec) surEchec(); return 'impossible'; }
    const p = this.world.player;
    if (!garderVitesse) { p.chemin = null; p.path = []; p.moving = false; p.vitesse = 0; }
    p.onArrive = null;
    this.marque = { x: but[0], y: but[1] };
    const r = this.nav.chercher([p.x, p.y], but);
    this.recherche = { r, but: { x: but[0], y: but[1] }, action: action || null, garderVitesse: !!garderVitesse, surEchec: surEchec || null };
    return this.poursuivre(true);
  }

  poursuivre(premier) {
    const rq = this.recherche;
    if (!rq) return null;
    const etat = rq.r.avancer(this.budgetFond);
    if (etat === 'en_calcul') return 'en_calcul';
    this.recherche = null;
    const res = rq.r.resultat;
    if (etat !== 'trouve' || !res || !res.points.length) {
      this.marque = null;
      if (!premier) this.world.toast('Impossible d\'y aller.');
      if (rq.surEchec) rq.surEchec();
      return 'impossible';
    }
    this.demarrer(res.points, rq.action, rq.but, rq.garderVitesse);
    return 'en_route';
  }

  demarrer(points, action, but, garderVitesse) {
    const w = this.world, p = w.player;
    const cum = [0];
    for (let k = 1; k < points.length; k++) cum.push(cum[k - 1] + Plateau.dist(points[k - 1], points[k]));
    const longueur = cum[cum.length - 1];
    p.onArrive = action || null;
    if (longueur < 0.02) { p.x = points[points.length - 1].x; p.y = points[points.length - 1].y; p.rx = p.x; p.ry = p.y; this.arriver(); return; }
    p.chemin = { pts: points, cum, longueur, s: 0, k: 0, kPath: 0, but: but || points[points.length - 1] };
    if (!garderVitesse) { p.course = longueur > 6; p.vitesse = 0; }
    p.path = points.slice(1);
    p.moving = true;
    this.marque = { x: p.chemin.but.x, y: p.chemin.but.y };
    w.emit('path', points);
  }

  // Pose le Veilleur sur un point libre (ou le plus proche), immobile. Faux hors du plateau.
  poser(x, y) {
    if (!Number.isFinite(x) || !Number.isFinite(y) || !this.terrain.dans(x, y)) return false;
    const q = this.nav.libre(x, y) ? [x, y] : this.nav.plusProche(x, y, 4);
    if (!q) return false;
    this.placer(q[0], q[1]);
    this.world.emit('update');
    return true;
  }

  // Un chemin sans bouger (le repère « chemin » du guide) : des points, ou null.
  chemin(a, b) {
    const r = this.nav.chemin(a, b);
    return r ? r.points : null;
  }

  relaisProche(rayon) {
    const p = this.world.player;
    let best = null, bd = rayon == null ? 3 : rayon;
    for (const r of this.relais) { const d = Plateau.dist(p, r); if (d <= bd) { bd = d; best = r; } }
    return best ? { map: best.carte, x: best.x, y: best.y } : null;
  }

  // ----- Le combat sur le terrain (docs/ILE-TECHNIQUE.md, 5.1 et 5.3) -----

  // L'arène d'un groupe : la carte de combat de son aire (Grid.create sur le plan cuit, la carte
  // que js/combat.js attend), ancrée sur le terrain par son coin nord-ouest (`map.ancre`, que le
  // combat ignore et que le rendu lit), et les cases de départ : les six cases les plus proches de
  // celle du groupe (sans celle du Veilleur), puis les six plus proches de celle du Veilleur (sans
  // celles des monstres), la règle de World.cellsAround. La case du Veilleur : sa position ramenée
  // dans le carré, puis la case de sol la plus proche. Sans plan (aire non cuite), rien : jamais de
  // combat sur l'arène du laboratoire (Grid.create(undefined) la rendrait sans bruit).
  arene(groupe) {
    const a = groupe && groupe.tpl && groupe.tpl.aire;
    if (!a || !Array.isArray(a.layout) || a.layout.length !== 15 || a.layout.some(l => typeof l !== 'string' || l.length !== 15)) return null;
    const map = Grid.create(a.layout);
    map.ancre = { plateau: this.id, x0: a.x, y0: a.y };
    const p = this.world.player;
    const dans = (u, v) => ({ x: Math.max(0, Math.min(14, Math.floor(u - a.x))), y: Math.max(0, Math.min(14, Math.floor(v - a.y))) });
    const sols = [];
    for (let y = 0; y < 15; y++) for (let x = 0; x < 15; x++) if (Grid.walkable(map, x, y)) sols.push({ x, y });
    if (!sols.length) return null;
    // La case de sol la plus proche d'une case (distance de Manhattan, puis à vol d'oiseau, puis
    // l'ordre de lecture : le même résultat partout).
    const proche = (c, sauf) => {
      let best = null, bd = Infinity;
      for (const s of sols) {
        if (sauf && s.x === sauf.x && s.y === sauf.y) continue;
        const d = Math.abs(s.x - c.x) + Math.abs(s.y - c.y) + Math.hypot(s.x - c.x, s.y - c.y) * 1e-3;
        if (d < bd - 1e-9) { bd = d; best = s; }
      }
      return best;
    };
    const cg = proche(dans(groupe.x, groupe.y));
    const cj = proche(dans(p.x, p.y), cg);
    if (!cg || !cj) return null;
    const monsterCells = this.world.cellsAround(cg, 6, [cj], map);
    const playerCells = this.world.cellsAround(cj, 6, monsterCells, map);
    return {
      map,
      monsterCells: monsterCells.length ? monsterCells : [cg],
      playerCells: playerCells.length ? playerCells : [cj],
    };
  }

  // Un combat commence sur l'aire de `groupe` : les autres groupes dont la position tombe dans
  // l'aire (plus 1 u) sont reposés hors du carré, sur la case de sol de leur cercle d'errance la plus
  // proche ; tout est figé pendant le combat (World.update), ils n'y entrent donc pas. Le Veilleur
  // s'arrête (un chemin, une recherche en cours sont abandonnés).
  ecarterGroupes(groupe) {
    const w = this.world, a = groupe.tpl.aire;
    const dedans = (x, y) => x > a.x - 1 && x < a.x + 16 && y > a.y - 1 && y < a.y + 16;
    for (const g of w.groups) {
      if (g === groupe || !dedans(g.x, g.y)) continue;
      const cases = this.casesAire(g.carte, g.idx, g.aire).filter(c => !dedans(c[0], c[1]));
      let best = null, bd = Infinity;
      for (const c of cases) { const d = (c[0] - g.x) * (c[0] - g.x) + (c[1] - g.y) * (c[1] - g.y); if (d < bd) { bd = d; best = c; } }
      if (!best) continue;
      g.x = best[0]; g.y = best[1]; g.rx = g.x; g.ry = g.y; g.chemin = null;
      this.nav.poser(g.nid, g.x, g.y, 0.8); g.posee = [g.x, g.y];
    }
    const p = w.player;
    Object.assign(p, { path: [], moving: false, onArrive: null, chemin: null, vitesse: 0 });
    this.recherche = null;
    this.marque = null;
  }

  // Après une victoire (World.resume) : le Veilleur au centre de sa case finale (ou au plus proche
  // praticable), tourné comme il l'était, et les groupes reprennent leur marche.
  apresCombat(combat) {
    const w = this.world, e = combat && combat.player, ancre = combat && combat.map && combat.map.ancre;
    if (e && ancre && ancre.plateau === this.id) {
      const u = ancre.x0 + e.x + 0.5, v = ancre.y0 + e.y + 0.5;
      const q = this.nav.libre(u, v) && this.nav.composanteA(u, v) === this.compPrincipale ? [u, v] : (this.nav.plusProche(u, v, 4, { comp: this.compPrincipale }) || this.nav.plusProche(u, v, 6));
      if (q) {
        // Le cap du rendu suit l'orientation du combat (x+ : se, y+ : sw, x- : nw, y- : ne).
        const facing = e.facing || w.player.facing, CAP = { se: 0, sw: Math.PI / 2, nw: Math.PI, ne: -Math.PI / 2 };
        this.placer(q[0], q[1]);
        w.player.facing = facing;
        if (CAP[facing] != null) w.player.cap = CAP[facing];
      }
    }
    for (const g of w.groups) { g.hold = false; if (!g.chemin) g.pause = Math.min(g.pause, 1 + w.rng() * 2); }
  }

  // Les barrières suivent les quêtes : ouvertes quand la quête qui les ouvre est faite.
  majPassages() {
    const done = (this.world.ch.quests && this.world.ch.quests.done) || [];
    for (const b of this.nav.barrieres) this.nav.barriere(b.id, !!(b.quete && done.includes(b.quete)));
  }
}
