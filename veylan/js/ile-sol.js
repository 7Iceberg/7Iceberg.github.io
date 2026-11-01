// Le sol de l'île d'Ervane en 3D (docs/ILE-TECHNIQUE.md, 3.4) : 8 × 6 tuiles de relief de 30 × 30 u
// sur un treillis global aux u entiers (un sommet par u : les coins de chaque case de combat sont
// des sommets du maillage), un niveau lointain à un sommet pour 2 u au-delà de 70 u du point visé,
// une jupe sous les bords des tuiles lointaines contre les fentes. Les triangles dont les trois
// sommets sont loin de la terre ferme disparaissent ; ceux du bord passent par une variante du
// matériau qui coupe exactement au contour de l'île (le champ de distance de js/ile-peinture.js).
//
// Les escarpements : un sommet par u dessinerait en dents de scie une falaise de 12 u tracée en
// biais. Les sommets du treillis proches du tracé (lissé) y sont ramenés, chacun du côté de sa
// hauteur : la marche suit le tracé, et une face de falaise dédiée (js/ile-decor.js, d'après
// IleSol.falaises) la couvre de strates.
//
// Le matériau : MeshToonMaterial (la rampe à deux valeurs du prototype) dont le shader mélange les
// six matières peintes (une DataArrayTexture en WebGL2, répétée tous les 4 u) selon la carte des
// poids, multiplie par la teinte de l'île, assombrit par les ombres cuites et ajoute la lueur.
// Sans WebGL2, la couleur moyenne des matières et un grain remplacent les couches.
const IleSol = (() => {
  const TUILE = 30;

  // ----- Les escarpements -----

  // Pour chaque escarpement : le tracé lissé, et pour chaque sommet du treillis à moins de 1,6 u,
  // sa position ramenée sur le tracé du côté de sa hauteur (haut ou bas). Rend { surcharges: Map
  // index -> { u, v, cote }, faces: [{ pts, hauts, bas, cote }] }.
  function falaises(T) {
    const surcharges = new Map(), faces = [];
    // Les tracés lissés et leurs échantillons (normales, côté haut, hauteurs, face vraie) viennent du
    // terrain : la navigation (js/ile-nav.js) ferme la même bande que ces faces couvrent.
    for (const f of IleTerrain.facesEscarpements(T)) {
      const { pts, cum, ech } = f;
      faces.push(f);
      // Les sommets du treillis proches du tracé.
      const u0 = Math.max(0, Math.floor(Math.min(...pts.map(p => p[0])) - 2)), u1 = Math.min(T.W - 1, Math.ceil(Math.max(...pts.map(p => p[0])) + 2));
      const v0 = Math.max(0, Math.floor(Math.min(...pts.map(p => p[1])) - 2)), v1 = Math.min(T.H - 1, Math.ceil(Math.max(...pts.map(p => p[1])) + 2));
      for (let v = v0; v <= v1; v++) for (let u = u0; u <= u1; u++) {
        const i = v * T.W + u;
        const pr = IleTerrain.projeter(pts, cum, u, v);
        if (pr.d > 1.6) continue;
        const q = IleTerrain.pointA(pts, cum, pr.s);
        // L'échantillon le plus proche dit le côté haut et les hauteurs.
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

  // ----- Hauteurs et normales du rendu -----

  // Les hauteurs du rendu : celles du terrain, prolongées de 2 u dans le vide autour de la terre
  // ferme (la moyenne des voisins), pour que le bord coupé par le shader continue la pente.
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

  // La normale d'un sommet du treillis, par différences centrées ; près d'un escarpement, seulement
  // avec les voisins du même côté (sinon le bord du plateau s'assombrirait d'une marche fantôme).
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

  // ----- Les tuiles -----

  // Les sommets utiles : à moins de 1,5 u de la terre ferme.
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

  // Une tuile au pas `pas` (1 : proche, 2 : lointaine) : BufferGeometry à deux groupes (intérieur,
  // bord). Rend null si la tuile n'a rien à dessiner.
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
      // Un coin dans le vide, ou trop près du bord : la cellule passe par le matériau qui coupe.
      let bord = false;
      for (const [aa, bb] of [[a, b], [a + 1, b], [a, b + 1], [a + 1, b + 1]]) {
        const [u, v] = lat(aa, bb);
        if (prep.presBord[v * W + u]) { bord = true; break; }
      }
      const L = bord ? idxBord : idxIn;
      // Diagonale alternée : moins de facettes orientées toutes dans le même sens.
      if ((a + b) % 2 === 0) L.push(A, C, B, B, C, D); else L.push(A, C, D, A, D, B);
    }
    if (!idxIn.length && !idxBord.length) return null;
    // La jupe des tuiles lointaines : 1 u sous les quatre bords, contre les fentes entre niveaux.
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

  // Toutes les tuiles, proches et lointaines : [{ tx, ty, proche, loin, centre: [u, v] }].
  function preparer(T) {
    const f = falaises(T);
    const hh = hauteurs(T);
    const prep = { h: hh.h, surcharges: f.surcharges, utiles: utiles(T), presBord: new Uint8Array(T.W * T.H) };
    // Près du bord : un sommet dans le vide, ou un voisin à 1 u qui l'est.
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

  // ----- Le matériau du sol -----

  // La grille du combat, posée sur la couleur finale (après l'encodage, comme les surbrillances des
  // cartes à cases, peintes en sRGB) : hors de l'aire, le terrain s'assombrit doucement ; dans
  // l'aire, un filet sombre au bord des cases de sol, puis l'état de chaque case lu dans une
  // texture de 64 × 16 (4 texels par case : remplissage, trait, genre, drapeaux et hauteur, piège), avec la
  // priorité et les couleurs de RendererGL.updateCells. Les bords suivent les u entiers du monde : la
  // grille épouse le relief, sans fwidth (absent de WebGL 1 sans extension).
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
      vec2 cA = abs(fA - 0.5);
      float mA = max(cA.x, cA.y);
      float wA = traitU;
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
      } else if (sorteA < 0.5) {
        float lgA = smoothstep(0.5 - wA * 1.1, 0.5 - wA * 0.1, mA);
        gl_FragColor.rgb = mix(gl_FragColor.rgb, vec3(0.04, 0.05, 0.08), 0.32 * lgA * aireOn);
      }
      float poulsA = mod(drapA, 8.0) > 3.5 ? 0.72 + 0.28 * sin(tempsSol / 0.34) : 1.0;
      if (remA.a > 0.0) {
        float dansA = 1.0 - smoothstep(0.47 - wA * 0.5, 0.47 + wA * 0.5, mA);
        gl_FragColor.rgb = mix(gl_FragColor.rgb, remA.rgb, remA.a * dansA * aireOn * poulsA);
      }
      if (traA.a > 0.0) {
        float ttA = 1.0 - smoothstep(wA * 0.6, wA * 1.3, abs(mA - 0.47));
        gl_FragColor.rgb = mix(gl_FragColor.rgb, traA.rgb, traA.a * ttA * aireOn * poulsA);
      }
      if (pieA.a > 0.0) {
        // Un piège du Veilleur : une croix de la couleur de son élément, cernée de sombre.
        float extA = max(cA.x, cA.y), brasA = min(cA.x, cA.y);
        float foA = (1.0 - smoothstep(wA * 1.6, wA * 2.4, brasA)) * step(extA, 0.31);
        float clA = (1.0 - smoothstep(wA * 0.7, wA * 1.3, brasA)) * step(extA, 0.28);
        gl_FragColor.rgb = mix(gl_FragColor.rgb, vec3(0.0), 0.5 * foA * aireOn);
        gl_FragColor.rgb = mix(gl_FragColor.rgb, pieA.rgb, clA * aireOn);
      }
      if (mod(drapA, 4.0) > 1.5) {
        // Le chemin : un point blanc cerné de sombre au milieu de la case.
        float dpA = length(fA - 0.5);
        gl_FragColor.rgb = mix(gl_FragColor.rgb, vec3(0.0), 0.4 * (1.0 - smoothstep(wA * 3.5, wA * 4.5, dpA)) * aireOn);
        gl_FragColor.rgb = mix(gl_FragColor.rgb, vec3(1.0), 0.9 * (1.0 - smoothstep(wA * 2.4, wA * 3.2, dpA)) * aireOn);
      }
      if (mod(drapA, 2.0) > 0.5) {
        // Le survol : le bord de la case, blanc sur un halo bleu.
        float dbA = 0.5 - mA;
        gl_FragColor.rgb = mix(gl_FragColor.rgb, vec3(0.0, 0.761, 1.0), 0.35 * (1.0 - smoothstep(wA * 3.0, wA * 4.0, dbA)) * aireOn);
        gl_FragColor.rgb = mix(gl_FragColor.rgb, vec3(1.0), 0.95 * (1.0 - smoothstep(wA * 1.3, wA * 2.1, dbA)) * aireOn);
      }
    }
  }`;

  // `tex` : { matieres (DataArrayTexture ou null), poids1, poids2, teinte, lueur, grain }, `moy` :
  // les couleurs moyennes des six matières (linéaires). Rend { interieur, bord, uniforms }.
  function materiaux(THREE, tex, moy, rampe, T, opts) {
    opts = opts || {};
    const uniforms = {
      poids1: { value: tex.poids1 }, poids2: { value: tex.poids2 }, teinteIle: { value: tex.teinte }, lueurIle: { value: tex.lueur },
      grainSol: { value: tex.grain }, tailleIle: { value: new THREE.Vector2(T.largeur, T.hauteur) },
      matieres: { value: tex.matieres }, moyennes: { value: moy.map(c => new THREE.Vector3(c[0], c[1], c[2])) },
      forceLueur: { value: 1 }, reperage: { value: 4 },
      // Le combat (5.4) : l'aire (son coin), l'état de ses cases, le passage (0 à 1), la largeur d'un
      // pixel en u (les traits gardent leur épaisseur à l'écran), le temps (les cases qui
      // respirent), la vue tactique.
      aireOn: { value: 0 }, aireO: { value: new THREE.Vector2(0, 0) }, etatCases: { value: null },
      tempsSol: { value: 0 }, traitU: { value: 0.05 }, tactiqueSol: { value: 0 },
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
uniform float aireOn; uniform vec2 aireO; uniform sampler2D etatCases; uniform float tempsSol; uniform float traitU; uniform float tactiqueSol;
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

  // Le sol d'une salle de donjon (js/ile-salle.js) : la toile peinte des dalles, le modelé en aplats
  // et la grille du combat par-dessus, avec les mêmes uniformes que le sol de l'île. Rend { sol, uniforms }.
  function materiauSalle(THREE, texSol, rampe) {
    const uniforms = { aireOn: { value: 0 }, aireO: { value: new THREE.Vector2(0, 0) }, etatCases: { value: null }, tempsSol: { value: 0 }, traitU: { value: 0.05 }, tactiqueSol: { value: 0 } };
    const m = new THREE.MeshToonMaterial({ color: 0xffffff, map: texSol, gradientMap: rampe, side: THREE.DoubleSide });
    m.onBeforeCompile = sh => {
      Object.assign(sh.uniforms, uniforms);
      sh.vertexShader = sh.vertexShader
        .replace('#include <common>', '#include <common>\nvarying vec3 vMonde;')
        .replace('#include <project_vertex>', '#include <project_vertex>\nvMonde = (modelMatrix * vec4(transformed, 1.0)).xyz;');
      sh.fragmentShader = sh.fragmentShader
        .replace('#include <common>', '#include <common>\nvarying vec3 vMonde;\nuniform float aireOn; uniform vec2 aireO; uniform sampler2D etatCases; uniform float tempsSol; uniform float traitU; uniform float tactiqueSol;')
        .replace('#include <fog_fragment>', '#include <fog_fragment>\n' + GRILLE);
    };
    m.customProgramCacheKey = () => 'ile-sol-salle';
    return { sol: m, uniforms };
  }

  // La grille du combat posée sur une matière qui existe déjà (le sol du monde modelé, js/ile-glb.js,
  // 3.26) : les mêmes uniformes que le sol de l'île (Ile3D.mats.uSol : l'aire, l'état des cases, le
  // passage, la vue tactique), le même dessin (GRILLE) après le brouillard. Sans elle, le monde
  // modelé cachait les cases du combat (le shader des cases était celui du sol dessiné par le code).
  function grille(materiau, uniforms) {
    const prec = materiau.onBeforeCompile, cle = Object.prototype.hasOwnProperty.call(materiau, 'customProgramCacheKey') ? materiau.customProgramCacheKey : null;
    materiau.onBeforeCompile = (sh, r) => {
      if (prec) prec(sh, r);
      Object.assign(sh.uniforms, uniforms);
      sh.vertexShader = sh.vertexShader
        .replace('#include <common>', '#include <common>\nvarying vec3 vMonde;')
        .replace('#include <project_vertex>', '#include <project_vertex>\nvMonde = (modelMatrix * vec4(transformed, 1.0)).xyz;');
      sh.fragmentShader = sh.fragmentShader
        .replace('#include <common>', '#include <common>\nvarying vec3 vMonde;\nuniform float aireOn; uniform vec2 aireO; uniform sampler2D etatCases; uniform float tempsSol; uniform float traitU; uniform float tactiqueSol;')
        .replace('#include <fog_fragment>', '#include <fog_fragment>\n' + GRILLE);
    };
    materiau.customProgramCacheKey = () => 'ile-sol-grille-' + (materiau.vertexColors ? 'c' : 'u') + (materiau.map ? 't' : '') + (cle ? '/' + cle.call(materiau) : '');
    materiau.needsUpdate = true;
    return materiau;
  }

  return { TUILE, falaises, hauteurs, preparer, tuiles, materiaux, materiauSalle, grille };
})();
