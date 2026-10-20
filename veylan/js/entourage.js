// Les alentours d'une carte : ce qui s'étend autour du plateau jouable jusqu'aux bords de la vue,
// comme sur une carte de Dofus Touch où le décor court jusqu'au bord de l'écran. Peints une fois
// par carte dans les calques fixes du rendu Canvas (js/render.js), que le rendu WebGL
// (js/render-gl.js) reprend en textures :
//  - le sol de la zone qui continue (herbe, ardoise, pavés, sol de donjon), varié par plaques et
//    par grandes taches d'ombre et de lumière ;
//  - les chemins qui partent de chaque sortie et filent jusqu'au bord, pour voir où elle mène ;
//  - un décor qu'on ne traverse pas : bas et clairsemé près du plateau, plus dense et plus haut en
//    s'éloignant, jamais sur une case jouable ni devant la place d'une figure ;
//  - sous terre (galeries, vapeurs, fonderie, salles de donjon) : des parois de roche, puis
//    l'obscurité ; les galeries partent en tunnels étayés ;
//  - au bord d'un vide de la carte : une terrasse (un mur de soutènement bas, la ville en contrebas,
//    un escalier sous la sortie) ou, quand le vide n'est que derrière, une vallée voilée de brume ;
//  - l'air : brume et pénombre qui montent avec la distance au plateau, plus sombres au bord du
//    peint.
// Tout se place en coordonnées de case (u, v), continues et prolongées hors de la carte ; le monde
// s'en déduit par Renderer.vx. Le hasard est tiré de la graine de la carte et de la position :
// les mêmes alentours sortent pour n'importe quelle zone à couvrir (le calque proche et les bandes
// du lointain se raccordent, et une vue agrandie ne change rien à ce qui était déjà peint).
class Entourage {
  // `zone` : le rectangle du monde à couvrir (les deux calques).
  constructor(r, P, R, zone) {
    this.r = r;
    this.P = P;
    this.R = R;
    this.map = r.map;
    this.seed = (r.seed ^ 0x3a7e1) >>> 0;
    this.genre = Entourage.genreOf(r, P);
    this.dessous = this.genre === 'souterrain' ? Entourage.dessousOf(r) : null;
    this.style = Entourage.STYLES[this.genre];
    this.baseMat = this.genre === 'souterrain' ? r.baseMat : this.style.sol;
    // Le vide d'une carte (render.js, analyse) : une terrasse au-dessus d'un contrebas proche, ou une
    // vallée loin dessous.
    this.chute = r.chute || null;
    this.dz = this.chute === 'terrasse' ? Entourage.MARCHE : 0;
    this.zone = zone;
    // Les cases à considérer : la zone, plus une marge pour les grands sprites posés au-dessous de
    // son bord (ils dépassent vers le haut).
    const cs = [[zone.x, zone.y], [zone.x + zone.w, zone.y], [zone.x, zone.y + zone.h], [zone.x + zone.w, zone.y + zone.h]].map(([x, y]) => this.uv(x, y));
    const us = cs.map(p => p.u), vs = cs.map(p => p.v);
    this.cellRange = {
      x0: Math.floor(Math.min(...us)) - 3, x1: Math.ceil(Math.max(...us)) + 7,
      y0: Math.floor(Math.min(...vs)) - 3, y1: Math.ceil(Math.max(...vs)) + 7,
    };
    const sous = this.genre === 'souterrain';
    const sky = P.sky || {};
    this.farColor = sous ? '#040406' : Renderer.mix(P.ink, P.fog || '#6f86c0', 0.38);
    this.hazeColor = sous ? '#020203' : Renderer.mix(sky.haze || P.fog, P.ink, 0.42);
    this.ressources();
    this.champ();
    this.chemins();
    this.faces();
    this.placer();
    this.air();
  }

  // La hauteur du mur d'une terrasse, en unités du monde.
  static get MARCHE() { return 36; }
  // Le pas de la grille tremblée sur laquelle se pose le décor, en cases.
  static get PAS() { return 0.8; }

  // Le genre d'alentours : forêt, rocaille, ville d'Orsane, ville de Kaldum, ou sous terre.
  static genreOf(r, P) {
    const w = r.world, zone = (w && w.zone && w.zone.id) || '';
    if (r.site === 'donjon' || /_(galeries|vapeurs|fonderie)$/.test(zone)) return 'souterrain';
    if (r.site === 'ville') return P.ground === 'ardoise' ? 'forge' : 'ville';
    if (P.ground === 'ardoise') return 'roc';
    // En pleine nature : une forêt si le plateau est bordé d'arbres, une rocaille s'il l'est de roche.
    const m = r.map;
    let arbres = 0, roches = 0;
    for (let y = 0; y < m.h; y++) for (let x = 0; x < m.w; x++) {
      if (x && y && x < m.w - 1 && y < m.h - 1) continue;
      if (m.cells[y][x] === Grid.TREE) arbres++;
      else if (m.cells[y][x] === Grid.ROCK) roches++;
    }
    return roches > arbres ? 'roc' : 'foret';
  }

  // Ce qui vit dans l'obscurité d'un dessous : la lave des forges (la Fonderie, la Forge Morte, la
  // Cuve), le lichen des galeries et de la vieille mine, la vapeur (les Vapeurs, les Boues Chaudes),
  // sinon les cristaux (les donjons d'Orsane).
  static dessousOf(r) {
    const w = r.world, z = (w && w.zone && w.zone.id) || '', d = (w && w.mapDef && w.mapDef.dungeonId) || '';
    if (/forge|cuve/.test(d) || (!d && /_fonderie$/.test(z))) return 'lave';
    if (/mine/.test(d) || (!d && /_galeries$/.test(z))) return 'lichen';
    if (/boues/.test(d) || (!d && /_vapeurs$/.test(z))) return 'vapeur';
    return 'cristal';
  }

  // Les réglages de chaque genre : sol, plaques, chemin (matière, demi-largeur en cases, méandre).
  static get STYLES() {
    return {
      foret: { sol: 'herbe', plaques: ['terre'], chemin: 'terre', large: 0.62, meandre: 1.3 },
      roc: { sol: 'herbe', plaques: ['gravier', 'terre'], chemin: 'terre', large: 0.62, meandre: 1.0 },
      ville: { sol: 'herbe', plaques: [], chemin: 'pave', large: 1.05, meandre: 0.25 },
      forge: { sol: 'ardoise', plaques: ['gravier'], chemin: 'pave', large: 1.05, meandre: 0.25 },
      souterrain: { sol: 'sol', plaques: ['gravier'], chemin: null, large: 0.85, meandre: 0.55 },
    };
  }

  // ----- Géométrie -----

  // Un point du monde en coordonnées de case (l'inverse de Renderer.vx).
  uv(x, y) {
    const o = this.r.origin, a = (x - o.x) / (Grid.TILE_W / 2), b = (y - o.y + Grid.TILE_H / 2) / (Grid.TILE_H / 2);
    return { u: (a + b) / 2, v: (b - a) / 2 };
  }

  w(u, v) { return this.r.vx(u, v); }

  idx(x, y) {
    const g = this.cellRange;
    if (x < g.x0 || y < g.y0 || x > g.x1 || y > g.y1) return -1;
    return (y - g.y0) * (g.x1 - g.x0 + 1) + (x - g.x0);
  }

  board(x, y) { return Grid.inBounds(this.map, x, y) && !this.r.voidMap[y][x]; }
  low(u, v) { return !!this.chute && this.r.isVoid(Math.floor(u), Math.floor(v)); }

  // Un tirage au sort propre à une position de la grille et à un usage (`sel`).
  rndAt(i, j, sel) {
    return Renderer.prng((this.seed ^ Math.imul(i + 7919, 73856093) ^ Math.imul(j + 104729, 19349663) ^ Math.imul(sel + 31, 83492791)) >>> 0);
  }

  // La distance au plateau (en cases, entre centres de cases).
  champ() {
    const g = this.cellRange, GW = g.x1 - g.x0 + 1, GH = g.y1 - g.y0 + 1, N = GW * GH;
    const D = new Float32Array(N).fill(1e6);
    const m = this.map;
    for (let y = Math.max(0, g.y0); y <= Math.min(m.h - 1, g.y1); y++) for (let x = Math.max(0, g.x0); x <= Math.min(m.w - 1, g.x1); x++) if (this.board(x, y)) D[this.idx(x, y)] = 0;
    const S2 = Math.SQRT2;
    for (let j = 0; j < GH; j++) for (let i = 0; i < GW; i++) {
      const k = j * GW + i;
      let d = D[k];
      if (i > 0) d = Math.min(d, D[k - 1] + 1);
      if (j > 0) { d = Math.min(d, D[k - GW] + 1); if (i > 0) d = Math.min(d, D[k - GW - 1] + S2); if (i < GW - 1) d = Math.min(d, D[k - GW + 1] + S2); }
      D[k] = d;
    }
    for (let j = GH - 1; j >= 0; j--) for (let i = GW - 1; i >= 0; i--) {
      const k = j * GW + i;
      let d = D[k];
      if (i < GW - 1) d = Math.min(d, D[k + 1] + 1);
      if (j < GH - 1) { d = Math.min(d, D[k + GW] + 1); if (i < GW - 1) d = Math.min(d, D[k + GW + 1] + S2); if (i > 0) d = Math.min(d, D[k + GW - 1] + S2); }
      D[k] = d;
    }
    this.GW = GW; this.GH = GH;
    this.D = D;
    this.PD = new Float32Array(N).fill(1e6);
  }

  // Valeur d'un champ entre les centres de cases (bilinéaire).
  sample(F, u, v) {
    const g = this.cellRange;
    let fx = u - 0.5 - g.x0, fy = v - 0.5 - g.y0;
    fx = Math.max(0, Math.min(this.GW - 1.001, fx)); fy = Math.max(0, Math.min(this.GH - 1.001, fy));
    const i = Math.floor(fx), j = Math.floor(fy), tx = fx - i, ty = fy - j, k = j * this.GW + i;
    const a = F[k], b = F[k + 1], c = F[k + this.GW], d = F[k + this.GW + 1];
    return (a * (1 - tx) + b * tx) * (1 - ty) + (c * (1 - tx) + d * tx) * ty;
  }

  dist(u, v) { return this.sample(this.D, u, v); }
  pathDist(u, v) { return this.paths.length ? this.sample(this.PD, u, v) : 1e6; }

  // ----- Chemins : de chaque sortie ouverte jusqu'au bord du peint -----

