// Le Lampignard modelé par le code (docs/ILE-TECHNIQUE.md, 3.15) : le grand frère du Lampignon,
// un champignon chaman à la coiffe rousse, aux épaulettes de chapeaux, au pagne vert et au bâton
// tordu d'où coule une bave qui luit. Écrit pièce par pièce d'après sa planche, par le même procédé
// que le Lampignon (js/modele-lampignon.js), dont il reprend les outils d'assemblage : des cotes,
// des tours (lathe), des capsules, des ellipsoïdes, un tube le long d'une courbe pour le bâton, des
// textures peintes par le code, des lueurs à part et un cerne en coque retournée.
//
// Cinq maillages, cinq appels : le corps (en ombrage à trois tons et couleurs de sommets), le cerne,
// le dessous des coiffes (lamelles), les lueurs (yeux, bave, bandage) et le halo de la crosse,
// additif. Dans le jeu, une troupe instanciée (Troupe) que le parc des Glyms modelés
// (ModeleGlym.Parc) pose avec les autres ; sur la planche, un THREE.Group (construire).
//
// Repère : y en haut, la face vers +z, les pieds sur y = 0, le bâton dans la main droite (+x) ;
// unités de la planche. Charger js/modele-lampignon.js avant ce fichier.
const ModeleLampignard = (() => {
  const TAU = Math.PI * 2;
  const { Brut, ajouter, enGeo, coque, lisser, tube, occlusion, matierePeinte, animable, poserGeste, gesteInstance, avecGeste, partieFixe, GESTES } = ModeleLampignon.outils;

  const COTES = {
    // Du sol au sommet de la coiffe (le bâton monte plus haut, vers 35).
    hauteur: 31.4, emprise: 24,
    // La coiffe dans son repère (le bord à y = 0), du bord vers le sommet : une cloche large au bord
    // roulé, festonnée vue de dessus.
    // (Relevée sur la vue de face de la fiche, docs/ILE-TECHNIQUE.md 3.21 : le bord qui s'évase,
    // un pli vers 3,3 où il rejoint le dôme, le sommet rond à 31,4.)
    coiffe: [[8.75, -0.3], [9.1, 0.3], [9.25, 1.0], [9.2, 1.6], [9.0, 2.0], [8.7, 2.45], [8.3, 2.9], [7.75, 3.3], [7.1, 3.7], [6.4, 4.15], [5.75, 4.6], [4.9, 5.4], [4.1, 6.25], [3.3, 7.1], [2.2, 7.9], [1.1, 8.3], [0, 8.45]],
    dessous: [[8.75, -0.3], [7.8, 0.25], [6.3, 0.85], [4.6, 1.55], [3.0, 2.05], [1.5, 2.35], [0, 2.45]],
    // La pose : le bord de devant relevé au-dessus des yeux, celui de derrière tombant sur la nuque.
    pose: { y: 23.0, z: -0.7, inclinaison: -0.28 },
    festons: 12,
    // La tête, une poire renversée sous la coiffe, un peu avancée ; le torse mince et plat.
    tete: [[0, 18.9], [1.6, 19.1], [2.7, 19.8], [3.3, 21.0], [3.4, 22.4], [3.1, 23.8], [2.3, 24.9], [0, 25.4]],
    teteZ: 1.7, aplatiTete: 0.88,
    torse: [[0, 9.3], [2.4, 9.5], [2.9, 10.6], [2.7, 12.2], [2.55, 13.6], [2.85, 15.2], [3.15, 16.6], [3.05, 17.8], [2.2, 18.6], [1.1, 19.0], [0, 19.1]],
    aplatiTorse: 0.78,
    yeux: { y: 22.6, ecart: 1.95, rayons: [1.08, 1.12, 0.4], z: 4.02, lacet: 0.45 },
    epaulettes: { x: 4.3, y: 17.6, z: -0.3, bascule: 0.32, profil: [[3.0, -0.55], [3.2, -0.1], [3.1, 0.6], [2.6, 1.35], [1.7, 1.9], [0.7, 2.15], [0, 2.2]], festons: 5 },
    // Les membres : des capsules entre deux points (épaule, coude, poignet ; hanche, genou, cheville).
    // Le bras gauche pend en s'écartant ; le droit tient le bâton loin du corps, presque à
    // l'horizontale (la fiche) ; les jambes écartées, les pieds tournés vers l'extérieur.
    brasG: { epaule: [-3.6, 17.0, -0.2], coude: [-5.3, 13.0, -0.3], poignet: [-6.0, 9.6, 0.0], main: [-6.15, 7.9, 0.2] },
    brasD: { epaule: [3.6, 17.0, -0.2], coude: [7.3, 15.8, 1.0], poignet: [10.3, 15.1, 2.1], main: [11.2, 15.0, 2.45] },
    jambes: { hanche: [2.0, 9.6, 0], genou: [2.55, 5.4, 0.35], cheville: [2.85, 1.7, 0], mousse: 4.9 },
    pieds: { x: 3.05, z: 1.0, rayons: [1.45, 0.85, 2.75], ouverture: 0.45 },
    ceinture: { y: 11.9, rayon: 3.2, corde: 0.42 },
    pagne: { haut: 11.7, bas: 8.8, devant: 2.6, derriere: 1.2, pointe: 9, dents: 11 },
    // Le bâton : la courbe du pied à la crosse en spirale, puis la bave qui en coule.
    // Le bâton de la fiche : un fût noueux qui serpente, tenu à 15 de haut loin du corps, puis une
    // grande crosse en spirale ouverte (une crosse de fougère) qui s'enroule vers l'extérieur.
    baton: [[11.9, 0, 2.5], [11.4, 3.0, 2.6], [11.9, 6.0, 2.5], [12.3, 9.0, 2.6], [12.4, 12.0, 2.5], [12.2, 15.0, 2.5], [11.8, 18.5, 2.6], [10.1, 21.5, 2.5], [9.7, 24.5, 2.6], [10.3, 27.5, 2.5], [10.0, 30.5, 2.6], [10.0, 33.0, 2.6],
      [11.2, 34.6, 2.9], [13.3, 35.0, 3.3], [15.8, 34.4, 3.8], [17.5, 32.6, 4.2], [17.9, 30.2, 4.4], [16.9, 28.3, 4.3], [15.2, 27.7, 4.0], [13.9, 28.5, 3.8], [13.7, 29.9, 3.7], [14.5, 30.5, 3.8]],
    baveCrosse: [0.7, 0.985], baveBas: 0.13,
    // Les coulures (sous la crosse) : point de départ, longueur, rayon de la goutte.
    coulures: [[16.3, 27.9, 4.15, 5.0, 0.55], [14.8, 27.9, 3.95, 1.6, 0.36], [17.6, 29.4, 4.35, 1.1, 0.3]],
    // Le nœud cassé en haut du fût, au départ de la crosse.
    noeud: [[10.0, 32.6, 2.6], [9.25, 34.7, 2.5]],
    crosse: [15.6, 31.2, 3.9],
    cerne: 0.12,
  };
  const NIVEAUX = {
    planche: { tour: 64, pas: 6, sphere: [28, 18], capsule: [6, 24], tore: [12, 40], baton: [140, 12], tex: 512, details: true },
    bureau: { tour: 22, pas: 2, sphere: [10, 7], capsule: [2, 9], tore: [5, 16], baton: [48, 6], tex: 512, details: true },
    telephone: { tour: 12, pas: 1, sphere: [7, 5], capsule: [1, 6], tore: [3, 9], baton: [22, 5], tex: 256, details: false },
  };
  const COULEURS = {
    coiffeHaut: '#9e5631', coiffeBas: '#7c3f1f', coiffeClair: '#c07b48', levre: '#55270f',
    peau: '#c4b48c', peauOmbre: '#9d8d69', pied: '#ab9f80', mousse: '#4f3f27', mousseClair: '#6a5536',
    tissu: '#97ac5a', tissuSombre: '#5d6a2c', corde: '#8a6a3e', cordeSombre: '#5e4626',
    bois: '#4f4232', boisClair: '#6e5d46', oeil: '#4fbfa6', oeilCoeur: '#c4fbee', orbite: '#3e3424',
    bave: '#9ee04a', baveCoeur: '#e4ff9c', baveSombre: '#6f9a32', cerne: '#3a2a1c',
    lamelleFond: '#7e6f4e', lamelleTrait: '#54462f', lamelleClair: '#a39470', lamelleBord: '#5a3c22',
  };

  // Un bruit de sommet (déterministe), pour la mousse marbrée.
  const bruit = (x, y, z) => { const s = Math.sin(x * 12.9898 + y * 78.233 + z * 37.719) * 43758.5453; return s - Math.floor(s); };

  // ----- Les textures peintes -----

  const cacheTex = new Map();
  function textures(THREE, niv) {
    const N = NIVEAUX[niv], cle = N.tex;
    const c0 = cacheTex.get(cle);
    if (c0 && c0.THREE === THREE) return c0;
    const W = N.tex * 2, H = N.tex, k = N.tex / 512;
    const cv = document.createElement('canvas'); cv.width = W; cv.height = H;
    const g = cv.getContext('2d');
    g.fillStyle = '#fff'; g.fillRect(0, 0, W, H);
    let s = 73;
    const h = () => { s = (s * 16807) % 2147483647; return (s - 1) / 2147483646; };
    // À gauche, la peau : de fines piqûres et quelques rides.
    for (let i = 0; i < 260; i++) {
      const x = h() * W * 0.49, y = h() * H, r = (0.8 + h() * 1.8) * k;
      g.fillStyle = `rgba(110, 88, 58, ${0.18 + h() * 0.22})`;
      g.beginPath(); g.arc(x, y, r, 0, TAU); g.fill();
    }
    g.strokeStyle = 'rgba(110, 88, 58, 0.22)'; g.lineWidth = 2.2 * k; g.lineCap = 'round';
    for (let i = 0; i < 26; i++) {
      const x = h() * W * 0.47, y = h() * H;
      g.beginPath(); g.moveTo(x, y); g.quadraticCurveTo(x + 8 * k, y - 4 * k, x + 18 * k, y + (h() - 0.5) * 6 * k); g.stroke();
    }
    // À droite, la coiffe : des plaques sombres, serrées vers le bord (bas de l'image), un voile
    // clair au sommet et un liseré plus sombre au bord.
    const xC = W * 0.5, wC = W * 0.47;
    const grd = g.createLinearGradient(0, 0, 0, H);
    grd.addColorStop(0, 'rgba(255, 236, 205, 0.3)'); grd.addColorStop(0.3, 'rgba(255, 236, 205, 0)');
    grd.addColorStop(0.88, 'rgba(110, 46, 14, 0)'); grd.addColorStop(1, 'rgba(110, 46, 14, 0.35)');
    g.fillStyle = grd; g.fillRect(xC, 0, wC, H);
    for (let i = 0; i < 70; i++) {
      const v = Math.pow(h(), 0.8), x = xC + h() * wC, y = H * (0.92 - v * 0.78);
      const r = (5 + h() * 13) * k * (1.15 - v * 0.6);
      g.fillStyle = `rgba(112, 50, 18, ${0.2 + h() * 0.22})`;
      g.beginPath(); g.ellipse(x, y, r * 1.5, r, (h() - 0.5) * 0.8, 0, TAU); g.fill();
    }
    for (let i = 0; i < 26; i++) {
      const x = xC + h() * wC, y = H * (0.1 + h() * 0.5), r = (2 + h() * 4) * k;
      g.fillStyle = 'rgba(255, 214, 160, 0.25)';
      g.beginPath(); g.arc(x, y, r, 0, TAU); g.fill();
    }
    const corps = new THREE.CanvasTexture(cv);
    corps.wrapS = corps.wrapT = THREE.ClampToEdgeWrapping; corps.anisotropy = 4;
    if ('encoding' in corps) corps.encoding = THREE.sRGBEncoding;
    // Les lamelles : des nervures brunes du bord (haut de l'image) vers le pied (bas).
    const LW = N.tex, LH = Math.max(64, N.tex / 4);
    const lv = document.createElement('canvas'); lv.width = LW; lv.height = LH;
    const lg = lv.getContext('2d');
    const fond = lg.createLinearGradient(0, 0, 0, LH);
    fond.addColorStop(0, COULEURS.lamelleBord); fond.addColorStop(0.18, COULEURS.lamelleFond); fond.addColorStop(1, '#8c7d5a');
    lg.fillStyle = fond; lg.fillRect(0, 0, LW, LH);
    const NL = 40;
    for (let i = 0; i < NL; i++) {
      const x = (i + 0.5) / NL * LW, court = i % 2 ? 0.4 : 0.06;
      lg.strokeStyle = COULEURS.lamelleTrait; lg.lineWidth = Math.max(1.5, LW / NL * 0.22); lg.lineCap = 'round';
      lg.beginPath(); lg.moveTo(x, LH * 0.04); lg.quadraticCurveTo(x + LW / NL * 0.3, LH * 0.5, x, LH * (1 - court * 0.5)); lg.stroke();
      lg.strokeStyle = COULEURS.lamelleClair; lg.lineWidth = Math.max(1, LW / NL * 0.12);
      lg.beginPath(); lg.moveTo(x + LW / NL * 0.3, LH * 0.1); lg.quadraticCurveTo(x + LW / NL * 0.55, LH * 0.5, x + LW / NL * 0.3, LH * (0.95 - court * 0.5)); lg.stroke();
    }
    const lamelles = new THREE.CanvasTexture(lv);
    lamelles.wrapS = THREE.RepeatWrapping; lamelles.wrapT = THREE.ClampToEdgeWrapping; lamelles.anisotropy = 4;
    if ('encoding' in lamelles) lamelles.encoding = THREE.sRGBEncoding;
    // Le halo de la crosse : une lueur verte douce.
    const hv = document.createElement('canvas'); hv.width = hv.height = 64;
    const hg = hv.getContext('2d'), rg = hg.createRadialGradient(32, 32, 0, 32, 32, 32);
    rg.addColorStop(0, 'rgba(170, 255, 90, 0.75)'); rg.addColorStop(0.35, 'rgba(150, 240, 70, 0.3)'); rg.addColorStop(1, 'rgba(150, 240, 70, 0)');
    hg.fillStyle = rg; hg.fillRect(0, 0, 64, 64);
    const halo = new THREE.CanvasTexture(hv);
    const res = { THREE, corps, lamelles, halo, octets: (W * H + LW * LH + 64 * 64) * 4 * 1.33 };
    cacheTex.set(cle, res);
    return res;
  }

  // ----- Les géométries -----

  const cacheGeo = new Map();
  function geometries(THREE, niv) {
    const c0 = cacheGeo.get(niv);
    if (c0 && c0.THREE === THREE) return c0;
    const N = NIVEAUX[niv], C = COTES, K = COULEURS;
    const col = h => new THREE.Color(h);
    const mix = (a, b, t) => col(a).lerp(col(b), Math.max(0, Math.min(1, t)));
    const V2 = pts => pts.map(([r, y]) => new THREE.Vector2(Math.max(0.0001, r), y));
    const V3 = a => new THREE.Vector3(...a);
    const corps = Brut(), lueurs = Brut(), lames = Brut();
    const UV_BLANC = [0.985, 0.5];
    const UV_PEAU = (u, v) => [0.012 + u * 0.466, v];
    const sphere = () => new THREE.SphereGeometry(1, N.sphere[0], N.sphere[1]);
    const placer = (pos, rot, ech) => new THREE.Matrix4().compose(V3(pos), new THREE.Quaternion().setFromEuler(new THREE.Euler(...(rot || [0, 0, 0]))), V3(ech || [1, 1, 1]));
    // La couleur d'une pièce selon sa position dans le monde (la matrice appliquée au point local).
    const auMonde = (m, f) => { const w = new THREE.Vector3(); return p => f(w.copy(p).applyMatrix4(m)); };
    // Une capsule entre deux points.
    const capsule = (b, a, z, r, f, uv) => {
      const A = V3(a), Z = V3(z), d = Z.clone().sub(A), l = d.length();
      const geo = new THREE.CapsuleGeometry(r, Math.max(0.01, l), N.capsule[0], N.capsule[1]);
      const m = new THREE.Matrix4().compose(A.clone().add(Z).multiplyScalar(0.5), new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), d.normalize()), new THREE.Vector3(1, 1, 1));
      ajouter(THREE, b, geo, m, typeof f === 'function' ? auMonde(m, f) : f, uv || UV_PEAU);
    };
    // La mousse : une marbrure sombre.
    const mousse = p => mix(K.mousse, K.mousseClair, bruit(Math.round(p.x * 2), Math.round(p.y * 2), Math.round(p.z * 2)) * 0.9);
    const peau = p => mix(K.peauOmbre, K.peau, (p.y - 8) / 10 + 0.35);
    // Les festons d'un bord : le rayon ondule et le bord descend aux lobes.
    const festonner = (geo, n, haut, ampR, ampY) => {
      const P = geo.attributes.position;
      for (let i = 0; i < P.count; i++) {
        const y = P.getY(i);
        if (y > haut) continue;
        const x = P.getX(i), z = P.getZ(i), th = Math.atan2(x, z), w = (haut - y) / (haut + 0.6);
        const o = Math.cos(th * n), kr = 1 + ampR * o * w;
        P.setXYZ(i, x * kr, y - ampY * (0.5 + 0.5 * o) * w, z * kr);
      }
    };

    // La coiffe : le dessus festonné (moitié droite de l'atlas), le dessous dans les lamelles.
    const Pz = C.pose, MC = new THREE.Matrix4().makeRotationX(Pz.inclinaison).premultiply(new THREE.Matrix4().makeTranslation(0, Pz.y, Pz.z));
    const coiffe = new THREE.LatheGeometry(V2(lisser(C.coiffe, N.pas)), N.tour);
    festonner(coiffe, C.festons, 0.6, 0.055, 0.35);
    corps.partie = lames.partie = lueurs.partie = 1;
    ajouter(THREE, corps, coiffe, MC, p => {
      const th = Math.atan2(p.x, p.z);
      let c = p.y < 0.5 ? mix(K.levre, K.coiffeBas, (p.y + 0.55) / 1.05) : mix(K.coiffeBas, K.coiffeHaut, (p.y - 0.5) / 5.5);
      // Le reflet : en haut, de face à gauche, d'où vient la lumière.
      const r = Math.max(0, Math.cos(th + 0.75)) * Math.max(0, 1 - Math.abs(p.y - 5.4) / 2.6);
      return c.lerp(col(K.coiffeClair), r * 0.75);
    }, (u, v) => [0.512 + u * 0.446, v]);
    const dessous = new THREE.LatheGeometry(V2(lisser(C.dessous, Math.max(1, N.pas - 1))), N.tour);
    festonner(dessous, C.festons, 0.6, 0.055, 0.35);
    ajouter(THREE, lames, dessous, MC, col('#ffffff'), (u, v) => [u * 3, v]);

    // La tête, le cou et le torse (moitié gauche de l'atlas).
    const tete = new THREE.LatheGeometry(V2(lisser(C.tete, N.pas)), N.tour);
    ajouter(THREE, corps, tete, new THREE.Matrix4().compose(new THREE.Vector3(0, 0, C.teteZ), new THREE.Quaternion(), new THREE.Vector3(1, 1, C.aplatiTete)), p => mix(K.peauOmbre, K.peau, (p.y - 18.9) / 2.2 + 0.25), UV_PEAU);
    corps.partie = 0;
    capsule(corps, [0, 17.8, 0.3], [0, 20.0, 1.4], 1.15, peau);
    const torse = new THREE.LatheGeometry(V2(lisser(C.torse, N.pas)), N.tour);
    ajouter(THREE, corps, torse, new THREE.Matrix4().makeScale(1, 1, C.aplatiTorse), p => mix(K.peauOmbre, K.peau, (p.y - 9.5) / 6 + 0.1 * Math.max(0, p.z)), UV_PEAU);
    // Les yeux : une orbite sombre, et le verre (dans les lueurs).
    const Y = C.yeux;
    corps.partie = 1;
    for (const sg of [-1, 1]) {
      const pos = [sg * Y.ecart, Y.y, Y.z], rot = [0, sg * Y.lacet, 0];
      ajouter(THREE, corps, sphere(), placer([pos[0] * 1.02, pos[1], pos[2] - 0.12], rot, [Y.rayons[0] * 1.2, Y.rayons[1] * 1.18, Y.rayons[2]]), col(K.orbite), UV_BLANC);
      ajouter(THREE, lueurs, sphere(), placer(pos, rot, Y.rayons), p => mix(K.oeilCoeur, K.oeil, Math.hypot(p.x + 0.15, p.y - 0.1) * 1.05), UV_BLANC);
      const reflet = new THREE.CircleGeometry(0.28, 10);
      const mR = placer([pos[0] - 0.32 + sg * 0.05, pos[1] + 0.42, pos[2] + Y.rayons[2] * 0.93], rot, [1.2, 0.9, 1]);
      ajouter(THREE, lueurs, reflet, mR, col('#f4fffb'), UV_BLANC);
    }
    // La bouche : un trait.
    ajouter(THREE, corps, sphere(), placer([0, 20.45, 4.25], [0.15, 0, 0], [0.55, 0.07, 0.14]), col('#4a3b2a'), UV_BLANC);

    // Les épaulettes : deux petites coiffes festonnées, penchées vers l'extérieur.
    const E = C.epaulettes;
    corps.partie = lames.partie = 0;
    for (const sg of [-1, 1]) {
      const geo = new THREE.LatheGeometry(V2(lisser(E.profil, Math.max(1, N.pas - 2))), Math.max(10, Math.round(N.tour * 0.6)));
      festonner(geo, E.festons, 0.7, 0.07, 0.35);
      const m = placer([sg * E.x, E.y, E.z], [0, 0, -sg * E.bascule], [1, 0.95, 0.92]);
      ajouter(THREE, corps, geo, m, p => {
        const c = p.y < 0.4 ? mix(K.levre, K.coiffeBas, (p.y + 0.55) / 0.95) : mix(K.coiffeBas, K.coiffeHaut, (p.y - 0.4) / 1.6);
        return c.lerp(col(K.coiffeClair), Math.max(0, Math.cos(Math.atan2(p.x, p.z) + 0.75)) * Math.max(0, 1 - Math.abs(p.y - 1.3) / 1.1) * 0.6);
      }, (u, v) => [0.512 + u * 0.446, 0.2 + v * 0.75]);
      const sous = new THREE.LatheGeometry(V2([[3.0, -0.55], [2.0, -0.15], [1.0, 0.05], [0, 0.1]]), Math.max(10, Math.round(N.tour * 0.6)));
      festonner(sous, E.festons, 0.7, 0.07, 0.35);
      ajouter(THREE, lames, sous, m, col('#ffffff'), (u, v) => [u * 1.5, v]);
    }

    // Le bras gauche, qui pend : peau, brassard de mousse, main ouverte.
    const BG = C.brasG, BD = C.brasD;
    corps.partie = 2;
    capsule(corps, BG.epaule, BG.coude, 0.85, peau);
    capsule(corps, BG.coude, BG.poignet, 0.8, peau);
    const surAvantBras = f => BG.coude.map((v, i) => v + (BG.poignet[i] - v) * f);
    capsule(corps, surAvantBras(0.3), surAvantBras(0.95), 0.98, mousse, UV_BLANC);
    const main = (b, c, rot, ech) => ajouter(THREE, b, sphere(), placer(c, rot, ech), p => mix(K.peauOmbre, K.peau, 0.55 + p.y * 0.25), UV_PEAU);
    main(corps, BG.main, [0.05, 0, 0.08], [0.95, 1.4, 1.15]);
    if (N.details) {
      for (const dz of [-0.55, 0, 0.55]) capsule(corps, [BG.main[0] + 0.15, BG.main[1] - 0.8, BG.main[2] + dz], [BG.main[0] + 0.4, BG.main[1] - 2.0, BG.main[2] + dz * 1.1], 0.34, peau);
    }
    capsule(corps, [BG.main[0] + 0.3, BG.main[1] + 0.2, BG.main[2] + 0.95], [BG.main[0] + 0.65, BG.main[1] - 0.95, BG.main[2] + 1.35], 0.36, peau);
    // Le bras droit, tendu vers le bâton : manche de mousse et poing serré.
    corps.partie = 3;
    capsule(corps, BD.epaule, BD.coude, 0.85, peau);
    capsule(corps, BD.coude, BD.poignet, 1.0, mousse, UV_BLANC);
    main(corps, BD.main, [0, 0.3, -0.15], [1.25, 1.35, 1.25]);

    // Les jambes : cuisses de peau, mollets bandés de mousse ; les pieds larges.
    const J = C.jambes, P = C.pieds;
    for (const sg of [-1, 1]) {
      const s3 = a => [sg * a[0], a[1], a[2]];
      corps.partie = 0;
      capsule(corps, s3(J.hanche), s3(J.genou), 1.2, peau);
      capsule(corps, s3(J.genou), s3(J.cheville), 1.05, p => (p.y < J.mousse + 0.45 * Math.sin(Math.atan2(p.x - sg * 2, p.z) * 5) ? mousse(p) : peau(p)));
      corps.partie = 4;
      const mP = placer([sg * P.x, P.rayons[1], P.z], [0, sg * P.ouverture, 0], P.rayons);
      ajouter(THREE, corps, sphere(), mP, p => mix(K.peauOmbre, K.pied, 0.45 + p.y * 0.5), UV_PEAU);
      if (N.details) {
        // Les orteils, au bout du pied tourné vers l'extérieur.
        const ca = Math.cos(sg * P.ouverture), sa = Math.sin(sg * P.ouverture);
        for (const dx of [-0.85, 0, 0.85]) { const lx = dx + sg * 0.1, lz = P.rayons[2] * 0.86 - Math.abs(dx) * 0.25; ajouter(THREE, corps, sphere(), placer([sg * P.x + lx * ca + lz * sa, 0.48, P.z - lx * sa + lz * ca], [0, sg * P.ouverture, 0], [0.5, 0.45, 0.6]), col(K.pied), UV_PEAU); }
      }
    }

    // La ceinture : deux tours de corde.
    const CE = C.ceinture;
    corps.partie = 0;
    const corde = p => mix(K.cordeSombre, K.corde, 0.55 + 0.45 * Math.sin(Math.atan2(p.y, p.x) * 34 + p.z * 6));
    for (const [dy, dr, e, rx] of [[0, 0, CE.corde, 0], [-0.68, 0.12, CE.corde * 0.72, 0.05]]) {
      const geo = new THREE.TorusGeometry(CE.rayon + dr, e, N.tore[0], N.tore[1] * 2);
      ajouter(THREE, corps, geo, placer([0, CE.y + dy, 0], [Math.PI / 2 + rx, 0, 0], [1, C.aplatiTorse * 1.06, 1]), corde, UV_BLANC);
    }
    // Le pagne : un tour à double paroi, la lisière découpée en dents, le pan de devant plus long.
    const PG = C.pagne;
    // (La paroi intérieure descend, l'extérieure remonte : un tour de Three tourne ainsi les faces de
    // chaque paroi vers l'extérieur de la toile.)
    const pagne = new THREE.LatheGeometry(V2([[2.9, PG.haut], [3.3, 10.8], [3.7, PG.bas + 1.0], [3.86, PG.bas], [4.0, PG.bas], [3.85, PG.bas + 1.0], [3.45, 10.8], [3.05, PG.haut]]), N.tour);
    {
      const A = pagne.attributes.position, dents = N.tour >= 28 ? PG.dents : 0;
      for (let i = 0; i < A.count; i++) {
        if (A.getY(i) > PG.bas + 0.01) continue;
        const th = Math.atan2(A.getX(i), A.getZ(i)), c = Math.cos(th);
        const fr = th / TAU * dents, scie = dents ? Math.abs(fr - Math.round(fr)) * 2 : 0;
        A.setY(i, PG.bas - PG.devant * Math.pow(Math.max(0, c), PG.pointe) - PG.derriere * Math.pow(Math.max(0, -c), 5) - 0.55 * scie);
      }
    }
    ajouter(THREE, corps, pagne, new THREE.Matrix4().makeScale(1, 1, C.aplatiTorse * 1.08), p => {
      const c = Math.cos(Math.atan2(p.x, p.z));
      return (c > 0.8 || c < -0.86 ? mix(K.tissuSombre, K.tissu, 0.55 + (p.y - 7) / 8) : mix('#3f4a1c', K.tissuSombre, (p.y - 7) / 5));
    }, UV_BLANC);

    // Le bâton : un tube tordu, plus épais à la main, effilé vers la crosse ; un nœud en haut.
    const courbe = new THREE.CatmullRomCurve3(C.baton.map(V3), false, 'catmullrom', 0.5);
    const rBaton = t => (t < 0.42 ? 0.6 + 0.14 * Math.sin(t / 0.42 * Math.PI / 2) : 0.74 - 0.34 * Math.pow((t - 0.42) / 0.58, 1.3));
    const [nB, rB] = N.baton;
    corps.partie = lueurs.partie = 5;
    const bois = p => mix(K.bois, K.boisClair, 0.35 + 0.35 * Math.sin(p.y * 1.7 + p.x * 3) + 0.2 * bruit(Math.round(p.x * 3), Math.round(p.y * 3), Math.round(p.z * 3)));
    ajouter(THREE, corps, tube(THREE, courbe, 0, 1, nB, rB, rBaton), new THREE.Matrix4(), bois, UV_BLANC);
    const bout = courbe.getPointAt(1);
    ajouter(THREE, corps, sphere(), placer([bout.x, bout.y, bout.z], null, [rBaton(1), rBaton(1), rBaton(1)]), col(K.bois), UV_BLANC);
    capsule(corps, C.noeud[0], C.noeud[1], 0.42, bois, UV_BLANC);

    // La bave (dans les lueurs) : sur la crosse, en coulures à gouttes, et au pied du bâton.
    const bave = (a, b) => p => mix(a, b, 0.5 + 0.5 * Math.sin(p.x * 2.1 + p.y * 1.3));
    const [c0b, c1b] = C.baveCrosse;
    ajouter(THREE, lueurs, tube(THREE, courbe, c0b, c1b, Math.round(nB * 0.3), rB, (t, f) => rBaton(t) + 0.13 + 0.07 * Math.sin(f * 21) * Math.sin(f * Math.PI)), new THREE.Matrix4(), bave(K.bave, K.baveCoeur), UV_BLANC);
    ajouter(THREE, lueurs, tube(THREE, courbe, 0, C.baveBas, Math.round(nB * 0.15), rB, (t, f) => rBaton(t) + 0.08 - 0.07 * f * f), new THREE.Matrix4(), p => mix(K.bave, K.baveSombre, p.y / 6.5), UV_BLANC);
    ajouter(THREE, lueurs, sphere(), placer([C.baton[0][0], 0.05, C.baton[0][2]], null, [0.7, 0.4, 0.7]), col(K.bave), UV_BLANC);
    for (const [x, y, z, l, r] of C.coulures) {
      capsule(lueurs, [x, y, z], [x, y - l, z], r * 0.55, p => mix(K.baveCoeur, K.bave, (y - p.y) / l), UV_BLANC);
      ajouter(THREE, lueurs, sphere(), placer([x, y - l - r * 0.35, z], null, [r, r * 1.2, r]), col(K.bave), UV_BLANC);
    }
    // Le bandage du poignet gauche, qui luit, et sa petite fiole.
    lueurs.partie = 2;
    const pB = surAvantBras(0.55);
    ajouter(THREE, lueurs, new THREE.TorusGeometry(0.98, 0.26, N.tore[0], N.tore[1]), placer(pB, [Math.PI / 2, 0.05, 0.2], [1, 1, 1]), bave(K.baveSombre, K.bave), UV_BLANC);
    ajouter(THREE, lueurs, sphere(), placer([pB[0] - 0.95, pB[1] + 0.55, pB[2] + 0.1], [0, 0, 0.2], [0.32, 0.95, 0.5]), bave(K.bave, K.baveCoeur), UV_BLANC);

    // Le halo de la crosse : deux plans croisés, additifs.
    const halo = new THREE.BufferGeometry();
    {
      const [hx, hy, hz] = C.crosse, a = 3.8;
      const p = [], uv = [], idx = [];
      for (const [ux, uz] of [[1, 0], [0, 1]]) {
        const b = p.length / 3;
        for (const [sx, sy] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) { p.push(hx + sx * a * ux, hy + sy * a, hz + sx * a * uz); uv.push((sx + 1) / 2, (sy + 1) / 2); }
        idx.push(b, b + 1, b + 2, b, b + 2, b + 3);
      }
      halo.setAttribute('position', new THREE.Float32BufferAttribute(p, 3));
      halo.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
      halo.setIndex(idx);
      partieFixe(THREE, halo, 5);
    }

    // L'occlusion : sous la coiffe et les épaulettes, les aisselles, entre les jambes, sous le pagne,
    // la main sur le bâton ; le fond des lamelles près de la tête.
    occlusion(corps, [corps, lames], { rayon: 3.0, force: 0.05 });
    occlusion(lames, [corps], { rayon: 3.0, force: 0.05, teinte: [0.3, 0.28, 0.26] });

    const nCorps = corps.idx.length;
    const G = {
      THREE,
      corps: enGeo(THREE, corps), cerne: coque(THREE, corps, C.cerne), lueurs: enGeo(THREE, lueurs), lamelles: enGeo(THREE, lames), halo,
      triangles: (nCorps * 2 + lueurs.idx.length + lames.idx.length) / 3 + 4,
    };
    cacheGeo.set(niv, G);
    return G;
  }

  // ----- Les matières -----

  function matieres(THREE, niv) {
    const T = textures(THREE, niv);
    // La matière peinte du petit frère (ombrage doux, liseré de lumière), un cerne fin et brun.
    const corps = matierePeinte(THREE, { color: 0xffffff, vertexColors: true, map: T.corps });
    const grad = corps.userData.rampe;
    const M = {
      corps,
      cerne: new THREE.MeshBasicMaterial({ color: new THREE.Color(COULEURS.cerne), side: THREE.BackSide }),
      lueurs: new THREE.MeshBasicMaterial({ color: 0xffffff, vertexColors: true }),
      lamelles: new THREE.MeshBasicMaterial({ color: new THREE.Color(0.86, 0.86, 0.86), map: T.lamelles, side: THREE.DoubleSide }),
      halo: new THREE.MeshBasicMaterial({ map: T.halo, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide, color: new THREE.Color(0.5, 0.5, 0.5) }),
    };
    for (const k of ['corps', 'cerne', 'lueurs', 'lamelles', 'halo']) animable(M[k], GLSL, 'lampignard');
    M.grad = grad;
    return { M, T };
  }
  // La bave respire : les lueurs et le halo de la crosse pulsent (une valeur pour tous).
  function pouls(M, t) {
    const p = 0.8 + 0.2 * Math.sin(t * 1.4) + 0.05 * Math.sin(t * 4.7);
    M.halo.color.setScalar(0.42 * p);
    M.lueurs.color.setScalar(0.9 + 0.1 * p);
  }
  // Le balancement : plus lent et plus lourd que celui du petit frère.
  function balance(t) {
    const b = Math.sin(t * 1.7);
    return { sx: 1 + 0.01 * b, sy: 1 - 0.018 * b, rz: 0.03 * Math.sin(t * 0.85), dy: 0 };
  }

  // ----- Les gestes du Lampignard -----
  // Les pièces : 0 le corps (torse, cou, épaulettes, jambes, ceinture, pagne), 1 la tête et la coiffe,
  // 2 le bras gauche (et son bandage), 3 le bras droit, 4 les pieds, 5 le bâton (sa bave, son halo),
  // qui tourne dans le poing autour de la main pendant que le bras tourne autour de l'épaule.
  //  - Sort (le Bâton gluant, 850 ms) : il lève le bâton en arrière, le corps penché, la tête
  //    rentrée, puis l'abat devant lui d'un coup (lâcher à 50 %), le corps jeté en avant, la tête
  //    qui suit, le bras gauche en balancier ; le bâton tremble et revient.
  //  - Saut : plus lourd que le petit frère, le bâton qui pèse et rebondit.
  //  - Placement (820 ms) : il tombe, s'écrase, plante son bâton d'un coup sec, se redresse.
  //  - Coup reçu (260 ms), poussée (340 ms) : recul, la tête rejetée, le bâton qui ballotte.
  const DUREES = { sort: 850, lacher: 0.5, placement: 820, coup: 250, pousse: 340 };
  const B_D = COTES.brasD, B_G = COTES.brasG;
  const v3 = a => `vec3(${a.map(x => x.toFixed(2)).join(', ')})`;
  const GLSL = `
void geste(float partie, vec4 g, out mat3 R, out vec3 O, out mat3 Rc, out vec3 T, out vec2 S) {
  R = mat3(1.0); O = vec3(0.0); Rc = mat3(1.0); T = vec3(0.0); S = vec2(1.0);
  float genre = floor(g.x + 0.5), t = clamp(g.y, 0.0, 1.0);
  if (genre < 0.5) return;
  // penche (vers l'avant), ecrase (tassé si positif), haut, avance ; tete (vers l'avant) ; bd le bras
  // droit autour de l'épaule (vers l'avant si positif : la main monte), bdz son écart ; bt le bâton
  // dans la main (la crosse vers l'avant si positif) ; bg, bgz le bras gauche.
  float penche = 0.0, ecrase = 0.0, haut = 0.0, avance = 0.0, tete = 0.0, bd = 0.0, bdz = 0.0, bt = 0.0, bg = 0.0, bgz = 0.0;
  if (genre < 1.5) {
    float a = gMonte(t, 0.04, 0.42) * (1.0 - gMonte(t, 0.43, 0.52));
    float b = gMonte(t, 0.42, 0.52) * (1.0 - gMonte(t, 0.62, 1.0));
    float choc = gRessort(t, 0.52, 34.0, 8.0);
    penche = -0.16 * a + 0.22 * b;
    ecrase = 0.07 * a - 0.03 * b + 0.07 * gBosse(t, 0.5, 0.64);
    avance = 2.6 * b;
    tete = -0.22 * a + 0.16 * b + 0.1 * choc;
    bd = 0.6 * a - 0.35 * b;
    bdz = 0.18 * a;
    bt = -0.35 * a + 1.05 * b + 0.14 * choc;
    bg = 0.45 * a - 0.55 * b;
    bgz = 0.35 * b;
  } else if (genre < 2.5) {
    ecrase = 0.12 * gBosse(t, 0.0, 0.22) + 0.13 * gBosse(t, 0.8, 1.0) - 0.06 * gBosse(t, 0.18, 0.82);
    haut = 3.4 * gBosse(t, 0.15, 0.85);
    penche = 0.08 * gBosse(t, 0.1, 0.9);
    tete = -0.14 * gBosse(t, 0.12, 0.6) + 0.12 * gBosse(t, 0.6, 1.0);
    bt = -0.1 * gBosse(t, 0.1, 0.6) + 0.1 * gBosse(t, 0.7, 1.0);
    bgz = 0.4 * gBosse(t, 0.1, 0.9);
  } else if (genre < 3.5) {
    float u = clamp(t / 0.42, 0.0, 1.0), chute = 1.0 - step(0.42, t);
    haut = 30.0 * (1.0 - u * u) * chute;
    ecrase = 0.24 * gBosse(t, 0.4, 0.62) - 0.08 * chute * u;
    penche = 0.12 * gBosse(t, 0.42, 0.7) + 0.04 * gRessort(t, 0.7, 20.0, 6.0);
    tete = 0.3 * gBosse(t, 0.44, 0.72) - 0.15 * chute;
    // Le bâton levé pendant la chute, planté d'un coup sec après l'atterrissage.
    bd = 0.6 * chute + 0.6 * (1.0 - chute) * (1.0 - gMonte(t, 0.62, 0.74));
    bt = -0.3 * chute - 0.3 * (1.0 - chute) * (1.0 - gMonte(t, 0.62, 0.74)) + 0.1 * gRessort(t, 0.74, 30.0, 8.0);
    bgz = 0.8 * chute + 0.3 * gBosse(t, 0.42, 0.8);
  } else if (genre < 4.5) {
    penche = -0.22 * gBosse(t, 0.0, 0.6) + 0.05 * gBosse(t, 0.6, 1.0);
    avance = -1.4 * gBosse(t, 0.0, 0.7);
    ecrase = 0.07 * gBosse(t, 0.0, 0.4);
    tete = -0.35 * gBosse(t, 0.0, 0.5) + 0.12 * gRessort(t, 0.5, 24.0, 6.0);
    bt = 0.16 * gRessort(t, 0.0, 22.0, 5.0);
    bgz = 0.4 * gBosse(t, 0.0, 0.7);
  } else {
    penche = -0.32 * gBosse(t, 0.0, 0.8);
    tete = -0.4 * gBosse(t, 0.0, 0.6) + 0.12 * gRessort(t, 0.6, 24.0, 6.0);
    bd = 0.4 * gBosse(t, 0.0, 0.8);
    bt = -0.2 * gBosse(t, 0.0, 0.8) + 0.1 * sin(t * 26.0) * (1.0 - t);
    bg = 0.5 * gBosse(t, 0.0, 0.8);
    bgz = 0.6 * gBosse(t, 0.0, 0.85);
  }
  Rc = gRotX(penche);
  T = vec3(0.0, haut, avance);
  S = vec2(1.0 + ecrase * 0.6, 1.0 - ecrase);
  vec3 epD = ${v3(B_D.epaule)}, main = ${v3(B_D.main)};
  mat3 rBras = gRotZ(bdz) * gRotX(-bd);
  if (gEst(partie, 1.0) > 0.5) gPivot(gRotX(tete), vec3(0.0, 18.6, 0.6), R, O);
  else if (gEst(partie, 2.0) > 0.5) gPivot(gRotZ(-bgz) * gRotX(-bg), ${v3(B_G.epaule)}, R, O);
  else if (gEst(partie, 3.0) > 0.5) gPivot(rBras, epD, R, O);
  else if (gEst(partie, 5.0) > 0.5) {
    // Le bâton tourne autour de la main, puis suit le bras.
    mat3 rB = gRotX(bt);
    R = rBras * rB;
    O = rBras * (main - rB * main - epD) + epD;
  }
}
`;

  // ----- La planche : un THREE.Group -----
  function construire(THREE, opts) {
    const o = opts || {};
    const niv = o.niveau || 'planche';
    const G = geometries(THREE, niv), { M } = matieres(THREE, niv);
    const groupe = new THREE.Group(), corps = new THREE.Group();
    groupe.name = 'Lampignard';
    const piece = (geo, mat, ordre) => { const m = new THREE.Mesh(geo, mat); m.renderOrder = ordre; corps.add(m); return m; };
    piece(G.cerne, M.cerne, 0); piece(G.corps, M.corps, 1); piece(G.lamelles, M.lamelles, 1); piece(G.lueurs, M.lueurs, 2);
    if (o.halo !== false) piece(G.halo, M.halo, 3);
    groupe.add(corps);
    groupe.userData = {
      matieres: M, niveau: niv,
      geste(genre, t) { poserGeste(M, typeof genre === 'string' ? GESTES[genre] || 0 : genre, t || 0); },
      animer(t, etat) {
        const e = etat || {};
        pouls(M, t);
        if (e.fixe) { corps.scale.set(1, 1, 1); corps.rotation.z = 0; return; }
        const d = balance(t);
        corps.scale.set(d.sx, d.sy, d.sx); corps.rotation.z = d.rz;
      },
      liberer() { for (const m of Object.values(M)) m.dispose(); },
    };
    return groupe;
  }

  // ----- Le jeu : une troupe instanciée, posée par ModeleGlym.Parc -----
  class Troupe {
    constructor(THREE, opts) {
      const MAX = opts.max || 24, niv = opts.niveau;
      const G = geometries(THREE, niv), { M, T } = matieres(THREE, niv);
      this.M = M; this.octets = T.octets; this.cotes = COTES; this.hauteurJeu = 2.0;
      this.matrice = new THREE.InstancedBufferAttribute(new Float32Array(MAX * 16), 16);
      this.couleur = new THREE.InstancedBufferAttribute(new Float32Array(MAX * 3).fill(1), 3);
      this.aTemps = new THREE.InstancedBufferAttribute(new Float32Array(MAX), 1);
      this.aEtat = new THREE.InstancedBufferAttribute(new Float32Array(MAX * 4), 4);
      for (const a of [this.matrice, this.couleur]) a.setUsage(THREE.DynamicDrawUsage);
      this.aGeste = gesteInstance(THREE, MAX); this.codes = GESTES; this.durees = DUREES;
      this.geos = [];
      const maillage = (geo0, mat, ordre, teinte) => {
        const geo = avecGeste(THREE, geo0, this.aGeste); this.geos.push(geo);
        const m = new THREE.InstancedMesh(geo, mat, MAX);
        m.instanceMatrix = this.matrice; if (teinte) m.instanceColor = this.couleur;
        m.count = 0; m.frustumCulled = false; m.renderOrder = ordre;
        return m;
      };
      this.groupe = new THREE.Group();
      this.parts = [maillage(G.cerne, M.cerne, 7.9), maillage(G.corps, M.corps, 8, true), maillage(G.lamelles, M.lamelles, 8), maillage(G.lueurs, M.lueurs, 8.05)];
      if (opts.halo) this.parts.push(maillage(G.halo, M.halo, 8.4));
      this.groupe.add(...this.parts);
      this.n = 0;
      this.triangles = G.triangles;
    }
    deformer(t) { return balance(t); }
    teinter(i, flash) { const k = 1 + flash * 1.1; this.couleur.array.set([k, k, k], i * 3); }
    debut(t) { pouls(this.M, t); }
    fin() { this.couleur.needsUpdate = this.aGeste.needsUpdate = true; }
  }

  return { COTES, NIVEAUX, COULEURS, GESTES, DUREES, construire, geometries, Troupe };
})();
