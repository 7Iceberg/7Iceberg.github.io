const ModeleGelee = (() => {
  const TAU = Math.PI * 2, RAD = Math.PI / 180;


  const COTES = {
    hauteur: 19.1,
    profil: [
      [0, 0.3], [5, 0.24], [9, 0.2], [10.4, 0.3], [11.0, 0.66], [11.25, 1.2], [11.1, 1.9], [10.6, 2.6],
      [10.15, 3.4], [9.9, 4.4], [9.75, 5.6], [9.6, 6.8], [9.4, 8.0], [9.15, 9.4], [8.85, 10.8],
      [8.45, 12.2], [7.95, 13.5], [7.3, 14.8], [6.45, 16.0], [5.35, 17.1], [4.0, 18.0], [2.6, 18.65],
      [1.25, 19.0], [0, 19.1],
    ],
    penche: { x: 1.7, z: -2.6, puissance: 2.4 },
    yeux: { azimut: 25, y: 11.1, bille: 1.5, sortie: -0.25, anneau: 1.52, bourrelet: 0.34, paupiere: 1.62, ouverture: 66, tombe: 19 },
    coeur: { bas: 3.8, haut: 13.6, rayon: 3.3, avance: 2.0 },
  };

  const NIVEAUX = {
    planche: { u: 240, v: 150, seg: 40, tex: 2048, refraction: true, fil: 10, point: 6, gouttes: 26, vague: 1 },
    bureau: { u: 128, v: 72, seg: 20, tex: 1024, refraction: true, fil: 6, point: 4, gouttes: 18, vague: 0.6 },
    jeu: { u: 80, v: 44, seg: 16, tex: 512, refraction: false, fil: 4, point: 3, pas: 2, gouttes: 12, vague: 0.5, lisible: 1 },
    telephone: { u: 56, v: 28, seg: 14, tex: 256, refraction: false, fil: 3, point: 3, pas: 2, gouttes: 8, vague: 0.35, lisible: 1 },
  };

  const COULEURS = {
    gelee: '#7cb8bd', geleeClaire: '#9fd1d3', geleeSombre: '#5f9ea6', attenuation: '#2f8d98',
    cicatrice: '#3a7780', fissure: '#2a5b63',
    or: '#d08a0a', orClair: '#ffd35a', orSombre: '#6a4306',
    coeur: '#262d32', bille: '#030405', paupiere: '#2c343a',
    vague: '#8fd2d3', ecume: '#e6faf6', bulle: '#d6f7fa', lueur: '#5fc9cc',
    fil: '#a7772d', fer: '#9ea7ae',
  };


  function catmull(pts, n) {
    const out = [];
    for (let i = 0; i < pts.length - 1; i++) {
      const p0 = pts[Math.max(0, i - 1)], p1 = pts[i], p2 = pts[i + 1], p3 = pts[Math.min(pts.length - 1, i + 2)];
      for (let k = 0; k < n; k++) {
        const t = k / n, t2 = t * t, t3 = t2 * t;
        out.push([0, 1].map(j => 0.5 * ((2 * p1[j]) + (-p0[j] + p2[j]) * t + (2 * p0[j] - 5 * p1[j] + 4 * p2[j] - p3[j]) * t2 + (-p0[j] + 3 * p1[j] - 3 * p2[j] + p3[j]) * t3)));
      }
    }
    out.push(pts[pts.length - 1].slice());
    return out;
  }
  function reechantillonner(pts, n) {
    const L = [0];
    for (let i = 1; i < pts.length; i++) L.push(L[i - 1] + Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]));
    const tot = L[L.length - 1], out = [];
    let j = 0;
    for (let k = 0; k <= n; k++) {
      const s = tot * k / n;
      while (j < L.length - 2 && L[j + 1] < s) j++;
      const f = (s - L[j]) / Math.max(1e-9, L[j + 1] - L[j]);
      out.push([pts[j][0] + (pts[j + 1][0] - pts[j][0]) * f, pts[j][1] + (pts[j + 1][1] - pts[j][1]) * f, s / tot]);
    }
    return out;
  }
  const PROFIL_FIN = reechantillonner(catmull(COTES.profil, 12), 2400);
  const FLANC = PROFIL_FIN.filter(p => p[1] >= 3.4 && p[0] > 0.01);
  function rayonA(y) {
    for (let i = 0; i < FLANC.length - 1; i++) {
      const a = FLANC[i], b = FLANC[i + 1];
      if (y >= a[1] && y <= b[1]) { const f = (y - a[1]) / Math.max(1e-9, b[1] - a[1]); return [a[0] + (b[0] - a[0]) * f, a[2] + (b[2] - a[2]) * f]; }
    }
    return y < FLANC[0][1] ? [FLANC[0][0], FLANC[0][2]] : [0, 1];
  }
  const vDe = y => rayonA(y)[1];
  const uDe = thDeg => (((thDeg + 180) / 360) % 1 + 1) % 1;

  function lobe(th) {
    const c = Math.cos(7 * th + 0.45), forme = c > 0 ? Math.pow(c, 0.6) : -Math.pow(-c, 1.5);
    return forme * (1 + 0.3 * Math.sin(2 * th + 1.0)) + 0.9 * Math.pow(Math.max(0, -Math.cos(2 * th)), 3);
  }
  const poidsLobe = y => { const t = Math.min(1, Math.max(0, y / 5)); return 1 - t * t * (3 - 2 * t); };
  const poidsCoulure = y => { const t = Math.min(1, Math.max(0, y / 3)); return (1 - t) * (1 - t); };
  function coulure(th) { return Math.max(0, Math.cos(7 * th + 0.45)) * (0.7 + 0.3 * Math.cos(3 * th + 1.7)) + 0.6 * Math.pow(Math.max(0, -Math.cos(2 * th)), 4); }
  const organique = (th, y) => 0.016 * Math.sin(3 * th + y * 0.45) + 0.01 * Math.sin(5 * th - y * 0.7 + 1.3) + 0.006 * Math.sin(9 * th + y * 1.3);
  function pencher(p) {
    const P = COTES.penche, t = Math.pow(Math.max(0, Math.min(1, p[1] / COTES.hauteur)), P.puissance);
    return [p[0] + P.x * t, p[1], p[2] + P.z * t];
  }
  function orbites(r, y, th) {
    const Y = COTES.yeux;
    let dk = 0;
    for (const s of [-1, 1]) {
      const dx = (th - s * Y.azimut * RAD) * Math.max(1, r), dy = y - Y.y, d = Math.hypot(dx, dy);
      if (d > 4) continue;
      const trou = 1 - Math.min(1, Math.max(0, (d - 1.25) / 0.45)), haut = Math.max(0, Math.min(1, dy / 2.2));
      dk += -0.5 * trou * trou * (3 - 2 * trou) + (0.12 + 0.36 * haut) * Math.exp(-(((d - 2.0) / 0.55) ** 2));
    }
    return dk;
  }
  function surface(r, y, th, creuser) {
    const k = r * (1 + 0.075 * poidsLobe(y) * lobe(th) + organique(th, y)) + 1.15 * poidsCoulure(y) * coulure(th) + (creuser ? orbites(r, y, th) : 0);
    return pencher([k * Math.sin(th), y, k * Math.cos(th)]);
  }
  function pointGelee(thDeg, y, dehors) {
    const th = thDeg * RAD, r = rayonA(y)[0], p = surface(r, y, th);
    const e = 0.04, py = surface(rayonA(y + e)[0], y + e, th), pt = surface(r, y, th + e / Math.max(1, r));
    const tv = [py[0] - p[0], py[1] - p[1], py[2] - p[2]], tu = [pt[0] - p[0], pt[1] - p[1], pt[2] - p[2]];
    let n = [tv[1] * tu[2] - tv[2] * tu[1], tv[2] * tu[0] - tv[0] * tu[2], tv[0] * tu[1] - tv[1] * tu[0]];
    const ln = Math.hypot(...n); n = n.map(x => x / ln);
    const c = pencher([0, y, 0]);
    if (n[0] * (p[0] - c[0]) + n[2] * (p[2] - c[2]) < 0) n = n.map(x => -x);
    const d = dehors || 0;
    return { p: [p[0] + n[0] * d, p[1] + n[1] * d, p[2] + n[2] * d], n };
  }


  function Brut() { return { p: [], n: [], uv: [], idx: [] }; }
  function enGeo(THREE, b) {
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(b.p, 3));
    if (b.n.length) g.setAttribute('normal', new THREE.Float32BufferAttribute(b.n, 3));
    if (b.uv.length) g.setAttribute('uv', new THREE.Float32BufferAttribute(b.uv, 2));
    if (b.couleurs) g.setAttribute('color', new THREE.Float32BufferAttribute(b.couleurs, 3));
    g.setIndex(b.idx);
    if (!b.n.length) g.computeVertexNormals();
    if (b.poles) {
      const n = g.attributes.normal.array, { U, rangs } = b.poles;
      for (const j of [0, rangs - 1]) {
        let m = [0, 0, 0];
        for (let i = 0; i < U; i++) for (let k = 0; k < 3; k++) m[k] += n[(j * U + i) * 3 + k];
        const l = Math.hypot(...m) || 1; m = m.map(x => x / l);
        for (let i = 0; i < U; i++) for (let k = 0; k < 3; k++) n[(j * U + i) * 3 + k] = m[k];
      }
    }
    if (b.soudure) {
      const n = g.attributes.normal.array, { U, rangs } = b.soudure;
      for (let j = 0; j < rangs; j++) {
        const a = j * U * 3, c = (j * U + U - 1) * 3;
        let m = [0, 1, 2].map(k => (n[a + k] + n[c + k]) / 2); const l = Math.hypot(...m) || 1; m = m.map(x => x / l);
        for (let k = 0; k < 3; k++) n[a + k] = n[c + k] = m[k];
      }
    }
    g.computeBoundingSphere();
    return g;
  }
  function sphere(b, c, ax, ay, az, seg, rangs, repere, phiMax) {
    const base = b.p.length / 3, [X, Y, Z] = repere || [[1, 0, 0], [0, 1, 0], [0, 0, 1]], pm = phiMax || Math.PI;
    seg = Math.round(seg); rangs = Math.max(2, Math.round(rangs));
    for (let j = 0; j <= rangs; j++) {
      const ph = pm * j / rangs, sy = Math.cos(ph), sr = Math.sin(ph);
      for (let i = 0; i <= seg; i++) {
        const th = TAU * i / seg, lx = sr * Math.cos(th) * ax, ly = sy * ay, lz = sr * Math.sin(th) * az;
        let nx = sr * Math.cos(th) / ax, ny = sy / ay, nz = sr * Math.sin(th) / az; const ln = Math.hypot(nx, ny, nz) || 1; nx /= ln; ny /= ln; nz /= ln;
        b.p.push(c[0] + X[0] * lx + Y[0] * ly + Z[0] * lz, c[1] + X[1] * lx + Y[1] * ly + Z[1] * lz, c[2] + X[2] * lx + Y[2] * ly + Z[2] * lz);
        b.n.push(X[0] * nx + Y[0] * ny + Z[0] * nz, X[1] * nx + Y[1] * ny + Z[1] * nz, X[2] * nx + Y[2] * ny + Z[2] * nz);
        b.uv.push(i / seg, j / rangs);
      }
    }
    for (let j = 0; j < rangs; j++) for (let i = 0; i < seg; i++) {
      const a = base + j * (seg + 1) + i, d = a + seg + 1;
      b.idx.push(a, a + 1, d, a + 1, d + 1, d);
    }
  }
  function tore(b, c, R, r, seg, segT, repere, ecrase, epais) {
    const base = b.p.length / 3, [X, Y, Z] = repere, k = ecrase || 1;
    seg = Math.round(seg); segT = Math.round(segT);
    for (let j = 0; j <= segT; j++) {
      const ph = TAU * j / segT, cp = Math.cos(ph), sp = Math.sin(ph);
      for (let i = 0; i <= seg; i++) {
        const th = TAU * i / seg, ct = Math.cos(th), st = Math.sin(th);
        const re = r * (epais ? epais(th) : 1), lx = (R + re * cp) * ct, ly = (R + re * cp) * st, lz = re * sp * k;
        let n = [cp * ct, cp * st, sp / k]; const l = Math.hypot(...n); n = n.map(x => x / l);
        b.p.push(c[0] + X[0] * lx + Y[0] * ly + Z[0] * lz, c[1] + X[1] * lx + Y[1] * ly + Z[1] * lz, c[2] + X[2] * lx + Y[2] * ly + Z[2] * lz);
        b.n.push(X[0] * n[0] + Y[0] * n[1] + Z[0] * n[2], X[1] * n[0] + Y[1] * n[1] + Z[1] * n[2], X[2] * n[0] + Y[2] * n[1] + Z[2] * n[2]);
        b.uv.push(i / seg, j / segT);
      }
    }
    for (let j = 0; j < segT; j++) for (let i = 0; i < seg; i++) {
      const a = base + j * (seg + 1) + i, d = a + seg + 1;
      b.idx.push(a, a + 1, d, a + 1, d + 1, d);
    }
  }
  function tube(b, pts, rayon, seg, bouts) {
    const base = b.p.length / 3, n = pts.length;
    seg = Math.round(seg);
    for (let k = 0; k < n; k++) {
      const p = pts[k], q = pts[Math.min(n - 1, k + 1)], o = pts[Math.max(0, k - 1)];
      let t = [q[0] - o[0], q[1] - o[1], q[2] - o[2]]; const lt = Math.hypot(...t) || 1; t = t.map(x => x / lt);
      const a = Math.abs(t[1]) < 0.9 ? [0, 1, 0] : [1, 0, 0];
      let u = [t[1] * a[2] - t[2] * a[1], t[2] * a[0] - t[0] * a[2], t[0] * a[1] - t[1] * a[0]]; const lu = Math.hypot(...u); u = u.map(x => x / lu);
      const w = [t[1] * u[2] - t[2] * u[1], t[2] * u[0] - t[0] * u[2], t[0] * u[1] - t[1] * u[0]];
      const f = bouts && (k === 0 || k === n - 1) ? 0.35 : 1, rr = (typeof rayon === 'function' ? rayon(k / (n - 1)) : rayon) * f;
      for (let i = 0; i <= seg; i++) {
        const th = TAU * i / seg, nn = [u[0] * Math.cos(th) + w[0] * Math.sin(th), u[1] * Math.cos(th) + w[1] * Math.sin(th), u[2] * Math.cos(th) + w[2] * Math.sin(th)];
        b.p.push(p[0] + nn[0] * rr, p[1] + nn[1] * rr, p[2] + nn[2] * rr); b.n.push(...nn); b.uv.push(i / seg, k / (n - 1));
      }
    }
    for (let k = 0; k < n - 1; k++) for (let i = 0; i < seg; i++) {
      const a = base + k * (seg + 1) + i, d = a + seg + 1;
      b.idx.push(a, a + 1, d, a + 1, d + 1, d);
    }
  }
  function graine(n) { let s = n >>> 0; return () => { s = (s + 0x6d2b79f5) >>> 0; let t = s; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }


  function construireCorps(niv) {
    const b = Brut(), U = niv.u, fin = PROFIL_FIN, i0 = fin.findIndex(q => q[0] >= 10.4);
    const prof = [fin[0], fin[Math.round(i0 * 0.5)], fin[i0]];
    for (let k = 1; k <= niv.v; k++) prof.push(fin[Math.round(i0 + (fin.length - 1 - i0) * k / niv.v)]);
    for (const [r, y, v] of prof) for (let i = 0; i <= U; i++) {
      const th = (-180 + 360 * i / U) * RAD, p = surface(r, y, th, true);
      b.p.push(p[0], p[1], p[2]); b.uv.push(i / U, v);
    }
    for (let j = 0; j < prof.length - 1; j++) for (let i = 0; i < U; i++) {
      const a = j * (U + 1) + i, c = a + 1, d = a + U + 1, e = d + 1;
      b.idx.push(a, c, d, c, e, d);
    }
    b.soudure = { U: U + 1, rangs: prof.length }; b.poles = b.soudure;
    return b;
  }

  function construireCoeur(niv) {
    const b = Brut(), C = COTES.coeur, seg = niv.seg, rangs = Math.round(niv.seg * 0.9);
    for (let j = 0; j <= rangs; j++) {
      const t = j / rangs, y = C.bas + (C.haut - C.bas) * t;
      const r = t < 0.42 ? C.rayon * Math.sqrt(Math.max(0, 1 - ((0.42 - t) / 0.42) ** 2)) : C.rayon * Math.pow(Math.max(0, Math.cos((t - 0.42) / 0.58 * Math.PI / 2)), 1.35);
      for (let i = 0; i <= seg; i++) {
        const th = TAU * i / seg, p = pencher([r * Math.sin(th), y, r * Math.cos(th) * 0.92 + C.avance]);
        b.p.push(...p); b.uv.push(i / seg, t);
      }
    }
    for (let j = 0; j < rangs; j++) for (let i = 0; i < seg; i++) {
      const a = j * (seg + 1) + i, d = a + seg + 1;
      b.idx.push(a, a + 1, d, a + 1, d + 1, d);
    }
    return b;
  }

  function repereOeil(s) {
    const Y = COTES.yeux, g = pointGelee(s * Y.azimut, Y.y, 0);
    let d = [g.n[0] * 0.6, g.n[1] * 0.6 + 0.02, g.n[2] * 0.6 + 0.42]; const ld = Math.hypot(...d); d = d.map(x => x / ld);
    let x = [d[2], 0, -d[0]]; const lx = Math.hypot(...x); x = x.map(v => v / lx);
    const y = [d[1] * x[2] - d[2] * x[1], d[2] * x[0] - d[0] * x[2], d[0] * x[1] - d[1] * x[0]];
    return { o: g.p, x, y, z: d };
  }

  const CRETES = [{ q: 0.88, h: 1.7, ph: 0.4 }, { q: 0.6, h: 1.15, ph: 1.9 }, { q: 0.32, h: 0.75, ph: 3.1 }];
  function construireVague(niv) {
    const nappe = Brut(), ecume = Brut(), bulles = Brut(), d = niv.vague || 1;
    const S = Math.max(24, Math.round(110 * d)), Q = Math.max(10, Math.round(46 * d)), M = Math.max(3, Math.round(8 * d));
    const base = s => 4.9 + 2.9 * s * s;
    const crete = (q, s, c) => { const dq = q - c.q, a = c.h * (0.72 + 0.28 * Math.sin(s * 5.0 + c.ph)) * (1 - 0.35 * s * s); return a * Math.exp(-((dq / (dq > 0 ? 0.045 : 0.17)) ** 2)); };
    const dessus = (s, q) => { let h = base(s), e = 0; for (const c of CRETES) { const v = crete(q, s, c); h += v; e = Math.max(e, v / c.h); } return [h, e]; };
    const rayonVague = (s, y) => rayonA(Math.max(3.4, y))[0];
    const pos = (s, q, y) => { const th = s * 104 * RAD, R0 = rayonVague(s, y), rho = R0 * (0.36 + 0.5 * q); return pencher([rho * Math.sin(th), y, rho * Math.cos(th)]); };
    const coul = [];
    const eau = [0.30, 0.62, 0.66], ecu = [1.0, 1.0, 1.0], fond = [0.16, 0.42, 0.47];
    const melange = (a, b, t) => a.map((x, i) => x + (b[i] - x) * t);
    for (let j = 0; j <= Q + M; j++) for (let i = 0; i <= S; i++) {
      const s = -1 + 2 * i / S;
      let p, c;
      if (j <= Q) {
        const q = j / Q, [h, e] = dessus(s, q);
        p = pos(s, q, h); c = melange(melange(fond, eau, 0.3 + 0.7 * Math.sqrt(e)), ecu, Math.min(1, Math.pow(e, 1.6) * 1.35));
      } else {
        const t = (j - Q) / M, [h] = dessus(s, 1), y = h + (3.7 - h) * t;
        p = pos(s, 1 + 0.06 * Math.sin(Math.PI * t), y); c = melange(eau, fond, t);
      }
      nappe.p.push(...p); nappe.uv.push(i / S, j / (Q + M)); coul.push(...c);
    }
    for (let j = 0; j < Q + M; j++) for (let i = 0; i < S; i++) {
      const a = j * (S + 1) + i, e = a + S + 1;
      nappe.idx.push(a, e, a + 1, a + 1, e, e + 1);
    }
    nappe.couleurs = coul;
    const levre = [], creux = [];
    for (let i = 0; i <= S; i++) {
      const s = -0.82 + 1.64 * i / S, c = CRETES[0], [h] = dessus(s, c.q);
      levre.push(pos(s, c.q + 0.05, h - 0.12)); creux.push(pos(s, c.q + 0.03, h - 0.55));
    }
    const fil = Math.max(6, Math.round(niv.seg / 3));
    tube(ecume, levre, t => 0.3 * Math.pow(Math.sin(Math.PI * t), 0.6) * (0.75 + 0.25 * Math.sin(t * 23)) + 0.04, fil, true);
    const creuxB = Brut(); tube(creuxB, creux, t => 0.22 * Math.pow(Math.sin(Math.PI * t), 0.6) + 0.03, fil, true);
    for (const [c, ep] of [[CRETES[1], 0.12], [CRETES[2], 0.085]]) {
      const pts = [];
      for (let i = 0; i <= S; i++) { const s = -0.86 + 1.72 * i / S, [h] = dessus(s, c.q); pts.push(pos(s, c.q + 0.012, h + 0.04)); }
      tube(ecume, pts, t => ep * Math.pow(Math.sin(Math.PI * t), 0.5) * (0.7 + 0.3 * Math.sin(t * 31 + c.ph)) + 0.02, Math.max(4, fil - 2), true);
    }
    for (const s0 of [-0.62, -0.31, 0.02, 0.33, 0.6]) {
      const c = CRETES[0], [h] = dessus(s0, c.q), L = pos(s0, c.q + 0.05, h - 0.1), th = s0 * 104 * RAD, out = [Math.sin(th), 0, Math.cos(th)];
      const pts = [], N = 16, tour = 1.7 * Math.PI;
      for (let k = 0; k <= N; k++) {
        const f = k / N, ph = tour * f, rad = 0.5 * (1 - 0.5 * f);
        pts.push([L[0] + out[0] * rad * Math.sin(ph), L[1] - rad * (1 - Math.cos(ph)), L[2] + out[2] * rad * Math.sin(ph)]);
      }
      tube(ecume, pts, t => 0.1 * (1 - 0.7 * t) + 0.015, Math.max(4, fil - 2), true);
    }
    const R = graine(7), sb = Math.max(6, niv.seg / 3);
    for (let k = 0; k < Math.round(26 * d); k++) {
      const c = CRETES[k % 2], s = -0.85 + 1.7 * R(), [h] = dessus(s, c.q), p = pos(s, c.q + 0.03, h + 0.2 + R() * 0.7), q = 0.06 + R() * R() * 0.18;
      sphere(ecume, p, q, q * 1.15, q, sb, sb / 2);
    }
    for (let k = 0; k < 10; k++) {
      const th = (-80 + R() * 160) * RAD, y = 6 + R() * 10, r = rayonA(y)[0] * (0.6 + R() * 0.3), q = 0.08 + R() * R() * 0.18;
      sphere(bulles, pencher([r * Math.sin(th), y, r * Math.cos(th)]), q, q, q, sb, sb / 2);
    }
    return { nappe, ecume, creux: creuxB, bulles };
  }

  const SUTURES = [
    [[-78, 15.2], [-58, 17.0], [-38, 18.2], [-18, 18.9]],
    [[-50, 9.8], [-37, 7.8], [-24, 5.9], [-10, 4.2], [4, 3.6]],
    [[-90, 12.6], [-95, 9.8], [-98, 7.0], [-101, 4.4]],
    [[94, 11.4], [100, 8.7], [106, 6.0]],
    [[148, 14.2], [172, 12.8], [198, 13.4], [222, 15.0]],
    [[158, 6.4], [186, 5.4], [214, 6.6]],
  ];
  function construireSutures(niv) {
    const b = Brut(), R = graine(19);
    for (const trace of SUTURES) {
      const lisse = catmull(trace, 12), fil = lisse.map(([th, y]) => pointGelee(th, y, 0.02));
      const ep = niv.lisible ? 1.8 : 1;
      tube(b, fil.map(f => f.p), 0.1 * ep, niv.fil, true);
      let acc = 0.45;
      for (let k = 1; k < fil.length; k++) {
        const a = fil[k - 1].p, c = fil[k].p, l = Math.hypot(c[0] - a[0], c[1] - a[1], c[2] - a[2]);
        acc += l;
        if (acc < 0.92 + R() * 0.25) continue;
        acc = 0;
        const t = [(c[0] - a[0]) / l, (c[1] - a[1]) / l, (c[2] - a[2]) / l], nn = fil[k].n;
        let tr = [t[1] * nn[2] - t[2] * nn[1], t[2] * nn[0] - t[0] * nn[2], t[0] * nn[1] - t[1] * nn[0]];
        const biais = (R() - 0.5) * 0.5; tr = tr.map((v, i) => v + t[i] * biais);
        const L = 0.5 + R() * 0.22, m = fil[k].p, pts = [];
        const P = niv.pas || 6;
        for (let s = 0; s <= P; s++) {
          const f = -1 + 2 * s / P, h = 0.13 * (1 - f * f) - 0.06;
          pts.push([m[0] + tr[0] * f * L + nn[0] * h, m[1] + tr[1] * f * L + nn[1] * h, m[2] + tr[2] * f * L + nn[2] * h]);
        }
        tube(b, pts, 0.11 * ep, niv.point, true);
      }
    }
    return b;
  }


  const KINTSUGI = [
    { th: 40, y: 14.2, n: 5, t: 1.0 }, { th: 56, y: 7.0, n: 4, t: 1.0 }, { th: -64, y: 15.6, n: 3, t: 0.6 },
    { th: 150, y: 11.6, n: 4, t: 0.85 }, { th: 205, y: 8.6, n: 4, t: 0.8 }, { th: 238, y: 14.8, n: 3, t: 0.7 },
  ];
  function traceFeleures() {
    const R = graine(29), W = 2048, H = 1024, eclats = [], fissures = [];
    const P = (th, y) => [(th + 180) / 360 * W, (1 - vDe(y)) * H];
    const pointe = (x, y, a, long, larg, prof) => {
      const mil = [[x, y]];
      let px = x, py = y, aa = a;
      const n = 3 + Math.floor(R() * 3);
      for (let s = 0; s < n; s++) { aa += (R() < 0.5 ? -1 : 1) * (0.25 + R() * 0.45); const l = long / n * (0.7 + R() * 0.6); px += Math.cos(aa) * l; py += Math.sin(aa) * l * 0.9; mil.push([px, py]); }
      const g = [], d = [];
      for (let i = 0; i < mil.length; i++) {
        const q = mil[Math.min(mil.length - 1, i + 1)], o = mil[Math.max(0, i - 1)], tx = q[0] - o[0], ty = q[1] - o[1], tl = Math.hypot(tx, ty) || 1;
        const w = larg * Math.pow(1 - i / (mil.length - 1), 1.1) * (0.8 + R() * 0.4) / 2;
        g.push([mil[i][0] - ty / tl * w, mil[i][1] + tx / tl * w]); d.push([mil[i][0] + ty / tl * w, mil[i][1] - tx / tl * w]);
      }
      eclats.push(g.concat(d.reverse()));
      if (prof < 2 && R() < 0.65) { const k = 1 + Math.floor(R() * (mil.length - 2)); pointe(mil[k][0], mil[k][1], aa + (R() < 0.5 ? -1 : 1) * (0.7 + R() * 0.5), long * 0.45, larg * 0.5, prof + 1); }
      const f = [[px, py, 2.2]], m = 2 + Math.floor(R() * 4);
      for (let s = 0; s < m; s++) { aa += (R() - 0.5) * 1.3; px += Math.cos(aa) * (7 + R() * 9); py += Math.sin(aa) * (7 + R() * 9); f.push([px, py, 1.8]); }
      fissures.push(f);
    };
    for (const k of KINTSUGI) {
      const [x, y] = P(k.th, k.y), r = 15 * k.t, coeur = [];
      for (let i = 0; i < 9; i++) { const a = TAU * i / 9 + R() * 0.3, rr = r * (0.55 + R() * 0.7); coeur.push([x + Math.cos(a) * rr, y + Math.sin(a) * rr * 0.9]); }
      eclats.push(coeur);
      for (let i = 0; i < k.n; i++) pointe(x, y, TAU * i / k.n + R() * 0.9, (95 + R() * 60) * k.t, (21 + R() * 7) * k.t, 0);
    }
    return { eclats, fissures };
  }
  const FELEURES = traceFeleures();
  const CICATRICES = SUTURES.map(tr => catmull(tr, 12).map(([th, y]) => [(th + 180) / 360 * 2048, (1 - vDe(y)) * 1024, 4]));

  function toile(W, H, fond) { const cv = document.createElement('canvas'); cv.width = W; cv.height = H; const g = cv.getContext('2d'); g.fillStyle = fond; g.fillRect(0, 0, W, H); g.lineCap = 'round'; g.lineJoin = 'round'; return [cv, g]; }
  function peindre(g, W, f) { for (const dx of [-W, 0, W]) { g.save(); g.translate(dx, 0); f(); g.restore(); } }
  function traits(g, W, k, liste, style, largeur) {
    for (const pts of liste) peindre(g, W, () => {
      g.strokeStyle = style;
      for (let i = 1; i < pts.length; i++) {
        g.lineWidth = Math.max(0.6, (largeur ? largeur(pts[i][2]) : pts[i][2]) * k);
        g.beginPath(); g.moveTo(pts[i - 1][0] * k, pts[i - 1][1] * k); g.lineTo(pts[i][0] * k, pts[i][1] * k); g.stroke();
      }
    });
  }
  function flouCouche(g, W, H, px, dessiner) {
    const [cv, gg] = toile(W, H, 'rgba(0,0,0,0)');
    gg.clearRect(0, 0, W, H);
    dessiner(gg);
    g.filter = `blur(${px}px)`; g.drawImage(cv, 0, 0); g.filter = 'none';
  }
  function eclatsOr(g, W, k, style, cerne) {
    for (const poly of FELEURES.eclats) peindre(g, W, () => {
      g.fillStyle = style; g.beginPath(); poly.forEach(([x, y], i) => i ? g.lineTo(x * k, y * k) : g.moveTo(x * k, y * k)); g.closePath(); g.fill();
      if (cerne) { g.strokeStyle = style; g.lineWidth = cerne * k; g.stroke(); }
    });
  }

  function cartes(T, epaisseur) {
    const W = T, H = T / 2, k = W / 2048, R = graine(5);
    const [cc, gc] = toile(W, H, COULEURS.gelee);
    flouCouche(gc, W, H, Math.max(1, 26 * k), g => {
      for (let i = 0; i < 70; i++) {
        g.fillStyle = R() < 0.55 ? COULEURS.geleeClaire : COULEURS.geleeSombre; g.globalAlpha = 0.16 + R() * 0.12;
        const x = R() * W, y = R() * H, r = (40 + R() * 120) * k;
        peindre(g, W, () => { g.beginPath(); g.arc(x, y, r, 0, TAU); g.fill(); });
      }
    });
    flouCouche(gc, W, H, Math.max(0.5, 2 * k), g => traits(g, W, k, CICATRICES, COULEURS.cicatrice, () => 9));
    traits(gc, W, k, FELEURES.fissures, COULEURS.fissure);
    eclatsOr(gc, W, k, COULEURS.orSombre, 3);
    eclatsOr(gc, W, k, COULEURS.or);
    for (const poly of FELEURES.eclats) {
      const xs = poly.map(p => p[0]), ys = poly.map(p => p[1]), x0 = Math.min(...xs), x1 = Math.max(...xs), y0 = Math.min(...ys), y1 = Math.max(...ys);
      peindre(gc, W, () => {
        gc.save(); gc.beginPath(); poly.forEach(([x, y], i) => i ? gc.lineTo(x * k, y * k) : gc.moveTo(x * k, y * k)); gc.closePath(); gc.clip();
        for (let i = 0; i < (x1 - x0) * (y1 - y0) / 18; i++) { gc.fillStyle = R() < 0.65 ? 'rgba(255,236,150,0.85)' : 'rgba(140,90,10,0.6)'; gc.fillRect((x0 + R() * (x1 - x0)) * k, (y0 + R() * (y1 - y0)) * k, Math.max(1, 1.6 * k), Math.max(1, 1.6 * k)); }
        gc.restore();
      });
    }
    const [co, go] = toile(W, H, 'rgb(0,34,0)');
    flouCouche(go, W, H, Math.max(0.5, 2 * k), g => traits(g, W, k, CICATRICES, 'rgb(0,90,0)', () => 9));
    traits(go, W, k, FELEURES.fissures, 'rgb(0,110,0)');
    eclatsOr(go, W, k, 'rgb(0,70,165)', 3);
    const [ct, gt] = toile(W, H, '#fff');
    flouCouche(gt, W, H, Math.max(0.5, 2 * k), g => traits(g, W, k, CICATRICES, 'rgb(170,170,170)', () => 9));
    traits(gt, W, k, FELEURES.fissures, 'rgb(175,175,175)');
    eclatsOr(gt, W, k, '#000', 3);
    const [ce, ge] = toile(W, H, '#000');
    eclatsOr(ge, W, k, '#7c5406', 2);
    const [cb, gb] = toile(W, H, 'rgb(128,128,128)');
    flouCouche(gb, W, H, Math.max(2, 18 * k), g => { for (let i = 0; i < 160; i++) { const v = 121 + Math.round(R() * 14); g.fillStyle = `rgb(${v},${v},${v})`; const x = R() * W, y = R() * H, r = (14 + R() * 40) * k; peindre(g, W, () => { g.beginPath(); g.arc(x, y, r, 0, TAU); g.fill(); }); } });
    flouCouche(gb, W, H, Math.max(0.5, 3 * k), g => traits(g, W, k, CICATRICES, 'rgb(55,55,55)', () => 10));
    traits(gb, W, k, FELEURES.fissures, 'rgb(70,70,70)');
    flouCouche(gb, W, H, Math.max(0.5, 1.5 * k), g => eclatsOr(g, W, k, 'rgb(210,210,210)', 2));
    const C = { couleur: cc, orm: co, transmission: ct, relief: cb, emission: ce };
    if (!epaisseur) return C;
    const [cp, gp] = toile(W, H, '#000');
    const dg = gp.createLinearGradient(0, 0, 0, H);
    dg.addColorStop(0, 'rgb(0,105,0)'); dg.addColorStop(1 - vDe(14), 'rgb(0,150,0)'); dg.addColorStop(1 - vDe(6), 'rgb(0,225,0)'); dg.addColorStop(1, 'rgb(0,255,0)');
    gp.fillStyle = dg; gp.fillRect(0, 0, W, H);
    C.epaisseur = cp;
    return C;
  }


  function construire(THREE, opts) {
    const o = Object.assign({ niveau: 'planche', graine: 1, sutures: 'or' }, opts || {});
    const niv = NIVEAUX[o.niveau] || NIVEAUX.planche;
    const refraction = o.refraction != null ? !!o.refraction : niv.refraction;
    const col = c => new THREE.Color(COULEURS[c] || c);
    const groupe = new THREE.Group(), corps = new THREE.Group();
    corps.name = 'corps'; corps.matrixAutoUpdate = false;
    groupe.add(corps);
    const aLiberer = [];
    const garde = x => { aLiberer.push(x); return x; };
    const geo = b => garde(enGeo(THREE, b));
    const tex = (cv, srgb) => { const t = new THREE.CanvasTexture(cv); t.wrapS = THREE.RepeatWrapping; t.anisotropy = 8; if (srgb && THREE.sRGBEncoding != null) t.encoding = THREE.sRGBEncoding; return garde(t); };

    const uAnim = { value: new THREE.Vector4(0, 0, 0, 0) };
    const uLueur = { value: col('lueur') };
    const balancer = m => m;
    const L = !!niv.lisible;
    const houle = (m, translucide) => {
      m.onBeforeCompile = sh => {
        sh.uniforms.uAnim = uAnim; sh.uniforms.uLueur = uLueur;
        sh.vertexShader = 'uniform vec4 uAnim;\nvarying float vHautG;\n' + sh.vertexShader.replace('#include <begin_vertex>', `#include <begin_vertex>
          vHautG = position.y;
          { float th = atan(transformed.x, transformed.z); float j = 1.0 - smoothstep(0.0, 4.2, transformed.y);
            transformed.xz *= 1.0 + j * 0.022 * sin(th * 7.0 + uAnim.x * 1.7); }`);
        sh.fragmentShader = 'uniform vec3 uLueur;\nvarying float vHautG;\n' + sh.fragmentShader.replace('#include <output_fragment>', `
          { float nvG = clamp(dot(normal, normalize(vViewPosition)), 0.0, 1.0), bordG = pow(1.0 - nvG, 2.4), hautG = smoothstep(4.0, 18.0, vHautG);
            outgoingLight += uLueur * (bordG * (${L ? '0.26 + 0.4' : '0.13 + 0.27'} * hautG) + ${L ? '0.06' : '0.025'} * hautG) * (1.0 - smoothstep(0.15, 0.45, metalnessFactor));
            ${translucide ? `diffuseColor.a = clamp(mix(${L ? '0.56' : '0.34'}, 0.95, pow(1.0 - nvG, 1.4)) + 0.25 * (1.0 - smoothstep(1.0, 5.0, vHautG)), 0.0, 1.0); outgoingLight *= mix(${L ? '0.86' : '0.68'}, 1.0, pow(1.0 - nvG, 0.8));` : ''} }
          #include <output_fragment>`);
      };
      return m;
    };

    const C = cartes(niv.tex, refraction);
    const tCouleur = tex(C.couleur, true), tOrm = tex(C.orm), tTrans = tex(C.transmission), tRelief = tex(C.relief), tEmission = tex(C.emission, true), tEpais = refraction ? tex(C.epaisseur) : null;
    const matieres = {};
    const gelee = { map: tCouleur, roughness: 1, roughnessMap: tOrm, metalness: 1, metalnessMap: tOrm, bumpMap: tRelief, bumpScale: 0.4, emissive: new THREE.Color('#ffffff'), emissiveMap: tEmission, emissiveIntensity: 1, clearcoat: 0.85, clearcoatRoughness: 0.07, ior: 1.36, envMapIntensity: 1.0 };
    matieres.gelee = garde(houle(new THREE.MeshPhysicalMaterial(refraction
      ? Object.assign(gelee, { transmission: 1, transmissionMap: tTrans, thickness: 11, thicknessMap: tEpais, attenuationColor: col('attenuation'), attenuationDistance: 8, sheen: 0.25, sheenColor: col('geleeClaire'), sheenColorMap: tTrans, sheenRoughness: 0.4, clearcoatMap: tTrans })
      : Object.assign(gelee, { color: new THREE.Color(L ? '#86cdd0' : '#58a0a7'), transparent: true, depthWrite: false, envMapIntensity: L ? 0.95 : 0.6, clearcoat: 0.7, clearcoatMap: tTrans })), !refraction));
    if (!refraction) matieres.envers = garde(balancer(new THREE.MeshBasicMaterial({ color: col(L ? 'geleeSombre' : 'attenuation'), transparent: true, opacity: L ? 0.3 : 0.38, depthWrite: false, side: THREE.BackSide })));
    matieres.coeur = garde(balancer(new THREE.MeshPhysicalMaterial({ color: col(L ? '#46636c' : 'coeur'), roughness: 0.5, metalness: 0, clearcoat: 0.5, clearcoatRoughness: 0.35 })));
    matieres.bille = garde(balancer(new THREE.MeshPhysicalMaterial({ color: col('bille'), roughness: 0.08, metalness: 0, clearcoat: 1, clearcoatRoughness: 0.03, envMapIntensity: 0.45 })));
    matieres.paupiere = garde(balancer(new THREE.MeshPhysicalMaterial({ color: col('paupiere'), roughness: 0.6, metalness: 0, clearcoat: 0.2, clearcoatRoughness: 0.4, envMapIntensity: 0.35 })));
    matieres.calotte = garde(new THREE.MeshPhysicalMaterial({ color: col('paupiere'), roughness: 0.6, metalness: 0, clearcoat: 0.2, clearcoatRoughness: 0.4, envMapIntensity: 0.35 }));
    matieres.vague = garde(balancer(new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.3, metalness: 0, side: THREE.DoubleSide, emissive: col('attenuation'), emissiveIntensity: L ? 0.3 : 0 })));
    matieres.ecume = garde(balancer(new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 0.4, metalness: 0, emissive: col('ecume'), emissiveIntensity: 0.35 })));
    matieres.creux = garde(balancer(new THREE.MeshStandardMaterial({ color: col('attenuation'), roughness: 0.5, metalness: 0 })));
    matieres.bulle = garde(balancer(new THREE.MeshPhysicalMaterial({ color: col('vague'), roughness: 0.05, metalness: 0, clearcoat: 1, envMapIntensity: 1.4 })));
    matieres.fil = garde(balancer(new THREE.MeshPhysicalMaterial(L
      ? { color: col(o.sutures === 'fer' ? 'fer' : '#e3a334'), roughness: 0.3, metalness: 0.5, clearcoat: 0.3, emissive: col(o.sutures === 'fer' ? '#2a3034' : '#6a4306'), emissiveIntensity: 0.9 }
      : { color: col(o.sutures === 'fer' ? 'fer' : 'fil'), roughness: 0.38, metalness: 0.75, clearcoat: 0.3 })));

    const mesh = (b, m, nom, ordre) => { const x = new THREE.Mesh(geo(b), m); x.name = nom; x.renderOrder = ordre || 0; corps.add(x); return x; };
    mesh(construireCoeur(niv), matieres.coeur, 'coeur');
    const v = construireVague(niv);
    mesh(v.nappe, matieres.vague, 'vague'); mesh(v.ecume, matieres.ecume, 'ecume'); mesh(v.creux, matieres.creux, 'creux'); mesh(v.bulles, matieres.bulle, 'bulles');
    if (refraction) matieres.fil.transparent = true;
    mesh(construireSutures(niv), matieres.fil, 'sutures', refraction ? 3 : 0);

    const Y = COTES.yeux, billes = Brut(), bourrelets = Brut(), paupieres = [];
    for (const s of [-1, 1]) {
      const r = repereOeil(s), at = k => [r.o[0] + r.z[0] * k, r.o[1] + r.z[1] * k, r.o[2] + r.z[2] * k];
      sphere(billes, at(Y.sortie), Y.bille, Y.bille, Y.bille, niv.seg, niv.seg / 2, [r.x, r.y, r.z]);
      tore(bourrelets, at(Y.sortie + 0.15), Y.anneau, Y.bourrelet, niv.seg, Math.max(6, niv.seg / 3), [r.x, r.y, r.z], 0.85, th => 1 + 1.9 * Math.pow(Math.max(0, Math.sin(th + s * 0.3)), 2.0));
      const cal = Brut(); sphere(cal, [0, 0, 0], Y.paupiere, Y.paupiere, Y.paupiere, niv.seg, niv.seg / 3, null, Y.ouverture * RAD);
      const pivot = new THREE.Group(), m4 = new THREE.Matrix4().makeBasis(new THREE.Vector3(...r.x), new THREE.Vector3(...r.y), new THREE.Vector3(...r.z));
      pivot.position.set(...at(Y.sortie)); pivot.quaternion.setFromRotationMatrix(m4);
      const incl = new THREE.Group(); incl.rotation.z = -s * Y.tombe * RAD; pivot.add(incl);
      const charniere = new THREE.Group(); incl.add(charniere);
      const pm = new THREE.Mesh(geo(cal), matieres.calotte); pm.name = 'paupiere'; charniere.add(pm);
      charniere.name = 'charniere'; corps.add(pivot); paupieres.push(charniere);
    }
    mesh(billes, matieres.bille, 'billes'); mesh(bourrelets, matieres.paupiere, 'bourrelets');
    if (L) {
      matieres.reflet = garde(new THREE.MeshBasicMaterial({ color: '#ffffff', toneMapped: false }));
      const reflets = Brut(), nrm = v => { const l = Math.hypot(v[0], v[1], v[2]) || 1; return [v[0] / l, v[1] / l, v[2] / l]; };
      for (const sd of [-1, 1]) {
        const r = repereOeil(sd), c = [r.o[0] + r.z[0] * Y.sortie, r.o[1] + r.z[1] * Y.sortie, r.o[2] + r.z[2] * Y.sortie];
        const z = nrm([r.z[0] - 0.3, r.z[1] + 0.1, r.z[2]]), x = nrm([z[2], 0, -z[0]]), y = [z[1] * x[2] - z[2] * x[1], z[2] * x[0] - z[0] * x[2], z[0] * x[1] - z[1] * x[0]];
        sphere(reflets, [c[0] + z[0] * Y.bille * 1.0, c[1] + z[1] * Y.bille * 1.0, c[2] + z[2] * Y.bille * 1.0], 0.5, 0.5, 0.08, 10, 4, [x, y, z]);
      }
      mesh(reflets, matieres.reflet, 'reflets');
    }

    const corpsB = construireCorps(niv), gCorps = geo(corpsB);
    if (matieres.envers) { const e = new THREE.Mesh(geo(construireCorps({ u: 28, v: 14 })), matieres.envers); e.name = 'envers'; e.renderOrder = 1; corps.add(e); }
    { const x = new THREE.Mesh(gCorps, matieres.gelee); x.name = 'gelee'; x.renderOrder = 2; corps.add(x); }
    const gouttes = Brut(), Rg = graine(41), sg = Math.max(6, niv.seg / 3);
    for (let k = 0; k < niv.gouttes; k++) {
      const th = -120 + Rg() * 240, y = 6 + Rg() * 12.5, q = 0.16 + Rg() * Rg() * 0.42, g = pointGelee(th, y, 0);
      const debut = gouttes.uv.length;
      sphere(gouttes, [g.p[0] + g.n[0] * q * 0.2, g.p[1] + g.n[1] * q * 0.2, g.p[2] + g.n[2] * q * 0.2], q, q * 0.9, q, sg, sg / 2);
      for (let i = debut; i < gouttes.uv.length; i += 2) { gouttes.uv[i] = uDe(th); gouttes.uv[i + 1] = vDe(y); }
    }
    matieres.gouttes = garde(balancer(new THREE.MeshPhysicalMaterial({ color: col('geleeClaire'), roughness: 0.05, metalness: 0, clearcoat: 1, clearcoatRoughness: 0.03, transparent: true, opacity: 0.35, depthWrite: false })));
    mesh(gouttes, matieres.gouttes, 'gouttes', 2);

    const etat = nouvelEtat(o.graine, o.etire === 0);
    animerGelee(THREE, { corps, paupieres }, etat, 0, null);
    groupe.userData = {
      matieres, cartes: C, uAnim, etat,
      secouer(force, angle) { secouerEtat(etat, force, angle); },
      animer(t, pose) { uAnim.value.x = t; animerGelee(THREE, { corps, paupieres }, etat, t, pose || null); },
      liberer() { for (const x of aLiberer) x.dispose(); },
    };
    return groupe;
  }


  function nouvelEtat(graineN, immobile) {
    const R = graine((graineN || 1) * 977 + 5);
    return { R, ph: R() * TAU, immobile: !!immobile, choc: null, cligne: 1.5 + R() * 3 };
  }
  function secouerEtat(e, force, angle) { e.choc = { f: force == null ? 1 : force, a: angle || 0, t0: null }; }
  const _m = {};
  function poserCorps(THREE, corps, s, bx, bz) {
    const H = COTES.hauteur, l = 1 + s * 0.45;
    const m = _m[THREE.REVISION] || (_m[THREE.REVISION] = new THREE.Matrix4());
    m.set(l, bx / H, 0, 0, 0, 1 - s, 0, 0, 0, bz / H, l, 0, 0, 0, 0, 1);
    corps.matrix.copy(m); corps.matrixWorldNeedsUpdate = true;
  }
  function animerGelee(THREE, pieces, e, t, pose) {
    const p = pose || {}, g = p.geste || null, vit = !e.immobile;
    let s = vit ? 0.03 * Math.sin(t * 2.1 + e.ph) : 0, bx = vit ? 0.24 * Math.sin(t * 1.35 + e.ph) : 0, bz = vit ? 0.16 * Math.sin(t * 1.05 + 1.2 + e.ph) : 0, saut = 0;
    if (p.marche) {
      const v = Math.min(3, p.vitesse || 1), ph = t * (1.6 + 0.45 * v) * TAU + e.ph;
      s += 0.075 * Math.sin(ph); saut += 0.9 * Math.max(0, Math.sin(ph)); bz += 1.1 * Math.min(1, v / 2);
    }
    if (g) {
      const k = Math.max(0, Math.min(1, g.t || 0));
      if (g.type === 'sort') {
        if (k < 0.35) { const w = k / 0.35; s += 0.12 * w; bz -= 1.8 * w; }
        else if (k < 0.55) { const w = (k - 0.35) / 0.2; s += 0.12 - 0.27 * w; bz += -1.8 + 4.2 * w; }
        else { const w = (k - 0.55) / 0.45, o = Math.exp(-4 * w) * Math.cos(9 * w); s -= 0.15 * o; bz += 2.4 * o; }
      } else if (g.type === 'coup') {
        if (!e.choc || (e.choc.t0 != null && t - e.choc.t0 > 0.3)) secouerEtat(e, 0.9, Math.PI);
      } else if (g.type === 'saut') {
        saut += 6 * Math.sin(Math.PI * k);
        s += k < 0.2 ? -0.12 * (k / 0.2) : k > 0.85 ? 0.16 * (k - 0.85) / 0.15 : -0.12 * (1 - (k - 0.2) / 0.65);
      } else if (g.type === 'pousse') {
        s += 0.1 * Math.sin(Math.PI * k); bz -= 1.2 * Math.sin(Math.PI * k);
      } else if (g.type === 'placement') {
        s += 0.25 * (1 - k) * Math.cos(k * 3 * Math.PI);
      } else if (g.type === 'mort') {
        const w = k * k * (3 - 2 * k);
        s += -0.1 * Math.sin(Math.PI * Math.min(1, k / 0.18)) + 0.72 * w; saut -= 1.6 * w; bx *= 1 - w; bz *= 1 - w;
      }
    }
    if (e.choc) {
      const c = e.choc; if (c.t0 == null) c.t0 = t;
      const dt = t - c.t0, o = c.f * Math.exp(-3.2 * dt) * Math.sin(13 * dt);
      s += 0.07 * o; bx += 1.1 * o * Math.sin(c.a); bz += 1.1 * o * Math.cos(c.a);
      if (dt > 2.5) e.choc = null;
    }
    if (p.alpha != null && p.alpha < 1) s += 0.55 * (1 - p.alpha);
    poserCorps(THREE, pieces.corps, Math.max(-0.25, Math.min(0.75, s)), bx, bz);
    if (t > e.cligne + 0.22 || t < e.cligne - 8) e.cligne = t + 3 + e.R() * 3;
    const d = t - e.cligne, f = g && g.type === 'mort' ? Math.min(1, (g.t || 0) * 4) : d > 0 && d < 0.22 ? Math.sin(Math.PI * d / 0.22) : 0;
    for (const c of pieces.paupieres) c.rotation.x = 0.12 + f * 1.15;
    return saut;
  }

  function studio(THREE, renderer, largeur) {
    const L = largeur || 1024, q = L / 1024;
    const cv = document.createElement('canvas'); cv.width = L; cv.height = L / 2;
    const g = cv.getContext('2d'), d = g.createLinearGradient(0, 0, 0, L / 2);
    d.addColorStop(0, '#ffffff'); d.addColorStop(0.3, '#e9edef'); d.addColorStop(0.7, '#aeb6ba'); d.addColorStop(1, '#848c90');
    g.fillStyle = d; g.fillRect(0, 0, L, L / 2);
    g.filter = 'blur(' + Math.max(4, Math.round(22 * q)) + 'px)';
    g.setTransform(q, 0, 0, q, 0, 0);
    g.fillStyle = '#ffffff'; g.fillRect(560, 70, 210, 120);
    g.fillStyle = '#f2f6f8'; g.fillRect(200, 110, 60, 170);
    g.fillStyle = '#ffffff'; g.fillRect(860, 150, 90, 70);
    const t = new THREE.CanvasTexture(cv); t.mapping = THREE.EquirectangularReflectionMapping; t.encoding = THREE.sRGBEncoding;
    const pm = new THREE.PMREMGenerator(renderer), env = pm.fromEquirectangular(t).texture;
    t.dispose(); pm.dispose();
    return env;
  }

  const HAUTEUR_JEU = 1.65, ID = 'gelee_cousue';
  const DUREES = { placement: 380, sort: 760, lacher: 0.45, pousse: 110, saut: 150, mort: 900 };
  class Parc {
    constructor(THREE, opts) {
      const o = opts || {};
      this.THREE = THREE; this.opts = o;
      const refraction = !!o.refraction && !o.telephone;
      this.niveau = o.telephone ? 'telephone' : refraction ? 'bureau' : 'jeu';
      this.modele = construire(THREE, { niveau: this.niveau, refraction, etire: 0 });
      this.envLargeur = o.telephone ? 256 : 512;
      this.env = o.renderer ? studio(THREE, o.renderer, this.envLargeur) : null;
      if (this.env) this.modele.traverse(m => { if (m.isMesh && m.material && 'envMap' in m.material) { m.material.envMap = this.env; m.material.needsUpdate = true; } });
      const c = compter(this.modele); this.triangles = c.triangles; this.appels = c.appels;
      this.groupe = new THREE.Group(); this.groupe.name = 'gelees';
      const cv = document.createElement('canvas'); cv.width = cv.height = 64;
      const g = cv.getContext('2d'), d = g.createRadialGradient(32, 32, 4, 32, 32, 32);
      d.addColorStop(0, 'rgba(20,40,46,0.5)'); d.addColorStop(0.6, 'rgba(20,40,46,0.2)'); d.addColorStop(1, 'rgba(20,40,46,0)');
      g.fillStyle = d; g.fillRect(0, 0, 64, 64);
      this.ombreTex = new THREE.CanvasTexture(cv);
      this.ombreGeo = new THREE.PlaneGeometry(1, 1).rotateX(-Math.PI / 2);
      this.ombreMat = new THREE.MeshBasicMaterial({ map: this.ombreTex, transparent: true, depthWrite: false });
      this.etats = new Map(); this.now = 0; this.n = 0;
      this._pv = new THREE.Matrix4(); this._ch = new THREE.Frustum(); this._sp = new THREE.Sphere();
    }
    prend(id) { return id === ID; }
    durees(id) { return id === ID ? DUREES : null; }
    emprise(s) { return (s.scale || 1) * 1.75; }
    debut(now, camera) {
      this.now = now; this.n = 0; this.camera = camera;
      this.modele.userData.uAnim.value.x = now / 1000;
      for (const e of this.etats.values()) e.pose = false;
      camera.updateMatrixWorld();
      this._ch.setFromProjectionMatrix(this._pv.multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse));
    }
    poser(s) {
      if (s.modele !== ID) return false;
      if (s.alpha != null && s.alpha < 0.05) return true;
      const H = (s.scale || 1) * HAUTEUR_JEU;
      this._sp.center.set(s.x, s.h + H * 0.5, s.y); this._sp.radius = H;
      if (!this._ch.intersectsSphere(this._sp)) return true;
      const cle = s.modeleCle || (ID + '|' + this.n);
      let e = this.etats.get(cle);
      if (!e) {
        const racine = this.modele.clone(true), corps = racine.getObjectByName('corps'), paupieres = [];
        racine.traverse(x => { if (x.name === 'charniere') paupieres.push(x); });
        const ombre = new this.THREE.Mesh(this.ombreGeo, this.ombreMat); ombre.renderOrder = -1;
        let hsh = 0; for (let k = 0; k < cle.length; k++) hsh = (hsh * 31 + cle.charCodeAt(k)) | 0;
        e = { racine, corps, paupieres, ombre, etat: nouvelEtat(Math.abs(hsh) % 997 + 1, false), prec: null, vitesse: 0, cap: null };
        this.groupe.add(racine, ombre);
        this.etats.set(cle, e);
      }
      e.pose = true; e.vu = this.now; this.n++;
      const prec = e.prec || (e.prec = { x: s.x, y: s.y, t: this.now });
      const dx = s.x - prec.x, dy = s.y - prec.y, dist = Math.hypot(dx, dy), dtp = Math.max(1e-3, (this.now - prec.t) / 1000);
      const deplace = dist > 0.004 && dist < 3, v = deplace ? Math.min(8, dist / dtp) : 0;
      e.vitesse += (v - e.vitesse) * Math.min(1, dtp / 0.12);
      if (deplace) e.cap = Math.atan2(dx, dy);
      else if (s.vers && Math.hypot(s.vers.u - s.x, s.vers.v - s.y) > 0.05) e.cap = Math.atan2(s.vers.u - s.x, s.vers.v - s.y);
      else if (e.cap == null || s.combat) { const c = this.camera.position; e.cap = Math.atan2(c.x - s.x, c.z - s.y); }
      prec.x = s.x; prec.y = s.y; prec.t = this.now;
      const k = H / COTES.hauteur;
      const saut = animerGelee(this.THREE, e, e.etat, this.now / 1000, { marche: e.vitesse > 0.15, vitesse: e.vitesse, geste: s.geste || null, alpha: s.alpha });
      e.racine.visible = true; e.ombre.visible = true;
      e.racine.position.set(s.x, s.h + saut * k, s.y); e.racine.rotation.set(0, e.cap || 0, 0); e.racine.scale.setScalar(k);
      e.ombre.position.set(s.x, s.h + 0.03, s.y); e.ombre.scale.setScalar(H * 1.9 * (1 - Math.min(0.4, saut * k / H)));
      return true;
    }
    fin() {
      for (const [k, e] of this.etats) {
        if (!e.pose) { e.racine.visible = false; e.ombre.visible = false; }
        if (this.now - e.vu > 5000) { this.groupe.remove(e.racine, e.ombre); this.etats.delete(k); }
      }
    }
    stats() { return { gelees: this.n, appels: this.n * (this.appels + 1), triangles: this.n * (this.triangles + 2) }; }
    octets() {
      let o = 0;
      for (const cv of Object.values(this.modele.userData.cartes)) o += cv.width * cv.height * 4 * 1.33;
      if (this.env) { const c = Math.max(16, this.envLargeur / 4); o += 3 * Math.max(c, 112) * (4 * c + 112) * 8; }
      o += 64 * 64 * 4 * 1.33;
      this.modele.traverse(m => { if (m.isMesh) for (const a of Object.values(m.geometry.attributes)) o += a.array.byteLength; });
      return Math.round(o);
    }
    liberer() {
      this.modele.userData.liberer(); this.ombreTex.dispose(); this.ombreGeo.dispose(); this.ombreMat.dispose();
      if (this.env) this.env.dispose();
      this.groupe.clear(); this.etats.clear();
    }
  }

  function compter(obj) {
    let triangles = 0, appels = 0;
    obj.traverse(m => {
      if (!m.isMesh) return;
      appels++;
      const g = m.geometry; triangles += (g.index ? g.index.count : g.attributes.position.count) / 3;
    });
    return { triangles: Math.round(triangles), appels };
  }

  return { COTES, NIVEAUX, COULEURS, SUTURES, KINTSUGI, HAUTEUR_JEU, DUREES, construire, compter, pointGelee, rayonA, studio, Parc };
})();
if (typeof module === 'object' && module.exports) module.exports = ModeleGelee;