  // Chaque chemin part du milieu de ses cases de sortie et file droit devant, en serpentant un peu.
  // Ses points (u, v) sont pris sur son sol ; `z` le descend d'autant à l'écran (le contrebas d'une
  // terrasse, où l'on arrive par un escalier). Leur longueur ne dépend pas de la zone peinte.
  chemins() {
    const r = this.r, m = this.map, w = r.world, st = this.style;
    this.paths = [];
    this.reserves = [];
    const sides = w && w.openSides ? w.openSides() : [];
    const DIR = { n: [0, -1], s: [0, 1], e: [1, 0], w: [-1, 0] };
    for (const side of sides) {
      const cells = (m.exits && m.exits[side]) || [];
      if (!cells.length) continue;
      let cx = 0, cy = 0;
      for (const c of cells) { cx += c.x + 0.5; cy += c.y + 0.5; }
      cx /= cells.length; cy /= cells.length;
      const [dx, dy] = DIR[side], px = -dy, py = dx;
      const mid = cells.reduce((a, c) => (Math.hypot(c.x + 0.5 - cx, c.y + 0.5 - cy) < Math.hypot(a.x + 0.5 - cx, a.y + 0.5 - cy) ? c : a), cells[0]);
      const dehors = r.isVoid(mid.x + dx, mid.y + dy);
      // Une sortie au bord d'une vallée n'a pas de suite peinte ; celle d'une terrasse descend.
      if (dehors && this.chute !== 'terrasse') continue;
      const rnd = Renderer.prng(this.seed ^ Renderer.hashStr('chemin:' + side));
      const amp = st.meandre * (0.7 + rnd() * 0.6), ph = rnd() * 6.28, ph2 = rnd() * 6.28;
      let escalier = null, t0 = 0, z = 0;
      if (dehors) {
        escalier = { x: mid.x, y: mid.y, dx, dy, L: 1.6, n: 4 };
        z = this.dz;
        t0 = 0.5 + escalier.L;
        // Le chemin d'en bas part du pied de l'escalier.
        cx = mid.x + 0.5; cy = mid.y + 0.5;
      }
      const pts = [];
      for (let t = t0; t < 140; t += 0.5) {
        const tt = t - t0;
        const ramp = Math.min(1, Math.max(0, (tt - 1.2) / 3.5));
        const off = amp * ramp * ramp * (0.7 * Math.sin(tt * 0.38 + ph) + 0.3 * Math.sin(tt * 0.83 + ph2));
        const u = cx + dx * t + px * off, v = cy + dy * t + py * off;
        pts.push({ u, v, t });
        // Assez loin : au-delà de tout ce qu'une vue peut montrer.
        if (Math.hypot(u - m.w / 2, v - m.h / 2) > 110) break;
      }
      const hw = st.large;
      const P = { side, pts, hw, z, s: z / 32, dir: [dx, dy], perp: [px, py], escalier };
      this.paths.push(P);
      if (escalier) {
        // La place de l'escalier : rien ne s'y pose.
        const e = escalier, a = this.w(e.x - 0.1 * Math.abs(px), e.y - 0.1 * Math.abs(py)), b = this.w(e.x + 1.1 + dx * (e.L + 1), e.y + 1.1 + dy * (e.L + 1));
        this.reserves.push({ x0: Math.min(a.x, b.x) - 30, x1: Math.max(a.x, b.x) + 30, y0: Math.min(a.y, b.y) - 20, y1: Math.max(a.y, b.y) + z + 20 });
      }
    }
    // Dans une forge, des rigoles de lave partent du pied des parois et s'enfoncent dans le noir.
    if (this.dessous === 'lave' && this.P.lava) {
      const rnd = Renderer.prng(this.seed ^ 0x1a7e);
      const n = 2 + Math.floor(rnd() * 2), a0 = rnd() * Math.PI * 2;
      for (let i = 0; i < n; i++) {
        const a = a0 + i * Math.PI * 2 / n + (rnd() - 0.5) * 0.9, dx = Math.cos(a), dy = Math.sin(a), px = -dy, py = dx;
        // le départ, juste hors du carré du plateau (en coordonnées de case), dans cette direction
        const t0 = (Math.max(m.w, m.h) / 2 + 1.6) / Math.max(Math.abs(dx), Math.abs(dy));
        const cx = m.w / 2 + dx * t0, cy = m.h / 2 + dy * t0, ph = rnd() * 6.28;
        const pts = [];
        for (let t = 0; t < 30; t += 0.5) pts.push({ u: cx + dx * t + px * Math.sin(t * 0.45 + ph) * 0.9, v: cy + dy * t + py * Math.sin(t * 0.45 + ph) * 0.9, t });
        this.paths.push({ side: 'lave' + i, pts, hw: 0.3, z: 0, s: 0, dir: [dx, dy], perp: [px, py], escalier: null, lave: true });
      }
    }
    // Distance de chaque centre de case au chemin le plus proche, là où il passe à l'écran.
    const PD = this.PD, g = this.cellRange;
    for (const P of this.paths) {
      for (let i = 1; i < P.pts.length; i++) {
        const a = P.pts[i - 1], b = P.pts[i];
        const au = a.u + P.s, av = a.v + P.s, bu = b.u + P.s, bv = b.v + P.s;
        const ex = bu - au, ey = bv - av, L2 = ex * ex + ey * ey || 1;
        const x0 = Math.floor(Math.min(au, bu)) - 4, x1 = Math.ceil(Math.max(au, bu)) + 4;
        const y0 = Math.floor(Math.min(av, bv)) - 4, y1 = Math.ceil(Math.max(av, bv)) + 4;
        if (x1 < g.x0 || y1 < g.y0 || x0 > g.x1 || y0 > g.y1) continue;
        for (let y = Math.max(g.y0, y0); y <= Math.min(g.y1, y1); y++) for (let x = Math.max(g.x0, x0); x <= Math.min(g.x1, x1); x++) {
          const qx = x + 0.5 - au, qy = y + 0.5 - av, t = Math.max(0, Math.min(1, (qx * ex + qy * ey) / L2));
          const d = Math.hypot(qx - ex * t, qy - ey * t), k = this.idx(x, y);
          if (k >= 0 && d < PD[k]) PD[k] = d;
        }
      }
    }
  }

  // Le ruban d'un chemin, en coordonnées du monde ; ses bords ondulent un peu.
  ribbon(P, extra) {
    const L = [], Rr = [];
    const n = P.pts.length;
    const at = (u, v) => { const p = this.w(u, v); return { x: p.x, y: p.y + P.z }; };
    for (let i = 0; i < n; i++) {
      const a = P.pts[Math.max(0, i - 1)], b = P.pts[Math.min(n - 1, i + 1)];
      let tx = b.u - a.u, ty = b.v - a.v;
      const l = Math.hypot(tx, ty) || 1; tx /= l; ty /= l;
      const q = P.pts[i];
      const j1 = (Renderer.noise(i * 7 + 3, 11) - 0.5) * 0.16, j2 = (Renderer.noise(i * 7 + 5, 29) - 0.5) * 0.16;
      // Le ruban commence un peu dans le plateau : il passe sous la case de sortie.
      const back = i === 0 && !P.escalier && !P.lave ? -0.8 : 0;
      L.push(at(q.u + tx * back - ty * (P.hw + extra + j1), q.v + ty * back + tx * (P.hw + extra + j1)));
      Rr.push(at(q.u + tx * back + ty * (P.hw + extra + j2), q.v + ty * back - tx * (P.hw + extra + j2)));
    }
    const path = new Path2D();
    path.moveTo(L[0].x, L[0].y);
    for (let i = 1; i < n; i++) path.lineTo(L[i].x, L[i].y);
    for (let i = n - 1; i >= 0; i--) path.lineTo(Rr[i].x, Rr[i].y);
    path.closePath();
    const edges = new Path2D();
    edges.moveTo(L[0].x, L[0].y); for (let i = 1; i < n; i++) edges.lineTo(L[i].x, L[i].y);
    edges.moveTo(Rr[0].x, Rr[0].y); for (let i = 1; i < n; i++) edges.lineTo(Rr[i].x, Rr[i].y);
    let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
    for (const p of L.concat(Rr)) { x0 = Math.min(x0, p.x); x1 = Math.max(x1, p.x); y0 = Math.min(y0, p.y); y1 = Math.max(y1, p.y); }
    return { path, edges, box: { x0, y0, x1, y1 } };
  }

  // ----- Le bord d'un vide -----

  // Les faces qui tombent dans le vide : sous chaque bord de terre ferme qui donne sur le vide vers
  // l'avant (+x, +y), la seule pente qu'on voie. Et les bords arrière, où le contrebas commence.
  faces() {
    this.murs = [];
    this.arrieres = [];
    if (!this.chute) return;
    const g = this.cellRange, r = this.r;
    for (let y = g.y0; y <= g.y1; y++) for (let x = g.x0; x <= g.x1; x++) {
      if (r.isVoid(x, y)) continue;
      if (r.isVoid(x + 1, y)) this.murs.push(this.face('x', x, y));
      if (r.isVoid(x, y + 1)) this.murs.push(this.face('y', x, y));
      if (r.isVoid(x - 1, y)) this.arrieres.push({ side: 'x', x, y, a: this.w(x, y), b: this.w(x, y + 1) });
      if (r.isVoid(x, y - 1)) this.arrieres.push({ side: 'y', x, y, a: this.w(x, y), b: this.w(x + 1, y) });
    }
    this.murs.sort((a, b) => (a.f.x + a.f.y) - (b.f.x + b.f.y));
    // Le plateau en dessine la lèvre (filet de lumière, herbe qui déborde) : render.js, paintDetails.
    r.faceList = this.murs.filter(F => Grid.inBounds(this.map, F.f.x, F.f.y) || Math.abs(F.f.x - this.map.w / 2) + Math.abs(F.f.y - this.map.h / 2) < 24);
  }

  face(side, x, y) {
    const a = side === 'x' ? [x + 1, y] : [x, y + 1], b = [x + 1, y + 1];
    const top = [];
    for (let k = 0; k <= 6; k++) { const t = k / 6; top.push(this.w(a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t)); }
    const box = { x0: Math.min(top[0].x, top[6].x), x1: Math.max(top[0].x, top[6].x), y0: Math.min(top[0].y, top[6].y), y1: Math.max(top[0].y, top[6].y) + 80 };
    return { f: { side, x, y }, top, box };
  }

  // ----- Le décor : placé une fois, peint dans chaque calque -----

