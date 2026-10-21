// Peinture procédurale pour le rendu WebGL (js/render-gl.js) : tout ce qui est « peint » une
// fois puis envoyé au GPU comme texture. Ciel, falaises de l'île, sols, décors, corps des
// personnages et des monstres, lueurs. Rien n'est chargé depuis un fichier : le jeu reste
// autonome, et une image d'artiste pourra remplacer chaque peintre sans toucher au moteur.
//
// Direction : la planche de la charte 1.0 (crépuscule bleu profond, or ancien, cristal bleu,
// pierre fissurée veinée d'or), par région (docs/DIRECTION-ARTISTIQUE.md).
const Paint = (() => {
  const OS = 2;   // suréchantillonnage des textures de décor et de personnage

  // ----- Bruit déterministe -----
  function hash(x, y, seed) {
    let h = (x * 374761393 + y * 668265263 + (seed || 0) * 974634211) ^ 0x5bd1e995;
    h = Math.imul(h ^ (h >>> 13), 1274126177);
    return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
  }
  // Bruit de valeur lissé ; le treillis boucle sur N pour une texture sans couture.
  function vnoise(x, y, N, seed) {
    const xi = Math.floor(x), yi = Math.floor(y), fx = x - xi, fy = y - yi;
    const sx = fx * fx * (3 - 2 * fx), sy = fy * fy * (3 - 2 * fy);
    const h = (i, j) => hash(((i % N) + N) % N, ((j % N) + N) % N, seed);
    const a = h(xi, yi), b = h(xi + 1, yi), c = h(xi, yi + 1), d = h(xi + 1, yi + 1);
    return a + (b - a) * sx + (c - a) * sy + (a - b - c + d) * sx * sy;
  }
  function fbm(x, y, oct, N, seed) {
    let v = 0, a = 0.5, f = 1, s = 0;
    for (let k = 0; k < oct; k++) { v += a * vnoise(x * f, y * f, N * f, seed + k * 17); s += a; a *= 0.5; f *= 2; }
    return v / s;
  }

  // ----- Couleurs -----
  const rgb = hex => { const v = parseInt(hex.slice(1), 16); return [(v >> 16) & 255, (v >> 8) & 255, v & 255]; };
  const hex = (r, g, b) => '#' + [r, g, b].map(v => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0')).join('');
  const mix = (a, b, t) => { const [r1, g1, b1] = rgb(a), [r2, g2, b2] = rgb(b); return hex(r1 + (r2 - r1) * t, g1 + (g2 - g1) * t, b1 + (b2 - b1) * t); };
  const rgba = (h, a) => { const [r, g, b] = rgb(h); return `rgba(${r},${g},${b},${a})`; };
  const light = (h, t) => mix(h, '#ffffff', t);
  const dark = (h, t) => mix(h, '#000000', t);
  const toInt = h => parseInt(h.slice(1), 16);

  // ----- Palettes par région : le crépuscule de la planche, décliné -----
  const PALETTES = {
    orsane: {
      skyTop: '#070d1b', skyMid: '#1a2a52', skyHorizon: '#7a4f6b', skyWarm: '#d9875a', skyBottom: '#0b1222',
      nebula: ['#5a3f9e', '#1f6fa0'], ambient: [0.50, 0.55, 0.78], ambientDay: [0.66, 0.70, 0.86],
      floorA: '#4e7a4a', floorB: '#5c8a55', floorDark: '#2f4d31', grassTip: '#9ccf7a', flower: '#f2d8a0',
      path: '#b7ad94', pathLight: '#d9d0b8', pathDark: '#7a705c', vein: '#e2c690', veinGlow: '#f6e3b8',
      water: '#1f5a8f', waterDeep: '#0d2f55', waterLight: '#6fc8ff', lava: false,
      hole: '#070b14', holeRim: '#3b4a63', rock: '#9aa3b5', rockDark: '#4d5466', rockLight: '#d5dbe6', moss: '#5f8f4e',
      crown: '#3b7a46', crownLight: '#79c267', crownDark: '#1f4228', trunk: '#5a4030', trunkDark: '#2e2018', dead: false,
      lantern: '#f2b134', glow: '#ffe7a3', cliff: '#4a5063', cliffDark: '#20242f', cliffLight: '#7f889c',
      crystal: '#00c2ff', crystalLight: '#b8f0ff', crystalRate: 0.07, fireflies: '#ffd98a', mist: '#8fb5e6',
    },
    kaldum: {
      skyTop: '#0a0708', skyMid: '#2a1418', skyHorizon: '#6b2a1f', skyWarm: '#e0632a', skyBottom: '#0d0808',
      nebula: ['#7a2a3a', '#3a1a5a'], ambient: [0.62, 0.42, 0.40], ambientDay: [0.72, 0.52, 0.48],
      floorA: '#4a3f3b', floorB: '#574a45', floorDark: '#2a2220', grassTip: '#8a6a4a', flower: '#ff8a4a',
      path: '#6e5e55', pathLight: '#8d7c70', pathDark: '#3e322d', vein: '#ffb37a', veinGlow: '#ffd9b0',
      water: '#ff6a1f', waterDeep: '#a8300e', waterLight: '#ffd27a', lava: true,
      hole: '#0a0504', holeRim: '#5a3a2a', rock: '#6b5a52', rockDark: '#2e2320', rockLight: '#9c8a7e', moss: '#6a4a3a',
      crown: '#4a3a30', crownLight: '#7a6453', crownDark: '#241a14', trunk: '#3a2e28', trunkDark: '#1a1210', dead: true,
      lantern: '#ff6a2b', glow: '#ffb37a', cliff: '#3a2a26', cliffDark: '#16100e', cliffLight: '#6a4e44',
      crystal: '#00c2ff', crystalLight: '#b8f0ff', crystalRate: 0.12, fireflies: '#ff8a3a', mist: '#7a4a3a',
    },
    thessa: {
      skyTop: '#06121c', skyMid: '#16405a', skyHorizon: '#5f8aa0', skyWarm: '#e0b070', skyBottom: '#071018',
      nebula: ['#2a7a9e', '#3a5aa0'], ambient: [0.5, 0.62, 0.7], ambientDay: [0.66, 0.76, 0.82],
      floorA: '#8f9a78', floorB: '#9ea886', floorDark: '#55603f', grassTip: '#c8d49a', flower: '#f5efc0',
      path: '#d6cdae', pathLight: '#ece5cb', pathDark: '#9a9070', vein: '#c9a66b', veinGlow: '#e8d5a0',
      water: '#1f8fa3', waterDeep: '#0e5a6e', waterLight: '#9ff0e6', lava: false,
      hole: '#0a1a1e', holeRim: '#3a5a60', rock: '#b9c7b4', rockDark: '#5f7a74', rockLight: '#e6efe2', moss: '#6e9a5a',
      crown: '#5e8f6a', crownLight: '#9ad28f', crownDark: '#2f5238', trunk: '#7a6346', trunkDark: '#3e3222', dead: false,
      lantern: '#35d6c8', glow: '#9ff0e6', cliff: '#5a6e6a', cliffDark: '#26332f', cliffLight: '#8fa39c',
      crystal: '#00c2ff', crystalLight: '#b8f0ff', crystalRate: 0.15, fireflies: '#9ff0e6', mist: '#a9d6e6',
    },
    lisiere: {
      skyTop: '#0a0712', skyMid: '#231a3a', skyHorizon: '#5a3a7a', skyWarm: '#b06aa0', skyBottom: '#0c0812',
      nebula: ['#8a3fbf', '#2a3f9e'], ambient: [0.5, 0.42, 0.66], ambientDay: [0.62, 0.55, 0.76],
      floorA: '#5e5a6e', floorB: '#686378', floorDark: '#342f40', grassTip: '#9a8ab8', flower: '#d08cff',
      path: '#8a8398', pathLight: '#aaa3b8', pathDark: '#4f4860', vein: '#d08cff', veinGlow: '#f0d6ff',
      water: '#5a3f9a', waterDeep: '#2f2460', waterLight: '#c8a8ff', lava: false,
      hole: '#0a0612', holeRim: '#4a3a60', rock: '#b5aeb4', rockDark: '#5c5466', rockLight: '#e0dbe0', moss: '#5a4e7a',
      crown: '#5a4e7a', crownLight: '#8f7fb8', crownDark: '#2e2640', trunk: '#3a3040', trunkDark: '#1a1420', dead: false,
      lantern: '#d08cff', glow: '#f0d6ff', cliff: '#3e3448', cliffDark: '#1a1420', cliffLight: '#6a5e78',
      crystal: '#a66cff', crystalLight: '#e2ccff', crystalRate: 0.3, fireflies: '#d08cff', mist: '#9a7ab8',
    },
    basvoiles: {
      skyTop: '#05030a', skyMid: '#160f26', skyHorizon: '#3a1a48', skyWarm: '#c0266e', skyBottom: '#07050b',
      nebula: ['#c0266e', '#4a2a8a'], ambient: [0.42, 0.34, 0.58], ambientDay: [0.5, 0.42, 0.66],
      floorA: '#2c2440', floorB: '#342b4a', floorDark: '#140f20', grassTip: '#6a4f8a', flower: '#ff7db0',
      path: '#4a3f62', pathLight: '#6a5e86', pathDark: '#241c34', vein: '#ff7db0', veinGlow: '#ffc0d8',
      water: '#5a2a6a', waterDeep: '#2a1234', waterLight: '#ff7db0', lava: false,
      hole: '#040208', holeRim: '#3a2a50', rock: '#4a3b5c', rockDark: '#1e1830', rockLight: '#7a6a8c', moss: '#3a2a50',
      crown: '#3a2a50', crownLight: '#6a4f8a', crownDark: '#1a1226', trunk: '#241a30', trunkDark: '#0e0a14', dead: true,
      lantern: '#c0266e', glow: '#ff7db0', cliff: '#241a30', cliffDark: '#0c0812', cliffLight: '#4a3a5c',
      crystal: '#a66cff', crystalLight: '#e2ccff', crystalRate: 0.4, fireflies: '#ff7db0', mist: '#5a3a7a',
    },
    lab: {
      skyTop: '#070b14', skyMid: '#14213a', skyHorizon: '#3a4a74', skyWarm: '#8a7aa0', skyBottom: '#090d16',
      nebula: ['#3f4f9e', '#1f6fa0'], ambient: [0.56, 0.6, 0.8], ambientDay: [0.7, 0.74, 0.88],
      floorA: '#2e3648', floorB: '#353e54', floorDark: '#1a2030', grassTip: '#5a6a8a', flower: '#9fd7ff',
      path: '#3f4a62', pathLight: '#5c6880', pathDark: '#242b3c', vein: '#e2c690', veinGlow: '#f6e3b8',
      water: '#1f5a8f', waterDeep: '#0d2f55', waterLight: '#6fc8ff', lava: false,
      hole: '#05070c', holeRim: '#2e3648', rock: '#8a93a6', rockDark: '#3e4454', rockLight: '#c7cfdc', moss: '#3e6a48',
      crown: '#3e6a48', crownLight: '#6aa060', crownDark: '#203828', trunk: '#4a3a30', trunkDark: '#241a14', dead: false,
      lantern: '#f2b134', glow: '#ffe7a3', cliff: '#3a4152', cliffDark: '#171b25', cliffLight: '#6a7388',
      crystal: '#00c2ff', crystalLight: '#b8f0ff', crystalRate: 0.1, fireflies: '#9fd7ff', mist: '#7f9ac8',
    },
  };

  function canvas(w, h) { const c = document.createElement('canvas'); c.width = Math.max(1, Math.round(w)); c.height = Math.max(1, Math.round(h)); return c; }

  // ----- Tuiles de bruit, en cache : motif « tacheté » et motif « coups de pinceau » -----
  const tiles = {};
  function noiseTile(kind) {
    if (tiles[kind]) return tiles[kind];
    const N = 256, cv = canvas(N, N), c = cv.getContext('2d'), img = c.createImageData(N, N), d = img.data;
    const f = kind === 'strokes' ? 6 : 5;
    for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
      let v;
      if (kind === 'strokes') v = fbm(x / N * f * 3, y / N * f, 3, f, 41);     // étiré en largeur : des traînées
      else if (kind === 'fine') v = fbm(x / N * 14, y / N * 14, 2, 14, 7);
      else v = fbm(x / N * f, y / N * f, 4, f, 3);
      const g = Math.round(64 + v * 128);
      const i = (y * N + x) * 4; d[i] = d[i + 1] = d[i + 2] = g; d[i + 3] = 255;
    }
    c.putImageData(img, 0, 0);
    tiles[kind] = cv;
    return cv;
  }
  const pattern = (c, kind) => c.createPattern(noiseTile(kind), 'repeat');

  function diamondPath(c, x, y, w, h) { c.beginPath(); c.moveTo(x, y - h / 2); c.lineTo(x + w / 2, y); c.lineTo(x, y + h / 2); c.lineTo(x - w / 2, y); c.closePath(); }

  // ----- Le ciel : dégradé du crépuscule, étoiles, nébuleuses, îles lointaines, rayon de cristal -----
  function sky(P, W, H) {
    const cv = canvas(W, H), c = cv.getContext('2d');
    const g = c.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, P.skyTop); g.addColorStop(0.45, P.skyMid); g.addColorStop(0.64, mix(P.skyMid, P.skyHorizon, 0.7)); g.addColorStop(0.73, mix(P.skyHorizon, P.skyWarm, 0.45)); g.addColorStop(0.8, mix(P.skyHorizon, P.skyBottom, 0.5)); g.addColorStop(1, P.skyBottom);
    c.fillStyle = g; c.fillRect(0, 0, W, H);
    // Nébuleuses
    for (let i = 0; i < 4; i++) {
      const x = W * (0.15 + 0.7 * hash(i, 3, 5)), y = H * (0.1 + 0.4 * hash(i, 9, 5)), r = W * (0.18 + 0.2 * hash(i, 2, 5));
      const n = c.createRadialGradient(x, y, 0, x, y, r);
      n.addColorStop(0, rgba(P.nebula[i % 2], 0.22)); n.addColorStop(0.5, rgba(P.nebula[i % 2], 0.08)); n.addColorStop(1, rgba(P.nebula[i % 2], 0));
      c.fillStyle = n; c.fillRect(x - r, y - r, r * 2, r * 2);
    }
    // Rayon de cristal vertical, comme sur la planche
    const bx = W * 0.64;
    const beam = c.createLinearGradient(bx - 28, 0, bx + 28, 0);
    beam.addColorStop(0, rgba(P.crystal, 0)); beam.addColorStop(0.5, rgba(P.crystalLight, 0.22)); beam.addColorStop(1, rgba(P.crystal, 0));
    c.fillStyle = beam; c.fillRect(bx - 28, 0, 56, H * 0.72);
    const core = c.createLinearGradient(bx - 5, 0, bx + 5, 0);
    core.addColorStop(0, rgba(P.crystalLight, 0)); core.addColorStop(0.5, rgba('#ffffff', 0.35)); core.addColorStop(1, rgba(P.crystalLight, 0));
    c.fillStyle = core; c.fillRect(bx - 5, 0, 10, H * 0.7);
    // Étoiles
    for (let i = 0; i < 260; i++) {
      const x = hash(i, 1, 9) * W, y = hash(i, 2, 9) * H * 0.62, a = 0.25 + 0.7 * hash(i, 3, 9), r = 0.5 + hash(i, 4, 9) * 1.3;
      c.fillStyle = `rgba(215,230,255,${a})`; c.beginPath(); c.arc(x, y, r, 0, Math.PI * 2); c.fill();
    }
    // Lune voilée (halo chaud) près de l'horizon
    const mx = W * 0.22, my = H * 0.58;
    const moon = c.createRadialGradient(mx, my, 4, mx, my, 120);
    moon.addColorStop(0, rgba(P.skyWarm, 0.5)); moon.addColorStop(0.3, rgba(P.skyWarm, 0.16)); moon.addColorStop(1, rgba(P.skyWarm, 0));
    c.fillStyle = moon; c.fillRect(mx - 120, my - 120, 240, 240);
    // Îles lointaines qui flottent
    for (let i = 0; i < 7; i++) {
      const x = W * (0.05 + 0.9 * hash(i, 5, 11)), y = H * (0.2 + 0.42 * hash(i, 6, 11)), s = 18 + 50 * hash(i, 7, 11);
      const far = 0.5 + 0.5 * hash(i, 8, 11);
      const col = mix(P.skyMid, P.cliffDark, 0.55 * far), top = mix(col, P.skyHorizon, 0.35);
      c.fillStyle = col;
      c.beginPath(); c.moveTo(x - s, y); c.lineTo(x + s, y); c.lineTo(x + s * 0.55, y + s * 0.9); c.lineTo(x + s * 0.1, y + s * 1.5); c.lineTo(x - s * 0.4, y + s * 0.8); c.closePath(); c.fill();
      c.fillStyle = top; c.beginPath(); c.ellipse(x, y, s, s * 0.22, 0, 0, Math.PI * 2); c.fill();
      if (hash(i, 9, 11) < 0.5) { c.fillStyle = rgba(P.lantern, 0.8); c.fillRect(x + s * 0.2, y - 3, 2, 3); }
    }
    // Brume de l'horizon
    const mist = c.createLinearGradient(0, H * 0.58, 0, H * 0.88);
    mist.addColorStop(0, rgba(P.mist, 0)); mist.addColorStop(0.5, rgba(P.mist, 0.12)); mist.addColorStop(1, rgba(P.mist, 0));
    c.fillStyle = mist; c.fillRect(0, H * 0.58, W, H * 0.3);
    // Sous l'île, le vide s'assombrit
    const deep = c.createLinearGradient(0, H * 0.78, 0, H);
    deep.addColorStop(0, rgba(P.skyBottom, 0)); deep.addColorStop(1, rgba(P.skyBottom, 0.85));
    c.fillStyle = deep; c.fillRect(0, H * 0.78, W, H * 0.22);
    return cv;
  }

  // ----- Le plateau : falaises, sols, dallages veinés d'or, eau, failles -----
  function cliffFace(c, P, A, B, Hc, side, seed) {
    const n = 14;
    const pts = [];
    for (let i = 0; i <= n; i++) {
      const t = i / n;
      const x = A.x + (B.x - A.x) * t, y = A.y + (B.y - A.y) * t;
      pts.push({ x, y, d: Hc * (0.72 + 0.4 * fbm(t * 4 + seed, side === 'gauche' ? 0.3 : 0.7, 3, 8, 23)) });
    }
    c.beginPath(); c.moveTo(A.x, A.y); c.lineTo(B.x, B.y);
    for (let i = n; i >= 0; i--) c.lineTo(pts[i].x + (side === 'gauche' ? -4 : 4) * Math.sin(i), pts[i].y + pts[i].d);
    c.closePath();
    const g = c.createLinearGradient(0, Math.min(A.y, B.y), 0, Math.max(A.y, B.y) + Hc);
    g.addColorStop(0, side === 'gauche' ? P.cliff : dark(P.cliff, 0.25)); g.addColorStop(0.55, side === 'gauche' ? dark(P.cliff, 0.3) : dark(P.cliff, 0.5)); g.addColorStop(1, P.cliffDark);
    c.fillStyle = g; c.fill();
    c.save(); c.clip();
    c.globalCompositeOperation = 'overlay'; c.globalAlpha = 0.6; c.fillStyle = pattern(c, 'mottle');
    c.fillRect(Math.min(A.x, B.x) - 20, Math.min(A.y, B.y) - 10, Math.abs(B.x - A.x) + 40, Hc * 1.3);
    c.globalCompositeOperation = 'source-over';
    // Strates parallèles à la lèvre
    for (let k = 1; k <= 5; k++) {
      const d = Hc * (0.1 + k * 0.14);
      c.globalAlpha = 0.5 - k * 0.06; c.strokeStyle = k % 2 ? P.cliffDark : rgba(P.cliffLight, 0.5); c.lineWidth = k % 2 ? 2.2 : 1;
      c.beginPath();
      for (let i = 0; i <= n; i++) c.lineTo(pts[i].x, pts[i].y + d + Math.sin(i * 1.7 + k) * 2.5);
      c.stroke();
    }
    // Crevasses
    c.globalAlpha = 0.65; c.strokeStyle = P.cliffDark; c.lineWidth = 2;
    for (let k = 0; k < 7; k++) {
      const t = hash(k, 1, seed), i = Math.floor(t * n), x = pts[i].x, y = pts[i].y;
      c.beginPath(); c.moveTo(x, y + 4); c.lineTo(x + 3, y + 18 + hash(k, 2, seed) * 20); c.lineTo(x - 2, y + 38 + hash(k, 3, seed) * 25); c.stroke();
    }
    // Racines qui pendent
    c.strokeStyle = P.trunkDark; c.lineWidth = 1.6; c.globalAlpha = 0.85;
    for (let k = 0; k < 5; k++) {
      const t = hash(k, 4, seed), i = Math.floor(t * n), x = pts[i].x, y = pts[i].y;
      c.beginPath(); c.moveTo(x, y); c.bezierCurveTo(x + 6, y + 12, x - 8, y + 20, x + 2, y + 30 + hash(k, 5, seed) * 18); c.stroke();
      c.beginPath(); c.moveTo(x + 1, y + 10); c.lineTo(x + 7, y + 22); c.stroke();
    }
    // Cristaux enchâssés
    for (let k = 0; k < 2; k++) {
      const t = 0.2 + 0.6 * hash(k, 6, seed), i = Math.floor(t * n), x = pts[i].x, y = pts[i].y + 14 + hash(k, 7, seed) * 30;
      const gl = c.createRadialGradient(x, y, 1, x, y, 22);
      gl.addColorStop(0, rgba(P.crystal, 0.45)); gl.addColorStop(1, rgba(P.crystal, 0));
      c.globalAlpha = 1; c.fillStyle = gl; c.fillRect(x - 22, y - 22, 44, 44);
      shard(c, x, y, 7, P, hash(k, 8, seed));
    }
    c.restore();
    // Lèvre de la falaise
    c.globalAlpha = 1; c.strokeStyle = rgba(P.cliffLight, 0.7); c.lineWidth = 1.5;
    c.beginPath(); c.moveTo(A.x, A.y); c.lineTo(B.x, B.y); c.stroke();
    // Le bas se perd dans le vide
    c.save(); c.globalCompositeOperation = 'destination-out';
    const fade = c.createLinearGradient(0, Math.max(A.y, B.y) + Hc * 0.45, 0, Math.max(A.y, B.y) + Hc * 1.15);
    fade.addColorStop(0, 'rgba(0,0,0,0)'); fade.addColorStop(1, 'rgba(0,0,0,1)');
    c.fillStyle = fade; c.fillRect(Math.min(A.x, B.x) - 30, Math.max(A.y, B.y) + Hc * 0.45, Math.abs(B.x - A.x) + 60, Hc);
    c.restore();
  }

  // Un éclat de cristal : losange étiré, face claire et face sombre, arête blanche.
  function shard(c, x, y, s, P, n) {
    const a = (n - 0.5) * 0.9, h = s * (1.6 + n), w = s * 0.55;
    c.save(); c.translate(x, y); c.rotate(a);
    c.fillStyle = dark(P.crystal, 0.45); c.beginPath(); c.moveTo(0, -h); c.lineTo(w, -h * 0.25); c.lineTo(0, h * 0.35); c.lineTo(-w, -h * 0.25); c.closePath(); c.fill();
    c.fillStyle = P.crystal; c.beginPath(); c.moveTo(0, -h); c.lineTo(w, -h * 0.25); c.lineTo(0, -h * 0.1); c.closePath(); c.fill();
    c.fillStyle = P.crystalLight; c.beginPath(); c.moveTo(0, -h); c.lineTo(-w, -h * 0.25); c.lineTo(0, -h * 0.1); c.closePath(); c.fill();
    c.strokeStyle = 'rgba(255,255,255,0.8)'; c.lineWidth = 0.8; c.beginPath(); c.moveTo(0, -h); c.lineTo(0, h * 0.3); c.stroke();
    c.restore();
  }

  function ground(map, P, geo) {
    const { W, H, dpr, origin, cliffH } = geo;
    const cv = canvas(W * dpr, H * dpr), c = cv.getContext('2d');
    c.setTransform(dpr, 0, 0, dpr, 0, 0);
    const TW = Grid.TILE_W, TH = Grid.TILE_H, w = map.w, h = map.h;
    const S = (x, y) => Grid.toScreen(x, y, origin);
    const t = S(0, 0); t.y -= TH / 2;
    const r = S(w - 1, 0); r.x += TW / 2;
    const b = S(w - 1, h - 1); b.y += TH / 2;
    const l = S(0, h - 1); l.x -= TW / 2;
    const tileAt = (x, y) => Grid.inBounds(map, x, y) ? map.cells[y][x] : -1;
    const kindAt = (x, y) => Grid.inBounds(map, x, y) ? map.kind[y][x] : '';
    const land = (x, y) => { const v = tileAt(x, y); return v !== -1 && v !== Grid.WATER && v !== Grid.HOLE; };
    // Distance au relais ou à une porte : les dallages de ville sont veinés d'or
    const marks = [];
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) if (kindAt(x, y) === 'Z' || kindAt(x, y) === 'D') marks.push({ x, y });
    const cityness = (x, y) => marks.reduce((m, k) => Math.max(m, 1 - Math.max(0, Grid.dist({ x, y }, k) - 1) / 4), 0);

    // Falaises
    cliffFace(c, P, l, b, cliffH, 'gauche', 3);
    cliffFace(c, P, b, r, cliffH, 'droite', 5);

    // Sols de base
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      const v = tileAt(x, y), k = kindAt(x, y), p = S(x, y);
      diamondPath(c, p.x, p.y, TW + 0.8, TH + 0.4);
      if (v === Grid.WATER) c.fillStyle = P.waterDeep;
      else if (v === Grid.HOLE) c.fillStyle = P.hole;
      else if (k === ',') c.fillStyle = P.path;
      else { const n = fbm(x * 0.9, y * 0.9, 2, 64, 1); c.fillStyle = mix(P.floorA, P.floorB, n); }
      c.fill();
    }
    // Grain continu sur toutes les terres
    c.save();
    c.beginPath(); c.moveTo(t.x, t.y); c.lineTo(r.x, r.y); c.lineTo(b.x, b.y); c.lineTo(l.x, l.y); c.closePath(); c.clip();
    c.globalCompositeOperation = 'overlay'; c.globalAlpha = 0.55; c.fillStyle = pattern(c, 'mottle'); c.fillRect(l.x, t.y, r.x - l.x, b.y - t.y);
    c.globalCompositeOperation = 'soft-light'; c.globalAlpha = 0.5; c.fillStyle = pattern(c, 'strokes'); c.fillRect(l.x, t.y, r.x - l.x, b.y - t.y);
    c.globalCompositeOperation = 'overlay'; c.globalAlpha = 0.25; c.fillStyle = pattern(c, 'fine'); c.fillRect(l.x, t.y, r.x - l.x, b.y - t.y);
    c.restore();

    // Détails par case
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      const v = tileAt(x, y), k = kindAt(x, y), p = S(x, y), n = hash(x, y, 2), n2 = hash(y, x, 4);
      if (v === Grid.WATER) {
        diamondPath(c, p.x, p.y, TW + 0.8, TH + 0.4);
        const g = c.createLinearGradient(p.x, p.y - TH / 2, p.x, p.y + TH / 2);
        if (P.lava) { g.addColorStop(0, P.water); g.addColorStop(1, P.waterDeep); }
        else { g.addColorStop(0, mix(P.water, P.waterDeep, 0.3)); g.addColorStop(1, P.waterDeep); }
        c.fillStyle = g; c.fill();
        // Bord sombre contre la terre : la profondeur
        c.save(); c.clip();
        c.lineWidth = 6; c.strokeStyle = P.lava ? rgba(P.waterLight, 0.35) : 'rgba(0,0,0,0.35)';
        const edges = [[x - 1, y, [p.x - TW / 2, p.y, p.x, p.y - TH / 2]], [x, y - 1, [p.x, p.y - TH / 2, p.x + TW / 2, p.y]], [x + 1, y, [p.x + TW / 2, p.y, p.x, p.y + TH / 2]], [x, y + 1, [p.x, p.y + TH / 2, p.x - TW / 2, p.y]]];
        for (const [nx, ny, e] of edges) if (land(nx, ny)) { c.beginPath(); c.moveTo(e[0], e[1]); c.lineTo(e[2], e[3]); c.stroke(); }
        if (P.lava) {
          c.fillStyle = dark(P.waterDeep, 0.6);
          for (let i = 0; i < 3; i++) { const cx = p.x + (hash(x, y, 10 + i) - 0.5) * 36, cy = p.y + (hash(y, x, 10 + i) - 0.5) * 14; c.beginPath(); c.ellipse(cx, cy, 5 + hash(x, y, 20 + i) * 6, 2 + hash(x, y, 30 + i) * 3, hash(x, y, 40 + i) * 3, 0, Math.PI * 2); c.fill(); }
        } else {
          c.strokeStyle = rgba(P.waterLight, 0.35); c.lineWidth = 1.2;
          c.beginPath(); c.moveTo(p.x - 16, p.y + 3 + (n - 0.5) * 8); c.quadraticCurveTo(p.x - 4, p.y - 3 + (n - 0.5) * 8, p.x + 8, p.y + 2 + (n - 0.5) * 8); c.stroke();
        }
        c.restore();
      } else if (v === Grid.HOLE) {
        diamondPath(c, p.x, p.y, TW + 0.8, TH + 0.4);
        const g = c.createRadialGradient(p.x, p.y + 4, 2, p.x, p.y, TW * 0.55);
        g.addColorStop(0, P.hole); g.addColorStop(1, mix(P.hole, P.holeRim, 0.35));
        c.fillStyle = g; c.fill();
        c.save(); c.clip();
        // Parois du fond : strates sur les deux arêtes arrière
        for (let i = 1; i <= 3; i++) {
          c.strokeStyle = rgba(P.holeRim, 0.55 - i * 0.14); c.lineWidth = 1.5;
          c.beginPath(); c.moveTo(p.x - TW / 2 + i * 7, p.y - i * 1.2); c.lineTo(p.x, p.y - TH / 2 + i * 3.5); c.lineTo(p.x + TW / 2 - i * 7, p.y - i * 1.2); c.stroke();
        }
        if (n < 0.3) { const gl = c.createRadialGradient(p.x, p.y + 3, 0, p.x, p.y + 3, 10); gl.addColorStop(0, rgba(P.crystal, 0.5)); gl.addColorStop(1, rgba(P.crystal, 0)); c.fillStyle = gl; c.fillRect(p.x - 10, p.y - 7, 20, 20); }
        c.restore();
      } else if (k === ',') {
        // Dalle biseautée : lumière sur les arêtes nord, ombre sur les arêtes sud, joints sombres
        c.save(); diamondPath(c, p.x, p.y, TW - 1.5, TH - 0.75); c.clip();
        const g = c.createLinearGradient(p.x - TW / 2, p.y - TH / 2, p.x + TW / 2, p.y + TH / 2);
        g.addColorStop(0, mix(P.path, P.pathLight, 0.5 * n2)); g.addColorStop(1, mix(P.path, P.pathDark, 0.35 + 0.3 * n));
        c.fillStyle = g; c.globalAlpha = 0.85; c.fill(); c.globalAlpha = 1;
        c.lineWidth = 2.2; c.strokeStyle = rgba(P.pathLight, 0.55);
        c.beginPath(); c.moveTo(p.x - TW / 2 + 2, p.y); c.lineTo(p.x, p.y - TH / 2 + 1); c.lineTo(p.x + TW / 2 - 2, p.y); c.stroke();
        c.strokeStyle = rgba(P.pathDark, 0.6);
        c.beginPath(); c.moveTo(p.x - TW / 2 + 2, p.y); c.lineTo(p.x, p.y + TH / 2 - 1); c.lineTo(p.x + TW / 2 - 2, p.y); c.stroke();
        // Fissures
        const cracks = 1 + Math.floor(n * 2.2);
        c.strokeStyle = rgba(P.pathDark, 0.75); c.lineWidth = 1;
        for (let i = 0; i < cracks; i++) {
          const sx = p.x + (hash(x, y, 50 + i) - 0.5) * 34, sy = p.y + (hash(y, x, 50 + i) - 0.5) * 12;
          c.beginPath(); c.moveTo(sx, sy);
          let cx = sx, cy = sy;
          for (let j = 0; j < 3; j++) { cx += (hash(x, y, 60 + i * 3 + j) - 0.5) * 16; cy += (hash(y, x, 60 + i * 3 + j) - 0.4) * 7; c.lineTo(cx, cy); }
          c.stroke();
          // Veine d'or dans la fissure, en ville surtout
          const gold = cityness(x, y) > 0.4 ? n2 < 0.55 : n2 < 0.08;
          if (gold && i === 0) {
            c.save(); c.globalCompositeOperation = 'lighter';
            c.strokeStyle = rgba(P.veinGlow, 0.25); c.lineWidth = 4; c.stroke();
            c.strokeStyle = P.vein; c.lineWidth = 1.2; c.stroke();
            c.restore();
          }
        }
        c.restore();
        c.strokeStyle = rgba(P.pathDark, 0.5); c.lineWidth = 1.2; diamondPath(c, p.x, p.y, TW - 1, TH - 0.5); c.stroke();
      } else {
        // Herbe : touffes et fleurs clairsemées, plus denses loin des chemins
        if (n < 0.34) {
          c.lineWidth = 1.3; c.lineCap = 'round';
          for (let i = 0; i < 3; i++) {
            const gx = p.x + (hash(x, y, 70 + i) - 0.5) * 40, gy = p.y + (hash(y, x, 70 + i) - 0.5) * 16, hh = 5 + hash(x, y, 80 + i) * 5;
            c.strokeStyle = rgba(P.floorDark, 0.8); c.beginPath(); c.moveTo(gx, gy + 1); c.quadraticCurveTo(gx + 2, gy - hh * 0.5, gx + 3, gy - hh); c.stroke();
            c.strokeStyle = rgba(P.grassTip, 0.75); c.beginPath(); c.moveTo(gx + 1, gy - hh * 0.4); c.lineTo(gx + 3, gy - hh); c.stroke();
          }
        }
        if (n2 < 0.06 && !P.dead) { c.fillStyle = P.flower; for (let i = 0; i < 2; i++) { c.beginPath(); c.arc(p.x + (hash(x, y, 90 + i) - 0.5) * 30, p.y + (hash(y, x, 90 + i) - 0.5) * 12, 1.6, 0, Math.PI * 2); c.fill(); } }
        // Ombre douce des cases hautes voisines (rochers, arbres) sur le sol
        if (tileAt(x - 1, y) === Grid.ROCK || tileAt(x, y - 1) === Grid.ROCK || tileAt(x - 1, y) === Grid.TREE || tileAt(x, y - 1) === Grid.TREE) {
          c.save(); diamondPath(c, p.x, p.y, TW, TH); c.clip();
          const sh = c.createLinearGradient(p.x, p.y - TH / 2, p.x, p.y + TH / 2);
          sh.addColorStop(0, 'rgba(0,0,0,0.28)'); sh.addColorStop(1, 'rgba(0,0,0,0)');
          c.fillStyle = sh; c.fillRect(p.x - TW / 2, p.y - TH / 2, TW, TH);
          c.restore();
        }
      }
      // Sorties : chevrons d'or
      if ('nsew'.includes(k) && k !== '') {
        const d = { n: [0, -1], s: [0, 1], e: [1, 0], w: [-1, 0] }[k];
        const dir = { x: (d[0] - d[1]) * 0.5, y: (d[0] + d[1]) * 0.25 };
        c.strokeStyle = rgba(P.vein, 0.8); c.lineWidth = 2; c.lineCap = 'round';
        for (let i = 0; i < 2; i++) {
          const cx = p.x + dir.x * (8 + i * 10), cy = p.y + dir.y * (8 + i * 10);
          c.beginPath(); c.moveTo(cx - dir.y * 12 - dir.x * 6, cy + dir.x * 6 - dir.y * 6); c.lineTo(cx, cy); c.lineTo(cx + dir.y * 12 - dir.x * 6, cy - dir.x * 6 - dir.y * 6); c.stroke();
        }
      }
    }
    // Assombrissement du bord du plateau et lèvre claire
    c.save();
    c.beginPath(); c.moveTo(t.x, t.y); c.lineTo(r.x, r.y); c.lineTo(b.x, b.y); c.lineTo(l.x, l.y); c.closePath(); c.clip();
    c.strokeStyle = 'rgba(0,0,0,0.35)'; c.lineWidth = 26; c.globalAlpha = 0.5;
    c.beginPath(); c.moveTo(t.x, t.y); c.lineTo(r.x, r.y); c.lineTo(b.x, b.y); c.lineTo(l.x, l.y); c.closePath(); c.stroke();
    c.restore();
    c.strokeStyle = rgba(P.cliffLight, 0.55); c.lineWidth = 1.2; c.globalAlpha = 1;
    c.beginPath(); c.moveTo(l.x, l.y); c.lineTo(b.x, b.y); c.lineTo(r.x, r.y); c.stroke();
    return cv;
  }

  // ----- Décors : chaque peintre rend { canvas, ax, ay } ; (ax, ay) est le point au sol -----
  function sprite(w, h, ax, ay, fn) {
    const cv = canvas(w * OS, h * OS), c = cv.getContext('2d');
    c.scale(OS, OS); c.lineJoin = 'round'; c.lineCap = 'round';
    fn(c);
    return { canvas: cv, ax: ax * OS, ay: ay * OS, scale: 1 / OS };
  }

  function rock(P, n, crystal) {
    return sprite(80, 72, 40, 62, c => {
      const w = 22 + n * 7, h = 10 + n * 4, z = 14 + n * 12, x = 40, y = 62;
      // Facettes : gauche, droite, dessus, avec un éclairage venu d'en haut à gauche
      const gL = c.createLinearGradient(x - w, y - z, x, y + h); gL.addColorStop(0, P.rock); gL.addColorStop(1, P.rockDark);
      c.fillStyle = gL; c.beginPath(); c.moveTo(x - w, y - 1); c.lineTo(x - w * 0.9, y - z); c.lineTo(x + 2, y + h - z - 4); c.lineTo(x, y + h); c.closePath(); c.fill();
      const gR = c.createLinearGradient(x, y - z, x + w, y + h); gR.addColorStop(0, dark(P.rock, 0.35)); gR.addColorStop(1, dark(P.rockDark, 0.4));
      c.fillStyle = gR; c.beginPath(); c.moveTo(x + w, y - 2); c.lineTo(x + w * 0.85, y - z - 2); c.lineTo(x + 2, y + h - z - 4); c.lineTo(x, y + h); c.closePath(); c.fill();
      const gT = c.createLinearGradient(x - w, y - h - z, x + w * 0.5, y - z + 4); gT.addColorStop(0, P.rockLight); gT.addColorStop(1, P.rock);
      c.fillStyle = gT; c.beginPath(); c.moveTo(x - 4, y - h - z - 3); c.lineTo(x + w * 0.85, y - z - 2); c.lineTo(x + 2, y + h - z - 4); c.lineTo(x - w * 0.9, y - z); c.closePath(); c.fill();
      // Petite facette cassée
      c.fillStyle = light(P.rockLight, 0.3); c.beginPath(); c.moveTo(x - 4, y - h - z - 3); c.lineTo(x + 6, y - z - 7); c.lineTo(x - 8, y - z - 4); c.closePath(); c.fill();
      // Contour et arêtes
      c.strokeStyle = 'rgba(0,0,0,0.55)'; c.lineWidth = 1.4;
      c.beginPath(); c.moveTo(x - w, y - 1); c.lineTo(x - w * 0.9, y - z); c.lineTo(x - 4, y - h - z - 3); c.lineTo(x + w * 0.85, y - z - 2); c.lineTo(x + w, y - 2); c.lineTo(x, y + h); c.closePath(); c.stroke();
      c.strokeStyle = 'rgba(0,0,0,0.3)'; c.beginPath(); c.moveTo(x + 2, y + h - z - 4); c.lineTo(x, y + h); c.stroke();
      // Lumière de bord en haut à gauche, fissure, mousse et veine
      c.strokeStyle = rgba(P.rockLight, 0.9); c.lineWidth = 1; c.beginPath(); c.moveTo(x - w * 0.9, y - z); c.lineTo(x - 4, y - h - z - 3); c.stroke();
      c.strokeStyle = rgba(P.rockDark, 0.8); c.lineWidth = 1; c.beginPath(); c.moveTo(x - 10, y - z - 2); c.lineTo(x - 6, y - z + 6); c.lineTo(x - 9, y - z + 12); c.stroke();
      if (n > 0.55) { c.save(); c.globalCompositeOperation = 'lighter'; c.strokeStyle = rgba(P.vein, 0.9); c.lineWidth = 1; c.beginPath(); c.moveTo(x + 6, y - z - 4); c.lineTo(x + 9, y - z + 4); c.lineTo(x + 14, y - z + 8); c.stroke(); c.restore(); }
      if (!P.dead) { c.fillStyle = rgba(P.moss, 0.7); c.beginPath(); c.ellipse(x - w * 0.55, y + 1, w * 0.45, 4, 0, Math.PI, Math.PI * 2); c.fill(); }
      if (crystal) { for (let i = 0; i < 3; i++) shard(c, x + (i - 1) * 7 + (n - 0.5) * 6, y - h - z + 2 + i * 1.5, 5 + i, P, hash(i, 1, Math.round(n * 100))); }
    });
  }

  function tree(P, n) {
    return sprite(96, 110, 48, 102, c => {
      const x = 48, y = 102, hgt = 46 + n * 16;
      // Tronc évasé, écorce
      const gT = c.createLinearGradient(x - 6, 0, x + 6, 0); gT.addColorStop(0, light(P.trunk, 0.15)); gT.addColorStop(0.55, P.trunk); gT.addColorStop(1, P.trunkDark);
      c.fillStyle = gT; c.beginPath(); c.moveTo(x - 4, y - hgt + 10); c.lineTo(x + 4, y - hgt + 10); c.lineTo(x + 7, y - 2); c.lineTo(x + 12, y + 1); c.lineTo(x - 12, y + 1); c.lineTo(x - 7, y - 2); c.closePath(); c.fill();
      c.strokeStyle = rgba(P.trunkDark, 0.8); c.lineWidth = 1; for (let i = 0; i < 3; i++) { c.beginPath(); c.moveTo(x - 2 + i * 2, y - 6 - i * 10); c.lineTo(x - 1 + i * 2, y - 16 - i * 10); c.stroke(); }
      if (P.dead) {
        // Arbre mort : branches nues, quelques feuilles sombres
        c.strokeStyle = P.trunk; c.lineWidth = 3;
        for (const [dx, dy, ex, ey] of [[0, -hgt + 12, -18, -hgt - 6], [0, -hgt + 16, 16, -hgt - 2], [0, -hgt + 24, -10, -hgt + 2], [0, -hgt + 20, 12, -hgt + 14]]) { c.beginPath(); c.moveTo(x + dx, y + dy); c.quadraticCurveTo(x + (dx + ex) / 2 + 4, y + (dy + ey) / 2, x + ex, y + ey); c.stroke(); }
        c.fillStyle = rgba(P.crown, 0.9); for (let i = 0; i < 6; i++) { c.beginPath(); c.ellipse(x + (hash(i, 1, 3) - 0.5) * 40, y - hgt + 4 + (hash(i, 2, 3) - 0.5) * 20, 7, 4, hash(i, 3, 3), 0, Math.PI * 2); c.fill(); }
        return;
      }
      // Feuillage en trois étages : du sombre en bas au clair en haut, éclairé en haut à gauche
      const layers = [[0, -hgt + 2, 30, 20, 0.0], [-13, -hgt + 12, 20, 14, 0.15], [14, -hgt + 10, 19, 13, 0.1], [-4, -hgt - 12, 22, 15, 0.3], [9, -hgt - 6, 16, 11, 0.4]];
      for (const [dx, dy, rx, ry, lt] of layers) {
        const cx = x + dx, cy = y + dy;
        const g = c.createRadialGradient(cx - rx * 0.4, cy - ry * 0.5, 1, cx, cy, rx * 1.1);
        g.addColorStop(0, mix(P.crownLight, '#ffffff', lt * 0.4)); g.addColorStop(0.45, mix(P.crown, P.crownLight, lt)); g.addColorStop(1, P.crownDark);
        c.fillStyle = g; c.beginPath(); c.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2); c.fill();
        // Touches de feuilles
        c.fillStyle = rgba(P.crownLight, 0.55);
        for (let i = 0; i < 5; i++) { const a = hash(i, dx, 7) * Math.PI * 2, rr = hash(i, dy, 7) * 0.8; c.beginPath(); c.ellipse(cx + Math.cos(a) * rx * rr - rx * 0.2, cy + Math.sin(a) * ry * rr - ry * 0.25, 3.2, 1.8, a, 0, Math.PI * 2); c.fill(); }
      }
      // Liseré de lumière et contour doux
      c.strokeStyle = rgba(P.crownLight, 0.5); c.lineWidth = 1.2; c.beginPath(); c.ellipse(x - 4, y - hgt - 12, 22, 15, 0, Math.PI * 1.05, Math.PI * 1.8); c.stroke();
      c.strokeStyle = rgba(P.crownDark, 0.7); c.lineWidth = 1; c.beginPath(); c.ellipse(x, y - hgt + 2, 30, 20, 0, 0.1, Math.PI * 0.9); c.stroke();
    });
  }

  function lantern(P) {
    return sprite(40, 64, 20, 60, c => {
      const x = 20, y = 60;
      c.strokeStyle = '#2a2d3a'; c.lineWidth = 3.5; c.beginPath(); c.moveTo(x, y); c.lineTo(x, y - 38); c.stroke();
      c.strokeStyle = '#555a6c'; c.lineWidth = 1.2; c.beginPath(); c.moveTo(x - 1, y - 2); c.lineTo(x - 1, y - 36); c.stroke();
      c.fillStyle = '#2a2d3a'; c.beginPath(); c.ellipse(x, y, 6, 2.5, 0, 0, Math.PI * 2); c.fill();
      c.strokeStyle = '#2a2d3a'; c.lineWidth = 2.5; c.beginPath(); c.moveTo(x, y - 38); c.quadraticCurveTo(x + 10, y - 40, x + 10, y - 50); c.stroke();
      // Boîtier à vitres, verre chaud
      const bx = x + 10, by = y - 50;
      c.fillStyle = '#2a2d3a'; c.beginPath(); c.moveTo(bx - 6, by + 2); c.lineTo(bx + 6, by + 2); c.lineTo(bx + 5, by + 14); c.lineTo(bx - 5, by + 14); c.closePath(); c.fill();
      c.beginPath(); c.moveTo(bx - 4, by + 2); c.lineTo(bx, by - 3); c.lineTo(bx + 4, by + 2); c.closePath(); c.fill();
      const g = c.createRadialGradient(bx, by + 8, 0, bx, by + 8, 7); g.addColorStop(0, '#fff6d6'); g.addColorStop(0.4, P.lantern); g.addColorStop(1, dark(P.lantern, 0.3));
      c.fillStyle = g; c.fillRect(bx - 4, by + 3.5, 8, 9);
      c.strokeStyle = '#2a2d3a'; c.lineWidth = 1; c.beginPath(); c.moveTo(bx, by + 3.5); c.lineTo(bx, by + 12.5); c.stroke();
      c.fillStyle = rgba(P.vein, 0.9); c.fillRect(bx - 6.5, by + 1, 13, 1.5);
    });
  }

  function door(P) {
    return sprite(72, 80, 36, 72, c => {
      const x = 36, y = 72;
      // Montants de pierre, blocs
      const g = c.createLinearGradient(x - 24, 0, x + 24, 0); g.addColorStop(0, P.rockLight); g.addColorStop(0.5, P.rock); g.addColorStop(1, P.rockDark);
      c.fillStyle = g; c.beginPath(); c.moveTo(x - 24, y + 2); c.lineTo(x - 24, y - 34); c.quadraticCurveTo(x, y - 66, x + 24, y - 34); c.lineTo(x + 24, y + 2); c.closePath(); c.fill();
      c.strokeStyle = 'rgba(0,0,0,0.5)'; c.lineWidth = 1.4; c.stroke();
      c.strokeStyle = 'rgba(0,0,0,0.3)'; c.lineWidth = 1;
      for (let i = 0; i < 4; i++) { c.beginPath(); c.moveTo(x - 24, y - 6 - i * 9); c.lineTo(x - 15, y - 6 - i * 9); c.moveTo(x + 15, y - 6 - i * 9); c.lineTo(x + 24, y - 6 - i * 9); c.stroke(); }
      // L'ouverture : nuit et lueur de cristal au fond
      const inner = c.createLinearGradient(0, y - 50, 0, y);
      inner.addColorStop(0, '#05070d'); inner.addColorStop(0.7, '#0a1424'); inner.addColorStop(1, rgba(P.crystal, 0.35));
      c.fillStyle = inner; c.beginPath(); c.moveTo(x - 14, y + 1); c.lineTo(x - 14, y - 30); c.quadraticCurveTo(x, y - 52, x + 14, y - 30); c.lineTo(x + 14, y + 1); c.closePath(); c.fill();
      c.strokeStyle = rgba(P.crystal, 0.5); c.lineWidth = 1; for (let i = 0; i < 3; i++) { c.beginPath(); c.moveTo(x - 12 + i * 2, y - 4 - i * 6); c.lineTo(x + 12 - i * 2, y - 4 - i * 6); c.stroke(); }
      // Liseré d'or ciselé sur l'arche
      c.strokeStyle = P.vein; c.lineWidth = 2.2; c.beginPath(); c.moveTo(x - 22, y - 34); c.quadraticCurveTo(x, y - 64, x + 22, y - 34); c.stroke();
      c.strokeStyle = rgba(P.veinGlow, 0.7); c.lineWidth = 0.8; c.beginPath(); c.moveTo(x - 22, y - 35); c.quadraticCurveTo(x, y - 65, x + 22, y - 35); c.stroke();
      c.fillStyle = P.vein; c.beginPath(); c.moveTo(x, y - 66); c.lineTo(x + 5, y - 60); c.lineTo(x, y - 54); c.lineTo(x - 5, y - 60); c.closePath(); c.fill();
      c.fillStyle = P.crystal; c.beginPath(); c.moveTo(x, y - 64); c.lineTo(x + 3, y - 60); c.lineTo(x, y - 56); c.lineTo(x - 3, y - 60); c.closePath(); c.fill();
    });
  }

  function relay(P) {
    return sprite(56, 84, 28, 78, c => {
      const x = 28, y = 78;
      c.fillStyle = P.rockDark; c.beginPath(); c.ellipse(x, y, 16, 6, 0, 0, Math.PI * 2); c.fill();
      c.fillStyle = P.rock; c.beginPath(); c.ellipse(x, y - 3, 14, 5, 0, 0, Math.PI * 2); c.fill();
      // Obélisque à facettes
      const gL = c.createLinearGradient(x - 9, 0, x, 0); gL.addColorStop(0, P.rockLight); gL.addColorStop(1, P.rock);
      c.fillStyle = gL; c.beginPath(); c.moveTo(x - 9, y - 4); c.lineTo(x - 5, y - 56); c.lineTo(x, y - 58); c.lineTo(x, y - 2); c.closePath(); c.fill();
      const gR = c.createLinearGradient(x, 0, x + 9, 0); gR.addColorStop(0, dark(P.rock, 0.2)); gR.addColorStop(1, P.rockDark);
      c.fillStyle = gR; c.beginPath(); c.moveTo(x + 9, y - 4); c.lineTo(x + 5, y - 56); c.lineTo(x, y - 58); c.lineTo(x, y - 2); c.closePath(); c.fill();
      c.strokeStyle = 'rgba(0,0,0,0.5)'; c.lineWidth = 1.2; c.beginPath(); c.moveTo(x - 9, y - 4); c.lineTo(x - 5, y - 56); c.lineTo(x, y - 58); c.lineTo(x + 5, y - 56); c.lineTo(x + 9, y - 4); c.stroke();
      // Gravures d'or
      c.save(); c.globalCompositeOperation = 'lighter'; c.strokeStyle = rgba(P.vein, 0.9); c.lineWidth = 1;
      for (let i = 0; i < 4; i++) { c.beginPath(); c.moveTo(x - 6 + i * 0.5, y - 14 - i * 10); c.lineTo(x - 1, y - 12 - i * 10); c.lineTo(x - 6 + i * 0.5, y - 10 - i * 10); c.stroke(); }
      c.restore();
      // Cristal au sommet, serti d'or
      c.fillStyle = P.vein; c.beginPath(); c.moveTo(x, y - 78); c.lineTo(x + 9, y - 66); c.lineTo(x, y - 54); c.lineTo(x - 9, y - 66); c.closePath(); c.fill();
      c.fillStyle = P.crystal; c.beginPath(); c.moveTo(x, y - 75); c.lineTo(x + 6, y - 66); c.lineTo(x, y - 57); c.lineTo(x - 6, y - 66); c.closePath(); c.fill();
      c.fillStyle = P.crystalLight; c.beginPath(); c.moveTo(x, y - 75); c.lineTo(x + 6, y - 66); c.lineTo(x, y - 66); c.closePath(); c.fill();
      c.fillStyle = '#ffffff'; c.beginPath(); c.moveTo(x - 1, y - 73); c.lineTo(x + 1, y - 70); c.lineTo(x - 1, y - 67); c.lineTo(x - 3, y - 70); c.closePath(); c.fill();
    });
  }

  function crystal(P, n) {
    return sprite(48, 44, 24, 40, c => {
      for (let i = 0; i < 4; i++) shard(c, 24 + (i - 1.5) * 7, 36 - i % 2 * 3, 6 + hash(i, 2, 9) * 5, P, hash(i, 3, Math.round(n * 100)));
    });
  }

  // ----- Corps des personnages et des monstres, avec volume -----
  function body(s) {
    return sprite(72, 72, 36, 64, c => {
      const x = 36, y = 64, top = y - 42;
      const color = s.flash ? '#ffffff' : s.color;
      const grad = (x0, y0, x1, y1) => { const g = c.createLinearGradient(x0, y0, x1, y1); g.addColorStop(0, light(color, 0.38)); g.addColorStop(0.5, color); g.addColorStop(1, dark(color, 0.45)); return g; };
      const rim = () => { const g = c.createLinearGradient(x - 16, top, x + 12, y); g.addColorStop(0, rgba(light(color, 0.75), 0.95)); g.addColorStop(0.55, rgba(light(color, 0.75), 0)); return g; };
      c.lineWidth = 2; c.strokeStyle = 'rgba(0,0,0,0.6)';
      const finish = () => { c.stroke(); c.save(); c.strokeStyle = rim(); c.lineWidth = 1.6; c.stroke(); c.restore(); };
      const eyes = (ex, ey, gap, r = 3) => {
        c.fillStyle = 'rgba(0,0,0,0.25)'; c.beginPath(); c.ellipse(ex - gap, ey + 1, r + 1, r + 0.5, 0, 0, Math.PI * 2); c.ellipse(ex + gap, ey + 1, r + 1, r + 0.5, 0, 0, Math.PI * 2); c.fill();
        c.fillStyle = '#ffffff'; c.beginPath(); c.arc(ex - gap, ey, r, 0, Math.PI * 2); c.arc(ex + gap, ey, r, 0, Math.PI * 2); c.fill();
        c.fillStyle = '#14100a'; c.beginPath(); c.arc(ex - gap + 1, ey, r * 0.5, 0, Math.PI * 2); c.arc(ex + gap + 1, ey, r * 0.5, 0, Math.PI * 2); c.fill();
        c.fillStyle = 'rgba(255,255,255,0.9)'; c.beginPath(); c.arc(ex - gap + 0.4, ey - 1, r * 0.22, 0, Math.PI * 2); c.arc(ex + gap + 0.4, ey - 1, r * 0.22, 0, Math.PI * 2); c.fill();
      };
      switch (s.shape) {
        case 'player': {
          c.fillStyle = '#1a1510'; c.beginPath(); c.roundRect(x - 7.5, y - 15, 5.5, 14, 2); c.roundRect(x + 2, y - 15, 5.5, 14, 2); c.fill();
          c.fillStyle = '#2a2018'; c.fillRect(x - 8, y - 2, 6.5, 2.5); c.fillRect(x + 1.5, y - 2, 6.5, 2.5);
          // Cape, en pans, dans la couleur assombrie
          const cg = c.createLinearGradient(x - 14, top + 10, x + 4, y); cg.addColorStop(0, dark(color, 0.3)); cg.addColorStop(1, dark(color, 0.7));
          c.fillStyle = cg; c.beginPath(); c.moveTo(x - 11, top + 12); c.lineTo(x - 15, y - 6); c.lineTo(x - 9, y - 9); c.lineTo(x - 5, y - 5); c.lineTo(x + 3, y - 10); c.lineTo(x + 5, top + 12); c.closePath(); c.fill(); c.stroke();
          c.strokeStyle = 'rgba(0,0,0,0.3)'; c.lineWidth = 1; c.beginPath(); c.moveTo(x - 8, top + 16); c.lineTo(x - 10, y - 10); c.moveTo(x - 2, top + 16); c.lineTo(x - 3, y - 9); c.stroke();
          // Tunique
          c.lineWidth = 2; c.strokeStyle = 'rgba(0,0,0,0.6)';
          c.fillStyle = grad(x - 10, top + 10, x + 10, top + 34); c.beginPath(); c.roundRect(x - 10, top + 10, 20, 24, 5); c.fill(); finish();
          c.fillStyle = '#5c4628'; c.fillRect(x - 10, top + 26, 20, 3); c.fillStyle = '#e2c690'; c.fillRect(x - 2, top + 25.5, 4, 4);
          // Tête, capuche de la couleur de la classe
          const sk = c.createRadialGradient(x - 3, top - 1, 1, x, top + 2, 10); sk.addColorStop(0, '#ffe9d2'); sk.addColorStop(1, '#d9b596');
          c.fillStyle = sk; c.beginPath(); c.arc(x, top + 2, 9, 0, Math.PI * 2); c.fill(); c.stroke();
          c.fillStyle = grad(x - 10, top - 10, x + 10, top); c.beginPath(); c.arc(x, top - 1, 9.6, Math.PI, Math.PI * 2); c.lineTo(x + 9.6, top + 2); c.quadraticCurveTo(x, top - 3, x - 9.6, top + 2); c.closePath(); c.fill(); c.stroke();
          eyes(x, top + 3, 3.4, 1.8);
          // Lettre de la classe, en or
          c.font = `bold ${(s.glyph || 'V').length > 1 ? 11 : 13}px Cinzel, serif`; c.textAlign = 'center'; c.textBaseline = 'middle';
          c.lineWidth = 3; c.strokeStyle = 'rgba(0,0,0,0.7)'; c.strokeText(s.glyph || 'V', x, top + 20); c.fillStyle = '#f2dcaa'; c.fillText(s.glyph || 'V', x, top + 20);
          break;
        }
        case 'triangle':
          c.fillStyle = grad(x - 16, top, x + 10, y); c.beginPath(); c.moveTo(x, top); c.lineTo(x + 16, y - 4); c.lineTo(x - 16, y - 4); c.closePath(); c.fill(); finish();
          c.fillStyle = 'rgba(0,0,0,0.18)'; c.beginPath(); c.moveTo(x + 2, top + 8); c.lineTo(x + 14, y - 5); c.lineTo(x - 2, y - 5); c.closePath(); c.fill();
          eyes(x, y - 18, 5); break;
        case 'square':
          c.fillStyle = grad(x - 15, top + 6, x + 15, y - 4); c.beginPath(); c.roundRect(x - 15, top + 6, 30, 32, 3); c.fill(); finish();
          c.fillStyle = 'rgba(255,255,255,0.12)'; c.fillRect(x - 13, top + 8, 10, 3);
          eyes(x, top + 18, 7); break;
        case 'diamond':
          c.fillStyle = grad(x - 13, top, x + 13, y - 4); c.beginPath(); c.moveTo(x, top); c.lineTo(x + 13, y - 22); c.lineTo(x, y - 4); c.lineTo(x - 13, y - 22); c.closePath(); c.fill(); finish();
          c.strokeStyle = 'rgba(255,255,255,0.35)'; c.lineWidth = 1; c.beginPath(); c.moveTo(x, top + 3); c.lineTo(x - 10, y - 22); c.stroke();
          eyes(x, y - 24, 4); break;
        case 'hex':
          c.fillStyle = grad(x - 15, y - 39, x + 15, y - 5); c.beginPath();
          for (let i = 0; i < 6; i++) { const a = Math.PI / 3 * i - Math.PI / 6; const hx = x + 15 * Math.cos(a), hy = y - 22 + 17 * Math.sin(a); if (i) c.lineTo(hx, hy); else c.moveTo(hx, hy); }
          c.closePath(); c.fill(); finish();
          eyes(x, y - 24, 6); break;
        default: {
          const g = c.createRadialGradient(x - 5, y - 28, 2, x, y - 22, 16); g.addColorStop(0, light(color, 0.42)); g.addColorStop(0.6, color); g.addColorStop(1, dark(color, 0.5));
          c.fillStyle = g; c.beginPath(); c.arc(x, y - 22, 15, 0, Math.PI * 2); c.fill(); finish();
          eyes(x, y - 24, 6);
        }
      }
      if (s.motif) motif(c, { x, y }, s, color);
    });
  }

  function motif(c, p, s, color) {
    const top = p.y - 42;
    const cy = s.shape === 'square' ? top + 22 : p.y - 22;
    c.lineWidth = 2; c.strokeStyle = 'rgba(0,0,0,0.6)'; c.lineJoin = 'round';
    switch (s.motif) {
      case 'bird':
        c.fillStyle = '#ffb14a'; c.beginPath(); c.moveTo(p.x + 4, cy + 4); c.lineTo(p.x + 15, cy + 7); c.lineTo(p.x + 4, cy + 10); c.closePath(); c.fill(); c.stroke();
        c.fillStyle = dark(color, 0.3); c.beginPath(); c.ellipse(p.x - 12, cy + 2, 8, 4.5, -0.5, 0, Math.PI * 2); c.fill(); c.strokeStyle = 'rgba(0,0,0,0.35)'; c.lineWidth = 1; c.stroke();
        c.fillStyle = light(color, 0.35); c.beginPath(); c.ellipse(p.x - 13, cy + 1, 4, 2, -0.5, 0, Math.PI * 2); c.fill();
        break;
      case 'horn': {
        const g = c.createLinearGradient(p.x - 18, cy - 22, p.x - 6, cy - 10); g.addColorStop(0, '#fff2cc'); g.addColorStop(1, '#b89a5e');
        c.fillStyle = g; c.beginPath(); c.moveTo(p.x - 10, cy - 10); c.lineTo(p.x - 19, cy - 23); c.lineTo(p.x - 6, cy - 14); c.closePath(); c.fill(); c.stroke();
        c.beginPath(); c.moveTo(p.x + 10, cy - 10); c.lineTo(p.x + 19, cy - 23); c.lineTo(p.x + 6, cy - 14); c.closePath(); c.fill(); c.stroke();
        break;
      }
      case 'legs':
        c.strokeStyle = dark(color, 0.45); c.lineWidth = 2.2;
        for (const dx of [-16, -8, 8, 16]) { c.beginPath(); c.moveTo(p.x + dx * 0.6, cy + 6); c.lineTo(p.x + dx, cy + 2); c.lineTo(p.x + dx * 1.2, p.y - 2); c.stroke(); }
        break;
      case 'lamp': {
        const g = c.createRadialGradient(p.x, cy, 2, p.x, cy, 22); g.addColorStop(0, 'rgba(255,230,160,0.8)'); g.addColorStop(1, 'rgba(255,230,160,0)');
        c.fillStyle = g; c.beginPath(); c.arc(p.x, cy, 22, 0, Math.PI * 2); c.fill();
        break;
      }
      case 'pebble':
        c.strokeStyle = 'rgba(0,0,0,0.4)'; c.lineWidth = 1.5;
        c.beginPath(); c.moveTo(p.x - 10, cy - 6); c.lineTo(p.x - 3, cy); c.lineTo(p.x - 6, cy + 8); c.moveTo(p.x + 5, cy - 9); c.lineTo(p.x + 9, cy - 2); c.stroke();
        c.strokeStyle = 'rgba(255,255,255,0.25)'; c.lineWidth = 1; c.beginPath(); c.moveTo(p.x - 9, cy - 7); c.lineTo(p.x - 2, cy - 1); c.stroke();
        break;
      case 'ember':
        c.fillStyle = '#ff7a2b'; c.beginPath(); c.arc(p.x - 5, cy, 2.6, 0, Math.PI * 2); c.arc(p.x + 5, cy, 2.6, 0, Math.PI * 2); c.fill();
        c.fillStyle = '#ffd27a'; c.beginPath(); c.arc(p.x - 5, cy, 1.2, 0, Math.PI * 2); c.arc(p.x + 5, cy, 1.2, 0, Math.PI * 2); c.fill();
        c.fillStyle = 'rgba(255,170,80,0.7)'; for (const [dx, dy] of [[-12, -14], [10, -18], [0, -22]]) { c.beginPath(); c.arc(p.x + dx, cy + dy, 2, 0, Math.PI * 2); c.fill(); }
        break;
      case 'smoke':
        for (const [dx, dy, r] of [[-8, -20, 6], [2, -28, 8], [12, -20, 5]]) { const g = c.createRadialGradient(p.x + dx - 2, cy + dy - 2, 1, p.x + dx, cy + dy, r); g.addColorStop(0, 'rgba(240,240,250,0.7)'); g.addColorStop(1, 'rgba(200,200,220,0.2)'); c.fillStyle = g; c.beginPath(); c.arc(p.x + dx, cy + dy, r, 0, Math.PI * 2); c.fill(); }
        break;
      case 'pick':
        c.strokeStyle = '#6b4f36'; c.lineWidth = 3; c.beginPath(); c.moveTo(p.x + 12, cy + 10); c.lineTo(p.x + 22, cy - 16); c.stroke();
        c.strokeStyle = '#d5dbe6'; c.lineWidth = 3; c.beginPath(); c.moveTo(p.x + 12, cy - 18); c.quadraticCurveTo(p.x + 22, cy - 24, p.x + 32, cy - 14); c.stroke();
        break;
      case 'hammer':
        c.fillStyle = '#5a6070'; c.fillRect(p.x + 14, cy - 24, 16, 10); c.fillStyle = '#8a93a6'; c.fillRect(p.x + 14, cy - 24, 16, 3);
        c.strokeStyle = '#6b4f36'; c.lineWidth = 3; c.beginPath(); c.moveTo(p.x + 22, cy - 14); c.lineTo(p.x + 18, cy + 12); c.stroke();
        break;
      case 'shell':
        c.strokeStyle = 'rgba(0,0,0,0.45)'; c.lineWidth = 1.5; for (let i = 1; i <= 3; i++) { c.beginPath(); c.arc(p.x, cy + 6, i * 5, Math.PI, Math.PI * 2); c.stroke(); }
        break;
      case 'wave':
        c.strokeStyle = 'rgba(255,255,255,0.7)'; c.lineWidth = 2; c.beginPath(); c.moveTo(p.x - 12, cy + 2); c.quadraticCurveTo(p.x - 6, cy - 6, p.x, cy + 2); c.quadraticCurveTo(p.x + 6, cy + 10, p.x + 12, cy + 2); c.stroke();
        break;
      case 'drip':
        c.fillStyle = dark(color, 0.3); for (const [dx, dy] of [[-8, 12], [6, 14], [0, 18]]) { c.beginPath(); c.ellipse(p.x + dx, p.y - 6 + dy * 0.3, 3, 5, 0, 0, Math.PI * 2); c.fill(); }
        break;
      case 'teeth':
        c.fillStyle = '#ffffff'; c.beginPath(); for (let i = -3; i <= 3; i++) { c.moveTo(p.x + i * 5 - 2, cy + 6); c.lineTo(p.x + i * 5, cy + 12); c.lineTo(p.x + i * 5 + 2, cy + 6); } c.fill();
        break;
      case 'bones':
        c.strokeStyle = 'rgba(255,255,255,0.75)'; c.lineWidth = 2; for (let i = 0; i < 3; i++) { c.beginPath(); c.moveTo(p.x - 9, cy + i * 5); c.lineTo(p.x + 9, cy + i * 5); c.stroke(); }
        break;
      case 'crack':
        c.strokeStyle = '#bf95ff'; c.lineWidth = 2.4; c.beginPath(); c.moveTo(p.x - 2, cy - 16); c.lineTo(p.x + 3, cy - 6); c.lineTo(p.x - 3, cy + 2); c.lineTo(p.x + 2, cy + 12); c.stroke();
        c.strokeStyle = '#ffffff'; c.lineWidth = 0.8; c.stroke();
        break;
      case 'star':
        c.fillStyle = '#ffffff'; c.beginPath(); for (let i = 0; i < 10; i++) { const r = i % 2 ? 3 : 8; const a = Math.PI / 5 * i - Math.PI / 2; c.lineTo(p.x + Math.cos(a) * r, cy - 24 + Math.sin(a) * r); } c.closePath(); c.fill();
        break;
    }
  }

  function npc(look) {
    const LOOK = { garde: '#8a93a6', marchand: '#c9a35c', artisan: '#b06a3c', ancien: '#d8d0c0', enfant: '#ffd166', marcheur: '#6fdc8c', tisseur: '#4a90ff' };
    const color = LOOK[look] || '#aaaaaa';
    return sprite(64, 72, 32, 64, c => {
      const x = 32, y = 64, top = y - 42;
      c.lineWidth = 2; c.strokeStyle = 'rgba(0,0,0,0.6)';
      c.fillStyle = '#1a1510'; c.beginPath(); c.roundRect(x - 7.5, y - 15, 5.5, 14, 2); c.roundRect(x + 2, y - 15, 5.5, 14, 2); c.fill();
      const g = c.createLinearGradient(x - 10, top + 10, x + 10, top + 34); g.addColorStop(0, light(color, 0.35)); g.addColorStop(0.5, color); g.addColorStop(1, dark(color, 0.45));
      c.fillStyle = g; c.beginPath(); c.roundRect(x - 10, top + 10, 20, 24, 5); c.fill(); c.stroke();
      c.fillStyle = '#5c4628'; c.fillRect(x - 10, top + 26, 20, 3);
      const sk = c.createRadialGradient(x - 3, top - 1, 1, x, top + 2, 10); sk.addColorStop(0, '#ffe9d2'); sk.addColorStop(1, '#d9b596');
      c.fillStyle = sk; c.beginPath(); c.arc(x, top + 2, 9, 0, Math.PI * 2); c.fill(); c.stroke();
      c.fillStyle = '#ffffff'; c.beginPath(); c.arc(x - 3.2, top + 3, 1.8, 0, Math.PI * 2); c.arc(x + 3.2, top + 3, 1.8, 0, Math.PI * 2); c.fill();
      c.fillStyle = '#14100a'; c.beginPath(); c.arc(x - 2.8, top + 3, 0.9, 0, Math.PI * 2); c.arc(x + 3.6, top + 3, 0.9, 0, Math.PI * 2); c.fill();
      if (look === 'garde') { c.fillStyle = '#5a6270'; c.beginPath(); c.roundRect(x - 10, top - 8, 20, 6, 2); c.fill(); c.stroke(); c.fillStyle = '#8a93a6'; c.fillRect(x - 8, top - 7, 16, 1.5); }
      if (look === 'marchand' || look === 'artisan') { c.fillStyle = dark(color, 0.3); c.beginPath(); c.arc(x, top - 1, 9.6, Math.PI, Math.PI * 2); c.closePath(); c.fill(); c.stroke(); }
      if (look === 'ancien') { c.fillStyle = '#eee'; c.beginPath(); c.moveTo(x - 4, top + 6); c.lineTo(x + 4, top + 6); c.lineTo(x + 2, top + 16); c.lineTo(x - 2, top + 16); c.closePath(); c.fill(); }
      if (look === 'tisseur') { c.strokeStyle = '#e2c690'; c.lineWidth = 1.2; c.beginPath(); c.moveTo(x - 8, top + 14); c.lineTo(x + 8, top + 20); c.moveTo(x - 8, top + 20); c.lineTo(x + 8, top + 14); c.stroke(); }
    });
  }

  function node(kind, P) {
    return sprite(48, 40, 24, 36, c => {
      const x = 24, y = 36;
      if (kind === 'bois') {
        const g = c.createLinearGradient(x - 8, 0, x + 8, 0); g.addColorStop(0, '#9a7a52'); g.addColorStop(0.5, '#7a5a3a'); g.addColorStop(1, '#4a3420');
        c.fillStyle = g; c.fillRect(x - 8, y - 18, 16, 18);
        c.fillStyle = '#d4b58a'; c.beginPath(); c.ellipse(x, y - 18, 8, 4, 0, 0, Math.PI * 2); c.fill();
        c.strokeStyle = '#8a6a44'; c.lineWidth = 1; c.beginPath(); c.ellipse(x, y - 18, 4.5, 2.2, 0, 0, Math.PI * 2); c.stroke(); c.beginPath(); c.ellipse(x, y - 18, 1.8, 0.9, 0, 0, Math.PI * 2); c.stroke();
        c.strokeStyle = 'rgba(0,0,0,0.5)'; c.lineWidth = 1.2; c.strokeRect(x - 8, y - 18, 16, 18);
      } else if (kind === 'pierre') {
        const g = c.createLinearGradient(x - 12, y - 18, x + 12, y); g.addColorStop(0, P.rockLight); g.addColorStop(0.5, P.rock); g.addColorStop(1, P.rockDark);
        c.fillStyle = g; c.beginPath(); c.moveTo(x - 12, y); c.lineTo(x - 8, y - 14); c.lineTo(x + 2, y - 18); c.lineTo(x + 12, y - 6); c.lineTo(x + 9, y); c.closePath(); c.fill();
        c.strokeStyle = 'rgba(0,0,0,0.5)'; c.lineWidth = 1.2; c.stroke();
        c.save(); c.globalCompositeOperation = 'lighter'; c.fillStyle = rgba(P.vein, 0.9); c.beginPath(); c.arc(x + 1, y - 8, 3, 0, Math.PI * 2); c.arc(x - 5, y - 4, 2, 0, Math.PI * 2); c.fill(); c.restore();
      } else {
        c.lineWidth = 2.2; c.lineCap = 'round';
        for (const dx of [-6, 0, 6]) { c.strokeStyle = '#2f5a34'; c.beginPath(); c.moveTo(x + dx, y); c.quadraticCurveTo(x + dx * 1.5, y - 10, x + dx * 0.6, y - 18); c.stroke(); c.strokeStyle = '#7ec26a'; c.lineWidth = 1.2; c.beginPath(); c.moveTo(x + dx * 1.2, y - 8); c.lineTo(x + dx * 0.6, y - 18); c.stroke(); c.lineWidth = 2.2; }
        const g = c.createRadialGradient(x - 1, y - 19, 0.5, x, y - 18, 4); g.addColorStop(0, '#fff6d6'); g.addColorStop(1, P.lantern);
        c.fillStyle = g; c.beginPath(); c.arc(x, y - 18, 3.6, 0, Math.PI * 2); c.fill();
      }
    });
  }

  // ----- Lueurs, anneaux, particules -----
  function glow(hexColor, size = 128, inner = 0.9) {
    const cv = canvas(size, size), c = cv.getContext('2d'), r = size / 2;
    const g = c.createRadialGradient(r, r, 0, r, r, r);
    g.addColorStop(0, rgba(hexColor, inner)); g.addColorStop(0.3, rgba(hexColor, inner * 0.4)); g.addColorStop(0.7, rgba(hexColor, inner * 0.08)); g.addColorStop(1, rgba(hexColor, 0));
    c.fillStyle = g; c.fillRect(0, 0, size, size);
    return cv;
  }
  function shadow() {
    const cv = canvas(128, 64), c = cv.getContext('2d');
    const g = c.createRadialGradient(64, 32, 2, 64, 32, 58);
    g.addColorStop(0, 'rgba(0,0,0,0.5)'); g.addColorStop(0.6, 'rgba(0,0,0,0.25)'); g.addColorStop(1, 'rgba(0,0,0,0)');
    c.fillStyle = g; c.save(); c.scale(1, 0.5); c.beginPath(); c.arc(64, 64, 60, 0, Math.PI * 2); c.fill(); c.restore();
    return cv;
  }
  function ring() {
    const cv = canvas(128, 64), c = cv.getContext('2d');
    c.save(); c.scale(1, 0.5);
    c.strokeStyle = 'rgba(255,255,255,0.35)'; c.lineWidth = 9; c.beginPath(); c.arc(64, 64, 50, 0, Math.PI * 2); c.stroke();
    c.strokeStyle = '#ffffff'; c.lineWidth = 4; c.beginPath(); c.arc(64, 64, 50, 0, Math.PI * 2); c.stroke();
    c.restore();
    return cv;
  }
  function diamondTex() {
    const cv = canvas(128, 64), c = cv.getContext('2d');
    c.fillStyle = '#ffffff'; diamondPath(c, 64, 32, 124, 62); c.fill();
    return cv;
  }
  function diamondRing() {
    const cv = canvas(128, 64), c = cv.getContext('2d');
    c.strokeStyle = 'rgba(255,255,255,0.4)'; c.lineWidth = 8; diamondPath(c, 64, 32, 112, 56); c.stroke();
    c.strokeStyle = '#ffffff'; c.lineWidth = 3; diamondPath(c, 64, 32, 112, 56); c.stroke();
    return cv;
  }
  function spark() {
    const cv = canvas(24, 24), c = cv.getContext('2d');
    const g = c.createRadialGradient(12, 12, 0, 12, 12, 12); g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(0.35, 'rgba(255,255,255,0.6)'); g.addColorStop(1, 'rgba(255,255,255,0)');
    c.fillStyle = g; c.fillRect(0, 0, 24, 24);
    return cv;
  }
  function star() {
    const cv = canvas(24, 24), c = cv.getContext('2d');
    c.fillStyle = '#ffd166'; c.strokeStyle = 'rgba(0,0,0,0.5)'; c.lineWidth = 1.5; c.beginPath();
    for (let j = 0; j < 10; j++) { const r = j % 2 ? 4 : 10; const b = Math.PI / 5 * j - Math.PI / 2; c.lineTo(12 + Math.cos(b) * r, 12 + Math.sin(b) * r); }
    c.closePath(); c.fill(); c.stroke();
    return cv;
  }
  function bubble() {
    const cv = canvas(96, 112), c = cv.getContext('2d');
    const g = c.createRadialGradient(40, 40, 10, 48, 56, 50); g.addColorStop(0, 'rgba(159,215,255,0.05)'); g.addColorStop(0.8, 'rgba(159,215,255,0.15)'); g.addColorStop(1, 'rgba(159,215,255,0.5)');
    c.fillStyle = g; c.beginPath(); c.ellipse(48, 56, 44, 52, 0, 0, Math.PI * 2); c.fill();
    c.strokeStyle = 'rgba(200,235,255,0.9)'; c.lineWidth = 2; c.stroke();
    c.strokeStyle = 'rgba(255,255,255,0.8)'; c.lineWidth = 2; c.beginPath(); c.ellipse(48, 56, 36, 44, 0, Math.PI * 1.15, Math.PI * 1.45); c.stroke();
    return cv;
  }
  function shieldIcon() {
    const cv = canvas(28, 32), c = cv.getContext('2d');
    const g = c.createLinearGradient(0, 0, 28, 32); g.addColorStop(0, '#d5dbe6'); g.addColorStop(1, '#5a6270');
    c.fillStyle = g; c.strokeStyle = 'rgba(0,0,0,0.6)'; c.lineWidth = 2;
    c.beginPath(); c.moveTo(3, 3); c.lineTo(25, 3); c.lineTo(25, 16); c.quadraticCurveTo(14, 31, 3, 16); c.closePath(); c.fill(); c.stroke();
    c.strokeStyle = '#e2c690'; c.lineWidth = 1.5; c.beginPath(); c.moveTo(14, 6); c.lineTo(14, 24); c.moveTo(6, 12); c.lineTo(22, 12); c.stroke();
    return cv;
  }
  function lanternIcon(P) {
    const cv = canvas(24, 32), c = cv.getContext('2d');
    c.fillStyle = '#2a2d3a'; c.fillRect(7, 8, 10, 15); c.fillStyle = P.lantern; c.fillRect(9, 10, 6, 11); c.fillStyle = '#fff6d6'; c.fillRect(11, 13, 2, 4);
    c.strokeStyle = '#2a2d3a'; c.lineWidth = 2; c.beginPath(); c.arc(12, 7, 3, Math.PI, Math.PI * 2); c.stroke();
    return cv;
  }
  function mist() {
    const N = 256, cv = canvas(N * 2, N), c = cv.getContext('2d'), img = c.createImageData(N * 2, N), d = img.data;
    for (let y = 0; y < N; y++) for (let x = 0; x < N * 2; x++) {
      const v = fbm(x / N * 3, y / N * 3, 4, 3, 77);
      const fx = Math.sin(x / (N * 2) * Math.PI), fy = Math.sin(y / N * Math.PI);
      const a = Math.max(0, v - 0.35) * 1.6 * fx * fy;
      const i = (y * N * 2 + x) * 4; d[i] = d[i + 1] = d[i + 2] = 255; d[i + 3] = Math.round(Math.min(1, a) * 255);
    }
    c.putImageData(img, 0, 0);
    return cv;
  }
  function vignette(W, H) {
    const cv = canvas(W / 2, H / 2), c = cv.getContext('2d');
    const g = c.createRadialGradient(W / 4, H / 4, Math.min(W, H) * 0.18, W / 4, H / 4, Math.max(W, H) * 0.42);
    g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(0.7, 'rgba(200,205,215,1)'); g.addColorStop(1, 'rgba(90,95,110,1)');
    c.fillStyle = g; c.fillRect(0, 0, W / 2, H / 2);
    return cv;
  }
  function bolt(P) {
    // Une image d'éclair pour les lanternes qui crépitent : inutile ici, les éclairs sont tracés.
    return glow(P.crystal, 64, 1);
  }

  // Le noyau d'un Glym des Sources (docs/ILE-TECHNIQUE.md, 3.7) : la couleur vive de l'élément au
  // creux de la crête, une gemme qui luit sur un corps teinté mais sourd. `p` : le pied de la figure
  // (le repère des peintres de figures) ; `s.noyau` : la couleur ; `s.shape` place la gemme.
  function noyau(c, p, s) {
    if (!s || !s.noyau) return;
    const top = p.y - 42, x = p.x, col = s.noyau;
    const cy = s.shape === 'diamond' ? top + 12 : s.shape === 'square' ? top + 13 : p.y - 33;
    c.save();
    const g = c.createRadialGradient(x, cy, 0.5, x, cy, 11);
    g.addColorStop(0, rgba(col, 0.85)); g.addColorStop(0.45, rgba(col, 0.3)); g.addColorStop(1, rgba(col, 0));
    c.globalCompositeOperation = 'lighter';
    c.fillStyle = g; c.beginPath(); c.arc(x, cy, 11, 0, Math.PI * 2); c.fill();
    c.globalCompositeOperation = 'source-over';
    c.lineJoin = 'round'; c.lineWidth = 1.4; c.strokeStyle = rgba(dark(col, 0.62), 0.9);
    c.fillStyle = col; c.beginPath(); c.moveTo(x, cy - 5); c.lineTo(x + 3.6, cy); c.lineTo(x, cy + 5); c.lineTo(x - 3.6, cy); c.closePath(); c.fill(); c.stroke();
    c.fillStyle = light(col, 0.65); c.beginPath(); c.moveTo(x, cy - 4); c.lineTo(x - 2.6, cy); c.lineTo(x, cy); c.closePath(); c.fill();
    c.restore();
  }

  return { OS, PALETTES, hash, fbm, rgb, hex, mix, rgba, light, dark, toInt, canvas, noiseTile, sky, ground, rock, tree, lantern, door, relay, crystal, body, npc, node, glow, shadow, ring, diamondTex, diamondRing, spark, star, bubble, shieldIcon, lanternIcon, mist, vignette, bolt, shard, noyau };
})();
