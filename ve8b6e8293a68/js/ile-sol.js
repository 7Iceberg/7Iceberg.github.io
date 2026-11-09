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
  // Le genre d'une case de l'aire (0 sol, 1 rocher, 2 trou, 3 eau, 4 arbre, 5 hors de l'aire : un
  // trou relié au bord, Arene.ecrireFixe) ; hors du carré, 5.
#define GENRE_AIRE(c) (((c).x < 0.0 || (c).y < 0.0 || (c).x > 14.0 || (c).y > 14.0) ? 5.0 : floor(texture2D(etatCases, vec2(((c).x * 4.0 + 2.5) / 64.0, ((c).y + 0.5) / 16.0)).r * 255.0 + 0.5))
  if (aireOn > 0.002) {
    vec2 qA = vMonde.xz - aireO;
    vec2 dhA = max(max(-qA, qA - 15.0), vec2(0.0));
    float horsA = length(dhA);
    gl_FragColor.rgb *= 1.0 - aireOn * mix(0.36 * smoothstep(0.0, 2.5, horsA), 0.9 * smoothstep(0.0, 0.35, horsA), tactiqueSol);
    // Un liseré sombre juste hors du carré : le bord de l'aire se lit sur l'herbe claire comme sur la lande.
    gl_FragColor.rgb *= 1.0 - aireOn * (1.0 - tactiqueSol) * 0.22 * (1.0 - smoothstep(0.0, 0.28, horsA)) * step(0.0005, horsA);
    // Le sol peint en dalles : l'aire est une plaque posée sur le terrain. Sur ses côtés tournés vers la
    // caméra, sa tranche (la peinture assombrie, plus claire en haut) ; tout autour, au pied, un liseré
    // ambré qui dit où finit le combat.
    if (horsA > 0.0 && solCombatOn > 0.5 && taillerDalles > 0.5 && tactiqueSol < 0.5 && GENRE_AIRE(clamp(floor(qA), 0.0, 14.0)) < 4.5) {
      vec2 oA = sign(qA - 7.5) * step(0.0005, dhA);
      float faceA = step(0.05, dot(normalize(oA + 1e-5), camSol));
      float epA = 0.26 * faceA;
      float tA = 1.0 - smoothstep(epA - 0.012, epA + 0.012, horsA);
      vec3 flancA = texture2D(solCombat, vMonde.xz / 4.0 + 0.37).rgb * solCombatLum * mix(0.62, 0.36, clamp(horsA / max(epA, 0.01), 0.0, 1.0));
      gl_FragColor.rgb = mix(gl_FragColor.rgb, flancA, tA * faceA * aireOn);
      float lA = (1.0 - smoothstep(0.0, 0.03, abs(horsA - epA - 0.05))) ;
      gl_FragColor.rgb = mix(gl_FragColor.rgb, vec3(0.85, 0.53, 0.22), 0.85 * lA * aireOn);
    }
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
        else if ((sorteA > 1.5 && sorteA < 2.5) || sorteA > 4.5) ardA = vec3(0.02, 0.027, 0.043);
        else if (sorteA > 0.5) ardA = vec3(0.071, 0.086, 0.125);
        float dansT = 1.0 - smoothstep(0.49 - wA * 0.5, 0.49 + wA * 0.5, mA);
        gl_FragColor.rgb = mix(gl_FragColor.rgb, mix(vec3(0.027, 0.043, 0.078), ardA, dansT), aireOn);
        if (sorteA > 0.5 && (sorteA < 1.5 || (sorteA > 3.5 && sorteA < 4.5))) {
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
        } else if (sorteA > 1.5 && !(solCombatOn > 0.5 && taillerDalles > 0.5 && (sorteA < 2.5 || sorteA > 4.5))) {
          gl_FragColor.rgb = mix(gl_FragColor.rgb, vec3(0.03, 0.04, 0.07), 0.35 * lisere * aireOn);
        }
      }
      // Dalles : pierre opaque, joints et petits chanfreins éclairés selon le terrain.
      // La couleur du terrain ne traverse plus le pavement. Les repères tactiques restent au-dessus.
      if (sorteA < 0.5 && solCombatOn > 0.5) {
        // Le sol peint de la zone (assets/sols, Ile3D.SOLS_COMBAT), taillé en dalles comme sur les planches
        // de référence (le 9 novembre 2026) : chaque case est une dalle à part, son propre morceau de la peinture
        // (un décalage tiré de la case), un ton à elle et le damier ; un joint sombre, un chanfrein clair au
        // bord loin de la caméra, la tranche sombre de la dalle au bord proche. taillerDalles = 0 (?dalles=0) :
        // la peinture continue d'avant, un filet fin et un damier léger.
        vec2 hS = fract(sin(vec2(dot(celA + aireO, vec2(127.1, 311.7)), dot(celA + aireO, vec2(269.5, 183.3)))) * 43758.5453);
        vec3 peintS;
        if (taillerDalles > 0.5) {
          peintS = texture2D(solCombat, (vMonde.xz + floor(hS * 4.0) + hS.yx * 0.5) / 4.0).rgb * solCombatLum;
          // Une pierre calme : le détail de la peinture adouci vers sa moyenne (le plus petit niveau de la
          // texture), le dessin de la dalle (joint, chanfrein, tranche) porte le reste.
          vec3 moyS = texture2D(solCombat, vec2(0.5), 12.0).rgb * solCombatLum;
          peintS = mix(moyS, peintS, solCombatDetail);
          // La pierre prend la teinte du terrain sous elle (solCombatTerre : la part, par zone) : l'aire
          // appartient au paysage, comme les dalles beiges de la référence sur l'herbe jaune.
          vec3 terreS = gl_FragColor.rgb;
          float lumP = dot(peintS, vec3(0.299, 0.587, 0.114)), lumT = max(dot(terreS, vec3(0.299, 0.587, 0.114)), 0.04);
          peintS = mix(peintS, lumP * mix(vec3(1.0), terreS / lumT, 0.85), solCombatTerre);
          peintS *= (mod(celA.x + celA.y, 2.0) > 0.5 ? 0.9 : 1.0) * (0.92 + 0.16 * hS.x);
          float dS = 0.5 - mA, aaS = clamp(wA * 0.5, 0.003, 0.02);
          vec2 eS = cA.x > cA.y ? vec2(sign(fA.x - 0.5), 0.0) : vec2(0.0, sign(fA.y - 0.5));
          float procheS = step(0.0, dot(eS, camSol));
          float jS = 0.012 + wA * 0.55;
          float jointS = 1.0 - smoothstep(jS - aaS, jS + aaS, dS);
          float trancheS = (1.0 - smoothstep(jS + 0.04 - aaS, jS + 0.04 + aaS, dS)) * procheS;
          float chanfreinS = (1.0 - smoothstep(jS + 0.035 - aaS, jS + 0.035 + aaS, dS)) * (1.0 - procheS);
          peintS = mix(peintS, peintS * 1.16 + 0.03, 0.8 * chanfreinS);
          peintS = mix(peintS, peintS * 0.7, trancheS);
          // Dans les joints, le terrain : l'herbe ou la terre, plus sombre au fond ; à certains coins, une
          // touffe qui déborde un peu sur les dalles voisines.
          vec2 kS = floor(qA + 0.5);
          float hK = fract(sin(dot(kS + aireO, vec2(41.3, 289.1))) * 15731.743);
          float touffeS = (1.0 - smoothstep(0.05, 0.13 + 0.06 * hK, length(qA - kS))) * step(0.55, hK);
          vec3 fondS = mix(terreS * 0.55, terreS * 0.9, 0.5 + 0.5 * sin(dot(qA, vec2(23.0, 17.0))));
          peintS = mix(peintS, fondS, 0.9 * max(jointS, touffeS));
        } else {
          peintS = texture2D(solCombat, vMonde.xz / 4.0).rgb * solCombatLum;
          peintS *= mod(celA.x + celA.y, 2.0) > 0.5 ? 0.955 : 1.0;
          if (grilleSol > 0.5 || tactiqueSol > 0.5) {
            float filetS = smoothstep(0.5 - wA * 1.3, 0.5 - wA * 0.15, mA);
            peintS = mix(peintS, peintS * 0.42, 0.6 * filetS);
          }
        }
        if (tactiqueSol > 0.5) peintS = mix(peintS, gl_FragColor.rgb, 0.7);
        gl_FragColor.rgb = mix(gl_FragColor.rgb, peintS, aireOn);
      } else if (sorteA < 0.5 && (grilleSol > 0.5 || tactiqueSol > 0.5)) {
        vec2 idD = floor(vMonde.xz);
        float rD = fract(sin(dot(idD, vec2(127.1, 311.7))) * 43758.5453);
        float r2D = fract(sin(dot(idD, vec2(269.5, 183.3))) * 15731.743);
        float aaD = clamp(wA * 0.38, 0.002, 0.018);
        vec2 pD = fA - 0.5;
        // Coins très légèrement abattus ; une petite ébréchure sur certaines pierres seulement.
        float bordD = 0.477 + (r2D - 0.5) * 0.009;
        float dD = max(mA - bordD, (cA.x + cA.y - (0.925 + 0.022 * rD)) * 0.7071);
        if (rD > 0.86 && pD.x > 0.0 && pD.y < 0.0) dD = max(dD, (pD.x - pD.y - 0.89) * 0.7071);
        float faceD = 1.0 - smoothstep(-aaD, aaD, dD);
        float platD = 1.0 - smoothstep(-.045 - aaD, -.045 + aaD, dD);
        float chanfreinD = faceD - platD;
        vec3 baseD = vec3(0.66, 0.64, 0.52), clairD = vec3(0.79, 0.76, 0.62), jointCouleurD = vec3(0.26, 0.29, 0.22), mousseCouleurD = vec3(0.34, 0.40, 0.22);
        if (natureDalles > 2.5) { baseD = vec3(0.40, 0.46, 0.48); clairD = vec3(0.49, 0.55, 0.57); jointCouleurD = vec3(0.16, 0.20, 0.22); mousseCouleurD = vec3(0.30, 0.37, 0.26); }
        else if (natureDalles > 1.5 && natureDalles < 2.5) { baseD = vec3(0.66, 0.53, 0.39); clairD = vec3(0.78, 0.65, 0.47); jointCouleurD = vec3(0.29, 0.25, 0.19); mousseCouleurD = vec3(0.39, 0.39, 0.23); }
        vec3 pierreD = mix(baseD, clairD, step(0.5, rD) * 0.38);
        pierreD *= 0.94 + .045 * r2D;
        // Un grain de pierre très fin et quelques strates calmes, jamais la texture de l'herbe.
        float strateD = sin((fA.x * 0.7 + fA.y + rD * 9.0) * 18.0);
        pierreD *= 0.986 + 0.014 * strateD;
        float directionD = clamp((pD.y - pD.x) * 2.5, -1.0, 1.0);
        vec3 trancheD = pierreD * (0.82 + 0.22 * directionD);
        vec3 fondD = mix(jointCouleurD, trancheD, faceD);
        fondD = mix(fondD, pierreD, platD);
        // Une courte fissure ramifiée sur environ une pierre sur quatre.
        vec2 detailD = r2D > 0.5 ? fA : 1.0 - fA;
        float ligneD = abs(detailD.y - (0.18 + detailD.x * 0.37 + 0.012 * sin(detailD.x * 55.0)));
        float fissureD = (1.0 - smoothstep(0.004, 0.009 + aaD * 0.22, ligneD)) * smoothstep(0.04, 0.07, detailD.x) * (1.0 - smoothstep(0.23, 0.27, detailD.x));
        float brancheD = (1.0 - smoothstep(0.004, 0.008 + aaD * 0.2, abs(detailD.y - (0.43 - detailD.x)))) * step(0.13, detailD.x) * step(detailD.x, 0.18);
        float detailNetD = 1.0 - smoothstep(0.04, 0.075, wA);
        if (rD > 0.75) fondD *= 1.0 - 0.30 * max(fissureD, brancheD) * detailNetD * platD;
        // La mousse est localisée contre un joint, sur quelques pierres, sans couvrir le centre.
        float mousseD = (1.0 - smoothstep(0.035, 0.085, length(detailD - vec2(0.075, 0.18))));
        mousseD += 0.7 * (1.0 - smoothstep(0.02, 0.045, length(detailD - vec2(0.13, 0.09))));
        if (rD < 0.26) fondD = mix(fondD, mousseCouleurD, 0.72 * min(1.0, mousseD) * detailNetD * faceD);
        if (tactiqueSol > 0.5) fondD = mix(fondD, gl_FragColor.rgb, 0.7);
        gl_FragColor.rgb = mix(gl_FragColor.rgb, fondD, aireOn);
      }
      // Les trous et le bord découpé de l'aire, avec le sol en dalles (les planches de référence,
      // docs/charte/propositions/trous-contour/). Pour chaque côté de la case, d : la distance du point
      // à ce côté, et g : le genre de la voisine de ce côté.
      if (solCombatOn > 0.5 && taillerDalles > 0.5 && tactiqueSol < 0.5 && sorteA > 1.5 && (sorteA < 2.5 || sorteA > 4.5)) {
        vec2 dX = vec2(1.0, 0.0), dY = vec2(0.0, 1.0);
        float gPx = GENRE_AIRE(celA + dX), gMx = GENRE_AIRE(celA - dX), gPy = GENRE_AIRE(celA + dY), gMy = GENRE_AIRE(celA - dY);
        float ePx = 1.0 - fA.x, eMx = fA.x, ePy = 1.0 - fA.y, eMy = fA.y;
        // Les côtés loin de la caméra (la voisine est plus loin qu'elle) : 1, les autres : 0.
        float lPx = step(dot(dX, camSol), 0.0), lMx = step(-dot(dX, camSol), 0.0), lPy = step(dot(dY, camSol), 0.0), lMy = step(-dot(dY, camSol), 0.0);
        vec3 terreT = gl_FragColor.rgb;
        if (sorteA < 2.5) {
          // Un trou : le fond sombre ; sur les côtés loin de la caméra bordés par l'aire, la paroi de
          // terre (le terrain assombri vers le bas) et, au bord, une lèvre d'herbe claire.
          float murT = 9.0;
          if (lPx > 0.5 && gPx < 4.5 && abs(gPx - 2.0) > 0.5) murT = min(murT, ePx);
          if (lMx > 0.5 && gMx < 4.5 && abs(gMx - 2.0) > 0.5) murT = min(murT, eMx);
          if (lPy > 0.5 && gPy < 4.5 && abs(gPy - 2.0) > 0.5) murT = min(murT, ePy);
          if (lMy > 0.5 && gMy < 4.5 && abs(gMy - 2.0) > 0.5) murT = min(murT, eMy);
          vec3 trouT = terreT * 0.16;
          float tT = clamp(murT / 0.7, 0.0, 1.0);
          vec3 paroiT = mix(terreT * 0.95, terreT * 0.3, tT);
          // Des strates de terre sur la paroi (des bandes douces, parallèles au bord).
          paroiT *= 0.92 + 0.08 * sin(murT * 38.0 + dot(celA, vec2(1.7, 2.3)));
          trouT = mix(trouT, paroiT, 1.0 - smoothstep(0.68, 0.72, murT));
          trouT = mix(trouT, terreT * 1.05, 1.0 - smoothstep(0.035, 0.05, murT));
          gl_FragColor.rgb = mix(gl_FragColor.rgb, trouT, aireOn);
        } else {
          // Hors de l'aire (le bord découpé) : le terrain ; contre une case de l'aire plus loin de la
          // caméra, la tranche de la plaque ; le long de l'aire, le liseré ambré.
          float trT = 9.0, liT = 9.0;
          if (gPx < 4.5) { if (lPx > 0.5) trT = min(trT, ePx); liT = min(liT, abs(ePx - (lPx > 0.5 ? 0.31 : 0.05))); }
          if (gMx < 4.5) { if (lMx > 0.5) trT = min(trT, eMx); liT = min(liT, abs(eMx - (lMx > 0.5 ? 0.31 : 0.05))); }
          if (gPy < 4.5) { if (lPy > 0.5) trT = min(trT, ePy); liT = min(liT, abs(ePy - (lPy > 0.5 ? 0.31 : 0.05))); }
          if (gMy < 4.5) { if (lMy > 0.5) trT = min(trT, eMy); liT = min(liT, abs(eMy - (lMy > 0.5 ? 0.31 : 0.05))); }
          vec3 flancT = texture2D(solCombat, vMonde.xz / 4.0 + 0.37).rgb * solCombatLum * mix(0.62, 0.36, clamp(trT / 0.26, 0.0, 1.0));
          gl_FragColor.rgb = mix(gl_FragColor.rgb, flancT, (1.0 - smoothstep(0.248, 0.272, trT)) * aireOn);
          gl_FragColor.rgb = mix(gl_FragColor.rgb, vec3(0.85, 0.53, 0.22), 0.85 * (1.0 - smoothstep(0.0, 0.03, liT)) * aireOn);
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
      tempsSol: { value: 0 }, traitU: { value: 0.05 }, tactiqueSol: { value: 0 }, grilleSol: { value: 1 }, natureDalles: { value: 0 }, solCombat: { value: null }, solCombatOn: { value: 0 }, solCombatLum: { value: 1 }, taillerDalles: { value: 1 }, camSol: { value: new THREE.Vector2(0.7071, 0.7071) }, solCombatTerre: { value: 0.4 }, solCombatDetail: { value: 0.6 },
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
uniform float aireOn; uniform vec2 aireO; uniform sampler2D etatCases; uniform float tempsSol; uniform float traitU; uniform float tactiqueSol; uniform float grilleSol; uniform float natureDalles; uniform sampler2D solCombat; uniform float solCombatOn; uniform float solCombatLum; uniform float taillerDalles; uniform vec2 camSol; uniform float solCombatTerre; uniform float solCombatDetail;
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
    const uniforms = { aireOn: { value: 0 }, aireO: { value: new THREE.Vector2(0, 0) }, etatCases: { value: null }, tempsSol: { value: 0 }, traitU: { value: 0.05 }, tactiqueSol: { value: 0 }, grilleSol: { value: 1 }, natureDalles: { value: 0 }, solCombat: { value: null }, solCombatOn: { value: 0 }, solCombatLum: { value: 1 }, taillerDalles: { value: 1 }, camSol: { value: new THREE.Vector2(0.7071, 0.7071) }, solCombatTerre: { value: 0.4 }, solCombatDetail: { value: 0.6 } };
    const m = new THREE.MeshToonMaterial({ color: 0xffffff, map: texSol, gradientMap: rampe, side: THREE.DoubleSide });
    m.onBeforeCompile = sh => {
      Object.assign(sh.uniforms, uniforms);
      sh.vertexShader = sh.vertexShader
        .replace('#include <common>', '#include <common>\nvarying vec3 vMonde;')
        .replace('#include <project_vertex>', '#include <project_vertex>\nvMonde = (modelMatrix * vec4(transformed, 1.0)).xyz;');
      sh.fragmentShader = sh.fragmentShader
        .replace('#include <common>', '#include <common>\nvarying vec3 vMonde;\nuniform float aireOn; uniform vec2 aireO; uniform sampler2D etatCases; uniform float tempsSol; uniform float traitU; uniform float tactiqueSol; uniform float grilleSol; uniform float natureDalles; uniform sampler2D solCombat; uniform float solCombatOn; uniform float solCombatLum; uniform float taillerDalles; uniform vec2 camSol; uniform float solCombatTerre; uniform float solCombatDetail;')
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
        .replace('#include <common>', '#include <common>\nvarying vec3 vMonde;\nuniform float aireOn; uniform vec2 aireO; uniform sampler2D etatCases; uniform float tempsSol; uniform float traitU; uniform float tactiqueSol; uniform float grilleSol; uniform float natureDalles; uniform sampler2D solCombat; uniform float solCombatOn; uniform float solCombatLum; uniform float taillerDalles; uniform vec2 camSol; uniform float solCombatTerre; uniform float solCombatDetail;')
        .replace('#include <fog_fragment>', '#include <fog_fragment>\n' + GRILLE);
    };
    materiau.customProgramCacheKey = () => 'ile-sol-grille-' + (materiau.vertexColors ? 'c' : 'u') + (materiau.map ? 't' : '') + (cle ? '/' + cle.call(materiau) : '');
    materiau.needsUpdate = true;
    return materiau;
  }

  return { TUILE, falaises, hauteurs, preparer, tuiles, materiaux, materiauSalle, grille };
})();