  // Un élément peut-il se poser là sans couvrir une case du plateau, ni passer devant la place d'une
  // figure debout derrière lui ? (b : sa boîte à l'écran, en coordonnées du monde)
  free(b, depth) {
    const r = this.r, m = this.map, F = this.cadre;
    for (const q of this.reserves) if (b.x1 > q.x0 && b.x0 < q.x1 && b.y1 > q.y0 && b.y0 < q.y1) return false;
    // Loin du plateau (hors de sa boîte, place des figures comprise), rien à craindre.
    if (b.x1 < F.x0 || b.x0 > F.x1 || b.y1 < F.y0 || b.y0 > F.y1) return true;
    const cs = [this.uv(b.x0, b.y0), this.uv(b.x1, b.y0), this.uv(b.x0, b.y1), this.uv(b.x1, b.y1)];
    const x0 = Math.max(0, Math.floor(Math.min(cs[0].u, cs[1].u, cs[2].u, cs[3].u)) - 1), x1 = Math.min(m.w - 1, Math.ceil(Math.max(cs[0].u, cs[1].u, cs[2].u, cs[3].u)) + 1);
    const y0 = Math.max(0, Math.floor(Math.min(cs[0].v, cs[1].v, cs[2].v, cs[3].v)) - 1), y1 = Math.min(m.h - 1, Math.ceil(Math.max(cs[0].v, cs[1].v, cs[2].v, cs[3].v)) + 1);
    for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) {
      if (!this.board(x, y)) continue;
      const p = r.cellToScreen(x, y);
      const qx = Math.max(b.x0, Math.min(b.x1, p.x)), qy = Math.max(b.y0, Math.min(b.y1, p.y));
      if (Math.abs(qx - p.x) / 32 + Math.abs(qy - p.y) / 16 < 1.02) return false;
      // La place d'une figure au-dessus d'une case où l'on se tient, derrière l'élément.
      if (m.cells[y][x] === Grid.FLOOR && x + y + 1 < depth && b.x1 > p.x - 22 && b.x0 < p.x + 22 && b.y1 > p.y - 70 && b.y0 < p.y) return false;
    }
    return true;
  }

  // La boîte d'un sprite posé en (x, y) à l'échelle k : sa part visible, à peu près.
  static boxOf(spr, x, y, k, wide) {
    const hw = spr.w * (wide || 0.38) * k;
    return { x0: x - hw, x1: x + hw, y0: y - spr.ay * k * 0.94, y1: y + 4 * k };
  }

  // Ajoute un élément s'il trouve sa place. Retourne vrai s'il est posé.
  add(it) {
    const p = this.w(it.u, it.v);
    it.x = p.x; it.y = p.y;
    it.depth = it.u + it.v;
    if (!it.box) it.box = it.spr ? Entourage.boxOf(it.spr, p.x, p.y, it.k || 1, it.wide) : { x0: p.x - 9, x1: p.x + 9, y0: p.y - 12, y1: p.y + 3 };
    if (!this.free(it.box, it.depth)) return false;
    this.items.push(it);
    return true;
  }

  // Les ressources propres aux alentours (grands arbres, maisons, touffes), faites une fois par
  // palette et gardées avec ses sprites (render.js, resources).
  ressources() {
    const R = this.R, P = this.P, r = this.r;
    if (R.alentours) return R.alentours;
    const rnd = Renderer.prng(Renderer.hashStr('alentours:' + P.id));
    const A = R.alentours = {};
    A.bigTrees = [];
    for (let i = 0; i < 6; i++) A.bigTrees.push(r.treeSprite(P, rnd, 1.32 + (i % 3) * 0.08, i));
    // Les maisons : le faîte dans un sens, puis dans l'autre ; une tour à Orsane.
    A.houses = { u: [], v: [] };
    for (let i = 0; i < 4; i++) A.houses.u.push(this.houseSprite(rnd, i, false));
    for (let i = 0; i < 4; i++) A.houses.v.push(this.houseSprite(rnd, i + 4, true));
    if (P.ground !== 'ardoise') A.tower = this.houseSprite(rnd, 9, false, true);
    // Des arbres de plus, d'un feuillage un peu différent (plus sombre, plus chaud, plus bleu) : la
    // forêt n'est pas d'une seule couleur.
    A.foret = R.trees.slice();
    if (P.tree === 'feuillu') {
      for (const [col, t] of [['#0a1812', 0.3], ['#6e7c2c', 0.2], ['#2a5868', 0.22]]) {
        const PL = Object.assign({}, P, { leaves: P.leaves.map(c => Renderer.mix(c, col, t)) });
        A.foret.push(r.treeSprite(PL, rnd, 1, 1 + (A.foret.length % 3)));
        A.foret.push(r.treeSprite(PL, rnd, 1.05, 4));
      }
    }
    A.touffes = [0, 1, 2, 3, 4, 5].map(i => this.smallSprite('touffe', Renderer.prng(Renderer.hashStr('touffe' + i + P.id))));
    A.fleurs = [0, 1, 2, 3].map(i => this.smallSprite('fleurs', Renderer.prng(Renderer.hashStr('fleur' + i + P.id))));
    A.cailloux = [0, 1, 2, 3].map(i => this.smallSprite('cailloux', Renderer.prng(Renderer.hashStr('caillou' + i + P.id))));
    // Le sous-bois : des fougères, des troncs couchés ; sous terre, des stalagmites.
    A.fougeres = [0, 1, 2].map(i => this.smallSprite('fougere', Renderer.prng(Renderer.hashStr('fougere' + i + P.id))));
    A.troncs = [false, true].map(rot => this.logSprite(Renderer.prng(Renderer.hashStr('tronc' + rot + P.id)), rot));
    A.stalagmites = [0, 1, 2].map(i => this.stalagmiteSprite(Renderer.prng(Renderer.hashStr('stalagmite' + i + P.id)), i));
    return A;
  }

  // Les éléments du décor : tirés sur une grille tremblée, chacun d'après sa position.
  placer() {
    this.items = [];
    const g = this.cellRange, genre = this.genre, m = this.map;
    // La boîte du plateau à l'écran, place des figures comprise : au-delà, rien ne peut le couvrir.
    const t = this.w(0, 0), rr = this.w(m.w, 0), bb = this.w(m.w, m.h), ll = this.w(0, m.h);
    this.cadre = { x0: ll.x - 4, x1: rr.x + 4, y0: t.y - 80, y1: bb.y + 4 };
    const sm = (x, a, b) => { const k = Math.max(0, Math.min(1, (x - a) / (b - a))); return k * k * (3 - 2 * k); };
    // Les cases prises par une maison : rien d'autre n'y pousse.
    this.pris = new Uint8Array(this.GW * this.GH);
    if (genre === 'ville' || genre === 'forge') { this.reverberes(); this.maisons(); }
    if (genre === 'souterrain') this.etais();
    // Les grands éléments, sur une grille de PAS cases.
    const S = Entourage.PAS, hw = this.paths.length ? this.style.large : 0;
    for (let j = Math.floor(g.y0 / S); j <= Math.ceil(g.y1 / S); j++) for (let i = Math.floor(g.x0 / S); i <= Math.ceil(g.x1 / S); i++) {
      const rnd = this.rndAt(i, j, 1);
      const u = (i + 0.5 + (rnd() - 0.5) * 0.9) * S, v = (j + 0.5 + (rnd() - 0.5) * 0.9) * S;
      const r1 = rnd(), r2 = rnd(), r3 = rnd();
      const cx = Math.floor(u), cy = Math.floor(v);
      if (this.board(cx, cy)) continue;
      const k = this.idx(cx, cy);
      if (k < 0 || this.pris[k]) continue;
      if (this.low(u, v) && this.chute !== 'terrasse') continue;
      const d = this.dist(u, v), pd = this.pathDist(u, v);
      if (pd < hw + 0.45) continue;
      const n = Renderer.vnoise(u * 0.11 + 50, v * 0.11 + 50, 3, this.seed & 0xffff);
      const f = sm(d, 2.2, 7);
      if (genre === 'foret' || genre === 'roc') this.naturel(u, v, d, pd, n, f, r1, r2, r3);
      else if (genre === 'ville' || genre === 'forge') this.urbain(u, v, d, pd, n, f, r1, r2, r3);
      else this.souterrain(u, v, d, pd, n, f, r1, r2, r3);
    }
    // Les touffes, fleurs et cailloux, plus serrés, près du plateau et le long des chemins.
    if (genre !== 'souterrain') {
      const A = this.R.alentours, s2 = 0.45;
      for (let j = Math.floor(g.y0 / s2); j <= Math.ceil(g.y1 / s2); j++) for (let i = Math.floor(g.x0 / s2); i <= Math.ceil(g.x1 / s2); i++) {
        const rnd = this.rndAt(i, j, 2);
        const u = (i + 0.5 + (rnd() - 0.5) * 0.9) * s2, v = (j + 0.5 + (rnd() - 0.5) * 0.9) * s2, r1 = rnd(), r2 = rnd(), r3 = rnd();
        if (this.board(Math.floor(u), Math.floor(v))) continue;
        if (this.low(u, v) && this.chute !== 'terrasse') continue;
        const d = this.dist(u, v);
        if (d > 4.6) continue;
        const pd = this.pathDist(u, v);
        if (pd < hw - 0.1) { if (r1 < 0.05) this.add({ u, v, d, kind: 'petit', spr: A.cailloux[Math.floor(r2 * 4)], k: 0.8 + r3 * 0.4 }); continue; }
        const near = pd < hw + 0.5;
        const p = near ? 0.55 : (d < 1.3 ? 0.42 : 0.2 + 0.1 * (1 - d / 4.6));
        if (r1 > p) continue;
        let list = A.touffes;
        if (genre === 'forge') list = r2 < 0.6 ? A.cailloux : A.touffes;
        else if (r2 < 0.18 && !near && !this.P.lava) list = A.fleurs;
        else if (r2 < 0.27) list = A.cailloux;
        else if (genre === 'foret' && r2 < 0.45 && d > 1.2 && !near) list = A.fougeres;
        this.add({ u, v, d, kind: 'petit', spr: list[Math.floor(r3 * list.length)], k: 0.85 + r3 * 0.35 });
      }
    }
    this.items.sort((a, b) => a.depth - b.depth || a.u - b.u);
  }

  // Un sprite rogné à ce qu'il peint : ses marges transparentes ne coûtent plus rien à la peinture
  // (une forêt dense se recouvre beaucoup). Gardé pour la session : les sprites d'une palette vivent
  // avec elle.
  static rogne(spr) {
    const cache = Entourage._rognes || (Entourage._rognes = new WeakMap());
    let t = cache.get(spr);
    if (t) return t;
    const cv = spr.cv, W = cv.width, H = cv.height, k = W / spr.w;
    let data = null;
    try { data = cv.getContext('2d').getImageData(0, 0, W, H).data; } catch (e) { /* toile illisible : telle quelle */ }
    if (!data) { cache.set(spr, spr); return spr; }
    let x0 = W, y0 = H, x1 = -1, y1 = -1;
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      if (data[(y * W + x) * 4 + 3] <= 3) continue;
      if (x < x0) x0 = x;
      if (x > x1) x1 = x;
      if (y < y0) y0 = y;
      if (y > y1) y1 = y;
    }
    if (x1 < 0) { cache.set(spr, spr); return spr; }
    x0 = Math.max(0, x0 - 1); y0 = Math.max(0, y0 - 1); x1 = Math.min(W - 1, x1 + 1); y1 = Math.min(H - 1, y1 + 1);
    const w = x1 - x0 + 1, h = y1 - y0 + 1, nc = Renderer.canvas(w, h);
    nc.getContext('2d').drawImage(cv, x0, y0, w, h, 0, 0, w, h);
    t = { cv: nc, w: w / k, h: h / k, ax: spr.ax - x0 / k, ay: spr.ay - y0 / k, foot: spr.foot };
    cache.set(spr, t);
    return t;
  }

  // Forêt et rocaille : des touffes près du plateau, des buissons puis des arbres, plus hauts et plus
  // serrés en s'éloignant ; des clairières par endroits ; la rocaille a ses blocs et ses conifères.
  naturel(u, v, d, pd, n, f, r1, r2, r3) {
    const R = this.R, roc = this.genre === 'roc';
    // Le pays se partage en massifs et en clairières (un bruit lent), à toute distance : loin du
    // plateau, la forêt n'est pas un tapis de cimes d'un bord à l'autre.
    const pre = Renderer.vnoise(u * 0.05 + 211, v * 0.05 + 97, 2, (this.seed >>> 7) & 0xffff);
    const clairiere = n < 0.36 || pre < 0.36, lisiere = !clairiere && (n < 0.43 || pre < 0.43);
    const bush = (k) => this.add({ u, v, d, kind: 'buisson', spr: R.bushes[Math.floor(r2 * R.bushes.length)], k });
    const rock = (k) => this.add({ u, v, d, kind: 'rocher', spr: R.rocks[Math.floor(r2 * R.rocks.length)], k });
    if (d < 1.15) {
      if (r1 < (roc ? 0.16 : 0.08)) rock(0.42 + r3 * 0.2);
      else if (r1 < (roc ? 0.24 : 0.28)) bush(0.6 + r3 * 0.18);
      return;
    }
    if (d < 2.3) {
      if (r1 < 0.2) bush(0.8 + r3 * 0.2);
      else if (r1 < (roc ? 0.34 : 0.28)) rock((roc ? 0.75 : 0.55) + r3 * 0.35);
      else if (r1 < 0.46) this.arbre(u, v, d, 0.92 + r3 * 0.12, r2, roc);
      return;
    }
    // Plus loin : la forêt (ou la rocaille) se referme, d'arbres plus grands et un peu moins serrés
    // (la canopée reste fermée, et chaque point n'est pas repeint dix fois).
    const pTree = clairiere ? 0.07 : lisiere ? 0.3 : (roc ? 0.3 + 0.3 * f : 0.5 + 0.16 * f);
    const pRock = roc ? 0.22 : clairiere ? 0.04 : 0.025;
    // Dans une clairière loin du plateau : des fleurs et des touffes dans l'herbe.
    if (clairiere && d > 4.6 && r1 > 0.72) {
      const A = R.alentours, list = r3 < 0.35 && !this.P.lava ? A.fleurs : A.touffes;
      this.add({ u, v, d, kind: 'petit', spr: list[Math.floor(r2 * list.length)], k: 1 + r3 * 0.3 });
      return;
    }
    if (r1 < pTree) { if (!this.arbre(u, v, d, 1 + 0.55 * f + r3 * 0.18, r2, roc)) bush(0.9); }
    else if (r1 < pTree + pRock) {
      const glow = r3 < this.P.crystals;
      if (roc && r3 < 0.4 && d > 3) this.add({ u, v, d, kind: 'mur', spr: R.ramparts[Math.floor(r2 * R.ramparts.length)], k: 0.9 + r3 * 0.6 });
      // Un rocher : gros dans la rocaille, plus modeste sous les arbres.
      else this.add({ u, v, d, kind: 'rocher', spr: (glow ? R.crystalRocks : R.rocks)[Math.floor(r2 * 2)], k: roc ? 0.8 + f * 0.9 + r3 * 0.3 : 0.6 + f * 0.35 + r3 * 0.25, glow });
    } else if (r1 < pTree + pRock + (clairiere ? 0.18 : 0.14)) bush(0.85 + r3 * 0.3);
    // Un tronc couché, au bord d'une clairière.
    else if (!roc && r1 > 0.968 && d < 9) this.add({ u, v, d, kind: 'tronc', spr: this.R.alentours.troncs[r3 < 0.5 ? 0 : 1], k: 0.85 + r2 * 0.3, wide: 0.5 });
  }

  // Un arbre : grand ou ordinaire, conifère en rocaille ; s'il ne tient pas, un plus petit.
  arbre(u, v, d, k, r2, roc) {
    const R = this.R, A = R.alentours, P = this.P;
    const big = k > 1.18 && r2 > 0.3;
    let list = big ? A.bigTrees : A.foret;
    // En rocaille, des conifères seulement.
    if (roc && P.tree === 'feuillu') list = big ? list.slice(4) : list.filter((s, i) => i === 4 || i === 5 || (i >= 6 && i % 2 === 1));
    const spr = list[Math.floor(((r2 * 7.13) % 1) * list.length)];
    const kk = big ? k / 1.36 : k;
    if (this.add({ u, v, d, kind: 'arbre', spr, k: kk, wide: 0.4 })) return true;
    if (k > 1.05) return this.add({ u, v, d, kind: 'arbre', spr: R.trees[Math.floor(r2 * R.trees.length)], k: 0.9, wide: 0.4 });
    return false;
  }

  // Ville : des jardins, des arbres et des haies entre les maisons ; des colonnes à Kaldum.
  urbain(u, v, d, pd, n, f, r1, r2, r3) {
    const R = this.R, forge = this.genre === 'forge';
    const bush = k => this.add({ u, v, d, kind: 'buisson', spr: forge ? R.rocks[Math.floor(r2 * 4)] : R.bushes[Math.floor(r2 * R.bushes.length)], k });
    if (d < 1.2) {
      if (r1 < 0.22) bush(forge ? 0.45 : 0.62 + r3 * 0.15);
      return;
    }
    // Les jardins entre les maisons : quelques arbres (plus nombreux par bosquets), des massifs.
    const pArbre = 0.14 + 0.16 * Math.max(0, (n - 0.45) / 0.55);
    if (r1 < pArbre) {
      if (forge) this.add({ u, v, d, kind: 'colonne', spr: R.columns[Math.floor(r2 * R.columns.length)], k: 1 + r3 * 0.3 });
      else this.arbre(u, v, d, 0.95 + 0.3 * f + r3 * 0.15, r2, false);
    } else if (r1 < pArbre + 0.26) bush(forge ? 0.7 + r3 * 0.5 : 0.75 + r3 * 0.3);
  }

  // Des réverbères (des braseros à Kaldum) de part et d'autre des rues, en quinconce.
  reverberes() {
    for (const P of this.paths) {
      let s = 1;
      const end = P.pts[P.pts.length - 1].t;
      for (let t = P.pts[0].t + (P.escalier ? 0.6 : 1.4); t < end; t += 2.7) {
        const q = P.pts.find(p => p.t >= t);
        if (!q) break;
        const u = q.u + P.s + P.perp[0] * s * (P.hw + 0.32), v = q.v + P.s + P.perp[1] * s * (P.hw + 0.32);
        s = -s;
        this.add({ u, v, d: this.dist(u, v), kind: 'lampe', spr: this.R.lamp, k: 1, wide: 0.25 });
      }
    }
  }

  // Les maisons : d'abord en rang le long des rues, le long pan sur la rue ; puis sur une grille
  // lâche, en retrait du plateau. Chacune sur ses cases, sans jamais chevaucher une autre.
  maisons() {
    const A = this.R.alentours;
    const pose = (u, v, H, d) => {
      const F = H.foot;
      for (let y = Math.floor(v - F.wb / 2 - 0.2); y <= Math.floor(v + F.wb / 2 + 0.2); y++) for (let x = Math.floor(u - F.wa / 2 - 0.2); x <= Math.floor(u + F.wa / 2 + 0.2); x++) {
        if (this.board(x, y) || (this.low(x + 0.5, y + 0.5) && this.chute !== 'terrasse')) return false;
        const k = this.idx(x, y);
        if (k >= 0 && this.pris[k]) return false;
        if (this.pathDist(x + 0.5, y + 0.5) < this.style.large + 0.5) return false;
      }
      if (!this.add({ u, v, d, kind: 'maison', spr: H, k: 1, box: this.houseBox(H, u, v) })) return false;
      for (let y = Math.floor(v - F.wb / 2 - 0.4); y <= Math.floor(v + F.wb / 2 + 0.4); y++) for (let x = Math.floor(u - F.wa / 2 - 0.4); x <= Math.floor(u + F.wa / 2 + 0.4); x++) { const k = this.idx(x, y); if (k >= 0) this.pris[k] = 1; }
      return true;
    };
    // En rang le long des rues, de chaque côté.
    for (const P of this.paths) {
      const along = P.dir[0] ? 'u' : 'v', list = A.houses[along];
      for (const s of [-1, 1]) {
        let t = P.pts[0].t + 2.6 + (s > 0 ? 0 : 1.4);
        while (t < P.pts[P.pts.length - 1].t) {
          const q = P.pts.find(p => p.t >= t);
          if (!q) break;
          const rnd = Renderer.prng(this.seed ^ Renderer.hashStr(P.side + s + Math.round(t * 10)));
          const H = list[Math.floor(rnd() * list.length)], F = H.foot;
          const deep = (along === 'u' ? F.wb : F.wa) / 2;
          const off = P.hw + 0.65 + deep + rnd() * 0.3;
          const u = q.u + P.s + P.perp[0] * s * off, v = q.v + P.s + P.perp[1] * s * off;
          const d = this.dist(u, v);
          if (d > 2.2 && rnd() < 0.88) pose(u, v, H, d);
          t += (along === 'u' ? F.wa : F.wb) + 0.7 + rnd() * 1.4;
        }
      }
    }
    // Plus loin, entre les rues : une maison par case d'une grille lâche (elle y tient toute).
    const g = this.cellRange, CU = 3.4, CV = 3.4;
    for (let j = Math.floor(g.y0 / CV); j <= Math.ceil(g.y1 / CV); j++) for (let i = Math.floor(g.x0 / CU); i <= Math.ceil(g.x1 / CU); i++) {
      const rnd = this.rndAt(i, j, 3);
      const r1 = rnd(), r2 = rnd(), r3 = rnd();
      let H;
      if (A.tower && r3 < 0.07) H = A.tower;
      else { const list = r2 < 0.5 ? A.houses.u : A.houses.v; H = list[Math.floor(rnd() * list.length)]; }
      const F = H.foot;
      const u = i * CU + F.wa / 2 + 0.1 + rnd() * Math.max(0, CU - F.wa - 0.2), v = j * CV + F.wb / 2 + 0.1 + rnd() * Math.max(0, CV - F.wb - 0.2);
      const d = this.dist(u, v);
      if (d < 2.5 || r1 > 0.55 + 0.4 * Math.min(1, (d - 2.5) / 4)) continue;
      pose(u, v, H, d);
    }
  }

  // Sous terre : des parois de roche qui montent dès le bord, des blocs, des stalagmites ; au loin,
  // le noir (l'air s'en charge) ; quelques cristaux qui luisent dans la paroi.
  souterrain(u, v, d, pd, n, f, r1, r2, r3) {
    const R = this.R, P = this.P, A = R.alentours;
    if (d < 0.75) return;
    if (d > 7.5 && r1 < 0.5) return;
    const bord = pd < this.style.large + 1.4;
    if (r1 < (bord ? 0.95 : 0.82)) {
      const glow = r3 < P.crystals * (this.dessous === 'cristal' ? 5 : 2);
      if (r2 < 0.45) this.add({ u, v, d, kind: 'mur', spr: R.ramparts[Math.floor(r3 * R.ramparts.length)], k: 1 + 0.5 * f + r3 * 0.35 });
      else if (r2 < 0.62) this.add({ u, v, d, kind: 'rocher', spr: A.stalagmites[Math.floor(r3 * 3)], k: 0.8 + 0.6 * f + r3 * 0.3 });
      else if (r2 < 0.9 || P.column !== 'colonne') this.add({ u, v, d, kind: 'rocher', spr: (glow ? R.crystalRocks : R.rocks)[Math.floor(r3 * 2)], k: 1.05 + 0.9 * f + r3 * 0.4, glow });
      else this.add({ u, v, d, kind: 'colonne', spr: R.columns[0], k: 1 + r3 * 0.3 });
    } else if (this.dessous === 'lichen' && d < 6 && r3 < 0.35) {
      // Le lichen qui éclaire les galeries : des taches pâles qui luisent dans la roche.
      this.add({ u, v, d, kind: 'lichen', glow: true, seed: (r2 * 1e9) | 0 });
    }
  }

  // Les étais des galeries : un cadre de bois au-dessus de chaque tunnel, une lanterne à l'entrée.
  etais() {
    const R = this.R;
    for (const P of this.paths) {
      if (P.lave) continue;
      for (const t of [1.7, 4.2, 7.2]) {
        const q = P.pts.find(p => p.t >= t);
        if (!q) continue;
        const d = this.dist(q.u, q.v);
        const pts = [-1, 1].map(s => this.w(q.u + P.perp[0] * s * (P.hw + 0.05), q.v + P.perp[1] * s * (P.hw + 0.05)));
        const box = { x0: Math.min(pts[0].x, pts[1].x) - 6, x1: Math.max(pts[0].x, pts[1].x) + 6, y0: Math.min(pts[0].y, pts[1].y) - 52, y1: Math.max(pts[0].y, pts[1].y) + 3 };
        this.add({ u: q.u, v: q.v, d, kind: 'etai', pts, box });
      }
      const q = P.pts.find(p => p.t >= 2.6);
      if (q) {
        const s = Renderer.prng(this.seed ^ Renderer.hashStr('lampe:' + P.side))() < 0.5 ? -1 : 1;
        const u = q.u + P.perp[0] * s * (P.hw + 0.35), v = q.v + P.perp[1] * s * (P.hw + 0.35);
        this.add({ u, v, d: this.dist(u, v), kind: 'lampe', spr: R.lamp, k: 1 });
      }
    }
  }

  // ----- Sprites des alentours -----

  // Une touffe d'herbe, un bouquet de fleurs ou quelques cailloux, au pinceau comme sur le plateau.
  smallSprite(kind, rnd) {
    const P = this.P, r = this.r;
    return r.spr(26, 18, 13, 14, c => {
      c.lineCap = 'round';
      if (kind === 'touffe') {
        // À Kaldum, des herbes de cendre au bout rougeoyant ; ailleurs, l'herbe du pays.
        const G = P.lava ? P.rock : (P.grass || P.leaves);
        const n = 6 + Math.floor(rnd() * 4);
        for (let i = 0; i < n; i++) {
          const dx = (rnd() - 0.5) * 12, h = 4 + rnd() * 6, lean = (rnd() - 0.5) * 5;
          c.lineWidth = 1.2; c.strokeStyle = G[1 + Math.floor(rnd() * 3)];
          c.beginPath(); c.moveTo(dx, 0); c.quadraticCurveTo(dx + lean * 0.2, -h * 0.6, dx + lean, -h); c.stroke();
          c.lineWidth = 0.9; c.strokeStyle = G[3 + Math.floor(rnd() * 2)];
          c.beginPath(); c.moveTo(dx + lean * 0.45, -h * 0.55); c.lineTo(dx + lean, -h); c.stroke();
          if (P.lava && rnd() < 0.3) { c.fillStyle = P.lava[3]; c.beginPath(); c.arc(dx + lean, -h, 0.9, 0, Math.PI * 2); c.fill(); }
        }
      } else if (kind === 'fougere') {
        // une fougère : des frondes en éventail, des folioles alternées
        const L = P.leaves, n = 5 + Math.floor(rnd() * 3);
        for (let i = 0; i < n; i++) {
          const a = -Math.PI / 2 + (i / (n - 1) - 0.5) * 2.5 + (rnd() - 0.5) * 0.2, len = 9 + rnd() * 4;
          const ex = Math.cos(a) * len, ey = Math.sin(a) * len * 0.72;
          const mx = ex * 0.5, my = ey * 0.6 - 3;
          c.strokeStyle = L[2]; c.lineWidth = 1;
          c.beginPath(); c.moveTo(0, 0); c.quadraticCurveTo(mx, my, ex, ey); c.stroke();
          for (let t = 0.3; t < 0.98; t += 0.14) {
            const q = 1 - t, px = 2 * q * t * mx + t * t * ex, py = 2 * q * t * my + t * t * ey, s = (1 - t) * 2.6 + 0.8;
            c.fillStyle = L[3 + ((t * 10) | 0) % 2];
            c.beginPath(); c.ellipse(px, py, s, s * 0.45, a + 0.9, 0, Math.PI * 2); c.fill();
            c.beginPath(); c.ellipse(px, py, s, s * 0.45, a - 0.9, 0, Math.PI * 2); c.fill();
          }
        }
      } else if (kind === 'fleurs') {
        const cols = ['#f2e2c9', '#f2c25a', '#9fd0ff', '#e89ac0', '#d08cff'];
        const col = cols[Math.floor(rnd() * cols.length)];
        for (let i = 0; i < 7; i++) {
          const dx = (rnd() - 0.5) * 18, dy = (rnd() - 0.5) * 6, h = 3 + rnd() * 4;
          c.strokeStyle = (P.grass || P.leaves)[2]; c.lineWidth = 0.8;
          c.beginPath(); c.moveTo(dx, dy); c.lineTo(dx, dy - h); c.stroke();
          c.fillStyle = col; c.beginPath(); c.arc(dx, dy - h, 1.4, 0, Math.PI * 2); c.fill();
        }
      } else {
        const S = P.gravel || P.stone;
        for (let i = 0; i < 3; i++) {
          const dx = (rnd() - 0.5) * 14, dy = (rnd() - 0.5) * 5, rr = 1.2 + rnd() * 2;
          c.fillStyle = 'rgba(0,0,0,0.35)'; c.beginPath(); c.ellipse(dx + 0.6, dy + 0.6, rr, rr * 0.6, 0, 0, Math.PI * 2); c.fill();
          c.fillStyle = S[3]; c.beginPath(); c.ellipse(dx, dy, rr, rr * 0.6, 0, 0, Math.PI * 2); c.fill();
          c.fillStyle = 'rgba(255,255,255,0.16)'; c.beginPath(); c.ellipse(dx - rr * 0.3, dy - rr * 0.25, rr * 0.45, rr * 0.25, 0, 0, Math.PI * 2); c.fill();
        }
      }
    });
  }

  // Un tronc couché dans le sous-bois, le long de u (ou de v, `rot`) : l'écorce, la mousse dessus,
  // la coupe claire et ses cernes au bout tourné vers nous.
  logSprite(rnd, rot) {
    const P = this.P, r = this.r, B = P.bark, L = 1.5 + rnd() * 0.5, R = 4.2 + rnd() * 1.5;
    const ax = rot ? [-1, 0.5] : [1, 0.5], len = L * 36;
    return r.spr(80, 56, 40, 32, c => {
      const ex = ax[0] * len / 2, ey = ax[1] * len / 2;
      // le fût : un ruban épais de l'arrière vers l'avant
      const nx = -ax[1], ny = ax[0], k = 1 / Math.hypot(nx, ny);
      const ox = nx * k * R, oy = ny * k * R;
      c.lineJoin = 'round';
      c.beginPath(); c.moveTo(-ex + ox, -ey + oy - R); c.lineTo(ex + ox, ey + oy - R); c.lineTo(ex - ox, ey - oy - R); c.lineTo(-ex - ox, -ey - oy - R); c.closePath();
      const g = c.createLinearGradient(0, -R * 2, 0, R * 0.5);
      g.addColorStop(0, B[3]); g.addColorStop(0.5, B[2]); g.addColorStop(1, B[0]);
      c.fillStyle = g; c.fill(); c.strokeStyle = P.ink; c.lineWidth = 1.3; c.stroke();
      c.strokeStyle = 'rgba(0,0,0,0.3)'; c.lineWidth = 0.8;
      for (let i = 0; i < 4; i++) { const t = (rnd() - 0.5) * 0.8; c.beginPath(); c.moveTo(ex * t * 2 - ox * 0.4, ey * t * 2 - oy * 0.4 - R); c.lineTo(ex * (t * 2 + 0.3) - ox * 0.4, ey * (t * 2 + 0.3) - oy * 0.4 - R); c.stroke(); }
      if (P.moss) for (let i = 0; i < 10; i++) { const t = (rnd() - 0.5) * 1.6; c.fillStyle = Renderer.rgba(P.moss[Math.floor(rnd() * 3)], 0.85); c.beginPath(); c.ellipse(ex * t + ox * 0.6, ey * t + oy * 0.6 - R * 1.7, 2.4, 1.1, 0, 0, Math.PI * 2); c.fill(); }
      // la coupe, au bout avant (le bout +u ou +v, tourné vers nous)
      const fx = ex, fy = ey;
      c.fillStyle = B[3]; c.beginPath(); c.ellipse(fx, fy - R, R * 0.62, R, 0, 0, Math.PI * 2); c.fill(); c.strokeStyle = P.ink; c.lineWidth = 1.1; c.stroke();
      c.strokeStyle = Renderer.rgba(B[1], 0.8); c.lineWidth = 0.7;
      for (const s of [0.6, 0.3]) { c.beginPath(); c.ellipse(fx, fy - R, R * 0.62 * s, R * s, 0, 0, Math.PI * 2); c.stroke(); }
    }, P.tint);
  }

  // Une stalagmite : un cône de roche effilé, éclairé d'un côté, une veine qui luit parfois.
  stalagmiteSprite(rnd, i) {
    const P = this.P, r = this.r, h = 30 + rnd() * 26 + i * 6, w = 9 + rnd() * 5;
    return r.spr(40, h + 14, 20, h + 6, c => {
      const tip = [(rnd() - 0.5) * 4, -h];
      c.beginPath(); c.moveTo(-w, 0); c.quadraticCurveTo(-w * 0.45, -h * 0.45, tip[0], tip[1]); c.quadraticCurveTo(w * 0.45, -h * 0.45, w, 0); c.quadraticCurveTo(0, 4, -w, 0); c.closePath();
      const g = c.createLinearGradient(-w, 0, w, 0);
      g.addColorStop(0, P.rock[4]); g.addColorStop(0.4, P.rock[2]); g.addColorStop(1, P.rock[0]);
      c.fillStyle = g; c.fill(); c.strokeStyle = P.ink; c.lineWidth = 1.4; c.stroke();
      c.strokeStyle = 'rgba(0,0,0,0.3)'; c.lineWidth = 0.8;
      for (let k = 1; k < 4; k++) { const y = -h * k / 4; c.beginPath(); c.moveTo(-w * (1 - k / 4) * 0.8, y); c.lineTo(w * (1 - k / 4) * 0.6, y + 2); c.stroke(); }
      if (P.lava && rnd() < 0.6) { c.strokeStyle = P.lava[3]; c.lineWidth = 1; c.beginPath(); c.moveTo(1, -h * 0.2); c.lineTo(-1, -h * 0.45); c.lineTo(1.5, -h * 0.62); c.stroke(); }
    }, P.tint);
  }

  // Une maison en perspective isométrique : murs (la face +v au jour, la face +u à l'ombre), toit à
  // deux pans dont le faîte suit u, ou v (`rot`), fenêtres chaudes ; en basalte et toit plat à
  // Kaldum. `tour` : une tour carrée à toit pointu.
  houseSprite(rnd, i, rot, tour) {
    const P = this.P, r = this.r, kald = P.ground === 'ardoise';
    let wa = 1.5 + rnd() * 0.9, wb = 1.3 + rnd() * 0.7;
    if (rot) { const t = wa; wa = wb; wb = t; }
    let hh = 30 + rnd() * 20 + (i % 2) * 8, rh = kald ? 6 : 20 + rnd() * 10;
    if (tour) { wa = wb = 1.15 + rnd() * 0.2; hh = 64 + rnd() * 12; rh = 38; }
    const X = (du, dv) => (du - dv) * 32, Y = (du, dv, z) => (du + dv) * 16 - z;
    const left = X(-wa / 2, wb / 2), right = X(wa / 2, -wb / 2);
    const top = Y(-wa / 2, -wb / 2, hh + rh + (kald ? 18 : 10)), bottom = Y(wa / 2, wb / 2, 0);
    const W = right - left + 24, Ht = bottom - top + 12;
    // Toits d'ardoise bleue, parfois vert sombre ; basalte à Kaldum.
    const toit = kald ? P.rock : (rnd() < 0.3 ? ['#16262a', '#1f3a3c', '#2d5552', '#43746c', '#62958a'] : ['#1e2236', '#2c3350', '#3f4a6e', '#5a6890', '#7c8cb2']);
    const spr = r.spr(W, Ht, -left + 12, -top + 6, c => {
      const wall = kald ? P.rock : P.stone, ink = P.ink;
      const pt = (du, dv, z) => [X(du, dv), Y(du, dv, z)];
      const poly = (pts, fill, stroke, lw) => { c.beginPath(); pts.forEach((p, k) => (k ? c.lineTo(p[0], p[1]) : c.moveTo(p[0], p[1]))); c.closePath(); if (fill) { c.fillStyle = fill; c.fill(); } if (stroke) { c.strokeStyle = stroke; c.lineWidth = lw || 1.4; c.stroke(); } };
      const a = -wa / 2, b = wa / 2, e = -wb / 2, f = wb / 2;
      // murs
      const faceV = [pt(a, f, 0), pt(b, f, 0), pt(b, f, hh), pt(a, f, hh)];
      const faceU = [pt(b, f, 0), pt(b, e, 0), pt(b, e, hh), pt(b, f, hh)];
      const gv = c.createLinearGradient(0, Y(a, f, hh), 0, Y(a, f, 0));
      gv.addColorStop(0, wall[3]); gv.addColorStop(1, wall[1]);
      poly(faceV, gv, ink, 1.4);
      const gu = c.createLinearGradient(0, Y(b, e, hh), 0, Y(b, e, 0));
      gu.addColorStop(0, wall[2]); gu.addColorStop(1, wall[0]);
      poly(faceU, gu, ink, 1.4);
      // colombages ou assises de pierre
      c.strokeStyle = kald ? 'rgba(0,0,0,0.35)' : Renderer.rgba(P.bark[1], 0.85); c.lineWidth = kald ? 0.8 : 1.6;
      if (!kald && !tour) {
        for (const t of [0.33, 0.66]) { c.beginPath(); c.moveTo(...pt(a + (b - a) * t, f, 0)); c.lineTo(...pt(a + (b - a) * t, f, hh)); c.stroke(); }
        c.beginPath(); c.moveTo(...pt(a, f, hh * 0.55)); c.lineTo(...pt(b, f, hh * 0.55)); c.stroke();
        c.beginPath(); c.moveTo(...pt(b, e + (f - e) * 0.5, 0)); c.lineTo(...pt(b, e + (f - e) * 0.5, hh)); c.stroke();
      } else {
        c.strokeStyle = 'rgba(0,0,0,0.3)'; c.lineWidth = 0.8;
        for (let z = 8; z < hh; z += 8) { c.beginPath(); c.moveTo(...pt(a, f, z)); c.lineTo(...pt(b, f, z)); c.lineTo(...pt(b, e, z)); c.stroke(); }
      }
      // porte sur la face au jour
      const dm = a + (b - a) * (0.25 + rnd() * 0.15);
      poly([pt(dm - 0.12, f, 0), pt(dm + 0.12, f, 0), pt(dm + 0.12, f, 15), pt(dm - 0.12, f, 15)], P.bark[1], ink, 1);
      // fenêtres chaudes
      const win = (du, dv, z, face) => {
        const s = 0.1, h = 7;
        const q = face === 'v' ? [pt(du - s, dv, z), pt(du + s, dv, z), pt(du + s, dv, z + h), pt(du - s, dv, z + h)] : [pt(du, dv - s, z), pt(du, dv + s, z), pt(du, dv + s, z + h), pt(du, dv - s, z + h)];
        const lit = rnd() < 0.7;
        poly(q, lit ? P.lantern : '#141826', ink, 1);
        if (lit) { c.save(); c.globalCompositeOperation = 'lighter'; const [cx, cy] = q[0]; const gr = c.createRadialGradient(cx + 3, cy - 3, 0, cx + 3, cy - 3, 14); gr.addColorStop(0, Renderer.rgba(P.glow, 0.45)); gr.addColorStop(1, Renderer.rgba(P.glow, 0)); c.fillStyle = gr; c.fillRect(cx - 12, cy - 18, 30, 30); c.restore(); }
      };
      win(a + (b - a) * 0.72, f, hh * 0.62, 'v');
      if (hh > 38) win(a + (b - a) * 0.4, f, hh * 0.62, 'v');
      if (tour) win(a + (b - a) * 0.5, f, hh * 0.86, 'v');
      win(b, e + (f - e) * 0.3, hh * 0.6, 'u');
      if (wb > 1.2) win(b, e + (f - e) * 0.75, hh * 0.6, 'u');
      // toit
      const o = 0.14;
      if (kald) {
        poly([pt(a - o, f + o, hh), pt(b + o, f + o, hh), pt(b + o, e - o, hh), pt(a - o, e - o, hh)], toit[2], ink, 1.4);
        poly([pt(a - o, f + o, hh), pt(b + o, f + o, hh), pt(b + o, f + o, hh - 4), pt(a - o, f + o, hh - 4)], toit[1], ink, 1);
        // cheminée de forge, rougeoyante
        const cu = a + (b - a) * 0.7, cv = e + (f - e) * 0.3;
        poly([pt(cu - 0.12, cv + 0.12, hh), pt(cu + 0.12, cv + 0.12, hh), pt(cu + 0.12, cv + 0.12, hh + 18), pt(cu - 0.12, cv + 0.12, hh + 18)], toit[1], ink, 1);
        poly([pt(cu + 0.12, cv + 0.12, hh), pt(cu + 0.12, cv - 0.12, hh), pt(cu + 0.12, cv - 0.12, hh + 18), pt(cu + 0.12, cv + 0.12, hh + 18)], toit[0], ink, 1);
        const [gx, gy] = pt(cu, cv, hh + 18);
        c.save(); c.globalCompositeOperation = 'lighter';
        const gr = c.createRadialGradient(gx, gy, 0, gx, gy, 16); gr.addColorStop(0, Renderer.rgba(P.lantern, 0.7)); gr.addColorStop(1, Renderer.rgba(P.lantern, 0));
        c.fillStyle = gr; c.fillRect(gx - 16, gy - 16, 32, 32); c.restore();
      } else if (tour) {
        // toit pointu à quatre pans, épi doré
        const apex = pt(0, 0, hh + rh);
        poly([pt(a - o, e - o, hh - 2), pt(b + o, e - o, hh - 2), apex], toit[1], ink, 1.3);
        poly([pt(b + o, e - o, hh - 2), pt(b + o, f + o, hh - 2), apex], toit[1], ink, 1.3);
        poly([pt(a - o, f + o, hh - 2), pt(b + o, f + o, hh - 2), apex], toit[3], ink, 1.4);
        poly([pt(a - o, e - o, hh - 2), pt(a - o, f + o, hh - 2), apex], toit[2], ink, 1.3);
        c.strokeStyle = P.vein[1]; c.lineWidth = 1.6; c.beginPath(); c.moveTo(apex[0], apex[1]); c.lineTo(apex[0], apex[1] - 8); c.stroke();
        c.fillStyle = P.vein[2]; c.beginPath(); c.arc(apex[0], apex[1] - 9, 1.8, 0, Math.PI * 2); c.fill();
      } else if (!rot) {
        // faîte le long de u : pan arrière, à peine visible, pignon sur la face +u, pan avant au jour
        const R1 = pt(a - o, 0, hh + rh), R2 = pt(b + o, 0, hh + rh);
        poly([R1, R2, pt(b + o, e - o, hh - 2), pt(a - o, e - o, hh - 2)], toit[1], ink, 1.3);
        poly([pt(b, e, hh), pt(b, f, hh), pt(b, 0, hh + rh)], wall[2], ink, 1.3);
        const gr = c.createLinearGradient(0, R1[1], 0, Y(a, f + o, hh));
        gr.addColorStop(0, toit[4]); gr.addColorStop(1, toit[2]);
        poly([pt(a - o, f + o, hh - 2), pt(b + o, f + o, hh - 2), R2, R1], gr, ink, 1.4);
        c.strokeStyle = 'rgba(10,12,24,0.35)'; c.lineWidth = 0.8;
        for (const t of [0.25, 0.5, 0.75]) { c.beginPath(); c.moveTo(...pt(a - o, (f + o) * (1 - t), hh - 2 + (rh + 2) * t)); c.lineTo(...pt(b + o, (f + o) * (1 - t), hh - 2 + (rh + 2) * t)); c.stroke(); }
        c.strokeStyle = Renderer.rgba(toit[4], 0.8); c.lineWidth = 1.2; c.beginPath(); c.moveTo(...R1); c.lineTo(...R2); c.stroke();
        const cu = a + (b - a) * 0.75;
        poly([pt(cu - 0.1, 0.05, hh + rh - 6), pt(cu + 0.1, 0.05, hh + rh - 6), pt(cu + 0.1, 0.05, hh + rh + 8), pt(cu - 0.1, 0.05, hh + rh + 8)], wall[2], ink, 1);
      } else {
        // faîte le long de v : pan arrière (vers la lumière), pignon sur la face +v, pan avant à l'ombre
        const Q1 = pt(0, e - o, hh + rh), Q2 = pt(0, f + o, hh + rh);
        poly([Q1, Q2, pt(a - o, f + o, hh - 2), pt(a - o, e - o, hh - 2)], toit[3], ink, 1.3);
        poly([pt(a, f, hh), pt(b, f, hh), pt(0, f, hh + rh)], wall[3], ink, 1.3);
        const gr = c.createLinearGradient(0, Q1[1], 0, Y(b + o, f + o, hh));
        gr.addColorStop(0, toit[3]); gr.addColorStop(1, toit[1]);
        poly([pt(b + o, e - o, hh - 2), pt(b + o, f + o, hh - 2), Q2, Q1], gr, ink, 1.4);
        c.strokeStyle = 'rgba(10,12,24,0.35)'; c.lineWidth = 0.8;
        for (const t of [0.25, 0.5, 0.75]) { c.beginPath(); c.moveTo(...pt((b + o) * (1 - t), e - o, hh - 2 + (rh + 2) * t)); c.lineTo(...pt((b + o) * (1 - t), f + o, hh - 2 + (rh + 2) * t)); c.stroke(); }
        c.strokeStyle = Renderer.rgba(toit[4], 0.8); c.lineWidth = 1.2; c.beginPath(); c.moveTo(...Q1); c.lineTo(...Q2); c.stroke();
        const cv = e + (f - e) * 0.3;
        poly([pt(0.05, cv - 0.1, hh + rh - 6), pt(0.05, cv + 0.1, hh + rh - 6), pt(0.05, cv + 0.1, hh + rh + 8), pt(0.05, cv - 0.1, hh + rh + 8)], wall[2], ink, 1);
      }
    }, kald ? null : P.tint);
    spr.foot = { wa, wb, hh, rh, left, right, top, bottom };
    return spr;
  }

  houseBox(H, u, v) {
    const p = this.w(u, v), F = H.foot;
    return { x0: p.x + F.left - 2, x1: p.x + F.right + 2, y0: p.y + F.top, y1: p.y + F.bottom + 2 };
  }

  // ----- L'air : brume et pénombre qui montent avec la distance -----

  // Une case, un pixel : de grandes taches d'ombre et de lumière (le sol n'a pas l'air d'un
  // carrelage, comme sous des nuages qui passent), puis l'opacité de la brume (ou du noir sous terre),
  // réunies en une seule couche ; agrandie en douceur à la peinture, elle suit la forme du plateau.
  air() {
    const g = this.cellRange, GW = this.GW, GH = this.GH, P = this.P;
    const cv = Renderer.canvas(GW, GH), c = cv.getContext('2d'), img = c.createImageData(GW, GH);
    const haze = Renderer.rgb(this.hazeColor);
    const sm = (x, a, b) => { const t = Math.max(0, Math.min(1, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
    const sous = this.genre === 'souterrain';
    const sombre = Renderer.rgb(sous ? '#000000' : Renderer.mix(P.ink, '#000000', 0.3));
    const clair = Renderer.rgb(sous ? P.stone[2] : (P.grass ? P.grass[5] : P.stone[3]));
    // Des écharpes de brume claire, longues et basses, qui traînent loin du plateau (dehors) ; la
    // vapeur qui sort des parois (aux Vapeurs).
    const vapeur = this.dessous === 'vapeur';
    const brume = Renderer.rgb(vapeur ? '#d8dde6' : Renderer.mix(P.fog, '#ffffff', 0.35));
    const seed = (this.seed >>> 3) & 0xffff;
    for (let j = 0; j < GH; j++) for (let i = 0; i < GW; i++) {
      const k = j * GW + i, d = this.D[k], pd = this.PD[k], u = i + g.x0 + 0.5, v = j + g.y0 + 0.5;
      const ex = (u - v) * 32, ey = (u + v) * 16;
      const nb = Renderer.vnoise(ex / 260 + 13, ey / 70 + 7, 2, seed + 5);
      const a3 = sous ? (vapeur ? sm(nb, 0.5, 0.8) * 0.32 * sm(d, 0.8, 1.6) * (1 - sm(d, 3, 5)) : 0) : sm(nb, 0.56, 0.82) * 0.2 * sm(d, 2.5, 6);
      // les taches, nulles sur le plateau
      const n = Renderer.vnoise(u * 0.16 + 31, v * 0.16 + 17, 2, seed), near = sm(d, 0.4, 1.6);
      let a1 = 0, C1 = sombre;
      if (n < 0.42) a1 = (0.42 - n) / 0.42 * 0.42 * near;
      else if (n > 0.64) { a1 = Math.min(1, (n - 0.64) / 0.3) * 0.12 * near; C1 = clair; }
      // la brume, ou le noir
      let a2;
      if (sous) {
        a2 = sm(d, 0.7, 4.2) * 0.97;
        if (pd < 1.6) a2 = Math.min(a2, 0.08 + sm(d, 1.8, 9) * 0.9);
      } else {
        a2 = Math.pow(sm(d, 1.4, 11), 1.15) * 0.5;
        if (this.chute === 'vallee' && this.r.isVoid(i + g.x0, j + g.y0)) { a2 = Math.max(a2, 0.12 + sm(d, 0, 6) * 0.16); a1 = 0; }
      }
      // les trois couches l'une sur l'autre (taches, brume ou noir, écharpes), en une seule
      const A = 1 - (1 - a1) * (1 - a2) * (1 - a3), o = k * 4;
      if (A > 0) for (let ch = 0; ch < 3; ch++) img.data[o + ch] = Math.round((C1[ch] * a1 * (1 - a2) * (1 - a3) + haze[ch] * a2 * (1 - a3) + brume[ch] * a3) / A);
      img.data[o + 3] = Math.round(A * 255);
    }
    c.putImageData(img, 0, 0);
    this.airCanvas = cv;
  }

  // ----- Peinture -----

  // Le ton du crépuscule (et la brume du fond) sur tout un calque : le même dans les deux calques,
  // pour qu'ils se raccordent.
  gradeGround(c, rect) {
    const r = this.r, P = this.P, m = this.map, W = r.W, o = r.origin;
    const y0 = o.y - 16, y1 = o.y + (m.w + m.h - 1) * 16;
    c.save();
    c.globalCompositeOperation = 'multiply';
    const g = c.createLinearGradient(0, y0, 0, y1);
    g.addColorStop(0, P.grade[0]); g.addColorStop(1, P.grade[1]);
    c.fillStyle = g; c.fillRect(rect.x, rect.y, rect.w, rect.h);
    c.globalCompositeOperation = 'screen';
    const sky = c.createRadialGradient(W * 0.3, y0, 0, W * 0.3, y0, W * 0.75);
    sky.addColorStop(0, 'rgba(120,150,220,0.16)'); sky.addColorStop(1, 'rgba(120,150,220,0)');
    c.fillStyle = sky; c.fillRect(rect.x, rect.y, rect.w, rect.h);
    if (this.genre !== 'souterrain') {
      // la brume du fond : la perspective atmosphérique, au-dessus du plateau
      const mist = c.createLinearGradient(0, y0 - 260, 0, y0 + 150);
      mist.addColorStop(0, Renderer.rgba(P.fog, 0.3)); mist.addColorStop(0.65, Renderer.rgba(P.fog, 0.2)); mist.addColorStop(1, Renderer.rgba(P.fog, 0));
      if (rect.y < y0 + 150) { c.fillStyle = mist; c.fillRect(rect.x, rect.y, rect.w, Math.min(rect.h, y0 + 150 - rect.y)); }
    }
    c.restore();
  }

  // Le sol des alentours sur tout le rectangle : la matière de la zone, ses plaques, ses taches
  // d'ombre, les chemins des sorties ; puis le contrebas d'un vide et ses murs.
  paintGround(c, rect) {
    const r = this.r, P = this.P;
    c.save();
    c.fillStyle = r.isoPattern(c, P, this.baseMat);
    c.fillRect(rect.x, rect.y, rect.w, rect.h);
    this.paintPatches(c, rect, 0);
    for (const p of this.paths) if (!p.z) this.paintPath(c, p, rect);
    if (this.chute) {
      this.paintLow(c, rect);
      this.paintMurs(c, rect);
    }
    c.restore();
  }

  // Les plaques d'une autre matière, une au plus par case d'une grille lâche (tirées d'après leur
  // position), bords sombres comme sur le plateau. `z` : sur le contrebas d'une terrasse.
  paintPatches(c, rect, z) {
    const g = this.cellRange;
    const inRect = (x0, y0, x1, y1) => x1 > rect.x && x0 < rect.x + rect.w && y1 > rect.y && y0 < rect.y + rect.h;
    const mats = this.style.plaques, pats = {};
    const B = this.genre === 'roc' ? 4.6 : 5.8;
    for (let j = Math.floor(g.y0 / B); j <= Math.ceil(g.y1 / B); j++) for (let i = Math.floor(g.x0 / B); i <= Math.ceil(g.x1 / B); i++) {
      const rnd = this.rndAt(i, j, 4);
      if (rnd() > 0.72) continue;
      const u = (i + rnd()) * B, v = (j + rnd()) * B, rr = 0.6 + rnd() * 1.6, mat = mats[Math.floor(rnd() * mats.length)], ph = rnd() * 6.28;
      if (this.board(Math.floor(u), Math.floor(v)) || (!z && this.low(u, v))) continue;
      const c0 = this.w(u, v);
      if (!inRect(c0.x - rr * 64, c0.y - rr * 32 + z, c0.x + rr * 64, c0.y + rr * 32 + z)) continue;
      const path = new Path2D();
      for (let k = 0; k <= 14; k++) {
        const a = k / 14 * Math.PI * 2, rad = rr * (0.75 + 0.25 * Math.sin(a * 3 + ph) + 0.12 * Math.sin(a * 7 + ph * 2));
        const p = this.w(u + Math.cos(a) * rad, v + Math.sin(a) * rad * 0.8);
        if (k) path.lineTo(p.x, p.y + z); else path.moveTo(p.x, p.y + z);
      }
      path.closePath();
      const pat = pats[mat] || (pats[mat] = this.patternAt(c, mat, z));
      c.fillStyle = pat; c.fill(path);
      c.save(); c.clip(path);
      c.lineWidth = 5; c.strokeStyle = 'rgba(10,8,4,0.22)'; c.stroke(path);
      c.restore();
    }
  }

  // Le motif d'une matière, descendu de `z` (le sol du contrebas).
  patternAt(c, mat, z) {
    const r = this.r;
    if (!z) return r.isoPattern(c, this.P, mat);
    const pat = c.createPattern(Renderer.texture(this.P, mat), 'repeat');
    if (pat && pat.setTransform && typeof DOMMatrix === 'function') pat.setTransform(new DOMMatrix([0.5, 0.25, -0.5, 0.25, r.origin.x, r.origin.y - 16 + z]));
    return pat;
  }

  // Un chemin : sa matière, ses bords sombres, et un filet clair pour les pavés. Une rigole de lave :
  // sa croûte au bord, un cœur clair.
  paintPath(c, p, rect) {
    if (!p.rib) p.rib = this.ribbon(p, 0);
    const b = p.rib.box;
    if (b.x1 < rect.x || b.x0 > rect.x + rect.w || b.y1 < rect.y || b.y0 > rect.y + rect.h) return;
    if (p.lave) {
      c.lineWidth = 7; c.strokeStyle = 'rgba(20,6,2,0.7)'; c.stroke(p.rib.path);
      c.fillStyle = this.patternAt(c, 'lave', 0); c.fill(p.rib.path);
      c.lineWidth = 1.6; c.strokeStyle = Renderer.rgba(this.P.lava[4], 0.7); c.stroke(p.rib.edges);
      return;
    }
    const mat = this.style.chemin || (this.baseMat === 'sol' ? 'dalle' : 'gravier');
    c.fillStyle = this.patternAt(c, mat, p.z); c.fill(p.rib.path);
    c.save(); c.clip(p.rib.path);
    c.lineWidth = mat === 'pave' ? 3 : 6; c.strokeStyle = mat === 'pave' ? 'rgba(8,8,14,0.5)' : 'rgba(10,8,4,0.3)'; c.stroke(p.rib.edges);
    c.restore();
    if (mat === 'pave') { c.lineWidth = 1; c.strokeStyle = Renderer.rgba(this.P.stone[3], 0.35); c.stroke(p.rib.edges); }
  }

  // Le chemin des cases vides (en coordonnées du monde), pour les découper.
  lowPathOf() {
    if (this.lowPath) return this.lowPath;
    const r = this.r, g = this.cellRange, p = new Path2D();
    for (let y = g.y0; y <= g.y1; y++) for (let x = g.x0; x <= g.x1; x++) {
      if (!r.isVoid(x, y)) continue;
      const a = this.w(x - 0.02, y - 0.02), b = this.w(x + 1.02, y - 0.02), d = this.w(x + 1.02, y + 1.02), e = this.w(x - 0.02, y + 1.02);
      p.moveTo(a.x, a.y); p.lineTo(b.x, b.y); p.lineTo(d.x, d.y); p.lineTo(e.x, e.y); p.closePath();
    }
    return (this.lowPath = p);
  }

  // Ce qu'on voit dans le vide : le contrebas d'une terrasse (le même sol, plus bas et dans l'ombre
  // des murs) ou une vallée loin dessous.
  paintLow(c, rect) {
    c.save();
    c.clip(this.lowPathOf());
    if (this.chute === 'terrasse') {
      const z = this.dz;
      c.fillStyle = this.patternAt(c, this.baseMat, z); c.fillRect(rect.x, rect.y, rect.w, rect.h);
      this.paintPatches(c, rect, z);
      for (const p of this.paths) if (p.z) this.paintPath(c, p, rect);
      // le contrebas est un peu dans l'ombre
      c.fillStyle = 'rgba(8,10,24,0.16)'; c.fillRect(rect.x, rect.y, rect.w, rect.h);
      // au-delà d'un bord arrière, le pied du mur caché : une bande d'ombre
      for (const A of this.arrieres) {
        if (Math.max(A.a.x, A.b.x) < rect.x - 20 || Math.min(A.a.x, A.b.x) > rect.x + rect.w + 20 || Math.max(A.a.y, A.b.y) < rect.y - 30 || Math.min(A.a.y, A.b.y) > rect.y + rect.h + 30) continue;
        const o = A.side === 'x' ? this.w(A.x - 0.45, A.y) : this.w(A.x, A.y - 0.45);
        const dx = o.x - A.a.x, dy = o.y - A.a.y;
        const gr = c.createLinearGradient(A.a.x, A.a.y, A.a.x + dx, A.a.y + dy);
        gr.addColorStop(0, 'rgba(4,6,14,0.55)'); gr.addColorStop(1, 'rgba(4,6,14,0)');
        c.fillStyle = gr;
        c.beginPath(); c.moveTo(A.a.x, A.a.y); c.lineTo(A.b.x, A.b.y); c.lineTo(A.b.x + dx, A.b.y + dy); c.lineTo(A.a.x + dx, A.a.y + dy); c.closePath(); c.fill();
      }
    } else this.paintValley(c, rect);
    c.restore();
  }

  // La vallée sous une corniche : le pays loin dessous, petit et voilé de brume, des bouquets de
  // cimes, des traînées de brume claire.
  paintValley(c, rect) {
    const r = this.r, P = this.P, R = this.R, g = this.cellRange, G = P.grass || P.leaves;
    const pat = c.createPattern(Renderer.texture(P, P.ground === 'ardoise' ? 'ardoise' : 'herbe'), 'repeat');
    if (pat && pat.setTransform && typeof DOMMatrix === 'function') pat.setTransform(new DOMMatrix([0.2, 0.1, -0.2, 0.1, r.origin.x, r.origin.y + 300]));
    c.fillStyle = pat; c.fillRect(rect.x, rect.y, rect.w, rect.h);
    const fogc = Renderer.mix(P.fog, G[2], 0.55);
    c.fillStyle = Renderer.rgba(Renderer.mix(fogc, P.ink, 0.35), 0.34); c.fillRect(rect.x, rect.y, rect.w, rect.h);
    // Des bouquets de cimes minuscules, et çà et là les feux d'un hameau.
    const S = 0.5, feux = [];
    for (let j = Math.floor(g.y0 / S); j <= Math.ceil(g.y1 / S); j++) for (let i = Math.floor(g.x0 / S); i <= Math.ceil(g.x1 / S); i++) {
      const rnd = this.rndAt(i, j, 6);
      const u = (i + rnd()) * S, v = (j + rnd()) * S, r1 = rnd(), r2 = rnd(), r3 = rnd();
      if (!r.isVoid(Math.floor(u), Math.floor(v))) continue;
      const p = this.w(u, v), y = p.y + 150;
      if (p.x < rect.x - 20 || p.x > rect.x + rect.w + 20 || y < rect.y - 20 || y > rect.y + rect.h + 30) continue;
      const nz = Renderer.vnoise(u * 0.25, v * 0.25, 2, 77);
      if (nz < 0.36 && r3 < 0.035 && !P.lava) { feux.push([p.x, y]); continue; }
      if (nz < 0.42 || r1 > 0.6) continue;
      const s = R.trees[Math.floor(r2 * R.trees.length)], k = 0.3;
      c.globalAlpha = 0.75;
      c.drawImage(s.cv, p.x - s.ax * k, y - s.ay * k, s.w * k, s.h * k);
    }
    c.globalAlpha = 1;
    // La brume monte du fond : plus claire loin du bord.
    const o = r.origin;
    const fog = c.createLinearGradient(0, o.y - 300, 0, o.y + 700);
    fog.addColorStop(0, Renderer.rgba(fogc, 0.42)); fog.addColorStop(1, Renderer.rgba(fogc, 0.16));
    c.fillStyle = fog; c.fillRect(rect.x, rect.y, rect.w, rect.h);
    // Les feux, à travers la brume.
    c.save(); c.globalCompositeOperation = 'lighter';
    for (const [x, y] of feux) {
      const gl = c.createRadialGradient(x, y, 0, x, y, 9);
      gl.addColorStop(0, Renderer.rgba(P.glow, 0.5)); gl.addColorStop(1, Renderer.rgba(P.glow, 0));
      c.fillStyle = gl; c.fillRect(x - 9, y - 9, 18, 18);
      c.fillStyle = Renderer.rgba(P.lantern, 0.9); c.fillRect(x - 0.8, y - 0.8, 1.6, 1.6);
    }
    c.restore();
    // Au pied du bord, la roche plonge dans l'ombre.
    for (const A of this.arrieres) {
      const q = A.side === 'x' ? this.w(A.x - 0.9, A.y) : this.w(A.x, A.y - 0.9);
      const dx = q.x - A.a.x, dy = q.y - A.a.y;
      const gr = c.createLinearGradient(A.a.x, A.a.y, A.a.x + dx, A.a.y + dy);
      gr.addColorStop(0, 'rgba(6,8,18,0.6)'); gr.addColorStop(1, 'rgba(6,8,18,0)');
      c.fillStyle = gr;
      c.beginPath(); c.moveTo(A.a.x, A.a.y); c.lineTo(A.b.x, A.b.y); c.lineTo(A.b.x + dx, A.b.y + dy); c.lineTo(A.a.x + dx, A.a.y + dy); c.closePath(); c.fill();
    }
  }

  // Les faces qui tombent dans le vide. Terrasse : un mur de soutènement bas, en pierre de taille à
  // la ville (assises, joints, couvertine, filet d'or à Orsane), en roche ailleurs, posé sur son
  // ombre ; et l'escalier sous une sortie. Vallée : une lèvre de roche qui se perd dans la brume.
  paintMurs(c, rect) {
    const P = this.P, D = this.dz, ville = this.genre === 'ville' || this.genre === 'forge' || this.genre === 'souterrain';
    const vis = F => F.box.x1 > rect.x - 4 && F.box.x0 < rect.x + rect.w + 4 && F.box.y1 > rect.y - 4 && F.box.y0 < rect.y + rect.h + 4;
    if (this.chute === 'vallee') { this.paintLevres(c, rect, vis); return; }
    const S = ville ? (P.ground === 'ardoise' ? P.cobble : P.stone) : P.cliff;
    // l'ombre au pied des murs, sur le contrebas
    for (const F of this.murs) {
      if (!vis(F)) continue;
      const a = F.top[0], b = F.top[6];
      const gr = c.createLinearGradient(0, Math.min(a.y, b.y) + D, 0, Math.max(a.y, b.y) + D + 16);
      gr.addColorStop(0, 'rgba(4,6,14,0.6)'); gr.addColorStop(1, 'rgba(4,6,14,0)');
      c.fillStyle = gr;
      c.beginPath(); c.moveTo(a.x, a.y + D); c.lineTo(b.x, b.y + D); c.lineTo(b.x + (F.f.side === 'x' ? -10 : 10), b.y + D + 14); c.lineTo(a.x + (F.f.side === 'x' ? -10 : 10), a.y + D + 14); c.closePath(); c.fill();
    }
    const tex = ville ? null : Renderer.texture(P, 'falaise');
    for (const F of this.murs) {
      if (!vis(F)) continue;
      const a = F.top[0], b = F.top[6], side = F.f.side;
      const path = new Path2D();
      path.moveTo(a.x, a.y); path.lineTo(b.x, b.y); path.lineTo(b.x, b.y + D); path.lineTo(a.x, a.y + D); path.closePath();
      if (tex) {
        const pat = c.createPattern(tex, 'repeat');
        if (pat.setTransform && typeof DOMMatrix === 'function') pat.setTransform(new DOMMatrix([side === 'x' ? -0.5 : 0.5, 0.25, 0, 1, this.r.origin.x, this.r.origin.y]));
        c.fillStyle = pat; c.fill(path);
        c.fillStyle = side === 'x' ? 'rgba(3,5,14,0.42)' : 'rgba(140,170,255,0.06)'; c.fill(path);
      } else {
        // pierre de taille : la face +y au jour, la face +x à l'ombre
        const g = c.createLinearGradient(0, Math.min(a.y, b.y), 0, Math.max(a.y, b.y) + D);
        g.addColorStop(0, side === 'y' ? S[3] : S[2]); g.addColorStop(1, side === 'y' ? S[1] : S[0]);
        c.fillStyle = g; c.fill(path);
        c.save(); c.clip(path);
        c.strokeStyle = 'rgba(0,0,0,0.26)'; c.lineWidth = 1;
        for (let z = 9; z < D; z += 9) { c.beginPath(); c.moveTo(a.x, a.y + z); c.lineTo(b.x, b.y + z); c.stroke(); }
        const n = 4;
        for (let row = 0; row * 9 < D; row++) for (let k = 0; k < n; k++) {
          const t = (k + (row % 2 ? 0.5 : 0)) / n;
          if (t <= 0.02 || t >= 0.98) continue;
          const x = a.x + (b.x - a.x) * t, y = a.y + (b.y - a.y) * t + row * 9;
          c.beginPath(); c.moveTo(x, y); c.lineTo(x, y + 9); c.stroke();
        }
        c.restore();
        // couvertine claire et filet d'or (de fer à Kaldum)
        c.fillStyle = S[4]; c.beginPath(); c.moveTo(a.x, a.y); c.lineTo(b.x, b.y); c.lineTo(b.x, b.y + 3.5); c.lineTo(a.x, a.y + 3.5); c.closePath(); c.fill();
        c.strokeStyle = P.ground === 'ardoise' ? '#3a3640' : Renderer.rgba(P.vein[1], 0.9); c.lineWidth = 1.2;
        c.beginPath(); c.moveTo(a.x, a.y + 4.5); c.lineTo(b.x, b.y + 4.5); c.stroke();
      }
      c.strokeStyle = Renderer.rgba(P.ink, 0.7); c.lineWidth = 1.1;
      c.beginPath(); c.moveTo(a.x, a.y + D); c.lineTo(b.x, b.y + D); c.stroke();
    }
    this.paintEscaliers(c, rect, S);
  }

  // Sous une sortie au bord d'une terrasse, un escalier de pierre descend au contrebas, une marche
  // après l'autre ; on en voit les marches, les contremarches tournées vers nous et le flanc.
  paintEscaliers(c, rect, S) {
    const D = this.dz, P = this.P;
    for (const p of this.paths) {
      const e = p.escalier;
      if (!e) continue;
      const lat = e.dx ? [0, 1] : [1, 0];
      const o0 = [e.x + 0.5 + e.dx * 0.5, e.y + 0.5 + e.dy * 0.5];
      const at = (s, q, h) => { const w = this.w(o0[0] + e.dx * s + lat[0] * q, o0[1] + e.dy * s + lat[1] * q); return [w.x, w.y + D - h]; };
      const poly = (pts, fill) => { c.beginPath(); pts.forEach((q, k) => (k ? c.lineTo(q[0], q[1]) : c.moveTo(q[0], q[1]))); c.closePath(); c.fillStyle = fill; c.fill(); c.strokeStyle = Renderer.rgba(P.ink, 0.75); c.lineWidth = 1; c.stroke(); };
      const hw = 0.42, n = e.n, L = e.L;
      const front = e.dx > 0 || e.dy > 0;
      const order = [];
      for (let k = 0; k < n; k++) order.push(k);
      if (!front) order.reverse();
      for (const k of order) {
        const s0 = k * L / n, s1 = (k + 1) * L / n, h = D * (n - 1 - k) / n, hPrev = D * (n - k) / n;
        // le flanc tourné vers nous (côté + de l'axe latéral), jusqu'au contrebas
        poly([at(s0, hw, h), at(s1, hw, h), at(s1, hw, 0), at(s0, hw, 0)], S[1]);
        // la contremarche (seulement quand l'escalier descend vers nous)
        if (front) poly([at(s0, -hw, hPrev), at(s0, hw, hPrev), at(s0, hw, h), at(s0, -hw, h)], S[2]);
        // la marche
        poly([at(s0, -hw, h), at(s0, hw, h), at(s1, hw, h), at(s1, -hw, h)], S[3]);
        c.strokeStyle = Renderer.rgba(S[4], 0.6); c.lineWidth = 1;
        const q0 = at(s0, -hw, h), q1 = at(s0, hw, h);
        c.beginPath(); c.moveTo(q0[0], q0[1]); c.lineTo(q1[0], q1[1]); c.stroke();
      }
    }
  }

  // Le bord d'une corniche vers l'avant : une lèvre de roche courte, qui se perd dans la brume.
  paintLevres(c, rect, vis) {
    const P = this.P, tex = Renderer.texture(P, 'falaise');
    for (const F of this.murs) {
      if (!vis(F)) continue;
      const a = F.top[0], b = F.top[6], side = F.f.side, H = 46;
      const path = new Path2D();
      path.moveTo(a.x, a.y); path.lineTo(b.x, b.y); path.lineTo(b.x, b.y + H); path.lineTo(a.x, a.y + H); path.closePath();
      const pat = c.createPattern(tex, 'repeat');
      if (pat.setTransform && typeof DOMMatrix === 'function') pat.setTransform(new DOMMatrix([side === 'x' ? -0.5 : 0.5, 0.25, 0, 1, this.r.origin.x, this.r.origin.y]));
      c.fillStyle = pat; c.fill(path);
      const fogc = Renderer.mix(P.fog, (P.grass || P.leaves)[1], 0.45);
      const g = c.createLinearGradient(0, Math.min(a.y, b.y), 0, Math.max(a.y, b.y) + H);
      g.addColorStop(0, side === 'x' ? 'rgba(3,5,14,0.35)' : 'rgba(140,170,255,0.05)'); g.addColorStop(1, Renderer.rgba(fogc, 0.95));
      c.fillStyle = g; c.fill(path);
    }
  }

  // Le décor des alentours, trié en profondeur avec le décor cuit du plateau (`baked`) ; la lueur
  // d'une lanterne ou d'un cristal suit son sprite, ce qui est devant la cache.
  paintDecor(c, rect, baked) {
    const r = this.r, m = 40;
    const vis = it => it.box.x1 > rect.x - m && it.box.x0 < rect.x + rect.w + m && it.box.y1 > rect.y - m && it.box.y0 < rect.y + rect.h + m;
    const list = this.items.filter(vis);
    // Les ombres au pied, d'abord : elles restent sous tout le décor.
    const shadow = Renderer.prototype.softShadow;
    for (const it of list) {
      if (!it.spr || it.kind === 'lampe' || it.kind === 'petit') continue;
      const k = it.k || 1;
      if (it.kind === 'maison') { const F = it.spr.foot; shadow.call(r, c, it.x + 18, it.y + 6, (F.right - F.left) * 0.62, (F.bottom - F.top) * 0.22, 0.6); continue; }
      const foot = it.kind === 'arbre' ? 21 : it.kind === 'mur' ? 30 : it.kind === 'colonne' ? 14 : it.kind === 'rocher' ? 24 : 18;
      shadow.call(r, c, it.x + foot * k * 0.22, it.y + 2, foot * k * 1.15, foot * k * 0.55, it.kind === 'mur' ? 0.55 : 0.7);
    }
    // Les petites touches au sol.
    for (const it of list) if (it.kind === 'petit') { const s = it.spr, k = it.k || 1; c.drawImage(s.cv, it.x - s.ax * k, it.y - s.ay * k, s.w * k, s.h * k); }
    // Puis le reste, de l'arrière vers l'avant, avec le décor cuit du plateau ; chaque sprite rogné
    // à ce qu'il peint.
    const all = list.filter(it => it.kind !== 'petit');
    for (const d of baked) all.push({ baked: d, depth: d.x + d.y + 1, u: d.x + 0.5 });
    all.sort((a, b) => a.depth - b.depth || a.u - b.u);
    for (const it of all) {
      if (it.baked) { const d = it.baked, s = Entourage.rogne(d.spr); c.drawImage(s.cv, d.px - s.ax, d.py - s.ay, s.w, s.h); continue; }
      if (it.kind === 'etai') { this.paintEtai(c, it); continue; }
      if (it.kind === 'lichen') { this.paintLichen(c, it, 1); continue; }
      const s = Entourage.rogne(it.spr), k = it.k || 1;
      c.drawImage(s.cv, it.x - s.ax * k, it.y - s.ay * k, s.w * k, s.h * k);
      if (it.kind === 'lampe' || it.glow) this.paintGlow(c, it);
    }
  }

  // La lueur d'une lanterne (sa flaque au sol et son halo) ou d'un cristal.
  paintGlow(c, it) {
    const P = this.P, r = this.r;
    c.save();
    c.globalCompositeOperation = 'lighter';
    if (it.kind === 'lampe') {
      r.pool(c, it.x, it.y, 120, P.lantern, 0.3);
      const h = P.lamp === 'brasero' ? 28 : 45;
      const gl = c.createRadialGradient(it.x, it.y - h, 0, it.x, it.y - h, 26);
      gl.addColorStop(0, Renderer.rgba(P.glow, 0.55)); gl.addColorStop(1, Renderer.rgba(P.glow, 0));
      c.fillStyle = gl; c.fillRect(it.x - 26, it.y - h - 26, 52, 52);
    } else {
      const k = it.k || 1;
      const gl = c.createRadialGradient(it.x, it.y - 20 * k, 0, it.x, it.y - 20 * k, 40 * k);
      gl.addColorStop(0, Renderer.rgba(P.crystal[3], 0.3)); gl.addColorStop(1, Renderer.rgba(P.crystal[3], 0));
      c.fillStyle = gl; c.fillRect(it.x - 40 * k, it.y - 60 * k, 80 * k, 80 * k);
    }
    c.restore();
  }

  // Une tache de lichen : quelques plaques pâles, vert d'eau, et leur halo. `a` : l'intensité (moins
  // forte quand on la repasse par-dessus l'obscurité).
  paintLichen(c, it, a) {
    const rnd = Renderer.prng(it.seed || 1), x = it.x, y = it.y;
    c.save();
    c.globalCompositeOperation = 'lighter';
    const gl = c.createRadialGradient(x, y - 2, 0, x, y - 2, 26);
    gl.addColorStop(0, `rgba(110,230,190,${0.28 * a})`); gl.addColorStop(1, 'rgba(110,230,190,0)');
    c.fillStyle = gl; c.fillRect(x - 26, y - 28, 52, 52);
    for (let i = 0; i < 5; i++) {
      const dx = (rnd() - 0.5) * 16, dy = (rnd() - 0.5) * 7, rr = 1.4 + rnd() * 2.4;
      c.fillStyle = `rgba(170,255,215,${0.55 * a})`; c.beginPath(); c.ellipse(x + dx, y + dy - 2, rr, rr * 0.55, 0, 0, Math.PI * 2); c.fill();
    }
    c.restore();
  }

  // Un cadre d'étai : deux montants et un linteau de bois au-dessus du tunnel.
  paintEtai(c, it) {
    const P = this.P, [a, b] = it.pts, h = 44, B = P.bark;
    const post = (p, side) => {
      c.fillStyle = side ? B[1] : B[2]; c.strokeStyle = P.ink; c.lineWidth = 1.2;
      c.beginPath(); c.rect(p.x - 3, p.y - h, 6, h); c.fill(); c.stroke();
    };
    post(a, 0); post(b, 1);
    c.fillStyle = B[2]; c.strokeStyle = P.ink; c.lineWidth = 1.2;
    c.beginPath(); c.moveTo(a.x - 5, a.y - h - 1); c.lineTo(b.x + 5, b.y - h - 1); c.lineTo(b.x + 5, b.y - h + 6); c.lineTo(a.x - 5, a.y - h + 6); c.closePath(); c.fill(); c.stroke();
  }

  // Les taches et l'air (brume, ou le noir sous terre), puis le lointain qui s'assombrit au bord
  // du peint. La couche de l'air, une case par pixel, est agrandie d'un simple lissage bilinéaire :
  // elle est douce, et c'est bien moins cher.
  paintAir(c, rect) {
    const r = this.r, g = this.cellRange, o = r.origin;
    c.save();
    c.transform(Grid.TILE_W / 2, Grid.TILE_H / 2, -Grid.TILE_W / 2, Grid.TILE_H / 2, o.x + (g.x0 - g.y0) * Grid.TILE_W / 2, o.y - Grid.TILE_H / 2 + (g.x0 + g.y0) * Grid.TILE_H / 2);
    c.imageSmoothingEnabled = true;
    try { c.imageSmoothingQuality = 'low'; } catch (e) { /* ancien navigateur */ }
    c.drawImage(this.airCanvas, 0, 0);
    c.restore();
    // Au bord de ce qui est peint, le lointain s'assombrit (on ne le voit qu'au zoom le plus large).
    const E = r.alentours, edge = 140;
    if (!E) return;
    c.save();
    const far = this.farColor;
    for (const [x0, y0, x1, y1, rx, ry, rw, rh] of [
      [E.x, 0, E.x + edge, 0, E.x, E.y, edge, E.h], [E.x + E.w, 0, E.x + E.w - edge, 0, E.x + E.w - edge, E.y, edge, E.h],
      [0, E.y, 0, E.y + edge, E.x, E.y, E.w, edge], [0, E.y + E.h, 0, E.y + E.h - edge, E.x, E.y + E.h - edge, E.w, edge],
    ]) {
      if (rx > rect.x + rect.w || rx + rw < rect.x || ry > rect.y + rect.h || ry + rh < rect.y) continue;
      const gr = c.createLinearGradient(x0, y0, x1, y1);
      gr.addColorStop(0, Renderer.rgba(far, 0.55)); gr.addColorStop(1, Renderer.rgba(far, 0));
      c.fillStyle = gr; c.fillRect(rx, ry, rw, rh);
    }
    c.restore();
    // Sous terre, ce qui luit perce l'obscurité : la lave des rigoles, le lichen, les cristaux, les
    // lanternes des tunnels.
    if (this.genre === 'souterrain') this.paintLueurs(c, rect);
  }

  paintLueurs(c, rect) {
    const P = this.P, m = 60;
    c.save();
    c.globalCompositeOperation = 'lighter';
    for (const p of this.paths) {
      if (!p.lave || !p.rib) continue;
      const b = p.rib.box;
      if (b.x1 < rect.x - m || b.x0 > rect.x + rect.w + m || b.y1 < rect.y - m || b.y0 > rect.y + rect.h + m) continue;
      c.lineWidth = 14; c.strokeStyle = Renderer.rgba(P.lava[3], 0.16); c.stroke(p.rib.path);
      c.fillStyle = Renderer.rgba(P.lava[3], 0.55); c.fill(p.rib.path);
      c.lineWidth = 1.2; c.strokeStyle = Renderer.rgba(P.lava[5], 0.5); c.stroke(p.rib.edges);
    }
    for (const it of this.items) {
      if (!it.glow && it.kind !== 'lampe') continue;
      if (it.x < rect.x - m || it.x > rect.x + rect.w + m || it.y < rect.y - m || it.y > rect.y + rect.h + m) continue;
      if (it.kind === 'lichen') { this.paintLichen(c, it, 0.8); continue; }
      const col = it.kind === 'lampe' ? P.lantern : P.crystal[3], k = it.kind === 'lampe' ? 1 : (it.k || 1);
      const y = it.y - (it.kind === 'lampe' ? 40 : 22 * k), rr = (it.kind === 'lampe' ? 34 : 20) * k, fort = it.kind === 'lampe' ? 0.42 : 0.22;
      const gl = c.createRadialGradient(it.x, y, 0, it.x, y, rr);
      gl.addColorStop(0, Renderer.rgba(col, fort)); gl.addColorStop(0.35, Renderer.rgba(col, fort * 0.33)); gl.addColorStop(1, Renderer.rgba(col, 0));
      c.fillStyle = gl; c.fillRect(it.x - rr, y - rr, rr * 2, rr * 2);
    }
    c.restore();
  }

  // Le calque proche se fond dans le lointain sur ses bords (en pixels du calque) : on n'efface que
  // les quatre bandes du bord, le reste de la toile n'est pas touché.
  feather(cv, k) {
    const c = cv.getContext('2d'), w = cv.width, h = cv.height, e = Math.round(Renderer.FONDU * k);
    c.save();
    c.setTransform(1, 0, 0, 1, 0, 0);
    c.globalCompositeOperation = 'destination-out';
    for (const [x0, y0, x1, y1, rx, ry, rw, rh] of [[0, 0, e, 0, 0, 0, e, h], [w, 0, w - e, 0, w - e, 0, e, h], [0, 0, 0, e, 0, 0, w, e], [0, h, 0, h - e, 0, h - e, w, e]]) {
      const g = c.createLinearGradient(x0, y0, x1, y1);
      g.addColorStop(0, 'rgba(0,0,0,1)'); g.addColorStop(1, 'rgba(0,0,0,0)');
      c.fillStyle = g; c.fillRect(rx, ry, rw, rh);
    }
    c.restore();
  }
}
