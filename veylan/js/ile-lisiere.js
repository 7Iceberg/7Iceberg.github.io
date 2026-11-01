// Le style Lisière de l'île d'Ervane (docs/ILE-TECHNIQUE.md, 3.25) : ce que la maquette de la
// Lisière (tools/maquette-lisiere.js, 3.23) a montré, porté dans le vrai jeu, derrière son
// interrupteur (?style=lisiere, ou DATA.ile.style = 'lisiere' ; IleCharge.style).
//
//  - la caméra d'exploration plus basse et plus ouverte, le regard levé au-dessus du Veilleur : on
//    voit l'horizon et le ciel (CameraIle, `style`) ; celle du combat ne change pas ;
//  - le ciel en dôme peint par un nuanceur (étoiles, Voie lactée, lune, nuages, étoiles filantes,
//    aurore, soleil, éclairs), la brume exponentielle et les lumières réglés par l'heure et le temps
//    qu'il fait (?heure=0 à 24 ou cycle, ?meteo=clair, nuageux, pluie, orage, brume, neige) ; la
//    pluie et la neige dans une boîte qui suit la caméra ;
//  - le décor de la nuit (js/ile-nuit.js : buissons, courges, fanions, touffes, lucioles, flaque de
//    lumière du Veilleur), dont la part nocturne suit la nuit de l'heure : au jour, plus de lucioles ;
//  - les arbres des Mailles en feuillage d'automne (la palette de la zone, pour le seul décor).
//
// Rien ici ne touche au moteur : la navigation, la grille de marche, les aires de combat restent
// celles du jeu. Chargé après js/ile-nuit.js (IleCharge.lisiere) ; la classe en reprend les crochets.
//
// Repère : X = u, Y = h, Z = v (comme js/ile-decor.js). Three.js est chargé avant.
const IleLisiere = (() => {
  const lisse = (a, b, x) => { const t = Math.max(0, Math.min(1, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
  function hache(i, j) { let h = Math.imul(i, 374761393) + Math.imul(j, 668265263); h = Math.imul(h ^ (h >>> 13), 1274126177); return ((h ^ (h >>> 16)) >>> 0) / 4294967296; }

  // ----- Le ciel, la pluie, la neige, l'heure, le temps qu'il fait, l'orage (repris de la maquette) -----
  // Les directions du ciel sont celles de la maquette (sa caméra regarde vers -Z) : le dôme tourne de
  // 45° moins l'azimut de la maquette (0,18) pour que l'île les voie au même endroit de l'écran.
  const TOUR_DOME = Math.PI / 4 - 0.18;

  const CIEL_VS = `varying vec3 vDir;
void main() { vDir = position; vec4 p = projectionMatrix * modelViewMatrix * vec4(position, 1.0); gl_Position = p.xyww; }`;
  const CIEL_FS = `uniform float uT; uniform vec3 uLune, uHorizon, uZenith, uVoie, uSoleil, uSoleilCoul, uAstre, uNuageClair, uNuageSombre; uniform vec4 uEclair; uniform float uAurore, uEtoiles, uCouverture, uLueur;
varying vec3 vDir;
float h21(vec2 p) { p = fract(p * vec2(123.34, 456.21)); p += dot(p, p + 45.32); return fract(p.x * p.y); }
float br(vec2 p) { vec2 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f); return mix(mix(h21(i), h21(i + vec2(1.0, 0.0)), f.x), mix(h21(i + vec2(0.0, 1.0)), h21(i + 1.0), f.x), f.y); }
float fbm(vec2 p) { float s = 0.0, a = 0.5; for (int i = 0; i < 5; i++) { s += a * br(p); p = p * 2.03 + vec2(1.7, 9.2); a *= 0.5; } return s; }
float fbm3(vec2 p) { float s = 0.0, a = 0.5; for (int i = 0; i < 3; i++) { s += a * br(p); p = p * 2.03 + vec2(1.7, 9.2); a *= 0.5; } return s; }
// Une couche d'étoiles : une par case d'une grille sur le ciel, si le tirage passe le seuil.
vec3 etoiles(vec2 sp, float seuil, float taille, float t) {
  vec2 ci = floor(sp); float r = h21(ci);
  vec2 cf = fract(sp) - 0.5 - (vec2(h21(ci + 3.1), h21(ci + 7.7)) - 0.5) * 0.6;
  float e = step(seuil, r) * smoothstep(taille, 0.0, length(cf));
  float sc = 0.55 + 0.45 * sin(t * (1.3 + 2.0 * h21(ci + 1.7)) + r * 90.0);
  vec3 teinte = mix(vec3(0.75, 0.85, 1.0), vec3(1.0, 0.86, 0.7), step(0.6, h21(ci + 9.3)));
  return teinte * e * sc;
}
void main() {
  vec3 d = normalize(vDir); float y = d.y, az = atan(d.z, d.x);
  vec3 c = mix(uHorizon, mix(uHorizon, uZenith, 0.62), smoothstep(0.0, 0.22, y));
  c = mix(c, uZenith, smoothstep(0.2, 0.85, y));
  // Le soleil : son disque, sa lueur, et à l'aube et au soir l'horizon qui rougit de son côté.
  float sd = dot(d, uSoleil);
  vec3 vers = normalize(vec3(uSoleil.x, 0.0, uSoleil.z) + 1e-4);
  c += uSoleilCoul * (pow(max(sd, 0.0), 80.0) * 0.6 + pow(max(sd, 0.0), 8.0) * 0.18);
  c += uSoleilCoul * uLueur * pow(max(dot(normalize(vec3(d.x, 0.0, d.z) + 1e-4), vers), 0.0), 3.0) * exp(-max(y, 0.0) * 5.0) * 0.55;
  // La Voie lactée : une bande sur un grand cercle, tachée de poussière.
  float vb = dot(d, uVoie), bande = exp(-vb * vb / 0.018);
  vec2 vq = vec2(az * 3.0, y * 6.0);
  float pous = fbm3(vq * 2.2 + 4.0);
  c += vec3(0.15, 0.17, 0.27) * bande * smoothstep(0.25, 0.75, pous) * smoothstep(0.02, 0.3, y) * uEtoiles;
  c -= vec3(0.03) * bande * smoothstep(0.55, 0.8, fbm3(vq * 4.0 + 11.0)) * smoothstep(0.02, 0.3, y) * uEtoiles;
  // Les étoiles : des grosses rares, des petites nombreuses, plus serrées dans la bande.
  vec2 sp = vec2(az, asin(clamp(y, -1.0, 1.0)));
  vec3 e = etoiles(sp * 70.0, 0.982 - 0.02 * bande, 0.14 + 0.1 * step(0.997, h21(floor(sp * 70.0))), uT)
         + 0.45 * etoiles(sp * 150.0 + 3.7, 0.955 - 0.12 * bande, 0.16, uT * 1.3);
  float ciel = smoothstep(0.03, 0.25, y) * uEtoiles;
  // La lune, ses taches et son halo.
  float m = dot(d, normalize(uLune));
  c += (vec3(0.14, 0.17, 0.3) * pow(max(m, 0.0), 40.0) + vec3(0.04, 0.05, 0.09) * pow(max(m, 0.0), 6.0)) * uEtoiles;
  vec3 t1 = normalize(cross(uLune, vec3(0.0, 1.0, 0.0))), t2 = cross(t1, normalize(uLune));
  vec2 lu = vec2(dot(d, t1), dot(d, t2)) / 0.028;
  float disque = smoothstep(0.99935, 0.9996, m) * (0.25 + 0.75 * uEtoiles);
  vec3 cLune = vec3(0.93, 0.95, 1.0) * (0.78 + 0.22 * smoothstep(0.35, 0.6, fbm3(lu * 2.2 + 7.0)));
  c = mix(c, cLune, disque);
  // Les nuages, éclairés par la lune, et de l'intérieur par l'éclair.
  vec2 q = d.xz / (y + 0.1) * 1.3 + vec2(uT * 0.008, 0.0);
  float n = fbm(q * 0.8 + vec2(3.0, 1.0));
  float bas = mix(0.62, 0.22, uCouverture);
  float nu = smoothstep(bas, bas + 0.26, n) * smoothstep(0.0, 0.1, y) * (1.0 - smoothstep(0.45 + uCouverture * 0.6, 0.85 + uCouverture * 0.6, y));
  vec3 dirE = vec3(cos(uEclair.x), 0.16, sin(uEclair.x));
  float pres = pow(max(dot(d, normalize(dirE)), 0.0), 10.0);
  // L'aurore : des rideaux verts et violets qui ondulent au-dessus de l'horizon, vers le nord.
  float base = 0.1 + 0.035 * sin(az * 4.0 + uT * 0.12) + 0.05 * (br(vec2(az * 5.0, uT * 0.04)) - 0.5);
  float hA = y - base;
  float rideau = smoothstep(0.0, 0.015, hA) * exp(-max(hA, 0.0) * 11.0) * (0.45 + 0.55 * br(vec2(az * 55.0, uT * 0.25)));
  rideau *= smoothstep(-0.2, 0.6, -d.z) * (0.6 + 0.4 * sin(az * 2.0 - uT * 0.2));
  c += mix(vec3(0.15, 0.85, 0.55), vec3(0.55, 0.3, 0.85), smoothstep(0.02, 0.16, hA)) * rideau * uAurore * uEtoiles * (1.0 - nu * 0.8);
  c += e * ciel * (1.0 - nu);
  c = mix(c, c * 0.0 + uSoleilCoul, smoothstep(0.9988, 0.9993, sd) * (1.0 - nu));
  // Les étoiles filantes : trois créneaux, chacun la sienne à intervalles tirés au sort.
  for (int k = 0; k < 3; k++) {
    float P = 6.0 + float(k) * 2.7, ph = uT + float(k) * 3.1, nb = floor(ph / P), tt = ph - nb * P;
    float vie = 0.9;
    if (tt < vie && h21(vec2(nb, float(k) + 0.5)) > 0.25) {
      float a0 = -2.6 + 2.2 * h21(vec2(nb, 2.0 + float(k))), e0 = 0.16 + 0.2 * h21(vec2(nb, 5.0 + float(k)));
      vec3 dep = normalize(vec3(cos(a0) * cos(e0), sin(e0), sin(a0) * cos(e0)));
      vec3 sens = normalize(cross(dep, vec3(0.0, 1.0, 0.0)) * (h21(vec2(nb, 9.0)) > 0.5 ? 1.0 : -1.0) - vec3(0.0, 0.3, 0.0));
      float avance = tt / vie;
      vec3 tete = normalize(dep + sens * 0.26 * avance), queue = normalize(dep + sens * 0.26 * max(0.0, avance - 0.35));
      vec3 ab = tete - queue; float u = clamp(dot(d - queue, ab) / max(dot(ab, ab), 1e-5), 0.0, 1.0);
      float dist = length(d - (queue + ab * u));
      float f = smoothstep(0.0022, 0.0, dist) * u * u * sin(avance * 3.14159);
      c += vec3(0.85, 0.92, 1.0) * f * 1.6 * ciel * (1.0 - nu);
    }
  }
  vec3 cn = mix(uNuageSombre, uNuageClair, smoothstep(bas + 0.1, bas + 0.42, n) * (0.55 + 0.45 * pow(max(dot(d, uAstre), 0.0), 3.0)));
  cn += vec3(0.75, 0.8, 1.0) * uEclair.y * (0.35 + 1.4 * pres) * smoothstep(0.5, 0.8, n);
  c = mix(c, cn, nu * 0.9);
  // La lueur de l'éclair dans le ciel, et l'éclair lui-même quand il touche le sol.
  c += vec3(0.4, 0.45, 0.65) * uEclair.y * pres * 0.6;
  if (uEclair.w > 0.0) {
    float dx = az - uEclair.x; dx = atan(sin(dx), cos(dx));
    float hautE = 0.21, ok = step(0.0, y) * step(y, hautE);
    float xp = (br(vec2(y * 16.0, uEclair.z)) - 0.5) * 0.05 + (br(vec2(y * 55.0, uEclair.z + 3.0)) - 0.5) * 0.016;
    float xb = xp + (y < 0.13 ? (0.13 - y) * 0.35 + (br(vec2(y * 60.0, uEclair.z + 8.0)) - 0.5) * 0.012 : 9.0);
    float trait = smoothstep(0.0035, 0.0, abs(dx - xp)) + 0.6 * smoothstep(0.0025, 0.0, abs(dx - xb)) * step(0.05, y);
    float halo = smoothstep(0.035, 0.0, abs(dx - xp));
    c += (vec3(0.92, 0.95, 1.0) * trait + vec3(0.35, 0.4, 0.75) * halo * 0.5) * ok * uEclair.w;
  }
  gl_FragColor = vec4(c, 1.0);
}`;

  const PLUIE_VS = `attribute float aBout; uniform float uT; uniform vec3 uCam; uniform float uB, uH; varying float vA;
void main() {
  vec3 p = position;
  p.y = mod(p.y - uT * 15.0, uH);
  p.xz = uCam.xz + mod(p.xz - uCam.xz + uB, 2.0 * uB) - uB;
  p.y += uCam.y - uH * 0.45;
  p += vec3(0.12, -0.75, 0.05) * aBout;
  vec4 mv = modelViewMatrix * vec4(p, 1.0); gl_Position = projectionMatrix * mv;
  vA = (1.0 - aBout * 0.6) * smoothstep(0.0, 3.0, -mv.z);
}`;
  const PLUIE_FS = `uniform float uForce; uniform vec3 uCoul; varying float vA;
void main() { gl_FragColor = vec4(uCoul, 0.42 * vA * uForce); }`;
  const NEIGE_VS = `attribute float aPhase; uniform float uT, uEchelle; uniform vec3 uCam; uniform float uB, uH; varying float vA;
void main() {
  vec3 p = position;
  p.y = mod(p.y - uT * 1.1, uH);
  p.x += sin(uT * 0.9 + aPhase * 6.3) * 0.6; p.z += cos(uT * 0.7 + aPhase * 4.1) * 0.6;
  p.xz = uCam.xz + mod(p.xz - uCam.xz + uB, 2.0 * uB) - uB;
  p.y += uCam.y - uH * 0.45;
  vec4 mv = modelViewMatrix * vec4(p, 1.0); gl_Position = projectionMatrix * mv;
  gl_PointSize = (0.07 + 0.05 * aPhase) * uEchelle / -mv.z; vA = smoothstep(0.0, 2.0, -mv.z);
}`;
  const NEIGE_FS = `uniform float uForce; varying float vA;
void main() { float d = length(gl_PointCoord - 0.5) * 2.0; gl_FragColor = vec4(0.95, 0.97, 1.0, smoothstep(1.0, 0.3, d) * vA * uForce * 0.9); }`;

  const HEURES = [
    [0, '#060a1a', '#1f2c4c', '#6b7aa8', '#262f4c', '#000000', 0],
    [4.6, '#060a1a', '#1f2c4c', '#6b7aa8', '#262f4c', '#000000', 0],
    [5.6, '#141a3a', '#4a3f62', '#8a7aa0', '#2e2c48', '#ff8a50', 0.6],
    [6.6, '#3a5694', '#f0a070', '#ffd2b0', '#8a6a80', '#ffb070', 1],
    [8, '#4f86d0', '#cfe0f0', '#ffffff', '#9aa8c0', '#fff2d8', 0.25],
    [12, '#3f7fd8', '#b8d8f4', '#ffffff', '#a8b4c8', '#fffbe8', 0],
    [16, '#4682d2', '#c6dcf0', '#ffffff', '#a0aec4', '#fff2d8', 0.15],
    [18, '#4a68b0', '#f2b07a', '#ffe0c0', '#8a7090', '#ffa060', 0.9],
    [19, '#26305e', '#c0605a', '#e09080', '#4a3a5a', '#ff7040', 1],
    [20.4, '#0c1230', '#2e3058', '#6a6a98', '#262a48', '#000000', 0.2],
    [22, '#060a1a', '#1f2c4c', '#6b7aa8', '#262f4c', '#000000', 0],
    [24, '#060a1a', '#1f2c4c', '#6b7aa8', '#262f4c', '#000000', 0],
  ];
  // Le temps qu'il fait : couverture des nuages, lumière, gris du ciel, brume, pluie, neige, sol
  // mouillé, éclairs (fréquence), étoiles et aurore visibles.
  const METEOS = {
    clair: { nom: 'Clair', couv: 0.25, lum: 1, gris: 0, brume: 0.016, pluie: 0, neige: 0, mouille: 0, eclair: 0, etoiles: 1, aurore: 1 },
    nuageux: { nom: 'Nuageux', couv: 0.62, lum: 0.8, gris: 0.25, brume: 0.019, pluie: 0, neige: 0, mouille: 0, eclair: 0, etoiles: 0.55, aurore: 0 },
    pluie: { nom: 'Pluie', couv: 0.92, lum: 0.55, gris: 0.55, brume: 0.026, pluie: 1, neige: 0, mouille: 1, eclair: 0, etoiles: 0, aurore: 0 },
    orage: { nom: 'Orage', couv: 1, lum: 0.42, gris: 0.62, brume: 0.028, pluie: 1, neige: 0, mouille: 1, eclair: 1.6, etoiles: 0, aurore: 0 },
    brume: { nom: 'Brume', couv: 0.5, lum: 0.65, gris: 0.5, brume: 0.055, pluie: 0, neige: 0, mouille: 0.3, eclair: 0, etoiles: 0.2, aurore: 0 },
    neige: { nom: 'Neige', couv: 0.85, lum: 0.75, gris: 0.45, brume: 0.024, pluie: 0, neige: 1, mouille: 0, eclair: 0, etoiles: 0.1, aurore: 0 },
  };
  // Le soleil : il se lève à l'est (à droite de la vue) vers 6 h 15 et se couche à l'ouest (à gauche)
  // vers 19 h, un peu devant la caméra pour qu'on voie l'aube et le soir.
  function soleil(h) {
    const a = (h - 6.25) / 12.75 * Math.PI, jour = h > 6.25 && h < 19;
    return [Math.cos(a) * 0.88, jour ? Math.sin(a) * 0.8 : -0.25 - 0.2 * Math.abs(Math.sin(a)), -0.5];
  }
  // L'ambiance d'une heure et d'un temps : de quoi régler le ciel, les lumières, la brume, le sol.
  function ambiance(THREE, h, meteo) {
    h = ((h % 24) + 24) % 24;
    let i = 0; while (HEURES[i + 1][0] <= h && i < HEURES.length - 2) i++;
    const A = HEURES[i], B = HEURES[i + 1], k = (h - A[0]) / (B[0] - A[0]);
    const mel = j => new THREE.Color(A[j]).lerp(new THREE.Color(B[j]), k);
    const M = METEOS[meteo] || METEOS.clair;
    const s = new THREE.Vector3(...soleil(h)).normalize();
    const jour = lisse(-0.12, 0.25, s.y), nuit = 1 - jour;
    // Le gris du mauvais temps : la couleur perd sa teinte et un peu de sa lumière.
    const griser = c => { const l = c.r * 0.3 + c.g * 0.55 + c.b * 0.15; return c.lerp(new THREE.Color(l, l, l * 1.06), M.gris).multiplyScalar(1 - 0.35 * M.gris); };
    return {
      h, meteo, jour, nuit, soleil: s,
      zenith: griser(mel(1)), horizon: griser(mel(2)), nuageClair: griser(mel(3)), nuageSombre: griser(mel(4)),
      soleilCoul: mel(5).multiplyScalar(1 - M.couv * 0.75), lueur: (A[6] + (B[6] - A[6]) * k) * (1 - M.gris),
      couv: M.couv, lum: M.lum, brume: M.brume * (1 + 0.15 * nuit), pluie: M.pluie, neige: M.neige, mouille: M.mouille, eclair: M.eclair,
      etoiles: nuit * M.etoiles, aurore: nuit * M.aurore,
    };
  }

  // L'orage lointain (la maquette) : un éclair par période de 9 s ; rend { az, force, graine, trait } ou null.
  function orage(t, frequence) {
    const P = 9 / (frequence || 1), n = Math.floor(t / P), u = t - n * P;
    if (hache(n, 11) < 0.2) return null;
    const d = u - (0.5 + hache(n, 7) * (P - 2));
    if (d < 0 || d > 0.9) return null;
    const pic = (c, l) => Math.max(0, 1 - Math.abs(d - c) / l);
    const force = Math.max(pic(0.04, 0.06), 0.7 * pic(0.2, 0.07), 0.9 * pic(0.38, 0.1)) + 0.25 * Math.exp(-d * 4);
    const trait = hache(n, 3) < 0.5 && d > 0.15 && d < 0.5 ? 1 : 0;
    return { az: -2.5 + hache(n, 5) * 1.9, force: Math.min(1, force), graine: n % 97, trait };
  }

  // ----- Le réglage : l'heure et le temps qu'il fait -----
  // ?heure=21 (de 0 à 24), ?heure=cycle (une journée en douze minutes) ; ?meteo= une clé de METEOS.
  // DATA.ile.heure, DATA.ile.heureDepart et DATA.ile.meteo, qu'une copie peut poser. Sans rien : 21 h,
  // temps clair (la nuit de la maquette).
  function reglage() {
    let qh = null, qm = null;
    try { const q = new URLSearchParams(location.search); qh = q.get('heure'); qm = q.get('meteo'); } catch (e) { /* rien */ }
    const d = typeof DATA === 'object' && DATA && DATA.ile ? DATA.ile : {};
    const h = qh != null ? qh : d.heure != null ? String(d.heure) : '21';
    const cycle = h === 'cycle';
    const n = parseFloat(h);
    const meteo = METEOS[qm] ? qm : METEOS[d.meteo] ? d.meteo : 'clair';
    // Le cycle part de DATA.ile.heureDepart (le matin de la copie), sinon de 18 h 30 (la maquette).
    const depart = d.heureDepart != null && Number.isFinite(+d.heureDepart) ? ((+d.heureDepart % 24) + 24) % 24 : 18.5;
    return { cycle, heure: cycle ? depart : Number.isFinite(n) ? ((n % 24) + 24) % 24 : 21, meteo };
  }

  // Le feuillage d'automne des Mailles : rouge, orange, rouille, un vert olive passé.
  const AUTOMNE = ['#b8432a', '#e0912e', '#c4602a', '#9a8a34'];

  // Les lumières du jour (Ile3D.lumieres) et de la nuit (IleNuit.Nuit.lumieres), mêlées par la part
  // de jour de l'heure ; l'azimut ne bouge pas (les ombres cuites restent justes).
  const LUM_JOUR = { hemi: ['#c6d4ef', '#544b3c', 0.62], cle: ['#fff2df', 1.28], chaud: ['#ffd2a0', 0.22], contre: ['#9fb4ff', 0.14] };
  const LUM_NUIT = { hemi: ['#3a4f8e', '#121220', 0.3], cle: ['#9cb4ff', 0.5], chaud: ['#ff9f5a', 0.04], contre: ['#8aa8ff', 0.55] };

  class Lisiere extends IleNuit.Nuit {
    constructor(THREE, ile) {
      super(THREE, ile);
      this.style = 'lisiere';
      this.reglage = reglage();
      this.heure = this.reglage.heure;
      this.amb = ambiance(THREE, this.heure, this.reglage.meteo);
      this.densite = this.amb.brume * (this.telephone ? 1.06 : 1);
      this.compte.lisiere = 1;
      this.compte.automne = 0;
      this.fNuit = -1;
      this.c0 = new THREE.Color(); this.c1 = new THREE.Color();
      // Les portées du décor (Ile3D.image) : la caméra basse voit plus de morceaux ; au téléphone,
      // le décor détaillé s'arrête plus tôt (la brume l'a déjà pris), pour tenir le budget de 3.9.
      this.kDetail = this.telephone ? 0.68 : 0.7;
      this.kSil = this.telephone ? 0.5 : 0.72;
      // Le sol au-delà de `solMax` u du point visé ne se dessine plus : la brume l'a pris.
      this.solMax = this.telephone ? 36 : 64;
    }

    // La caméra d'exploration (CameraIle, `style`) : 11° à 20° d'élévation au lieu de 35° à 45°,
    // 46° d'ouverture au lieu de 20°, le regard levé de 2,4 u : le haut de la vue montre le ciel.
    styleCamera() { return { ouverture: 46, elevation: [11, 20], leve: 2.4, champDefaut: [22, 26] }; }

    // La définition que lit le décor : les Mailles en feuillage d'automne. Le sol, ses peintures et
    // leur cache gardent la définition du jeu.
    defDecor(def) {
      this.palettesJeu = (def.regions || []).map(r => r.palette || {});
      const regions = (def.regions || []).map(r => (r.zone === 'ervane_mailles' ? Object.assign({}, r, { palette: Object.assign({}, r.palette, { feuillages: AUTOMNE }) }) : r));
      return Object.assign({}, def, { regions });
    }

    // Le monde modelé (3.26) : ses arbres des Mailles prennent le feuillage d'automne (la teinte de
    // l'instance remplacée avant la cuisson des couleurs, IleGlb.construire) ; les pins et les arbres
    // morts, et les autres zones, gardent la leur.
    teinteGlb(u, v, nom, teinte) {
      if (!/arbre/.test(nom) || /mort|pin/.test(nom)) return null;
      const T = this.ile.T, def = this.ile.def;
      if (!T || !def || !T.regionA) return null;
      const reg = (def.regions || [])[T.regionA(u, v)];
      if (!reg || reg.zone !== 'ervane_mailles') return null;
      const h = Math.abs(Math.sin(u * 12.9898 + v * 78.233) * 43758.5453) % 1;
      // Surtout l'orange et la rouille, un peu de rouge, un peu d'olive.
      const a = AUTOMNE[h < 0.4 ? 1 : h < 0.72 ? 2 : h < 0.9 ? 0 : 3], b = AUTOMNE[Math.floor(h * 7) % AUTOMNE.length];
      // Éclairci vers le jaune paille, comme les lobes hauts des arbres d'automne du décor du code.
      const c = this.c0.set(a).lerp(this.c1.set(b), ((h * 13) % 1) * 0.5).lerp(this.c1.set('#f2d27a'), 0.28).convertSRGBToLinear();
      this.compte.automne++;
      void teinte;
      return [c.r, c.g, c.b];
    }

    // Le décor de la nuit garde les verts du jeu (ses jeunes sapins, ses buissons). Puis les grands
    // arbres d'automne des Mailles : seulement là où la navigation est déjà fermée (au pied des
    // falaises, des murets, au bord de l'île), jamais sur un sentier, une place, une aire ou un objet ;
    // un tronc, un houppier en cumulus de lobes roux (comme les arbres du semis), une silhouette.
    ajouts(A) {
      const THREE = this.THREE, ile = this.ile, T = ile.T, P = this.palettesJeu, nav = ile.world && ile.world.plateau && ile.world.plateau.nav;
      const palette = P ? (u, v) => P[T.regionA(u, v)] || A.palette(u, v) : A.palette;
      super.ajouts(Object.assign({}, A, { palette }));
      const { L, seau, piece, sol, zone, matrice, coul, melange, fois } = A;
      const M = IleTerrain.M, R = M.hasard(M.cle('lisiere-automne'));
      const W = T.W, H = T.H, clamp = (x, a, b) => (x < a ? a : x > b ? b : x);
      const dSentier = (u, v) => T.distSentier[clamp(Math.round(v), 0, H - 1) * W + clamp(Math.round(u), 0, W - 1)];
      const ouvert = (u, v) => { if (!nav) return true; const c = nav.caseDe(u, v); return c >= 0 && nav.ouvertStatique(c); };
      const ferme = (u, v, r) => { for (let a = 0; a < 8; a++) for (const d of [0, r * 0.5, r]) if (ouvert(u + Math.cos(a * 0.785) * d, v + Math.sin(a * 0.785) * d)) return false; return true; };
      const terre = (u, v) => T.dans(u, v) && !T.videA(u, v) && T.profondeurA(u, v) < 0.02 && T.pontA(u, v) < 0;
      const loin = (u, v, m) => !(T.aires || []).some(a => u > a.x - m && u < a.x + 15 + m && v > a.y - m && v < a.y + 15 + m)
        && !(T.places || []).some(p => Math.hypot(p.centre[0] - u, p.centre[1] - v) < p.rayon + m)
        && !T.objets.some(o => Math.hypot(o.u - u, o.v - v) < (o.taille ? Math.hypot(o.taille[0], o.taille[1]) / 2 : 1.5) + m)
        && !T.pnjs.some(p => Math.hypot(p.u - u, p.v - v) < m + 1.5);
      const poses = [];
      for (const e of T.decor) if (e.sorte === 'arbre') poses.push([e.u, e.v, e.rayon]);
      const libre = (u, v, r) => poses.every(([x, y, q]) => Math.hypot(x - u, y - v) > (q + r) * 0.9);
      const TRONC = coul('#5a4030'), feu = AUTOMNE.map(coul), clairs = coul('#f2d27a');
      const dens = this.qualite === 'haute' ? 1 : this.qualite === 'basse' ? 0.45 : this.telephone ? 0.6 : 0.8;
      const pas = 3.2 / Math.sqrt(dens);
      for (let v = pas / 2; v < T.hauteur; v += pas) for (let u = pas / 2; u < T.largeur; u += pas) {
        const x = u + (R() - 0.5) * pas, z = v + (R() - 0.5) * pas;
        if (zone(x, z) !== 'ervane_mailles' || !terre(x, z)) continue;
        const r = 1.2 + R() * 1.1;
        if (!ferme(x, z, 0.9) || dSentier(x, z) < 1.6 || !loin(x, z, 1.2) || !libre(x, z, r)) continue;
        const y = sol(x, z);
        if (!Number.isFinite(y)) continue;
        const s = seau(x, z), hT = 1.2 + r * 0.9, rt = Math.min(0.42, r * 0.2), cy0 = y + hT + r * 0.7;
        piece(s, 'acc', L.tronc(6), matrice(x, y - 0.2, z, (R() - 0.5) * 0.08, R() * 3, (R() - 0.5) * 0.08, rt, hT + r * 0.6, rt), { c: fois(TRONC, 0.85 + R() * 0.3), bas: 0.7, haut: 1.05 });
        const teinte = melange(feu[Math.floor(R() * feu.length)], feu[Math.floor(R() * feu.length)], R() * 0.5);
        const nb = this.telephone ? 4 : 5, a0 = R() * 6.28, lobes = [[r * 0.9, 0, 0, 0, 1.05, 0.88, 1.05]];
        for (let k = 0; k < nb; k++) { const an = a0 + k / nb * 6.283 + (R() - 0.5) * 0.7, d = r * (0.55 + R() * 0.22); lobes.push([r * (0.48 + R() * 0.18), Math.cos(an) * d, -r * 0.12 + R() * r * 0.32, Math.sin(an) * d, 1, 0.9, 1]); }
        lobes.push([r * 0.58, (R() - 0.5) * r * 0.35, r * 0.52, (R() - 0.5) * r * 0.35, 1, 0.9, 1]);
        const bas = cy0 - r * 0.85, haut = cy0 + r * 1.05, g = Math.floor(R() * 8);
        lobes.forEach(([lr, dx, dy, dz, sx, sy, sz], k) => {
          const hr = clamp((dy + r * 0.2) / (r * 0.8), 0, 1);
          const c = melange(k ? melange(teinte, feu[(k + g) % feu.length], 0.3) : teinte, clairs, hr * 0.3);
          piece(s, 'fronde', L.lobes[(g + k) % 8], matrice(x + dx, cy0 + dy, z + dz, 0, R() * 3, 0, lr * sx, lr * sy, lr * sz), { c, fronde: true, grain: 0.1, canopee: [bas, haut] });
        });
        piece(s, 'sil', L.lobes[g], matrice(x, cy0, z, 0, 0, 0, r * 1.15, r * 1.1, r * 1.15), { c: teinte, fronde: true });
        piece(s, 'sil', L.cyl(5), matrice(x, y, z, 0, 0, 0, rt, hT, rt), { c: fois(TRONC, 0.8) });
        poses.push([x, z, r]);
        this.compte.automne++;
      }
      this.compte.automne += T.decor.filter(e => e.sorte === 'arbre' && zone(e.u, e.v) === 'ervane_mailles').length;
      void THREE;
    }

    // ----- La brume, le fond, les lumières, les matières -----

    brouillard() { return new this.THREE.FogExp2(this.amb.horizon.clone(), this.densite); }
    // La couleur de la brume : l'horizon de l'heure, à peine teinté par la région.
    brume(couleurRegion) { return this.amb.horizon.clone().lerp(this.c(couleurRegion), 0.1); }
    // Derrière la toile (le dôme la couvre ; la vue tactique du combat la montre) : le dégradé de l'heure.
    ciel(brumeSRGB) {
      const z = this.amb.zenith.clone().convertLinearToSRGB();
      return `linear-gradient(180deg, #${z.getHexString()} 0%, #${brumeSRGB.getHexString()} 100%)`;
    }
    lumieres(scene, L) {
      super.lumieres(scene, L);
      this.L = L;
    }

    // Ce que la nuit change aux matières (IleNuit.Nuit.materiaux), relevé avant et après : la part de
    // nuit de l'heure mêle les deux (appliquer).
    releve() {
      const ile = this.ile, m = ile.mats, e = ile.matEauRef;
      return {
        lueur: m && m.uSol ? m.uSol.forceLueur.value : 1,
        eau: e ? ['profonde', 'claire', 'ecume'].map(k => e.uniforms[k].value.clone()) : null,
        chute: ile.matChute ? ile.matChute.color.clone() : null,
        bancs: (ile.bancs || []).map(b => [b.material.color.clone(), b.material.opacity]),
        bouffees: ile.bouffees ? Float32Array.from(ile.bouffees.attributes.teinte.array) : null,
        fronde: m && m.fronde ? m.fronde.color.clone() : null,
        fig: ile.figures && ile.figures.mat && ile.figures.mat.uniforms.lumiereFig ? ile.figures.mat.uniforms.lumiereFig.value.clone() : null,
      };
    }
    materiaux() {
      const jour = this.releve();
      super.materiaux();
      // Sous la lune, les feuilles rousses gardent leur rouge (la nuit de 3.24 tire les frondaisons vers le vert).
      if (this.ile.mats && this.ile.mats.fronde) this.ile.mats.fronde.color.setRGB(0.86, 0.86, 0.8);
      this.mj = { jour, nuit: this.releve() };
      this.lisereNuit = this.uLisere ? this.uLisere.value.clone() : null;
      this.flaqueNuit = this.uFlaqueCouleur ? this.uFlaqueCouleur.value.clone() : null;
      this.appliquer(this.amb.nuit);
    }
    // La part de nuit `f` (0 : le jour du jeu, 1 : la nuit de 3.24).
    appliquer(f) {
      if (!this.mj || Math.abs(f - this.fNuit) < 0.01) return;
      this.fNuit = f;
      const ile = this.ile, { jour: J, nuit: N } = this.mj, m = ile.mats, e = ile.matEauRef;
      const mel = (dst, a, b) => dst.copy(a).lerp(b, f);
      if (m && m.uSol) m.uSol.forceLueur.value = J.lueur + (N.lueur - J.lueur) * f;
      if (e && J.eau) ['profonde', 'claire', 'ecume'].forEach((k, i) => mel(e.uniforms[k].value, J.eau[i], N.eau[i]));
      if (ile.matChute && J.chute) mel(ile.matChute.color, J.chute, N.chute);
      (ile.bancs || []).forEach((b, i) => { if (!J.bancs[i]) return; mel(b.material.color, J.bancs[i][0], N.bancs[i][0]); b.material.opacity = J.bancs[i][1] + (N.bancs[i][1] - J.bancs[i][1]) * f; });
      if (ile.bouffees && J.bouffees) {
        const a = ile.bouffees.attributes.teinte, A = a.array;
        for (let i = 0; i < A.length; i++) A[i] = J.bouffees[i] + (N.bouffees[i] - J.bouffees[i]) * f;
        a.needsUpdate = true;
      }
      if (m && m.fronde && J.fronde) mel(m.fronde.color, J.fronde, N.fronde);
      if (J.fig) mel(ile.figures.mat.uniforms.lumiereFig.value, J.fig, N.fig);
      if (this.uLisere && this.lisereNuit) this.uLisere.value.copy(this.lisereNuit).multiplyScalar(f);
      if (this.uFlaqueCouleur && this.flaqueNuit) this.uFlaqueCouleur.value.copy(this.flaqueNuit).multiplyScalar(f);
    }

    // ----- Le ciel en dôme, la pluie, la neige -----

    ciel3D(scene) {
      const THREE = this.THREE, tel = this.telephone;
      const dome = new THREE.Mesh(new THREE.SphereGeometry(100, tel ? 24 : 32, tel ? 12 : 16), new THREE.ShaderMaterial({
        vertexShader: CIEL_VS, fragmentShader: CIEL_FS, side: THREE.BackSide, depthWrite: false, depthTest: false, fog: false,
        uniforms: {
          uT: { value: 0 }, uLune: { value: new THREE.Vector3(-0.55, 0.27, -0.8) }, uHorizon: { value: new THREE.Color() },
          uZenith: { value: new THREE.Color() }, uSoleil: { value: new THREE.Vector3(0, -1, 0) }, uSoleilCoul: { value: new THREE.Color() }, uAstre: { value: new THREE.Vector3(-0.55, 0.27, -0.8).normalize() },
          uNuageClair: { value: new THREE.Color() }, uNuageSombre: { value: new THREE.Color() }, uEtoiles: { value: 1 }, uCouverture: { value: 0.25 }, uLueur: { value: 0 },
          uVoie: { value: new THREE.Vector3().crossVectors(new THREE.Vector3(-0.6, 0.08, -0.8).normalize(), new THREE.Vector3(0.55, 0.42, -0.72).normalize()).normalize() },
          uEclair: { value: new THREE.Vector4(0, 0, 0, 0) }, uAurore: { value: 0.45 },
        },
      }));
      dome.rotation.y = TOUR_DOME;
      dome.renderOrder = -10; dome.frustumCulled = false;
      scene.add(dome);
      this.dome = dome;
      // La pluie : des traits dans une boîte de 2B u de côté et H u de haut qui suit la caméra.
      const B = 16, H = 22, R = IleTerrain.M.hasard(IleTerrain.M.cle('lisiere-pluie'));
      const nP = tel ? 900 : 1800, pos = new Float32Array(nP * 6), bout = new Float32Array(nP * 2);
      for (let i = 0; i < nP; i++) { const x = (R() * 2 - 1) * B, y = R() * H, z = (R() * 2 - 1) * B; pos.set([x, y, z, x, y, z], i * 6); bout[i * 2] = 0; bout[i * 2 + 1] = 1; }
      const gP = new THREE.BufferGeometry();
      gP.setAttribute('position', new THREE.BufferAttribute(pos, 3)); gP.setAttribute('aBout', new THREE.BufferAttribute(bout, 1));
      const uCam = { value: new THREE.Vector3() };
      const matP = new THREE.ShaderMaterial({ vertexShader: PLUIE_VS, fragmentShader: PLUIE_FS, transparent: true, depthWrite: false, fog: false,
        uniforms: { uT: { value: 0 }, uCam, uB: { value: B }, uH: { value: H }, uForce: { value: 0 }, uCoul: { value: new THREE.Color('#c8d4e8') } } });
      const pluie = new THREE.LineSegments(gP, matP); pluie.frustumCulled = false; pluie.renderOrder = 8; pluie.visible = false; scene.add(pluie);
      const nN = tel ? 700 : 1400, posN = new Float32Array(nN * 3), ph = new Float32Array(nN);
      for (let i = 0; i < nN; i++) { posN.set([(R() * 2 - 1) * B, R() * H, (R() * 2 - 1) * B], i * 3); ph[i] = R(); }
      const gN = new THREE.BufferGeometry();
      gN.setAttribute('position', new THREE.BufferAttribute(posN, 3)); gN.setAttribute('aPhase', new THREE.BufferAttribute(ph, 1));
      const matN = new THREE.ShaderMaterial({ vertexShader: NEIGE_VS, fragmentShader: NEIGE_FS, transparent: true, depthWrite: false, fog: false,
        uniforms: { uT: { value: 0 }, uCam, uB: { value: B }, uH: { value: H }, uForce: { value: 0 }, uEchelle: { value: 600 } } });
      const neige = new THREE.Points(gN, matN); neige.frustumCulled = false; neige.renderOrder = 8; neige.visible = false; scene.add(neige);
      this.meteo = { pluie, neige, uCam };
    }

    // Le sol mouillé (METEOS.mouille : la pluie, l'orage, un peu la brume) : le sol plus sombre d'un
    // tiers au plus, le sol dessiné par le code (ses matières) comme le sol et les lignes du monde
    // modelé (IleGlb.mouiller) ; la couleur sèche est gardée pour revenir.
    mouiller(k) {
      if (Math.abs(k - (this.kMouille || 0)) < 0.005 && this.kMouille !== undefined) return;
      this.kMouille = k;
      const ile = this.ile, f = 1 - 0.32 * k;
      if (ile.mats) for (const m of [ile.mats.sol, ile.mats.solBord]) {
        if (!m || !m.color) continue;
        if (!m.userData.couleurSeche) m.userData.couleurSeche = m.color.clone();
        m.color.copy(m.userData.couleurSeche).multiplyScalar(f);
      }
      if (ile.monde && typeof IleGlb === 'object' && IleGlb.mouiller) IleGlb.mouiller(ile.monde, f);
    }

    // ----- Chaque image -----
    maj(now, temps, joueur, hj, cam, tact) {
      const THREE = this.THREE, ile = this.ile;
      // L'heure : fixe, ou une journée en douze minutes.
      if (this.reglage.cycle) {
        this.heure = (this.heure + (this._tPrec ? Math.min(0.1, temps - this._tPrec) : 0) * 24 / 720) % 24;
        this.amb = ambiance(THREE, this.heure, this.reglage.meteo);
      }
      this._tPrec = temps;
      const A = this.amb;
      this.densite = A.brume * (this.telephone ? 1.06 : 1);
      this.appliquer(A.nuit);
      if (ile.brumeVoulue && ile.brumeCle) ile.brumeVoulue.copy(this.brume(ile.brumeCle));
      super.maj(now, temps, joueur, hj, cam, tact);
      this.mouiller(A.mouille);
      // La part de nuit : la flaque dorée, la lanterne proche et les lucioles s'éteignent au jour,
      // et sous la pluie ou la neige pour les lucioles.
      const f = A.nuit;
      if (this.flaque) this.flaque.intensity *= f;
      if (this.lanterne) this.lanterne.intensity *= f;
      if (this.points) {
        const u = this.points.material.uniforms, k = f * (1 - Math.min(1, A.pluie + A.neige)) * (A.meteo === 'brume' ? 0.6 : 1);
        if (!this._lu) this._lu = [u.c1.value.clone(), u.c2.value.clone()];
        u.c1.value.copy(this._lu[0]).multiplyScalar(k); u.c2.value.copy(this._lu[1]).multiplyScalar(k);
        if (k < 0.02) this.points.visible = false;
      }
      // Les lumières, l'orage.
      const ec = A.eclair > 0 ? orage(temps, A.eclair) : null, flash = ec ? ec.force : 0;
      const L = this.L;
      if (L) {
        const j = A.jour, lum = A.lum, c0 = this.c0, c1 = this.c1;
        const mel = (lumiere, cle, k, sol) => {
          lumiere.color.copy(c0.set(LUM_NUIT[cle][0])).lerp(c1.set(LUM_JOUR[cle][0]), j);
          if (sol) lumiere.groundColor.copy(c0.set(LUM_NUIT[cle][1])).lerp(c1.set(LUM_JOUR[cle][1]), j);
          const i0 = LUM_NUIT[cle][k], i1 = LUM_JOUR[cle][k];
          lumiere.intensity = (i0 + (i1 - i0) * j) * lum;
        };
        mel(L.hemi, 'hemi', 2, true); mel(L.cle, 'cle', 1); mel(L.chaud, 'chaud', 1); mel(L.contre, 'contre', 1);
        // À l'aube et au soir, la lumière du soleil rougit.
        if (A.lueur > 0.01 && j > 0.05) L.cle.color.lerp(c0.copy(A.soleilCoul), Math.min(0.6, A.lueur * 0.5));
        L.hemi.intensity += flash * 0.9;
        L.cle.intensity += flash * 0.6;
      }
      // Le dôme suit la caméra ; il se tait sous la caméra orthographique du combat et en vue tactique.
      const cc = cam.courante, D = this.dome;
      if (D) {
        D.visible = !tact && !cc.isOrthographicCamera;
        D.position.copy(cc.position);
        const U = D.material.uniforms, srgb = (dst, c) => dst.copy(c).convertLinearToSRGB();
        srgb(U.uZenith.value, A.zenith); srgb(U.uHorizon.value, ile.scene && ile.scene.fog ? ile.scene.fog.color : A.horizon);
        srgb(U.uNuageClair.value, A.nuageClair); srgb(U.uNuageSombre.value, A.nuageSombre); srgb(U.uSoleilCoul.value, A.soleilCoul);
        U.uSoleil.value.copy(A.soleil); U.uLueur.value = A.lueur;
        U.uEtoiles.value = A.etoiles; U.uCouverture.value = A.couv; U.uAurore.value = 0.45 * A.aurore;
        if (A.jour > 0.5) U.uAstre.value.copy(A.soleil); else U.uAstre.value.set(-0.55, 0.27, -0.8).normalize();
        U.uT.value = temps;
        U.uEclair.value.set(ec ? ec.az : 0, flash, ec ? ec.graine : 0, ec ? ec.trait : 0);
      }
      const W = this.meteo;
      if (W) {
        W.uCam.value.copy(cc.position);
        const pl = W.pluie.material.uniforms, ne = W.neige.material.uniforms;
        pl.uT.value = temps; pl.uForce.value = A.pluie; pl.uCoul.value.copy(A.horizon).lerp(this.c1.setRGB(1, 1, 1), 0.55);
        ne.uT.value = temps; ne.uForce.value = A.neige;
        const hpx = ile.renderer ? ile.renderer.getDrawingBufferSize(this._taille || (this._taille = new THREE.Vector2())).y : 800;
        ne.uEchelle.value = cc.isPerspectiveCamera ? hpx / (2 * Math.tan(cc.fov * Math.PI / 360)) : 600;
        W.pluie.visible = A.pluie > 0.02 && !tact && !cc.isOrthographicCamera;
        W.neige.visible = A.neige > 0.02 && !tact && !cc.isOrthographicCamera;
      }
    }
  }

  return { Lisiere, ambiance, reglage, orage, METEOS, HEURES, AUTOMNE };
})();
