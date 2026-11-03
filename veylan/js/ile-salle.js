const IleSalle = (() => {
  const N = 15;
  const PALETTES = {
    dalles_amarre: { joint: '#2a2530', dalles: ['#6f6660', '#746b64', '#685f5a', '#7a716a', '#625a56', '#716860'], roche: '#2c2831', trou: '#15101f', trouCoeur: '#3a2a58', bordTrou: '#3a3550', fissure: '#3a3238', mousse: '#4e6a44', gravier: '#8d857c' },
    dalles_claires: { joint: '#4a4540', dalles: ['#a39a8c', '#ada497', '#9b9285', '#b0a79a', '#948b7f', '#a89f92'], roche: '#4a443f', trou: '#1a1524', trouCoeur: '#3f2f60', bordTrou: '#4a4560', fissure: '#5a534c', mousse: '#6a8a56', gravier: '#c0b8ac' },
  };
  PALETTES.planches = { genre: 'planches', joint: '#2e2117', dalles: ['#7d5d3c', '#876643', '#735535', '#8d6c48', '#6b4f32', '#80603f'], roche: '#3e2c1e', trou: '#140f0c', trouCoeur: '#3a2a1a', bordTrou: '#3a2a1c', fissure: '#2a1d12', gravier: '#5a4630', mousse: '#6a6a38', eau: '#243c44', eauClair: '#3c6a74', rive: '#5a4630' };
  PALETTES.terre_battue = { genre: 'terre', joint: '#3a2b1e', dalles: ['#6d5336', '#74593b', '#654d33', '#7a5f41', '#5e4830', '#6f5538'], roche: '#3b2d22', trou: '#120d0a', trouCoeur: '#38241a', bordTrou: '#3f3024', fissure: '#2b1f15', gravier: '#8a7352', mousse: '#55603a', eau: '#2a3c3a', eauClair: '#4a6a62', rive: '#5a4a38' };
  PALETTES.sous_bois = { genre: 'terre', taches: 0.45, joint: '#1c241c', dalles: ['#3c4733', '#424d38', '#374230', '#47523d', '#333d2c', '#3e4935'], roche: '#242b23', trou: '#0d1210', trouCoeur: '#1e3024', bordTrou: '#2a3328', fissure: '#161d16', gravier: '#5a5a44', mousse: '#5b7a44', eau: '#1e3236', eauClair: '#356a66', rive: '#3a4a36' };
  PALETTES.basalte = { joint: '#3a2420', dalles: ['#4e4a4c', '#555052', '#484446', '#5a5658', '#424042', '#524e50'], roche: '#2a2628', trou: '#160a08', trouCoeur: '#5a2410', bordTrou: '#3a2c2a', fissure: '#7a3a1c', gravier: '#6a6264', mousse: '#5a4a3a', eau: '#2a2a30', eauClair: '#4a4648', rive: '#5a5254' };
  const PAROIS = {
    roche_grise: { mur: '#86838f', pilier: '#908d9a', racine: '#4b3b2e', bloc: '#7d7a86' },
    roche_rousse: { mur: '#8e7464', pilier: '#9a8070', racine: '#4e3a2a', bloc: '#866c5c' },
    bois: { genre: 'bois', mur: '#8a6a48', pilier: '#7a5c3e', racine: '#5a4530', bloc: '#94744f' },
    terre: { genre: 'terre', mur: '#7a5d44', pilier: '#6e5440', racine: '#4a3828', bloc: '#866848' },
    bois_mort: { genre: 'bois', mur: '#6a6660', pilier: '#5e5a54', racine: '#44403a', bloc: '#75706a' },
    basalte: { mur: '#4e484c', pilier: '#5a5458', racine: '#3a3230', bloc: '#565052' },
  };
  const M = () => IleTerrain.M;
  const hex = (h, k) => { const T = THREE_(), c = new T.Color(h); return [c.r * k, c.g * k, c.b * k]; };
  let THREE_ = () => window.THREE;

  const TUILES = { claire: [1, 3, 3], amarre: [3, 3, 2], planches: [3, 3, 2], forge: [3, 3, 1], cuve: [3, 3, 2] };
  const TEXTURES = ['terrier', 'toiles', 'boues', 'mine'];
  const IMAGES = {};
  function source(chemin) {
    try {
      const ref = document.querySelector('script[src*="ile-salle.js"]');
      if (ref && ref.src) { const u = new URL(ref.src); return new URL('../' + chemin, u).href + u.search; }
    } catch (e) {   }
    return chemin;
  }
  function image(nom) {
    if (!IMAGES[nom] && typeof Image !== 'undefined') { const im = new Image(); im.src = source('assets/decor/donjons/' + nom + '.jpg'); IMAGES[nom] = im; }
    return IMAGES[nom];
  }
  const prete = im => !!(im && im.complete && im.naturalWidth > 0);
  function precharger() {
    for (const n of Object.keys(TUILES)) for (const k of 'abc') image(n + '-' + k);
    for (const n of TEXTURES) image(n);
  }
  if (typeof document !== 'undefined') precharger();

  function peindreSol(layout, style, S) {
    const P = PALETTES[style.sol] || PALETTES.dalles_amarre;
    const jeu = style.tuiles && TUILES[style.tuiles] ? [...'abc'].map(k => image(style.tuiles + '-' + k)) : null;
    const tuiles = jeu && jeu.every(prete) ? jeu : null, poids = tuiles ? TUILES[style.tuiles] : null;
    const tex = style.texture && TEXTURES.includes(style.texture) ? image(style.texture) : null;
    const c = document.createElement('canvas'); c.width = S; c.height = S;
    const g = c.getContext('2d'), cs = S / N;
    const R = M().hasard(M().cle('salle:' + (style.sol || '') + ':' + layout.join('/')));
    const at = (x, y) => (y >= 0 && y < N && x >= 0 && x < N ? layout[y][x] : '#');
    const motif = !tuiles && prete(tex) ? g.createPattern(tex, 'repeat') : null, fM = 7.5 * cs / ((tex && tex.naturalWidth) || 512);
    const tirer = () => { const t = poids.reduce((a, b) => a + b, 0) * R(); let acc = 0; for (let i = 0; i < poids.length; i++) { acc += poids[i]; if (t < acc) return tuiles[i]; } return tuiles[0]; };
    g.fillStyle = P.joint; g.fillRect(0, 0, S, S);
    for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
      const ch = at(x, y), X = x * cs, Y = y * cs;
      if (ch === '#') {
        g.fillStyle = P.roche; g.fillRect(X, Y, cs + 0.5, cs + 0.5);
        for (let i = 0; i < 3; i++) { g.globalAlpha = 0.18; g.fillStyle = '#ffffff'; g.beginPath(); g.ellipse(X + R() * cs, Y + R() * cs, 1 + R() * 3, 0.8 + R() * 1.5, R() * 3.1, 0, 6.3); g.fill(); }
        g.globalAlpha = 1;
        continue;
      }
      if (ch === 'o') {
        const d = g.createRadialGradient(X + cs / 2, Y + cs / 2, 0, X + cs / 2, Y + cs / 2, cs * 0.72);
        d.addColorStop(0, P.trouCoeur || P.trou); d.addColorStop(0.3, P.trou); d.addColorStop(0.72, P.trou); d.addColorStop(1, P.bordTrou);
        g.fillStyle = d; g.fillRect(X, Y, cs + 0.5, cs + 0.5);
        const n = 9, cx = X + cs / 2, cy = Y + cs / 2;
        for (let i = 0; i < n; i++) {
          const a0 = (i / n) * 6.2832 + R() * 0.2, a1 = a0 + 6.2832 / n - 0.1 - R() * 0.25;
          const r0 = cs * (0.36 + R() * 0.08), r1 = cs * 0.78;
          g.fillStyle = P.dalles[Math.floor(R() * P.dalles.length)]; g.globalAlpha = 0.9;
          g.beginPath(); g.moveTo(cx + Math.cos(a0) * r0, cy + Math.sin(a0) * r0); g.lineTo(cx + Math.cos(a0) * r1, cy + Math.sin(a0) * r1);
          g.lineTo(cx + Math.cos(a1) * r1, cy + Math.sin(a1) * r1); g.lineTo(cx + Math.cos(a1) * r0, cy + Math.sin(a1) * r0); g.closePath(); g.fill();
          g.strokeStyle = P.joint; g.globalAlpha = 0.8; g.lineWidth = Math.max(1, cs / 40);
          g.beginPath(); g.moveTo(cx + Math.cos(a0) * r0, cy + Math.sin(a0) * r0); g.lineTo(cx + Math.cos(a1) * r0, cy + Math.sin(a1) * r0); g.stroke();
          if (Math.cos((a0 + a1) / 2) + Math.sin((a0 + a1) / 2) < -0.2) { g.strokeStyle = '#ffffff'; g.globalAlpha = 0.14; g.stroke(); }
        }
        g.globalAlpha = 1;
        continue;
      }
      if (ch === '~') {
        const cx = X + cs / 2, cy = Y + cs / 2;
        const d = g.createRadialGradient(cx, cy, 0, cx, cy, cs * 0.95);
        d.addColorStop(0, P.eauClair || '#3f7083'); d.addColorStop(1, P.eau || '#24404f');
        g.fillStyle = d; g.fillRect(X, Y, cs + 0.5, cs + 0.5);
        g.strokeStyle = 'rgba(205,232,240,1)'; g.lineWidth = Math.max(1, cs / 44); g.lineCap = 'round';
        for (let i = 0; i < 3; i++) { g.globalAlpha = 0.18 + R() * 0.22; const a0 = R() * 6.28; g.beginPath(); g.arc(X + cs * (0.2 + R() * 0.6), Y + cs * (0.2 + R() * 0.6), cs * (0.12 + R() * 0.22), a0, a0 + 1.1 + R() * 1.2); g.stroke(); }
        g.globalAlpha = 1;
        const e = Math.max(2, cs * 0.1);
        for (const [dx, dy] of [[-1, 0], [1, 0], [0, -1], [0, 1]]) {
          const v = at(x + dx, y + dy);
          if (v === '~' || v === '#') continue;
          g.fillStyle = 'rgba(10,16,22,0.5)'; g.fillRect(dx < 0 ? X : dx > 0 ? X + cs - e : X, dy < 0 ? Y : dy > 0 ? Y + cs - e : Y, dx === 0 ? cs : e, dy === 0 ? cs : e);
          g.fillStyle = P.rive || '#8a8070'; g.globalAlpha = 0.9;
          for (let i = 0; i < 4; i++) { const t = R(); g.beginPath(); g.ellipse(dx === 0 ? X + cs * t : (dx < 0 ? X + e * 0.5 : X + cs - e * 0.5), dy === 0 ? Y + cs * t : (dy < 0 ? Y + e * 0.5 : Y + cs - e * 0.5), 1.5 + R() * 2.5, 1 + R() * 1.6, R() * 3, 0, 6.3); g.fill(); }
          g.globalAlpha = 1;
        }
        continue;
      }
      const col = P.dalles[Math.floor(R() * P.dalles.length)], r = 1.5;
      const peint = !!(tuiles || motif);
      if (tuiles) {
        g.drawImage(tirer(), X, Y, cs + 0.5, cs + 0.5);
        g.globalAlpha = 0.04 + R() * 0.08; g.fillStyle = R() < 0.5 ? '#000000' : '#ffffff'; g.fillRect(X, Y, cs + 0.5, cs + 0.5); g.globalAlpha = 1;
      } else if (motif) {
        g.save(); g.beginPath(); g.rect(X - 0.5, Y - 0.5, cs + 1, cs + 1); g.clip(); g.scale(fM, fM);
        g.fillStyle = motif; g.fillRect((X - 0.5) / fM, (Y - 0.5) / fM, (cs + 1) / fM, (cs + 1) / fM); g.restore();
      } else if (P.genre === 'planches') {
        for (let k = 0; k < 2; k++) {
          const Yk = Y + k * cs / 2, h = cs / 2, c2 = P.dalles[Math.floor(R() * P.dalles.length)];
          g.fillStyle = c2; g.fillRect(X, Yk + 1, cs + 0.5, h - 2);
          g.strokeStyle = 'rgba(0,0,0,0.22)'; g.lineWidth = 1;
          for (let i = 0; i < 3; i++) { const yv = Yk + 2 + R() * (h - 4); g.beginPath(); g.moveTo(X, yv); g.lineTo(X + cs, yv + (R() - 0.5) * 3); g.stroke(); }
          if (R() < 0.3) { const xc = X + cs * (0.25 + R() * 0.5); g.fillStyle = P.joint; g.fillRect(xc, Yk, 2, h); g.fillStyle = 'rgba(230,220,200,0.6)'; g.beginPath(); g.arc(xc - 4, Yk + h / 2, 1.3, 0, 6.3); g.fill(); g.beginPath(); g.arc(xc + 5, Yk + h / 2, 1.3, 0, 6.3); g.fill(); }
          if (R() < 0.18) { g.globalAlpha = 0.5; g.fillStyle = '#2e2117'; g.beginPath(); g.ellipse(X + cs * (0.2 + R() * 0.6), Yk + h / 2, 2.2 + R() * 2, 1.4 + R() * 1.2, R(), 0, 6.3); g.fill(); g.globalAlpha = 1; }
        }
        g.fillStyle = 'rgba(255,255,255,0.08)'; g.fillRect(X, Y + 1, cs, 1.5); g.fillRect(X, Y + cs / 2 + 1, cs, 1.5);
      } else if (P.genre === 'terre') {
        g.fillStyle = col; g.fillRect(X - 0.5, Y - 0.5, cs + 1, cs + 1);
        for (let i = 0; i < 5; i++) { g.globalAlpha = (0.1 + R() * 0.14) * (P.taches == null ? 1 : P.taches); g.fillStyle = R() < 0.5 ? '#000000' : '#ffffff'; g.beginPath(); g.ellipse(X + R() * cs, Y + R() * cs, 4 + R() * cs * 0.3, 3 + R() * cs * 0.18, R() * 3.1, 0, 6.3); g.fill(); }
        for (let i = 0; i < 3; i++) { g.globalAlpha = 0.7; g.fillStyle = P.gravier; g.beginPath(); g.ellipse(X + R() * cs, Y + R() * cs, 1.2 + R() * 1.8, 0.9 + R() * 1.2, R() * 3, 0, 6.3); g.fill(); }
        g.globalAlpha = 1;
      } else {
      g.fillStyle = col; g.fillRect(X + r, Y + r, cs - 2 * r, cs - 2 * r);
      g.fillStyle = 'rgba(255,255,255,0.09)'; g.fillRect(X + r, Y + r, cs - 2 * r, 2); g.fillRect(X + r, Y + r, 2, cs - 2 * r);
      g.fillStyle = 'rgba(0,0,0,0.2)'; g.fillRect(X + r, Y + cs - r - 2, cs - 2 * r, 2); g.fillRect(X + cs - r - 2, Y + r, 2, cs - 2 * r);
      }
      if (!P.genre && !peint) for (let i = 0; i < 4; i++) { g.globalAlpha = 0.07 + R() * 0.1; g.fillStyle = R() < 0.5 ? '#000000' : '#ffffff'; g.beginPath(); g.ellipse(X + r + R() * (cs - 2 * r), Y + r + R() * (cs - 2 * r), 2 + R() * 6, 1.5 + R() * 3, R() * 3.1, 0, 6.3); g.fill(); }
      if (!P.genre && !peint && R() < 0.45) {
        g.globalAlpha = 0.55; g.strokeStyle = P.fissure; g.lineWidth = Math.max(1, cs / 34);
        let fx = X + r + R() * (cs - 2 * r), fy = Y + r + R() * (cs - 2 * r);
        g.beginPath(); g.moveTo(fx, fy);
        for (let i = 0; i < 3; i++) { fx += (R() - 0.5) * cs * 0.5; fy += (R() - 0.5) * cs * 0.5; g.lineTo(Math.max(X + r, Math.min(X + cs - r, fx)), Math.max(Y + r, Math.min(Y + cs - r, fy))); }
        g.stroke();
      }
      g.globalAlpha = 1;
      if (ch === ',') for (let i = 0; i < 9; i++) { g.globalAlpha = 0.5 + R() * 0.4; g.fillStyle = P.gravier; g.beginPath(); g.ellipse(X + r + R() * (cs - 2 * r), Y + r + R() * (cs - 2 * r), 1 + R() * 1.6, 0.8 + R() * 1.2, R() * 3.1, 0, 6.3); g.fill(); }
      g.globalAlpha = 1;
      const mur = at(x - 1, y) === '#' || at(x, y - 1) === '#' || at(x + 1, y) === '#' || at(x, y + 1) === '#';
      if (mur) for (let i = 0; i < 5; i++) { g.globalAlpha = 0.16 + R() * 0.16; g.fillStyle = P.mousse; g.beginPath(); g.ellipse(X + R() * cs, Y + R() * cs, 2 + R() * 5, 1.5 + R() * 3, R() * 3.1, 0, 6.3); g.fill(); }
      g.globalAlpha = 1;
      if (ch === 'Z') { g.strokeStyle = '#e8c56a'; g.globalAlpha = 0.85; g.lineWidth = Math.max(1.5, cs / 16); g.beginPath(); g.arc(X + cs / 2, Y + cs / 2, cs * 0.32, 0, 6.3); g.stroke(); g.globalAlpha = 1; }
      if (ch === 'T' || ch === 'L') { g.fillStyle = 'rgba(0,0,0,0.3)'; g.beginPath(); g.ellipse(X + cs / 2, Y + cs / 2, cs * (ch === 'T' ? 0.34 : 0.14), cs * (ch === 'T' ? 0.3 : 0.12), 0, 0, 6.3); g.fill(); }
    }
    const lum = style.lumiere || '#f2c14e';
    const n = parseInt(lum.slice(1), 16), lr = (n >> 16) & 255, lg = (n >> 8) & 255, lb = n & 255;
    g.globalCompositeOperation = 'lighter';
    for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
      if (at(x, y) !== 'L') continue;
      const cx = (x + 0.5) * cs, cy = (y + 0.5) * cs, r = cs * 3.4;
      const q = g.createRadialGradient(cx, cy, 0, cx, cy, r);
      q.addColorStop(0, `rgba(${lr},${lg},${lb},0.34)`); q.addColorStop(0.4, `rgba(${lr},${lg},${lb},0.14)`); q.addColorStop(1, `rgba(${lr},${lg},${lb},0)`);
      g.fillStyle = q; g.beginPath(); g.arc(cx, cy, r, 0, 6.3); g.fill();
    }
    g.globalCompositeOperation = 'source-over';
    return c;
  }

  function geoSol(THREE) {
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute([0, 0, 0, N, 0, 0, 0, 0, N, N, 0, N], 3));
    g.setAttribute('normal', new THREE.Float32BufferAttribute([0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0], 3));
    g.setAttribute('uv', new THREE.Float32BufferAttribute([0, 0, 1, 0, 0, 1, 1, 1], 2));
    g.setIndex([0, 2, 1, 1, 2, 3]);
    g.computeBoundingBox();
    return g;
  }

  function construire(THREE, ctx) {
    THREE_ = () => THREE;
    const { layout, style, mats } = ctx;
    const PR = PAROIS[style.paroi] || PAROIS.roche_grise, PS = PALETTES[style.sol] || PALETTES.dalles_amarre;
    const L = IleDecor.bibliotheque(!!ctx.telephone);
    const R = M().hasard(M().cle('salle3d:' + (ctx.index || 0) + ':' + layout.join('/')));
    const at = (x, y) => (y >= 0 && y < N && x >= 0 && x < N ? layout[y][x] : '#');
    const roche = [], lueur = [];
    const lanternes = [], halos = [], brume = [];
    let cle = 1;
    const piece = (liste, geo, m, c, opts) => liste.push(Object.assign({ geo, m, c, cle: cle++ }, opts || {}));
    const mat = (x, y, z, rx, ry, rz, sx, sy, sz) => IleDecor.matrice(x, y, z, rx, ry, rz, sx, sy, sz);
    const varie = (h, k) => hex(h, 1 + (R() - 0.5) * k);
    const lums = [];
    for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) if (at(x, y) === 'L') lums.push([x + 0.5, y + 0.5]);
    const chaud = (c, x, z) => {
      let f = 0;
      for (const [lx, lz] of lums) f = Math.max(f, Math.exp(-Math.hypot(lx - x, lz - z) / 2.6));
      return [c[0] * (1 + 0.5 * f), c[1] * (1 + 0.22 * f), c[2] * (1 - 0.15 * f)];
    };

    for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
      const ch = at(x, y), cx = x + 0.5, cz = y + 0.5;
      if (ch === '#') {
        const bord = x === 0 || y === 0 || x === N - 1 || y === N - 1;
        const devant = x === N - 1 || y === N - 1;
        const h = !bord ? 1.5 : (devant ? 0.5 : 2.6);
        const bas = bord && !devant ? 2.6 : h;
        piece(roche, L.boite, mat(cx, -0.05, cz, 0, 0, 0, 1.002, bas + 0.05, 1.002), chaud(varie(PR.mur, 0.16), cx, cz), { grain: 0.05, uvk: bas > 1 ? 1 : 0.5, bas: 1.0, haut: bas > 1 ? 0.6 : 0.85 });
        if (!bord || devant) piece(roche, L.boite, mat(cx, h - 0.12, cz, 0, 0, 0, 1.08, 0.16, 1.08), chaud(varie(PR.bloc, 0.12), cx, cz), { grain: 0.04, uvk: 0.5 });
      } else if (ch === 'o') {
        for (let q = 0; q < 8; q++) {
          const a = q / 8 * 6.283 + R() * 0.3, rr = 0.42;
          piece(roche, L.pierres[Math.floor(R() * 8)], mat(cx + Math.cos(a) * rr, -0.06, cz + Math.sin(a) * rr, 0, -a, 0, 0.3, 0.12 + R() * 0.08, 0.16), chaud(varie(PR.bloc, 0.2), cx, cz), { grain: 0.06, uvk: 0.3 });
        }
        halos.push({ x: cx, y: 0.25, z: cz, couleur: '#8a5ad8', taille: 2.2, opacite: 0.3 });
      } else if (ch === 'T') {
        piece(roche, L.disque(10), mat(cx, 0.08, cz, 0, 0, 0, 0.5, 1.6, 0.5), varie(PR.pilier, 0.1), { grain: 0.04 });
        piece(roche, L.cyl(10), mat(cx, 0, cz, 0, 0, 0, 0.34, 2.6, 0.34), varie(PR.pilier, 0.12), { grain: 0.05, uvk: 2 });
        piece(roche, L.disque(10), mat(cx, 2.56, cz, 0, 0, 0, 0.52, 1.8, 0.52), varie(PR.pilier, 0.1), { grain: 0.04 });
      } else if (ch === '~') {
        for (const [dx, dy] of [[-1, 0], [1, 0], [0, -1], [0, 1]]) {
          const v = at(x + dx, y + dy);
          if (v === '~' || v === '#') continue;
          for (let q = 0; q < 2; q++) piece(roche, L.pierres[Math.floor(R() * 8)], mat(cx + dx * 0.44 + (dy ? (R() - 0.5) * 0.7 : 0), -0.05, cz + dy * 0.44 + (dx ? (R() - 0.5) * 0.7 : 0), 0, R() * 6.28, 0, 0.2, 0.08 + R() * 0.06, 0.13), chaud(varie(PR.bloc, 0.2), cx, cz), { grain: 0.06 });
        }
        if (((x + y) & 1) === 0) halos.push({ x: cx, y: 0.1, z: cz, couleur: PS.eauClair || '#3f7083', taille: 1.9, opacite: 0.16 });
      } else if (ch === 'L') {
        piece(roche, L.cyl(6), mat(cx, 0, cz, 0, 0, 0, 0.05, 1.4, 0.05), hex('#3a3540', 1), { grain: 0.02 });
        piece(roche, L.disque(8), mat(cx, 0.02, cz, 0, 0, 0, 0.18, 0.6, 0.18), hex('#3a3540', 1), { grain: 0.02 });
        piece(lueur, L.octa, mat(cx, 1.55, cz, 0, R() * 3.14, 0, 0.2, 0.3, 0.2), hex(style.lumiere, 1), {});
        lanternes.push({ x: cx, y: 1.55, z: cz });
        halos.push({ x: cx, y: 1.55, z: cz, couleur: style.lumiere, taille: 3.2, opacite: 0.6 });
      }
    }

    const racines = [];
    for (let k = 0; k < 7; k++) {
      const ouest = k % 2 === 0;
      const a = 1.5 + R() * (N - 3);
      const pts = ouest
        ? [new THREE.Vector3(0.2, 2.7, a), new THREE.Vector3(0.9, 2.1, a + (R() - 0.5) * 0.8), new THREE.Vector3(1.02, 1.1, a + (R() - 0.5) * 1.2), new THREE.Vector3(1.25, 0.05, a + (R() - 0.5) * 1.6)]
        : [new THREE.Vector3(a, 2.7, 0.2), new THREE.Vector3(a + (R() - 0.5) * 0.8, 2.1, 0.9), new THREE.Vector3(a + (R() - 0.5) * 1.2, 1.1, 1.02), new THREE.Vector3(a + (R() - 0.5) * 1.6, 0.05, 1.25)];
      const fin = pts[3], cx = Math.floor(fin.x), cz = Math.floor(fin.z);
      if (at(cx, cz) === '#' || at(cx, cz) === 'o') continue;
      const courbe = new THREE.CatmullRomCurve3(pts);
      const geo = new THREE.TubeGeometry(courbe, 10, 0.09 + R() * 0.07, 6, false);
      geo.computeBoundingBox();
      racines.push(geo);
      piece(roche, geo, mat(0, 0, 0, 0, 0, 0, 1, 1, 1), varie(PR.racine, 0.2), { grain: 0.06, uvk: 0.3 });
      for (let q = 1; q <= 4; q++) {
        const p = courbe.getPoint(q / 5);
        piece(lueur, L.octa, mat(p.x, p.y, p.z, 0, R() * 3, 0, 0.09, 0.14, 0.09), hex('#eef2f6', 1), {});
        if (q % 2 === 0) piece(lueur, L.tore(8), mat(p.x, p.y, p.z, Math.PI / 2 + (R() - 0.5) * 0.6, R() * 3, 0, 0.16, 0.16, 0.16), hex('#e4e9ef', 1), {});
      }
    }

    const nP = ctx.telephone ? 10 : 16;
    for (let k = 0; k < nP; k++) {
      const a = (k / nP) * 6.283 + R() * 0.5, d = N / 2 + 4 + R() * 7;
      const px = N / 2 + Math.cos(a) * d * 1.15, pz = N / 2 + Math.sin(a) * d * 1.15;
      if (px > N + 3 && pz > N + 3) continue;
      const h = 4 + R() * 7, r = 0.8 + R() * 1.1;
      piece(roche, L.tronc(7), mat(px, -2, pz, (R() - 0.5) * 0.1, R() * 6, (R() - 0.5) * 0.1, r * 1.2, h + 2, r), hex(PR.mur, 0.42 + R() * 0.12), { grain: 0.08, uvk: 2, bas: 0.7, haut: 1.0 });
      if (R() < 0.5) piece(roche, L.cailloux[Math.floor(R() * 8)], mat(px + (R() - 0.5) * 2, -0.3, pz + (R() - 0.5) * 2, 0, R() * 6, 0, r, r * 0.6, r), hex(PR.bloc, 0.5), { grain: 0.1 });
    }
    for (let k = 0; k < (ctx.telephone ? 8 : 12); k++) {
      const a = (k / 12) * 6.283 + R() * 0.4, d = N / 2 + 3 + R() * 6;
      brume.push({ x: N / 2 + Math.cos(a) * d * 1.2, y: 0.4 + R() * 1.6, z: N / 2 + Math.sin(a) * d * 1.2, taille: 9 + R() * 8 });
    }

    let n = 0;
    for (let y = 0; y < N && n < 18; y++) for (let x = 0; x < N && n < 18; x++) {
      if (at(x, y) !== ',' || R() < 0.55) continue;
      const s = 0.14 + R() * 0.14;
      piece(roche, L.cailloux[Math.floor(R() * L.cailloux.length)], mat(x + 0.2 + R() * 0.6, 0, y + 0.2 + R() * 0.6, 0, R() * 6.28, 0, s, s * 0.7, s), varie(PR.bloc, 0.2), { grain: 0.08 });
      n++;
    }

    for (const a of ctx.accessoires || []) {
      if (!Array.isArray(a.case)) continue;
      const cx = a.case[0] + 0.5, cz = a.case[1] + 0.5;
      if (a.sorte === 'fil_d_or') {
        piece(roche, L.tore(18), mat(cx, 0.14, cz, Math.PI / 2, 0, 0, 0.52, 0.52, 0.52), hex('#75706b', 1), { grain: 0.05 });
        piece(lueur, L.cyl(8), mat(cx, 0.2, cz, 0, 0, 0, 0.045, 10, 0.045), hex('#f2c14e', 1.05), {});
        piece(lueur, L.octa, mat(cx, 0.46, cz, 0, 0.6, 0, 0.22, 0.3, 0.22), hex('#f6d27a', 1), {});
        halos.push({ x: cx, y: 0.7, z: cz, couleur: '#f2c14e', taille: 3.2, opacite: 0.6 });
        halos.push({ x: cx, y: 3.4, z: cz, couleur: '#f2c14e', taille: 1.6, opacite: 0.35 });
        lanternes.push({ x: cx, y: 0.9, z: cz });
      } else if (a.sorte === 'anneau_de_pierre') {
        piece(roche, L.tore(18), mat(cx, 0.14, cz, Math.PI / 2, 0, 0, 0.55, 0.55, 0.55), hex('#75706b', 1), { grain: 0.05 });
      }
    }

    const groupe = new THREE.Group();
    const geos = { sol: geoSol(THREE), roche: IleDecor.fusion(roche), lueur: IleDecor.fusion(lueur) };
    const sol = new THREE.Mesh(geos.sol, mats.sol); sol.matrixAutoUpdate = false; sol.renderOrder = 1; groupe.add(sol);
    if (geos.roche) { const m = new THREE.Mesh(geos.roche, mats.roche); m.matrixAutoUpdate = false; groupe.add(m); }
    if (geos.lueur) { const m = new THREE.Mesh(geos.lueur, mats.lueur); m.matrixAutoUpdate = false; groupe.add(m); }
    for (const g of racines) g.dispose();
    const aire = { x0: 0, y0: 0, w: N, h: N, hMin: 0, hMax: 0, hMoy: 0, coins: [[0, 0, 0], [N, 0, 0], [0, N, 0], [N, N, 0]] };
    return { groupe, lanternes, halos, aire, geos, brume };
  }

  return { peindreSol, construire, PALETTES, PAROIS, TUILES, TEXTURES };
})();
