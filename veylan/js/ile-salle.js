// Les salles de donjon en 3D (docs/ILE-TECHNIQUE.md, 3.1 et 6) : une salle fermée, construite
// d'après son plan de 15 lignes (content/*.js, dungeons[].rooms[].layout) sur un sol plat de cases
// (la case (x, y) est le carré [x, x + 1] × [y, y + 1] de la scène, à la hauteur 0), pour un donjon
// dont l'entrée est sur un plateau (le Puits de l'Amarre). Le style vient de `salles3d` du donjon
// (sol, paroi, lumiere, brume, accessoires). Ile3D (js/ile-3d.js) la montre avec la caméra
// orthographique du combat, ouvre l'aire du combat dessus et y pose les figures ; rien ici ne lit le
// moteur. Three.js est chargé avant ; tout le hasard vient du plan (IleTerrain.M), jamais de l'heure.
//
//   IleSalle.peindreSol(layout, style, S)          une toile S × S : les dalles de chaque case
//   IleSalle.construire(THREE, { layout, style, index, accessoires, telephone, mats })
//     -> { groupe, lanternes: [{ x, y, z }], halos: [{ x, y, z, couleur, taille, opacite }], aire, geos }
//
// Les murs du bord : pleins (2,6 u) au nord et à l'ouest, loin de la caméra ; un parapet (0,5 u) au
// sud et à l'est, devant elle, pour ne rien cacher. Les blocs intérieurs (« # » au milieu du plan)
// montent à 1,5 u : Ile3D leur applique la trame des obstacles de l'aire (fonduHouppiers), qui les
// rend fantômes là où ils cachent une case de sol. Les piliers (« T ») sont minces.
//
// Revue finale (les salles étaient des boîtes de prototype) : les murs portent les strates du
// calcaire (IlePeinture.paroi, répétée sur les blocs), plus sombres vers le haut et réchauffés près
// des lanternes ; les trous sont des margelles (un anneau de pierres, un fond en dégradé violet, une
// lueur) ; les racines sont cousues de fil blanc ; la lumière chaude des lanternes est cuite sur les
// dalles ; des piliers de roche se dressent au loin derrière les murs, dans la brume (`brume` : les
// bouffées que le rendu pose autour de la salle).
// Ile3D ajoute une lumière ponctuelle par lanterne (lumieresSalle).
const IleSalle = (() => {
  const N = 15;
  const PALETTES = {
    dalles_amarre: { joint: '#2a2530', dalles: ['#6f6660', '#746b64', '#685f5a', '#7a716a', '#625a56', '#716860'], roche: '#2c2831', trou: '#15101f', trouCoeur: '#3a2a58', bordTrou: '#3a3550', fissure: '#3a3238', mousse: '#4e6a44', gravier: '#8d857c' },
    dalles_claires: { joint: '#4a4540', dalles: ['#a39a8c', '#ada497', '#9b9285', '#b0a79a', '#948b7f', '#a89f92'], roche: '#4a443f', trou: '#1a1524', trouCoeur: '#3f2f60', bordTrou: '#4a4560', fissure: '#5a534c', mousse: '#6a8a56', gravier: '#c0b8ac' },
  };
  const PAROIS = {
    roche_grise: { mur: '#86838f', pilier: '#908d9a', racine: '#4b3b2e', bloc: '#7d7a86' },
    roche_rousse: { mur: '#8e7464', pilier: '#9a8070', racine: '#4e3a2a', bloc: '#866c5c' },
  };
  const M = () => IleTerrain.M;
  const hex = (h, k) => { const T = THREE_(), c = new T.Color(h); return [c.r * k, c.g * k, c.b * k]; };
  let THREE_ = () => window.THREE;

  function peindreSol(layout, style, S) {
    const P = PALETTES[style.sol] || PALETTES.dalles_amarre;
    const c = document.createElement('canvas'); c.width = S; c.height = S;
    const g = c.getContext('2d'), cs = S / N;
    const R = M().hasard(M().cle('salle:' + (style.sol || '') + ':' + layout.join('/')));
    const at = (x, y) => (y >= 0 && y < N && x >= 0 && x < N ? layout[y][x] : '#');
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
        // Un trou : le noir au centre, puis le bord, et une margelle brisée (des éclats de dalle
        // clairs sur le pourtour, avec un liseré sombre côté vide) pour qu'il se lise comme un
        // puits et non comme une dalle manquante.
        // Du violet sombre au cœur (jamais le noir : une lueur monte du fond), l'ombre, puis le bord.
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
          // Le liseré sombre de l'éclat, côté vide, et sa tranche claire en haut à gauche.
          g.strokeStyle = P.joint; g.globalAlpha = 0.8; g.lineWidth = Math.max(1, cs / 40);
          g.beginPath(); g.moveTo(cx + Math.cos(a0) * r0, cy + Math.sin(a0) * r0); g.lineTo(cx + Math.cos(a1) * r0, cy + Math.sin(a1) * r0); g.stroke();
          if (Math.cos((a0 + a1) / 2) + Math.sin((a0 + a1) / 2) < -0.2) { g.strokeStyle = '#ffffff'; g.globalAlpha = 0.14; g.stroke(); }
        }
        g.globalAlpha = 1;
        continue;
      }
      // Une dalle : en retrait du joint, une teinte tirée, un biseau clair en haut et à gauche,
      // sombre en bas et à droite, des taches, parfois une fissure.
      const col = P.dalles[Math.floor(R() * P.dalles.length)], r = 1.5;
      g.fillStyle = col; g.fillRect(X + r, Y + r, cs - 2 * r, cs - 2 * r);
      g.fillStyle = 'rgba(255,255,255,0.09)'; g.fillRect(X + r, Y + r, cs - 2 * r, 2); g.fillRect(X + r, Y + r, 2, cs - 2 * r);
      g.fillStyle = 'rgba(0,0,0,0.2)'; g.fillRect(X + r, Y + cs - r - 2, cs - 2 * r, 2); g.fillRect(X + cs - r - 2, Y + r, 2, cs - 2 * r);
      for (let i = 0; i < 4; i++) { g.globalAlpha = 0.07 + R() * 0.1; g.fillStyle = R() < 0.5 ? '#000000' : '#ffffff'; g.beginPath(); g.ellipse(X + r + R() * (cs - 2 * r), Y + r + R() * (cs - 2 * r), 2 + R() * 6, 1.5 + R() * 3, R() * 3.1, 0, 6.3); g.fill(); }
      if (R() < 0.45) {
        g.globalAlpha = 0.55; g.strokeStyle = P.fissure; g.lineWidth = Math.max(1, cs / 34);
        let fx = X + r + R() * (cs - 2 * r), fy = Y + r + R() * (cs - 2 * r);
        g.beginPath(); g.moveTo(fx, fy);
        for (let i = 0; i < 3; i++) { fx += (R() - 0.5) * cs * 0.5; fy += (R() - 0.5) * cs * 0.5; g.lineTo(Math.max(X + r, Math.min(X + cs - r, fx)), Math.max(Y + r, Math.min(Y + cs - r, fy))); }
        g.stroke();
      }
      g.globalAlpha = 1;
      if (ch === ',') for (let i = 0; i < 9; i++) { g.globalAlpha = 0.5 + R() * 0.4; g.fillStyle = P.gravier; g.beginPath(); g.ellipse(X + r + R() * (cs - 2 * r), Y + r + R() * (cs - 2 * r), 1 + R() * 1.6, 0.8 + R() * 1.2, R() * 3.1, 0, 6.3); g.fill(); }
      g.globalAlpha = 1;
      // La mousse au pied des murs.
      const mur = at(x - 1, y) === '#' || at(x, y - 1) === '#' || at(x + 1, y) === '#' || at(x, y + 1) === '#';
      if (mur) for (let i = 0; i < 5; i++) { g.globalAlpha = 0.16 + R() * 0.16; g.fillStyle = P.mousse; g.beginPath(); g.ellipse(X + R() * cs, Y + R() * cs, 2 + R() * 5, 1.5 + R() * 3, R() * 3.1, 0, 6.3); g.fill(); }
      g.globalAlpha = 1;
      if (ch === 'Z') { g.strokeStyle = '#e8c56a'; g.globalAlpha = 0.85; g.lineWidth = Math.max(1.5, cs / 16); g.beginPath(); g.arc(X + cs / 2, Y + cs / 2, cs * 0.32, 0, 6.3); g.stroke(); g.globalAlpha = 1; }
      if (ch === 'T' || ch === 'L') { g.fillStyle = 'rgba(0,0,0,0.3)'; g.beginPath(); g.ellipse(X + cs / 2, Y + cs / 2, cs * (ch === 'T' ? 0.34 : 0.14), cs * (ch === 'T' ? 0.3 : 0.12), 0, 0, 6.3); g.fill(); }
    }
    // La lumière des lanternes, cuite sur les dalles : une flaque chaude autour de chaque « L »,
    // comme les flaques des lanternes de l'île (IlePeinture.lueur).
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

  // Le sol : un quadrilatère de 15 × 15 u à la hauteur 0, les uv alignés sur les cases (u = x / 15,
  // v = y / 15 : la ligne 0 de la toile est la ligne 0 du plan, sans retournement).
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
    const PR = PAROIS[style.paroi] || PAROIS.roche_grise;
    const L = IleDecor.bibliotheque(!!ctx.telephone);
    const R = M().hasard(M().cle('salle3d:' + (ctx.index || 0) + ':' + layout.join('/')));
    const at = (x, y) => (y >= 0 && y < N && x >= 0 && x < N ? layout[y][x] : '#');
    const roche = [], lueur = [];
    const lanternes = [], halos = [], brume = [];
    let cle = 1;
    const piece = (liste, geo, m, c, opts) => liste.push(Object.assign({ geo, m, c, cle: cle++ }, opts || {}));
    const mat = (x, y, z, rx, ry, rz, sx, sy, sz) => IleDecor.matrice(x, y, z, rx, ry, rz, sx, sy, sz);
    const varie = (h, k) => hex(h, 1 + (R() - 0.5) * k);
    // Les lanternes d'abord : les murs et les blocs se réchauffent près d'elles.
    const lums = [];
    for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) if (at(x, y) === 'L') lums.push([x + 0.5, y + 0.5]);
    const chaud = (c, x, z) => {
      let f = 0;
      for (const [lx, lz] of lums) f = Math.max(f, Math.exp(-Math.hypot(lx - x, lz - z) / 2.6));
      return [c[0] * (1 + 0.5 * f), c[1] * (1 + 0.22 * f), c[2] * (1 - 0.15 * f)];
    };

    // ----- Les murs, les blocs, les piliers, les lanternes -----
    for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
      const ch = at(x, y), cx = x + 0.5, cz = y + 0.5;
      if (ch === '#') {
        const bord = x === 0 || y === 0 || x === N - 1 || y === N - 1;
        const devant = x === N - 1 || y === N - 1;
        // Un mur du bord plein au fond, un parapet devant ; un bloc au milieu.
        const h = !bord ? 1.5 : (devant ? 0.5 : 2.6);
        const bas = bord && !devant ? 2.6 : h;
        // Les strates de la paroi (map de `roche`) : un mur plein répète la toile deux fois sur sa
        // hauteur ; plus sombre vers le haut (les lanternes éclairent d'en bas), chaud près d'elles.
        piece(roche, L.boite, mat(cx, -0.05, cz, 0, 0, 0, 1.002, bas + 0.05, 1.002), chaud(varie(PR.mur, 0.16), cx, cz), { grain: 0.05, uvk: bas > 1 ? 1 : 0.5, bas: 1.0, haut: bas > 1 ? 0.6 : 0.85 });
        // Le couronnement d'un bloc intérieur ou d'un parapet : une pierre un peu plus large.
        if (!bord || devant) piece(roche, L.boite, mat(cx, h - 0.12, cz, 0, 0, 0, 1.08, 0.16, 1.08), chaud(varie(PR.bloc, 0.12), cx, cz), { grain: 0.04, uvk: 0.5 });
      } else if (ch === 'o') {
        // Une margelle : un anneau de huit pierres basses autour du trou, un peu enfoncées.
        for (let q = 0; q < 8; q++) {
          const a = q / 8 * 6.283 + R() * 0.3, rr = 0.42;
          piece(roche, L.pierres[Math.floor(R() * 8)], mat(cx + Math.cos(a) * rr, -0.06, cz + Math.sin(a) * rr, 0, -a, 0, 0.3, 0.12 + R() * 0.08, 0.16), chaud(varie(PR.bloc, 0.2), cx, cz), { grain: 0.06, uvk: 0.3 });
        }
        halos.push({ x: cx, y: 0.25, z: cz, couleur: '#8a5ad8', taille: 2.2, opacite: 0.3 });
      } else if (ch === 'T') {
        piece(roche, L.disque(10), mat(cx, 0.08, cz, 0, 0, 0, 0.5, 1.6, 0.5), varie(PR.pilier, 0.1), { grain: 0.04 });
        piece(roche, L.cyl(10), mat(cx, 0, cz, 0, 0, 0, 0.34, 2.6, 0.34), varie(PR.pilier, 0.12), { grain: 0.05, uvk: 2 });
        piece(roche, L.disque(10), mat(cx, 2.56, cz, 0, 0, 0, 0.52, 1.8, 0.52), varie(PR.pilier, 0.1), { grain: 0.04 });
      } else if (ch === 'L') {
        piece(roche, L.cyl(6), mat(cx, 0, cz, 0, 0, 0, 0.05, 1.4, 0.05), hex('#3a3540', 1), { grain: 0.02 });
        piece(roche, L.disque(8), mat(cx, 0.02, cz, 0, 0, 0, 0.18, 0.6, 0.18), hex('#3a3540', 1), { grain: 0.02 });
        piece(lueur, L.octa, mat(cx, 1.55, cz, 0, R() * 3.14, 0, 0.2, 0.3, 0.2), hex(style.lumiere, 1), {});
        lanternes.push({ x: cx, y: 1.55, z: cz });
        halos.push({ x: cx, y: 1.55, z: cz, couleur: style.lumiere, taille: 3.2, opacite: 0.6 });
      }
    }

    // ----- Les racines : des tubes qui descendent le long des murs du fond, cousus de fil blanc -----
    const racines = [];
    for (let k = 0; k < 7; k++) {
      const ouest = k % 2 === 0;
      const a = 1.5 + R() * (N - 3);
      const pts = ouest
        ? [new THREE.Vector3(0.2, 2.7, a), new THREE.Vector3(0.9, 2.1, a + (R() - 0.5) * 0.8), new THREE.Vector3(1.02, 1.1, a + (R() - 0.5) * 1.2), new THREE.Vector3(1.25, 0.05, a + (R() - 0.5) * 1.6)]
        : [new THREE.Vector3(a, 2.7, 0.2), new THREE.Vector3(a + (R() - 0.5) * 0.8, 2.1, 0.9), new THREE.Vector3(a + (R() - 0.5) * 1.2, 1.1, 1.02), new THREE.Vector3(a + (R() - 0.5) * 1.6, 0.05, 1.25)];
      // Pas de racine sur une case du fond qui n'est pas du sol (un bloc, un trou).
      const fin = pts[3], cx = Math.floor(fin.x), cz = Math.floor(fin.z);
      if (at(cx, cz) === '#' || at(cx, cz) === 'o') continue;
      const courbe = new THREE.CatmullRomCurve3(pts);
      const geo = new THREE.TubeGeometry(courbe, 10, 0.09 + R() * 0.07, 6, false);
      geo.computeBoundingBox();
      racines.push(geo);
      piece(roche, geo, mat(0, 0, 0, 0, 0, 0, 1, 1, 1), varie(PR.racine, 0.2), { grain: 0.06, uvk: 0.3 });
      // Les coutures : quatre points de fil blanc le long de la racine, et un fil qui la ceinture.
      for (let q = 1; q <= 4; q++) {
        const p = courbe.getPoint(q / 5);
        piece(lueur, L.octa, mat(p.x, p.y, p.z, 0, R() * 3, 0, 0.09, 0.14, 0.09), hex('#eef2f6', 1), {});
        if (q % 2 === 0) piece(lueur, L.tore(8), mat(p.x, p.y, p.z, Math.PI / 2 + (R() - 0.5) * 0.6, R() * 3, 0, 0.16, 0.16, 0.16), hex('#e4e9ef', 1), {});
      }
    }

    // ----- Au loin, derrière les murs : des piliers de roche dans la brume, et la brume elle-même -----
    // Posés hors du carré (à 4 à 11 u des murs), hauts de 4 à 11 u, sombres : la salle se détache
    // d'un fond qui a de la profondeur, pas d'un aplat.
    const nP = ctx.telephone ? 10 : 16;
    for (let k = 0; k < nP; k++) {
      const a = (k / nP) * 6.283 + R() * 0.5, d = N / 2 + 4 + R() * 7;
      const px = N / 2 + Math.cos(a) * d * 1.15, pz = N / 2 + Math.sin(a) * d * 1.15;
      // Rien devant la caméra (le coin sud-est est ouvert) : les piliers restent au nord et à l'ouest.
      if (px > N + 3 && pz > N + 3) continue;
      const h = 4 + R() * 7, r = 0.8 + R() * 1.1;
      piece(roche, L.tronc(7), mat(px, -2, pz, (R() - 0.5) * 0.1, R() * 6, (R() - 0.5) * 0.1, r * 1.2, h + 2, r), hex(PR.mur, 0.42 + R() * 0.12), { grain: 0.08, uvk: 2, bas: 0.7, haut: 1.0 });
      if (R() < 0.5) piece(roche, L.cailloux[Math.floor(R() * 8)], mat(px + (R() - 0.5) * 2, -0.3, pz + (R() - 0.5) * 2, 0, R() * 6, 0, r, r * 0.6, r), hex(PR.bloc, 0.5), { grain: 0.1 });
    }
    for (let k = 0; k < (ctx.telephone ? 8 : 12); k++) {
      const a = (k / 12) * 6.283 + R() * 0.4, d = N / 2 + 3 + R() * 6;
      brume.push({ x: N / 2 + Math.cos(a) * d * 1.2, y: 0.4 + R() * 1.6, z: N / 2 + Math.sin(a) * d * 1.2, taille: 9 + R() * 8 });
    }

    // ----- Les éboulis : quelques cailloux sur les cases de gravier -----
    let n = 0;
    for (let y = 0; y < N && n < 18; y++) for (let x = 0; x < N && n < 18; x++) {
      if (at(x, y) !== ',' || R() < 0.55) continue;
      const s = 0.14 + R() * 0.14;
      piece(roche, L.cailloux[Math.floor(R() * L.cailloux.length)], mat(x + 0.2 + R() * 0.6, 0, y + 0.2 + R() * 0.6, 0, R() * 6.28, 0, s, s * 0.7, s), varie(PR.bloc, 0.2), { grain: 0.08 });
      n++;
    }

    // ----- Les accessoires du style : le fil d'or noué à son anneau de pierre -----
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

    // ----- Les maillages -----
    const groupe = new THREE.Group();
    const geos = { sol: geoSol(THREE), roche: IleDecor.fusion(roche), lueur: IleDecor.fusion(lueur) };
    const sol = new THREE.Mesh(geos.sol, mats.sol); sol.matrixAutoUpdate = false; sol.renderOrder = 1; groupe.add(sol);
    if (geos.roche) { const m = new THREE.Mesh(geos.roche, mats.roche); m.matrixAutoUpdate = false; groupe.add(m); }
    if (geos.lueur) { const m = new THREE.Mesh(geos.lueur, mats.lueur); m.matrixAutoUpdate = false; groupe.add(m); }
    for (const g of racines) g.dispose();
    // L'aire du combat pour la caméra : le carré entier, plat.
    const aire = { x0: 0, y0: 0, w: N, h: N, hMin: 0, hMax: 0, hMoy: 0, coins: [[0, 0, 0], [N, 0, 0], [0, N, 0], [N, N, 0]] };
    return { groupe, lanternes, halos, aire, geos, brume };
  }

  return { peindreSol, construire, PALETTES, PAROIS };
})();
