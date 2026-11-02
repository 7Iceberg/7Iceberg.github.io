// La carte 3D de l'île d'Ervane (docs/ILE-TECHNIQUE.md, 3.30 ; docs/ANALYSE-MAP-DUALITY.md, 4.2) :
// la scène du jeu elle-même, vue d'en haut par la caméra de l'île en mode « carte » (CameraIle,
// js/ile-camera.js), dans la fenêtre « Carte » (js/hud-carte.js). Ce module n'ajoute à la scène que
// ce qui fait d'elle une carte, et le reprend toujours des données et de la scène du jeu :
//
// - les marqueurs (pastilles des relais, de l'entrée du donjon, des artisans, des marchands, des PNJ
//   qui ont une quête à donner ou à rendre ; épingles des quêtes suivies ; l'épingle du joueur, son
//   anneau qui respire et la flèche de son cap) et les noms (les zones, les sous-zones selon leur
//   surface, les lieux de près), dessinés par une seule InstancedMesh de quads ancrés sur le monde,
//   à taille constante à l'écran, sans test de profondeur : dans la même image que la caméra, jamais
//   un élément du DOM replacé après coup. Les images des pastilles et des épingles sont celles de la
//   carte peinte (CartePeinture.pastille, CartePeinture.epingle), rangées dans un atlas ;
//   les pastilles qui se recouvrent se regroupent sous la plus importante (l'ordre PRIO de la carte)
//   avec un « +N », ou s'écartent en rangée de près ; les noms se placent du plus important au moins
//   important, un nom qui en chevaucherait un autre (ou un marqueur) n'est pas dessiné ;
// - le niveau de détail du survol : de haut, les tuiles du sol, du décor et du monde modelé sont
//   réunies par matière en quelques maillages (copies des mêmes géométries, faites une fois, par
//   tranches d'images), ce qui dépasse à peine du sol (herbes, fleurs, cailloux) en moins : le budget
//   du téléphone tient l'île entière en vue.
//
// Les réglages des noms sont des rapports de D0 (la distance qui montre l'île entière).
const IleCarte = (() => {
  const MAX = 192;
  // Les noms : les zones de 0,46 × D0 et au-delà (en fondu dès 0,36) ; les sous-zones selon leur
  // surface (u²) en deçà d'un seuil ; les lieux en deçà de 0,36 × D0.
  const NOMS = { zones: [0.36, 0.46], sousZones: [[1500, 0.95], [700, 0.72], [0, 0.52]], lieux: [0.30, 0.36] };
  // Les figures du monde (PNJ, groupes, le héros) ne se dessinent plus au-delà de cette largeur de
  // sol vue (u), le champ le plus large du jeu : de plus haut, ce sont des points ; les marqueurs les
  // remplacent.
  const FIGURES_MAX = 60;
  // Le survol passe aux maillages réunis au-delà de cette largeur de sol vue (u), selon la qualité.
  const PROCHE = { haute: 78, moyenne: 62, basse: 50 };
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const lisse = (a, b, x) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };

  // ----- L'atlas : une toile, des rangées, des images à leur ancre -----

  class Atlas {
    constructor(THREE, w, h) {
      this.THREE = THREE;
      this.w = w; this.h = h;
      this.toile = document.createElement('canvas');
      this.toile.width = w; this.toile.height = h;
      this.g = this.toile.getContext('2d');
      this.tex = new THREE.CanvasTexture(this.toile);
      this.tex.flipY = false;
      this.tex.encoding = THREE.sRGBEncoding;
      this.tex.generateMipmaps = true;
      this.tex.minFilter = THREE.LinearMipmapLinearFilter;
      this.tex.magFilter = THREE.LinearFilter;
      this.vider();
    }
    vider() {
      this.plein = false;
      this.g.clearRect(0, 0, this.w, this.h);
      this.cases = new Map();
      this.rangs = [];
      this.sale = true;
    }
    // Une place de w × h pixels : la première rangée assez haute, sinon une rangée neuve.
    place(w, h) {
      for (const r of this.rangs) if (h <= r.h && h >= r.h * 0.6 && r.x + w <= this.w) { const p = { x: r.x, y: r.y }; r.x += w + 2; return p; }
      const last = this.rangs[this.rangs.length - 1], y = last ? last.y + last.h + 2 : 0;
      const hh = Math.ceil(h / 8) * 8;
      if (y + hh > this.h || w > this.w) return null;
      this.rangs.push({ y, h: hh, x: w + 2 });
      return { x: 0, y };
    }
    // L'image d'une clé : `peindre()` rend { canvas, ax, ay } (l'ancre en pixels de la toile) la
    // première fois ; rend { u0, v0, du, dv, w, h, ax, ay } en pixels de l'atlas.
    obtenir(cle, peindre) {
      let c = this.cases.get(cle);
      if (c) return c;
      const art = peindre();
      if (!art || !art.canvas) return null;
      const w = art.canvas.width, h = art.canvas.height;
      // Plus de place : rien cette image (les cases de l'image en cours restent justes), tout est
      // repeint à la suivante (Carte.maj vide l'atlas plein).
      const p = this.place(w, h);
      if (!p) { this.plein = true; return null; }
      this.g.drawImage(art.canvas, p.x, p.y);
      c = { u0: p.x / this.w, v0: p.y / this.h, du: w / this.w, dv: h / this.h, w, h, ax: art.ax, ay: art.ay, hx: art.hx != null ? art.hx : art.ax, hy: art.hy != null ? art.hy : art.ay };
      this.cases.set(cle, c);
      this.sale = true;
      return c;
    }
    envoyer() { if (this.sale) { this.tex.needsUpdate = true; this.sale = false; } }
    octets() { return this.w * this.h * 4 * 2.33; }
    liberer() { this.tex.dispose(); this.toile.width = 0; this.toile.height = 0; }
  }

  // ----- Les peintures propres à la carte -----

  const toile = (w, h) => { const c = document.createElement('canvas'); c.width = Math.max(1, Math.ceil(w)); c.height = Math.max(1, Math.ceil(h)); return c; };

  // Un nom : `sorte` 'zone' (le titre, la police des titres, le niveau dessous), 'sousZone', 'lieu'.
  function peindreNom(sorte, texte, sous, ech, theme) {
    const titre = (theme && theme.titre) || 'serif', ui = (theme && theme.ui) || 'sans-serif';
    const S = { zone: [`700 ${19 * ech}px ${titre}`, 'rgba(255,250,236,0.96)', 'rgba(18,24,40,0.7)', 3.4], sousZone: [`700 ${12.5 * ech}px ${ui}`, '#fff4dc', 'rgba(14,18,30,0.82)', 3.2], lieu: [`italic 600 ${11 * ech}px ${ui}`, '#f6eedc', 'rgba(14,18,30,0.76)', 2.8] }[sorte] || [`600 ${12 * ech}px ${ui}`, '#fff', '#000', 3];
    const mes = toile(4, 4).getContext('2d');
    mes.font = S[0];
    const w1 = mes.measureText(texte).width;
    const fs = parseFloat(/(\d+(\.\d+)?)px/.exec(S[0])[1]);
    let w2 = 0, f2 = '';
    if (sous) { f2 = `600 ${10.5 * ech}px ${ui}`; mes.font = f2; w2 = mes.measureText(sous).width; }
    const pad = 4 * ech, h1 = fs * 1.3, h2 = sous ? 10.5 * ech * 1.35 : 0;
    const c = toile(Math.max(w1, w2) + pad * 2, h1 + h2 + pad * 2), g = c.getContext('2d');
    g.textAlign = 'center'; g.textBaseline = 'middle'; g.lineJoin = 'round';
    const cx = c.width / 2;
    g.font = S[0];
    g.shadowColor = 'rgba(8,12,24,0.55)'; g.shadowBlur = 4 * ech;
    g.lineWidth = S[3] * ech; g.strokeStyle = S[2]; g.strokeText(texte, cx, pad + h1 / 2);
    g.shadowBlur = 0;
    g.fillStyle = S[1]; g.fillText(texte, cx, pad + h1 / 2);
    if (sous) {
      g.font = f2;
      g.lineWidth = 2.6 * ech; g.strokeStyle = 'rgba(14,18,30,0.7)'; g.strokeText(sous, cx, pad + h1 + h2 / 2 - ech);
      g.fillStyle = 'rgba(255,236,196,0.92)'; g.fillText(sous, cx, pad + h1 + h2 / 2 - ech);
    }
    return { canvas: c, ax: cx, ay: c.height / 2 };
  }

  // Le « +N » d'un groupe de pastilles : un disque sombre cerclé de blanc.
  function peindreBadge(texte, px) {
    const c = toile(px + 4, px + 4), g = c.getContext('2d'), r = px / 2, x = c.width / 2;
    g.fillStyle = '#1d1712'; g.beginPath(); g.arc(x, x, r, 0, Math.PI * 2); g.fill();
    g.strokeStyle = 'rgba(255,255,255,0.92)'; g.lineWidth = Math.max(1.2, px * 0.09); g.stroke();
    g.fillStyle = '#ffffff'; g.font = `800 ${Math.round(px * (texte.length > 2 ? 0.46 : 0.56))}px sans-serif`; g.textAlign = 'center'; g.textBaseline = 'middle';
    g.fillText(texte, x, x + px * 0.03);
    return { canvas: c, ax: x, ay: x };
  }

  // L'anneau qui respire autour du joueur (bleu, comme son épingle) ; l'anneau d'or de la sélection.
  function peindreAnneau(px, couleur, plein) {
    const c = toile(px, px), g = c.getContext('2d'), x = px / 2;
    const gr = g.createRadialGradient(x, x, px * 0.18, x, x, px * 0.5);
    gr.addColorStop(0, plein ? couleur.replace(/[\d.]+\)$/, '0.32)') : 'rgba(0,0,0,0)');
    gr.addColorStop(0.62, couleur.replace(/[\d.]+\)$/, '0.22)'));
    gr.addColorStop(0.8, couleur);
    gr.addColorStop(1, couleur.replace(/[\d.]+\)$/, '0)'));
    g.fillStyle = gr; g.beginPath(); g.arc(x, x, px / 2, 0, Math.PI * 2); g.fill();
    return { canvas: c, ax: x, ay: x };
  }

  // La flèche du cap : un chevron qui pointe vers le haut de l'image (tourné par le shader).
  function peindreFleche(px) {
    const c = toile(px, px), g = c.getContext('2d'), x = px / 2;
    g.beginPath(); g.moveTo(x, px * 0.08); g.lineTo(px * 0.86, px * 0.84); g.lineTo(x, px * 0.62); g.lineTo(px * 0.14, px * 0.84); g.closePath();
    g.fillStyle = '#ffffff'; g.fill();
    g.lineJoin = 'round'; g.lineWidth = px * 0.09; g.strokeStyle = '#124c94'; g.stroke();
    return { canvas: c, ax: x, ay: x };
  }

  // La cible posée au toucher d'un sol : un petit anneau d'or et son point.
  function peindreCible(px) {
    const c = toile(px, px), g = c.getContext('2d'), x = px / 2;
    g.strokeStyle = 'rgba(20,16,10,0.55)'; g.lineWidth = px * 0.16; g.beginPath(); g.arc(x, x, px * 0.34, 0, Math.PI * 2); g.stroke();
    g.strokeStyle = '#ffe7a3'; g.lineWidth = px * 0.09; g.stroke();
    g.fillStyle = '#ffe7a3'; g.beginPath(); g.arc(x, x, px * 0.09, 0, Math.PI * 2); g.fill();
    return { canvas: c, ax: x, ay: x };
  }

  // ----- Le shader des quads ancrés sur le monde, à taille constante à l'écran -----

  const VS = `
attribute vec3 ancre;
attribute vec4 rect;
attribute vec4 boite;
attribute vec2 extra;
uniform vec2 vue;
varying vec2 vUv;
varying float vAlpha;
void main() {
  vec4 p = projectionMatrix * modelViewMatrix * vec4(ancre, 1.0);
  vec2 q = (position.xy - vec2(0.5)) * boite.zw;
  float c = cos(extra.y), s = sin(extra.y);
  q = vec2(c * q.x + s * q.y, -s * q.x + c * q.y);
  vec2 px = boite.xy + q;
  p.xy += px / vue * 2.0 * p.w;
  gl_Position = p;
  vUv = vec2(rect.x + position.x * rect.z, rect.y + (1.0 - position.y) * rect.w);
  vAlpha = extra.x * step(-p.w, p.z) * step(p.z, p.w);
}`;
  const FS = `
uniform sampler2D atlas;
varying vec2 vUv;
varying float vAlpha;
void main() {
  vec4 c = texture2D(atlas, vUv);
  gl_FragColor = vec4(c.rgb, c.a * vAlpha);
  #include <encodings_fragment>
}`;

  // ----- Les maillages réunis du survol -----

  // Réunit des maillages qui partagent leurs matières et leurs attributs en un seul. Deux cas :
  // - des morceaux d'un même maillage (les tuiles du monde modelé : un index par tuile sur des
  //   attributs partagés, une même matrice) : seuls les index se réunissent, les attributs restent
  //   ceux de la scène (une seule copie sur le GPU), la matrice va au maillage ;
  // - sinon, les sommets utiles passent dans le repère du monde (positions par la matrice, normales
  //   par sa rotation), recopiés une fois ; `garder(ax, ay, az, bx, ..., cz)` écarte des triangles.
  // Les index sont rangés par matière (groupes). Rend { geo, matrice, octets }, ou null si rien ne reste.
  function fusionner(THREE, liste, garder) {
    const g0 = liste[0].geo, noms = Object.keys(g0.attributes);
    const groupesDe = g => (g.groups && g.groups.length ? g.groups : [{ start: 0, count: g.index ? g.index.count : g.attributes.position.count, materialIndex: 0 }]);
    const ranger = parMat => {
      let ni = 0;
      for (const l of parMat.values()) ni += l.length;
      return ni;
    };
    const partage = !garder && liste.every(it => it.geo.index && Object.keys(it.geo.attributes).length === noms.length && noms.every(n => it.geo.attributes[n] === g0.attributes[n]) && it.m.equals(liste[0].m));
    const parMat = new Map();
    const liste2 = mi => { let l = parMat.get(mi || 0); if (!l) { l = []; parMat.set(mi || 0, l); } return l; };
    const geo = new THREE.BufferGeometry();
    let nv = 0, octets = 0;
    if (partage) {
      for (const it of liste) for (const gr of groupesDe(it.geo)) { const l = liste2(gr.materialIndex), A = it.geo.index.array; for (let t = gr.start; t < gr.start + gr.count; t++) l.push(A[t]); }
      for (const n of noms) geo.setAttribute(n, g0.attributes[n]);
      nv = g0.attributes.position.count;
    } else {
      const outs = {};
      for (const n of noms) outs[n] = [];
      const v = new THREE.Vector3(), nm = new THREE.Matrix3();
      for (const it of liste) {
        const g = it.geo, P = g.attributes.position, nP = P.count, m = it.m, idx = g.index;
        nm.getNormalMatrix(m);
        const wp = new Float32Array(nP * 3);
        for (let i = 0; i < nP; i++) { v.fromBufferAttribute(P, i).applyMatrix4(m); wp[i * 3] = v.x; wp[i * 3 + 1] = v.y; wp[i * 3 + 2] = v.z; }
        const remap = new Int32Array(nP).fill(-1);
        const pousse = i => {
          if (remap[i] >= 0) return remap[i];
          remap[i] = nv++;
          for (const n of noms) {
            const A = g.attributes[n], o = outs[n];
            if (!A) { const k = n === 'position' || n === 'normal' ? 3 : g0.attributes[n].itemSize; for (let c = 0; c < k; c++) o.push(0); continue; }
            if (n === 'position') o.push(wp[i * 3], wp[i * 3 + 1], wp[i * 3 + 2]);
            else if (n === 'normal') { v.fromBufferAttribute(A, i).applyMatrix3(nm).normalize(); o.push(v.x, v.y, v.z); }
            // Les autres tels quels (même type et même normalisation dans tout le seau, voir `ajoute`).
            else for (let c = 0; c < A.itemSize; c++) o.push(A.array[i * A.itemSize + c]);
          }
          return remap[i];
        };
        for (const gr of groupesDe(g)) {
          const l = liste2(gr.materialIndex);
          for (let t = gr.start; t + 2 < gr.start + gr.count; t += 3) {
            const a = idx ? idx.array[t] : t, b = idx ? idx.array[t + 1] : t + 1, c = idx ? idx.array[t + 2] : t + 2;
            if (garder && !garder(wp[a * 3], wp[a * 3 + 1], wp[a * 3 + 2], wp[b * 3], wp[b * 3 + 1], wp[b * 3 + 2], wp[c * 3], wp[c * 3 + 1], wp[c * 3 + 2])) continue;
            l.push(pousse(a), pousse(b), pousse(c));
          }
        }
      }
      // Les positions en flottants, les normales sur un octet par composante (comme le monde modelé,
      // IleGlb), les autres dans le type de leur source (couleurs et UV normalisées).
      for (const n of noms) {
        const A0 = g0.attributes[n];
        let at;
        if (n === 'position') at = new THREE.BufferAttribute(new Float32Array(outs[n]), 3);
        else if (n === 'normal') {
          const src = outs[n], N = new Int8Array(src.length / 3 * 4);
          for (let i = 0, j = 0; i < src.length; i += 3, j += 4) { N[j] = Math.round(src[i] * 127); N[j + 1] = Math.round(src[i + 1] * 127); N[j + 2] = Math.round(src[i + 2] * 127); }
          at = new THREE.BufferAttribute(N, 4, true);
        } else at = new THREE.BufferAttribute(new A0.array.constructor(outs[n]), A0.itemSize, A0.normalized);
        geo.setAttribute(n, at);
        octets += at.array.byteLength;
      }
    }
    const ni = ranger(parMat);
    if (!ni) return null;
    const index = nv > 65535 ? new Uint32Array(ni) : new Uint16Array(ni);
    let o = 0;
    for (const [mi, l] of [...parMat].sort((a, b) => a[0] - b[0])) { index.set(l, o); geo.addGroup(o, l.length, mi); o += l.length; }
    geo.setIndex(new THREE.BufferAttribute(index, 1));
    octets += index.byteLength;
    geo.computeBoundingSphere();
    return { geo, matrice: partage ? liste[0].m : null, octets };
  }

  // ======================================================================

  class Carte {
    constructor(THREE, ile) {
      this.THREE = THREE;
      this.ile = ile;
      this.ouverte = false;
      this.alpha = 0;
      this.opts = {};
      this.reperes = [];      // les pastilles et les épingles des quêtes (données de la fenêtre)
      this.donneesA = 0;
      this.items = [];        // ce qui est dessiné à cette image, pour le toucher : { x, y, r, item }
      this.noms = [];         // les noms dessinés à cette image
      this.sel = null;        // la clé de l'élément choisi
      this.survole = null;    // la clé de l'élément survolé
      this.cible = null;      // le point du sol choisi : { x, y }
      this.cap = null;        // le cap du joueur, en radians dans le plan (u, v)
      this.prec = null;
      this.lieux = null;      // les noms à placer, calculés une fois par plateau
      this.lod = null;        // les maillages réunis : { meshes, sources, pret }
      this.tache = null;      // la construction des maillages réunis, par tranches d'images
      this.echelle = 1;
      this.densite = 1;
      this.atlas = null;
      const quad = new THREE.PlaneGeometry(1, 1).translate(0.5, 0.5, 0);
      const geo = new THREE.InstancedBufferGeometry();
      geo.index = quad.index; geo.attributes.position = quad.attributes.position;
      this.aAncre = new THREE.InstancedBufferAttribute(new Float32Array(MAX * 3), 3);
      this.aRect = new THREE.InstancedBufferAttribute(new Float32Array(MAX * 4), 4);
      this.aBoite = new THREE.InstancedBufferAttribute(new Float32Array(MAX * 4), 4);
      this.aExtra = new THREE.InstancedBufferAttribute(new Float32Array(MAX * 2), 2);
      for (const a of [this.aAncre, this.aRect, this.aBoite, this.aExtra]) a.setUsage(THREE.DynamicDrawUsage);
      geo.setAttribute('ancre', this.aAncre); geo.setAttribute('rect', this.aRect); geo.setAttribute('boite', this.aBoite); geo.setAttribute('extra', this.aExtra);
      geo.instanceCount = 0;
      this.geo = geo;
      this.mat = new THREE.ShaderMaterial({ uniforms: { atlas: { value: null }, vue: { value: new THREE.Vector2(1, 1) } }, vertexShader: VS, fragmentShader: FS, transparent: true, depthTest: false, depthWrite: false });
      this.mesh = new THREE.Mesh(geo, this.mat);
      this.mesh.frustumCulled = false;
      this.mesh.renderOrder = 40;
      this.mesh.visible = false;
      this.mesh.name = 'carte_marqueurs';
      if (ile.scene) ile.scene.add(this.mesh);
      this._v = new THREE.Vector3(); this._f = new THREE.Vector3();
    }

    // ----- Ouvrir, fermer -----

    // `opts` : { donnees() → [{ cle, kind, sub, x, y, prio, epingle }], theme: { titre, ui }, surImage() }.
    ouvrir(opts) {
      this.opts = opts || {};
      this.ouverte = true;
      this.donneesA = 0;
      if (!this.lieux) this.lieux = this.calculerLieux();
      if (!this.lod) this.preparerLod();
    }
    fermer() { this.ouverte = false; this.survole = null; }

    // ----- Les noms à placer : zones, sous-zones, lieux -----

    // D'après la grille du terrain : chaque sous-zone (le secteur de chaque u de terre ferme) et sa
    // zone, leur surface (u²), leur barycentre ramené sur l'échantillon le plus proche qui leur
    // appartient (une zone en fer à cheval garde son nom sur elle) ; les lieux nommés du plateau
    // (places et eaux qui portent un `nom`).
    calculerLieux() {
      const ile = this.ile, T = ile.T, def = ile.def || {};
      const out = { zones: [], sousZones: [], lieux: [] };
      if (!T || !T.secteur) return out;
      const zoneDe = id => (typeof World === 'function' && World.zoneOf ? World.zoneOf(id) : null);
      const parSecteur = new Map(), parZone = new Map();
      const ajoute = (m, k, u, v) => { let s = m.get(k); if (!s) { s = { su: 0, sv: 0, n: 0, pts: [] }; m.set(k, s); } s.su += u; s.sv += v; s.n++; if ((u + v) % 2 === 0) s.pts.push(u, v); };
      for (let v = 0; v < T.H; v++) for (let u = 0; u < T.W; u++) {
        const i = v * T.W + u;
        if (T.vide[i] || T.secteur[i] === 255) continue;
        const id = T.secteurs[T.secteur[i]], z = zoneDe(id);
        ajoute(parSecteur, id, u, v);
        if (z) ajoute(parZone, z, u, v);
      }
      const pose = s => {
        const bx = s.su / s.n, by = s.sv / s.n;
        let best = null, bd = Infinity;
        for (let k = 0; k < s.pts.length; k += 2) { const d = (s.pts[k] - bx) ** 2 + (s.pts[k + 1] - by) ** 2; if (d < bd) { bd = d; best = [s.pts[k], s.pts[k + 1]]; } }
        return best || [bx, by];
      };
      const niv = l => (l ? (l[0] === l[1] ? `niv. ${l[0]}` : `niv. ${l[0]} à ${l[1]}`) : '');
      // Une zone garde aussi quatre autres points à elle, vers ses bords (à mi-chemin du barycentre et
      // de ses extrêmes) : son nom s'y pose si les marqueurs couvrent son centre (le village).
      const autres = s => {
        const bx = s.su / s.n, by = s.sv / s.n;
        let x0 = Infinity, x1 = -Infinity, y0 = Infinity, y1 = -Infinity;
        for (let k = 0; k < s.pts.length; k += 2) { x0 = Math.min(x0, s.pts[k]); x1 = Math.max(x1, s.pts[k]); y0 = Math.min(y0, s.pts[k + 1]); y1 = Math.max(y1, s.pts[k + 1]); }
        return [[(bx + x0) / 2, by], [(bx + x1) / 2, by], [bx, (by + y0) / 2], [bx, (by + y1) / 2]].map(([cx, cy]) => pose({ su: cx, sv: cy, n: 1, pts: s.pts }));
      };
      for (const [z, s] of parZone) { const [x, y] = pose(s); out.zones.push({ cle: 'z:' + z.id, sorte: 'zone', nom: z.name, sous: niv(z.level), x, y, aire: s.n, zone: z.id, autres: autres(s) }); }
      for (const [id, s] of parSecteur) {
        const d = typeof World === 'function' && World.mapDef ? World.mapDef(id) : null;
        if (!d) continue;
        const [x, y] = pose(s);
        out.sousZones.push({ cle: 's:' + id, sorte: 'sousZone', nom: d.name.charAt(0).toUpperCase() + d.name.slice(1), x, y, aire: s.n, map: id });
      }
      // Un lieu qui porte le nom de sa sous-zone (la Place du Relais, la Source Claire) ne fait pas un
      // second nom : de près, celui de la sous-zone se pose sur lui.
      const parNom = new Map(out.sousZones.map(n => [n.nom.toLowerCase(), n]));
      for (const l of [].concat(def.places || [], def.eaux || [])) {
        if (!l.nom) continue;
        const p = l.centre || l.point || (l.points && l.points[Math.floor(l.points.length / 2)]);
        if (!p) continue;
        const nom = l.nom.charAt(0).toUpperCase() + l.nom.slice(1), sz = parNom.get(nom.toLowerCase());
        if (sz) sz.proche = [p[0], p[1]];
        else out.lieux.push({ cle: 'l:' + l.id, sorte: 'lieu', nom, x: p[0], y: p[1], aire: 0 });
      }
      out.zones.sort((a, b) => b.aire - a.aire);
      out.sousZones.sort((a, b) => b.aire - a.aire);
      return out;
    }

    // ----- Les maillages réunis du survol -----

    // Les sources : les tuiles lointaines du sol (un sommet pour 2 u) et les silhouettes du décor
    // dessiné par code ; les maillages du monde modelé (pas ses InstancedMesh). Réunis par matière et
    // par attributs ; le semis du monde modelé perd ce qui dépasse le sol de moins de 0,9 u (herbes,
    // fleurs, cailloux : invisibles d'en haut, la moitié de ses triangles) ; les détails (agrafes,
    // fils blancs, pavés) ne restent qu'en qualité haute. Une tranche par image, 6 ms au plus.
    preparerLod() {
      const ile = this.ile, THREE = this.THREE, seaux = new Map(), sources = [];
      // Les attributs de position partagés par plusieurs maillages (les tuiles d'un même maillage du
      // monde modelé) : leurs morceaux se réunissent à part, par leurs seuls index.
      const usages = new Map(), ids = new Map();
      if (ile.monde) for (const o of ile.monde.children) if (o.isMesh && o.geometry && o.geometry.attributes.position) { const P = o.geometry.attributes.position; usages.set(P, (usages.get(P) || 0) + 1); }
      const idDe = P => { if (!ids.has(P)) ids.set(P, ids.size + 1); return ids.get(P); };
      const ajoute = (o, cle, garder) => {
        if (!o || !o.geometry || !o.parent || o.isInstancedMesh || o.geometry.isInstancedBufferGeometry) return;
        const geo = o.geometry;
        if (!geo.attributes.position) return;
        o.updateWorldMatrix(true, false);
        const mats = Array.isArray(o.material) ? o.material : [o.material];
        const P = geo.attributes.position, part = !garder && (usages.get(P) || 0) > 1 ? '|p' + idDe(P) : '';
        const k = cle + '|' + mats.map(m => m.uuid).join(',') + '|' + Object.keys(geo.attributes).sort().map(n => { const A = geo.attributes[n]; return n + ':' + A.array.constructor.name + A.itemSize + (A.normalized ? 'n' : ''); }).join(',') + '|' + (o.renderOrder || 0) + part;
        let s = seaux.get(k);
        if (!s) { s = { materiel: o.material, renderOrder: o.renderOrder || 0, liste: [], garder, nom: cle }; seaux.set(k, s); }
        s.liste.push({ geo, m: o.matrixWorld.clone() });
        sources.push(o);
      };
      for (const t of ile.tuilesSol || []) ajoute(t.loin || t.proche, 'sol');
      for (const t of ile.tuilesSol || []) if (t.loin && t.proche && t.proche.parent) sources.push(t.proche);
      for (const t of ile.tuilesDecor || []) { ajoute(t.sil, 'silhouette'); if (t.groupe && t.groupe.parent) sources.push(t.groupe); }
      const haute = ile.qualite === 'haute';
      const sol = (x, z) => { const h = ile.T ? ile.T.marcheA(x, z) : 0; return Number.isFinite(h) ? h : (ile.T ? ile.T.solBrutA(x, z) : 0); };
      const releve = (ax, ay, az, bx, by, bz, cx, cy, cz) => Math.max(ay, by, cy) - sol((ax + bx + cx) / 3, (az + bz + cz) / 3) > 0.9;
      if (ile.monde) for (const o of ile.monde.children) {
        const n = o.name || '';
        if (/^mo_(agrafes|fils|sol_pave)/.test(n) && !haute) { if (o.isMesh) sources.push(o); continue; }
        if (!o.isMesh) continue;
        ajoute(o, /^semis /.test(n) ? 'semis' : n.replace(/ t\d+$/, ''), /^semis /.test(n) ? releve : null);
      }
      this.lod = { meshes: [], sources, pret: false, octets: 0, ms: 0, tranches: 0 };
      this.tache = [...seaux.values()];
      if (!this.tache.length) this.lod.pret = true;
      void THREE;
    }
    // Une tranche de la construction (6 ms au plus) ; rend vrai quand tout est prêt.
    avancerLod() {
      const L = this.lod, ile = this.ile, THREE = this.THREE;
      if (!L || L.pret) return !!(L && L.pret);
      const t0 = performance.now();
      while (this.tache.length && performance.now() - t0 < 6) {
        const s = this.tache.shift();
        const f = fusionner(THREE, s.liste, s.garder);
        if (!f) continue;
        const m = new THREE.Mesh(f.geo, s.materiel);
        m.matrixAutoUpdate = false;
        if (f.matrice) { m.matrix.copy(f.matrice); m.matrixWorldNeedsUpdate = true; }
        m.renderOrder = s.renderOrder;
        m.visible = false;
        m.name = 'carte_lod ' + s.nom;
        if (ile.scene) ile.scene.add(m);
        L.meshes.push(m);
        L.octets += f.octets; ile.octetsGeo += f.octets;
      }
      if (!this.tache.length) L.pret = true;
      L.ms += performance.now() - t0; L.tranches++;
      return L.pret;
    }
    // De haut : les maillages réunis à la place de leurs sources. `oui` faux : les sources reprennent
    // (leur visibilité est reposée par l'image du jeu).
    survolLod(oui) {
      const L = this.lod;
      if (!L) return;
      for (const m of L.meshes) m.visible = !!oui;
      if (oui) for (const o of L.sources) o.visible = false;
    }
    seuilProche() { return PROCHE[this.ile.qualite] || PROCHE.moyenne; }

    // ----- Chaque image -----

    // Les marqueurs et les noms de cette image, d'après la caméra (le survol `vol` de CameraIle).
    maj(now, vol) {
      const ile = this.ile, cam = ile.camera;
      const cible = this.ouverte && vol && vol.carte ? 1 : 0;
      // Les marqueurs paraissent en 350 ms une fois arrivés ; ils partent en 150 ms.
      const dt = this._tA ? clamp((now - this._tA) / 1000, 0, 0.1) : 0.016;
      this._tA = now;
      const arrive = vol && vol.carte && !vol.vol ? (CameraIle.calme() ? 1 : clamp((now - (vol.arrivee || 0)) / 350, 0, 1)) : 0;
      this.alpha = cible ? arrive : vol ? Math.max(0, this.alpha - dt / 0.15) : 0;
      this.items = []; this.noms = [];
      if (this.alpha <= 0.001 || !vol || !cam || !cam.vw) { this.mesh.visible = false; this.geo.instanceCount = 0; return; }
      if (this.ouverte && (!this.donneesA || now - this.donneesA > 500 || now < this.donneesA)) {
        this.donneesA = now;
        try { this.reperes = this.opts.donnees ? this.opts.donnees() || [] : []; } catch (e) { console.error(e); this.reperes = []; }
      }
      const W = cam.vw, H = cam.vh, D0 = vol.D0, r = vol.dist / D0;
      const ech = clamp(H / 560, 0.82, 1.15);
      const densite = Math.min(2, Math.max(1, ile.densite || 1));
      if (!this.atlas || this.densite !== densite || Math.abs(this.echelle - ech) > 0.02) {
        if (this.atlas) this.atlas.liberer();
        this.atlas = new Atlas(this.THREE, densite > 1.25 ? 2048 : 1024, densite > 1.25 ? 1024 : 512);
        this.mat.uniforms.atlas.value = this.atlas.tex;
        this.densite = densite; this.echelle = ech;
      }
      const A = this.atlas, theme = this.opts.theme || {};
      if (A.plein) A.vider();
      const cc = cam.cam, cp = cc.position, fwd = this._f.set(0, 0, -1).applyQuaternion(cc.quaternion);
      const proj = (x, h, y) => { const p = cam.versEcran(x, h, y); p.prof = (x - cp.x) * fwd.x + (h - cp.y) * fwd.y + (y - cp.z) * fwd.z; return p; };
      const dedans = (p, m) => p.devant && p.x > -m && p.x < W + m && p.y > -m && p.y < H + m;
      const inst = [];
      const pose = (a, x, h, y, ox, oy, w, hh, alpha, rot) => { if (a) inst.push([x, h, y, ox, oy, w, hh, a.u0, a.v0, a.du, a.dv, alpha, rot || 0]); };
      // Une image de l'atlas posée à l'ancre (x, h, y) : son ancre de peinture sur le point, à
      // l'échelle `k` (pixels d'écran par pixel de peinture), décalée de (dx, dy) pixels.
      const image = (a, x, h, y, k, alpha, dx, dy, rot) => {
        if (!a) return;
        const w = a.w * k, hh = a.h * k;
        pose(a, x, h, y, (a.w / 2 - a.ax) * k + (dx || 0), -((a.h / 2 - a.ay) * k + (dy || 0)), w, hh, alpha, rot);
      };
      const occ = [];
      const libre = R => occ.every(o => R.x1 < o.x0 || R.x0 > o.x1 || R.y1 < o.y0 || R.y0 > o.y1);
      const mesHaut = 1 / densite;

      // 1. Les pastilles : à 1,5 u au-dessus du sol, à l'échelle de la profondeur (60 % à 100 %),
      // regroupées quand elles se recouvrent (la plus importante dessus, « +N »), écartées en rangée
      // de près quand elles sont d'un même lieu.
      const Dp = Math.round(28 * ech);
      const pts = [];
      for (const it of this.reperes) {
        if (it.epingle) continue;
        const h = ile.hauteur(it.x, it.y) + 1.5, p = proj(it.x, h, it.y);
        if (!dedans(p, 30)) continue;
        const s = clamp(vol.dist * 1.25 / Math.max(1, p.prof), 0.6, 1);
        pts.push({ it, h, p, s });
      }
      pts.sort((a, b) => (b.it.prio || 0) - (a.it.prio || 0) || a.p.prof - b.p.prof);
      const groupes = [];
      for (const q of pts) {
        const R = Dp * q.s * 0.5;
        const g = groupes.find(o => Math.hypot(o.p.x - q.p.x, o.p.y - q.p.y) < (o.R + R) * 0.85);
        if (g) g.membres.push(q); else groupes.push({ p: q.p, R, s: q.s, h: q.h, x: q.it.x, y: q.it.y, membres: [q] });
      }
      // De près (sous 0,36 × D0), un petit groupe d'un même lieu (moins de 1,5 u entre eux) s'écarte
      // en rangée au lieu de se cacher.
      const poses = [];
      for (const g of groupes) {
        const n = g.membres.length;
        const proches = n > 1 && n <= 4 && r < 0.36 && g.membres.every(m => Math.hypot(m.it.x - g.x, m.it.y - g.y) < 1.5);
        if (proches) g.membres.forEach((m, i) => poses.push({ membres: [m], p: g.p, s: g.s, h: g.h, x: g.x, y: g.y, dx: (i - (n - 1) / 2) * (Dp * g.s + 3), R: g.R }));
        else poses.push({ membres: g.membres, p: g.p, s: g.s, h: g.h, x: g.x, y: g.y, dx: 0, R: g.R });
      }
      poses.sort((a, b) => a.p.y - b.p.y);
      const sous = [], dessus = [];
      for (const g of poses) {
        const top = g.membres[0].it, sel = this.sel && g.membres.some(m => m.it.cle === this.sel), sv = this.survole && g.membres.some(m => m.it.cle === this.survole);
        const k = g.s * (sel || sv ? 1.15 : 1), al = (0.55 + 0.45 * g.s) * this.alpha;
        const art = A.obtenir(`p:${top.kind}:${top.sub || ''}:${Dp}:${densite}`, () => CartePeinture.pastille(top.kind, Math.round(Dp * 1.15 * densite), top.sub));
        if (!art) continue;
        const kk = Dp * k / (Dp * 1.15 * densite);
        if (sel) { const an = A.obtenir(`sel:${Dp}:${densite}`, () => peindreAnneau(Math.round(Dp * 1.9 * densite), 'rgba(255,231,163,0.95)', true)); if (an) sous.push([an, g.x, g.h, g.y, Dp * 1.9 * k / an.w, this.alpha, g.dx, 0]); }
        dessus.push([art, g.x, g.h, g.y, kk, al, g.dx, 0]);
        if (g.membres.length > 1) {
          const t = '+' + (g.membres.length - 1), bp = Math.round(Dp * 0.62);
          const b = A.obtenir(`b:${t}:${bp}:${densite}`, () => peindreBadge(t, Math.round(bp * densite)));
          dessus.push([b, g.x, g.h, g.y, k / densite, this.alpha, g.dx + Dp * 0.42 * k, -Dp * 0.42 * k]);
        }
        const R = Dp * k * 0.5;
        occ.push({ x0: g.p.x + g.dx - R, x1: g.p.x + g.dx + R, y0: g.p.y - R, y1: g.p.y + R });
        this.items.push({ x: g.p.x + g.dx, y: g.p.y, r: R + 2, cle: top.cle, item: top, groupe: g.membres.map(m => m.it) });
      }

      // 2. Les épingles des quêtes suivies (vertes), puis le joueur : l'anneau qui respire au sol,
      // la flèche de son cap au bord de l'anneau, son épingle bleue par-dessus tout.
      const Ep = Math.round(30 * ech);
      for (const it of this.reperes) {
        if (!it.epingle) continue;
        const h = ile.hauteur(it.x, it.y) + 0.2, p = proj(it.x, h, it.y);
        if (!dedans(p, 40)) continue;
        const sel = it.cle === this.sel || it.cle === this.survole;
        const art = A.obtenir(`e:${it.kind}:${Ep}:${densite}`, () => CartePeinture.epingle(it.kind, Math.round(Ep * 1.15 * densite)));
        if (!art) continue;
        const kk = Ep * (sel ? 1.15 : 1) / (Ep * 1.15 * densite);
        dessus.push([art, it.x, h, it.y, kk, this.alpha, 0, 0]);
        const hx = p.x + (art.hx - art.ax) * kk, hy = p.y + (art.hy - art.ay) * kk;
        occ.push({ x0: p.x - Ep * 0.45, x1: p.x + Ep * 0.45, y0: p.y - Ep * 1.3, y1: p.y });
        this.items.push({ x: hx, y: hy, r: Ep * 0.5, cle: it.cle, item: it });
      }
      const w = ile.world, pj = w && w.player;
      if (pj) {
        const x = pj.rx, y = pj.ry, h = ile.hauteur(x, y) + 0.1, p = proj(x, h, y);
        // Le cap : la marche, sinon la dernière orientation de la figure (les quatre diagonales des cases).
        const pr = this.prec;
        if (pr && Math.hypot(x - pr.x, y - pr.y) > 0.02) this.cap = Math.atan2(y - pr.y, x - pr.x);
        else if (this.cap == null) { const F = { se: [1, 0], sw: [0, 1], nw: [-1, 0], ne: [0, -1] }[pj.facing] || [0, 1]; this.cap = Math.atan2(F[1], F[0]); }
        this.prec = { x, y };
        if (dedans(p, 40)) {
          const pouls = (Math.sin(now / 320) + 1) / 2, Ra = Math.round((30 + 10 * pouls) * ech);
          const an = A.obtenir(`a:${densite}`, () => peindreAnneau(Math.round(64 * densite), 'rgba(84,170,255,0.9)', false));
          if (an) sous.push([an, x, h, y, Ra / an.w, this.alpha * (0.75 + 0.25 * (1 - pouls)), 0, 0]);
          const q = proj(x + Math.cos(this.cap), h, y + Math.sin(this.cap));
          const ang = Math.atan2(q.x - p.x, -(q.y - p.y));
          const fl = A.obtenir(`f:${densite}`, () => peindreFleche(Math.round(24 * densite)));
          const Rf = 17 * ech;
          if (fl) dessus.push([fl, x, h, y, 15 * ech / fl.w, this.alpha, Math.sin(ang) * Rf, -Math.cos(ang) * Rf, ang]);
          const art = A.obtenir(`e:toi:${Ep}:${densite}`, () => CartePeinture.epingle('toi', Math.round(Ep * 1.15 * densite)));
          const kk = Ep * 1.06 / (Ep * 1.15 * densite);
          occ.push({ x0: p.x - Ep * 0.5, x1: p.x + Ep * 0.5, y0: p.y - Ep * 1.4, y1: p.y + 6 });
          if (art) {
            dessus.push([art, x, h, y, kk, this.alpha, 0, 0]);
            this.items.push({ x: p.x + (art.hx - art.ax) * kk, y: p.y + (art.hy - art.ay) * kk, r: Ep * 0.5, cle: 'joueur', item: { cle: 'joueur', kind: 'toi', x, y } });
          }
        }
      }
      // La cible choisie au sol.
      if (this.cible) {
        const c = this.cible, h = ile.hauteur(c.x, c.y) + 0.1, p = proj(c.x, h, c.y);
        if (dedans(p, 20)) { const a = A.obtenir(`c:${densite}`, () => peindreCible(Math.round(26 * densite))); if (a) sous.push([a, c.x, h, c.y, 26 * ech / a.w, this.alpha, 0, 0]); }
      }

      // 3. Les noms : les zones, puis les sous-zones, puis les lieux, chacun seulement s'il ne
      // chevauche ni un marqueur ni un nom déjà placé (les plus grands d'abord).
      const L = this.lieux || { zones: [], sousZones: [], lieux: [] };
      const textes = [];
      // Un nom se pose sur son point, sinon juste au-dessus, au-dessous ou à côté s'il y a la place.
      const essai = (n, a) => {
        if (a < 0.04) return;
        const art = A.obtenir(`n:${n.sorte}:${n.nom}:${n.sous || ''}:${ech.toFixed(2)}:${densite}`, () => peindreNom(n.sorte, n.nom, n.sorte === 'zone' ? n.sous : '', ech * densite, theme));
        if (!art) return;
        const ancres = [n.proche && r < NOMS.lieux[1] ? n.proche : [n.x, n.y]].concat(n.autres || []);
        for (const q of ancres) if (essaiEn(n, a, art, q[0], q[1])) return;
      };
      const essaiEn = (n, a, art, nx, ny) => {
        const h = ile.hauteur(nx, ny) + (n.sorte === 'zone' ? 3 : 1), p = proj(nx, h, ny);
        if (!dedans(p, 0)) return false;
        const ww = art.w * mesHaut, hh = art.h * mesHaut, pad = 2;
        for (const [ox, oy] of [[0, 0], [0, -0.9], [0, 0.9], [-0.62, 0], [0.62, 0], [0, -1.8], [0, 1.8]]) {
          const dx = ox * ww, dy = oy * hh, cx = p.x + dx, cy = p.y + dy;
          const R = { x0: cx - ww / 2 + 4 - pad, x1: cx + ww / 2 - 4 + pad, y0: cy - hh / 2 + 3 - pad, y1: cy + hh / 2 - 3 + pad };
          if (R.x0 < 2 || R.x1 > W - 2 || R.y0 < 2 || R.y1 > H - 2 || !libre(R)) continue;
          occ.push(R);
          textes.push([art, nx, h, ny, mesHaut, a * this.alpha, dx, dy]);
          this.noms.push({ cle: n.cle, nom: n.nom, sorte: n.sorte, x: cx, y: cy, alpha: a });
          this.items.push({ x: cx, y: cy, r: Math.max(12, hh / 2), w: ww / 2, cle: n.cle, item: Object.assign({ kind: 'lieu' }, n, { x: nx, y: ny }), nom: true });
          return true;
        }
        return false;
      };
      const aZone = lisse(NOMS.zones[0], NOMS.zones[1], r);
      for (const n of L.zones) essai(n, aZone);
      for (const n of L.sousZones) { const s = (NOMS.sousZones.find(([a]) => n.aire >= a) || [0, 0.5])[1]; essai(n, 1 - lisse(s * 0.86, s, r)); }
      const aLieu = 1 - lisse(NOMS.lieux[0], NOMS.lieux[1], r);
      for (const n of L.lieux) essai(n, aLieu);

      // L'ordre du dessin : les noms, ce qui est sous les marqueurs (anneaux), les marqueurs.
      for (const t of textes.concat(sous, dessus)) image(t[0], t[1], t[2], t[3], t[4], t[5], t[6], t[7], t[8]);
      const n = Math.min(MAX, inst.length);
      for (let i = 0; i < n; i++) {
        const q = inst[i];
        this.aAncre.setXYZ(i, q[0], q[1], q[2]);
        this.aBoite.setXYZW(i, q[3], q[4], q[5], q[6]);
        this.aRect.setXYZW(i, q[7], q[8], q[9], q[10]);
        this.aExtra.setXY(i, q[11], q[12]);
      }
      for (const a of [this.aAncre, this.aBoite, this.aRect, this.aExtra]) a.needsUpdate = true;
      this.geo.instanceCount = n;
      this.mat.uniforms.vue.value.set(W, H);
      A.envoyer();
      this.mesh.visible = n > 0;
      if (this.opts.surImage) { try { this.opts.surImage(this); } catch (e) { console.error(e); } }
    }

    // Ce qu'il y a sous un point de la vue (pixels) : le dernier dessiné d'abord ; au doigt, la
    // cible s'agrandit à 22 px. Les noms passent après les marqueurs.
    sous(x, y, doigt) {
      const it = this.items;
      for (let i = it.length - 1; i >= 0; i--) {
        const h = it[i];
        if (h.nom) continue;
        if (Math.hypot(x - h.x, y - h.y) <= Math.max(h.r, doigt ? 22 : 0)) return h;
      }
      for (let i = it.length - 1; i >= 0; i--) {
        const h = it[i];
        if (h.nom && Math.abs(x - h.x) <= h.w && Math.abs(y - h.y) <= h.r) return h;
      }
      return null;
    }
    // La position à l'écran d'un élément dessiné à cette image (sa bulle la suit), ou null.
    ecranDe(cle) { const h = this.items.find(i => i.cle === cle); return h ? { x: h.x, y: h.y, r: h.r } : null; }

    octets() { return (this.atlas ? this.atlas.octets() : 0); }

    // Pour les tests : ce qui est dessiné.
    etat() {
      return {
        ouverte: this.ouverte, alpha: this.alpha, instances: this.geo.instanceCount,
        marqueurs: this.items.filter(i => !i.nom).map(i => ({ cle: i.cle, kind: i.item.kind, x: Math.round(i.x), y: Math.round(i.y), n: i.groupe ? i.groupe.length : 1, sortes: i.groupe ? i.groupe.map(g => g.kind) : [i.item.kind] })),
        noms: this.noms.map(n => ({ nom: n.nom, sorte: n.sorte })),
        lod: this.lod ? { pret: this.lod.pret, maillages: this.lod.meshes.length, sources: this.lod.sources.length, octets: this.lod.octets, ms: Math.round(this.lod.ms), tranches: this.lod.tranches } : null,
      };
    }

    liberer() {
      if (this.mesh.parent) this.mesh.parent.remove(this.mesh);
      this.geo.dispose(); this.mat.dispose();
      if (this.atlas) this.atlas.liberer();
      if (this.lod) for (const m of this.lod.meshes) { if (m.parent) m.parent.remove(m); m.geometry.dispose(); }
      this.lod = null; this.tache = null; this.atlas = null;
    }
  }

  return { Carte, NOMS, PROCHE, FIGURES_MAX, fusionner };
})();
