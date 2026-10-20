// Écran d'accueil : la scène derrière le logo (planche de DA, « écran titre : logo héroïque,
// fond bleu nuit, atmosphère épique »). Étoiles, rayons de lumière, éclats de cristal et poussière
// d'or qui montent, et des éclairs cyan et violets qui jaillissent du cristal du V.
// Tout est dessiné sur une toile plein écran, derrière le contenu. S'arrête quand l'accueil est
// caché ; sans éclairs ni mouvement si le système demande moins d'animations. En mode `sobre`
// (les écrans de création, js/accueil.js), il ne reste qu'étoiles, poussière d'or et éclats.
// Le reflet animé de l'or utilise le logo comme masque CSS : il n'est actif qu'en ligne (un fichier
// ouvert en local refuse ce masque).
document.documentElement.classList.toggle('en-ligne', /^https?:/.test(location.protocol));

class TitreFx {
  // `canvas` : la toile du fond (derrière le logo) ; `avant` : celle des éclairs, devant le logo.
  constructor(canvas, host, avant) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.avant = avant || null;
    this.actx = avant ? avant.getContext('2d') : this.ctx;
    this.host = host;
    this.calme = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
    this.leger = (navigator.hardwareConcurrency || 4) <= 4 || Math.min(innerWidth, innerHeight) < 500;
    this.eclairs = [];
    this.flash = 0;
    this.prochain = performance.now() + 1400;
    this.loop = this.loop.bind(this);
    this.resize();
    addEventListener('resize', () => this.resize());
    this.lueurCyan = TitreFx.lueur('0,194,255');
    this.lueurOr = TitreFx.lueur('230,198,140');
    this.lueurViolet = TitreFx.lueur('166,108,255');
    this.start();
  }

  // Halo doux précalculé (dessiné en mode additif).
  static lueur(rgb) {
    const c = document.createElement('canvas');
    c.width = c.height = 64;
    const g = c.getContext('2d');
    const r = g.createRadialGradient(32, 32, 0, 32, 32, 32);
    r.addColorStop(0, `rgba(${rgb},0.9)`);
    r.addColorStop(0.25, `rgba(${rgb},0.35)`);
    r.addColorStop(1, `rgba(${rgb},0)`);
    g.fillStyle = r;
    g.fillRect(0, 0, 64, 64);
    return c;
  }

  resize() {
    this.dpr = Math.min(2, window.devicePixelRatio || 1);
    this.w = innerWidth;
    this.h = innerHeight;
    for (const c of [this.canvas, this.avant]) if (c) { c.width = Math.round(this.w * this.dpr); c.height = Math.round(this.h * this.dpr); }
    const n = this.leger ? 0.5 : 1;
    this.etoiles = Array.from({ length: Math.round(140 * n) }, () => ({ x: Math.random(), y: Math.random() * 0.75, r: Math.random() * 1.1 + 0.2, p: Math.random() * 6.28, v: 0.5 + Math.random() * 1.5 }));
    this.eclats = Array.from({ length: Math.round(34 * n) }, () => this.nouvelEclat(true));
    this.poussiere = Array.from({ length: Math.round(50 * n) }, () => this.nouvellePoussiere(true));
  }

  nouvelEclat(partout) {
    const violet = Math.random() < 0.22;
    return {
      x: Math.random() * this.w, y: partout ? Math.random() * this.h : this.h + 20,
      vx: (Math.random() - 0.5) * 8, vy: -(6 + Math.random() * 16),
      s: 2.5 + Math.random() * (Math.random() < 0.15 ? 9 : 4.5), a: Math.random() * 6.28, va: (Math.random() - 0.5) * 1.2,
      p: Math.random() * 6.28, violet,
      forme: [0.9 + Math.random() * 0.3, 0.45 + Math.random() * 0.3, 1.2 + Math.random() * 0.5, 0.4 + Math.random() * 0.3],
    };
  }

  nouvellePoussiere(partout) {
    return { x: Math.random() * this.w, y: partout ? Math.random() * this.h : this.h + 10, vy: -(4 + Math.random() * 10), vx: (Math.random() - 0.5) * 4, r: 0.6 + Math.random() * 1.6, p: Math.random() * 6.28 };
  }

  start() {
    if (this.running) return;
    this.running = true;
    this.last = performance.now();
    requestAnimationFrame(this.loop);
  }

  stop() { this.running = false; }

  loop(now) {
    if (!this.running) return;
    const dt = Math.min(0.05, (now - this.last) / 1000);
    this.last = now;
    if (!document.hidden && !this.host.classList.contains('hidden')) {
      this.update(dt, now);
      this.draw(now);
    }
    requestAnimationFrame(this.loop);
  }

  // Le cristal du V, en coordonnées de l'écran : d'où partent les éclairs.
  cristal() {
    const img = this.host.querySelector('.titre-logo__image img');
    if (!img) return { x: this.w * 0.3, y: this.h * 0.2, w: 200, h: 80 };
    const r = img.getBoundingClientRect();
    return { x: r.left + r.width * 0.2, y: r.top + r.height * 0.42, w: r.width, h: r.height, left: r.left, top: r.top };
  }

  update(dt, now) {
    if (this.calme) return;
    for (const e of this.eclats) {
      e.x += e.vx * dt; e.y += e.vy * dt; e.a += e.va * dt;
      if (e.y < -30) Object.assign(e, this.nouvelEclat(false));
    }
    for (const p of this.poussiere) {
      p.x += (p.vx + Math.sin(now / 1300 + p.p) * 3) * dt; p.y += p.vy * dt;
      if (p.y < -10) Object.assign(p, this.nouvellePoussiere(false));
    }
    if (now > this.prochain && !this.sobre) {
      this.frapper();
      if (Math.random() < 0.3) setTimeout(() => this.frapper(), 140 + Math.random() * 120);
      this.prochain = now + 3200 + Math.random() * 4200;
    }
    for (const b of this.eclairs) b.vie -= dt;
    this.eclairs = this.eclairs.filter(b => b.vie > 0);
    this.flash = Math.max(0, this.flash - dt * 3.2);
  }

  // Un éclair : du cristal vers le ciel, vers un bras du V, ou au loin.
  frapper() {
    const c = this.cristal();
    const choix = Math.random();
    let a, b;
    if (choix < 0.45) {
      a = { x: c.x, y: c.y };
      const ang = -Math.PI / 2 + (Math.random() - 0.5) * 2.2;
      const d = 140 + Math.random() * 260;
      b = { x: a.x + Math.cos(ang) * d, y: a.y + Math.sin(ang) * d };
    } else if (choix < 0.75 && c.left != null) {
      a = { x: c.x - c.w * 0.05, y: c.y + c.h * 0.15 };
      b = { x: c.left + c.w * (Math.random() < 0.5 ? 0.06 : 0.36), y: c.top + c.h * (0.08 + Math.random() * 0.1) };
    } else {
      a = { x: Math.random() * this.w, y: -10 };
      b = { x: a.x + (Math.random() - 0.5) * 260, y: this.h * (0.18 + Math.random() * 0.25) };
    }
    const principal = TitreFx.zigzag(a, b, 6);
    const branches = [];
    for (let i = 0; i < 3 + Math.floor(Math.random() * 4); i++) {
      const o = principal[2 + Math.floor(Math.random() * (principal.length - 4))];
      const ang = Math.atan2(b.y - a.y, b.x - a.x) + (Math.random() - 0.5) * 1.6;
      const d = 30 + Math.random() * 90;
      branches.push(TitreFx.zigzag(o, { x: o.x + Math.cos(ang) * d, y: o.y + Math.sin(ang) * d }, 4));
    }
    this.eclairs.push({ principal, branches, vie: 0.45, max: 0.45, violet: Math.random() < 0.35 });
    this.flash = Math.min(1, this.flash + 0.7);
    const logo = this.host.querySelector('.titre-logo');
    if (logo) { logo.classList.remove('eclair'); void logo.offsetWidth; logo.classList.add('eclair'); }
  }

  // Ligne brisée par déplacement du milieu : plus fine à chaque niveau.
  static zigzag(a, b, niveaux) {
    let pts = [a, b];
    let amp = Math.hypot(b.x - a.x, b.y - a.y) * 0.22;
    for (let n = 0; n < niveaux; n++) {
      const out = [pts[0]];
      for (let i = 0; i < pts.length - 1; i++) {
        const p = pts[i], q = pts[i + 1];
        const dx = q.x - p.x, dy = q.y - p.y, l = Math.hypot(dx, dy) || 1;
        const off = (Math.random() - 0.5) * amp;
        out.push({ x: (p.x + q.x) / 2 - dy / l * off, y: (p.y + q.y) / 2 + dx / l * off }, q);
      }
      pts = out;
      amp /= 2;
    }
    return pts;
  }

  draw(now) {
    const g = this.ctx, w = this.w, h = this.h;
    g.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    g.clearRect(0, 0, w, h);
    const c = this.cristal();

    // Étoiles
    g.globalCompositeOperation = 'lighter';
    for (const s of this.etoiles) {
      const a = 0.25 + 0.35 * (0.5 + 0.5 * Math.sin(now / 1000 * s.v + s.p));
      g.fillStyle = `rgba(200,225,255,${this.calme ? 0.4 : a})`;
      g.fillRect(s.x * w, s.y * h, s.r, s.r);
    }

    // Rayons de lumière derrière le logo
    for (let i = 0; i < (this.sobre ? 0 : 4); i++) {
      const sw = this.calme ? 0 : Math.sin(now / 5200 + i * 1.7) * 0.05;
      const ang = -0.38 + i * 0.25 + sw;
      g.save();
      g.translate(c.x + (c.w || 0) * 0.3, -40);
      g.rotate(ang);
      const lg = g.createLinearGradient(0, 0, 0, h * 0.9);
      lg.addColorStop(0, 'rgba(120,210,255,0.10)');
      lg.addColorStop(0.5, 'rgba(120,210,255,0.035)');
      lg.addColorStop(1, 'rgba(120,210,255,0)');
      g.fillStyle = lg;
      g.beginPath();
      g.moveTo(-6, 0); g.lineTo(6, 0); g.lineTo(60 + i * 14, h * 0.9); g.lineTo(-60 - i * 14, h * 0.9);
      g.fill();
      g.restore();
    }

    // Halo du cristal, qui respire
    const pulse = 0.75 + 0.25 * Math.sin(now / 900) + this.flash * 0.8;
    const R = (c.w || 400) * 0.42 * pulse;
    if (!this.sobre) {
      g.globalAlpha = 0.55;
      g.drawImage(this.lueurCyan, c.x - R, c.y - R, R * 2, R * 2);
      g.globalAlpha = 0.25;
      g.drawImage(this.lueurViolet, c.x - R * 0.6, c.y - R * 0.2, R * 1.4, R * 1.4);
      g.globalAlpha = 1;
    }

    // Poussière d'or
    for (const p of this.poussiere) {
      const a = 0.35 + 0.35 * Math.sin(now / 700 + p.p);
      const r = p.r * 5;
      g.globalAlpha = Math.max(0, a);
      g.drawImage(this.lueurOr, p.x - r, p.y - r, r * 2, r * 2);
    }
    g.globalAlpha = 1;

    // Éclats de cristal : facettes en losange étiré, face claire et face sombre
    g.globalCompositeOperation = 'source-over';
    for (const e of this.eclats) {
      const tw = 0.55 + 0.45 * Math.sin(now / 600 + e.p);
      g.save();
      g.translate(e.x, e.y);
      g.rotate(e.a);
      const s = e.s, f = e.forme;
      const clair = e.violet ? 'rgba(214,180,255,' : 'rgba(150,232,255,';
      const sombre = e.violet ? 'rgba(110,60,200,' : 'rgba(0,120,210,';
      g.fillStyle = sombre + (0.75 * tw) + ')';
      g.beginPath(); g.moveTo(0, -s * f[2]); g.lineTo(s * f[0], 0); g.lineTo(0, s * f[3] * 2); g.lineTo(-s * f[1], 0); g.closePath(); g.fill();
      g.fillStyle = clair + (0.9 * tw) + ')';
      g.beginPath(); g.moveTo(0, -s * f[2]); g.lineTo(s * f[0], 0); g.lineTo(0, 0); g.closePath(); g.fill();
      g.restore();
      if (s > 5) {
        g.globalCompositeOperation = 'lighter';
        g.globalAlpha = 0.35 * tw;
        g.drawImage(e.violet ? this.lueurViolet : this.lueurCyan, e.x - s * 3, e.y - s * 3, s * 6, s * 6);
        g.globalAlpha = 1;
        g.globalCompositeOperation = 'source-over';
      }
    }

    g.globalCompositeOperation = 'source-over';
    this.dessinerEclairs();
  }

  // Éclairs et lueur du ciel, sur la toile de devant : ils passent par-dessus le V.
  dessinerEclairs() {
    const g = this.actx, w = this.w, h = this.h;
    if (this.avant) { g.setTransform(this.dpr, 0, 0, this.dpr, 0, 0); g.clearRect(0, 0, w, h); }
    g.globalCompositeOperation = 'lighter';
    g.lineCap = 'round';
    g.lineJoin = 'round';
    for (const b of this.eclairs) {
      const t = b.vie / b.max;
      // Deux ou trois reprises, comme un vrai éclair qui scintille
      const reprise = t > 0.75 || (t > 0.4 && t < 0.55) || Math.random() < 0.25 ? 1 : 0.35;
      const scint = Math.min(1, t * 1.4) * reprise;
      const coeur = b.violet ? '235,220,255' : '225,248,255';
      const halo = b.violet ? '166,108,255' : '0,194,255';
      const trait = (pts, k) => {
        g.beginPath();
        g.moveTo(pts[0].x, pts[0].y);
        for (let i = 1; i < pts.length; i++) g.lineTo(pts[i].x, pts[i].y);
        g.strokeStyle = `rgba(${halo},${0.14 * scint})`; g.lineWidth = 18 * k; g.stroke();
        g.strokeStyle = `rgba(${halo},${0.4 * scint})`; g.lineWidth = 7 * k; g.stroke();
        g.strokeStyle = `rgba(${coeur},${scint})`; g.lineWidth = 2.4 * k; g.stroke();
      };
      trait(b.principal, 1);
      for (const br of b.branches) trait(br, 0.6);
      const o = b.principal[0], f = b.principal[b.principal.length - 1];
      g.globalAlpha = 0.9 * scint;
      g.drawImage(this.lueurCyan, o.x - 80, o.y - 80, 160, 160);
      g.globalAlpha = 0.6 * scint;
      g.drawImage(b.violet ? this.lueurViolet : this.lueurCyan, f.x - 40, f.y - 40, 80, 80);
      g.globalAlpha = 1;
    }

    // Lueur brève de tout le ciel
    if (this.flash > 0) {
      g.fillStyle = `rgba(110,190,255,${0.06 * this.flash})`;
      g.fillRect(0, 0, w, h);
    }
    g.globalCompositeOperation = 'source-over';
  }
}
