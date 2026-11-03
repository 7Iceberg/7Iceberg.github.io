const IleSol = (() => {
  const TUILE = 30;


  function falaises(T) {
    const surcharges = new Map(), faces = [];
    for (const f of IleTerrain.facesEscarpements(T)) {
      const { pts, cum, ech } = f;
      faces.push(f);
      const u0 = Math.max(0, Math.floor(Math.min(...pts.map(p => p[0])) - 2)), u1 = Math.min(T.W - 1, Math.ceil(Math.max(...pts.map(p => p[0])) + 2));
      const v0 = Math.max(0, Math.floor(Math.min(...pts.map(p => p[1])) - 2)), v1 = Math.min(T.H - 1, Math.ceil(Math.max(...pts.map(p => p[1])) + 2));
      for (let v = v0; v <= v1; v++) for (let u = u0; u <= u1; u++) {
        const i = v * T.W + u;
        const pr = IleTerrain.projeter(pts, cum, u, v);
        if (pr.d > 1.6) continue;
        const q = IleTerrain.pointA(pts, cum, pr.s);
        const k = Math.min(ech.length - 1, Math.max(0, Math.round(pr.s / Math.max(1e-6, cum[cum.length - 1]) * (ech.length - 1))));
        const e = ech[k];
        if (!e.vrai) continue;
        const h = T.haut[i];
        const enHaut = h > (e.haut + e.bas) / 2;
        const s = (enHaut ? e.cote : -e.cote) * 0.04;
        const ancien = surcharges.get(i);
        if (ancien && ancien.d <= pr.d) continue;
        surcharges.set(i, { u: q[0] + e.nx * s, v: q[1] + e.ny * s, cote: enHaut ? 1 : -1, d: pr.d, nx: e.nx * (enHaut ? e.cote : -e.cote), ny: e.ny * (enHaut ? e.cote : -e.cote) });
      }
    }
    return { surcharges, faces };
  }


  function hauteurs(T) {
    const { W, H, haut, vide } = T, out = new Float32Array(haut), connu = new Uint8Array(W * H);
    for (let i = 0; i < W * H; i++) connu[i] = vide[i] ? 0 : 1;
    for (let passe = 0; passe < 3; passe++) {
      const ajout = [];
      for (let v = 0; v < H; v++) for (let u = 0; u < W; u++) {
        const i = v * W + u;
        if (connu[i]) continue;
        let s = 0, n = 0;
        for (const [du, dv] of [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [-1, -1], [1, -1], [-1, 1]]) {
          const x = u + du, y = v + dv;
          if (x < 0 || y < 0 || x >= W || y >= H) continue;
          const j = y * W + x;
          if (connu[j]) { s += out[j]; n++; }
        }
        if (n) ajout.push([i, s / n]);
      }
      for (const [i, h] of ajout) { out[i] = h; connu[i] = 1; }
    }
    return { h: out, connu };
  }

  function normale(T, Hr, surch, u, v, out) {
    const W = T.W, Hh = T.H;
    const i = v * W + u, s = surch.get(i);
    const hv = (x, y) => Hr[Math.min(Hh - 1, Math.max(0, y)) * W + Math.min(W - 1, Math.max(0, x))];
    const memeCote = (x, y) => { if (!s) return true; const o = surch.get(y * W + x); if (o) return o.cote === s.cote; return s.cote > 0 ? hv(x, y) >= hv(u, v) - 1.5 : hv(x, y) <= hv(u, v) + 1.5; };
    const dx = (() => {
      const a = u > 0 && memeCote(u - 1, v), b = u < W - 1 && memeCote(u + 1, v);
      if (a && b) return (hv(u + 1, v) - hv(u - 1, v)) / 2;
      if (b) return hv(u + 1, v) - hv(u, v);
      if (a) return hv(u, v) - hv(u - 1, v);
      return 0;
    })();
    const dz = (() => {
      const a = v > 0 && memeCote(u, v - 1), b = v < Hh - 1 && memeCote(u, v + 1);
      if (a && b) return (hv(u, v + 1) - hv(u, v - 1)) / 2;
      if (b) return hv(u, v + 1) - hv(u, v);
      if (a) return hv(u, v) - hv(u, v - 1);
      return 0;
    })();
    const n = Math.sqrt(dx * dx + 1 + dz * dz);
    out[0] = -dx / n; out[1] = 1 / n; out[2] = -dz / n;
    return out;
  }


  function utiles(T) {
    const { W, H, vide } = T, out = new Uint8Array(W * H);
    for (let v = 0; v < H; v++) for (let u = 0; u < W; u++) {
      let ok = false;
      for (let dv = -2; dv <= 2 && !ok; dv++) for (let du = -2; du <= 2 && !ok; du++) {
        const x = u + du, y = v + dv;
        if (x >= 0 && y >= 0 && x < W && y < H && !vide[y * W + x] && du * du + dv * dv <= 4) ok = true;
      }
      out[v * W + u] = ok ? 1 : 0;
    }
    return out;
  }

  function tuile(THREE, T, prep, tx, ty, pas) {
    const { W } = T, Hr = prep.h, surch = prep.surcharges;
    const u0 = tx * TUILE, v0 = ty * TUILE, n = TUILE / pas + 1;
    const pos = [], nor = [], idxIn = [], idxBord = [];
    const ids = new Int32Array(n * n).fill(-1);
    const nn = [0, 1, 0], sansSurcharge = new Map();
    const lat = (a, b) => { const u = Math.min(T.W - 1, u0 + a * pas), v = Math.min(T.H - 1, v0 + b * pas); return [u, v]; };
    for (let b = 0; b < n; b++) for (let a = 0; a < n; a++) {
      const [u, v] = lat(a, b), i = v * W + u;
      if (!prep.utiles[i]) continue;
      ids[b * n + a] = pos.length / 3;
      const s = pas === 1 ? surch.get(i) : null;
      pos.push(s ? s.u : u, Hr[i], s ? s.v : v);
      normale(T, Hr, pas === 1 ? surch : sansSurcharge, u, v, nn);
      nor.push(nn[0], nn[1], nn[2]);
    }
    for (let b = 0; b + 1 < n; b++) for (let a = 0; a + 1 < n; a++) {
      const A = ids[b * n + a], B = ids[b * n + a + 1], C = ids[(b + 1) * n + a], D = ids[(b + 1) * n + a + 1];
      if (A < 0 || B < 0 || C < 0 || D < 0) continue;
      let bord = false;
      for (const [aa, bb] of [[a, b], [a + 1, b], [a, b + 1], [a + 1, b + 1]]) {
        const [u, v] = lat(aa, bb);
        if (prep.presBord[v * W + u]) { bord = true; break; }
      }
      const L = bord ? idxBord : idxIn;
      if ((a + b) % 2 === 0) L.push(A, C, B, B, C, D); else L.push(A, C, D, A, D, B);
    }
    if (!idxIn.length && !idxBord.length) return null;
    if (pas > 1) {
      const jupe = (list) => {
        for (let k = 0; k + 1 < list.length; k++) {
          const A = list[k], B = list[k + 1];
          if (A < 0 || B < 0) continue;
          const a2 = pos.length / 3; pos.push(pos[A * 3], pos[A * 3 + 1] - 1.2, pos[A * 3 + 2]); nor.push(nor[A * 3], nor[A * 3 + 1], nor[A * 3 + 2]);
          const b2 = pos.length / 3; pos.push(pos[B * 3], pos[B * 3 + 1] - 1.2, pos[B * 3 + 2]); nor.push(nor[B * 3], nor[B * 3 + 1], nor[B * 3 + 2]);
          idxIn.push(A, a2, B, B, a2, b2, A, B, a2, B, b2, a2);
        }
      };
      const ligne = (f) => { const l = []; for (let k = 0; k < n; k++) l.push(f(k)); return l; };
      jupe(ligne(k => ids[k]));
      jupe(ligne(k => ids[(n - 1) * n + k]));
      jupe(ligne(k => ids[k * n]));
      jupe(ligne(k => ids[k * n + n - 1]));
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    geo.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3));
    const idx = idxIn.concat(idxBord);
    geo.setIndex(idx);
    if (idxIn.length) geo.addGroup(0, idxIn.length, 0);
    if (idxBord.length) geo.addGroup(idxIn.length, idxBord.length, 1);
    geo.computeBoundingSphere();
    geo.computeBoundingBox();
    return geo;
  }

  function preparer(T) {
    const f = falaises(T);
    const hh = hauteurs(T);
    const prep = { h: hh.h, surcharges: f.surcharges, utiles: utiles(T), presBord: new Uint8Array(T.W * T.H) };
    for (let v = 0; v < T.H; v++) for (let u = 0; u < T.W; u++) {
      let b = false;
      for (let dv = -1; dv <= 1 && !b; dv++) for (let du = -1; du <= 1 && !b; du++) {
        const x = u + du, y = v + dv;
        if (x < 0 || y < 0 || x >= T.W || y >= T.H || T.vide[y * T.W + x]) b = true;
      }
      prep.presBord[v * T.W + u] = b ? 1 : 0;
    }
    return { prep, faces: f.faces };
  }

  function tuiles(THREE, T, prep) {
    const nx = Math.ceil(T.largeur / TUILE), ny = Math.ceil(T.hauteur / TUILE), out = [];
    for (let ty = 0; ty < ny; ty++) for (let tx = 0; tx < nx; tx++) {
      const proche = tuile(THREE, T, prep, tx, ty, 1);
      if (!proche) continue;
      const loin = tuile(THREE, T, prep, tx, ty, 2);
      out.push({ tx, ty, proche, loin, centre: [tx * TUILE + TUILE / 2, ty * TUILE + TUILE / 2] });
    }
    return out;
  }


  const GRILLE = `
  if (aireOn > 0.002) {
    vec2 qA = vMonde.xz - aireO;
    vec2 dhA = max(max(-qA, qA - 15.0), vec2(0.0));
    float horsA = length(dhA);
    gl_FragColor.rgb *= 1.0 - aireOn * mix(0.36 * smoothstep(0.0, 2.5, horsA), 0.9 * smoothstep(0.0, 0.35, horsA), tactiqueSol);
    // Un liseré sombre juste hors du carré : le bord de l'aire se lit sur l'herbe claire comme sur la lande.
    gl_FragColor.rgb *= 1.0 - aireOn * (1.0 - tactiqueSol) * 0.22 * (1.0 - smoothstep(0.0, 0.28, horsA)) * step(0.0005, horsA);
    if (horsA <= 0.0) {
      vec2 celA = clamp(floor(qA), 0.0, 14.0);
      vec2 fA = qA - celA;
      vec2 tcA = vec2((celA.x * 4.0 + 0.5) / 64.0, (celA.y + 0.5) / 16.0);
      vec4 remA = texture2D(etatCases, tcA);
      vec4 traA = texture2D(etatCases, tcA + vec2(1.0 / 64.0, 0.0));
      vec4 genA = texture2D(etatCases, tcA + vec2(2.0 / 64.0, 0.0));
      vec4 pieA = texture2D(etatCases, tcA + vec2(3.0 / 64.0, 0.0));
      float sorteA = floor(genA.r * 255.0 + 0.5);
      float drapA = floor(genA.g * 255.0 + 0.5);
      float drapB = floor(genA.a * 255.0 + 0.5);
      vec2 cA = abs(fA - 0.5);
      float mA = max(cA.x, cA.y);
      float wA = traitU;
      // Les drapeaux (js/ile-arene.js, majCases) : le survol, le chemin, la respiration, l'arrivée du
      // chemin, puis ses côtés (+x, -x, +y, -y) ; dans le second octet, la ligne de vue coupée et la cible.
      float fSurvol = mod(drapA, 2.0), fChemin = mod(floor(drapA / 2.0), 2.0), fRespire = mod(floor(drapA / 4.0), 2.0), fArrivee = mod(floor(drapA / 8.0), 2.0);
      float cPx = mod(floor(drapA / 16.0), 2.0), cMx = mod(floor(drapA / 32.0), 2.0), cPy = mod(floor(drapA / 64.0), 2.0), cMy = mod(floor(drapA / 128.0), 2.0);
      float fCoupe = mod(drapB, 2.0), fCible = mod(floor(drapB / 2.0), 2.0);
      // La case : un carré aux coins arrondis (rayon 0,11 u), en retrait d'un pixel et demi du bord,
      // par sa distance signée ; dedans le remplit, lisere est son trait d'un pixel.
      float rA = 0.11, inA = wA * 1.5;
      vec2 qq = cA - vec2(0.5 - inA - rA);
      float dA = length(max(qq, 0.0)) + min(max(qq.x, qq.y), 0.0) - rA;
      float dedans = 1.0 - smoothstep(-wA * 0.6, wA * 0.6, dA);
      float lisere = 1.0 - smoothstep(wA * 0.4, wA * 1.3, abs(dA));
      if (tactiqueSol > 0.5) {
        // La vue tactique : un damier d'ardoise ; l'eau, le vide, les obstacles en pierre sombre.
        vec3 ardA = mod(celA.x + celA.y, 2.0) > 0.5 ? vec3(0.231, 0.263, 0.337) : vec3(0.204, 0.231, 0.302);
        if (sorteA > 2.5 && sorteA < 3.5) ardA = vec3(0.114, 0.278, 0.4);
        else if (sorteA > 1.5 && sorteA < 2.5) ardA = vec3(0.02, 0.027, 0.043);
        else if (sorteA > 0.5) ardA = vec3(0.071, 0.086, 0.125);
        float dansT = 1.0 - smoothstep(0.49 - wA * 0.5, 0.49 + wA * 0.5, mA);
        gl_FragColor.rgb = mix(gl_FragColor.rgb, mix(vec3(0.027, 0.043, 0.078), ardA, dansT), aireOn);
        if (sorteA > 0.5 && (sorteA < 1.5 || sorteA > 3.5)) {
          float tbA = 1.0 - smoothstep(wA * 0.6, wA * 1.4, abs(mA - 0.47));
          gl_FragColor.rgb = mix(gl_FragColor.rgb, vec3(0.788, 0.651, 0.42), 0.35 * tbA * aireOn);
        }
      } else {
        // La grille (réglage « Afficher la grille ») : un filet sombre au bord des cases de sol.
        if (sorteA < 0.5 && grilleSol > 0.5) {
          float lgA = smoothstep(0.5 - wA * 1.1, 0.5 - wA * 0.1, mA);
          gl_FragColor.rgb = mix(gl_FragColor.rgb, vec3(0.04, 0.05, 0.08), 0.32 * lgA * aireOn);
        }
        // Un obstacle (rocher, souche, borne : sorte 1) : sa case hachurée d'ardoise et cernée de
        // pierre claire, lisible même derrière l'objet qui la porte ; l'eau et les trous (2, 3) : un
        // liseré sombre.
        if (sorteA > 0.5 && sorteA < 1.5) {
          float hachA = step(0.5, fract((fA.x + fA.y) * 5.0));
          gl_FragColor.rgb = mix(gl_FragColor.rgb, vec3(0.05, 0.06, 0.09), (0.2 + 0.18 * hachA) * dedans * aireOn);
          gl_FragColor.rgb = mix(gl_FragColor.rgb, vec3(0.64, 0.62, 0.56), 0.5 * lisere * aireOn);
        } else if (sorteA > 1.5) {
          gl_FragColor.rgb = mix(gl_FragColor.rgb, vec3(0.03, 0.04, 0.07), 0.35 * lisere * aireOn);
        }
      }
      float poulsA = fRespire > 0.5 ? 0.72 + 0.28 * sin(tempsSol / 0.34) : 1.0;
      if (remA.a > 0.0) {
        // Le remplissage : plus dense vers le bord (un verre éclairé par la tranche), doux au centre ;
        // hachuré quand la ligne de vue est coupée.
        float bordA = 0.55 + 0.45 * smoothstep(-0.22, 0.0, dA);
        float fondA = remA.a * dedans * bordA * aireOn * poulsA;
        if (fCoupe > 0.5) fondA *= 0.5 + 0.5 * step(0.5, fract((fA.x - fA.y) * 5.0));
        gl_FragColor.rgb = mix(gl_FragColor.rgb, remA.rgb, fondA);
      }
      if (traA.a > 0.0) gl_FragColor.rgb = mix(gl_FragColor.rgb, traA.rgb, traA.a * lisere * aireOn * poulsA);
      if (pieA.a > 0.0) {
        // Un piège du Veilleur : une croix de la couleur de son élément, cernée de sombre.
        float extA = max(cA.x, cA.y), brasA = min(cA.x, cA.y);
        float foA = (1.0 - smoothstep(wA * 1.6, wA * 2.4, brasA)) * step(extA, 0.31);
        float clA = (1.0 - smoothstep(wA * 0.7, wA * 1.3, brasA)) * step(extA, 0.28);
        gl_FragColor.rgb = mix(gl_FragColor.rgb, vec3(0.0), 0.5 * foA * aireOn);
        gl_FragColor.rgb = mix(gl_FragColor.rgb, pieA.rgb, clA * aireOn);
      }
      if (fChemin > 0.5) {
        // Le chemin : un trait clair cerné de sombre, du centre de la case vers chacun de ses côtés
        // sur le chemin (un fil continu des pieds de l'acteur à la case visée), un point à chaque
        // centre ; la case d'arrivée porte un anneau.
        vec2 pA = fA - 0.5;
        float dpA = length(pA), dTrait = dpA;
        if (cPx > 0.5 && pA.x > 0.0) dTrait = min(dTrait, abs(pA.y));
        if (cMx > 0.5 && pA.x < 0.0) dTrait = min(dTrait, abs(pA.y));
        if (cPy > 0.5 && pA.y > 0.0) dTrait = min(dTrait, abs(pA.x));
        if (cMy > 0.5 && pA.y < 0.0) dTrait = min(dTrait, abs(pA.x));
        float ombreT = 1.0 - smoothstep(wA * 1.8, wA * 2.8, dTrait);
        float clairT = 1.0 - smoothstep(wA * 0.7, wA * 1.5, dTrait);
        if (fArrivee > 0.5) {
          float dAnn = abs(dpA - 0.21);
          ombreT = max(ombreT, 1.0 - smoothstep(wA * 1.6, wA * 2.6, dAnn));
          clairT = max(clairT, 1.0 - smoothstep(wA * 0.6, wA * 1.4, dAnn));
          ombreT = max(ombreT, 1.0 - smoothstep(wA * 2.6, wA * 3.6, dpA));
          clairT = max(clairT, 1.0 - smoothstep(wA * 1.4, wA * 2.2, dpA));
        }
        gl_FragColor.rgb = mix(gl_FragColor.rgb, vec3(0.0, 0.02, 0.05), 0.5 * ombreT * aireOn);
        gl_FragColor.rgb = mix(gl_FragColor.rgb, vec3(0.9, 1.0, 1.0), 0.95 * clairT * aireOn);
      }
      if (fCible > 0.5) {
        // Le combattant visé (sa case survolée, ou son portrait) : un anneau d'or qui respire.
        float dCi = abs(length(fA - 0.5) - (0.36 + 0.03 * sin(tempsSol * 5.0)));
        gl_FragColor.rgb = mix(gl_FragColor.rgb, vec3(0.0), 0.4 * (1.0 - smoothstep(wA * 2.0, wA * 3.0, dCi)) * aireOn);
        gl_FragColor.rgb = mix(gl_FragColor.rgb, vec3(1.0, 0.9, 0.6), 0.95 * (1.0 - smoothstep(wA * 1.0, wA * 2.0, dCi)) * aireOn);
      }
      if (fSurvol > 0.5) {
        // Le survol : le trait de la case en blanc, sur un halo bleu.
        float dbA = abs(dA);
        gl_FragColor.rgb = mix(gl_FragColor.rgb, vec3(0.0, 0.761, 1.0), 0.45 * (1.0 - smoothstep(wA * 1.5, wA * 3.5, dbA)) * aireOn);
        gl_FragColor.rgb = mix(gl_FragColor.rgb, vec3(1.0), 0.95 * (1.0 - smoothstep(wA * 0.5, wA * 1.4, dbA)) * aireOn);
      }
    }
  }`;

  function materiaux(THREE, tex, moy, rampe, T, opts) {
    opts = opts || {};
    const uniforms = {
      poids1: { value: tex.poids1 }, poids2: { value: tex.poids2 }, teinteIle: { value: tex.teinte }, lueurIle: { value: tex.lueur },
      grainSol: { value: tex.grain }, tailleIle: { value: new THREE.Vector2(T.largeur, T.hauteur) },
      matieres: { value: tex.matieres }, moyennes: { value: moy.map(c => new THREE.Vector3(c[0], c[1], c[2])) },
      forceLueur: { value: 1 }, reperage: { value: 4 },
      aireOn: { value: 0 }, aireO: { value: new THREE.Vector2(0, 0) }, etatCases: { value: null },
      tempsSol: { value: 0 }, traitU: { value: 0.05 }, tactiqueSol: { value: 0 }, grilleSol: { value: 1 },
    };
    const tableau = !!tex.matieres;
    const fabriquer = bord => {
      const m = new THREE.MeshToonMaterial({ color: 0xffffff, gradientMap: rampe, emissive: 0x000000 });
      m.onBeforeCompile = sh => {
        Object.assign(sh.uniforms, uniforms);
        sh.vertexShader = sh.vertexShader
          .replace('#include <common>', '#include <common>\nvarying vec3 vMonde;')
          .replace('#include <project_vertex>', '#include <project_vertex>\nvMonde = (modelMatrix * vec4(transformed, 1.0)).xyz;');
        sh.fragmentShader = sh.fragmentShader
          .replace('#include <common>', `#include <common>
varying vec3 vMonde;
uniform sampler2D poids1; uniform sampler2D poids2; uniform sampler2D teinteIle; uniform sampler2D lueurIle; uniform sampler2D grainSol;
uniform vec2 tailleIle; uniform float forceLueur; uniform float reperage; uniform vec3 moyennes[6];
uniform float aireOn; uniform vec2 aireO; uniform sampler2D etatCases; uniform float tempsSol; uniform float traitU; uniform float tactiqueSol; uniform float grilleSol;
${tableau ? 'uniform highp sampler2DArray matieres;' : ''}`)
          .replace('#include <map_fragment>', `
  vec2 bruitSol = texture2D(grainSol, vMonde.xz / 5.3).rg - 0.5;
  vec2 uvIle = (vMonde.xz + bruitSol * 0.55) / tailleIle;
  vec4 p1 = texture2D(poids1, uvIle);
  vec4 p2 = texture2D(poids2, uvIle);
  ${bord ? 'if (texture2D(poids2, vMonde.xz / tailleIle).a < 0.502) discard;' : ''}
  vec2 rep = vMonde.xz / reperage;
  vec3 sol = vec3(0.0);
  ${tableau ? `
  if (p1.r > 0.004) sol += p1.r * texture(matieres, vec3(rep, 0.0)).rgb;
  if (p1.g > 0.004) sol += p1.g * texture(matieres, vec3(rep, 1.0)).rgb;
  if (p1.b > 0.004) sol += p1.b * texture(matieres, vec3(rep, 2.0)).rgb;
  if (p1.a > 0.004) sol += p1.a * texture(matieres, vec3(rep, 3.0)).rgb;
  if (p2.r > 0.004) sol += p2.r * texture(matieres, vec3(rep, 4.0)).rgb;
  if (p2.g > 0.004) sol += p2.g * texture(matieres, vec3(rep, 5.0)).rgb;` : `
  sol = p1.r * moyennes[0] + p1.g * moyennes[1] + p1.b * moyennes[2] + p1.a * moyennes[3] + p2.r * moyennes[4] + p2.g * moyennes[5];
  sol *= 0.8 + 0.4 * texture2D(grainSol, vMonde.xz / 1.7).r;`}
  sol /= max(0.2, p1.r + p1.g + p1.b + p1.a + p2.r + p2.g);
  vec3 teinte = texture2D(teinteIle, uvIle).rgb * 2.0;
  diffuseColor.rgb *= sol * teinte * (0.32 + 0.68 * p2.b);`)
          .replace('#include <emissivemap_fragment>', `#include <emissivemap_fragment>
  totalEmissiveRadiance += texture2D(lueurIle, uvIle).rgb * forceLueur;`)
          .replace('#include <fog_fragment>', '#include <fog_fragment>\n' + GRILLE);
      };
      m.customProgramCacheKey = () => 'ile-sol-' + (bord ? 'bord' : 'plein') + (tableau ? '-tab' : '-moy');
      if (bord) { m.polygonOffset = false; }
      return m;
    };
    return { interieur: fabriquer(false), bord: fabriquer(true), uniforms };
  }

  function materiauSalle(THREE, texSol, rampe) {
    const uniforms = { aireOn: { value: 0 }, aireO: { value: new THREE.Vector2(0, 0) }, etatCases: { value: null }, tempsSol: { value: 0 }, traitU: { value: 0.05 }, tactiqueSol: { value: 0 }, grilleSol: { value: 1 } };
    const m = new THREE.MeshToonMaterial({ color: 0xffffff, map: texSol, gradientMap: rampe, side: THREE.DoubleSide });
    m.onBeforeCompile = sh => {
      Object.assign(sh.uniforms, uniforms);
      sh.vertexShader = sh.vertexShader
        .replace('#include <common>', '#include <common>\nvarying vec3 vMonde;')
        .replace('#include <project_vertex>', '#include <project_vertex>\nvMonde = (modelMatrix * vec4(transformed, 1.0)).xyz;');
      sh.fragmentShader = sh.fragmentShader
        .replace('#include <common>', '#include <common>\nvarying vec3 vMonde;\nuniform float aireOn; uniform vec2 aireO; uniform sampler2D etatCases; uniform float tempsSol; uniform float traitU; uniform float tactiqueSol; uniform float grilleSol;')
        .replace('#include <fog_fragment>', '#include <fog_fragment>\n' + GRILLE);
    };
    m.customProgramCacheKey = () => 'ile-sol-salle';
    return { sol: m, uniforms };
  }

  function grille(materiau, uniforms) {
    const prec = materiau.onBeforeCompile, cle = Object.prototype.hasOwnProperty.call(materiau, 'customProgramCacheKey') ? materiau.customProgramCacheKey : null;
    materiau.onBeforeCompile = (sh, r) => {
      if (prec) prec(sh, r);
      Object.assign(sh.uniforms, uniforms);
      sh.vertexShader = sh.vertexShader
        .replace('#include <common>', '#include <common>\nvarying vec3 vMonde;')
        .replace('#include <project_vertex>', '#include <project_vertex>\nvMonde = (modelMatrix * vec4(transformed, 1.0)).xyz;');
      sh.fragmentShader = sh.fragmentShader
        .replace('#include <common>', '#include <common>\nvarying vec3 vMonde;\nuniform float aireOn; uniform vec2 aireO; uniform sampler2D etatCases; uniform float tempsSol; uniform float traitU; uniform float tactiqueSol; uniform float grilleSol;')
        .replace('#include <fog_fragment>', '#include <fog_fragment>\n' + GRILLE);
    };
    materiau.customProgramCacheKey = () => 'ile-sol-grille-' + (materiau.vertexColors ? 'c' : 'u') + (materiau.map ? 't' : '') + (cle ? '/' + cle.call(materiau) : '');
    materiau.needsUpdate = true;
    return materiau;
  }

  return { TUILE, falaises, hauteurs, preparer, tuiles, materiaux, materiauSalle, grille };
})();
